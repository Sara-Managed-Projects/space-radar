// ui/opsreentry.js -- re-entries and close calls (research train "ops", forge #561).
//
// Contract: mountReentry(pane, ctx, api) -> { show(arg), hide() }   (ui/ops.js; `arg` is a close-approach filter)
// Also exported, pure, for tests/test_research_ops.mjs: chanceWords(p, words) -> "1 in 2 300"
//
// THREE LISTS, NONE OF THEM OURS TO GUESS.
//   * Came down: what CelesTrak's catalogue records as decayed in the last 30 days, with its date (`reentry-watch`).
//   * Lowest now: the whole orbits still up that stay under 350 km, lowest first. That is a fact about height, not a
//     forecast: the air brings them down within weeks to months, and the list says no date. The only public windows
//     (18 SDS's, on Space-Track) need an account whose agreement restricts passing them on (registry/sources.yaml
//     space-track-tip, switched off); Aerospace Corporation's page answered our reader with a bot wall on 2026-11-24, so
//     its terms could not be read and it is not used (noted for the maintainer in the pull request).
//   * Closest approaches: CelesTrak's SOCRATES Plus, ranked by its own maximum probability, with its own range and
//     speed. We compute no probability (the issue's watch). The chips filter by what is involved.
// And the story of the first collision of two whole satellites, the Moment of 2009 (#moment=iridium-cosmos-2009).

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.ops.js';
import { loadReentry, loadClose, CLOSE_FILTERS, closeFilter } from '../data/opsdata.js';
import { el, button, filterRow, rowButton, sourceLine, waitLine, track } from './opskit.js';

const MOMENT_ID = 'iridium-cosmos-2009';
const CLOSE_SHOWN = 20;

/** CelesTrak's maximum probability as "1 in N", rounded to two figures; "over 1 in 10" past a tenth. Pure. */
export function chanceWords(p, words = COPY.ops.reentry) {
  if (!Number.isFinite(p) || p <= 0) return '';
  if (p > 0.1) return words.closeChanceHigh;
  const n = 1 / p;
  const digits = Math.max(0, Math.floor(Math.log10(n)) - 1);
  const round = Math.round(n / 10 ** digits) * 10 ** digits;
  return t(words.closeChance, { n: fmt.int(round) });
}

