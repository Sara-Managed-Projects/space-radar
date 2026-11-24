// tests/test_trip_quiz.mjs -- the end-of-trip questions' logic and where they load (forge #566).
//   node tests/test_trip_quiz.mjs
// tests/test_trip_quiz.py holds the questions to the trips' cards; this holds the module: the words and the right
// answers come together or not at all, the score, what is kept (and that a bad record reads as nothing), and that
// the quiz is fetched on the end card's press, never at boot, with no second ember.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); };

const m = await import('../site/js/ui/tripquiz.js');
const { TRIP_QUIZ } = await import('../site/js/data/tripquiz.js');
const { COPY } = await import('../site/js/copy/en.js');

// every trip with rows has its words, and each question carries three answers and a right one among them
for (const id of Object.keys(TRIP_QUIZ)) {
  const q = m.quizFor(id);
  check(Array.isArray(q) && q.length === 3, `${id}: quizFor gives three questions`);
  if (q) for (const item of q) check(item.a.length === 3 && item.right >= 0 && item.right < 3 && typeof item.stop === 'string', `${id}: a question is whole`);
}
check(m.quizFor('no-such-trip') === null, 'a trip without questions has no quiz');
check(m.quizFor('people-in-space', { trips: { 'people-in-space': [{ q: 'x', a: ['a', 'b'] }] } }) === null, 'words that do not match the rows give no quiz');
check(m.quizFor('people-in-space', COPY.tripQuiz, { 'people-in-space': [{ stop: 'iss', right: 7 }, { stop: 'iss', right: 1 }, { stop: 'tiangong', right: 0 }] }) === null,
  'a right index outside the answers gives no quiz');
check(m.hasQuiz('moon-landings') && !m.hasQuiz('a-dark-sky'), 'hasQuiz reads the mirror');

// the score
const quiz = m.quizFor('moon-landings');
check(m.scoreOf(quiz.map((q) => q.right), quiz) === 3, 'all right is 3');
check(m.scoreOf([null, null, null], quiz) === 0, 'nothing chosen is 0');
check(m.scoreOf([quiz[0].right, (quiz[1].right + 1) % 3, quiz[2].right], quiz) === 2, 'one wrong is 2');

// what is kept
const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, removeItem: (k) => { delete d[k]; }, d }; };
const s = mem();
check(JSON.stringify(m.readQuiz(s)) === '{}', 'an empty store reads as nothing');
check(m.recordQuiz(s, 'moon-landings', 2, 3, 1000) === true, 'a score is kept');
check(JSON.stringify(m.readQuiz(s)) === JSON.stringify({ 'moon-landings': { right: 2, of: 3, at: 1000 } }), 'and read back');
m.recordQuiz(s, 'moon-landings', 3, 3, 2000);
check(m.readQuiz(s)['moon-landings'].right === 3, 'the last score replaces the one before');
s.setItem(m.QKEY, '{"x":{"right":9,"of":3,"at":1},"Bad Id":{"right":1,"of":3,"at":1},"ok":{"right":1,"of":3,"at":5}}');
check(JSON.stringify(m.readQuiz(s)) === JSON.stringify({ ok: { right: 1, of: 3, at: 5 } }), 'a record that cannot be true is dropped');
s.setItem(m.QKEY, 'not json');
check(JSON.stringify(m.readQuiz(s)) === '{}', 'a broken record reads as nothing');
check(m.recordQuiz(null, 'x', 1, 3, 1) === false, 'no storage keeps nothing');
const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
check(m.recordQuiz(full, 'x', 1, 3, 1) === false, 'a full store keeps nothing and does not throw');
check(m.QKEY === 'sr:quiz', 'the key is the contract row sr:quiz');

// the words: every key of the quiz in English
for (const k of ['open', 'openTitle', 'intro', 'groupLabel', 'right', 'wrong', 'from', 'score', 'kept', 'again']) check(typeof COPY.tripQuiz[k] === 'string' && COPY.tripQuiz[k], `COPY.tripQuiz.${k}`);
check(/\{answer\}/.test(COPY.tripQuiz.wrong) && /\{title\}/.test(COPY.tripQuiz.from), 'the slots the module fills');

// where it loads: the end card imports it on the press; nothing at boot does
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const frame = read('site/js/ui/tripframe.js');
check(/import\('\.\/tripquiz\.js'\)/.test(frame), 'the end card fetches ui/tripquiz.js with import()');
check(!/from '\.\/tripquiz\.js'/.test(frame), 'and does not import it statically');
check(!/tripquiz/.test(read('site/js/main.js')), 'main.js does not load the quiz');
const btn = /function quizButton[\s\S]*?\n  }\n/.exec(frame);
check(btn && /ui-btn--secondary/.test(btn[0]) && !/ui-btn--primary/.test(btn[0]), 'the quiz button is secondary: Keep flying stays the one ember');
const mod = read('site/js/ui/tripquiz.js');
check(!/fetch\(|XMLHttpRequest|sendBeacon|srq/.test(mod), 'the quiz sends nothing');
check(/ui-radio/.test(mod) && /ui-opt/.test(mod), 'answers are the control set\'s radios');
check(!/animation|transition|setTimeout/.test(mod), 'nothing moves: the feedback is words');

if (fails.length) { console.log(fails.map((f) => 'FAIL ' + f).join('\n')); process.exit(1); }
console.log('trip quiz module ok');
