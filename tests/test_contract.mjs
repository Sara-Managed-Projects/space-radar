#!/usr/bin/env node
// Check every module in site/js against tests/test_contract.mjs.
//
// Six agents wrote these modules concurrently against one written contract. The failure mode that
// costs the most is not a bad algorithm -- it is two modules that disagree about a name, which is
// invisible until the browser loads and something is undefined. This finds that on the command
// line instead.
//
// Modules that touch `document`, `window` or `localStorage` at import time cannot be imported in
// node; they are checked structurally by parsing their export statements instead. A module that
// touches the DOM at MODULE SCOPE (rather than inside a function) is itself a defect and is
// reported as one.
//
// Run: node tests/test_contract.mjs

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// module path -> exports the contract requires
const CONTRACT = {
  'clock.js': ['clock'],
  'propagate/frames.js': ['gmst', 'eciToEcef', 'ecefToEci', 'geodeticToEcef', 'ecefToGeodetic', 'lookAngles', 'toStage'],
  'propagate/index.js': ['propagate', 'PROPAGATORS'],
  'data/sources.js': ['SOURCES', 'load', 'status'],
  'data/parsers.js': ['parseCelestrakGP', 'parseLaunches', 'parseComets', 'parseDsn'],
  'data/sample.js': ['sampleAsteroids', 'sampleDeepSpace'],
  'data/layers.js': ['LAYERS', 'loadLayer'],
  'scene/renderer.js': ['createRenderer'],
  'scene/stage.js': ['stage'],
  'scene/worlds.js': ['createWorlds'],
  'scene/earth.js': ['createEarth'],
  'scene/starfield.js': ['createStarfield'],
  'scene/glyphs.js': ['createGlyphLayer'],
  'scene/models.js': ['modelFor'],
  'scene/camera.js': ['createCameraRig'],
  'sky/passes.js': ['predictPasses'],
  'sky/skyview.js': ['createSkyView'],
  'ui/cards.js': ['showCard', 'hideCard'],
  'ui/controls.js': ['createControls'],
  'ui/status.js': ['createStatus'],
  'copy/en.js': ['COPY', 'compare'],
};

const problems = [];
const notes = [];

function exportsOf(src) {
  const names = new Set();
  // export function foo / export async function foo / export const foo / export class foo
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  // export { a, b as c }
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const bit = part.trim();
      if (!bit) continue;
      const as = bit.match(/\bas\s+([A-Za-z_$][\w$]*)/);
      names.add(as ? as[1] : bit.split(/\s+/)[0]);
    }
  }
  if (/export\s+default/.test(src)) names.add('default');
  return names;
}

// 1. every contract file exists, parses, and exports what it must
for (const [rel, required] of Object.entries(CONTRACT)) {
  const path = join(JS, rel);
  if (!existsSync(path)) { problems.push(`MISSING  ${rel}`); continue; }
  try {
    // `node --check <file>` parses a .js file as CommonJS, which ACCEPTS things a browser's
    // module parser rejects -- a stray backtick inside a template literal among them. Feeding the
    // source in on stdin with --input-type=module is the parse the browser actually performs.
    // The first version of this harness used the weaker check and passed a file the browser
    // refused to load, which is a guard reporting wrongly: worse than no guard.
    execFileSync('node', ['--input-type=module', '--check'], { input: readFileSync(path), stdio: 'pipe' });
  } catch (e) {
    problems.push(`SYNTAX   ${rel}: ${String(e.stderr).split('\n').slice(0, 3).join(' ').trim()}`);
    continue;
  }
  const src = readFileSync(path, 'utf8');
  const have = exportsOf(src);
  const missing = required.filter((n) => !have.has(n));
  if (missing.length) problems.push(`EXPORTS  ${rel}: contract requires ${missing.join(', ')}`);
}

// 2. every relative import resolves to a file that exports that name
const allFiles = [];
(function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.js')) allFiles.push(p);
  }
})(JS);

for (const file of allFiles) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(JS.length + 1);

  for (const m of src.matchAll(/import\s+([^;]*?)\s+from\s+['"]([^'"]+)['"]/g)) {
    const [, clause, spec] = m;
    if (!spec.startsWith('.')) {
      problems.push(`IMPORT   ${rel}: bare specifier '${spec}' -- there is no bundler and no import map`);
      continue;
    }
    const target = join(dirname(file), spec);
    if (!existsSync(target)) { problems.push(`IMPORT   ${rel}: '${spec}' does not exist`); continue; }
    if (spec.includes('/vendor/')) continue;  // vendored bundles are minified; trust them
    const targetExports = exportsOf(readFileSync(target, 'utf8'));
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(',')) {
        const bit = part.trim();
        if (!bit) continue;
        const name = bit.split(/\s+as\s+/)[0].trim();
        if (name && !targetExports.has(name)) {
          problems.push(`IMPORT   ${rel}: imports { ${name} } from '${spec}', which does not export it`);
        }
      }
    }
  }

  // 3. hard rules from the contract
  if (/\bDate\.now\(\)/.test(src) && !/clock\.js$/.test(rel)) {
    notes.push(`Date.now() in ${rel} -- allowed only for real elapsed time, never for drawn state`);
  }
  if (/#(?:[Ff]{2}0000|[Ee]f4444|[Dd]c2626|[Rr]ed\b)/.test(src) || /\bcolor:\s*red\b/.test(src)) {
    problems.push(`PALETTE  ${rel}: red is not in the palette`);
  }
  // DOM at module scope: a top-level document/window reference outside a function body
  const moduleScope = src.replace(/(?:function[^{]*|=>\s*)\{[\s\S]*?\n\}/g, '');
  if (/^\s*(?:const|let|var)\s+\w+\s*=\s*(?:document|window)\./m.test(moduleScope)) {
    notes.push(`DOM at module scope in ${rel} -- it will throw if imported before the DOM exists`);
  }
}

