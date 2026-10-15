# architecture-review

An independent architecture gate for code changes. The `architecture-reviewer` agent reads the
branch diff, runs the architecture checks your repository already has, and reports only findings
it can prove against a rule your repository documents.

```
/plugin marketplace add podop/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
```

Installing it also installs `engineering-paved-path` (dependency).

## What it checks

| Lens | Example finding |
|---|---|
| Layers / rings | an application service imports an infrastructure repository the docs forbid |
| Module boundaries | a module reaches into another module's internals instead of its public entry |
| Pure cores | a package documented as pure reads `process.env` or the filesystem |
| Client/server boundary | a client component's import chain reaches a server-only module with secrets |
| Contracts | one copy of a duplicated contract changed, the other did not |

Not in scope: security, lint/style, performance, plan compliance, fixing code.

## Where the rules come from

1. `ARCHITECTURE.md`, `docs/architecture/**`, ADRs (`docs/adr/**`, `adr/**`, `decisions/**`).
2. Root and package `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md`.
3. Architecture entries in `INSIGHTS.md`.
4. Deterministic configs: dependency-cruiser, eslint boundary rules, ArchUnit, nx tags,
   tsconfig path aliases — run through the scripts your repository defines.

When nothing is documented, it says so and falls back to `engineering-paved-path` skills; those
findings are capped at MEDIUM and labelled "generic guidance". To get stronger reviews, write
your rules down: an `ARCHITECTURE.md` with a short list of allowed dependencies goes a long way.

## How to use

```
Use the architecture-review:architecture-reviewer agent to review this branch against main.
```

Inputs it understands from a caller: `base: <sha|branch>`, `round: <N>`, `report: <path>`,
a changed-file list for later rounds, and cached check results. `sdd-engineering`'s `run-plan`
passes these automatically.

Output: the full report in `.sdd/review/<slug>/arch-r<N>.md` and a ≤ 40-line summary with
`VERDICT: PASS | BLOCK | INCOMPLETE`. BLOCK means at least one CRITICAL finding.

## Guarantees

- Read-only by tool allowlist (Write/Edit/NotebookEdit disallowed); the only file it creates is
  its report.
- Every finding is re-read, re-traced, confirmed on a changed line, tied to a quoted rule and
  ≥ 80 confidence; everything else is counted as "dropped in verification".

Owner: AI Engineering · License: MIT · Changes: [CHANGELOG.md](CHANGELOG.md) ·
Requirements: [COMPATIBILITY.md](COMPATIBILITY.md)
