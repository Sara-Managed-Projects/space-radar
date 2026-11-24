// ui/neobrowser.js -- the near-Earth asteroids, a catalogue of ui/catalogue.js (research train "catalogues", forge #560).
//
// Contract: mountNeoBrowser(pane, ctx, api) -> { show(arg), hide() }   (`arg` a designation: `#cat=asteroids:2024 YR4`)
//
// WHAT IS IN IT. site/data/neo-browser.json (scripts/build-neo-browser.py, data/neocat.js): every hazardous near-Earth asteroid,
// every one about a kilometre or larger, and every one CNEOS lists passing within 0.05 AU in the next ten years, with JPL's orbit.
// The lead line says how many of how many. THE PASSES are read from our saved copy of CNEOS's ten-year list first
// (`jpl-cad-decade`, data/sources.js load: the harvest's weekly copy) and from the file's own list when there is none; the
// line under the table says which, with its date.
//
// THE TABLE is Find's (ui/catalogkit.js buildTable): name, size, next pass, its distance, the orbit's class, delta-v and MOID,
// each column sortable, the next passes first. The filters are the set's chips and a text field. A row flies to the rock and
// draws its orbit: a hazardous one is the `pha` layer's own record (the layer is switched on, as Find does), one of the
// "Asteroids passing by" layer is that layer's, and any other is a record made from the same orbit (data/neocat.js recordFor),
// so the card and the orbit line are the map's own.
//
// THE POINTS. A switch under the table puts the brightest numbered asteroids on the map as points (scene/asteroidcloud.js), off
// by default, fetched only when it is switched on, more only when asked, and off again when the view is left.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.neo.js';
import { load } from '../data/sources.js';
import { readFile, approachesFromCad, withApproaches, sizeFromH, sizeKm, deltaV, classWord, recordFor, WHY, CLASSES } from '../data/neocat.js';
import { el, button, buildTable, chipGroup, matchText, sourceLine, track } from './catalogkit.js';

const FILE = new URL('../../data/neo-browser.json', import.meta.url).href;

/** "350 m", "1.2 km". */
function lengthText(km) {
  const N = COPY.neo;
  if (!Number.isFinite(km)) return '';
  if (km < 1) { const m = km * 1000; return t(N.m, { n: fmt.int(m < 100 ? Math.round(m) : Math.round(m / 10) * 10) }); }
  return t(N.km, { n: fmt.num(km, km < 10 ? 1 : 0) });
}

/** The size cell: measured, or the range a magnitude allows, called an estimate. Pure enough to test through the module. */
export function sizeText(row) {
  const N = COPY.neo;
  if (Number.isFinite(row.diameterKm)) return lengthText(row.diameterKm);
  const s = sizeFromH(row.H);
  if (!s) return '';
  return t(N.estimated, { range: t(N.range, { min: lengthText(s.minKm), max: lengthText(s.maxKm) }) });
}

