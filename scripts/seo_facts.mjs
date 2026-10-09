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
  const con = Astronomy.Constellation(sh.ra_h, sh.dec);
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

function missionEvent(ev) {
  const noon = Date.parse(ev.happens + 'T12:00:00Z');
  const mercury = elongationOf('Mercury', noon);
  return { instant: ev.happens, instantMs: noon, mercury, moonAtNoon: moonAt(noon) };
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
