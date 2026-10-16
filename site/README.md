# Catalog site

Static, read-only catalog of this Claude Code plugin marketplace, published on GitHub Pages
(`https://podop.github.io/dev-digest-ai-marketplace/`). The contract is
[`docs/SITE-SPEC.md`](../docs/SITE-SPEC.md).

Stack: React 18, TypeScript, Vite, MiniSearch (search), marked + DOMPurify (markdown), Mermaid (diagrams, lazy-loaded),
the DevDigest design system (vendored in `src/ui/`, icons from `lucide-react`), Inter and JetBrains Mono
self-hosted from `@fontsource/inter` / `@fontsource/jetbrains-mono` (no font CDN).
No backend, no Tailwind, hash routing (`#/plugin/<name>`), relative asset paths
(`base: './'`), so the build works under any sub-path and from any fork.

## Run locally

Requires Node 22.

```bash
cd site
npm ci
npm run dev        # regenerates the index, then starts Vite with hot reload
```

Other scripts (in `site/`):

| Script | What it does |
|---|---|
| `npm run dev` | `node ../scripts/build-index.mjs`, then `vite` |
| `npm run build` | `prebuild` regenerates the index, then `tsc -b && vite build` into `site/dist/` |
| `npm run preview` | Serves `site/dist/` locally |
| `npm run typecheck` | `tsc -b` only |

From the repository root:

| Script | What it does |
|---|---|
| `npm run build:index` | Regenerates the index only |
| `npm run dev:watch` | Starts the dev server and rebuilds the index whenever files under `plugins/` or `.claude-plugin/` change (requires `cd site && npm ci` once) |
| `npm run site:dev` / `npm run site:build` | Same as `npm run dev` / `npm run build` in `site/` |

## How the index is built

`scripts/build-index.mjs` (Node 22, no dependencies) reads:

- `.claude-plugin/marketplace.json` and each plugin's `.claude-plugin/plugin.json`
  (version and dependencies come only from `plugin.json`);
- `README.md`, `CHANGELOG.md`, `COMPATIBILITY.md` of each plugin;
- frontmatter and body of `skills/*/SKILL.md` and `agents/*.md`;
- `hooks/hooks.json` (hook count) and `evals/**/case.yaml` / `evals/**/prompt.md` (eval count);
- git tags named `{plugin}--v{version}` (release list; without tags, changelog sections are
  listed and marked untagged).

It writes into `site/public/` (not committed):

| File | Content |
|---|---|
| `index.json` | Marketplace info, plugins (with computed `dependents` and `contextBytes`), skills and agents |
| `releases.json` | One entry per release tag, with the matching changelog section |
| `stats.json` | Counts, dependency edges, per-plugin discovery context size |
| `bodies/*.md` | README / CHANGELOG / COMPATIBILITY and skill / agent bodies, loaded on demand |

The build fails with a non-zero exit code when a marketplace entry's `name` does not match its
`plugin.json`, a `source` path is missing or outside the repository, or two artifacts share an id.
Without a marketplace file it produces an empty catalog, which the site shows as an empty state.

Options: `--root <dir>` indexes another marketplace checkout (for example a test fixture),
`--out <dir>` changes the output folder, `--repo owner/repo` overrides the GitHub repository used
for source links (default: `GITHUB_REPOSITORY`, then the `origin` remote).

## Where things live

| Path | Purpose |
|---|---|
| `src/i18n/en.json` | **Every UI string.** Components use `t('key', vars)` / `tn('key', count)` from `src/i18n/index.ts`; the page title and `<noscript>` text are injected into `index.html` from the same file at build time |
| `src/lib/router.ts` | Hash router hook and route builders |
| `src/lib/search.ts` | MiniSearch index, stop-word handling for natural-language queries, type words as filters |
| `src/lib/markdown.ts` | marked + DOMPurify rendering, relative-link rewriting to GitHub |
| `src/lib/mermaid.ts` | lazy Mermaid rendering of ```` ```mermaid ```` blocks (strict mode, SVG re-sanitized, re-rendered on theme change) |
| `src/lib/data.ts` | Loading `index.json`, `releases.json` and bodies |
| `src/pages/` | One component per route |
| `src/components/` | Catalog building blocks on top of the design system: shell wiring (`Layout`), topbar search, page header, cards, copy rows, markdown |
| `src/ui/` | **Vendored DevDigest design system** (`@devdigest/ui`): `tokens.css`, `primitives/`, `kit/`, `shell/`, `icons.tsx`, `nav.ts`, barrel `index.ts`. See [`src/ui/README.md`](src/ui/README.md) for the source commit and what was adapted |
| `src/styles.css` | Catalog-only rules on DevDigest tokens: shell layout and mobile drawer, grids, `.dd-md` markdown blocks, Mermaid figures, search highlight |

## Design system

The look follows the DevDigest web app: left sidebar (264 px, catalog and plugin sections with
count pills, theme toggle and repository link in the footer), topbar with mono breadcrumbs and a
"Search or jump to…" field (`/` or Ctrl/Cmd+K), DevDigest page headers, underline tabs, cards
with uppercase section labels. Components are styled inline against CSS variables, as upstream.
Dark is the default theme; light is switched with `data-theme="light"` on `<html>`. At ≤ 900 px
the sidebar becomes an off-canvas drawer opened from the topbar menu button.

Updating the vendored kit from DevDigest: diff `src/ui/*` against
`dev-digest/client/src/vendor/ui/*` from the commit recorded in `src/ui/README.md`, port the
changes while keeping the catalog adaptations (labels as props, ARIA, no Tailwind / Next.js),
keep `lucide-react` pinned to DevDigest's version, update the recorded commit, then run
`npm run build` and check every route at 1440 px and 360 px in both themes.

## Security notes

README, SKILL.md and agent bodies come from pull requests and are treated as untrusted. They are
always passed through DOMPurify after `marked` (scripts, event handlers, `javascript:` URLs,
iframes, forms and inline styles are removed). Links to other origins get
`target="_blank" rel="noopener noreferrer"`; relative links and images are rewritten to
`https://github.com/<repo>/blob/main/<path>`.

## Deployment

- `.github/workflows/site.yml` builds the site on pull requests and pushes to `main` that touch
  the site, plugins or the marketplace, and uploads `site/dist` as an artifact.
- `.github/workflows/pages.yml` builds and deploys to GitHub Pages on every push to `main`
  (enable Pages with source "GitHub Actions" in the repository settings).
