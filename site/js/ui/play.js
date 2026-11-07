// ui/play.js -- three one-minute daily challenges on the real map (forge #160): Find Earth, Which world is this?,
// Guess the distance.
//
// Never at boot: main.js imports this only for a `#play=` link (`find-earth`, `which-world`, `guess-distance`, or
// `1` for the list of the three), and css/play.css comes with it (ui/latercss.js). The rules are ui/playcore.js.
//
// Contract: openPlay(ctx, key) -> the controller, one per page: { open(key), close() }.
//
// WHAT IS REAL IN EACH.
//   Find Earth: four rungs of the map's own ladder (the Local Group, the Milky Way, the Sun's neighbourhood and the
//     Solar System, registry/stages.yaml), each drawn by the scene as it always is, with four lettered marks over
//     four real records where positionOfRecord() puts them: the answer and three others picked by the day's seed.
//     The map's names are hidden while the marks are up (they would give it away). The Solar System's worlds are
//     drawn nearer than they are on that stage, as everywhere on it, and the card says so (COPY.play.honest).
//   Which world is this?: a square of a world's own map, the tier-0 file of registry/textures.yaml (the one the
//     globe wears), at three widths, with that map's credit word for word under it.
//   Guess the distance: a deep-sky object of site/data/dso.json with a measured distance, flown to on the map;
//     the answer prints the distance and the source the catalogue row names (`distanceSource`).
//
// NO ACCOUNT, NOTHING SENT. The day's results stay in this browser (localStorage `sr:play`, the last 60 days),
// every read and write inside try/catch: a private window, a full disk or a blocked store still plays, it just
// does not remember. Sharing is the visitor's own: the system's share sheet on a touch device, else the
// clipboard, and the text is always shown in a box that can be selected by hand.
//
// ACCESS. The card is a dialog with a heading, every control is a button or a native slider with a name, and
// what happens is said in a polite live region. Find Earth's marks are buttons in reading order A to D, each named
// with where it sits in the view, and keys A-D (or 1-4) pick; the clue is text. The scene itself is a canvas a
// screen reader cannot see, so a player who relies on one plays from the clue, the marks' places and the answers
// each wrong pick explains, which is less than a sighted player has; the changelog says so. Under reduced motion
// the camera cuts instead of flying (scene/camera.js does that for every flight). Esc closes.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t } from '../copy/en.js';
import '../copy/en.play.js';
import { TEXTURES } from '../data/textures.js';
import { eclDirection } from '../scene/clusters.js';
import { NORTH_GALACTIC_POLE } from '../scene/galaxy.js';
import { SUN_INERTIAL } from '../scene/stage.js';
import { loadCss } from './latercss.js';
import { write as writeUrl, clear as clearUrl } from './urlstate.js';
import {
  GAMES, MAX_TRIES, SLIDER, utcDay, seedOf, rng, pick, distanceTile, sliderLy, lyToSlider, shareText, readStore, writeStore, streak,
} from './playcore.js';

