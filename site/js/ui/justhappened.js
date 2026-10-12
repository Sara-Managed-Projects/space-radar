// ui/justhappened.js -- "Just happened": the launches and re-entries of the last seven days, at
// the top of the Next list (spec 0050 requirements 5 and 6, internal #134).
//
// Asked for by a press, never at boot: ui/next.js imports this file when its row is first opened.
// Launches are Launch Library 2's previous launches from our saved copy (`ll2-previous`, read by
// the harvester every 6 h; a visitor's browser never calls the publisher). Re-entries are the
// catalogue's decay dates (data/satcat.js decayedRows), read only when the visitor asks for them:
// the catalogue is about 1.5 MB.
//
// WORDS FOR THE PAST (requirement 6). "Came down on 25 September (catalogue decay date)": the
// catalogue records a day, not a place, so nothing here says where, and nothing draws a fireball.
// A launch that failed is listed with what happened in plain words, not hidden.
//
//   buildJustHappened(decays, launches, nowMs, days = 7) -> { items, debrisCount }   pure
//   parsePrevious(body) -> launches                                                 pure
//   mountJustHappened(box, ctx) -> { refresh }

import { COPY, t, fmt, timeText, ageInWords } from '../copy/en.js';
import '../copy/en.later.js';
import { load } from '../data/sources.js';

const DAY = 864e5;
export const JUST_DAYS = 7;
export const JUST_ROWS = 3;
const STALE_MS = 48 * 3600e3;

/** LL2's status ids, as the three things a reader needs: 3 success, 4 failure, 7 partial failure. */
function outcome(status) {
  const id = status && status.id;
  if (id === 3) return 'reached';
  if (id === 4) return 'failed';
  if (id === 7) return 'partial';
  return null;
}

/** LL2's previous launches as rows: { id, name, netMs, outcome, statusName, padId, place }. */
export function parsePrevious(body) {
  const list = body && Array.isArray(body.results) ? body.results : [];
  const out = [];
  for (const r of list) {
    const netMs = r && Date.parse(r.net);
    if (!r || !r.name || !Number.isFinite(netMs)) continue;
    const pad = r.pad || {};
    out.push({
      id: String(r.id || r.name),
      name: String(r.name),
      netMs,
      outcome: outcome(r.status),
      statusName: r.status && r.status.name ? String(r.status.name) : '',
      padId: pad.id != null ? `pad-ll2-${pad.id}` : null,
      place: pad.location && pad.location.name ? String(pad.location.name) : (pad.name ? String(pad.name) : ''),
    });
  }
  return out;
}

/**
 * The last `days` days, newest first. Launches all; of what came down, payloads and rocket bodies
 * are listed and debris is only counted.
 */
export function buildJustHappened(decays, launches, nowMs, days = JUST_DAYS) {
  const since = nowMs - days * DAY;
  const L = (launches || []).filter((l) => l.netMs >= since && l.netMs <= nowMs);
  const D = (decays || []).filter((d) => d.decayMs >= since && d.decayMs <= nowMs);
  const listed = D.filter((d) => d.kind !== 'debris' && d.kind !== 'other');
  const items = [
    ...L.map((l) => ({ kind: 'launch', tMs: l.netMs, launch: l })),
    ...listed.map((d) => ({ kind: 'decay', tMs: d.decayMs, decay: d })),
  ].sort((a, b) => b.tMs - a.tMs);
  return { items, debrisCount: D.filter((d) => d.kind === 'debris').length };
}

