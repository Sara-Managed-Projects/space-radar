// tests/test_liveclouds.mjs -- today's clouds from NASA GIBS (2026-09-28, realism study phase 2).
//
// No network. What is checked is every rule that decides what the Earth shows:
//   1. the GIBS URLs: layers, projection, box, size, TIME on a whole ten-minute slot;
//   2. DescribeDomains parsed, and the slots tried newest first, never an unlisted one, never one
//      already held -- on the answer GIBS really gave at 22:11 UTC on 2026-09-28;
//   3. the colour palette copied into cloudcompose.js IS GIBS's, bin for bin (the saved XML);
//   4. colour to temperature to opacity: cold tops opaque, a warm sea clear, the two grey ramps told
//      apart by their neighbours;
//   5. the seam: each satellite trusted to 62 degrees, not at all past 78, smooth between, and the
//      Europe/Africa gap left to the static map;
//   6. the composite's layout: rows south first, R opacity, G coverage;
//   7. the fallback rule: live only with a picture held and the clock within 12 h of it;
//   8. the Earth card's words for each case;
//   9. the shader samples the live pictures without the static map's drift, and the first frame
//      fetches nothing (the boot path is untouched).

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const G = await import(join(JS, 'data/gibs.js'));
const C = await import(join(JS, 'scene/cloudcompose.js'));
const L = await import(join(JS, 'scene/liveclouds.js'));
const { cloudsLine } = L;
const { SURFACE_FRAG } = await import(join(JS, 'scene/earth.js'));
const { COPY, timeText } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- 1. URLs ----------------------------------------------------------------------------------
const layers = G.GEO_SATELLITES.map((s) => s.layer);
check(layers.join() === 'GOES-West_ABI_Band13_Clean_Infrared,GOES-East_ABI_Band13_Clean_Infrared,Himawari_AHI_Band13_Clean_Infrared',
  `the three GIBS layers, west to east: ${layers.join()}`);
const t = Date.parse('2026-09-28T21:37:45Z');
const map = G.mapUrl('GOES-East_ABI_Band13_Clean_Infrared', t);
check(map.startsWith('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?'), 'the WMS endpoint, EPSG:4326, best');
for (const part of ['SERVICE=WMS', 'REQUEST=GetMap', 'VERSION=1.3.0', 'LAYERS=GOES-East_ABI_Band13_Clean_Infrared', 'CRS=EPSG:4326',
  'BBOX=-90,-180,90,180', 'WIDTH=2048', 'HEIGHT=1024', 'FORMAT=image/jpeg', 'TIME=2026-09-28T21:30:00Z']) {
  check(map.includes(part), `GetMap carries ${part}: ${map}`);
}
check(G.floorSlot(Date.parse('2026-09-28T21:30:00Z')) === Date.parse('2026-09-28T21:30:00Z'), 'a whole slot floors to itself');
check(G.floorSlot(Date.parse('2026-09-28T21:39:59Z')) === Date.parse('2026-09-28T21:30:00Z'), '21:39:59 floors to 21:30');
check(G.isoMinute(Date.parse('2026-01-02T03:04:05Z')) === '2026-01-02T03:04:00Z', 'isoMinute keeps seconds out');
const dom = G.domainsUrl('Himawari_AHI_Band13_Clean_Infrared', t);
check(dom === 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/1.0.0/Himawari_AHI_Band13_Clean_Infrared/default/2km/all/2026-09-28T15:40:00Z--2026-09-28T21:40:00Z.xml',
  `DescribeDomains: six hours to the slot after now, whole slots: ${dom}`);
check(G.domainsUrl('x', Date.parse('2026-09-28T21:31:00Z')) === G.domainsUrl('x', Date.parse('2026-09-28T21:39:00Z')),
  'the DescribeDomains URL is the same for a whole slot (its answer is cached 30 min; the URL moves every 10)');

