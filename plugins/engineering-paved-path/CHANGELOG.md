# Changelog — engineering-paved-path

All notable changes to this plugin. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/) as described in [docs/RELEASES.md](../../docs/RELEASES.md).

## [1.0.0] - 2026-10-15

### Added
- Ten skills extracted from the DevDigest harness: `react-best-practices`, `react-testing-library`,
  `fastify-best-practices`, `onion-architecture`, `drizzle-orm-patterns`, `postgresql-table-design`,
  `zod`, `typescript-expert`, `security`, `mermaid-diagram`.

### Changed
- `onion-architecture` generalized: no product paths or package names; the repository's own
  architecture docs take precedence over the skill.

### Removed
- `next-best-practices` is not vendored: its upstream repository has no license. Install it from
  upstream if you need it (see README).
- `zod/AGENTS.md` (a compiled duplicate of `zod/references/`) and `fastify-best-practices/tile.json`.
