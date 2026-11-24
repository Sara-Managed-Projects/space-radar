// ui/tripquiz.js -- three questions at the end of a trip (forge #566).
//
// Contract: mountQuiz(host, { tripId, stops, storage, onStop }) -> { destroy() } | null
//           stops: the run's stops as ui/trip.js state.stops gives them ([{id, title}]), for the links;
//           onStop(index): go back to that stop (the end card passes trip.jumpTo).
// Pure, for tests/test_trip_quiz.mjs:
//   QKEY, quizFor(tripId, copy, data) -> [{q, a, right, stop}] | null, hasQuiz(tripId, data),
//   readQuiz(storage), recordQuiz(storage, tripId, right, of, nowMs) -> boolean, scoreOf(picked, quiz)
//
// WHAT IT ASKS. Only what the trip's own cards said (registry/trip-quizzes.yaml: the words each answer rests on,
// held to the cards by tests/test_trip_quiz.py). Each question is a radio group from the control set; choosing an
// answer settles that question at once: "Right." or the right answer, and a link back to the stop that says it
// (#trip=<id>&stop=<stop>, which ui/urlstate.js reads). Nothing moves: the feedback is words, the same under reduced
// motion. There is no "Check" button, so the end card's one ember (Keep flying) stays the only one.
//
// WHAT IT KEEPS. The last score per trip, {tripId: {right, of, at}}, in localStorage `sr:quiz`, in this browser only;
// a browser that refuses storage simply keeps nothing. No request, no event: nothing here builds a URL to send.
//
// Fetched with import() from the end card's "Three questions" button (ui/tripframe.js): never at boot.
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import '../copy/en.tripquiz.js';
import { TRIP_QUIZ } from '../data/tripquiz.js';

export const QKEY = 'sr:quiz';
const TRIPS_CAP = 60;

export function hasQuiz(tripId, data = TRIP_QUIZ) {
  return Array.isArray(data[tripId]) && data[tripId].length > 0;
}

/** The trip's questions with their words, or null when a word or an answer is missing (then no quiz is offered). */
export function quizFor(tripId, copy = COPY.tripQuiz, data = TRIP_QUIZ) {
  const rows = data[tripId];
  const words = copy && copy.trips && copy.trips[tripId];
  if (!Array.isArray(rows) || !Array.isArray(words) || words.length !== rows.length) return null;
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    const w = words[i];
    const r = rows[i];
    if (!w || typeof w.q !== 'string' || !Array.isArray(w.a) || w.a.length < 2) return null;
    if (!Number.isInteger(r.right) || r.right < 0 || r.right >= w.a.length) return null;
    out.push({ q: w.q, a: w.a.slice(), right: r.right, stop: r.stop });
  }
  return out;
}

/** How many of `picked` (answer index per question, or null) are right. */
export function scoreOf(picked, quiz) {
  return quiz.reduce((n, q, i) => n + (picked[i] === q.right ? 1 : 0), 0);
}

function clean(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, v] of Object.entries(raw)) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !v || typeof v !== 'object') continue;
    const { right, of, at } = v;
    if (Number.isInteger(right) && Number.isInteger(of) && right >= 0 && of > 0 && right <= of && Number.isFinite(at)) out[id] = { right, of, at };
  }
  return out;
}

export function readQuiz(storage) {
  try {
    return clean(JSON.parse((storage && storage.getItem(QKEY)) || '{}'));
  } catch {
    return {};
  }
}

