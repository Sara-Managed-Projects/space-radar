// ui/holespin.js -- one line on a black hole's card: the spin it is drawn with, and how much of that is chosen (forge #149).
//
// Contract: spinWords(id, K) -> string | ''   pure;  mountSpin(box, record, ctx)   fills `box`
//           EHT_PICTURES, DRAWN_BRIGHTEST_PA   (b200-c2-deep) the pictures a card compares with, and where each is brightest
// Imported by ui/cards.js when the card of a hole scene/kerrshadow.js SPINS names is opened.
//
// b200-c2-deep (forge #149): under the spin line, "Seen from Earth" stands the camera where the EHT stood, north up
// (scene/holepose.js), and "Compare with the EHT picture" does that and shows their pictures in the card, beside the
// drawn hole; then two lines say where each is brightest and, plainly, what is matched and what is approximated.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.stars.js';
import { SPINS } from '../scene/kerrshadow.js';
// b200-c2-deep: begin
import '../copy/en.deep.js';
import { loadCss } from './latercss.js';
// b200-c2-deep: end

/** The card's words for a spun hole, or '' for one drawn without spin. */
export function spinWords(id, K) {
  const key = String(id || '').replace(/^exotic-/, ''); // the record is `exotic-m87-star`, the profile `m87-star`
  const a = SPINS[key];
  if (!(a > 0)) return '';
  return t(K.spin, { a: fmt.num(a, 2), why: K.spinWhy[key] || '' });
}

export function mountSpin(box, record, ctx) {
  const words = spinWords(record && record.id, COPY.blackHoleSpin);
  if (!words) return;
  box.className = 'sr-card__block sr-card__varcurve';
  const p = document.createElement('p');
  p.className = 'sr-card__aboardnote';
  p.textContent = words;
  box.appendChild(p);
  box.hidden = false;
  mountCompare(box, record, ctx); // b200-c2-deep
}

// b200-c2-deep: begin -- the EHT's pictures beside the drawn hole (forge #149)
const IMG = (f) => new URL(`../../images/${f}`, import.meta.url).href;
/**
 * The pictures each card compares with: registry/exotics.yaml's own (ESO's eso1907a and eso2208-eht-mwa) and M87*'s of
 * 2018 (EHT Collaboration 2024, A&A 681, A79; registry/asset_sources.yaml). `pa` is where each is brightest, in degrees
 * east of north, MEASURED on these files (a brightness-weighted mean over the ring, 2026-11-07; the batch's changelog
 * gives the method).
 */
export const EHT_PICTURES = {
  'm87-star': [
    { file: 'eht-m87.jpg', date: '2017-04-11', pa: 172, source: 'https://www.eso.org/public/images/eso1907a/' },
    { file: 'eht-m87-2018.jpg', date: '2018-04-21', pa: 216, source: 'https://doi.org/10.1051/0004-6361/202347932' },
  ],
  'sgr-a-star': [{ file: 'eht-sgr-a.jpg', date: '2017-04', pa: 322, source: 'https://www.eso.org/public/images/eso2208-eht-mwa/' }],
};
/** Where the drawn ring is brightest seen from Earth, north up: measured the same way on the look run's pictures. */
export const DRAWN_BRIGHTEST_PA = { 'm87-star': 205, 'sgr-a-star': 332 };

const keyOf = (record) => String((record && record.id) || '').replace(/^exotic-/, '');
const stillMotion = () => (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  || (typeof document !== 'undefined' && document.documentElement.dataset.srMotion === 'off');
const dateWords = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const opts = d ? { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' } : { year: 'numeric', month: 'long', timeZone: 'UTC' };
  try { return new Intl.DateTimeFormat(document.documentElement.lang || 'en', opts).format(Date.UTC(y, m - 1, d || 1)); } catch { return iso; }
};

function mountCompare(box, record, ctx) {
  const key = keyOf(record);
  const pics = EHT_PICTURES[key];
  if (!pics || !ctx) return;
  loadCss('deep');
  const K = COPY.holeCompare;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const row = el('div', 'sr-holecmp__row');
  const earth = el('button', 'sr-btn sr-btn--quiet sr-card__inline', K.fromEarth);
  earth.type = 'button';
  earth.title = K.fromEarthTitle;
  const cmp = el('button', 'sr-btn sr-btn--quiet sr-card__inline', K.compare);
  cmp.type = 'button';
  cmp.title = K.compareTitle;
  cmp.setAttribute('aria-expanded', 'false');
  row.append(earth, cmp);
  const figs = el('div', 'sr-holecmp__figs');
  figs.hidden = true;
  figs.id = `sr-holecmp-${key}`;
  cmp.setAttribute('aria-controls', figs.id);
  box.append(row, figs);

  function standFromEarth() {
    // The pose's module is tiny and only a press away; the rig keeps the camera's up, so north stays up while it orbits.
    import('../scene/holepose.js').then((m) => {
      const pose = ctx.stage && ctx.cameraRig && ctx.camera ? m.earthPose(record, ctx.stage) : null;
      if (!pose) return;
      ctx.camera.up.copy(pose.north);
      ctx.cameraRig.flyTo({ targetScene: pose.target, offset: pose.toEarth, distance: ctx.cameraRig.state.distance, ms: stillMotion() ? 0 : 1200 });
    }).catch(() => { /* the card stands without it */ });
  }
  earth.addEventListener('click', standFromEarth);
  cmp.addEventListener('click', () => {
    const open = figs.hidden;
    if (open && !figs.childElementCount) {
      for (const pic of pics) {
        const fig = el('figure', 'sr-holecmp__fig');
        const img = el('img');
        img.src = IMG(pic.file);
        img.alt = t(K.alt, { name: record.name, date: dateWords(pic.date) });
        img.loading = 'lazy';
        img.decoding = 'async';
        fig.append(img, el('figcaption', null, t(K.caption, { date: dateWords(pic.date) })));
        figs.appendChild(fig);
      }
      const note = el('p', 'sr-holecmp__note');
      note.append(`${K.orient} ${K.credit} `);
      pics.forEach((pic, i) => {
        const a = el('a', null, pics.length > 1 ? `${K.source} ${i + 1}` : K.source);
        a.href = pic.source; a.target = '_blank'; a.rel = 'noopener noreferrer';
        note.append(a, i < pics.length - 1 ? ', ' : '.');
      });
      figs.appendChild(note);
      const last = pics[pics.length - 1];
      figs.appendChild(el('p', 'sr-holecmp__note', t(K.brightest, { ours: fmt.int(DRAWN_BRIGHTEST_PA[key]), theirs: fmt.int(last.pa), date: dateWords(last.date) })));
      figs.appendChild(el('p', 'sr-holecmp__note', K.approx[key] || ''));
    }
    figs.hidden = !open;
    cmp.textContent = open ? K.hide : K.compare;
    cmp.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) standFromEarth();
  });
}
// b200-c2-deep: end
