// pages/skyphoto.js -- "Name the stars in your photo" (forge #572), the tool on /sky-photo/ (scripts/seo_skyphoto.py).
//
// A person picks a night-sky photo from their device; it is drawn into a canvas here and NEVER LEAVES THE DEVICE: the
// file becomes a blob: URL (createObjectURL, revoked when the next one comes), its pixels are read by the canvas, and
// the only requests this page makes are for our own data files (the stars, the constellations, the words of the
// page's language, the planets' engine). tests/test_skyphoto.mjs reads this file to hold that promise.
//
// Lining up is ASSISTED, and the page says so: the person taps two stars they know and names them (or gives a time,
// a place and a direction for a rough first sky). A blind plate solve, finding the stars with no help, is not here:
// pages/skyphoto-core.js says why, in sizes. Then the overlay: our constellation lines and names (d3-celestial), our
// named stars (HYG), and with a time the planets and the Moon (Astronomy Engine), all computed on the device.
// Save draws the photo again at its own size (up to 4 096 pixels across) with the overlay and a credit line.
import { COPY, CITIES } from '../copy/en.skyphoto.js';
import { sr } from '../ui/platform-bridge.js';
import * as core from './skyphoto-core.js';

const HERE = import.meta.url;
const dataUrl = (p) => new URL(`../../${p}`, HERE).href;
const MAX_SIDE = 4096; // the working (and saved) size: 12.6 megapixels at 4:3, about 50 MB of canvas
const LUM_SIDE = 1600; // the size the stars are looked for at
const COMPASS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

let W = COPY.skyPhoto;
const fill = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function cssVar(name, fallbackVar) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || getComputedStyle(document.documentElement).getPropertyValue(fallbackVar).trim();
}

async function words() {
  const tag = (document.documentElement.lang || 'en').toLowerCase();
  const code = tag.split('-')[0];
  if (code === 'en' || !/^[a-z]{2}$/.test(code)) return;
  try {
    // copy/index.js's own overlay rule (a key the language lacks stays English), fetched only for another language
    const [{ overlay }, tr] = await Promise.all([import('../copy/index.js'), import(`../copy/${code}.js`)]);
    if (tr && tr.COPY && tr.COPY.skyPhoto) overlay(COPY.skyPhoto, tr.COPY.skyPhoto);
  } catch { /* English words, a working page */ }
  try {
    const r = await fetch(dataUrl(`data/names/${code}.json`));
    if (r.ok) localNames = (await r.json()).names || {};
  } catch { /* the catalogue's names */ }
}
let localNames = {};
const starName = (n) => localNames[n] || n;

async function getJson(path) {
  const r = await fetch(dataUrl(path));
  if (!r.ok) throw new Error(path);
  return r.json();
}

/** Our sky: the constellation figures, their names, the named stars, brightest first. */
async function loadSky() {
  const [lines, names, stars] = await Promise.all([
    getJson('data/constellations.lines.json'), getJson('data/constellation-names.json'), getJson('data/skystars.names.json'),
  ]);
  return {
    lines: lines.features.map((f) => ({
      id: f.id,
      segs: (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates)
        .flatMap((l) => l.slice(1).map((pt, i) => [core.radecDir(l[i][0], l[i][1]), core.radecDir(pt[0], pt[1])])),
    })),
    names: names.filter((r) => typeof r.ra === 'number').map((r) => ({ id: r.id, name: r.name, dir: core.radecDir(r.ra, r.dec) })),
    stars: stars.rows.filter((r) => r[0] && Number.isFinite(r[3])).map((r) => ({ name: r[0], mag: r[3], dir: core.radecDir(r[1], r[2]) }))
      .sort((a, b) => a.mag - b.mag),
  };
}

/** The planets and the Moon at `date` from `place` (or the Earth's centre's neighbourhood), computed here. */
async function loadBodies(date, place) {
  const [{ bodyView }, Astronomy] = await Promise.all([import('../sky/skybodies.js'), import('../../vendor/astronomy.js')]);
  const obs = new Astronomy.Observer(place ? place.latDeg : 0, place ? place.lonDeg : 0, 0);
  const out = [];
  for (const id of ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    const v = bodyView(id, date, obs);
    if (v) out.push({ id, name: W.bodies[id] || id, dir: v.dir, mag: v.mag });
  }
  return { out, eqjToLocal: (await import('../sky/skybodies.js')).eqjToLocal, obs };
}

