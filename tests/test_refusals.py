#!/usr/bin/env python3
"""Break each registry rule on purpose and assert the validator says so.

Sara's rule, spec 0018's reason for existing: a guard that *reports* wrongly is
indistinguishable from one that *behaves* wrongly and is harder to notice. So the guard is
tested by breaking the thing it guards, not by reading it.

Every case below must fail the validator AND name the file and the row, because a refusal
that does not say where is a refusal somebody will switch off.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def link(src, dst):
    """A hard link where the filesystem allows, a copy where it does not."""
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def whole_dir(src: Path, dst: Path) -> None:
    """A directory nothing in a case ever changes, given as ONE symbolic link (a copy where the
    system has none): 280 files of maps, pictures and sound were 280 links to make and 280 to
    remove per case, and that was most of what a case cost once the parse was shared."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.symlink(src, dst, target_is_directory=True)
    except (OSError, NotImplementedError):
        shutil.copytree(src, dst, copy_function=link)


def textures_into(work: Path) -> None:
    """site/textures/ with its bytes: registry/textures.yaml states each file's size and pixels and
    the validator reads both from the file (2026-09-28)."""
    whole_dir(ROOT / "site" / "textures", work / "site" / "textures")


def media_into(work: Path) -> None:
    """site/images/ and site/audio/. registry/exotics.yaml points at the photographs and
    registry/audio.yaml at the files it names (spec 0035), and the validator checks they are really
    in the tree, so the tree needs them or every case fails for a reason that has nothing to do
    with the case under test.

    EVERY tree a case is given is a link of one kind or the other (see link() and whole_dir()). So
    NO CASE MAY WRITE INTO A FILE IT WAS GIVEN: a write through a link is a write to the
    repository. Cases change a file only through mutate() below, which replaces it, and only under
    registry/, site/js/ui/ and the SEO pages, none of which is a whole_dir()."""
    whole_dir(ROOT / "site" / "images", work / "site" / "images")
    if (ROOT / "site" / "audio").is_dir():
        whole_dir(ROOT / "site" / "audio", work / "site" / "audio")


def mutate(path: Path, text: str) -> None:
    """Replace a file in a work tree with new text, as a NEW file: unlink first, so that even a
    path that turned out to be a hard link can never write through to the repository."""
    if ROOT in Path(os.path.realpath(path)).parents:
        raise RuntimeError(f"{path} is inside a linked directory of the repository: a case may not change it")
    path.unlink()
    path.write_text(text, encoding="utf-8")


# HOW THIS RUNS IN TWO MINUTES AND NOT FIFTY (2026-10-05). Every case still runs the real validator
# as its own process in its own tree: nothing about what is proved has changed. What changed is the
# waiting. Cases run `--jobs` at a time (default: the CPU count), each in a directory of its own;
# the big media are hard links; and the validator's YAML parses are shared through
# $REGISTRY_YAML_CACHE (scripts/check_registry.py, keyed by the SHA-256 of the text, so a case that
# breaks one file parses that one file). Output is printed in the order the cases are written,
# whatever order they finish in.
JOBS = os.cpu_count() or 2
ENV: dict = dict(os.environ)


def run_cases(fn, cases, tmp: Path) -> int:
    """fn(case, work_dir) -> (lines, failures) for each case, JOBS at a time, printed in order."""
    def one(numbered):
        i, case = numbered
        work = tmp / f"case-{i}" / "work"
        work.mkdir(parents=True)
        try:
            return fn(case, work)
        except Exception as exc:  # a harness that dies must fail the run, not vanish in a thread
            return [f"  ** {case[0]}: the harness raised {type(exc).__name__}: {exc}"], 1
        finally:
            shutil.rmtree(work.parent, ignore_errors=True)
    failures = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, JOBS)) as pool:
        for lines, bad in pool.map(one, list(enumerate(cases))):
            for line in lines:
                print(line)
            failures += bad
    return failures


def validator(work: Path, script: str = "scripts/check_registry.py", env: dict | None = None):
    return subprocess.run([sys.executable, script], cwd=work, capture_output=True, text=True, env=env or ENV)


