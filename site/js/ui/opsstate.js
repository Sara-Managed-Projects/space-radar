// ui/opsstate.js -- State of Space (research train "ops", forge #558): the numbers people cite, each with its source and its date.
//
// Contract: mountState(pane, ctx, api) -> { show(), hide() }   (ui/ops.js)
// Also exported, pure, for tests/test_research_ops.mjs: stateRows(numbers, words) -> [{id, label, value, meta, title}]
//
// WHERE EACH NUMBER COMES FROM. The catalogue's numbers are CelesTrak's satellite catalogue, counted by our harvester
// (harvest/stateofspace.py; the saved copy `state-of-space`) the day it read it; people on the stations are Launch Library
// 2's headcount (`ll2-stations`, the station cards' own); craft talking to the DSN are NASA's DSN Now (`dsn-now`). When our
// copy of the summary is not there (a fork, offline, before the harvester has made one) the last FROZEN quarter is shown
// in its place, labelled frozen with its own date (site/data/state-of-space/, scripts/state_of_space.py). A number with
// no source and no date is not shown at all. The numbers tick up to their value once when the pane opens; under reduced
// motion they are simply there.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.ops.js';
import { load } from '../data/sources.js';
import { parseStations } from '../data/crew.js';
import { loadState, loadFrozen, loadDsn, stateNumbers, frozenNumbers, sparkPoints, countUp, dsnContacts } from '../data/opsdata.js';
import { el, button, sourceLine, waitLine, reduced, ago } from './opskit.js';

const SVG = 'http://www.w3.org/2000/svg';
const HERO = ['earth_orbit', 'people', 'launches_year'];
const TICK_MS = 900;
const REFRESH_MS = 60e3;

/** The rows of the list: each number's words, value, and the line that says whose it is and of when. Pure. */
export function stateRows(numbers, words = COPY.ops.state) {
  return numbers.filter((n) => words.labels[n.id]).map((n) => {
    const label = t(words.labels[n.id], { year: n.year || '' });
    const date = timeText.utcLong(n.asOfMs);
    const src = n.source === 'll2-stations' ? words.peopleSource : n.source === 'dsn-now' ? words.dsnSource : 'CelesTrak';
    return { id: n.id, label, value: n.value, meta: `${src} · ${t(COPY.ops.asOf, { date })}`, title: `${label}: ${fmt.int(n.value)}. ${t(COPY.ops.source, { source: src })}, ${t(COPY.ops.asOf, { date })}.` };
  });
}

function sparkline(series, key, label) {
  const w = 120;
  const h = 28;
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('class', 'sr-ops__spark');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  const line = document.createElementNS(SVG, 'polyline');
  line.setAttribute('points', sparkPoints(series, key, w, h));
  line.setAttribute('fill', 'none');
  svg.appendChild(line);
  return svg;
}

