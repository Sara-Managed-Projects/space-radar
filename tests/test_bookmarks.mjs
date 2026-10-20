// tests/test_bookmarks.mjs -- arrival views (internal i#882, ui/bookmarks.js, the share sheet's row "Arrival views").
//
//   node tests/test_bookmarks.mjs
//
// A VIEW IS A LINK THE APP ALREADY READS: `at`, `stage` and `cam`, no new key, and it survives urlstate.js read() and
// bootLink(). THE AUTHORED POSES are made for the planets only, from the world's own radius (registry/compare.yaml), and a world
// with no radius has none (a distance is never guessed). THE SAVED ONES are kept in this browser: twelve at most, junk dropped,
// a storage that throws is an empty list, and only four fields are written. THE PANEL, in a small DOM: rows with Go, Copy and
// (for a saved one) Remove, Save beside them, the address written to open one.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/minidom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

installDom();
globalThis.location = { hash: '', pathname: '/', search: '', origin: 'https://www.spaceradar.ai' };
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async (text) => { written.push(text); } } }, configurable: true });
const written = [];

const B = await mod('ui/bookmarks.js');
const U = await mod('ui/urlstate.js');
const { COPY } = await mod('copy/en.js');
const { COMPARE_BODIES } = await mod('data/compare.js');
const radiusOf = (id) => B.radiusFrom(COMPARE_BODIES, id);
const BASE = 'https://www.spaceradar.ai/';

// --- the authored poses --------------------------------------------------------------------------------
check(radiusOf('jupiter') === 69911 && radiusOf('mars') > 3000 && radiusOf('nowhere') === 0 && B.radiusFrom(null, 'jupiter') === 0, 'radii are the fact sheet\'s, and unknown is 0');
for (const id of B.CURATED_WORLDS) check(radiusOf(id) > 0, `${id} has a radius in registry/compare.yaml`);
const jup = B.curatedFor({ id: 'jupiter', name: 'Jupiter' }, radiusOf);
check(jup.length === 2 && same(jup.map((v) => v.kind), ['above', 'inPlane']), `two views of Jupiter (${jup.map((v) => v.id)})`);
check(jup.every((v) => v.at === 'jupiter' && v.stage === 'jupiter' && v.curated === true), 'each is of Jupiter, on its own stage');
const pose = (v) => U.parseCam(v.cam);
check(pose(jup[0]).polarDeg === 12 && pose(jup[1]).polarDeg === 90, 'one looks down from near the ecliptic\'s north, one is in its plane');
check(Math.abs(pose(jup[0]).distanceKm - 69911 * 5) / (69911 * 5) < 1e-3, `five radii away (${pose(jup[0]).distanceKm} km)`);
check(B.curatedFor({ id: 'iss' }, radiusOf).length === 0 && B.curatedFor(null, radiusOf).length === 0, 'only the planets have authored views');
check(B.curatedFor({ id: 'earth' }, radiusOf).length === 0 && B.curatedFor({ id: 'moon' }, radiusOf).length === 0, 'not the Earth or the Moon, whose axes are the equator\'s, not the ecliptic\'s');
check(B.curatedFor({ id: 'jupiter' }, () => 0).length === 0 && B.curatedFor({ id: 'jupiter' }).length === 0, 'with no radius there is no distance, so no view');
check(new Set(B.CURATED_WORLDS.flatMap((w) => B.curatedFor({ id: w, name: w }, radiusOf).map((v) => v.id))).size === B.CURATED_WORLDS.length * 2, 'every id is its own');

