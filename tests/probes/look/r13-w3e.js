// r13-w3e: entrances, bookmarks, confidence filters and photo presets (release 1.3.0 stage W3-e, internal spec 0077 task 19), one walk.
//   1. a first visit's welcome: the three ways in (Tonight, Explore, Guided trip), each button's box; Tonight pressed opens the Tonight tab;
//   2. What to show at "How we know": the four classes with their counts and sentences; then "Measured only" pressed: the status line, the dot on
//      the rail's button, the map with only the measured dots, and "All" again;
//   3. Jupiter's share sheet with Photo presets and Arrival views both open; Go on "From above the plane", the camera where the link says
//      (az, polar, distance read back), and "In the plane";
//   4. each photo preset in photo mode (science, cinematic, telescope, object card): the frame, the lens, the shutter and the look it wears,
//      and that leaving photo mode gives the visitor's own shutter and look back.
// Run at 1600 x 900 and with -f mobile=true. On a ref from before the stage (-f ref=main) the controls are not there: each state is photographed
// as it is (the BEFORE: the two-button welcome, What to show with no section, a share sheet with no rows) and nothing fails for what is not yet built.
look.probe = 'r13-w3e';
const out = { problems: [], notes: [] };
const after = typeof sr.setConfidence === 'function';
out.after = after;
const need = (ok, what) => { if (!ok && after) out.problems.push(what); else if (!ok) out.notes.push('before: ' + what); return ok; };
const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
const byText = (sel, text) => [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().startsWith(text)) || null;
const settle = (ms = 1200) => sleep(ms);

// --- 1. the welcome ----------------------------------------------------------------------------
try { localStorage.removeItem('sr:welcome'); } catch { /* the welcome is then shown by hand */ }
if (sr.welcome && sr.welcome.show) await sr.welcome.show();
await until(() => document.querySelector('.sr-welcome'), 15000, 200);
await settle(1500);
const entrances = [...document.querySelectorAll('.sr-welcome__actions .sr-welcome__btn')];
out.entrances = entrances.map((b) => ({ text: b.textContent.trim(), box: box(b), title: b.title }));
need(entrances.length === 3, 'three entrances (got ' + entrances.length + ')');
for (const b of entrances) need(b.getBoundingClientRect().height >= 44 && b.getBoundingClientRect().width >= 44, 'an entrance is at least 44 px each way: ' + b.textContent.trim());
const wel = document.querySelector('.sr-welcome');
out.welcomeBox = box(wel);
need(!wel || wel.getBoundingClientRect().right <= innerWidth && wel.scrollWidth <= wel.clientWidth + 1, 'the welcome does not overflow sideways');
await shot('1-welcome', 'a first visit: the home\'s section, with its three lines and the three ways in (before: two buttons)', 600);
const tonight = byText('.sr-welcome__btn', 'Tonight');
if (tonight) {
  tonight.click();
  await settle(4000);
  const tab = document.querySelector('.sr-tabs__tab[aria-selected="true"]');
  out.tabAfterTonight = tab ? tab.dataset.tab : null;
  need(out.tabAfterTonight === 'tonight', 'Tonight opens the Tonight tab (got ' + out.tabAfterTonight + ')');
  need(!document.querySelector('.sr-welcome'), 'the welcome is put away');
  need(document.querySelectorAll('.sr-tabs__tab').length === 4, 'and all four tabs are still there');
  await shot('2-tonight', 'after Tonight: the Tonight tab, nothing hidden: the tabs, the rail and the search are all where they were', 1500);
  if (sr.explore && sr.explore.setTab) { sr.explore.setTab('earth'); await settle(5000); }
}

