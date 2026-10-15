# Compatibility — architecture-review

| Requirement | Value |
|---|---|
| Claude Code | >= 2.1.110 (version-constrained plugin dependencies) |
| Dependencies | `engineering-paved-path@^1.0.0` |
| Network / credentials | none |
| Hooks / MCP servers | none |
| Writes | one report file, default `.sdd/review/<slug>/arch-r<N>.md` |

Works with any language. Deterministic checks run only when the repository defines them
(dependency-cruiser, eslint boundary rules, ArchUnit, nx tags, typecheck scripts).
