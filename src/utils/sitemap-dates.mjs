import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..');
const rootDir = join(srcDir, '..');

/**
 * Naive frontmatter parser — extracts only date fields.
 * No gray-matter dependency needed.
 */
function parseDates(filePath) {
    const content = readFileSync(filePath, 'utf-8');
    // Must start with ---
    if (!content.startsWith('---')) return {};

    const end = content.indexOf('---', 3);
    if (end === -1) return {};

    const frontmatter = content.slice(3, end).trim();

    const extract = (key) => {
        const re = new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
        const match = frontmatter.match(re);
        return match ? new Date(match[1]) : undefined;
    };

    return {
        publishDate: extract('publishDate'),
        updatedDate: extract('updatedDate'),
    };
}

/**
 * Recursively find all .md/.mdx files in a directory.
 */
function findContentFiles(dir) {
    try {
        return readdirSync(dir, { withFileTypes: true })
            .filter((e) => e.isFile() && /\.mdx?$/.test(e.name))
            .map((e) => join(dir, e.name));
    } catch {
        return [];
    }
}

/**
 * Map content paths to site URLs.
 *
 *   src/content/blog/kcs-search-mcp.md  →  /blog/kcs-search-mcp/
 *   src/content/projects/dubweave.md    →  /projects/dubweave/
 *   src/content/pages/about.md          →  /about/
 */
function contentPathToUrl(collection, slug) {
    if (collection === 'pages') {
        // page filenames like about.md, contact.md, cv.md, terms.md
        const name = slug.replace(/\.mdx?$/, '');
        return name === 'index' ? '/' : `/${name}/`;
    }
    // blog & projects
    return `/${collection}/${slug.replace(/\.mdx?$/, '')}/`;
}

/**
 * Build a Map<fullUrl, Date> from all content collections.
 */
export function buildUrlDateMap(siteUrl) {
    const map = new Map();

    const collections = ['blog', 'projects', 'pages'];

    for (const collection of collections) {
        const dir = join(srcDir, 'content', collection);
        const files = findContentFiles(dir);

        for (const file of files) {
            const slug = file.replace(/.*[/\\]/, '');
            const url = contentPathToUrl(collection, slug);
            const fullUrl = siteUrl.replace(/\/$/, '') + url;

            const { publishDate, updatedDate } = parseDates(file);
            const bestDate = updatedDate ?? publishDate;
            if (bestDate instanceof Date && !isNaN(bestDate.getTime())) {
                map.set(fullUrl, bestDate);
            }
        }
    }

    return map;
}

/**
 * lastmod function for @astrojs/sitemap.
 * Receives the full page URL, returns the best Date or undefined.
 */
export function createLastmodFn(dateMap) {
    return (pageUrl) => {
        // Normalize: strip trailing slash for consistency (except root)
        const key = pageUrl.replace(/\/$/, '') || '/';
        const date = dateMap.get(key) ?? dateMap.get(key + '/');
        return date ?? undefined;
    };
}
