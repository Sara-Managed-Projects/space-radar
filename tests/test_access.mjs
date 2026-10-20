// tests/test_access.mjs -- readable without WebGL, without motion, and a full link (internal spec 0076
// stage W4-c: #906, #912, #919; advances #836).
//
//   node tests/test_access.mjs
//
// Five claims, none of which needs a browser:
//   1. THE READABLE PAGE (index.html's <noscript id="sr-readable-src">). Without JavaScript, and when
//      scene/renderer.js finds no WebGL 2, a visitor reads what Space Radar is and gets links: every
//      trip's own page, with its title and what it covers, and the crawlable pages the footer lists.
//      Every local link resolves, the page has one h1 (the hidden one), and the boot panel is put away.
//   2. THE FALLBACK (scene/renderer.js showReadable): shows that page, swaps the JavaScript line for the
//      WebGL line, puts the boot panel away, and never throws.
//   3. THE LINK (ui/share.js, ui/urlstate.js): a shared link names a view with `v=1` and the build; the
//      root stays the root; the address bar never keeps a build; a reader of the link still works.
//   4. THE SUMMARY (ui/scenesummary.js): the words for what is on screen, from plain facts.
//   5. MOTION OFF is the device's reduced motion (the Motion row, ui/whattoshow.js): a flight is an
//      instant set, a trip is paced by the reader, the gas of a deep-sky object holds still (#836).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const JS = join(SITE, 'js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const decode = (s) => s.replace(/&#x27;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// ------------------------------------------------------------------------- 1. the readable page
const index = readFileSync(join(SITE, 'index.html'), 'utf8');
const ns = /<noscript id="sr-readable-src">([\s\S]*?)<\/noscript>/.exec(index);
check(!!ns, 'index.html has <noscript id="sr-readable-src"> (renderer.js reads its text)');
const page = ns ? ns[1] : '';
check(/id="sr-readable"/.test(page) && /role="region"/.test(page), 'the readable page is a labelled region with the id the fallback looks for');
check(/live 3D map of space/i.test(page) && /satellites/.test(page) && /measured, modelled or illustrative/.test(page),
  'it says what Space Radar is and that every thing says how it is known');
