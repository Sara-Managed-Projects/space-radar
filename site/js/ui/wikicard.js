// ui/wikicard.js -- a card's Wikipedia lead and photograph, and its Read aloud button (forge #151).
//
// Never at boot. ui/cards.js imports this when a card's "About it" is open (on its first press, or at once when the
// visitor left it open), and hands it an empty box at the top of that section.
//
// Contract: mountWikiCard(box, record, words) -> Promise<void>
//             `words` is {name, sentence, why}: what the card already says (ui/cards.js firstSentence, cardfacts.js whyLine).
//           articleFor(record, lang, deps?) -> Promise<{card, lang, baked, fallback, family} | null>   (exported for the test)
//           stopReading()   ends any reading in progress (a card that closes, a second card)
//           cardHash(text), clipFor(index, key, text)   (b200-c2-deep) which baked card has a Kokoro clip, pure
//
// OUR OWN WORDS WIN. A card with a hand-written line (`why` or `note`, cardfacts.js whyLine) or a registry photograph
// gets no Wikipedia block at all: those lines were written by looking and are sourced, and a quoted paragraph under them
// would say the same thing less carefully, or contradict it. Every other card asks for an article (ui/wikicardcore.js
// says where the title comes from: the baked cards first, then the hand table, the designation, the NORAD number, the
// fleet), and says it is QUOTED: "From Wikipedia", the licence, the day it was read, and that we did not check it.
//
// THE NETWORK, only here and only on open. The baked cards are our own files (site/data/wikicards/). Anything else is
// asked of Wikipedia's REST API and Commons' API with `credentials: 'omit'` and no referrer, so no cookie goes either
// way and Wikipedia is not told which page asked; the photograph is loaded the same way (crossorigin=anonymous,
// referrerpolicy=no-referrer). Each answer is kept for the visit in memory, and the browser's own HTTP cache keeps the
// rest. A failure, a slow answer (8 s) or no article leaves the box empty: the card is whole without it. The sources page
// (/sources/) says all of this to the visitor.
//
// THE VISITOR'S LANGUAGE (copy/lang.js LANG). The article in that language when Wikipedia has one (langlinks from the
// English title); else the English one, and the block says so in the page's language.
//
// READ ALOUD is the device's own voice (speechSynthesis): nothing is recorded, nothing is sent, and a browser without
// it shows no button. The trips' narration is Kokoro, pre-rendered (scripts/narrate.py); this is not, because Kokoro is
// not set up on the machine these cards were built on, and a card has no fixed text to render ahead. One sentence is
// spoken at a time and shown under the button as it is said (the captions), in a live region a screen reader does not
// repeat (aria-live off: the reader is already speaking). It stops when the card closes or another card is read.
// Nothing moves on screen while it reads, so prefers-reduced-motion has nothing to hold back.
//
// b200-c2-deep (forge #151): IN THE TRIPS' VOICE WHERE THERE IS A CLIP. The baked English cards' leads are rendered
// offline in the trips' Kokoro voice (scripts/narrate-cards.py, site/audio/cards/en/). On a press, and only then, the
// clips' index is fetched (2 kB); a card whose baked English lead has a clip of exactly that text (cardHash) plays it,
// Opus or its AAC twin (audio/pick.js), with the clip's own captions under the button and the voice's credit; any
// other card, or a clip that will not play, is read by the device as before. The clip is the quoted lead only, which
// begins with the thing's name; the other languages have no voice in the pipeline and keep the device's.

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import '../copy/en.cards.js';
import { LANG, LOCALE } from '../copy/lang.js';
import { whyLine, meta, pick } from './cardfacts.js';
import { wikiTitleOf } from '../data/wikititles.js';
import { loadCss } from './latercss.js';
// b200-c2-deep: begin
import '../copy/en.deep.js';
import { pickFormat } from '../audio/pick.js';
import { parseVtt, cueAt } from '../audio/narration.js';
// b200-c2-deep: end
import {
  wikiLang, restSummaryUrl, langLinksUrl, commonsInfoUrl, summaryOf, creditOf, cleanUrl, langLinkOf,
  dsoTitle, mentions, familyOf, noradOf, readingParts,
} from './wikicardcore.js';

const TIMEOUT_MS = 8000;
const DATA = new URL('../../data/wikicards/', import.meta.url).href;

// -------------------------------------------------------------------------------- the network

const memo = new Map(); // url -> Promise<json | null>

