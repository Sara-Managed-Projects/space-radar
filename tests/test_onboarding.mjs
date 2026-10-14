// tests/test_onboarding.mjs -- the tour (internal spec 0074; ui/onboarding.js, ui/onboardingplan.js,
// data/onboarding.js from registry/onboarding.yaml).
//
//   1. THE STEPS AS DATA: six to nine, each sound (hooks, an awaited action, two lines the copy
//      rules and the voice can live with).
//   2. THE HOOKS, BOTH WAYS. Every hook a step names is a `data-tour` some source file sets: a
//      control that moved keeps its attribute, a control that was deleted fails here until its
//      step is. And every `data-tour` in the source is one the tour uses.
//   3. THE MACHINE: the action or Next goes on, a step with no target is passed over either way,
//      the last Next ends it, Escape, Skip and a mode end it, nothing happens to an idle tour.
//   4. THE TWO MEMORIES: the first visit's arrow once; the voice off until asked for.
//   5. THE GEOMETRY: the caption never over its target and never off the screen, at 1440 x 900 and
//      on a 360 px phone; the ring goes round the hole and closes like a pen's; the same step is
//      drawn the same way.
//   6. THE CONTROLLER on a stub document: a walk through every step by the real actions, a
//      missing target, the phone's fallback hook, the wait, Escape, a mode, the voice, the arrow, a
//      phone's sheet held where the step put it, room for the caption under What to show.
//   7. THE SEAMS: main.js, the rail, the stylesheet, the boot diet.
//
// The feature list (what is in the tour and what is deliberately not) is YAML and is held by
// tests/test_onboarding_upkeep.py.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const eq = (a, b, what) => check(JSON.stringify(a) === JSON.stringify(b), `${what}: got ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);

