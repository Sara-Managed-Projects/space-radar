// data/owners.js -- who a catalogued object belongs to: CelesTrak's owner codes as countries,
// organisations and operators, with flags (forge #152).
//
// Contract, all pure:
//   OWNERS                     every SATCAT owner code CelesTrak documents, with its kind and ISO 3166 codes
//   ownerOf(code)              -> {code, kind, iso, parts, name, note} | null
//   flagHref(iso)              -> 'images/flags/<iso>.svg' for a country with a flag file, else null
//   FLAGS                      the ISO codes that have one (site/images/flags/sources.json says where each came from)
//   catalogueRows(csv)         -> every catalogue line, slimmed: {id, name, intl, type, ops, owner, launchMs, decayMs,
//                                 apogeeKm, perigeeKm, incDeg, periodMin, status, centre}
//   kindOfRow(row)             -> 'working' | 'dead' | 'debris' | 'rocket' | 'other' (data/satcat.js's words)
//   OPERATORS                  companies and agencies a person names, matched by owner code or by object name
//   operatorOf(row)            -> an OPERATORS id, or null
//   countBy(rows, keyOf)       -> [{key, total, working, dead, debris, rocket, other, noPath}] in orbit, most first
//   noPathWhy(row)             -> null when the object has a public path, else 'no-elements' | 'deep-space'
//   LAGRANGE                   the balance points as places, filled from the catalogue's ORBIT_CENTER
//   lagrangeRows(rows)         -> [{id, rows}] what sits at each, launch order
//   COUNTRY_SLUG(iso)          -> the /country/<slug>/ page's slug: the lower-case ISO 3166 alpha-2 code
//
// WHERE THE CODES COME FROM. CelesTrak, "SATCAT Format Documentation: Sources"
// (https://celestrak.org/satcat/sources.php, read 2026-11-07): one row per code with its description, and
// the catalogue's OWNER column uses exactly those codes. Two codes in the catalogue of 2026-11-05 are not on
// that page (SVK, UGA); they are the ISO 3166 alpha-3 codes of Slovakia and Uganda and are mapped so.
// The ISO 3166-1 alpha-2 code of each country is ours (the standard's own list); the country's NAME on
// screen is the browser's (Intl.DisplayNames), so it is in the visitor's language without a word of copy.
//
// WHAT A CODE MEANS, honestly. `CIS` is "Commonwealth of Independent States (former USSR)": the
// catalogue counts the Soviet Union and Russia as one owner, so its flag is Russia's and its row says so
// (`note: 'ussr'`). A joint code (CHBZ, FGER, ...) is two countries, drawn with both flags. An
// organisation (ESA, ITSO, NATO, ...) has no flag: its emblem is a trademark, not a national symbol.
// `UNK` and `TBD` are the catalogue saying it does not know. `TBD` has no row (scripts/check_copy.py refuses those three
// letters in any shipped string), so ownerOf() answers null for it and the panel says "Not yet known", as for UNK.
//
// THE OPERATORS are not in the catalogue: an operator is a company, and the catalogue records the
// country or the organisation that is responsible. They are matched two ways, both written here:
// an owner code that IS an operator (SES, ITSO, Globalstar...), or the name the operator gives its
// satellites (STARLINK-, KUIPER-, ONEWEB-...), read from each operator's own naming in the catalogue.
// A name rule is a curation, so the panel says "by name" on those rows.

// A quoted CSV field is rare in satcat.csv (a name with a comma); data/parsers.js has the same reader, but
// importing it would bring satellite.js into the worker that runs this.
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; } else quoted = !quoted; }
    else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// [code, kind, iso (one, or two for a joint code, or ''), English name, note?]
