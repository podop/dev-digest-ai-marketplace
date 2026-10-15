#!/usr/bin/env python3
"""Data collector for the `workflow-retro` skill (read-only; never edits agents, skills or code).

  analyze_journals.py [--session <id|path>] [--since <ISO>] [--until <ISO>] [--json]
  analyze_journals.py --append-ledger --label <slug> --verdict <text> --actions "<a>; <b>" [...]

Run it from inside the repository the session worked on. It reads the Claude Code transcripts of
that repository: <projects-dir>/<session>.jsonl (the lead) and <projects-dir>/<session>/**/agent-*.jsonl
(every subagent, nested and workflow agents included). <projects-dir> defaults to
~/.claude/projects/<repo path with every non-alphanumeric character replaced by '-'>
($CLAUDE_CONFIG_DIR replaces ~/.claude when set); override it with --projects-dir.
Default session = the newest transcript there, i.e. the current session.

Per agent: tokens (input, cache write, cache read, output), cache hit %, estimated cost (prices in
config.json next to this script), duration, API calls, peak context, tool calls, spawn depth and
parent, times the lead had to continue it (SendMessage), re-asks in its hand-back, permission
denials, writes outside its scope. Session: peak and average parallelism, files read by >= 2
agents, commands run by >= 2 agents, and pipeline checks (tests after the last code edit, a review
after the last implementer, an insights wrap-up when the repository keeps INSIGHTS.md files).

Usage entries are de-duplicated by API request id (one response = several transcript lines).
Fewer than 2 subagents in the window -> prints a skip notice and exits 0.
Timestamps without an offset are read as UTC. Requires Python 3.9+, stdlib only.
"""
import argparse
import collections
import datetime as dt
import glob
import json
import os
import re
import shlex
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "config.json"), encoding="utf-8") as _fh:
    CONFIG = json.load(_fh)
USAGE_KEYS = ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens")
LEDGER_TITLE = "# Workflow retro ledger\n\nOne row per `/sdd-engineering:workflow-retro` run. Costs are estimates.\n\n"
LEDGER_HEADER = (
    "| Date | Label | Session | Agents (nested) | Peak ∥ | Wall | Tokens total | Fresh | Cache hit "
    "| Cost ≈ | Tool calls | Verdict | Top actions |\n"
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|\n"
)
DENIED = "Permission for this action was denied"
WRITE_TOOLS = ("Write", "Edit", "MultiEdit", "NotebookEdit")
READ_CMD = re.compile(r"^(?:cat|head|tail|sed\s+-n\s+\S+|less|bat)\s+(?:-[nc]\s+[+-]?\d+\s+|-\S+\s+)*([^\s|;&<>]+)")
HEREDOC = re.compile(r"<<-?\s*['\"]?(\w+)['\"]?")
PY_OPEN = re.compile(r"open\(\s*(?:f?['\"]([^'\"]+)['\"]|(\w+))\s*,\s*['\"][wa]")
PY_ASSIGN = re.compile(r"\b(\w+)\s*=\s*['\"]([^'\"]+\.[A-Za-z]{1,6})['\"]")
PY_WRITE_TEXT = re.compile(r"Path\(\s*['\"]([^'\"]+)['\"]\s*\)\.write_text")
SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "dist", "build", "target", ".sdd", "__pycache__"}


def repo_root():
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True, check=True)
        if out.stdout.strip():
            return os.path.realpath(out.stdout.strip())
    except (OSError, subprocess.CalledProcessError):
        pass
    return os.path.realpath(os.getcwd())


ROOT = repo_root()


def encode(path):
    return re.sub(r"[^A-Za-z0-9]", "-", path)


