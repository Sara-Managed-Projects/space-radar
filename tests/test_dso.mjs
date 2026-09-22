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
check(doc.count === 209 && doc.objects.length === 209, `110 Messier objects, forty-one Local Group galaxies and fifty-eight famous non-Messier objects by hand (${doc.count})`);
check(doc.objects.some((o) => o.id === 'smc' && o.distLy === 203700) && doc.objects.some((o) => o.id === 'fornax-dwarf') && doc.objects.some((o) => o.id === 'sculptor-dwarf'), 'the SMC, Fornax and Sculptor dwarfs are hand rows with sourced distances');
check(doc.objects.some((o) => o.id === 'wlm' && o.distLy === 3226000) && doc.objects.some((o) => o.id === 'ngc-6822' && o.designation === 'NGC 6822') && doc.objects.some((o) => o.id === 'carina-dwarf' && o.vmag === null), 'WLM at 3.23 Mly, Barnard\'s Galaxy keeps its NGC number, Carina has no V magnitude invented');
check(doc.objects.some((o) => o.id === 'sagittarius-dwarf' && o.distLy === 80400) && doc.objects.some((o) => o.id === 'sextans-a' && o.distLy === 4586000) && doc.objects.some((o) => o.id === 'sagdig' && o.designation === 'SagDIG'), 'the Sagittarius Dwarf at 80 400 ly, Sextans A at 4.59 Mly, SagDIG by its short name');
check(doc.objects.some((o) => o.id === 'ursa-major-i' && o.vmag === null && o.majAxArcmin === null) && doc.objects.some((o) => o.id === 'reticulum-ii' && o.distLy === 103100 && o.hubble === null), 'Ursa Major I carries no magnitude or size the infobox did not print; Reticulum II has no Hubble code');
const omega = doc.objects.find((o) => o.id === 'omega-centauri');
check(omega && omega.kind === 'cluster' && omega.distLy === 15800 && omega.typeText === 'globular cluster', `Omega Centauri is a cluster 15 800 ly out (${omega && omega.kind}, ${omega && omega.distLy})`);
const coal = doc.objects.find((o) => o.id === 'coalsack');
check(coal && coal.kind === 'nebula' && coal.vmag === null && coal.distLy === 587, 'the Coalsack is a nebula with no magnitude, 587 ly');
check(doc.objects.find((o) => o.id === 'centaurus-a').distLyLow === 11000000, 'Centaurus A keeps its 11-13 Mly range');
const horse = doc.objects.find((o) => o.id === 'horsehead-nebula');
check(horse && horse.kind === 'nebula' && horse.distLy === 1375 && horse.designation === 'Barnard 33', 'the Horsehead is a dark nebula 1 375 ly out under its Barnard number');
check(doc.objects.find((o) => o.id === 'ngc-2419').distLy === 275000 && doc.objects.find((o) => o.id === 'flame-nebula').vmag === null, 'NGC 2419 at 275 000 ly; the Flame Nebula keeps no citation-needed magnitude');
// Thirty-one famous non-Messier rows (2026-09-22): each keeps what its infobox said, and no more.
const byId = (id) => doc.objects.find((o) => o.id === id);
check(byId('needle-galaxy')?.distLyLow === 38160000 && byId('needle-galaxy')?.distLyHigh === 53000000, 'the Needle Galaxy keeps both of its infobox distances as a range, 38.16 and 53 Mly');
check(byId('soul-nebula')?.vmag === null && byId('butterfly-nebula')?.vmag === null, 'no V magnitude invented: the Soul\'s 6.5 is labelled absolute, the Butterfly\'s 7.1 is B');
check(byId('war-and-peace-nebula')?.majAxArcmin === null, 'the War and Peace Nebula has no size in its infobox, so none here');
check(byId('antennae-galaxies')?.kind === 'galaxy' && byId('antennae-galaxies')?.typeCode === 'GPair' && byId('antennae-galaxies')?.distLy === 71750000, 'the Antennae are one row, a galaxy pair 71.75 Mly out');
check(byId('heart-nebula')?.distLy === 7000 && byId('soul-nebula')?.distLy === 7500, 'the Heart and Soul at their infoboxes\' 7 000 and 7 500 ly');
const hand22 = doc.objects.filter((o) => /read 2026-09-22/.test(o.distanceSource || ''));
check(hand22.length === 31 && hand22.every((o) => typeof o.why === 'string' && o.why.length <= 160), `the thirty-one rows read 2026-09-22 each carry a why of 160 characters or fewer (${hand22.length})`);
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
check(recs.length === 209 && recs.every((r) => r.klass === 'dso' && r.propagator === 'static' && r.layer === 'deep-sky'), 'one static dso record per object');
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
check(findMatches(index, 'carina').hits[0]?.record.id === 'dso-carina-nebula', `"carina" finds the naked-eye nebula before the dwarf galaxy with no magnitude (${findMatches(index, 'carina').hits[0]?.record.id})`);
check(findMatches(index, 'm31').hits[0]?.record.id === 'dso-m31', '"m31" finds M31 by alias');
// a nickname the row does not carry reaches it through registry/aliases.yaml (2026-09-22)
check(findMatches(index, 'cone nebula').hits[0]?.record.id === 'dso-christmas-tree-cluster', `"cone nebula" finds NGC 2264, the Christmas Tree Cluster (${findMatches(index, 'cone nebula').hits[0]?.record.id})`);
check(findMatches(index, 'lobster nebula').hits[0]?.record.id === 'dso-war-and-peace-nebula', '"lobster nebula" finds NGC 6357');
check(findMatches(index, 'ngc 4039').hits.some((h) => h.record.id === 'dso-antennae-galaxies'), '"ngc 4039" finds the Antennae row');
check(findMatches(index, 'ring nebula').hits[0]?.record.id === 'dso-m57', `"ring nebula" still finds M57 before the Southern Ring (${findMatches(index, 'ring nebula').hits[0]?.record.id})`);
check(findMatches(index, 'pleiades').hits[0]?.record.id === 'dso-m45', '"pleiades" finds M45');
check(findMatches(index, 'ngc 224').hits.some((h) => h.record.id === 'dso-m31'), '"ngc 224" finds M31');
check(/our own galaxy/.test(drawingLine(andromeda)) && /not been mapped/.test(drawingLine(andromeda)), `Andromeda says it is drawn from our galaxy's model, and that its arms are not its own: ${drawingLine(andromeda)}`);
const pleiades = recs.find((r) => r.id === 'dso-m45');
check(typeof drawingLine(pleiades) === 'string' && drawingLine(pleiades).includes('soft glow'), `every other deep-sky object is a soft glow: ${drawingLine(pleiades)}`);