/** A row's two lines. Pure; exported for tests/test_next.mjs. */
export function justRow(item, nowMs) {
  const H = COPY.happened7;
  if (item.kind === 'launch') {
    const l = item.launch;
    const status = l.outcome ? H[l.outcome] : l.statusName;
    const from = l.place ? t(H.launchesFrom, { place: l.place }) : '';
    // Launch Library names a launch "rocket | payload": the payload is the row, the rocket its detail.
    const cut = l.name.indexOf(' | ');
    const rocket = cut > 0 ? l.name.slice(0, cut) : '';
    return {
      title: cut > 0 ? l.name.slice(cut + 3) : l.name,
      value: ageInWords(nowMs - l.netMs),
      detail: rocket && status ? t(from ? H.launchDetail : H.launchDetailNoPlace, { rocket, status, from }) : [rocket, status, from].filter(Boolean).join(COPY.punctuation.listJoin),
    };
  }
  const d = item.decay;
  // A decay date is a day, not an instant: the row says the day and nothing finer.
  return { title: d.name, value: '', detail: t(H.cameDown, { date: timeText.utcLong(d.decayMs) }) };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function mountJustHappened(box, ctx) {
  const H = COPY.happened7;
  const st = { launches: null, fetchedAt: null, decays: null, decaysState: 'idle', expanded: false, read: false };
  const wallNow = () => Date.now();

  function paint() {
    while (box.firstChild) box.removeChild(box.firstChild);
    if (!st.read) { const p = el('p', 'sr-next__note', H.waiting); p.setAttribute('role', 'status'); box.appendChild(p); return; }
    const now = wallNow();
    const built = buildJustHappened(st.decays, st.launches, now);
    const shown = st.expanded ? built.items : built.items.slice(0, JUST_ROWS);
    if (!built.items.length) box.appendChild(el('p', 'sr-next__note', H.none));
    const list = el('ul', 'sr-next__list');
    for (const item of shown) {
      const row = justRow(item, now);
      const li = el('li', 'sr-next__row');
      li.dataset.kind = item.kind === 'launch' ? 'launch' : 'reentry';
      const pad = item.kind === 'launch' && item.launch.padId && typeof ctx.recordById === 'function' ? ctx.recordById(item.launch.padId) : null;
      const body = pad ? el('button', 'sr-next__body') : el('div', 'sr-next__body');
      if (pad) {
        body.type = 'button';
        body.title = H.flyTitle;
        body.addEventListener('click', () => { if (typeof ctx.select === 'function') ctx.select(pad); });
      } else { body.setAttribute('role', 'note'); body.title = row.detail; }
      const head = el('span', 'sr-next__head');
      head.appendChild(el('span', 'sr-next__title', row.title));
      if (row.value) head.appendChild(el('span', 'sr-next__value', row.value));
      body.append(head, el('span', 'sr-next__detail', row.detail));
      li.appendChild(body);
      list.appendChild(li);
    }
    if (shown.length) box.appendChild(list);
    if (built.debrisCount > 0) box.appendChild(el('p', 'sr-next__note', built.debrisCount === 1 ? H.debrisOne : t(H.debris, { n: fmt.int(built.debrisCount) })));
    const acts = el('div', 'sr-next__pastacts');
    if (built.items.length > JUST_ROWS) {
      const more = el('button', 'sr-more', st.expanded ? H.showFewer : t(H.showAll, { n: fmt.int(built.items.length) }));
      more.type = 'button';
      more.setAttribute('aria-expanded', st.expanded ? 'true' : 'false');
      more.addEventListener('click', () => { st.expanded = !st.expanded; paint(); });
      acts.appendChild(more);
    }
    // What came down, when asked: the whole catalogue is read for it.
    if (st.decaysState !== 'ready') {
      const b = el('button', 'sr-more', st.decaysState === 'reading' ? H.waiting : H.decays);
      b.type = 'button';
      b.title = H.decaysTitle;
      b.disabled = st.decaysState === 'reading';
      b.addEventListener('click', readDecays);
      acts.appendChild(b);
      if (st.decaysState === 'failed') box.appendChild(el('p', 'sr-next__note', H.decaysFailed));
    } else if (!built.items.some((i) => i.kind === 'decay') && !built.debrisCount) {
      box.appendChild(el('p', 'sr-next__note', H.decaysNone));
    }
    if (acts.firstChild) box.insertBefore(acts, box.querySelector('.sr-next__list') ? box.querySelector('.sr-next__list').nextSibling : null);
    if (st.launches && Number.isFinite(st.fetchedAt)) {
      const age = now - st.fetchedAt;
      box.appendChild(el('p', 'sr-next__note', age > STALE_MS ? t(H.stale, { date: timeText.utcLong(st.fetchedAt) }) : t(H.asOf, { age: ageInWords(age) })));
    }
  }

  async function readLaunches() {
    let res = null;
    try { res = await load('ll2-previous', { await: true }); } catch { res = null; }
    st.launches = res && res.ok && res.data ? parsePrevious(res.data) : null;
    st.fetchedAt = res && Number.isFinite(res.fetchedAt) ? res.fetchedAt : null;
    st.read = true;
    paint();
  }

  async function readDecays() {
    st.decaysState = 'reading';
    paint();
    try {
      const [res, cat] = await Promise.all([load('celestrak-satcat', { await: true }), import('../data/satcat.js')]);
      const csv = res && typeof res.data === 'string' ? res.data : null;
      if (!csv) throw new Error('no catalogue');
      st.decays = cat.decayedRows(csv, wallNow() - JUST_DAYS * DAY);
      st.decaysState = 'ready';
    } catch {
      st.decaysState = 'failed';
    }
    paint();
  }

  paint();
  readLaunches();
  return { refresh: paint };
}