// ---- 2. domains and slots -------------------------------------------------------------------------
// The GOES-East answer at 22:11 UTC, verbatim: a gap at 19:30, and 21:40/21:50 listed but still blank.
const xml = "<Domains xmlns:ows='http://www.opengis.net/ows/1.1'><SpaceDomain><BoundingBox miny='-90' crs='urn:ogc:def:crs:OGC:2:84' minx='-180' maxy='90' maxx='180'/></SpaceDomain><DimensionDomain><ows:Identifier>time</ows:Identifier><Domain>2026-09-28T18:00:00Z/2026-09-28T19:20:00Z/PT10M,2026-09-28T19:40:00Z/2026-09-28T21:50:00Z/PT10M</Domain><Size>2</Size></DimensionDomain></Domains>";
const iv = G.parseDomains(xml);
check(iv.length === 2 && iv[1].endMs === Date.parse('2026-09-28T21:50:00Z') && iv[0].stepMs === 600000, 'two intervals, ten-minute steps');
check(G.parseDomains('<html>error</html>').length === 0 && G.parseDomains(null).length === 0, 'anything else is no slots, not a throw');
const at2211 = Date.parse('2026-09-28T22:11:00Z');
const slots = G.candidateSlots(iv, at2211).map(G.isoMinute);
check(slots.join() === '2026-09-28T21:50:00Z,2026-09-28T21:40:00Z,2026-09-28T21:30:00Z,2026-09-28T21:20:00Z',
  `newest listed first, four tries (21:50 and 21:40 were blank; 21:30 is the picture): ${slots.join()}`);
const held = G.candidateSlots(iv, at2211, { afterMs: Date.parse('2026-09-28T21:30:00Z') }).map(G.isoMinute);
check(held.join() === '2026-09-28T21:50:00Z,2026-09-28T21:40:00Z', `a satellite holding 21:30 asks only for newer slots: ${held.join()}`);
const gap = G.candidateSlots(iv, Date.parse('2026-09-28T19:45:00Z'), { max: 3 }).map(G.isoMinute);
check(gap.join() === '2026-09-28T19:40:00Z,2026-09-28T19:20:00Z,2026-09-28T19:10:00Z', `the 19:30 gap is stepped over, never asked for: ${gap.join()}`);
check(G.candidateSlots(iv, Date.parse('2026-09-28T17:00:00Z')).length === 0, 'nothing listed before now: nothing to try');
check(G.BLANK_MAX_BYTES > 12572 && G.BLANK_MAX_BYTES < 186020, 'the blank threshold sits between the blank (12 572 B) and the smallest real picture (186 020 B)');

// ---- 3. the palette is GIBS's ------------------------------------------------------------------------
const cm = readFileSync(join(ROOT, 'tests/fixtures/gibs/Clean_Longwave_Infrared_Window_Band.xml'), 'utf8');
const entries = cm.slice(cm.indexOf('<Entries>'), cm.indexOf('</Entries>'));
const rows = [...entries.matchAll(/rgb="(\d+),(\d+),(\d+)" transparent="false" sourceValue="\(([-\d.]+),([-\d.+INF]+)[\])]"/g)];
check(rows.length === 238 && C.IR_PALETTE.length === 238 * 4, `238 palette bins both sides (${rows.length}, ${C.IR_PALETTE.length / 4})`);
let paletteOk = true;
rows.forEach((r, i) => {
  const lo = Number(r[4]);
  // The open-ended last bin, "(56.9,+INF)", is given half a degree above its floor.
  const mid = r[5].includes('INF') ? lo + 0.5 : Math.round(((lo + Number(r[5])) / 2) * 100) / 100;
  if (C.IR_PALETTE[i * 4] !== Number(r[1]) || C.IR_PALETTE[i * 4 + 1] !== Number(r[2]) || C.IR_PALETTE[i * 4 + 2] !== Number(r[3])
    || !near(C.IR_PALETTE[i * 4 + 3], mid, 0.001)) paletteOk = false;
});
check(paletteOk, 'every bin of IR_PALETTE is the XML bin: colour and middle temperature');

