// ui/skystory.js -- a sky figure's story, on its own small card (forge #143).
//
// Contract: storyFor(doc, key)               -> { text, more, cite, from } | null    pure
//           sourceLines(doc, story, words)   -> [string]                             pure: what the card says it rests on
//           openSkyStory(lore)               opens the card for { culture, key, name, cultureName }
//           closeSkyStory()                  closes it, and gives the focus back to where it was
// Imported by sky/groundsky.js the first time a figure's tag is pressed (or the figure tapped twice):
// neither this, nor css/skystory.css, nor data/skystories/<culture>.json is fetched before.
//
// WHAT IT SAYS. The story Stellarium's description of that sky culture gives the figure, as it stands
// (CC BY-SA 4.0, credited: every credit line names the licence), and, where registry/skystories.yaml adds one, a short summary in our
// own words with the published source it rests on. A figure no source we may share tells a story of says
// so, rather than being given one. Every story is labelled illustrative: one telling, as its source records
// it. The stories are in English, their sources' language, in every language of the app, and the card
// says so in the visitor's own when that is not English: there is no licensed translation.
//
// A card, not a dialog that takes the page: the sky stays live behind it. Escape or the close button
// closes it, and the focus goes back to what had it; it is a labelled region a screen reader announces.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';

const docs = new Map(); // culture -> Promise<doc>
let card = null;
let returnFocus = null;
let cssLoading = null;

/** The story of `key` in a data/skystories/<culture>.json document, or null when the file has no such figure. */
export function storyFor(doc, key) {
  const s = doc && doc.stories && Object.prototype.hasOwnProperty.call(doc.stories, key) ? doc.stories[key] : null;
  if (!s) return null;
  if (s.none) return { text: '', more: '', cite: '', from: 'none' };
  return { text: s.t || '', more: s.o || '', cite: s.c || '', from: s.s === 'ours' ? 'ours' : 'stellarium' };
}

/** The lines under the story: where its words come from, and what kind of thing it is. `words` is COPY.skyLore. */
export function sourceLines(doc, story, words) {
  if (!story || story.from === 'none') return [words.none];
  const out = [];
  if (story.from === 'stellarium') out.push(t(words.fromStellarium, { credit: (doc && doc.credit) || '' }));
  if (story.cite) out.push(t(words.ours, { cite: story.cite }));
  out.push(words.honesty);
  return out;
}

function loadCss() {
  if (cssLoading) return cssLoading;
  cssLoading = new Promise((resolve) => {
    const href = new URL('../../css/skystory.css', import.meta.url).href;
    if ([...document.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(link);
  });
  return cssLoading;
}

function docFor(culture) {
  if (!/^[a-z]{2,24}$/.test(culture)) return Promise.reject(new Error(`skystory: no culture ${culture}`));
  let p = docs.get(culture);
  if (!p) {
    p = fetch(String(new URL(`../../data/skystories/${culture}.json`, import.meta.url)))
      .then((r) => { if (!r.ok) throw new Error(`skystories/${culture}.json: HTTP ${r.status}`); return r.json(); });
    p.catch(() => docs.delete(culture));
    docs.set(culture, p);
  }
  return p;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text) n.textContent = text;
  return n;
}

function onKey(e) {
  if (e.key === 'Escape' && card) { e.stopPropagation(); closeSkyStory(); }
}

export function closeSkyStory() {
  if (!card) return;
  card.remove();
  card = null;
  document.removeEventListener('keydown', onKey, true);
  const back = returnFocus;
  returnFocus = null;
  if (back && back.isConnected && typeof back.focus === 'function') back.focus();
}

export async function openSkyStory(lore) {
  if (!lore || typeof document === 'undefined') return;
  const W = COPY.skyLore;
  // A second story replaces the first, and the focus still goes back to what had it before either.
  const back = card ? returnFocus : document.activeElement;
  if (card) { card.remove(); card = null; document.removeEventListener('keydown', onKey, true); }
  returnFocus = back;
  await loadCss();
  const box = el('section', 'sr-skystory sr-float');
  box.id = 'sr-skystory';
  box.setAttribute('role', 'region');
  box.setAttribute('aria-labelledby', 'sr-skystory-title');
  const head = el('div', 'sr-skystory__head');
  const title = el('h2', 'sr-skystory__title', lore.name || lore.key);
  title.id = 'sr-skystory-title';
  const close = el('button', 'sr-skystory__close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', W.close);
  close.title = W.close;
  close.addEventListener('click', closeSkyStory);
  head.append(title, close);
  const sub = el('p', 'sr-skystory__sub', t(W.sub, { culture: lore.cultureName || lore.culture }));
  const text = el('p', 'sr-skystory__text', W.loading);
  box.append(head, sub, text);
  document.body.appendChild(box); // above the panels: the scene labels' layer is under them
  card = box;
  document.addEventListener('keydown', onKey, true);
  close.focus();
  let doc;
  try {
    doc = await docFor(lore.culture);
  } catch (e) {
    if (card === box) text.textContent = W.failed;
    console.warn('sky story: the stories did not load', e);
    return;
  }
  if (card !== box) return;
  const story = storyFor(doc, lore.key);
  text.textContent = story && story.text ? story.text : W.none;
  if (story && story.more) box.append(el('p', 'sr-skystory__text', story.more));
  for (const line of sourceLines(doc, story, W).filter((l) => l !== text.textContent)) box.append(el('p', 'sr-skystory__note', line));
  // In English in every language: said in the visitor's own when that is not English.
  const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
  if (story && story.text && !lang.startsWith('en') && doc.lang === 'en') box.append(el('p', 'sr-skystory__note', W.inEnglish));
}
