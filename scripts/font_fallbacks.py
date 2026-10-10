#!/usr/bin/env python3
"""The numbers behind the fallback faces in site/css/fonts.css (internal #553, 2026-10-10).

    python3 scripts/font_fallbacks.py            # print the metrics (needs fontTools and brotli)
    python3 scripts/font_fallbacks.py --arial-dir "/System/Library/Fonts/Supplemental"

WHY. The web face lands after the first paint (`font-display: swap`), and the system face that stood in
for it was wider or narrower, so lines re-broke when it arrived. A fallback face is a local system face
(Arial, Arial Bold, Arial Narrow, Courier New) declared under its own family name with `size-adjust`,
`ascent-override`, `descent-override` and `line-gap-override` chosen so its text takes the web face's
width and line height. Put after the web face in a font stack, it is what draws until the web face is
ready. These are the numbers: size-adjust is the ratio of the two faces' average advance over an English
sample (letter frequencies of a text, plus the space), the overrides are the web face's hhea metrics
divided by that ratio, as the CSS Fonts spec defines them. scripts/build-fonts.py holds the printed
result as FALLBACK_FACES and writes it into fonts.css; this script is how the numbers were found.
"""

from __future__ import annotations

import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Letter frequencies of English text (per mille, Lewand 2000) and the space, about 1 in 6 characters.
FREQ = dict(zip("etaoinshrdlcumwfgypbvkjxqz", [127, 91, 82, 75, 70, 67, 63, 61, 60, 43, 40, 28, 28, 24, 24, 22, 20, 20, 19, 15, 10, 8, 2, 2, 1, 1]))
SPACE = 190


def average(font) -> float:
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    upm = font["head"].unitsPerEm
    total = weight = 0.0
    for ch, f in list(FREQ.items()) + [(" ", SPACE)]:
        total += hmtx[cmap[ord(ch)]][0] / upm * f
        weight += f
    return total / weight


def metrics(path: Path):
    from fontTools.ttLib import TTFont
    font = TTFont(path)
    upm = font["head"].unitsPerEm
    h = font["hhea"]
    return {"avg": average(font), "ascent": h.ascent / upm, "descent": -h.descent / upm, "lineGap": h.lineGap / upm}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--arial-dir", type=Path, default=Path("/System/Library/Fonts/Supplemental"))
    args = ap.parse_args()
    d = args.arial_dir
    pairs = [
        ("Inter 400", ROOT / "site/fonts/inter-400-latin.woff2", d / "Arial.ttf", "Arial"),
        ("Inter 600", ROOT / "site/fonts/inter-600-latin.woff2", d / "Arial Bold.ttf", "Arial Bold"),
        ("Barlow Semi Condensed 500", ROOT / "site/fonts/barlow-semi-condensed-500-latin.woff2", d / "Arial Narrow.ttf", "Arial Narrow"),
        ("Barlow Semi Condensed 600", ROOT / "site/fonts/barlow-semi-condensed-600-latin.woff2", d / "Arial Narrow Bold.ttf", "Arial Narrow Bold"),
        ("JetBrains Mono 400", ROOT / "site/fonts/jetbrains-mono-400-latin.woff2", d / "Courier New.ttf", "Courier New"),
    ]
    for name, web, local, local_name in pairs:
        if not local.exists():
            print(f"{name}: {local} is missing on this machine")
            continue
        w, f = metrics(web), metrics(local)
        size = w["avg"] / f["avg"]
        print(f"{name} over {local_name}: size-adjust {size * 100:.2f}%; ascent-override {w['ascent'] / size * 100:.2f}%; "
              f"descent-override {w['descent'] / size * 100:.2f}%; line-gap-override {w['lineGap'] / size * 100:.2f}% "
              f"(avg advance {w['avg']:.4f} vs {f['avg']:.4f} em)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