export async function mount(root) {
  await words();
  W = COPY.skyPhoto;
  root.replaceChildren();
  const state = {
    url: null, img: null, w: 0, h: 0, photo: null, lum: null, lw: 0, lh: 0, lumScale: 1,
    sky: null, marks: [], snapped: [], rough: null, sol: null, bodies: [], mode: 'stars',
    show: { lines: true, names: true, stars: true, bodies: true }, when: null, fromPhoto: false, place: null,
    facing: 's', alt: 30, fov: 65, pending: -1,
  };
  const skyReady = loadSky().then((s) => { state.sky = s; return s; });

  // ---- the start: the picker --------------------------------------------------------------------------------------
  const start = el('div', 'skyphoto__start');
  const pickLabel = el('label', 'ui-btn ui-btn--primary skyphoto__pick');
  pickLabel.append(el('span', 'ui-btn__label', W.pick));
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.className = 'skyphoto__file';
  pickLabel.append(input);
  const dropNote = el('p', 'skyphoto__drop', W.drop);
  const priv = el('p', 'skyphoto__private', W.private);
  start.append(pickLabel, dropNote, priv);

  // ---- the work: the photo and the controls ----------------------------------------------------------------------
  const work = el('div', 'skyphoto__work');
  work.hidden = true;
  const stage = el('div', 'skyphoto__stage');
  const canvas = el('canvas', 'skyphoto__canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', W.canvasLabel);
  canvas.tabIndex = 0;
  stage.append(canvas);
  const side = el('div', 'skyphoto__side');
  const status = el('p', 'skyphoto__status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const mode = el('div', 'ui-seg ui-seg--block');
  mode.setAttribute('role', 'group');
  mode.setAttribute('aria-label', W.modeLabel);
  const modeBtns = {};
  for (const [id, label] of [['stars', W.modeStars], ['rough', W.modeRough]]) {
    const b = el('button', 'ui-seg__btn', label);
    b.type = 'button';
    b.addEventListener('click', () => { state.mode = id; render(); });
    modeBtns[id] = b;
    mode.append(b);
  }
  const how = el('p', 'skyphoto__how');

  // stars: the marks, the picker of names
  const marksBox = el('div', 'skyphoto__marks');
  const chooser = el('div', 'skyphoto__chooser');
  const snapBtn = el('button', 'ui-btn ui-btn--secondary ui-btn--block', W.snap);
  snapBtn.type = 'button';
  const undoBtn = el('button', 'ui-btn ui-btn--quiet ui-btn--sm', W.undo);
  undoBtn.type = 'button';
  const fitLine = el('p', 'skyphoto__fit');

  // when and where (both modes: the planets need a time)
  const whenBox = el('div', 'skyphoto__field');
  const whenLab = el('label', 'skyphoto__label', W.when);
  const whenIn = document.createElement('input');
  whenIn.type = 'datetime-local';
  whenIn.step = '60';
  whenIn.id = 'skyphoto-when';
  whenIn.className = 'skyphoto__input';
  whenLab.htmlFor = whenIn.id;
  const whenNote = el('p', 'skyphoto__note', W.whenNote);
  whenBox.append(whenLab, whenIn, whenNote);
  const whereBox = el('div', 'skyphoto__field');
  const whereLab = el('label', 'skyphoto__label', W.where);
  const whereSel = el('select', 'ui-select ui-select--block');
  whereSel.id = 'skyphoto-where';
  whereLab.htmlFor = whereSel.id;
  whereSel.append(new Option(W.whereNone, ''));
  CITIES.map((c, i) => [c, i]).sort((a, b) => a[0].name.localeCompare(b[0].name)).forEach(([c, i]) => whereSel.append(new Option(`${c.name}, ${c.country}`, String(i))));
  whereBox.append(whereLab, whereSel, el('p', 'skyphoto__note', W.whereNote));

  // rough: which way
  const roughBox = el('div', 'skyphoto__rough');
  const facingLab = el('p', 'skyphoto__label', W.facing);
  const facing = el('div', 'ui-seg ui-seg--wrap');
  facing.setAttribute('role', 'group');
  facing.setAttribute('aria-label', W.facing);
  const facingBtns = {};
  for (const c of COMPASS) {
    const b = el('button', 'ui-seg__btn', W.compass[c]);
    b.type = 'button';
    b.addEventListener('click', () => { state.facing = c; render(); });
    facingBtns[c] = b;
    facing.append(b);
  }
  const range = (label, min, max, key, fmt) => {
    const lab = el('label', 'skyphoto__label skyphoto__rangelab');
    const t = el('span', '', label);
    const v = el('span', 'skyphoto__value');
    const r = document.createElement('input');
    r.type = 'range';
    r.className = 'ui-range';
    r.min = String(min); r.max = String(max); r.step = '1';
    r.value = String(state[key]);
    const show = () => { v.textContent = fill(fmt, { n: r.value }); r.setAttribute('aria-valuetext', v.textContent); };
    r.addEventListener('input', () => { state[key] = Number(r.value); show(); });
    show();
    lab.append(t, v, r);
    return lab;
  };
  const drawRough = el('button', 'ui-btn ui-btn--secondary ui-btn--block', W.drawRough);
  drawRough.type = 'button';
  roughBox.append(facingLab, facing, range(W.height, 0, 85, 'alt', W.heightValue), range(W.field, 5, 120, 'fov', W.fieldValue),
    el('p', 'skyphoto__note', W.fieldNote), drawRough);

  // what to show
  const showBox = el('fieldset', 'skyphoto__show');
  showBox.append(el('legend', 'skyphoto__label', W.show));
  for (const [k, label] of [['lines', W.showLines], ['names', W.showNames], ['stars', W.showStars], ['bodies', W.showBodies]]) {
    const lab = el('label', 'ui-opt');
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.className = 'ui-check';
    c.checked = state.show[k];
    c.addEventListener('change', () => { state.show[k] = c.checked; draw(); });
    lab.append(c, document.createTextNode(` ${label}`));
    showBox.append(lab);
  }

  const saveBtn = el('button', 'ui-btn ui-btn--primary ui-btn--block', W.save);
  saveBtn.type = 'button';
  const againBtn = el('button', 'ui-btn ui-btn--quiet ui-btn--block', W.another);
  againBtn.type = 'button';
  const privSmall = el('p', 'skyphoto__note', W.private);

  side.append(mode, how, marksBox, chooser, undoBtn, fitLine, snapBtn, roughBox, whenBox, whereBox, showBox, status, saveBtn, againBtn, privSmall);
  work.append(stage, side);
  root.append(start, work);

  // ---- the photo ---------------------------------------------------------------------------------------------------
  async function takeFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type || 'image/')) { say(W.notImage); return; }
    say(W.loading);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try { await img.decode(); } catch { URL.revokeObjectURL(url); say(W.notImage); start.hidden = false; return; }
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = url;
    state.img = img;
    const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    state.w = Math.round(img.naturalWidth * s);
    state.h = Math.round(img.naturalHeight * s);
    const photo = document.createElement('canvas');
    photo.width = state.w; photo.height = state.h;
    photo.getContext('2d').drawImage(img, 0, 0, state.w, state.h);
    state.photo = photo;
    state.lumScale = Math.min(1, LUM_SIDE / Math.max(state.w, state.h));
    state.lw = Math.max(1, Math.round(state.w * state.lumScale));
    state.lh = Math.max(1, Math.round(state.h * state.lumScale));
    const small = document.createElement('canvas');
    small.width = state.lw; small.height = state.lh;
    const sc = small.getContext('2d', { willReadFrequently: true });
    sc.drawImage(photo, 0, 0, state.lw, state.lh);
    state.lum = core.luminance(sc.getImageData(0, 0, state.lw, state.lh).data, state.lw, state.lh);
    state.marks = []; state.snapped = []; state.rough = null; state.sol = null; state.pending = -1;
    // the time it was taken, if the photo says (read here, from the file's first bytes)
    state.fromPhoto = false;
    try {
      const head = new Uint8Array(await file.slice(0, 262144).arrayBuffer());
      const t = core.exifTaken(head);
      if (t) { whenIn.value = t; state.fromPhoto = true; }
    } catch { /* no time in it */ }
    start.hidden = true;
    work.hidden = false;
    await skyReady.catch(() => null);
    say(s < 1 ? fill(W.tooBig, { w: state.w, h: state.h }) : '');
    await readWhen();
    render();
  }
  input.addEventListener('change', () => { takeFile(input.files && input.files[0]); input.value = ''; });
  root.addEventListener('dragover', (e) => { e.preventDefault(); });
  root.addEventListener('drop', (e) => { e.preventDefault(); takeFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  againBtn.addEventListener('click', () => { work.hidden = true; start.hidden = false; input.click(); });

  // ---- tapping stars -----------------------------------------------------------------------------------------------
  const toPhoto = (ev) => {
    const r = canvas.getBoundingClientRect();
    return [(ev.clientX - r.left) * (state.w / r.width), (ev.clientY - r.top) * (state.h / r.height)];
  };
  canvas.addEventListener('click', (ev) => {
    if (!state.photo) return;
    let p = toPhoto(ev);
    const rad = Math.max(state.w, state.h) * 0.012;
    const pk = core.findPeak(state.lum, state.lw, state.lh, p[0] * state.lumScale, p[1] * state.lumScale, Math.max(3, rad * state.lumScale));
    if (pk && pk.snr > 4) p = [pk.x / state.lumScale, pk.y / state.lumScale];
    if (state.pending >= 0) state.marks[state.pending].px = p;
    else { state.marks.push({ px: p, star: null }); state.pending = state.marks.length - 1; }
    state.mode = 'stars';
    render();
  });
  undoBtn.addEventListener('click', () => { state.marks.pop(); state.pending = -1; state.snapped = []; solve(); render(); });

  function candidates(mark) {
    const stars = state.sky ? state.sky.stars.filter((s) => s.mag <= 4) : [];
    const used = new Set(state.marks.filter((m) => m.star).map((m) => m.star.name));
    const free = stars.filter((s) => !used.has(s.name));
    const guide = state.sol || state.rough;
    if (guide) {
      return free.map((s) => ({ s, p: core.project(guide, s.dir) })).filter((x) => x.p)
        .map((x) => ({ s: x.s, d: Math.hypot(x.p[0] - mark.px[0], x.p[1] - mark.px[1]) }))
        .sort((a, b) => a.d - b.d).slice(0, 6).map((x) => x.s);
    }
    return free.slice(0, 8);
  }
  function name(i, star) {
    state.marks[i].star = star;
    state.pending = -1;
    state.snapped = [];
    solve();
    render();
  }

  // ---- lining up ---------------------------------------------------------------------------------------------------
  function pairs() { return state.marks.filter((m) => m.star).map((m) => ({ name: m.star.name, dir: m.star.dir, px: m.px })); }
  function solve() {
    const ps = pairs();
    const centre = [state.w / 2, state.h / 2];
    if (ps.length >= 2) state.sol = core.solveFromPairs(ps.concat(state.snapped), centre);
    else if (state.rough && ps.length === 1) {
      const q = core.project(state.rough, ps[0].dir);
      state.sol = q ? { ...state.rough, B: [state.rough.B[0] + ps[0].px[0] - q[0], state.rough.B[1] + ps[0].px[1] - q[1]] } : state.rough;
    } else state.sol = state.rough;
  }
  snapBtn.addEventListener('click', () => {
    if (!state.sol || !state.sky) return;
    const named = pairs();
    const found = core.snapPairs(state.sol, state.lum, state.lw, state.lh, state.lumScale, state.sky.stars)
      .filter((p) => !named.some((n) => n.name === p.name));
    if (found.length < 2) { say(W.snapNone); return; }
    const centre = [state.w / 2, state.h / 2];
    const first = core.solveFromPairs(named.concat(found), centre, { mirrored: state.sol.mirrored });
    const pr = first ? core.pruneOutliers(first, named.concat(found), centre) : null;
    if (!pr) { say(W.snapNone); return; }
    state.snapped = pr.pairs.filter((p) => !named.some((n) => n.name === p.name));
    state.sol = pr.sol;
    say(fill(W.snapped, { count: state.snapped.length }));
    render();
  });

  async function readWhen() {
    const v = whenIn.value;
    const city = whereSel.value === '' ? null : CITIES[Number(whereSel.value)];
    state.place = city;
    state.when = v ? new Date(v) : null;
    state.bodies = [];
    if (!state.when || !Number.isFinite(+state.when)) { state.when = null; return; }
    try { state.bodies = (await loadBodies(state.when, city)).out; } catch { say(W.planetsFailed); }
  }
  whenIn.addEventListener('change', async () => { state.fromPhoto = false; await readWhen(); render(); });
  whereSel.addEventListener('change', async () => { await readWhen(); render(); });

  drawRough.addEventListener('click', async () => {
    await readWhen();
    if (!state.when || !state.place) { say(W.roughNeeds); return; }
    const { eqjToLocal, obs } = await loadBodies(state.when, state.place);
    const m = eqjToLocal(state.when, obs);
    const toEq = (l) => [m[0] * l[0] + m[3] * l[1] + m[6] * l[2], m[1] * l[0] + m[4] * l[1] + m[7] * l[2], m[2] * l[0] + m[5] * l[1] + m[8] * l[2]];
    const az = COMPASS.indexOf(state.facing) * 45;
    state.rough = core.roughSolution({
      centreDir: toEq(core.localDir(state.alt, az)), upDir: toEq(core.localDir(Math.min(89, state.alt + 1), az)),
      hfovDeg: state.fov, width: state.w, height: state.h,
    });
    state.snapped = [];
    solve();
    say(W.roughDone);
    state.mode = 'stars';
    render();
  });

  // ---- drawing -----------------------------------------------------------------------------------------------------
  function paint(g, scale, forSave) {
    const w = state.w * scale, h = state.h * scale;
    g.drawImage(state.photo, 0, 0, w, h);
    g.save();
    g.beginPath(); g.rect(0, 0, w, h); g.clip(); // nothing drawn past the photo (the saved picture's credit band is below it)
    const sol = state.sol;
    // label and line sizes: CSS pixels on the screen; a thousandth of the photo's long side per unit in the saved picture
    const u = forSave ? Math.max(state.w, state.h) / 1000 : Math.max(0.75, Math.min(1, w / 700)); // a phone's photo is small: smaller names
    const atm = cssVar('--atm', '--sr-atmosphere');
    const tx = cssVar('--tx', '--sr-text');
    const dim = cssVar('--dim', '--sr-text-dim');
    const bg = cssVar('--bg', '--sr-bg');
    const font = cssVar('--sans', '--sr-font');
    const cap = cssVar('--cap', '--sr-font');
    const label = (text, x, y, size, colour, face, align = 'left') => {
      g.font = `600 ${size}px ${face}`;
      g.textAlign = align;
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = Math.max(2, size * 0.28);
      g.strokeStyle = bg;
      g.globalAlpha = 0.75;
      g.strokeText(text, x, y);
      g.globalAlpha = 1;
      g.fillStyle = colour;
      g.fillText(text, x, y);
    };
    if (sol && state.sky) {
      const o = core.overlay(sol, state.w, state.h, { ...state.sky, bodies: state.show.bodies ? state.bodies : [] }, { labels: forSave ? 40 : Math.min(40, Math.round(w / 22)) });
      if (state.show.lines) {
        g.strokeStyle = atm;
        g.globalAlpha = 0.6;
        g.lineWidth = Math.max(1, 1.6 * u);
        g.beginPath();
        for (const l of o.lines) { g.moveTo(l.a[0] * scale, l.a[1] * scale); g.lineTo(l.b[0] * scale, l.b[1] * scale); }
        g.stroke();
        g.globalAlpha = 1;
      }
      // every name keeps its own box: constellations first, then the stars, brightest first; one that would cover another is left out
      const taken = [];
      const free = (x0, y0, x1, y1) => x0 >= 0 && x1 <= w && y0 >= 0 && y1 <= h && !taken.some((t) => x0 < t[2] && x1 > t[0] && y0 < t[3] && y1 > t[1]);
      if (state.show.names) {
        const cs = 15 * u;
        g.font = `600 ${cs}px ${cap}`;
        for (const n of o.names) {
          const text = n.name.toUpperCase();
          const tw = g.measureText(text).width;
          const box = [n.x * scale - tw / 2, n.y * scale - cs * 0.7, n.x * scale + tw / 2, n.y * scale + cs * 0.7];
          if (!free(...box)) continue;
          taken.push(box);
          label(text, n.x * scale, n.y * scale, cs, dim, cap, 'center');
          g.font = `600 ${cs}px ${cap}`;
        }
      }
      if (state.show.stars) {
        // brightest first: a name goes right of its star, else left of it, else not at all (no name over a name)
        const size = 13 * u;
        g.font = `600 ${size}px ${font}`;
        for (const s of o.stars) {
          if (!s.label) continue;
          const r = (9 - Math.min(4, Math.max(-1, s.mag))) * u;
          const x = s.x * scale, y = s.y * scale;
          g.strokeStyle = tx;
          g.globalAlpha = 0.7;
          g.lineWidth = Math.max(1, 1.2 * u);
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
          g.globalAlpha = 1;
          const text = starName(s.name);
          const tw = g.measureText(text).width;
          const gap = r + 4 * u;
          if (free(x + gap, y - size * 0.7, x + gap + tw, y + size * 0.7)) {
            taken.push([x + gap, y - size * 0.7, x + gap + tw, y + size * 0.7]);
            label(text, x + gap, y, size, tx, font);
          } else if (free(x - gap - tw, y - size * 0.7, x - gap, y + size * 0.7)) {
            taken.push([x - gap - tw, y - size * 0.7, x - gap, y + size * 0.7]);
            label(text, x - gap, y, size, tx, font, 'right');
          }
          g.font = `600 ${size}px ${font}`;
        }
      }
      for (const b of o.bodies) {
        const r = 12 * u;
        g.strokeStyle = tx;
        g.lineWidth = Math.max(1.5, 2 * u);
        g.beginPath(); g.arc(b.x * scale, b.y * scale, r, 0, Math.PI * 2); g.stroke();
        // a tick and the name above the body, or below it when the top of the photo is too close
        const dir = b.y * scale - r - 24 * u < 0 ? 1 : -1;
        g.beginPath(); g.moveTo(b.x * scale, b.y * scale + dir * (r + 3 * u)); g.lineTo(b.x * scale, b.y * scale + dir * (r + 10 * u)); g.stroke();
        label(b.name, b.x * scale, b.y * scale + dir * (r + 18 * u), 15 * u, tx, font, 'center');
      }
    }
    g.restore();
    if (!forSave) {
      state.marks.forEach((m, i) => {
        const x = m.px[0] * scale, y = m.px[1] * scale;
        g.strokeStyle = atm;
        g.lineWidth = 2.5 * u;
        g.beginPath(); g.arc(x, y, 16 * u, 0, Math.PI * 2); g.stroke();
        label(String(i + 1), x - 20 * u, y - 20 * u, 15 * u, atm, font, 'right');
      });
    }
  }

  function draw() {
    if (!state.photo) return;
    const box = stage.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.max(1, box.width);
    const cssH = cssW * state.h / state.w;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(g, cssW / state.w, false);
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => draw()).observe(stage);

  function render() {
    for (const [id, b] of Object.entries(modeBtns)) b.setAttribute('aria-pressed', String(state.mode === id));
    for (const [c, b] of Object.entries(facingBtns)) b.setAttribute('aria-pressed', String(state.facing === c));
    const starsMode = state.mode === 'stars';
    how.textContent = starsMode ? W.howStars : W.howRough;
    roughBox.hidden = starsMode;
    marksBox.hidden = !starsMode;
    chooser.hidden = !starsMode || state.pending < 0;
    undoBtn.hidden = !starsMode || state.marks.length === 0;
    // the marks
    marksBox.replaceChildren();
    state.marks.forEach((m, i) => {
      if (!m.star) return;
      const row = el('div', 'skyphoto__mark');
      row.append(el('span', 'skyphoto__marktext', fill(W.starMark, { n: i + 1, name: starName(m.star.name) })));
      marksBox.append(row);
    });
    const named = state.marks.filter((m) => m.star).length;
    if (starsMode && state.pending < 0 && named < 3) marksBox.append(el('p', 'skyphoto__next', fill(W.tapStar, { n: named + 1 })));
    // the chooser of names
    chooser.replaceChildren();
    if (state.pending >= 0 && state.sky) {
      const mark = state.marks[state.pending];
      chooser.append(el('p', 'skyphoto__label', W.whichStar));
      for (const s of candidates(mark)) {
        const b = el('button', 'ui-row ui-row--plain');
        b.type = 'button';
        b.append(el('span', 'ui-row__t', starName(s.name)), el('span', 'ui-row__meta', `${s.mag.toFixed(1)}`));
        b.addEventListener('click', () => name(state.pending, s));
        chooser.append(b);
      }
      const sel = el('select', 'ui-select ui-select--block');
      sel.setAttribute('aria-label', W.allStars);
      sel.append(new Option(W.allStars, ''));
      state.sky.stars.filter((s) => s.mag <= 4).slice().sort((a, b) => starName(a.name).localeCompare(starName(b.name)))
        .forEach((s) => sel.append(new Option(starName(s.name), s.name)));
      sel.addEventListener('change', () => { const s = state.sky.stars.find((x) => x.name === sel.value); if (s) name(state.pending, s); });
      chooser.append(sel);
    }
    // the fit
    const ps = pairs().concat(state.snapped);
    fitLine.replaceChildren();
    if (state.sol && ps.length >= 2) {
      const d = core.describe(state.sol, state.w, state.h);
      const lines = [ps.length === 2 ? W.alignedTwo : fill(W.aligned, { count: ps.length, w: Math.round(d.fovDeg[0]) })];
      if (ps.length >= 3) {
        const r = core.rms(core.residuals(state.sol, ps));
        const px = r < 10 ? r.toFixed(1) : String(Math.round(r));
        lines.push(fill(r > Math.max(state.w, state.h) * 0.004 ? W.fitPoor : W.fit, { px }));
      }
      if (state.sol.mirrored) lines.push(W.mirrored);
      fitLine.textContent = lines.join(' ');
    }
    snapBtn.hidden = !starsMode || !state.sol;
    whenNote.textContent = state.fromPhoto ? W.whenFromPhoto : state.when ? W.whenNote : W.whenNone;
    saveBtn.disabled = !state.sol;
    draw();
  }

  // ---- saving ------------------------------------------------------------------------------------------------------
  saveBtn.addEventListener('click', async () => {
    if (!state.photo || !state.sol) return;
    try {
      const band = Math.round(Math.max(state.w, state.h) * 0.04);
      const out = document.createElement('canvas');
      out.width = state.w; out.height = state.h + band;
      const g = out.getContext('2d');
      g.fillStyle = cssVar('--bg', '--sr-bg');
      g.fillRect(0, 0, out.width, out.height);
      paint(g, 1, true);
      g.fillStyle = cssVar('--dim', '--sr-text-dim');
      g.font = `400 ${Math.round(band * 0.34)}px ${cssVar('--sans', '--sr-font')}`;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.fillText(`${W.credit} · ${W.creditData}`, band * 0.4, state.h + band / 2);
      const blob = await new Promise((ok, no) => out.toBlob((b) => (b ? ok(b) : no(new Error('toBlob'))), 'image/png'));
      const file = 'sky-photo-named.png';
      const a = document.createElement('a');
      const href = URL.createObjectURL(blob);
      a.href = href;
      a.download = file;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 4000);
      say(fill(W.saved, { file }));
      sr('track', 'share', { method: 'download', content_type: 'sky_photo' });
    } catch { say(W.saveFailed); }
  });

  function say(text) { status.replaceChildren(...(text ? [text] : [])); }
  render();
  return { state, takeFile };
}

const root = typeof document !== 'undefined' && document.querySelector('[data-skyphoto]');
if (root) mount(root).then((api) => { root.skyphoto = api; }).catch((e) => console.warn('sky photo: the tool did not start', e));
