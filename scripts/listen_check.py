#!/usr/bin/env python3
"""Listen to every narration clip with a machine, and refuse a clip nothing has listened to.

Internal #326 (2026-10-07). scripts/narrate.py checks what can be measured without ears: loudness,
length, words a minute. None of that notices a name said wrong, a number read digit by digit or a
placeholder read aloud. So each clip goes through a speech recogniser and what comes back is
compared, word by word, with the script the clip was rendered from.

    python3 scripts/listen_check.py --check                       # CI: no model, stdlib + PyYAML
    $VENV/bin/python scripts/listen_check.py --models DIR --write # listen to what is not yet heard
    $VENV/bin/python scripts/listen_check.py --models DIR --all --report out.md --json out.json
    $VENV/bin/python scripts/listen_check.py --models DIR --only to-the-edge --recheck medium.en

THE RECOGNISER. faster-whisper (MIT; CTranslate2) with OpenAI's Whisper weights (MIT) as converted
by Systran: `small.en` first, and with --recheck a larger one over the clips the first pass
doubts. Offline, on a CPU. The weights live outside the repository (--models). The clip is decoded
by ffmpeg, the same one narrate.py encodes with.

WHAT IS COMPARED. Both texts are brought to one spelling before they are compared (canon()):
lower case, no punctuation, numbers as digits whichever way they were written ("fifty-three
million" and "53 million" are both 53000000; "nineteen sixty-nine" and "1969" are both 1969),
dates in one order, British and American spellings folded. Then the word error rate:
substitutions, deletions and insertions over the script's word count (wer()).

WHO IS TO BLAME. A recogniser mishears too, most of all a rare name. Each mismatch is sorted:
  recogniser   a rare proper noun (never written in lower case anywhere in the trips), two words
               that sound the same, a word the two texts split differently, or a short function
               word swallowed, swapped or added
  voice        a number, a common word, three or more words missing in a row, a placeholder heard
               ("underscore", "brace"), a word heard on the wrong side of a pause (against the
               captions' times), and from the audio itself: more than two seconds of silence
               inside a clip, or samples at full scale
With --recheck a "voice" finding stands only if the second model also stumbles at the same word.

THE GUARD (--check, also run by scripts/narrate.py --check). Every clip's row in
registry/narration.yaml carries `wer` and `heard` (a hash of what the recogniser heard) and
`voice` (findings blamed on the voice). narrate.py writes a fresh row without them when it renders
a clip, so with `listen.required` on a clip nothing has listened to cannot ship. Over
`listen.max_wer`, or with a voice finding, a clip needs a line in `listen.accept` that says why.

It does not replace a person listening (internal #325). It says where to listen.
"""
from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

ROOT = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------------ one spelling for both

UNITS = {w: i for i, w in enumerate(
    "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen "
    "sixteen seventeen eighteen nineteen".split())}
UNITS.update({"nought": 0, "oh": 0})
TENS = {w: (i + 2) * 10 for i, w in enumerate("twenty thirty forty fifty sixty seventy eighty ninety".split())}
SCALES = {"hundred": 100, "thousand": 1000, "million": 10 ** 6, "billion": 10 ** 9, "trillion": 10 ** 12}
ORDINALS = {w: i + 1 for i, w in enumerate(
    "first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth thirteenth "
    "fourteenth fifteenth sixteenth seventeenth eighteenth nineteenth twentieth".split())}
ORDINALS["thirtieth"] = 30
MONTHS = set("january february march april may june july august september october november december".split())

# British -> American, the direction a recogniser trained mostly on American text writes.
SPELLING = {
    "centre": "center", "centres": "centers", "grey": "gray", "plough": "plow", "programme": "program",
    "catalogue": "catalog", "catalogues": "catalogs", "towards": "toward", "sulphur": "sulfur",
    "aluminium": "aluminum", "mould": "mold", "ageing": "aging", "storey": "story", "tonnes": "tons",
    "tonne": "ton", "afterwards": "afterward", "okay": "ok", "whilst": "while", "amongst": "among",
    "disc": "disk", "discs": "disks", "licence": "license", "defence": "defense", "mum": "mom",
    "moulded": "molded", "sceptical": "skeptical", "artefact": "artifact", "artefacts": "artifacts",
}
# What a recogniser writes short and a voice says long.
ABBREVIATED = {"km": "kilometres", "kg": "kilograms", "cm": "centimetres", "mm": "millimetres",
               "vs": "versus", "dr": "doctor", "mr": "mister", "approx": "approximately"}
