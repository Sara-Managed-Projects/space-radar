// tests/test_rover_positions.mjs -- the two rovers that still drive stand where NASA last placed them (2026-11-16).
//
// Curiosity and Perseverance were drawn at their LANDING sites under a present-tense sentence, 14.3 km and 12.2 km from
// NASA's waypoints for them. The rows `gale` and `jezero` of registry/sites.yaml are now the rover; the landing place
// is a row of its own; and scripts/refresh_rover_positions.py rewrites the rover rows each month
// (.github/workflows/rover-positions.yml). What this holds:
//
//   THE ROVER IS AT THE WAYPOINT. Each rover row is within 50 m of the waypoint the script last read
//     (tests/fixtures/rover-waypoints.json: NASA's file, its URL, the day read), carries that waypoint's sol and day,
//     and is more than 5 km from its landing row. A row moved by hand, or put back on the landing site, fails here.
//   THE LANDING PLACE HAS NOT MOVED. `bradbury-landing` and `octavia-e-butler-landing` are at the coordinates the rover
//     rows had, cite the references they cited, and are places (`class: feature`): a mark and a name, no second rover.
//   WHAT MEANS THE LANDING STILL POINTS AT IT. The ground a visitor stands on (registry/ground.yaml, site/data/ground)
//     is the landing place's; the three events of 2021 in Perseverance's mission are shown at the landing place; the
//     replay of Curiosity's landing is on the landing place's card too; search finds each by its name.
//   THE CARD SAYS AS OF WHEN. "Position: NASA's waypoint for sol N (day)", in every language's file, and on no other card.
//   THE MONTHLY JOB IS WIRED: the workflow runs the script on a schedule and CI runs its `--check`.
//
//   node tests/test_rover_positions.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { SITES } = await import(join(JS, 'data/sites.js'));
const { handKeptSites } = await import(join(JS, 'data/sample.js'));
const { positionAsOfLine, drawingLine } = await import(join(JS, 'ui/cards.js'));
const { realModelFor } = await import(join(JS, 'scene/realmodels.js'));
const { MISSIONS, subjectId } = await import(join(JS, 'ui/missions.js'));
const shelf = await import(join(JS, 'moments/shelf.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const MARS_KM = 3389.5;
const km = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 2 * MARS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

// The landing points, as the rover rows had them until 2026-11-16 and as their references give them: PDS Geosciences
// Node, MSL mission overview ("4.5895 degrees South ... 137.4417 degrees East"), and the first point of NASA's Mars
// 2020 waypoints layer (18.44462715, 77.45088572, written to four places). Written here, not read from the registry:
// this is the half of the test that notices a landing row being moved.
const PAIRS = [
  { rover: 'gale', name: 'Curiosity', landing: 'bradbury-landing', at: { lat: -4.5895, lon: 137.4417 }, source: 'pds-msl', cites: 'msl-rover-waypoints-current', model: 'curiosity.glb' },
  { rover: 'jezero', name: 'Perseverance', landing: 'octavia-e-butler-landing', at: { lat: 18.4446, lon: 77.4509 }, source: 'm20-rover-waypoints', cites: 'm20-rover-waypoints-current', model: 'perseverance.glb' },
];
const TOLERANCE_M = 50;
const MIN_FROM_LANDING_KM = 5;

const fixture = JSON.parse(read('tests/fixtures/rover-waypoints.json'));
const yaml = read('registry/sites.yaml');
const rowOf = (id) => SITES.find((r) => r.id === id);
const yamlRow = (id) => (yaml.match(new RegExp(`^  - \\{id: ${id},[^\\n]*\\}$`, 'm')) || [''])[0];
const records = handKeptSites();
const recordOf = (id) => records.find((r) => r.id === id);

for (const p of PAIRS) {
  const row = rowOf(p.rover);
  const land = rowOf(p.landing);
  const wp = fixture.rovers && fixture.rovers[p.rover];
  check(row && land && wp, `${p.rover}: the rover row, the landing row ${p.landing} and the fixture waypoint are all there`);
  if (!row || !land || !wp) continue;

  // --- the rover is at the waypoint
  check(/^https:\/\/mars\.nasa\.gov\/mmgis-maps\/(MSL|M20)\/Layers\/json\/(MSL|M20)_waypoints_current\.json$/.test(wp.url) && /^\d{4}-\d{2}-\d{2}$/.test(wp.read),
    `${p.rover}: the fixture names NASA's file and the day it was read (${wp.url}, ${wp.read})`);
  const off = km(row, wp) * 1000;
  check(off <= TOLERANCE_M, `${p.name} is drawn ${off.toFixed(0)} m from NASA's waypoint for sol ${wp.sol} (${wp.lat}, ${wp.lon}); the tolerance is ${TOLERANCE_M} m. Run scripts/refresh_rover_positions.py, never edit the row`);
  const away = km(row, land);
  check(away > MIN_FROM_LANDING_KM, `${p.name} is drawn ${away.toFixed(2)} km from its landing place: the rover row is the landing site again (it has driven more than ${MIN_FROM_LANDING_KM} km from it)`);
  check(Number.isInteger(row.as_of_sol) && row.as_of_sol === wp.sol, `${p.rover}: as_of_sol ${row.as_of_sol} is the waypoint's sol ${wp.sol}`);
  check(/^\d{4}-\d{2}-\d{2}$/.test(String(row.as_of)) && row.as_of === wp.as_of, `${p.rover}: as_of ${row.as_of} is the waypoint's day ${wp.as_of}`);
  check(row.class === 'surface' && row.shape === 'rover' && row.world === 'mars', `${p.rover}: still a rover on Mars`);
  check(new RegExp(`source: ${p.cites}[,}]`).test(yamlRow(p.rover)), `${p.rover}: cites NASA's current-waypoint file (${p.cites})`);
  check(/ landed: \d{4}-\d{2}-\d{2},/.test(yamlRow(p.rover)), `${p.rover}: still says the day it landed`);

  // --- the landing place has not moved, and is a place
  check(land.lat === p.at.lat && land.lon === p.at.lon, `${p.landing} is at ${land.lat}, ${land.lon}; the landing point is ${p.at.lat}, ${p.at.lon}`);
  check(land.class === 'feature' && land.world === 'mars' && !land.shape, `${p.landing} is a place (class feature, no shape), not a second rover: ${land.class}, ${land.shape}`);
  check(new RegExp(`source: ${p.source}[,}]`).test(yamlRow(p.landing)), `${p.landing}: keeps the landing point's reference (${p.source})`);
  check(String(land.doing).startsWith(`Where ${p.name} landed`), `${p.landing}: its sentence says it is where ${p.name} landed: ${land.doing}`);

  // --- drawn as what each is
  const rr = recordOf(p.rover);
  const lr = recordOf(p.landing);
  const model = realModelFor(rr);
  check(model && model.file === p.model, `${p.rover} is drawn as ${p.name}'s own model (${model && model.file})`);
  check(lr && lr.meta.siteKind === 'feature' && /a named place/.test(drawingLine(lr) || ''), `${p.landing}'s card says nothing is drawn there but a mark: ${lr && drawingLine(lr)}`);

  // --- the card says as of when
  const line = positionAsOfLine(rr);
  check(typeof line === 'string' && line.includes(`sol ${wp.sol}`) && line.includes(String(new Date(`${wp.as_of}T12:00:00Z`).getUTCFullYear())) && /NASA/.test(line),
    `${p.name}'s card says which waypoint it stands at: ${JSON.stringify(line)}`);
  check(positionAsOfLine(lr) === null, `${p.landing}'s card has no waypoint line (a landing place does not move)`);

  // --- the ground a visitor stands on is the landing place's
  const g = read('registry/ground.yaml');
  const block = g.slice(g.indexOf(`  - id: ${p.rover}\n`), g.indexOf('\n  - id: ', g.indexOf(`  - id: ${p.rover}\n`) + 10));
  const at = block.match(/^    at: \{lat: (-?[\d.]+), lon: (-?[\d.]+),/m);
  check(at && Number(at[1]) === p.at.lat && Number(at[2]) === p.at.lon, `registry/ground.yaml ${p.rover}: \`at:\` is the landing point (${at && at.slice(1, 3)})`);
  const manifest = JSON.parse(read(`site/data/ground/${p.rover}/site.json`));
  check(manifest.latDeg === p.at.lat && manifest.lonDeg === p.at.lon, `site/data/ground/${p.rover} stands at the landing point (${manifest.latDeg}, ${manifest.lonDeg})`);
  check(/where it landed/.test(manifest.model.what), `the ground's model line says it is where ${p.name} landed: ${manifest.model.what}`);
}
check(positionAsOfLine(recordOf('spirit')) === null && positionAsOfLine(recordOf('ingenuity')) === null, 'no other site card has a waypoint line');
check(SITES.filter((r) => r.as_of_sol != null).map((r) => r.id).sort().join() === 'gale,jezero', 'only the two rovers that still drive carry as_of_sol');

// --- Perseverance's events of 2021 are shown at the landing place; Curiosity's landing replays from it too
{
  const m = MISSIONS.find((x) => x.id === 'perseverance');
  check(m && m.record === 'jezero', 'Perseverance\'s mission is still on the rover\'s card');
  const onSite = m ? m.events.filter((e) => e.place === 'site') : [];
  check(onSite.length >= 3 && onSite.every((e) => subjectId(m, e) === 'octavia-e-butler-landing'),
    `every event of Perseverance's shown at a place on Mars is shown at the landing place: ${onSite.map((e) => `${e.id}:${subjectId(m, e)}`).join(', ')}`);
  check(onSite.every((e) => Date.parse(e.date) < Date.UTC(2022, 0, 1)), 'those events are the ones of 2021, on the crater floor (a later one needs a place of its own)');
  check(shelf.momentsFor('bradbury-landing').some((x) => x.id === 'curiosity-edl') && shelf.momentsFor('gale').some((x) => x.id === 'curiosity-edl'),
    'the replay of Curiosity\'s landing is on the landing place\'s card and on the rover\'s');
}

// --- search finds the rover by its name and the place by its own
{
  const index = buildIndex(records, LAYERS);
  const first = (q) => (findMatches(index, q).hits[0] || {}).record;
  for (const [q, id] of [['curiosity', 'gale'], ['perseverance', 'jezero'], ['bradbury landing', 'bradbury-landing'], ['octavia butler', 'octavia-e-butler-landing'], ['perseverance landing site', 'octavia-e-butler-landing'], ['curiosity landing site', 'bradbury-landing']]) {
    const got = first(q);
    check(got && got.id === id, `searching "${q}" should find ${id} first, found ${got ? got.id : 'nothing'}`);
  }
}

// --- the words, in every language
{
  const en = read('site/js/copy/en.later.js');
  check(/waypoint: 'Position: NASA’s waypoint for sol \{sol\} \(\{date\}\)'/.test(en), 'copy/en.later.js has the waypoint line with its {sol} and {date}');
  for (const code of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
    const { COPY } = await import(join(JS, `copy/${code}.js`));
    const s = COPY.source && COPY.source.waypoint;
    check(typeof s === 'string' && s.includes('{sol}') && s.includes('{date}') && s.includes('NASA') && !s.startsWith('Position: NASA’s waypoint'),
      `copy/${code}.js says the waypoint line in its own language, with {sol} and {date}: ${JSON.stringify(s)}`);
  }
}

// --- the monthly job
{
  const wf = read('.github/workflows/rover-positions.yml');
  check(/schedule:\s*\n\s*- cron: "\d+ \d+ 1 \* \*"/.test(wf) && /workflow_dispatch:/.test(wf), 'the workflow runs on the first of each month, and by hand');
  check(/python3 scripts\/refresh_rover_positions\.py/.test(wf) && /BRANCH: auto\/rover-positions/.test(wf), 'it runs the script and works on the branch auto/rover-positions');
  for (const f of ['registry/sites.yaml', 'site/js/data/sites.js', 'tests/fixtures/rover-waypoints.json']) check(wf.includes(f), `the workflow commits ${f}`);
  check(!/uses: (?!actions\/checkout@[0-9a-f]{40} |actions\/setup-python@v\d)/.test(wf), 'the workflow uses only the actions star-systems.yml uses, as pinned there');
  const ci = read('.github/workflows/ci.yml').split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  check(/run: python3 scripts\/refresh_rover_positions\.py --check/.test(ci), 'CI runs the script\'s --check, so a row the monthly run could not rewrite fails before the month ends');
}

if (problems.length) {
  console.log(`rover positions: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
const say = PAIRS.map((p) => `${p.name} at sol ${rowOf(p.rover).as_of_sol} (${rowOf(p.rover).as_of}), ${km(rowOf(p.rover), rowOf(p.landing)).toFixed(1)} km from ${p.landing}`).join('; ');
console.log(`rover positions ok: ${say}; each within ${TOLERANCE_M} m of NASA's waypoint; the landing places, the grounds, the 2021 events and the words in eleven languages hold`);
