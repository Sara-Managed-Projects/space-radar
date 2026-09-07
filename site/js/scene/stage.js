// The stage: which world the scene is centred on, and the one function that turns a position in
// kilometres into a point the GPU can hold.
//
//     scenePos = M * ( (posKm_in_stage_frame - originKm) / unitKm )
//
// Two things are going on and they are worth keeping apart.
//
// 1. THE FLOATING ORIGIN. Positions are computed in float64 kilometres and can be 4.5e9 km from
//    the Sun. float32 -- what a vertex attribute holds -- has 24 bits of mantissa, so at 4.5e9 km
//    the spacing between representable values is ~500 km. Subtracting the stage origin FIRST, in
//    float64, and only then dividing and casting is the whole trick: inside an Earth stage
//    nothing is farther than the Moon (~4e5 km -> 400 units at unit_km 1000), which float32 holds
//    to well under a metre.
//
// 2. THE AXIS REMAP. The frames in the module contract are the ones astronomy uses: +Z is the pole,
//    +X is the vernal equinox (or, for sun-inertial, the ecliptic's). Three.js scenes are
//    Y-up by every convention every camera control assumes. So:
//
//        scene.x =  frame.x        scene.y = frame.z        scene.z = -frame.y
//
//    which is a -90 degrees rotation about X. det = +1, so handedness is preserved: the scene is
//    right-handed, north is up, and the vernal equinox is +X. The starfield can therefore sit in
//    the scene unrotated, which is what spec 0006 requirement 6 asks for.
//
// The active stage's frame:
//     earth, moon      -> earth-inertial   (TEME/EQJ axes, geocentric)
//     sun and planets  -> sun-inertial     (heliocentric ecliptic J2000)
// The origin is the stage world's position IN that frame, which worlds.js pushes in every tick.
// For earth and sun the origin is (0,0,0); for moon or a planet it is that body's position, and
// that is the floating origin actually doing its job.

import * as THREE from '../../vendor/three.module.min.js';
import {
  gmst,
  eciToEcef,
  ecefToEci,
  eclipticToEquatorial,
  equatorialToEcliptic,
  worldHelioEclKm,
  toStage,
} from '../propagate/frames.js';

export const EARTH_INERTIAL = 'earth-inertial';
export const EARTH_FIXED = 'earth-fixed';
export const SUN_INERTIAL = 'sun-inertial';

/**
 * unit_km and the frame each stage draws in. Mirrors registry/worlds.yaml -- adding a stage is a
 * row here and a row in worlds.js's table, never a branch in this file.
 */
export const STAGES = {
  sun: { frame: SUN_INERTIAL, unitKm: 1000000 },
  earth: { frame: EARTH_INERTIAL, unitKm: 1000 },
  moon: { frame: EARTH_INERTIAL, unitKm: 1000 },
  mercury: { frame: SUN_INERTIAL, unitKm: 1000 },
  venus: { frame: SUN_INERTIAL, unitKm: 1000 },
  mars: { frame: SUN_INERTIAL, unitKm: 1000 },
  jupiter: { frame: SUN_INERTIAL, unitKm: 10000 },
  saturn: { frame: SUN_INERTIAL, unitKm: 10000 },
  uranus: { frame: SUN_INERTIAL, unitKm: 10000 },
  neptune: { frame: SUN_INERTIAL, unitKm: 10000 },
};

// Scratch, so a per-frame loop over twenty thousand glyphs allocates nothing.
const _a = { x: 0, y: 0, z: 0 };
const _b = { x: 0, y: 0, z: 0 };

function read(p, out) {
  if (Array.isArray(p) || ArrayBuffer.isView(p)) {
    out.x = p[0]; out.y = p[1]; out.z = p[2];
  } else {
    out.x = p.x; out.y = p.y; out.z = p.z;
  }
  return out;
}