// --- 2. How we know ----------------------------------------------------------------------------
if (sr.rail && sr.rail.openShow) {
  sr.rail.openShow();
  await settle(1500);
  const section = document.querySelector('[data-confidence]');
  need(!!section, 'What to show has the section "How we know"');
  if (section) {
    section.scrollIntoView({ block: 'center' });
    await settle(800);
    out.confidenceRows = [...section.querySelectorAll('.sr-show__row')].map((r) => ({ name: r.querySelector('.sr-show__name').textContent, count: r.querySelector('.sr-show__count').textContent, hint: r.querySelector('.sr-show__hint').textContent, box: box(r.querySelector('.sr-show__label')) }));
    need(out.confidenceRows.length === 4, 'four classes');
    for (const r of section.querySelectorAll('.sr-show__label')) need(r.getBoundingClientRect().height >= 36, 'a row is at least 36 px high');
    out.confidenceBefore = { drawn: sr.layers ? null : null, filter: sr.confidence ? sr.confidence() : null };
    await shot('3-wts-how-we-know', 'What to show at "How we know": the four classes, their counts and the legend\'s own sentence under each (before: no such section)', 400);
    const only = byText('.sr-confidence .sr-show__bulkbtn', 'Measured');
    if (only) {
      only.click();
      await settle(2500);
      const status = section.querySelector('.sr-confidence__status');
      out.status = status ? status.textContent : null;
      out.filter = sr.confidence();
      out.railDot = !!(document.querySelector('.sr-rail__btn--show') && document.querySelector('.sr-rail__btn--show').classList.contains('is-filtered'));
      need(out.filter && out.filter.length === 1 && out.filter[0] === 'measured', 'Measured only filters to measured');
      need(out.railDot, 'the rail\'s button wears the dot');
      need(status && !status.hidden && /of/.test(status.textContent), 'the status line says "n of m"');
      section.scrollIntoView({ block: 'center' });
      await shot('4-wts-measured-only', 'Measured only: the status line "n of m dots" and the dot on the rail\'s button', 600);
      sr.rail.closeShow();
      await settle(2500);
      out.drawnFiltered = frameCost();
      await shot('5-map-measured-only', 'the map with only the measured dots (the popover shut; the rail\'s dot is the visitor\'s clue)', 1500);
      sr.rail.openShow();
      await settle(800);
      byText('.sr-confidence .sr-show__bulkbtn', 'All').click();
      await settle(1500);
      out.filterAfterAll = sr.confidence();
      need(out.filterAfterAll === null, 'All puts every dot back');
      need(!(document.querySelector('.sr-rail__btn--show') && document.querySelector('.sr-rail__btn--show').classList.contains('is-filtered')), 'and the rail\'s dot goes');
    }
  } else {
    // BEFORE: the same popover, scrolled to Colour by, which is where the section goes.
    const colour = document.querySelector('.sr-colourkey');
    if (colour) { colour.scrollIntoView({ block: 'center' }); await settle(600); }
    await shot('3-wts-how-we-know', 'before: What to show at Colour by; there is no "How we know" section', 400);
  }
  sr.rail.closeShow();
  await settle(800);
}

