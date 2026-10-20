// tests/test_photocompare.mjs -- "Compare with the photograph", the slider on a deep-sky card (internal i#776,
// DS-C10 #821; spec 0075 requirement 14 and design section 9).
//
//   node tests/test_photocompare.mjs
//
// WHAT IS HELD. The scene's side (scene/nebulae.js): at 0 nothing changes; the slider draws the photograph at
// its own share on the line it was taken along, and past the near fade that normally puts it away; turned away
// from that line it fades as every placed picture does and the hero's share with it; choosing anything else
// puts it back; it is remembered nowhere. The hero's side (scene/deep/deepsky.js): it gives way by the slider's
// share and by nothing when there is none. The card's side (ui/photocompare.js): it is offered only for a
// record with a shipped reconstruction and a photograph; its slider has a name, a value in words, 44 px of
// target; the first press off the line flies to it, the second does not; and nothing is remembered, written to a
// URL or sent.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const eq = (got, want, what) => check(Object.is(got, want), `${what}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { createNebulae, PICTURE_FOR } = await import(join(JS, 'scene/nebulae.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const H = await import(join(JS, 'scene/deep/heroes.js'));

// --- the scene: M42's picture placed on the stellar rung, a camera we move about it ------------------------------
stage.setWorld('stellar');
stage.setTime(Date.parse('2026-10-03T12:00:00Z'));
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const LY_KM = 9460730472580.8;
const scene = new THREE.Scene();
const skyGroup = new THREE.Group();
skyGroup.scale.setScalar(1000);
scene.add(skyGroup);
skyGroup.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 1e12);
const renderer = { domElement: { clientHeight: 900 } };
const n = createNebulae(scene, { skyGroup, load: () => Promise.resolve(new THREE.Texture()), base: 'https://example.invalid/' });
const records = ['m42', 'm31'].map((id) => { const o = dso.find((x) => x.id === id); return { id: `dso-${id}`, pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM } }; });
n.setSkyOpacity(0);
n.setRecords(records);
n.want('dso-m42');
await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
const m42 = n.group.children.find((c) => c.name === 'nebula-m42');
const centre = new THREE.Vector3().setFromMatrixPosition(m42.matrix);
const sun = new THREE.Vector3().copy(stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial'));
const toSun = sun.clone().sub(centre).normalize();
const width = Math.hypot(m42.matrix.elements[0], m42.matrix.elements[1], m42.matrix.elements[2]) * 2;
const place = (from) => { camera.position.copy(from); camera.lookAt(centre); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); n.update(camera, renderer, true, true); return n.state().find((p) => p.id === 'm42'); };
const onLine = (dist) => centre.clone().add(toSun.clone().multiplyScalar(dist));
const turned = (deg, dist) => { const axis = new THREE.Vector3().crossVectors(toSun, new THREE.Vector3(0, 1, 0)).normalize(); return centre.clone().add(toSun.clone().applyAxisAngle(axis, deg * Math.PI / 180).multiplyScalar(dist)); };