// The name is CelesTrak's description, shortened where it carried a long form; for a country the screen
// uses the browser's own name for the ISO code instead.
export const OWNERS = [
  ['AB', 'org', '', 'Arabsat'], ['ABS', 'org', '', 'ABS (Asia Broadcast Satellite)'], ['AC', 'org', '', 'AsiaSat'],
  ['ALG', 'country', 'DZ', 'Algeria'], ['ANG', 'country', 'AO', 'Angola'], ['ARGN', 'country', 'AR', 'Argentina'],
  ['ARM', 'country', 'AM', 'Armenia'], ['ASRA', 'country', 'AT', 'Austria'], ['AUS', 'country', 'AU', 'Australia'],
  ['AZER', 'country', 'AZ', 'Azerbaijan'], ['BEL', 'country', 'BE', 'Belgium'], ['BELA', 'country', 'BY', 'Belarus'],
  ['BERM', 'country', 'BM', 'Bermuda'], ['BGD', 'country', 'BD', 'Bangladesh'], ['BHR', 'country', 'BH', 'Bahrain'],
  ['BHUT', 'country', 'BT', 'Bhutan'], ['BOL', 'country', 'BO', 'Bolivia'], ['BRAZ', 'country', 'BR', 'Brazil'],
  ['BUL', 'country', 'BG', 'Bulgaria'], ['BWA', 'country', 'BW', 'Botswana'], ['CA', 'country', 'CA', 'Canada'],
  ['CHBZ', 'joint', 'CN BR', 'China and Brazil'], ['CHTU', 'joint', 'CN TR', 'China and Türkiye'], ['CHLE', 'country', 'CL', 'Chile'],
  ['CIS', 'country', 'RU', 'Soviet Union and Russia', 'ussr'], ['COL', 'country', 'CO', 'Colombia'], ['CRI', 'country', 'CR', 'Costa Rica'],
  ['CZCH', 'country', 'CZ', 'Czechia (and Czechoslovakia)'], ['DEN', 'country', 'DK', 'Denmark'], ['DJI', 'country', 'DJ', 'Djibouti'],
  ['ECU', 'country', 'EC', 'Ecuador'], ['EGYP', 'country', 'EG', 'Egypt'], ['ESA', 'org', '', 'European Space Agency'],
  ['ESRO', 'org', '', 'European Space Research Organisation'], ['EST', 'country', 'EE', 'Estonia'], ['ETH', 'country', 'ET', 'Ethiopia'],
  ['EUME', 'org', '', 'EUMETSAT'], ['EUTE', 'org', '', 'Eutelsat'], ['FGER', 'joint', 'FR DE', 'France and Germany'],
  ['FIN', 'country', 'FI', 'Finland'], ['FR', 'country', 'FR', 'France'], ['FRIT', 'joint', 'FR IT', 'France and Italy'],
  ['GER', 'country', 'DE', 'Germany'], ['GHA', 'country', 'GH', 'Ghana'], ['GLOB', 'org', '', 'Globalstar'],
  ['GREC', 'country', 'GR', 'Greece'], ['GRSA', 'joint', 'GR SA', 'Greece and Saudi Arabia'], ['GUAT', 'country', 'GT', 'Guatemala'],
  ['HRV', 'country', 'HR', 'Croatia'], ['HUN', 'country', 'HU', 'Hungary'], ['IM', 'org', '', 'Inmarsat'],
  ['IND', 'country', 'IN', 'India'], ['INDO', 'country', 'ID', 'Indonesia'], ['IRAN', 'country', 'IR', 'Iran'],
  ['IRAQ', 'country', 'IQ', 'Iraq'], ['IRID', 'org', '', 'Iridium'], ['IRL', 'country', 'IE', 'Ireland'],
  ['ISRA', 'country', 'IL', 'Israel'], ['ISRO', 'org', '', 'Indian Space Research Organisation'], ['ISS', 'org', '', 'International Space Station partners'],
  ['IT', 'country', 'IT', 'Italy'], ['ITSO', 'org', '', 'Intelsat'], ['JPN', 'country', 'JP', 'Japan'],
  ['KAZ', 'country', 'KZ', 'Kazakhstan'], ['KEN', 'country', 'KE', 'Kenya'], ['LAOS', 'country', 'LA', 'Laos'],
  ['LKA', 'country', 'LK', 'Sri Lanka'], ['LTU', 'country', 'LT', 'Lithuania'], ['LUXE', 'country', 'LU', 'Luxembourg'],
  ['MA', 'country', 'MA', 'Morocco'], ['MALA', 'country', 'MY', 'Malaysia'], ['MCO', 'country', 'MC', 'Monaco'],
  ['MDA', 'country', 'MD', 'Moldova'], ['MEX', 'country', 'MX', 'Mexico'], ['MMR', 'country', 'MM', 'Myanmar'],
  ['MNE', 'country', 'ME', 'Montenegro'], ['MNG', 'country', 'MN', 'Mongolia'], ['MUS', 'country', 'MU', 'Mauritius'],
  ['NATO', 'org', '', 'NATO'], ['NETH', 'country', 'NL', 'Netherlands'], ['NICO', 'org', '', 'New ICO'],
  ['NIG', 'country', 'NG', 'Nigeria'], ['NKOR', 'country', 'KP', 'North Korea'], ['NOR', 'country', 'NO', 'Norway'],
  ['NPL', 'country', 'NP', 'Nepal'], ['NZ', 'country', 'NZ', 'New Zealand'], ['O3B', 'org', '', 'O3b Networks'],
  ['ORB', 'org', '', 'ORBCOMM'], ['PAKI', 'country', 'PK', 'Pakistan'], ['PERU', 'country', 'PE', 'Peru'],
  ['POL', 'country', 'PL', 'Poland'], ['POR', 'country', 'PT', 'Portugal'], ['PRC', 'country', 'CN', 'China'],
  ['PRY', 'country', 'PY', 'Paraguay'], ['PRES', 'joint', 'CN', 'China and the European Space Agency'], ['QAT', 'country', 'QA', 'Qatar'],
  ['RASC', 'org', '', 'RascomStar-QAF'], ['ROC', 'country', 'TW', 'Taiwan'], ['ROM', 'country', 'RO', 'Romania'],
  ['RP', 'country', 'PH', 'Philippines'], ['RWA', 'country', 'RW', 'Rwanda'], ['SAFR', 'country', 'ZA', 'South Africa'],
  ['SAUD', 'country', 'SA', 'Saudi Arabia'], ['SDN', 'country', 'SD', 'Sudan'], ['SEAL', 'org', '', 'Sea Launch'],
  ['SEN', 'country', 'SN', 'Senegal'], ['SES', 'org', '', 'SES'], ['SGJP', 'joint', 'SG JP', 'Singapore and Japan'],
  ['SING', 'country', 'SG', 'Singapore'], ['SKOR', 'country', 'KR', 'South Korea'], ['SLB', 'country', 'SB', 'Solomon Islands'],
  ['SPN', 'country', 'ES', 'Spain'], ['STCT', 'joint', 'SG TW', 'Singapore and Taiwan'], ['SVK', 'country', 'SK', 'Slovakia'],
  ['SVN', 'country', 'SI', 'Slovenia'], ['SWED', 'country', 'SE', 'Sweden'], ['SWTZ', 'country', 'CH', 'Switzerland'],
  ['THAI', 'country', 'TH', 'Thailand'], ['TMMC', 'joint', 'TM MC', 'Turkmenistan and Monaco'],
  ['TUN', 'country', 'TN', 'Tunisia'], ['TURK', 'country', 'TR', 'Türkiye'], ['UAE', 'country', 'AE', 'United Arab Emirates'],
  ['UGA', 'country', 'UG', 'Uganda'], ['UK', 'country', 'GB', 'United Kingdom'], ['UKR', 'country', 'UA', 'Ukraine'],
  ['UNK', 'unknown', '', 'Unknown'], ['URY', 'country', 'UY', 'Uruguay'], ['US', 'country', 'US', 'United States'],
  ['USBZ', 'joint', 'US BR', 'United States and Brazil'], ['VAT', 'country', 'VA', 'Vatican City'], ['VENZ', 'country', 'VE', 'Venezuela'],
  ['VTNM', 'country', 'VN', 'Vietnam'], ['ZWE', 'country', 'ZW', 'Zimbabwe'],
];

