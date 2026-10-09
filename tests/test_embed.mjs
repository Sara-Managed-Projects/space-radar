// tests/test_embed.mjs -- one live object in someone else's page (ui/embed.js, public #439), and
// photo mode's frame (ui/photomode.js, public #288).
//
// Asserted, without a browser:
//   - the embed's address is a query (`?embed=1&at=<id>`), read through a whitelist: an unknown key
//     or a value that is not an id, a number or an instant never reaches the app;
//   - the snippet is one <iframe> with a title, lazy loading, fullscreen and nothing else allowed,
//     and its attributes are escaped;
//   - "Open in Space Radar" is the same view in the whole app, in the app's own hash form;
//   - what an embed carries of the view on screen: a trip, else the selection; never a place;
//   - NOTHING OF IT AT BOOT: main.js imports ui/embed.js only for `?embed=1`, the offline module
//     (the service worker) and the later fetches are skipped there, and docs/EMBEDDING.md names
//     every key the reader takes;
//   - photo mode's frame is centred, inside its margins, of the preset's shape, and its share of
//     the screen's height is what narrows the camera; every preset is a print-sized picture.
//
//   node tests/test_embed.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const E = await import(join(ROOT, 'site/js/ui/embed.js'));
const { KEYS } = await import(join(ROOT, 'site/js/ui/urlstate.js'));

// --- the address ---------------------------------------------------------------------------------
check(E.isEmbed('?embed=1') && E.isEmbed('?at=iss&embed=1') && E.isEmbed('?embed=1&at=iss'), 'embed=1 anywhere in the query is an embed');
check(!E.isEmbed('') && !E.isEmbed('?embed=0') && !E.isEmbed('?embed=10') && !E.isEmbed('?xembed=1') && !E.isEmbed('?render=1'), 'nothing else is');
const link = E.embedLink('?embed=1&at=sat-25544&t=2027-08-02T10:00:00Z&evil=1&stage=%3Cscript%3E');
check(link.at === 'sat-25544' && link.t === '2027-08-02T10:00:00Z' && !('evil' in link) && !('stage' in link) && !('embed' in link), `the query is read through a whitelist (${JSON.stringify(link)})`);
check(JSON.stringify(E.embedLink('?embed=1')) === '{}', 'an embed with no view is the home view');
check(E.EMBED_KEYS.every((k) => KEYS.includes(k)), 'every key an embed reads is one the app\'s own link has (ui/urlstate.js KEYS)');
check(!KEYS.includes('embed'), '`embed` is a query flag, never a hash key the app writes');

// --- what it carries -----------------------------------------------------------------------------
const st = E.embedState({ at: 'sat-25544', t: 'now', stage: 'earth', exp: 'camera', m: 'wonder', rate: 60, observer: 'x' });
check(JSON.stringify(st) === JSON.stringify({ at: 'sat-25544', stage: 'earth' }), `the selection and the stage; no default moment or exposure, no rate, no place (${JSON.stringify(st)})`);
check(JSON.stringify(E.embedState({ at: 'm42', exp: 'deep', t: '2027-01-01T00:00:00Z' })) === JSON.stringify({ at: 'm42', t: '2027-01-01T00:00:00Z', exp: 'deep' }), 'a moment and a shutter that are not the defaults are kept');
check(JSON.stringify(E.embedState({ trip: 'moon-landings', stop: 3, at: 'x' })) === JSON.stringify({ trip: 'moon-landings', stop: '3' }), 'a running trip is carried at its stop, and beats the selection');
check(JSON.stringify(E.embedState({ at: 'x' }, 'to-the-edge')) === JSON.stringify({ trip: 'to-the-edge' }), 'another trip is carried from its start');

