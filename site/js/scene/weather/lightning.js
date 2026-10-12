// scene/weather/lightning.js -- lightning on the Earth's night side, where NOAA counted it.
//
// Contract: createLightning({ earth, camera, now, fetchImpl, decodeImage, onChange })
//   -> { start(), tick(tMs, opts), state(), line(clockMs), credit(), perMinute(), dispose() }
//
// WHAT IS DRAWN. NOAA's map of strikes per square kilometre per minute over the last quarter hour
// (data/lightning.js says what was measured about it). Each second of the clock gets the number of
// flashes that rate means, placed where the map has lightning. A flash is a point of light that
// rises in a few milliseconds, flickers through two or three return strokes and is gone in a third
// of a second -- only on the night side, because from orbit that is the only place a flash shows.
//
// HONESTY (registry/weather.yaml `earth-lightning`, class measured):
//   * where and how often are measured; the instant of each flash is drawn at random at that rate;
//   * the map covers the Americas, the Atlantic to Greenwich and the Pacific to 110 E. Nothing is
//     drawn anywhere else, and the card says so rather than filling Africa in from a climatology;
//   * a flash lights some tens of kilometres of cloud top. It is drawn at FLASH_KM across and never
//     smaller than MIN_PX, so from far away it is larger than life, like every glyph on the map;
//   * with the clock more than an hour from the map's time the flashes stop and the card says why.
//
// OFF: at tier 0, on a connection that saves data (main.js never imports this file there), with
// the layer's box unticked, under the frame latch, with the Earth a dot, and whenever the visitor
// asks for reduced motion -- a flash is a flash.
//
// COST. One draw call of at most FLASH_SLOTS points, no texture. One 10 kB capabilities document
// and one ~7 kB picture every fifteen minutes while the tab is visible and the layer is on.

import * as THREE from '../../../vendor/three.module.min.js';
import {
  CAPS_URL, GRID_W, GRID_H, REFRESH_MS, START_DELAY_MS,
  mapUrl, parseNewestSlot, decodeGrid, flashModel, flashesInSecond, lightningMode,
} from '../../data/lightning.js';
import { WGS84_A_KM, WGS84_B_KM } from '../earth.js';
import { COPY, t, fmt, ageInWords } from '../../copy/en.js';

/** Flashes alive at once. A flash lives FLASH_LIFE_S, so this is 48 a second with room to spare. */
export const FLASH_SLOTS = 64;
/** How long one flash is on screen, seconds: a stroke and its re-strokes. */
export const FLASH_LIFE_S = 0.38;
/** The lit cloud top, km across, and the height it is drawn at. */
export const FLASH_KM = 90;
export const FLASH_ALTITUDE_KM = 12;
/** Never smaller than this on screen (CSS px), never larger. */
export const MIN_PX = 3.5;
export const MAX_PX = 40;
/** The Sun this far below the horizon and the flash is at full strength; above `lit`, none. */
export const NIGHT = { dark: -0.10, lit: 0.0 };
/** No draw call for an Earth smaller than this share of half the view's height. */
export const MIN_DISC_SHARE = 0.03;
/** More than this many seconds of the clock in one frame is scrubbing: only the last one is drawn. */
export const MAX_SECONDS_PER_FRAME = 2;

const VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec2 aFlash;      // when it began (seconds on the module's own clock) and how bright
uniform float uNow;
uniform vec3 uSunDirLocal;
uniform float uPxPerUnit;   // device pixels a scene unit covers at distance 1
uniform vec2 uSizePx;       // the smallest and the largest a flash is drawn, device pixels
uniform float uSizeUnits;
varying float vGlow;
void main() {
  float age = uNow - aFlash.x;
  float k = 0.0;
  if ( age >= 0.0 && age < ${FLASH_LIFE_S.toFixed(2)} ) {
    // The first stroke and two fainter ones after it, each a fast rise and a 30 ms decay.
    k = exp( -age / 0.035 );
    if ( age > 0.09 ) k += 0.6 * exp( -( age - 0.09 ) / 0.03 );
    if ( age > 0.19 ) k += 0.4 * exp( -( age - 0.19 ) / 0.04 );
  }
  vec3 n = normalize( position );
  float night = 1.0 - smoothstep( ${NIGHT.dark.toFixed(2)}, ${NIGHT.lit.toFixed(2)}, dot( n, uSunDirLocal ) );
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vec3 toCam = cameraPosition - worldPos.xyz;
  float dist = length( toCam );
  // The far side of the globe, and the last few degrees before the limb, where a point would sit
  // on the air's edge.
  float facing = dot( normalize( mat3( modelMatrix ) * n ), toCam / dist );
  vGlow = k * aFlash.y * night * smoothstep( 0.02, 0.2, facing );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  gl_PointSize = vGlow > 0.001 ? clamp( uSizeUnits * uPxPerUnit / dist, uSizePx.x, uSizePx.y ) : 0.0;
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uGain;
varying float vGlow;
void main() {
  #include <logdepthbuf_fragment>
  vec2 d = gl_PointCoord - 0.5;
  // A bright core in a soft glow: light scattered up through the cloud.
  float r2 = dot( d, d ) * 4.0;
  float a = exp( -r2 * 5.0 ) + 0.35 * exp( -r2 * 1.6 );
  if ( r2 > 1.0 ) discard;
  gl_FragColor = vec4( uColour * ( vGlow * a * uGain ), 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** A place on the Earth in the Earth mesh's own axes, FLASH_ALTITUDE_KM up. */
export function flashPosition(latDeg, lonDeg, out = [0, 0, 0]) {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  const k = 1 + FLASH_ALTITUDE_KM / WGS84_A_KM;
  out[0] = Math.cos(la) * Math.cos(lo) * k;
  out[1] = Math.sin(la) * (WGS84_B_KM / WGS84_A_KM) * k;
  out[2] = -Math.cos(la) * Math.sin(lo) * k;
  return out;
}

/** The card's line (copy/en.js COPY.weather.lightning), by what is held and where the clock is. */
export function lightningLine(s, clockMs, wallMs) {
  const C = COPY.weather.lightning;
  if (s.phase === 'off') return s.reason === 'reducedMotion' ? C.reducedMotion : C.off;
  if (s.phase === 'failed' && !Number.isFinite(s.slotMs)) return C.failed;
  if (!Number.isFinite(s.slotMs)) return C.waiting;
  if (!s.on) return C.switchedOff;
  if (lightningMode(clockMs, s.slotMs) !== 'live') return C.away;
  const time = `${new Date(s.slotMs).toISOString().slice(11, 16)} UTC`;
  const ago = ageInWords(Math.max(0, wallMs - s.slotMs));
  if (!(s.perMin >= 1)) return t(C.quiet, { time, ago });
  return t(C.live, { n: fmt.int(Math.round(s.perMin / 10) * 10 || Math.round(s.perMin)), time, ago });
}

const wallNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** A PNG's bytes as RGBA, in the browser: decoded as it is, no colour conversion, no premultiply. */
async function decodeInBrowser(blob) {
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(bmp.width, bmp.height)
    : Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height });
  const g = canvas.getContext('2d', { willReadFrequently: true });
  g.drawImage(bmp, 0, 0);
  if (bmp.close) bmp.close();
  return { data: g.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
}

export function createLightning({
  earth, camera = null, now = () => Date.now(), fetchImpl = (u, o) => fetch(u, o),
  decodeImage = decodeInBrowser, reducedMotion = false, onChange = () => {},
} = {}) {
  const st = {
    phase: reducedMotion ? 'off' : 'waiting',   // waiting | looking | live | failed | off
    reason: reducedMotion ? 'reducedMotion' : null,
    slotMs: NaN,
    perMin: 0,
    cells: 0,
    unknown: 0,
    looks: 0,
    failures: 0,
    lastError: null,
    bytes: 0,
    on: true,
    drawn: 0,       // flashes started since boot, for the probes
    visible: false,
    mode: 'none',
  };
  const earthMesh = () => (typeof earth === 'function' ? earth() : earth);
  let model = null;
  let points = null;
  let flashAttr = null;
  let posAttr = null;
  let slot = 0;
  let timer = 0;
  let busy = false;
  let started = false;
  let lastSecond = null;
  const epoch = wallNow();
  const nowS = () => (wallNow() - epoch) / 1000;
  const pending = [];   // flashes of this second not yet begun: {latDeg, lonDeg, tMs, energy}
  const _p = [0, 0, 0];

  function build(parent) {
    const geo = new THREE.BufferGeometry();
    posAttr = new THREE.BufferAttribute(new Float32Array(FLASH_SLOTS * 3), 3);
    flashAttr = new THREE.BufferAttribute(new Float32Array(FLASH_SLOTS * 2).fill(-1e6), 2);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    flashAttr.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < FLASH_SLOTS; i++) posAttr.setXYZ(i, 1, 0, 0);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aFlash', flashAttr);
    const earthU = parent.material && parent.material.uniforms;
    const material = new THREE.ShaderMaterial({
      name: 'earth-lightning',
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uNow: { value: 0 },
        // The Earth's own vector, shared by reference: updateEarth() writes it every frame.
        uSunDirLocal: earthU && earthU.uSunDirLocal ? earthU.uSunDirLocal : { value: new THREE.Vector3(1, 0, 0) },
        uPxPerUnit: { value: 800 },
        uSizePx: { value: new THREE.Vector2(MIN_PX, MAX_PX) },
        uSizeUnits: { value: FLASH_KM / WGS84_A_KM },
        // Lightning through cloud: white with the blue of the nitrogen lines.
        uColour: { value: new THREE.Color(0.72, 0.80, 1.0) },
        uGain: { value: 2.2 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Points(geo, material);
    m.name = 'earth-lightning';
    // After the Earth (0), its air (1) and the aurora (2): additive, in a fixed order.
    m.renderOrder = 3;
    m.frustumCulled = false;
    m.visible = false;
    m.userData.kind = 'lightning';
    m.userData.cls = 'measured';
    parent.add(m);
    parent.userData.lightning = m;
    return m;
  }

  async function look() {
    if (busy || st.phase === 'off') return;
    if (typeof document !== 'undefined' && document.hidden) return;
    busy = true;
    st.looks++;
    if (!model) st.phase = 'looking';
    try {
      const caps = await fetchImpl(CAPS_URL);
      if (!caps.ok) throw new Error(`capabilities ${caps.status}`);
      const slotMs = parseNewestSlot(await caps.text());
      if (!Number.isFinite(slotMs)) throw new Error('the capabilities document names no newest time');
      if (model && slotMs === model.slotMs) { st.phase = 'live'; return; }
      const res = await fetchImpl(mapUrl(slotMs));
      if (!res.ok) throw new Error(`map ${res.status}`);
      const blob = await res.blob();
      st.bytes = blob.size || 0;
      const img = await decodeImage(blob);
      if (img.width !== GRID_W || img.height !== GRID_H) throw new Error(`the picture is ${img.width} x ${img.height}`);
      const grid = decodeGrid(img.data, img.width, img.height);
      model = flashModel(grid.cells, slotMs);
      st.slotMs = slotMs;
      st.perMin = grid.perMin;
      st.cells = grid.cells.length;
      st.unknown = grid.unknown;
      st.phase = 'live';
      st.lastError = null;
      lastSecond = null;
    } catch (e) {
      st.failures++;
      st.lastError = String((e && e.message) || e);
      if (!model) st.phase = 'failed';
    } finally {
      busy = false;
      onChange();
    }
  }

  function begin(f, startS) {
    flashPosition(f.latDeg, f.lonDeg, _p);
    posAttr.setXYZ(slot, _p[0], _p[1], _p[2]);
    flashAttr.setXY(slot, startS, f.energy);
    slot = (slot + 1) % FLASH_SLOTS;
    posAttr.needsUpdate = true;
    flashAttr.needsUpdate = true;
    st.drawn++;
  }

  const api = {
    /** After the layers have landed. `elapsedMs`: how much of START_DELAY_MS has already passed. */
    start({ elapsedMs = 0 } = {}) {
      if (started || st.phase === 'off') return;
      started = true;
      setTimeout(() => {
        look();
        timer = setInterval(() => { if (st.on) look(); }, REFRESH_MS);
      }, Math.max(0, START_DELAY_MS - elapsedMs));
    },
    /** For a probe or a test: look now, whatever the timer says. */
    lookNow: () => look(),
    /**
     * Every frame, after the Earth's update. `on` the layer's box; `latched` the frame latch;
     * `reducedMotion` the visitor's setting (read every frame: it can change); `discShare` how big
     * the Earth is drawn; `viewportH` the canvas's height in device pixels.
     */
    tick(tMs, { on = true, latched = false, reducedMotion: rm = false, discShare = 1, viewportH = 800, pixelRatio = 1 } = {}) {
      st.on = on;
      if (rm && st.phase !== 'off') { st.phase = 'off'; st.reason = 'reducedMotion'; onChange(); }
      const mode = model ? lightningMode(tMs, model.slotMs) : 'none';
      if (mode !== st.mode) { st.mode = mode; onChange(); }
      const show = !!model && on && !latched && st.phase !== 'off' && mode === 'live' && discShare >= MIN_DISC_SHARE;
      if (!show) {
        if (points) points.visible = false;
        st.visible = false;
        lastSecond = null;
        pending.length = 0;
        return;
      }
      const parent = earthMesh();
      if (!parent) return;
      if (!points) points = build(parent);
      points.visible = true;
      st.visible = true;
      const s = nowS();
      // The clock's whole seconds since the last frame, each with the flashes its rate means. A
      // jump (a scrub, a pause released) starts again from the second the clock is in.
      const second = Math.floor(tMs / 1000);
      if (lastSecond === null || second < lastSecond || second - lastSecond > MAX_SECONDS_PER_FRAME) {
        pending.length = 0;
        lastSecond = second - 1;
      }
      for (let k = lastSecond + 1; k <= second; k++) for (const f of flashesInSecond(model, k)) pending.push(f);
      lastSecond = second;
      // A flash begins when the clock reaches its instant, so at 1x a second's flashes are spread
      // over that second; with the clock faster they come as fast as it runs.
      for (let i = pending.length - 1; i >= 0; i--) {
        if (pending[i].tMs <= tMs) { begin(pending[i], s); pending.splice(i, 1); }
      }
      const u = points.material.uniforms;
      u.uNow.value = s;
      const fov = camera && camera.fov ? camera.fov : 45;
      u.uPxPerUnit.value = (viewportH / 2 / Math.tan((fov * Math.PI) / 360)) * parent.scale.x;
      u.uSizePx.value.set(MIN_PX * pixelRatio, MAX_PX * pixelRatio);
    },
    state: () => ({ ...st }),
    /** The Earth card's line and the Sources panel's. */
    line: (clockMs) => lightningLine(st, clockMs, now()),
    credit: () => [COPY.weather.lightning.credit],
    /** The layers panel's number: strikes a minute in the map held, undefined before one is. */
    perMinute: () => (model ? Math.round(st.perMin) : st.phase === 'failed' || st.phase === 'off' ? 0 : undefined),
    dispose() {
      clearInterval(timer);
      if (points) {
        if (points.parent) points.parent.remove(points);
        points.geometry.dispose();
        points.material.dispose();
        points = null;
      }
    },
  };
  return api;
}
