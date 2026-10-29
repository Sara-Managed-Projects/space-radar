// tests/test_a45.mjs -- release 1.5.0, stages A4 (stars) and A5 (beyond the Milky Way): the compact catalogues under site/data/a45/.
//
// What it holds: the files are what scripts/gen_a45_data.py promises (counts, headers, sources); every row becomes a record in the
// shape the exotics' card, search and glyph layer serve, with a unique id, a finite place and a source; nothing duplicates an object
// the map already has; the IAU's names join the stars' names; the stars with no distance are records with a direction and no
// distance; and WD J1011+2845, which arrives through the pipeline and not through these files, is in none of them.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const DATA = join(ROOT, 'site/data');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const json = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));
const LY = 9460730472580.8;

const a45 = await import(join(JS, 'data/a45.js'));
const { exoticRecordsFrom, exoticRecords, LAYERS } = await import(join(JS, 'data/layers.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

// ---- the files and their headers
const extremes = json('a45/extremes.json');
const pulsars = json('a45/pulsars.json');
const quasars = json('a45/quasars.json');
const beyond = json('a45/beyond.json');
const iau = json('a45/iau-names.json');
const unNames = json('a45/unplaced.names.json');
const unBin = readFileSync(join(DATA, 'a45/unplaced.bin'));
const raw = ['extremes', 'pulsars', 'quasars', 'beyond', 'iau-names', 'unplaced.names'].map((f) => readFileSync(join(DATA, `a45/${f}.json`), 'utf8')).join('\n');
check(!/J1011\+2845/i.test(raw), 'WD J1011+2845 is in none of the files (it arrives through registry/exotics.yaml)');
check(pulsars.total >= 4503 && pulsars.rows.length + pulsars.skipped.noDistance + pulsars.skipped.alreadyOnTheMap + pulsars.skipped.listedAsMagnetars + pulsars.skipped.noPosition === pulsars.total,
  `the pulsar file accounts for every pulsar the catalogue has (${pulsars.rows.length} + skipped = ${pulsars.total})`);
check(/ATNF/.test(pulsars.source) && /Manchester/.test(pulsars.source), 'the pulsars name their catalogue and its paper');
check(quasars.rows.length >= 1000 && quasars.rows.filter((r) => r[5]).length === 9, `a thousand quasars and the nine beyond z = 7 (${quasars.rows.length}, ${quasars.rows.filter((r) => r[5]).length})`);
check(quasars.rows.filter((r) => r[5]).every((r) => r[3] > 7), 'every flagged quasar is beyond z = 7');
check(new Set(quasars.rows.map((r) => r[0])).size === quasars.rows.length, 'no quasar twice');
check(beyond.far.filter((r) => r.record).length === 3, 'three record-redshift galaxies');
check(['mom-z14', 'jades-gs-z14-0', 'gn-z11'].every((id) => beyond.far.some((r) => r.id === id)), 'MoM-z14, JADES-GS-z14-0 and GN-z11 are there');
check(Math.abs(beyond.far.find((r) => r.id === 'mom-z14').redshift - 14.44) < 1e-9, 'MoM-z14 is at z = 14.44');
check(beyond.localGroup.objects.length + beyond.localGroup.skipped.alreadyOnTheMap.length >= 118, `the Local Group list is whole (${beyond.localGroup.objects.length} new + ${beyond.localGroup.skipped.alreadyOnTheMap.length} already on the map)`);
check(beyond.far.filter((r) => r.kind === 'cluster').length >= 30 && ['Virgo Cluster', 'Coma Cluster', 'Fornax Cluster', 'Perseus Cluster', 'Bullet Cluster', 'El Gordo', "Pandora's Cluster"].every((n) => beyond.far.some((r) => r.name === n)), 'the named clusters are there, the four drawn ones among them');
check(extremes.counts.brownDwarfs === 24 && extremes.rows.filter((r) => r.id.startsWith('bd-')).length === 24, 'the 24 brown dwarfs within 20 light-years');
check(extremes.rows.every((r) => r.source && r.why && Number.isFinite(r.raDeg) && Number.isFinite(r.decDeg) && r.distLy > 0), 'every hand-made row has a source, a line, a place and a distance');
check(iau.total >= 630 && iau.stars.length + iau.unplacedCount + iau.hosts.length + iau.unmatched.length === iau.total, `the IAU list is accounted for (${iau.stars.length} placed + ${iau.unplacedCount} unplaced + ${iau.hosts.length} hosts + ${iau.unmatched.length} unmatched = ${iau.total})`);

// ---- records
const sets = {
  extremes: exoticRecordsFrom(a45.extremeRows(extremes)),
  pulsars: exoticRecordsFrom(a45.pulsarRows(pulsars)),
  quasars: exoticRecordsFrom(a45.quasarRows(quasars)),
  far: exoticRecordsFrom(a45.farRows(beyond.far)),
};
const lg = parseDso({ objects: beyond.localGroup.objects });
check(lg.length === beyond.localGroup.objects.length, 'every Local Group row parses as a deep-sky record');
const ids = new Set(exoticRecords().map((r) => r.id));
let clash = 0;
for (const [name, list] of Object.entries(sets)) {
  check(list.length > 0, `${name}: records`);
  for (const r of list) {
    if (ids.has(r.id)) { clash += 1; if (clash < 4) problems.push(`id twice: ${r.id}`); }
    ids.add(r.id);
    if (!(r.klass === 'exotic' && r.propagator === 'static' && r.frame === 'sun-inertial' && Number.isFinite(r.pos.x) && Number.isFinite(r.pos.y) && Number.isFinite(r.pos.z) && r.meta.source && r.meta.distLy > 0)) { problems.push(`${name}: ${r.id} is malformed`); break; }
  }
}
for (const r of lg) { if (ids.has(r.id)) problems.push(`id twice: ${r.id}`); ids.add(r.id); }
check(ids.size === exoticRecords().length + Object.values(sets).reduce((n, l) => n + l.length, 0) + lg.length, 'ids are unique across the exotics, the new rows and the Local Group');
const dist = (r) => Math.hypot(r.pos.x, r.pos.y, r.pos.z) / LY;
const mom = sets.far.find((r) => r.meta.redshift === 14.44);
check(mom && Math.abs(dist(mom) / 33.8e9 - 1) < 0.03, `MoM-z14 is about 33.8 billion light-years away now, from its redshift (${mom && (dist(mom) / 1e9).toFixed(2)} Gly)`);
check(mom && mom.meta.distanceNote && /comoving/.test(mom.meta.distanceNote) && /14\.44/.test(mom.meta.distanceNote), 'its card says the distance is comoving, and from which redshift');
const virgo = sets.far.find((r) => r.name === 'Virgo Cluster');
check(virgo && Math.abs(dist(virgo) / 53.8e6 - 1) < 0.01, `Virgo is 53.8 million light-years away by surface-brightness fluctuations (${virgo && (dist(virgo) / 1e6).toFixed(1)} Mly)`);
check(sets.far.filter((r) => r.meta.kind === 'cluster').every((r) => r.meta.redshift !== null || r.meta.distLy < 1e9), 'every far cluster has a redshift or a measured distance');
// nothing drawn on top of what was there
const near = (a, b) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y, a.pos.z - b.pos.z) / LY < 50 && a.name !== b.name;
const existing = exoticRecords();
const dup = [...sets.pulsars, ...sets.extremes, ...sets.quasars].filter((r) => existing.some((e) => e.meta.kind === r.meta.kind && Math.abs(Math.hypot(e.pos.x, e.pos.y, e.pos.z) - Math.hypot(r.pos.x, r.pos.y, r.pos.z)) / LY < 5 && near(r, e) === false && Math.hypot(e.pos.x - r.pos.x, e.pos.y - r.pos.y, e.pos.z - r.pos.z) / LY < 0.5));
check(dup.length === 0, `no new record sits on one the map already had (${dup.slice(0, 3).map((r) => r.name).join(', ')})`);
const names = new Set(existing.map((e) => e.name));
check([...sets.pulsars, ...sets.extremes, ...sets.far].every((r) => !names.has(r.name)), 'no new record has an existing exotic\'s name');
// pulsars do not blink, and are small marks
check(sets.pulsars.every((r) => r.sizePx === 4 && !/slowed|blink/i.test(String(r.meta.departure || ''))), 'a catalogue pulsar is a 4 px mark and says nothing about a blink');
check(sets.pulsars.every((r) => r.meta.distanceNote), 'every pulsar says how its distance was found');
// kinds the card and search know
const kinds = new Set([...Object.values(sets).flat().map((r) => r.meta.kind)]);
for (const k of kinds) {
  check(COPY.templates.exotic.kinds[k], `the exotic card has a word for "${k}"`);
  check(COPY.searchRows.kinds[k], `the search row has a word for "${k}"`);
}
check(COPY.templates.exotic.leadGalaxy && COPY.templates.exotic.leadCluster, 'the exotic card has a lead for a galaxy and for a cluster');

// ---- search finds them
const all = [...existing, ...sets.extremes, ...sets.pulsars, ...sets.quasars, ...sets.far, ...lg];
const index = buildIndex(all, LAYERS);
const top = (q) => findMatches(index, q).hits[0]?.record;
check(top('psr j0437-4715')?.name === 'PSR J0437-4715', `"psr j0437-4715" finds the nearest millisecond pulsar (${top('psr j0437-4715')?.name})`);
check(top('bullet cluster')?.name === 'Bullet Cluster', '"bullet cluster" finds it');
check(top('el gordo')?.name === 'El Gordo', '"el gordo" finds it');
check(top('abell 2744')?.name === "Pandora's Cluster", '"abell 2744" finds Pandora\'s Cluster by alias');
check(top('mom-z14')?.name === 'MoM-z14', '"mom-z14" finds it');
check(top('gn-z11')?.name === 'GN-z11', '"gn-z11" finds it');
check(top('gaia bh2')?.name === 'Gaia BH2', '"gaia bh2" finds it');
check(top('luhman 16 a')?.name === 'Luhman 16 A', '"luhman 16 a" finds it');
check(top('wise 0855')?.name === 'WISE 0855-0714', '"wise 0855" finds it');
check(top('ztf j1901')?.name === 'ZTF J1901+1458', '"ztf j1901" finds it');
check(top('segue 2')?.name === 'Segue 2', '"segue 2" finds a dwarf galaxy of the Local Group');
check(top('3c 273')?.id === 'exotic-3c-273', '"3c 273" still finds the one the map had');

// ---- the IAU's names join the stars'
const namesDoc = json('stars3d.names.json');
const joined = a45.withIauNames(namesDoc.rows, iau);
check(joined.length === namesDoc.rows.length + iau.extra.length, `the names file grows by the ${iau.extra.length} IAU-named stars it had no row for`);
const recs = recordsFromNames(joined);
const byId = new Map(recs.map((r) => [r.id, r]));
const sirius = byId.get('hip-32349');
check(sirius && sirius.name === 'Sirius' && sirius.meta.iau && /Sirius/.test(sirius.meta.iau.name), 'Sirius carries the IAU\'s name');
const extra = iau.extra.map((r) => recs.find((x) => x.meta.starIndex === r[0]));
check(extra.every((r) => r && r.meta.iau && r.name === r.meta.iau.name), 'a star the IAU named and HYG did not has the IAU\'s name');
check(recs.filter((r) => r.meta.iau).length >= iau.stars.length - 5, `the IAU's names are on ${recs.filter((r) => r.meta.iau).length} star records`);
const noop = a45.withIauNames(namesDoc.rows, null);
check(noop === namesDoc.rows, 'without the IAU file the names are untouched');
// exoplanet hosts: the IAU's names find the planets
const planets = [{ id: 'exo-hat-p-21-b', meta: { host: 'HAT-P-21', aliases: ['HAT-P-21'] } }, { id: 'exo-x', meta: { host: 'nope' } }];
const hostDoc = { hosts: [['HAT-P-21', 'Bambaruush']] };
check(a45.iauHostAliases(hostDoc, planets) === 1 && planets[0].meta.aliases.includes('Bambaruush') && !planets[1].meta.aliases, 'an exoplanet host\'s IAU name becomes an alias of its planets');

// ---- the stars with no distance
const dv = new DataView(unBin.buffer, unBin.byteOffset, unBin.byteLength);
check(String.fromCharCode(unBin[0], unBin[1], unBin[2], unBin[3]) === 'SRUP' && dv.getUint32(8, true) === 10224, 'unplaced.bin holds the 10 224 stars HYG has no distance for');
const un = a45.parseUnplaced(unBin.buffer.slice(unBin.byteOffset, unBin.byteOffset + unBin.byteLength));
check(un.count === 10224 && un.mag[0] < 4 && un.mag[un.count - 1] > 13, 'brightest first, to magnitude 14');
check(un.id[0] > 0 && new Set(un.id).size === un.count, 'each carries its own HYG id');
check(un.ra.every((v) => v >= 0 && v < 360) && un.dec.every((v) => v >= -90 && v <= 90), 'directions are on the sphere');
const garnet = a45.unplacedNamedRecords(unNames).find((r) => r.name === 'Garnet Star' || r.aliases?.includes?.('Garnet Star') || r.meta.aliases.includes('Garnet Star'));
check(garnet && garnet.meta.noDistance === true && garnet.klass === 'star' && garnet.layer === 'stars', 'the Garnet Star is a star record with no distance');
check(unNames.rows.length === 63 && a45.unplacedNamedRecords(unNames).every((r) => Math.abs(Math.hypot(r.pos.x, r.pos.y, r.pos.z) / LY - 1e5) < 1), 'the 63 named ones sit on a direction only (the record\'s own distance is a placeholder no card prints)');
const unnamed = a45.unplacedRecord([5, '', '', '', 0, 0, '', '', 10, 20, 9.5, 12345]);
check(unnamed.name === 'HYG star 12345' && unnamed.meta.noDistance && unnamed.meta.mag === 9.5, 'an unnamed one is named by the catalogue\'s number');
const dir = a45.eclipticDirection(0, 0);
check(Math.abs(dir[0] - 1) < 1e-12 && Math.abs(dir[1]) < 1e-12, 'RA 0, Dec 0 is the ecliptic +X');
const polar = a45.eclipticDirection(90, 0);
check(Math.abs(polar[1] - Math.cos(23.4392911 * Math.PI / 180)) < 1e-9, 'the equator turned into the ecliptic by the app\'s obliquity');
// ---- headless scene: a shell on a world's stage, nothing on a rung, and a tap that finds a star
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createUnplaced } = await import(join(JS, 'scene/unplaced.js'));
  const tMs = Date.parse('2026-10-28T12:00:00Z');
  const unBuf = unBin.buffer.slice(unBin.byteOffset, unBin.byteOffset + unBin.byteLength);
  const scene = new THREE.Scene();
  const u = createUnplaced(scene, { files: [unBuf, unNames] });
  stage.setWorld('earth'); stage.setTime(tMs);
  u.setOpacity(1);
  await u.load();
  check(u.count() === 10224 && u.mode() === 'shell', `on a world's stage the stars with no distance are a shell (${u.count()}, ${u.mode()})`);
  const pts = u.group.children[0];
  check(pts && pts.visible === true, 'the points are visible at opacity 1');
  const pos = pts.geometry.getAttribute('position').array;
  check(Math.abs(Math.hypot(pos[0], pos[1], pos[2]) - 1e8) < 50, 'a unit direction times the shell, as the placed stars');
  check(u.drawn() > 700 && u.drawn() < 1000, `at the shutter's 7.5 about 850 are drawn (${u.drawn()})`);
  // a camera looking straight at the brightest of them taps it
  const camera = new THREE.PerspectiveCamera(45, 800 / 600, 1e-5, 1e9);
  camera.position.set(0, 0, 0);
  camera.lookAt(pos[0], pos[1], pos[2]);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  u.update(camera, null);
  const hits = u.pickAll(0, 0, camera, { w: 800, h: 600 }, 6);
  check(hits.length >= 1 && hits[0].record.meta.noDistance === true && hits[0].record.id === `hyg-u${un.id[0]}`, `a tap on the brightest picks it, a star with no distance (${hits[0] && hits[0].record.id})`);
  check(u.pickAll(0.9, 0.9, camera, { w: 800, h: 600 }, 6).every((h) => h.record.id !== `hyg-u${un.id[0]}`), 'a tap in the corner does not');
  u.setMagLimit(3); 
  check(u.pickAll(0, 0, camera, { w: 800, h: 600 }, 6).every((h) => h.record.meta.mag <= 3), 'a star fainter than the shutter shows is not to be tapped');
  u.setMagLimit(7.5);
  stage.setWorld('stellar'); stage.setTime(tMs);
  u.rebuild();
  check(u.mode() === 'true' && pts.visible === false && u.pickAll(0, 0, camera, { w: 800, h: 600 }, 6).length === 0, 'on a rung of the ladder they are not drawn and not to be tapped: a star there needs a place');
  stage.setWorld('earth');
  u.dispose();
}
// ---- the layers load through their own module, as main.js asks them to
{
  const real = globalThis.fetch;
  globalThis.fetch = async (u) => {
    const buf = readFileSync(fileURLToPath(String(u)));
    return { ok: true, status: 200, json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  };
  const { loadLayer } = await import(join(JS, 'data/layers.js'));
  const want = { 'extremes-more': 78, pulsars: 4383, 'beyond-more': 85 + 38, quasars: 1006 };
  for (const [id, n] of Object.entries(want)) {
    const layer = LAYERS.find((x) => x.id === id);
    const recs2 = await loadLayer(layer, Date.now());
    check(recs2.length === n && recs2.every((r) => r.layer === id && r.pos && Number.isFinite(r.pos.x)), `layer ${id} loads ${n} records through fetchLazy (${recs2.length})`);
  }
  const bm = await loadLayer(LAYERS.find((x) => x.id === 'beyond-more'), Date.now());
  check(bm.filter((r) => r.klass === 'dso').length === 85 && bm.filter((r) => r.klass === 'exotic').length === 38, 'the beyond layer holds 85 Local Group dwarfs (deep-sky records) and 38 far rows (exotic records)');
  check(bm.find((r) => r.id === 'dso-lg-andromeda_09').meta.parent === 'dso-m31', 'a satellite of Andromeda has Andromeda for its parent');
  globalThis.fetch = real;
}
// the layers
for (const id of ['extremes-more', 'pulsars', 'beyond-more', 'quasars']) {
  const l = LAYERS.find((x) => x.id === id);
  check(l && l.load !== 'on-demand' && typeof l.fetchLazy === 'function' && l.ladderOnly, `layer ${id}: fetched by a module of its own, ladder only`);
}
check(LAYERS.find((x) => x.id === 'pulsars').moments.wonder === false && LAYERS.find((x) => x.id === 'quasars').moments.wonder === false, 'the two thousands-strong layers start off, as the exoplanets do');
check(LAYERS.find((x) => x.id === 'extremes-more').moments.wonder === true && LAYERS.find((x) => x.id === 'beyond-more').moments.wonder === true, 'the two small ones start on');
check(EXOTICS.length === 23, 'registry/exotics.yaml is untouched (23 fact sheets)');

if (problems.length) { console.error('a45 FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`a45 ok: ${sets.pulsars.length} pulsars, ${sets.quasars.length} quasars, ${sets.extremes.length} magnetars, black holes, white dwarfs and brown dwarfs, ${sets.far.length} far galaxies and clusters, ${lg.length} Local Group dwarfs, ${iau.stars.length} IAU names joined, ${un.count} stars with no distance`);
