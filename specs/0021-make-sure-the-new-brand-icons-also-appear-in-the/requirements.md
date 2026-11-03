# 0021 — Brand icons in the offline zip — requirements

Card: [#501](https://github.com/Sara-Managed-Projects/space-radar/issues/501). The new mark
shipped in #499 (favicon, home-screen icons, press kit). The exit criterion is that the offline
release zip's icons match that mark, checked by extracting a build and comparing icon files.

The filing note says nobody clicked the card. Say that in the PR.

## What is true today

Measured 25 Oct 2026, against this checkout (`3b78db57`) and the published asset
`space-radar-1.3.0.zip` (95 034 735 bytes, tag `v1.3.0`, commit `d1301902`, published 21 Oct 2026).

- `scripts/build_release.py` copies the whole of `site/` into the zip (`shutil.copytree`), then
  `scripts/stamp_sw.py` precaches `images/icons/*.png`. A release cut from a tree that has the new
  files will carry them. Nothing in the builder swaps in an older icon.
- The four files in the published zip are byte-identical to `site/images/icons/` here, and those
  blobs are the #499 blobs (`5642be26`), not the parent of that commit. Full SHA-256 matched for
  each. The worker in the zip records the first 16 hex chars, and those match too:

  | file | sha256 prefix |
  |---|---|
  | `apple-touch-icon.png` | `e19f358378829f29` |
  | `icon-192.png` | `b40cf69f9ac04f1d` |
  | `icon-512.png` | `4e72b7da5f585c72` |
  | `icon-maskable-512.png` | `d83fc5f84e6eb9b3` |

- The zip's `site/index.html` favicon is the new inline SVG (`viewBox='0 0 64 64'`). The old mark
  (`stroke-dasharray`, a dashed ring) is not in that file. The line is the same as this checkout.
- The zip has no `templates/press/*.svg` and no `/press/` page. `scripts/build_press.py` says the
  press page is not part of `site/`, on purpose, so the screenshots are not in every offline copy.
- `tests/test_release_zip.py` does not compare any of this. The fixture writes 8 bytes to
  `icon-192.png` and does not create the other three. `verify()` only checks that the manifest
  JSON has an `icons` array. A zip that named `icon-512.png` and did not contain it would pass.

Inferred, not unpacked: `v1.0.0`, `v1.1.0` and `v1.2.0` are descendants of `5642be26`, and the
release workflow already copied `site/` by then. Only `v1.3.0` was extracted.

## Requirements

1. **R1 — the zip's four PNGs match the tree.** After `scripts/build_release.py` runs, each of
   `site/images/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and
   `icon-maskable-512.png` in the zip is byte-identical to the same path in the checkout that was
   zipped.
2. **R2 — the fixture cannot satisfy R1 with a stub.** The test copies those four files from this
   repository into the small checkout. The comparison is against the repository files, not against
   whatever the fixture invented.
3. **R3 — the favicon in the zip is the page's favicon.** The zip's `site/index.html` contains the
   same `<link rel="icon" ...>` line as `site/index.html` in the repository. The fixture page
   includes that line, copied from the repository, so the check is on the zip member.
4. **R4 — a missing icon fails the build.** `verify()` refuses, and names the path, when a
   manifest `icons[].src` is missing, empty, absolute, or escapes `site/`. If `index.html` has an
   `apple-touch-icon` link, that file gets the same check. The test builds a good zip, deletes
   `site/images/icons/icon-512.png` from it, and expects the refusal.
5. **R5 — the offline shell lists them.** The stamped worker's `shell` includes the four PNG
   paths, each with the first 16 hex chars of that file's SHA-256.
6. **R6 — no new release in the implementation PR.** `v1.3.0` already matches. The PR says it
   re-checked, or says it could not download the asset. It does not tag and it does not publish.

## Acceptance criteria

- A1. `python3 tests/test_release_zip.py` hashes the four PNGs out of the zip and they equal the
  repository files (R1, R2).
- A2. The same run finds the repository's favicon line in the zip's `index.html` (R3).
- A3. `verify()` on a zip with `icon-512.png` removed names that path and does not pass (R4).
- A4. The stamped shell's four icon hashes equal the files' SHA-256 prefixes (R5).
- A5. The existing release-zip checks still pass, including the refusals and the `.sha256`.
- A6. The implementation PR records the `v1.3.0` extract. It publishes nothing (R6).

## Out of scope

- The press kit. The three SVGs and `scripts/build_press.py`'s page stay out of the zip, screenshots
  included. The card's icons are the four PNGs and the favicon.
- A new GitHub release, a rebuild of `v1.3.0`, or a changelog line. The bytes are already in the
  latest zip.
- Replacing the inline favicon with a file, or changing the mark's drawing.
- Object pages and the 404. `scripts/build_seo.py` writes those at deploy, not into this zip.
