// ui/truthlegend.js -- the one legend of the app's honesty words, inside every card (internal spec 0076
// W1-c; internal #908, #892, #884, #918; SR-PLAN-138, -177, -105, -142, -083, -170).
//
// Contract: fillLegend(panel, record, ctx, m) -> Promise   fills the card's row "How we know"
// Pure, for tests/test_truthlegend.mjs: legendRows(record, ctx, m, {picture, band}), takenWords(taken),
//   termsIn(text, list), glossaryList()
//
// WHERE IT LIVES. Not a panel of its own (docs/ui-guide.md principle 2): the last of the card's rows
// that open in place, straight above the honesty line it explains (ui/cardfacts.js truthRow, added by
// ui/cards.js moreSections). Its body is made of the card's own parts and nothing new: microlabels
// (`.sr-card__label`), the card's two-column rows (`.sr-rows`) and its small notes (`.sr-card__note`),
// so it reads as the rows above it do, at 1440 px and on a 320 px phone.
//
// WHAT IT SAYS. Three groups. ON THIS CARD: how its position is known (the honesty line's first half),
// what is drawn for it and which of that draws now (by the shares, as the HUD's tag says it), and for a
// photograph or a sky in other light, who took it, when (or that the date is not published) and how
// its colours were made: one decoder for SR-PLAN-142. THE WORDS, EVERYWHERE: every honesty class the
// app uses, a position's four, the five drawn classes and the two looks, each with what it means. No
// second truth system: the classes are the ones data/deepsky.js DRAWN_CLASSES, the records' `cls` and
// scene/exposure.js DRAWN already hold. WORDS ON THIS CARD: the glossary's terms the card's text uses
// (registry/glossary.yaml), at most six.
//
// NOT AT BOOT, NOT IN THE EMBED. ui/cardfacts.js imports this file dynamically the first time the row
// opens (tests/test_boot_diet.mjs). The photographs' and the other-light registries come the same way.

import { COPY, GLOSSARY, t, timeText } from '../copy/en.js';
import '../copy/en.later.js';
import { klassOf, drawnNow, positionKey } from './cardfacts.js';
import { drawnOf, DRAWN_CLASSES } from '../data/deepsky.js';

const MAX_TERMS = 6;
const POSITION_CLASSES = ['measured', 'inferred', 'illustrative', 'sample'];
const LOOKS = ['measured', 'film'];
const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/**
 * A registry's `taken` in words: "2014", "September 1997", "5 June 2012", or a span "2004 to 2006"
 * from "A..B". Null for anything else: the caller then says the date is not published. Pure.
 */
export function takenWords(taken) {
  const one = (s) => {
    const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || '').trim());
    if (!m) return null;
    const y = Number(m[1]);
    if (!m[2]) return String(y);
    const mo = Number(m[2]) - 1;
    if (!(mo >= 0 && mo < 12)) return null;
    if (!m[3]) return monthFmt.format(new Date(Date.UTC(y, mo, 1)));
    return timeText.utcLong(Date.UTC(y, mo, Number(m[3])));
  };
  const s = String(taken || '').trim();
  if (!s) return null;
  if (s.includes('..')) {
    const [a, b] = s.split('..').map(one);
    return a && b ? t(COPY.r12Truth.span, { a, b }) : null;
  }
  return one(s);
}

/** The glossary the legend draws on: copy/en.js GLOSSARY and the deep sky's five (r12Truth.glossary). */
export function glossaryList() {
  const out = Object.entries(GLOSSARY).map(([term, say]) => ({ term, say, match: [] }));
  for (const g of COPY.r12Truth.glossary) out.push({ term: g.term, say: g.say, match: g.match || [] });
  return out;
}

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The glossary's terms that `text` uses (a term, its plural, or one of its `match` words), in list order, at most six. Pure. */
export function termsIn(text, list = glossaryList()) {
  const hay = String(text || '');
  const out = [];
  for (const g of list) {
    const words = [g.term, ...(g.match || [])];
    if (words.some((w) => new RegExp(`(^|[^A-Za-z])${escape(w)}(s|es)?([^A-Za-z]|$)`, 'i').test(hay))) out.push(g);
    if (out.length >= MAX_TERMS) break;
  }
  return out;
}

/**
 * The legend's rows for one card, as strings: `{ here, words, terms }`, each a list of [key, value]
 * (terms: {term, say}). `picture` is the record's row of data/nebulae.js and `band` the chosen row of
 * data/otherlight.js, or null. Pure but for `ctx` (the shares, the look and the band).
 */
