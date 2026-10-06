// scripts/object_pages.mjs -- which objects get a static page, and what each page says, as JSON.
//
//   node scripts/object_pages.mjs            prints {pages: [...]} on stdout
//
// The Node half of scripts/build_seo.py (spec 0059, spec 0061 task 9). The card's words are
// JavaScript: ui/cards.js builds every sentence from the record and copy/en.js, so a page that is to
// say what the card says has to run the card's own functions. This file does that and nothing else;
// the Python half fills templates/object.html at deploy time. Nothing it prints is kept in git.
//
// NO LIVE NUMBER. The card is called with a clock that throws, which is the card's own path for "no
// position" (ui/cards.js measure() returns before propagating), so the first sentence carries no
// clause that depends on the moment: no height, no distance from Earth today, no "rising at 21:14".
// A static page that printed a position would be wrong a second after it was generated.
//
// THE SELECTION IS A RULE, not a hand list (spec 0059 requirement 1). Every record in a hand-kept
// list that the app bundles, plus the worlds and the famous deep-sky objects:
//   - the worlds: the Sun, the planets, Pluto and the moons the app draws;
//   - the famous stars (registry/stars-notable.yaml) and the hosts of the star systems;
//   - the black holes and other extremes (registry/exotics.yaml);
//   - the deep-sky objects a person can find in the sky and searches by name: the Messier objects with
//     a common name down to magnitude 8, the hand-kept rows (registry/dso-hand.yaml) down to
//     magnitude 6, and the Milky Way;
//   - the craft beyond Earth, the dwarf planets and interstellar visitors, the named asteroids;
//   - the oddities, and the landing sites on the Moon and Mars (not the Deep Space Network dishes,
//     whose card line is one clause long: a page with no words of its own is spam, spec 0059);
//   - the stations and the satellites worth knowing (data/layers.js NOTABLE).
// About 250 in all, spec 0059's "about 200" plus the landing sites.
// One page per name: when two records share a name, the first group below keeps it.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const L = await import(join(JS, 'data/layers.js'));
const P = await import(join(JS, 'data/parsers.js'));
const C = await import(join(JS, 'ui/cards.js'));
const SRC = await import(join(JS, 'data/sources.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const { COPY, fmt } = await import(join(JS, 'copy/en.js'));
const { SYSTEMS } = await import(join(JS, 'data/systems.js'));
const { WIKI_TITLES } = await import(join(JS, 'data/wikititles.js'));

// The card's path for "no position": measure() catches the throw and returns its empty readings.
const CTX = { clock: { now() { throw new Error('a static page has no clock'); } }, layers: L.LAYERS, sources: SRC };
const EMPTY = (r) => ({
  ok: false, tMs: null, posKm: null, frame: r.frame, cls: r.cls, altKm: null, speedKmh: null,
  latDeg: null, lonDeg: null, worldId: null, distEarthKm: null, distSunKm: null, lightMinutes: null,
  rangeKm: null, observerName: null, observerGuess: false,
});

const layer = (id) => L.LAYERS.find((l) => l.id === id);
const sample = (id) => layer(id).sample();
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

// --- the groups, in the order a name is claimed ------------------------------------------------

// Lines from data/layers.js NOTABLE that are true today and will not stay true, or are already
// out of date. The card never prints a satellite's `why` for this reason ("a count that changes
// with every crew", ui/cards.js WHY_KLASSES); a page that does must leave these out until the rows
// are fixed at their source. Each entry says why.
const DATED_WHY = new Map([
  [25544, 'a crew count, which changes with every crew'],
  [20580, 'an age in years ("Thirty-five years"), which is one more every April'],
  [41866, 'GOES 16 handed the Atlantic watch to GOES 19 in April 2025'],
]);

function satelliteRecords() {
  const out = [];
  const stations = new Set([25544, 48274]);
  for (const row of L.NOTABLE) {
    const station = stations.has(row.noradId);
    out.push({
      id: `sat-${row.noradId}`, name: row.name, klass: station ? 'station' : 'satellite',
      layer: station ? 'stations' : 'notable', source: station ? 'celestrak-stations' : 'celestrak-notable',
      cls: 'inferred', frame: 'earth-inertial',
      meta: { noradId: row.noradId, why: row.why, listName: row.name },
    });
  }
  return out;
}

function candidates() {
  const worlds = sample('worlds');
  const stars = recordsFromNames(readJson('site/data/stars3d.names.json').rows).filter((r) => r.meta.why);
  const hosts = sample('systems');
  const dso = P.parseDso(readJson('site/data/dso.json'))
    .filter((r) => (r.meta.messier == null ? r.meta.mag != null && r.meta.mag <= 6 : r.name && !/^M\d+$/.test(r.name) && r.meta.mag != null && r.meta.mag <= 8));
  const sites = sample('hand-kept-sites').filter((r) => r.meta && (r.meta.world === 'moon' || r.meta.world === 'mars'));
  return [
    ...worlds.map((r) => ['worlds', r]),
    ...sample('deep-space').map((r) => ['craft', r]),
    ...satelliteRecords().map((r) => ['satellites', r]),
    ...sites.map((r) => ['sites', r]),
    ...sample('far-bodies').map((r) => ['small', r]),
    ...sample('asteroids').map((r) => ['small', r]),
    ...sample('oddities').map((r) => ['oddities', r]),
    ...stars.map((r) => ['stars', r]),
    ...hosts.map((r) => ['stars', r]),
    ...sample('exotics').map((r) => ['exotics', r]),
    ...sample('galaxy').map((r) => ['deep-sky', r]),
    ...dso.map((r) => ['deep-sky', r]),
  ];
}

// --- words -------------------------------------------------------------------------------------

const SITE = 'Space Radar';
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

// A place does not move; everything else does, and its page answers "where is it now" with the link.
const FIXED = new Set(['star', 'dso', 'exotic', 'site']);

function slugOf(name) {
  const s = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[ʻ'’]/g, '').replace(/\*/g, '-star').replace(/\+/g, '-plus-')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/^the-/, '');
  return s || 'object';
}

function titleFor(name, klass, recordId) {
  const fixed = FIXED.has(klass) || recordId === 'sun';
  const tails = [fixed ? ': see it in 3D' : ': where it is now', ''];
  for (const tail of tails) {
    const t = `${name}${tail} | ${SITE}`;
    if (t.length <= TITLE_MAX) return t;
  }
  return `${name.slice(0, TITLE_MAX - SITE.length - 4).trimEnd()}… | ${SITE}`;
}

/** Cut at the last sentence end inside `max`, else at a word with an ellipsis. */
function cut(text, max) {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const end = Math.max(head.lastIndexOf('. '), head.endsWith('.') ? head.length - 1 : -1);
  if (end >= DESC_MIN) return head.slice(0, end + 1);
  const space = head.lastIndexOf(' ', max - 2);
  return head.slice(0, space > 0 ? space : max - 1).replace(/[,;:—–-]+$/, '').trimEnd() + '…';
}

// What the page says beside "See it live": where a moving thing is NOW, or where a fixed one IS.
const LIVE_MOVING = 'Where it is right now is on the live 3D map.';
const LIVE_FIXED = 'It is on the live 3D map, where it really is.';
const liveLineFor = (klass, id) => (FIXED.has(klass) || id === 'sun' ? LIVE_FIXED : LIVE_MOVING);

/**
 * The meta description: the card's first sentence, and when that is too short for a result, the
 * why line, or its first sentence, or failing both the line about the live map. Whole sentences
 * where they fit; a cut with an ellipsis only as the last resort.
 */
function descriptionFor(lead, why, live) {
  if (lead.length >= DESC_MIN) return cut(lead, DESC_MAX);
  const first = why ? (why.match(/^.*?[.!?](?=\s|$)/) || [why])[0] : null;
  for (const tail of [why, first, live]) {
    if (!tail) continue;
    const d = `${lead} ${tail}`;
    if (d.length >= DESC_MIN && d.length <= DESC_MAX) return d;
  }
  return cut(`${lead} ${why || live}`, DESC_MAX);
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** Two significant figures: a size worked out from an angle and a distance is not good to more. */
const sig2 = (v) => { const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.abs(v))) - 1)); return Math.round(v / p) * p; };
const ly = (v) => `${v >= 100 ? fmt.int(v) : fmt.num(v, v >= 10 ? 1 : 2)} light-years`;

