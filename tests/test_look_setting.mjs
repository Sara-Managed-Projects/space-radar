// tests/test_look_setting.mjs -- Measured or Film (spec 0073 requirement 8).
//
//   node tests/test_look_setting.mjs
//
// THE CONTRACT, so a new effect cannot forget: every row of registry/weather.yaml says what it does
// under the Measured look (`measured: same | still | hidden`), and every scene module with noise in a
// shader (which is how detail is generated here) exports UNDER_MEASURED saying the same of each thing
// it draws. Then the mechanism: one state (scene/exposure.js createDrawn), one question
// (`ctx.look()`), each effect answering from its own rule; under Measured every hidden row is drawn
// as none and every other row moves exactly as in Film (the app's clock, at its true rate); the card
// says which look is on; the postcard says Measured; a shared link carries `drawn=measured` as it
// carries `exp`.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const X = await import(join(JS, 'scene/exposure.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- 1. the state ------------------------------------------------------------------------------------
check(JSON.stringify(X.DRAWN) === '["measured","film"]' && X.DEFAULT_DRAWN === 'film', 'two looks, Film the default');
check(X.drawnUnder('film', 'hidden') && X.drawnUnder('film', 'same') && X.drawnUnder('measured', 'same') && X.drawnUnder('measured', 'still') && !X.drawnUnder('measured', 'hidden'), 'only `hidden` under Measured is not drawn');
check(X.drawnUnder('measured', undefined) && X.drawnUnder(undefined, 'hidden'), 'an effect with no rule, or no look, is drawn: Film is the map as it was');
check(X.stillUnder('measured', 'still') && !X.stillUnder('film', 'still') && !X.stillUnder('measured', 'same') && !X.stillUnder('measured', 'hidden'), 'only `still` under Measured is held');
{
  const store = (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; })();
  const d = X.createDrawn({ storage: store });
  const seen = [];
  d.onChange((m) => seen.push(m));
  check(d.mode() === 'film', 'nothing stored is Film');
  check(d.set('measured') === true && d.mode() === 'measured' && store.m.get(X.DRAWN_KEY) === 'measured' && seen.join() === 'measured', 'Measured is stored and told');
  check(d.set('measured') === false && d.set('cinema') === false && seen.length === 1, 'the same look or an unknown one changes nothing');
  check(X.createDrawn({ storage: store }).mode() === 'measured', 'and it is remembered');
  d.set('film');
  check(store.m.size === 0, 'Film removes the key');
  const linked = X.createDrawn({ storage: store, initial: 'measured' });
  check(linked.mode() === 'measured' && store.m.size === 0, 'a link\'s look is worn and not stored, as `exp` is');
  check(X.createDrawn({ storage: store, initial: '1' }).mode() === 'film', 'an unknown value in a link is ignored');
  const broken = { getItem() { throw new Error('private'); }, setItem() { throw new Error('private'); }, removeItem() { throw new Error('private'); } };
  const b = X.createDrawn({ storage: broken });
  check(b.mode() === 'film' && b.set('measured') === true && b.mode() === 'measured', 'a storage that throws: Film, and the choice still holds for the page');
}

