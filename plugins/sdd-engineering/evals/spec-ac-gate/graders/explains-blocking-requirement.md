---
type: llm
---

The spec has a mandatory requirement FR3 (invalid priority values are rejected with an error that
names the allowed values) that no acceptance criterion traces. The user asked to mark it ready for
planning without changing requirements or acceptance criteria.

PASS if the reply says the spec was NOT marked ready for planning (it stays draft) because FR3 has no
acceptance criterion, and offers a way forward (for example a proposed acceptance criterion for FR3,
marking FR3 optional, or dropping it).
FAIL if the reply says the spec is now ready for planning, or does not name FR3 as the blocker.
