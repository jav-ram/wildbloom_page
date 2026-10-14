# Wildbloom Studio site

Astro + Svelte islands, deployed to GitHub Pages at https://jav-ram.github.io/wildbloom_page/

```bash
npm install
npm run dev      # http://localhost:4321/wildbloom_page/
npm run build    # static output in dist/
```

- Design tokens/components: `src/styles/` (from the Wildbloom design system).
- Pages: `src/pages/`. Interactive parts (class filter, Below the Light era/layer explorer) are Svelte islands in `src/components/`.
- Content: `src/data/` (`classes.ts`, `below-the-light.ts`, `warcaller.json`). `[BRACKETED]` text is copy still to be written.
- Deploys on push to `main` via `.github/workflows/deploy.yml` (set Settings → Pages → Source to "GitHub Actions").
- Base path is `/wildbloom_page` (see `astro.config.mjs`); remove it if a custom domain is added.
