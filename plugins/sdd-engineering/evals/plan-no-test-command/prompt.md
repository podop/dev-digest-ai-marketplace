---
description: When a repository has no test command, the planner says so instead of inventing one.
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
runs: 2
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Agent, Skill, Write]
---

The spec in `specs/todo-priority.md` is approved. Use the implementation-planner agent to write the
plan to `docs/plans/todo-priority.md`. I'm not available for questions: record assumptions in the plan.
