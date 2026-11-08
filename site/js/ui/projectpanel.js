// ui/projectpanel.js -- Dome and 360: the panel that turns the picture into a planetarium's dome master or a
// 360-degree frame, and saves a frame or a skybox (forge #157). The drawing is scene/projection.js.
//
// Contract: createProjectPanel(ctx, { renderer, scene, camera }) -> { open({ opener }), close(), isOpen(), set(value),
//                                                                    fromLink(value), active, render(), state(), root }
//
// WHAT IT OFFERS. The picture as it is (Normal), a 180-degree dome (with its tilt: 0, 15, 30 or 45 degrees) or a
// 360-degree frame, live on the screen; "Save this frame" as a PNG at a size a dome or a 360 player takes; and
// "Save a skybox", the six faces of the cube as one strip. `#proj=` is written while a projection is on, so a
// planetarium's laptop opens on it: `#trip=to-the-edge&proj=dome,30` plays a trip on the dome
// (docs/PLANETARIUMS.md). Every saved file is free to use with the credit the panel prints.
//
// WHO GETS IT LIVE (scene/projection.js faceSizeFor): a desktop GPU at 1024 or 2048 px a face; a phone at 512 px,
// with a line saying that a phone's dome is a preview; a GPU that cannot hold a 512 px cube map, nothing, and a
// line saying why. Saving a frame works on any device that can draw the map: it is drawn once.
//
// Phones: the phone's sheet (ui/sheet.js), at half. Keyboard: a region with a heading, the choices are a radio
// group of native inputs, Escape closes it with focus inside; closing it keeps the projection, as a dome needs.
// NEVER AT BOOT: main.js imports this on the share sheet's Dome and 360, or a `#proj=` link.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.make.js';
import { loadCss } from './latercss.js';
import { createSheet } from './sheet.js';
import { toast } from './share.js';
import { write as writeUrl } from './urlstate.js';
import { saveBlob } from './printcompose.js';
import { createProjection, parseProj, projValue } from '../scene/projection.js';

/** The sizes a saved frame is offered at: a dome master's side, a 360 frame's width (its height is half). */
export const DOME_SIZES = [2048, 4096, 8192];
export const WIDE_SIZES = [4096, 8192];
export const SKY_SIZES = [1024, 2048];
export const TILTS = [0, 15, 30, 45];

/** The file name of a saved picture: `spaceradar-dome-2026-11-07-1403.png`. Pure. */
export function pictureName(kind, ms) {
  const d = new Date(Number(ms));
  const stamp = Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 16).replace('T', '-').replace(':', '') : 'now';
  return `spaceradar-${kind}-${stamp}.png`;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob gave nothing'))), 'image/png'));
}

