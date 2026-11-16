// scripts/seo_facts.mjs -- the astronomy behind the dated pages, as JSON.
//
//   echo '{"events": [...registry/sky-events.yaml rows...]}'            | node scripts/seo_facts.mjs events
//   echo '{"date":"2026-10-09","place":{"name":"London","latDeg":51.5,"lonDeg":-0.13}}' | node scripts/seo_facts.mjs planets
//
// The Node half of scripts/seo_pages.py, like scripts/object_pages.mjs is of scripts/build_seo.py: the
// maths is the app's own (Astronomy Engine in site/vendor/, sky/tonightbest.js, sky/radiants.js), run
// once at build time. NOTHING HERE READS A CLOCK. `events` is a function of the registry's rows;
// `planets` is a function of the date it is given (the build's date, passed in), and the page that
// prints it prints that date beside it. tests/test_sky_events.mjs recomputes `events` from the
// registry and fails when a typed date has moved off the computed one.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { SHOWERS } = await import(join(JS, 'data/showers.js'));
const { peakInstant } = await import(join(JS, 'sky/radiants.js'));
const { CITIES } = await import(join(JS, 'copy/en.js'));

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const round1 = (v) => Math.round(v * 10) / 10;

/** The Moon's lit percentage and whether it is growing, at an instant. */
export function moonAt(ms) {
  const d = new Date(ms);
  const il = Astronomy.Illumination('Moon', d);
  const phase = Astronomy.MoonPhase(d);
  return { percent: Math.round(il.phase_fraction * 100), percentExact: round1(il.phase_fraction * 100), waxing: phase < 180, phaseDeg: round1(phase) };
}

/** Sun-to-body angle, and whether the body stands east of the Sun (an evening object) or west (a morning one). */
export function elongationOf(body, ms) {
  const d = new Date(ms);
  const e = Astronomy.Elongation(body, d);
  return { degrees: round1(e.elongation), visibility: e.visibility, eclipticDeg: round1(e.ecliptic_separation) };
}

function showerEvent(ev) {
  const sh = SHOWERS.find((s) => s.id === ev.shower);
  if (!sh) throw new Error(`${ev.id}: no shower ${ev.shower} in registry/showers.yaml`);
  const peakMs = peakInstant(sh, ev.year);
  if (peakMs === null) throw new Error(`${ev.id}: ${ev.shower} has no solar longitude, so no computed peak`);
  const moonMs = Date.parse(ev.moon_at);
  // THE CONSTELLATION A SHOWER IS NAMED FOR, where the catalogue's radiant POINT falls just across a boundary from it
  // (review 2026-11-16): the IMO's Perseid radiant (RA 3.22 h, Dec +58) looks up as Cassiopeia and the Lyrids' (18.17 h, +34)
  // as Hercules, and the pages said the Perseids come "from Cassiopeia". NASA: "Radiant Constellation Perseus"
  // (https://science.nasa.gov/solar-system/meteors-meteorites/perseids/) and "Radiant Constellation Lyra"
  // (.../lyrids/), both read 2026-11-16. Every other shower's is still looked up from its point.
  const NAMED_FOR = { perseids: 'Perseus', lyrids: 'Lyra' };
  const con = NAMED_FOR[sh.id] ? { name: NAMED_FOR[sh.id] } : Astronomy.Constellation(sh.ra_h, sh.dec);
  return {
    instant: iso(peakMs),
    instantMs: peakMs,
    moonAt: ev.moon_at,
    moon: moonAt(moonMs),
    shower: { id: sh.id, display: sh.display, zhr: sh.zhr, parent: sh.parent, raH: sh.ra_h, decDeg: sh.dec, vKms: sh.v_kms, from: sh.active_from, to: sh.active_to, constellation: con.name },
  };
}

