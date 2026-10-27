// tests/test_hero_ring.mjs -- the Ring Nebula (M57) as a hero, and planetary nebulae as a class (internal spec 0076
// stage W3-b, #872; spec 0075 task 45): its layers come from the registry with their sources; the ring at the published
// size, axis and tilt (O'Dell, Ferland, Henney & Peimbert 2013), seen from our side as the photograph's ellipse; the
// light map placed on the sky as scene/nebulae.js places the photograph (its archive's north included); FROM OUR SIDE
// THE MODEL IS THE PHOTOGRAPH at any step count; finite and never white from every side and inside; the step
// integrals exact; T0's few samples and no noise volume; shares, palettes, nothing moving; the knots at their radii;
// the card; the budgets. And the Helix's exact front: its rings' faces integrated per step, the column on our line
// the photograph's with T0's four samples, and the Helix built on the shared part.
//
//   node tests/test_hero_ring.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const R = await import(join(JS, 'scene/deep/ring.js'));
const S = await import(join(JS, 'scene/deep/shellneb.js'));
const Hx = await import(join(JS, 'scene/deep/helix.js'));
const N = await import(join(JS, 'scene/nebulae.js'));
const { HERO } = await import(join(JS, 'data/hero-m57.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const pa = (v) => ((Math.atan2(-v[0], v[1]) / D2R) + 360) % 360; // position angle (east of north) of a sky-frame direction

// --- 1. the profile: every part, with its source; the review filled but for the person's sign-off ---
{
  const parts = Object.fromEntries(HERO.layers.map((l) => [l.part, l]));
  for (const k of ['star', 'disc', 'lobes', 'halo', 'outer', 'knots']) check(parts[k] && String(parts[k].source || '').length > 20, `the profile has its ${k}, with a source`);
  check(/O'Dell, Ferland, Henney & Peimbert 2013, AJ 145, 92/.test(parts.disc.source), 'the ring is the 2013 paper\'s');
  check(parts.disc.semi_major_arcsec === 44 && parts.disc.semi_minor_arcsec === 30 && parts.disc.major_pa_deg === 60 && parts.disc.tilt_deg === 13.5 && parts.disc.near_pa_deg === 60, 'the ring: 44″ by 30″, major axis at PA 60°, tilted 13.5° with its NE end near (ODFHP13)');
  check(parts.lobes.polar_semi_axis_arcsec === 59 && /no evidence about the form of the Lobes/.test(parts.lobes.drawn) && /ILLUSTRATION/.test(parts.lobes.drawn), 'the lobes: 59″ each way, their form said to be an illustration');
  check(parts.halo.outer_arcsec <= 65 && parts.outer.drawn === 'none', 'the inner halo within 65″; the outer halo not drawn');
  check(parts.knots.count_estimated === 20000 && parts.knots.head_au === 150, 'the knots: some 20 000 (Wesson et al. 2024), 150 au (ODFHP13)');
  check(parts.star.temp_k === 135000, 'the white dwarf: 135 000 K (Sahai et al. 2025)');
  check(HERO.colours.mode === 'enhanced' && /NARROWBAND/.test(HERO.colours.note) && HERO.colours.enhanced.under === 'deep', 'the colours: the photograph\'s narrowband ones, declared enhanced under every look');
  check(/not yet/.test(HERO.review.astronomer || ''), 'the review says no astronomer has reviewed it yet');
  for (const k of ['data_vs_model', 'geometry', 'colours', 'distance', 'credits']) check(String(HERO.review[k] || '').length > 30, `review.${k} is written`);
  check(HERO.shipped === false || (HERO.review.by === 'Space Radar maintainers' && HERO.review.date), 'shipped under the review policy (spec 0075 §14.4)');
  check(HERO.drawn.length === 1 && HERO.drawn[0] === 'reconstruction' && HERO.credits.length >= 3, 'it draws a reconstruction, with its credit lines');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const sect = credits.slice(credits.indexOf('### The Ring (0076 W3-b)'), credits.indexOf('### Remnants and dust (0076 W3-c)'));
  for (const s of ['AJ 145, 92', 'AJ 134, 1679', 'heic1310a', 'arXiv:2308.09027', 'ApJ 985', 'NARROWBAND', 'ENHANCED', '2090486618786534784', 'CC BY-NC 3.0 IGO']) check(sect.includes(s), `CREDITS.md's Ring section names ${s}`);
  const words = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  check(/deepRing: \{[\s\S]*card: \{\s*m57: 'Its light is taken from Hubble’s photograph, its shape from O’Dell, Ferland, Henney and Peimbert \(2013\)[^']*Not yet reviewed by an astronomer\.'/.test(words), 'the card says its light is the photograph\'s, its shape the paper\'s, and that no astronomer has reviewed it yet');
  check(statSync(join(ROOT, 'site/images/deep/ring/ring-light.webp')).size < 40000, 'the light map is small (the photograph, its stars removed)');
}

// --- 2. the geometry: the published axis and tilt; the light map's place on the sky ----------------------
const g = R.geometryOf();
{
  const asLy = (arcsec) => arcsec * 2569 * Math.PI / 648000;
  const dsoRow = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'm57');
  check(dsoRow.distLy === 2569 && dsoRow.distance.method === 'parallax' && /Gaia DR3/.test(dsoRow.distance.source) && /2090486618786534784/.test(dsoRow.distance.source) && /CC BY-NC 3\.0 IGO/.test(dsoRow.distance.source), 'the record\'s distance is Gaia DR3\'s parallax of the central star, credited CC BY-NC 3.0 IGO');
  check(HERO.frame.distance_ly === dsoRow.distLy, 'and the hero scales its arcseconds by the same distance');
  check(near(Math.acos(-g.axis[2]) / D2R, 13.5, 1e-9), `the disc's axis is 13.5° from our line of sight (${(Math.acos(-g.axis[2]) / D2R).toFixed(3)}°)`);
  check(near(pa(g.axis), 60, 1e-6), `its far end points to PA 60° on the sky: the NE end of the ring is near (${pa(g.axis).toFixed(2)}°)`);
  // Seen from here the ring's outline is the paper's ellipse: 44″ along PA 60°, 30″ across.
  const maj = g.e1.map((v) => v * g.A), mnr = g.e2.map((v) => v * g.B);
  check(near(Math.hypot(maj[0], maj[1]), asLy(44), 1e-9) && near(Math.hypot(mnr[0], mnr[1]), asLy(30), 1e-9), 'projected, the ring is 44″ by 30″');
  check(near(pa(maj) % 180, 60, 1e-6), `its long axis at PA 60° on the sky (${pa(maj).toFixed(2)}°)`);
  check(dot(maj, g.axis) === 0 || near(dot(maj, g.axis), 0, 1e-12), 'the major axis lies in the disc\'s plane');
  check(g.Lp > g.A && g.w[2] === 0 && g.bound === Math.max(g.bA, g.bB, g.bC), 'the lobes reach past the ring along our line; the halo carries no light (weight 0); the bounding ellipsoid holds both');
  // The bounding ellipsoid holds the disc's whole lit box and the lobes (rays that miss it are discarded at once).
  let outside = 0;
  for (let k = 0; k < 2000; k++) {
    const phi = k * 2.399963, q = (SHAPE_Q => SHAPE_Q * Math.sqrt((k % 97 + 0.5) / 97))(R.SHAPE.outer + R.SHAPE.edge), u = ((k % 13) / 6 - 1) * 1.2;
    const p = [0, 1, 2].map((c) => g.e1[c] * Math.cos(phi) * q * g.A + g.e2[c] * Math.sin(phi) * q * g.B + g.axis[c] * u * g.H);
    const sb = Math.hypot(dot(g.Sb[0], p), dot(g.Sb[1], p), dot(g.Sb[2], p));
    if (sb > 1) outside++;
  }
  check(outside === 0, `the bounding ellipsoid holds the disc wherever its window is lit (${outside} of 2000 points outside)`);
  // The light map: where a sky point lands is where scene/nebulae.js puts that sky point on the photograph (the
  // archive's north, 11.2° for M57, included); with no turn it is the Helix's mapping.
  const row = NEBULAE.find((r) => r.id === 'm57');
  check(row && near(row.north_deg, 11.2, 1e-9), 'the photograph\'s archive turns north by 11.2°');
  const ra0 = HERO.frame.ra_deg, de0 = HERO.frame.dec_deg;
  let worst = 0;
  for (const [ex, ny] of [[0, 0], [30, 0], [0, 30], [-25, 20], [40, -35]]) {
    // a sky point ex″ east and ny″ north of the star: in the sky frame x = -east, y = north (ly)
    const [u, v] = R.lightUv(g, asLy(-ex), asLy(ny));
    const pic = N.skyToPicture(row, ra0 + ex / 3600 / Math.cos(de0 * D2R), de0 + ny / 3600);
    worst = Math.max(worst, Math.abs(u - pic.u), Math.abs(v - pic.v));
  }
  check(worst < 2e-3, `the light map sits where scene/nebulae.js puts the photograph (worst ${worst.toExponential(1)} of the picture)`);
  const helixRow = { ra_deg: 337.4, dec_deg: -20.8, width_arcmin: 28, height_arcmin: 26 };
  const a = S.uvOf(helixRow, [337.41, -20.84], 655), b = Hx.uvOf({ ...helixRow, north_deg: 3 }, [337.41, -20.84], 655);
  check(near(a.u0, b.u0, 1e-12) && near(a.v0, b.v0, 1e-12), 'unturned, the shared mapping is the Helix\'s (which keeps ignoring its 0.07°)');
}

// --- 3. FROM OUR SIDE THE MODEL IS THE PHOTOGRAPH; finite, never white, from every side and inside ----------
// A light like the picture's: blue inside, white-green on the ring, orange at its rim, a faint fringe.
const lightOf = (x, y) => {
  const q = Math.hypot(dot(g.e1, [x, y, 0]) / (g.A * Math.cos(13.5 * D2R)), dot(g.e2, [x, y, 0]) / g.B);
  const ring = Math.exp(-(((q - 0.75) / 0.2) ** 2)), rim = Math.exp(-(((q - 0.95) / 0.1) ** 2)), fringe = 0.05 * Math.exp(-(((q - 1.15) / 0.15) ** 2));
  return [0.1 + 0.4 * ring + 0.6 * rim + fringe, 0.3 + 0.4 * ring + 0.3 * rim + 0.5 * fringe, 0.5 + 0.2 * ring + 0.05 * rim + 0.2 * fringe].map((v) => Math.min(0.9, v * 0.75));
};
{
  let worst = 0, worst4 = 0, inside = 0;
  for (let k = 0; k < 120; k++) {
    // sky points across the ring, out to 1.1 of its ellipse (beyond it the fringe is dropped off our line: below)
    const th = k * 2.399963, q = 1.1 * Math.sqrt((k + 0.5) / 120), xm = q * g.A * Math.cos(13.5 * D2R) * Math.cos(th), ym = q * g.B * Math.sin(th);
    const x = g.e1[0] * xm + g.e2[0] * ym, y = g.e1[1] * xm + g.e2[1] * ym;
    const want = lightOf(x, y);
    const cols = R.columnsAt(g, x, y);
    if (g.w[0] * cols[0] + g.w[1] * cols[1] + g.w[2] * cols[2] > R.SHAPE.minColumn) inside++;
    const err = (n, j) => { const c = R.columnJs(g, [x, y, 3 * g.bound], [0, 0, -1], n, j, lightOf).rgb; return Math.max(...c.map((v, i) => Math.abs(v - want[i]) / Math.max(0.05, want[i]))); };
    worst = Math.max(worst, err(24, 0.37));
    worst4 = Math.max(worst4, err(4, 0.37), err(4, 0.81), err(4, 0.05));
  }
  check(inside === 120, `every sky point out to 1.1 of the ring's ellipse has a layer to carry its light (${inside} of 120)`);
  // What is dropped: the light beyond the ring's window and the lobes (the halo's fringe), against the whole.
  let all = 0, lost = 0;
  for (let jy = -60; jy <= 60; jy++) for (let ix = -60; ix <= 60; ix++) {
    const x = ix / 60 * 1.4 * g.A, y = jy / 60 * 1.4 * g.A;
    const c = lightOf(x, y), l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] - 0.2126 * 0.075 - 0.7152 * 0.225 - 0.0722 * 0.375;
    const cols = R.columnsAt(g, x, y);
    all += Math.max(0, l);
    if (!(g.w[0] * cols[0] + g.w[1] * cols[1] > R.SHAPE.minColumn)) lost += Math.max(0, l);
  }
  check(lost / all < 0.03, `the light no layer carries off our line is the faint fringe: ${(100 * lost / all).toFixed(1)} % of the nebula's (above its floor)`);
  // As the GPU draws it: the columns read from the tabulated map, bilinearly.
  const map = R.columnMap(g);
  let worstMap = 0;
  for (let k = 0; k < 120; k++) {
    const th = k * 2.399963, q = 1.1 * Math.sqrt((k + 0.5) / 120), xm = q * g.A * Math.cos(13.5 * D2R) * Math.cos(th), ym = q * g.B * Math.sin(th);
    const x = g.e1[0] * xm + g.e2[0] * ym, y = g.e1[1] * xm + g.e2[1] * ym;
    const want = lightOf(x, y);
    for (const j of [0.05, 0.37, 0.81]) { const c = R.columnJs(g, [x, y, 3 * g.bound], [0, 0, -1], 4, j, lightOf, map).rgb; worstMap = Math.max(worstMap, ...c.map((v, i) => Math.abs(v - want[i]) / Math.max(0.05, want[i]))); }
  }
  check(worstMap < 0.05, `and through the tabulated columns the GPU reads (${R.COLUMN_MAP}², bilinear), with T0's 4 samples: ${(worstMap * 100).toFixed(2)} %`);
  check(worst < 0.02, `on our line the column IS the photograph's light: ${(worst * 100).toFixed(2)} % at worst over 120 points (24 samples)`);
  check(worst4 < 0.03, `and with 4 samples, whatever the pixel's offset: ${(worst4 * 100).toFixed(2)} % (the step integrals are exact)`);
  // Edge on to the disc: a colour, not a white bar.
  const edge = R.columnJs(g, g.e1.map((v) => v * 6 * g.bound), g.e1.map((v) => -v), 8, 0.5, lightOf).rgb;
  check(Math.max(...edge) < 1 && Math.max(...edge) > 0.05 && Math.max(...edge) - Math.min(...edge) > 0.05, `edge on, the ring keeps a colour (${edge.map((v) => v.toFixed(2)).join(', ')}) and does not go white`);
  // Along the disc's axis from behind: the same light (the model is finite and the far side is the near side's twin).
  const behind = R.columnJs(g, g.axis.map((v) => v * 6 * g.bound), g.axis.map((v) => -v), 16, 0.5, lightOf).rgb;
  check(behind.every((v) => Number.isFinite(v) && v >= 0 && v < 1), 'seen from behind it is finite');
  let bad = 0;
  let rr = 6720;
  const rnd = () => { rr = (rr * 1103515245 + 12345) % 2147483648; return rr / 2147483648; };
  for (let i = 0; i < 3000; i++) {
    const inner = i % 2 === 0;
    const ro = inner ? [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map((v) => v * 1.4 * g.bound) : unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]).map((v) => v * 8 * g.bound);
    const rd = inner ? unit([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]) : unit([-ro[0] + (rnd() - 0.5) * g.bound, -ro[1] + (rnd() - 0.5) * g.bound, -ro[2] + (rnd() - 0.5) * g.bound]);
    const c = R.columnJs(g, ro, rd, 8, rnd(), lightOf).rgb;
    if (!c.every((v) => Number.isFinite(v) && v >= 0 && v < 1)) bad++;
  }
  check(bad === 0, `3 000 rays from outside and inside: every colour finite, non-negative and under white (${bad} bad)`);
  // The columns are smooth: no jump where a layer begins (a jump would show as a seam when the nebula is turned).
  let jump = 0;
  for (let k = 0; k <= 400; k++) {
    const x0 = (k / 400 - 0.5) * 2.6 * g.A, x1 = x0 + 2.6 * g.A / 400 / 50;
    const c0 = R.columnsAt(g, x0, 0.1 * g.B), c1 = R.columnsAt(g, x1, 0.1 * g.B);
    const n0 = dot(g.w, c0), n1 = dot(g.w, c1);
    jump = Math.max(jump, Math.abs(n1 - n0) / Math.max(1e-3, n0));
  }
  check(jump < 0.05, `the line's column changes smoothly across the nebula: no seam (largest step ${(jump * 100).toFixed(2)} % over a fiftieth of a sample)`);
}

