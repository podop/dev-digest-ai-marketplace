---
description: The SDD spec step on a small feature — spec-creator writes a spec without implementation details.
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 3
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill, Write, Edit]
---

I want to start Spec Driven Development for a small feature in this repository: todos should get a
priority (low, medium or high; medium when not given), and listing todos should be able to filter by
priority together with the existing done filter. Sorting is not needed.

Prepare the spec with the spec-creator agent and save it as `specs/todo-priority.md`. I'm not
available for questions right now: use sensible defaults and record them as assumptions in the spec.
Leave the status as draft so I can review it.
