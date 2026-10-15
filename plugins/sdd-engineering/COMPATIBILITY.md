# Compatibility — sdd-engineering

| Requirement | Value |
|---|---|
| Claude Code | >= 2.1.110 (version-constrained plugin dependencies) |
| Dependencies | `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`, `architecture-review@^1.0.0` |
| Runtime tools | `git`, `python3` >= 3.9 (stdlib only) for the bundled scripts |
| Network | none required; `spec-creator` uses WebFetch only for URLs you give it, `researcher` may search the web |
| Credentials | none |
| Hooks / MCP servers | none |
| Writes in your repository | `specs/`, `docs/plans/`, `.sdd/review/`, `INSIGHTS.md` (append-only), `docs/retros/ledger.md` — or the locations your `CLAUDE.md` names |
| Plugin data | none (`${CLAUDE_PLUGIN_DATA}` unused; all state lives in your repository) |

Evals were written for `claude plugin eval` as shipped in Claude Code 2.1.300.
