// tests/test_lab_scale.mjs -- the sums of the Lab's "The Solar System in Your Street" (forge internal #550), worked by hand.
//
// The simulator is one file (site/lab/solar-system-in-your-street/index.html, held to the Lab's rules by tests/test_lab.mjs).
// Its whole lesson is one scale, so the scale is checked here against numbers a reviewer can do on paper from the
// NASA fact sheets its Sources comment quotes:
//   the Sun 1 391 400 km across shrunk to 1.3914 m is one kilometre of space to the millimetre (L = 4 515 m to Neptune):
//   the Earth is then 12.756 mm wide and 149.6 m from the Sun, Neptune 49.5 mm wide and 4.515 km away;
//   a football for the Sun (22 cm, IFAB Law 2: 68 to 70 cm round) puts Neptune 714 m away and the Earth 2.0 mm wide, 23.7 m out.
// It also holds the page's words to the page: every word the picture and the caption draw is read from the HTML (so the
// ten translated pages draw in their language), and the print sheet has its 100 mm control line.
//   node tests/test_lab_scale.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'site', 'lab', 'solar-system-in-your-street', 'index.html');
const html = readFileSync(FILE, 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const start = html.search(/^\/\/ =+ 1\. THE SIMULATOR/m), end = html.search(/^\/\/ =+ 2\. THE PAGE/m);
const sim = html.slice(start, end);
const helpers = 'const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),seg=(t,a,b)=>clamp((t-a)/(b-a),0,1),ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)},lerp=(a,b,x)=>a+(b-a)*x;';
const SIM = new Function(helpers + sim + '\n;return SIM')();

// One kilometre of space to the millimetre: the Sun 1.3914 m wide.
const a = SIM.scaleOf(4515);
const [sun, , , earth, , , , , neptune] = a.rows;
check(near(a.k, 1e-6, 1e-12), `L = 4515 m should be 1e-6 m per km, got ${a.k}`);
check(near(sun.size, 1.3914, 1e-4), `the Sun should be 1.3914 m wide, got ${sun.size}`);
check(near(earth.size * 1000, 12.756, 1e-3), `the Earth should be 12.756 mm wide, got ${earth.size * 1000}`);
check(near(earth.dist, 149.6, 1e-6), `the Earth should be 149.6 m from the Sun, got ${earth.dist}`);
check(near(neptune.size * 1000, 49.528, 1e-3) && near(neptune.dist, 4515, 1e-6), `Neptune should be 49.5 mm wide and 4515 m out, got ${neptune.size} and ${neptune.dist}`);
check(sun.dist === 0 && a.rows.every((r, i) => i === 0 || r.dist > a.rows[i - 1].dist), 'the bodies are listed from the Sun outwards, in walking order');

// A football for the Sun: the preset's 714 m is the 22 cm ball.
const ball = SIM.scaleOf(714).rows;
check(near(ball[0].size, 0.22, 0.0005), `the football preset should make the Sun 22 cm wide, got ${ball[0].size} m`);
check(near(ball[3].size * 1000, 2.0, 0.05) && near(ball[3].dist, 23.66, 0.05), `with a football Sun the Earth is 2.0 mm wide and 23.7 m out, got ${ball[3].size * 1000} mm, ${ball[3].dist} m`);
check(/id="p0" data-l="714"/.test(html), 'the football preset is 714 m from the Sun to Neptune');

// The lengths are written with a unit that keeps the number readable.
check(SIM.len(149.6) === '150 m', `len(149.6) is ${SIM.len(149.6)}`);
check(SIM.len(0.012756) === '1.28 cm', `len(0.012756) is ${SIM.len(0.012756)}`);
check(SIM.len(4515) === '4.52 km', `len(4515) is ${SIM.len(4515)}`);
check(/µm$/.test(SIM.len(5e-6)), `a speck is written in micrometres: ${SIM.len(5e-6)}`);

// The slider covers 1 m to 10 km, on a logarithm.
check(SIM.param.min === 0 && SIM.param.max === 4 && near(10 ** SIM.param.value, 105, 1e-6), 'the slider runs 10^0 to 10^4 metres and starts on the 105 m pitch');

// Every word on the picture comes from the page: the table's headers and the hidden list.
for (const id of ['n0', 'n1', 'n3', 'n5', 'n8', 'hs', 'hd', 'hk1', 'hk2', 'lw', 'wp', 'wz', 'wb', 'tl']) check(html.includes(`id="${id}"`), `the page lacks the words #${id} the script reads`);
check(!/text\('[A-Z][a-z]+ /.test(sim), 'the picture draws no English sentence of its own');
// The sheet: a 100 mm control line and the print rules.
check(/\.sim \.bar\{[^}]*width:100mm/.test(html), 'the control line is 100 mm wide');
check(/@media print\{/.test(html) && /@page\{size:A4/.test(html), 'the page has print rules for an A4 sheet');
check(/href="\.\.\/walk-the-solar-system\/index\.html"/.test(html) && /href="\.\.\/the-solar-system-is-mostly-empty\/index\.html"/.test(html), 'it links the two scale simulators beside it');
const css = readFileSync(join(ROOT, 'site', 'css', 'static.css'), 'utf8');
check(/@media print\{:root\{color-scheme:light\}\.skip,\.top,\.foot\{display:none/.test(css), 'css/static.css prints dark on white and hides the header and footer');

if (problems.length) { console.error(problems.map((p) => '  ' + p).join('\n')); console.error(`lab scale: ${problems.length} problem(s)`); process.exit(1); }
console.log('lab scale ok: one kilometre to the millimetre puts the Earth 12.8 mm wide and 149.6 m out; a football Sun puts Neptune 714 m away; every word drawn is the page\'s; the sheet has its 100 mm line');