// --- 2. the contract: every effect says what it does under Measured ------------------------------------
check(WEATHER.length >= 17, `the weather mirror was read (${WEATHER.length} rows)`);
for (const r of WEATHER) {
  check(X.MEASURED_RULES.includes(r.measured), `weather.yaml[${r.id}] has no \`measured:\` rule (same, still or hidden): a new effect must say what the Measured look does to it`);
  if (r.class === 'measured') check(r.measured === 'same', `${r.id} is measured, so Measured leaves it (got ${r.measured})`);
  if (r.class === 'illustrative') check(r.measured !== 'same', `${r.id} is illustrative, so Measured hides it or holds it still`);
}
{
  const yaml = read('registry/weather.yaml');
  const ids = [...yaml.matchAll(/^ {2}- id: ([\w-]+)$/gm)].map((m) => m[1]);
  const rules = [...yaml.matchAll(/^ {4}measured: (\w+)$/gm)].map((m) => m[1]);
  check(ids.length === WEATHER.length && rules.length === ids.length, `every row of registry/weather.yaml has its rule (${rules.length} of ${ids.length})`);
  check(/"measured"/.test(read('scripts/gen_weather_js.py')) && /`measured:` must be same, still or hidden/.test(read('scripts/check_registry.py')), 'the mirror carries the rule and check_registry.py refuses a row without it');
}
// A module that generates detail does it with noise in a shader. Each one says what Measured does.
{
  const NOISE = /fract\(\s*sin\(|(?:float|vec[234]) \w*(?:hash|noise|fbm)\w*\(/;
  const files = [];
  const walk = (dir) => { for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) { if (e.isDirectory()) walk(`${dir}/${e.name}`); else if (e.name.endsWith('.js')) files.push(`${dir}/${e.name}`); } };
  walk('site/js/scene');
  const noisy = files.filter((f) => NOISE.test(read(f)));
  check(noisy.length >= 5, `the modules with noise in a shader were found (${noisy.join(', ')})`);
  for (const f of noisy) {
    const src = read(f);
    // The weather's rules are its registry rows', asked in one place.
    if (f.endsWith('weather/worldweather.js')) { check(/drawnUnder\(look, row\.measured\)/.test(src), `${f} asks each row's own rule`); continue; }
    const m = /export const UNDER_MEASURED = \{([^}]*)\};/.exec(src);
    check(!!m, `${f} has noise in a shader and no \`export const UNDER_MEASURED\`: say what each generated thing does under the Measured look (scene/exposure.js MEASURED_RULES)`);
    if (!m) continue;
    const rules = [...m[1].matchAll(/(\w+): '(\w+)'/g)].map((x) => x[2]);
    check(rules.length > 0 && rules.every((r) => X.MEASURED_RULES.includes(r)), `${f}: UNDER_MEASURED must use ${X.MEASURED_RULES.join(', ')} (got ${rules.join(', ')})`);
    // A rule that changes something must be asked, or it is a comment.
    if (rules.includes('hidden')) check(/drawnUnder\(look, UNDER_MEASURED\.\w+\)/.test(src), `${f} declares something hidden under Measured and never asks drawnUnder()`);
    if (rules.includes('still')) check(/stillUnder\(look, UNDER_MEASURED\.\w+\)/.test(src), `${f} declares something still under Measured and never asks stillUnder()`);
  }
}

// --- 3. the weather under Measured: each hidden row is none, every other row is as in Film -------------
{
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  const F = await import(join(JS, 'scene/weather/flow.js'));
  const { WORLDS, worldMaterial, applyLook } = await import(join(JS, 'scene/worlds.js'));
  const dress = () => {
    const m = new Map();
    for (const w of WORLDS) { if (w.look.earth || w.look.emissive) continue; const material = worldMaterial(null, w.look.tint); applyLook(material, w.look); m.set(w.id, { material, visible: true }); }
    return m;
  };
  const make = () => { const meshes = dress(); return { meshes, wx: WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null, discShare: () => 1 }, rand: () => 0.5 }) }; };
  const t0 = Date.UTC(2026, 9, 12, 12);
  const film = make();
  const meas = make();
  check(meas.wx.look() === 'film' && meas.wx.setLook('measured') === true && meas.wx.setLook('measured') === false && meas.wx.look() === 'measured', 'the weather is told the look once');
  for (const k of [film, meas]) { k.wx.update(t0, 1000); k.wx.update(t0 + 1, 5000); }
  const u = (k, id) => k.meshes.get(id).material.uniforms;
  const rule = (id) => WEATHER.find((r) => r.id === id).measured;
  // Film first: everything that will be hidden is there.
  check(u(film, 'saturn').uWxHex.value.x > 0 && u(film, 'venus').uWxWave.value.x > 0 && u(film, 'jupiter').uWxNear.value.x === 1 && u(film, 'jupiter').uWxNear.value.w === 1, 'in Film the hexagon, the Y, the eddies and the depth are drawn');
  check(u(film, 'mars').uWxCap.value.x < 1.5 && u(film, 'mars').uWxCap.value.y > -1.5 && [...u(film, 'titan').uWxPatch.value].some((x) => x !== 0) && film.wx.flashing('jupiter') && film.wx.flashing('saturn'), 'and Mars\'s frost edges, Titan\'s clouds, the giants\' flashes');
  // Measured: by the registry's own rules.
  const near = u(meas, 'jupiter').uWxNear.value;
  check(rule('jupiter-eddies') === 'hidden' && near.x === 0, 'Measured: no generated eddies');
  check(rule('jupiter-depth') === 'hidden' && near.w === 0, 'Measured: no illustrative under-deck');
  check(rule('jupiter-ovals') === 'same' && near.y === 1 && rule('jupiter-polar-cyclones') === 'same' && near.z === 1, 'Measured: the modelled ovals and polar cyclones stay');
  check(rule('saturn-hexagon') === 'hidden' && u(meas, 'saturn').uWxHex.value.x === 0, 'Measured: no hexagon line');
  check(rule('venus-y') === 'hidden' && u(meas, 'venus').uWxWave.value.x === 0, 'Measured: no dark Y');
  const cap = u(meas, 'mars').uWxCap.value;
  check(rule('mars-season') === 'hidden' && cap.x > Math.PI / 2 + 0.2 && cap.y < -Math.PI / 2 - 0.2 && cap.z === 0, 'Measured: no seasonal frost and no dust on Mars (both edges past the poles)');
  check(rule('titan-clouds') === 'hidden' && [...u(meas, 'titan').uWxPatch.value].every((x) => x === 0), 'Measured: no cloud patches on Titan');
  check(rule('jupiter-lightning') === 'hidden' && rule('saturn-lightning') === 'hidden' && !meas.wx.flashing('jupiter') && !meas.wx.flashing('saturn') && [...u(meas, 'jupiter').uWxFlash.value].every((x) => x === 0), 'Measured: no illustrative flashes');
  // Every row that stays moves exactly as in Film: the app's clock, speed-up 1.
  for (const id of ['jupiter', 'saturn', 'venus', 'uranus', 'neptune']) {
    const a = u(film, id).uWxPhase.value; const b = u(meas, id).uWxPhase.value;
    check(a.x === b.x && a.y === b.y && a.z === b.z && a.w === b.w, `${id}: the bands are where Film has them`);
    check([...u(film, id).uWxRate.value].join() === [...u(meas, id).uWxRate.value].join(), `${id}: at the same rates`);
    const row = WEATHER.find((r) => r.world === id && r.kind === 'zonal-flow');
    const split = F.splitFlow(F.rateTable(row.profile), !!row.spot);
    check(Math.abs(b.w - F.rigidTurn(t0 + 1, split.rigid)) < 1e-9, `${id}: which is the published wind on the app's clock, at its true rate`);
  }
  check(u(film, 'jupiter').uWxPole.value.y === u(meas, 'jupiter').uWxPole.value.y && [...u(film, 'jupiter').uWxOvalRate.value].join() === [...u(meas, 'jupiter').uWxOvalRate.value].join(), 'and the cyclones and the ovals turn at the same rates');
  // And Film again puts everything back.
  check(meas.wx.setLook('film') === true, 'back to Film');
  meas.wx.update(t0 + 2, 9000);
  film.wx.update(t0 + 2, 9000);
  const nb = u(meas, 'jupiter').uWxNear.value;
  check(nb.x === 1 && nb.w === 1 && u(meas, 'saturn').uWxHex.value.x === u(film, 'saturn').uWxHex.value.x && u(meas, 'venus').uWxWave.value.x === u(film, 'venus').uWxWave.value.x, 'Film: the eddies, the depth, the hexagon and the Y are back as they were');
  const fc = u(film, 'mars').uWxCap.value; const mc = u(meas, 'mars').uWxCap.value;
  check(mc.x === fc.x && mc.y === fc.y && mc.z === fc.z && [...u(meas, 'titan').uWxPatch.value].join() === [...u(film, 'titan').uWxPatch.value].join() && meas.wx.flashing('jupiter'), 'and Mars\'s season, Titan\'s clouds and the flashes');
  // Low, left again: the weather is worn again (the real latch never calls unlatch).
  meas.wx.latch();
  check(meas.wx.worn().length === 0 && meas.meshes.get('jupiter').material.fragmentShader !== film.meshes.get('jupiter').material.fragmentShader, 'stripped: every world back in its own shader');
  meas.wx.unlatch();
  check(meas.wx.worn().includes('jupiter') && meas.meshes.get('jupiter').material.fragmentShader === film.meshes.get('jupiter').material.fragmentShader && meas.meshes.get('jupiter').material.defines.WX_STORMS === 1 && meas.meshes.get('jupiter').material.defines.WX_FLASH === 1, 'and worn again, with its defines, when Low is left');

  // The card's line.
  const { createWeather } = await import(join(JS, 'scene/weather/index.js'));
  const fresh = dress();
  let told = 0;
  const weather = createWeather({ worlds: { meshFor: (id) => fresh.get(id) || null, discShare: () => 1 }, fetchImpl: async () => ({ ok: false }), onChange: () => { told += 1; } });
  weather.tick(t0, { on: true });
  const S = COPY.lookSaid;
  check(weather.line('jupiter', t0).endsWith(S.film) && weather.line('mars', t0).endsWith(S.film) && weather.line('saturn', t0).endsWith(S.film), 'in Film a world the look changes says Film, last');
  // Since the close-range cloud detail (generated, so hidden under Measured), the look changes all four giants.
  check(weather.line('uranus', t0).endsWith(S.film) && weather.line('neptune', t0).endsWith(S.film) && weather.line('uranus', t0).includes(COPY.weatherDetail), 'Uranus and Neptune wear the generated detail, so in Film they say so and say Film');
  const before = told;
  weather.setLook('measured');
  check(told === before + 1, 'the card is told when the look changes');
  weather.tick(t0 + 1, { on: true });
  check(weather.line('jupiter', t0) === [COPY.weather.worlds.jupiter, S.turning.jupiter, S.poles.jupiter, S.measured].join(' '), `Jupiter under Measured: the bands, the ovals, the cyclones, and no eddy, deck or flash is claimed (${weather.line('jupiter', t0)})`);
  check(weather.line('saturn', t0) === [S.worlds.saturn, S.measured].join(' ') && !/hexagon/.test(weather.line('saturn', t0)), 'Saturn under Measured does not claim the hexagon');
  check(weather.line('venus', t0) === [COPY.weather.worlds.venus, S.also.venus, S.measured].join(' ') && !/dark Y/.test(weather.line('venus', t0)), 'Venus under Measured does not claim the Y');
  check(weather.line('mars', t0) === S.measured && weather.line('titan', t0) === S.measured, 'Mars and Titan, whose whole weather is illustrative, say only that the look is Measured');
  check(weather.line('uranus', t0) === [COPY.weather.worlds.uranus, COPY.weather.also.uranus, S.measured].join(' ') && !weather.line('uranus', t0).includes(COPY.weatherDetail), 'Uranus under Measured: its drift, no generated detail claimed, and that the look is Measured');
  check(weather.line('moon', t0) === null, 'a world with no weather still has no line');
}

