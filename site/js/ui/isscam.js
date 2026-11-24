// ui/isscam.js -- the station's live camera beside its place on the map (forge #544; the awesome-space research of
// 2026-11-23, idea 1).
//
// Contract: mountCameraRow(box, record, ctx) -> { destroy() }     the station card's "Live camera" row (ui/cards.js)
//           openCamera(ctx, record, { opener }) -> { close() }   the panel beside the map, built on the press
// Also exported, pure, for tests/test_isscam.mjs:
//   cameraFor(record, links = LINKS) -> { url, watch, host, checked, page } | null   the registry's player for a record
//   frameSrc(embed) -> the player's address with what it is asked to do (autoplay muted; no related videos)
//   lightLine(state) -> the sentence on whether the station is in sunlight now ('sunlit' | 'shadow' | null)
//
// NOTHING OF YOUTUBE'S BEFORE THE PRESS. The card's row is our own words and our own button: no thumbnail fetched, no
// script, no preconnect, no frame. The frame is made in openCamera, on the press, from registry/links.yaml `iss-live`
// `embed:` (YouTube's privacy-enhanced host, www.youtube-nocookie.com: NASA's live video, from the playlist NASA Live links
// under "Space Station Views"); the note under the button says where the press connects. When the frame cannot play, the panel still has the
// stream on YouTube's page and NASA Live as plain links, so it degrades to the links the card already had.
//
// HONEST ABOUT THE PICTURE. It is NASA's camera, never a simulation: the credit says the globe beside it is our map.
// The station spends more than a third of most orbits in the Earth's shadow and the feed drops when it loses contact
// with the ground, so the row says the picture is often dark, blue or a test card, and the line under it says, from
// the map's own position (scene/shadow.js sunlitState, the card's "In sunlight" row), whether it is in sunlight now.
// No status dot claims the stream is up: nothing here can know that without asking YouTube.

import { COPY, t, timeText } from '../copy/en.js';
import '../copy/en.live.js';
import { LINKS } from '../data/links.js';
import { icon } from './icons.js';
import { loadCss } from './latercss.js';
import { sunlitState } from '../scene/shadow.js';

const LIGHT_MS = 30e3;

// The platform's queue (site/js/ui/platform-bridge.js, CONTRACT.md) is not on main yet: a no-op until it is.
// TODO(platform-bridge): call sr('track', name, params) from site/js/ui/platform-bridge.js once that module is on main.
const track = () => {};

/** The registry's player for this record: the first link of its card that carries `embed`. Pure. */
export function cameraFor(record, links = LINKS) {
  const rows = record && record.id && links ? links[record.id] : null;
  const row = Array.isArray(rows) ? rows.find((r) => r && r.embed && /^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(String(r.embed.url || ''))) : null;
  return row ? { ...row.embed, page: row.url || null, publisher: row.publisher || '' } : null;
}

/** The player's address: autoplay (muted, as browsers require), no related videos at the end. Pure. */
export function frameSrc(embed) {
  if (!embed || !embed.url) return '';
  const u = String(embed.url);
  return `${u}${u.includes('?') ? '&' : '?'}autoplay=1&mute=1&rel=0&playsinline=1`;
}

