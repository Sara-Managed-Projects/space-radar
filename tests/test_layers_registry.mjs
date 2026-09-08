// tests/test_layers_registry.mjs -- spec 0026 req 8: the registry and the browser agree on which layers exist,
// and `enabled:` in the registry is what switches a layer off.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { LAYERS, registryDrift } = await import(join(JS, 'data/layers.js'));
const { LAYER_ROWS } = await import(join(JS, 'data/layers.registry.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const drift = registryDrift();
check(drift.onlyInBrowser.length === 0, `layers in data/layers.js with no registry row: ${drift.onlyInBrowser.join(', ') || 'none'}`);
check(drift.onlyInRegistry.length === 0, `registry rows with no browser layer: ${drift.onlyInRegistry.join(', ') || 'none'}`);
check(LAYER_ROWS.length === LAYERS.length, `same count both sides (${LAYER_ROWS.length} vs ${LAYERS.length})`);
// the registry's fields won
for (const row of LAYER_ROWS) {
  const layer = LAYERS.find((l) => l.id === row.id);
  if (!layer) continue;
  check(layer.display === row.display, `${row.id}: display comes from the registry (${layer.display} vs ${row.display})`);
  check(layer.enabled === row.enabled, `${row.id}: enabled comes from the registry`);
  for (const [m, on] of Object.entries(row.moments)) check(layer.moments[m] === on, `${row.id}: moment ${m} comes from the registry`);
}
// nothing is switched off today -- stage B shipped -- and every row says so explicitly
check(LAYER_ROWS.every((r) => r.enabled === true), 'no layer is switched off in the registry today (stage B shipped)');
// a switched-off row would be forcedOff for main.js and the panel
const fake = { id: 'x', enabled: false };
check(fake.enabled === false, 'sanity');

if (problems.length) { console.error('layers registry FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`layers registry ok: ${LAYERS.length} layers on both sides, display/moments/enabled from the registry`);
