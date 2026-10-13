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
  3. WHERE THE PASS IS CUT. find_cuts(): for each full stop inside a pass, the pause about where
     the sentence should end: not a consonant's closure, not a comma's shorter pause nearby.
     passes() with `sentences`: a paragraph in one pass. gaps_for() with `vary`: pauses that
     follow what was said and differ by a seeded amount. phrased(): commas for the voice only.
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
CUT = {**narrate.JOIN_DEFAULT}


def env(*runs):
    out = []
    for level, ms in runs:
        out += [level] * int(ms / 5)
    return out


def near(got, want):
    return got is not None and len(got) == len(want) and all(
        abs(g[0] - w[0]) < 1e-6 and abs(g[1] - w[1]) < 1e-6 for g, w in zip(got, want))


# "flat.": speech, the t's closure (70 ms), its burst, the pause (600 ms), then the body.
e = env((1.0, 1000), (0.0, 70), (1.0, 60), (0.0, 600), (1.0, 2000), (0.0, 500), (1.0, 500))
got = narrate.find_cuts(e, F, [10, 25], CUT)
check(near(got, [(1.13, 1.73)]), f"the pause, not the consonant's closure before it ({got})")
# A comma 0.5 s after the full stop, and nearer where the sentence was expected to end.
e = env((1.0, 2000), (0.0, 450), (1.0, 500), (0.0, 180), (1.0, 2500))
got = narrate.find_cuts(e, F, [25, 25], CUT)
check(near(got, [(2.0, 2.45)]), f"the full stop's long pause, not the comma's short one nearer the guess ({got})")
# Three sentences: two cuts, in order, and the second is estimated again from the first.
e = env((1.0, 1000), (0.0, 400), (1.0, 3000), (0.0, 150), (1.0, 1000), (0.0, 500), (1.0, 2000))
got = narrate.find_cuts(e, F, [10, 40, 20], CUT)
check(near(got, [(1.0, 1.4), (5.55, 6.05)]), f"a title, a sentence with a comma in it, a sentence ({got})")
# A long pause early in the pass does not move the guess for the next: speech is counted, not seconds.
e = env((1.0, 1000), (0.0, 1500), (1.0, 2000), (0.0, 400), (1.0, 2000))
got = narrate.find_cuts(e, F, [10, 20, 20], CUT)
check(near(got, [(1.0, 2.5), (4.5, 4.9)]), f"the second cut is found after a long first pause ({got})")
check(narrate.find_cuts(env((1.0, 3000)), F, [10, 10], CUT) is None, "no quiet frame: no cut")
check(narrate.find_cuts(env((1.0, 200), (0.0, 300), (1.0, 6000)), F, [30, 30], CUT) is None, "a pause far from where the sentence should end is not it")
check(narrate.find_cuts([], F, [1, 1], CUT) is None, "no audio: no cut")
check(narrate.find_cuts(env((1.0, 3000)), F, [10], CUT) == [], "one sentence: nothing to cut")
e = env((1.0, 1500), (0.005, 300), (1.0, 1500))
check(narrate.find_cuts(e, F, [10, 10], CUT) is not None and narrate.find_cuts(e, F, [10, 10], {**CUT, "quiet": 0.004}) is None, "quiet is under the threshold, not zero")
check(narrate.quiet_runs(env((0.0, 100), (1.0, 100), (0.0, 50), (1.0, 100), (0.0, 100)), 0.01) == [(40, 50)], "the quiet at either end of a pass is not a pause")

# 3b. a paragraph in one pass (2026-10-12): `sentences` fills a pass with long sentences too
PARA = {**narrate.JOIN_DEFAULT, "sentences": 3}
got = narrate.passes(["Mars.", LONG, LONG2, LONG, LONG2], True, PARA)
check(got == [[0, 1, 2], [3, 4]], f"a title and two sentences, then the other two ({got})")
got = narrate.passes(["Mars.", LONG, LONG2, LONG], True, PARA)
check(got == [[0, 1], [2, 3]], f"the closing sentence is not left alone: the one before it moves across ({got})")
got = narrate.passes(["Mars.", LONG, LONG2], True, PARA)
check(got == [[0, 1, 2]], f"a stop of three is one pass ({got})")
got = narrate.passes([LONG, LONG2, LONG], False, {**PARA, "max_chars": 170})
check(got == [[0, 1], [2]], f"never over the model's window, whatever `sentences` says ({got})")
for case in (["Mars.", LONG, LONG2, LONG, LONG2, LONG, LONG2], [LONG] * 5, ["A.", LONG]):
    flat = [i for g in narrate.passes(case, True, PARA) for i in g]
    check(flat == list(range(len(case))), f"every sentence is said once, in order, in a paragraph too ({flat})")

# 3c. pauses that follow what was said, and are never twice the same
V = {"lead_s": 0.15, "title_gap_s": 0.7, "gap_s": 0.4, "tail_s": 0.3,
     "vary": {"per_word_s": 0.01, "max_extra_s": 0.1, "short_words": 4, "short": 0.5, "before_last_s": 0.2, "after_question_s": 0.3, "jitter": 0}}