// ---- 4. colour -> temperature -> opacity ---------------------------------------------------------------
const rd = (r, g, b) => C.readPixel(r, g, b);
check(rd(255, 0, 0).kind === 0 && near(rd(255, 0, 0).tC, -60.6, 1.1), 'pure red is about -61 C');
check(rd(0, 255, 0).kind === 0 && near(rd(0, 255, 0).tC, -40.6, 1.1), 'pure green is about -41 C');
check(rd(0, 255, 255).kind === 0 && near(rd(0, 255, 255).tC, -19.4, 1.1), 'cyan is about -19 C');
check(rd(255, 127, 203).kind === 0 && rd(255, 127, 203).tC < -79, 'the pinks are colder than -80 C');
check(rd(84, 84, 84).kind === 1 && near(rd(84, 84, 84).tC, 24.65, 0.6), 'grey 84 read warm is +24.7 C, as the palette says');
check(rd(86, 83, 88).kind === 1, 'JPEG noise of a few levels on a grey is still grey');
check(rd(180, 210, 210).kind === 1, 'a light grey tinted by a neighbouring cyan (JPEG colour bleed, 30 apart) is still grey, not a -81 C pink');
check(rd(150, 150, 190).kind === 1 || rd(150, 150, 190).tC > -40, 'a bluish grey is never read as the coldest pinks');
check(rd(230, 230, 230).kind === 1, 'every grey is settled by its neighbours, the light ones too');
check(C.irOpacity(26, 0) === 0 && C.irOpacity(-60, 0) === 1, 'on the equator a +26 C sea is clear and a -60 C top is solid');
check(C.irOpacity(5, 0) > 0.2 && C.irOpacity(5, 0) < 0.4, `a +5 C top on the equator is a thin deck (${C.irOpacity(5, 0).toFixed(2)})`);
check(C.irOpacity(5, 60) === 0, 'a +5 C surface at 60 degrees is clear sky there (cold ground is not cloud)');
check(C.irOpacity(-30, 60) > 0.4, `a -30 C top at 60 degrees is a good part cloud (${C.irOpacity(-30, 60).toFixed(2)})`);
let mono = true;
for (let tc = -90; tc < 57; tc += 1) if (C.irOpacity(tc + 1, 20) > C.irOpacity(tc, 20)) mono = false;
check(mono, 'colder never means less cloud');

// ---- 5. the seam ------------------------------------------------------------------------------
const east = -75.2;
check(C.satWeight(0, east, east) === 1, 'straight under the satellite: full trust');
check(C.satWeight(0, east + 62, east) === 1 && C.satWeight(0, east + 78, east) === 0, 'full to 62 degrees, none from 78');
const mid = C.satWeight(0, east + 70, east);
check(mid > 0.4 && mid < 0.6, `halfway through the seam, about half (${mid.toFixed(2)})`);
let smooth = true;
let prev = 1;
for (let d = 60; d <= 80; d += 0.5) {
  const w = C.satWeight(0, east + d, east);
  if (w > prev + 1e-9 || prev - w > 0.12) smooth = false;
  prev = w;
}
check(smooth, 'the weight only falls, and never by more than 0.12 per half degree: a soft seam, not an edge');
const subs = G.GEO_SATELLITES.map((s) => s.subLonDeg);
const paris = C.blendAt(48.9, 2.3, subs);
const nairobi = C.blendAt(-1.3, 36.8, subs);
const miami = C.blendAt(25.8, -80.2, subs);
const tokyo = C.blendAt(35.7, 139.7, subs);
const hawaii = C.blendAt(21.3, -157.8, subs);
check(paris.coverage === 0 && nairobi.coverage === 0, `Paris and Nairobi are in the gap: static map (${paris.coverage}, ${nairobi.coverage})`);
check(miami.coverage === 1 && miami.weights[1] > 0.9, `Miami is GOES-East's (${miami.weights.map((w) => w.toFixed(2))})`);
check(tokyo.coverage === 1 && tokyo.weights[2] > 0.99, 'Tokyo is Himawari\'s');
check(hawaii.coverage === 1 && hawaii.weights[0] > 0.5 && Math.abs(hawaii.weights.reduce((a, b) => a + b) - 1) < 1e-9,
  `Hawaii is mostly GOES-West's, weights summing to 1 (${hawaii.weights.map((w) => w.toFixed(2))})`);
