// ui/startwin.js -- a drawn star system's host star and the same star in the star catalogue (2.0.0 final look, finding 14).
//
// Contract, pure (tests/test_startwin.mjs):
//   starTwin(record, stars) -> the stars layer's record for the same star as a systems host record, or null
//   adoptTwin(record, twin) -> record, its meta given the catalogue's distance, magnitude, class and story (once)
//   TWIN_DEG                   how far apart on the sky the two may be and still be one star
//
// WHY. A system's host star is its own record (data/layers.js systemHostRecords, `star-<id>`, layer `systems`), built
// from the NASA Exoplanet Archive's row so it sits exactly on its planets' glyphs. The same star picked on the stars
// rung is HYG's record (scene/stars3d.js, `hip-<n>`). So Barnard's Star reached by flying to its system said 5.96 ly
// (the archive's 1.82655 pc) and magnitude "-" (the archive row has none), where the stars rung said 5.95 ly and 9.54;
// and its place is the archive's, at Gaia's epoch, 165" from HYG's J2000 place for a star this fast, so
// scene/stardeep.js's 0.02-degree match found no motion record for it and drew no AD 12 000 distance line.
// The card (ui/cards.js) and the line (scene/stardeep.js) now ask for the catalogue's twin: the card shows the
// catalogue's facts on the host's record, and the line measures the twin.
//
// ONE STAR, NOT TWO NEAR EACH OTHER: a name in common (the record's name or an alias, letters and digits only, any
// case) AND within TWIN_DEG on the sky. The host record keeps its id, its place and the archive's radius, mass and
// temperature, which the catalogue does not have; its `cite` names both sources.

export const TWIN_DEG = 0.5;
const TWIN_COS = Math.cos(TWIN_DEG * Math.PI / 180);
// What the stars rung's card shows that the archive's row does not, or says differently.
const FIELDS = ['distLy', 'mag', 'spect', 'hip', 'why', 'whySource'];

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const namesOf = (r) => [r.name, ...((r.meta && Array.isArray(r.meta.aliases)) ? r.meta.aliases : [])].map(norm).filter(Boolean);

/** The stars layer's record for a systems host star: a name in common and within TWIN_DEG. Null for anything else. Pure. */
export function starTwin(record, stars) {
  if (!record || record.layer !== 'systems' || record.klass !== 'star' || !record.pos || !Array.isArray(stars)) return null;
  const names = new Set(namesOf(record));
  const p = record.pos;
  const lp = Math.hypot(p.x, p.y, p.z) || 1;
  for (const s of stars) {
    if (!s || s.klass !== 'star' || s.layer === 'systems' || !s.pos) continue;
    if (!namesOf(s).some((n) => names.has(n))) continue;
    const q = s.pos;
    const lq = Math.hypot(q.x, q.y, q.z) || 1;
    if ((p.x * q.x + p.y * q.y + p.z * q.z) / (lp * lq) >= TWIN_COS) return s;
  }
  return null;
}

/** The host record with the catalogue's facts in its meta, written once (meta.twin says from which record). Pure but for that. */
export function adoptTwin(record, twin) {
  if (!record || !twin || !twin.meta) return record;
  const md = record.meta || (record.meta = {});
  if (md.twin === twin.id) return record;
  for (const k of FIELDS) if (twin.meta[k] !== undefined && twin.meta[k] !== null) md[k] = twin.meta[k];
  md.twin = twin.id;
  if (twin.meta.cite) md.cite = md.cite ? `${twin.meta.cite}; ${md.cite}` : twin.meta.cite;
  return record;
}