check(typeof n.setCompare === 'function' && typeof n.compareK === 'function' && typeof n.compareShare === 'function' && typeof n.lineShare === 'function' && typeof n.lineFor === 'function', 'the layer answers the slider\'s five calls');
// at 0 nothing changes
let st = place(onLine(width * 3));
eq(st.alpha, 1, 'on the line, at three widths, the picture is whole without the slider');
eq(n.compareShare('dso-m42'), 0, 'and the slider has no share in it');
eq(n.compareK('dso-m42'), 0, 'and stands at 0');
eq(n.lineShare('dso-m42'), 1, 'the picture is whole on its line');
// right up against it the placed picture goes (nearFade), as it always did
st = place(onLine(width * 0.1));
eq(st.alpha, 0, 'against the picture, closer than a fifth of its width, it is put away');
n.setCompare('dso-m42', 0.5);
st = place(onLine(width * 0.1));
check(near(st.alpha, 0.5, 1e-9), `the slider at one half draws it at one half even there (${st.alpha})`);
check(near(n.compareShare('dso-m42'), 0.5, 1e-9) && near(n.drawn('dso-m42'), 0.5, 1e-9), 'and says so to the hero (compareShare) and to the rest (drawn)');
n.setCompare('dso-m42', 1);
st = place(onLine(width * 3));
eq(st.alpha, 1, 'at one it is whole');
eq(n.compareShare('dso-m42'), 1, 'and the hero gives way entirely');
eq(n.compareK('dso-m42'), 1, 'the slider stands at 1');
// turned away: the photograph is flat and faces the Sun
st = place(turned(60, width * 3));
eq(st.alpha, 0, 'turned 60 degrees off its line the picture is gone, slider or not');
eq(n.compareShare('dso-m42'), 0, 'and the hero is not hidden for a picture that is not there');
eq(n.lineShare('dso-m42'), 0, 'the line share says so, which is what makes the card fly back');
st = place(turned(35, width * 3));
check(st.alpha > 0 && st.alpha < 1 && near(n.compareShare('dso-m42'), st.alpha, 1e-9), `at 35 degrees it is part drawn (${st.alpha.toFixed(3)}) and the hero gives way by exactly that`);
// the line
const line = n.lineFor('dso-m42');
check(line && near(Math.hypot(line.offset.x, line.offset.y, line.offset.z), 1, 1e-9), 'the line has a unit offset');
check(line && near(line.offset.x, toSun.x, 1e-9) && near(line.offset.y, toSun.y, 1e-9) && near(line.offset.z, toSun.z, 1e-9), 'toward the Sun');
check(line && near(line.target.x, centre.x, 1e-6 * Math.abs(centre.x) + 1e-9), 'from the picture\'s centre');
eq(n.lineFor('dso-nothing'), null, 'a record with no picture has no line');
// not remembered, put back by choosing anything else
n.want('dso-m31');
eq(n.compareK('dso-m42'), 0, 'selecting another object puts the slider back to the reconstruction');
st = place(onLine(width * 0.1));
eq(st.alpha, 0, 'and the picture is as it was');
n.setCompare('dso-m42', 0.7);
n.want(null);
eq(n.compareK('dso-m42'), 0, 'deselecting does too');
n.setCompare('dso-m13', 1);
eq(n.compareK('dso-m13'), 0, 'a record with no photograph takes no slider');
n.setCompare('dso-m42', NaN);
eq(n.compareK('dso-m42'), 0, 'a value that is not a number is 0');
n.setCompare('dso-m42', 7);
eq(n.compareK('dso-m42'), 1, 'and one past the end is 1');
n.setCompare('dso-m42', 0);
eq(n.compareK('dso-m42'), 0, 'and 0 is off');
n.dispose();

// --- the hero gives way (scene/deep/deepsky.js) --------------------------------------------------------------------------
const deepsky = readFileSync(join(JS, 'scene/deep/deepsky.js'), 'utf8');
check(/fader\.to\(`hero:\$\{h\.def\.id\}`, lv >= 2 \? 1 - \(env\.compareShare \? Math\.min\(1, Math\.max\(0, env\.compareShare\(h\.def\.record\) \|\| 0\)\) : 0\) : 0, now\)/.test(deepsky), 'a hero\'s share is one less the slider\'s, and the old one without it');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/compareShare: \(id\) => \(ctx\.nebulae && ctx\.nebulae\.compareShare \? ctx\.nebulae\.compareShare\(id\) : 0\)/.test(main), 'main.js hands the coordinator that one function');

// --- which records are offered it (scene/deep/heroes.js) ------------------------------------------------------------------
eq(H.heroForRecord('dso-helix-nebula').id, 'helix', 'the Helix has a hero');
eq(H.heroForRecord('dso-m13'), null, 'a globular cluster in the catalogue with no hero has none');
eq(await H.heroShipped('dso-helix-nebula'), true, 'the Helix\'s reconstruction is signed off');
eq(await H.heroShipped('dso-m13'), false, 'no hero, nothing to compare');
eq(await H.heroShipped('dso-m1'), false, 'a hero that is not shipped (the Crab) is not offered');
eq(await H.heroShipped('nonsense'), false, 'and an id that is nothing is not');
const offered = [];
for (const h of H.HEROES) if (await H.heroShipped(h.record) && PICTURE_FOR.has(h.record)) offered.push(h.record);
check(offered.includes('dso-helix-nebula') && offered.includes('dso-lmc') && offered.includes('dso-m31'), `the slider is offered for the Helix, the LMC and Andromeda (${offered.join(', ')})`);