CASES: list[tuple[str, str, str, str]] = [
    # (name, file, find, replace)
    ("layer names a source that does not exist",
     "layers.yaml", "source: celestrak-stations", "source: celestrak-stationz"),
    ("layer names a propagator that does not exist",
     "layers.yaml", "propagator: sgp4", "propagator: magic"),
    ("layer's frame names a world that does not exist",
     "layers.yaml", "frame: earth-inertial", "frame: eris-inertial"),
    ("layer's style names a model with no row",
     "layers.yaml", "model: station-generic", "model: station-deluxe"),
    ("world's parent does not exist",
     "worlds.yaml", "parent: sun", "parent: nebula"),
    # --- 2026-10-05: Earth data overlays (registry/overlays.yaml) -------------------------------
    ("an overlay host with no measured CORS header",
     "overlays.yaml", 'cors: "access-control-allow-origin: *"', 'cors: "probably fine"'),
    ("an overlay that asks for today's picture, which is never made yet",
     "overlays.yaml", "date: {rule: daily, lag_days: 2, tries: 3}", "date: {rule: daily, lag_days: 0, tries: 3}"),
    ("an overlay with a date rule nothing reads",
     "overlays.yaml", "date: {rule: monthly, lag_months: 4, tries: 3}", "date: {rule: weekly, lag_weeks: 1, tries: 3}"),
    ("an overlay whose legend has one colour",
     "overlays.yaml", 'stops: ["#f800f8", "#0021ff", "#00de9c", "#87d700", "#ff4e00", "#ffffff"]', 'stops: ["#ffffff"]'),
    ("an overlay with no class, so the legend cannot say how it was made",
     "overlays.yaml", "    class: modelled\n    bytes: 187307", "    class: guessed\n    bytes: 187307"),
    ("an overlay whose maker CREDITS.md does not carry",
     "overlays.yaml", 'credit: "IMERG precipitation, NASA Global Precipitation Measurement mission"', 'credit: "Somebody"'),
    ("an overlay of a world that does not exist",
     "overlays.yaml", "  - id: sea-ice\n    world: earth", "  - id: sea-ice\n    world: vulcan"),
    # A WORLD DRAWN FROM FACTS names where each one was read (Pluto and Jupiter's four big moons,
    # 2026-09-22). A radius with no page is a number nobody can check; a page with no day is one
    # nobody can re-check when the page changes.
    ("a flat-coloured world with no page for its radius",
     "worlds.yaml",
     '      radius: {source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html", read: 2026-09-22, says: "radius 1821.5 km"}\n',
     ""),
    ("a world fact with no day it was read",
     "worlds.yaml", 'read: 2026-09-22, says: "radius 1560.8 km"', 'says: "radius 1560.8 km"'),
    ("a flat colour that is not a colour",
     "worlds.yaml", 'look: {flat: "#958b7e", textures: ganymede}', 'look: {flat: "pale", textures: ganymede}'),
    # The browser's copy of worlds.yaml is kept by hand (scene/worlds.js, scene/stage.js), so the
    # two must be refused when they disagree -- which is why this harness copies those two files.
    ("a world whose radius the browser does not draw",
     "worlds.yaml", "radius_km: 1560.8", "radius_km: 1650.8"),
    ("a world row the browser has never heard of",
     "worlds.yaml", "  - id: callisto\n",
     "  - id: themisto\n    display: Themisto\n    parent: jupiter\n    radius_km: 4.5\n"
     "    unit_km: 1\n    ephemeris: {propagator: body, body: Jupiter}\n    look: {textures: jupiter}\n\n"
     "  - id: callisto\n"),
    # A PHOTOGRAPH IS SOMEBODY ELSE'S WORK. The EHT pictures ship under CC BY 4.0, whose bargain is
    # that the credit travels with the image; a row that cannot name the credit, the licence or the
    # source must not ship one, and a file that is not in the repository is a 404 on a card.
    ("exotic ships a photograph with no credit",
     "exotics.yaml", 'credit: "EHT Collaboration"', 'credit: ""'),
    ("exotic ships a photograph with no licence",
     "exotics.yaml", 'licence: "CC BY 4.0"', 'licence: ""'),
    ("exotic ships a photograph that is not in the repository",
     "exotics.yaml", "file: site/images/eht-m87.jpg", "file: site/images/eht-m87-missing.jpg"),
    ("exotic ships a photograph from outside site/images/",
     "exotics.yaml", "file: site/images/eht-m87.jpg", "file: site/models/eht-m87.jpg"),
    ("source has no attribution line",
     "sources.yaml", '    attribution: "Orbital data: CelesTrak (T. S. Kelso)"\n', ""),
    ("source's cadence is not a duration",
     "sources.yaml", "cadence: 3h", "cadence: sometimes"),
    ("source's auth is neither none nor a secret",
     "sources.yaml", "auth: none", "auth: apikey"),
    # The harvester (spec 0003) finds a source's parser by the row's `parser:` name. A name with
    # no module behind it would be found by the Lambda, at night, as an `error` on one source;
    # the validator finds it in CI, by name.
    ("source names a parser with no module behind it",
     "sources.yaml", "parser: celestrak_satcat", "parser: celestrak_catalogue"),
    ("source names a list file that is not in the tree",
     "sources.yaml", "list: harvest/lists/horizons-ids.yaml", "list: harvest/lists/nowhere.yaml"),
    # The `browser:` flag decides whether the app may fall back to the upstream when our snapshot
    # is missing. Left out, either default would be a guess about CORS dressed as a measurement.
    ("source does not say whether a browser may read it",
     "sources.yaml", "    browser: true\n", ""),
    ("source's browser flag is a word, not a boolean",
     "sources.yaml", "browser: false", "browser: maybe"),
    ("model has no licence",
     "models.yaml", 'licence: "MIT (this project)", budget_tris: 1500', "budget_tris: 1500"),
    ("event type has no lead times",
     "events.yaml", "    lead_times: [same-day, 1d, 1w, on-confirm]\n", ""),
    # Spec 0031: the browser reads events.yaml now (data/events.registry.js), so its three promises
    # are checked: `computed` means data/events.js has a builder, prominence orders the stream, and
    # `enabled` is the switch the mirror resolves.
    ("an event type claiming to be computed that nothing in the browser computes",
     "events.yaml", "    source: ll2-upcoming\n", "    source: computed\n"),
    ("an event prominence outside 1..5",
     "events.yaml", "    prominence: 3\n    copy: launch\n", "    prominence: 9\n    copy: launch\n"),
    ("an event `enabled:` that is a word, not a boolean",
     "events.yaml", "    enabled: false              # until the Space-Track secret exists",
     "    enabled: yes-please         # until the Space-Track secret exists"),
    ("site sits on a world that does not exist",
     "sites.yaml", "world: moon", "world: phoebe"),

    # --- registry/sites.yaml, the landing sites ----------------------------------------
    # Twenty-one arrived at once on 2026-09-22, each with a coordinate somebody copied off a page.
    # Every case here is a way that batch could have been wrong with nothing noticing: a landing
    # drawn as a launch pad, a number with no page behind it, a page with no date, and a sentence
    # the card would have cut in half.
    ("a landing site that does not say what to draw, so it would be a launch pad",
     "sites.yaml", "shape: rover, source: pds-msl", "source: pds-msl"),
    ("a landing site drawn as a shape nothing builds",
     "sites.yaml", "shape: rover, source: pds-msl", "shape: hovercraft, source: pds-msl"),
    ("a landing site citing a reference that does not exist",
     "sites.yaml", "source: pds-msl", "source: pds-nothing"),
    ("a new landing site that cites nothing",
     "sites.yaml", '    source: pds-mer\n    aliases: ["Columbia',
     '    source: uncited\n    aliases: ["Columbia'),
    ("an uncited row that now cites something and is still listed as uncited",
     "sites.yaml", "landed: 2021-02-18, shape: rover, source: uncited",
     "landed: 2021-02-18, shape: rover, source: pds-msl"),
    ("a landing site that says what landed and not when",
     "sites.yaml", "    landed: 1966-06-02\n", ""),
    ("a landing date that is not a date",
     "sites.yaml", "    landed: 1966-06-02\n", '    landed: "June 1966"\n'),
    ("a reference with no date it was read",
     "sites.yaml", '    url: "https://www.uahirise.org/ESP_031036_1345"\n    read: 2026-09-22\n',
     '    url: "https://www.uahirise.org/ESP_031036_1345"\n'),
    ("a reference that is not a URL anybody can open",
     "sites.yaml", 'url: "https://www.uahirise.org/ESP_031036_1345"', 'url: "HiRISE, somewhere"'),
    ("a reference no row cites",
     "sites.yaml", "references:\n",
     'references:\n  orphan:\n    url: "https://example.org/"\n    read: 2026-09-22\n    says: "nothing"\n'),
    ("a site sentence longer than the card prints",
     "sites.yaml", 'doing: "Driving up a mountain of layered rock since 2012."',
     'doing: "Driving up a mountain of layered rock since 2012, and before that landing on a '
     'crane, and before that crossing the gap between two planets for eight and a half months, '
     'on the way to the crater."'),
    ("a site sentence that is only true today",
     "sites.yaml", 'doing: "Driving up a mountain of layered rock since 2012."',
     'doing: "Currently driving up a mountain of layered rock."'),
    ("a site sentence with a thousands comma",
     "sites.yaml", 'doing: "Driving up a mountain of layered rock since 2012."',
     'doing: "Driving up 5,000 metres of layered rock since 2012."'),
    # What to show's groups (spec 0068 task 3): a layer with none, or one the list does not name,
    # would fall out of the popover.
    ("a layer with no What-to-show group",
     "layers.yaml", "    display: Aurora\n    group: earth\n", "    display: Aurora\n"),
    ("a layer in a group the list does not name",
     "layers.yaml", "    display: Aurora\n    group: earth\n", "    display: Aurora\n    group: weather\n"),
    ("a layer loading rule that is not on-demand",
     "layers.yaml", "    load: on-demand\n", "    load: sometimes\n"),
    ("a small layer that hides its data behind its switch",
     "layers.yaml", "    budget: {max_items: 15000}\n", "    budget: {max_items: 100}\n"),
    ("a latitude that is not a latitude",
     "sites.yaml", "lat: -45.058", "lat: -145.058"),
    ("an anchor whose uncertainty has drifted from the site row it came from",
     "oddities.yaml", "        uncertainty_m: 0.4\n", "        uncertainty_m: 4.0\n"),
    ("shower's peak is not a date",
     "showers.yaml", 'peak: "08-12"', 'peak: "August"'),

    # --- registry/rockets.yaml ---------------------------------------------------------
    # A rocket row decides what a launch is DRAWN as and the card repeats the row's own claim
    # about itself, so every refusal here is one refusal wearing different clothes: a row must
    # not be able to say something it cannot support, and it must not be able to draw nothing.
    ("two rocket rows share an id",
     "rockets.yaml", "  - id: falcon-heavy\n", "  - id: falcon-9\n"),
    ("a rocket row with no display name the card could print",
     "rockets.yaml", '    display: "Electron"\n', ""),
    ("a rocket row nothing can match",
     "rockets.yaml", '    match: {full_name: ["Electron"]}\n', ""),
    ("a rocket row matches on a key the chain does not walk",
     "rockets.yaml", '    match: {full_name: ["Electron"]}',
     '    match: {nickname: ["Electron"]}'),
    ("two rocket rows claim the same match string, so the second never draws",
     "rockets.yaml", '    match: {full_name: ["Vulcan VC4S"]}',
     '    match: {full_name: ["Vulcan VC6L"]}'),
    ("a rocket row keyed on a string the feed has never returned",
     "rockets.yaml", '    match: {full_name: ["Electron"]}',
     '    match: {full_name: ["Energia"]}'),
    ("a rocket height in feet, or a booster length written into height_m",
     "rockets.yaml", "    height_m: 18.0\n", "    height_m: 590.0\n"),
    ("a rocket row with no core diameter",
     "rockets.yaml", "    core_dia_m: 1.2\n", ""),
    ("a booster shape the builder cannot draw",
     "rockets.yaml", "{shape: liquid_conical, count: 4, dia_m: 2.68, len_m: 19.6}",
     "{shape: solid_huge, count: 4, dia_m: 2.68, len_m: 19.6}"),
    ("boosters counted on a vehicle that has none",
     "rockets.yaml", "dia_m: 1.2, len_m: 2.5}\n    boosters: {shape: none, count: 0}",
     "dia_m: 1.2, len_m: 2.5}\n    boosters: {shape: none, count: 4}"),
    ("a booster shape with no diameter, which is the whole silhouette",
     "rockets.yaml", "{shape: solid_fat, count: 4, dia_m: 3.4, len_m: 13.5}",
     "{shape: solid_fat, count: 4, len_m: 13.5}"),
    ("something on top that is not a fairing, a capsule, a ship or nothing",
     "rockets.yaml", "    top: {kind: integrated_ship}", "    top: {kind: nosecone}"),
    ("a body taper the builder cannot draw",
     "rockets.yaml", "    taper: stepped\n", "    taper: pointy\n"),
    ("a stepped body with no step in it",
     "rockets.yaml", "    sections: [{dia_m: 3.5}, {dia_m: 2.6}]\n", ""),
    ("a hammerhead that does not say how much wider the fairing is",
     "rockets.yaml",
     "    taper: hammerhead\n    top: {kind: fairing, dia_m: 4.2}\n    boosters: {shape: none, count: 0}\n    engines: {count: 7, pattern: unknown}\n",
     "    taper: hammerhead\n    top: {kind: fairing}\n    boosters: {shape: none, count: 0}\n    engines: {count: 7, pattern: unknown}\n"),
    ("an engine arrangement the builder cannot draw",
     "rockets.yaml", "    engines: {count: 13, pattern: unknown}",
     "    engines: {count: 13, pattern: swirl}"),
    ("a first stage with no engines on it",
     "rockets.yaml", "    engines: {count: 33, pattern: dense_ring}",
     "    engines: {count: 0, pattern: dense_ring}"),
    ("a row that will not say whether it draws the vehicle or its family",
     "rockets.yaml", "    stands_for: family\n    height_m: 46.3\n",
     "    stands_for: probably\n    height_m: 46.3\n"),
    ("a shape with no evidence behind it",
     "rockets.yaml",
     '    source: "Wikipedia Rocket Lab Electron and Rutherford, reporting the payload user\'s guide (the PUG itself returns 403): 18 m, 1.2 m, \'eight engines surrounding a central ninth\'"\n',
     ""),
    ("a livery with a colour but no class",
     "rockets.yaml", '    livery: {body: "#C6CBD1", class: measured}\n',
     '    livery: {body: "#C6CBD1"}\n'),
    ("a livery that is neither a map of zones nor the literal `unknown`",
     "rockets.yaml", '    livery: {body: "#9AA3AD", nose: "#EEF2F7", tail: "#D2743A", class: measured}\n',
     "    livery: greenish\n"),
    ("the feed evidence has no date on it",
     "rockets.yaml", "observed_on: 2026-09-07", "# observed_on: removed"),

    # The OPTIONAL dimensions. These were the gap: height_m, core_dia_m and boosters.dia_m were
    # guarded from the first day and `top.len_m: "long"` sailed through into NaN geometry, drawn
    # under a card still saying "drawn from published dimensions".
    ("a fairing length that is not a number, which draws NaN geometry",
     "rockets.yaml", "    top: {kind: fairing, dia_m: 5.2, len_m: 13.2}",
     '    top: {kind: fairing, dia_m: 5.2, len_m: "long"}'),
    ("a fairing longer than the whole rocket",
     "rockets.yaml", "    top: {kind: fairing, dia_m: 5.2, len_m: 13.2}",
     "    top: {kind: fairing, dia_m: 5.2, len_m: 400}"),
    ("a negative fairing length",
     "rockets.yaml", "    top: {kind: fairing, dia_m: 5.2, len_m: 13.2}",
     "    top: {kind: fairing, dia_m: 5.2, len_m: -5}"),
    ("a fairing diameter that is not a number",
     "rockets.yaml", "    top: {kind: fairing, dia_m: 5.2, len_m: 13.2}",
     '    top: {kind: fairing, dia_m: "wide", len_m: 13.2}'),
    ("a booster length that is not a number",
     "rockets.yaml", "{shape: liquid_conical, count: 4, dia_m: 2.68, len_m: 19.6}",
     '{shape: liquid_conical, count: 4, dia_m: 2.68, len_m: "tall"}'),
    ("a booster wider than the rocket it straps to",
     "rockets.yaml", "{shape: liquid_conical, count: 4, dia_m: 2.68, len_m: 19.6}",
     "{shape: liquid_conical, count: 4, dia_m: 900, len_m: 19.6}"),
    ("a section length that is not a number",
     "rockets.yaml", "    sections: [{dia_m: 3.5}, {dia_m: 2.6}]",
     '    sections: [{dia_m: 3.5, len_m: "some"}, {dia_m: 2.6}]'),

    # The card prints `disputed_height` inside "sources disagree on its HEIGHT (...)", so a row
    # cannot flag a disagreement about something else and cannot flag one with nothing in it.
    ("a height disagreement flagged under the old name, which said nothing about WHAT",
     "rockets.yaml", '    disputed_height: "ESA 28 m; ArianeGroup 30 m standing on its legs"',
     '    disputed: "ESA 28 m; ArianeGroup 30 m standing on its legs"'),
    ("a height flagged as disputed with nothing to show for it",
     "rockets.yaml", '    disputed_height: "ESA 28 m; ArianeGroup 30 m standing on its legs"',
     "    disputed_height: true"),

    # --- registry/oddities.yaml ---------------------------------------------------------
    # A row here is A CLAIM ABOUT A PLACE, and the card repeats the row's own claim about itself.
    # So every case below is one refusal wearing different clothes: a row must not be able to say
    # something it cannot support. There is one case per rule and each is broken by mutation,
    # because the only way to tell a validator that works from one that passes everything is to
    # hand it a bad row.

    # The five kinds of answer to "where is it?", and the one that carries no answer at all
    ("an oddity in a kind of place the app has never heard of",
     "oddities.yaml", "      kind: in_orbit", "      kind: in_a_museum"),
    ("a row that says nobody knows where it is AND carries a latitude",
     "oddities.yaml", "      kind: unknown\n", "      kind: unknown\n      lat: 3.0\n"),
    ("a row that says nobody knows and will not say what was looked for",
     "oddities.yaml",
     '      why_unknown: "Bean threw it as hard as he could. No source names the crater and no orbital\n'
     '                    image has ever resolved a lapel pin."\n', ""),

    # A surface row states its position ONE way, and both ways carry a precision
    ("a surface row carrying both its own coordinates and an anchor",
     "oddities.yaml", "        precision_m: unknown\n        how: photogrammetric",
     "        lat: -3.6\n        precision_m: unknown\n        how: photogrammetric"),
    ("a surface row that says it is on a surface and will not say where",
     "oddities.yaml", "        lat: 32.5956\n        lon: 19.3496\n", ""),
    ("an oddity anchored on a landing site that is not in sites.yaml",
     "oddities.yaml", "        id: apollo-14", "        id: apollo-13"),
    ("an anchor whose coordinates have already drifted from the site row they came from",
     "oddities.yaml", "        lat: -3.64589", "        lat: -3.6"),
    ("an anchor with no uncertainty, which is the number we DO have",
     "oddities.yaml", "        uncertainty_m: 0.4\n", ""),
    ("an anchor that will not say whose position was surveyed",
     "oddities.yaml", '        of: "the Apollo 14 lunar module Antares"\n', ""),
    ("an object precision that is prose rather than metres or the literal `unknown`",
     "oddities.yaml", "        precision_m: unknown", "        precision_m: about forty metres"),
    ("a way of knowing a position that is not one of the five",
     "oddities.yaml", "        how: photogrammetric", "        how: eyeballed"),
    # `unknown` pairs with `unsurveyed` (nobody looked) and with a locating `how` (somebody
    # looked and published no error bar -- the golf balls). It cannot pair with `surveyed`,
    # because a survey is a number, and this is the case that says so.
    ("`precision_m: unknown` on a row that says the object was surveyed, which is a number",
     "oddities.yaml", "        precision_m: unknown\n        how: photogrammetric",
     "        precision_m: unknown\n        how: surveyed"),
    ("a latitude off the world",
     "oddities.yaml", "        lat: 32.5956", "        lat: 132.5956"),
    ("a surface row on a world with no worlds.yaml row",
     "oddities.yaml", "      world: moon\n      anchor:", "      world: phoebe\n      anchor:"),

    # An orbit is six numbers plus a phase, or it is a wrong orbit rather than none
    ("half an element set, which draws a wrong orbit rather than no orbit",
     "oddities.yaml", "        e:        0.2559399569483128\n", ""),
    ("an orbit with no phase, so the object would be drawn at perihelion without saying so",
     "oddities.yaml",
     "        tp_jd:    2461496.674258765  # perihelion is PUBLISHED, so the phase is real, not a placeholder\n",
     ""),
    ("an orbit with no evidence_epoch, so the card would print `0 days old` about 2018 data",
     "oddities.yaml", "      evidence_epoch: 2018-03-19\n", ""),
    ("an orbit with no observation arc, which is a number with no history",
     "oddities.yaml", '      arc: "2018-02-08 to 2018-03-19"\n', ""),
    ("an orbit that will not say how many observations it rests on",
     "oddities.yaml", "      obs_count: 374\n", ""),

    # Attached: the position is the carrier's, and the mount is our drawing
    # The example was `deep-cassini` until 2026-10-06, when Cassini got a record (drawn from its
    # path file, site/data/eph). Ulysses has none.
    ("an oddity bolted to a spacecraft the app does not draw",
     "oddities.yaml", "      to: deep-voyager-1", "      to: deep-ulysses"),
    ("an oddity also drawn on a second carrier the app does not draw",
     "oddities.yaml", "      also_on: [deep-voyager-2]", "      also_on: [deep-ulysses]"),
    ("an attached row that will not admit the mount point is our arrangement",
     "oddities.yaml", "      mount_class: illustrative\n", ""),
    ("an attached row carrying its own horizons id, which draws a second Voyager",
     "oddities.yaml", "      to: deep-voyager-1\n",
     '      to: deep-voyager-1\n      horizons_id: "-31"\n'),
    ("an attached row claiming to know its position better than its carrier does",
     "oddities.yaml", "    position_class: inherit", "    position_class: measured"),
    # THE MOUNT IS THE DRAWING, and scene/models.js reads these five numbers and nothing else.
    ("an attached row with no mount block at all, so nothing knows where to hang it",
     "oddities.yaml", "      mount: {x: 0.085, y: -0.130, z: 0.020, scale: 0.075, face: bus_side}\n", ""),
    ("an attached row that does not say how big it is drawn against its carrier",
     "oddities.yaml", "mount: {x: 0.085, y: -0.130, z: 0.020, scale: 0.075, face: bus_side}",
     "mount: {x: 0.055, y: -0.020, z: 0.030, face: bus_side}"),
    ("a part drawn bigger than the spacecraft carrying it",
     "oddities.yaml", "z: 0.020, scale: 0.075, face: bus_side}", "z: 0.020, scale: 1.4, face: bus_side}"),
    ("a mount point outside the carrier's own model, hanging the object in space beside it",
     "oddities.yaml", "mount: {x: 0.085,", "mount: {x: 5.5,"),
    ("a mount coordinate that is not a number, so the child is drawn at NaN",
     "oddities.yaml", "mount: {x: 0.085,", "mount: {x: outside,"),
    ("`position_class: inherit` on a row with nothing to inherit from",
     "oddities.yaml", "    position_class: inferred\n    orbit_provenance:",
     "    position_class: inherit\n    orbit_provenance:"),

    # Came home: an address, or it does not have this kind
    ("a thing that came home with no address",
     "oddities.yaml", '      where_kept: "Space Center Houston, Texas"\n', ""),
    ("a thing that came home with nobody saying it is there",
     "oddities.yaml",
     '      source: "Space Center Houston displays the prop returned after STS-120"\n', ""),
    ("a thing that came home to no coordinates at all",
     "oddities.yaml", "      lat: 29.5518\n", ""),

    # The honesty fields
    ("`position_class: sample`, which is refused BY NAME because these rows stand in for nothing",
     "oddities.yaml", "    position_class: measured", "    position_class: sample"),
    ("a position class outside the four",
     "oddities.yaml", "    position_class: measured", "    position_class: probably"),
    ("a row claiming a surveyed position for something found in a photograph",
     "oddities.yaml", "    position_class: inferred          # the ANCHOR is measured",
     "    position_class: measured          # the ANCHOR is measured"),
    ("a row claiming a measured position for an object nobody can place",
     "oddities.yaml",
     '      would_need: "an LROC targeted observation, and it would not resolve it anyway"\n'
     "    position_class: inferred",
     '      would_need: "an LROC targeted observation, and it would not resolve it anyway"\n'
     "    position_class: measured"),
    ("a myth with nothing to correct it",
     "oddities.yaml",
     '        correction: "it flew up and back on STS-120 in October 2007, stowed where no astronaut\n'
     '                     could reach it, and was handed back to Lucasfilm."\n', ""),
    ("a debunk with no source, which is a rumour going the other way",
     "oddities.yaml", '        source: "Space.com, on the STS-120 lightsaber"\n', ""),
    ("a first sentence past the card's 160 characters, where the card would cut it in half",
     "oddities.yaml", '    fact: "You wear the silver astronaut pin',
     '    fact: "You wear the silver astronaut pin, which is a thing that is given to every single '
     'astronaut who has been selected but has not yet flown anywhere at all,'),
    ("an oddity with no evidence behind it",
     "oddities.yaml",
     '    source: "Astronomical Returns, \'The astronaut pin and the lone star on the Moon\',\n'
     "             astronomicalreturns.com, on Apollo 12, 19-20 November 1969. The crater is not\n"
     "             identified in any source reached, and no orbital image resolves an object that size.\"\n",
     ""),
    ("an oddity with no line the card can print under Source",
     "oddities.yaml",
     '    cite: "Astronomical Returns, The astronaut pin and the lone star on the Moon"\n', ""),
    ("a source line too long for the card that prints it",
     "oddities.yaml",
     '    cite: "Astronomical Returns, The astronaut pin and the lone star on the Moon"',
     '    cite: "Astronomical Returns, The astronaut pin and the lone star on the Moon, which is a '
     'blog post about Apollo 12 that nobody has ever managed to summarise in fewer words than these"'),
    ("a claim that is true on a day and not forever, with no date on it",
     "oddities.yaml", "    as_of: 2026-09-07\n", ""),

    # The drawing. A row may DECLINE to draw; it may not claim a shape we do not have, and it
    # may not claim a shape for something that is never drawn at all.
    ("a shape no builder in scene/models.js can draw",
     "oddities.yaml", "      build: roadster\n", "      build: hovercar\n"),
    ("a triangle budget nobody wrote, which is a budget nobody can measure",
     "oddities.yaml", "      budget_tris: 1800\n", ""),
    ("a triangle budget over the layer cap",
     "oddities.yaml", "budget_tris: 1800", "budget_tris: 18000"),
    ("a row that will not say whether it draws the object or its kind",
     "oddities.yaml", "      stands_for: variant\n      drawn_name: \"the first-generation",
     "      stands_for: probably\n      drawn_name: \"the first-generation"),
    ("a placeholder claiming to be the exact object",
     "oddities.yaml", "budget_tris: 180, stands_for: generic", "budget_tris: 180, stands_for: variant"),
    ("a shape with no name for the card to print",
     "oddities.yaml",
     '    shape: {build: generic, budget_tris: 180, stands_for: generic,\n'
     '            drawn_name: "a lapel pin"}',
     "    shape: {build: generic, budget_tris: 180, stands_for: generic}"),
    # Nothing is drawn for a row nobody can place, so a builder on one is a claim about a shape
    # that never reaches a screen -- and data/sample.js writes it no `drawsAs` either.
    ("a builder on the one row that is never drawn at all",
     "oddities.yaml", "    shape: {build: generic, budget_tris: 180", "    shape: {build: roadster, budget_tris: 180"),
    # `departure:` is how a builder confesses an exaggeration. A placeholder has nothing to
    # confess -- "we have no shape for this" and "here is how our shape differs" cannot both be
    # true of one drawing -- and the confession is printed on the card, so it takes the card's cap.
    ("a departure from a shape we said we did not have",
     "oddities.yaml",
     '    shape: {build: generic, budget_tris: 180, stands_for: generic,\n'
     '            drawn_name: "a lapel pin"}',
     '    shape: {build: generic, budget_tris: 180, stands_for: generic,\n'
     '            drawn_name: "a lapel pin", departure: "the pin is drawn a little large"}'),
    ("a departure too long for the card that prints it",
     "oddities.yaml",
     '      departure: "this is the camera part the prop was built from, not the prop: the hilt\'s\n'
     '                  design is not ours to draw"',
     '      departure: "this is the camera part the prop was built from and not the prop itself,\n'
     '                  because the design of the hilt, its name and the object are not ours to\n'
     '                  draw under any reading of the licences its uploaders claim to grant"'),
    # `attitude:` is the one drawing property a row may choose, and only where the choice is
    # between two unmeasured drawings. A thing lying on a surface is not such a case.
    ("an attitude the renderer cannot aim",
     "oddities.yaml", "      attitude: nadir\n", "      attitude: sideways\n"),
    ("an attitude on a row that is lying on a surface, where standing up is measured",
     "oddities.yaml", "      build: golf-balls\n", "      build: golf-balls\n      attitude: nadir\n"),
    ("an attitude on a placeholder, which has no shape to aim",
     "oddities.yaml",
     '    shape: {build: generic, budget_tris: 180, stands_for: generic,\n'
     '            drawn_name: "a lapel pin"}',
     '    shape: {build: generic, budget_tris: 180, stands_for: generic,\n'
     '            drawn_name: "a lapel pin", attitude: nadir}'),
    ("a departure that is not a sentence",
     "oddities.yaml",
     '      departure: "the props are drawn at about twice scale: three identical 4 cm bodies differ\n'
     '                  only by what is in the hand"',
     '      departure: ""'),

    # The row itself
    ("two oddity rows share an id",
     "oddities.yaml", "  - id: shepard-golf-balls", "  - id: tesla-roadster"),
    ("an oddity that is not of the oddity class",
     "oddities.yaml", "    klass: oddity", "    klass: car"),
    ("an oddity with no display name the card could print",
     "oddities.yaml", '    display: "Tesla Roadster (Starman)"\n', ""),

    # The attachable manifest: the evidence that CI cannot gather because it cannot run a browser
    ("no attachable manifest, so `where.to` would be checked against nothing",
     "oddities.yaml", "attachable:\n", "attachable_was_here:\n"),
    ("an attachable id with no evidence of what emits it",
     "oddities.yaml", ', emitted_by: "sample.js sampleDeepSpace(), CRUISING_CRAFT"}', "}"),
    ("evidence with no date on it",
     "oddities.yaml", "observed_on: 2026-09-07", "# observed_on: removed"),

    # --- registry/layers.yaml: the three reserved literals -------------------------------
    # `bundled` and `per-record` are words the validator knows. A word it does not know is still
    # refused, which is the half of a reserved literal that is easy to lose.
    ("a bundled layer whose source is a near-miss of the reserved literal",
     "layers.yaml", "    source: bundled", "    source: bundledd"),
    ("a per-record layer whose propagator is neither a propagator nor the reserved literal",
     "layers.yaml", "    propagator: per-record", "    propagator: whatever"),
    ("a per-record layer whose frame is neither a frame nor the reserved literal",
     "layers.yaml", "    frame: per-record", "    frame: whenever"),
    ("a deep-sky card line changed in the registry and not in the built file the card reads",
     "dso-hand.yaml", "a small galaxy that kept its jewellery", "a small galaxy that kept its rings"),

    # --- registry/nebulae.yaml (spec 0067, 2026-10-03) ------------------------------------
    # A photograph somebody else took, shipped from our bucket: licence, credit, and that it is
    # drawn where its object is.
    ("a nebula's picture with no credit",
     "nebulae.yaml", '    credit: "ESO/G. Beccari"\n', ""),
    ("a picture credited to the Digitized Sky Survey, which is not ours to ship",
     "nebulae.yaml", 'credit: "ESO/G. Beccari"', 'credit: "ESO and Digitized Sky Survey 2"'),
    ("a picture whose credit CREDITS.md does not carry",
     "nebulae.yaml", 'credit: "ESO/G. Beccari"', 'credit: "ESO/G. Beccary"'),
    ("a picture from an archive whose terms are not on file",
     "nebulae.yaml", "    archive: eso\n    image: eso1723a", "    archive: wikimedia\n    image: eso1723a"),
    ("an archive under a licence we may not redistribute under",
     "nebulae.yaml", "    licence: CC BY 4.0\n    terms: https://www.eso.org/public/copyright/", "    licence: CC BY-NC 4.0\n    terms: https://www.eso.org/public/copyright/"),
    ("an archive's terms with no day they were read",
     "nebulae.yaml", '    screen: "https://cdn.eso.org/images/screen/{image}.jpg"\n    checked: 2026-10-03\n', '    screen: "https://cdn.eso.org/images/screen/{image}.jpg"\n'),
    ("Orion's picture ten degrees from Orion",
     "nebulae.yaml", "    ra_deg: 83.78771", "    ra_deg: 93.78771"),
    ("a picture a hundred times too wide",
     "nebulae.yaml", "    width_arcmin: 59.95", "    width_arcmin: 5995"),
    ("a picture that cannot be told from its mirror image",
     "nebulae.yaml", "correlation: 27.7, mirror: 4.4}", "correlation: 27.7, mirror: 26.9}"),
    ("a picture with no evidence of where it is",
     "nebulae.yaml", "    solved: {moved_arcmin: 0.28, correlation: 27.7, mirror: 4.4}\n", ""),
    ("a picture of something that is not a deep-sky object on the map",
     "nebulae.yaml", "  - id: m42\n", "  - id: m4242\n"),
    ("a picture whose file is not in the tree",
     "nebulae.yaml", "    file: site/images/nebulae/m42.webp", "    file: site/images/nebulae/m42-missing.webp"),
    ("a picture that names its filters and says they are unstated",
     "nebulae.yaml", "    colours: mixed\n    filters: \"g, r and i, with H-alpha\"", "    colours: unstated\n    filters: \"g, r and i, with H-alpha\""),
    ("a picture whose colours are a word the card has no sentence for",
     "nebulae.yaml", "    colours: mixed\n    filters: \"g, r and i, with H-alpha\"", "    colours: pretty\n    filters: \"g, r and i, with H-alpha\""),

    # --- registry/stars-notable.yaml (2026-09-22) -----------------------------------------
    # The HIP number is the join to a star record. A number the names file does not have is a line
    # no label and no card will ever print, and nothing in the browser would say so.
    ("a famous star whose HIP number is not a named star",
     "stars-notable.yaml", "  - hip: 32349\n", "  - hip: 32350\n"),
    ("a famous star with no HIP whose proper name the names file does not have",
     "stars-notable.yaml", "  - proper: Wolf 359\n", "  - proper: Wolf 360\n"),
    ("two famous-star rows for one star",
     "stars-notable.yaml", "  - hip: 71681\n", "  - hip: 71683\n"),
    ("a famous star's line longer than the card prints",
     "stars-notable.yaml", 'why: "One point of light, six stars in three pairs.',
     'why: "One point of light, six stars in three pairs, each pair going round the others in orbits '
     'that take centuries, which is the sort of sentence that runs past what a card can print.'),
    ("a famous star with no source",
     "stars-notable.yaml", '    source: "https://en.wikipedia.org/wiki/Sirius (read 2026-09-22)"\n', ""),
    ("a famous star's source with no date it was read",
     "stars-notable.yaml", "wiki/Sirius (read 2026-09-22)", "wiki/Sirius"),
    ("a famous star that is already an extreme object with its own fact sheet",
     "stars-notable.yaml", "    name: Sirius\n", "    name: Betelgeuse\n"),

    # --- registry/systems.yaml, a star system at its own scale (spec 0040, 2026-09-23) ------------
    # The planets are the exoplanet table's own records and three of each row's numbers are not in
    # that table, so every way a hand-typed row could be wrong without anything noticing is here:
    # a planet that is not a record, a system with no stage, a number that disagrees with the table,
    # a slipped digit Kepler's third law catches, and a number with no page or no day.
    ("a system planet that is not a record of the exoplanet table",
     "systems.yaml", "      - id: exo-trappist-1-h\n", "      - id: exo-trappist-1-i\n"),
    ("a system with no stage row to be drawn on",
     "systems.yaml", "  - id: trappist-1\n    host:", "  - id: trappist-one\n    host:"),
    ("a system planet's period 3 % off the table's",
     "systems.yaml", "period_days: 6.101013", "period_days: 6.284"),
    ("a semi-major axis with a slipped digit, which Kepler's third law refuses",
     "systems.yaml", "a_au: 0.02925", "a_au: 0.03925"),
    ("a system star's source with no day it was read",
     "systems.yaml", 'TRAPPIST-1 (read 2026-09-23)"\n    colour_note', 'TRAPPIST-1"\n    colour_note'),
    ("a system that does not say its colours are illustrative",
     "systems.yaml", "    colour_note: illustrative\n", ""),
    ("a system stage centred on something other than its host star",
     "stages.yaml", "centre: star-trappist-1", "centre: sun"),
    ("a system stage in a unit other than 100 000 km, the 1 000-times slip spec 0028 made twice",
     "stages.yaml", "unit_km: 100000              #", "unit_km: 100000000           #"),
    # --- registry/audio.yaml (spec 0035) ------------------------------------------------------
    # Sound is somebody else's recording, and the one asset a visitor cannot see is credited. Each
    # case is a way a row could ship a file with no credit, over the budget, on a rung the engine
    # does not have, twice for one rung, or naming a file that is not in the tree.
    ("a sound with no credit",
     "audio.yaml", 'credit: "Fake Vega by John Bartmann, CC0"', 'credit: ""'),
    ("a sound whose credit CREDITS.md section 9 does not carry",
     "audio.yaml", 'credit: "Fake Vega by John Bartmann, CC0"', 'credit: "Fake Vega by J. Bartmann, CC0"'),
    ("a bed of 700 kB, over the 600 kB budget",
     "audio.yaml", "kb: 585.6", "kb: 700"),
    ("a bed for a rung the engine does not have",
     "audio.yaml", "stage: ladder", "stage: mars"),
    ("two beds for one rung",
     "audio.yaml", "stage: world", "stage: earth"),
    ("a sound whose file is not in the tree",
     "audio.yaml", "file: site/audio/bed-sun.opus", "file: site/audio/bed-saturn.opus"),
    ("a sound whose file is not Opus",
     "audio.yaml", "file: site/audio/bed-sun.opus", "file: site/audio/bed-sun.m4a"),
    ("a sound whose source has no read date",
     "audio.yaml", "sounds/639429/ (read 2026-09-23)", "sounds/639429/"),
    ("a bed that does not loop",
     "audio.yaml", "    loop: true\n    licence: \"CC0 1.0 Universal (public domain dedication)\"\n    source: \"https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/calabi",
     "    loop: false\n    licence: \"CC0 1.0 Universal (public domain dedication)\"\n    source: \"https://freemusicarchive.org/music/John_Bartmann/100-ambient-atmospheric-soundtracks-straylight-drones-collection/calabi"),
    # SPEC 0044: A GATE SAYS WHY. A budget with no reason is a number somebody will raise without
    # knowing what it was measured against; one with no date cannot be told from an older one.
    ("a budget with no reason",
     "budgets.yaml", ', reason: "spec 0035"}', "}"),
    ("a budget with no date",
     "budgets.yaml", "value: 600, unit: kB, since: 2026-09-22,", "value: 600, unit: kB,"),
    ("a budget that is not a number",
     "budgets.yaml", "value: 600, unit: kB", "value: plenty, unit: kB"),
    # The audio check reads its ceiling from the budget now, so raising a bed means raising the row.
    ("a bed over the bed_kb budget",
     "budgets.yaml", "id: bed_kb, value: 600,", "id: bed_kb, value: 500,"),
    # --- registry/textures.yaml (2026-09-28, the device tiers) ---------------------------------
    # A map is somebody's picture on every visitor's screen, and a 4k one is the biggest download
    # after the first visit. No credit, no file, the wrong size, or an author whose terms forbid
    # hosting their maps: each is refused, by the file's name.
    ("a map with no credit",
     "textures.yaml", 'credit: "Earth at night (4k): Black Marble 2016, NASA Earth Observatory"', 'credit: ""'),
    ("a map with no licence",
     "textures.yaml", """licence: 'NASA media guidelines: "generally are not subject to copyright in the United States"'""", "licence: ''"),
    ("a map whose credit CREDITS.md does not carry",
     "textures.yaml", 'credit: "Earth at night (4k): Black Marble 2016, NASA Earth Observatory"',
     'credit: "Earth at night: NASA"'),
    ("a map whose file is not in the tree",
     "textures.yaml", "file: site/textures/4k/mars.webp", "file: site/textures/4k/mars-8k.webp"),
    ("a map whose bytes are not the file's",
     "textures.yaml", "bytes: 817910", "bytes: 717910"),
    ("a map whose pixels are not the file's",
     "textures.yaml", "file: site/textures/4k/mars.webp\n        px: [4096, 2048]", "file: site/textures/4k/mars.webp\n        px: [8192, 4096]"),
    ("a map from an author whose terms forbid hosting it",
     "textures.yaml", 'original: "https://www.solarsystemscope.com/textures/download/8k_mars.jpg"',
     'original: "http://bjj.mmedia.is/data/mars/mars_map.jpg"'),
    ("a boot map that is not the one models.yaml credits",
     "textures.yaml", "file: site/textures/2k_mars.jpg", "file: site/textures/2k_mercury.jpg"),
    # The moons' maps (2026-10-05): one file per world inside its budget, and the share of the
    # sphere it covers said as a number, because the card's line about the unseen side rests on it.
    ("a moon's map over the moon_map_bytes budget",
     "budgets.yaml", "id: moon_map_bytes, value: 250000,", "id: moon_map_bytes, value: 200000,"),
    ("the moons' maps over their total budget",
     "budgets.yaml", "id: moon_maps_total_bytes, value: 3200000,", "id: moon_maps_total_bytes, value: 2900000,"),
    ("a moon's map that covers more than the whole sphere",
     "textures.yaml", "    world: miranda\n    slot: map\n    when: boot\n    coverage: 0.394", "    world: miranda\n    slot: map\n    when: boot\n    coverage: 1.394"),
    ("a flat world's map that does not say how much of the sphere it covers",
     "textures.yaml", "    world: miranda\n    slot: map\n    when: boot\n    coverage: 0.394\n", "    world: miranda\n    slot: map\n    when: boot\n"),
    # --- registry/tilesets.yaml (2026-10-03, spec 0065) -----------------------------------------
    # Map tiles are fetched by every visitor's browser from somebody else's server. No licence, a
    # credit CREDITS.md does not carry, a host whose CORS header nobody measured, plain http, a
    # level the host does not serve, or a projection the addressing cannot do: each is refused.
    ("a tile set with no licence",
     "tilesets.yaml", """resolution_m: 83
    grade: [3.67, 3.48, 3.45]
    cors: "Access-Control-Allow-Origin: * (measured 2026-10-03)"
    licence: 'NASA media guidelines: "generally are not subject to copyright in the United States"'""",
     """resolution_m: 83
    grade: [3.67, 3.48, 3.45]
    cors: "Access-Control-Allow-Origin: * (measured 2026-10-03)"
    licence: ''"""),
    ("a tile set whose credit CREDITS.md does not carry",
     "tilesets.yaml", 'credit: "Mars close up: THEMIS daytime infrared mosaic, NASA/JPL-Caltech/Arizona State University, from NASA Solar System Treks, as detail over the colour map"',
     'credit: "Mars: NASA"'),
    ("a tile set whose CORS header nobody measured",
     "tilesets.yaml", 'cors: "Access-Control-Allow-Origin: * (measured 2026-10-03)"', 'cors: "should be fine"'),
    ("a tile set served over plain http",
     "tilesets.yaml", 'url: "https://trek.nasa.gov/tiles/Moon/', 'url: "http://trek.nasa.gov/tiles/Moon/'),
    ("a tile set asked for a level its host does not serve",
     "tilesets.yaml", "max_level: 8\n    resolution_m: 162", "max_level: 9\n    resolution_m: 162"),
    ("a tile set in a projection the addressing cannot do",
     "tilesets.yaml", "projection: equirectangular", "projection: polar-stereographic"),
    ("a tile set in a mode the shader does not have",
     "tilesets.yaml", "projection: equirectangular\n    mode: detail", "projection: equirectangular\n    mode: overlay"),
    ("a tile set on a world we do not draw",
     "tilesets.yaml", "world: mars", "world: vulcan"),
    ("a tile set whose url is not a template",
     "tilesets.yaml", "default028mm/{z}/{y}/{x}.jpg", "default028mm/7/50/32.jpg"),
    # --- registry/weather.yaml (2026-10-03, spec 0066) ------------------------------------------
    # Weather is where a map is most tempted to make things up. An effect that does not say how much
    # of it is known, a measured one whose CORS header nobody measured, an illustrative one with no
    # reason, one that would be drawn on the slowest phones, a wind faster than any measured, a world
    # with no line on its card, a layer that claims the page fetches it from nowhere: each is refused.
    ("a weather effect that does not say how much of it is known",
     "weather.yaml", "    kind: hexagon\n    class: illustrative", "    kind: hexagon\n    class: pretty"),
    ("a measured weather effect whose CORS header nobody measured",
     "weather.yaml", 'cors: "access-control-allow-origin: *"', 'cors: "probably"'),
    ("a measured weather effect that does not say where its data reaches",
     "weather.yaml", '    covers: "25 S to 80 N, from 110 E eastward across the Pacific and the Americas to 0 W"\n', ""),
    ("an illustrative weather effect with no reason",
     "weather.yaml", '    why: "The map we ship has no pole in it.', '    because: "The map we ship has no pole in it.'),
    ("a weather effect drawn at the lowest tier",
     "weather.yaml", "    kind: hexagon\n    class: illustrative\n    off_at: [tier0, save_data]",
     "    kind: hexagon\n    class: illustrative\n    off_at: [save_data]"),
    ("lightning that flashes for a visitor who asked for less motion",
     "weather.yaml", "off_at: [tier0, save_data, reduced_motion]", "off_at: [tier0, save_data]"),
    ("a wind profile that calls itself measured",
     "weather.yaml", "    kind: zonal-flow\n    class: modelled\n    off_at: [tier0, save_data]\n    source:\n      name: \"Tollefson",
     "    kind: zonal-flow\n    class: measured\n    off_at: [tier0, save_data]\n    source:\n      name: \"Tollefson"),
    ("a wind faster than any measured on a planet",
     "weather.yaml", "[0, -398]", "[0, -3980]"),
    ("a wind profile that does not reach the pole",
     "weather.yaml", "points: [[-90, 0], [-50, 100], [50, 100], [90, 0]]", "points: [[-80, 0], [-50, 100], [50, 100], [90, 0]]"),
    ("a weather effect with no paper behind it",
     "weather.yaml", '      url: "https://doi.org/10.1006/icar.1993.1114"\n', ""),
    ("a weather effect on a world we do not draw",
     "weather.yaml", "    world: neptune\n    kind: zonal-flow", "    world: vulcan\n    kind: zonal-flow"),
    ("a frost cap that reaches the tropics",
     "weather.yaml", "[300, 54]", "[300, 24]"),
    ("a layer the page is said to fetch, from nowhere the registry names",
     "weather.yaml", "    layer: lightning\n", ""),
]


