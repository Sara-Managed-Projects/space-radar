// ui/launcharchive.js -- every orbital launch attempt since 1957, from GCAT (forge #551): a catalogue of ui/catalogue.js.
//
// Contract: mountLaunchArchive(pane, ctx, api) -> Promise<{ show(arg), hide() }>
//   arg   what a `cat=launches:<arg>` link asks for: a year ('1969') or a decade ('1960s'); anything else is any time
// Also exported, pure (tests/test_launch_archive.mjs):
//   filterRows(rows, {outcome, when, state, text, states}) -> rows
//   replayItems(rows, nowYear, opts) -> [{lat, lon, inc, k, alpha, fail, tag}]   the arcs a replay draws at `nowYear`
//   yearItems(rows, year) -> the same, every launch of one year, whole
//   siteRecord(row) -> a record ctx.flyToRecord can fly to (a fixed point on the Earth), or null
//
// THE DATA. Our saved copy first (data/v1/gcat-launches.json, the harvester's weekly cut of GCAT's launch list,
// harvest/parsers/gcat_launch.py), the copy bundled with the map after it (data/launches.json, scripts/build-launches.py),
// and the line under the table says which and how old (ui/catalogkit.js sourceLine). GCAT is CC BY 4.0: the citation is
// that line's, and /launches/'s.
//
// THE TABLE IS FIND'S (catalogkit buildTable): date, rocket, site, payload, outcome; sorted newest first; filtered by
// outcome, by time (a decade or a year: the same choice as the slider), by the launch site's country and by words. A row
// flies the globe to its site and draws that launch's arc; the table stays.
//
// THE REPLAY (scene/launcharcs.js, fetched on the first year drawn). The slider is a year: moving it draws that year's
// launches and narrows the table to it. Replay plays the years from the slider's on, two a second; each arc grows for a
// season and fades over a year. Under prefers-reduced-motion nothing plays: the button is not offered, and the slider
// steps. Leaving the view stops it and takes the arcs away.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.launches.js';
import { el, button, buildTable, chipGroup, sourceLine, readJsonCopy, matchText, track } from './catalogkit.js';
import {
  SNAPSHOT_URL, BUNDLED_URL, unwrap, parseArchive, countBy, matchesWhen, whenFromArg, yearFraction, decadeOf, partialPercent,
} from '../data/launcharchive.js';

const YEARS_PER_SECOND = 2;
const GROW_YEARS = 0.25;
const FADE_YEARS = 1;
const COUNTRY_MIN = 40;
const DEG = Math.PI / 180;
const OTHER_KINDS = new Set(['E', 'A', 'U']);

/** The rows the filters keep. `states` are the countries with a chip of their own (for 'Elsewhere'). Pure. */
export function filterRows(rows, f = {}) {
  const text = String(f.text || '').trim();
  return rows.filter((r) => {
    if (f.outcome) {
      if (f.outcome === 'other') { if (!OTHER_KINDS.has(r.kind)) return false; } else if (r.kind !== f.outcome) return false;
    }
    if (f.when && !matchesWhen(r, f.when)) return false;
    if (f.state) {
      if (f.state === '*') { if (f.states && f.states.has(r.state)) return false; } else if (r.state !== f.state) return false;
    }
    if (text && !matchText(r, text, ['veh', 'pay', 'siteName', 'site', 'tag', 'ag', 'pad'])) return false;
    return true;
  });
}

/** The arcs at `nowYear` of a replay: launched in the last FADE_YEARS, each grown over GROW_YEARS. Pure. */
export function replayItems(rows, nowYear, opts = {}) {
  const grow = opts.grow || GROW_YEARS;
  const fade = opts.fade || FADE_YEARS;
  const out = [];
  for (const r of rows) {
    const y = r.yf !== undefined ? r.yf : yearFraction(r.t);
    if (y === null || y > nowYear || nowYear - y >= fade || r.lat === null) continue;
    const age = nowYear - y;
    out.push({ tag: r.tag, lat: r.lat, lon: r.lon, inc: r.inc, k: Math.min(1, age / grow), alpha: Math.max(0.15, 1 - age / fade), fail: r.kind === 'F' || r.kind === 'E' || r.kind === 'A' });
  }
  return out;
}

