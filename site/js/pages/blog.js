// pages/blog.js -- keeps the "From the journal" lists of the static pages current without a map deploy (internal #102).
//
// scripts/seo_common.py from_blog bakes each list into its page from registry/blog-feed.json, so a page is only as new as the last
// deploy. This script reads the journal's slim list, https://blog.spaceradar.ai/feed-lite.json (title, address, day, summary,
// picture and tags of the newest stories; no bodies), and redraws every list with the same rule the build uses: the stories that
// mention the page's keywords, newest first, topped up with the newest others, never the page's own story. It writes no sentence
// of its own: every word comes from the feed or from the markup the build wrote.
//
// The baked list is the fallback and stays when anything goes wrong: offline, the feed blocked or not answering within a few
// seconds, a body that is not what we expect, no story left to show. Nothing is sent but one GET of a public file, with no cookie.
// Only addresses on the journal's own host are linked; a story whose address is anywhere else is left out.

export const FEED = 'https://blog.spaceradar.ai/feed-lite.json';
const HOST = 'https://blog.spaceradar.ai/';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-11-14" -> "14 November 2026", as the build writes it. */
export function dayWords(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m || +m[2] < 1 || +m[2] > 12) return '';
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}

/** The stories a feed body offers: only well-formed ones, on the journal's host, newest first. */
export function storiesOf(body) {
  const items = body && Array.isArray(body.items) ? body.items : [];
  return items
    .filter((p) => p && typeof p.title === 'string' && p.title && typeof p.url === 'string' && p.url.startsWith(HOST)
      && typeof p.summary === 'string' && dayWords(p.date))
    .map((p) => ({ title: p.title, url: p.url, date: p.date, summary: p.summary, tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string') : [] }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** The build's rule (scripts/seo_common.py from_blog): keyword hits first, then the newest others, `limit` in all, never `skip`. */
export function pick(stories, keywords, limit, skip) {
  const posts = stories.filter((p) => p.url !== skip);
  const hay = (p) => [p.title, p.summary, ...p.tags].join(' ').toLowerCase();
  const hits = posts.filter((p) => keywords.some((k) => hay(p).includes(k.toLowerCase())));
  return [...hits, ...posts.filter((p) => !hits.includes(p))].slice(0, limit);
}

function card(doc, p) {
  const li = doc.createElement('li');
  const h = doc.createElement('h3');
  const a = doc.createElement('a');
  a.href = p.url;
  a.textContent = p.title;
  h.append(a);
  const s = doc.createElement('p');
  s.textContent = p.summary;
  const d = doc.createElement('p');
  d.className = 'meta';
  d.textContent = dayWords(p.date);
  li.append(h, s, d);
  return li;
}

/** Redraws one list from the stories; leaves it alone when nothing qualifies. */
export function redraw(section, stories) {
  const ul = section.querySelector('ul');
  const limit = Math.max(1, parseInt(section.dataset.blogLimit, 10) || 3);
  const keywords = (section.dataset.blogKeywords || '').split('|').filter(Boolean);
  const chosen = pick(stories, keywords, limit, section.dataset.blogSkip || '');
  if (!ul || !chosen.length) return false;
  ul.replaceChildren(...chosen.map((p) => card(section.ownerDocument, p)));
  return true;
}

export async function run(doc = document, fetcher = fetch) {
  const sections = [...doc.querySelectorAll('.fromblog[data-blog-limit]')];
  if (!sections.length) return 0;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), 6000) : 0;
  try {
    const res = await fetcher(FEED, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined });
    if (!res.ok) return 0;
    const stories = storiesOf(await res.json());
    return sections.filter((s) => redraw(s, stories)).length;
  } catch {
    return 0; // the baked list stays
  } finally {
    clearTimeout(timer);
  }
}

if (typeof document !== 'undefined' && document.querySelector) run();