# scripts/check_copy.py guards a different file for a different reason, so it gets its own list.
# Every user-visible string lives in site/js/copy/en.js; a literal that reaches the screen from a
# file under site/js/ui/ is the leak. The check found one on the first run it was ever given --
# `bar.setAttribute('aria-label', 'Panels')` in ui/mobile.js (the phone's old bar, gone since spec
# 0061 task 3), plus two labels in a local table -- which is why it is a guard and not a comment.
#
# (name, file under site/js/ui/, find, replace)
COPY_CASES: list[tuple[str, str, str, str]] = [
    # spec 0060 item 6: a string meant for later must not reach the screen (orbitalradar's
    # "Welcome, Admin" line). The path is relative to site/js/ui/, so the copy file is reached by "..".
    ("a TODO left in the copy",
     "../copy/en.js", "export const COPY = {", "export const COPY = {\n  leftover: 'TODO: copy',"),
    ("an admin-panel line in a UI module",
     "status.js", "const HOST_ID = 'sr-status';",
     "const HOST_ID = 'sr-status';\nconst WELCOME = t(COPY.x, {}) || 'Welcome, Admin. This is your admin panel';"),
    ("a literal handed to the shared DOM helper",
     "status.js", "const HOST_ID = 'sr-status';",
     "const HOST_ID = 'sr-status';\nconst LEAK = el('p', 'sr-x', 'Sources are loading, please wait');"),
    ("a literal assigned straight to textContent",
     "cards.js", "  node.hidden = false;",
     "  node.hidden = false;\n  node.textContent = 'Nothing to show here yet';"),
    ("a literal assigned to a tooltip",
     "explore.js", "  const root = el('div', 'sr-explore');",
     "  const root = el('div', 'sr-explore');\n  root.title = 'Everything you can turn on and off';"),
    ("a literal handed to an aria-label",
     "search.js", "  instances += 1;",
     "  instances += 1;\n  host.setAttribute('aria-label', 'Find an object by name');"),
    ("a label held in a local table on its way to the DOM",
     "sheet.js", "const HEIGHT_WORDS = [", "const HEIGHT_WORDS = [\n  { id: 'sr-x', label: 'Everything' },"),
    # Not a leak but the same file's other rule: a dash typed as two hyphens prints as two hyphens.
    ("a dash written as two hyphens in the copy",
     "../copy/en.js", "give or take — the date is not fixed yet",
     "give or take -- the date is not fixed yet"),
]


