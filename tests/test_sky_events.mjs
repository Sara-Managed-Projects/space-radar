// tests/test_sky_events.mjs -- the dated pages say what the sky does, and their links open the map there.
//
// registry/sky-events.yaml types only what a calendar or an agency states; the page's instants,
// phases, elongations and eclipses are computed (scripts/seo_facts.mjs, Astronomy Engine). This
// recomputes them from the registry and fails when a date written in a title, a name or a summary
// has moved off the computed one, when a sentence about the Moon contradicts the computed phase,
// when a `#t=` link does not do what the page says (read with the app's own parser,
// site/js/ui/urlstate.js), or when a page's link names a world that does not exist.
//   node tests/test_sky_events.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(execFileSync('python3', ['-c', `
import yaml, json, datetime, sys
def d(o):
    if isinstance(o, datetime.datetime): return o.astimezone(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    return o.isoformat()
doc = yaml.safe_load(open('registry/sky-events.yaml'))
worlds = [w['id'] for w in yaml.safe_load(open('registry/worlds.yaml'))['worlds']]
json.dump({'doc': doc, 'worlds': worlds}, sys.stdout, default=d)
`], { cwd: ROOT, encoding: 'utf8' }));
const { events } = await import(join(ROOT, 'scripts/seo_facts.mjs'));
const U = await import(join(ROOT, 'site/js/ui/urlstate.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const rows = registry.doc.events;
check(rows.length >= 6, `the registry carries the five asked-for events and the total eclipse (${rows.length})`);
const computed = events(rows.map((r) => ({ ...r, near: r.near, happens: r.happens })));

/** Every "13 to 14 December 2026" and "6 February 2027" in a string, as [{days: [13, 14], month, year}]. */
function dateRanges(text) {
  const out = [];
  const re = new RegExp(`(\\d{1,2})(?: to (\\d{1,2}))? (${MONTHS.join('|')}) (\\d{4})`, 'g');
  for (const m of text.matchAll(re)) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    out.push({ days: [a, b], month: MONTHS.indexOf(m[3]), year: Number(m[4]) });
  }
  return out;
}

for (const r of rows) {
  const c = computed.find((x) => x.id === r.id);
  const when = new Date(c.instantMs);
  const text = `${r.name}. ${r.short}. ${r.summary}`;
  const ranges = dateRanges(text);
  check(ranges.length > 0, `${r.id}: the title, name or summary states a date`);
  const here = ranges.some((x) => x.year === when.getUTCFullYear() && x.month === when.getUTCMonth() && x.days[0] <= when.getUTCDate() && when.getUTCDate() <= x.days[1]);
  check(here, `${r.id}: computed ${c.instant} is not within any date the page states (${JSON.stringify(ranges)})`);
  // A mission's date is the agency's, typed: it is what the page prints and must equal what the title says.
  if (r.kind === 'mission') check(r.happens === c.instant, `${r.id}: the date is the registry's own`);
  // The words about the Moon agree with the computed phase.
  const moon = c.moon || c.moonAtPeak;
  if (c.moon) {
    if (/thin/i.test(r.summary)) check(c.moon.percent <= 25, `${r.id}: "thin Moon" but it is ${c.moon.percent} percent lit`);
    if (/half Moon/i.test(r.summary)) check(c.moon.percent >= 35 && c.moon.percent <= 65, `${r.id}: "half Moon" but it is ${c.moon.percent} percent lit`);
    if (/waning/i.test(r.summary)) check(!c.moon.waxing, `${r.id}: "waning" but the Moon is waxing`);
    if (/waxing/i.test(r.summary)) check(c.moon.waxing, `${r.id}: "waxing" but the Moon is waning`);
  }
  if (r.kind === 'eclipse') {
    check(c.kind === r.eclipse, `${r.id}: the registry says ${r.eclipse} and the sky says ${c.kind}`);
    check(moon.percent === 0, `${r.id}: a solar eclipse is at the new Moon (${moon.percent} percent lit)`);
  }
  for (const a of c.also) {
    if (a.what === 'greatest-western-elongation') {
      check(a.visibility === 'morning' && a.elongationDeg > 46 && a.elongationDeg < 48, `${r.id}: Venus at its greatest western elongation is 46 to 48 degrees in the morning sky (${a.elongationDeg})`);
      check(Math.abs(a.instantMs - c.instantMs) < 36 * 3600e3, `${r.id}: the elongation is within a day and a half of the page's main event`);
    }
  }

  // THE DEEP LINK, read by the app's own parser, in a page with no state.
  const hash = `#t=${r.link.t}&at=${r.link.at}`;
  globalThis.location = { hash };
  const goTo = [];
  const rest = U.bootLink({ goTo: (ms) => goTo.push(ms), setRate() {}, rates: () => [] });
  check(goTo.length === 1 && goTo[0] === Date.parse(r.link.t), `${r.id}: ${hash} does not set the clock to ${r.link.t} (${goTo})`);
  check(rest.at === r.link.at && rest.t === undefined, `${r.id}: the link's \`at\` reaches the app as ${r.link.at} (${rest.at})`);
  const change = U.linkChange(U.read(), { at: null, trip: null, live: true });
  check(change && change.clock && change.clock.goTo === Date.parse(r.link.t) && change.at && change.at.open === r.link.at, `${r.id}: pasted over a running tab, the link moves the clock and opens ${r.link.at}`);
  check(registry.worlds.includes(r.link.at) || r.link.at === 'earth', `${r.id}: \`at=${r.link.at}\` names a world the map has`);
  const dt = Math.abs(Date.parse(r.link.t) - c.instantMs);
  check(dt <= 36 * 3600e3, `${r.id}: the link's moment is ${(dt / 3600e3).toFixed(1)} hours from the event, over a day and a half`);
}
delete globalThis.location;

// The parser is the one the page's links are written for: a link with the wrong key is dropped, and the test sees it.
globalThis.location = { hash: '#when=2027-02-06T16:00:00Z&at=earth' };
const wrong = U.bootLink({ goTo() { problems.push('a made-up key moved the clock'); }, setRate() {}, rates: () => [] });
check(wrong.when === undefined, 'a key the app does not read is dropped (so a typo in a registry link would fail above)');
delete globalThis.location;

if (problems.length) { console.error('sky events FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`sky events ok: ${rows.length} events recomputed with Astronomy Engine, every stated date inside the computed one, the Moon's words agree, and each #t= link sets the clock and opens its world through the app's own parser`);
