// tests/test_cosmic_web_gate.mjs -- what the cosmic web may not be drawn without (internal #826 and #828).
//
// Nothing draws the cosmic web yet: registry/visual-classes.yaml COSMIC_WEB has `renderer: []` and a `planned:`
// that names both issues. The DESI DR1 wedge (CC BY 4.0, internal #826) and the simulated filaments beside it
// (internal #828) come with two acceptance lines that must not be left to the day they are drawn:
//   #826  "DR1 sightline doesn't imply all-sky completeness": the credit and the footprint are said where it is drawn;
//   #828  "Visual legend never confuses simulated with observed": the two have their own styles and one legend.
// So this test holds both states. While the class has no renderer it holds that the gap is tracked and that
// nothing claims otherwise. The moment a renderer is listed it fails until the class's note says, in words,
// what DR1 is and is not (the licence, its credit line, the part of the sky it covers and that the rest is
// unobserved), names the observed and the simulated styles apart, and CREDITS.md carries the survey.
// Reads registry text, so it is not in scripts/check_built_tree.mjs TESTS.
// Run: node tests/test_cosmic_web_gate.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const yaml = readFileSync(join(ROOT, 'registry/visual-classes.yaml'), 'utf8');
const at = yaml.indexOf('\n  - id: COSMIC_WEB\n');
check(at > 0, 'the COSMIC_WEB class is in registry/visual-classes.yaml');
const rest = yaml.slice(at + 1);
const next = rest.indexOf('\n  - id: ', 5);
const block = next < 0 ? rest : rest.slice(0, next);
const field = (name) => { const m = new RegExp(`^ {4}${name}:[ \\t]*(.*)$`, 'm').exec(block); return m ? m[1].trim() : null; };
const noted = (name) => { const m = new RegExp(`^ {6}${name}:[ \\t]*"?(.*?)"?$`, 'm').exec(block); return m ? m[1] : ''; };
const renderer = field('renderer');
check(renderer !== null, 'the class has a `renderer:` line');
const drawn = renderer !== null && renderer !== '[]';

if (!drawn) {
  // Not drawn: the gap is tracked, the honesty is the lowest, and the note does not claim a source in use.
  const planned = field('planned') || '';
  check(/internal #826\b/.test(planned) && /#828\b/.test(planned), 'while nothing is drawn, `planned:` names internal #826 and #828');
  check(field('honesty') === 'illustrative', 'and the class is illustrative, as it was when it drew nothing');
  check(/^None yet/.test(noted('source')) && /^Nothing drawn/.test(noted('drawn')), 'and its note says nothing is drawn and no source is in use');
  check(!/DESI/.test(readFileSync(join(ROOT, 'CREDITS.md'), 'utf8')), 'and CREDITS.md does not credit a survey whose data is not in the app');
} else {
  const source = noted('source');
  const says = noted('drawn');
  const rights = noted('rights');
  const all = `${source} ${says} ${rights}`;
  // internal #826
  check(/DESI DR1/.test(source), 'the note names the data release: DESI DR1');
  check(/CC BY 4\.0/.test(rights), 'the note states the licence: CC BY 4.0');
  check(/\b(?:square degrees|sq\.? ?deg)/i.test(all) && /footprint/i.test(all), 'the note says how much sky DR1 covers, in square degrees, and calls it a footprint');
  check(/(?:not|never|no)\s+(?:the\s+)?(?:whole|all|entire|full)[- ]sky|outside (?:the|its) footprint|unobserved|not observed/i.test(all), 'the note says the sky outside the footprint was not observed, so a gap is not an empty place');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(/DESI/.test(credits) && /CC BY 4\.0/.test(credits.split('\n').filter((l) => /DESI/.test(l)).join('\n')), 'CREDITS.md carries DESI DR1 and its licence on the same line');
  // internal #828
  check(/\bobserved\b|\bcatalogue\b/i.test(says) && /\bsimulat/i.test(says), 'the note names the observed (catalogue) style and the simulated style');
  check(/legend/i.test(all), 'and says the legend that keeps them apart');
  check(['modelled', 'illustrative', 'measured'].includes(field('honesty')), 'the class\'s honesty is one of the three words (a mixed class says the split in its note)');
}

if (problems.length) { console.error('cosmic web gate FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`cosmic web gate ok: ${drawn ? 'drawn, with its credit, footprint and two-style legend said' : 'not drawn yet, tracked by internal #826 and #828, and nothing claims otherwise'}`);