# ---------------------------------------------------------------------------------------
# registry/tours.yaml -- a trip may not promise a stop it will not deliver.
#
# THESE MUTATE THE REAL FILE, like every case above. The first version of this block wrote a
# synthetic two-line tours.yaml, because there was no real one: the guard was written before the
# file it guards. A synthetic fixture stops proving anything the moment the real file exists,
# because it exercises the validator against rows nobody ships.
#
# THE LAST CASE IS THE ONE THAT KEEPS THE REST HONEST: the file as it stands must be ACCEPTED. A
# guard that refuses everything would pass all nineteen cases above and be useless.
LONG_SENTENCE = (
    "It is very old and it is very far away and it has been going for a long time and it will "
    "go on for a long time after everybody reading this has stopped, which is the sort of "
    "sentence that runs past what a card can print."
)

TOUR_CASES: list[tuple[str, str, str]] = [
    # (name, find, replace)
    ("a stop that flies to something drawn on its carrier rather than to the carrier",
     "        target: {record: deep-voyager-1}", "        target: {record: voyager-golden-record}"),
    ("a stop that flies to an object nobody can place",
     "        target: {record: tesla-roadster}", "        target: {record: bean-astronaut-pin}"),
    ("a trip id that is also a layer id",
     "  - id: people-in-space", "  - id: stations"),
    # Spec 0061 task 6, internal #333: a blurb is two lines on the intro, 80 characters at most.
    ("a blurb that would run to three lines on the intro",
     '    blurb: "A family photograph, two golf balls, a library, a record and a car."',
     '    blurb: "A family photograph, two golf balls, a library, a record, a car and a good many more words than fit."'),
    ("a target that names two things at once",
     "        target: {record: duke-family-photo}",
     "        target: {record: duke-family-photo, world: earth}"),
    ("a target that names a layer and not which member of it",
     '        target: {layer: stations, catalog: "25544"}', "        target: {layer: stations}"),
    ("a stop that hand-writes the class the record already knows",
     "      - id: roadster\n", "      - id: roadster\n        class: measured\n"),
    ("a stop aimed at a world with no worlds.yaml row",
     "        target: {world: earth}", "        target: {world: phoebe}"),
    ("a stop aimed at a site with no sites.yaml row",
     "        target: {record: beresheet-lunar-library}", "        target: {site: apollo-18}"),
    ("a trip requiring a layer nothing declares",
     "requires: [oddities]", "requires: [oddballs]"),
    ("a stop whose own layer requirement does not exist",
     "needs_layer: deep-space", "needs_layer: deep-nothing"),
    ("a framing inside the camera's own world-clearance floor",
     "        frame_radii: 5.0\n", "        frame_radii: 0.9\n"),
    ("a drift that cannot finish inside its own dwell",
     "        drift_deg: 20\n", "        drift_deg: 340\n"),
    ("a card sentence longer than the card can print",
     "            His family signed the back and pressed their thumbprints into it.",
     "            " + LONG_SENTENCE),
    ("a card that uses jargon registry/glossary.yaml cannot explain",
     "A car, going round the Sun", "A car, going round its own semi-major axis"),
    ("a trip with fewer stops than its own floor",
     "    min_stops: 3\n", "    min_stops: 8\n"),
    # Since spec 0028 step 8 a trip may live on any world or any rung of the ladder (ui/trip.js
    # switches the stage on begin and back on leave), so `mars` is legal now; a stage that is
    # neither a world nor a rung is what the checker must still refuse.
    ("a stage that is neither a world nor a rung of the ladder",
     "  stage: earth\n", "  stage: nowhere\n"),
    ("a frozen clock on a trip that wants eleven thousand objects",
     "    requires: [stations]\n    clock: as-found",
     "    requires: [stations, active]\n    clock: freeze"),
    ("an `on_unresolved` the state machine would quietly treat as a drop",
     "  on_unresolved: drop\n", "  on_unresolved: fallback\n"),
    ("two stops in one trip sharing an id",
     "      - id: golf-balls", "      - id: duke-photo"),
    ("a dwell written well below what its own words need",
     "      - id: beresheet\n", "      - id: beresheet\n        dwell_ms: 1200\n"),
    ("a card that writes a dash as two hyphens, which the screen prints as two hyphens",
     "Nobody knows where in the wreck", "Nobody knows -- where in the wreck"),
    # Since the trip out past Jupiter a STOP may name its own stage, and a stop about a world has
    # to be flown on a stage that draws that world where it is (scene/worlds.js squeezes the rest).
    ("a stop stage that is neither a world nor a rung of the ladder",
     "        stage: neptune\n", "        stage: neptunium\n"),
    ("a stop about a world its own stage draws nearer and larger than it is",
     "        target: {record: saturn}\n        stage: saturn",
     "        target: {record: saturn}\n        stage: earth"),
    ("a `behind:` world the stop's stage draws nearer and larger than it is",
     "        behind: charon\n", "        behind: jupiter\n"),
    ("a `behind:` world that is the stop's own subject",
     "        behind: charon\n", "        behind: pluto\n"),
    ("a stop on the `launches` layer, whose track is a drawing, claiming certainty",
     '        target: {layer: stations, catalog: "25544"}\n        # Far enough back',
     '        target: {layer: launches, catalog: "25544"}\n        # Far enough back'),
    # Spec 0029: every trip names a row of the `groups:` table, and `next:` names a trip. The
    # picker lists every trip under a heading, so a trip the table cannot place is a trip the
    # panel cannot draw; and an end card that promises a trip must be able to find it.
    ("no `groups:` table at all",
     "groups:\n  - {id: earth-orbit,", "group_table:\n  - {id: earth-orbit,"),
    ("a trip naming a group that is not a row of the table",
     "    group: beyond\n", "    group: beyond-the-beyond\n"),
    ("a trip with no group, which the picker has nowhere to put",
     "    group: earth-orbit\n", ""),
    ("two groups sharing an id",
     "  - {id: events,       display:", "  - {id: beyond,       display:"),
    ("a group id that is also a layer id",
     "  - {id: events,       display:", "  - {id: stations,     display:"),
    ("a `next:` naming a trip that does not exist",
     "    next: strangest-things\n", "    next: strangest-thing\n"),
    ("a `next:` naming the trip itself",
     "    next: moon-landings\n", "    next: strangest-things\n"),
    ("a group heading that writes a dash as two hyphens",
     'display: "Around the Earth",', 'display: "Around -- the Earth",'),

    # --- spec 0030: a stop's own clock ----------------------------------------------------------
    # The seven in the spec's Acceptance, then the rest of design section 5. Every rate cap is
    # what some other file already lives by: 60 is ui/trip.js CLOCK_RATE_CEILING, 36 000 the top
    # of clock.rates(), a million the ceiling on the Sun's stage.
    ("a station shown faster than a minute a second, which laps the planet under follow",
     '        distance_km: 3000\n        card:\n          title: "The International Space Station"',
     '        distance_km: 3000\n        rate: 61\n        card:\n          title: "The International Space Station"'),
    ("a world on Earth's stage run faster than the clock's own top speed",
     "      - id: both\n        target: {world: earth}\n",
     "      - id: both\n        target: {world: earth}\n        rate: 40000\n"),
    ("a rate over a million, even on the Sun's stage",
     "        rate: 525600\n", "        rate: 2000000\n"),
    ("a station shown at a written date, which its elements cannot honestly reach",
     '        distance_km: 3000\n        card:\n          title: "The International Space Station"',
     '        distance_km: 3000\n        time: 2027-08-02T10:07:00Z\n        card:\n          title: "The International Space Station"'),
    ("a timed trip that loads the active catalogue, which scrubs 16 587 objects a frame",
     "    requires: [worlds]\n    stage: sun\n", "    requires: [worlds, active]\n    stage: sun\n"),
    ("an event offset of a billion seconds, which is a different event",
     "        time: now\n", "        time: {event: solar-eclipse.next, offset_s: 1e9}\n"),
    # `1e9` reaches the validator as a string (YAML 1.1 wants a dot in a float), so the cap on the
    # number itself is broken with the number written out.
    ("an event offset of a billion seconds written out, past the month either side",
     "        time: now\n", "        time: {event: solar-eclipse.next, offset_s: 1000000000}\n"),
    ("an event type registry/events.yaml does not have",
     "        time: now\n", "        time: {event: nonsense.next, offset_s: 0}\n"),
    ("an event reference that is not the next one",
     "        time: now\n", "        time: {event: solar-eclipse.last, offset_s: 0}\n"),
    ("a rate of zero, which is a slide under a card",
     "        rate: 525600\n", "        rate: 0\n"),
    ("a time that is not an instant, `now` or an event",
     "        time: now\n", "        time: tomorrow\n"),
    ("an instant before anything was in orbit",
     "        time: now\n", "        time: 1950-01-01T00:00:00Z\n"),
    ("a card on a timed stop that types the date the line under it generates",
     "            Every second here is six days,", "            On 2 August 2027 every second here is six days,"),
    ("a frozen trip with a stop that says how fast the clock runs",
     "    stage: sun\n    clock: as-found", "    stage: sun\n    clock: freeze"),

    # --- spec 0037: eclipse stops --------------------------------------------------------------
    # `kind:` is the library's own words per eclipse type (data/events.js ECLIPSE_KINDS); an eclipse
    # stop is lit from the Sun's side; and its card never alarms.
    ("an annular eclipse of the Moon, a kind the library does not have",
     "time: {event: lunar-eclipse.next, kind: total, offset_s: -3600}",
     "time: {event: lunar-eclipse.next, kind: annular, offset_s: -3600}"),
    ("a solar eclipse of a kind that does not exist",
     "time: {event: solar-eclipse.next, kind: annular}",
     "time: {event: solar-eclipse.next, kind: nonsense}"),
    ("a kind on an event that is not an eclipse",
     "time: {event: solar-eclipse.next, kind: annular}",
     "time: {event: launch.next, kind: annular}"),
    ("an eclipse stop lit from behind, where the shadow is not",
     "        key_light_deg: 0\n        time: {event: solar-eclipse.next, kind: annular}",
     "        key_light_deg: 125\n        time: {event: solar-eclipse.next, kind: annular}"),
    ("an eclipse card that alarms",
     "            This is greatest eclipse,", "            Darkness falls: this is greatest eclipse,"),
    ("an eclipse card with a safety warning",
     "            Now it is the Earth that is in the way.",
     "            Now it is the Earth that is in the way, and there is no need to protect your eyes."),

    # --- spec 0038: a stop at the visitor's own place --------------------------------------------
    ("a visitor's-place target with a second key beside it",
     "        target: {observer: true}\n        # THE SPEC SAID",
     "        target: {observer: true, world: earth}\n        # THE SPEC SAID"),
    ("a stop at the visitor's place in a trip that does not say it needs one",
     "    requires_observer: true\n", ""),
    ("a trip from the visitor's place whose station stops are not in `requires:`",
     "    requires: [stations]\n    requires_observer: true\n",
     "    requires: [worlds]\n    requires_observer: true\n"),
    ("the visitor's place framed from inside the camera's clearance floor",
     "        distance_km: 200\n        time: now\n", "        distance_km: 130\n        time: now\n"),
    ("the visitor's place shown at a written instant, the same for every visitor",
     "        distance_km: 200\n        time: now\n",
     "        distance_km: 200\n        time: 2027-08-02T10:07:00Z\n"),
    ("a card on a trip from the visitor's place that names a city",
     "This is the ground you are standing on,", "This is Madrid, the ground you are standing on,"),
    ("`requires_observer: true` on a trip with no stop at the visitor",
     "    next: strangest-things\n    requires: [stations]\n",
     "    next: strangest-things\n    requires: [stations]\n    requires_observer: true\n"),

    # --- spec 0034: a stop's chapter line -------------------------------------------------------
    ("a chapter over forty characters, which is a sentence and not a title card",
     'chapter: "Epilogue: looking back"',
     'chapter: "Epilogue: looking back at everything it has passed"'),
    ("a chapter that writes a dash as two hyphens",
     'chapter: "Epilogue: looking back"', 'chapter: "Epilogue -- looking back"'),
    ("a chapter that is the card title again, two lines saying one thing",
     'chapter: "Chapter two: the ringed planet"',
     'chapter: "Saturn, and a ring ten metres thick"'),

    # --- 2026-09-23: the preview picture's stop, and the Sun stage's paths ----------------------
    ("a preview picture at a stop the trip does not have",
     "    og_stop: 1\n", "    og_stop: 9\n"),
    ("a preview picture at stop zero, which is not 1-based",
     "    og_stop: 1\n", "    og_stop: 0\n"),
    ("paths drawn for a moon, which has none round the Sun",
     "    orbits: [mercury, venus, earth, mars, jupiter]", "    orbits: [mercury, moon]"),
    ("paths on a trip that is not on the Sun stage, where they are never drawn",
     "    stage: stellar\n    clock: as-found\n", "    stage: stellar\n    clock: as-found\n    orbits: [mercury]\n"),
    # Spec 0040: the planet count is generated, "habitable" needs a page, Mercury's ring is a system
    # stage's, and a system's planet is drawn at its size and place on that stage only.
    ("four digits typed in the count card, which goes stale with the next copy of the table",
     "            {exoplanet_count} planets around", "            6 332 planets around"),
    ("\"habitable\" in a card about a planet whose row cites no page saying so",
     "            A year here lasts six days.", "            A year here lasts six days, in the habitable zone."),
    ("Mercury's ring promised on a stage that does not draw it",
     "        distance_km: 4730365236290.4       # half a light-year\n",
     "        distance_km: 4730365236290.4       # half a light-year\n        mercury_ring: true\n"),
    ("a system's planet flown to on the stellar rung, where it is a mark at its star",
     "        target: {record: exo-trappist-1-e}\n        stage: system-trappist-1",
     "        target: {record: exo-trappist-1-e}\n        stage: stellar"),
    ("a card template nothing fills in",
     "            {exoplanet_count} planets around", "            {planet_count} planets around"),
    # --- 2026-10-05: what a stop adds to the scene (figures, overlays, a place, a lens) -----------
    ("a look at the sky aimed at the pole, where the camera has no sideways",
     "        target: {sky: [64.0, 20.0]}", "        target: {sky: [64.0, 88.0]}"),
    ("a look at the sky at a right ascension past 360 degrees",
     "        target: {sky: [104.0, 23.0]}", "        target: {sky: [404.0, 23.0]}"),
    ("a look at the sky on a stage that does not have the Sun at its centre",
     "    hides: [exoplanets, systems, exotics, deep-sky, galaxy]\n    stage: stellar",
     "    hides: [exoplanets, systems, exotics, deep-sky, galaxy]\n    stage: sun"),
    ("a look at the depth with no angle to stand aside by",
     "        aside_deg: 20\n", ""),
    ("a distance on a look at the sky, which would move the camera off the Sun",
     "        target: {sky: [160.0, 17.0]}\n", "        target: {sky: [160.0, 17.0]}\n        distance_km: 1000\n"),
    ("a figure the line file does not have",
     "        figures: [Leo]", "        figures: [Leo, Xyz]"),
    ("figures on a stop that does not look at the sky",
     "        over: [18, 15]\n", "        over: [18, 15]\n        figures: [Ori]\n"),
    ("more star names than the screen holds",
     "        figure_stars: 3\n", "        figure_stars: 9\n"),
    ("a shutter mode that does not exist",
     "        exposure: deep\n", "        exposure: hubble\n"),
    ("a lens wider than the sky can be stretched",
     "        zoom: 0.7\n", "        zoom: 0.3\n"),
    ("a trip that hides a layer it needs on",
     "    hides: [exoplanets, systems, exotics, deep-sky, galaxy]", "    hides: [stars]"),
    ("an overlay the registry does not have",
     "        overlay: aerosol", "        overlay: smog"),
    ("an overlay of this week under another day's Sun",
     "        overlay: sea-ice\n", "        overlay: sea-ice\n        time: 2027-01-01T00:00:00Z\n"),
    ("an overlay after the clock was left at a solstice, with no `time: now` since",
     "        frame_radii: 3.0\n        key_light_deg: 95\n        time: now\n",
     "        frame_radii: 3.0\n        key_light_deg: 95\n        overlay: rain\n"),
    ("a place to stand over that is not on the globe",
     "        over: [80, -20]", "        over: [95, -20]"),
    ("a place to stand over at a longitude that is a word nobody reads",
     "        over: [70, midnight]", "        over: [70, noon]"),
    ("a live sentence no module writes",
     "        live_note: aurora", "        live_note: comets"),
    # --- 2026-10-06: stops seen from the ground, tonight, daylight, the side a camera stands on ----
    ("a look from the ground on a stop that is not the visitor's place",
     "        over: [18, 15]\n", "        over: [18, 15]\n        look: {world: moon}\n"),
    ("a look at two things at once",
     "        look: {best: star}", "        look: {best: star, world: moon}"),
    ("a look for the best of a kind nobody ranks",
     "        look: {best: figure}", "        look: {best: comet}"),
    ("a look at a world the sky finder does not know",
     "        look: {world: moon}\n        time: tonight\n        zoom: 4", "        look: {world: pluto}\n        time: tonight\n        zoom: 4"),
    ("a look at the station's pass on a stop not timed to one",
     "        time: {event: station-pass.next, offset_s: -15}\n", ""),
    ("a card that names the planet the view will find, which differs for every visitor",
     "            A planet looks like a bright star that does not twinkle.",
     "            Jupiter looks like a bright star that does not twinkle."),
    ("a ground lens long enough to swing the picture off the screen",
     "        look: {world: moon}\n        time: tonight\n        zoom: 4", "        look: {world: moon}\n        time: tonight\n        zoom: 12"),
    ("tonight on a trip that has no place to have a night at",
     "        frame_radii: 3.2\n        time: now\n", "        frame_radii: 3.2\n        time: tonight\n"),
    ("a planet in the visitor's sky on a trip that never asks for their place",
     "        live_note: season", "        live_note: tonight"),
    ("the season's sentence under a world that has none written",
     "        key_light_deg: 70\n        time: now\n        live_note: space-weather",
     "        key_light_deg: 70\n        time: now\n        live_note: season"),
    ("daylight for a stop with no ground under it",
     "      - id: planet\n        target: {world: mars}\n        frame_radii: 4\n",
     "      - id: planet\n        target: {world: mars}\n        frame_radii: 4\n        time: daylight\n"),
    ("a camera asked to stand on the side of the stop's own subject",
     "        seen_from: earth\n        frame_radii: 5.2\n",
     "        seen_from: moon\n        frame_radii: 5.2\n"),
    ("a camera held on one side and told to drift as well",
     "        time: 2027-01-10T12:00:00Z\n        rate: 36000\n        drift_deg: 0\n",
     "        time: 2027-01-10T12:00:00Z\n        rate: 36000\n        drift_deg: 20\n"),
    ("a place to stand over on the Sun, which has no ground",
     "        target: {world: sun}\n        frame_radii: 6\n", "        target: {world: sun}\n        frame_radii: 6\n        over: [10, 10]\n"),
    # --- 2026-10-06, the remaining shows: a portrait, a kind of sky, the next shower, counted lines --
    ("a portrait of a black hole nobody has photographed",
     "        target: {record: exotic-cygnus-x-1}\n        needs_layer: exotics\n",
     "        target: {record: exotic-cygnus-x-1}\n        needs_layer: exotics\n        portrait: true\n"),
    ("a portrait that is not a yes",
     "        portrait: true\n", "        portrait: big\n"),
    ("a kind of sky the ground view does not have",
     "        darkness: town\n", "        darkness: village\n"),
    ("a kind of sky on a stop that is not seen from the ground",
     "        distance_km: 900\n        time: tonight\n", "        distance_km: 900\n        darkness: dark\n        time: tonight\n"),
    ("a shower the card picked, when which one is next depends on the visitor's date",
     "        look: {shower: next}", "        look: {shower: perseids}"),
    ("a count from a catalogue the trip never loads",
     "        needs_layer: active\n        frame_radii: 1.7\n", "        frame_radii: 1.7\n"),
    ("the next close pass under a stop that shows another day",
     "        time: now\n        live_note: close-approach\n", "        time: 2027-01-01T00:00:00Z\n        live_note: close-approach\n"),
    ("names kept up by a word that is not a yes",
     "        names: true\n        chapter: \"The belt\"", "        names: some\n        chapter: \"The belt\""),
    ("the middle of the night on a trip that has no place to have a night at",
     "        key_light_deg: 60\n        time: now\n        chapter: \"Keeping watch\"", "        key_light_deg: 60\n        time: midnight\n        chapter: \"Keeping watch\""),
    ("a shutter on a stop at a world, which wears none",
     "        target: {world: sun}\n        stage: sun\n        frame_radii: 3.6\n", "        target: {world: sun}\n        stage: sun\n        frame_radii: 3.6\n        exposure: deep\n"),
]


