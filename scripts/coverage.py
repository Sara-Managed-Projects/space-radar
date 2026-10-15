#!/usr/bin/env python3
"""One row per record the map can show: its class, its renderer, its honesty, its source and its credit.

    python3 scripts/coverage.py               # the totals, and every record nobody classified
    python3 scripts/coverage.py --csv         # one row per record id, to stdout
    python3 scripts/coverage.py --json        # the same rows as JSON
    python3 scripts/coverage.py --write       # write docs/COVERAGE.md
    python3 scripts/coverage.py --check       # exit 1 if docs/COVERAGE.md is stale or a record is unresolved

WHY (internal spec 0076 stage W2-e; internal #859, #891, #920, #921). The map had a registry per
domain (worlds, deep sky, models, sites ...) and nothing across them saying which renderer draws a
record, how honest the drawing is, where the record's facts come from and who is credited. A record
a change added without a class was invisible to every check; a class nobody draws was a promise.
registry/visual-classes.yaml names the package's 38 classes (and four of the house's), each with the
module that draws it, its default honesty class, what it falls back to on a weak device, its hero
overrides and the person-written source note. This script reads every registry and generated record
set, gives each record one class by the class's selectors, and refuses a record no class takes or
two classes take.

WHAT A ROW IS. `domain` (where the record lives), `id` (its id there), `ref` (the id the app's
records use, where it differs), `name`, `class`, `renderer` (the class's modules), `honesty`
(measured | modelled | illustrative: the record's own where it carries one, else the class's
default), `source` (the record's own, else its domain's) and `credit` (a line CREDITS.md carries
word for word: the record's own, else its domain's). A catalogue drawn as one thing (109 389 stars,
800 galaxies in one tile) is one row with a `count`.

THE COUNTS are the counts scripts/count_facts.py publishes (tests/test_coverage.py holds them equal),
so a README number and a coverage row can never be two builds of one count.

THE CERTAINTY RULE (SR-PLAN-183). A record drawn as an illustration may not describe itself with the
words a measurement uses ("exactly", "precisely", "measured", "to the metre", "confirmed"), unless
the sentence denies it ("nothing is measured", "not confirmed"). The words are check_registry.py's
TOUR_CERTAINTY_WORDS, the rule the launches layer already lived under; here it covers every record.

Stdlib and PyYAML, like the rest of the registry job. Nothing is fetched and nothing is run.
"""
from __future__ import annotations

import csv
import io
import json
import re
import struct
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry"
DOC = ROOT / "docs" / "COVERAGE.md"
HONESTY = ("measured", "modelled", "illustrative")

# The words a measurement uses (scripts/check_registry.py TOUR_CERTAINTY_WORDS, the same five).
CERTAINTY_WORDS = ("exactly", "precisely", "measured", "to the metre", "confirmed")
# A sentence that denies the claim is not making it: "nothing is measured below the map's
# resolution", "never confirmed", "not measured here". Looked for in the five words before.
_DENIAL = re.compile(r"\b(no|not|nothing|never|nobody|none|un|without|cannot|isn't|wasn't|aren't|hasn't|have not|has not)\b[^.;:]{0,40}$", re.I)

# A sentence that says which part is drawn ("each flash is ours", "every eddy drawn there is
# generated") is the honest form of a mixed claim, and is not refused.
_DRAWN = re.compile(r"\b(ours|generated|illustrat\w*|invented|seeded|artist\W?s impression|drawn by us|not to scale)\b", re.I)

# What a record's own field says about its drawing, in the three honesty words.
DRAWN_TO_HONESTY = {"photograph": "measured", "catalogue": "measured", "reconstruction": "modelled",
                    "model": "modelled", "illustration": "illustrative"}
POSITION_TO_HONESTY = {"measured": "measured", "inferred": "modelled", "inherit": "modelled",
                       "sample": "illustrative", "unknown": "illustrative"}


_LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
_PARSED: dict = {}