/** Every launch of one year, whole. Pure. */
export function yearItems(rows, year) {
  return rows.filter((r) => r.year === year && r.lat !== null)
    .map((r) => ({ tag: r.tag, lat: r.lat, lon: r.lon, inc: r.inc, k: 1, alpha: 0.85, fail: r.kind === 'F' || r.kind === 'E' || r.kind === 'A' }));
}

/** A fixed point on the Earth where the rocket left from, in the shape ctx.flyToRecord takes. Pure. */
export function siteRecord(row) {
  if (!row || !Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return null;
  return {
    id: `launch-site-${row.site}`,
    name: row.siteName,
    klass: 'site',
    layer: 'ground-sites',
    propagator: 'fixed',
    frame: 'earth-fixed',
    cls: 'measured',
    epoch: null,
    fixed: { latRad: row.lat * DEG, lonRad: row.lon * DEG, altKm: 0 },
    meta: { siteKind: 'pad', latDeg: row.lat, lonDeg: row.lon, padName: row.pad || null, source: 'gcat' },
  };
}

const lang = () => (typeof document !== 'undefined' && document.documentElement.lang) || 'en';
function countryName(cc, state) {
  const L = COPY.launchArchive;
  if (cc === 'SU' || state === 'SU') return L.soviet;
  try { return (cc && new Intl.DisplayNames([lang(), 'en'], { type: 'region' }).of(cc)) || state; } catch { return state; }
}
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function mountLaunchArchive(pane, ctx, api = {}) {
  const L = COPY.launchArchive;
  const got = await readJsonCopy([{ url: SNAPSHOT_URL, via: 'snapshot' }, { url: BUNDLED_URL, via: 'bundled' }]);
  // A snapshot document that does not unwrap to an archive falls through to the bundled copy.
  let file = got ? unwrap(got.data) : null;
  let via = got ? got.via : null;
  if (!file && got && got.via === 'snapshot') {
    const again = await readJsonCopy([{ url: BUNDLED_URL, via: 'bundled' }]);
    file = again ? unwrap(again.data) : null;
    via = again ? again.via : null;
  }
  const archive = parseArchive(file);
  if (!archive || !archive.rows.length) throw new Error('no launch archive');
  for (const r of archive.rows) r.yf = yearFraction(r.t);
  const rows = archive.rows;
  const years = rows.map((r) => r.year).filter((y) => y !== null);
  const firstYear = Math.min(...years);
  const lastYear = Math.max(...years);

  const st = { outcome: '', when: '', state: '', text: '', playing: false, now: lastYear };
  pane.classList.add('sr-launches');

  pane.appendChild(el('p', 'sr-cat__lead', t(L.lead, { n: fmt.int(rows.length) })));

  // --- the replay ------------------------------------------------------------------------------------------------
  const replay = el('section', 'sr-cat__sect sr-launches__replay');
  replay.appendChild(el('h3', 'sr-micro', L.replay.title));
  const bar = el('div', 'sr-launches__bar');
  const play = button('ui-btn ui-btn--primary ui-btn--sm sr-launches__play', L.replay.play);
  const slider = el('input', 'ui-range sr-launches__year');
  slider.type = 'range';
  slider.min = String(firstYear);
  slider.max = String(lastYear);
  slider.step = '1';
  slider.value = String(lastYear);
  slider.setAttribute('aria-label', L.replay.year);
  bar.append(play, slider);
  const yearLine = el('p', 'sr-launches__yearline');
  yearLine.setAttribute('aria-live', 'polite');
  replay.append(bar, yearLine);
  const reducedLine = el('p', 'sr-sect__note', L.replay.reduced);
  replay.appendChild(reducedLine);
  replay.appendChild(el('p', 'sr-sect__note', L.replay.note));
  pane.appendChild(replay);

  // --- the filters -----------------------------------------------------------------------------------------------
  const outcome = chipGroup({
    label: L.filters.outcome,
    options: ['all', 'S', 'F', 'P', 'other'].map((k) => ({ id: k === 'all' ? '' : k, text: L.outcomeChips[k] })),
    value: '',
    onChange: (v) => { st.outcome = v; refresh(); },
  });
  const whenBox = el('div', 'sr-cat__filter');
  const whenLabel = el('label', 'sr-cat__filterlabel', L.filters.when);
  whenLabel.htmlFor = 'sr-launches-when';
  const when = el('select', 'ui-select ui-select--block sr-launches__when');
  when.id = 'sr-launches-when';
  const opt = (value, text) => { const o = el('option', '', text); o.value = value; return o; };
  when.appendChild(opt('', L.whenAny));
  const dg = el('optgroup');
  dg.label = L.decades;
  for (let d = decadeOf(lastYear); d >= decadeOf(firstYear); d -= 10) dg.appendChild(opt(`${d}s`, t(L.decade, { d })));
  const yg = el('optgroup');
  yg.label = L.years;
  for (let y = lastYear; y >= firstYear; y--) yg.appendChild(opt(String(y), String(y)));
  when.append(dg, yg);
  when.addEventListener('change', () => setWhen(when.value, { draw: true }));
  whenBox.append(whenLabel, when);

  const byState = countBy(rows, 'state');
  const chipStates = byState.filter(([, n]) => n >= COUNTRY_MIN).map(([s]) => s);
  const statesWithChip = new Set(chipStates);
  const ccOf = new Map(rows.map((r) => [r.state, r.cc]));
  const country = chipGroup({
    label: L.filters.country,
    options: [{ id: '', text: L.countryAll }, ...chipStates.map((s) => ({ id: s, text: countryName(ccOf.get(s), s) })), { id: '*', text: L.elsewhere }],
    value: '',
    onChange: (v) => { st.state = v; refresh(); },
  });

  const field = el('div', 'sr-cat__field');
  const input = el('input', 'sr-cat__input sr-launches__text');
  input.type = 'search';
  input.placeholder = L.filters.text;
  input.setAttribute('aria-label', L.filters.text);
  let typing = 0;
  input.addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(() => { st.text = input.value; refresh(); }, 150); });
  field.appendChild(input);
  pane.append(outcome.el, whenBox, country.el, field);

  // --- the table -------------------------------------------------------------------------------------------------
  const status = el('p', 'sr-cat__lead sr-launches__status');
  status.setAttribute('role', 'status');
  const outcomeText = (r) => {
    const pct = partialPercent(r.out);
    return pct !== null ? t(L.partial, { pct }) : L.outcome[r.kind];
  };
  const table = buildTable({
    label: L.tableLabel,
    sortKey: 'date',
    desc: true,
    columns: [
      { key: 'date', label: L.columns.date, get: (r) => r.t, text: (r) => String(r.t).slice(0, 10), descFirst: true },
      { key: 'vehicle', label: L.columns.vehicle, get: (r) => r.veh },
      { key: 'site', label: L.columns.site, get: (r) => r.siteName },
      { key: 'payload', label: L.columns.payload, get: (r) => r.pay || r.tag, head: true },
      { key: 'outcome', label: L.columns.outcome, get: (r) => outcomeText(r), text: (r) => outcomeText(r), title: (r) => { const p = partialPercent(r.out); return p !== null ? t(L.outcomeTitle, { pct: p }) : ''; } },
    ],
    onRow: (r) => flyTo(r),
  });
  pane.append(status, table.el);
  const readMs = archive.updated ? Date.parse(`${archive.updated}T00:00:00Z`) : NaN;
  pane.appendChild(sourceLine({ source: L.sourceName, url: 'https://planet4589.org/space/gcat/', licence: L.licence, readMs, via }));

  // --- behaviour -------------------------------------------------------------------------------------------------
  let arcs = null;
  let arcsLoad = null;
  const wantArcs = () => arcsLoad || (arcsLoad = import('../scene/launcharcs.js').then((m) => { arcs = m.createLaunchArcs(ctx); return arcs; }).catch((e) => { arcsLoad = null; console.warn('the launch arcs did not load', e); return null; }));
  const draw = (items) => wantArcs().then((a) => a && a.draw(items));

  function paintYearLine(year) {
    const n = rows.filter((r) => r.year === year).length;
    yearLine.textContent = t(L.replay.yearValue, { year, n: fmt.int(n) });
    slider.setAttribute('aria-valuetext', yearLine.textContent);
  }

  function refresh() {
    table.set(filterRows(rows, { ...st, states: statesWithChip }));
  }

  function setWhen(value, opts = {}) {
    st.when = value || '';
    when.value = st.when;
    const y = /^\d{4}$/.test(st.when) ? Number(st.when) : null;
    if (y !== null) { slider.value = String(y); paintYearLine(y); if (opts.draw) draw(yearItems(rows, y)); }
    if (api.writeLink) api.writeLink(st.when);
    refresh();
  }

  slider.addEventListener('input', () => { stop(); setWhen(slider.value, { draw: true }); });

  let raf = 0;
  let last = 0;
  function frame(ts) {
    if (!st.playing) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    st.now += dt * YEARS_PER_SECOND;
    if (st.now >= lastYear + 1) { st.now = lastYear + 1; stop(); setWhen(String(lastYear), { draw: true }); return; }
    const y = Math.floor(st.now);
    if (String(y) !== slider.value) { slider.value = String(y); paintYearLine(y); }
    if (arcs) arcs.draw(replayItems(rows, st.now));
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (reducedMotion()) return;
    const from = Number(slider.value);
    st.now = from >= lastYear ? firstYear : from;
    st.playing = true;
    last = 0;
    play.textContent = L.replay.pause;
    play.setAttribute('aria-pressed', 'true');
    if (ctx.stage && ctx.stage.worldId !== 'earth' && typeof ctx.flyToRecord === 'function' && typeof ctx.recordById === 'function') {
      const earth = ctx.recordById('earth');
      if (earth) ctx.flyToRecord(earth);
    }
    wantArcs().then(() => { if (st.playing) raf = requestAnimationFrame(frame); });
  }
  function stop() {
    if (!st.playing) return;
    st.playing = false;
    cancelAnimationFrame(raf);
    raf = 0;
    play.textContent = L.replay.play;
    play.setAttribute('aria-pressed', 'false');
    setWhen(slider.value);
  }
  play.setAttribute('aria-pressed', 'false');
  play.addEventListener('click', () => (st.playing ? stop() : start()));
  const paintMotion = () => {
    const still = reducedMotion();
    play.hidden = still;
    reducedLine.hidden = !still;
    play.title = t(L.replay.playTitle, { year: Number(slider.value) >= lastYear ? firstYear : slider.value });
    if (still) stop();
  };
  if (typeof matchMedia === 'function') { const mq = matchMedia('(prefers-reduced-motion: reduce)'); if (mq.addEventListener) mq.addEventListener('change', paintMotion); }
  slider.addEventListener('change', paintMotion);
  paintMotion();
  paintYearLine(lastYear);

  function flyTo(row) {
    const rec = siteRecord(row);
    if (!rec) { status.textContent = L.noPlace; return; }
    stop();
    if (typeof ctx.flyToRecord === 'function') ctx.flyToRecord(rec);
    status.textContent = row.pad ? t(L.flewTo, { site: row.siteName, pad: row.pad }) : t(L.flewToNoPad, { site: row.siteName });
    draw([{ tag: row.tag, lat: row.lat, lon: row.lon, inc: row.inc, k: 1, alpha: 1, fail: row.kind === 'F' || row.kind === 'E' || row.kind === 'A' }]);
    track('select_object', { object_class: 'launch', object_id: row.tag });
  }

  refresh();

  return {
    show(arg) {
      const w = whenFromArg(arg);
      if (w !== st.when) setWhen(w, { draw: true });
      else if (/^\d{4}$/.test(w)) draw(yearItems(rows, Number(w)));
    },
    hide() {
      stop();
      if (arcs) arcs.clear();
    },
  };
}
