#!/usr/bin/env python3
"""scripts/check_truth.py refuses a row whose field is absent from either file (spec 0043, task 2)."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import check_truth  # noqa: E402

REG = "def f():\n    stop.get('frame_radii')\n"
REF = "('a framing', 'frame_radii: 1', 'frame_radii: 0')\n"
GOOD = "fields:\n  - {field: 'frame_radii:', refused_when: x, test: test_refusals.py}\n"
bad = 0


def expect(name, truth, reg, ref, fragment):
    global bad
    errs = check_truth.check(truth, reg, ref)
    ok = (not errs) if fragment is None else any(fragment in e for e in errs)
    print(("  ok: " if ok else "  ** ") + name + ("" if ok else f" -> {errs}"))
    bad += 0 if ok else 1


expect("a row both files know is accepted", GOOD, REG, REF, None)
expect("a row for `nonsense:` is refused", GOOD.replace("frame_radii", "nonsense"), REG, REF, "never mentions")
expect("a field the validator knows but no case breaks is refused", GOOD, REG, "", "no case that breaks")
expect("a field no refusal code mentions is refused", GOOD, "", REF, "never mentions")
expect("a row with no refused_when is refused", GOOD.replace("refused_when: x, ", ""), REG, REF, "refused_when")
expect("a field listed twice is refused", GOOD + GOOD.split("\n", 1)[1], REG, REF, "listed twice")
expect("a test that is not a file is refused", GOOD.replace("test_refusals.py", "test_nothing.py"), REG, REF, "not a file")
expect("an empty table is refused", "fields: []\n", REG, REF, "no `fields:`")
# and the shipped tree
expect("the shipped table agrees with the shipped code",
       (ROOT / "registry/truth.yaml").read_text(encoding="utf-8"),
       (ROOT / "scripts/check_registry.py").read_text(encoding="utf-8"),
       (ROOT / "tests/test_refusals.py").read_text(encoding="utf-8"), None)
sys.exit(1 if bad else 0)
