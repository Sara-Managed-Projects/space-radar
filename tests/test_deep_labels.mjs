// tests/test_deep_labels.mjs -- every deep-space hero's card says what is drawn and where it comes from (public #1187,
// internal spec 0077 stage W2-e). The README promises that every picture says whether it is measured, modelled or an
// artist's impression; spec 0075 and 0076 added heroes (the Helix, the LMC and the Tarantula, Andromeda and Triangulum,
// Orion, the Ring, the remnants and the dust, and since 0077 Carina and the SMC), and a hero's source sentence surfaced
// only for the words blocks ui/cardfacts.js listed by hand. This SAMPLES EVERY ONE: each line of scene/deep/heroes.js,
// and every record it draws as a child, is stamped as scene/deep/deepsky.js stamps it when the hero draws, and its
// honesty line must
//   1. name what is drawn in the app's honesty classes (a reconstruction, a model, an illustration...),
//   2. say where its shape or light comes from (the hero's own sentence, or its drawn-as line), and
//   3. say that no astronomer has reviewed it yet (in that sentence or in the card's rows),
// and a hero that is not drawn (not shipped) must not claim to be.
//
//   node tests/test_deep_labels.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
await import(join(JS, 'copy/en.deepheroes.js')); // the words of 1.3.0's heroes, which their modules import
await import(join(JS, 'copy/en.nebheroes.js')); // 0078 r14-neb-a: the emission nebulae's words
const C = await import(join(JS, 'ui/cardfacts.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const records = new Map(parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'))).map((r) => [r.id, r]));
const F = COPY.deepFacts;
const MODULES = { helix: 'helix', lmc: 'lmc', m31: 'spiral', m33: 'spiral', orion: 'orion', m57: 'ring', crab: 'remnant', veil: 'remnant', horsehead: 'dustsheet', coalsack: 'dustsheet', m78: 'dustsheet', iris: 'dustsheet', carina: 'carina', smc: 'smc', m51: 'spiral', m81: 'spiral', m101: 'spiral', m104: 'spiral', antennae: 'spiral' }; // 0077 W3-f: the spirals and the Antennae
Object.assign(MODULES, { m8: 'emission', m20: 'emission', m16: 'emission', m17: 'emission', rosette: 'emission', california: 'emission', 'north-america': 'emission', 'cats-paw': 'emission' }); // 0078 r14-neb-a
const fresh = (rec) => ({ ...rec, meta: { ...(rec.meta || {}) } });
let sampled = 0, shipped = 0;
for (const def of HEROES) {
  const stubbed = def.stub ? def.stub : null;
  const full = (await import(join(JS, `data/hero-${def.id}.js`))).HERO;
  const shown = stubbed || full;
  check(MODULES[def.id], `${def.id}: this test knows its module (add it to MODULES)`);
  const mod = MODULES[def.id] ? await import(join(JS, `scene/deep/${MODULES[def.id]}.js`)) : {};
  const rec0 = records.get(def.record);
  check(rec0, `${def.id}: its record ${def.record} is in site/data/dso.json`);
  if (!rec0) continue;
  // What the card says before the hero draws: the record's own classes, never the hero's.
  const before = C.honestyClause(fresh(rec0), {}) || '';
  if (!shown.shipped) { check(!/reconstructed after|This model is built/.test(before), `${def.id}: not shipped, and its card does not claim a model`); continue; }
  shipped += 1;
  // Stamped as scene/deep/deepsky.js stamps a drawn hero: its classes and id on its record; its words block (the hero's
  // `card.copy`, the module's COPY_BLOCK) and its children's classes once it first draws.
  const block = mod.COPY_BLOCK || null;
  const targets = [{ id: def.record, drawn: shown.drawn, heroId: def.id }];
  // a child gets the hero's classes only where the hero's `card.drawn` names it (scene/deep/deepsky.js); M32 and M110 stay
  // the glows they were (spiral.js has no card), and their cards say so without a hero
  for (const c of full.children || []) if (mod.DRAWN && mod.DRAWN[c]) targets.push({ id: c, drawn: mod.DRAWN[c], heroId: null });
  for (const t of targets) {
    const base = records.get(t.id);
    check(base, `${def.id}: its child ${t.id} is a record`);
    if (!base) continue;
    const rec = fresh(base);
    rec.meta.heroDrawn = t.drawn.slice();
    if (t.heroId) rec.meta.heroId = t.heroId;
    if (block) rec.meta.heroCopy = block;
    const line = C.honestyClause(rec, {}) || '';
    const words = t.drawn.map((c) => F.drawnWords[c]).filter(Boolean);
    check(words.length && words.some((w) => line.includes(w)), `${t.id}: its card names what is drawn (${t.drawn.join(', ')}): "${line.slice(0, 120)}"`);
    const drawnAs = rec.meta.departure || ''; // the card's drawn-as line (data/parsers.js DSO_DRAWN), M31's and M33's
    const own = line.length > (C.honestyClause({ ...rec, meta: { ...rec.meta, heroId: undefined, heroCopy: undefined } }, {}) || '').length;
    check(own || /published|measured|photograph|survey/.test(drawnAs), `${t.id}: its card says where its shape or light comes from (its own sentence or its drawn-as line): "${line.slice(-160)}"`);
    // as the card shows it before the hero first draws: its id and classes are stamped at once, its words block not yet
    if (t.heroId && own) {
      const early = fresh(base);
      early.meta.heroDrawn = t.drawn.slice(); early.meta.heroId = t.heroId;
      check((C.honestyClause(early, {}) || '').length === line.length, `${t.id}: its source sentence shows before the hero first draws (on a card opened as the flight lands)`);
    }
    const rows = block && COPY[block] && COPY[block].rows ? COPY[block].rows[t.id] || [] : [];
    const said = [line, drawnAs, ...rows.map((r) => r.join(' '))].join(' ');
    check(/reviewed by an astronomer/.test(said), `${t.id}: its card says no astronomer has reviewed it yet`);
    sampled += 1;
  }
}
check(shipped >= 10 && sampled >= shipped + 1, `every shipped hero and its children sampled (${shipped} heroes, ${sampled} records)`);
for (const [id, hero] of [['dso-carina-nebula', 'carina'], ['dso-smc', 'smc'], ['dso-tarantula-nebula', null], ['dso-helix-nebula', 'helix'], ['dso-m31', 'm31']]) check(records.has(id), `${id} (${hero || 'a child'}) is sampled`);

if (problems.length) {
  console.error(`test_deep_labels: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`test_deep_labels: ok (${shipped} shipped heroes and ${sampled - shipped} of their children: each card names what is drawn, where it comes from, and that no astronomer has reviewed it yet)`);