// --- 3. the share sheet on Jupiter: presets, arrival views ---------------------------------------
sr.setStage('jupiter');
await settle(9000);
const jupiter = sr.recordById('jupiter');
if (!jupiter) { look.missing.push('jupiter'); out.problems.push('no record jupiter'); }
else {
  sr.select(jupiter, { fly: true, undo: false });
  await settle(7000);
  await shot('6-jupiter', 'Jupiter at the app\'s own arrival: where Go and the views start from', 300);
  const openSheet = async () => { await sr.share.open({ record: jupiter, opener: document.querySelector('.sr-rail__btn--share') || document.body }); await settle(1500); };
  await openSheet();
  const presetsRow = byText('.sr-share__row', 'Photo presets');
  const viewsRow = byText('.sr-share__row', 'Arrival views');
  need(!!presetsRow && !!viewsRow, 'the sheet has Photo presets and Arrival views');
  if (presetsRow && viewsRow) {
    out.rowsShut = [presetsRow.getAttribute('aria-expanded'), viewsRow.getAttribute('aria-expanded')];
    need(out.rowsShut.join() === 'false,false', 'both rows are shut when the sheet opens');
    presetsRow.click(); viewsRow.click();
    await settle(2500);
    const rows = [...document.querySelectorAll('.sr-share__viewrow')];
    out.viewRows = rows.map((r) => ({ words: r.querySelector('.sr-share__viewtitle').textContent, box: box(r), buttons: [...r.querySelectorAll('.sr-share__viewbtn')].map((b) => ({ t: b.textContent, box: box(b) })) }));
    need(rows.length === 2, 'two authored views of Jupiter (got ' + rows.length + ')');
    for (const b of document.querySelectorAll('.sr-share__viewbtn')) need(b.getBoundingClientRect().height >= (matchMedia('(pointer: coarse)').matches ? 44 : 24), 'a view button is big enough');
    out.presetButtons = [...document.querySelectorAll('.sr-share__preset')].map((b) => ({ id: b.dataset.preset, box: box(b), hidden: b.hidden }));
    need(out.presetButtons.filter((b) => !b.hidden).length === 4, 'four presets for an object');
    const sheetEl = document.getElementById('sr-share');
    out.sheetBox = box(sheetEl);
    presetsRow.scrollIntoView({ block: 'start' });
    await shot('7-share-presets-views', 'Jupiter\'s share sheet, Photo presets and Arrival views open: four presets, two authored views with Go and Copy (before: neither row)', 600);
    // Go: "From above the plane".
    const before = sr.camPose();
    rows[0].querySelector('.sr-share__viewbtn').click();
    await settle(12000);
    const pose = sr.camPose();
    out.fromAbove = { before, pose, hash: location.hash, stage: sr.stage.worldId, selected: sr.selected() && sr.selected().id };
    need(Math.abs(pose.polarDeg - 12) < 3, 'From above: the camera stands at polar 12 (got ' + Math.round(pose.polarDeg * 10) / 10 + ')');
    need(Math.abs(pose.distanceKm / (69911 * 5) - 1) < 0.1, 'five radii away (got ' + Math.round(pose.distanceKm) + ' km)');
    await shot('8-jupiter-from-above', 'Go on "From above the plane": Jupiter from near the ecliptic\'s north, five radii out', 800);
    await openSheet();
    byText('.sr-share__row', 'Arrival views').click();
    await settle(1500);
    const rows2 = [...document.querySelectorAll('.sr-share__viewrow')];
    rows2[1].querySelector('.sr-share__viewbtn').click();
    await settle(12000);
    const pose2 = sr.camPose();
    out.inPlane = { pose: pose2, hash: location.hash };
    need(Math.abs(pose2.polarDeg - 90) < 3, 'In the plane: the camera stands at polar 90 (got ' + Math.round(pose2.polarDeg * 10) / 10 + ')');
    await shot('9-jupiter-in-plane', 'Go on "In the plane": Jupiter level with the planets\' orbits', 800);
    // Save this view, then the list shows it (a saved row with Remove).
    await openSheet();
    byText('.sr-share__row', 'Arrival views').click();
    await settle(1500);
    document.querySelector('.sr-share__viewsave').click();
    await settle(800);
    out.savedRows = document.querySelectorAll('.sr-share__viewrow').length;
    need(out.savedRows === 3, 'Save adds a row (got ' + out.savedRows + ')');
    const rm = byText('.sr-share__viewrow:last-child .sr-share__viewbtn, .sr-share__viewrow .sr-share__viewbtn', 'Remove');
    out.removeSeen = !!rm;
    document.querySelector('.sr-share__viewsave').scrollIntoView({ block: 'center' });
    await shot('10-views-saved', 'Save this view: a saved row with its pose and Remove, beside the two authored ones', 600);
    if (rm) { rm.click(); await settle(500); try { localStorage.removeItem('sr:arrival-views'); } catch { /* nothing kept */ } }
    if (sr.share.close) sr.share.close();
    await settle(500);
  }

  // --- 4. the four presets ---------------------------------------------------------------------
  out.presets = {};
  const own = { exposure: sr.exposure ? sr.exposure.mode() : null, look: sr.look ? sr.look() : null };
  out.own = own;
  for (const [n, id] of [[11, 'science'], [12, 'cinematic'], [13, 'telescope'], [14, 'card']]) {
    await openSheet();
    const row = byText('.sr-share__row', 'Photo presets');
    if (!row) { need(false, 'no presets row for ' + id); break; }
    if (row.getAttribute('aria-expanded') !== 'true') row.click();
    await settle(600);
    const btn = document.querySelector('.sr-share__preset[data-preset="' + id + '"]');
    if (!btn || btn.hidden) { need(false, 'no preset button ' + id); continue; }
    btn.click();
    await settle(4500);
    const st = sr.photo && sr.photo.state ? sr.photo.state() : null;
    const cam = sr.camera;
    out.presets[id] = { state: st && { shape: st.shape, preset: st.preset, tag: st.tag, caption: st.caption, lens: st.lens, words: st.words }, exposure: sr.exposure.mode(), look: sr.look(), fov: cam ? cam.fov : null, rect: st && st.rect };
    need(st && st.preset === id, id + ': photo mode is open with the preset');
    await shot(n + '-preset-' + id, 'photo mode with the ' + id + ' preset: shape ' + (st && st.shape) + ', lens ' + (st && st.lens) + ', shutter ' + sr.exposure.mode() + ', look ' + sr.look() + (st && st.tag ? ', with the object\'s tag' : ''), 800);
    if (sr.photo) sr.photo.close();
    await settle(1200);
    need(sr.exposure.mode() === own.exposure && sr.look() === own.look, id + ': leaving photo mode gives back the visitor\'s shutter and look (' + sr.exposure.mode() + ', ' + sr.look() + ')');
    need(!document.getElementById('sr-photo'), id + ': photo mode is gone');
  }
  need(out.presets.cinematic ? out.presets.cinematic.exposure === 'deep' && out.presets.cinematic.look === 'film' : false, 'the cinematic frame wore Deep and Film');
  need(out.presets.science ? out.presets.science.look === 'measured' : false, 'the science frame wore Measured');
  need(out.presets.telescope ? out.presets.telescope.state && out.presets.telescope.state.lens === 15 : false, 'the telescope view wore the 15 degree lens');
  need(out.presets.card ? out.presets.card.state && out.presets.card.state.tag === true && out.presets.card.state.shape === '4:5' : false, 'the object card is 4:5 with the tag');
}

out.history = { hash: location.hash };
const fail = out.problems.length ? out.problems.join('; ') : undefined;
return finish({ out, fail });
