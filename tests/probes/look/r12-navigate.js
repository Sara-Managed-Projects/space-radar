// r12-navigate: where you are, and the way back (internal spec 0076 W3-d; internal #881, #883, #908).
//
// 1. THE LADDER, rung by rung from the Earth: the Solar System, the nearby stars, the Milky Way and the
//    Local Group, each reached by the continuous flight (scene/climb.js), with the rail of where you are
//    and its note at the join just crossed. The before is the first rung with the stage's pieces hidden.
// 2. THE CARDS: the Helix ("Milky Way › Helix Nebula"), Europa on Jupiter's stage (Back to Jupiter) and
//    TRAPPIST-1 e (Back to TRAPPIST-1, and the legend's door beside its system line, pressed). Each also
//    photographed with the stage's pieces hidden: the before, from the same place in the same run.
// 3. BACK, three times: TRAPPIST-1 e to Europa, Europa to the Helix, the Helix to the Earth as it was.
//
// Beside every picture: the chain, the parent button, the rail's words and note, the trail's size, the
// selection, whether the page scrolls sideways, and sr.perf's frame numbers where it has them. On a ref
// without the stage (no rail, no chain) it photographs the same places and fails nothing: that run is a
// before. Run it at 1600 x 900 and as a phone (`-f mobile=true`, 390 x 844; `-f width=320 -f height=700`).
look.probe = 'r12-navigate';
const out = { scenes: [], problems: [], hasStage: null, notes: [] };
const phone = innerWidth < 900;
const q = (s, root = document) => root.querySelector(s);
const seen = (n) => !!(n && !n.hidden && n.getClientRects().length);
const textOf = (n, cap = 300) => (seen(n) ? n.innerText.replace(/\s+/g, ' ').trim().slice(0, cap) : null);
const sheet = async (h) => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set(h); await sleep(900); } };
let nav = null;
try { nav = await import(new URL('js/ui/camundo.js', document.baseURI).href); } catch (e) { look.warns.push('probe: camundo.js: ' + e); }
const trailSize = () => (nav && nav.trailState ? nav.trailState().size : null);
try { if (sr.wantPerf && !sr.perf) await sr.wantPerf(); } catch (e) { look.warns.push('probe: sr.wantPerf: ' + e); }
const perfNow = async () => {
  if (!sr.perf) return null;
  sr.perf.mark();
  await until(() => sr.perf.count() >= 30, 15000, 100);
  const s = sr.perf.stats();
  return s ? { p50Ms: s.p50Ms, p95Ms: s.p95Ms, calls: s.calls, triangles: s.triangles, gpuMiB: s.gpu ? s.gpu.visibleMiB : null, netBytes: s.net ? s.net.bytes : null } : null;
};
/** The stage's pieces hidden, for the before: the rail, the card's chain and its way out, the badge's step down. */
const before = (on) => {
  let st = document.getElementById('r12nav-before');
  if (on && !st) {
    st = document.createElement('style');
    st.id = 'r12nav-before';
    st.textContent = '.sr-scalerail,.sr-card__where,.sr-card__legendlink{display:none!important}html{--sr-rail-h:0px!important}';
    document.head.appendChild(st);
  } else if (!on && st) st.remove();
};
const state = () => ({
  stage: sr.stage ? sr.stage.worldId : null,
  selected: sr.selected && sr.selected() ? sr.selected().id : null,
  chain: textOf(q('#sr-card .sr-card__chain')),
  parent: textOf(q('#sr-card .sr-card__parent')),
  rail: textOf(q('.sr-scalerail__line')),
  railBack: q('.sr-scalerail__back') ? q('.sr-scalerail__back').getAttribute('aria-label') : null,
  note: textOf(q('.sr-scalerail__note')),
  trail: trailSize(),
  sideways: document.scrollingElement.scrollWidth > innerWidth + 1,
});
const scene = async (name, note, expect = {}, { withBefore = false } = {}) => {
  const row = { name, note, ...state() };
  if (out.hasStage === null) out.hasStage = !!q('.sr-scalerail') || !!q('.sr-card__where');
  if (out.hasStage) {
    for (const [k, v] of Object.entries(expect)) {
      if (v instanceof RegExp ? !v.test(row[k] || '') : row[k] !== v) out.problems.push(`${name}: ${k} is ${JSON.stringify(row[k])}, not ${v}`);
    }
    if (row.sideways) out.problems.push(`${name}: the page scrolls sideways (${document.scrollingElement.scrollWidth} > ${innerWidth})`);
  }
  if (withBefore) { before(true); await shot(`${name}-before`, `${note} | before: the stage's pieces hidden`, 600); before(false); await sleep(300); }
  row.perf = await perfNow();
  out.scenes.push(row);
  await shot(name, `${note} | chain: ${row.chain}; parent: ${row.parent}; rail: ${row.rail}; note: ${row.note}; trail ${row.trail}`);
  return row;
};
const need = async (id, waitMs = 9000) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return null; }
  if (r.layer && sr.isLayerOn && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
  sr.select(r, { fly: true });
  await sleep(waitMs);
  if (sr.deep && sr.deep.whenReady) await sr.deep.whenReady(15000);
  return r;
};
/** The card's chain in view: on a phone the sheet at half, scrolled to where it is. */
const showWhere = async () => {
  if (phone) await sheet('half');
  const w = q('#sr-card .sr-card__where');
  if (w) { w.scrollIntoView({ block: 'center' }); await sleep(500); }
};
// A note is said once and stays NOTE_MS: it is read the moment it shows, whatever the shot catches.
const watchNotes = () => {
  const n = q('.sr-scalerail__note');
  const t = n ? textOf(n) : null;
  if (t && !out.notes.some((x) => x.text === t)) out.notes.push({ text: t, stage: sr.stage.worldId, atMs: Date.now() - lookT0 });
};
const noteTimer = setInterval(watchNotes, 200);

