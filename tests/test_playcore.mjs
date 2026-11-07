// tests/test_playcore.mjs -- the daily challenges' rules (ui/playcore.js, forge #160), and that the feature stays off the first frame.
//
//   node tests/test_playcore.mjs
//
// The day is UTC (so Sydney and London share a puzzle), the seed is the same for every visitor on that day and differs between
// days and games, the share text stays inside X's 280 weighted characters at its longest in every language and carries none of
// the characters Slack, WhatsApp or X read as formatting, the store survives junk and forgets old days, and nothing of the
// feature but its URL key and a dynamic import is reachable from the boot graph.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  GAMES, MAX_TRIES, SHARE_LIMITS, SLIDER, TILES, utcDay, seedOf, rng, pick, distanceTile, sliderLy, lyToSlider, shareText, xLength, readStore, writeStore, streak,
} from '../site/js/ui/playcore.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const ok = (cond, msg) => { if (!cond) problems.push(msg); };

// the day
ok(utcDay(Date.parse('2026-11-07T23:30:00-10:00')) === '2026-11-08', 'utcDay: 23:30 in Hawaii is the next UTC day');
ok(utcDay(Date.parse('2026-11-08T08:00:00+11:00')) === '2026-11-07', 'utcDay: 08:00 in Sydney is still the UTC day before');
ok(utcDay(Date.parse('2026-01-01T00:00:00Z')) === '2026-01-01', 'utcDay: midnight UTC starts the day');

