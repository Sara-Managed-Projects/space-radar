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

// forge #90: each year's shower peak. A computed year is the map's own arithmetic to the day; an IMO
// year is within a day of it (the IMO's maximum is a few hours off the solar longitude's in places).
const showersDoc = JSON.parse(execFileSync('python3', ['-c', "import yaml, json, sys; json.dump(yaml.safe_load(open('registry/showers.yaml')), sys.stdout, default=str)"], { cwd: ROOT, encoding: 'utf8' }));
const { SHOWERS } = await import(join(ROOT, 'site/js/data/showers.js'));
const { peakInstant } = await import(join(ROOT, 'site/js/sky/radiants.js'));
const years = Object.keys(showersDoc.peaks_from || {}).sort();
for (const row of showersDoc.showers) {
  const sh = SHOWERS.find((x) => x.id === row.id);
  for (const y of years) {
    const typed = row.peaks && row.peaks[y];
    check(typeof typed === 'string', `${row.id}: no peak for ${y}, though peaks_from has the year`);
    if (!typed) continue;
    const ms = peakInstant(sh, Number(y));
    const day = Date.UTC(Number(y), Number(typed.slice(0, 2)) - 1, Number(typed.slice(3)));
    const off = Math.abs(Date.UTC(Number(y), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate()) - day) / 86400e3;
    if (/^computed/.test(showersDoc.peaks_from[y])) check(off === 0, `${row.id} ${y}: marked computed, but ${typed} is not the solar longitude's date (${new Date(ms).toISOString().slice(0, 10)})`);
    else check(off <= 1, `${row.id} ${y}: the IMO's ${typed} is ${off} days from the solar longitude's date`);
  }
}
// THE HORIZON (forge #90): nine months before the calendar runs out, say so. A warning, not a failure:
// the monthly job (forge #94) reads it and opens the work of adding the next year.
const NINE_MONTHS = 274 * 86400e3;
const lastEvent = Math.max(...computed.map((c) => c.instantMs));
const lastPeakYear = Number(years[years.length - 1]);
const horizon = Date.now() + NINE_MONTHS;
const short = [];
if (lastEvent < horizon) short.push(`the last sky event (${new Date(lastEvent).toISOString().slice(0, 10)}) is less than nine months away: add the next year's rows to registry/sky-events.yaml`);
if (Date.UTC(lastPeakYear, 11, 31) < horizon) short.push(`registry/showers.yaml has peaks only to ${lastPeakYear}: add the next year (IMO calendar, or computed from sol)`);
for (const w of short) console.warn(`sky events WARNING: ${w}`);
check(lastEvent > Date.parse('2028-12-01T00:00:00Z') && lastPeakYear >= 2028, 'the calendar reaches December 2028');

if (problems.length) { console.error('sky events FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`sky events ok: ${rows.length} events recomputed with Astronomy Engine, every stated date inside the computed one, the Moon's words agree, and each #t= link sets the clock and opens its world through the app's own parser; shower peaks for ${years.join(', ')} agree with the solar longitude; ${short.length ? 'horizon WARNED' : 'over nine months of calendar left'}`);
