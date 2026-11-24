// ui/languagepop.js -- the language menu: the eleven languages by their own names (internal #310, review of 16 Nov 2026).
//
// Contract: mountLanguage(ctx, button, more) -> { open(from), close(returnFocus), toggle(from) }   (ui/rail.js)
// Also exported, pure, for tests/test_language_menu.mjs:
//   LANGUAGE_NAMES                       each language's name in that language (the language file's own META.name)
//   shellsOf(document)                   the languages this page says have a folder of their own (/es/, /fr/ ...)
//   languageHref(code, loc, opts)        the address of the same view in another language
//   viewHash(hash, cam)                  the view's fragment, with where the camera stands
//
// Fetched by ui/rail.js on the first press of its language button (or the phone's More row): none of it is a first
// visit's bytes. The popover is the What to show popover's twin (.sr-pop) with the shared set's parts (.ui-pop__head,
// .ui-close, .ui-row): a list of links, one per language, the one in use marked `aria-current`.
//
// WHY LINKS, AND A RELOAD. The words of a language are put over the English ones before the app's modules run
// (copy/index.js), and hundreds of modules have read them by the time anyone opens this menu: a language cannot be
// swapped under a running page. So a language is an address, as it always was (`/es/`, `?lang=es`), and this menu is
// the way to it: each row is a real link to THE SAME VIEW in that language (the selection, the clock, the stage and
// where the camera stands ride in the fragment, which the new page reads as any shared link), and the page loads
// again there. The choice is also kept (copy/lang.js LANG_KEY, this browser only), so the next visit to the bare
// address speaks it without asking; picking English is kept too, or a browser set to German would switch back.
//
// WHICH ADDRESS. A language that has a folder of its own on this site (the page's <link rel="alternate" hreflang>
// rows say which: scripts/seo_i18n.py builds /es/, /fr/ ... where every string is translated) is linked by its
// folder, the address search engines know. Any other, and a local copy with no folders, by `?lang=<code>` on the
// app's own page. English is the bare page; `?lang=en` is added only where the browser's own list would otherwise
// pick another language, so the address alone still says English. Other query keys (`?sw=0`, `?tier=`) are kept.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { LANG, LANGUAGES, LANG_KEY, pathLanguage, pickLanguage } from '../copy/lang.js';
import { camValue } from './urlstate.js';
import { sr } from './platform-bridge.js';
import { icon } from './icons.js';

/** Each language by its own name: what its file says of itself (copy/<code>.js META.name; the test holds them equal). */
export const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português (Brasil)',
  ru: 'Русский',
  uk: 'Українська',
  zh: '简体中文',
  hi: 'हिन्दी',
  he: 'עברית',
  ar: 'العربية',
};