// --- 3b. photometric discipline: the core never goes white; from inside nothing washes the screen grey ------
{
  const manifest = JSON.parse(readFileSync(join(ROOT, 'site/images/deep/ring/manifest.json'), 'utf8'));
  check(near(R.SHAPE.peak, manifest.peak_lum_p99, 1e-9), `the cap is the photograph's own brightest (SHAPE.peak ${R.SHAPE.peak}, the light map's 99th percentile ${manifest.peak_lum_p99})`);
  // Turned 45 degrees round the star, through the core and across the face: never past the photograph's brightest,
  // and never white (the photograph's colour stays in it).
  const bright = (x, y) => lightOf(x, y).map((v) => Math.min(1, v * 1.25));
  let worstLum = 0, leastChroma = 1;
  for (const deg of [30, 45, 60, 90]) {
    const a = deg * D2R, dir = [Math.sin(a), 0, Math.cos(a)];
    const right = [Math.cos(a), 0, -Math.sin(a)];
    for (let k = -6; k <= 6; k++) {
      const off = right.map((v) => v * k * g.A / 6);
      const ro = dir.map((v, i) => v * 6 * g.bound + off[i]);
      const c = R.columnJs(g, ro, dir.map((v) => -v), 16, 0.5, bright).rgb;
      const y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      worstLum = Math.max(worstLum, y);
      if (Math.min(...c) > 0.8) leastChroma = 0; // near-white: every channel above 0.8 (the pictures' measure)
    }
  }
  check(worstLum <= R.SHAPE.peak + 1e-9, `turned 30 to 90 degrees the core is held to the photograph's brightest (largest luminance ${worstLum.toFixed(3)} against ${R.SHAPE.peak})`);
  check(leastChroma > 0, 'and no pixel goes near-white (every channel above 0.8)');
  const capped = R.capLight([2, 1.6, 1.2]);
  check(near(0.2126 * capped[0] + 0.7152 * capped[1] + 0.0722 * capped[2], R.SHAPE.peak, 0.08) && capped[0] > capped[2] * 1.3, `the cap keeps the hue (${capped.map((v) => v.toFixed(2)).join(', ')})`);
  // From inside, 0.3 ly from the star and 60 degrees off our line, as the probe's r04: a view of 32 x 18 rays.
  const a = 60 * D2R, cam = [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3];
  const fwd = cam.map((v) => -v / 0.3), up = [0, 1, 0], right = [fwd[1] * up[2] - fwd[2] * up[1], fwd[2] * up[0] - fwd[0] * up[2], fwd[0] * up[1] - fwd[1] * up[0]];
  const lums = [];
  for (let jy = 0; jy < 18; jy++) for (let ix = 0; ix < 32; ix++) {
    const sx = (ix + 0.5) / 32 * 2 - 1, sy = ((jy + 0.5) / 18 * 2 - 1) * 9 / 16;
    const rd = unit([0, 1, 2].map((c) => fwd[c] + right[c] * sx * 0.8 + up[c] * sy * 0.8));
    const c = R.columnJs(g, cam, rd, 16, S.pixelHash(ix, jy), lightOf).rgb;
    lums.push((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) * R.sharesFor({ level: 1, rPx: Infinity, photo: 0 }).light);
  }
  lums.sort((p, q) => p - q);
  const median = lums[lums.length >> 1], p90 = lums[Math.floor(lums.length * 0.9)], p10 = lums[Math.floor(lums.length * 0.1)];
  check(median < 0.12, `from inside the view is not washed: its median luminance ${median.toFixed(3)} after the eye's adaptation (${R.SHAPE.adapt})`);
  check(p90 > 2 * Math.max(p10, 0.005), `and it has structure, the lobes' wall round the camera brighter than the hollow it stands in (10th / 90th percentile ${p10.toFixed(3)} / ${p90.toFixed(3)})`);
  // The lobes are a wall: empty at their middle and at their surface.
  const mid = R.columnsAt(g, 0, 0)[1];
  check(mid > 0 && Number.isFinite(mid), 'the lobes still carry the cavity\'s light on our line');
}

