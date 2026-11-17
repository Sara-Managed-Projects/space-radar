// scene/pickrank.js -- who a tap meant, decided once for every layer (spec 0028 req 4).
//
// Three kinds of candidate reach this file, all already inside the pointer's widest reach:
//
//   mark   {record, px, score, tier, sx, sy, depth, r}   a point; px is the screen distance to it, score is px with
//                                the debris penalty applied (glyphs.js), sx/sy where it is drawn (CSS px
//                                from the canvas corner), depth the straight-line distance from the camera
//                                and r half the icon as drawn, in CSS px (absent: a point with no size);
//   model  {record, kind: 'model', px, score, sx, sy, depth, r, span}   a craft drawn as its 3D model
//                                (scene/modelpick.js); px is the distance to the model's outline, zero anywhere
//                                on it, span how far it reaches from its centre in the units of depth;
//   disc   {record, edge, r, cx, cy, depth, horizon, tier}   a world drawn as a disc; edge is the distance to
//                                its RIM (zero when the pointer is on it), r its radius in px, depth the
//                                distance to its centre and horizon the distance to its limb.
//
// THE RULES, in the order they act:
//   1. Hidden is not a candidate. A mark behind a disc and inside its outline is covered: it is farther from
//      the camera than the disc's limb (ONE measure, the straight-line distance, for both). A mark of the
//      backdrop is covered by any disc, whatever the numbers say. A model is covered where the pointer is on
//      a disc in front of it.
//   2. A tier first. "local" is what belongs to the stage being looked at; "backdrop" is what is only
//      behind it (stars and galaxies seen from a world). Any local candidate beats any backdrop one.
//   3. A MODEL IS ONE TARGET AS BIG AS IT LOOKS (internal #341): the pointer anywhere on it means it, also
//      in front of a planet. Only an icon the pointer is on, drawn in front of the model, is taken first.
//      The dots of vehicles docked inside it (not drawn) never make a plain click a list.
//   4. In a tier, a mark within reach beats a disc (a satellite drawn over Earth is what the pointer
//      means). OVER A DISC the reach is the icon as drawn (internal #342): never smaller than the icon,
//      with the pointer's margin; in a crowd the margin goes and the nearest icon under the pointer wins.
//      The disc wins only when no icon is under the pointer. Among marks the nearer wins; among discs the
//      nearer to the camera wins, and one that is only near the pointer must be in FRONT of the disc the
//      pointer is on.
//   5. Two marks of the best tier less than AMBIGUITY_PX apart, and about as near the pointer as each other, are
//      not guessed between: `ambiguous`. One the pointer is plainly on is taken.
//
// Reach is the pointer's: a finger is wide, a mouse is not. Pure and DOM-free, so the whole decision can
// be held by a test with the real icon sizes.

