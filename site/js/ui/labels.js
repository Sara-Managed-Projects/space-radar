// ui/labels.js -- names over the scene for the few things worth naming (spec 0026 req 5).
//
// Contract: createLabels(ctx, host) -> { update(tMs), destroy(), emphasise(id), clearEmphasis() }
// Also exported, pure, so the choice can be tested without a DOM:
//   chooseLabels(candidates, opts) -> the candidates that get a label, in draw order
//
// `#labels` has been in index.html since day one with a CSS rule and no writer. This is the writer.
//
// WHAT GETS A NAME. Never the catalogue: 17 000 labels is a wall of text and a frame budget. At
// most LABEL_CAP (8) on screen, desktop and phone alike (spec 0061 req 10, docs/ui-guide.md §3.13),
// in this order of rank (labelTier):
//   0. the selection -- always, and a trip's subject too, unless it is the ground under the camera.
//      The trip's card names its subject but cannot point at it: MEASURED 2026-09-22 on "To the
//      edge", Proxima was one unlabelled point among hundreds, and at the Sun the nearest name was
//      Voyager 1's;
//   1. the selection's train -- a few other members of the same group (a fresh Starlink line is
//      one card with N members, and the names say which is which), at most TRAIN_CAP of them;
//   2. the crewed stations;
//   3. the named storms;
//   4. the bright planets and the Moon (every planet on the Sun's stage, where they ARE the view);
//   5. the rest of what is notable -- records a hand-kept list gave a reason (`meta.why`), the other
//      worlds, the launches -- in scene/pickrank.js order, the one rule for "which of these first".
// A rocket body or a piece of debris is never named unless it is the selection, or its own layer is
// one the visitor switched on to see derelicts (isDerelict, mayNameHere). MEASURED 2026-10-02 on
// the default view at 1440x900 with the saved satellite copy: nine names, two of them "SL-8 rocket
// body" and "Envisat" (dead since 2012), and the live site printed "Thor Agena D rocket body" at the
// top of the first screen. The list that gave those a reason is the Famous debris layer's, which is
// off by default; the same objects arrive on the default-on "Bright enough to see" layer and were
// named from there.
// Two labels closer than 24 px on screen would overprint, so the lower-ranked one yields; that is
// the same forgiveness distance a tap uses (scene/pickrank.js), for the same reason. That test is on
// ANCHORS, before anything is measured, and a name is a box two hundred pixels wide -- so the boxes
// are checked again once they are measured and placed (keepClearOf, below). A box that yields
// leaves its place to the next candidate: LABEL_POOL are measured so that eight can still be shown.
//
// HYSTERESIS. The globe turns and the satellites move, so two candidates of nearly the same rank
// swap places tick after tick and their names blink in turn. A name shown on the last tick ranks as
// though it were HYSTERESIS times as far away, so a newcomer must be clearly nearer to take its
// slot, and among equals the incumbent is placed first, so it is the one that wins an overlap.
//
// COST. Candidates are a few hundred records at most (the notable lists, the worlds, the stations,
// the selection's train), projected in float64 through stage.toScene and camera.project on the
// glyph tick (10 Hz at 1x), never the 17 000. DOM nodes are pooled: twelve <div>s, moved, never
// re-created per frame.

import * as THREE from '../../vendor/three.module.min.js';
import { propagate } from '../propagate/index.js';
import { stage, isLadderStage } from '../scene/stage.js';
import { realModelFor } from '../scene/realmodels.js';
import { WORLDS, systemOf } from '../scene/worlds.js';
import { rankAll } from '../scene/pickrank.js';

/** Names on screen at once, desktop and phone (spec 0061 req 10). */
export const LABEL_CAP = 8;
/** Candidates measured per tick, so a name that yields its box can be replaced by the next one. */
export const LABEL_POOL = 12;
/** Members of the selection's train named beside it: enough to say which is which, not the line. */
export const TRAIN_CAP = 3;
export const DEDUPE_PX = 24;
/** Names this layer may show in the sky from the ground, where the sky names itself (internal #393). */
export const SKY_VIEW_CAP = 4;
/** A name shown on the last tick ranks as though it were this share of its distance (HYSTERESIS). */
export const HYSTERESIS = 0.7;
/**
 * The worlds bright enough to find by eye, ranked before the rest wherever they are drawn (spec
 * 0061 req 10, "bright planets"): the Sun, the Moon, the five naked-eye planets -- and the Earth,
 * the brightest thing in the sky from anywhere else.
 */
