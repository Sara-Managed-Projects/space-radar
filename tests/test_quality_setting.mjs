// tests/test_quality_setting.mjs -- the quality a visitor can choose (spec 0073 requirement 6).
//
//   node tests/test_quality_setting.mjs
//
// Auto, Low, Medium, High, Ultra (scene/quality.js qualityPlan; the row is ui/qualitypanel.js). What
// is held here, with no browser:
//   1. the mapping from the choice and the device to a tier, the latch's removals, the step counts
//      and the pixel ratio; a choice above the device's ceiling is ABSENT, never passed;
//   2. Low is never promoted, and Auto is promoted exactly as before;
//   3. the fallback when the latch fires under a manual choice, and Ultra's held ladder;
//   4. the one stored key, read before the tier is acted on, and never in the address;
//   5. the maps follow a choice downward (scene/texturetiers.js setTier), and what main.js wires.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const Q = await import(join(JS, 'scene/quality.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- 1. the mapping ---------------------------------------------------------------------------------
check(same(Q.QUALITY_CHOICES, ['auto', 'low', 'medium', 'high', 'ultra']) && Q.DEFAULT_QUALITY === 'auto', 'five choices, Auto first and the default');
check(same(Q.offeredQualities(0), ['auto', 'low']), 'a phone (ceiling 0) is offered Auto and Low');
check(same(Q.offeredQualities(1), ['auto', 'low', 'medium']), 'a tablet (ceiling 1) is offered Medium too: High and Ultra are absent');
check(same(Q.offeredQualities(2), ['auto', 'low', 'medium', 'high', 'ultra']), 'a desktop (ceiling 2) is offered all five');
check(!Q.offeredQualities(1).includes('ultra') && !Q.offeredQualities(0).includes('ultra'), 'Ultra is absent below the top ceiling');
check(same(Q.offeredQualities(2, true), ['auto', 'low']), 'after the frame latch only Auto and Low are left');

const laptop = { tier: 1, ceiling: 2 };
const plan = (c, d = laptop, latched = false) => Q.qualityPlan(c, d, latched);
check(same(plan('auto'), { choice: 'auto', tier: 1, stripped: false, ultra: false, promote: true, steps: 'tier', scale: 'governed' }), 'Auto is the device\'s own tier, governed and promoted: today\'s behaviour');
check(same(plan('low'), { choice: 'low', tier: 0, stripped: true, ultra: false, promote: false, steps: 'floor', scale: 'one' }), 'Low is tier 0 with the latch\'s removals on');
check(plan('medium').tier === 1 && plan('high').tier === 2 && !plan('medium').stripped && !plan('high').stripped, 'Medium is tier 1 and High tier 2');
check(plan('high').tier === 2 && laptop.tier === 1, 'a manual choice above what the device measured is allowed, up to its ceiling');
check(same(plan('ultra'), { choice: 'ultra', tier: 2, stripped: false, ultra: true, promote: false, steps: 'top', scale: 'held' }), 'Ultra is tier 2 with the top step counts and the pixel ratio held at its cap');
for (const c of Q.QUALITY_CHOICES) for (const ceiling of [0, 1, 2]) for (const tier of [0, 1, 2]) {
  const p = plan(c, { tier: Math.min(tier, ceiling), ceiling });
  check(p.tier <= ceiling, `${c} on a ceiling-${ceiling} device asks for tier ${p.tier}: the ceiling is never passed`);
  check(Q.offeredQualities(ceiling).includes(p.choice), `${c} on a ceiling-${ceiling} device became ${p.choice}, which that device is not offered`);
  check(p.promote === (p.choice === 'auto'), `${c} on a ceiling-${ceiling} device: only Auto is promoted`);
}
check(plan('ultra', { tier: 1, ceiling: 1 }).choice === 'auto' && plan('high', { tier: 0, ceiling: 0 }).choice === 'auto', 'a stored choice this device is not offered is Auto');
check(plan('nonsense').choice === 'auto' && plan(undefined).choice === 'auto' && Q.qualityPlan().choice === 'auto', 'an unknown choice is Auto');
check(same(plan('high', laptop, true), { choice: 'auto', tier: 0, stripped: true, ultra: false, promote: false, steps: 'floor', scale: 'one' }), 'after the latch every choice is the latch\'s picture');
check(plan('low', laptop, true).choice === 'low', 'and Low stays Low');

