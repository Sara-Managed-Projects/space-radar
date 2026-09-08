// scene/lod.js -- the scale ladder's level of detail, driven by a table (spec 0028 req 10).
//
// Contract: createLod(hooks) -> { apply(cameraDistFromSunKm), factorFor(id, distKm) }
// `hooks` maps a rule's `what` to a function of one number in [0, 1] -- the rule's strength --
// e.g. { 'sky-panorama': (k) => starfield.setSkyOpacity(k) }. A rule whose hook is missing is
// skipped, never guessed at; check_registry.py already refuses a `what` nobody implements.
//
// The maths is one smoothstep and it is exported on its own so a test can hold it without a scene.

import { LOD_RULES } from '../data/lod.js';

/** 0 at or below `from`, 1 at or above `to`, eased in between. */
export function smoothstep(x, from, to) {
  if (!(to > from)) return x >= to ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * A rule's strength at a camera distance: for `fade: out` 1 inside `from_km` and 0 past `to_km`;
 * for `fade: in` the reverse.
 */
export function ruleFactor(rule, distKm) {
  if (!rule || !Number.isFinite(distKm)) return 1;
  const k = smoothstep(distKm, Number(rule.from_km), Number(rule.to_km));
  return rule.fade === 'in' ? k : 1 - k;
}

export function createLod(hooks = {}, rules = LOD_RULES) {
  const last = new Map();
  function apply(distKm) {
    if (!Number.isFinite(distKm)) return;
    for (const rule of rules) {
      const hook = hooks[rule.what];
      if (typeof hook !== 'function') continue;
      const k = ruleFactor(rule, distKm);
      // Only call when it changes by a visible amount: a hook may touch a material every time.
      const prev = last.get(rule.id);
      if (prev !== undefined && Math.abs(prev - k) < 0.002) continue;
      last.set(rule.id, k);
      try { hook(k); } catch { /* a hook that throws must not take the frame down */ }
    }
  }
  function factorFor(id, distKm) {
    const rule = rules.find((r) => r.id === id);
    return rule ? ruleFactor(rule, distKm) : 1;
  }
  return { apply, factorFor, rules };
}
