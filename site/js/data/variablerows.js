// data/variablerows.js -- data/variables.json, asked for once per page (forge #142).
//
// Contract: variableRows() -> Promise<row[]>   the file's rows; [] when it cannot be had (asked again next time).
//
// WHY ONE LOADER. Tonight (ui/tonight.js), a star's light curve (ui/varcurve.js) and Coming up (sky/findclient.js,
// which hands the rows to sky/findworker.js) all read the same 15 kB file. Each used to fetch it for itself, and the
// worker fetched it from inside the finder, which is meant to be offline: the pairs are worked out from the vendored
// Astronomy Engine alone (tests/test_conjunctions.mjs). So the page asks once, here, and the finder is given rows.

let asked = null;

export function variableRows() {
  if (!asked) {
    asked = fetch(new URL('../../data/variables.json', import.meta.url)).then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && Array.isArray(d.rows) ? d.rows : []))
      .catch(() => { asked = null; return []; });
  }
  return asked;
}
