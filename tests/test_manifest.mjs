// tests/test_manifest.mjs -- the web manifest, its icons, and how the page and the deploy carry them (issue #290).
//
//   node tests/test_manifest.mjs
//
// Installable means: a manifest the page links to, with a name, a start address, standalone
// display and icons that are really the sizes they claim (192, 512, and a maskable 512). Every
// address in it is relative, so a copy in a subfolder installs as itself. And the deploy must
// carry the manifest and the stamped worker with no-cache, or a release cannot be replaced.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

const manifest = JSON.parse(readFileSync(join(SITE, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(join(SITE, 'index.html'), 'utf8');

check(manifest.name === 'Space Radar' && typeof manifest.short_name === 'string' && manifest.short_name.length <= 12,
  'name must be Space Radar, with a short_name of at most 12 characters (a home screen cuts longer ones)');
check(manifest.display === 'standalone', 'display must be standalone');
for (const key of ['start_url', 'scope', 'id']) check(manifest[key] === './', `${key} must be "./": the folder the manifest is in, wherever that is`);
const theme = (html.match(/<meta name="theme-color" content="([^"]+)"/) || [])[1];
check(manifest.theme_color === theme && manifest.background_color === theme,
  `theme_color and background_color must be the page's theme colour (${theme}), or the launch screen flashes another`);
check(typeof manifest.description === 'string' && manifest.description.length >= 40, 'a description of at least 40 characters');

/** Width and height from a PNG's IHDR. */
function pngSize(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
const has = (size, purpose) => icons.some((i) => i.sizes === `${size}x${size}` && String(i.purpose || 'any').split(' ').includes(purpose));
check(has(192, 'any') && has(512, 'any'), 'icons: a 192 and a 512 with purpose any (what Chrome asks for before it offers to install)');
check(has(512, 'maskable'), 'icons: a maskable 512 (Android crops the plain one to a circle)');
for (const icon of icons) {
  check(!/^([a-z]+:)?\//i.test(icon.src), `icon ${icon.src}: the address must be relative`);
  const file = join(SITE, icon.src);
  if (!existsSync(file)) { problems.push(`icon ${icon.src} is not in site/`); continue; }
  const size = pngSize(file);
  check(icon.type === 'image/png' && size && `${size.w}x${size.h}` === icon.sizes, `icon ${icon.src}: says ${icon.sizes}, is ${size ? `${size.w}x${size.h}` : 'not a PNG'}`);
}

check(/<link rel="manifest" href="manifest\.webmanifest">/.test(html), 'index.html must link the manifest, by a relative address');
const touch = (html.match(/<link rel="apple-touch-icon" href="([^"]+)">/) || [])[1];
check(touch && !touch.startsWith('/') && existsSync(join(SITE, touch)), 'index.html must name an apple-touch-icon that is in site/');
if (touch && existsSync(join(SITE, touch))) {
  const size = pngSize(join(SITE, touch));
  check(size && size.w === 180 && size.h === 180, 'the apple-touch-icon is 180 x 180');
}

// The deploy and the release carry them.
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
check(/stamp_sw\.py" --site "\$SITE" [^\n]*--out "\$BUILT\/sw\.js"/.test(deploy), 'deploy.sh must stamp a COPY of sw.js (never the tree)');
// ...with the hashes of the files it uploads: js/ and css/ go up without their comments (internal #405).
check(/OVERLAY=\(--overlay "\$BUILT\/min"\)/.test(deploy) && /stamp_sw\.py" --site "\$SITE" \$\{OVERLAY\[@\]\+"\$\{OVERLAY\[@\]\}"\} --out/.test(deploy), 'deploy.sh must stamp the worker with the hashes of the stripped js/ and css/ it uploads');
check(/"\$BUILT\/sw\.js:text\/javascript; charset=utf-8"/.test(deploy), 'deploy.sh must upload the stamped sw.js as JavaScript');
check(/"\$SITE\/manifest\.webmanifest:application\/manifest\+json; charset=utf-8"/.test(deploy), 'deploy.sh must upload the manifest with its own type');
const rootLoop = deploy.slice(deploy.indexOf('for f in "$SITE/index.html'));
check(/--cache-control "no-cache" --content-type "\$type"/.test(rootLoop.slice(0, rootLoop.indexOf('\n  done'))),
  'the root files, sw.js among them, are uploaded no-cache: a worker a browser cannot re-read cannot be replaced');
check(rootLoop.indexOf('sw.js') > rootLoop.indexOf('index.html') && deploy.indexOf('"$SITE/js"') < deploy.indexOf('stamp_sw.py'),
  'sw.js is uploaded after the files it names');
check(/"\/sw\.js"/.test(deploy) && /"\/manifest\.webmanifest"/.test(deploy), 'deploy.sh must invalidate /sw.js and /manifest.webmanifest');
const release = readFileSync(join(ROOT, '.github/workflows/release.yml'), 'utf8');
check(/stamp_sw\.py --site "dist\/\$NAME\/site"/.test(release), 'release.yml must stamp the worker in the zip');

if (problems.length) {
  for (const p of problems) console.error('FAIL ' + p);
  console.error(`\n${problems.length} problem(s) with the manifest`);
  process.exit(1);
}
console.log(`manifest ok: installable, ${icons.length} icons of the sizes they claim, every address relative, and the deploy carries it and the stamped worker no-cache`);
