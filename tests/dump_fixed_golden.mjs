#!/usr/bin/env node
// Dump every bundled `fixed` record at one pinned epoch into tests/fixtures/fixed-golden.json.
//
// WHY THIS EXISTS. `propagate/fixed.js` serves every ground site, every launch pad, every deep
// space dish, the hand-kept landing sites and the historic reentries -- and until this fixture
// existed, nothing in the repo would have noticed if a change to it moved all of them. Most of
// them were correct BECAUSE of a hard-coded 'earth-fixed' string, so the fix for the seven that
// were wrong is exactly the change that could break the other eight.
//
// The fixture is the before picture. `tests/test_contract.mjs` compares against it and requires:
//   - a record declared `earth-fixed` or `earth-inertial` is byte-identical, forever;
//   - a record declared on another world MUST have moved, and MUST now report its own frame.
//
// Regenerate deliberately, never to make a test pass:  node tests/dump_fixed_golden.mjs
// A diff on an Earth row in that regeneration is the bug this file was written to catch.
//
// AND REGENERATE IT FROM THE CODE THE PICTURE IS OF. Running this against a working tree that
// already carries the fix writes the corrected numbers into the "before" column and the whole
// check quietly turns into a tautology. It caught the author of this file doing exactly that.
// Take it from the commit named in `takenAtCommit`:
//   git worktree add --detach /tmp/before <commit>
//   cp tests/dump_fixed_golden.mjs /tmp/before/tests/ && (cd /tmp/before && node tests/dump_fixed_golden.mjs)

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const GOLDEN_EPOCH_ISO = '2026-03-15T12:00:00.000Z';
export const GOLDEN_PATH = join(ROOT, 'tests/fixtures/fixed-golden.json');

// A launch pad as data/parsers.js builds one. Kept here rather than fetched: the golden master
// must not depend on a network that answers differently every day. The shape is the one
// parseLaunches() emits, and the pad path is exercised through the real parser below.
const LL2_SAMPLE = {
  results: [
    {
      id: 'golden-launch',
      name: 'Golden | Master',
      slug: 'golden-master',
      net: '2030-06-01T00:00:00Z', // far enough out that no upcoming-window filter can drop it
      rocket: { configuration: { full_name: 'Falcon 9 Block 5', families: [{ name: 'Falcon 9' }] } },
      launch_service_provider: { name: 'SpaceX' },
      pad: {
        id: 80,
        name: 'Space Launch Complex 40',
        latitude: '28.56194122',
        longitude: '-80.57735736',
        location: { name: 'Cape Canaveral, FL, USA', country_code: 'USA' },
      },
    },
  ],
};

/** Every bundled record whose propagator is `fixed`, in a stable order. */
export async function fixedRecords() {
  const { handKeptSites, sampleReentries, sampleOddities } = await import(
    join(ROOT, 'site/js/data/sample.js')
  );
  const { parseLaunches } = await import(join(ROOT, 'site/js/data/parsers.js'));
  const pads = parseLaunches(LL2_SAMPLE).pads || [];
  // sampleOddities() emits four `fixed` records -- three moon-fixed and rotj-lightsaber, which is
  // an EARTH-frame ground record of exactly the class this fixture was written to guard -- and
  // none of them was in this list, so none was held to anything. They arrive through the new-row
  // branch in test_contract.mjs: frame declared must equal frame answered, and a body-fixed row
  // must be on that body's surface. The fixture needs no regeneration for them.
  const all = [...handKeptSites(), ...sampleReentries(), ...sampleOddities(), ...pads];
  return all
    .filter((r) => r && r.propagator === 'fixed')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** {id, declaredFrame, pos} for each, at the pinned epoch. `pos` is null for "could not look". */
export async function dumpRows() {
  const { propagate } = await import(join(ROOT, 'site/js/propagate/index.js'));
  const tMs = Date.parse(GOLDEN_EPOCH_ISO);
  const rows = [];
  for (const r of await fixedRecords()) {
    const p = propagate(r, tMs);
    rows.push({
      id: r.id,
      layer: r.layer || null,
      declaredFrame: r.frame || null,
      pos: p ? { x: p.x, y: p.y, z: p.z, frame: p.frame, cls: p.cls } : null,
    });
  }
  return rows;
}

// Writing is opt-in. This file lives in tests/ and matches `tests/*.mjs`, so anyone running the
// suite with a glob -- the obvious thing to do -- used to silently overwrite the before picture
// with the after picture and destroy the safety net. The damage then presented as a test failure
// in test_contract.mjs, which is the worst possible disguise for it. Regenerating the fixture is
// a deliberate act, so it needs a deliberate flag.
if (process.argv[1] && process.argv[1].endsWith('dump_fixed_golden.mjs')) {
  if (!process.argv.includes('--write')) {
    console.log(
      'dump_fixed_golden.mjs is a generator, not a test. It rewrites the golden master that\n' +
      'test_contract.mjs checks against. Nothing written. Pass --write if that is what you mean.'
    );
    process.exit(0);
  }
  const rows = await dumpRows();
  const doc = {
    note:
      'The BEFORE picture of propagate/fixed.js, taken at the pinned epoch. An Earth row must ' +
      'stay byte-identical forever; a non-Earth row was wrong when this was taken and must have ' +
      'moved. tests/test_contract.mjs enforces both. Regenerate with tests/dump_fixed_golden.mjs.',
    epochIso: GOLDEN_EPOCH_ISO,
    takenAtCommit: 'ed8a1f0',
    rows,
  };
  writeFileSync(GOLDEN_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log(`wrote ${rows.length} rows to tests/fixtures/fixed-golden.json`);
}
