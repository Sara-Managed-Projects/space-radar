// data/trains.js -- a fresh launch's satellites as ONE thing: a train (spec 0026 req 17).
//
// Pure. Exported:
//   trainsFrom(records, nowMs, opts) -> [{designator, members, lead, count, meanAltKm, stillRaising}]
//   trainOf(record, records, nowMs, opts) -> the train this record rides in, or null
//   phaseOf(record, nowMs) -> the record's argument of latitude now, radians, for ordering
//
// satellitemap.space's third take: our starlink-trains layer already groups by launch designator;
// what a beginner needs on top is "is it still a train" and "which one leads". Still a train means
// the members have not yet climbed to their working shell -- their mean height is under the
// threshold the registry row carries (`train.still_raising_below_km`, 500 km for Starlink) -- and
// the lead is the member farthest along the orbit right now, found by unwrapping every member's
// argument of latitude around the group's median so the date-line of the angle does not split it.

const TWO_PI = Math.PI * 2;
const MU_KM3_S2 = 398600.4418;
const R_EARTH_KM = 6371;
const DEFAULT_STILL_RAISING_KM = 500;
const DEFAULT_MIN_MEMBERS = 2;

/** Argument of latitude now (mean anomaly + argument of perigee, advanced by mean motion), radians in [0, 2π). */
export function phaseOf(record, nowMs) {
  const s = record && record.satrec;
  if (!s || !Number.isFinite(s.mo) || !Number.isFinite(s.no) || !Number.isFinite(s.jdsatepoch)) return null;
  const epochMs = (s.jdsatepoch - 2440587.5) * 86400e3;
  const minutes = (nowMs - epochMs) / 60e3;
  const u = (s.mo + (Number.isFinite(s.argpo) ? s.argpo : 0) + s.no * minutes) % TWO_PI;
  return u < 0 ? u + TWO_PI : u;
}

/** Mean height above the ground, km: the record's own perigee/apogee, else from the mean motion. */
export function meanAltitudeKm(record) {
  const m = (record && record.meta) || {};
  if (Number.isFinite(m.perigeeKm) && Number.isFinite(m.apogeeKm)) return (m.perigeeKm + m.apogeeKm) / 2;
  const s = record && record.satrec;
  if (s && Number.isFinite(s.no) && s.no > 0) {
    const nRadS = s.no / 60;
    const a = Math.cbrt(MU_KM3_S2 / (nRadS * nRadS));
    return a - R_EARTH_KM;
  }
  return null;
}

function median(xs) {
  const a = xs.slice().sort((p, q) => p - q);
  const h = a.length >> 1;
  return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
}

export function trainsFrom(records, nowMs, opts = {}) {
  const threshold = Number.isFinite(opts.stillRaisingBelowKm) ? opts.stillRaisingBelowKm : DEFAULT_STILL_RAISING_KM;
  const minMembers = Number.isFinite(opts.minMembers) ? opts.minMembers : DEFAULT_MIN_MEMBERS;
  const groups = new Map();
  for (const r of Array.isArray(records) ? records : []) {
    const key = r && r.meta && r.meta.launchDesignator;
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const [designator, members] of groups) {
    if (members.length < minMembers) continue;
    const phased = members.map((r) => ({ r, u: phaseOf(r, nowMs) })).filter((x) => x.u !== null);
    let ordered = members.slice();
    let lead = members[0];
    if (phased.length >= 2) {
      const med = median(phased.map((x) => x.u));
      // unwrap around the median: a member 350° round when the rest are at 10° is 10° behind, not 340° ahead
      for (const x of phased) { let d = x.u - med; if (d > Math.PI) d -= TWO_PI; if (d < -Math.PI) d += TWO_PI; x.d = d; }
      phased.sort((a, b) => b.d - a.d); // farthest along first
      ordered = phased.map((x) => x.r).concat(members.filter((r) => !phased.some((x) => x.r === r)));
      lead = ordered[0];
    }
    const alts = members.map(meanAltitudeKm).filter((a) => Number.isFinite(a));
    const meanAltKm = alts.length ? alts.reduce((s, a) => s + a, 0) / alts.length : null;
    out.push({
      designator,
      members: ordered,
      lead,
      count: members.length,
      meanAltKm: meanAltKm === null ? null : Math.round(meanAltKm),
      stillRaising: meanAltKm === null ? null : meanAltKm < threshold,
      thresholdKm: threshold,
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

export function trainOf(record, records, nowMs, opts = {}) {
  const key = record && record.meta && record.meta.launchDesignator;
  if (!key) return null;
  return trainsFrom((Array.isArray(records) ? records : []).filter((r) => r && r.meta && r.meta.launchDesignator === key), nowMs, opts)[0] || null;
}
