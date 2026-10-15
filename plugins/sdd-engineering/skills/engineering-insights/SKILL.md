---
name: engineering-insights
description: Reads and appends engineering insights in INSIGHTS.md — per package in a monorepo (<package>/INSIGHTS.md), or one root INSIGHTS.md otherwise. Use at the start of any task that touches code — read the relevant INSIGHTS.md before planning; the moment a non-obvious fact is verified (a fix that worked, a dead end, a library quirk, a recurring error); and at the end of a substantial task to append only new, significant insights. Triggers on "/engineering-insights", "wrap up", "what did we learn", "record this insight", "update insights", finishing a bug fix or feature.
allowed-tools:
  - Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/append_insight.py *)
  - Bash(python3 "${CLAUDE_SKILL_DIR}/scripts/append_insight.py" *)
---

# engineering-insights

`INSIGHTS.md` is the repository's memory for the next agent: high-confidence, project-specific
guidance, and a draft under human review. **You only ever add to it.** Rubrics, examples and
routing: [reference/rubrics.md](reference/rubrics.md).

Run every command from the repository root. Paths are relative to it.

## 0. WHERE — which file

- A path the user names, or a location set by the repository's `CLAUDE.md` / `AGENTS.md`, wins.
- Otherwise ask the script; it prints the target file for each path you touch:
  ```bash
  python3 "${CLAUDE_SKILL_DIR}/scripts/append_insight.py" route <changed path> [<path> ...]
  ```
  Monorepo (a top-level directory — or `packages/<x>`-style child — with its own manifest such as
  `package.json`, `pyproject.toml`, `go.mod`, `pom.xml`, `Cargo.toml`) → `<package>/INSIGHTS.md`;
  anything else → the root `INSIGHTS.md`. Edge cases: rubrics.md › Package routing.

## 1. READ — every task, before planning or editing
1. From the request, decide which package(s) it touches. Unclear yet → read the file as soon as
   the package is known, before the first edit there.
2. Read each relevant `INSIGHTS.md` in full (it may not exist yet — then there is nothing to read).
3. In one line, say which entries apply to this task, or `INSIGHTS: nothing relevant`. Then follow them.

## 2. CAPTURE — during work
When something passes the gate (step 3.2), keep a one-line draft of it. Fixes count only once
confirmed working.

## 3. WRAP-UP — end of a substantial task (or on `/engineering-insights`)
1. **Re-read** the target `INSIGHTS.md` — it may have changed since READ.
2. **Gate** each draft (all must hold, details in rubrics.md): non-obvious even after reading
   code/docs · recurs · saves 5+ min · verified this session. Unverified → `Open Questions`.
3. **Dedupe.** Already in the file, even worded differently → drop it. Adds a genuinely new fact
   to an existing entry → write a new bullet that says what's new; never edit the old one.
   Contradicts an entry → append the new one with `⚠ conflicts with <date> entry`; a human resolves it.
4. **Append** each survivor with the script — never with Edit/Write on `INSIGHTS.md`:
   ```bash
   python3 "${CLAUDE_SKILL_DIR}/scripts/append_insight.py" add <package dir | path/to/INSIGHTS.md> "<Section>" "<where>: <fact> → <action>"
   ```
   Use `.` for the root file. It adds a dated bullet at the top of the section, creates the file
   with the standard sections if it is missing, and refuses to change any existing line.
   Exit 3 = a similar entry exists: re-check it; if it truly says something else, rephrase to the
   distinct fact and retry. `dupes <target> "<text>"` lists similar entries without writing.
5. `Session Notes`: add one line only if you appended something else or made a lasting decision.
6. **Verify:** `python3 "${CLAUDE_SKILL_DIR}/scripts/append_insight.py" verify <target>` must print `OK`.
7. **Report:** the exact lines added (file › section), or
   `Insights: nothing new worth recording — <reason>`. Writing nothing is the normal outcome of an
   ordinary task.

Sections (exact names): `What Works` · `What Doesn't Work` · `Codebase Patterns` ·
`Tool & Library Notes` · `Recurring Errors & Fixes` · `Session Notes` · `Open Questions`.

## Never
- Rewrite, reorder, merge, reformat or delete existing entries — pruning is a human review, not this skill.
- Write the same fact into two packages' files.
- Record generic knowledge, one-off issues, or what README / `CLAUDE.md` / `AGENTS.md` already say.
- Create an `INSIGHTS.md` for nothing: a new file appears only together with its first entry.
- Keep appending when a section passes ~30 bullets: tell the user and propose a split
  (e.g. `INSIGHTS-db.md`, which the script accepts as a target).
