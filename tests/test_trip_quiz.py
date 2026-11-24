#!/usr/bin/env python3
"""The end-of-trip questions (forge #566) against the trips they ask about.

    python3 tests/test_trip_quiz.py

  source    every question's `quote` is, word for word, on the card of the stop it names (registry/tours.yaml), so a
            question can only ask what the trip said; a card changed under it fails here, not on a visitor
  answer    the right answer's English (copy/en.tripquiz.js tripQuiz.trips) carries `answer_has`, and `right` is one of
            the three answers
  shape     three questions a trip, three answers each, trip and stop ids that exist, at least four trips
  mirror    site/js/data/tripquiz.js is current (scripts/gen_trip_quiz_js.py --check)
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
fails: list[str] = []


def bad(msg: str) -> None:
    fails.append(msg)


norm = lambda s: re.sub(r"\s+", " ", str(s or "")).strip()  # noqa: E731

tours = yaml.safe_load((ROOT / "registry/tours.yaml").read_text(encoding="utf-8"))
tours = tours.get("tours", tours) if isinstance(tours, dict) else tours
by_id = {t["id"]: t for t in tours}
quiz = yaml.safe_load((ROOT / "registry/trip-quizzes.yaml").read_text(encoding="utf-8"))["trips"]

node = shutil.which("node")
if not node:
    print("test_trip_quiz: node is needed to read the English words", file=sys.stderr)
    sys.exit(2)
words = json.loads(subprocess.run([node, "--input-type=module", "-e",
                                   "const m = await import('./site/js/copy/en.js'); await import('./site/js/copy/en.tripquiz.js');"
                                   "process.stdout.write(JSON.stringify(m.COPY.tripQuiz))"],
                                  cwd=ROOT, capture_output=True, text=True, check=True).stdout)

if len(quiz) < 4:
    bad(f"{len(quiz)} trips have questions: the issue asks for at least four")
for trip, rows in quiz.items():
    if trip not in by_id:
        bad(f"{trip}: no such trip in registry/tours.yaml")
        continue
    stops = {s["id"]: s for s in by_id[trip]["stops"]}
    w = (words.get("trips") or {}).get(trip)
    if not isinstance(w, list) or len(w) != len(rows):
        bad(f"{trip}: copy/en.tripquiz.js tripQuiz.trips has {len(w) if isinstance(w, list) else 'no'} questions, the registry {len(rows)}")
        continue
    if len(rows) != 3:
        bad(f"{trip}: {len(rows)} questions, not three")
    for i, q in enumerate(rows, 1):
        where = f"{trip} question {i}"
        stop = stops.get(q.get("stop"))
        if not stop:
            bad(f"{where}: stop {q.get('stop')!r} is not a stop of the trip")
            continue
        body = norm((stop.get("card") or {}).get("body"))
        if norm(q.get("quote")) not in body:
            bad(f"{where}: the quote {q.get('quote')!r} is not on the card of stop {q['stop']!r} any more")
        answers = w[i - 1].get("a") or []
        if len(answers) != 3:
            bad(f"{where}: {len(answers)} answers, not three")
        right = q.get("right")
        if not isinstance(right, int) or not 0 <= right < len(answers):
            bad(f"{where}: right = {right!r} is not one of the answers")
            continue
        if norm(q.get("answer_has")).lower() not in norm(answers[right]).lower():
            bad(f"{where}: the right answer {answers[right]!r} does not carry {q.get('answer_has')!r}")
        if len(set(answers)) != len(answers):
            bad(f"{where}: two answers are the same")
        if not norm(w[i - 1].get("q")).endswith("?"):
            bad(f"{where}: the question does not end with a question mark")

r = subprocess.run([sys.executable, str(ROOT / "scripts/gen_trip_quiz_js.py"), "--check"], capture_output=True, text=True)
if r.returncode:
    bad("site/js/data/tripquiz.js is stale: " + (r.stderr or r.stdout).strip())

if fails:
    print("\n".join("FAIL " + f for f in fails))
    sys.exit(1)
print(f"trip quiz ok: {len(quiz)} trips, {sum(len(v) for v in quiz.values())} questions, each on its stop's card")