const southPole = C.blendAt(-85, 0, subs);
check(southPole.coverage === 0, 'the poles are the static map');
const lonGap = [];
for (let lon = -30; lon <= 90; lon += 1) if (C.blendAt(0, lon, subs).coverage === 0) lonGap.push(lon);
check(lonGap[0] >= 2 && lonGap[0] <= 4 && lonGap[lonGap.length - 1] >= 62 && lonGap[lonGap.length - 1] <= 63,
  `no live picture at all on the equator from ${lonGap[0]} E to ${lonGap[lonGap.length - 1]} E (the study: 6.5-60.6 E where GIBS draws nothing, plus the seam)`);

// ---- 6. one satellite and the composite, on a synthetic picture ----------------------------------------
const W = 256;
const H = 128;
const px = (x, y) => (y * W + x) * 4;
const rgba = new Uint8ClampedArray(W * H * 4);
// Everything in the disc a warm grey sea (+25 C at the equator), a red storm core with a grey ring
// in it (the cold ramp, -76 C) and a lone grey patch far from any colour (a warm reading).
const sub = -75.2;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const { latDeg, lonDeg } = C.pixelLatLon(x, y, W, H);
    if (C.angleFromSubPointDeg(latDeg, lonDeg, sub) > 81) continue;
    rgba.set([84, 84, 84, 255], px(x, y));
  }
}
const cx = Math.round(((sub + 180) / 360) * W);
const cy = H / 2;
// A storm as the palette draws one: a green ring (-40 C), a red core (-61 C), and inside it a 3 x 3
// patch of light grey, which here can only be the cold ramp (-77 C).
for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) rgba.set([0, 255, 0, 255], px(cx + dx, cy + dy));
for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) rgba.set([230, 0, 0, 255], px(cx + dx, cy + dy));
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) rgba.set([155, 155, 155, 255], px(cx + dx, cy + dy));
// The same grey far from any colour, a 7 x 7 patch so the blur leaves its middle alone: warm.
for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) rgba.set([155, 155, 155, 255], px(cx + 20 + dx, cy + dy));
// A lone red speck in the warm sea: solid itself, but no square halo of "cold" grey round it.
rgba.set([230, 0, 0, 255], px(cx - 20, cy + 20));
const op = C.satelliteOpacity(rgba, W, H, sub);
check(op[cy * W + cx] === 255, 'a grey patch ringed by a red core reads as the cold ramp: solid cloud');
check(op[cy * W + cx + 2] === 255, 'the red core is solid cloud');
const warmReading = Math.round(255 * C.irOpacity(C.warmGreyC(155), C.pixelLatLon(cx + 20, cy, W, H).latDeg));
check(op[cy * W + cx + 20] === warmReading && warmReading < 255, `the same grey far from any cold colour reads warm, -2.5 C: part cloud, not solid (${op[cy * W + cx + 20]})`);
check(op[cy * W + cx - 30] <= 8, `a +25 C sea on the equator is at most a trace (${op[cy * W + cx - 30]} of 255)`);
const speckAt = (dx, dy) => op[(cy + 20 + dy) * W + cx - 20 + dx];
check(speckAt(0, 0) > 20 && speckAt(0, 0) < 128, `a one-pixel speck is blurred to partial cover, not a solid dot (${speckAt(0, 0)})`);
check(speckAt(2, 0) < 40 && speckAt(0, 2) < 40 && speckAt(2, 2) < 40, `and paints no square halo two pixels out (${speckAt(2, 0)}, ${speckAt(0, 2)}, ${speckAt(2, 2)})`);
const blurTest = new Uint8Array(9 * 3); blurTest[4 + 9] = 255; C.blur121(blurTest, 9, 3);
check(blurTest[4 + 9] === 64 && blurTest[3 + 9] === 32 && blurTest[4] === 32 && blurTest[3] === 16, `the [1 2 1] blur is what it says (${[...blurTest.slice(3, 6)]}, ${[...blurTest.slice(12, 15)]})`);
const far = Math.round(((100 + 180) / 360) * W);
check(op[cy * W + far] === 0, 'outside the disc nothing is read');
check(!C.isBlank(rgba) && C.isBlank(new Uint8ClampedArray(W * H * 4)), 'an all-black picture is the blank; a disc is not');
const comp = C.composeClouds([{ opacity: op, subLonDeg: sub }, { opacity: null, subLonDeg: 140.7 }], W, H);
const at = (x, y) => (((H - 1 - y) * W) + x) * 2; // rows south first
check(comp.length === W * H * 2, 'two bytes a pixel');
check(comp[at(cx, cy)] === 255 && comp[at(cx, cy) + 1] === 255, 'the core, north-up row read back through the south-first layout: opaque, covered');
check(comp[at(far, cy) + 1] === 0, 'a satellite with no picture covers nothing: the static map shows there');
const northRow = comp.subarray((H - 1) * W * 2, H * W * 2);
check(northRow.every((v, i) => i % 2 === 1 ? v === 0 : true), 'the last row written is the north edge, beyond every disc');

