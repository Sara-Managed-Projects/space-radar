// tests/test_provisional.mjs -- spec 0026 req 15: an object the public catalogue has not numbered yet
// is drawn as inferred, dimmer, and says so on its card.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { parseCelestrakGP } = await import(join(JS, 'data/parsers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const [issRow] = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
// a supplemental-file placeholder: catalogue number 100001, a real designator, an epoch minutes old
const fresh = { ...issRow, OBJECT_NAME: 'STARLINK-99999', OBJECT_ID: '2026-160T', NORAD_CAT_ID: 100001, EPOCH: new Date().toISOString().replace('Z', '') };
const nowish = { ...issRow, EPOCH: new Date().toISOString().replace('Z', '') };
const recs = parseCelestrakGP([fresh, nowish], { layer: 'starlink-trains', source: 'celestrak-starlink' });
const prov = recs.find((r) => r.name === 'STARLINK-99999');
const real = recs.find((r) => r.name !== 'STARLINK-99999');
check(!!prov && prov.id === 'int-2026-160T', `a placeholder number gives a designator id (${prov && prov.id})`);
check(prov.meta.provisional === true && prov.meta.noradId === null && prov.meta.catalogueNumber === 100001, 'it is flagged provisional, with no NORAD id but the placeholder kept');
check(prov.cls === 'inferred', `fresh elements do not make a provisional object "measured" (${prov.cls})`);
check(real && real.meta.provisional === false && real.cls === 'measured', `a numbered object with fresh elements stays measured (${real && real.cls})`);
check(typeof COPY.cls.provisional === 'string' && COPY.cls.provisional.includes('not yet in the public catalogue'), 'the card has the words');

if (problems.length) { console.error('provisional FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('provisional ok: a placeholder catalogue number becomes an inferred, flagged record; a numbered one stays measured');
