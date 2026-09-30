// tests/test_hudlabels.mjs -- no scene label inside the tracked object's brackets while its tag
// shows (spec 0047 follow-up). hud-arrived.png, 2026-09-29: with the ISS selected, "the
// International Space Station, which Nauka is part of" was printed across the station's model.
// Nauka (49044) and Poisk (36086) are catalogue objects of their own, docked to the station, drawn
// as it and named after it (scene/realmodels.js); as crewed stations they are notable, so their
// labels sat on the station's own centre, inside the brackets, beside the tag that names it.
//
//   node tests/test_hudlabels.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { insideBox } = await import(join(JS, 'ui/labels.js'));
const { realModelFor } = await import(join(JS, 'scene/realmodels.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const centre = { x: 720, y: 450 };
check(insideBox({ x: 720, y: 450 }, centre, 272), 'the centre is inside the box');
check(insideBox({ x: 720 + 136, y: 450 - 136 }, centre, 272), 'a corner is inside');
check(!insideBox({ x: 720 + 137, y: 450 }, centre, 272), 'one pixel past the edge is not');
check(!insideBox({ x: 720, y: 450 }, centre, 0) && !insideBox(null, centre, 272) && !insideBox({ x: 1, y: 1 }, null, 30), 'no box, nothing inside');

for (const [norad, part] of [[49044, 'Nauka'], [36086, 'Poisk']]) {
  const entry = realModelFor({ id: `sat-${norad}`, klass: 'station', meta: { noradId: norad } });
  check(entry && /International Space Station/.test(entry.name || '') && new RegExp(part).test(entry.name || ''), `${part} is named after the station it is part of (${entry && entry.name})`);
}

const src = readFileSync(join(JS, 'ui/labels.js'), 'utf8');
check(/if \(tagged && ctx\.hud && typeof ctx\.hud\.state === 'function'\)[\s\S]{0,200}out\.filter\(\(c\) => !insideBox\(c, st\.px, st\.box\)\)/.test(src), 'while the tag shows, every candidate label inside the brackets is dropped');
check(/const tagged = /.test(src) && src.indexOf('const tagged = ') < src.indexOf('out.filter((c) => !insideBox'), 'only while the tag names the selection');

if (problems.length) { console.error('hudlabels FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('hudlabels ok: no label inside the brackets while the tag shows (Nauka and Poisk are docked to the ISS and named after it)');
