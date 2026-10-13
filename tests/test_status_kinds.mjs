// THE SOURCES PANEL'S "LIVE OR BUNDLED" WORDS.
//
// It read "NASA Exoplanet Archive -- could not look" and, further down the same panel, "Planets
// around other stars -- live, 6 332 shown". Both were true of something: the archive cannot be read
// from a browser, and the 6 332 planets are a dated copy that ships with the app. "live" was the
// word for anything not a sample and not drawn -- so the stars, the galaxies and the black holes
// were live too. A `static` position is a catalogue's; the planets, computed for this moment, stay
// live.
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { layerKinds, kindWords, builtFrom } = await import(join(JS, 'ui/status.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const rec = (layer, propagator, cls = 'measured') => ({ id: `${layer}-${Math.random()}`, layer, propagator, cls });
const records = [
  rec('stars', 'static'), rec('stars', 'static'),
  rec('exoplanets', 'static'),
  rec('worlds', 'body'), rec('worlds', 'body'),
  rec('stations', 'sgp4'),
  rec('deep-space', 'kepler', 'sample'),
  rec('launches', 'ascent', 'illustrative'),
  rec('hand-kept-sites', 'fixed'), rec('hand-kept-sites', 'fixed'),
  rec('oddities', 'fixed'), rec('oddities', 'kepler', 'inferred'),
];
const kinds = layerKinds({ records: () => records });
const word = (id) => kindWords(kinds.get(id));
assert.equal(word('stars'), COPY.status.layerCatalogue, 'stars ship with the app: a catalogue');
assert.equal(word('exoplanets'), COPY.status.layerCatalogue, 'the exoplanet table is a dated copy: a catalogue, not live');
assert.equal(word('worlds'), COPY.status.layerLive, 'the planets are computed for this moment: live');
assert.equal(word('stations'), COPY.status.layerLive, 'the stations are read from CelesTrak: live');
assert.equal(word('deep-space'), COPY.status.layerSample, 'a bundled sample is still called one');
assert.equal(word('launches'), COPY.status.layerIllustrative, 'a sketched ascent is still drawn, not tracked');
assert.equal(word('hand-kept-sites'), COPY.status.layerCatalogue, 'a dish and a landing site are hand-kept coordinates: a catalogue');
assert.equal(word('oddities'), COPY.status.layerLive, 'a layer with anything moving in it is not all catalogue');
assert.notEqual(COPY.status.layerCatalogue, COPY.status.layerLive);
// Only what this page asked for is listed (2026-09-22): a source nothing requested is not a failure.
{
  const { askedRows } = await import(join(JS, 'ui/status.js'));
  const r = askedRows([{ id: 'a', attempted: true }, { id: 'b', attempted: false, fetchedAt: null }, { id: 'c', attempted: false, fetchedAt: 5 }]);
  assert.equal(r.asked.map((x) => x.id).join(), 'a,c', 'asked, or holding data, is listed');
  assert.equal(r.notAsked, 1, 'never asked is counted, not called a failure');
}
// The list's wording while the publisher is asked behind a saved copy (spec 0060 task 3, internal #173).
{
  const { provenanceLine } = await import(join(JS, 'ui/status.js'));
  const row = { id: 'x', state: 'ok', attempted: true, fetchedAt: 1, ageMs: 2 * 3600e3, via: 'snapshot', overdue: true };
  const checking = provenanceLine({ ...row, pendingLive: true });
  assert.match(checking, /^from our snapshot, fetched .+ \(checking for a newer one\)$/, `said while it is true: ${checking}`);
  assert.doesNotMatch(provenanceLine({ ...row, pendingLive: false }), /checking/, 'and not after');
  assert.match(provenanceLine({ ...row, pendingLive: false }), /overdue/, 'an overdue copy that is no longer being checked still says it is overdue');
}
// "Built from 08a7176, 12 October 2026" (public #291): the words and the address from /build.json,
// and no line at all when the file is not there or does not name a commit and a day.
{
  const commit = '08a7176' + 'c'.repeat(33);
  const doc = { schema: 1, commit, commit_short: '08a7176', committed_at: '2026-10-12T12:28:44Z', built_at: '2026-10-12T23:59:30Z', build: 'd20ed5015dcabc46', files: 296, bytes: 5e6, dirty: false };
  const b = builtFrom(doc);
  assert.equal(b.text, 'Built from 08a7176, 12 October 2026', 'the short commit and the day of the build, UTC');
  assert.equal(b.href, `https://github.com/Sara-Managed-Projects/space-radar/commit/${commit}`, 'the link is that commit on GitHub');
  assert.ok(b.href.startsWith(`${COPY.mark.href}/commit/`), 'in the repository the GitHub mark names');
  assert.equal(b.title, COPY.buildInfo.title);
  for (const bad of [null, undefined, 'x', [], {}, { commit }, { built_at: doc.built_at }, { ...doc, commit: '08a7176' }, { ...doc, commit: `${commit.slice(0, 39)}"` },
    { ...doc, commit: commit.toUpperCase() }, { ...doc, built_at: 'yesterday' }, { ...doc, commit: 7 }]) {
    assert.equal(builtFrom(bad), null, `no line for ${JSON.stringify(bad)}`);
  }
  // Asked for when the sheet is built, never by a module of the boot graph.
  const { readFileSync, readdirSync } = await import('node:fs');
  const askers = [];
  const walk = (dir) => { for (const f of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.js') && /['"`]build\.json['"`]/.test(readFileSync(p, 'utf8'))) askers.push(p.slice(JS.length + 1)); } };
  walk(JS);
  assert.deepEqual(askers, ['ui/status.js'], `only the Sources sheet asks for build.json (${askers})`);
  // Written to hold on the minified tree too (scripts/check_built_tree.mjs runs this file there).
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  assert.ok(/import\(\s*['"`]\.\/ui\/status\.js['"`]\s*\)/.test(main) && !/from\s*['"`]\.\/ui\/status\.js['"`]/.test(main), 'and main.js loads the sheet by a dynamic import, when it is opened');
}
console.log('status kinds ok: catalogue, live, bundled sample and drawn are four different claims; the Built-from line is the commit build.json names, or absent');