TEXTS = ["Mars.", "Nobody rode it.", "It drove for fourteen years and found rocks that formed in water.", "Are we safe?", "Yes.", "The end of it."]
got = narrate.gaps_for(6, True, V, TEXTS, "t/s")
check(got == [0.7, 0.2, 0.5, 0.5, 0.4, 0.3], f"title; a short sentence; a long one (capped); a question; before the last; the tail ({got})")
check(narrate.gaps_for(6, True, V) == [0.7, 0.4, 0.4, 0.4, 0.4, 0.3], "without the sentences the pauses are the plain ones")
J = {**V, "vary": {**V["vary"], "jitter": 0.12}}
one, again, other = narrate.gaps_for(6, True, J, TEXTS, "t/s"), narrate.gaps_for(6, True, J, TEXTS, "t/s"), narrate.gaps_for(6, True, J, TEXTS, "t/x")
check(one == again, "the same stop gets the same pauses every time: a render is reproducible")
check(one != other and one[-1] == other[-1] == 0.3, "another stop gets others; the tail is not varied")
check(all(abs(a / b - 1) <= 0.12 + 1e-3 for a, b in zip(one[:-1], got[:-1])), f"each within the jitter of its rule ({one})")
LONGER = ["Mars."] + [LONG] * 4
check(len(set(narrate.gaps_for(5, True, J, LONGER, "t/s")[1:-1])) == 3, "three sentences of one length: three different pauses")

# 3d. phrasing: the voice's commas and dashes, never its words, never the caption
SHOWN = ["Venus.", "The brightest thing in the night sky after the Moon."]
PH = {"phrasing": {"t/s": [["sky after", "sky — after"]]}}
check(narrate.phrased("t/s", SHOWN, PH) == ["Venus.", "The brightest thing in the night sky — after the Moon."], "a dash for the voice")
check(narrate.phrased("t/x", SHOWN, PH) == SHOWN, "and for no other stop")
for bad, why in (([["sky after", "sky, before"]], "a changed word"), ([["the sea", "the, sea"]], "words that are not there"),
                 ([["sky after", "sky. After"]], "a new full stop"), ([["the", "the,"]], "words found twice"), (["sky"], "not a pair")):
    try:
        narrate.phrased("t/s", SHOWN, {"phrasing": {"t/s": bad}})
        check(False, f"phrasing is refused for {why}")
    except ValueError:
        check(True, "")

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
check(narrate.clip_hash(some, own, "t/x") == narrate.clip_hash(some, cfg, "t/x"), "and no other stop's clip goes stale")
check(narrate.clip_hash(some, cfg, "t/x") != narrate.clip_hash(some, cfg, "t/y"), "the varied pauses are seeded by the stop's name, so the name is in its hash")
plain = {**cfg, "timing": {k: v for k, v in cfg["timing"].items() if k != "vary"}}
check(narrate.clip_hash(some, plain, "t/x") == narrate.clip_hash(some, plain, "t/y"), "...and only then")
check(narrate.clip_hash(some, {**cfg, "voice": {**cfg["voice"], "pace": {"close": 0.5}}}, "t/x") != narrate.clip_hash(some, cfg, "t/x"), "the closing pace is part of a clip's hash")
check(int(rules["sentences"]) >= 2, "a stop is said a paragraph at a time, not a sentence at a time")
for key, pairs in (cfg.get("phrasing") or {}).items():
    check(any(f"{t['id']}/{s['id']}" == key for t, s in narrate.every_stop(narrate.load_tours())), f"phrasing names a stop that exists ({key})")
dash = {**cfg, "join_own": {"t/s": {"joiners": [" — "], "drift": 0.4}}}
got = narrate.join_rules(dash, "t/s")
check(got["joiners"] == [" — "] and got["drift"] == 0.4 and got["sentences"] == rules["sentences"] and narrate.join_rules(dash, "t/x") == rules,
      "join_own changes the rules it names for the stop it names, and no other")
check(narrate.clip_hash(some, dash, "t/s") != narrate.clip_hash(some, cfg, "t/s") and narrate.clip_hash(some, dash, "t/x") == narrate.clip_hash(some, cfg, "t/x"), "...and only that stop's clip goes stale")
for key, own in (cfg.get("join_own") or {}).items():
    check(any(f"{t['id']}/{s['id']}" == key for t, s in narrate.every_stop(narrate.load_tours())), f"join_own names a stop that exists ({key})")
    check(set(own) <= set(narrate.JOIN_DEFAULT), f"join_own {key}: only rules that exist ({sorted(own)})")
# The comma the voice ran past: a title's 160 ms pause, then a comma's 400 ms a second later.
e = env((1.0, 600), (0.0, 160), (1.0, 900), (0.0, 400), (1.0, 6000))
check(near(narrate.find_cuts(e, F, [12, 120], CUT), [(1.66, 2.06)]) and near(narrate.find_cuts(e, F, [12, 120], {**CUT, "drift": 0.4}), [(0.6, 0.76)]),
      "a title with a shorter pause than the comma after it: the default takes the comma, a stop's own drift takes the title")
for key in cfg.get("join_short") or {}:
    check(any(f"{t['id']}/{s['id']}" == key for t, s in narrate.every_stop(narrate.load_tours())), f"join_short names a stop that exists ({key})")

if failures:
    print(f"FAIL {len(failures)} of {checks}:\n  " + "\n  ".join(failures))
    sys.exit(1)
print(f"ok: {checks} checks (narrate.py: one pass for a short sentence, the cut and the cue times)")
