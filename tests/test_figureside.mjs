// tests/test_figureside.mjs -- a constellation seen from the side (ui/figureside.js, registry/sideviews.yaml; the
// 2026-11-16 deep-space review, idea 6).
//
//   node tests/test_figureside.mjs
//
// What it holds:
//   1. THE REGISTRY: registry/sideviews.yaml's mirror is current and sound (scripts/gen_sideviews_js.py --check), and
//      it offers Orion, the Big Dipper, Cassiopeia, the Southern Cross, Scorpius and Leo.
//   2. THE BIG DIPPER IS ITS SEVEN STARS: an asterism drawn through Ursa Major's own corners, each corner the star of
//      the 3D catalogue the registry names, at its measured distance.
//   3. THE SIX COME APART: with the real 3D catalogue every one has measured corners at very different distances.
//   4. THE VIEW FROM HOME IS THE SKY'S: from where the camera stands at 0 degrees every corner is within a degree of
//      where the Sun sees it, and north is up; a quarter turn is a turn sideways, square to the line of sight.
//   5. THE LENS: the app's own where the figure fits, wider on a narrow screen, never past 100 degrees.
//   6. THE SWING: eased, never backwards, ending where it says; the rig's own angles for a side of the target.
//   7. THE WORDS, THE LINK AND THE BOOT: every string in every language, `figure` in the link before `cam`, the three
//      ways in (the story card, the search row, the link), and none of it in the first visit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;

