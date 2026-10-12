// The harvester asks Horizons for TIME_TYPE='UT' (harvest/lists/horizons-ids.yaml); the parser reads the
// table's own header to tell UT from TDB (data/parsers.js horizonsTimeScale). This holds the two together
// against TWO REAL tables fetched 2026-10-09 (tests/fixtures/horizons/ut-and-tdb.json): MRO round Mars at the
// same four instants, one asked in UT (header "JDUT ,"), one in TDB (the old default, "JDTDB,").
// An earlier test made its UT table by editing a TDB one, so it never saw Horizons pad the real header
// ("JDUT ," and "Calendar Date (UT )") and the first parser read every real UT table as TDB.
//
//   node tests/test_horizons_time.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { horizonsTimeScale, horizonsToUtcMs, horizonsSamples, parseHorizonsVectors, TDB_MINUS_UTC_MS } =
  await import(join(ROOT, 'site/js/data/parsers.js'));
const { sampleDeepSpace } = await import(join(ROOT, 'site/js/data/sample.js'));
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/horizons/ut-and-tdb.json'), 'utf8'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// The four instants both tables describe, as UTC.
const T0 = Date.UTC(2026, 8, 22, 0, 0, 0);
const WANT = [0, 1, 2, 3].map((i) => T0 + i * 6 * 3600 * 1000);

check(horizonsTimeScale(fx.ut) === 'UT', `a real table asked with TIME_TYPE='UT' is read as UT, got ${horizonsTimeScale(fx.ut)}`);
check(horizonsTimeScale(fx.tdb) === 'TDB', `a real table asked without it is read as TDB, got ${horizonsTimeScale(fx.tdb)}`);
check(horizonsToUtcMs(fx.ut) === 0, 'a UT table has nothing taken off');
check(horizonsToUtcMs(fx.tdb) === TDB_MINUS_UTC_MS, 'a TDB table has 69.184 s taken off');

// Horizons' own TDB to UTC differs from the flat 69.184 s by the periodic TDB-TT term, under 2 ms.
const utc = (t) => horizonsSamples(t).map((s) => s.tMs - horizonsToUtcMs(t));
const a = utc(fx.ut);
const b = utc(fx.tdb);
check(a.length === 4 && b.length === 4, `four rows each: ${a.length}, ${b.length}`);
const worstWant = Math.max(...a.map((t, i) => Math.abs(t - WANT[i])));
check(worstWant < 1, `the UT table's instants are the asked UTC ones (worst ${worstWant} ms off)`);
const worstTdb = Math.max(...b.map((t, i) => Math.abs(t - WANT[i])));
check(worstTdb < 3, `the TDB table, once corrected, lands on the same UTC instants (worst ${worstTdb} ms off)`);
// The failure this guards: the correction applied to a table that is already UTC would put it 69 s out.
check(Math.abs(horizonsSamples(fx.ut)[0].tMs - horizonsToUtcMs(fx.ut) - T0) < 1, 'no correction is applied to a UT table');

// The two tables describe the same states at those instants (Mars-centred, km): within what 2 ms of
// motion at 3.4 km/s allows (7 m), so 50 m is the bar.
{
  const su = horizonsSamples(fx.ut);
  const st = horizonsSamples(fx.tdb);
  const worst = Math.max(...su.map((s, i) => Math.hypot(s.x - st[i].x, s.y - st[i].y, s.z - st[i].z)));
  check(worst < 0.05, `the same state at the same instant, whichever scale was asked (worst ${worst.toFixed(4)} km apart)`);
}

// Through the whole parser: MRO's record gets the same sample instants from either table, and they are UTC.
{
  const base = sampleDeepSpace();
  const mro = (body) => parseHorizonsVectors({ '-74': body }, base).find((r) => r.meta && r.meta.horizonsId === -74 || r.id === 'deep-mro');
  const ru = mro(fx.ut);
  const rt = mro(fx.tdb);
  check(ru && rt && ru.samples && rt.samples, 'both tables give MRO a sample set');
  if (ru && rt && ru.samples && rt.samples) {
    check(ru.samples.length === rt.samples.length, 'and as many samples');
    const first = Math.abs(ru.samples[0].tMs - T0);
    check(first < 1, `MRO's first sample from the UT table is at 2026-09-22 00:00 UTC (${first} ms off)`);
    const worst = Math.max(...ru.samples.map((s, i) => Math.abs(s.tMs - rt.samples[i].tMs)));
    check(worst < 3, `the whole parser puts both tables on the same instants (worst ${worst} ms apart)`);
  }
}

if (problems.length) {
  console.log(`horizons time: ${problems.length} problem(s)`);
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('horizons time ok: a real UT table and a real TDB table of the same four instants are told apart, ' +
  'land on the same UTC instants and states, and nothing is corrected twice');