# Pairs English says the same: the recogniser cannot know which was meant, so neither can this.
HOMOPHONES = [
    {"to", "too", "2"}, {"there", "their", "theyre"}, {"sun", "son"}, {"for", "4", "fore"},
    {"whose", "whos"}, {"by", "buy", "bye"}, {"here", "hear"}, {"sea", "see", "c"},
    {"knight", "night"}, {"won", "1"}, {"ate", "8"}, {"hole", "whole"}, {"weigh", "way"},
    {"plain", "plane"}, {"rays", "raise"}, {"cannot", "cant"}, {"ours", "hours"}, {"past", "passed"},
    {"b", "be", "bee"}, {"pole", "poll"}, {"great", "grate"}, {"wait", "weight"}, {"red", "read"},
    {"week", "weak"}, {"round", "around"},
]
# Small words a recogniser drops or adds. One of these alone is not the voice.
FUNCTION = set("a an the of and to in on at is it its as so or but that this for by with from than then "
               "are was were be been has have had not no if i".split())
PLACEHOLDER = {"underscore", "brace", "bracket", "braces", "brackets", "curly", "slash", "backslash",
               "asterisk", "hashtag", "undefined", "null", "nan"}


def _fold(word: str) -> str:
    w = SPELLING.get(word, word)
    w = re.sub(r"metres?$", lambda m: "meter" + ("s" if m.group(0).endswith("s") else ""), w)
    if len(w) >= 6:
        w = re.sub(r"our(s|ed|ing|ful|less|hood)?$", lambda m: "or" + (m.group(1) or ""), w)
        w = re.sub(r"is(e|es|ed|ing|ation|ations)$", lambda m: "iz" + m.group(1), w)
        w = re.sub(r"ys(e|es|ed|ing)$", lambda m: "yz" + m.group(1), w)
        w = re.sub(r"ll(ed|ing|er|ers)$", lambda m: "l" + m.group(1), w)
    return w


def _fmt(value: Decimal) -> str:
    if value == value.to_integral_value():
        return str(int(value))
    return format(value.normalize(), "f")


