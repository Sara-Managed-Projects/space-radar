#!/usr/bin/env python3
"""Read the baked Wikipedia cards aloud in the trips' Kokoro voice, offline, and refuse when the files have drifted.

Forge #151 (release 2.0.0, batch c2-deep). CosmosMap's info box plays a pre-made Kokoro mp3 and falls back to the
device's speech; our cards had only the device's speech (batch f4-cards: "Kokoro's runtime is not installed"). It is:
the trips' pipeline (scripts/narrate.py, registry/narration.yaml) runs on this laptop in a venv outside the repository.
So the cards are said by THE SAME voice, engine, pauses, levelling and encoding as every trip stop, and nothing new is
installed: this script imports narrate.py and adds only what a Wikipedia paragraph needs that a trip card does not.

    python3 scripts/narrate-cards.py --check                    # CI: no TTS, stdlib only
    python3 scripts/narrate-cards.py --script                   # what the voice is given for every card; no TTS
    $VENV_TTS/bin/python scripts/narrate-cards.py --models DIR  # render what is stale
    $VENV_STT/bin/python scripts/narrate-cards.py --listen --models DIR    # a recogniser hears every clip
    python3 scripts/narrate-cards.py --defer-rest "why"           # every card still without a clip keeps the device's speech

WHAT IS SPOKEN. The baked card's lead (site/data/wikicards/en.json `x`), sentence by sentence, exactly as the card
quotes it: the clip is the quotation, so it carries the quotation's licence (CC BY-SA 4.0, Wikipedia contributors;
the spoken version is an adaptation of that text, and CREDITS.md 9c says so). The caption under the button shows the
card's own sentences; the voice is given the same sentences with what a synthesiser trips on written out (for_voice():
"70.8%", "−153 to 20 °C", "1.48 g/cm3", "11th", "Sentinel-1A") and never a different fact.

ENGLISH ONLY. registry/narration.yaml has one voice, `af_heart` (en-us), one G2P (misaki's American English) and one
lexicon, and the listening check's recogniser is English-only (`small.en`). The model file holds voices for other
languages, but the pipeline has none set up, checked or heard for them, so the other ten languages keep the device's
own speech (ui/wikicard.js) and this script makes no clip for them.

THE FILES. site/audio/cards/en/<card id>.{opus,m4a,vtt}, Opus 32 kbps and the AAC twin as the trips' (narrate.py
encode()), and index.json: per clip the text's hash (cardHash(), the same 32-bit FNV-1a ui/wikicard.js computes, so a
card whose baked text changed is never played with an old clip), its length and its sizes; and the cards that were not
voiced, with why. Nothing under site/audio/ is fetched before a visitor presses Read aloud (the button fetches the
index, then one clip).

IDEMPOTENT BY HASH, as narrate.py: a card whose hash, the voice and the engine are unchanged and whose files are there
is left alone. --check fails when a baked card's text changed and its clip did not, when a file is not the size the
index says, when a clip has not been heard (--listen) or was heard with a finding blamed on the voice, or when the clips
pass `card_voice_total_kb`.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import narrate  # noqa: E402  (the trips' pipeline: spoken(), the Voice, encode(), the captions)

CARDS = ROOT / "site" / "data" / "wikicards" / "en.json"
OUT = ROOT / "site" / "audio" / "cards" / "en"
INDEX = OUT / "index.json"
SCHEMA = 1
# The clip's own identity on top of the engine's: change it when for_voice() changes how a card is said.
CARD_RULES = "cards-1"
# A clip a recogniser heard worse than this is not shipped; the card keeps the device's speech.
MAX_WER = 0.08
# The reasons listen() writes: a card skipped for one of them is not rendered again by a plain render.
HEARD_OUT = re.compile(r"^(a recogniser heard|the recogniser blamed)")


def card_hash(text: str) -> str:
    """32-bit FNV-1a over the text's UTF-16 code units, as ui/wikicard.js cardHash() does, in hex."""
    h = 0x811C9DC5
    raw = str(text).encode("utf-16-le")
    for (unit,) in struct.iter_unpack("<H", raw):
        h ^= unit
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def _ordinal(m: re.Match) -> str:
    n = int(m.group(1))
    if n < 20 or n % 10 == 0 and n < 40:
        return narrate.ordinal_words(n) if n in narrate.ORDINALS else narrate.int_words(n) + "th"
    if n < 100:
        return narrate.ordinal_words(n)
    head, tail = divmod(n, 100)
    return narrate.int_words(head * 100) + (" and " + _ordinal(re.match(r"(\d+)", str(tail))) if tail else "th")