// --- the links -----------------------------------------------------------------------------------
check(E.embedUrl({ at: 'sat-25544' }) === 'https://www.spaceradar.ai/?embed=1&at=sat-25544', `the embed's address (${E.embedUrl({ at: 'sat-25544' })})`);
check(E.embedUrl({}, 'http://127.0.0.1:8000/site') === 'http://127.0.0.1:8000/site/?embed=1', 'the home view, on any base');
check(E.fullUrl({ at: 'sat-25544', exp: 'deep' }) === 'https://www.spaceradar.ai/#at=sat-25544&exp=deep' && E.fullUrl({}) === 'https://www.spaceradar.ai/', 'Open in Space Radar is the app\'s own link for the view');
// The link back (growth: a followed link to https://www.spaceradar.ai/?from=embed, a plain anchor): the tag is
// a query before the hash, the view survives it, and the frame's own link is built with it.
check(E.fullUrl({ at: 'sat-25544' }, undefined, { from: 'embed' }) === 'https://www.spaceradar.ai/?from=embed#at=sat-25544' && E.fullUrl({}, undefined, { from: 'embed' }) === 'https://www.spaceradar.ai/?from=embed', 'the link back carries ?from=embed before the view');
check(/open\.href = fullUrl\(st, base, \{ from: 'embed' \}\)/.test(read('site/js/ui/embed.js')) && !/open\.rel\s*=[^;]*nofollow/.test(read('site/js/ui/embed.js')), 'the frame\'s link back is built with from=embed and is not nofollow');
const snip = E.embedSnippet({ at: 'sat-25544' }, { title: 'A "station" <live>' });
check(/^<iframe src="https:\/\/www\.spaceradar\.ai\/\?embed=1&amp;at=sat-25544" title="A &quot;station&quot; &lt;live&gt;" width="600" height="400" loading="lazy" allow="fullscreen" style="border:0;max-width:100%"><\/iframe>$/.test(snip), `the snippet (${snip})`);
check(!/allow="[^"]*(camera|microphone|geolocation|autoplay)/.test(snip) && !/sandbox|referrerpolicy="unsafe/.test(snip), 'the frame asks for fullscreen and nothing else');

