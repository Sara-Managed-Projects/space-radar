// tests/test_dso.mjs -- spec 0028 step 5: nebulae, clusters and galaxies at their measured distances.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { parseDso, skyToSunInertialKm } = await import(join(JS, 'data/parsers.js'));
const { LY_KM } = await import(join(JS, 'scene/stars3d.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));

const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
check(doc.count === 111 && doc.objects.length === 111, `110 Messier objects and the LMC (${doc.count})`);
check(doc.openNgcTotal > 13000, `the file says how many OpenNGC objects exist without a distance (${doc.openNgcTotal})`);
const m31 = doc.objects.find((o) => o.id === 'm31');
check(m31 && m31.distLy === 2540000 && m31.distLyLow === 2430000 && m31.kind === 'galaxy' && m31.common === 'Andromeda Galaxy', 'M31 is Andromeda, 2.43-2.65 Mly, a galaxy');
// the stored position agrees with the shared sky -> ecliptic rotation
const p31 = skyToSunInertialKm(m31.raDeg, m31.decDeg, m31.distLy / 3.2615637771674333);
check(Math.abs(p31.x / LY_KM - m31.posLy[0]) < 1 && Math.abs(p31.z / LY_KM - m31.posLy[2]) < 1, 'the build script and the browser agree on where the sky is');
check(doc.objects.every((o) => o.distLy > 0 && o.distanceSource), 'every object has a distance and says where it came from');
check(doc.objects.some((o) => o.id === 'lmc' && o.distLy === 163000), 'the LMC is a hand row at 163 000 ly');
check(doc.objects.find((o) => o.id === 'm45')?.kind === 'cluster', 'the Pleiades (from the addendum) are a cluster');

const recs = parseDso(doc);
check(recs.length === 111 && recs.every((r) => r.klass === 'dso' && r.propagator === 'static' && r.layer === 'deep-sky'), 'one static dso record per object');
const andromeda = recs.find((r) => r.id === 'dso-m31');
check(andromeda.name === 'Andromeda Galaxy' && andromeda.meta.aliases.includes('M31') && andromeda.meta.aliases.includes('NGC 224'), `Andromeda carries M31 and NGC 224 as aliases (${andromeda.meta.aliases})`);
check(andromeda.meta.sizeLy > 120000 && andromeda.meta.sizeLy < 140000, `Andromeda's size follows from 177.83 arcmin at 2.54 Mly (${andromeda.meta.sizeLy} ly)`);

const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('stellar'); stage.setTime(tMs);
const pp = propagate(andromeda, tMs);
const sc = pp && stage.toScene(pp, pp.frame, tMs);
check(sc && Math.abs(sc.length() - 2540000) < 100, `on the stellar rung Andromeda is ${sc && Math.round(sc.length())} units (light-years) out`);
stage.setWorld('earth');

const row = LAYERS.find((l) => l.id === 'deep-sky');
check(!!row && row.parse === 'dso' && row.bundledText === 'data/dso.json' && row.source === 'bundled' && row.noModel === true, 'the deep-sky layer row is bundled JSON through bundledText');
const index = buildIndex(recs, LAYERS);
check(findMatches(index, 'andromeda').hits[0]?.record.id === 'dso-m31', '"andromeda" finds M31');
check(findMatches(index, 'm31').hits[0]?.record.id === 'dso-m31', '"m31" finds M31 by alias');
check(findMatches(index, 'pleiades').hits[0]?.record.id === 'dso-m45', '"pleiades" finds M45');
check(findMatches(index, 'ngc 224').hits.some((h) => h.record.id === 'dso-m31'), '"ngc 224" finds M31');
check(typeof drawingLine(andromeda) === 'string' && drawingLine(andromeda).includes('soft mark'), `a deep-sky object says how it is drawn: ${drawingLine(andromeda)}`);

if (problems.length) { console.error('dso FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('dso ok: 110 Messier objects and the LMC at sourced distances, Andromeda 2.54 Mly on the stellar rung, found by name, M-number and NGC number');
