// ui/systemcard.js -- what a card says about a planet or a star of a GENERATED system (internal #466).
//
// Contract, all pure, all exported for tests/test_systems_table.mjs:
//   knownLine(planet)            "Nobody has seen its surface. Its size and year are measured."
//   planetFacts(system, planet)  { radius, mass, rows: [[label, value], ...] } -- `radius` and `mass`
//                                replace the plain "1.7x Earth" when the number is an estimate
//   starRows(system)             [[label, value], ...]
//   generatedLine(system)        the drawing line on the system's stage
//
// THE RULE. The NASA Exoplanet Archive's composite table fills a missing radius from the mass and a
// missing mass from the radius; a radial-velocity mass is a least mass; the orbit's size is computed
// here when the table's own does not agree with the year (scripts/build-systems.py). Every one of
// those says so beside the number. The temperature and the habitable zone are computed, and their
// row's LABEL says "computed". "In the habitable zone" is printed from the row's `zone` and from
// nowhere else. Nothing here is typed per planet: every line is a template and a row.
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { phaseIsMeasured, LY_PER_PC } from '../scene/systems.js';

/**
 * "41 light-years" (internal #280): how far the system is from the Earth, from the archive's own
 * parallax distance in the row (`hostSky.distPc`). Two significant figures under a hundred,
 * whole above: a distance known to a few per cent is not printed to the light-day.
 */
export function fromEarthRow(system) {
  const pc = system && system.hostSky ? Number(system.hostSky.distPc) : NaN;
  if (!(pc > 0)) return null;
  const ly = pc * LY_PER_PC;
  const C = COPY.starSystem;
  return [C.rows.fromEarth, t(C.lightYears, { n: ly < 100 ? fmt.smart(Number(ly.toPrecision(2))) : fmt.int(Math.round(ly)) })];
}

const join = (words, C) => (words.length > 1 ? words.slice(0, -1).join(COPY.punctuation.listJoin) + C.and + words[words.length - 1] : words[0]);

export function knownLine(planet) {
  const C = COPY.starSystem;
  const measured = [];
  const estimated = [];
  if (planet.radiusFrom === 'measured') measured.push(C.what.size);
  else if (planet.radiusFrom === 'estimated') estimated.push(C.what.size);
  measured.push(C.what.year);
  if (planet.massFrom === 'measured') measured.push(C.what.mass);
  else if (planet.massFrom === 'least') measured.push(C.what.least);
  else if (planet.massFrom === 'estimated') estimated.push(C.what.mass);
  const out = [C.unseen, t(measured.length > 1 ? C.measuredMany : C.measuredOne, { what: join(measured, C) })];
  if (estimated.length) out.push(t(estimated.length > 1 ? C.estimatedMany : C.estimatedOne, { what: join(estimated, C) }));
  if (!planet.radiusFrom) out.push(t(C.unmeasuredOne, { what: C.what.size }));
  return out.join(' ');
}

export function planetFacts(system, planet, albedo = 0.3) {
  const C = COPY.starSystem;
  const R = C.rows;
  const rows = [[R.known, knownLine(planet)]];
  const far = fromEarthRow(system);
  if (far) rows.push(far);
  const n = (v) => fmt.smart(v);
  const radius = planet.radiusFrom === 'estimated' ? t(C.earthsEstimated, { n: n(planet.radiusEarths) })
    : !planet.radiusFrom ? C.sizeDefault : null;
  const mass = planet.massFrom === 'estimated' ? t(C.massEstimated, { n: n(planet.massEarths) })
    : planet.massFrom === 'least' ? t(C.massLeast, { n: n(planet.massEarths) }) : null;
  rows.push([R.orbit, t(planet.aFrom === 'kepler' ? C.auComputed : C.au, { n: n(planet.aAu) })]);
  if (Number.isFinite(planet.equilibriumK)) {
    rows.push([R.temperature, t(C.temperature, { k: fmt.int(planet.equilibriumK), c: fmt.int(Math.round(planet.equilibriumK - 273.15)), pct: fmt.int(Math.round(albedo * 100)) })]);
  }
  rows.push([R.zone, planet.circumbinary ? C.zoneNone.twoStars : planet.zone ? C.zone[planet.zone] : C.zoneNone[system.zoneMissing] || C.notMeasured]);
  return { radius, mass, rows };
}

export function starRows(system) {
  const C = COPY.starSystem;
  const R = C.rows;
  const s = system.star;
  const rows = [];
  const far = fromEarthRow(system);
  if (far) rows.push(far);
  rows.push([R.starTemperature, Number.isFinite(s.teffK) ? t(C.kelvin, { n: fmt.int(s.teffK) }) : C.starWhite]);
  rows.push([R.starWidth, Number.isFinite(s.radiusSuns) ? t(COPY.card.values.suns, { n: fmt.smart(s.radiusSuns) }) : C.starPoint]);
  rows.push([R.starMass, Number.isFinite(s.massSuns) ? t(COPY.card.values.suns, { n: fmt.smart(s.massSuns) }) : C.notMeasured]);
  rows.push([R.planets, fmt.int(system.planets.length)]);
  if (system.starsInSystem > 1) rows.push([R.stars, t(C.starsOne, { n: fmt.int(system.starsInSystem) })]);
  rows.push([R.zone, system.zone ? t(C.zoneRange, { a: fmt.smart(system.zone.innerAu), b: fmt.smart(system.zone.outerAu) }) : C.zoneNone[system.zoneMissing] || C.notMeasured]);
  return rows;
}

export function generatedLine(system) {
  const C = COPY.starSystem;
  const computed = system.planets.filter((p) => p.aFrom === 'kepler').length;
  return t(C.line, {
    date: system.asOf,
    computed: computed ? t(C.lineComputed, { n: fmt.int(computed) }) : '',
    phase: system.planets.some((p) => !phaseIsMeasured(p)) ? COPY.trip.systemPhaseUnknown : '',
    defaults: system.planets.some((p) => !p.radiusFrom) ? C.lineDefaults : '',
  });
}
