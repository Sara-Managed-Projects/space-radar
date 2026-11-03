// moments/player.js -- the Moment player: a mission replayed on one clock (internal spec 0079, stage C1;
// internal issue #1050).
//
// Contract: createMomentPlayer(ctx, { scene }) -> { open(id, t), close(), render(nowMs), seek(t), play(), pause(),
//   setFree(on), active, state(), debug }
//
// `#moment=<id>&t=<s>` opens it (main.js fetches this module for that link and never at boot). The moment is a file,
// site/data/moments/<id>.json (docs/MOMENTS.md; moments/format.js validates it); its words are COPY.momentStories[id]
// (copy/en.moments.js, or the file its `wordsFile` names).
//
// ONE CLOCK. Everything on screen is a function of the mission second `t`: the vehicles (moments/trajectory.js), the
// parts that come apart (separations are ballistic arcs from the second they left, so they are where they would be
// at any `t`, scrubbed to or played to), the flames and the steam (moments/effects.js), the shot (moments/director.js),
// the caption and the chapter. Play time advances `t` through the moment's pace; the rate is on screen beside the
// mission clock, always.
//
// THE CHROME follows internal docs/ui-guide.md: one strip at the foot (the scene keeps the whole window), the play
// button the one ember, 44 px targets, mono numerals, words from copy/, the honesty line small at the foot. No new
// floating panel: the chapters open in place above the strip. Keys: Space plays and pauses, the arrows step five
// play seconds, [ and ] jump chapters, Escape closes. Reduced motion (the device's or the Motion row's): the moment
// opens paused, every blend is a cut and nothing drifts on its own.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY } from '../copy/en.js';
import '../copy/en.moments.js';
import { icon } from '../ui/icons.js';
import { write as writeUrl, clear as clearUrl } from '../ui/urlstate.js';
import { worldPositionKm } from '../propagate/body.js';
import { paceTable, playOf, missionOf, rateAt, compressionText, formatMet, chapterAt, captionAt, crossed, isMomentId, shareHash, parseT, lastAt } from './format.js';
import { tilt, OMEGA, MOON_R, moonAxes, moonSurfaceDir, placeFrame, profileTrack, vectorTrack, fromHorizons, enuToEcef, fixedToInertial, siderealAt, attitude, ballistic, spinBasis, fromBasis, add, scale, norm, len, cross, dot, EARTH_R, WORLD, setWorld } from './trajectory.js';
import { worldTurn, sunFromWorld } from './world.js';
import { directAt, freePose, poseAngles } from './director.js';
import { createStage, eciToThree } from './stage.js';
import { loadVehicle, disposeVehicle } from './vehicles.js';
import { createTether, createExhaustCloud } from './effects.js';

const DATA = new URL('../../data/moments/', import.meta.url);
const W = () => COPY.momentPlayer;
// 1.7.2: the lamp a night pad is lit with (scene/models.js floodLit, the same one the model cards offer), at a launch pad in the dark: the Sun
// below the horizon and the camera low. Weaker than the card's 0.9 so the flames still read as the light. Drawn, not measured.
const NIGHT_PAD_LAMP = 0.6;
// 1.7.2: a vehicle shorter than this on the screen (CSS px) is marked by the ringed dot as well as drawn: the one floor every story's vehicles get
// (Sputnik's whips over the Earth were a speck inside the old 7 px); the ring is 44 px across.
const MARKER_BELOW_PX = 40;
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o[k] !== undefined ? o[k] : `{${k}}`));
const DEG = Math.PI / 180;

