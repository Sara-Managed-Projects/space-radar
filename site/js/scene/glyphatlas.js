// scene/glyphatlas.js — the 2D class glyphs, drawn at runtime.
//
// No binary asset and no build step: the atlas is painted with Canvas2D into a THREE.CanvasTexture
// the first time it is asked for. Nine class shapes (plus a plain disc for `world`) live in a 4x4
// grid of 128 px cells inside a 512 px texture.
//
// Encoding, so the palette survives tinting:
//   red channel  = 0 on the outline, 1 on the fill (the shader mixes `space` -> the class colour)
//   alpha        = shape coverage
// The 1.5 px dark outline the design language allows on 2D glyphs ONLY is baked in here as a
// centred stroke of R*0.25, which lands at ~1.5 CSS px when the glyph draws at its 12-14 px clamp
// and thins with it below that. There is no outline anywhere in models.js.

import * as THREE from '../../vendor/three.module.min.js';

export const ATLAS_SIZE = 512;
export const ATLAS_GRID = 4; // 4x4 cells
export const CELL_PX = ATLAS_SIZE / ATLAS_GRID; // 128
export const HALO_BIAS = ATLAS_GRID * ATLAS_GRID; // cell + 16 == "draw the sample halo too"

// The class table from docs/design-language.md, verbatim. Shared by glyphs.js and models.js so the
// nine hexes exist once. Adding a class is a row here plus a shape in SHAPES below.
export const PALETTE = {
  space: '#0B0E14',
  spaceEdge: '#05070A',
  ember: '#FF9F43',
  text: '#E8ECF2',
  textDim: '#9AA4B2',
  atmosphere: '#6EC3FF',
  nightLights: '#FFC98A',
};

export const CLASS_COLOURS = {
  station: '#F2F4F7',
  satellite: '#7FD1FF',
  debris: '#7A8494',
  rocket: '#FFD166',
  probe: '#C3A6FF',
  telescope: '#9EF0D8',
  asteroid: '#B8926A',
  comet: '#D9F3FF',
  site: '#F58F7C',
  world: '#E8ECF2',
  star: '#FFF3C4', // warm white: a point of light, not a made thing
  exoplanet: '#8EE3A8', // a green no natural star has: a world, and not one of ours
  dso: '#D8B4FF', // lilac: a cloud of light, not a point
  exotic: '#FF8FA3', // a warning pink: something extreme
  // 2026-09-28, the storm layer. Weather is not in the design language's class table, which is
  // about things in space; this is the one class ON the Earth that moves. Periwinkle: calm (no
  // alarm red, docs/design-language.md), clear of satellite sky blue and probe lavender, and it
  // reads over white cloud, which is where every storm glyph is drawn.
  storm: '#9DB4FF',
};

// cell index by class name. Order is the design language's class table.
export const CELL_OF = {
  station: 0,
  satellite: 1,
  debris: 2,
  rocket: 3,
  probe: 4,
  telescope: 5,
  asteroid: 6,
  comet: 7,
  site: 8,
  world: 9,
  star: 10, // cells 10..15 of the 4x4 grid were free; HALO_BIAS only encodes the halo bit
  exoplanet: 11,
  dso: 12,
  exotic: 13,
  storm: 14, // the fifteenth cell
  // The sixteenth and last: a spacecraft with people in it (glyphFor below). Not a class -- a
  // Soyuz is a satellite in the catalogue -- so it has no colour of its own and no row in
  // GLYPH_CLASSES' consumers; it is a SHAPE, in whatever colour its layer draws.
  crewed: 15,
};

export const GLYPH_CLASSES = Object.keys(CELL_OF);

// Layer glyph names that are not classes of their own. A layer says `glyph: 'train'`; it is a row
// here, not a tenth shape, because a train of satellites is still a satellite.
export const GLYPH_ALIASES = {
  train: 'satellite',
  // A member of a constellation thousands strong stays a plain dot (glyphFor): the `world` cell
  // is that disc, and the atlas has no seventeenth cell to paint another.
  dot: 'world',
  // The atlas is a 4x4 grid and HALO_BIAS = 16 consumes the upper half, so there is no eleventh
  // cell to paint. That is what this table is for. `probe` violet reads as "a made thing, out
  // there", is distinct from satellites, and does not carry debris grey's implication of junk.
  oddity: 'probe',
  'just-launched': 'rocket',
  'upper-stage': 'rocket',
  stage: 'rocket',
  pad: 'site',
  dish: 'site',
  observatory: 'site',
  planet: 'world',
  moon: 'world',
};

