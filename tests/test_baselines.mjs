// tests/test_baselines.mjs -- the deep-space baseline captures are wired, and a pull request cannot quietly unwire them (public #1189).
//
// WHAT THIS DOES NOT DO, and the issue asked for it: diff pictures. No reference picture is kept in
// the repository (a software renderer's pixels move with the browser build, and the baseline was
// always read by a person with the numbers beside it), so there is nothing to diff against in node. What
// can go wrong without anyone noticing is the capture list itself: a scene group renamed, a pose that
// names a group no longer there (the probe then runs nothing and says nothing), a DS pose of the
// package deleted, or the look workflow losing the probe. Those are held here, on every pull request.
//
// The numbers each capture writes (the stage, the distance, the names and their overlaps, the draw
// calls, the frame times) are judged by tools/look-summary.mjs in the look workflow: it fails the job
// on a logged error or a `fail` from the probe.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// -- the reader, tried on a sample ----------------------------------------------------------------
export function readProbe(src) {
  const groups = new Set([...src.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_]*): async\b/gm)].map((m) => m[1]));
  const blocksAt = src.indexOf('const BLOCKS = {');
  const blocksEnd = src.indexOf('\n};', blocksAt);
  const blocks = {};
  for (const m of src.slice(blocksAt, blocksEnd).matchAll(/^ {2}([a-g]): \[([^\]]*)\]/gm)) blocks[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  const posesAt = src.indexOf('const POSES = {');
  const posesEnd = src.indexOf('\n};', posesAt);
  const poses = {};
  for (const m of src.slice(posesAt, posesEnd).matchAll(/'?([A-Za-z0-9-]+)'?: \[([^\]]*)\]/g)) poses[m[1]] = [...(poses[m[1]] || []), ...[...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])];
  return { groups, blocks, poses };
}
{
  const s = readProbe("const G = {\n  one: async () => {},\n  two: async () => {},\n};\nconst BLOCKS = {\n  a: ['one'],\n  b: ['two', 'ghost'],\n};\nconst POSES = {\n  'DS-01': ['one'], solo: ['ghost'],\n};\n");
  check([...s.groups].join() === 'one,two' && s.blocks.b.join() === 'two,ghost' && s.poses['DS-01'].join() === 'one' && s.poses.solo.join() === 'ghost', 'the reader finds groups, blocks and poses in a sample');
}

// -- the real probe -------------------------------------------------------------------------------
const deep = readProbe(read('tests/probes/look/deepspace.js'));
check(deep.groups.size >= 20, `the deep-space probe has its scene groups (${deep.groups.size})`);
for (const [letter, names] of Object.entries(deep.blocks)) {
  for (const n of names) check(deep.groups.has(n), `block ${letter} runs "${n}", which is not a scene group: the probe would run nothing for it and say nothing`);
}
for (const [pose, names] of Object.entries(deep.poses)) {
  for (const n of names) check(deep.groups.has(n), `pose ${pose} names "${n}", which is not a scene group`);
}
// every group is in some block (a group nobody lists never runs), bar the ones a pose or a name reaches on request
const listed = new Set(Object.values(deep.blocks).flat());
for (const g of deep.groups) check(listed.has(g), `scene group "${g}" is in no block, so the full baseline never takes it`);
// the package's DS poses that exist today stay (spec 0075 section 3); one may be added to, not dropped
for (const ds of ['DS-01', 'DS-02', 'DS-05', 'DS-06', 'DS-07', 'DS-08', 'DS-09', 'DS-10', 'DS-11', 'DS-17', 'DS-18']) check((deep.poses[ds] || []).length > 0, `the pose ${ds} of the package is gone from the deep-space probe`);

// -- the heroes' gallery probe and the workflow that runs them ------------------------------------
const heroes = read('tests/probes/look/heroes.js');
check(/look\.probe = 'heroes'/.test(heroes) && (heroes.match(/^ {2}[A-Za-z0-9]+: (?:world\(|async)/gm) || []).length >= 8, 'the heroes probe still lists its worlds');
const look = read('.github/workflows/look.yml');
check(/tests\/probes\/look/.test(look), 'the look workflow runs probes from tests/probes/look/');
const readme = read('tools/README.md');
check(/\| `deepspace` \|/.test(readme) && /\| `heroes` \|/.test(readme), 'tools/README.md still names the deepspace and heroes captures');

if (problems.length) {
  console.error('FAIL test_baselines\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`ok test_baselines (${deep.groups.size} deep-space scene groups in ${Object.keys(deep.blocks).length} blocks, ${Object.keys(deep.poses).length} poses, every name resolves, the DS poses of the package are all there)`);
