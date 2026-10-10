#!/usr/bin/env python3
"""Subset the three faces into site/fonts/ and write site/css/fonts.css (spec 0045 task 2).

    python3 scripts/build-fonts.py --cache DIR         # subset DIR's upstream files, write both
    python3 scripts/build-fonts.py --check             # the committed files are the ones recorded
    python3 scripts/build-fonts.py --check --cache DIR # ...and DIR re-subsets to the same bytes
    python3 scripts/build-fonts.py --cache DIR --only inter   # one family; the rest stay

WHY A SCRIPT. A WOFF2 subset is a decision about which characters and which OpenType features a
visitor downloads, and a file whose making lives in somebody's terminal cannot be remade when the
copy grows a character. So the upstream files, their SHA-256, the ranges and the features are all
here, and this is the only thing that turns them into bytes. The upstream files are not committed
(tens of MB for Inter's release); download them once into DIR under the names in FACES.

THE FACES (design-language amendment 2026-09-28). Inter 400 and 600 for the interface, Barlow
Semi Condensed 500 and 600 for panel titles and HUD units, JetBrains Mono 400 and 500 for every
number that ticks. All SIL OFL 1.1, none declaring a Reserved Font Name, so a subset may keep its
name. Bricolage Grotesque is not loaded.

NO SERIF. Spec 0061 task 5 added Instrument Serif 400 for the wordmark, a card's name, a trip's
titles and the first Right-now line; Ivan rejected it on 2026-10-03 (it read worse than the sans it
replaced), the roles went back to Inter and Barlow, and task 6 removed the face, its file, its
licence text and its budget row. tests/test_tokens.mjs holds the faces to these three.

THE SPLIT. Each face is cut into a Latin file and a Cyrillic file with the same `unicode-range`
the browser reads, so an English page never asks for a Cyrillic file. Barlow Semi Condensed has no
Cyrillic glyphs at all (measured: 0 of U+0400-045F in 1.408), so it has no Cyrillic file, and a
Cyrillic panel title falls through the stack to Inter.

WHAT A SUBSET KEEPS. fontTools' default layout features (kerning, ligatures, marks) and `tnum` for
Inter and Barlow, whose default figures are proportional: `font-variant-numeric: tabular-nums` does
nothing without it. JetBrains Mono drops `calt`, its programming ligatures (`->` drawn as an arrow),
which halves its Latin file and which no number or unit wants. No hinting: every screen this app
targets renders WOFF2 outlines unhinted anyway.

--check needs only the standard library: CI runs it. Rebuilding needs fontTools and brotli
(`pip install fonttools brotli`; built with fontTools 4.60.2), and a different fontTools may write
different bytes, which is why the recorded hashes and not a rebuild are the check.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "site" / "fonts"
CSS = ROOT / "site" / "css" / "fonts.css"

# Google Fonts' own Latin range, plus the four characters the copy uses beyond it: ° × thin-space ≈.
LATIN = ("U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, "
         "U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+00B0, U+00D7, U+2009, U+2248")
CYRILLIC = "U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116"
SUBSETS = {"latin": LATIN, "cyrillic": CYRILLIC}

# (family, slug, weight, upstream file in DIR, its sha256, where it comes from, features, subsets)
FACES = [
    ("Inter", "inter", 400, "Inter-Regular.ttf", "40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82",
     "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip extras/ttf/", ("+tnum",), ("latin", "cyrillic")),
    ("Inter", "inter", 600, "Inter-SemiBold.ttf", "78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3",
     "https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip extras/ttf/", ("+tnum",), ("latin", "cyrillic")),
    ("Barlow Semi Condensed", "barlow-semi-condensed", 500, "BarlowSemiCondensed-Medium.ttf",
     "4998b693a190b76f2b11315844345a8546c1e2e6a320905507a9eed04edf8b48",
     "https://github.com/google/fonts/raw/main/ofl/barlowsemicondensed/", ("+tnum",), ("latin",)),
    ("Barlow Semi Condensed", "barlow-semi-condensed", 600, "BarlowSemiCondensed-SemiBold.ttf",
     "bd299f4bc5b44d30be8d42e9bad3a5df7d66af1cd55d0ed72a8b8916360a1424",
     "https://github.com/google/fonts/raw/main/ofl/barlowsemicondensed/", ("+tnum",), ("latin",)),
    ("JetBrains Mono", "jetbrains-mono", 400, "JetBrainsMono-Regular.ttf", "a0bf60ef0f83c5ed4d7a75d45838548b1f6873372dfac88f71804491898d138f",
     "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip fonts/ttf/", ("-calt",), ("latin", "cyrillic")),
    ("JetBrains Mono", "jetbrains-mono", 500, "JetBrainsMono-Medium.ttf", "31c92d01a8a08528b718a43addf0ad3df0af2ca4b7b3290a452f70f358e14d3d",
     "https://github.com/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip fonts/ttf/", ("-calt",), ("latin", "cyrillic")),
]

# The licence beside the files, one per family, byte for byte the upstream text.
LICENCES = {
    "OFL-Inter.txt": "262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a",
    "OFL-BarlowSemiCondensed.txt": "186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f",
    "OFL-JetBrainsMono.txt": "30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad",
}

# BEGIN OUTPUTS (written by --cache; the sha256 of each committed file)
OUTPUTS: dict[str, str] = {
    "barlow-semi-condensed-500-latin.woff2": "fbeb895bea7ba5e32b91207fce52e16df24c7454475da6f7b0898e4f80c348ab",
    "barlow-semi-condensed-600-latin.woff2": "1044b111b4be58e5fa2fe8b661b3bb764cd6997df1bd05cb71c7a9c81121d359",
    "inter-400-cyrillic.woff2": "aad577b057e0e7bf553a8c9c3befe8df1457dbe25e3ea26863be219a89f166aa",
    "inter-400-latin.woff2": "ef264966baab13a24d505ae8417d0294d4da94d7d605d3be01d3434df59337ef",
    "inter-600-cyrillic.woff2": "f4c1d50b92e822f986d2935fb6bff697e98a374ad4252f4f1eec18ad9b397723",
    "inter-600-latin.woff2": "79739116ffdf578adcb16aea5b13460d4a734b6f17031524842047dad1d89e32",
    "jetbrains-mono-400-cyrillic.woff2": "35cbb2e2d442c1147d47adbc30eef69d70eba78dadb8ed08a4d873a3edb4ee75",
    "jetbrains-mono-400-latin.woff2": "0a813f573e719f4e1d6d0919b43410523c8e692a15504ed3f7d79f16726504e6",
    "jetbrains-mono-500-cyrillic.woff2": "5a98922978969dbf0c47ae9bf5275822de058002217bae3276fee2419afe900b",
    "jetbrains-mono-500-latin.woff2": "c3b8617c60beb3d5b63bb7271df513fc71a91b09edaf8471e5a13ac5cc2d2b3a",
}
# END OUTPUTS


def files() -> list[tuple[tuple, str, str]]:
    """Every file this script makes: (face, subset name, file name)."""
    return [(face, sub, f"{face[1]}-{face[2]}-{sub}.woff2") for face in FACES for sub in face[7]]


# THE FALLBACK FACES (internal #553, 2026-10-10). A local system face under its own family name, with
# size-adjust and the vertical overrides chosen so it takes the web face's width and line height: put
# after the web face in a font stack (css/ui.css), it is what draws until the web face lands, and the
# swap moves nothing. The numbers come from scripts/font_fallbacks.py (the average advance of an English
# letter sample in the subset against the system face; the hhea metrics divided by that ratio). The
# system face is Arial/Courier New wherever they exist (Mac, Windows); a machine without them goes on to
# the next name in the stack, as it did before.
# (family, weight, local faces, size-adjust %, ascent %, descent %, line-gap %)
FALLBACK_FACES = [
    ("Inter Fallback", 400, ("Arial",), 107.45, 90.16, 22.45, 0.0),
    ("Inter Fallback", 600, ("Arial Bold",), 101.27, 95.66, 23.82, 0.0),
    ("Barlow Semi Condensed Fallback", 500, ("Arial Narrow",), 108.45, 92.21, 18.44, 0.0),
    ("Barlow Semi Condensed Fallback", 600, ("Arial Narrow Bold",), 101.36, 98.66, 19.73, 0.0),
    ("JetBrains Mono Fallback", 400, ("Courier New",), 99.98, 102.02, 30.0, 0.0),
]


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def css() -> str:
    lines = [
        "/* GENERATED by scripts/build-fonts.py. Do not edit: change the script and rebuild.",
        "",
        "   The three faces (spec 0045), self-hosted and subset. `unicode-range` is what keeps an English",
        "   page from asking for a Cyrillic file, and the browser fetches a face only when some text on",
        "   screen uses it, so what a first visit downloads is decided by the first screen, not by this",
        "   list. `swap`: the system face first, the web face when it lands. */",
        "",
    ]
    for (family, _slug, weight, *_rest), sub, name in files():
        lines += [
            "@font-face {",
            f"  font-family: '{family}';",
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  font-display: swap;",
            f"  src: url('../fonts/{name}') format('woff2');",
            f"  unicode-range: {SUBSETS[sub]};",
            "}",
            "",
        ]
    lines += [
        "/* The fallback faces (internal #553): a system face scaled to the web face's width and line height,",
        "   named after it, so the swap does not move a line. scripts/font_fallbacks.py has the numbers. */",
        "",
    ]
    for family, weight, local, size, ascent, descent, gap in FALLBACK_FACES:
        lines += [
            "@font-face {",
            f"  font-family: '{family}';",
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  src: " + ", ".join(f"local('{n}')" for n in local) + ";",
            f"  size-adjust: {size:.2f}%;",
            f"  ascent-override: {ascent:.2f}%;",
            f"  descent-override: {descent:.2f}%;",
            f"  line-gap-override: {gap:.2f}%;",
            "}",
            "",
        ]
    return "\n".join(lines)


def subset(src: Path, sub: str, features: tuple[str, ...]) -> bytes:
    from fontTools import subset as fts  # only a rebuild needs fontTools
    from fontTools.ttLib import TTFont

    opts = fts.Options()
    opts.flavor = "woff2"
    opts.hinting = False
    opts.desubroutinize = True
    for f in features:
        if f.startswith("+"):
            opts.layout_features.append(f[1:])
        else:
            opts.layout_features = [x for x in opts.layout_features if x != f[1:]]
    # The upstream `head.modified`, not now: a rebuild that stamps the clock is never byte-identical.
    font = TTFont(src, recalcTimestamp=False)
    s = fts.Subsetter(opts)
    s.populate(unicodes=fts.parse_unicodes(SUBSETS[sub].replace(" ", "")))
    s.subset(font)
    out = io.BytesIO()
    font.flavor = "woff2"
    font.save(out)
    return out.getvalue()


def build(cache: Path, only: str | None = None) -> dict[str, bytes]:
    """Subset every face, or with `only` one family's: the others keep their committed bytes, so
    adding a face does not need every other family's upstream release on disk."""
    made = {}
    for face, sub, name in files():
        if only and face[1] != only:
            made[name] = (FONTS / name).read_bytes()
            continue
        src = cache / face[3]
        if not src.is_file():
            sys.exit(f"{src} is missing: download it from {face[5]}")
        if sha(src.read_bytes()) != face[4]:
            sys.exit(f"{src} is not the upstream file this script was written against (sha256 differs)")
        made[name] = subset(src, sub, face[6])
    return made