// --- the card (ui/photocompare.js) ------------------------------------------------------------------------------------------
const { install, byText, fire, walk } = await import('./helpers/fakedom.mjs');
const document = install();
const PC = await import(join(JS, 'ui/photocompare.js'));
eq(PC.valueText(0), 'Reconstruction', 'a slider at 0 reads as the reconstruction');
eq(PC.valueText(100), 'Photograph', 'at 100 as the photograph');
eq(PC.valueText(40), '40% photograph', 'between, as a share');
eq(PC.offTheLine(1), false, 'on the line, no flight');
eq(PC.offTheLine(0.4), true, 'off it, a flight');
eq(PC.offTheLine(0), true, 'out of view, a flight');
const calls = { set: [], fly: [], rig: [] };
const neb = {
  k: 0, share: 0, line: 0,
  setCompare(id, k) { calls.set.push([id, k]); this.k = k; },
  compareK() { return this.k; },
  lineShare() { return this.line; },
  lineFor() { return { target: { x: 1, y: 2, z: 3 }, offset: { x: 0, y: 0, z: 1 } }; },
};
const ctx = { nebulae: neb, flyToRecord: (r, ms) => calls.fly.push([r.id, ms]), cameraRig: { state: { distance: 42 }, flyTo: (o) => calls.rig.push(o) } };
const record = { id: 'dso-helix-nebula', name: 'Helix Nebula' };
const box = document.createElement('div');
const mounted = await PC.mountPhotoCompare(box, record, ctx);
check(!!mounted, 'the Helix gets its slider');
const field = box.querySelector('input');
check(!!field && field.attrs.type === 'range' && field.attrs.min === '0' && field.attrs.max === '100', 'a range from 0 to 100');
eq(field.attrs['aria-label'], 'Compare with the photograph', 'it has a name');
eq(field.attrs['aria-valuetext'], 'Reconstruction', 'and says in words where it stands');
check(box.textContent.includes(COPY.photoCompare.title) && box.textContent.includes(COPY.photoCompare.note), 'the title and the line about the photograph being flat are there');
check(box.querySelector('.sr-photocmp__ends').textContent === 'ReconstructionPhotograph', 'the two ends are named');
// off the line: the first press flies, the second does not
neb.line = 0;
field.value = '30'; fire(field, 'input');
eq(calls.rig.length, 1, 'off the line, the first move of the slider flies the camera there');
check(calls.rig[0].offset.z === 1 && calls.rig[0].distance === 42 && calls.rig[0].ms === 900, 'along the Sun\'s line, at the distance it is at');
eq(calls.fly.length, 0, 'by the rig, not by the card\'s arrival, which would change the distance');
eq(calls.set.at(-1).join(), 'dso-helix-nebula,0.3', 'and sets 0.3');
eq(field.attrs['aria-valuetext'], '30% photograph', 'in words, too');
check(box.querySelector('[role="status"]').textContent === COPY.photoCompare.flying, 'and says that it is moving');
field.value = '80'; fire(field, 'input');
eq(calls.rig.length, 1, 'a second move does not fly again');
field.value = '0'; fire(field, 'input');
field.value = '10'; fire(field, 'input');
eq(calls.rig.length, 2, 'back at 0 and away again flies again, if the camera is still off');
neb.line = 1;
field.value = '0'; fire(field, 'input');
field.value = '60'; fire(field, 'input');
eq(calls.rig.length, 2, 'on the line, nothing flies');
eq(box.querySelector('.sr-photocmp__fill').style.width, '60%', 'the filled part follows the value');
// a card repainted while the slider stands at 0.6 comes back at 0.6
const box2 = document.createElement('div');
await PC.mountPhotoCompare(box2, record, ctx);
eq(box2.querySelector('input').value, '60', 'a repainted card shows where the slider stands');
// without a rig, the card's own arrival
const ctx2 = { nebulae: { ...neb, lineFor: undefined, line: 0 }, flyToRecord: (r, ms) => calls.fly.push([r.id, ms]) };
const box3 = document.createElement('div');
await PC.mountPhotoCompare(box3, record, ctx2);
const f3 = box3.querySelector('input'); f3.value = '5'; fire(f3, 'input');
eq(calls.fly.length, 1, 'with no rig it falls back to the card\'s own flight');
// not offered
eq(await PC.mountPhotoCompare(document.createElement('div'), { id: 'dso-m13' }, ctx), null, 'a record with no reconstruction is offered nothing');
eq(await PC.mountPhotoCompare(document.createElement('div'), { id: 'dso-m1' }, ctx), null, 'nor one whose reconstruction is not signed off');
eq(await PC.mountPhotoCompare(document.createElement('div'), record, {}), null, 'nor without the layer of photographs');
eq(await PC.mountPhotoCompare(document.createElement('div'), record, { nebulae: {} }), null, 'nor with a layer that has no slider');
// the source: no storage, no URL key, no request
const src = readFileSync(join(JS, 'ui/photocompare.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
check(!/localStorage|sessionStorage|location|history\.|fetch\(|XMLHttpRequest|sendBeacon/.test(src), 'it keeps nothing, has no URL key and sends nothing');
const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/import\('\.\/photocompare\.js'\)/.test(cards) && !/from '\.\/photocompare\.js'/.test(cards), 'cards.js fetches it by dynamic import only');
const urlstate = readFileSync(join(JS, 'ui/urlstate.js'), 'utf8');
check(!/compare/i.test(urlstate), 'and urlstate.js has no key for it');
walk(box, (node) => { if (node.localName === 'input') check(!!node.attrs['aria-label'], 'the slider is named'); });

if (problems.length) { console.error('photo compare FAILED:\n  ' + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log('photo compare ok: the slider draws the photograph by its share on its line and the hero gives way by the same, fades with the line, is put back by any other choice, is offered for the shipped heroes only, flies to the line once, and is kept nowhere');
