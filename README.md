# barateza.org

Personal site and blog of [Gilson Siqueira](https://barateza.org) — Lead Technical Support Engineer at WebPros.

Built with [Astro](https://astro.build) + [Dante theme](https://github.com/JustGoodUI/dante-astro-theme), deployed on Vercel.

## Stack

- **Framework:** Astro 5
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Content:** Markdown / MDX via Astro Content Collections

## Local Development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build → ./dist/
npm run preview    # preview production build locally
```

## Structure

```
src/
  content/
    blog/       ← blog posts (.md / .mdx)
    projects/   ← project pages (.md)
  assets/
    images/     ← optimized images (avatar, project covers)
  data/
    site-config.ts  ← all site-wide config (nav, hero, socials)
public/             ← static files (favicon, OG image)
```

## License

Content © Gilson Siqueira. Theme licensed under [GPL-3.0](https://github.com/JustGoodUI/dante-astro-theme/blob/main/LICENSE).