// the seed: worked by hand, FNV-1a 32 of "a" is 0xe40c292c
ok(seedOf('a', '').toString(16) !== '' && seedOf('2026-11-07', 'find-earth') === seedOf('2026-11-07', 'find-earth'), 'seedOf is not stable');
let h = 0x811c9dc5; for (const c of 'a') { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
ok(h === 0xe40c292c, 'FNV-1a of "a" is not 0xe40c292c (the published test vector)');
const seeds = new Set(); for (let d = 1; d <= 28; d++) for (const g of GAMES) seeds.add(seedOf(`2026-02-${String(d).padStart(2, '0')}`, g));
ok(seeds.size === 28 * GAMES.length, 'two days or two games share a seed in February 2026');
const r1 = rng(42), r2 = rng(42), a = [r1(), r1(), r1()], b = [r2(), r2(), r2()];
ok(a.join() === b.join() && a.every((x) => x >= 0 && x < 1), 'rng is not reproducible or leaves [0, 1)');
const many = Array.from({ length: 20000 }, rng(7)), mean = many.reduce((s, x) => s + x, 0) / many.length;
ok(Math.abs(mean - 0.5) < 0.01, `rng's mean is ${mean}`);
const list = Array.from({ length: 12 }, (_, i) => i);
const p1 = pick(list, 4, rng(seedOf('2026-11-07', 'which-world'))), p2 = pick(list, 4, rng(seedOf('2026-11-07', 'which-world')));
ok(p1.join() === p2.join() && new Set(p1).size === 4, 'pick is not the same for two visitors, or repeats');
ok(list.join() === '0,1,2,3,4,5,6,7,8,9,10,11', 'pick changed its input');
ok(pick(list, 99, rng(1)).length === 12 && pick([], 3, rng(1)).length === 0, 'pick does not clamp n');

// the distance
ok(distanceTile(1100, 1000) === 'hit' && distanceTile(800, 1000) === 'hit', 'distanceTile: 1.1x and 0.8x are hits');
ok(distanceTile(1900, 1000) === 'near' && distanceTile(520, 1000) === 'near', 'distanceTile: within 2x is near');
ok(distanceTile(4000, 1000) === 'far' && distanceTile(6000, 1000) === 'miss', 'distanceTile: 4x far, 6x miss');
ok(distanceTile(0, 1000) === 'miss' && distanceTile(NaN, 1000) === 'miss', 'distanceTile: no guess is a miss');
ok(Math.abs(sliderLy(3) - 1000) < 1e-9 && lyToSlider(1000) === 3 && sliderLy(99) === 10 ** SLIDER.max && lyToSlider(0.1) === SLIDER.min, 'the slider is not log10 of light-years, clamped');
ok(lyToSlider(5.3e7) <= SLIDER.max && lyToSlider(425) >= SLIDER.min, 'the slider does not reach the deep-sky catalogue (425 ly to 53 million)');

// the share text, at its longest, in every language
const games = [['find-earth', Array.from({ length: 4 }, (_, i) => Array(i === 3 ? MAX_TRIES - 3 : 1).fill('miss'))], ['which-world', [['hit'], ['near'], ['miss']]], ['guess-distance', [['far'], ['near'], ['hit']]]];
const langs = ['en', ...readdirSync(join(ROOT, 'site/js/copy')).filter((f) => /^[a-z]{2}\.js$/.test(f) && f !== 'en.js').map((f) => f.slice(0, 2))];
const en = await import(pathToFileURL(join(ROOT, 'site/js/copy/en.js')).href);
await import(pathToFileURL(join(ROOT, 'site/js/copy/en.play.js')).href);
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
let longest = 0;
for (const lang of langs) {
  const P = lang === 'en' ? en.COPY.play : (await import(pathToFileURL(join(ROOT, `site/js/copy/${lang}.js`)).href)).COPY.play;
  if (!P) { problems.push(`${lang}: no COPY.play`); continue; }
  for (const [g, rows] of games) {
    const text = shareText({ title: fill(P.shareTitle, { game: P.games[g].title }), day: '2026-11-07', rows, score: fill(P.scores[g], { n: 10 }), url: `https://www.spaceradar.ai/#play=${g}` });
    const n = xLength(text);
    longest = Math.max(longest, n);
    ok(n <= SHARE_LIMITS.x, `${lang} ${g}: the share text is ${n} weighted characters on X, over ${SHARE_LIMITS.x}`);
    ok(text.length <= SHARE_LIMITS.slack && text.length <= SHARE_LIMITS.whatsapp, `${lang} ${g}: over Slack's or WhatsApp's limit`);
    ok(!/[*_~`]/.test(text.replace(/https:\/\/\S+/, '')), `${lang} ${g}: the share text has * _ ~ or \`, which Slack, WhatsApp or X read as formatting`);
    ok(text.endsWith(`#play=${g}`) && text.includes('2026-11-07'), `${lang} ${g}: the share text lacks its link or its day`);
  }
}
ok(xLength('ab \u{1F7E9}') === 5, 'xLength: an emoji weighs 2');
ok(xLength('see https://www.spaceradar.ai/#play=find-earth-and-a-long-tail') === 4 + 23, 'xLength: a link weighs 23');
ok(shareText({ title: 'T', day: 'D', rows: [['hit', 'miss'], ['near']], score: 'S', url: 'U' }) === `T D\n${TILES.hit}${TILES.miss} ${TILES.near}\nS\nU`, 'shareText layout');

// the store
ok(readStore('not json').days && readStore(null).v === 1 && readStore('{"v":2,"days":{}}').v === 1, 'readStore does not start again on junk');
let s = readStore(writeStore(readStore(null), '2026-09-01', 'find-earth', { score: 3 }));
s = readStore(writeStore(s, '2026-11-06', 'which-world', { score: 2 }));
s = readStore(writeStore(s, '2026-11-07', 'find-earth', { score: 5 }));
ok(!s.days['2026-09-01'] && s.days['2026-11-07']['find-earth'].score === 5, 'writeStore does not forget days past 60, or loses a result');
ok(streak(s, '2026-11-07') === 2 && streak(s, '2026-11-05') === 0, `streak: ${streak(s, '2026-11-07')} (want 2)`);

// off the first frame: the boot graph sees the key and the import, never the module, its words or its styles
const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
ok(/import\('\.\/ui\/play\.js'\)/.test(main) && !/^import[^\n]*ui\/play(core)?\.js/m.test(main), 'main.js must reach ui/play.js only through a dynamic import');
ok(/classList\.add\('sr-play-on'\)/.test(main) && /sr-play-on/.test(readFileSync(join(ROOT, 'site/js/ui/keyhint.js'), 'utf8')), 'a #play= link must set sr-play-on at boot, and ui/keyhint.js must stay away while it is set');
const play = readFileSync(join(ROOT, 'site/js/ui/play.js'), 'utf8');
ok(/classList\.remove\('sr-play-on'\)/.test(play), 'ui/play.js must clear sr-play-on when the challenge closes');
ok(/import '\.\.\/copy\/en\.play\.js'/.test(play) && /loadCss\('play'\)/.test(play), 'ui/play.js must bring its own words and stylesheet');
ok(!/play\.css/.test(readFileSync(join(ROOT, 'site/index.html'), 'utf8')), 'site/index.html must not link css/play.css');
const url = readFileSync(join(ROOT, 'site/js/ui/urlstate.js'), 'utf8');
ok(/KEYS\.splice\(KEYS\.indexOf\('cam'\), 0, 'play'\)/.test(url), 'urlstate.js must add `play` before `cam`');

if (problems.length) { console.error(`playcore FAILED (${problems.length}):\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`playcore ok: the day is UTC, one seed per day and game, the share text at most ${longest} of X's ${SHARE_LIMITS.x} in ${langs.length} languages with no formatting characters, the store forgets after 60 days, and the feature is a dynamic import`);