def _catalogue(m: re.Match) -> str:
    """"NGC 7654" is "N G C seventy-six fifty-four" and "Messier 101" "Messier one oh one": a name, not a count."""
    n = m.group(2)
    head, tail = (n[:-2], n[-2:])
    tail_words = ("oh " + narrate.ONES[int(tail)]) if tail.startswith("0") and tail != "00" else ("hundred" if tail == "00" else narrate.int_words(int(tail)))
    return f"{m.group(1)} {narrate.int_words(int(head))} {tail_words}"


# For the ear only, in order. Each rewrites a way of WRITING something, never what is said about it.
VOICE_RULES = [
    (r"\[Fe/H\] = −?([\d.]+) ± ([\d.]+)", lambda m: f"an iron abundance of minus {m.group(1)}, give or take {m.group(2)}"),
    (r"(\d) ?°C\b", r"\1 degrees Celsius"),
    (r"(\d) ?°", r"\1 degrees"),
    (r"(\d) ?%", r"\1 percent"),
    (r"−(?=\d)", "minus "),
    (r" ?± ?", " plus or minus "),
    (r"(\d) ?– ?(\d)", r"\1 to \2"),
    (r" ?[—–] ?", ", "),
    (r"\bg/cm3\b", "grams per cubic centimetre"),
    (r"\bUV/visible\b", "ultraviolet and visible"),
    (r"(\d)\" telescope", r"\1-inch telescope"),
    (r"(?<=\d),(?=\d{3}\b)", ""),
    (r"\b(\d+)(?:st|nd|rd|th)\b", _ordinal),
    (r"\b(NGC|IC|HD|HIP|HR|Messier) (\d{3,4})\b", _catalogue),
    (r"\bGRBs\b", "G R Bs"),
    # "Sentinel-1A", "S6MF", "A2100A", "Complex-3E": letters and digits apart, so each is said as written.
    (r"(?<=\d)(?=[A-Za-z])|(?<=[A-Za-z])(?=\d)", " "),
]


def for_voice(sentence: str) -> str:
    """One card sentence as the voice is given it: VOICE_RULES, then narrate.py spoken(). Raises ValueError on
    anything still unspeakable, and that card keeps the device's speech."""
    s = str(sentence)
    for pat, rep in VOICE_RULES:
        s = re.sub(pat, rep, s)
    return narrate.spoken(s)


def load_cards() -> dict:
    doc = json.loads(CARDS.read_text(encoding="utf-8"))
    return doc.get("cards") or {}


def cues_of(text: str, cfg: dict) -> list:
    """[(the caption, what the voice is given)] for one card, or raise ValueError."""
    lexicon = cfg.get("lexicon") or {}
    return [(shown, narrate.apply_lexicon(for_voice(shown), lexicon)) for shown in narrate.sentences(text)]


