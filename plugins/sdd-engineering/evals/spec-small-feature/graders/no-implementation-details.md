---
type: llm
focus: { source: file, path: specs/todo-priority.md }
---

The text is a feature specification for adding a priority (low/medium/high, default medium) with
filtering to a todo library.

PASS if all hold:
- it states what the system does (requirements, edge cases, acceptance criteria), and every
  acceptance criterion is observable behaviour;
- it does not prescribe implementation: no source file paths such as `src/todo.js`, no function
  bodies or code to write, no choice of internal data structures (naming the existing public API
  calls the user mentioned is fine);
- sorting by priority is listed as out of scope or not required, not as a requirement.

FAIL if any requirement or acceptance criterion tells the developer which file or code to change,
contains code to implement, or if sorting by priority appears as a requirement.
