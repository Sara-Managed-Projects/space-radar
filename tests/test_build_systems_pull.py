"""Offline refresh acceptance: changed numbers, independent dates, and atomic refusal."""

import csv
import importlib.util
import io
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))


def load(name):
    spec = importlib.util.spec_from_file_location(
        name.replace("-", "_"), ROOT / "scripts" / f"{name}.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class RefreshTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for directory in ("registry", "site/data", "scripts", "site/js", "site/vendor"):
            shutil.copytree(ROOT / directory, self.root / directory, dirs_exist_ok=True)
        (self.root / "tests").mkdir()
        shutil.copy(
            ROOT / "tests/test_systems_table.mjs",
            self.root / "tests/test_systems_table.mjs",
        )
        self.pull = load("build-exoplanets")
        self.pull.ROOT = self.root
        self.pull.OUT = self.root / "site/data/exoplanets.csv"
        self.pull.SIDE = self.root / "registry/systems-columns.csv"
        self.before = {
            p: p.read_bytes()
            for p in [
                self.pull.OUT,
                self.pull.SIDE,
                self.root / "registry/systems-generated.yaml",
            ]
        }
        self.fixture = self.root / "tap.csv"
        self.rows = list(
            csv.DictReader(
                io.StringIO((ROOT / "tests/fixtures/systems-tap.csv").read_text())
            )
        )

    def write_fixture(self):
        with self.fixture.open("w") as stream:
            writer = csv.DictWriter(stream, fieldnames=self.rows[0].keys())
            writer.writeheader()
            writer.writerows(self.rows)

    def run_pull(self):
        self.write_fixture()
        with patch.object(self.pull, "pull", return_value=self.fixture):
            self.assertEqual(self.pull.main(["--systems-only", "2026-10-25"]), 0)

    def test_refresh_and_offline_generation(self):
        planet = next(r for r in self.rows if r["pl_name"] == "Kepler-186 f")
        planet["pl_rade"] = "1.25"
        self.run_pull()
        self.assertEqual(self.pull.OUT.read_bytes(), self.before[self.pull.OUT])
        for script in ("build-systems.py", "gen_systems_more_js.py"):
            subprocess.run(
                ["python3", str(self.root / "scripts" / script)],
                check=True,
                capture_output=True,
            )
        doc = yaml.safe_load(
            (self.root / "registry/systems-generated.yaml").read_text()
        )
        self.assertEqual(doc["as_of"], "2026-10-25")
        system = next(s for s in doc["systems"] if s["id"] == "kepler-186")
        self.assertEqual(
            next(p for p in system["planets"] if p["id"] == "exo-kepler-186-f")[
                "radius_earths"
            ],
            1.25,
        )
        self.assertIn(
            "2026-10-25", (self.root / "site/js/data/systems-table.js").read_text()
        )
        subprocess.run(
            ["python3", str(self.root / "scripts/gen_systems_more_js.py"), "--check"],
            check=True,
            capture_output=True,
        )
        subprocess.run(
            ["node", str(self.root / "tests/test_systems_table.mjs")],
            check=True,
            capture_output=True,
        )

    def test_binary_drift_writes_nothing(self):
        for row in self.rows:
            if row["hostname"] == "Kepler-16":
                row["st_teff"] = "99999"
        self.assert_refused()

    def assert_refused(self):
        with self.assertRaises(SystemExit):
            self.run_pull()
        for path, content in self.before.items():
            self.assertEqual(path.read_bytes(), content)

    def test_new_planet_writes_nothing(self):
        self.rows.append(dict(self.rows[0], pl_name="A new planet"))
        self.assert_refused()

    def test_missing_host_writes_nothing(self):
        host = self.rows[0]["hostname"]
        self.rows = [r for r in self.rows if r["hostname"] != host]
        self.assert_refused()

    def test_no_period_writes_nothing(self):
        host = self.rows[0]["hostname"]
        for row in self.rows:
            if row["hostname"] == host:
                row["pl_orbper"] = ""
        self.assert_refused()


class WorkflowTest(unittest.TestCase):
    def test_schedule_and_scope(self):
        workflow = yaml.load(
            (ROOT / ".github/workflows/star-systems.yml").read_text(),
            Loader=yaml.BaseLoader,
        )
        self.assertEqual(workflow["on"]["schedule"][0]["cron"], "41 6 * * 3")
        self.assertIn("workflow_dispatch", workflow["on"])
        job = workflow["jobs"]["regenerate"]
        self.assertEqual(
            job["if"], "github.repository == 'Sara-Managed-Projects/space-radar'"
        )
        self.assertEqual(job["steps"][0]["with"]["ref"], "main")
        publish = next(
            s["run"]
            for s in job["steps"]
            if s.get("name", "").startswith("Open or update")
        )
        self.assertNotIn("git push origin main", publish)
        self.assertIn("gh workflow run ci.yml", publish)

    def test_issue_deduplicates_and_recovers(self):
        import hashlib
        import json

        issue = load("star_systems_issue")
        marker = "<!-- star-systems: " + hashlib.sha256(b"failure").hexdigest() + " -->"
        existing = json.dumps([{"number": 12, "title": issue.TITLE}])
        for previous, comments in [(marker, 0), ("older error", 1)]:
            with (
                patch.dict("os.environ", PULL_OK="false"),
                patch.object(issue.Path, "read_text", return_value="failure"),
                patch.object(issue.Path, "write_text"),
                patch.object(
                    issue,
                    "gh",
                    side_effect=[
                        existing,
                        json.dumps({"body": previous, "comments": []}),
                        "",
                    ],
                ) as gh,
            ):
                issue.main()
                self.assertEqual(
                    sum(call.args[1] == "comment" for call in gh.call_args_list),
                    comments,
                )
        with (
            patch.dict("os.environ", PULL_OK="true", DATE="2026-10-25"),
            patch.object(issue.Path, "exists", return_value=True),
            patch.object(issue, "gh", side_effect=[existing, "", ""]) as gh,
        ):
            issue.main()
            self.assertEqual(gh.call_args_list[-1].args, ("issue", "close", "12"))


if __name__ == "__main__":
    unittest.main()
