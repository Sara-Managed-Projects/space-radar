// ui/opsevents.js -- Earth events: fires, storms, volcanoes and floods from NASA's EONET (research train "ops", forge #563).
//
// Contract: mountEvents(pane, ctx, api) -> { show(arg), hide() }   (ui/ops.js; `arg` is a kind: wildfire, storm, volcano, flood)
// Also exported, pure, for tests/test_research_ops.mjs: kindCounts(rows) -> {all, wildfire, storm, volcano, flood},
//   flyPlan(record, layerRecords) -> {layer, record, overlay}   what a row's press does
//
// THE LIST is EONET v3's open events, read OUR COPY FIRST (data/sources.js): the two lists the `earth-events` layer already
// reads (fires with a report in 30 days; volcanoes) and this train's third (severe storms and floods, `eonet-storms-floods`).
// Newest report first. EONET's own disclaimer is said under it: for looking, not an official record.
//
// A ROW FLIES THE GLOBE THERE. A fire or a volcano is a record of the `earth-events` layer, which is switched on and its own
// record selected, so the mark on the globe and the card are the layer's. A storm's mark is the `storms` layer's (GDACS,
// switched on), and a flood has no layer: both are selected as EONET's own point, which the selection marks. Where a NASA
// GIBS map of the event's own stuff exists in registry/overlays.yaml it is laid on the globe with it: rain for a storm or a
// flood. A fire or a volcano has no daily map there (the aerosol map is a month's mean, months old), and the list says so
// rather than laying a wrong one. The map stays until its button takes it off, as an overlay chosen in What to show does.

import { COPY, t, timeText } from '../copy/en.js';
import '../copy/en.ops.js';
import { loadEvents, eventRows, EVENT_KINDS, GIBS_FOR_KIND } from '../data/opsdata.js';
import { LAYER_KINDS } from '../data/eonet.js';
import { OVERLAYS } from '../data/overlays.js';
import { el, button, filterRow, rowButton, sourceLine, waitLine, ago, track } from './opskit.js';

const EVENTS_LAYER = 'earth-events';
const STORMS_LAYER = 'storms';
const SHOWN = 40;

export function kindCounts(rows) {
  const out = { all: rows.length };
  for (const k of EVENT_KINDS) out[k] = 0;
  for (const r of rows) if (out[r.meta.kind] !== undefined) out[r.meta.kind] += 1;
  return out;
}

/** What pressing a row does: which layer to switch on, which record to select, which map to lay. Pure. */
export function flyPlan(record, layerRecords = []) {
  const kind = record && record.meta ? record.meta.kind : null;
  const inLayer = LAYER_KINDS.includes(kind);
  const own = inLayer ? (layerRecords || []).find((r) => r && r.id === record.id) || null : null;
  return { layer: inLayer ? EVENTS_LAYER : kind === 'storm' ? STORMS_LAYER : null, record: own || record, overlay: GIBS_FOR_KIND[kind] || null };
}

export function mountEvents(pane, ctx, api) {
  const E = COPY.ops.events;
  const root = el('div', 'sr-ops__events');
  root.appendChild(el('p', 'sr-ops__lead', E.lead));
  const chipsHost = el('div');
  const mapLine = el('div', 'sr-ops__mapline');
  const list = el('div', 'sr-ops__body');
  list.appendChild(waitLine());
  const foot = el('div', 'sr-ops__foot');
  root.append(chipsHost, mapLine, list, foot);
  pane.appendChild(root);

  let rows = [];
  let fetchedAt = null;
  let kind = 'all';
  let ourOverlay = null;

  function paintMap(planned, k) {
    mapLine.textContent = '';
    if (planned) {
      const o = OVERLAYS.find((x) => x.id === planned);
      mapLine.appendChild(el('span', 'sr-ops__meta', t(E.map, { map: o ? o.title : planned })));
      const off = button('ui-btn ui-btn--sm', E.mapOff);
      off.addEventListener('click', () => { if (typeof ctx.setOverlay === 'function') ctx.setOverlay(null); ourOverlay = null; paintMap(null, null); });
      mapLine.appendChild(off);
    } else if (k) {
      mapLine.appendChild(el('span', 'sr-ops__meta', E.noMap));
    }
  }

  function go(record) {
    const plan = flyPlan(record, ctx.recordsFor ? ctx.recordsFor(EVENTS_LAYER) : []);
    if (plan.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(plan.layer) && typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn(plan.layer, true);
      track('layer_toggle', { layer: plan.layer, on: true });
    }
    if (typeof ctx.setOverlay === 'function') {
      if (plan.overlay) { ctx.setOverlay(plan.overlay); ourOverlay = plan.overlay; } else if (ourOverlay) { ctx.setOverlay(null); ourOverlay = null; }
    }
    paintMap(plan.overlay, record.meta.kind);
    ctx.select(plan.record);
  }

  function paint() {
    chipsHost.textContent = '';
    const counts = kindCounts(rows);
    const chips = filterRow({ label: E.filterLabel, value: kind,
      options: ['all', ...EVENT_KINDS].map((k) => [k, `${E.kinds[k]} ${counts[k]}`]),
      onChange: (v) => { kind = v; api.writeLink(v === 'all' ? '' : v); paintList(); } });
    chipsHost.appendChild(chips.el);
    paintList();
    foot.textContent = '';
    foot.appendChild(el('p', 'sr-card__note', E.disclaimer));
    foot.appendChild(sourceLine(t(E.sources, { ago: ago(fetchedAt) })));
  }

  function paintList() {
    list.textContent = '';
    const shown = rows.filter((r) => kind === 'all' || r.meta.kind === kind).slice(0, SHOWN);
    if (!shown.length) { list.appendChild(el('p', 'sr-ops__wait', E.none)); return; }
    const ul = el('ul', 'sr-list sr-ops__eventlist');
    for (const r of shown) {
      const meta = t(E.row, { kind: E.kindOne[r.meta.kind], date: timeText.utcLong(r.meta.reportedMs) });
      ul.appendChild(rowButton({ name: r.name, meta, value: (r.meta.agencies || [])[0] || '', title: r.name, onClick: () => go(r) }));
    }
    list.appendChild(ul);
  }

  async function fill() {
    const got = await loadEvents().catch(() => null);
    if (!got) { list.textContent = ''; list.appendChild(el('p', 'sr-ops__wait', COPY.ops.couldNot)); return; }
    rows = eventRows(got.records);
    fetchedAt = got.fetchedAt;
    paint();
  }

  return {
    show(arg) {
      if (EVENT_KINDS.includes(arg)) kind = arg;
      fill();
    },
    hide() {},
  };
}