check(/data-why="js"/.test(page) && /data-why="gl"[^>]*\shidden/.test(page), 'it says why (JavaScript off) and holds the WebGL line hidden until the fallback shows it');
check(!/<h1/i.test(page) && (index.match(/<h1\b/g) || []).length === 1, 'the page has exactly one h1, the hidden one; the readable title is not a second');
check(/<noscript><style>#boot\{display:none\}<\/style><\/noscript>/.test(index), 'with scripts off the boot panel is put away');
check(!/needs JavaScript\.<\/p>\s*<p class="boot-sub">/.test(index), 'the old one-line "needs JavaScript" panel is gone');

// Every local href resolves: a trip page by its file, the others by the footer's own list.
const sitelinks = readFileSync(join(ROOT, 'templates/sitelinks.html'), 'utf8');
const footerHrefs = new Set([...sitelinks.matchAll(/href="\{\{root\}\}([^"]+)"/g)].map((m) => m[1]));
const links = [...page.matchAll(/<a href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => ({ href: m[1], text: decode(m[2]) }));
for (const { href } of links) {
  if (/^https:\/\/github\.com\/Sara-Managed-Projects\/space-radar$/.test(href)) continue;
  check(!/^[a-z]+:/i.test(href) || /^https:\/\/github\.com\//.test(href), `${href}: a link in the readable page is local or the project's repository`);
  if (href.startsWith('t/')) check(existsSync(join(SITE, href)), `${href}: a trip page that exists`);
  else if (!/^https:/.test(href)) check(footerHrefs.has(href), `${href}: a crawlable page the footer lists too (templates/sitelinks.html)`);
}
const linked = new Set(links.map((l) => l.href));
for (const need of ['about/index.html', 'sources/index.html', 'accuracy/index.html', 'teachers/index.html', 'satellites/index.html', 'planets-tonight/index.html']) {
  check(linked.has(need), `${need} is linked`);
}
// Every trip page in t/ is listed with its own title, and what it covers is its description's first sentence.
const trips = readdirSync(join(SITE, 't')).filter((f) => f.endsWith('.html'));
check(trips.length >= 30, `${trips.length} trip pages found`);
for (const f of trips) {
  const html = readFileSync(join(SITE, 't', f), 'utf8');
  const title = decode((/<title>(.*?)(?: · Space Radar)?<\/title>/.exec(html) || [])[1] || '');
  const desc = decode((/name="description" content="([^"]*)"/.exec(html) || [])[1] || '');
  const first = desc.split(/(?<=[.!?])\s/)[0];
  const row = links.find((l) => l.href === `t/${f}`);
  check(!!row, `t/${f} is listed in the readable page`);
  if (row) {
    check(row.text === title, `t/${f}: the link says "${title}", it says "${row.text}"`);
    check(decode(page).includes(`${title}</a>. ${first}</li>`), `t/${f}: what it covers is "${first}"`);
  }
}
check(links.filter((l) => l.href.startsWith('t/')).length === trips.length, 'no trip is listed that has no page');
// Tap targets and reading width of the page's styles.
const css = readFileSync(join(SITE, 'css/site.css'), 'utf8');
check(/\.sr-readable \{[^}]*position: fixed;[^}]*overflow-y: auto;/.test(css), 'the readable page is the one thing that scrolls (the map\'s html and body do not)');
check(/\.sr-readable a \{[^}]*padding: 0\.6em 0;/.test(css), 'its links are a finger tall');

// ------------------------------------------------------------------------------ 2. the fallback
const { showReadable } = await import(join(JS, 'scene/renderer.js'));
{
  const added = [];
  const mk = (extra = {}) => ({ hidden: false, classList: { added: [], add(c) { this.added.push(c); } }, remove() { this.removed = true; }, ...extra });
  const jsLine = mk();
  const glLine = mk({ hidden: true });
  const fakePage = { querySelector: (q) => (q.includes('"js"') ? jsLine : q.includes('"gl"') ? glLine : null) };
  const bootEl = mk();
  const doc = {
    getElementById: (id) => (id === 'sr-readable-src' ? { textContent: page } : id === 'boot' ? bootEl : null),
    createElement: () => ({ set innerHTML(v) { this.html = v; }, content: { getElementById: (id) => (id === 'sr-readable' ? fakePage : null) } }),
    body: { appendChild: (n) => added.push(n) },
  };
  check(showReadable(doc) === true, 'showReadable() shows the page');
  check(added[0] === fakePage, 'it is put on the page');
  check(jsLine.removed === true && glLine.hidden === false, 'the JavaScript line goes and the WebGL line is shown');
  check(bootEl.hidden === true && bootEl.classList.added.includes('gone'), 'the boot panel is put away');
  check(showReadable({ getElementById: () => null }) === false, 'with no page in the document it says false');
  check(showReadable({ getElementById: () => { throw new Error('no dom'); } }) === false, 'and never throws');
  check(showReadable(null) === false, 'and takes no document');
  const rsrc = readFileSync(join(JS, 'scene/renderer.js'), 'utf8');
  check(/err\.code = 'no-webgl2';\s*err\.shown = showReadable\(\);[^\n]*\s*throw err;/.test(rsrc), 'renderer.js shows it before it throws no-webgl2');
  check(/err\.code === 'no-webgl2' && err\.shown\)\) fail\(/.test(index), 'index.html shows no failure panel when it was shown');
}

// ----------------------------------------------------------------------------------- 3. the link
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { replaceState(_s, _t, url) { const i = url.indexOf('#'); globalThis.location.hash = i >= 0 ? url.slice(i) : ''; } };
const U = await import(join(JS, 'ui/urlstate.js'));
const S = await import(join(JS, 'ui/share.js'));
{
  check(/^\d+\.\d+\.\d+$/.test(U.BUILD), `the build is a release number: ${U.BUILD}`);
  check(U.KEYS.includes('build') && U.KEYS.indexOf('build') === U.KEYS.indexOf('v') + 1, '`build` is a key, beside `v`');
  const base = 'https://x.test/';
  const view = S.shareUrl({ at: 'europa', stage: 'jupiter' }, base);
  check(view === `${base}#v=1&build=${U.BUILD}&at=europa&stage=jupiter`, `a view carries v=1 and the build: ${view}`);
  check(S.shareUrl({ m: 'now', at: 'iss' }, base).startsWith(`${base}#m=now&v=1&build=`), 'after m, in the order of KEYS');
  const trip = S.shareUrl({ trip: 'moon-phases', stop: 3 }, base);
  check(trip === `${base}#v=1&build=${U.BUILD}&trip=moon-phases&stop=3`, `a trip at a stop too: ${trip}`);
  check(S.shareUrl({}, base) === base, 'a link that says nothing is the root');
  check(S.shareUrl({ trip: 'moon-phases', stop: 1 }, base) === `${base}t/moon-phases.html`, 'a trip\'s short page is its page');
  globalThis.location.hash = new URL(view).hash;
  const back = U.read();
  check(back.v === '1' && back.build === U.BUILD && back.at === 'europa' && !back.unknownVersion, 'it reads back: the same view, the format known, the build handed on');
  U.write({ stage: 'saturn' });
  check(globalThis.location.hash.includes('v=1') && !/build=/.test(globalThis.location.hash), 'the address bar keeps v but never a build it was given');
  U.write({ build: '9.9.9' });
  check(!/build=/.test(globalThis.location.hash), 'and write() does not produce one');
  globalThis.location.hash = '#v=1&build=0.9.0&at=iss';
  check(U.read().at === 'iss' && !U.read().unknownVersion, 'a link made by an older build still opens');
  globalThis.location.hash = '#v=2&build=3.0.0&at=iss';
  check(U.read().unknownVersion === true, 'a newer format is still told apart');
}

// -------------------------------------------------------------------------------- 4. the summary
{
  const { summaryText, factsOf } = await import(join(JS, 'ui/scenesummary.js'));
  check(summaryText({ stage: 'Earth', selected: null, trip: null }) === 'Looking at Earth. Nothing is selected.', 'a first look');
  check(summaryText({ stage: 'Jupiter', selected: { name: 'Europa', kind: 'world' } }) === 'Looking at Jupiter. Europa is selected, world.', 'a selection with its kind');
  check(summaryText({ stage: 'Earth', selected: { name: 'Iss', kind: '' } }) === 'Looking at Earth. Iss is selected.', 'a selection with no kind has no dangling comma');
  const trip = summaryText({ stage: 'the Moon', trip: { title: 'Moon landings', stopTitle: 'Tranquility', index: 2, count: 7 }, selected: null });
  check(trip === 'Looking at the Moon. Trip stop 3 of 7: Tranquility.', `a trip says which stop: ${trip}`);
  check(summaryText({ stage: 'Earth', trip: { title: 'Moon landings', stopTitle: '', index: -1, count: 0 } }) === 'Looking at Earth. The trip Moon landings is open.', 'a trip on its intro says so');
  check(summaryText({ stage: 'Earth', look: 'measured', selected: null }).endsWith('Drawn as measured.'), 'Measured is said; Film, the default, is not');
  check(summaryText({ stage: 'Earth', look: 'film', selected: null }) === 'Looking at Earth. Nothing is selected.', 'Film says nothing');
  check(summaryText({}) === 'Nothing is selected.' && summaryText(null) === 'Nothing is selected.', 'no facts, no stage: only what is true');
  const f = factsOf({ stage: { worldId: 'saturn' }, selected: () => ({ name: 'Titan', klass: 'world', meta: {} }), look: () => 'measured', trip: { state: { phase: 'idle' } } });
  check(f.stage === 'Saturn' && f.selected.name === 'Titan' && f.selected.kind === 'world' && f.look === 'measured' && f.trip === null, 'factsOf reads the app\'s own context');
  check(factsOf({ stage: { worldId: 'stellar' } }).stage === 'Nearby stars', 'a rung of the ladder has its word');
  check(factsOf({ stage: null, selected: () => { throw new Error('x'); } }).stage === '', 'and a broken context is a missing sentence, not an error');
  const src = readFileSync(join(JS, 'ui/scenesummary.js'), 'utf8');
  check(/for \(const name of EVENTS\) window\.addEventListener\(name, later\)/.test(src) && /'sr:stage', 'sr:select', 'sr:look'/.test(src) && /ctx\.trip\.onChange/.test(src), 'it follows the stage, the selection, the look and a trip\'s stops');
  check(/aria-live', f\.trip \? 'off' : 'polite'/.test(src), 'it is not live while a trip announces its own stops');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/ui\/scenesummary\.js'\)/.test(main) && !/from '\.\/ui\/scenesummary\.js'/.test(main) && /const SUMMARY_MS = (\d+);/.test(main) && Number(/const SUMMARY_MS = (\d+);/.exec(main)[1]) >= 3000, 'main.js fetches it after the first visit, never at boot');
}

// -------------------------------------------------------------------------------- 5. motion off
{
  const html = { dataset: {} };
  globalThis.document = { documentElement: html };
  globalThis.matchMedia = () => ({ matches: false });
  const THREE = await import(join(SITE, 'vendor/three.module.min.js'));
  const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
  const flight = (off) => {
    if (off) html.dataset.srMotion = 'off'; else delete html.dataset.srMotion;
    const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-6, 1e12);
    camera.position.set(0, 0, 30);
    const rig = createCameraRig(camera, null);
    rig.flyTo({ targetScene: new THREE.Vector3(1, 2, 3), distance: 5, ms: 3000 });
    return { flying: rig.state.flying, at: camera.position.distanceTo(new THREE.Vector3(1, 2, 3)) };
  };
  const on = flight(false);
  check(on.flying === true && on.at > 6, 'Motion on: a 3 s flight is a flight');
  const off = flight(true);
  check(off.flying === false && Math.abs(off.at - 5) < 1e-6, 'Motion off: the same flight is an instant set');
  globalThis.matchMedia = () => ({ matches: true });
  const os = flight(false);
  check(os.flying === false && Math.abs(os.at - 5) < 1e-6, 'and it is what the device\'s own setting does');
  globalThis.matchMedia = () => ({ matches: false });

  // #836: the gas of a deep-sky object holds still when motion is reduced, and drifts under Film otherwise.
  const G = await import(join(JS, 'scene/deep/gasmat.js'));
  const gas = G.createGasMesh(THREE, { kind: 0, march: true });
  for (let i = 0; i < 20; i++) gas.setLook('film', { reduced: true, dtMs: 16 });
  check(gas.material.uniforms.uTime.value === 0, 'reduced motion: the gas\'s time does not advance');
  const gas2 = G.createGasMesh(THREE, { kind: 0, march: true });
  for (let i = 0; i < 20; i++) gas2.setLook('film', { reduced: false, dtMs: 1000 });
  check(gas2.material.uniforms.uTime.value > 0, 'control: under Film with motion the same gas drifts');
  const gas3 = G.createGasMesh(THREE, { kind: 0, march: true });
  for (let i = 0; i < 20; i++) gas3.setLook('measured', { reduced: false, dtMs: 1000 });
  check(gas3.material.uniforms.uTime.value === 0, 'Measured holds it still too');

  // The sources that read the device's setting also read the row's.
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/const motionStill = \(\) => typeof document !== 'undefined' && document\.documentElement\.dataset\.srMotion === 'off';/.test(main), 'main.js has one question for the row\'s answer');
  check(/reduced: \(\) => !!\(reduced && reduced\.matches\) \|\| motionStill\(\)/.test(main), 'the deep sky is told "reduced" when the row says Off (camera autoplay and gas time)');
  check((main.match(/\|\| motionStill\(\)/g) || []).length >= 8, 'the layers that freeze under reduced motion freeze under Off');
  check(/localStorage\.getItem\('sr:motion'\) === 'off'/.test(main), 'the remembered choice is applied before anything flies');
  const trip = readFileSync(join(JS, 'ui/trip.js'), 'utf8');
  check(/dataset\.srMotion === 'off'\) return true/.test(trip), 'a trip reads at the reader\'s pace when the row says Off');
  const wts = readFileSync(join(JS, 'ui/whattoshow.js'), 'utf8');
  check(/root\.appendChild\(motionRow\)/.test(wts) && /export function motionPanel/.test(wts), 'the Motion row is in What to show');
  check(/sr-density__btn/.test(wts) && /aria-pressed/.test(wts) && /buttons\.on\.disabled = device\(\)/.test(wts), 'in the Quality row\'s shape; On is not offered against the device\'s own setting');
  const later = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  check(/r12Access: \{/.test(later) && /panelTitle: 'Motion'/.test(later), 'its words are in copy/en.later.js r12Access');
}

if (problems.length) {
  console.log(`access: ${problems.length} problem(s)`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log(`access ok: the readable page lists ${trips.length} trips and ${footerHrefs.size ? 'the footer\'s pages' : 'pages'} with every local link resolving, the no-WebGL2 fallback shows it, a shared link carries v=1 and build ${U.BUILD}, the scene summary reads the stage, selection, trip and look, and Motion off is an instant flight, a reader's pace and still gas`);
