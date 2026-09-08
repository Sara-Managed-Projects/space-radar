// data/layers.js — registry/layers.yaml expressed in JS, with the selection rules as real code.
//
// CONTRACT (tests/test_contract.mjs):
//   export const LAYERS: Array<{id, display, klass, source, propagator, frame,
//                               moments:{wonder,now,next}, select(records), budget,
//                               defaultOn, colour, glyph, nearKm, card}>
//   export async function loadLayer(layer): Promise<Record[]>
//   export function enabledLayers(moment): Layer[]
//
// Additions beyond the contract, documented in the build report:
//   export const NOTABLE, DEBRIS_NOTABLE   the hand-kept lists, one reason per row
//   export function layerById(id)
//   export async function loadLayerDetailed(layer)  records PLUS the source's LoadResult, so the
//                                                   status panel can say why a layer is thin
//
// A selection rule is DATA that happens to be written as a function: each one is three lines and
// says out loud what it selects. Adding a layer is a row here plus, at most, one predicate.

import { load } from './sources.js';
import { parseCelestrakGP, parseLaunches, parseComets, parseHorizonsVectors, parseNeoApproaches, parseExoplanets, parseDso } from './parsers.js';
import {
  sampleAsteroids,
  sampleDeepSpace,
  sampleReentries,
  handKeptSites,
  sampleOddities,
} from './sample.js';
import { worldRecords } from '../scene/worlds.js';
import { EXOTICS } from './exotics.js';
import { LAYER_ROWS } from './layers.registry.js';

const DAY_MS = 86400000;

// Class colours, verbatim from docs/design-language.md. No red. No purple gradients.
const C = {
  exotic: '#FF8FA3',
  dso: '#D8B4FF',
  exoplanet: '#8EE3A8',
  star: '#FFF3C4',
  world: '#E8ECF2',
  station: '#F2F4F7',
  satellite: '#7FD1FF',
  debris: '#7A8494',
  rocket: '#FFD166',
  probe: '#C3A6FF',
  telescope: '#9EF0D8',
  asteroid: '#B8926A',
  comet: '#D9F3FF',
  site: '#F58F7C',
};

// =================================================================================================
// The hand-kept lists. Every row carries a reason a reviewer can argue with (spec 0008 req 7).
// =================================================================================================
//
// EVERY id below was checked against the live CelesTrak `active` and `visual` groups on
// 2026-09-06 and the name that came back is in the comment. An id I could not confirm is not
// here: a wrong catalogue number does not fail, it silently draws the wrong object, which is the
// worst failure this app has.

/** @type {Array<{noradId:number, name:string, why:string}>} */
export const NOTABLE = [
  { noradId: 25544, name: 'ISS (Zarya)', why: 'Seven people live here. It is the brightest thing in the sky after the Moon and Venus.' },
  { noradId: 48274, name: 'CSS (Tianhe)', why: "The core of China's space station, permanently crewed since 2021." },
  { noradId: 20580, name: 'Hubble Space Telescope', why: 'Thirty-five years of the pictures everybody has seen. Still working.' },
  { noradId: 25867, name: 'Chandra X-ray Observatory', why: 'It sees the X-rays from black holes eating. Its orbit reaches a third of the way to the Moon.' },
  { noradId: 25989, name: 'XMM-Newton', why: "Europe's X-ray telescope, and the largest satellite ESA has ever launched." },
  { noradId: 43435, name: 'TESS', why: 'It found thousands of planets around other stars by watching them dim their own suns.' },
  { noradId: 28485, name: 'Swift', why: 'It turns to point at a gamma-ray burst within a minute of one going off anywhere in the universe.' },
  { noradId: 38358, name: 'NuSTAR', why: 'Its detectors sit ten metres from its mirrors on a mast that unfolded in orbit.' },
  { noradId: 25994, name: 'Terra', why: 'Since 1999 it has taken the picture of the whole planet that most maps of vegetation are built from.' },
  { noradId: 27424, name: 'Aqua', why: 'It measures where the water is — clouds, ice, ocean temperature — twice a day, everywhere.' },
  { noradId: 28376, name: 'Aura', why: 'It watches the ozone layer, which is the one global environmental problem that got fixed.' },
  { noradId: 37849, name: 'Suomi NPP', why: 'Its night-time camera is where the famous picture of Earth’s city lights comes from.' },
  { noradId: 43013, name: 'NOAA 20 (JPSS-1)', why: 'One of the satellites your weather forecast is actually made of.' },
  { noradId: 54234, name: 'NOAA 21 (JPSS-2)', why: 'Its twin, half an orbit behind, so the planet is measured twice as often.' },
  { noradId: 39084, name: 'Landsat 8', why: 'Landsat has photographed every field and forest on Earth every two weeks since 1972.' },
  { noradId: 49260, name: 'Landsat 9', why: 'The newest of them, and the reason that record has no gap in it.' },
  { noradId: 39634, name: 'Sentinel-1A', why: 'Radar, so it sees through cloud and at night. Floods and oil spills are found with this.' },
  { noradId: 40697, name: 'Sentinel-2A', why: 'Free 10-metre pictures of the whole land surface, which is why so many maps look better than they used to.' },
  { noradId: 42063, name: 'Sentinel-2B', why: 'Its twin on the opposite side of the same orbit, halving the wait for a clear day.' },
  { noradId: 46984, name: 'Sentinel-6A', why: 'It measures sea level to within a couple of centimetres from 1 300 km up.' },
  { noradId: 41240, name: 'Jason-3', why: 'The previous link in that same 30-year sea-level record.' },
  { noradId: 43613, name: 'ICESat-2', why: 'It fires 10 000 laser pulses a second at the ice sheets and counts the photons that come back.' },
  { noradId: 43476, name: 'GRACE-FO 1', why: 'Two satellites chasing each other, weighing groundwater by how the gap between them changes.' },
  { noradId: 40376, name: 'SMAP', why: 'It measures how wet the soil is, everywhere, every three days.' },
  { noradId: 41866, name: 'GOES 16', why: 'The hurricane satellite over the Atlantic. It sits still over one spot, 35 786 km up.' },
  { noradId: 43226, name: 'GOES 17', why: 'Its Pacific counterpart, now the on-orbit spare.' },
  { noradId: 51850, name: 'GOES 18', why: 'The one watching the US west coast and the Pacific storms.' },
  { noradId: 60133, name: 'GOES 19', why: 'The newest of them, and the current Atlantic watch.' },
  { noradId: 38771, name: 'MetOp-B', why: "Europe's polar weather satellite. Its soundings do more for a 3-day forecast than any other instrument." },
  { noradId: 43689, name: 'MetOp-C', why: 'The last of that series, flying in formation with its sisters.' },
  { noradId: 37846, name: 'GSAT0101 (Galileo-PFM)', why: "The first satellite of Europe's own version of GPS. Your phone probably uses it." },
  { noradId: 32060, name: 'WorldView-1', why: 'A commercial camera sharp enough to count cars, and the reason satellite pictures are in the news.' },
  { noradId: 35946, name: 'WorldView-2', why: 'Its successor, and one of the brighter commercial satellites to spot at dusk.' },
];

