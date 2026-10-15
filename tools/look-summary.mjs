// tools/look-summary.mjs -- what a look found, as one page, and the verdict of the job.
//
//   node tools/look-summary.mjs --dir=<folder> --probe=smoke --browser=chromium [--ref=<sha>] [--hold=true|false]
//
// <folder> holds what a run left: out.json (what the probe returned: the stdout of tools/cdp.mjs or
// tools/look-playwright.mjs), err.txt (their stderr, with the page's console as `[error] ...` and
// `[pageerror] ...` lines) and the pictures. This writes <folder>/summary.md, prints it, and exits
//   1  when the page logged an error (console.error, an uncaught error, an unhandled rejection),
//      when the probe returned a `fail`, or when it returned nothing at all;
//   0  otherwise, including NEUTRAL: the browser could not make a WebGL2 context, which is written
//      down with what the browser reported and is not a failure of the change being looked at.
// A broken shader is then a red check and not a picture nobody opened (.github/workflows/look.yml).
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The page's own errors as the tools print them on stderr. Pure. */
export function pageErrorsOf(errText) {
  const out = [];
  for (const line of String(errText || '').split('\n')) {
    const m = /^\[(error|pageerror)\] (.*)$/.exec(line);
    if (m) out.push((m[1] === 'pageerror' ? 'uncaught: ' : 'console.error: ') + m[2].slice(0, 600));
  }
  return out;
}

/**
 * The verdict. `out` is the parsed out.json or null; `errText` the tool's stderr.
 * -> { status: 'pass' | 'fail' | 'neutral', errors: [...], warns: [...], reasons: [...] }. Pure.
 */
export function judge(out, errText) {
  const text = String(errText || '');
  if (out && out.neutral) return { status: 'neutral', errors: [], warns: [], reasons: [String(out.neutral)] };
  const errors = out && Array.isArray(out.errors) ? out.errors.map(String) : [];
  // What the tool saw and the probe's own listeners did not (an error before the probe was in the
  // page, or a run whose probe never returned).
  const body = (s) => s.replace(/^(console\.error|uncaught|unhandled rejection): /, '').slice(0, 60);
  for (const e of pageErrorsOf(text)) if (!errors.some((x) => body(x) === body(e) || x.includes(body(e)))) errors.push(e);
  const reasons = [];
  if (!out) {
    const said = text.split('\n').filter((l) => /^(DRIVER FAILED|PAGE THREW)/.test(l)).join(' / ');
    reasons.push('the probe returned nothing' + (said ? ': ' + said.slice(0, 400) : ' (killed at the time limit, or the browser died): see err.txt'));
  }
  if (out && out.fail) reasons.push('the probe says: ' + out.fail);
  if (errors.length) reasons.push(errors.length + (errors.length === 1 ? ' error' : ' errors') + ' logged by the page');
  return { status: reasons.length ? 'fail' : 'pass', errors, warns: out && Array.isArray(out.warns) ? out.warns.map(String) : [], reasons };
}

const n = (x) => (typeof x === 'number' ? x.toLocaleString('en-US') : '?');
const one = (s) => String(s).replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();

/** The scenes a probe measured: rows of out.scenes that carry a frame time. Pure. */
export function scenesOf(out) {
  return out && Array.isArray(out.scenes) ? out.scenes.filter((r) => r && typeof r === 'object' && r.name && ('p50Ms' in r || 'medianMs' in r)) : [];
}

export const CSV_COLUMNS = ['commit', 'probe', 'name', 'object', 'at', 'stage', 'distance', 'tier', 'look', 'exposure', 'seed', 'clock', 'frames', 'p50Ms', 'p95Ms', 'maxMs', 'workP50Ms', 'workP95Ms', 'calls', 'triangles', 'textures', 'geometries', 'programs', 'gpuMiB', 'gpuVisibleMiB', 'netBytes', 'netRequests', 'width', 'height', 'dpr'];

