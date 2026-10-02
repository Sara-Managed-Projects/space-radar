// ui/sharesheet.js -- the one share sheet: the postcard, the link and the text (spec 0061 task 8).
//
// Never at boot. ui/share.js imports this on the first Share, from the rail (P), the card or the
// trip bar, and every caller reaches it through ctx.share.open({ record, trip, opener }) (that
// file's header is the contract).
//
// Contract: createShareSheet(ctx) -> { open(opts), close(), isOpen(), state() }
// Also exported, pure, for tests/test_sharesheet.mjs:
//   shareText(parts, network)        the post, within the network's length, the link last
//   xLength(text)                    a post's length as X counts it
//   excerptOf(extract, max)          the "About it": whole sentences, at most `max` characters
//   wikiTitleOf(record)              the record's English Wikipedia article, or null
//   objectPageUrl(record, pages, base)  the object's own page, else the app at `#at=<id>`
//   networkUrl(network, parts), mailtoUrl(subject, body), NETWORKS, LIMITS
//
// WHY. Ivan, 2026-10-01: "share the jpeg image postcard in social medias (with the link to object
// if selected) and text (wiki information of object) - so full post, postcard, link and full text
// nicely formatted, also option to send by email". So the sheet shows the three things a post is
// made of and lets each go wherever the visitor wants:
//
//   THE PICTURE is the print postcard (ui/printcompose.js makePostcard): the scene drawn again at
//   6 x 4 in and 300 dpi, captioned, with the selection's brackets and tag when there is one. It
//   is made once, when the sheet opens, and the same bytes are the preview, the JPEG, the PDF and
//   the file handed to the device's share; a second render could show a different instant.
//
//   THE LINK is the object's own page (`/o/<slug>.html`, scripts/build_seo.py) when it has one and
//   the view is live, because a link preview on X, WhatsApp or Telegram runs no JavaScript and
//   reads that page's own title and picture. A moment that is not now, a trip and everything
//   without a page get the app's link for the view (ui/share.js shareUrl), which reopens it.
//
//   THE TEXT is the card's words, never new ones: the name and the first sentence (ui/cards.js
//   cardWords), then a short "About it" from the record's Wikipedia summary with the licence's
//   attribution, then the link, last, where every network expects it. X counts a link as 23 and
//   allows 280, so a post for X drops the excerpt before it cuts the sentence.
//
// THE NETWORK IS TOUCHED ONLY ON OPEN. The Wikipedia summary (`credentials: 'omit'`, no header
// that would need a preflight) and the object-page index are fetched when the sheet opens, each
// once per record or once per visit, and each gives up after a few seconds without a word: the
// sheet is whole without them. The networks' own pages are plain links; nothing of theirs loads
// until one is clicked, and no SDK, pixel or tracking parameter is ever added.
//
// ON A PHONE it is the phone's one sheet (ui/sheet.js), with two heights and a dismiss: it opens at
// half, so the picture and the first actions are up and the selection is still on screen above
// them (scene/viewshift.js counts it), a drag or the handle takes it to full, and a drag down
// from half closes it, as × and Escape do (spec 0061 task 3).
//
// EMAIL is a mailto: link with the subject and the text. A mailto: cannot carry a file, and the
// sheet says so in one line: the picture goes by Share (where the device can attach it) or by
// downloading it first.

import { COPY, t } from '../copy/en.js';
import { cardWords } from './cards.js';
import { shareUrl, shareState, tripWords, appBase, toast } from './share.js';
import { makePostcard, pdfFromJpeg, saveBlob } from './printcompose.js';
import { createSheet } from './sheet.js';
import { WIKI_TITLES } from '../data/wikititles.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIKI_REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKI_TIMEOUT_MS = 8000;
const PAGES_TIMEOUT_MS = 3000;
/** Written by scripts/build_seo.py at deploy time beside sitemap.xml: {record id: page slug}. */
export const PAGES_INDEX = 'object-pages.json';
export const EXCERPT_MAX = 280;

// ------------------------------------------------------------------------------- the words

/** The networks the sheet links to, in the order they are shown. */
export const NETWORKS = ['x', 'facebook', 'linkedin', 'whatsapp', 'telegram', 'reddit'];

