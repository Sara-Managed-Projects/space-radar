// r12-access: readable without WebGL, without motion, and a full link (internal spec 0076 W4-c; internal
// #906, #912, #919; advances #836).
//
// 1. WITH WEBGL 2 REFUSED: index.html is written into a full-window frame with canvas.getContext('webgl2')
//    answering null, as a browser without it does. scene/renderer.js must put the readable page up, the
//    boot panel away, and no failure panel. Photographed at the top and at the trips.
// 2. WITH JAVASCRIPT OFF: the same page in a frame that may not run scripts (sandbox without allow-scripts),
//    so the <noscript> is real markup. Same two pictures.
//    Both are measured: the title, the links and the trips counted, every link's height, whether the page
//    scrolls sideways, and what the boot panel is doing.
// 3. MOTION: What to show with the Motion row On, then Off (the picture is the row). Off is then asked:
//    does a flight arrive on the spot, and does a trip read at the reader's pace? On, the control.
// 4. THE LINK: a view's Share link is read: it must carry v=1 and the build.
// 5. THE SUMMARY: the scene summary's words at the Earth, with the Moon selected, in a trip.
// 6. AXE over the page in two states (the behind-the-scenes check is tests/probes/axe-probe.js; this is the same
//    rules inside a look run: tests/probes/look/r12-access.axe asks look.yml to put axe-core behind the prelude).
//
// Run it at 1600 x 900 and as a phone (`-f mobile=true`, 390 x 844). The "before" of the readable page is the
// line "Space Radar needs JavaScript." that main had; it is not photographed, its text is in the PR.
look.probe = 'r12-access';
const out = { problems: [], readable: {}, motion: {}, link: {}, summary: [], axe: {} };
const base = location.origin + location.pathname.replace(/[^/]*$/, '');

