// compare: Compare and the comparison lab on a world's card, the passport's kinds and notes, and the photograph
// slider on a deep-sky card (internal i#885, i#909, i#911, i#776; release 1.3.0, stage W2-d).
//
// ONE run per width walks every state, and photographs each: Jupiter's card with Compare opened (side by side,
// to scale, with the Earth), the same at one width, Saturn (rings) with Jupiter, the Sun beside the Earth (the
// Earth under a pixel, said so), the Earth with the Moon, then the lab ordered by width and by temperature; the
// passport after real visits (every planet, a station, a probe, a comet, a star, a nebula) with its kinds and
// notes; and the Helix at the slider's 0, 50 and 100 per cent, on its line and turned 60 degrees away.
// Run it at 1600 x 900 (`-f width=1600 -f height=900`) and again with `-f mobile=true` (390 x 844).
//
// It fails when a control is under 44 px on a phone (24 on a desktop), when the panel scrolls sideways, when a
// state never came up, when the table has a NaN or an undefined, when the lab does not list eleven worlds, when
// the slider hides the hero without drawing the photograph, or when a note of the passport is missing after the
// visits that earn it. Nothing in the app is changed for it.
look.probe = 'compare';
const out = { states: [], problems: [] };
const phone = innerWidth < 700;
const press = (el) => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); };
const q = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
const textOf = (sel) => { const e = q(sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
const boxOf = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };

/** Controls under the floor (44 px high on a phone, 24 on a desktop) inside `root`, and sideways scroll. */
const audit = (name, root) => {
  const floor = phone ? 44 : 24;
  const small = qa('button, select, input, a[href]', root).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < floor - 0.5 || r.width < floor - 0.5); })
    .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} ${boxOf(e).slice(2).join('x')} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}"`);
  if (small.length) out.problems.push(`${name}: controls under ${floor} px: ${small.slice(0, 6).join('; ')}`);
  const sc = root.closest('#sr-side, .sr-sheet, #sr-card') || root;
  if (sc.scrollWidth > sc.clientWidth + 1) out.problems.push(`${name}: scrolls sideways (${sc.scrollWidth} > ${sc.clientWidth})`);
  const bad = /NaN|undefined|\[object|null/.exec(root.textContent);
  if (bad) out.problems.push(`${name}: the text has "${bad[0]}"`);
  return { small: small.length };
};
const snap = async (name, note, root, extra = {}) => {
  const row = { name, note, ...audit(name, root || document.body), ...extra };
  out.states.push(row);
  await shot(name, note, 700);
  return row;
};

/** Open a world's card with its Compare row open and the row brought to the top of the card's scroll. */
const openCompare = async (id) => {
  const r = sr.recordById(id);
  if (!r) { out.problems.push('missing record ' + id); look.missing.push(id); return false; }
  sr.select(r, { fly: true, undo: false });
  await until(() => q('#sr-disc-compare'), 20000, 200);
  const head = q('#sr-disc-compare');
  if (!head) { out.problems.push(id + ': no Compare row on the card'); return false; }
  if (head.getAttribute('aria-expanded') !== 'true') press(head);
  const ok = await until(() => q('.sr-vs__svg'), 20000, 200);
  if (!ok) { out.problems.push(id + ': Compare opened and drew nothing'); return false; }
  await sleep(800);
  head.scrollIntoView({ block: 'start' });
  return true;
};
const choose = (value, group) => { const b = qa(`.sr-vs [data-group="${group}"]`).find((x) => x.dataset.value === value); if (b) press(b); else out.problems.push(`no ${group} choice "${value}"`); };
const withBody = (id) => { const s = q('.sr-vs__select'); if (!s) { out.problems.push('no select for ' + id); return; } s.value = id; s.dispatchEvent(new Event('change', { bubbles: true })); };

try { if (sr.loadAfterFirstVisit && !sr.laterLayersLoaded()) await sr.loadAfterFirstVisit(); } catch (e) { look.warns.push('loadAfterFirstVisit: ' + e); }

