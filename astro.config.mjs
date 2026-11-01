import { copyFile, access } from 'node:fs/promises';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, passthroughImageService } from 'astro/config';
import siteConfig from './src/data/site-config';
import { buildUrlDateMap } from './src/utils/sitemap-dates.mjs';

const dateMap = buildUrlDateMap(siteConfig.website);

const exists = (path) => access(path).then(() => true, () => false);

/**
 * Serve the sitemap at the conventional `/sitemap.xml` too. `@astrojs/sitemap`
 * always emits `sitemap-index.xml` + `sitemap-0.xml`, so the path crawlers, SEO
 * tools and people try first would otherwise 404.
 *
 * The alias follows the shape of the build instead of assuming one chunk: with a
 * single chunk it is the URL set, and once `entryLimit` splits the build it is
 * the index, which still lists every URL.
 */
const sitemapAlias = () => ({
    name: 'sitemap-alias',
    hooks: {
        'astro:build:done': async ({ dir, logger }) => {
            const chunked = await exists(new URL('sitemap-1.xml', dir));
            const source = chunked ? new URL('sitemap-index.xml', dir) : new URL('sitemap-0.xml', dir);
            await copyFile(source, new URL('sitemap.xml', dir));
            logger.info(`sitemap.xml alias written from ${source.pathname.split('/').pop()}`);
        }
    }
});

// https://astro.build/config
export default defineConfig({
    site: siteConfig.website,
    vite: {
        plugins: [tailwindcss()]
    },
    integrations: [
        mdx(),
        sitemap({
            serialize(item) {
                const date = dateMap.get(item.url);
                if (date) {
                    item.lastmod = date.toISOString();
                }
                return item;
            }
        }),
        sitemapAlias()
    ],
    image: {
        service: passthroughImageService()
    }
});
