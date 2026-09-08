// tests/test_exotics.mjs -- spec 0028 step 7: black holes and other extremes, each with its source.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));
const LY = 9460730472580.8;

check(EXOTICS.length === 14, `fourteen fact sheets (${EXOTICS.length})`);
const bet = EXOTICS.find((x) => x.id === 'betelgeuse');
check(bet && bet.kind === 'star' && bet.distLyLow === 408 && bet.distLyHigh === 548 && bet.massMsun === 14 && bet.distance_note, 'Betelgeuse: a star with two published distances kept as a range, and a note saying why');
const mag = EXOTICS.find((x) => x.id === 'sgr-1806-20');
check(mag && mag.kind === 'magnetar' && Math.abs(mag.periodS - 7.55592) < 1e-9 && mag.distLy === 42000, 'SGR 1806-20: the first magnetar row, with its 7.56 s period');
check(EXOTICS.every((x) => x.source && x.why && Number.isFinite(x.raDeg) && Number.isFinite(x.decDeg) && x.distLy > 0), 'every row has a source, a why, a position and a distance');
const sgr = EXOTICS.find((x) => x.id === 'sgr-a-star');
check(sgr && Math.abs(sgr.raDeg - 266.41684) < 0.001 && Math.abs(sgr.decDeg + 29.00781) < 0.001, `Sgr A* converts to RA 266.4168 Dec -29.0078 (${sgr && sgr.raDeg}, ${sgr && sgr.decDeg})`);
check(sgr.massMsun === 4297000 && sgr.distLy === 26996, 'Sgr A*: 4.297 million Suns, 26 996 ly');
const cyg = EXOTICS.find((x) => x.id === 'cygnus-x-1');
check(cyg.massMsunLow === 13.8 && cyg.massMsunHigh === 17.5 && Math.abs(cyg.massMsun - 15.65) < 1e-9, 'a mass range becomes low/high/mid');
const lgm = EXOTICS.find((x) => x.id === 'psr-b1919-21');
check(lgm.distLyLow === 300 && lgm.distLyHigh === 3600 && lgm.periodS > 1.33, 'the first pulsar keeps its distance range and its period');
const ton = EXOTICS.find((x) => x.id === 'ton-618');
check(ton.distance_note && ton.distance_note.includes('light-travel'), 'TON 618 says what kind of distance it quotes');

const row = LAYERS.find((l) => l.id === 'exotics');
check(!!row && row.noModel === true && row.klass === 'exotic' && typeof row.sample === 'function', 'the exotics layer row exists, no hero model');
const recs = row.sample();
check(recs.length === 14 && recs.every((r) => r.propagator === 'static' && r.frame === 'sun-inertial' && r.meta.source), 'fourteen static records carrying their sources');

// Sgr A* sits where the galaxy record put the centre, and M87* where the deep-sky layer put M87
const galaxyRow = LAYERS.find((l) => l.id === 'galaxy');
const [mw] = galaxyRow.sample();
const sgrRec = recs.find((r) => r.id === 'exotic-sgr-a-star');
const angle = (a, b) => Math.acos(Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / (Math.hypot(a.x, a.y, a.z) * Math.hypot(b.x, b.y, b.z)))) * 180 / Math.PI;
check(angle(sgrRec.pos, mw.pos) < 0.2, `Sgr A* is within 0.2 deg of the Milky Way record's centre (${angle(sgrRec.pos, mw.pos).toFixed(3)})`);
check(Math.abs(Math.hypot(sgrRec.pos.x, sgrRec.pos.y, sgrRec.pos.z) / LY - 26996) < 1, 'Sgr A* is 26 996 ly out in km');
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { readFileSync } = await import('node:fs');
const dso = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
const m87 = dso.find((r) => r.id === 'dso-m87');
const m87star = recs.find((r) => r.id === 'exotic-m87-star');
check(m87 && angle(m87.pos, m87star.pos) < 0.05, `M87* sits on M87 (${m87 && angle(m87.pos, m87star.pos).toFixed(4)} deg)`);
check(Math.abs(m87star.meta.distLy / m87.meta.distLy - 1) < 0.02, `M87* and M87 agree on the distance within 2% (${m87star.meta.distLy} vs ${m87.meta.distLy})`);

const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('stellar'); stage.setTime(tMs);
const p = propagate(cygRecord(), tMs);
function cygRecord() { return recs.find((r) => r.id === 'exotic-cygnus-x-1'); }
const v = p && stage.toScene(p, p.frame, tMs);
check(v && Math.abs(v.length() - 7300) < 1, `Cygnus X-1 is 7 300 units out on the stellar rung (${v && v.length().toFixed(1)})`);
stage.setWorld('earth');

const index = buildIndex(recs, LAYERS);
check(findMatches(index, 'sagittarius a').hits[0]?.record.id === 'exotic-sgr-a-star', '"sagittarius a" finds Sgr A*');
check(findMatches(index, 'powehi').hits[0]?.record.id === 'exotic-m87-star', '"powehi" finds M87* by alias');
check(findMatches(index, 'lgm').hits[0]?.record.id === 'exotic-psr-b1919-21', '"lgm" finds the first pulsar');
check(typeof drawingLine(sgrRec) === 'string' && drawingLine(sgrRec).includes('ring'), `an extreme object says it is drawn as a ring: ${drawingLine(sgrRec)}`);

if (problems.length) { console.error('exotics FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('exotics ok: fourteen fact sheets with sources; Sgr A* on the galaxy\'s centre, M87* on M87, Cygnus X-1 7 300 ly out; found by name and alias');
