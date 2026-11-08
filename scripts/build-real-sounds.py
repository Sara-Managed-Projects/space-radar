#!/usr/bin/env python3
"""Cut, level and encode the real recordings in registry/audio.yaml (forge #163): the rows with `heard:`.

    python3 scripts/build-real-sounds.py --originals DIR [--only ID]

WHAT THEY ARE. Six recordings NASA published, each heard where it was made: Voyager 1's plasma-wave instrument in
interstellar space, Juno's radio receiver passing Ganymede, Cassini's radio receiver at Saturn, InSight's seismometer
hearing a meteoroid strike and its pressure sensor hearing the wind, and Perseverance's microphone hearing a dust devil.
Five are radio, plasma, seismic or pressure data
turned into sound (`how: sonified`), one is sound itself (`how: microphone`); the app says which, every time.

WHY A SCRIPT, as for the beds (scripts/build-audio.py): a cut that lives in a terminal's scrollback is a cut nobody
can repeat. Each row's `make:` says which file, from which second and for how long; this turns that into bytes.

THE TOOLS ARE THE MAC'S OWN. There is no ffmpeg or Opus encoder on the machine these were made on, so this uses
`afconvert` (macOS) to decode (a video's audio track included) and to encode AAC, and Python's `wave` for the cut, the fades and the level. That is
why each row is a `clip` with one .m4a (the Moments' recordings are the same): AAC-LC, mono, 22 050 Hz, 32 kbps,
which every browser decodes. The originals are 5 kHz to 48 kHz; nothing above 11 kHz was in the data.

THE LEVEL. One gain per file so its loudest second sits at -20 dBFS RMS, held so no sample peaks above -1 dBFS:
loud enough to hear over a ducked bed, never louder than the music it plays inside. A 0.3 s fade in and a 1 s fade
out, so a cut is never a click.

The originals are not committed: download each `original.url` into DIR under its `make.original` name; the script
checks the sha256 before it cuts.
"""

from __future__ import annotations

import array
import hashlib
import math
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
RATE = 22050
TARGET_RMS_DB = -20.0
PEAK_DB = -1.0
FADE_IN_S = 0.3
FADE_OUT_S = 1.0


def rows(doc: dict | None = None) -> list[dict]:
    doc = doc if doc is not None else yaml.safe_load((ROOT / "registry/audio.yaml").read_text(encoding="utf-8"))
    return [r for r in doc.get("audio") or [] if isinstance(r, dict) and r.get("heard")]


def gain_for(samples: array.array, rate: int) -> float:
    """The one gain: the loudest second to TARGET_RMS_DB, unless that would peak above PEAK_DB."""
    full = 32767.0
    loudest = 0.0
    for i in range(0, max(1, len(samples) - rate + 1), rate // 2):
        win = samples[i:i + rate]
        if win:
            loudest = max(loudest, math.sqrt(sum(x * x for x in win) / len(win)))
    peak = max((abs(x) for x in samples), default=0)
    if loudest <= 0 or peak <= 0:
        return 1.0
    want = full * 10 ** (TARGET_RMS_DB / 20) / loudest
    cap = full * 10 ** (PEAK_DB / 20) / peak
    return min(want, cap)


def shape(samples: array.array, rate: int, g: float) -> array.array:
    """Gain and the two fades, in place on a copy."""
    n = len(samples)
    fi, fo = int(FADE_IN_S * rate), int(FADE_OUT_S * rate)
    out = array.array("h", bytes(2 * n))
    for i, x in enumerate(samples):
        k = g
        if i < fi:
            k *= i / fi
        if i > n - fo:
            k *= max(0.0, (n - i) / fo)
        out[i] = max(-32767, min(32767, int(round(x * k))))
    return out


def build(row: dict, originals: Path, work: Path) -> dict:
    make = row["make"]
    src = originals / make["original"]
    want = (row.get("original") or {}).get("sha256")
    if want and hashlib.sha256(src.read_bytes()).hexdigest() != want:
        sys.exit(f"{row['id']}: {src.name} is not the file the row names (sha256 differs)")
    pcm = work / f"{row['id']}.full.wav"
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(src), str(pcm)], check=True)
    with wave.open(str(pcm)) as w:
        a = array.array("h", w.readframes(w.getnframes()))
    start, length = int(float(make["from"]) * RATE), int(float(make["seconds"]) * RATE)
    cut = a[start:start + length]
    g = gain_for(cut, RATE)
    cut = shape(cut, RATE, g)
    mid = work / f"{row['id']}.wav"
    with wave.open(str(mid), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(cut.tobytes())
    out = ROOT / row["file"]
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "32000", str(mid), str(out)], check=True)
    return {"id": row["id"], "seconds": round(len(cut) / RATE, 2), "kb": round(out.stat().st_size / 1000, 1), "gain_db": round(20 * math.log10(g), 1)}


def main(argv: list[str]) -> int:
    if "--originals" not in argv:
        print("build-real-sounds: --originals DIR is required (the files each row's original.url names)", file=sys.stderr)
        return 2
    originals = Path(argv[argv.index("--originals") + 1])
    only = argv[argv.index("--only") + 1] if "--only" in argv else ""
    with tempfile.TemporaryDirectory() as tmp:
        for r in rows():
            if only and r["id"] != only:
                continue
            print(build(r, originals, Path(tmp)))
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