def default_projects_dir():
    base = os.path.join(os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude"), "projects")
    candidates = []
    for p in (os.getcwd(), os.path.realpath(os.getcwd()), ROOT):
        if p not in candidates:
            candidates.append(p)
    for p in candidates:
        d = os.path.join(base, encode(p))
        if os.path.isdir(d):
            return d
    sys.exit("no transcript directory for this repository; looked for: "
             + ", ".join(os.path.join(base, encode(p)) for p in candidates)
             + " — pass --projects-dir <dir with the session .jsonl files>")


def parse_ts(s):
    if not s:
        return None
    t = dt.datetime.fromisoformat(s.strip().replace("Z", "+00:00"))
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def cli_ts(s):
    try:
        return parse_ts(s)
    except ValueError:
        raise argparse.ArgumentTypeError("not an ISO timestamp: %r" % s)


def resolve_session(arg, pdir):
    if arg and os.path.isfile(arg):
        return arg
    if arg:
        path = os.path.join(pdir, arg if arg.endswith(".jsonl") else arg + ".jsonl")
        if not os.path.isfile(path):
            matches = glob.glob(os.path.join(pdir, arg + "*.jsonl"))
            if len(matches) != 1:
                sys.exit("session not found: %s" % path)
            path = matches[0]
        return path
    files = glob.glob(os.path.join(pdir, "*.jsonl"))
    if not files:
        sys.exit("no transcripts in %s" % pdir)
    return max(files, key=os.path.getmtime)


def rel(path):
    if not path:
        return path
    p = os.path.normpath(path if os.path.isabs(path) else os.path.join(ROOT, path))
    return os.path.relpath(p, ROOT) if p.startswith(ROOT + os.sep) else p


def price_of(model):
    m = (model or "").replace("[1m]", "")
    m = CONFIG["model_aliases"].get(m, m)
    for key, p in CONFIG["pricing"].items():
        if m == key or m.startswith(key + "-"):
            return p
    return None


# ---------------------------------------------------------------- globs and agent types

_GLOB_CACHE = {}


def glob_re(pattern):
    """'**/' = zero or more directories, '**' = anything, '*' = one segment, '?' = one char."""
    if pattern not in _GLOB_CACHE:
        i, out = 0, ""
        while i < len(pattern):
            if pattern.startswith("**/", i):
                out += "(?:.*/)?"
                i += 3
            elif pattern.startswith("**", i):
                out += ".*"
                i += 2
            elif pattern[i] == "*":
                out += "[^/]*"
                i += 1
            elif pattern[i] == "?":
                out += "[^/]"
                i += 1
            else:
                out += re.escape(pattern[i])
                i += 1
        _GLOB_CACHE[pattern] = re.compile(out + r"\Z")
    return _GLOB_CACHE[pattern]


def matches(path, globs):
    return any(glob_re(g).match(path) for g in globs)


def bare(agent_type):
    return (agent_type or "").split(":")[-1]


def type_in(agent_type, names):
    return any(agent_type == n or bare(agent_type) == bare(n) for n in names)


def scope_rule(agent_type):
    scope = CONFIG["scope"]
    if agent_type in scope:
        return scope[agent_type]
    for key, rule in scope.items():
        if bare(key) == bare(agent_type):
            return rule
    return None


# ---------------------------------------------------------------- shell heuristics

def split_shell(raw):
    """(cwd, simple command) pairs outside heredoc bodies, and (cwd, heredoc body) pairs."""
    parts, bodies, body, term, cwd = [], [], [], None, ""
    for line in raw.split("\n"):
        if term is not None:
            if line.strip() == term:
                bodies.append((cwd, "\n".join(body)))
                body, term = [], None
            else:
                body.append(line)
            continue
        for part in re.split(r"\s*(?:&&|;|\|\|?)\s*", line):
            part = part.strip()
            m = re.match(r"^cd\s+([^\s;&|]+)$", part)
            if m:
                d = m.group(1).strip("'\"")
                cwd = rel(d) if os.path.isabs(d) else os.path.normpath(os.path.join(cwd, d))
                cwd = "" if cwd in (".", "") else cwd
            elif part:
                parts.append((cwd, part))
        m = HEREDOC.search(line)
        if m:
            term = m.group(1)
    if body:
        bodies.append((cwd, "\n".join(body)))
    return parts, bodies


def under(cwd, path):
    path = path.strip("'\"")
    if not path or path.startswith(("/dev/", "/tmp/", "$", "-", "~")) or any(ch in path for ch in "{}*?$"):
        return None
    if not os.path.isabs(path) and ("$" in cwd or cwd.startswith("~")):
        return None  # relative to a directory we cannot resolve (`cd $TMP`, `cd ~/x`)
    r = rel(path) if os.path.isabs(path) else os.path.normpath(os.path.join(cwd, path))
    return None if os.path.isabs(r) or r.startswith("..") else r


def bash_reads(raw):
    out = []
    for cwd, part in split_shell(raw)[0]:
        m = READ_CMD.match(part)
        if m and not m.group(1).lstrip("+-").isdigit():
            r = under(cwd, m.group(1))
            if r:
                out.append(r)
    return out


def bash_writes(raw):
    """Heuristic: repo paths a shell command writes or deletes."""
    parts, bodies = split_shell(raw)
    out = []
    for cwd, part in parts:
        try:
            tok = shlex.split(part, comments=False, posix=True)
        except ValueError:
            continue
        unquoted = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", " ", part)
        for m in re.finditer(r"(?<![<>&\d])\d?>>?\s*([^\s;&|<>()]+)", unquoted):
            if not m.group(1).startswith("&"):
                out.append((cwd, m.group(1)))
        if not tok:
            continue
        head = tok[0]
        args = [t for t in tok[1:] if not t.startswith("-")]
        if head == "sed" and any(t.startswith("-i") for t in tok[1:]) and args:
            out.append((cwd, args[-1]))
        elif head in ("rm", "tee") and args:
            out.extend((cwd, a) for a in args)
        elif head == "git" and len(tok) > 1 and tok[1] == "rm":
            out.extend((cwd, a) for a in args[1:])
        elif head in ("mv", "cp") and len(args) >= 2:
            out.append((cwd, args[-1]))
    for bcwd, body in bodies:
        names = dict(PY_ASSIGN.findall(body))
        for lit, var in PY_OPEN.findall(body):
            path = lit or names.get(var)
            if path:
                out.append((bcwd, path))
        out.extend((bcwd, p) for p in PY_WRITE_TEXT.findall(body))
    keep = []
    for cwd, p in out:
        r = under(cwd, p)
        if r and r != "/dev/null":
            keep.append(r)
    return keep


# ---------------------------------------------------------------- transcripts

def in_window(ts, since, until):
    return ts is not None and (since is None or ts >= since) and (until is None or ts <= until)


def read_transcript(path, since, until):
    usage = collections.Counter()
    seen = set()
    tools = collections.Counter()
    reads, cmds, writes, sends, tool_ids = [], [], [], [], set()
    timeline = []  # (ts, kind, detail) for the pipeline checks
    denials = 0
    handback = ""
    first = last = model = None
    peak = calls = 0
    cost = 0.0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                d = json.loads(line)
                ts = parse_ts(d.get("timestamp"))
            except (ValueError, TypeError, AttributeError):
                continue
            if not isinstance(d, dict) or d.get("type") not in ("assistant", "user") or not in_window(ts, since, until):
                continue
            first = first or ts
            last = ts
            msg = d.get("message") or {}
            if d["type"] == "user":
                content = msg.get("content")
                if isinstance(content, list):
                    for b in content:
                        if isinstance(b, dict) and b.get("type") == "tool_result" and DENIED in str(b.get("content"))[:400]:
                            denials += 1
                continue
            model = msg.get("model") or model
            rid = d.get("requestId") or msg.get("id")
            u = msg.get("usage")
            if u and rid not in seen:
                seen.add(rid)
                calls += 1
                for key in USAGE_KEYS:
                    usage[key] += u.get(key) or 0
                peak = max(peak, sum((u.get(key) or 0) for key in USAGE_KEYS[:3]))
                p = price_of(msg.get("model") or model)
                if p:
                    cc = u.get("cache_creation") or {}
                    w5 = cc.get("ephemeral_5m_input_tokens")
                    w1 = cc.get("ephemeral_1h_input_tokens")
                    if w5 is None and w1 is None:
                        w5, w1 = u.get("cache_creation_input_tokens") or 0, 0
                    cost += ((u.get("input_tokens") or 0) * p["input"] + (w5 or 0) * p["input"] * 1.25
                             + (w1 or 0) * p["input"] * 2 + (u.get("cache_read_input_tokens") or 0) * p["cache_read"]
                             + (u.get("output_tokens") or 0) * p["output"]) / 1e6
            for b in msg.get("content") or []:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "text" and b.get("text"):
                    timeline.append((ts, "text", b["text"][:2000]))
                    handback = b["text"]
                if b.get("type") != "tool_use":
                    continue
                name, inp = b.get("name"), b.get("input") or {}
                tools[name] += 1
                tool_ids.add(b.get("id"))
                if name == "Read" and inp.get("file_path"):
                    reads.append(rel(inp["file_path"]))
                elif name in WRITE_TOOLS and (inp.get("file_path") or inp.get("notebook_path")):
                    p = rel(inp.get("file_path") or inp.get("notebook_path"))
                    writes.append(p)
                    timeline.append((ts, "write", p))
                elif name == "Bash" and inp.get("command"):
                    c = " ".join(str(inp["command"]).split())
                    cmds.append(c[:160])
                    timeline.append((ts, "bash", c))
                    reads.extend(bash_reads(inp["command"]))
                    for p in bash_writes(inp["command"]):
                        writes.append(p)
                        timeline.append((ts, "write", p))
                elif name == "SendMessage":
                    sends.append(str(inp.get("to", "")))
                elif name == "SubagentHandback":
                    handback = str(inp.get("message", ""))
                elif name in ("Agent", "Task"):
                    timeline.append((ts, "spawn", str(inp.get("subagent_type") or "general-purpose")))
    return {"usage": dict(usage), "calls": calls, "peak_context": peak, "tools": dict(tools),
            "tool_calls": sum(tools.values()), "reads": reads, "cmds": cmds, "writes": writes,
            "sends": sends, "tool_use_ids": tool_ids, "start": first, "end": last, "model": model,
            "cost": cost, "denials": denials, "handback": handback, "timeline": timeline}


def total(u):
    return sum(u.get(key, 0) for key in USAGE_KEYS)


def hit_pct(u):
    inputs = sum(u.get(key, 0) for key in USAGE_KEYS[:3])
    return round(100 * u.get("cache_read_input_tokens", 0) / inputs) if inputs else 0


def load_meta(path):
    meta_path = path[:-6] + ".meta.json"
    if not os.path.isfile(meta_path):
        return {}
    try:
        with open(meta_path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def collect(session_path, since, until):
    main = read_transcript(session_path, since, until)
    main.update(id="main", type="lead", description="lead session", depth=0, parent=None)
    agents = []
    for path in sorted(glob.glob(os.path.join(session_path[:-6], "**", "agent-*.jsonl"), recursive=True)):
        s = read_transcript(path, since, until)
        if s["start"] is None:
            continue
        meta = load_meta(path)
        s.update(id=os.path.basename(path)[6:-6], type=meta.get("agentType", "?"),
                 description=meta.get("description", ""), depth=meta.get("spawnDepth", 1),
                 spawn_tool_use=meta.get("toolUseId"), parent_hint=meta.get("parentAgentId"),
                 model=meta.get("model") or s["model"])
        agents.append(s)
    owners = {t: "main" for t in main["tool_use_ids"]}
    for a in agents:
        owners.update({t: a["id"] for t in a["tool_use_ids"]})
    everyone = [main] + agents
    for a in agents:
        a["parent"] = a.pop("parent_hint", None) or owners.get(a.get("spawn_tool_use"), "?")
        a["continued"] = sum(1 for x in everyone for to in x["sends"] if to and (to == a["id"] or a["id"].startswith(to)))
        a["reasks"] = sorted({p for p in CONFIG["reask_patterns"] if re.search(p, a["handback"] or "", re.I)})
        a["out_of_scope"] = out_of_scope(a)
    agents.sort(key=lambda a: a["start"])
    return main, agents


def out_of_scope(a):
    rule = scope_rule(a["type"])
    if rule is None:
        return []
    allow, deny = rule.get("allow", []), rule.get("deny", [])
    bad = []
    for p in sorted(set(a["writes"])):
        if os.path.isabs(p):
            continue  # outside the repository (scratch dirs, temp files)
        allowed = "*" in allow or matches(p, allow)
        if not allowed or matches(p, deny):
            bad.append(p)
    return bad


# ---------------------------------------------------------------- pipeline checks

def repo_has_insights():
    try:
        out = subprocess.run(["git", "-C", ROOT, "ls-files", "--cached", "--others", "--exclude-standard",
                              "--", "INSIGHTS.md", "*/INSIGHTS.md"], capture_output=True, text=True, check=True)
        return bool(out.stdout.strip())
    except (OSError, subprocess.CalledProcessError):
        pass
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if "INSIGHTS.md" in filenames:
            return True
        if dirpath.count(os.sep) - ROOT.count(os.sep) >= 3:
            dirnames[:] = []
    return False


def is_verify_cmd(c):
    return any(re.search(p, c, re.I) for p in CONFIG["verify_patterns"])


def pipeline_checks(main, agents):
    """Workflow steps the transcript shows as skipped (heuristic, evidence-based)."""
    events = sorted((ev for a in [main] + agents for ev in a["timeline"]), key=lambda e: e[0])
    writes = [(t, p) for t, kind, p in events if kind == "write"]
    bash = [(t, c) for t, kind, c in events if kind == "bash"]
    texts = [(t, c) for t, kind, c in events if kind == "text"]
    code = [(t, p) for t, p in writes if not os.path.isabs(p) and not matches(p, CONFIG["non_code"])]
    impl = [a for a in agents if type_in(a["type"], CONFIG["implementer_types"])]
    if not code:  # writes may have gone undetected (e.g. a generator script): fall back to implementer runs
        code = [(a["start"], "(%s run)" % a["type"]) for a in impl]
    code.sort(key=lambda x: x[0])
    out = []

    def after(ts, pred, seq):
        return any(t >= ts and pred(x) for t, x in seq)

    if code:
        last = code[-1][0]
        out.append(("tests/verification after the last code edit", after(last, is_verify_cmd, bash),
                    "a test, typecheck or lint command after %s (last edit: %s)"
                    % (last.strftime("%H:%M:%S"), code[-1][1])))
        if repo_has_insights():
            first = code[0][0]
            ok = (after(first, lambda c: "append_insight.py" in c, bash)
                  or any("nothing new worth recording" in x and t >= first for t, x in texts)
                  or any(p.endswith("INSIGHTS.md") and t >= first for t, p in writes))
            out.append(("insights wrap-up after code edits", ok,
                        "append_insight.py add, or 'Insights: nothing new worth recording — <reason>'"))
    if impl:
        last_impl = max(a["end"] for a in impl)
        ok = any(type_in(a["type"], CONFIG["reviewer_types"]) and a["start"] >= last_impl for a in agents)
        out.append(("review after the last implementer", ok, " / ".join(CONFIG["reviewer_types"])
                    + " started after %s" % last_impl.strftime("%H:%M:%S")))
    return out


def peak_concurrency(intervals):
    ev = sorted([(s, 1) for s, _ in intervals] + [(e, -1) for _, e in intervals], key=lambda x: (x[0], x[1]))
    cur = best = 0
    for _, step in ev:
        cur += step
        best = max(best, cur)
    return best


def duplicates(agents, key, n=2):
    seen = collections.defaultdict(set)
    for a in agents:
        for item in set(a[key]):
            seen[item].add(a["type"] + ":" + a["id"][:6])
    return sorted(((i, len(s)) for i, s in seen.items() if len(s) >= n), key=lambda r: -r[1])


def summary(main, agents):
    everyone = [main] + agents
    grand, sub = collections.Counter(), collections.Counter()
    for a in everyone:
        grand.update(a["usage"])
    for a in agents:
        sub.update(a["usage"])
    starts = [a["start"] for a in everyone if a["start"]]
    ends = [a["end"] for a in everyone if a["end"]]
    wall = int((max(ends) - min(starts)).total_seconds()) if starts else 0
    busy = sum((a["end"] - a["start"]).total_seconds() for a in agents)
    return {
        "agents": len(agents), "nested": sum(1 for a in agents if a["depth"] >= 2),
        "peak_parallel": peak_concurrency([(a["start"], a["end"]) for a in agents]) if agents else 0,
        "avg_parallel": round(busy / wall, 2) if wall else 0, "wall_s": wall,
        "tokens_total": total(grand), "tokens_fresh": total(grand) - grand["cache_read_input_tokens"],
        "subagent_tokens": total(sub), "lead_tokens": total(main["usage"]), "usage": dict(grand),
        "cache_hit_pct": hit_pct(grand), "cost": round(sum(a["cost"] for a in everyone), 2),
        "tool_calls": sum(a["tool_calls"] for a in everyone),
        "dup_reads": duplicates(agents, "reads")[:15], "dup_cmds": duplicates(everyone, "cmds")[:10],
        "checks": pipeline_checks(main, agents),
    }


# ---------------------------------------------------------------- output

def k(n):
    return "%.2fM" % (n / 1e6) if n >= 1e6 else "%.0fk" % (n / 1e3) if n >= 1e3 else str(n)


def dur(a):
    s = int((a["end"] - a["start"]).total_seconds()) if a["start"] else 0
    return "%dm%02ds" % (s // 60, s % 60)


def cell(s):
    return str(s).replace("|", "/").replace("\n", " ").strip()


def print_markdown(path, main, agents, r):
    print("# workflow-retro — session %s\n" % os.path.basename(path)[:8])
    print("Agents %d (nested %d) · parallel peak %d, avg %s · wall %dm · tokens %s (fresh %s; lead %s, subagents %s)"
          " · cache hit %d%% · cost ≈ $%.2f · tool calls %d\n"
          % (r["agents"], r["nested"], r["peak_parallel"], r["avg_parallel"], r["wall_s"] // 60, k(r["tokens_total"]),
             k(r["tokens_fresh"]), k(r["lead_tokens"]), k(r["subagent_tokens"]), r["cache_hit_pct"], r["cost"],
             r["tool_calls"]))
    print("| # | Start | Agent | Description | Model | Dur | Calls | Tokens | Hit | Cost ≈ | Peak ctx | Tools | Flags |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for i, a in enumerate([main] + agents):
        flags = []
        if a.get("continued"):
            flags.append("continued×%d" % a["continued"])
        if a.get("reasks"):
            flags.append("re-ask")
        if a["denials"]:
            flags.append("denied×%d" % a["denials"])
        if a.get("out_of_scope"):
            flags.append("scope×%d" % len(a["out_of_scope"]))
        if a["depth"] >= 2:
            flags.append("nested←%s" % str(a["parent"])[:6])
        top = ", ".join("%s×%d" % (n, c) for n, c in sorted(a["tools"].items(), key=lambda x: -x[1])[:3])
        print("| %d | %s | %s | %s | %s | %s | %d | %s | %d%% | $%.2f | %s | %s | %s |"
              % (i, a["start"].strftime("%H:%M") if a["start"] else "-", cell(a["type"]), cell(a["description"][:34]),
                 (a["model"] or "-").replace("claude-", ""), dur(a), a["calls"], k(total(a["usage"])),
                 hit_pct(a["usage"]), a["cost"], k(a["peak_context"]), cell(top) or "-", " ".join(flags) or "-"))
    print("\n## Pipeline checks\n")
    for name, ok, hint in r["checks"] or [("no code edits in window", True, "")]:
        print("- %s %s%s" % ("ok     " if ok else "MISSING", name, "" if ok else " — expected: " + hint))
    issues = [(a, kind, v) for a in agents for kind, v in (("re-ask", a["reasks"]), ("out of scope", a["out_of_scope"])) if v]
    print("\n## Re-asks and scope\n")
    for a, kind, v in issues:
        print("- %s «%s» — %s: %s" % (a["type"], a["description"][:40], kind, ", ".join(v)[:200]))
    if not issues:
        print("- none")
    print("\n## Files read by ≥ 2 subagents (context-pack / pre-load candidates)\n")
    for p, n in r["dup_reads"] or [("none", 0)]:
        print("- %s — %d agents" % (p, n) if n else "- none")
    print("\n## Commands run by ≥ 2 agents (cache / cite candidates)\n")
    for c, n in r["dup_cmds"] or [("none", 0)]:
        print("- `%s` — %d agents" % (c, n) if n else "- none")


def append_ledger(args, r, path):
    ledger = os.path.abspath(args.ledger) if args.ledger else os.path.join(ROOT, "docs", "retros", "ledger.md")
    if os.path.isfile(ledger):
        with open(ledger, encoding="utf-8") as fh:
            text = fh.read()
        if LEDGER_HEADER.splitlines()[0] not in text:
            sys.exit("%s has no ledger header (or an old one) — fix the header first; nothing written" % ledger)
        prefix = "" if text.endswith("\n") or not text else "\n"
    else:
        os.makedirs(os.path.dirname(ledger), exist_ok=True)
        prefix = LEDGER_TITLE + LEDGER_HEADER
    row = ("| %s | %s | %s | %d (%d) | %d | %dm | %s | %s | %d%% | $%.2f | %d | %s | %s |\n"
           % (dt.date.today().isoformat(), cell(args.label), os.path.basename(path)[:8], r["agents"], r["nested"],
              r["peak_parallel"], r["wall_s"] // 60, k(r["tokens_total"]), k(r["tokens_fresh"]), r["cache_hit_pct"],
              r["cost"], r["tool_calls"], cell(args.verdict), cell(args.actions)))
    with open(ledger, "a", encoding="utf-8") as fh:
        fh.write(prefix + row)
    print("appended to %s:" % rel(ledger))
    print(row, end="")


def main_cli():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--session", help="session id (or prefix) or .jsonl path (default: newest = current session)")
    p.add_argument("--since", type=cli_ts, help="ISO timestamp, e.g. 2026-10-01T12:00:00Z (UTC if no offset)")
    p.add_argument("--until", type=cli_ts)
    p.add_argument("--projects-dir", help="directory holding this repo's session .jsonl files "
                                          "(default: ~/.claude/projects/<encoded repo path>)")
    p.add_argument("--json", action="store_true")
    p.add_argument("--append-ledger", action="store_true")
    p.add_argument("--ledger", help="ledger file (default: <repo root>/docs/retros/ledger.md)")
    p.add_argument("--label", default="")
    p.add_argument("--verdict", default="")
    p.add_argument("--actions", default="")
    args = p.parse_args()
    if args.append_ledger and not args.label:
        sys.exit("--append-ledger needs --label")
    pdir = os.path.expanduser(args.projects_dir) if args.projects_dir else default_projects_dir()
    path = resolve_session(args.session, pdir)
    main, agents = collect(path, args.since, args.until)
    if len(agents) < 2:
        print("workflow-retro: %d subagent(s) in the window — nothing to compare, retro skipped." % len(agents))
        return
    r = summary(main, agents)
    if args.append_ledger:
        append_ledger(args, r, path)
        return
    if args.json:
        drop = ("tool_use_ids", "reads", "cmds", "sends", "timeline", "handback", "writes")

        def slim(a):
            return {x: (v.isoformat() if isinstance(v, dt.datetime) else v) for x, v in a.items() if x not in drop}

        print(json.dumps({"session": path, "summary": r, "agents": [slim(a) for a in [main] + agents]},
                         indent=1, default=str, ensure_ascii=False))
    else:
        print_markdown(path, main, agents, r)


if __name__ == "__main__":
    main_cli()
