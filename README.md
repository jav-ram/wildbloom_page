# Wildbloom Studio site

Astro + Svelte islands, deployed on Cloudflare at https://wildbloom-studio.dev

```bash
pnpm install
pnpm dev      # http://localhost:4321/
pnpm build    # static output in dist/
```

- Design tokens/components: `src/styles/` (from the Wildbloom design system).
- Pages: `src/pages/`. Interactive parts (class filter, Below the Light era/layer explorer) are Svelte islands in `src/components/`.
- Content: `src/data/` (`classes.ts`, `below-the-light.ts`, `warcaller.json`). `[BRACKETED]` text is copy still to be written.
- Deploys on Cloudflare (Workers & Pages, connected to this repo): every push to `main` builds with `pnpm build` and publishes `dist/`. There is no GitHub Actions workflow.
- The site is served from the root of `wildbloom-studio.dev`, so there is no base path. Old `/crater/` URLs redirect to `/below-the-light/` (`public/_redirects`).

## Adding creature descriptions and statblocks
- One Markdown file per creature in `src/data/creatures/<slug>.md` (slug = name in lowercase with hyphens, e.g. `flying-eel.md`).
- Frontmatter holds the statblock, the body is the long description. Copy `src/data/creatures/_template.md` to start.
- The build checks the files: a misspelled field or a filename that matches no creature fails with a clear message.
- A creature without a file shows placeholders on its page. The list of creatures lives in `src/data/below-the-light.content.json`.
