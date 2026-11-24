// ui/opsdsn.js -- who is talking to whom: the Deep Space Network's contacts now (research train "ops", forge #562).
//
// Contract: mountDsn(pane, ctx, api) -> { show(), hide() }   (ui/ops.js)
// Also exported, pure, for tests/test_research_ops.mjs: lightWords(seconds, words) -> "10 min 18 s"
//
// THE FEED. NASA's DSN Now (https://eyes.nasa.gov/dsn/data/dsn.xml), the file the DSN Now page reads every few seconds, saved
// by our harvester every five minutes (registry/sources.yaml dsn-now) and read here OUR COPY FIRST (data/sources.js); the
// browser asks NASA itself only when our copy is missing or past its time, which the feed's open CORS allows. It is
// unofficial: no terms of its own beyond NASA's media guidelines, no promise it keeps its shape (data/parsers.js parseDsn
// fails soft). A copy older than 30 minutes is said to be old, because a contact lasts hours, not days.
//
// THE LIGHT TIME is the feed's own range to the craft over the speed of light (its `downlegRange`, or half its round-trip
// light time `rtlt`), so it is the DSN's number, not ours. The lines on the map (scene/dsnlines.js) go to the craft the
// map draws (the deep-space layer's records, matched by the Horizons id the feed carries); the rest are listed, not drawn.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.ops.js';
import { loadDsn, dsnContacts, DSN_SITES, DSN_STALE_MS } from '../data/opsdata.js';
import { DSN_CRAFT } from '../data/dsncraft.js';
import { el, button, rowButton, sourceLine, waitLine, ago, track } from './opskit.js';

const DEEP_LAYER = 'deep-space';
const REFRESH_MS = 60e3;

/** One-way light time in words: seconds under a minute, minutes and seconds under an hour, then hours and minutes. Pure. */
export function lightWords(s, words = COPY.ops.dsn) {
  if (!Number.isFinite(s) || s < 0) return '';
  if (s < 60) return t(words.lightS, { n: fmt.num(s, s < 10 ? 1 : 0) });
  if (s < 3600) return t(words.lightMin, { m: Math.floor(s / 60), s: Math.round(s % 60) });
  const m = Math.round(s / 60);
  return t(words.lightH, { h: Math.floor(m / 60), m: m % 60 });
}

export function mountDsn(pane, ctx) {
  const D = COPY.ops.dsn;
  const root = el('div', 'sr-ops__dsn');
  root.appendChild(el('p', 'sr-ops__lead', D.lead));
  const acts = el('div', 'sr-ops__acts');
  const linesBtn = button('ui-btn ui-btn--sm', D.lines, D.linesTitle);
  linesBtn.setAttribute('aria-pressed', ctx.dsnLines && ctx.dsnLines.visible() ? 'true' : 'false');
  // The Lab's light-time simulator links here (registry/lab-levels.yaml); the app links no simulator (tests/test_lab.mjs).
  acts.append(linesBtn);
  root.appendChild(acts);
  root.appendChild(el('p', 'sr-card__note', D.linesNote));
  const status = el('p', 'sr-ops__status');
  const list = el('div', 'sr-ops__body');
  list.appendChild(waitLine());
  const foot = el('div', 'sr-ops__foot');
  root.append(status, list, foot);
  pane.appendChild(root);

  let contacts = [];
  let timer = null;

  function recordsByHorizons() {
    const map = new Map();
    for (const r of (ctx.recordsFor ? ctx.recordsFor(DEEP_LAYER) : []) || []) {
      const hid = r && r.meta ? r.meta.horizonsId : null;
      if (hid != null) map.set(String(hid), r);
    }
    return map;
  }

  async function wantLines(on) {
    if (on) {
      // The craft must be on the map for a line to reach them: the deep-space layer, loaded if it was not.
      if (typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(DEEP_LAYER) && typeof ctx.setLayerOn === 'function') ctx.setLayerOn(DEEP_LAYER, true);
      if (!ctx.dsnLines) {
        const m = await import('../scene/dsnlines.js');
        ctx.dsnLines = ctx.dsnLines || m.createDsnLines(ctx, { scene: ctx.scene });
      }
    }
    if (ctx.dsnLines) { ctx.dsnLines.set(contacts); ctx.dsnLines.setVisible(on); }
    linesBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  linesBtn.addEventListener('click', () => {
    const on = linesBtn.getAttribute('aria-pressed') !== 'true';
    track('layer_toggle', { layer: 'dsn-lines', on });
    wantLines(on);
  });

  function paint(got) {
    list.textContent = '';
    status.textContent = '';
    if (!got) { list.appendChild(el('p', 'sr-ops__wait', COPY.ops.couldNot)); return; }
    const old = Number.isFinite(got.fetchedAt) && Date.now() - got.fetchedAt > DSN_STALE_MS;
    if (old) status.appendChild(el('span', 'sr-ops__stale', t(D.stale, { ago: ago(got.fetchedAt) })));
    if (!contacts.length) { list.appendChild(el('p', 'sr-ops__wait', D.none)); return; }
    for (const site of Object.keys(DSN_SITES)) {
      const here = contacts.filter((c) => c.stationId === site);
      if (!here.length) continue;
      list.appendChild(el('h4', 'sr-micro', D.sites[site] || DSN_SITES[site].name));
      const ul = el('ul', 'sr-list sr-ops__contacts');
      for (const c of here) {
        const dir = c.up && c.down ? D.both : c.down ? D.down : D.up;
        const meta = [t(D.row, { dishes: c.dishes.join(', '), dir }), c.recordId ? '' : D.notDrawn].filter(Boolean).join(' · ');
        const value = c.oneWayS !== null ? lightWords(c.oneWayS, D) : '';
        const rec = c.recordId && ctx.recordById ? ctx.recordById(c.recordId) : null;
        ul.appendChild(rowButton({ name: c.name, meta, value, title: value ? `${c.name}: ${t(D.light, { t: value })}` : c.name,
          onClick: rec ? () => ctx.select(rec) : null }));
      }
      list.appendChild(ul);
    }
    foot.textContent = '';
    foot.appendChild(sourceLine(t(D.sources, { ago: ago(got.fetchedAt) })));
  }

  async function fill() {
    const got = await loadDsn().catch(() => null);
    contacts = got ? dsnContacts(got.links, { names: DSN_CRAFT, records: recordsByHorizons() }) : [];
    if (ctx.dsnLines) ctx.dsnLines.set(contacts);
    paint(got);
  }

  // The deep-space layer lands after the button turns it on: the names and lines then reach the craft it holds.
  const onLayer = (e) => { if (e.detail && e.detail.id === DEEP_LAYER && !pane.hidden) fill(); };
  window.addEventListener('sr:layer', onLayer);

  return {
    show() {
      fill();
      clearInterval(timer);
      timer = setInterval(() => { if (!pane.hidden) fill(); }, REFRESH_MS);
    },
    hide() { clearInterval(timer); timer = null; },
  };
}
