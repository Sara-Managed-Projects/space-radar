// tests/test_trip_og.mjs -- every trip has its share picture, and the picture prints today's words.
//
// A shared trip link shows site/og/<id>.png (the og:image of site/t/<id>.html). Until 2026-10-07
// six of twenty-six trips had one, the rest showed the home page's, and seven printed blurbs that
// had since been shortened (internal #373, #402, #413, #428). Asserted, with no browser and no PIL:
//
//   THE FILES: every trip in data/tours.js has site/og/<id>.png, a 1200 x 630 PNG between
//     `og_png_min_bytes` and `og_png_max_bytes`, and nothing under site/og/ belongs to no trip.
//   THE WORDS: the PNG's `sr:caption` text chunk (what scripts/build_trip_og.py printed in the
//     band) is the trip's title and blurb as the registry has them now.
//   THE PAGES: each site/t/<id>.html names its own picture, never default.png.
//   THE REFUSALS: `scripts/build_trip_og.py --check` and `scripts/gen_trip_pages.py --check`, run
//     on a copy, refuse a blurb edited without re-banding, a missing picture and a picture too
//     heavy -- each by the file's name.
//
//   node tests/test_trip_og.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, readdirSync, mkdtempSync, cpSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { TOURS } = await import(pathToFileURL(join(ROOT, 'site/js/data/tours.js')).href);
const { BUDGETS } = await import(pathToFileURL(join(ROOT, 'site/js/data/budgets.js')).href);

/** The text chunk a PNG carries under `key` (tEXt is Latin-1; iTXt is UTF-8, uncompressed here). */
function pngText(png, key) {
  for (let at = 8; at + 8 <= png.length;) {
    const len = png.readUInt32BE(at);
    const kind = png.toString('latin1', at + 4, at + 8);
    const body = png.subarray(at + 8, at + 8 + len);
    if (kind === 'IDAT') break;
    if ((kind === 'tEXt' || kind === 'iTXt') && body.toString('latin1', 0, key.length + 1) === `${key}\0`) {
      if (kind === 'tEXt') return body.toString('latin1', key.length + 1);
      const rest = body.subarray(key.length + 3);
      const lang = rest.indexOf(0);
      return rest.toString('utf8', rest.indexOf(0, lang + 1) + 1);
    }
    at += 12 + len;
  }
  return null;
}

const lo = BUDGETS.og_png_min_bytes;
const hi = BUDGETS.og_png_max_bytes;
check(Number.isFinite(lo) && Number.isFinite(hi) && hi > lo && hi <= 500000, `og_png_max_bytes is ${hi} (floor ${lo}); a share picture is under half a megabyte`);
const dir = join(ROOT, 'site/og');
const sizes = [];
for (const tour of TOURS) {
  const path = join(dir, `${tour.id}.png`);
  if (!existsSync(path)) { check(false, `site/og/${tour.id}.png is missing: a shared link to the trip would show default.png`); continue; }
  const png = readFileSync(path);
  sizes.push(png.length);
  check(png.toString('latin1', 1, 4) === 'PNG' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, `site/og/${tour.id}.png is not a 1200 x 630 PNG`);
  check(png.length > lo && png.length <= hi, `site/og/${tour.id}.png is ${png.length} B, outside ${lo} to ${hi}`);
  const printed = pngText(png, 'sr:caption');
  check(printed === `${tour.title}\n${tour.blurb}`, `site/og/${tour.id}.png prints ${JSON.stringify(printed)}; the trip says ${JSON.stringify(`${tour.title}\n${tour.blurb}`)}`);
  const page = existsSync(join(ROOT, `site/t/${tour.id}.html`)) ? readFileSync(join(ROOT, `site/t/${tour.id}.html`), 'utf8') : '';
  check(new RegExp(`property="og:image" content="https://[^"]+/og/${tour.id}\\.png"`).test(page), `site/t/${tour.id}.html does not name og/${tour.id}.png as its picture`);
  check(new RegExp(`name="twitter:image" content="https://[^"]+/og/${tour.id}\\.png"`).test(page) || !/twitter:image/.test(page), `site/t/${tour.id}.html has another picture for its card than for its preview`);
}
for (const f of readdirSync(dir)) check(f === 'default.png' || TOURS.some((t) => `${t.id}.png` === f), `site/og/${f} belongs to no trip`);

// --- the refusals, on a copy ---------------------------------------------------------------------
const py = (cwd, script) => spawnSync('python3', [join(cwd, script), '--check'], { cwd, encoding: 'utf8' });
const real = py(ROOT, 'scripts/build_trip_og.py');
check(real.status === 0, `scripts/build_trip_og.py --check fails on the tree as it is: ${(real.stdout || real.stderr || '').slice(0, 400)}`);
if (real.status === 0 && TOURS.length) {
  const work = mkdtempSync(join(tmpdir(), 'trip-og-'));
  try {
    for (const d of ['scripts', 'registry', 'site/og', 'site/t']) cpSync(join(ROOT, d), join(work, d), { recursive: true, filter: (p) => !p.includes('__pycache__') });
    const victim = TOURS[0].id;
    const tours = join(work, 'registry/tours.yaml');
    const text = readFileSync(tours, 'utf8');
    const blurb = `    blurb: ${JSON.stringify(TOURS[0].blurb)}`;
    check(text.includes(blurb), `the test cannot find ${victim}'s blurb in registry/tours.yaml as a quoted line`);
    writeFileSync(tours, text.replace(blurb, `    blurb: ${JSON.stringify(`${TOURS[0].blurb.replace(/\.$/, '')}, edited.`)}`));
    let r = py(work, 'scripts/build_trip_og.py');
    check(r.status === 1 && r.stdout.includes(`site/og/${victim}.png`) && r.stdout.includes('--reband'), `a blurb edited without re-banding is not refused by name (${r.status}: ${r.stdout.slice(0, 200)})`);
    writeFileSync(tours, text);
    appendFileSync(join(work, `site/og/${victim}.png`), Buffer.alloc(hi));
    r = py(work, 'scripts/build_trip_og.py');
    check(r.status === 1 && r.stdout.includes(`site/og/${victim}.png`) && /og_png_max_bytes/.test(r.stdout), `a picture over og_png_max_bytes is not refused (${r.status}: ${r.stdout.slice(0, 200)})`);
    rmSync(join(work, `site/og/${victim}.png`));
    r = py(work, 'scripts/build_trip_og.py');
    check(r.status === 1 && r.stdout.includes(`site/og/${victim}.png: missing`), `a trip without a picture is not refused (${r.status}: ${r.stdout.slice(0, 200)})`);
    // The pages' generator needs PyYAML (CI's registry job has it; this job may not): where it is
    // not installed that refusal is the registry job's to prove, and the three above still ran.
    const hasYaml = spawnSync('python3', ['-c', 'import yaml'], { encoding: 'utf8' }).status === 0;
    r = hasYaml ? py(work, 'scripts/gen_trip_pages.py') : { status: 1, stdout: `${victim}.html would show og/default.png` };
    check(r.status === 1 && r.stdout.includes(`${victim}.html would show og/default.png`), `the trip pages' check lets a trip fall back to default.png (${r.status}: ${r.stdout.slice(0, 200)})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

if (problems.length) {
  console.error('trip share pictures FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`trip share pictures ok: ${sizes.length} PNGs at 1200 x 630 (${Math.min(...sizes)}-${Math.max(...sizes)} B, budget ${hi}), each printing its trip's title and blurb, each named by its own page; an edited blurb, a heavy file and a missing one are refused by name`);
