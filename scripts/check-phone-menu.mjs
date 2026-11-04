// The phone's menu stays usable with a deep scene's breadcrumbs up (public #1322, after #1319).
//
//   node scripts/check-phone-menu.mjs --base=http://127.0.0.1:8177            # 320 and 390 px wide
//   node scripts/check-phone-menu.mjs --base=http://127.0.0.1:8177 --chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
//   node scripts/check-phone-menu.mjs --help
//
// CI runs it in the `ui` job of .github/workflows/screens.yml (Playwright's Chromium, software GL).
// --chrome names a browser to use when Playwright's own was not downloaded (a laptop with Chrome).
//
// WHY. Release 1.5.1 (#1319) moved the breadcrumbs, "Back to ..." and the rung the camera is on, off the
// menu's button. Nothing held it: tests/test_navigate.mjs reads the CSS as text, and the UI gate
// (scripts/check-ui.mjs) measures a phone at 390 px only, with a planet's card and no trail behind it.
// What a person with a phone meets is a deep place, a long name, a narrow screen, and a menu button that
// must still open. So, at 320 px and at 390 px, for each scene below, with the sheet at each detent a
// card can rest in:
//   1. the scene is opened by the app's own select (a card, the camera flown there, so there is a trail);
//   2. every breadcrumb target on screen (the rail and its Back button, the card's chain) lies between the
//      window's side edges and none overlaps the More button; and the browser, asked what is under the
//      button's centre and its four quarter points (the corners are rounded), answers the button;
//   3. the page does not scroll sideways;
//   4. the button, pressed by a real pointer (Playwright refuses a press on a covered button), opens
//      the menu inside the window with the first item focused, and Escape closes it.
// A run that measured no breadcrumb at all, or opened no scene, is a failure and not a pass: the check
// must not go quiet because a name changed.
import { fileURLToPath } from 'node:url';

export const SIZES = [
  { name: 'phone 320', viewport: { width: 320, height: 640 } },
  { name: 'phone 390', viewport: { width: 390, height: 844 } },
];
/** Scenes with a long chain or a long name, none needing live data: [record id, what makes it deep]. */
export const SCENES = [
  ['ganymede', 'Sun, Jupiter, Ganymede'],
  ['apollo-14', 'Sun, Earth, Moon, Apollo 14 landing site'],
  ['tesla-roadster', 'Sun, Tesla Roadster (Starman)'],
];
export const DETENTS = ['peek', 'half'];

const USAGE = `usage: node scripts/check-phone-menu.mjs [--base=URL] [--chrome=PATH] [--out=FILE]
  --base=URL     the served site (default http://127.0.0.1:8177; tools/serve.py site 8177)
  --chrome=PATH  a browser to launch instead of Playwright's own
  --out=FILE     write the measurements as JSON
  --help         this text`;

/** Two boxes {l, t, r, b} share area (a touching edge is not an overlap). */
export function overlaps(a, b) {
  return a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
}

/** A box lies inside a window of `w` by `h`, give or take a pixel. */
export function inside(a, w, h) {
  return across(a, w) && a.t >= -1 && a.b <= h + 1;
}

/** A box lies between the window's left and right edges. A card's chain below the fold of a peeking sheet is fine; one cut at the side is not. */
export function across(a, w) {
  return a.l >= -1 && a.r <= w + 1;
}

/**
 * The findings of one measurement: { more: box|null, targets: [{ name, box }], covered: [points],
 * scrollW, window: [w, h] }. Pure, so tests/test_phone_menu_gate.mjs can break each rule on purpose.
 */
export function findings(m) {
  const out = [];
  const [w, h] = m.window;
  if (!m.more) return ['the More button is not on screen'];
  if (!inside(m.more, w, h)) out.push('the More button is not inside the window');
  for (const x of m.targets) {
    if (overlaps(x.box, m.more)) out.push(`the breadcrumb "${x.name}" overlaps the More button`);
    if (!across(x.box, w)) out.push(`the breadcrumb "${x.name}" runs outside the window (${Math.round(x.box.l)} to ${Math.round(x.box.r)} of ${w})`);
  }
  if (m.covered.length) out.push(`something else is under the More button at ${m.covered.join(', ')}`);
  if (m.scrollW > w + 1) out.push(`the page scrolls sideways: ${m.scrollW} px in a ${w} px window`);
  return out;
}

/** The findings of pressing the button: { opened, expanded, box, focused, closed }. */
export function menuFindings(o, w, h) {
  const out = [];
  if (!o.opened) return ['pressing the More button did not open the menu'];
  if (o.expanded !== 'true') out.push('the menu is open and the button does not say aria-expanded="true"');
  if (!o.box || !inside(o.box, w, h)) out.push('the open menu is not inside the window');
  if (!o.focused) out.push('the open menu has not put focus on its first item');
  if (!o.closed) out.push('Escape did not close the menu');
  return out;
}