// The step counts a plan means, in the two effects that march: the Earth's air and the aurora.
{
  const { setEarthAirSteps, EARTH_AIR } = await import(join(JS, 'scene/atmosphere.js'));
  const { TIER_STEPS } = await import(join(JS, 'scene/aurora.js'));
  const shell = { material: { uniforms: { uSteps: { value: 0 } } }, userData: {} };
  const air = (c) => { const p = plan(c); return setEarthAirSteps(shell, p.tier, p.stripped, { top: p.steps === 'top', release: true }); };
  check(air('medium') === EARTH_AIR.steps[1] && air('high') === EARTH_AIR.steps[2], `the air is marched in the tier's steps (${air('medium')}, ${air('high')})`);
  check(air('ultra') === EARTH_AIR.maxSteps && EARTH_AIR.maxSteps >= EARTH_AIR.steps[2], 'Ultra marches it in the most steps the shader takes');
  check(air('low') === EARTH_AIR.latchedSteps, 'Low marches it in the latch\'s steps');
  check(air('high') === EARTH_AIR.steps[2], 'and leaving Low raises it again (the real latch never releases)');
  setEarthAirSteps(shell, 2, true);
  check(setEarthAirSteps(shell, 2, false) === EARTH_AIR.latchedSteps, 'without `release` a latched shell stays latched, as before');
  check(TIER_STEPS[TIER_STEPS.length - 1].maxSteps === Math.max(...TIER_STEPS.map((s) => s.maxSteps)), 'the aurora\'s last row is its top step count (Ultra asks for it by `top`)');
  const aurora = readFileSync(join(JS, 'scene/aurora.js'), 'utf8');
  check(/TIER_STEPS\[top \? TIER_STEPS\.length - 1 : Math\.min\(2, tier\.value\)\]/.test(aurora), 'scene/aurora.js takes its top steps when asked');
}

// --- 2. the promoter leaves a manual choice alone ----------------------------------------------------
{
  const promoterFor = (p, ceiling) => Q.createTierPromoter({ tier: p.tier, ceiling: p.promote ? ceiling : p.tier });
  const fast = (p) => { let now = 0, ups = 0; for (let i = 0; i < 3000; i++) { now += 8; if (p.push(8, now, false) !== null) ups++; } return ups; };
  const low = promoterFor(plan('low'), 2);
  check(fast(low) === 0 && low.tier === 0, 'Low is never promoted, however fast the frames');
  const medium = promoterFor(plan('medium'), 2);
  check(fast(medium) === 0 && medium.tier === 1, 'nor is Medium: the visitor chose it');
  const auto = promoterFor(plan('auto'), 2);
  check(fast(auto) === 1 && auto.tier === 2, 'Auto is promoted once, as before');
}

// --- 3. the latch still protects ---------------------------------------------------------------------
check(same(Q.qualityAfterLatch('ultra'), { choice: 'auto', told: true }) && same(Q.qualityAfterLatch('high'), { choice: 'auto', told: true }) && same(Q.qualityAfterLatch('medium'), { choice: 'auto', told: true }),
  'the latch under a manual choice above Low: back to Auto, and the visitor is told');