function getJson(url) {
  if (!memo.has(url)) {
    let got = Promise.resolve(null);
    if (typeof fetch === 'function') {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => ctl && ctl.abort(), TIMEOUT_MS);
      const own = url.startsWith(DATA);
      got = fetch(url, { credentials: own ? 'same-origin' : 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .finally(() => clearTimeout(timer));
    }
    memo.set(url, got);
    // A failure is not kept: the next open may be online.
    got.then((v) => { if (v == null) memo.delete(url); });
  }
  return memo.get(url);
}

const baked = (lang) => getJson(`${DATA}${lang}.json`).then((d) => (d && d.cards ? d : null));

async function credited(file) {
  if (!file) return null;
  const d = await getJson(commonsInfoUrl(file));
  const page = d && d.query && Array.isArray(d.query.pages) ? d.query.pages[0] : null;
  const info = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
  const c = info ? creditOf(info.extmetadata) : null;
  if (!c || !c.free || !info.thumburl) return null;
  return { src: cleanUrl(info.thumburl), w: info.thumbwidth || null, h: info.thumbheight || null, page: cleanUrl(info.descriptionurl), artist: c.artist, licence: c.licence, licenceUrl: c.licenceUrl };
}

async function live(lang, title, record, needMention) {
  const s = summaryOf(await getJson(restSummaryUrl(lang, title)));
  if (!s || (needMention && !mentions(s.extract, record))) return null;
  const card = { t: s.title, u: s.url, x: s.extract, q: s.qid, d: s.dir };
  const img = await credited(s.file);
  if (img) card.i = img;
  return card;
}

/** Does the card already have words of its own? Then they win, and there is no Wikipedia block. */
export function hasOwnWords(record) {
  const image = pick(meta(record), 'image');
  return !!(whyLine(record) || (image && image.file));
}

/**
 * The article for a record, in the visitor's language if Wikipedia has it. `deps` replaces the network in the test:
 * {baked(lang), live(lang, title, record, needMention), langLink(title, lang), norad()}.
 */
export async function articleFor(record, lang, deps = {}) {
  if (!record || hasOwnWords(record)) return null;
  const want = wikiLang(lang);
  const getBaked = deps.baked || baked;
  const getLive = deps.live || live;
  const linkTo = deps.langLink || ((title, l) => getJson(langLinksUrl(title, l)).then(langLinkOf));
  const noradTitles = deps.norad || (() => getJson(`${DATA}norad.json`).then((d) => (d && d.titles) || null));
  const id = String(record.id || '');
  const mine = await getBaked(want);
  if (mine && mine.cards[id]) return { card: mine.cards[id], lang: want, baked: mine.built, fallback: false, family: null };
  if (want !== 'en') {
    const en = await getBaked('en');
    // Baked in English and not in this language: the baker asked, and Wikipedia has no article in it.
    if (en && en.cards[id]) return { card: en.cards[id], lang: 'en', baked: en.built, fallback: true, family: null };
  }
  let title = wikiTitleOf(record);
  let needMention = false;
  if (!title && dsoTitle(record)) { title = dsoTitle(record); needMention = true; }
  if (!title && noradOf(record)) {
    const titles = await noradTitles();
    title = titles ? titles[noradOf(record)] || null : null;
  }
  const fam = title ? null : familyOf(record);
  if (fam) title = fam.title;
  if (!title) return null;
  if (want !== 'en') {
    const there = await linkTo(title, want);
    const card = there ? await getLive(want, there, record, needMention) : null;
    if (card) return { card, lang: want, baked: null, fallback: false, family: fam };
  }
  const card = await getLive('en', title, record, needMention);
  return card ? { card, lang: 'en', baked: null, fallback: want !== 'en', family: fam } : null;
}

// ------------------------------------------------------------------------------------ the DOM

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text != null) n.textContent = String(text);
  return n;
}

