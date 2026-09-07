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
  'data/sample.js': ['sampleAsteroids', 'sampleDeepSpace', 'sampleOddities'],
  'data/oddities.js': ['ODDITIES', 'ODDITIES_OBSERVED_ON'],
  'data/tours.js': ['TOURS', 'TOUR_DEFAULTS'],
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
  'ui/trip.js': ['createTrip'],
  'ui/tripframe.js': ['createTripFrame', 'shapeLine'],
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

// 3d. the golden master for propagate/fixed.js.
//
// `fixed` positions every dish, every pad, every landing site and every historic reentry, and
// most of them were correct only because the propagator hard-coded 'earth-fixed'. So the fix for
// the ones that were wrong is exactly the change that can move the ones that were right. This is
// the whole safety net: tests/fixtures/fixed-golden.json is the before picture.
{
  try {
    const golden = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/fixed-golden.json'), 'utf8'));
    const { dumpRows } = await import(join(ROOT, 'tests/dump_fixed_golden.mjs'));
    const now = new Map((await dumpRows()).map((r) => [r.id, r]));

    // A `fixed` record ADDED since the picture was taken is not a regression, and the fixture
    // must not be regenerated to accommodate one: regenerating writes today's corrected numbers
    // into the "before" column and turns the whole check into a tautology, which is exactly what
    // it caught its own author doing. So the fixture stays the authority for the rows it holds,
    // and a new row is held to the REQUIREMENT instead of to a stored vector -- it must answer in
    // the frame it declares, and a body-fixed one must be on that body's surface.
    const knownIds = new Set(golden.rows.map((r) => r.id));
    let earthRows = 0;
    let movedRows = 0;
    let newRows = 0;
    for (const was of golden.rows) {
      const is = now.get(was.id);
      if (!is) { problems.push(`GOLDEN   ${was.id} is gone from the fixed records`); continue; }
      const onEarth = was.declaredFrame === 'earth-fixed' || was.declaredFrame === 'earth-inertial';
      if (onEarth) {
        earthRows += 1;
        // Byte-identical. Not "close": a metre of drift here is a bug in the ellipsoid maths.
        if (JSON.stringify(is.pos) !== JSON.stringify(was.pos)) {
          problems.push(
            `GOLDEN   ${was.id} (${was.declaredFrame}) MOVED: ` +
              `${JSON.stringify(was.pos)} -> ${JSON.stringify(is.pos)}`
          );
        }
      } else {
        // These were being drawn on Earth's surface. They must not still be.
        if (!is.pos) { problems.push(`GOLDEN   ${was.id} now has no position at all`); continue; }
        if (is.pos.frame !== was.declaredFrame) {
          problems.push(
            `GOLDEN   ${was.id} declares ${was.declaredFrame} but propagate() answers in ` +
              `${is.pos.frame}`
          );
        }
        if (JSON.stringify(is.pos) === JSON.stringify(was.pos)) {
          problems.push(`GOLDEN   ${was.id} is still where the bug put it: ${JSON.stringify(was.pos)}`);
        }
        movedRows += 1;
      }
    }
    const { WORLD_RADIUS_KM: RADII } = await import(join(JS, 'propagate/frames.js'));
    for (const [id, row] of now) {
      if (knownIds.has(id)) continue;
      newRows += 1;
      if (!row.pos) { problems.push(`GOLDEN   new fixed record ${id} has no position at all`); continue; }
      if (row.pos.frame !== row.declaredFrame) {
        problems.push(
          `GOLDEN   new fixed record ${id} declares ${row.declaredFrame} and answers in ${row.pos.frame}`
        );
        continue;
      }
      const world = String(row.declaredFrame || '').split('-')[0];
      const wantKm = world === 'earth' ? 6371 : RADII[world];
      const gotKm = Math.hypot(row.pos.x, row.pos.y, row.pos.z);
      // Earth is an ellipsoid and a dish can be a kilometre up, so this is a sanity band, not the
      // metre-level assertion the Moon and Mars cases below make.
      if (!Number.isFinite(wantKm) || Math.abs(gotKm - wantKm) > 25) {
        problems.push(
          `GOLDEN   new fixed record ${id} is ${gotKm.toFixed(1)} km from the centre of ${world}, ` +
            `whose radius is ${wantKm}`
        );
      }
    }
    notes.push(
      `golden master: ${earthRows} Earth rows unchanged, ${movedRows} off-Earth rows corrected, ` +
        `${newRows} fixed record(s) added since and held to the requirement`
    );
  } catch (e) {
    problems.push(`GOLDEN   could not check the golden master: ${String(e && e.message)}`);
  }
}

