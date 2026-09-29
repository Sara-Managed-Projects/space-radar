// scene/cloudcompose.js -- three coloured infrared pictures in, one cloud mask out.
//
// Pure arithmetic on typed arrays: no DOM, no three.js, no fetch. It runs in the worker
// (scene/cloudworker.js), on the main thread where there is no worker, and in Node for
// tests/test_liveclouds.mjs.
//
// THE INPUT (measured 2026-09-28, data/gibs.js). GIBS serves Band 13 as a JPEG coloured with its
// palette "Clean_Longwave_Infrared_Window_Band" -- 238 bins, one degree wide (half a degree from
// -31 C up), from -92 C to above +57 C, saved verbatim in
// tests/fixtures/gibs/Clean_Longwave_Infrared_Window_Band.xml and copied into IR_PALETTE below.
// Reading a temperature back out has two traps, and both are in the palette, not in the data:
//
//  1. TWO GREY RAMPS. -80 C to -71 C runs grey from 230 down to 5, and -19 C to +57 C runs grey
//     from 197 down to 1. A mid grey is either a storm top colder than -75 C or a sea at +5 C.
//     They are told apart by what surrounds them: the cold ramp only ever sits inside the pinks
//     and dark reds of the coldest tops (everything from -60 C to -81 C is coloured), so a
//     connected patch of grey whose coloured border is mostly those is the cold reading, and
//     every other grey is the warm one (settleGreys below says how, and why a patch, not a pixel).
//  2. BLACK IS THREE THINGS. Outside the disc (no data), -71 C (5,5,5) and +57 C (1,1,1). Outside
//     the disc is settled by geometry (satWeight); the other two by the same rule.
//
// And one trap in the JPEG. Its colour is stored at half resolution, so a grey next to a colour
// takes on a tint: MEASURED 2026-09-28 on all three pictures, 6-10 % of the near-grey pixels had
// channels up to 40 apart. The first version called anything 20 apart "coloured" and looked for the
// nearest coloured bin -- and a light grey tinted by a neighbouring cyan is nearer the pink -81 C
// bins than any other colour, so every cloud edge came out as a solid white outline. So a pixel is
// read as the NEAREST BIN OF THE WHOLE PALETTE, greys included: a tinted grey is still nearest a grey.
//
// THE OUTPUT. Two bytes a pixel, 2048 x 1024, rows SOUTH FIRST so it uploads as a DataTexture
// with three's default flipY = false and lines up with scene/earth.js's uv (v = 1 is north):
//   R = cloud opacity, 0..255, in the same "perceptual coverage" sense as the static cloud map,
//       which the shader raises to CLOUD_GAMMA the same way;
//   G = how much of this pixel the live pictures cover, 0..255. Where it is below 255 the shader
//       lets the static map through: the Europe, Africa and Indian Ocean gap and the poles.

/**
 * GIBS colormap "Clean_Longwave_Infrared_Window_Band" (v1.3), the <Entries> section, in order:
 * r, g, b and the MIDDLE of the bin in degrees C (the last bin, "(56.9,+INF)", is given 57.4).
 * tests/test_liveclouds.mjs re-reads the saved XML and refuses any difference.
 */
