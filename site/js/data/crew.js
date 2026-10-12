// data/crew.js -- who is aboard a space station and what is docked to it, from Launch Library 2
// (internal #133, spec 0050 requirements 1 to 3).
//
// Two saved copies, read only when a station's card opens (ui/cards.js), never at boot:
//   ll2-stations     /space_stations/?status=1&mode=detailed : each active station's ports, and
//                    for every port the vehicle docked there now with the time it docked and the
//                    launch it rode; `onboard_crew`, the publisher's own headcount
//   ll2-astronauts   /astronauts/?in_space=true : every person flagged as in space, with the
//                    time of their last launch
//
// THE JOIN IS COMPUTED, AND CHECKED. LL2 does not say which station a person is on. A person is
// aboard a station when their last launch is the launch of a vehicle docked there now (the two
// times are the same instant in both answers). The count that join gives is then held against the
// station's own `onboard_crew`: when they agree the names are shown; when they do not, only the
// publisher's count is, and the card says the list could not be matched. Read 2026-10-08: the
// astronauts answer still flagged Crew-12's four as in space a week after their Dragon had left,
// and listed "Starman" (type "Non-Human"); the join drops both, and the counts agree (7 and 3).
//
// Pure: bodies in, rows out. No DOM, no clock of its own.

/** LL2's station id -> the record its elements load as (registry/layers.yaml `stations`). */
export const STATION_RECORD = { 4: 'sat-25544', 18: 'sat-48274' };

/** Past this the card says the list is old (spec 0050 requirement 1). */
export const CREW_STALE_MS = 48 * 3600e3;

const ms = (iso) => { const v = Date.parse(iso); return Number.isFinite(v) ? v : null; };

/** The vehicles docked to each active station now: { [recordId]: { name, crewCount, docked: [...] } }. */
export function parseStations(body) {
  const out = {};
  const list = body && Array.isArray(body.results) ? body.results : [];
  for (const s of list) {
    const recordId = STATION_RECORD[s && s.id];
    if (!recordId) continue;
    const docked = [];
    for (const port of Array.isArray(s.docking_location) ? s.docking_location : []) {
      const d = port && port.currently_docked;
      const flight = d && d.flight_vehicle_chaser;
      const craft = flight && flight.spacecraft;
      if (!craft || !craft.name || d.departure) continue;
      const config = craft.spacecraft_config || {};
      docked.push({
        vehicle: String(craft.name),
        port: String(port.name || ''),
        dockedMs: ms(d.docking),
        launchMs: flight.launch ? ms(flight.launch.net) : null,
        crewed: config.human_rated === true,
      });
    }
    docked.sort((a, b) => (b.dockedMs || 0) - (a.dockedMs || 0));
    out[recordId] = {
      name: String(s.name || ''),
      crewCount: Number.isFinite(s.onboard_crew) ? s.onboard_crew : null,
      docked,
    };
  }
  return out;
}

/** Everyone LL2 flags as in space who is a person: [{ name, agency, launchMs }]. */
export function parseAstronauts(body) {
  const list = body && Array.isArray(body.results) ? body.results : [];
  const out = [];
  for (const a of list) {
    if (!a || !a.name || a.in_space !== true) continue;
    if (a.type && /non-human/i.test(String(a.type.name || ''))) continue;
    out.push({ name: String(a.name), agency: a.agency && a.agency.abbrev ? String(a.agency.abbrev) : '', launchMs: ms(a.last_flight) });
  }
  return out;
}

/**
 * A station's people and vehicles. `people` is null when the join's count and the publisher's
 * disagree (or there is no astronauts answer): the count stands alone then, and `matched` says so.
 */
export function stationCrew(recordId, stationsBody, astronautsBody) {
  const st = parseStations(stationsBody)[recordId];
  if (!st) return null;
  const rides = new Set(st.docked.filter((d) => d.crewed && d.launchMs !== null).map((d) => d.launchMs));
  const joined = parseAstronauts(astronautsBody).filter((p) => p.launchMs !== null && rides.has(p.launchMs))
    .sort((a, b) => a.launchMs - b.launchMs || a.name.localeCompare(b.name));
  const matched = joined.length > 0 && (st.crewCount === null || joined.length === st.crewCount);
  return {
    name: st.name,
    crewCount: st.crewCount !== null ? st.crewCount : (matched ? joined.length : null),
    people: matched ? joined : null,
    matched,
    docked: st.docked,
  };
}

/** Whole days between two instants, never negative. */
export function daysBetween(fromMs, toMs) {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return null;
  return Math.max(0, Math.floor((toMs - fromMs) / 864e5));
}
