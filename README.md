# Wildbloom page

Hosted on GitHub Pages at https://jav-ram.github.io/wildbloom_page/

Deploys automatically on push to `main` via `.github/workflows/deploy.yml`.

## Notes for the Svelte/React migration
- Site is served under `/wildbloom_page/`, so set the base path (Vite `base`, SvelteKit `paths.base`) unless a custom domain is used.
- Swap the "Build" step in the workflow for `npm ci && npm run build` and update the artifact `path`.
