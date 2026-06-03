// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://meetwhen.xyz',
  integrations: [sitemap()],
  output: 'static',
});
