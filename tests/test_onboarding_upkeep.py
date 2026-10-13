#!/usr/bin/env python3
"""The tour is kept up with the map: registry/onboarding.yaml against the source (internal spec 0074).

Ivan, 2026-10-14: "it should be well documented somewhere that every new big feature added might
need to be highlighted in onboarding, or vice versa if some feature moves or is even completely
deleted: this should be covered in the onboarding process."

A sentence in a guide is hoped for; this is the part that is enforced. It fails when:

  * a new rail button (`sr-rail__btn--<name>` under site/js/ui/), a new sidebar tab (ui/explore.js
    TABS) or a new on-demand module (`ctx.want<Name> =` in site/js/main.js) is in the source and no
    feature in the registry claims it. THAT IS THE MOMENT TO DECIDE: give the feature a `step:`
    (and write the step) or a `not:` with the reason the tour leaves it out;
  * a feature claims a surface the source no longer has, or names a file that is gone (the
    feature was removed or moved: take it out, or fix its row);
  * a feature has neither a step nor a reason, or both; a step teaches a feature that is not on
    the list; a step's id is not one a feature's `step:` can find;
  * the guides stop saying so: CONTRIBUTING.md and the pull request template each carry the rule.

The other half (every hook a step names is a `data-tour` the source sets, and the reverse) is
tests/test_onboarding.mjs, which reads the generated mirror.

Run:  python3 tests/test_onboarding_upkeep.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
doc = yaml.safe_load((ROOT / "registry" / "onboarding.yaml").read_text(encoding="utf-8")) or {}
steps = [s for s in doc.get("steps") or [] if isinstance(s, dict)]
features = [f for f in doc.get("features") or [] if isinstance(f, dict)]
problems: list[str] = []


def check(ok: bool, what: str) -> None:
    if not ok:
        problems.append(what)


HOW = "registry/onboarding.yaml (its head says how), then python3 scripts/gen_onboarding_js.py"

# --- what the source has ---------------------------------------------------------------------------
ui = ROOT / "site" / "js" / "ui"
found: dict[str, str] = {}
for path in sorted(ui.glob("*.js")):
    for m in re.finditer(r"sr-rail__btn--([a-z]+)\b", path.read_text(encoding="utf-8")):
        found.setdefault(f"rail:{m.group(1)}", f"site/js/ui/{path.name}")
tabs = re.search(r"export const TABS = \[([^\]]*)\]", (ui / "explore.js").read_text(encoding="utf-8"))
check(bool(tabs), "ui/explore.js no longer exports TABS as a list: this test reads the sidebar's tabs from it")
for name in re.findall(r"'([a-z-]+)'", tabs.group(1) if tabs else ""):
    found[f"tab:{name}"] = "site/js/ui/explore.js TABS"
for m in re.finditer(r"\bctx\.(want[A-Z][A-Za-z]*) = ", (ROOT / "site" / "js" / "main.js").read_text(encoding="utf-8")):
    found.setdefault(f"want:{m.group(1)}", "site/js/main.js")
check(len([k for k in found if k.startswith("rail:")]) >= 5 and len([k for k in found if k.startswith("tab:")]) >= 3
      and len([k for k in found if k.startswith("want:")]) >= 5, f"the source was not read ({sorted(found)})")

# --- the features ----------------------------------------------------------------------------------
ids = [f.get("id") for f in features]
check(len(ids) == len(set(ids)), "two features share an id")
step_ids = {s.get("id") for s in steps}
claimed: dict[str, str] = {}
for f in features:
    fid = f.get("id")
    check(bool(re.fullmatch(r"[a-z][a-z0-9-]*", str(fid or ""))), f"a feature's id is {fid!r}")
    check(bool(str(f.get("name") or "").strip()), f"feature {fid}: no name")
    has_step, has_not = "step" in f, "not" in f
    check(has_step != has_not, f"feature {fid}: it has {'both' if has_step else 'neither'} `step:` and `not:`. "
          f"Every main feature is either shown by the tour or left out for a reason that is written down ({HOW})")
    if has_step:
        check(f["step"] in step_ids, f"feature {fid}: its step {f['step']!r} is not a step of the tour")
    if has_not:
        check(len(str(f["not"]).strip()) >= 20, f"feature {fid}: `not:` is the reason the tour leaves it out, in a sentence")
    files = f.get("files") or []
    check(bool(files), f"feature {fid}: no `files`")
    for rel in files:
        check((ROOT / rel).is_file(), f"feature {fid}: {rel} does not exist. The feature moved or was removed: "
              f"fix its row or delete it, with its step and its data-tour hook ({HOW})")
    for surface in f.get("surfaces") or []:
        check(surface in found, f"feature {fid}: it claims {surface}, which the source no longer has. "
              f"The feature moved or was removed: fix its row or delete it, with its step ({HOW})")
        check(surface not in claimed, f"{surface} is claimed by two features, {claimed.get(surface)} and {fid}")
        claimed[surface] = fid
for surface, where in sorted(found.items()):
    check(surface in claimed, f"{surface} ({where}) is a main feature no row of `features` claims. A new rail button, "
          f"sidebar tab or on-demand module was added: decide whether the tour shows it. Add it to a feature's "
          f"`surfaces`, or add a feature with `step:` (and write the step) or `not:` and the reason ({HOW})")

# --- the steps -------------------------------------------------------------------------------------
feature_ids = set(ids)
for s in steps:
    check(s.get("teaches") in feature_ids, f"step {s.get('id')}: it teaches {s.get('teaches')!r}, which is not on the feature list")
    owners = [f["id"] for f in features if f.get("step") == s.get("id")]
    check(bool(owners), f"step {s.get('id')}: no feature says `step: {s.get('id')}`; a step exists to show a feature")
check(str(doc.get("voice_trip") or "") == "onboarding", "voice_trip is the folder the clips are in: onboarding")

# --- the rule is written where people look -----------------------------------------------------------
contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
check("### Add, move or remove a main feature: keep the tour" in contributing and "registry/onboarding.yaml" in contributing
      and "data-tour" in contributing, "CONTRIBUTING.md must have the recipe 'Add, move or remove a main feature: keep the tour' "
      "naming registry/onboarding.yaml and data-tour")
template = (ROOT / ".github" / "PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8")
check("registry/onboarding.yaml" in template, "the pull request template must ask whether a main feature was added, moved or removed, and name registry/onboarding.yaml")

if problems:
    print("the tour is NOT kept up:\n  " + "\n  ".join(problems))
    sys.exit(1)
shown = sum(1 for f in features if "step" in f)
print(f"the tour is kept up: {len(features)} main features, {shown} shown by {len(steps)} steps and {len(features) - shown} left out with a reason; "
      f"{len(found)} rail buttons, tabs and on-demand modules in the source, each claimed by one feature")
