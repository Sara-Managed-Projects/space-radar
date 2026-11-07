#!/usr/bin/env python3
"""Build the stories on a sky figure's card and the pictures of the cultures beyond the western one (forge #143).

    python3 scripts/build-skylore.py --stellarium DIR --hip FILE    build both
    python3 scripts/build-skylore.py --check                        the files are there, whole, in budget, credited

WHAT IT WRITES
  site/data/skystories/<id>.json   for every culture registry/skycultures.yaml lists: one story per figure the
                                   sky draws, keyed as the sky keys it (the IAU abbreviation for `western`, the
                                   figure's name for the others):  {"t": text, "s": "stellarium" | "ours",
                                   "c": cite (ours only)}, or {"none": true} when no source we may share tells
                                   one. The words, and where each comes from, are registry/skystories.yaml's
                                   header. Fetched by ui/skystory.js when a card is first opened, never at boot.
  site/data/skyart/<id>/           the pictures Stellarium's own sky-culture folder draws for `maori`,
                                   `hawaiian` and `boorong` (CC BY-SA 4.0, as each culture's licence section
                                   says; no other culture ships drawings under a licence that allows it), made
                                   the way scripts/build-skycultures.py makes the western ones, with one change:
                                   each is greyed, put on black where it had transparency, and resampled to a
                                   power-of-two square (256 px, or 512 px for anything larger), so a phone's
                                   WebGL 1 can mipmap it; the three anchor stars are kept as fractions of the
                                   picture, so the stretch does not move a star. index.json, LICENSE.txt beside.

INPUTS (none is in the repository)
  --stellarium DIR   a folder holding <folder>/description.md, <folder>/index.json and the illustrations of
                     the cultures, as at the commit registry/skystories.yaml names
  --hip FILE         the anchor stars' J2000 places: VizieR I/239/hip_main as TSV with the columns
                     HIP, _RAJ2000, _DEJ2000 in degrees (asu-tsv, -oc.form=d)
"""
from __future__ import annotations

import argparse
import difflib
import html
import io
import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "site" / "data"
STORY_DIR = DATA / "skystories"
ART_DIR = DATA / "skyart"
CULTURES = ROOT / "registry" / "skycultures.yaml"
STORIES = ROOT / "registry" / "skystories.yaml"

# The cultures with pictures beyond the western one: our id -> Stellarium's folder, and who drew them.
ART = {
    "maori": ("maori", "the Stellarium contributors of the Māori sky culture (Dan Smale)"),
    "hawaiian": ("hawaiian_starlines", "Kealoha Kaneakua, for the Kamehameha Schools Kapālama class that made the Hawaiian star lines for Stellarium"),
    "boorong": ("boorong", "the Stellarium contributors of the Boorong sky culture (John Morieson and Alex Cherney)"),
}
# The figure a picture belongs to when Stellarium's own figure has no name (and so is not drawn): Boorong's
# small Magellanic cloud is the second of the pair of brolgas.
ART_KEY_FALLBACK = {("boorong", "CON boorong Kts"): "Male and female brolga"}
# Pictures of figures the sky draws no lines for: Tchingal, the emu, is dark sky by the Southern Cross, with no
# stars of its own to join, so Stellarium draws it as a picture only, and so do we.
ART_ONLY = {"boorong": {"Emu"}}
ART_MAX_BYTES = 40_000           # each picture, as the western ones
ART_CULTURE_BYTES = 700_000      # each culture's pictures
STORY_MAX_BYTES = 120_000        # each culture's stories (the Chinese, 309 of them, are the most)
STORY_MAX_CHARS = 900            # each story

LICENSE_TXT = """Sky-culture pictures in this folder (*.webp)
============================================

Originals: https://github.com/Stellarium/stellarium/tree/{commit}/skycultures/{folder}/illustrations
           Drawn by {author}. The sky culture's own description says, under License: "CC BY-SA 4.0".
Modified by: the Space Radar contributors, {date}. What was changed: each picture was turned to grey, put
           on black where it was transparent, resampled to a power-of-two square and re-encoded as WebP
           (scripts/build-skylore.py). Nothing was redrawn or cropped. index.json beside them repeats the
           three anchor stars Stellarium's index.json gives each picture, as sky coordinates.

Licence: Creative Commons Attribution-ShareAlike 4.0 International,
         https://creativecommons.org/licenses/by-sa/4.0/
These files, and anything made from them, stay under CC BY-SA 4.0. The MIT licence of Space Radar's code
does not apply to them.
"""


