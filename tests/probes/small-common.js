// Shared head of the small-issues probes (tests/probes/small-*.js, 2026-10-08): run through
// tools/cdp.mjs with --shot-dir. The driver script concatenates this file and one walk.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const out = { vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, steps: {} };
const step = (k) => fetch(`/probe-log?step=${k}&at=${Date.now() - t0}`).catch(() => {});
window.addEventListener('error', (e) => { (out.errors = out.errors || []).push(String(e.message).slice(0, 200)); });
window.addEventListener('unhandledrejection', (e) => { (out.errors = out.errors || []).push('rej: ' + String(e.reason && e.reason.message || e.reason).slice(0, 200)); });
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 150000) await wait(300);
const ctx = window.spaceRadar;
out.tReady = Date.now() - t0;
if (!ctx) return out;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const text = (n) => (n ? n.innerText.replace(/\s+/g, ' ').trim() : null);
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
const say = (el) => { if (!el) return null; const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''}`; };
const until = async (fn, ms = 10000) => { const w = Date.now(); for (;;) { let v = null; try { v = fn(); } catch { v = null; } if (v) return v; if (Date.now() - w > ms) return null; await wait(150); } };
// A shot needs a frame: a one-pixel mark that changes keeps frames coming under a full sheet.
const mark = document.createElement('div');
mark.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;background:#000';
document.body.appendChild(mark);
let flip = 0; setInterval(() => { flip ^= 1; mark.style.background = flip ? '#010101' : '#000'; }, 100);
const shot = async (name) => { await step(`shot-${name}`); await Promise.race([window.cdpShot(name), wait(25000)]); };
const run = async (name, fn) => { const t = Date.now(); try { out.steps[name] = await fn(); } catch (e) { out.steps[name] = { error: String(e && e.message || e).slice(0, 300) }; } (out.ms = out.ms || {})[name] = Date.now() - t; await step(`done-${name}`); };
const phone = () => !!(ctx.shell && ctx.shell.isPhone && ctx.shell.isPhone());
const sheetTo = async (d) => { if (phone() && ctx.shell.sheet && ctx.shell.sheet()) { ctx.shell.sheet().set(d); await wait(600); } };
const home = async () => {
  if (ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle') { ctx.trip.stop(); await wait(900); }
  if (ctx.share && ctx.share.isOpen && ctx.share.isOpen()) ctx.share.close();
  if (ctx.selected && ctx.selected()) ctx.deselect();
  while (ctx.shell.view() !== 'home') { const was = ctx.shell.view(); ctx.shell.back(); if (ctx.shell.view() === was) break; }
  await wait(400);
};
const pick = async (id, fly = false) => {
  const rec = ctx.recordById(id);
  if (!rec) return null;
  ctx.select(rec, { fly });
  await until(() => ctx.shell.view() === 'card', 8000);
  await wait(700);
  return rec;
};
const openSection = async (name) => {
  const head = await until(() => $(`#sr-card [data-section="${name}"] .sr-disc__head`), 6000);
  if (!head) return false;
  if (head.getAttribute('aria-expanded') !== 'true') head.click();
  await wait(500);
  return true;
};
/** What is under a control: its hit height and width round its centre, as the UI gate measures. */
const hit = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect(); const cx = Math.round(r.left + r.width / 2); const cy = Math.round(r.top + r.height / 2);
  const mine = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); };
  if (!mine(cx, cy)) return { covered: say(document.elementFromPoint(cx, cy)) };
  const go = (dx, dy) => { let n = 0; while (n < 40 && mine(cx + dx * (n + 1), cy + dy * (n + 1))) n += 1; return n; };
  return { w: go(-1, 0) + go(1, 0) + 1, h: go(0, -1) + go(0, 1) + 1 };
};