// As big as it is (scene/dsoglow.js, 2026-09-22): the Pleiades stop is 100 ly from a cluster 19 ly
// across, and it was an 8 px dot.
const { glowFor } = await import(join(JS, 'scene/dsoglow.js'));
const pg = glowFor(pleiades);
check(pg && Math.abs(pg.sizeKm / 9460730472580.8 - pleiades.meta.sizeLy) < 1e-6 && pg.colour[2] > pg.colour[0], `the Pleiades glow as wide as their record says, blue-white (${pg && pg.colour})`);
check(glowFor(recs.find((r) => r.id === 'dso-coalsack')) === null, 'a dark nebula does not glow');
check(glowFor(andromeda) === null, 'Andromeda has its own model and no glow');
const glowing = recs.filter((r) => glowFor(r)).length;
check(glowing > 150 && glowing < recs.length, `most deep-sky objects glow at their size (${glowing} of ${recs.length}); those with no size or no light do not`);

// The last stop of "To the edge of what we know" states what this map draws. It said 111 of
// OpenNGC's objects while the file drew 178 (110 placed by OpenNGC, 68 by hand); the numbers on
// that card are read from the shipped files here, so the next rebuild cannot leave them behind.
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { parseStars3d } = await import(join(JS, 'scene/stars3d.js'));
const edge = TOURS.flatMap((t) => t.stops || []).find((s) => s.id === 'edge' && s.card);
const say = edge ? edge.card.body : '';
const n = (text) => Number(String(text).replace(/\s/g, ''));
const starBuf = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const placed = parseStars3d(starBuf.buffer.slice(starBuf.byteOffset, starBuf.byteOffset + starBuf.byteLength)).count;
const fromNgc = doc.objects.filter((o) => o.positionSource === 'OpenNGC').length;
const said = say.match(/shows ([\d ]+) stars .*?, ([\d ]+) nebulae, clusters and galaxies \(([\d ]+) of them from OpenNGC's ([\d ]+)\)/);
check(!!said, `the edge card still states its stars and deep-sky counts in the form this test reads: "${say.slice(0, 160)}"`);
if (said) {
  check(n(said[1]) === placed, `the edge card says ${said[1]} stars; stars3d.bin places ${placed}`);
  check(n(said[2]) === doc.count, `the edge card says ${said[2]} deep-sky objects; dso.json draws ${doc.count}`);
  check(n(said[3]) === fromNgc, `the edge card says ${said[3]} from OpenNGC; dso.json places ${fromNgc} by OpenNGC`);
  check(n(said[4]) === doc.openNgcTotal, `the edge card says OpenNGC lists ${said[4]}; dso.json records ${doc.openNgcTotal}`);
}

// The Layers panel's sentence counts the hand rows; the count comes from the file.
{
  const said = (row.sentence || '').match(/Messier objects and (\d+) more/);
  const hand = doc.objects.filter((o) => o.positionSource !== 'OpenNGC').length;
  check(said && Number(said[1]) === hand, `the deep-sky layer's sentence says ${said && said[1]} more than Messier; dso.json has ${hand}`);
}

// "The map goes further, to ... 10.8 billion light-years out": the farthest place any layer draws.
{
  const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
  const farthest = Math.max(...doc.objects.map((o) => o.distLy), ...EXOTICS.map((e) => Number(e.distLy) || 0));
  const said = say.match(/to a quasar's black hole ([\d.]+) billion light-years out/);
  check(!!said && Math.abs(Number(said[1]) * 1e9 - farthest) / farthest < 0.01, `the edge card's farthest place (${said && said[1]} billion ly) is the farthest drawn (${farthest} ly)`);
  check(!/as far as this map draws/.test(say), 'the edge card no longer says M87 is the edge of the map');
}

if (problems.length) { console.error('dso FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('dso ok: 110 Messier objects and the LMC at sourced distances, Andromeda 2.54 Mly on the stellar rung, found by name, M-number and NGC number');
