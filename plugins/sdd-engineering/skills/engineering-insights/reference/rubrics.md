# Rubrics — what goes where, and what is worth writing

## Contents
- Sections (the 7 fixed rubrics)
- Qualifies / does not qualify
- Good vs bad entries
- Package routing

## Sections

| Section | Write here when… | Shape |
|---|---|---|
| **What Works** | an approach solved a real problem here after other attempts, and will apply again | `<where>: <approach> → use when <situation>` |
| **What Doesn't Work** | an approach failed or was abandoned — incl. what the agent keeps reaching for wrongly. Most valuable section: never skip it | `<where>: <approach> fails because <cause> → do <instead>` |
| **Codebase Patterns** | a convention/decision the code relies on but doesn't state (decided this session, or discovered) | `<where>: <rule> — <why>` |
| **Tool & Library Notes** | a dependency quirk: version, flag, limit, default | `<lib@version>: <quirk> → <workaround>` |
| **Recurring Errors & Fixes** | an error seen more than once, or certain to recur | `` `<error text>` in <where> → cause: <x> → fix: <y> `` |
| **Session Notes** | a session produced at least one other entry or a lasting decision | `<what changed>; left: <what's open>` |
| **Open Questions** | suspected but unverified, or deliberately left unresolved | `<question> — seen in <where>` |

`<where>` is a repo-relative path (directory or file), so the next agent can find the spot.

## Qualifies (all must hold)
- **Counterfactual:** if this entry vanished, would the next agent — even after reading the code,
  tests, README, `CLAUDE.md` and `AGENTS.md` — likely repeat the mistake or redo the investigation?
- **Recurs:** project-specific and will matter again; not a one-off typo.
- **Worth it:** saves 5+ minutes or prevents a wrong turn.
- **Verified:** observed this session — ran, failed, measured, fix confirmed working.
  Otherwise → `Open Questions`.

## Does not qualify
- Generic programming knowledge ("await inside loops is slow").
- Anything already in `README.md`, `docs/`, `CLAUDE.md`, `AGENTS.md`, or obvious from the code.
- Effort, diff size or "task finished" by themselves.
- Fixes whose code/test already makes the lesson obvious.
- Anything needing a paragraph — that's documentation: write `<package>/docs/<topic>.md`, then add
  a one-line entry pointing to it.

## Good vs bad

Bad → why:
- `- async is tricky in the executor` → no where, no what, no action.
- `- fixed the flaky test` → one-off; the fix is in the code.
- `- Zod validates input` → generic knowledge.

Good (illustrative shapes):
- `- 2026-09-21 — api/src/db/migrations: each file runs in a transaction, so CREATE INDEX CONCURRENTLY fails → put it in its own migration marked no-transaction`
- `- 2026-09-21 — web/src/i18n: a key missing from one locale renders the raw key only in production builds → add it to every locale file in the same change`
- `` - 2026-09-21 — `ECONNREFUSED 127.0.0.1:5432` in integration tests → cause: tests start before the DB container is healthy → fix: run them through the test script that waits for the health check ``

## Package routing

A **package** is a top-level directory with its own build manifest (`package.json`,
`pyproject.toml`, `setup.py`, `go.mod`, `pom.xml`, `build.gradle[.kts]`, `Cargo.toml`,
`composer.json`, `Gemfile`, …), or a child of a top-level container directory that has none
itself (`packages/<x>`, `apps/<x>`, `services/<x>`). `append_insight.py route <path>` applies
exactly this rule.

- File inside a package → `<package>/INSIGHTS.md`.
- Repository without packages (a single project) → the root `INSIGHTS.md`.
- Shared tooling (`scripts/`, CI workflows, `docker-compose.yml`, root configs) → the package whose
  workflow it serves; if it serves the whole repository, the root `INSIGHTS.md`.
- Two packages interact → the package where the next agent will hit the problem. Never copy one
  entry into two files.
- The repository's `CLAUDE.md` / `AGENTS.md` or existing `INSIGHTS.md` files show a different
  layout → follow the existing layout.
