# 0021 — Brand icons in the offline zip — design

## What is wrong

The latest zip already has the new mark. The check that was supposed to notice does not look at
the icon files.

```
site/images/icons/*.png  +  the favicon line in site/index.html
        |  copytree (the whole of site/)
        v
space-radar-<version>.zip
        |  verify(): manifest JSON has an icons array?  yes -> pass
        v
CI green, even if icon-512.png was never in the tree the test built
```

`make_checkout` writes `b"\x89PNG\r\n\x1a\n"` to `icon-192.png` and copies the real manifest,
which names three icons. `verify()` never opens them. `stamp_sw.py` would precache whatever PNGs
are actually there, and the test only asserts that `js/main.js` and `index.html` are in the shell.

## The check

Stay inside `tests/test_release_zip.py` and `verify()` in `scripts/build_release.py`. No new
script. The small checkout stays small: four PNGs are about 55 KB.

1. Copy the four repository PNGs into the fixture with `shutil.copy2`. Delete the 8-byte write.
2. Read the `<link rel="icon" ...>` line out of the repository `site/index.html` and put that
   exact line on the fixture page, plus the apple-touch line the real page already has
   (`images/icons/apple-touch-icon.png`).
3. After a successful build, read the four members and the fixture's icon line back out of the
   zip. Bytes equal the repository PNGs. The icon line is in the zip's `index.html`.
4. From the stamped `BUILD.shell`, the four paths are present and each hash is
   `sha256(file).hexdigest()[:16]`, the same cut `stamp_sw.py` uses (`HASH_CHARS = 16`).
5. `verify()` walks `manifest["icons"]`. For each `src`:
   - refuse if it is absolute (`scheme:` or a leading `/`) or if the normalised path leaves `site/`;
   - refuse if `site/<src>` is missing or empty, and put `src` in the message.
   The apple-touch href, when the page has one, uses the same rule. A page with no such link
   does not fail. That keeps a future minimal fixture honest without demanding the link.
6. Section 5 of the test already rebuilds a zip with one member removed. Add
   `site/images/icons/icon-512.png` to that list so R4 has an input that trips it.

`scripts/test.sh` `QUICK_MAP`: append `tests/test_release_zip.py` to the `site/images/icons/`
row and the `site/index.html` row. CI already runs the file on every pull request
(`.github/workflows/ci.yml`). The map is only the local fast loop.

## What does not change

`BESIDE` and `PROMISED` stay as they are. The icons are not a second promise list. They are
whatever the manifest and the page name, compared to the tree.

`scripts/build_press.py` stays out of `release.yml`. Adding the press page would pull
`assets/screenshots/` into a classroom zip, which that script's own comment refuses.

No tag, no `gh release create`, no edit to `CHANGELOG.md` or `ROADMAP.md`.

## Risks

- **Order.** Tightening `verify()` before the fixture has all four PNGs makes the current test
  fail for a missing `icon-512.png`. Copy the files first, in the same change.
- **A later mark.** The test follows the repository files. A redraw that updates
  `site/images/icons/` and the favicon line together still passes. A zip that drifts from those
  files fails. That is the exit criterion.
- **Older zips.** `v1.0.0` through `v1.2.0` were not extracted. They are not republished. If
  someone needs those bytes, that is a separate download, not this change.