check(same(Q.qualityAfterLatch('auto'), { choice: 'auto', told: false }) && same(Q.qualityAfterLatch('low'), { choice: 'low', told: false }), 'under Auto or Low nothing changes and nothing is said');
check(COPY.quality.fellBack.length <= 60 && /Auto/.test(COPY.quality.fellBack), 'the one toast is a line of chrome that names Auto');
{
  // Ultra: the ladder is held at its top, frames are not counted, and the latch is not fed from it.
  const g = Q.createScaleGovernor({ deviceRatio: 2 });
  let now = 0;
  for (let i = 0; i < 200; i++) { now += 40; g.push(40, now); }
  check(g.scale < 2, 'slow frames step the ladder down');
  check(g.hold(true) === true && g.scale === 2 && g.held, 'held: back at the top of the ladder');
  let moved = 0;
  for (let i = 0; i < 400; i++) { now += 40; if (g.push(40, now)) moved++; }
  check(moved === 0 && g.scale === 2 && g.atFloor === false, 'while held no frame moves it and the latch is not fed from here');
  check(g.rest(now) === false, 'nor does a resting frame');
  check(g.hold(false) === false && g.scale === 2 && !g.held, 'let go, it starts from the top');
  for (let i = 0; i < 200; i++) { now += 40; g.push(40, now); }
  check(g.scale < 2, 'and is governed again');
  g.freeze();
  check(g.hold(true) === false && !g.held, 'after the latch it cannot be held');
  // The guard main.js runs under Ultra is the latch's own test.
  const guard = Q.createFrameLatch();
  let tripped = 0; now = 0;
  for (let i = 0; i < 200; i++) { now += 40; if (guard.push(40, now)) tripped++; }
  check(tripped === 1, 'three slow seconds end Ultra once');
}

// --- 4. remembered in this browser, never in the address ----------------------------------------------
{
  const store = (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; })();
  check(Q.readQualityChoice(store) === 'auto', 'nothing stored is Auto');
  check(Q.writeQualityChoice(store, 'high') && store.m.get(Q.QUALITY_KEY) === 'high' && Q.readQualityChoice(store) === 'high', 'a choice is one key');
  Q.writeQualityChoice(store, 'auto');
  check(store.m.size === 0, 'Auto removes the key');
  store.setItem(Q.QUALITY_KEY, 'extreme');
  check(Q.readQualityChoice(store) === 'auto', 'an unknown stored value is Auto');
  const broken = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('private mode'); }, removeItem() { throw new Error('private mode'); } };
  check(Q.readQualityChoice(broken) === 'auto' && Q.writeQualityChoice(broken, 'low') === false, 'a storage that throws is Auto and does not throw');
  check(Q.readQualityChoice(null) === 'auto' && Q.writeQualityChoice(null, 'low') === false, 'no storage is Auto');
  const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
  check(!KEYS.includes('quality') && !KEYS.includes('tier') && !KEYS.includes('q'), 'the quality describes the device, not the view: it is not in the address');
}
check(Q.qualityNote(plan('auto'), COPY.quality) === 'Auto: Medium' && Q.qualityNote(plan('auto', { tier: 2, ceiling: 2 }), COPY.quality) === 'Auto: High' && Q.qualityNote(plan('auto', { tier: 0, ceiling: 0 }), COPY.quality) === 'Auto: Low',
  'on Auto the note says the tier Auto is wearing');
check(Q.qualityNote(plan('auto', laptop, true), COPY.quality) === 'Auto: Low', 'after the latch Auto is Low, and says so');
check(Q.qualityNote(plan('high'), COPY.quality) === '' && Q.qualityNote(null, COPY.quality) === '', 'a manual choice needs no note: its button is pressed');
for (const c of Q.QUALITY_CHOICES) {
  check(typeof COPY.quality.choices[c] === 'string' && COPY.quality.choices[c].split(' ').length === 1, `the choice ${c} is one word`);
  check(typeof COPY.quality.titles[c] === 'string' && COPY.quality.titles[c].length < 60, `the tooltip of ${c} is under 60 characters`);
}
check(Q.tierLine({ tier: 0, choice: 'low', reasons: ['max-texture 16384'] }, COPY.quality) === COPY.quality.tierLow, 'the tier line under a chosen Low says Low was chosen, not that the device is small');