// ---- 1 and 2: the readable page in a frame -----------------------------------------------------
const holder = () => {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483000;background:#000';
  f.setAttribute('title', 'r12-access probe frame');
  return f;
};
const measure = (win) => {
  const d = win.document;
  const page = d.getElementById('sr-readable');
  if (!page) return { found: false, boot: d.getElementById('boot') ? win.getComputedStyle(d.getElementById('boot')).display : null, failed: !!d.querySelector('.boot-failed') };
  const links = [...page.querySelectorAll('a')];
  const tall = links.map((a) => a.getBoundingClientRect().height);
  const boot = d.getElementById('boot');
  const why = [...page.querySelectorAll('.sr-readable__why')].filter((p) => !p.hidden).map((p) => p.textContent.trim());
  return {
    found: true,
    title: (page.querySelector('.sr-readable__title') || {}).textContent,
    why,
    links: links.length,
    trips: page.querySelectorAll('a[href^="t/"]').length,
    shortestLinkPx: Math.round(Math.min(...tall)),
    sideways: d.scrollingElement.scrollWidth > win.innerWidth + 1 || page.scrollWidth > page.clientWidth + 1,
    scrollable: page.scrollHeight > page.clientHeight + 1,
    pageHeight: page.scrollHeight,
    viewportH: win.innerHeight,
    boot: boot ? win.getComputedStyle(boot).display + (boot.hidden ? ' hidden' : '') + (boot.classList.contains('gone') ? ' gone' : '') : 'none',
    failedPanel: !!d.querySelector('.boot-failed'),
    font: win.getComputedStyle(page).fontFamily.slice(0, 40),
    text: page.innerText.replace(/\s+/g, ' ').slice(0, 220),
  };
};
const shotFrame = async (name, note, f) => {
  const page = f.contentDocument.getElementById('sr-readable');
  if (page) page.scrollTop = 0;
  await shot(`${name}-top`, note);
  if (page && page.scrollHeight > page.clientHeight + 1) {
    const h2 = [...page.querySelectorAll('h2')].pop();
    if (h2) h2.scrollIntoView({ block: 'start' });
    await sleep(300);
    await shot(`${name}-trips`, `${note} (scrolled to the trips)`);
  }
};
{
  // 1. WebGL 2 refused.
  const f = holder();
  document.body.appendChild(f);
  try {
    const html = await (await fetch(base + 'index.html')).text();
    const patch = `<base href="${base}"><script>{const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(/webgl/i.test(String(t)))return null;return g.call(this,t,...a);};}<\/script>`;
    f.contentDocument.open();
    f.contentDocument.write(html.replace('<head>', '<head>' + patch));
    f.contentDocument.close();
    const got = await until(() => f.contentDocument.getElementById('sr-readable') || f.contentDocument.querySelector('.boot-failed'), 120000, 300);
    await sleep(800);
    const m = measure(f.contentWindow);
    out.readable.noWebgl2 = m;
    if (!got || !m.found) out.problems.push('no WebGL 2: the readable page did not appear');
    else {
      if (!m.why.some((t) => /WebGL 2/.test(t))) out.problems.push('no WebGL 2: the page does not say WebGL 2 is the reason: ' + JSON.stringify(m.why));
      if (m.failedPanel) out.problems.push('no WebGL 2: the failure panel is also showing');
      if (m.sideways) out.problems.push('no WebGL 2: the page scrolls sideways');
      if (m.shortestLinkPx < 44) out.problems.push(`no WebGL 2: a link is ${m.shortestLinkPx} px tall`);
      if (m.trips < 30) out.problems.push(`no WebGL 2: ${m.trips} trips listed`);
      await shotFrame('nowebgl2', 'WebGL 2 refused: what a visitor reads', f);
    }
  } catch (e) { out.problems.push('no WebGL 2 frame: ' + e); }
  f.remove();
}
{
  // 2. JavaScript off: a frame that may not run scripts, so the noscript is markup.
  const f = holder();
  f.setAttribute('sandbox', 'allow-same-origin');
  document.body.appendChild(f);
  try {
    f.src = base + 'index.html';
    await new Promise((res) => { f.onload = res; setTimeout(res, 60000); });
    await until(() => f.contentDocument && f.contentDocument.getElementById('sr-readable'), 30000, 200);
    await sleep(1200);
    const m = measure(f.contentWindow);
    out.readable.noJs = m;
    if (!m.found) out.problems.push('no JavaScript: the readable page is not there');
    else {
      if (!m.why.some((t) => /JavaScript/.test(t))) out.problems.push('no JavaScript: the page does not say JavaScript is the reason: ' + JSON.stringify(m.why));
      if (!/none/.test(m.boot)) out.problems.push('no JavaScript: the boot panel is still showing: ' + m.boot);
      if (m.sideways) out.problems.push('no JavaScript: the page scrolls sideways');
      if (m.shortestLinkPx < 44) out.problems.push(`no JavaScript: a link is ${m.shortestLinkPx} px tall`);
      await shotFrame('nojs', 'JavaScript off: what a visitor reads', f);
    }
  } catch (e) { out.problems.push('no JavaScript frame: ' + e); }
  f.remove();
}
await sleep(500);

