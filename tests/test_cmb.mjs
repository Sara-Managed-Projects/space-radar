// tests/test_cmb.mjs -- the microwave background at the horizon (internal spec 0076 stage W1-b, internal
// #781; spec 0075 tasks 24, 65, 67): the map's frame is Galactic and is turned to the map's axes; the
// colour scale's numbers are the picture's; nothing is drawn past the horizon; from inside the map is
// not the deep sky's backdrop; the words on the scene exist as text a screen reader is given.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// A page with no canvas: elements that hold text, so the live region exists and the sprites do not.
const made = [];
const fakeEl = (tag) => {
  const el = { tag, attrs: {}, children: [], textContent: '', className: '', id: '', parentNode: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; } };
  made.push(el);
  return el;
};
globalThis.document = { createElement: fakeEl, body: fakeEl('body'), documentElement: fakeEl('html') };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const C = await import(join(JS, 'scene/deep/cmb.js'));
const S = await import(join(JS, 'scene/shells.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { horizonLy, cmbLy, ageGyr, PLANCK18 } = await import(join(JS, 'data/cosmology.js'));
const { LADDER_RUNGS } = await import(join(JS, 'data/ladder.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

const LY_KM = 9460730472580.8;
const DEG = Math.PI / 180;
const EPS = 23.4392911 * DEG;
/** An equatorial J2000 direction in the scene's axes on a rung (scene/stage.js), as the look probes compute it. */
const eqToScene = (raDeg, decDeg) => {
  const ra = raDeg * DEG, dec = decDeg * DEG;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  return { x, y: -y * Math.sin(EPS) + z * Math.cos(EPS), z: -(y * Math.cos(EPS) + z * Math.sin(EPS)) };
};
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y + a.z * b.z) / Math.hypot(a.x, a.y, a.z) / Math.hypot(b.x, b.y, b.z)))) / DEG;
const galDir = (lDeg, bDeg) => ({ x: Math.cos(bDeg * DEG) * Math.cos(lDeg * DEG), y: Math.cos(bDeg * DEG) * Math.sin(lDeg * DEG), z: Math.sin(bDeg * DEG) });

// 1. THE FRAME. The picture is in Galactic longitude and latitude; the sphere turns it to the map's axes.
{
  const M = C.SCENE_FROM_GAL;
  const det = M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]);
  check(Math.abs(det - 1) < 1e-6, `Galactic to the scene is a rotation (det ${det})`);
  const gc = C.galToScene(galDir(0, 0));
  const ngp = C.galToScene(galDir(0, 90));
  check(angle(gc, eqToScene(266.40500, -28.93617)) < 0.02, `l = 0, b = 0 lies toward the Galactic centre, RA 266.4 Dec -28.9 (${angle(gc, eqToScene(266.405, -28.93617)).toFixed(4)} degrees off)`);
  check(angle(ngp, eqToScene(192.85948, 27.12825)) < 0.02, `b = +90 is the Galactic north pole, RA 192.86 Dec +27.13 (${angle(ngp, eqToScene(192.85948, 27.12825)).toFixed(4)} degrees off)`);
  // The Cold Spot (Cruz et al. 2005: l 209, b -57) read back from its scene direction.
  const cs = C.galUv(C.galToScene(galDir(209, -57)));
  check(Math.abs(cs.lDeg - 209) < 1e-6 && Math.abs(cs.bDeg + 57) < 1e-6, `a scene direction reads the picture at its own l and b (${cs.lDeg.toFixed(3)}, ${cs.bDeg.toFixed(3)})`);
  check(Math.abs(cs.u - 209 / 360) < 1e-9 && Math.abs(cs.v - (0.5 - 57 / 180)) < 1e-9, 'u is l over 360 and v is 0.5 + b / 180, as scripts/build_deep_cmb.py lays the grid');
  const pole = C.galUv(ngp);
  check(Math.abs(pole.v - 1) < 1e-4, `the north Galactic pole reads the top row (v ${pole.v})`);
  // The shader does what galUv says, with the same matrix (row-major into Matrix3.set, then GLSL's mat3 * v).
  const src = read('site/js/scene/deep/cmb.js');
  check(/new THREE\.Matrix3\(\)\.set\(\.\.\.GAL_FROM_SCENE\)/.test(src) && /vec3 g = uToGal \* normalize\(vDir\);/.test(src), 'the shader turns the scene direction with the same matrix');
  check(/vec2\(l \/ \(2\.0 \* PI\), 0\.5 \+ b \/ PI\)/.test(src), 'and reads the picture where galUv says');
  check(/tex\.wrapS = THREE\.RepeatWrapping/.test(src) && /tex\.generateMipmaps = false/.test(src), 'across l = 0 the picture wraps, with no mipmap level to show the seam');
}

