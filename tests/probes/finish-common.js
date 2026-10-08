// tests/probes/finish-common.js -- the helpers the three finishers probes share (public #240, #241,
// #287, #289, #296, #315, #385). Not a probe: `cat` it in front of one, as their headers say.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now();
const el = () => Math.round((Date.now() - T0) / 1000);
const out = { t: {}, steps: [] };
window.__finishOut = out;
const LIMIT = 500; // seconds; the wrapper kills the browser at 540
const log = (step) => { out.steps.push(`${el()}s ${step}`); try { fetch('/probe-log?' + encodeURIComponent(`${el()}s ${step}`)).catch(() => {}); } catch { /* no log */ } };
const shot = (name) => (el() > LIMIT - 15 || typeof window.cdpShot !== 'function' ? Promise.resolve(false)
  : Promise.race([window.cdpShot(name).then(() => true), wait(40000).then(() => false)]));
const until = async (f, ms) => { const t = Date.now(); while (Date.now() - t < ms && el() < LIMIT) { try { if (f()) return true; } catch { /* not yet */ } await wait(250); } return false; };
const q = (s) => document.querySelector(s);
const qa = (s) => [...document.querySelectorAll(s)];
const txt = (s) => { const n = typeof s === 'string' ? q(s) : s; return n ? n.textContent : null; };
const shown = (n) => { if (!n) return false; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
const box = (s) => {
  const n = typeof s === 'string' ? q(s) : s;
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), clipped: n.scrollWidth > n.clientWidth + 1, font: getComputedStyle(n).fontSize };
};
const key = async (k) => { if (typeof window.cdpInput === 'function') await window.cdpInput('key', k); else document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); await wait(180); };
const focusName = () => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}.${String(a.className).split(/\s+/).slice(0, 2).join('.')}` : null; };
const embers = () => qa('button, a').filter((n) => shown(n) && /255, 159, 67/.test(getComputedStyle(n).backgroundColor)).map((n) => (n.textContent || n.getAttribute('aria-label') || '').trim().slice(0, 30));
const step = async (name, fn) => { try { log(name); await fn(); } catch (e) { out[`err_${name}`] = String((e && e.stack) || e).slice(0, 400); } out.t[name] = el(); };