// ---- 3. motion ---------------------------------------------------------------------------------
const phone = innerWidth < 900;
const pop = () => document.querySelector('.sr-show');
const motionRow = () => document.querySelector('.sr-motion');
const flightNow = async (id) => {
  sr.deselect();
  await sleep(800);
  const r = sr.recordById(id);
  if (!r) { look.missing.push(id); return null; }
  sr.select(r, { fly: true, undo: false });
  const flyingAtOnce = !!(sr.cameraRig && sr.cameraRig.state && sr.cameraRig.state.flying);
  await sleep(300);
  return flyingAtOnce;
};
try {
  if (sr.rail && sr.rail.openShow) sr.rail.openShow(); else out.problems.push('no sr.rail.openShow');
  await until(() => motionRow(), 8000, 200);
  const row = motionRow();
  if (!row) out.problems.push('the Motion row is not in What to show');
  else {
    row.scrollIntoView({ block: 'center' });
    await sleep(400);
    const state = () => ({
      attr: document.documentElement.dataset.srMotion || null,
      pressed: [...row.querySelectorAll('button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.dataset.motion),
      note: row.querySelector('.sr-quality__note') && !row.querySelector('.sr-quality__note').hidden ? row.querySelector('.sr-quality__note').textContent : null,
      heightPx: Math.round(Math.min(...[...row.querySelectorAll('button')].map((b) => b.getBoundingClientRect().height))),
    });
    out.motion.row = { on: state() };
    await shot('motion-row-on', 'What to show: the Motion row, On');
    const osReduces = matchMedia('(prefers-reduced-motion: reduce)').matches;
    out.motion.osReduces = osReduces;
    // Off, by pressing it.
    const off = row.querySelector('[data-motion="off"]');
    off.click();
    await sleep(300);
    out.motion.row.off = state();
    if (document.documentElement.dataset.srMotion !== 'off') out.problems.push('pressing Off did not set data-sr-motion');
    if (!out.motion.row.off.pressed.includes('off')) out.problems.push('Off is not shown pressed');
    if (out.motion.row.off.heightPx < 44) out.problems.push(`a Motion button is ${out.motion.row.off.heightPx} px tall`);
    try { out.motion.remembered = localStorage.getItem('sr:motion'); } catch { out.motion.remembered = 'no storage'; }
    await shot('motion-row-off', 'What to show: the Motion row, Off');
    sr.rail.closeShow && sr.rail.closeShow();
    await sleep(300);
    // Off: a flight arrives on the spot.
    out.motion.flightOffFlyingAtOnce = await flightNow('moon');
    if (out.motion.flightOffFlyingAtOnce === true) out.problems.push('Motion off: a flight to the Moon is still a flight');
    // A trip reads at the reader's pace.
    try {
      sr.trip.start('moon-phases');
      await until(() => sr.trip.state.phase !== 'idle' && sr.trip.state.pacing, 20000, 200);
      out.motion.tripPacingOff = sr.trip.state.pacing;
      if (out.motion.tripPacingOff !== 'reader') out.problems.push('Motion off: the trip is paced ' + out.motion.tripPacingOff + ', not reader');
      await sleep(2500);
      out.summary.push({ at: 'a trip, Motion off', text: (document.getElementById('sr-scenesummary') || {}).textContent || null, live: (document.getElementById('sr-scenesummary') || {}).getAttribute && document.getElementById('sr-scenesummary').getAttribute('aria-live') });
      await shot('motion-off-trip', 'Motion off: a trip at its first stop, waiting for Next');
      sr.trip.stop('probe');
    } catch (e) { out.problems.push('trip: ' + e); }
    await sleep(1500);
    // On again: the control.
    sr.rail.openShow(); await sleep(400);
    const on = motionRow().querySelector('[data-motion="on"]');
    if (!osReduces) {
      on.click();
      await sleep(300);
      sr.rail.closeShow();
      await sleep(300);
      out.motion.flightOnFlyingAtOnce = await flightNow('moon');
      if (out.motion.flightOnFlyingAtOnce !== true) out.problems.push('Motion on: the control flight is not a flight');
    } else out.motion.note = 'the device asks for less motion: On is not offered, the control is skipped';
    await sleep(2500);
  }
} catch (e) { out.problems.push('motion: ' + e); }

// ---- 4. the link -------------------------------------------------------------------------------
try {
  sr.deselect();
  await sleep(1500);
  const r = sr.recordById('moon');
  if (r) { sr.select(r, { fly: false, undo: false }); await sleep(1500); }
  const shareMod = await import(new URL('js/ui/share.js', document.baseURI).href);
  const url = shareMod.shareUrl(shareMod.shareState(sr, r ? r.id : null));
  out.link.url = url;
  out.link.hasV = /[#&]v=1(?:&|$)/.test(url);
  out.link.build = (/[#&]build=([^&]+)/.exec(url) || [])[1] || null;
  if (!out.link.hasV || !out.link.build) out.problems.push('a view\'s link lacks v=1 or the build: ' + url);
  if (/[#&]p=|lat|lon/.test(url)) out.problems.push('the link carries a place: ' + url);
  out.link.addressBar = location.hash;
  if (/build=/.test(location.hash)) out.problems.push('the address bar carries a build');
} catch (e) { out.problems.push('link: ' + e); }

// ---- 5. the summary ----------------------------------------------------------------------------
try {
  const say = () => (document.getElementById('sr-scenesummary') || {}).textContent || null;
  const waitFor = async (re) => { await until(() => re.test(say() || ''), 6000, 150); return say(); };
  out.summary.push({ at: 'start', text: say(), exists: !!document.getElementById('sr-scenesummary') });
  if (!document.getElementById('sr-scenesummary')) out.problems.push('no scene summary in the page (it loads SUMMARY_MS after the layers)');
  sr.deselect();
  sr.setStage('earth');
  out.summary.push({ at: 'Earth, nothing selected', text: await waitFor(/Nothing is selected/) });
  const iss = sr.recordById('sat-25544') || sr.recordById('station-iss');
  if (iss) { sr.select(iss, { fly: false, undo: false }); out.summary.push({ at: 'the station selected', text: await waitFor(/is selected/) }); }
  sr.deselect();
  sr.setStage('jupiter');
  out.summary.push({ at: 'Jupiter\'s stage', text: await waitFor(/Jupiter/) });
  sr.setStage('earth');
  await sleep(600);
  for (const s of out.summary) if (s.at !== 'start' && s.at !== 'a trip, Motion off' && !s.text) out.problems.push('the scene summary said nothing at ' + s.at);
} catch (e) { out.problems.push('summary: ' + e); }

// ---- 6. axe ------------------------------------------------------------------------------------
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const scan = async (name) => {
  if (!window.axe) { out.axe[name] = { error: 'axe is not loaded (r12-access.axe, look.yml)' }; return; }
  try {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: TAGS }, resultTypes: ['violations', 'incomplete'] });
    out.axe[name] = {
      version: window.axe.version,
      violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => ({ target: n.target.join(' '), why: String(n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 200) })) })),
      incomplete: r.incomplete.map((v) => ({ id: v.id, n: v.nodes.length })),
      passes: r.passes.length,
    };
    const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    out.axe[name].serious = bad.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`);
  } catch (e) { out.axe[name] = { error: String(e).slice(0, 300) }; }
};
try {
  if (phone && sr.shell && sr.shell.sheet && sr.shell.sheet()) { sr.shell.sheet().set('half'); await sleep(800); }
  await scan('map');
  if (sr.rail && sr.rail.openShow) { sr.rail.openShow(); await sleep(600); await scan('what-to-show'); sr.rail.closeShow && sr.rail.closeShow(); }
  // The readable page itself, as markup in a document of its own.
  const f = holder();
  f.setAttribute('sandbox', 'allow-same-origin');
  document.body.appendChild(f);
  f.src = base + 'index.html';
  await new Promise((res) => { f.onload = res; setTimeout(res, 60000); });
  await sleep(800);
  if (window.axe && f.contentDocument) {
    try {
      const r = await window.axe.run(f.contentDocument, { runOnly: { type: 'tag', values: TAGS }, resultTypes: ['violations'] });
      out.axe['readable-no-js'] = { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })), serious: r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`) };
    } catch (e) { out.axe['readable-no-js'] = { error: String(e).slice(0, 300) }; }
  }
  f.remove();
} catch (e) { out.problems.push('axe: ' + e); }
for (const [name, a] of Object.entries(out.axe)) {
  if (a.error) out.problems.push(`axe ${name}: ${a.error}`);
  else if (a.serious && a.serious.length) out.problems.push(`axe ${name}: serious or critical: ${a.serious.join(', ')}`);
}

const failText = out.problems.length ? out.problems.slice(0, 6).join(' | ') : undefined;
return finish({ access: out, fail: failText });
