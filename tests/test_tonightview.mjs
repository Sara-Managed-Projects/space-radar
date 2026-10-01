// tests/test_tonightview.mjs -- the Tonight view (spec 0051 task 2), the renderer the sidebar's
// Tonight tab mounts (spec 0061): the 96 x 48 arc, lit and shadowed, and the renderer's promises --
// a worker, one ticker stopped when hidden, everything taken down by destroy(), no geolocation, no
// innerHTML, and the guess set on mount when no place is.
//
//   node tests/test_tonightview.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { arcSvg } = await import(join(JS, 'ui/skyarc.js'));
const { renderTonight } = await import(join(JS, 'ui/tonight.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R = Math.PI / 180;

// --- the arc -----------------------------------------------------------------------------------------
const t0 = Date.UTC(2026, 8, 30, 2, 0);
const pass = { startMs: t0, endMs: t0 + 6 * 60e3, startAz: 225 * R, endAz: 60 * R, peakEl: 52 * R, sunlit: true, sunlitStartMs: t0, sunlitEndMs: t0 + 6 * 60e3 };
const svg = arcSvg(pass, 96, 48);
check(/^<svg[^>]*viewBox="0 0 96 48"/.test(svg), 'a 96 x 48 SVG');
check(/class="sr-arc__lit"/.test(svg) && !/class="sr-arc__shadow"/.test(svg), 'a pass sunlit throughout is one solid path');
const half = { ...pass, sunlitEndMs: t0 + 3 * 60e3 };
check(/class="sr-arc__lit"/.test(arcSvg(half, 96, 48)) && /class="sr-arc__shadow"/.test(arcSvg(half, 96, 48)), 'into the shadow halfway: the rest dashed');
check(/class="sr-arc__shadow"/.test(arcSvg({ ...pass, sunlit: false, sunlitStartMs: null, sunlitEndMs: null }, 96, 48)) && !/sr-arc__lit/.test(arcSvg({ ...pass, sunlit: false, sunlitStartMs: null, sunlitEndMs: null }, 96, 48)), 'never lit: all dashed');
const peak = /<circle class="sr-arc__peak" cx="([\d.]+)" cy="([\d.]+)"/.exec(svg);
check(peak && Math.abs(Number(peak[1]) - 48) < 0.6, `the pass is centred on its own middle azimuth (peak x ${peak && peak[1]})`);
const low = /<circle class="sr-arc__peak" cx="[\d.]+" cy="([\d.]+)"/.exec(arcSvg({ ...pass, peakEl: 12 * R }, 96, 48));
check(peak && low && Number(low[1]) > Number(peak[2]), 'a lower pass peaks lower on the arc');
check(/>S</.test(svg) && />E</.test(svg) && !/>W</.test(svg), 'the compass letters inside the span are drawn, and only those (SW to ENE: E and S)');
check(!/<script|on\w+=|javascript:/i.test(svg), 'numbers and four letters only: no script');
check(arcSvg(null) === '' && arcSvg({}) === '', 'no pass, no arc');

// --- the renderer's promises (read from its source: no DOM in node) ----------------------------------------
check(renderTonight(null, {}).root === null, 'without a document or a host, inert');
const src = readFileSync(join(JS, 'ui/tonight.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
check(/export function renderTonight\(host, ctx\)/.test(src), 'renderTonight(host, ctx), for the Tonight tab to mount');
check(/new Worker\(new URL\('\.\.\/sky\/passworker\.js', import\.meta\.url\), \{ type: 'module' \}\)/.test(src), 'passes are worked out in the module worker');
check(/setInterval\(tick, 1000\)/.test(src) && /visibilitychange/.test(src) && /sr:clean/.test(src), 'one ticker, stopped while hidden or cleared');
const destroy = src.slice(src.indexOf('function destroy()'), src.indexOf('const api = {'));
for (const bit of ['stop()', "removeEventListener('sr:observer'", "removeEventListener('sr:layer'", 'worker.terminate()', 'root.remove()']) check(destroy.includes(bit), `destroy() undoes ${bit}`);
check(!/geolocation/.test(src), 'no geolocation: "Use my location" is task 3, behind a tap');
check(!/innerHTML/.test(src) && /DOMParser/.test(src), 'the arc goes in through DOMParser, never innerHTML');
check(/guessObserver\(CITIES\)/.test(src) && /!ctx\.observer/.test(src), 'mounted with no place set, it sets the guess, which says it is one');
check(!/ctx\.select\(p\.record\)/.test(src) || /p\.record\.satrec/.test(src), 'a list row selects only a record the app can fly to');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
// ui/controls.js is gone (spec 0061 task 1); the Tonight tab mounts the view, loaded on first view.
check(!/^import[^\n]*tonight\.js/m.test(main) && /mountTab\('tonight'/.test(main), 'mounted in the sidebar\'s Tonight tab, never imported at boot (spec 0061)');

if (problems.length) { console.error('tonight view FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('tonight view ok: a 96 x 48 arc, lit and dashed; renderTonight mounts a worker and one ticker, and destroy() takes all of it down; no geolocation, no innerHTML');