// --- 4. the Sun and the aurora ---------------------------------------------------------------------------
{
  const sun = read('site/js/scene/sun.js');
  check(/const g = tier >= 1 && drawnUnder\(look, UNDER_MEASURED\.grain\) \?/.test(sun), 'the Sun\'s generated grain (and the faculae drawn along it, by uGrain) is off under Measured');
  check(/const still = !!\(how && how\.still\) \|\| stillUnder\(look, UNDER_MEASURED\.corona\);/.test(sun), 'the corona and the prominences are held still as under reduced motion');
  check(/UNDER_MEASURED = \{ grain: 'hidden', faculae: 'hidden', corona: 'still', prominences: 'still' \}/.test(sun), 'and the module says so');
  const aurora = read('site/js/scene/aurora.js');
  check(/const folds = cfg\.folds && drawnUnder\(look, UNDER_MEASURED\.folds\);/.test(aurora) && /u\.uFolds\.value = folds \? 1 : 0;/.test(aurora), 'the aurora\'s folds are off under Measured: NOAA\'s grid is what is drawn');
  check(typeof COPY.aurora.liveNoFolds === 'string' && !/folds/.test(COPY.aurora.liveNoFolds), 'and its card line then does not claim them');
  const main = read('site/js/main.js');
  check(/ctx\.look = \(\) => drawn\.mode\(\);/.test(main), 'main.js puts one question on the context');
  check(/\{ still: [^}]*, look: ctx\.look\(\) \}\);/.test(main) && /look: ctx\.look\(\),\n\s+top:/.test(main), 'and hands its answer to the Sun and the aurora every frame');
  check(/weather\.setLook\(ctx\.look\(\)\);/.test(main) && /if \(ctx\.weather && ctx\.weather\.setLook\) ctx\.weather\.setLook\(mode\);/.test(main), 'and to the weather when it is made and when the look changes');
  // The deep sky's coordinator (spec 0075, scene/deep/deepsky.js) is the fourth that asks.
  check((main.match(/ctx\.look\(\)/g) || []).length <= 5, 'four effects ask; nothing threads a flag through the scene by hand');
  check(/look: \(\) => ctx\.look\(\)/.test(main), 'the deep sky asks the same question, each frame');
  const cards = read('site/js/ui/cards.js');
  check(/sunLookLine\(ctx\)/.test(cards) && COPY.lookSaid.sun.measured && COPY.lookSaid.sun.film, 'the Sun\'s card says which look is on while its detail is drawn');
}

