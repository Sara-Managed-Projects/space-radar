// tests/test_groundsky_smoke.mjs -- the sky from the ground, built and run for a night without a
// browser: sky/groundsky.js with a stand-in document, the real data files and the real three.js.
// No pixel is drawn (there is no GL here), so this holds what a pixel test cannot be asked to on
// every commit: that the layer builds, that a frame at noon, at dusk and at night runs to its
// end, that a narrow field asks for star tiles and gets them, that the land is chosen, the
// constellation under the view is found, a tap is answered, and that dispose() leaves nothing.
//   node tests/test_groundsky_smoke.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- a stand-in page ---------------------------------------------------------------------------------
function node(tag) {
  const n = {
    tagName: String(tag).toUpperCase(), children: [], style: {}, dataset: {}, attrs: {}, hidden: false, className: '', textContent: '', parentNode: null,
    offsetTop: 24, offsetWidth: 120,
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    append(...cs) { for (const c of cs) this.appendChild(c); },
    insertBefore(c) { c.parentNode = this; this.children.unshift(c); return c; },
    addEventListener() {},
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((x) => x !== this); this.parentNode = null; },
  };
  return n;
}
const body = node('body');
const wrap = node('div');
body.appendChild(wrap);
const labelsHost = node('div');
wrap.appendChild(labelsHost);
globalThis.document = { createElement: node, createElementNS: (ns, tag) => Object.assign(node(tag), { removeEventListener() {} }), getElementById: (id) => (id === 'labels' ? labelsHost : null), body };
// The data files, read from the repository when the layer fetches them.
const fetched = [];
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  fetched.push(u.pathname.split('/site/')[1]);
  try {
    const buf = readFileSync(fileURLToPath(u));
    return { ok: true, status: 200, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), text: async () => buf.toString('utf8'), blob: async () => ({}) };
  } catch { return { ok: false, status: 404 }; }
};

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createGroundSky } = await import(join(JS, 'sky/groundsky.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));

const observer = { latDeg: 35.2, lonDeg: -111.65, altKm: 2.1 };
const group = new THREE.Group();
const camera = new THREE.PerspectiveCamera(72, 1.6, 0.001, 1e9);
const renderer = { domElement: { clientWidth: 1440, clientHeight: 900 }, getPixelRatio: () => 1 };
const records = [{ id: 'dso-m42', name: 'Orion Nebula', pos: { x: 0.1, y: -0.9, z: -0.4 }, meta: { mag: 4, typeText: 'nebula' } }];
const ctx = { recordsFor: (id) => (id === 'deep-sky' ? records : []), labels: { boxes: () => [] } };
let pointed = null;
const ground = createGroundSky(ctx, { group, radius: 1, observer, domElement: null, options: { darkness: 'dark' }, pointAt: (where, opts) => { pointed = { where, opts }; return true; } });
await ground.ready;
await new Promise((r) => setTimeout(r, 700)); // the idle work: names, tier 1, the constellation table, the pictures

const obs = new A.Observer(observer.latDeg, observer.lonDeg, 0);
const sun = (ms) => { const d = new Date(ms); const eq = A.Equator('Sun', d, obs, true, true); const h = A.Horizon(d, obs, eq.ra, eq.dec, 'normal'); return h; };
function lookAt(azDeg, altDeg) {
  const a = azDeg * Math.PI / 180;
  const h = altDeg * Math.PI / 180;
  camera.position.set(0, 0, 0);
  camera.up.set(0, 1, 0);
  camera.lookAt(Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}
function frame(ms, fovDeg) {
  const s = sun(ms);
  camera.fov = fovDeg;
  camera.updateProjectionMatrix();
  ground.update({ tMs: ms, fovDeg, sunAltDeg: s.altitude, sunAzDeg: s.azimuth, moonBright: 0, camera, renderer, showers: [] });
  return s;
}

// --- noon, dusk, night: every frame runs, and the dome's numbers are the model's ---------------------
lookAt(180, 20);
const noonMs = Date.UTC(2026, 9, 8, 19, 24);
const dome = group.getObjectByName('ground-dome');
check(!!dome && dome.material.transparent === true && dome.renderOrder === -100, 'the dome is drawn first, in the pass render orders sort');
const sNoon = frame(noonMs, 72);
check(sNoon.altitude > 40 && dome.material.uniforms.uExposure.value === 1 && dome.material.uniforms.uSun.value.y > 0.6, `noon: the Sun is up and the eye is closed down to 1 (${dome.material.uniforms.uExposure.value})`);
check(ground.stats().limit < 0 && ground.stats().drawn === 0, `by day no star is drawn (limit ${ground.stats().limit.toFixed(1)})`);
const duskMs = A.SearchAltitude('Sun', obs, -1, new Date(noonMs), 1, -4.5).date.getTime();
frame(duskMs, 72);
const u = dome.material.uniforms;
check(u.uExposure.value > 5 && u.uFloorZ.value.z > 3 * u.uFloorZ.value.x && u.uSun.value.y < 0, `civil dusk: the eye has opened and the floor is the blue hour's (${u.uExposure.value.toFixed(1)})`);
const nightMs = Date.UTC(2026, 9, 9, 10, 30);
lookAt(180, 45);
frame(nightMs, 72);
frame(nightMs + 1000, 72);
const st = ground.stats();
check(u.uExposure.value === 0 && st.limit === 6.5 && st.drawn > 4000, `night in a dark place: the Sun's light is gone, the limit is 6.5, ${st.drawn} stars drawn`);
check(st.landscape === 'hills' && group.getObjectByName('sky-land-far') && group.getObjectByName('sky-land-near') && group.getObjectByName('sky-haze'), `the land is chosen and built (${st.landscape})`);
check(typeof st.con === 'string' && st.con.length === 3, `the constellation under the view is found (${st.con})`);
check(!!group.getObjectByName('sky-figure-here'), 'and its figure is drawn brighter');

// --- a city, and a coast (the sea handed in is the test's; the mask needs a browser to be read) ------
ground.setOptions({ darkness: 'city' });
frame(nightMs + 2000, 72);
check(ground.stats().landscape === 'city' && ground.stats().limit === 4, 'in a city the land is a skyline and the limit is 4');
ground.setOptions({ darkness: 'dark' });

// --- zoom: the tiers, then the tiles -----------------------------------------------------------------
// Orion's belt: find where it is and look at it.
const belt = ground.apparentOfEq([Math.cos(-1.2 * Math.PI / 180) * Math.cos(84 * Math.PI / 180), Math.cos(-1.2 * Math.PI / 180) * Math.sin(84 * Math.PI / 180), Math.sin(-1.2 * Math.PI / 180)]);
check(belt.altDeg > 30, `Orion is up at 03:30 in October (${belt.altDeg.toFixed(0)} degrees)`);
lookAt(belt.azDeg, belt.altDeg);
for (let i = 0; i < 6; i += 1) { frame(nightMs + 3000 + i * 100, 7); await new Promise((r) => setTimeout(r, 120)); }
const z = ground.stats();
check(z.limit > 9.2 && z.tier === 2, `at a 7 degree field the limit is ${z.limit.toFixed(1)} and both HYG tiers are in`);
check(z.tiles && z.tiles.tiles >= 2 && z.tileStars > 100 && z.tiles.failed === 0, `the star tiles came, by where the view looks: ${z.tiles && z.tiles.tiles} tiles, ${z.tileStars} of their stars drawn`);
check(fetched.some((p) => /^data\/startiles\/n8\/\d+\.bin$/.test(p)) && fetched.some((p) => /^data\/startiles\/n2\/\d+\.bin$/.test(p)), 'from both levels');
const before = fetched.filter((p) => /startiles/.test(p)).length;
check(before <= 40, `a binocular field asks for a handful of tiles, not the sky (${before})`);
lookAt(180, 45);
frame(nightMs + 5000, 72);
check(ground.stats().tileStars === 0 && fetched.filter((p) => /startiles/.test(p)).length === before, 'back at the eye\'s field no tile is drawn and none is asked for');

// --- a tap: a star says which constellation it is in; empty sky is named too --------------------------
lookAt(belt.azDeg, belt.altDeg);
frame(nightMs + 6000, 40);
const rect = { left: 0, top: 0, width: 1440, height: 900 };
const hit = ground.whatAt(720, 450, camera, rect);
check(hit && hit.con === 'Ori' && hit.conName === 'Orion', `a tap on the belt is in Orion (${hit && hit.kind} ${hit && hit.con})`);
ground.showTag(hit, { name: 'Alnilam', sub: 'star · mag 1.7', label: 'Alnilam, star.', title: '' }, () => {});
const tag = wrap.children.find((c) => c.className.includes('sr-skytag'));
check(tag && /in Orion/.test(tag.children[1].textContent) && /in Orion/.test(tag.attrs['aria-label']), `the tag says "in Orion" (${tag && tag.children[1].textContent})`);
// Somewhere with nothing within a finger's reach: a city's sky, where few stars are drawn.
ground.setOptions({ darkness: 'city' });
frame(nightMs + 7000, 72);
let empty = null;
for (let dx = 40; dx < 1440 && !(empty && empty.kind === 'sky'); dx += 70) empty = ground.whatAt(dx, 120, camera, rect);
ground.setOptions({ darkness: 'dark' });
check(empty && empty.kind === 'sky' && empty.words && empty.words.sub === 'constellation' && empty.name.length > 2, `empty sky answers with its constellation (${empty && empty.name})`);

// --- trails, and the end -------------------------------------------------------------------------------
ground.setOptions({ trails: true });
frame(nightMs + 8000, 72);
const trails = group.getObjectByName('ground-trails');
check(trails && trails.visible && ground.stats().trails > 400 && trails.geometry.attributes.aK.count === ground.stats().trails * 24, `trails: ${ground.stats().trails} stars, 12 segments each`);
ground.setOptions({ trails: false });
frame(nightMs + 9000, 72);
check(trails.visible === false, 'and off again');
ground.dispose();
check(group.children.length === 0 && labelsHost.children.length === 0 && !wrap.children.some((c) => c.className.includes('sr-skytag')), 'dispose() leaves nothing in the scene or the page');
void pointed; void pathToFileURL;

if (problems.length) { console.error('ground sky smoke FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ground sky smoke ok: noon, dusk and night run; ${st.drawn} stars in the eye's draw range, ${z.tileStars} more from ${z.tiles.tiles} tiles at 7 degrees; hills, then a city; a tap in Orion says so; trails on and off; nothing left behind`);
process.exit(0);