def check_tour_refusals() -> int:
    """Break each registry/tours.yaml rule on purpose, then assert the real file is accepted."""
    def one(case, work: Path):
        name, find, replace = case
        shutil.copytree(ROOT / "registry", work / "registry", copy_function=link)
        shutil.copytree(ROOT / "scripts", work / "scripts", copy_function=link,
                        ignore=shutil.ignore_patterns("__pycache__"))
        media_into(work)
        link(ROOT / "CREDITS.md", work / "CREDITS.md")
        # The bundled cities a visitor can pick (spec 0038): a card on a trip from the visitor's
        # place may not name one, and the checker reads them from here.
        (work / "site" / "js" / "copy").mkdir(parents=True, exist_ok=True)
        link(ROOT / "site" / "js" / "copy" / "en.js", work / "site" / "js" / "copy" / "en.js")
        shutil.copytree(ROOT / "harvest", work / "harvest",
                        ignore=shutil.ignore_patterns("__pycache__"), copy_function=link)
        # A COMPLETE tree, unlike the mutation harness above, because the last case asserts
        # the validator ACCEPTS the file -- and an accept case cannot be run in a tree the
        # validator already rejects for missing model files. Names, not bytes: the question is
        # whether a row is refused, not whether a GLB parses.
        textures_into(work)
        for src in ("site/models", "site/data"):
            d = work / src
            d.mkdir(parents=True, exist_ok=True)
            for f in (ROOT / src).glob("*"):
                if f.is_file():
                    (d / f.name).touch()

        path = work / "registry" / "tours.yaml"
        want_refused = bool(find)
        if want_refused:
            text = path.read_text(encoding="utf-8")
            if find not in text:
                return [f"BROKEN TEST: {name!r} -- the string it mutates is not in tours.yaml"], 1
            mutate(path, text.replace(find, replace, 1))

        result = validator(work)
        out = result.stdout + result.stderr
        refused = result.returncode != 0
        if want_refused and refused and "tours.yaml" in out:
            return [f"  refused: {name}"], 0
        if not want_refused and not refused:
            return [f"  accepted: {name}"], 0
        if want_refused:
            why = "was accepted" if not refused else "refused without naming tours.yaml"
            return [f"  ** {name}: {why}"], 1
        return ([f"  ** {name}: the shipped registry/tours.yaml does not validate, so every "
                 f"case above is a tautology"] + ["     " + line for line in out.strip().splitlines()]), 1

    with tempfile.TemporaryDirectory() as tmp:
        return run_cases(one, TOUR_CASES + [("the file as it stands", "", "")], Path(tmp))


