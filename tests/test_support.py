#!/usr/bin/env python3
"""The money link is one value, and nothing points at a fund until it is set (internal growth decision D-75).

    python3 tests/test_support.py

Held, each by a case that fails when the thing it guards is broken:

  empty     registry/support.yaml as committed: the footer has no Support link, no /support/ page is
            built, /teachers/ says nothing about paying, and .github/FUNDING.yml does not exist
  filled    SPACE_RADAR_SUPPORT_URL set to an Open Collective page: the footer links /support/, the page
            links the fund and says the product stays free and the money is public, /teachers/ links it
  the file  once registry/support.yaml itself names the fund, README.md carries the same URL and
            .github/FUNDING.yml says `open_collective: <slug>`
  refused   a URL that is not https://opencollective.com/<slug> stops the build
"""
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.pop("SPACE_RADAR_SUPPORT_URL", None)
import seo_footer  # noqa: E402
import seo_pages  # noqa: E402
import support  # noqa: E402

FUND = "https://opencollective.com/space-radar-test"
problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


def built(path: str) -> str:
    pages = {p.path: p for p in seo_pages.support_page("https://spaceradar.ai")}
    return pages[path].body if path in pages else ""


# --- the registry as committed ---------------------------------------------------------------------
committed = support.support_url()
if not committed:
    check("support/index.html" not in seo_footer.sitelinks("../"), "the footer links /support/ with no fund named")
    check("{{support}}" not in seo_footer.sitelinks(""), "the footer kept its {{support}} placeholder")
    check(not seo_pages.support_page("https://spaceradar.ai"), "a /support/ page is built with no fund named")
    check(seo_pages.teachers_paying() == "", "/teachers/ talks about paying with no fund named")
    check(not (ROOT / ".github" / "FUNDING.yml").exists(), ".github/FUNDING.yml exists with no fund named in registry/support.yaml")
else:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    check(committed in readme, f"README.md's Support section does not link {committed}")
    funding = ROOT / ".github" / "FUNDING.yml"
    check(funding.is_file() and re.search(rf"^open_collective:\s*{re.escape(support.slug())}\s*$", funding.read_text(encoding="utf-8"), re.M) is not None,
          f".github/FUNDING.yml does not say open_collective: {support.slug()}")

# --- filled ----------------------------------------------------------------------------------------
os.environ["SPACE_RADAR_SUPPORT_URL"] = FUND
check(support.slug() == "space-radar-test", f"the slug of {FUND} read as {support.slug()!r}")
check('<li><a href="../support/index.html">Support</a></li>' in seo_footer.sitelinks("../"), "the footer does not link /support/ once a fund is named")
body = built("support/index.html")
check(f'href="{FUND}"' in body, "/support/ does not link the fund")
check("stays that way" in body and "no paid tier" in body, "/support/ does not say the product stays free")
check("public" in body and "invoice" in body, "/support/ does not say the money is public, or how a school pays by invoice")
check(not re.search(r"<script|<iframe|<form", body), "/support/ carries a script, a frame or a form")
paying = seo_pages.teachers_paying()
check('href="../support/index.html"' in paying and "free" in paying, "/teachers/ does not link /support/ and say it stays free")

# --- refused ---------------------------------------------------------------------------------------
os.environ["SPACE_RADAR_SUPPORT_URL"] = "https://example.com/pay"
try:
    support.support_url()
    problems.append("a URL that is not an Open Collective page was accepted")
except SystemExit:
    pass
os.environ.pop("SPACE_RADAR_SUPPORT_URL")

# --- the home page as committed is the empty footer ------------------------------------------------
run = subprocess.run([sys.executable, str(ROOT / "scripts" / "gen_home_seo.py"), "--check"], capture_output=True, text=True)
check(run.returncode == 0, f"site/index.html's footer is stale: {run.stdout.strip()} {run.stderr.strip()}")

if problems:
    print("\n".join(problems))
    sys.exit(1)
print("support link: one value, nothing points anywhere while it is empty")
