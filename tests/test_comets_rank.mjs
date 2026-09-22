// WHICH 60 COMETS ARE DRAWN: the ones brightest in the sky now, not the brightest in the catalogue.
//
// The layer ranked by H alone -- how bright a comet would be one au from the Sun and from us -- so
// it drew the catalogue's 60 intrinsically brightest comets wherever they were. Measured on the
// live MPC feed, 2026-09-21: 228 comets reach perihelion within a year and 223 were cut, while
// Hale-Bopp (29 years past perihelion, 51 au out) kept a slot, and so did two SOHO fragments of
// 2020 whose H of -1.6 and 0 come from coronagraph sightings next to the Sun.
//
// The comets here are shaped like those rows, and go through the layer's OWN select and rank.
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { LAYERS } = await import(join(JS, 'data/layers.js'));

const AU = 149597870.7, MU = 1.32712440018e11, DEG = Math.PI / 180, DAY = 86400e3;
const NOW = Date.UTC(2026, 8, 21);
const comet = (name, H, qAu, e, periMs) => {
  const qKm = qAu * AU;
  return {
    id: name, name, layer: 'comets', klass: 'comet', propagator: 'kepler', frame: 'sun-inertial',
    elements: { qKm, e, aKm: Math.abs(1 - e) < 1e-9 ? null : qKm / (1 - e), iRad: 30 * DEG, omRad: 0, wRad: 0, tpMs: periMs, epochMs: periMs, muKm3S2: MU },
    meta: { absoluteMagnitude: H, perihelionMs: periMs, qAu },
  };
};
const haleBopp = comet('C/1995 O1 (Hale-Bopp)', -2.0, 0.914, 0.995, Date.UTC(1997, 3, 1));
const sohoFragment = comet('C/2020 P4-C (SOHO)', -1.6, 0.089, 0.999, Date.UTC(2020, 7, 4));
const active = comet('C/2026 X1 (ACTIVE)', 7.0, 1.2, 0.99, NOW - 30 * DAY);
const faintActive = comet('C/2026 X2 (FAINT)', 13.0, 1.5, 0.99, NOW + 60 * DAY);

const layer = LAYERS.find((l) => l.id === 'comets');
const kept = layer.select([haleBopp, sohoFragment, active, faintActive], NOW);
assert.equal(kept.length, 4, 'the filter is unchanged: every one passes on perihelion or on H');
const order = kept.slice().sort(layer.budget.rank).map((r) => r.name);
assert.equal(order[0], active.name, `a comet a month past perihelion at 1.2 au outranks the famous ones: ${order.join(' > ')}`);
assert.ok(order.indexOf(haleBopp.name) > order.indexOf(active.name), 'Hale-Bopp at 51 au is not brighter now than an active comet');
assert.ok(order.indexOf(sohoFragment.name) > order.indexOf(active.name), 'a 2020 SOHO fragment does not outrank an active comet on its coronagraph H');

// and the number behind it: Hale-Bopp is about magnitude 24 tonight by the same law
const hb = kept.find((r) => r.name === haleBopp.name).meta.magNow;
assert.ok(hb > 20 && hb < 28, `Hale-Bopp's magnitude now is about 24, got ${hb}`);
const act = kept.find((r) => r.name === active.name).meta.magNow;
assert.ok(act > 7 && act < 10, `the active comet is about magnitude 8 now, got ${act}`);

// a comet that cannot be placed sorts after every comet that can
const unplaceable = { ...comet('C/NOPE', -5, 1, 0.5, NOW), elements: null };
const withBad = layer.select([unplaceable, faintActive], NOW).sort(layer.budget.rank).map((r) => r.name);
assert.deepEqual(withBad, ['C/2026 X2 (FAINT)', 'C/NOPE'], `an unplaceable comet goes last, whatever its H: ${withBad}`);

console.log(`comets rank ok: brightest now, not brightest ever -- an active comet (m~${act.toFixed(1)}) above Hale-Bopp (m~${hb.toFixed(1)})`);
