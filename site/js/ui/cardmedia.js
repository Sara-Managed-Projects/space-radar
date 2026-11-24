// ui/cardmedia.js -- a card's "Pictures and news" (forge internal #556; awesome-space research idea 13).
//
// Contract: mountMedia(box, record, { name, klass }) fills the box once (ui/cards.js calls it the first time the row
// opens; nothing of this file or its data is fetched before). Pure, for tests/test_cardmedia.mjs:
//   norm(text)                         a name as the matcher compares it: lower case, no accents, no "(ZARYA)"
//   namesOf(record, name)              every name the object goes by, normalised, with the search's aliases
//   postsFor(names, journal)           the Journal's posts tagged with one of those names, newest first
//   archiveLinks(name, klass)          the archives' own search pages for the name: [{id, url}]
//   mediaFor(record, name, klass, d)   { pictures, reads, pages, posts, archives, empty }
//   ownSrc(src)                        is a picture's address this site's or the Journal's (never anybody else's)
//
// WHAT IS SHOWN. Only what a registry already holds and credits (scripts/gen_media.py, site/js/data/media.js): the
// photographs of registry/nebulae.yaml and registry/exotics.yaml, which are files of this site under CC BY 4.0 with
// their credit beside them; our own long reads (registry/articles.yaml) and the Journal's posts (registry/blog-feed.json)
// with their own pictures; the agency's own page for a mission (registry/missions.yaml). The archives (NASA's Image and
// Video Library, ESA/Hubble, ESA/Webb) are plain links to their search for the name: nothing is fetched from them and
// no picture of theirs is shown here, so no licence of theirs is assumed.
//
// A JOURNAL POST IS MATCHED BY ITS TAGS. The Journal tags a post with names people use ("Voyager 1", "ISS", "Moon");
// a record goes by its id, its catalogue name, the name the card shows and its aliases. A post is the object's when one
// of its tags, normalised, is one of those names, or the search's alias of one (data/aliases.js: "hubble" and "hubble
// space telescope" are both "hst"). A tag of three letters or fewer counts only as a whole name, never inside another.

import { COPY, t } from '../copy/en.js';
import '../copy/en.media.js';
import { loadCss } from './latercss.js';
import { ALIASES } from '../data/aliases.js';
import { PICTURES, READS, PAGES, JOURNAL } from '../data/media.js';
import { sr } from './platform-bridge.js';

const OWN_HOSTS = ['https://blog.spaceradar.ai/', 'https://www.spaceradar.ai/'];
/** The kinds a picture archive of deep space is asked about (ESA/Hubble and ESA/Webb). */
const TRACKED = new Set();
const DEEP = new Set(['dso', 'exotic', 'star', 'exoplanet']);

/** A name as the matcher compares it. Pure. */
export function norm(text) {
  return String(text == null ? '' : text)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9*]+/g, ' ')
    .trim();
}

/** Every name the object goes by, normalised, with the search's alias of each. Pure. */
export function namesOf(record, name) {
  const out = new Set();
  const add = (v) => {
    const n = norm(v);
    if (!n) return;
    out.add(n);
    if (Object.prototype.hasOwnProperty.call(ALIASES, n)) out.add(norm(ALIASES[n]));
  };
  if (record) {
    add(record.name);
    add(String(record.id || '').replace(/^(deep|dso|exotic|sat)-/, '').replace(/-/g, ' '));
    const m = record.meta || {};
    add(m.displayName);
    for (const a of Array.isArray(m.aliases) ? m.aliases : Array.isArray(record.aliases) ? record.aliases : []) add(a);
  }
  add(name);
  // A satellite's number alone ("25544") would match nothing anyone tags: drop the bare digits.
  for (const n of [...out]) if (/^\d+$/.test(n)) out.delete(n);
  return out;
}

