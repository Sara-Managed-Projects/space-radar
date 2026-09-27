#!/usr/bin/env python3
"""Cut, loop, level and encode the sounds in registry/audio.yaml (spec 0035).

    python3 scripts/build-audio.py --originals DIR [--ffmpeg PATH] [--only ID] [--check-seams]

WHY A SCRIPT. A bed is somebody else's recording cut to a length, joined end to start, levelled
and encoded twice. Every one of those is a decision a reviewer should be able to repeat, and a
file in site/audio/ whose making lives only in a terminal's scrollback is a file nobody can
re-cut when the budget or the level changes. So each row's `make:` in registry/audio.yaml says how
(`original`, `from`, `seconds`, `xfade`, `lufs`), and this script is the only thing that turns
that into bytes. The originals are not committed (tens of MB, and the licence travels with the
URL in each row); download them into DIR under the name `make.original` gives.

THE LOOP. A bed plays with AudioBufferSourceNode.loop, which jumps from the last sample straight to
the first. Cut anywhere, that jump is a click and a change of chord. So the piece is cut `xfade`
seconds LONGER than the bed, and those extra seconds are cross-faded (equal power) over the bed's
first `xfade` seconds: the last sample of the file is followed, in the music, by the first. The
seam check decodes the ENCODED file back and compares the jump at the seam with the file's own
largest sample-to-sample step, because the codec, not the cut, is what could still break it.

THE LEVEL. One static gain per file to `lufs` integrated (EBU R128), never a dynamic loudness
filter: a gain that moved over time would be a different gain at the end than at the start, and
the seam would be a step in level. Beds sit at -24 LUFS, under the picture; stings a little
above them, so a cue on a ducked bed is heard and not startling.

ENCODING. Opus at 64 kbps in Ogg (`.opus`), the budgeted file, CONSTRAINED VBR: free VBR was
measured on 2026-09-23 spending up to 74 kbps on a drone, 669 kB for a 72 s bed against the
600 kB budget, and a budget the encoder decides is not a budget; AAC-LC at 64 kbps in MP4
(`.m4a`) for Safari before 18.4. 48 kHz stereo both. `kb` in the registry is then measured from
the .opus with --print-kb.

Stdlib only, plus an ffmpeg with libopus. On macOS the AudioToolbox AAC encoder (`aac_at`) is used
when present; elsewhere ffmpeg's own `aac`.
"""
from __future__ import annotations

import argparse
import array
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
RATE = 48000


def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        sys.exit(f"ffmpeg failed: {' '.join(cmd)}\n{p.stderr[-2000:]}")
    return p.stderr


def loudness(ff: str, wav: Path) -> tuple[float, float]:
    """Integrated loudness (LUFS) and true peak (dBTP) of a file, from ffmpeg's ebur128."""
    err = run([ff, "-hide_banner", "-nostats", "-i", str(wav), "-af", "ebur128=peak=true", "-f", "null", "-"])
    tail = err[err.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+) LUFS", tail).group(1))
    peak = float(re.search(r"Peak:\s+(-?[\d.inf]+) dBFS", tail).group(1))
    return i, peak


def pcm(ff: str, path: Path) -> array.array:
    """Decode to interleaved float32 stereo at 48 kHz, the way a browser's decodeAudioData would."""
    p = subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-i", str(path), "-f", "f32le",
                        "-ac", "2", "-ar", str(RATE), "-"], capture_output=True)
    if p.returncode != 0:
        sys.exit(p.stderr.decode()[-1000:])
    a = array.array("f")
    a.frombytes(p.stdout)
    return a


def seam(ff: str, path: Path) -> dict:
    """The jump from the last frame to the first, against the largest step inside the file."""
    a = pcm(ff, path)
    frames = len(a) // 2
    step = 0.0
    for i in range(2, len(a), 2):
        step = max(step, abs(a[i] - a[i - 2]), abs(a[i + 1] - a[i - 1]))
    jump = max(abs(a[0] - a[-2]), abs(a[1] - a[-1]))
    return {"frames": frames, "seconds": round(frames / RATE, 3), "seam_jump": round(jump, 5),
            "largest_step": round(step, 5), "ok": jump <= step}


