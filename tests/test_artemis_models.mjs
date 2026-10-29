// 0079 c4: sls-block1 and orion-esm are split into the named parts the Moments contract asks for
// (~/space-radar-handoff/release-1.5/moments-contract.md): every part of the registry row is a top-level node of
// the file, its translation is the row's `attach`, no node is unnamed, and the engines name real parts.
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
let bad = 0; const fail = (m) => { bad++; console.error('FAIL ' + m); };
for (const id of ['sls-block1', 'orion-esm']) {
  const row = yaml.split('\n').find((l) => l.startsWith(`  - {id: ${id},`)); if (!row) { fail(`${id}: no row`); continue; }
  const parts = (row.match(/parts: \[([^\]]*)\]/) || [])[1]?.split(',').map((s) => s.trim().replace(/"/g, ''));
  if (!parts) { fail(`${id}: no parts`); continue; }
  const attachLine = (row.match(/attach: \{(.*?)\}, engines/) || [])[1] || '';
  const attach = Object.fromEntries([...attachLine.matchAll(/([a-z0-9-]+): \[([^\]]*)\]/g)].map((m) => [m[1], m[2].split(',').map(Number)]));
  const file = join(ROOT, (row.match(/file: ([^,]+),/) || [])[1]);
  const buf = readFileSync(file); const jl = buf.readUInt32LE(12); const gltf = JSON.parse(buf.slice(20, 20 + jl).toString('utf8'));
  const scene = gltf.scenes[gltf.scene || 0]; const top = scene.nodes.map((i) => gltf.nodes[i]);
  const names = top.map((n) => n.name);
  if (JSON.stringify(names) !== JSON.stringify(parts)) fail(`${id}: top-level nodes ${names} are not the row's parts ${parts}, in flight order`);
  for (const n of top) {
    const a = attach[n.name]; const t = n.translation || [0, 0, 0];
    if (!a || a.some((v, k) => Math.abs(v - t[k]) > 0.002)) fail(`${id}: ${n.name} sits at ${t.map((v) => v.toFixed(3))} and the row's attach says ${a}`);
  }
  for (const n of gltf.nodes) if (!n.name) fail(`${id}: an unnamed node`);
  const engines = (row.match(/engines: \{(.*?)\}, used_for/) || [])[1] || '';
  for (const m of engines.matchAll(/([a-z0-9-]+): \[\[/g)) if (!parts.includes(m[1])) fail(`${id}: engines names ${m[1]}, not a part`);
  let tris = 0; for (const m of gltf.meshes) for (const p of m.primitives) tris += gltf.accessors[p.indices].count / 3;
  const budget = Number((row.match(/budget_tris: (\d+)/) || [])[1]);
  if (tris > budget || tris > 60000) fail(`${id}: ${tris} triangles, budget ${budget}`);
  console.log(`ok ${id}: ${parts.length} parts, ${Math.round(tris)} triangles, ${Math.round(statSync(file).size / 1024)} kB`);
}
if (bad) process.exit(1);
