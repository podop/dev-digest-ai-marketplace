#!/usr/bin/env python3
"""Append-only writer for INSIGHTS.md files. Run it from the repository root.

  append_insight.py route <path> [<path> ...]               # which INSIGHTS.md a changed path belongs to
  append_insight.py add <target> "<Section>" "<entry text>"  # adds one dated bullet
  append_insight.py dupes <target> "<entry text>"            # lists similar existing bullets
  append_insight.py verify <target>                          # no committed line removed vs git HEAD

<target> is a path to an INSIGHTS.md file (or INSIGHTS-<topic>.md), or a directory meaning
<dir>/INSIGHTS.md ('.' = the repository root). It must lie inside the current directory.

Guarantees for `add`: the file only ever grows — the new bullet becomes the first bullet of
<Section>, and every pre-existing line is checked to still be present, in order, before the
file is written. A missing file is created with the standard section skeleton (the directory
must exist). Refuses near-duplicates (exit 3) and unknown sections (exit 2).
Exit codes: 0 ok · 2 usage/input error · 3 similar entry exists · 4 safety check · 5 verify violation.
Requires Python 3.9+, stdlib only.
"""
import datetime
import os
import re
import subprocess
import sys
from pathlib import Path

SECTIONS = (
    ("What Works", "<where>: <approach> → use when <situation>"),
    ("What Doesn't Work", "<where>: <approach> fails because <cause> → do <instead>"),
    ("Codebase Patterns", "<where>: <rule> — <why>"),
    ("Tool & Library Notes", "<lib@version>: <quirk> → <workaround>"),
    ("Recurring Errors & Fixes", "`<error text>` in <where> → cause: <x> → fix: <y>"),
    ("Session Notes", "<what changed>; left: <what's open>"),
    ("Open Questions", "<question> — seen in <where>"),
)
SECTION_NAMES = tuple(name for name, _ in SECTIONS)
FILE_NAME = re.compile(r"^INSIGHTS(-[A-Za-z0-9_.-]+)?\.md$")
# A directory with one of these is a package (monorepo routing).
MANIFESTS = ("package.json", "pyproject.toml", "setup.py", "setup.cfg", "go.mod", "pom.xml",
             "build.gradle", "build.gradle.kts", "Cargo.toml", "composer.json", "Gemfile",
             "mix.exs", "deno.json", "pubspec.yaml", "Package.swift")
# Share of the new entry's words already present in one existing bullet.
DUPLICATE_THRESHOLD = 0.6
STOPWORDS = set("a an the to of in on for and or is are be it this that with as at by from not use".split())


def fail(code, msg):
    print("ERROR: %s" % msg, file=sys.stderr)
    sys.exit(code)


def cwd():
    return Path.cwd().resolve()


def display(path):
    try:
        return path.relative_to(cwd()).as_posix()
    except ValueError:
        return str(path)


def skeleton(path):
    owner = path.parent.name if path.parent != cwd() else cwd().name
    lines = ["# Engineering insights — %s" % owner, "",
             "<!-- Append-only memory for the next agent. Add entries with the engineering-insights skill;",
             "     never edit or delete existing lines — pruning is a human review. -->", ""]
    for name, shape in SECTIONS:
        lines += ["## %s" % name, "<!-- %s -->" % shape, ""]
    return lines[:-1]


def resolve(target, must_exist=True):
    path = Path(target)
    path = (path if path.is_absolute() else cwd() / path).resolve()
    if path.is_dir() or not path.suffix:
        path = path / "INSIGHTS.md"
    try:
        path.relative_to(cwd())
    except ValueError:
        fail(2, "%s is outside the current directory — run from the repository root" % path)
    if not FILE_NAME.match(path.name):
        fail(2, "target must be an INSIGHTS.md (or INSIGHTS-<topic>.md) file or a directory, got %s" % target)
    if not path.parent.is_dir():
        fail(2, "directory %s does not exist" % display(path.parent))
    if must_exist and not path.is_file():
        fail(2, "%s not found" % display(path))
    return path


def is_package(d):
    return d.is_dir() and any((d / m).is_file() for m in MANIFESTS)


def route(path):
    """<pkg>/INSIGHTS.md for a top-level package (or <dir>/<pkg> under a container dir without
    its own manifest, e.g. packages/<pkg>); the root INSIGHTS.md otherwise."""
    root = cwd()
    p = Path(path)
    p = (p if p.is_absolute() else root / p).resolve()
    try:
        parts = p.relative_to(root).parts
    except ValueError:
        return None
    if len(parts) >= 2:
        top = root / parts[0]
        if is_package(top):
            return top / "INSIGHTS.md"
        if len(parts) >= 3 and is_package(top / parts[1]):
            return top / parts[1] / "INSIGHTS.md"
    return root / "INSIGHTS.md"