/** @type {Array<{noradId:number, name:string, why:string}>} */
export const DEBRIS_NOTABLE = [
  { noradId: 27386, name: 'Envisat', why: 'Eight tonnes, dead since 2012, tumbling in one of the busiest orbits there is. Nobody can reach it to bring it down.' },
  { noradId: 694, name: 'Atlas Centaur 2', why: 'An empty rocket stage from 1963. It is still one of the easiest things to see with the naked eye.' },
  { noradId: 733, name: 'Thor Agena D rocket body', why: 'Launched in 1964 and still up there, still slowly turning end over end.' },
  { noradId: 16182, name: 'SL-16 rocket body', why: 'A nine-tonne Zenit second stage. Dozens of these are the single largest lump of mass left in low orbit.' },
  { noradId: 10967, name: 'Seasat 1', why: 'It worked for 105 days in 1978, invented ocean radar from space, and has been dead ever since.' },
  { noradId: 6153, name: 'OAO 3 (Copernicus)', why: 'An orbiting telescope switched off in 1981. It is still in the same orbit it worked in.' },
  { noradId: 3597, name: 'OAO 2', why: 'The first successful space telescope, 1968. Nothing has touched it since 1973.' },
  { noradId: 12139, name: 'SL-8 rocket body', why: 'One of hundreds of Kosmos-3M stages left in orbit through the 1970s and 80s.' },
  { noradId: 5, name: 'Vanguard 1', why: 'Launched in 1958 and the oldest human object still in orbit. Its orbit will last another 200 years.' },
];

const NOTABLE_IDS = new Set(NOTABLE.map((r) => r.noradId));
const DEBRIS_IDS = new Set(DEBRIS_NOTABLE.map((r) => r.noradId));
const NOTABLE_BY_ID = new Map(NOTABLE.concat(DEBRIS_NOTABLE).map((r) => [r.noradId, r]));

// =================================================================================================
// Selection predicates. Each one is the rule from registry/layers.yaml, in code.
// =================================================================================================

const all = (records) => records;

const inList = (ids) => (records) => records.filter((r) => ids.has(r.meta && r.meta.noradId));

const namePrefix = (prefix) => {
  const p = prefix.toUpperCase();
  return (records) => records.filter((r) => String(r.name || '').toUpperCase().startsWith(p));
};

/**
 * "Launched within N days", twice, because there is no launch date in an OMM and SATCAT is
 * 6.7 MB. Both rules are measurements, and which one is honest depends on the file:
 *
 *  A) REVOLUTION COUNT. revAtEpoch / meanMotion is the number of days the object has been going
 *     round. MEASURED on the live `last-30-days` group, 2026-09-06: it returns 8.0, 10.3 and
 *     12.1 days for objects that group says launched inside 30 days. Correct, and exact.
 *
 *  B) LAUNCH ORDER. MEASURED on the live supplemental Starlink file the same day: rule A returns
 *     0.1 days for a 2019 launch AND for a 2026 one, because SpaceX renumbers REV_AT_EPOCH in
 *     its own file. Rule A is unusable there and using it anyway put six-year-old satellites in
 *     the "fresh train" layer. What IS real in that file is the international designator, which
 *     COSPAR assigns in launch order worldwide: 2026-204 flew after 2026-200. The window is
 *     therefore counted in launches, and the rate is measured from the data itself — the highest
 *     designator number of the current year divided by the day of the year.
 */
function daysSinceLaunch(record) {
  const m = record.meta || {};
  if (!Number.isFinite(m.revAtEpoch) || !Number.isFinite(m.meanMotion) || m.meanMotion <= 0) {
    return null;
  }
  return m.revAtEpoch / m.meanMotion;
}

