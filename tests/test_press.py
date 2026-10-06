#!/usr/bin/env python3
"""The press page builds, and says only what the registry and the repository support (public #293).

    python3 tests/test_press.py

Asserted on a build into a temporary directory: five facts whose counts are the registry's; the
README's four screenshots and the three SVGs copied and linked; every relative link resolving to
a file of the build or of site/; the licence named from LICENSE; a contact through GitHub and no
personal data (no address, no mailto:); no placeholder left; and that scripts/deploy.sh ships it.
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_press  # noqa: E402

problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


with tempfile.TemporaryDirectory() as tmp:
    run = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_press.py"), "--out", tmp], capture_output=True, text=True)
    check(run.returncode == 0, f"build_press.py failed: {run.stderr.strip()}")
    press = Path(tmp) / "press"
    page = (press / "index.html").read_text(encoding="utf-8") if (press / "index.html").is_file() else ""
    check(bool(page), "press/index.html was not written")
    n = build_press.counts()
    check(n["layers"] > 10 and n["trips"] > 5 and n["sources"] > 10, f"the registry's counts look wrong: {n}")
    facts = re.findall(r"<li>(.*?)</li>", page, re.S)
    check(len(facts) == 5, f"five facts, not {len(facts)}")
    text = " ".join(facts)
    for key in ("layers", "trips", "sources"):
        check(re.search(rf"\b{n[key]} (guided trips|layers|public sources)", text) is not None, f"the page does not carry the registry's count of {key} ({n[key]})")
    for name, _alt in build_press.PICTURES:
        check((press / name).is_file() and (press / name).read_bytes() == (ROOT / "assets" / "screenshots" / name).read_bytes(), f"{name} is not the README's picture")
        check(f'src="{name}"' in page, f"{name} is not on the page")
        check(f"assets/screenshots/{name}" in (ROOT / "README.md").read_text(encoding="utf-8"), f"{name} is not one of the README's screenshots")
    for name, _label, _k in build_press.MARKS:
        svg = (press / name).read_text(encoding="utf-8") if (press / name).is_file() else ""
        check(svg.startswith("<svg ") and "<title>Space Radar</title>" in svg and "<text" not in svg and "<script" not in svg, f"{name} is a plain titled SVG with no text element (the wordmark is outlines) and no script")
    for href in re.findall(r'(?:href|src)="([^"#]+)"', page):
        if href.startswith(("http://", "https://")):
            check(href.startswith(("https://www.spaceradar.ai/", "https://github.com/Sara-Managed-Projects/space-radar")), f"an outside link: {href}")
            continue
        target = (press / href).resolve()
        in_site = (ROOT / "site" / href.replace("../", "", 1)) if href.startswith("../") else None
        check(target.exists() or (in_site is not None and (in_site.exists() or href == "../")), f"a link to nothing: {href}")
    check("MIT License" in page, "the licence is named from LICENSE")
    check("CREDITS.md" in page and "EMBEDDING.md" in page, "the credits and the embedding guide are linked")
    check("github.com/Sara-Managed-Projects/space-radar/issues/new" in page, "the contact is the project's GitHub")
    check("mailto:" not in page and re.search(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", page) is None, "no address on the page")
    check("{{" not in page and not re.search(r"\b(TODO|TBD|lorem)\b", page, re.I), "no placeholder left")
    check(not re.search(r"!|stunning|amazing|seamless|unlock", re.sub(r"<!--.*?-->|<!doctype[^>]*>|<style>.*?</style>", "", page, flags=re.S | re.I)), "no gush and no exclamation mark")

deploy = (ROOT / "scripts" / "deploy.sh").read_text(encoding="utf-8")
check("build_press.py" in deploy and '"$BUILT/press"' in deploy and '"/press/*"' in deploy, "scripts/deploy.sh builds, syncs and invalidates /press/")
inside = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_press.py"), "--out", str(ROOT / "site" / "press")], capture_output=True, text=True)
check(inside.returncode == 2 and not (ROOT / "site" / "press").exists(), "build_press.py refuses to write under site/")

if problems:
    print("press FAILED:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
print(f"press ok: five facts with the registry's counts ({n['layers']} layers, {n['trips']} trips, {n['sources']} sources), {len(build_press.PICTURES)} pictures and {len(build_press.MARKS)} SVGs, every link resolving, no personal data")
