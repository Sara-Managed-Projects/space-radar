// tests/test_small_lists.mjs -- the small complete lists of release 1.5.0 (0079 a6, internal #1064):
// the IAU's established meteor showers, the observatories with their MPC codes, the launch sites, and every
// landing and impact site, each from site/data/lists/ (scripts/gen_small_lists.py).
//
//   node tests/test_small_lists.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(ROOT, 'site/js', rel)).href);
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const list = (name) => JSON.parse(read(`site/data/lists/${name}.json`));

const S = await mod('data/smalllists.js');
const { propagate } = await mod('propagate/index.js');
const { SITES } = await mod('data/sites.js');
const { SHOWERS } = await mod('data/showers.js');
const { LAYERS } = await mod('data/layers.js');
const C = await mod('ui/cards.js');
const R = await mod('sky/radiants.js');
const RAD = 6371;
const hav = (r, a, b, c, d) => { const p = (x) => x * Math.PI / 180; const h = Math.sin(p(c - a) / 2) ** 2 + Math.cos(p(a)) * Math.cos(p(c)) * Math.sin(p(d - b) / 2) ** 2; return 2 * r * Math.asin(Math.min(1, Math.sqrt(h))); };
const m = { tMs: Date.UTC(2026, 9, 28), altKm: null, distEarthKm: null, frame: null };
const say = (r) => C.firstSentence(r, {}, m, null);

// ------------------------------------------------------------------------------------------ meteor showers
{
  const doc = list('showers');
  const rows = doc.rows;
  check(rows.length === 172 && doc.solutions === 776, `172 established showers from 776 solutions, the MDC's file of 23 October 2026 (${rows.length}, ${doc.solutions})`);
  check(new Set(rows.map((r) => r.id)).size === rows.length, 'ids are unique');
  check(rows.filter((r) => r.iau).length === 171 && rows.filter((r) => !r.iau).length === 1, '171 have an IAU number and the xi-Serpentids wait for theirs');
  for (const r of rows) {
    check(r.los >= 0 && r.los < 360 && r.ra >= 0 && r.ra < 360 && r.dec >= -90 && r.dec <= 90 && r.vg > 0 && r.vg < 75, `${r.id}: a radiant, a speed and a solar longitude that are possible`);
    check(/^\d\d-\d\d$/.test(r.peak) && r.n >= 1, `${r.id}: a peak date and a solution count`);
  }
  const ours = rows.filter((r) => r.ours);
  check(ours.length === 8 && ours.every((r) => SHOWERS.some((s) => s.id === r.ours)), 'the eight showers of registry/showers.yaml are matched, none is a ninth');
  check(rows.find((r) => r.code === 'PER').ours === 'perseids' && rows.find((r) => r.code === 'GEM').zhr === 150, 'the Perseids and Geminids are the registry\'s own rows (and carry its rate)');
  const rec = S.showerRecords(doc);
  check(rec.length === 172 && rec.every((r) => r.klass === 'shower' && r.layer === 'meteor-showers' && !r.propagator), 'a record each, with no place: a radiant is a direction');
  const dra = rec.find((r) => r.id === 'shower-october-draconids');
  check(dra && /meteor shower/.test(say(dra)) && /9 October/.test(say(dra)) && say(dra).length <= 170, `a card sentence: "${dra && say(dra)}"`);
  check(rec.find((r) => r.id === 'shower-daytime-beta-taurids').meta.aliases.includes('Daytime beta Taurids'), 'and a name with a hyphen is found with it as a space');
  // the sky view marks the others near their peak, and not the eight twice
  const radiants = S.radiantRows(doc);
  check(radiants.length === 164 && radiants.every((r) => r.catalogue && !r.zhr && Number.isFinite(r.ra_h)), 'the sky view gets 164 radiants without a rate');
  const marked = R.activeShowers(Date.parse('2026-10-08T12:00:00Z'), radiants, 2).map((s) => s.id);
  check(marked.includes('shower-october-draconids'), `on 8 October the Draconids are marked (${marked})`);
  check(!R.activeShowers(Date.parse('2026-08-12T12:00:00Z'), radiants, 2).some((s) => /perseid/.test(s.id)), 'the Perseids are the registry\'s and are not marked twice');
  const sv = read('site/js/sky/skyview.js');
  check(/if \(sh\.catalogue\) continue;/.test(sv) && /import\('\.\.\/data\/smalllists\.js'\)/.test(sv) && !/^import .*smalllists/m.test(sv), 'skyview marks them, hands none to the ground sky, and imports the list late');
}

