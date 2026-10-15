# engineering-paved-path

Shared engineering practices for TypeScript web projects, packaged as on-demand skills. It is the
single source of technical guidance for the other plugins in this marketplace: agents load these
skills instead of carrying their own copies.

```
/plugin marketplace add podop/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
```

You rarely install it by hand: `sdd-engineering` and `architecture-review` declare it as a
dependency and the installer pulls it in.

## Skills

| Skill | Use it when | Supporting files |
|---|---|---|
| `react-best-practices` | writing, reviewing or refactoring React components, hooks, state | `examples.md` |
| `react-testing-library` | writing React component/hook tests with RTL + Vitest | — |
| `fastify-best-practices` | building or debugging Fastify servers, routes, plugins, schemas | `rules/*.md` (one per topic) |
| `onion-architecture` | deciding where backend code lives; layering reviews; dependency-cruiser checks | `references/*.md` |
| `drizzle-orm-patterns` | Drizzle schema, queries, relations, transactions, migrations | `references/*.md` |
| `postgresql-table-design` | designing or reviewing PostgreSQL schemas, types, indexes, constraints | — |
| `zod` | defining and parsing Zod schemas, error handling, type inference | `references/*.md` |
| `typescript-expert` | type-level programming, tsconfig, tooling, migrations | `references/`, `scripts/ts_diagnostic.py` |
| `security` | auth, input validation, uploads, secrets, OWASP Top 10:2025 reviews | `checklists.md`, `examples.md` |
| `mermaid-diagram` | flowcharts, sequence diagrams, ERDs and state machines in Markdown | `examples.md` |

Each skill keeps a short `SKILL.md` and moves details into supporting files that are read only when
the task needs them (progressive disclosure), so the always-loaded cost is the skill descriptions.

## How to use

- **Automatically.** Claude picks a skill when the task matches its description.
- **Explicitly.** Call it by its namespaced name, for example `/engineering-paved-path:zod`.
- **From another plugin.** Agents refer to skills by full name:
  `engineering-paved-path:onion-architecture`. Declare the dependency in your `plugin.json`:

  ```json
  { "dependencies": [{ "name": "engineering-paved-path", "version": "^1.0.0" }] }
  ```

## Project rules win

The skills are generic. If your repository documents its own conventions (`CLAUDE.md`,
`AGENTS.md`, `ARCHITECTURE.md`, ADRs, lint or dependency-cruiser configs), those take precedence.
`onion-architecture` says so explicitly and reports "not configured" instead of inventing a layer
check for a repository that has none.

## Not included

- **Next.js.** `next-best-practices` from `vercel-labs/next-skills` has no license, so it is not
  redistributed. Install it from upstream into your project if you need it.
- **Product-specific skills** (frontend folder layouts, dependency audits tied to one repository)
  stayed in the product that owns them.

## Adding a skill

A new skill belongs here only if a workflow in this marketplace needs it or it has another real
consumer; every description is loaded into each session's discovery context. See
[CONTRIBUTING.md](../../CONTRIBUTING.md) and [docs/PLUGIN-GUIDELINES.md](../../docs/PLUGIN-GUIDELINES.md).

Owner: AI Engineering · License: MIT (third-party material: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)) ·
Changes: [CHANGELOG.md](CHANGELOG.md) · Requirements: [COMPATIBILITY.md](COMPATIBILITY.md)
