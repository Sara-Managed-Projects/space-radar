// scene/earthoverlay.js -- one measured map laid over the Earth: sea temperature, plankton, rain...
//
// Contract: createEarthOverlay({ earth, saveData?, now?, onChange? }) ->
//             { set(id | null), state(), update(), dispose() }
//   state() -> { id, status, title, what, cls, legend, credit, date, dateWords, rule }
//   status: 'off' | 'loading' | 'shown' | 'failed' | 'no-earth'
//
// OFF THE FIRST VISIT. main.js imports this file the first time an overlay is asked for: by a
// trip stop (`overlay:` in registry/tours.yaml) or by What to show (ui/overlaypanel.js). Then it
// asks NASA GIBS for ONE picture (registry/overlays.yaml says which, and what was measured about
// the service), and for nothing again until another overlay or another day is asked for.
//
// WHAT IS DRAWN. The picture as GIBS colours it, on a shell a third of a per cent above the
// ground, sharing the Earth's own sphere so it cannot slip against the map under it. It is a MAP
// OF DATA, not a photograph: it is drawn over the clouds, on the night side as well as the day
// (dimmed there, so the terminator still reads), and the stop card and the panel print its
// legend, the day it is of and whose data it is. Where the picture has no data it is clear and
// the Earth shows through.
//
// A PICTURE THAT IS NOT THERE YET. GIBS answers a day it has not made with an empty picture, not
// an error (measured: 8 221 bytes). Anything under the registry's `blank_bytes` is that, and the
// next date back is tried (data/overlaytime.js overlayDates).

import * as THREE from '../../vendor/three.module.min.js';
import { OVERLAYS, OVERLAY_SERVICE } from '../data/overlays.js';
import { overlayDates, overlayUrl, dateInWords, overlayById } from '../data/overlaytime.js';

/** The shell's radius over the ground's: clear of the surface at any zoom the camera reaches. */
export const SHELL_SCALE = 1.003;
export const FADE_MS = 900;
export const OPACITY = 0.9;
/** How bright the map is drawn on the night side, as a share of the day side. */
export const NIGHT_SHARE = 0.5;

const VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  vUv = uv;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uNight;
uniform vec3 uSunDir;
varying vec2 vUv;
varying vec3 vNormalW;
void main() {
  #include <logdepthbuf_fragment>
  vec4 c = texture2D( uMap, vUv );
  float a = c.a * uOpacity;
  if ( a <= 0.003 ) discard;
  float day = smoothstep( -0.15, 0.25, dot( normalize( vNormalW ), uSunDir ) );
  gl_FragColor = vec4( c.rgb * mix( uNight, 1.0, day ), a );
  #include <colorspace_fragment>
}
`;

export function createEarthOverlay(opts = {}) {
  const getEarth = typeof opts.earth === 'function' ? opts.earth : () => null;
  const nowMs = typeof opts.now === 'function' ? opts.now : () => Date.now();
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
  const scale = opts.saveData ? 0.5 : 1;
  const tick = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let mesh = null;
  let wanted = null; // the registry row asked for, or null
  let shown = null; // { row, date, texture }
  let status = 'off';
  let token = 0;
  let fade = { from: 0, to: 0, at: 0 };

  const uniforms = {
    uMap: { value: null },
    uOpacity: { value: 0 },
    uNight: { value: NIGHT_SHARE },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
  };

  function ensureMesh() {
    if (mesh) return mesh;
    const earth = getEarth();
    if (!earth || !earth.geometry) return null;
    mesh = new THREE.Mesh(earth.geometry, new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }));
    mesh.name = 'earth:overlay';
    mesh.scale.setScalar(SHELL_SCALE);
    mesh.renderOrder = 1;
    mesh.visible = false;
    earth.add(mesh);
    return mesh;
  }

  function fadeTo(to) {
    fade = { from: uniforms.uOpacity.value, to, at: tick() };
  }

  async function fetchPicture(row, my) {
    const dates = overlayDates(row.date, nowMs());
    for (const date of dates) {
      const res = await fetch(overlayUrl(OVERLAY_SERVICE, row, date, scale), { mode: 'cors' });
      if (my !== token) return null;
      if (!res.ok) continue;
      const blob = await res.blob();
      if (my !== token) return null;
      if (blob.size < (OVERLAY_SERVICE.blank_bytes || 0) * scale * scale) continue; // not made yet
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error('the picture did not decode'));
          i.src = url;
        });
        const texture = new THREE.Texture(img);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        return { row, date, texture };
      } finally {
        // The image is decoded; the texture uploads from it on the next frame, then it can go.
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }
    return null;
  }

  /** Show the overlay with this id, or none. Returns whether the id is one the registry has. */
  function set(id) {
    const row = id ? overlayById(OVERLAYS, id) : null;
    if ((row && wanted && row.id === wanted.id) || (!row && !wanted)) return !!row || !id;
    wanted = row;
    const my = ++token;
    if (!row) {
      status = 'off';
      fadeTo(0);
      onChange();
      return !id;
    }
    if (!ensureMesh()) {
      status = 'no-earth';
      onChange();
      return true;
    }
    status = 'loading';
    fadeTo(0);
    onChange();
    fetchPicture(row, my).then((pic) => {
      if (my !== token) { if (pic) pic.texture.dispose(); return; }
      if (!pic) { status = 'failed'; onChange(); return; }
      const old = shown;
      shown = pic;
      uniforms.uMap.value = pic.texture;
      uniforms.uOpacity.value = 0;
      if (old && old.texture !== pic.texture) old.texture.dispose();
      status = 'shown';
      fadeTo(OPACITY);
      onChange();
    }).catch((e) => {
      if (my !== token) return;
      status = 'failed';
      console.warn('earth overlay:', e);
      onChange();
    });
    return true;
  }

  /** Once a frame: the fade, and the Sun's direction from the Earth's own shader. */
  function update() {
    if (!mesh) return;
    const k = Math.min(1, (tick() - fade.at) / FADE_MS);
    const e = k * k * (3 - 2 * k);
    uniforms.uOpacity.value = fade.from + (fade.to - fade.from) * e;
    mesh.visible = uniforms.uOpacity.value > 0.003 && !!uniforms.uMap.value;
    const earth = mesh.parent;
    const sun = earth && earth.material && earth.material.uniforms && earth.material.uniforms.uSunDir;
    if (sun && sun.value) uniforms.uSunDir.value.copy(sun.value);
  }

  function state() {
    const row = wanted;
    const pic = shown && row && shown.row.id === row.id ? shown : null;
    return {
      id: row ? row.id : null,
      status,
      title: row ? row.title : '',
      what: row ? row.what : '',
      cls: row ? row.class : '',
      legend: row ? row.legend : null,
      credit: row ? row.credit : '',
      rule: row ? row.date.rule : '',
      date: pic ? pic.date : null,
      dateWords: pic ? dateInWords(pic.date, row.date) : '',
      opacity: uniforms.uOpacity.value,
    };
  }

  function dispose() {
    token++;
    if (shown) shown.texture.dispose();
    shown = null;
    if (mesh) {
      if (mesh.parent) mesh.parent.remove(mesh);
      mesh.material.dispose(); // the geometry is the Earth's own and stays
      mesh = null;
    }
  }

  return { set, state, update, dispose, list: () => OVERLAYS };
}