function link(href, text) {
  const a = el('a', null, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

const DATE_FMT = (iso) => {
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(ms)) return String(iso || '');
  try { return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(ms); } catch { return String(iso); }
};

function block(found) {
  const W = COPY.wikiCard;
  const { card } = found;
  const wrap = el('section', 'sr-wiki');
  wrap.setAttribute('aria-label', W.label);
  wrap.appendChild(el('p', 'sr-card__label', W.label));
  if (found.family) wrap.appendChild(el('p', 'sr-wiki__note', t(W.family, { fleet: card.t })));
  if (found.fallback) wrap.appendChild(el('p', 'sr-wiki__note', W.inEnglish));
  if (card.i && card.i.src) {
    const figure = el('figure', 'sr-card__figure sr-wiki__figure');
    const img = document.createElement('img');
    img.className = 'sr-card__photo';
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (card.i.w && card.i.h) { img.width = card.i.w; img.height = card.i.h; }
    img.alt = t(W.photoAlt, { title: card.t });
    img.src = card.i.src;
    img.addEventListener('error', () => { figure.hidden = true; }, { once: true });
    figure.appendChild(img);
    const cap = el('figcaption', 'sr-card__photo-credit');
    const licence = String(card.i.licence || '');
    const words = card.i.artist ? t(W.photo, { artist: card.i.artist, licence }) : t(W.photoNoArtist, { licence });
    // The licence's name is a link to the licence, and "Wikimedia Commons" to the file's own page, as CC BY asks.
    const at = words.indexOf(licence);
    if (licence && at >= 0 && card.i.licenceUrl) {
      cap.appendChild(document.createTextNode(words.slice(0, at)));
      cap.appendChild(link(card.i.licenceUrl, licence));
      const rest = words.slice(at + licence.length);
      const c = rest.indexOf('Wikimedia Commons');
      if (c >= 0 && card.i.page) {
        cap.appendChild(document.createTextNode(rest.slice(0, c)));
        cap.appendChild(link(card.i.page, 'Wikimedia Commons'));
        cap.appendChild(document.createTextNode(rest.slice(c + 'Wikimedia Commons'.length)));
      } else cap.appendChild(document.createTextNode(rest));
    } else cap.textContent = words;
    figure.appendChild(cap);
    wrap.appendChild(figure);
  }
  const quote = el('blockquote', 'sr-wiki__text', card.x);
  quote.lang = found.lang;
  quote.dir = card.d === 'rtl' ? 'rtl' : 'auto';
  if (card.u) quote.cite = card.u;
  wrap.appendChild(quote);
  const foot = el('p', 'sr-wiki__credit');
  foot.append(found.baked ? t(W.quotedBaked, { date: DATE_FMT(found.baked) }) : W.quotedLive, ' ', W.textCredit, ' ');
  if (card.u) foot.appendChild(link(card.u, W.readArticle));
  wrap.appendChild(foot);
  return wrap;
}

// ------------------------------------------------------------------------------- read aloud

let reading = null; // {stop()}

export function stopReading() {
  if (reading) reading.stop();
}

const canSpeak = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance === 'function';

// b200-c2-deep: begin -- the trips' voice for the baked cards (forge #151)
const VOICE = new URL('../../audio/cards/en/', import.meta.url).href;
let voiceIndex = null;
const voiceIndexOf = () => voiceIndex || (voiceIndex = fetch(`${VOICE}index.json`, { credentials: 'same-origin' })
  .then((r) => (r.ok ? r.json() : null)).catch(() => null));
const canPlayClips = () => typeof Audio === 'function';

/** 32-bit FNV-1a over the text's UTF-16 code units, in hex: scripts/narrate-cards.py card_hash() is the same. */
export function cardHash(text) {
  let h = 0x811c9dc5;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/** The index's row for card `key` when its clip says exactly `text`, else null. */
export function clipFor(index, key, text) {
  const row = index && index.clips ? index.clips[key] : null;
  return row && row.h === cardHash(text) ? row : null;
}
// b200-c2-deep: end

function readButton(box, getParts, getClip = () => null) {
  const W = COPY.wikiCard;
  const row = el('div', 'sr-wiki__read');
  const btn = el('button', 'sr-btn sr-btn--quiet sr-card__inline', W.read);
  btn.type = 'button';
  btn.title = W.readTitle;
  btn.dataset.focus = 'read-aloud';
  btn.setAttribute('aria-pressed', 'false');
  const caption = el('p', 'sr-wiki__caption');
  caption.setAttribute('aria-live', 'off');
  caption.setAttribute('aria-label', W.reading);
  caption.hidden = true;
  row.appendChild(btn);
  row.appendChild(caption);
  let watch = null;
  const end = () => {
    if (watch) clearInterval(watch);
    watch = null;
    btn.textContent = W.read;
    btn.setAttribute('aria-pressed', 'false');
    caption.hidden = true;
    caption.textContent = '';
    if (reading && reading.box === box) reading = null;
  };
  // b200-c2-deep: begin -- a clip when the card has one, the device's voice otherwise
  const credit = el('p', 'sr-wiki__note');
  credit.hidden = true;
  row.appendChild(credit);
  const playClip = (key) => {
    const audio = new Audio();
    const [first, twin] = pickFormat({ file: `${VOICE}${key}.opus`, twin: `${VOICE}${key}.m4a` }, (type) => audio.canPlayType(type));
    let cues = [];
    let stopped = false;
    fetch(`${VOICE}${key}.vtt`, { credentials: 'same-origin' }).then((r) => (r.ok ? r.text() : '')).then((v) => { cues = parseVtt(v); }).catch(() => {});
    const finish = () => { credit.hidden = true; end(); };
    audio.addEventListener('timeupdate', () => {
      const text = cueAt(cues, audio.currentTime);
      if (text && caption.textContent !== text) { caption.hidden = false; caption.textContent = text; caption.lang = 'en'; }
    });
    audio.addEventListener('ended', finish);
    audio.addEventListener('error', () => {
      if (stopped) return;
      if (twin && audio.src !== twin) { audio.src = twin; audio.play().catch(() => {}); return; }
      // Neither file plays here: the device reads it after all.
      reading = null; credit.hidden = true; speakDevice();
    });
    reading = { box, stop() { stopped = true; audio.pause(); audio.removeAttribute('src'); finish(); } };
    btn.textContent = W.stop;
    btn.setAttribute('aria-pressed', 'true');
    credit.textContent = COPY.cardVoice.credit;
    credit.hidden = false;
    watch = setInterval(() => { if (!box.isConnected && reading && reading.box === box) reading.stop(); }, 500);
    audio.src = first;
    audio.play().catch(() => { /* the error event says why */ });
  };
  btn.addEventListener('click', () => {
    if (reading && reading.box === box) { reading.stop(); return; }
    stopReading();
    const clip = canPlayClips() ? getClip() : null;
    if (!clip) { speakDevice(); return; }
    voiceIndexOf().then((index) => {
      if (reading) return; // pressed again, or another card, while the index came
      if (clipFor(index, clip.key, clip.text)) playClip(clip.key); else speakDevice();
    });
  });
  // b200-c2-deep: end
  function speakDevice() {
    if (!canSpeak()) return;
    const parts = getParts();
    if (!parts.length) return;
    const voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : [];
    let i = 0;
    let stopped = false;
    const next = () => {
      if (stopped || i >= parts.length) { end(); return; }
      const part = parts[i];
      i += 1;
      const u = new SpeechSynthesisUtterance(part.text);
      u.lang = part.lang;
      const voice = voices.find((v) => String(v.lang || '').toLowerCase().startsWith(String(part.lang).toLowerCase().split('-')[0]));
      if (voice) u.voice = voice;
      u.onstart = () => { caption.hidden = false; caption.textContent = part.text; caption.lang = part.lang; };
      u.onend = next;
      u.onerror = () => end();
      speechSynthesis.speak(u);
    };
    reading = { box, stop() { stopped = true; try { speechSynthesis.cancel(); } catch { /* nothing to stop */ } end(); } };
    btn.textContent = W.stop;
    btn.setAttribute('aria-pressed', 'true');
    // A card that closes takes its box out of the page: the reading stops with it.
    watch = setInterval(() => { if (!box.isConnected && reading && reading.box === box) reading.stop(); }, 500);
    try { speechSynthesis.cancel(); } catch { /* a fresh queue */ }
    next();
  }
  return row;
}

/** Fill the box at the top of a card's About it: Read aloud, then the Wikipedia block when there is one. */
export async function mountWikiCard(box, record, words = {}) {
  if (!box || box.dataset.mounted) return;
  box.dataset.mounted = '1';
  loadCss('wikicard');
  let found = null;
  const pageLang = LOCALE || LANG;
  if (canSpeak() || canPlayClips()) { // b200-c2-deep: or a clip
    const btnRow = readButton(box, () => readingParts({
      name: words.name, sentence: words.sentence, why: words.why,
      wiki: found ? { extract: found.card.x, lang: found.lang } : null, pageLang,
    }), () => (found && found.baked && found.lang === 'en' && !words.why ? { key: String(record.id || ''), text: found.card.x } : null)); // b200-c2-deep
    box.appendChild(btnRow);
  }
  if (hasOwnWords(record)) return;
  const wait = el('p', 'sr-wiki__loading', COPY.wikiCard.loading);
  box.appendChild(wait);
  try { found = await articleFor(record, LANG); } catch { found = null; }
  // b200-c2-deep: a baked English lead is read in the trips' voice (scripts/narrate-cards.py made a clip of every one it could say)
  const readBtn = box.querySelector('[data-focus="read-aloud"]');
  if (readBtn && found && found.baked && found.lang === 'en' && canPlayClips()) readBtn.title = COPY.cardVoice.readTitle;
  wait.remove();
  if (found && box.isConnected !== false) box.appendChild(block(found));
}