def check_copy_refuses() -> int:
    """Break the no-literals rule, the dash rule and the placeholder rule; assert check_copy.py names the file."""
    def one(case, work: Path):
        name, filename, find, replace = case
        (work / "site" / "js").mkdir(parents=True)
        shutil.copytree(ROOT / "site/js/ui", work / "site/js/ui", copy_function=link)
        shutil.copytree(ROOT / "site/js/copy", work / "site/js/copy", copy_function=link)
        shutil.copytree(ROOT / "site/js/data", work / "site/js/data", copy_function=link)
        shutil.copytree(ROOT / "scripts", work / "scripts", copy_function=link,
                        ignore=shutil.ignore_patterns("__pycache__"))
        media_into(work)

        path = work / "site" / "js" / "ui" / filename
        text = path.read_text(encoding="utf-8")
        if find not in text:
            return [f"BROKEN TEST: {name!r} -- the string it mutates is not in ui/{filename}"], 1
        mutate(path, text.replace(find, replace, 1))

        result = validator(work, "scripts/check_copy.py")
        out = result.stdout + result.stderr
        if result.returncode != 0 and Path(filename).name in out:
            return [f"  refused: {name}"], 0
        why = "was accepted" if result.returncode == 0 else f"refused without naming {filename}"
        return [f"  ** {name}: {why}"], 1

    with tempfile.TemporaryDirectory() as tmp:
        failures = run_cases(one, COPY_CASES, Path(tmp))

    # And the check must PASS on the tree as it stands, or the mutations above prove nothing.
    clean = subprocess.run(
        [sys.executable, "scripts/check_copy.py"], cwd=ROOT, capture_output=True, text=True,
    )
    if clean.returncode != 0:
        print("  ** check_copy.py fails on the unmutated tree, so every case above is a tautology")
        print(clean.stdout or clean.stderr)
        failures += 1
    return failures