/** Facts that do not go stale, from the record the card reads. [label, value, linkSlugOrNull]. */
function factsFor(r, klass, nameOf) {
  const md = r.meta || {};
  const f = [];
  const add = (label, value, link = null) => { if (value != null && value !== '') f.push([label, String(value), link]); };
  if (klass === 'world') {
    if (md.radiusKm) add('Diameter', `${fmt.int(2 * md.radiusKm)} km`);
    if (md.parent && md.parent !== 'sun') add('Goes round', nameOf(md.parent), md.parent);
    else if (r.id !== 'sun') add('Goes round', nameOf('sun'), 'sun');
  } else if (klass === 'star') {
    if (md.distLy) add('Distance', ly(md.distLy));
    if (Number.isFinite(md.mag)) add('Brightness from Earth', `magnitude ${fmt.num(md.mag, 2)}`);
    if (md.spect) add('Spectral type', String(md.spect).replace(/\.+$/, ''));
    if (md.teffK) add('Surface temperature', `${fmt.int(md.teffK)} K`);
    if (md.planets) add('Planets known', md.planets);
    if (md.hip) add('Catalogue', `HIP ${md.hip}`);
  } else if (klass === 'dso') {
    if (md.typeText) add('Type', md.typeText);
    if (md.con) add('Constellation', md.con);
    if (md.distLyLow && md.distLyHigh) add('Distance', `${ly(md.distLyLow).replace(' light-years', '')} to ${ly(md.distLyHigh)}`);
    else if (md.distLy) add('Distance', ly(md.distLy));
    if (md.sizeLy) add('Size', `about ${ly(sig2(md.sizeLy))} across`);
    if (Number.isFinite(md.mag)) add('Brightness from Earth', `magnitude ${fmt.num(md.mag, 1)}`);
    const cat = [md.messier != null ? `M${md.messier}` : null, md.designation].filter(Boolean).join(', ');
    add('Catalogue', cat);
  } else if (klass === 'exotic') {
    const kind = md.kind && COPY.templates.exotic.kinds[md.kind];
    if (kind) add('Kind', cap(kind));
    if (md.distLy) add('Distance', ly(md.distLy));
    if (md.massMsun) add('Mass', md.massMsun >= 1e6 ? `${fmt.num(md.massMsun / 1e6, md.massMsun >= 1e9 ? 0 : 2)} million Suns` : `${fmt.num(md.massMsun, 2)} Suns`);
    if (md.periodS) add('Turns once every', md.periodS >= 1 ? `${fmt.num(md.periodS, 2)} seconds` : `${fmt.num(md.periodS * 1000, 2)} milliseconds`);
  } else if (klass === 'asteroid' || klass === 'comet') {
    if (md.designation) add('Catalogue', md.designation);
    if (md.diameterKm) add('Diameter', md.diameterKm >= 10 ? `${fmt.int(md.diameterKm)} km` : `${fmt.num(md.diameterKm, 2)} km`);
    if (md.periodDays && md.periodDays < 1e8) add('One lap of the Sun', md.periodDays > 730 ? `${fmt.int(md.periodDays / 365.25)} years` : `${fmt.int(md.periodDays)} days`);
    if (md.qAu) add('Closest to the Sun', `${fmt.num(md.qAu, 2)} au`);
    if (md.aphelionAu) add('Farthest from the Sun', `${fmt.num(md.aphelionAu, 1)} au`);
    if (Array.isArray(md.moons) && md.moons.length) add('Moons', md.moons.join(', '));
  } else if (klass === 'site') {
    if (md.world) add('On', nameOf(md.world), md.world);
    if (Number.isFinite(md.latDeg) && Number.isFinite(md.lonDeg)) {
      add('Where', `${fmt.num(Math.abs(md.latDeg), 2)}° ${md.latDeg >= 0 ? 'N' : 'S'}, ${fmt.num(Math.abs(md.lonDeg), 2)}° ${md.lonDeg >= 0 ? 'E' : 'W'}`);
    }
  } else if (['satellite', 'station', 'debris'].includes(klass)) {
    if (md.noradId) add('Catalogue number (NORAD)', md.noradId);
  }
  return f;
}