// WHICH SHAPE A RECORD IS DRAWN AS (issue #394). The class decides, with two exceptions that the
// catalogue's classes cannot make: a crew vehicle is told from the cargo ships and the satellites
// it is filed among, because "are there people in that one" is the first question anybody asks of
// a dot near a station; and the mega-constellations keep the plain dot, because nine thousand
// winged pictograms are a texture, not information. Names, because the catalogue has no field for
// either. Debris and spent stages never match: they are their own classes.
const CREWED = /\b(soyuz|crew dragon|shenzhou|starliner|mengzhou)\b/i;
const SWARM = /^(starlink|oneweb|kuiper|qianfan|guowang|hulianwang)\b/i;
/** @returns {string} a key of CELL_OF or GLYPH_ALIASES */
export function glyphFor(record, layer) {
  const klass = (record && record.klass) || (layer && (layer.klass || layer.glyph));
  const name = record && record.name;
  if (name && (klass === 'station' || klass === 'satellite')) {
    if (CREWED.test(name)) return 'crewed';
    if (klass === 'satellite' && SWARM.test(name)) return 'dot';
  }
  return klass;
}

/** Cell index for a class name or a layer's glyph name; anything unknown is a satellite. */
export function glyphCell(klass) {
  const key = GLYPH_ALIASES[klass] || klass;
  const c = CELL_OF[key];
  return c === undefined ? CELL_OF.satellite : c;
}

/**
 * UV of a cell's lower-left corner, for a texture with the three.js default flipY = true.
 * Sample with `uv = vec2(u0, v0) + q / ATLAS_GRID`, q in [0,1]^2 running right and up.
 */
export function cellUV(klassOrIndex) {
  const i = typeof klassOrIndex === 'number' ? klassOrIndex : glyphCell(klassOrIndex);
  const col = i % ATLAS_GRID;
  const row = Math.floor(i / ATLAS_GRID); // 0 = top row of the canvas
  const s = 1 / ATLAS_GRID;
  return { u0: col * s, v0: 1 - (row + 1) * s, size: s, index: i };
}

// ---------------------------------------------------------------------------- shape drawing

const INK = 'rgb(0,0,0)'; // r = 0 -> the outline colour
const FILL = 'rgb(255,255,255)'; // r = 1 -> the class colour