// 2. THE PICTURE and its manifest: the source pinned, Galactic, the scale the module prints, within budget.
{
  const man = JSON.parse(read('site/images/deep/cmb/wmap-ilc-9yr.json'));
  const img = readFileSync(join(ROOT, 'site/images/deep/cmb/wmap-ilc-9yr.webp'));
  const build = read('scripts/build_deep_cmb.py');
  check(man.frame === 'galactic' && /column 0 at l = 0/.test(man.projection) && /row 0 at b = \+90/.test(man.projection), 'the manifest says the grid is Galactic, l from column 0, b = +90 at the top');
  check(man.scaleUk === C.SCALE_UK && new RegExp(`SCALE_UK = ${C.SCALE_UK}\\b`).test(build), `the picture's scale (${man.scaleUk} uK) is the module's (${C.SCALE_UK}) and the build's`);
  check(man.fileBytes === img.length && man.fileSha256 === createHash('sha256').update(img).digest('hex'), 'the manifest names the picture that is there');
  const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
  check(img.length <= BUDGETS.deep_cmb_map_bytes && BUDGETS.deep_cmb_map_bytes <= 600000, `the map is within its budget, at most 600 kB (${img.length} B of ${BUDGETS.deep_cmb_map_bytes}; registry/budgets.yaml deep_cmb_map_bytes)`);
  const pinned = (build.match(/SOURCE_SHA256 = "([0-9a-f]{64})"/) || [])[1];
  check(pinned && man.source.sha256 === pinned && /lambda\.gsfc\.nasa\.gov/.test(man.source.url), 'the source is LAMBDA\'s file, pinned by SHA-256');
  check(/no copyright/.test(man.source.licence), 'and its licence is written down');
  check(man.width === 1024 && man.height === 512, 'the grid is 1024 x 512: 2 MB on the GPU without mipmaps');
  check(man.stats.rmsUk > 60 && man.stats.rmsUk < 90 && man.stats.clippedShare < 0.01, `the map is the background's (rms ${man.stats.rmsUk} uK) and the scale clips under 1 % of it (${man.stats.clippedShare})`);
  check(/0076 W1-b/.test(read('CREDITS.md')) && /wmap-ilc-9yr\.webp/.test(read('CREDITS.md')), 'CREDITS.md has the map\'s line');
}

