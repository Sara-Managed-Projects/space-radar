#!/usr/bin/env python3
"""scripts/listen_check.py: the parts that need no recogniser (internal #326).

    python3 tests/test_listen_check.py

  1. ONE SPELLING. canon() brings a script and a transcript to the same words: numbers however
     they were written, dates in either order, British and American spellings, punctuation, a
     recogniser's "109 ,389".
  2. THE WORD ERROR RATE. wer() counts substitutions, deletions and insertions over the script's
     words, and does not count "sun light" against "sunlight".
  3. WHO IS TO BLAME. A rare name and a homophone are the recogniser's; a number, a common word,
     a missing phrase, a placeholder and a word on the wrong side of a pause are the voice's.
  4. THE GUARD. A clip with no listening record, one over the line, and one with a voice finding
     are refused; a reason in listen.accept lets one through; and the manifest as committed passes.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import listen_check as lc  # noqa: E402
import narrate  # noqa: E402

failures = []
checks = 0


def check(ok: bool, what: str) -> None:
    global checks
    checks += 1
    if not ok:
        failures.append(what)


def same(a: str, b: str) -> None:
    check(lc.canon(a) == lc.canon(b), f"canon: {a!r} -> {lc.canon(a)} but {b!r} -> {lc.canon(b)}")


# 1. one spelling
for script, heard in [
    ("fifty-three million light years", "53 million light years"),
    ("ten point eight billion", "10 .8 billion"),
    ("one hundred and nine thousand three hundred and eighty-nine stars", "109 ,389 stars"),
    ("thirteen thousand three hundred and seventy-two", "13,372"),
    ("nineteen sixty-nine", "1969"),
    ("two thousand and five", "2005"),
    ("in two thousand and five", "in 2,000 and 5"),
    ("twenty thirty", "2030"),
    ("since twenty eighteen", "since 2018"),
    ("nineteen oh five", "1905"),
    ("nought point one two of a pixel", "0.12 of a pixel"),
    ("M eighty-seven", "M87"),
    ("a hundred times", "100 times"),
    ("the twenty-first century", "the 21st century"),
    ("the third of February", "the 3rd of February"),
    ("on the twentieth of April nineteen seventy-two", "on April 20, 1972"),
    ("on the twentieth of April nineteen seventy-two", "on 20 April 1972"),
    ("on the third of February nineteen sixty-six", "on February 3rd 1966"),
    ("kept going for eleven, three hundred and twenty-two Earth days", "kept going for 11, 322 Earth days"),
    ("four hundred metres a second", "400 meters a second"),
    ("four hundred kilometres up", "400 km up"),
    ("The centre of the galaxy. Its colour is grey.", "the center of the galaxy, its color is gray"),
    ("the Earth's neighbourhood", "the earths neighborhood"),
    ("the other one's", "the other ones"),
    ("the Māori call them Matariki", "the Maori call them Matariki"),
    ("light-years", "light years"),
    ("eleven thousand and one", "11,001"),
    ("three quarters of the Earth's width", "Three quarters of the Earths width."),
]:
    same(script, heard)
check(lc.canon("one, two, three") == ["1", "2", "3"], f"a list of numbers stays a list: {lc.canon('one, two, three')}")
check(lc.canon("one in a million") == ["1", "in", "1000000"], f"'one in a million': {lc.canon('one in a million')}")
check(lc.canon("six and a half") == ["6", "and", "a", "half"], f"'and' outside a number is a word: {lc.canon('six and a half')}")
check(lc.canon("in March twenty twenty-five") == ["in", "march", "2025"], f"a month and a year: {lc.canon('in March twenty twenty-five')}")
check(lc.canon("nineteen sixty-nine") != lc.canon("nineteen sixty"), "a wrong year is not the right one")
check(lc.canon("thirty-one thousand") != lc.canon("three one zero zero zero"), "a number read digit by digit is not the number")
check(lc.canon("our") != lc.canon("or"), "folding spellings does not fold short words into each other")
check(lc.sounds_alike("specks", "specs") and not lc.sounds_alike("live", "leave") and not lc.sounds_alike("warmed", "formed"),
      "specks and specs sound alike; live and leave, warmed and formed do not")
# what narrate.py gives the voice has no digit left, and compares clean against itself
for card in ["109 389 stars of the 1.8 billion", "on 3 February 1966", "at least 10 km out", "3.4 m up",
             "minus 235 degrees", "TRAPPIST-1 e", "a 560-year lap"]:
    said = narrate.spoken(card)
    check(not any(ch.isdigit() for ch in said), f"spoken({card!r}) still has a digit")
    check(lc.wer(lc.canon(said), lc.canon(said)) == 0.0, "a text against itself has no error")

# 2. the word error rate
ref = lc.canon("Three people live here at a time, a few hundred kilometres up.")
check(lc.wer(ref, lc.canon("three people live here at a time a few hundred kilometers up")) == 0.0, "the same words: 0")
check(lc.wer(ref, lc.canon("three people leave here at a time a few hundred kilometers up")) == round(1 / len(ref), 4),
      "one substitution")
check(lc.wer(ref, lc.canon("three people live here a few hundred kilometers up")) == round(3 / len(ref), 4), "three deleted")
check(lc.wer(ref, lc.canon("well three people live here at a time a few hundred kilometers up")) == round(1 / len(ref), 4),
      "one inserted")
check(lc.wer(ref, []) == 1.0, "silence is every word wrong")
check(lc.wer([], []) == 0.0, "nothing against nothing")
check(lc.wer(lc.canon("sunlight on the far side"), lc.canon("sun light on the farside")) == 0.0,
      "words split differently are the same words")
check(lc.wer(lc.canon("TRAPPIST one e"), lc.canon("Trappist 1e")) == 0.0, "'1 e' and '1e' are the same words")
check(lc.wer(lc.canon("in nineteen sixty-nine"), lc.canon("in one nine six nine")) > 0, "'1 9 6 9' is not 1969")

# 3. who is to blame
names = {"queqiao", "yutu", "tiangong"}


def blame(script: str, heard: str) -> list:
    r, h = lc.canon(script), lc.canon(heard)
    return [(f["blame"], f["why"]) for f in lc.classify(lc.align(r, h), names, r)]


check(blame("a relay satellite, Queqiao, out beyond the Moon", "a relay satellite, Chweqiao out beyond the moon")
      == [("recogniser", "a rare name")], "a rare name misheard is the recogniser's")
check(blame("about thirty-two thousand kilometres above", "about 32 kilometers above")[0] == ("voice", "a number"),
      "a wrong number is the voice's")
check(blame("in nineteen sixty-nine they landed", "in one nine six nine they landed")[0][0] == "voice",
      "a year read digit by digit is the voice's")
check(blame("the first one ever photographed by people", "the first one ever")[0][0] == "voice", "a phrase missing is the voice's")
check(blame("more than six thousand planets", "more than exoplanet underscore count planets")[0]
      == ("voice", "a placeholder heard"), "a placeholder heard is the voice's")
check(blame("water warmed in the tropics", "water formed in the tropics") == [("voice", "a common word")],
      "a common word wrong is the voice's")
check(blame("the Sun and its light", "the son and its light") == [("recogniser", "sounds the same")], "a homophone is nobody's")
check(blame("two specks of light", "two specs of light") == [("recogniser", "sounds the same")], "specks / specs is nobody's")
check(blame("Sirius. The brightest star", "are serious the brightest star") == [("recogniser", "sounds the same")],
      "a padded sound-alike is the recogniser's")
check(blame("The side that never faces us", "side that never faces us")[0][0] == "recogniser", "a dropped article is the recogniser's")
check("orion" in lc.rare_names(["The Greeks drew Orion here.", "Now leave the Earth."]), "a capitalised word is a name")
check("earth" not in lc.rare_names(["The Greeks drew Orion here.", "Now leave the Earth."]), "but not one every recogniser knows")
check("now" not in lc.rare_names(["Now leave. Go now."]), "and not a sentence's first word")

# a word on the wrong side of a pause
r = lc.canon("Venus. The brightest thing in the night sky.")
cues = [(0.15, 0.9, 1), (1.6, 4.0, 7)]
check(lc.misplaced(r, r, [0.2, 1.7, 1.9, 2.3, 2.6, 2.8, 3.0, 3.3], cues) == [], "every word on its own side of the pause")
check(lc.misplaced(r, r, [0.2, 0.7, 1.9, 2.3, 2.6, 2.8, 3.0, 3.3], cues) == [],
      "a first word the recogniser dates from the start of the pause is not a finding")
got = lc.misplaced(r, r, [0.2, 0.6, 0.8, 2.3, 2.6, 2.8, 3.0, 3.3], cues)
check(len(got) == 1 and "before" in got[0]["why"], "two words of a sentence said before the pause are found")
got = lc.misplaced(r, r, [1.7, 1.8, 1.9, 2.3, 2.6, 2.8, 3.0, 3.3], cues)
check(len(got) == 1 and "after" in got[0]["why"], "a title's last word said after the pause is found")

# 4. the guard
base = {"listen": {"max_wer": 0.1}, "clips": [{"trip": "t", "stop": "a", "wer": 0.02, "heard": "abc", "voice": 0}]}
check(lc.guard(base) == [], "a clip that was heard and is under the line passes")
check(len(lc.guard({**base, "clips": [{"trip": "t", "stop": "a"}]})) == 1, "a clip nothing listened to is refused")
check(len(lc.guard({**base, "clips": [{"trip": "t", "stop": "a", "wer": 0.0}]})) == 1, "a word error with no transcript hash is refused")
check(len(lc.guard({**base, "clips": [{"trip": "t", "stop": "a", "wer": 0.3, "heard": "x", "voice": 0}]})) == 1, "over the line is refused")
check(len(lc.guard({**base, "clips": [{"trip": "t", "stop": "a", "wer": 0.0, "heard": "x", "voice": 1}]})) == 1,
      "a voice finding is refused")
ok = {"listen": {"max_wer": 0.1, "accept": {"t/a": "the recogniser hears the name Queqiao as two words"}},
      "clips": [{"trip": "t", "stop": "a", "wer": 0.3, "heard": "x", "voice": 1}]}
check(lc.guard(ok) == [], "a reason lets it through")
ok["listen"]["accept"]["t/a"] = "fine"
check(len(lc.guard(ok)) == 1, "a reason has to be one")
ok["listen"]["accept"] = {"t/zz": "a long enough reason for a clip that is not there"}
check(any("not a clip" in e for e in lc.guard(ok)), "an accepted clip that does not exist is refused")
check(len(lc.guard({"clips": [{"trip": "t", "stop": "a", "wer": 0.11, "heard": "x"}]})) == 1, "the line is 10 % when the registry names none")

check(lc.guard({"listen": {"required": False}, "clips": [{"trip": "t", "stop": "a"}]}) == [],
      "with listen.required off, an unheard clip is let through")
check(len(lc.guard({"listen": {"required": False}, "clips": [{"trip": "t", "stop": "a", "wer": 0.5, "heard": "x"}]})) == 1,
      "but a clip that was heard and is over the line is still refused")
_, cfg = narrate.load_config()
live = lc.guard(cfg)
check(live == [], "the committed manifest: " + "; ".join(live[:3]))
check(isinstance((cfg.get("listen") or {}).get("max_wer"), float), "registry/narration.yaml names listen.max_wer")
# A render writes a row without the record, so a fresh clip is unheard until listened to.
row = dict(cfg["clips"][0])
for k in ("wer", "heard", "voice"):
    row.pop(k, None)
check(len(lc.guard({"listen": {"max_wer": cfg["listen"]["max_wer"], "required": True}, "clips": [row]})) == 1,
      "a freshly rendered row is unheard")

if failures:
    for f in failures:
        print(f"FAIL: {f}")
    sys.exit(1)
heard = sum(1 for r in cfg["clips"] if r.get("wer") is not None)
print(f"listen_check ok: {checks} checks; {heard} of {len(cfg['clips'])} clips carry a listening record")
