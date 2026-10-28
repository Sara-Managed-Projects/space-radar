// tests/test_exopack.mjs -- the packed exoplanets (release 1.5.0, 0079 a13): site/data/exoplanets.bin
// decodes to the planets of site/data/exoplanets.csv, one for one, to the quantisation the pack states.
//
//   node tests/test_exopack.mjs
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(ROOT, 'site/js', rel)).href);

const { decodeExoplanets, readHeader } = await mod('data/exopack.js');
const { parseExoplanets } = await mod('data/parsers.js');

const bin = readFileSync(join(ROOT, 'site/data/exoplanets.bin'));
const buf = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
const csv = readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8');
const want = parseExoplanets(csv);
const got = decodeExoplanets(buf);
const { header } = readHeader(buf);

check(got.length === want.length && got.length === header.n, `every planet of the CSV is in the pack (${got.length} of ${want.length}, header ${header.n})`);
check(header.asOf === csv.match(/as of (\d{4}-\d{2}-\d{2})/)[1], `the pack and the CSV are of the same day (${header.asOf})`);
const gz = gzipSync(bin, { level: 9 }).length;
check(gz < 150000, `the pack is about 130 kB gzipped (${gz} B)`);
check(bin.length < 300000, `and under 300 kB raw (${bin.length} B)`);

const byId = new Map(want.map((r) => [r.id, r]));
const rel = (a, b) => (a === null || b === null ? a === b : Math.abs(a - b) <= Math.abs(b) * 4e-4 + 1e-9);
let worst = 0;
for (const g of got) {
  const w = byId.get(g.id);
  if (!w) { check(false, `${g.id} is not in the CSV`); continue; }
  check(g.name === w.name && g.klass === 'exoplanet' && g.layer === 'exoplanets' && g.propagator === 'static' && g.frame === 'sun-inertial' && g.cls === 'measured', `${g.id}: the same kind of record`);
  const dx = Math.hypot(g.pos.x - w.pos.x, g.pos.y - w.pos.y, g.pos.z - w.pos.z) / Math.hypot(w.pos.x, w.pos.y, w.pos.z);
  worst = Math.max(worst, dx);
  check(dx < 2e-6, `${g.id}: sits at its star to a millionth of its distance (${dx})`);
  const a = g.meta, b = w.meta;
  check(a.host === b.host && a.method === b.method && a.starSpect === b.starSpect && a.discYear === b.discYear && a.starTeffK === b.starTeffK, `${g.id}: host, method, spectral type, year, temperature`);
  check(Math.abs(a.distLy - b.distLy) < 0.0051, `${g.id}: distance ${a.distLy} against ${b.distLy}`);
  check(rel(a.radiusEarths, b.radiusEarths) || Math.abs(a.radiusEarths - b.radiusEarths) <= 0.0051, `${g.id}: radius ${a.radiusEarths} against ${b.radiusEarths}`);
  check(rel(a.starRadiusSuns, b.starRadiusSuns) || Math.abs(a.starRadiusSuns - b.starRadiusSuns) <= 0.0051, `${g.id}: star radius`);
  check(rel(a.massEarths, b.massEarths), `${g.id}: mass ${a.massEarths} against ${b.massEarths}`);
  check(rel(a.periodDays, b.periodDays), `${g.id}: period ${a.periodDays} against ${b.periodDays}`);
  check(a.asOf === header.asOf && a.drawnAtStar === true && /NASA Exoplanet Archive/.test(a.cite) && a.aliases[0] === a.host, `${g.id}: dated, drawn at its star, cited, found by its host`);
  if (problems.length > 40) break;
}
const prox = got.find((r) => r.name === 'Proxima Cen b');
check(prox && prox.meta.host === 'Proxima Cen' && Math.abs(prox.meta.distLy - 4.25) < 0.02, 'Proxima b is of Proxima Cen, 4.25 light-years out');
for (const n of ['HR 8799 b', 'HR 8799 e', 'bet Pic b', 'bet Pic c', '51 Eri b', 'PDS 70 b', 'PDS 70 c', 'AF Lep b']) check(got.some((r) => r.name === n), `${n} is in the pack`);
check((() => { try { readHeader(new ArrayBuffer(16)); return false; } catch { return true; } })(), 'a buffer that is not a pack is refused');

if (problems.length) { console.error('exopack FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`exopack ok: ${got.length} planets, ${bin.length} B raw, ${gz} B gzipped, worst position error ${worst.toExponential(1)} of the distance`);
