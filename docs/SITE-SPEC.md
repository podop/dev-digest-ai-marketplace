# Catalog site specification

Static, read-only catalog of this marketplace, hosted on GitHub Pages. The CLI stays the
way to install; the site exists for discovery: find a plugin, skill or agent, read its
documentation, see its dependencies and copy the install command.

## Constraints

- **No backend.** Everything is built at CI time into static JSON and served by Pages.
  No ratings, download counters, accounts or server-side search in v1.
- **Real data only.** Every card, count and page comes from the generated index. The UI
  has no hard-coded plugin, skill or agent; an empty marketplace renders an empty state.
- **Untrusted content.** README, SKILL.md and agent bodies come from pull requests.
  Mermaid code blocks are rendered as diagrams by `mermaid`, loaded on demand only on pages
  that contain one, with `securityLevel: 'strict'`, no HTML labels, and the SVG output
  sanitized by DOMPurify again; a block that fails to parse stays visible as code.
  Markdown is rendered with `marked` and always sanitized with `DOMPurify` before it
  touches the DOM. Links to other origins open with `rel="noopener noreferrer"`.
- **Pages-friendly routing.** Hash routing (`#/…`), relative asset paths (Vite
  `base: './'`), so the site works under `https://<owner>.github.io/<repo>/` and from
  any fork without configuration.
- **Text lives in one file.** All UI strings are in `site/src/i18n/en.json`; components
  read them through `t('key')`. No user-visible literals in components.
- **Dark first.** Dark theme by default, light theme as an option (toggle, persisted in
  `localStorage`, guarded by try/catch). `prefers-color-scheme` is not used to override
  the default.

## Build pipeline

```
marketplace.json ─┐
plugin.json ×N  ──┤
README / CHANGELOG / COMPATIBILITY ──┤  scripts/build-index.mjs  ──►  site/public/index.json
SKILL.md / agents/*.md frontmatter ──┤                               site/public/releases.json
git tags {plugin}--v{version} ─────┘                               site/public/stats.json
                                                                    site/public/bodies/<id>.md
site/ (React + TypeScript + Vite)  ──  vite build  ──►  site/dist/  ──►  GitHub Pages
```

- The index is regenerated on every build; nothing is indexed by hand. Adding a plugin
  or skill in a merged pull request is enough for it to appear after the Pages deploy.
- `npm run dev` (in `site/`) regenerates the index first and starts the Vite dev server
  with hot reload; `npm run dev:watch` (repo root) also rebuilds the index when files
  under `plugins/` or `.claude-plugin/` change.
- Generated files (`site/public/*.json`, `site/public/bodies/`, `site/dist/`) are not
  committed.

## Index format

`index.json`

```jsonc
{
  "marketplace": { "name": "...", "owner": "...", "description": "...", "repo": "owner/repo" },
  "generatedAt": "ISO-8601",
  "commit": "<sha or null>",
  "plugins": [{
    "name": "sdd-engineering",
    "version": "1.0.0",
    "description": "...",
    "owner": "AI Engineering",        // plugin.json author.name → marketplace owner
    "keywords": ["..."],
    "license": "MIT",
    "compatibility": "Claude Code >= 2.1.110",   // first line of COMPATIBILITY.md requirement
    "dependencies": [{ "name": "research-tools", "version": "^1.0.0" }],
    "dependents": ["..."],            // reverse edges, computed
    "components": { "skills": ["id"], "agents": ["id"], "hooks": 0, "evals": 3 },
    "install": "/plugin install sdd-engineering@dev-digest-ai-marketplace",
    "readme": "bodies/plugin--sdd-engineering--readme.md",
    "changelog": "bodies/plugin--sdd-engineering--changelog.md",
    "sourcePath": "plugins/sdd-engineering",
    "contextBytes": 12345             // bytes of always-loaded discovery text (descriptions)
  }],
  "artifacts": [{
    "id": "sdd-engineering:run-plan",
    "type": "skill",                  // skill | agent
    "name": "run-plan",
    "plugin": "sdd-engineering",
    "description": "...",
    "fields": { "model": "sonnet", "tools": "Read, Grep", "argument-hint": "..." },
    "body": "bodies/skill--sdd-engineering--run-plan.md",
    "files": ["references/x.md", "scripts/y.py"],
    "sourcePath": "plugins/sdd-engineering/skills/run-plan/SKILL.md",
    "searchText": "first ~4 KB of the body, markdown stripped"
  }]
}
```

`releases.json` — one entry per tag `{plugin}--v{version}`: plugin, version, tag, date,
commit, and the matching `## [version]` section of the plugin's CHANGELOG (falls back to
the changelog alone when there are no tags yet, marked `untagged`).

`stats.json` — counts of plugins, skills, agents, evals; dependency edges; per-plugin
discovery context size.

## Routes

| Route | Screen | Content |
|---|---|---|
| `#/` | Home | Search box, totals, plugin grid, latest releases (3) |
| `#/search?q=&type=&plugin=` | Search | Free-text search across everything; type and plugin filters; result cards |
| `#/plugin/<name>` | Plugin | Header (version, owner, license, compatibility), copy install command, dependencies and dependents, components list, README / Changelog tabs, link to source |
| `#/artifact/<id>` | Artifact | Type badge, namespaced name, plugin link, frontmatter fields, rendered body, supporting files, how to invoke it, link to source |
| `#/whats-new` | What's new | Releases newest first, grouped by date, with changelog excerpts |
| `#/getting-started` | Getting started | Add marketplace, install, update, auto-update, stable channel, rollback |
| anything else | Not found | Link home |

## Search

- MiniSearch over plugins and artifacts. Fields and boosts: `name` ×4, `id` ×3,
  `description` ×2, `keywords` ×2, `searchText` ×1 (README for plugins, body for skills
  and agents).
- Natural-language queries ("I need a skill for database migrations") work by removing
  English stop words and filler ("I", "need", "skill", "for", "a", "want", "how"…)
  before querying, plus `prefix: true` and `fuzzy: 0.2`. Words that name a type
  ("skill", "agent", "plugin") also set the type filter when the user did not pick one.
- Results are cards: type badge, name, plugin, description, matched-term highlight.
- `/` focuses the search box from anywhere; query and filters are kept in the URL so a
  search can be shared.

## Detail page requirements

- Version and dependencies come only from `plugin.json`.
- "Copy install" copies exactly `/plugin install <name>@<marketplace>`; a second button
  copies the CLI form `claude plugin install <name>@<marketplace> --scope project`.
- Dependencies link to their plugin pages; dependents ("Used by") are computed.
- Skills show how to call them (`/<plugin>:<skill>`); agents show their namespaced
  `subagent_type` (`<plugin>:<agent>`), model and tools.

## Out of scope (v1)

Ratings, download counts, comments, authenticated features, server-side search,
analytics beyond what GitHub Pages provides.

## Acceptance checks

1. A plugin and each of its skills and agents can be found by name and by a word from
   their description.
2. Version and dependencies on the plugin page match `plugin.json`.
3. "Copy install" copies the right command.
4. A `<script>` or `onerror=` in a README is not executed (DOMPurify).
5. The site works under a sub-path on GitHub Pages and on a hard refresh of any route.
6. No UI text outside `site/src/i18n/en.json`.
