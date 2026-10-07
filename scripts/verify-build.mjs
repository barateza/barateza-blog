#!/usr/bin/env node
/**
 * Post-upgrade build verifier for barateza.org (Astro v5 -> v7 migration).
 *
 * Usage:
 *   node scripts/verify-build.mjs [distDir] [baselineDistDir]
 *
 * Two tiers of check:
 *
 *   FAIL  — hard guarantees. Page surface, build artifacts, sitemap <lastmod>
 *           (i.e. the serializer in astro.config.mjs still runs), RSS content,
 *           Markdown raw-HTML passthrough, <script> structure, and any change to
 *           *rendered content* (compared with whitespace collapsed, so spacing
 *           alone never trips it).
 *
 *   REVIEW— whitespace-only differences. Astro 7 defaults `compressHTML` to
 *           'jsx', which drops whitespace between inline elements written on
 *           separate source lines. Inside `display: flex`/`grid` containers this
 *           is invisible (whitespace-only text nodes are not flex items), but a
 *           lost space between inline elements in normal flow *is* visible — so
 *           these are printed for a human to eyeball rather than auto-failed.
 *
 * No dependencies, no network. Exits non-zero only on FAIL.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const distDir = process.argv[2] ?? 'dist';
const baselineDir = process.argv[3] ?? null;

/** Expected page surface of this site. */
const EXPECTED_HTML_PAGES = 25;
const REQUIRED_FILES = ['rss.xml', 'sitemap-index.xml', 'sitemap-0.xml'];
const MAX_REGIONS_PER_PAGE = 3;

/**
 * Tags that render inside a line of text. Everything else is treated as a block
 * boundary, so removing whitespace around it is not a regression.
 */
const INLINE_TAGS = new Set([
    'a', 'span', 'em', 'strong', 'i', 'b', 'code', 'small', 'mark', 'sub', 'sup',
    'abbr', 'cite', 'q', 's', 'u', 'time', 'label', 'bdi', 'bdo', 'data', 'dfn',
    'kbd', 'ruby', 'samp', 'var', 'wbr', 'del', 'ins', 'output', 'svg', 'img', 'input'
]);

const failures = [];
const passes = [];
const reviews = [];

function fail(message) {
    failures.push(message);
}

function pass(message) {
    passes.push(message);
}

function review(message) {
    reviews.push(message);
}

function listFiles(dir, predicate, acc = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) listFiles(full, predicate, acc);
        else if (predicate(full)) acc.push(full);
    }
    return acc;
}

function read(path) {
    return readFileSync(path, 'utf8');
}

/** Decode HTML entities so `&gt;`/`>`-style serialization changes are not noise. */
function decodeEntities(text) {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', copy: '©' };
    return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, code) => {
        if (code.startsWith('#x') || code.startsWith('#X')) return String.fromCodePoint(parseInt(code.slice(2), 16));
        if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
        return named[code] ?? match;
    });
}

/**
 * Reduce an HTML document to the sequence of visible text tokens.
 * Inline tags are transparent (so a lost space merges two tokens — detectable),
 * while block/void tags become separators (so block boundaries are ignored).
 */
function textTokens(html) {
    const stripped = html
        .replace(/<!--[\s\S]*?-->/g, '')
        // Script/style bodies are not visible text, and Astro 7's Rust compiler
        // re-serializes inlined scripts (e.g. "dark" -> `dark`).
        .replace(/<script\b[\s\S]*?<\/script>/gi, '\n')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '\n')
        .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g, (_m, _slash, name) =>
            INLINE_TAGS.has(name.toLowerCase()) ? '' : '\n'
        );

    return decodeEntities(stripped)
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .split(/\s+/)
        .filter(Boolean);
}

function scriptTags(html) {
    return (html.match(/<script\b[^>]*>/g) ?? []).map((tag) =>
        // Mask content hashes so only structure/order is compared.
        tag.replace(/\.[A-Za-z0-9_-]{8}\.js/g, '.HASH.js')
    );
}

