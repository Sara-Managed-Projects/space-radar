// tests/test_starsnotable.mjs -- famous stars (registry/stars-notable.yaml, 2026-09-22).
//
// Before this list no star record carried `meta.why`, so on a rung of the ladder ui/labels.js named
// a star only once it was selected, and Vega's card said what any star's card says. What is asserted:
// every row reaches a star record and puts its line on it; the labels treat those stars as notable
// and, looking at Sirius on the stellar rung, name the famous ones nearest the camera; the card
// prints the line and where it was read; a renamed star is still found by the names file's name.
//
//   node tests/test_starsnotable.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { STARS_NOTABLE } = await import(join(JS, 'data/starsnotable.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { isNotable, isOwnPlaceOnLadder, isNotableHere, chooseLabels, labelName, NOTABLE_CAP } = await import(join(JS, 'ui/labels.js'));
const { whyLine, rightNowFor } = await import(join(JS, 'ui/cards.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const namesDoc = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8'));
const recs = recordsFromNames(namesDoc.rows);
const byId = new Map(recs.map((r) => [r.id, r]));

// 1. every row reaches exactly one star record, which carries its line, its source and its name
check(STARS_NOTABLE.length >= 35, `about forty famous stars (${STARS_NOTABLE.length})`);
const famous = [];
for (const row of STARS_NOTABLE) {
  const hits = row.hip ? [byId.get(`hip-${row.hip}`)].filter(Boolean) : recs.filter((r) => !r.meta.hip && r.meta.aliases.concat(r.name).includes(row.proper));
  if (hits.length !== 1) { problems.push(`${row.name}: ${hits.length} star records, not one`); continue; }
  const r = hits[0];
  famous.push(r);
  check(r.klass === 'star' && r.layer === 'stars', `${row.name} is a star record on the stars layer`);
  check(r.meta.why === row.why && r.meta.whySource === row.source, `${row.name} carries its line and its source`);
  check(r.name === row.name && labelName(r) === row.name.slice(0, 34), `${row.name} is named as people name it (${r.name} / ${labelName(r)})`);
  check(row.why.length <= 160 && !row.why.includes('--'), `${row.name}: the line fits the card and has no double hyphen`);
  check(isNotable(r) && isOwnPlaceOnLadder(r) && isNotableHere(r, true), `${row.name} is notable, and its own place on the ladder`);
  // ...and only there: on a world stage the stars are a shell of directions, and the Sun's stage
  // would otherwise hand the planets' label slots to Sirius and Vega
  check(!isNotableHere(r, false), `${row.name} does not compete for a label on a world stage`);
}
check(new Set(famous.map((r) => r.id)).size === famous.length, 'no star has two rows');
check(isNotableHere({ id: 'mars', klass: 'world', meta: {} }, false) && isNotableHere({ klass: 'exotic', meta: { why: 'x' } }, true), 'worlds and extreme objects keep their labels where they had them');
// ...and nothing else got one: the line is the registry's, never a default
const withWhy = recs.filter((r) => r.meta.why);
check(withWhy.length === STARS_NOTABLE.length, `only the listed stars carry a line (${withWhy.length} of ${recs.length})`);
// Betelgeuse is an extreme object with its own fact sheet; its star record stays a plain star
const betel = byId.get('hip-27989');
check(betel && !betel.meta.why && EXOTICS.some((x) => x.name === 'Betelgeuse'), 'Betelgeuse keeps its line in exotics.yaml, not a second one here');
// The one star with no HIP number is reached by its proper name
const wolf = famous.find((r) => r.name === 'Wolf 359');
check(wolf && wolf.id.startsWith('hyg-') && wolf.meta.why, `Wolf 359, which Hipparcos never catalogued, still gets its line (${wolf && wolf.id})`);

// 2. a renamed star keeps the names file's name as an alias, and search finds it both ways
const alphaA = byId.get('hip-71683');
check(alphaA && alphaA.name === 'Alpha Centauri A' && alphaA.meta.aliases[0] === 'Rigil Kentaurus', `Alpha Centauri A keeps "Rigil Kentaurus" first among its aliases (${alphaA && alphaA.meta.aliases})`);
const tauCeti = byId.get('hip-8102');
check(tauCeti && tauCeti.name === 'Tau Ceti' && tauCeti.meta.aliases.includes('τ Cet') && tauCeti.meta.aliases.includes('HIP 8102'), `Tau Ceti keeps its Bayer and HIP names (${tauCeti && tauCeti.meta.aliases})`);
const sirius = byId.get('hip-32349');
check(sirius && sirius.name === 'Sirius' && !sirius.meta.aliases.includes('Sirius'), 'a star already called by its famous name is not aliased to itself');
const index = buildIndex(recs, LAYERS);
for (const [q, id] of [['tau ceti', 'hip-8102'], ['alpha centauri a', 'hip-71683'], ['rigil kentaurus', 'hip-71683'], ['epsilon eridani', 'hip-16537'], ['51 pegasi', 'hip-113357'], ['helvetios', 'hip-113357'], ['sirius', 'hip-32349']]) {
  const top = findMatches(index, q).hits[0];
  check(top && top.record.id === id, `"${q}" finds ${id} first (got ${top && top.record.id} ${top && top.name})`);
}
// The one cost, measured 2026-09-22: "ran" was Epsilon Eridani's own name and ranked first; as an
// alias it ranks below two stars whose NAMES start with it (Rana, Rangifer). It is still found.
check(findMatches(index, 'ran').hits.slice(0, 3).some((h) => h.record.id === 'hip-16537'), '"ran" still finds Epsilon Eridani among the first three');

