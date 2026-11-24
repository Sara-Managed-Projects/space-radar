#!/usr/bin/env python3
"""The numbered asteroids as points (research train "catalogues", forge #560): writes site/data/asteroids/cloud-<n>.bin and cloud.json.

    python3 scripts/build-asteroid-cloud.py 2026-11-24       fetch (cached under ~/.cache/spaceradar-src/neo-browser) and write
    python3 scripts/build-asteroid-cloud.py --check          stdlib only, no network: the files are whole and in budget

WHAT. The brightest numbered asteroids of the JPL Small-Body Database (sorted by absolute magnitude H, which is size for a given
reflectivity), in TIERS of TIER_N: the near-Earth browser's point layer (scene/asteroidcloud.js) fetches the first tier when it is
switched on and the next ones only when asked ("More"), so a visitor never pays for more points than they wanted. TIERS x TIER_N
of the 895 910 numbered asteroids of 2026-11-24 (H 15.3 or brighter): the line under the switch says both numbers.

THE PACKING (scene/asteroidcloud.js unpack reads it; tests/test_neo_browser.mjs holds the round trip). A 24-byte head --
"SRAC", version 1, the tier, two spare bytes, the count (uint32), four spare bytes, the epoch (JD, float64) -- then 12 bytes an
asteroid, six little-endian uint16:
    a      ln(a / A_MIN) / ln(A_MAX / A_MIN) * 65535, a in au (0.6 to 100)
    e      e * 65535
    i      i / 180 * 65535
    node, argument of perihelion, mean anomaly at the epoch:  degrees / 360 * 65535
The rounding is a ten-thousandth of the distance from the Sun at worst (0.0003 au in the main belt): a point cloud, not a place
to fly to, and the switch's line says so. Every row is at one epoch: the few solutions at another are carried to it by two-body
motion here (named in cloud.json `carried`). The class is not stored: the page works it out from q and a (near-Earth: q under
1.3 au; Jupiter's Trojans: a 5.05 to 5.35 au; beyond Jupiter: a over 5.5 au; the main belt otherwise).

SOURCE: https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,a,e,i,om,w,ma,epoch,H,class&sb-kind=a&sb-ns=n&sort=H&limit=...
(NASA/JPL, public domain in the US; CREDITS.md "Near-Earth asteroids"). SR_JPL_INSECURE=1 as scripts/build-neo-browser.py.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util  # noqa: E402

_spec = importlib.util.spec_from_file_location("neob", Path(__file__).resolve().parent / "build-neo-browser.py")
neob = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(neob)  # its get() and cache

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "data" / "asteroids"
TIERS = 4
TIER_N = 25_000
A_MIN, A_MAX = 0.6, 100.0
HEAD = struct.Struct("<4sBBHI4xd")  # 24 bytes
ROW = struct.Struct("<6H")          # 12 bytes
MAX_TIER_BYTES = HEAD.size + TIER_N * ROW.size  # registry/budgets.yaml asteroid_cloud_tier_bytes
GM_SUN_AU3_D2 = 0.00029591220828559104  # k^2, the Gaussian constant squared


def url(n: int) -> str:
    return ("https://ssd-api.jpl.nasa.gov/sbdb_query.api?fields=pdes,a,e,i,om,w,ma,epoch,H,class&sb-kind=a&sb-ns=n&sort=H"
            f"&limit={n}&full-prec=1")


def q16(x: float) -> int:
    return max(0, min(65535, int(round(x * 65535))))


def pack_row(a: float, e: float, i: float, om: float, w: float, ma: float) -> bytes:
    return ROW.pack(q16(math.log(a / A_MIN) / math.log(A_MAX / A_MIN)), q16(e), q16(i / 180), q16((om % 360) / 360), q16((w % 360) / 360),
                    q16((ma % 360) / 360))


def unpack_row(b: bytes) -> tuple:
    qa, qe, qi, qo, qw, qm = ROW.unpack(b)
    return (A_MIN * math.exp(qa / 65535 * math.log(A_MAX / A_MIN)), qe / 65535, qi / 65535 * 180, qo / 65535 * 360, qw / 65535 * 360,
            qm / 65535 * 360)


def build(read: str) -> dict:
    d = neob.get(url(TIERS * TIER_N), f"sbdb-numbered-{TIERS * TIER_N}.json")
    ix = {k: i for i, k in enumerate(d["fields"])}
    epochs: dict[str, int] = {}
    for r in d["data"]:
        epochs[r[ix["epoch"]]] = epochs.get(r[ix["epoch"]], 0) + 1
    epoch = float(max(epochs, key=epochs.get))
    rows, skipped, carried = [], [], []
    for r in d["data"]:
        a, e = float(r[ix["a"]] or "nan"), float(r[ix["e"]] or "nan")
        if not (A_MIN <= a <= A_MAX) or not (0 <= e < 1):
            skipped.append(r[ix["pdes"]])
            continue
        ma = float(r[ix["ma"]])
        ep = float(r[ix["epoch"]])
        if ep != epoch:
            n = math.degrees(math.sqrt(GM_SUN_AU3_D2 / a ** 3))  # degrees a day
            ma += n * (epoch - ep)
            carried.append(r[ix["pdes"]])
        rows.append((a, e, float(r[ix["i"]]), float(r[ix["om"]]), float(r[ix["w"]]), ma, float(r[ix["H"]])))
    OUT.mkdir(parents=True, exist_ok=True)
    tiers = []
    for t in range(TIERS):
        part = rows[t * TIER_N:(t + 1) * TIER_N]
        if not part:
            break
        body = HEAD.pack(b"SRAC", 1, t, 0, len(part), epoch) + b"".join(pack_row(*p[:6]) for p in part)
        (OUT / f"cloud-{t}.bin").write_bytes(body)
        tiers.append({"file": f"cloud-{t}.bin", "count": len(part), "hMax": part[-1][6], "bytes": len(body)})
    meta = {
        "v": 1,
        "about": "The brightest numbered asteroids of the JPL Small-Body Database, packed by scripts/build-asteroid-cloud.py; see CREDITS.md.",
        "read": read,
        "source": url(TIERS * TIER_N),
        "numbered": d["count"],
        "epochJd": epoch,
        "aRangeAu": [A_MIN, A_MAX],
        "tiers": tiers,
        "skipped": skipped,
        "carried": carried,
    }
    (OUT / "cloud.json").write_text(json.dumps(meta, indent=1) + "\n", encoding="utf-8")
    return meta


def check() -> list[str]:
    p = []
    meta = json.loads((OUT / "cloud.json").read_text(encoding="utf-8"))
    total = 0
    for t, tier in enumerate(meta["tiers"]):
        b = (OUT / tier["file"]).read_bytes()
        if len(b) > MAX_TIER_BYTES:
            p.append(f"{tier['file']} is {len(b)} B, over {MAX_TIER_BYTES}")
        magic, v, tt, _, n, ep = HEAD.unpack(b[:HEAD.size])
        if magic != b"SRAC" or v != 1 or tt != t or n != tier["count"] or len(b) != HEAD.size + n * ROW.size or ep != meta["epochJd"]:
            p.append(f"{tier['file']}: the head does not match cloud.json")
        total += n
    if total >= meta["numbered"]:
        p.append("the cloud says it holds every numbered asteroid")
    return p


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("read", nargs="?")
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args(argv)
    if not a.check:
        if not a.read:
            ap.error("give the day the source was read, or --check")
        meta = build(a.read)
        print(f"wrote {len(meta['tiers'])} tiers of {meta['numbered']} numbered asteroids: "
              + ", ".join(f"{t['count']} to H {t['hMax']}" for t in meta["tiers"]))
    probs = check()
    if probs:
        print("asteroid cloud FAILED:\n  " + "\n  ".join(probs), file=sys.stderr)
        return 1
    meta = json.loads((OUT / "cloud.json").read_text(encoding="utf-8"))
    print(f"asteroid cloud ok: {sum(t['count'] for t in meta['tiers'])} of {meta['numbered']} numbered asteroids in {len(meta['tiers'])} tiers")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