def _yaml(name: str):
    """A registry file, parsed once a run (models.yaml is read by five record sets)."""
    path = REG / name
    if path not in _PARSED:
        _PARSED[path] = yaml.load(path.read_text(encoding="utf-8"), Loader=_LOADER) or {}
    return _PARSED[path]


def _text(v) -> str:
    if v is None:
        return ""
    if isinstance(v, dict):
        return " ".join(_text(x) for x in v.values())
    if isinstance(v, (list, tuple)):
        return " ".join(_text(x) for x in v)
    return str(v)


def _rec(domain, rid, *, name=None, ref=None, fields=None, source=None, credit=None, honesty=None,
         words=(), count=1, credit_key=None) -> dict:
    """`credit_key`, where given, is what CREDITS.md carries for the record in place of its credit
    line word for word (a real model is credited by its file's row in a table, test_credits.py)."""
    return {"domain": domain, "id": str(rid), "ref": ref or str(rid), "name": name or str(rid),
            "fields": fields or {}, "source": _text(source).strip(), "credit": _text(credit).strip(),
            "honesty": honesty, "words": [w for w in words if w], "count": count, "credit_key": credit_key}


# --- the record sets, one loader each ---------------------------------------------------------
# Each returns a list of records. A loader reads its file and nothing else; what a domain's records
# are credited to when they carry no credit of their own is in registry/visual-classes.yaml.

def _texture_credits() -> dict:
    m = _yaml("models.yaml")
    return {r.get("id"): r for r in (m.get("textures") or []) + (m.get("data") or []) if isinstance(r, dict)}


def load_worlds(_d):
    tex = _texture_credits()
    out = []
    for w in _yaml("worlds.yaml").get("worlds") or []:
        look = w.get("look") or {}
        row = tex.get(look.get("textures")) or tex.get(w["id"]) or tex.get(f"{w['id']}-day") or {}
        if not row and w["id"] == "earth":
            row = tex.get("earth-day") or {}
        out.append(_rec("worlds", w["id"], name=w.get("display"), fields={"parent": w.get("parent") or ""},
                        source=row.get("source"), credit=row.get("credit")))
    return out


def load_rings(_d):
    tex = _texture_credits()
    out = []
    for w in _yaml("worlds.yaml").get("worlds") or []:
        if (w.get("look") or {}).get("ring"):
            row = tex.get(f"{w['id']}-ring") or {}
            out.append(_rec("rings", f"{w['id']}-ring", name=f"{w.get('display')}'s rings",
                            fields={"world": w["id"]}, source=row.get("source"), credit=row.get("credit")))
    return out


def load_dso(_d):
    doc = json.loads((ROOT / "site" / "data" / "dso.json").read_text(encoding="utf-8"))
    hand = {r.get("id"): r for r in (_yaml("dso-hand.yaml").get("objects") or []) if isinstance(r, dict)}
    out = []
    for o in doc.get("objects") or []:
        drawn = o.get("drawn") or []
        h = hand.get(o["id"]) or {}
        honest = "illustrative" if drawn == ["illustration"] else DRAWN_TO_HONESTY.get(drawn[0]) if drawn else None
        src = o.get("distanceSource") or ""
        if o.get("positionSource") and o.get("positionSource") != src:
            src = f"{o['positionSource']}; {src}"
        out.append(_rec("dso", o["id"], ref=f"dso-{o['id']}", name=o.get("name"),
                        fields={"typeCode": o.get("typeCode") or "", "hubble": o.get("hubble") or "",
                                "kind": o.get("kind") or "", "hand": "yes" if h else "no"},
                        source=src, honesty=honest, words=[o.get("name")]))
    return out


def load_photographs(_d):
    doc = _yaml("nebulae.yaml")
    arch = doc.get("archives") or {}
    out = []
    for p in doc.get("pictures") or []:
        a = arch.get(p.get("archive")) or {}
        page = str(a.get("page") or "").replace("{image}", str(p.get("image") or ""))
        out.append(_rec("photographs", p["id"], ref=f"dso-{p['id']}", name=p["id"],
                        fields={"archive": p.get("archive") or ""}, source=page, credit=p.get("credit"),
                        honesty="measured"))
    return out


