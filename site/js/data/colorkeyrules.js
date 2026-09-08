// data/colorkeyrules.js -- which bucket a record falls in, for each colour key (spec 0026 req 11).
//
// Pure. The registry (data/colorkeys.js, from registry/colorkeys.yaml) says which field and which
// bounds; this file knows how to READ the field off a record. A record without the field is
// `unknown`, drawn grey and counted: not knowing a height is a fact.

import { COLOR_KEYS } from './colorkeys.js';
import { CLASS_COLOURS } from '../scene/glyphatlas.js';

export const UNKNOWN_COLOUR = '#7A8494';
export const UNKNOWN_ID = 'unknown';

export function keyById(id) {
  return COLOR_KEYS.find((k) => k.id === id) || null;
}

/** The field a key reads, off a record, as a number -- or null when the record does not have it. */
export function fieldOf(record, by) {
  const m = (record && record.meta) || {};
  switch (by) {
    case 'perigee_km':
      return Number.isFinite(m.perigeeKm) ? m.perigeeKm : null;
    case 'inclination_deg':
      return Number.isFinite(m.inclinationDeg) ? m.inclinationDeg : null;
    case 'launch_year': {
      // An international designator is YYYY-NNNA; the year is the first four characters. Launches
      // the app draws carry a net time instead.
      const d = m.intlDesignator ? String(m.intlDesignator) : '';
      const y = /^\d{4}/.test(d) ? Number(d.slice(0, 4)) : Number.isFinite(m.netMs) ? new Date(m.netMs).getUTCFullYear() : null;
      return Number.isFinite(y) ? y : null;
    }
    default:
      return null;
  }
}

/**
 * The bucket for a record under a key: {id, label, colour}. For `class` the bucket is the klass
 * itself in the design language's colour; for a numeric key the first bucket whose [min, max)
 * holds the value; `unknown` otherwise.
 */
export function bucketOf(key, record) {
  if (!key) return null;
  if (key.by === 'klass') {
    const k = (record && record.klass) || 'satellite';
    return { id: k, label: k, colour: CLASS_COLOURS[k] || UNKNOWN_COLOUR };
  }
  const v = fieldOf(record, key.by);
  if (v === null) return { id: UNKNOWN_ID, label: UNKNOWN_ID, colour: UNKNOWN_COLOUR };
  for (const b of key.buckets || []) {
    if (v >= b.min && v < b.max) return { id: b.id, label: b.label, colour: b.colour };
  }
  return { id: UNKNOWN_ID, label: UNKNOWN_ID, colour: UNKNOWN_COLOUR };
}

/** Counts per bucket over a set of records, in the key's bucket order, `unknown` last, zeroes kept. */
export function legendCounts(key, records) {
  const counts = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    const b = bucketOf(key, r);
    if (!b) continue;
    counts.set(b.id, (counts.get(b.id) || 0) + 1);
  }
  const rows = [];
  if (key.by === 'klass') {
    for (const [id, colour] of Object.entries(CLASS_COLOURS)) rows.push({ id, label: id, colour, n: counts.get(id) || 0 });
  } else {
    for (const b of key.buckets || []) rows.push({ id: b.id, label: b.label, colour: b.colour, n: counts.get(b.id) || 0 });
  }
  rows.push({ id: UNKNOWN_ID, label: UNKNOWN_ID, colour: UNKNOWN_COLOUR, n: counts.get(UNKNOWN_ID) || 0 });
  return rows;
}