export function mountReentry(pane, ctx, api) {
  const R = COPY.ops.reentry;
  const root = el('div', 'sr-ops__reentry');
  pane.appendChild(root);

  // The story first: the one ember action of this pane.
  const story = el('section', 'sr-ops__story');
  story.appendChild(el('h4', 'sr-micro', R.momentHead));
  const go = button('ui-btn ui-btn--primary sr-ops__storybtn', R.moment, R.momentHint);
  go.addEventListener('click', () => { if (typeof ctx.wantMoment === 'function') ctx.wantMoment(MOMENT_ID, null); });
  story.appendChild(go);
  root.appendChild(story);

  const recentBox = el('section', 'sr-ops__sect');
  const lowestBox = el('section', 'sr-ops__sect');
  const closeBox = el('section', 'sr-ops__sect');
  const foot = el('div', 'sr-ops__foot');
  root.append(closeBox, recentBox, lowestBox, foot);

  let closeRows = null;
  let closeRead = null;
  let watch = null;
  let watchRead = null;
  let filter = 'all';

  const kindWords = (k) => R.kinds[k] || R.kinds.unknown;
  const flyTo = (catnum) => {
    const rec = ctx.recordById ? ctx.recordById(`sat-${catnum}`) : null;
    if (!rec) return null;
    return () => { ctx.select(rec); };
  };

  function paintClose() {
    closeBox.textContent = '';
    closeBox.appendChild(el('h4', 'sr-micro', R.closeHead));
    closeBox.appendChild(el('p', 'sr-ops__lead', R.closeLead));
    const chips = filterRow({ label: R.filterLabel, options: CLOSE_FILTERS.map((f) => [f, R.filters[f]]), value: filter,
      onChange: (v) => { filter = v; api.writeLink(v === 'all' ? '' : v); paintClose(); } });
    closeBox.appendChild(chips.el);
    if (!closeRows) { closeBox.appendChild(el('p', 'sr-ops__wait', closeRead === false ? R.closeCouldNot : COPY.ops.loading)); return; }
    const rows = closeFilter(closeRows, filter).slice(0, CLOSE_SHOWN);
    if (!rows.length) { closeBox.appendChild(el('p', 'sr-ops__wait', R.closeNone)); return; }
    const ul = el('ul', 'sr-list sr-ops__close');
    for (const r of rows) {
      const name = `${r.a.name} · ${r.b.name}`;
      const meta = `${t(R.closeRow, { range: fmt.int(r.rangeM), speed: fmt.smart(r.speedKms) })} · ${t(R.closeWhen, { date: timeText.utcLong(r.tcaMs) })}`;
      ul.appendChild(rowButton({ name, meta, value: chanceWords(r.maxProb, R), onClick: flyTo(r.a.id) || flyTo(r.b.id), title: name }));
    }
    closeBox.appendChild(ul);
    closeBox.appendChild(el('p', 'sr-card__note', R.closeNote));
  }

  function paintWatch() {
    recentBox.textContent = '';
    lowestBox.textContent = '';
    recentBox.appendChild(el('h4', 'sr-micro', R.recentHead));
    lowestBox.appendChild(el('h4', 'sr-micro', R.lowestHead));
    if (!watch) {
      const why = watchRead === false ? COPY.ops.couldNot : COPY.ops.loading;
      recentBox.appendChild(el('p', 'sr-ops__wait', why));
      return;
    }
    const recent = Array.isArray(watch.recent) ? watch.recent : [];
    if (!recent.length) recentBox.appendChild(el('p', 'sr-ops__wait', R.recentNone));
    else {
      const ul = el('ul', 'sr-list sr-ops__recent');
      for (const r of recent.slice(0, 12)) {
        const meta = t(R.recentRow, { kind: kindWords(r.kind), owner: r.owner, date: timeText.utcLong(Date.parse(`${r.down}T12:00:00Z`)) });
        ul.appendChild(rowButton({ name: r.name, meta, value: r.intl, title: `${r.name} (${r.intl})` }));
      }
      recentBox.appendChild(ul);
    }
    const lowest = Array.isArray(watch.lowest) ? watch.lowest : [];
    if (lowest.length) {
      lowestBox.appendChild(el('p', 'sr-ops__lead', t(R.lowestLead, { n: lowest.length, total: fmt.int(watch.low_count || lowest.length), km: fmt.int(watch.low_apogee_km || 350) })));
      const ul = el('ul', 'sr-list sr-ops__lowest');
      for (const r of lowest.slice(0, 12)) {
        ul.appendChild(rowButton({ name: r.name, meta: `${kindWords(r.kind)}, ${r.owner} · ${r.intl}`, value: t(R.lowestRow, { peri: fmt.int(r.perigee_km), apo: fmt.int(r.apogee_km) }), onClick: flyTo(r.id), title: r.name }));
      }
      lowestBox.appendChild(ul);
    }
    lowestBox.appendChild(el('p', 'sr-card__note', R.noPrediction));
  }

  function paintFoot() {
    foot.textContent = '';
    const d = (ms) => (Number.isFinite(ms) ? timeText.utcLong(ms) : '—');
    foot.appendChild(sourceLine(t(R.sources, { date: d(watchRead), close: d(closeRead) })));
  }

  async function fill() {
    if (!watch) recentBox.appendChild(waitLine());
    const [w, c] = await Promise.all([loadReentry().catch(() => null), loadClose().catch(() => null)]);
    watch = w ? w.watch : null;
    watchRead = w ? w.fetchedAt : false;
    closeRows = c ? c.rows : null;
    closeRead = c ? c.fetchedAt : false;
    paintClose();
    paintWatch();
    paintFoot();
  }

  return {
    show(arg) {
      if (CLOSE_FILTERS.includes(arg) && arg !== filter) { filter = arg; track('tab_open', { tab: `ops_close_${arg}` }); }
      fill();
    },
    hide() {},
  };
}
