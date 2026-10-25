# 0031 — Every card sentence stays within 160 characters — design

## What is wrong

The cap is eight separate comparisons. A refusal case sits beside seven of them. `overlays.yaml`
`what` is the one with a comparison and no case. Exotic `why` and deep-sky `why` are the same
paragraph as a famous star's `why`, and they have neither.

```
stars-notable.yaml why  ->  len > 160 refused     card prints the whole paragraph
exotics.yaml why        ->  no length check        same paragraph, 8 lines already over
dso-hand.yaml why       ->  no length check        same paragraph, ngc-2419 is 175
overlays.yaml what      ->  len > 160 refused     no refusal case
```

`cardfacts.js` says the paragraph is not sliced at 160. That is the UI. The star checker holds
the line where it is written so the paragraph never needs a slice. The other two files of the
same paragraph do not.

## The nine lines

Rewrite these, then regenerate. Do not drop a second sentence that corrects the first.
`ngc-2419` still says the cluster is not leaving the galaxy.

Exotic `why`: `wd-j1330-6435` (210), `sgr-1806-20` (207), `hulse-taylor` (207),
`grs-1915-105` (191), `psr-j1614-2230` (180), `3c-273` (176), `eta-carinae` (174),
`3c-279` (166).

Deep-sky `why`: `ngc-2419` (175).

```
python3 scripts/gen_exotics_js.py
python3 scripts/gen_exotics_js.py --check
python3 scripts/build-dso.py --refresh
python3 scripts/build-dso.py --check
```

`--refresh` reads `registry/dso-hand.yaml` and the `site/data/dso.json` already in the tree.
Measured from `refresh()` in `scripts/build-dso.py`. No fetch.

The new failure for both files names the file, the row id, `why`, the length, and 160. Place the
deep-sky length check on the YAML string in the same pass as the JSON comparison, with no
`continue` between them. A test copy that changes only the YAML will also report the mismatch.
The mismatch line does not contain `160`. The length line has to be there too.

## The loop

One list in `tests/test_refusals.py`, run by one function, beside the existing cases. Ten rows.

| File | Field | Sentence the row lengthens |
| --- | --- | --- |
| `tours.yaml` | card body, first sentence | the thumbprint sentence the tour case already finds |
| `stars-notable.yaml` | `why` | `One point of light, six stars in three pairs.` |
| `oddities.yaml` | `fact` | `You wear the silver astronaut pin` |
| `oddities.yaml` | `cite` | `Astronomical Returns, The astronaut pin and the lone star on the Moon` |
| `oddities.yaml` | `shape.departure` | the camera-part departure the oddity case already finds |
| `sites.yaml` | `doing` | `Driving up a mountain of layered rock since 2012.` |
| `glossary.yaml` | `say` | the L2 sentence the glossary case already finds |
| `overlays.yaml` | `what` | `The temperature of the sea's top layer, from satellites and buoys, gaps filled.` |
| `exotics.yaml` | `why` | `gaia-bh3`, 106 characters, which R3 does not rewrite |
| `dso-hand.yaml` | `why` | `sextans-dwarf`, 80 characters, which R3 does not rewrite |

The replacement is 161 characters, ends in `.`, and has no `. ` in it, so a tour split on `. `
still sees one sentence of 161. `"A" * 160 + "."` is that string. It has no year, no `--`, and
none of the `TIME_RELATIVE` phrases.

The harness is the one `check_registry_refusals` already uses: a copy of `registry/` and
`scripts/`, the real `site/data/dso.json` linked in. Exit non-zero is not enough. The output
contains the file name and `160`.

The glossary row also runs once with `"A" * 159 + "."` (160 characters) and expects the checker
to accept the tree. That is the difference between `>` and `>=`.

## The count

```
len(re.findall(r">\s*MAX_SENTENCE", scripts/check_registry.py)) == len(rows)
```

Today that pattern matches eight times. After R2 it matches ten, once per row. A comment and an
f-string `{MAX_SENTENCE}` do not match. A new field written as `>= MAX_SENTENCE` does not match
either, and R5 is what catches a boundary written the wrong way on the glossary.

## CI

In `.github/workflows/ci.yml`, the step that runs `python3 tests/test_refusals.py` changes its
name only. The command stays. Suggested name:

```
The validator actually refuses, and every card sentence is held to 160 characters (#915)
```

## Risks

- **The deep-sky mismatch hides the missing cap.** The linked `dso.json` still has the old line,
  so the checker already refuses the file. The row requires `160` in the output.
- **Identical letters trip some other rule.** If `"A" * 160 + "."` is refused without `160` in
  the message, pad a real sentence to 161 the way `GLOSSARY_SAY_OVER_CAP` does, and keep the
  `160` assertion.
- **R3 rewrites the anchor.** `gaia-bh3` and `sextans-dwarf` are inside the cap today. Leave
  them. Lengthen those, not `wd-j1330-6435` or `ngc-2419`.
- **The old deep-sky check stays narrow.** `tests/test_dso.mjs` caps the 31 rows dated
  2026-09-22. Leave that filter. The registry cap is what covers `ngc-2419`.
- **A field nobody added to the list.** The count locks the comparisons to the rows. A prose
  field with no comparison and no row is still invisible. Shower notes, ladder tooltips, alias
  justifications, and oddity notes were measured and left out on purpose. A new card sentence
  is a row in this list in the same change.
