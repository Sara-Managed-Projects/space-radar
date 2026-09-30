// tests/test_density.mjs -- Regular and Compact (spec 0045 req 10, ui/density.js).
//
// Compact is on when chosen, or when nothing is chosen and the window is 800 px tall or less; the
// choice is localStorage['sr.density'], and a storage that throws means Regular. A fake storage and
// a fake matchMedia stand in for the browser, and a fake <html> records the class.
//
//   node tests/test_density.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { createDensity, readDensity, writeDensity, isCompact, DENSITY_KEY, SHORT_QUERY } = await import(join(ROOT, 'site/js/ui/density.js'));

const store = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m };
};
const throwing = { getItem() { throw new Error('private'); }, setItem() { throw new Error('private'); }, removeItem() { throw new Error('private'); } };
const html = () => { const set = new Set(); return { classList: { toggle: (c, on) => (on ? set.add(c) : set.delete(c)), contains: (c) => set.has(c) } }; };
// A window of a given height: matchMedia answers the one query density.js asks, and can be resized.
const windowOf = (height) => {
  const listeners = new Set();
  const mq = { get matches() { return height <= 800; }, addEventListener: (_e, f) => listeners.add(f), removeEventListener: (_e, f) => listeners.delete(f) };
  return {
    matchMedia: (q) => { check(q === SHORT_QUERY, `density asks ${q}`); return mq; },
    resize: (h) => { height = h; for (const f of listeners) f(); },
    listeners,
  };
};

check(DENSITY_KEY === 'sr.density', 'the key is sr.density');
check(SHORT_QUERY === '(max-height: 800px)', 'automatic means 800 px tall or less');
check(readDensity(store()) === 'auto', 'nothing stored reads as Automatic');
check(readDensity(store({ 'sr.density': 'compact' })) === 'compact', 'a stored Compact reads back');
check(readDensity(store({ 'sr.density': 'huge' })) === 'auto', 'an unknown value reads as Automatic');
check(readDensity(throwing) === 'regular', 'a storage that throws means Regular');
check(writeDensity(throwing, 'compact') === false, 'a failed write says so and does not throw');
check(isCompact('compact', false) && !isCompact('regular', true) && isCompact('auto', true) && !isCompact('auto', false), 'the truth table');

// 1440 x 760: Compact with no choice; 1440 x 900: Regular (the task's acceptance).
{
  const root = html(); const w = windowOf(760);
  const d = createDensity({ storage: store(), root, matchMedia: w.matchMedia });
  check(d.choice() === 'auto' && root.classList.contains('sr-compact'), 'a 760 px window is Compact without a choice');
  w.resize(900);
  check(!root.classList.contains('sr-compact'), 'resized to 900 px it is Regular again');
  d.destroy();
  check(w.listeners.size === 0, 'destroy stops listening to the window');
}
{
  const root = html(); const w = windowOf(900);
  const s = store();
  const d = createDensity({ storage: s, root, matchMedia: w.matchMedia });
  check(!root.classList.contains('sr-compact'), 'a 900 px window is Regular without a choice');
  let told = null;
  d.onChange((c, on) => { told = [c, on]; });
  d.set('compact');
  check(root.classList.contains('sr-compact') && s.map.get('sr.density') === 'compact', 'choosing Compact applies it and remembers it');
  check(told && told[0] === 'compact' && told[1] === true, 'the settings row is told');
  w.resize(1200);
  check(root.classList.contains('sr-compact'), 'a chosen Compact holds in a tall window');
  d.set('auto');
  check(!s.map.has('sr.density') && !root.classList.contains('sr-compact'), 'Automatic forgets the key and follows the window');
  d.set('bogus');
  check(d.choice() === 'auto', 'an unknown choice is ignored');
}
{
  const root = html();
  const d = createDensity({ storage: throwing, root, matchMedia: windowOf(700).matchMedia });
  check(d.choice() === 'regular' && !root.classList.contains('sr-compact'), 'a storage that throws is Regular, even in a short window');
  d.set('compact');
  check(root.classList.contains('sr-compact'), 'and the choice still holds for the page');
}

// Wired: main.js creates it before the panels, What to show carries the row, the copy has its words.
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(/ctx\.density = createDensity\(\)/.test(main) && main.indexOf('ctx.density = createDensity()') < main.indexOf('createShell(ctx'), 'main.js sets the density before building the shell');
check(/densityPanel\(ctx\.density\)/.test(readFileSync(join(ROOT, 'site/js/ui/whattoshow.js'), 'utf8')), 'What to show carries the density row (spec 0061: the tool rail)');
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
check(COPY.density && ['panelTitle', 'regular', 'compact', 'auto', 'autoCompact', 'autoRegular'].every((k) => typeof COPY.density[k] === 'string'), 'the row\'s words are in copy/en.js');

if (problems.length) { console.error('density FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('density ok: Compact at 760 px with no choice and Regular at 900, a choice remembered and followed, Automatic forgets the key, a throwing storage means Regular');
