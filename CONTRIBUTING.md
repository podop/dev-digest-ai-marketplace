# Contributing

This repository is the team's Claude Code marketplace. It is released separately from any
product: changing a skill here never requires a product release, and a product UI change never
releases a plugin. Read this page and [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md)
before opening a pull request.

## Repository layout

```
.claude-plugin/marketplace.json   catalog: plugin name + source (+ category); no versions here
plugins/<name>/                   one directory per plugin (see below)
channels/stable/                  stable release channel, pinned to released commits
scripts/                          checks, index build, release and channel tools
site/                             catalog website (React + Vite), deployed to GitHub Pages
docs/                             guidelines, security, releases, site spec, cost baseline
.github/workflows/                validate.yml (harness checks), site.yml (site build), pages.yml (deploy)
```

## Plugin layout

```
plugins/<name>/
├── .claude-plugin/plugin.json    name, version, description, author, license, keywords, dependencies
├── agents/<agent>.md             optional — subagents (frontmatter + prompt)
├── skills/<skill>/SKILL.md       optional — skills, with supporting files next to SKILL.md
├── references/, scripts/         optional — plugin-level files, used via ${CLAUDE_PLUGIN_ROOT}
├── evals/<case>/                 behavior evals: prompt.md + graders/*.md
├── README.md                     what it does, how to use it, inputs/outputs, limits
├── CHANGELOG.md                  Keep a Changelog; one section per released version
└── COMPATIBILITY.md              Claude Code version, dependencies, network, credentials, writes
```

Everything a plugin needs must live inside its directory or in a declared dependency plugin:
installed plugins are copied to a cache, and files outside the plugin directory are not copied.

## Manifest fields

| Field | Rule |
|---|---|
| `name` | kebab-case, equals the directory name and the marketplace entry |
| `version` | SemVer; the **only** place a version lives (not in marketplace.json) |
| `description` | one sentence, what + for whom |
| `author.name` | owning team |
| `license` | `MIT` unless the plugin's README says otherwise; third-party material listed in `THIRD_PARTY_NOTICES.md` |
| `keywords` | 3–10 search terms (the catalog site indexes them) |
| `dependencies` | `[{ "name": "<plugin>", "version": "^<major>.<minor>.0" }]` — plugins from this marketplace only |

## Dependency rules

- Depend on a plugin to reuse its skills or agents; never copy them into your plugin.
- Use caret ranges on the dependency's current major (`^1.0.0`). A breaking change in a
  dependency is a new major and consumers opt in.
- Refer to dependency components by namespaced name: `engineering-paved-path:zod`,
  `research-tools:researcher`.
- No cycles. `scripts/check-plugins.mjs` fails on a cycle or an unknown dependency.
- A dependency must be released (tagged) before a consumer that needs the new range is released.

## Checks to run before a pull request

```bash
npm run check            # scripts/check-plugins.mjs: names, versions, changelog, deps, paths, secrets, language
claude plugin validate --strict .
for p in plugins/*/; do claude plugin validate --strict "$p"; done
npm run build:index      # the catalog index builds from your change
```

Behavior evals (cost tokens; run for the plugin you changed):

```bash
claude plugin eval ./plugins/<name> --trust-plugin
```

To try your change interactively without installing:

```bash
claude --plugin-dir ./plugins/engineering-paved-path --plugin-dir ./plugins/research-tools \
       --plugin-dir ./plugins/architecture-review --plugin-dir ./plugins/sdd-engineering
```

## Pull request checklist

- [ ] One plugin (or one cross-cutting concern) per pull request.
- [ ] `version` bumped in `plugin.json` per [docs/RELEASES.md](docs/RELEASES.md) and a matching
      `## [x.y.z] - YYYY-MM-DD` section in the plugin's `CHANGELOG.md`.
- [ ] README updated for any new component, input, output or behavior.
- [ ] `COMPATIBILITY.md` updated when a newer Claude Code feature is used.
- [ ] No product-specific paths, module names or repository names; no absolute paths; no secrets
      ([docs/SECURITY.md](docs/SECURITY.md)).
- [ ] All text in English.
- [ ] Agent `tools` are the minimum needed; read-only agents disallow Write/Edit.
- [ ] Evals added or updated for changed behavior, including a negative case.
- [ ] CI green: `Validate harness` and `Build catalog site`.

Reviews are required from the owners in [CODEOWNERS](CODEOWNERS); the `main` branch ruleset
requires a pull request, code-owner review and both CI checks.

## Catalog site

`site/` is a separate React + Vite application. It reads only the generated index; see
[site/README.md](site/README.md) and [docs/SITE-SPEC.md](docs/SITE-SPEC.md). Nothing needs to be
registered for the site: a merged plugin appears after the Pages deploy.
