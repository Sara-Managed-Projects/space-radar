// tests/test_missions_landers.mjs -- the dated events of the landers and impactors (release 1.7.3;
// registry/missions-landers.yaml, site/js/data/missions-landers.js, ui/missions.js loadLanders).
//
// What this holds that tests/test_missions.mjs cannot: these missions are NOT in the file the first card
// opens (their file is fetched only for a lander's card, or by a link naming one of their events); every
// mission's record is a place the map has (a row of sites.yaml, or of the landing-site list of 1.5.0); a
// `landing` or `impact` event is on the very day the registry gives for the site; only a landing, a hop
// or a last signal from the ground is `site`, and a launch never is; and every line of the card is as short
// as the flagship missions' (a title of one line, a sentence of 160 characters).
//
//   node tests/test_missions_landers.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { replaceState() {} };
const M = await import(join(JS, 'ui/missions.js'));
const { SITES } = await import(join(JS, 'data/sites.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- before the file is fetched, nothing of it is known -------------------------------------------------
check(M.landerMissions().length === 0, 'the landers\' missions are empty until loadLanders() is called');
check(M.missionOf('venera-9') === null && M.findEvent('venera-9.landing') === null, 'before the fetch, no lander has an event list');
check(M.MISSIONS.length >= 6 && !M.MISSIONS.some((m) => m.id === 'venera-9' || m.id === 'viking-1'), 'the flagship file (data/missions.js) holds none of them');

const list = await M.loadLanders();
check(list.length >= 40 && list === M.landerMissions(), `loadLanders() resolves to the missions (${list.length})`);
check((await M.loadLanders()) === list, 'a second call answers the same list');

// --- the places the map has ------------------------------------------------------------------------------
const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/lists/landing-sites.json'), 'utf8'));
const listed = new Map(doc.rows.map((r) => [r.id, r]));
const sited = new Map(SITES.filter((s) => s.record !== false).map((s) => [s.id, s]));
const WORLDS = new Set(['earth', 'moon', 'venus', 'mars']);
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const now = Date.parse('2026-11-04T00:00:00Z');

const ids = new Set();
const records = new Set();
let events = 0;
for (const m of list) {
  check(!ids.has(m.id) && !M.MISSIONS.some((b) => b.id === m.id), `${m.id}: one row a mission, and not one of the flagships`); ids.add(m.id);
  check(!records.has(m.record), `${m.id}: its record ${m.record} has one mission`); records.add(m.record);
  const row = listed.get(m.record);
  const site = sited.get(m.record);
  check(!!(row || site), `${m.id}: its record ${m.record} is a site of sites.yaml or the landing-site list`);
  check(!(row && site), `${m.id}: ${m.record} is in one place only`);
  check(m.source && /^https:\/\/[a-z0-9.-]+\//.test(m.source.url) && m.source.name.length > 3, `${m.id}: a source with a name and a link`);
  check(/^https:\/\/(nssdc\.gsfc\.nasa\.gov|en\.wikipedia\.org)\//.test(m.source.url), `${m.id}: read on NSSDCA or Wikipedia (${m.source.url})`);
  check(!/wikipedia/.test(m.source.url) || /CC BY-SA/.test(m.source.name), `${m.id}: a Wikipedia source carries its licence`);
  check(m.display && m.display.length > 2, `${m.id}: a name`);
  check(/^2026-\d\d-\d\d$/.test(String(m.read)), `${m.id}: the day its events were read`);
  check(m.events.length >= 3, `${m.id}: at least three events`);
  const lead = m.events[0];
  check(lead && lead.id === 'launch' && lead.place === 'none' && lead.world === 'earth', `${m.id}: the first event is its launch, on Earth, which the map does not move to`);
  let last = -Infinity;
  const seen = new Set();
  for (const e of m.events) {
    events += 1;
    const where = `${m.id}.${e.id}`;
    const ms = M.eventMs(e);
    check(Number.isFinite(ms) && ms > last, `${where}: its date parses and events are in order (${e.date})`); last = ms;
    check(!seen.has(e.id) && /^[a-z0-9-]+$/.test(e.id), `${where}: a plain id, once`); seen.add(e.id);
    check(e.title && [...e.title].length <= 34, `${where}: a title that fits one line (${[...String(e.title)].length}): ${e.title}`);
    check(e.text && [...e.text].length <= 160 && /\.$/.test(e.text), `${where}: one sentence of 160 characters at most (${[...String(e.text || '')].length})`);
    check(!/!| -- |→/.test(e.title + e.text), `${where}: no exclamation mark, double hyphen or arrow`);
    check(['site', 'none'].includes(e.place), `${where}: a lander's event is at the site or told without moving the clock (${e.place})`);
    check(e.place === 'site' ? !e.world : WORLDS.has(e.world), `${where}: a site event has no world of its own, a told event names one`);
    check(e.precision === undefined || e.precision === 'day', `${where}: precision is day or absent`);
    check((e.precision === 'day') === !/T/.test(e.date), `${where}: a date without a time says it is known to the day`);
    check(ms < now, `${where}: it has happened`);
    check(e.source === undefined || (/^https:\/\//.test(e.source.url) && e.source.name.length > 3), `${where}: an event read on another page names it`);
    check(M.findEvent(where) && M.findEvent(where).event === e, `${where}: found by its link id`);
    // The clock goes to a place only where the craft is: a launch or a flight is not at the site.
    if (e.place === 'site') {
      check(M.placement(e, row ? { id: m.record } : { id: m.record }, ms).moves === true, `${where}: a site event moves the clock`);
      check(!/^(launch|orbit|first-image|retro|engine|capsule|return|carrier|balloon)$/.test(e.id), `${where}: ${e.id} did not happen at the site`);
      // A site the list gives no place for cannot be gone to.
      check(!row || (Number.isFinite(row.lat) && Number.isFinite(row.lon)), `${where}: the site has a coordinate to go to`);
    } else {
      check(M.placement(e, { id: m.record }, ms).moves === false, `${where}: a told event does not move the clock`);
    }
  }
  // The landing (or the impact) is on the day the registry gives for the place.
  const mark = m.events.find((e) => e.id === 'landing' || e.id === 'impact');
  const regDate = site ? site.landed : row && row.date;
  if (mark && regDate) {
    const d = typeof regDate === 'string' ? regDate : dayOf(regDate);
    check(dayOf(M.eventMs(mark)) === d, `${m.id}: ${mark.id} is on ${dayOf(M.eventMs(mark))} and the registry says ${d}`);
  }
  check(!!mark || m.id === 'surveyor-4', `${m.id}: a landing or an impact`);
}
check(events >= 120, `a hundred and twenty events and more (${events})`);

// --- the brief's list: every craft it names that has a place on the map has a card with events -----------
const must = [
  'venera-7', 'venera-8', 'venera-9', 'venera-10', 'venera-11', 'venera-12', 'venera-13', 'venera-14', 'vega-1', 'vega-2',
  'moon-ranger-7', 'moon-ranger-8', 'moon-ranger-9',
  'surveyor-1', 'moon-surveyor-2', 'surveyor-3', 'moon-surveyor-4', 'surveyor-5', 'surveyor-6', 'surveyor-7',
  'moon-luna-9', 'luna-13', 'luna-16', 'lunokhod-1', 'luna-20', 'lunokhod-2', 'luna-23', 'luna-24',
  'change-3', 'change-4', 'change-5', 'change-6',
  'viking-1', 'viking-2', 'mars-pathfinder', 'spirit', 'opportunity', 'phoenix', 'elysium', 'utopia',
];
for (const id of must) check(M.missionOf(id) !== null, `${id}: has a mission with events`);

// --- the link: an event of this file opens once the file is here --------------------------------------------
{
  const opened = [];
  const rec = { id: 'venera-9', klass: 'site', layer: 'landing-sites', propagator: 'fixed', meta: { siteKind: 'landing-site' } };
  const ctx = { recordById: (id) => (id === 'venera-9' ? rec : null), isLayerOn: () => true, setLayerOn() {}, select: (r) => opened.push(r.id), refreshCard() {}, clock: new Proxy({}, { get: () => () => {} }) };
  const found = M.findEvent('venera-9.landing');
  check(found && found.mission.record === 'venera-9' && M.subjectId(found.mission, found.event) === 'venera-9', 'venera-9.landing is on the Venera 9 site');
  check(M.findEvent('venera-9.nothing') === null && M.findEvent('nobody-9.landing') === null, 'a link that names no event finds none');
  void ctx;
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n - ${problems.slice(0, 40).join('\n - ')}`);
  process.exit(1);
}
console.log(`ok: ${list.length} landers' missions, ${events} events, ${must.length} craft of the brief`);
