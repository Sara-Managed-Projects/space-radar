// ui/scalerail.js -- where you are on the ladder, the way back, and a word at each join (internal spec
// 0076 W3-d; internal #881 and #883, the package's SR-PLAN-080, -115 and -118).
//
// Contract: wireRail(ctx) -> the rail's handle { root, refresh(), destroy() }, built once whoever calls
// Pure, for tests/test_navigate.mjs: rungOf(stageId), railRungs(stageId), joinNote(from, to, shown),
//   noteWords(key), backWords(entry), railShown({ stageId, steps, blocked })
//
// WHERE IT LIVES. Not a panel of its own (docs/ui-guide.md principle 2): the scale badge's place at the
// top left of the scene area (§3.22), one line of glass, and the badge, on the Sun's stage, steps down
// under it. It says three things and nothing else:
//   1. BACK, when the visitor has a path to walk back (ui/camundo.js keeps it: the session only, never
//      sent). One text button; its name says where it goes ("Back to Jupiter").
//   2. THE RUNG, the place on the ladder the camera is on: the Earth, the Solar System, the nearby
//      stars, the Milky Way, the Local Group (scene/handoff.js CHAIN, registry/stages.yaml joins). All
//      five on a desktop with this one marked (aria-current), this one alone on a phone. Not buttons:
//      the Stars tab's ladder is the one place to climb from (principle 2), and this says where you are.
//   3. THE NOTE, once per join a visit, the first time the camera crosses it: the flight is sped up and
//      how far the next place really is, in the ladder's own words (registry/ladder.yaml `distance`,
//      never typed here). One line under the rail, polite to a screen reader, gone after NOTE_MS.
//
// NOT AT BOOT. Fetched by ui/cards.js with the first card and by ui/scalebadge.js on the Sun's stage
// (tests/test_boot_diet.mjs): a zoom out from the Earth enters that stage at its first join, and a join
// crossed while this module was on its way is said when it lands (scene/climb.js state.lastJoin). Its
// rules are in css/finishers.css, which comes with it. Never in a trip, a clear screen, the drift, the
// share sheet or an embed, nor on the ground.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { icon } from './icons.js';
import { CHAIN } from '../scene/handoff.js';
import { isLadderStage, isSystemStage } from '../scene/stage.js';
import { LADDER_RUNGS } from '../data/ladder.js';
import { wireTrail, goBack, trailState } from './camundo.js';

/** How long the note at a join stays, ms: a toast's four seconds and the two it takes to read a distance. */
export const NOTE_MS = 6000;
// Which rung of registry/ladder.yaml says how far each join's far side is: the Sun for the Solar System,
// the nearest star for the stars, the galaxy's centre for the Milky Way, Andromeda for the Local Group.
const NOTE_RUNG = { sun: 'sun', stellar: 'proxima', galaxy: 'galactic-centre', 'local-group': 'andromeda' };

/** The rung of the chain a stage belongs to: a world's own stage is the Solar System, a star system's the stars. Pure. */
export function rungOf(stageId) {
  if (!stageId) return null;
  if (CHAIN.includes(stageId)) return stageId;
  if (stageId === 'moon') return 'earth';
  if (isSystemStage(stageId)) return 'stellar';
  if (isLadderStage(stageId)) return null;
  return 'sun';
}

/** The five rungs with this one marked: [{ id, word, here }]. Pure. */
export function railRungs(stageId, C = COPY.r12Navigate) {
  const here = rungOf(stageId);
  return CHAIN.map((id) => ({ id, word: C.rungs[id] || id, here: id === here }));
}

/** The ladder's distance for a join's far side, as registry/ladder.yaml writes it. */
function ladderDistance(key) {
  const row = LADDER_RUNGS.find((r) => r.id === NOTE_RUNG[key]);
  return row ? row.distance : null;
}