function rssItems(xml) {
    return [...xml.matchAll(/<item>[\s\S]*?<\/item>/g)].map((m) => m[0]);
}

// ---------------------------------------------------------------- surface ---

if (!existsSync(distDir)) {
    console.error(`FAIL: dist directory not found: ${distDir} (run \`npm run build\` first)`);
    process.exit(1);
}

const htmlFiles = listFiles(distDir, (f) => f.endsWith('.html')).sort();

if (baselineDir) {
    const baselineHtml = listFiles(baselineDir, (f) => f.endsWith('.html')).sort();
    if (htmlFiles.length !== baselineHtml.length) {
        fail(`page count changed: ${baselineHtml.length} -> ${htmlFiles.length}`);
    } else {
        pass(`page count unchanged (${htmlFiles.length})`);
    }
    const missing = baselineHtml
        .map((f) => relative(baselineDir, f))
        .filter((rel) => !existsSync(join(distDir, rel)));
    if (missing.length) fail(`pages missing vs baseline: ${missing.join(', ')}`);
} else if (htmlFiles.length !== EXPECTED_HTML_PAGES) {
    fail(`expected ${EXPECTED_HTML_PAGES} HTML pages, found ${htmlFiles.length}`);
} else {
    pass(`page count as expected (${htmlFiles.length})`);
}

for (const file of REQUIRED_FILES) {
    if (!existsSync(join(distDir, file))) fail(`missing build artifact: ${file}`);
}
if (REQUIRED_FILES.every((f) => existsSync(join(distDir, f)))) {
    pass(`build artifacts present (${REQUIRED_FILES.join(', ')})`);
}

// -------------------------------------------------------- sitemap lastmod ---

