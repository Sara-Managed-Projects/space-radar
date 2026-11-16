// tests/test_review_f1c.mjs -- two faults of the review of 16 Nov 2026: What to show forgot a visitor's choices on a reload
// (ui/showmemory.js), and Tonight's guessed place could be a continent off (sky/zoneplace.js, site/data/zones.json).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ================================================================ 1. What to show, remembered
const M = await import(join(JS, 'ui/showmemory.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const store = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); }, size: () => m.size }; };
const byId = new Map(LAYERS.map((l) => [l.id, l]));
const defaults = (id) => M.defaultOn(byId.get(id));
{
  const s = store();
  check(!M.hasShow(s) && JSON.stringify(M.readShow(s)) === '{"layers":{},"colour":null,"overlay":null}', 'nothing is kept until something is chosen');
  // the review's own steps: the ring on, the stations off, colour by height, sea ice
  check(defaults('geo-ring') === false && defaults('stations') === true, 'the geostationary ring starts off and the stations on');
  M.writeShow(s, { layers: { 'geo-ring': true } }, defaults);
  M.writeShow(s, { layers: { stations: false } }, defaults);
  M.writeShow(s, { colour: 'altitude' }, defaults);
  M.writeShow(s, { overlay: 'sea-ice' }, defaults);
  const kept = M.readShow(s);
  check(kept.layers['geo-ring'] === true && kept.layers.stations === false && kept.colour === 'altitude' && kept.overlay === 'sea-ice' && M.hasShow(s), `the four choices are kept (${JSON.stringify(kept)})`);
  check(/^\{"v":1,/.test(s.getItem(M.SHOW_KEY)), 'under one key, with a version');

  // a reload: a fresh map with the defaults, and the kept choices put back
  const on = new Map(LAYERS.map((l) => [l.id, M.defaultOn(l)]));
  const calls = [];
  const ctx = {
    layers: LAYERS, isLayerOn: (id) => !!on.get(id), setLayerOn: (id, v) => { on.set(id, v); calls.push(`layer ${id} ${v}`); },
    colourKey: () => ctx.key || 'class', setColourKey: (id) => { ctx.key = id; calls.push(`colour ${id}`); }, setOverlay: (id) => { ctx.overlay = id; calls.push(`overlay ${id}`); },
  };
  const done = M.restoreShow(ctx, s);
  check(on.get('geo-ring') === true && on.get('stations') === false && ctx.key === 'altitude' && ctx.overlay === 'sea-ice', `after a reload the ring is on, the stations off, the dots by height and the sea ice over the globe (${calls.join('; ')})`);
  check(done.layers === 2 && done.colour === 'altitude' && done.overlay === 'sea-ice', 'and it says what it put back');
  check(M.restoreShow(ctx, s).layers === 0, 'putting it back twice switches nothing');
  // a change of moment lays the defaults down again: only the layers are put back then
  on.set('geo-ring', false); calls.length = 0;
  M.restoreShow(ctx, s, { layersOnly: true });
  check(on.get('geo-ring') === true && calls.every((c) => c.startsWith('layer ')), 'after a change of moment the kept layers come back, and nothing else is touched');
  // a choice that is the default again is dropped; class is Colour by's default; no data layer is none
  M.writeShow(s, { layers: { 'geo-ring': false, stations: true } }, defaults);
  M.writeShow(s, { colour: 'class' }, defaults);
  M.writeShow(s, { overlay: null }, defaults);
  check(!M.hasShow(s) && s.size() === 0, 'choices that are the defaults again leave no key at all');
  // forget
  M.writeShow(s, { layers: { stations: false }, colour: 'altitude' }, defaults);
  M.forgetShow(s);
  check(!M.hasShow(s) && s.size() === 0, 'Reset forgets everything');
}
{
  // what is not this module's shape is nothing kept, and nothing throws
  for (const raw of ['', 'x', '[]', '{"v":2,"layers":{"stations":false}}', '{"v":1,"layers":["a"]}', '{"v":1,"layers":{"<script>":true,"stations":"no"},"colour":7,"overlay":"<img>"}', 'null']) {
    const s = store(); s.setItem(M.SHOW_KEY, raw);
    let got = null; try { got = M.readShow(s); } catch { got = 'threw'; }
    check(got !== 'threw' && Object.keys(got.layers).length === 0 && got.colour === null && got.overlay === null, `a stored ${JSON.stringify(raw).slice(0, 40)} reads as nothing kept`);
  }
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  let threw = false;
  try { M.readShow(broken); M.writeShow(broken, { colour: 'altitude' }); M.forgetShow(broken); M.hasShow(broken); M.readShow(null); M.writeShow(null, { colour: 'altitude' }); } catch { threw = true; }
  check(!threw, 'a browser that refuses storage is a browser with the defaults: nothing throws');
  // a layer the map no longer has, or one the registry switched off, is skipped
  const s = store(); s.setItem(M.SHOW_KEY, JSON.stringify({ v: 1, layers: { 'no-such-layer': true, gone: true }, colour: 'no-such-key', overlay: 'no-such-map' }));
  const calls = [];
  const done = M.restoreShow({ layers: [{ id: 'gone', enabled: false }], isLayerOn: () => false, setLayerOn: (id) => calls.push(id), setColourKey: (id) => calls.push(id), setOverlay: (id) => calls.push(id) }, s, { colours: ['class', 'altitude'], overlays: ['sea-ice'] });
  check(calls.length === 0 && done.layers === 0 && !done.colour && !done.overlay, 'what the map no longer offers is not applied');
}
{
  const wts = read('site/js/ui/whattoshow.js');
  check(/applyLayerOn\(ctx, layer, box\.checked\); keep\(\{ layers: \{ \[layer\.id\]: box\.checked \} \}\);/.test(wts), 'a layer\'s box is kept when the visitor presses it');
  check(/setGroupOn\(ctx, group\.layers, true\); keepGroup\(true\);/.test(wts) && /setGroupOn\(ctx, group\.layers, false\); keepGroup\(false\);/.test(wts), 'All and None of a group are kept');
  check(/if \(e && e\.detail && e\.detail\.from !== 'memory'\) keep\(\{ colour: e\.detail\.id \}\)/.test(wts) && /keep\(\{ overlay: e\.target\.value \|\| null \}\)/.test(wts), 'Colour by and Earth data are kept');
  check(/el\('button', 'ui-btn ui-btn--sm ui-btn--quiet', M\.reset\)/.test(wts) && /resetRow\.hidden = !hasShow\(storage\)/.test(wts) && /forgetShow\(storage\);/.test(wts), 'a Reset of the shared set is there only while something is kept');
  check(!/from: 'whattoshow'[^\n]*keep\(/.test(wts) && !/sr:layer-toggle', \(e\) => [^\n]*keep\(/.test(wts), 'a layer a link or a search switched on is not a choice: only the panel\'s own presses are kept');
  const main = read('site/js/main.js');
  check(/if \(!embed && !ambient && !film && localStorage\.getItem\('sr:show'\)\) import\('\.\/ui\/showmemory\.js'\)\.then\(\(m\) => m\.installShowMemory\(ctx\)\)/.test(main) && /try \{ if \(!embed && !ambient && !film && localStorage/.test(main), 'main.js puts the choices back after the first view, only when a key is there, inside a try, never in a frame');
  check(!/^import [^\n]*showmemory/m.test(main), 'none of it is in the boot graph');
  const key = read('site/js/ui/colorkey.js');
  check(/const now = typeof ctx\.colourKey === 'function' \? ctx\.colourKey\(\) : '';\s*if \(now && COLOR_KEYS\.some\(\(k\) => k\.id === now\)\) \{ current = now; select\.value = now; \}/.test(key), 'Colour by\'s select opens on the key the dots are in');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  check(COPY.showMemory && COPY.showMemory.reset.split(/\s+/).length <= 2 && COPY.showMemory.note && COPY.showMemory.resetTitle, 'with its words, the button two words at most');
}

// ================================================================ 2. the guessed place
const G = await import(join(JS, 'sky/guessplace.js'));
const Z = await import(join(JS, 'sky/zoneplace.js'));
const { CITIES } = await import(join(JS, 'copy/en.js'));
const doc = JSON.parse(read('site/data/zones.json'));
const km = (a, b) => {
  const R = 6371, d = Math.PI / 180;
  const h = Math.sin(((b.latDeg - a.latDeg) * d) / 2) ** 2 + Math.cos(a.latDeg * d) * Math.cos(b.latDeg * d) * Math.sin(((b.lonDeg - a.lonDeg) * d) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const now = new Date(Date.UTC(2026, 10, 16, 8));
{
  check(/IANA Time Zone Database, zone\.tab \(public domain\), release \S+/.test(doc.source), `the table names its source and release (${doc.source})`);
  check(Object.keys(doc.zones).length >= 400 && Object.keys(doc.aliases).length >= 50, `${Object.keys(doc.zones).length} zones and ${Object.keys(doc.aliases).length} older names`);
  // the fault, reproduced on the old path: the rough guess for the review's zones is far from the zone's own place
  const REVIEW = ['Australia/Perth', 'Europe/Athens', 'Europe/Bucharest', 'America/Winnipeg', 'Europe/Lisbon', 'Europe/Oslo', 'Europe/Dublin', 'Asia/Jerusalem'];
  for (const zone of REVIEW) {
    const rough = G.guessObserver(CITIES, { timeZone: zone, now });
    const own = Z.zonePlace(doc, zone);
    check(rough && own && G.isRoughGuess(rough), `${zone}: the bundled cities alone give a rough guess (${rough && rough.name}), which is to be bettered`);
    const better = await Z.refineGuess({ timeZone: zone, doc });
    check(better && better.source === 'guess' && better.how === 'zone' && better.name === zone.split('/').pop() && km(better, own) < 1 && !G.isRoughGuess(better), `${zone}: the guess is ${better && better.name}, the zone's own city, still called a guess`);
    check(Math.sign(better.latDeg) === Math.sign(own.latDeg) && km(better, rough) > 300, `${zone}: ${Math.round(km(better, rough))} km from where the rough guess (${rough.name}) put it`);
  }
  const perth = await Z.refineGuess({ timeZone: 'Australia/Perth', doc });
  check(perth.latDeg < -30 && perth.latDeg > -34 && perth.lonDeg > 114 && perth.lonDeg < 118, `Perth is in the southern hemisphere, on Australia's west coast (${perth.latDeg}, ${perth.lonDeg}), not at Manila`);

  // THE TABLE CHECK: two independent lists agree. Every bundled city that is the city its zone is named for (the app's
  // own list, city-centre coordinates) is within 40 km of the place the time zone database gives that zone.
  let agreed = 0;
  for (const c of CITIES) {
    if (!c.zone || c.zone.split('/').pop().replace(/_/g, ' ').toLowerCase() !== c.name.toLowerCase()) continue;
    const own = Z.zonePlace(doc, c.zone);
    check(!!own, `${c.zone} is in the table`);
    if (!own) continue;
    const d = km(own, c);
    check(d < 40, `${c.zone}: the table's place is ${Math.round(d)} km from the bundled ${c.name}`);
    agreed += 1;
  }
  check(agreed >= 60, `the table and the bundled cities agree for ${agreed} zones (at least 60 are checked)`);
  // and for every zone of the table the guess is that zone's place, named for it, never a city of another zone
  let all = 0;
  for (const zone of Object.keys(doc.zones)) {
    const g = await Z.refineGuess({ timeZone: zone, doc });
    const row = doc.zones[zone];
    check(g && g.latDeg === row[0] && g.lonDeg === row[1] && g.name === Z.zoneCity(zone) && Math.abs(g.latRad - row[0] * Math.PI / 180) < 1e-12, `${zone}: the guess is its own place`);
    all += 1;
  }
  check(all >= 400, `every one of the ${all} zones guesses its own place`);
  // older names a browser still reports
  for (const [old, want] of [['Asia/Calcutta', 'Kolkata'], ['Europe/Kiev', 'Kyiv'], ['Asia/Saigon', 'Ho Chi Minh'], ['America/Buenos_Aires', 'Buenos Aires'], ['Asia/Katmandu', 'Kathmandu']]) {
    const g = await Z.refineGuess({ timeZone: old, doc });
    check(g && g.name === want, `${old} is ${want} (${g && g.name})`);
  }
  // nothing to say for what is no zone; the rough guess then stands
  for (const zone of ['Etc/UTC', 'UTC', 'Mars/Olympus', '', null, 7]) check((await Z.refineGuess({ timeZone: zone, doc })) === null, `${JSON.stringify(zone)} has no place in the table`);
  check((await Z.refineGuess({ timeZone: 'Australia/Perth', doc: null, doFetch: async () => { throw new Error('offline'); } })) === null, 'a table that did not arrive leaves the rough guess standing, and does not throw');
  // a zone whose city is bundled is answered at once and needs no table
  for (const zone of ['Europe/Berlin', 'America/Denver', 'Asia/Kolkata', 'Pacific/Auckland', 'Africa/Nairobi']) {
    const g = G.guessObserver(CITIES, { timeZone: zone, now });
    check(g && g.how === 'timezone' && !G.isRoughGuess(g), `${zone}: the bundled city answers at once (${g && g.name}), with no fetch`);
  }
  // a bundled city that only shares the zone's clock is marked, so that the zone's own city replaces it
  const sh = G.guessObserver([{ name: 'Beijing', country: 'China', latDeg: 39.9042, lonDeg: 116.4074, zone: 'Asia/Shanghai' }], { timeZone: 'Asia/Shanghai', now });
  check(sh && sh.name === 'Beijing' && sh.how === 'zone-city' && G.isRoughGuess(sh) && (await Z.refineGuess({ timeZone: 'Asia/Shanghai', doc })).name === 'Shanghai', `Asia/Shanghai with only Beijing bundled: ${sh && sh.name} at once (${sh && sh.how}), then Shanghai`);
}
{
  const main = read('site/js/main.js');
  const tonight = read('site/js/ui/tonight.js');
  const live = read('site/js/pages/live.js');
  const refine = /if \(isRoughGuess\(g(?:uess)?\)\) \{\s*import\('\.\.?\/sky\/zoneplace\.js'\)\.then\(\(m\) => m\.refineGuess\(\)\)\.then\(\(better\) => \{ if \(better && (?:ctx\.)?observer && (?:ctx\.)?observer\.source === 'guess'\) ctx\.setObserver\(better\); \}\)/;
  check(refine.test(main) && refine.test(tonight), 'the Now door and the Tonight tab better a rough guess with the zone\'s own place, only while the place is still a guess');
  check(/refineGuess\(\)\) \|\| guess/.test(live) && /if \(!kept && guess && guess\.how !== 'timezone'\)/.test(live), 'the live page does the same when no place is kept');
  check(!/^import [^\n]*zoneplace/m.test(main) && !/^import [^\n]*zoneplace/m.test(tonight), 'the table and its module are fetched only for such a guess');
  // how to set the place is said outright while it is a guess
  check(/const words = guessed \? T\.setPlace : COPY\.placeKeep\.change;/.test(tonight) && /change\.classList\.toggle\('ui-btn--secondary', guessed\)/.test(tonight) && /change\.classList\.toggle\('ui-btn--quiet', !guessed\)/.test(tonight), 'while the place is a guess its button reads "Set your place", in the set\'s secondary look');
  check(/placeOpen = !o \|\| o\.source === 'guess' \? true : placeCtl\.root\.hidden;/.test(tonight), 'and a press goes to the city field instead of closing the box');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  check(COPY.tonight.setPlace === 'Set your place', 'with its words');
}

if (problems.length) {
  console.error(`review f1c FAILED (${problems.length}):\n  ${problems.slice(0, 40).join('\n  ')}`);
  process.exit(1);
}
console.log('review f1c ok: What to show keeps a visitor\'s layers, Colour by and Earth data across a reload and forgets them on Reset; a guessed place is the time zone\'s own city for every zone of the table, which agrees with the bundled cities, and the way to set a place is said outright');