// --- 4. the exact integrals, and the GLSL written from the same numbers ----------------------------------
{
  // ∫ exp(-u⁴) by fine trapezoids against the closed form
  let F = 0, worst = 0;
  const du = 1e-4;
  for (let u = 0; u < 1.6; u += du) { F += (Math.exp(-(u ** 4)) + Math.exp(-((u + du) ** 4))) / 2 * du; worst = Math.max(worst, Math.abs(S.quarticCdf(u + du) - F)); }
  check(worst < 2e-5 && near(S.quarticCdf(-0.7), -S.quarticCdf(0.7), 1e-12), `the slab's profile integrated in closed form: within ${worst.toExponential(1)} of the integral, odd`);
  // A slab crossed in 1, 4 or 24 steps carries the same light.
  const s = S.layerSpan([0.1, 0.2, 5], [0, 0, -1], unit([0.2, 0.1, -1]), 1.6, 0, 10, 0, 20);
  const z0 = dot([0.1, 0.2, 5], unit([0.2, 0.1, -1])), dz = dot([0, 0, -1], unit([0.2, 0.1, -1]));
  const sum = (n) => { const L = S.spanLen(s); let t = 0; for (let i = 0; i < n; i++) t += S.slabIntegral(s, i * L / n, (i + 1) * L / n, z0, dz); return t; };
  check(near(sum(1), sum(4), 1e-6) && near(sum(4), sum(24), 1e-6) && near(sum(24), S.QUARTIC * 0.99917 / Math.abs(dz), 2e-3), `a crisp face is crossed exactly at any step count (${sum(1).toFixed(5)}, ${sum(4).toFixed(5)}, ${sum(24).toFixed(5)})`);
  const f = R.SHADERS.gas;
  for (const k of ['slab', 'edge', 'kappa', 'knee']) check(f.includes(Number(R.SHAPE[k]).toFixed(3)), `GAS_FRAG carries SHAPE.${k} (${R.SHAPE[k]})`);
  check(S.QUARTIC_CDF.every((c) => f.includes(String(c))), 'and the closed form\'s coefficients');
  check(/vec4 layerSpan\( vec3 ro, vec3 rd, vec3 a, float h, float rIn, float rOut, float t0, float t1 \)/.test(f) && /vec2 quadSpan\( mat3 S/.test(f) && /texture2D\( uCols, xy \* uColScale \+ 0\.5 \)/.test(f) && /float slabIntegral\(/.test(f), 'the fragment has the same spans, integrals and tabulated columns');
  check(/gl_FragColor = vec4\( col \* uGain \* uShare, 1\.0 \)/.test(f), 'additive with alpha 1: the light lands (three\'s AdditiveBlending is SRC_ALPHA, ONE)');
  check(/col = capLight\( col \);/.test(f) && /if \( y > uPeak \) c \*= uPeak \/ y;/.test(f), 'the fragment holds the core to the photograph\'s brightest');
  check((f.match(/for \( int i = 0; i < MAX_N; i\+\+ \)/g) || []).length === 3 && !/k == 0 \?/.test(f) && /if \( uW\.z > 0\.0 \)/.test(f), 'one loop a layer (the disc, the lobes, and the halo only while it carries light: 0078 r14-neb-b), each computing only its own integral');
  check(/int nd = max\( 1, int\( float\( uN \) \* 0\.75 \+ 0\.5 \) \)/.test(f) && /int nl = max\( 1, int\( float\( uN \) \* 0\.4 \+ 0\.5 \) \)/.test(f), 'the disc and the lobes take ring.js layerSamples');
  check(/vec2 bb = quadSpan\( uSb, ro, rd, 0\.0, 1e9 \);\s*if \( bb\.y <= bb\.x \) discard;/.test(f), 'an early exit for every ray that misses the bounding ellipsoid');
  check(/uJit > 0\.5 \? pixelHash\( gl_FragCoord\.xy \) : 0\.5/.test(f) && /uInside \* smoothstep\( 0\.0, uNear, t \)/.test(f), 'T0 steps at the middle; from inside the gas near the camera fades');
  check(/pixelHash\( gl_FragCoord\.xy \)/.test(f) && !/sampler3D/.test(f) && !/uTime/.test(f), 'a hash of the pixel for the offset, no noise volume, no clock');
  for (const [k, v] of Object.entries(R.SHADERS)) {
    const bad = [...v.matchAll(/smoothstep\(\s*([-0-9.]+)\s*,\s*([-0-9.]+)\s*,/g)].filter((m) => Number(m[1]) >= Number(m[2]));
    check(!bad.length, `${k}: smoothstep's edges in order: ${bad.map((m) => m[0]).join(' ')}`);
  }
}

// --- 5. the hero: the star at the centre across a 90° arc; tiers; shares; looks; dispose -------------------
{
  stage.setWorld('stellar');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-m57');
  check(!!rec, 'the record dso-m57 is on the map');
  const hero = R.createHero(THREE, { profile: HERO, record: rec, gas: G });
  const scene = new THREE.Scene();
  scene.add(hero.group);
  const centre = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  const s = LY_KM / stage.unitKm;
  hero.group.matrixAutoUpdate = false;
  hero.group.matrix.makeScale(s, s, s).setPosition(centre);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  const sunward = centre.clone().negate().normalize();
  const side = new THREE.Vector3().crossVectors(sunward, new THREE.Vector3(0, 1, 0)).normalize();
  hero.setLevel(2, 1);
  let off = 0;
  const sky = hero.group.children[0];
  const uGas = hero.group.getObjectByName(`${hero.group.name}-shells`).material.uniforms;
  for (let deg = 0; deg <= 90; deg += 15) {
    const dir = sunward.clone().multiplyScalar(Math.cos(deg * D2R)).add(side.clone().multiplyScalar(Math.sin(deg * D2R)));
    camera.position.copy(centre).addScaledVector(dir, 3 * s);
    camera.lookAt(centre); camera.updateMatrixWorld();
    hero.frame({ camera, rPx: 250, steps: 16, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 1, gain: 1 });
    scene.updateMatrixWorld(true);
    const star = new THREE.Vector3(0, 0, 0).applyMatrix4(sky.matrixWorld).project(camera);
    off = Math.max(off, Math.hypot(star.x, star.y));
    check(near(uGas.uCam.value.length(), 3, 1e-6), `at ${deg}° the camera is 3 ly from the white dwarf in the sky frame`);
    if (deg === 0) check(uGas.uCam.value.z > 2.99, 'on our line of sight the camera is on the sky frame\'s +z (toward the Sun)');
  }
  check(off < 1e-6, `the white dwarf stays at the centre of the frame across a 90° arc (largest offset ${off.toExponential(1)})`);
  hero.frame({ camera, rPx: 250, steps: 0, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 0, gain: 1 });
  // 0078 r14-neb-b: the photographs are not drawn on the sky any more, so T0 draws the model, four jittered steps a layer
  // (one at its middle left dark holes on a phone: look run 40443020998)
  check(hero.stats().share === 1 && hero.stats().star === 1 && hero.stats().samples === 4, `T0: the model draws, four steps a layer (${JSON.stringify(hero.stats())})`);
  check(uGas.uShare.value === 0 && hero.ready(), 'no gas is drawn until its light (the photograph) has landed; with nothing to fetch here it is ready');
  hero.frame({ camera, rPx: 400, steps: 32, look: 'film', frozen: true, dtMs: 16, photo: 0, tier: 2, gain: 1 });
  check(hero.stats().samples === 16 && hero.stats().knots === 1000, 'T2 at level 3: 16 samples for the disc (32 steps), 1 000 knots');
  check(JSON.stringify(R.layerSamples(8).slice(0, 2)) === '[6,3]' && JSON.stringify(R.layerSamples(1).slice(0, 2)) === '[1,1]', `fewer samples where the light is smooth: disc and lobes ${R.layerSamples(8).slice(0, 2)} at level 2, ${R.layerSamples(1).slice(0, 2)} on T0`);
  check(R.samplesFor({ tier: 2, steps: 48 }) === 24 && R.samplesFor({ tier: 1, steps: 0 }) === 8, 'Ultra 24 a layer; level 2 8');
  const sh = R.sharesFor({ level: 1, rPx: 300, photo: 1 });
  check(sh.gas === 0 && sh.knots === 0 && sh.star === 0.5, 'on our line, with its photograph drawn, the gas gives way and the star is half');
  check(R.sharesFor({ level: 1, rPx: 150, photo: 0 }).gas === 1 && R.sharesFor({ level: 0, rPx: 300, photo: 0 }).gas === 0, 'off it the gas is whole from level 2; below level 2 nothing of it draws');
  check(near(R.sharesFor({ level: 1, rPx: Infinity, photo: 0, viewH: 900 }).light, R.SHAPE.adapt, 1e-12), 'from inside its light adapts');
  // Looks: nothing is generated and nothing moves, under any look; the knots stay under Measured (they are measured).
  check(Object.values(R.UNDER_MEASURED).every((r) => X.MEASURED_RULES.includes(r)) && R.UNDER_MEASURED.knots === 'same', 'UNDER_MEASURED: the knots the same');
  const kn = hero.group.getObjectByName(`${hero.group.name}-knots`).material.uniforms;
  hero.frame({ camera, rPx: 300, steps: 16, look: 'measured', photo: 0, tier: 1, gain: 1, dtMs: 60000 });
  check(kn.uShare.value > 0 && !('uTime' in uGas), 'under Measured the knots draw and the gas has no clock at all');
  const deep = R.paletteFor(X.exposureLook('deep').milkyWay), cam = R.paletteFor(X.exposureLook('camera').milkyWay);
  check(deep.mode === 'deep' && deep.enhanced && cam.mode === 'camera' && cam.enhanced, 'enhanced under every look (the photograph is narrowband); Deep its own set');
  hero.group.traverse((o) => {
    if (!o.material) return;
    const m = o.material;
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${o.name}: opaque list, not tone mapped, no depth write`);
    const over = m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.OneMinusSrcAlphaFactor;
    check(m.blending === THREE.AdditiveBlending || over, `${o.name}: additive or premultiplied over`);
    check(over === ('GAS_ABSORB' in (m.defines || {})), `${o.name}: its alpha matches its blend`);
  });
  const meshes = []; hero.group.traverse((o) => { if (o.isMesh) meshes.push(o.name); });
  const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
  const calls = Number((budgets.match(/id: deep_ring_draw_calls, value: (\d+)/) || [])[1]);
  const bytes = Number((budgets.match(/id: deep_ring_bytes, value: (\d+)/) || [])[1]);
  check(meshes.length === 3 && calls === 3, `three draw calls: gas, knots, star (${meshes.join(', ')}), as budgets.yaml holds`);
  const assets = statSync(join(ROOT, 'site/images/deep/ring/ring-light.webp')).size + statSync(join(ROOT, 'site/images/deep/ring/manifest.json')).size;
  check(assets <= bytes && bytes <= 1500000, `its assets ${assets} B within budgets.yaml's ${bytes} B (design section 4 allows 1.5 MB)`);
  check(hero.card && hero.card.copy === 'deepRing', 'its card reads the words block deepRing');
  hero.dispose();
  check(!hero.group.parent, 'disposed: out of the scene');
}

// --- 5a. tier 0: photograph only (the coordinator drops a hero whose profile is not shipped) ---------------
{
  let tier = 1;
  const prof = { id: 'm57', shipped: true };
  const rec = { id: 'dso-m57', meta: { heroDrawn: ['reconstruction'], heroId: 'm57', heroCopy: 'deepRing', drawn: ['photograph'] } };
  R.tierFloor(prof, () => ({ tier }), rec);
  check(prof.shipped === true && rec.meta.heroId === 'm57', 'on T1 the Ring is shipped and the card says it is drawn');
  tier = 0;
  check(prof.shipped === false && !('heroId' in rec.meta) && !('heroDrawn' in rec.meta) && !('heroCopy' in rec.meta), 'on T0 it is not: the coordinator drops it (the holder and the glow as main), and the card no longer says a reconstruction is drawn');
  tier = 2;
  check(prof.shipped === true && rec.meta.heroId === 'm57' && rec.meta.heroCopy === 'deepRing' && rec.meta.heroDrawn[0] === 'reconstruction', 'back on T1 or T2 it is shipped again, with its card');
  prof.shipped = false;
  check(prof.shipped === false, 'and `shipped` can still be set (the look probe\'s BEFORE shots)');
  prof.shipped = true; tier = 0;
  R.tierFloor(prof, () => ({ tier: 2 }), rec);
  check(prof.shipped === false, 'installed once (a second hero build does not stack another floor)');
  // As the coordinator builds it: env.quality is the device's tier.
  const P2 = JSON.parse(JSON.stringify(HERO));
  stage.setWorld('stellar');
  const rec2 = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'))).find((r) => r.id === 'dso-m57');
  const h2 = R.createHero(THREE, { profile: P2, record: rec2, gas: G, quality: () => ({ tier: 0 }) });
  // 0078 r14-neb-b: no floor by default (the photograph is not drawn any more: T0 draws the model); a profile's
  // `frame.min_tier` still puts one on
  check(P2.shipped === true, 'createHero puts no floor on a profile without min_tier: on T0 the Ring is drawn');
  h2.dispose();
  const P3 = JSON.parse(JSON.stringify(HERO));
  P3.frame = { ...P3.frame, min_tier: 1 };
  const h3 = R.createHero(THREE, { profile: P3, record: rec2, gas: G, quality: () => ({ tier: 0 }) });
  check(P3.shipped === false, 'with frame.min_tier 1, createHero puts the floor on its profile: on T0 the profile reads not shipped');
  h3.dispose();
}

// --- 5b. the card: a shipped hero names its source after "What is drawn", and its caveats -------------------
{
  await import(join(JS, 'copy/en.later.js'));
  const C = await import(join(JS, 'ui/cardfacts.js'));
  const line = C.honestyClause({ id: 'dso-m57', klass: 'dso', meta: { kind: 'nebula', drawn: ['photograph'], heroDrawn: ['reconstruction'], heroId: 'm57' } }, {});
  check(/O’Dell, Ferland, Henney and Peimbert \(2013\)/.test(line) && /narrow filters/.test(line) && /Not yet reviewed by an astronomer\./.test(line), `the card names its light, its paper, its narrowband colours and that it is not yet reviewed (${line})`);
  const { COPY } = await import(join(JS, 'copy/en.js'));
  const rows = COPY.deepRing && COPY.deepRing.rows && COPY.deepRing.rows['dso-m57'];
  check(Array.isArray(rows) && rows.some(([k, v]) => /depth/.test(k) && /illustration/.test(v)) && rows.some(([, v]) => /not yet been reviewed/.test(v)), 'its rows say what of its depth is drawn as an illustration, and the review');
  check(rows.some(([k, v]) => /distance/.test(k) && /Parallax \(Gaia DR3\)/.test(v)), 'and that its distance is a parallax from Gaia DR3');
}

// --- 6. the knots: in the outer part of the ring, seeded -------------------------------------------------
{
  const n = 2400;
  const a = R.knotsOf(g, n), b = R.knotsOf(g, n);
  check(a.pos.every((v, i) => v === b.pos[i]), 'the same knots every visit (seeded)');
  let out = 0;
  for (let i = 0; i < n; i++) {
    const p = [a.pos[3 * i], a.pos[3 * i + 1], a.pos[3 * i + 2]];
    const q = Math.hypot(dot(p, g.e1) / g.A, dot(p, g.e2) / g.B), u = dot(p, g.axis) / g.H;
    if (q < g.knots.qFrom - 1e-4 || q > g.knots.qTo + 1e-4 || Math.abs(u) > 1.0001) out++;
  }
  check(out === 0, `the knots lie in the ring's outer part, inside its thickness (${out} of ${n} outside)`);
  check(a.knot.every((v, i) => (i % 4 !== 0) || (v > 0.5 * g.knots.head && v < 1.5 * g.knots.head)), 'heads of the measured size (0.2″, 150 au)');
  check(a.knot.every((v, i) => (i % 4 !== 2) || (v >= 0.18 && v <= 0.32)), 'their darkness lighter than the Helix\'s (0.18 to 0.32), so on a phone they do not read as specks');
}

// --- 7. the Helix's exact front (spec 0075 task 45), on the shared part --------------------------------------
{
  const hg = Hx.geometryOf();
  const light = (x, y) => { const r = Math.hypot(x, y) / hg.R1; const k = Math.exp(-(((r - 1.1) / 0.35) ** 2)); return [0.15 + 0.4 * k, 0.35 + 0.15 * k - 0.25 * k * k, 0.45 - 0.35 * k].map((v) => Math.max(0, v) * 0.9); };
  const worst = () => {
    let w = 0;
    for (let k = 0; k < 120; k++) {
      const r = 0.75 * hg.R1 * Math.sqrt((k + 0.5) / 120), th = k * 2.399963, x = r * Math.cos(th), y = r * Math.sin(th);
      const want = light(x, y);
      for (const j of [0.05, 0.37, 0.81]) { const c = Hx.columnJs(hg, [x, y, 40], [0, 0, -1], 4, j, light).rgb; w = Math.max(w, ...c.map((v, i) => Math.abs(v - want[i]) / Math.max(0.05, want[i]))); }
    }
    return w;
  };
  check(Hx.FRONT.exact === true, 'the Helix\'s front is exact by default (the switch is the look probe\'s, for its BEFORE shot)');
  Hx.FRONT.exact = false; const before = worst();
  Hx.FRONT.exact = true; const after = worst();
  check(after < 1e-3 && before > 5 * after, `the Helix on our line with T0's 4 samples, inside the disc: ${(before * 100).toFixed(2)} % before the front, ${(after * 100).toFixed(3)} % with it`);
  check(/float slabIntegral\(/.test(Hx.SHADERS.gas) && /uExact/.test(Hx.SHADERS.gas), 'the Helix\'s fragment integrates its rings\' profile per step');
  const src = readFileSync(join(JS, 'scene/deep/helix.js'), 'utf8');
  check(/from '\.\/shellneb\.js'/.test(src) && !/function layerSpan\(/.test(src) && !/const STAR_FRAG/.test(src), 'the Helix is built on the shared part (its spans, its knots and its star are shellneb.js\'s)');
  check(/'\.\/shellneb\.js'/.test(readFileSync(join(JS, 'scene/deep/ring.js'), 'utf8')), 'and so is the Ring');
}

if (problems.length) {
  console.error('hero ring FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('hero ring ok: the profile and its sources, the ring at 44″ x 30″, PA 60°, tilted 13.5° with the NE end near, the light map where the photograph is, from our side the model IS the photograph (24 and 4 samples), never white edge on, finite from every side, no seams, exact step integrals, the star centred across 90°, T0, shares, nothing moving, the knots, the card, the budgets; the Helix\'s exact front on the shared part');
