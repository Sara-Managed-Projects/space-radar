#!/usr/bin/env python3
"""scripts/narrate.py: a short sentence is never said alone (internal #441). No TTS, no audio.

    python3 tests/test_narrate_join.py

A title synthesised on its own came out with a vowel before it and another after its full stop
("Venus." heard as "a Venusa"). The render now says it in one pass with the sentence after it and
cuts the pass at the model's pause. This holds the parts that are arithmetic:

  1. WHICH SENTENCES GO TOGETHER. passes(): the title with the first sentence; a short sentence
     with the next; a short last sentence with the one before; nothing over the model's window.
  2. WHAT THE VOICE IS GIVEN. pass_text(): every sentence keeps its own full stop and the lexicon's
     markup; the joiner sits between them and nowhere else.
  3. WHERE THE PASS IS CUT. find_pause(): the longest quiet run that starts inside the window, not
     a stop consonant's closure before it and not a pause after it.
  4. THE CUE TIMES. lay_out(): sample counts in, caption times out; the title's cue ends where the
     title's samples end, the registry's pause follows, and the clip is as long as the sum.
  5. THE REGISTRY. Every stop with a title gets a first pass of two or more; `say` stops too; and
     the join rules are part of every clip's hash.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import narrate  # noqa: E402

failures = []
checks = 0


def check(ok: bool, what: str) -> None:
    global checks
    checks += 1
    if not ok:
        failures.append(what)


RULES = {**narrate.JOIN_DEFAULT, "words": 4, "joiners": [" — ", "; — "]}
LONG = "Mars is bright for a few months every two years, when the Earth catches it up."
LONG2 = "It was found in nineteen sixty-four, because it is one of the strongest sources."

# 1. which sentences go together
got = narrate.passes(["Mars.", LONG, LONG2], True, RULES)
check(got == [[0, 1], [2]], f"a title goes with the first sentence, the rest alone ({got})")
got = narrate.passes(["Mars.", "A steady orange point.", LONG], True, RULES)
check(got == [[0, 1, 2]], f"a title, then a short sentence: all three in one pass ({got})")
got = narrate.passes(["A black hole you can point to.", LONG, "You cannot see it.", "Nobody can.", LONG2], True, RULES)
check(got == [[0, 1], [2, 3, 4]], f"two short sentences in a row go with the one after them ({got})")
got = narrate.passes([LONG, LONG2, "Nobody can."], False, RULES)
check(got == [[0], [1, 2]], f"a short last sentence goes with the one before it ({got})")
got = narrate.passes(["Mars.", LONG, "Nobody can."], True, RULES)
check(got == [[0, 1, 2]], f"a title pass takes a short last sentence in ({got})")
got = narrate.passes([LONG, LONG2], False, RULES)
check(got == [[0], [1]], f"no title and nothing short: every sentence alone, as before ({got})")
got = narrate.passes(["Seven words that are a title here.", LONG], True, RULES)
check(got == [[0, 1]], f"a title is short however many words it has ({got})")
got = narrate.passes(["Seven words that are a title here.", LONG], False, RULES)
check(got == [[0], [1]], f"the same words with the title skipped are a sentence ({got})")
got = narrate.passes(["Mars.", "x" * 500], True, RULES)
check(got == [[0], [1]], f"a pass the model would split itself is not made ({got})")
got = narrate.passes(["Mars."], True, RULES)
check(got == [[0]], f"a clip of one sentence is one pass ({got})")
for case in (["Mars.", LONG, LONG2], [LONG, "No.", "No.", LONG2, "Yes."], ["A.", "B.", "C."]):
    flat = [i for g in narrate.passes(case, True, RULES) for i in g]
    check(flat == list(range(len(case))), f"every sentence is said once, in order ({flat})")
check(narrate.plain_words("[Eris](/ˈɪəɹɪs/) and Pluto fail the third.") == 6, "the lexicon's markup counts as its word")
check(narrate.passes(["[Eris](/ˈɪəɹɪs/) fails.", LONG], False, RULES) == [[0, 1]], "a short sentence with a lexicon word is short")

# 2. what the voice is given
text = narrate.pass_text(["Venus.", "The brightest thing in the night sky after the Moon."], " — ")
check(text == "Venus. — The brightest thing in the night sky after the Moon.", f"the title keeps its full stop, then the joiner ({text!r})")
text = narrate.pass_text(["[Eris](/ˈɪəɹɪs/), which made planet a definition.", "A.", "B."], "; — ")
check(text == "[Eris](/ˈɪəɹɪs/), which made planet a definition.; — A.; — B.", f"three sentences, two joiners, the markup whole ({text!r})")
check(narrate.pass_text(["Alone."], " — ") == "Alone.", "one sentence is given as it is")

# 3. where the pass is cut. Frames of 5 ms; 1.0 is speech, 0.0 is quiet.
F = 0.005


def env(*runs):
    out = []
    for level, ms in runs:
        out += [level] * int(ms / 5)
    return out


# "flat.": speech, the t's closure (70 ms), its burst, the pause (600 ms), then the body.
e = env((1.0, 1000), (0.0, 70), (1.0, 60), (0.0, 600), (1.0, 2000), (0.0, 500), (1.0, 500))
a, b = narrate.find_pause(e, F, 0.45 * 1.5, 1.15 * 1.5, 0.01)
check(abs(a - 1.13) < 1e-6 and abs(b - 1.73) < 1e-6, f"the pause, not the consonant's closure before it ({a}, {b})")
e = env((1.0, 500), (0.0, 30), (1.0, 2000), (0.0, 800), (1.0, 500))
a, b = narrate.find_pause(e, F, 0.3, 0.8, 0.01)
check(abs(a - 0.5) < 1e-6 and abs(b - 0.53) < 1e-6, f"a 30 ms pause is found when it is the only one; the long one outside the window is not taken ({a}, {b})")
check(narrate.find_pause(env((1.0, 3000)), F, 0.3, 0.8, 0.01) is None, "no quiet frame: no pause")
check(narrate.find_pause(env((1.0, 200), (0.0, 400), (1.0, 2000)), F, 0.3, 0.8, 0.01) is None, "a run that starts before the window is not it")
check(narrate.find_pause([], F, 0, 1, 0.01) is None, "no audio: no pause")
e = env((1.0, 500), (0.005, 100), (1.0, 500))
check(narrate.find_pause(e, F, 0.4, 0.6, 0.01) is not None and narrate.find_pause(e, F, 0.4, 0.6, 0.004) is None, "quiet is under the threshold, not zero")

# 4. the cue times
T = {"lead_s": 0.15, "title_gap_s": 0.7, "gap_s": 0.45, "tail_s": 0.25}
check(narrate.gaps_for(3, True, T) == [0.7, 0.45, 0.25], "a title, a sentence, the end: the title's pause, a sentence's, the tail")
check(narrate.gaps_for(3, False, T) == [0.45, 0.45, 0.25], "no title: sentence pauses")
check(narrate.gaps_for(1, True, T) == [0.25], "one sentence: only the tail")
RATE = 24000
lengths = [15600, 48000, 72000]            # 0.65 s (the title, cut out of the pass), 2 s, 3 s
timed, silences, total = narrate.lay_out(lengths, narrate.gaps_for(3, True, T), T["lead_s"], RATE)
check(silences == [3600, 16800, 10800, 6000], f"the silences in samples ({silences})")
check(total == sum(lengths) + sum(silences), f"the clip is the speech and the silences ({total})")
check(timed[0] == (0.15, 0.8), f"the title's cue is the title's samples ({timed[0]})")
check(abs(timed[1][0] - 1.5) < 1e-9 and abs(timed[1][1] - 3.5) < 1e-9, f"the first sentence starts 0.7 s after the title ends ({timed[1]})")
check(abs(timed[2][0] - 3.95) < 1e-9 and abs(timed[2][1] - 6.95) < 1e-9, f"then 0.45 s between sentences ({timed[2]})")
check(abs(total / RATE - (timed[-1][1] + T["tail_s"])) < 1e-9, "the last cue ends the tail before the clip does")
check(all(timed[i][1] <= timed[i + 1][0] for i in range(2)), "no two cues overlap")
vtt = narrate.vtt_text([(a, b, s) for (a, b), s in zip(timed, ["Venus.", "One.", "Two."])])
back = narrate.parse_vtt(vtt)
check([t for _, _, t in back] == ["Venus.", "One.", "Two."] and abs(back[0][1] - 0.8) < 1e-9, "the captions carry those times")

# 5. the registry as committed
_, cfg = narrate.load_config()
rules = narrate.join_rules(cfg)
check("join" in cfg["timing"] and len(rules["joiners"]) >= 1 and float(rules["min_pause_s"]) > 0, "registry/narration.yaml has the join rules")
skip = set(cfg.get("skip_title") or [])
say = set((cfg.get("say") or {}).keys())
alone = []
untitled = []
stops = 0
for trip, stop in narrate.every_stop(narrate.load_tours()):
    key = f"{trip['id']}/{stop['id']}"
    cues = narrate.cues_for(trip, stop, cfg)
    stops += 1
    has_title = narrate.titled(key, stop.get("card"), cfg, cues)
    if key not in skip and len(cues) > 1 and not has_title:
        untitled.append(key)
    groups = narrate.passes([m for _, m in cues], has_title, rules)
    if has_title and len(cues) > 1 and len(groups[0]) < 2:
        alone.append(key)
    for group in groups:
        if len(group) == 1 and len(cues) > 1 and narrate.plain_words(cues[group[0]][1]) <= int(rules["words"]):
            alone.append(f"{key} sentence {group[0]}")
check(stops > 150, f"the trips have their stops ({stops})")
check(not alone, f"no title and no short sentence is said alone ({alone[:6]})")
check(not untitled, f"every clip but the skip_title ones opens with its card's title, `say` scripts too ({untitled[:6]})")
card = {"title": "Venus", "body": "x"}
two = [("Venus.", "Venus."), ("The brightest thing.", "The brightest thing.")]
check(narrate.titled("t/s", card, {}, two), "a card's title, then its body: titled")
check(not narrate.titled("t/s", card, {"skip_title": ["t/s"]}, two), "skip_title: not titled")
check(not narrate.titled("t/s", card, {}, two[:1]), "one sentence: nothing to say it with")
check(not narrate.titled("t/s", card, {"say": {"t/s": "x"}}, [("Something else.", ""), ("More.", "")]), "a `say` that does not open with the title: not titled")
check(not narrate.titled("t/s", {"body": "x"}, {}, two), "no title on the card: not titled")
other = {**cfg, "timing": {**cfg["timing"], "join": {**rules, "words": int(rules["words"]) + 1}}}
some = [("Venus.", "Venus."), ("The brightest thing.", "The brightest thing.")]
check(narrate.clip_hash(some, cfg) != narrate.clip_hash(some, other), "the join rules are part of a clip's hash")
own = {**cfg, "join_short": {"t/s": 3}}
check(narrate.join_rules(own, "t/s")["words"] == 3 and narrate.join_rules(own, "t/x")["words"] == int(rules["words"]), "join_short raises `words` for the stop it names and no other")
check(narrate.clip_hash(some, own, "t/s") != narrate.clip_hash(some, cfg, "t/s"), "a stop named in join_short gets a new hash")
check(narrate.clip_hash(some, own, "t/x") == narrate.clip_hash(some, cfg, "t/x") == narrate.clip_hash(some, cfg), "and no other stop's clip goes stale")
for key in cfg.get("join_short") or {}:
    check(any(f"{t['id']}/{s['id']}" == key for t, s in narrate.every_stop(narrate.load_tours())), f"join_short names a stop that exists ({key})")

if failures:
    print(f"FAIL {len(failures)} of {checks}:\n  " + "\n  ".join(failures))
    sys.exit(1)
print(f"ok: {checks} checks (narrate.py: one pass for a short sentence, the cut and the cue times)")