export function legendRows(record, ctx, m, { picture = null, band = null, text = '' } = {}) {
  const C = COPY.r12Truth;
  const R = C.rows;
  const H = COPY.truth.hints;
  const here = [];
  here.push([R.where, H[positionKey(record, m)] || H.unknown]);
  if (klassOf(record) === 'dso') {
    const classes = drawnOf(record);
    const list = classes.map((c) => H[c]).filter(Boolean).map((w, i) => (i ? w.toLowerCase() : w));
    here.push([R.drawn, list.join(COPY.punctuation.listJoin)]);
    if (classes.length > 1) here.push([R.drawnNow, H[drawnNow(record, ctx)] || H.illustration]);
  }
  if (picture) {
    const o = picture.observed || {};
    if (o.by) here.push([R.photo, String(o.by)]);
    here.push([R.taken, takenWords(o.taken) || C.notPublished]);
    if (o.released) here.push([R.released, takenWords(o.released) || String(o.released)]);
    if (picture.filters) here.push([R.filters, String(picture.filters)]);
    here.push([R.colours, C.colours[picture.colours] || C.colours.unstated]);
  }
  if (band) {
    const name = (COPY.otherLight.bands && COPY.otherLight.bands[band.id]) || band.id;
    const o = band.observed || {};
    here.push([R.sky, t(C.falseColour, { band: name })]);
    here.push([R.survey, String(o.by || band.mission || '')]);
    here.push([R.taken, takenWords(o.taken) || C.notPublished]);
    if (COPY.otherLight.colours && COPY.otherLight.colours[band.id]) here.push([R.colours, COPY.otherLight.colours[band.id]]);
  }
  const look = ctx && typeof ctx.look === 'function' ? ctx.look() : null;
  if (LOOKS.includes(look)) here.push([R.look, COPY.look.modes[look]]);

  const words = [
    ...POSITION_CLASSES.map((c) => [H[c], C.position[c]]),
    ...DRAWN_CLASSES.map((c) => [H[c], C.drawn[c]]),
    ...LOOKS.map((k) => [t(C.lookWord, { mode: COPY.look.modes[k] }), COPY.look.titles[k]]),
  ];
  return { here, words, terms: termsIn(text) };
}

function node(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

function rowsList(rows) {
  const dl = node('dl', 'sr-rows');
  for (const [k, v] of rows) {
    if (!k || !v) continue;
    dl.appendChild(node('dt', 'sr-rows__key', k));
    dl.appendChild(node('dd', 'sr-rows__val', v));
  }
  return dl;
}

/** The words of the card round `panel`, one text node to a word gap, leaving the panel out. */
function cardText(panel) {
  const card = panel.closest ? panel.closest('.sr-card') : null;
  if (!card || typeof document.createTreeWalker !== 'function') return '';
  const walk = document.createTreeWalker(card, 4 /* NodeFilter.SHOW_TEXT */);
  const out = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) if (!panel.contains(n)) out.push(n.nodeValue);
  return out.join(' ');
}

/**
 * Fill the row's panel. The card's own text (less this panel) says which glossary terms it uses; a
 * photograph's row and a chosen band's row are fetched as the card's "About it" fetches them.
 */
export async function fillLegend(panel, record, ctx, m) {
  const C = COPY.r12Truth;
  const text = cardText(panel);
  let picture = null;
  let band = null;
  if (klassOf(record) === 'dso') {
    try {
      const mod = await import('../data/nebulae.js');
      picture = (mod.NEBULAE || []).find((r) => `dso-${r.id}` === record.id) || null;
    } catch { picture = null; }
  }
  const bandId = ctx && ctx.otherLight ? ctx.otherLight.band : null;
  if (bandId) {
    try {
      const mod = await import('../data/otherlight.js');
      band = (mod.OTHER_LIGHT || []).find((b) => b.id === bandId) || null;
    } catch { band = null; }
  }
  const L = legendRows(record, ctx, m, { picture, band, text });
  // One <section> per group: the panel's 12 px rhythm (.sr-disc__body > * + *) falls between the groups,
  // and inside each the microlabel keeps its own 8 px over its rows (seen at 320 px on 2026-10-15: as
  // siblings, the label's own margin cancelled the gap and it sat on the row above).
  const group = (title, ...kids) => { const sec = node('section', null); sec.appendChild(node('h3', 'sr-card__label', title)); for (const k of kids) sec.appendChild(k); return sec; };
  const parts = [group(C.here, rowsList(L.here)), group(C.words, rowsList(L.words))];
  if (L.terms.length) parts.push(group(C.terms, ...L.terms.map((g) => node('p', 'sr-card__note', t(C.termLine, { term: g.term, say: g.say })))));
  panel.replaceChildren(...parts);
  return L;
}
