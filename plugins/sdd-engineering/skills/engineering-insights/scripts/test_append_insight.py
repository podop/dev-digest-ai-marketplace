#!/usr/bin/env python3
"""Tests for append_insight.py. Run: python3 -B test_append_insight.py (stdlib only)."""
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "append_insight.py")


class AppendInsightTest(unittest.TestCase):
    def setUp(self):
        self.repo = tempfile.mkdtemp(prefix="insights-test-")
        os.makedirs(os.path.join(self.repo, "api", "src"))
        with open(os.path.join(self.repo, "api", "package.json"), "w") as fh:
            fh.write("{}")
        os.makedirs(os.path.join(self.repo, "packages", "web", "src"))
        with open(os.path.join(self.repo, "packages", "web", "pyproject.toml"), "w") as fh:
            fh.write("")
        os.makedirs(os.path.join(self.repo, "scripts"))

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def run_script(self, *args):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
        return subprocess.run([sys.executable, SCRIPT] + list(args), cwd=self.repo,
                              capture_output=True, text=True, env=env)

    def read(self, rel):
        with open(os.path.join(self.repo, rel), encoding="utf-8") as fh:
            return fh.read().splitlines()

    def git(self, *args):
        subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@example.com",
                        "-c", "commit.gpgsign=false"] + list(args),
                       cwd=self.repo, check=True, capture_output=True)

    def test_add_creates_skeleton_and_inserts_first_in_section(self):
        r = self.run_script("add", "api", "What Works", "api/src/db: run migrations per file → use when adding indexes")
        self.assertEqual(r.returncode, 0, r.stderr)
        lines = self.read("api/INSIGHTS.md")
        for section in ("What Works", "What Doesn't Work", "Codebase Patterns", "Tool & Library Notes",
                        "Recurring Errors & Fixes", "Session Notes", "Open Questions"):
            self.assertIn("## " + section, lines)
        r = self.run_script("add", "api/INSIGHTS.md", "What Works", "zod@3: z.coerce.date accepts empty strings → refine")
        self.assertEqual(r.returncode, 0, r.stderr)
        lines = self.read("api/INSIGHTS.md")
        i = lines.index("## What Works")
        self.assertTrue(lines[i + 1].startswith("<!--"))
        self.assertIn("zod@3", lines[i + 2])
        self.assertIn("run migrations", lines[i + 3])

    def test_existing_lines_are_kept(self):
        self.run_script("add", ".", "Codebase Patterns", "scripts/release.sh: tags before publishing — CI reads the tag")
        before = self.read("INSIGHTS.md")
        self.run_script("add", ".", "Open Questions", "is the nightly job idempotent? — seen in scripts/nightly.sh")
        after = self.read("INSIGHTS.md")
        self.assertEqual(len(after), len(before) + 1)
        it = iter(after)
        self.assertTrue(all(any(line == c for c in it) for line in before))

    def test_duplicate_exits_3_and_writes_nothing(self):
        self.run_script("add", "api", "What Doesn't Work", "api/src/jobs: retry loop without backoff floods the queue → use the scheduler")
        before = self.read("api/INSIGHTS.md")
        r = self.run_script("add", "api", "What Works", "api/src/jobs: retry loop without backoff floods the queue")
        self.assertEqual(r.returncode, 3)
        self.assertIn("DUPLICATE?", r.stdout)
        self.assertEqual(self.read("api/INSIGHTS.md"), before)
        r = self.run_script("dupes", "api", "retry loop without backoff floods the queue")
        self.assertIn("retry loop", r.stdout)

    def test_rejects_bad_input(self):
        self.assertEqual(self.run_script("add", "api", "Random", "x: y").returncode, 2)
        self.assertEqual(self.run_script("add", "api", "What Works", "   ").returncode, 2)
        self.assertEqual(self.run_script("add", "missing-dir", "What Works", "x: y").returncode, 2)
        self.assertEqual(self.run_script("add", "api/README.md", "What Works", "x: y").returncode, 2)
        self.assertEqual(self.run_script("add", "../outside", "What Works", "x: y").returncode, 2)
        self.assertFalse(os.path.exists(os.path.join(self.repo, "api", "INSIGHTS.md")))

    def test_route(self):
        r = self.run_script("route", "api/src/server.ts", "packages/web/src/app.py", "scripts/x.sh", "README.md")
        self.assertEqual(r.returncode, 0, r.stderr)
        out = r.stdout
        self.assertIn("api/src/server.ts -> api/INSIGHTS.md", out)
        self.assertIn("packages/web/src/app.py -> packages/web/INSIGHTS.md", out)
        self.assertIn("scripts/x.sh -> INSIGHTS.md", out)
        self.assertIn("README.md -> INSIGHTS.md", out)

    @unittest.skipIf(shutil.which("git") is None, "git not installed")
    def test_verify(self):
        self.git("init", "-q")
        self.run_script("add", "api", "Session Notes", "added the import job; left: retries")
        r = self.run_script("verify", "api")
        self.assertEqual(r.returncode, 0)
        self.assertIn("not in HEAD", r.stdout)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", "init")
        self.run_script("add", "api", "Open Questions", "does the import job need a lock? — seen in api/src/jobs")
        r = self.run_script("verify", "api")
        self.assertEqual(r.returncode, 0, r.stdout)
        self.assertIn("only grew (+1 lines", r.stdout)
        path = os.path.join(self.repo, "api", "INSIGHTS.md")
        lines = [line for line in self.read("api/INSIGHTS.md") if "added the import job" not in line]
        with open(path, "w", encoding="utf-8") as fh:
            fh.write("\n".join(lines) + "\n")
        r = self.run_script("verify", "api")
        self.assertEqual(r.returncode, 5)
        self.assertIn("VIOLATION", r.stdout)


if __name__ == "__main__":
    unittest.main()