// 3e. a body-fixed record is ON THAT BODY. The requirement, not the implementation: whatever
// `fixed()` does internally, Apollo 11 is 1737 km from the centre of the Moon and Jezero is 3390
// km from the centre of Mars, and the near side is the side facing Earth.
{
  const near = (got, want, tol, what) => {
    if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
      problems.push(`FRAME    ${what}: expected ${want} +/- ${tol}, got ${got}`);
      return false;
    }
    return true;
  };
  try {
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { toStage } = await import(join(JS, 'propagate/frames.js'));
    const { worldPositionKm, WORLD_RADIUS_KM } = await import(join(JS, 'propagate/body.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const sites = new Map(handKeptSites().map((r) => [r.id, r]));
    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const mag = (p) => (p ? Math.hypot(p.x, p.y, p.z) : NaN);

    const a11 = propagate(sites.get('apollo-11'), tMs);
    near(mag(a11), WORLD_RADIUS_KM.moon, 0.5, 'Apollo 11 is on the surface of the Moon');
    if (a11 && a11.frame !== 'moon-fixed') {
      problems.push(`FRAME    Apollo 11 answers in ${a11.frame}, not moon-fixed`);
    }
    const jez = propagate(sites.get('jezero'), tMs);
    near(mag(jez), WORLD_RADIUS_KM.mars, 0.5, 'Jezero is on the surface of Mars');
    if (jez && jez.frame !== 'mars-fixed') {
      problems.push(`FRAME    Jezero answers in ${jez.frame}, not mars-fixed`);
    }

    // The near side / far side check. A rotation that is transposed, or off by the sign of the
    // spin angle, still gives the right |r| -- this is the test that notices. Apollo 11 sits at
    // 23 deg E and is visible from Earth every clear night; Chang'e 4 is the far side, and its
    // whole point is that Earth cannot see it.
    const moonKm = worldPositionKm('moon', tMs, 'earth-inertial');
    const toEarthInertial = (rec) => {
      const p = propagate(rec, tMs);
      if (!p) return null;
      return toStage(rec, p, { worldId: 'earth', frame: 'earth-inertial', tMs }, tMs);
    };
    const facing = (id) => {
      const g = toEarthInertial(sites.get(id));
      if (!g || !moonKm) return NaN;
      // The site, seen from the Moon's centre, dotted with the direction to Earth.
      const s = { x: g.x - moonKm.x, y: g.y - moonKm.y, z: g.z - moonKm.z };
      const rs = Math.hypot(s.x, s.y, s.z);
      const rm = Math.hypot(moonKm.x, moonKm.y, moonKm.z);
      if (!(rs > 0) || !(rm > 0)) return NaN;
      return -(s.x * moonKm.x + s.y * moonKm.y + s.z * moonKm.z) / (rs * rm);
    };
    const a11Facing = facing('apollo-11');
    const ce4Facing = facing('change-4');
    if (!(a11Facing > 0.5)) {
      problems.push(
        `FRAME    Apollo 11 should be on the near side of the Moon (cos to Earth > 0.5); got ${a11Facing}`
      );
    }
    if (!(ce4Facing < -0.5)) {
      problems.push(
        `FRAME    Chang'e 4 should be on the FAR side (cos to Earth < -0.5); got ${ce4Facing}`
      );
    }
    // And the distance from the Moon's centre survives the trip to Earth's frame.
    const g11 = toEarthInertial(sites.get('apollo-11'));
    if (g11 && moonKm) {
      near(
        Math.hypot(g11.x - moonKm.x, g11.y - moonKm.y, g11.z - moonKm.z),
        WORLD_RADIUS_KM.moon,
        1.0,
        'Apollo 11 converted into Earth’s frame is still on the Moon',
      );
    } else {
      problems.push('FRAME    moon-fixed -> earth-inertial is not convertible at all');
    }
    notes.push(
      `Apollo 11 faces Earth (cos ${a11Facing.toFixed(2)}), Chang'e 4 faces away (cos ${ce4Facing.toFixed(2)})`
    );
  } catch (e) {
    problems.push(`FRAME    could not check the body-fixed frames: ${String(e && e.message)}`);
  }
}

// 3e2. THE MESH AND THE MARKER MUST USE THE SAME ROTATION.
//
// A landing site is placed by propagate/frames.js and the globe under it is oriented by
// scene/worlds.js, and until this test existed those were two formulas written to match. They did
// not: worlds.js built an EQJ orientation and applied it in TEME scene axes, so every lunar row
// was drawn 0.373 degrees of longitude -- 11.3 km of lunar surface -- east of where the Moon's own
// texture put it. The old assertions could not see it: a 0.5 km radial band and a hemisphere sign
// are both blind to a tangential slide.
//
// So this recovers a site's latitude and longitude BACK through the mesh's own quaternion and
// requires the registry row within a kilometre. It is the check that would have caught it.
{
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { stage } = await import(join(JS, 'scene/stage.js'));
    const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const { WORLD_RADIUS_KM } = await import(join(JS, 'propagate/frames.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    stage.setWorld('earth');
    stage.setTime(tMs);
    const scene = new THREE.Scene();
    const worlds = createWorlds(scene, { textureBase: null });
    worlds.update(tMs);

    const byId = new Map(handKeptSites().map((r) => [r.id, r]));
    const local = new THREE.Vector3();
    let checked = 0;
    let worst = 0;
    for (const [world, ids] of [['moon', ['apollo-11', 'apollo-14', 'apollo-16', 'apollo-17', 'change-4']]]) {
      const mesh = worlds.meshFor(world);
      if (!mesh) { problems.push(`MESH     no ${world} mesh to check`); continue; }
      mesh.updateMatrixWorld(true);
      const radiusKm = WORLD_RADIUS_KM[world];
      for (const id of ids) {
        const rec = byId.get(id);
        if (!rec) { problems.push(`MESH     ${id} is not a hand-kept site any more`); continue; }
        const p = propagate(rec, tMs);
        const scenePos = p && stage.toScene(p, p.frame, tMs);
        if (!scenePos) { problems.push(`MESH     ${id} has no scene position`); continue; }
        // Into the mesh's own local space, then undo the scene axis remap (x, y, z) -> (x, z, -y).
        local.copy(scenePos);
        mesh.worldToLocal(local);
        const bf = { x: local.x, y: -local.z, z: local.y };
        const n = Math.hypot(bf.x, bf.y, bf.z);
        if (!(n > 0)) { problems.push(`MESH     ${id} recovered a zero vector`); continue; }
        const lat = (Math.asin(bf.z / n) * 180) / Math.PI;
        let lon = (Math.atan2(bf.y, bf.x) * 180) / Math.PI;
        if (lon < 0) lon += 360;
        let wantLon = rec.fixed.lonDeg;
        if (wantLon < 0) wantLon += 360;
        let dLon = Math.abs(lon - wantLon);
        if (dLon > 180) dLon = 360 - dLon;
        // Great-circle metres, not degrees: a degree of longitude is worth less near the poles and
        // the number that matters is how far across the ground the marker slid.
        const kmLat = ((lat - rec.fixed.latDeg) * Math.PI / 180) * radiusKm;
        const kmLon = ((dLon * Math.PI) / 180) * radiusKm * Math.cos((rec.fixed.latDeg * Math.PI) / 180);
        const slideKm = Math.hypot(kmLat, kmLon);
        worst = Math.max(worst, slideKm);
        checked += 1;
        if (!(slideKm < 1.0)) {
          problems.push(
            `MESH     ${id} lands ${slideKm.toFixed(2)} km from where the ${world}'s own texture ` +
              `puts it (recovered ${lat.toFixed(4)} / ${lon.toFixed(4)}, ` +
              `registry ${rec.fixed.latDeg} / ${wantLon.toFixed(4)})`
          );
        }
      }
    }
    if (!checked) problems.push('MESH     nothing was checked, so this test proves nothing');
    else notes.push(`the drawn globe and the marker agree: ${checked} lunar rows, worst ${(worst * 1000).toFixed(0)} m`);
    worlds.dispose();
  } catch (e) {
    problems.push(`MESH     could not check the mesh orientation: ${String(e && e.message)}`);
  }
}

// 3e3. LEAVING A TRIP ENDS THE FLIGHT.
//
// `stop()` and `finish()` restored the layers, the clock and the world and never touched the
// camera, so the rig flew on with the frame gone: measured in Chrome, Leave pressed 0.8 s into a
// flight left `flying` true and the distance ran from 25.7 to 70 995 scene units over the next
// 2.5 s -- 71 million kilometres of camera travel after the trip was over -- while the end card
// said "the camera stays where it is". `jump()` and `pause()` both collapsed the flight already;
// the two EXITS did not, which is why only the exits are asserted here.
{
  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
    const { createTrip } = await import(join(JS, 'ui/trip.js'));
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const { sampleOddities } = await import(join(JS, 'data/sample.js'));

    // rAF as a queue we drain by hand: the whole machine is built on schedule(), and a test that
    // waits on a real frame is a test that waits.
    const frames = [];
    const prevRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    const pump = (n = 12) => {
      for (let i = 0; i < n; i += 1) {
        const due = frames.splice(0, frames.length);
        for (const fn of due) { try { fn(Date.now()); } catch { /* not what is under test */ } }
      }
    };

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const records = sampleOddities();
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
    camera.position.set(0, 0, 10);
    const rig = createCameraRig(camera, null, { worldRadius: 0 });
    const ctx = {
      camera,
      cameraRig: rig,
      clock: { mode: 'live', rate: 1, paused: false, now: () => tMs, goTo() {}, setRate() {}, setPaused() {}, live() {} },
      layers: [{ id: 'oddities', nearKm: 2000 }],
      recordsFor: (id) => (id === 'oddities' ? records : []),
      recordById: (id) => records.find((r) => r.id === id) || null,
      isLayerOn: () => true,
      setLayerOn() {},
      select() {},
      deselect() {},
      selected: () => null,
    };
    const trip = createTrip(ctx);
    // The trip that needs no network. TOURS[0] is `people-in-space`, which resolves to one stop
    // with no CelesTrak and therefore never begins -- and a `stop()` with nothing running returns
    // before it reaches the camera, so picking it would have made this whole block a tautology.
    let tourId = null;
    for (const tour of TOURS) {
      const p = await trip.plan(tour.id);
      if (p && p.offerable) { tourId = tour.id; break; }
    }

    const exercise = async (label, exit) => {
      await trip.start(tourId);
      pump();
      if (trip.state.phase === 'idle') {
        problems.push(`TRIPEND  ${label}: the trip never started, so nothing below is a test`);
        return;
      }
      trip.play();
      pump(2);
      // A flight of our own, so the assertion is about the exit and not about the trip's timing.
      rig.flyTo({ distance: 4000, ms: 8000 });
      rig.update(0.1);
      if (!rig.state.flying) { problems.push(`TRIPEND  ${label}: nothing was flying to begin with`); return; }
      exit();
      pump(2);
      if (rig.state.flying) {
        problems.push(`TRIPEND  ${label} left the camera flying; it must end where it is`);
        return;
      }
      const was = rig.state.distance;
      for (let i = 0; i < 25; i += 1) rig.update(0.1);
      if (Math.abs(rig.state.distance - was) > 1e-6) {
        problems.push(
          `TRIPEND  ${label}: the camera moved ${(rig.state.distance - was).toFixed(3)} units ` +
            'in the 2.5 s after the trip ended'
        );
      }
    };

    if (!tourId) {
      problems.push('TRIPEND  no trip resolves without a network, so this proves nothing');
    } else {
      const before = problems.length;
      await exercise('trip.stop()', () => trip.stop('left'));
      // The last stop's Next runs finish(), which is the other exit and the one the end card
      // makes a promise about.
      await exercise('finish()', () => { for (let i = 0; i < 20; i += 1) { trip.next(); pump(1); } });
      if (problems.length === before) {
        notes.push('leaving a trip and finishing one both end the flight where it is');
      }
    }
    trip.dispose();
    rig.dispose();
    if (prevRaf) globalThis.requestAnimationFrame = prevRaf;
    else delete globalThis.requestAnimationFrame;
  } catch (e) {
    problems.push(`TRIPEND  could not check the trip exits: ${String(e && e.message)}`);
  }
}

// 3f. stage.js must REFUSE a vector it cannot convert, not pass it through unchanged. Passing it
// through is how a lunar landing site was drawn in Africa for months without a single warning
// anybody read.
{
  try {
    const { stage } = await import(join(JS, 'scene/stage.js'));
    stage.setWorld('earth');
    const out = stage.toStageFrame({ x: 1000, y: 0, z: 0 }, 'europa-fixed', Date.parse('2026-03-15T12:00:00Z'));
    if (out && Number.isFinite(out.x)) {
      problems.push(
        `STAGE    an unconvertible frame came back as ${JSON.stringify(out)} instead of null`
      );
    }
    const ok = stage.toStageFrame({ x: 1000, y: 0, z: 0 }, 'earth-fixed', Date.parse('2026-03-15T12:00:00Z'));
    if (!ok || !Number.isFinite(ok.x)) {
      problems.push('STAGE    a convertible frame (earth-fixed) now returns null; the refusal is too wide');
    }
  } catch (e) {
    problems.push(`STAGE    could not check the refusal: ${String(e && e.message)}`);
  }
}

// 3g. THE CARD, not just the vector. `cards.js` runs ecefToGeodetic on anything it thinks is an
// Earth frame, so a fixed propagator with an unfixed card still prints a latitude in Africa for a
// lunar site. This asserts the rows the card actually renders.
{
  try {
    const { rightNowFor, drawingLine } = await import(join(JS, 'ui/cards.js'));
    const { handKeptSites } = await import(join(JS, 'data/sample.js'));
    const sites = new Map(handKeptSites().map((r) => [r.id, r]));
    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const ctx = { clock: { now: () => tMs } };
    const rowsFor = (id) => rightNowFor(sites.get(id), ctx).map(([k, v]) => `${k}: ${v}`);

    const lunar = rowsFor('apollo-11').join(' | ');
    // 0.67 N / 23.5 E is the Moon. The same numbers on Earth are the Central African Republic,
    // and that is exactly what the card used to print.
    if (/Height above the ground/.test(lunar)) {
      problems.push(`CARD     a lunar site claims a height above THE ground: ${lunar}`);
    }
    if (/Passing over/.test(lunar)) {
      problems.push(`CARD     a lunar site claims to be passing over somewhere on Earth: ${lunar}`);
    }
    if (!/Moon/.test(lunar)) {
      problems.push(`CARD     a lunar site's card never says which world it is on: ${lunar}`);
    }
    const dish = rowsFor('dss-14').join(' | ');
    if (!/35\.4. N/.test(dish) || !/116\.9. W/.test(dish)) {
      problems.push(`CARD     Goldstone lost its Earth latitude and longitude: ${dish}`);
    }
    notes.push('the card names the world a surface site is on, and only Earth sites get an Earth lat/lon');
  } catch (e) {
    problems.push(`CARD     could not check the card rows: ${String(e && e.message)}`);
  }
}

// 3h. registry/oddities.yaml -> records -> the card. Five claims, and each of them is one this
// feature could get wrong quietly:
//
//   * THE TWO EPOCHS. record.epoch is when anybody last LOOKED, not the osculating epoch the
//     propagator integrates from. Get this wrong and the card says "elements 0 days old" about a
//     trajectory nobody has observed since March 2018 -- true of the arithmetic, a lie about the
//     knowledge. The next reader will want to "fix" it, so this is the assertion that stops them.
//   * A ROW NOBODY CAN PLACE DRAWS NOTHING. Not a dot somewhere vague: propagate() must return
//     null, because the glyph layer, heroes.js and the camera all key off that.
//   * A SURFACE ODDITY IS ON THAT SURFACE, in that world's frame, at that world's radius.
//   * THE CARD SAYS BOTH PRECISIONS. One number would have to choose between 0.4 m and 40 m.
//   * NO RECORD IS `sample`. These are hand-kept, which is provenance and not uncertainty; a
//     `sample` record draws a dashed halo meaning "not a live position", which would be false.
{
  try {
    const { sampleOddities, attachedOddityCount } = await import(join(JS, 'data/sample.js'));
    const { ODDITIES } = await import(join(JS, 'data/oddities.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { WORLD_RADIUS_KM } = await import(join(JS, 'propagate/frames.js'));
    const { rightNowFor, drawingLine } = await import(join(JS, 'ui/cards.js'));
    const { LAYERS } = await import(join(JS, 'data/layers.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const records = sampleOddities();
    const byId = new Map(records.map((r) => [r.id, r]));
    const ctx = { clock: { now: () => tMs } };

    // The mirror and the emitter agree about which rows become records. `attached` rows are
    // deliberately not records -- they are drawn on their carrier -- and the layer's count line
    // is the only thing that says so, so the arithmetic behind it is checked here.
    const attached = ODDITIES.filter((r) => r.where && r.where.kind === 'attached');
    if (attachedOddityCount() !== attached.length) {
      problems.push(`ODDITY   attachedOddityCount() says ${attachedOddityCount()} and the registry has ${attached.length}`);
    }
    if (records.length + attached.length !== ODDITIES.length) {
      problems.push(
        `ODDITY   ${ODDITIES.length} rows became ${records.length} records plus ${attached.length} ` +
          `attached; some row is neither drawn nor accounted for`
      );
    }
    for (const r of records) {
      if (r.cls === 'sample') {
        problems.push(`ODDITY   ${r.id} is classed 'sample'; these rows stand in for nothing`);
      }
      if (r.layer !== 'oddities' || r.klass !== 'oddity') {
        problems.push(`ODDITY   ${r.id} is layer ${r.layer} / klass ${r.klass}`);
      }
    }

    // The two epochs.
    const roadster = byId.get('tesla-roadster');
    if (!roadster) {
      problems.push('ODDITY   the Roadster is not among the emitted records');
    } else {
      const evidence = Date.parse('2018-03-19');
      if (roadster.epoch !== evidence) {
        problems.push(
          `ODDITY   record.epoch is ${new Date(roadster.epoch).toISOString()}; it must be the ` +
            `evidence epoch 2018-03-19, because the card prints its AGE and 374 observations ` +
            `stopped that day`
        );
      }
      if (!(roadster.elements.epochMs > evidence)) {
        problems.push('ODDITY   the osculating epoch is not later than the evidence epoch; the two-epoch rule has collapsed into one');
      }
      // The published phase reaches the propagator. Horizons gives true anomaly 209.5408787708 deg
      // at the osculating epoch; if tp_jd were dropped or misread, this lands somewhere else.
      const at = propagate(roadster, roadster.elements.epochMs);
      const rAu = at ? Math.hypot(at.x, at.y, at.z) / 149597870.7 : NaN;
      if (!(Math.abs(rAu - 1.593237) < 0.0005)) {
        problems.push(
          `ODDITY   at its own osculating epoch the Roadster is ${rAu} au from the Sun; Horizons' ` +
            `own elements put it at 1.593237 au. The published phase is not reaching the propagator`
        );
      }
      if (at && at.cls !== 'inferred') {
        problems.push(`ODDITY   the Roadster's position is classed ${at.cls}; nobody has observed it since 2018`);
      }
    }

    // A row nobody can place draws nothing at all.
    const pin = byId.get('bean-astronaut-pin');
    if (!pin) {
      problems.push('ODDITY   the unplaceable row is not a record, so search cannot find it');
    } else {
      if (propagate(pin, tMs) !== null) {
        problems.push('ODDITY   an object nobody can place has a position. A dot on this map is a claim');
      }
      const rows = rightNowFor(pin, ctx).map(([k, v]) => `${k}: ${v}`).join(' | ');
      if (/Could not work this out/.test(rows)) {
        problems.push(`ODDITY   the card says the arithmetic failed for something never known: ${rows}`);
      }
      if (!/Nobody knows/.test(rows)) {
        problems.push(`ODDITY   the card does not say nobody knows where it is: ${rows}`);
      }
      if (/Height above the ground/.test(rows)) {
        problems.push(`ODDITY   a card with no position still offers a height row: ${rows}`);
      }
    }

    // A surface oddity is on that surface, in that world's frame.
    for (const id of ['shepard-golf-balls', 'duke-family-photo', 'beresheet-lunar-library']) {
      const rec = byId.get(id);
      const p = rec ? propagate(rec, tMs) : null;
      if (!p) { problems.push(`ODDITY   ${id} has no position`); continue; }
      if (p.frame !== 'moon-fixed') {
        problems.push(`ODDITY   ${id} answers in ${p.frame}, not moon-fixed`);
      }
      const km = Math.hypot(p.x, p.y, p.z);
      if (Math.abs(km - WORLD_RADIUS_KM.moon) > 0.5) {
        problems.push(`ODDITY   ${id} is ${km.toFixed(1)} km from the centre of the Moon, not ${WORLD_RADIUS_KM.moon}`);
      }
      const rows = rightNowFor(rec, ctx).map(([k, v]) => `${k}: ${v}`).join(' | ');
      if (!/Moon/.test(rows) || /Height above the ground/.test(rows)) {
        problems.push(`ODDITY   ${id}'s card does not read as a place on the Moon: ${rows}`);
      }
    }

    // THE GEOMETRY, MEASURED. registry/oddities.yaml names a builder per row and
    // scene/models.js ODDITY_BUILDERS has one -- two files that were related by discipline
    // alone until this block. Everything below is measured rather than asserted: every shape is
    // built, its triangles counted against BOTH budgets it has to satisfy, and the two sets of
    // names compared in both directions, because a builder nobody names is as much a defect as
    // a name nobody builds.
    const layer = LAYERS.find((l) => l.id === 'oddities');
    if (!layer) {
      problems.push('ODDITY   data/layers.js has no oddities layer, so registry/layers.yaml has drifted again');
    } else {
      if (layer.noModel) {
        problems.push('ODDITY   the oddities layer still declares `noModel`, so the builders are never reached');
      }
      if (!(layer.nearKm > 0)) {
        problems.push(`ODDITY   the oddities layer's nearKm is ${layer.nearKm}; no unselected oddity would ever be drawn`);
      }
      // The checkbox shows ONE number, like every other layer's does. It used to break the
      // total into "on the map / riding on something else / nobody can place", which was
      // accurate and was also the only row in the panel that did not read like the others.
      //
      // The three states still have to add up -- that is a fact about the data, not about the
      // label -- so the invariant is asserted here directly instead of through the removed
      // counts() function. An oddity is drawn when it has a propagator; the one nobody can
      // place has none, by construction, and the attached rows are not records at all.
      const drawn = records.filter((r) => r && r.propagator).length;
      const unplaceable = records.length - drawn;
      if (unplaceable < 1) {
        problems.push(
          'ODDITY   every oddity has a propagator, so the "nobody can place" case is untested. ' +
            'That case is the point of the honesty design; a layer without it has drifted.'
        );
      }
      if (typeof layer.counts === 'function') {
        problems.push('ODDITY   the oddities layer declares counts() again; the checkbox shows one number');
      }
      notes.push(
        `oddities: ${records.length} in the layer (${drawn} drawn, ${unplaceable} nobody can ` +
          `place), plus ${attached.length} riding on something the app already draws`
      );
    }

    const { modelFor, modelVariants, disposeModels } = await import(join(JS, 'scene/models.js'));
    const builders = modelVariants().oddity || [];
    const yaml = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
    const layerCapLine = yaml.split('\n').find((l) => l.includes('id: oddity-generic')) || '';
    const layerCap = Number((layerCapLine.match(/budget_tris:\s*(\d+)/) || [])[1] || 0);
    if (!layerCap) {
      problems.push('ODDITY   registry/models.yaml has no budget_tris for oddity-generic');
    }
    const named = new Set(ODDITIES.map((r) => (r.shape || {}).build).filter(Boolean));
    for (const build of named) {
      if (!builders.includes(build)) {
        problems.push(`ODDITY   registry/oddities.yaml names shape.build \`${build}\` and scene/models.js has no builder for it`);
      }
    }
    // The other direction: a builder nobody names is geometry nobody sees, and the two lists
    // drifting apart is exactly how registry/models.yaml and BUILDERS drifted before.
    for (const build of builders) {
      if (build === 'default' || build === 'generic') continue;
      if (!named.has(build)) {
        problems.push(`ODDITY   scene/models.js builds \`${build}\` and no registry/oddities.yaml row names it`);
      }
    }

    let worstOddity = { id: null, frac: 0, tris: 0, budget: 0 };
    for (const row of ODDITIES) {
      const build = (row.shape || {}).build;
      const budget = (row.shape || {}).budget_tris;
      if (!build || !builders.includes(build)) continue;
      const obj = modelFor('oddity', build);
      let tris = 0;
      let meshes = 0;
      obj.traverse((n) => {
        if (!n.geometry) return;
        meshes += 1;
        const g = n.geometry;
        tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
      });
      if (tris > budget) {
        problems.push(`ODDITY   ${row.id} draws ${build} at ${Math.round(tris)} tris, over its row's budget_tris ${budget}`);
      }
      if (layerCap && tris > layerCap) {
        problems.push(`ODDITY   ${row.id} draws ${build} at ${Math.round(tris)} tris, over the layer cap ${layerCap}`);
      }
      if (meshes > 40) {
        problems.push(`ODDITY   ${row.id} draws ${build} as ${meshes} meshes; the hero pool budget is ~30`);
      }
      // A builder that answered with nothing would pass every budget above.
      if (tris < 4) {
        problems.push(`ODDITY   ${row.id} draws ${build} as ${Math.round(tris)} triangles, which is not a shape`);
      }
      // modelFor() flags a fallback. A named build must never be one, or the card would name a
      // shape while a comms satellite was on the screen.
      if (obj.userData.generic) {
        problems.push(`ODDITY   modelFor('oddity', '${build}') fell back to a generic model`);
      }
      if (budget && tris / budget > worstOddity.frac) {
        worstOddity = { id: row.id, frac: tris / budget, tris, budget };
      }
      disposeModels(obj);
    }
    notes.push(
      `${builders.length - 1} oddity shapes build; tightest is ${worstOddity.id} at ` +
        `${Math.round(worstOddity.tris)} of ${worstOddity.budget} tris`
    );

    // The wiring, end to end: the record heroes.js will hand to modelFor() must name a builder,
    // and the record nobody can place must name none -- there is no geometry for a row that has
    // no position, and `meta.modelVariant` is what heroes.js reads.
    for (const r of records) {
      const v = r.meta && r.meta.modelVariant;
      if (r.meta && r.meta.unplaceable) {
        if (v) problems.push(`ODDITY   ${r.id} cannot be placed and still asks for the \`${v}\` model`);
        continue;
      }
      if (!v || !builders.includes(v)) {
        problems.push(`ODDITY   ${r.id} asks heroes.js for modelVariant ${JSON.stringify(v)}, which is not a builder`);
      }
      // Which way the shape points. A thing on a surface stands on it -- that one is measured
      // and the emitter, not the row, decides it; anything else takes the row's own choice, and
      // absent means scene/models.js's seeded constant, which is what an unaimable object gets.
      const row = ODDITIES.find((o) => o.id === r.id) || {};
      const grounded = ['on_surface', 'came_home'].includes((row.where || {}).kind);
      const want = grounded ? 'up' : (row.shape || {}).attitude || null;
      if ((r.meta.attitude || null) !== want) {
        problems.push(`ODDITY   ${r.id} is drawn with attitude ${JSON.stringify(r.meta.attitude || null)}; the registry says ${JSON.stringify(want)}`);
      }
    }

    // THE CARD'S CLAIM ABOUT ITS OWN DRAWING. The three original strings say "rocket" out loud;
    // an oddity must take the class-neutral triple, and a row that told the registry its drawing
    // departs from the object must print that departure rather than stopping at "drawn as".
    for (const r of records) {
      const line = drawingLine(r);
      if (r.meta && r.meta.unplaceable) {
        if (line !== null) {
          problems.push(`ODDITY   nothing is drawn for ${r.id} and its card still says "${line}"`);
        }
        continue;
      }
      if (!line) {
        problems.push(`ODDITY   ${r.id} is drawn as a ${r.meta.modelVariant} and the card says nothing about it`);
        continue;
      }
      if (/rocket/i.test(line)) {
        problems.push(`ODDITY   ${r.id}'s drawing line calls it a rocket: ${line}`);
      }
      if (!line.includes(r.meta.drawnName)) {
        problems.push(`ODDITY   ${r.id}'s drawing line does not name the shape drawn: ${line}`);
      }
      const row = ODDITIES.find((o) => o.id === r.id);
      const departure = (row.shape || {}).departure;
      if (departure && !line.includes(departure)) {
        problems.push(`ODDITY   ${r.id} tells the registry how its drawing differs and the card does not print it: ${line}`);
      }
    }
  } catch (e) {
    problems.push(`ODDITY   could not check the oddities layer: ${String(e && e.message)}`);
  }
}

// 3i. the two rows that are not objects in space, but parts of objects in space.
//
// The Voyager Golden Record and Juno's three LEGO figures are `where.kind: attached`. That word
// is a claim with four consequences, and each one below is a way this feature fails QUIETLY --
// with the card still confidently printing a position -- rather than loudly.
//
//   * THE CARRIER IS REAL. `attachable:` in the registry is the checked-in evidence of what
//     data/sample.js emits, and CI cannot run a browser. This checks it against the emitter.
//   * THERE IS NO SECOND DOT. An attached row must not become a record: two dots at one point
//     are ambiguous to tap, and main.js takes the first hit in layer order.
//   * THE POSITION IS THE CARRIER'S, VERBATIM. Not close to it -- the same vector, the same
//     frame, the same class, at the same instant. If it drifted by a kilometre the card would be
//     making a claim about a place nobody has measured.
//   * THERE IS NO SECOND SPACECRAFT. scene/realmodels.js matches a NASA glTF on meta.horizonsId,
//     so a derived record carrying the carrier's id would draw a second Voyager beside the first.
{
  try {
    const { sampleOddities, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
    const { ATTACHED_ODDITIES, attachedOdditiesFor, attachedOddityRecord, attachedOddityCount } =
      await import(join(JS, 'data/attached.js'));
    const { ODDITIES: ROWS } = await import(join(JS, 'data/oddities.js'));
    const { propagate } = await import(join(JS, 'propagate/index.js'));
    const { realModelFor } = await import(join(JS, 'scene/realmodels.js'));
    const { modelFor, attachOddityModels, disposeModels } = await import(join(JS, 'scene/models.js'));
    const { drawingLine, rightNowFor } = await import(join(JS, 'ui/cards.js'));
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));

    const tMs = Date.parse('2026-03-15T12:00:00.000Z');
    const ctx = { clock: { now: () => tMs } };
    const deep = new Map(sampleDeepSpace().map((r) => [r.id, r]));
    const oddityIds = new Set(sampleOddities().map((r) => r.id));

    if (!ATTACHED_ODDITIES.length) {
      problems.push('ATTACH   no attached rows at all, so everything below is a tautology');
    }
    if (attachedOddityCount() !== ATTACHED_ODDITIES.length) {
      problems.push('ATTACH   the layer count line and the attached list disagree');
    }

    let attachedChildren = 0;
    for (const entry of ATTACHED_ODDITIES) {
      // No dot. This is the whole reason the kind exists.
      if (oddityIds.has(entry.id)) {
        problems.push(`ATTACH   ${entry.id} is emitted as a record, so it has a dot of its own`);
      }
      if (!entry.carriers.length) {
        problems.push(`ATTACH   ${entry.id} names no carrier, so nothing would ever draw it`);
      }
      for (const carrierId of entry.carriers) {
        const carrier = deep.get(carrierId);
        if (!carrier) {
          problems.push(`ATTACH   ${entry.id} rides on \`${carrierId}\`, which data/sample.js does not emit`);
          continue;
        }
        if (!attachedOdditiesFor(carrierId).some((a) => a.id === entry.id)) {
          problems.push(`ATTACH   ${carrierId} carries ${entry.id} and does not answer for it`);
        }

        // THE POSITION IS THE CARRIER'S. Same vector, same frame, same class.
        const derived = attachedOddityRecord(entry, carrier);
        const a = propagate(derived, tMs);
        const b = propagate(carrier, tMs);
        if (!a || !b) {
          problems.push(`ATTACH   ${entry.id} on ${carrierId} has no position at ${new Date(tMs).toISOString()}`);
        } else {
          const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
          if (d !== 0 || a.frame !== b.frame || a.cls !== b.cls) {
            problems.push(
              `ATTACH   ${entry.id} is drawn ${d} km from ${carrierId} in ${a.frame}/${a.cls} against ` +
                `${b.frame}/${b.cls}; an attached row inherits its carrier's position, it does not approximate it`
            );
          }
        }
        // ... and the card says the same numbers, which is the claim a visitor actually reads.
        const same = JSON.stringify(rightNowFor(derived, ctx)) === JSON.stringify(rightNowFor(carrier, ctx));
        if (!same) {
          problems.push(`ATTACH   ${entry.id}'s card gives different numbers from ${carrierId}'s`);
        }
        // No second spacecraft: the carrier's identifiers are not copied.
        if (derived.meta.horizonsId != null) {
          problems.push(`ATTACH   ${entry.id} carries a horizons id, so scene/realmodels.js would draw a second ${carrierId}`);
        }
        if (realModelFor(derived)) {
          problems.push(`ATTACH   ${entry.id} matches a real spacecraft model, which would draw a second ${carrierId}`);
        }
        if (derived.cls !== carrier.cls) {
          problems.push(`ATTACH   ${entry.id} is classed ${derived.cls} and ${carrierId} is ${carrier.cls}`);
        }

        // THE CARD ADMITS THE MOUNT. Where we hang it and how big we draw it are both ours.
        const line = drawingLine(derived);
        if (!line || !line.includes('our own arrangement')) {
          problems.push(`ATTACH   ${entry.id}'s card does not say the mount is our arrangement: ${line}`);
        }

        // THE DRAWING. A child of the carrier's model, at the registry's offset and size, and
        // INSIDE the carrier's own unit box -- a mount that missed would hang the Golden Record
        // in space beside Voyager, which looks exactly like a rendering bug and is one.
        const parent = modelFor('probe');
        const made = attachOddityModels(parent, carrierId);
        const child = made.find((c) => c.userData.attachedOddity === entry.id);
        if (!child) {
          problems.push(`ATTACH   nothing was hung on ${carrierId}'s model for ${entry.id}`);
        } else {
          attachedChildren += 1;
          if (child.parent !== parent) {
            problems.push(`ATTACH   ${entry.id} is not a child of ${carrierId}'s model`);
          }
          // Against the REGISTRY ROW, not against `entry.mount`. Comparing the drawing to the
          // list it was built from is a comparison of a value with itself: it passed while
          // data/attached.js was mutated to ignore the registry and draw everything at 0.9.
          const want = ((ROWS.find((r) => r.id === entry.id) || {}).where || {}).mount || {};
          if (child.position.x !== want.x || child.position.y !== want.y || child.position.z !== want.z) {
            problems.push(`ATTACH   ${entry.id} is drawn at ${child.position.toArray()} and the registry says ${[want.x, want.y, want.z]}`);
          }
          if (child.scale.x !== want.scale) {
            problems.push(`ATTACH   ${entry.id} is drawn at scale ${child.scale.x} and the registry says ${want.scale}`);
          }
          const sphere = new THREE.Box3().setFromObject(child).getBoundingSphere(new THREE.Sphere());
          if (!(sphere.center.length() + sphere.radius <= 1)) {
            problems.push(
              `ATTACH   ${entry.id} reaches ${(sphere.center.length() + sphere.radius).toFixed(2)} units from ` +
                `${carrierId}'s centre; every model here is a unit box, so this hangs it in space beside the spacecraft`
            );
          }
        }
        disposeModels(parent);
      }
    }
    if (attachedChildren < 3) {
      problems.push(`ATTACH   only ${attachedChildren} attached model(s) were drawn; two Voyagers and Juno carry three`);
    }

    // And the ordinary case: everything else in the app carries nothing and pays nothing.
    const plain = modelFor('probe');
    if (attachOddityModels(plain, 'deep-parker').length || plain.children.length !== modelFor('probe').children.length) {
      problems.push('ATTACH   a spacecraft that carries nothing was given children anyway');
    }

    notes.push(`${ATTACHED_ODDITIES.length} attached row(s) drawn as ${attachedChildren} children of their carriers`);
  } catch (e) {
    problems.push(`ATTACH   could not check the attached oddities: ${String(e && e.stack || e)}`);
  }
}

// 3j. the camera contract a guided trip needs. Six additions and one live bug, and every one of
// them is a promise about a CALLBACK or about the shape of a move -- which is to say, exactly the
// class of thing that looks right in the source and is wrong in the browser.
//
// The three that matter most, and why each is here rather than in a comment:
//
//   * A FLIGHT ENDS EXACTLY ONCE AND SAYS HOW. flyTo used to drop a superseded flight's onArrive,
//     and a pointer drag used to drop the live one's, both silently. Anything driven by arrivals
//     therefore hangs forever the first time somebody touches the canvas -- and there is no input
//     lockout to stop them touching it.
//   * ms: 0 MEANS INSTANT. It did not: `opts.ms > 0` sent zero to the 750 ms default, and
//     main.js:80 has been asking for an instant set at boot and silently getting a flight.
//   * A COMPLETION CALLBACK NEVER RUNS INSIDE ANOTHER ONE. Under prefers-reduced-motion a flight
//     arrives synchronously, so the obvious `onArrive: () => flyTo(next)` is a recursive chain
//     that runs a whole itinerary in one tick and overflows the stack if it loops. It fails only
//     for the people the flag protects, which is why it needs a test and not a warning.
{
  const failed = (msg) => problems.push(`CAMERA   ${msg}`);
  const near = (got, want, tol, what) => {
    if (!Number.isFinite(got) || Math.abs(got - want) > tol) {
      failed(`${what}: expected ${want} +/- ${tol}, got ${got}`);
      return false;
    }
    return true;
  };
  /** A canvas that records its listeners, so a synthetic drag can reach the rig. */
  const stubElement = () => {
    const on = new Map();
    return {
      style: {},
      clientWidth: 800,
      clientHeight: 600,
      addEventListener(kind, fn) {
        if (!on.has(kind)) on.set(kind, []);
        on.get(kind).push(fn);
      },
      removeEventListener() {},
      dispatchEvent() { return true; },
      setPointerCapture() {},
      releasePointerCapture() {},
      fire(kind, event) { for (const fn of on.get(kind) || []) fn(event); },
    };
  };

  try {
    const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
    const { createCameraRig, CAMERA_EASES } = await import(join(JS, 'scene/camera.js'));
    const DEG = Math.PI / 180;
    const rigOf = (dom = null) => {
      const camera = new THREE.PerspectiveCamera(50, 1.5, 0.1, 1e9);
      camera.position.set(0, 0, 10);
      // worldRadius 0: no clearance sphere, so every distance below is the one that was asked for.
      return createCameraRig(camera, dom, { worldRadius: 0 });
    };
    // Every step is 0.1 s because update() clamps a single step to 0.25 s.
    const run = (rig, seconds) => { for (let i = 0; i < Math.round(seconds / 0.1); i += 1) rig.update(0.1); };

    // --- the named curves ------------------------------------------------------------------
    for (const [name, fn] of Object.entries(CAMERA_EASES)) {
      if (fn(0) !== 0 || Math.abs(fn(1) - 1) > 1e-9) failed(`ease '${name}' does not run 0 -> 1`);
      let last = -1;
      for (let i = 0; i <= 20; i += 1) {
        const v = fn(i / 20);
        if (v < last - 1e-9) { failed(`ease '${name}' is not monotonic at ${i / 20}`); break; }
        last = v;
      }
    }
    near(CAMERA_EASES.linear(0.5), 0.5, 1e-9, "ease 'linear' is linear");
    // Trapezoidal 15/70/15: by the end of the acceleration ramp it has covered v*a/2 of the move.
    near(CAMERA_EASES.cruise(0.15), 0.0882, 0.001, "ease 'cruise' covers 8.8% during its ramp-in");
    if (!(CAMERA_EASES.cruise(0.15) > CAMERA_EASES.inout(0.15))) {
      failed("ease 'cruise' is not moving sooner than 'inout'; that is the whole reason it exists");
    }

    // --- the default flight is unchanged --------------------------------------------------
    {
      const rig = rigOf();
      let reasons = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => reasons.push(r) });
      if (!rig.state.flying) failed('a normal flyTo did not start a flight');
      run(rig, 0.4);
      if (!(rig.state.distance > 10 && rig.state.distance < 40)) {
        failed(`half way through an 800 ms flight the distance is ${rig.state.distance}`);
      }
      if (reasons.length) failed(`onArrive fired ${reasons[0]} half way through the flight`);
      run(rig, 0.5);
      if (rig.state.flying) failed('an 800 ms flight was still flying after 900 ms');
      if (reasons.join() !== 'done') failed(`arrival reported [${reasons}], expected [done]`);
      near(rig.state.distance, 40, 1e-6, 'a completed flight is at the distance it was given');
    }

    // --- ms: 0 is instant, and it is the bug at main.js:80 --------------------------------
    {
      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 22, ms: 0, onArrive: (r) => seen.push(r) });
      if (rig.state.flying) failed('ms: 0 started a flight; it means instant');
      near(rig.state.distance, 22, 1e-9, 'ms: 0 sets the distance before it returns');
      if (seen.join() !== 'done') failed(`ms: 0 reported [${seen}] before returning, expected [done]`);
      run(rig, 1.0);
      if (seen.length !== 1) failed(`ms: 0 fired its arrival ${seen.length} times`);
    }

    // --- a superseded flight is told, never dropped ---------------------------------------
    {
      const rig = rigOf();
      const first = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => first.push(r) });
      run(rig, 0.2);
      rig.flyTo({ distance: 60, ms: 800 });
      if (first.join() !== 'replaced') failed(`a superseded flight reported [${first}], expected [replaced]`);

      const rig2 = rigOf();
      const arrive = [];
      const cancel = [];
      rig2.flyTo({ distance: 40, ms: 800, onArrive: (r) => arrive.push(r), onCancel: (r) => cancel.push(r) });
      run(rig2, 0.2);
      rig2.flyTo({ distance: 60, ms: 800 });
      if (cancel.join() !== 'replaced') failed(`onCancel got [${cancel}], expected [replaced]`);
      if (arrive.length) failed(`onArrive also fired [${arrive}] for a cancelled flight; exactly one callback runs`);
    }

    // --- a drag cancels the flight AND says so --------------------------------------------
    // The bug this replaces is the one that hangs a tour permanently the first time a user
    // touches the canvas, with no lockout to stop them.
    {
      const dom = stubElement();
      const rig = rigOf(dom);
      const seen = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => seen.push(r) });
      run(rig, 0.2);
      dom.fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
      dom.fire('pointermove', { pointerId: 1, clientX: 140, clientY: 120, buttons: 1 });
      if (rig.state.flying) failed('a drag did not end the flight');
      if (seen.join() !== 'cancelled') failed(`a drag reported [${seen}], expected [cancelled]`);
      run(rig, 1.0);
      if (seen.length !== 1) failed(`a cancelled flight reported ${seen.length} times`);
    }

    // --- finishFlight(): a seek, not a fifth half-finished sweep ---------------------------
    {
      const want = rigOf();
      want.flyTo({ distance: 40, azimuth: 1.1, polar: 1.3, ms: 800 });
      run(want, 1.0);

      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 40, azimuth: 1.1, polar: 1.3, ms: 800, onArrive: (r) => seen.push(r) });
      run(rig, 0.3);
      if (rig.finishFlight() !== true) failed('finishFlight() during a flight returned false');
      if (rig.state.flying) failed('finishFlight() left the rig flying');
      if (seen.join() !== 'skipped') failed(`finishFlight() reported [${seen}], expected [skipped]`);
      near(rig.state.distance, want.state.distance, 1e-6, 'finishFlight() lands at the flight distance');
      near(rig.state.azimuth, want.state.azimuth, 1e-6, 'finishFlight() lands at the flight azimuth');
      near(rig.state.target.distanceTo(want.state.target), 0, 1e-6, 'finishFlight() lands at the flight look-at');
      if (rig.finishFlight() !== false) failed('finishFlight() with no flight returned true');
      if (seen.length !== 1) failed(`finishFlight() reported ${seen.length} times`);
    }

    // --- opts.targetDelay ------------------------------------------------------------------
    // The lag is not a bug to remove -- it is what keeps the world you are leaving in shot -- but
    // at close framing the subject walks off screen and back, so it has to be a parameter.
    {
      const held = rigOf();
      held.flyTo({ targetScene: { x: 100, y: 0, z: 0 }, distance: 10, ms: 1000 });
      run(held, 0.3); // inside the default 0.34 delay
      near(held.state.target.length(), 0, 1e-9, 'the default targetDelay holds the look-at for the first third');

      const eager = rigOf();
      eager.flyTo({ targetScene: { x: 100, y: 0, z: 0 }, distance: 10, ms: 1000, targetDelay: 0 });
      run(eager, 0.3);
      if (!(eager.state.target.length() > 1)) {
        failed(`targetDelay: 0 still froze the look-at (${eager.state.target.length()})`);
      }
    }

    // --- opts.ease -------------------------------------------------------------------------
    {
      const lin = rigOf();
      lin.flyTo({ distance: 1000, ms: 1000, ease: 'linear' });
      run(lin, 0.5);
      // Distance is interpolated in LOG space, so half way is the geometric mean, not the mean.
      near(lin.state.distance, Math.sqrt(10 * 1000), 0.5, "ease 'linear' is linear in log distance");
      const ui = rigOf();
      ui.flyTo({ distance: 1000, ms: 1000 });
      run(ui, 0.5);
      if (Math.abs(ui.state.distance - lin.state.distance) < 1) {
        failed('the default ease and linear agree half way through; opts.ease is not reaching the flight');
      }
    }

    // --- opts.apex -------------------------------------------------------------------------
    // Two stops far apart laterally otherwise sweep across at close range. This is the pull-back.
    {
      const rig = rigOf();
      rig.flyTo({
        targetScene: { x: 500, y: 0, z: 0 },
        distance: 10,
        ms: 1000,
        ease: 'linear',
        apex: { distance: 1000, at: 0.5 },
      });
      run(rig, 0.5);
      near(rig.state.distance, 1000, 1, 'the apex distance is reached at its own fraction');
      run(rig, 0.5);
      near(rig.state.distance, 10, 1e-6, 'a flight with an apex still arrives at its own distance');

      const flat = rigOf();
      flat.flyTo({ targetScene: { x: 500, y: 0, z: 0 }, distance: 10, ms: 1000, ease: 'linear' });
      run(flat, 0.5);
      if (flat.state.distance > 11) failed('a flight with no apex pulled back anyway');
    }

    // --- orbit(): the constant turn flyTo cannot do -----------------------------------------
    {
      const rig = rigOf();
      const az0 = rig.state.azimuth;
      const seen = [];
      if (rig.orbit({ deg: 540, degPerSec: 90, onDone: (r) => seen.push(r) }) !== true) {
        failed('orbit() refused a plain drift');
      }
      if (!rig.state.orbiting) failed('orbit() did not set state.orbiting');
      run(rig, 1.0);
      near((rig.state.azimuth - az0) / DEG, 90, 0.5, 'orbit() turns at the rate it was given');
      run(rig, 5.1);
      // Unwrapped: a flight runs its azimuth through shortestAngle and can never turn more than
      // half a circle, which is why chaining flights was never going to be the orbit.
      near((rig.state.azimuth - az0) / DEG, 540, 0.01, 'orbit() turns a signed, unwrapped 540 degrees');
      if (seen.join() !== 'done') failed(`orbit() reported [${seen}], expected [done]`);
      if (rig.state.orbiting) failed('orbit() left state.orbiting set after it finished');

      const back = rigOf();
      const bz = back.state.azimuth;
      back.orbit({ deg: -34, degPerSec: 6 });
      run(back, 6.0);
      near((back.state.azimuth - bz) / DEG, -34, 0.01, 'orbit() takes a signed delta');

      // And the half-circle limit it exists to route around, measured rather than asserted.
      const flight = rigOf();
      const fz = flight.state.azimuth;
      flight.flyTo({ azimuth: fz + 3 * Math.PI, polar: flight.state.polar, ms: 200 });
      run(flight, 0.4);
      if (Math.abs(flight.state.azimuth - fz) > Math.PI + 1e-6) {
        failed('flyTo turned more than half a circle; shortestAngle is gone and orbit()’s reason with it');
      }
    }

    // --- orbit() never fights a flight, and never calls back synchronously ------------------
    {
      const rig = rigOf();
      rig.flyTo({ distance: 40, ms: 800 });
      const seen = [];
      if (rig.orbit({ deg: 34, onDone: (r) => seen.push(r) }) !== false) {
        failed('orbit() started while a flight was running');
      }
      if (seen.length) failed(`orbit() called back synchronously: [${seen}]`);
      rig.update(0.1);
      if (seen.join() !== 'refused') failed(`a refused orbit reported [${seen}] on the next frame`);

      const rig2 = rigOf();
      const done2 = [];
      rig2.orbit({ deg: 0, onDone: (r) => done2.push(r) });
      if (done2.length) failed('orbit({deg: 0}) called back before it returned');
      rig2.update(0.1);
      if (done2.join() !== 'done') failed(`orbit({deg: 0}) reported [${done2}]`);

      const rig3 = rigOf();
      const done3 = [];
      rig3.orbit({ deg: 34, degPerSec: 6, onDone: (r) => done3.push(r) });
      rig3.update(0.1);
      rig3.flyTo({ distance: 40, ms: 800 });
      if (rig3.state.orbiting) failed('a flight did not stop the drift');
      rig3.update(0.1);
      if (done3.join() !== 'replaced') failed(`a drift ended by a flight reported [${done3}]`);

      const dom = stubElement();
      const rig4 = rigOf(dom);
      const done4 = [];
      rig4.orbit({ deg: 34, degPerSec: 6, onDone: (r) => done4.push(r) });
      rig4.update(0.1);
      dom.fire('pointerdown', { pointerId: 1, clientX: 10, clientY: 10 });
      dom.fire('pointermove', { pointerId: 1, clientX: 30, clientY: 10, buttons: 1 });
      rig4.update(0.1);
      if (done4.join() !== 'cancelled') failed(`a drift a user interrupted reported [${done4}]`);
    }

    // --- prefers-reduced-motion: the cut, and the recursion that is not possible -------------
    const hadMatchMedia = Object.prototype.hasOwnProperty.call(globalThis, 'matchMedia');
    const savedMatchMedia = globalThis.matchMedia;
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      const rig = rigOf();
      const fades = [];
      rig.onFade((ms) => fades.push(ms));
      let sync = false;
      rig.flyTo({ distance: 40, ms: 800, onArrive: () => { sync = true; } });
      if (rig.state.flying) failed('reduced motion started a flight instead of cutting');
      near(rig.state.distance, 40, 1e-9, 'a reduced-motion flight sets the distance');
      if (!sync) failed('reduced motion did not arrive before flyTo returned; the trap has moved, and every caller was written for it');
      if (fades.join() !== '220') failed(`reduced motion emitted fades [${fades}], expected [220]`);

      // THE ONE THAT MATTERS. The naive itinerary -- advance from inside onArrive -- against the
      // synchronous arrival above. If a completion callback could run inside another, this is a
      // recursive chain: no frame drawn, and a stack overflow the moment a trip loops. Here it
      // must advance at most one stop per update() and never re-enter itself.
      const chain = rigOf();
      const STOPS = 200;
      let depth = 0;
      let maxDepth = 0;
      let arrived = 0;
      const step = () => {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
        arrived += 1;
        if (arrived < STOPS) chain.flyTo({ distance: 10 + arrived, ms: 800, onArrive: step });
        depth -= 1;
      };
      chain.flyTo({ distance: 10, ms: 800, onArrive: step });
      for (let i = 0; i < STOPS + 20 && arrived < STOPS; i += 1) chain.update(0.016);
      if (maxDepth !== 1) failed(`a chained itinerary re-entered its own callback ${maxDepth} deep under reduced motion`);
      if (arrived !== STOPS) failed(`a chained itinerary reached ${arrived} of ${STOPS} stops`);

      // A cut is not a fast move: the drift does not run at all, and it says which happened.
      const still = rigOf();
      const az0 = still.state.azimuth;
      const seen = [];
      if (still.orbit({ deg: 34, onDone: (r) => seen.push(r) }) !== false) {
        failed('orbit() drifted under reduced motion');
      }
      if (seen.length) failed(`a drift refused for reduced motion called back before returning: [${seen}]`);
      still.update(0.5);
      near(still.state.azimuth, az0, 1e-9, 'reduced motion leaves the camera still');
      if (seen.join() !== 'reduced-motion') failed(`a refused drift reported [${seen}]`);
      notes.push(
        `camera: reduced motion cuts and fades 220 ms; ${STOPS} chained stops ran at callback ` +
          `depth ${maxDepth}`
      );
    } finally {
      if (hadMatchMedia) globalThis.matchMedia = savedMatchMedia;
      else delete globalThis.matchMedia;
    }

    // --- disposing a rig does not leave a caller waiting ------------------------------------
    {
      const rig = rigOf();
      const seen = [];
      rig.flyTo({ distance: 40, ms: 800, onArrive: (r) => seen.push(r) });
      rig.dispose();
      if (seen.join() !== 'cancelled') failed(`dispose() reported [${seen}], expected [cancelled]`);
    }
  } catch (e) {
    failed(`could not check the camera contract: ${String(e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)}`);
  }
}