const launchedWithinDays = (days) => (records) =>
  records.filter((r) => {
    const d = daysSinceLaunch(r);
    return d != null && d >= 0 && d <= days;
  });

/** Fallback rate if the data cannot calibrate one. 2026 reached designator 204 by day 249. */
const LAUNCHES_PER_DAY = 0.82;

const launchedWithinDaysByOrder = (days) => (records, nowMs) => {
  let maxYear = -Infinity;
  let maxNumber = -Infinity;
  for (const r of records) {
    const m = r.meta || {};
    if (!Number.isFinite(m.launchYear) || !Number.isFinite(m.launchNumber)) continue;
    if (m.launchYear > maxYear) {
      maxYear = m.launchYear;
      maxNumber = m.launchNumber;
    } else if (m.launchYear === maxYear && m.launchNumber > maxNumber) {
      maxNumber = m.launchNumber;
    }
  }
  if (!Number.isFinite(maxNumber)) return [];

  const t = Number.isFinite(nowMs) ? nowMs : Date.now();
  const d = new Date(t);
  const dayOfYear = Math.floor((t - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY_MS) + 1;
  const rate =
    d.getUTCFullYear() === maxYear && dayOfYear > 30 ? maxNumber / dayOfYear : LAUNCHES_PER_DAY;
  const window = Math.max(1, Math.round(days * rate));

  return records.filter((r) => {
    const m = r.meta || {};
    return m.launchYear === maxYear && m.launchNumber >= maxNumber - window;
  });
};

/**
 * The geostationary ring: one revolution a sidereal day, near-circular, near the equator.
 * Straight from registry/layers.yaml — mean_motion_between [0.99, 1.01], ecc below 0.02,
 * inclination below 15 degrees. The 15 degrees is deliberate: it catches the drifting derelicts
 * that make the ring look like a ring instead of a line.
 */
const geoBand = (records) =>
  records.filter((r) => {
    const m = r.meta || {};
    return (
      Number.isFinite(m.meanMotion) &&
      m.meanMotion >= 0.99 &&
      m.meanMotion <= 1.01 &&
      Number.isFinite(m.eccentricity) &&
      m.eccentricity < 0.02 &&
      Number.isFinite(m.inclinationDeg) &&
      m.inclinationDeg < 15
    );
  });

/** Comets: perihelion inside a year either way, OR bright enough that somebody might see it. */
const cometsWorthDrawing = (records, nowMs) => {
  const t = Number.isFinite(nowMs) ? nowMs : Date.now();
  return records.filter((r) => {
    const m = r.meta || {};
    const near = Number.isFinite(m.perihelionMs) && Math.abs(m.perihelionMs - t) <= 365 * DAY_MS;
    const bright = Number.isFinite(m.absoluteMagnitude) && m.absoluteMagnitude <= 8;
    return near || bright;
  });
};

// Ranking used only when a layer overflows its budget, so the cut is deterministic and
// defensible rather than "whatever the server listed first".
const byPerigee = (a, b) => (a.meta.perigeeKm ?? 1e9) - (b.meta.perigeeKm ?? 1e9);
const byBrightest = (a, b) => (a.meta.absoluteMagnitude ?? 99) - (b.meta.absoluteMagnitude ?? 99);
const bySoonest = (a, b) => (a.meta.netMs ?? Infinity) - (b.meta.netMs ?? Infinity);

// =================================================================================================
// The layers
// =================================================================================================

/**
 * `parse` names how loadLayer turns the source payload into Records. `sample` replaces the
 * source entirely for the three things a browser cannot fetch.
 * @type {Array<Object>}
 */
// The Milky Way's one record (spec 0028 step 6): its centre, 8.15 kpc away (Reid et al. 2019) in the
// direction of Sagittarius A* (RA 266.405, Dec -28.936, J2000). A `static` record like a galaxy in
// the deep-sky layer, with the model's honesty on its face: `drawsAs: 'variant'` + `departure` make
// ui/cards.js print that the arms and bar are a model of measurements, not a photograph.
const KPC_KM_MW = 30856775814913670; // one kiloparsec, not one parsec
const LY_KM_MW = 9460730472580.8;
function milkyWayRecords() {
  const raDeg = 266.405, decDeg = -28.936, distKpc = 8.15;
  const ra = raDeg * (Math.PI / 180), dec = decDeg * (Math.PI / 180);
  const r = distKpc * KPC_KM_MW;
  const ex = Math.cos(dec) * Math.cos(ra), ey = Math.cos(dec) * Math.sin(ra), ez = Math.sin(dec);
  const e = 23.4392911 * (Math.PI / 180);
  const pos = { x: ex * r, y: (ey * Math.cos(e) + ez * Math.sin(e)) * r, z: (-ey * Math.sin(e) + ez * Math.cos(e)) * r };
  return [{
    id: 'dso-milky-way',
    name: 'The Milky Way',
    klass: 'dso',
    layer: 'galaxy',
    propagator: 'static',
    frame: 'sun-inertial',
    pos,
    cls: 'measured',
    meta: {
      home: true,
      cite: 'Centre distance: Reid et al. 2019 (R0 = 8.15 kpc); disc size: Wikipedia, Milky Way',
      kind: 'galaxy',
      typeText: 'Barred spiral galaxy — the one we live in',
      hubble: 'SBbc',
      con: 'Sagittarius',
      distLy: Math.round(distKpc * KPC_KM_MW / LY_KM_MW),
      sizeLy: 87400,
      aliases: ['Milky Way', 'our galaxy', 'the Galaxy', 'galactic centre', 'galactic center'],
      why: 'Everything else on this map is inside it. The Sun sits 26 600 light-years from its centre, a little more than halfway out.',
      drawsAs: 'variant',
      drawnName: 'a point-cloud model of the Milky Way',
      departure: 'the disc, bar and arms follow published measurements (Reid et al. 2019 for the arms and the distance to the centre); nobody has seen our galaxy from outside, so the picture is an illustration and the stars around you are the measured part',
      distanceSource: 'Reid et al. 2019, ApJ 885:131 (R0 = 8.15 kpc)',
    },
  }];
}

// Black holes and other extremes (spec 0028 step 7): the mirror of registry/exotics.yaml as static
// records on the sun-inertial axes -- the same sky -> ecliptic rotation the stars and planets use.
function exoticRecords() {
  const LY = 9460730472580.8;
  const e = 23.4392911 * (Math.PI / 180);
  return EXOTICS.map((x) => {
    const ra = x.raDeg * (Math.PI / 180), dec = x.decDeg * (Math.PI / 180), r = x.distLy * LY;
    const ex = Math.cos(dec) * Math.cos(ra), ey = Math.cos(dec) * Math.sin(ra), ez = Math.sin(dec);
    return {
      id: `exotic-${x.id}`,
      name: x.name,
      klass: 'exotic',
      layer: 'exotics',
      propagator: 'static',
      frame: 'sun-inertial',
      pos: { x: ex * r, y: (ey * Math.cos(e) + ez * Math.sin(e)) * r, z: (-ey * Math.sin(e) + ez * Math.cos(e)) * r },
      cls: 'measured',
      meta: {
        kind: x.kind,
        distLy: x.distLy,
        distLyLow: x.distLyLow ?? null,
        distLyHigh: x.distLyHigh ?? null,
        distanceNote: x.distance_note || null,
        massMsun: x.massMsun ?? null,
        massMsunLow: x.massMsunLow ?? null,
        massMsunHigh: x.massMsunHigh ?? null,
        periodS: x.periodS ?? null,
        why: x.why,
        source: x.source,
        cite: x.source,
        aliases: Array.isArray(x.aliases) ? x.aliases.slice() : [],
      },
    };
  });
}

export const LAYERS = [
  {
    // The worlds as a layer (spec 0028 step 0). Mirrors registry/layers.yaml `worlds`. No glyph
    // layer is created for it (`draw: 'worlds'`): scene/worlds.js already draws the discs, so the
    // meshes are the marks. `sample` is the contract's "records that live in this repository"
    // path; `noModel` keeps heroes.js from drawing a satellite bus over Mars when Mars is selected.
    id: 'worlds',
    display: 'Planets and moons',
    klass: 'world',
    source: 'bundled',
    parse: null,
    propagator: 'body',
    frame: 'sun-inertial',
    moments: { wonder: true, now: true, next: true },
    defaultOn: true,
    draw: 'worlds',
    noModel: true,
    sample: () => worldRecords(),
    select: all,
    budget: { maxItems: 20 },
    colour: C.world,
    glyph: 'planet',
    nearKm: 0,
    card: 'world',
    priority: 1,
    sentence: 'The Sun, the Moon and the planets, where they really are in the sky right now.',
  },
  {
    // Stars in three dimensions (spec 0028 step 3). Mirrors registry/layers.yaml `stars`. Drawn by
    // scene/stars3d.js (`draw: 'stars3d'`) as one Points cloud, never as glyphs: 109 389 of them.
    // The RECORDS of this layer are only the ~3 400 named stars -- search, a tap and the card need
    // a name -- so `count` is the layer's own number, not the record count. `noModel`: a star is
    // a point of light, and heroes.js must never hang a satellite bus on Sirius.
    id: 'stars',
    display: 'Stars',
    klass: 'star',
    source: 'bundled',
    parse: null,
    propagator: 'static',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    draw: 'stars3d',
    noModel: true,
    sample: () => [],
    select: all,
    budget: { maxItems: 200000 },
    colour: C.star,
    glyph: 'star',
    nearKm: 0,
    card: 'star',
    priority: 60,
    sentence: 'Every star with a measured distance, where it really is. From here they are the sky; from a light-year out they are places.',
  },
  {
    // Planets around other stars (spec 0028 step 4). Mirrors registry/layers.yaml `exoplanets`.
    // Snapshot of the NASA Exoplanet Archive first; the dated copy in site/data/exoplanets.csv
    // when there is none (`bundledText`), and every record then carries `asOf`. Each planet is a
    // `static` record AT ITS STAR: the orbit is sub-pixel at any zoom we draw, and the card says
    // so. Plain glyphs (klass exoplanet, atlas cell 11); from a world stage they are past the far
    // plane and simply not there, which is the truth of it -- select one and you are taken to the
    // stellar rung, where they are.
    id: 'exoplanets',
    ladderOnly: true, // drawn from the ladder's rungs only: from a world stage the true positions are past the far plane
    display: 'Planets around other stars',
    klass: 'exoplanet',
    source: 'nasa-exoplanet-archive',
    parse: 'exoplanets',
    sample: () => [],
    bundledText: 'data/exoplanets.csv',
    bundledAsOf: '2026-09-08',
    propagator: 'static',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    noModel: true,
    select: all,
    budget: { maxItems: 8000 },
    colour: C.exoplanet,
    glyph: 'exoplanet',
    nearKm: 0,
    card: 'exoplanet',
    priority: 61,
    sentence: 'Every confirmed planet around another star, drawn at its star.',
  },
  {
    // Deep-sky objects with a sourced distance (spec 0028 step 5). Mirrors registry/layers.yaml
    // `deep-sky`. OpenNGC has positions for 13 372 objects and no distances, so this layer holds
    // only what a source placed: the 110 Messier objects (Wikipedia's distance table) and the hand
    // rows in registry/dso-hand.yaml (the LMC). One class `dso`, the type on the card. Bundled JSON
    // through the same `bundledText` path exoplanets use; nothing to harvest.
    id: 'deep-sky',
    ladderOnly: true, // drawn from the ladder's rungs only: from a world stage the true positions are past the far plane
    display: 'Nebulae, clusters and galaxies',
    klass: 'dso',
    source: 'bundled',
    parse: 'dso',
    sample: () => [],
    bundledText: 'data/dso.json',
    propagator: 'static',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    noModel: true,
    select: all,
    budget: { maxItems: 2000 },
    colour: C.dso,
    glyph: 'dso',
    nearKm: 0,
    card: 'dso',
    priority: 62,
    sentence: 'The Messier objects and the Magellanic Clouds, at their measured distances. The rest of the sky\'s deep-sky catalogue has no distances written down, so it is not drawn as places.',
  },
  {
    // The Milky Way as a place (spec 0028 step 6). Mirrors registry/layers.yaml `galaxy`. One record --
    // our galaxy, keyed to its centre 26 600 ly away, klass dso -- and one point cloud drawn by
    // scene/galaxy.js (`draw: 'galaxy'`) from published measurements. The cloud is an ILLUSTRATION
    // (registry/models.yaml galaxy-model); the record's drawing line and the card say so in words.
    id: 'galaxy',
    display: 'The Milky Way',
    klass: 'dso',
    source: 'bundled',
    parse: null,
    propagator: 'static',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    draw: 'galaxy',
    noModel: true,
    sample: () => milkyWayRecords(),
    select: all,
    budget: { maxItems: 4 },
    colour: C.dso,
    glyph: 'dso',
    nearKm: 0,
    card: 'dso',
    priority: 63,
    sentence: 'Our own galaxy, drawn as a model of its published measurements. The shape is an illustration; the stars around you are measured.',
  },
  {
    // Black holes and other extremes (spec 0028 step 7). Mirrors registry/layers.yaml `exotics`;
    // the records come from registry/exotics.yaml through its generated mirror. Plain glyphs, one
    // class, the kind on the card. `bundled`: the fact sheets are this repository's.
    id: 'exotics',
    ladderOnly: true, // drawn from the ladder's rungs only: from a world stage the true positions are past the far plane
    display: 'Black holes and other extremes',
    klass: 'exotic',
    source: 'bundled',
    parse: null,
    propagator: 'static',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    noModel: true,
    sample: () => exoticRecords(),
    select: all,
    budget: { maxItems: 200 },
    colour: C.exotic,
    glyph: 'exotic',
    nearKm: 0,
    card: 'exotic',
    priority: 64,
    sentence: 'Black holes and pulsars with a fact sheet each, and the page every number came from.',
  },
  {
    id: 'stations',
    display: 'Crewed stations',
    klass: 'station',
    source: 'celestrak-stations',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: true, now: true, next: false },
    defaultOn: true,
    select: all,
    budget: { maxItems: 20 },
    colour: C.station,
    glyph: 'station',
    nearKm: 20000,
    card: 'station',
    sentence: 'People are living in these right now.',
  },
  {
    // NOT in registry/layers.yaml. Added because celestrak-visual is 65 kB for the 157 objects
    // a beginner can actually see with their eyes — the calm default the brief asks for, at a
    // fortieth of the weight of `notable`, which needs the 6.9 MB `active` file.
    id: 'visual',
    display: 'Bright enough to see',
    klass: 'satellite',
    source: 'celestrak-visual',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: true, now: true, next: false },
    defaultOn: true,
    select: all,
    budget: { maxItems: 200, rank: byPerigee },
    colour: C.satellite,
    glyph: 'satellite',
    nearKm: 8000,
    card: 'satellite',
    sentence: 'Every one of these is bright enough to see from a dark enough place.',
  },
  {
    id: 'notable',
    display: 'Satellites worth knowing',
    klass: 'satellite',
    source: 'celestrak-active',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: true, now: true, next: false },
    defaultOn: true,
    select: inList(NOTABLE_IDS),
    budget: { maxItems: 80 },
    colour: C.satellite,
    glyph: 'satellite',
    nearKm: 8000,
    card: 'satellite',
    heavy: true, // needs the 6.9 MB active file; the integrator may want it behind a tap
    sentence: 'A hand-picked few, each with a reason it is here.',
  },
  {
    id: 'starlink-trains',
    display: 'Fresh Starlink trains',
    klass: 'satellite',
    source: 'celestrak-starlink',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: true, now: true, next: true },
    defaultOn: true,
    // A train is one card with N members, not N cards: it is what a beginner sees in the sky.
    groupBy: (r) => (r.meta && r.meta.launchDesignator) || null,
    // Rule B: the supplemental file's revolution counts are renumbered by the operator and
    // cannot say how old an object is. Launch order can. See launchedWithinDaysByOrder above.
    select: (records, nowMs) => launchedWithinDaysByOrder(10)(namePrefix('STARLINK')(records), nowMs),
    budget: { maxItems: 400, rank: byPerigee },
    colour: C.satellite,
    glyph: 'train',
    nearKm: 4000,
    card: 'satellite',
    heavy: true, // 5.1 MB
    sentence: 'A string of them, days old, still flying in the line they were dropped in.',
  },
  {
    id: 'just-launched',
    display: 'Launched in the last two weeks',
    klass: 'satellite',
    // registry/layers.yaml says celestrak-active. `last-30-days` is 112 kB against 6.9 MB and
    // is the same rule expressed by the publisher, so this row uses it instead.
    source: 'celestrak-last30',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: true, now: true, next: false },
    defaultOn: true,
    select: launchedWithinDays(14),
    budget: { maxItems: 200, rank: byPerigee },
    colour: C.rocket,
    glyph: 'just-launched',
    nearKm: 4000,
    card: 'satellite',
    sentence: 'That dot launched this fortnight.',
  },
  {
    id: 'active',
    display: 'Everything active',
    klass: 'satellite',
    source: 'celestrak-active',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: false, now: false, next: false },
    defaultOn: false,
    select: all,
    // registry/layers.yaml says 15 000. MEASURED on 2026-09-06 the group is 16 511, and a
    // 15 000 cap ranked by perigee silently deleted everything above 1 176 km — the whole of
    // MEO and the geostationary ring — from a layer called "everything active". The cap is
    // headroom against a runaway, not a curation, so it sits above the real number and the
    // ranking only decides what goes first if it ever does bite.
    budget: { maxItems: 20000, rank: byPerigee },
    colour: C.satellite,
    glyph: 'satellite',
    nearKm: 0,
    card: 'satellite',
    heavy: true,
    sentence: 'Everything in Earth orbit that is still working.',
  },
  {
    id: 'geo-ring',
    display: 'The geostationary ring',
    klass: 'satellite',
    source: 'celestrak-active',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: false, now: false, next: false },
    defaultOn: false,
    select: geoBand,
    budget: { maxItems: 900 },
    colour: C.satellite,
    opacity: 0.5,
    glyph: 'satellite',
    nearKm: 0,
    card: 'satellite',
    heavy: true,
    sentence: 'A ring of television and weather satellites, 35 786 km up, each one holding still over a spot on the equator.',
  },
  {
    id: 'debris-notable',
    display: 'Famous debris',
    klass: 'debris',
    // registry says celestrak-active; measured, none of these are in it — `active` is working
    // payloads and every one of these is dead. They ARE in `visual`, which is also 65 kB.
    source: 'celestrak-visual',
    parse: 'gp',
    propagator: 'sgp4',
    frame: 'earth-inertial',
    moments: { wonder: false, now: false, next: false },
    defaultOn: false,
    select: inList(DEBRIS_IDS),
    budget: { maxItems: 40 },
    colour: C.debris,
    opacity: 0.5,
    drawUnder: true,
    glyph: 'debris',
    nearKm: 4000,
    card: 'debris',
    sentence: 'Dead things with stories, still going round.',
  },
  {
    id: 'launches',
    display: 'Rockets on their way up',
    klass: 'rocket',
    source: 'll2-upcoming',
    parse: 'launches',
    propagator: 'ascent',
    frame: 'earth-fixed',
    moments: { wonder: true, now: true, next: true },
    defaultOn: true,
    select: all,
    budget: { maxItems: 30, rank: bySoonest },
    colour: C.rocket,
    glyph: 'rocket',
    nearKm: 2000,
    card: 'launch',
    dashed: true, // always: the climb is illustrative, never measured
    sentence: 'The next ones off the ground.',
  },
  {
    id: 'ground-sites',
    display: 'Pads, dishes and observatories',
    klass: 'site',
    source: 'll2-upcoming',
    parse: 'pads',
    propagator: 'fixed',
    frame: 'earth-fixed',
    moments: { wonder: true, now: true, next: true },
    defaultOn: true,
    select: all,
    budget: { maxItems: 400 },
    colour: C.site,
    glyph: 'site',
    nearKm: 800,
    card: 'site',
    sentence: 'The places things leave from.',
  },
  {
    id: 'hand-kept-sites',
    display: 'Dishes, landers and rovers',
    klass: 'site',
    // No source: nothing serves these as an API. The Deep Space Network's antennas, the Apollo
    // landing sites and the rovers on Mars are published coordinates that do not change, kept in
    // registry/sites.yaml and ported to data/sample.js for the browser.
    source: null,
    sample: handKeptSites,
    propagator: 'fixed',
    frame: 'earth-fixed',
    moments: { wonder: true, now: true, next: false },
    defaultOn: true,
    select: all,
    budget: { maxItems: 40 },
    colour: C.site,
    glyph: 'site',
    nearKm: 900,
    card: 'site',
    priority: 30,
  },
  {
    // registry/layers.yaml carries the reviewable copy of this row. It sits immediately after
    // hand-kept-sites and before comets because these two are siblings -- things people put
    // places -- and a beginner's first scan should find the space station and their second the
    // golf balls.
    id: 'oddities',
    display: 'Odd things we sent',
    klass: 'oddity',
    // No source: these are checked into this repository, which is what `source: bundled` says in
    // the registry copy. Not `sample`: they are not standing in for a feed, they are the thing.
    source: null,
    sample: sampleOddities,
    // Per RECORD, not per layer: a heliocentric car is `kepler`, a lunar photograph is `fixed` in
    // moon-fixed, a museum case is `fixed` in earth-fixed, and one row has no propagator at all.
    // These two fields are what the app falls back to and neither is ever reached, because every
    // record here declares its own.
    propagator: 'fixed',
    frame: 'earth-fixed',
    moments: { wonder: true, now: false, next: false },
    defaultOn: true,
    select: all,
    budget: { maxItems: 60 },
    colour: C.probe,
    glyph: 'oddity',
    // GEOMETRY. `noModel` and its `nearKm: 0` are gone together: scene/models.js now has an
    // ODDITY_BUILDERS row per `shape.build` value registry/oddities.yaml allows, so modelFor()
    // no longer falls back to a comms satellite and tapping the golf balls no longer puts a
    // satellite bus on the Moon. The record carries the builder's name in `meta.modelVariant`.
    //
    // ONE nearKm across three frames -- a lunar surface, a museum in Texas and a heliocentric
    // orbit -- so it is set for the case a visitor flies to. The Roadster and the museum piece
    // are drawn because they were SELECTED, which heroes.js honours at any distance.
    nearKm: 4000,
    card: 'oddity',
    // Nothing to fetch, so it is nearly free and should be on screen early.
    priority: 25,
    sentence: 'Things people sent off the planet that were never part of the mission.',
  },
  {
    id: 'comets',
    display: 'Comets',
    klass: 'comet',
    source: 'mpc-comets',
    parse: 'comets',
    propagator: 'kepler',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: true },
    defaultOn: false,
    select: cometsWorthDrawing,
    budget: { maxItems: 60, rank: byBrightest },
    colour: C.comet,
    glyph: 'comet',
    nearKm: 2000000,
    card: 'comet',
    sentence: 'Ice falling towards the Sun, and growing a tail on the way in.',
  },
  {
    id: 'asteroids',
    display: 'Asteroids passing by',
    klass: 'asteroid',
    source: 'jpl-sbdb-neo',
    // "Passing by" is JPL's close-approach table; the orbits come from the SBDB. Both snapshots
    // are needed, in this order, and the stand-in appears only if either is missing.
    sources: ['jpl-cad', 'jpl-sbdb-neo'],
    parse: 'neo-approaches',
    sample: sampleAsteroids,
    propagator: 'kepler',
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: true },
    defaultOn: false,
    select: all,
    budget: { maxItems: 300 },
    colour: C.asteroid,
    glyph: 'asteroid',
    nearKm: 500000,
    card: 'asteroid',
    sentence: 'Rocks on their own orbits round the Sun, a few of which come close.',
  },
  {
    id: 'deep-space',
    display: 'Probes and telescopes',
    klass: 'probe',
    source: 'horizons-deep-space',
    parse: 'horizons-vectors',
    sample: sampleDeepSpace,
    propagator: 'kepler', // records also carry `sampled`; the propagator is per record
    frame: 'sun-inertial',
    moments: { wonder: true, now: false, next: false },
    defaultOn: false,
    select: all,
    budget: { maxItems: 40 },
    colour: C.probe,
    glyph: 'probe',
    nearKm: 1000000,
    card: 'probe',
    sentence: 'The handful of things that left Earth orbit and kept going.',
  },
  {
    // NOT in registry/layers.yaml. Added because sampleReentries() exists and a reentry is one
    // of the three things spec 0011 promises. Off by default: these are historic, not news.
    id: 'reentries',
    display: 'Things that came down',
    klass: 'debris',
    source: 'space-track-tip',
    sample: sampleReentries,
    propagator: 'fixed',
    frame: 'earth-fixed',
    moments: { wonder: false, now: false, next: true },
    defaultOn: false,
    select: all,
    budget: { maxItems: 10 },
    colour: C.debris,
    glyph: 'debris',
    nearKm: 2000,
    card: 'debris',
    sentence: 'Where some big ones ended up.',
  },
];

