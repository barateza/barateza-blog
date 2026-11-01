#!/usr/bin/env node
/**
 * Render the site's shared social card and the per-post cards that posts
 * without `seo.image` fall back to.
 *
 *   npm run og              # site card + any post card that is missing
 *   npm run og -- --force   # regenerate every post card as well
 *
 * Outputs:
 *   public/og-preview.jpg          the site-wide og:image (siteConfig.image)
 *   src/assets/images/og/<id>.jpg  one 1200x630 card per blog post
 *
 * Post cards live under src/assets because `seo.image` in content frontmatter
 * is typed as an Astro image import, so a public/ URL cannot be referenced
 * there. Reference a generated card with:
 *
 *   seo:
 *     image:
 *       src: '../../assets/images/og/<post-id>.jpg'
 *       alt: <post title>
 *
 * Legibility rule: LinkedIn shows the card around 400px wide, so every glyph
 * has to survive a 3x downscale. That is why the type is this large and why
 * the composition is text-first rather than a big empty field.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1200;
const HEIGHT = 630;
const BACKGROUND = '#f2f1ec'; // --bg-main of the default theme
const INK = '#171717'; // --text-main
const MUTED_INK = '#4a4a48';
const FONT_SANS = "Lato, FreeSans, 'DejaVu Sans', sans-serif";
const FONT_SERIF = "C059, FreeSerif, Georgia, 'DejaVu Serif', serif";
const force = process.argv.includes('--force');

const frame = `<rect x="28" y="28" width="${WIDTH - 56}" height="${HEIGHT - 56}" fill="none" stroke="${INK}" stroke-opacity="0.22"/>`;

/** Site card: portrait + name + role. */
async function renderSiteCard() {
    const size = 360;
    const portrait = await sharp(join(root, 'src/assets/images/avatar.jpg')).resize(size, size, { fit: 'cover' }).png().toBuffer();
    const mask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    const masked = await sharp(portrait).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();

    const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}"/>
  ${frame}
  <text x="500" y="262" font-family="${FONT_SANS}" font-size="80" fill="${INK}">Gilson Siqueira</text>
  <text x="502" y="322" font-family="${FONT_SANS}" font-size="30" fill="${MUTED_INK}">AI Engineer &#183; LLM pipelines</text>
  <text x="502" y="364" font-family="${FONT_SANS}" font-size="30" fill="${MUTED_INK}">Retrieval systems &#183; production reliability</text>
  <line x1="502" y1="404" x2="1080" y2="404" stroke="${INK}" stroke-opacity="0.22"/>
  <text x="502" y="452" font-family="${FONT_SANS}" font-size="24" letter-spacing="2" fill="${MUTED_INK}">barateza.org</text>
</svg>`);

    const out = join(root, 'public/og-preview.jpg');
    await mkdir(dirname(out), { recursive: true });
    await sharp(card).composite([{ input: masked, left: 80, top: 135 }]).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(out);
    console.log(`site card  → ${out.replace(root + '/', '')}`);
}

/** Frontmatter fields the card needs; content here is simple, flat YAML. */
function readFrontmatter(raw, file) {
    const block = raw.match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (!block) throw new Error(`no frontmatter in ${file}`);
    const scalar = (key) => block.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^['"]|['"]$/g, '');
    const title = scalar('title');
    if (!title) throw new Error(`no title in ${file}`);
    return { title, publishDate: scalar('publishDate'), hasImage: /^\s{2,}image:/m.test(block) };
}

/** Greedy word wrap; the serif face averages ~0.48em per character. */
function wrap(text, fontSize, maxWidth) {
    const perLine = Math.floor(maxWidth / (fontSize * 0.48));
    const lines = [];
    let current = '';
    for (const word of text.split(/\s+/)) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > perLine && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Post card: kicker, big serif title, date. */
async function renderPostCard({ id, title, publishDate }) {
    const lines = wrap(title, 76, 980).slice(0, 3);
    const startY = 300 - (lines.length - 1) * 44;
    const text = lines
        .map((line, index) => `<text x="90" y="${startY + index * 88}" font-family="${FONT_SERIF}" font-size="76" fill="${INK}">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`)
        .join('\n  ');

    const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}"/>
  ${frame}
  <text x="90" y="150" font-family="${FONT_SANS}" font-size="24" letter-spacing="3" fill="${MUTED_INK}">BARATEZA.ORG &#183; BLOG</text>
  ${text}
  <line x1="90" y1="452" x2="1110" y2="452" stroke="${INK}" stroke-opacity="0.22"/>
  <text x="90" y="500" font-family="${FONT_SANS}" font-size="26" fill="${MUTED_INK}">${formatDate(publishDate)}</text>
</svg>`);

    const out = join(root, 'src/assets/images/og', `${id}.jpg`);
    await mkdir(dirname(out), { recursive: true });
    await sharp(card).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(out);
    console.log(`post card  → ${out.replace(root + '/', '')}`);
    return `${id}: seo.image.src ../../assets/images/og/${id}.jpg`;
}

await renderSiteCard();

const blogDir = join(root, 'src/content/blog');
const files = (await readdir(blogDir)).filter((file) => file.endsWith('.md'));
const suggestions = [];
for (const file of files) {
    const id = file.replace(/\.md$/, '');
    const meta = readFrontmatter(await readFile(join(blogDir, file), 'utf8'), file);
    if (meta.hasImage && !force) continue;
    suggestions.push(await renderPostCard({ id, ...meta }));
}

if (suggestions.length === 0) {
    console.log('post cards → all posts already declare seo.image (use --force to re-render)');
} else {
    console.log('\nReference these from the post frontmatter:');
    for (const line of suggestions) console.log(`  ${line}`);
}
