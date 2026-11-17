// scripts/make_comet_reference.mjs -- writes tests/fixtures/comets_horizons_reference.json (internal #393, review of 2026-11-16).
// For each comet: the SBDB row exactly as the harvester's jpl-sbdb-comets query returns it with full-prec=1 (sbdb.api, same elements and
// epoch), and JPL Horizons' heliocentric ecliptic J2000 state vector of the comet and of the Earth at one fixed instant. Run by hand, only
// to refresh the reference; the test reads the stored file and needs no network:
//   node scripts/make_comet_reference.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/comets_horizons_reference.json');
const WHEN = '2026-11-16 06:00:00'; // UT, a fixed instant in the past: a Horizons answer for it does not move with later fits
const COMETS = [['2P', '2P/Encke'], ['21P', '21P/Giacobini-Zinner'], ['13P', '13P/Olbers']];

async function get(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'user-agent': 'space-radar-reference/1.0' } });
    if (r.ok) return r.text();
    await new Promise((s) => setTimeout(s, 3000));
  }
  throw new Error('fetch failed: ' + url);
}
async function vector(command) {
  const p = new URLSearchParams({ format: 'text', OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', COMMAND: `'${command}'`, EPHEM_TYPE: 'VECTORS',
    CENTER: "'500@10'", TLIST: `'${WHEN}'`, TLIST_TYPE: 'CAL', TIME_TYPE: 'UT', REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF',
    VEC_TABLE: '2', VEC_CORR: 'NONE', OUT_UNITS: 'KM-S', CSV_FORMAT: 'YES' });
  const t = await get('https://ssd.jpl.nasa.gov/api/horizons.api?' + p);
  const line = /\$\$SOE\n([\s\S]*?)\$\$EOE/.exec(t)[1].split('\n').find((l) => l.trim());
  const f = line.split(',').map((s) => s.trim());
  return { jdTdb: +f[0], calendar: f[1], xKm: +f[2], yKm: +f[3], zKm: +f[4], vxKmS: +f[5], vyKmS: +f[6], vzKmS: +f[7], line };
}
const fields = ['full_name', 'e', 'a', 'q', 'i', 'om', 'w', 'ma', 'tp', 'epoch', 'M1', 'K1'];
const rows = [];
for (const [des, name] of COMETS) {
  const j = JSON.parse(await get('https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=' + encodeURIComponent(des) + '&full-prec=1'));
  const el = Object.fromEntries(j.orbit.elements.map((e) => [e.name, e.value]));
  const mag = (k) => (j.orbit.model_pars || []).find((m) => m.name === k)?.value ?? null;
  rows.push({ des, orbitId: j.object.orbit_id, row: [`    ${name}`, el.e, el.a, el.q, el.i, el.om, el.w, el.ma, el.tp, j.orbit.epoch, mag('M1'), mag('K1')],
    horizons: await vector(`DES=${des};CAP;NOFRAG`) });
}
const earth = await vector('399');
writeFileSync(OUT, JSON.stringify({
  _note: 'Reference for internal #393: comet positions from the feed against JPL Horizons. rows[].row is the SBDB row (full precision, as the jpl-sbdb-comets feed carries it after public #1438); rows[].horizons is the Horizons VECTORS answer for the comet (COMMAND DES=<des>;CAP;NOFRAG, CENTER 500@10, REF_PLANE ECLIPTIC, REF_SYSTEM ICRF, TLIST_TYPE CAL, TIME_TYPE UT, VEC_CORR NONE, KM-S), and earth that for the Earth (399). Made by scripts/make_comet_reference.mjs.',
  sources: { sbdb: 'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=<des>&full-prec=1', horizons: 'https://ssd.jpl.nasa.gov/api/horizons.api' },
  licence: 'NASA/JPL content, generally not copyrighted in the United States; the API publishes no licence text',
  fetched: new Date().toISOString(), whenUt: WHEN + ' UT', fields, rows, earth }, null, 1) + '\n');
console.log('written', OUT);