/** Keep the last score of one trip. Returns whether it was kept. */
export function recordQuiz(storage, tripId, right, of, nowMs) {
  if (!storage) return false;
  const all = readQuiz(storage);
  delete all[tripId];
  all[tripId] = { right, of, at: nowMs };
  const ids = Object.keys(all);
  while (ids.length > TRIPS_CAP) delete all[ids.shift()];
  try {
    storage.setItem(QKEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

let uid = 0;

export function mountQuiz(host, { tripId, stops = [], storage = null, onStop = null, now = () => Date.now() } = {}) {
  const C = COPY.tripQuiz;
  const quiz = quizFor(tripId);
  if (!quiz || !host) return null;
  const id = `sr-quiz-${++uid}`;
  const root = el('section', 'sr-tripquiz');
  root.setAttribute('aria-labelledby', `${id}-h`);
  const head = el('p', 'sr-tripsheet__micro', C.open);
  head.id = `${id}-h`;
  root.appendChild(head);
  root.appendChild(el('p', 'sr-tripsheet__note', C.intro));
  const picked = quiz.map(() => null);
  const result = el('p', 'sr-tripquiz__score');
  result.setAttribute('role', 'status');
  result.hidden = true;
  const again = el('button', 'ui-btn ui-btn--quiet ui-btn--sm sr-tripquiz__again', C.again);
  again.type = 'button';
  again.hidden = true;
  const groups = [];

  const finish = () => {
    if (picked.some((p) => p === null)) return;
    const right = scoreOf(picked, quiz);
    const kept = recordQuiz(storage, tripId, right, quiz.length, now());
    result.textContent = t(C.score, { n: fmt.int(right), total: fmt.int(quiz.length) }) + (kept ? ` ${C.kept}` : '');
    result.hidden = false;
    again.hidden = false;
  };

  quiz.forEach((item, qi) => {
    const box = el('fieldset', 'sr-tripquiz__q');
    const legend = el('legend', 'sr-tripquiz__ask', item.q);
    box.appendChild(legend);
    box.setAttribute('aria-describedby', `${id}-n${qi}`);
    const count = el('p', 'sr-tripquiz__n', t(C.groupLabel, { n: fmt.int(qi + 1), total: fmt.int(quiz.length) }));
    count.id = `${id}-n${qi}`;
    box.appendChild(count);
    const opts = el('div', 'sr-tripquiz__opts');
    const inputs = item.a.map((text, ai) => {
      const lab = el('label', 'ui-opt');
      const input = el('input', 'ui-radio');
      input.type = 'radio';
      input.name = `${id}-${qi}`;
      input.value = String(ai);
      lab.appendChild(input);
      lab.appendChild(el('span', '', text)); // .ui-opt's own gap spaces it from the radio
      opts.appendChild(lab);
      return input;
    });
    box.appendChild(opts);
    const say = el('p', 'sr-tripquiz__say');
    say.setAttribute('role', 'status');
    say.hidden = true;
    box.appendChild(say);
    const stopAt = stops.findIndex((s) => s && s.id === item.stop);
    const link = el('a', 'sr-tripquiz__from');
    link.href = `#trip=${encodeURIComponent(tripId)}&stop=${encodeURIComponent(item.stop)}`;
    link.textContent = t(C.from, { n: fmt.int(stopAt >= 0 ? stopAt + 1 : 0), title: stopAt >= 0 ? stops[stopAt].title : item.stop });
    link.hidden = true;
    if (stopAt < 0) link.dataset.away = '';
    link.addEventListener('click', (e) => {
      if (stopAt < 0 || typeof onStop !== 'function') return;
      e.preventDefault();
      onStop(stopAt);
    });
    box.appendChild(link);
    const settle = (ai) => {
      picked[qi] = ai;
      const ok = ai === item.right;
      box.dataset.answer = ok ? 'right' : 'wrong';
      say.textContent = ok ? C.right : t(C.wrong, { answer: item.a[item.right] });
      say.hidden = false;
      link.hidden = false;
      for (const inp of inputs) inp.disabled = true;
      finish();
    };
    for (const inp of inputs) inp.addEventListener('change', () => { if (inp.checked) settle(Number(inp.value)); });
    groups.push({ box, inputs, say, link });
    root.appendChild(box);
  });
  root.appendChild(result);
  root.appendChild(again);
  again.addEventListener('click', () => {
    for (let i = 0; i < picked.length; i += 1) picked[i] = null;
    for (const g of groups) {
      delete g.box.dataset.answer;
      g.say.hidden = true;
      g.link.hidden = true;
      for (const inp of g.inputs) { inp.disabled = false; inp.checked = false; }
    }
    result.hidden = true;
    again.hidden = true;
    if (groups[0]) groups[0].inputs[0].focus();
  });
  host.appendChild(root);
  return {
    root,
    destroy() { root.remove(); },
  };
}
