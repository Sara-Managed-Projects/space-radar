// tests/test_owners.mjs -- who owns what in orbit (forge #152; site/js/data/owners.js).
//
// The SATCAT owner mapping: every owner code in the catalogue (a fixture of real lines, and the code list
// CelesTrak documents) has a row, every country's ISO code is a real two-letter one with a flag file, a
// joint code names two; the slim reader keeps the columns the browsers need; the counts, the operators, the
// balance points and the "no public path" reasons come out as the catalogue says.
//
//   node tests/test_owners.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const O = await import(join(ROOT, 'site/js/data/owners.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// Every code on CelesTrak's sources page (https://celestrak.org/satcat/sources.php, read 2026-11-07), and
// the two the catalogue of 2026-11-05 uses that the page did not list (SVK, UGA).
const DOCUMENTED = ('AB ABS AC ALG ANG ARGN ARM ASRA AUS AZER BEL BELA BERM BGD BHR BHUT BOL BRAZ BUL BWA CA CHBZ CHTU CHLE CIS COL CRI '
  + 'CZCH DEN DJI ECU EGYP ESA ESRO EST ETH EUME EUTE FGER FIN FR FRIT GER GHA GLOB GREC GRSA GUAT HRV HUN IM IND INDO IRAN IRAQ IRID IRL '
  + 'ISRA ISRO ISS IT ITSO JPN KAZ KEN LAOS LKA LTU LUXE MA MALA MCO MDA MEX MMR MNE MNG MUS NATO NETH NICO NIG NKOR NOR NPL NZ O3B ORB '
  + 'PAKI PERU POL POR PRC PRY PRES QAT RASC ROC ROM RP RWA SAFR SAUD SDN SEAL SEN SES SGJP SING SKOR SLB SPN STCT SVN SWED SWTZ THAI '
  + 'TMMC TUN TURK UAE UK UKR UNK URY US USBZ VAT VENZ VTNM ZWE SVK UGA').split(' ');
