// tests/test_sstars.mjs -- the S-stars on their measured orbits round Sagittarius A* (internal #419, the deep-space review of
// 2026-11-16): the table is the published one (S2 from GRAVITY, 39 stars from Gillessen et al. 2017), every period agrees with
// Kepler's third law at the centre's mass and distance, S2 is 120 AU from the hole at its pericentre of 2018.38 (and 1.88 times
// that from it at its apocentre), the stars go round the way the papers say, the orbits close, the three draw calls, the
// picture's share gives way to the orbits as they come into view, the words are on the card, and none of it is in the boot graph.
//
//   node tests/test_sstars.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/sstars.js'));
const { SSTARS } = await import(join(JS, 'data/sstars.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const portraits = await import(join(JS, 'scene/portraits.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const star = (id) => SSTARS.stars.find((s) => s.id === id);

// --- 1. the table ------------------------------------------------------------------------------------------------------
check(SSTARS.stars.length === 39, `39 stars with a bound orbit (Gillessen et al. 2017's 40 less S111, unbound): ${SSTARS.stars.length}`);
check(!star('S111') && new Set(SSTARS.stars.map((s) => s.id)).size === 39, 'S111 is not drawn (e > 1) and no star twice');
check(SSTARS.stars.every((s) => s.e >= 0 && s.e < 1 && s.a > 0 && s.p > 0 && s.i > 0 && s.i < 180), 'every orbit is a bound ellipse');
check(near(SSTARS.r0Pc, 8274.9, 1e-9) && near(SSTARS.massMsun, 4.297e6, 1), 'the distance and the mass are GRAVITY 2021\'s, the ones registry/exotics.yaml gives the hole');
// the same numbers as the text of the papers (arXiv:1611.09144 Table 3; arXiv:2101.12098 Table 2), read on 2026-11-17
const row = (id, a, e, i, om, w, tp, p) => { const s = star(id); check(s && s.a === a && s.e === e && s.i === i && s.om === om && s.w === w && s.tp === tp && s.p === p, `${id}: the paper's elements`); };
row('S2', 0.124982, 0.884215, 134.685, 227.175, 66.259, 2018.37899, 16.0458);
row('S1', 0.595, 0.556, 119.14, 342.04, 122.3, 2001.8, 166.0);
row('S55', 0.1078, 0.7209, 150.1, 325.5, 331.5, 2009.34, 12.8);
row('S175', 0.414, 0.9867, 88.53, 326.83, 68.52, 2009.51, 96.2);
check(SSTARS.stars.every((s) => { const k = Math.sqrt((s.a * SSTARS.r0Pc) ** 3 / SSTARS.massMsun); return Math.abs(k / s.p - 1) < 0.06; }), 'every period is what Kepler\'s third law gives for its size, at the hole\'s mass and distance (within 6 %)');
check(SSTARS.stars.every((s) => s.id !== 'S62' && s.id !== 'S4714'), 'S62 and S4714 are not in Table 3, so they are not drawn');
const reg = readFileSync(join(ROOT, 'registry/sstars.yaml'), 'utf8');
check(/arXiv:1611\.09144/.test(reg) && /arXiv:2101\.12098/.test(reg) && /Published measurements: facts, cited/.test(reg), 'the registry names both papers and the licence');

// --- 2. S2's pericentre: 120 AU from the hole --------------------------------------------------------------------------
const s2 = star('S2');
const peri = S.orbitAt(s2, s2.tp, SSTARS.r0Pc);
check(near(peri.r, 120, 1.5) && near(peri.r, S.auOf(s2.a, SSTARS.r0Pc) * (1 - s2.e), 1e-6), `S2 at 2018.38 is ${peri.r.toFixed(2)} AU from the hole (about 120)`);
check(near(peri.nu, 0, 1e-6), 'the true anomaly is 0 there');
// Gillessen et al. 2017's own row for it, at its own distance: about 120 AU too
const g17 = { a: 0.1255, e: 0.8839, i: 134.18, om: 226.94, w: 65.51, tp: 2002.33, p: 16.0 };
check(near(S.orbitAt(g17, 2002.33, 8320).r, 121.2, 1), 'Gillessen\'s S2 row gives 121 AU at its 2002.33 pericentre');
// on the sky: 14.5 milliarcseconds, mostly south of the hole and a little east of it
check(peri.north < 0 && peri.east > 0 && Math.abs(peri.east) < Math.abs(peri.north) / 3, `at pericentre S2 is south and a little east of the hole (north ${peri.north.toFixed(1)}, east ${peri.east.toFixed(1)} AU)`);
const apo = S.orbitAt(s2, s2.tp + s2.p / 2, SSTARS.r0Pc);
check(near(apo.r / peri.r, (1 + s2.e) / (1 - s2.e), 1e-3) && near(apo.r, 1948.7, 3), `half a period later it is ${apo.r.toFixed(0)} AU out (apocentre)`);
const again = S.orbitAt(s2, s2.tp + s2.p, SSTARS.r0Pc);
check(near(again.north, peri.north, 1e-3) && near(again.east, peri.east, 1e-3) && near(again.away, peri.away, 1e-3), 'one period on, it is back');
// 2002.33 + 16.0458 is 2018.37: the pericentre of 2018 and the one of 2002 are one period apart in the papers' own numbers
check(near(s2.tp - 16.0458, 2002.333, 0.01), 'GRAVITY\'s pericentre date is one period after Gillessen\'s 2002.33');
// the speed at pericentre: about 7 700 km/s, from two positions a day apart
const dt = 1 / 365.25;
const a1 = S.orbitAt(s2, s2.tp - dt / 2, SSTARS.r0Pc), a2 = S.orbitAt(s2, s2.tp + dt / 2, SSTARS.r0Pc);
const kmS = Math.hypot(a2.north - a1.north, a2.east - a1.east, a2.away - a1.away) * S.AU_KM / (dt * 365.25 * 86400);
check(near(kmS, 7700, 300), `S2's speed at pericentre is ${kmS.toFixed(0)} km/s (about 7 700)`);

// --- 3. the sense of motion ---------------------------------------------------------------------------------------------
// i above 90 degrees: the star goes clockwise on the sky (north to west to south), so its position angle falls
const pa = (s, y) => { const p = S.orbitAt(s, y, SSTARS.r0Pc); return Math.atan2(p.east, p.north); };
const dpa = (s, y) => { const d = pa(s, y + 0.02) - pa(s, y); return Math.atan2(Math.sin(d), Math.cos(d)); };
check(dpa(s2, s2.tp + 3) < 0 && dpa(star('S38'), 2010) < 0 && dpa(star('S1'), 2010) < 0, 'i above 90: S2, S38 and S1 go clockwise on the sky');
check(dpa(star('S13'), 2010) > 0 && dpa(star('S12'), 2010) > 0, 'i below 90: S13 and S12 go anticlockwise');
const ring = S.orbitRing(s2, SSTARS.r0Pc, 64);
check(ring.length === 64 && Math.min(...ring.map((p) => Math.hypot(...p))) > 119 && Math.max(...ring.map((p) => Math.hypot(...p))) < 1949.5, 'S2\'s ring lies between its pericentre and its apocentre');
const g = S.toGroup({ north: 3, east: 5, away: 7 });
check(g[0] === -5 && g[1] === 3 && g[2] === -7, 'the group\'s axes: x west, y north, z toward the Sun');

// --- 4. the sky frame ---------------------------------------------------------------------------------------------------
const LY = 9460730472580.8, RA = (17 + 45 / 60 + 40.04 / 3600) * 15 * Math.PI / 180, DEC = -29.0078 * Math.PI / 180, OBL = 23.4392911 * Math.PI / 180;
const eq = [Math.cos(DEC) * Math.cos(RA), Math.cos(DEC) * Math.sin(RA), Math.sin(DEC)];
const pos = { x: eq[0] * 27000 * LY, y: (eq[1] * Math.cos(OBL) + eq[2] * Math.sin(OBL)) * 27000 * LY, z: (-eq[1] * Math.sin(OBL) + eq[2] * Math.cos(OBL)) * 27000 * LY };
const f = S.skyFrame(pos);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
check(near(dot(f.west, f.north), 0, 1e-9) && near(dot(f.toward, f.north), 0, 1e-9) && dot(cr(f.west, f.north), f.toward) > 0.999999, 'west, north and toward the Sun are a right-handed frame');
const l = Math.hypot(pos.x, pos.y, pos.z);
check(near(dot(f.toward, [-pos.x / l, -pos.y / l, -pos.z / l]), 1, 1e-9), 'toward points from the hole to the Sun');

// --- 5. the picture: three draw calls, true size, and the hole's picture giving way ---------------------------------------
check(S.DRAW_CALLS === 3 && BUDGETS.deep_sstars_draw_calls === 3, 'three draw calls, and they have a budget');
const unitKm = 9460730472580.8;      // a light-year to the scene unit
const centre = new THREE.Vector3(0, 0, 0);
const env = {
  data: SSTARS, record: { id: 'exotic-sgr-a-star', pos },
  toScene: (km, out) => { out.copy(centre); return true; },
  dirToScene: (v, out) => out.set(v[0], v[1], v[2]),
  unitKm: () => unitKm,
};
const ss = S.createSStars(THREE, env);
const kids = ss.group.children;
check(kids.some((k) => k.isLineSegments) && kids.some((k) => k.isPoints), 'the orbits are one LineSegments and the stars one Points');
check(kids.length <= 3 && kids.every((k) => k.material && k.material.blending === THREE.AdditiveBlending), 'at most three objects, all additive');
check(kids.find((k) => k.isLineSegments).geometry.attributes.position.count === 39 * 96 * 2, 'every orbit is 96 segments');
const cam = new THREE.PerspectiveCamera(45, 1, 1e-12, 1e6);
const farCam = (ly) => { cam.position.set(0, 0, ly); cam.updateMatrixWorld(true); return cam; };
const t2018 = Date.UTC(2018, 4, 19); // 2018.38
const fieldLy = S.FRAME_ARCSEC * SSTARS.r0Pc * S.AU_KM / unitKm;
check(near(fieldLy, 0.0785, 0.002), `the field's radius is ${fieldLy.toFixed(4)} light-years (0.6 arcsec: 5 000 AU)`);
check(ss.update({ camera: farCam(1000), tMs: t2018, viewH: 900 }) === 0 && ss.group.visible === false, 'from 1 000 light-years nothing is drawn');
const mid = ss.update({ camera: farCam(1.7), tMs: t2018, viewH: 900 });
const closeShare = ss.update({ camera: farCam(0.2), tMs: t2018, viewH: 900 });
check(mid > 0 && mid < 1 && closeShare === 1 && ss.group.visible, `from 1.7 light-years it is coming in (${mid.toFixed(2)}), from 0.2 whole`);
check(near(ss.fieldShare(), 1, 1e-9) && near(portraits.holeShare(ss.fieldShare()), 0, 1e-9), 'there the hole\'s picture has given way');
check(near(portraits.holeShare(0), portraits.PORTRAIT_SHARE, 1e-12) && portraits.holeShare(0.5) < portraits.PORTRAIT_SHARE && portraits.holeShare(0.5) > 0, 'where the orbits are not in view the picture keeps its share');
check(ss.update({ camera: farCam(0.2), tMs: t2018, viewH: 900, opacity: 0.5 }) < closeShare, 'the picture\'s fade fades them too');
// at pericentre S2's point is 120 AU from the centre, in the group's units (a thousand AU)
ss.update({ camera: farCam(0.2), tMs: t2018, viewH: 900 });
const pts = kids.find((k) => k.isPoints), at = pts.geometry.attributes.position.array;
const i2 = SSTARS.stars.findIndex((s) => s.id === 'S2') + 1;
const rS2 = Math.hypot(at[i2 * 3], at[i2 * 3 + 1], at[i2 * 3 + 2]) * 1000;
check(near(rS2, S.orbitAt(s2, S.yearOf(t2018), SSTARS.r0Pc).r, 1e-2) && near(rS2, 120, 2), `S2's point is ${rS2.toFixed(1)} AU from the centre on 2018-05-19`);
check(near(ss.group.scale.x * unitKm / S.AU_KM, 1000, 1e-6), 'the group\'s unit is a thousand AU');
check(at[0] === 0 && at[1] === 0 && at[2] === 0, 'the first point, the hole\'s mark, is at the centre');
const before = [at[i2 * 3], at[i2 * 3 + 1], at[i2 * 3 + 2]];
ss.update({ camera: farCam(0.2), tMs: t2018 + 4 * 365.25 * 86400e3, viewH: 900 });
check(Math.hypot(at[i2 * 3] - before[0], at[i2 * 3 + 1] - before[1], at[i2 * 3 + 2] - before[2]) * 1000 > 100, 'four years later S2 is somewhere else');
check(ss.stats().stars === 39 && ss.stats().drawCalls === 3, 'stats name 39 stars and 3 draw calls');
ss.dispose();
check(!/texture2D|sampler2D/.test(S.SHADERS.lineFrag + S.SHADERS.pointFrag), 'no texture on the orbits or the stars');
check(SSTARS.labelled.join() === 'S2,S55,S175' && SSTARS.labelled.every((id) => star(id)), 'S2, S55 and S175 carry the labels');

// --- 6. the portrait: Sgr A* alone draws them -----------------------------------------------------------------------------
const pSrc = readFileSync(join(JS, 'scene/portraits.js'), 'utf8');
check(portraits.SGR_A_STAR === 'exotic-sgr-a-star' && /import\('\.\/sstars\.js'\)/.test(pSrc) && /import\('\.\.\/data\/sstars\.js'\)/.test(pSrc), 'portraits.js fetches the module and its data with dynamic imports');
check(!/^import[^'"]*['"][^'"]*sstars[^'"]*['"]/m.test(pSrc), 'portraits.js does not import them statically');

// --- 7. the card's words, bytes, boot ----------------------------------------------------------------------------------------
const W = COPY.drawing.exoticDeparture.sstars;
check(/39/.test(W) && /GRAVITY/.test(W) && /Gillessen/.test(W) && /illustrative/.test(W) && /measured orbits/.test(W) && /light-year/.test(W), 'the card says what is drawn, from what, and that sizes and colours are illustrative');
const layers = readFileSync(join(JS, 'data/layers.js'), 'utf8');
check(/x\.id === 'sgr-a-star'\) parts\.push\(T\.sstars\)/.test(layers), 'only Sagittarius A* carries the sentence');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(/S-stars/.test(credits) && /1611\.09144/.test(credits) && /2101\.12098/.test(credits), 'CREDITS.md names the two papers');
const bytes = readFileSync(join(JS, 'data/sstars.js')).length + readFileSync(join(JS, 'scene/sstars.js')).length;
check(BUDGETS.deep_sstars_bytes > 0 && bytes <= BUDGETS.deep_sstars_bytes, `the module and its data are within the budget (${bytes} B of ${BUDGETS.deep_sstars_bytes})`);
for (const fl of ['main.js', 'scene/deep/deepsky.js', 'scene/deep/heroes.js', 'data/layers.js']) {
  const src = readFileSync(join(JS, fl), 'utf8');
  check(!/^import[^'"]*['"][^'"]*sstars[^'"]*['"]/m.test(src), `${fl} does not import them statically`);
}

if (problems.length) { console.error(problems.map((p) => 'FAIL ' + p).join('\n')); console.error(`\n${problems.length} problem(s)`); process.exit(1); }
console.log('ok: tests/test_sstars.mjs');
