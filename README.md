# dev-digest-ai-marketplace

The team's Claude Code marketplace: a Spec Driven Development workflow, shared engineering skills,
and reusable research and architecture-review agents. It is versioned and released separately from
any product.

**Catalog:** https://podop.github.io/dev-digest-ai-marketplace/

## Plugins

| Plugin | What you get | Depends on |
|---|---|---|
| [`sdd-engineering`](plugins/sdd-engineering) | `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier` agents; `run-plan`, `workflow-retro`, `engineering-insights` skills | the three below |
| [`architecture-review`](plugins/architecture-review) | read-only `architecture-reviewer` agent driven by your repository's documented rules | `engineering-paved-path` |
| [`research-tools`](plugins/research-tools) | read-only `researcher` agent with evidence-backed reports | — |
| [`engineering-paved-path`](plugins/engineering-paved-path) | skills: React, React Testing Library, Fastify, onion architecture, Drizzle, PostgreSQL, Zod, TypeScript, security, Mermaid | — |

```
sdd-engineering
├── engineering-paved-path ^1.0.0
├── research-tools ^1.0.0
└── architecture-review ^1.0.0
    └── engineering-paved-path ^1.0.0
```

## Install

In Claude Code:

```
/plugin marketplace add podop/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
```

From a shell, shared with your team through the project's `.claude/settings.json`:

```bash
claude plugin marketplace add podop/dev-digest-ai-marketplace --scope project
claude plugin install sdd-engineering@dev-digest-ai-marketplace --scope project
```

Dependencies are installed automatically. Start a new session or run `/reload-plugins`, then follow
the [sdd-engineering quick start](plugins/sdd-engineering/README.md#quick-start-in-your-repository).

Updates, the stable channel and rollback: [docs/RELEASES.md](docs/RELEASES.md).

## Repository

| Path | Contents |
|---|---|
| `.claude-plugin/marketplace.json` | the catalog Claude Code reads |
| `plugins/` | one directory per plugin |
| `channels/stable/` | stable channel: plugins pinned to released commits |
| `scripts/` | harness checks, catalog index, release, channel and cost tools |
| `site/` | catalog website (React + Vite) published to GitHub Pages |
| `docs/` | [plugin guidelines](docs/PLUGIN-GUIDELINES.md), [security](docs/SECURITY.md), [releases](docs/RELEASES.md), [site spec](docs/SITE-SPEC.md), [cost baseline](docs/COST-BASELINE.md) |

Contributing: [CONTRIBUTING.md](CONTRIBUTING.md). Owners: [CODEOWNERS](CODEOWNERS).