/** Whether the station is in sunlight, in words. Pure. */
export function lightLine(state) {
  const C = COPY.issCam;
  return state === 'sunlit' ? C.sunlit : state === 'shadow' ? C.shadow : '';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function linkOut(className, words, href) {
  const a = el('a', className, words);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

const nowOf = (ctx) => (ctx && ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
const lightOf = (record, ctx) => { try { return sunlitState(record, nowOf(ctx)); } catch { return null; } };

let panel = null; // the one panel; a second press brings it back to the front

/** The panel beside the map, with the player in it. Built on the press, never before. */
export function openCamera(ctx, record, { opener = null } = {}) {
  const C = COPY.issCam;
  const embed = cameraFor(record);
  if (panel) { panel.focus(); return panel; }
  loadCss('live');
  const root = el('section', 'sr-isscam sr-float ui-pop');
  root.setAttribute('role', 'region');
  root.setAttribute('aria-labelledby', 'sr-isscam-title');
  root.tabIndex = -1;

  const head = el('div', 'ui-pop__head');
  const title = el('h2', 'ui-pop__title', C.title);
  title.id = 'sr-isscam-title';
  const x = el('button', 'ui-close');
  x.type = 'button';
  x.setAttribute('aria-label', C.close);
  x.title = C.close;
  x.appendChild(icon('x'));
  head.append(title, x);

  const body = el('div', 'ui-pop__body');
  const frameBox = el('div', 'sr-isscam__frame');
  const wait = el('p', 'sr-isscam__wait', C.loading);
  frameBox.appendChild(wait);
  if (embed) {
    const frame = el('iframe');
    frame.title = C.frameTitle;
    frame.src = frameSrc(embed);
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', () => { wait.hidden = true; }, { once: true });
    frameBox.appendChild(frame);
  }
  const light = el('p', 'sr-card__note sr-isscam__light', lightLine(lightOf(record, ctx)));
  const credit = el('p', 'sr-card__note', C.credit);
  const links = el('div', 'sr-isscam__links');
  if (embed && embed.watch) links.appendChild(linkOut('ui-btn ui-btn--sm', C.onYoutube, embed.watch));
  if (embed && embed.page) links.appendChild(linkOut('ui-btn ui-btn--sm ui-btn--quiet', C.nasaLive, embed.page));
  const checked = embed && embed.checked ? el('p', 'sr-card__source', t(C.checked, { date: timeText.utcLong(Date.parse(`${embed.checked}T12:00:00Z`)) })) : null;
  // The dark-picture note is the card row's too: on a phone, where the panel sits over the sheet, it is said there only.
  body.append(frameBox, light, el('p', 'sr-card__note sr-isscam__dark', C.dark), credit, links);
  if (checked) body.appendChild(checked);
  root.append(head, body);
  document.body.appendChild(root);

  const timer = setInterval(() => { light.textContent = lightLine(lightOf(record, ctx)); }, LIGHT_MS);
  const onKey = (e) => { if (e.key === 'Escape' && root.contains(document.activeElement)) { e.stopPropagation(); close(); } };
  function close() {
    clearInterval(timer);
    document.removeEventListener('keydown', onKey, true);
    root.remove(); // the frame goes with it: nothing keeps playing behind a closed panel
    panel = null;
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
  }
  x.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  title.tabIndex = -1;
  x.focus({ preventScroll: true });
  // TODO(platform-bridge): sr('track', 'video_start', { video_id: 'iss-live', percent: 0 }).
  track('video_start', { video_id: 'iss-live', percent: 0 });
  panel = { close, focus: () => x.focus({ preventScroll: true }), root };
  return panel;
}

/** The station card's row: our words and our button; the player only on the press. */
export function mountCameraRow(box, record, ctx) {
  const C = COPY.issCam;
  const embed = cameraFor(record);
  loadCss('live');
  const wrap = el('div', 'sr-isscam-row');
  wrap.appendChild(el('p', 'sr-card__sentence', C.lead));
  const light = el('p', 'sr-card__note', lightLine(lightOf(record, ctx)));
  light.hidden = !light.textContent;
  wrap.appendChild(light);
  if (embed) {
    const b = el('button', 'ui-btn sr-isscam-row__watch');
    b.type = 'button';
    b.title = C.watchTitle;
    b.appendChild(icon('play', 18));
    b.appendChild(el('span', 'ui-btn__label', C.watch));
    b.addEventListener('click', () => openCamera(ctx, record, { opener: b }));
    wrap.appendChild(b);
    wrap.appendChild(el('p', 'sr-card__source', C.privacy));
  }
  wrap.appendChild(el('p', 'sr-card__note', C.dark));
  box.appendChild(wrap);
  return { destroy() { wrap.remove(); } };
}