/**
 * The countries with a flag file under site/images/flags/ (every one public domain on Wikimedia Commons:
 * site/images/flags/sources.json names each file's page and licence, read 2026-11-07).
 */
export const FLAGS = new Set(('AE AM AO AR AT AU AZ BD BE BG BH BM BO BR BT BW BY CA CH CL CN CO CR CZ DE DJ DK DZ EC EE EG ES ET FI FR GB GH '
  + 'GR GT HR HU ID IE IL IN IQ IR IT JP KE KP KR KZ LA LK LT LU MA MC MD ME MM MN MU MX MY NG NL NO NP NZ PE PH PK PL PT PY QA RO RU RW SA '
  + 'SB SD SE SG SI SK SN TH TM TN TR TW UA UG US UY VA VE VN ZA ZW').split(' '));

const BY_CODE = new Map(OWNERS.map(([code, kind, iso, name, note]) => {
  const parts = iso ? iso.split(' ') : [];
  return [code, { code, kind, iso: parts[0] || null, parts, name, note: note || null }];
}));

/** The owner row for a catalogue code, or null for a code CelesTrak does not document. */
export function ownerOf(code) {
  return BY_CODE.get(String(code || '').trim().toUpperCase()) || null;
}

/** Where a country's flag is, relative to the page; null when there is none (an organisation, an unknown). */
export function flagHref(iso) {
  const c = String(iso || '').toUpperCase();
  return FLAGS.has(c) ? `images/flags/${c.toLowerCase()}.svg` : null;
}