export const IR_PALETTE = [
  255, 255, 255, -91.6, 127, 0, 127, -90.6, 140, 13, 135, -89.6, 153, 25, 142, -88.6, 165, 38, 150, -87.6,
  178, 51, 157, -86.6, 191, 64, 165, -85.6, 204, 76, 173, -84.6, 217, 89, 180, -83.6, 229, 102, 188, -82.6,
  242, 114, 195, -81.6, 255, 127, 203, -80.6, 230, 230, 230, -79.6, 204, 204, 204, -78.6, 177, 177, 177, -77.6,
  155, 155, 155, -76.6, 129, 129, 129, -75.6, 102, 102, 102, -74.6, 76, 76, 76, -73.6, 54, 54, 54, -72.6,
  27, 27, 27, -71.6, 5, 5, 5, -70.6, 26, 0, 0, -69.6, 51, 0, 0, -68.6, 77, 0, 0, -67.6, 102, 0, 0, -66.6,
  128, 0, 0, -65.6, 153, 0, 0, -64.6, 179, 0, 0, -63.6, 204, 0, 0, -62.6, 230, 0, 0, -61.6, 255, 0, 0, -60.6,
  255, 26, 0, -59.6, 255, 51, 0, -58.6, 255, 77, 0, -57.6, 255, 102, 0, -56.6, 255, 128, 0, -55.6,
  255, 153, 0, -54.6, 255, 179, 0, -53.6, 255, 204, 0, -52.6, 255, 230, 0, -51.6, 255, 255, 0, -50.6,
  230, 255, 0, -49.6, 204, 255, 0, -48.6, 179, 255, 0, -47.6, 153, 255, 0, -46.6, 128, 255, 0, -45.6,
  102, 255, 0, -44.6, 77, 255, 0, -43.6, 51, 255, 0, -42.6, 26, 255, 0, -41.6, 0, 255, 0, -40.6, 0, 234, 10, -39.6,
  0, 212, 19, -38.6, 0, 191, 29, -37.6, 0, 170, 38, -36.6, 0, 149, 48, -35.6, 0, 128, 58, -34.6, 0, 106, 67, -33.6,
  0, 85, 77, -32.6, 0, 64, 86, -31.6, 0, 42, 96, -30.85, 0, 21, 105, -30.35, 0, 0, 115, -29.85, 0, 0, 125, -29.35,
  0, 13, 122, -28.85, 0, 26, 129, -28.35, 0, 38, 136, -27.85, 0, 51, 143, -27.35, 0, 64, 150, -26.85,
  0, 76, 157, -26.35, 0, 89, 164, -25.85, 0, 102, 171, -25.35, 0, 115, 178, -24.85, 0, 128, 185, -24.35,
  0, 140, 192, -23.85, 0, 153, 199, -23.35, 0, 166, 206, -22.85, 0, 178, 213, -22.35, 0, 191, 220, -21.85,
  0, 204, 227, -21.35, 0, 217, 234, -20.85, 0, 230, 241, -20.35, 0, 242, 248, -19.85, 0, 255, 255, -19.35,
  197, 197, 197, -18.85, 196, 196, 196, -18.35, 194, 194, 194, -17.85, 193, 193, 193, -17.35,
  192, 192, 192, -16.85, 191, 191, 191, -16.35, 189, 189, 189, -15.85, 188, 188, 188, -15.35,
  187, 187, 187, -14.85, 185, 185, 185, -14.35, 184, 184, 184, -13.85, 183, 183, 183, -13.35,
  181, 181, 181, -12.85, 180, 180, 180, -12.35, 179, 179, 179, -11.85, 178, 178, 178, -11.35,
  176, 176, 176, -10.85, 175, 175, 175, -10.35, 174, 174, 174, -9.85, 172, 172, 172, -9.35,
  171, 171, 171, -8.85, 170, 170, 170, -8.35, 169, 169, 169, -7.85, 167, 167, 167, -7.35, 166, 166, 166, -6.85,
  165, 165, 165, -6.35, 163, 163, 163, -5.85, 162, 162, 162, -5.35, 161, 161, 161, -4.85, 159, 159, 159, -4.35,
  158, 158, 158, -3.85, 157, 157, 157, -3.35, 156, 156, 156, -2.85, 154, 154, 154, -2.35, 153, 153, 153, -1.85,
  152, 152, 152, -1.35, 150, 150, 150, -0.85, 149, 149, 149, -0.35, 148, 148, 148, 0.15, 147, 147, 147, 0.65,
  145, 145, 145, 1.15, 144, 144, 144, 1.65, 143, 143, 143, 2.15, 141, 141, 141, 2.65, 140, 140, 140, 3.15,
  139, 139, 139, 3.65, 138, 138, 138, 4.15, 136, 136, 136, 4.65, 135, 135, 135, 5.15, 134, 134, 134, 5.65,
  132, 132, 132, 6.15, 131, 131, 131, 6.65, 130, 130, 130, 7.15, 128, 128, 128, 7.65, 127, 127, 127, 8.15,
  126, 126, 126, 8.65, 125, 125, 125, 9.15, 123, 123, 123, 9.65, 122, 122, 122, 10.15, 121, 121, 121, 10.65,
  119, 119, 119, 11.15, 118, 118, 118, 11.65, 117, 117, 117, 12.15, 116, 116, 116, 12.65, 114, 114, 114, 13.15,
  113, 113, 113, 13.65, 112, 112, 112, 14.15, 110, 110, 110, 14.65, 109, 109, 109, 15.15, 108, 108, 108, 15.65,
  106, 106, 106, 16.15, 105, 105, 105, 16.65, 104, 104, 104, 17.15, 103, 103, 103, 17.65, 101, 101, 101, 18.15,
  100, 100, 100, 18.65, 99, 99, 99, 19.15, 97, 97, 97, 19.65, 96, 96, 96, 20.15, 95, 95, 95, 20.65,
  94, 94, 94, 21.15, 92, 92, 92, 21.65, 91, 91, 91, 22.15, 90, 90, 90, 22.65, 88, 88, 88, 23.15, 87, 87, 87, 23.65,
  86, 86, 86, 24.15, 84, 84, 84, 24.65, 83, 83, 83, 25.15, 82, 82, 82, 25.65, 81, 81, 81, 26.15, 79, 79, 79, 26.65,
  78, 78, 78, 27.15, 77, 77, 77, 27.65, 75, 75, 75, 28.15, 74, 74, 74, 28.65, 73, 73, 73, 29.15, 72, 72, 72, 29.65,
  70, 70, 70, 30.15, 69, 69, 69, 30.65, 68, 68, 68, 31.15, 66, 66, 66, 31.65, 65, 65, 65, 32.15, 64, 64, 64, 32.65,
  62, 62, 62, 33.15, 61, 61, 61, 33.65, 60, 60, 60, 34.15, 59, 59, 59, 34.65, 57, 57, 57, 35.15, 56, 56, 56, 35.65,
  55, 55, 55, 36.15, 53, 53, 53, 36.65, 52, 52, 52, 37.15, 51, 51, 51, 37.65, 50, 50, 50, 38.15, 48, 48, 48, 38.65,
  47, 47, 47, 39.15, 46, 46, 46, 39.65, 44, 44, 44, 40.15, 43, 43, 43, 40.65, 42, 42, 42, 41.15, 41, 41, 41, 41.65,
  39, 39, 39, 42.15, 38, 38, 38, 42.65, 37, 37, 37, 43.15, 35, 35, 35, 43.65, 34, 34, 34, 44.15, 33, 33, 33, 44.65,
  31, 31, 31, 45.15, 30, 30, 30, 45.65, 29, 29, 29, 46.15, 28, 28, 28, 46.65, 26, 26, 26, 47.15, 25, 25, 25, 47.65,
  24, 24, 24, 48.15, 22, 22, 22, 48.65, 21, 21, 21, 49.15, 20, 20, 20, 49.65, 19, 19, 19, 50.15, 17, 17, 17, 50.65,
  16, 16, 16, 51.15, 15, 15, 15, 51.65, 13, 13, 13, 52.15, 12, 12, 12, 52.65, 11, 11, 11, 53.15, 9, 9, 9, 53.65,
  8, 8, 8, 54.15, 7, 7, 7, 54.65, 6, 6, 6, 55.15, 4, 4, 4, 55.65, 3, 3, 3, 56.15, 2, 2, 2, 56.65, 1, 1, 1, 57.4,
];