/** The Journal's posts that carry one of `names` as a tag (or its alias), newest first. Pure. */
export function postsFor(names, journal = JOURNAL) {
  if (!names || !names.size) return [];
  const hit = (tag) => {
    const n = norm(tag);
    if (!n) return false;
    if (names.has(n)) return true;
    return Object.prototype.hasOwnProperty.call(ALIASES, n) && names.has(norm(ALIASES[n]));
  };
  return (journal || []).filter((p) => (p.tags || []).some(hit))
    .slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

/** The archives' own search for the name. NASA's library for everything; ESA/Hubble and ESA/Webb for deep space. Pure. */
export function archiveLinks(name, klass) {
  const q = encodeURIComponent(String(name || '').trim());
  if (!q) return [];
  const out = [{ id: 'nasa', url: `https://images.nasa.gov/search?q=${q}` }];
  if (DEEP.has(klass)) {
    out.push({ id: 'esahubble', url: `https://esahubble.org/images/?search=${q}` });
    out.push({ id: 'esawebb', url: `https://esawebb.org/images/?search=${q}` });
  }
  return out;
}

/** Is this picture's address one of ours (a file of this site, or the Journal's)? Pure. */
export function ownSrc(src) {
  const s = String(src || '');
  if (!s) return false;
  if (/^[a-z]+:/i.test(s) || s.startsWith('//')) return OWN_HOSTS.some((h) => s.startsWith(h));
  return !s.startsWith('/') || s.startsWith('/images/');
}

/** What the section holds for one record. Pure: `d` is {PICTURES, READS, PAGES, JOURNAL} (site/js/data/media.js). */
export function mediaFor(record, name, klass, d = { PICTURES, READS, PAGES, JOURNAL }) {
  const id = record && record.id ? String(record.id) : '';
  const own = (key) => (Object.prototype.hasOwnProperty.call(d[key] || {}, id) ? d[key][id] : []);
  const pictures = own('PICTURES').filter((p) => ownSrc(p.file) && p.credit && p.licence);
  const reads = own('READS').filter((r) => r.title && (!r.hero || ownSrc(r.hero)));
  const pages = own('PAGES').filter((p) => /^https:\/\//.test(p.url || ''));
  const posts = postsFor(namesOf(record, name), d.JOURNAL).map((p) => ({ ...p, image: ownSrc(p.image) ? p.image : '' }));
  const archives = archiveLinks(name || (record && record.name), klass);
  return { pictures, reads, pages, posts, archives, empty: !pictures.length && !reads.length && !pages.length && !posts.length };
}

// ------------------------------------------------------------------------------------------------- the DOM

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}
function outLink(className, text, href, title) {
  const a = el('a', className, text);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  if (title) a.title = title;
  return a;
}
function thumb(src, alt) {
  const img = document.createElement('img');
  img.className = 'sr-media__thumb';
  img.src = src;
  img.alt = alt || '';
  img.loading = 'lazy';
  img.decoding = 'async';
  return img;
}
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const dayText = (iso) => {
  const ms = Date.parse(String(iso || '').slice(0, 10) + 'T12:00:00Z');
  if (!Number.isFinite(ms)) return '';
  try { return new Date(ms).toLocaleDateString(document.documentElement.lang || 'en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch { return String(iso).slice(0, 10); }
};

function group(title, nodes) {
  if (!nodes.length) return null;
  const wrap = el('section', 'sr-media__group');
  wrap.appendChild(el('h3', 'sr-card__label', title));
  const list = el('ul', 'sr-media__list');
  for (const n of nodes) { const li = el('li', 'sr-media__item'); li.appendChild(n); list.appendChild(li); }
  wrap.appendChild(list);
  return wrap;
}

/** Fill the box the card made (once). */
export function mountMedia(box, record, opts = {}) {
  if (!box || box.dataset.mounted) return null;
  box.dataset.mounted = '1';
  loadCss('cardmedia');
  // Once a record a visit: the card is drawn again when the clock moves, and an open row mounts again with it.
  const rid = record && record.id ? String(record.id) : '';
  if (!TRACKED.has(rid)) { TRACKED.add(rid); sr('track', 'tab_open', { tab: 'media' }); }
  const M = COPY.media;
  const name = opts.name || (record && record.name) || '';
  const m = mediaFor(record, name, opts.klass);
  box.textContent = '';
  const put = (node) => { if (node) box.appendChild(node); };
  if (m.empty) box.appendChild(el('p', 'sr-media__note', t(M.empty, { name })));

  put(group(M.pictures, m.pictures.map((p) => {
    const fig = el('figure', 'sr-card__figure sr-media__figure');
    const a = outLink('sr-media__piclink', null, p.page, t(M.photoOpen, { site: hostOf(p.page) }));
    a.appendChild(thumb(p.file, p.alt || (p.by ? t(M.photoAlt, { name, by: p.by }) : t(M.photoAltPlain, { name }))));
    fig.appendChild(a);
    fig.appendChild(el('figcaption', 'sr-card__photo-credit', t(M.credit, { credit: p.credit, licence: p.licence })));
    return fig;
  })));

  put(group(M.journal, m.posts.map((p) => {
    const row = el('div', 'sr-media__row');
    if (p.image) row.appendChild(thumb(p.image, ''));
    const words = el('div', 'sr-media__words');
    words.appendChild(outLink('sr-media__link', p.title, p.url, M.onJournal));
    if (p.date) words.appendChild(el('span', 'sr-media__meta', t(M.posted, { date: dayText(p.date) })));
    row.appendChild(words);
    return row;
  })));

  put(group(M.reads, m.reads.map((r) => {
    const row = el('div', 'sr-media__row');
    if (r.hero) row.appendChild(thumb(r.hero, r.alt || ''));
    const words = el('div', 'sr-media__words');
    words.appendChild(outLink('sr-media__link', r.title, r.page, M.readOnTitle));
    words.appendChild(el('span', 'sr-media__meta', M.own));
    if (r.blog) words.appendChild(outLink('sr-media__link sr-media__link--quiet', M.onJournal, r.blog));
    row.appendChild(words);
    return row;
  })));

  put(group(M.pages, m.pages.map((p) => outLink('sr-media__link', p.name, p.url, t(M.pageTitle, { name })))));

  const arch = group(M.archives, m.archives.map((a) => outLink('ui-btn ui-btn--sm ui-btn--quiet sr-media__arch', M[a.id], a.url, t(M[`${a.id}Title`], { name }))));
  if (arch) {
    arch.querySelector('.sr-media__list').classList.add('sr-media__list--row');
    arch.appendChild(el('p', 'sr-media__note', M.archivesNote));
    box.appendChild(arch);
  }
  return m;
}
