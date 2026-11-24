// ui/yourstar.js -- the star of your year and the sky on your birthday: a card to share (forge internal #545).
//
// Contract: createYourStar(ctx) -> { open(value?, opts?), close(), isOpen(), state() }
//           starLink(ctx, value, ask) -> main.js's one call: makes it once (ctx.yourStar), opens it when asked (the search
//           row) or hands it the link's `born` value
// Pure, for tests/test_yourstar.mjs: parseBorn(value), bornValue(born), bornLink(born, base), bornMs(born),
//   ageYears(born, nowMs), distanceBand(record), pickStar(stars, age), nearestStar(stars), departureMs(ly, nowMs),
//   phaseKey(deg), skyOn(born, place, Astronomy), CARD_FORMATS, cardBlocks(result, words, format), projectSky(...)
//
// WHAT IT SAYS, AND WHY IT IS TRUE. A light-year is the distance light goes in a Julian year (365.25 days), so a star
// N light-years away is seen tonight by light that left it N years ago. The star of your year is the named star whose
// distance in light-years is nearest your age in years: the light reaching you from it tonight set off about when you
// were born. A distance is a measurement with an error, so the card says how far off that day can be: the band is the
// record's own where the catalogue gives one (a Gaia DR3 parallax and its error, registry/stars-notable.yaml; a range,
// registry/exotics.yaml), and otherwise MODELLED from Hipparcos's precision, 0.5 milliarcseconds (the same model as
// scene/stars3dtree.js distanceNote: van Leeuwen 2007), and the panel says which. Under 4.2 years old there is no star
// that close: the light that left Proxima Centauri on your birthday is still on its way, and the card says when it lands.
//
// THE SKY ON THAT DAY is astronomy-engine's (vendor/astronomy.js, the library sky/skyview.js solves the Moon with): the
// Moon's phase and how much of it is lit, and the bright planets in the evening sky, at 9 pm on the visitor's own clock
// or, with a city typed from the bundled list, at the end of dusk there (the Sun 12 degrees down).
//
// NOTHING IS STORED OR SENT. The date is the one the visitor typed; it stays in this page and in the link's hash
// (`#born=1990-06-12`, or `#born=1990`), which a browser never sends to a server. The city is not in the link. The card
// is drawn here, on a canvas, and leaves only by the visitor's own Share or Download. The one event (CONTRACT.md `share`)
// carries the method and the word `birthday_card`, never the date.
//
// NOTHING AT BOOT. main.js imports this file when the search row asks (the event `sr:your-star`) or the link carries
// `born=`, and calls starLink().