/** Colder than this and a bin is coloured, never grey, so it is a trustworthy "cold top" seed. */
export const COLD_SEED_C = -60;
/**
 * A grey patch is read cold when at least this share of the coloured pixels on its border are
 * cold tops (COLD_SEED_C or colder). A storm's grey core is ringed by pinks and dark reds; the
 * warm background is ringed by the cyans, blues and greens of ordinary cloud edges.
 */
export const COLD_BORDER_SHARE = 0.5;
/**
 * ...and never when it is bigger than this, in 2048-wide pixels (scaled for other sizes). The
 * biggest cold core on 2026-09-28's pictures, Polo's central overcast, was a few hundred pixels;
 * 4 000 is a 1 300 km square. The global warm background is one patch of 100 000+ and touches a
 * few isolated red specks, so without the cap it could flip whole.
 */
export const COLD_PATCH_MAX_PX = 4000;
/** Greys at or above this level and greys below it are separate patches (settleGreys says why). */
export const GREY_SPLIT = 128;
/**
 * Passes of a [1 2 1] / 4 blur over each satellite's opacity, both ways. GIBS's picture is 2 km
 * data drawn at 20 km: broken cirrus arrives as single coloured pixels among greys, which read
 * one by one as cloud, clear, cloud -- salt and pepper on the globe. Averaged over its neighbours,
 * a broken field is what it is, partial cover. Two passes is a blur about one pixel wide.
 */
