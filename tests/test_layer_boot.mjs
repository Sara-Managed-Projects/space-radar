// tests/test_layer_boot.mjs -- the layers that are off by default still exist.
//
// MEASURED 2026-09-22 on the live site: "Everything active", "The geostationary ring", "Famous
// debris" and "Reentries" read "nothing loaded" on every visit, and ticking a box did nothing.
// Not data, not size: ui/controls.js (the panel, gone since spec 0061) was built before main.js attached ctx.setLayerOn, so the
// panel's fallback wrote `layer.enabled = false` on every layer off in Wonder, and main.js reads
// `enabled: false` as the registry's "switched off for good". This test holds the order and the
// rule, from the source, because no test can boot main.js.
//
//   node tests/test_layer_boot.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1. the switches exist before the panel that presses them
const main = src('site/js/main.js');
const switches = main.indexOf('ctx.setLayerOn = (id, on) =>');
// Since spec 0061 the switches are pressed from What to show, which the tool rail builds.
const panel = main.indexOf('createRail(ctx, shell.railHost);');
check(switches > 0 && panel > 0 && switches < panel, `ctx.setLayerOn is attached before createRail (${switches} < ${panel})`);

// 2. the panels never write the registry's flag: What to show, and the explore view that can
// switch a layer on for a Right-now line or a far place
for (const f of ['site/js/ui/whattoshow.js', 'site/js/ui/explore.js']) {
  const code = src(f).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  check(!/layer\.enabled\s*=[^=]/.test(code), `${f} never assigns layer.enabled (reading it is fine)`);
}

// 3. `load: on-demand` is the deferred path, and only a catalogue-sized layer takes it
check(/l\.load === 'on-demand'/.test(main), 'main.js defers a layer whose registry row says load: on-demand');
const { LAYERS } = await import(join(ROOT, 'site/js/data/layers.js'));
const onDemand = LAYERS.filter((l) => l.load === 'on-demand');
check(onDemand.map((l) => l.id).join(',') === 'active,debris-field', `only the two catalogues load on demand: everything active, and all tracked debris (${onDemand.map((l) => l.id)})`);
for (const l of onDemand) check(l.budget && l.budget.maxItems >= 5000, `${l.id} is catalogue-sized`);
for (const id of ['geo-ring', 'debris-notable', 'reentries']) {
  const l = LAYERS.find((x) => x.id === id);
  check(l && l.enabled !== false && !l.load, `${id} loads at boot like everything else`);
}

// 4. the ring reads its own cut, and the script that publishes the saved copy makes it
const geo = LAYERS.find((l) => l.id === 'geo-ring');
check(geo && geo.source === 'celestrak-geo', 'the geostationary ring reads the celestrak-geo cut');
const { SOURCES } = await import(join(ROOT, 'site/js/data/sources.js'));
check(SOURCES['celestrak-geo'] && SOURCES['celestrak-geo'].browser === true, 'sources.js knows the cut');
const refresh = src('scripts/refresh-snapshots.sh');
check(/derive\("celestrak-active", "celestrak-geo"/.test(refresh), 'refresh-snapshots.sh derives the cut from the active catalogue');
check(/0\.99 <= n <= 1\.01 and e < 0\.02 and i < 15/.test(refresh), 'with the thresholds parsers.js GEO_RING applies');
const { GEO_RING } = await import(join(ROOT, 'site/js/data/parsers.js'));
check(GEO_RING.meanMotionMin === 0.99 && GEO_RING.meanMotionMax === 1.01 && GEO_RING.eccBelow === 0.02 && GEO_RING.inclBelowDeg === 15, 'and those thresholds are still what the browser uses');

// 5. the launches file has a registry row now, so the harvester saves a copy of it
const sourcesYaml = src('registry/sources.yaml');
check(/- id: celestrak-last30\n/.test(sourcesYaml), 'celestrak-last30 has a sources.yaml row');
check(/celestrak-last30/.test(src('.github/workflows/harvest.yml')), 'and the GitHub harvest run fetches it by default');

// 6. the panel's three silences are three strings
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
check(COPY.controls.layerWaits && COPY.controls.layerCountLoading && COPY.controls.layerCountEmpty
  && new Set([COPY.controls.layerWaits, COPY.controls.layerCountLoading, COPY.controls.layerCountEmpty]).size === 3,
  'waiting for its switch, still loading and came back empty are three different lines');

if (problems.length) { console.error('layer boot FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('layer boot ok: the switches exist before the panel, the panel never writes the registry\'s flag, the active catalogue alone loads on demand, the ring has its own cut and the launches file its own saved copy');
