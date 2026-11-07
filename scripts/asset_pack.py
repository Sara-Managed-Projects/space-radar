#!/usr/bin/env python3
"""The pack of what Space Radar made itself, read from the registries (forge #165).

    python3 scripts/asset_pack.py            # the plan: what is offered, what is refused and why, what is someone else's
    python3 scripts/asset_pack.py --json     # the same plan as the machine-readable list the page publishes (assets/pack.json)

WHAT IS IN IT. Only work this project made: the glTF models it built from published dimensions and photographs, or
generated from a public-domain picture and then repaired (registry/models.yaml `real_models` rows of kind
`built-from-dimensions` or `derived-from-images`), the relief and height maps it baked from public-domain elevation
models, the maps it rebuilt from public-domain mosaics (registry/textures.yaml, the ids in OURS_TEXTURES), and the
procedural shapes, which are code. The page is scripts/seo_reach.py's /assets/; this file decides, the page prints.

THE LICENCE FOLLOWS FROM THE INPUTS, file by file (licence_of):
  * A model whose row says the shape is this project's and that nothing of any picture is in the file: CC BY 4.0,
    with the credit line. The pictures were looked at, so their licences do not travel; a row that does not SAY so
    is refused, because a reader of the row could not tell.
  * A model generated from a picture: CC BY 4.0 only when that picture is public domain (the row's licence line
    begins "Public domain"); otherwise refused.
  * A map baked from public-domain or CC0 data: CC0 1.0, i.e. public domain, because every input is and the
    project waives its own part. That is the one place "public domain" is the honest word.
  * Anything with a non-commercial, no-derivatives or share-alike term, or by an author whose terms forbid hosting
    copies (check_registry.TEXTURE_REFUSED), is refused with the reason.

NOT OURS, AND NEVER OFFERED AS OURS. The Solar System Scope maps, NASA's and the agencies' own models, Hubble's OPAL
maps and the rest are listed by maker with a link to where the maker publishes them (others()). Solar System Scope's
textures are theirs to license.

NOTHING IS COPIED. Every file is served from the path the app already loads it from (/models/x.glb,
/textures/x.webp); the pack is a list and a credit line, not a second copy of 15 MB.

The changelog (changed_dates) is the day each file last changed in git, read with one `git log`; a build without the
history prints no dates rather than wrong ones.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry"
HOST = "https://www.spaceradar.ai"
GITHUB = "https://github.com/Sara-Managed-Projects/space-radar"
CC_BY = ("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/")
CC0 = ("CC0 1.0 (public domain)", "https://creativecommons.org/publicdomain/zero/1.0/")
CREDIT_NAME = "Space Radar (spaceradar.ai)"

OWN_MODEL_KINDS = ("built-from-dimensions", "derived-from-images")
# What a row must say for the shape to be ours alone: the house's own sentences (registry/models.yaml).
OWN_SHAPE = re.compile(
    r"(this project's own shape|the shape is this project's|nothing of (?:it|them|any picture|the pictures) is in the file"
    r"|none of the pictures is in the file|no [^.]{0,60}picture or model is in the file|no picture ships"
    r"|are this project's, under this repository's licence)", re.I)
REFUSED_TERMS = (
    (re.compile(r"\bNC\b|non-?commercial", re.I), "a non-commercial term binds it"),
    (re.compile(r"\bND\b|no-?deriv", re.I), "a no-derivatives term binds it"),
    (re.compile(r"\bSA\b|share-?alike", re.I), "a share-alike term binds it"),
)

# The maps this project made, not merely resized: what was done is the row's own `make:`. A map that is only a
# publisher's file at another size is the publisher's (others()).
OURS_TEXTURES = ("earth-relief", "mercury-relief", "mars-relief", "mars-height", "venus-relief", "pluto-relief",
                 "saturn-ring-fine", "titan-lakes", "pluto", "charon")

# Names a reader recognises, where the registry id is not one (the rest are spelled from the id).
NAMES = {
    "hubble": "Hubble Space Telescope", "hubble-sts31": "Hubble at release (STS-31, 1990)", "shuttle-rms": "Space Shuttle robot arm",
    "msl-entry": "Curiosity's entry capsule", "msl-descent-stage": "Curiosity's descent stage", "nustar": "NuSTAR", "noaa21": "NOAA-21",
    "soyuz-ms": "Soyuz MS", "progress-ms": "Progress MS", "dragon-crew": "Crew Dragon", "dragon-cargo": "Cargo Dragon",
    "lares2": "LARES 2", "westpac": "WESTPAC", "nisar": "NISAR", "ixpe": "IXPE", "pace": "PACE", "starlink-v1": "Starlink (first generation)",
    "iceye": "ICEYE", "gps-iir": "GPS Block IIR", "gps-iif": "GPS Block IIF", "gps-iii": "GPS III", "galileo-foc": "Galileo FOC",
    "galileo-iov": "Galileo IOV", "qzs-1r": "QZS-1R", "qzs-3": "QZS-3", "qzs-7": "QZS-7", "irnss": "NavIC (IRNSS)", "saocom": "SAOCOM",
    "strix": "StriX", "terrasar-x": "TerraSAR-X", "xmm-newton": "XMM-Newton", "metop": "MetOp", "ers-1": "ERS-1", "cryosat-2": "CryoSat-2",
    "smos": "SMOS", "alos-2": "ALOS-2", "glonass-m": "GLONASS-M", "glonass-k": "GLONASS-K", "gcom-w": "GCOM-W", "gcom-c": "GCOM-C",
    "dampe": "DAMPE", "cses": "CSES", "scisat": "SCISAT-1", "proba-3-csc": "PROBA-3 coronagraph", "proba-3-osc": "PROBA-3 occulter",
    "proba-v": "PROBA-V", "oao-2": "OAO-2", "oao-3": "OAO-3 (Copernicus)", "juice": "JUICE", "bepicolombo": "BepiColombo",
    "shenzhou-orbital": "Shenzhou orbital module", "hayabusa2": "Hayabusa2", "earthcare": "EarthCARE", "metop-sg-a": "MetOp-SG A",
    "change-3": "Chang'e 3", "change-4": "Chang'e 4", "change-5": "Chang'e 5", "iris": "IRIS", "timed": "TIMED", "sert-2": "SERT 2",
    "isis-1": "ISIS 1", "tracers": "TRACERS", "delta2-stage": "Delta II second stage", "atlas5-centaur": "Atlas V Centaur",
    "centaur-d": "Centaur D", "falcon9-stage2": "Falcon 9 second stage", "falcon9-stage1": "Falcon 9 first stage",
    "falcon9-upper": "Falcon 9 upper stage", "h2a-stage2": "H-IIA second stage", "pslv-ps4": "PSLV fourth stage (PS4)",
    "kosmos3m-stage2": "Kosmos-3M second stage", "inmarsat-4": "Inmarsat-4", "viasat-3": "ViaSat-3", "o3b": "O3b",
    "globalstar-2": "Globalstar (second generation)", "oneweb": "OneWeb", "o3b-mpower": "O3b mPOWER", "wgs": "WGS", "aehf": "AEHF",
    "muos": "MUOS", "sbirs-geo": "SBIRS GEO", "ao-7": "AMSAT-OSCAR 7", "meteosat-msg": "Meteosat Second Generation",
    "fengyun-2": "Fengyun-2", "fengyun-3": "Fengyun-3", "mtg-i": "MTG-I", "mtg-s": "MTG-S", "insat-3d": "INSAT-3D", "gk2a": "GEO-KOMPSAT-2A",
    "gk2b": "GEO-KOMPSAT-2B", "meteor-m2": "Meteor-M 2", "midori-2": "Midori-II (ADEOS-II)", "resurs-dk1": "Resurs-DK1",
    "worldview-3": "WorldView-3", "blacksky-gen2": "BlackSky Gen-2", "satellogic-newsat": "Satellogic NewSat",
    "planet-pelican": "Planet Pelican", "hawkeye360-block1": "HawkEye 360 Block 1", "ghgsat-c": "GHGSat-C", "gaofen-1": "Gaofen-1",
    "cbers-4": "CBERS-4", "cbers-4a": "CBERS-4A", "amazonia-1": "Amazonia-1", "kompsat-3": "KOMPSAT-3", "kompsat-5": "KOMPSAT-5",
    "cartosat-2": "Cartosat-2", "resourcesat-2": "Resourcesat-2", "eos-06": "EOS-06", "kanopus-v": "Kanopus-V", "resurs-p": "Resurs-P",
    "r7-8k72k": "R-7 (8K72K) core and Blok E", "vostok-3ka": "Vostok 3KA", "voskhod-3kd": "Voskhod 3KD", "leonov-eva": "Leonov's spacewalk",
    "spot-6-7": "SPOT 6 and 7", "beidou-3-meo": "BeiDou-3 MEO", "beidou-3-igso": "BeiDou-3 IGSO", "cheops": "CHEOPS", "hxmt": "HXMT (Insight)",
    "svom": "SVOM", "radarsat-2": "RADARSAT-2", "rcm": "RADARSAT Constellation", "cosmo-skymed": "COSMO-SkyMed",
    "csg": "COSMO-SkyMed Second Generation", "elektro-l": "Elektro-L", "astrosat": "AstroSat", "gosat": "GOSAT", "microcarb": "MicroCarb",
    "cubesat-1u": "CubeSat 1U", "cubesat-2u": "CubeSat 2U", "cubesat-3u": "CubeSat 3U", "cubesat-3u-wings": "CubeSat 3U with wings",
    "cubesat-6u": "CubeSat 6U", "cubesat-6u-wings": "CubeSat 6U with wings", "cubesat-12u": "CubeSat 12U",
    "cubesat-12u-wings": "CubeSat 12U with wings", "vostok-blok-e": "Vostok Blok E", "qps-sar": "QPS-SAR", "xrism": "XRISM",
    "slim": "SLIM", "swarm": "Swarm", "hope": "Hope (Emirates Mars Mission)", "lunokhod-1": "Lunokhod 1", "lunokhod-2": "Lunokhod 2",
    "luna-16": "Luna 16", "mars-3": "Mars 3", "venera-9": "Venera 9", "sputnik-1": "Sputnik 1", "mariner-2": "Mariner 2",
    "galileo-probe": "Galileo's atmospheric probe", "surveyor-3": "Surveyor 3", "blue-ghost": "Blue Ghost", "sentinel-5p": "Sentinel-5P",
    "envisat": "Envisat", "umbra": "Umbra", "thuraya": "Thuraya", "kineis": "Kinéis", "pleiades": "Pléiades", "skysat": "SkySat",
    "einstein-probe": "Einstein Probe", "tiangong": "Tiangong (core module)", "wentian": "Wentian", "mengtian": "Mengtian",
    "mars-express": "Mars Express", "vostok-seat": "Vostok ejection seat", "vostok-chutes": "Vostok parachutes",
}
TEXTURE_NAMES = {
    "earth-relief": "Earth relief (ETOPO 2022)", "mercury-relief": "Mercury relief", "mars-relief": "Mars relief (MOLA)",
    "mars-height": "Mars heights (MOLA)", "venus-relief": "Venus relief (Magellan)", "pluto-relief": "Pluto relief",
    "saturn-ring-fine": "Saturn's rings, fine structure", "titan-lakes": "Titan's seas", "pluto": "Pluto in natural colour",
    "charon": "Charon in natural colour",
}

# The makers whose files the app uses and who publish them themselves: where a person should get them.
MAKERS = (
    ("solarsystemscope", "Solar System Scope's planet textures (CC BY 4.0)", "https://www.solarsystemscope.com/textures/"),
    ("nasa-3d", "NASA's and the agencies' own 3D models (NASA 3D Resources)", "https://science.nasa.gov/3d-resources/"),
    ("usgs", "USGS Astrogeology's planetary maps", "https://astrogeology.usgs.gov/search"),
    ("opal", "Hubble's OPAL maps of the giant planets (STScI MAST)", "https://archive.stsci.edu/hlsp/opal"),
    ("nasa-eo", "NASA Earth Observatory's Blue Marble and Black Marble", "https://earthobservatory.nasa.gov/features/BlueMarble"),
    ("nasa-svs", "NASA's Scientific Visualization Studio", "https://svs.gsfc.nasa.gov/"),
)


_LOADED: dict[str, dict] = {}


def _yml(name: str) -> dict:
    """A registry file, parsed once (models.yaml is 1.3 MB: the C loader where PyYAML has it, as scripts/check_registry.py does)."""
    if name not in _LOADED:
        loader = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
        _LOADED[name] = yaml.load((REG / name).read_text(encoding="utf-8"), Loader=loader)
    return _LOADED[name]


def refused_term(text: str) -> str:
    """The first term in a licence line that forbids offering the file to anyone for anything, or ''."""
    from check_registry import TEXTURE_REFUSED
    low = (text or "").lower()
    for bad in TEXTURE_REFUSED:
        if bad in low:
            return f"its author's terms forbid copies ({bad})"
    for rx, why in REFUSED_TERMS:
        if rx.search(text or ""):
            return why
    return ""


def name_of(row_id: str) -> str:
    if row_id in NAMES:
        return NAMES[row_id]
    return " ".join(w.capitalize() if not w.isdigit() else w for w in row_id.split("-"))


def licence_of(row: dict) -> tuple[str, str, str]:
    """(licence, its URL, '') for a model row this project may offer, or ('', '', why not)."""
    kind = row.get("kind")
    lic = str(row.get("licence") or "")
    if kind not in OWN_MODEL_KINDS:
        return "", "", "not built by this project"
    if kind == "derived-from-images":
        # The picture is the input: only a public-domain one leaves the shape free of its terms.
        if not lic.startswith("Public domain"):
            return "", "", "generated from a picture that is not public domain"
        if "this project's" not in lic:
            return "", "", "the row does not say which part is this project's"
        return CC_BY[0], CC_BY[1], ""
    if not OWN_SHAPE.search(lic):
        return "", "", "the row does not say that the shape is this project's and no picture is in the file"
    # Words like "CC BY-SA" in the line are about pictures LOOKED AT; the sentence that matched says none is in the file.
    return CC_BY[0], CC_BY[1], ""


def texture_licence(lic: str) -> tuple[str, str, str]:
    """(licence, URL, '') for a map this project baked, when every input is public domain or CC0; else ('', '', why)."""
    t = (lic or "").strip()
    why = refused_term(t)
    if why:
        return "", "", why
    low = t.lower()
    if low.startswith("public domain") or low.startswith("cc0") or ("not subject to copyright" in low and "nasa" in low):
        return CC0[0], CC0[1], ""
    return "", "", "an input is not public domain"


def app_link(row: dict) -> str:
    """The object in the app, where the row names a NORAD number (#at=sat-N, the link the ISS page uses); else ''."""
    m = re.search(r"NORAD (\d{1,6})", str(row.get("used_for") or ""))
    return f"{HOST}/#at=sat-{m.group(1)}" if m else ""


def credit_line(name: str, licence: str, inputs: str = "") -> str:
    tail = f"; {inputs}" if inputs else ""
    return f"{name}: {CREDIT_NAME}, {licence}{tail}"


def models(doc: dict | None = None, root: Path = ROOT) -> tuple[list[dict], list[dict]]:
    """(offered, refused). An offered model: {id, name, file, url, kb, tris, licence, licence_url, credit, made, app}."""
    doc = doc if doc is not None else _yml("models.yaml")
    offered, refused = [], []
    for r in doc.get("real_models") or []:
        if not isinstance(r, dict) or r.get("kind") not in OWN_MODEL_KINDS:
            continue
        name = name_of(r["id"])
        lic, url, why = licence_of(r)
        f = str(r.get("file") or "")
        if not why and not (root / f).is_file():
            why = "the file is not in the tree"
        if why:
            refused.append({"id": r["id"], "name": name, "why": why})
            continue
        inputs = "generated with TRELLIS (MIT) from a public-domain NASA picture" if r["kind"] == "derived-from-images" else ""
        offered.append({
            "id": r["id"], "name": name, "kind": "model", "file": f, "url": f"{HOST}/{f[len('site/'):]}",
            "kb": r.get("kb"), "tris": r.get("budget_tris"), "class": r.get("class") or "",
            "licence": lic, "licence_url": url, "credit": credit_line(name, lic, inputs),
            "made": str(r.get("credit") or ""), "app": app_link(r),
        })
    return offered, refused


def textures(doc: dict | None = None, root: Path = ROOT) -> tuple[list[dict], list[dict]]:
    """(offered, refused) among OURS_TEXTURES: the largest file of each row."""
    doc = doc if doc is not None else _yml("textures.yaml")
    offered, refused = [], []
    for r in doc.get("textures") or []:
        if r.get("id") not in OURS_TEXTURES:
            continue
        files = [f for f in r.get("files") or [] if "{mm}" not in f["file"] and (root / f["file"]).is_file()]
        if not files:
            refused.append({"id": r["id"], "name": TEXTURE_NAMES.get(r["id"], r["id"]), "why": "the file is not in the tree"})
            continue
        f = max(files, key=lambda x: (x.get("px") or [0])[0])
        lic, url, why = texture_licence(f.get("licence", ""))
        name = TEXTURE_NAMES.get(r["id"], r["id"])
        if why:
            refused.append({"id": r["id"], "name": name, "why": why})
            continue
        source = str(f.get("credit") or "").split(":", 1)[-1].strip()
        offered.append({
            "id": r["id"], "name": name, "kind": "map", "file": f["file"], "url": f"{HOST}/{f['file'][len('site/'):]}",
            "kb": round((f.get("bytes") or (root / f["file"]).stat().st_size) / 1000, 1), "px": f.get("px"),
            "licence": lic, "licence_url": url, "credit": credit_line(name, lic, f"from {source}" if source else ""),
            "made": str(f.get("make") or "").split(";")[0][:300], "app": "",
        })
    return offered, refused


def procedural(doc: dict | None = None) -> dict:
    """The procedural shapes: one entry, because they are code (site/js/scene/models.js), under the repository's licence."""
    doc = doc if doc is not None else _yml("models.yaml")
    rows = [r for r in doc.get("models") or [] if isinstance(r, dict) and r.get("kind") == "procedural"]
    return {"count": len(rows), "file": "site/js/scene/models.js", "url": f"{GITHUB}/blob/main/site/js/scene/models.js",
            "licence": "MIT (this repository's licence)", "credit": f"Procedural spacecraft shapes: {CREDIT_NAME}, MIT"}


def others(models_doc: dict | None = None, textures_doc: dict | None = None) -> list[dict]:
    """The makers whose files the app uses, with how many, and where they publish them. Never offered here."""
    models_doc = models_doc if models_doc is not None else _yml("models.yaml")
    textures_doc = textures_doc if textures_doc is not None else _yml("textures.yaml")
    count = {k: 0 for k, _, _ in MAKERS}
    for r in models_doc.get("real_models") or []:
        if isinstance(r, dict) and r.get("kind") not in OWN_MODEL_KINDS:
            count["nasa-3d"] += 1
    for r in textures_doc.get("textures") or []:
        if r.get("id") in OURS_TEXTURES:
            continue
        for f in r.get("files") or []:
            c = str(f.get("credit") or "").lower()
            key = ("solarsystemscope" if "solar system scope" in c else "opal" if "opal" in c or "hubble" in c
                   else "nasa-eo" if "earth observatory" in c else "nasa-svs" if "goddard" in c or "svs" in c
                   else "usgs" if "usgs" in c else "")
            if key:
                count[key] += 1
    return [{"key": k, "what": w, "url": u, "files": count[k]} for k, w, u in MAKERS if count[k]]


def changed_dates(paths: list[str], root: Path = ROOT) -> dict[str, str]:
    """{repository path: the day its bytes last changed in git, YYYY-MM-DD}; {} where git or its history is not there.

    The last change and not the first add: Hubble's path held NASA's file from 2026-09-12 and this project's own
    model since 1.3.0, and a reader of the changelog wants the day the file they would download appeared."""
    try:
        out = subprocess.run(["git", "-C", str(root), "log", "--format=@%as", "--name-only", "--", "site/models", "site/textures"],
                             capture_output=True, text=True, timeout=60, check=True).stdout
    except (OSError, subprocess.SubprocessError):
        return {}
    want, day, seen = set(paths), "", {}
    for line in out.splitlines():
        if line.startswith("@"):
            day = line[1:]
        elif line in want and line not in seen:
            seen[line] = day  # git log is newest first: the first day met is the last change
    return seen


def plan(root: Path = ROOT) -> dict:
    m_off, m_ref = models(root=root)
    t_off, t_ref = textures(root=root)
    return {"models": m_off, "maps": t_off, "refused": m_ref + t_ref, "procedural": procedural(), "others": others()}


def manifest(p: dict, dates: dict[str, str]) -> dict:
    """The machine-readable pack (assets/pack.json): what a script needs to fetch and credit each file."""
    keep = ("id", "name", "kind", "url", "kb", "licence", "licence_url", "credit", "app")
    files = [{**{k: x[k] for k in keep if x.get(k) not in (None, "")}, **({"changed": dates[x["file"]]} if x["file"] in dates else {})}
             for x in p["models"] + p["maps"]]
    return {"about": f"What Space Radar made itself, served from where the app loads it. {HOST}/assets/index.html",
            "credit": CREDIT_NAME, "files": files, "procedural": p["procedural"],
            "elsewhere": [{"what": o["what"], "url": o["url"]} for o in p["others"]]}


def main(argv: list[str]) -> int:
    p = plan()
    if "--json" in argv:
        print(json.dumps(manifest(p, changed_dates([x["file"] for x in p["models"] + p["maps"]])), indent=1, ensure_ascii=False))
        return 0
    print(f"offered: {len(p['models'])} models, {len(p['maps'])} maps, and {p['procedural']['count']} procedural shapes as code")
    for r in p["refused"]:
        print(f"  refused {r['id']}: {r['why']}")
    for o in p["others"]:
        print(f"  someone else's: {o['files']} files, {o['what']} -> {o['url']}")
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