def load_heroes(_d):
    out = []
    for f in sorted((REG / "deepsky-heroes").glob("*.yaml")):
        h = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        drawn = h.get("drawn") or []
        out.append(_rec("heroes", h.get("id") or f.stem, ref=h.get("record"), name=h.get("id") or f.stem,
                        fields={"record": h.get("record") or "", "shipped": "yes" if h.get("shipped") else "no"},
                        source=(h.get("sources") or [""])[0], honesty=DRAWN_TO_HONESTY.get(drawn[0]) if drawn else None,
                        words=[_text(h.get("colours"))]))
    return out


def load_exotics(_d):
    out = []
    for e in _yaml("exotics.yaml").get("exotics") or []:
        img = e.get("image") or {}
        out.append(_rec("exotics", e["id"], ref=f"exotic-{e['id']}", name=e.get("name"),
                        fields={"kind": e.get("kind") or ""}, source=e.get("source"),
                        credit=img.get("credit"), words=[e.get("name")]))
    return out


def _systems():
    gen = _yaml("systems-generated.yaml")
    return (_yaml("systems.yaml").get("systems") or []) + (gen.get("systems") or [])


def load_systems(_d):
    out = []
    for s in _systems():
        star = s.get("star") or {}
        out.append(_rec("systems", s["id"], ref=f"system-{s['id']}", name=s.get("display") or s.get("host"),
                        fields={"binary": "yes" if s.get("binary") else "no"}, source=star.get("source"),
                        words=[s.get("colour_note"), star.get("colour_note")]))
    return out


def load_planets(_d):
    out = []
    for s in _systems():
        for p in s.get("planets") or []:
            out.append(_rec("planets", p["id"], name=p["id"], fields={"system": s["id"]}, source=p.get("source")))
    return out


def load_stars_notable(_d):
    out = []
    for s in _yaml("stars-notable.yaml").get("stars") or []:
        rid = f"hip-{s['hip']}" if s.get("hip") else str(s.get("proper") or s.get("name"))
        out.append(_rec("stars_notable", rid, name=s.get("name"), source=s.get("source"), words=[s.get("name")]))
    return out


def load_catalogues(_d):
    """The things drawn as one thing from a whole catalogue, each read from the file that ships."""
    out = []
    with (ROOT / "site" / "data" / "stars3d.bin").open("rb") as f:
        _magic, _v, count, _u = struct.unpack("<4sIII", f.read(16))
    out.append(_rec("catalogues", "stars3d", name="Stars in three dimensions", count=count,
                    fields={"kind": "stars"}, source="https://codeberg.org/astronexus/hyg"))
    lv = json.loads((ROOT / "site" / "data" / "deep" / "localvolume.json").read_text(encoding="utf-8"))
    tiles = lv.get("tiles") or []
    lvrow = next((r for r in _yaml("models.yaml").get("data") or [] if r.get("id") == "localvolume"), {})
    out.append(_rec("catalogues", "localvolume", name="The local volume's galaxies",
                    count=sum(int(t.get("count") or 0) for t in tiles), fields={"kind": "galaxies"},
                    source=lvrow.get("source"), credit=lvrow.get("credit"), honesty="measured"))
    cmb = json.loads((ROOT / "site" / "images" / "deep" / "cmb" / "wmap-ilc-9yr.json").read_text(encoding="utf-8"))
    src = cmb.get("source") or {}
    out.append(_rec("catalogues", "cmb", name="The microwave background", fields={"kind": "cmb"},
                    source=src.get("page") or src.get("url"), credit=src.get("credit"), honesty="measured"))
    for r in _yaml("ladder.yaml").get("rungs") or []:
        if (r.get("target") or {}).get("place"):
            out.append(_rec("catalogues", r["id"], name=r.get("label"), fields={"kind": "horizon"},
                            source=r.get("distance_source"), honesty="modelled", words=[r.get("label")]))
    return out