/** How far from the pointer a candidate may be, CSS px, by what is pointing. */
// onDisc: the least reach of a mark drawn over a world's disc when the pointer is on that disc. A home view
// of the Earth carries hundreds of satellite dots, so with the full reach nearly every click on the Earth
// opened a satellite nobody had aimed at (seen on the live site, 2026-11-02, after 1.5.2). On a disc a dot
// wins only when the pointer is on the dot itself.
// pad: THE ICON AS DRAWN IS THE TARGET (internal #342, the owner on 2026-11-16: "it is hard to click small
// icons above the Earth; many times the click lands on the Earth"). The reach over a disc was the 4 and 10 px
// above whatever the icon: a station's icon is 13 px across, so a click on its outer half went to the Earth.
// Over a disc a mark now reaches half its drawn size plus `pad`, and no less than `onDisc`.
// crowdPad: the margin left in a crowd (CROWD_ON_DISC), where a wider one would take every tap from the disc.
export const REACH = {
  mouse: { local: 10, backdrop: 5, onDisc: 4, pad: 1, crowdPad: 0.5 },
  touch: { local: 24, backdrop: 12, onDisc: 10, pad: 6, crowdPad: 2 },
};
/** This many marks within reach of a pointer on a disc are a crowd: only an icon under the pointer is taken. */
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
/** How far a pointer may travel and still be a tap; past it the gesture is a drag (scene/gestures.js DRAG_START_PX is this). */
export const TAP_SLOP_PX = { mouse: 3, touch: 6 };

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
  const all = (Array.isArray(marks) ? marks : []).filter((c) => c && c.record && Number.isFinite(c.score));
  const pad = Number.isFinite(reach.pad) ? reach.pad : 0;
  const crowdPad = Number.isFinite(reach.crowdPad) ? reach.crowdPad : pad;
  const half = (m) => (m.r > 0 ? m.r : 0); // half the icon as drawn
  const onIcon = (m) => m.px <= half(m) + pad;
  // How far a disc's limb is from the camera, the same measure as a mark's depth (a disc with no horizon: its centre).
  const limbOf = (d) => (Number.isFinite(d.horizon) ? d.horizon : d.depth);

  const covered = (m) => {
    if (!Number.isFinite(m.sx) || !Number.isFinite(m.sy)) return false;
    for (const d of ds) {
      if (!Number.isFinite(d.cx) || !Number.isFinite(d.cy)) continue;
      if (Math.hypot(m.sx - d.cx, m.sy - d.cy) >= d.r) continue;
      if (m.tier === 'backdrop') return true;
      if (Number.isFinite(m.depth) && Number.isFinite(limbOf(d)) && m.depth > limbOf(d)) return true;
    }
    return false;
  };

  // Discs: the one the pointer is on and nearest the camera, then what is in front of it.
  const inReach = ds.filter((d) => d.edge <= reach.local);
  const inside = inReach.filter((d) => d.edge <= 0).sort((a, b) => depthOf(a) - depthOf(b));
  const front = inside.length ? inReach.filter((d) => d.edge > 0 && depthOf(d) < depthOf(inside[0])) : inReach.filter((d) => d.edge > 0);
  front.sort((a, b) => (a.edge - b.edge) || (depthOf(a) - depthOf(b)));
  const onDisc = inside.length > 0;

  // Models: the body under the pointer, the nearer first; not where the pointer is on a disc in front of it.
  const models = all.filter((m) => m.kind === 'model' && m.px <= pad
    && !inside.some((d) => Number.isFinite(m.depth) && Number.isFinite(limbOf(d)) && m.depth > limbOf(d)))
    .sort((a, b) => depthOf(a) - depthOf(b));
  const bodies = new Set(models.map((m) => m.record.id));
  // A model's own dot is the model; the dots of what is docked inside it are listed after it and never ranked.
  const docked = all.filter((m) => m.kind !== 'model' && m.inside && bodies.has(m.inside));
  const ms = all.filter((m) => m.kind !== 'model' && !bodies.has(m.record.id) && !docked.includes(m));

  const open = ms.filter((m) => !covered(m));
  // A CROWD OVER A DISC: at the home view hundreds of satellite dots lie on the Earth, and a reach wider than
  // the icon found one under nearly every click (live site, 2026-11-02, 1.5.3). Where CROWD_ON_DISC or more
  // marks sit within the full reach of a pointer on a disc, only an icon the pointer is ON is taken, the
  // nearest first; with none under it the disc is what was meant. (Until 2026-11-16 a crowd dropped every
  // mark, a direct hit too: over a phone's Earth nearly every tap is in a crowd, internal #342.)
  const crowd = onDisc && open.filter((m) => m.tier !== 'backdrop' && m.px <= reach.local).length >= CROWD_ON_DISC;
  const reachOf = (m) => {
    if (m.tier === 'backdrop') return reach.backdrop;
    if (!onDisc) return reach.local;
    if (crowd) return half(m) + crowdPad;
    return Math.min(reach.local, Math.max(reach.onDisc ?? reach.local, half(m) + pad));
  };
  const near = open.filter((m) => m.px <= reachOf(m));
  const localMarks = near.filter((m) => m.tier !== 'backdrop').sort((a, b) => scoreOf(a) - scoreOf(b));
  const backMarks = near.filter((m) => m.tier === 'backdrop').sort((a, b) => scoreOf(a) - scoreOf(b));
  const discList = front.concat(inside);
  // Over a model only an icon the pointer is on, drawn in front of it, comes first: nearer than the model's own
  // near side (`span`, how far it reaches from its centre), so a dot that sits inside the model is the model's.
  const top = models[0] || null;
  const firstMarks = top ? localMarks.filter((m) => onIcon(m) && Number.isFinite(m.depth) && m.depth < depthOf(top) - (top.span > 0 ? top.span : 0)) : localMarks;
  const laterMarks = top ? localMarks.filter((m) => !firstMarks.includes(m)) : [];

  const out = [];
  const seen = new Set();
  const push = (record, kind, tier, px, on) => {
    if (!record || seen.has(record.id)) return;
    seen.add(record.id);
    out.push({ record, kind, tier, px, on });
  };
  // `on`: the pointer is on the thing itself (its icon as drawn, its body, its disc), not only near it.
  const onMark = (m) => m.px <= Math.max(reach.onDisc ?? 0, half(m) + pad);
  for (const m of firstMarks) push(m.record, 'glyph', 'local', m.px, onMark(m));
  for (const m of models) push(m.record, 'model', 'local', m.px, true);
  for (const m of laterMarks) push(m.record, 'glyph', 'local', m.px, onMark(m));
  for (const m of docked) push(m.record, 'glyph', 'local', m.px, false);
  for (const d of discList) push(d.record, 'disc', 'local', undefined, d.edge <= 0);
  for (const m of backMarks) push(m.record, 'glyph', 'backdrop', m.px, onMark(m));

  // Too close to call: the two best marks of the first tier are within a few px of each other.
  let ambiguous = false;
  const first = firstMarks.length ? firstMarks : (top || discList.length ? [] : backMarks);
  if (first.length > 1 && first[0].record.id !== first[1].record.id) {
    const [a, b] = first;
    const apart = Number.isFinite(a.sx) && Number.isFinite(b.sx) ? Math.hypot(a.sx - b.sx, a.sy - b.sy) : Math.abs(a.score - b.score);
    // ... and the pointer was not plainly on the first: one that is the nearer by more than a pixel and a half is the one aimed at.
    const nearer = Math.abs(scoreOf(b) - scoreOf(a));
    ambiguous = apart <= AMBIGUITY_PX && nearer <= AIM_PX;
  }
  return { winner: out.length ? out[0].record : null, list: out, ambiguous };
}

