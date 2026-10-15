# Changelog — sdd-engineering

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/)
as described in [docs/RELEASES.md](../../docs/RELEASES.md).

## [1.0.0] - 2026-10-15

### Added
- Agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`, extracted from the
  DevDigest harness and generalized: no product paths; artifact locations follow the repository's
  own instructions; verification commands are discovered and never invented.
- Skills `run-plan` (manual orchestration of implementation and review rounds), `workflow-retro`
  (manual run retrospective, `scripts/analyze_journals.py`), `engineering-insights` (append-only
  `INSIGHTS.md`, `scripts/append_insight.py`).
- `references/conventions.md`, `scripts/spec_lint.py`, `skills/run-plan/scripts/review_delta.py`.
- Dependencies: `engineering-paved-path@^1.0.0`, `research-tools@^1.0.0`, `architecture-review@^1.0.0`.
- Behavior evals: spec, plan, no test command, negative.

### Notes
- Acceptance-criteria coverage is reported by `spec_lint.py` as a warning; it does not block
  `Status: ready-for-planning` yet.
