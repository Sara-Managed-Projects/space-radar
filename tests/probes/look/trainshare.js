// trainshare: the research train of 2026-11-24 (forge internal #545, #554, #555), in the real app.
//
// 1. THE NETWORK CHIPS at the top of the Earth tab, once the first view has settled (ui/networks.js).
// 2. QUESTIONS IN PLAIN WORDS: "starlink over Spain" and "satellites launched this week" each give a first row that says
//    what was understood; "birthday" gives the star of your year's row.
// 3. THE STAR OF YOUR YEAR: by its search row, a birthday and a town typed, the card in its three shapes; then by a link
//    (`#born=2024-01-25`), where no star is close enough yet and the card says the light is on its way.
// 4. THE EMBED TAB: the ISS's share sheet, the Share tab, then the Embed tab with its code.
// Fails when the chips never mounted, a question row is missing, the card never drew, or the Embed tab has no code.
// Run at 1440 x 900 and again with `-f mobile=true`.
look.probe = 'trainshare';
const out = { problems: [] };
const q = (s) => document.querySelector(s);
const type = async (text) => {
  const input = q('.sr-search__input');
  input.focus(); input.value = text; input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(1500);
};
const rows = () => [...document.querySelectorAll('[data-extra]')].map((n) => `${n.dataset.extra}: ${n.innerText.replace(/\s+/g, ' ').slice(0, 90)}`);
const clearSearch = async () => { const i = q('.sr-search__input'); if (i) { i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.blur(); } await sleep(800); };

// 1. The chips.
try {
  out.chips = await until(() => q('.sr-nets .sr-nets__chip'), 60000);
  if (!out.chips) out.problems.push('the network chips never mounted on the Earth tab');
  else {
    out.chipText = [...document.querySelectorAll('.sr-nets__chip')].map((b) => b.getAttribute('aria-label'));
    q('.sr-nets').scrollIntoView({ block: 'center' });
    await shot('networks-chips', `the Earth tab's network chips: ${out.chipText.slice(0, 4).join(' | ')}`, 800);
    const starlink = q('.sr-nets__chip[data-network="stations"]');
    if (starlink) { starlink.click(); await sleep(6000); await shot('networks-stations-lit', `Stations pressed: ${starlink.getAttribute('aria-pressed')}`); const c = q('.sr-nets__clear'); if (c && !c.hidden) c.click(); await sleep(1500); }
  }
} catch (e) { out.problems.push('chips: ' + String(e).slice(0, 200)); }

// 2. Questions.
try {
  await type('starlink over Spain');
  await until(() => q('[data-extra="ask"]'), 30000);
  out.askSpain = rows();
  if (!out.askSpain.some((r) => /^ask: .*Starlink.*Spain/.test(r))) out.problems.push(`"starlink over Spain" has no question row (${out.askSpain.join(' | ')})`);
  await shot('ask-starlink-spain', '"starlink over Spain" in the search field');
  await type('satellites launched this week');
  await until(() => q('[data-extra="ask"]'), 30000);
  out.askWeek = rows();
  if (!out.askWeek.some((r) => /^ask: .*7/.test(r))) out.problems.push(`"satellites launched this week" has no question row (${out.askWeek.join(' | ')})`);
  await shot('ask-launched-week', '"satellites launched this week"');
  await type('birthday');
  await until(() => q('[data-extra="yourstar"]'), 30000);
  out.birthdayRows = rows();
  await shot('search-birthday', '"birthday" finds the star of your year');
  const row = q('[data-extra="yourstar"]');
  if (!row) out.problems.push('"birthday" found no star-of-your-year row');
  else row.click();
} catch (e) { out.problems.push('questions: ' + String(e).slice(0, 200)); }

// 3. The star of your year.
try {
  const opened = await until(() => q('#sr-yourstar') && !q('#sr-yourstar').hidden, 30000);
  if (!opened) { out.problems.push('the star of your year never opened from its row'); }
  else {
    await clearSearch();
    await shot('yourstar-empty', 'the panel, before a birthday is typed', 600);
    const date = q('#sr-yourstar input[type="date"]');
    const town = q('#sr-yourstar input[type="text"]');
    date.value = '1993-06-12'; date.dispatchEvent(new Event('input', { bubbles: true }));
    town.value = 'London'; town.dispatchEvent(new Event('input', { bubbles: true }));
    q('#sr-yourstar form').requestSubmit();
    out.drew = await until(() => q('.sr-yourstar__img') && /^data:image\/png/.test(q('.sr-yourstar__img').src || ''), 90000);
    if (!out.drew) out.problems.push('the card never drew');
    out.state = sr.yourStar && sr.yourStar.state();
    out.facts = q('.sr-yourstar__facts') ? q('.sr-yourstar__facts').innerText.replace(/\s+/g, ' ').slice(0, 400) : null;
    out.hash = location.hash;
    if (!/born=1993-06-12/.test(location.hash)) out.problems.push(`the link does not carry the day (${location.hash})`);
    if (/London/i.test(location.hash)) out.problems.push('the town reached the link');
    await shot('yourstar-wide', `1993-06-12, London: ${out.facts}`, 800);
    for (const f of ['square', 'story']) {
      q(`#sr-yourstar [data-format="${f}"]`).click();
      await sleep(2500);
      await shot(`yourstar-${f}`, `the card, ${f}`);
    }
    // The card itself, full size, for the PR.
    out.card = q('.sr-yourstar__img').src.length;
    q('#sr-yourstar [data-format="landscape"]').click();
    await sleep(1500);
    q('#sr-yourstar .ui-close').click();
    await sleep(1500);
    location.hash = '#born=2024-01-25';
    await until(() => sr.yourStar && sr.yourStar.state() && sr.yourStar.state().born === '2024-01-25', 30000);
    await sleep(3000);
    out.onway = sr.yourStar.state();
    if (!out.onway || out.onway.kind !== 'onway') out.problems.push(`a birthday under four years old is not "on its way" (${JSON.stringify(out.onway)})`);
    await shot('yourstar-on-its-way', `#born=2024-01-25: ${q('.sr-yourstar__facts').innerText.replace(/\s+/g, ' ').slice(0, 300)}`, 800);
    q('#sr-yourstar .ui-close').click();
    await sleep(1500);
  }
} catch (e) { out.problems.push('your star: ' + String(e).slice(0, 200)); }

// 4. The Embed tab.
try {
  location.hash = '#at=sat-25544';
  await until(() => sr.selected && sr.selected() && sr.selected().id === 'sat-25544', 60000);
  await sleep(4000);
  await sr.share.open({});
  await until(() => q('#sr-share') && !q('#sr-share').hidden, 20000);
  await sleep(4000);
  await shot('share-tab', 'the share sheet, its Share tab');
  q('#sr-share-tab-embed').click();
  await sleep(1500);
  out.embed = q('.sr-share__code') ? q('.sr-share__code').value : null;
  if (!out.embed || !/\?embed=1&amp;at=sat-25544/.test(out.embed)) out.problems.push(`the Embed tab has no code for the ISS (${out.embed})`);
  await shot('share-embed-tab', `the Embed tab: ${out.embed}`);
  q('#sr-share [data-size="large"]').click();
  await sleep(800);
  await shot('share-embed-large', 'Large chosen');
} catch (e) { out.problems.push('embed: ' + String(e).slice(0, 200)); }

if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
