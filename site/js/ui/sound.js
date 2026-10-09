// ui/sound.js -- the one sound control, wherever it is put (spec 0035 design §5, 2026-09-23).
//
// Contract export: soundButton(ctx, className, kind) -> HTMLButtonElement
//                  soundPanel(ctx) -> HTMLElement      the row at the foot of the controls panel
//                  creditsText(rows) -> string          "Music and sounds: …", pure
//
// It is carried by the phone bar (`mute`) and the What-to-show popover, which is the one a desktop
// visitor outside a trip can reach -- without it, a returning visitor whose stored choice is "on"
// would hear the bed on their first click and have no way to stop it short of starting a trip.
// Every copy is painted from engine.onChange, so they can never disagree about whether sound is
// on. A trip draws its own icon toggle on the intro and in its toolbar (ui/tripframe.js
// paintSound, spec 0061 task 7), read from the same engine.
//
// The click IS the gesture the browser wants before it will start an AudioContext; that is why
// the engine is only ever enabled from here and from the engine's own first-gesture listener.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';

/** The Sources panel's credit line, from the registry mirror's rows. Empty when nothing ships. */
export function creditsText(rows) {
  const seen = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    const c = r && r.credit ? String(r.credit) : '';
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen.length ? t(COPY.audio.creditsLine, { credits: seen.join('; ') }) : '';
}

export function soundButton(ctx, className, kind = 'toggle') {
  const audio = ctx && ctx.audio;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  const paint = () => {
    const on = !!(audio && audio.isOn());
    if (kind === 'mute') {
      b.textContent = on ? COPY.audio.mute : COPY.audio.unmute;
      b.title = on ? COPY.audio.muteTitle : COPY.audio.unmuteTitle;
    } else {
      b.textContent = on ? COPY.audio.on : COPY.audio.off;
      b.title = COPY.audio.toggleTitle;
    }
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.classList.toggle('is-on', on);
  };
  paint();
  if (!audio) {
    b.disabled = true;
    return b;
  }
  b.addEventListener('click', () => audio.toggle());
  // Unsubscribes itself once it has left the page: a panel that holds one can be rebuilt, and a
  // listener per rebuild would outlive every button it painted.
  let seen = false;
  const off = audio.onChange(() => {
    if (b.isConnected) seen = true;
    else if (seen) { off(); return; }
    paint();
  });
  return b;
}

/**
 * The volume, in What to show as well as in a trip's toolbar (public #298; internal #432): the
 * same native range, shown while sound is on, kept by the engine. Null where there is no audio.
 */
export function volumeSlider(ctx, className) {
  const audio = ctx && ctx.audio;
  if (!audio || typeof audio.setVolume !== 'function' || typeof audio.volume !== 'function') return null;
  const T = COPY.trip;
  const v = document.createElement('input');
  v.type = 'range';
  v.className = className;
  v.min = '0';
  v.max = '100';
  v.step = '5';
  v.setAttribute('aria-label', T.volume);
  v.title = T.volumeTitle;
  v.addEventListener('input', () => audio.setVolume(Number(v.value) / 100));
  const paint = () => {
    v.hidden = !audio.isOn();
    if (!v.hidden && document.activeElement !== v) v.value = String(Math.round(audio.volume() * 100));
  };
  paint();
  let seen = false;
  const off = audio.onChange(() => {
    if (v.isConnected) seen = true;
    else if (seen) { off(); return; }
    paint();
  });
  return v;
}

export function soundPanel(ctx) {
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-sound';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = COPY.audio.panelTitle;
  wrap.appendChild(title);
  const note = document.createElement('p');
  note.className = 'sr-sound__note';
  note.textContent = COPY.audio.panelNote;
  wrap.appendChild(note);
  wrap.appendChild(soundButton(ctx, 'sr-btn sr-sound__btn', 'toggle'));
  return wrap;
}