// --- 5. the maps follow a choice downward; what main.js wires -----------------------------------------
{
  const { createTextureTiers } = await import(join(JS, 'scene/texturetiers.js'));
  const idleQ = []; const pending = [];
  const tex = (url) => ({ url, disposed: 0, dispose() { this.disposed++; } });
  const earth = { ready: () => true, slots: {}, set(slot, t) { const o = this.slots[slot] || null; this.slots[slot] = t; return o; } };
  const sky = { ready: () => true, map: null, set(t) { const o = this.map; this.map = t; return o; } };
  const worlds = { ready: () => true, maps: {}, set(id, t) { const o = this.maps[id] || null; this.maps[id] = t; return o; }, px: () => 0, selected: () => null };
  const tiers = createTextureTiers({ tier: 1, month: () => 9, idle: (cb) => idleQ.push(cb), load: (url) => new Promise((resolve) => pending.push([url, resolve])), targets: { earth, sky, worlds } });
  const settle = async () => { for (let g = 0; g < 200; g++) { if (idleQ.length) { idleQ.shift()(); continue; } if (pending.length) { const [url, resolve] = pending.shift(); resolve(tex(url)); await new Promise((r) => setTimeout(r, 0)); continue; } break; } };
  tiers.start();
  for (let t = 0; t < 20000; t += 1000) tiers.tick(t);
  await settle();
  const day = earth.slots.day;
  check(day && tiers.state().applied.length > 0, 'at Medium the Earth wears its sharper day map');
  check(tiers.setTier(0) === 0 && earth.slots.day === null && sky.map === null && tiers.state().applied.length === 0 && day.disposed === 1, 'Low gives every sharper map back and frees it');
  check(tiers.latched === false, 'and that is not the latch');
  check(tiers.setTier(1) === 1, 'the choice can be raised again');
  for (let t = 20000; t < 40000; t += 1000) tiers.tick(t);
  await settle();
  check(earth.slots.day && earth.slots.day !== day, 'and the sharper map is fetched again');
  tiers.latch();
  check(tiers.setTier(2) === 0, 'after the real latch no choice raises it');
}
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/let plan = qualityPlan\(readQualityChoice\(\), \{ tier: autoTier, ceiling: pick\.ceiling \}, false\);/.test(main), 'main.js reads the stored choice before the tier is acted on');
  check(main.indexOf('let plan = qualityPlan(readQualityChoice()') < main.indexOf('const tiers = createTextureTiers({'), 'before the maps are asked for: no frame of another tier');
  check(/createTierPromoter\(\{ tier: p\.tier, ceiling: p\.promote && !autoPromoted \? pick\.ceiling : p\.tier \}\)/.test(main), 'a manual choice gets a promoter that cannot promote');
  check(/if \(ctx\.quality && ctx\.quality\.latch\(\)\) sayFellBack\(\);/.test(main) && (main.match(/sayFellBack\(\)/g) || []).length === 2, 'the fallback is said once: at the latch, or at Ultra\'s guard');
  check(/const sayFellBack = \(\) => toast\(COPY\.quality\.fellBack, \d+\);/.test(main), 'by the one toast, with the copy file\'s line');
  check(/if \(ctx\.quality && \(ctx\.quality\.stripped \|\| ctx\.quality\.ultra\)\) ctx\.applyQuality\(ctx\.quality\.plan\(\)\);/.test(main), 'a stored Low or Ultra is worn from the first frame; Auto asks nothing new of the loop');
  const panel = readFileSync(join(JS, 'ui/qualitypanel.js'), 'utf8');
  check(/q\.offered\(\)/.test(panel) && !/disabled/.test(panel), 'the row builds only what is offered: nothing is drawn disabled');
  check(/aria-pressed/.test(panel) && /b\.title = C\.titles\[choice\]/.test(panel) && /role', 'group'/.test(panel), 'pressed state, a tooltip a word, a named group');
  const wts = readFileSync(join(JS, 'ui/whattoshow.js'), 'utf8');
  check(/qualityPanel\(ctx\)/.test(wts) && /lookPanel\(ctx\.drawn\)/.test(wts), 'both rows are mounted in What to show');
  check(!/qualitypanel|lookPanel/.test(main), 'and neither is in main.js: they load with the popover');
}

if (problems.length) { console.error('quality setting FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('quality setting ok: five choices mapped to tier, removals, steps and pixel ratio; none above the device\'s ceiling; Low never promoted; the latch returns a manual choice to Auto and says so once; Ultra holds the ladder; one stored key, not in the address; the maps follow a choice down and up');