/** What each bundled city (copy/en.js CITIES) sees of an eclipse that peaks at `peakMs`. Computed, never typed. */
function eclipseFromCities(peakMs) {
  const rows = [];
  for (const c of CITIES) {
    try {
      const obs = new Astronomy.Observer(c.latDeg, c.lonDeg, 0);
      const l = Astronomy.SearchLocalSolarEclipse(new Date(peakMs - 2 * 86400e3), obs);
      const maxMs = l.peak.time.date.getTime();
      if (Math.abs(maxMs - peakMs) > 86400e3 || l.peak.altitude <= 0) continue;
      rows.push({ name: c.name, country: c.country, kind: l.kind, obscuration: Math.round(l.obscuration * 100), maxUtc: iso(maxMs), altDeg: Math.round(l.peak.altitude) });
    } catch { /* a city the search cannot place is not listed */ }
  }
  rows.sort((a, b) => (b.kind === 'partial' ? 0 : 1) - (a.kind === 'partial' ? 0 : 1) || b.obscuration - a.obscuration);
  return rows;
}

function eclipseEvent(ev) {
  let from = new Date(ev.near + 'T00:00:00Z');
  for (let i = 0; i < 8; i++) {
    const e = Astronomy.SearchGlobalSolarEclipse(from);
    if (e.kind === ev.eclipse) {
      const peak = e.peak.date.getTime();
      return {
        instant: iso(peak), instantMs: peak, kind: e.kind,
        obscuration: e.obscuration === undefined ? null : round1(e.obscuration * 100),
        latDeg: round1(e.latitude), lonDeg: round1(e.longitude), moonAtPeak: moonAt(peak),
        cities: eclipseFromCities(peak),
      };
    }
    from = new Date(e.peak.date.getTime() + 20 * 86400e3);
  }
  throw new Error(`${ev.id}: no ${ev.eclipse} eclipse within eight searches of ${ev.near}`);
}

const AU_KM = 149597870.7;
const MEAN_MOON_KM = 384400;

/** A full Moon (internal #105): the instant of the phase and the Moon's distance then. Searched from `near`, a few days before. */
function fullMoonEvent(ev) {
  const at = Astronomy.SearchMoonPhase(180, new Date(`${ev.near}T00:00:00Z`), 40);
  if (!at) throw new Error(`${ev.id}: no full Moon within 40 days of ${ev.near}`);
  const ms = at.date.getTime();
  const km = Astronomy.GeoVector('Moon', at, true).Length() * AU_KM;
  // A penumbral lunar eclipse at this full Moon (the Moon in the Earth's outer shadow only): said on the page, which has no
  // eclipse page of its own for it. A partial or total one has its own page (kind lunar-eclipse) and is not repeated here.
  let penumbral = null;
  try {
    const e = Astronomy.SearchLunarEclipse(new Date(ms - 2 * 86400e3));
    const peak = e.peak.date.getTime();
    if (e.kind === 'penumbral' && Math.abs(peak - ms) < 86400e3) penumbral = { instant: iso(peak) };
  } catch { /* no eclipse found: nothing is said */ }
  return { instant: iso(ms), instantMs: ms, distanceKm: Math.round(km), meanKm: MEAN_MOON_KM, nearer: km < MEAN_MOON_KM, month: new Date(ms).getUTCMonth() + 1, moonAtPeak: moonAt(ms), penumbral };
}

/** What each bundled city sees of a lunar eclipse: the Moon's height at the greatest eclipse. Computed, never typed. */
function lunarFromCities(peak) {
  const rows = [];
  for (const c of CITIES) {
    const obs = new Astronomy.Observer(c.latDeg, c.lonDeg, 0);
    const eq = Astronomy.Equator('Moon', peak, obs, true, true);
    const hor = Astronomy.Horizon(peak, obs, eq.ra, eq.dec, 'normal');
    rows.push({ name: c.name, country: c.country, altDeg: Math.round(hor.altitude) });
  }
  return rows;
}