const STORE = 'sr:play';
const LETTERS = ['A', 'B', 'C', 'D'];
// On the sun-inertial (ecliptic J2000) axes; scene/stage.js toScene turns them into the stage's own (the scene is y-up).
const GAL_POLE = eclDirection(NORTH_GALACTIC_POLE.raDeg, NORTH_GALACTIC_POLE.decDeg);
const ECL_POLE = [0, 0, 1]; // the ecliptic's north pole
const PHONE_LIFT = 0.42; // on a phone the card covers the lower part: the marks are framed this far above the middle (NDC)
// Find Earth's rungs. `answer` is the record (or the stage's origin, the Sun, for the ladder's rungs); `pool` the
// records the three others are drawn from, far enough apart on that rung to be told apart (checked again below).
const RUNGS = [
  { id: 'local-group', stage: 'local-group', pole: GAL_POLE, answer: null,
    pool: ['m31', 'm33', 'ngc-6822', 'ic-1613', 'wlm', 'leo-i', 'leo-a', 'phoenix-dwarf', 'pegasus-dwarf', 'cetus-dwarf', 'tucana-dwarf', 'sagdig', 'aquarius-dwarf'].map((id) => `dso-${id}`) },
  { id: 'galaxy', stage: 'galaxy', pole: GAL_POLE, answer: null,
    pool: ['sgr-a-star', 'eta-carinae', 'cygnus-x-1', 'ss-433', 'hulse-taylor', 'grs-1915-105', 'sgr-1806-20', 'psr-j1748-2446ad', 'v404-cygni'].map((id) => `exotic-${id}`) },
  { id: 'stellar', stage: 'stellar', pole: GAL_POLE, answer: null,
    names: ['sirius', 'procyon', 'wolf 359', "barnard's star", 'altair', 'tau ceti', 'epsilon eridani', 'vega', 'fomalhaut', '61 cygni a', 'luhman 16 a', 'gliese 570 d', 'alpha centauri a'] },
  { id: 'sun', stage: 'sun', pole: ECL_POLE, answer: 'earth', pool: ['mercury', 'venus', 'mars', 'jupiter'] },
];
const SEPARATION = 0.22; // of the rung's framing radius, measured across the line of sight
const ROUNDS = 3;

