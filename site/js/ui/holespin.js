// ui/holespin.js -- one line on a black hole's card: the spin it is drawn with, and how much of that is chosen (forge #149).
//
// Contract: spinWords(id, K) -> string | ''   pure;  mountSpin(box, record)   fills `box`
// Imported by ui/cards.js when the card of a hole scene/kerrshadow.js SPINS names is opened.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.stars.js';
import { SPINS } from '../scene/kerrshadow.js';

/** The card's words for a spun hole, or '' for one drawn without spin. */
export function spinWords(id, K) {
  const key = String(id || '').replace(/^exotic-/, ''); // the record is `exotic-m87-star`, the profile `m87-star`
  const a = SPINS[key];
  if (!(a > 0)) return '';
  return t(K.spin, { a: fmt.num(a, 2), why: K.spinWhy[key] || '' });
}

export function mountSpin(box, record) {
  const words = spinWords(record && record.id, COPY.blackHoleSpin);
  if (!words) return;
  box.className = 'sr-card__block sr-card__varcurve';
  const p = document.createElement('p');
  p.className = 'sr-card__aboardnote';
  p.textContent = words;
  box.appendChild(p);
  box.hidden = false;
}