export function mountState(pane, ctx) {
  const S = COPY.ops.state;
  const root = el('div', 'sr-ops__state');
  root.appendChild(el('p', 'sr-ops__lead', S.lead));
  const status = el('p', 'sr-ops__status');
  const body = el('div', 'sr-ops__body');
  body.appendChild(waitLine());
  root.append(status, body);
  pane.appendChild(root);

  let timer = null;
  let ticked = false;
  let extra = []; // people and DSN, refreshed while shown

  async function extras() {
    const out = [];
    const st = await load('ll2-stations').catch(() => null);
    if (st && st.data) {
      const crew = Object.values(parseStations(st.data)).map((s) => s.crewCount).filter(Number.isFinite);
      if (crew.length && Number.isFinite(st.fetchedAt)) out.push({ id: 'people', value: crew.reduce((a, b) => a + b, 0), source: 'll2-stations', asOfMs: st.fetchedAt, how: 'live' });
    }
    const dsn = await loadDsn().catch(() => null);
    if (dsn && Number.isFinite(dsn.fetchedAt)) {
      const craft = new Set(dsnContacts(dsn.links).map((c) => c.code));
      out.push({ id: 'dsn_now', value: craft.size, source: 'dsn-now', asOfMs: dsn.fetchedAt, how: 'live' });
    }
    return out;
  }

  function heroCell(n) {
    const li = el('li', 'sr-hero__cell');
    const num = el('span', 'sr-hero__num sr-num', fmt.int(n.value));
    num.dataset.to = String(n.value);
    li.appendChild(num);
    li.appendChild(el('span', 'sr-hero__unit', t(S.short[n.id] || S.labels[n.id], { year: n.year || '' })));
    // The catalogue's two say their date in the status line above; the people's count is Launch Library's, of its own day.
    const r = stateRows([n], S)[0];
    if (r) { li.title = r.title; if (n.source !== 'celestrak-satcat') li.appendChild(el('span', 'sr-ops__meta', r.meta)); }
    return li;
  }

  function tick(nodes) {
    if (ticked || reduced()) { ticked = true; return; }
    ticked = true;
    const t0 = performance.now();
    const step = (now) => {
      const p = (now - t0) / TICK_MS;
      for (const node of nodes) node.textContent = fmt.int(countUp(0, Number(node.dataset.to), p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function paint(numbers, frozen, history) {
    body.textContent = '';
    const all = [...numbers, ...extra];
    const byId = new Map(all.map((n) => [n.id, n]));
    status.textContent = '';
    status.appendChild(el('span', frozen ? 'ui-chip' : 'ui-chip ui-chip--atm', frozen ? t(S.frozen, { quarter: quarterWords(frozen.quarter) }) : S.live));
    const asOf = all.length ? timeText.utcLong(numbers[0] ? numbers[0].asOfMs : all[0].asOfMs) : '';
    status.appendChild(el('span', null, frozen ? t(S.howBack, { date: asOf }) : t(S.howLive, { date: asOf })));

    const hero = el('ul', 'sr-hero sr-ops__hero');
    hero.setAttribute('aria-label', S.heroLabel);
    for (const id of HERO) if (byId.has(id)) hero.appendChild(heroCell(byId.get(id)));
    body.appendChild(hero);

    const list = el('ul', 'sr-list sr-ops__numbers');
    for (const r of stateRows(all.filter((n) => !HERO.includes(n.id)), S)) {
      const li = el('li', 'sr-list__row');
      const row = el('div', 'sr-list__static sr-ops__numrow');
      row.title = r.title;
      const text = el('span', 'sr-ops__rowtext');
      text.append(el('span', 'sr-list__name', r.label), el('span', 'sr-ops__meta', r.meta));
      const v = el('span', 'sr-list__value sr-num', fmt.int(r.value));
      v.dataset.to = String(r.value);
      row.append(text, v);
      li.appendChild(row);
      list.appendChild(li);
    }
    body.appendChild(list);

    // Who owns the satellites in Earth orbit (CelesTrak's OWNER codes, named where the words have a name).
    const owners = frozen ? (frozen.payload_owners || []).map((o) => [o.owner, o.value]) : (ownersLive || []);
    if (owners.length) {
      body.appendChild(el('h4', 'sr-micro', S.ownersHead));
      const ol = el('ul', 'sr-list sr-list--quiet sr-ops__owners');
      for (const [code, n] of owners) {
        const li = el('li', 'sr-list__row');
        const row = el('div', 'sr-list__static');
        row.append(el('span', 'sr-list__name', S.owners[code] || code), el('span', 'sr-list__value sr-num', fmt.int(n)));
        li.appendChild(row);
        ol.appendChild(li);
      }
      body.appendChild(ol);
    }

    // Since 2016, a point a quarter: counted back from today's catalogue (history.json).
    const series = history && Array.isArray(history.series) ? history.series : [];
    if (series.length > 1) {
      body.appendChild(el('h4', 'sr-micro', S.sparkHead));
      const sl = el('ul', 'sr-list sr-list--quiet sr-ops__sparks');
      for (const [key, words] of [['payloads', S.sparkPayloads], ['debris', S.sparkDebris], ['launches', S.sparkLaunches]]) {
        const last = series[series.length - 1];
        const li = el('li', 'sr-list__row');
        const row = el('div', 'sr-list__static sr-ops__sparkrow');
        row.append(el('span', 'sr-list__name', words), sparkline(series, key, `${words}, ${series[0].q} to ${last.q}`), el('span', 'sr-list__value sr-num', fmt.int(last[key])));
        li.appendChild(row);
        sl.appendChild(li);
      }
      body.appendChild(sl);
    }

    body.appendChild(el('p', 'sr-card__note', S.note));
    // Cite this: the frozen quarter people can point at, and the page that keeps every quarter.
    const acts = el('div', 'sr-ops__acts');
    if (frozenDoc) {
      const cite = button('ui-btn ui-btn--sm', S.cite);
      cite.addEventListener('click', () => {
        const text = t(S.citeText, { quarter: quarterWords(frozenDoc.quarter), frozen: frozenDoc.frozen });
        const done = () => { cite.textContent = S.copied; setTimeout(() => { cite.textContent = S.cite; }, 2000); };
        try { navigator.clipboard.writeText(text).then(done, () => {}); } catch { /* no clipboard here */ }
      });
      acts.appendChild(cite);
    }
    const page = el('a', 'ui-btn ui-btn--sm ui-btn--quiet', S.pageLink);
    page.href = 'state-of-space/index.html';
    acts.appendChild(page);
    body.appendChild(acts);
    const sources = [`CelesTrak SATCAT${history && history.source ? ` (${history.source.read})` : ''}`];
    if (byId.has('people')) sources.push(`${S.peopleSource}, ${ago(byId.get('people').asOfMs)}`);
    if (byId.has('dsn_now')) sources.push(`${S.dsnSource}, ${ago(byId.get('dsn_now').asOfMs)}`);
    body.appendChild(sourceLine(sources.join(' · ')));
    tick([...body.querySelectorAll('[data-to]')]);
  }

  const quarterWords = (q) => { const m = /^(\d{4})-q([1-4])$/.exec(String(q || '')); return m ? t(S.quarter, { year: m[1], n: m[2] }) : String(q || ''); };
  let frozenDoc = null;
  let ownersLive = null;

  async function fill() {
    const [live, frozen, more] = await Promise.all([loadState().catch(() => null), loadFrozen().catch(() => null), extras().catch(() => [])]);
    extra = more;
    frozenDoc = frozen && frozen.latest;
    const history = frozen && frozen.history;
    if (live && live.summary) {
      ownersLive = (live.summary.payload_owners || []).map((x) => [x[0], x[1]]);
      paint(stateNumbers(live.summary, live.fetchedAt), null, history);
    } else if (frozenDoc) {
      paint(frozenNumbers(frozenDoc), frozenDoc, history);
    } else {
      body.textContent = '';
      body.appendChild(el('p', 'sr-ops__wait', COPY.ops.couldNot));
    }
  }

  return {
    show() {
      fill();
      clearInterval(timer);
      timer = setInterval(() => { if (!pane.hidden) fill(); }, REFRESH_MS);
    },
    hide() { clearInterval(timer); timer = null; },
  };
}
