// ui/debris.js -- debris as a problem, in numbers and on the map (public #449; the catalogue's
// own stories, public #450).
//
// Contract: createDebris(ctx, host, {onToggle}) -> { root, toggle(), open(), close(), state() }
// Also exported, pure, for tests/test_debris.mjs:
//   leadWords(census), bandRows(census) -> [{id, label, total, parts: [{kind, n, share}], aria}],
//   storyLines(stories, asOfMs) -> string[]
//
// WHY. KeepTrack has a view built for a talk: "here is the problem". We had forty famous pieces
// as faint shards, off by default. This is one tap on the home: it reads CelesTrak's whole
// catalogue (data/satcat.js, about 1.5 MB on the wire, only when asked), and says
//   - how many things are tracked in orbit, and how many of them no longer work;
//   - where they are, by height, as bars split by kind: the crowd between 600 and 1 000 km is
//     the picture of the problem;
//   - what the catalogue says this week (what went up, what came down, the oldest thing still
//     there, the biggest clouds), generated, never typed;
// and it puts every piece of debris and spent rocket on the map, coloured by kind.
//
// THE HONEST PART, in the panel's last lines and on every dot's card: the COUNT is the
// catalogue's and is exact for what radar can track. The PLACES are illustrative: each dot is on
// its object's real height and tilt, at a made-up point along that orbit, because the catalogue
// gives an orbit's shape and not where on it the thing is.
//
// It opens in place under Today, in the sidebar (docs/ui-guide.md principle 2: no new panel).

import { COPY, t, fmt, timeText } from '../copy/en.js';
import { load } from '../data/sources.js';
import { parseSatcat, decayedRows, census, stories, KINDS } from '../data/satcat.js';

const LAYER = 'debris-field';
const DAY_MS = 86400e3;
const SHOWN_KINDS = ['debris', 'rocket', 'dead', 'working'];

/** "17 461 of the 34 533 things tracked in orbit no longer work." */
export function leadWords(c) {
  const D = COPY.debris;
  if (!c || !c.total) return D.empty;
  const gone = c.kinds.debris + c.kinds.rocket + c.kinds.dead;
  return t(D.lead, { gone: fmt.int(gone), total: fmt.int(c.total) });
}

/** The bars: one row a height, its total, and each kind's share of the widest row. */
export function bandRows(c) {
  const D = COPY.debris;
  const widest = Math.max(1, ...c.bands.map((b) => b.total));
  return c.bands.filter((b) => b.total > 0).map((b) => ({
    id: b.id,
    label: D.bands[b.id] || b.id,
    total: b.total,
    parts: SHOWN_KINDS.map((kind) => ({ kind, n: b[kind], share: b[kind] / widest })),
    aria: t(D.bandAria, { band: D.bands[b.id] || b.id, total: fmt.int(b.total), debris: fmt.int(b.debris), rocket: fmt.int(b.rocket), dead: fmt.int(b.dead), working: fmt.int(b.working) }),
  }));
}

