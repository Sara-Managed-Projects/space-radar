// ui/truthline.js -- the one line of truth a trip opens on (internal #307).
//
// Contract: truthLine(tour, epochMs) -> string;  LAYER_SOURCES, the table it reads.  Pure, no imports.
//
// A planetarium film opens on a card that says the universe is shown as it was measured, and that
// claim is the hook. Ours can say more: WHICH instant the positions are computed for, and from
// what. Three places print this one sentence, so it lives in one place:
//   - a trip's video: the title card and the end card's credits (ui/rendermode.js, spec 0070);
//   - the live trip's intro sheet, under its blurb (ui/tripframe.js);
//   - the trip's share page, site/t/<id>.html (scripts/gen_trip_pages.py keeps the same table in
//     Python, and tests/test_small_issues.mjs holds the page's sentence to this function's).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** What a layer's positions are computed from, in the words CREDITS.md section 4 uses. */
export const LAYER_SOURCES = {
  stations: 'CelesTrak orbital elements',
  active: 'CelesTrak orbital elements',
  visual: 'CelesTrak orbital elements',
  starlink: 'CelesTrak orbital elements',
  stars: 'the HYG star database',
  exoplanets: 'the NASA Exoplanet Archive',
  'deep-sky': 'OpenNGC',
};

/**
 * The instant the positions are computed for, and what from. A trip that moves the clock itself
 * (anything but `as-found`), or a caller with no instant to name (the share page, a trip whose
 * stops set their own instants), gets the sources only.
 */
export function truthLine(tour, epochMs) {
  const from = [];
  for (const id of (tour && tour.requires) || []) {
    const s = LAYER_SOURCES[id];
    if (s && !from.includes(s)) from.push(s);
  }
  const stage = tour && tour.stage;
  if (stage && stage !== 'earth' && stage !== 'moon' && stage !== 'sun' && !from.length) from.push('published star and galaxy catalogues');
  else from.push('the planets’ own orbits (astronomy-engine)');
  const sources = from.length > 1 ? `${from.slice(0, -1).join(', ')} and ${from[from.length - 1]}` : from[0];
  if (!tour || tour.clock !== 'as-found' || !Number.isFinite(epochMs)) return `Everything is drawn where it really is, from ${sources}.`;
  const d = new Date(epochMs);
  const two = (n) => String(n).padStart(2, '0');
  const when = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`;
  return `Positions computed for ${when} from ${sources}.`;
}