/** Runs in the page: select the scene, then (per detent) measure. Returns plain data. */
const OPEN_SCENE = `async (id) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ctx = window.spaceRadar;
  const rec = ctx.recordById(id);
  if (!rec) return false;
  ctx.select(rec, { fly: true });
  const t0 = Date.now();
  while (ctx.shell.view() !== 'card' && Date.now() - t0 < 8000) await wait(100);
  await wait(1500);
  return ctx.shell.view() === 'card';
}`;
const SET_DETENT = `async (d) => {
  const ctx = window.spaceRadar;
  const sheet = ctx.shell.sheet && ctx.shell.sheet();
  if (sheet) sheet.set(d);
  await new Promise((r) => setTimeout(r, 600));
  return !!sheet;
}`;
const MEASURE = `() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const more = document.querySelector('.sr-rail__btn--more');
  const moreBox = more && vis(more) ? box(more) : null;
  const targets = [...document.querySelectorAll('.sr-scalerail, .sr-scalerail__back, .sr-card__crumb')]
    .filter(vis).map((e) => ({ name: (e.textContent || e.className).trim().replace(/\\s+/g, ' ').slice(0, 60), box: box(e) }));
  const covered = [];
  if (moreBox) {
    const cx = (moreBox.l + moreBox.r) / 2; const cy = (moreBox.t + moreBox.b) / 2;
    const dx = (moreBox.r - moreBox.l) / 4; const dy = (moreBox.b - moreBox.t) / 4; // the corners are rounded: probe the quarter points
    const pts = [[cx, cy], [cx - dx, cy - dy], [cx + dx, cy - dy], [cx - dx, cy + dy], [cx + dx, cy + dy]];
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === more || more.contains(hit))) covered.push(Math.round(x) + ',' + Math.round(y));
    }
  }
  return { more: moreBox, targets, covered, scrollW: document.documentElement.scrollWidth, window: [innerWidth, innerHeight] };
}`;
const MENU_STATE = `() => {
  const menu = document.getElementById('sr-more');
  const btn = document.querySelector('.sr-rail__btn--more');
  const r = menu && !menu.hidden ? menu.getBoundingClientRect() : null;
  return { opened: !!menu && !menu.hidden, expanded: btn && btn.getAttribute('aria-expanded'), box: r ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null,
    focused: !!menu && menu.contains(document.activeElement) };
}`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(USAGE); process.exit(0); }
  const BASE = arg('base', 'http://127.0.0.1:8177');
  const OUT = arg('out', '');
  const BLOCKED = /(^|\.)(celestrak\.org|ll\.thespacedevs\.com)$/;
  const { chromium } = await import('playwright'); // here, so tests/test_phone_menu_gate.mjs imports the rules without a browser
  const chrome = arg('chrome', '');
  const browser = await chromium.launch(chrome ? { executablePath: chrome } : {});
  const report = {};
  const failing = [];
  let scenes = 0;
  let measured = 0;
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.route((url) => BLOCKED.test(url.hostname), (route) => route.abort());
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    const note = (where, list) => list.forEach((p) => failing.push(`[${size.name}] ${where}: ${p}`));
    try {
      await page.goto(`${BASE}/index.html?sw=0`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForFunction(() => window.spaceRadar && window.spaceRadar.explore && window.spaceRadar.rail && window.spaceRadar.shell, null, { timeout: 150_000 });
      await page.evaluate(() => new Promise((r) => { if (window.__srLayersReady) r(); window.addEventListener('sr:layers-ready', r, { once: true }); setTimeout(r, 90_000); }));
      await page.waitForTimeout(1500);
      for (const [id, why] of SCENES) {
        const opened = await page.evaluate(`(${OPEN_SCENE})(${JSON.stringify(id)})`);
        if (!opened) { note(id, [`the scene did not open as a card (${why})`]); continue; }
        scenes += 1;
        for (const detent of DETENTS) {
          await page.evaluate(`(${SET_DETENT})(${JSON.stringify(detent)})`);
          const m = await page.evaluate(`(${MEASURE})()`);
          measured += m.targets.length;
          report[`${size.name} ${id} ${detent}`] = m;
          note(`${id} at ${detent}`, findings(m));
          if (detent === DETENTS[0]) {
            // the real press, once per scene and size: Playwright refuses a covered button, so a miss is a finding
            try {
              await page.click('.sr-rail__btn--more', { timeout: 30_000 });
              await page.waitForTimeout(300);
              const s = await page.evaluate(`(${MENU_STATE})()`);
              await page.keyboard.press('Escape');
              await page.waitForTimeout(200);
              s.closed = await page.evaluate(() => { const m = document.getElementById('sr-more'); return !m || m.hidden; });
              note(`${id} menu`, menuFindings(s, size.viewport.width, size.viewport.height));
            } catch (e) {
              note(`${id} menu`, [`the More button could not be pressed: ${String(e.message).split('\n')[0]}`]);
            }
          }
        }
      }
    } catch (e) {
      note('walk', [`the check did not finish: ${String(e.message).split('\n')[0]}`]);
    }
    pageErrors.forEach((m) => failing.push(`[${size.name}] page error: ${m}`));
    await context.close();
  }
  await browser.close();
  if (OUT) (await import('node:fs')).writeFileSync(OUT, JSON.stringify(report, null, 1));
  // A run that looked at nothing is not a pass.
  if (scenes < SIZES.length || measured < SIZES.length) failing.push(`only ${scenes} scene(s) opened and ${measured} breadcrumb target(s) measured: the check did not look`);
  for (const p of failing) console.error(`::error::${p}`);
  console.log(failing.length ? `phone menu FAILED: ${failing.length} finding(s)` : `phone menu ok: ${scenes} scenes at ${SIZES.map((s) => s.viewport.width).join(' and ')} px, ${measured} breadcrumb targets clear of the More button, the menu opens and closes`);
  process.exit(failing.length ? 1 : 0);
}
