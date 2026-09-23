// ui/sound.js -- the one sound control, wherever it is put (spec 0035 design §5, 2026-09-23).
//
// Contract export: soundButton(ctx, className, kind) -> HTMLButtonElement
//                  soundPanel(ctx) -> HTMLElement      the row at the foot of the controls panel
//                  creditsText(rows) -> string          "Music and sounds: …", pure
//
// Four places carry it: the trip's intro card (`toggle`, "Sound: off"), the letterbox and the
// phone bar (`mute`), and the controls panel, which is the only one a desktop visitor outside a
// trip can reach -- without it, a returning visitor whose stored choice is "on" would hear the bed
// on their first click and have no way to stop it short of starting a trip. Every copy is the same
// button painted from engine.onChange, so the four can never disagree about whether sound is on.
//
// The click IS the gesture the browser wants before it will start an AudioContext; that is why
// the engine is only ever enabled from here and from the engine's own first-gesture listener.

import { COPY, t } from '../copy/en.js';

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
  // Unsubscribes itself once it has left the page: the intro card and the letterbox are rebuilt
  // for every trip, and a listener per rebuild would outlive every button it painted.
  let seen = false;
  const off = audio.onChange(() => {
    if (b.isConnected) seen = true;
    else if (seen) { off(); return; }
    paint();
  });
  return b;
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
