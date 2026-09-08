// tests/test_exoplanets.mjs -- spec 0028 step 4: every confirmed planet around another star, at its star.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { parseExoplanets, splitCsvLine, skyToSunInertialKm } = await import(join(JS, 'data/parsers.js'));
const { recordsFromNames, LY_KM } = await import(join(JS, 'scene/stars3d.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));
const { SOURCES } = await import(join(JS, 'data/sources.js'));

// 1. the CSV splitter honours quotes
check(JSON.stringify(splitCsvLine('"HD 2039 b","HD 2039",6.08,-56.6,"Radial Velocity",,x')) === JSON.stringify(['HD 2039 b', 'HD 2039', '6.08', '-56.6', 'Radial Velocity', '', 'x']), 'quoted fields and empties split correctly');
check(JSON.stringify(splitCsvLine('a,"say ""hi"", ok",b')) === JSON.stringify(['a', 'say "hi", ok', 'b']), 'doubled quotes inside a quoted field');

// 2. the harvester fixture (what the archive really sends) and the bundled copy both parse
const fixture = readFileSync(join(ROOT, 'tests/fixtures/harvest/nasa_exoplanet_archive.csv'), 'utf8');
const fx = parseExoplanets(fixture);
check(fx.length === 12, `the 12-row fixture gives 12 records (${fx.length})`);
check(fx[0].klass === 'exoplanet' && fx[0].propagator === 'static' && fx[0].frame === 'sun-inertial' && fx[0].cls === 'measured', 'a static, measured exoplanet record');
check(fx[0].meta.asOf === null, 'a snapshot body carries no as-of date');
const bundled = readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8');
const all = parseExoplanets(bundled);
check(all.length > 6000 && all.length < 7000, `the bundled copy gives a few thousand planets (${all.length})`);
check(all[0].meta.asOf === '2026-09-08', `the bundled copy's records say as of 2026-09-08 (${all[0].meta.asOf})`);
check(all.every((r) => Number.isFinite(r.pos.x) && r.meta.distLy > 0), 'every record has a position and a distance');
const ids = new Set(all.map((r) => r.id));
check(ids.size === all.length, `ids are unique (${ids.size} of ${all.length})`);

// 3. a planet sits on its star: Proxima b at Proxima Centauri (HYG)
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows;
const proxStar = recordsFromNames(names).find((r) => r.name === 'Proxima Centauri');
const proxB = all.find((r) => r.name === 'Proxima Cen b');
check(!!proxB, 'Proxima Cen b is in the catalogue');
if (proxB && proxStar) {
  const dLy = Math.hypot(proxB.pos.x - proxStar.pos.x, proxB.pos.y - proxStar.pos.y, proxB.pos.z - proxStar.pos.z) / LY_KM;
  check(dLy < 0.05, `Proxima b lands within 0.05 ly of Proxima Centauri's HYG position (${dLy.toFixed(3)} ly)`);
  check(proxB.meta.host === 'Proxima Cen' && Math.abs(proxB.meta.distLy - 4.24) < 0.1, `its host and distance are right (${proxB.meta.host}, ${proxB.meta.distLy})`);
}
const v = skyToSunInertialKm(0, 90, 1); // the north celestial pole, 1 pc: on the ecliptic axes it tilts by the obliquity
check(Math.abs(Math.atan2(v.z, Math.hypot(v.x, v.y)) * 180 / Math.PI - (90 - 23.4392911)) < 1e-6, 'the equatorial -> ecliptic rotation is the obliquity');

// 4. propagate + the stellar rung
const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('stellar'); stage.setTime(tMs);
const p = propagate(proxB, tMs);
const sc = p && stage.toScene(p, p.frame, tMs);
check(sc && Math.abs(sc.length() - 4.24) < 0.1, `on the stellar rung Proxima b is ${sc && sc.length().toFixed(2)} units out`);
stage.setWorld('earth');

// 5. the layer row, the source row, search by host, the drawing line
const row = LAYERS.find((l) => l.id === 'exoplanets');
check(!!row && row.parse === 'exoplanets' && row.bundledText === 'data/exoplanets.csv' && row.noModel === true && row.source === 'nasa-exoplanet-archive', 'the exoplanets layer row is snapshot-first with a dated bundled copy');
check(SOURCES['nasa-exoplanet-archive'] && SOURCES['nasa-exoplanet-archive'].browser === false && SOURCES['nasa-exoplanet-archive'].kind === 'text', 'the source row is a no-CORS text source');
const index = buildIndex(all, LAYERS);
check(findMatches(index, 'trappist-1 e').hits[0]?.record.name === 'TRAPPIST-1 e', '"trappist-1 e" finds TRAPPIST-1 e');
check(findMatches(index, 'kepler-452').hits.some((h) => h.record.name === 'Kepler-452 b'), '"kepler-452" finds Kepler-452 b by its host');
check(typeof drawingLine(proxB) === 'string' && drawingLine(proxB).includes('at its star'), `an exoplanet says it is drawn at its star: ${drawingLine(proxB)}`);

if (problems.length) { console.error('exoplanets FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`exoplanets ok: ${all.length} planets from the dated copy, the 12-row fixture parses, Proxima b sits on Proxima Centauri, search finds them by name and host`);
