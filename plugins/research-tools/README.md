# research-tools

A read-only `researcher` agent you can delegate discovery to. It answers one concrete question
with evidence and never edits files.

```
/plugin marketplace add podop/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
```

## The agent

| | |
|---|---|
| Name | `research-tools:researcher` |
| Model | sonnet |
| Tools | `Read, Grep, Glob, Bash, WebSearch, WebFetch` (Write, Edit, NotebookEdit and Skill are disallowed) |
| Input | one question that can be answered "found / not found"; mode repo, external or both |
| Output | `# Research: …` report — Answer · Findings with `file:line` / commit / numbered sources · Not found / unverified |

Modes:
- **Repo** — where and how something is implemented, traced flows, "why is it like this" from code,
  docs and `git log -S` / `git blame`.
- **External** — library and API docs pinned to the version in your lockfile, changelogs, advisories;
  key claims cross-checked with two sources or marked single-source.
- **Both** — two reports and a combined conclusion.

If the task has no concrete question, the agent returns `## Clarification needed` with up to five
questions (each with a default) instead of guessing; the caller relays them.

## How to use

Ask for it directly:

```
Use the research-tools:researcher agent to find where request IDs are generated and how they reach the logger.
```

Or delegate from another agent by listing it in that agent's `tools`, for example
`Agent(research-tools:researcher)`. `sdd-engineering`'s `spec-creator` does this to check facts
in parallel while it writes a spec.

## Guarantees and limits

- Read-only by tool allowlist; Bash is read-only by instruction (no installs, migrations, services
  or writes).
- Every claim has evidence; anything without it goes to "Not found / unverified", which is always
  present.
- It does not use skills or slash commands and does not recommend beyond the question.

Owner: AI Engineering · License: MIT · Changes: [CHANGELOG.md](CHANGELOG.md) ·
Requirements: [COMPATIBILITY.md](COMPATIBILITY.md)