def _ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        return f"{n}th"
    return f"{n}" + {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


def _is_literal(tok: str) -> bool:
    return bool(re.fullmatch(r"\d+(?:\.\d+)?", tok))


def _numbers(tokens: list) -> list:
    """Number words and digits -> one digit token each. Pure. "nineteen sixty-nine" is 1969."""
    out = []
    i = 0
    tokens = list(tokens)
    n = len(tokens)
    while i < n:
        tok = tokens[i]
        nxt = tokens[i + 1] if i + 1 < n else ""
        if tok == "a" and nxt in SCALES:        # "a hundred": the article is the one
            tokens[i] = tok = "one"
        opens = (tok in UNITS and tok != "oh") or tok in TENS or _is_literal(tok)
        if not opens:
            out.append(_ordinal(ORDINALS[tok]) if tok in ORDINALS else tok)
            i += 1
            continue
        total = Decimal(0)      # finished thousands, millions...
        current = Decimal(0)    # the group under a thousand being built
        chunk = None            # year style: "nineteen" | "sixty-nine"
        last = None             # kind of the last thing added
        started = False
        while i < n:
            tok = tokens[i]
            nxt = tokens[i + 1] if i + 1 < n else ""
            # "five thousand and one hundred thousand" is two numbers: after a thousand, "and"
            # joins only what is under a hundred.
            after = tokens[i + 2] if i + 2 < n else ""
            if tok == "and" and started and last in ("hundred", "scale") and not (last == "scale" and after == "hundred") \
                    and ((nxt in UNITS and nxt != "oh") or nxt in TENS or re.fullmatch(r"\d{1,2}", nxt)):
                i += 1
                continue
            if tok == "point" and started and last != "frac" and (nxt in UNITS or nxt.isdigit()):
                digits = ""
                j = i + 1
                while j < n and ((tokens[j] in UNITS and UNITS[tokens[j]] < 10) or (tokens[j].isdigit() and not digits)):
                    digits += tokens[j] if tokens[j].isdigit() else str(UNITS[tokens[j]])
                    j += 1
                current += Decimal("0." + digits)
                last = "frac"
                i = j
                continue
            if _is_literal(tok):
                value = Decimal(tok)
                if started and not (last == "scale" and value < 1000):
                    break
                current += value
                # "2,000 and 5", as a recogniser sometimes writes "two thousand and five"
                last = "scale" if not started and value >= 1000 and value % 1000 == 0 else "literal"
            elif tok in UNITS:
                v = UNITS[tok]
                year = last in ("teen", "tens", "tensunit") and chunk is None and total == 0 and current < 100
                if not started:
                    current = Decimal(v)
                elif tok == "oh":
                    if not (year and nxt in UNITS and nxt != "oh" and UNITS[nxt] < 10):
                        break
                    chunk, current = current, Decimal(UNITS[nxt])      # "nineteen oh five"
                    last = "year"
                    i += 2
                    continue
                elif last in ("hundred", "scale"):
                    current += v
                elif last == "tens" and 0 < v < 10:
                    current += v
                elif year and v >= 10:
                    chunk, current = current, Decimal(v)               # "twenty eighteen"
                    last = "year"
                    i += 1
                    continue
                else:
                    break
                last = "teen" if v >= 10 else ("tensunit" if last == "tens" else "unit")
            elif tok in TENS:
                v = TENS[tok]
                if not started:
                    current = Decimal(v)
                elif last in ("hundred", "scale"):
                    current += v
                elif last in ("teen", "tens", "tensunit") and chunk is None and total == 0 and current < 100:
                    chunk, current = current, Decimal(v)               # "nineteen sixty", "twenty twenty"
                else:
                    break
                last = "tens"
            elif tok == "hundred":
                if not started or current == 0 or last in ("hundred", "frac", "year") or chunk is not None:
                    break
                current *= 100
                last = "hundred"
            elif tok in SCALES:
                if not started or current == 0:
                    break
                total += current * SCALES[tok]
                current = Decimal(0)
                last = "scale"
            else:
                break
            started = True
            i += 1
        value = total + current
        out.append(_fmt(chunk) + "%02d" % int(value) if chunk is not None else _fmt(value))
        # "twenty-first": a tens word followed by a unit ordinal
        if i < n and tokens[i] in ORDINALS and ORDINALS[tokens[i]] < 10 and last == "tens" and chunk is None:
            out[-1] = _ordinal(int(value) + ORDINALS[tokens[i]])
            i += 1
    return out


def _dates(tokens: list) -> list:
    """"the 3rd of february", "3 february", "february 3rd" and "february 3" are one date."""
    out = []
    i = 0
    n = len(tokens)
    day = re.compile(r"(\d{1,2})(?:st|nd|rd|th)?$")

    def is_day(tok: str):
        m = day.match(tok)
        return m.group(1) if m and 1 <= int(m.group(1)) <= 31 else None

    while i < n:
        d = is_day(tokens[i])
        if d and i + 2 < n and tokens[i + 1] == "of" and tokens[i + 2] in MONTHS:
            if out and out[-1] == "the":
                out.pop()
            out += [tokens[i + 2], d]
            i += 3
        elif d and i + 1 < n and tokens[i + 1] in MONTHS:
            if out and out[-1] == "the":
                out.pop()
            out += [tokens[i + 1], d]
            i += 2
        elif tokens[i] in MONTHS and i + 1 < n and is_day(tokens[i + 1]):
            out += [tokens[i], is_day(tokens[i + 1])]
            i += 2
        else:
            out.append(tokens[i])
            i += 1
    return out


def canon(text: str) -> list:
    """The words of `text` in the one spelling both sides are compared in. Pure, stdlib only."""
    s = unicodedata.normalize("NFKD", str(text).lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))       # "Māori" is "maori"
    s = s.replace("’", "'").replace("‘", "'")
    for ch in "   ":
        s = s.replace(ch, " ")
    # what a recogniser writes for numbers: "109 ,389", "10 .8", "1,000"
    s = re.sub(r"(?<=\d)\s?,(?=\d{3}\b)", "", s)            # not "11, 322": that is a list
    s = re.sub(r"(?<=\d)\s\.(?=\d)", ".", s)
    s = s.replace("%", " percent ").replace("&", " and ").replace("°", " degrees ")
    s = re.sub(r"\$\s?(\d[\d.]*)", r"\1 dollars", s)
    s = re.sub(r"\b(\d+)(?:st|nd|rd|th)\b", lambda m: _ordinal(int(m.group(1))), s)
    s = re.sub(r"(\d)\.(?!\d)", r"\1 ", s)                  # a full stop after a number
    s = s.replace("'", "")
    s = re.sub(r"[^a-z0-9.]+", " ", s)
    s = re.sub(r"(?<!\d)\.|\.(?!\d)", " ", s)
    # "20km", as a recogniser sometimes writes "twenty kilometres"
    s = re.sub(r"(\d)(km|kg|cm|mm)\b", r"\1 \2", s)
    # "m87" is "m 87"; "22nd" stays
    s = re.sub(r"\b([a-z]+)(\d+)\b", r"\1 \2", s)
    tokens = [ABBREVIATED.get(t, t) for t in s.split()]
    tokens = _dates(_numbers(tokens))
    return [_fold(t) for t in tokens]


