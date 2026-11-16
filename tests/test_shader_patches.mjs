// tests/test_shader_patches.mjs -- every shader the app patches by its text is still patched on the tree a deploy builds.
//
// WHY (review of 2026-11-16). Several modules make one shader out of another by replacing a line of
// its text: the weather on every world (scene/weather/worldweather.js weatherFragment), the faint
// rings (faintFragment), the map tiles (scene/tiles.js), the fuller star field and the stars' motion
// (scene/stars3dtree.js, scene/stardeep.js), the ring grains (scene/ringgrains.js) and the models'
// materials (scene/pbr.js, scene/models.js, over three.js's own shaders). A deploy does not upload the
// text of the repository: scripts/minify_site.py strips the comments and the indentation of every
// shader (scripts/strip_shaders.py) and minifies the modules. weatherFragment anchored on a GLSL
// COMMENT and faintFragment on INDENTED lines, so both matched here and threw on the live site: no
// lightning, no moving air on the giants and Venus, no Mars season and no faint rings for any visitor,
// with every test green, because every test read the repository's tree.
//
// So this test only imports modules and calls them, and reads no source file as text: it is in
// scripts/check_built_tree.mjs TESTS, which runs it against the built tree before a deploy uploads a
// byte (scripts/deploy.sh) and in CI (tests/test_minify_real.mjs), as well as against site/ as
// written (ci.yml). The rule for an anchor is in tests/test_shader_anchors_src.mjs.
//   node tests/test_shader_patches.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const E = await import(join(JS, 'scene/earth.js'));
const WX = await import(join(JS, 'scene/weather/worldweather.js'));
const T = await import(join(JS, 'scene/tiles.js'));
const S3 = await import(join(JS, 'scene/stars3d.js'));
const TREE = await import(join(JS, 'scene/stars3dtree.js'));
const DEEP = await import(join(JS, 'scene/stardeep.js'));
const SF = await import(join(JS, 'scene/starfield.js'));
const G = await import(join(JS, 'scene/ringgrains.js'));
const P = await import(join(JS, 'scene/pbr.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
let patches = 0;
/** Run one patch; a throw is a failure with the patch's own words. Returns the text, or ''. */
function patched(name, fn) {
  patches++;
  try {
    const out = fn();
    check(typeof out === 'string' && out.length > 0, `${name}: gave no shader`);
    return typeof out === 'string' ? out : '';
  } catch (err) {
    problems.push(`${name}: ${err.message}`);
    return '';
  }
}
/** `text` holds every one of `parts`, and none of `gone`. */
function holds(name, text, parts, gone = []) {
  for (const p of parts) check(text.includes(p), `${name}: the patched shader lacks "${p}"`);
  for (const g of gone) check(!text.includes(g), `${name}: the patched shader still has "${g}"`);
}
const count = (text, part) => text.split(part).length - 1;

// ---- 1. the weather on every world, and the faint rings (scene/weather/worldweather.js) -----------------
{
  const wx = patched('weatherFragment', () => WX.weatherFragment());
  holds('weatherFragment', wx, ['wxBase( vUv )', 'colour += wxFlash( vPosL, d );', 'vec3 wxFlash(', 'uWxFlash'], [WX.MAP_LINE]);
  // The declarations are in once, and before the code that calls them.
  check(count(wx, 'vec3 wxFlash( vec3 posL, float sunDot )') >= 1 && wx.indexOf('vec3 wxFlash(') < wx.indexOf('colour += wxFlash('), 'weatherFragment: wxFlash is declared before it is called');
  check(wx.indexOf('wxBase(') < wx.indexOf(WX.PARS_ANCHOR), 'weatherFragment: the declarations stand before the anchor');
  for (const a of [WX.MAP_LINE, WX.OUT_LINE, WX.PARS_ANCHOR]) {
    check(a === a.trim() && !a.includes('\n') && !a.includes('//') && !a.includes('/*'), `worldweather.js: the anchor "${a}" is one trimmed line of code, not a comment`);
    check(count(W.WORLD_FRAG, a) === 1, `WORLD_FRAG holds "${a}" ${count(W.WORLD_FRAG, a)} times, not once`);
  }
  const faint = patched('faintFragment', () => WX.faintFragment());
  holds('faintFragment', faint, ['uniform vec3 uThin;', 'uniform vec3 uHalo;', 'uniform vec3 uCeil;', 'float tau = tex.a * uThin.x;', 'float rl = length( vPosL.xy );',
    'float dust = uThin.y;', 'dustPhase( cosAlpha, uThin.z )', 'light = uCeil * ( 1.0 - exp( -light / uCeil ) );'],
  ['float tau = -log( 1.0 - alpha );', 'float S;', 'RING_DUST_COLOUR * fine', 'exp( -tau / m0 )']);
  check(count(faint, '{') === count(faint, '}'), 'faintFragment: the braces still pair after the slab is replaced');
}

// ---- 2. the map tiles (scene/tiles.js) ---------------------------------------------------------------------
{
  const tf = patched('tileFragment', () => T.tileFragment());
  holds('tileFragment', tf, ['gl_FragColor = vec4( colour, uFade );', 'uniform sampler2D uBaseMap;', 'uniform sampler2D uHtMap;', 'vec2 reliefUv = vUvGlobe;', 'texture2D( uBaseMap, vUvGlobe )', '* relief * castLit;'],
    ['gl_FragColor = vec4( colour, 1.0 );']);
  const tv = patched('tileVertex', () => T.tileVertex());
  holds('tileVertex', tv, ['vUvGlobe = uvGlobe;', 'attribute vec2 uvGlobe;', 'vFragDepth = 1.0 + gl_Position.w *']);
  const ef = patched('earthTileFragment', () => T.earthTileFragment());
  holds('earthTileFragment', ef, ['uniform sampler2D uTile;', 'uniform vec3 uTileGrade;', 'texture2D( uTile, vUvTile )', 'vec3 ground = mix( dayTex,']);
  const ev = patched('earthTileVertex', () => T.earthTileVertex());
  holds('earthTileVertex', ev, ['vUvTile = uvTile;', 'attribute vec2 uvTile;', 'vFragDepth = 1.0 + gl_Position.w *']);
  check(typeof E.SURFACE_FRAG === 'string' && typeof E.SURFACE_VERT === 'string', 'scene/earth.js exports the two shaders the Earth tiles patch');
}

// ---- 3. the stars: the fuller field and the motion (scene/stars3dtree.js, scene/stardeep.js) ----------------
{
  const fv = patched('faintVert', () => TREE.faintVert(S3.STARS3D_VERT) || '');
  holds('faintVert', fv, ['uniform float uFaintPast;', 'uMagLimit + uFaintPast', 'smoothstep( uMagLimit, uMagLimit + 1.0, m )'], ['vAlpha = ( m > uMagLimit ) ? 0.0', 'float sizePx = size * uPixelRatio * uScale;']);
  const p3 = patched('patchStarShader(stars3d)', () => DEEP.patchStarShader(S3.STARS3D_VERT, 'stars3d'));
  holds('patchStarShader(stars3d)', p3, ['attribute vec4 aMove;', 'vec3 srP = position + aMove.xyz * uYears;', 'm = aAppMag + aDMag;', 'length( srP - cameraPosition )', 'm = aAbsMag + aDMag + 5.0', 'uHideUnmoved > 0.5'],
    ['vec4( position, 1.0 )', 'm = aAppMag;']);
  // The two together, as scene/stars3dtiles.js and stardeep.js leave a tile's material.
  const both = patched('patchStarShader(faintVert)', () => DEEP.patchStarShader(TREE.faintVert(S3.STARS3D_VERT) || '', 'stars3d'));
  holds('patchStarShader(faintVert)', both, ['uFaintPast', 'aDMag', 'srP']);
  const pf = patched('patchStarShader(starfield)', () => DEEP.patchStarShader(SF.STAR_VERT, 'starfield'));
  holds('patchStarShader(starfield)', pf, ['normalize( position + aMove.xyz * uYears )', 'uHideUnmoved > 0.5'], ['vec4( position, 1.0 )']);
}

// ---- 4. the ring grains' vertex shader (scene/ringgrains.js) ------------------------------------------------
{
  const gv = patched('grainsVertex', () => G.grainsVertex(W.RING_U_GLSL, 4));
  holds('grainsVertex', gv, ['float ringMapU( float r )', '* 4.0'], ['#RING_U_GLSL#', '#FINE_MAX#']);
}

// ---- 5. the models' materials, over three.js's own shaders (scene/pbr.js, scene/models.js) ------------------
{
  const std = THREE.ShaderLib.standard;
  patches++;
  for (const finish of Object.keys(P.FINISHES || { paint: 1 })) {
    const out = P.patchShaders(std.vertexShader, std.fragmentShader, finish);
    check(out.missing.length === 0, `pbr patchShaders(${finish}): three.js's shader has no ${out.missing.join(', ')}`);
  }
  // scene/models.js patches the toon shader inline (onBeforeCompile): its two hooks are in three.js's text once each.
  patches++;
  const toon = THREE.ShaderLib.toon.fragmentShader;
  for (const hook of ['void main() {', '#include <opaque_fragment>']) check(count(toon, hook) === 1, `models.js: three.js's toon fragment shader has "${hook}" ${count(toon, hook)} times, not once`);
}

if (problems.length) { console.error('shader patches FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`shader patches ok: ${patches} patches of a shader's text (weather, faint rings, tiles, stars, ring grains, model materials) found every line they change on this tree`);
