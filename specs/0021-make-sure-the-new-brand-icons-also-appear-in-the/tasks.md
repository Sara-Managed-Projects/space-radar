# 0021 — Brand icons in the offline zip — tasks

Issue: [#501](https://github.com/Sara-Managed-Projects/space-radar/issues/501). Implemented in
this PR. The filing note says nobody clicked the card.

- [x] T1. `tests/test_release_zip.py` `make_checkout`: copy the four real PNGs from
  `site/images/icons/`. Stop writing the 8-byte `icon-192.png`. Put the repository's
  `<link rel="icon">` line, and the apple-touch link, on the fixture page (R2, R3).
- [x] T2. Same file, after the good build: hash the four zip members against the repository, and
  find the favicon line in the zip's `index.html` (A1, A2).
- [x] T3. Same file: the stamped shell lists the four PNGs with `sha256` prefixes of 16 hex
  chars (A4, R5).
- [x] T4. `scripts/build_release.py` `verify()`: a manifest icon or an apple-touch target that
  is missing, empty, absolute, or outside `site/` is a refusal that names the path (R4).
- [x] T5. Section 5 of the test: remove `site/images/icons/icon-512.png` from a built zip and
  expect that refusal (A3). The checks that already exist still pass (A5).
- [x] T6. `scripts/test.sh` `QUICK_MAP`: `site/images/icons/` and `site/index.html` also name
  `tests/test_release_zip.py`.
- [x] T7. Run `python3 tests/test_release_zip.py`. In the PR, say the `v1.3.0` zip was extracted
  on 25 Oct 2026 and the four hashes matched, or say the asset could not be downloaded. Do not
  tag a release (A6).

## Test list

`python3 tests/test_release_zip.py` (the script's `check()` calls, not a new file)

1. Four zip PNGs match `site/images/icons/` byte for byte — A1, R2.
2. The zip's `index.html` contains the repository favicon line — A2.
3. `BUILD.shell` has the four icon paths and their 16-char hashes — A4.
4. `verify()` names a removed `icon-512.png` — A3.
5. Existing sections 1 to 6 still pass, including the seven refusals and the `.sha256` — A5.
