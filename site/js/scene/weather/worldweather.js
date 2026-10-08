// scene/weather/worldweather.js -- the air in motion on the other worlds (spec 0066).
//
// Contract: createWorldWeather({ worlds }) -> { update(tMs), latch(), state(), effects() }
//
// OFF THE FIRST VISIT. main.js imports scene/weather/index.js dynamically, after the layers have
// landed, never at tier 0 and never on a connection that saves data. Until then -- and for good on
// those devices -- every world wears scene/worlds.js's own shader and nothing here exists.
//
// HOW. There is no second shader: this takes WORLD_FRAG, the one every world is lit by, and
// replaces the ONE line that reads the map with a call that reads it somewhere else. A world's
// material is then given that source and the uniforms it needs. So the light, the ring's shadow,
// the eclipse and the rim are untouched, and scene/worlds.js carries no weather at all.
// tests/test_weather.mjs holds that the line is there, once.
//
//   zonal flow   Jupiter, Saturn, Venus, Uranus, Neptune: every latitude of the map slides at the
//                published wind's angular rate (scene/weather/flow.js). MODELLED.
//   the spot     Jupiter's Great Red Spot: the band's wind is taken round it and the oval turns
//                within itself. MODELLED (its place is the map's; its drift is not drawn).
//   the hexagon  Saturn's north pole: a six-sided line at the jet's measured latitude.
//                ILLUSTRATIVE (the map has no pole in it).
//   Mars         the seasonal frost caps and the season's dust, by Ls: an optical depth typical of
//                the season, thicker in the south. ILLUSTRATIVE (seasonal, not today's).
//   the dark Y   Venus: the planet-wide wave ultraviolet cameras see, going round in four days,
//                drawn a fifth dark at most. ILLUSTRATIVE.
//   lightning    Jupiter and Saturn: rare flashes on the night side at the latitudes Juno and
//                Cassini found it, larger than life. ILLUSTRATIVE; off where less motion is asked for.
//   Titan        three pale streaks in the north, where Webb and Keck saw methane clouds in 2022
//                and 2023. ILLUSTRATIVE.
//
// THE CLOCK. Everything is a function of the app's time (update(tMs)), computed in doubles here and
// handed over as small numbers, so scrubbing forwards or backwards moves the bands the right way at
// the right speed and a 32-bit float never sees a Unix time.
//
// WHAT A CLOSE MARS DOES. scene/tiles.js draws the missions' mosaic over the globe from close up,
// with its own materials; the seasonal frost is not painted on those. Up close the picture is the
// mosaic, as photographed; the season is on the globe seen whole.

import { WORLD_FRAG } from '../worlds.js';
import { WEATHER } from '../../data/weather.js';
import {
  RATE_ROWS, rateTable, splitFlow, flowPhases, rigidTurn, planetocentricDeg, marsLs, marsSeason,
  nextFlash, flashLight, bodyDirection, wavePhase,
} from './flow.js';

const DEG = Math.PI / 180;

/** The one line of WORLD_FRAG this replaces: where the map is read. */
export const MAP_LINE = 'vec3 base = mix( uTint, texture2D( uMap, vUv ).rgb * uTint, uHasMap );';
const MAP_LINE_WX = 'vec3 base = mix( uTint, wxBase( vUv ) * uTint, uHasMap );';
/** The line a flash is added before: the shader's last word on the colour (lightning shines at night). */
export const OUT_LINE = 'gl_FragColor = vec4( colour, 1.0 );';
const OUT_LINE_WX = 'colour += wxFlash( vPosL, d );\n  gl_FragColor = vec4( colour, 1.0 );';
/** Flashes a world can show at once, and patches of cloud. */
export const FLASH_SLOTS = 2;
export const PATCH_SLOTS = 4;
/** A flash's colour, linear RGB at full brightness: blue-white, as Cassini's and Juno's frames show. */
export const FLASH_COLOUR = [0.85, 0.95, 1.25];
/** A methane cloud on Titan, linear RGB, and how much of the ground under it the thickest part hides. */
export const TITAN_CLOUD = [0.62, 0.52, 0.40];
export const TITAN_CLOUD_COVER = 0.45;
/** Where the declarations go: before the first function WORLD_FRAG defines. */
export const PARS_ANCHOR = '// Oren-Nayar, qualitative form';