/** What the catalogue says this week, one sentence each; a sentence with nothing to say is left out. */
export function storyLines(s, asOfMs) {
  const D = COPY.debris;
  const out = [];
  if (!s) return out;
  const date = timeText.utcLong(asOfMs);
  const count = (n, one, many) => (n === 1 ? one : t(many, { n: fmt.int(n) }));
  if (s.launched && s.launched.objects > 0) {
    out.push(t(D.storyLaunched, { objects: count(s.launched.objects, D.oneObject, D.objects), launches: count(s.launched.launches, D.oneLaunch, D.launches), date }));
  }
  if (s.cameDown && s.cameDown.objects > 0) {
    const things = count(s.cameDown.objects, D.oneThing, D.things);
    out.push(s.cameDown.biggest ? t(D.storyCameDownBiggest, { things, name: s.cameDown.biggest }) : t(D.storyCameDown, { things }));
  }
  if (s.clouds && s.clouds.length) {
    const [a, b, c] = s.clouds;
    out.push(b && c
      ? t(D.storyClouds, { name: a.name, pieces: fmt.int(a.pieces), name2: b.name, pieces2: fmt.int(b.pieces), name3: c.name, pieces3: fmt.int(c.pieces) })
      : t(D.storyCloud, { name: a.name, pieces: fmt.int(a.pieces) }));
  }
  if (s.oldest) out.push(t(D.storyOldest, { name: s.oldest.name, year: String(new Date(s.oldest.launchMs).getUTCFullYear()), years: fmt.int(s.oldest.years) }));
  return out;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function createDebris(ctx, host, opts = {}) {
  const D = COPY.debris;
  const root = el('section', 'sr-debris');
  root.hidden = true;
  root.setAttribute('aria-label', D.title);
  host.appendChild(root);
  const st = { open: false, phase: 'idle', data: null, onMap: false, keyBefore: null };

  const layer = () => (ctx.layers || []).find((l) => l.id === LAYER) || null;
  const tell = (on) => document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: LAYER, on, handled: true, from: 'debris' } }));

  /** The dots on, coloured by kind; or off, and the colours as they were. */
  function setOnMap(on) {
    const l = layer();
    if (!l || typeof ctx.setLayerOn !== 'function') return;
    st.onMap = on;
    if (on) {
      // The whole Earth, from wherever the camera was; the way back is offered (ui/camundo.js).
      if (typeof ctx.rememberView === 'function') ctx.rememberView();
      if (typeof ctx.frameEarth === 'function') ctx.frameEarth();
      if (typeof ctx.offerUndo === 'function') ctx.offerUndo(D.title);
      if (typeof ctx.loadLayerNow === 'function') ctx.loadLayerNow(l);
      ctx.setLayerOn(LAYER, true);
      if (typeof ctx.colourKey === 'function' && typeof ctx.setColourKey === 'function') {
        st.keyBefore = ctx.colourKey() || null;
        ctx.setColourKey('class');
      }
    } else {
      ctx.setLayerOn(LAYER, false);
      if (st.keyBefore && typeof ctx.setColourKey === 'function') ctx.setColourKey(st.keyBefore);
    }
    tell(on);
    paint();
  }

  async function read() {
    st.phase = 'reading';
    paint();
    let result = null;
    try { result = await load('celestrak-satcat', { await: true }); } catch { result = null; }
    const body = result && typeof result.data === 'string' ? result.data : null;
    if (!body) { st.phase = 'failed'; paint(); return; }
    // The catalogue's own date: when our copy was read from CelesTrak.
    const asOfMs = Number.isFinite(result.fetchedAt) ? result.fetchedAt : ctx.clock.now();
    const rows = parseSatcat(body);
    if (!rows.length) { st.phase = 'failed'; paint(); return; }
    st.data = { asOfMs, census: census(rows), stories: stories(rows, decayedRows(body, asOfMs - 7 * DAY_MS), asOfMs) };
    st.phase = 'ready';
    paint();
  }

  function paint() {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.hidden = !st.open;
    if (!st.open) return;
    if (st.phase === 'reading') { const p = el('p', 'sr-debris__state', D.reading); p.setAttribute('role', 'status'); root.appendChild(p); return; }
    if (st.phase === 'failed') {
      root.appendChild(el('p', 'sr-debris__state', D.failed));
      const again = el('button', 'sr-more', D.retry);
      again.type = 'button';
      again.addEventListener('click', read);
      root.appendChild(again);
      return;
    }
    if (st.phase !== 'ready' || !st.data) return;
    const c = st.data.census;
    root.appendChild(el('p', 'sr-debris__lead', leadWords(c)));

    // The four numbers, in mono, each with its swatch: the legend of the bars below.
    const nums = el('dl', 'sr-debris__nums');
    for (const kind of SHOWN_KINDS) {
      const item = el('div', 'sr-debris__num');
      item.dataset.kind = kind;
      const dd = el('dd', 'sr-debris__n', fmt.int(c.kinds[kind]));
      const dt = el('dt', 'sr-debris__k');
      const sw = el('span', 'sr-debris__swatch');
      sw.setAttribute('aria-hidden', 'true');
      dt.append(sw, document.createTextNode(D.kinds[kind]));
      item.append(dd, dt);
      nums.appendChild(item);
    }
    root.appendChild(nums);

    root.appendChild(el('h3', 'sr-micro', D.bandsTitle));
    const bars = el('ul', 'sr-debris__bands');
    for (const row of bandRows(c)) {
      const li = el('li', 'sr-debris__band');
      li.title = row.aria;
      li.setAttribute('aria-label', row.aria);
      const head = el('div', 'sr-debris__bandhead');
      head.append(el('span', 'sr-debris__bandname', row.label), el('span', 'sr-debris__bandn', fmt.int(row.total)));
      const bar = el('div', 'sr-debris__bar');
      bar.setAttribute('aria-hidden', 'true');
      for (const part of row.parts) {
        if (!part.n) continue;
        const seg = el('span', 'sr-debris__seg');
        seg.dataset.kind = part.kind;
        seg.style.width = `${Math.max(0.5, part.share * 100).toFixed(2)}%`;
        bar.appendChild(seg);
      }
      li.append(head, bar);
      bars.appendChild(li);
    }
    root.appendChild(bars);

    const map = el('button', 'sr-btn sr-btn--quiet sr-debris__map', st.onMap ? D.hide : D.show);
    map.type = 'button';
    map.setAttribute('aria-pressed', st.onMap ? 'true' : 'false');
    map.title = D.showTitle;
    map.addEventListener('click', () => { setOnMap(!st.onMap); const b = root.querySelector('.sr-debris__map'); if (b) b.focus({ preventScroll: true }); });
    root.appendChild(map);
    if (st.onMap) root.appendChild(el('p', 'sr-debris__note', t(D.drawn, { n: fmt.int(c.kinds.debris + c.kinds.rocket) })));

    const lines = storyLines(st.data.stories, st.data.asOfMs);
    if (lines.length) {
      root.appendChild(el('h3', 'sr-micro', D.storiesTitle));
      const list = el('ul', 'sr-debris__stories');
      for (const line of lines) list.appendChild(el('li', 'sr-debris__story', line));
      root.appendChild(list);
    }
    root.appendChild(el('p', 'sr-debris__honesty', t(D.honesty, { date: timeText.utcLong(st.data.asOfMs) })));
  }

  function open() {
    if (st.open) return;
    st.open = true;
    if (typeof opts.onToggle === 'function') opts.onToggle(true);
    if (st.phase === 'idle' || st.phase === 'failed') read().then(() => { if (st.open && st.phase === 'ready' && !st.onMap) setOnMap(true); });
    else { paint(); if (st.phase === 'ready' && !st.onMap) setOnMap(true); }
  }
  function close() {
    if (!st.open) return;
    st.open = false;
    if (typeof opts.onToggle === 'function') opts.onToggle(false);
    if (st.onMap) setOnMap(false); else paint();
  }

  return { root, open, close, toggle: () => (st.open ? close() : open()), state: () => ({ ...st, kinds: KINDS }) };
}
