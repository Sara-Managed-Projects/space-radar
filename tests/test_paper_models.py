#!/usr/bin/env python3
"""The paper models (forge #161): the licence rule, the gores, the QR code, the scale note and the sheets.

    python3 tests/test_paper_models.py

Pure parts, each against a number worked out by hand or a published value:
  licence_allows   every licence line registry/textures.yaml uses today, and the ones it must refuse
  plan             every world with a real map gets one globe (the Sun is left out and says why), every file exists
  gores            the projection and its inverse agree, the equator is one unbroken line, the poles are points
  qr_encode        ISO/IEC 18004 Annex I's error-correction codewords and Annex C's format bits; and on a Mac the
                   system's own QR reader (CoreImage, through swift) reads back every mask and the code a sheet prints
  scale_note       Pluto's 82 mm globe is 1 : 29 million, and the Earth at that scale is 44 cm
  the strip        registry/ladder.yaml's distances read to metres, and each lands on the strip once
  the deploy       scripts/deploy.sh writes the PDFs and uploads them as application/pdf
  the sheets       the Moon wheel and the ladder strip are well-formed PDFs (the xref offsets are the objects'),
                   and, with Pillow, one globe's sheet embeds one JPEG and stays under 2 MB
"""
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import paper_models as pm  # noqa: E402
import qr_encode as qr  # noqa: E402

problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


# --- licences ------------------------------------------------------------------------------------------------
import yaml  # noqa: E402

# Every licence line of a file a globe would use is allowed; a line that only asks for a credit (the Blue Marble's, the
# Milky Way's) is not recognised and so is refused: the rule says yes only to words it knows.
rows = yaml.safe_load((ROOT / "registry/textures.yaml").read_text(encoding="utf-8"))["textures"]
for r in rows:
    if r["world"] == "sky" or r["slot"] not in ("day", "map") or r["world"] in pm.LEFT_OUT:
        continue
    f = pm.pick_file(r)
    ok, why = pm.licence_allows(f["licence"])
    check(ok, f"{r['id']}: its licence is refused ({why}): {f['licence'][:80]}")
check(not pm.licence_allows('Please credit "NASA Earth Observatory." (Blue Marble: Next Generation page)')[0], "a credit request alone is not a licence")
for bad, word in [("CC BY-NC 4.0", "non-commercial"), ("CC BY-ND 4.0", "derivative"), ("CC BY-SA 4.0", "share-alike"),
                  ("Free for personal use, by Bjorn Jonsson", "forbid"), ("All rights reserved", "does not say"), ("", "does not say")]:
    ok, why = pm.licence_allows(bad)
    check(not ok and word in why, f"licence_allows({bad!r}) should refuse ({word}), said {ok} {why!r}")

# --- the plan ------------------------------------------------------------------------------------------------
globes, refused = pm.plan()
slugs = {g["slug"] for g in globes}
for need in ("earth", "moon", "mars", "pluto", "charon", "ceres", "vesta", "io", "europa", "titan", "triton", "venus", "venus-radar"):
    check(need in slugs, f"no globe of {need}")
check("sun" not in slugs and any(r["world"] == "sun" for r in refused), "the Sun must be left out, with its reason")
check(len(globes) >= 31, f"{len(globes)} globes; the issue counts 31 worlds with a real map")
for g in globes:
    check((ROOT / g["file"]).is_file(), f"{g['slug']}: {g['file']} is not in the tree")
    check(g["radius_km"] > 0 and g["credit"] and g["licence"], f"{g['slug']}: radius, credit and licence are needed")
check(next(g for g in globes if g["slug"] == "ceres")["at"] == "dwarf-ceres", "Ceres opens as the app's record dwarf-ceres")

# --- the gores -----------------------------------------------------------------------------------------------
R, N = pm.GLOBE_R_MM, pm.GORES
for lat in (-80, -45, -10, 0, 10, 33, 60, 85):
    for lon in (-179, -151, -100, -1, 0.5, 14.9, 44, 119, 179):  # not on a gore's edge, where either gore may claim it
        x, y = pm.gore_xy(lat, lon)
        la, lo, inside = pm.gore_latlon(__import__("numpy").array([x]), __import__("numpy").array([y]))
        check(bool(inside[0]) and abs(la[0] - lat) < 1e-6 and abs(lo[0] - lon) < 1e-6, f"gore inverse of ({lat}, {lon}) gave ({la[0]}, {lo[0]})")