// Deterministic hash, so the asteroid potato is the same potato on every machine and every reload.
// (Math.random is not used anywhere in this project.)
function hash01(n) {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

function paint(ctx, path, R, { fill = true, outline = true, rule = 'nonzero' } = {}) {
  if (outline) {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = R * 0.25;
    ctx.stroke(path);
  }
  if (fill) {
    ctx.fillStyle = FILL;
    ctx.fill(path, rule);
  }
}

function disc(cx, cy, r) {
  const p = new Path2D();
  p.arc(cx, cy, r, 0, Math.PI * 2);
  p.closePath();
  return p;
}

function annulus(cx, cy, rOuter, rInner) {
  const p = new Path2D();
  p.arc(cx, cy, rOuter, 0, Math.PI * 2);
  p.closePath();
  p.arc(cx, cy, rInner, 0, Math.PI * 2);
  p.closePath();
  return p;
}

function roundedSquare(cx, cy, half, radius) {
  const p = new Path2D();
  const x = cx - half;
  const y = cy - half;
  const w = half * 2;
  p.moveTo(x + radius, y);
  p.lineTo(x + w - radius, y);
  p.quadraticCurveTo(x + w, y, x + w, y + radius);
  p.lineTo(x + w, y + w - radius);
  p.quadraticCurveTo(x + w, y + w, x + w - radius, y + w);
  p.lineTo(x + radius, y + w);
  p.quadraticCurveTo(x, y + w, x, y + w - radius);
  p.lineTo(x, y + radius);
  p.quadraticCurveTo(x, y, x + radius, y);
  p.closePath();
  return p;
}

function polygon(points) {
  const p = new Path2D();
  points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
}

// Each shape draws inside a box of 2*R centred on (cx, cy). R is 0.294 of the cell, so the glyph
// box is 58.8 % of the cell: the quad is drawn 1.7x the requested pixel size and the shape then
// lands at exactly the requested size.
const SHAPES = {
  // large white square with a ring — the thing a beginner came for
  station(ctx, cx, cy, R) {
    paint(ctx, annulus(cx, cy, R * 1.0, R * 0.82), R * 0.7);
    paint(ctx, roundedSquare(cx, cy, R * 0.55, R * 0.2), R);
  },
  // a four-point sparkle -- what a child draws when asked for a star, which is the brief
  star(ctx, cx, cy, R) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 4;
      const r = i % 2 === 0 ? R * 0.95 : R * 0.3;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    paint(ctx, polygon(pts), R);
  },
  // a disc with one orbiting dot: a planet, and its star implied
  exoplanet(ctx, cx, cy, R) {
    paint(ctx, disc(cx, cy, R * 0.55), R);
    paint(ctx, disc(cx + R * 0.72, cy - R * 0.55, R * 0.22), R * 0.5);
  },
  // a soft blob: a disc inside a wide ring, the way a nebula looks in a small telescope
  dso(ctx, cx, cy, R) {
    paint(ctx, annulus(cx, cy, R * 0.95, R * 0.7), R * 0.6);
    paint(ctx, disc(cx, cy, R * 0.45), R);
  },
  // the weather map's tropical-cyclone symbol: an eye with two curled arms, turned the way the
  // storm turns in the northern hemisphere, where most of them are (anticlockwise seen from above)
  storm(ctx, cx, cy, R) {
    const arms = new Path2D();
    for (const s of [1, -1]) {
      // A quarter-turn spiral from the eye's rim outward, one arm and its point-mirror.
      const x0 = cx + s * R * 0.34;
      const y0 = cy;
      arms.moveTo(x0, y0);
      arms.bezierCurveTo(cx + s * R * 0.42, cy - s * R * 0.62, cx + s * R * 0.05, cy - s * R * 0.95, cx - s * R * 0.62, cy - s * R * 0.86);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = R * 0.34 + R * 0.25;
    ctx.stroke(arms);
    // evenodd, so the eye stays open: both circles of annulus() run the same way round.
    paint(ctx, annulus(cx, cy, R * 0.5, R * 0.2), R, { rule: 'evenodd' });
    ctx.strokeStyle = FILL;
    ctx.lineWidth = R * 0.34;
    ctx.stroke(arms);
  },
  // a ring with a dark centre: a black hole's shadow, which is also the shape of the one photograph
  exotic(ctx, cx, cy, R) {
    paint(ctx, annulus(cx, cy, R * 0.9, R * 0.45), R);
  },
  // a plain disc
  // A bus between two wings: wider than it is tall, which is the whole of what survives at 8 px
  // and is enough to tell a working satellite from a shard, a stage or a plain dot.
  satellite(ctx, cx, cy, R) {
    const wings = new Path2D();
    wings.rect(cx - R, cy - R * 0.19, R * 2, R * 0.38);
    paint(ctx, wings, R);
    paint(ctx, roundedSquare(cx, cy, R * 0.47, R * 0.14), R);
  },
  // A capsule, blunt end down: the one silhouette with a flat base and a round top.
  crewed(ctx, cx, cy, R) {
    const p = new Path2D();
    p.moveTo(cx - R * 0.9, cy + R * 0.62);
    p.lineTo(cx + R * 0.9, cy + R * 0.62);
    p.lineTo(cx + R * 0.46, cy - R * 0.5);
    p.quadraticCurveTo(cx, cy - R * 1.08, cx - R * 0.46, cy - R * 0.5);
    p.closePath();
    paint(ctx, p, R);
  },
  // jagged triangle: three spikes, shallow waists
  // A shard: five corners, no two alike, seeded so it is the same chip on every machine.
  debris(ctx, cx, cy, R) {
    const pts = [[-0.85, 0.3], [-0.15, -0.82], [0.3, -0.12], [0.88, 0.02], [0.18, 0.8]].map(
      ([x, y], i) => [cx + x * R * (0.94 + 0.06 * hash01(i * 7 + 1)), cy + y * R],
    );
    paint(ctx, polygon(pts), R);
  },
  // A spent stage: a tube lying at an angle with an engine bell on its low end. The slant is what
  // tells it from a satellite's level wings when both are 9 px across.
  rocket(ctx, cx, cy, R) {
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);
    const h = R * 0.38;
    const body = new Path2D();
    body.moveTo(-R * 0.42, -h);
    body.lineTo(R * 0.52, -h);
    body.quadraticCurveTo(R * 0.9, 0, R * 0.52, h);
    body.lineTo(-R * 0.42, h);
    body.closePath();
    const bell = polygon([[-R * 0.42, -R * 0.16], [-R * 0.9, -R * 0.44], [-R * 0.9, R * 0.44], [-R * 0.42, R * 0.16]]);
    paint(ctx, bell, R);
    paint(ctx, body, R);
  },
  probe(ctx, cx, cy, R) {
    const w = R * 0.2;
    const p = polygon([
      [cx, cy - R],
      [cx + w, cy - w],
      [cx + R, cy],
      [cx + w, cy + w],
      [cx, cy + R],
      [cx - w, cy + w],
      [cx - R, cy],
      [cx - w, cy - w],
    ]);
    paint(ctx, p, R * 0.7);
    paint(ctx, disc(cx, cy, R * 0.44), R);
  },
  // disc with a soft halo (the halo carries no outline — it is light, not an edge)
  telescope(ctx, cx, cy, R) {
    const g = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill(disc(cx, cy, R));
    paint(ctx, disc(cx, cy, R * 0.52), R);
  },
  // irregular potato, seeded so it is identical everywhere
  asteroid(ctx, cx, cy, R) {
    const n = 11;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = R * (0.66 + 0.26 * hash01(i * 31 + 17));
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const p = new Path2D();
    p.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const cur = pts[i];
      const next = pts[(i + 1) % n];
      p.quadraticCurveTo(cur[0], cur[1], (cur[0] + next[0]) / 2, (cur[1] + next[1]) / 2);
    }
    p.closePath();
    paint(ctx, p, R);
  },
  // disc with a short tail (anti-sunward is the model's job; the glyph just reads as a comet)
  comet(ctx, cx, cy, R) {
    const p = new Path2D();
    p.moveTo(cx + R * 0.1, cy - R * 0.3);
    p.quadraticCurveTo(cx - R * 0.5, cy - R * 0.42, cx - R * 1.0, cy - R * 0.06);
    p.quadraticCurveTo(cx - R * 0.5, cy + R * 0.1, cx + R * 0.1, cy + R * 0.3);
    p.closePath();
    paint(ctx, p, R * 0.75);
    paint(ctx, disc(cx + R * 0.34, cy, R * 0.5), R);
  },
  // a map pin, always on the surface, never floating
  site(ctx, cx, cy, R) {
    const top = cy - R * 0.28;
    const r = R * 0.56;
    const p = new Path2D();
    p.moveTo(cx - r * Math.cos(Math.PI / 6), top + r * Math.sin(Math.PI / 6));
    p.arc(cx, top, r, Math.PI - Math.PI / 6, Math.PI / 6, true);
    p.lineTo(cx, cy + R * 0.98);
    p.closePath();
    paint(ctx, p, R);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill(disc(cx, top, r * 0.36));
    ctx.globalCompositeOperation = 'source-over';
  },
  // fallback for worlds and anything unknown
  world(ctx, cx, cy, R) {
    paint(ctx, disc(cx, cy, R * 0.9), R);
  },
};