def words(text):
    text = re.sub(r"^\s*-\s*\d{4}-\d{2}-\d{2}\s*[—-]\s*", "", text)
    return {w for w in re.findall(r"[a-z0-9_./-]{2,}", text.lower()) if w not in STOPWORDS}


def similar_bullets(lines, entry):
    new = words(entry)
    if not new:
        return []
    hits = []
    for line in lines:
        if line.lstrip().startswith("- "):
            overlap = len(new & words(line)) / len(new)
            if overlap >= DUPLICATE_THRESHOLD:
                hits.append((overlap, line.strip()))
    return sorted(hits, reverse=True)


def is_subsequence(old, new):
    it = iter(new)
    return all(any(line == candidate for candidate in it) for line in old)


def cmd_route(paths):
    for p in paths:
        target = route(p)
        print("%s -> %s%s" % (p, display(target) if target else "(outside the repository)",
                              "" if not target or target.is_file() else "  (new file)"))


def cmd_add(target, section, entry):
    if section not in SECTION_NAMES:
        fail(2, "unknown section '%s', expected one of: %s" % (section, "; ".join(SECTION_NAMES)))
    entry = " ".join(entry.split())
    if not entry:
        fail(2, "empty entry")
    path = resolve(target, must_exist=False)
    created = not path.is_file()
    old = skeleton(path) if created else path.read_text(encoding="utf-8").splitlines()

    dupes = similar_bullets(old, entry)
    if dupes:
        print("DUPLICATE? Not written. Similar existing entries:")
        for score, line in dupes:
            print("  %3.0f%%  %s" % (score * 100, line))
        sys.exit(3)

    try:
        header = old.index("## %s" % section)
    except ValueError:
        fail(2, "section '## %s' missing in %s — restore the section header, don't improvise" % (section, display(path)))
    insert_at = header + 1
    while insert_at < len(old) and old[insert_at].lstrip().startswith("<!--"):
        insert_at += 1

    bullet = "- %s — %s" % (datetime.date.today().isoformat(), entry)
    new = old[:insert_at] + [bullet] + old[insert_at:]
    if not is_subsequence(old, new) or len(new) != len(old) + 1:
        fail(4, "safety check failed: an existing line would change — nothing written")
    path.write_text("\n".join(new) + "\n", encoding="utf-8")
    print("%s%s › %s:\n%s" % ("CREATED and ADDED to " if created else "ADDED to ", display(path), section, bullet))


def cmd_dupes(target, entry):
    path = resolve(target, must_exist=False)
    hits = similar_bullets(path.read_text(encoding="utf-8").splitlines(), entry) if path.is_file() else []
    for score, line in hits:
        print("%3.0f%%  %s" % (score * 100, line))
    if not hits:
        print("no similar entries" + ("" if path.is_file() else " (%s does not exist yet)" % display(path)))


def git(*args):
    return subprocess.run(["git"] + list(args), capture_output=True, text=True, cwd=str(cwd()))


def cmd_verify(target):
    path = resolve(target, must_exist=False)
    top = git("rev-parse", "--show-toplevel")
    if top.returncode != 0:
        print("OK: not a git repository — nothing to compare (%s)" % display(path))
        return
    rel = os.path.relpath(str(path), os.path.realpath(top.stdout.strip())).replace(os.sep, "/")
    shown = git("show", "HEAD:%s" % rel)
    if shown.returncode != 0:
        print("OK: %s not in HEAD yet — nothing to compare" % display(path))
        return
    head = shown.stdout.splitlines()
    now = path.read_text(encoding="utf-8").splitlines() if path.is_file() else []
    missing = [line for line in head if line not in now]
    if missing or not is_subsequence(head, now):
        print("VIOLATION: %s lost or reordered committed lines:" % display(path))
        for line in missing:
            print("  - %s" % line)
        print("Restore with: git checkout HEAD -- %s  (then re-add only the new bullets)" % display(path))
        sys.exit(5)
    print("OK: %s only grew (+%d lines vs HEAD)" % (display(path), len(now) - len(head)))


def main(args):
    if len(args) >= 2 and args[0] == "route":
        cmd_route(args[1:])
    elif len(args) == 4 and args[0] == "add":
        cmd_add(*args[1:])
    elif len(args) == 3 and args[0] == "dupes":
        cmd_dupes(*args[1:])
    elif len(args) == 2 and args[0] == "verify":
        cmd_verify(args[1])
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main(sys.argv[1:])