x0, y0 = pm.gore_xy(0, -180)
x1, _ = pm.gore_xy(0, 180 - 1e-9)
check(abs(x0) < 1e-9 and abs(y0 - math.pi * R / 2) < 1e-9 and abs(x1 - 2 * math.pi * R) < 1e-6, "the equator runs the full 2 pi R")
for k in range(N - 1):
    e = pm.gore_xy(0, -180 + (k + 1) * 30 - 1e-9)[0]
    w = pm.gore_xy(0, -180 + (k + 1) * 30)[0]
    check(abs(e - w) < 1e-6, f"gores {k} and {k + 1} must touch at the equator")
n_tip = pm.gore_xy(90, -170)
check(abs(n_tip[0] - math.pi * R / N) < 1e-6 and abs(n_tip[1]) < 1e-9, "a gore's north tip is one point at its middle")
check(2 * math.pi * R <= pm.SAFE[2] and pm.SAFE[0] + pm.SAFE[2] <= 297 and pm.SAFE[2] + 20 <= 279.4 + 1e-9,
      "the strip fits the safe box, which fits A4 and US Letter with 10 mm to spare")
tab = pm.tab_outline(3, False)
gap_ok = all(px >= ex - 1e-9 for (ex, _), (px, _) in zip(tab[:25], tab[25:][::-1]))
check(gap_ok and max(px - ex for (ex, _), (px, _) in zip(tab[:25], tab[25:][::-1])) <= 4.0 + 1e-9, "a tab stands out east of its gore, at most 4 mm")

# --- the QR code ---------------------------------------------------------------------------------------------
annex_i = [0x10, 0x20, 0x0C, 0x56, 0x61, 0x80, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11, 0xEC, 0x11]
check(qr.rs_remainder(annex_i, 10) == [0xA5, 0x24, 0xD4, 0xC1, 0xED, 0x36, 0xC7, 0x87, 0x2C, 0x55], "Reed-Solomon disagrees with ISO/IEC 18004 Annex I")
ANNEX_C_M = ["101010000010010", "101000100100101", "101111001111100", "101101101001011",
             "100010111111001", "100000011001110", "100111110010111", "100101010100000"]
check([format(qr.format_bits(m), "015b") for m in range(8)] == ANNEX_C_M, "format bits disagree with ISO/IEC 18004 Annex C (level M)")
check([qr.version_for(n) for n in (14, 15, 26, 42, 43, 106)] == [1, 2, 2, 3, 4, 6], "versions for 14..106 bytes at level M")
try:
    qr.version_for(107)
    check(False, "107 bytes must be refused, not truncated")
except ValueError:
    pass
m = qr.qr_matrix("https://www.spaceradar.ai/#at=pluto")
check(len(m) == 29 and all(len(r) == 29 for r in m), "a 35-byte address is a version 3 code, 29 modules")
check(all(m[r][c] == (max(abs(r - 3), abs(c - 3)) not in (2, 4)) for r in range(7) for c in range(7)), "the top-left finder pattern")
check(all(m[6][c] == (c % 2 == 0) for c in range(8, 21)), "the timing row alternates")
check(m[len(m) - 8][8], "the dark module")
words = qr.data_codewords(b"hi", 1)
check(words[:3] == [0x40, 0x26, 0x86] and words[3] == 0x90 and words[4:6] == [0xEC, 0x11], f"byte-mode codewords of 'hi': {words[:6]}")

if sys.platform == "darwin" and shutil.which("swift"):
    from PIL import Image
    with tempfile.TemporaryDirectory() as tmp:
        swift = Path(tmp) / "read.swift"
        swift.write_text('import Foundation\nimport CoreImage\nfor p in CommandLine.arguments.dropFirst() {\n'
                         ' let i = CIImage(contentsOf: URL(fileURLWithPath: p))!\n'
                         ' let d = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!\n'
                         ' print(d.features(in: i).compactMap { ($0 as? CIQRCodeFeature)?.messageString }.first ?? "NONE") }\n')
        texts_ = [("https://www.spaceradar.ai/#at=enceladus", k) for k in range(8)] + [("x" * 100, None)]
        paths = []
        for i, (t, mask) in enumerate(texts_):
            g = qr.qr_matrix(t, mask)
            n, s = len(g), 6
            im = Image.new("L", ((n + 8) * s, (n + 8) * s), 255)
            for r in range(n):
                for c in range(n):
                    if g[r][c]:
                        im.paste(0, ((c + 4) * s, (r + 4) * s, (c + 5) * s, (r + 5) * s))
            paths.append(str(Path(tmp) / f"q{i}.png"))
            im.save(paths[-1])
        got = subprocess.run(["swift", str(swift), *paths], capture_output=True, text=True, timeout=300).stdout.split("\n")
        for (t, mask), g in zip(texts_, got):
            check(g == t, f"CoreImage read the code (mask {mask}) as {g!r}, not {t[:40]!r}")