const P = await import(join(JS, 'ui/onboardingplan.js'));
const { STEPS, VOICE } = await import(join(JS, 'data/onboarding.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

// --- 1. the steps as data ------------------------------------------------------------------------
check(STEPS.length >= 6 && STEPS.length <= 9, `the tour has ${STEPS.length} steps; six to nine is what a newcomer sits through`);
eq([...new Set(STEPS.map((s) => s.id))].length, STEPS.length, 'no two steps share an id');
for (const step of STEPS) for (const p of P.wordsProblems(step)) check(false, p);
check(STEPS[0].look === 'scene' && STEPS[0].awaits === 'camera', 'the first step is the scene itself, and a hand on the camera is its way on');
check(STEPS[STEPS.length - 1].teaches === 'trips', 'the last step is the trips: pressing one leaves the map, so nothing can come after it');
check(P.wordsProblems({ id: 'x', hooks: ['a'], awaits: 'press', then: 'next', say: 'Is this a question?', ask: 'No.' }).some((p) => /question/.test(p)), 'a question is refused');
check(P.wordsProblems({ id: 'x', hooks: ['a'], awaits: 'press', then: 'next', say: 'It is 400 km up.', ask: 'Look.' }).length === 1, 'a digit is refused: the voice reads the words');
check(P.wordsProblems({ id: 'x', hooks: [], awaits: 'wave', then: 'stop', say: 'A.', ask: 'B.' }).length === 3, 'no hooks, an unknown action and an unknown `then` are three problems');

// --- 2. the hooks, both ways ---------------------------------------------------------------------
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (name !== 'data' && name !== 'vendor') sources(path, out); } else if (name.endsWith('.js')) out.push(path);
  }
  return out;
}
const provided = new Map(); // hook -> the files that set it
const note = (hook, file) => { if (!provided.has(hook)) provided.set(hook, []); provided.get(hook).push(file); };
for (const path of [join(ROOT, 'site/index.html'), ...sources(JS)]) {
  const text = readFileSync(path, 'utf8');
  const file = path.slice(ROOT.length + 1);
  for (const m of text.matchAll(/\.dataset\.tour\s*=\s*'([a-z][a-z0-9-]*)'/g)) note(m[1], file);
  for (const m of text.matchAll(/\bdata-tour="([a-z][a-z0-9- ]*)"/g)) for (const h of m[1].split(/\s+/)) note(h, file);
  for (const m of text.matchAll(/setAttribute\('data-tour',\s*'([a-z][a-z0-9- ]*)'\)/g)) for (const h of m[1].split(/\s+/)) note(h, file);
}
const controller = read('site/js/ui/onboarding.js');
// The first visit's arrow points at the tour's own button, or at the phone's menu that holds it.
const inviteHooks = [...new Set([...controller.matchAll(/firstShown\(\[([^\]]+)\]\)/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().replace(/'/g, ''))))];
eq(inviteHooks.sort(), ['more', 'tour'], 'the first visit\'s arrow points at the tour\'s button, else at the More menu');
const used = new Set([...STEPS.flatMap((s) => s.hooks), ...inviteHooks]);
for (const step of STEPS) {
  for (const hook of step.hooks) {
    check(provided.has(hook), `step "${step.id}" names the hook "${hook}", and no file under site/ sets data-tour="${hook}". The control was moved or deleted: put the attribute on it where it is built now, or change the step in registry/onboarding.yaml (its head says how), then python3 scripts/gen_onboarding_js.py`);
  }
}
for (const [hook, files] of provided) {
  check(used.has(hook), `${files.join(', ')} sets data-tour="${hook}", and no step of registry/onboarding.yaml uses it: write the step, or take the attribute off`);
  check(files.length === 1, `data-tour="${hook}" is set in ${files.length} files (${files.join(', ')}): one hook, one place`);
}

// --- 3. the machine ------------------------------------------------------------------------------
{
  const S = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const all = () => true;
  let s = P.reduce(P.IDLE, { type: 'start' }, S, all);
  eq([s.phase, s.index], ['step', 0], 'start shows the first step');
  eq(P.reduce(s, { type: 'start' }, S, all), s, 'start on a running tour changes nothing');
  s = P.reduce(s, { type: 'action' }, S, all);
  eq([s.phase, s.index], ['done', 0], 'the awaited action marks the step done');
  eq(P.reduce(s, { type: 'action' }, S, all), s, 'a second action changes nothing');
  s = P.reduce(s, { type: 'next' }, S, all);
  eq([s.phase, s.index], ['step', 1], 'Next goes on');
  const noC = (step) => step.id !== 'c';
  eq(P.reduce(s, { type: 'next' }, S, noC).index, 3, 'a step that cannot be shown is passed over');
  eq(P.reduce({ phase: 'step', index: 3, dir: 1 }, { type: 'back' }, S, noC).index, 1, 'and passed over going back');
  eq(P.reduce({ phase: 'step', index: 0, dir: 1 }, { type: 'back' }, S, all).index, 0, 'Back at the first step stays there');
  eq(P.reduce({ phase: 'step', index: 2, dir: 1 }, { type: 'missing' }, S, noC).index, 3, 'a step whose target is missing goes on the way the tour was going');
  eq(P.reduce({ phase: 'step', index: 2, dir: -1 }, { type: 'missing' }, S, noC).index, 1, 'backwards when it was going back');
  eq(P.reduce({ phase: 'step', index: 0, dir: -1 }, { type: 'missing' }, S, (x) => x.id !== 'a').index, 1, 'and forwards when there is nothing behind it');
  eq(P.reduce({ phase: 'step', index: 3, dir: 1 }, { type: 'next' }, S, all), { phase: 'over', index: -1, dir: 1, why: 'finished' }, 'Next on the last step ends the tour');
  eq(P.reduce({ phase: 'step', index: 3, dir: 1 }, { type: 'missing' }, S, (x) => x.id !== 'd').why, 'finished', 'a missing last step ends it too');
  eq(P.reduce(P.IDLE, { type: 'start' }, S, () => false).why, 'nothing', 'a tour with nothing to show is over before it starts');
  for (const [type, why] of [['skip', 'skipped'], ['escape', 'escaped'], ['mode', 'mode']]) {
    eq(P.reduce({ phase: 'done', index: 1, dir: 1 }, { type }, S, all).why, why, `${type} ends it`);
    eq(P.reduce(P.IDLE, { type }, S, all), P.IDLE, `${type} does nothing to an idle tour`);
  }
  eq(P.reduce(P.IDLE, { type: 'next' }, S, all), P.IDLE, 'Next does nothing to an idle tour');
  eq(P.reduce({ phase: 'over', index: -1, dir: 1, why: 'skipped' }, { type: 'start' }, S, all).index, 0, 'a tour that ended can be started again');
}

// --- 4. the two memories -------------------------------------------------------------------------
function memory(throws) {
  const m = new Map();
  return {
    getItem: (k) => { if (throws) throw new Error('no'); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (throws) throw new Error('no'); m.set(k, String(v)); },
    removeItem: (k) => { if (throws) throw new Error('no'); m.delete(k); },
    map: m,
  };
}
{
  const store = memory();
  const fresh = { target: true };
  eq(P.decideInvite(store, fresh), null, 'a first visit is pointed at the tour');
  eq(store.map.get(P.TOUR_KEY), '1', 'and that is remembered the moment it shows');
  eq(P.decideInvite(store, fresh), 'seen', 'once');
  eq(P.decideInvite(null, fresh), 'no-memory', 'a browser that keeps nothing gets no arrow: "once" could not be kept');
  eq(P.decideInvite(memory(true), fresh), 'no-memory', 'nor one whose storage throws');
  for (const [key, why] of [['deepLink', 'deep-link'], ['embed', 'embed'], ['mode', 'mode'], ['automated', 'automated'], ['running', 'running']]) {
    const s2 = memory();
    eq(P.decideInvite(s2, { target: true, [key]: true }), why, `no arrow: ${why}`);
    check(!s2.map.has(P.TOUR_KEY), `and ${why} is not remembered as seen`);
  }
  eq(P.decideInvite(memory(), {}), 'no-target', 'no arrow with no button to point at');
  eq(P.readVoice(memory()), false, 'the voice is off until the visitor turns it on');
  eq(P.readVoice(null), false, 'and off with no storage');
  const v = memory();
  P.writeVoice(v, true);
  eq(P.readVoice(v), true, 'turned on, it is remembered');
  P.writeVoice(v, false);
  eq(P.readVoice(v), false, 'and turned off again');
  check(P.INVITE_MS >= 5000 && P.INVITE_MS <= 12000, 'the arrow stays for several seconds');
}

// --- 5. the geometry -----------------------------------------------------------------------------
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const insideView = (r, view) => r.x >= P.GUTTER - 0.01 && r.y >= P.GUTTER - 0.01 && r.x + r.w <= view.w - P.GUTTER + 0.01 && r.y + r.h <= view.h - P.GUTTER + 0.01;
const numbers = (d) => (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
{
  const view = { w: 1440, h: 900 };
  eq(P.holeFor({ x: 100, y: 100, w: 48, h: 48 }, view), { x: 94, y: 94, w: 60, h: 60 }, 'the hole is the target and six pixels of air');
  eq(P.holeFor({ x: 40, y: 300, w: 320, h: 900 }, view).h, P.HEAD_MAX + 2 * P.PAD, 'a tall target is ringed at its head');
  eq(P.holeFor({ x: 0, y: 0, w: 0, h: 0 }, view), null, 'a target with no size has no hole');
  eq(P.holeFor({ x: 1500, y: 10, w: 40, h: 40 }, view), null, 'nor one off the screen');
  eq(P.holeFor(null, view), null, 'nor no target');

  // The desktop's targets, as ui.css lays them out.
  const size = { w: 320, h: 168 };
  const band = P.freeBand(view, { side: { x: 20, y: 20, w: 360, h: 860 }, pill: { x: 600, y: 780, w: 420, h: 100 } });
  eq(band, { x: 380, y: 0, w: 1060, h: 780 }, 'the free scene is right of the sidebar and above the pill');
  const desk = {
    search: [{ x: 40, y: 72, w: 320, h: 44 }, 'right'],
    tabs: [{ x: 40, y: 128, w: 320, h: 40 }, 'right'],
    'card-actions': [{ x: 40, y: 360, w: 320, h: 56 }, 'right'],
    trips: [{ x: 20, y: 420, w: 360, h: 460 }, 'right'],
    time: [{ x: 700, y: 780, w: 420, h: 100 }, 'above'],
    layers: [{ x: 1372, y: 20, w: 48, h: 48 }, 'left'],
    share: [{ x: 1372, y: 68, w: 48, h: 48 }, 'left'],
    tour: [{ x: 1372, y: 164, w: 48, h: 48 }, 'left'],
  };
  for (const [name, [rect, want]] of Object.entries(desk)) {
    const hole = P.holeFor(rect, view);
    const at = P.placeCaption(hole, view, size, band);
    const cap = { x: at.x, y: at.y, ...size };
    eq(at.side, want, `1440: the caption for ${name} goes ${want}`);
    check(!overlaps(cap, hole), `1440: the caption for ${name} is not over its target`);
    check(insideView(cap, view), `1440: the caption for ${name} is on the screen (${JSON.stringify(cap)})`);
    const ends = P.arrowEnds(cap, hole, at.side);
    check(!overlaps({ x: ends.to.x, y: ends.to.y, w: 0.1, h: 0.1 }, hole), `1440: the arrow for ${name} stops outside the hole`);
    check(Math.hypot(ends.to.x - ends.from.x, ends.to.y - ends.from.y) >= 30, `1440: the arrow for ${name} is long enough to be an arrow`);
  }
  const free = P.placeCaption(null, view, size, band);
  eq([free.side, free.x, free.y], ['free', 380 + 530 - 160, 780 - 168 - 24], 'with no target the caption sits at the foot of the free scene');
  const beside = P.freeBand(view, { side: { x: 20, y: 20, w: 360, h: 860 }, panels: [{ x: 1044, y: 20, w: 320, h: 700 }] });
  eq(beside.x + beside.w, 1044, 'an open panel on the right is not part of the free scene');
  check(P.placeCaption(null, view, size, beside).x + size.w <= 1044, 'so the waiting caption is beside What to show, not on it');

  // A 360 px phone: the top bar, the sheet at half, the pill above it.
  const phone = { w: 360, h: 740 };
  const small = { w: 328, h: 176 };
  const pband = P.freeBand(phone, { side: { x: 0, y: 385, w: 360, h: 355 }, top: { x: 16, y: 12, w: 328, h: 84 }, pill: { x: 16, y: 325, w: 328, h: 48 } });
  eq([pband.y, pband.y + pband.h], [96, 325], 'a phone\'s free scene is between the top bar and the pill');
  const hand = {
    search: { x: 16, y: 12, w: 224, h: 48 },
    layers: { x: 248, y: 12, w: 46, h: 46 },
    more: { x: 296, y: 12, w: 46, h: 46 },
    tabs: { x: 16, y: 440, w: 328, h: 44 },
    'card-actions': { x: 16, y: 520, w: 328, h: 52 },
    trips: { x: 0, y: 500, w: 360, h: 240 },
    time: { x: 16, y: 325, w: 328, h: 48 },
  };
  for (const [name, rect] of Object.entries(hand)) {
    const hole = P.holeFor(rect, phone);
    const at = P.placeCaption(hole, phone, small, pband);
    const cap = { x: at.x, y: at.y, ...small };
    check(at.side === 'above' || at.side === 'below', `360: the caption for ${name} is above or below, never beside (${at.side})`);
    check(!overlaps(cap, hole), `360: the caption for ${name} is not over its target (${JSON.stringify(cap)} / ${JSON.stringify(hole)})`);
    check(insideView(cap, phone), `360: the caption for ${name} is on the screen (${JSON.stringify(cap)})`);
  }
  // The first visit's line is small enough to fit beside the More button: on a phone it goes under it.
  const line = { w: 220, h: 44 };
  const moreHole = P.holeFor(hand.more, phone);
  const lineAt = P.placeCaption(moreHole, phone, line, pband);
  eq(lineAt.side, 'below', '360: the first visit\'s line is under the More button, not on the search field');
  check(!overlaps({ x: lineAt.x, y: lineAt.y, ...line }, P.holeFor(hand.search, phone)), '360: and clear of the search field');
  // A ring never leaves the screen: the search field is 16 px from two edges.
  const edge = numbers(P.ringPath(P.holeFor(hand.search, phone), P.seedOf('find'), phone));
  check(edge.filter((_, i) => i % 2 === 0).every((x) => x >= 0 && x <= phone.w) && edge.filter((_, i) => i % 2 === 1).every((y) => y >= 0 && y <= phone.h), '360: the ring round the search field is whole, not cut by the screen\'s edge');
  const pfree = P.placeCaption(null, phone, small, pband);
  check(insideView({ x: pfree.x, y: pfree.y, ...small }, phone), '360: the scene step\'s caption is on the screen');
  // A wider phone: the caption is 320 px and stands in the middle, wherever its target is (#757).
  const wide = { w: 390, h: 844 };
  const card = { w: 320, h: 176 };
  for (const [name, rect] of Object.entries(hand)) {
    const at = P.placeCaption(P.holeFor(rect, wide), wide, card, P.freeBand(wide, {}));
    eq(at.x, 35, `390: the caption for ${name} is in the middle`);
  }
  eq(P.placeCaption(null, wide, card, P.freeBand(wide, {})).x, 35, '390: and so is a caption with no target');
  // What to show on a phone drops from the top bar. Shortened by the caption's room while the step
  // waits (ui/onboarding.js room()), the free scene is under it, and the caption is there.
  const show = { x: 16, y: 104, w: 328, h: 380 };
  const under = P.freeBand(phone, { top: { x: 16, y: 12, w: 328, h: 84 }, panels: [show] });
  eq(under.y, 484, '360: under What to show is free');
  const waitAt = P.placeCaption(null, phone, small, under);
  check(!overlaps({ x: waitAt.x, y: waitAt.y, ...small }, show) && insideView({ x: waitAt.x, y: waitAt.y, ...small }, phone), `360: the waiting caption is under What to show, not on its rows (${waitAt.y})`);
  // A target in a phone's sheet: the caption under it when it fits, so the scene above the sheet is free.
  const tall = { w: 360, h: 780 };
  const tabsHole = P.holeFor({ x: 16, y: 455, w: 328, h: 44 }, tall);
  const inSheet = P.placeCaption(tabsHole, tall, small, P.freeBand(tall, { side: { x: 0, y: 405, w: 360, h: 375 } }), { sheet: true });
  check(inSheet.side === 'below' && !overlaps({ x: inSheet.x, y: inSheet.y, ...small }, tabsHole) && insideView({ x: inSheet.x, y: inSheet.y, ...small }, tall), `360: the four views' caption is under the tabs, over the sheet's lists (${inSheet.side} at ${inSheet.y})`);
  // On a desktop, a small target in the sidebar: the caption clears the whole column.
  const col = P.placeCaption(P.holeFor({ x: 40, y: 790, w: 104, h: 44 }, view), view, size, band, { clearRight: 380 });
  check(col.side === 'right' && col.x >= 380 + 16, `1440: the caption beside a small sidebar control clears the sidebar (${col.side} at ${col.x})`);
  check(col.y + size.h <= band.y + band.h, `1440: and stays over the time pill, not on it (bottom ${col.y + size.h}, pill at ${band.y + band.h})`);
  const deep = P.placeCaption(P.holeFor({ x: 16, y: 579, w: 328, h: 56 }, tall), tall, small, null, { sheet: true });
  eq(deep.side, 'above', '360: and above a target too low in the sheet for it to fit under');
  const shareSheet = { x: 0, y: 380, w: 360, h: 360 };
  const over = P.freeBand(phone, { top: { x: 16, y: 12, w: 328, h: 84 }, panels: [shareSheet] });
  eq([over.y, over.y + over.h], [96, 380], '360: over a sheet from the bottom (Share) is free');

  // The ink.
  const hole = P.holeFor(desk.search[0], view);
  const ring = P.ringPath(hole, P.seedOf('find'));
  eq(P.ringPath(hole, P.seedOf('find')), ring, 'the same step is drawn the same way every time');
  check(P.ringPath(hole, P.seedOf('card')) !== ring, 'and two steps are not drawn alike');
  const n = numbers(ring);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push({ x: n[i], y: n[i + 1] });
  // Every sixth number pair after the first is a point ON the curve (C x1 y1 x2 y2 x y).
  const on = [pts[0], ...pts.slice(1).filter((_, i) => i % 3 === 2)];
  const r = P.radii(hole);
  const cx = hole.x + hole.w / 2; const cy = hole.y + hole.h / 2;
  const level = (p) => Math.abs((p.x - cx) / r.a) ** r.n + Math.abs((p.y - cy) / r.b) ** r.n;
  check(on.length === 45 && on.every((p) => level(p) > 0.9 && level(p) < 1.45), 'the ring keeps to its superellipse, give or take a pen\'s wobble');
  for (const corner of [[hole.x, hole.y], [hole.x + hole.w, hole.y + hole.h]]) check(level({ x: corner[0], y: corner[1] }) <= 1.0001, 'the hole\'s corners are inside the ring');
  const first = on[0]; const last = on[on.length - 1];
  check(Math.hypot(first.x - last.x, first.y - last.y) > 12, 'the ring does not close on itself: it overlaps, as a pen does');
  check(on.every((p) => p.x > -1 && p.x < view.w + 1), 'the ring round the search field stays on the screen');
  const rail = P.holeFor(desk.tour[0], view);
  const railPts = numbers(P.ringPath(rail, P.seedOf('invite')));
  check(railPts.filter((_, i) => i % 2 === 0).every((x) => x < view.w - 1), 'the ring round a rail button stays inside the right edge');
  const arrow = P.arrowPath({ x: 900, y: 200 }, { x: 1000, y: 120 }, 7);
  const head = numbers(arrow.head);
  eq([head[2], head[3]], [1000, 120], 'the arrow\'s head has its tip on the target');
  const shaft = numbers(arrow.shaft);
  eq([shaft[0], shaft[1], shaft[4], shaft[5]], [900, 200, 1000, 120], 'the shaft runs from the caption to the tip');
  check(Math.hypot(head[0] - 1000, head[1] - 120) >= 9 && Math.hypot(head[4] - 1000, head[5] - 120) >= 9, 'and its two strokes are long enough to see');
  eq(P.clipFiles({ base: 'audio/narration/onboarding', clips: { move: 6.1 } }, 'move'), { file: 'audio/narration/onboarding/move.opus', twin: 'audio/narration/onboarding/move.m4a', seconds: 6.1 }, 'a step\'s clip is the trips\' kind of file');
  eq(P.clipFiles({ base: 'x', clips: {} }, 'move'), null, 'a step the voice has not read has no clip');
}

// --- 6. the controller on a stub document ----------------------------------------------------------
function world({ width = 1440, height = 900, voice = { base: 'audio/narration/onboarding', clips: {} }, opus = 'probably' } = {}) {
  const timers = [];
  let clock = 0;
  let nextId = 1;
  class El {
    constructor(tag) { this.tagName = String(tag).toUpperCase(); this.children = []; this.parentNode = null; this.attrs = {}; this.dataset = {}; this.style = {}; this.hidden = false; this.listeners = {}; this.rect = null; this.classes = new Set(); this.textContent = ''; this.id = ''; }
    get className() { return [...this.classes].join(' '); }
    set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
    get classList() { const c = this.classes; const self = this; return { add: (...n) => { n.forEach((x) => c.add(x)); self.changed(); }, remove: (...n) => { n.forEach((x) => c.delete(x)); self.changed(); }, toggle: (n, on) => { if (on === undefined ? !c.has(n) : on) c.add(n); else c.delete(n); self.changed(); }, contains: (n) => c.has(n) }; }
    changed() { if (this.onClass) this.onClass(); }
    setAttribute(k, v) { if (k === 'class') this.className = v; else this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    hasAttribute(k) { return k in this.attrs; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(k) { k.parentNode = this; this.children.push(k); if (k.tagName === 'LINK') (k.listeners.load || []).forEach((fn) => fn()); return k; }
    append(...kids) { kids.forEach((k) => this.appendChild(k)); }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
    get isConnected() { return doc.documentElement.contains(this); }
    closest(sel) {
      for (let x = this; x; x = x.parentNode) {
        if (sel.includes('[hidden]') && x.hidden) return x;
        if (sel.includes('[inert]') && x.hasAttribute && x.hasAttribute('inert')) return x;
        if (sel === '#sr-side' && x.id === 'sr-side') return x;
      }
      return null;
    }
    matches() { return (this.tagName === 'BUTTON' || this.tagName === 'INPUT') && !this.attrs.disabled; }
    all(out = []) { for (const k of this.children) { out.push(k); k.all(out); } return out; }
    querySelector() { return this.all().find((k) => k.matches()) || null; }
    getBoundingClientRect() { const r = this.rect || { x: 0, y: 0, w: 0, h: 0 }; return { left: r.x, top: r.y, right: r.x + r.w, bottom: r.y + r.h, width: r.w, height: r.h }; }
    get offsetWidth() { return this.size ? this.size.w : (this.rect ? this.rect.w : 0); }
    get offsetHeight() { return this.size ? this.size.h : (this.rect ? this.rect.h : 0); }
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); }
    removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
    fire(type, event = {}) { for (const fn of [...(this.listeners[type] || [])]) fn({ type, target: this, detail: 1, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...event }); }
    focus() { doc.activeElement = this; }
    scrollIntoView(o) { this.scrolled = o; if (this.onScroll) this.onScroll(); }
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((k) => k !== this); this.parentNode = null; }
  }
  const doc = {
    createElement: (tag) => { const e = new El(tag); if (tag === 'section') e.size = { w: 320, h: 168 }; if (tag === 'button') e.size = { w: 240, h: 44 }; return e; },
    createElementNS: (_ns, tag) => new El(tag),
    getElementById: (id) => doc.documentElement.all().find((e) => e.id === id) || null,
    querySelectorAll: (sel) => {
      const m = /^\[data-tour~="([a-z-]+)"\]$/.exec(sel);
      if (m) return doc.documentElement.all().filter((e) => String(e.dataset.tour || '').split(/\s+/).includes(m[1]));
      if (sel.startsWith('#sr-show')) return doc.documentElement.all().filter((e) => ['sr-show', 'sr-more'].includes(e.id) || e.classes.has('sr-share'));
      return [];
    },
    querySelector: (sel) => doc.querySelectorAll(sel)[0] || null,
    listeners: {},
    addEventListener(type, fn) { (doc.listeners[type] = doc.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { doc.listeners[type] = (doc.listeners[type] || []).filter((f) => f !== fn); },
    fire(type, event) { const e = { type, detail: 1, defaultPrevented: false, preventDefault() { e.defaultPrevented = true; }, stopPropagation() {}, ...event }; for (const fn of [...(doc.listeners[type] || [])]) fn(e); return e; },
    activeElement: null,
  };
  doc.documentElement = new El('html');
  doc.head = doc.documentElement.appendChild(new El('head'));
  doc.body = doc.documentElement.appendChild(new El('body'));
  doc.activeElement = doc.body;
  const observers = [];
  doc.documentElement.onClass = () => observers.forEach((fn) => fn());
  const audios = [];
  const win = {
    document: doc, innerWidth: width, innerHeight: height,
    setTimeout: (fn, ms) => { const id = nextId++; timers.push({ id, at: clock + (ms || 0), fn }); return id; },
    clearTimeout: (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); },
    setInterval: () => 0, clearInterval: () => {},
    getComputedStyle: (e) => ({ visibility: e.invisible ? 'hidden' : 'visible', display: 'block' }),
    matchMedia: () => ({ matches: width < 900 }),
    listeners: {},
    addEventListener(type, fn) { (win.listeners[type] = win.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { win.listeners[type] = (win.listeners[type] || []).filter((f) => f !== fn); },
    fire(type, event) { for (const fn of [...(win.listeners[type] || [])]) fn({ type, ...event }); },
    MutationObserver: class { constructor(fn) { this.fn = fn; } observe() { observers.push(this.fn); } disconnect() { const i = observers.indexOf(this.fn); if (i >= 0) observers.splice(i, 1); } },
    Audio: class { constructor() { this.src = ''; this.played = 0; this.paused = 0; audios.push(this); } canPlayType(type) { return /opus/.test(type) ? opus : 'maybe'; } play() { this.played += 1; return Promise.resolve(); } pause() { this.paused += 1; } },
    localStorage: memory(),
  };
  /** Let `ms` pass: every timer due by then runs, in order (a timer may set another). */
  const pass = async (ms) => {
    const end = clock + ms;
    for (;;) {
      await Promise.resolve();
      timers.sort((a, b) => a.at - b.at);
      if (!timers.length || timers[0].at > end) break;
      const next = timers.shift();
      clock = next.at;
      next.fn();
    }
    clock = end;
    await Promise.resolve();
  };
  /** A piece of the page with a hook and a box; `inside` puts a button in it, as the real ones have. */
  const piece = (hook, rect, { tag = 'div', parent = doc.body, id = '', inside = 'button' } = {}) => {
    const e = new El(tag);
    if (hook) e.dataset.tour = hook;
    e.rect = rect; e.id = id;
    parent.appendChild(e);
    if (inside) { const k = new El(inside); k.rect = rect; e.appendChild(k); e.kid = k; }
    return e;
  };
  const calls = [];
  let selected = null;
  let view = 'home';
  const inputs = new Set();
  const ctx = {
    cameraRig: { onUserInput: (fn) => { inputs.add(fn); return () => inputs.delete(fn); } },
    selected: () => selected,
    select: (record, o) => { selected = record; view = 'card'; calls.push(['select', record.id, o]); },
    deselect: () => { selected = null; view = 'home'; calls.push(['deselect']); },
    recordById: (id) => ({ id }),
    shell: { view: () => view, show: (v) => { view = v; calls.push(['show', v]); }, collapsed: () => false, collapse: (on) => calls.push(['collapse', on]), sheet: () => null },
    rail: { closeShow: () => calls.push(['closeShow']) },
    share: { close: () => calls.push(['shareClose']) },
  };
  return { doc, win, ctx, pass, piece, calls, audios, timers, hand: () => inputs.forEach((fn) => fn('drag')), setSelected: (r) => { selected = r; view = r ? 'card' : 'home'; }, now: () => clock, voice };
}

const { createOnboarding, MODES, SHOW_ME } = await import(join(JS, 'ui/onboarding.js'));
function page(w) {
  const side = w.piece(null, { x: 20, y: 20, w: 360, h: 860 }, { tag: 'aside', id: 'sr-side', inside: null });
  const parts = {
    side,
    search: w.piece('search', { x: 40, y: 72, w: 320, h: 44 }, { parent: side, inside: 'input' }),
    tabs: w.piece('tabs', { x: 40, y: 128, w: 320, h: 40 }, { parent: side }),
    trips: w.piece('trips', { x: 20, y: 420, w: 360, h: 460 }, { parent: side }),
    card: w.piece('card', { x: 20, y: 60, w: 360, h: 820 }, { parent: side, inside: null }),
    time: w.piece('time', { x: 700, y: 780, w: 420, h: 100 }, { id: 'sr-time' }),
    layers: w.piece('layers', { x: 1372, y: 20, w: 48, h: 48 }, { tag: 'button', inside: null }),
    share: w.piece('share', { x: 1372, y: 68, w: 48, h: 48 }, { tag: 'button', inside: null }),
    more: w.piece('more', { x: 0, y: 0, w: 0, h: 0 }, { tag: 'button', inside: null }),
    tour: w.piece('tour', { x: 1372, y: 164, w: 48, h: 48 }, { tag: 'button', inside: null }),
  };
  parts.actions = w.piece('card-actions', { x: 40, y: 360, w: 320, h: 56 }, { parent: parts.card });
  parts.drift = w.piece('drift', { x: 40, y: 820, w: 320, h: 44 }, { tag: 'button', parent: parts.trips, inside: null });
  parts.card.hidden = true;
  return parts;
}
const make = (w, opts = {}) => createOnboarding(w.ctx, { win: w.win, storage: w.win.localStorage, now: w.now, voice: w.voice, ...opts });
const rootOf = (w) => w.doc.body.children.find((e) => e.classes.has('sr-tour'));
const part = (w, cls) => rootOf(w).all().find((e) => e.classes.has(cls));
const press = (w, el) => w.doc.fire('pointerdown', { target: el });

{
  // THE WHOLE WALK, by the real actions, on a desktop.
  const w = world();
  globalThis.document = w.doc;
  const parts = page(w);
  const tour = make(w);
  await tour.start('rail');
  await w.pass(0);
  const root = rootOf(w);
  check(!!root && root.hidden === false, 'started, the tour is on the page');
  eq(tour.step().id, 'move', 'it begins with the scene');
  eq(parts.tour.getAttribute('aria-pressed'), 'true', 'the rail\'s button says the tour is on');
  check(part(w, 'sr-tour__hole').hidden === true, 'the scene step has no scrim: the scene is not tinted');
  check(part(w, 'sr-tour__ink').style.display !== 'none', 'and it has its arrow');
  check(root.classes.has('is-drawn'), 'the ink is drawn on');
  eq(part(w, 'sr-tour__count').textContent, `1 / ${STEPS.length}`, 'the count says where the visitor is');
  eq(part(w, 'sr-tour__say').textContent, STEPS[0].say, 'the caption says the step\'s sentence');
  eq(part(w, 'sr-tour__ask').textContent, STEPS[0].ask, 'and asks for its one thing');
  check(part(w, 'sr-tour__words').getAttribute('aria-live') === 'polite', 'the words are a polite live region');
  check(part(w, 'sr-tour__voice').hidden === true, 'with no clips there is no Voice button');
  eq(w.audios.length, 0, 'and nothing audible was made');
  eq(w.win.localStorage.map.get(P.TOUR_KEY), '1', 'a tour that was started is a tour that was seen: no arrow later');

  w.hand();
  eq(tour.state().phase, 'done', 'a hand on the camera is step one done');
  await w.pass(P.BEAT_MS - 1);
  eq(tour.step().id, 'move', 'it waits a beat, so the visitor sees it worked');
  await w.pass(2);
  eq(tour.step().id, 'find', 'and goes on by itself');
  const hole = part(w, 'sr-tour__hole');
  check(hole.hidden === false && hole.style.left === '34px' && hole.style.top === '66px' && hole.style.width === '332px', 'the search field is ringed, with its air');
  check(w.doc.activeElement === parts.search.kid, 'focus goes to the control being taught');
  eq(parts.search.kid.getAttribute('aria-describedby'), 'sr-tour-say sr-tour-ask', 'which is described by the caption');

  w.setSelected({ id: 'sat-1' });
  parts.card.hidden = false; parts.search.hidden = true; parts.tabs.hidden = true; parts.trips.hidden = true;
  w.win.fire('sr:select', { detail: null });
  eq(tour.state().phase, 'step', 'a selection put down is not a thing chosen');
  w.win.fire('sr:select', { detail: { id: 'sat-1' } });
  parts.card.hidden = true; parts.search.hidden = false;
  w.win.fire('resize');
  check(tour.state().phase === 'done' && part(w, 'sr-tour__hole').hidden === false, 'during the beat the ring stays where it is: the caption does not jump');
  parts.card.hidden = false; parts.search.hidden = true;
  await w.pass(P.BEAT_MS + 1);
  eq(tour.step().id, 'card', 'a thing chosen leads to its card');
  check(parts.search.kid.getAttribute('aria-describedby') === null, 'the last control is no longer described by the caption');
  check(!w.calls.some((c) => c[0] === 'select'), 'the visitor chose something, so the tour selects nothing');
  eq(part(w, 'sr-tour__hole').style.top, '354px', 'the card\'s actions are ringed, not the whole card');

  press(w, parts.time.kid);
  eq(tour.state().phase, 'step', 'a press somewhere else is not the step\'s action');
  press(w, parts.actions.kid);
  await w.pass(P.BEAT_MS + 1);
  eq(tour.step().id, 'time', 'a press on an action leads to the clock');

  press(w, parts.time.kid);
  eq([tour.step().id, tour.state().phase], ['time', 'done'], 'the clock\'s step is done and stays: there is a timeline to look at');
  await w.pass(P.BEAT_MS * 3);
  eq(tour.step().id, 'time', 'it does not go on by itself');
  check(part(w, 'sr-tour__hole').hidden === true && part(w, 'sr-tour__ink').style.display === 'none', 'the ring and the scrim are gone, so what opened is not dimmed');
  eq(part(w, 'sr-tour__ask').textContent, COPY.tour.waited, 'the caption says to look and go on');

  // Next: the home is shown again for the tabs.
  w.ctx.deselect = () => { w.calls.push(['deselect']); w.setSelected(null); parts.card.hidden = true; parts.search.hidden = false; parts.tabs.hidden = false; parts.trips.hidden = false; };
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  eq(tour.step().id, 'places', 'Next goes to the four views');
  check(w.calls.some((c) => c[0] === 'deselect'), 'and the tour put the selection down to show the home');
  parts.tabs.kid.fire('x');
  w.doc.fire('click', { target: parts.tabs.kid, detail: 0 });
  await w.pass(P.BEAT_MS + 1);
  eq(tour.step().id, 'layers', 'a keyboard\'s press on a tab counts, and leads to What to show');

  press(w, parts.layers);
  eq(tour.state().phase, 'done', 'What to show opened: the step waits');
  const before = w.calls.length;
  w.doc.fire('keydown', { key: 'n' });
  await w.pass(0);
  eq(tour.step().id, 'share', 'N is Next');
  check(w.calls.slice(before).some((c) => c[0] === 'closeShow'), 'going on closes What to show');
  eq(part(w, 'sr-tour__hole').style.top, '62px', 'Share is ringed on a desktop');

  press(w, parts.share);
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  eq(tour.step().id, 'drift', 'then Play on its own, where the drift is');
  eq(part(w, 'sr-tour__hole').style.top, '814px', 'its button is ringed');
  const list = w.piece(null, { x: 40, y: 870, w: 320, h: 200 }, { parent: parts.trips, id: 'sr-reels-earth', inside: null });
  parts.drift.setAttribute('aria-controls', 'sr-reels-earth');
  press(w, parts.drift);
  eq(tour.state().phase, 'done', 'the list opened: the step waits, the drift has not started');
  await w.pass(600);
  eq(list.scrolled, { block: 'nearest' }, 'and the list it opened is brought into the sidebar\'s view');
  check(tour.isOn() && part(w, 'sr-tour__hole').hidden === true, 'and the ring is gone so the list is not dimmed');
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  eq(tour.step().id, 'trips', 'the last step is the trips');
  eq(parts.trips.scrolled, { block: 'start' }, 'a tall target is brought into the sidebar\'s view by its head');
  eq(part(w, 'sr-tour__next').textContent, COPY.tour.done, 'and its Next says Done');
  eq(part(w, 'sr-tour__hole').style.height, `${P.HEAD_MAX + 2 * P.PAD}px`, 'the tall Trips section is ringed at its head');
  press(w, parts.trips.kid);
  w.doc.documentElement.classList.add('sr-trip-mode');
  eq([tour.isOn(), tour.state().why], [false, 'mode'], 'a trip starting ends the tour');
  check(rootOf(w).hidden === true, 'and takes it off the page');
  eq(parts.tour.getAttribute('aria-pressed'), 'false', 'the rail\'s button is not pressed any more');
  await w.pass(P.BEAT_MS * 2);
  check(tour.isOn() === false, 'a beat that was pending does nothing to a tour that ended');
  check(!(w.doc.listeners.keydown || []).length && !(w.doc.listeners.pointerdown || []).length, 'no listener is left behind');
}

{
  // A MISSING TARGET, THE STATION FOR A VISITOR WHO ONLY PRESSES NEXT, ESCAPE.
  const w = world();
  globalThis.document = w.doc;
  const parts = page(w);
  parts.time.remove();
  const tour = make(w);
  await tour.start();
  await w.pass(0);
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  eq(tour.step().id, 'find', 'Next works without the action');
  w.ctx.select = (record, o) => { w.calls.push(['select', record.id, o]); w.win.setTimeout(() => { w.setSelected(record); parts.card.hidden = false; }, 400); };
  part(w, 'sr-tour__next').fire('click');
  await w.pass(100);
  check(part(w, 'sr-tour__card').hidden === true, 'while a step waits for its target nothing is drawn');
  eq(w.calls.filter((c) => c[0] === 'select').map((c) => c[1]), [SHOW_ME], 'with nothing selected the card step selects the station');
  await w.pass(600);
  eq(tour.step().id, 'card', 'and the card step comes up when the card has');
  part(w, 'sr-tour__next').fire('click');
  await w.pass(P.WAIT_TARGET_MS - 500);
  check(tour.step().id === 'time' && part(w, 'sr-tour__card').hidden === true, 'a step whose target is not there waits for it');
  await w.pass(700);
  eq(tour.step().id, 'places', 'then it is passed over: never an overlay that points at nothing');
  w.doc.activeElement = { tagName: 'INPUT' };
  const typed = w.doc.fire('keydown', { key: 'Escape' });
  check(tour.isOn() && !typed.defaultPrevented, 'Escape in a text field is the field\'s');
  w.doc.fire('keydown', { key: 'n' });
  eq(tour.step().id, 'places', 'and N typed into a field is a letter');
  w.doc.activeElement = w.doc.body;
  const esc = w.doc.fire('keydown', { key: 'Escape' });
  eq([tour.isOn(), tour.state().why, esc.defaultPrevented], [false, 'escaped', true], 'Escape ends the tour and is taken, so the card under it stays');
  check(w.doc.activeElement === parts.tour, 'focus returns to the rail\'s button');
  await tour.toggle();
  await w.pass(0);
  eq(tour.step().id, 'move', 'a tour that ended starts again from the top');
  await tour.toggle();
  check(!tour.isOn(), 'and the rail\'s button, pressed again, ends it');
}

{
  // A PHONE: Share is in the More menu; a mode ends the tour; the lost target.
  const w = world({ width: 390, height: 844 });
  globalThis.document = w.doc;
  const parts = page(w);
  parts.share.rect = { x: 0, y: 0, w: 0, h: 0 };
  parts.more.rect = { x: 328, y: 12, w: 46, h: 46 };
  parts.layers.rect = { x: 280, y: 12, w: 46, h: 46 };
  const short = STEPS.filter((s) => ['layers', 'share'].includes(s.id));
  const tour = make(w, { steps: short });
  await tour.start();
  await w.pass(0);
  eq(part(w, 'sr-tour__hole').style.left, '274px', 'What to show is ringed where a phone has it');
  parts.layers.invisible = true;
  w.win.fire('resize');
  check(part(w, 'sr-tour__hole').hidden === true && part(w, 'sr-tour__card').hidden === false, 'a target that goes away takes the ring with it, and the caption stays');
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  eq([tour.step().id, part(w, 'sr-tour__hole').style.left], ['share', '322px'], 'on a phone the share step rings the More menu');
  // The clock on a phone: its pill is hidden behind a card, so the card is put down and the sheet lowered.
  {
    const w4 = world({ width: 390, height: 844 });
    globalThis.document = w4.doc;
    page(w4);
    w4.setSelected({ id: 'sat-1' });
    let detent = 'full';
    w4.ctx.shell.sheet = () => ({ detent: () => detent, set: (d) => { detent = d; w4.calls.push(['sheet', d]); } });
    const t4 = make(w4, { steps: STEPS.filter((s) => s.id === 'time') });
    await t4.start();
    await w4.pass(0);
    check(w4.calls.some((c) => c[0] === 'deselect') && detent === 'peek' && t4.step().id === 'time', 'on a phone the clock\'s step puts the card down and lowers the sheet');
    const w5 = world();
    globalThis.document = w5.doc;
    page(w5);
    w5.setSelected({ id: 'sat-1' });
    const t5 = make(w5, { steps: STEPS.filter((s) => s.id === 'time') });
    await t5.start();
    await w5.pass(0);
    check(!w5.calls.some((c) => c[0] === 'deselect'), 'on a desktop the card stays for the clock\'s step');
  }
  // A phone's sheet rises to what takes focus (ui/sheet.js); the tour's own focus must not raise
  // it over the scene (#757: the tabs' and the trips' steps).
  {
    const w6 = world({ width: 360, height: 780 });
    globalThis.document = w6.doc;
    const p6 = page(w6);
    let detent = 'peek';
    w6.ctx.shell.sheet = () => ({ detent: () => detent, set: (d) => { detent = d; w6.calls.push(['sheet', d]); } });
    p6.tabs.kid.focus = () => { w6.doc.activeElement = p6.tabs.kid; detent = 'full'; };
    const t6 = make(w6, { steps: STEPS.filter((s) => s.id === 'places') });
    await t6.start();
    await w6.pass(0);
    check(w6.doc.activeElement === p6.tabs.kid, 'on a phone focus still goes to the tabs');
    eq(detent, 'half', 'and the sheet stays at half, as the step put it: the scene is not covered');
  }
  // What to show on a phone, open and waiting: it is given room for the caption under it.
  {
    const w7 = world({ width: 360, height: 780 });
    globalThis.document = w7.doc;
    const p7 = page(w7);
    p7.layers.rect = { x: 248, y: 12, w: 46, h: 46 };
    const props = new Map();
    w7.doc.documentElement.style.setProperty = (k, v) => props.set(k, v);
    w7.doc.documentElement.style.removeProperty = (k) => props.delete(k);
    const t7 = make(w7, { steps: STEPS.filter((s) => s.id === 'layers' || s.id === 'share') });
    await t7.start();
    await w7.pass(0);
    eq(t7.step().id, 'layers', 'the layers step on a phone');
    check(!w7.doc.documentElement.classes.has('sr-tour-room'), 'before the press nothing is shortened');
    w7.piece(null, { x: 16, y: 104, w: 328, h: 652 }, { id: 'sr-show', inside: null });
    press(w7, p7.layers);
    check(w7.doc.documentElement.classes.has('sr-tour-room') && /^\d+px$/.test(props.get('--sr-tour-room') || ''), `waiting with What to show open, it is shortened by the caption's room (${props.get('--sr-tour-room')})`);
    const capTop = parseInt(part(w7, 'sr-tour__card').style.top, 10);
    check(capTop + 168 <= 780 - 16 && 780 - 24 - parseInt(props.get('--sr-tour-room'), 10) <= capTop - 8, `and the caption (top ${capTop}) is under where the panel now ends`);
    part(w7, 'sr-tour__next').fire('click');
    await w7.pass(0);
    check(!w7.doc.documentElement.classes.has('sr-tour-room') && !props.has('--sr-tour-room'), 'going on gives What to show its height back');
  }
  for (const mode of MODES) {
    const w2 = world();
    globalThis.document = w2.doc;
    page(w2);
    const t2 = make(w2);
    await t2.start();
    await w2.pass(0);
    w2.doc.documentElement.classList.add(mode);
    eq(t2.state().why, 'mode', `${mode} ends the tour`);
    await t2.start();
    check(!t2.isOn(), `and it does not start while ${mode} is on`);
  }
}

{
  // A TARGET SCROLLED OUT OF THE SIDEBAR'S VIEW is brought in, not passed over.
  const w = world();
  globalThis.document = w.doc;
  const parts = page(w);
  parts.trips.rect = { x: 20, y: 1400, w: 360, h: 460 };
  parts.trips.kid.rect = parts.trips.rect;
  parts.trips.onScroll = () => { parts.trips.rect = { x: 20, y: 180, w: 360, h: 460 }; };
  const tour = make(w, { steps: STEPS.filter((s) => s.id === 'trips') });
  await tour.start();
  await w.pass(0);
  check(tour.isOn() && tour.step().id === 'trips' && part(w, 'sr-tour__hole').style.top === '174px', 'the Trips section under the fold is scrolled into view and ringed');
}

{
  // THE VOICE: nothing before the press; the Opus, or its twin where Opus cannot play.
  const clips = { base: 'audio/narration/onboarding', clips: Object.fromEntries(STEPS.map((s) => [s.id, 6])) };
  const w = world({ voice: clips });
  globalThis.document = w.doc;
  page(w);
  const tour = make(w);
  await tour.start();
  await w.pass(0);
  check(part(w, 'sr-tour__voice').hidden === false && part(w, 'sr-tour__voice').getAttribute('aria-pressed') === 'false', 'with clips there is a Voice button, off');
  eq(w.audios.length, 0, 'no clip is asked for before the visitor turns the voice on');
  part(w, 'sr-tour__voice').fire('click');
  check(tour.voiceOn() && w.audios.length === 1 && /\/audio\/narration\/onboarding\/move\.opus$/.test(w.audios[0].src) && w.audios[0].played === 1, `turned on, the step is read (${w.audios[0] && w.audios[0].src})`);
  check(/site\/audio\/narration\/onboarding\/move\.opus$/.test(new URL(w.audios[0].src).pathname), 'from the site\'s own audio folder');
  eq(w.win.localStorage.map.get(P.VOICE_KEY), '1', 'and the choice is remembered');
  part(w, 'sr-tour__next').fire('click');
  await w.pass(0);
  check(/find\.opus$/.test(w.audios[0].src) && w.audios[0].paused >= 1, 'the next step stops the last clip and reads its own');
  part(w, 'sr-tour__voice').fire('click');
  check(!tour.voiceOn() && !w.win.localStorage.map.has(P.VOICE_KEY), 'turned off, it is silent and forgotten');
  const w3 = world({ voice: clips, opus: '' });
  globalThis.document = w3.doc;
  page(w3);
  w3.win.localStorage.setItem(P.VOICE_KEY, '1');
  const t3 = make(w3);
  await t3.start();
  await w3.pass(0);
  check(w3.audios.length === 1 && /move\.m4a$/.test(w3.audios[0].src), 'a browser that cannot play Opus gets the AAC twin, and a remembered voice speaks from the first step');
}

{
  // THE FIRST VISIT'S ARROW.
  const w = world();
  globalThis.document = w.doc;
  const parts = page(w);
  const tour = make(w);
  eq(tour.maybeInvite(), null, 'a first visit is pointed at the button');
  await w.pass(0);
  const root = rootOf(w);
  check(root.hidden === false && root.classes.has('is-invite') && tour.isInviting(), 'the arrow is up');
  check(part(w, 'sr-tour__hole').hidden === true, 'with no scrim');
  check(part(w, 'sr-tour__card').hidden === true, 'and no caption: the tour has not started');
  check(!tour.isOn(), 'the tour never starts by itself');
  const chip = part(w, 'sr-tour__invite');
  eq(chip.textContent, COPY.tour.invite, 'one line');
  check(parseInt(chip.style.left, 10) + 240 < 1372, 'to the left of the rail');
  check(w.doc.activeElement === w.doc.body, 'it takes no focus');
  await w.pass(P.INVITE_MS - 10);
  check(tour.isInviting(), 'it stays for its seconds');
  await w.pass(20);
  check(!tour.isInviting() && root.hidden === true, 'and then leaves');
  eq(tour.maybeInvite(), 'seen', 'once');
  await tour.invite();
  await w.pass(0);
  part(w, 'sr-tour__invite').fire('click');
  await w.pass(0);
  check(tour.isOn() && !tour.isInviting() && part(w, 'sr-tour__invite').hidden === true, 'the line is a button: it starts the tour and goes');
  tour.stop();
  const w2 = world();
  globalThis.document = w2.doc;
  page(w2);
  eq(make(w2, { automated: true }).maybeInvite(), 'automated', 'no arrow for an automated browser');
  eq(make(w2, { deepLink: true }).maybeInvite(), 'deep-link', 'nor for a link to somewhere');
  eq(make(w2, { storage: null }).maybeInvite(), 'no-memory', 'nor where nothing is remembered');
  check(!rootOf(w2), 'and none of them built anything');
  void parts;
}

// --- 7. the seams ----------------------------------------------------------------------------------
{
  const main = read('site/js/main.js');
  check(/import\('\.\/ui\/onboarding\.js'\)/.test(main), 'main.js fetches the tour with a dynamic import');
  check(!/^import [^\n]*onboarding/m.test(main), 'and never with a static one');
  check(/ctx\.wantOnboarding = /.test(main) && /api\.toggle\(from\)/.test(main), 'ctx.wantOnboarding starts it, or ends one that is running');
  check(/afterFirstVisit\(TOUR_MS/.test(main) && /getItem\('sr:tour'\)/.test(main), 'the first visit\'s arrow waits for the first visit to be over, and a returning visitor does not fetch the module');
  check(/const TOUR_MS = (\d+);/.test(main) && Number(/const TOUR_MS = (\d+);/.exec(main)[1]) >= 6000, 'the arrow comes after the welcome and the keys hint');
  check(/sr:opening-end/.test(main.slice(main.indexOf('const tourLater'), main.indexOf('const tourLater') + 700)), 'never over the opening shot');
  const rail = read('site/js/ui/rail.js');
  check(/'sr-rail__btn sr-rail__btn--tour'/.test(rail) && /tourBtn\.dataset\.tour = 'tour'/.test(rail), 'the rail has the tour\'s button, with its hook');
  check(/ctx\.wantOnboarding\('rail'\)/.test(rail), 'which asks main.js for the tour');
  check(rail.indexOf('sr-rail__btn--tour') < rail.indexOf('createGitHubMark(root'), 'the tools come before the link out: the tour\'s button is before the GitHub mark');
  check(/menuRow\('button', icon\(TOUR_PATH\), COPY\.rail\.menuTour/.test(rail), 'and on a phone it is a row of the More menu');
  check(typeof COPY.rail.tour === 'string' && COPY.rail.tour.split(' ').length <= 3, 'the button has a name');
  const ui = read('site/css/ui.css');
  check(/html\.sr-phone \.sr-rail__btn--tour,/.test(ui), 'ui.css folds the tour\'s button away on a phone, with Share and Hide');
  const css = read('site/css/onboarding.css');
  const rule = (sel) => { const i = css.indexOf(`\n${sel} {`); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  check(/pointer-events: none/.test(rule('.sr-tour')), 'the tour\'s layer takes no pointer event: nothing is blocked');
  check(/pointer-events: auto/.test(css.slice(css.indexOf('.sr-tour__card,'), css.indexOf('.sr-tour__card,') + 200)), 'only the caption and the first visit\'s line do');
  check(/color-mix\(in srgb, var\(--sr-space\) 45%, transparent\)/.test(rule('.sr-tour__hole')), 'the scrim is the ground colour at 45 %');
  check(/stroke: var\(--sr-ember\)/.test(rule('.sr-tour__line')) && /stroke: var\(--sr-space\)/.test(rule('.sr-tour__halo')), 'the ink is ember with the halo ember wears over the scene');
  check(!/@keyframes/.test(css) && !/infinite/.test(css), 'nothing loops: the ink is drawn on once');
  check(/prefers-reduced-motion: reduce/.test(css) && /transition: none/.test(css.slice(css.indexOf('prefers-reduced-motion'))), 'reduced motion: the ink is there at once');
  check(/min-height: 44px/.test(css), 'every target in the caption is 44 px');
  check(!/font-family|@font-face/.test(css), 'no face of its own: the hand is in the ink');
  check(/await loadCss\('onboarding', doc\)/.test(controller), 'the stylesheet comes with the module, and nothing is drawn unstyled');
  check(VOICE && typeof VOICE.base === 'string' && typeof VOICE.clips === 'object', 'the mirror says which steps have a voice');
  for (const id of Object.keys(VOICE.clips)) check(STEPS.some((s) => s.id === id), `the voice has a clip for "${id}", which is not a step`);
}

if (problems.length) { console.error('the tour FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`the tour ok: ${STEPS.length} steps (${STEPS.map((s) => s.id).join(', ')}), every hook provided by one source file and used; the machine, the two memories, the geometry at 1440 and 360, the controller on a stub page, the seams; ${Object.keys(VOICE.clips).length} steps have a voice`);