def load_other_light(_d):
    out = []
    for b in _yaml("otherlight.yaml").get("bands") or []:
        out.append(_rec("other_light", b["id"], name=b.get("mission") or b["id"], source=b.get("terms") or b.get("evidence"),
                        credit=b.get("credit"), honesty="measured"))
    return out


def load_sites(_d):
    doc = _yaml("sites.yaml")
    refs = doc.get("references") or {}
    out = []
    for s in doc.get("sites") or []:
        ref = refs.get(s.get("source")) or {}
        out.append(_rec("sites", s["id"], name=s.get("display"),
                        fields={"world": s.get("world") or "", "class": s.get("class") or ""},
                        source=ref.get("url"), words=[s.get("display")]))
    return out


def load_real_models(_d):
    out = []
    for m in _yaml("models.yaml").get("real_models") or []:
        out.append(_rec("real_models", m["id"], name=m["id"], fields={"class": m.get("class") or ""},
                        source=m.get("source"), credit=m.get("credit"),
                        credit_key=f"`{Path(str(m.get('file') or '')).name}`" if m.get("file") else None,
                        honesty="modelled" if m.get("honesty") else "measured", words=[m.get("honesty")]))
    return out


def load_model_kinds(_d):
    out = []
    for m in _yaml("models.yaml").get("models") or []:
        honest = "illustrative" if m.get("kind") in ("procedural", "illustrative") else None
        out.append(_rec("model_kinds", m["id"], name=m["id"], fields={"kind": m.get("kind") or ""},
                        source=m.get("source"), honesty=honest))
    return out


_SAMPLE = ROOT / "site" / "js" / "data" / "sample.js"


_ARRAYS: dict = {}


def _sample_arrays() -> dict:
    if not _ARRAYS:
        _ARRAYS.update(_read_sample_arrays())
    return _ARRAYS


def _read_sample_arrays() -> dict:
    """site/js/data/sample.js's hand-kept arrays, each as a list of {id, fields...}: read as text
    (the file is a module for the browser), one object per `id:` line at the array's own indent."""
    text = _SAMPLE.read_text(encoding="utf-8")
    starts = sorted((m.start(), m.group(1)) for m in re.finditer(r"^(?:export )?const ([A-Z_]+) = \[", text, re.M))
    arrays = {}
    for i, (pos, name) in enumerate(starts):
        end = starts[i + 1][0] if i + 1 < len(starts) else len(text)
        seg = text[pos:end]
        rows = []
        hits = list(re.finditer(r"^\s{2,4}(?:\{\s*)?id: '([^']+)'", seg, re.M))
        for j, h in enumerate(hits):
            body = seg[h.start(): hits[j + 1].start() if j + 1 < len(hits) else len(seg)]
            row = {"id": h.group(1)}
            for key in ("name", "klass", "farKind", "whySource", "note", "why"):
                mm = re.search(rf"\b{key}:\s*(['\"])(.*?)\1", body, re.S)
                if mm:
                    row[key] = mm.group(2)
            rows.append(row)
        arrays[name] = rows
    return arrays


def _sources_yaml() -> dict:
    return {r["id"]: r for r in _yaml("sources.yaml").get("sources") or []}


def load_small_bodies(d):
    arrays, srcs = _sample_arrays(), _sources_yaml()
    out = []
    # The source each array's builder puts on its records (sample.js: sampleAsteroids() 'jpl-sbdb-neo',
    # farBodies() 'jpl-sbdb', namedComets() Horizons), named in visual-classes.yaml `from:`.
    for arr, src_id in (d.get("arrays") or {}).items():
        s = srcs.get(src_id) or {}
        for r in arrays.get(arr) or []:
            out.append(_rec("small_bodies", r["id"], name=r.get("name"),
                            fields={"array": arr, "farKind": r.get("farKind") or "", "klass": r.get("klass") or ""},
                            source=r.get("whySource") or s.get("url"), credit=s.get("attribution"),
                            words=[r.get("name")]))
    return out