/**
 * How long a post may be, per place it goes. X: 280, a link counted as 23 whatever its length
 * (its t.co wrapping), and characters outside Latin and general punctuation counted twice
 * (xLength). Reddit: a title of 300. The rest are long; email and the clipboard are held to a size
 * a mailto: URL survives in every mail client (about 2 000 characters once encoded).
 */
export const LIMITS = {
  x: { max: 280, link: 23, weigh: 'x' },
  reddit: { max: 300 },
  telegram: { max: 4096 },
  whatsapp: { max: 4096 },
  email: { max: 1500 },
  copy: { max: 4096 },
  share: { max: 4096 },
};

/**
 * A post's length as X counts it (twitter-text v3): code points in Latin, general punctuation and
 * a few spaces weigh 1, everything else 2. The card's numbers use U+202F between thousands, which
 * X counts as 2.
 */
export function xLength(text) {
  let n = 0;
  for (const ch of String(text || '')) {
    const c = ch.codePointAt(0);
    const light = c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247);
    n += light ? 1 : 2;
  }
  return n;
}

const ELL = '…';

/** `text` cut at a word to fit `room` by `len`, with an ellipsis; '' when not even a word fits. */
function clip(text, room, len) {
  const s = String(text || '');
  if (len(s) <= room) return s;
  const words = s.split(' ');
  while (words.length > 1) {
    words.pop();
    const out = words.join(' ').replace(/[\s,;:.–—-]+$/, '') + ELL;
    if (len(out) <= room) return out;
  }
  return '';
}

/** Does `line` open with `name` (or "The <name>")? */
function namedIn(name, line) {
  const n = String(name || '').toLowerCase().replace(/^the /, '');
  const l = String(line || '').toLowerCase().replace(/^the /, '');
  return !!n && l.startsWith(n);
}

/**
 * The post for `network`, as plain text with blank lines between blocks:
 *
 *   <name>                       (left out when the sentence opens with it)
 *   <the card's sentence>
 *
 *   <the excerpt>
 *   <attribution>
 *
 *   <link>
 *
 * The link is always last and never cut. When the post is too long the excerpt goes first (whole,
 * with its attribution: a quote without its licence line is not allowed to stand), then the
 * sentence is cut at a word, then the name. `parts` = {name, line, excerpt, attribution, link}.
 */
export function shareText(parts, network = 'copy') {
  const lim = LIMITS[network] || LIMITS.copy;
  const len = lim.weigh === 'x' ? xLength : (s) => String(s).length;
  const p = parts || {};
  const link = String(p.link || '');
  const tail = link ? `\n\n${link}` : '';
  const tailLen = link ? 2 + (lim.link || len(link)) : 0;
  const room = lim.max - tailLen;
  const quote = p.excerpt && p.attribution ? `${p.excerpt}\n${p.attribution}` : '';
  const head = (name, line) => [name, line].filter(Boolean).join('\n');
  let line = String(p.line || '');
  // The card's sentence usually opens with the name ("Mars is the fourth planet…"): then it is the
  // heading too, and the name is not said twice.
  let name = namedIn(p.name, line) ? '' : String(p.name || '');
  let body = [head(name, line), quote].filter(Boolean).join('\n\n');
  if (len(body) > room) body = head(name, line);
  if (len(body) > room) {
    line = clip(line, room - len(name) - 1, len);
    body = head(name, line);
  }
  if (len(body) > room) {
    name = clip(name, room, len);
    body = name;
  }
  return body + tail;
}

/** A sentence end: a stop, then a space and a capital, not after an initial or "St", "c", "e.g". */
const ABBREV = /(?:^|\s)(?:[A-Z]|[A-Z]\.[A-Z]|St|Mt|Dr|No|Jr|Sr|ca|c|vs|approx|e\.g|i\.e|etc)$/;

/**
 * The "About it": the summary's opening, whole sentences, at most `max` characters. Only when the
 * first sentence alone is longer is it cut at a word with an ellipsis. Pure.
 */