let dateFmt = null;
function dateText(ms) {
  if (!dateFmt) {
    try { dateFmt = new Intl.DateTimeFormat(document.documentElement.lang || 'en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch { dateFmt = new Intl.DateTimeFormat('en', { timeZone: 'UTC' }); }
  }
  return dateFmt.format(new Date(ms));
}

/** The rows a set of filters leaves. Pure. */
export function filterNeo(rows, f) {
  return rows.filter((r) => {
    if (f.which === 'pha' && !(r.why & WHY.pha)) return false;
    if (f.which === 'km' && !(r.why & WHY.km)) return false;
    if (f.which === 'close' && !r.next) return false;
    if (f.cls && r.cls !== f.cls) return false;
    return matchText(r, f.q || '', ['label', 'pdes', 'name']);
  });
}

export function mountNeoBrowser(pane, ctx, api) {
  const N = COPY.neo;
  const C = COPY.catalogue;
  const nowMs = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
  const lead = el('p', 'sr-cat__lead', C.loading);
  pane.appendChild(lead);

  const st = { which: '', cls: '', q: '', rows: [], data: null, via: 'bundled', viaMs: null, pending: '' };
  const which = chipGroup({ label: N.whichLabel, options: ['', 'pha', 'km', 'close'].map((id) => ({ id, text: id ? N.which[id] : N.which.all })), value: '', onChange: (v) => { st.which = v; paint(); } });
  const cls = chipGroup({ label: N.classLabel, options: [{ id: '', text: C.all }, ...CLASSES.map((c) => ({ id: c, text: N.classes[c], title: N.classTitles[c] }))], value: '', onChange: (v) => { st.cls = v; paint(); } });
  const field = el('div', 'sr-cat__field');
  const input = el('input', 'sr-cat__input');
  input.type = 'search';
  input.setAttribute('aria-label', C.search);
  input.placeholder = N.searchPlaceholder;
  input.addEventListener('input', () => { st.q = input.value; paint(); });
  field.appendChild(input);
  pane.append(which.el, cls.el, field);

  const columns = [
    { key: 'name', label: N.columns.name, head: true, get: (r) => r.label },
    { key: 'size', label: N.columns.size, get: (r) => sizeKm(r), text: (r) => sizeText(r), title: (r) => (Number.isFinite(r.diameterKm) ? N.sizeMeasured : Number.isFinite(r.H) ? t(N.sizeEstimated, { h: fmt.num(r.H, 1) }) : ''), descFirst: true },
    { key: 'next', label: N.columns.next, get: (r) => (r.next ? r.next.tMs : null), text: (r) => (r.next ? dateText(r.next.tMs) : ''), title: (r) => (r.passes > 1 ? t(N.passes, { n: fmt.int(r.passes) }) : '') },
    { key: 'dist', label: N.columns.dist, get: (r) => (r.next ? r.next.ld : null), text: (r) => (r.next ? t(N.ld, { n: fmt.num(r.next.ld, r.next.ld < 10 ? 1 : 0) }) : ''), title: (r) => (r.next ? t(N.ldTitle, { n: fmt.num(r.next.ld, 1), au: fmt.num(r.next.distAu, 4), kms: fmt.num(r.next.vKmS, 1) }) : '') },
    { key: 'cls', label: N.columns.cls, get: (r) => classWord(r.cls), title: (r) => N.classTitles[r.cls] || '' },
    { key: 'dv', label: N.columns.dv, get: (r) => r.dv, text: (r) => (Number.isFinite(r.dv) ? t(N.kms, { n: fmt.num(r.dv, 1) }) : '') },
    { key: 'moid', label: N.columns.moid, get: (r) => r.moidAu, text: (r) => (Number.isFinite(r.moidAu) ? t(N.au, { n: fmt.num(r.moidAu, 4) }) : ''), title: () => N.moidTitle },
  ];
  const table = buildTable({ columns, label: N.tableLabel, sortKey: 'next', onRow: (row) => go(row) });
  const notes = el('div', 'sr-cat__notes');
  for (const k of ['size', 'dv', 'place', 'hazard']) notes.appendChild(el('p', 'sr-sect__note', N.notes[k]));
  pane.append(table.el, notes);

  // --- the points ------------------------------------------------------------------------------------------------------
  const P = N.cloud;
  const cloudBox = el('section', 'sr-cat__sect sr-neo__cloud');
  cloudBox.appendChild(el('h3', 'sr-micro', P.title));
  const opt = el('label', 'ui-opt');
  const box = el('input', 'ui-check');
  box.type = 'checkbox';
  opt.append(box, document.createTextNode(' '), document.createTextNode(P.toggle));
  const cloudLine = el('p', 'sr-cat__count');
  cloudLine.setAttribute('role', 'status');
  const moreBtn = button('ui-btn ui-btn--sm ui-btn--secondary');
  moreBtn.hidden = true;
  const legend = el('ul', 'sr-neo__legend');
  for (const [k, sw] of [['neo', 'sr-swatch sr-swatch--asteroid'], ['belt', 'sr-swatch sr-swatch--asteroid sr-neo__dim'], ['trojan', 'sr-swatch sr-swatch--world sr-neo__dim'], ['far', 'sr-swatch sr-swatch--world sr-neo__dim']]) {
    const li = el('li', 'sr-neo__key');
    const swatch = el('span', sw);
    swatch.setAttribute('aria-hidden', 'true');
    li.appendChild(swatch);
    li.appendChild(document.createTextNode(P.legend[k]));
    legend.appendChild(li);
  }
  legend.hidden = true;
  cloudBox.append(opt, cloudLine, legend, moreBtn, el('p', 'sr-sect__note', P.note));
  pane.appendChild(cloudBox);
  let cloud = null;
  let cloudImport = null;
  const colourOf = (id) => { const l = (ctx.layers || []).find((x) => x.id === id); return l && l.colour; };
  function wantCloud() {
    if (cloudImport) return cloudImport;
    cloudImport = import('../scene/asteroidcloud.js').then((m) => {
      // the layers' own class colours (data/layers.js C.asteroid, C.world), as the legend's swatches are
      const rock = colourOf('asteroids') || colourOf('pha');
      const far = colourOf('worlds');
      cloud = m.createAsteroidCloud(THREE, ctx, { colours: rock && far ? [rock, rock, far, far] : undefined });
      return cloud;
    }).catch((e) => { cloudImport = null; throw e; });
    return cloudImport;
  }
  function paintCloud() {
    const s = cloud ? cloud.state() : null;
    if (!s || !s.on) { cloudLine.textContent = ''; moreBtn.hidden = true; legend.hidden = true; return; }
    if (s.failed) { cloudLine.textContent = P.failed; moreBtn.hidden = true; return; }
    if (!s.shown) { cloudLine.textContent = P.loading; return; }
    cloudLine.textContent = t(P.shown, { shown: fmt.int(s.shown), numbered: fmt.int(s.numbered), h: fmt.num(s.hMax, 1) });
    legend.hidden = false;
    moreBtn.hidden = false;
    moreBtn.disabled = !s.next;
    moreBtn.textContent = s.next ? t(P.more, { n: fmt.int(s.next) }) : P.all;
  }
  box.addEventListener('change', () => {
    const on = box.checked;
    track('layer_toggle', { layer: 'asteroid-cloud', on });
    if (!on) { if (cloud) cloud.setOn(false); paintCloud(); return; }
    cloudLine.textContent = P.loading;
    wantCloud().then((c) => c.setOn(true)).then(paintCloud, () => { cloudLine.textContent = P.failed; });
  });
  moreBtn.addEventListener('click', () => {
    if (!cloud) return;
    moreBtn.disabled = true;
    cloud.more().then(paintCloud, paintCloud);
  });

  // --- going to a rock -------------------------------------------------------------------------------------------------
  function whenLayer(id) {
    const has = () => typeof ctx.layerLanded === 'function' && ctx.layerLanded(id) && (ctx.recordsFor(id) || []).length;
    if (has()) return Promise.resolve();
    if (typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn(id, true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on: true, handled: true, from: 'catalogue' } }));
    }
    return new Promise((resolve) => {
      const on = (e) => { if (e.detail && e.detail.id === id) { window.removeEventListener('sr:layer', on); resolve(); } };
      window.addEventListener('sr:layer', on);
      setTimeout(() => { window.removeEventListener('sr:layer', on); resolve(); }, 20000);
    });
  }
  function go(row) {
    const byId = (id) => (typeof ctx.recordById === 'function' ? ctx.recordById(id) : null);
    const own = recordFor(row, N, st.data && st.data.read ? timeText.utcLong(Date.parse(`${st.data.read}T12:00:00Z`)) : '');
    const named = byId(`asteroid-${row.pdes}`) || byId(own.id);
    api.writeLink(row.pdes);
    if (named) { ctx.select(named); return; }
    if (row.pha && row.spk) {
      whenLayer('pha').then(() => ctx.select(byId(`pha-${row.spk}`) || own));
      return;
    }
    ctx.select(own);
  }

  // --- the data --------------------------------------------------------------------------------------------------------
  function paint() {
    if (!st.data) return;
    const rows = filterNeo(st.rows, st);
    const s = table.sort();
    table.set(rows, s.key, s.desc);
  }

  const ready = Promise.all([
    fetch(FILE, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(`neo-browser.json ${r.status}`); return r.json(); }),
    load('jpl-cad-decade', { await: true }).catch(() => null),
  ]).then(([json, saved]) => {
    const data = readFile(json);
    const fromSaved = saved && saved.data ? approachesFromCad(saved.data) : [];
    st.via = fromSaved.length ? 'snapshot' : 'bundled';
    st.viaMs = fromSaved.length ? saved.fetchedAt : Date.parse(`${data.read}T12:00:00Z`);
    const joined = withApproaches(data.rows, fromSaved.length ? fromSaved : data.approaches, nowMs());
    for (const r of joined) r.dv = deltaV(r.a, r.e, r.i);
    st.rows = joined;
    st.data = data;
    lead.textContent = t(N.lead, { rows: fmt.int(data.counts.rows), neo: fmt.int(data.counts.neo) });
    pane.appendChild(sourceLine({ source: N.sourceSbdb, licence: N.licence, readMs: Date.parse(`${data.read}T12:00:00Z`), via: 'bundled' }));
    pane.appendChild(sourceLine({ source: N.sourceCad, licence: N.licence, readMs: st.viaMs, via: st.via }));
    paint();
    if (st.pending) { const p = st.pending; st.pending = ''; pick(p); }
    return true;
  }).catch((e) => {
    console.warn('the near-Earth catalogue did not load', e);
    lead.textContent = C.failed;
    return false;
  });

  function pick(des) {
    const key = String(des || '').trim().toLowerCase();
    if (!key) return;
    if (!st.data) { st.pending = des; return; }
    const row = st.rows.find((r) => r.pdes.toLowerCase() === key || r.label.toLowerCase() === key || (r.name && r.name.toLowerCase() === key));
    if (row) { input.value = row.pdes; st.q = row.pdes; paint(); go(row); }
  }

  return {
    ready,
    show(arg) { if (arg) pick(arg); else paint(); paintCloud(); },
    hide() { if (cloud && cloud.state().on) { cloud.setOn(false); box.checked = false; paintCloud(); } },
  };
}