// --- never at boot -------------------------------------------------------------------------------
const main = read('site/js/main.js');
check(!/^import [^\n]*ui\/(embed|photomode)\.js/m.test(main), 'main.js does not import the embed or photo mode statically');
check(/const embed = \/\[\?&\]embed=1\(\?:&\|\$\)\/\.test\(location\.search\)\s*\? await import\('\.\/ui\/embed\.js'\)/.test(main), 'main.js imports ui/embed.js only for ?embed=1');
check(/if \(embed\) \{ \/\* no service worker \*\/ \}\s*else if \(window\.__srLayersReady\) offlineLater\(\);/.test(main), 'an embed never registers the service worker (ui/offline.js is not fetched)');
check(/if \(embed\) window\.removeEventListener\('sr:layers-ready', hintLater\);/.test(main), 'an embed does not fetch the controls hint');
for (const what of ['loadAuroraLater', 'loadWeatherLater']) check(new RegExp(`if \\(!embed\\) window\\.addEventListener\\('sr:layers-ready', ${what}`).test(main), `an embed does not fetch ${what}'s module`);
check(/if \(!embed\) ctx\.liveClouds\.start\(\)/.test(main) && /if \(!embed\) afterFirstVisit\(LATER_LAYERS_MS, \(\) => ctx\.loadAfterFirstVisit\(\)\);/.test(main), 'nor today\'s clouds, nor the far catalogues unless its link names one');
const preload = read('site/index.html');
check(!/modulepreload" href="js\/ui\/(embed|photomode|sharesheet|printcompose)\.js"/.test(preload), 'none of it is preloaded');
const sheet = read('site/js/ui/sharesheet.js');
check(/import\('\.\/photomode\.js'\)/.test(sheet) && !/^import [^\n]*photomode/m.test(sheet), 'photo mode is imported when its button is pressed');
const css = read('site/css/embed.css');
check(/html\.sr-embed body > \*:not\(\.sr-scene\):not\(\.sr-veil\):not\(#boot\):not\(#labels\):not\(#sr-hud\):not\(#sr-embed\)\s*\{\s*visibility: hidden !important;/.test(css), 'in an embed everything but the scene, the tag and the one link is off the screen');
const mod = read('site/js/ui/embed.js');
check(/if \(!CAMERA_KEYS\.has\(e\.key\)\) e\.stopImmediatePropagation\(\)/.test(mod), 'only the camera\'s keys are answered inside the frame');
check(/open\.target = '_blank'/.test(mod) && /open\.rel = 'noopener'/.test(mod), 'the one link opens the full map in a new tab');

// --- the light embed (js/embedlite.js, internal #396) --------------------------------------------
{
  const L = await import(join(ROOT, 'site/js/embedlite.js'));
  const lt = (q) => JSON.stringify(L.liteTarget(q));
  check(lt('?embed=1&at=moon') === '{"kind":"world","id":"moon"}' && lt('?embed=1&at=Mars') === '{"kind":"world","id":"mars"}', 'a world by its id is the light embed\'s');
  check(lt('?embed=1&at=25544') === '{"kind":"station","id":"sat-25544"}' && lt('?at=sat-25544&embed=1') === '{"kind":"station","id":"sat-25544"}', 'a catalogue number is asked of the stations\' list');
  for (const q of ['?embed=1', '?embed=1&at=iss', '?embed=1&trip=moon-landings', '?embed=1&at=moon&t=2027-01-01T00:00:00Z', '?embed=1&at=moon&stage=moon', '?embed=1&at=moon&exp=deep', '?at=moon', '?embed=10&at=moon']) {
    check(L.liteTarget(q) === null, `${q} is the whole app's (${lt(q)})`);
  }
  // the light maps are the registry's tier -1 files, and stand in for the tier-0 file of the same row
  const yaml = read('registry/textures.yaml');
  const rows = [...yaml.matchAll(/- tier: -1\n\s+file: site\/textures\/(\S+)/g)].map((m) => m[1]).sort();
  const mine = Object.values(L.EMBED_MAPS).filter(Boolean).sort();
  check(JSON.stringify(rows) === JSON.stringify(mine), `EMBED_MAPS names the registry's tier -1 files (${rows} vs ${mine})`);
  for (const [boot, light] of Object.entries(L.EMBED_MAPS)) {
    check(yaml.includes(`file: site/textures/${boot}`), `${boot} is a registry file`);
    if (light) {
      const at = yaml.indexOf(`file: site/textures/${light}`);
      const row0 = yaml.lastIndexOf('\n  - id:', at);
      check(at > 0 && yaml.slice(row0, at).includes(`file: site/textures/${boot}`), `${light} is in the same row as ${boot}`);
    }
  }
  check(L.embedMapFor('textures/2k_earth_daymap.webp') === 'textures/embed/earth_day.webp' && L.embedMapFor('textures/2k_earth_clouds.webp') === null && L.embedMapFor('textures/2k_mars.webp') === 'textures/2k_mars.webp', 'a map with a light copy is swapped, the clouds are not drawn, any other map is its own');
  // the boot graph: none of the panels, the trips, the sky view or the whole app's entry
  const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
  const seen = new Set();
  const todo = [join(ROOT, 'site/js/embedlite.js')];
  while (todo.length) {
    const p = todo.pop();
    if (seen.has(p)) continue;
    let text;
    try { text = readFileSync(p, 'utf8'); } catch { continue; }
    seen.add(p);
    for (const m of text.matchAll(STATIC)) todo.push(join(dirname(p), m[1]));
  }
  const graph = [...seen].map((p) => p.slice(join(ROOT, 'site').length + 1));
  for (const bad of ['js/main.js', 'js/ui/explore.js', 'js/ui/shell.js', 'js/ui/rail.js', 'js/ui/search.js', 'js/ui/trip.js', 'js/ui/tripgate.js', 'js/ui/cards.js', 'js/sky/skyview.js', 'js/scene/heroes.js', 'js/scene/stars3d.js', 'js/scene/galaxy.js', 'js/audio/engine.js', 'js/data/tours.js']) {
    check(!graph.includes(bad), `the light embed's static graph does not reach ${bad}`);
  }
  const main = join(ROOT, 'site/js/main.js');
  const full = new Set(); const q2 = [main];
  while (q2.length) { const p = q2.pop(); if (full.has(p)) continue; let text; try { text = readFileSync(p, 'utf8'); } catch { continue; } full.add(p); for (const m of text.matchAll(STATIC)) q2.push(join(dirname(p), m[1])); }
  check(graph.length < full.size * 0.6, `the light embed's graph is ${graph.length} modules against the app's ${full.size}`);
  // the page: the modules are preloaded from a template, moved into the head unless the address is an embed's
  const html = read('site/index.html');
  const t0 = html.indexOf('<template id="sr-preload">');
  const t1 = html.indexOf('</template>', t0);
  const links = [...html.matchAll(/<link rel="modulepreload" href="[^"]+">/g)];
  check(t0 > 0 && t1 > t0 && links.length > 50 && links.every((m) => m.index > t0 && m.index < t1), 'every modulepreload line is inside the template, where a browser does not fetch it');
  check(/<\/template>\n<script>if\(!\/\[\?&\]embed=1\(\?:&\|\$\)\/\.test\(location\.search\)\)document\.head\.appendChild\(document\.getElementById\('sr-preload'\)\.content\)<\/script>/.test(html), 'and one line moves them into the head unless the address is an embed\'s');
  check(/import\('\.\/js\/embedlite\.js'\)\)\.bootLite\(/.test(html) && /if \(!lite && preload\) document\.head\.appendChild\(preload\.content\);/.test(html) && /if \(!lite\) \{\s*const \{ boot \} = await import\('\.\/js\/main\.js'\);/.test(html), 'the page boots the light embed first, and the whole app (with its preloads) when it answers no');
  const lite = read('site/js/embedlite.js');
  check(/if \(!record\) return false;/.test(lite) && lite.indexOf('if (!record) return false;') < lite.indexOf('createRenderer(canvas)'), 'an object the light embed cannot find is refused before anything is built');
  check(!/serviceWorker|offline\.js/.test(lite), 'the light embed registers no service worker');
  const doc2 = read('docs/EMBEDDING.md');
  check(/## The light embed, and the whole one/.test(doc2) && doc2.includes('embed_first_visit_bytes') && doc2.includes('`?embed=1&at=moon`') && doc2.includes('3D model'), 'docs/EMBEDDING.md says which links are light and what the light embed leaves out');
}

// --- the manual ----------------------------------------------------------------------------------
const doc = read('docs/EMBEDDING.md');
for (const k of ['embed', ...E.EMBED_KEYS]) check(doc.includes('`' + k + '`'), `docs/EMBEDDING.md does not describe the parameter \`${k}\``);
check(doc.includes(E.embedSnippet({ at: 'sat-25544' }, { title: 'The International Space Station, live on Space Radar' })), 'docs/EMBEDDING.md shows the snippet the app copies');
check(/attribution/i.test(doc) && /Open in Space Radar/.test(doc), 'docs/EMBEDDING.md says what attribution an embed carries');

// --- photo mode's frame --------------------------------------------------------------------------
const P = await import(join(ROOT, 'site/js/ui/photomode.js'));
const C = await import(join(ROOT, 'site/js/ui/printcompose.js'));
check(JSON.stringify(P.SHAPES) === JSON.stringify(['16:9', '1:1', '4:5', '9:16']), `the four shapes, in order (${P.SHAPES})`);
for (const [vw, vh] of [[1440, 900], [390, 844], [844, 390], [320, 568]]) {
  for (const shape of P.SHAPES) {
    const m = { x: 16, y: 96 };
    const r = P.frameRect(vw, vh, shape, m);
    const [a, b] = shape.split(':').map(Number);
    check(Math.abs(r.w / r.h - a / b) < 0.02, `${shape} at ${vw}x${vh}: the frame is ${r.w}x${r.h}`);
    check(Math.abs(r.x * 2 + r.w - vw) <= 1 && Math.abs(r.y * 2 + r.h - vh) <= 1, `${shape} at ${vw}x${vh}: the frame is centred`);
    check(r.w <= vw - 2 * m.x + 1 && r.h <= vh - 2 * m.y + 1 && r.w > 0 && r.h > 0, `${shape} at ${vw}x${vh}: the frame is inside its margins`);
    check(Math.abs(r.fovScale - r.h / vh) < 1e-9 && r.fovScale > 0 && r.fovScale < 1, `${shape} at ${vw}x${vh}: fovScale is the frame's share of the height`);
    const s = C.pictureSize(shape);
    check(Math.abs(s.w / s.h - a / b) < 0.001 && Math.max(s.w, s.h) >= 1800 && s.portrait === (s.h > s.w), `${shape}: the picture is ${s.w}x${s.h}`);
  }
}
check(C.pictureSize('7:3').preset === '1:1', 'an unknown shape is the square');
// The lens, and PNG (internal #397).
check(P.LENS.min === 15 && P.LENS.max === 75 && P.clampLens(45) === 45 && P.clampLens(3) === 15 && P.clampLens(120) === 75 && P.clampLens('30.4') === 30 && P.clampLens('x', 45) === 45, 'the lens is held between 15 and 75 degrees, and a value that is not a number is the map\'s own');
{
  const photo = readFileSync(join(ROOT, 'site/js/ui/photomode.js'), 'utf8');
  check(/cam\.fov = clampLens\(deg, ownFov\)/.test(photo) && /cam\.fov !== ownFov\) \{ cam\.fov = ownFov/.test(photo), 'the lens moves the camera\'s field of view, and leaving puts the map\'s own back');
  check(/makePostcard\(ctx, asPng \? 'png' : 'jpeg'/.test(photo) && /lensInput\.type = 'range'/.test(photo) && /aria-pressed', asPng/.test(photo), 'Save writes a PNG when PNG is pressed, and the lens is a slider');
  const compose = readFileSync(join(ROOT, 'site/js/ui/printcompose.js'), 'utf8');
  check(/format === 'png'\) blob = await blobOf\(picture, 'image\/png'\)/.test(compose) && /format === 'png' \? 'png' : 'jpg'/.test(compose), 'a PNG is the composed picture as image/png, named .png');
  check(/CAMERA_FOV_DEG = 45\b/.test(readFileSync(join(ROOT, 'site/js/scene/renderer.js'), 'utf8')), 'and 45 degrees is the map\'s own lens');
}

// A station whose list could not be read shows the Earth, and the frame says why (internal #429).
{
  const lite = readFileSync(join(ROOT, 'site/js/embedlite.js'), 'utf8');
  const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
  check(/note = COPY\.embed\.stationUnread/.test(lite) && /embed\.attach\(ctx, note\)/.test(lite), 'the light embed passes the frame a note when it falls back to the Earth');
  check(typeof COPY.embed.stationUnread === 'string' && COPY.embed.stationUnread.length < 60, 'and the note is chrome copy under 60 characters');
  const emb = readFileSync(join(ROOT, 'site/js/ui/embed.js'), 'utf8');
  check(/function attach\(ctx, note = ''\)/.test(emb) && /what\.hidden = !on && !note/.test(emb), 'ui/embed.js shows it in the same line a trip uses, and a trip replaces it while it runs');
}

if (problems.length) { console.error('embed FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`embed ok: ?embed=1 read through a whitelist of ${E.EMBED_KEYS.length} keys, the snippet one titled lazy iframe, nothing of it at boot and no service worker in a frame; photo mode's frame centred in ${P.SHAPES.length} shapes`);
