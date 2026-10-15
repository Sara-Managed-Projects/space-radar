// r12-truth: the truth on every card (internal spec 0076 W1-c; internal #908, #892, #884, #918). The
// card of a photograph (M42), of a hero on our line and turned (the Helix, with the HUD's tag), of an
// illustration (the Milky Way from 46 kpc above its plane) and of a measured world under the sky in
// other light (Mars, infrared), each with the card's row "How we know" open.
//
// Beside every picture: the row's hint, the legend's rows as text, the HUD tag's words, how much of the
// photograph and of the hero is drawn (the shares the tag follows), whether the page scrolls sideways,
// and the renderer's counts. On a ref that has no such row (main before the stage) it photographs the
// same cards with their rows as they are: that run is the before.
//
// Run it at 1440 x 900 and on a 320 px phone (`-f mobile=true -f width=320 -f height=700`). On a phone
// each subject is photographed twice: the scene with its tag over the sheet at half, then the sheet at
// full with the legend in view. It fails only where the row exists and says something untrue: no row
// on a card, a photograph with no date line, a tag that does not follow the shares, sideways scroll.
look.probe = 'r12-truth';
const out = { scenes: [], problems: [], hasRow: null };
const phone = innerWidth < 900;
const q = (s, root = document) => root.querySelector(s);
const textOf = (n, cap = 900) => (n ? n.innerText.replace(/\s+/g, ' ').trim().slice(0, cap) : null);
const sheet = async (h) => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set(h); await sleep(900); } };
const turn = (rad) => rig.flyTo({ azimuth: rig.state.azimuth + rad, polar: rig.state.polar, ms: 0 });
const pull = (k) => rig.flyTo({ distance: rig.state.distance * k, ms: 0 });
const unitV = (v) => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
const EPS = 23.4392911 * Math.PI / 180;
const eqToScene = (raDeg, decDeg) => {
  const ra = raDeg * Math.PI / 180, dec = decDeg * Math.PI / 180;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const ye = y * Math.cos(EPS) + z * Math.sin(EPS), ze = -y * Math.sin(EPS) + z * Math.cos(EPS);
  return unitV({ x, y: ze, z: -ye });
};
const shares = (id) => {
  const s = {};
  try { s.photo = sr.nebulae ? Math.round(sr.nebulae.drawn(id) * 100) / 100 : null; } catch { s.photo = null; }
  try { const h = sr.deep && sr.deep.heroShares ? sr.deep.heroShares() : null; s.hero = h ? Math.round((h.get(id) || 0) * 100) / 100 : null; } catch { s.hero = null; }
  return s;
};
const tagText = () => textOf(q('#sr-hud .sr-tag:not(.is-off)'), 200);
const need = async (id, waitMs = 9000) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return null; }
  if (r.layer && sr.isLayerOn && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
  sr.select(r, { fly: true, undo: false });
  await sleep(waitMs);
  if (sr.deep && sr.deep.whenReady) await sr.deep.whenReady(15000);
  return r;
};
/** Open the row (again, so it is filled for this moment) and bring it into view. Null when the ref has no row. */
const openRow = async () => {
  const head = q('#sr-card [data-section="truth"] .sr-disc__head');
  if (!head) return null;
  if (head.getAttribute('aria-expanded') === 'true') { head.click(); await sleep(200); }
  head.click();
  await until(() => q('#sr-card [data-section="truth"] .sr-rows'), 15000);
  await sleep(400);
  head.scrollIntoView({ block: 'start' });
  await sleep(700);
  return head;
};
const scene = async (name, note, id, expect = {}) => {
  const row = { name, note, id, tag: tagText(), shares: shares(id), cost: frameCost() };
  if (phone) { await sheet('half'); await shot(`${name}-scene`, `${note} | the scene and its tag; tag: ${row.tag}`, 1500); row.tag = tagText(); }
  const head = await openRow();
  if (phone) { await sheet('full'); if (head) { head.scrollIntoView({ block: 'start' }); await sleep(600); } }
  row.hasRow = !!head;
  if (out.hasRow === null) out.hasRow = row.hasRow;
  if (head) {
    row.hint = textOf(q('.sr-disc__hint', head.parentNode), 60);
    row.legend = textOf(q('#sr-card [data-section="truth"] .sr-disc__panel'));
    row.honesty = textOf(q('#sr-card .sr-card__cls'), 500);
    for (const want of expect.legend || []) if (!row.legend || !row.legend.includes(want)) out.problems.push(`${name}: the legend does not say "${want}"`);
    if (expect.hint && row.hint !== expect.hint) out.problems.push(`${name}: the row's hint is "${row.hint}", not "${expect.hint}"`);
    if (expect.tag && !(row.tag || '').includes(expect.tag)) out.problems.push(`${name}: the tag says "${row.tag}", not "${expect.tag}" (shares ${JSON.stringify(row.shares)})`);
  } else {
    // The before: the card as it is, scrolled to its foot (the honesty line).
    const foot = q('#sr-card .sr-card__foot');
    if (foot) { foot.scrollIntoView({ block: 'end' }); await sleep(600); }
    row.honesty = textOf(q('#sr-card .sr-card__cls'), 500);
  }
  row.sideways = document.scrollingElement.scrollWidth > innerWidth + 1;
  if (row.sideways && out.hasRow) out.problems.push(`${name}: the page scrolls sideways (${document.scrollingElement.scrollWidth} > ${innerWidth})`);
  out.scenes.push(row);
  await shot(phone ? `${name}-legend` : name, `${note} | ${head ? 'legend open, hint ' + row.hint : 'no row (before)'}; tag: ${row.tag}`);
  return row;
};

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  out.laterLayers = await until(() => !!sr.recordById('dso-m42'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }

try {
  // 1. A photograph: M42 on our line.
  if (await need('dso-m42')) await scene('01-m42', 'M42: a photograph on our line', 'dso-m42', { hint: 'Photograph', tag: 'photograph', legend: ['Photograph by', 'VLT Survey Telescope', 'Date not published', 'Published'] });

  // 2. A hero: the Helix at arrival (the photograph draws) and turned 60 degrees (the reconstruction draws).
  if (await need('dso-helix-nebula')) {
    await scene('02-helix-line', 'the Helix at arrival, on our line', 'dso-helix-nebula', { tag: 'photograph', legend: ['Drawn now', 'MPG/ESO 2.2-metre telescope'] });
    pull(0.35);
    turn(Math.PI / 3);
    await sleep(5000);
    if (sr.deep && sr.deep.whenReady) await sr.deep.whenReady(15000);
    await scene('03-helix-turned', 'the Helix, closer and turned 60 degrees off our line', 'dso-helix-nebula', { hint: 'Reconstructed', tag: 'reconstructed', legend: ['Reconstructed'] });
  }

  // 3. An illustration: the Milky Way from 46 kpc above its plane.
  sr.deselect();
  await stage('galaxy', 9000);
  if (await need('dso-milky-way')) {
    const ngp = eqToScene(192.85948, 27.12825);
    const kpc = 3.0856775814913673e16 / sr.stage.unitKm;
    rig.flyTo({ offset: ngp, distance: 46 * kpc, ms: 0 });
    await sleep(5000);
    await scene('04-milkyway', 'the Milky Way from 46 kpc above its plane', 'dso-milky-way', { hint: 'Illustration', legend: ['Illustration'] });
    const hon = out.scenes[out.scenes.length - 1].honesty || '';
    if (out.hasRow && !(/Measured:/.test(hon) && /Inferred:/.test(hon))) out.problems.push('the Milky Way\'s honesty line does not say what is measured and what inferred');
  }

  // 4. A measured world under the sky in other light: Mars with the infrared sky.
  sr.deselect();
  if (sr.otherLight && sr.otherLight.set) sr.otherLight.set('infrared', 1);
  await stage('mars', 9000);
  if (await need('mars', 7000)) await scene('05-mars-infrared', 'Mars, the sky behind it in infrared (WISE)', 'mars', { legend: ['Sky shown', 'Infrared', 'WISE', '2010 to 2011'] });
  if (sr.otherLight && sr.otherLight.set) sr.otherLight.set(null, 1);
} catch (e) {
  look.errors.push('probe threw: ' + (e && e.stack || e));
}

const res = finish({ ...out, phone });
if (out.problems.length) res.fail = out.problems.join(' | ');
return res;
