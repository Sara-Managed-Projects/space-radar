"""The one switch for the project's money link (registry/support.yaml, internal growth decision D-75).

    support_url()   "" until the Open Collective page exists, then its https URL
    slug()          the collective's slug, for .github/FUNDING.yml

Everything that would point at the fund (the footer, /support/, the paragraph on /teachers/) asks
here and draws nothing while the value is empty.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
FILE = ROOT / "registry" / "support.yaml"
PATTERN = re.compile(r"https://opencollective\.com/([a-z0-9][a-z0-9-]*)/?")


def support_url() -> str:
    # SPACE_RADAR_SUPPORT_URL lets a test build the filled site without editing the registry.
    url = os.environ.get("SPACE_RADAR_SUPPORT_URL")
    if url is None:
        url = str((yaml.safe_load(FILE.read_text(encoding="utf-8")) or {}).get("open_collective") or "")
    url = url.strip()
    if url and not PATTERN.fullmatch(url):
        raise SystemExit(f"support: {url!r} in registry/support.yaml is not an https://opencollective.com/<slug> page")
    return url.rstrip("/")


def slug() -> str:
    m = PATTERN.fullmatch(support_url())
    return m.group(1) if m else ""