const capital = (s) => String(s || '').replace(/^\p{Ll}/u, (c) => c.toUpperCase());
const lang = () => (document.documentElement.lang || 'en');
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function button(text, onClick, main = false) {
  const b = el('button', `sr-play__btn${main ? ' is-main' : ''}`, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function lyWords(ly) {
  const U = COPY.play.units;
  const f = (n) => n.toLocaleString(lang(), { maximumSignificantDigits: 3 });
  if (ly < 1e3) return t(U.ly, { n: f(ly) });
  if (ly < 1e6) return t(U.kly, { n: f(ly / 1e3) });
  if (ly < 1e9) return t(U.mly, { n: f(ly / 1e6) });
  return t(U.bly, { n: f(ly / 1e9) });
}
function store() {
  try { return readStore(window.localStorage.getItem(STORE)); } catch { return readStore(null); }
}
function remember(day, game, result) {
  try { window.localStorage.setItem(STORE, writeStore(store(), day, game, result)); } catch { /* no memory: still played */ }
}

export function openPlay(ctx, key) {
  if (ctx.play) { ctx.play.open(key); return ctx.play; }
  loadCss('play');
  const card = el('section', 'sr-play');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-labelledby', 'sr-play-h');
  const head = el('div', 'sr-play__head');
  const h = el('h2', null, COPY.play.label);
  h.id = 'sr-play-h';
  h.tabIndex = -1;
  const x = el('button', 'sr-play__x', '×');
  x.type = 'button';
  x.setAttribute('aria-label', COPY.play.close);
  head.append(h, x);
  const dayLine = el('p', 'sr-play__day');
  const body = el('div');
  const say = el('p', 'sr-play__say');
  say.setAttribute('role', 'status');
  say.setAttribute('aria-live', 'polite');
  card.append(head, dayLine, body, say);
  const marks = el('div', 'sr-play-marks');
  let gen = 0; // a game's generation: a flight or a fetch that lands after the game changed does nothing
  let raf = 0;
  let keyPick = null;
  const day = () => utcDay(Date.now());
  // The galaxies, the deep-sky objects and the far exotics are later catalogues (main.js loadAfterFirstVisit): asked
  // for first, as a link to one of them is, and then the challenge starts.
  const later = () => (ctx.loadAfterFirstVisit && !ctx.laterLayersLoaded() ? ctx.loadAfterFirstVisit().then(() => ctx.loadMoreCatalogues && ctx.loadMoreCatalogues()) : Promise.resolve());
  const whenReady = (fn) => {
    if (ctx.deselect) ctx.deselect(); // a card or a tag would say the answer
    const start = () => { say.textContent = ''; fn(); };
    const go = () => later().then(start, start);
    if (window.__srLayersReady) go(); else { say.textContent = COPY.play.loading; window.addEventListener('sr:layers-ready', go, { once: true }); }
  };

  function stopMarks() {
    cancelAnimationFrame(raf);
    raf = 0;
    marks.replaceChildren();
    marks.remove();
    document.documentElement.classList.remove('sr-play-marking');
    keyPick = null;
  }
  function close() {
    gen++;
    stopMarks();
    card.remove();
    clearUrl(['play']);
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (keyPick && !e.metaKey && !e.ctrlKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      const i = 'abcd'.indexOf(e.key.toLowerCase()) >= 0 ? 'abcd'.indexOf(e.key.toLowerCase()) : '1234'.indexOf(e.key);
      if (i >= 0 && keyPick(i)) e.preventDefault();
    }
  }
  x.addEventListener('click', close);

  function open(k) {
    gen++;
    stopMarks();
    if (!card.isConnected) { document.body.append(card); document.addEventListener('keydown', onKey); }
    dayLine.textContent = t(COPY.play.day, { day: day() });
    say.textContent = '';
    const game = GAMES.includes(k) ? k : null;
    writeUrl({ play: game || '1' });
    if (!game) { menu(); return; }
    h.textContent = COPY.play.games[game].title;
    const done = (store().days[day()] || {})[game];
    if (done && done.rows) { finish(game, done, false); return; }
    ({ 'find-earth': findEarth, 'which-world': whichWorld, 'guess-distance': guessDistance })[game](gen);
    h.focus();
  }

  function menu() {
    h.textContent = COPY.play.label;
    const list = el('ul', 'sr-play__menu');
    const today = store().days[day()] || {};
    for (const g of GAMES) {
      const li = el('li');
      const b = button('', () => open(g));
      b.append(document.createTextNode(COPY.play.games[g].title + (today[g] ? '  ✓' : '')), el('small', null, COPY.play.games[g].blurb));
      li.append(b);
      list.append(li);
    }
    body.replaceChildren(list);
  }

  // --- the end of a challenge: the grid, the share text, the others ------------------------------------------
  function finish(game, result, fresh = true) {
    stopMarks();
    if (fresh) remember(day(), game, result);
    const url = `${location.origin}${location.pathname}#play=${game}`;
    const text = shareText({ title: t(COPY.play.shareTitle, { game: COPY.play.games[game].title }), day: day(), rows: result.rows,
      score: t(COPY.play.scores[game], { n: result.score }), url });
    const box = el('textarea', 'sr-play__share');
    box.readOnly = true;
    box.value = text;
    box.rows = 4;
    box.setAttribute('aria-label', COPY.play.share);
    const n = streak(store(), day());
    const note = el('p', 'sr-play__note', COPY.play.played + (n > 1 ? ` ${t(COPY.play.streak, { n })}.` : ''));
    const share = button(COPY.play.share, async () => {
      try {
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (coarse && navigator.share) { await navigator.share({ text }); return; }
        await navigator.clipboard.writeText(text);
        say.textContent = COPY.play.copied;
      } catch (e) {
        if (e && e.name === 'AbortError') return; // the visitor closed the share sheet
        box.select();
        say.textContent = COPY.play.copyFailed;
      }
    }, true);
    const others = el('p', 'sr-play__note', COPY.play.other);
    const row = el('div', 'sr-play__row');
    for (const g of GAMES) if (g !== game) row.append(button(COPY.play.games[g].title, () => open(g)));
    body.replaceChildren(box, el('div', 'sr-play__row'), note, others, row);
    body.children[1].append(share);
  }

  // --- Find Earth ---------------------------------------------------------------------------------------------
  function findEarth(g) {
    const rand = rng(seedOf(day(), 'find-earth'));
    const rows = [[]];
    let tries = 0;
    const where = el('p', 'sr-play__note');
    const ask = el('p', 'sr-play__ask');
    const count = el('p', 'sr-play__note');
    const hintBtn = button(COPY.play.hint, () => { if (spend()) say.textContent = COPY.play.hints[RUNGS[step].id]; });
    const note = el('p', 'sr-play__note', COPY.play.honest);
    body.replaceChildren(where, ask, count, el('div', 'sr-play__row'), note);
    body.children[3].append(hintBtn);
    let step = 0;
    const spend = () => {
      tries++;
      rows[step].push('miss');
      count.textContent = t(COPY.play.tries, { n: Math.min(tries + 1, MAX_TRIES), max: MAX_TRIES });
      if (tries < MAX_TRIES) return true;
      say.textContent = COPY.play.lost;
      finish('find-earth', { rows, score: MAX_TRIES, won: false });
      return false;
    };
    const live = () => g === gen;
    const run = () => {
      if (!live()) return;
      const rung = RUNGS[step];
      rows[step] = rows[step] || [];
      const cands = candidates(rung, rand);
      if (!cands) { say.textContent = COPY.play.loading; return; }
      where.textContent = t(COPY.play.rung, { n: step + 1, of: RUNGS.length, where: COPY.play.rungs[rung.id] });
      ask.textContent = COPY.play.ask[rung.id];
      count.textContent = t(COPY.play.tries, { n: tries + 1, max: MAX_TRIES });
      stopMarks();
      frame(rung, cands, () => {
        if (!live()) return;
        showMarks(cands, (i, b) => {
          const c = cands[i];
          if (c.answer) {
            rows[step].push('hit');
            tries++;
            say.textContent = t(COPY.play.right, { name: c.name });
            step++;
            if (step >= RUNGS.length) {
              finish('find-earth', { rows, score: tries, won: true });
              say.textContent = t(COPY.play.found, { n: tries });
              if (ctx.returnToBase) ctx.returnToBase();
              return;
            }
            setTimeout(run, 700);
          } else {
            b.classList.add('is-wrong');
            b.disabled = true;
            if (spend()) say.textContent = t(COPY.play.wrong, { letter: LETTERS[i], name: c.name });
          }
        });
      });
    };
    whenReady(run);
  }

  /** The answer and three others for a rung, in a seeded order, each with its name and scene position; null if the map has not got them. */
  function candidates(rung, rand) {
    if (ctx.stage.worldId !== rung.stage && !ctx.setStage(rung.stage) && ctx.stage.worldId !== rung.stage) return null;
    const recs = rung.names
      ? ctx.records().filter((r) => r && r.name && rung.names.includes(String(r.name).toLowerCase())).sort((a, b) => (a.id < b.id ? -1 : 1))
      : rung.pool.map((id) => ctx.recordById(id)).filter(Boolean);
    const at = (r) => { const p = r ? ctx.positionOfRecord(r) : null; return p ? new THREE.Vector3(p.x, p.y, p.z) : null; };
    const answerRec = rung.answer ? ctx.recordById(rung.answer) : null;
    const answer = { answer: true, pos: rung.answer ? at(answerRec) : new THREE.Vector3(),
      name: rung.answer ? COPY.worlds[rung.answer] : rung.id === 'local-group' ? COPY.play.milkyWay : COPY.play.sunName };
    if (!answer.pos) return null;
    const o0 = ctx.stage.toScene({ x: 0, y: 0, z: 0 }, SUN_INERTIAL), o1 = ctx.stage.toScene({ x: rung.pole[0] * 1e12, y: rung.pole[1] * 1e12, z: rung.pole[2] * 1e12 }, SUN_INERTIAL);
    if (!o0 || !o1) return null;
    const n = o1.sub(o0).normalize();
    const across = (a, b) => { const d = a.clone().sub(b); return d.sub(n.clone().multiplyScalar(d.dot(n))).length(); };
    const others = pick(recs, recs.length, rand).map((r) => ({ answer: false, pos: at(r), name: r.klass === 'world' ? COPY.worlds[r.id] : String(r.name).replace(/^M\d+ · /, '') }))
      .filter((c) => c.pos);
    const span = Math.max(...others.map((c) => across(c.pos, answer.pos)), 1e-9);
    const chosen = [answer];
    for (const c of others) {
      if (chosen.length === 4) break;
      if (chosen.every((o) => across(o.pos, c.pos) > SEPARATION * span)) chosen.push(c);
    }
    if (chosen.length < 4) for (const c of others) if (chosen.length < 4 && !chosen.includes(c)) chosen.push(c);
    if (chosen.length < 4) return null;
    const out = pick(chosen, 4, rand);
    out.pole = n;
    return out;
  }

  /** Fly to look down a rung's pole at the four, framed with room round them. */
  function frame(rung, cands, onArrive) {
    const n = cands.pole;
    const centre = cands.reduce((s, c) => s.add(c.pos), new THREE.Vector3()).multiplyScalar(1 / cands.length);
    const r = Math.max(...cands.map((c) => { const d = c.pos.clone().sub(centre); return d.sub(n.clone().multiplyScalar(d.dot(n))).length(); }), 1e-9);
    const cam = ctx.camera;
    const half = THREE.MathUtils.degToRad(cam.fov) / 2;
    const narrow = Math.min(half, Math.atan(Math.tan(half) * cam.aspect));
    const distance = (r * 1.45) / Math.tan(narrow);
    // A phone's card sits low over the scene: once there, the view is slid so the four stand in the part above it.
    const lift = () => {
      if (window.innerWidth >= 768) { onArrive(); return; }
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      const s = ctx.cameraRig.saveState();
      const target = centre.clone().addScaledVector(up, -PHONE_LIFT * distance * Math.tan(half));
      ctx.cameraRig.flyTo({ targetScene: target, distance, azimuth: s.azimuth, polar: s.polar, ms: 250, onArrive, onCancel: onArrive });
    };
    ctx.cameraRig.flyTo({ targetScene: centre, distance, offset: { x: n.x, y: n.y, z: n.z }, ms: 1400, onArrive: lift, onCancel: lift });
  }

  /** Lettered buttons over the candidates; with no onPick, one plain ring a screen reader skips (Guess the distance). */
  function showMarks(cands, onPick = null) {
    document.documentElement.classList.add('sr-play-marking');
    document.body.append(marks);
    const btns = cands.map((c, i) => {
      const b = el(onPick ? 'button' : 'span', 'sr-play-mark', onPick ? LETTERS[i] : '');
      if (onPick) { b.type = 'button'; b.addEventListener('click', () => onPick(i, b)); } else b.setAttribute('aria-hidden', 'true');
      marks.append(b);
      return b;
    });
    keyPick = onPick ? (i) => { if (btns[i] && !btns[i].disabled) { onPick(i, btns[i]); return true; } return false; } : null;
    const v = new THREE.Vector3();
    const place = () => {
      const rect = ctx.renderer.domElement.getBoundingClientRect();
      cands.forEach((c, i) => {
        v.copy(c.pos).project(ctx.camera);
        const ok = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
        btns[i].hidden = !ok;
        if (!ok) return;
        const px = rect.left + ((v.x + 1) / 2) * rect.width, py = rect.top + ((1 - v.y) / 2) * rect.height;
        btns[i].style.left = `${px}px`;
        btns[i].style.top = `${py}px`;
        const where = ['t', 'm', 'b'][Math.min(2, Math.floor(((1 - v.y) / 2) * 3))] + ['l', 'c', 'r'][Math.min(2, Math.floor(((v.x + 1) / 2) * 3))];
        const label = t(COPY.play.mark, { letter: LETTERS[i], where: COPY.play.places[where] });
        if (onPick && btns[i].getAttribute('aria-label') !== label) btns[i].setAttribute('aria-label', label);
      });
      raf = requestAnimationFrame(place);
    };
    place();
  }

  // --- Which world is this? -------------------------------------------------------------------------------------
  function whichWorld(g) {
    const rand = rng(seedOf(day(), 'which-world'));
    const seen = new Set();
    const pool = TEXTURES.filter((r) => (r.slot === 'map' || r.slot === 'day') && r.world !== 'sky' && r.world !== 'sun' && COPY.worlds[r.world])
      .filter((r) => !seen.has(r.world) && seen.add(r.world)).sort((a, b) => (a.world < b.world ? -1 : 1));
    const rounds = pick(pool, ROUNDS, rand);
    const rows = [];
    let score = 0;
    const canvas = el('canvas', 'sr-play__crop');
    canvas.width = canvas.height = 280;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', COPY.play.worldPicture);
    const roundLine = el('p', 'sr-play__note');
    const ask = el('p', 'sr-play__ask', COPY.play.worldAsk);
    const opts = el('div', 'sr-play__opts');
    const more = button(COPY.play.more, () => { zoom = Math.min(2, zoom + 1); draw(); if (zoom === 2) more.disabled = true; });
    const credit = el('p', 'sr-play__credit');
    const next = button(COPY.play.next, () => round(i + 1), true);
    body.replaceChildren(roundLine, ask, canvas, el('div', 'sr-play__row'), opts, credit);
    body.children[3].append(more);
    let i = 0, zoom = 0, img = null, centre = null;
    const draw = () => {
      if (!img) return;
      const g2 = canvas.getContext('2d');
      const w = img.naturalWidth, side = (w / 16) * 2 ** zoom;
      const sx = centre[0] * w - side / 2, sy = Math.max(0, Math.min(img.naturalHeight - side, centre[1] * img.naturalHeight - side / 2));
      g2.imageSmoothingQuality = 'high';
      g2.drawImage(img, sx, sy, side, side, 0, 0, 280, 280);
      if (sx < 0) g2.drawImage(img, sx + w, sy, side, side, 0, 0, 280, 280); // across the map's seam
      if (sx + side > w) g2.drawImage(img, sx - w, sy, side, side, 0, 0, 280, 280);
    };
    const round = (k) => {
      if (g !== gen) return;
      if (k >= rounds.length) { finish('which-world', { rows, score }); return; }
      i = k; zoom = 0; more.disabled = false;
      const row = rounds[k], file = row.files.find((f) => f.tier === 0) || row.files[0];
      const choices = pick([row, ...pick(pool.filter((r) => r !== row), 3, rand)], 4, rand);
      roundLine.textContent = t(COPY.play.round, { n: k + 1, of: rounds.length });
      credit.textContent = '';
      opts.replaceChildren(...choices.map((c) => button(capital(COPY.worlds[c.world]), (e) => {
        const right = c === row;
        rows.push([right ? (zoom === 0 ? 'hit' : zoom === 1 ? 'near' : 'far') : 'miss']);
        if (right) score++;
        for (const b of opts.children) b.disabled = true;
        e.currentTarget.classList.add(right ? 'is-right' : 'is-wrong');
        say.textContent = t(right ? COPY.play.worldRight : COPY.play.worldWrong, { name: COPY.worlds[row.world] });
        zoom = 2; draw(); more.disabled = true;
        credit.textContent = t(COPY.play.credit, { credit: file.credit });
        opts.append(next);
        next.focus();
      })));
      const im = new Image();
      im.onload = () => {
        if (g !== gen) return;
        img = im;
        centre = cropCentre(im, rand);
        draw();
      };
      im.src = new URL(`../../${file.file}`, import.meta.url).href;
    };
    round(0);
  }

  /** A crop centre away from the poles and on detail: a flat square (a blank, unmapped patch) is drawn again. */
  function cropCentre(img, rand) {
    const probe = document.createElement('canvas');
    probe.width = probe.height = 24;
    const g2 = probe.getContext('2d', { willReadFrequently: true });
    let best = null;
    for (let k = 0; k < 8; k++) {
      const c = [rand(), 0.3 + rand() * 0.4];
      const side = img.naturalWidth / 16;
      g2.drawImage(img, c[0] * img.naturalWidth - side / 2, c[1] * img.naturalHeight - side / 2, side, side, 0, 0, 24, 24);
      const d = g2.getImageData(0, 0, 24, 24).data;
      let s = 0, s2 = 0;
      for (let p = 0; p < d.length; p += 4) { const y = 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]; s += y; s2 += y * y; }
      const n = d.length / 4, sd = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
      if (!best || sd > best.sd) best = { c, sd };
      if (sd > 8) break;
    }
    return best.c;
  }

  // --- Guess the distance -----------------------------------------------------------------------------------
  function guessDistance(g) {
    const rand = rng(seedOf(day(), 'guess-distance'));
    const rows = [];
    let score = 0;
    const roundLine = el('p', 'sr-play__note');
    const ask = el('p', 'sr-play__ask');
    const label = el('label', 'sr-play__slider', COPY.play.slider);
    const out = el('output');
    const input = el('input');
    Object.assign(input, { type: 'range', min: SLIDER.min, max: SLIDER.max, step: SLIDER.step, value: 3 });
    label.append(out, input);
    const go = button(COPY.play.guess, null, true);
    const src = el('p', 'sr-play__credit');
    body.replaceChildren(roundLine, ask, label, el('div', 'sr-play__row'), src);
    body.children[3].append(go);
    const show = () => { const w = lyWords(sliderLy(input.value)); out.textContent = w; input.setAttribute('aria-valuetext', w); };
    input.addEventListener('input', show);
    whenReady(() => fetch(new URL('../../data/dso.json', import.meta.url)).then((r) => r.json()).then((doc) => {
      if (g !== gen) return;
      const pool = doc.objects.filter((o) => o.distLy > 0 && o.distanceSource).sort((a, b) => (a.id < b.id ? -1 : 1));
      const rounds = pick(pool, ROUNDS, rand);
      let k = 0, answered = false;
      const round = () => {
        const o = rounds[k];
        answered = false;
        roundLine.textContent = t(COPY.play.round, { n: k + 1, of: rounds.length });
        ask.textContent = t(COPY.play.distAsk, { name: o.name });
        input.disabled = false;
        input.value = String(lyToSlider(1000));
        show();
        go.textContent = COPY.play.guess;
        src.textContent = '';
        lookTowards(ctx.recordById(`dso-${o.id}`));
      };
      go.onclick = () => {
        if (g !== gen) return;
        if (answered) { k++; if (k >= rounds.length) finish('guess-distance', { rows, score }); else round(); return; }
        const o = rounds[k], tile = distanceTile(sliderLy(input.value), o.distLy);
        rows.push([tile]);
        if (tile === 'hit' || tile === 'near') score++;
        answered = true;
        input.disabled = true;
        say.textContent = t(COPY.play.reveal, { name: o.name, value: lyWords(o.distLy), off: COPY.play.offs[tile] });
        src.textContent = t(COPY.play.source, { source: o.distanceSource });
        go.textContent = COPY.play.next;
      };
      round();
    }).catch((e) => { console.warn('the distances did not load', e); say.textContent = COPY.play.loading; }));
  }

  /**
   * Turn to face a record from the Sun's place on the stellar rung, with a ring on it: its direction on the sky and no
   * clue to its distance (no stage change, no card, no tag, the names hidden). Nothing happens when the map lacks it.
   */
  function lookTowards(rec) {
    stopMarks();
    if (!rec || (ctx.stage.worldId !== 'stellar' && !ctx.setStage('stellar') && ctx.stage.worldId !== 'stellar')) return;
    const p = ctx.positionOfRecord(rec);
    if (!p) return;
    const dir = new THREE.Vector3(p.x, p.y, p.z).normalize();
    const D = 20; // light-years: the camera stands at the Sun and looks this far along the line
    const g = gen;
    const ring = () => { if (g === gen) showMarks([{ pos: new THREE.Vector3(p.x, p.y, p.z) }]); };
    ctx.cameraRig.flyTo({ targetScene: dir.multiplyScalar(D), distance: D, offset: { x: -p.x, y: -p.y, z: -p.z }, ms: 1200, onArrive: ring, onCancel: ring });
  }

  ctx.play = { open, close };
  open(key);
  return ctx.play;
}
