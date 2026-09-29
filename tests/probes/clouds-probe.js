// Probe for tools/cdp.mjs: the live clouds against NASA GIBS as it is right now (2026-09-28).
//
//   python3 tools/serve.py . 8506 &
//   node tools/cdp.mjs 'http://127.0.0.1:8506/site/js/data/gibs.js' tests/probes/clouds-probe.js \
//     --block=celestrak.org,ll.thespacedevs.com
//
// Any page on the server will do: it imports the modules and asks GIBS itself (about 700 KB). It
// returns, per satellite, the slots listed and tried (and which were the black blank), the bytes
// and times, where the disc's centre and edges fall on the equator row (the check behind
// data/gibs.js GEO_SATELLITES), how much of the grey is tinted by the JPEG (the reason
// scene/cloudcompose.js reads the nearest palette bin), and the calibration behind
// cloudcompose.js CLEAR_*: live temperature quantiles inside the discs against the static cloud
// map's coverage quantiles, by latitude band. Then the composite's time and mean coverage.
//
// On a heavily loaded machine cdp.mjs can evaluate before the navigation lands (it then reports
// {href: 'about:blank'}); run it again, or add a wait for Page.loadEventFired to a local copy.
if (!location.href.startsWith('http')) return { href: location.href };
const g = await import('/site/js/data/gibs.js');
const cc = await import('/site/js/scene/cloudcompose.js');
const W = g.IMAGE_W;
const H = g.IMAGE_H;
const BANDS = [[0, 20], [20, 40], [40, 60]];
const PS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const quantiles = (arr) => {
  if (!arr.length) return [];
  const a = Float32Array.from(arr).sort();
  return PS.map((p) => +a[Math.min(a.length - 1, Math.floor(p * a.length))].toFixed(1));
};
const band = (lat) => BANDS.findIndex(([a, b]) => Math.abs(lat) >= a && Math.abs(lat) < b);
const out = { at: new Date().toISOString(), sats: [], liveTempC: {}, staticCoverage: {} };
const temps = BANDS.map(() => []);
const opacities = [];
const now = Date.now();
for (const sat of g.GEO_SATELLITES) {
  const t0 = performance.now();
  const rec = { id: sat.id, tries: [] };
  const xml = await (await fetch(g.domainsUrl(sat.layer, now))).text();
  rec.listed = g.candidateSlots(g.parseDomains(xml), now).map(g.isoMinute);
  for (const slot of g.candidateSlots(g.parseDomains(xml), now)) {
    const blob = await (await fetch(g.mapUrl(sat.layer, slot))).blob();
    rec.tries.push([g.isoMinute(slot), blob.size]);
    if (blob.size < g.BLANK_MAX_BYTES) continue;
    rec.fetchMs = Math.round(performance.now() - t0);
    rec.slot = g.isoMinute(slot);
    const bm = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const cv = new OffscreenCanvas(W, H);
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bm, 0, 0);
    const px = cx.getImageData(0, 0, W, H).data;
    // The disc on the equator row: the longest dark run is outside it.
    const row = H / 2;
    const lit = new Uint8Array(W);
    for (let x = 0; x < W; x++) { const p = (row * W + x) * 4; lit[x] = px[p] + px[p + 1] + px[p + 2] > 0 ? 1 : 0; }
    let best = 0; let bestStart = 0; let run = 0; let start = 0;
    for (let k = 0; k < 2 * W; k++) {
      if (!lit[k % W]) { if (run === 0) start = k; run++; if (run > best && run <= W) { best = run; bestStart = start; } } else run = 0;
    }
    const discW = W - best;
    rec.discCentreLonDeg = +(-180 + ((((bestStart + best) % W) + discW / 2) % W) / W * 360).toFixed(2);
    rec.discHalfWidthDeg = +((discW / W) * 180).toFixed(2);
    // The JPEG's colour bleed on greys.
    let grey = 0; let tinted = 0;
    for (let i = 0; i < px.length; i += 4) {
      const hi = Math.max(px[i], px[i + 1], px[i + 2]); const lo = Math.min(px[i], px[i + 1], px[i + 2]); const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (v > 40 && v < 190 && hi - lo <= 40) { grey++; if (hi - lo >= 20) tinted++; }
    }
    rec.greyTintedFrac = +(tinted / grey).toFixed(4);
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
      const { latDeg, lonDeg } = cc.pixelLatLon(x, y, W, H);
      if (cc.angleFromSubPointDeg(latDeg, lonDeg, sat.subLonDeg) > 60) continue;
      const bi = band(latDeg);
      if (bi < 0) continue;
      const p = (y * W + x) * 4;
      temps[bi].push(cc.readPixel(px[p], px[p + 1], px[p + 2]).tC);
    }
    const t1 = performance.now();
    opacities.push({ opacity: cc.satelliteOpacity(px, W, H, sat.subLonDeg), subLonDeg: sat.subLonDeg });
    rec.opacityMs = Math.round(performance.now() - t1);
    rec.bytes = blob.size;
    break;
  }
  out.sats.push(rec);
}
BANDS.forEach(([a, b], i) => { out.liveTempC[`${a}-${b}`] = quantiles(temps[i]); });
const img = await createImageBitmap(await (await fetch('/site/textures/2k_earth_clouds.webp')).blob(), { colorSpaceConversion: 'none' });
const sc = new OffscreenCanvas(img.width, img.height);
const sx = sc.getContext('2d', { willReadFrequently: true });
sx.drawImage(img, 0, 0);
const sd = sx.getImageData(0, 0, img.width, img.height).data;
const st = BANDS.map(() => []);
for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2) {
  const bi = band(90 - ((y + 0.5) / img.height) * 180);
  if (bi >= 0) st[bi].push(sd[(y * img.width + x) * 4] / 255);
}
BANDS.forEach(([a, b], i) => { out.staticCoverage[`${a}-${b}`] = quantiles(st[i]); });
const t2 = performance.now();
const comp = cc.composeClouds(opacities, W, H);
out.composeMs = Math.round(performance.now() - t2);
let sum = 0; let n = 0;
for (let i = 0; i < comp.length; i += 2) if (comp[i + 1] > 250) { sum += comp[i]; n++; }
out.meanOpacityWhereLive = +(sum / n / 255).toFixed(3);
out.liveFractionOfPixels = +(n / (W * H)).toFixed(3);
return out;
