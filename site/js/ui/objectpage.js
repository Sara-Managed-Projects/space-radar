// ui/objectpage.js -- which objects have a page of their own, and its address (internal #199).
//
// Never at boot: ui/cards.js imports it when a card's "About it" is opened, ui/sharesheet.js with
// the sheet. scripts/build_seo.py writes `object-pages.json` beside sitemap.xml at deploy time,
// {record id: page slug}; it is fetched once a visit, gives up after three seconds, and without it
// (a local server, offline) no card links to a page and Share uses the app's own link.
//
// Contract: objectPages(base) -> Promise<{id: slug} | null>
//           pageFor(record, base) -> Promise<string | null>   the page's address, or null
//           objectPageUrl(record, pages, base) -> string      pure: the page, else the app at #at=<id>

/** Written by scripts/build_seo.py at deploy time beside sitemap.xml: {record id: page slug}. */
export const PAGES_INDEX = 'object-pages.json';
const PAGES_TIMEOUT_MS = 3000;

const here = () => (typeof location !== 'undefined' && location.origin ? location.origin + String(location.pathname || '/').replace(/[^/]*$/, '') : '/');

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

let pagesIndex = null; // Promise<{id: slug} | null>, once a visit

export function objectPages(base = here()) {
  if (!pagesIndex) {
    if (typeof fetch !== 'function') return Promise.resolve(null);
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), PAGES_TIMEOUT_MS);
    pagesIndex = fetch(`${base}${PAGES_INDEX}`, { credentials: 'same-origin', signal: ctl ? ctl.signal : undefined })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && typeof d === 'object' && !Array.isArray(d) ? d : null))
      .catch(() => null)
      .finally(() => clearTimeout(timer));
  }
  return pagesIndex;
}

/** The record's own page, or null when the deploy built none for it. */
export async function pageFor(record, base = here()) {
  const pages = await objectPages(base);
  if (!pages) return null;
  const url = objectPageUrl(record, pages, base);
  return url.startsWith(`${base}o/`) ? url : null;
}