/** The scenes as CSV, one row each, with the commit looked at (internal spec 0076 W1-e). Pure. */
export function scenesCsv(out, { ref = '', probe = '' } = {}) {
  const rows = scenesOf(out);
  if (!rows.length) return '';
  const [w, h, dpr] = (out && out.viewport) || [];
  const cell = (v) => { if (v === null || v === undefined) return ''; const t = String(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) {
    const v = { ...r, commit: ref, probe, p50Ms: r.p50Ms ?? r.medianMs, distance: r.distance ?? r.distanceLy, calls: r.calls ?? (r.cost && r.cost.calls), triangles: r.triangles ?? (r.cost && r.cost.triangles), textures: r.textures ?? (r.cost && r.cost.textures), geometries: r.geometries ?? (r.cost && r.cost.geometries), programs: r.programs ?? (r.cost && r.cost.programs), width: w, height: h, dpr };
    lines.push(CSV_COLUMNS.map((k) => cell(v[k])).join(','));
  }
  return lines.join('\n') + '\n';
}

/** The page. `pictures` is [{ file, bytes }]. Pure. */
export function summarise({ out, errText, pictures = [], probe = '', browser = '', ref = '', hold = '' }) {
  const v = judge(out, errText);
  const L = [];
  L.push(`# look: ${probe} in ${browser}: ${v.status === 'pass' ? 'PASS' : v.status === 'neutral' ? 'NEUTRAL' : 'FAIL'}`, '');
  for (const r of v.reasons) L.push(`- ${v.status === 'neutral' ? 'Not drawn, and not a failure' : 'Failed'}: ${one(r)}`);
  if (v.reasons.length) L.push('');
  if (ref) L.push(`Looked at \`${ref}\`.`);
  if (out && !out.neutral) {
    const t = out.tier || {};
    L.push(`Browser: ${one(out.browserVersion ? browser + ' ' + out.browserVersion : out.userAgent || browser)}. GL: ${one(out.gl || '?')}. Window: ${(out.viewport || []).slice(0, 2).join(' x ')} at ${(out.viewport || [])[2] || '?'} px a pixel. Layers ready after ${n(out.readyMs)} ms.`);
    const asked = hold === 'true' ? 'asked to be held (`?look=1`)' : hold === 'false' ? 'left live, as a visitor has it' : 'not said';
    const got = out.held === true ? 'held' : out.held === false ? 'live' : 'this ref has no `?look=1` switch, so it was live';
    L.push(`Frame latch: ${asked}; ${got}; ${out.latched ? '**it tripped**: the effects a slow device loses are off in these pictures' : 'not tripped'}. Tier ${t.tier ?? '?'} (boot ${t.bootTier ?? '?'}), pixel ratio ${out.scale ?? '?'}.`);
    if (hold === 'true' && out.held !== true) L.push('**The latch was asked to be held and was not.** A software renderer then loses the new effects after a few seconds: read the pictures as what a slow device gets.');
    const r = out.render;
    if (r) L.push('', `Renderer, last frame: ${n(r.calls)} draw calls, ${n(r.triangles)} triangles, ${n(r.textures)} textures, ${n(r.programs)} programs.`);
  }
  L.push('', `## Errors (${v.errors.length})`, '');
  if (!v.errors.length) L.push('None.');
  for (const e of v.errors.slice(0, 40)) L.push('- `' + one(e).replace(/`/g, "'").slice(0, 500) + '`');
  if (v.errors.length > 40) L.push(`- ... and ${v.errors.length - 40} more in out.json`);
  L.push('', `## Warnings (${v.warns.length})`, '');
  if (!v.warns.length) L.push('None.');
  for (const w of v.warns.slice(0, 25)) L.push('- `' + one(w).replace(/`/g, "'").slice(0, 300) + '`');
  if (v.warns.length > 25) L.push(`- ... and ${v.warns.length - 25} more in out.json`);
  const lost = String(errText || '').split('\n').filter((l) => l.startsWith('[network] ')).map((l) => l.slice(10));
  const missing = [...((out && Array.isArray(out.missing) && out.missing) || []), ...lost];
  if (missing.length) L.push('', '## Not there', '', ...missing.slice(0, 30).map((m) => '- ' + one(m)));
  const ways = (out && Array.isArray(out.glTried) && out.glTried) || [];
  if (ways.length > 1 || (ways.length && out.neutral)) L.push('', '## How the browser was started', '', ...ways.map((w) => `- ${one(w.way)}: ${w.ok ? 'WebGL2 from ' + one(w.renderer) : 'no WebGL2: ' + one(w.said)}`));
  if (out && out.frames && Object.keys(out.frames).length) {
    L.push('', '## Frame time', '',
      `Median and 95th percentile of the interval between animation frames, GL \`${one(out.gl || '?')}\`. **On a software renderer the absolute numbers mean nothing**: they are for comparing one run on this kind of runner with another. The same probe on a machine with a GPU gives the absolute ones. No budget is gated on them yet.`, '',
      '| scene | frames | median ms | p95 ms | min | max | draw calls | triangles | latched |', '|---|---|---|---|---|---|---|---|---|');
    for (const [name, f] of Object.entries(out.frames)) L.push(`| ${one(name)} | ${f.frames} | ${f.medianMs} | ${f.p95Ms} | ${f.minMs} | ${f.maxMs} | ${n(f.calls)} | ${n(f.triangles)} | ${f.latched ? 'yes' : 'no'} |`);
  }
  // The numbers per scene (internal spec 0076 W1-e): a probe that returns `scenes` with frame times
  // (heroes, deepspace) gets one table; sr.perf's columns where the ref has it.
  const rows = scenesOf(out);
  if (rows.length) {
    L.push('', `## Numbers per scene (${rows.length})`, '',
      `Drawn-frame intervals (p50, p95) and the loop's own work per frame, renderer counts of the last frame, an ESTIMATE of what the scene graph holds on the GPU, and the bytes fetched while the scene was measured. GL \`${one(out.gl || '?')}\`: relative numbers, for comparing runs on this kind of runner. Also in \`scenes.csv\`.`, '',
      '| scene | stage | distance | tier | look | frames | p50 ms | p95 ms | work p50 | calls | triangles | textures | programs | GPU MiB | net B |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const c = (x) => (x === null || x === undefined ? '' : one(typeof x === 'number' ? n(x) : x));
    for (const r of rows) L.push(`| ${c(r.name)} | ${c(r.stage)} | ${c(r.distance ?? r.distanceLy)} | ${c(r.tier)} | ${c(r.look)} | ${c(r.frames)} | ${c(r.p50Ms ?? r.medianMs)} | ${c(r.p95Ms)} | ${c(r.workP50Ms)} | ${c(r.calls ?? (r.cost && r.cost.calls))} | ${c(r.triangles ?? (r.cost && r.cost.triangles))} | ${c(r.textures ?? (r.cost && r.cost.textures))} | ${c(r.programs ?? (r.cost && r.cost.programs))} | ${c(r.gpuMiB)} | ${c(r.netBytes)} |`);
  }
  const shots = new Map(((out && out.shots) || []).map((s) => [String(s.name).replace(/[^\w.-]/g, '_') + '.png', s]));
  L.push('', `## Pictures (${pictures.length})`, '');
  if (!pictures.length) L.push('None.');
  for (const p of pictures) {
    const s = shots.get(p.file);
    L.push(`- \`${p.file}\` (${n(p.bytes)} B)${s ? `: ${one(s.note || '')}; ${n(s.calls)} draw calls, ${n(s.triangles)} triangles${s.latched ? '; LATCHED' : ''}` : ''}`);
  }
  for (const [file] of shots) if (!pictures.some((p) => p.file === file)) L.push(`- \`${file}\`: asked for by the probe and not written`);
  L.push('');
  return { text: L.join('\n'), verdict: v };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const arg = (k, d) => { const h = process.argv.find((a) => a.startsWith('--' + k + '=')); return h ? h.slice(k.length + 3) : d; };
  const dir = arg('dir', '');
  if (!dir || !existsSync(dir)) { console.error('usage: node tools/look-summary.mjs --dir=<folder> --probe= --browser= [--ref=] [--hold=true|false]'); process.exit(2); }
  const read = (f) => { try { return readFileSync(join(dir, f), 'utf8'); } catch { return ''; } };
  let out = null;
  try { out = JSON.parse(read('out.json')); } catch { out = null; }
  if (out === null || typeof out !== 'object') out = null;
  const pictures = readdirSync(dir).filter((f) => f.endsWith('.png')).sort((a, b) => statSync(join(dir, a)).mtimeMs - statSync(join(dir, b)).mtimeMs)
    .map((file) => ({ file, bytes: statSync(join(dir, file)).size }));
  const { text, verdict } = summarise({ out, errText: read('err.txt'), pictures, probe: arg('probe', ''), browser: arg('browser', ''), ref: arg('ref', ''), hold: arg('hold', '') });
  writeFileSync(join(dir, 'summary.md'), text);
  const csv = scenesCsv(out, { ref: arg('ref', ''), probe: arg('probe', '') });
  if (csv) writeFileSync(join(dir, 'scenes.csv'), csv);
  console.log(text);
  if (verdict.status === 'neutral') console.log('::notice title=look: ' + arg('browser', '') + ' is neutral::' + verdict.reasons.join(' / ').replace(/\n/g, ' '));
  if (verdict.status === 'fail') { console.log('::error title=look: ' + arg('probe', '') + ' in ' + arg('browser', '') + '::' + verdict.reasons.join(' / ').replace(/\n/g, ' ')); process.exit(1); }
}
