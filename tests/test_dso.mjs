// tests/test_dso.mjs -- spec 0028 step 5: nebulae, clusters and galaxies at their measured distances.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { parseDso, skyToSunInertialKm } = await import(join(JS, 'data/parsers.js'));
const { LY_KM } = await import(join(JS, 'scene/stars3d.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { drawingLine } = await import(join(JS, 'ui/cards.js'));

const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
check(doc.count === 151 && doc.objects.length === 151, `110 Messier objects and forty-one Local Group galaxies by hand (${doc.count})`);
check(doc.objects.some((o) => o.id === 'smc' && o.distLy === 203700) && doc.objects.some((o) => o.id === 'fornax-dwarf') && doc.objects.some((o) => o.id === 'sculptor-dwarf'), 'the SMC, Fornax and Sculptor dwarfs are hand rows with sourced distances');
check(doc.objects.some((o) => o.id === 'wlm' && o.distLy === 3226000) && doc.objects.some((o) => o.id === 'ngc-6822' && o.designation === 'NGC 6822') && doc.objects.some((o) => o.id === 'carina-dwarf' && o.vmag === null), 'WLM at 3.23 Mly, Barnard\'s Galaxy keeps its NGC number, Carina has no V magnitude invented');
check(doc.objects.some((o) => o.id === 'sagittarius-dwarf' && o.distLy === 80400) && doc.objects.some((o) => o.id === 'sextans-a' && o.distLy === 4586000) && doc.objects.some((o) => o.id === 'sagdig' && o.designation === 'SagDIG'), 'the Sagittarius Dwarf at 80 400 ly, Sextans A at 4.59 Mly, SagDIG by its short name');
check(doc.objects.some((o) => o.id === 'ursa-major-i' && o.vmag === null && o.majAxArcmin === null) && doc.objects.some((o) => o.id === 'reticulum-ii' && o.distLy === 103100 && o.hubble === null), 'Ursa Major I carries no magnitude or size the infobox did not print; Reticulum II has no Hubble code');
check(doc.openNgcTotal > 13000, `the file says how many OpenNGC objects exist without a distance (${doc.openNgcTotal})`);
const m31 = doc.objects.find((o) => o.id === 'm31');
check(m31 && m31.distLy === 2540000 && m31.distLyLow === 2430000 && m31.kind === 'galaxy' && m31.common === 'Andromeda Galaxy', 'M31 is Andromeda, 2.43-2.65 Mly, a galaxy');
// the stored position agrees with the shared sky -> ecliptic rotation
const p31 = skyToSunInertialKm(m31.raDeg, m31.decDeg, m31.distLy / 3.2615637771674333);
check(Math.abs(p31.x / LY_KM - m31.posLy[0]) < 1 && Math.abs(p31.z / LY_KM - m31.posLy[2]) < 1, 'the build script and the browser agree on where the sky is');
check(doc.objects.every((o) => o.distLy > 0 && o.distanceSource), 'every object has a distance and says where it came from');
check(doc.objects.some((o) => o.id === 'lmc' && o.distLy === 163000), 'the LMC is a hand row at 163 000 ly');
check(doc.objects.find((o) => o.id === 'm45')?.kind === 'cluster', 'the Pleiades (from the addendum) are a cluster');

const recs = parseDso(doc);
check(recs.length === 151 && recs.every((r) => r.klass === 'dso' && r.propagator === 'static' && r.layer === 'deep-sky'), 'one static dso record per object');
// a hand row speaks in words, not a Hubble code, and credits the one page it came from (found live 2026-09-09)
const wlmRec = recs.find((r) => r.id === 'dso-wlm');
check(wlmRec && wlmRec.meta.typeText === 'dwarf irregular galaxy' && wlmRec.meta.hubble === 'IB(s)m', `WLM: words for the sentence, the code beside them (${wlmRec && wlmRec.meta.typeText})`);
check(wlmRec && /^Position and distance: https:\/\/en\.wikipedia\.org/.test(wlmRec.meta.cite), `a hand row does not credit OpenNGC for a position it did not use (${wlmRec && wlmRec.meta.cite})`);
// "an ultra-faint dwarf galaxy", not "a ultra-faint" (live, Reticulum II, 2026-09-09)
const { firstSentence } = await import(join(JS, 'ui/cards.js'));
const m0 = { frame: 'sun-inertial', worldId: 'earth' };
const retRec = recs.find((r) => r.id === 'dso-reticulum-ii');
const retSay = firstSentence(retRec, null, m0, {});
check(retSay.includes('Reticulum II is an ultra-faint dwarf galaxy'), `Reticulum II gets "an": ${retSay}`);
const wlmSay = firstSentence(recs.find((r) => r.id === 'dso-wlm'), null, m0, {});
check(wlmSay.includes('is a dwarf irregular galaxy'), `WLM keeps "a": ${wlmSay}`);
const andromeda = recs.find((r) => r.id === 'dso-m31');
check(andromeda && /^Position: OpenNGC/.test(andromeda.meta.cite), 'a Messier row still credits OpenNGC for its position');
check(andromeda.name === 'Andromeda Galaxy' && andromeda.meta.aliases.includes('M31') && andromeda.meta.aliases.includes('NGC 224'), `Andromeda carries M31 and NGC 224 as aliases (${andromeda.meta.aliases})`);
check(andromeda.meta.sizeLy > 120000 && andromeda.meta.sizeLy < 140000, `Andromeda's size follows from 177.83 arcmin at 2.54 Mly (${andromeda.meta.sizeLy} ly)`);

const tMs = Date.parse('2026-09-08T12:00:00Z');
stage.setWorld('stellar'); stage.setTime(tMs);
const pp = propagate(andromeda, tMs);
const sc = pp && stage.toScene(pp, pp.frame, tMs);
check(sc && Math.abs(sc.length() - 2540000) < 100, `on the stellar rung Andromeda is ${sc && Math.round(sc.length())} units (light-years) out`);
stage.setWorld('earth');

const row = LAYERS.find((l) => l.id === 'deep-sky');
check(!!row && row.parse === 'dso' && row.bundledText === 'data/dso.json' && row.source === 'bundled' && row.noModel === true, 'the deep-sky layer row is bundled JSON through bundledText');
const index = buildIndex(recs, LAYERS);
check(findMatches(index, 'andromeda').hits[0]?.record.id === 'dso-m31', '"andromeda" finds M31 first, not Andromeda II (brighter wins the tie)');
check(findMatches(index, 'andromeda').hits.some((h) => h.record.id === 'dso-andromeda-ii'), 'Andromeda II is still in the list');
check(findMatches(index, 'sagittarius dwarf').hits[0]?.record.id === 'dso-sagittarius-dwarf', '"sagittarius dwarf" finds the spheroidal (mag 4.5) before SagDIG (15.5)');
check(findMatches(index, 'm31').hits[0]?.record.id === 'dso-m31', '"m31" finds M31 by alias');
check(findMatches(index, 'pleiades').hits[0]?.record.id === 'dso-m45', '"pleiades" finds M45');
check(findMatches(index, 'ngc 224').hits.some((h) => h.record.id === 'dso-m31'), '"ngc 224" finds M31');
check(typeof drawingLine(andromeda) === 'string' && drawingLine(andromeda).includes('soft mark'), `a deep-sky object says how it is drawn: ${drawingLine(andromeda)}`);

if (problems.length) { console.error('dso FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('dso ok: 110 Messier objects and the LMC at sourced distances, Andromeda 2.54 Mly on the stellar rung, found by name, M-number and NGC number');
