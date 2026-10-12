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
//   the storms   Jupiter, from close enough (2026-10-12, spec 0073 req 4; WX_STORMS): eddies rolling
//                where the measured shear is and in the Great Red Spot's wake (GENERATED, at
//                measured places); Oval BA and three white ovals turning where the map has them
//                (MODELLED); the rings of cyclones Juno found at the poles, which no map holds
//                (MODELLED from published places, not a photograph); and a darker, bluer under-deck
//                seen through the darkest gaps at an offset that follows the view (ILLUSTRATIVE).
//                Each starts at a disc size its registry row names and costs nothing below it.
//   Titan        three pale streaks in the north, where Webb and Keck saw methane clouds in 2022
//                and 2023. ILLUSTRATIVE.
//
// THE CLOCK. Everything is a function of the app's time (update(tMs)), computed in doubles here and
// handed over as small numbers, so scrubbing forwards or backwards moves the bands the right way at
// the right speed and a 32-bit float never sees a Unix time.
//
// MEASURED OR FILM (spec 0073 requirement 8; scene/exposure.js). Every row of registry/weather.yaml
// says what it does under the Measured look (`measured: same | still | hidden`), and setLook() is the ONE
// place that reads it: a row that is `hidden` is taken out through the uniform that already means "none"
// (a hexagon of no size, a wave of no depth, a cap past the pole, a near-share of nothing), so the
// shader is not recompiled and Film puts it back as it was. Everything here already runs on the app's
// clock at its true rate; no row is sped up, so a modelled row is `same`.
//
// WHAT A CLOSE MARS DOES. scene/tiles.js draws the missions' mosaic over the globe from close up,
// with its own materials; the seasonal frost is not painted on those. Up close the picture is the
// mosaic, as photographed; the season is on the globe seen whole.

