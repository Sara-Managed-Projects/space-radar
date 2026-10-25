"""Keep one refresh failure issue; report only changed errors and recovery."""

import hashlib
import json
import os
import subprocess
from pathlib import Path

TITLE = "Star systems did not re-sync"


def gh(*args):
    return subprocess.check_output(["gh", *args], text=True)


def main():
    issues = json.loads(
        gh(
            "issue",
            "list",
            "--state",
            "open",
            "--search",
            f'"{TITLE}" in:title',
            "--limit",
            "100",
            "--json",
            "number,title",
        )
    )
    number = next((str(i["number"]) for i in issues if i["title"] == TITLE), None)
    if os.environ["PULL_OK"] == "true":
        if number and Path("/tmp/star-systems-pr-ready").exists():
            gh(
                "issue",
                "comment",
                number,
                "--body",
                f"Pulled {os.environ['DATE']}; the refresh pull request is ready.",
            )
            gh("issue", "close", number)
        return
    error = (
        Path("/tmp/star-systems-error.log").read_text()
        or Path("/tmp/star-systems.log").read_text()
    )
    marker = f"<!-- star-systems: {hashlib.sha256(error.encode()).hexdigest()} -->"
    body = f"The previous systems date is unchanged.\n\n```\n{error[-20000:]}\n```\n{marker}"
    report = Path("/tmp/star-systems-issue.md")
    report.write_text(body)
    if number:
        issue = json.loads(gh("issue", "view", number, "--json", "body,comments"))
        previous = [issue["body"]] + [c["body"] for c in issue["comments"]]
        latest = next((b for b in reversed(previous) if "<!-- star-systems:" in b), "")
        if marker not in latest:
            gh("issue", "comment", number, "--body-file", str(report))
    else:
        gh(
            "issue",
            "create",
            "--title",
            TITLE,
            "--label",
            "ci",
            "--body-file",
            str(report),
        )


if __name__ == "__main__":
    main()