export const BLUR_PASSES = 2;

/**
 * Brightness temperature to cloud opacity. The surface under a clear sky is warm, a cloud top is
 * colder the higher it is, so opacity rises linearly as the temperature falls below what clear sky
 * reads at that latitude, reaching 1 CLEAR_SPAN_C degrees colder.
 *
 * CALIBRATED, not guessed (2026-09-28, tests/probes/clouds-probe.js): the live temperatures inside
 * the three discs, by latitude band, quantile-matched against the static cloud map's coverage in
 * the same bands -- the static map is the look the Earth shader was tuned for, so the live deck
 * should be about as dense. Its 60th/70th/80th/90th percentiles of coverage (0.1-0.6) lined up
 * with the live pictures' coldest 40/30/20/10 % on one straight line per band, 70 C long in all
 * three, starting at +24 C from the equator to 30 degrees and falling 0.7 C a degree after that
 * (+10 C at 50 degrees). The coldest tops (-44 C and below on the equator) go to 1: those are
 * the thunderstorms, and they should be whiter than any painted cloud.
 *
 * Known limits, the same as every IR cloud map (study section 8): warm low stratus barely shows
 * (NASA's GOES GeoColor at 23:00 UTC that evening had bright stratocumulus off Peru that Band 13
 * reads as sea), and snow or a winter continent colder than the clear-sky line reads as thin cloud.
 */
export const CLEAR_AT_EQUATOR_C = 24;
export const CLEAR_FLAT_TO_DEG = 30;
export const CLEAR_LAPSE_C_PER_DEG = 0.7;
export const CLEAR_FLOOR_C = -15;
export const CLEAR_SPAN_C = 70;

export function clearSkyC(latDeg) {
  const beyond = Math.max(0, Math.abs(latDeg) - CLEAR_FLAT_TO_DEG);
  return Math.max(CLEAR_FLOOR_C, CLEAR_AT_EQUATOR_C - CLEAR_LAPSE_C_PER_DEG * beyond);
}

/** 0..1: how much cloud a pixel at `tC` degrees C and latitude `latDeg` is. */
export function irOpacity(tC, latDeg) {
  const o = (clearSkyC(latDeg) - tC) / CLEAR_SPAN_C;
  return o <= 0 ? 0 : o >= 1 ? 1 : o;
}

// --- colour to temperature ------------------------------------------------------------------

let binLut = null;

/**
 * For each 5-bit-per-channel colour, the nearest bin of the whole palette: its temperature when it
 * is a coloured bin, NaN when it is one of the grey ones (r = g = b), which readPixel settles by
 * brightness and neighbours instead. 32 768 cells x 238 bins, about 10 ms, once.
 */
function paletteLut() {
  if (binLut) return binLut;
  const bins = [];
  for (let i = 0; i < IR_PALETTE.length; i += 4) {
    const r = IR_PALETTE[i];
    const g = IR_PALETTE[i + 1];
    const b = IR_PALETTE[i + 2];
    bins.push([r, g, b, r === g && g === b ? NaN : IR_PALETTE[i + 3]]);
  }
  binLut = new Float32Array(32768);
  for (let q = 0; q < 32768; q++) {
    const r = ((q >> 10) << 3) + 4;
    const g = (((q >> 5) & 31) << 3) + 4;
    const b = ((q & 31) << 3) + 4;
    let best = Infinity;
    let t = NaN;
    for (const e of bins) {
      const d = (r - e[0]) ** 2 + (g - e[1]) ** 2 + (b - e[2]) ** 2;
      if (d < best) { best = d; t = e[3]; }
    }
    binLut[q] = t;
  }
  return binLut;
}

/** The warm grey ramp: 197 at -18.85 C down to 1 at +57.4 C, linear in the palette. */
export function warmGreyC(v) {
  if (v >= 197) return -18.85;
  if (v <= 1) return 57.4;
  return -18.85 + ((197 - v) * (57.4 + 18.85)) / 196;
}