export const stage = {
  worldId: 'earth',
  frame: EARTH_INERTIAL,
  unitKm: 1000,
  originKm: { x: 0, y: 0, z: 0 },

  /** App time this stage is currently resolved at. Set once a tick by worlds.update(). */
  tMs: Date.now(),

  // Cached derived quantities. Both are pure functions of tMs, so caching on tMs is exact and
  // not an approximation.
  _gmstAt: null,
  _gmstRad: 0,
  _helioAt: null,
  _helioKm: { x: 0, y: 0, z: 0 },

  /**
   * The scene's time. Everything downstream (Earth's rotation, the frame conversions) reads
   * this, so calling it once per frame is what makes a screenshot at a given clock value
   * reproducible. the module contract's toScene(posKm, frame) has no time argument; this is where the
   * time it needs lives.
   */
  setTime(tMs) {
    this.tMs = tMs;
    return this;
  },

  /** GMST in radians at the stage's time (or another time). Cached per instant. */
  gmstRad(tMs) {
    const t = tMs === undefined ? this.tMs : tMs;
    if (this._gmstAt !== t) {
      this._gmstAt = t;
      this._gmstRad = gmst(new Date(t));
    }
    return this._gmstRad;
  },

  /**
   * Earth's heliocentric position in the sun-inertial frame (ecliptic J2000), km. frames.js owns
   * the ephemeris; this only caches it, because a frame conversion asks for it once per call and
   * it is a pure function of time.
   */
  earthHelioKm(tMs) {
    const t = tMs === undefined ? this.tMs : tMs;
    if (this._helioAt !== t) {
      const v = worldHelioEclKm('earth', t);
      if (v) {
        this._helioAt = t;
        this._helioKm.x = v.x; this._helioKm.y = v.y; this._helioKm.z = v.z;
      }
    }
    return this._helioKm;
  },

  /** Recentre. worlds.js sets the origin on the next tick; until then it is the world's centre. */
  setWorld(id) {
    const row = STAGES[id];
    if (!row) {
      console.warn(`stage.setWorld: no such world "${id}"`);
      return this;
    }
    if (this.worldId === id) return this;
    this.worldId = id;
    this.frame = row.frame;
    this.unitKm = row.unitKm;
    this.originKm.x = 0; this.originKm.y = 0; this.originKm.z = 0;
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('sr:stage', { detail: { worldId: id, unitKm: row.unitKm, frame: row.frame } }));
    }
    return this;
  },

  /** The floating origin, in the stage's frame, in km. worlds.js sets this once a tick. */
  setOrigin(posKm) {
    if (!posKm) {
      this.originKm.x = 0; this.originKm.y = 0; this.originKm.z = 0;
      return this;
    }
    read(posKm, _a);
    this.originKm.x = _a.x; this.originKm.y = _a.y; this.originKm.z = _a.z;
    return this;
  },

  /**
   * Convert a position in km from any of the three frames into the stage's frame, in km.
   * Returns a plain object; float64 throughout, because this is the step precision depends on.
   */
  toStageFrame(posKm, frame, tMs) {
    const t = tMs === undefined ? this.tMs : tMs;
    const v = compose(read(posKm, _a), frame || this.frame, t, this);
    if (!v) return null;
    return { x: v.x, y: v.y, z: v.z, frame: this.frame };
  },

  /**
   * the module contract's one required entry point. km in a named frame -> a THREE.Vector3 in scene units.
   */
  toScene(posKm, frame, tMs) {
    return this.toSceneInto(posKm, frame, new THREE.Vector3(), tMs);
  },

  /** Same, into a vector you already own. The glyph layers run this 20 000 times a tick. */
  toSceneInto(posKm, frame, out, tMs) {
    const t = tMs === undefined ? this.tMs : tMs;
    const v = compose(read(posKm, _a), frame || this.frame, t, this);
    if (!v) return null;
    const u = this.unitKm;
    const dx = (v.x - this.originKm.x) / u;
    const dy = (v.y - this.originKm.y) / u;
    const dz = (v.z - this.originKm.z) / u;
    return out.set(dx, dz, -dy); // the axis remap, and the only place it happens
  },

  /**
   * A DIRECTION, not a position. Converted as the difference of two points -- the tip and the
   * origin of the source frame -- because a frame change is a rotation AND a translation and only
   * the rotation applies to a direction. Doing it as a difference means the rotation comes from
   * exactly the same code path as everything else, which is the point.
   */
  dirToScene(vec, frame, out, tMs) {
    const t = tMs === undefined ? this.tMs : tMs;
    const from = frame || this.frame;
    const tip = compose(read(vec, _a), from, t, this);
    if (!tip) return null;
    const tx = tip.x, ty = tip.y, tz = tip.z;
    const zero = compose(read(ZERO, _a), from, t, this);
    if (!zero) return null;
    const o = out || new THREE.Vector3();
    const dx = tx - zero.x, dy = ty - zero.y, dz = tz - zero.z;
    return o.set(dx, dz, -dy).normalize();
  },

  /** Scene units back to km in the stage's frame. For picking and for the camera's readouts. */
  fromScene(vec3) {
    const u = this.unitKm;
    return {
      x: vec3.x * u + this.originKm.x,
      y: -vec3.z * u + this.originKm.y,
      z: vec3.y * u + this.originKm.z,
      frame: this.frame,
    };
  },

  /** km -> scene units, for radii and distances. */
  kmToUnits(km) { return km / this.unitKm; },
  unitsToKm(units) { return units * this.unitKm; },
};