// --- every stop in registry/tours.yaml names something that exists ------------------------
//
// THE VALIDATOR CANNOT ANSWER THIS AND THIS CAN. scripts/check_registry.py knows what is in the
// registries; it does not know what site/js/data/sample.js actually EMITS, and a stop is resolved
// in the browser through ctx.recordById(). A trip stop naming `deep-voyager-1` is right or wrong
// depending on a hand-written emitter in another file, and the failure is silent: the stop is
// dropped and the count is printed afterwards, so a six-stop trip quietly becomes a five-stop one
// and nothing anywhere says which stop went or why.
//
// Also checked: the `ease:` a registry row asks for is one the camera rig actually has. That is
// two registries and one module having to agree about a name, which is the failure this whole
// harness was written for.
{
  try {
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    const { sampleOddities, sampleDeepSpace, handKeptSites } = await import(join(JS, 'data/sample.js'));
    const { LAYERS } = await import(join(JS, 'data/layers.js'));
    const { WORLDS } = await import(join(JS, 'scene/worlds.js'));
    const { CAMERA_EASES } = await import(join(JS, 'scene/camera.js'));

    const bundled = new Set([
      ...sampleOddities().map((r) => r.id),
      ...sampleDeepSpace().map((r) => r.id),
      ...handKeptSites().map((r) => r.id),
    ]);
    const layerIds = new Set(LAYERS.map((l) => l.id));
    const worldIds = new Set(WORLDS.map((w) => w.id));
    const eases = new Set([...Object.keys(CAMERA_EASES), 'auto']);

    let stops = 0;
    let resolvable = 0;
    for (const tour of TOURS) {
      // Two registries, one word, two meanings: the layer is `oddities` and the trip that visits
      // it is `strangest-things`. check_registry.py refuses the collision; this is the browser's
      // half of the same claim, because LAYERS is the list the app actually reads.
      if (layerIds.has(tour.id)) {
        problems.push(`TOUR     trip '${tour.id}' has the same id as a layer the app loads`);
      }
      for (const stop of tour.stops) {
        stops += 1;
        if (!eases.has(stop.ease)) {
          problems.push(`TOUR     ${tour.id}/${stop.id}: ease '${stop.ease}' is not one the rig has`);
        }
        if (!(stop.dwell_ms >= 8000)) {
          problems.push(`TOUR     ${tour.id}/${stop.id}: dwell ${stop.dwell_ms} ms is under the 8 s floor`);
        }
        const target = stop.target || {};
        if (target.world !== undefined) {
          if (worldIds.has(target.world)) resolvable += 1;
          else problems.push(`TOUR     ${tour.id}/${stop.id}: world '${target.world}' is not in WORLDS`);
        } else if (target.layer !== undefined) {
          // A live-feed member: which record it picks depends on a network the runner does not
          // have, so the checkable half is that the LAYER exists and is one the app loads.
          if (layerIds.has(target.layer)) resolvable += 1;
          else problems.push(`TOUR     ${tour.id}/${stop.id}: layer '${target.layer}' is not in LAYERS`);
        } else {
          const id = target.record ?? target.site;
          if (bundled.has(id)) resolvable += 1;
          else {
            problems.push(
              `TOUR     ${tour.id}/${stop.id}: '${id}' is not emitted by data/sample.js, so ` +
                `recordById() returns null and this stop is silently dropped`
            );
          }
        }
      }
    }
    notes.push(`tours: ${TOURS.length} trips, ${stops} stops, ${resolvable} resolvable without a network`);
  } catch (e) {
    problems.push(`TOUR     could not check registry/tours.yaml against the app: ${String(e)}`);
  }
}