export function createProjectPanel(ctx, gl) {
  const D = COPY.dome;
  const doc = document;
  // The phone's sheet measures the panel, so it is seated once the panel's rules have landed (css/make.css).
  const cssReady = loadCss('make', doc);
  const projection = createProjection(gl);
  let opener = null;

  const root = el('section', 'sr-make sr-make--small sr-float sr-over-clean');
  root.id = 'sr-dome';
  root.setAttribute('aria-labelledby', 'sr-dome-title');
  root.hidden = true;
  const head = el('div', 'sr-make__head');
  const title = el('h2', 'sr-make__title', D.title);
  title.id = 'sr-dome-title';
  title.tabIndex = -1;
  const closeBtn = el('button', 'sr-make__close', '×');
  closeBtn.type = 'button';
  closeBtn.title = D.close;
  closeBtn.setAttribute('aria-label', D.close);
  head.append(title, closeBtn);

  const body = el('div', 'sr-make__body');
  const kinds = el('div', 'sr-make__choices');
  kinds.setAttribute('role', 'radiogroup');
  kinds.setAttribute('aria-label', D.kindLabel);
  const radios = {};
  for (const [id, label] of [['', D.normal], ['dome', D.dome], ['360', D.wide]]) {
    const row = el('label', 'sr-make__choice');
    const r = el('input');
    r.type = 'radio';
    r.name = 'sr-dome-kind';
    r.value = id;
    row.append(r, el('span', null, label));
    kinds.appendChild(row);
    radios[id] = r;
  }
  const tiltWrap = el('label', 'sr-make__field');
  tiltWrap.appendChild(el('span', 'sr-make__fieldname', D.tilt));
  const tiltSel = el('select', 'sr-make__select');
  for (const d of TILTS) { const o = el('option', null, t(D.tiltDeg, { n: d })); o.value = String(d); tiltSel.appendChild(o); }
  tiltWrap.appendChild(tiltSel);
  const status = el('p', 'sr-make__status');
  status.setAttribute('role', 'status');
  const saveRow = el('div', 'sr-make__acts');
  const sizeWrap = el('label', 'sr-make__field');
  sizeWrap.appendChild(el('span', 'sr-make__fieldname', D.size));
  const sizeSel = el('select', 'sr-make__select');
  sizeWrap.appendChild(sizeSel);
  const frameBtn = el('button', 'sr-make__btn sr-make__btn--primary', D.saveFrame);
  frameBtn.type = 'button';
  const skyWrap = el('label', 'sr-make__field');
  skyWrap.appendChild(el('span', 'sr-make__fieldname', D.skySize));
  const skySel = el('select', 'sr-make__select');
  for (const s of SKY_SIZES) { const o = el('option', null, t(D.px, { n: fmt.int(s) })); o.value = String(s); skySel.appendChild(o); }
  skyWrap.appendChild(skySel);
  const skyBtn = el('button', 'sr-make__btn', D.saveSky);
  skyBtn.type = 'button';
  saveRow.append(sizeWrap, frameBtn, skyWrap, skyBtn);
  const credit = el('p', 'sr-make__note', D.credit);
  const how = el('p', 'sr-make__note', D.how);
  body.append(kinds, tiltWrap, status, saveRow, credit, how);
  root.append(head, body);
  doc.body.appendChild(root);

  const isPhone = () => doc.documentElement.classList.contains('sr-phone');
  const tier = () => (ctx.quality && Number.isFinite(ctx.quality.tier) ? ctx.quality.tier : 1);
  /** A projection is drawn over the map's own frame: not over an imagined world or a Moment, which draw their own. */
  const busy = () => !!((ctx.imagine && ctx.imagine.active) || (ctx.replay && ctx.replay.active));

  function sizes() {
    const p = projection.get();
    const wide = p && p.kind === '360';
    const max = projection.limits.maxBuffer || 4096;
    const list = (wide ? WIDE_SIZES : DOME_SIZES).filter((s) => s <= max);
    return list.length ? list : [Math.min(max, 2048)];
  }

  function paint() {
    const p = projection.get();
    const v = p ? p.kind : '';
    for (const [id, r] of Object.entries(radios)) r.checked = id === v;
    tiltWrap.hidden = !p || p.kind !== 'dome';
    if (p && p.kind === 'dome') tiltSel.value = String(p.tiltDeg);
    while (sizeSel.firstChild) sizeSel.removeChild(sizeSel.firstChild);
    for (const s of sizes()) {
      const o = el('option', null, p && p.kind === '360' ? t(D.pxWide, { w: fmt.int(s), h: fmt.int(s / 2) }) : t(D.pxSquare, { n: fmt.int(s) }));
      o.value = String(s);
      sizeSel.appendChild(o);
    }
    sizeWrap.hidden = !p;
    frameBtn.hidden = !p;
  }

  function say(line) { status.textContent = line || ''; }

  /** Turn a projection on or off from a link's value or the panel ('' or '0' is off). */
  function set(value) {
    const p = parseProj(value);
    if (p && busy()) { say(D.busy); return false; }
    const out = projection.set(p, { tier: tier(), phone: isPhone() });
    if (!out.ok) {
      say(D.noGpu);
      projection.set(null);
    } else if (!p) say(D.off);
    else say(t(out.reason === 'phone' ? D.livePhone : D.live, { n: fmt.int(out.size) }));
    writeUrl({ proj: projection.active ? projValue(projection.get()) : null });
    if (typeof ctx.frameHooksChanged === 'function') ctx.frameHooksChanged();
    if (ctx) ctx.lastProjection = { value: projValue(projection.get()), size: projection.faceSize, ok: out.ok, reason: out.reason || '' };
    paint();
    return out.ok;
  }

  for (const r of Object.values(radios)) {
    r.addEventListener('change', () => {
      if (!r.checked) return;
      set(r.value === 'dome' ? `dome${Number(tiltSel.value) ? `,${tiltSel.value}` : ''}` : r.value);
    });
  }
  tiltSel.addEventListener('change', () => set(`dome${Number(tiltSel.value) ? `,${tiltSel.value}` : ''}`));

  async function save(canvas, kind) {
    if (!canvas) { toast(D.saveFailed, 4000); return null; }
    const blob = await canvasBlob(canvas);
    const name = pictureName(kind, ctx.clock.now());
    saveBlob(blob, name);
    toast(t(D.saved, { w: fmt.int(canvas.width), h: fmt.int(canvas.height) }), 3000);
    if (ctx) ctx.lastProjectionSave = { name, w: canvas.width, h: canvas.height, bytes: blob.size };
    return blob;
  }
  frameBtn.addEventListener('click', () => {
    const p = projection.get();
    if (!p) return null;
    const w = Number(sizeSel.value);
    return save(projection.snapshot(p, w, p.kind === '360' ? w / 2 : w), p.kind === '360' ? '360' : 'dome');
  });
  skyBtn.addEventListener('click', () => save(projection.skybox(Number(skySel.value)), 'skybox'));

  let sheet = null;
  function seat() {
    if (isPhone() && !sheet) sheet = createSheet(root, { detents: ['peek', 'half', 'full'], initial: 'half', grab: '.sr-make__title', scrollers: '.sr-make__body', label: D.sheet });
    else if (!isPhone() && sheet) { sheet.destroy(); sheet = null; }
    if (sheet) sheet.set('half');
  }
  function open(opts = {}) {
    opener = opts.opener || doc.activeElement;
    root.hidden = false;
    cssReady.then(() => { if (!root.hidden) seat(); });
    paint();
    if (!status.textContent) say(projection.active ? '' : D.intro);
    title.focus({ preventScroll: true });
  }
  function close() {
    if (root.hidden) return;
    root.hidden = true;
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  closeBtn.addEventListener('click', close);
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });

  return {
    open, close, isOpen: () => !root.hidden, set,
    fromLink: (value) => set(value),
    get active() { return projection.active && !busy(); },
    render: () => projection.render(),
    snapshot: (p, w, h) => projection.snapshot(p, w, h),
    skybox: (s) => projection.skybox(s),
    state: () => ({ proj: projValue(projection.get()), faceSize: projection.faceSize, limits: projection.limits }),
    root,
  };
}