const ZERO = { x: 0, y: 0, z: 0 };
const _posArg = { x: 0, y: 0, z: 0, frame: '' };

/**
 * Express `v` (km, in frame `from`) in the stage's frame, km. NULL when it cannot be expressed.
 *
 * frames.js owns this: toStage() knows about TEME versus J2000 (they differ by precession, which
 * is 0.36 degrees in 2026 -- a fifth of the Sun's width on the terminator, and the reason not to
 * hand-roll it here) and about which conversions are not defined at all. It returns null when it
 * cannot answer, and only then does the local fallback below run, so a null from frames.js
 * degrades to a slightly-less-precise answer rather than to nothing on screen.
 *
 * WHY NULL AND NOT THE VECTOR BACK. This used to console.warn and return `v` unchanged, which
 * means a position in a frame nobody could convert was drawn AS IF it were already in the stage's
 * frame. That is how seven landing sites and rovers were drawn on Earth's surface for months:
 * there was no wrong pixel to notice, only a right-looking one in the wrong place, and the one
 * warning went to a console nobody had open. An unconvertible vector is now a refusal, and every
 * caller draws nothing rather than something false.
 */
function compose(v, from, tMs, st) {
  if (from === st.frame) return v;
  _posArg.x = v.x; _posArg.y = v.y; _posArg.z = v.z; _posArg.frame = from;
  const r = toStage(null, _posArg, st, tMs);
  if (r && Number.isFinite(r.x)) return r;
  const local = convert(v, from, st.frame, tMs, st);
  return local && Number.isFinite(local.x) ? local : null;
}

/**
 * The fallback, for the three Earth-and-Sun frames only. Six ordered pairs, written out rather
 * than looked up, because the whole point of this file is that someone can read it and check it.
 * It ignores precession, so it is right to about 0.4 degrees and no better. Anything else -- any
 * other world's fixed or inertial frame -- belongs to frames.js, and if frames.js could not
 * answer, neither can this: it returns null.
 */
function convert(v, from, to, tMs, st, isDirection) {
  if (from === to) return v;

  if (from === EARTH_FIXED) {
    v = ecefToEci(v, st.gmstRad(tMs));
    if (to === EARTH_INERTIAL) return v;
    from = EARTH_INERTIAL;
  }

  if (from === EARTH_INERTIAL) {
    if (to === EARTH_FIXED) return eciToEcef(v, st.gmstRad(tMs));
    // -> sun-inertial: rotate equatorial to ecliptic, then move the origin to the Sun.
    // The Earth vector is fetched FIRST: earthHelioKm itself calls equatorialToEcliptic, and if
    // frames.js returns a shared scratch object the two results would alias.
    const h = isDirection ? null : st.earthHelioKm(tMs);
    const e = equatorialToEcliptic(v);
    if (isDirection) return e;
    _b.x = e.x + h.x; _b.y = e.y + h.y; _b.z = e.z + h.z;
    return _b;
  }

  if (from === SUN_INERTIAL) {
    let g = v;
    if (!isDirection) {
      const h = st.earthHelioKm(tMs);
      _b.x = v.x - h.x; _b.y = v.y - h.y; _b.z = v.z - h.z;
      g = _b;
    }
    const q = eclipticToEquatorial(g);
    if (to === EARTH_INERTIAL) return q;
    if (to === EARTH_FIXED) return eciToEcef(q, st.gmstRad(tMs));
  }

  // No conversion. Not a warning and a shrug: a refusal. See compose() above.
  return null;
}