# scripts/check_seo.py (spec 0061 task 9): what a search engine reads. Each case breaks one rule in a
# copy of the committed pages (site/) or of a fresh scripts/build_seo.py build (built/); the refusal
# must name the file that broke it. (name, file, find, replace, the name the refusal must carry)
SEO_CASES: list[tuple[str, str, str, str, str]] = [
    ("a title over 60 characters", "built/o/europa.html",
     "<title>Europa: where it is now | Space Radar</title>",
     "<title>Europa, one of the four big moons of Jupiter: where it is now | Space Radar</title>", "o/europa.html"),
    ("a description under 70 characters", "built/o/europa.html",
     '<meta name="description" content="', '<meta name="description" content="Europa. " data-x="', "o/europa.html"),
    ("two pages with one title", "built/o/io.html",
     "<title>Io: where it is now | Space Radar</title>", "<title>Europa: where it is now | Space Radar</title>",
     "o/io.html"),
    ("a page with no canonical", "site/t/to-the-edge.html",
     '<link rel="canonical" href="https://www.spaceradar.ai/t/to-the-edge.html">', "", "t/to-the-edge.html"),
    ("a canonical that is another page's", "built/o/europa.html",
     '<link rel="canonical" href="https://www.spaceradar.ai/o/europa.html">',
     '<link rel="canonical" href="https://www.spaceradar.ai/o/mars.html">', "o/europa.html"),
    ("an og:image that is not in site/", "built/o/sirius.html",
     'og:image" content="https://www.spaceradar.ai/og/default.png"',
     'og:image" content="https://www.spaceradar.ai/og/sirius.png"', "o/sirius.html"),
    ("JSON-LD that does not parse", "built/o/mars.html",
     '<script type="application/ld+json">{"@context"', '<script type="application/ld+json">{"@context",', "o/mars.html"),
    ("a sitemap URL with no page behind it", "built/sitemap.xml",
     "</urlset>", "<url><loc>https://www.spaceradar.ai/o/nowhere.html</loc><lastmod>2026-10-01</lastmod></url>\n</urlset>",
     "sitemap.xml"),
    ("a page the sitemap leaves out", "built/sitemap.xml",
     "<url><loc>https://www.spaceradar.ai/o/europa.html</loc>", "<url><loc>https://www.spaceradar.ai/o/mars.html</loc>",
     "o/europa.html"),
    ("robots.txt that does not name the sitemap", "site/robots.txt",
     "Sitemap: https://www.spaceradar.ai/sitemap.xml", "", "robots.txt"),
    ("robots.txt that shuts the site out", "site/robots.txt", "Allow: /", "Disallow: /", "robots.txt"),
    ("the 404 page in the sitemap", "built/sitemap.xml",
     "</urlset>", "<url><loc>https://www.spaceradar.ai/404.html</loc><lastmod>2026-10-01</lastmod></url>\n</urlset>",
     "404.html"),
]


