// scene/pickrank.js -- who a tap meant, decided once for every layer (spec 0028 req 4).
//
// Two kinds of candidate reach this file, both already inside the pointer's reach:
//
//   mark   {record, px, score, tier, sx, sy, depth}   a point; px is the screen distance to it, score is px with
//                                the debris penalty applied (glyphs.js), sx/sy where it is drawn (CSS px
//                                from the canvas corner) and depth how far from the camera along the view;
//   disc   {record, edge, r, cx, cy, depth, tier}   a world drawn as a disc; edge is the distance to its
//                                RIM (zero when the pointer is on it), r its radius in px.
//
// THE RULES, in the order they act:
//   1. Hidden is not a candidate. A mark behind a disc and inside its outline is covered; a mark of the
//      backdrop is covered by any disc, whatever the numbers say.
//   2. A tier first. "local" is what belongs to the stage being looked at; "backdrop" is what is only
//      behind it (stars and galaxies seen from a world). Any local candidate beats any backdrop one.
//   3. In a tier, a mark within reach beats a disc (a satellite drawn over Earth is what the pointer
//      means); among marks the nearer wins; among discs the nearer to the camera wins, and one that is
//      only near the pointer must be in FRONT of the disc the pointer is on.
//   4. Two marks of the best tier less than AMBIGUITY_PX apart, and about as near the pointer as each other, are
//      not guessed between: `ambiguous`. One the pointer is plainly on is taken.
//
// Reach is the pointer's: a finger is wide, a mouse is not. Pure and DOM-free, so the whole decision can
// be held by a test with made-up pixels.

/** How far from the pointer a candidate may be, CSS px, by what is pointing. */
// onDisc: the reach of a mark drawn over a world's disc when the pointer is on that disc. A home view of
// the Earth carries thousands of satellite dots, so with the full reach nearly every click on the Earth
// opened a satellite nobody had aimed at (seen on the live site, 2026-11-02, after 1.5.2). On a disc a dot
// wins only when the pointer is on the dot itself.
export const REACH = {
  mouse: { local: 10, backdrop: 5, onDisc: 4 },
  touch: { local: 24, backdrop: 12, onDisc: 10 },
};
/** This many marks within reach of a pointer on a disc are a crowd, and the disc wins. */
export const CROWD_ON_DISC = 3;
/** Two best marks of one tier closer than this to each other are shown as a list. */
export const AMBIGUITY_PX = 3;
/** ... unless the pointer is this much nearer to the first of them than to the second. */
const AIM_PX = 1.5;
/** A planet's mark is drawn ON its star; a pointer on that spot means the star, so the mark counts this much farther. */
const EXOPLANET_MARK_PX = 2;
const scoreOf = (m) => m.score + (m.record && m.record.klass === 'exoplanet' ? EXOPLANET_MARK_PX : 0);
/** A press this long, touch only, is a long press. A mouse click is a click however long it was held. */
export const LONG_PRESS_MS = 450;
/** How far a pointer may travel and still be a tap. */
export const TAP_SLOP_PX = { mouse: 5, touch: 10 };

/** The reach for a PointerEvent.pointerType. A pen is as exact as a mouse; anything unknown is a finger. */
export function reachFor(pointerType) {
  return pointerType === 'mouse' || pointerType === 'pen' ? REACH.mouse : REACH.touch;
}

const depthOf = (d) => (Number.isFinite(d.depth) ? d.depth : 1e6 + (Number.isFinite(d.r) ? d.r : 0)); // no depth: the smaller disc is nearer

/**
 * The decision: the winner, the list a chooser can show, and whether it was too close to call.
 * @param {Array} marks
 * @param {Array} discs  every disc near the pointer, also those too far to be a candidate: they still hide marks
 * @param {{local:number, backdrop:number}} [reach]
 * @returns {{winner: Object|null, list: Array<{record, kind, tier}>, ambiguous: boolean}}
 */