# ----------------------------------------------------------------------------- the comparison

def _skeleton(word: str) -> str:
    w = word
    for a, b in (("ck", "k"), ("ph", "f"), ("qu", "kw"), ("x", "ks"), ("wh", "w"), ("wr", "r"), ("kn", "n")):
        w = w.replace(a, b)
    w = re.sub(r"c(?=[eiy])", "s", w).replace("c", "k").replace("z", "s")
    w = w[:1] + re.sub(r"[aeiouyh]", "", w[1:])
    return re.sub(r"(.)\1+", r"\1", w)


def sounds_alike(a: str, b: str) -> bool:
    """specks / specs, Sirius / serious: spelt apart, said together. Never for numbers."""
    if a == b:
        return True
    if re.search(r"\d", a + b) or min(len(a), len(b)) < 3:
        return False
    return _skeleton(a) == _skeleton(b) and difflib.SequenceMatcher(a=a, b=b).ratio() >= 0.75


def align(ref: list, hyp: list) -> list:
    """[(op, ref words, hyp words, i1, j1)] for every place the two differ. Pure."""
    out = []
    sm = difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        r, h = ref[i1:i2], hyp[j1:j2]
        if "".join(r) == "".join(h) and not (all(w.isdigit() for w in r) or all(w.isdigit() for w in h)):
            continue        # "sun light" / "sunlight", "1 e" / "1e"; never "1 9 6 9" for "1969"
        out.append((op, r, h, i1, j1))
    return out


def wer(ref: list, hyp: list) -> float:
    """Word error rate: (substituted + deleted + inserted) / words in the script. Pure."""
    if not ref:
        return 0.0 if not hyp else 1.0
    errors = sum(max(len(r), len(h)) for _, r, h, _, _ in align(ref, hyp))
    return round(errors / len(ref), 4)


def _same_sound(r: list, h: list) -> bool:
    if len(r) != len(h):
        # "Sirius" heard as "are serious": the small words a recogniser pads with do not count
        r2, h2 = [w for w in r if w not in FUNCTION], [w for w in h if w not in FUNCTION]
        if not r2 or len(r2) != len(h2) or abs(len(r) - len(h)) > 1:
            return False
        r, h = r2, h2
    if not r:
        return False
    for a, b in zip(r, h):
        if a == b or any(a in g and b in g for g in HOMOPHONES) or sounds_alike(a, b):
            continue
        # a plural or possessive the ear cannot tell from the next word's s
        if a.rstrip("s") and a.rstrip("s") == b.rstrip("s") and not re.search(r"\d", a + b):
            continue
        return False
    return True


def classify(diffs: list, names: set, ref: list) -> list:
    """Each difference with who is probably to blame. Pure."""
    out = []
    for op, r, h, i1, j1 in diffs:
        blame, why = "voice", "a common word"
        has_digit = any(re.search(r"\d", w) for w in r + h)
        if any(w in PLACEHOLDER for w in h) and not any(w in PLACEHOLDER for w in r):
            why = "a placeholder heard"
        elif r and all(w in names for w in r):
            blame, why = "recogniser", "a rare name"
        elif r and any(w in names for w in r) and len(r) <= 3 and len(h) <= 4:
            blame, why = "recogniser", "a rare name and its neighbour"
        elif _same_sound(r, h):
            blame, why = "recogniser", "sounds the same"
        elif has_digit:
            why = "a number"
        elif len(r) >= 3 and len(h) <= len(r) - 3:
            why = f"{len(r) - len(h)} words missing"
        elif len(r) <= 1 and len(h) <= 1 and all(w in FUNCTION for w in r + h):
            blame, why = "recogniser", "a small word"
        elif not r and len(h) >= 3:
            why = "words heard that are not in the script"
        out.append({"blame": blame, "why": why, "script": " ".join(r), "heard": " ".join(h), "at": i1, "hyp_at": j1})
    return out