def clip_key(key: str, text: str, cfg: dict) -> str:
    """The text's hash, the engine, the voice, the pauses and the rules: what a clip was made from."""
    v = cfg["voice"]
    basis = json.dumps([card_hash(text), cfg["engine"]["id"], v["id"], v["speed"], v.get("pace"), cfg["timing"],
                        CARD_RULES, key], sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()[:16]


def paths(key: str) -> dict:
    return {ext: OUT / f"{key}.{ext}" for ext in ("opus", "m4a", "vtt")}


def read_index() -> dict:
    if INDEX.exists():
        return json.loads(INDEX.read_text(encoding="utf-8"))
    return {}


def write_index(clips: dict, skipped: dict, cfg: dict) -> None:
    doc = {
        "schema": SCHEMA,
        "builtBy": "scripts/narrate-cards.py",
        "engine": cfg["engine"]["id"],
        "voice": cfg["voice"]["id"],
        "credit": cfg["voice"]["credit"],
        "text": "Wikipedia contributors, CC BY-SA 4.0 (the spoken lead is an adaptation of the quoted text)",
        "clips": {k: clips[k] for k in sorted(clips)},
        "skipped": {k: skipped[k] for k in sorted(skipped)},
    }
    INDEX.parent.mkdir(parents=True, exist_ok=True)
    INDEX.write_text(json.dumps(doc, ensure_ascii=False, indent=0, separators=(",", ":")) + "\n", encoding="utf-8")


# ------------------------------------------------------------------------------------------------- check

def check() -> int:
    _, cfg = narrate.load_config()
    cards = load_cards()
    doc = read_index()
    clips = doc.get("clips") or {}
    skipped = doc.get("skipped") or {}
    errors = []
    total = 0
    for key, row in clips.items():
        card = cards.get(key)
        if not card:
            errors.append(f"{key}: a clip for a card site/data/wikicards/en.json no longer has. Render with --prune")
            continue
        if row.get("h") != card_hash(card["x"]):
            errors.append(f"{key}: the card's text changed since its clip was made. Render it again (--only {key})")
        if row.get("k") != clip_key(key, card["x"], cfg):
            errors.append(f"{key}: the voice, the engine or the rules changed since this clip was made")
        p = paths(key)
        for ext in ("opus", "m4a", "vtt"):
            if not p[ext].exists():
                errors.append(f"{key}: {p[ext].relative_to(ROOT)} is missing")
            elif p[ext].stat().st_size != row.get(ext):
                errors.append(f"{key}: {p[ext].relative_to(ROOT)} is {p[ext].stat().st_size} B, the index says {row.get(ext)}")
            else:
                total += row[ext]
        if p["vtt"].exists():
            timed = narrate.parse_vtt(p["vtt"].read_text(encoding="utf-8"))
            if [t for _, _, t in timed] != narrate.sentences(card["x"]):
                errors.append(f"{key}: the captions are not the card's sentences")
        if row.get("wer") is None:
            errors.append(f"{key}: no recogniser has heard this clip (--listen)")
        elif row["wer"] > MAX_WER:
            errors.append(f"{key}: heard with {row['wer']:.1%} word error, over {MAX_WER:.0%}")
        elif row.get("voice"):
            # The trips' rule (registry/narration.yaml listen): a finding blamed on the voice needs a person's accept
            # line, and the cards have no such list, so such a clip does not ship.
            errors.append(f"{key}: {row['voice']} finding(s) the recogniser blames on the voice")
    for key in cards:
        if key not in clips and key not in skipped:
            errors.append(f"{key}: a baked card with neither a clip nor a reason it has none")
    if OUT.exists():
        for f in sorted(OUT.iterdir()):
            if f.is_file() and f.name != INDEX.name and f.stem not in clips:
                errors.append(f"{f.relative_to(ROOT)}: a file the index does not list")
    gate = narrate.budgets().get("card_voice_total_kb")
    if gate is not None and total / 1000 > gate:
        errors.append(f"the card clips are {total / 1000:.0f} kB in all, over card_voice_total_kb ({gate})")
    if errors:
        print("card narration is NOT current:\n  " + "\n  ".join(errors))
        return 1
    seconds = sum(float(r.get("s") or 0) for r in clips.values())
    print(f"card narration is current ({len(clips)} clips, {seconds / 60:.1f} min, {total / 1000:.0f} kB; "
          f"{len(skipped)} cards keep the device's speech)")
    return 0


def script() -> int:
    _, cfg = narrate.load_config()
    for key, card in load_cards().items():
        try:
            cues = cues_of(card["x"], cfg)
        except ValueError as e:
            print(f"{key}: NOT VOICED -- {e}")
            continue
        print(f"{key}:")
        for _, said in cues:
            print(f"    {said}")
    return 0


# ------------------------------------------------------------------------------------------------ render

def render(args) -> int:
    _, cfg = narrate.load_config()
    cards = load_cards()
    doc = read_index()
    clips = dict(doc.get("clips") or {})
    # A card a recogniser already refused stays refused: rendering it again gives the same clip, sample for sample.
    # Only --force tries again (after a change of its text, the voice or the rules, run with --force --only KEY).
    heard_out = {k: v for k, v in (doc.get("skipped") or {}).items() if HEARD_OUT.match(str(v))}
    skipped = {}
    ff = args.ffmpeg
    encoders = subprocess.run([ff, "-hide_banner", "-encoders"], capture_output=True, text=True).stdout
    if " libopus " not in encoders:
        sys.exit(f"{ff} has no libopus encoder")
    aac = "aac_at" if " aac_at " in encoders else "aac"
    todo = []
    for key, card in cards.items():
        if args.only and key != args.only:
            continue
        try:
            cues = cues_of(card["x"], cfg)
        except ValueError as e:
            skipped[key] = str(e).split(";")[0]
            clips.pop(key, None)
            continue
        k = clip_key(key, card["x"], cfg)
        if key in heard_out and not args.force and key not in clips:
            skipped[key] = heard_out[key]
            continue
        p = paths(key)
        fresh = clips.get(key, {}).get("k") == k and all(f.exists() for f in p.values())
        if args.force or not fresh:
            todo.append((key, card, cues, k, p))
    for key in [k for k in clips if k not in cards]:
        for f in paths(key).values():
            if f.exists():
                f.unlink()
        del clips[key]
        print(f"pruned {key}")
    if args.limit:
        todo = todo[: args.limit]
    print(f"{len(todo)} of {len(cards)} cards to render; {len(skipped)} cannot be voiced", flush=True)
    voice = narrate.Voice(cfg, Path(args.models)) if todo else None
    import soundfile as sf  # the TTS venv's
    with tempfile.TemporaryDirectory() as tmp:
        for n, (key, card, cues, k, p) in enumerate(todo, 1):
            t0 = time.time()
            audio, rate, timed, notes = voice.clip(cues, False, key=f"cards/{key}")
            wav = Path(tmp) / "clip.wav"
            sf.write(str(wav), audio, rate, subtype="FLOAT")
            stats = narrate.encode(ff, aac, wav, cfg, p["opus"], p["m4a"])
            p["vtt"].write_text(narrate.vtt_text(timed), encoding="utf-8")
            seconds = round(audio.size / rate, 2)
            words = narrate.word_count(cues)
            clips[key] = {"h": card_hash(card["x"]), "k": k, "s": seconds, "words": words, "lufs": stats["lufs"],
                          "opus": p["opus"].stat().st_size, "m4a": p["m4a"].stat().st_size, "vtt": p["vtt"].stat().st_size}
            unsplit = sum(1 for _, sh in notes if sh is None)
            print(f"ok   {n}/{len(todo)} {key}: {seconds:.1f} s, {words / seconds * 60:.0f} wpm, {stats['lufs']} LUFS, "
                  f"{clips[key]['opus'] / 1000:.1f} kB opus{f', {unsplit} pass(es) said a sentence at a time' if unsplit else ''} "
                  f"({time.time() - t0:.0f} s)", flush=True)
            write_index(clips, skipped, cfg)
    write_index(clips, skipped, cfg)
    return 0


# ------------------------------------------------------------------------------------------------ listen

def listen(args) -> int:
    """Every clip through the trips' recogniser (scripts/listen_check.py's Ear and judge()); a clip heard worse than
    MAX_WER, or with any finding blamed on the voice (the trips' rule, with no accept list here), loses its files and joins
    `skipped`, so the card keeps the device's speech."""
    import listen_check as L
    _, cfg = narrate.load_config()
    cards = load_cards()
    doc = read_index()
    clips = dict(doc.get("clips") or {})
    skipped = dict(doc.get("skipped") or {})
    names = L.rare_names([c["x"] for c in cards.values()]) | {L._fold(w.lower()) for w in (cfg.get("lexicon") or {})}
    ear = None
    todo = [k for k, r in clips.items() if args.force or r.get("wer") is None]
    print(f"{len(todo)} of {len(clips)} card clips to listen to", flush=True)
    for n, key in enumerate(todo, 1):
        if ear is None:
            ear = L.Ear(args.model, Path(args.models), int(os.environ.get("NARRATE_THREADS") or 0))  # 2 on a busy machine
        samples = L.decode(args.ffmpeg, paths(key)["opus"])
        ref = " ".join(for_voice(x) for x in narrate.sentences(cards[key]["x"]))
        res = L.judge(ref, ear.hear(samples), names)
        res["findings"] += L.audio_findings(samples)
        voice_faults = [f for f in res["findings"] if f["blame"] == "voice"]
        clips[key]["wer"] = round(res["wer"], 4)
        clips[key]["heard"] = hashlib.sha256(" ".join(res["hyp"]).encode("utf-8")).hexdigest()[:16]
        clips[key]["voice"] = len(voice_faults)
        print(f"{'wer  ' if res['wer'] > MAX_WER else 'ok   '}{n}/{len(todo)} {key}: wer {res['wer']:.1%}, "
              f"{len(voice_faults)} voice: {'; '.join(f['why'] for f in voice_faults)[:200]}", flush=True)
        if res["wer"] > MAX_WER or voice_faults:
            for f in paths(key).values():
                if f.exists():
                    f.unlink()
            skipped[key] = (f"a recogniser heard {res['wer']:.0%} of its words wrong" if res["wer"] > MAX_WER else
                            f"the recogniser blamed {len(voice_faults)} word(s) on the voice ({voice_faults[0]['why']})")
            del clips[key]
        write_index(clips, skipped, cfg)
    return 0


def defer_rest(reason: str) -> int:
    """Record every baked card that has no clip yet as skipped, with `reason`: the card keeps the device's speech and
    --check holds the index to it, until a render gives it a clip (render() drops the reason)."""
    _, cfg = narrate.load_config()
    doc = read_index()
    clips = dict(doc.get("clips") or {})
    skipped = dict(doc.get("skipped") or {})
    n = 0
    for key in load_cards():
        if key not in clips and key not in skipped:
            skipped[key] = reason
            n += 1
    for f in sorted(OUT.iterdir()) if OUT.exists() else []:
        if f.is_file() and f.name != INDEX.name and f.stem not in clips:
            f.unlink()  # a clip a render left half made
    write_index(clips, skipped, cfg)
    print(f"{n} cards keep the device's speech: {reason}")
    return 0


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="verify the index, the files and the budget; no TTS")
    ap.add_argument("--script", action="store_true", help="print what the voice is given for every card; no TTS")
    ap.add_argument("--listen", action="store_true", help="hear every clip not yet heard (the STT venv)")
    ap.add_argument("--models", default=os.environ.get("KOKORO_MODELS", "."), help="folder with the model files")
    ap.add_argument("--model", default="small.en", help="with --listen: the recogniser")
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    ap.add_argument("--only", help="one card id")
    ap.add_argument("--force", action="store_true", help="render (or listen to) even what is current")
    ap.add_argument("--limit", type=int, default=0, help="render at most this many clips this run")
    ap.add_argument("--defer-rest", metavar="WHY", help="record every card without a clip as skipped, with this reason")
    args = ap.parse_args(argv)
    if args.check:
        return check()
    if args.script:
        return script()
    if args.listen:
        return listen(args)
    if args.defer_rest:
        return defer_rest(args.defer_rest)
    return render(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