const BY_ID = new Map(LAYERS.map((l) => [l.id, l]));

/** @param {string} id */
// The registry's half of every row (spec 0026 req 8). `enabled`, `display` and `moments` are the
// registry's to decide, so they overwrite what is written above; a row here with no registry row,
// or the other way round, is a drift the test refuses. A layer the registry switches off is marked
// `enabled: false` and `forcedOff`, and main.js neither creates nor loads it.
const REGISTRY_BY_ID = new Map(LAYER_ROWS.map((r) => [r.id, r]));
for (const layer of LAYERS) {
  const row = REGISTRY_BY_ID.get(layer.id);
  if (!row) continue;
  layer.enabled = row.enabled !== false;
  if (!layer.enabled) layer.forcedOff = true;
  if (row.display) layer.display = row.display;
  if (row.moments && Object.keys(row.moments).length) layer.moments = { ...layer.moments, ...row.moments };
  if (row.train) layer.train = row.train;
}

/** Layer ids on exactly one side of the registry/browser mirror -- what the test refuses. */
export function registryDrift() {
  const js = new Set(LAYERS.map((l) => l.id));
  const reg = new Set(LAYER_ROWS.map((r) => r.id));
  return { onlyInBrowser: [...js].filter((id) => !reg.has(id)), onlyInRegistry: [...reg].filter((id) => !js.has(id)) };
}

