// tests/test_tiers.mjs -- the device tiers (2026-09-28): which tier a device boots at, the one
// promotion frames can earn, the latch as the only way down, what is fetched when, and a boot set
// that is byte for byte what every visitor loaded before tiers existed.
//
// Pure: scene/texturetiers.js takes its loader and its targets as arguments, so a fake clock, fake
// textures and fake worlds drive it here. What a real browser does with the same code is measured by
// the probe in the PR (tools/cdp.mjs), not asserted here, because headless renders in software.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { chooseTier, createTierPromoter, createFrameLatch, TIER_PLANET_SLOTS, tierLine } = await import(join(JS, 'scene/quality.js'));
const { createTextureTiers, variantFor, urlFor, bootFiles, PLANET_4K_AT_PX, MONTH_HOLD_MS } = await import(join(JS, 'scene/texturetiers.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- 1. the tier a device boots at ----------------------------------------------------------------
// Capability fixtures: what each browser really reports (Chromium caps deviceMemory at 8; Safari and
// Firefox report none; SwiftShader in headless Chrome reports an 8192 texture limit).
const DEVICES = {
  'iPhone 15, Safari': { d: { maxTextureSize: 16384, hardwareConcurrency: 6, coarsePointer: true, screenW: 393, screenH: 852 }, tier: 0, ceiling: 0, why: 'phone' },
  'Pixel 8, Chrome, 8 GB': { d: { maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 9, coarsePointer: true, screenW: 412, screenH: 915, connection: { effectiveType: '4g' } }, tier: 0, ceiling: 0, why: 'phone' },
  'budget Android, 3g': { d: { maxTextureSize: 4096, deviceMemory: 2, coarsePointer: true, screenW: 360, screenH: 780, connection: { effectiveType: '3g' } }, tier: 0, ceiling: 0, why: 'data-saver' },
  'laptop with data-saver on': { d: { maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 8, screenW: 1440, screenH: 900, connection: { saveData: true } }, tier: 0, ceiling: 0, why: 'data-saver' },
  'Chromebook, 2 GB': { d: { maxTextureSize: 8192, deviceMemory: 2, hardwareConcurrency: 4, screenW: 1366, screenH: 768 }, tier: 0, ceiling: 0, why: 'memory 2 GB' },
  'old GPU, 2048 textures': { d: { maxTextureSize: 2048, hardwareConcurrency: 4, screenW: 1280, screenH: 800 }, tier: 0, ceiling: 0, why: 'max-texture 2048' },
  'iPad Air, Safari': { d: { maxTextureSize: 16384, hardwareConcurrency: 8, coarsePointer: true, screenW: 820, screenH: 1180 }, tier: 1, ceiling: 1 },
  'Intel laptop, Chrome, 4 cores': { d: { maxTextureSize: 16384, deviceMemory: 8, hardwareConcurrency: 4, screenW: 1536, screenH: 864 }, tier: 1, ceiling: 2 },
  'headless Chrome, SwiftShader': { d: { maxTextureSize: 8192, deviceMemory: 8, hardwareConcurrency: 8, screenW: 1440, screenH: 900 }, tier: 1, ceiling: 2 },
  'integrated GPU, 4096 textures': { d: { maxTextureSize: 4096, deviceMemory: 8, hardwareConcurrency: 8, screenW: 1440, screenH: 900 }, tier: 1, ceiling: 1 },
  'MacBook Air M2, Safari': { d: { maxTextureSize: 16384, hardwareConcurrency: 8, screenW: 1470, screenH: 956 }, tier: 2, ceiling: 2 },
  'desktop, Firefox, 16 cores': { d: { maxTextureSize: 16384, hardwareConcurrency: 16, screenW: 2560, screenH: 1440 }, tier: 2, ceiling: 2 },
  'desktop, Chrome, 32k textures': { d: { maxTextureSize: 32768, deviceMemory: 8, hardwareConcurrency: 16, screenW: 2560, screenH: 1440, connection: { effectiveType: '4g' } }, tier: 2, ceiling: 2 },
  'nothing reported at all': { d: {}, tier: 1, ceiling: 2 },
};
for (const [name, { d, tier, ceiling, why }] of Object.entries(DEVICES)) {
  const got = chooseTier(d);
  check(got.tier === tier, `${name}: boots at T${got.tier}, want T${tier} (${got.reasons.join(', ')})`);
  check(got.ceiling === ceiling, `${name}: ceiling T${got.ceiling}, want T${ceiling}`);
  if (why) check(got.reasons.includes(why), `${name}: the reason given is [${got.reasons}], want "${why}"`);
  check(got.tier <= got.ceiling, `${name}: boots above its own ceiling`);
}
// A touch laptop is not a phone: main.js asks for a coarse pointer AND no fine one anywhere.
check(chooseTier({ maxTextureSize: 16384, coarsePointer: false, screenW: 390, screenH: 800 }).tier > 0, 'a narrow window on a laptop is not a phone');

// --- 2. the one promotion -------------------------------------------------------------------------
function run(p, ms, frameMs, from = 0, latched = false) {
  let now = from, got = [];
  while (now < from + ms) { now += frameMs; const up = p.push(frameMs, now, latched); if (up !== null) got.push([up, now]); }
  return { got, now };
}
{
  const p = createTierPromoter({ tier: 1, ceiling: 2 });
  const { got } = run(p, 10000, 8);
  check(got.length === 1 && got[0][0] === 2, `120 fps for 10 s promotes T1 -> T2 exactly once (${JSON.stringify(got)})`);
  check(got.length && got[0][1] >= 20 * 8 + 3000 && got[0][1] <= 20 * 8 + 3000 + 16, `after the window filled and three seconds passed (${got[0] && got[0][1]} ms)`);
  check(p.tier === 2 && p.promoted, 'and says so');
}
{
  const p = createTierPromoter({ tier: 1, ceiling: 2 });
  check(run(p, 20000, 16.7).got.length === 0, '60 Hz frames (16.7 ms) never promote: vsync hides headroom, deliberately');
}
{
  const p = createTierPromoter({ tier: 1, ceiling: 2 });
  let r = run(p, 2500, 8);                      // 2.5 s fast
  r = run(p, 600, 30, r.now);                   // a stutter long enough to move the median
  r = run(p, 2800, 8, r.now);                   // 2.8 s fast again: the clock restarted
  check(r.got.length === 0, 'a stutter restarts the three seconds');
}
{
  const p = createTierPromoter({ tier: 0, ceiling: 0 });
  check(run(p, 20000, 8).got.length === 0 && p.tier === 0, 'a 120 Hz phone never leaves T0: frame time says nothing about memory');
}
{
  const p = createTierPromoter({ tier: 1, ceiling: 1 });
  check(run(p, 20000, 8).got.length === 0 && p.tier === 1, 'a tablet stops at its ceiling');
}
{
  const p = createTierPromoter({ tier: 1, ceiling: 2 });
  const r = run(p, 2000, 8);
  check(run(p, 20000, 8, r.now, true).got.length === 0 && p.tier === 0, 'the latch wins: once latched, no promotion, and the tier reads 0');
  check(run(p, 20000, 8, r.now + 20000, false).got.length === 0, 'and it never comes back');
}
{
  // Latch and promoter fed the same frames, as main.js feeds them: slow frames trip the latch and
  // no frame pattern afterwards can promote.
  const latch = createFrameLatch();
  const p = createTierPromoter({ tier: 1, ceiling: 2 });
  let now = 0, ups = 0;
  for (let i = 0; i < 300; i++) { now += 40; latch.push(40, now); if (p.push(40, now, latch.latched) !== null) ups++; }
  for (let i = 0; i < 3000; i++) { now += 8; latch.push(8, now); if (p.push(8, now, latch.latched) !== null) ups++; }
  check(latch.latched && ups === 0 && p.tier === 0, 'slow then fast: latched for good, never promoted');
}

// --- 3. what is fetched, and when -----------------------------------------------------------------
function fakeTex(url) { return { url, disposed: 0, dispose() { this.disposed++; } }; }
function rig(opts = {}) {
  const log = [];            // urls asked for, in order
  const pending = [];        // [url, resolve, reject]
  const idleQ = [];
  const earth = { ready: opts.earthReady || (() => true), slots: {}, set(slot, tex) { const o = this.slots[slot] || null; this.slots[slot] = tex; return o; } };
  const sky = { ready: () => true, map: null, set(tex) { const o = this.map; this.map = tex; return o; } };
  const px = Object.assign({}, opts.px || {});
  let selected = null;
  const worlds = {
    have: new Set(opts.haveMaps || ['moon', 'mars', 'mercury', 'jupiter']),
    maps: {},
    ready(id) { return this.have.has(id); },
    set(id, tex) { const o = this.maps[id] || null; this.maps[id] = tex; return o; },
    px: (id) => px[id] || 0,
    selected: () => selected,
  };
  let month = opts.month || 9;
  const tiers = createTextureTiers({
    tier: opts.tier,
    month: () => month,
    idle: (cb) => idleQ.push(cb),
    load: (url) => new Promise((resolve, reject) => { log.push(url); pending.push([url, resolve, reject]); }),
    targets: { earth, sky, worlds },
  });
  const settle = async () => {
    // Drain: idle callbacks run, loads resolve one at a time, until nothing moves.
    for (let guard = 0; guard < 200; guard++) {
      if (idleQ.length) { idleQ.shift()(); continue; }
      if (pending.length) { const [url, resolve] = pending.shift(); resolve(fakeTex(url)); await new Promise((r) => setTimeout(r, 0)); continue; }
      break;
    }
  };
  return { tiers, log, pending, idleQ, earth, sky, worlds, px, settle, setMonth: (m) => { month = m; }, select: (id) => { selected = id; } };
}

{
  // A phone: nothing, ever.
  const r = rig({ tier: 0, px: { moon: 900 } });
  r.tiers.start();
  for (let t = 0; t < 30000; t += 1000) r.tiers.tick(t);
  await r.settle();
  check(r.log.length === 0, `T0 fetches nothing beyond the boot set (${r.log.join(', ')})`);
}
{
  const r = rig({ tier: 1 });
  r.tiers.tick(0);
  await r.settle();
  check(r.log.length === 0, 'nothing is fetched before the first frame (start() is called after it)');
  r.tiers.start();
  // One at a time: the second is not asked for until the first has landed.
  r.idleQ.shift()();
  check(r.log.length === 1 && r.pending.length === 1, `one fetch at a time (${r.log.length} in flight)`);
  await r.settle();
  const want = ['textures/4k/earth_day_09.webp', 'textures/4k/earth_night.webp', 'textures/4k/earth_water.webp', 'textures/4k/milky_way.webp'];
  check(JSON.stringify(r.log) === JSON.stringify(want), `T1 fetches the Earth, then the sky, in that order, and nothing else while the planets are small: ${r.log.join(', ')}`);
  check(r.earth.slots.day && r.earth.slots.day.url === want[0] && r.earth.slots.water && r.sky.map, 'and each landed in its slot');
  check(r.tiers.state().fetchedBytes > 0, 'and counts what it fetched');

  // The clock moves to December: nothing until the month has held for MONTH_HOLD_MS.
  r.setMonth(12);
  r.tiers.tick(10000);
  await r.settle();
  check(r.log.length === 4, 'a new month is not fetched at once (a scrub through the year is not twelve downloads)');
  r.tiers.tick(10000 + MONTH_HOLD_MS - 100);
  await r.settle();
  check(r.log.length === 4, 'nor just before the hold is up');
  const sept = r.earth.slots.day;
  r.tiers.tick(10000 + MONTH_HOLD_MS + 100);
  await r.settle();
  check(r.log[4] === 'textures/4k/earth_day_12.webp' && r.earth.slots.day.url === 'textures/4k/earth_day_12.webp', `December's Earth after the hold (${r.log[4]})`);
  check(sept.disposed === 1, 'and September\'s 4k texture is freed');

  // Planets: the Moon small, then big. T1 holds ONE planet at 4k (its GPU budget, spec 0056).
  check(TIER_PLANET_SLOTS[0] === 0 && TIER_PLANET_SLOTS[1] === 1, `T0 holds no planet at 4k and T1 one (${TIER_PLANET_SLOTS})`);
  r.px.moon = PLANET_4K_AT_PX - 1;
  r.tiers.tick(20000); await r.settle();
  check(!r.log.includes('textures/4k/moon.webp'), 'a small Moon keeps its 2k map');
  r.px.moon = PLANET_4K_AT_PX + 1;
  r.tiers.tick(21000); await r.settle();
  check(r.worlds.maps.moon && r.worlds.maps.moon.url === 'textures/4k/moon.webp', 'a big Moon gets 4k');
  r.px.mars = 800;
  r.tiers.tick(22000); await r.settle();
  check(!r.log.includes('textures/4k/mars.webp'), 'T1 holds one planet at 4k and Mars waits while the Moon is still big');
  const moonTex = r.worlds.maps.moon;
  r.px.moon = 10;
  r.tiers.tick(23000); await r.settle();
  check(r.log.includes('textures/4k/mars.webp') && r.worlds.maps.moon === null && moonTex.disposed === 1,
    'when the Moon shrinks it gives the slot back (boot map restored, 4k freed) and Mars gets it');
  r.select('jupiter');
  r.px.mars = 0;
  r.tiers.tick(24000); await r.settle();
  check(r.worlds.maps.jupiter && r.worlds.maps.jupiter.url === 'textures/4k/jupiter.webp' && r.worlds.maps.mars === null,
    'a selected world gets 4k whatever its size, and takes the slot from one that has gone small');

  // The latch: everything back, for good.
  const held = [r.earth.slots.day, r.earth.slots.night, r.sky.map, r.worlds.maps.jupiter];
  r.tiers.latch();
  check(r.earth.slots.day === null && r.earth.slots.night === null && r.earth.slots.water === null && r.sky.map === null,
    'the latch puts the Earth and the sky back on their boot maps');
  check(held.every((t) => t.disposed === 1), 'and frees every 4k texture');
  check(r.tiers.tier === 0 && r.tiers.setTier(2) === 0, 'and no promotion can undo it');
  const n = r.log.length;
  r.px.moon = 900;
  for (let t = 30000; t < 60000; t += 1000) r.tiers.tick(t);
  await r.settle();
  check(r.log.length === n, 'and nothing is fetched after it');
}
{
  // The Earth's boot maps still decoding: its 4k waits (a swap before the 2k landed would be undone
  // by earth.js settleMaps).
  let ready = false;
  const r = rig({ tier: 1, earthReady: () => ready });
  r.tiers.start(); await r.settle();
  check(r.log.join() === 'textures/4k/milky_way.webp', `only the sky while the Earth settles (${r.log.join(', ')})`);
  ready = true; r.tiers.tick(1000); await r.settle();
  check(r.log.includes('textures/4k/earth_day_09.webp'), 'and the Earth once it has');
}
{
  // A file that will not load is not asked for twice.
  const r = rig({ tier: 1 });
  r.tiers.start();
  r.idleQ.shift()();
  const [url, , reject] = r.pending.shift();
  reject(new Error('404'));
  await new Promise((res) => setTimeout(res, 0));
  await r.settle();
  check(r.log.filter((u) => u === url).length === 1, `a failed ${url} is not retried`);
}
{
  // Promotion: a T1 laptop earns T2's extra slots.
  const r = rig({ tier: 1, px: { moon: 900, mars: 900, mercury: 900 } });
  r.tiers.start(); await r.settle();
  const planets = () => ['moon', 'mars', 'mercury'].filter((id) => r.worlds.maps[id]).length;
  check(planets() === 1, `T1: one planet at 4k (${planets()})`);
  r.tiers.setTier(2); await r.settle();
  check(planets() === 3, `T2 after the promotion: three (${planets()})`);
}

// --- 4. the boot set is what it was --------------------------------------------------------------
// Every tier-0 file, and the ones a first visit fetches (the Earth's three maps and the Milky Way,
// on screen from the first frame), byte for byte what origin/main shipped on 2026-09-28. The 2.5 MB
// first-visit gate had ~140 KB to spare; a tier must never be paid for out of it.
const BOOT_2026_09_28 = {
  'textures/2k_earth_daymap.jpg': 463087,
  'textures/2k_earth_nightmap.webp': 84590,
  'textures/2k_earth_clouds.webp': 575032,
  'textures/2k_stars_milky_way.webp': 60004,
};
const boot = bootFiles(TEXTURES);
// 34 since 2026-10-05: fifteen more moons wear a map. A moon's tier-0 file is fetched when the moon is
// first big enough on screen (scene/worlds.js), so none of them is in the first visit below.
// 35 since 2026-10-06: Venus's ground by radar, fetched when its card asks for it (`when: asked`).
check(boot.length === 41 && boot.every((f) => /^textures\/[12]k_[a-z0-9_]+\.(jpg|webp|png)$/.test(f)), `tier 0 is the forty-one 1k and 2k files (${boot.length})`);
let firstVisit = 0;
for (const [f, bytes] of Object.entries(BOOT_2026_09_28)) {
  check(boot.includes(f), `${f} is still in the boot set`);
  const real = statSync(join(ROOT, 'site', f)).size;
  check(real === bytes, `${f} is ${real} bytes, not the ${bytes} it was: the boot set changed`);
  firstVisit += real;
}
check(firstVisit === 1182713, `the first visit's textures are ${firstVisit} bytes, as before tiers (1 182 713)`);
// The code that loads the boot set names the same files the manifest calls tier 0.
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(main.includes("milkyWayTexture: 'textures/2k_stars_milky_way.webp'"), 'main.js boots the Milky Way from the tier-0 file');
for (const w of WORLDS) {
  const names = [w.look.map, w.look.day, w.look.night, w.look.clouds, w.look.ring && w.look.ring.map].filter(Boolean);
  for (const n of names) check(boot.includes('textures/' + n), `worlds.js boots ${w.id} from ${n}, which is not a tier-0 file`);
}
// Every tier-1 file is 4096 x 2048 and nothing larger ships: 8k waits for KTX2.
for (const row of TEXTURES) {
  for (const f of row.files) {
    if (f.tier > 0) check(f.px[0] === 4096 && f.px[1] === 2048, `${row.id} tier ${f.tier} is ${f.px}, not 4096 x 2048`);
    check(f.px[0] <= 4096, `${row.id}: ${f.px[0]} wide is over what any tier may ship without KTX2`);
  }
}
// What a T1 laptop fetches after the first frame, worst month, against its budget (registry/budgets.yaml).
{
  let idle = 0;
  for (const row of TEXTURES.filter((r) => r.when === 'idle')) {
    const f = variantFor(row, 1);
    if (f && f.tier > 0) idle += Array.isArray(f.bytes) ? Math.max(...f.bytes) : f.bytes;
  }
  check(idle <= BUDGETS.tier1_idle_bytes, `T1 fetches ${idle} B after the first frame, over tier1_idle_bytes ${BUDGETS.tier1_idle_bytes}`);
  // GPU, worst case: every map on screen from the start at its T1 file, the live clouds' 2k picture,
  // and T1's planet slots each holding the largest 4k planet. RGBA8 = 4 bytes, R8 = 1, x 4/3 for mips.
  const mib = (f) => (f.px[0] * f.px[1] * (f.format === 'mono' ? 1 : 4) * 4) / 3 / 1048576;
  let gpu = (2048 * 1024 * 4 * 4) / 3 / 1048576; // the live clouds (scene/liveclouds.js), 2k RGBA
  for (const row of TEXTURES.filter((r) => r.world === 'earth' || r.world === 'sky' || r.id === 'saturn-ring')) {
    const f = variantFor(row, 1);
    if (f) gpu += mib(f);
  }
  const planet4k = Math.max(...TEXTURES.filter((r) => r.when === 'near').map((r) => mib(variantFor(r, 1))));
  gpu += TIER_PLANET_SLOTS[1] * planet4k;
  check(gpu <= BUDGETS.tier1_texture_gpu_mib, `T1 maps could hold ${gpu.toFixed(1)} MiB of GPU memory, over tier1_texture_gpu_mib ${BUDGETS.tier1_texture_gpu_mib}`);
}
check(urlFor(variantFor(TEXTURES.find((r) => r.slot === 'day'), 2), 3) === 'textures/4k/earth_day_03.webp', 'T2 wears the tier-1 file until a tier-2 one exists');
check(variantFor(TEXTURES.find((r) => r.id === 'earth-water'), 0) === null, 'a phone has no water mask; the shader guesses the ocean');

// --- 5. the line the panel prints ------------------------------------------------------------------
const q = COPY.quality;
check(tierLine({ tier: 0, reasons: ['phone'] }, q) === q.tierPhone, 'phone line');
check(tierLine({ tier: 0, reasons: ['data-saver'] }, q) === q.tierSaver, 'data-saver line');
check(tierLine({ tier: 1, reasons: [] }, q) === q.tier1, 'T1 line');
check(tierLine({ tier: 2, promoted: true, reasons: [] }, q) === q.tier2 + ' ' + q.promoted, 'promoted T2 line');
check(tierLine({ tier: 0, latched: true, promoted: true, reasons: [] }, q) === q.tierLatched, 'the latch line wins over everything');

if (problems.length) { console.error('tiers FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`tiers ok: ${Object.keys(DEVICES).length} devices tiered, one promotion by frames and none past the latch, ` +
  `4k fetched one at a time after the first frame and never on T0, boot set unchanged (${firstVisit} bytes of textures)`);
