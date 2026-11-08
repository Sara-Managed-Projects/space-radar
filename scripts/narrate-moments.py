#!/usr/bin/env python3
"""Say a Moment's captions in the trips' voice, offline, and refuse when the files have drifted (forge #153).

The Moments (site/js/moments/) had sound but no voice: Sputnik's beep, Apollo's radio. The Fengyun-1C story is told,
not flown, so it is narrated, by THE SAME pipeline as every trip stop: this script imports scripts/narrate.py and uses
its model, voice, pauses, levelling and encoding (registry/narration.yaml), and adds only what a Moment needs that a
trip stop does not: the words come from a story's words file, and the clip's sentence times go into an index the
moment's builder reads, so each caption appears at the second its sentence is said.

    python3 scripts/narrate-moments.py --check                     # CI: no TTS, stdlib + PyYAML
    python3 scripts/narrate-moments.py --script                    # what the voice is given, clip by clip; no TTS
    $VENV_TTS/bin/python scripts/narrate-moments.py --models DIR   # render what is stale
    $VENV_STT/bin/python scripts/narrate-moments.py --listen --models DIR   # a recogniser hears every clip

WHAT IS SAID. registry/moment-voices.yaml names, per moment, its English words file and its clips: each clip is a
list of caption keys of COPY.momentStories[<id>], said in that order and word for word. Only what a synthesiser trips
on is written out for the ear (for_voice(): "22:26 UTC", "8 km/s", "Fengyun-1C"); never a different word. The file's
own `lexicon` gives the names the G2P gets wrong, beside registry/narration.yaml's.

ENGLISH ONLY, as the trips' and the cards' voices are: one voice (af_heart, en-us), one G2P and an English
recogniser. In another language the player shows the translated captions and plays no voice (moments/voice.js).

THE FILES. site/audio/moments/<id>/<clip>.{opus,m4a,vtt} (Opus 32 kbps and the AAC twin, narrate.py encode()), and
site/audio/moments/<id>/index.json: per clip its hash, its length, the start of each caption in it, its sizes and the
recogniser's word error. Nothing under site/audio/ is fetched before a visitor has sound on.

IDEMPOTENT BY HASH. A clip's hash is what the voice is given, the voice, the engine, the pauses and the clip's name. A
caption changed in the words file makes --check fail until that clip is rendered again, and a clip rendered again has
to be heard again (--listen) before --check passes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import narrate  # noqa: E402  (the trips' pipeline)

VOICES = ROOT / "registry" / "moment-voices.yaml"
OUT = ROOT / "site" / "audio" / "moments"
SCHEMA = 1
RULES_ID = "moments-1"          # change when for_voice() changes how a caption is said
MAX_WER = 0.08                  # a clip heard worse than this is not shipped

# For the ear only, in order. Each rewrites a way of WRITING something, never what is said.
VOICE_RULES = [
    (r"\b(\d{1,2}):(\d{2}) UTC\b", lambda m: f"{narrate.int_words(int(m.group(1)))} {narrate.int_words(int(m.group(2)))}, U T C"),
    (r"\bUTC\b", "U T C"),
    (r"(\d) km/s\b", r"\1 kilometres a second"),
    (r"\bFengyun-1C\b", "Fengyun one C"),
    (r"(\d) ?°", r"\1 degrees"),
    (r"\bODQN\b", "the Orbital Debris Quarterly News"),
]


def for_voice(text: str) -> str:
    """One caption as the voice is given it: VOICE_RULES, then narrate.spoken(). Raises ValueError on anything
    still unspeakable (narrate.spoken's own refusal)."""
    s = str(text)
    for pat, rep in VOICE_RULES:
        s = re.sub(pat, rep, s)
    return narrate.spoken(s)


_STRING = re.compile(r"^\s*([A-Za-z_]\w*):\s*'((?:[^'\\]|\\.)*)',?\s*$")


def read_words(path: Path) -> dict:
    """{key: text} of every `key: '...'` line of a words file (the shape copy/en.moments.*.js is written in)."""
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        m = _STRING.match(line)
        if m:
            out[m.group(1)] = re.sub(r"\\(.)", r"\1", m.group(2))
    return out


def load_voices(path: Path = VOICES) -> dict:
    return (yaml.safe_load(path.read_text(encoding="utf-8")) or {}).get("moments") or {}


def clip_cues(story: dict, clip: dict, cfg: dict, words: dict) -> list:
    """[(the caption as shown, what the voice is given, its key)] for one clip, sentence by sentence, or raise."""
    lexicon = {**(cfg.get("lexicon") or {}), **(story.get("lexicon") or {})}
    out = []
    for key in clip["says"]:
        if key not in words:
            raise ValueError(f"{key}: not in {story['words']}")
        for shown in narrate.sentences(words[key]):
            out.append((shown, narrate.apply_lexicon(for_voice(shown), lexicon), key))
    return out


def clip_key(mid: str, clip: dict, cues: list, cfg: dict) -> str:
    v = cfg["voice"]
    basis = json.dumps([[s for _, s, _ in cues], cfg["engine"]["id"], v["id"], v["speed"], v.get("pace"), cfg["timing"],
                        cfg.get("encode"), RULES_ID, f"{mid}/{clip['id']}"], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]


def starts_of(timed: list, cues: list) -> dict:
    """{caption key: the second its first sentence starts in the clip}."""
    out = {}
    for (start, _, _), (_, _, key) in zip(timed, cues):
        out.setdefault(key, round(start, 2))
    return out


def paths(mid: str, cid: str) -> dict:
    return {ext: OUT / mid / f"{cid}.{ext}" for ext in ("opus", "m4a", "vtt")}


def index_path(mid: str) -> Path:
    return OUT / mid / "index.json"


def read_index(mid: str) -> dict:
    p = index_path(mid)
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def write_index(mid: str, clips: dict, cfg: dict) -> None:
    doc = {"schema": SCHEMA, "builtBy": "scripts/narrate-moments.py", "engine": cfg["engine"]["id"], "voice": cfg["voice"]["id"],
           "credit": cfg["voice"].get("credit", ""), "clips": {k: clips[k] for k in sorted(clips)}}
    p = index_path(mid)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def plan(cfg: dict):
    """Every clip of every moment: (moment id, story, clip, cues, key)."""
    for mid, story in load_voices().items():
        words = read_words(ROOT / story["words"])
        for clip in story["clips"]:
            cues = clip_cues(story, clip, cfg, words)
            yield mid, story, clip, cues, clip_key(mid, clip, cues, cfg)


# ------------------------------------------------------------------------------------------------- check

def check() -> int:
    _, cfg = narrate.load_config()
    errors, total, seconds, n = [], 0, 0.0, 0
    seen = {}
    for mid, _, clip, cues, k in plan(cfg):
        rows = seen.setdefault(mid, (read_index(mid).get("clips") or {}))
        row = rows.get(clip["id"])
        n += 1
        if not row:
            errors.append(f"{mid}/{clip['id']}: no clip. Render it ($VENV_TTS/bin/python scripts/narrate-moments.py --models DIR)")
            continue
        if row.get("k") != k:
            errors.append(f"{mid}/{clip['id']}: its words, the voice or the rules changed since it was made. Render it again")
        p = paths(mid, clip["id"])
        for ext in ("opus", "m4a", "vtt"):
            if not p[ext].exists():
                errors.append(f"{mid}/{clip['id']}: {p[ext].relative_to(ROOT)} is missing")
            elif p[ext].stat().st_size != row.get(ext):
                errors.append(f"{mid}/{clip['id']}: {p[ext].relative_to(ROOT)} is {p[ext].stat().st_size} B, the index says {row.get(ext)}")
            else:
                total += row[ext]
        if p["vtt"].exists() and [x for _, _, x in narrate.parse_vtt(p["vtt"].read_text(encoding="utf-8"))] != [s for s, _, _ in cues]:
            errors.append(f"{mid}/{clip['id']}: the captions in its .vtt are not the words file's sentences")
        if set(row.get("starts") or {}) != set(clip["says"]):
            errors.append(f"{mid}/{clip['id']}: the index has no start for every caption it says")
        if row.get("wer") is None:
            errors.append(f"{mid}/{clip['id']}: no recogniser has heard this clip (--listen)")
        elif row["wer"] > MAX_WER:
            errors.append(f"{mid}/{clip['id']}: heard with {row['wer']:.1%} word error, over {MAX_WER:.0%}")
        seconds += float(row.get("s") or 0)
    for mid, rows in seen.items():
        want = {c["id"] for c in load_voices()[mid]["clips"]}
        for cid in rows:
            if cid not in want:
                errors.append(f"{mid}/{cid}: a clip registry/moment-voices.yaml no longer names")
        for f in sorted((OUT / mid).iterdir()) if (OUT / mid).exists() else []:
            if f.is_file() and f.name != "index.json" and f.stem not in want:
                errors.append(f"{f.relative_to(ROOT)}: a file the index does not list")
    gate = narrate.budgets().get("moment_voice_total_kb")
    if gate is not None and total / 1000 > gate:
        errors.append(f"the Moments' voice is {total / 1000:.0f} kB, over moment_voice_total_kb ({gate})")
    if errors:
        print("moment narration is NOT current:\n  " + "\n  ".join(errors))
        return 1
    print(f"moment narration is current ({n} clips, {seconds:.0f} s, {total / 1000:.0f} kB, every clip heard)")
    return 0


def script() -> int:
    _, cfg = narrate.load_config()
    for mid, _, clip, cues, _ in plan(cfg):
        print(f"{mid}/{clip['id']} (t = {clip['t']} s):")
        for _, said, _ in cues:
            print(f"    {said}")
    return 0


# ------------------------------------------------------------------------------------------------ render

def render(args) -> int:
    _, cfg = narrate.load_config()
    ff = args.ffmpeg
    encoders = subprocess.run([ff, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    if " libopus " not in encoders:
        sys.exit(f"{ff} has no libopus encoder")
    aac = "aac_at" if " aac_at " in encoders else "aac"
    todo, indexes = [], {}
    for mid, _, clip, cues, k in plan(cfg):
        rows = indexes.setdefault(mid, dict(read_index(mid).get("clips") or {}))
        if args.only and clip["id"] != args.only:
            continue
        fresh = (rows.get(clip["id"]) or {}).get("k") == k and all(f.exists() for f in paths(mid, clip["id"]).values())
        if args.force or not fresh:
            todo.append((mid, clip, cues, k))
    print(f"{len(todo)} moment clips to render", flush=True)
    voice = narrate.Voice(cfg, Path(args.models)) if todo else None
    import soundfile as sf  # the TTS venv's
    with tempfile.TemporaryDirectory() as tmp:
        for mid, clip, cues, k in todo:
            audio, rate, timed, _ = voice.clip([(s, said) for s, said, _ in cues], False, key=f"moments/{mid}/{clip['id']}")
            wav = Path(tmp) / "clip.wav"
            sf.write(str(wav), audio, rate, subtype="FLOAT")
            p = paths(mid, clip["id"])
            stats = narrate.encode(ff, aac, wav, cfg, p["opus"], p["m4a"])
            p["vtt"].write_text(narrate.vtt_text(timed), encoding="utf-8")
            seconds = round(audio.size / rate, 2)
            indexes[mid][clip["id"]] = {"k": k, "s": seconds, "starts": starts_of(timed, cues), "lufs": stats["lufs"],
                                        "opus": p["opus"].stat().st_size, "m4a": p["m4a"].stat().st_size, "vtt": p["vtt"].stat().st_size}
            print(f"ok   {mid}/{clip['id']}: {seconds:.1f} s, {stats['lufs']} LUFS, {p['opus'].stat().st_size / 1000:.1f} kB opus", flush=True)
            write_index(mid, indexes[mid], cfg)
    return 0


# ------------------------------------------------------------------------------------------------ listen

def listen(args) -> int:
    """Every clip through the trips' recogniser (scripts/listen_check.py); its word error goes on the clip's row."""
    import listen_check as L
    _, cfg = narrate.load_config()
    rows_by = {}
    ear = None
    for mid, story, clip, cues, _ in plan(cfg):
        rows = rows_by.setdefault(mid, dict(read_index(mid).get("clips") or {}))
        row = rows.get(clip["id"])
        if not row or (row.get("wer") is not None and not args.force):
            continue
        if ear is None:
            ear = L.Ear(args.model, Path(args.models), 0)
        names = L.rare_names([s for s, _, _ in cues]) | {L._fold(w.lower()) for w in (story.get("lexicon") or {})}
        samples = L.decode(args.ffmpeg, paths(mid, clip["id"])["opus"])
        ref = " ".join(for_voice(s) for s, _, _ in cues)
        res = L.judge(ref, ear.hear(samples), names)
        row["wer"] = round(res["wer"], 4)
        print(f"{'wer  ' if res['wer'] > MAX_WER else 'ok   '}{mid}/{clip['id']}: word error {res['wer']:.1%}; heard: {' '.join(res['hyp'])[:300]}", flush=True)
        write_index(mid, rows, cfg)
    return 0


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="verify the index, the files and the budget; no TTS")
    ap.add_argument("--script", action="store_true", help="print what the voice is given; no TTS")
    ap.add_argument("--listen", action="store_true", help="hear every clip not yet heard (the STT venv)")
    ap.add_argument("--models", default=os.environ.get("KOKORO_MODELS", "."), help="folder with the model files")
    ap.add_argument("--model", default="small.en", help="with --listen: the recogniser")
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    ap.add_argument("--only", help="one clip id")
    ap.add_argument("--force", action="store_true", help="render (or listen to) even what is current")
    args = ap.parse_args(argv)
    if args.check:
        return check()
    if args.script:
        return script()
    if args.listen:
        return listen(args)
    return render(args)


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
