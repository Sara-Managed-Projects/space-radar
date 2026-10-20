// tests/test_traverse.mjs -- the rover traverses on the Moon (release 1.2.0 stage W2-a, internal #868).
//
// Only documented paths: each traverse belongs to a landing-site row, comes from a traced line with its
// provenance and credit, and starts where the site is; nothing else on the Moon has one. On the terrain:
// every point of the ribbon lies on the drawn ground (the unit sphere of the world's mesh, where the
// sites stand). And the module is for close range only: tiles.js imports it, never the boot.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const V = await import(join(JS, 'scene/traverse.js'));
const { TRAVERSES } = await import(join(JS, 'data/traverses.js'));
const { SITES } = await import(join(JS, 'data/sites.js'));
const { TRAVERSE_WORLDS } = await import(join(JS, 'scene/tiles.js'));
const { unitFromLonLat } = await import(join(JS, 'scene/tilemath.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R = 1737.4;

// --- the data: documented, cited, and only where a site is ------------------------------------------------
const yaml = readFileSync(join(ROOT, 'registry/sites.yaml'), 'utf8');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(TRAVERSES.length === 2 && TRAVERSES.map((t) => t.site).sort().join() === 'apollo-15,apollo-17', `the traced traverses are Apollo 15's and 17's: ${TRAVERSES.map((t) => t.site)}`);
for (const t of TRAVERSES) {
  const site = SITES.find((s) => s.id === t.site);
  check(!!site && site.world === t.world && site.class === 'surface', `${t.site}: a surface site row on the same world`);
  check(TRAVERSE_WORLDS.includes(t.world), `${t.site}: its world is one scene/tiles.js fetches traverses for`);
  check(typeof t.credit === 'string' && credits.includes(t.credit), `${t.site}: CREDITS.md carries its credit word for word`);
  const block = yaml.slice(yaml.indexOf('\ntraverses:'));
  const row = block.slice(block.indexOf(`  ${t.site}:`), block.indexOf(`  ${t.site}:`) + 2000);
  for (const key of ['file:', 'source: "https://', 'finder: "https://', 'read: 20', 'traced:', 'licence:', 'credit:']) check(row.includes(key), `${t.site}: its sites.yaml row says ${key}`);
  const file = join(ROOT, `registry/traverses/${t.site}.json`);
  check(existsSync(file), `${t.site}: registry/traverses/${t.site}.json is there`);
  const paths = t.paths.map(V.parsePath);
  check(paths.length > 10 && paths.every((p) => p.length >= 2), `${t.site}: ${paths.length} traced lines`);
  const km = paths.reduce((a, p) => a + V.pathLengthKm(p, R), 0);
  check(Math.abs(km - t.lengthKm) / t.lengthKm < 0.03, `${t.site}: ${km.toFixed(2)} km drawn of the ${t.lengthKm} km traced`);
  // Every point within 10 km of the lander (Apollo 17's longest drive, to station 2, was 7.6 km out).
  const lm = unitFromLonLat(site.lon, site.lat, [0, 0, 0]);
  let far = 0;
  let nearest = Infinity;
  for (const p of paths) for (const [lon, lat] of p) {
    const q = unitFromLonLat(lon, lat, [0, 0, 0]);
    const d = Math.acos(Math.min(1, lm[0] * q[0] + lm[1] * q[1] + lm[2] * q[2])) * R;
    far = Math.max(far, d);
    nearest = Math.min(nearest, d);
  }
  check(far < 10 && nearest < 0.25, `${t.site}: the line stays within 10 km of the lander (${far.toFixed(1)}) and reaches it (${(nearest * 1000).toFixed(0)} m)`);
}
check(!SITES.some((s) => s.world === 'mars' && TRAVERSES.some((t) => t.site === s.id)), 'no path on Mars: none was traced into this registry, so none is drawn');
// Huygens is in the registry with its source, and not in the first visit until Titan can hold it (`app: false`).
check(/\n  - id: huygens\n[\s\S]{0,400}?\n    app: false\n/.test(yaml) && !SITES.some((s) => s.id === 'huygens'), 'Huygens: a sites.yaml row with app: false, left out of data/sites.js');

// --- the ribbon: on the drawn ground, both sides of every point --------------------------------------------
{
  const paths = [[[3.6, 26.1], [3.61, 26.11], [3.62, 26.1]], [[0, 0]]];
  const r = V.ribbonArrays(paths);
  check(r.position.length === 3 * 2 * 3 && r.index.length === 2 * 6 && r.side[0] === -1 && r.side[1] === 1, 'two vertices a point, two triangles a segment, a one-point path dropped');
  let worst = 0;
  for (const t of TRAVERSES) {
    const a = V.ribbonArrays(t.paths.map(V.parsePath));
    for (let i = 0; i < a.position.length; i += 3) worst = Math.max(worst, Math.abs(Math.hypot(a.position[i], a.position[i + 1], a.position[i + 2]) - 1));
  }
  check(worst < 1e-6, `every point is on the drawn ground, the unit sphere the sites stand on: off by ${worst}`);
  // The ends are extrapolated so the shader needs no special case.
  const first = [r.prev[0] - r.position[0], r.prev[1] - r.position[1], r.prev[2] - r.position[2]];
  const toNext = [r.next[0] - r.position[0], r.next[1] - r.position[1], r.next[2] - r.position[2]];
  check(Math.abs(first[0] + toNext[0]) < 1e-7 && Math.abs(first[1] + toNext[1]) < 1e-7, 'the first point\'s "before" is the mirror of its "after"');
}
// --- the fade: no pop ----------------------------------------------------------------------------------------
check(V.traverseFade(0) === 1 && V.traverseFade(V.TRAVERSE_LOOK.nearKm) === 1 && V.traverseFade(V.TRAVERSE_LOOK.farKm) === 0, 'full inside nearKm, none past farKm');
{
  let mono = true;
  for (let d = V.TRAVERSE_LOOK.nearKm; d < V.TRAVERSE_LOOK.farKm; d += 5) if (V.traverseFade(d + 5) > V.traverseFade(d)) mono = false;
  check(mono, 'and it only fades as the camera goes');
}
// --- the module: built, shown near, credited, disposed -------------------------------------------------------
{
  const T = V.createTraverses({ world: 'moon' });
  const a15 = TRAVERSES.find((t) => t.site === 'apollo-15');
  const s = SITES.find((x) => x.id === 'apollo-15');
  const at = unitFromLonLat(s.lon, s.lat, [0, 0, 0]);
  T.frame({ x: at[0] * (1 + 40 / R), y: at[1] * (1 + 40 / R), z: at[2] * (1 + 40 / R) }, R, [1600, 900], 1);
  const st = T.state();
  check(st.find((x) => x.site === 'apollo-15').shown && !st.find((x) => x.site === 'apollo-17').shown, '40 km over Hadley: Apollo 15\'s is drawn, Apollo 17\'s (1 000 km away) is not');
  check(T.credits().length === 1 && T.credits()[0] === a15.credit, 'and only its credit is in the Sources panel');
  check(T.group.children.length === 2 && T.group.children.every((m) => m.material.depthWrite === false && m.material.transparent), 'one mesh a traverse, never writing depth');
  // Seen from above, as the shader widens it, most of the ribbon's triangles wind clockwise on screen:
  // drawn only if the material draws both faces (the first look run, 2026-10-16, culled them).
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  check(T.group.children.every((m) => m.material.side === THREE.DoubleSide), 'both faces drawn: a one-sided ribbon loses its clockwise quads');
  {
    const sub = (a, b) => a.map((x, i) => x - b[i]);
    const dot = (a, b) => a.reduce((acc, x, i) => acc + x * b[i], 0);
    const unit = (a) => { const l = Math.hypot(...a); return a.map((x) => x / l); };
    const up = at;
    const north = unit(sub([0, 1, 0], up.map((x) => x * up[1])));
    const right = unit([north[1] * up[2] - north[2] * up[1], north[2] * up[0] - north[0] * up[2], north[0] * up[1] - north[1] * up[0]]);
    const cam = up.map((x) => x * (1 + 45 / R));
    const px = (p) => { const v = sub(p, cam); const z = -dot(v, up); return [dot(v, right) / z * 1000, dot(v, north) / z * 1000]; };
    const r = V.ribbonArrays(a15.paths.map(V.parsePath));
    const scr = [];
    for (let i = 0; i < r.side.length; i++) {
      const g = (arr) => [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
      const c = px(g(r.position));
      let a = sub(c, px(g(r.prev)));
      let b = sub(px(g(r.next)), c);
      if (dot(a, a) < 1e-8) a = b;
      if (dot(b, b) < 1e-8) b = a;
      let d = unit(a).map((x, k) => x + unit(b)[k]);
      d = dot(d, d) < 1e-8 ? [1, 0] : unit(d);
      scr.push([c[0] - d[1] * r.side[i] * 1.125, c[1] + d[0] * r.side[i] * 1.125]);
    }
    let cw = 0;
    for (let k = 0; k < r.index.length; k += 3) {
      const [A, B, C] = [scr[r.index[k]], scr[r.index[k + 1]], scr[r.index[k + 2]]];
      if ((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) < 0) cw += 1;
    }
    check(cw > r.index.length / 6, `the ribbon's clockwise triangles seen from 45 km over Hadley: ${cw} of ${r.index.length / 3} (the reason for DoubleSide)`);
  }
  T.hide();
  check(T.credits().length === 0, 'hidden with the tiles');
  T.dispose();
}
// --- the budgets (registry/budgets.yaml, 0076 W2-a) ----------------------------------------------------------
{
  const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
  const bytes = readFileSync(join(JS, 'data/traverses.js')).length;
  check(bytes <= BUDGETS.traverse_data_bytes, `data/traverses.js is ${bytes} B, within ${BUDGETS.traverse_data_bytes}`);
  check(TRAVERSES.filter((t) => t.world === 'moon').length <= BUDGETS.traverse_draw_calls, 'one draw call a traverse, within the budget');
}
// --- never at boot ---------------------------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/scene\/traverse\.js/.test(main), 'main.js does not import scene/traverse.js: scene/tiles.js fetches it, close to the Moon');
  const tiles = readFileSync(join(JS, 'scene/tiles.js'), 'utf8');
  check(/import\('\.\/traverse\.js'\)/.test(tiles), 'scene/tiles.js imports it on demand');
  const vert = readFileSync(join(JS, 'scene/traverse.js'), 'utf8');
  check(/vFragDepth = 1\.0 \+ gl_Position\.w \* \$\{\(1 - DEPTH_PULL\)/.test(vert) && V.DEPTH_PULL === 0.002, 'pulled twice a tile\'s depth pull toward the camera');
}

if (problems.length) { console.error('traverse FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`traverse ok: ${TRAVERSES.length} traced traverses (${TRAVERSES.map((t) => t.site + ' ' + t.lengthKm + ' km').join(', ')}), each on its site's row with source and credit, on the drawn ground, faded by distance, fetched only close to the Moon`);