// --- the length a trip promises is the length two files computed ---------------------------
//
// The intro card and the panel row both say "5 stops, about two minutes". That sentence is built
// from `estimate_ms`, which scripts/gen_tours_js.py writes into the mirror -- and from the same
// arithmetic done again in site/js/ui/trip.js over the stops that actually RESOLVED, because the
// trip on offer is not always the trip the file describes.
//
// Two files computing one promise is exactly the kind of agreement that rots silently: change the
// per-flight allowance in one and the number a visitor is shown quietly stops being the number
// anybody computed. Nothing in the browser would notice, which is why this is here.
{
  try {
    const gen = readFileSync(join(ROOT, 'scripts/gen_tours_js.py'), 'utf8');
    const trip = readFileSync(join(JS, 'ui/trip.js'), 'utf8');
    const num = (src, name, re) => {
      const m = src.match(re);
      if (!m) {
        problems.push(`TRIP     could not find ${name}; the two halves of the promise cannot be compared`);
        return null;
      }
      return Number(m[1]);
    };
    const genFlight = num(gen, 'FLIGHT_ESTIMATE_MS in the generator', /FLIGHT_ESTIMATE_MS\s*=\s*(\d+)/);
    const genSettle = num(gen, 'SETTLE_MS in the generator', /SETTLE_MS\s*=\s*(\d+)/);
    const tripFlight = num(trip, 'FLIGHT_ESTIMATE_MS in ui/trip.js', /FLIGHT_ESTIMATE_MS\s*=\s*(\d+)/);
    const tripSettle = num(trip, 'SETTLE_MS in ui/trip.js', /const SETTLE_MS\s*=\s*(\d+)/);
    if (genFlight !== null && tripFlight !== null && genFlight !== tripFlight) {
      problems.push(
        `TRIP     the per-flight allowance is ${genFlight} ms in the generator and ${tripFlight} ms ` +
          `in ui/trip.js, so the length on the row and the length in the mirror are two numbers`
      );
    }
    if (genSettle !== null && tripSettle !== null && genSettle !== tripSettle) {
      problems.push(`TRIP     SETTLE_MS is ${genSettle} in the generator and ${tripSettle} in ui/trip.js`);
    }

    // And the sentence itself never promises LESS time than it was given. Understating is the
    // direction that breaks a promise; overstating only ends the trip early.
    const { shapeLine } = await import(join(JS, 'ui/tripframe.js'));
    const { TOURS } = await import(join(JS, 'data/tours.js'));
    for (const tour of TOURS) {
      const line = shapeLine(tour.stops.length, tour.estimate_ms);
      const mins = Number((line.match(/about (\d+) minutes/) || [])[1]);
      if (Number.isFinite(mins) && mins * 60000 < tour.estimate_ms) {
        problems.push(`TRIP     '${tour.id}' is offered as ${line} but runs ${tour.estimate_ms} ms`);
      }
      if (!Number.isFinite(mins) && tour.estimate_ms > 90000) {
        problems.push(`TRIP     '${tour.id}' runs ${tour.estimate_ms} ms and is offered as "${line}"`);
      }
      if (!line.includes(String(tour.stops.length))) {
        problems.push(`TRIP     '${tour.id}' is offered as "${line}", which does not state its stop count`);
      }
    }
    notes.push(
      `trips: the flight allowance is ${tripFlight} ms in both halves; ` +
        `${TOURS.map((x) => shapeLine(x.stops.length, x.estimate_ms)).join('; ')}`
    );
  } catch (e) {
    problems.push(`TRIP     could not check the promised length: ${String(e)}`);
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
