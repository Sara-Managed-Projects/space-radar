// ui/datejump.js -- type a date and go there: the time pill's date field (forge #154).
//
// Contract: openDateJump(ctx, opener) -> the popover's API { root, close(), go(text) }   (one popover, built once)
//           installFade(ctx) -> { paint() }   satellites fade, and say so, when the clock is far from their orbits
//
// WHAT IT IS. A small dialog over the time pill: the browser's own date-and-time field (in UTC, which the label
// says), a line to type in ("1969-07-20 20:17", "20 July 1969", "JD 2440423.5", "in 3 days", "next total
// eclipse": ui/whenparse.js reads it), what the map can show well at which dates, and the dates to go to:
// every dated event of our missions (registry/missions.yaml, the same events their cards list, 21 missions)
// and the Moments (moments/shelf.js), with the Fengyun-1C cloud of forge #153 as one more. Cosmoscope offers
// five dates; this offers every one the map has a story for.
//
// GOING THERE. The clock is set with clock.goTo, outside the pill's month-back, year-on window: the pill
// leaves a clock that something else put outside its window where it is (ui/timepill.js clampToWindow), so
// its steps and drags carry on from there and Live comes back. A mission's event goes through the mission's
// own door (ui/missions.js openEventWhenReady), which also flies to the craft; a Moment opens its player.
//
// THE KEYS. The opener is a button; the dialog takes the focus on its first field, Tab stays inside it,
// Escape closes it and gives the focus back to the button. Nothing moves on its own, so reduced motion has
// nothing to turn off here.
//
// THE FADE (installFade). A satellite's orbit is measured for now: its elements are days old, and propagated
// years away they put it somewhere it never was (and, before its launch, somewhere it could not be). Past a
// week from now its dot starts to yield, by ui/whenparse.js fadeFor, to a fifth of its brightness at a month,
// and a line in the pill says why. It rides on the dot's existing yield to its own 3D model (scene/glyphs.js
// setModelOpacity), composed with that: the larger of the two wins.

import { COPY, t, timeText } from '../copy/en.js';
import '../copy/en.find.js';
import '../copy/en.moments.js';
import { loadCss } from './latercss.js';
import { parseWhen, findEclipse, fadeFor, toInputValue, fromInputValue, MIN_YEAR, MAX_YEAR } from './whenparse.js';

let api = null;
const ORBIT_KLASSES = new Set(['satellite', 'station']);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** The present, as the pill knows it: its last live instant. */
const present = (ctx) => { const a = ctx.timePill && ctx.timePill.anchor ? ctx.timePill.anchor() : NaN; return Number.isFinite(a) ? a : ctx.clock.now(); };

export function openDateJump(ctx, opener) {
  if (!api) api = build(ctx);
  api.open(opener);
  return api;
}

