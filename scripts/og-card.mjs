#!/usr/bin/env node
/**
 * Render `public/og-preview.jpg` — the 1200x630 social card referenced by
 * `siteConfig.image` (and therefore by every page's og:image / twitter:image).
 *
 * The file used to be referenced but absent, so every page advertised a
 * 404 image. Regenerate it after changing the avatar or the tagline:
 *
 *   npm run og
 *
 * Colours come from the default theme in `src/styles/global.css`
 * (--bg-main #f2f1ec, --text-main #171717).
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1200;
const HEIGHT = 630;
const AVATAR = 300;
const BACKGROUND = '#f2f1ec';
const INK = '#171717';

const avatar = await sharp(join(root, 'src/assets/images/avatar.jpg')).resize(AVATAR, AVATAR, { fit: 'cover' }).png().toBuffer();

const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR}" height="${AVATAR}"><circle cx="${AVATAR / 2}" cy="${AVATAR / 2}" r="${AVATAR / 2}" fill="#fff"/></svg>`
);

const portrait = await sharp(avatar)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();

const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}"/>
  <rect x="32" y="32" width="${WIDTH - 64}" height="${HEIGHT - 64}" fill="none" stroke="${INK}" stroke-opacity="0.18"/>
  <text x="460" y="296" font-family="Lato, FreeSans, sans-serif" font-size="62" fill="${INK}">Gilson Siqueira</text>
  <text x="462" y="348" font-family="Lato, FreeSans, sans-serif" font-size="26" fill="${INK}" fill-opacity="0.72">AI Engineer &#183; LLM pipelines, retrieval systems</text>
  <line x1="462" y1="384" x2="880" y2="384" stroke="${INK}" stroke-opacity="0.22"/>
  <text x="462" y="430" font-family="Lato, FreeSans, sans-serif" font-size="22" letter-spacing="1.5" fill="${INK}" fill-opacity="0.72">barateza.org</text>
</svg>`);

const out = join(root, 'public/og-preview.jpg');
await mkdir(dirname(out), { recursive: true });
await sharp(card)
    .composite([{ input: portrait, left: 100, top: 165 }])
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(out);

console.log(`wrote ${out} (${WIDTH}x${HEIGHT})`);