/** How far past a name's box a pointer still means the name, CSS px, by what is pointing. */
export const LABEL_PAD = { mouse: 0, touch: 4 };

/**
 * A NAME IS A TARGET FOR WHAT IT NAMES (the owner, 17 Nov 2026: the highlighted names round the Earth could not be
 * clicked). A name is drawn above the canvas, beside its thing's mark, with the mark a few pixels below it; a click
 * on the name's letters or its swatch went through to the Earth behind. The box the pointer is in (ui/labels.js
 * boxes(), each with its `record`) wins over what is drawn under it, since the name is drawn on top. The last one
 * placed is the one on top when two overlap (they are kept clear of each other, so this is only at their edges).
 * @param {Array<{left:number,right:number,top:number,bottom:number,record:Object}>} boxes
 * @returns {Object|null} the named record
 */
export function labelAt(boxes, x, y, pad = 0) {
  if (!Array.isArray(boxes) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (!b || !b.record) continue;
    if (x >= b.left - pad && x <= b.right + pad && y >= b.top - pad && y <= b.bottom + pad) return b.record;
  }
  return null;
}

/** A decision with the named record first: what decide() found stays in the list after it. */
export function withLabel(decision, record) {
  if (!record) return decision;
  const rest = ((decision && decision.list) || []).filter((c) => c.record && c.record.id !== record.id);
  return { winner: record, list: [{ record, kind: 'label', tier: 'local', on: true }, ...rest], ambiguous: false };
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