else:
    print("test_paper_models: not a Mac with swift, so the codes are not read back (the ISO examples above still hold)")

# --- the scale -----------------------------------------------------------------------------------------------
sc = pm.scale_note(1188.3)
check(sc["ratio_words"] == "1 : 29 million" and sc["other_words"] == "44 cm" and sc["other"] == "the Earth" and sc["diameter_mm"] == 82, f"Pluto's scale note: {sc}")
check(pm.scale_note(11.08)["other_words"] == "47.1 m", "the Earth at Phobos's scale is 47 m")
check(pm.scale_note(6371.0, world="earth")["other"] == "the Moon" and pm.scale_note(6371.0, world="earth")["other_words"] == "22 mm", "the Earth's sheet compares the Moon")
check(pm.length_words(5.04) == "5 mm" and pm.length_words(2.5e7) == "25 km", "length_words")

# --- the strip -----------------------------------------------------------------------------------------------
check(pm.distance_m("384 400 km") == 3.844e8 and pm.distance_m("4.5 billion km") == 4.5e12, "distance_m in km")
check(abs(pm.distance_m("about 425 light-years") / pm.LY_M - 425) < 1e-9 and abs(pm.distance_m("46 billion light-years") / pm.LY_M - 4.6e10) < 1, "distance_m in ly")
marks = pm.ladder_marks()
check(len(marks) >= 9 and all(0 <= pm.strip_pos(mk["m"]) < pm.STRIP_ROWS for mk in marks), "every rung lands on the strip")
check(abs(pm.strip_pos(1e3)) < 1e-12 and abs(pm.strip_pos(1e11) - 1) < 1e-12, "a kilometre starts the strip; 10^11 m starts the second")
check([t for _, t in pm.strip_ticks()][:3] == ["1 km", "10 km", "100 km"] and "1 ly" in [t for _, t in pm.strip_ticks()], "the strip's ticks")
check(abs(pm.lit_fraction(90) - 0.5) < 1e-12 and pm.lit_fraction(0) == 0 and abs(pm.lit_fraction(180) - 1) < 1e-12, "lit_fraction")
check(pm.lit_outline(0, 0, 5, 0) == [] and max(x for x, _ in pm.lit_outline(0, 0, 5, 45)) > 4.99 and min(x for x, _ in pm.lit_outline(0, 0, 5, 315)) < -4.99,
      "a waxing Moon is lit on the right, a waning one on the left")


# --- the sheets ----------------------------------------------------------------------------------------------
def well_formed(data: bytes, where: str) -> None:
    check(data.startswith(b"%PDF-1.4") and data.rstrip().endswith(b"%%EOF"), f"{where}: not a PDF")
    xref = int(re.search(rb"startxref\n(\d+)", data).group(1))
    check(data[xref:xref + 4] == b"xref", f"{where}: startxref does not point at the xref table")
    for i, off in enumerate(re.findall(rb"(\d{10}) 00000 n", data), start=1):
        check(data[int(off):].startswith(f"{i} 0 obj".encode()), f"{where}: object {i} is not at its xref offset")


well_formed(pm.moon_wheel_sheet(), "the Moon wheel")
well_formed(pm.ladder_sheet(), "the ladder strip")
if pm.have_pillow():
    g = next(x for x in globes if x["slug"] == "charon")
    data = pm.globe_sheet(g)
    well_formed(data, "the Charon globe")
    check(data.count(b"/DCTDecode") == 1 and len(data) < 2_000_000, f"the Charon globe: one JPEG, under 2 MB ({len(data)} B)")
    check(b"Charon map: NASA" in data or b"/Title (Charon" in data, "the Charon globe names its map")

# --- the deploy ships them -------------------------------------------------------------------------------------
deploy = (ROOT / "scripts/deploy.sh").read_text(encoding="utf-8")
check('export SR_PRINT=1' in deploy and '[ "$dir" = "print" ] && continue' in deploy, "deploy.sh builds the PDFs and keeps print/ out of the HTML-only loop")
check(re.search(r'"\$BUILT/print" "s3://\$BUCKET/print"[^\n]*\\\n[^\n]*--include "\*\.pdf" --content-type "application/pdf"', deploy) is not None,
      "deploy.sh uploads print/*.pdf as application/pdf")

if problems:
    print("test_paper_models FAILED:\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"test_paper_models ok: {len(globes)} globes planned, {len(refused)} left out with a reason; gores, QR (ISO examples"
      f"{', read back by CoreImage' if sys.platform == 'darwin' and shutil.which('swift') else ''}), scale and the sheets hold")