def check_seo_refusals() -> int:
    """Break each rule scripts/check_seo.py holds; assert it refuses and names the file. The object
    pages are built at deploy time and not kept in git, so the cases start from a fresh build (which
    needs Node: the card's words are JavaScript)."""
    with tempfile.TemporaryDirectory() as tmp:
        clean_tree = Path(tmp) / "clean"
        site = clean_tree / "site"
        site.mkdir(parents=True)
        for name in ("index.html", "robots.txt"):
            link(ROOT / "site" / name, site / name)
        for d in ("t", "og", "images"):
            shutil.copytree(ROOT / "site" / d, site / d, copy_function=link)
        build = subprocess.run([sys.executable, str(ROOT / "scripts/build_seo.py"), "--out", str(clean_tree / "built")],
                               capture_output=True, text=True)
        if build.returncode != 0:
            print("  ** scripts/build_seo.py could not build the pages the SEO cases start from")
            print(build.stdout + build.stderr)
            return 1

        def run_check(tree: Path) -> subprocess.CompletedProcess:
            return subprocess.run([sys.executable, str(ROOT / "scripts/check_seo.py"), "--root", str(tree),
                                   "--out", str(tree / "built")], capture_output=True, text=True)

        clean = run_check(clean_tree)
        if clean.returncode != 0:
            print("  ** check_seo.py fails on the unmutated pages, so every case below is a tautology")
            print(clean.stdout or clean.stderr)
            return 1
        print("  accepted: the pages as built")

        def one(case, work: Path):
            name, filename, find, replace, names = case
            work.rmdir()
            shutil.copytree(clean_tree, work, copy_function=link)
            path = work / filename
            text = path.read_text(encoding="utf-8")
            if find not in text:
                return [f"BROKEN TEST: {name!r} -- the string it mutates is not in {filename}"], 1
            mutate(path, text.replace(find, replace, 1))
            result = run_check(work)
            out = result.stdout + result.stderr
            if result.returncode != 0 and names in out:
                return [f"  refused: {name}"], 0
            why = "was accepted" if result.returncode == 0 else f"refused without naming {names}"
            return [f"  ** {name}: {why}"], 1

        return run_cases(one, SEO_CASES, Path(tmp))


def check_models_dir_refuses() -> int:
    """A .glb in site/models/ with no registry row must be refused.

    The other two model checks compare two LISTS -- registry/models.yaml against CREDITS.md, in
    both directions. A file that is in neither list is invisible to both, and
    scripts/deploy.sh --assets-only syncs the DIRECTORY. So an uncredited redistribution of
    somebody else's work could reach the bucket through the one door nothing was watching.

    Both directions here: a directory that matches the registry is accepted, and one extra file
    is refused by name. The placeholders are empty -- this guard reads the directory listing and
    never opens a file, and writing 6.7 MB of real models into a temporary tree to prove that
    would be testing shutil.
    """
    listed = sorted(
        re.findall(r"file: site/models/([A-Za-z0-9_.-]+\.glb)", (ROOT / "registry/models.yaml").read_text(encoding="utf-8"))
    )
    if not listed:
        print("  ** models directory: no real_models rows found, so this guard was not exercised")
        return 1

    def one(case, work: Path):
        label, extra = case
        shutil.copytree(ROOT / "registry", work / "registry", copy_function=link)
        shutil.copytree(ROOT / "scripts", work / "scripts", copy_function=link,
                        ignore=shutil.ignore_patterns("__pycache__"))
        media_into(work)
        link(ROOT / "CREDITS.md", work / "CREDITS.md")
        shutil.copytree(ROOT / "harvest", work / "harvest",
                        ignore=shutil.ignore_patterns("__pycache__"), copy_function=link)
        textures_into(work)
        models = work / "site" / "models"
        models.mkdir(parents=True)
        for name in listed:
            (models / name).write_bytes(b"")
        if extra:
            (models / extra).write_bytes(b"")

        result = validator(work)
        out = result.stdout + result.stderr
        refused = result.returncode != 0
        if extra is None:
            if refused:
                return [f"  ** models directory: {label} was refused\n{out.strip()[:400]}"], 1
            return [f"  accepted: {label}"], 0
        if refused and "site/models" in out and extra in out:
            return [f"  refused: {label}"], 0
        why = "was accepted" if not refused else "refused without naming the file"
        return [f"  ** models directory: {label} {why}"], 1

    with tempfile.TemporaryDirectory() as tmp:
        return run_cases(one, [("the directory as the registry lists it", None),
                               ("one .glb with no row", "unlisted-and-uncredited.glb")], Path(tmp))


# The raise needs a base to compare with, so these run in a git checkout of their own; and the
# unread-row rules need the readers, so the tree carries tests/ and site/js/ too.
BUDGET_CASES: list[tuple[str, str, str, bool]] = [
    # (name, find, replace, refused)
    ("a budget raised with the date it had",
     "value: 3000, unit: kB, since: 2026-09-22,", "value: 3500, unit: kB, since: 2026-09-22,", True),
    ("a budget raised with a newer date",
     "value: 3000, unit: kB, since: 2026-09-22,", "value: 3500, unit: kB, since: 2026-09-29,", False),
    ("a budget lowered with the date it had",
     "value: 3000, unit: kB, since: 2026-09-22,", "value: 2500, unit: kB, since: 2026-09-22,", False),
    ("a budget nothing reads",
     "budgets:\n", 'budgets:\n  - {id: nobody_reads_this, value: 1, unit: bytes, since: 2026-09-28, reason: "a test"}\n', True),
    ("a budget still marked pending that something reads",
     'reason: "spec 0035: 75 s at 64 kbps Opus"}', 'reason: "spec 0035: 75 s at 64 kbps Opus", pending: "spec 0035"}', True),
]


def check_budget_refusals() -> int:
    git = ["git", "-c", "user.name=refusals", "-c", "user.email=refusals@example.invalid", "-c", "commit.gpgsign=false"]

    def one(case, work: Path):
        name, find, replace, want_refused = case
        for d in ("registry", "scripts", "tests", "harvest", "site/js"):
            if (ROOT / d).is_dir():
                shutil.copytree(ROOT / d, work / d, ignore=shutil.ignore_patterns("__pycache__"), copy_function=link)
        media_into(work)
        link(ROOT / "CREDITS.md", work / "CREDITS.md")
        (work / "site" / "data").mkdir(parents=True, exist_ok=True)
        for f in ("dso.json", "stars3d.names.json", "exoplanets.csv"):
            link(ROOT / "site" / "data" / f, work / "site" / "data" / f)
        subprocess.run(git[:1] + ["init", "-q"], cwd=work, check=True)
        subprocess.run(git + ["add", "registry/budgets.yaml"], cwd=work, check=True)
        subprocess.run(git + ["commit", "-q", "-m", "base"], cwd=work, check=True)

        path = work / "registry" / "budgets.yaml"
        text = path.read_text(encoding="utf-8")
        if find not in text:
            return [f"BROKEN TEST: {name!r} -- the string it mutates is not in budgets.yaml"], 1
        mutate(path, text.replace(find, replace, 1))
        result = validator(work, env={**ENV, "BUDGETS_BASE": "HEAD"})
        said = [line for line in (result.stdout + result.stderr).splitlines() if "budgets.yaml" in line]
        if want_refused and result.returncode != 0 and said:
            return [f"  refused: {name}"], 0
        if not want_refused and not said:
            return [f"  accepted: {name}"], 0
        return [f"  ** {name}: {'was accepted' if want_refused else 'was refused: ' + '; '.join(said)}"], 1

    with tempfile.TemporaryDirectory() as tmp:
        return run_cases(one, BUDGET_CASES, Path(tmp))


def check_registry_refusals(tmp: Path) -> int:
    pristine = tmp / "pristine"
    shutil.copytree(ROOT / "registry", pristine, copy_function=link)

    def one(case, work: Path):
        name, filename, find, replace = case
        shutil.copytree(pristine, work / "registry", copy_function=link)
        shutil.copytree(ROOT / "scripts", work / "scripts", copy_function=link,
                        ignore=shutil.ignore_patterns("__pycache__"))
        media_into(work)
        # The validator cross-checks registry/models.yaml against CREDITS.md, so a tree
        # without it fails for a reason that has nothing to do with the case under test.
        link(ROOT / "CREDITS.md", work / "CREDITS.md")
        # ...and registry/sources.yaml against harvest/parsers/ and the list/query files.
        shutil.copytree(ROOT / "harvest", work / "harvest",
                        ignore=shutil.ignore_patterns("__pycache__"), copy_function=link)
        # ...and registry/dso-hand.yaml against the built site/data/dso.json the card reads.
        (work / "site" / "data").mkdir(parents=True, exist_ok=True)
        link(ROOT / "site" / "data" / "dso.json", work / "site" / "data" / "dso.json")
        # ...and registry/stars-notable.yaml against the names file the star records come from.
        link(ROOT / "site" / "data" / "stars3d.names.json", work / "site" / "data" / "stars3d.names.json")
        # ...and registry/systems.yaml against the exoplanet table its planets are records of.
        link(ROOT / "site" / "data" / "exoplanets.csv", work / "site" / "data" / "exoplanets.csv")
        # ...and registry/textures.yaml against the maps it names.
        textures_into(work)
        # ...and registry/worlds.yaml against its two hand mirrors in the browser.
        (work / "site" / "js" / "scene").mkdir(parents=True, exist_ok=True)
        for js in ("worlds.js", "stage.js"):
            link(ROOT / "site" / "js" / "scene" / js, work / "site" / "js" / "scene" / js)

        path = work / "registry" / filename
        text = path.read_text(encoding="utf-8")
        if find not in text:
            return [f"BROKEN TEST: {name!r} -- the string it mutates is not in {filename}"], 1
        mutate(path, text.replace(find, replace, 1))

        result = validator(work)
        out = result.stdout + result.stderr
        refused = result.returncode != 0
        if refused and filename in out:
            return [f"  refused: {name}"], 0
        why = "was accepted" if not refused else f"refused without naming {filename}"
        return [f"  ** {name}: {why}"], 1

    return run_cases(one, CASES, tmp)


def main() -> int:
    global JOBS
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--jobs", "-j", type=int, default=JOBS,
                    help="cases to run at once (default: the CPU count, %(default)s here)")
    JOBS = max(1, ap.parse_args().jobs)

    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        # One parse per distinct YAML text for the whole run (scripts/check_registry.py). The
        # unbroken tree is checked first, alone, so the cache is warm before the pool starts and a
        # registry that does not validate is said once, here, and not three hundred times.
        cache = Path(tmp) / "yaml-cache"
        cache.mkdir()
        ENV["REGISTRY_YAML_CACHE"] = str(cache)
        warm = subprocess.run([sys.executable, "scripts/check_registry.py"], cwd=ROOT,
                              capture_output=True, text=True, env=ENV)
        if warm.returncode != 0:
            print("  ** scripts/check_registry.py fails on the unbroken tree, so every refusal below "
                  "would be a tautology")
            print((warm.stdout + warm.stderr).strip())
            return 1

        failures += check_registry_refusals(Path(tmp))

        print("")
        failures += check_tour_refusals()

        print("")
        failures += check_copy_refuses()

        print("")
        failures += check_models_dir_refuses()

        print("")
        failures += check_budget_refusals()

        print("")
        failures += check_seo_refusals()

    if failures:
        print(f"\n{failures} guard(s) do not do what they claim")
        return 1
    refusals = len(CASES) + len(COPY_CASES) + len(TOUR_CASES) + 1 + sum(1 for c in BUDGET_CASES if c[3]) + len(SEO_CASES)
    print(f"\nall {refusals} refusals fire and each names its file, and registry/tours.yaml "
          f"and a site/models that matches the registry are both accepted")
    return 0


if __name__ == "__main__":
    sys.exit(main())
