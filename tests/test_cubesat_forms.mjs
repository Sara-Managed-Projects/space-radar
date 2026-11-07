// tests/test_cubesat_forms.mjs -- a catalogued CubeSat is drawn as the form factor a source names for it (release 2.0.0, batch m2-buses; forge #118).
//
// Every name that looked like a CubeSat wore one 3U with wings: Flock's 105, Lemur's 95 (of which 44 are not 3U), Starling's 4. registry/cubesats.yaml names the form of 576 catalogue
// numbers from McDowell's GCAT (`Bus`, `Shape`, with the JCAT number), and the browser reads the mirror site/js/data/cubesats.js. Held here, with no browser:
//   1. Every row has a JCAT number, a GCAT shape and one of the five forms drawn (1U, 2U, 3U, 6U, 12U); wings only on 3U, 6U and 12U, and only where GCAT's shape says two panels.
//   2. realModelFor() answers every row with the file of that form (cubesat-<form>[-wings].glb), generic, whatever the object is called.
//   3. The name routes (Flock, Lemur, Starling) take the sourced form when there is one, and keep their old 3U/6U build when there is not.
//   4. The files exist and are rows of the registry at the standard's own size.
//   node tests/test_cubesat_forms.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const { realModelFor, REAL_MODELS } = await import(pathToFileURL(join(ROOT, 'site/js/scene/realmodels.js')).href);
const { CUBESAT_NORADS } = await import(pathToFileURL(join(ROOT, 'site/js/data/cubesats.js')).href);

const rows = readFileSync(join(ROOT, 'registry/cubesats.yaml'), 'utf8').split('\n').filter((l) => /^  - \{/.test(l)).map((l) => JSON.parse(l.slice(4)));
check(rows.length >= 500, `registry/cubesats.yaml was read (${rows.length} rows)`);

// 1
const FORMS = ['1u', '2u', '3u', '6u', '12u'];
const seen = new Set(); const counts = {};
for (const r of rows) {
  check(Number.isInteger(r.norad) && !seen.has(r.norad), `${r.name}: ${r.norad} is listed twice`);
  seen.add(r.norad);
  check(FORMS.includes(r.form), `${r.name}: form ${r.form} is not one of the five drawn`);
  check(/^S\d+/.test(String(r.jcat || '')) && String(r.shape || '').length > 0, `${r.name}: no GCAT citation (jcat, shape)`);
  const two = /^Box\s*\+\s*2\s*pan$/i.test(String(r.shape).trim());
  const plain = /^Box$/i.test(String(r.shape).trim());
  check(r.wings === two && (r.wings || plain), `${r.name}: wings=${r.wings} does not follow GCAT's shape '${r.shape}'`);
  if (r.wings) check(['3u', '6u', '12u'].includes(r.form), `${r.name}: a ${r.form} with wings has no file`);
  const key = r.form + (r.wings ? '-wings' : '');
  counts[key] = (counts[key] || 0) + 1;
}

// 2
const rec = (norad, name, klass = 'satellite') => ({ id: `sat-${norad}`, name, klass, layer: 'active', meta: { noradId: norad } });
for (const r of rows) {
  const want = `cubesat-${r.form}${r.wings ? '-wings' : ''}.glb`;
  const got = realModelFor(rec(r.norad, r.name));
  check(got && got.file === want && got.generic === true, `${r.name} (${r.norad}): wears ${got && (got.file || got.build)}, the registry says ${want}`);
  const odd = realModelFor(rec(r.norad, 'SOMETHING ELSE ENTIRELY'));
  check(odd && odd.file === want, `${r.name}: the form follows the number, and a renamed object lost it`);
}
for (const [k, v] of Object.entries(counts)) check(JSON.stringify(CUBESAT_NORADS[k]) === JSON.stringify(rows.filter((r) => r.form + (r.wings ? '-wings' : '') === k).map((r) => r.norad).sort((a, b) => a - b)), `data/cubesats.js disagrees with the registry about ${k} (${v})`);

// 3. the name routes
const lemur6 = rows.find((r) => r.form === '6u' && /^LEMUR/.test(r.name));
if (lemur6) check(realModelFor(rec(lemur6.norad, lemur6.name)).file === `cubesat-6u${lemur6.wings ? '-wings' : ''}.glb`, 'a Lemur that GCAT calls 6U is not drawn as a 3U');
const unsourcedFlock = realModelFor(rec(99991, 'FLOCK 4Z-99'));
check(unsourcedFlock && unsourcedFlock.build === 'cubesat' && !unsourcedFlock.file && unsourcedFlock.generic === true, 'a Flock with no sourced form keeps its 3U build');
const unsourcedStarling = realModelFor(rec(99992, 'STARLING-9'));
check(unsourcedStarling && unsourcedStarling.build === 'cubesat-6u', 'a Starling with no sourced form keeps its 6U build');
check(!realModelFor(rec(99993, 'SOME DEBRIS', 'debris')) || !String(realModelFor(rec(99993, 'SOME DEBRIS', 'debris')).file || '').startsWith('cubesat'), 'debris never wears a CubeSat');

// 4
for (const [key, entry] of Object.entries(REAL_MODELS.cubeForm)) {
  check(existsSync(join(ROOT, 'site/models', entry.file)) && entry.file === `cubesat-${key}.glb`, `cubeForm ${key}: ${entry.file} is not on disc or is misnamed`);
  check(counts[key] > 0, `cubeForm ${key} reaches no catalogue number`);
}
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const dims = { '1u': [0.1, 0.1, 0.1135], '2u': [0.1, 0.1, 0.227], '3u': [0.1, 0.1, 0.3405], '6u': [0.2263, 0.1, 0.366], '12u': [0.2263, 0.2263, 0.366] };
for (const key of Object.keys(REAL_MODELS.cubeForm)) {
  const row = new RegExp(`id: cubesat-${key}, .*?body_x_m: ([\\d.]+), body_y_m: ([\\d.]+), body_z_m: ([\\d.]+)`).exec(yaml);
  check(!!row && [1, 2, 3].every((i) => Math.abs(Number(row[i]) - dims[key.replace('-wings', '')][i - 1]) < 1e-9), `cubesat-${key}: the registry row's body is not the standard's size`);
}

if (problems.length) { console.error('cubesat forms FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`cubesat forms ok: ${rows.length} catalogue numbers drawn as their form (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}); the name routes keep their build where no form is sourced`);