def write_outputs(made: dict[str, bytes]) -> None:
    me = Path(__file__)
    text = me.read_text(encoding="utf-8")
    block = "OUTPUTS: dict[str, str] = {\n" + "".join(f'    "{n}": "{sha(b)}",\n' for n, b in sorted(made.items())) + "}\n"
    text = re.sub(r"(# BEGIN OUTPUTS[^\n]*\n).*?(# END OUTPUTS)", lambda m: m.group(1) + block + m.group(2), text, flags=re.S)
    me.write_text(text, encoding="utf-8")


def check(cache: Path | None) -> list[str]:
    problems = []
    want = {name for _f, _s, name in files()}
    if set(OUTPUTS) != want:
        problems.append(f"the recorded outputs {sorted(OUTPUTS)} are not the files FACES makes {sorted(want)}; rebuild")
    for name in sorted(want):
        p = FONTS / name
        if not p.is_file():
            problems.append(f"site/fonts/{name} is missing")
        elif sha(p.read_bytes()) != OUTPUTS.get(name):
            problems.append(f"site/fonts/{name} is not the file this script made (sha256 differs); rebuild with --cache")
    for p in sorted(FONTS.glob("*")) if FONTS.is_dir() else []:
        if p.name not in want and p.name not in LICENCES:
            problems.append(f"site/fonts/{p.name} ships and this script does not make it: deploy.sh would push it anyway")
    for name, digest in LICENCES.items():
        p = FONTS / name
        if not p.is_file() or sha(p.read_bytes()) != digest:
            problems.append(f"site/fonts/{name} is missing or is not the upstream licence text")
    if not CSS.is_file() or CSS.read_text(encoding="utf-8") != css():
        problems.append("site/css/fonts.css is not what this script writes; rebuild")
    credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
    for family in sorted({f[0] for f in FACES}):
        if not re.search(rf"^\| {re.escape(family)} \|[^\n]*SIL OFL 1\.1", credits, re.M):
            problems.append(f"CREDITS.md has no row for {family} under the SIL OFL 1.1")
    if cache is not None:
        for name, data in build(cache).items():
            if (FONTS / name).is_file() and (FONTS / name).read_bytes() != data:
                problems.append(f"{name}: {cache} re-subsets to different bytes (a different fontTools?)")
    return problems


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--cache", type=Path, help="the directory holding the upstream files")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--only", metavar="SLUG", choices=sorted({f[1] for f in FACES}), help="rebuild this family only")
    a = ap.parse_args(argv)
    if a.check:
        problems = check(a.cache)
        if problems:
            print("fonts: " + "\n  ".join(["problems:"] + problems))
            return 1
        print(f"fonts ok: {len(OUTPUTS)} subsets as recorded, fonts.css current, three licences, three credits")
        return 0
    if a.cache is None:
        ap.error("--cache DIR is required to build")
    made = build(a.cache, a.only)
    FONTS.mkdir(parents=True, exist_ok=True)
    for name, data in made.items():
        (FONTS / name).write_bytes(data)
        print(f"{len(data):>7} B  site/fonts/{name}")
    CSS.write_text(css(), encoding="utf-8")
    write_outputs(made)
    print("wrote site/css/fonts.css and the OUTPUTS table in this script")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
