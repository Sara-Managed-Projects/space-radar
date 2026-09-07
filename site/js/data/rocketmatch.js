// data/rocketmatch.js -- which drawn shape a launch gets, and how sure we are of it.
//
// HAND-WRITTEN. The rows it walks are generated next door in data/rockets.js from
// registry/rockets.yaml; this file is the logic, and adding a rocket must never touch it.
//
// The chain is exact string comparison, trimmed and case-folded, most specific first. There is
// deliberately NO normaliser: a regex that strips "Block 2" is behaviour hidden in code, and the
// project's rule is that behaviour is data a human edits. A row that wants both spellings lists
// both spellings, which is one more array element and completely legible.
//
//   1. full_name  rocket.configuration.full_name        0% null, 72 distinct in the live feed
//   2. family     families[], most specific to root     empty on 19.8% of launches, so never first
//   3. provider   launch_service_provider.name          0% null; picks a class, never a vehicle
//   4. nothing    -> GENERIC_ROCKET, and the card says "drawn as a generic rocket"
//
// Measured against all 359 upcoming launches on 2026-09-07: 284 matched on full_name, 49 on
// family, 8 on provider, 18 (5.0%) fell through to generic.

import { ROCKETS } from './rockets.js';

/** The shape a launch gets when no row matches: today's rocket, and the card says so. */
export const GENERIC_ROCKET = {
  id: 'generic',
  display: null,
  stands_for: 'generic',
  height_m: 60,
  core_dia_m: 3.6,
  taper: 'tube',
  top: { kind: 'fairing' },
  boosters: { shape: 'none', count: 0 },
  engines: { count: 1, pattern: 'single' },
  livery: 'unknown',
  class: 'inferred',
};

/** id -> row, for scene/models.js, which is handed a variant id and not a launch. */
export const ROCKET_BY_ID = Object.create(null);
for (const row of ROCKETS) ROCKET_BY_ID[row.id] = row;

const key = (s) => (typeof s === 'string' ? s.trim().toLowerCase() : null);

function index(kind) {
  const out = Object.create(null);
  for (const row of ROCKETS) {
    const list = (row.match && row.match[kind]) || [];
    for (const value of list) {
      const k = key(value);
      // First row wins. check_registry.py refuses two rows claiming the same string, so this
      // only ever bites if someone hand-edits the generated mirror -- which is also refused.
      if (k && !(k in out)) out[k] = row;
    }
  }
  return out;
}

const BY_FULL_NAME = index('full_name');
const BY_FAMILY = index('family');
const BY_PROVIDER = index('provider');

/**
 * Resolve a launch's rocket to a drawn shape.
 *
 * @param {object} meta a launch record's meta: {rocket, rocketFamilyPath, provider}
 *   `rocket` is LL2's configuration.full_name; `rocketFamilyPath` is the families list by name,
 *   ROOT FIRST, as parsers.js writes it.
 * @returns {{row: object|null, via: 'full_name'|'family'|'provider'|null}}
 *   `row` is null when nothing matched, which is a third answer and not a bad one: the caller
 *   draws the generic rocket and the card says that is what it did.
 */
export function rocketRowFor(meta) {
  if (!meta) return { row: null, via: null };

  const full = key(meta.rocket);
  if (full && BY_FULL_NAME[full]) return { row: BY_FULL_NAME[full], via: 'full_name' };

  const path = Array.isArray(meta.rocketFamilyPath) ? meta.rocketFamilyPath : [];
  for (let i = path.length - 1; i >= 0; i--) {
    const k = key(path[i]);
    if (k && BY_FAMILY[k]) return { row: BY_FAMILY[k], via: 'family' };
  }

  const provider = key(meta.provider);
  if (provider && BY_PROVIDER[provider]) return { row: BY_PROVIDER[provider], via: 'provider' };

  return { row: null, via: null };
}

export default rocketRowFor;
