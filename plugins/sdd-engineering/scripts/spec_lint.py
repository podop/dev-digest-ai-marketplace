#!/usr/bin/env python3
"""Deterministic checks for a spec written to the spec-creator template.

Usage:
  python3 spec_lint.py [--require-ac-coverage] SPEC.md [SPEC.md ...]

Errors (exit 1):
  - header line `Spec: <title> · Status: <draft|ready-for-planning> · ...` missing or with
    an unknown status;
  - a required section is missing (Goal, Scope, Functional requirements, Acceptance
    criteria, Traceability, Open questions);
  - no acceptance criteria at all;
  - an AC without `Traces:` or `Verify:`, with an unknown verify method, or tracing an
    unknown id;
  - duplicate ids;
  - Mermaid C4 diagrams (they do not render on GitHub).

Warnings (exit 0):
  - an FR/EC/NFR that no AC traces (an error with --require-ac-coverage);
  - vague words outside code blocks.

Struck-through items (`- ~~FR3 ...~~`) are dropped requirements and are not checked.
Python 3.9+, standard library only.
"""
import argparse
import re
import sys

REQUIRED = ("Goal", "Scope", "Functional requirements", "Acceptance criteria", "Traceability",
            "Open questions")
STATUSES = {"draft", "ready-for-planning"}
VERIFY = {"unit", "integration", "component", "e2e", "manual"}
HEADER = re.compile(r"^Spec: .*?Status:\s*([\w-]+)", re.M)
ITEM = re.compile(r"^- (~~)?\s*(FR|EC|NFR|AC)(\d+)\b")
ID = re.compile(r"\b(?:FR|EC|NFR)\d+\b")
VAGUE = re.compile(
    r"\b(should probably|user-friendly|etc\.|as needed|TBD|fast|quickly|seamless(?:ly)?)(?![\w-])",
    re.I)


def _sort_key(key):
    return re.sub(r"\d", "", key), int(re.sub(r"\D", "", key))


def lint(path, require_ac_coverage=False):
    """Return (errors, warnings, coverage) for one spec file.

    coverage is (covered, total) over live FR/EC/NFR items.
    """
    errors, warnings = [], []
    try:
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
    except OSError as exc:
        return [f"cannot read file: {exc}"], [], (0, 0)
    lines = text.split("\n")

    header = HEADER.search(text)
    if not header:
        errors.append("header line `Spec: <title> · Status: <status> · Date: <date>` missing")
    elif header.group(1) not in STATUSES:
        errors.append(f"unknown status {header.group(1)!r}; use one of {sorted(STATUSES)}")
    headings = [line for line in lines if line.startswith("## ")]
    for name in REQUIRED:
        if not any(name.lower() in h.lower() for h in headings):
            errors.append(f"section missing: {name}")

    defined, acs, fence, block = {}, {}, None, None
    for n, line in enumerate(lines, 1):
        if line.startswith("```"):
            if fence is None:
                fence = line[3:].strip()
                if fence == "mermaid":
                    nxt = next((rest.strip() for rest in lines[n:] if rest.strip()), "")
                    if nxt.startswith("C4"):
                        errors.append(f"line {n + 1}: Mermaid C4 syntax does not render on GitHub")
            else:
                fence = None
            continue
        if fence is not None:
            continue
        for m in VAGUE.finditer(line):
            warnings.append(f"line {n}: vague word '{m.group(1)}'")
        m = ITEM.match(line)
        if m:
            struck, kind, num = m.group(1), m.group(2), m.group(3)
            key = f"{kind}{num}"
            if key in defined:
                errors.append(f"line {n}: duplicate id {key} (first at line {defined[key][0]})")
            defined[key] = (n, bool(struck))
            block = key if kind == "AC" and not struck else None
            if block:
                acs[block] = {"line": n, "text": line}
            continue
        if block and (line.startswith("  ") or not line.strip()) and not line.startswith("## "):
            acs[block]["text"] += "\n" + line
        else:
            block = None

    traced = set()
    for ac, info in acs.items():
        body = info["text"]
        tm = re.search(r"Traces:\s*([^·\n]+)", body)
        vm = re.search(r"Verify:\s*([^\n]+)", body)
        if not tm:
            errors.append(f"line {info['line']}: {ac} has no `Traces:`")
        else:
            for ref in ID.findall(tm.group(1)):
                if ref not in defined:
                    errors.append(f"line {info['line']}: {ac} traces unknown {ref}")
                traced.add(ref)
        if not vm:
            errors.append(f"line {info['line']}: {ac} has no `Verify:`")
        else:
            methods = {w.strip().lower() for w in re.split(r"[|,/]", vm.group(1)) if w.strip()}
            bad = methods - VERIFY
            if bad or not methods:
                errors.append(f"line {info['line']}: {ac} Verify must be one of {sorted(VERIFY)}, "
                              f"got {vm.group(1).strip()!r}")
    if not acs:
        errors.append("no acceptance criteria (`- AC1 ...`)")

    requirements = sorted((k for k, (_, struck) in defined.items()
                           if not struck and not k.startswith("AC")), key=_sort_key)
    uncovered = [k for k in requirements if k not in traced]
    for key in uncovered:
        msg = f"line {defined[key][0]}: {key} is not traced by any AC"
        if require_ac_coverage:
            errors.append(msg)
        else:
            warnings.append(msg + " (add an AC; an error with --require-ac-coverage)")
    return errors, warnings, (len(requirements) - len(uncovered), len(requirements))


def main(argv=None):
    parser = argparse.ArgumentParser(
        description=__doc__.strip().split("\n")[0],
        epilog="Exit codes: 0 clean or warnings only, 1 errors, 2 usage error.")
    parser.add_argument("specs", nargs="+", metavar="SPEC.md", help="spec file(s) to check")
    parser.add_argument("--require-ac-coverage", action="store_true",
                        help="treat an FR/EC/NFR without an AC as an error")
    args = parser.parse_args(argv)

    failed = False
    for path in args.specs:
        errors, warnings, (covered, total) = lint(path, args.require_ac_coverage)
        status = "FAIL" if errors else "ok"
        print(f"{status} {path} — {len(errors)} error(s), {len(warnings)} warning(s); "
              f"AC coverage {covered}/{total} FR/EC/NFR")
        for e in errors:
            print(f"  error   {e}")
        for w in warnings:
            print(f"  warning {w}")
        failed |= bool(errors)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