def misplaced(ref: list, hyp: list, times: list, cues: list, slack: float = 0.6) -> list:
    """Sentences heard on the wrong side of a pause. Pure.

    `cues` is [(start, end, words in the cue)] from the captions. A recogniser's word times are
    good to a few tenths of a second; the pauses between sentences are longer than that."""
    out = []
    pair = {}
    for i, j, n in difflib.SequenceMatcher(a=ref, b=hyp, autojunk=False).get_matching_blocks():
        for k in range(n):
            pair[i + k] = j + k
    at = 0
    for k, (start, end, count) in enumerate(cues):
        first, last = at, at + count - 1
        at += count
        # The sentence's SECOND word: a recogniser often dates the first word after a pause from
        # the start of the pause ("bolted" 0.9 s early in strangest-things/golden-record).
        second = first + 1
        if k > 0 and count >= 2 and second in pair and pair[second] < len(times) and times[pair[second]] < start - slack:
            out.append({"blame": "voice", "why": f"heard {start - times[pair[second]]:.1f} s before the sentence it "
                        f"belongs to: a pause in the wrong place", "script": ref[second], "heard": ref[second],
                        "at": second, "hyp_at": pair[second], "t": times[pair[second]]})
        if k < len(cues) - 1 and last in pair and pair[last] < len(times) and times[pair[last]] > end + slack:
            out.append({"blame": "voice", "why": f"heard {times[pair[last]] - end:.1f} s after the sentence it "
                        f"closes: a pause in the wrong place", "script": ref[last], "heard": ref[last],
                        "at": last, "hyp_at": pair[last], "t": times[pair[last]]})
    return out


COMMON_NAMES = set(
    "earth moon sun mars venus jupiter saturn mercury neptune uranus pluto nasa china india "
    "january february march april may june july august september october november december "
    "monday tuesday wednesday thursday friday saturday sunday i apollo america american europe "
    "european russia russian soviet japan chinese indian british milky way north south east west "
    "hubble webb galileo newton einstein africa asia australia antarctica arctic atlantic pacific "
    "israel israeli texas florida england london".split())


def rare_names(texts: list) -> set:
    """Words written with a capital inside a sentence and never in lower case: the proper nouns.
    Minus the ones every recogniser knows; a mismatch on "Earth" is not the recogniser's."""
    upper, lower = set(), set()
    for text in texts:
        for sentence in re.split(r"(?<=[.!?])\s+", text):
            words = re.findall(r"[A-Za-z][A-Za-z'’]*", sentence)
            for k, w in enumerate(words):
                key = w.lower().replace("'", "").replace("’", "")
                if w[0].isupper():
                    if k > 0:
                        upper.add(key)
                else:
                    lower.add(key)
    rare = upper - lower - COMMON_NAMES
    return {_fold(w) for w in rare} | {_fold(w + "s") for w in rare}


# ------------------------------------------------------------------------------- --check (CI)

def guard(cfg: dict) -> list:
    """What is wrong with the manifest's listening record. No model, no audio. Pure on `cfg`."""
    listen = cfg.get("listen") or {}
    limit = float(listen.get("max_wer", 0.1))
    accept = listen.get("accept") or {}
    required = bool(listen.get("required", True))
    errors = []
    keys = set()
    for row in cfg.get("clips") or []:
        key = f"{row.get('trip')}/{row.get('stop')}"
        keys.add(key)
        if row.get("wer") is None or not row.get("heard"):
            if not required:
                continue
            errors.append(f"{key}: nothing has listened to this clip. Run scripts/listen_check.py --models DIR "
                          f"--only {key} --write")
            continue
        reason = str(accept.get(key) or "").strip()
        if float(row["wer"]) > limit and not reason:
            errors.append(f"{key}: word error {float(row['wer']):.0%} is over listen.max_wer ({limit:.0%}): fix the "
                          f"script or the lexicon and render it again, or say why in listen.accept")
        if int(row.get("voice") or 0) > 0 and not reason:
            errors.append(f"{key}: {row['voice']} finding(s) blamed on the voice: fix them, or say why in listen.accept")
    for key in accept:
        if key not in keys:
            errors.append(f"listen.accept names {key}, which is not a clip")
        elif len(str(accept[key]).strip()) < 12:
            errors.append(f"listen.accept {key}: the reason is too short to be one")
    return errors