def build(ff: str, aac: str, row: dict, originals: Path, out_dir: Path, work: Path) -> dict:
    make = row["make"]
    src = originals / make["original"]
    if not src.exists():
        sys.exit(f"{row['id']}: original `{src}` not found; download it from {row['source']}")
    start = float(make.get("from", 0))
    length = float(make["seconds"])
    xf = float(make.get("xfade", 0)) if row.get("loop") else 0.0
    fade_out = float(make.get("fade_out", 0))
    cut = work / f"{row['id']}.cut.wav"
    if xf > 0:
        graph = (
            f"[0:a]aresample={RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,asplit=3[a][b][c];"
            f"[a]atrim=0:{xf},asetpts=PTS-STARTPTS,afade=t=in:st=0:d={xf}:curve=qsin[head];"
            f"[b]atrim={length}:{length + xf},asetpts=PTS-STARTPTS,afade=t=out:st=0:d={xf}:curve=qsin[tail];"
            f"[head][tail]amix=inputs=2:normalize=0[join];"
            f"[c]atrim={xf}:{length},asetpts=PTS-STARTPTS[body];"
            f"[join][body]concat=n=2:v=0:a=1[out]"
        )
    else:
        fades = f",afade=t=out:st={length - fade_out}:d={fade_out}" if fade_out > 0 else ""
        graph = (f"[0:a]aresample={RATE},aformat=sample_fmts=fltp:channel_layouts=stereo,"
                 f"atrim=0:{length},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.005{fades}[out]")
    run([ff, "-hide_banner", "-y", "-ss", str(start), "-t", str(length + xf), "-i", str(src),
         "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_f32le", str(cut)])
    lufs, peak = loudness(ff, cut)
    target = float(make.get("lufs", -24))
    gain = target - lufs
    # Never past -1 dBFS: a quieter file is a better failure than a clipped one.
    gain = min(gain, -1.0 - peak)
    levelled = work / f"{row['id']}.wav"
    run([ff, "-hide_banner", "-y", "-i", str(cut), "-af", f"volume={gain:.2f}dB", "-c:a", "pcm_f32le", str(levelled)])
    opus = out_dir / Path(row["file"]).name
    m4a = out_dir / Path(row["twin"]).name
    run([ff, "-hide_banner", "-y", "-i", str(levelled), "-c:a", "libopus", "-b:a", "64k", "-vbr", "constrained",
         "-application", "audio", "-map_metadata", "-1", str(opus)])
    run([ff, "-hide_banner", "-y", "-i", str(levelled), "-c:a", aac, "-b:a", "64k", "-map_metadata", "-1",
         "-movflags", "+faststart", str(m4a)])
    after, after_peak = loudness(ff, opus)
    return {"id": row["id"], "gain_db": round(gain, 2), "lufs": round(after, 1), "peak_dbfs": after_peak,
            "opus_kb": round(opus.stat().st_size / 1000, 1), "m4a_kb": round(m4a.stat().st_size / 1000, 1)}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--originals", type=Path, help="directory holding the downloaded originals")
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    ap.add_argument("--only", action="append", help="build just this id (repeatable)")
    ap.add_argument("--check-seams", action="store_true", help="decode each shipped bed and check its loop seam")
    args = ap.parse_args(argv)
    doc = yaml.safe_load((ROOT / "registry" / "audio.yaml").read_text(encoding="utf-8")) or {}
    rows = [r for r in doc.get("audio") or [] if not args.only or r.get("id") in args.only]
    if args.check_seams:
        bad = 0
        for r in rows:
            if not r.get("loop"):
                continue
            for key in ("file", "twin"):
                s = seam(args.ffmpeg, ROOT / r[key])
                bad += 0 if s["ok"] else 1
                print(json.dumps({"file": r[key], **s}))
        return 1 if bad else 0
    if not args.originals:
        ap.error("--originals is required to build")
    encoders = run([args.ffmpeg, "-hide_banner", "-encoders"])
    aac = "aac_at" if " aac_at " in encoders else "aac"
    out_dir = ROOT / "site" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for r in rows:
            if not r.get("make"):
                sys.exit(f"{r.get('id')}: no `make:`, so this script cannot say how it was made")
            print(json.dumps(build(args.ffmpeg, aac, r, args.originals, out_dir, Path(tmp))))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