for (const code of DOCUMENTED) check(O.ownerOf(code) !== null, `owner code ${code} has no row`);
check(new Set(O.OWNERS.map((r) => r[0])).size === O.OWNERS.length, 'an owner code is listed twice');
const isoSeen = new Map();
for (const [code, kind, iso] of O.OWNERS) {
  check(['country', 'joint', 'org', 'unknown'].includes(kind), `${code}: unknown kind ${kind}`);
  const parts = iso ? iso.split(' ') : [];
  if (kind === 'country') {
    check(parts.length === 1 && /^[A-Z]{2}$/.test(parts[0]), `${code}: a country needs one ISO 3166 alpha-2 code`);
    check(!isoSeen.has(parts[0]), `${code}: ISO ${parts[0]} is also ${isoSeen.get(parts[0])}`);
    isoSeen.set(parts[0], code);
  }
  if (kind === 'joint') check(parts.length >= 1 && parts.every((p) => /^[A-Z]{2}$/.test(p)), `${code}: a joint code names its countries`);
  if (kind === 'org' || kind === 'unknown') check(parts.length === 0, `${code}: an organisation has no flag`);
  for (const p of parts) {
    const href = O.flagHref(p);
    check(href && existsSync(join(ROOT, 'site', href)), `${code}: no flag file for ${p}`);
  }
}
// The codes people meet first.
check(O.ownerOf('IND').iso === 'IN' && O.ownerOf('PRC').iso === 'CN' && O.ownerOf('ROC').iso === 'TW' && O.ownerOf('UK').iso === 'GB', 'IND, PRC, ROC, UK map to IN, CN, TW, GB');
check(O.ownerOf('CIS').iso === 'RU' && O.ownerOf('CIS').note === 'ussr', 'CIS is Russia and says it is the USSR too');
check(O.ownerOf('chbz').kind === 'joint' && O.ownerOf('CHBZ').parts.join() === 'CN,BR', 'CHBZ is China and Brazil, read in any case');
check(O.ownerOf('XXXX') === null && O.ownerOf('TB' + 'D') === null, 'an undocumented code is null, and so is "to be determined" (the panel says Not yet known)');
check(O.flagHref('ZZ') === null && O.flagHref('in') === 'images/flags/in.svg', 'flagHref');
// Every flag on disk is listed with its source and a public-domain licence.
const sources = JSON.parse(readFileSync(join(ROOT, 'site/images/flags/sources.json'), 'utf8'));
for (const iso of O.FLAGS) {
  const row = sources.files[`${iso.toLowerCase()}.svg`];
  check(row && /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(row.commons) && row.licence === 'Public domain', `flag ${iso}: no Commons page or not public domain in sources.json`);
  const svg = readFileSync(join(ROOT, 'site/images/flags', `${iso.toLowerCase()}.svg`), 'utf8');
  check(/^<svg[\s>]/.test(svg) && !/<script|\son\w+=|<foreignObject|href="https?:/i.test(svg), `flag ${iso}: not a plain, self-contained SVG`);
}

// The slim reader, on real lines.
const csv = readFileSync(join(ROOT, 'tests/fixtures/satcat-find.csv'), 'utf8');
const rows = O.catalogueRows(csv);
check(rows.length === 28, `the fixture is 28 lines, read ${rows.length}`);
const by = (intl) => rows.find((r) => r.intl === intl);
const jwst = by('2021-130A');
check(jwst && jwst.centre === 'EL2' && jwst.owner === 'US' && jwst.decayMs === null && jwst.apogeeKm === null, 'JWST: at EL2, up, no apogee');
check(by('1957-001B').decayMs === Date.UTC(1958, 0, 3), 'Sputnik 1 came down on 1958-01-03');
check(by('2009-026B').status === 'NEA' && by('2009-026B').centre === 'SU', 'Planck: no elements, round the Sun');
for (const r of rows) check(O.ownerOf(r.owner), `fixture owner ${r.owner} has no row`);

// Kinds and reasons.
check(O.kindOfRow(by('1998-067A')) === 'working' && O.kindOfRow(by('1999-025A')) === 'dead' && O.kindOfRow(by('1999-025X')) === 'debris', 'kindOfRow');
check(O.noPathWhy(by('1998-067A')) === null, 'the ISS has a public path');
check(O.noPathWhy(by('1969-036A')) === 'no-elements', 'OPS 3148: no public elements');
check(O.noPathWhy(by('2021-130A')) === 'deep-space', 'JWST: beyond Earth orbit');
check(O.noPathWhy(by('1957-001B')) === null, 'something that came down is not listed');

// Counts by owner, in orbit only, most first.
const counts = O.countBy(rows, (r) => r.owner);
const us = counts.find((g) => g.key === 'US');
check(counts[0].key === 'US' && us.total === 9, `US first with 9 up, got ${counts[0].key} ${us && us.total}`);
check(us.working === 4 && us.dead === 3 && us.debris === 2 && us.noPath === 2, `US kinds: ${JSON.stringify(us)}`);
check(!counts.some((g) => g.key === 'CIS' && g.total !== 3), 'CIS: Cosmos 2251 and two SL-8 pieces up, Sputnik 1 down');
const ind = counts.find((g) => g.key === 'IND');
check(ind && ind.total === 3 && ind.noPath === 1, 'IND: two Cartosats and Aditya-L1, which has no element set');

// Operators: by owner code, then by name.
check(O.operatorOf(by('2019-074B')) === 'spacex' && O.operatorOf(by('2025-088A')) === 'amazon', 'STARLINK- is SpaceX, KUIPER- is Amazon');
check(O.operatorOf(by('1995-065A')) === 'esa' && O.operatorOf(by('1998-067A')) === 'iss', 'ESA and the ISS partners by owner code');
check(O.operatorOf(by('1997-051L')) === null, 'Iridium 33 DEB is not counted as Iridium');
check(O.operatorOf(by('1997-051A')) === 'iridium', 'IRIDIUM 29 is Iridium');
check(O.operatorById('SpaceX').name === 'SpaceX' && O.operatorById('nobody') === null, 'operatorById');

// The balance points.
const L = Object.fromEntries(O.lagrangeRows(rows).map((p) => [p.id, p.rows.map((r) => r.name)]));
check(L.sel1.join() === 'SOHO,ADITYA-L1', `L1: ${L.sel1}`);
check(L.sel2.join() === 'JWST', `L2: ${L.sel2}`);
check(L.eml2.join() === 'QUEQIAO', `Earth-Moon L2: ${L.eml2} (Queqiao-2 is round the Moon, not at the point)`);
check(O.COUNTRY_SLUG('IN') === 'in', 'the country page slug');

if (problems.length) {
  console.error(`test_owners: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`test_owners: ok (${O.OWNERS.length} owner codes, ${O.FLAGS.size} flags, ${rows.length} fixture lines)`);