/**
 * One pixel's reading. `kind` 0: nearest a coloured bin, and `tC` is that bin's temperature.
 * `kind` 1: nearest a grey bin, and `tC` is the WARM reading of its brightness; satelliteOpacity
 * swaps it for "solid cloud" when a cold top is near. Exported for the test.
 */
export function readPixel(r, g, b) {
  const tC = paletteLut()[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
  if (tC === tC) return { kind: 0, tC };   // not NaN: a coloured bin
  return { kind: 1, tC: warmGreyC((r + g + b) / 3) };
}

// --- geometry ---------------------------------------------------------------------------------

/**
 * Where the live picture is trusted, by the great-circle angle from the satellite's sub-point.
 * The disc reaches the limb at 81.3 degrees (acos(6378 / 42164)), but the last twenty degrees are
 * seen edge-on: at 62 degrees the view is already 70 degrees from straight down, and IR reads a
 * slanted path colder, so the edge of every disc looks cloudier than it is. Full trust to
 * SEAM_FULL_DEG, none from SEAM_ZERO_DEG, a smooth step between: that band is the soft seam with
 * the static map in the gap. Checked on 2026-09-28's pictures: GIBS draws nothing past ~81.
 */
export const SEAM_FULL_DEG = 62;
export const SEAM_ZERO_DEG = 78;

const DEG = Math.PI / 180;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Great-circle angle, degrees, from a geostationary sub-point on the equator. */
export function angleFromSubPointDeg(latDeg, lonDeg, subLonDeg) {
  const c = Math.cos(latDeg * DEG) * Math.cos((lonDeg - subLonDeg) * DEG);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

/** 0..1: how far this satellite's picture is trusted at a place (1 inside, 0 past the seam). */
export function satWeight(latDeg, lonDeg, subLonDeg) {
  return 1 - smoothstep(SEAM_FULL_DEG, SEAM_ZERO_DEG, angleFromSubPointDeg(latDeg, lonDeg, subLonDeg));
}

/**
 * Where two pictures overlap, the one seen more nearly straight down wins, smoothly: each is
 * weighted by its trust times cos(angle)^OVERLAP_POWER. GOES-East and GOES-West are 62 degrees
 * apart, so without this the middle of the Pacific-America overlap would be half of each.
 */
export const OVERLAP_POWER = 4;

/** Latitude and longitude of pixel (x, y) in a width x height equirectangular picture, north up. */
export function pixelLatLon(x, y, width, height) {
  return { latDeg: 90 - ((y + 0.5) / height) * 180, lonDeg: -180 + ((x + 0.5) / width) * 360 };
}

// --- one satellite's picture ---------------------------------------------------------------------

/**
 * Is this picture the all-black blank GIBS returns for a slot it has not drawn yet? The blank is
 * exact zeros; a real disc covers about a third of the globe. Fewer than 1 % lit pixels is blank.
 */
export function isBlank(rgba) {
  let lit = 0;
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 16) if (rgba[i] > 8 || rgba[i + 1] > 8 || rgba[i + 2] > 8) lit++;
  return lit < (n / 4) * 0.01;
}

/**
 * One satellite's RGBA picture to cloud opacity, 0..255, same size, north row first. Only the
 * pixels the satellite can be trusted for are worked out (satWeight > 0); the rest are 0.
 * @param {Uint8ClampedArray|Uint8Array} rgba  width * height * 4
 * @returns {Uint8Array} width * height
 */
export function satelliteOpacity(rgba, width, height, subLonDeg) {
  const n = width * height;
  const out = new Uint8Array(n);
  const kind = new Uint8Array(n);        // 0 outside the disc, 1 grey (ambiguous), 2 coloured
  const grey = new Uint8Array(n);        // a grey pixel's level
  const warm = new Uint8Array(n);        // the warm reading of a grey, 0..255
  const seed = new Uint8Array(n);        // 1 where a cold top is certain
  const lut = paletteLut();
  // The rows and columns the disc can reach, so the three passes skip the dark two thirds.
  const reach = SEAM_ZERO_DEG;
  const rowLat = new Float64Array(height);
  for (let y = 0; y < height; y++) rowLat[y] = 90 - ((y + 0.5) / height) * 180;

  for (let y = 0; y < height; y++) {
    const latDeg = rowLat[y];
    if (Math.abs(latDeg) >= reach) continue;
    // cos(angle) = cos(lat) cos(dlon) >= cos(reach)  <=>  |dlon| <= acos(cos(reach) / cos(lat))
    const k = Math.cos(reach * DEG) / Math.cos(latDeg * DEG);
    if (k >= 1) continue;
    const dLon = Math.acos(k) / DEG;
    const x0 = Math.floor(((subLonDeg - dLon + 180) / 360) * width);
    const x1 = Math.ceil(((subLonDeg + dLon + 180) / 360) * width);
    for (let xx = x0; xx <= x1; xx++) {
      const x = ((xx % width) + width) % width;
      const i = y * width + x;
      const p = i * 4;
      const r = rgba[p];
      const g = rgba[p + 1];
      const b = rgba[p + 2];
      const tC = lut[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)];
      if (tC === tC) {
        kind[i] = 2;
        out[i] = Math.round(255 * irOpacity(tC, latDeg));
        if (tC <= COLD_SEED_C) seed[i] = 1;
      } else {
        const v = (r + g + b) / 3;
        kind[i] = 1;
        grey[i] = v;
        warm[i] = Math.round(255 * irOpacity(warmGreyC(v), latDeg));
      }
    }
  }

  settleGreys(out, kind, grey, warm, seed, width, height);
  for (let k = 0; k < BLUR_PASSES; k++) blur121(out, width, height);
  return out;
}

