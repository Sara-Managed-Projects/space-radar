// r339-names: can every word of the Planets tab be read (internal #339)? Seven sections, each measured and photographed:
//   chart    "Our planets side by side" (ui/find.js openChart): two names printed over one another, a name that starts
//            outside the picture, type under 13 px;
//   sliders  the Size and Distance sliders in the tab, and on a phone the sheet pulled to full height to reach them: the
//            scale badge lying over the sheet's words;
//   planets  the Sun's stage at Size x1, x50, x500 and x2000 and Distance true, half and logarithmic (ui/orrery.js): for every
//            name, the share of its box that lies on a drawn disc and whether it has a backing plate (a quarter or more of
//            the box on a disc with no plate is a finding), and the names that gave their place up; then Jupiter, Saturn and
//            the Sun from close at x2000, where a disc fills most of the screen;
//   views    the same census in the normal views: the Earth with the Moon in frame, Jupiter and its four big moons, the Sun's
//            stage from 0.9 AU (Mercury and Venus beside the Sun's disc);
//   badge    the scale badge (ui/scalebadge.js) at three slider positions and with Jupiter selected: a line that is cut off,
//            ends in an ellipsis or leaves the badge or the window;
//   compare  Jupiter's card, the Compare row (ui/compare.js): a number broken across two lines, text under 4.5:1;
//   lang     the chart, the badge and the Compare row again in German and Hebrew, each in a same-origin frame (`?lang=`).
// `-f subject=planets_badge` runs those sections alone. A finding is written down (`findings`), not a failure: on a ref from
// before the fix this run is the before. Run it at 1440 x 900 and with `-f mobile=true`.
look.probe = 'r339-names';
const out = { findings: [], chart: {}, sliders: {}, planets: [], close: {}, views: {}, badge: [], compare: {}, languages: {} };
const SUBJECT = new URLSearchParams(location.search).get('lookSubject') || '';
const want = (s) => !SUBJECT || SUBJECT.split('_').includes(s);
const rr = (r) => [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
const parseC = (c) => { const m = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/.exec(c || ''); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
const over = (top, bot) => [0, 1, 2].map((i) => top[i] * top[3] + bot[i] * (1 - top[3])).concat(1);
const lum = (c) => { const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

/** The measuring kit for one window: the page itself, or a language's frame. */
const kit = (W) => {
  const D = W.document;
  const S = W.spaceRadar;
  const phone = D.documentElement.classList.contains('sr-phone');
  const cam = () => S.camera || (S.cameraRig && S.cameraRig.camera);
  const ids = () => (S.worlds && Array.isArray(S.worlds.worlds) ? S.worlds.worlds.map((w) => w.id) : ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  const visible = (e) => {
    if (!e || e.hidden || !e.getClientRects().length) return false;
    for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const s = W.getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false; }
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  /** A world's disc on the screen: centre and radius of its silhouette in CSS px, or null when it is not in front of the camera. */
  const disc = (id) => {
    const m = S.worlds.meshFor(id);
    const c = cam();
    if (!m || !m.visible || !c) return null;
    const p = m.position.clone();
    const d = p.distanceTo(c.position);
    const r = m.scale.x;
    if (!(d > r)) return null;
    p.project(c);
    if (p.z > 1 || p.z < -1) return null;
    const f = (W.innerHeight / 2) / Math.tan((c.fov * Math.PI) / 360);
    return { id, x: (p.x + 1) * 0.5 * W.innerWidth, y: (1 - p.y) * 0.5 * W.innerHeight, r: (f * r) / Math.sqrt(d * d - r * r) };
  };
  const discs = () => ids().map(disc).filter((d) => d && d.r > 3 && d.x + d.r > 0 && d.y + d.r > 0 && d.x - d.r < W.innerWidth && d.y - d.r < W.innerHeight);
  const panels = () => ['#sr-side', '#sr-rail', '#sr-time', '#sr-top', '.sr-scalebadge', '.sr-card', '.sr-pop'].map((s) => [s, D.querySelector(s)]).filter(([, e]) => visible(e)).map(([s, e]) => [s, e.getBoundingClientRect()]);
  /** Every name on the scene: its box, the share of it on a disc (12 x 4 samples), its plate, what it is under or outside. */
  const names = () => {
    const ds = discs();
    const ps = panels();
    const rows = [];
    for (const n of D.querySelectorAll('#labels .label')) {
      if (!visible(n)) continue;
      const b = n.getBoundingClientRect();
      const which = {};
      let hit = 0;
      for (let i = 0; i < 12; i += 1) for (let j = 0; j < 4; j += 1) {
        const x = b.left + ((i + 0.5) * b.width) / 12;
        const y = b.top + ((j + 0.5) * b.height) / 4;
        const on = ds.find((d) => Math.hypot(x - d.x, y - d.y) < d.r);
        if (on) { hit += 1; which[on.id] = 1; }
      }
      const cs = W.getComputedStyle(n);
      const bg = parseC(cs.backgroundColor);
      const under = ps.find(([, r]) => Math.min(b.right, r.right) - Math.max(b.left, r.left) > 2 && Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > 2);
      rows.push({
        name: n.textContent.trim(), kind: n.dataset.kind, box: rr(b), onDisc: Math.round((100 * hit) / 48), on: Object.keys(which).join(','),
        plate: !!(bg && bg[3] > 0.5), under: under ? under[0] : '', outside: b.left < 0 || b.top < 0 || b.right > W.innerWidth || b.bottom > W.innerHeight,
      });
    }
    // The names that were measured this tick and gave their place up (under a panel, or across a higher-ranked name): where each was put.
    const yielded = [...D.querySelectorAll('#labels .label')].filter((n) => n.hidden && n.textContent.trim()).map((n) => `${n.textContent.trim()} ${(n.style.transform.match(/translate\(([^)]*)\)/) || [])[1] || ''}`).slice(0, 12);
    return { discs: ds.map((d) => [d.id, Math.round(d.x), Math.round(d.y), Math.round(d.r)]), names: rows, yielded, panels: ps.map(([sel, r]) => [sel, rr(r)]) };
  };
  /** The names a reader cannot read: on a disc with nothing behind the letters, under a panel, or off the window. */
  const census = (where) => {
    const c = names();
    // Unreadable: a quarter or more of its box on a disc with nothing behind the letters (less is a corner of the name on a limb,
    // which labels.js leaves to the text's shadow), under a panel, or off the window.
    c.bad = c.names.filter((n) => (n.onDisc >= 25 && !n.plate) || n.under || n.outside).map((n) => `${n.name}: ${n.onDisc}% on ${n.on || 'no disc'}${n.plate ? ', plate' : ''}${n.under ? ', under ' + n.under : ''}${n.outside ? ', outside the window' : ''}`);
    for (const b of c.bad) out.findings.push(`${where}: ${b}`);
    return c;
  };
  const sheet = async (h) => { const s = S.shell && S.shell.sheet && S.shell.sheet(); if (phone && s && s.set) { s.set(h); await sleep(900); } };
  /** The Planets tab with its sliders, on the Sun's stage, framed. */
  const planetsTab = async () => {
    try { S.explore.setTab('planets'); } catch (e) { look.warns.push('setTab: ' + e); }
    if (S.stage.worldId !== 'sun') { S.setStage('sun'); await sleep(9000); }
    const orr = await S.wantOrrery();
    await sleep(1500);
    if (S.frameSolarSystem) S.frameSolarSystem();
    await sleep(3000);
    return orr;
  };
  /** The badge: its words, its box, and each line that is cut, ends in an ellipsis, or leaves the badge or the window. */
  const badge = () => {
    const b = D.querySelector('.sr-scalebadge');
    if (!visible(b)) return { missing: true };
    const box = b.getBoundingClientRect();
    const lines = [...b.children].filter(visible).map((e) => {
      const r = e.getBoundingClientRect();
      const cs = W.getComputedStyle(e);
      return {
        cls: e.className, text: e.textContent.trim(), box: rr(r), rows: Math.round(r.height / parseFloat(cs.lineHeight || '18')),
        cut: e.scrollWidth > e.clientWidth + 1, ellipsis: e.scrollWidth > e.clientWidth + 1 && cs.textOverflow === 'ellipsis',
        leaves: r.right > box.right + 1 || r.left < box.left - 1 || r.bottom > box.bottom + 1,
      };
    });
    return { text: b.textContent.trim(), box: rr(box), outside: box.right > W.innerWidth || box.left < 0, lines };
  };
  const badgeAt = async (where) => {
    const b = badge();
    if (b.missing) out.findings.push(`${where}: no badge on screen`);
    else {
      if (b.outside) out.findings.push(`${where}: the badge leaves the window`);
      for (const l of b.lines) if (l.cut || l.leaves) out.findings.push(`${where}: "${l.text}" is ${l.ellipsis ? 'cut with an ellipsis' : l.cut ? 'cut' : 'outside its badge'}`);
    }
    return b;
  };
  /** Jupiter's card with the Compare row open: broken numbers, low contrast, lines that leave the card. */
  const compare = async (where, shotName) => {
    const rec = S.recordById('jupiter');
    if (!rec) return { missing: 'no jupiter record' };
    S.select(rec, { fly: false, undo: false });
    await sleep(3500);
    await sheet('full');
    const head = D.querySelector('#sr-disc-compare');
    if (!head) return { missing: 'no Compare row on the card' };
    if (head.getAttribute('aria-expanded') !== 'true') head.click();
    await until(() => D.querySelector('.sr-vs__table'), 30000);
    await sleep(2500);
    const vs = D.querySelector('.sr-vs');
    if (!vs) return { missing: 'the Compare row did not open' };
    const backdrop = (el, behind) => {
      const layers = [];
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parseC(W.getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
      return layers.reverse().reduce((bot, top) => over(top, bot), behind);
    };
    const res = { box: rr(vs.getBoundingClientRect()), broken: [], low: [], wide: [], minContrast: 99, sample: [] };
    const NUM = /\d[\d   .,]*\d/g;
    for (const e of vs.querySelectorAll('*')) {
      if (e.closest('svg') || e.closest('select') || !visible(e)) continue;
      const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!own.length) continue;
      const cs = W.getComputedStyle(e);
      const text = own.map((n) => n.nodeValue.trim()).join(' ');
      for (const n of own) {
        let m;
        NUM.lastIndex = 0;
        while ((m = NUM.exec(n.nodeValue))) {
          const g = D.createRange();
          g.setStart(n, m.index);
          g.setEnd(n, m.index + m[0].length);
          const tops = new Set([...g.getClientRects()].filter((x) => x.width > 0).map((x) => Math.round(x.top)));
          if (tops.size > 1) res.broken.push(`${m[0]} in "${text.slice(0, 50)}"`);
        }
      }
      let fg = parseC(cs.color) || [255, 255, 255, 1];
      let op = 1;
      for (let p = e; p && p.nodeType === 1; p = p.parentElement) op *= parseFloat(W.getComputedStyle(p).opacity || '1');
      fg = [fg[0], fg[1], fg[2], fg[3] * op];
      // The card is glass over the scene: the worst a light letter can have behind it is a white cloud, the usual is the sky.
      const onWhite = backdrop(e, [255, 255, 255, 1]);
      const onSky = backdrop(e, [11, 14, 20, 1]);
      const cw = ratio(over(fg, onWhite), onWhite);
      const ck = ratio(over(fg, onSky), onSky);
      res.minContrast = Math.min(res.minContrast, cw);
      const r = e.getBoundingClientRect();
      const row = { cls: String(e.className).replace(/sr-vs__/g, ''), text: text.slice(0, 60), px: cs.fontSize, overWhite: Math.round(cw * 100) / 100, overSky: Math.round(ck * 100) / 100 };
      if (cw < 4.5) res.low.push(row);
      if (r.width > 2 && (r.right > W.innerWidth + 1 || r.left < -1 || e.scrollWidth > e.clientWidth + 1)) res.wide.push({ ...row, box: rr(r) }); // (not the 1 px headings a screen reader has)
      if (res.sample.length < 60) res.sample.push(row);
    }
    res.minContrast = Math.round(res.minContrast * 100) / 100;
    for (const b of res.broken) out.findings.push(`${where}: a number is broken across lines: ${b}`);
    for (const l of res.low) out.findings.push(`${where}: ${l.overWhite}:1 over a white cloud (${l.overSky}:1 over the sky), ${l.px}: "${l.text}"`);
    for (const l of res.wide) out.findings.push(`${where}: wider than its box or the window: "${l.text}"`);
    res.badgeOver = badgeOver(where);
    // Two pictures: the picture and the legend, then the table and its notes.
    head.scrollIntoView({ block: 'start' });
    await shot(`${shotName}-1`, `${where}: the Compare row, its picture`, 900);
    const table = vs.querySelector('.sr-vs__table');
    if (table) { table.scrollIntoView({ block: 'start' }); await shot(`${shotName}-2`, `${where}: the table: ${res.broken.length} broken numbers, lowest contrast ${res.minContrast}:1`, 900); }
    const foot = vs.querySelector('.sr-vs__source');
    if (foot) { foot.scrollIntoView({ block: 'end' }); await shot(`${shotName}-3`, `${where}: the table's end and its source line`, 900); }
    return res;
  };
  /** Is the badge drawn over the panel's or the sheet's own words? What lies under its middle says. */
  const badgeOver = (where) => {
    const b = D.querySelector('.sr-scalebadge');
    if (!visible(b)) return '';
    const r = b.getBoundingClientRect();
    // What is under its middle, the scene and the names on it apart: a panel's or the sheet's own element.
    const under = D.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find((e) => !b.contains(e) && !/^(CANVAS|HTML|BODY)$/.test(e.tagName) && !e.closest('#labels'));
    if (!under) return '';
    const host = under.closest('#sr-side, .sr-card, .sr-pop, .sr-find, [id]') || under;
    const what = `"${b.textContent.trim().slice(0, 50)}" lies over ${host.id ? '#' + host.id : '.' + String(host.className).split(' ')[0]} at ${rr(r)}`;
    out.findings.push(`${where}: the badge ${what}`);
    return what;
  };
  /** "Our planets side by side": each word's box, the pairs that overlap, the words outside the picture or under 13 px. */
  const chart = async (where, shotName) => {
    try { S.explore.setTab('planets'); } catch (e) { look.warns.push('setTab: ' + e); }
    const f = await S.wantFind();
    if (!f) return { missing: 'the find panel did not load' };
    f.open('property', { chart: 'sun', run: false });
    await until(() => D.querySelector('.sr-find__chart .sr-find__bodyname'), 30000);
    await sleep(2500);
    const box = D.querySelector('.sr-find__chart');
    if (!box || !box.querySelector('.sr-find__bodyname')) return { missing: 'no chart' };
    await sheet('full');
    box.scrollIntoView({ block: 'center' });
    await sleep(900);
    // The words are texts of one picture on a ref from before the fix and spans of the page after it: the same two classes.
    const frame = box.getBoundingClientRect();
    const words = [...box.querySelectorAll('.sr-find__bodyname, .sr-find__bodysub')].filter((n) => n.textContent.trim()).map((n) => ({ text: n.textContent.trim(), r: n.getBoundingClientRect(), px: parseFloat(W.getComputedStyle(n).fontSize) }));
    const scroller = box.querySelector('.sr-find__chartscroll');
    const res = { frame: rr(frame), scrolls: !!scroller && scroller.scrollWidth > scroller.clientWidth + 1, words: words.map((w) => [w.text, rr(w.r), w.px]), overlaps: [], outside: [], small: [] };
    for (let i = 0; i < words.length; i += 1) {
      const a = words[i];
      if (a.r.left < frame.left - 0.5 || a.r.right > frame.right + 0.5) res.outside.push(a.text);
      if (a.px < 13) res.small.push(`${a.text} (${a.px} px)`);
      for (let j = i + 1; j < words.length; j += 1) {
        const b = words[j];
        const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
        const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
        if (w > 1 && h > 1) res.overlaps.push(`${a.text} / ${b.text} (${Math.round(w)} x ${Math.round(h)} px)`);
      }
    }
    for (const o of res.overlaps) out.findings.push(`${where}: two words printed over one another: ${o}`);
    for (const o of res.outside) out.findings.push(`${where}: starts or ends outside the picture: ${o}`);
    if (res.small.length) out.findings.push(`${where}: ${res.small.length} words under 13 px, e.g. ${res.small[0]}`);
    res.badgeOver = badgeOver(where);
    await shot(shotName, `${where}: ${words.length} words, ${res.overlaps.length} overlapping pairs, ${res.outside.length} outside the picture, ${res.small.length} under 13 px${res.scrolls ? '; scrolls sideways' : ''}`);
    try { f.close(); } catch { /* an older panel */ }
    return res;
  };
  /** The sliders in the tab; on a phone the sheet is pulled to full height to reach them. */
  const sliders = async (where, shotName, orr) => {
    const box = D.querySelector('.sr-orrery');
    if (!box) return { missing: 'no sliders in the tab' };
    orr.set({ size: 500, dist: 0.5 }, { frame: true });
    await sheet('full');
    await sleep(2500);
    const res = { atTop: badgeOver(`${where}, the top of the tab`) };
    await shot(`${shotName}-top`, `${where}: the top of the Planets tab${res.atTop ? ': the badge ' + res.atTop : ''}`);
    box.scrollIntoView({ block: 'center' });
    await sleep(900);
    res.box = rr(box.getBoundingClientRect());
    res.atSliders = badgeOver(`${where}, at the sliders`);
    res.text = [...box.querySelectorAll('label, output, p, h2, button')].filter(visible).map((e) => { const cs = W.getComputedStyle(e); return [e.textContent.trim().slice(0, 50), cs.fontSize, e.scrollWidth > e.clientWidth + 1 ? 'CUT' : '']; });
    for (const t of res.text) if (t[2]) out.findings.push(`${where}: cut: "${t[0]}"`);
    await shot(`${shotName}-sliders`, `${where}: the Size and Distance sliders${res.atSliders ? ': the badge ' + res.atSliders : ''}`);
    orr.set({ size: 1, dist: 0 }, { frame: true });
    await sleep(1500);
    return res;
  };
  return { W, D, S, phone, cam, disc, census, sheet, planetsTab, badge, badgeAt, badgeOver, chart, sliders, compare };
};

const K = kit(window);
const phoneTag = K.phone ? 'phone' : 'desktop';
out.phone = K.phone;

// --- planets: every slider position, then three discs from close -------------------------------------------------
let orr = null;
if (want('chart')) out.chart.en = await K.chart(`chart (${phoneTag})`, 'chart-en');
if (want('planets') || want('badge') || want('sliders')) orr = await K.planetsTab();
if (want('sliders') && orr) out.sliders.en = await K.sliders(`sliders (${phoneTag})`, 'sliders-en', orr);
if (want('planets') && orr) {
  await K.sheet('peek');
  const GRID = [[1, 0, 1], [50, 0, 0], [500, 0, 1], [2000, 0, 1], [1, 0.5, 0], [50, 0.5, 0], [500, 0.5, 1], [2000, 0.5, 0], [1, 1, 0], [50, 1, 0], [500, 1, 0], [2000, 1, 1]];
  for (const [size, dist, pic] of GRID) {
    orr.set({ size, dist }, { frame: true });
    await sleep(3200);
    const where = `planets size ${size} dist ${dist}`;
    const c = K.census(where);
    out.planets.push({ size, dist, hash: location.hash, discs: c.discs, names: c.names, bad: c.bad });
    if (pic) await shot(`planets-size${size}-dist${dist}`, `${where}: ${c.names.length} names, ${c.bad.length} unreadable${c.bad.length ? ': ' + c.bad.join('; ').slice(0, 160) : ''}`);
  }
  // From close, at the classroom's end of both sliders: a disc that fills most of the screen still has its name.
  orr.set({ size: 2000, dist: 1 }, { frame: true });
  await sleep(3200);
  for (const [id, k] of [['jupiter', 6], ['jupiter', 2.2], ['saturn', 3], ['sun', 2.4], ['earth', 2.6]]) {
    const at = sr.worlds.drawnPositionOf(id);
    const r = sr.worlds.drawnRadiusUnits(id);
    if (!at || !(r > 0)) { look.missing.push(id); continue; }
    // From the lit side (a camera sent anywhere photographs the night): the Sun three tenths off the line of sight.
    const offset = id === 'sun' ? undefined : unit(mix(sunward(id), 1, north(id), 0.3));
    rig.flyTo({ targetScene: at, distance: k * r, offset, ms: 0 });
    await sleep(3500);
    const where = `close to ${id} (${k} radii, size 2000, log distances)`;
    const c = K.census(where);
    const own = c.discs.find((d) => d[0] === id);
    out.close[`${id}-${k}`] = { disc: own, names: c.names, bad: c.bad };
    await shot(`close-${id}-${String(k).replace('.', '_')}`, `${where}: disc ${own ? own[3] : '?'} px in radius; ${c.names.length} names, ${c.bad.length} unreadable${c.bad.length ? ': ' + c.bad.join('; ').slice(0, 160) : ''}`);
  }
  orr.set({ size: 1, dist: 0 }, { frame: true });
  await sleep(2500);
}

// --- badge: three positions and a selected planet ---------------------------------------------------------------------
if (want('badge') && orr) {
  await K.sheet('peek');
  for (const [size, dist] of [[1, 0], [200, 0.5], [2000, 1]]) {
    orr.set({ size, dist }, { frame: true });
    await sleep(3000);
    const where = `badge size ${size} dist ${dist}`;
    const b = await K.badgeAt(where);
    out.badge.push({ size, dist, ...b });
    await shot(`badge-size${size}-dist${dist}`, `${where}: ${b.missing ? 'no badge' : b.lines.map((l) => `"${l.text}"${l.cut ? ' CUT' : ''}${l.leaves ? ' LEAVES' : ''}`).join(' / ')}`);
  }
  const jr = sr.recordById('jupiter');
  if (jr) {
    sr.select(jr, { fly: false, undo: false });
    await sleep(3500);
    await K.sheet('half');
    const b = await K.badgeAt('badge with Jupiter selected');
    out.badge.push({ selected: 'jupiter', ...b });
    await shot('badge-jupiter-selected', `Jupiter selected at size 2000, log distances: ${b.missing ? 'no badge' : b.lines.map((l) => `"${l.text}"${l.cut ? ' CUT' : ''}${l.leaves ? ' LEAVES' : ''}`).join(' / ')}`);
  }
  try { sr.deselect(); } catch (e) { look.warns.push('deselect: ' + e); }
  orr.set({ size: 1, dist: 0 }, { frame: true });
  await sleep(2000);
}

// --- compare: Jupiter's card ---------------------------------------------------------------------------------------------
if (want('compare')) {
  out.compare.en = await K.compare(`compare (${phoneTag})`, 'compare-en');
  try { sr.deselect(); } catch (e) { look.warns.push('deselect: ' + e); }
  await sleep(1200);
}

// --- views: the same census where no slider is involved -------------------------------------------------------------------
if (want('views')) {
  try { sr.deselect(); rig.stopFollow(); } catch (e) { look.warns.push('deselect: ' + e); }
  await K.sheet('peek');
  const view = async (name, where, note) => { await sleep(3500); const c = K.census(where); out.views[name] = c; await shot(`view-${name}`, `${note}: ${c.names.length} names, ${c.bad.length} unreadable${c.bad.length ? ': ' + c.bad.join('; ').slice(0, 160) : ''}`); };
  const AU = 149597870.7;
  // The Sun's stage, true sizes, from 0.9 AU and low over the plane: Mercury and Venus beside the Sun's own disc.
  if (sr.stage.worldId !== 'sun') await stage('sun');
  rig.flyTo({ targetScene: sr.worlds.drawnPositionOf('sun'), distance: (0.9 * AU) / sr.stage.unitKm, ms: 0 });
  await view('sun-inner', 'the Sun from 0.9 AU', 'the Sun\'s stage from 0.9 AU, sizes true');
  rig.flyTo({ targetScene: sr.worlds.drawnPositionOf('sun'), distance: (0.02 * AU) / sr.stage.unitKm, ms: 0 });
  await view('sun-close', 'the Sun from 0.02 AU', 'the Sun\'s disc filling a third of the view');
  // Jupiter's stage: the disc and its four big moons.
  await stage('jupiter');
  await view('jupiter-arrival', 'Jupiter at arrival', 'Jupiter\'s stage as Go there frames it');
  rig.flyTo({ distance: rig.state.distance * 6, ms: 0 });
  await view('jupiter-moons', 'Jupiter and its moons', 'Jupiter from six times the arrival distance: the big moons');
  // The Moon's stage with the Earth in frame, and the Earth's with the Moon.
  await stage('moon');
  await view('moon-arrival', 'the Moon at arrival', 'the Moon\'s stage as Go there frames it');
  await stage('earth');
  await view('earth-home', 'the Earth at home', 'the Earth\'s stage as it opens');
  rig.flyTo({ distance: rig.state.distance * 25, ms: 0 });
  await view('earth-moon', 'the Earth and the Moon', 'the Earth from 25 times the opening distance: the Moon in frame');
}

// --- lang: the badge and the Compare row in a long language and a right-to-left one -------------------------------------
if (want('lang')) {
  for (const code of ['de', 'he']) {
    const rec = {};
    out.languages[code] = rec;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:#000';
    frame.src = `/?sw=0&look=1&lang=${code}`;
    document.body.appendChild(frame);
    const w = () => frame.contentWindow;
    const ok = await until(() => { try { return w() && w().__srLayersReady && w().spaceRadar; } catch { return false; } }, 600000, 500);
    if (!ok) { rec.fail = 'the frame never said its layers were ready'; look.warns.push(`${code}: ${rec.fail}`); frame.remove(); continue; }
    await sleep(6000);
    const F = kit(w());
    rec.htmlLang = F.D.documentElement.lang;
    rec.dir = F.D.documentElement.dir;
    try {
      rec.chart = await F.chart(`${code} chart (${phoneTag})`, `${code}-chart`);
      const fo = await F.planetsTab();
      await F.sheet('peek');
      fo.set({ size: 2000, dist: 0.5 }, { frame: true });
      await sleep(3500);
      rec.badge = await F.badgeAt(`${code} badge`);
      rec.names = F.census(`${code} planets size 2000 dist 0.5`);
      await shot(`${code}-badge`, `${code}: the badge at size 2000, distances half way: ${rec.badge.missing ? 'no badge' : rec.badge.lines.map((l) => `"${l.text}"${l.cut ? ' CUT' : ''}${l.leaves ? ' LEAVES' : ''}`).join(' / ')}`);
      fo.set({ size: 1, dist: 0 }, { frame: true });
      await sleep(2000);
      rec.badgeTrue = await F.badgeAt(`${code} badge at true size`);
      rec.compare = await F.compare(`${code} compare (${phoneTag})`, `${code}-compare`);
    } catch (e) { rec.fail = String((e && e.stack) || e).slice(0, 400); look.warns.push(`${code}: ${rec.fail}`); }
    frame.remove();
    await sleep(1500);
  }
}

out.findingCount = out.findings.length;
return finish(out);
