# SDD workflow conventions

The single description of the workflow's shared rules, for maintainers and for the `run-plan`
lead. Agents do **not** read this file at runtime: each agent prompt carries the parts it needs
(measured in docs/COST-BASELINE.md). When you change a rule here, update the agents that quote it:
§1 → all agents, §3 → implementation-planner, implementer, plan-verifier, §4 → implementation-planner,
implementer.

## 1. Artifact paths

The repository's own instructions win: if `CLAUDE.md` / `AGENTS.md` (root or package) names a
location for specs, plans or reviews, use it. A path the user names explicitly wins over both.
Otherwise:

| Artifact | Default path | Written by |
|---|---|---|
| Spec | `specs/<YYYY-MM-DD>-<slug>.md` | `spec-creator` |
| Plan | `docs/plans/<YYYY-MM-DD>-<slug>.md` | `implementation-planner` |
| Context pack | `docs/plans/<YYYY-MM-DD>-<slug>.context.md` | `implementation-planner` |
| Review reports | `.sdd/review/<slug>/<agent>-r<N>.md` | `plan-verifier`, `architecture-review:architecture-reviewer` |
| Round snapshots | `.sdd/review/<slug>/<label>.json` | `run-plan` (`review_delta.py`) |
| Retro ledger | `docs/retros/ledger.md` | `workflow-retro` (opt out with `--no-ledger`) |

`<slug>` is kebab-case, ≤ 5 words, the same for the spec and the plan of one feature.
`.sdd/` is working state: suggest adding it to `.gitignore`; never commit it.

## 2. Status lines

- Spec header: `Spec: <title> · Status: draft | ready-for-planning · Date: <YYYY-MM-DD>`.
  Only the user's approval moves a spec to `ready-for-planning`.
- Plan header: `Plan: <title> · Status: draft | approved · Spec: <path> · Base: <branch>@<sha>`.
- Agent hand-backs start with `STATUS: DONE | PARTIAL | BLOCKED` (implementer) or
  `VERDICT: PASS | FAIL | BLOCK | INCOMPLETE` (reviewers).

## 3. Verification commands

Agents never invent commands. Discover them in this order and record where each came from:

1. the plan's `## Verification` section;
2. root and package `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md` / `TESTING.md`;
3. build manifests: `package.json` scripts (`test`, `typecheck`, `lint`, `check`), `Makefile`
   targets, `pyproject.toml` / `tox.ini`, `go.mod` (`go test ./...`), `pom.xml` (`mvn -q test`),
   `build.gradle` (`./gradlew test`), `Cargo.toml` (`cargo test`);
4. CI workflow files (`.github/workflows/*.yml`) — the commands CI runs.

**No test command found** → say so; do not guess one. The planner writes
`Verification: no test command found — <where it looked>` and asks the user; the implementer
reports `Gates: NOT RUN — no test command found` with `STATUS: PARTIAL`; the plan-verifier marks
rows that depend on tests `CANNOT_VERIFY (no test command)`.

## 4. Skills and dependencies

Technical guidance lives in `engineering-paved-path`. Load a skill only when a step touches its
area; read its reference files only when the step depends on them.

| Files touched | Skill |
|---|---|
| `*.tsx`, React hooks/components | `engineering-paved-path:react-best-practices` |
| `*.test.tsx`, `*.spec.tsx` | `engineering-paved-path:react-testing-library` |
| Fastify routes/plugins/server setup | `engineering-paved-path:fastify-best-practices` |
| Backend module placement, use cases, repositories, adapters | `engineering-paved-path:onion-architecture` |
| Drizzle schema/queries/migrations | `engineering-paved-path:drizzle-orm-patterns` |
| SQL schema, indexes, constraints | `engineering-paved-path:postgresql-table-design` |
| Zod schemas | `engineering-paved-path:zod` |
| `tsconfig*`, type-level code | `engineering-paved-path:typescript-expert` |
| auth, input handling, secrets, uploads | `engineering-paved-path:security` |
| Mermaid diagrams | `engineering-paved-path:mermaid-diagram` |

The repository's own rules (`CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, ADRs, lint configs)
override the skills. Delegated agents: `research-tools:researcher` (read-only facts),
`architecture-review:architecture-reviewer` (architecture gate).

## 5. Hand-off rules

- **Paths, not content.** Pass spec, plan, context-pack and report paths; never paste a plan,
  diff or report into a delegation prompt.
- **Short hand-backs.** Reviewers write the full report to `.sdd/review/<slug>/` and return
  ≤ 40 lines; the implementer returns ≤ 60 lines.
- **Subagents cannot ask the user.** Open questions come back in the hand-back
  (`Clarification needed`, `Open questions`, `STATUS: BLOCKED`).
- **Writers run one at a time**; read-only reviewers may run in parallel on the same snapshot.
- **Never** commit, push, rewrite history, install dependencies or touch production data unless
  the plan says so and the user approved it.
