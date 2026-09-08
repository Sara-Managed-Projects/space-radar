// scene/pickrank.js -- who a tap meant, decided once for every layer (spec 0028 req 4).
//
// Two kinds of candidate reach this file, both already inside the 24 px forgiveness:
//
//   glyph  {record, px, score}   a point mark; px is the screen distance to it, score is px with
//                                the debris penalty applied (glyphs.js), so a satellite beats a
//                                speck at the same distance;
//   disc   {record, edge, r}     a world drawn as a disc; edge is the distance to its RIM (zero
//                                when the finger is on it), r its radius in px.
//
// THE RULE: the smaller thing wins. A glyph has no radius, so any glyph within reach beats any
// disc -- a satellite drawn over Earth is what the finger means. Among glyphs the lowest score
// wins; among discs the smaller radius, then the nearer rim. The layer draw order used to decide
// between glyphs; it no longer does, because "the station layer is drawn first" is a fact about
// painting and not about what a finger is pointing at.
//
// Pure and DOM-free, so the ranking can be held by a test with made-up pixels.

/** @returns {Object|null} the winning record */
export function rankPick(glyphs, discs) {
  const list = rankAll(glyphs, discs);
  return list.length ? list[0].record : null;
}

/**
 * Every candidate, best first: what a long press lists so a crowded spot can be chosen from.
 * Glyphs first by score, then discs by radius then rim distance. Duplicate records collapse.
 */
export function rankAll(glyphs, discs, limit = 6) {
  const out = [];
  const seen = new Set();
  const push = (record, kind, key) => {
    if (!record || seen.has(record.id)) return;
    seen.add(record.id);
    out.push({ record, kind, key });
  };
  const g = (Array.isArray(glyphs) ? glyphs : []).filter((c) => c && c.record && Number.isFinite(c.score))
    .slice().sort((a, b) => a.score - b.score);
  for (const c of g) push(c.record, 'glyph', c.score);
  const d = (Array.isArray(discs) ? discs : []).filter((c) => c && c.record && Number.isFinite(c.r))
    .slice().sort((a, b) => (a.r - b.r) || (a.edge - b.edge));
  for (const c of d) push(c.record, 'disc', c.r);
  return out.slice(0, Math.max(1, limit));
}
