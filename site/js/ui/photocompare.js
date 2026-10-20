// ui/photocompare.js -- "Compare with the photograph", a row in a deep-sky card's photograph block
// (internal i#776, DS-C10 #821; spec 0075 requirement 14 and design section 9).
//
// Contract: mountPhotoCompare(box, record, ctx) -> Promise<{ destroy() } | null>. It adds one panel to `box`
// (the card's `.sr-card__exposure`) when, and only when, the object has a photograph on the sky AND a shipped
// reconstruction to compare it with; otherwise it adds nothing and resolves null.
//
// WHAT IT IS. A control on the card, not a mode (requirement 14: no second state machine beside Measured and
// Film). A slider: at the left the reconstruction draws; at the right the hero is hidden and the photograph
// draws at full strength at the same pose; between, each is drawn by its share. Pressing it when the camera is
// off the line the photograph was taken along (more than 25 degrees off the Sun's line) first flies the camera
// to the arrival the card's own "Fly to it" uses, which is that line.
//
// WHAT IT IS NOT. It is not remembered, it has no URL key, and it is put back to the reconstruction whenever
// another object is selected or the card closes (scene/nebulae.js setCompare/want). The photograph is flat and
// faces the Sun: turn away from that line and it fades (scene/nebulae.js viewFade), and the hero with it,
// so the object is never drawn by neither.
//
// Fetched by ui/cards.js after the registry's picture rows have landed; never at boot.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { heroShipped } from '../scene/deep/heroes.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** What a screen reader hears for a slider position (0..100). Pure. */
export function valueText(v) {
  const P = COPY.photoCompare;
  if (v <= 0) return P.reconstruction;
  if (v >= 100) return P.photograph;
  return t(P.valueText, { n: fmt.int(v) });
}

/** The camera is off the line the picture was taken along when the picture is drawn at less than its whole. Pure. */
export const offTheLine = (share) => !(share >= 0.999);

export function mountPhotoCompare(box, record, ctx) {
  const P = COPY.photoCompare;
  const id = String(record && record.id || '');
  return Promise.resolve(heroShipped(id)).then((shipped) => {
    if (!shipped || !ctx) return null;
    const nebulae = ctx.nebulae || (typeof ctx.wantNebulae === 'function' ? ctx.wantNebulae() : null);
    return Promise.resolve(nebulae).then((neb) => {
      if (!neb || typeof neb.setCompare !== 'function' || box.isConnected === false) return null;
      const wrap = el('section', 'sr-panel sr-density sr-exposure sr-photocmp');
      wrap.dataset.record = id;
      wrap.appendChild(el('h2', 'sr-panel__title', P.title));
      const track = el('div', 'sr-photocmp__track');
      const fill = el('span', 'sr-photocmp__fill');
      const field = document.createElement('input');
      field.className = 'sr-photocmp__field';
      field.setAttribute('type', 'range');
      field.setAttribute('min', '0');
      field.setAttribute('max', '100');
      field.setAttribute('step', '1');
      field.setAttribute('aria-label', P.title);
      track.append(fill, field);
      wrap.appendChild(track);
      const ends = el('div', 'sr-photocmp__ends');
      ends.append(el('span', '', P.reconstruction), el('span', '', P.photograph));
      wrap.appendChild(ends);
      const note = el('p', 'sr-density__note', P.note);
      wrap.appendChild(note);
      const said = el('p', 'sr-density__note');
      said.setAttribute('role', 'status');
      wrap.appendChild(said);
      const paint = (v) => {
        field.value = String(v);
        fill.style.width = `${v}%`;
        field.setAttribute('aria-valuetext', valueText(v));
      };
      paint(Math.round(100 * (typeof neb.compareK === 'function' ? neb.compareK(id) : 0)));
      let flew = false;
      field.addEventListener('input', () => {
        const v = Math.max(0, Math.min(100, Number(field.value) || 0));
        paint(v);
        // Off the line it was taken along, the first press flies there: round the object to the Sun's side, at the
        // distance it is at, which is where its photograph was taken from. Without a rig, the card's own arrival.
        if (v > 0 && !flew && typeof neb.lineShare === 'function' && offTheLine(neb.lineShare(id))) {
          flew = true;
          said.textContent = P.flying;
          try {
            const line = typeof neb.lineFor === 'function' ? neb.lineFor(id) : null;
            if (line && ctx.cameraRig && typeof ctx.cameraRig.flyTo === 'function') ctx.cameraRig.flyTo({ targetScene: line.target, offset: line.offset, distance: ctx.cameraRig.state.distance, ms: 900 });
            else if (typeof ctx.flyToRecord === 'function') ctx.flyToRecord(record, 900);
          } catch { /* a camera that will not fly is not worth breaking the card over */ }
          setTimeout(() => { if (said.isConnected !== false) said.textContent = ''; }, 2400);
        }
        if (v === 0) flew = false;
        neb.setCompare(id, v / 100);
      });
      box.appendChild(wrap);
      return { destroy() { wrap.remove(); } };
    });
  }).catch(() => null);
}