import { COPY, CITIES, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import '../copy/en.yourstar.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { icon, iconFrom } from './icons.js';
import { loadCss } from './latercss.js';
import { write as writeUrl } from './urlstate.js';
import { appBase, toast } from './share.js';
import { findCity } from './place.js';
import { eclipticToEquatorial } from '../propagate/frames.js';
import { constellationAt } from '../sky/constellation.js';
import { sr } from './platform-bridge.js';

const JULIAN_YEAR_MS = 365.25 * 86400e3;
const LY_PER_PC = 3.2615637771674333;
/** Hipparcos's new reduction, about 0.5 mas for a star of the named set (scene/stars3dtree.js SIGMA_MAS[2]). */
export const HIPPARCOS_SIGMA_MAS = 0.5;
/** The first year the field takes: the oldest person alive was born after it. */
export const MIN_YEAR = 1900;
/** Stars within this many light-years of the age are candidates; the brightest of them wins. */
const BAND_LY = 0.5;
const SKY_FIELD_DEG = 22;
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// ------------------------------------------------------------------------------------------- the date

/**
 * The link's or the field's value as {y, m, d}: `1990-06-12`, or `1990` for a year alone (m and d null). Null for
 * anything else, a day that does not exist, or a year outside MIN_YEAR..`maxYear`. Pure.
 */
export function parseBorn(value, maxYear = new Date().getUTCFullYear()) {
  const m = /^\s*(\d{4})(?:-(\d{1,2})-(\d{1,2}))?\s*$/.exec(String(value == null ? '' : value));
  if (!m) return null;
  const y = Number(m[1]);
  if (y < MIN_YEAR || y > maxYear) return null;
  if (m[2] === undefined) return { y, m: null, d: null };
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const day = new Date(Date.UTC(y, mo - 1, d));
  if (day.getUTCFullYear() !== y || day.getUTCMonth() !== mo - 1 || day.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** The value back: `1990-06-12` or `1990`. Pure. */
export function bornValue(b) {
  if (!b) return '';
  return b.m ? `${b.y}-${String(b.m).padStart(2, '0')}-${String(b.d).padStart(2, '0')}` : String(b.y);
}

/** The card's link: the app with `#born=` and nothing else. Pure. */
export function bornLink(b, base = 'https://www.spaceradar.ai/') {
  const root = String(base).endsWith('/') ? String(base) : `${base}/`;
  return b ? `${root}#born=${bornValue(b)}` : root;
}

/** Noon UTC of the day, or of 2 July for a year alone (the middle of it). Pure. */
export function bornMs(b) {
  return b.m ? Date.UTC(b.y, b.m - 1, b.d, 12) : Date.UTC(b.y, 6, 2, 12);
}

/** Age in Julian years at `nowMs`: the light-years light has gone since. Pure. */
export function ageYears(b, nowMs) {
  return (nowMs - bornMs(b)) / JULIAN_YEAR_MS;
}

/** When the light seen at `nowMs` from a star `ly` light-years away left it. Pure. */
export function departureMs(ly, nowMs) {
  return nowMs - ly * JULIAN_YEAR_MS;
}

// ------------------------------------------------------------------------------------------- the star

/**
 * How sure the distance is, in light-years: { low, high, from } where `from` is 'range' (the record's own range),
 * 'gaia' (a parallax and its error in the record's source line) or 'modelled' (Hipparcos's precision). Pure.
 */
export function distanceBand(record) {
  const m = (record && record.meta) || {};
  const d = Number(m.distLy);
  if (!(d > 0)) return null;
  if (Number(m.distLyLow) > 0 && Number(m.distLyHigh) > 0) return { low: Number(m.distLyLow), high: Number(m.distLyHigh), from: 'range' };
  const g = /parallax\s+([\d.]+)\s*±\s*([\d.]+)\s*mas/.exec(String(m.distSource || ''));
  const plx = g ? Number(g[1]) : 1000 * LY_PER_PC / d;
  const sigma = g ? Number(g[2]) : HIPPARCOS_SIGMA_MAS;
  const lo = 1000 * LY_PER_PC / (plx + sigma);
  const hi = plx > sigma ? 1000 * LY_PER_PC / (plx - sigma) : Infinity;
  // The record's distance is the parallax's rounded to 0.01 ly: the band is held round it, whatever the rounding did.
  return { low: Math.min(lo, d), high: Math.max(hi, d), from: g ? 'gaia' : 'modelled' };
}

const nameOf = (r) => String((r.meta && (r.meta.localName || r.meta.displayName)) || r.name || '');
const magOf = (r) => (Number.isFinite(Number(r.meta && r.meta.mag)) ? Number(r.meta.mag) : 99);
/** A name a person would say, not a catalogue number: "HIP 12345" loses to "Tau Ceti" at the same distance. */
const plainName = (r) => !/^(HIP|HD|HR|Gl|GJ|TYC)\s/i.test(String(r.name || ''));

/**
 * The star of the year: among the stars (records of the stars layer) within BAND_LY of `age` light-years, a named one
 * before a catalogue number, then the brightest; with none in the band, the one nearest in distance. Null under the
 * nearest star's distance (see nearestStar) or with no stars. Pure.
 */
export function pickStar(stars, age) {
  const list = (stars || []).filter((r) => r && r.meta && Number(r.meta.distLy) > 0);
  if (!list.length || !(age > 0)) return null;
  const near = nearestStar(list);
  if (near && age < Number(near.meta.distLy) - BAND_LY) return null;
  const band = list.filter((r) => Math.abs(Number(r.meta.distLy) - age) <= BAND_LY);
  if (band.length) {
    // A star whose own error band holds the age first: its light may truly have left on the day. Then a name a person
    // says, then the brightest.
    const holds = (r) => { const b = distanceBand(r); return b && b.low <= age && b.high >= age ? 1 : 0; };
    band.sort((a, b) => (holds(b) - holds(a)) || (plainName(b) - plainName(a)) || (magOf(a) - magOf(b)) || (Math.abs(a.meta.distLy - age) - Math.abs(b.meta.distLy - age)));
    return band[0];
  }
  let best = null;
  for (const r of list) if (!best || Math.abs(r.meta.distLy - age) < Math.abs(best.meta.distLy - age)) best = r;
  return best;
}

/** The nearest star there is (Proxima Centauri), for an age smaller than its distance. Pure. */
export function nearestStar(stars) {
  let best = null;
  for (const r of stars || []) if (r && r.meta && Number(r.meta.distLy) > 0 && (!best || r.meta.distLy < best.meta.distLy)) best = r;
  return best;
}

/** A record's direction as a unit vector on the J2000 equator, from its place round the Sun (ecliptic axes). Pure. */
export function eqDirOf(record) {
  const p = record && record.pos;
  if (!p) return null;
  const e = eclipticToEquatorial(p);
  const n = Math.hypot(e.x, e.y, e.z);
  return n > 0 ? [e.x / n, e.y / n, e.z / n] : null;
}

// ------------------------------------------------------------------------------------------- the sky that day

/** The eight phase names, from the Moon's angle from the Sun (as sky/tonightbest.js phaseName). Pure. */
export function phaseKey(deg) {
  const p = ((deg % 360) + 360) % 360;
  if (p < 12 || p >= 348) return 'new';
  if (p < 78) return 'waxingCrescent';
  if (p < 102) return 'firstQuarter';
  if (p < 168) return 'waxingGibbous';
  if (p < 192) return 'full';
  if (p < 258) return 'waningGibbous';
  if (p < 282) return 'lastQuarter';
  return 'waningCrescent';
}

/**
 * The sky on the day: { ms, moon: {phase, percent}, planets: [ids], from: 'place'|'clock' }. With a place, the moment
 * is the end of dusk there (the Sun 12 degrees down) and a planet counts when it is 5 degrees up; without one, 9 pm on
 * the visitor's clock, and a planet counts when it is 20 degrees or more from the Sun in the evening sky. A year alone
 * has no day: null. `A` is astronomy-engine. Pure but for the library.
 */
export function skyOn(b, place, A = Astronomy, tzOffsetMin = null) {
  if (!b || !b.m) return null;
  try {
    let ms;
    let obs = null;
    if (place && Number.isFinite(place.latDeg) && Number.isFinite(place.lonDeg)) {
      obs = new A.Observer(place.latDeg, place.lonDeg, 0);
      // Local noon by the Sun's clock there, then the next time the Sun is 12 degrees down.
      const noon = Date.UTC(b.y, b.m - 1, b.d, 12) - (place.lonDeg / 15) * 3600e3;
      const dusk = A.SearchAltitude(A.Body.Sun, obs, -1, new Date(noon), 1, -12);
      ms = dusk ? dusk.date.getTime() : noon + 9 * 3600e3;
    } else {
      const off = tzOffsetMin === null ? new Date(b.y, b.m - 1, b.d, 21).getTimezoneOffset() : tzOffsetMin;
      ms = Date.UTC(b.y, b.m - 1, b.d, 21) + off * 60e3;
    }
    const at = new Date(ms);
    const moon = { phase: phaseKey(A.MoonPhase(at)), percent: Math.round(A.Illumination(A.Body.Moon, at).phase_fraction * 100) };
    const planets = [];
    for (const id of PLANETS) {
      const body = A.Body[id[0].toUpperCase() + id.slice(1)];
      if (obs) {
        const eq = A.Equator(body, at, obs, true, true);
        const h = A.Horizon(at, obs, eq.ra, eq.dec, 'normal');
        if (h.altitude >= 5) planets.push(id);
      } else {
        const el = A.Elongation(body, at);
        if (el.visibility === 'evening' && el.elongation >= 20) planets.push(id);
      }
    }
    return { ms, moon, planets, from: obs ? 'place' : 'clock' };
  } catch { return null; }
}

// ------------------------------------------------------------------------------------------- the card

/** The three shapes the card is drawn in: a link preview, a post, a story. */
export const CARD_FORMATS = { landscape: { w: 1200, h: 630 }, square: { w: 1080, h: 1080 }, story: { w: 1080, h: 1920 } };

/**
 * Where each part of the card goes, for one shape: the map's circle and the text column. Pure, so the test can hold
 * every block inside the card and the map clear of the words.
 */
export function cardBlocks(format) {
  const f = CARD_FORMATS[format] || CARD_FORMATS.landscape;
  const pad = Math.round(f.w * 0.06);
  if (format === 'landscape' || !CARD_FORMATS[format]) {
    const r = Math.round(f.h * 0.34);
    return { ...f, pad, map: { x: f.w - pad - r, y: Math.round(f.h * 0.46), r }, text: { x: pad, y: pad, w: f.w - 2 * pad - 2 * r - pad }, scale: 1 };
  }
  const r = Math.round(f.w * (format === 'story' ? 0.34 : 0.26));
  const mapY = format === 'story' ? Math.round(f.h * 0.2) : pad + r;
  return { ...f, pad, map: { x: Math.round(f.w / 2), y: mapY, r }, text: { x: pad, y: mapY + r + pad, w: f.w - 2 * pad }, scale: format === 'story' ? 1.5 : 1.05 };
}

/**
 * The stars round the chosen one, as points on the card's circle (a gnomonic projection centred on it, north up,
 * east left as on the sky): [{x, y, mag, self}], within SKY_FIELD_DEG. `dirs` are [dirEq, mag, isSelf]. Pure.
 */
export function projectSky(centre, dirs, r, fieldDeg = SKY_FIELD_DEG) {
  const [cx, cy, cz] = centre;
  const ra0 = Math.atan2(cy, cx);
  const dec0 = Math.asin(Math.max(-1, Math.min(1, cz)));
  const tanF = Math.tan((fieldDeg * Math.PI) / 180);
  const out = [];
  for (const [v, mag, self] of dirs) {
    const ra = Math.atan2(v[1], v[0]);
    const dec = Math.asin(Math.max(-1, Math.min(1, v[2])));
    const cosc = Math.sin(dec0) * Math.sin(dec) + Math.cos(dec0) * Math.cos(dec) * Math.cos(ra - ra0);
    if (cosc <= 0.2) continue;
    const x = (Math.cos(dec) * Math.sin(ra - ra0)) / cosc;
    const y = (Math.cos(dec0) * Math.sin(dec) - Math.sin(dec0) * Math.cos(dec) * Math.cos(ra - ra0)) / cosc;
    const px = -x / tanF * r;
    const py = -y / tanF * r;
    if (Math.hypot(px, py) > r * 0.96) continue;
    out.push({ x: px, y: py, mag, self: !!self });
  }
  return out;
}

const raDecDir = (raDeg, decDeg) => {
  const a = (raDeg * Math.PI) / 180;
  const d = (decDeg * Math.PI) / 180;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
};

/** The kit's colours, read off the page's tokens (css/tokens.css), with the same values should a token be missing. */
function palette(doc) {
  let cs = null;
  try { cs = getComputedStyle(doc.documentElement); } catch { cs = null; }
  const v = (name, dflt) => (cs && cs.getPropertyValue(name).trim()) || dflt;
  return { bg: v('--bg', '#0B0E14'), bg2: v('--bg2', '#05070A'), tx: v('--tx', '#E8ECF2'), dim: v('--dim', '#9AA4B2'), atm: v('--atm', '#6EC3FF'), ember: v('--ember', '#FF9F43'), line: v('--line', '#ffffff1f') };
}

/** Lines of text that fit `w`, at the context's current font. */
function wrapLines(c, text, w) {
  const out = [];
  let ln = '';
  for (const word of String(text).split(/\s+/)) {
    const tr = ln ? `${ln} ${word}` : word;
    if (ln && c.measureText(tr).width > w) { out.push(ln); ln = word; } else ln = tr;
  }
  if (ln) out.push(ln);
  return out;
}

/**
 * Draw the card on a 2D context `c` sized CARD_FORMATS[format]. `card` is what the panel worked out:
 * { eyebrow, name, place, lines: [..], sky: [..], link, footer, sky: { stars: [{x,y,mag,self}], lines: [[[x,y],...]] } }.
 */
export function drawCard(c, card, format, colours, fonts = { cap: 'sans-serif', sans: 'sans-serif' }) {
  const B = cardBlocks(format);
  const P = colours;
  const s = B.scale;
  c.save();
  const g = c.createLinearGradient(0, 0, B.w, B.h);
  g.addColorStop(0, P.bg);
  g.addColorStop(1, P.bg2);
  c.fillStyle = g;
  c.fillRect(0, 0, B.w, B.h);
  // the map: a soft disc, the figure's lines, the stars by brightness, the chosen one in an ember ring
  const { x: mx, y: my, r } = B.map;
  c.save();
  c.translate(mx, my);
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fillStyle = 'rgba(110,195,255,0.05)';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = P.line;
  c.stroke();
  c.clip();
  c.strokeStyle = 'rgba(110,195,255,0.35)';
  c.lineWidth = 2;
  for (const path of card.map.lines || []) {
    c.beginPath();
    path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  for (const st of card.map.stars || []) {
    const rad = Math.max(1.4, 5.2 - 0.75 * Math.max(-1, Math.min(6, st.mag)));
    c.beginPath();
    c.arc(st.x, st.y, rad, 0, Math.PI * 2);
    c.fillStyle = st.self ? P.ember : P.tx;
    c.globalAlpha = st.self ? 1 : 0.85;
    c.fill();
    c.globalAlpha = 1;
    if (st.self) {
      c.beginPath();
      c.arc(st.x, st.y, rad + 16, 0, Math.PI * 2);
      c.strokeStyle = P.ember;
      c.lineWidth = 3;
      c.stroke();
    }
  }
  c.restore();
  // the words
  let y = B.text.y;
  const x = B.text.x;
  const w = B.text.w;
  const line = (text, size, font, colour, gap = 1.25, spacing = 0) => {
    c.font = `${font}`.replace('{px}', `${Math.round(size * s)}px`);
    c.fillStyle = colour;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    if ('letterSpacing' in c) c.letterSpacing = `${spacing}px`;
    for (const ln of wrapLines(c, text, w)) {
      c.fillText(ln, x, y);
      y += Math.round(size * s * gap);
    }
    if ('letterSpacing' in c) c.letterSpacing = '0px';
  };
  line(card.eyebrow, 22, `600 {px} ${fonts.cap}`, P.dim, 1.6, 3);
  y += 4;
  line(card.name, format === 'landscape' ? 64 : 76, `600 {px} ${fonts.cap}`, P.tx, 1.05);
  y += 6;
  line(card.place, 26, `400 {px} ${fonts.sans}`, P.atm, 1.4);
  y += 14;
  for (const l of card.lines) { line(l, 24, `400 {px} ${fonts.sans}`, P.tx, 1.4); y += 8; }
  if (card.sky && card.sky.length) {
    y += 10;
    for (const l of card.sky) { line(l, 21, `400 {px} ${fonts.sans}`, P.dim, 1.4); y += 4; }
  }
  // the foot: the name of the site, in the ember, and the link
  c.font = `600 ${Math.round(24 * s)}px ${fonts.cap}`;
  c.fillStyle = P.ember;
  c.textBaseline = 'alphabetic';
  if ('letterSpacing' in c) c.letterSpacing = '2px';
  c.fillText(card.footer, x, B.h - B.pad);
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  c.restore();
  return B;
}

// ------------------------------------------------------------------------------------------- the panel

function el(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}
// Lucide's star, copy and download (lucide-static 0.544.0, as ui/searchrows.js and ui/sharesheet.js draw them).
const SHAPES = {
  star: [['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }]],
  copy: [['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }], ['path', { d: 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z' }]],
  download: [['path', { d: 'M12 15V3' }], ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['path', { d: 'm7 10 5 5 5-5' }]],
};
const glyph = (name) => (SHAPES[name] ? iconFrom(name, SHAPES[name]) : icon(name));
function button(className, text, title, iconName) {
  const b = el('button', className);
  b.type = 'button';
  if (iconName) b.appendChild(glyph(iconName));
  if (text) b.appendChild(el('span', null, text));
  if (title) b.title = title;
  return b;
}
// The site writes dates day first in English too ("13 November 2026"): en is en-GB here.
const lang = () => { const l = (typeof document !== 'undefined' && document.documentElement.lang) || 'en'; return l === 'en' ? 'en-GB' : l; };
const monthYear = (ms) => { try { return new Intl.DateTimeFormat(lang(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(ms)); } catch { return new Date(ms).toISOString().slice(0, 7); } };
const dayText = (b) => { try { return new Intl.DateTimeFormat(lang(), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(bornMs(b))); } catch { return bornValue(b); } };
const lyText = (v) => (v >= 100 ? fmt.int(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1));

export function starLink(ctx, value, ask = false) {
  ctx.yourStar = ctx.yourStar || createYourStar(ctx);
  const ys = ctx.yourStar;
  if (ask) ys.open();
  else if (value && !(ys.isOpen() && ys.state() && ys.state().born === String(value))) ys.open(String(value), { fromLink: true });
  return ys;
}

export function createYourStar(ctx) {
  const C = COPY.yourStar;
  const st = { born: null, place: null, result: null, format: 'landscape', open: false, opener: null, canvas: null, names: null, lines: null };

  const root = el('section', 'ui-pop sr-yourstar sr-float');
  root.id = 'sr-yourstar';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-labelledby', 'sr-yourstar-title');
  root.hidden = true;
  root.tabIndex = -1;
  const head = el('div', 'ui-pop__head');
  const title = el('h2', 'ui-pop__title', C.title);
  title.id = 'sr-yourstar-title';
  const closeBtn = button('ui-close', '', C.close, 'x');
  closeBtn.setAttribute('aria-label', C.close);
  head.append(title, closeBtn);
  const bodyEl = el('div', 'ui-pop__body sr-yourstar__body');
  const lede = el('p', 'sr-yourstar__lede', C.lede);
  const form = el('form', 'sr-yourstar__form');
  form.noValidate = true;
  const dateLabel = el('label', 'sr-yourstar__field');
  dateLabel.appendChild(el('span', 'sr-micro', C.dateLabel));
  const dateWrap = el('span', 'ui-field');
  const dateIn = el('input', 'ui-field__in');
  dateIn.type = 'date';
  dateIn.min = `${MIN_YEAR}-01-01`;
  dateIn.max = new Date().toISOString().slice(0, 10);
  dateIn.required = true;
  dateWrap.appendChild(dateIn);
  dateLabel.appendChild(dateWrap);
  const placeLabel = el('label', 'sr-yourstar__field');
  placeLabel.appendChild(el('span', 'sr-micro', C.placeLabel));
  const placeWrap = el('span', 'ui-field');
  const placeIn = el('input', 'ui-field__in');
  placeIn.type = 'text';
  placeIn.autocomplete = 'off';
  placeIn.placeholder = C.placeHint;
  placeIn.setAttribute('list', 'sr-yourstar-cities');
  const cities = el('datalist');
  cities.id = 'sr-yourstar-cities';
  for (const city of CITIES) { const o = document.createElement('option'); o.value = city.name; cities.appendChild(o); }
  placeWrap.append(placeIn, cities);
  placeLabel.appendChild(placeWrap);
  const goBtn = button('ui-btn ui-btn--primary ui-btn--block', C.go, '', 'star');
  goBtn.type = 'submit';
  form.append(dateLabel, placeLabel, goBtn);
  const status = el('p', 'sr-yourstar__status');
  status.setAttribute('aria-live', 'polite');
  const result = el('div', 'sr-yourstar__result');
  result.hidden = true;
  const pic = el('figure', 'sr-yourstar__pic');
  const img = el('img', 'sr-yourstar__img');
  img.decoding = 'async';
  pic.appendChild(img);
  const facts = el('div', 'sr-yourstar__facts');
  const fmtLabel = el('p', 'sr-micro', C.formatLabel);
  fmtLabel.id = 'sr-yourstar-fmt';
  const fmtSeg = el('div', 'ui-seg ui-seg--block');
  fmtSeg.setAttribute('role', 'radiogroup');
  fmtSeg.setAttribute('aria-labelledby', fmtLabel.id);
  const fmtBtns = new Map();
  for (const id of Object.keys(CARD_FORMATS)) {
    const b = el('button', 'ui-seg__btn', C.formats[id]);
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.dataset.format = id;
    fmtSeg.appendChild(b);
    fmtBtns.set(id, b);
  }
  const acts = el('div', 'sr-yourstar__acts');
  const shareBtn = button('ui-btn', C.share, C.shareTitle, 'share');
  const saveBtn = button('ui-btn', C.download, C.downloadTitle, 'download');
  const linkBtn = button('ui-btn', C.copyLink, C.copyLinkTitle, 'copy');
  const flyBtn = button('ui-btn ui-btn--secondary', C.fly, C.flyTitle, 'star');
  const skyBtn = button('ui-btn ui-btn--secondary', C.sky, C.skyTitle, 'moon');
  acts.append(shareBtn, saveBtn, linkBtn, flyBtn, skyBtn);
  const privacy = el('p', 'sr-yourstar__note', C.privacy);
  result.append(pic, facts, fmtLabel, fmtSeg, acts);
  bodyEl.append(lede, form, status, result, privacy);
  root.append(head, bodyEl);
  document.body.appendChild(root);

  const starsReady = () => {
    const have = () => (ctx.recordsFor ? ctx.recordsFor('stars') : []);
    if (have().length) return Promise.resolve(have());
    const load = ctx.loadAfterFirstVisit ? ctx.loadAfterFirstVisit() : Promise.resolve();
    return Promise.resolve(load).then(() => have(), () => have());
  };
  const dataUrl = (name) => new URL(`../../data/${name}`, import.meta.url).href;
  const figures = () => {
    if (!st.figures) {
      st.figures = Promise.all([fetch(dataUrl('constellation-names.json')).then((r) => r.json()), fetch(dataUrl('constellations.lines.json')).then((r) => r.json())])
        .then(([names, lines]) => ({ names: new Map(names.map((n) => [n.id, n.name])), lines: new Map((lines.features || []).map((f) => [f.id, f.geometry && f.geometry.coordinates])) }))
        .catch(() => ({ names: new Map(), lines: new Map() }));
    }
    return st.figures;
  };

  function wordsFor(res) {
    const r = res.record;
    const name = nameOf(r);
    const conName = res.con ? (st.fig.names.get(res.con) || res.con) : '';
    const ly = Number(r.meta.distLy);
    const band = res.band;
    const err = band ? Math.max(ly - band.low, Number.isFinite(band.high) ? band.high - ly : ly) : null;
    const lines = [];
    if (res.kind === 'onway') {
      lines.push(t(C.onItsWay, { name, when: monthYear(bornMs(st.born) + ly * JULIAN_YEAR_MS), ly: lyText(ly) }));
    } else {
      // Said as "when you were born" only where the star's own error band holds the age; else, plainly, the nearest there is.
      const held = band && band.low <= res.age && band.high >= res.age;
      lines.push(t(!st.born.m ? C.leftYear : held ? C.left : C.leftNear, { when: monthYear(departureMs(ly, res.nowMs)), year: String(st.born.y) }));
      if (err !== null && Number.isFinite(err)) {
        const from = monthYear(departureMs(Number.isFinite(band.high) ? band.high : ly * 2, res.nowMs));
        const to = monthYear(departureMs(band.low, res.nowMs));
        lines.push(t(C.band, { err: lyText(err), from, to }));
      }
    }
    const sky = [];
    if (res.sky) {
      sky.push(t(C.moon, { phase: COPY.tonight.best.phases[res.sky.moon.phase], pct: res.sky.moon.percent }));
      const list = res.sky.planets.map((p) => COPY.sky.bodies[p]).join(', ');
      if (!res.sky.planets.length) sky.push(C.planetsNone);
      else sky.push(t(res.sky.from === 'place' ? C.planetsPlace : C.planetsClock, { list, place: st.place ? st.place.name : '' }));
    }
    return {
      eyebrow: (res.kind === 'onway' ? C.eyebrowOnWay : C.eyebrow).toLocaleUpperCase(lang()),
      name,
      place: conName ? t(C.where, { constellation: conName, ly: lyText(ly) }) : t(C.distance, { ly: lyText(ly) }),
      lines,
      sky: sky.length ? [t(C.skyOn, { date: st.born.m ? dayText(st.born) : String(st.born.y) }), ...sky] : [],
      errFrom: band ? C.errFrom[band.from] : '',
      footer: C.footer,
    };
  }

  function mapFor(res, r) {
    const centre = res.dir;
    if (!centre) return { stars: [], lines: [] };
    const dirs = [];
    for (const s of res.stars) {
      const d = eqDirOf(s);
      if (d && magOf(s) <= 5.5) dirs.push([d, magOf(s), s === res.record]);
    }
    if (!dirs.some((d) => d[2])) dirs.push([centre, magOf(res.record), true]);
    const stars = projectSky(centre, dirs, r);
    const lines = [];
    const coords = res.con ? st.fig.lines.get(res.con) : null;
    for (const path of coords || []) {
      const pts = projectSky(centre, path.map(([ra, dec]) => [raDecDir(ra < 0 ? ra + 360 : ra, dec), 9, false]), r, SKY_FIELD_DEG);
      if (pts.length === path.length) lines.push(pts.map((p) => [p.x, p.y]));
    }
    return { stars, lines };
  }

  async function paintCard() {
    if (!st.result) return;
    const f = CARD_FORMATS[st.format];
    const canvas = st.canvas || (st.canvas = document.createElement('canvas'));
    canvas.width = f.w;
    canvas.height = f.h;
    const c = canvas.getContext('2d');
    if (!c) return;
    try { await Promise.all([document.fonts.load('600 64px "Barlow Semi Condensed"'), document.fonts.load('400 24px Inter')]); } catch { /* the fallbacks draw it */ }
    const cs = getComputedStyle(document.documentElement);
    const fonts = { cap: (cs.getPropertyValue('--cap') || 'sans-serif').trim(), sans: (cs.getPropertyValue('--sans') || 'sans-serif').trim() };
    const words = wordsFor(st.result);
    const B = cardBlocks(st.format);
    drawCard(c, { ...words, map: mapFor(st.result, B.map.r) }, st.format, palette(document), fonts);
    img.src = canvas.toDataURL('image/png');
    img.alt = t(C.cardAlt, { name: words.name });
    pic.classList.toggle('is-tall', st.format !== 'landscape');
    for (const [id, b] of fmtBtns) b.setAttribute('aria-checked', id === st.format ? 'true' : 'false');
    facts.replaceChildren(
      el('p', 'sr-yourstar__name', words.name),
      el('p', 'sr-yourstar__where', words.place),
      ...words.lines.map((l) => el('p', 'sr-yourstar__line', l)),
      ...(words.errFrom ? [el('p', 'sr-yourstar__note', words.errFrom)] : []),
      ...words.sky.map((l, i) => el('p', i ? 'sr-yourstar__sky' : 'sr-micro', l)),
    );
  }

  async function compute() {
    const b = st.born;
    if (!b) return;
    status.textContent = C.finding;
    const [stars, fig] = await Promise.all([starsReady(), figures()]);
    st.fig = fig;
    const nowMs = ctx.clock && typeof ctx.clock.liveNow === 'function' ? ctx.clock.liveNow() : Date.now();
    const age = ageYears(b, nowMs);
    if (age < 0) { status.textContent = C.future; result.hidden = true; return; }
    let record = pickStar(stars, age);
    let kind = 'year';
    if (!record) { record = nearestStar(stars); kind = 'onway'; }
    if (!record) { status.textContent = C.noStars; result.hidden = true; return; }
    const dir = eqDirOf(record);
    st.result = { record, kind, nowMs, age, dir, con: dir ? constellationAt(dir) : null, band: distanceBand(record), sky: skyOn(b, st.place), stars };
    status.textContent = '';
    result.hidden = false;
    await paintCard();
  }

  function submit() {
    const b = parseBorn(dateIn.value);
    if (!b) { status.textContent = dateIn.value ? C.badDate : C.needDate; dateIn.focus(); return; }
    const typed = placeIn.value.trim();
    const city = typed ? findCity(typed) : null;
    st.place = city ? { name: city.name, latDeg: city.latDeg, lonDeg: city.lonDeg } : null;
    st.born = b;
    writeUrl({ born: bornValue(b) });
    compute().then(() => { if (typed && !city) status.textContent = C.placeUnknown; });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  closeBtn.addEventListener('click', () => close());
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
  for (const [id, b] of fmtBtns) b.addEventListener('click', () => { st.format = id; paintCard(); });

  const blob = () => new Promise((res) => (st.canvas ? st.canvas.toBlob((x) => res(x), 'image/png') : res(null)));
  const fileName = () => `space-radar-star-${bornValue(st.born)}.png`;
  const told = (method) => sr('track', 'share', { method, content_type: 'birthday_card' });
  shareBtn.addEventListener('click', async () => {
    const png = await blob();
    const link = bornLink(st.born, appBase());
    const words = st.result ? wordsFor(st.result) : null;
    const text = words ? `${words.name}: ${words.lines[0]}` : '';
    try {
      const file = png ? new File([png], fileName(), { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: C.title, text: [text, link].join(' ') });
      else if (navigator.share) await navigator.share({ title: C.title, text, url: link });
      else { await navigator.clipboard.writeText(link); toast(C.copied); }
      told('native');
    } catch (e) { if (!(e && e.name === 'AbortError')) toast(C.shareFailed, 4000); }
  });
  saveBtn.addEventListener('click', async () => {
    const png = await blob();
    if (!png) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = fileName();
    a.setAttribute('aria-label', C.download);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    told('png');
  });
  linkBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(bornLink(st.born, appBase())); toast(C.copied); told('copy_link'); } catch { toast(C.copyRefused, 4000); }
  });
  const layerOn = (id) => {
    if (ctx.isLayerOn && !ctx.isLayerOn(id) && ctx.setLayerOn) {
      ctx.setLayerOn(id, true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on: true, handled: true, from: 'yourstar' } }));
    }
  };
  flyBtn.addEventListener('click', () => {
    if (!st.result || typeof ctx.select !== 'function') return;
    layerOn('stars');
    close({ keepLink: true });
    ctx.select(st.result.record, { fly: true });
  });
  skyBtn.addEventListener('click', () => {
    if (!st.result) return;
    const sky = st.result.sky;
    if (st.place && typeof ctx.setObserver === 'function') ctx.setObserver({ ...st.place, altKm: 0, source: 'city' });
    close({ keepLink: true });
    if (typeof ctx.setMoment === 'function') ctx.setMoment('now');
    try { if (ctx.clock) ctx.clock.goTo(sky ? sky.ms : bornMs(st.born)); } catch { /* the sky stays at now */ }
    if (ctx.timePill && typeof ctx.timePill.paint === 'function') ctx.timePill.paint();
    layerOn('stars');
    if (typeof ctx.select === 'function') ctx.select(st.result.record, { fly: false });
  });

  function open(value, opts = {}) {
    loadCss('yourstar').then(() => {
      st.opener = opts.fromLink ? null : (document.activeElement && document.activeElement.focus ? document.activeElement : null);
      root.hidden = false;
      st.open = true;
      document.documentElement.classList.add('sr-yourstar-open');
      const b = parseBorn(value);
      if (b) {
        st.born = b;
        dateIn.value = b.m ? bornValue(b) : `${b.y}-07-02`;
        compute();
      } else if (!st.born) { result.hidden = true; status.textContent = ''; }
      (b ? title : dateIn).focus({ preventScroll: true });
    });
  }

  function close(opts = {}) {
    if (root.hidden) return;
    root.hidden = true;
    st.open = false;
    document.documentElement.classList.remove('sr-yourstar-open');
    if (!opts.keepLink) writeUrl({ born: null });
    if (st.opener && st.opener.isConnected) st.opener.focus({ preventScroll: true });
  }

  const api = { open, close, isOpen: () => !root.hidden, state: () => (st.result ? { born: bornValue(st.born), star: st.result.record.id, kind: st.result.kind, con: st.result.con, format: st.format } : null), root };
  return api;
}
