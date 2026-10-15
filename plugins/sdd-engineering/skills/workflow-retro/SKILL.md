---
name: workflow-retro
description: "Retrospective of a finished multi-agent SDD run (manual only). Reads this session's Claude Code transcripts and, per subagent, reports tokens, cache hit, time, tool calls and estimated cost, plus overall parallelism; then finds waste — files several agents re-read, commands several agents re-ran, agents the lead had to continue, agents that wrote outside their scope, skipped steps (no tests after the last code edit, no review after the last implementer, no insights wrap-up). Prints a compact table and up to 5 action items \"file → change\", and appends one row to docs/retros/ledger.md. Recommends only; never edits agents, skills or code. Runs only when the user types /sdd-engineering:workflow-retro."
disable-model-invocation: true
argument-hint: "[<label>] [--since <ISO>] [--until <ISO>] [--session <id>] [--ledger <path>] [--no-ledger]"
allowed-tools:
  - Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py *)
  - Bash(python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py" *)
---

# /sdd-engineering:workflow-retro — where did the agents lose tokens and time?

Arguments: `$ARGUMENTS`

**When:** right after a whole SDD run (`spec-creator` → `implementation-planner` →
`/sdd-engineering:run-plan` → review → fixes), **in the same session** — the data comes from
this session's transcript. Run the feature, see where agents lost tokens and time, tune the
prompts before the next feature. **Manual only:** no hook, agent or other skill starts it.

**Never** edits agents, skills, scripts or code — it recommends. The only file it writes is
one row in the ledger (`docs/retros/ledger.md` in the repository root, or `--ledger <path>`);
`--no-ledger` writes nothing.

## 1 — Scope

- `label` = the first argument, or the plan/feature slug of the run.
- Window: `--since/--until` if given (ISO; UTC when no offset). Otherwise from the first
  subagent spawn of the run (look it up in your own context: when the spec or plan stage
  started) to now. A window keeps earlier work of a long session out of the numbers.
- `--session <id>` only to analyse another session; the default is the newest transcript of
  this repository, i.e. the current one.
- Run the commands from the repository root. Transcripts are read from
  `~/.claude/projects/<repo path with every non-alphanumeric character replaced by '-'>/`;
  if the script says it cannot find them, ask the user for the directory and pass
  `--projects-dir <dir>`.

## 2 — Collect (deterministic)

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py" --since <ISO> [--until <ISO>] [--session <id>]          # markdown
python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py" --since <ISO> [--until <ISO>] [--session <id>] --json   # detail
```

If it prints `retro skipped` (fewer than 2 subagents in the window), tell the user there is
nothing to compare and **stop** (no ledger row).

The script reads the lead transcript and every `agent-*.jsonl` of the session (nested agents
included; a parent's token count does not include its children) and prints:

- per agent: tokens, cache hit %, cost ≈ (prices in `scripts/config.json` — an estimate),
  duration, API calls, peak context, top tools, and flags — `continued×N` (the lead had to
  SendMessage it), `re-ask` (hand-back says Clarification needed / BLOCKED / PARTIAL /
  "do it yourself"), `denied×N` (permission denials), `scope×N` (wrote outside its agent
  type's write scope, see below), `nested←<parent>`;
- session: parallelism (peak and average), files read by ≥ 2 agents, commands run by ≥ 2
  agents, and **pipeline checks** — tests/verification after the last code edit, a review
  (`sdd-engineering:plan-verifier` or `architecture-review:architecture-reviewer`) after the
  last `sdd-engineering:implementer`, and an insights wrap-up after code edits (only when the
  repository keeps `INSIGHTS.md` files).

Write scopes (from `scripts/config.json`): `spec-creator` → `specs/**`, `**/specs/**`;
`implementation-planner` → `docs/plans/**`; reviewers → `.sdd/review/**`; `researcher` →
nothing; `implementer` → anything except specs, plans, `INSIGHTS.md`, `.claude/**`, `.sdd/**`.
If the repository's `CLAUDE.md` / `AGENTS.md` moved these artifacts elsewhere, discount
`scope` flags that only reflect that.

Read the table; open a transcript only to confirm one specific claim (`grep` it, never `cat`
a `.jsonl`). Write detection from Bash is heuristic — confirm a `scope` flag before
reporting it.

## 3 — Analyse

Every finding cites a number or a quote.

| Check | Signal | Typical action (file → change) |
|---|---|---|
| Cost share | one agent > 40 % of cost, or the lead > all subagents | split the role / start the pipeline in a fresh session |
| Re-read context | a file read by ≥ 3 agents | put the facts in the plan's context pack and tell agents it is already summarised |
| Re-run commands | the same test command by ≥ 2 agents | the implementer reports the result once; reviewers cite it instead of re-running |
| Overloaded role | peak context > 200k, > 120 calls, or `STATUS: PARTIAL` | split the plan into smaller steps or waves |
| Cache | hit < 80 % on agents with > 20 calls | stable prompt prefix; continue a small context instead of respawning |
| Parallelism | avg ≪ peak, independent read-only agents ran one after another | spawn them in one message |
| Re-asks | `re-ask`, `continued`, `denied` | the spec or plan must pre-answer it (approved exceptions, deletions, permissions) |
| Scope | `scope×N` (confirmed) | tighten the agent's write rules / give the step to the right agent |
| Skipped steps | a `MISSING` pipeline check | add the step to the plan's `## Verification` or the owner's instructions |
| Rounds | > 2 review rounds, the same finding re-opened | sharper fix brief, earlier test |

## 4 — Report (chat, ≤ 50 lines)

```
# Workflow retro — <label> · <date>
Run: <n> agents · ∥ peak <p> / avg <a> · <wall> min · <tokens> (fresh <f>, cache hit <h>%) · cost ≈ $<c>
Verdict: healthy | wasteful | blocked — <main reason>

| Agent | Model | Tokens | Hit | Cost ≈ | Time | Tools | Flags |      (compact: top agents + totals)

Problems
- <check> — <evidence>

Action items (≤ 5, ranked by expected saving)
1. <file> → <what exactly to change> (saves ~<tokens/$/min>)
2. …

Not measured: <cost is an estimate; Bash write detection is heuristic; …>
```

Every action item names one file and one concrete change. Prefer files the user owns: the
repository's `CLAUDE.md` / `AGENTS.md`, the plan or its context pack, a project-level agent
override in `.claude/agents/`. A change to an `sdd-engineering` agent itself is phrased as
an upstream suggestion for the plugin.

## 5 — Ledger

Unless `--no-ledger`:

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/analyze_journals.py" --append-ledger --label <label> --since <ISO> [--until <ISO>] \
  [--session <id>] [--ledger <path>] --verdict "<healthy|wasteful|blocked>: <reason ≤ 8 words>" \
  --actions "<top 1–3 items, ;-separated>"
```

The ledger is created with its header if it does not exist. Show the appended row and, if
earlier rows exist, the trend in one line ("cost −30 % vs <previous label>").

## Not this skill

Lessons about the code go to `INSIGHTS.md` (`sdd-engineering:engineering-insights`).
Applying an action item is a separate change the user approves.
