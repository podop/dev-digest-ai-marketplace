---
type: llm
focus: { source: file, path: docs/plans/todo-priority.md }
---

The repository this plan is for has no test script and no test runner configured.

PASS if the plan's verification section says no test command was found and either asks the user
for one or proposes adding one as an explicit, clearly labelled assumption or plan step.
FAIL if the plan presents a command such as `npm test` as the repository's existing test command.