// --- a view is a link the app reads ------------------------------------------------------------------------
const link = B.viewLink(jup[0], BASE);
check(/^https:\/\/www\.spaceradar\.ai\/#v=1&build=[\d.]+&at=jupiter&stage=jupiter&cam=20,12,\d+$/.test(link), `the link (${link})`);
globalThis.location.hash = link.slice(link.indexOf('#'));
const read = U.read();
check(read.at === 'jupiter' && read.stage === 'jupiter' && read.cam === jup[0].cam && !read.unknownVersion, `the app reads it whole (${JSON.stringify(read)})`);
for (const k of Object.keys(read)) check(U.KEYS.includes(k), `and only keys it has: ${k}`);
const boot = U.bootLink({ goTo() { throw new Error('a view carries no clock'); }, rates: () => [], setRate() {} });
check(boot.at === 'jupiter' && boot.cam === jup[0].cam, 'bootLink() hands it on for the layers-ready half');
check(!read.goOnly && U.laterLink(read, false).cam === read.cam, 'it is no `go=` and no imagined world: nothing in it collides (public #564)');
check(B.viewLink({ at: 'iss', stage: 'earth', cam: '40,62,26540' }, BASE) === `${BASE}#v=1&build=${U.BUILD}&at=iss&cam=40,62,26540`, 'on the Earth\'s map the stage is left out, as the app leaves it out');
check(B.viewLink({ at: 'iss', cam: 'junk' }, BASE) === '' && B.viewLink(null) === '' && B.viewLink({ cam: '1,2,3' }) === '', 'a view that is not one has no link');
check(B.viewLink({ at: 'a b&c', stage: 'x y', cam: '10,20,300' }, 'https://x.test').includes('at=a%20b%26c&stage=x%20y&cam=10,20,300'), 'values are encoded, the commas of the pose kept');
check(!B.viewLink(jup[0], BASE).includes(' '), 'and the link has no space');
check(B.viewOf({ id: 'iss', name: 'ISS' }, { azimuthDeg: 40, polarDeg: 62, distanceKm: 26540 }, 'earth').id === 'iss@40,62,26540', 'a view of a record from a pose');
check(B.viewOf({ id: 'iss' }, { azimuthDeg: 40 }, 'earth') === null && B.viewOf(null, { azimuthDeg: 1, polarDeg: 2, distanceKm: 3 }) === null, 'half a pose, or no record, is no view');

// --- the saved ones -------------------------------------------------------------------------------------------
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m }; };
const v1 = B.viewOf({ id: 'iss', name: 'ISS' }, { azimuthDeg: 40, polarDeg: 62, distanceKm: 26540 }, 'earth');
const v2 = B.viewOf({ id: 'europa', name: 'Europa' }, { azimuthDeg: 10, polarDeg: 80, distanceKm: 5000 }, 'jupiter');
const s0 = mem();
check(same(B.readSaved(s0), []) && same(B.readSaved(null), []), 'nothing saved is an empty list');
let list = B.addSaved([], v1); list = B.addSaved(list, v2);
check(same(list.map((v) => v.id), [v2.id, v1.id]), 'the newest first');
check(same(B.addSaved(list, v1).map((v) => v.id), [v1.id, v2.id]), 'the same view again moves up, it is not kept twice');
check(B.writeSaved(s0, list) === true && s0.m.get(B.SAVED_KEY).length < 400, 'written');
const stored = JSON.parse(s0.m.get(B.SAVED_KEY));
check(stored.every((v) => same(Object.keys(v).sort(), ['at', 'cam', 'name', 'stage'])), 'four fields each: what, which map, the pose and a name. Nothing of the visitor\'s');
check(same(B.readSaved(s0).map((v) => v.id), list.map((v) => v.id)), 'and read back');
check(same(B.removeSaved(list, v2.id).map((v) => v.id), [v1.id]), 'removed');
const full = Array.from({ length: B.MAX_SAVED }, (_, i) => B.viewOf({ id: `r${i}`, name: `R${i}` }, { azimuthDeg: i, polarDeg: 50, distanceKm: 100 + i }, 'earth'));
check(B.MAX_SAVED === 12 && B.addSaved(full, v1) === null && B.addSaved(full, full[3]).length === 12, 'twelve at most: a new one is refused when full, a kept one is only moved');
const junk = mem(); junk.setItem(B.SAVED_KEY, JSON.stringify([{ at: 'a', cam: '1,2,3' }, { at: 'b', cam: 'nope' }, { cam: '1,2,3' }, 'x', null, { at: 'c', cam: '1,2,3', name: 7, stage: 5 }, { at: 'a', cam: '1,2,3' }]));
const got = B.readSaved(junk);
check(same(got.map((v) => v.id), ['a@1,2,3', 'c@1,2,3']), `junk is dropped, a repeat once (${got.map((v) => v.id)})`);
check(got[1].name === 'c' && got[1].stage === 'earth', 'a name that is not text is the id, a stage that is not text is the Earth');
junk.setItem(B.SAVED_KEY, '{not json'); check(same(B.readSaved(junk), []), 'unparseable is empty');
junk.setItem(B.SAVED_KEY, '{"a":1}'); check(same(B.readSaved(junk), []), 'an object is not a list');
const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('Quota'); } };
check(same(B.readSaved(throwing), []) && B.writeSaved(throwing, list) === false && B.writeSaved(null, list) === false, 'a storage that throws is an empty list and a refused write, quietly');

