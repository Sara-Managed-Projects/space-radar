// data/smalllists.js -- the small complete lists of release 1.5.0 (0079 a6, internal #1064): the IAU's
// established meteor showers, every observatory with a place and an MPC code, the launch sites, and the landing
// and impact sites that registry/sites.yaml does not have. Written by scripts/gen_small_lists.py into
// site/data/lists/*.json; nothing here is fetched at boot (the four layers load after the first screen or when
// switched on: data/layers.js `fetchLazy`).
//
// Each loader returns RECORDS in the shapes the rest of the app already knows:
//   - a site (observatory, launch site, landing or impact site) is the `fixed` record data/sample.js
//     handKeptSites() makes, `klass: 'site'`, in its world's own frame, with `meta.markOnly` so the card says
//     nothing is drawn there but a mark (ui/cards.js);
//   - a landing on a small body, or a site nobody knows the place of, has NO propagator (the pattern of an
//     oddity whose place is unknown): search finds it, the card opens, and nothing is drawn;
//   - a meteor shower is a `klass: 'shower'` record with no place either: a radiant is a direction in the sky
//     view (sky/skyview.js marks it near its peak), not a point in space.
// Nothing is rounded here: the file holds what the source gave.

async function json(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

const aliasSpaced = (s) => (/[-–]/.test(s) ? [s.replace(/[-–]+/g, ' ')] : []);

// ------------------------------------------------------------------------------------------------ meteor showers
/** @param {Object} doc site/data/lists/showers.json */
export function showerRecords(doc) {
  const out = [];
  for (const r of (doc && doc.rows) || []) {
    const aliases = [...aliasSpaced(r.name)];
    if (r.code) aliases.push(r.code);
    if (r.iau) aliases.push(`IAU ${r.iau}`);
    out.push({
      id: r.id,
      name: r.name,
      klass: 'shower',
      layer: 'meteor-showers',
      cls: 'measured',
      epoch: null,
      source: 'IAU Meteor Data Center',
      meta: {
        aliases,
        iauNo: r.iau, code: r.code || null,
        losDeg: r.los, losFromDeg: r.los0 ?? null, losToDeg: r.los1 ?? null,
        raDeg: r.ra, decDeg: r.dec, vgKms: r.vg,
        peakMd: r.peak, solutions: r.n,
        parent: r.parent || null, activity: r.activity || null,
        oursId: r.ours || null, zhr: r.zhr ?? null,
        asOf: doc.asOf,
        cite: 'IAU Meteor Data Center, established meteor showers, median of the published solutions',
      },
    });
  }
  return out;
}

export async function fetchShowers() {
  return showerRecords(await json('data/lists/showers.json'));
}

/**
 * The established showers that registry/showers.yaml does not hold, in the shape sky/radiants.js and the sky
 * view read (`ra_h`, `dec`, `peak`, `sol`, `v_kms`). Only a radiant to mark: no rate, so none is ever drawn
 * as a meteor (sky/meteors.js reads `zhr`, and these have none).
 */
export function radiantRows(doc) {
  return ((doc && doc.rows) || []).filter((r) => !r.ours).map((r) => ({
    id: r.id, display: r.name, peak: r.peak, sol: r.los, ra_h: r.ra / 15, dec: r.dec, v_kms: r.vg, catalogue: true,
  }));
}

export async function fetchRadiants() {
  return radiantRows(await json('data/lists/showers.json'));
}

// ------------------------------------------------------------------------------------------------ sites
function siteRecord(row, layer, kind, world, extra) {
  const meta = { siteKind: kind, world, markOnly: true, latDeg: row.lat, lonDeg: row.lon, ...extra };
  return {
    id: row.id,
    name: row.name,
    klass: 'site',
    layer,
    propagator: 'fixed',
    frame: `${world}-fixed`,
    cls: 'measured',
    epoch: null,
    fixed: { latDeg: row.lat, lonDeg: row.lon, altKm: 0 },
    meta,
  };
}

const years = (a, b) => (a ? (b ? `${a} to ${b}` : `since ${a}`) : b ? `until ${b}` : null);

/** @param {Object} doc site/data/lists/observatories.json (columns) */
export function observatoryRecords(doc) {
  const out = [];
  const n = doc.n | 0;
  for (let i = 0; i < n; i++) {
    const name = doc.name[i];
    if (!name) continue;
    const mpc = doc.mpc[i] || null;
    const country = doc.country[i] ? doc.countries[doc.country[i] - 1] : null;
    const aliases = [];
    if (mpc) aliases.push(`MPC ${mpc}`, `observatory code ${mpc}`);
    const row = { id: `obs-${doc.q[i] ? 'q' + doc.q[i] : 'mpc-' + String(mpc).toLowerCase()}`, name, lat: doc.lat[i] / 1e4, lon: doc.lon[i] / 1e4 };
    const r = siteRecord(row, 'observatories', 'observatory', 'earth', {
      mpc, country, aliases, years: years(doc.from[i], doc.to[i]), closedYear: doc.to[i] || null, wikidata: doc.q[i] ? `Q${doc.q[i]}` : null,
      cite: doc.q[i] ? 'Wikidata (CC0)' + (mpc ? ' and the Minor Planet Center observatory codes' : '') : 'Minor Planet Center observatory codes',
    });
    out.push(r);
  }
  return out;
}

/** @param {Object} doc site/data/lists/launch-sites.json */
export function launchSiteRecords(doc) {
  return ((doc && doc.rows) || []).map((row) => siteRecord(row, 'launch-sites', 'launch-site', 'earth', {
    country: row.country ? doc.countries[row.country - 1] : null,
    years: years(row.from, row.to), closedYear: row.to || null, wikidata: row.q ? `Q${row.q}` : null,
    cite: 'Wikidata (CC0)',
  }));
}

/** @param {Object} doc site/data/lists/landing-sites.json */
export function landingRecords(doc) {
  const refs = (doc && doc.references) || {};
  const out = [];
  for (const row of (doc && doc.rows) || []) {
    const ref = row.src ? refs[row.src] : null;
    const extra = {
      doing: row.doing, eventKind: row.kind, eventDate: row.date || null, approxDeg: row.approx ?? null,
      aliases: row.aliases || [], bodyName: row.world, citeUrl: ref ? ref.url : null,
      cite: ref ? ref.says.split(/[.;]/)[0] : null,
    };
    if (Number.isFinite(row.lat) && Number.isFinite(row.lon) && ['moon', 'venus', 'mars'].includes(row.world)) {
      out.push(siteRecord(row, 'landing-sites', 'landing-site', row.world, extra));
    } else {
      // no place we can draw: a small body is not a world here, and some places are not known
      out.push({
        id: row.id, name: row.name, klass: 'site', layer: 'landing-sites', cls: 'measured', epoch: null,
        meta: { siteKind: 'landing-site', world: row.world, markOnly: true, latDeg: row.lat ?? null, lonDeg: row.lon ?? null, noPlace: true, ...extra },
      });
    }
  }
  return out;
}

export async function fetchObservatories() { return observatoryRecords(await json('data/lists/observatories.json')); }
export async function fetchLaunchSites() { return launchSiteRecords(await json('data/lists/launch-sites.json')); }
export async function fetchLandingSites() { return landingRecords(await json('data/lists/landing-sites.json')); }
