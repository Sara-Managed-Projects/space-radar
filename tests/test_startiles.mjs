// tests/test_startiles.mjs -- the star tiles of the sky from the ground (sky/startiles.js, internal
// #353), which constellation a point is in (sky/constellation.js, internal #417), and the star
// trails' geometry (sky/groundsky.js).
//   node tests/test_startiles.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const T = await import(join(JS, 'sky/startiles.js'));
const C = await import(join(JS, 'sky/constellation.js'));
const B = await import(join(JS, 'sky/skybodies.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;
const radec = (raDeg, decDeg) => [Math.cos(decDeg * DEG) * Math.cos(raDeg * DEG), Math.cos(decDeg * DEG) * Math.sin(raDeg * DEG), Math.sin(decDeg * DEG)];
const sep = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
let seed = 20261007;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const anywhere = () => { const z = 2 * rnd() - 1; const p = 2 * Math.PI * rnd(); const r = Math.sqrt(1 - z * z); return [r * Math.cos(p), r * Math.sin(p), z]; };

// --- 1. the addressing: HEALPix, RING ------------------------------------------------------------
check(T.npix(1) === 12 && T.npix(2) === 48 && T.npix(8) === 768, '12 nside^2 tiles');
for (const nside of [1, 2, 4, 8]) {
  let back = 0;
  for (let p = 0; p < T.npix(nside); p += 1) {
    const c = T.pix2dir(nside, p);
    if (Math.abs(Math.hypot(c[0], c[1], c[2]) - 1) > 1e-12 || T.ang2pix(nside, c) !== p) back += 1;
  }
  check(back === 0, `nside ${nside}: every tile's centre is in that tile (${back} are not)`);
}
// Known cells: the north pole's four tiles are 0 to 3, the south pole's the last four, and the
// point on the equator at right ascension 0 is in the equatorial belt.
check(T.ang2pix(2, radec(45, 89)) === 0 && T.ang2pix(2, radec(135, 89)) === 1 && T.ang2pix(2, radec(315, -89)) === 47, 'RING numbering starts at the north pole and ends at the south');
check(T.ang2pix(1, radec(0, 0)) === 4 && T.ang2pix(1, radec(45, 60)) === 0 && T.ang2pix(1, radec(45, -60)) === 8, 'the twelve base tiles are where HEALPix puts them');
// Equal areas, and nothing farther from its tile's centre than tileRadiusDeg says.
for (const level of T.LEVELS) {
  const n = T.npix(level.nside);
  const count = new Array(n).fill(0);
  let far = 0;
  const N = 200000;
  for (let i = 0; i < N; i += 1) {
    const d = anywhere();
    const p = T.ang2pix(level.nside, d);
    count[p] += 1;
    far = Math.max(far, sep(d, T.pix2dir(level.nside, p)));
  }
  const mean = N / n;
  check(Math.min(...count) > mean * 0.7 && Math.max(...count) < mean * 1.3, `nside ${level.nside}: tiles of equal area (${Math.min(...count)} to ${Math.max(...count)} of ${mean.toFixed(0)})`);
  check(far <= T.tileRadiusDeg(level.nside), `nside ${level.nside}: no point is farther than tileRadiusDeg from its tile's centre (${far.toFixed(2)} against ${T.tileRadiusDeg(level.nside).toFixed(2)})`);
  // So a cone's tiles always include the tile of every point inside the cone.
  let missed = 0;
  for (let i = 0; i < 300; i += 1) {
    const axis = anywhere();
    const radius = 1 + rnd() * 20;
    const tiles = new Set(T.tilesInCone(level.nside, axis, radius));
    for (let k = 0; k < 40; k += 1) {
      const d = anywhere();
      if (sep(d, axis) <= radius && !tiles.has(T.ang2pix(level.nside, d))) missed += 1;
    }
  }
  check(missed === 0, `nside ${level.nside}: a cone's tiles hold every point of the cone (${missed} missed)`);
}
const few = T.tilesInCone(8, radec(83.8, -5.4), 5);
check(few.length >= 1 && few.length <= 12 && few[0] === T.ang2pix(8, radec(83.8, -5.4)), `a binocular field on Orion asks for a handful of tiles, its own first (${few.length})`);
check(T.tilesInCone(2, radec(0, 0), 180).length === 48, 'the whole sky is every tile');
check(T.levelsWanted(6.5).length === 0 && T.levelsWanted(7.5).length === 1 && T.levelsWanted(9.3).length === 2, 'a wide dark sky asks for nothing, a 25 degree field for the large tiles, binoculars for both');
check(T.tilePath(T.LEVELS[1], 123) === 'n8/123.bin', 'a tile has one path');

// --- 2. the files ----------------------------------------------------------------------------------
try { execFileSync('python3', [join(ROOT, 'scripts/build-startiles.py'), '--check'], { stdio: 'pipe' }); }
catch (e) { check(false, `scripts/build-startiles.py --check: ${String(e.stderr || e.stdout || e.message).trim()}`); }
const index = JSON.parse(readFileSync(join(ROOT, 'site/data/startiles/index.json'), 'utf8'));
check(index.licence === 'CC BY-SA 4.0' && /AT-HYG v4\.0/.test(index.source), 'the index names AT-HYG and its licence');
check(index.levels.length === T.LEVELS.length && index.levels.every((l, i) => l.nside === T.LEVELS[i].nside && l.dir === T.LEVELS[i].dir && l.from === T.LEVELS[i].from && l.to === T.LEVELS[i].to), 'the script\'s levels are the reader\'s');
check(index.stars > 400000 && index.bytes < 3000000, `over 400 000 stars in under 3 MB (${index.stars} in ${index.bytes})`);
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
const budget = (id) => Number((new RegExp(`id: ${id}, value: (\\d+)`).exec(budgets) || [])[1]);
check(budget('star_tile_bytes') > 0 && index.levels.every((l) => l.largest_tile_bytes <= budget('star_tile_bytes')), `no tile is over the budget (${budget('star_tile_bytes')} B)`);
check(budget('star_tiles_total_bytes') > 0 && index.bytes <= budget('star_tiles_total_bytes'), `all the tiles together are inside theirs (${index.bytes} of ${budget('star_tiles_total_bytes')} B)`);
// Orion's tile, read back: every star in its own tile, inside the level's magnitudes, brightest first.
for (const level of T.LEVELS) {
  const pix = T.ang2pix(level.nside, radec(83.8, -5.4));
  const file = join(ROOT, 'site/data/startiles', T.tilePath(level, pix));
  check(existsSync(file), `${T.tilePath(level, pix)} exists`);
  const raw = readFileSync(file);
  const t = T.parseTile(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
  check(t.nside === level.nside && t.pix === pix && t.count > 50, `${T.tilePath(level, pix)} is Orion's tile and holds stars (${t.count})`);
  let wrong = 0;
  let order = true;
  for (let i = 0; i < t.count; i += 1) {
    const d = [t.pos[i * 3], t.pos[i * 3 + 1], t.pos[i * 3 + 2]];
    if (T.ang2pix(level.nside, d) !== pix && sep(d, T.pix2dir(level.nside, pix)) > T.tileRadiusDeg(level.nside)) wrong += 1;
    if (t.mag[i] > level.to + 0.011 || (i > 0 && t.mag[i] < t.mag[i - 1])) order = false;
  }
  check(wrong === 0 && order, `${T.tilePath(level, pix)}: its stars are in it, no fainter than ${level.to}, brightest first`);
}
// No star of the tiles is one the HYG files already draw: Rigel, Betelgeuse and Sirius are not in them.
{
  const { parseNakedEye } = await import(join(JS, 'sky/groundsky.js')).catch(() => ({}));
  if (parseNakedEye) {
    const b = readFileSync(join(ROOT, 'site/data/stars.bin'));
    const eye = parseNakedEye(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    const pix = T.ang2pix(2, radec(83.8, -5.4));
    const raw = readFileSync(join(ROOT, 'site/data/startiles', T.tilePath(T.LEVELS[0], pix)));
    const t = T.parseTile(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    let twice = 0;
    for (let i = 0; i < Math.min(400, eye.count); i += 1) {
      const e = [eye.pos[i * 3], eye.pos[i * 3 + 1], eye.pos[i * 3 + 2]];
      if (T.ang2pix(2, e) !== pix) continue;
      for (let k = 0; k < t.count; k += 1) if (sep(e, [t.pos[k * 3], t.pos[k * 3 + 1], t.pos[k * 3 + 2]]) < 20 / 3600 && Math.abs(t.mag[k] - eye.mag[i]) < 1.5) twice += 1;
    }
    check(twice === 0, `no bright star is drawn twice (${twice})`);
  }
}
const ground = readFileSync(join(JS, 'sky/groundsky.js'), 'utf8');
check(/import\('\.\/startiles\.js'\)/.test(ground) && !/^import[^\n]*startiles/m.test(ground), 'the tiles\' reader is fetched when wanted, not with the sky');
check(/limit > 7\.3\) askStarTiles\(\)/.test(ground) && /saving\) return;\s*\n\s*starTilesAsked = true/.test(ground), 'only a sky deep enough asks, and never on a data-saving connection');

// --- 3. which constellation -------------------------------------------------------------------------
check(C.ROWS.length === 357 && new Set(C.ROWS.map((r) => r[3])).size === 88, 'Roman\'s 357 rows, 88 constellations');
// The eight positions of Roman's own ReadMe (equinox 1950.0), and stars everyone knows (J2000).
const hd = (h, dec) => radec(h * 15, dec);
for (const [h, dec, want] of [[9, 65, 'UMa'], [23.5, -20, 'Aqr'], [5.12, 9.12, 'Ori'], [9.4555, -19.9, 'Hya'], [12.8888, 22, 'Com'], [15.6687, -12.1234, 'Lib'], [19, -40, 'CrA'], [6.2222, -81.1234, 'Men']]) {
  check(C.constellationAt(hd(h, dec), 1950) === want, `Roman's example ${h} h ${dec} is in ${want} (${C.constellationAt(hd(h, dec), 1950)})`);
}
for (const [name, h, dec, want] of [['Betelgeuse', 5.9195, 7.407, 'Ori'], ['Polaris', 2.5303, 89.264, 'UMi'], ['Sirius', 6.7525, -16.716, 'CMa'], ['Vega', 18.6156, 38.784, 'Lyr'], ['Acrux', 12.4433, -63.099, 'Cru'], ['the Andromeda galaxy', 0.7123, 41.269, 'And'], ['the Pleiades', 3.79, 24.1, 'Tau'], ['the galactic centre', 17.7611, -29.008, 'Sgr'], ['the south pole', 0, -90, 'Oct'], ['the north pole', 0, 90, 'UMi']]) {
  check(C.constellationAt(hd(h, dec)) === want, `${name} is in ${want} (${C.constellationAt(hd(h, dec))})`);
}
// Every point of the sky is in exactly one of the 88, and each of the 88 names in the sky view's list has a row.
let none = 0;
for (let i = 0; i < 20000; i += 1) if (!C.constellationAt(anywhere())) none += 1;
check(none === 0, `no point of the sky is in no constellation (${none})`);
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8'));
const ids = new Set(C.ROWS.map((r) => r[3]));
check(names.every((n) => ids.has(n.id)), 'every named constellation is one the table can answer with');
// A figure's own name point is inside its constellation (Serpens is two pieces: its name is on one).
let outside = 0;
for (const n of names) if (C.constellationAt(radec(n.ra, n.dec)) !== n.id) outside += 1;
check(outside <= 3, `a constellation's name sits inside it (${outside} do not)`);
check(C.constellationAt(null) === null && C.constellationAt([0, 0, 0]) === null, 'nothing in, nothing out');
// Precession to 1875: 125 years at 50 arcseconds a year along the ecliptic is 1.74 degrees.
const moved = sep(C.precessTo1875(radec(0, 0)), radec(0, 0));
check(Math.abs(moved - 1.6) < 0.2, `the equinox moves about 1.6 degrees on the equator in 125 years (${moved.toFixed(3)})`);

// --- 4. star trails: the arc is the star's own past ---------------------------------------------------
// The shader turns a star's catalogue place about the pole by aK * uSpan and then uses NOW's
// matrix. That must be where the star WAS: the matrix of an hour ago applied to the star itself.
{
  const obs = new A.Observer(51.5, -0.1, 0);
  const now = new Date('2026-10-07T22:00:00Z');
  const hourAgo = new Date(now.getTime() - 3600e3 * 0.99727); // one hour of sidereal turning
  const mNow = B.eqjToLocal(now, obs);
  const mThen = B.eqjToLocal(hourAgo, obs);
  const star = radec(88.79, 7.41);
  const a = 15 * DEG;
  const turned = [star[0] * Math.cos(a) - star[1] * Math.sin(a), star[0] * Math.sin(a) + star[1] * Math.cos(a), star[2]];
  const was = B.localOf(mThen, star);
  const drawn = B.localOf(mNow, turned);
  check(sep(was, drawn) < 0.05, `the far end of a trail is where the star was an hour ago (${sep(was, drawn).toFixed(3)} degrees off)`);
  check(/float a = aK \* uSpan;/.test(ground) && /TRAIL_HOURS \* 15 \* DEG/.test(ground) && /trails: false/.test(ground), 'the shader turns by aK of the span, the span is the exposure, and trails are off until asked for');
}

if (problems.length) { console.error('startiles FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`startiles ok: HEALPix addresses round-trip, ${index.stars} stars past HYG in ${index.bytes} bytes of tiles, 88 constellations from Roman's 357 rows, and a trail that ends where the star was`);
