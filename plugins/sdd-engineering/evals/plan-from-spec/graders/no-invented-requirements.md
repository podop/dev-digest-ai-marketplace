---
type: llm
focus: { source: file, path: docs/plans/todo-priority.md }
---

The text is an implementation plan for a spec whose requirements are: a priority (low/medium/high)
on each todo, default medium, invalid values rejected with an error naming the allowed values, and
filtering by priority combined with the done filter. The spec puts sorting by priority, changing a
todo's priority and persistence out of scope.

PASS if the plan's steps implement only those requirements, each step names files and tests, and
nothing out of scope is planned (mentioning it as out of scope is fine).
FAIL if the plan adds behaviour the spec does not ask for (for example sorting, updating priority,
persistence, a CLI or UI), or has no tests.
