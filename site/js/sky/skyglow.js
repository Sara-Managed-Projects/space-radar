// sky/skyglow.js -- how dark the sky of a place is likely to be, read from the night lights of the
// Earth (internal #357).
//
// Contract:
//   darknessFromLights(v)                 -> 'city' | 'town' | 'dark'   (pure)
//   lightsPixel(latDeg, lonDeg, w, h)     -> { x, y } in an equirectangular map (pure)
//   sampleNightLights(url, latDeg, lonDeg) -> Promise<number | null>   0 to 1; null when it cannot be read
// Loaded by sky/skyview.js with a dynamic import when the sky view opens and the visitor has not
// chosen a kind of sky themselves.
//
// THE SOURCE is the map the Earth already wears at night: textures/4k/earth_night.webp, NASA Earth
// Observatory's Black Marble 2016 (Suomi NPP VIIRS day/night band), resampled to 4096 x 2048, so a
// pixel is about nine kilometres at the equator. No request leaves the site and the place is never
// sent anywhere: the file is fetched whole and one spot of it is read here.
//
// WHAT IT IS NOT. An estimate, not a measurement of sky brightness: the map is upward light in
// 2016 with its levels matched to another map (CREDITS.md section 2), a town's glow reaches
// farther than its own pixel, and the Moon, haze and the street lamp beside the visitor are not in
// it. So it sets one of three words, says where the word came from, and the visitor's own choice
// always wins. The two thresholds were read off the file on 2026-10-06: the centres of London, New
// York, Tokyo, Moscow, Paris and Cairo are 0.87 to 0.97; Bath, Cambridge, Boulder, Tartu,
// Flagstaff, Suzdal and Alice Springs 0.12 to 0.46; Galloway Forest, Exmoor, Cherry Springs,
// Death Valley, the Atacama and the open Atlantic 0.00 to 0.07.

export const CITY_FROM = 0.6;
export const TOWN_FROM = 0.1;

export function darknessFromLights(v) {
  if (!Number.isFinite(v)) return null;
  if (v >= CITY_FROM) return 'city';
  if (v >= TOWN_FROM) return 'town';
  return 'dark';
}

export function lightsPixel(latDeg, lonDeg, w, h) {
  const x = Math.floor((((lonDeg + 180) % 360 + 360) % 360) / 360 * w) % w;
  const y = Math.max(0, Math.min(h - 1, Math.floor((90 - latDeg) / 180 * h)));
  return { x, y };
}

/** Half the pixel under the place, half the mean of the eight around it. `px` is 9 values, row by row. */
export function lightsValue(px) {
  if (!px || px.length !== 9) return null;
  let ring = 0;
  for (let i = 0; i < 9; i += 1) if (i !== 4) ring += px[i];
  return (0.5 * px[4] + 0.5 * ring / 8) / 255;
}

export async function sampleNightLights(url, latDeg, lonDeg) {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return null;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const bitmap = await createImageBitmap(await r.blob());
    const { x, y } = lightsPixel(latDeg, lonDeg, bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = 3;
    canvas.height = 3;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    // Three columns, wrapped at the date line; rows are clamped at the poles.
    for (let i = -1; i <= 1; i += 1) {
      const sx = (x + i + bitmap.width) % bitmap.width;
      for (let j = -1; j <= 1; j += 1) {
        const sy = Math.max(0, Math.min(bitmap.height - 1, y + j));
        g.drawImage(bitmap, sx, sy, 1, 1, i + 1, j + 1, 1, 1);
      }
    }
    if (typeof bitmap.close === 'function') bitmap.close();
    const d = g.getImageData(0, 0, 3, 3).data;
    const px = [];
    for (let k = 0; k < 9; k += 1) px.push(d[k * 4]);
    return lightsValue(px);
  } catch {
    return null;
  }
}