// 3. the card prints the line, and says where it was read, under its own label
const ctx = { clock: { now: () => Date.UTC(2026, 8, 22) }, worlds: null, selected: () => null };
check(whyLine(sirius) === sirius.meta.why, 'the card prints Sirius\'s line');
const rows = rightNowFor(sirius, ctx);
const src = rows.find(([k]) => k === COPY.card.rows.whySource);
check(src && src[1] === sirius.meta.whySource, `the card says where the line was read (${src && src[1]})`);
check(!rows.some(([k]) => k === COPY.card.rows.source), 'and not as "Read from", which would claim the HYG rows too');
const plainStar = recs.find((r) => !r.meta.why);
check(whyLine(plainStar) === null && !rightNowFor(plainStar, ctx).some(([k]) => k === COPY.card.rows.whySource), 'a star with no line prints none');
// An extreme object's line was mirrored "for the card", and a deep-sky row's was checked as "what
// the card prints", and neither was printed; both are now.
const sgr = { id: 'exotic-sgr-a-star', klass: 'exotic', name: 'Sagittarius A*', meta: { why: EXOTICS[0].why } };
check(whyLine(sgr) === EXOTICS[0].why, 'an extreme object\'s registry line is printed too');
const lmcRow = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'lmc');
check(lmcRow && whyLine({ klass: 'dso', name: lmcRow.name, meta: { why: lmcRow.why } }) === lmcRow.why, 'a hand-placed deep-sky object\'s line is printed too');
// A satellite's `why` has no source and ranks labels; the card does not print it as a claim.
check(whyLine({ klass: 'station', name: 'ISS (ZARYA)', meta: { why: 'Seven people live here.' } }) === null, 'a satellite\'s unsourced `why` is not printed');
// The bundled asteroids, craft and reentries each carry a hand-kept `note`, which no card printed;
// their `why` is the honesty line, which stays out of this paragraph.
{
  const { sampleAsteroids, sampleDeepSpace, sampleReentries } = await import(join(JS, 'data/sample.js'));
  const bundled = [...sampleAsteroids(), ...sampleDeepSpace(), ...sampleReentries(Date.UTC(2026, 8, 22))];
  const noted = bundled.filter((r) => r.meta && r.meta.note);
  check(noted.length >= 23, `the bundled rows carry their notes (${noted.length})`);
  for (const r of noted) check(whyLine(r) === r.meta.note, `${r.id}: the card prints its note`);
  const bennu = noted.find((r) => r.id === 'asteroid-101955');
  check(bennu && whyLine(bennu) !== bennu.meta.why, 'a bundled row\'s honesty `why` is not printed as its note');
  check(whyLine({ klass: 'station', meta: { note: 'x' } }) === null, 'a satellite\'s note is not printed');
}

// 4. labels on the stellar rung: from three light-years behind the Sun, looking at Sirius, the
// famous stars in view are named nearest first -- Sirius, then Epsilon Eridani, Procyon, Kapteyn's
// Star (measured 2026-09-22) -- where before this list none of them was named at all
{
  const tMs = Date.parse('2026-09-22T12:00:00Z');
  stage.setWorld('stellar'); stage.setTime(tMs);
  const at = (r) => { const p = propagate(r, tMs); return p && stage.toScene(p, p.frame, tMs); };
  const s = at(sirius);
  const camera = new THREE.PerspectiveCamera(60, 1280 / 800, 1e-5, 1e9);
  camera.position.copy(s.clone().normalize().multiplyScalar(-3));
  camera.lookAt(s);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const w = 1280, h = 800;
  const cands = [];
  // the filter ui/labels.js candidatesNow applies to a layer's records, on a ladder stage
  for (const r of recs) {
    if (!isNotableHere(r, true)) continue;
    const v = at(r);
    if (!v) continue;
    const dist = v.distanceTo(camera.position);
    v.project(camera);
    if (v.z > 1 || v.z < -1) continue;
    const x = (v.x + 1) * 0.5 * w, y = (1 - v.y) * 0.5 * h;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    cands.push({ record: r, kind: 'notable', x, y, dist });
  }
  const chosen = chooseLabels(cands);
  check(cands.length >= 4, `several famous stars are in view (${cands.map((c) => c.record.name)})`);
  check(chosen.length >= 4 && chosen[0].record.id === 'hip-32349', `Sirius is the nearest labelled star, and not the only one (${chosen.map((c) => c.record.name)})`);
  check(chosen.every((c, i) => i === 0 || c.dist >= chosen[i - 1].dist), 'nearest first');
  check(chosen.length <= NOTABLE_CAP && chosen.every((c) => c.record.meta.why), 'every star label is a famous star, within the cap');
  stage.setWorld('earth');
}

if (problems.length) { console.error('famous stars FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`famous stars ok: ${famous.length} rows each reach one star record with its line and source, labels name them on the ladder, the card prints the line, search finds renamed stars both ways`);