def check() -> int:
    import narrate
    _, cfg = narrate.load_config()
    errors = guard(cfg)
    if errors:
        print("the narration has NOT been listened to:\n  " + "\n  ".join(errors))
        return 1
    rows = cfg.get("clips") or []
    heard = [r for r in rows if r.get("wer") is not None and r.get("heard")]
    mean = sum(float(r["wer"]) for r in heard) / max(1, len(heard))
    print(f"{len(heard)} of {len(rows)} clips have been listened to (mean word error {mean:.1%}, "
          f"{len((cfg.get('listen') or {}).get('accept') or {})} accepted with a reason)"
          + ("" if len(heard) == len(rows) else "; listen.required is off, so the rest still ship unheard"))
    return 0


# ----------------------------------------------------------------------------------- listening

def decode(ff: str, path: Path):
    import numpy as np
    raw = subprocess.run([ff, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
                         capture_output=True)
    if raw.returncode != 0:
        sys.exit(f"ffmpeg could not decode {path}: {raw.stderr.decode()[-400:]}")
    return np.frombuffer(raw.stdout, dtype=np.float32)


def audio_findings(samples, rate: int = 16000) -> list:
    """From the sound itself: a long silence inside the clip, samples at full scale."""
    import numpy as np
    out = []
    idx = np.flatnonzero(np.abs(samples) > 0.003)        # about -50 dBFS
    if idx.size == 0:
        return [{"blame": "voice", "why": "the clip is silent", "script": "", "heard": "", "at": 0, "hyp_at": 0, "t": 0.0}]
    gaps = np.diff(idx)
    if gaps.size:
        k = int(gaps.argmax())
        longest = float(gaps[k]) / rate
        if longest > 2.0:
            out.append({"blame": "voice", "why": f"{longest:.1f} s of silence inside the clip", "script": "",
                        "heard": "", "at": 0, "hyp_at": 0, "t": round(float(idx[k]) / rate, 2)})
    full = np.flatnonzero(np.abs(samples) >= 0.999)
    if full.size > 8:
        out.append({"blame": "voice", "why": f"clipping ({int(full.size)} samples at full scale)", "script": "",
                    "heard": "", "at": 0, "hyp_at": 0, "t": round(float(full[0]) / rate, 2)})
    return out


class Ear:
    def __init__(self, name: str, models: Path, threads: int):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(name, device="cpu", compute_type="int8", download_root=str(models), cpu_threads=threads)

    def hear(self, samples) -> list:
        segments, _ = self.model.transcribe(samples, language="en", beam_size=5, word_timestamps=True,
                                            condition_on_previous_text=False, temperature=0.0)
        return [[w.word.strip(), round(float(w.start), 2)] for s in segments for w in (s.words or [])]


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:16]


def heard_tokens(words: list) -> tuple:
    """canon() of the transcript, and for each token the time of the word it came from."""
    tokens = canon(" ".join(w for w, _ in words))
    marks = []
    done = 0
    for k, (_, t) in enumerate(words):
        upto = len(canon(" ".join(w for w, _ in words[: k + 1])))
        marks += [t] * max(0, upto - done)
        done = max(done, upto)
    times = (marks + [marks[-1] if marks else 0.0] * len(tokens))[: len(tokens)]
    return tokens, times


def judge(ref_text: str, words: list, names: set, cues: list | None = None) -> dict:
    ref = canon(ref_text)
    hyp, times = heard_tokens(words)
    findings = classify(align(ref, hyp), names, ref)
    for f in findings:
        j = min(f["hyp_at"], len(times) - 1)
        f["t"] = times[j] if times else 0.0
    if cues:
        findings += misplaced(ref, hyp, times, cues)
    return {"hyp": hyp, "wer": wer(ref, hyp), "findings": findings, "text": " ".join(w for w, _ in words)}


FROM_AUDIO = ("silence", "silent", "clipping")