import { WORLD_FRAG } from '../worlds.js';
import { WEATHER } from '../../data/weather.js';
import { drawnUnder } from '../exposure.js';
import {
  RATE_ROWS, rateTable, splitFlow, flowPhases, rigidTurn, planetocentricDeg, marsLs, marsSeason,
  nextFlash, flashLight, bodyDirection, wavePhase,
  EDDY_SLOTS, OVAL_SLOTS, CYCLONE_NORTH, CYCLONE_SOUTH, CYCLONE_SLOTS, shearLines, eddyRow, wakeLine, polarCyclones, nearShare,
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

/**
 * The polar cap as drawn (the cyclones' places and sizes are the registry's): how far the cap's
 * colour leans to a blue-grey, as JunoCam's pictures of the poles do against the belts; how many
 * arms a cyclone's spiral has and how tightly they wind; how bright its cloud is against the cap.
 */
export const POLAR = { blue: [0.80, 0.88, 1.0], lean: 0.3, base: 0.93, arms: 3, wind: 4.5, lift: 0.3, blendRad: 0.09 };
/** Seconds a close-range effect takes to come in or go out once the disc crosses its size. */
export const NEAR_FADE_S = 1;

const WX_STORM_PARS = /* glsl */`
#ifdef WX_STORMS
uniform vec4  uWxOval[ ${OVAL_SLOTS} ];      // an oval that turns: centre u, v and half-sizes; half-size 0 = none
uniform float uWxOvalRate[ ${OVAL_SLOTS} ];  // its turning, turns per day, anticlockwise positive
uniform vec4  uWxEddy[ ${EDDY_SLOTS} ];      // a shear line: its v, its half-height in v (0 = none), turns per day, eddies round the planet
uniform vec3  uWxEddyWin[ ${EDDY_SLOTS} ];   // where along it: centre u, half-width in u (0.5 = all round), one u in units of v
uniform vec4  uWxCyc[ ${CYCLONE_SLOTS} ];    // a polar cyclone: its place on the unit ball, its radius in radians (0 = none)
uniform vec4  uWxNear;                       // how much of each is drawn at this disc size, 0..1: eddies, ovals, poles, depth
uniform vec4  uWxPole;                       // the cap's edge as a colatitude (rad), the cyclones' turn (0..1), -, -
uniform vec4  uWxDeep;                       // the under-deck: luminance of a full gap, of no gap, its depth in radii, its strength
uniform vec3  uWxDeepTint;                   // what the deeper deck's light is multiplied by
float wxHash( float x ) { return fract( sin( x * 12.9898 ) * 43758.5453 ); }
// Small eddies on the shear lines: a turn of the lookup about a fixed point of the map, nothing at
// the eddy's edge, so no texel comes from further than its diameter (scene/weather/flow.js eddyDisplace).
vec2 wxEddies( vec2 p, float tau, float keep ) {
  for ( int i = 0; i < ${EDDY_SLOTS}; i++ ) {
    vec4 e = uWxEddy[ i ];
    if ( e.y <= 0.0 || abs( p.y - e.x ) >= e.y ) continue;
    vec3 win = uWxEddyWin[ i ];
    float gate = keep;
    if ( win.y < 0.5 ) gate *= 1.0 - smoothstep( 0.6, 1.0, abs( fract( p.x - win.x + 0.5 ) - 0.5 ) / win.y );
    if ( gate <= 0.0 ) continue;
    float cell = floor( p.x * e.w );
    float h1 = wxHash( cell + float( i ) * 17.3 );
    float h2 = wxHash( cell * 1.7 + float( i ) * 5.1 + 3.0 );
    // Not a row of them: two cells in five are empty.
    if ( wxHash( cell * 2.3 + float( i ) * 9.7 + 1.0 ) < 0.4 ) continue;
    vec2 c = vec2( ( cell + 0.5 + 0.2 * ( h1 - 0.5 ) ) / e.w, e.x + ( h2 - 0.5 ) * 0.2 * e.y );
    float R = e.y * ( 0.5 + 0.4 * h2 );
    vec2 d = vec2( ( p.x - c.x ) * win.z, p.y - c.y );
    float r = length( d ) / R;
    if ( r >= 1.0 ) continue;
    float a = -6.2831853 * e.z * ( 0.6 + 0.8 * h1 ) * tau * gate * uWxNear.x * ( 1.0 - smoothstep( 0.0, 1.0, r ) );
    float cs = cos( a ), sn = sin( a );
    p = c + vec2( ( cs * d.x - sn * d.y ) / win.z, sn * d.x + cs * d.y );
  }
  return p;
}
// The poles Juno saw: past the cap's edge the map (which has no pole in it) is leaned to the
// blue-grey of JunoCam's polar pictures and the cyclones are drawn on it, each a spiral of brighter
// cloud round a darker eye, turning the way a cyclone does in its hemisphere.
vec3 wxPoles( vec3 c ) {
  vec3 q = normalize( vPosL );
  float colat = acos( clamp( abs( q.y ), 0.0, 1.0 ) );
  float cap = ( 1.0 - smoothstep( uWxPole.x - ${POLAR.blendRad.toFixed(3)}, uWxPole.x + ${POLAR.blendRad.toFixed(3)}, colat ) ) * uWxNear.z;
  if ( cap <= 0.0 ) return c;
  float north = q.y > 0.0 ? 1.0 : -1.0;
  int first = q.y > 0.0 ? 0 : ${CYCLONE_NORTH};
  int count = q.y > 0.0 ? ${CYCLONE_NORTH} : ${CYCLONE_SOUTH};
  float cloud = 0.0;
  float eye = 0.0;
  for ( int i = 0; i < ${CYCLONE_NORTH}; i++ ) {
    if ( i >= count ) break;
    vec4 cy = uWxCyc[ first + i ];
    if ( cy.w <= 0.0 ) continue;
    float a = acos( clamp( dot( q, cy.xyz ), -1.0, 1.0 ) ) / cy.w;
    if ( a >= 1.5 ) continue;
    // East and north at the cyclone: it is near a pole, so never along X.
    vec3 e1 = normalize( cross( cy.xyz, vec3( 1.0, 0.0, 0.0 ) ) );
    vec3 e2 = cross( cy.xyz, e1 );
    float phi = atan( dot( q, e2 ), dot( q, e1 ) );
    // Anticlockwise from above in the north, clockwise in the south; the arms trail.
    float arm = cos( ${POLAR.arms.toFixed(1)} * ( phi - north * 6.2831853 * uWxPole.y ) + north * ${POLAR.wind.toFixed(1)} * log( a + 0.12 ) + float( i ) * 1.7 );
    float body = 1.0 - smoothstep( 0.55, 1.5, a );
    // No two alike: each a little brighter or fainter than the next.
    cloud = max( cloud, body * ( 0.62 + 0.38 * arm * smoothstep( 0.1, 0.5, a ) ) * ( 0.85 + 0.15 * sin( float( i ) * 2.4 ) ) );
    eye = max( eye, 1.0 - smoothstep( 0.0, 0.22, a ) );
  }
  // The folded, mottled cloud between the cyclones: two slow waves, not a picture of anything.
  float mottle = sin( q.x * 37.0 + 2.0 * sin( q.z * 29.0 ) ) * sin( q.z * 41.0 + 2.0 * sin( q.x * 23.0 ) );
  float lum = dot( c, vec3( 0.3, 0.5, 0.2 ) );
  vec3 polar = mix( c, lum * vec3( ${POLAR.blue.map((x) => x.toFixed(2)).join(', ')} ), ${POLAR.lean.toFixed(2)} );
  polar *= ${POLAR.base.toFixed(2)} + ${POLAR.lift.toFixed(2)} * cloud - 0.22 * eye + 0.035 * mottle * ( 1.0 - cloud );
  return mix( c, polar, cap );
}
// Depth: through the darkest gaps of the top deck, the same map again, softer, darker and bluer,
// where the line of sight meets a layer uWxDeep.z radii down. One fetch.
vec3 wxDeep( vec3 c, vec2 uv ) {
  float gap = ( 1.0 - smoothstep( uWxDeep.x, uWxDeep.y, dot( c, vec3( 0.3, 0.5, 0.2 ) ) ) ) * uWxDeep.w * uWxNear.w;
  if ( gap <= 0.0 ) return c;
  vec3 nrm = normalize( vNormalW );
  vec3 vd = normalize( cameraPosition - vPosW );
  vec3 east = normalize( vEastW );
  vec3 nth = cross( nrm, east );
  vec3 q = normalize( vPosL );
  float slant = uWxDeep.z / max( dot( nrm, vd ), 0.35 );
  vec2 off = vec2( -dot( vd, east ) * slant / ( 6.2831853 * max( sqrt( max( 1.0 - q.y * q.y, 0.0 ) ), 0.2 ) ), -dot( vd, nth ) * slant / 3.14159265 );
  vec3 deep = textureGrad( uMap, vec2( fract( uv.x + off.x ), clamp( uv.y + off.y, 0.0, 1.0 ) ), dFdx( vUv ) * 2.0, dFdy( vUv ) * 2.0 ).rgb;
  return mix( c, deep * uWxDeepTint, gap );
}
#endif
`;

const WX_PARS = /* glsl */`
// ---- spec 0066: weather (scene/weather/worldweather.js) ----
#ifdef WX_ZONAL
uniform float uWxRate[ ${RATE_ROWS} ];  // turns per day toward the east, south pole to north, against uWxPhase.w
uniform vec4  uWxPhase;                 // days each copy has flowed (x, y), the second's weight, the whole map's turn
uniform vec4  uWxSpot;                  // the pinned oval: centre u, v and half-sizes; half-size 0 = none
uniform float uWxSpotRate;              // its own turning, turns per day, anticlockwise positive
uniform vec3  uWxHex;                   // the hexagon: its corners' colatitude (rad; 0 = none), its depth, its longitude
uniform vec3  uWxWave;                  // the dark Y: its depth (0 = none), how far round it has gone (turns), its arms' reach (rad)
${WX_STORM_PARS}float wxRate( float v ) {
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
#ifdef WX_STORMS
  if ( uWxNear.y > 0.0 ) {
    for ( int i = 0; i < ${OVAL_SLOTS}; i++ ) {
      vec4 o = uWxOval[ i ];
      if ( o.z <= 0.0 ) continue;
      vec2 d = vec2( fract( uv.x - o.x + 0.5 ) - 0.5, uv.y - o.y ) / o.zw;
      float r = length( d );
      if ( r >= 1.8 ) continue;
      // As the spot: the band's wind goes round it, and it turns within itself.
      keep *= mix( 1.0, smoothstep( 1.0, 1.8, r ), uWxNear.y );
      if ( r < 1.0 ) {
        float a = -6.2831853 * uWxOvalRate[ i ] * tau * uWxNear.y * ( 1.0 - smoothstep( 0.55, 1.0, r ) );
        float c = cos( a ), s = sin( a );
        p = o.xy + vec2( c * d.x - s * d.y, s * d.x + c * d.y ) * o.zw;
      }
    }
  }
#endif
  p.x = fract( p.x - uWxPhase.w - wxRate( uv.y ) * tau * keep );
#ifdef WX_STORMS
  if ( uWxNear.x > 0.0 ) p = wxEddies( p, tau, keep );
#endif
  // The derivatives of the UNWRAPPED coordinate: fract() jumps at the seam, and a mip level picked
  // from that jump is a one-pixel line of the smallest mip down the planet.
  return textureGrad( uMap, p, dFdx( vUv ), dFdy( vUv ) ).rgb;
}
vec3 wxBase( vec2 uv ) {
  vec3 c = mix( wxSample( uv, uWxPhase.x ), wxSample( uv, uWxPhase.y ), uWxPhase.z );
#ifdef WX_STORMS
  if ( uWxNear.w > 0.0 ) c = wxDeep( c, uv );
  if ( uWxNear.z > 0.0 ) c = wxPoles( c );
#endif
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

/**
 * Jupiter's storms into a material's uniforms (the registry's four rows; any may be missing).
 * `still`: where less motion is asked for nothing turns -- the eddies' and the ovals' rates are
 * nothing and the cyclones keep the place they were first drawn at. Returns what update() needs:
 * step(share, dtSeconds, uniforms) lets each term in or out by the disc's size, and follows the
 * face the world wears (the ovals and the gaps are places in a picture; scene/worlds.js moves
 * uWxSpot when "As Hubble saw it" is chosen, and that is how this knows, with no word from it).
 */
export function dressStorms(u, fx, still = false) {
  const profile = fx.flow.profile;
  const ownSpot = fx.flow.spot || null;
  const ed = fx.eddies ? fx.eddies.eddies : null;
  const ov = fx.ovals ? fx.ovals.ovals : null;
  const cy = fx.cyclones ? fx.cyclones.cyclones : null;
  const dp = fx.depth ? fx.depth.depth : null;
  const eddy = new Float32Array(EDDY_SLOTS * 4);
  const eddyWin = new Float32Array(EDDY_SLOTS * 3);
  const putEddy = (i, row) => { eddy.set(row.e, i * 4); eddyWin.set(row.win, i * 3); if (still) eddy[i * 4 + 2] = 0; };
  const lines = ed ? shearLines(profile, ed) : [];
  lines.forEach((l, i) => putEddy(i, eddyRow(l)));
  const oval = new Float32Array(OVAL_SLOTS * 4);
  const ovalRate = new Float32Array(OVAL_SLOTS);
  const cyc = new Float32Array(CYCLONE_SLOTS * 4);
  if (cy) {
    const places = polarCyclones(cy);
    places.north.slice(0, CYCLONE_NORTH).forEach((c, i) => cyc.set([...c.dir, c.radiusDeg * DEG], i * 4));
    places.south.slice(0, CYCLONE_SOUTH).forEach((c, i) => cyc.set([...c.dir, c.radiusDeg * DEG], (CYCLONE_NORTH + i) * 4));
  }
  u.uWxEddy = { value: eddy };
  u.uWxEddyWin = { value: eddyWin };
  u.uWxOval = { value: oval };
  u.uWxOvalRate = { value: ovalRate };
  u.uWxCyc = { value: cyc };
  u.uWxNear = { value: { x: 0, y: 0, z: 0, w: 0 } };
  u.uWxPole = { value: { x: cy ? (90 - cy.cap_lat_deg) * DEG : 0, y: 0, z: 0, w: 0 } };
  u.uWxDeep = { value: { x: 0, y: 1, z: dp ? dp.thickness_radii : 0, w: dp ? dp.strength : 0 } };
  const tint = dp ? dp.tint : [1, 1, 1];
  u.uWxDeepTint = { value: { x: tint[0], y: tint[1], z: tint[2] } };
  const from = [ed ? ed.from_share : Infinity, ov ? ov.from_share : Infinity, cy ? cy.from_share : Infinity, dp ? dp.from_share : Infinity];
  // Which of the four the look lets in (eddies, ovals, poles, depth): createWorldWeather's setLook() writes it.
  const state = { face: null, still, periodDays: cy ? cy.period_days : 0, wallMs: NaN, lines, wake: null, allow: [true, true, true, true] };
  function wear(face) {
    state.face = face;
    oval.fill(0); ovalRate.fill(0);
    ((ov && ov[face]) || []).slice(0, OVAL_SLOTS).forEach((o, i) => { oval.set(o.slice(0, 4), i * 4); ovalRate[i] = still ? 0 : 1 / o[4]; });
    if (dp) { const g = dp.gap_lum[face] || dp.gap_lum.own; u.uWxDeep.value.x = g[0]; u.uWxDeep.value.y = g[1]; }
    // The wake goes with the spot, wherever this face has it.
    const s = u.uWxSpot.value;
    state.wake = ed && ed.wake && s.z > 0 ? wakeLine({ u: s.x, v: s.y, half_u: s.z, half_v: s.w }, profile, ed.wake) : null;
    if (state.wake) putEddy(lines.length, eddyRow(state.wake.line, state.wake.win));
    else { eddy.fill(0, lines.length * 4, lines.length * 4 + 4); }
  }
  state.step = (share, dt, uniforms) => {
    const face = ownSpot && Math.abs(uniforms.uWxSpot.value.x - ownSpot.u) > 1e-6 ? 'hubble' : 'own';
    if (face !== state.face) wear(face);
    const near = uniforms.uWxNear.value;
    const k = ['x', 'y', 'z', 'w'];
    for (let i = 0; i < 4; i++) {
      const want = state.allow[i] && Number.isFinite(from[i]) ? nearShare(share, from[i]) : 0;
      const stepMax = dt / NEAR_FADE_S;
      near[k[i]] = !(stepMax < 1) ? want : near[k[i]] + Math.max(-stepMax, Math.min(stepMax, want - near[k[i]]));
    }
  };
  wear('own');
  return state;
}

const KIND_KEY = { 'shear-eddies': 'eddies', ovals: 'ovals', 'polar-cyclones': 'cyclones', 'cloud-depth': 'depth', 'zonal-flow': 'flow', hexagon: 'hexagon', 'mars-season': 'mars', 'giant-lightning': 'flash', 'planetary-wave': 'wave', 'cloud-patches': 'patches' };

/** The registry's rows by world: {flow, hexagon, mars, flash, wave, patches, eddies, ovals, cyclones, depth}, each a row or undefined. */
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
  let look = 'film';
  /** Is this registry row drawn under the look that is on? No row is not drawn. */
  const drawn = (row) => !!row && drawnUnder(look, row.measured);
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
      if (fx.eddies || fx.ovals || fx.cyclones || fx.depth) {
        entry.storms = dressStorms(u, fx, reducedMotion);
        material.defines.WX_STORMS = 1;
      }
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
    entry.defines = material.defines;
    worn.push(entry);
  }

  /**
   * Measured or Film: each row asked once, and what is `hidden` taken out by the uniform that means none.
   * Returns true when the look changed.
   */
  function setLook(next) {
    const want = next === 'measured' ? 'measured' : 'film';
    if (want === look) return false;
    look = want;
    for (const e of worn) {
      const u = e.material.uniforms;
      const fx = e.fx;
      if (u.uWxHex && fx.hexagon) u.uWxHex.value.x = drawn(fx.hexagon) ? hexagonCornerRad(fx.hexagon.hexagon) : 0;
      if (u.uWxWave && fx.wave) u.uWxWave.value.x = drawn(fx.wave) ? fx.wave.wave.depth : 0;
      if (e.storms) e.storms.allow = [drawn(fx.eddies), drawn(fx.ovals), drawn(fx.cyclones), drawn(fx.depth)];
      if (e.mars && !drawn(e.mars)) { const v = u.uWxCap.value; v.x = 2; v.y = -2; v.z = 0; e.season = null; }
      if (u.uWxPatch && fx.patches) {
        if (!e.patchFull) e.patchFull = u.uWxPatch.value.slice();
        if (drawn(fx.patches)) u.uWxPatch.value.set(e.patchFull); else u.uWxPatch.value.fill(0);
      }
      if (e.flash && !drawn(fx.flash)) { e.flash.uniform.fill(0); e.flash.lit = 0; }
    }
    lastMs = NaN; // the next update writes the clock's numbers again (Mars's caps, back in Film)
    return true;
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
      if (!e.mesh.visible || !drawn(e.fx.flash)) { if (f.lit) { f.uniform.fill(0); f.lit = 0; } continue; }
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
    // The close-range terms follow the camera, not the clock: a held clock still lets them in.
    for (const e of worn) {
      if (!e.storms || !e.mesh.visible) continue;
      const share = worlds && worlds.discShare ? worlds.discShare(e.id) : 0;
      const dt = Number.isFinite(e.storms.wallMs) ? Math.max(0, (wallMs - e.storms.wallMs) / 1000) : Infinity;
      e.storms.wallMs = wallMs;
      e.storms.step(share, reducedMotion ? Infinity : dt, e.material.uniforms);
    }
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
        // The cyclones turn on the clock, wrapped to one turn; where less motion is asked for they stand.
        if (e.storms && e.storms.periodDays && !reducedMotion) u.uWxPole.value.y = wavePhase(tMs, e.storms.periodDays, 1);
      } else if (e.mars && drawn(e.mars)) {
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
      delete d.WX_STORMS; delete d.WX_ZONAL; delete d.WX_MARS; delete d.WX_PATCH; delete d.WX_FLASH;
      e.material.defines = d;
      e.material.needsUpdate = true;
    }
  }

  /**
   * The quality setting's Low was left (scene/quality.js qualityPlan): the weather is worn again.
   * The real latch never calls this; main.js keeps the two apart.
   */
  function unlatch() {
    if (!latched) return;
    latched = false;
    lastMs = NaN;
    for (const e of worn) {
      e.material.fragmentShader = fragment;
      e.material.defines = { ...(e.material.defines || {}), ...e.defines };
      e.material.needsUpdate = true;
    }
  }

  return {
    update,
    latch,
    unlatch,
    setLook,
    look: () => look,
    /** What of this world's rows is drawn now, by the registry's key (flow, hexagon, mars, flash, wave, patches, eddies, ovals, cyclones, depth). */
    drawnOf(id) {
      const e = !latched && worn.find((x) => x.id === id);
      const out = {};
      if (e) for (const [k, row] of Object.entries(e.fx)) out[k] = drawn(row);
      return out;
    },
    /** Does the look change anything on this world (has it a row that Measured takes off or holds)? */
    lookMatters: (id) => worn.some((x) => x.id === id && Object.values(x.fx).some((row) => row.measured === 'hidden' || row.measured === 'still')),
    /** Which worlds wear weather now. Empty after the latch. */
    worn: () => (latched ? [] : worn.map((e) => e.id)),
    /** Does this world show lightning (a row, and motion allowed, and no latch)? */
    flashing: (id) => !latched && worn.some((e) => e.id === id && !!e.flash && drawn(e.fx.flash)),
    /** Does this world wear the close-range storms: 'moving', 'still' (less motion asked for), or null? */
    storms: (id) => { const e = !latched && worn.find((x) => x.id === id && !!x.storms); return e ? (e.storms.still ? 'still' : 'moving') : null; },
    /** For the probes and the card: the season on Mars, each flow's cycle, the latch. */
    state: () => ({
      latched,
      look,
      worlds: worn.map((e) => ({
        id: e.id,
        cycleDays: e.flow ? e.flow.cycleDays : null,
        rigid: e.flow ? e.flow.rigid : null,
        phase: e.flow ? { ...e.material.uniforms.uWxPhase.value } : null,
        season: e.season || null,
        wave: e.wave ? e.material.uniforms.uWxWave.value.y : null,
        flashes: e.flash ? { slots: e.flash.slots.length, lit: e.flash.lit } : null,
        storms: e.storms ? { near: { ...e.material.uniforms.uWxNear.value }, face: e.storms.face, turn: e.material.uniforms.uWxPole.value.y, still: e.storms.still } : null,
      })),
    }),
  };
}