/**
 * The card's "See it from here" line where it does not depend on the moment: a world, a star, a
 * deep-sky object, a landing site. Not the Earth, and not the Sun, which nobody should be told to
 * look at. A planet's line goes on to say rise times are not in this version yet, which is about
 * the map and not the planet, so the page keeps its first sentence.
 */
function seeLine(r, klass, m) {
  if (!['world', 'star', 'dso', 'exotic', 'site'].includes(klass) || r.id === 'earth' || r.id === 'sun') return null;
  const mm = klass === 'site' ? { ...m, worldId: (r.meta || {}).world || null } : m;
  const line = C.seeItLine(r, CTX, mm, { state: null, pass: null });
  return line === COPY.sky.worldNoRise ? `${line.split('. ')[0]}.` : line;
}

/**
 * JSON-LD sameAs: the Wikipedia article ABOUT the thing. The hand-checked table the share sheet
 * quotes from first (data/wikititles.js), then the URL in the record's own source line, unless
 * that is a list: 40 Messier pages said they were the same thing as `List_of_Messier_objects`,
 * which is where their distance was read and not what they are (internal #202). None is honest.
 */
function sameAsOf(id, text) {
  if (Object.prototype.hasOwnProperty.call(WIKI_TITLES, String(id))) return `https://en.wikipedia.org/wiki/${WIKI_TITLES[String(id)]}`;
  const m = /https:\/\/en\.wikipedia\.org\/wiki\/[^\s,;)]+/.exec(String(text || ''));
  return m && !/\/wiki\/List_of_/i.test(m[0]) ? m[0] : null;
}

