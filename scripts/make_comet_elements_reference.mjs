// scripts/make_comet_elements_reference.mjs -- writes tests/fixtures/comet_horizons_elements.json (internal #393).
// What JPL Horizons answered (EPHEM_TYPE ELEMENTS, the request harvest/comet_elements.py makes) for 2P/Encke, 21P/Giacobini-Zinner, 13P/Olbers and
// the hyperbolic C/2025 N1 (ATLAS) at 00:00 UT on 2026-11-16, and the SBDB row of C/2025 N1 (the other three rows are in
// comets_horizons_reference.json). Run by hand, only to refresh the reference; tests read the stored file and need no network:
//   node scripts/make_comet_elements_reference.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/comet_horizons_elements.json');
const JD = 2461360.500800926; // 2026-11-16 00:00 UT as a TDB Julian date: harvest/comet_elements.py epoch_jd_tdb(2026-11-16)
const rows = {};
for (const des of ['2P', '21P', '13P', 'C/2025 N1']) {
  const q = { format: 'text', COMMAND: `'DES=${des};CAP;NOFRAG'`, OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'ELEMENTS', CENTER: "'500@10'",
    REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF', TLIST: `'${JD.toFixed(6)}'`, TLIST_TYPE: 'JD', OUT_UNITS: 'AU-D', CSV_FORMAT: 'YES' };
  const u = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + Object.entries(q).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  rows[des] = { jd: JD, text: await (await fetch(u, { headers: { 'user-agent': 'space-radar-reference/1.0' } })).text() };
}
const j = await (await fetch('https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=' + encodeURIComponent('C/2025 N1') + '&full-prec=1')).json();
const el = Object.fromEntries(j.orbit.elements.map((e) => [e.name, e.value]));
const mp = (k) => (j.orbit.model_pars || []).find((m) => m.name === k)?.value ?? null;
writeFileSync(OUT, JSON.stringify({
  _note: 'Reference for internal #393: JPL Horizons osculating elements (heliocentric, ecliptic J2000, AU-D) at 2026-11-16 00:00 UT for comets, and the SBDB row of C/2025 N1. Made by scripts/make_comet_elements_reference.mjs.',
  licence: 'NASA/JPL content, generally not copyrighted in the United States; the API publishes no licence text',
  fetched: new Date().toISOString(), whenUt: '2026-11-16 00:00 UT', rows,
  sbdbN1: [`    ${j.object.fullname}`, el.e, el.a, el.q, el.i, el.om, el.w, el.ma, el.tp, j.orbit.epoch, mp('M1'), mp('K1')] }, null, 1) + '\n');
console.log('written', OUT);