// --- 1. Compare, side by side ------------------------------------------------------------------------
if (await openCompare('jupiter')) {
  await snap('01-jupiter-earth', 'Jupiter beside the Earth, to one scale: the sentence, the picture, the table', q('.sr-vs'));
  out.jupiter = { rows: qa('.sr-vs__row').length, legend: textOf('.sr-vs__legend'), sentence: textOf('.sr-vs__sentence'), source: textOf('.sr-vs__source') };
  if (out.jupiter.rows !== 11) out.problems.push('the table has ' + out.jupiter.rows + ' rows, not 11');
  choose('same', 'scale');
  await sleep(500);
  q('.sr-vs__figure').scrollIntoView({ block: 'center' });
  await snap('02-jupiter-earth-same-width', 'the same pair at one width, and the line that says it is not to scale', q('.sr-vs'));
}
if (await openCompare('saturn')) {
  choose('true', 'scale');
  withBody('jupiter');
  await sleep(500);
  q('.sr-vs__figure').scrollIntoView({ block: 'center' });
  await snap('03-saturn-jupiter', 'Saturn beside Jupiter: Saturn\'s rings to scale from NASA\'s ring sheet, Jupiter\'s faint ring', q('.sr-vs'), { bands: qa('.sr-vs__svg path, .sr-vs__svg ellipse').length });
}
if (await openCompare('sun')) {
  choose('true', 'scale');
  withBody('earth');
  await sleep(500);
  q('.sr-vs__figure').scrollIntoView({ block: 'center' });
  await snap('04-sun-earth', 'the Sun beside the Earth: the Earth is under a pixel and the page says so', q('.sr-vs'), { tinyNote: /under a pixel/.test(textOf('.sr-vs__drawn') || '') });
  if (!/under a pixel/.test(textOf('.sr-vs__drawn') || '')) out.problems.push('the Sun beside the Earth did not say the Earth is a dot');
}
if (await openCompare('earth')) {
  out.earthWith = q('.sr-vs__select') ? q('.sr-vs__select').value : null;
  if (out.earthWith !== 'moon') out.problems.push('the Earth did not begin with the Moon (' + out.earthWith + ')');
  await snap('05-earth-moon', 'the Earth beside the Moon', q('.sr-vs'));
  // --- 2. the lab -------------------------------------------------------------------------------------
  choose('lab', 'mode');
  await sleep(500);
  const rows = qa('.sr-vs__labbtn');
  out.lab = { rows: rows.length, first: rows[0] ? textOf('.sr-vs__labname') : null };
  if (rows.length !== 11) out.problems.push('the lab lists ' + rows.length + ' worlds, not 11');
  q('.sr-vs__select').scrollIntoView({ block: 'start' });
  await snap('06-lab-width', 'all worlds by width: the Sun first, the Earth in ember, the Moon, the bars logarithmic', q('.sr-vs'));
  const sel = q('.sr-vs__select'); sel.value = 'temp'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
  sel.scrollIntoView({ block: 'start' });
  await snap('07-lab-temperature', 'all worlds by temperature, with the line about a giant\'s 1 bar level', q('.sr-vs'));
  // A row of the lab becomes the other body of the pair.
  const mars = qa('.sr-vs__labbtn').find((b) => b.dataset.world === 'mars');
  if (mars) { press(mars); await sleep(500); out.afterPick = { select: q('.sr-vs__select') && q('.sr-vs__select').value, pressed: textOf('.sr-vs [aria-pressed="true"]') }; if (out.afterPick.select !== 'mars') out.problems.push('a lab row did not become the other body'); }
  // Keyboard: the first control of the panel takes Tab from the row above, and the card stays whole.
  out.focusable = qa('.sr-vs button, .sr-vs select').length;
}