export const BRIGHT_WORLDS = new Set(['sun', 'moon', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn']);
/**
 * Inside the planets' tier, this order before distance: the Earth and the Moon, then the giants.
 * MEASURED 2026-10-02 on the Planets tab at 390x844: nearest-first named Mercury, whose name over the
 * crowded inner system covered Saturn's dot, and Saturn went unnamed while Sedna and Quaoar were
 * named. A moon still follows its planet (half a place behind it), and the Sun, which is a stage's
 * light more than a thing anybody finds a planet by, is last.
 */
export const PLANET_ORDER = ['earth', 'moon', 'jupiter', 'saturn', 'venus', 'mars', 'uranus', 'neptune', 'mercury', 'pluto', 'sun'];
/** labelTier's ranks, by name, for the tests and the probe. */
export const TIER = { selection: 0, train: 1, station: 2, storm: 3, planet: 4, rest: 5 };
// THE RACK-FOCUS SUBSTITUTE (spec 0034 req 4, 2026-09-23). A film pulls focus to the thing the
// scene is about; this camera never does, because a defocused world is a world drawn wrong. So on
// arrival the trip's subject's name settles from EMPHASIS_FROM to full size over EMPHASIS_MS and
// every other name waits at DIM_OPACITY. The numbers are drawn by site/css/ui.css (a keyframe
// and an opacity cannot read a JS constant); tests/test_labels.mjs reads them back out of the CSS.
export const EMPHASIS_MS = 300;
export const EMPHASIS_FROM = 0.92;
export const DIM_OPACITY = 0.6;
export const SUBJECT_CLASS = 'is-subject';
export const DIMMED_CLASS = 'is-dimmed';
const MAX_NAME = 34;
const HEX = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Launch Library names a launch "Rocket Variant | Mission (Detail)". Over the scene that was cut
 * mid-word -- "Falcon 9 Block 5 | Transporter 18…" (#278) -- so a label keeps the rocket's family
 * and the mission, joined by a middle dot: "Falcon 9 · Transporter 18". The card keeps it whole.
 */
export function launchLabel(name) {
  const text = String(name || '');
  const cut = text.indexOf(' | ');
  if (cut < 0) return text;
  const rocket = text.slice(0, cut).replace(/\s+Block\s+\d+[A-Z]?$/i, '').replace(/\s+\([^)]*\)$/, '').trim();
  const mission = text.slice(cut + 3).replace(/\s+\([^)]*\)?$/, '').trim();
  if (!mission) return rocket || text;
  return rocket ? `${rocket} · ${mission}` : mission;
}

/** A name a person uses, before the catalogue's string. Mirrors ui/cards.js displayName. */
export function labelName(record) {
  let name = record && record.meta && record.meta.displayName ? String(record.meta.displayName).trim() : '';
  if (!name) {
    let entry = null;
    try { entry = realModelFor(record); } catch { entry = null; }
    // A route's own `displayName` names this exact object even when its shape is generic
    // (Tiangong); otherwise a generic route's `name` is a class ("a Starlink") and renames nothing.
    if (entry && entry.displayName) name = String(entry.displayName).trim();
    else if (entry && !entry.generic && entry.name) name = String(entry.name).trim();
  }
  // Then the hand-kept list's own name (data/layers.js NOTABLE), before the catalogue's string.
  if (!name && record && record.meta && record.meta.listName) name = String(record.meta.listName).trim();
  if (!name) name = record && record.name ? String(record.name).trim() : '';
  name = launchLabel(name);
  if (name.length > MAX_NAME) name = name.slice(0, MAX_NAME - 1).trimEnd() + '…';
  return name;
}

/**
 * The names a list of records is labelled with, none twice (internal #372: "GOES weather
 * satellite" stood twice on the Tonight sky, 100 px apart). Records that share a display name are
 * told apart by the catalogue's own name ("GOES 16", "GOES 18") when that differs; where even that
 * is the same, the later one gets null and is not labelled. Pure.
 */
export function distinctNames(records) {
  const names = records.map((r) => labelName(r));
  const seen = new Map();
  names.forEach((n, i) => seen.set(n, (seen.get(n) || []).concat(i)));
  for (const idx of seen.values()) {
    if (idx.length < 2) continue;
    const used = new Set();
    for (const i of idx) {
      let own = launchLabel(String((records[i] && records[i].name) || '').trim());
      if (own.length > MAX_NAME) own = own.slice(0, MAX_NAME - 1).trimEnd() + '…';
      names[i] = own && !used.has(own) && (own === names[i] || !seen.has(own)) ? own : null;
      if (names[i] !== null) used.add(own);
    }
  }
  return names;
}

// Classes that are places on the ladder's own scale. On a ladder stage everything else -- the
// planets, the probes, the asteroids -- sits inside one pixel of the Sun, where a label names
// whichever happened to be first: "Uranus" for the Sun from the Pleiades, "Voyager 1" from a
// light-year out (measured 2026-09-22). There the Sun speaks for the whole Solar System.
const LADDER_KLASSES = new Set(['star', 'exoplanet', 'dso', 'exotic']);

/** On a ladder stage, is this record drawn as its own place rather than inside the Sun's pixel? */
export function isOwnPlaceOnLadder(record) {
  if (!record) return false;
  if (record.klass === 'world') return record.id === 'sun';
  return LADDER_KLASSES.has(record.klass);
}

/** Is this a record a hand-kept list, or the app's own structure, made worth naming? */
export function isNotable(record) {
  if (!record) return false;
  if (record.meta && record.meta.why) return true;
  if (record.klass === 'world' || record.klass === 'station') return true;
  // A storm happening now is named (2026-09-28): "Polo" beside the spiral is the whole point of
  // the layer, and there are rarely more than a handful.
  if (record.klass === 'storm') return true;
  return false;
}

/**
 * Is this a rocket body or a piece of debris: a dead thing, not a working one? Pure.
 *
 * The class says so for most of them (data/parsers.js classify: R/B, DEB, FRAG in the catalogue
 * name). It cannot for a dead satellite: ENVISAT is filed as a satellite by its name, and only the
 * hand-kept Famous debris list knows it died in 2012, so data/layers.js stamps `meta.derelict` on
 * that list's rows wherever they arrive. A rocket on its way up (the launches layer, klass rocket)
 * is a live thing with a crew of engineers watching it, and is not one.
 */
export function isDerelict(record) {
  if (!record) return false;
  if (record.meta && record.meta.derelict) return true;
  if (record.klass === 'debris') return true;
  return record.klass === 'rocket' && record.layer !== 'launches';
}

/**
 * May a record of this layer be named at all, before rank? Everything may, except a derelict on a
 * layer that is not about derelicts: a dead stage on "Bright enough to see" is there because it
 * catches the light, not because anybody came to read its name. A layer whose own class is debris
 * (Famous debris, Things that came down) is one the visitor switched on to see exactly those, and
 * there they are named. The selection is never asked this.
 */
export function mayNameHere(record, layer) {
  if (!isDerelict(record)) return true;
  return !!(layer && layer.klass === 'debris');
}

/**
 * Are this layer's records places of their own from this stage, or inside the Earth's pixel? Pure.
 * The Earth's satellites, storms and pads are named from the Earth's stage and the Moon's (which
 * shares its frame); from anywhere else they are one point with the Earth. MEASURED 2026-10-02 on
 * the Planets tab, the whole Solar System framed: "Tiangong space station" was printed beside the
 * Sun, where the Earth is, and took the place Saturn's name needed.
 */
export function layerNamedFrom(layer, stageId) {
  if (!layer || !/^earth/.test(String(layer.frame || ''))) return true;
  return stageId === 'earth' || stageId === 'moon';
}

/**
 * Which tier of rank a candidate is in (the header's 0..5). Pure. `opts.allPlanets`: every planet
 * is in the planets' tier, not only the bright ones -- on the Sun's stage, where they are the view;
 * `opts.worldsFirst` (a trip on the Sun's stage) puts every world there.
 */
export function labelTier(c, opts = {}) {
  if (!c || !c.record) return TIER.rest;
  if (c.kind === 'selection') return TIER.selection;
  if (c.kind === 'train') return TIER.train;
  const r = c.record;
  if (r.klass === 'station') return TIER.station;
  if (r.klass === 'storm') return TIER.storm;
  if (r.klass === 'world') {
    if (opts.worldsFirst || BRIGHT_WORLDS.has(r.id)) return TIER.planet;
    if (opts.allPlanets && r.id && systemOf(r.id) === r.id) return TIER.planet;
  }
  return TIER.rest;
}

/**
 * May this record compete for one of the "nearest notable" labels on this kind of stage? Pure, and
 * the one filter candidatesNow applies, so a test can hold it.
 *
 * A FAMOUS STAR IS NAMED ON THE LADDER ONLY (2026-09-22, registry/stars-notable.yaml). On a rung it
 * is a place the camera can fly past. On a world stage the stars are directions on a shell, and
 * the Sun's stage (1e6 km a unit) puts every star within ~100 light-years inside the far plane, so
 * without this Sirius and Vega would take label slots from the planets on a view that is about the
 * planets. The selection is labelled wherever it is; this is only the notable list.
 */
export function isNotableHere(record, ladder) {
  if (!isNotable(record)) return false;
  if (ladder) return isOwnPlaceOnLadder(record);
  return record.klass !== 'star';
}

/** A launch ranks among the rest as though it were this many times as far (chooseLabels says why). */
export const LAUNCH_SCORE = 2;

/**
 * The choice, pure. `candidates` are already projected: {record, x, y, dist, kind} with x, y in
 * pixels and kind one of 'selection' | 'train' | 'notable'. A candidate may also carry `parentId`:
 * the id of the world it goes round (ui/labels.js sets it from scene/worlds.js systemOf). Returns
 * those that get a label, in rank order (labelTier, then distance), dropping anything within
 * DEDUPE_PX of a label already kept, at most TRAIN_CAP of the train, capped at `opts.cap`
 * (LABEL_CAP; the live caller asks for LABEL_POOL and shows the first LABEL_CAP whose boxes fit).
 *
 * `opts.incumbents`: the ids named on the last tick (the header's HYSTERESIS). `opts.allPlanets`
 * and `opts.worldsFirst`: labelTier's.
 *
 * THE REST, BY PICKRANK. Inside the last tier the order is scene/pickrank.js rankAll's -- the same
 * function that decides which of several things a tap meant -- with the camera distance as the
 * score, so nearer is first. A launch's `why` is the honesty note about its drawn climb, not a
 * reason it is worth naming, so a launch scores as though it were twice as far: the hand-kept
 * reasons go first, and a pad is still named when there is room.
 *
 * A MOON NEVER OUTRANKS ITS PLANET. Nearest-first is the right order for things at honest
 * distances, but a planet and its moons are drawn on one compressed shell where the moon's drawn
 * distance is the planet's plus a widened offset -- which of the two came out nearer was a coin
 * toss. MEASURED from Saturn on 2026-09-22 at 1280x800, aimed at the Sun: the names printed were
 * "4 Vesta, Titan, Earth, Deimos, Phaethon, Ganymede, Callisto". Mars was drawn 11 px from Deimos
 * and Jupiter 5 px from Ganymede, each ten times the wider disc, and neither was named: the rest of
 * the solar system read as a row of moons. So a candidate with a `parentId` that is also a
 * candidate sorts on ITS PARENT'S distance, and behind the parent.
 *
 * `opts.worldsFirst`: the worlds take the notable slots before anything else notable. Set while a
 * trip runs on the Sun's stage (spec 0030, "A year in a minute"), where the planets ARE the
 * picture: MEASURED in headless Chrome 2026-09-23, from 700 million km above the inner Solar
 * System the ten nearest notables were probes and asteroids near the Earth (OSIRIS-APEX, Apophis,
 * Bennu, Ryugu...), and not one planet the card was about was named. Everywhere else nearest-first
 * stands, because there the nearest thing is what the view is about.
 */
export function chooseLabels(candidates, opts = {}) {
  const cap = opts.cap || LABEL_CAP;
  const trainCap = Number.isFinite(opts.trainCap) ? opts.trainCap : TRAIN_CAP;
  const dedupe = opts.dedupePx || DEDUPE_PX;
  const incumbents = opts.incumbents instanceof Set ? opts.incumbents : new Set(Array.isArray(opts.incumbents) ? opts.incumbents : []);
  const clean = (Array.isArray(candidates) ? candidates : [])
    .filter((c) => c && c.record && Number.isFinite(c.x) && Number.isFinite(c.y));
  const distById = new Map(clean.map((c) => [c.record.id, c.dist]));
  const parentOf = (c) => (c.parentId && distById.has(c.parentId) ? c.parentId : null);
  // A moon ranks on its planet's distance, and its planet's incumbency: they are one place.
  const score = (c) => {
    const parent = parentOf(c);
    const d = parent ? distById.get(parent) : c.dist;
    let s = Number.isFinite(d) ? d : Number.MAX_VALUE / 4;
    if (incumbents.has(parent || c.record.id)) s *= HYSTERESIS;
    if (c.record.layer === 'launches') s *= LAUNCH_SCORE;
    return s;
  };
  const order = (k) => {
    if (k.tier !== TIER.planet) return 0;
    const parent = parentOf(k.c);
    const i = PLANET_ORDER.indexOf(parent || k.c.record.id);
    return (i < 0 ? PLANET_ORDER.length : i) + (parent ? 0.5 : 0);
  };
  const keyed = clean.map((c) => ({ c, tier: labelTier(c, opts), s: score(c), child: parentOf(c) ? 1 : 0 }));
  keyed.sort((a, b) => (a.tier - b.tier) || (order(a) - order(b)) || (a.s - b.s) || (a.child - b.child) || (a.c.dist - b.c.dist));
  const head = keyed.filter((k) => k.tier < TIER.rest).map((k) => k.c);
  const tail = keyed.filter((k) => k.tier === TIER.rest);
  // rankAll's sort is stable, so a moon that ties its planet stays behind it, as sorted above.
  const byRecord = new Map(tail.map((k) => [k.c.record, k.c]));
  const rest = rankAll(tail.map((k) => ({ record: k.c.record, score: k.s })), [], tail.length)
    .map((x) => byRecord.get(x.record))
    .filter(Boolean);
  const out = [];
  let train = 0;
  for (const c of head.concat(rest)) {
    if (out.length >= cap) break;
    if (c.kind === 'train' && train >= trainCap) continue;
    let clash = false;
    for (const k of out) {
      if (Math.hypot(k.x - c.x, k.y - c.y) < dedupe) { clash = true; break; }
    }
    if (clash) continue;
    out.push(c);
    if (c.kind === 'train') train++;
  }
  return out;
}

/**
 * Which world a record is DRAWN AROUND, which is what chooseLabels ranks a moon behind. Null for
 * anything else -- including a planet, whose parent is the Sun: the Sun is the stage's light rather
 * than a thing anybody finds a planet by, and ranking every planet at the Sun's distance would put
 * the whole solar system behind every satellite in low orbit. scene/worlds.js systemOf draws that
 * same line for the drawing, and there is one rule, not two.
 */
export function labelParentId(record) {
  if (!record || record.klass !== 'world' || !record.id) return null;
  const sys = systemOf(record.id);
  return sys === record.id ? null : sys;
}

/** How far a label keeps off the edge of the window, in CSS pixels. 12, not 4 (internal #334): at
 * 4 px a name's first letter sat against the glass of a phone, which read as a name cut off. */
export const LABEL_EDGE_PAD = 12;

/** Air between a model's silhouette and the name above it, in CSS pixels. */
export const LABEL_MODEL_GAP = 6;

/**
 * How far to raise a label so it clears its own MODEL. Pure. A label hangs from 0.4 to 1.4 of its
 * height above the anchor, which clears a dot and nothing bigger: at the ISS arrival "Terra" was
 * printed across Terra's own model, 84 px of spacecraft under a name 20 px above its centre
 * (internal #334). `radiusPx` is the model's reach on screen (scene/heroes.js drawnReach); with no
 * model it is 0 and the label stays where it always was.
 */
export function labelLift(radiusPx, boxHeight, gap = LABEL_MODEL_GAP) {
  const r = Number.isFinite(radiusPx) && radiusPx > 0 ? Math.min(radiusPx, 200) : 0;
  if (!r) return 0;
  const clear = 0.4 * (Number.isFinite(boxHeight) ? boxHeight : 0);
  return Math.max(0, Math.round(r + gap - clear));
}

/**
 * Where to centre a label of `boxWidth` anchored at `x`, so the whole box stays on screen.
 *
 * A label is drawn with `translate(-50%)`, so half of it hangs to the left of the anchor and half
 * to the right. Only the ANCHOR was ever kept on screen, never the box, so a name on an object near
 * the edge was cut off by the edge of the window. MEASURED on a 375 px phone, 2026-09-20: a label
 * ran 311..407 on a 375 px screen, a third of the name off the side. It happens on a desktop too,
 * as a smaller fraction of a wider window, which is why it had not been noticed.
 *
 * A label wider than the window cannot be fully shown; it starts at the left edge rather than being
 * centred on nothing, so the beginning of the name is the part that survives.
 */
export function clampLabelX(x, boxWidth, hostWidth, pad = LABEL_EDGE_PAD) {
  if (!Number.isFinite(x)) return x;
  const half = (Number.isFinite(boxWidth) ? boxWidth : 0) / 2;
  const lo = half + pad;
  const hi = (Number.isFinite(hostWidth) ? hostWidth : 0) - half - pad;
  if (hi < lo) return lo;
  return Math.min(Math.max(x, lo), hi);
}

/** Space kept between two label boxes, in CSS pixels. */
export const LABEL_GAP_PX = 2;
/**
 * What a label may not print under: the panels, the card, the phone's sheet and top bar -- and the
 * HUD's tag and chevron, which name the selection. MEASURED 2026-10-02 at the ISS arrival: "Tiangong
 * space station" was printed across the ISS's tag, two names on one glass chip.
 */
const PANEL_SELECTOR = '#sr-side, #sr-rail, #sr-time, .sr-pop, .sr-panel, .sr-card, #sr-top, .sr-tag, .sr-chevron';

/**
 * Which of these placed boxes to keep, in priority order: the first box always, and each later box
 * only if it overlaps none already kept. `boxes` are {left, top, right, bottom} in CSS pixels, in
 * the order chooseLabels returned them -- selection, train, nearest notable -- so when two collide
 * the more important name is the one that survives.
 *
 * WHY THIS EXISTS. chooseLabels drops a label whose ANCHOR is within 24 px of another's. A label is
 * not an anchor: it is a box as wide as its name. Two payloads from one launch fly metres apart,
 * their anchors land 30-odd pixels apart on the same row, both pass the 24 px test, and their boxes
 * print on top of each other. Seen on the live site on a 390 px phone, 2026-09-21: "Long March 6A |
 * Unknown Payload 1" and "... Payload 2" as one unreadable line. clampLabelX can also slide a box
 * sideways into its neighbour after the anchor test has already passed it. Both need the real width,
 * which only exists after measuring -- so this runs on placed boxes, not anchors.
 */
export function keepClearOf(boxes, gap = LABEL_GAP_PX, blocked = []) {
  // `blocked` are the panels on screen: kept before any label, so a name never prints under one.
  const kept = (Array.isArray(blocked) ? blocked : []).filter((b) => b && [b.left, b.top, b.right, b.bottom].every(Number.isFinite));
  const out = [];
  for (const b of Array.isArray(boxes) ? boxes : []) {
    const ok = !!b && [b.left, b.top, b.right, b.bottom].every(Number.isFinite) &&
      !kept.some((k) => b.left < k.right + gap && b.right + gap > k.left && b.top < k.bottom + gap && b.bottom + gap > k.top);
    out.push(ok);
    if (ok) kept.push(b);
  }
  return out;
}

/**
 * The first `cap` of the boxes keepClearOf kept, in rank order; the rest are hidden. Pure. The live
 * caller measures LABEL_POOL candidates so a name that yields its place under a panel or beside a
 * wider name is replaced by the next one, and this is where the eight are counted.
 */
export function capKept(keep, cap = LABEL_CAP) {
  let n = 0;
  return (Array.isArray(keep) ? keep : []).map((k) => {
    if (!k || n >= cap) return false;
    n++;
    return true;
  });
}

/**
 * A world hides the label of anything behind it. Shrunk by this much, so a thing standing ON the
 * surface -- a landing site, seen at a low angle over faceted geometry -- is not hidden by its own
 * ground.
 */
export const OCCLUDER_SHRINK = 0.998;

/**
 * Is `pos` hidden from `eye` behind one of these spheres? Pure; `spheres` are {x, y, z, r, id} in
 * scene units, and the sphere whose `id` is `skipId` is ignored -- a world's label sits on its own
 * centre, which its own surface would otherwise always hide.
 *
 * WHY. A label was placed wherever its point projected, whatever was in front of it. MEASURED in
 * headless Chrome on 2026-09-22, the Moon trip's first stop: seven names -- Ryugu, Bennu, Eros,
 * OSIRIS-APEX, Hera, Hayabusa2, Europa Clipper, every one of them far beyond the Moon in that
 * direction -- printed across the lunar surface around Surveyor 1, as if they were landing sites.
 */
export function behindWorld(eye, pos, spheres, skipId = null) {
  const dx = pos.x - eye.x;
  const dy = pos.y - eye.y;
  const dz = pos.z - eye.z;
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 0) || !Array.isArray(spheres)) return false;
  const ux = dx / len;
  const uy = dy / len;
  const uz = dz / len;
  for (const s of spheres) {
    if (!s || s.id === skipId || !(s.r > 0)) continue;
    const ox = s.x - eye.x;
    const oy = s.y - eye.y;
    const oz = s.z - eye.z;
    const along = ox * ux + oy * uy + oz * uz;
    if (along <= 0) continue; // behind the eye
    const r = s.r * OCCLUDER_SHRINK;
    const off2 = ox * ox + oy * oy + oz * oz - along * along;
    if (off2 >= r * r) continue; // the line of sight passes beside it
    const entry = along - Math.sqrt(r * r - off2);
    if (entry > 0 && entry < len) return true;
  }
  return false;
}