const S = await import(join(JS, 'ui/figureside.js'));
const F = await import(join(JS, 'sky/figures.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { SIDE_FIGURES } = await import(join(JS, 'data/sideviews.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { parseStars3d } = await import(join(JS, 'scene/stars3d.js'));

// ---------------------------------------------------------------- 1. the registry
const gen = spawnSync('python3', [join(ROOT, 'scripts/gen_sideviews_js.py'), '--check'], { encoding: 'utf8' });
check(gen.status === 0, `scripts/gen_sideviews_js.py --check: ${(gen.stdout + gen.stderr).trim()}`);
const WANT = { orion: 'Ori', 'big-dipper': null, cassiopeia: 'Cas', 'southern-cross': 'Cru', scorpius: 'Sco', leo: 'Leo' };
for (const [id, fig] of Object.entries(WANT)) {
  const row = SIDE_FIGURES.find((r) => r.id === id);
  check(!!row && (fig ? row.figure === fig : row.of === 'UMa' && Array.isArray(row.path)), `registry/sideviews.yaml offers ${id}${fig ? ` as ${fig}` : ' as an asterism of Ursa Major'}`);
}
check(new Set(SIDE_FIGURES.map((r) => r.id)).size === SIDE_FIGURES.length, 'no figure is offered twice');

// ---------------------------------------------------------------- the real sky
const lines = JSON.parse(readFileSync(join(ROOT, 'site/data/constellations.lines.json'), 'utf8'));
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8'));
const figures = F.parseFigures(lines, names);
const raw = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const data = parseStars3d(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
const candidates = F.brightIndex(data);
const nameRows = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows;
const properOf = new Map(nameRows.filter((r) => r[1]).map((r) => [r[0], r[1]]));

// The asterisms, as scene/figures3d.js `define` takes them.
for (const r of SIDE_FIGURES) {
  const a = S.asterismFeature(r, r.name ? COPY.figureSide.names[r.name] : r.id);
  if (!a) continue;
  for (const [id, f] of F.parseFigures({ features: [a.feature] }, [a.name])) figures.set(id, f);
}

// resolveFigure: the registry's word, an IAU code in any case, and nothing for a word that is neither.
const known = (id) => figures.has(id);
check(S.resolveFigure('orion', SIDE_FIGURES, known).figure === 'Ori', '"orion" is Ori');
check(S.resolveFigure('ORI', SIDE_FIGURES, known).id === 'orion', 'an offered figure\'s IAU code opens it under its own word');
check(S.resolveFigure('big-dipper', SIDE_FIGURES, known).figure === 'side:big-dipper', 'the Big Dipper is a figure of its own');
check(S.resolveFigure('cyg', SIDE_FIGURES, known).figure === 'Cyg' && S.resolveFigure('Cyg', SIDE_FIGURES, known).id === 'Cyg', 'any figure of the line file opens by its IAU code');
check(S.resolveFigure('nonsense', SIDE_FIGURES, known) === null && S.resolveFigure('', SIDE_FIGURES, known) === null && S.resolveFigure(null, SIDE_FIGURES, known) === null, 'a word that is no figure opens nothing');

// ---------------------------------------------------------------- 2. the Big Dipper
{
  const row = SIDE_FIGURES.find((r) => r.id === 'big-dipper');
  const p = F.placeFigure(figures.get('side:big-dipper'), candidates);
  check(p.name === COPY.figureSide.names.bigDipper, `the Big Dipper is named by the copy (${p.name})`);
  check(p.stars.length === 7 && p.unplaced === 0 && p.segments.length === 7, `seven stars, seven strokes, every corner a measured star (${p.stars.length}, ${p.segments.length}, ${p.unplaced} unplaced)`);
  // each corner of the path is the star the registry names
  row.path.forEach((c, i) => {
    const star = F.starFor(F.dirOf(c[0], c[1]), candidates);
    const proper = star ? properOf.get(star.index) : null;
    check(proper === row.stars[i], `corner ${i + 1} of the Big Dipper is ${row.stars[i]} in the 3D catalogue (${proper})`);
  });
  const fr = S.frameOf(p);
  // The source's table (Wikipedia, Big Dipper, read 2026-11-16): 78 to 124 light-years; the catalogue agrees to a few.
  check(fr.nearLy > 70 && fr.nearLy < 90 && fr.farLy > 100 && fr.farLy < 135, `the Big Dipper's stars are ${fr.nearLy.toFixed(0)} to ${fr.farLy.toFixed(0)} light-years away`);
  const five = p.stars.filter((s) => s.ly > 70 && s.ly < 90).length;
  check(five === 5, `five of the seven are about 80 light-years away, as the note says (${five})`);
}

// ---------------------------------------------------------------- 3 and 4. the six, from home and from the side
const toVec = (a) => new THREE.Vector3(a[0], a[1], a[2]);
for (const row of SIDE_FIGURES) {
  const found = S.resolveFigure(row.id, SIDE_FIGURES, known);
  const p = F.placeFigure(figures.get(found.figure), candidates);
  const fr = S.frameOf(p);
  check(!!fr && p.stars.length >= 4, `${row.id}: at least four corners are measured stars (${p.stars.length})`);
  if (!fr) continue;
  check(fr.farLy / fr.nearLy > 1.4, `${row.id}: its stars are at very different distances (${fr.nearLy.toFixed(0)} to ${fr.farLy.toFixed(0)} ly)`);
  check(fr.radiusRad > 2 * DEG && fr.radiusRad < 40 * DEG, `${row.id}: ${(fr.radiusRad / DEG).toFixed(1)} degrees from its middle to its farthest corner`);
  const { up, side } = S.sideBasis(fr.dir);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  check(Math.abs(Math.hypot(...up) - 1) < 1e-9 && Math.abs(dot(up, fr.dir)) < 1e-9 && Math.abs(dot(side, fr.dir)) < 1e-9 && Math.abs(dot(side, up)) < 1e-9, `${row.id}: the view's up and side are square to the line of sight`);
  const north = F.eqToEcl(F.dirOf(0, 90));
  check(dot(up, north) > 0, `${row.id}: north is up`);
  // The camera at 0 degrees: on the line from the figure's middle to the Sun, a little short of the Sun.
  const off = S.homeOffsetLy(fr.distanceLy, fr.nearLy);
  check(off > 0 && off <= 0.005 * fr.distanceLy + 1e-12 && off <= 0.01 * fr.nearLy + 1e-12, `${row.id}: the camera stands ${off.toFixed(2)} light-years short of the Sun`);
  const home = fr.dir.map((v) => v * off);
  check(S.angleOf(home, fr.targetLy, [0, 0, 0]) < 1e-3, `${row.id}: at 0 degrees the camera is on the line to the Sun`);
  let worst = 0;
  for (const s of p.stars) {
    const fromSun = s.posLy.map((v) => v / s.ly);
    const rel = [s.posLy[0] - home[0], s.posLy[1] - home[1], s.posLy[2] - home[2]];
    const n = Math.hypot(...rel);
    worst = Math.max(worst, Math.acos(Math.min(1, dot(fromSun, rel) / n)) / DEG);
  }
  check(worst < 0.6, `${row.id}: from there every corner is within 0.6 of a degree of where the Sun sees it (worst ${worst.toFixed(2)})`);
  // A turn of 70 degrees about `up`: still as far from the middle, 70 degrees round, and well away from the Sun.
  const a = S.SIDE_DEG * DEG;
  const d = fr.distanceLy - off;
  const back = fr.dir.map((v) => -v);
  const cam = [0, 1, 2].map((k) => fr.targetLy[k] + d * (Math.cos(a) * back[k] + Math.sin(a) * side[k]));
  check(Math.abs(S.angleOf(cam, fr.targetLy, home) - S.SIDE_DEG) < 1e-6, `${row.id}: the swing is an angle at the figure's middle`);
  const fromSunLy = Math.hypot(...cam);
  check(Math.abs(fromSunLy - 2 * fr.distanceLy * Math.sin(a / 2)) < 0.02 * fr.distanceLy, `${row.id}: at ${S.SIDE_DEG} degrees the camera is ${fromSunLy.toFixed(0)} light-years from the Sun`);
  // The rig's angles for the home side: turned back, they are that side (scene/camera.js flyTo's `offset` branch).
  const ang = S.rigAngles(toVec(back), toVec(up));
  const q = new THREE.Quaternion().setFromUnitVectors(toVec(up), new THREE.Vector3(0, 1, 0)).invert();
  const v = new THREE.Vector3(Math.sin(ang.polar) * Math.sin(ang.azimuth), Math.cos(ang.polar), Math.sin(ang.polar) * Math.cos(ang.azimuth)).applyQuaternion(q);
  check(v.distanceTo(toVec(back)) < 1e-6 && Math.abs(ang.polar - Math.PI / 2) < 1e-6, `${row.id}: the rig's angles put the camera on the Sun's side, level with the figure`);
}
// Orion is the review's own example: Bellatrix about 250 light-years, the belt's middle star nearly 2 000.
{
  const fr = S.frameOf(F.placeFigure(figures.get('Ori'), candidates));
  check(fr.nearLy < 300 && fr.farLy > 1200, `Orion's corners run from ${fr.nearLy.toFixed(0)} to ${fr.farLy.toFixed(0)} light-years`);
}
{
  const src = readFileSync(join(JS, 'ui/figureside.js'), 'utf8');
  check(/export function sideLink\(ctx, value\) \{\s*return \(ctx\.figureSide = ctx\.figureSide \|\| createFigureSide\(ctx\)\)\.fromLink\(value\);/.test(src), 'sideLink makes the side view once, keeps it on ctx.figureSide and hands it the figure');
}
check(S.frameOf(null) === null && S.frameOf({ stars: [] }) === null, 'a figure with no measured corner has no frame');
{
  const rigSrc = readFileSync(join(JS, 'scene/camera.js'), 'utf8');
  check(/toAz = Math\.atan2\(_tmp\.x, _tmp\.z\);\s*toPolar = Math\.acos\(THREE\.MathUtils\.clamp\(_tmp\.y, -1, 1\)\);/.test(rigSrc), 'scene/camera.js still turns an offset into its angles the way rigAngles() copies');
}

// ---------------------------------------------------------------- 5. the lens
check(S.fovFor(12 * DEG, 1.6, 45) === 45, 'Orion fits a desktop at the app\'s own lens');
const phone = S.fovFor(13 * DEG, 390 / 844, 45, 0.6);
check(phone > 45 && phone <= 100, `on a phone the lens widens for the Big Dipper (${phone.toFixed(1)} degrees)`);
check(S.fovFor(60 * DEG, 0.46, 45) === 100, 'never wider than 100 degrees');
{
  // the figure's half-width takes `fill` of the narrow half of the screen
  const r = 13 * DEG; const aspect = 390 / 844; const fill = 0.6;
  const fov = S.fovFor(r, aspect, 45, fill);
  const halfH = Math.atan(Math.tan(fov * DEG / 2) * aspect);
  check(Math.abs(Math.tan(r / fill) - Math.tan(halfH)) < 1e-9, 'the widened lens fits the figure to the narrow side');
}

// ---------------------------------------------------------------- 6. the swing
check(S.sweepAt(0, 0, 70, 20000) === 0 && S.sweepAt(20000, 0, 70, 20000) === 70 && S.sweepAt(1e9, 0, 70, 20000) === 70, 'the flight starts at the Sun and ends at the side');
{
  let prev = -1; let mono = true;
  for (let ms = 0; ms <= 20000; ms += 250) { const d = S.sweepAt(ms, 0, 70, 20000); if (d < prev - 1e-12) mono = false; prev = d; }
  check(mono, 'the flight never turns back');
  check(Math.abs(S.sweepAt(10000, 0, 70, 20000) - 35) < 1e-9, 'half way in time is half way round');
  check(S.sweepAt(5, 30, 70, 0) === 70, 'a flight of no length is there at once');
}
check(S.FLY_MS === 20000 && S.SIDE_DEG <= S.MAX_DEG && S.MAX_DEG === 90, 'twenty seconds to the side; the slider goes to a quarter turn');

// ---------------------------------------------------------------- 7. the words, the link, the boot
const W = COPY.figureSide;
for (const key of ['open', 'openTitle', 'searchRow', 'searchSub', 'title', 'lede', 'angle', 'where', 'home', 'range', 'play', 'pause', 'jump', 'back', 'another', 'honest', 'unplaced', 'close', 'unknown', 'inTrip', 'failed']) {
  check(typeof W[key] === 'string' && W[key].length > 0, `copy/en.side.js has figureSide.${key}`);
}
check(/Measured/.test(W.honest) && /Tradition/.test(W.honest) && /least certain/.test(W.honest), 'the panel says what is measured, what is tradition, and that the farthest are the least certain');
for (const key of ['open', 'play', 'pause', 'jump', 'back', 'another', 'close']) check(W[key].length <= 60 && !/!/.test(W[key]), `figureSide.${key} is a short line of chrome`);
for (const r of SIDE_FIGURES) {
  if (r.name) check(typeof W.names[r.name] === 'string', `the copy names ${r.id}`);
  if (r.note) check(typeof W.notes[r.note] === 'string', `the copy has ${r.id}'s note`);
}
for (const lang of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const mod = await import(join(JS, `copy/${lang}.js`));
  const sec = mod.COPY.figureSide;
  const all = sec && Object.keys(W).every((k) => (typeof W[k] === 'string' ? typeof sec[k] === 'string' && sec[k] : sec[k] && Object.keys(W[k]).every((kk) => typeof sec[k][kk] === 'string' && sec[k][kk])));
  const own = sec ? Object.keys(W).filter((k) => typeof W[k] === 'string' && sec[k] !== W[k]).length : 0;
  check(!!all && own >= 20, `copy/${lang}.js has every string of figureSide, in its own words (${own} differ from the English)`);
}
const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
check(KEYS.includes('figure') && KEYS.indexOf('figure') < KEYS.indexOf('cam') && KEYS[KEYS.length - 1] === 'cam', '`figure` is a key of the link, before `cam`');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/ui\/figureside\.js'\)/.test(main) && !/^import[^\n]*figureside/m.test(main), 'main.js fetches ui/figureside.js when it is asked for, never at boot');
check(/for \(const name of \['sr:figure-side', 'sr:layers-ready', 'hashchange'\]\) \{\s*window\.addEventListener\(name,/.test(main) && /e\.detail \|\| readUrlKeys\(\)\.figure/.test(main) && /m\.sideLink\(ctx, v\)/.test(main), 'main.js opens it for a card\'s or a search row\'s event, for a link once the layers have landed and for a link pasted later');
const story = readFileSync(join(JS, 'ui/skystory.js'), 'utf8');
check(/lore\.culture === 'western'/.test(story) && /new CustomEvent\('sr:figure-side', \{ detail: lore\.key \}\)/.test(story) && /ui-btn ui-btn--secondary/.test(story), 'a western figure\'s story card has the button, a shared control, and asks by the figure\'s own key');
// The search field, for real: "big dipper" finds its row (nothing else answers to that name), "orion" finds the
// constellation first and its side view beside it.
{
  const R = await import(join(JS, 'ui/searchrows.js'));
  const n = R.setConstellations(names, lines);
  check(n >= 85 && n <= 90, `the side views are not counted as star patterns (${n})`);
  const dipper = R.findExtras('big dipper');
  check(dipper.length >= 1 && dipper[0].extra === 'figureside' && dipper[0].id === 'big-dipper' && dipper[0].name === 'Big Dipper from the side', `"big dipper" finds its side view (${JSON.stringify(dipper[0])})`);
  const orion = R.findExtras('orion');
  check(orion[0].extra === 'constellation' && orion.some((e) => e.extra === 'figureside' && e.id === 'orion' && e.sub === W.searchSub), `"orion" finds the constellation, then Orion from the side (${orion.map((e) => e.extra)})`);
  let asked = null;
  const had = globalThis.window; const hadEvent = globalThis.CustomEvent;
  globalThis.window = { dispatchEvent: (e) => { asked = [e.type, e.detail]; } };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  const ok = R.runExtra({}, dipper[0]);
  globalThis.window = had; globalThis.CustomEvent = hadEvent;
  check(ok === true && asked && asked[0] === 'sr:figure-side' && asked[1] === 'big-dipper', 'following the row asks for that figure from the side');
}
const rows = readFileSync(join(JS, 'ui/searchrows.js'), 'utf8');
check(/extra: 'figureside'/.test(rows) && /hit\.extra === 'figureside'\) \{ window\.dispatchEvent\(new CustomEvent\('sr:figure-side', \{ detail: hit\.id \}\)\)/.test(rows), 'the search field has a row for each offered figure and asks for it by the same event');
// The boot graph: none of the new files is reachable by static imports from main.js.
{
  const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
  const seen = new Set(); const todo = [join(JS, 'main.js')];
  while (todo.length) {
    const path = todo.pop();
    if (seen.has(path)) continue;
    let text; try { text = readFileSync(path, 'utf8'); } catch { continue; }
    seen.add(path);
    for (const m of text.matchAll(STATIC)) todo.push(join(dirname(path), m[1]));
  }
  for (const f of ['ui/figureside.js', 'data/sideviews.js', 'copy/en.side.js', 'scene/figures3d.js', 'ui/skystory.js']) check(!seen.has(join(JS, f)), `${f} is not in the first visit`);
}
const side = readFileSync(join(JS, 'ui/figureside.js'), 'utf8');
check(/prefers-reduced-motion: reduce/.test(side) && /if \(reduced\(\)\) \{ setAngle\(SIDE_DEG\)/.test(side), 'under reduced motion the button goes to the side at once: nothing flies');
check(/'sr-figside sr-float ui-pop'/.test(side) && /ui-btn ui-btn--primary/.test(side) && (side.match(/ui-btn--primary/g) || []).length === 1, 'the panel is the shared popover with one ember action');
const css = readFileSync(join(ROOT, 'site/css/figureside.css'), 'utf8');
check(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'css/figureside.css uses tokens only');
const shift = readFileSync(join(JS, 'scene/viewshift.js'), 'utf8');
check(/'html\.sr-phone :is\(\.sr-cutaway,\.sr-figside\)'/.test(shift), 'on a phone the view moves out from under the panel (scene/viewshift.js)');

if (problems.length) { console.error('figure side FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`figure side ok: ${SIDE_FIGURES.length} figures offered (Orion, the Big Dipper's seven stars, Cassiopeia, the Southern Cross, Scorpius, Leo), each exact from the Sun and apart from the side, in eleven languages, out of the first visit`);