function build(ctx) {
  const D = COPY.dateJump;
  installFade(ctx);
  loadCss('find');
  const root = el('div', 'sr-pop sr-datejump sr-float');
  root.id = 'sr-datejump';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'false');
  root.setAttribute('aria-labelledby', 'sr-datejump-title');
  root.hidden = true;
  const head = el('div', 'sr-datejump__head');
  const title = el('h2', 'sr-micro', D.title);
  title.id = 'sr-datejump-title';
  const close = el('button', 'sr-datejump__close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', D.close);
  close.title = D.close;
  head.append(title, close);
  root.appendChild(head);

  // The browser's own field, read as UTC.
  const form = el('form', 'sr-datejump__form');
  const fieldLab = el('label', 'sr-datejump__label', D.field);
  const field = document.createElement('input');
  field.type = 'datetime-local';
  field.id = 'sr-datejump-field';
  field.className = 'sr-datejump__input';
  field.min = `${MIN_YEAR}-01-01T00:00`;
  field.max = `${MAX_YEAR}-12-31T23:59`;
  field.step = '60';
  fieldLab.htmlFor = field.id;
  const textLab = el('label', 'sr-datejump__label', D.text);
  const text = document.createElement('input');
  text.type = 'text';
  text.id = 'sr-datejump-text';
  text.className = 'sr-datejump__input';
  text.placeholder = D.placeholder;
  text.autocomplete = 'off';
  text.spellcheck = false;
  text.setAttribute('aria-describedby', 'sr-datejump-hint');
  textLab.htmlFor = text.id;
  const go = el('button', 'sr-btn sr-datejump__go', D.go);
  go.type = 'submit';
  const hint = el('p', 'sr-sect__note', D.hint);
  hint.id = 'sr-datejump-hint';
  const says = el('p', 'sr-datejump__says');
  says.setAttribute('role', 'status');
  says.setAttribute('aria-live', 'polite');
  form.append(fieldLab, field, textLab, text, go, hint, says);
  root.appendChild(form);

  // How good the map is, and when.
  const ranges = el('details', 'sr-datejump__ranges');
  ranges.appendChild(el('summary', 'sr-micro', D.rangesTitle));
  const rl = el('ul', 'sr-datejump__rangelist');
  for (const k of ['worlds', 'satellites', 'craft', 'stars']) rl.appendChild(el('li', null, D.ranges[k]));
  ranges.appendChild(rl);
  root.appendChild(ranges);

  // The dates to go to: filled on the first opening, from the missions and the Moments.
  const presets = el('div', 'sr-datejump__presets');
  presets.setAttribute('role', 'group');
  presets.setAttribute('aria-label', D.presetsLabel);
  root.appendChild(presets);
  document.body.appendChild(root);

  let opener = null;
  const say = (words) => { says.textContent = words; };

  function jumpTo(ms) {
    try { ctx.clock.goTo(ms); } catch { /* the pill says where the clock is */ }
    if (ctx.timePill) { ctx.timePill.paint(); ctx.timePill.say(ctx.timePill.words()); }
    field.value = toInputValue(ms);
    say(t(D.gone, { when: timeText.pillUtc(ms, present(ctx)) }));
  }

  async function goText(raw) {
    const r = parseWhen(raw, present(ctx));
    if (!r.ok) { say(D.errors[r.why] || D.errors.unknown); return false; }
    if (r.kind === 'instant') { jumpTo(r.ms); return true; }
    say(D.searching);
    const A = await import('../../vendor/astronomy.js');
    const found = findEclipse(A, r, ctx.clock.now());
    if (!found) { say(D.errors.eclipse); return false; }
    jumpTo(found.ms);
    const key = `${r.body}${found.kind.charAt(0).toUpperCase()}${found.kind.slice(1)}`;
    say(t(D.eclipse, { what: D.eclipses[key] || found.kind, when: timeText.pillUtc(found.ms, present(ctx)) }));
    return true;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (text.value.trim()) { goText(text.value); return; }
    const ms = fromInputValue(field.value);
    if (ms === null) { say(D.errors.empty); return; }
    goText(toInputValue(ms).replace('T', ' '));
  });
  field.addEventListener('change', () => { if (field.value) text.value = ''; });

  let filled = false;
  async function fill() {
    if (filled) return;
    filled = true;
    const [{ MISSIONS }, shelf] = await Promise.all([import('../data/missions.js'), import('../moments/shelf.js').catch(() => null)]);
    const chip = (words, title, onClick) => {
      const b = el('button', 'sr-chip sr-datejump__chip', words);
      b.type = 'button';
      if (title) b.title = title;
      b.addEventListener('click', onClick);
      return b;
    };
    // The eclipses first: the question Solar System Scope's reviewers could not ask.
    const quick = el('div', 'sr-find__chips');
    // The chip's words are the visitor's language; what it asks is ui/whenparse.js's own English form.
    for (const [key, ask] of [['total', 'next total eclipse'], ['lunar', 'next lunar eclipse']]) quick.appendChild(chip(D.quick[key], null, () => { text.value = ''; goText(ask); }));
    presets.appendChild(quick);
    // The Moments, and the cloud of forge #153 beside them.
    const momentsHead = el('h3', 'sr-micro', D.momentsTitle);
    const moments = el('div', 'sr-find__chips');
    const cards = (COPY.momentShelf && COPY.momentShelf.cards) || {};
    for (const s of (shelf && shelf.SHELF) || []) {
      const card = cards[s.id];
      if (!card) continue;
      moments.appendChild(chip(card.title, card.when, () => { if (typeof ctx.wantMoment === 'function') { closeIt(false); ctx.wantMoment(s.id); } })).dataset.moment = s.id;
    }
    // The cloud's own chip only while the shelf has no Fengyun-1C Moment: since b200-c3-learn it has, and the two chips both read
    // "2007: Fengyun-1C" (2.0.0 look finding 9). The Moment is the story told; the cloud is one tap from its end.
    if (!moments.querySelector('[data-moment="fengyun-1c"]')) {
      moments.appendChild(chip(COPY.breakups.moment, COPY.breakups.momentTitle, () => {
        closeIt(false);
        if (typeof ctx.wantFind === 'function') ctx.wantFind().then((f) => f && f.open('clouds', { debris: 'fy1c', atEvent: true }));
      }));
    }
    presets.append(momentsHead, moments);
    // Every dated event of every mission, one list a mission, folded.
    presets.appendChild(el('h3', 'sr-micro', D.missionsTitle));
    for (const m of MISSIONS) {
      const box = el('details', 'sr-datejump__mission');
      box.appendChild(el('summary', null, m.display));
      const list = el('div', 'sr-find__chips');
      for (const e of m.events) {
        const ms = Date.parse(e.date.length <= 10 ? `${e.date}T12:00:00Z` : e.date);
        if (!Number.isFinite(ms)) continue;
        // The title in the visitor's language (copy/en.find.js eventTitles, keyed by the registry's English; 2.0.0 look finding 8).
        list.appendChild(chip((D.eventTitles && D.eventTitles[e.title]) || e.title, timeText.utcLong(ms), () => {
          closeIt(false);
          if (typeof ctx.wantMissions === 'function') ctx.wantMissions().then((mod) => (mod ? mod.openEventWhenReady(ctx, `${m.id}.${e.id}`) : jumpTo(ms)));
          else jumpTo(ms);
        }));
      }
      box.appendChild(list);
      presets.appendChild(box);
    }
  }

  function focusables() {
    return [...root.querySelectorAll('button, input, summary, [href]')].filter((n) => !n.closest('[hidden]') && (n.offsetParent !== null || n === document.activeElement));
  }
  function openIt(from) {
    opener = from || opener;
    root.hidden = false;
    if (opener) opener.setAttribute('aria-expanded', 'true');
    field.value = toInputValue(ctx.clock.now());
    say('');
    fill().catch((e) => console.warn('the dates to go to did not load', e));
    text.focus({ preventScroll: true });
  }
  function closeIt(returnFocus = true) {
    if (root.hidden) return;
    root.hidden = true;
    if (opener) { opener.setAttribute('aria-expanded', 'false'); if (returnFocus) opener.focus({ preventScroll: true }); }
  }
  close.addEventListener('click', () => closeIt(true));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeIt(true); return; }
    if (e.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
    else if (!e.shiftKey && i === list.length - 1) { e.preventDefault(); list[0].focus(); }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!root.hidden && !root.contains(e.target) && !(opener && opener.contains(e.target))) closeIt(false);
  });
  return { root, open: openIt, close: () => closeIt(false), go: goText };
}

