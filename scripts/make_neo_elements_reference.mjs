// scripts/make_neo_elements_reference.mjs -- writes tests/fixtures/neo_horizons_elements.json (internal #392, review of 2026-11-16).
// For the four objects of tests/fixtures/neo_fullprec_cad.json: JPL Horizons' osculating-elements answer at the Julian date of each one's
// CAD close approach, byte for byte as harvest/neo_elements.py asks for it (the request URL is built by the same function's twin below).
// Run by hand, only to refresh; the tests read the stored file.   node scripts/make_neo_elements_reference.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures');
const cad = JSON.parse(readFileSync(join(T, 'neo_fullprec_cad.json'), 'utf8')).cad;
const rows = {};
for (const r of cad.data) {
  const des = r[0], jd = Number(r[2]).toFixed(6);
  const q = new URLSearchParams({ format: 'text', COMMAND: `'DES=${des};'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'ELEMENTS', CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF', TLIST: `'${jd}'`, TLIST_TYPE: 'JD', OUT_UNITS: 'AU-D', CSV_FORMAT: 'YES' });
  const res = await fetch('https://ssd.jpl.nasa.gov/api/horizons.api?' + q.toString().replace(/\+/g, '%20'));
  rows[des] = { jd: Number(jd), text: await res.text() };
  await new Promise((s) => setTimeout(s, 500));
}
writeFileSync(join(T, 'neo_horizons_elements.json'), JSON.stringify({
  _note: 'JPL Horizons osculating elements (EPHEM_TYPE=ELEMENTS, CENTER 500@10, ECLIPTIC J2000, AU-D, CSV) at the CAD close-approach Julian date of each object of neo_fullprec_cad.json; the answers are whole, as Horizons returned them.',
  source: 'https://ssd.jpl.nasa.gov/api/horizons.api', licence: 'NASA/JPL content, generally not copyrighted in the United States; the API publishes no licence text',
  fetched: new Date().toISOString(), rows }, null, 1) + '\n');
