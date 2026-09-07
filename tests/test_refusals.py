#!/usr/bin/env python3
"""Break each registry rule on purpose and assert the validator says so.

Sara's rule, spec 0018's reason for existing: a guard that *reports* wrongly is
indistinguishable from one that *behaves* wrongly and is harder to notice. So the guard is
tested by breaking the thing it guards, not by reading it.

Every case below must fail the validator AND name the file and the row, because a refusal
that does not say where is a refusal somebody will switch off.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CASES: list[tuple[str, str, str, str]] = [
    # (name, file, find, replace)
    ("layer names a source that does not exist",
     "layers.yaml", "source: celestrak-stations", "source: celestrak-stationz"),
    ("layer names a propagator that does not exist",
     "layers.yaml", "propagator: sgp4", "propagator: magic"),
    ("layer's frame names a world that does not exist",
     "layers.yaml", "frame: earth-inertial", "frame: pluto-inertial"),
    ("layer's style names a model with no row",
     "layers.yaml", "model: station-generic", "model: station-deluxe"),
    ("world's parent does not exist",
     "worlds.yaml", "parent: sun", "parent: nebula"),
    ("source has no attribution line",
     "sources.yaml", '    attribution: "Orbital data: CelesTrak (T. S. Kelso)"\n', ""),
    ("source's cadence is not a duration",
     "sources.yaml", "cadence: 3h", "cadence: sometimes"),
    ("source's auth is neither none nor a secret",
     "sources.yaml", "auth: none", "auth: apikey"),
    ("model has no licence",
     "models.yaml", 'licence: "MIT (this project)", budget_tris: 1500', "budget_tris: 1500"),
    ("event type has no lead times",
     "events.yaml", "    lead_times: [same-day, 1d, 1w, on-confirm]\n", ""),
    ("site sits on a world that does not exist",
     "sites.yaml", "world: moon", "world: europa"),
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
     "oddities.yaml", "      world: moon\n      anchor:", "      world: europa\n      anchor:"),

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
    ("an oddity bolted to a spacecraft the app does not draw",
     "oddities.yaml", "      to: deep-voyager-1", "      to: deep-cassini"),
    ("an oddity also drawn on a second carrier the app does not draw",
     "oddities.yaml", "      also_on: [deep-voyager-2]", "      also_on: [deep-cassini]"),
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
]


# scripts/check_copy.py guards a different file for a different reason, so it gets its own list.
# Every user-visible string lives in site/js/copy/en.js; a literal that reaches the screen from a
# file under site/js/ui/ is the leak. The check found one on the first run it was ever given --
# `bar.setAttribute('aria-label', 'Panels')` in ui/mobile.js, plus two labels in a local table --
# which is why it is a guard and not a comment.
#
# (name, file under site/js/ui/, find, replace)
COPY_CASES: list[tuple[str, str, str, str]] = [
    ("a literal handed to the shared DOM helper",
     "status.js", "const HOST_ID = 'sr-status';",
     "const HOST_ID = 'sr-status';\nconst LEAK = el('p', 'sr-x', 'Sources are loading, please wait');"),
    ("a literal assigned straight to textContent",
     "cards.js", "  node.hidden = false;",
     "  node.hidden = false;\n  node.textContent = 'Nothing to show here yet';"),
    ("a literal assigned to a tooltip",
     "controls.js", "  built = true;",
     "  built = true;\n  host.title = 'Everything you can turn on and off';"),
    ("a literal handed to an aria-label",
     "search.js", "  instances += 1;",
     "  instances += 1;\n  host.setAttribute('aria-label', 'Find an object by name');"),
    ("a label held in a local table on its way to the DOM",
     "mobile.js", "  const PANELS = [", "  const PANELS = [\n    { id: 'sr-x', label: 'Everything' },"),
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
    ("a target that names two things at once",
     "        target: {record: duke-family-photo}",
     "        target: {record: duke-family-photo, world: earth}"),
    ("a target that names a layer and not which member of it",
     '        target: {layer: stations, catalog: "25544"}', "        target: {layer: stations}"),
    ("a stop that hand-writes the class the record already knows",
     "      - id: roadster\n", "      - id: roadster\n        class: measured\n"),
    ("a stop aimed at a world with no worlds.yaml row",
     "        target: {world: earth}", "        target: {world: europa}"),
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
     "            Charlie Duke left a picture of his wife and two sons face-up on the Moon, took a\n"
     "            photograph of it, and walked away.",
     "            " + LONG_SENTENCE),
    ("a card that uses jargon registry/glossary.yaml cannot explain",
     "looping between the Earth and Mars", "looping around its own semi-major axis"),
    ("a trip with fewer stops than its own floor",
     "    min_stops: 3\n", "    min_stops: 8\n"),
    ("a stage the rig has never been taught to fly",
     "  stage: earth\n", "  stage: mars\n"),
    ("a frozen clock on a trip that wants eleven thousand objects",
     "    requires: [stations]\n    clock: as-found",
     "    requires: [stations, active]\n    clock: freeze"),
    ("an `on_unresolved` the state machine would quietly treat as a drop",
     "  on_unresolved: drop\n", "  on_unresolved: fallback\n"),
    ("two stops in one trip sharing an id",
     "      - id: golf-balls", "      - id: duke-photo"),
    ("a dwell written well below what its own words need",
     "      - id: beresheet\n", "      - id: beresheet\n        dwell_ms: 1200\n"),
    ("a stop on the `launches` layer, whose track is a drawing, claiming certainty",
     '        target: {layer: stations, catalog: "25544"}\n        # Far enough back',
     '        target: {layer: launches, catalog: "25544"}\n        # Far enough back'),
]


def check_tour_refusals() -> int:
    """Break each registry/tours.yaml rule on purpose, then assert the real file is accepted."""
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name, find, replace in TOUR_CASES + [("the file as it stands", "", "")]:
            work = Path(tmp) / "work"
            if work.exists():
                shutil.rmtree(work)
            work.mkdir()
            shutil.copytree(ROOT / "registry", work / "registry")
            shutil.copytree(ROOT / "scripts", work / "scripts")
            shutil.copy2(ROOT / "CREDITS.md", work / "CREDITS.md")
            # A COMPLETE tree, unlike the mutation harness above, because the last case asserts
            # the validator ACCEPTS the file -- and an accept case cannot be run in a tree the
            # validator already rejects for missing model files. Names, not bytes: the question is
            # whether a row is refused, not whether a GLB parses.
            for src in ("site/models", "site/textures", "site/data"):
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
                    print(f"BROKEN TEST: {name!r} -- the string it mutates is not in tours.yaml")
                    failures += 1
                    continue
                path.write_text(text.replace(find, replace, 1), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, "scripts/check_registry.py"],
                cwd=work, capture_output=True, text=True,
            )
            out = result.stdout + result.stderr
            refused = result.returncode != 0
            if want_refused and refused and "tours.yaml" in out:
                print(f"  refused: {name}")
            elif not want_refused and not refused:
                print(f"  accepted: {name}")
            elif want_refused:
                why = "was accepted" if not refused else "refused without naming tours.yaml"
                print(f"  ** {name}: {why}")
                failures += 1
            else:
                print(f"  ** {name}: the shipped registry/tours.yaml does not validate, so every "
                      f"case above is a tautology")
                for line in out.strip().splitlines():
                    print("     " + line)
                failures += 1
    return failures


def check_copy_refuses() -> int:
    """Break the no-literals rule five ways and assert check_copy.py says which line and which file."""
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        for name, filename, find, replace in COPY_CASES:
            work = Path(tmp) / "work"
            if work.exists():
                shutil.rmtree(work)
            (work / "site" / "js").mkdir(parents=True)
            shutil.copytree(ROOT / "site/js/ui", work / "site/js/ui")
            shutil.copytree(ROOT / "scripts", work / "scripts")

            path = work / "site" / "js" / "ui" / filename
            text = path.read_text(encoding="utf-8")
            if find not in text:
                print(f"BROKEN TEST: {name!r} -- the string it mutates is not in ui/{filename}")
                failures += 1
                continue
            path.write_text(text.replace(find, replace, 1), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, "scripts/check_copy.py"],
                cwd=work, capture_output=True, text=True,
            )
            out = result.stdout + result.stderr
            if result.returncode != 0 and filename in out:
                print(f"  refused: {name}")
            else:
                why = "was accepted" if result.returncode == 0 else f"refused without naming {filename}"
                print(f"  ** {name}: {why}")
                failures += 1

    # And the check must PASS on the tree as it stands, or the mutations above prove nothing.
    clean = subprocess.run(
        [sys.executable, "scripts/check_copy.py"], cwd=ROOT, capture_output=True, text=True,
    )
    if clean.returncode != 0:
        print("  ** check_copy.py fails on the unmutated tree, so every case above is a tautology")
        print(clean.stdout or clean.stderr)
        failures += 1
    return failures


def main() -> int:
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        pristine = Path(tmp) / "pristine"
        shutil.copytree(ROOT / "registry", pristine)

        for name, filename, find, replace in CASES:
            work = Path(tmp) / "work"
            if work.exists():
                shutil.rmtree(work)
            work.mkdir()
            shutil.copytree(pristine, work / "registry")
            shutil.copytree(ROOT / "scripts", work / "scripts")
            # The validator cross-checks registry/models.yaml against CREDITS.md, so a tree
            # without it fails for a reason that has nothing to do with the case under test.
            shutil.copy2(ROOT / "CREDITS.md", work / "CREDITS.md")

            path = work / "registry" / filename
            text = path.read_text(encoding="utf-8")
            if find not in text:
                print(f"BROKEN TEST: {name!r} -- the string it mutates is not in {filename}")
                failures += 1
                continue
            path.write_text(text.replace(find, replace, 1), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, "scripts/check_registry.py"],
                cwd=work, capture_output=True, text=True,
            )
            out = result.stdout + result.stderr
            refused = result.returncode != 0
            names_the_file = filename in out
            if refused and names_the_file:
                print(f"  refused: {name}")
            else:
                why = "was accepted" if not refused else f"refused without naming {filename}"
                print(f"  ** {name}: {why}")
                failures += 1

    print("")
    failures += check_tour_refusals()

    print("")
    failures += check_copy_refuses()

    if failures:
        print(f"\n{failures} guard(s) do not do what they claim")
        return 1
    refusals = len(CASES) + len(COPY_CASES) + len(TOUR_CASES)
    print(f"\nall {refusals} refusals fire and each names its file, and registry/tours.yaml "
          f"as it stands is accepted")
    return 0


if __name__ == "__main__":
    sys.exit(main())