/**
 * Paint the atlas into a canvas. Exported so a test page can look at it.
 * @param {HTMLCanvasElement} canvas
 */
export function drawGlyphAtlas(canvas) {
  const size = canvas.width;
  const cell = size / ATLAS_GRID;
  const R = cell * 0.294;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  for (const [name, index] of Object.entries(CELL_OF)) {
    const col = index % ATLAS_GRID;
    const row = Math.floor(index / ATLAS_GRID);
    const cx = col * cell + cell / 2;
    const cy = row * cell + cell / 2;
    ctx.save();
    SHAPES[name](ctx, cx, cy, R);
    ctx.restore();
  }
  return canvas;
}

/**
 * One shape alone, in one ink, for a legend: the same drawing the atlas holds, so the key can
 * never show a shape the sky does not.
 * @param {HTMLCanvasElement} canvas square
 * @param {string} name a key of CELL_OF or GLYPH_ALIASES
 * @param {string} [colour]
 */
export function drawGlyphIcon(canvas, name, colour = '#000') {
  const s = canvas.width;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, s, s);
  const shape = SHAPES[GLYPH_ALIASES[name] || name] || SHAPES.world; // an unknown bucket is a plain dot
  ctx.save();
  shape(ctx, s / 2, s / 2, s * 0.4);
  ctx.restore();
  // Keep the fill and drop the keyline (red is 0 on it): inked in as well, a station's ring and
  // square closed up into a disc, and four classes in the key were the same blob.
  const img = ctx.getImageData(0, 0, s, s);
  if (img && img.data) {
    for (let i = 0; i < img.data.length; i += 4) img.data[i + 3] = (img.data[i + 3] * img.data[i]) / 255;
    ctx.putImageData(img, 0, 0);
  }
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}

let cached = null;

/**
 * The atlas texture. Built once, on first use.
 * Returns null where there is no DOM (node, a worker) — callers treat a null map as "no glyphs yet"
 * rather than throwing, because degrading is better than going dark.
 * @returns {THREE.CanvasTexture|null}
 */
export function getGlyphAtlas() {
  if (cached !== null) return cached;
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  drawGlyphAtlas(canvas);
  const tex = new THREE.CanvasTexture(canvas);
  // The red channel is a mask, not a colour: decoding it as sRGB would bend the outline mix.
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  cached = tex;
  return cached;
}

/** Drop the cached texture (a page teardown; the tests). */
export function disposeGlyphAtlas() {
  if (cached) cached.dispose();
  cached = null;
}