let fade = null;
export function installFade(ctx) {
  // Once: main.js installs it after the first visit, the date field on its first opening, whichever is first.
  if (fade) return fade;
  const pill = ctx.timePill;
  const note = el('p', 'sr-time__faded');
  note.hidden = true;
  if (pill && pill.root) pill.root.appendChild(note);
  let k = 0;
  const layerOf = (id) => (ctx.layers || []).find((l) => l.id === id) || null;
  for (const [id, gl] of (ctx.glyphLayers || new Map())) {
    const l = layerOf(id);
    if (!l || !ORBIT_KLASSES.has(l.klass) || !gl.setModelOpacity) continue;
    // main.js loadAllLayers gives every layer this yield to its 3D model; the fade is composed with it.
    gl.setModelOpacity((rid) => Math.max(ctx.heroes ? ctx.heroes.drawnOpacity(rid) : 0, k));
  }
  function paint() {
    const now = ctx.clock.now();
    const away = now - present(ctx);
    const next = ctx.clock.mode === 'live' ? 0 : fadeFor(away);
    if (next !== k) { k = next; ctx.marksStale = true; }
    const show = k >= 0.4;
    note.hidden = !show;
    if (show) note.textContent = t(COPY.dateJump.faded, { year: String(new Date(now).getUTCFullYear()) });
  }
  if (pill && typeof pill.onPaint === 'function') pill.onPaint(paint);
  paint();
  fade = { paint };
  return fade;
}
