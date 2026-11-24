// train-live: the research train "live" (forge #547, #548, #544, #546), one walk with a picture of each new place: the top bar's
// chip counting to Gaia DR4 and Gaia's card with its section; the row of Coming up; the Earth's card with the space weather open;
// the station's card with its live camera row, then the panel the button opens; the home's day card and its Share. Run after the
// prelude: `cat _prelude.js train-live.js > /tmp/p.js; node tools/cdp.mjs <url> /tmp/p.js --shot-dir=<dir> --block=celestrak.org
// [--mobile --width=390 --height=844]`, or the look workflow with probe=train-live.
look.probe = 'train-live';
const out = { took: [], seen: {} };
const settle = (ms = 1500) => sleep(ms);
const visible = (sel) => { const e = document.querySelector(sel); return !!e && !e.hidden && e.getClientRects().length > 0; };
const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const snap = async (name) => { await shot(name); out.took.push(name); };
const into = (sel) => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: 'start' }); return !!e; };
// On a phone the home and the card live in the sheet: up to full before a picture of what is in it.
const phone = document.documentElement.classList.contains('sr-phone');
const raise = async () => { try { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (phone && s) { s.set('full'); await settle(900); } } catch { /* the sheet as it is */ } };
const openRow = async (id) => {
  const head = document.getElementById(`sr-disc-${id}`);
  if (!head) return false;
  if (head.getAttribute('aria-expanded') !== 'true') head.click();
  head.scrollIntoView({ block: 'start' });
  return true;
};

// a first visit's welcome, out of the way
const away = document.querySelector('[data-entrance="explore"]') || document.querySelector('.sr-welcome .ui-btn, .sr-welcome button');
if (away) away.click();
await settle(1500);

// 1. the chip (it comes a few seconds after the layers) and Gaia's card
out.seen.chip = await until(() => visible('.sr-launchchip'), 60000);
out.chipText = (document.querySelector('.sr-launchchip') || {}).textContent || '';
out.chipPhase = (document.querySelector('.sr-launchchip') || { dataset: {} }).dataset.phase || '';
await settle(1000);
await snap('chip');
const chip = document.querySelector('.sr-launchchip');
if (chip && /release/.test(out.chipPhase)) chip.click(); else location.hash = '#at=deep-gaia';
out.seen.release = await until(() => visible('[data-section^="release-"] .sr-release'), 30000);
await settle(5000);
await raise();
into('[data-section^="release-"]');
await settle(1200);
await snap('gaia-card');

// 2. the row of Coming up
esc();
await settle(1500);
location.hash = '';
await settle(2500);
const row = [...document.querySelectorAll('.sr-next__row')].find((li) => /Gaia DR4/.test(li.textContent));
out.seen.nextRow = !!row;
if (row) { await raise(); row.scrollIntoView({ block: 'center' }); await settle(1000); await snap('coming-up'); }

// 3. the Earth's card, the space weather open
location.hash = '#at=earth';
await until(() => visible('.sr-card'), 30000);
await settle(4000);
await openRow('space-weather');
out.seen.spaceWeather = await until(() => visible('.sr-spacepanel'), 30000);
await settle(1500);
await raise();
into('[data-section="space-weather"]');
await settle(800);
await snap('earth-space-weather');
out.forecastDays = document.querySelectorAll('.sr-spacepanel__days dt').length;

// 4. the station's card: its camera row, then the panel
location.hash = '#at=sat-25544';
await until(() => visible('.sr-card'), 30000);
await settle(5000);
await openRow('camera');
out.seen.cameraRow = await until(() => visible('.sr-isscam-row'), 30000);
out.framesBeforePress = document.querySelectorAll('iframe[src*="youtube"]').length;
await settle(1000);
await raise();
into('[data-section="camera"]');
await settle(800);
await snap('iss-camera-row');
const watch = document.querySelector('.sr-isscam-row__watch');
if (watch) watch.click();
out.seen.cameraPanel = await until(() => visible('.sr-isscam'), 20000);
out.framesAfterPress = document.querySelectorAll('.sr-isscam iframe').length;
await settle(6000);
await snap('iss-camera-panel');
const x = document.querySelector('.sr-isscam .ui-close');
if (x) x.click();
await settle(800);

// 5. the home's day card and its Share
esc();
await settle(1500);
location.hash = '';
await settle(3000);
out.seen.dayCard = await until(() => visible('.sr-daycard'), 30000);
out.dayParts = [...document.querySelectorAll('.sr-daycard [data-part]')].map((b) => b.dataset.part);
await raise();
into('.sr-today');
await settle(1200);
await snap('today');
const share = document.querySelector('.sr-daycard__share');
if (share) share.click();
out.seen.share = await until(() => visible('#sr-share'), 60000); // the sheet draws its postcard first: slow on a shared runner
await settle(4000);
await snap('today-share');
out.shareText = (sr.lastShare && sr.lastShare.text) ? String(sr.lastShare.text).slice(0, 200) : '';
if (sr.share && sr.share.close) sr.share.close();

const missingSeen = Object.entries(out.seen).filter(([, ok]) => !ok).map(([k]) => k);
const failed = out.framesBeforePress ? 'a YouTube frame was in the page before the press' : missingSeen.length ? `not seen: ${missingSeen.join(', ')}` : '';
return finish(failed ? { ...out, fail: failed } : out);