// --- 5. the address, the postcard, the row ------------------------------------------------------------------
{
  const { KEYS, parseHash } = await import(join(JS, 'ui/urlstate.js'));
  check(KEYS.indexOf('drawn') === KEYS.indexOf('exp') + 1, 'the look is in the address beside the exposure');
  check(!KEYS.includes('look'), '`look` stays the tool\'s query key (?look=1), never view state');
  if (typeof parseHash === 'function') check(parseHash('#at=jupiter&drawn=measured').drawn === 'measured', 'and is read from a link');
  const main = read('site/js/main.js');
  check(/createDrawn\(\{ initial: link && !link\.unknownVersion \? link\.drawn : undefined \}\)/.test(main), 'main.js reads it as it reads `exp`');
  check(/writeUrlState\(\{ drawn: mode === DEFAULT_DRAWN \? null : mode \}\);/.test(main), 'and writes it only when it is not Film');
  const { caption } = await import(join(JS, 'ui/printcompose.js'));
  const clock = { now: () => Date.UTC(2026, 9, 12, 12, 30) };
  const film = caption({ clock, look: () => 'film', exposure: { mode: () => 'camera' } }, { id: 'jupiter', name: 'Jupiter' }, null);
  const meas = caption({ clock, look: () => 'measured', exposure: { mode: () => 'camera' } }, { id: 'jupiter', name: 'Jupiter' }, null);
  const both = caption({ clock, look: () => 'measured', exposure: { mode: () => 'deep' } }, { id: 'jupiter', name: 'Jupiter' }, null);
  check(!film.when.includes(COPY.print.look.measured) && film.look === '' && film.when === caption({ clock }, { id: 'jupiter', name: 'Jupiter' }, null).when, 'the postcard under Film reads as it always did');
  check(meas.when.endsWith(COPY.print.look.measured) && meas.look === COPY.print.look.measured, `the postcard under Measured says so (${meas.when})`);
  check(both.when.includes(COPY.print.exposure.deep) && both.when.endsWith(COPY.print.look.measured), 'beside the exposure when that is said too');
  const C = COPY.look;
  for (const mode of X.DRAWN) {
    check(typeof C.modes[mode] === 'string' && C.modes[mode].split(' ').length === 1, `the look ${mode} is one word`);
    check(typeof C.titles[mode] === 'string' && C.titles[mode].length < 60, `its tooltip is under 60 characters (${C.titles[mode].length})`);
  }
  const ui = read('site/js/ui/exposure.js');
  check(/export function lookPanel\(drawn\)/.test(ui) && /b\.title = C\.titles\[mode\];/.test(ui) && /aria-pressed/.test(ui), 'the row: two buttons, a tooltip each, aria-pressed');
}

if (problems.length) { console.error('look setting FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`look setting ok: ${WEATHER.length} weather rows and every module with noise in a shader say what Measured does to them; hidden rows are drawn as none and the rest move as in Film at the clock's true rate; Film puts everything back; the card, the postcard and the link say which look is on`);