def listen(args) -> int:
    import narrate
    head, cfg = narrate.load_config()
    tours = narrate.load_tours()
    conf = cfg.get("listen") or {}
    model = args.model or conf.get("model") or "small.en"
    limit = float(conf.get("max_wer", 0.1))
    accept = conf.get("accept") or {}
    rows = {f"{r['trip']}/{r['stop']}": r for r in cfg.get("clips") or []}
    cache_dir = Path(args.cache or (Path(args.models) / "listen-cache"))
    cache_dir.mkdir(parents=True, exist_ok=True)

    scripts, shown_all, timed = {}, [], {}
    for trip, stop in narrate.every_stop(tours):
        key = f"{trip['id']}/{stop['id']}"
        cues = narrate.cues_for(trip, stop, cfg)
        scripts[key] = " ".join(narrate.spoken(shown) for shown, _ in cues)
        shown_all += [shown for shown, _ in cues]
        vtt = narrate.paths(trip["id"], stop["id"])["vtt"]
        marks = narrate.parse_vtt(vtt.read_text(encoding="utf-8")) if vtt.exists() else []
        if len(marks) == len(cues):
            timed[key] = [(a, b, len(canon(narrate.spoken(shown)))) for (a, b, _), (shown, _) in zip(marks, cues)]
    names = rare_names(shown_all) | {_fold(w.lower()) for w in (cfg.get("lexicon") or {})} \
        | {_fold(str(w).lower()) for w in (conf.get("names") or [])}

    todo = []
    for key in scripts:
        if args.only and not (key == args.only or key.split("/")[0] == args.only):
            continue
        row = rows.get(key)
        if row and (args.all or args.only or row.get("wer") is None or not row.get("heard")):
            todo.append(key)
    print(f"{len(todo)} of {len(scripts)} clips to listen to with {model}", flush=True)

    ears = {}

    def cached(key: str, name: str) -> bool:
        trip_id, stop_id = key.split("/")
        return (cache_dir / f"{file_hash(narrate.paths(trip_id, stop_id)['opus'])}-{name}.json").exists()

    if args.cached_only:
        todo = [k for k in todo if cached(k, model)]
        print(f"{len(todo)} of them already heard and kept in {cache_dir}", flush=True)

    def hear(key: str, name: str) -> dict:
        trip_id, stop_id = key.split("/")
        opus = narrate.paths(trip_id, stop_id)["opus"]
        slot = cache_dir / f"{file_hash(opus)}-{name}.json"
        if slot.exists() and not args.no_cache:
            return json.loads(slot.read_text())
        if name not in ears:
            ears[name] = Ear(name, Path(args.models), args.threads)
        samples = decode(args.ffmpeg, opus)
        got = {"words": ears[name].hear(samples), "audio": audio_findings(samples)}
        slot.write_text(json.dumps(got))
        return got

    results = {}
    started = time.time()

    def save(final: bool) -> None:
        took = time.time() - started
        if args.json:
            Path(args.json).write_text(json.dumps(
                {"model": model, "recheck": args.recheck, "max_wer": limit, "seconds": round(took, 1),
                 "complete": final, "clips": results}, indent=1, ensure_ascii=False))
        if args.report:
            Path(args.report).write_text(report(results, rows, limit, accept, model, args.recheck, took, len(todo)))

    for n, key in enumerate(todo, 1):
        t0 = time.time()
        got = hear(key, model)
        res = judge(scripts[key], got["words"], names, timed.get(key))
        res["findings"] += got["audio"]
        res["model"] = model
        doubts = [f for f in res["findings"] if f["blame"] == "voice"]
        if args.recheck and (doubts or res["wer"] > limit):
            again = judge(scripts[key], hear(key, args.recheck)["words"], names, timed.get(key))
            # A word is the voice's only if both recognisers stumble at the same place in the script.
            spots = set()
            for f in again["findings"]:
                spots.update(range(f["at"], f["at"] + max(1, len(f["script"].split()))))
            for f in res["findings"]:
                if f["blame"] == "voice" and not any(w in f["why"] for w in FROM_AUDIO):
                    here = set(range(f["at"], f["at"] + max(1, len(f["script"].split()))))
                    if not here & spots:
                        f["blame"], f["why"] = "recogniser", f"{f['why']}; {args.recheck} heard it right"
            if again["wer"] < res["wer"]:
                again["findings"] += [f for f in res["findings"] if any(w in f["why"] for w in FROM_AUDIO)]
                again["model"] = args.recheck
                res = again
        res["voice"] = sum(1 for f in res["findings"] if f["blame"] == "voice")
        results[key] = res
        print(f"{'VOICE' if res['voice'] else ('wer  ' if res['wer'] > limit else 'ok   ')} {n}/{len(todo)} {key}: "
              f"wer {res['wer']:.1%}, {res['voice']} voice, {len(res['findings']) - res['voice']} recogniser "
              f"({time.time() - t0:.0f} s)", flush=True)
        if args.write:
            row = rows[key]
            row["wer"] = res["wer"]
            row["heard"] = hashlib.sha256(" ".join(res["hyp"]).encode("utf-8")).hexdigest()[:16]
            row["voice"] = res["voice"]
            narrate.write_registry(head, [rows[k] for k in scripts if k in rows])
        if n % 10 == 0:
            save(False)         # a run that is interrupted keeps what it has heard
    save(True)
    print(f"listened to {len(todo)} clips in {(time.time() - started) / 60:.1f} min", flush=True)
    bad = [k for k, r in results.items() if (r["voice"] or r["wer"] > limit) and not accept.get(k)]
    if bad:
        print(f"{len(bad)} clip(s) to look at: " + ", ".join(bad))
    return 1 if bad and not (args.report or args.json) else 0


