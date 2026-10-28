// tests/test_small_lists_cards.mjs -- every kind of record the small lists make opens a card without an error and
// the card says what the list says (release 1.5.0, 0079 a6). A record with no place (a shower, a site nobody
// knows) is the case that could throw.
//
//   node tests/test_small_lists_cards.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const S = await import(join(JS, 'data/smalllists.js'));
const C = await import(join(JS, 'ui/cards.js'));
const F = await import(join(JS, 'ui/cardfacts.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const list = (n) => JSON.parse(readFileSync(join(ROOT, `site/data/lists/${n}.json`), 'utf8'));

const rec = [
  ...S.showerRecords(list('showers')), ...S.observatoryRecords(list('observatories')),
  ...S.launchSiteRecords(list('launch-sites')), ...S.landingRecords(list('landing-sites')),
];
const now = Date.UTC(2026, 9, 28, 12);
const ctx = { clock: { now: () => now, onChange: () => () => {} }, worlds: null, selected: () => null, sources: null, layers: LAYERS };
const pick = (id) => rec.find((r) => r.id === id);
const WANT = [
  ['shower-october-draconids', /meteor shower/], ['shower-perseids', /peaking around 12 August/],
  ['obs-q191684', /Palomar Observatory is an observatory/], ['launch-site-baikonur-cosmodrome', /launch site/],
  ['moon-ranger-7', /Where Ranger 7 hit the Moon/], ['venera-9', /first picture/], ['dart-dimorphos', /DART/],
  ['moon-luna-10', /where is not known/], ['mmx-phobos', /MMX/], ['tianwen-2-kamooalewa', /Tianwen-2/],
];
for (const [id, re] of WANT) {
  const r = pick(id);
  if (!r) { check(false, `${id} is not a record`); continue; }
  try {
    // the parts a card is made of, each of which must cope with a record that has no place
    const m = F.measure(r, ctx);
    const first = C.firstSentence(r, ctx, m, { state: 'none' });
    check(re.test(first) || re.test(String(C.whyLine(r) || '')), `${id}: the card says ${re} ("${first}")`);
    check(first.length > 10 && first.length <= 170, `${id}: the first sentence fits the card (${first.length})`);
    const drawn = C.drawingLine(r, now);
    check(/nothing stands there to draw|meteors seem to come from|not drawn/.test(drawn || ''), `${id}: and says how it is drawn ("${drawn}")`);
    check(typeof F.honestyLine(r, m) === 'string' && F.honestyLine(r, m).length > 0, `${id}: an honesty line`);
    check(typeof C.sourceLine(r, ctx) === 'string' && typeof C.klassLabel(r) === 'string' && C.klassLabel(r).length > 0, `${id}: a source and a class label`);
    C.rightNowFor(r, ctx); F.tagLines(r, ctx, m);
  } catch (e) { check(false, `${id}: the card threw ${e.message}\n${e.stack.split('\n').slice(1, 3).join('|')}`); }
}
// found by name, by MPC code and by the old IAU number
const idx = buildIndex(rec, LAYERS);
const find = (q) => findMatches(idx, q, 8).hits.map((h) => h.record.id);
check(find('draconids').includes('shower-october-draconids'), `search finds the Draconids (${find('draconids')})`);
check(find('palomar').includes('obs-q191684'), 'search finds Palomar');
check(find('venera 9').includes('venera-9'), 'search finds Venera 9');
check(find('ranger 7').some((id) => id === 'moon-ranger-7'), 'search finds the Ranger 7 impact site');
check(find('dart').includes('dart-dimorphos'), 'search finds DART');

if (problems.length) { console.error('small lists cards FAILED:\n  ' + problems.slice(0, 30).join('\n  ')); process.exit(1); }
console.log(`small lists cards ok: ${WANT.length} kinds of card open, and search finds a shower, an observatory, a probe and an impact site by name`);
