// moments-finish: release 1.6.2 (internal #1054 to #1057). Run it twice: at the default window for the cards, and with
// `-f mobile=true` (390 x 844) for the player's phone pass.
//   * the card of Baikonur Site 1 and of the Vostok 1 landing site with their Replay rows, and the card of the Saturn V's
//     pad (the vehicle's card) with its row; each card's Replay button must exist, be on screen and open the story;
//   * the player at 390 px: three stories, a few seconds each, with the chapters open, measuring every control of the
//     player: inside the window, not under another control, the one on top at its centre (so a tap reaches it), at least
//     36 px high, the page not wider than the window, the strip not covering more than 60 % of the height.
// Fails (look.errors) on any of those. Pictures: the cards, then the player at each second.
look.probe = 'moments-finish';
const out = { cards: {}, player: [] };
const text = (sel) => { const n = document.querySelector(sel); return n ? n.textContent : null; };
const W = window.innerWidth, H = window.innerHeight;
const phone = W <= 720;

// --- the cards ---------------------------------------------------------------------------------------------------
for (const [id, note] of [
  ['baikonur-site-1', 'the card of Baikonur Site 1, Gagarin\'s Start, with its Replay this moment row'],
  ['vostok-1-landing', 'the card of the Vostok 1 landing site near Smelovka, with its Replay row'],
  ['saturn-v-lc-39a', 'the card of the Saturn V on Launch Complex 39A (the vehicle\'s card) with its Replay row'],
]) {
  try {
    const rec = sr.recordById && sr.recordById(id);
    if (!rec) { look.errors.push(`${id}: no such record`); out.cards[id] = 'no record'; continue; }
    sr.select(rec);
    await until(() => document.querySelector('.sr-card [data-moment]'), 40000);
    const btn = document.querySelector('.sr-card [data-moment]');
    const r = btn ? btn.getBoundingClientRect() : null;
    out.cards[id] = { row: !!btn, story: btn && btn.dataset.moment, label: btn && btn.textContent, title: btn && btn.title, rect: r && [r.left, r.top, r.right, r.bottom].map(Math.round), name: text('.sr-card h2, .sr-card__name'), says: text('.sr-card') && text('.sr-card').slice(0, 400) };
    if (!btn) look.errors.push(`${id}: the card has no Replay this moment row`);
    else {
      btn.scrollIntoView({ block: 'center' });
      await shot(`card-${id}`, note, 1200);
      if (r.right > W + 1 || r.left < -1) look.errors.push(`${id}: the Replay row is off the window ${JSON.stringify(out.cards[id].rect)}`);
    }
  } catch (err) { look.errors.push(`probe: card ${id}: ${err && err.stack || err}`); }
}

