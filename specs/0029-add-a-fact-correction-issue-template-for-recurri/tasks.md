# 0029 — The fact-correction form is already in the chooser — tasks

Issue: [#577](https://github.com/Sara-Managed-Projects/space-radar/issues/577). Spec only in this
PR. The form is already `data-accuracy.yml`. The later turn confirms that and closes the issue.

- [ ] T1. On current `main`, read `.github/ISSUE_TEMPLATE/data-accuracy.yml`. The name is
  "A number, name or position is wrong". Labels are `bug` and `area:space-accuracy`. Ids are
  `object`, `says`, `truth`, `when`, and the first three are required (R1, A1). On Sun 25 Oct
  2026, at `f2065e01`, that was the file. It was added in #463 on Mon 5 Oct 2026.
- [ ] T2. Count the forms. Seven yml files besides `config.yml`, and this file is one of them
  (R2, A2). `tests/test_community_files.py` keeps `len(forms) == 7`.
- [ ] T3. The string `template=data-accuracy.yml` is still in `README.md`, `CONTRIBUTING.md`,
  `SUPPORT.md`, `docs/CONTRIBUTE_WITHOUT_CODE.md`, and `scripts/seo_common.py` (R3, A3).
- [ ] T4. If T1–T3 hold: do not edit `.github/ISSUE_TEMPLATE/` or `tests/`. Close #577. The
  comment names the file, the visible name, #463, and whether the chooser page was opened
  (R4, A4).
- [ ] T5. If the file is missing, or the name or the ids differ: restore the copy from
  `f2065e01`. Do not add a second form. Repeat T1 and T2. Then close #577 (R5).
- [ ] T6. If a signed-in session can open the New issue chooser and the name is not listed,
  leave #577 open and record what the page showed (design step 6).

## Test list

No new test. The guard is already `tests/test_community_files.py`.

1. Seven forms. Each has a name, a description, a body, labels, unique ids, and one required
   field. `data-accuracy.yml` is in that seven.
2. On this host, Sun 25 Oct 2026, the file exited 1 with only `social preview`, because `PIL`
   is not installed. CI installs Pillow in the seo job before this test. A `PIL`-only failure
   does not fail A1.