export function layerById(id) {
  return BY_ID.get(id) || null;
}

/**
 * @param {'wonder'|'now'|'next'} moment
 * @returns {Array<Object>} the layers that are on by default in that moment
 */
export function enabledLayers(moment) {
  return LAYERS.filter((l) => l.enabled !== false && l.moments && l.moments[moment] === true);
}

/**
 * Records for one layer: fetch (or reach for the bundled stand-in), parse, select, cap.
 * Never throws and never rejects. A layer whose source is unreachable returns [] and the status
 * panel says why — the map goes thin, it does not go dark.
 * @param {Object} layer
 * @param {number} [nowMs] the app clock, for the rules that ask about time (comets)
 * @returns {Promise<Array<Object>>}
 */
export async function loadLayer(layer, nowMs) {
  const { records } = await loadLayerDetailed(layer, nowMs);
  return records;
}

/**
 * Not in the module contract. Same work as loadLayer, but hands back the source result too, so the
 * control's count can say "80 of them, from a copy four hours old" instead of just a number.
 * @returns {Promise<{records: Array<Object>, source: Object|null, error: string|null}>}
 */
export async function loadLayerDetailed(layer, nowMs) {
  const empty = { records: [], source: null, error: null };
  if (!layer) return { ...empty, error: 'No layer given.' };

  let parsed = [];
  let result = null;

  try {
    // `bundled` is the registry's reserved literal for records that live in this repository; it is
    // not a source to fetch, so it is not an id here and the bundledText path below is what runs.
    const ids = (Array.isArray(layer.sources) ? layer.sources : layer.source ? [layer.source] : []).filter((id) => id !== 'bundled');
    if (typeof layer.sample === 'function') {
      // A source a browser cannot call. The harvester (spec 0003 amendment 1 §4) writes it to
      // /data/v1/ and load() reads that snapshot -- for a `browser: false` row it never goes
      // upstream -- so: the real body first, through the layer's parser, and the bundled
      // stand-in (cls 'sample', every card saying so) ONLY when a snapshot is missing. A layer
      // with no parser yet (reentries: Space-Track needs a login nobody has registered) is the
      // stand-in always, as before.
      let bodies = null;
      if (layer.parse && ids.length) {
        const results = await Promise.all(ids.map((id) => load(id)));
        result = results[0];
        if (results.every((r) => r && r.data != null)) bodies = results.map((r) => r.data);
      }
      if (!bodies && layer.bundledText && (layer.parse)) {
        // A dated copy checked into the repository (spec 0028 step 4): the same columns the
        // snapshot carries, so the same parser reads it, and every record says "as of <date>".
        // Same origin, so it is a plain fetch; a failure falls through to the stand-in.
        try {
          const r = await fetch(layer.bundledText);
          if (r.ok) {
            const text = await r.text();
            layer.lastBodyWasBundled = true;
            parsed = parseFor(layer, text);
            result = { id: 'bundled', data: text, error: null, bundled: true, fetchedAt: layer.bundledAsOf ? Date.parse(layer.bundledAsOf) : null };
          }
        } catch { /* the stand-in below */ }
      }
      if (!parsed.length) {
        layer.lastBodyWasBundled = false;
        parsed = bodies ? parseFor(layer, bodies.length === 1 ? bodies[0] : bodies) : layer.sample();
      }
    } else {
      result = await load(layer.source);
      if (result.data == null) {
        return { records: [], source: result, error: result.error };
      }
      parsed = parseFor(layer, result.data);
    }
  } catch (e) {
    return { records: [], source: result, error: String((e && e.message) || e) };
  }

  let selected;
  try {
    selected = layer.select ? layer.select(parsed, nowMs) : parsed;
  } catch {
    selected = parsed;
  }
  if (!Array.isArray(selected)) selected = [];

  const max = (layer.budget && layer.budget.maxItems) || Infinity;
  if (selected.length > max) {
    const rank = layer.budget && layer.budget.rank;
    if (typeof rank === 'function') selected = selected.slice().sort(rank);
    selected = selected.slice(0, max);
  }

  // Stamp the layer on, and attach the list's reason where there is one.
  for (const r of selected) {
    r.layer = layer.id;
    const row = r.meta && NOTABLE_BY_ID.get(r.meta.noradId);
    if (row && r.meta && !r.meta.why) r.meta.why = row.why;
  }

  return { records: selected, source: result, error: result ? result.error : null };
}

function parseFor(layer, data) {
  switch (layer.parse) {
    case 'gp':
      return parseCelestrakGP(data, {
        layer: layer.id,
        source: layer.source,
        klass: layer.forceKlass,
      });
    case 'launches':
      return parseLaunches(data).launches;
    case 'pads':
      return parseLaunches(data).pads;
    case 'comets':
      return parseComets(data);
    case 'horizons-vectors':
      // The stand-in records are the metadata base: names, ids the trips and models refer to,
      // and the Horizons id each one carries. Only positions change.
      return parseHorizonsVectors(data, typeof layer.sample === 'function' ? layer.sample() : []);
    case 'dso':
      return parseDso(typeof data === 'string' ? JSON.parse(data) : data);
    case 'exoplanets':
      return parseExoplanets(data, { asOf: layer.bundledAsOf && layer.lastBodyWasBundled ? layer.bundledAsOf : undefined });
    case 'neo-approaches':
      // Two snapshots: the close-approach table says WHICH bodies, the SBDB says their orbits.
      return Array.isArray(data) ? parseNeoApproaches(data[0], data[1]) : [];
    default:
      return [];
  }
}