def stamp(t: float) -> str:
    return f"{int(t // 60)}:{t % 60:04.1f}"


def report(results: dict, rows: dict, limit: float, accept: dict, model: str, recheck, took: float, total: int) -> str:
    lines = ["# The narration, as a machine heard it", "",
             f"Recogniser: faster-whisper `{model}`" + (f", doubtful clips again with `{recheck}`" if recheck else "") +
             f". {len(results)} of {total} clips in {took / 60:.1f} min. A clip is over the line above {limit:.0%} "
             f"word error or with any finding blamed on the voice.", "",
             "| trip | clips | mean word error | worst | voice findings |", "|---|---|---|---|---|"]
    by_trip = {}
    for key, r in results.items():
        by_trip.setdefault(key.split("/")[0], []).append((key, r))
    for trip_id, items in by_trip.items():
        w = [r["wer"] for _, r in items]
        worst = max(items, key=lambda kr: kr[1]["wer"])
        lines.append(f"| {trip_id} | {len(items)} | {sum(w) / len(w):.1%} | {worst[0].split('/')[1]} {worst[1]['wer']:.1%} | "
                     f"{sum(r['voice'] for _, r in items)} |")
    for blame, title in (("voice", "Probably the voice"), ("recogniser", "Probably the recogniser")):
        lines += ["", f"## {title}", ""]
        found = False
        for key, r in results.items():
            for f in r["findings"]:
                if f["blame"] != blame:
                    continue
                found = True
                note = f" (accepted: {accept[key]})" if blame == "voice" and accept.get(key) else ""
                lines.append(f"- `{key}` at {stamp(f.get('t', 0.0))}: script \"{f['script']}\" / heard \"{f['heard']}\" "
                             f"-- {f['why']}{note}")
        if not found:
            lines.append("None.")
    lines += ["", "## Every clip", "", "| clip | seconds | word error | heard |", "|---|---|---|---|"]
    for key, r in results.items():
        secs = (rows.get(key) or {}).get("seconds", "")
        lines.append(f"| {key} | {secs} | {r['wer']:.1%} | {r['text']} |")
    return "\n".join(lines) + "\n"


def main(argv: list) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="verify the manifest's listening record; no model")
    ap.add_argument("--models", default=os.environ.get("STT_MODELS", "."), help="folder the recogniser's weights are kept in")
    ap.add_argument("--model", help="faster-whisper model (default: listen.model in the registry, small.en)")
    ap.add_argument("--recheck", help="a larger model for the clips the first pass doubts, e.g. medium.en")
    ap.add_argument("--only", help="a trip id, or trip/stop")
    ap.add_argument("--all", action="store_true", help="listen to every clip, not only the ones with no record")
    ap.add_argument("--write", action="store_true", help="record wer, heard and voice in registry/narration.yaml")
    ap.add_argument("--report", help="write a Markdown report here (rewritten every ten clips)")
    ap.add_argument("--json", help="write a machine-readable summary here")
    ap.add_argument("--cache", help="where transcripts are kept between runs (default: MODELS/listen-cache)")
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--cached-only", action="store_true", help="judge only the clips whose transcript is kept; no model")
    ap.add_argument("--threads", type=int, default=4)
    ap.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    args = ap.parse_args(argv)
    if args.check:
        return check()
    return listen(args)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