// 3. THE COLOUR SCALE: the grey's numbers, the colours at its ends and middle, cold to warm in order.
{
  check(C.greyToUk(0) === -C.SCALE_UK && C.greyToUk(255) === C.SCALE_UK && Math.abs(C.greyToUk(127.5)) < 1e-9, 'grey 0 is -200 uK, 255 is +200, the middle is the average');
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
  check(near(C.colourAt(-C.SCALE_UK), hex(C.STOPS[0])) && near(C.colourAt(C.SCALE_UK), hex(C.STOPS[C.STOPS.length - 1])) && near(C.colourAt(0), hex(C.STOPS[3])), 'the ends and the middle of the scale are its first, last and middle colours');
  check(near(C.colourAt(-999), C.colourAt(-C.SCALE_UK)) && near(C.colourAt(999), C.colourAt(C.SCALE_UK)), 'past the ends the colour is clipped, as the picture is');
  // Diverging: blue below the average, orange above it, and brighter the farther from it on either side.
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let ok = true;
  for (let uk = 10; uk <= 200; uk += 10) {
    const [cr, , cb] = C.colourAt(-uk), [wr, , wb] = C.colourAt(uk);
    if (!(cb > cr && wr > wb)) ok = false;
    if (!(lum(C.colourAt(-uk)) > lum(C.colourAt(-uk + 10)) && lum(C.colourAt(uk)) > lum(C.colourAt(uk - 10)))) ok = false;
  }
  check(ok, 'colder is blue and warmer orange, each brighter the farther it is from the average');
  const mid = C.colourAt(0);
  check(Math.max(...mid) < 0.15, 'the average is dark, so the sphere never washes the view');
  const src = read('site/js/scene/deep/cmb.js');
  check(/uniform vec3 uStops\[7\];/.test(src) && C.STOPS.length === 7 && /t \* 6\.0/.test(src), 'the shader mixes the same seven stops at equal steps');
  check(/toneMapped: false/.test(src) && !/colorspace_fragment|tonemapping_fragment|AdditiveBlending/.test(src), 'display values, no tone mapping, nothing additive: the legend and the sphere are the same colours');
  const bar = S.cmbWords(false).find((l) => typeof l === 'object');
  check(bar && bar.left.includes(`−${C.SCALE_UK} µK`) && bar.right.includes(`+${C.SCALE_UK} µK`) && bar.mid.includes(`${PLANCK18.Tcmb0.toFixed(4)} K`), `the legend prints the scale in microkelvin round the average of 2.7255 K (${bar && [bar.left, bar.mid, bar.right].join(' | ')})`);
  check(/\{ \.\.\.l, stops: cmbStops/.test(read('site/js/scene/shells.js')) && /cmbStops = m\.STOPS/.test(read('site/js/scene/shells.js')), 'the legend\'s bar is drawn from the module\'s own stops');
}

// 4. NOTHING PAST THE HORIZON, and not the deep sky's backdrop from inside.
{
  check(S.CMB_LY === cmbLy() && S.CMB_LY < horizonLy() && S.CMB_LY < S.HORIZON_LY, `the map's sphere is where the light left from, ${(S.CMB_LY / 1e9).toFixed(2)} Gly, inside the ${(S.HORIZON_LY / 1e9).toFixed(2)} Gly horizon`);
  const r = S.CMB_LY;
  check(C.cmbOpacity(1e9 / r) === 0 && C.cmbOpacity(20e9 / r) === 0 && C.cmbOpacity(29.5e9 / r) === 0, 'from 1 and 20 billion light-years the map is not drawn: the deep sky keeps its dark sky');
  check(C.cmbOpacity(40e9 / r) > 0.5, 'from 40 billion light-years, on the way out, it is');
  check(C.cmbOpacity(0.999) < 0.01 && C.cmbOpacity(1.0) === 0 && C.cmbOpacity(1.0005) < 0.02, 'the camera never passes through a coloured wall: the map is gone at its surface');
  check(C.cmbOpacity(50e9 / r) > 0.9, 'from the map\'s edge at 50 billion light-years, outside it, it is drawn whole');
  check(C.LOAD_RATIO === S.CMB_LOAD_RATIO && C.cmbOpacity(C.LOAD_RATIO) === 0, 'the picture is fetched before the map is drawn');
  check(C.UNDER_MEASURED.map === 'same' && !/uTime|time/.test(read('site/js/scene/deep/cmb.js').split('const VERT')[1].split('export function createCmb')[0]), 'the map is measured and still: the same under Measured, nothing in its shader moves');
  const sh = read('site/js/scene/shells.js');
  check(!/from '\.\/deep\/cmb\.js'/.test(sh) && /import\('\.\/deep\/cmb\.js'\)/.test(sh), 'scene/shells.js fetches the map\'s module only when it is wanted');
}

// 5. THE SCENE AND ITS WORDS, read aloud: a camera on the Local Group's stage, from 1 to 48 billion ly.
{
  stage.setWorld('local-group');
  const scene = new THREE.Scene();
  let loads = 0;
  const loadMap = (url, ok) => { loads += 1; const t = new THREE.Texture(); setTimeout(ok, 0); return t; };
  const shells = S.createShells(scene, { loadMap });
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 1e-5, 1e9);
  const at = (gly) => { cam.position.set(0, 0.3, 1).normalize().multiplyScalar((gly * 1e9 * LY_KM) / stage.unitKm); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); };
  const tMs = Date.parse('2026-10-15T12:00:00Z');
  const live = made.find((e) => e.id === 'sr-shells-words');
  check(!!live && live.attrs.role === 'status' && live.attrs['aria-live'] === 'polite' && live.className === 'sr-hidden-text' && live.parentNode === document.body, 'the scene\'s words have a visually hidden polite live region on the page');
  const cmbState = () => shells.state().find((s) => s.id === 'cmb');
  at(1); shells.update(cam, tMs);
  check(loads === 0 && cmbState().status === 'not fetched', 'at a billion light-years nothing of the map is fetched');
  check(shells.spoken() === '', `and nothing is said (${shells.spoken()})`);
  at(20); shells.update(cam, tMs);
  await new Promise((r) => setTimeout(r, 50));
  shells.update(cam, tMs);
  check(loads === 1, `20 billion light-years out the picture is fetched, once (${loads})`);
  check(!cmbState().drawn && !/oldest light/.test(shells.spoken()), 'but the map is not drawn yet and its words are not said');
  at(40); shells.update(cam, tMs);
  await new Promise((r) => setTimeout(r, 600)); // the half second a map that lands late comes in over
  shells.update(cam, tMs);
  const s40 = cmbState();
  check(s40.drawn && s40.side === 'inside', `from 40 billion light-years the map is drawn, on the inside (${JSON.stringify(s40)})`);
  const mesh = scene.getObjectByName('shells:cmb');
  const rC = (S.CMB_LY * LY_KM) / stage.unitKm;
  const rH = (S.HORIZON_LY * LY_KM) / stage.unitKm;
  check(mesh && Math.abs(mesh.scale.x / rC - 1) < 1e-9 && mesh.scale.x < rH && mesh.material.side === THREE.BackSide, 'its sphere is at the light\'s radius, inside the horizon, seen from within');
  {
    // What the map adds to a frame: its sphere, and the words at the foot (sprites here are none: no canvas).
    const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
    const drawn = [];
    scene.traverseVisible((o) => { if (o.isMesh || o.isSprite) drawn.push(o.name); });
    const added = drawn.filter((n) => n === 'shells:cmb' || n === 'shells:edge-label').length + 1; // + the foot's words on a page
    check(added <= BUDGETS.deep_cmb_draw_calls, `the map adds ${added} draw calls, within registry/budgets.yaml deep_cmb_draw_calls (${BUDGETS.deep_cmb_draw_calls})`);
  }
  const said40 = shells.spoken();
  for (const w of [COPY.deepCosmos.cmbTitle, 'about 370 000 years after the Big Bang', 'an illustration', COPY.deepCosmos.cmbElsewhere, 'Colour scale: blue is up to 200 millionths of a degree colder than the average of 2.7255 kelvin', 'WMAP']) {
    check(said40.includes(w), `from inside a screen reader is told "${w}" (${said40})`);
  }
  check(!/µK/.test(said40), 'the scale is said in words, not read out as symbols');
  at(48); shells.update(cam, tMs);
  const s48 = cmbState();
  check(s48.drawn && s48.side === 'outside' && mesh.material.side === THREE.FrontSide, 'from just outside the horizon the map is on the near wall');
  const said48 = shells.spoken();
  for (const w of [COPY.deepCosmos.horizon, '46 billion light-years away now', COPY.deepCosmos.cmbTitle, 'Painted on the sphere it left from: an illustration', 'Colour scale', COPY.deepCosmos.edgeNothing]) {
    check(said48.includes(w), `outside a screen reader is told "${w}"`);
  }
  check(!said48.includes(COPY.deepCosmos.cmbElsewhere), 'and not the inside\'s line');
  const before = live.textContent;
  shells.update(cam, tMs); shells.update(cam, tMs);
  check(live.textContent === before && before === said48, 'the region changes only when what is shown changes');
  stage.setWorld('earth');
  shells.update(cam, tMs);
  check(shells.spoken() === '' && live.textContent === '', 'off the ladder nothing is said');
  shells.dispose();
  check(!document.body.children.includes(live), 'and the region goes with the shells');
  check(Math.abs(S.cmbYears() - Math.round(ageGyr(PLANCK18.zCmb) * 1e5) * 1e4) < 1 && S.cmbYears() === 370000, `the years are the cosmology's, to the nearest 10 000 (${S.cmbYears()})`);
}

// 6. THE EDGE RUNG (spec 0075 task 65).
{
  const edge = LADDER_RUNGS.find((r) => r.id === 'edge');
  check(edge && edge.target.place === 'horizon' && LADDER_RUNGS[LADDER_RUNGS.length - 1] === edge, 'the ladder ends on the edge rung, the horizon');
  check(edge && edge.distance.startsWith(String(Math.round(horizonLy() / 1e9))) && /370 000/.test(edge.why), 'its distance is the horizon\'s and its words name the background\'s age');
}

if (problems.length) { console.error('cmb FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`cmb ok: WMAP's map turned from Galactic to the map's axes (the centre and the pole within 0.02 degrees), a ${C.STOPS.length}-colour scale of +-${C.SCALE_UK} uK, the sphere at ${(S.CMB_LY / 1e9).toFixed(1)} Gly inside the ${(S.HORIZON_LY / 1e9).toFixed(1)} Gly horizon, drawn from 30 Gly and from outside, its words in a live region; ${statSync(join(ROOT, 'site/images/deep/cmb/wmap-ilc-9yr.webp')).size} B`);
