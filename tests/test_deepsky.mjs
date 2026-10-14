// tests/test_deepsky.mjs -- the deep sky's foundation (internal spec 0075 stage a): the object model
// (parents, distances and their methods, what is drawn), the Helix-LMC-Tarantula triple, the parent
// rule for names, level by size on screen with hysteresis, the flight through a parent, a disc's
// viewing angles, the angular sizes of the photographs against the catalogue, and the coordinator's
// seam (eligibility, fetch, dispose, stats, ready) over a stub hero.
//
//   node tests/test_deepsky.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const D = await import(join(JS, 'data/deepsky.js'));
const L = await import(join(JS, 'scene/deep/lodsize.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { ellipseInPicture, skyToPicture } = await import(join(JS, 'scene/nebulae.js'));
const { createDeepSky } = await import(join(JS, 'scene/deep/deepsky.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const LY_KM = 9460730472580.8;
const D2R = Math.PI / 180;

const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
const records = parseDso(doc);
const byId = new Map(records.map((r) => [r.id, r]));
const lmc = byId.get('dso-lmc'), tar = byId.get('dso-tarantula-nebula'), helix = byId.get('dso-helix-nebula');
const m31 = byId.get('dso-m31'), m32 = byId.get('dso-m32'), m42 = byId.get('dso-m42'), m43 = byId.get('dso-m43');

// --- 1. parents (task 2) -------------------------------------------------------------------------
{
  check(D.parentIdOf(tar) === 'dso-lmc', `the Tarantula's parent is the LMC (${D.parentIdOf(tar)})`);
  check(D.breadcrumb(tar, byId).map((r) => r.id).join(' > ') === 'dso-lmc > dso-tarantula-nebula', 'its breadcrumb is LMC > Tarantula');
  check(D.relationOf(tar, lmc) === 'inside' && D.relationOf(m32, m31) === 'companion', 'a nebula is inside its galaxy; a galaxy beside a galaxy is its companion');
  check(D.parentIdOf(m43) === 'dso-m42' && D.parentIdOf(lmc) === null, 'M43 is part of M42; the LMC has no parent');
  for (const r of records) {
    const p = D.parentIdOf(r);
    if (p) check(byId.has(p), `${r.id}'s parent ${p} is a record`);
    check(Array.isArray(r.meta.drawnClasses) && r.meta.drawnClasses.every((c) => D.DRAWN_CLASSES.includes(c)), `${r.id} says what is drawn for it`);
  }
  check(lmc.meta.morphology === 'barred-irregular' && m31.meta.morphology === 'spiral' && byId.get('dso-sculptor-dwarf').meta.morphology === 'dwarf-spheroidal', 'morphology: written for the LMC, derived for the rest');
}

// --- 2. distances, and the triple (requirement 7) ------------------------------------------------
{
  const e = D.distanceEstimate(lmc);
  check(e.method === 'eclipsing-binary' && e.value === 161740 && e.low === 159950 && e.high === 163540 && /Pietrzy/.test(e.source), `the LMC's distance has its method, range and source: ${JSON.stringify(e)}`);
  const t = D.distanceEstimate(tar);
  check(t.assumed && t.method === 'assumed-member-of-parent' && t.value === e.value && t.low === e.low, 'the Tarantula takes the LMC\'s distance, and says so');
  check(D.distanceEstimate(helix).method === 'parallax' && D.distanceEstimate(helix).value === 655, 'the Helix is at its Gaia parallax, 655 ly');
  check(D.distanceEstimate(m42).method === null, 'a row without a measured method says none (and the card prints no method row)');
  // Directions to 0.01 degree: each record points where its RA and Dec say.
  const hand = { 'dso-lmc': [80.8917, -69.7567], 'dso-tarantula-nebula': [84.6583, -69.095], 'dso-helix-nebula': [337.4106, -20.8371] };
  const eps = 23.4392911 * D2R;
  for (const [id, [ra, dec]] of Object.entries(hand)) {
    const r = byId.get(id);
    const x = Math.cos(dec * D2R) * Math.cos(ra * D2R), y = Math.cos(dec * D2R) * Math.sin(ra * D2R), z = Math.sin(dec * D2R);
    const want = [x, y * Math.cos(eps) + z * Math.sin(eps), -y * Math.sin(eps) + z * Math.cos(eps)];
    const l = Math.hypot(r.pos.x, r.pos.y, r.pos.z);
    const ang = Math.acos(Math.min(1, (want[0] * r.pos.x + want[1] * r.pos.y + want[2] * r.pos.z) / l)) / D2R;
    check(ang < 0.01, `${id} points within 0.01 degree of its RA and Dec (${ang.toFixed(5)})`);
    check(Math.abs(l / LY_KM - r.meta.distLy) < 1, `${id} is at its stated distance`);
  }
  check(D.insideParent(tar, lmc), `the Tarantula is inside the LMC's extent (${D.separationLy(tar, lmc).toFixed(0)} ly from its centre, radius ${(lmc.meta.sizeLy / 2).toFixed(0)})`);
  check(Math.abs(Math.hypot(tar.pos.x, tar.pos.y, tar.pos.z) - Math.hypot(lmc.pos.x, lmc.pos.y, lmc.pos.z)) / LY_KM < 1, 'the Tarantula is at the LMC\'s distance, not 3 000 ly in front of it');
  check(D.separationLy(helix, lmc) > 150000, 'and the Helix is a neighbour in the sky, not in space');
}

// --- 3. the parent rule for names (task 5) -------------------------------------------------------
{
  check(D.nameRule(lmc, { parentPx: null }) === true, 'a record with no parent is not the rule\'s business');
  check(D.nameRule(tar, { parentPx: 60 }) === false && D.nameRule(tar, { parentPx: null }) === false, 'the Tarantula waits while its LMC is small or unseen');
  check(D.nameRule(tar, { parentPx: D.NAME_PARENT_PX }) === true, 'and is named once the LMC is 120 px in radius');
  check(D.nameRule(tar, { parentPx: 10, selectedId: tar.id }) === true && D.nameRule(tar, { parentPx: 10, subjectId: tar.id }) === true, 'or when it is selected, or a trip\'s subject');
  const labels = await import(join(JS, 'ui/labels.js'));
  check(labels.labelParentId(tar) === 'dso-lmc', 'ui/labels.js ranks the Tarantula on its LMC\'s distance, behind it');
}

// --- 4. level by size on screen (task 7) ---------------------------------------------------------
{
  const fov = 45 * D2R;
  check(Math.abs(L.radiusPx(1, 1 / Math.sin(fov / 2), fov, 900) - 450) < 1e-6, 'a sphere filling the half-height is half the view tall');
  check(L.radiusPx(2, 1, fov, 900) === Infinity, 'inside it, it is everything');
  let lv = 0;
  lv = L.levelFor(150, lv, 'nebula'); check(lv === 2, `150 px is the structure for a nebula (${lv})`);
  lv = L.levelFor(130, lv, 'nebula'); check(lv === 2, 'and stays there at 130 px (hysteresis: down at 0.8 of 140)');
  lv = L.levelFor(100, lv, 'nebula'); check(lv === 1, 'and goes down at 100 px');
  lv = L.levelFor(310, lv, 'nebula'); check(lv === 3, 'the close-up from 300 px');
  check(L.levelFor(1e6, 0, 'other') <= 3, 'level 4 is never automatic');
  check(L.classOf(lmc) === 'galaxy' && L.classOf(helix) === 'planetary' && L.classOf(tar) === 'nebula', 'classes by kind');
  const f = L.createFader(300);
  f.to('x', 0, 0);
  const mid = f.to('x', 1, 150), end = f.to('x', 1, 300);
  check(Math.abs(mid - 0.5) < 1e-9 && end === 1, `a level fades over 300 ms (${mid}, ${end})`);
  check(L.PHOTO_FETCH_PX * 2 === 32, 'the photographs are fetched at 32 px wide, as before');
}

// --- 5. the flight through a parent (task 3) -----------------------------------------------------
{
  const R = 15000, fovY = 45;
  const apex = D.parentApexDistance(R, fovY);
  const fill = Math.tan(Math.asin(R / apex)) / Math.tan(fovY / 2 * D2R);
  check(Math.abs(fill - D.PARENT_FILL) < 1e-9, `at the apex the parent fills 60 % of the height (${fill.toFixed(3)})`);
  const at = D.enterShare({ x: 0, y: 0, z: 0 }, { x: 100000, y: 0, z: 0 }, { x: 100000, y: 0, z: 0 }, R);
  check(Math.abs(at - 0.85) < 1e-9, `the look-at point enters the parent at 85 % of its pan (${at})`);
  check(D.enterShare({ x: 99000, y: 0, z: 0 }, { x: 100000, y: 0, z: 0 }, { x: 100000, y: 0, z: 0 }, R) === 0, 'from inside it, at once');
  check(D.enterShare({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1e6, z: 0 }, R) === null, 'never, for a line that misses it');
  const path = D.parentPath({ apex, at })({ from: 120, to: 4700, fromDir: { x: 0, y: 0, z: 1 }, toDir: { x: 1, y: 0, z: 0 } });
  const s0 = path.at(0), sA = path.at(0.6), s1 = path.at(1);
  check(Math.abs(s0.distance - 120) < 1e-6 && Math.abs(sA.distance - apex) < 1e-6 && s1.distance === 4700, `the camera climbs to the apex and comes down to the child (${s0.distance.toFixed(0)}, ${sA.distance.toFixed(0)}, ${s1.distance})`);
  check(Math.abs(path.at(0.55).pan - at) < 1e-9 && s1.pan === 1, 'the look-at point is at the parent\'s edge when the camera is at the apex');
  let mono = true, prev = -1; for (let k = 0; k <= 100; k++) { const p = path.at(k / 100).pan; if (p < prev - 1e-12) mono = false; prev = p; }
  check(mono, 'the pan never goes back');
  check(Math.abs(Math.hypot(sA.dir.x, sA.dir.y, sA.dir.z) - 1) < 1e-9, 'the side turns on the sphere');
}

// --- 6. a disc's viewing angles (requirement 10's orientation) -----------------------------------
{
  const o = lmc.meta.orientation;
  const f = D.discFrame(lmc.pos, o.pa_deg, o.incl_deg, o.near_side);
  const l = Math.hypot(lmc.pos.x, lmc.pos.y, lmc.pos.z);
  const u = [lmc.pos.x / l, lmc.pos.y / l, lmc.pos.z / l];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  check(Math.abs(dot(f.normal, f.major)) < 1e-9, 'the line of nodes lies in the disc');
  check(Math.abs(Math.acos(Math.abs(dot(f.normal, u))) / D2R - o.incl_deg) < 1e-6, `the disc is inclined ${o.incl_deg} degrees to the line of sight`);
  const pole = [0, Math.sin(23.4392911 * D2R), Math.cos(23.4392911 * D2R)];
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const east = cr(pole, u), north = cr(u, east);
  const ne = [north[0] + east[0], north[1] + east[1], north[2] + east[2]];
  const inDisc = ne.map((x, i) => x - dot(ne, f.normal) * f.normal[i]);
  check(dot(inDisc, u) < 0, 'its north-east side is the nearer one');
}

// --- 7. what is drawn, and the tag (task 6) ------------------------------------------------------
{
  check(D.drawnOf(lmc).join() === 'photograph,illustration' && D.primaryDrawn(D.drawnOf(lmc)) === 'photograph', 'the LMC is a photograph and an illustrative glow');
  check(D.drawnOf(lmc, { shipped: true, drawn: ['model'] })[0] === 'model' && D.drawnOf(lmc, { shipped: false, drawn: ['model'] })[0] === 'photograph', 'a shipped hero\'s class leads; an unshipped one adds nothing');
  const fake = { ...lmc, meta: { ...lmc.meta, heroDrawn: ['reconstruction'] } };
  check(D.primaryDrawn(D.drawnOf(fake)) === 'reconstruction', 'the coordinator\'s stamp is read too');
}

// --- 8. the photographs' angular sizes against the catalogue (task 10, DS-A10) -------------------
// Every picture is drawn at the angle its archive measured (scene/nebulae.js pictureHalfExtent; held
// by tests/test_nebulae.mjs), and a picture of a PART says so. The two whole-galaxy pictures the
// baseline found narrower than their catalogue extent are held at what they are, with the reason, so
// a re-bake that changes either is noticed.
{
  const KNOWN = {
    // NOIRLab's SMASH release image is a crop of a mosaic, 9.35 deg across; the catalogue's 10.75 deg
    // is the outer disc. The frame cuts the faint outskirts, and the fade now runs along the galaxy's
    // own ellipse (task 36), so the cut is not read as the galaxy's edge.
    lmc: [0.87, 'a cropped mosaic'],
    // The 132' NOIRLab frame holds the bright disc; OpenNGC's 178' is the faint outer disc.
    m31: [0.74, 'the frame is inside the faint disc'],
  };
  const table = [];
  for (const row of NEBULAE) {
    const r = byId.get(`dso-${row.id}`);
    if (!r || !(r.meta.majAxArcmin > 0)) continue;
    const k = Math.max(row.width_arcmin, row.height_arcmin) / r.meta.majAxArcmin;
    table.push(`${row.id} ${(k * 100).toFixed(0)}%`);
    if (KNOWN[row.id]) check(Math.abs(k - KNOWN[row.id][0]) < 0.01, `${row.id}: the picture is ${(k * 100).toFixed(0)} % of its catalogue extent, not the ${KNOWN[row.id][0] * 100} % written down (${KNOWN[row.id][1]})`);
    if (k < 0.25) check(!!row.part, `${row.id}: under a quarter of its object without a \`part:\``);
  }
  check(table.length >= 25, `the angular sizes were compared (${table.length})`);
  // The LMC: where its catalogue centre falls in the picture, and its own ellipse there.
  const row = NEBULAE.find((x) => x.id === 'lmc');
  const c = skyToPicture(row, 80.8917, -69.7567);
  const offDeg = Math.hypot((c.u - 0.5) * row.width_arcmin, (c.v - 0.5) * row.height_arcmin) / 60;
  check(Math.abs(offDeg - 1.94) < 0.1, `the picture's centre is ${offDeg.toFixed(2)} deg from the LMC's catalogue centre (1.94 measured in stage 0)`);
  const ell = ellipseInPicture(row, 80.8917, -69.7567, 645, 517, 9.3);
  check(!!ell && Math.abs(ell.u - c.u) < 1e-12, 'its ellipse is centred on the catalogue\'s centre, not the frame\'s');
  // the end of the major axis is at radius 1 of the ellipse
  const pa = 9.3 * D2R, a = 80.8917 * D2R, dd = -69.7567 * D2R, s = (645 / 2) / 60 * D2R;
  const east = [-Math.sin(a), Math.cos(a), 0], north = [-Math.sin(dd) * Math.cos(a), -Math.sin(dd) * Math.sin(a), Math.cos(dd)];
  const ctr = [Math.cos(dd) * Math.cos(a), Math.cos(dd) * Math.sin(a), Math.sin(dd)];
  const tip = ctr.map((x, i) => x * Math.cos(s) + (north[i] * Math.cos(pa) + east[i] * Math.sin(pa)) * Math.sin(s));
  const tRa = Math.atan2(tip[1], tip[0]) / D2R, tDec = Math.asin(tip[2]) / D2R;
  const tu = skyToPicture(row, (tRa + 360) % 360, tDec);
  const du = tu.u - ell.u, dv = tu.v - ell.v;
  const rad = Math.hypot(ell.x[0] * du + ell.x[1] * dv, ell.y[0] * du + ell.y[1] * dv);
  check(Math.abs(rad - 1) < 0.02, `the end of the LMC's major axis is on its ellipse (${rad.toFixed(3)})`);
}

// --- 9. the coordinator's seam, over a stub hero (task 8) ----------------------------------------
{
  stage.setWorld('stellar');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  let built = 0, fetched = 0;
  const stubProfile = { id: 'helix', shipped: true, drawn: ['reconstruction'], layers: [{ kind: 'gas', what: 'shell', profile: 5 }] };
  const heroes = [{ id: 'helix', record: 'dso-helix-nebula', stage: 'b', profile: async () => ({ HERO: stubProfile }), build: async () => { fetched++; const m = await import(join(JS, 'scene/deep/helix.js')); return { createHero: (...a) => { built++; return m.createHero(...a); } }; } }];
  let q = { tier: 1, top: false, latched: false, scaleStep: 0 };
  const deep = createDeepSky(THREE, {
    scene, heroes, records: () => records, recordById: (id) => byId.get(id), pictureShare: () => 0, picturesBusy: () => false,
    selectedId: () => null, subjectId: () => null, quality: () => q, look: () => 'film', reduced: () => false, frozen: true,
  });
  await deep.whenReady(2000);
  const place = (rec, distLy, dir = 1) => {
    const p = new THREE.Vector3(); stage.toSceneInto(rec.pos, 'sun-inertial', p, stage.tMs);
    const back = p.clone().normalize().multiplyScalar(-dir * distLy * LY_KM / stage.unitKm);
    camera.position.copy(p).add(back); camera.lookAt(p); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  };
  place(helix, 2000);
  deep.frame({ camera, renderer, nowMs: 0, visible: true });
  check(fetched === 0, 'a hero 2 000 ly off is not fetched');
  place(helix, 10);
  deep.frame({ camera, renderer, nowMs: 100, visible: true });
  await deep.whenReady(2000);
  check(fetched === 1 && built === 1, `the hero is fetched and built once it is near (${fetched}, ${built})`);
  for (let t = 200; t <= 800; t += 100) deep.frame({ camera, renderer, nowMs: t, visible: true });
  const st = deep.stats();
  const h = st.heroes.find((x) => x.id === 'helix');
  check(h && h.loaded && h.level >= 2, `the hero draws at level 2 or more (${JSON.stringify(h)})`);
  check(deep.drawnOf(helix)[0] === 'reconstruction', 'a shipped hero\'s class is what the record draws');
  check(byId.get('dso-helix-nebula').meta.heroDrawn && byId.get('dso-helix-nebula').meta.heroDrawn[0] === 'reconstruction', 'and the record is stamped for the card');
  check(Number.isFinite(st.cpuMs) && st.calls >= 1, `stats say what the hook cost (${st.cpuMs} ms, ${st.calls} calls)`);
  check(deep.ready(), 'ready once nothing is in flight');
  q = { tier: 1, latched: true };
  deep.frame({ camera, renderer, nowMs: 900, visible: true });
  check(deep.stats().heroes[0].level <= 1, 'the latch drops a hero to level 1');
  // Far away, for longer than ten seconds: the hero gives its memory back.
  q = { tier: 1, latched: false };
  place(helix, 50000);
  for (let t = 1000; t <= 13000; t += 1000) deep.frame({ camera, renderer, nowMs: t, visible: true });
  check(!deep.stats().heroes[0].loaded, 'a hero at level 0 for ten seconds is disposed');
  // Nothing vanishes: inside the LMC, it holds the view; the Tarantula's name waits for its LMC.
  place(lmc, -2000);
  for (let t = 14000; t <= 15000; t += 100) deep.frame({ camera, renderer, nowMs: t, visible: true });
  const hold = deep.stats().holders.find((x) => x.id === 'dso-lmc');
  check(hold && hold.share > 0.9, `from inside the LMC a holder draws it (${JSON.stringify(hold)})`);
  check(deep.nameRule(tar, null, null) === true, 'and with the LMC around the camera the Tarantula may be named');
  place(lmc, 5e6);
  deep.frame({ camera, renderer, nowMs: 16000, visible: true });
  check(deep.nameRule(tar, null, null) === false && deep.nameRule(tar, tar.id, null) === true, 'from 5 Mly the LMC speaks for it, unless it is selected');
  const path = deep.pathFor(tar, camera.position.clone(), camera);
  check(typeof path === 'function', 'a flight to the Tarantula from afar goes through its LMC');
  deep.debug({ holders: false });
  place(lmc, -2000);
  for (let t = 17000; t <= 23000; t += 1000) deep.frame({ camera, renderer, nowMs: t, visible: true });
  check(deep.stats().holders.length === 0, 'the holders switch off for a probe, and are let go');
  deep.dispose();
  check(!scene.children.includes(deep.group), 'disposed, the layer leaves the scene');
}

if (problems.length) {
  console.error('deepsky FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('deepsky ok: parents and breadcrumbs, distances with methods (the Tarantula at its LMC\'s), the Helix-LMC-Tarantula triple to 0.01 deg, the parent rule for names, level by size with hysteresis and a 300 ms fade, the flight through a parent, the LMC\'s viewing angles, the photographs\' angular sizes, and the coordinator over a stub hero');