/**
 * Every grey pixel gets its warm reading unless its PATCH is a cold core. Patches are 4-connected
 * greys on the same side of GREY_SPLIT: the cold ramp's light end (-80 C, grey 230) sits against
 * the pinks and its dark end (-71 C, grey 5) against the dark reds, while a warm grey patch --
 * including a hurricane's eye inside a cold ring, dark and warm -- is bordered by cloud-edge
 * colours or by greys of the other half. A patch is cold when COLD_BORDER_SHARE of its coloured
 * border is cold tops and it is no bigger than COLD_PATCH_MAX_PX.
 *
 * WHY A PATCH AND NOT A PIXEL (2026-09-28). A pixel rule ("a cold top within n pixels") failed
 * both ways on real pictures: with n = 2 it painted a white square round every isolated red
 * speck, and with n = 1 it read the middle of Polo's cold central overcast, far from any colour,
 * as warm sea, a black hole in a hurricane.
 */
function settleGreys(out, kind, grey, warm, seed, width, height) {
  const n = width * height;
  const label = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const members = new Int32Array(n);
  const maxPx = Math.max(16, Math.round(COLD_PATCH_MAX_PX * (width / 2048) * (width / 2048)));
  for (let start = 0; start < n; start++) {
    if (kind[start] !== 1 || label[start] >= 0) continue;
    const light = grey[start] >= GREY_SPLIT;
    let top = 0;
    let count = 0;
    let border = 0;
    let cold = 0;
    stack[top++] = start;
    label[start] = start;
    while (top > 0) {
      const i = stack[--top];
      members[count++] = i;
      const y = (i / width) | 0;
      const x = i - y * width;
      for (let k = 0; k < 4; k++) {
        let j;
        if (k === 0) j = y * width + (x === 0 ? width - 1 : x - 1);
        else if (k === 1) j = y * width + (x === width - 1 ? 0 : x + 1);
        else if (k === 2) { if (y === 0) continue; j = i - width; }
        else { if (y === height - 1) continue; j = i + width; }
        const kj = kind[j];
        if (kj === 1) {
          if (label[j] < 0 && (grey[j] >= GREY_SPLIT) === light) { label[j] = start; stack[top++] = j; }
        } else if (kj === 2) {
          border++;
          cold += seed[j];
        }
      }
    }
    const isCold = count <= maxPx && border > 0 && cold >= COLD_BORDER_SHARE * border;
    for (let m = 0; m < count; m++) {
      const i = members[m];
      out[i] = isCold ? 255 : warm[i];
    }
  }
}