const sitemapPath = join(distDir, 'sitemap-0.xml');
if (existsSync(sitemapPath)) {
    const lastmods = [...read(sitemapPath).matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    if (lastmods.length === 0) {
        fail('sitemap-0.xml has no <lastmod> entries — the sitemap serialize() hook stopped working');
    } else if (lastmods.some((d) => Number.isNaN(Date.parse(d)))) {
        fail('sitemap-0.xml has an unparseable <lastmod> value');
    } else {
        pass(`sitemap lastmod intact (${lastmods.length} dated URLs)`);
    }
}

// -------------------------------------------------------------------- rss ---

const rssPath = join(distDir, 'rss.xml');
if (existsSync(rssPath)) {
    const items = rssItems(read(rssPath));
    if (items.length === 0) {
        fail('rss.xml contains no <item> entries');
    } else if (baselineDir && existsSync(join(baselineDir, 'rss.xml'))) {
        const baselineItems = rssItems(read(join(baselineDir, 'rss.xml')));
        if (JSON.stringify(items) !== JSON.stringify(baselineItems)) {
            const sameSet =
                items.length === baselineItems.length &&
                [...items].sort().every((item, i) => item === [...baselineItems].sort()[i]);
            fail(
                sameSet
                    ? `rss.xml item ORDER changed (${items.length} items, same content)`
                    : `rss.xml item CONTENT changed (${baselineItems.length} -> ${items.length})`
            );
        } else {
            pass(`rss.xml items unchanged (${items.length})`);
        }
    } else {
        pass(`rss.xml has ${items.length} items`);
    }
}

// --------------------------------------------- markdown raw HTML passthrough ---

const globalServices = join(distDir, 'global-services', 'index.html');
if (existsSync(globalServices)) {
    const html = read(globalServices);
    if (!html.includes('mb-6 flex justify-center')) {
        fail('global-services: the raw HTML <div> block from Markdown is missing (Sätteri passthrough?)');
    } else if (!html.includes('global-services-logo.webp')) {
        fail('global-services: the logo <img> from the raw HTML block is missing');
    } else {
        pass('Markdown raw HTML block still rendered (global-services)');
    }
}

// ----------------------------------------------------------- script order ---

const indexPath = join(distDir, 'index.html');
if (existsSync(indexPath) && baselineDir && existsSync(join(baselineDir, 'index.html'))) {
    const now = scriptTags(read(indexPath));
    const before = scriptTags(read(join(baselineDir, 'index.html')));
    if (JSON.stringify(now) !== JSON.stringify(before)) {
        fail(`head <script> structure/order changed:\n    baseline: ${before.join('\n              ')}\n    current:  ${now.join('\n              ')}`);
    } else {
        pass(`<script> tag order unchanged (${now.length} tags)`);
    }
}

// ------------------------------------------------- rendered content + spacing ---

/** Group nearby mismatched token indices into regions so one edit is one report. */
function regions(tokensA, tokensB) {
    const max = Math.max(tokensA.length, tokensB.length);
    const mismatches = [];
    for (let i = 0; i < max; i += 1) {
        if (tokensA[i] !== tokensB[i]) mismatches.push(i);
    }

    const grouped = [];
    for (const i of mismatches) {
        const last = grouped.at(-1);
        if (last && i - last.end <= 8) last.end = i;
        else grouped.push({ start: i, end: i });
    }
    return grouped;
}

function renderRegions(rel, tokensA, tokensB, grouped) {
    const lines = [];
    for (const region of grouped.slice(0, MAX_REGIONS_PER_PAGE)) {
        const context = (list) => list.slice(Math.max(0, region.start - 3), region.end + 4).join(' ') || '(none)';
        lines.push(`  ${rel} [token ${region.start}]\n      - ${context(tokensA)}\n      + ${context(tokensB)}`);
    }
    if (grouped.length > MAX_REGIONS_PER_PAGE) {
        lines.push(`  ${rel} … ${grouped.length - MAX_REGIONS_PER_PAGE} more region(s), not shown`);
    }
    return lines.join('\n');
}

if (baselineDir) {
    const contentDiffs = [];
    const spacingPages = [];
    let checked = 0;

    for (const file of htmlFiles) {
        const rel = relative(distDir, file);
        const baselineFile = join(baselineDir, rel);
        if (!existsSync(baselineFile)) continue;

        const before = textTokens(read(baselineFile));
        const after = textTokens(read(file));
        checked += 1;

        if (JSON.stringify(before) === JSON.stringify(after)) continue;

        const grouped = regions(before, after);

        // Whitespace collapsed: identical means the difference is spacing only.
        if (before.join('') === after.join('')) {
            spacingPages.push(renderRegions(rel, before, after, grouped));
        } else {
            contentDiffs.push(renderRegions(rel, before, after, grouped));
        }
    }

    if (contentDiffs.length) {
        fail(`rendered CONTENT changed in ${contentDiffs.length}/${checked} pages:\n${contentDiffs.join('\n')}`);
    } else {
        pass(`rendered content identical across ${checked} pages`);
    }

    if (spacingPages.length) {
        review(
            `whitespace-only differences in ${spacingPages.length}/${checked} pages ` +
                `(Astro 7 'jsx' whitespace; invisible inside flex/grid containers — verify by eye):\n${spacingPages.join('\n')}`
        );
    } else {
        pass('no whitespace-only differences');
    }
}

// ------------------------------------------------------------------ report ---

for (const line of passes) console.log(line);
if (reviews.length) {
    console.log('');
    for (const line of reviews) console.log(`  REVIEW ${line}`);
}
if (failures.length) {
    console.log('');
    for (const line of failures) console.log(`  FAIL ${line}`);
    console.log(`\n${failures.length} check(s) failed.`);
    process.exit(1);
}

console.log(
    `\nAll ${passes.length} checks passed${reviews.length ? ` (${reviews.length} whitespace item(s) need an eyeball)` : ''}.`
);
