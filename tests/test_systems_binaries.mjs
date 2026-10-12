// tests/test_systems_binaries.mjs -- the two suns of Kepler-16 and Kepler-1647 (internal #475, #549).
//
//   node tests/test_systems_binaries.mjs
//
// registry/systems-binaries.yaml types each pair from its papers; scripts/build-systems.py joins it
// to the system. What this holds, in the browser's own code:
//   1. THE ORBIT'S ORIENTATION AGAINST THE PAPERS' OWN ECLIPSES. Kepler-1647: Kostov et al. 2016
//      Table 4 gives the binary's time of conjunction, BJD 2454956.48005; the primary must be
//      eclipsed (the companion on +u, in front) there and one lap later, and a lap after 350 more
//      laps (the present day). Kepler-16: Doyle et al. 2011 print a primary eclipse at BJD 2455089
//      and a secondary at 2455232 (Figure 1's caption); the drawn orbit puts the companion in front
//      of the primary within a day of the first and behind it within a day of the second.
//   2. KEPLER'S THIRD LAW on each binary, the barycentre's shares, the separation range.
//   3. THE CARD says both suns are drawn, names the companion's temperature as a model value for
//      Kepler-16, and prints the zone from the summed light.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const S = await import(join(JS, 'scene/systems.js'));
const { SYSTEMS_TABLE } = await import(join(JS, 'data/systems-table.js'));
const C = await import(join(JS, 'ui/systemcard.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

const JD_UNIX = 2440587.5, DAY = 86400000;
const msOf = (jd) => (jd - JD_UNIX) * DAY;
const sys = (host) => SYSTEMS_TABLE.find((x) => x.host === host);
const k16 = sys('Kepler-16');
const k47 = sys('Kepler-1647');
check(k16 && k16.binary && k47 && k47.binary, 'both systems carry a binary row');

const rel = (b, jd) => S.binaryRelative(b, msOf(jd));
const front = (b, jd) => { const r = rel(b, jd); return r.along / r.r; };

// 1a. Kepler-1647 against its photodynamical conjunction, over 350 laps.
{
  const P = k47.binary.orbit.periodDays;
  for (const n of [0, 1, 50, 350]) {
    const f = front(k47.binary, 2454956.48005 + n * P);
    check(f > 0.999, `Kepler-1647: the companion is in front of the primary at conjunction + ${n} laps (${f.toFixed(5)})`);
    const g = front(k47.binary, 2454956.48005 + (n + 0.5) * P);
    check(Math.abs(g) < 0.999, `Kepler-1647: half a lap on it is not an eclipse (${g.toFixed(3)})`);
  }
  const mid = (2454956.48005 + 350 * P) + 0.4 * P;
  const behind = Math.min(...[0.45, 0.5, 0.55, 0.6].map((d) => front(k47.binary, 2454956.48005 + 350 * P + d * P)));
  check(behind < -0.9, `Kepler-1647: the companion goes behind the primary half a lap after (${behind.toFixed(3)}; mid ${mid.toFixed(2)})`);
}
// 1b. Kepler-16 against Doyle et al.'s eclipse dates (whole days as printed).
{
  const best = (jd, sign) => Math.max(...Array.from({ length: 201 }, (_, i) => sign * front(k16.binary, jd - 1 + i * 0.01)));
  check(best(2455089, 1) > 0.999, `Kepler-16: a primary eclipse within a day of BJD 2455089 (${best(2455089, 1).toFixed(5)})`);
  check(best(2455232, -1) > 0.999, `Kepler-16: a secondary eclipse (companion behind) within a day of BJD 2455232 (${best(2455232, -1).toFixed(5)})`);
  check(best(2455089 + 41.0778 * 2, 1) > 0.999, 'Kepler-16: and two laps later');
}
// 2. The orbit and the shares.
for (const s of [k16, k47]) {
  const b = s.binary, o = b.orbit;
  const implied = o.aAu ** 3 / (o.periodDays / 365.25) ** 2;
  const total = b.primary.massSuns + b.companion.massSuns;
  check(Math.abs(implied / total - 1) < 0.03, `${s.host}: a^3/P^2 ${implied.toFixed(4)} against the masses' sum ${total.toFixed(4)}`);
  const { fA, fB } = S.binaryShares(b);
  check(Math.abs(fA + fB - 1) < 1e-12 && fA > 0.5, `${s.host}: the heavier star sits nearer the barycentre`);
  let lo = Infinity, hi = 0;
  for (let i = 0; i < 400; i += 1) { const r = S.binaryRelative(b, msOf(2461000 + i * 0.37)).r; lo = Math.min(lo, r); hi = Math.max(hi, r); }
  check(Math.abs(lo - o.aAu * (1 - o.eccentricity)) < 0.002 * o.aAu && Math.abs(hi - o.aAu * (1 + o.eccentricity)) < 0.002 * o.aAu, `${s.host}: the separation runs from a(1-e) to a(1+e) (${lo.toFixed(4)} to ${hi.toFixed(4)})`);
  check(s.zone && s.zone.innerAu < s.zone.outerAu && s.planets.every((p) => p.circumbinary), `${s.host}: a band from the summed light, and no verdict for the planet`);
}
// 3. The card.
{
  const R = COPY.starSystem.rows, K = COPY.starSystem;
  const rows = C.starRows(k16);
  const row = (label) => (rows.find((r) => r[0] === label) || [])[1];
  check(row(R.stars) === K.starsBoth, 'the star card says both suns are drawn');
  check(/3.311 K/.test(row(R.companion)) && /model value/.test(row(R.companion)), `Kepler-16's second sun says its temperature is a model value (${row(R.companion)})`);
  check(!/model value/.test((C.starRows(k47).find((r) => r[0] === R.companion) || [])[1]), 'Kepler-1647\'s companion temperature is a paper value, not marked as a model');
  check(/summed/.test(row(R.zone)), `the zone row says the light is summed (${row(R.zone)})`);
  check(/41\.08 days|41\.1 days|41 days/.test(C.generatedLine(k16)) && /both/.test(C.generatedLine(k16)), 'the drawing line says the suns circle each other and the planet goes round both');
}

if (problems.length) { console.error(`systems binaries FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  ')); process.exit(1); }
console.log('systems binaries ok: Kepler-16 and Kepler-1647 put the companion in front at the papers\' eclipse times, a^3/P^2 matches the masses, the cards say both suns are drawn');
