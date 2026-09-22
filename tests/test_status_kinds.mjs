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
const { layerKinds, kindWords } = await import(join(JS, 'ui/status.js'));
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
console.log('status kinds ok: catalogue, live, bundled sample and drawn are four different claims');