/**
 * The hexagon as drawn. `cornerShare`: how far the line follows the flat-sided hexagon rather than
 * a circle (Cassini's pictures show rounded corners). `halfWidthRad`: the line's half-width, 0.7
 * degrees. `depth`: how much darker the line and the cap inside it are than the map, at most.
 */
export const HEXAGON = { cornerShare: 0.75, halfWidthRad: 0.012, depth: 0.22 };
/** Seasonal frost, linear RGB: bright and slightly warm, as CO2 frost over dust photographs. */
export const FROST = [0.86, 0.84, 0.82];
/** Airborne dust, linear RGB, and how much of the surface's contrast the haziest season leaves. */
export const DUST = [0.62, 0.36, 0.20];

const WX_PARS = /* glsl */`
// ---- spec 0066: weather (scene/weather/worldweather.js) ----
#ifdef WX_ZONAL
uniform float uWxRate[ ${RATE_ROWS} ];  // turns per day toward the east, south pole to north, against uWxPhase.w
uniform vec4  uWxPhase;                 // days each copy has flowed (x, y), the second's weight, the whole map's turn
uniform vec4  uWxSpot;                  // the pinned oval: centre u, v and half-sizes; half-size 0 = none
uniform float uWxSpotRate;              // its own turning, turns per day, anticlockwise positive
uniform vec3  uWxHex;                   // the hexagon: its corners' colatitude (rad; 0 = none), its depth, its longitude
uniform vec3  uWxWave;                  // the dark Y: its depth (0 = none), how far round it has gone (turns), its arms' reach (rad)
float wxRate( float v ) {
  float x = clamp( v, 0.0, 1.0 ) * float( ${RATE_ROWS - 1} );
  int i = int( min( floor( x ), float( ${RATE_ROWS - 2} ) ) );
  return mix( uWxRate[ i ], uWxRate[ i + 1 ], x - float( i ) );
}
vec3 wxSample( vec2 uv, float tau ) {
  vec2 p = uv;
  float keep = 1.0;
  if ( uWxSpot.z > 0.0 ) {
    vec2 d = vec2( fract( uv.x - uWxSpot.x + 0.5 ) - 0.5, uv.y - uWxSpot.y ) / uWxSpot.zw;
    float r = length( d );
    // The band's wind goes round the oval: no slide inside it, all of it by 1.8 radii out.
    keep = smoothstep( 1.0, 1.8, r );
    if ( r < 1.0 ) {
      // The oval turns as one piece out to 0.55 of its radius and not at all at its edge.
      float a = -6.2831853 * uWxSpotRate * tau * ( 1.0 - smoothstep( 0.55, 1.0, r ) );
      float c = cos( a ), s = sin( a );
      p = uWxSpot.xy + vec2( c * d.x - s * d.y, s * d.x + c * d.y ) * uWxSpot.zw;
    }
  }
  p.x = fract( p.x - uWxPhase.w - wxRate( uv.y ) * tau * keep );
  // The derivatives of the UNWRAPPED coordinate: fract() jumps at the seam, and a mip level picked
  // from that jump is a one-pixel line of the smallest mip down the planet.
  return textureGrad( uMap, p, dFdx( vUv ), dFdy( vUv ) ).rgb;
}
vec3 wxBase( vec2 uv ) {
  vec3 c = mix( wxSample( uv, uWxPhase.x ), wxSample( uv, uWxPhase.y ), uWxPhase.z );
  if ( uWxHex.x > 0.0 && vPosL.y > 0.0 ) {
    vec3 q = normalize( vPosL );
    float rho = acos( clamp( q.y, -1.0, 1.0 ) );
    float seg = 6.2831853 / 6.0;
    float a = mod( atan( -q.z, q.x ) + uWxHex.z, seg ) - 0.5 * seg;
    float poly = uWxHex.x * cos( 0.5 * seg ) / cos( a );
    float edge = mix( uWxHex.x * 0.955, poly, ${HEXAGON.cornerShare.toFixed(2)} );
    float d = ( rho - edge ) / ${HEXAGON.halfWidthRad.toFixed(4)};
    float line = exp( -d * d );
    float inside = 1.0 - smoothstep( -1.0, 1.0, d );
    // The eye at the pole itself, two degrees across.
    float eye = 1.0 - smoothstep( 0.012, 0.035, rho );
    c *= 1.0 - uWxHex.y * ( line + 0.45 * inside + 0.8 * eye );
    c = mix( c, c * vec3( 0.86, 0.95, 1.08 ), 0.5 * inside * uWxHex.y / ${HEXAGON.depth.toFixed(2)} );
  }
  if ( uWxWave.x > 0.0 ) {
    // A Y on its side: a dark stem along the equator for half a turn, opening into two arms that
    // reach uWxWave.z of latitude, the whole of it fading out at its two ends.
    vec3 q = normalize( vPosL );
    float lat = asin( clamp( q.y, -1.0, 1.0 ) );
    float along = fract( atan( -q.z, q.x ) / 6.2831853 - uWxWave.y );
    float open = smoothstep( 0.45, 1.0, along );
    float arm = uWxWave.z * open;
    float wide = 0.17 + 0.09 * open;
    float y = exp( -pow( ( abs( lat ) - arm ) / wide, 2.0 ) ) * sqrt( sin( 3.14159265 * along ) );
    // What darkens the clouds there absorbs the blue end: the mark is browner, not greyer.
    c *= 1.0 - uWxWave.x * y * vec3( 0.7, 0.9, 1.3 );
  }
  return c;
}
#elif defined( WX_MARS )
uniform vec3 uWxCap;   // the north frost edge and the south one, latitudes in radians, and the haze 0..1
uniform float uWxDustNorth;   // the share of the dusty season's haze the north gets
vec3 wxBase( vec2 uv ) {
  vec3 c = texture2D( uMap, uv ).rgb;
  vec3 q = normalize( vPosL );
  float lat = asin( clamp( q.y, -1.0, 1.0 ) );
  float lon = atan( -q.z, q.x );
  float lum = dot( c, vec3( 0.3, 0.5, 0.2 ) );
  // A frost line is ragged: it follows the ground. Two slow waves and the map's own brightness.
  float rag = 0.022 * sin( 3.0 * lon + 1.3 ) + 0.014 * sin( 7.0 * lon + 0.4 ) + 0.10 * ( lum - 0.25 );
  float north = smoothstep( uWxCap.x - 0.035, uWxCap.x + 0.035, lat + rag );
  float south = smoothstep( -uWxCap.y - 0.035, -uWxCap.y + 0.035, -lat + rag );
  // Thin at its edge, where the ground shows through, and solid a few degrees in.
  float nIn = smoothstep( 0.0, 0.14, lat + rag - uWxCap.x );
  float sIn = smoothstep( 0.0, 0.14, -lat + rag + uWxCap.y );
  float frost = max( north * ( 0.55 + 0.4 * nIn ), south * ( 0.55 + 0.4 * sIn ) );
  c = mix( c, vec3( ${FROST.join(', ')} ), frost );
  // The dusty season: the air between the camera and the ground takes the ground's contrast.
  // uWxCap.z is the share of the ground's light the season's dust takes, straight down
  // (scene/weather/flow.js marsSeason); the dusty season's storms are southern, so the north of
  // the tropics gets uWxDustNorth of it.
  float where = mix( uWxDustNorth, 1.0, smoothstep( 0.45, -0.45, lat ) );
  c = mix( c, vec3( ${DUST.join(', ')} ) * ( 0.8 + 0.6 * lum ), uWxCap.z * where );
  return c;
}
#elif defined( WX_PATCH )
uniform vec4 uWxPatch[ ${PATCH_SLOTS} ];   // a cloud: latitude, east longitude, half-height, half-width, radians; half-height 0 = none
vec3 wxBase( vec2 uv ) {
  vec3 c = texture2D( uMap, uv ).rgb;
  vec3 q = normalize( vPosL );
  float lat = asin( clamp( q.y, -1.0, 1.0 ) );
  float lon = atan( -q.z, q.x );
  float cover = 0.0;
  for ( int i = 0; i < ${PATCH_SLOTS}; i++ ) {
    if ( uWxPatch[ i ].z <= 0.0 ) continue;
    float dLat = ( lat - uWxPatch[ i ].x ) / uWxPatch[ i ].z;
    float dLon = ( mod( lon - uWxPatch[ i ].y + 3.14159265, 6.2831853 ) - 3.14159265 ) / uWxPatch[ i ].w;
    // A streak, not an oval: its thickness swells and thins once or twice along its length. (The
    // first version rippled it thirty times, which near the pole, where the meridians meet, drew
    // a fan of rays: seen in the one frame taken of it, 2026-10-08.)
    float rag = 0.8 + 0.2 * sin( dLon * 2.6 + float( i ) * 2.1 );
    cover = max( cover, exp( -dLat * dLat / ( rag * rag ) ) * exp( -dLon * dLon ) );
  }
  return mix( c, vec3( ${TITAN_CLOUD.join(', ')} ), ${TITAN_CLOUD_COVER.toFixed(2)} * cover );
}
#else
vec3 wxBase( vec2 uv ) { return texture2D( uMap, uv ).rgb; }
#endif
// Lightning on a giant's night side: each flash a soft spot at its place, lit only where the Sun is down.
#ifdef WX_FLASH
uniform vec4 uWxFlash[ ${FLASH_SLOTS} ];   // xyz: the flash's place on the unit ball, the world's own axes; w: its light now, 0..1
uniform float uWxFlashSize;                // its radius, radians
vec3 wxFlash( vec3 posL, float sunDot ) {
  float night = 1.0 - smoothstep( -0.12, 0.0, sunDot );
  if ( night <= 0.0 ) return vec3( 0.0 );
  vec3 q = normalize( posL );
  float light = 0.0;
  for ( int i = 0; i < ${FLASH_SLOTS}; i++ ) {
    if ( uWxFlash[ i ].w <= 0.0 ) continue;
    float a = acos( clamp( dot( q, uWxFlash[ i ].xyz ), -1.0, 1.0 ) ) / uWxFlashSize;
    light += uWxFlash[ i ].w * exp( -a * a );
  }
  return vec3( ${FLASH_COLOUR.join(', ')} ) * light * night;
}
#else
vec3 wxFlash( vec3 posL, float sunDot ) { return vec3( 0.0 ); }
#endif
// ---- end of weather ----
`;

