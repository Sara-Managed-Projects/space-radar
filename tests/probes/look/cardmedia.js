// cardmedia: a card's "Pictures and news" (ui/cardmedia.js, forge internal #556).
//
// For each subject: select it as a click does, wait for its card, open the "Pictures and news" row (the first open
// fetches ui/cardmedia.js and its data), scroll the row into view and take a picture.
//   dso-m1          the Crab Nebula: its ESA/Hubble photograph with the credit, and three archive links
//   deep-voyager-1  Voyager 1: the Journal's posts tagged with it, NASA's own page, the NASA library link
//   moon            the Moon: the Journal, a long read with our own picture
//   sat-25544       the station: what it says with the Journal's ISS posts
// Fails when a card never opened, had no such row, the row stayed on its loading line, a picture is not ours, or an item
// printed no credit. Run at 1440 x 900 and again with `-f mobile=true`.
look.probe = 'cardmedia';
const out = { subjects: {}, problems: [] };
const SUBJECTS = [['dso-m1', 'crab'], ['deep-voyager-1', 'voyager-1'], ['moon', 'moon'], ['sat-25544', 'iss']];
const OWN = /^(https:\/\/(blog|www)\.spaceradar\.ai\/|https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/)/;
for (const [id, name] of SUBJECTS) {
  const o = {}; out.subjects[id] = o;
  await until(() => sr.recordById(id), 120000);
  if (!(await go(id, null, 7000))) { out.problems.push(`${id}: no such record`); continue; }
  const head = await until(() => document.querySelector('[data-section="media"] .sr-disc__head'), 30000);
  if (!head) { out.problems.push(`${id}: the card has no Pictures and news row`); continue; }
  const h = document.querySelector('[data-section="media"] .sr-disc__head');
  if (h.getAttribute('aria-expanded') !== 'true') h.click();
  o.filled = await until(() => { const b = document.querySelector('[data-section="media"] .sr-media'); return b && b.dataset.mounted === '1'; }, 30000);
  if (!o.filled) { out.problems.push(`${id}: the row stayed on its loading line`); continue; }
  await sleep(2500); // the lazy pictures
  const box = document.querySelector('[data-section="media"] .sr-media');
  box.closest('[data-section="media"]').scrollIntoView({ block: 'start' });
  o.groups = [...box.querySelectorAll('.sr-media__group > .sr-card__label')].map((n) => n.textContent);
  o.images = [...box.querySelectorAll('img')].map((i) => ({ src: i.src, alt: i.alt, loaded: i.complete && i.naturalWidth > 0 }));
  o.credits = [...box.querySelectorAll('figcaption')].map((n) => n.textContent);
  o.links = [...box.querySelectorAll('a')].map((a) => a.textContent.trim().slice(0, 60) + ' -> ' + a.href.slice(0, 80));
  o.empty = !!box.querySelector(':scope > .sr-media__note');
  for (const i of o.images) if (!OWN.test(i.src)) out.problems.push(`${id}: a picture from another host, ${i.src}`);
  if (box.querySelectorAll('figure').length !== o.credits.length) out.problems.push(`${id}: a picture without its credit`);
  await shot(`${name}-media`, `${id}: ${o.groups.join(' / ')} | ${o.images.length} pictures | ${o.links.length} links`, 1000);
}
if (!(out.subjects['dso-m1'] && (out.subjects['dso-m1'].credits || []).some((c) => /CC BY 4\.0/.test(c)))) out.problems.push('the Crab\'s photograph printed no CC BY 4.0 credit');
if (!(out.subjects['deep-voyager-1'] && (out.subjects['deep-voyager-1'].groups || []).length >= 2)) out.problems.push('Voyager 1 shows fewer than two groups (Journal, pages)');
out.srq = (window.srq || []).filter((e) => e[1] === 'tab_open').length;
if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