def load_probes(d):
    arrays, srcs = _sample_arrays(), _sources_yaml()
    out = []
    for arr, src_id in (d.get("arrays") or {}).items():
        s = srcs.get(src_id) or {}
        for r in arrays.get(arr) or []:
            out.append(_rec(d["id"], r["id"], name=r.get("name"), fields={"array": arr, "klass": r.get("klass") or ""},
                            source=s.get("url"), credit=s.get("attribution"), words=[r.get("name")]))
    return out


def load_rockets(_d):
    out = []
    for r in _yaml("rockets.yaml").get("rockets") or []:
        out.append(_rec("rockets", r["id"], name=r.get("display"), source=r.get("source"), words=[r.get("display")]))
    return out


def load_oddities(_d):
    out = []
    for o in _yaml("oddities.yaml").get("oddities") or []:
        out.append(_rec("oddities", o["id"], name=o.get("display"), source=o.get("source") or o.get("cite"),
                        honesty=POSITION_TO_HONESTY.get(str(o.get("position_class"))), words=[o.get("display")]))
    return out


def load_weather(_d):
    out = []
    for e in _yaml("weather.yaml").get("effects") or []:
        src = e.get("source") or {}
        out.append(_rec("weather", e["id"], name=e["id"], fields={"world": e.get("world") or ""},
                        source=src.get("url") or src.get("name") if isinstance(src, dict) else src,
                        honesty=e.get("class") if e.get("class") in HONESTY else None,
                        words=[e.get("why"), e.get("note")]))
    return out


def load_layers(d):
    srcs = _sources_yaml()
    out = []
    for l in _yaml("layers.yaml").get("layers") or []:
        if l.get("enabled", True) is False:
            continue
        s = srcs.get(l.get("source")) or {}
        out.append(_rec("layers", l["id"], name=l["id"], fields={"group": l.get("group") or ""},
                        source=s.get("url"), credit=s.get("attribution")))
    return out


# The file a domain's record is written in, for a refusal that has to name it.
DOMAIN_FILES = {"worlds": "worlds.yaml", "rings": "worlds.yaml", "dso": "dso-hand.yaml", "photographs": "nebulae.yaml",
                "heroes": "deepsky-heroes", "exotics": "exotics.yaml", "systems": "systems-generated.yaml",
                "planets": "systems-generated.yaml", "stars_notable": "stars-notable.yaml", "other_light": "otherlight.yaml",
                "sites": "sites.yaml", "real_models": "models.yaml", "model_kinds": "models.yaml", "rockets": "rockets.yaml",
                "oddities": "oddities.yaml", "weather": "weather.yaml", "layers": "layers.yaml"}

LOADERS = {
    "worlds": load_worlds, "rings": load_rings, "dso": load_dso, "photographs": load_photographs,
    "heroes": load_heroes, "exotics": load_exotics, "systems": load_systems, "planets": load_planets,
    "stars_notable": load_stars_notable, "catalogues": load_catalogues, "other_light": load_other_light,
    "sites": load_sites, "real_models": load_real_models, "model_kinds": load_model_kinds,
    "small_bodies": load_small_bodies, "probes": load_probes, "reentries": load_probes,
    "rockets": load_rockets, "oddities": load_oddities, "weather": load_weather, "layers": load_layers,
}


# --- classes -----------------------------------------------------------------------------------

def registry() -> dict:
    return _yaml("visual-classes.yaml")


def _matches(rec: dict, sel: dict) -> bool:
    if sel.get("domain") != rec["domain"]:
        return False
    if "ids" in sel and rec["id"] not in [str(x) for x in sel["ids"]]:
        return False
    if "prefix" in sel and not any(rec["id"].startswith(p) for p in sel["prefix"]):
        return False
    for key, want in (sel.get("where") or {}).items():
        have = str(rec["fields"].get(key, ""))
        wants = want if isinstance(want, list) else [want]
        ok = False
        for w in wants:
            w = str(w)
            if w.startswith("^") and re.match(w, have):
                ok = True
            elif have == w:
                ok = True
        if not ok:
            return False
    return True


