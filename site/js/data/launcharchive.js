// data/launcharchive.js -- the launch archive's rows, read from the file harvest/parsers/gcat_launch.py packs (forge #551).
//
// Contract, pure (tests/test_launch_archive.mjs):
//   SNAPSHOT_URL, BUNDLED_URL               our saved copy first (the harvester's `gcat-launches`), the bundled copy after it
//   unwrap(doc) -> archive file | null      a snapshot document's `body`, or the bundled file itself
//   parseArchive(file) -> { rows, updated, count, citation, licence, source, sites } | null
//   outcomeKind(code) -> 'S' | 'F' | 'P' | 'E' | 'A' | 'U'      GCAT's second letter, a partial's digits folded into P
//   partialPercent(code) -> number | null   the percent GCAT credits a partial (OS75 -> 75)
//   yearOf(t), decadeOf(year), yearFraction(t)
//   countBy(rows, key) -> [[value, n], ...] most first
//   matchesWhen(row, when)                  '' any, '1960s' a decade, '1969' a year
//   whenFromArg(arg) -> '' | '1960s' | '1969'
//
// One row: { tag, t (UTC as GCAT gives it: 'YYYY-MM-DD HH:MM:SS', to the minute or the day), year, veh, site, siteName,
// lat, lon, state (GCAT's code), cc (ISO, for the country's name), pad, pay, ag, out (GCAT's code without O), kind, inc }.

export const SNAPSHOT_URL = 'data/v1/gcat-launches.json';
export const BUNDLED_URL = 'data/launches.json';

/** Our snapshot wraps the cut in `body` (harvest/snapshot.py); the bundled copy is the cut itself. */
export function unwrap(doc) {
  if (!doc || typeof doc !== 'object') return null;
  let body = doc.body !== undefined ? doc.body : doc;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return null; } }
  return body && Array.isArray(body.rows) && Array.isArray(body.cols) ? body : null;
}

export function outcomeKind(code) {
  const c = String(code || '').toUpperCase();
  const letter = c.charAt(0);
  if (/\d/.test(c.slice(1)) && (letter === 'S' || letter === 'F')) return 'P';
  return ['S', 'F', 'E', 'A', 'U'].includes(letter) ? letter : 'U';
}

export function partialPercent(code) {
  const m = /^[SF](\d{2})$/.exec(String(code || '').toUpperCase());
  return m ? Number(m[1]) : null;
}

export function yearOf(t) {
  const y = Number(String(t || '').slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : null;
}

export const decadeOf = (year) => (Number.isFinite(year) ? Math.floor(year / 10) * 10 : null);

/** 1969.54 for a launch in mid July 1969: where the replay's clock is. A month or a day missing counts as its middle. */
export function yearFraction(t) {
  const s = String(t || '');
  const y = yearOf(s);
  if (y === null) return null;
  const mo = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  const hh = Number(s.slice(11, 13)) || 0;
  const mm = Number(s.slice(14, 16)) || 0;
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  const at = Number.isFinite(mo) && mo >= 1
    ? Date.UTC(y, mo - 1, Number.isFinite(d) && d >= 1 ? d : 15, hh, mm)
    : Date.UTC(y, 6, 1);
  return y + (at - start) / (end - start);
}

export function parseArchive(file) {
  if (!file || !Array.isArray(file.rows) || !Array.isArray(file.cols)) return null;
  const col = Object.fromEntries(file.cols.map((c, i) => [c, i]));
  for (const k of ['tag', 't', 'veh', 'site', 'pad', 'pay', 'ag', 'out', 'inc']) if (!(k in col)) return null;
  const veh = Array.isArray(file.veh) ? file.veh : [];
  const ag = Array.isArray(file.ag) ? file.ag : [];
  const sites = file.sites && typeof file.sites === 'object' ? file.sites : {};
  const rows = [];
  for (const r of file.rows) {
    if (!Array.isArray(r)) continue;
    const site = String(r[col.site] || '');
    const s = sites[site] || null;
    const t = r[col.t] || '';
    const out = String(r[col.out] || '');
    rows.push({
      tag: String(r[col.tag] || ''),
      t,
      year: yearOf(t),
      veh: veh[r[col.veh]] || '',
      site,
      siteName: s ? s[0] : site,
      lat: s && Number.isFinite(s[1]) ? s[1] : null,
      lon: s && Number.isFinite(s[2]) ? s[2] : null,
      state: s ? s[3] : '',
      cc: s ? s[4] : '',
      pad: r[col.pad] || '',
      pay: r[col.pay] || '',
      ag: ag[r[col.ag]] || '',
      out,
      kind: outcomeKind(out),
      inc: Number.isFinite(r[col.inc]) ? r[col.inc] : null,
    });
  }
  return {
    rows,
    updated: file.updated || null,
    count: rows.length,
    citation: file.citation || '',
    licence: file.licence || '',
    source: file.source || '',
    sites,
  };
}

/** [[value, n], ...], most first, ties by value. */
export function countBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    const v = typeof key === 'function' ? key(r) : r[key];
    if (v === null || v === undefined || v === '') continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

/** '' any time, '1960s' a decade, '1969' one year. */
export function matchesWhen(row, when) {
  if (!when) return true;
  const m = /^(\d{4})(s?)$/.exec(String(when));
  if (!m || row.year === null) return false;
  const n = Number(m[1]);
  return m[2] ? decadeOf(row.year) === n : row.year === n;
}

/** What a `cat=launches:<arg>` link asks for: a year from 1957 on, or a decade; anything else is any time. */
export function whenFromArg(arg) {
  const m = /^(\d{4})(s?)$/.exec(String(arg || '').trim());
  if (!m) return '';
  const n = Number(m[1]);
  if (n < 1950 || n > 2100) return '';
  if (m[2]) return n % 10 === 0 ? `${n}s` : '';
  return n >= 1957 ? String(n) : '';
}