// ---- 7. the fallback rule --------------------------------------------------------------------------------
const pic = Date.parse('2026-09-28T21:30:00Z');
check(G.cloudMode({ capturedMs: pic, clockMs: pic + 40 * 60000 }) === 'live', 'forty minutes after the picture: live');
check(G.cloudMode({ capturedMs: pic, clockMs: pic + 12 * 3600000 }) === 'live', 'exactly twelve hours: still live');
check(G.cloudMode({ capturedMs: pic, clockMs: pic + 12 * 3600000 + 1 }) === 'illustrative', 'past twelve hours: the static map');
check(G.cloudMode({ capturedMs: pic, clockMs: pic - 13 * 3600000 }) === 'illustrative', 'thirteen hours before: the static map');
check(G.cloudMode({ capturedMs: null, clockMs: pic }) === 'illustrative', 'no picture yet: the static map');

// ---- 8. the Earth card's words -----------------------------------------------------------------------------
const state = { phase: 'live', mode: 'live', capturedMs: pic - 10 * 60000, newestMs: pic,
  satellites: [{ name: 'GOES-West' }, { name: 'GOES-East' }, { name: 'Himawari' }] };
const live = cloudsLine(state, pic + 30 * 60000, pic + 30 * 60000);
check(live.includes('between 21:20 and 21:30 UTC') && live.includes('40 minutes ago') && live.includes('GOES-West, GOES-East and Himawari')
  && /illustrative/.test(live) && /Europe/.test(live), `the live line says when, how old, which satellites, and where it is not live: ${live}`);
// THE PICTURE'S OWN DATE WHEN THE CLOCK IS ELSEWHERE (public #330). `pic` is 21:30 UTC.
{
  const H = 3600000;
  const dateOf = (ms) => timeText.utcDate(ms);
  check(!live.includes(dateOf(pic)) && !/The clock is at/.test(live), `clock and wall on the picture's day, the clock at now: no date, no note (${live})`);
  // The clock three hours on, across midnight UTC: still within twelve hours, so still these clouds.
  const next = cloudsLine(state, pic + 3 * H, pic + 30 * 60000);
  check(next.includes(`on ${dateOf(pic)} between 21:20 and 21:30 UTC`), `the clock on the next UTC day: the picture says its own date (${next})`);
  check(next.includes(`The clock is at 00:30 UTC on ${dateOf(pic + 3 * H)}`) && /stay as that picture saw them/.test(next), `and the line says the clouds did not follow the clock (${next})`);
  // The clock eight hours back, the same UTC day: the date is not needed, the note is.
  const back = cloudsLine(state, pic - 8 * H, pic + 30 * 60000);
  check(/seen between 21:20 and 21:30 UTC/.test(back) && back.includes('The clock is at 13:30 UTC'), `a clock elsewhere on the same day: the note, without repeating the date in "seen" (${back})`);
  // The wall clock a day later (a tab left open): the picture is yesterday's and says so.
  const stale = cloudsLine({ ...state, newestMs: state.capturedMs }, pic + 5 * H, pic + 5 * H);
  check(stale.includes(`on ${dateOf(pic)} at 21:20 UTC`) && !/The clock is at/.test(stale), `today is not the picture's day: its date, and no note when the clock is at now (${stale})`);
  // A clock a few minutes off now (a paused tab) is not "elsewhere".
  check(!/The clock is at/.test(cloudsLine(state, pic + 30 * 60000 - 10 * 60000, pic + 30 * 60000)), 'ten minutes off now is not a scrub');
  check(L.CLOCK_ELSEWHERE_MS === 15 * 60000, 'the clock is elsewhere from fifteen minutes');
  // Too far for these clouds: illustrative, and WHICH picture it is far from.
  const far = cloudsLine({ ...state, mode: 'illustrative' }, pic + 40 * H, pic);
  check(/^Clouds: illustrative, because the clock is more than 12 hours from the latest satellite picture/.test(far) && far.includes(`of ${dateOf(pic)} at 21:20 UTC`), `a picture held but the clock far away: says so, with the picture's date (${far})`);
}
check(cloudsLine({ phase: 'off', mode: 'illustrative', capturedMs: null, satellites: [] }, pic, pic) === COPY.clouds.illustrativeSaveData, 'saving data: says so');
check(cloudsLine({ phase: 'failed', mode: 'illustrative', capturedMs: null, satellites: [] }, pic, pic) === COPY.clouds.illustrative, 'nothing held: illustrative');
check(COPY.clouds.gibsAcknowledgement === "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",
  'NASA\'s acknowledgement, verbatim');