// 3b. every rocket shape the registry offers actually builds, and fits its triangle budget.
//
// registry/models.yaml has a `budget_tris` for rocket-upper-stage and NOTHING has ever checked
// it -- that row and the BUILDERS table were related by discipline alone. A rocket went from 5
// meshes to about 25 in this change, and Vulcan VC6L (six boosters), Soyuz (four cones and its
// own bells) and Super Heavy's engine ring are the three that could blow it. So this builds
// EVERY row and measures. A budget nobody measures is a comment.
{
  const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
  const line = yaml.split('\n').find((l) => l.includes('id: rocket-upper-stage')) || '';
  const budget = Number((line.match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
  if (!budget) {
    problems.push('BUDGET   registry/models.yaml has no budget_tris for rocket-upper-stage');
  } else {
    try {
      const { modelFor, modelVariants, disposeModels } = await import(
        join(JS, 'scene/models.js')
      );
      const variants = modelVariants().rocket;
      if (variants.length < 2) {
        problems.push(
          `BUDGET   BUILDERS.rocket has ${variants.length} variant(s); the registry rows are not wired in`
        );
      }
      let worst = { id: null, tris: 0 };
      for (const id of variants) {
        const obj = modelFor('rocket', id);
        let tris = 0;
        let meshes = 0;
        obj.traverse((n) => {
          if (!n.geometry) return;
          meshes += 1;
          const g = n.geometry;
          tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
        });
        if (tris > budget) {
          problems.push(`BUDGET   rocket:${id} is ${Math.round(tris)} tris, over budget_tris ${budget}`);
        }
        if (meshes > 40) problems.push(`BUDGET   rocket:${id} is ${meshes} meshes; the pool budget is ~30`);
        if (tris > worst.tris) worst = { id, tris };
        disposeModels(obj);
      }
      notes.push(
        `${variants.length} rocket shapes build; worst is ${worst.id} at ` +
          `${Math.round(worst.tris)} of ${budget} tris`
      );
    } catch (e) {
      problems.push(`BUDGET   could not build the rocket shapes: ${String(e && e.message)}`);
    }
  }
}

// 3c. a launch may never claim a shape it did not match. `stands_for: variant` on a row is a
// claim about ONE vehicle; nine such rows also list a family string, so a launch whose full_name
// nobody has listed yet lands on one of them and the card would say "drawn from published
// dimensions for Angara 1.2" about an Angara A5. The cap lives in data/parsers.js, and this is
// the assertion that it is still there -- the feed produces new spellings under old families
// every few weeks ("Ariane 62 Block 2", "Starship V3"), so this fires the day it matters.
{
  try {
    const { parseLaunches } = await import(join(JS, 'data/parsers.js'));
    const launch = (full_name, families, provider) => ({
      id: `t-${full_name}`,
      net: '2026-10-01T00:00:00Z',
      rocket: { configuration: { full_name, families: families.map((name) => ({ name })) } },
      launch_service_provider: { name: provider },
      pad: { latitude: '28.5', longitude: '-80.5', name: 'p', location: { name: 'l' } },
    });
    const metaOf = (r) => parseLaunches({ results: [r] }).launches[0].meta;

    const exact = metaOf(launch('Falcon 9 Block 5', ['Falcon', 'Falcon 9'], 'SpaceX'));
    if (exact.drawsAs !== 'variant' || exact.drawnVia !== 'full_name') {
      problems.push(`HONESTY  a full_name match should still say variant; got ${exact.drawsAs}/${exact.drawnVia}`);
    }
    const byFamily = metaOf(launch('Falcon 9 Block 6', ['Falcon', 'Falcon 9'], 'SpaceX'));
    if (byFamily.drawnVia !== 'family') {
      problems.push(`HONESTY  'Falcon 9 Block 6' should match by family; got ${byFamily.drawnVia}`);
    } else if (byFamily.drawsAs === 'variant') {
      problems.push(
        `HONESTY  a family match claims "drawn from published dimensions for ${byFamily.drawnName}"`
      );
    }
    const byProvider = metaOf(launch('Orbex Prime', [], 'Orbex'));
    if (byProvider.drawnVia !== 'provider') {
      problems.push(`HONESTY  'Orbex Prime' should match by provider; got ${byProvider.drawnVia}`);
    } else {
      if (byProvider.drawsAs === 'variant') problems.push('HONESTY  a provider match claims an exact vehicle');
      // Its row's own source reads "NOT this vehicle: no source was read for Prime...".
      if (byProvider.sizeM !== null) {
        problems.push(`HONESTY  the provider stand-in states a height (${byProvider.sizeM} m) for a vehicle it says it cannot size`);
      }
    }
    const generic = metaOf(launch('Nova', ['Nova'], 'Firefly Aerospace'));
    if (generic.drawsAs !== 'generic' || generic.sizeM !== null) {
      problems.push(`HONESTY  an unmatched launch should be generic with no height; got ${generic.drawsAs}/${generic.sizeM}`);
    }
    notes.push('drawsAs is capped by the match level: full_name -> variant, family/provider -> family');
  } catch (e) {
    problems.push(`HONESTY  could not check the drawn claim: ${String(e && e.message)}`);
  }
}

// 4. report
if (notes.length) {
  console.log('notes:');
  for (const n of notes) console.log(`  - ${n}`);
  console.log('');
}
if (problems.length) {
  console.log(`contract: ${problems.length} problem(s)\n`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log(`contract ok: ${Object.keys(CONTRACT).length} modules, ${allFiles.length} files, every import resolves`);