// --- 3. the passport: real visits, then its second page ----------------------------------------------
try { if (sr.wantPassport) await sr.wantPassport(); } catch (e) { look.warns.push('wantPassport: ' + e); }
{
  const visit = async (id) => { const r = sr.recordById(id); if (!r) { look.missing.push(id); return false; } sr.select(r, { fly: false, undo: false }); await sleep(250); return true; };
  const ids = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'sat-25544', 'dso-helix-nebula', 'dso-m31'];
  for (const id of ids) await visit(id);
  // a star, a comet, a probe, a telescope and an exoplanet: the first of each that the catalogue has
  const firstOf = (klass) => { try { return (sr.records ? sr.records() : []).find((r) => r.klass === klass); } catch { return null; } };
  for (const k of ['star', 'comet', 'probe', 'telescope', 'exoplanet']) { const r = firstOf(k); if (r) { sr.select(r, { fly: false, undo: false }); await sleep(250); } else look.missing.push('a ' + k); }
  sr.deselect();
  await sleep(600);
  const pp = sr.passport;
  if (!pp) { out.problems.push('no passport on the page (ctx.passport)'); }
  else {
    pp.open();
    await until(() => q('.sr-passport__kinds'), 15000, 200);
    out.passport = { kinds: qa('.sr-passport__kinds .sr-list__name').map((e) => e.textContent), noted: qa('.sr-passport__noted .sr-list__name').map((e) => e.textContent), counts: pp.counts() };
    for (const need of ['A first place', 'All eight planets', 'A space station']) if (!out.passport.noted.includes(need)) out.problems.push('the passport did not note "' + need + '" (' + out.passport.noted.join(', ') + ')');
    const view = q('.sr-passport');
    if (view) { q('.sr-passport__kinds').scrollIntoView({ block: 'start' }); await snap('08-passport-kinds', 'the passport after real visits: opened by kind, in a fixed order, and what is noted with the day', view); }
    else out.problems.push('the passport view did not open');
    const words = (view ? view.textContent : '').toLowerCase();
    for (const bad of ['score', 'level', 'streak', 'badge', 'unlock', 'rank']) if (words.includes(bad)) out.problems.push('the passport says "' + bad + '"');
  }
}

// --- 4. the photograph slider ---------------------------------------------------------------------------
try { if (sr.wantNebulae) await sr.wantNebulae(); } catch (e) { look.warns.push('wantNebulae: ' + e); }
try { if (sr.wantDeep) await sr.wantDeep(); } catch (e) { look.warns.push('wantDeep: ' + e); }
{
  const id = 'dso-helix-nebula';
  const r = sr.recordById(id);
  if (!r) { out.problems.push('no Helix record'); look.missing.push(id); }
  else {
    if (r.layer && !sr.isLayerOn(r.layer)) sr.setLayerOn(r.layer, true);
    sr.select(r, { fly: true, undo: false });
    await until(() => sr.nebulae && sr.nebulae.loaded && sr.nebulae.loaded().includes(id), 90000, 500);
    await sleep(4000);
    // About it opens the photograph block, where the slider is.
    const about = q('#sr-disc-about');
    if (about && about.getAttribute('aria-expanded') !== 'true') press(about);
    const found = await until(() => q('.sr-photocmp__field'), 30000, 300);
    if (!found) out.problems.push('the Helix card has no photograph slider');
    else {
      const field = q('.sr-photocmp__field');
      const drive = async (v) => { field.value = String(v); field.dispatchEvent(new Event('input', { bubbles: true })); await sleep(3500); };
      const read = (name) => ({ name, k: sr.nebulae.compareK(id), photo: Math.round(sr.nebulae.drawn(id) * 100) / 100, line: Math.round(sr.nebulae.lineShare(id) * 100) / 100, hero: ((sr.deep && sr.deep.stats().heroes) || []).map((h) => ({ id: h.id, share: h.share })) });
      field.scrollIntoView({ block: 'center' });
      out.slider = [];
      for (const v of [0, 50, 100]) {
        await drive(v);
        out.slider.push({ v, ...read('slider-' + v) });
        await snap('09-helix-slider-' + v, 'the Helix, slider at ' + v + ' per cent', q('.sr-photocmp'), { value: field.getAttribute('aria-valuetext') });
      }
      const at100 = out.slider[2];
      if (!(at100.photo > 0.9)) out.problems.push('at 100 the photograph is drawn at ' + at100.photo + ', not whole');
      const heroAt100 = at100.hero.find((h) => h.id === 'helix');
      if (heroAt100 && heroAt100.share > 0.05) out.problems.push('at 100 the hero is still drawn at ' + heroAt100.share);
      // Turned away from the line: the photograph fades with it, and so does the slider's hold on the hero.
      rig.flyTo({ azimuth: rig.state.azimuth + Math.PI / 3, polar: rig.state.polar, ms: 0 });
      await sleep(3500);
      out.turned = read('turned-60');
      await shot('10-helix-slider-100-turned', 'slider at 100, turned 60 degrees off the line: the photograph is flat and has faded', 500);
      // Another selection puts the slider back to the reconstruction, and nothing is left behind.
      sr.deselect();
      await sleep(1200);
      out.afterDeselect = { k: sr.nebulae.compareK(id) };
      if (out.afterDeselect.k !== 0) out.problems.push('the slider was not put back when the card went');
    }
  }
}

if (out.problems.length) out.fail = out.problems.join(' | ').slice(0, 1500);
return finish(out);
