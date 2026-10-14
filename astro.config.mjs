import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Project site on GitHub Pages: https://jav-ram.github.io/wildbloom_page/
// If a custom domain is added later, set `site` to it and drop `base`.
export default defineConfig({
  site: 'https://jav-ram.github.io',
  base: '/wildbloom_page',
  trailingSlash: 'always',
  // The setting page used to live at /crater/. GitHub Pages cannot send a 301, so Astro writes a redirect page.
  redirects: { '/crater': '/wildbloom_page/below-the-light/' },
  integrations: [svelte()],
});
