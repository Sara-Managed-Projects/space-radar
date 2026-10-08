// tests/test_calm_sky.mjs -- a calm deep sky (public #271): the marks of planets round other
// stars are off until asked for, and a star's colour reads.
//
//   node tests/test_calm_sky.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const { LAYERS } = await mod('data/layers.js');
const { COPY } = await mod('copy/en.js');
const W = await mod('ui/whattoshow.js');
const SF = await mod('scene/starfield.js');

// --- off by default, in every moment; everything else in the group as it was -----------------------
const exo = LAYERS.find((l) => l.id === 'exoplanets');
check(exo && exo.moments && !exo.moments.wonder && !exo.moments.now && !exo.moments.next, 'the exoplanet marks are off in all three moments');
check(exo && exo.enabled !== false, 'the layer itself is still there: it loads, it is searched, a link opens it');
for (const id of ['stars', 'deep-sky', 'systems', 'galaxy']) {
  const l = LAYERS.find((x) => x.id === id);
  check(l && l.moments && l.moments.wonder === true, `${id} is still on in the wide views`);
}

// --- every way to ask for them ---------------------------------------------------------------------
const hint = W.layerHint('exoplanets');
check(hint && [...hint].length <= 60 && /show/i.test(hint) && !/!/.test(hint), `the row says how to show them, in one chrome sentence (${[...hint].length}: "${hint}")`);
check(W.layerHint('stars') === '' && W.layerHint('nope') === '', 'a row that is on by default has no such line');
const wts = read('site/js/ui/whattoshow.js');
check(/if \(row\.hint\) row\.hint\.hidden = on;/.test(wts) && /aria-describedby/.test(wts), 'the line shows only while the box is off, and the box is described by it');
const explore = read('site/js/ui/explore.js');
check(/rowButton\(COPY\.explore\.exoRow, COPY\.explore\.exoShow/.test(explore) && /ctx\.setLayerOn\('exoplanets', on\)/.test(explore) && /sysList\.insertBefore\(exoRow\.li, sysList\.firstChild\)/.test(explore),
  'the Stars tab has a switch for them at the head of Star systems');
check(/aria-pressed/.test(explore.slice(explore.indexOf('function paintExo'))), 'and it says whether it is on');
check(COPY.explore.exoRow.split(' ').length <= 5 && COPY.explore.exoShow === 'show' && COPY.explore.exoHide === 'hide', 'its words are short');
const main = read('site/js/main.js');
check(/if \(record\.layer && !ctx\.isLayerOn\(record\.layer\)\) \{\s*ctx\.setLayerOn\(record\.layer, true\);/.test(main), 'a link to one switches its layer on (main.js openAt)');
const search = read('site/js/ui/search.js');
check(/if \(!ctx\.isLayerOn\(record\.layer\)\) \{\s*ctx\.setLayerOn\(record\.layer, true\);/.test(search), 'so does a search result');
const trip = read('site/js/ui/trip.js');
check(/for \(const id of tour\.requires \|\| \[\]\) needed\.add\(id\);/.test(trip) && /if \(stop\.target && stop\.target\.layer\) needed\.add\(stop\.target\.layer\);/.test(trip)
  && /for \(const id of resolved\.layers\) if \(setLayer\(id, true\)\) run\.flipped\.push\(id\);/.test(trip), 'a trip that wants them switches them on for its run and back after');
const tours = read('registry/tours.yaml');
check(/requires: \[stars, exoplanets, systems\]/.test(tours), 'and one trip does want them');
check(/const SYSTEM_SCALE_LAYERS = new Set\(\['stars', 'systems'\]\);/.test(main), 'a star system draws its own planets on its stage, whatever the layer says');

// --- a star's colour --------------------------------------------------------------------------------
const tint = (bv) => SF.starTint(bv);
const raw = (bv) => SF.kelvinToRgb(SF.bvToKelvin(bv));
const chroma = (c) => Math.max(...c) - Math.min(...c);
const betelgeuse = tint(1.85), rigel = tint(-0.03), sun = tint(0.65), vega = tint(0.0);
check(betelgeuse[0] === 1 && betelgeuse[2] < 0.4 && rigel[2] === 1 && rigel[0] < 0.72, `Betelgeuse is orange and Rigel is blue (${betelgeuse.map((v) => v.toFixed(2))} | ${rigel.map((v) => v.toFixed(2))})`);
for (const bv of [-0.2, 0, 0.3, 0.65, 1.0, 1.5, 1.85]) {
  const a = raw(bv), b = tint(bv);
  check(chroma(b) >= chroma(a) - 1e-9, `B-V ${bv}: the tint is at least as coloured as the black body`);
  check(a.indexOf(Math.max(...a)) === b.indexOf(Math.max(...b)) && a.indexOf(Math.min(...a)) === b.indexOf(Math.min(...b)), `B-V ${bv}: and the same hue (its strongest and weakest channel are unchanged)`);
  check(Math.abs(Math.max(...b) - 1) < 1e-9 && Math.min(...b) >= 0, `B-V ${bv}: normalised, nothing out of range`);
}
check(chroma(sun) < 0.2 && chroma(sun) < chroma(vega) + 0.2, `the Sun stays a cream, not a colour (${sun.map((v) => v.toFixed(2))})`);
check(SF.starTint(NaN).join() === sun.join(), 'a star with no colour index is drawn Sun-like, as before');
check(SF.STAR_CHROMA > 1 && SF.STAR_CHROMA <= 2.5, `the stretch is stated and modest (${SF.STAR_CHROMA})`);
const sfSrc = read('site/js/scene/starfield.js');
const s3Src = read('site/js/scene/stars3d.js');
check(/const rgb = starTint\(bv\);/.test(sfSrc) && /const rgb = starTint\(bv\);/.test(s3Src), 'both star draws in space use it');
check(/smoothstep\( 2\.3, 6\.0, aSize \)/.test(sfSrc), 'the naked-eye stars of the constellations get the glow, not only the first-magnitude ones');
const ground = read('site/js/sky/groundsky.js');
check(/_c\.setRGB\(rgb\[0\], rgb\[1\], rgb\[2\], THREE\.SRGBColorSpace\);/.test(ground) && /mix\(vColour, vec3\(1\.0\), 0\.1 \+ core \* 0\.35 \* vGlare\)/.test(ground), 'the ground sky keeps the black-body colour whole');

const glyphs = await mod('scene/glyphs.js');
check(glyphs.SKY_MARK_SCALE['deep-sky'] <= 0.6 && glyphs.SKY_MARK_SCALE.exotics <= 0.6 && Object.keys(glyphs.SKY_MARK_SCALE).length === 2, 'from the ground the deep-sky and exotic marks are drawn at half size, and nothing else is');
check(/uPad \* mix\( 1\.0, uSkyScale, uSky \)/.test(read('site/js/scene/glyphs.js')), 'only while the camera stands on the ground');
check(/float corePx = min\(size, 7\.0 \+ 5\.0 \* glare\) \* uPx;/.test(ground), 'and a bright star\'s core is up to 7 px there');

if (problems.length) { console.error(`calm sky: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`calm sky ok: exoplanet marks off in every moment, shown by the layer row ("${hint}"), the Stars tab's switch, a link, a search or a trip; Betelgeuse ${betelgeuse.map((v) => v.toFixed(2)).join(' ')}, Rigel ${rigel.map((v) => v.toFixed(2)).join(' ')}, the Sun ${sun.map((v) => v.toFixed(2)).join(' ')}`);