/** One [1 2 1] / 4 pass each way, in place: wrapping in longitude, clamped at the poles. */
export function blur121(a, width, height) {
  const row = new Uint8Array(width);
  for (let y = 0; y < height; y++) {
    const o = y * width;
    row.set(a.subarray(o, o + width));
    for (let x = 0; x < width; x++) {
      const l = row[x === 0 ? width - 1 : x - 1];
      const r = row[x === width - 1 ? 0 : x + 1];
      a[o + x] = (l + 2 * row[x] + r + 2) >> 2;
    }
  }
  const col = new Uint8Array(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) col[y] = a[y * width + x];
    for (let y = 0; y < height; y++) {
      const u = col[y === 0 ? 0 : y - 1];
      const d = col[y === height - 1 ? height - 1 : y + 1];
      a[y * width + x] = (u + 2 * col[y] + d + 2) >> 2;
    }
  }
}

// --- the composite -----------------------------------------------------------------------------

/**
 * Per-pixel blend weights for the satellites at one place, and how much of the place they cover.
 * Exported so the test can check the seam without building a picture.
 * @param {Array<number>} subLons  sub-point longitude of every satellite that HAS a picture
 * @returns {{weights:number[], coverage:number}}  weights sum to 1 when coverage > 0
 */
export function blendAt(latDeg, lonDeg, subLons) {
  const weights = [];
  let sum = 0;
  let coverage = 0;
  for (const s of subLons) {
    const w = satWeight(latDeg, lonDeg, s);
    coverage = Math.max(coverage, w);
    const c = Math.cos(angleFromSubPointDeg(latDeg, lonDeg, s) * DEG);
    const bw = w * Math.pow(Math.max(0, c), OVERLAP_POWER);
    weights.push(bw);
    sum += bw;
  }
  return { weights: sum > 0 ? weights.map((w) => w / sum) : weights.map(() => 0), coverage };
}

/**
 * The texture: R = opacity, G = coverage, rows south first (see the header).
 * @param {Array<{opacity: Uint8Array|null, subLonDeg:number}>} sats  one entry per satellite; a
 *        satellite with no picture (null) covers nothing, so the static map shows through there.
 * @returns {Uint8Array} width * height * 2
 */
export function composeClouds(sats, width, height) {
  const out = new Uint8Array(width * height * 2);
  const have = sats.filter((s) => s && s.opacity);
  if (!have.length) return out;
  const subs = have.map((s) => s.subLonDeg);
  // Per row and satellite, only the columns the satellite can reach are worked out: MEASURED
  // 2026-09-28, doing the trig for every pixel of every satellite took 8.9 s on a loaded laptop.
  const wRow = have.map(() => new Float32Array(width));
  const bRow = have.map(() => new Float32Array(width));
  const cosReach = Math.cos(SEAM_ZERO_DEG * DEG);
  for (let y = 0; y < height; y++) {
    const latDeg = 90 - ((y + 0.5) / height) * 180;
    const cosLat = Math.cos(latDeg * DEG);
    for (let k = 0; k < have.length; k++) {
      const wr = wRow[k];
      const br = bRow[k];
      wr.fill(0);
      br.fill(0);
      const q = cosReach / cosLat;
      if (q >= 1) continue;
      const dLon = Math.acos(q) / DEG;
      const x0 = Math.floor(((subs[k] - dLon + 180) / 360) * width);
      const x1 = Math.ceil(((subs[k] + dLon + 180) / 360) * width);
      for (let xx = x0; xx <= x1; xx++) {
        const x = ((xx % width) + width) % width;
        const lonDeg = -180 + ((x + 0.5) / width) * 360;
        const c = cosLat * Math.cos((lonDeg - subs[k]) * DEG);
        if (c <= cosReach) continue;
        const w = 1 - smoothstep(SEAM_FULL_DEG, SEAM_ZERO_DEG, Math.acos(Math.min(1, c)) / DEG);
        const c2 = c * c;
        wr[x] = w;
        br[x] = w * c2 * c2; // OVERLAP_POWER = 4, without Math.pow
      }
    }
    const dst = (height - 1 - y) * width * 2;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let acc = 0;
      let cov = 0;
      for (let k = 0; k < have.length; k++) {
        const b = bRow[k][x];
        if (b > 0) { sum += b; acc += b * have[k].opacity[y * width + x]; }
        if (wRow[k][x] > cov) cov = wRow[k][x];
      }
      out[dst + x * 2] = sum > 0 ? Math.round(acc / sum) : 0;
      out[dst + x * 2 + 1] = Math.round(cov * 255);
    }
  }
  return out;
}