def collect(reg: dict | None = None, *, domains: set | None = None) -> dict:
    """{rows, classes, unresolved, ambiguous}: every record with its class, and what went wrong."""
    reg = reg or registry()
    classes = reg.get("classes") or []
    rows, unresolved, ambiguous = [], [], []
    for d in reg.get("domains") or []:
        if domains is not None and d["id"] not in domains:
            continue
        loader = LOADERS.get(d.get("loader") or d["id"])
        for rec in loader(d):
            pairs = [(c, sel) for c in classes for sel in (c.get("records") or []) if _matches(rec, sel)]
            hits = list({c["id"]: c for c, _ in pairs}.values())
            if not hits:
                unresolved.append(rec)
                rec["class"] = None
            elif len(hits) > 1:
                ambiguous.append((rec, [c["id"] for c in hits]))
                rec["class"] = None
            else:
                c = hits[0]
                rec["class"] = c["id"]
                rec["renderer"] = list(c.get("renderer") or [])
                rec["honesty"] = rec["honesty"] or pairs[0][1].get("honesty") or c.get("honesty")
                rec["hero"] = rec["ref"] in (c.get("heroes") or {}) or rec["id"] in (c.get("heroes") or {})
            own = (d.get("credits") or {}).get(rec["id"]) or {}
            rec["source"] = rec["source"] or _text(own.get("source") or d.get("source")).strip()
            rec["credit"] = rec["credit"] or _text(own.get("credit") or d.get("credit")).strip()
            rows.append(rec)
    return {"rows": rows, "classes": classes, "unresolved": unresolved, "ambiguous": ambiguous}