function lunarEclipseEvent(ev) {
  let e = Astronomy.SearchLunarEclipse(new Date(`${ev.near}T00:00:00Z`));
  for (let i = 0; i < 6 && e.kind !== ev.eclipse; i++) e = Astronomy.NextLunarEclipse(e.peak);
  if (e.kind !== ev.eclipse) throw new Error(`${ev.id}: no ${ev.eclipse} lunar eclipse found from ${ev.near}`);
  const ms = e.peak.date.getTime();
  const cities = lunarFromCities(e.peak);
  const up = cities.filter((c) => c.altDeg >= 10).sort((a, b) => b.altDeg - a.altDeg);
  return {
    instant: iso(ms), instantMs: ms, kind: e.kind, umbralPercent: Math.round(e.obscuration * 1000) / 10,
    partialMinutes: Math.round(e.sd_partial * 2), totalMinutes: Math.round(e.sd_total * 2), moonAtPeak: moonAt(ms),
    citiesUp: up.slice(0, 8), citiesCount: cities.length, upCount: up.length,
  };
}

const PLANET_NAMES = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
const angleBetween = (a, b, t) => {
  const x = Astronomy.GeoVector(a, t, true);
  const y = Astronomy.GeoVector(b, t, true);
  return Math.acos(Math.min(1, (x.x * y.x + x.y * y.y + x.z * y.z) / (x.Length() * y.Length()))) * 180 / Math.PI;
};

/** Two planets at their closest in the sky (internal #105): the minute, found by narrowing a scan round `near`. */
function conjunctionEvent(ev) {
  const [a, b] = ev.bodies.map((id) => PLANET_NAMES[id]);
  if (!a || !b) throw new Error(`${ev.id}: bodies must be two of ${Object.keys(PLANET_NAMES)}`);
  let lo = Date.parse(`${ev.near}T00:00:00Z`) - 20 * 86400e3;
  let hi = lo + 40 * 86400e3;
  for (let step = 6 * 3600e3; step >= 60e3; step /= 6) {
    let best = lo; let bestV = Infinity;
    for (let t = lo; t <= hi; t += step) { const v = angleBetween(a, b, new Date(t)); if (v < bestV) { bestV = v; best = t; } }
    lo = best - step; hi = best + step;
  }
  const ms = Math.round((lo + hi) / 2 / 60e3) * 60e3;
  const t = new Date(ms);
  const side = (name) => {
    const el = Astronomy.Elongation(name, t);
    const eq = Astronomy.Equator(name, t, new Astronomy.Observer(0, 0, 0), true, true);
    return {
      name, elongationDeg: Math.round(el.elongation), visibility: el.visibility,
      mag: round1(Astronomy.Illumination(name, t).mag), constellation: Astronomy.Constellation(eq.ra, eq.dec).name,
      distAu: Math.round(Astronomy.GeoVector(name, t, true).Length() * 100) / 100,
    };
  };
  return { instant: iso(ms), instantMs: ms, separationDeg: Math.round(angleBetween(a, b, t) * 100) / 100, bodies: [side(a), side(b)], moonAtPeak: moonAt(ms) };
}

function missionEvent(ev) {
  const noon = Date.parse(ev.happens + 'T12:00:00Z');
  const mercury = elongationOf('Mercury', noon);
  return { instant: ev.happens, instantMs: noon, mercury, moonAtNoon: moonAt(noon) };
}

/** A solstice (forge #90): the instant from Astronomy Engine's Seasons, and where the Sun stands overhead at noon then. */
function seasonEvent(ev) {
  const s = Astronomy.Seasons(ev.year);
  const at = ev.season === 'june-solstice' ? s.jun_solstice : ev.season === 'december-solstice' ? s.dec_solstice : null;
  if (!at) throw new Error(`${ev.id}: season ${ev.season} is not june-solstice or december-solstice`);
  const ms = at.date.getTime();
  // the Sun's declination then: the latitude where it stands overhead at noon (the tropic of that year)
  const eq = Astronomy.Equator('Sun', at.date, new Astronomy.Observer(0, 0, 0), true, true);
  return { instant: iso(ms), instantMs: ms, season: ev.season, sunDecDeg: Math.round(eq.dec * 100) / 100 };
}