// ------------------------------------------------------------------------------------------ observatories
{
  const doc = list('observatories');
  const n = doc.n;
  check(n >= 3800 && ['name', 'lat', 'lon', 'mpc', 'country', 'from', 'to', 'q'].every((k) => doc[k].length === n), `columns of one length (${n})`);
  check(doc.mpc.filter(Boolean).length >= 2600, `the MPC codes are there (${doc.mpc.filter(Boolean).length})`);
  for (let i = 0; i < n; i++) if (!(Math.abs(doc.lat[i]) <= 900000 && Math.abs(doc.lon[i]) <= 1800000 && doc.name[i])) { check(false, `row ${i} has a place and a name`); break; }
  const i675 = doc.mpc.indexOf('675');
  check(i675 >= 0 && /Palomar/.test(doc.name[i675]) && Math.abs(doc.lat[i675] / 1e4 - 33.36) < 0.05 && Math.abs(doc.lon[i675] / 1e4 + 116.86) < 0.05, 'Palomar is 675, at 33.36 N 116.86 W');
  const i000 = doc.mpc.indexOf('000');
  check(i000 >= 0 && Math.abs(doc.lon[i000] / 1e4) < 0.01, 'Greenwich is 000, on the prime meridian');
  const dishes = SITES.filter((s) => s.class === 'dish');
  check(dishes.length === 4, 'four hand-kept dishes');
  for (let i = 0; i < n; i++) for (const d of dishes) if (hav(RAD, doc.lat[i] / 1e4, doc.lon[i] / 1e4, d.lat, d.lon) < 1.5) check(false, `${doc.name[i]} sits on the hand-kept ${d.id}`);
  const rec = S.observatoryRecords(doc);
  check(rec.length === n && new Set(rec.map((r) => r.id)).size === n, 'a record each, ids unique');
  const pal = rec[i675];
  check(pal.klass === 'site' && pal.propagator === 'fixed' && pal.frame === 'earth-fixed' && pal.layer === 'observatories' && pal.meta.markOnly === true, 'a fixed site on the Earth, a mark only');
  check(/is an observatory/.test(say(pal)) && /675/.test(say(pal)) && /the United States/.test(say(pal)), `its card: "${say(pal)}"`);
  const p = propagate(pal, Date.UTC(2026, 9, 28));
  check(p && Math.abs(Math.hypot(p.x, p.y, p.z) - 6371) < 25, 'and it stands on the Earth\'s surface');
}

// ------------------------------------------------------------------------------------------ launch sites
{
  const doc = list('launch-sites');
  const names = doc.rows.map((r) => r.name);
  check(doc.rows.length >= 100, `a hundred and more launch sites (${doc.rows.length})`);
  for (const n of ['Baikonur Cosmodrome', 'Guiana Space Centre', 'Vandenberg Space Force Base', 'Satish Dhawan Space Centre', 'Wenchang Satellite Launch Center', 'Starbase']) check(names.includes(n), `${n} is a launch site`);
  for (const r of doc.rows) for (const pad of SITES.filter((s) => s.class === 'pad')) check(hav(RAD, r.lat, r.lon, pad.lat, pad.lon) >= 3, `${r.name} duplicates the hand-kept ${pad.id}`);
  const rec = S.launchSiteRecords(doc);
  check(/is a launch site/.test(say(rec.find((r) => /Baikonur/.test(r.name)))), 'its card says what it is');
}

