// tests/test_photopresets.mjs -- photo presets (internal i#905, scene/exposure.js PHOTO_PRESETS, ui/sharesheet.js).
//
//   node tests/test_photopresets.mjs
//
// FOUR PRESETS, each a handful of settings that exist already: a shape photo mode has, a lens in its range, a shutter, a look,
// the tag. NONE IS AN EFFECT: no bloom, no grade, no post pass (D2, public #261; the design contract). WORN, NOT STORED: the
// shutter and the look are held while photo mode is open and put back by whichever way it is left, and neither writes the
// visitor's own choice. THE SHEET: a row that opens in place with one button a preset, the object card only for an object.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const E = await mod('scene/exposure.js'); // the shutter and the look, which the presets hold
const PP = await mod('ui/photopresets.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.later.js');
await mod('copy/en.w3e.js'); // the words of the presets and of the rows that hold them
const { PICTURE_PRESETS } = await mod('ui/printcompose.js');
const { LENS } = await mod('ui/photomode.js');

// --- the table ------------------------------------------------------------------------------------------
check(same(PP.PRESET_IDS, ['science', 'cinematic', 'telescope', 'card']), `the issue's four: a science frame, a cinematic frame, a telescope view, an object card (${PP.PRESET_IDS})`);
for (const id of PP.PRESET_IDS) {
  const p = PP.presetOf(id);
  check(p.id === id && Object.keys(PICTURE_PRESETS).includes(p.shape), `${id}: its shape is one photo mode has (${p.shape})`);
  check(p.lens === null || (p.lens >= LENS.min && p.lens <= LENS.max), `${id}: its lens is the map's own or inside photo mode's range (${p.lens})`);
  check(p.exposure === null || E.EXPOSURES.includes(p.exposure), `${id}: its shutter is Eye, Camera, Deep or as it is`);
  check(p.look === null || E.DRAWN.includes(p.look), `${id}: its look is Measured, Film or as it is`);
  check(typeof p.tag === 'boolean', `${id}: the tag is a yes or a no`);
  check(Object.keys(p).sort().join() === 'exposure,id,lens,look,shape,tag', `${id}: nothing else: no field for a grade, a bloom or a pass (${Object.keys(p)})`);
  check(typeof COPY.presets[id] === 'string' && typeof COPY.presets[`${id}Note`] === 'string' && COPY.presets[id].split(/\s+/).length <= 3, `${id}: a name and a note in copy/en.later.js`);
  check(`${COPY.presets[id]}: ${COPY.presets[`${id}Note`]}`.length <= 90, `${id}: its tooltip is short`);
}
check(PP.presetOf('nope') === null && PP.presetOf('__proto__') === null && PP.presetOf('toString') === null, 'an unknown id is no preset');
const P = PP.PHOTO_PRESETS;
check(P.science.look === 'measured' && P.science.exposure === 'camera' && P.science.lens === null, 'science: Measured, Camera, the map\'s own lens: what is measured, as measured');
check(P.cinematic.shape === '16:9' && P.cinematic.lens < 45 && P.cinematic.exposure === 'deep' && P.cinematic.look === 'film', 'cinematic: wide, a long lens, the Deep shutter, Film');
check(P.telescope.lens === LENS.min && P.telescope.shape === '1:1', 'telescope: the narrowest lens photo mode has, square');
check(P.card.shape === '4:5' && P.card.tag === true && P.card.exposure === null && P.card.look === null && P.card.lens === null, 'card: portrait, the tag on, nothing else of the visitor\'s changed');
check(P.science.tag === false && P.cinematic.tag === false && P.telescope.tag === false, 'only the card carries the object\'s tag');
// The contract: nothing here may be a post pass. The scene's module for a pass (tests/test_contract.mjs) names its words.
const exposureSrc = src('site/js/ui/photopresets.js');
check(!/EffectComposer|UnrealBloom|bloom\(|WebGLRenderTarget|ShaderPass|lensflare|diffraction/i.test(exposureSrc.replace(/\/\/[^\n]*/g, '')), 'the module draws nothing: no composer, no bloom, no render target, no flare');

// --- worn, not stored ----------------------------------------------------------------------------------------
{
  const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, m }; };
  const store = mem();
  const exposure = E.createExposure({ storage: store });
  const drawn = E.createDrawn({ storage: store });
  const told = [];
  exposure.onChange((m) => told.push(`exp:${m}`));
  drawn.onChange((m) => told.push(`look:${m}`));
  drawn.set('measured'); told.length = 0; // the visitor's own: Measured
  check(store.m.get(E.DRAWN_KEY) === 'measured', 'the visitor chose Measured, and it is stored');
  const ctx = { exposure, drawn };
  const restore = PP.applyPhotoPreset(ctx, PP.presetOf('cinematic'));
  check(exposure.mode() === 'deep' && drawn.mode() === 'film', 'the cinematic frame wears Deep and Film');
  check(same(told, ['exp:deep', 'look:film']), `and every reader of either is told (${told})`);
  check(store.m.get(E.DRAWN_KEY) === 'measured' && !store.m.has(E.EXPOSURE_KEY), 'neither is stored: the visitor\'s own choice is as it was');
  told.length = 0;
  restore();
  check(exposure.mode() === 'camera' && drawn.mode() === 'measured' && same(told, ['exp:camera', 'look:measured']), `put back, and told (${told})`);
  restore();
  check(told.length === 2, 'putting back twice does nothing the second time');
  // The preset that changes nothing of the visitor's.
  const calm = PP.applyPhotoPreset(ctx, PP.presetOf('card'));
  check(exposure.mode() === 'camera' && drawn.mode() === 'measured' && told.length === 2, 'the object card holds nothing');
  calm();
  // A shutter the trip holds is not taken over, and not released by us.
  exposure.hold('eye');
  const r2 = PP.applyPhotoPreset(ctx, PP.presetOf('cinematic'));
  check(exposure.mode() === 'deep', 'a preset outranks a held shutter while it is worn');
  r2();
  check(exposure.mode() === 'camera', 'and leaves the shutter released (the trip\'s hold is the trip\'s own to ask again)');
  exposure.release();
  // The look: set for the page, written nowhere.
  const store2 = mem(); const d2 = E.createDrawn({ storage: store2 });
  check(d2.set('measured', false) === true && d2.mode() === 'measured' && !store2.m.has(E.DRAWN_KEY), 'set(look, false) wears the look and writes nothing');
  check(d2.set('film', false) === true && d2.mode() === 'film' && !store2.m.has(E.DRAWN_KEY), 'and puts it back the same way');
  check(d2.set('measured') === true && store2.m.get(E.DRAWN_KEY) === 'measured', 'while an ordinary set() is still the visitor\'s choice, stored');
  // No context at all, or one without the hooks.
  check(typeof PP.applyPhotoPreset(null, PP.presetOf('science')) === 'function' && typeof PP.applyPhotoPreset({}, null) === 'function', 'no context, no preset: a function that does nothing');
}

