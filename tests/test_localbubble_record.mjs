// The Local Bubble has a searchable record (internal #423): registry/dso-hand.yaml `local-bubble`, site/data/dso.json.
// Run: node tests/test_localbubble_record.mjs
//
// 1. The record exists, with a source, a type phrase and a size that spans the wall (340 pc = 2 x the 170 pc of O'Neill et al.
//    2024, ApJ 973, 138) seen from where the record stands.
// 2. Where it stands is FOUND from the shipped dust, not typed: in 200 directions (Fibonacci), the distance at which the sixth
//    point inside a 25 degree cone is reached is the wall's first dense point; the mean of those places is the cavity's middle.
//    It must come out within 25 pc of the Sun (the Sun is near the middle: the scatter of this estimate is about 10 pc) and
//    the record must stand within 10 pc of it.
// 3. The card says what is measured and what is not, in all eleven languages (the 'dso-local-bubble' rows), and no row is
//    left in English in the other ten.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
const rec = dso.objects.find((o) => o.id === 'local-bubble');
check(!!rec, 'site/data/dso.json has the record local-bubble');
if (rec) {
  check(/O'Neill/.test(rec.distanceSource) && /Edenhofer/.test(rec.distanceSource), 'the record names both papers');
  check(rec.typeText === 'cavity in the interstellar medium', 'its type phrase');
  const half = Math.tan((rec.majAxArcmin / 60 / 2) * Math.PI / 180) * rec.distLy; // ly, seen from the record
  check(Math.abs(half - 170 * 3.26156) < 15, `its size spans the wall: half ${half.toFixed(0)} ly vs ${(170 * 3.26156).toFixed(0)}`);
}

// The cavity's middle, from the points.
const bin = readFileSync(join(ROOT, 'site/data/deep/localdust.bin'));
const man = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/localdust.json'), 'utf8'));
const n = bin.readUInt32LE(8), stride = bin.readUInt32LE(12), box = man.grid.boxPc, q = (2 * box) / 255;
const P = [];
for (let i = 0; i < n; i++) { const o = 16 + i * stride; P.push([bin[o] * q - box, bin[o + 1] * q - box, bin[o + 2] * q - box]); }
const M = 200, cosc = Math.cos((25 * Math.PI) / 180);
let cx = 0, cy = 0, cz = 0;
for (let i = 0; i < M; i++) {
  const z = 1 - (2 * (i + 0.5)) / M, r = Math.sqrt(1 - z * z), a = i * 2.399963;
  const u = [r * Math.cos(a), r * Math.sin(a), z];
  const rs = [];
  for (const p of P) { const d = Math.hypot(p[0], p[1], p[2]); if (p[0] * u[0] + p[1] * u[1] + p[2] * u[2] > cosc * d) rs.push(d); }
  rs.sort((x, y) => x - y);
  cx += rs[5] * u[0]; cy += rs[5] * u[1]; cz += rs[5] * u[2];
}
const mid = [cx / M, cy / M, cz / M];
check(Math.hypot(...mid) < 25, `the cavity's middle is near the Sun: ${mid.map((v) => v.toFixed(1)).join(', ')} pc`);
if (rec) {
  // the record's place in the map's Galactic axes (the IAU matrix; rows are the equatorial axes in Galactic coordinates)
  const G2E = [[-0.0548755604162154, 0.4941094278755837, -0.8676661490190047], [-0.873437090234885, -0.4448296299600112, -0.1980763734312015], [-0.4838350155487132, 0.7469822444972189, 0.4559837761750669]];
  const ra = (rec.raDeg * Math.PI) / 180, de = (rec.decDeg * Math.PI) / 180, pc = (rec.distLy / 3.26156);
  const e = [Math.cos(de) * Math.cos(ra), Math.cos(de) * Math.sin(ra), Math.sin(de)];
  const g = [0, 1, 2].map((j) => pc * (G2E[0][j] * e[0] + G2E[1][j] * e[1] + G2E[2][j] * e[2]));
  const off = Math.hypot(g[0] - mid[0], g[1] - mid[1], g[2] - mid[2]);
  check(off < 10, `the record stands within 10 pc of the found middle: ${g.map((v) => v.toFixed(1)).join(', ')} vs ${mid.map((v) => v.toFixed(1)).join(', ')} (${off.toFixed(1)} pc)`);
}

// The card's own words (COPY.deepFacts.records, the honesty line), in every language.
const LANGS = ['en', 'ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh'];
const wordsOf = async (lang) => {
  const mod = await import(join(ROOT, `site/js/copy/${lang === 'en' ? 'en.facts' : lang}.js`));
  const F = lang === 'en' ? (await import(join(ROOT, 'site/js/copy/en.js'))).COPY.deepFacts : mod.COPY.deepFacts;
  return F && F.records && F.records['dso-local-bubble'];
};
const en = await wordsOf('en');
check(!!en && en.split.length > 300, 'English words exist');
if (en) {
  check(/Measured/.test(en.split) && /Modelled/.test(en.split) && /Illustrative/.test(en.split) && /Not measured/.test(en.split), 'the English words say what is measured, modelled, illustrative and not measured');
  check(/Edenhofer/.test(en.split) && /O.Neill/.test(en.split) && /170/.test(en.split) && /40 parsecs/.test(en.split), 'they name the papers, the 170 pc wall and the empty 40 pc');
  for (const lang of LANGS.slice(1)) {
    const w = await wordsOf(lang);
    check(!!w && w.drawn !== en.drawn && w.split !== en.split && w.split.length > 200, `${lang}: the words are translated`);
  }
}

if (problems.length) { console.error('local bubble record FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`local bubble record ok: found, sized by the wall, placed at the middle the points show (${mid.map((v) => v.toFixed(1)).join(', ')} pc), a card in ${LANGS.length} languages`);