/** Is a label's anchor inside a square box of side `side` centred on `centre`? Pure, for the test. */
export function insideBox(pt, centre, side) {
  if (!pt || !centre || !(side > 0)) return false;
  return Math.abs(pt.x - centre.x) <= side / 2 && Math.abs(pt.y - centre.y) <= side / 2;
}

export function createLabels(ctx, host) {
  if (!host || typeof document === 'undefined') {
    return { update() {}, destroy() {}, emphasise() {}, clearEmphasis() {}, subject: () => null };
  }
  // The id whose label is emphasised, or null. Read by update(), so the classes follow the slot the
  // subject is drawn in whichever of the twelve that turns out to be on the next tick.
  let subjectId = null;
  // The ids named on the last tick, for chooseLabels' HYSTERESIS.
  let shownIds = new Set();
  const pool = [];
  for (let i = 0; i < LABEL_POOL; i++) {
    const node = document.createElement('div');
    node.className = 'label';
    node.hidden = true;
    const dot = document.createElement('span');
    dot.className = 'dot sr-swatch';
    dot.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'label__text';
    node.appendChild(dot);
    node.appendChild(text);
    host.appendChild(node);
    pool.push({ node, dot, text, klass: '', colour: '' });
  }
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();
  let spheres = [];
  // On the Sun's stage every planet is ranked as a bright one: they are what that view is of.
  let lastAllPlanets = false;

  /** The drawn worlds, as spheres a label can be behind, once per update. */
  let lastBoxes = [];

  function occluders() {
    const out = [];
    const worlds = ctx.worlds;
    if (!worlds || !worlds.drawnPositionOf || !worlds.drawnRadiusUnits) return out;
    for (const w of WORLDS) {
      const c = worlds.drawnPositionOf(w.id, _c);
      const r = worlds.drawnRadiusUnits(w.id);
      if (c && r > 0) out.push({ id: w.id, x: c.x, y: c.y, z: c.z, r });
    }
    return out;
  }

  function project(record, tMs, camera, w, h) {
    // From the ground the sky view names the Sun, the Moon, the planets and the stars itself, where
    // the air puts them (sky/groundsky.js); a second name at the orbital scene's place for the same
    // thing would sit beside it, up to half a degree off on the horizon.
    if ((record.klass === 'world' || record.klass === 'star') && ctx.skyView && ctx.skyView.ownsSky) return null;
    const p = propagate(record, tMs);
    if (!p) return null;
    // A world's DISC may sit nearer than its true position (scene/worlds.js compresses the planets
    // from a world stage); the label goes where the disc is drawn.
    let pos = null;
    if (record.klass === 'world' && ctx.worlds && ctx.worlds.drawnPositionOf) pos = ctx.worlds.drawnPositionOf(record.id, _v);
    // On a star system's stage (spec 0040) its planets are drawn on their orbits, not at the star.
    if (!pos && ctx.systems && ctx.systems.active) pos = ctx.systems.drawnPositionOf(record.id, _v);
    if (!pos) pos = stage.toSceneInto(p, p.frame, _v, tMs);
    if (!pos) return null;
    if (behindWorld(camera.position, pos, spheres, record.klass === 'world' ? record.id : null)) return null;
    // From the ground the air lifts a satellite's dot (scene/glyphs.js); its name goes with it (internal #418).
    if (ctx.skyView && ctx.skyView.ownsSky && ctx.skyView.apparent) ctx.skyView.apparent(pos);
    const dist = pos.distanceTo(camera.position);
    // Its model's reach on screen, when it is drawn as one (labelLift raises the name over it).
    let r = 0;
    const reach = ctx.heroes && typeof ctx.heroes.drawnReach === 'function' ? ctx.heroes.drawnReach(record.id) : 0;
    if (reach > 0 && dist > 0 && camera.isPerspectiveCamera) r = (reach / dist) / Math.tan((camera.fov * Math.PI) / 360) * (h / 2);
    pos.project(camera);
    if (pos.z > 1 || pos.z < -1) return null;
    const x = (pos.x + 1) * 0.5 * w;
    const y = (1 - pos.y) * 0.5 * h;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) return null;
    return { x, y, dist, r };
  }

  /**
   * The colour this record's own dot is drawn in -- scene/glyphs.js colourOf, or the colour key's when
   * one is on (main.js ctx.colourKeyFn) -- so the dot beside a name, the dot on the globe and the
   * swatch in What to show are one colour. The label's dot used to be its CLASS colour: a rocket body
   * on "Bright enough to see" is drawn sky blue there and was labelled with a yellow dot. Empty when
   * the record's marks are not dots of one colour; the class swatch in the stylesheet stands in.
   */
  function dotColour(record, layer = null) {
    const fn = typeof ctx.colourKeyFn === 'function' ? ctx.colourKeyFn : null;
    let c = null;
    try { c = fn ? fn(record) : null; } catch { c = null; }
    if (!c) {
      const l = layer || (ctx.layers || []).find((x) => x.id === record.layer);
      c = (record.meta && record.meta.colour) || record.colour || (l && l.colour) || null;
    }
    return typeof c === 'string' && HEX.test(c) ? c : '';
  }

  function candidatesNow(tMs) {
    const camera = ctx.camera;
    if (!camera) return [];
    const w = host.clientWidth || window.innerWidth;
    const h = host.clientHeight || window.innerHeight;
    const out = [];
    const seen = new Set();
    spheres = occluders();
    const inTrip = document.documentElement.classList.contains('sr-trip-mode');
    const selected = typeof ctx.selected === 'function' ? ctx.selected() : null;
    const layerOf = (id) => (ctx.layers || []).find((l) => l.id === id);
    const drawable = (layer) => (ctx.isLayerDrawable ? ctx.isLayerDrawable(layer) : ctx.isLayerOn && ctx.isLayerOn(layer.id));

    const ladder = isLadderStage(stage.worldId);
    lastAllPlanets = stage.worldId === 'sun';
    const isGround = (r) => r.klass === 'world' && r.id === stage.worldId;
    // The tracked object's tag (ui/hud.js, spec 0047) names the selection beside its brackets; a
    // label as well would be the same name twice, 30 px apart.
    const tagged = !!(ctx.hud && typeof ctx.hud.namesSelection === 'function' && ctx.hud.namesSelection());
    if (tagged && selected) seen.add(selected.id); // and not again as one of the notable names
    if (selected && !tagged && !(inTrip && isGround(selected))) {
      const pr = project(selected, tMs, camera, w, h);
      if (pr) { out.push({ record: selected, kind: 'selection', colour: dotColour(selected), ...pr }); seen.add(selected.id); }
    }
    // the selection's train: same layer, same group key
    if (selected) {
      const layer = layerOf(selected.layer);
      if (layer && typeof layer.groupBy === 'function') {
        const key = layer.groupBy(selected);
        if (key) {
          for (const r of ctx.recordsFor(layer.id) || []) {
            if (r === selected || seen.has(r.id) || layer.groupBy(r) !== key) continue;
            const pr = project(r, tMs, camera, w, h);
            if (pr) { out.push({ record: r, kind: 'train', colour: dotColour(r, layer), ...pr }); seen.add(r.id); }
          }
        }
      }
    }
    // A star system's own star and planets, on its stage (spec 0040): eight names at most, and the
    // whole of what that stage draws, so every one of them is worth its label.
    if (ctx.systems && ctx.systems.active) {
      for (const r of ctx.systems.records()) {
        if (seen.has(r.id)) continue;
        const pr = project(r, tMs, camera, w, h);
        if (pr) { out.push({ record: r, kind: 'notable', colour: dotColour(r), ...pr }); seen.add(r.id); }
      }
    }
    // the nearest notable things among what is drawn
    for (const layer of ctx.layers || []) {
      if (!drawable(layer)) continue;
      if (!layerNamedFrom(layer, stage.worldId)) continue;
      const records = ctx.recordsFor(layer.id) || [];
      // a layer that is small enough to name entirely, or the hand-kept rows of a big one
      for (const r of records) {
        if (seen.has(r.id) || !isNotableHere(r, ladder)) continue; // on the ladder: not inside the Sun's pixel
        if (isGround(r)) continue; // the ground has no label
        if (!mayNameHere(r, layer)) continue; // a dead stage on a layer about light, not derelicts
        const pr = project(r, tMs, camera, w, h);
        // A moon says which world it goes round, so chooseLabels can rank it behind that world.
        if (pr) { out.push({ record: r, kind: 'notable', parentId: labelParentId(r), colour: dotColour(r, layer), ...pr }); seen.add(r.id); }
      }
    }
    // Nothing is named inside the tracked object's brackets while its tag shows. MEASURED
    // 2026-09-29 (hud-arrived.png): "the International Space Station, which Nauka is part of" was
    // printed across the station's model -- Nauka and Poisk are catalogue objects of their own,
    // docked to it, crewed stations and so notable, and their names sat on the station's own centre.
    if (tagged && ctx.hud && typeof ctx.hud.state === 'function') {
      const st = ctx.hud.state();
      if (st && st.px && Number.isFinite(st.box)) return out.filter((c) => !insideBox(c, st.px, st.box));
    }
    return out;
  }

  /**
   * A label is centred on the thing it names, so half of it hangs past that point. Only the ANCHOR
   * was kept on screen (`x > w + 20` in project()), never the box, so a name on an object near the
   * right edge was cut off by the edge of the window.
   *
   * MEASURED on a 375 px phone, 2026-09-20, which is where it shows worst: a label ran 311..407 on
   * a 375 px screen -- a third of the name off the side. The same thing happens on a desktop; it is
   * simply a smaller fraction of a wider window, which is why nobody had seen it.
   *
   * So the box is kept inside the host: the anchor may sit anywhere, the label slides to stay
   * readable, and a label wider than the whole screen still starts at the left edge rather than
   * being centred on nothing.
   */
  function update(tMs) {
    if (host.hidden) { lastBoxes = []; return; }
    const inTrip = document.documentElement.classList.contains('sr-trip-mode');
    // While constellation figures are up they name their own stars (scene/figures3d.js), and a
    // second name beside one of them would be the wall of text the cap exists to prevent.
    const cands = ctx.figures && ctx.figures.namesTheSky() ? [] : candidatesNow(tMs);
    let chosen = chooseLabels(cands, {
      cap: LABEL_POOL,
      incumbents: shownIds,
      allPlanets: lastAllPlanets,
      worldsFirst: inTrip && stage.worldId === 'sun',
    });
    // FROM THE GROUND THE SKY NAMES ITSELF (sky/groundsky.js: figures, stars, planets, nebulae), and
    // these names were a second layer that knew nothing of that one: "GRACE-FO" sat on "SERPENS
    // CAUDA" (internal #393). There this layer names only what was asked for, the selection and its
    // train, and the crewed stations; the ground sky reads boxes() and keeps its own names clear.
    if (ctx.skyView && ctx.skyView.ownsSky) chosen = chosen.filter((c) => labelTier(c) <= TIER.station).slice(0, SKY_VIEW_CAP);
    // Two things with one name read as a bug (internal #372): each says what tells it apart, or the second goes.
    const names = distinctNames(chosen.map((c) => c.record));
    chosen = chosen.filter((c, i) => names[i] !== null);
    const shown = names.filter((n) => n !== null);
    // Pass one: contents. Pass two: measure and place. Reading offsetWidth invalidates layout, so
    // interleaving it with the writes would re-layout the whole list once per label.
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[i];
      const c = chosen[i];
      if (!c) { if (!slot.node.hidden) slot.node.hidden = true; continue; }
      slot.node.hidden = false;
      const name = shown[i];
      if (slot.text.textContent !== name) slot.text.textContent = name;
      const klass = c.record.klass || 'satellite';
      if (slot.klass !== klass) {
        slot.dot.className = `dot sr-swatch sr-swatch--${klass}`;
        slot.klass = klass;
      }
      const colour = c.colour || '';
      if (slot.colour !== colour) { slot.dot.style.background = colour; slot.colour = colour; }
      slot.node.dataset.kind = c.kind;
      // What it is, for the probes that count names on the first screen (tests/probes).
      if (slot.node.dataset.layer !== (c.record.layer || '')) slot.node.dataset.layer = c.record.layer || '';
      if (slot.node.dataset.klass !== klass) slot.node.dataset.klass = klass;
      const isSubject = subjectId !== null && c.record.id === subjectId;
      setClass(slot.node, SUBJECT_CLASS, isSubject);
      setClass(slot.node, DIMMED_CLASS, subjectId !== null && !isSubject);
    }
    const w = host.clientWidth || window.innerWidth;
    // Measure every box once (one layout), then place, then keep only the boxes that do not overlap
    // one kept before them. The CSS draws a label at translate(-50%, -140%) from its anchor, so the
    // box spans x +- width/2 and from y - 1.4 height to y - 0.4 height.
    const placed = [];
    for (let i = 0; i < pool.length; i++) {
      const c = chosen[i];
      if (!c) break;
      const bw = pool[i].node.offsetWidth;
      const bh = pool[i].node.offsetHeight;
      const x = clampLabelX(c.x, bw, w);
      const y = c.y - labelLift(c.r, bh);
      placed.push({ x, y, left: x - bw / 2, right: x + bw / 2, top: y - 1.4 * bh, bottom: y - 0.4 * bh });
    }
    const keep = capKept(keepClearOf(placed, LABEL_GAP_PX, panelRects()), LABEL_CAP);
    lastBoxes = placed.filter((_, i) => keep[i]);
    const now = new Set();
    for (let i = 0; i < placed.length; i++) {
      const slot = pool[i];
      if (!keep[i]) { slot.node.hidden = true; continue; }
      const b = placed[i];
      slot.node.style.transform = `translate(${Math.round(b.x)}px, ${Math.round(b.y)}px) translate(-50%, -140%)`;
      now.add(chosen[i].record.id);
    }
    shownIds = now;
  }

  /**
   * The UI's own boxes, in the host's pixels. MEASURED 2026-09-27 (#278): "Hubble Space Telescope"
   * slid under the desktop panel column, and on a phone names ran under the bottom bar.
   *
   * NOT `offsetParent`, which is null for every position: fixed element -- the sidebar, the rail,
   * the pill and the popover all are, so since the shell moved into them none of them was ever
   * asked about. MEASURED 2026-10-02 on the Stars tab at 1440x900: "Vela Pulsar" and "Southern
   * Pleiades" ran under the sidebar's right edge, the ends of the names sticking out of the glass.
   * A display: none element has an empty box, and the visibility of the rest is asked directly.
   */
  function panelRects() {
    const out = [];
    if (typeof host.getBoundingClientRect !== 'function' || typeof document.querySelectorAll !== 'function') return out;
    const origin = host.getBoundingClientRect();
    for (const node of document.querySelectorAll(PANEL_SELECTOR)) {
      if (typeof node.getBoundingClientRect !== 'function') continue;
      if (node.hidden) continue;
      const r = node.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) continue;
      if (typeof getComputedStyle === 'function' && getComputedStyle(node).visibility === 'hidden') continue;
      out.push({ left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top });
    }
    return out;
  }

  function destroy() {
    for (const slot of pool) slot.node.remove();
    pool.length = 0;
  }

  // Toggled only when it changes: re-adding `is-subject` to a node that has it would not restart
  // the keyframe, and removing it for a frame would restart it every tick.
  function setClass(node, cls, on) {
    if (node.classList.contains(cls) !== on) node.classList.toggle(cls, on);
  }

  /** Emphasise the label of record `id` from the next update() on, and dim every other. */
  function emphasise(id) {
    subjectId = id === undefined || id === null || id === '' ? null : String(id);
  }

  /** Undo emphasise(), now rather than on the next tick: a flight must not start under a dim. */
  function clearEmphasis() {
    subjectId = null;
    for (const slot of pool) {
      setClass(slot.node, SUBJECT_CLASS, false);
      setClass(slot.node, DIMMED_CLASS, false);
    }
  }

  return { update, destroy, emphasise, clearEmphasis, subject: () => subjectId, boxes: () => lastBoxes };
}