// --- build --------------------------------------------------------------------------------------

// The name the card prints, with two exceptions. A landing site's card is named after the model
// drawn there ("Apollo 11 lunar module"), and the place is what a person searches for, so a site
// keeps the registry's name ("Apollo 11 landing site"). And four GOES satellites share one model
// and so one card name; a name shared inside the satellites gives way to the list's own.
const all = candidates().map(([group, r]) => ({ group, r, m: EMPTY(r) }));
for (const c of all) c.name = c.r.klass === 'site' ? String(c.r.name) : C.tagLines(c.r, CTX, c.m).name;
const shared = new Map();
for (const c of all) if (c.group === 'satellites') shared.set(c.name, (shared.get(c.name) || 0) + 1);
for (const c of all) if (c.group === 'satellites' && shared.get(c.name) > 1) c.name = c.r.meta.listName;

const picked = [];
const byName = new Set();
const slugs = new Set();
for (const { group, r, m, name } of all) {
  if (byName.has(name.toLowerCase())) continue;
  byName.add(name.toLowerCase());
  let slug = slugOf(name);
  if (slugs.has(slug)) slug = `${slug}-${r.klass}`;
  slugs.add(slug);
  picked.push({ group, r, m, name, slug });
}

const slugById = new Map(picked.map((p) => [p.r.id, p.slug]));
const nameById = new Map(picked.map((p) => [p.r.id, p.name]));
const nameOf = (id) => nameById.get(id) || cap(id);

const pages = picked.map(({ group, r, m, name, slug }) => {
  const klass = r.klass;
  const lead = C.firstSentence(r, CTX, m, null);
  let why = C.whyLine(r);
  // A satellite's line is data/layers.js NOTABLE's: printed here, except where it will not stay true.
  if (!why && ['satellite', 'station', 'debris'].includes(klass) && r.meta.why && !DATED_WHY.has(r.meta.noradId)) why = r.meta.why;
  // A landing site's sentence IS its `doing`; an oddity's IS its `fact`. Do not print it twice.
  if (why && why === lead) why = null;
  const drawing = C.drawingLine(r);
  const sources = C.sourceLine(r, CTX);
  const facts = factsFor(r, klass, nameOf).map(([label, value, link]) => ({ label, value, href: link && slugById.has(link) ? `${slugById.get(link)}.html` : null }));
  const myths = Array.isArray(r.meta && r.meta.myths) ? r.meta.myths.map((x) => ({ claim: cap(String(x.claim)), correction: String(x.correction), source: x.source || null })) : [];
  // Related pages: a world's moons and landing sites, a site's world, a deep-sky object's
  // neighbours in its constellation. Links a crawler can follow and a reader might.
  const related = [];
  const md = r.meta || {};
  if (klass === 'world') {
    for (const p of picked) {
      const pm = p.r.meta || {};
      if ((p.r.klass === 'world' && pm.parent === r.id) || (p.r.klass === 'site' && pm.world === r.id)) related.push(p);
    }
  } else if (klass === 'dso' && md.con) {
    for (const p of picked) if (p !== undefined && p.r.klass === 'dso' && p.r.id !== r.id && (p.r.meta || {}).con === md.con) related.push(p);
  }
  const image = md.image && md.image.file ? {
    file: String(md.image.file).replace(/^site\//, ''), credit: md.image.credit || null,
    licence: md.image.licence || null, alt: md.image.alt || '',
  } : null;
  return {
    id: r.id,
    slug,
    group,
    klass,
    klassLabel: C.klassLabel(r),
    colour: (layer(r.layer) || {}).colour || null,
    name,
    title: titleFor(name, klass, r.id),
    description: descriptionFor(lead, why, liveLineFor(klass, r.id)),
    liveLine: liveLineFor(klass, r.id),
    lead,
    why,
    see: seeLine(r, klass, m),
    seeLabel: COPY.card.seeItLabel,
    drawing: drawing ? cap(drawing) + (drawing.endsWith('.') ? '' : '.') : null,
    sources: sources === COPY.source.unknown ? null : sources,
    facts,
    myths,
    related: related.slice(0, 12).map((p) => ({ slug: p.slug, name: p.name })),
    image,
    og: (r.klass === 'site' && md.world === 'moon') || (klass === 'oddity' && md.whereKind !== 'in_orbit' && /moon|lunar/i.test(`${md.cite} ${md.fact} ${r.name}`)) ? 'moon-landings'
      : klass === 'station' ? 'people-in-space' : 'default',
    sameAs: sameAsOf(r.id, md.source || md.cite || md.whySource),
    place: klass === 'site',
  };
});

process.stdout.write(JSON.stringify({
  systems: SYSTEMS.length,
  pages,
}, null, 1));
