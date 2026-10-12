// tests/test_small_issues.mjs -- the small internal issues closed together on 2026-10-08, each held
// by what a node process can decide. What needed pixels is in the PR that added this file.
//
//   node tests/test_small_issues.mjs
//
//   #384  an `after:` event reference and `borrowed:` instants: the living Earth names no year
//   #313  `framing: sunrise`: the constants the page and the validator share
//   #290  `true_size: true`: the frame's line, and the dot's width the line is set against
//   #307  the one line of truth: one function, three places
//   #478  a pad is titled by the pad
//   #167  a nebula's photograph on its own card
//   #280  a system's overlays on demand
//   #250  "Is this what space looks like?": each of the three sentences against the tree
//   #161  the anisotropic glint and the sheen: the sums, the shader's lines, the tier
//   #457  the phone's note stays off a full sheet
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const JS = join(SITE, 'js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

const { TOURS } = await import(join(JS, 'data/tours.js'));
const { TOURS_INDEX } = await import(join(JS, 'data/tours-index.js'));
const tour = (id) => TOURS.find((t) => t.id === id);

// --- #384 --------------------------------------------------------------------------------------------
{
  const { eventTypeOf, eventSubtitle } = await import(join(JS, 'ui/trippicker.js'));
  const { nextEvent } = await import(join(JS, 'data/events.js'));
  const earth = tour('the-living-earth');
  const [tilt, half] = earth.stops;
  check(JSON.stringify(tilt.time) === JSON.stringify({ event: 'solstice.next', kind: 'june', borrowed: true }), `the-living-earth/tilt is shown at ${JSON.stringify(tilt.time)}`);
  check(JSON.stringify(half.time) === JSON.stringify({ event: 'solstice.next', kind: 'december', after: 'tilt', borrowed: true }), `the-living-earth/half-a-year-on is shown at ${JSON.stringify(half.time)}`);
  check(!/\b20\d\d\b/.test(JSON.stringify([tilt.time, half.time])), 'neither names a year');
  // The picker: a borrowed instant does not make an event trip, in the full rows and in the index.
  check(eventTypeOf(earth) === null && eventSubtitle(earth, Date.parse('2026-10-08T12:00:00Z')) === null, 'the living Earth is not an event trip: no "Next:" under its title');
  check(!('event' in TOURS_INDEX.find((r) => r.id === 'the-living-earth')), 'nor in the index a first visit reads');
  check(eventTypeOf(tour('chasing-the-solar-eclipse')) === 'solar-eclipse' && TOURS_INDEX.find((r) => r.id === 'chasing-the-solar-eclipse').event === 'solar-eclipse', 'the eclipse trip still is');
  check(eventTypeOf({ stops: [{ time: { event: 'solstice.next', borrowed: true } }, { time: { event: 'lunar-eclipse.next' } }] }) === 'lunar-eclipse', 'a trip is timed by its first event that is not borrowed');
  // What `after:` buys, in every month of a year: the second stop is half a year after the first.
  // Counted from the visitor's clock instead, it would come BEFORE it from late June to late December.
  let wrongWithout = 0;
  for (let m = 0; m < 12; m += 1) {
    const now = Date.UTC(2026, m, 15);
    const june = nextEvent('solstice', now, null, [], { kind: 'june' });
    const decAfter = nextEvent('solstice', june.t, null, [], { kind: 'december' });
    const decFromNow = nextEvent('solstice', now, null, [], { kind: 'december' });
    const days = (decAfter.t - june.t) / 86400e3;
    check(days > 180 && days < 187, `started in month ${m + 1}: the December solstice is ${days.toFixed(1)} days after the June one`);
    if (decFromNow.t < june.t) wrongWithout += 1;
  }
  check(wrongWithout === 6, `counted from the clock the December stop would precede the June one in ${wrongWithout} months of twelve (six: July to December)`);
  const trip = src('site/js/ui/trip.js');
  check(/time\.after !== undefined/.test(trip) && /resolveStopTime\(earlier\.time, nowMs, list\.slice\(0, at\)\)/.test(trip), 'ui/trip.js counts an `after:` reference from the earlier stop\'s own instant');
  check(/resolveStopTime\(stop\.time, ctx\.clock\.now\(\), tour\.stops\)/.test(trip), 'and when the trip is planned, so the intro\'s count is the run\'s');
}

// --- #313 --------------------------------------------------------------------------------------------
{
  const trip = src('site/js/ui/trip.js');
  const py = src('scripts/check_registry.py');
  const js = Number(/export const SUNRISE_HIDDEN_DEG = (\d+);/.exec(trip)[1]);
  check(js === Number(/^SUNRISE_HIDDEN_DEG = (\d+)$/m.exec(py)[1]) && js === 2, 'the Sun starts two degrees behind the limb, in the page and in the validator');
  check(/SUNRISE_MIN_DRIFT_DEG = 2 \* SUNRISE_HIDDEN_DEG/.test(py), 'and the least drift carries it as far out again');
  check(/entry\.stop\.framing === 'sunrise' && subject\.kind === 'world'/.test(trip) && /reducedMotion\(\) \? rho \+ SUNRISE_HIDDEN_DEG \* DEG/.test(trip), 'a sunrise stop under reduced motion stands where the Sun is already out');
  // The geometry sunriseAngles() solves, checked on its own: at co-latitude p, an azimuth offset D
  // from the anti-Sun direction is a great-circle separation with cos = cos^2 p + sin^2 p cos D.
  for (const [pDeg, sepDeg] of [[90, 17.47], [66, 12.48], [114, 30]]) {
    const p = pDeg * Math.PI / 180; const sep = sepDeg * Math.PI / 180;
    const D = Math.acos((Math.cos(sep) - Math.cos(p) ** 2) / Math.sin(p) ** 2);
    const a = [Math.sin(p), Math.cos(p), 0]; const b = [Math.sin(p) * Math.cos(D), Math.cos(p), Math.sin(p) * Math.sin(D)];
    const got = Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180 / Math.PI;
    check(Math.abs(got - sepDeg) < 1e-6, `co-latitude ${pDeg}: the offset puts the camera ${got.toFixed(4)} degrees from the anti-Sun line, not ${sepDeg}`);
  }
  // No stop wears it yet: the framing is in the grammar, auditioned (tests/probes/small-desktop-b.js).
  const worn = TOURS.flatMap((t) => t.stops.filter((s) => s.framing).map((s) => `${t.id}/${s.id}`));
  for (const id of worn) { const [t, s] = id.split('/'); const stop = tour(t).stops.find((x) => x.id === s); check(stop.framing === 'sunrise' && stop.target.world && stop.key_light_deg === undefined, `${id} wears a framing the page does not have`); }
}

// --- #290 --------------------------------------------------------------------------------------------
{
  const { orbitsLine } = await import(join(JS, 'ui/tripframe.js'));
  const frame = src('site/js/ui/tripframe.js');
  check(/if \(stageId === 'sun' && st\.trueSize\) return st\.trueSizeLine \|\| '';/.test(frame), 'the frame prints the true-size line, and never "drawn larger" while the dots are away');
  {
    const { COPY } = await import(join(JS, 'copy/en.js'));
    check(orbitsLine({ orbits: ['earth'], trueSize: false }, 'sun') === COPY.trip.orbitsLine, 'dots drawn: "drawn larger than they are"');
    check(orbitsLine({ orbits: ['earth'], trueSize: true, trueSizeLine: 'True size: Venus is 0.1 px wide here' }, 'sun') === 'True size: Venus is 0.1 px wide here' && orbitsLine({ orbits: ['earth'], trueSize: true, trueSizeLine: '' }, 'sun') === '', 'dots away: the computed line, or nothing until it is computed');
  }
  const { MARKER_PX } = await import(join(JS, 'scene/orbitrings.js'));
  const trip = src('site/js/ui/trip.js');
  check(Number(/const TRUE_SIZE_MARKER_PX = (\d+);/.exec(trip)[1]) === MARKER_PX, 'ui/trip.js sets the line against the dot\'s real width (scene/orbitrings.js MARKER_PX)');
  check(/here\.true_size === true && \(state\.phase === 'dwell' \|\| state\.phase === 'paused'\)/.test(trip), 'True size ends with the stop that asked for it');
  const { idleTripState } = await import(join(JS, 'ui/tripstate.js'));
  check(idleTripState().trueSize === false && idleTripState().trueSizeLine === '', 'an idle trip has no true size');
  const stops = TOURS.flatMap((t) => t.stops.filter((s) => s.true_size).map((s) => [t, s]));
  check(stops.length === 1 && stops[0][0].id === 'the-sun-today' && stops[0][1].id === 'scale', `True size is a reveal on one stop (${stops.map(([t, s]) => `${t.id}/${s.id}`).join(', ')})`);
  for (const [t, s] of stops) check(t.stage === 'sun' && !s.stage && Array.isArray(t.orbits) && t.orbits.length > 0 && !/\bdots?\b/i.test(s.card.body), `${t.id}/${s.id}: on the Sun's stage of a trip with orbits, under a card that does not talk about dots`);
  const { scaleState, badgeWords } = await import(join(JS, 'ui/scalebadge.js'));
  const st = scaleState({ worlds: [{ id: 'venus', name: 'Venus', radiusKm: 6051.8, distKm: 1.08e8 }, { id: 'earth', name: 'Earth', radiusKm: 6371, distKm: 1.5e8 }], markerPx: MARKER_PX, fovDeg: 45, viewportH: 900 });
  check(/^True size: Venus is 0\.1 px wide here$/.test(badgeWords(st, true).text), `the line is the scale badge's own sentence (${badgeWords(st, true).text})`);
}

// --- #307 --------------------------------------------------------------------------------------------
{
  const { truthLine, LAYER_SOURCES } = await import(join(JS, 'ui/truthline.js'));
  const render = await import(join(JS, 'ui/rendermode.js'));
  check(render.truthLine === truthLine, 'the film camera\'s line is the same function');
  check(/truthLine\(tour, st\.clockMoves \? NaN : ctx\.clock\.now\(\)\)/.test(src('site/js/ui/tripframe.js')), 'the live intro prints it: the instant, or the sources alone when the trip\'s stops set their own');
  const people = tour('people-in-space');
  check(truthLine(people, Date.UTC(2026, 9, 8, 18, 6)) === 'Positions computed for 8 October 2026, 18:06 UTC from CelesTrak orbital elements and the planets’ own orbits (astronomy-engine).', truthLine(people, Date.UTC(2026, 9, 8, 18, 6)));
  // The share pages: scripts/gen_trip_pages.py keeps the table in Python. Every page's sentence is
  // this function's, with no instant.
  const py = src('scripts/gen_trip_pages.py');
  for (const [layer, words] of Object.entries(LAYER_SOURCES)) check(py.includes(`"${layer}": "${words}"`), `gen_trip_pages.py LAYER_SOURCES lacks ${layer}: ${words}`);
  let pages = 0;
  for (const t of TOURS) {
    const html = readFileSync(join(SITE, 't', `${t.id}.html`), 'utf8');
    const want = truthLine(t, NaN).replace(/&/g, '&amp;');
    check(html.includes(`<p>${want}</p>`), `site/t/${t.id}.html does not say: ${want}`);
    pages += 1;
  }
  check(pages === TOURS.length && pages >= 26, `${pages} share pages`);
}

// --- #478 --------------------------------------------------------------------------------------------
{
  const { drawingLine } = await import(join(JS, 'ui/cards.js'));
  const { displayName } = await import(join(JS, 'ui/cardfacts.js'));
  const { handKeptSites } = await import(join(JS, 'data/sample.js'));
  const { labelName } = await import(join(JS, 'ui/labels.js'));
  const pads = handKeptSites().filter((r) => r.meta.siteKind === 'pad');
  const want = { 'saturn-v-lc-39a': ['Launch Complex 39A', 'Saturn V'], 'shuttle-lc-39b': ['Launch Complex 39B', 'Space Shuttle'] };
  for (const pad of pads) {
    const [title, rocket] = want[pad.id] || [];
    check(displayName(pad) === title, `${pad.id}: the card is titled "${displayName(pad)}", not "${title}"`);
    check(labelName(pad) === title, `${pad.id}: the label reads "${labelName(pad)}"`);
    check(new RegExp(rocket.replace(' ', '.')).test(String(pad.meta.doing || pad.doing || JSON.stringify(pad.meta))), `${pad.id}: its sentence names the ${rocket}`);
    {
      const today = drawingLine(pad, Date.parse('2026-10-08T12:00:00Z'));
      const morning = drawingLine(pad, Date.parse(pad.id === 'saturn-v-lc-39a' ? '1969-07-16T12:00:00Z' : '1988-09-29T12:00:00Z'));
      check(/the pad is a measured place/.test(today) && today.includes(rocket) && !/drawn from a published model/.test(today), `${pad.id} today: "${today}"`);
      check(/drawn from a published model of/.test(morning) && morning.includes(rocket), `${pad.id} on a launch morning: "${morning}"`);
    }
  }
  check(pads.length === 2, `two pads (${pads.length})`);
}

// --- #167 --------------------------------------------------------------------------------------------
{
  const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
  const cards = src('site/js/ui/cards.js');
  check(/box\.appendChild\(pictureFigure\(row, name\)\);\s*box\.appendChild\(pictureNote\(row\)\);/.test(cards), 'the card puts the photograph before the note on its colours and its credit');
  check(/import\('\.\.\/data\/nebulae\.js'\)/.test(cards) && !/^import[^;]*data\/nebulae\.js/m.test(cards), 'from rows it imports dynamically: nothing of it at boot');
  // The figure, built with a document that records what it is given.
  const made = [];
  const node = (tag) => { const n = { tag, children: [], appendChild(c) { this.children.push(c); return c; } }; made.push(n); return n; };
  globalThis.document = { createElement: node };
  const { pictureFigure } = await import(join(JS, 'ui/exposure.js'));
  const m42 = NEBULAE.find((r) => r.id === 'm42');
  const fig = pictureFigure(m42, 'Great Orion Nebula');
  const img = fig.children[0]; const cap = fig.children[1];
  check(fig.tag === 'figure' && img.tag === 'img' && img.src === 'images/nebulae/m42.webp' && img.loading === 'lazy' && img.alt === 'Photograph of Great Orion Nebula', `the figure's picture: ${JSON.stringify({ src: img.src, loading: img.loading, alt: img.alt })}`);
  check(img.width === 640 && img.height === Math.round(640 * m42.height_arcmin / m42.width_arcmin), `its size is written on it, from the sky it covers (${img.width} x ${img.height})`);
  check(cap.tag === 'figcaption' && cap.textContent === 'Great Orion Nebula: 60 by 47 arcminutes of sky.', `its caption is the row's measured field: "${cap.textContent}"`);
  const tall = pictureFigure({ file: 'site/images/nebulae/x.webp', width_arcmin: 3.2, height_arcmin: 6.41 }, 'X');
  check(tall.children[0].height === 640 && tall.children[0].width === 320 && /3\.2 by 6\.4 arcminutes/.test(tall.children[1].textContent), 'a picture taller than wide, and a small one to a tenth of an arcminute');
  delete globalThis.document;
  for (const r of NEBULAE) check(existsSync(join(ROOT, r.file)) && r.credit && r.licence && r.page && r.width_arcmin > 0 && r.height_arcmin > 0, `nebulae[${r.id}] lacks its file, credit, licence, page or field`);
}

// --- #280 --------------------------------------------------------------------------------------------
{
  const extras = src('site/js/scene/systemextras.js');
  check(/export function update\(built, camera, starScene, show = SHOW_ALL\)/.test(extras) && /extra\.band\.visible = zoneOn;/.test(extras) && /for \(const ring of extra\.rings\) ring\.visible = orbitsOn;/.test(extras), 'scene/systemextras.js draws the band and the rings only when asked');
  check(/label\.visible = \(label === extra\.zoneLabel \? zoneOn : orbitsOn\)/.test(extras), 'and their labels with them');
  const systems = src('site/js/scene/systems.js');
  check(/const overlay = \{ zone: false, orbits: false \};/.test(systems) && /extras\.update\(current, cam, _p, overlay\)/.test(systems), 'scene/systems.js starts with neither and passes what is asked for');
  check(/setOverlay,\s*overlay: overlayState,/.test(systems), 'and offers the two to the card');
  const cards = src('site/js/ui/cards.js');
  check(/ctx\.systems\.overlay\(sysOf\.system\)\.available/.test(cards) && /b\.dataset\.overlay = part;/.test(cards) && /b\.setAttribute\('aria-pressed', on \? 'true' : 'false'\)/.test(cards), 'the card of a member offers a pressed-or-not button for each the system can show');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const O = COPY.starSystem.overlay;
  check(O && ['none', 'zone', 'orbits', 'both'].every((k) => typeof O.note[k] === 'string') && /computed/.test(O.note.zone) && /for scale/.test(O.note.orbits), 'each state has its line: the band is computed, the rings are for scale');
}

// --- #250 --------------------------------------------------------------------------------------------
{
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const R = COPY.realLook;
  check(R && R.title === 'Is this what space looks like?' && R.kinds.length === 3, 'the card has its question and three kinds of picture');
  const words = [R.lead, ...R.kinds.flat(), R.foot].join(' ').split(/\s+/).length;
  check(words <= 170, `it is short (${words} words)`);
  check(/R\.kinds/.test(src('site/js/ui/status.js')) && /sr-status__look/.test(src('site/js/ui/status.js')), 'the Sources sheet draws it');
  // Each sentence against the tree.
  const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
  check(NEBULAE.length >= 25 && NEBULAE.every((r) => /\.webp$/.test(r.file) && r.licence), '"telescope photographs": every nebula row is a licensed picture file');
  check(NEBULAE.some((r) => r.colours === 'narrowband') && NEBULAE.some((r) => r.colours === 'broadband'), '"some pictures map single gases to colours": some rows are narrowband and some are not');
  const models = src('registry/models.yaml');
  const real = [...models.matchAll(/^  - \{id: [\w-]+, file: site\/models\/[^\n]*$/gm)].map((m) => m[0]);
  const nasa = real.filter((r) => /nasa/i.test(r)).length;
  check(real.length >= 60 && nasa / real.length > 0.5, `"most from NASA's published files": ${nasa} of ${real.length} model files name NASA as their source`);
  check(/Artist.s impression/.test(src('site/js/scene/systems.js')) && existsSync(join(JS, 'scene/exoface.js')), '"imagined ... and their cards say so": a faced exoplanet\'s line begins "Artist\'s impression"');
  check(/artist/i.test(JSON.stringify(COPY.worldFace || {})), '"some of them smoothed by an artist": the world-face notes say which maps are an artist\'s');
}

// --- #161 --------------------------------------------------------------------------------------------
{
  const M = await import(join(JS, 'scene/models.js'));
  const T = M.SURFACE_TERMS;
  check(M.surfaceTermsOn() === false, 'the two terms are off until a device is found able');
  // Ward: 1 at the mirror direction, narrow along the grain and wide across it.
  check(M.wardLobe(1, 0, 0) === 1, 'the glint is whole where the half vector is the normal');
  const tilt = (deg) => { const s = Math.sin(deg * Math.PI / 180); return [Math.cos(deg * Math.PI / 180), s]; };
  const [nh, off] = tilt(8);
  const along = M.wardLobe(nh, off, 0); const across = M.wardLobe(nh, 0, off);
  check(along < 0.02 && across > 0.85 && across / Math.max(along, 1e-9) > 40, `eight degrees off: ${along.toFixed(4)} along the grain, ${across.toFixed(3)} across it: a streak, not a spot`);
  check(M.wardLobe(0, 0, 1) === 0, 'nothing at grazing');
  // Charlie: nothing at the normal, most at grazing; and it integrates to one over the hemisphere.
  check(M.charlieSheen(1) === 0 && M.charlieSheen(0) > M.charlieSheen(0.5) && M.charlieSheen(0.5) > M.charlieSheen(0.9), 'the sheen rises towards grazing');
  let integral = 0; const N = 20000;
  for (let i = 0; i < N; i += 1) { const c = (i + 0.5) / N; integral += M.charlieSheen(c) * c * (2 * Math.PI) / N; }
  check(Math.abs(integral - 1) < 0.01, `the sheen distribution is normalised (its projected integral is ${integral.toFixed(4)})`);
  // The shader's lines: one term per kind, each behind the tier's uniform, none for a painted body.
  const panel = M.surfaceTermsGLSL('panel').join('\n'); const foil = M.surfaceTermsGLSL('foil').join('\n');
  check(M.surfaceTermsGLSL('body').length === 0 && M.surfaceTermsGLSL('world').length === 0, 'painted structure and worlds get neither');
  check(/if \( uSurface > 0\.0 \)/.test(panel) && panel.includes(T.panel.along.toFixed(4)) && panel.includes(T.panel.across.toFixed(4)) && /exp\( -\( th \* th \+ bh \* bh \) \/ \( nh \* nh \) \)/.test(panel), 'panels: Ward\'s lobe with the two roughnesses, behind the tier');
  check(/if \( uSurface > 0\.0 \)/.test(foil) && /diffuseColor\.rgb/.test(foil) && foil.includes((1 / T.foil.roughness).toFixed(4)), 'foil: the sheen in the foil\'s own colour, behind the tier');
  const fake = { uniforms: {}, fragmentShader: 'void main() {\n#include <opaque_fragment>\n}' };
  M.toonMaterial('#C9A227', 'foil', new Map()).onBeforeCompile(fake);
  const at = (s) => fake.fragmentShader.indexOf(s);
  check(fake.uniforms.uSurface && at('uniform float uSurface;') > 0 && at('float Ds =') > at('uSpecPower ) * lit;') && at('float Ds =') < at('if ( uShadeRadius > 0.0 )'), 'in the material: after the round specular and before the world\'s shadow, which takes away what comes from the Sun');
  check(M.setSurfaceTerms(true) === true && fake.uniforms.uSurface.value === 1 && M.setSurfaceTerms(false) === false && fake.uniforms.uSurface.value === 0, 'one shared switch');
  check(/M\.setSurfaceTerms\(!!q && q\.tier >= 1 && !\(ctx\.latch && ctx\.latch\.latched\)\);/.test(src('site/js/scene/heroes.js')), 'scene/heroes.js switches them on for tier 1 and up, not latched');
}

// --- #457 --------------------------------------------------------------------------------------------
{
  const css = src('site/css/ui.css');
  check(/html\.sr-phone\[data-sheet='full'\] \.sr-scenenote \{\s*visibility: hidden;\s*pointer-events: none;\s*\}/.test(css), 'on a phone the scene\'s note is put away while the sheet is at full');
  const known = JSON.parse(src('tests/probes/ui_probe.known.json')).known;
  check(!known.some((k) => /457/.test(k.issue)), 'and the UI gate excuses nothing for internal #457 any more');
}

if (problems.length) { console.error('small issues FAILED (' + problems.length + '):\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('small issues ok: the living Earth names no year and is no event trip; the sunrise framing\'s constants agree; True size is one stop\'s reveal with a computed line; one truth line in the film, the intro and 26 share pages; a pad is titled by the pad; a nebula\'s photograph with its measured field; a system\'s overlays on demand; the honest answer holds against the tree; the glint is a streak and the sheen is normalised, both tiered; the phone\'s note stays off a full sheet');
