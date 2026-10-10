import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Project site on GitHub Pages: https://jav-ram.github.io/wildbloom_page/
// If a custom domain is added later, set `site` to it and drop `base`.
export default defineConfig({
  site: 'https://jav-ram.github.io',
  base: '/wildbloom_page',
  trailingSlash: 'always',
  integrations: [svelte()],
});