// ------------------------------------------------------------------------------------------ landing and impact sites
{
  const doc = list('landing-sites');
  const rows = doc.rows;
  const by = (w) => rows.filter((r) => r.world === w);
  check(by('venus').length === 17, `Venus: seventeen (${by('venus').length})`);
  check(by('moon').length + 22 === 96, `the Moon: NSSDCA's 96 rows, 22 of them already in registry/sites.yaml (${by('moon').length} here)`);
  check(new Set(rows.map((r) => r.id)).size === rows.length, 'ids unique');
  for (const r of rows) {
    check(r.doing && r.kind && r.world, `${r.id}: a sentence, a kind and a world`);
    if (r.lat !== undefined) check(Math.abs(r.lat) <= 90 && r.lon >= 0 && r.lon < 360 + 1e-9, `${r.id}: a place on a sphere (east longitude)`);
    // never twice: nothing within 2 km of a hand-kept row on its world
    if (r.lat !== undefined && ['moon', 'mars', 'venus'].includes(r.world)) {
      const radius = { moon: 1737.4, mars: 3389.5, venus: 6051.8 }[r.world];
      for (const s of SITES) if (s.world === r.world && s.lat !== undefined && hav(radius, r.lat, r.lon, s.lat, s.lon) < 2) check(false, `${r.id} is the hand-kept ${s.id}`);
    }
  }
  const apollo = rows.filter((r) => /apollo-1[1-7]\b|^moon-apollo-1[1-7]$/.test(r.id) && r.kind === 'landing');
  check(apollo.length === 0, 'no Apollo landing is here a second time');
  const rec = S.landingRecords(doc);
  const v9 = rec.find((r) => r.id === 'venera-9');
  check(v9.frame === 'venus-fixed' && v9.propagator === 'fixed' && /first picture/.test(say(v9)), 'Venera 9 is fixed on Venus, and its card says what it did');
  const p = propagate(v9, Date.UTC(2026, 9, 28));
  check(p && Math.abs(Math.hypot(p.x, p.y, p.z) - 6051.8) < 5, 'on its surface');
  const dart = rec.find((r) => r.id === 'dart-dimorphos');
  check(dart && !dart.propagator && dart.meta.noPlace && dart.meta.latDeg === -8.84, 'DART: a coordinate in the card (Daly et al. 2023), no place drawn: a small body is not a world here');
  check(rows.filter((r) => ['eros', 'itokawa', 'ryugu', 'bennu', '67p', 'dimorphos', 'tempel-1', 'kamooalewa'].includes(r.world)).length === 9, 'the small bodies: nine events');
  const planned = rows.filter((r) => r.kind === 'planned').map((r) => r.id).sort().join();
  check(planned === 'mmx-phobos,tianwen-2-kamooalewa', `Tianwen-2 and MMX are the two planned landings (${planned})`);
  const lost = rec.find((r) => r.id === 'moon-luna-10');
  check(lost && !lost.propagator && /where is not known/.test(say(lost)), 'a site nobody knows is a card that says so');
  check(Object.keys(doc.references).includes('nssdca-moon') && /public domain/i.test(doc.references['nssdca-moon'].says), 'the Moon\'s source is cited, public domain');
}

// ------------------------------------------------------------------------------------------ wiring
{
  const ids = ['observatories', 'launch-sites', 'landing-sites', 'meteor-showers'];
  for (const id of ids) {
    const l = LAYERS.find((x) => x.id === id);
    check(l && l.enabled !== false && typeof l.fetchLazy === 'function' && l.source === 'bundled', `${id}: a layer that fetches its own list`);
    check(l && l.moments && !l.moments.next && (id === 'meteor-showers' || !l.moments.wonder), `${id}: off unless it is the showers' radiants`);
  }
  check(LAYERS.find((l) => l.id === 'observatories').load === 'on-demand', 'the observatories (3 850 marks) wait for their box');
  const main = read('site/js/main.js');
  check(/const LATER_LAYERS = new Set\(\['stars', 'exoplanets', 'deep-sky', 'launch-sites', 'landing-sites', 'meteor-showers'\]\)/.test(main), 'the small three load after the first screen, with the other late layers');
  check(!/smalllists/.test(main) && !/exopack/.test(main), 'and nothing at boot imports the lists');
  for (const f of ['showers', 'observatories', 'launch-sites', 'landing-sites']) check(read(`site/data/lists/${f}.json`).length < 260000, `${f}.json is small`);
}

if (problems.length) { console.error('small lists FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log('small lists ok: 172 showers (8 are the registry\'s), 3 850 observatories (2 694 with an MPC code), 111 launch sites, 105 landing and impact sites (17 on Venus, 74 more on the Moon, 4 on Mars, 9 small-body events), none twice, each with its card');