/** The note's line for the join whose far side is `key`, or null. Pure. */
export function noteWords(key, C = COPY.r12Navigate) {
  const distance = ladderDistance(key);
  const tmpl = C.notes[key];
  return distance && tmpl ? t(tmpl, { distance }) : null;
}

/**
 * The note a move from stage `from` to stage `to` earns: its outermost join, the one whose far side is
 * the farthest place it reached or left, as { key, text }; null when it crossed none or this visit has
 * been told already. Only the outermost: a jump from the Earth to TRAPPIST-1 is about the stars, and a
 * line about the Sun's distance there would answer a question nobody asked. Pure.
 */
export function joinNote(from, to, shown = new Set()) {
  const a = CHAIN.indexOf(rungOf(from));
  const b = CHAIN.indexOf(rungOf(to));
  if (a < 0 || b < 0 || a === b) return null;
  const key = CHAIN[Math.max(a, b)];
  if (shown.has(key)) return null;
  const text = noteWords(key);
  return text ? { key, text } : null;
}

/** Back's visible word and its name: "Back", "Back to Jupiter" (or to the rung it left). Pure. */
export function backWords(entry, C = COPY.r12Navigate) {
  if (!entry) return { text: C.back, label: C.back };
  const where = entry.name || (entry.selected && entry.selected.name) || C.rungs[rungOf(entry.stage)] || '';
  const label = where ? t(C.backTo, { name: where }) : C.back;
  return { text: C.back, label };
}

/** Is there anything to say? Off the Earth's own stage, or with a path to walk back; never when blocked. Pure. */
export function railShown({ stageId, steps = 0, blocked = false } = {}) {
  if (blocked) return false;
  const rung = rungOf(stageId);
  if (!rung) return false;
  return rung !== 'earth' || steps > 0;
}

let rail = null;

