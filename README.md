# barateza.org

Personal site and blog of [Gilson Siqueira](https://barateza.org), Senior Platform Engineer at Sinch, focused on cloud operations, production reliability, automation, and applied AI.

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
