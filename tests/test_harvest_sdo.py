#!/usr/bin/env python3
"""The Sun's face of the day, as the harvester saves it (harvest/parsers/sdo_aia.py; internal spec 0076 W1-d, #916).

    python3 tests/test_harvest_sdo.py

No network: the folder listing and the picture are answered here. Held:
  the newest picture     by the moment in its name, of 1024 pixels and 171 angstrom only
  the day before         when today's folder has none yet (just after midnight UTC), or answers 404
  not modified           the same newest name as the copy held: no picture is fetched
  the saved body         its date from the name, the bytes whole in base64, the address it came from
  refused                not a JPEG, not base64, over registry/budgets.yaml sun_image_bytes
  through the run        a whole run writes sdo-aia-171.json; a second finds nothing new; a 404 is an
                         error that keeps the last good copy
  the budget             the parser's cap is the budget row's number
"""
from __future__ import annotations

import base64
import json
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from harvest import fetch, parsers, registry  # noqa: E402
from harvest import snapshot as snap  # noqa: E402
from harvest.run import run  # noqa: E402

failed = 0


def ok(cond: bool, msg: str) -> None:
    global failed
    if not cond:
        failed += 1
        print(f"FAIL: {msg}")


P = parsers.load("sdo_aia")
FIX = json.loads((ROOT / "tests/fixtures/harvest/sdo_aia.json").read_text())
JPEG = base64.b64decode(FIX["base64"])
NOW = datetime(2026, 10, 15, 17, 10, 0, tzinfo=timezone.utc)
ROW = registry.by_id(registry.load())["sdo-aia-171"]


def resp(url, status=200, body=b"", ct="text/html"):
    return fetch.Response(url=url, status=status, body=body, content_type=ct, etag=None, last_modified=None, duration_ms=1)


def listing(*names):
    return ("<html><body><pre>" + "".join(f'<a href="{n}">{n}</a>  15-Oct-2026 17:00  188K\n' for n in names) + "</pre></body></html>").encode()


TODAY = [
    "20261015_163646_1024_0171.jpg", "20261015_165658_1024_0171.jpg", "20261015_164558_1024_0171.jpg",
    "20261015_170001_1024_0193.jpg", "20261015_170002_2048_0171.jpg", "20261015_170003_512_0171.jpg",
]


class Upstream:
    def __init__(self, folders, picture=JPEG, picture_status=200):
        self.folders = folders
        self.picture = picture
        self.picture_status = picture_status
        self.calls = []

    def __call__(self, url, **_):
        self.calls.append(url)
        if url.endswith(".jpg"):
            return resp(url, self.picture_status, self.picture if self.picture_status == 200 else b"Not Found", "image/jpeg" if self.picture_status == 200 else "text/html")
        day = url.rstrip("/").split("browse/")[1]
        names = self.folders.get(day)
        return resp(url, 200, listing(*names)) if names is not None else resp(url, 404, b"<h1>Not Found</h1>")


# --- the listing -------------------------------------------------------------------------------------
ok(P.newest(listing(*TODAY).decode()) == "20261015_165658_1024_0171.jpg", "the newest 1024 px 171 picture, by the time in its name, not by its place in the listing")
ok(P.newest(listing("20261015_170001_1024_0193.jpg").decode()) is None, "another wavelength is not the picture")
ok(P.observed_of("20261015_165658_1024_0171.jpg") == "2026-10-15T16:56:58Z", "the name is the date")
ok(P.day_url(ROW.url, NOW) == "https://sdo.gsfc.nasa.gov/assets/img/browse/2026/10/15/", "the row's url names the UTC day as the archive writes it")
ok(ROW.parser == "sdo_aia" and ROW.refresh == "3h", "the registry row reads this parser every three hours")

# --- a fetch -------------------------------------------------------------------------------------------
up = Upstream({"2026/10/15": TODAY})
got = P.fetch(ROW, snap.Entry(), now=NOW, fetcher=up)
b = got["body"]
ok(got["status"] == 200 and got["etag"] == "20261015_165658_1024_0171.jpg", f"a fetch answers 200 with the file's name as its etag: {got['status']} {got['etag']}")
ok(up.calls == ["https://sdo.gsfc.nasa.gov/assets/img/browse/2026/10/15/", "https://sdo.gsfc.nasa.gov/assets/img/browse/2026/10/15/20261015_165658_1024_0171.jpg"], f"two requests, the folder then the picture: {up.calls}")
ok(b["observed"] == "2026-10-15T16:56:58Z" and b["wavelength_A"] == 171 and b["instrument"] == "SDO/AIA" and b["size_px"] == 1024, "the body says when, what and which instrument")
ok(base64.b64decode(b["base64"]) == JPEG and b["bytes"] == len(JPEG) and b["content_type"] == "image/jpeg", "the picture's bytes are saved whole")
ok(P.count(b) == 1, "one picture")