for (const [k, v] of Object.entries(COPY.clouds)) check(!String(v).includes(' -- '), `COPY.clouds.${k} has no " -- "`);

// ---- 9. the shader and the boot path -----------------------------------------------------------------------
check(/texture2D\(\s*uLiveA,\s*uv\s*\)/.test(SURFACE_FRAG) && /texture2D\(\s*uLiveB,\s*uv\s*\)/.test(SURFACE_FRAG),
  'the live pictures are sampled at their own uv, with no drift');
check(/texture2D\(\s*uClouds,\s*uv \+ uCloudOffset\s*\)/.test(SURFACE_FRAG), 'the static map keeps its drift');
check(/mix\(\s*c,\s*pow\(\s*l\.r,\s*uCloudGamma\s*\),\s*l\.g \* uLive\s*\)/.test(SURFACE_FRAG), 'coverage (G) blends live over static, times the live fade');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
const lc = readFileSync(join(JS, 'scene/liveclouds.js'), 'utf8');
check(/ctx\.liveClouds\.start\(\)/.test(main) && G.START_DELAY_MS >= 5000, 'main.js starts the live clouds, and the first look waits at least 5 s');
// 2026-10-01: started from boot, the pictures fell inside a slow first visit (594 kB on CI). They start
// when the catalogues have landed, inside main.js's sr:layers-ready handler.
check(/addEventListener\('sr:layers-ready'[\s\S]{0,600}ctx\.liveClouds\.start\(\)/.test(main), 'the live clouds start after the layers are ready, never during the first visit');
{
  // 2026-09-28: the card said "illustrative" beside live pictures, because nothing told an open card
  // they had arrived. main.js turns onChange into `sr:clouds` and the card rewrites its line on it.
  const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
  check(/onChange:\s*\(\)\s*=>\s*window\.dispatchEvent\(new CustomEvent\('sr:clouds'\)\)/.test(main), 'main.js announces every live-clouds change as sr:clouds');
  check(/addEventListener\('sr:clouds'[\s\S]{0,400}sr-card__clouds[\s\S]{0,300}liveClouds\.line\(/.test(cards), 'an open Earth card rewrites its clouds line on sr:clouds');
}
check(/schedule\(START_DELAY_MS\)/.test(lc) && !/look\(\)\s*;?\s*\n\s*\}\s*,?\s*\n\s*\/\*\* Force/.test(lc), 'start() only schedules; nothing is fetched on the boot path');
check(/if \(started \|\| saveData\) return;/.test(lc), 'saveData: never starts');

if (problems.length) {
  console.error('live clouds FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`live clouds ok: GIBS URLs and slots, the palette (238 bins), IR to opacity, the seam (gap ${lonGap[0]}-${lonGap[lonGap.length - 1]} E at the equator), the composite, the 12 h rule, the card's words`);