// --- the player ---------------------------------------------------------------------------------------------------
const CONTROLS = '.sr-moment__close, .sr-moment__play, .sr-moment__scrub, .sr-moment__text, .sr-moment__director, .sr-moment__share';
const box = (n) => { const r = n.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
const measure = (tag, listOpen = false) => {
  const bad = [];
  const root = document.querySelector('.sr-moment');
  if (!root) return [`${tag}: no player on the page`];
  const nodes = [...document.querySelectorAll(CONTROLS)].filter((n) => n.offsetParent !== null && getComputedStyle(n).visibility !== 'hidden');
  const rects = nodes.map((n) => [n, box(n)]);
  for (const [n, r] of rects) {
    const name = n.className.split(' ').find((c) => c.startsWith('sr-moment__')) || n.tagName;
    if (r.l < -0.5 || r.t < -0.5 || r.r > W + 0.5 || r.b > H + 0.5) bad.push(`${tag}: ${name} leaves the window (${[r.l, r.t, r.r, r.b].map(Math.round)})`);
    if (r.h < 36 && !/scrub|track/.test(name)) bad.push(`${tag}: ${name} is only ${Math.round(r.h)} px high`);
    if (r.w < 30) bad.push(`${tag}: ${name} is only ${Math.round(r.w)} px wide`);
    const top = document.elementFromPoint(Math.min(W - 1, Math.max(0, (r.l + r.r) / 2)), Math.min(H - 1, Math.max(0, (r.t + r.b) / 2)));
    if (top && top !== n && !n.contains(top) && !top.contains(n)) bad.push(`${tag}: ${name} is covered at its centre by ${top.className || top.tagName}`);
  }
  for (let i = 0; i < rects.length; i += 1) for (let j = i + 1; j < rects.length; j += 1) {
    const a = rects[i][1], b = rects[j][1];
    const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (ox > 1 && oy > 1) bad.push(`${tag}: ${rects[i][0].className.split(' ')[1] || rects[i][0].tagName} overlaps ${rects[j][0].className.split(' ')[1] || rects[j][0].tagName} by ${Math.round(ox)} x ${Math.round(oy)}`);
  }
  const dock = document.querySelector('.sr-moment__dock'), head = document.querySelector('.sr-moment__head');
  if (dock) { const d = box(dock); if (!listOpen && d.h > H * 0.45) bad.push(`${tag}: the strip is ${Math.round(d.h)} px of ${H}`); if (d.l < -0.5 || d.r > W + 0.5) bad.push(`${tag}: the strip leaves the window`); }
  if (dock && head) { const d = box(dock), h = box(head); if (d.t < h.b + 8) bad.push(`${tag}: the strip (top ${Math.round(d.t)}) touches the title card (bottom ${Math.round(h.b)})`); }
  // Anything of the app's own, outside the player, drawn over its title card or its strip (the scale rail's Back sat under
  // the title card in the first look of 2026-11-02): every visible fixed or absolute box outside the player that crosses them.
  for (const part of [head, dock]) {
    if (!part) continue;
    const pr = box(part);
    for (const n of document.body.querySelectorAll('*')) {
      if (root.contains(n) || n === root || n.contains(root) || n.tagName === 'CANVAS' || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue;
      const cs = getComputedStyle(n);
      if (!(cs.position === 'fixed' || cs.position === 'absolute') || cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = box(n);
      if (r.w < 4 || r.h < 4) continue;
      const ox = Math.min(pr.r, r.r) - Math.max(pr.l, r.l), oy = Math.min(pr.b, r.b) - Math.max(pr.t, r.t);
      if (ox > 2 && oy > 2) bad.push(`${tag}: ${n.id || n.className || n.tagName} (outside the player) overlaps the ${part === head ? 'title card' : 'strip'} by ${Math.round(ox)} x ${Math.round(oy)}`);
    }
  }
  // A word cut off by its box: any text node of the player wider than the box that holds it.
  for (const n of document.querySelectorAll('.sr-moment__title, .sr-moment__caption, .sr-moment__truth, .sr-moment__met, .sr-moment__rate, .sr-moment__chapter, .sr-moment__rowname')) {
    if (n.offsetParent !== null && n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX !== 'visible') bad.push(`${tag}: ${n.className.split(' ')[0]} is cut at the side (${n.scrollWidth} > ${n.clientWidth})`);
  }
  if (document.documentElement.scrollWidth > W + 1) bad.push(`${tag}: the page is ${document.documentElement.scrollWidth} px wide in a ${W} px window`);
  return bad;
};

const STORIES = [
  ['vostok-1', [[-4, 'pad'], [127, 'strapons'], [5848, 'ejection']]],
  ['apollo-11', [[9930, 'tli'], [370070, 'landed']]],
  ['artemis-ii', [[-3, 'pad'], [433550, 'flyby']]],
];
for (const [id, frames] of STORIES) {
  try {
    location.hash = `#moment=${id}&t=${frames[0][0]}`;
    const up = await until(() => sr.replay && sr.replay.state().id === id && sr.replay.state().status === 'ready' && sr.replay.state().vehicles.every((v) => v.loaded), 150000);
    if (!up) { look.errors.push(`${id}: the moment never came up`); continue; }
    for (const [t, name] of frames) {
      sr.replay.pause(); sr.replay.seek(t); await sleep(4500);
      const bad = measure(`${id} ${name}`);
      bad.forEach((b) => look.errors.push(b));
      out.player.push({ id, name, t, window: [W, H], met: text('.sr-moment__met'), shown: text('.sr-moment__rate'), caption: text('.sr-moment__caption'), bad });
      await shot(`player-${id}-${name}`, `${id} at ${text('.sr-moment__met')} in a ${W} x ${H} window: ${bad.length ? bad.length + ' problems' : 'no control clipped, covered or overlapping'}`);
    }
    // The chapters open in place: the list must fit above the strip and every row must be reachable.
    const b = document.querySelector('.sr-moment__text');
    if (b) {
      b.click(); await sleep(800);
      const list = document.querySelector('.sr-moment__chapters');
      const rows = [...document.querySelectorAll('.sr-moment__row')];
      const bad = measure(`${id} chapters`, true);
      if (list && !list.hidden) {
        const lr = box(list);
        if (lr.t < 0 || lr.l < -0.5 || lr.r > W + 0.5) bad.push(`${id} chapters: the list leaves the window (${[lr.l, lr.t, lr.r, lr.b].map(Math.round)})`);
        const scrolls = list.scrollHeight > list.clientHeight + 1;
        if (lr.b - lr.t > H * 0.5) bad.push(`${id} chapters: the list is ${Math.round(lr.b - lr.t)} px of ${H}`);
        out.player.push({ id, name: 'chapters', rows: rows.length, list: [lr.l, lr.t, lr.r, lr.b].map(Math.round), scrolls });
        rows.forEach((r) => { r.scrollIntoView({ block: 'nearest' }); });
        const last = rows[rows.length - 1];
        if (last) { const rr = box(last); if (rr.b > H + 0.5 || rr.t < -0.5) bad.push(`${id} chapters: the last row is not reachable (${Math.round(rr.t)}..${Math.round(rr.b)})`); }
      } else bad.push(`${id} chapters: the list did not open`);
      bad.forEach((x) => look.errors.push(x));
      await shot(`player-${id}-chapters`, `${id}: the chapters open above the strip, ${W} x ${H}`, 600);
      b.click();
    }
  } catch (err) { look.errors.push(`probe: ${id}: ${err && err.stack || err}`); }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(2500);
}
out.phone = phone;
return finish(out);