try {
  if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit();
  out.laterLayers = await until(() => !!sr.recordById('dso-helix-nebula'), 120000);
} catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }

try {
  // 1. The ladder, from the Earth out, one join at a time.
  sr.deselect();
  if (phone) await sheet('peek');
  const climb = sr.wantClimb ? await sr.wantClimb() : null;
  const RUNGS = [['sun', 3e9, 'Solar System', /Sun is/], ['stellar', 2.4e14, 'Nearby stars', /nearest star/], ['galaxy', 4e17, 'Milky Way', /centre/], ['local-group', 3e19, 'Local Group', /Andromeda/]];
  for (const [id, km, word, said] of RUNGS) {
    if (!climb) { look.warns.push('probe: no climb'); break; }
    let arrived = false;
    climb.to({ distanceKm: km, stage: id, onArrive: () => { arrived = true; } });
    await until(() => arrived || (!climb.state.active && sr.stage.worldId === id), 60000, 100);
    await until(() => seen(q('.sr-scalerail__note')), 2500, 100);
    await sleep(400);
    await scene(`ladder-${id}`, `the ladder at ${id}, reached by the continuous flight`, { stage: id, rail: new RegExp(word) }, { withBefore: id === 'sun' });
    if (out.hasStage && !out.notes.some((n) => said.test(n.text))) out.problems.push(`ladder-${id}: no note at the join (${JSON.stringify(out.notes.map((n) => n.text))})`);
  }
  if (climb) {
    let home = false;
    climb.toHome({ onArrive: () => { home = true; } });
    await until(() => home || (!climb.state.active && sr.stage.worldId === 'earth'), 60000, 100);
    await sleep(1500);
  }

  // 2. Three flights, each card with where it is.
  if (await need('dso-helix-nebula')) {
    await showWhere();
    await scene('card-helix', 'the Helix: Milky Way › Helix Nebula', { chain: /Milky Way.*Helix/ }, { withBefore: true });
  }
  await stage('jupiter', 9000);
  if (await need('europa', 8000)) {
    await showWhere();
    await scene('card-europa', 'Europa on Jupiter\'s stage: Sun › Jupiter › Europa, Back to Jupiter', { chain: /Sun.*Jupiter.*Europa/, parent: /Back to Jupiter/ }, { withBefore: true });
  }
  if (await need('exo-trappist-1-e', 14000)) {
    await showWhere();
    await scene('card-trappist', 'TRAPPIST-1 e: Milky Way › TRAPPIST-1 › TRAPPIST-1 e, Back to TRAPPIST-1', { chain: /Milky Way.*TRAPPIST-1.*TRAPPIST-1 e/, parent: /Back to TRAPPIST-1/ }, { withBefore: true });
    // The legend's door beside the system's line (internal #908): Sources open, the door pressed.
    const src = q('#sr-card [data-section="sources"] .sr-disc__head');
    if (src && src.getAttribute('aria-expanded') !== 'true') { src.click(); await sleep(300); }
    const door = q('#sr-card .sr-card__legendlink');
    if (door) {
      if (phone) await sheet('full');
      door.click();
      await until(() => q('#sr-card [data-section="truth"] .sr-rows'), 15000);
      await sleep(700);
      const row = { door: textOf(door), truthOpen: q('#sr-card [data-section="truth"] .sr-disc__head').getAttribute('aria-expanded'), focus: document.activeElement && document.activeElement.id };
      if (row.truthOpen !== 'true') out.problems.push('card-trappist: the legend door did not open "How we know"');
      out.legendDoor = row;
      await shot('card-trappist-legend', `the legend's door pressed: How we know open (${JSON.stringify(row)})`);
    } else if (out.hasStage) out.problems.push('card-trappist: no legend door beside the system line');
  }

  // 3. Back, three times, along the visitor's own path.
  if (phone) await sheet('peek');
  const expect = ['europa', 'dso-helix-nebula', null];
  for (let i = 0; i < 3; i += 1) {
    const b = q('.sr-scalerail__back');
    if (!seen(b)) { if (out.hasStage) out.problems.push(`back-${i + 1}: no Back on screen (trail ${trailSize()})`); break; }
    const label = b.getAttribute('aria-label');
    b.click();
    await sleep(5000);
    if (phone && expect[i]) await showWhere();
    const row = await scene(`back-${i + 1}`, `Back pressed (${label})`, {});
    if (out.hasStage && row.selected !== expect[i]) out.problems.push(`back-${i + 1}: Back went to ${row.selected}, not ${expect[i]}`);
  }
} catch (e) {
  look.errors.push('probe threw: ' + (e && e.stack || e));
}
clearInterval(noteTimer);

// A field named `fail` fails the job (_prelude.js): only where the stage's pieces exist and say something untrue.
if (out.problems.length && out.hasStage) out.fail = out.problems.join(' | ');
return finish({ ...out, phone });