function alsoEvent(a, around) {
  if (a.what === 'greatest-western-elongation' || a.what === 'greatest-eastern-elongation') {
    const want = a.what.includes('western') ? 'morning' : 'evening';
    let from = new Date(around - 60 * 86400e3);
    for (let i = 0; i < 6; i++) {
      const e = Astronomy.SearchMaxElongation(a.body[0].toUpperCase() + a.body.slice(1), from);
      if (e.visibility === want) {
        const ms = e.time.date.getTime();
        if (Math.abs(ms - around) < 40 * 86400e3) return { body: a.body, what: a.what, instant: iso(ms), instantMs: ms, elongationDeg: Math.round(e.elongation * 100) / 100, visibility: e.visibility };
      }
      from = new Date(e.time.date.getTime() + 20 * 86400e3);
    }
  }
  throw new Error(`no ${a.what} of ${a.body} near ${iso(around)}`);
}

function events(rows) {
  return rows.map((ev) => {
    let facts;
    if (ev.kind === 'meteor-shower') facts = showerEvent(ev);
    else if (ev.kind === 'eclipse') facts = eclipseEvent(ev);
    else if (ev.kind === 'mission') facts = missionEvent(ev);
    else if (ev.kind === 'season') facts = seasonEvent(ev);
    else if (ev.kind === 'full-moon') facts = fullMoonEvent(ev);
    else if (ev.kind === 'lunar-eclipse') facts = lunarEclipseEvent(ev);
    else if (ev.kind === 'conjunction') facts = conjunctionEvent(ev);
    else throw new Error(`${ev.id}: kind ${ev.kind}`);
    facts.id = ev.id;
    facts.also = (ev.also || []).map((a) => alsoEvent(a, facts.instantMs));
    return facts;
  });
}

/** Tonight's naked-eye planets from one place, for the evening of `date` (UT). */
async function planets(req) {
  const T = await import(join(JS, 'sky/tonightbest.js'));
  const { latDeg, lonDeg } = req.place;
  const observer = { latDeg, lonDeg, altKm: 0, latRad: latDeg * Math.PI / 180, lonRad: lonDeg * Math.PI / 180 };
  const nowMs = Date.parse(`${req.date}T12:00:00Z`);
  const win = T.nightWindow(observer, nowMs);
  if (!win) return { date: req.date, place: req.place, window: null, planets: [], moon: null };
  const names = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
  const up = [];
  const down = [];
  for (const id of T.NAKED_EYE_PLANETS) {
    const p = T.planetTonight(id, observer, win);
    if (p) up.push({ id, name: names[id], bestUtc: iso(p.bestMs), bestMs: p.bestMs, altDeg: Math.round(p.altDeg), azDeg: Math.round(p.azDeg), compass: T.compassShort(p.azDeg), mag: round1(p.mag) });
    else down.push(names[id]);
  }
  up.sort((a, b) => a.mag - b.mag);
  const m = T.moonTonight(observer, win);
  return {
    date: req.date, place: req.place,
    window: { startUtc: iso(win.startMs), endUtc: iso(win.endMs), startMs: win.startMs, endMs: win.endMs },
    planets: up, notUp: down,
    moon: m ? { percent: m.percent, waxing: m.waxing, phase: m.phase, upTonight: m.upTonight } : null,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
  const cmd = process.argv[2];
  let out;
  if (cmd === 'events') out = { events: events(input.events) };
  else if (cmd === 'planets') out = await planets(input);
  else { console.error('usage: node scripts/seo_facts.mjs events|planets  < json'); process.exit(2); }
  process.stdout.write(JSON.stringify(out));
}
export { events, planets };
