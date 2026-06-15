import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, passthroughImageService } from 'astro/config';
import siteConfig from './src/data/site-config';
import { buildUrlDateMap } from './src/utils/sitemap-dates.mjs';

const dateMap = buildUrlDateMap(siteConfig.website);

// https://astro.build/config
export default defineConfig({
    site: siteConfig.website,
    vite: {
        plugins: [tailwindcss()]
    },
    integrations: [mdx(), sitemap({
        serialize(item) {
            const date = dateMap.get(item.url);
            if (date) {
                item.lastmod = date.toISOString();
            }
            return item;
        }
    })],
    image: {
        service: passthroughImageService()
    }
});
