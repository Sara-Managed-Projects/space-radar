// "Depth modelled" (internal #431): scene/depthnote.js, the caption while a reconstructed hero is seen more than 20 degrees off the Sun's line.
// Run: node tests/test_depthnote.mjs
//
// 1. The angle is the one AT THE OBJECT between the line to the camera and the line to the Sun: 0 on the line, 90 at right angles, 180 behind.
// 2. Which heroes: exactly those whose whole drawing is a reconstruction (the emission heroes, the Veil, the Horsehead ...), never the ones
//    drawn from measured speeds or a published model (Cas A, Vela, the Crab, SN 1987A, the Homunculus, the Cat's Eye) and never a galaxy model.
// 3. The caption: nothing at 19.9 degrees, the line at 20.1; nothing for a record without such a hero; the module, run against a
//    stand-in page and stage, shows and hides it as the camera goes round the object, and takes it off when the card closes.
// 4. The words exist in all eleven languages, the line is hooked in main.js after the first visit, the CSS uses tokens only.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

// A stand-in page, before the module loads.
const listeners = new Map();
const made = [];
globalThis.window = { addEventListener: (n, f) => listeners.set(n, f), removeEventListener: (n) => listeners.delete(n) };
globalThis.document = {
  createElement: () => { const el = { hidden: false, textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { this.gone = true; } }; made.push(el); return el; },
  body: { appendChild() {} },
  head: { appendChild() {} },
  querySelector: () => null,
  querySelectorAll: () => [],
};

const D = await import(join(ROOT, 'site/js/scene/depthnote.js'));
const { HEROES, heroForRecord } = await import(join(ROOT, 'site/js/scene/deep/heroes.js'));

// 1. The angle.
const O = { x: 100, y: 0, z: 0 }, SUN = { x: 0, y: 0, z: 0 };
const near = (a, b) => Math.abs(a - b) < 1e-6;
check(near(D.offLineDeg({ x: 50, y: 0, z: 0 }, O, SUN), 0), 'on the line, between the object and the Sun: 0');
check(near(D.offLineDeg({ x: 150, y: 0, z: 0 }, O, SUN), 180), 'behind the object: 180');
check(near(D.offLineDeg({ x: 100, y: 40, z: 0 }, O, SUN), 90), 'at right angles: 90');
check(Math.abs(D.offLineDeg({ x: 100 - 50 * Math.cos(0.4), y: 50 * Math.sin(0.4), z: 0 }, O, SUN) - 22.918) < 0.01, '0.4 rad off the line: 22.92 degrees');
check(D.offLineDeg(O, O, SUN) === 0, 'a camera on the object: no angle, no NaN');
check(D.THRESHOLD_DEG === 20, 'the threshold is 20 degrees');

// 2. Which heroes.
const modelled = HEROES.filter((h) => D.isModelledDepth(h)).map((h) => h.id);
for (const id of ['veil', 'horsehead', 'carina', 'm8', 'rosette', 'm27']) check(modelled.includes(id), `${id}: depth modelled`);
for (const id of ['casa', 'vela', 'catseye', 'sn1987a', 'homunculus', 'crab', 'm83', 'cena', 'm51']) check(!modelled.includes(id), `${id}: not named modelled`);
check(modelled.length >= 12 && modelled.length <= 25, `the set is the emission heroes (${modelled.length})`);

// 3. The caption.
const veil = heroForRecord('dso-veil-nebula'), vela = heroForRecord('dso-vela-pulsar-wind-nebula');
check(D.noteFor({ klass: 'dso' }, veil, 19.9) === '' && D.noteFor({ klass: 'dso' }, veil, 20.1) === 'modelled', 'nothing at 19.9, the line at 20.1');
check(D.noteFor({ klass: 'dso' }, vela, 90) === '' && D.noteFor({ klass: 'star' }, veil, 90) === '' && D.noteFor(null, veil, 90) === '', 'nothing for a measured hero, a star, or no record');

const cam = { position: { x: 50, y: 0, z: 0 } };
const stage = { tMs: 0, toSceneInto: (p, frame, out) => { out.x = p.x; out.y = p.y; out.z = p.z; return out; } };
const ctx = { camera: cam, stage };
const rec = { id: 'dso-veil-nebula', klass: 'dso', frame: 'sun-inertial', pos: { x: 100, y: 0, z: 0 } };
const timers = [];
const realSet = globalThis.setInterval, realClear = globalThis.clearInterval;
globalThis.setInterval = (f) => { timers.push(f); return timers.length; };
globalThis.clearInterval = () => {};
// loadCss reaches for the page; the stand-in has no stylesheet to add, and a failed add must not break the line.
const note = D.attachDepthNote(ctx, { heroForRecord: (id) => Promise.resolve(heroForRecord(id)) });
listeners.get('sr:select')({ detail: rec });
await new Promise((r) => setTimeout(r, 20));
check(timers.length === 1, 'one timer while such a record is selected');
check(note.state().shown === false, 'on the line: no caption');
cam.position = { x: 100, y: 60, z: 0 }; timers[0]();
check(note.state().shown === true && note.state().deg > 85, 'round at right angles: the caption');
const line = made.find((m) => m.textContent);
check(line && /Depth modelled/.test(line.textContent), 'its words are English by default');
cam.position = { x: 60, y: 8, z: 0 }; timers[0]();
check(note.state().shown === false, 'back near the line: gone');
cam.position = { x: 100, y: 60, z: 0 }; timers[0]();
listeners.get('sr:select')({ detail: null });
check(note.state().shown === false && note.state().record === null, 'card closed: gone');
note.dispose();
globalThis.setInterval = realSet; globalThis.clearInterval = realClear;

// 4. Words, hook, CSS.
const LANGS = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh'];
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.deep.js'));
check(/^Depth modelled: only the stars/.test(COPY.depthNote && COPY.depthNote.modelled), 'English words');
for (const l of LANGS) {
  const w = (await import(join(ROOT, `site/js/copy/${l}.js`))).COPY.depthNote;
  check(w && w.modelled && w.modelled !== COPY.depthNote.modelled && w.modelled.length > 15, `${l}: the words are translated`);
}
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(/import\('\.\/scene\/depthnote\.js'\)/.test(main) && /starDeep\(\);\s*depthNote\(\);/.test(main), 'main.js loads it after the first visit, never at boot');
const css = readFileSync(join(ROOT, 'site/css/deep.css'), 'utf8');
const from = css.indexOf('*/', css.indexOf('internal #431: begin')) + 2;
const block = css.slice(from, css.indexOf('/* internal #431: end')).replace(/\/\*[\s\S]*?\*\//g, '');
check(block.length > 200 && !/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(block), 'the CSS block has no colour literal');
check(!/animation|transition/.test(block), 'nothing moves');
const src = readFileSync(join(ROOT, 'site/js/scene/depthnote.js'), 'utf8');
check(!/['"][A-Z][a-z]+ [a-z]+ ?[a-z]*:/.test(src.replace(/\/\/.*$/gm, '')), 'no literal sentence in the module');

if (problems.length) { console.error('depth note FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`depth note ok: ${modelled.length} heroes named modelled, the line at 20 degrees off the Sun's line, words in 11 languages`);