# Just after midnight UTC: today's folder has no 171 picture yet, or does not exist.
for today in ([], None):
    folders = {"2026/10/14": ["20261014_235710_1024_0171.jpg"]}
    if today is not None:
        folders["2026/10/15"] = today
    up = Upstream(folders)
    got = P.fetch(ROW, snap.Entry(), now=NOW, fetcher=up)
    ok(got["status"] == 200 and got["body"]["observed"] == "2026-10-14T23:57:10Z", f"today's folder {'empty' if today is not None else 'missing'}: yesterday's newest picture")
up = Upstream({})
got = P.fetch(ROW, snap.Entry(), now=NOW, fetcher=up)
ok(got["status"] == 404 and got["body"] is None and not any(u.endswith(".jpg") for u in up.calls), "no folder at all: an answer of 404 and no picture asked for")

# The copy held is the newest: nothing is fetched but the folder.
held = snap.Entry(fetched_at="2026-10-15T14:10:00Z", valid_until="2026-10-15T17:10:00Z", items=1, bytes=10, status="ok", last_error=None, etag="20261015_165658_1024_0171.jpg")
up = Upstream({"2026/10/15": TODAY})
got = P.fetch(ROW, held, now=NOW, fetcher=up)
ok(got["not_modified"] and got["status"] == 304 and len(up.calls) == 1, "the same newest name as the copy held: not modified, one request")

# --- refusals --------------------------------------------------------------------------------------------
def refuses(body, why):
    try:
        P.count(body)
    except ValueError:
        return
    ok(False, f"refuses {why}")


refuses(42, "a number")
refuses({**FIX, "base64": base64.b64encode(b"<html>Not Found</html>").decode()}, "an error page saved as the picture")
refuses({**FIX, "base64": "not base64 at all!"}, "bytes that are not base64")
refuses({**FIX, "observed": "today"}, "a picture with no moment")
refuses({**FIX, "base64": base64.b64encode(JPEG[:-2] + b"\x00" * (P.MAX_BYTES + 10) + b"\xff\xd9").decode()}, "a picture over the budget")
budgets = (ROOT / "registry/budgets.yaml").read_text()
m = re.search(r"\{id: sun_image_bytes, value: (\d+)", budgets)
ok(m and int(m.group(1)) == P.MAX_BYTES, "the parser's cap is registry/budgets.yaml sun_image_bytes")

# --- a whole run ------------------------------------------------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    store = snap.DirStore(tmp)
    up = Upstream({"2026/10/15": TODAY})
    doc = run(store, [ROW], now=NOW, fetcher=up, env={}, sleep=lambda s: None, log=lambda s: None)
    e = doc["snapshots"]["sdo-aia-171"]
    saved = json.loads((Path(tmp) / "sdo-aia-171.json").read_text())
    ok(e["status"] == "ok" and e["items"] == 1 and e["etag"] == "20261015_165658_1024_0171.jpg", f"a run saves it: {e}")
    ok(saved["body"]["observed"] == "2026-10-15T16:56:58Z" and saved["upstream_url"] == ROW.url and saved["source"] == "sdo-aia-171", "as sdo-aia-171.json, the file every road for a saved copy already carries")
    later = datetime(2026, 10, 15, 20, 20, 0, tzinfo=timezone.utc)
    up = Upstream({"2026/10/15": TODAY})
    doc = run(store, [ROW], now=later, fetcher=up, env={}, sleep=lambda s: None, log=lambda s: None)
    ok(doc["snapshots"]["sdo-aia-171"]["status"] == "not-modified" and len(up.calls) == 1, "three hours on with no newer picture: not modified, no picture fetched")
    up = Upstream({"2026/10/15": TODAY + ["20261015_200000_1024_0171.jpg"]}, picture_status=404)
    doc = run(store, [ROW], now=datetime(2026, 10, 15, 23, 30, 0, tzinfo=timezone.utc), fetcher=up, env={}, sleep=lambda s: None, log=lambda s: None)
    e = doc["snapshots"]["sdo-aia-171"]
    still = json.loads((Path(tmp) / "sdo-aia-171.json").read_text())
    ok(e["status"] == "error" and "404" in (e["last_error"] or "") and e["fetched_at"] == "2026-10-15T17:10:00Z" and still["body"]["observed"] == "2026-10-15T16:56:58Z",
       f"a newer picture that answers 404 is an error, and the last good copy stays: {e}")

if failed:
    print(f"\n{failed} check(s) failed")
    sys.exit(1)
print("PASS: the Sun's face of the day -- the newest 1024 px 171 picture by its name, yesterday's after midnight, not fetched twice, saved whole with its date, refused when it is not a JPEG or over budget, kept when a newer one fails")
