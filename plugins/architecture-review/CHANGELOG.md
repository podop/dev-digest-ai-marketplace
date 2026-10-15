# Changelog — architecture-review

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [1.0.0] - 2026-10-15

### Added
- `architecture-reviewer` agent extracted from the DevDigest harness and generalized: rules come
  from the repository's ARCHITECTURE.md, ADRs, CLAUDE.md/AGENTS.md and boundary configs instead of
  hard-coded package checks; deterministic commands are discovered, not assumed.
- Fallback lens through `engineering-paved-path` skills when a repository documents nothing
  (findings capped at MEDIUM).
