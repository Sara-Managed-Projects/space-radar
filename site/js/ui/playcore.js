// ui/playcore.js -- the daily challenges' rules, with nothing on screen (forge #160). ui/play.js draws them.
//
// Contract (all pure; tests/test_playcore.mjs):
//   GAMES                         the three keys `#play=` takes: find-earth, which-world, guess-distance
//   utcDay(ms)                    'YYYY-MM-DD' of an instant, in UTC: the day the puzzle belongs to
//   seedOf(day, game)             a 32-bit seed from the day and the game (FNV-1a)
//   rng(seed)                     a generator of numbers in [0, 1) from that seed (mulberry32)
//   pick(list, n, rand)           n distinct items of a list, in a seeded order (the list's own order is the input)
//   distanceTile(guessLy, trueLy) the tile of one guess, by how many times off it is: 'hit' (within 1.25x),
//                                 'near' (2x), 'far' (5x), 'miss'
//   sliderLy(v), lyToSlider(ly)   the distance slider is log10 of light-years, SLIDER.min..SLIDER.max
//   shareText({...})              the lines a visitor pastes: title, the grid, the score, the link
//   xLength(text)                 the length X counts (twitter-text v3: most of Latin, Greek, Cyrillic
//                                 and punctuation weigh 1, everything else 2, a link 23)
//   SHARE_LIMITS                  the plain-text limits the share text is held under
//   readStore(raw), writeStore(store, day, game, result, keepDays)  the browser's record, as JSON text
//   streak(store, day)            how many days in a row up to `day` have at least one finished challenge
//
// WHY THE DAY IS UTC. The point of a daily puzzle is that two people comparing grids played the same one.
// A local date would give Sydney tomorrow's puzzle while London is still on today's; UTC gives everyone the
// same puzzle for the same 24 hours, and the grid's title carries the date so a pasted result says which.
//
// WHY THE ORDER OF THE INPUT MATTERS. pick() is only as stable as the list it is handed: ui/play.js sorts
// every pool by id before picking, so two visitors on the same release draw the same objects.
//
// THE SHARE TEXT IS PLAIN. Slack, WhatsApp and X each read *, _ and ~ as formatting (bold, italic, strike)
// and ` as code; the text uses none of them, and the grid is coloured squares, which all three show as
// emoji. Limits, read 2026-11-07: X 280 weighted characters (https://docs.x.com/resources/fundamentals/counting-characters),
// Slack 40 000 characters a message (https://api.slack.com/methods/chat.postMessage, "text" field: truncated
// past 40,000), WhatsApp 65 536 characters a message (WhatsApp Business Platform docs, text.body). The test
// holds the longest possible text of each game under X's 280, which is far under the other two.

export const GAMES = ['find-earth', 'which-world', 'guess-distance'];
export const MAX_TRIES = 10;
export const SHARE_LIMITS = { x: 280, slack: 40000, whatsapp: 65536 };
export const SLIDER = { min: 0, max: 10, step: 0.01 }; // 1 light-year to 10 billion
export const TILES = { hit: '\u{1F7E9}', near: '\u{1F7E8}', far: '\u{1F7E7}', miss: '\u{1F7E5}', skip: '⬜' };

export function utcDay(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

export function seedOf(day, game) {
  let h = 0x811c9dc5;
  for (const ch of `${day}:${game}`) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(list, n, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}

export function distanceTile(guessLy, trueLy) {
  if (!(guessLy > 0) || !(trueLy > 0)) return 'miss';
  const f = Math.max(guessLy / trueLy, trueLy / guessLy);
  return f <= 1.25 ? 'hit' : f <= 2 ? 'near' : f <= 5 ? 'far' : 'miss';
}

export const sliderLy = (v) => 10 ** Math.min(SLIDER.max, Math.max(SLIDER.min, Number(v)));
export const lyToSlider = (ly) => Math.min(SLIDER.max, Math.max(SLIDER.min, Math.log10(Math.max(ly, 1))));

/** rows: arrays of tile names ('hit' ...), one row per rung or round; score: the words after the grid. */
export function shareText({ title, day, rows, score, url }) {
  const grid = rows.map((r) => r.map((k) => TILES[k] || TILES.skip).join('')).join(' ');
  return [`${title} ${day}`, grid, score, url].filter(Boolean).join('\n');
}

// twitter-text v3's weighted ranges: code points in these weigh 1, every other weighs 2 (an emoji is 2).
const LIGHT = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
export function xLength(text) {
  let n = 0;
  const urls = String(text).match(/https?:\/\/\S+/g) || [];
  const rest = urls.reduce((s, u) => s.replace(u, ''), String(text));
  for (const ch of rest) {
    const c = ch.codePointAt(0);
    n += LIGHT.some(([a, b]) => c >= a && c <= b) ? 1 : 2;
  }
  return n + urls.length * 23;
}

export function readStore(raw) {
  try {
    const s = JSON.parse(raw || '');
    if (s && s.v === 1 && s.days && typeof s.days === 'object') return s;
  } catch { /* a store from another release, or none: start again */ }
  return { v: 1, days: {} };
}

/** The store with one result added, days older than `keepDays` before `day` dropped. Returns JSON text. */
export function writeStore(store, day, game, result, keepDays = 60) {
  const days = { ...(store && store.days) };
  days[day] = { ...(days[day] || {}), [game]: result };
  const cutoff = Date.parse(`${day}T00:00:00Z`) - keepDays * 86400000;
  for (const d of Object.keys(days)) if (!(Date.parse(`${d}T00:00:00Z`) >= cutoff)) delete days[d];
  return JSON.stringify({ v: 1, days });
}

export function streak(store, day) {
  const days = (store && store.days) || {};
  let n = 0;
  for (let t = Date.parse(`${day}T00:00:00Z`); days[utcDay(t)] && Object.keys(days[utcDay(t)]).length; t -= 86400000) n++;
  return n;
}
