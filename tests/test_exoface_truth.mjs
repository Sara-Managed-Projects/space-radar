// tests/test_exoface_truth.mjs -- the planet-face label says "Measured" only of a measured number
// (internal #538). scene/exoface.js rowOf() passes the generated table's `radiusFrom` / `massFrom`,
// and faceLabel() prints an estimated radius as "Estimated", a minimum mass as "At least N Earth
// masses", and keeps "Measured" for the year and for numbers the Archive measured. This walks EVERY
// planet of SYSTEMS_TABLE, so a planet added by the next table pull is held to it too.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '../site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const X = await import(join(JS, 'scene/exoface.js'));
const { SYSTEMS_TABLE } = await import(join(JS, 'data/systems-table.js'));

const two = X.twoFigures;
let planets = 0;
let estimatedRadius = 0;
for (const sys of SYSTEMS_TABLE) {
  for (const p of sys.planets) {
    planets++;
    const L = X.faceLabel(X.faceFor(X.rowOf(p, sys.star)));
    const said = L.measured;
    // What follows the word "Measured" may hold only measured numbers.
    const radiusWords = (n) => `${two(n)} Earth radii`;
    const massWords = (n) => `${two(n)} Earth masses`;
    const afterMeasured = said.includes('Measured: ') ? said.slice(said.indexOf('Measured: ')) : '';
    if (p.radiusFrom !== 'measured') {
      estimatedRadius++;
      check(!/Earth radii/.test(afterMeasured), `${p.name}: its radius is ${p.radiusFrom} and the label says "${said}"`);
    }
    if (p.massFrom !== 'measured') {
      check(!/Earth masses/.test(afterMeasured), `${p.name}: its mass is ${p.massFrom} and the label says "${said}"`);
    }
    if (p.massFrom === 'least' && p.radiusFrom !== 'measured') {
      check(said.startsWith(`At least ${massWords(p.massEarths)}.`), `${p.name}: a minimum mass reads "At least N Earth masses": ${said}`);
    }
    if (p.radiusFrom === 'measured') {
      check(said.startsWith(`Measured: ${radiusWords(p.radiusEarths)}`), `${p.name}: a measured radius is said as measured: ${said}`);
    }
    check(!/—/.test(L.line) && !/ -- /.test(L.line), `${p.name}: no dash in the label`);
    check(L.line.startsWith(L.tag), `${p.name}: the tag still leads the line`);
  }
}
check(planets >= 90 && estimatedRadius >= 28, `the walk saw the whole table (${planets} planets, ${estimatedRadius} with an estimated radius)`);

const find = (name) => { for (const sys of SYSTEMS_TABLE) for (const p of sys.planets) if (p.name === name) return X.faceLabel(X.faceFor(X.rowOf(p, sys.star))); return null; };
const prox = find('Proxima Cen b');
check(prox && prox.measured === 'At least 1.1 Earth masses. Measured: an 11-day year.', `Proxima Cen b reads as a minimum mass: ${prox && prox.measured}`);
check(prox && !/Earth radii/.test(prox.line), 'Proxima Cen b prints no radius as measured');
const k186 = find('Kepler-186 f');
check(k186 && k186.measured === 'Measured: 1.2 Earth radii, a 130-day year.', `Kepler-186 f keeps its measured radius and drops its estimated mass: ${k186 && k186.measured}`);

// A row with no `*From` (the hand-authored systems, the CSV) keeps the old reading.
const old = X.faceLabel(X.faceFor({ name: 'Plain', radiusEarths: 1.7, periodDays: 25, starTeffK: 5800, starRadiusSuns: 1 }));
check(old.measured === 'Measured: 1.7 Earth radii, a 25-day year.', `a row without radiusFrom is unchanged: ${old.measured}`);
// An estimated radius alone is "Estimated".
const est = X.faceLabel(X.faceFor({ name: 'Guess', radiusEarths: 0.7, radiusFrom: 'estimated', periodDays: 5.1, starTeffK: 3000, starRadiusSuns: 0.2 }));
check(est.measured === 'Estimated: 0.7 Earth radii. Measured: a 5.1-day year.', `an estimated radius reads as one: ${est.measured}`);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`exoface truth ok: ${planets} planets of the table walked (${estimatedRadius} with a radius the Archive only estimated), none says "Measured" of an estimate; Proxima Cen b: "${prox.measured}"; Kepler-186 f: "${k186.measured}"`);