export function decide(marks, discs, reach = REACH.touch) {
  const ds = (Array.isArray(discs) ? discs : []).filter((c) => c && c.record && Number.isFinite(c.r));
  const ms = (Array.isArray(marks) ? marks : []).filter((c) => c && c.record && Number.isFinite(c.score));

  const covered = (m) => {
    if (!Number.isFinite(m.sx) || !Number.isFinite(m.sy)) return false;
    for (const d of ds) {
      if (!Number.isFinite(d.cx) || !Number.isFinite(d.cy)) continue;
      if (Math.hypot(m.sx - d.cx, m.sy - d.cy) >= d.r) continue;
      if (m.tier === 'backdrop') return true;
      if (Number.isFinite(m.depth) && Number.isFinite(d.depth) && m.depth > d.depth) return true;
    }
    return false;
  };

  // Discs: the one the pointer is on and nearest the camera, then what is in front of it.
  const inReach = ds.filter((d) => d.edge <= reach.local);
  const inside = inReach.filter((d) => d.edge <= 0).sort((a, b) => depthOf(a) - depthOf(b));
  const front = inside.length ? inReach.filter((d) => d.edge > 0 && depthOf(d) < depthOf(inside[0])) : inReach.filter((d) => d.edge > 0);
  front.sort((a, b) => (a.edge - b.edge) || (depthOf(a) - depthOf(b)));
  const onDisc = inside.length > 0;
  const reachOf = (tier) => (tier === 'backdrop' ? reach.backdrop : (onDisc ? Math.min(reach.local, reach.onDisc ?? reach.local) : reach.local));
  const near = ms.filter((m) => m.px <= reachOf(m.tier) && !covered(m));
  // A CROWD OVER A DISC is the disc: at the home view thousands of satellite dots lie on the Earth, and even
  // 4 px found one under nearly every click (live site, 2026-11-02, 1.5.3). Where CROWD_ON_DISC or more marks
  // sit within the full reach of a pointer on a disc, the disc is what was meant; a lone dot is still taken.
  const crowd = onDisc && ms.filter((m) => m.tier !== 'backdrop' && m.px <= reach.local && !covered(m)).length >= CROWD_ON_DISC;
  const localMarks = crowd ? [] : near.filter((m) => m.tier !== 'backdrop').sort((a, b) => scoreOf(a) - scoreOf(b));
  const backMarks = near.filter((m) => m.tier === 'backdrop').sort((a, b) => scoreOf(a) - scoreOf(b));
  const discList = front.concat(inside);

  const out = [];
  const seen = new Set();
  const push = (record, kind, tier, px) => {
    if (!record || seen.has(record.id)) return;
    seen.add(record.id);
    out.push({ record, kind, tier, px });
  };
  for (const m of localMarks) push(m.record, 'glyph', 'local', m.px);
  for (const d of discList) push(d.record, 'disc', 'local');
  for (const m of backMarks) push(m.record, 'glyph', 'backdrop', m.px);

  // Too close to call: the two best marks of the first tier are within a few px of each other.
  let ambiguous = false;
  const first = localMarks.length ? localMarks : (discList.length ? [] : backMarks);
  if (first.length > 1 && first[0].record.id !== first[1].record.id) {
    const [a, b] = first;
    const apart = Number.isFinite(a.sx) && Number.isFinite(b.sx) ? Math.hypot(a.sx - b.sx, a.sy - b.sy) : Math.abs(a.score - b.score);
    // ... and the pointer was not plainly on the first: one that is the nearer by more than a pixel and a half is the one aimed at.
    const nearer = Math.abs(scoreOf(b) - scoreOf(a));
    ambiguous = apart <= AMBIGUITY_PX && nearer <= AIM_PX;
  }
  return { winner: out.length ? out[0].record : null, list: out, ambiguous };
}

/** @returns {Object|null} the winning record */
export function rankPick(glyphs, discs, reach) {
  return decide(glyphs, discs, reach).winner;
}

/**
 * Only an ORDER, for ui/labels.js: marks by score (a candidate here has no pixel, no tier and no depth), then
 * discs by size. Which of these a pointer means is `decide`. Duplicate records collapse.
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
