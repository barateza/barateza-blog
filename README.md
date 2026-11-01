# barateza.org

Personal site and blog of [Gilson Siqueira](https://barateza.org), Lead Technical Support Engineer at WebPros.

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
npm run og           # re-render the social cards (see below)
```

### Social cards

`public/og-preview.jpg` is the site-wide `og:image`, and posts without their own
`seo.image` get a card under `src/assets/images/og/`. Both are 1200×627 (1.91:1, the ratio LinkedIn wants for a large card) and
generated, not hand-made, because LinkedIn renders a link card at roughly 400px
wide — type has to survive a 3× downscale, so the layout is text-first and
deliberately large:

```bash
npm run og              # site card + cards for posts still missing seo.image
npm run og -- --force   # also re-render cards for posts that already have one
```

The script prints the `seo.image.src` line to paste into a post's frontmatter.
Regenerate after changing the avatar, the tagline, or a post title.

### Verifying a build

`scripts/verify-build.mjs` checks the things an Astro major upgrade can silently
break: page count, `rss.xml`, `sitemap.xml` `<lastmod>` (i.e. the sitemap
`serialize()` hook), Markdown raw-HTML passthrough, `<script>` ordering, and the
rendered text of every page.

Pass a baseline build to diff against it (content changes fail; whitespace-only
changes are reported for review, because Astro 7's `compressHTML: 'jsx'` drops
whitespace between inline elements, which is invisible inside `flex`/`grid`
containers and visible in normal flow):

```bash
npm run build && cp -r dist /tmp/baseline
# ... make changes ...
npm run build && node scripts/verify-build.mjs dist /tmp/baseline
```

The Astro 5 → 7 upgrade was verified exactly this way, against a `main` build in a
separate worktree. It surfaced one real regression that the build alone hid: both
posts share `publishDate: 'May 25 2026'`, and the relative order of equal dates
changed with the collection implementation, which reshuffled the archive, the tags
index and the RSS feed. `sortItemsByDateDesc` now breaks the tie on `id`
**ascending**, which is the order Astro 5's glob iteration produced.

What is left in the REVIEW tier is whitespace only, and it was checked by
measuring rather than by eye. The footer nav, the footer social links and the post
tag list are all `flex` containers with `gap`, so the dropped spaces between items
are not rendered. Serving the old and new builds side by side and reading
`getBoundingClientRect()` for those elements gives identical geometry on both,
with the same `x`, widths and document height, for `/about/` and
`/blog/kcs-search-mcp/`.

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
public/
  thermal/          ← the measurements behind the thermal post: results.csv,
                      environment.txt, timeseries.csv, chart SVGs, raw/ logs
scripts/
  verify-build.mjs       ← build verifier (excluded from Tailwind's source scan)
  thermal-charts.mjs     ← results.csv + raw logs → the chart SVGs (npm prebuild)
  thermal-fingerprint.sh ← prints the measured host's state and a config hash
```

## License

Content © Gilson Siqueira. Theme licensed under [GPL-3.0](https://github.com/JustGoodUI/dante-astro-theme/blob/main/LICENSE).