/**
 * WORLD_FRAG with the weather in it. Throws when either anchor is missing or the map line is
 * there more than once: a shader that silently kept its old line would be weather that says it is
 * drawn and is not.
 */
export function weatherFragment(source = WORLD_FRAG) {
  const count = source.split(MAP_LINE).length - 1;
  if (count !== 1) throw new Error(`WORLD_FRAG reads its map on ${count} lines, not 1`);
  if (!source.includes(PARS_ANCHOR)) throw new Error('WORLD_FRAG has no place for the weather declarations');
  if (source.split(OUT_LINE).length - 1 !== 1) throw new Error('WORLD_FRAG no longer ends in one ' + OUT_LINE);
  if (!/float d = dot\( n, uSunDir \);/.test(source)) throw new Error('WORLD_FRAG no longer has the Sun\'s height as `d`: a flash would not know night from day');
  return source.replace(PARS_ANCHOR, `${WX_PARS}\n${PARS_ANCHOR}`).replace(MAP_LINE, MAP_LINE_WX).replace(OUT_LINE, OUT_LINE_WX);
}

/** The corners' colatitude, in radians, of a hexagon whose line sits on `latDeg` planetographic. */
export function hexagonCornerRad(hex) {
  const colat = (90 - planetocentricDeg(hex.lat_deg, hex.flattening || 0)) * DEG;
  // The drawn line's mean radius is 0.955 of the corner's (the shader's rounding); undo it here.
  return colat / 0.955;
}