function el(doc, tag, className, text) {
  const n = doc.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

/** Build the rail, once; every later call is the same rail. */
export function wireRail(ctx, opts = {}) {
  if (rail) return rail;
  if (!ctx || typeof document === 'undefined') return null;
  wireTrail(ctx);
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.r12Navigate;
  const html = doc.documentElement;

  const root = el(doc, 'div', 'sr-scalerail sr-float');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', C.label);
  root.hidden = true;
  const line = el(doc, 'div', 'sr-scalerail__line');
  const back = el(doc, 'button', 'sr-scalerail__back');
  back.type = 'button';
  back.appendChild(icon('chevron-left', 16));
  const backText = el(doc, 'span', 'sr-scalerail__backtext', C.back);
  back.appendChild(backText);
  back.hidden = true;
  line.appendChild(back);
  const list = el(doc, 'ol', 'sr-scalerail__rungs');
  list.title = C.title;
  const items = new Map();
  CHAIN.forEach((id, i) => {
    const li = el(doc, 'li', 'sr-scalerail__rung', C.rungs[id] || id);
    li.dataset.rung = id;
    if (i) {
      const sep = el(doc, 'span', 'sr-scalerail__sep', C.sep);
      sep.setAttribute('aria-hidden', 'true');
      li.insertBefore(sep, li.firstChild);
    }
    items.set(id, li);
    list.appendChild(li);
  });
  line.appendChild(list);
  root.appendChild(line);
  const note = el(doc, 'p', 'sr-scalerail__note');
  note.setAttribute('role', 'status');
  note.hidden = true;
  root.appendChild(note);
  doc.body.appendChild(root);

  let styled = false;
  let pending = null; // a join crossed before the rules landed: said once they have
  loadCss('finishers', doc).then(() => {
    styled = true;
    refresh();
    if (pending) { const p = pending; pending = null; lastStage = p.from; onStage({ detail: { worldId: p.to } }); }
  });

  const shown = new Set();
  let lastStage = ctx.stage ? ctx.stage.worldId : null;
  let noteTimer = 0;

  const blocked = () => {
    const cls = html.classList;
    return cls.contains('sr-trip-mode') || cls.contains('sr-clean') || cls.contains('sr-ambient') || cls.contains('sr-sharing')
      || cls.contains('sr-embed') || !!(ctx.skyView && ctx.skyView.active);
  };

  function place() {
    // The badge on the Sun's stage stands under the rail (css/finishers.css reads --sr-rail-h).
    const h = root.hidden ? 0 : Math.ceil(root.getBoundingClientRect().height);
    const v = h ? `${h + 8}px` : '';
    if (html.style.getPropertyValue('--sr-rail-h') !== v) {
      if (v) html.style.setProperty('--sr-rail-h', v);
      else html.style.removeProperty('--sr-rail-h');
    }
    if (html.classList.contains('sr-rail-on') === root.hidden) html.classList.toggle('sr-rail-on', !root.hidden);
  }

  function refresh() {
    const stageId = ctx.stage ? ctx.stage.worldId : null;
    const { size, top } = trailState();
    const on = styled && railShown({ stageId, steps: size, blocked: blocked() });
    if (root.hidden === on) root.hidden = !on;
    const here = rungOf(stageId);
    for (const [id, li] of items) {
      if (id === here) li.setAttribute('aria-current', 'location');
      else li.removeAttribute('aria-current');
    }
    back.hidden = size === 0;
    const words = backWords(top, C);
    if (backText.textContent !== words.text) backText.textContent = words.text;
    back.setAttribute('aria-label', words.label);
    back.title = words.label;
    place();
  }

  function say(text) {
    note.textContent = text;
    note.hidden = false;
    if (noteTimer) win.clearTimeout(noteTimer);
    noteTimer = win.setTimeout(() => { note.hidden = true; noteTimer = 0; place(); }, NOTE_MS);
    place();
  }

  function onStage(e) {
    const to = e && e.detail && e.detail.worldId ? e.detail.worldId : (ctx.stage ? ctx.stage.worldId : null);
    const from = lastStage;
    lastStage = to;
    refresh();
    if (!styled) { pending = { from: pending ? pending.from : from, to }; return; }
    // Only where the visitor can read it, and once per join a visit: told only when it was shown.
    if (root.hidden || blocked()) return;
    const n = joinNote(from, to, shown);
    if (!n) return;
    shown.add(n.key);
    say(n.text);
  }

  back.addEventListener('click', () => {
    goBack(ctx);
    refresh();
  });
  const onAny = () => refresh();
  win.addEventListener('sr:stage', onStage);
  win.addEventListener('sr:trail', onAny);
  win.addEventListener('sr:select', onAny);
  win.addEventListener('resize', onAny);
  // The classes that hide it (a trip, a clear screen, the drift, the share sheet) change without an event of their own.
  const watch = typeof MutationObserver === 'function' ? new MutationObserver(onAny) : null;
  if (watch) watch.observe(html, { attributes: true, attributeFilter: ['class', 'data-sheet'] });
  // A join crossed in the moment before this module landed (the first long zoom fetches it): said now.
  const last = ctx.climb && ctx.climb.state ? ctx.climb.state.lastJoin : null;
  // No clock on it: the badge that fetches this module is fetched by that same join, and on a slow
  // machine (a runner's software GL) the two fetches took longer than any fixed window (seen 2026-10-16).
  if (last && last.to === lastStage && last.from !== last.to) {
    lastStage = last.from;
    onStage({ detail: { worldId: last.to } });
  }
  refresh();

  rail = {
    root,
    refresh,
    destroy() {
      win.removeEventListener('sr:stage', onStage);
      win.removeEventListener('sr:trail', onAny);
      win.removeEventListener('sr:select', onAny);
      win.removeEventListener('resize', onAny);
      if (watch) watch.disconnect();
      if (noteTimer) win.clearTimeout(noteTimer);
      html.style.removeProperty('--sr-rail-h');
      html.classList.remove('sr-rail-on');
      root.remove();
      rail = null;
    },
  };
  return rail;
}
