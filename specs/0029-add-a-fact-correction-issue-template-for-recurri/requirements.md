# 0029 — The fact-correction form is already in the chooser — requirements

Card: [#577](https://github.com/Sara-Managed-Projects/space-radar/issues/577).
The exit criterion is a form for a data or fact correction in `.github/ISSUE_TEMPLATE`, visible
when someone clicks New issue.
Filed by the daily improvement round of 10 Oct 2026. Nobody clicked it.
The round named [#565](https://github.com/Sara-Managed-Projects/space-radar/pull/565) and the check
requests [#553](https://github.com/Sara-Managed-Projects/space-radar/issues/553) and
[#547](https://github.com/Sara-Managed-Projects/space-radar/issues/547). The same pattern includes
[#542](https://github.com/Sara-Managed-Projects/space-radar/issues/542), the Chang'e 4 coordinates,
closed 20 Oct 2026.

## What is true today

Measured in this checkout (`f2065e01`), Sun 25 Oct 2026. Times are UTC.

- `.github/ISSUE_TEMPLATE/data-accuracy.yml` was added in
  [#463](https://github.com/Sara-Managed-Projects/space-radar/pull/463), commit `c4074303`,
  Mon 5 Oct 2026 23:44. The card was opened Sat 10 Oct 2026 06:10.
- The name is "A number, name or position is wrong". The description is "Space Radar says
  something that is not true, or draws something in the wrong place." Labels are `bug` and
  `area:space-accuracy`. Both labels exist on the repository (46 labels listed that day).
- Fields: `object`, `says` and `truth` are required. `when` is optional. The ids are unique.
- [#598](https://github.com/Sara-Managed-Projects/space-radar/pull/598), commit `a70f84a5`,
  Sat 10 Oct 2026 15:04, added the paragraph that names `registry/sites.yaml`,
  `registry/tours.yaml`, `scripts/check.sh`, and the contribute-without-code guide. The four
  fields were already in the 5 Oct file.
- The directory holds seven forms besides `config.yml`: `bug.yml`, `classroom.yml`,
  `data-accuracy.yml`, `idea.yml`, `simulator.yml`, `translation.yml`, `trip-or-content.yml`.
  `tests/test_community_files.py` requires exactly seven, and requires each to have a name, a
  description, a body, labels, unique ids, and one required field.
- `config.yml` leaves blank issues enabled and lists three contact links.
- These files already contain `template=data-accuracy.yml`: `README.md`, `CONTRIBUTING.md`,
  `SUPPORT.md`, `docs/CONTRIBUTE_WITHOUT_CODE.md`, and `scripts/seo_common.py`
  (`ACCURACY_FORM`).
- #553, #547 and #542 are written as Why / Where / What to change / How to check / Done when.
  A search of this repository's issues for "What does Space Radar say" returned no issues.
- `python3 tests/test_community_files.py` on this host exited 1. The only line was
  `social preview:`. `scripts/build_social_preview.py --check` raised
  `ModuleNotFoundError: No module named 'PIL'`. The form checks run before that step and added
  nothing to the failure list. CI installs Pillow before the same test (the seo job in
  `.github/workflows/ci.yml`).

Could not look: the New issue page. Fetches of
`https://github.com/Sara-Managed-Projects/space-radar/issues/new/choose` and of
`.../issues/new?template=data-accuracy.yml` returned GitHub's sign-in page. A GraphQL
`repository.issueTemplates` query returned an empty list. This folder has no markdown templates.

## Requirements

1. **R1 — the correction form stays this file.** `.github/ISSUE_TEMPLATE/data-accuracy.yml`
   keeps its name, description, the two labels, the four fields, and the paragraph from #598.
   No second correction form.
2. **R2 — the count stays seven.** `tests/test_community_files.py` keeps `len(forms) == 7`.
   An eighth yml form fails that line. Leave the number at seven.
3. **R3 — the existing links stay.** The five files listed above keep
   `template=data-accuracy.yml`. No new page.
4. **R4 — an empty diff closes the card.** The implementation turn re-reads the file on current
   `main`. If R1 still holds, it changes nothing under `.github/ISSUE_TEMPLATE/` or `tests/`.
   It closes [#577](https://github.com/Sara-Managed-Projects/space-radar/issues/577). The comment
   names the file, the name a person sees, pull request #463, and whether that turn could open
   the chooser page. On 25 Oct this host could not.
5. **R5 — a missing form is restored as this file.** If the file is gone, or it no longer has
   the name and the four ids, put back the copy on `f2065e01`. Do not add a differently named
   form. Re-run the form checks. Then close #577.

## Acceptance criteria

- A1. `data-accuracy.yml` has the name, the two labels, and ids `object`, `says`, `truth`,
  `when`, with the first three required (R1).
- A2. There are seven forms, and `data-accuracy.yml` is one of them (R2).
- A3. The five files still contain `template=data-accuracy.yml` (R3).
- A4. If A1 holds, no file under `.github/` or `tests/` changes, and #577 is closed with the
  comment in R4.
- A5. A `PIL` failure of `test_community_files.py` is a preview failure. The form lines are the
  ones that name a yml file. On 25 Oct they were absent (the failure list had only
  `social preview`).

## Out of scope

- Rewriting #553, #547 or #542 into the form. Each reviews many rows. The form is one object
  and one correction.
- A template for the Why / Where / What to change issues. The card's exit criterion is the
  New issue chooser.
- Installing Pillow on this host, and the social preview.
- Editing the prose that already points at the form.