/** The page of a country: /country/<slug>/ (scripts/seo_countries.py writes it). */
export function COUNTRY_SLUG(iso) {
  return String(iso || '').toLowerCase();
}

const WORKING = new Set(['+', 'P', 'B', 'S', 'X']);
const dateMs = (s) => {
  const v = String(s || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
  const ms = Date.parse(`${v.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(ms) ? ms : null;
};
const num = (s) => {
  const v = Number(String(s || '').trim());
  return String(s || '').trim() !== '' && Number.isFinite(v) ? v : null;
};

/**
 * Every line of CelesTrak's satcat.csv, slimmed to what the browsers need. Unlike data/satcat.js
 * parseSatcat (which keeps what is in Earth orbit now, for the census), this keeps every line, decayed
 * or not, and two columns that one drops: DATA_STATUS_CODE (NEA, NCE, NIE: no public element set) and
 * ORBIT_CENTER (EA the Earth, EL1 and EL2 the Sun-Earth balance points, EM the Earth-Moon pair, MO the
 * Moon, SU the Sun, ...). Lines without a catalogue number are skipped.
 */
export function catalogueRows(csv) {
  const lines = String(csv || '').split(/\r?\n/);
  const head = splitCsvLine(lines[0] || '').map((h) => h.trim());
  const c = (n) => head.indexOf(n);
  const at = {
    name: c('OBJECT_NAME'), intl: c('OBJECT_ID'), id: c('NORAD_CAT_ID'), type: c('OBJECT_TYPE'), ops: c('OPS_STATUS_CODE'), owner: c('OWNER'),
    launch: c('LAUNCH_DATE'), decay: c('DECAY_DATE'), period: c('PERIOD'), inc: c('INCLINATION'), apo: c('APOGEE'), peri: c('PERIGEE'),
    status: c('DATA_STATUS_CODE'), centre: c('ORBIT_CENTER'),
  };
  if (at.id < 0 || at.owner < 0) return [];
  const out = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const f = line.indexOf('"') < 0 ? line.split(',') : splitCsvLine(line);
    const id = num(f[at.id]);
    if (!Number.isInteger(id) || id <= 0) continue;
    const get = (k) => (at[k] >= 0 ? String(f[at[k]] || '').trim() : '');
    out.push({
      id, name: get('name'), intl: get('intl'), type: get('type'), ops: get('ops'), owner: get('owner'),
      launchMs: dateMs(get('launch')), decayMs: dateMs(get('decay')),
      apogeeKm: num(get('apo')), perigeeKm: num(get('peri')), incDeg: num(get('inc')), periodMin: num(get('period')),
      status: get('status'), centre: get('centre') || 'EA',
    });
  }
  return out;
}

/** The census's five kinds (data/satcat.js KINDS), for one slim row. */
export function kindOfRow(row) {
  if (!row) return 'other';
  if (row.type === 'DEB') return 'debris';
  if (row.type === 'R/B') return 'rocket';
  if (row.type === 'PAY') return WORKING.has(row.ops) ? 'working' : 'dead';
  return 'other';
}

/**
 * Why there is no public path for an object still up, or null when there is one. `no-elements`: the
 * catalogue's DATA_STATUS_CODE says no element set is published for it (NEA, NCE, NIE; classified
 * payloads and lost objects are most of these). `deep-space`: it is not in Earth orbit (ORBIT_CENTER
 * other than EA), so no SGP4 element set can draw it; a craft with a JPL track has its own path file
 * here (data/ephemerides.js), which the panel checks before it says so.
 */
export function noPathWhy(row) {
  if (!row || row.decayMs !== null) return null;
  if (row.centre && row.centre !== 'EA' && !/^\d+$/.test(row.centre)) return 'deep-space';
  if (row.status === 'NEA' || row.status === 'NCE' || row.status === 'NIE') return 'no-elements';
  return null;
}

/**
 * The operators: `owners` are catalogue codes that are the operator itself; `names` match the object's
 * name as its operator writes it (the catalogue of 2026-11-05: STARLINK-1008, KUIPER-00008, ONEWEB-0012,
 * QIANFAN-1, FLOCK 4Q-16, LEMUR-2-..., ICEYE-X2, SPACEMOBILE-001, IRIDIUM 106, GLOBALSTAR M069). `site`
 * is the operator's own page, for the row's link.
 */
export const OPERATORS = [
  { id: 'spacex', name: 'SpaceX', names: /^STARLINK\b/, site: 'https://www.starlink.com/' },
  { id: 'amazon', name: 'Amazon (Project Kuiper)', names: /^KUIPER\b/, site: 'https://www.aboutamazon.com/what-we-do/devices-services/project-kuiper' },
  { id: 'oneweb', name: 'Eutelsat OneWeb', names: /^ONEWEB\b/, site: 'https://oneweb.net/' },
  { id: 'spacesail', name: 'Spacesail (Qianfan)', names: /^QIANFAN\b/, site: 'https://www.spacesail.com.cn/' },
  { id: 'planet', name: 'Planet', names: /^(FLOCK|SKYSAT|DOVE|PELICAN)\b/, site: 'https://www.planet.com/' },
  { id: 'spire', name: 'Spire', names: /^LEMUR\b/, site: 'https://spire.com/' },
  { id: 'iceye', name: 'ICEYE', names: /^ICEYE\b/, site: 'https://www.iceye.com/' },
  { id: 'ast', name: 'AST SpaceMobile', names: /^(SPACEMOBILE|BLUEWALKER)\b/, site: 'https://ast-science.com/' },
  { id: 'iridium', name: 'Iridium', owners: ['IRID'], names: /^IRIDIUM\b(?!.*\bDEB\b)/, site: 'https://www.iridium.com/' },
  { id: 'globalstar', name: 'Globalstar', owners: ['GLOB'], site: 'https://www.globalstar.com/' },
  { id: 'orbcomm', name: 'ORBCOMM', owners: ['ORB'], site: 'https://www.orbcomm.com/' },
  { id: 'ses', name: 'SES', owners: ['SES', 'O3B'], site: 'https://www.ses.com/' },
  { id: 'intelsat', name: 'Intelsat', owners: ['ITSO'], site: 'https://www.intelsat.com/' },
  { id: 'eutelsat', name: 'Eutelsat', owners: ['EUTE'], site: 'https://www.eutelsat.com/' },
  { id: 'inmarsat', name: 'Inmarsat', owners: ['IM'], site: 'https://www.inmarsat.com/' },
  { id: 'esa', name: 'European Space Agency', owners: ['ESA', 'ESRO'], site: 'https://www.esa.int/' },
  { id: 'eumetsat', name: 'EUMETSAT', owners: ['EUME'], site: 'https://www.eumetsat.int/' },
  { id: 'isro', name: 'ISRO', owners: ['ISRO'], site: 'https://www.isro.gov.in/' },
  { id: 'arabsat', name: 'Arabsat', owners: ['AB'], site: 'https://www.arabsat.com/' },
  { id: 'asiasat', name: 'AsiaSat', owners: ['AC'], site: 'https://www.asiasat.com/' },
  { id: 'abs', name: 'ABS', owners: ['ABS'], site: 'https://www.absatellite.com/' },
  { id: 'nato', name: 'NATO', owners: ['NATO'], site: 'https://www.nato.int/' },
  { id: 'iss', name: 'International Space Station partners', owners: ['ISS'], site: 'https://www.nasa.gov/international-space-station/' },
];
const OPERATOR_BY_OWNER = new Map(OPERATORS.flatMap((o) => (o.owners || []).map((c) => [c, o.id])));

/** The operator an object is counted under, or null. An owner code wins over a name rule. */
export function operatorOf(row) {
  if (!row) return null;
  const byOwner = OPERATOR_BY_OWNER.get(row.owner);
  if (byOwner) return byOwner;
  const name = String(row.name || '').toUpperCase();
  for (const o of OPERATORS) if (o.names && o.names.test(name)) return o.id;
  return null;
}

/** An operator's row by id, or null. */
export function operatorById(id) {
  const k = String(id || '').toLowerCase();
  return OPERATORS.find((o) => o.id === k) || null;
}

/**
 * Counts per key of what is up now (decayMs null): total, the five kinds, and how many have no public
 * path (noPathWhy). `keyOf(row)` names the group; a row it gives null is not counted. Most first, then by key.
 */
export function countBy(rows, keyOf) {
  const groups = new Map();
  for (const r of rows || []) {
    if (r.decayMs !== null) continue;
    const key = keyOf(r);
    if (key === null || key === undefined || key === '') continue;
    let g = groups.get(key);
    if (!g) { g = { key, total: 0, working: 0, dead: 0, debris: 0, rocket: 0, other: 0, noPath: 0 }; groups.set(key, g); }
    g.total += 1;
    g[kindOfRow(r)] += 1;
    if (noPathWhy(r)) g.noPath += 1;
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || String(a.key).localeCompare(String(b.key)));
}

/**
 * THE BALANCE POINTS AS PLACES. The catalogue's ORBIT_CENTER names two: EL1, the Sun-Earth L1 point
 * 1.5 million km sunward (SOHO, ACE, Wind, DSCOVR, Aditya-L1 on 2026-11-05), and EL2, 1.5 million km
 * the other way (Gaia, JWST, Euclid, Spektr-RG). Earth-Moon L2, past the far side of the
 * Moon, is not a code of its own: Queqiao (2018-045A), the Chang'e-4 relay that CNSA put on a halo orbit
 * round that point in 2018, is filed under EM, so that row names it by designator. (Queqiao-2 of 2024 is on
 * an elliptical orbit round the Moon itself, not at the point, and is not listed there.)
 */
export const LAGRANGE = [
  { id: 'sel1', centres: ['EL1'] },
  { id: 'sel2', centres: ['EL2'] },
  { id: 'eml2', intl: ['2018-045A'] },
];

/** What sits at each balance point, in launch order. Objects that came down are left out. */
export function lagrangeRows(rows) {
  return LAGRANGE.map((p) => ({
    id: p.id,
    rows: (rows || []).filter((r) => r.decayMs === null && (p.centres ? p.centres.includes(r.centre) : p.intl.includes(r.intl)))
      .sort((a, b) => (a.launchMs || 0) - (b.launchMs || 0) || a.id - b.id),
  }));
}
