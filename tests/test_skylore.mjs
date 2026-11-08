// tests/test_skylore.mjs -- forge #143: a story for every figure of every sky culture, and the pictures of
// the cultures beyond the western one.
//
//   node tests/test_skylore.mjs
//
// No browser: the pure halves of sky/skyculture.js (which figure a tap means) and ui/skystory.js (what the
// card says), the data files against scripts/build-skylore.py --check, every picture pinned to the stars
// Stellarium pins it to, and the Pictures toggle's words against the cultures that have pictures.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const DEG = Math.PI / 180;
const dir = (ra, dec) => [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];
const sep = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;

const { figureHits, figureAt, arcDistance, artQuad, tapLore } = await import(join(ROOT, 'site/js/sky/skyculture.js'));
const { storyFor, sourceLines } = await import(join(ROOT, 'site/js/ui/skystory.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const { CULTURE_IDS } = await import(join(ROOT, 'site/js/sky/skymath.js'));

// ---- arcDistance: to the arc where the foot is on it, else to the nearer end --------------------------
check(Math.abs(arcDistance(dir(5, 1), dir(0, 0), dir(10, 0)) / DEG - 1) < 1e-9, 'a point 1° above the middle of an arc on the equator is 1° from it');
check(Math.abs(arcDistance(dir(12, 0), dir(0, 0), dir(10, 0)) / DEG - 2) < 1e-9, 'a point past the end of an arc is as far as the end');
check(arcDistance(dir(5, 0), dir(0, 0), dir(10, 0)) < 1e-9, 'a point on the arc is on it');
check(arcDistance(dir(3, 4), dir(3, 4), dir(3, 4)) < 1e-6, 'an arc of no length is its point');

// ---- figureHits and figureAt: the figure whose lines pass nearest, within reach -----------------------
const doc = { figures: [
  { name: 'Belt', native: 'Tau-toro', lines: [[83.0, -0.3, 84.05, -1.2, 85.19, -1.94]] },
  { name: 'Cross', lines: [[187.79, -57.11, 186.65, -63.1]] },
] };
const hits = figureHits(doc);
check(hits.length === 2 && hits[0].key === 'Belt' && hits[0].label === 'Tau-toro' && hits[0].ends.length === 4, 'one hit per figure, keyed by its name, labelled by its own word, two ends per segment');
const nearBelt = figureAt(hits, dir(84.0, -0.5), 3);
check(nearBelt && nearBelt.key === 'Belt' && nearBelt.sepDeg < 1, `a tap beside the belt names it (${JSON.stringify(nearBelt)})`);
check(figureAt(hits, dir(120, 30), 3) === null, 'a tap far from every line names none');
check(figureAt(hits, dir(187.2, -60), 3).key === 'Cross', 'a tap on the cross names the cross');
check(figureAt([], dir(0, 0), 3) === null && figureAt(null, dir(0, 0), 3) === null, 'no figures, no hit');

// ---- tapLore: the story a tap means (2.0.0 look finding 10) --------------------------------------------
// The Boorong sky chosen, a tap in Orion far from their lines opened the Greek hunter's story. In another people's sky a tap
// their figures do not reach says so and offers the nearest of theirs; the western story is only the western sky's.
{
  const tap = { culture: 'boorong', cultureName: 'Boorong', westernName: 'Western', hits, reachDeg: 3, con: 'Ori', conName: 'Orion' };
  const inReach = tapLore({ ...tap, dirEq: dir(84.0, -0.5) });
  check(inReach && inReach.culture === 'boorong' && inReach.key === 'Belt' && inReach.name === 'Tau-toro' && !inReach.away, `a tap on their figure is their figure's story (${JSON.stringify(inReach)})`);
  const far = tapLore({ ...tap, dirEq: dir(95, 10) });
  check(far && far.culture === 'boorong' && far.key === null && far.away && far.away.key === 'Belt' && far.away.name === 'Tau-toro' && far.away.deg > 5 && far.away.deg < 20,
    `a tap none of their figures reaches is not Orion's western story: it says so and offers their nearest (${JSON.stringify(far)})`);
  const none = tapLore({ ...tap, hits: [], dirEq: dir(95, 10) });
  check(none && none.culture === 'boorong' && none.away && none.away.key === null, 'a sky with no figure at all says so, and offers none');
  const west = tapLore({ ...tap, culture: 'western', cultureName: 'Western', dirEq: dir(95, 10) });
  check(west && west.culture === 'western' && west.key === 'Ori' && west.name === 'Orion' && !west.away, 'the western sky opens the IAU constellation\'s story');
  check(tapLore({ ...tap, culture: 'western', con: null, dirEq: dir(95, 10) }) === null, 'and nothing where the tap is in no constellation');
  const gs = readFileSync(join(ROOT, 'site/js/sky/groundsky.js'), 'utf8');
  check(/cultureMod\.tapLore\(\{ culture: cultureShown,/.test(gs), 'sky/groundsky.js asks tapLore for the story of a tap in another people\'s sky');
  check(/: chosen \? \{ culture: chosen, key: null, name: '', cultureName: [^}]+, away: \{ key: null/.test(gs), 'and a people\'s sky chosen whose figures have not landed yet says none is drawn, not the western story');
  const ss = readFileSync(join(ROOT, 'site/js/ui/skystory.js'), 'utf8');
  check(/const away = lore\.away;/.test(ss) && /W\.notHereTitle/.test(ss) && /W\.nearest/.test(ss) && /if \(away\) return;/.test(ss), 'ui/skystory.js says so plainly, offers the nearest figure\'s story, and fetches no story for the spot');
  for (const k of ['notHereTitle', 'notHere', 'notHereNone', 'nearest']) check(typeof COPY.skyLore[k] === 'string', `copy/en.later.js skyLore.${k} is written`);
}

// ---- the story files: one entry per figure the sky draws, for every culture ---------------------------
let told = 0;
let figures = 0;
for (const id of CULTURE_IDS) {
  const p = `site/data/skystories/${id}.json`;
  check(existsSync(join(ROOT, p)), `${p} is there`);
  if (!existsSync(join(ROOT, p))) continue;
  const d = json(p);
  check(d.licence === 'CC BY-SA 4.0' && /github\.com\/Stellarium\/stellarium\/tree\/[0-9a-f]{40}\/skycultures\//.test(d.source) && d.credit && d.lang === 'en', `${id}: licence, pinned source, credit and language`);
  const keys = id === 'western' ? json('site/data/skyart/index.json').figures.map((f) => f.id).concat(['Pup', 'Ser', 'Vel']) : json(`site/data/skycultures/${id}.json`).figures.map((f) => f.name);
  for (const k of keys) {
    const s = storyFor(d, k);
    check(!!s, `${id}: no story entry for ${k}`);
    if (!s) continue;
    figures += 1;
    if (s.from !== 'none') told += 1;
    if (s.from === 'ours' || s.more) check(!!s.cite, `${id}/${k}: our own words carry their source`);
  }
}
check(figures >= 470, `stories for every figure: ${figures}`);
check(told / figures > 0.98, `nearly every figure has a story (${told} of ${figures}); the rest say none is recorded`);
const ori = storyFor(json('site/data/skystories/western.json'), 'Ori');
check(ori && /hunter Orion/.test(ori.text) && ori.from === 'stellarium', 'Orion has the hunter, from Stellarium');

// ---- what the card says under a story -----------------------------------------------------------------
const W = COPY.skyLore;
check(!!W && W.honesty && W.none && W.fromStellarium.includes('{credit}') && W.ours.includes('{cite}'), 'the card\'s words are in copy/en.later.js skyLore');
const lines = sourceLines({ credit: 'X, CC BY-SA 4.0', licence: 'CC BY-SA 4.0' }, { text: 't', more: 'm', cite: 'Best 1922', from: 'stellarium' }, W);
check(lines.length === 3 && lines[0].includes('X, CC BY-SA 4.0') && lines[1].includes('Best 1922') && lines[2] === W.honesty, `a Stellarium story with our summary names both sources, then says it is illustrative (${lines.join(' | ')})`);
check(sourceLines({}, { from: 'none' }, W)[0] === W.none, 'a figure with no story says so');
check(storyFor({ stories: {} }, 'x') === null && storyFor(null, 'x') === null, 'no file, no story');

// ---- the pictures beyond the western ones ------------------------------------------------------------
const src = readFileSync(join(ROOT, 'site/js/sky/groundsky.js'), 'utf8');
const artCultures = JSON.parse((/export const ART_CULTURES = (\[[^\]]*\])/.exec(src) || [0, '[]'])[1].replace(/'/g, '"'));
check(artCultures[0] === 'western' && artCultures.length >= 3, `the western pictures and at least two more cultures' (${artCultures})`);
check(JSON.stringify(Object.keys(W.artTitles).sort()) === JSON.stringify(artCultures.slice(1).sort()), 'the Pictures toggle has a title for exactly the cultures with pictures');
for (const id of artCultures.slice(1)) {
  check(CULTURE_IDS.includes(id), `${id} is a culture the sky can show`);
  const idx = json(`site/data/skyart/${id}/index.json`);
  check(idx.licence === 'CC BY-SA 4.0' && idx.figures.length >= 4, `${id}: CC BY-SA 4.0, at least four pictures`);
  for (const f of idx.figures) {
    check(existsSync(join(ROOT, `site/data/skyart/${id}/${f.file}`)), `${id}/${f.file} is there`);
    const q = artQuad(f);
    // The Hawaiian backbone runs from the pole star to the Southern Cross: 67° from its middle to a corner.
    check(!!q && q.radiusRad < 80 * DEG, `${id}/${f.id}: the picture lies on the sky, not edge-on`);
    // The picture covers the three stars that pin it.
    if (q) for (const [, , ra, dec] of f.anchors) check(sep(q.centre, dir(ra, dec)) <= q.radiusRad / DEG + 0.01, `${id}/${f.id}: an anchor star lies inside its picture`);
  }
}

// ---- the builder's own check: budgets, licences, credits ----------------------------------------------
try {
  const out = execFileSync('python3', [join(ROOT, 'scripts/build-skylore.py'), '--check'], { encoding: 'utf8' });
  check(/^ok:/m.test(out), `build-skylore.py --check: ${out.trim()}`);
} catch (e) {
  check(false, `build-skylore.py --check failed: ${(e.stdout || e.message).trim()}`);
}

if (problems.length) {
  for (const p of problems) console.error(`FAIL ${p}`);
  process.exit(1);
}
console.log(`ok: ${figures} figures in ${CULTURE_IDS.length} cultures, ${told} with a story; pictures for ${artCultures.length - 1} cultures beyond the western one`);
