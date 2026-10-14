// data/catnum.js -- what a NORAD catalogue number is, in one place.
//
// Contract, all pure:
//   catalogNumber(value) -> integer 1..999 999 999, or null     a number, digits, or an Alpha-5 field
//   alpha5(n)            -> the five-character TLE field ('25544', 'A0690'), or null above 339 999
//   tleCatalogNumber(line1) -> the number in columns 3-7 of a TLE's first line, Alpha-5 read, or null
//   catalogRange(n)      -> 'catalogued' | 'reserved' | 'analyst' | 'launch-nominal' | null
//   isCatalogued(n)      -> true when n names one object of the public catalogue for good
//   satId(n)             -> the record id the app keys a catalogued object by: `sat-<n>`
//   satIdOf(text)        -> that id from what a link says: '100690', 'A0690', 'sat-100690'; else null
//
// WHY THIS EXISTS (2026-10-14). data/parsers.js read every number of 90 000 and up as a placeholder.
// It was written when the only numbers that high were the supplemental files' stand-ins. Then the
// five-digit catalogue ran out: CelesTrak, "We ran out of 5-digit catalog numbers on 2026-07-11"
// (celestrak.org/NORAD/documentation/gp-data-formats.php), and every object catalogued since has a
// number of 100 000 and up. On the live copy of 2026-10-12 that was 772 real objects, Sentinel-3C
// (100690) among them, drawn dimmer, classed `inferred` whatever their age, and carded "not yet in
// the public catalogue" -- which their own satcat rows contradict.
//
// THE RANGES, and where each comes from:
//   1 - 69 999            catalogued. The five-digit series ends at 69 999, not 99 999: CelesTrak,
//                         "When we run out of 5-digit catalog numbers at 69999, new data will not be
//                         able to be created using the TLE format." The live satcat goes 69 999 -> 100 000.
//   70 000 - 99 999       never a public number. 80 000-89 999 is Space-Track's analyst range, "used
//                         like an analytical sandbox", whose numbers "can be constantly reused for
//                         different objects" (space-track.org/documentation). The rest of the block is
//                         not in the satcat (MEASURED: no object between 69 999 and 100 000 on 2026-10-12)
//                         and is described as reserved by secondary sources only.
//   100 000 - 269 999     catalogued (Alpha-5 A0000 to S9999 in a TLE; the full integer in OMM).
//   270 000 - 339 999     Space Fence analyst objects (Alpha-5 T0000 up): CelesTrak "already provides GP
//                         data for USSF Space Fence analyst objects that use 6-digit catalog numbers",
//                         the "27xxxx catalog numbers". The 339 999 end is Alpha-5's own (Z9999).
//   340 000 - 798 999 999 catalogued: OMM carries nine digits, "object numbers up to 999,999,999".
//   799 000 000 - 799 999 999  18 SDS launch nominals ("799xxxxxx") and its new analyst range
//                         ("7995xxxxx"), CelesTrak again: a stand-in for an object not yet catalogued.
//   800 000 000 - 999 999 999  catalogued: nothing documents these, and a number is real until a source
//                         says otherwise.
// Anything else (0, negative, fractional, ten digits, text) is not a catalogue number at all: null.

/** Alpha-5's first character: A = 10 ... Z = 33, without I and O (space-track.org/documentation). */
const ALPHA5 = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX = 999999999;

/** An integer catalogue number from an OMM value, digits, or an Alpha-5 field; null for anything else. */
export function catalogNumber(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 1 && value <= MAX ? value : null;
  if (typeof value !== 'string') return null;
  const s = value.trim().toUpperCase();
  if (/^\d{1,9}$/.test(s)) return catalogNumber(Number(s));
  const m = /^([A-HJ-NP-Z])(\d{4})$/.exec(s);
  return m ? (ALPHA5.indexOf(m[1]) + 10) * 10000 + Number(m[2]) : null;
}

/** The five-character TLE field for n: zero-padded below 100 000, Alpha-5 to 339 999, null beyond. */
export function alpha5(n) {
  if (!Number.isInteger(n) || n < 0 || n > 339999) return null;
  if (n < 100000) return String(n).padStart(5, '0');
  return ALPHA5[Math.floor(n / 10000) - 10] + String(n % 10000).padStart(4, '0');
}

/** The catalogue number of a TLE's first line (columns 3-7), Alpha-5 included; null if it has none. */
export function tleCatalogNumber(line1) {
  const s = typeof line1 === 'string' ? line1 : '';
  return s.startsWith('1 ') ? catalogNumber(s.slice(2, 7)) : null;
}

/** Which block n falls in (the table above); null when it is not a catalogue number at all. */
export function catalogRange(n) {
  const v = catalogNumber(n);
  if (v === null) return null;
  if (v >= 80000 && v <= 89999) return 'analyst';
  if (v >= 70000 && v <= 99999) return 'reserved';
  if (v >= 270000 && v <= 339999) return 'analyst';
  if (v >= 799000000 && v <= 799999999) return 'launch-nominal';
  return 'catalogued';
}

/** True when n names one object of the public catalogue for good, so it may key a record and a link. */
export function isCatalogued(n) {
  return catalogRange(n) === 'catalogued';
}

/** `sat-<n>` for a catalogued number, else null: the id a record, a card and a `#at=` link share. */
export function satId(n) {
  return isCatalogued(n) ? `sat-${catalogNumber(n)}` : null;
}

/** The `sat-<n>` a link's value names by number ('100690', 'A0690', 'sat-100690'), or null. */
export function satIdOf(text) {
  const m = /^(?:sat-)?(\w+)$/i.exec(String(text == null ? '' : text).trim());
  return m ? satId(catalogNumber(m[1])) : null;
}
