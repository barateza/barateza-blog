# barateza.org

Personal site and blog of [Gilson Siqueira](https://barateza.org) — Lead Technical Support Engineer at WebPros.

Built with [Astro](https://astro.build) + [Dante theme](https://github.com/JustGoodUI/dante-astro-theme), deployed on Vercel.

## Stack

- **Framework:** Astro 7 (Rust compiler, Sätteri Markdown pipeline, Vite 8)
- **Styling:** Tailwind CSS v4
- **Deployment:** Vercel
- **Content:** Markdown via Astro Content Collections (Content Layer)

## Local Development

Requires **Node 22.12+** (declared in `package.json` → `engines`).

```bash
npm install
npm run dev          # http://localhost:4321
npm run build        # production build → ./dist/
npm run preview      # preview production build locally
npm run verify:build # assert the build output is intact (see below)
```

### Verifying a build

`scripts/verify-build.mjs` checks the things an Astro major upgrade can silently
break: page count, `rss.xml`, `sitemap.xml` `<lastmod>` (i.e. the sitemap
`serialize()` hook), Markdown raw-HTML passthrough, `<script>` ordering, and the
rendered text of every page.

Pass a baseline build to diff against it (content changes fail; whitespace-only
changes are reported for review, because Astro 7's `compressHTML: 'jsx'` drops
whitespace between inline elements — invisible inside `flex`/`grid` containers,
visible in normal flow):

```bash
npm run build && cp -r dist /tmp/baseline
# ... make changes ...
npm run build && node scripts/verify-build.mjs dist /tmp/baseline
```

## Structure

```
src/
  content/
    blog/       ← blog posts (.md)
    projects/   ← project pages (.md)
  assets/
    images/     ← optimized images (avatar, project covers)
  data/
    site-config.ts  ← all site-wide config (nav, hero, socials)
public/             ← static files (favicon, OG image)
scripts/            ← build verifier (excluded from Tailwind's source scan)
```

## License

Content © Gilson Siqueira. Theme licensed under [GPL-3.0](https://github.com/JustGoodUI/dante-astro-theme/blob/main/LICENSE).
