// ui/networks.js -- one tap to light a satellite network, with how many of it the map holds now (forge internal #555).
//
// Contract: mountNetworks(ctx) -> the row, once, at the top of the Earth tab (ui/explore.js mountTab)
// Pure, for tests/test_ask.mjs: NETWORKS, networkCounts(recordsFor), chipWords(id, n)
//
// WHAT IT IS. A row of the shared chips (css/controls.css .ui-chip, aria-pressed when lit): the big constellations of
// data/clouds.js (Starlink, OneWeb, GPS, GLONASS, Galileo, BeiDou, Iridium, Kuiper, Qianfan), the crewed stations,
// debris and the geostationary ring. A tap is Find's own (ui/find.js openLink, ui/findmap.js): the group is lit on the
// globe and every other dot set aside, with the pill that puts it back; the lit chip says so, and a Clear chip is there
// while anything is lit.
//
// THE COUNTS ARE LIVE AND NEVER GUESSED. A number is how many of that network the map holds right now: the records of
// the catalogue loaded in this visit (CelesTrak's active satellites, 7 MB, fetched when a network is first asked for,
// never at boot), matched by the names their operators give them (data/clouds.js recordInConstellation). Before that
// catalogue is here a chip has no number, and the line under the row says why. The stations are counted from their own
// small layer, which the first view already draws.
//
// NOT AT BOOT. main.js imports this in an idle moment after the first view has landed (sr:layers-ready).

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.networks.js';
import { CONSTELLATIONS, recordInConstellation } from '../data/clouds.js';
import { loadCss } from './latercss.js';

/** The chips, in the order they are shown. */
export const NETWORKS = [
  ...['starlink', 'oneweb', 'gps', 'glonass', 'galileo', 'beidou', 'iridium', 'kuiper', 'qianfan'].map((id) => ({ id, kind: 'constellation' })),
  { id: 'stations', kind: 'stations' },
  { id: 'debris', kind: 'debris' },
  { id: 'geo', kind: 'geo', find: 'sats_h35000-36500_working' },
];

const keyOf = (r) => (r && r.meta && r.meta.noradId ? r.meta.noradId : r && r.id);

/**
 * How many of each network the map holds now: `{ starlink: 6780, ..., stations: 12 }`, a network absent when the
 * records it is counted from are not loaded. `recordsFor(layerId)` is ctx.recordsFor. Pure.
 */
export function networkCounts(recordsFor) {
  const out = {};
  const active = recordsFor('active') || [];
  if (active.length) {
    for (const c of CONSTELLATIONS) out[c.id] = 0;
    const seen = new Set();
    for (const r of active) {
      const k = keyOf(r);
      if (seen.has(k)) continue;
      seen.add(k);
      for (const c of CONSTELLATIONS) if (recordInConstellation(r, c)) { out[c.id] += 1; break; }
    }
    // The geostationary ring as Find asks it: working payloads 35 000 to 36 500 km up.
    out.geo = active.filter((r) => { const m = r.meta || {}; const h = (Number(m.apogeeKm) + Number(m.perigeeKm)) / 2; return h >= 35000 && h <= 36500; }).length || undefined;
    if (out.geo === undefined) delete out.geo;
  }
  const stations = recordsFor('stations') || [];
  if (stations.length) out.stations = new Set(stations.map(keyOf)).size;
  const debris = recordsFor('debris-field') || [];
  if (debris.length) out.debris = new Set(debris.map(keyOf)).size;
  return out;
}

/** A chip's name, and its name with the count for a screen reader and a tooltip. Pure. */
export function chipWords(id, n) {
  const N = COPY.networks;
  const name = N.names[id] || id;
  return { name, label: Number.isFinite(n) ? t(N.chipCount, { name, n: fmt.int(n) }) : t(N.chipNoCount, { name }) };
}

/** Light the crewed stations on the globe (ui/findmap.js, through Find's own highlight). */
export function lightStations(ctx, find, name) {
  if (!find || !find.highlight) return;
  find.highlight.set({ name, test: (r) => r && (r.klass === 'station' || r.layer === 'stations'), layers: ['stations'] });
}

export function mountNetworks(ctx) {
  if (ctx.networks) return ctx.networks;
  const N = COPY.networks;
  const st = { lit: null };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const row = el('div', 'sr-nets');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-labelledby', 'sr-nets-title');
  const chips = new Map();
  for (const net of NETWORKS) {
    const b = el('button', 'ui-chip sr-nets__chip');
    b.type = 'button';
    b.dataset.network = net.id;
    b.setAttribute('aria-pressed', 'false');
    b.append(el('span', null, chipWords(net.id).name), el('span', 'sr-nets__n'));
    b.addEventListener('click', () => press(net));
    chips.set(net.id, b);
    row.appendChild(b);
  }
  const clear = el('button', 'ui-chip sr-nets__chip sr-nets__clear', N.clear);
  clear.type = 'button';
  clear.title = N.clearTitle;
  clear.hidden = true;
  clear.addEventListener('click', () => { if (ctx.find && ctx.find.highlight) ctx.find.highlight.clear(); else setLit(null); });
  row.appendChild(clear);
  const note = el('p', 'sr-sect__note sr-nets__note');
  note.setAttribute('aria-live', 'polite');

  function paint() {
    const counts = networkCounts((id) => (ctx.recordsFor ? ctx.recordsFor(id) : []));
    for (const [id, b] of chips) {
      const n = counts[id];
      const w = chipWords(id, n);
      b.lastChild.textContent = Number.isFinite(n) ? fmt.int(n) : '';
      b.setAttribute('aria-label', w.label);
      b.title = w.label;
      b.setAttribute('aria-pressed', st.lit === id ? 'true' : 'false');
    }
    clear.hidden = !st.lit;
    note.textContent = Number.isFinite(counts.starlink) ? N.noteCounted : N.noteLoad;
  }
  function setLit(id) { st.lit = id; paint(); }

  async function press(net) {
    if (st.lit === net.id) { if (ctx.find && ctx.find.highlight) ctx.find.highlight.clear(); setLit(null); return; }
    const f = typeof ctx.wantFind === 'function' ? await ctx.wantFind() : null;
    if (!f) return;
    setLit(net.id);
    if (net.kind === 'constellation') f.openLink({ constellation: net.id });
    else if (net.kind === 'debris') f.open('clouds', { focus: false });
    else if (net.kind === 'stations') lightStations(ctx, f, N.names.stations);
    else if (net.find) f.openLink({ find: net.find });
  }

  // A highlight put back anywhere (the pill's ×, Find's own Clear) unlights the chip; a catalogue that lands counts.
  window.addEventListener('sr:find-highlight', (e) => { if (!(e.detail && e.detail.on)) setLit(null); else paint(); });
  for (const name of ['sr:layer', 'sr:layers-ready']) window.addEventListener(name, () => paint());
  document.addEventListener('sr:layer-toggle', () => setTimeout(paint, 0));

  const api = {
    render(host) {
      loadCss('networks');
      host.classList.add('sr-nets__sect');
      const h = el('h2', 'sr-micro', N.title);
      h.id = 'sr-nets-title';
      host.append(h, row, note);
      paint();
    },
    paint,
    lit: () => st.lit,
  };
  ctx.networks = api;
  if (ctx.explore && typeof ctx.explore.mountTab === 'function') ctx.explore.mountTab('earth', (host) => api.render(host));
  return api;
}