/** The languages the page's own alternates give a folder: `<link rel="alternate" hreflang href=".../es/">`. */
export function shellsOf(doc = typeof document !== 'undefined' ? document : null) {
  const out = new Set();
  if (!doc || typeof doc.querySelectorAll !== 'function') return out;
  for (const link of doc.querySelectorAll('link[rel="alternate"][hreflang]')) {
    const m = /\/([a-z]{2})\/(?:index\.html)?(?:[?#].*)?$/.exec(String(link.getAttribute('href') || ''));
    if (m && m[1] !== 'en' && Object.prototype.hasOwnProperty.call(LANGUAGES, m[1])) out.add(m[1]);
  }
  return out;
}

/** The view's fragment with the camera's pose added (ui/urlstate.js `cam`), unless a trip frames itself or it has one. Pure. */
export function viewHash(hash, cam) {
  const h = String(hash || '');
  if (!cam || /[#&](trip|cam|moment|imagine)=/.test(h)) return h;
  return `${h}${h.length > 1 ? '&' : '#'}cam=${cam}`;
}

/**
 * The address of the same view in `code`. Pure.
 * @param {string} code  a key of LANGUAGES
 * @param {{pathname: string, search?: string, hash?: string}} loc
 * @param {{shells?: Set<string>, preferred?: string[], hash?: string}} [opts]
 */
export function languageHref(code, loc, opts = {}) {
  const path = String((loc && loc.pathname) || '/');
  // The app's own page: this path without the language's folder (`/es/` or `/es/index.html` is under `/`).
  const here = pathLanguage(path);
  const root = here ? path.replace(/[a-z]{2}\/(?:index\.html)?$/, '') : path;
  const keep = String((loc && loc.search) || '').replace(/^\?/, '').split('&').filter((part) => part && part.split('=')[0] !== 'lang');
  const hash = opts.hash !== undefined ? String(opts.hash || '') : String((loc && loc.hash) || '');
  const query = (extra) => { const all = extra ? [...keep, extra] : keep; return all.length ? `?${all.join('&')}` : ''; };
  const folder = root.endsWith('/') ? root : root.replace(/[^/]*$/, '');
  if (code !== 'en' && opts.shells && opts.shells.has(code)) return `${folder}${code}/${query('')}${hash}`;
  if (code !== 'en') return `${root}${query(`lang=${code}`)}${hash}`;
  // English: the bare page, unless this browser's own list would then pick another language.
  const bare = query('');
  const needs = pickLanguage(bare, opts.preferred || [], LANGUAGES, root) !== 'en';
  return `${root}${needs ? query('lang=en') : bare}${hash}`;
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/** The popover of the rail's language button: built on the first press, then opened and closed in place. */
export function mountLanguage(ctx, button, more) {
  const W = COPY.language;
  const pop = el('div', 'sr-pop sr-langpop sr-float ui-pop');
  pop.id = 'sr-lang';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-labelledby', 'sr-lang-h');
  pop.hidden = true;

  const head = el('div', 'ui-pop__head');
  const h = el('h2', 'ui-pop__title', W.title);
  h.id = 'sr-lang-h';
  const x = el('button', 'ui-close');
  x.type = 'button';
  x.setAttribute('aria-label', W.close);
  x.title = W.close;
  x.appendChild(icon('x'));
  head.append(h, x);

  const body = el('div', 'ui-pop__body');
  const list = el('nav', 'sr-langpop__list');
  list.setAttribute('aria-label', W.listLabel);
  const rows = [];
  for (const code of Object.keys(LANGUAGES)) {
    if (!LANGUAGE_NAMES[code]) continue;
    const a = el('a', 'ui-row ui-row--plain');
    const name = el('span', 'ui-row__t', LANGUAGE_NAMES[code]);
    // The name is in its own language and its own direction, whatever the page speaks.
    name.lang = LANGUAGES[code].tag || code;
    name.dir = code === 'he' || code === 'ar' ? 'rtl' : 'ltr';
    a.appendChild(name);
    a.hreflang = LANGUAGES[code].tag || code;
    a.dataset.lang = code;
    if (code === LANG) a.setAttribute('aria-current', 'true');
    // The choice is kept when the link is followed (a press, Enter, a middle click's new tab alike).
    a.addEventListener('click', () => { sr('track', 'language_change', { lang: code }); try { localStorage.setItem(LANG_KEY, code); } catch { /* no storage: the address carries it */ } });
    list.appendChild(a);
    rows.push(a);
  }
  body.append(list, el('p', 'ui-pop__note', W.note));
  pop.append(head, body);
  document.body.appendChild(pop);

  // The links name the view as it is when the menu opens (and again when one takes the pointer or the focus).
  const paint = () => {
    let cam = '';
    try { cam = ctx && typeof ctx.camPose === 'function' ? camValue(ctx.camPose()) : ''; } catch { cam = ''; }
    const opts = { shells: shellsOf(), preferred: typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [], hash: viewHash(location.hash, cam) };
    for (const a of rows) a.href = languageHref(a.dataset.lang, location, opts);
  };
  list.addEventListener('pointerdown', paint);
  list.addEventListener('focusin', paint);

  let from = button;
  const close = (returnFocus) => {
    if (pop.hidden) return;
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus && from) from.focus({ preventScroll: true });
  };
  const open = (opener) => {
    if (!pop.hidden) return;
    const rail = ctx && ctx.rail;
    if (rail) { rail.closeShow(); rail.closeMore(); }
    if (ctx && ctx.share) ctx.share.close();
    from = opener || button;
    paint();
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    (rows.find((a) => a.dataset.lang === LANG) || rows[0]).focus({ preventScroll: true });
  };
  x.addEventListener('click', () => close(true));
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !button.contains(e.target) && !(more && more.contains(e.target))) close(false);
  });
  // Capture phase, as the rail's own popovers: Escape closes this before the card underneath hears it.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); e.stopPropagation(); close(true); }
  }, true);
  return { open, close, toggle: (opener) => (pop.hidden ? open(opener) : close(false)) };
}
