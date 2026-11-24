#!/usr/bin/env python3
"""Mirror registry/trip-quizzes.yaml into site/js/data/tripquiz.js, and refuse if it has drifted (forge #566).

Only what the browser needs reaches it: per trip, per question, the stop it is answered by and which answer is right.
The quote and `answer_has` stay in the YAML, where tests/test_trip_quiz.py holds them against the trip's cards and the
English words.

Run:  python3 scripts/gen_trip_quiz_js.py           # write it
      python3 scripts/gen_trip_quiz_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import Mirror  # noqa: E402


def render(doc: dict) -> list:
    quiz = {trip: [{"stop": str(q["stop"]), "right": int(q["right"])} for q in rows]
            for trip, rows in (doc.get("trips") or {}).items()}
    return [("Three questions at the end of a trip: the stop each is answered by and the index of its right answer. The words are copy/en.tripquiz.js tripQuiz.", "TRIP_QUIZ", quiz)]


HEADER = """// GENERATED from registry/trip-quizzes.yaml by scripts/gen_trip_quiz_js.py. Do not edit.
//
// `python3 scripts/gen_trip_quiz_js.py --check` fails CI if this file and the YAML disagree, so
// an edit here is an edit that will be reverted. Change the YAML.
"""

MIRROR = Mirror(source="registry/trip-quizzes.yaml", target="site/js/data/tripquiz.js", header=HEADER, render=render, what="tripquiz.js")

if __name__ == "__main__":
    sys.exit(MIRROR.main())
