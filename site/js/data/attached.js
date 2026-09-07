// The oddities that are not objects in space. They are parts of objects in space.
//
// The Voyager Golden Record and Juno's three aluminium LEGO figures are bolted to two spacecraft
// this app already draws. registry/oddities.yaml gives them `where.kind: attached`, and this file
// is the whole consequence of that word. It is hand-written beside the GENERATED data/oddities.js
// for the same reason data/rocketmatch.js sits beside data/rockets.js: generated data and
// hand-written code never share a file, so `gen_oddities_js.py --check` stays a plain comparison.
//
// WHY AN ATTACHED ROW IS NOT A RECORD, stated once because every rule below follows from it.
// A Golden Record record at Voyager 1's exact position would be a second dot under the first:
// ambiguous to tap (main.js takes the first hit in layer order), a duplicate spacecraft if it
// carried the carrier's horizons id (scene/realmodels.js matches on that id), and a layer count
// that counts the same point in the sky twice. So there is one dot, and it is the spacecraft's;
// the record is drawn as a CHILD of the spacecraft's model and reached from the spacecraft's card.
//
// THREE CONSEQUENCES, and each of them is a thing this file does rather than a thing it says:
//
//  1. THE POSITION IS THE CARRIER'S, VERBATIM. attachedOddityRecord() copies the carrier's
//     propagator, frame, elements, epoch and class -- not an approximation of them, the fields
//     themselves. `position_class: inherit` in the registry is not a fourth class; it is an
//     instruction to copy, and check_registry.py refuses it on any row that is not attached.
//     If the carrier is bundled sample data, so is this, and the card says so in those words.
//
//  2. THE CARRIER'S IDENTIFIERS ARE NOT COPIED. `meta.horizonsId` is deliberately absent from the
//     derived record: scene/realmodels.js matches a real glTF on it, and a Golden Record carrying
//     -31 would draw a second Voyager beside the first. check_registry.py refuses the field on
//     the row; this is the other half of the same rule.
//
//  3. WHERE WE HANG IT IS OUR DRAWING AND IT SAYS SO. `mount` is the position and the size on
//     the carrier's model, both chosen by a human, and `mount_class: illustrative` is required
//     by the registry so the card can print the sentence. The disc really is bolted to the side
//     of the bus. The centimetre is ours, and so is the size: a 30 cm record on a 13 m
//     spacecraft is about a pixel, so it is drawn far bigger and the row's own `departure:`
//     sentence says that on the card.

import { ODDITIES } from './oddities.js';

/**
 * @typedef {object} AttachedOddity
 * @property {string} id        the registry row's id. NOT a record id: nothing resolves it.
 * @property {string} display   the name the card and the "also aboard" row print
 * @property {string[]} carriers every record id this rides on -- `where.to` plus `where.also_on`
 * @property {string} build     the scene/models.js ODDITY_BUILDERS key
 * @property {{x:number,y:number,z:number,scale:number,face:string}} mount
 * @property {object} meta      the card's own fields, shaped like every other record's meta
 */

/** Everything a card needs that is true of the row rather than of where it is. */
function metaOf(row) {
  const shape = row.shape || {};
  const w = row.where || {};
  return {
    fact: row.fact,
    myths: Array.isArray(row.myths) ? row.myths : [],
    cite: row.cite || null,
    asOf: row.as_of || null,
    whereKind: 'attached',
    drawnName: shape.drawn_name || null,
    modelVariant: shape.build || 'generic',
    drawsAs: shape.stands_for || 'generic',
    departure: shape.departure || null,
    // The card prints COPY.drawing.mount off this, so the sentence about our arrangement is
    // driven by the row's own field rather than by the class of the record.
    mountClass: w.mount_class || null,
  };
}

/**
 * Every attached row, in registry order.
 *
 * `also_on` is why `carriers` is a list: one card, two carriers. The Golden Record is drawn on
 * both Voyagers and counted once, because there is one Golden Record card and two identical
 * discs, and a layer count that said "2" would be counting drawings rather than things.
 * @type {AttachedOddity[]}
 */
export const ATTACHED_ODDITIES = ODDITIES
  .filter((row) => row && row.where && row.where.kind === 'attached')
  .map((row) => {
    const w = row.where;
    const mount = w.mount || {};
    return {
      id: row.id,
      display: row.display,
      carriers: [w.to, ...(w.also_on || [])].filter(Boolean),
      build: (row.shape || {}).build || 'generic',
      mount: {
        x: Number(mount.x) || 0,
        y: Number(mount.y) || 0,
        z: Number(mount.z) || 0,
        // check_registry.py requires a positive `scale` no greater than 1 on every attached row,
        // so this fallback is unreachable from the registry. It is here because a drawing that
        // silently defaults to 1 would be a child the size of its carrier, and 0 draws nothing.
        scale: Number(mount.scale) > 0 ? Number(mount.scale) : 0.1,
        face: mount.face || null,
      },
      mountClass: w.mount_class || null,
      meta: metaOf(row),
    };
  });

/**
 * What is riding on this record, if anything. The answer is `[]` for every record in the app but
 * three, so both callers can ask about anything and pay nothing for the ones that carry nothing.
 * @param {string} recordId
 * @returns {AttachedOddity[]}
 */
export function attachedOdditiesFor(recordId) {
  if (!recordId) return [];
  return ATTACHED_ODDITIES.filter((a) => a.carriers.includes(recordId));
}

/**
 * The record-shaped object the card renders for an attached oddity.
 *
 * It is built HERE, at the moment somebody asks for it, and it is never put in `ctx.records()`:
 * a record in that list gets a dot, and this one must not have one. ui/cards.js opens it with
 * showCard() and does not change the selection, so the map keeps drawing one object where there
 * is one object and the camera stays where the visitor put it.
 *
 * Everything positional is the carrier's, copied rather than reinterpreted -- see note 1 in the
 * header. What is NOT copied is the carrier's `meta`, and that is a decision rather than an
 * oversight: it is a block about the carrier, and this record is not the carrier. The two parts
 * of it that could have come across argue against themselves.
 *   `horizonsId` MUST NOT: scene/realmodels.js matches a real spacecraft model on it, so a
 *   Golden Record carrying -31 draws a second Voyager beside the first (note 2).
 *   `why` -- the four-sentence explanation of why a deep-space position is bundled -- is TRUE of
 *   this record and is still left behind, because the class line already says "bundled sample
 *   data, not a live position" in the carrier's own words, the clause after it names the
 *   carrier, and the carrier's card is one tap away in the block directly above. Pasting the
 *   paragraph in as well buried both of those sentences under a wall about Voyager's ephemeris.
 *
 * @param {AttachedOddity} entry
 * @param {object} carrier the carrier's Record, from ctx.recordById(entry.carriers[n])
 * @returns {object|null} null when there is no carrier to inherit from -- the honest answer, and
 *   the card simply does not offer the row
 */
export function attachedOddityRecord(entry, carrier) {
  if (!entry || !carrier) return null;
  const { id, name, layer, klass, source, meta, ...position } = carrier;
  return {
    ...position,
    id: entry.id,
    name: entry.display,
    layer: 'oddities',
    klass: 'oddity',
    source: 'registry/oddities.yaml',
    meta: {
      ...entry.meta,
      attachedTo: carrier.id,
      attachedToName: carrier.name,
      mountFace: entry.mount.face,
    },
  };
}

/** How many rows ride on a spacecraft the app draws rather than carrying their own dot. */
export function attachedOddityCount() {
  return ATTACHED_ODDITIES.length;
}
