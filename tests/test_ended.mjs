// tests/test_ended.mjs -- a craft that is no longer in orbit is not in a list the map draws from, and says what it was.
//
// WHY (review of 2026-11-16). Swift re-entered the atmosphere on 4 November 2026 and stayed in data/layers.js NOTABLE,
// "a space telescope going round the Earth", with a page that offered to show it live. A craft that ends moves to
// data/ended.js NOTABLE_ENDED. This holds the two lists apart, the harvester's cut to the working one, an ended row to
// its shape (dates in order, the past tense, dated sources), and scripts/check_notable_decay.py to the two answers it
// gives for a catalogue row: in orbit, and gone.
//   node tests/test_ended.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { NOTABLE, DEBRIS_NOTABLE } = await import(join(ROOT, 'site/js/data/layers.js'));
const { NOTABLE_ENDED } = await import(join(ROOT, 'site/js/data/ended.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DAY = /^\d{4}-\d\d-\d\d$/;

check(NOTABLE_ENDED.length >= 1 && NOTABLE_ENDED.some((r) => r.noradId === 28485), 'Swift (28485) is in the list of craft that have ended');
const working = new Set(NOTABLE.map((r) => r.noradId));
const debris = new Set(DEBRIS_NOTABLE.map((r) => r.noradId));
const harvested = new Set(JSON.parse(readFileSync(join(ROOT, 'harvest/notable.json'), 'utf8')).norad_ids);
const seen = new Set();
for (const r of NOTABLE_ENDED) {
  const where = `ended.js ${r.name || r.noradId}`;
  check(Number.isInteger(r.noradId) && r.noradId > 0 && !seen.has(r.noradId), `${where}: one row, one catalogue number`);
  seen.add(r.noradId);
  check(!working.has(r.noradId), `${where}: is still in data/layers.js NOTABLE, the list the map draws and describes as working`);
  check(!debris.has(r.noradId), `${where}: is in DEBRIS_NOTABLE, which is things still in orbit`);
  check(!harvested.has(r.noradId), `${where}: is still in harvest/notable.json, so the harvester would cut its elements for the map (run python3 scripts/gen_sources_json.py)`);
  check(DAY.test(r.launched) && DAY.test(r.ended) && r.launched < r.ended, `${where}: launched and ended are days, in that order`);
  check(!r.scienceEnded || (DAY.test(r.scienceEnded) && r.launched < r.scienceEnded && r.scienceEnded <= r.ended), `${where}: its science ended between the two`);
  check(Date.parse(`${r.ended}T00:00:00Z`) <= Date.now(), `${where}: has ended (${r.ended} is not in the future)`);
  check(['re-entered', 'switched-off', 'lost'].includes(r.how), `${where}: says how it ended (${r.how})`);
  for (const key of ['lead', 'why']) {
    const text = String(r[key] || '');
    check(text.length >= 60 && text.endsWith('.'), `${where}: ${key} is a sentence`);
    check(!new RegExp(`\\b${r.name} is\\b|\\bIt (is|turns|sees|watches|measures|takes|keeps|fires|sits)\\b|\\bStill working\\b`).test(text), `${where}: ${key} is in the past tense ("${text.slice(0, 50)}")`);
  }
  check(r.lead.startsWith(`${r.name} was `) && r.lead.includes(String(Number(r.ended.slice(8)))) && r.lead.includes(r.ended.slice(0, 4)), `${where}: the first sentence says what it was and the day it ended`);
  check(/https:\/\/\S+/.test(r.sources) && /read \d{1,2} \w+ \d{4}/.test(r.sources), `${where}: names the pages its dates were read from, and the day`);
  check(!/\bfor (\d+|[a-z-]+) years\b|\b\d+ years (old|later)\b/i.test(`${r.lead} ${r.why}`), `${where}: no count of years that goes stale`);
}
check(harvested.size === working.size && [...working].every((id) => harvested.has(id)), 'harvest/notable.json is the working list, number for number');

// ---- scripts/check_notable_decay.py: the two answers ------------------------------------------------------------
{
  const tmp = mkdtempSync(join(tmpdir(), 'sr-ended-'));
  try {
    const head = 'OBJECT_NAME,OBJECT_ID,NORAD_CAT_ID,OBJECT_TYPE,OPS_STATUS_CODE,OWNER,LAUNCH_DATE,LAUNCH_SITE,DECAY_DATE,PERIOD,INCLINATION,APOGEE,PERIGEE,RCS,DATA_STATUS_CODE,ORBIT_CENTER,ORBIT_TYPE';
    const row = (name, id, status, decay) => `${name},1998-067A,${id},PAY,${status},US,1998-11-20,TYMSC,${decay},92.9,51.6,420,410,400,,EA,ORB`;
    const rows = NOTABLE.map((r) => row(String(r.name).replace(/,/g, ' '), r.noradId, '+', ''));
    const run = (csv, wrap) => {
      const f = join(tmp, wrap ? 'satcat.json' : 'satcat.csv');
      writeFileSync(f, wrap ? JSON.stringify({ schema: 1, source: 'celestrak-satcat', body: csv }) : csv);
      return spawnSync('python3', [join(ROOT, 'scripts/check_notable_decay.py'), '--satcat', f, '--min-objects', '1'], { encoding: 'utf8' });
    };
    const fine = run([head, ...rows].join('\n'), false);
    check(fine.status === 0 && /every one is in orbit/.test(fine.stdout), `a catalogue with every row in orbit passes (${fine.status}: ${fine.stderr})`);
    const first = NOTABLE[2];
    const gone = [head, ...rows.map((line, i) => (i === 2 ? row(first.name, first.noradId, 'D', '2030-01-02') : line))].join('\n');
    const bad = run(gone, true);
    check(bad.status === 1 && bad.stdout.includes(`${first.name} (${first.noradId}): left orbit on 2030-01-02`) && /ended\.js/.test(bad.stdout),
      `a row with a decay date fails, by name, from the harvester's wrapped copy too, and says where it goes (${bad.status}: ${bad.stdout.slice(0, 200)})`);
    const small = spawnSync('python3', [join(ROOT, 'scripts/check_notable_decay.py'), '--satcat', join(tmp, 'satcat.csv')], { encoding: 'utf8' });
    check(small.status === 2, 'a file that is not a whole catalogue is not taken for good news');
    const listed = execFileSync('python3', ['-c', `
import sys
sys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})
import check_notable_decay as c
print(len(c.notable_rows(open(${JSON.stringify(join(ROOT, 'site/js/data/layers.js'))}, encoding='utf-8').read())))
`], { encoding: 'utf8' }).trim();
    check(Number(listed) === NOTABLE.length, `the script reads every row of NOTABLE (${listed} of ${NOTABLE.length})`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
// The scheduled job that runs it on the live site's copy.
const wf = readFileSync(join(ROOT, '.github/workflows/freshness.yml'), 'utf8');
check(/check_notable_decay\.py --satcat satcat\.json/.test(wf) && /data\/v1\/celestrak-satcat\.json/.test(wf), 'freshness.yml runs the check on the live site\'s saved catalogue');

if (problems.length) { console.error('ended craft FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ended craft ok: ${NOTABLE_ENDED.length} craft no longer in orbit, in no list the map draws or the harvester cuts, each in the past tense with its dates and dated sources; the decay check passes a catalogue in orbit, refuses a decayed row and a file that is no catalogue`);