const KIND_KEY = { 'zonal-flow': 'flow', hexagon: 'hexagon', 'mars-season': 'mars', 'giant-lightning': 'flash', 'planetary-wave': 'wave', 'cloud-patches': 'patches' };

/** The registry's rows by world: {flow, hexagon, mars, flash, wave, patches}, each a row or undefined. */
export function effectsByWorld(rows = WEATHER) {
  const out = new Map();
  for (const r of rows) {
    const key = KIND_KEY[r.kind];
    if (!key) continue;
    if (!out.has(r.world)) out.set(r.world, {});
    out.get(r.world)[key] = r;
  }
  return out;
}

/**
 * @param {object} opts
 * @param {object}   opts.worlds          scene/worlds.js: meshFor(id)
 * @param {boolean}  [opts.reducedMotion] no flashes (registry/weather.yaml off_at: reduced_motion)
 * @param {Function} [opts.rand]          () -> [0, 1), for the flashes; Math.random by default
 */
export function createWorldWeather({ worlds, reducedMotion = false, rand = Math.random } = {}) {
  const fragment = weatherFragment();
  const worn = [];   // {id, mesh, material, original, flow, mars, defines}
  let latched = false;
  let lastMs = NaN;

  for (const [id, fx] of effectsByWorld()) {
    const mesh = worlds && worlds.meshFor ? worlds.meshFor(id) : null;
    const material = mesh && mesh.material;
    if (!material || !material.uniforms || material.fragmentShader !== WORLD_FRAG) continue;
    const u = material.uniforms;
    const entry = { id, mesh, material, original: material.fragmentShader, flow: null, mars: fx.mars || null, wave: null, flash: null, fx };
    if (fx.flow) {
      const split = splitFlow(rateTable(fx.flow.profile), !!fx.flow.spot);
      entry.flow = split;
      u.uWxRate = { value: split.rates };
      u.uWxPhase = { value: { x: 0, y: 0, z: 0, w: 0 } };
      const s = fx.flow.spot;
      u.uWxSpot = { value: s ? { x: s.u, y: s.v, z: s.half_u, w: s.half_v } : { x: 0, y: 0, z: 0, w: 1 } };
      u.uWxSpotRate = { value: s && s.period_days ? 1 / s.period_days : 0 };
      u.uWxHex = { value: fx.hexagon ? { x: hexagonCornerRad(fx.hexagon.hexagon), y: HEXAGON.depth, z: 0 } : { x: 0, y: 0, z: 0 } };
      // The dark Y goes round with the wind: the same way the flow's `sense` turns the clouds.
      const wave = fx.wave ? fx.wave.wave : null;
      if (wave) entry.wave = { periodDays: wave.period_days, sense: fx.flow.profile.sense || 1 };
      u.uWxWave = { value: wave ? { x: wave.depth, y: 0, z: wave.arm_deg * DEG } : { x: 0, y: 0, z: 0 } };
      material.defines = { ...(material.defines || {}), WX_ZONAL: 1 };
    } else if (fx.mars) {
      u.uWxCap = { value: { x: 1.5, y: -1.5, z: 0 } };
      u.uWxDustNorth = { value: Number.isFinite(fx.mars.dust_north) ? fx.mars.dust_north : 1 };
      material.defines = { ...(material.defines || {}), WX_MARS: 1 };
    } else if (fx.patches) {
      const flat = new Float32Array(PATCH_SLOTS * 4);
      fx.patches.patches.slice(0, PATCH_SLOTS).forEach((q, i) => flat.set([q[0] * DEG, q[1] * DEG, q[2] * DEG, q[3] * DEG], i * 4));
      u.uWxPatch = { value: flat };
      material.defines = { ...(material.defines || {}), WX_PATCH: 1 };
    } else continue;
    if (fx.flash && !reducedMotion) {
      const li = fx.flash.lightning;
      const n = Math.min(FLASH_SLOTS, Math.max(1, li.slots | 0));
      entry.flash = { li, slots: [], uniform: new Float32Array(FLASH_SLOTS * 4), lit: 0 };
      for (let i = 0; i < n; i++) entry.flash.slots.push({ startS: NaN, lifeS: 0, dir: [0, 1, 0] });
      u.uWxFlash = { value: entry.flash.uniform };
      u.uWxFlashSize = { value: li.radius_deg * DEG };
      material.defines = { ...material.defines, WX_FLASH: 1 };
    }
    material.fragmentShader = fragment;
    material.needsUpdate = true;
    worn.push(entry);
  }

  /**
   * The flashes run on WALL time: the instant of a flash is ours, not the clock's (a clock held
   * still must not hold a flash lit, and one scrubbed a year a second must not strobe).
   */
  function flashes(wallMs) {
    const nowS = wallMs / 1000;
    for (const e of worn) {
      const f = e.flash;
      if (!f) continue;
      if (!e.mesh.visible) { if (f.lit) { f.uniform.fill(0); f.lit = 0; } continue; }
      let lit = 0;
      f.slots.forEach((s, i) => {
        // The first wait, and every wait after a flash has gone out.
        if (!(s.startS === s.startS) || nowS >= s.startS + s.lifeS) {
          const nx = nextFlash(f.li, rand);
          s.startS = (s.startS === s.startS ? s.startS + s.lifeS : nowS) + nx.waitS;
          if (s.startS < nowS) s.startS = nowS + nx.waitS;   // a tab that slept does not owe its flashes
          s.lifeS = nx.lifeS;
          bodyDirection(nx.latDeg, nx.lonDeg, s.dir);
        }
        const light = flashLight(nowS - s.startS, s.lifeS);
        f.uniform[i * 4] = s.dir[0]; f.uniform[i * 4 + 1] = s.dir[1]; f.uniform[i * 4 + 2] = s.dir[2]; f.uniform[i * 4 + 3] = light;
        if (light > 0) lit += 1;
      });
      f.lit = lit;
    }
  }

  /** Every frame, after worlds.update(): the clock's time into each worn material. */
  function update(tMs, wallMs = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    if (latched) return;
    flashes(wallMs);
    if (!Number.isFinite(tMs) || tMs === lastMs) return;
    lastMs = tMs;
    for (const e of worn) {
      // A world that is hidden or a dot draws the same pixel either way; its numbers can wait.
      if (!e.mesh.visible) continue;
      const u = e.material.uniforms;
      if (e.flow) {
        const ph = flowPhases(tMs, e.flow.cycleDays);
        const v = u.uWxPhase.value;
        v.x = ph.tau1; v.y = ph.tau2; v.z = ph.w2; v.w = rigidTurn(tMs, e.flow.rigid);
        if (e.wave) u.uWxWave.value.y = wavePhase(tMs, e.wave.periodDays, e.wave.sense);
      } else if (e.mars) {
        const s = marsSeason(e.mars, marsLs(tMs));
        const v = u.uWxCap.value;
        v.x = s.northEdgeDeg * DEG; v.y = s.southEdgeDeg * DEG; v.z = s.dust;
        e.season = s;
      }
    }
  }

  /** The frame latch tripped: every world back in scene/worlds.js's own shader, for good. */
  function latch() {
    if (latched) return;
    latched = true;
    for (const e of worn) {
      e.material.fragmentShader = e.original;
      const d = { ...(e.material.defines || {}) };
      delete d.WX_ZONAL; delete d.WX_MARS; delete d.WX_PATCH; delete d.WX_FLASH;
      e.material.defines = d;
      e.material.needsUpdate = true;
    }
  }

  return {
    update,
    latch,
    /** Which worlds wear weather now. Empty after the latch. */
    worn: () => (latched ? [] : worn.map((e) => e.id)),
    /** Does this world show lightning (a row, and motion allowed, and no latch)? */
    flashing: (id) => !latched && worn.some((e) => e.id === id && !!e.flash),
    /** For the probes and the card: the season on Mars, each flow's cycle, the latch. */
    state: () => ({
      latched,
      worlds: worn.map((e) => ({
        id: e.id,
        cycleDays: e.flow ? e.flow.cycleDays : null,
        rigid: e.flow ? e.flow.rigid : null,
        phase: e.flow ? { ...e.material.uniforms.uWxPhase.value } : null,
        season: e.season || null,
        wave: e.wave ? e.material.uniforms.uWxWave.value.y : null,
        flashes: e.flash ? { slots: e.flash.slots.length, lit: e.flash.lit } : null,
      })),
    }),
  };
}