// --- the panel, in a small DOM ------------------------------------------------------------------------------
const poseNow = { azimuthDeg: 33.3, polarDeg: 55, distanceKm: 123456.7 };
function make(record, storage, extra = {}) {
  const ctx = { camPose: () => poseNow, stage: { worldId: 'jupiter' }, share: { close() { ctx.closed = (ctx.closed || 0) + 1; } }, ...extra };
  const panel = B.viewsPanel(ctx, { record, storage, base: BASE, radiusOf });
  document.body.appendChild(panel);
  return { ctx, panel };
}
const rows = (p) => p.querySelectorAll('.sr-share__viewrow');
const btns = (row) => row.querySelectorAll('.sr-share__viewbtn').map((b) => b.textContent);
{
  const st = mem();
  const { ctx, panel } = make({ id: 'jupiter', name: 'Jupiter' }, st);
  check(rows(panel).length === 2 && same(rows(panel).map((r) => r.querySelector('.sr-share__viewtitle').textContent), [COPY.views.curated.above, COPY.views.curated.inPlane]), 'Jupiter\'s card offers its two authored views');
  check(rows(panel).every((r) => same(btns(r), [COPY.views.go, COPY.views.copy])), 'each with Go and Copy, and nothing to remove');
  check(panel.querySelector('.sr-share__note').hidden === true, 'no "nothing saved" line while there are rows');
  const save = panel.querySelector('.sr-share__viewsave');
  check(save.textContent === COPY.views.save && save.hidden === false, 'Save this view is there for a selected thing');
  save.click();
  check(rows(panel).length === 3 && same(btns(rows(panel)[2]), [COPY.views.go, COPY.views.copy, COPY.views.remove]), 'saving adds a row that can be removed');
  const saved = B.readSaved(st);
  check(saved.length === 1 && saved[0].at === 'jupiter' && saved[0].stage === 'jupiter' && saved[0].cam === '33.3,55,123500', `kept in this browser as the camera stood (${JSON.stringify(saved)})`);
  check(/saved in this browser/i.test(panel.querySelector('.sr-share__viewnote').textContent) && ctx.lastView.saved === saved[0].id, 'and said so in one line');
  check(rows(panel)[2].querySelector('.sr-share__viewpose').textContent === '123\u202f500 km out' && rows(panel)[2].querySelector('.sr-share__viewname').title === '33\u00b0 round, 55\u00b0 from the pole, 123\u202f500 km', `how far out in a line, the whole pose as its tooltip (${rows(panel)[2].querySelector('.sr-share__viewpose').textContent})`);
  // Go writes the address and closes the sheet; main.js's hashchange does the flight.
  location.hash = '';
  rows(panel)[0].querySelectorAll('.sr-share__viewbtn')[0].click();
  check(location.hash === B.viewLink(jup[0], BASE).slice(B.viewLink(jup[0], BASE).indexOf('#')) && ctx.closed === 1, `Go writes the view's address (${location.hash})`);
  check(ctx.lastView.opened === 'jupiter:above', 'and says which');
  // Copy puts the link on the clipboard.
  await rows(panel)[1].querySelectorAll('.sr-share__viewbtn')[1].listeners.click[0]();
  check(written.at(-1) === B.viewLink(jup[1], BASE), 'Copy puts the view\'s link on the clipboard');
  check(panel.querySelector('.sr-share__viewnote').textContent === COPY.views.copied, 'and says so');
  // Remove.
  rows(panel)[2].querySelectorAll('.sr-share__viewbtn')[2].click();
  check(rows(panel).length === 2 && B.readSaved(st).length === 0, 'Remove forgets it, here and in the storage');
}
{
  // A thing with no authored views, and nothing saved: one line, and a way to save.
  const { panel } = make({ id: 'sat-25544', name: 'ISS' }, mem());
  check(rows(panel).length === 0 && panel.querySelector('.sr-share__note').hidden === false && panel.querySelector('.sr-share__note').textContent === COPY.views.none, 'no views yet: one line says so');
  // Twelve saved: refused with a line.
  const st = mem(); B.writeSaved(st, full);
  const m = make({ id: 'sat-25544', name: 'ISS' }, st);
  m.panel.querySelector('.sr-share__viewsave').click();
  check(m.panel.querySelector('.sr-share__viewnote').textContent === COPY.views.full && B.readSaved(st).length === 12, 'at twelve a new one is refused, in a line');
  // No selection: the saved views are listed, and nothing can be saved.
  const none = make(null, st);
  check(none.panel.querySelector('.sr-share__viewsave').hidden === true && rows(none.panel).length === 12, 'with nothing selected: the saved ones, no Save');
  // A camera that gives no pose saves nothing.
  const lost = make({ id: 'iss', name: 'ISS' }, mem(), { camPose: () => null });
  lost.panel.querySelector('.sr-share__viewsave').click();
  check(rows(lost.panel).length === 0, 'no pose, no view');
  // A storage that throws: the view is kept for the page and the line says only that.
  const t2 = make({ id: 'iss', name: 'ISS' }, throwing);
  t2.panel.querySelector('.sr-share__viewsave').click();
  check(rows(t2.panel).length === 1 && t2.panel.querySelector('.sr-share__viewnote').textContent === COPY.views.savedPage, 'a storage that throws still holds it for the page, and says "until this page closes"');
}

// --- where it lives ----------------------------------------------------------------------------------------------
const sheet = src('site/js/ui/sharesheet.js');
check(/import\('\.\/bookmarks\.js'\)/.test(sheet) && !/^import[^\n]*bookmarks/m.test(sheet), 'the sheet imports it when the row opens, never statically');
check(!/bookmarks/.test(src('site/js/main.js')) && !/bookmarks/.test(src('site/index.html')), 'nothing at boot knows of it');
check(!/KEYS\s*=\s*\[[^\]]*view/.test(src('site/js/ui/urlstate.js')), 'and the link has no key of its own');
check(/sr-share__viewrow/.test(src('site/css/share.css')) && /sr-share__viewbtn[^}]*\}[^@]*@media \(pointer: coarse\)\s*\{\s*\.sr-share__viewbtn \{ height: 44px/.test(src('site/css/share.css')), 'its rules come with the sheet\'s sheet, 44 px on touch');

if (problems.length) {
  console.error(`bookmarks FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`bookmarks ok: ${B.CURATED_WORLDS.length} planets with two authored views each, a view is the link keys the app already reads, ${B.MAX_SAVED} saved at most, nothing but four fields stored`);