// --- photo mode and the sheet ---------------------------------------------------------------------------------------
const pm = src('site/js/ui/photomode.js');
check(/const tagged = !!opts\.withTag && !!record/.test(pm) && (pm.match(/withTag: tagged/g) || []).length === 2, 'photo mode puts the tag on both pictures it makes (Save and Share) when asked, and only for a record');
check(/typeof opts\.onClose === 'function'/.test(pm) && /function close\(cleanAlreadyOff = false\)/.test(pm) && pm.indexOf('opts.onClose()') > pm.indexOf('function close(cleanAlreadyOff'), 'it calls back when it is left, by any way (the close button, Escape, H)');
check(/preset: presetId/.test(pm), 'and its state says which preset it was opened with');
const sheet = src('site/js/ui/sharesheet.js');
check(/import \{ PRESET_IDS, presetOf, applyPhotoPreset \} from '\.\/photopresets\.js'/.test(sheet), 'the sheet reads the table from its own module, which is not at boot');
check(/shape: preset\.shape, caption: true, withTag: preset\.tag, preset: id, onClose: restore/.test(sheet), 'a preset opens photo mode with its shape, the caption on (the honesty line stays), its tag, and the way back');
check(/if \(preset\.lens\) api\.setLens\(preset\.lens\)/.test(sheet) && /presetBtns\.get\('card'\)\.hidden = !w\.record/.test(sheet), 'with its lens, and the object card only for an object');
check(/if \(restore\) restore\(\)/.test(sheet), 'a photo mode that fails to open gives the shutter and the look back');
check(/setPresetsOpen\(false\)/.test(sheet) && /aria-expanded/.test(sheet.slice(sheet.indexOf('const presetsRow'))), 'the row is shut at every opening, and says so to a screen reader');
check(!/caption: false/.test(sheet), 'no preset turns the caption off');

// The table is not in the boot graph: the byte budget has no room for it (registry/budgets.yaml deployed_boot_js_bytes).
{
  const main = src('site/js/main.js');
  check(!/photopresets/.test(main) && !/PHOTO_PRESETS/.test(src('site/js/scene/exposure.js')), 'neither main.js nor scene/exposure.js has the presets: the sheet imports them when it opens');
}

if (problems.length) {
  console.error(`photo presets FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`photo presets ok: ${PP.PRESET_IDS.length} presets of settings that exist (shape, lens, shutter, look, tag), worn while photo mode is open and never stored, no effect of their own`);