def flat(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip()


def credit_problems(rows: list, credits_text: str) -> list:
    """A record with no credit, or with one CREDITS.md does not carry word for word."""
    have = flat(credits_text)
    out = []
    for r in rows:
        if not r["credit"]:
            out.append(f"{r['domain']}[{r['id']}] has no credit: give the row a `credit:` or its domain one in registry/visual-classes.yaml")
        elif flat(r.get("credit_key") or r["credit"]) not in have:
            out.append(f"{r['domain']}[{r['id']}] is credited as {r.get('credit_key') or r['credit']!r}, and CREDITS.md does not carry that line")
        if not r["source"]:
            out.append(f"{r['domain']}[{r['id']}] has no source: a record says where its facts were read")
    return out


def certainty_hits(text: str) -> list:
    """The certainty words in `text` that the same sentence neither denies ("nothing is measured")
    nor bounds by saying what is drawn ("the latitudes are measured; each flash is ours")."""
    out = []
    for sentence in re.split(r"(?<=[.!?])\s+", text.lower()):
        if _DRAWN.search(sentence):
            continue
        for w in CERTAINTY_WORDS:
            for m in re.finditer(rf"\b{re.escape(w)}\b", sentence):
                if not _DENIAL.search(sentence[max(0, m.start() - 60):m.start()]):
                    out.append(w)
                    break
    return sorted(set(out))


def certainty_problems(rows: list) -> list:
    out = []
    for r in rows:
        if r.get("honesty") != "illustrative":
            continue
        for t in r["words"]:
            hits = certainty_hits(str(t))
            if hits:
                out.append(f"{r['domain']}[{r['id']}] is drawn as an illustration and its words say "
                           f"{', '.join(repr(h) for h in hits)}: an illustration claims no measurement (SR-PLAN-183)")
    return out


def class_problems(classes: list) -> list:
    out = []
    seen = set()
    for c in classes:
        cid = c.get("id")
        if cid in seen:
            out.append(f"visual-classes.yaml class {cid} is listed twice")
        seen.add(cid)
        if c.get("honesty") not in HONESTY:
            out.append(f"visual-classes.yaml class {cid}: `honesty:` is one of {', '.join(HONESTY)}")
        for key in ("title", "fallback", "note"):
            if not c.get(key):
                out.append(f"visual-classes.yaml class {cid} has no `{key}:`")
        for key in ("source", "dates", "drawn", "rights"):
            if not (c.get("note") or {}).get(key):
                out.append(f"visual-classes.yaml class {cid}: its source note has no `{key}:` line")
        renderer = c.get("renderer") or []
        if not renderer and not c.get("planned"):
            out.append(f"visual-classes.yaml class {cid} has no renderer and does not say where one is planned")
        for path in renderer:
            if not (ROOT / path).exists():
                out.append(f"visual-classes.yaml class {cid} names renderer {path}, which does not exist")
        for hero, path in (c.get("heroes") or {}).items():
            if not (ROOT / path).exists():
                out.append(f"visual-classes.yaml class {cid} names hero {hero} in {path}, which does not exist")
    return out


def problems(result: dict, credits_text: str) -> list:
    out = class_problems(result["classes"])
    for r in result["unresolved"]:
        out.append(f"{r['domain']}[{r['id']}] has no class: add a selector for it to a class in registry/visual-classes.yaml")
    for r, ids in result["ambiguous"]:
        out.append(f"{r['domain']}[{r['id']}] is taken by {len(ids)} classes ({', '.join(ids)}): one class a record")
    by_class = {}
    for r in result["rows"]:
        if r["class"]:
            by_class.setdefault(r["class"], []).append(r)
    for c in result["classes"]:
        if by_class.get(c["id"]) and not c.get("renderer"):
            out.append(f"visual-classes.yaml class {c['id']} has {len(by_class[c['id']])} records and no renderer")
    out += credit_problems(result["rows"], credits_text)
    out += certainty_problems(result["rows"])
    return out


# --- the document ------------------------------------------------------------------------------

def _count(rows) -> int:
    return sum(r["count"] for r in rows)


def document(result: dict) -> str:
    rows, classes = result["rows"], result["classes"]
    by_class: dict = {}
    for r in rows:
        by_class.setdefault(r["class"], []).append(r)
    domains = []
    for r in rows:
        if r["domain"] not in domains:
            domains.append(r["domain"])
    L = ["# Coverage: every record, its class, its renderer, its source and its credit", "",
         "GENERATED by `python3 scripts/coverage.py --write` from `registry/visual-classes.yaml` and every registry it",
         "reads. Do not edit: change the YAML (a class's words are its `note:`) and run the script. `tests/test_coverage.py`",
         "fails when this page is stale, when a record has no class or no credit, when a class with records has no",
         "renderer, or when a record drawn as an illustration uses the words of a measurement.", "",
         "One row per record: `python3 scripts/coverage.py --csv`. The classes are the 38 of the package of 2026-10-15",
         "(internal spec 0076, `04_OBJECT_TYPE_SPECS/`) and four of the house's, marked *house*.", "",
         "## Totals", "", "| domain | records | drawn things |", "|---|---:|---:|"]
    for d in domains:
        rs = [r for r in rows if r["domain"] == d]
        L.append(f"| {d} | {len(rs)} | {_count(rs):,} |".replace(",", " "))
    L.append(f"| **all** | **{len(rows)}** | **{_count(rows):,}** |".replace(",", " "))
    L += ["", "| class | records | renderer | honesty (default) | heroes |", "|---|---:|---|---|---|"]
    for c in classes:
        rs = by_class.get(c["id"], [])
        rend = ", ".join(f"`{Path(p).name}`" for p in c.get("renderer") or []) or f"none yet ({c.get('planned')})"
        heroes = ", ".join(sorted((c.get("heroes") or {}).keys())) or "-"
        house = " *house*" if c.get("house") else ""
        L.append(f"| [{c['id']}](#{c['id'].lower()}){house} | {len(rs)} | {rend} | {c.get('honesty')} | {heroes} |")
    unres = result["unresolved"] + [r for r, _ in result["ambiguous"]]
    L += ["", f"**Unresolved records: {len(unres)}.**" + ("" if unres else " Every record has one class."), ""]
    for r in unres:
        L.append(f"- {r['domain']} `{r['id']}`")
    honest = {h: sum(1 for r in rows if r["honesty"] == h) for h in HONESTY}
    L += [f"Honesty over the {len(rows)} records: " + ", ".join(f"{n} {h}" for h, n in honest.items()) + ".", ""]
    L += ["## The classes", ""]
    for c in classes:
        rs = by_class.get(c["id"], [])
        n = c.get("note") or {}
        L += [f"### {c['id']}", "", f"**{c['title']}**" + (" (a class of the house, not of the package)" if c.get("house") else ""), ""]
        L.append(f"- **Drawn by:** " + (", ".join(f"`{p}`" for p in c.get("renderer") or []) or f"nothing yet; planned in {c.get('planned')}"))
        L.append(f"- **Default honesty:** {c.get('honesty')}")
        L.append(f"- **On a weak device (T0, or after the frame latch):** {flat(c.get('fallback'))}")
        if c.get("heroes"):
            L.append("- **Hero overrides:** " + ", ".join(f"`{k}` ({v})" for k, v in c["heroes"].items()))
        L.append(f"- **Source:** {flat(n.get('source'))}")
        L.append(f"- **Dates and filters:** {flat(n.get('dates'))}")
        L.append(f"- **Measured, modelled or reconstructed:** {flat(n.get('drawn'))}")
        L.append(f"- **Rights:** {flat(n.get('rights'))}")
        if c.get("issue"):
            L.append(f"- **What is missing is tracked in:** {c['issue']}")
        doms = {}
        for r in rs:
            doms.setdefault(r["domain"], []).append(r)
        if not rs:
            L.append("- **Records:** none on the map today.")
        else:
            L.append(f"- **Records ({len(rs)}" + (f", {_count(rs):,} drawn things".replace(",", " ") if _count(rs) != len(rs) else "") + "):**")
            for d, drs in doms.items():
                ids = ", ".join(f"`{r['id']}`" + (f" ({r['count']:,})".replace(",", " ") if r["count"] != 1 else "") for r in drs)
                L.append(f"  - {d} ({len(drs)}): {ids}")
        L.append("")
    return "\n".join(L).rstrip() + "\n"


def csv_text(rows: list) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["domain", "id", "ref", "name", "class", "renderer", "honesty", "hero", "count", "source", "credit"])
    for r in rows:
        w.writerow([r["domain"], r["id"], r["ref"], r["name"], r["class"] or "", " ".join(r.get("renderer") or []),
                    r["honesty"] or "", "yes" if r.get("hero") else "", r["count"], r["source"], r["credit"]])
    return buf.getvalue()


def main(argv: list) -> int:
    result = collect()
    if "--csv" in argv:
        sys.stdout.write(csv_text(result["rows"]))
        return 0
    if "--json" in argv:
        print(json.dumps([{k: v for k, v in r.items() if k not in ("fields", "words")} for r in result["rows"]], indent=1, ensure_ascii=False))
        return 0
    found = problems(result, (ROOT / "CREDITS.md").read_text(encoding="utf-8"))
    want = document(result)
    if "--write" in argv:
        DOC.write_text(want, encoding="utf-8")
        print(f"wrote {DOC.relative_to(ROOT)}")
    elif "--check" in argv:
        have = DOC.read_text(encoding="utf-8") if DOC.exists() else ""
        if have != want:
            found.append(f"{DOC.relative_to(ROOT)} is STALE: run python3 scripts/coverage.py --write and commit it")
    for p in found:
        print("FAIL " + p)
    rows = result["rows"]
    drawn = f"{_count(rows):,}".replace(",", " ")
    print(f"{'ok' if not found else 'FAILED'}: {len(rows)} records ({drawn} drawn things) in "
          f"{len({r['class'] for r in rows if r['class']})} classes, {len(result['unresolved'])} unresolved, "
          f"{len(found)} problems")
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