export function excerptOf(extract, max = EXCERPT_MAX) {
  const s = String(extract || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= max && /[.!?]["”)]?$/.test(s)) return s;
  let best = -1;
  const re = /[.!?]["”)]?(?=\s+["“(]?[A-Z0-9])/g;
  let m;
  while ((m = re.exec(s)) && m.index < max) {
    if (s[m.index] === '.' && ABBREV.test(s.slice(0, m.index))) continue;
    best = m.index + m[0].length;
  }
  if (best > 0) return s.slice(0, best);
  return clip(s, max, (x) => x.length);
}

/** The article named in a source line, `https://en.wikipedia.org/wiki/<title>`, or null. */
function titleFromUrl(text) {
  const m = /https?:\/\/en\.wikipedia\.org\/wiki\/([^\s,;]+)/.exec(String(text || ''));
  if (!m) return null;
  let title = m[1];
  // "(read 2026-09-22)" follows the URL; a title's own brackets are balanced, a trailing one is not.
  while (title.endsWith(')') && (title.match(/\(/g) || []).length < (title.match(/\)/g) || []).length) title = title.slice(0, -1);
  try { title = decodeURIComponent(title); } catch { /* already plain */ }
  title = title.replace(/ /g, '_').replace(/#.*$/, '');
  // A list is a source for a number, not an article about the thing ("List_of_Messier_objects").
  return title && !/^List_of_/i.test(title) ? title : null;
}

/**
 * The record's English Wikipedia article: the hand table (data/wikititles.js) first, then the
 * record's own source lines, the ones scripts/object_pages.mjs reads for its sameAs. Null when it
 * names none: the sheet then has no excerpt, rather than a guess from the name.
 */
export function wikiTitleOf(record) {
  if (!record) return null;
  const id = String(record.id || '');
  if (Object.prototype.hasOwnProperty.call(WIKI_TITLES, id)) return WIKI_TITLES[id];
  const md = record.meta || {};
  for (const key of ['wikipedia', 'wiki', 'whySource', 'source', 'cite']) {
    const title = titleFromUrl(md[key]);
    if (title) return title;
  }
  return null;
}

/**
 * The object's own page when the deploy built one (`pages` is object-pages.json, {id: slug}), else
 * the app opened on it. Pure. The slug is scripts/object_pages.mjs's, read from what it built, so
 * a link here can never name a page that does not exist.
 */
export function objectPageUrl(record, pages, base = 'https://www.spaceradar.ai/') {
  const root = String(base).endsWith('/') ? String(base) : `${base}/`;
  const id = record && record.id != null ? String(record.id) : '';
  if (!id) return root;
  const slug = pages && Object.prototype.hasOwnProperty.call(pages, id) ? pages[id] : null;
  if (slug && /^[a-z0-9][a-z0-9-]*$/.test(slug)) return `${root}o/${slug}.html`;
  return `${root}#at=${encodeURIComponent(id)}`;
}

/** A network's public share page for this post. No SDK, no tracking parameter. */
export function networkUrl(network, parts) {
  const e = encodeURIComponent;
  const link = String((parts && parts.link) || '');
  switch (network) {
    case 'x': return `https://x.com/intent/post?text=${e(shareText(parts, 'x'))}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${e(link)}`;
    case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${e(link)}`;
    case 'whatsapp': return `https://wa.me/?text=${e(shareText(parts, 'whatsapp'))}`;
    // Telegram sets the link above the text itself.
    case 'telegram': return `https://t.me/share/url?url=${e(link)}&text=${e(shareText({ ...parts, link: '' }, 'telegram'))}`;
    case 'reddit': {
      // A title is one line: the card's sentence when it names the thing, else "name: sentence".
      const p = parts || {};
      const line = String(p.line || '');
      const one = line && p.name && !line.includes(p.name) ? `${p.name}${COPY.punctuation.colon}${line}` : line || p.name || '';
      return `https://www.reddit.com/submit?url=${e(link)}&title=${e(shareText({ name: one }, 'reddit'))}`;
    }
    default: return link;
  }
}

/** `mailto:` with a subject and a body; line breaks as CRLF, as RFC 6068 asks. */
export function mailtoUrl(subject, body) {
  const e = (s) => encodeURIComponent(String(s || '').replace(/\r?\n/g, '\r\n'));
  return `mailto:?subject=${e(subject)}&body=${e(body)}`;
}

// ------------------------------------------------------------------------------ the network

const wikiCache = new Map(); // title -> Promise<{extract, url} | null>
let pagesIndex = null; // Promise<{id: slug} | null>, once a visit

function fetchJson(url, ms, opts = {}) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = setTimeout(() => ctl && ctl.abort(), ms);
  return fetch(url, { ...opts, signal: ctl ? ctl.signal : undefined })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .finally(() => clearTimeout(timer));
}

/** The summary's opening and its page, or null (no article, not a plain article, slow, offline). */
export function wikiSummary(title) {
  if (!title) return Promise.resolve(null);
  if (!wikiCache.has(title)) {
    const url = WIKI_REST + encodeURIComponent(title);
    const got = fetchJson(url, WIKI_TIMEOUT_MS, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then((d) => {
      if (!d || d.type !== 'standard' || !d.extract) return null;
      const page = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      return { extract: excerptOf(d.extract), url: page };
    });
    // A failure is not cached: the next open may be online.
    got.then((v) => { if (!v) wikiCache.delete(title); });
    wikiCache.set(title, got);
  }
  return wikiCache.get(title);
}

function objectPages(base) {
  if (!pagesIndex) {
    pagesIndex = fetchJson(`${base}${PAGES_INDEX}`, PAGES_TIMEOUT_MS, { credentials: 'same-origin' })
      .then((d) => (d && typeof d === 'object' && !Array.isArray(d) ? d : null));
  }
  return pagesIndex;
}

// ------------------------------------------------------------------------------- the DOM

// Lucide (ISC; Feather-derived icons MIT), docs/ui-guide.md §3.16: 24 box, stroke 1.75, round.
const ICONS = {
  x: ['M18 6 6 18', 'm6 6 12 12'],
  share: ['M12 2v13', 'm16 6-4-4-4 4', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'],
  copy: ['M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2', 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z'],
  download: ['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  mail: ['m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7', 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
};

function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of [['viewBox', '0 0 24 24'], ['width', '20'], ['height', '20'], ['fill', 'none'], ['stroke', 'currentColor'],
    ['stroke-width', '1.75'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(k, v);
  for (const d of ICONS[name] || []) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}

function button(className, label, title, iconName) {
  const b = el('button', className);
  b.type = 'button';
  if (iconName) b.appendChild(icon(iconName));
  if (label) b.appendChild(el('span', 'sr-share__label', label));
  if (title) b.title = title;
  return b;
}

let cssReady = null;
/** css/share.css, linked on the first open and waited for, so the sheet never shows unstyled. */
function loadCss() {
  if (cssReady) return cssReady;
  cssReady = new Promise((resolve) => {
    const href = new URL('../../css/share.css', import.meta.url).href;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    const done = () => resolve();
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    setTimeout(done, 2000);
    document.head.appendChild(link);
  });
  return cssReady;
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// --------------------------------------------------------------------------------- the sheet

export function createShareSheet(ctx) {
  const S = COPY.share;
  const root = el('div', 'sr-share sr-float sr-over-clean');
  root.id = 'sr-share';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'sr-share-title');
  root.hidden = true;

  const head = el('div', 'sr-share__head');
  const title = el('h2', 'sr-share__title', S.title);
  title.id = 'sr-share-title';
  title.tabIndex = -1;
  const closeBtn = button('sr-share__close', '', S.close, 'x');
  closeBtn.setAttribute('aria-label', S.close);
  head.append(title, closeBtn);

  const body = el('div', 'sr-share__body');

  // The picture: a skeleton tint of the postcard's own shape until it is drawn (docs/ui-guide.md
  // §2.5: a loading state is a still tint, not a spinner).
  const pic = el('figure', 'sr-share__pic');
  const img = el('img', 'sr-share__img');
  img.alt = S.pictureAlt;
  img.hidden = true;
  const picNote = el('figcaption', 'sr-share__picnote', S.drawing);
  pic.append(img, picNote);

  const tagRow = el('label', 'sr-share__tag');
  const tagBox = el('input');
  tagBox.type = 'checkbox';
  tagBox.checked = true;
  tagRow.append(tagBox, el('span', null, S.withTag));

  const linkLabel = el('p', 'sr-micro sr-share__micro', S.linkLabel);
  const linkRow = el('div', 'sr-share__linkrow');
  const linkA = el('a', 'sr-share__link');
  linkA.target = '_blank';
  linkA.rel = 'noopener';
  const copyLinkBtn = button('sr-share__iconbtn', '', S.copyLink, 'copy');
  copyLinkBtn.setAttribute('aria-label', S.copyLink);
  linkRow.append(linkA, copyLinkBtn);

  const textLabel = el('p', 'sr-micro sr-share__micro', S.textLabel);
  const textBox = el('div', 'sr-share__text');
  textBox.tabIndex = 0;
  textBox.setAttribute('role', 'textbox');
  textBox.setAttribute('aria-readonly', 'true');
  textBox.setAttribute('aria-multiline', 'true');
  textBox.setAttribute('aria-label', S.textLabel);
  const wikiLine = el('p', 'sr-share__wiki');
  wikiLine.hidden = true;

  const acts = el('div', 'sr-share__acts');
  const nativeBtn = button('sr-share__btn', S.native, S.nativeTitle, 'share');
  const copyBtn = button('sr-share__btn', S.copy, S.copyTitle, 'copy');
  const jpegBtn = button('sr-share__btn', S.jpeg, S.jpegTitle, 'download');
  const pdfBtn = button('sr-share__btn', S.pdf, S.pdfTitle, 'file');
  const mailA = el('a', 'sr-share__btn');
  mailA.appendChild(icon('mail'));
  mailA.appendChild(el('span', 'sr-share__label', S.email));
  mailA.title = S.emailTitle;
  acts.append(nativeBtn, copyBtn, mailA, jpegBtn, pdfBtn);
  const mailNote = el('p', 'sr-share__note', S.emailNote);

  const netLabel = el('p', 'sr-micro sr-share__micro', S.networksLabel);
  const nets = el('div', 'sr-share__nets');
  const netLinks = {};
  for (const n of NETWORKS) {
    const a = el('a', 'sr-share__net', S.networks[n]);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.referrerPolicy = 'no-referrer';
    a.title = t(S.networkTitle, { network: S.networks[n] });
    a.dataset.network = n;
    netLinks[n] = a;
    nets.appendChild(a);
  }

  // The picture and what to do with it first, so the actions are above the fold on a laptop; then
  // the link and the post itself, which is what Copy, Email and the networks carry.
  body.append(pic, tagRow, acts, mailNote, netLabel, nets, linkLabel, linkRow, textLabel, textBox, wikiLine);
  root.append(head, body);
  document.body.appendChild(root);

  // ------------------------------------------------------------------------------- state
  let cur = null; // {record, parts, subject, made, wiki, opener}
  let token = 0;

  const fail = (line) => toast(line, 4000);

  function render() {
    if (!cur) return;
    const p = cur.parts;
    linkA.href = p.link;
    linkA.textContent = p.link.replace(/^https?:\/\//, '');
    textBox.textContent = shareText(p, 'copy');
    mailA.href = mailtoUrl(cur.subject, shareText(p, 'email'));
    for (const n of NETWORKS) netLinks[n].href = networkUrl(n, p);
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    nativeBtn.hidden = typeof nav.share !== 'function';
    if (ctx) ctx.lastShare = { link: p.link, text: textBox.textContent, excerpt: !!p.excerpt, picture: cur.made ? cur.made.out : null, wiki: cur.wiki || null };
  }

  /** What to say: the trip's, the record's, or the view's. */
  function wordsFor(opts) {
    const st = shareState(ctx, null);
    const live = !st.t || st.t === 'now';
    if (opts.trip) {
      const id = typeof opts.trip === 'string' ? opts.trip : opts.trip && (opts.trip.id || opts.trip.tourId);
      const running = ctx && ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle' ? ctx.trip.state.tourId : null;
      // The trip that is running is shared where it is (its stop); another one by its own page.
      if (id && id !== running) {
        const tours = ctx && ctx.trip && typeof ctx.trip.tours === 'function' ? ctx.trip.tours() : [];
        const tour = tours.find((x) => x.id === id);
        return { name: tour ? tour.title : COPY.app.name, line: tour ? tour.blurb : '', link: shareUrl({ trip: id }), record: null };
      }
      const w = tripWords(ctx);
      if (w) return { name: w.title, line: w.text, link: shareUrl(st), record: null };
    }
    const record = opts.record !== undefined ? opts.record : ctx && typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (!record) return { name: COPY.app.name, line: COPY.app.tagline, link: shareUrl(st), record: null };
    let w = null;
    try { w = cardWords(record, ctx); } catch { w = null; }
    const link = shareUrl(shareState(ctx, record.id));
    return { name: (w && w.name) || String(record.name || record.id), line: (w && w.sentence) || '', link, record, live };
  }

  async function drawPicture(my) {
    img.hidden = true;
    picNote.hidden = false;
    picNote.textContent = S.drawing;
    try {
      // A frame for the sheet to land in before the 1800 x 1200 render takes the main thread.
      await new Promise((r) => setTimeout(r, 30));
      if (my !== token) return;
      const made = await makePostcard(ctx, 'jpeg', { record: cur.record, withTag: !!cur.record && tagBox.checked, save: false });
      if (my !== token) return;
      if (cur.made && cur.made.url) URL.revokeObjectURL(cur.made.url);
      made.url = URL.createObjectURL(made.jpeg);
      cur.made = made;
      img.src = made.url;
      img.hidden = false;
      picNote.hidden = true;
      render();
    } catch (e) {
      if (my !== token) return;
      cur.made = null;
      picNote.textContent = S.noPicture;
      if (ctx) ctx.lastPrint = { error: String((e && e.message) || e) };
    }
    jpegBtn.disabled = pdfBtn.disabled = !cur.made;
  }

  async function lookUp(my, record, base, live) {
    const titleW = wikiTitleOf(record);
    const pages = live ? objectPages(base) : Promise.resolve(null);
    if (titleW) {
      wikiLine.hidden = false;
      wikiLine.textContent = S.lookingUp;
    }
    const [summary, index] = await Promise.all([titleW ? wikiSummary(titleW) : null, pages]);
    if (my !== token || !cur) return;
    wikiLine.hidden = true;
    if (summary && summary.extract) {
      cur.parts.excerpt = summary.extract;
      cur.parts.attribution = S.attribution;
      cur.wiki = summary.url;
      wikiLine.hidden = false;
      wikiLine.textContent = '';
      const a = el('a', null, S.wikiSource);
      a.href = summary.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      wikiLine.append(a);
    }
    const page = index ? objectPageUrl(record, index, base) : '';
    if (page.startsWith(`${base}o/`)) cur.parts.link = page;
    render();
  }

  async function open(opts = {}) {
    // The control that opened it, pressed again, closes it (the rail's Share, the card's).
    if (!root.hidden && cur && opts.opener && cur.opener === opts.opener) { close(); return; }
    await loadCss();
    token += 1;
    const my = token;
    const w = wordsFor(opts);
    if (cur && cur.made && cur.made.url) URL.revokeObjectURL(cur.made.url);
    if (cur && cur.opener && cur.opener !== opts.opener && cur.opener.hasAttribute('aria-haspopup')) cur.opener.setAttribute('aria-expanded', 'false');
    // Last time's picture is not this one's: the skeleton until the new one is drawn.
    img.hidden = true;
    picNote.hidden = false;
    picNote.textContent = S.drawing;
    cur = {
      record: w.record,
      parts: { name: w.name, line: w.line, excerpt: '', attribution: '', link: w.link },
      subject: w.record ? t(S.subject, { name: w.name }) : w.name,
      made: null,
      wiki: null,
      opener: opts.opener && opts.opener.focus ? opts.opener : null,
    };
    if (cur.opener && cur.opener.hasAttribute('aria-haspopup')) cur.opener.setAttribute('aria-expanded', 'true');
    tagRow.hidden = !w.record;
    // The skeleton in the postcard's own orientation (printcompose.js printSize: the screen's).
    const view = ctx && ctx.renderer && ctx.renderer.domElement;
    const aspect = view && view.clientHeight > 0 ? view.clientWidth / view.clientHeight : window.innerWidth / window.innerHeight;
    pic.classList.toggle('is-portrait', aspect < 1);
    wikiLine.hidden = true;
    jpegBtn.disabled = pdfBtn.disabled = true;
    render();
    root.hidden = false;
    seatSheet();
    // The rail's What to show is the other popover in that corner: one at a time.
    if (ctx && ctx.rail && typeof ctx.rail.closeShow === 'function') ctx.rail.closeShow();
    title.focus({ preventScroll: true });
    // The look-ups first: the picture takes the main thread for a moment (a second and more on a
    // slow phone), and a reply that lands then would be read after its own timeout had fired.
    const looked = w.record ? lookUp(my, w.record, appBase(), w.live) : null;
    if (looked) await Promise.race([looked, new Promise((r) => setTimeout(r, 1500))]);
    if (my === token) drawPicture(my);
  }

  // The phone's sheet behaviour, made the first time the sheet opens on a phone and dropped on a
  // desktop, where the sheet is the rail's popover.
  let sheet = null;
  const isPhone = () => document.documentElement.classList.contains('sr-phone');
  function seatSheet() {
    if (isPhone() && !sheet) {
      sheet = createSheet(root, {
        detents: ['half', 'full'],
        initial: 'half',
        grab: '.sr-share__head',
        scrollers: '.sr-share__body',
        dismiss: () => close(),
      });
    } else if (!isPhone() && sheet) {
      sheet.destroy();
      sheet = null;
    }
    if (sheet) {
      // It opens AT half, not on its way there: with no transition for the opening frames, a slide
      // from wherever the transform last was never runs (measured in headless Chrome: the sheet sat
      // at full for seconds while the postcard drawing held the frames that would have moved it).
      root.classList.add('is-dragging');
      sheet.set('half');
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-dragging')));
    }
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    token += 1;
    const back = cur && cur.opener;
    if (back && back.hasAttribute('aria-haspopup')) back.setAttribute('aria-expanded', 'false');
    if (back && back.isConnected) back.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------------------------ actions
  closeBtn.addEventListener('click', close);
  tagBox.addEventListener('change', () => { if (cur) drawPicture(token); });

  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
      return true;
    } catch {
      // Refused (an unfocused page, no permission): select it, so a copy by hand is one key away.
      try {
        const range = document.createRange();
        range.selectNodeContents(textBox);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch { /* nothing to select with */ }
      fail(S.copyRefused);
      return false;
    }
  }
  copyBtn.addEventListener('click', () => cur && copy(shareText(cur.parts, 'copy'), S.copied));
  copyLinkBtn.addEventListener('click', () => cur && copy(cur.parts.link, S.linkCopied));

  nativeBtn.addEventListener('click', async () => {
    if (!cur) return;
    const nav = navigator;
    const p = cur.parts;
    let file = null;
    try {
      if (cur.made) file = new File([cur.made.jpeg], cur.made.name, { type: 'image/jpeg' });
    } catch { file = null; }
    // Level 2 where the device takes the picture; then the text carries the link, because most
    // targets drop `url` beside a file. Without a file: the text, and the link as the link.
    const withFile = file && typeof nav.canShare === 'function' && nav.canShare({ files: [file] });
    const data = withFile
      ? { files: [file], title: p.name, text: shareText(p, 'share') }
      : { title: p.name, text: shareText({ ...p, link: '' }, 'share'), url: p.link };
    try {
      await nav.share(data);
      if (ctx) ctx.lastShare = { ...ctx.lastShare, via: withFile ? 'share-file' : 'share' };
    } catch (e) {
      if (e && e.name === 'AbortError') return; // dismissed is an answer
      fail(S.nativeFailed);
    }
  });

  jpegBtn.addEventListener('click', () => {
    if (!cur || !cur.made) return;
    saveBlob(cur.made.jpeg, cur.made.name);
    toast(COPY.print.saved);
  });
  pdfBtn.addEventListener('click', async () => {
    if (!cur || !cur.made) return;
    const m = cur.made;
    const bytes = new Uint8Array(await m.jpeg.arrayBuffer());
    const pdf = new Blob([pdfFromJpeg(bytes, m.size.w, m.size.h, m.size.ptW, m.size.ptH)], { type: 'application/pdf' });
    saveBlob(pdf, m.name.replace(/\.jpg$/, '.pdf'));
    toast(COPY.print.saved);
  });

  // ------------------------------------------------------------------- keyboard and focus
  // Capture phase, as the rail's popover does: Escape closes the sheet before the card under it
  // hears the key and closes too. Tab stays inside while it is open (a modal's focus trap).
  document.addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...root.querySelectorAll(FOCUSABLE)].filter((n) => !n.hidden && n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const inside = root.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside || document.activeElement === title)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
      e.preventDefault();
      first.focus();
    }
  }, true);
  // A press outside closes it, except on the control that opened it (which toggles it itself).
  document.addEventListener('pointerdown', (e) => {
    if (root.hidden || root.contains(e.target)) return;
    if (cur && cur.opener && cur.opener.contains && cur.opener.contains(e.target)) return;
    close();
  });

  return {
    open,
    close,
    isOpen: () => !root.hidden,
    state: () => (cur ? { link: cur.parts.link, text: shareText(cur.parts, 'copy'), hasPicture: !!cur.made, excerpt: !!cur.parts.excerpt } : null),
    root,
  };
}