function el(doc, tag, cls, text) {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function linkCss(doc) {
  try {
    const href = new URL('../../css/moments.css', import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) return;
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    doc.head.appendChild(link);
  } catch { /* a test's document */ }
}

/** The part events of one vehicle, compiled for quick asking: separations, visibility, engine levels, chutes. */
function compileEvents(events, vehicleId, lead) {
  const mine = events.filter((e) => (e.vehicle || lead) === vehicleId);
  const by = new Map();
  for (const e of mine) { if (!by.has(e.part)) by.set(e.part, []); by.get(e.part).push(e); }
  return by;
}

/** How lit an engine is at t, from its part's ignite / cutoff / throttle events (0..1). */
export function engineLevel(list, index, t) {
  let level = 0, on = false, since = -Infinity, ramp = 1.5, throttle = 1, from = 0;
  for (const e of list || []) {
    if (e.t > t) break;
    if (e.engines && !e.engines.includes(index)) continue;
    if (e.action === 'ignite') { if (!on) { on = true; since = e.t; ramp = e.rampS > 0 ? e.rampS : 1.5; } }
    else if (e.action === 'cutoff') { from = on ? Math.min(1, (e.t - since) / ramp) * throttle : 0; on = false; since = e.t; }
    else if (e.action === 'throttle' && Number.isFinite(e.level)) throttle = e.level;
  }
  if (on) { const k = Math.min(1, (t - since) / ramp); level = k * k * (3 - 2 * k) * throttle; }
  else if (since > -Infinity) level = Math.max(0, from * (1 - (t - since) / 0.4));
  return level;
}

/** A canopy's deployment at t (0 packed .. 1 open) from its deploy and hide events. */
export function chuteLevel(list, t) {
  let te = null, spec = null, gone = false;
  for (const e of list || []) {
    if (e.t > t) break;
    if (e.action === 'deploy') { te = e.t; spec = e; gone = false; }
    if (e.action === 'hide') gone = true;
  }
  if (te === null || gone) return 0;
  const age = t - te, out = 1.2, reef = spec.reefS > 0 ? spec.reefS : 4, open = spec.openS > 0 ? spec.openS : 3;
  if (age < out) return 0.3 * (age / out);
  if (age < out + reef) return 0.3 + 0.3 * Math.min(1, (age - out) / 1.5);
  return 0.6 + 0.4 * Math.min(1, (age - out - reef) / open);
}

export function createMomentPlayer(ctx, opts = {}) {
  const doc = document;
  const renderer = ctx.renderer;
  let active = false;
  let m = null;            // the moment's file, parsed
  let words = {};
  let table = null;
  let epochMs = 0;
  let frame = null;        // the pad (the first place) as east/north/up: the profiles are laid from it
  let curFrame = null;     // the place in force at t (a moment may move on: `places`)
  let curPlace = null;
  let placesList = [];
  let tracks = {};
  let stage = null;
  let vehicles = new Map();// id -> { spec, v (loaded), events: Map(part -> list) }
  let clouds = [];
  let tethers = [];
  let t = 0, p = 0, playing = false, lastNow = 0;
  let free = null;         // a visitor's own camera { az, el, dist }
  let ui = null;
  let status = 'idle';     // idle | loading | ready | missing | unreachable
  let lastShot = -1;
  let lightU = null;
  let audioLoader = null;
  let opened = null;       // the id asked for
  let backFocus = null;
  const frames = [];
  const size = new THREE.Vector2();
  const mat = new THREE.Matrix4();
  const vX = new THREE.Vector3(), vY = new THREE.Vector3(), vZ = new THREE.Vector3();

  const reducedMotion = () => {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || doc.documentElement.dataset.srMotion === 'off';
    } catch { return false; }
  };
  const tier = () => (ctx.latch && ctx.latch.latched ? 0 : ctx.quality && Number.isFinite(ctx.quality.tier) ? ctx.quality.tier : 1);
  const inWindow = (spec, tt) => !spec.window || (tt >= spec.window[0] && tt <= spec.window[1]);
  const leadAt = (tt) => { const v = m.vehicles.find((x) => inWindow(x, tt)); return v || m.vehicles[0]; };
  const say = (key) => (key && words[key] !== undefined ? words[key] : '');

  // --- the chrome -------------------------------------------------------------------------------------------------

  function ensureUi() {
    if (ui) return ui;
    linkCss(doc);
    const root = el(doc, 'section', 'sr-moment');
    root.hidden = true;
    root.setAttribute('aria-roledescription', W().micro);
    const shield = el(doc, 'div', 'sr-moment__shield');
    const head = el(doc, 'div', 'sr-moment__head');
    const card = el(doc, 'div', 'sr-moment__card sr-float');
    const id = el(doc, 'div', 'sr-moment__id');
    const micro = el(doc, 'p', 'sr-moment__micro', W().micro);
    const title = el(doc, 'h2', 'sr-moment__title');
    id.append(micro, title);
    const close = el(doc, 'button', 'sr-btn sr-moment__btn sr-moment__close');
    close.type = 'button';
    close.setAttribute('aria-label', W().close);
    close.title = W().close;
    close.append(icon('x'));
    const clock = el(doc, 'div', 'sr-moment__clock');
    const met = el(doc, 'span', 'sr-moment__met');
    met.setAttribute('aria-label', W().met);
    const rate = el(doc, 'span', 'sr-moment__rate');
    const chapter = el(doc, 'span', 'sr-moment__chapter');
    clock.append(met, rate, chapter);
    card.append(id, clock);
    head.append(card, close);
    const caption = el(doc, 'p', 'sr-moment__caption sr-float');
    caption.setAttribute('aria-live', 'polite');
    const list = el(doc, 'ol', 'sr-moment__chapters sr-float');
    list.hidden = true;
    list.setAttribute('aria-label', W().chaptersTitle);
    const dock = el(doc, 'div', 'sr-moment__dock');
    const bar = el(doc, 'div', 'sr-moment__bar sr-float');
    const playBtn = el(doc, 'button', 'sr-btn sr-btn--primary sr-moment__btn sr-moment__play');
    playBtn.type = 'button';
    const track = el(doc, 'div', 'sr-moment__track');
    const scrub = el(doc, 'input', 'sr-moment__scrub');
    scrub.type = 'range';
    scrub.min = '0';
    scrub.step = '0.05';
    scrub.setAttribute('aria-label', W().scrubber);
    const ticks = el(doc, 'div', 'sr-moment__ticks');
    ticks.setAttribute('aria-hidden', 'true');
    track.append(ticks, scrub);
    const chaptersBtn = el(doc, 'button', 'sr-btn sr-moment__btn sr-moment__text', W().chapters);
    chaptersBtn.type = 'button';
    chaptersBtn.setAttribute('aria-expanded', 'false');
    const share = el(doc, 'button', 'sr-btn sr-moment__btn sr-moment__share');
    share.type = 'button';
    share.setAttribute('aria-label', W().share);
    share.title = W().share;
    share.append(icon('share'));
    const director = el(doc, 'button', 'sr-btn sr-moment__btn sr-moment__text sr-moment__director', W().director);
    director.type = 'button';
    director.title = W().directorTitle;
    director.hidden = true;
    const controls = el(doc, 'div', 'sr-moment__controls');
    controls.append(playBtn, track, chaptersBtn, director, share);
    const foot = el(doc, 'p', 'sr-moment__truth');
    const note = el(doc, 'p', 'sr-moment__status sr-float');
    note.setAttribute('role', 'status');
    bar.append(controls, foot);
    dock.append(note, caption, list, bar);
    root.append(shield, head, dock);
    doc.body.appendChild(root);

    close.addEventListener('click', () => close_());
    playBtn.addEventListener('click', () => (playing ? pause() : play()));
    scrub.addEventListener('input', () => { if (table) { seekPlay(Number(scrub.value)); } });
    scrub.addEventListener('change', () => writeTime());
    chaptersBtn.addEventListener('click', () => {
      const open = list.hidden;
      list.hidden = !open;
      chaptersBtn.setAttribute('aria-expanded', String(open));
      if (open) { const b = list.querySelector('button'); if (b) b.focus(); }
    });
    share.addEventListener('click', copyLink);
    director.addEventListener('click', () => setFree(false));
    // A visitor's own camera: drag round the vehicle, wheel or pinch to come closer.
    const pts = new Map();
    let pinch = 0;
    shield.addEventListener('pointerdown', (e) => {
      if (!stage) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { shield.setPointerCapture(e.pointerId); } catch { /* fine */ }
      if (!free) setFree(true);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    shield.addEventListener('pointermove', (e) => {
      const q = pts.get(e.pointerId);
      if (!q || !free) return;
      if (pts.size === 1) {
        free.az -= (e.clientX - q.x) * 0.005;
        free.el = Math.max(-1.45, Math.min(1.45, free.el + (e.clientY - q.y) * 0.005));
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && d > 0) free.dist = Math.max(5, free.dist * (pinch / d));
        pinch = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
    shield.addEventListener('pointerup', up);
    shield.addEventListener('pointercancel', up);
    shield.addEventListener('wheel', (e) => {
      if (!stage) return;
      e.preventDefault();
      if (!free) setFree(true);
      free.dist = Math.max(5, free.dist * Math.exp(e.deltaY * 0.001));
    }, { passive: false });
    doc.addEventListener('keydown', onKey);
    ui = { root, title, close, met, rate, chapter, caption, list, bar, playBtn, scrub, ticks, chaptersBtn, share, director, foot, note, shield };
    return ui;
  }

  function onKey(e) {
    if (!active || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' && e.target !== ui.scrub) return;
    if (tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (e.key === 'Escape') { e.preventDefault(); close_(); return; }
    if (!table) return;
    if (e.key === ' ' && e.target !== ui.playBtn && tag !== 'BUTTON') { e.preventDefault(); if (playing) pause(); else play(); return; }
    if (e.target === ui.scrub) return; // the range answers its own arrows
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); seekPlay(p + (e.key === 'ArrowRight' ? 5 : -5)); writeTime(); return; }
    if (e.key === ']' || e.key === '[') {
      e.preventDefault();
      const ch = m.chapters;
      const i = chapterAt(ch, t) + (e.key === ']' ? 1 : (t - ch[chapterAt(ch, t)].t < 1 ? -1 : 0));
      seek(ch[Math.max(0, Math.min(ch.length - 1, i))].t);
      writeTime();
    }
  }

  function setNote(text) { if (ui) ui.note.textContent = text || ''; }

  function buildChapters() {
    ui.list.textContent = '';
    ui.ticks.textContent = '';
    m.chapters.forEach((c, i) => {
      const li = el(doc, 'li');
      const b = el(doc, 'button', 'sr-moment__row');
      b.type = 'button';
      b.append(el(doc, 'span', 'sr-moment__rowtime', formatMet(c.t)), el(doc, 'span', 'sr-moment__rowname', say(c.say)));
      b.addEventListener('click', () => { seek(c.t); writeTime(); ui.list.hidden = true; ui.chaptersBtn.setAttribute('aria-expanded', 'false'); ui.chaptersBtn.focus(); });
      li.append(b);
      ui.list.append(li);
      if (i > 0) {
        const tick = el(doc, 'span', 'sr-moment__tick');
        tick.style.left = `${(100 * playOf(table, c.t)) / table.total}%`;
        ui.ticks.append(tick);
      }
    });
  }

  function paintChrome() {
    if (!ui || !table) return;
    ui.met.textContent = formatMet(t);
    const r = rateAt(table, t);
    const text = compressionText(r);
    if (ui.rate.textContent !== text) {
      ui.rate.textContent = text;
      ui.rate.title = r === 1 ? W().realTime : fill(W().rateTitle, { rate: text });
      ui.rate.classList.toggle('is-real', r === 1);
    }
    const ci = chapterAt(m.chapters, t);
    const chText = say(m.chapters[ci].say);
    if (ui.chapter.textContent !== chText) ui.chapter.textContent = chText;
    ui.chapter.title = fill(W().chapterOf, { n: ci + 1, m: m.chapters.length });
    const c = captionAt(m.tracks.captions || [], t, table);
    const cap = c ? say(c.say) : '';
    if (ui.caption.textContent !== cap) ui.caption.textContent = cap;
    ui.caption.hidden = !cap;
    if (doc.activeElement !== ui.scrub) ui.scrub.value = String(p);
    if (m.vehicles.length > 1 && leadAt(t).id !== truthLead) paintTruth();
    ui.scrub.setAttribute('aria-valuetext', `${formatMet(t)}, ${chText}`);
    const end = p >= table.total - 1e-6;
    const label = playing ? W().pause : end ? W().replay : W().play;
    if (ui.playBtn.dataset.state !== label) {
      ui.playBtn.dataset.state = label;
      ui.playBtn.textContent = '';
      ui.playBtn.append(icon(playing ? 'pause' : 'play'));
      ui.playBtn.setAttribute('aria-label', label);
      ui.playBtn.title = label;
    }
  }

  let turnFn = null;
  let truthLead = null;
  function paintTruth() {
    const lead = leadAt(t);
    truthLead = lead && lead.id;
    const tr = lead && lead.path ? m.trajectories[lead.path] : null;
    const parts = [];
    if (tr) parts.push(fill(W().truthLine, { truth: W().truthWords[tr.truth] || tr.truth, path: say(tr.say) || tr.source }));
    const v = vehicles.get(lead && lead.id);
    if (v && v.v && v.v.split === 'cuts') parts.push(W().cutNote);
    parts.push(W().drawnNote);
    // Each piece is a sentence of its own.
    if (m.place && m.place.ground) parts.push(m.world === 'mars' && W().groundNoteMars ? W().groundNoteMars : W().groundNote);
    ui.foot.textContent = parts.join(' ');
  }

  // --- loading -----------------------------------------------------------------------------------------------------

  async function load(id) {
    status = 'loading';
    setNote(W().loading);
    let file = null;
    try {
      const res = await fetch(new URL(`${id}.json`, DATA).href);
      if (res.status === 404) { status = 'missing'; setNote(fill(W().missing, { id })); return false; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      file = await res.json();
    } catch (err) {
      console.warn(`moment ${id} did not load`, err && err.message);
      status = 'unreachable';
      setNote(W().unreachable);
      return false;
    }
    if (opened !== id) return false;
    if (file.wordsFile && /^en\.[a-z0-9.-]+\.js$/.test(file.wordsFile)) {
      try { await import(`../copy/${file.wordsFile}`); } catch (err) { console.warn(`moment ${id}: its words did not load`, err && err.message); }
    }
    m = file;
    m.tracks = m.tracks || {};
    words = (COPY.momentStories && COPY.momentStories[m.words || m.id]) || {};
    table = paceTable(m.pace);
    epochMs = Date.parse(m.epoch);
    // 1.7.9: a moment on another world (`world: "mars"`): its radius, pull, turn, Sun and map, before anything is built on it.
    setWorld(m.world || 'earth');
    turnFn = m.world && m.world !== 'earth' ? worldTurn(m.world) : null;
    frame = placeFrame(m.place);
    curFrame = frame;
    curPlace = m.place;
    placesList = (m.places || []).map((q) => ({ from: q.from, place: q.place, frame: placeFrame(q.place) }));
    moonMemo.clear();
    tracks = {};
    for (const [tid, tr] of Object.entries(m.trajectories || {})) {
      try {
        if (tr.kind === 'profile') tracks[tid] = { ...profileTrack(tr, m.place), spec: tr };
        else if (tr.kind === 'vectors') {
          let rows = tr.rows;
          if (tr.file) {
            const res = await fetch(new URL(tr.file, DATA).href);
            rows = /\.txt$/.test(tr.file) ? fromHorizons(await res.text(), epochMs) : (await res.json()).rows;
          }
          tracks[tid] = { ...vectorTrack(rows, tr.frame, epochMs), spec: tr };
        }
      } catch (err) { console.warn(`moment ${id}: trajectory ${tid} did not load`, err && err.message); }
    }
    stage = createStage(renderer, { tier: tier(), place: m.place, frame });
    for (const fx of m.tracks.effects || []) {
      if (fx.effect !== 'exhaust-cloud') continue;
      const a = fx.axis || [0, 1, 0];
      const c = createExhaustCloud({ from: fx.t, to: fx.until, axis: [a[0], a[2], -a[1]], count: Math.round((fx.count || 400) * (tier() === 0 ? 0.4 : tier() > 1 ? 1.5 : 1)) });
      stage.placeGroup.add(c.group);
      clouds.push({ fx: c, fire: fx.fire ? { part: fx.fire, vehicle: fx.vehicle } : null });
    }
    for (const fx of m.tracks.effects || []) {
      if (fx.effect !== 'tether') continue;
      const tf = createTether({ count: (fx.from.at || [[0, 0, 0]]).length, colour: fx.colour });
      stage.scene.add(tf.group);
      tethers.push({ fx: tf, spec: fx });
    }
    title();
    buildChapters();
    ui.scrub.max = String(table.total);
    status = 'ready';
    setNote('');
    paintTruth();
    // The vehicles arrive when they arrive: the path, the flames and the camera do not wait for a file.
    const events = m.tracks.parts || [];
    const lead = m.vehicles[0] && m.vehicles[0].id;
    for (const spec of m.vehicles) {
      const entry = { spec, v: null, events: compileEvents(events, spec.id, lead), sep: new Map() };
      vehicles.set(spec.id, entry);
      loadVehicle(spec, events.filter((e) => (e.vehicle || lead) === spec.id), { tier: tier() }).then((v) => {
        if (!stage || vehicles.get(spec.id) !== entry) { disposeVehicle(v); return; }
        entry.v = v;
        stage.scene.add(v.root);
        entry.marker = makeMarker();
        stage.scene.add(entry.marker);
        if (!v.ok) setNote(fill(W().modelMissing, { model: spec.model }));
        paintTruth();
        import('../scene/models.js').then((mod) => { lightU = mod.lightUniforms(); }).catch(() => {});
      });
    }
    return true;
  }

  // A vehicle too small to see at the scale of the Earth and the Moon is marked by a dot of fixed size on the screen.
  function makeMarker() {
    const c = doc.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.strokeStyle = 'rgba(8, 10, 18, 0.75)'; x.lineWidth = 11; x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = '#ffd98a'; x.lineWidth = 6; x.beginPath(); x.arc(32, 32, 22, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#ffd98a'; x.beginPath(); x.arc(32, 32, 7, 0, Math.PI * 2); x.fill();
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, depthWrite: false }));
    mk.renderOrder = 10;
    mk.visible = false;
    mk.frustumCulled = false;
    return mk;
  }

  function title() {
    ui.title.textContent = say('title');
    ui.root.setAttribute('aria-label', say('title'));
  }

  // --- the clock ---------------------------------------------------------------------------------------------------

  function seek(tt) {
    if (!table) return;
    t = Math.min(table.to, Math.max(table.from, tt));
    p = playOf(table, t);
    paintChrome();
  }
  function seekPlay(pp) {
    if (!table) return;
    p = Math.min(table.total, Math.max(0, pp));
    t = missionOf(table, p);
    paintChrome();
  }
  function play() {
    if (!table) return;
    if (p >= table.total - 1e-6) seekPlay(0);
    playing = true;
    lastNow = 0;
    writeUrl({ moment: m.id, t: null });
    paintChrome();
  }
  function pause() {
    playing = false;
    writeTime();
    paintChrome();
  }
  function writeTime() {
    if (!m) return;
    writeUrl({ moment: m.id, t: String(Math.round(t * 10) / 10) });
  }

  async function copyLink() {
    if (!m) return;
    const url = `${location.origin}${location.pathname}${shareHash(m.id, t)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote(W().copied);
    } catch {
      setNote(fill(W().copyFailed, { url }));
    }
    setTimeout(() => { if (ui && ui.note.textContent === W().copied) setNote(''); }, 2500);
  }

  function setFree(on) {
    if (!ui) return;
    if (on && !free && lastPose) {
      const centre = focusNow();
      const a = poseAngles(lastPose, centre.pos, centre.up);
      free = { az: a.az, el: a.el, dist: a.dist, fov: lastPose.fov };
    } else if (!on) free = null;
    ui.director.hidden = !free;
    setNote(free ? W().freeNote : '');
    if (!free) ui.playBtn.focus();
  }

  // --- one frame ---------------------------------------------------------------------------------------------------

  // The Moon at second tt: its position and velocity in the Earth-inertial frame, metres (a short difference).
  const moonMemo = new Map();
  function moonAt(tt) {
    const key = Math.round(tt * 4);
    let r = moonMemo.get(key);
    if (r) return r;
    const at = (x) => { const q = worldPositionKm('moon', epochMs + x * 1000, 'earth-inertial'); return q ? [q.x * 1000, q.y * 1000, q.z * 1000] : [0, 0, 0]; };
    const a = at(tt - 5), b = at(tt + 5);
    r = { r: at(tt), v: scale(add(b, scale(a, -1)), 0.1) };
    if (moonMemo.size > 64) moonMemo.clear();
    moonMemo.set(key, r);
    return r;
  }

  // `phases` on a vehicle: from `t` on, a different attitude and/or the body it is flown about ('moon', 'earth'): a
  // capsule that turns round for its burn, a lander that comes upright, a spacecraft that goes from the Earth's sky to the Moon's.
  function phaseAt(spec, tt) {
    let attitude = spec.attitude, body = spec.body;
    // 1.7.2: `pitchDeg` and `rollDeg` are keyframes, blended linearly between one phase that names them and the next (an entry's pitch-up).
    const key = { pitchDeg: [], rollDeg: [] };
    for (const q of spec.phases || []) {
      for (const k of Object.keys(key)) if (q[k] !== undefined) key[k].push([q.t, q[k]]);
      if (q.t > tt) continue;
      if (q.attitude) attitude = q.attitude;
      if (q.body !== undefined) body = q.body;
    }
    const at = (list) => {
      if (!list.length || tt <= list[0][0]) return list.length ? list[0][1] : 0;
      for (let i = 1; i < list.length; i += 1) {
        if (tt <= list[i][0]) { const [t0, a] = list[i - 1], [t1, b] = list[i]; return t1 > t0 ? a + (b - a) * (tt - t0) / (t1 - t0) : b; }
      }
      return list[list.length - 1][1];
    };
    return { attitude, body, pitchDeg: at(key.pitchDeg), rollDeg: at(key.rollDeg) };
  }

  /** A vehicle's state at t in its own trajectory's frame (Earth-fixed or inertial), metres. */
  function stateOf(entry, tt) {
    const spec = entry.spec;
    // A vehicle that rides another (the spacecraft on its launcher's adapter): the host's state, the point moved by `at`
    // metres in the host's own axes.
    if (spec.rideOn) {
      const host = vehicles.get(spec.rideOn.vehicle);
      if (host) {
        const hs = stateOf(host, tt);
        // 1.7.2: `spin` [x, y, z] degrees turns the rider about the host's axes (a cosmonaut floating along an airlock's axis).
        const basis = Array.isArray(spec.rideOn.spin) ? spinBasis(hs.basis, spec.rideOn.spin.map((d) => d * Math.PI / 180)) : hs.basis;
        return { ...hs, basis, p: add(hs.p, fromBasis(hs.basis, spec.rideOn.at || [0, 0, 0])) };
      }
    }
    const tr = spec.path ? tracks[spec.path] : null;
    if (tr && tr.frame === 'fixed') {
      const s = tr.stateAt(tt);
      const up = enuToEcef(frame, s.up, true);
      const vel = enuToEcef(frame, s.v, true);
      const ref = enuToEcef(frame, [Math.sin(tr.azimuth), Math.cos(tr.azimuth), 0], true);
      const pitchStart = Number.isFinite(spec.pitchStart) ? spec.pitchStart : Number.isFinite(tr.spec.pitchStart) ? tr.spec.pitchStart : 10;
      const turnS = Number.isFinite(spec.turnS) ? spec.turnS : Number.isFinite(tr.spec.turnS) ? tr.spec.turnS : 12;
      const phx = phaseAt(spec, tt);
      const basis = tilt(attitude(phx.attitude || 'ascent', { up, vel, ref, t: tt, pitchStart, turnS }), phx.pitchDeg, phx.rollDeg);
      return { kind: 'fixed', p: enuToEcef(frame, s.p), v: vel, up, basis, altM: s.altM };
    }
    if (tr && tr.frame === 'inertial') {
      const s = tr.stateAt(tt);
      // A vehicle at the Moon (`body: "moon"`) stands, points and flies by the Moon's vertical and the Moon's velocity.
      const ph = phaseAt(spec, tt);
      const mo = ph.body === 'moon' ? moonAt(tt) : null;
      const rel = mo ? add(s.r, scale(mo.r, -1)) : s.r;
      // Relative to the Moon, or to the turning Earth's air and ground (a capsule hangs from its canopy by the wind, not by the inertial frame)
      const velRel = mo ? add(s.v, scale(mo.v, -1)) : add(s.v, [OMEGA * s.r[1], -OMEGA * s.r[0], 0]);
      const up = norm(rel);
      const ref = norm(cross(rel, velRel));
      const basis = tilt(attitude(ph.attitude || 'prograde', { up, vel: velRel, ref, t: tt }), ph.pitchDeg, ph.rollDeg);
      return { kind: 'inertial', p: s.r, v: s.v, up, basis, altM: len(rel) - (mo ? MOON_R : EARTH_R), vrel: velRel };
    }
    const basis = attitude('vertical', { up: frame.u, vel: [0, 0, 0], ref: frame.n });
    return { kind: 'fixed', p: frame.ecef.slice(), v: [0, 0, 0], up: frame.u, basis, altM: 0 };
  }

  /** A state's vectors in the stage's frame at sidereal angle g. */
  function toStage(kind, v, g) {
    return eciToThree(kind === 'fixed' ? fixedToInertial(v, g) : v);
  }

  let lastPose = null;
  let poses = new Map();

  function focusNow() {
    const lead = leadAt(t);
    const v = poses.get(lead.id);
    if (!v) return { pos: lastPose ? lastPose.look : [0, 0, 0], up: [0, 1, 0] };
    return { pos: add(v.pos, scale(v.basis[1], v.lengthM / 2)), up: v.up };
  }

  function setMatrix(obj, basis, pos, origin) {
    vX.set(basis[0][0], basis[0][1], basis[0][2]);
    vY.set(basis[1][0], basis[1][1], basis[1][2]);
    vZ.set(basis[2][0], basis[2][1], basis[2][2]);
    mat.makeBasis(vX, vY, vZ);
    mat.setPosition(pos[0] - origin[0], pos[1] - origin[1], pos[2] - origin[2]);
    obj.matrix.copy(mat);
    obj.matrixWorldNeedsUpdate = true;
  }

  /** A basis whose Y is `y` (unit), any X. */
  function basisAlong(y) {
    const a = Math.abs(y[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const x = norm(cross(a, y));
    return [x, y, norm(cross(x, y))];
  }

  function drawFrame() {
    const g = siderealAt(epochMs, t, turnFn);
    const tMs = epochMs + t * 1000;
    if (placesList.length) {
      let pick = { place: m.place, frame };
      for (const q of placesList) if (t >= q.from) pick = q;
      if (pick.place !== curPlace) { curPlace = pick.place; curFrame = pick.frame; stage.setPlace(curPlace, curFrame); }
    }
    const still = reducedMotion();
    const s = turnFn ? null : worldPositionKm('sun', tMs, 'earth-inertial');
    const sunDir = turnFn ? norm(eciToThree(sunFromWorld(m.world, tMs))) : s ? norm(eciToThree([s.x, s.y, s.z])) : [1, 0, 0];
    const mo = turnFn ? null : worldPositionKm('moon', tMs, 'earth-inertial');
    let moonPos = mo ? eciToThree([mo.x * 1000, mo.y * 1000, mo.z * 1000]) : null;
    let mAxes = mo ? moonAxes([mo.x, mo.y, mo.z]) : null;
    let moonAx = mAxes ? { x: eciToThree(mAxes.x), y: eciToThree(mAxes.y), z: eciToThree(mAxes.z) } : null;
    if (turnFn && WORLD.moon) {
      // 1.7.9: Charon stands above longitude 0 on Pluto's equator, its face toward Pluto, its pole Pluto's (the two keep one face to each other)
      const q = fixedToInertial([WORLD.moon.aM, 0, 0], g);
      const x = norm(scale(q, -1)), z = [0, 0, 1], y = cross(z, x);
      moonPos = eciToThree(q);
      moonAx = { x: eciToThree(x), y: eciToThree(y), z: eciToThree(z) };
    }
    const siteDir = mAxes && m.moonSite ? eciToThree(moonSurfaceDir(mAxes, m.moonSite.lat, m.moonSite.lon)) : null;
    // Vehicles: where each stands now, in the stage's frame.
    poses = new Map();
    const states = new Map();
    for (const [id, entry] of vehicles) {
      const st = stateOf(entry, t);
      states.set(id, st);
      poses.set(id, {
        pos: toStage(st.kind, st.p, g), basis: st.basis.map((b) => toStage(st.kind, b, g)),
        vel: toStage(st.kind, st.vrel || st.v, g), up: toStage(st.kind, st.up, g), lengthM: entry.spec.lengthM, altM: st.altM,
      });
    }
    // The camera.
    const pf = curFrame || frame;
    const placeNow = {
      p: toStage('fixed', pf.ecef, g), e: toStage('fixed', pf.e, g), u: toStage('fixed', pf.u, g),
      s: toStage('fixed', scale(pf.n, -1), g),
    };
    const world = {
      lead: leadAt(t).id,
      vehicle: (id) => poses.get(id) || null,
      place: { toWorld: (enu) => toStage('fixed', enuToEcef(pf, enu), g), up: placeNow.u },
      earth: { centre: [0, 0, 0], radius: EARTH_R },
      moon: moonPos,
      dirToWorld: (v) => eciToThree(v),
    };
    let pose;
    const shot = directAt(m.tracks.camera, world, t, table, still);
    if (free) {
      const c = focusNow();
      pose = freePose(c.pos, c.up, free.az, free.el, free.dist, free.fov || 40);
    } else pose = shot.pose;
    lastPose = pose;
    // A tall screen: a wider vertical lens (half-way, in tangent, to keeping the shot's 16:9 width), so a rocket on a
    // phone is still a rocket on its pad. And the subject sits in the middle of what the card and the strip leave free.
    renderer.getSize(size);
    const aspect = size.x / Math.max(1, size.y);
    const widen = aspect < 16 / 9 ? Math.sqrt((16 / 9) / aspect) : 1;
    const lens = { ...pose, fov: (2 * Math.atan(Math.tan((pose.fov * DEG) / 2) * widen)) / DEG };
    const band = freeBand(size.y);
    if (shot.index !== lastShot) { lastShot = shot.index; if (ui) ui.root.dataset.shot = shot.shot.shot; }
    const origin = pose.pos;
    const air = stage.update({ origin, sidereal: g, sunDir, moonPos, moonAxes: moonAx, siteDir, placeNow, pose: lens, aspect, shiftPx: band, width: size.x, height: size.y });
    // Parts, flames, separation motors, chutes, plasma.
    for (const [id, entry] of vehicles) {
      const v = entry.v;
      if (!v) continue;
      const shownNow = inWindow(entry.spec, t);
      v.root.visible = shownNow;
      if (entry.marker) {
        const ps0 = poses.get(id);
        const d = Math.hypot(ps0.pos[0] - origin[0], ps0.pos[1] - origin[1], ps0.pos[2] - origin[2]);
        const tanH = Math.tan((lens.fov * DEG) / 2);
        const pxPerM = size.y / (2 * tanH * Math.max(d, 1));
        const small = entry.spec.marker !== false && shownNow && entry.spec.lengthM * pxPerM < MARKER_BELOW_PX;
        entry.marker.visible = small;
        if (small) {
          entry.marker.position.set(ps0.pos[0] - origin[0], ps0.pos[1] - origin[1], ps0.pos[2] - origin[2]);
          entry.marker.scale.setScalar(44 / pxPerM);
        }
      }
      if (!shownNow) continue;
      const st = states.get(id);
      const ps = poses.get(id);
      for (const [name, part] of v.parts) {
        const list = entry.events.get(name) || [];
        let shown = true;
        let sep = null;
        for (const e of list) {
          if (e.t > t) break;
          if (e.action === 'hide') shown = false;
          if (e.action === 'show') shown = true;
          if (e.action === 'separate') sep = e;
        }
        part.pivot.visible = shown;
        if (!shown) continue;
        if (!sep) {
          setMatrix(part.pivot, ps.basis, add(ps.pos, fromBasis(ps.basis, part.centre)), origin);
          continue;
        }
        // Separated: a ballistic arc from the second it left, in its trajectory's frame.
        let s0 = entry.sep.get(name);
        if (!s0) { const at = stateOf(entry, sep.t); s0 = { at, p: add(at.p, fromBasis(at.basis, part.centre)) }; entry.sep.set(name, s0); }
        const dt = t - sep.t;
        const pos = ballistic(s0.p, s0.at.v, fromBasis(s0.at.basis, sep.dv || [0, 0, 0]), dt);
        const basis = spinBasis(s0.at.basis, scale(sep.spin || [0, 0, 0], dt));
        setMatrix(part.pivot, basis.map((b) => toStage(st.kind, b, g)), toStage(st.kind, pos, g), origin);
      }
      for (const [name, engines] of v.flames) {
        const list = entry.events.get(name) || [];
        engines.forEach((f, i) => f.set({ on: engineLevel(list, i, t), altM: st.altM, time: t, still }));
      }
      for (const pf of v.puffs) pf.fx.set(t - pf.t, { altM: st.altM, time: t, still });
      for (const [name, c] of v.chutes) {
        const k = chuteLevel(entry.events.get(name), t);
        c.fx.set(k, t, still);
        if (k > 0) {
          const dir = len(ps.vel) > 2 ? scale(norm(ps.vel), -1) : ps.basis[1];
          setMatrix(c.fx.group, basisAlong(dir), add(ps.pos, fromBasis(ps.basis, c.spec.at)), origin);
        }
      }
      if (v.plasma) {
        let k = 0;
        for (const fx of m.tracks.effects || []) {
          if (fx.effect !== 'plasma' || (fx.vehicle || world.lead) !== id || t < fx.t || t > fx.until) continue;
          const peak = Number.isFinite(fx.peak) ? fx.peak : (fx.t + fx.until) / 2;
          k = t < peak ? (t - fx.t) / Math.max(1e-6, peak - fx.t) : 1 - (t - peak) / Math.max(1e-6, fx.until - peak);
        }
        if (v.plasma.spec.kind === 'belly') {
          // a winged vehicle: the layer rides the vehicle's own frame; the wake runs along the flight path, given in that frame
          const fv = norm(ps.vel);
          v.plasma.fx.set(Math.max(0, Math.min(1, k)), t, still, [dot(fv, ps.basis[0]), dot(fv, ps.basis[1]), dot(fv, ps.basis[2])]);
          if (k > 0) setMatrix(v.plasma.fx.group, ps.basis, ps.pos, origin);
        } else {
          v.plasma.fx.set(Math.max(0, Math.min(1, k)), t, still);
          if (k > 0) setMatrix(v.plasma.fx.group, basisAlong(norm(ps.vel)), add(ps.pos, fromBasis(ps.basis, v.plasma.spec.at || [0, 0, 0])), origin);
        }
      }
    }
    // 1.7.9: tethers: cords from points on one vehicle to points on another, while the effect's seconds run.
    for (const th of tethers) {
      const a = poses.get(th.spec.from.vehicle), b = poses.get(th.spec.to.vehicle);
      const on = a && b && t >= th.spec.t && t <= th.spec.until && inWindow(vehicles.get(th.spec.from.vehicle).spec, t) && inWindow(vehicles.get(th.spec.to.vehicle).spec, t);
      if (!on) { th.fx.set(null); continue; }
      const rel = (ps, p) => { const w = add(ps.pos, fromBasis(ps.basis, p)); return [w[0] - origin[0], w[1] - origin[1], w[2] - origin[2]]; };
      th.fx.set(th.spec.from.at.map((p) => rel(a, p)), th.spec.to.at.map((p) => rel(b, p)));
    }
    // The steam at the pad, in the place's own axes.
    if (clouds.length) {
      const sunLocal = [sunDir[0] * placeNow.e[0] + sunDir[1] * placeNow.e[1] + sunDir[2] * placeNow.e[2], sunDir[0] * placeNow.u[0] + sunDir[1] * placeNow.u[1] + sunDir[2] * placeNow.u[2], sunDir[0] * placeNow.s[0] + sunDir[1] * placeNow.s[1] + sunDir[2] * placeNow.s[2]];
      const pxPerM = size.y / (2 * Math.tan((lens.fov * DEG) / 2)) * renderer.getPixelRatio();
      for (const c of clouds) {
        // The fire along the trench burns while the part that feeds it does, and dies as the stack climbs away.
        let fire = 0;
        const feed = c.fire && vehicles.get(c.fire.vehicle || (m.vehicles[0] && m.vehicles[0].id));
        if (feed) {
          const list = feed.events.get(c.fire.part) || [];
          const n = (feed.spec.engines && feed.spec.engines[c.fire.part] || [0]).length;
          for (let i = 0; i < n; i += 1) fire = Math.max(fire, engineLevel(list, i, t));
          const st = states.get(feed.spec.id);
          fire *= Math.max(0, 1 - (st ? st.altM : 0) / 150);
        }
        c.fx.set({ time: t, sunUp: sunLocal, scale: pxPerM, light: 0.35 + 0.65 * air.air.day, fire, still });
      }
    }
    // The models' shared light (scene/models.js): the Sun and the Earth of THIS stage while it draws, then the map's back.
    const saved = lightU ? swapLight(sunDir, air.capCentre, origin, NIGHT_PAD_LAMP * air.air.night) : null;
    renderer.render(stage.scene, stage.camera);
    if (saved) restoreLight(saved);
  }

  // Where the chrome leaves the scene free: the shift (CSS px) that puts the frame's centre in the middle of the band
  // between the card at the top and the strip at the foot. Measured twice a second, not every frame.
  let bandAt = 0, bandShift = 0;
  function freeBand(h) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (ui && now - bandAt > 500) {
      bandAt = now;
      try {
        const top = ui.root.querySelector('.sr-moment__card').getBoundingClientRect().bottom;
        const bottom = ui.bar.getBoundingClientRect().top;
        bandShift = bottom > top ? Math.max(-h * 0.25, Math.min(h * 0.25, h / 2 - (top + bottom) / 2)) : 0;
      } catch { bandShift = 0; }
    }
    return bandShift;
  }

  function swapLight(sunDir, centre, origin, flood = 0) {
    const keys = ['uSunDir', 'uShineCentre', 'uShineRadius', 'uShadeRadius', 'uFlood', 'uAirH', 'uSunRim'];
    const saved = {};
    for (const k of keys) { const u = lightU[k]; if (!u) continue; saved[k] = u.value && u.value.clone ? u.value.clone() : u.value; }
    if (lightU.uSunDir) lightU.uSunDir.value.set(sunDir[0], sunDir[1], sunDir[2]);
    if (lightU.uShineCentre) lightU.uShineCentre.value.set(centre[0] - origin[0], centre[1] - origin[1], centre[2] - origin[2]);
    if (lightU.uShineRadius) lightU.uShineRadius.value = EARTH_R;
    if (lightU.uShadeRadius) lightU.uShadeRadius.value = EARTH_R;
    if (lightU.uFlood) lightU.uFlood.value = flood;
    if (lightU.uAirH) lightU.uAirH.value = 0;
    return saved;
  }
  function restoreLight(saved) {
    for (const [k, v] of Object.entries(saved)) {
      const u = lightU[k];
      if (u.value && u.value.copy && v && v.isVector3) u.value.copy(v);
      else u.value = v;
    }
  }

  /** One frame, called by main.js's loop after its own render while the moment is up. */
  function render(nowMs) {
    if (!active || status !== 'ready' || !stage) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Number(nowMs) || 0;
    if (lastNow) { frames.push(now - lastNow); if (frames.length > 120) frames.shift(); }
    // A slow device plays at its own frame rate, but no single frame jumps more than half a second (a tab put away).
    const dt = lastNow ? Math.min(0.5, (now - lastNow) / 1000) : 0;
    lastNow = now;
    if (playing) {
      const t0 = t;
      p = Math.min(table.total, p + dt);
      t = missionOf(table, p);
      for (const a of crossed(m.tracks.audio, t0, t)) cue(a);
      if (p >= table.total - 1e-6) { playing = false; writeTime(); }
      paintChrome();
    }
    drawFrame();
  }

  function cue(a) {
    const audio = ctx.audio;
    if (!audio || typeof audio.isOn !== 'function' || !audio.isOn()) return;
    if (a.sting) { if (audio.stings) audio.stings.play(a.sting); return; }
    const go = (loader) => loader.load({ id: a.src, file: a.src, twin: a.twin }).then((buf) => {
      if (!buf || !audio.context || !audio.master) return;
      const src = audio.context.createBufferSource();
      const gain = audio.context.createGain();
      gain.gain.value = Number.isFinite(a.gain) ? a.gain : 1;
      src.buffer = buf;
      src.connect(gain).connect(audio.master);
      src.start();
    });
    if (audioLoader) { go(audioLoader); return; }
    import('../audio/load.js').then((mod) => { audioLoader = mod.createLoader(audio); go(audioLoader); }).catch(() => {});
  }

  // --- open and close ----------------------------------------------------------------------------------------------

  function setActive(on) {
    active = on;
    if (opts.scene) opts.scene.visible = !on;
    doc.documentElement.classList.toggle('sr-moment-on', on);
    if (ui) ui.root.hidden = !on;
  }

  function teardown() {
    for (const entry of vehicles.values()) disposeVehicle(entry.v);
    vehicles = new Map();
    for (const c of clouds) c.fx.dispose();
    for (const th of tethers) th.fx.dispose();
    tethers = [];
    clouds = [];
    setWorld('earth');
    if (stage) stage.dispose();
    stage = null;
    m = null;
    table = null;
    free = null;
    lastShot = -1;
    status = 'idle';
  }

  /** Open moment `id`, at mission second `at` (a link's `t`) or at its start. */
  async function open(id, at) {
    ensureUi();
    if (!active) backFocus = doc.activeElement;
    setActive(true);
    if (!isMomentId(id)) { teardown(); status = 'missing'; setNote(fill(W().missing, { id: String(id || '') })); return state(); }
    if (opened !== id || !m) {
      teardown();
      opened = id;
      ui.title.textContent = '';
      ui.caption.hidden = true;
      if (!(await load(id))) return state();
    }
    if (!active || opened !== id) return state();
    const tt = parseT(at, table);
    seek(tt === null ? table.from : tt);
    playing = false;
    if (tt === null && !reducedMotion()) play();
    else { writeTime(); paintChrome(); }
    ui.playBtn.focus();
    return state();
  }

  function close_() {
    if (!active) return;
    playing = false;
    setActive(false);
    teardown();
    opened = null;
    clearUrl(['moment', 't']);
    if (ui) { ui.list.hidden = true; setNote(''); }
    if (backFocus && typeof backFocus.focus === 'function') { try { backFocus.focus(); } catch { /* gone */ } }
  }

  function state() {
    const sorted = frames.slice().sort((a, b) => a - b);
    const pick = (q) => (sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] * 10) / 10 : null);
    const info = renderer && renderer.info ? renderer.info.render : null;
    return {
      active, status, id: opened, t, p,
      total: table ? table.total : null,
      rate: table ? rateAt(table, t) : null,
      playing,
      chapter: m && table ? chapterAt(m.chapters, t) : null,
      shot: m && table ? (m.tracks.camera[Math.max(0, lastAt(m.tracks.camera, t))] || {}).shot : null,
      free: !!free,
      vehicles: [...vehicles.values()].map((e) => ({ id: e.spec.id, loaded: !!(e.v && e.v.ok), split: e.v ? e.v.split : null, parts: e.v ? [...e.v.parts.keys()] : [] })),
      altM: stage ? Math.round(stage.state.altM) : null,
      frameMs: { p50: pick(0.5), p95: pick(0.95) },
      calls: info ? info.calls : null,
      triangles: info ? info.triangles : null,
    };
  }

  return {
    open,
    close: close_,
    render,
    seek: (tt) => { seek(tt); if (active) writeTime(); },
    play,
    pause,
    setFree,
    state,
    get active() { return active; },
    /** Tools only: the director's pose and the vehicles' poses at this second. */
    debug: () => ({ pose: lastPose, poses: Object.fromEntries(poses) }),
  };
}
