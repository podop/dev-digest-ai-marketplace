"""Self-test for spec_lint.py. Run: python3 -m unittest discover -s scripts/tests"""
import os
import subprocess
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
LINT = os.path.join(os.path.dirname(HERE), "spec_lint.py")
FIXTURES = os.path.join(HERE, "fixtures")


def run(*args):
    return subprocess.run([sys.executable, LINT, *args], stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, universal_newlines=True)


class SpecLintTest(unittest.TestCase):
    def test_covered_spec_is_clean(self):
        result = run(os.path.join(FIXTURES, "covered.md"))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("0 error(s), 0 warning(s)", result.stdout)

    def test_uncovered_requirement_is_a_warning_by_default(self):
        result = run(os.path.join(FIXTURES, "uncovered.md"))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("warning line", result.stdout)
        self.assertIn("FR2 is not traced by any AC", result.stdout)

    def test_uncovered_requirement_fails_with_require_ac_coverage(self):
        result = run("--require-ac-coverage", os.path.join(FIXTURES, "uncovered.md"))
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("error   line", result.stdout)
        self.assertIn("FR2 is not traced by any AC", result.stdout)


if __name__ == "__main__":
    unittest.main()
