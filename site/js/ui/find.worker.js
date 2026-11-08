// ui/find.worker.js -- the Find panel's filtering, off the main thread (forge #150, #152, #153).
//
// The page (ui/find.js) talks to it with one kind of message each way:
//   {id, type: 'rows', kind, items}          items: slim records of a layer the map has loaded
//                                            (stars, exoplanets, comets); the worker works out each row
//   {id, type: 'catalogue', csv}             CelesTrak's satcat.csv text, read once by the page
//   {id, type: 'query', q, origin, limit}    -> {rows, total}    a question (ui/findcore.js parseFind)
//   {id, type: 'owners'}                     -> {owners, operators, lagrange, clouds, asOfRows}  the browser's lists
//   {id, type: 'members', by, key, limit}    -> {ids, total, noPath: [{norad, name, why}]}  one owner's, operator's or cloud's objects
//   every answer is {id, ok: true, ...} or {id, ok: false, error}
//
// WHY A WORKER. The catalogue is 71 262 lines and 6.9 MB of text; splitting it and counting it by owner,
// by operator and by breakup is about 150 ms of a phone's main thread that the globe would otherwise stall
// for (the debris view parses it on the page because it did so before this existed; ui/debris.js). Every
// filter after that is one pass over the rows here, and only the matches cross back.

import { exoRow, starRow, satRow, cometRow, runQuery } from './findcore.js';
import { catalogueRows, countBy, ownerOf, operatorOf, lagrangeRows, noPathWhy, kindOfRow } from '../data/owners.js';
import { CLOUDS, cloudById, cloudCounts, isFragment } from '../data/clouds.js';

const rows = { stars: [], exoplanets: [], comets: [], satellites: [] };
let catalogue = null;
let systems = null; // planet id -> its row of data/systems-table.js, and its star

async function systemsTable() {
  if (systems) return systems;
  systems = new Map();
  try {
    const m = await import('../data/systems-table.js');
    for (const s of m.SYSTEMS_TABLE || []) for (const p of s.planets || []) systems.set(p.id, { planet: p, star: s.star || null });
  } catch { /* the planets are worked out from the archive's numbers alone */ }
  return systems;
}

async function setRows(kind, items) {
  if (kind === 'exoplanets') {
    const sys = await systemsTable();
    rows.exoplanets = items.map((r) => { const s = sys.get(r.id); return exoRow(r, s ? s.planet : null, s ? s.star : null); });
  } else if (kind === 'stars') rows.stars = items.map(starRow);
  else if (kind === 'comets') rows.comets = items.map(cometRow);
  return { n: rows[kind] ? rows[kind].length : 0 };
}

function setCatalogue(csv) {
  catalogue = catalogueRows(csv);
  rows.satellites = catalogue.map((r) => satRow(r, operatorOf(r)));
  return { n: catalogue.length };
}

function lists() {
  if (!catalogue) throw new Error('no catalogue yet');
  const owners = countBy(catalogue, (r) => r.owner).map((g) => ({ ...g, owner: ownerOf(g.key) }));
  const operators = countBy(catalogue, operatorOf);
  const lagrange = lagrangeRows(catalogue).map((p) => ({ id: p.id, rows: p.rows.map((r) => ({ norad: r.id, name: r.name, intl: r.intl, owner: r.owner, launchMs: r.launchMs })) }));
  const clouds = CLOUDS.map((c) => { const k = cloudCounts(catalogue, c); return { id: c.id, catalogued: k.catalogued, up: k.up, parent: k.parent ? { norad: k.parent.id, name: k.parent.name } : null }; });
  return { owners, operators, lagrange, clouds, total: catalogue.filter((r) => r.decayMs === null).length };
}

/** The objects up now of one owner code, operator id or cloud id; the ones with no public path listed with why. */
function members(by, key, limit = 400) {
  if (!catalogue) throw new Error('no catalogue yet');
  const cloud = by === 'cloud' ? cloudById(key) : null;
  const test = by === 'owner' ? (r) => r.owner === key : by === 'operator' ? (r) => operatorOf(r) === key : cloud ? (r) => isFragment(r, cloud) : () => false;
  const ids = [];
  const noPath = [];
  const kinds = { working: 0, dead: 0, debris: 0, rocket: 0, other: 0 };
  for (const r of catalogue) {
    if (r.decayMs !== null || !test(r)) continue;
    ids.push(r.id);
    kinds[kindOfRow(r)] += 1;
    const why = noPathWhy(r);
    if (why && r.type === 'PAY' && noPath.length < limit) noPath.push({ norad: r.id, name: r.name, intl: r.intl, why, centre: r.centre, launchMs: r.launchMs });
  }
  noPath.sort((a, b) => (b.launchMs || 0) - (a.launchMs || 0));
  return { ids, total: ids.length, kinds, noPath };
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  try {
    let out;
    if (msg.type === 'rows') out = await setRows(msg.kind, msg.items || []);
    else if (msg.type === 'catalogue') out = setCatalogue(msg.csv);
    else if (msg.type === 'query') out = runQuery(msg.q, rows[msg.q && msg.q.kind] || [], msg.origin || null, msg.limit || 200);
    else if (msg.type === 'owners') out = lists();
    else if (msg.type === 'members') out = members(msg.by, msg.key, msg.limit);
    else throw new Error(`unknown message ${msg.type}`);
    self.postMessage({ id: msg.id, ok: true, ...out });
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: String(err && err.message ? err.message : err) });
  }
};
