import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';

// Deployed on Cloudflare at https://wildbloom-studio.dev (root domain, so no base path).
export default defineConfig({
  site: 'https://wildbloom-studio.dev',
  trailingSlash: 'always',
  // The setting page used to live at /crater/. Astro writes a redirect page; public/_redirects adds a real 301 on Cloudflare.
  redirects: { '/crater': '/below-the-light/' },
  integrations: [svelte()],
});