def plain(s: str) -> str:
    """Markdown and HTML of a Stellarium description as plain text: no tags, no emphasis marks, entities read."""
    s = re.sub(r"</?notr>", "", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"(?<![\w*])[*_]{1,2}([^*_\n]+?)[*_]{1,2}(?![\w*])", r"\1", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def fold(s: str) -> str:
    """A name compared across spellings: the four apostrophes and the okina are one, case and dashes are not counted."""
    return re.sub(r"[`'’‘ʻ\s-]+", "", s or "").lower()


def sections(md: str, level: int) -> dict:
    """`{heading: body}` for every heading of exactly `level` #s, the body up to the next heading of any level."""
    out, head, body = {}, None, []
    for line in md.splitlines():
        m = re.match(r"^(#+)\s+(.*)$", line)
        if m:
            if head is not None:
                out[head] = "\n".join(body).strip()
            head = plain(m.group(2)) if len(m.group(1)) == level else None
            body = []
        elif head is not None:
            body.append(line)
    if head is not None:
        out[head] = "\n".join(body).strip()
    return out


def short(body: str, limit: int = STORY_MAX_CHARS) -> str:
    """Whole paragraphs of a section, as many as fit in `limit` characters (the first one always)."""
    paras = [plain(p) for p in re.split(r"\n\s*\n", body) if plain(p) and not p.strip().startswith(("|", "- [", " - ["))]
    out = ""
    for p in paras:
        if out and len(out) + 1 + len(p) > limit:
            break
        out = f"{out} {p}".strip()
    return out


def table_rows(md: str) -> list:
    """Every row of every Markdown table, as lists of plain cells (separator rows dropped)."""
    rows = []
    for line in md.splitlines():
        t = line.strip()
        if t.startswith("|") and not re.match(r"^\|[-\s|:]+\|$", t):
            rows.append([plain(c) for c in t.strip("|").split("|")])
    return rows


def stellarium_stories(cid: str, folder: Path, figures: list, index: dict) -> dict:
    """The text Stellarium's description gives each figure of its own: `{key: text}`."""
    md = (folder / "description.md").read_text(encoding="utf-8")
    out = {}
    if cid == "western":
        by_name = {c["common_name"].get("english"): c["id"].split()[-1] for c in index["constellations"]}
        part = md.split("\n## Constellations", 1)[1]
        for head, body in sections(part, 5).items():
            if head in by_name:
                out[by_name[head]] = short(body)
        return out
    names = {fold(f["name"]): f["name"] for f in figures}
    natives = {fold(f.get("native", "")): f["name"] for f in figures if f.get("native")}
    if cid in ("samoan", "hawaiian"):
        for level in (3, 4, 5):
            for head, body in sections(md, level).items():
                key = names.get(fold(head)) or natives.get(fold(head))
                if key and key not in out and short(body):
                    out[key] = short(body)
    elif cid == "maori":
        for row in table_rows(md):
            if len(row) == 2 and fold(row[0]) in natives and len(row[1]) > 40:
                out[natives[fold(row[0])]] = row[1]
    elif cid == "tongan":
        for row in table_rows(md):
            if len(row) != 2 or row[1] in ("Designation", "Designation or notes"):
                continue
            head = row[0].split("(")[0].strip()
            key = natives.get(fold(head)) or natives.get(fold(head.replace("Ae e'", "'Ao 'o '")))
            if key and key not in out:
                note = row[1] if row[1] not in ("—", "") else "Listed by Stellarium's description with " + row[0].split("(", 1)[1].rstrip(")")
                out[key] = f"{row[0]}: {note}."
    elif cid == "boorong":
        for row in table_rows(md):
            # Stanbridge's spellings drift between the table and the figures (Kulkanbulla, Kulkunbulla): the closest name.
            near = difflib.get_close_matches(fold(row[0]), list(natives), n=1, cutoff=0.86) if len(row) == 3 else []
            if near and natives[near[0]] not in out:
                out[natives[near[0]]] = f"{row[0]}: {row[1]}. In the sky: {row[2]}."
    elif cid == "chinese":
        out.update(chinese_stories(md, figures))
    return out


def chinese_stories(md: str, figures: list) -> dict:
    """Each xingguan from Stellarium's list: its pinyin, its translation, the enclosure or mansion it belongs to."""
    groups = {}
    enclosures = md.split("### Three Enclosures", 1)[1].split("###", 1)[0]
    for p in re.split(r"\n\s*\n", enclosures):
        m = re.match(r"\s*(Purple Forbidden|Supreme Palace|Heavenly Market) [Ee]nclosure (is [^.]+\.)", p)
        if m:
            groups[m.group(1).lower()] = plain(m.group(2))
    symbols = {}
    rows = table_rows(md.split("### The List of The Twenty-Eight Mansions", 1)[1].split("###", 1)[0])
    for b in rows:
        if b[0] == "Translation":
            for name in b[2:]:
                symbols[name] = b[1]
    lst = table_rows(md.split("### The list of Xingguans", 1)[1].split("\n### ", 1)[0])
    by_hanzi = {}
    group, group_hanzi = "", ""
    for row in lst:
        if len(row) < 5 or row[0] == "Chinese Name":
            continue
        hanzi, pinyin, tr, primary, added = row[:5]
        if not primary.strip():
            group, group_hanzi = tr, hanzi
            continue
        # A name used twice (Pestle in two mansions) is told apart by its group, as the figure's native name is: 杵(箕宿).
        entry = (pinyin, tr, primary.strip(), added.strip(), group)
        by_hanzi.setdefault(hanzi, entry)
        by_hanzi[(hanzi, group_hanzi)] = entry
    out = {}
    for f in figures:
        full = f.get("native", "")
        m = re.match(r"^(.+?)\((.+)\)$", full)
        h = m.group(1) if m else full
        hit = by_hanzi.get(full) or (m and by_hanzi.get((m.group(1), m.group(2)))) or by_hanzi.get(h) or by_hanzi.get(h.rstrip("宿"))
        if not hit:
            continue
        pinyin, tr, primary, added, group = hit
        where = f"Part of the {group}"
        key = group.split(" Enclosure")[0].lower()
        if group.endswith("Enclosure") and key in groups:
            where += f": {groups[key][3:]}".rstrip(".")
        elif group in symbols:
            where += f", one of the Twenty-Eight Mansions, in the {symbols[group]}"
        elif group == "The Southern Sky":
            where = "One of the xingguans of the southern sky, added in the late Ming dynasty from European star charts"
        stars = f"{primary} star{'s' if primary != '1' else ''} in the catalogue of 1756"
        if added and added != "0":
            stars += f", {added} added later"
        out[f["name"]] = f"{pinyin} ({h}), “{tr}”. {where}. {stars}."
    return out


def build_stories(stellarium: Path, reg: dict, extra: dict) -> list:
    STORY_DIR.mkdir(parents=True, exist_ok=True)
    report = []
    for row in reg["cultures"]:
        cid = row["id"]
        folder = stellarium / row.get("stellarium", "modern")
        index = json.loads((folder / "index.json").read_text(encoding="utf-8"))
        if cid == "western":
            figures = [{"name": c["id"].split()[-1]} for c in index["constellations"]]
        else:
            figures = json.loads((DATA / "skycultures" / f"{cid}.json").read_text(encoding="utf-8"))["figures"]
        own = stellarium_stories(cid, folder, figures, index)
        more = (extra.get("cultures") or {}).get(cid) or {}
        md = plain((folder / "description.md").read_text(encoding="utf-8"))
        stories = {}
        for f in figures:
            key = f["name"]
            text = own.get(key, "")
            for q in (more.get("quote") or {}).get(key, []):
                if plain(q) not in md:
                    raise SystemExit(f"{cid}/{key}: the quoted sentence is not in Stellarium's description: {q!r}")
                if plain(q) not in text:
                    text = f"{text} {plain(q)}".strip()
            ours = (more.get("ours") or {}).get(key)
            if text:
                stories[key] = {"t": text, "s": "stellarium"}
                if ours:
                    stories[key]["o"] = ours["text"]
                    stories[key]["c"] = ours["cite"]
            elif ours:
                stories[key] = {"t": ours["text"], "s": "ours", "c": ours["cite"]}
            else:
                stories[key] = {"none": True}
        for kind in ("quote", "ours"):
            for key in (more.get(kind) or {}):
                if key not in stories:
                    raise SystemExit(f"registry/skystories.yaml: {cid} has no figure {key!r}")
        doc = {
            "id": cid,
            "licence": "CC BY-SA 4.0",
            "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "source": f"https://github.com/Stellarium/stellarium/tree/{extra['stellarium_commit']}/skycultures/{row.get('stellarium', 'modern')}",
            "credit": row["credit"] if cid != "western" else "Constellation stories: the Stellarium contributors of the modern sky culture, CC BY-SA 4.0",
            "lang": "en",
            "stories": stories,
        }
        out = STORY_DIR / f"{cid}.json"
        out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        told = sum(1 for s in stories.values() if not s.get("none"))
        report.append(f"{cid}: {told}/{len(stories)} told, {out.stat().st_size} B")
    return report


def read_hip(path: Path) -> dict:
    hip = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("\t")
        if len(parts) >= 3 and parts[0].strip().isdigit():
            hip[int(parts[0])] = (float(parts[1]), float(parts[2]))
    return hip


def build_art(stellarium: Path, hip: dict, commit: str, date: str) -> list:
    from PIL import Image

    report = []
    for cid, (folder, author) in ART.items():
        index = json.loads((stellarium / folder / "index.json").read_text(encoding="utf-8"))
        names = {c["id"]: (c.get("common_name") or {}).get("english") or (c.get("common_name") or {}).get("native") for c in index["constellations"]}
        out_dir = ART_DIR / cid
        out_dir.mkdir(parents=True, exist_ok=True)
        for old in out_dir.glob("*.webp"):
            old.unlink()
        figures, total = [], 0
        for con in index["constellations"]:
            img = con.get("image")
            if not img:
                continue
            key = names.get(con["id"]) or ART_KEY_FALLBACK.get((cid, con["id"]))
            if not key:
                raise SystemExit(f"{cid}: picture {img['file']} belongs to a figure with no name")
            w, h = img["size"]
            im = Image.open(stellarium / folder / img["file"])
            if im.size != (w, h):
                raise SystemExit(f"{img['file']}: is {im.size}, index.json says {(w, h)}")
            rgba = im.convert("RGBA")
            black = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
            black.alpha_composite(rgba)
            side = 256 if max(w, h) <= 300 else 512
            grey = black.convert("L").resize((side, side), Image.LANCZOS).convert("RGB")
            for quality in (82, 74, 66, 58, 50, 42):
                buf = io.BytesIO()
                grey.save(buf, "WEBP", quality=quality, method=6)
                if buf.tell() <= ART_MAX_BYTES:
                    break
            else:
                raise SystemExit(f"{img['file']}: over {ART_MAX_BYTES} bytes at every quality tried")
            name = Path(img["file"]).stem + ".webp"
            (out_dir / name).write_bytes(buf.getvalue())
            total += buf.tell()
            anchors = []
            for a in img["anchors"]:
                if a["hip"] not in hip:
                    raise SystemExit(f"{cid}/{key}: anchor HIP {a['hip']} is not in {len(hip)} stars read")
                ra, dec = hip[a["hip"]]
                anchors.append([round(a["pos"][0] / w, 5), round(a["pos"][1] / h, 5), round(ra, 4), round(dec, 4)])
            figures.append({"id": key, "file": name, "px": side, "anchors": anchors})
        doc = {
            "author": author,
            "licence": "CC BY-SA 4.0",
            "licenceUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "source": f"https://github.com/Stellarium/stellarium/tree/{commit}/skycultures/{folder}",
            "changed": "greyed, put on black, resampled to a power-of-two square and re-encoded as WebP",
            "figures": figures,
        }
        (out_dir / "index.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        (out_dir / "LICENSE.txt").write_text(LICENSE_TXT.format(commit=commit, folder=folder, author=author, date=date), encoding="utf-8")
        report.append(f"{cid}: {len(figures)} pictures, {total} B")
    return report


def check() -> int:
    bad = []
    reg = yaml.safe_load(CULTURES.read_text(encoding="utf-8"))
    for row in reg["cultures"]:
        cid = row["id"]
        p = STORY_DIR / f"{cid}.json"
        if not p.exists():
            bad.append(f"skystories/{cid}.json is missing")
            continue
        if p.stat().st_size > STORY_MAX_BYTES:
            bad.append(f"skystories/{cid}.json is {p.stat().st_size} B, over {STORY_MAX_BYTES}")
        doc = json.loads(p.read_text(encoding="utf-8"))
        if doc.get("licence") != "CC BY-SA 4.0" or "github.com/Stellarium/stellarium" not in doc.get("source", ""):
            bad.append(f"skystories/{cid}.json does not carry its licence and source")
        if cid == "western":
            keys = {f["id"] for f in json.loads((ART_DIR / "index.json").read_text(encoding="utf-8"))["figures"]}
        else:
            keys = {f["name"] for f in json.loads((DATA / "skycultures" / f"{cid}.json").read_text(encoding="utf-8"))["figures"]}
        missing = keys - set(doc["stories"])
        if missing:
            bad.append(f"skystories/{cid}.json has no entry for {sorted(missing)[:4]}")
        for key, s in doc["stories"].items():
            if s.get("none"):
                continue
            if not s.get("t") or len(s["t"]) > STORY_MAX_CHARS + 400:
                bad.append(f"skystories/{cid}.json {key}: a story of {len(s.get('t') or '')} characters")
            if s.get("s") not in ("stellarium", "ours") or (s.get("s") == "ours" and not s.get("c")) or (s.get("o") and not s.get("c")):
                bad.append(f"skystories/{cid}.json {key}: our own words without a cite")
    for cid in ART:
        d = ART_DIR / cid
        try:
            doc = json.loads((d / "index.json").read_text(encoding="utf-8"))
        except FileNotFoundError:
            bad.append(f"skyart/{cid}/index.json is missing")
            continue
        files = sorted(p.name for p in d.glob("*.webp"))
        if files != sorted({f["file"] for f in doc["figures"]}):
            bad.append(f"skyart/{cid}: the pictures on disk are not the ones index.json names")
        sizes = [(d / f).stat().st_size for f in files]
        if sizes and (max(sizes) > ART_MAX_BYTES or sum(sizes) > ART_CULTURE_BYTES):
            bad.append(f"skyart/{cid}: {sum(sizes)} B, the largest {max(sizes)} B")
        names = {f["name"] for f in json.loads((DATA / "skycultures" / f"{cid}.json").read_text(encoding="utf-8"))["figures"]}
        for f in doc["figures"]:
            if f["id"] not in names | ART_ONLY.get(cid, set()) or f["px"] not in (256, 512) or len(f["anchors"]) != 3:
                bad.append(f"skyart/{cid}: {f['id']} is not a figure the sky draws, or not a pinned power-of-two square")
        notice = (d / "LICENSE.txt").read_text(encoding="utf-8")
        for needle in ("CC BY-SA 4.0", "creativecommons.org/licenses/by-sa/4.0", "github.com/Stellarium/stellarium", "Modified by"):
            if needle not in notice:
                bad.append(f"skyart/{cid}/LICENSE.txt does not say {needle!r}")
    sources = (ROOT / "registry" / "asset_sources.yaml").read_text(encoding="utf-8")
    credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
    for needle in ["site/data/skystories/"] + [f"site/data/skyart/{c}/" for c in ART]:
        if needle not in sources:
            bad.append(f"registry/asset_sources.yaml has no row for {needle}")
        if needle not in credits:
            bad.append(f"CREDITS.md does not name {needle}")
    for b in bad:
        print("FAIL " + b)
    print(f"{'ok' if not bad else 'FAILED'}: stories for {len(reg['cultures'])} cultures, pictures for {len(ART)} more")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__.split("\n\n", 1)[1])
    ap.add_argument("--check", action="store_true", help="check the built files, their budgets and credits")
    ap.add_argument("--stellarium", help="folder with the Stellarium sky-culture folders")
    ap.add_argument("--hip", help="VizieR I/239 TSV: HIP, _RAJ2000, _DEJ2000 in degrees")
    args = ap.parse_args()
    if args.check:
        return check()
    if not (args.stellarium and args.hip):
        ap.error("--stellarium and --hip are both needed to build")
    reg = yaml.safe_load(CULTURES.read_text(encoding="utf-8"))
    extra = yaml.safe_load(STORIES.read_text(encoding="utf-8"))
    for line in build_stories(Path(args.stellarium), reg, extra):
        print("stories", line)
    for line in build_art(Path(args.stellarium), read_hip(Path(args.hip)), extra["stellarium_commit"], str(extra["read_on"])):
        print("art", line)
    return 0


if __name__ == "__main__":
    sys.exit(main())
