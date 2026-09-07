// ui/search.js -- find an object by name or catalogue number, and fly to it.
//
// Contract export: createSearch(ctx, host) -> { destroy(), focus(), refresh() }
// Also exported, and pure, so the ranking can be measured without a DOM:
//   buildIndex(records, layers) -> Index
//   findMatches(index, query, limit) -> { hits, total, query }
//
// This module finds a record and hands it to ctx.select(). It does NOT fly the camera and does
// NOT open the card: main.js's select() already does both, and a second implementation of either
// would be a second thing to keep true.
//
// Three decisions worth knowing before reading:
//
//  1. THE INDEX IS FLAT. Records arrive over several seconds and there can be 17 579 of them.
//     Parallel arrays of already-lower-cased strings, built once per layer-load burst, so a
//     keystroke is one linear pass of indexOf and nothing else. MEASURED on 17 579 synthetic
//     records with real names (node 24, M-series Mac): building the whole index takes 3.7-7.9 ms,
//     and one query -- the 17 579 indexOf calls PLUS the sort and the de-duplication -- has a
//     median of 0.4-0.5 ms for a query a person types ("iss", "dragon", "25544") and a worst case
//     of 2.1 ms on "st", which matches 12 001 objects. A keystroke costs a fraction of a frame,
//     so neither a worker nor an incremental structure is worth its weight.
//
//  2. THE DROPDOWN IS IN FLOW, not absolutely positioned. `.sr-controls` is a scroll container
//     (`overflow-y: auto`, and on a phone it is a 62vh drawer), so an absolutely positioned
//     popup would be clipped by its own panel. An in-flow list cannot be.
//
//  3. SWITCHING THE LAYER ON BEFORE SELECTING. See pick() -- it is the difference between the
//     feature working and looking broken.

import { COPY, t, fmt } from '../copy/en.js';

// Ids are per instance, not per module. aria-controls and aria-activedescendant are id
// references, so two panels sharing one id silently point a screen reader at the wrong list --
// which is what happened while testing this, with a second instance created from the console.
let instances = 0;

const MIN_QUERY = 2; // one letter matches thousands of things and helps nobody
const MAX_RESULTS = 12;
const INPUT_DEBOUNCE_MS = 120;
// `sr:layer` fires once per layer, ~15 times over several seconds. Rebuilding 17 000 entries on
// each is waste; this is the trailing edge of the burst. A query that arrives before it fires
// rebuilds on the spot instead (see ensureIndex), so the wait is never visible.
const REBUILD_DEBOUNCE_MS = 600;

// Scoring. The gaps are wide so that a tie-break can never climb a tier.
const CAT_EXACT = 1000; // "25544" is unambiguous: the strongest signal there is
const NAME_EXACT = 900;
const NAME_PREFIX = 800;
const WORD_PREFIX = 700; // "dragon" finds "CREW DRAGON 12"
const NAME_CONTAINS = 600;
const OTHER_CONTAINS = 500; // designator or operator
// Below every tier the brief names, and the reason it exists: a catalogue number is typed one
// digit at a time. Without it "2554" finds nothing at all and "25544" finds the station, which
// reads as the search being broken rather than as the number being incomplete.
const CAT_PREFIX = 400;

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {} };

// ---------------------------------------------------------------------------------------
// DOM helpers -- textContent only, never innerHTML. Same two as ui/controls.js.
// ---------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

// ---------------------------------------------------------------------------------------
// Reading ctx, exactly as ui/controls.js does: through the contract, never into internals.
// ---------------------------------------------------------------------------------------

function layerList(ctx) {
  const l = ctx && ctx.layers;
  if (Array.isArray(l)) return l;
  if (l && Array.isArray(l.LAYERS)) return l.LAYERS;
  if (l && Array.isArray(l.list)) return l.list;
  return [];
}

function recordsOf(ctx) {
  try {
    const r = ctx && typeof ctx.records === 'function' ? ctx.records() : null;
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------
// The index
// ---------------------------------------------------------------------------------------

/** Lower-cased, trimmed, inner runs of whitespace collapsed. Applied to the query too. */
function norm(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * A word boundary in an object name. Names are shouted catalogue strings -- "NOAA 20 (JPSS-1)",
 * "COSMOS 2251 DEB", "SL-16 R/B" -- so the separators are punctuation, not case changes.
 */
function isBoundary(code) {
  return (
    code === 32 || // space
    code === 45 || // -
    code === 40 || // (
    code === 41 || // )
    code === 47 || // /
    code === 46 || // .
    code === 44 || // ,
    code === 95 || // _
    code === 39 // '
  );
}

/**
 * Build the flat index.
 *
 * @param {Array<Object>} records  ctx.records()
 * @param {Array<Object>} layers   ctx.layers, for the display name and the tie-break rank
 * @returns {Object} parallel arrays, one entry per searchable record
 */
export function buildIndex(records, layers) {
  const list = Array.isArray(records) ? records : [];
  const rows = Array.isArray(layers) ? layers : [];

  // Rank is the layer's position in LAYERS. main.js picks the first hit in that order for a tap
  // on the sky -- "the layer order is the priority" -- so a search result uses the same ladder
  // and a station comes out ahead of a piece of debris.
  const rankOf = new Map();
  const displayOf = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || !row.id) continue;
    rankOf.set(row.id, i);
    displayOf.set(row.id, row.display || row.id);
  }

  const index = {
    n: 0,
    record: [],
    name: [], // lower-cased
    cat: [], // catalogue number as text, '' when the object has none
    desig: [], // lower-cased international designator
    oper: [], // lower-cased operator
    rank: [], // layer position; smaller comes first
    len: [], // name length, a tie-break
    picked: [], // on the hand-kept list; a tie-break, see below
    where: [], // the layer's display name, for the quiet right-hand label
    layers: displayOf,
  };

  for (const record of list) {
    if (!record) continue;
    const meta = record.meta || {};
    const name = norm(record.name || meta.objectName);
    const cat = meta.catalogueNumber != null ? meta.catalogueNumber : meta.noradId;
    const catText = Number.isFinite(Number(cat)) && cat !== null ? String(cat) : '';
    // The OMM parser carries no operator today; LightLive2 spells the same idea `provider`.
    // Both are read, neither is invented: an object with neither simply is not found by operator.
    const oper = norm(meta.operator || meta.provider);
    if (!name && !catText && !oper) continue; // nothing to search it by

    index.record.push(record);
    index.name.push(name);
    index.cat.push(catText);
    index.desig.push(norm(meta.intlDesignator));
    index.oper.push(oper);
    const rank = rankOf.get(record.layer);
    index.rank.push(rank === undefined ? rows.length : rank);
    index.len.push(name.length);
    // layers.js stamps meta.why from the hand-kept NOTABLE list. It is the one curated "this is
    // the one people mean" signal a record carries, and it is what puts ISS (ZARYA) above
    // ISS (NAUKA): MEASURED on the live page, both are "iss" name-prefix hits in the same layer
    // with names of the same length, so without it the alphabet decides and the module wins.
    index.picked.push(meta.why ? 1 : 0);
    index.where.push(displayOf.get(record.layer) || '');
    index.n += 1;
  }
  return index;
}

/**
 * Score one entry against an already-normalised query. 0 means no match.
 * One indexOf over the name carries three of the tiers, which is why the scan is cheap.
 */
function scoreOne(index, i, q, numeric) {
  if (numeric && index.cat[i] === q) return CAT_EXACT;

  const name = index.name[i];
  if (name) {
    if (name === q) return NAME_EXACT;
    let at = name.indexOf(q);
    if (at === 0) return NAME_PREFIX;
    if (at > 0) {
      // A later occurrence may start a word even when the first one does not, so keep looking
      // before settling for "contains". This only runs on entries that already matched.
      while (at > 0) {
        if (isBoundary(name.charCodeAt(at - 1))) return WORD_PREFIX;
        at = name.indexOf(q, at + 1);
      }
      return NAME_CONTAINS;
    }
  }

  const desig = index.desig[i];
  if (desig && desig.indexOf(q) >= 0) return OTHER_CONTAINS;
  const oper = index.oper[i];
  if (oper && oper.indexOf(q) >= 0) return OTHER_CONTAINS;
  if (numeric && index.cat[i] && index.cat[i].startsWith(q)) return CAT_PREFIX;
  return 0;
}

/**
 * What people type, against what the catalogue calls it. Searching "hubble" found nothing at all
 * until this existed, because CelesTrak's name for it is `HST` -- and a search that cannot find
 * the Hubble Space Telescope is not a search anybody will use twice.
 *
 * Deliberately short. This is a list of names the public uses for famous objects, not a synonym
 * engine: every row is a fact about naming, and a row nobody can justify should be removed.
 */
const ALIASES = {
  hubble: 'hst',
  webb: 'jwst',
  'james webb': 'jwst',
  'space station': 'iss',
  station: 'iss',
  tiangong: 'css',
  chandra: 'cxo',
  'international space station': 'iss',
};

/** Does anything match at all? Stops after the first hit, so the alias check is nearly free. */
function anyMatch(index, q) {
  if (!index || !index.n) return false;
  const numeric = /^[0-9]+$/.test(q);
  for (let i = 0; i < index.n; i += 1) if (scoreOne(index, i, q, numeric) > 0) return true;
  return false;
}

/**
 * The whole ranking, pure and DOM-free.
 *
 * @param {Object} index   from buildIndex
 * @param {string} query   raw user text
 * @param {number} [limit] how many rows to return; the total is reported whatever the cap
 * @returns {{hits: Array<Object>, total: number, query: string}}
 */
export function findMatches(index, query, limit = MAX_RESULTS) {
  let q = norm(query);
  // Try the alias only when the query as typed finds nothing, so a real catalogue name always
  // wins over a nickname that happens to contain it.
  if (q && ALIASES[q] && !anyMatch(index, q)) q = ALIASES[q];
  const out = { hits: [], total: 0, query: q };
  if (!index || !index.n || q.length < MIN_QUERY) return out;

  const numeric = /^[0-9]+$/.test(q);
  // The score is kept from the scan rather than recomputed in the comparator: scoring twice was
  // the difference between one pass and one pass plus a sort's worth of indexOf.
  const found = [];
  for (let i = 0; i < index.n; i += 1) {
    const score = scoreOne(index, i, q, numeric);
    if (score > 0) found.push({ i, score });
  }
  out.total = found.length;
  if (!found.length) return out;

  // Score first, then the layer ladder, then the shorter name -- "ISS (ZARYA)" ahead of
  // "ISS DEB (CZ-4 R/B)" when both merely contain the letters.
  found.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (index.rank[a.i] !== index.rank[b.i]) return index.rank[a.i] - index.rank[b.i];
    // The hand-kept list, before the name length. MEASURED on the live page: "iss" returns
    // ISS (NAUKA) and ISS (ZARYA), same score, same layer, names of the same length -- so
    // without this line the alphabet decides and a module of the station outranks the station.
    if (index.picked[a.i] !== index.picked[b.i]) return index.picked[b.i] - index.picked[a.i];
    if (index.len[a.i] !== index.len[b.i]) return index.len[a.i] - index.len[b.i];
    if (index.name[a.i] !== index.name[b.i]) return index.name[a.i] < index.name[b.i] ? -1 : 1;
    return a.i - b.i; // total order, so the list never reshuffles between identical keystrokes
  });

  // ONE ROW PER OBJECT. The station is in `stations` AND in `visual`; a famous fragment is in
  // `visual` AND in `debris-notable`. Both memberships are correct -- it really is a crewed
  // station and it really is bright enough to see -- but a search result listing "ISS (ZARYA)"
  // twice looks like a bug and makes the user choose between two identical rows. The sort has
  // already put the best-ranked copy first, so keeping the first sighting of each id keeps the
  // station's row and drops the duplicate.
  //
  // The walk does NOT stop at the cap. Stopping there would make `total` the number of rows shown
  // rather than the number of objects found, and the footer's "n more match" -- the one place the
  // list admits it is not showing everything -- would then always read zero.
  const seen = new Set();
  const unique = [];
  let total = 0;
  for (const hit of found) {
    const id = index.record[hit.i] && index.record[hit.i].id;
    if (id != null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    total += 1;
    if (unique.length < limit) unique.push(hit);
  }
  out.total = total;

  for (const hit of unique) {
    const i = hit.i;
    out.hits.push({
      record: index.record[i],
      name: index.record[i].name || COPY.card.unknownName,
      where: index.where[i],
      klass: index.record[i].klass || 'unknown',
      score: hit.score,
      // Where the query lands in the displayed name, for the highlight. -1 when the match came
      // from the catalogue number, the designator or the operator instead.
      at: index.name[i].indexOf(q),
      length: q.length,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------------------

export function createSearch(ctx, host) {
  const parent =
    (host && host.appendChild ? host : null) || document.getElementById('sr-controls') || document.body;

  const state = {
    index: buildIndex([], layerList(ctx)),
    dirty: true,
    open: false,
    active: -1, // the highlighted row, and what "Fly to it" acts on
    hits: [],
    total: 0,
    reported: new Set(), // layer ids that have fired sr:layer, whatever count they carried
    inputTimer: 0,
    rebuildTimer: 0,
  };

  // --- structure ------------------------------------------------------------------------

  instances += 1;
  const suffix = instances === 1 ? '' : `-${instances}`;
  const LIST_ID = `sr-search-list${suffix}`;
  const OPTION_ID = `sr-search-option${suffix}-`;

  const wrap = el('section', 'sr-panel sr-search');
  wrap.appendChild(el('h2', 'sr-panel__title', COPY.search.title));

  const row = el('div', 'sr-search__row');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sr-search__input';
  input.placeholder = COPY.search.placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', COPY.search.inputLabel);
  // WAI-ARIA 1.2 combobox: the input owns the state, the list is a separate listbox.
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', LIST_ID);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');

  const fly = button('sr-btn sr-btn--primary sr-search__fly', COPY.search.fly, COPY.search.flyTitle);
  fly.disabled = true;

  row.appendChild(input);
  row.appendChild(fly);
  wrap.appendChild(row);

  const pop = el('div', 'sr-search__pop');
  pop.hidden = true;
  const list = el('ul', 'sr-search__list');
  list.id = LIST_ID;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', COPY.search.listLabel);
  // The footer is a sibling of the listbox, never a child of it: everything inside a listbox
  // must be an option, and a note that is announced as a choosable object is a lie to a screen
  // reader. aria-live so the honesty about what is NOT searched is actually heard.
  const foot = el('p', 'sr-search__foot');
  foot.setAttribute('role', 'status');
  foot.setAttribute('aria-live', 'polite');
  pop.appendChild(list);
  pop.appendChild(foot);
  wrap.appendChild(pop);

  const note = el('p', 'sr-search__note', COPY.search.hint);
  wrap.appendChild(note);

  if (reduceMotion.matches) wrap.classList.add('is-reduced-motion');
  parent.appendChild(wrap);

  // --- the index ------------------------------------------------------------------------

  function rebuild() {
    state.index = buildIndex(recordsOf(ctx), layerList(ctx));
    state.dirty = false;
    paintNote();
    if (state.open) run(input.value); // an open dropdown must not show a stale answer
  }

  function ensureIndex() {
    if (state.dirty) rebuild();
  }

  /**
   * What is NOT being searched, said out loud.
   *
   * A layer that has fired `sr:layer` and holds no records either failed or is genuinely empty;
   * a layer that has never fired has not been read yet. Both mean the same thing to a searcher --
   * nothing in it can be found -- and neither can say HOW MANY objects that is, because the size
   * of a file nobody has read is not a number this app has. Saying "could not look" is the
   * honest third answer; inventing "about 16 500" from a comment in layers.js would not be.
   */
  function missingLayers() {
    const counts = new Map();
    for (const record of recordsOf(ctx)) {
      if (!record || !record.layer) continue;
      counts.set(record.layer, (counts.get(record.layer) || 0) + 1);
    }
    const out = [];
    for (const layer of layerList(ctx)) {
      if (!layer || !layer.id) continue;
      if (layer.forcedOff) continue;
      if ((counts.get(layer.id) || 0) > 0) continue;
      out.push(layer.display || layer.id);
    }
    return out;
  }

  function paintNote() {
    const missing = missingLayers();
    const parts = [];
    parts.push(
      state.index.n === 0
        ? COPY.search.empty
        : t(state.index.n === 1 ? COPY.search.searchingOne : COPY.search.searching, {
            n: fmt.int(state.index.n),
          }),
    );
    if (missing.length) {
      parts.push(t(COPY.search.notLoaded, { layers: missing.join(COPY.punctuation.listJoin) }));
      parts.push(COPY.search.notLoadedCount);
    }
    note.textContent = parts.join(' ');
    note.classList.toggle('is-warning', missing.length > 0);
  }

  // --- painting the dropdown ------------------------------------------------------------

  function nameNode(hit) {
    const node = el('span', 'sr-search__name');
    const raw = String(hit.name);
    // hit.at is an offset into the lower-cased name, which norm() only lower-cases and trims;
    // an inner run of collapsed whitespace could shift it, so a mismatched length is dropped
    // rather than drawn in the wrong place.
    if (hit.at >= 0 && hit.at + hit.length <= raw.length) {
      node.appendChild(document.createTextNode(raw.slice(0, hit.at)));
      const mark = document.createElement('mark');
      mark.className = 'sr-search__hit';
      mark.textContent = raw.slice(hit.at, hit.at + hit.length);
      node.appendChild(mark);
      node.appendChild(document.createTextNode(raw.slice(hit.at + hit.length)));
    } else {
      node.textContent = raw;
    }
    return node;
  }

  function paintList() {
    list.textContent = '';
    for (let i = 0; i < state.hits.length; i += 1) {
      const hit = state.hits[i];
      const item = el('li', 'sr-search__option');
      item.id = OPTION_ID + i;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      // The class dot. The swatch tokens in ui.css are scene/glyphatlas.js's CLASS_COLOURS
      // verbatim, so the dot is the colour the object is drawn in without this panel importing
      // the atlas -- and with it, three.js.
      const dot = el('span', `sr-swatch sr-swatch--${hit.klass}`);
      dot.setAttribute('aria-hidden', 'true');
      item.appendChild(dot);
      item.appendChild(nameNode(hit));
      if (hit.where) item.appendChild(el('span', 'sr-search__where', hit.where));
      // pointerdown would blur the input before the click lands, closing the list under the
      // finger. Suppressing the default keeps focus where the ARIA state says it is.
      item.addEventListener('pointerdown', (event) => event.preventDefault());
      item.addEventListener('click', () => {
        setActive(i);
        pick(hit.record);
      });
      list.appendChild(item);
    }

    const hidden = state.total - state.hits.length;
    if (!state.hits.length) foot.textContent = COPY.search.noMatch;
    else if (hidden > 0) foot.textContent = t(COPY.search.more, { n: fmt.int(hidden) });
    else foot.textContent = '';
    foot.hidden = foot.textContent === '';
  }

  function paintActive() {
    for (let i = 0; i < list.children.length; i += 1) {
      const item = list.children[i];
      const on = i === state.active;
      item.classList.toggle('is-active', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (state.active >= 0 && list.children[state.active]) {
      input.setAttribute('aria-activedescendant', OPTION_ID + state.active);
      const item = list.children[state.active];
      if (item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
    fly.disabled = state.active < 0 || !state.hits[state.active];
  }

  function setActive(i) {
    state.active = i >= 0 && i < state.hits.length ? i : -1;
    paintActive();
  }

  function setOpen(open) {
    state.open = open && state.hits.length > 0;
    pop.hidden = !state.open;
    input.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    if (!state.open) {
      state.active = -1;
      input.removeAttribute('aria-activedescendant');
      fly.disabled = true;
    }
  }

  function close(clear) {
    setOpen(false);
    if (clear) {
      input.value = '';
      state.hits = [];
      state.total = 0;
    }
  }

  // --- searching ------------------------------------------------------------------------

  function run(text) {
    const q = norm(text);
    if (q.length < MIN_QUERY) {
      state.hits = [];
      state.total = 0;
      close(false);
      paintList();
      return;
    }
    ensureIndex();
    const result = findMatches(state.index, q, MAX_RESULTS);
    state.hits = result.hits;
    state.total = result.total;
    paintList();
    // Always open on a real query, even with nothing to show: the footer's "nothing matches" is
    // an answer, and a dropdown that simply does not appear is indistinguishable from a bug.
    state.open = true;
    pop.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    // The top row is highlighted for you, so Enter and "Fly to it" both work without an arrow key.
    setActive(state.hits.length ? 0 : -1);
  }

  /**
   * THE ONE THING THAT WILL BITE. A record whose layer is switched off has no glyph in the sky
   * and no hero model, so flying to it arrives at an empty patch of sky and the feature looks
   * broken. Switch the layer on first, then select.
   *
   * ctx.setLayerOn() updates main.js and the glyph layer, but ui/controls.js paints its
   * checkboxes from its own `state.enabled` map, so the row for that layer will still read as
   * off until controls.js listens for this event. That is the integrator's one line, not a
   * reason to reach into another module's DOM from here.
   */
  function pick(record) {
    if (!record) return;
    try {
      if (typeof ctx.isLayerOn === 'function' && typeof ctx.setLayerOn === 'function') {
        if (!ctx.isLayerOn(record.layer)) {
          ctx.setLayerOn(record.layer, true);
          document.dispatchEvent(
            new CustomEvent('sr:layer-toggle', {
              detail: { id: record.layer, on: true, handled: true, from: 'search' },
            }),
          );
        }
      }
    } catch {
      /* a layer that refuses to switch on still gets the camera and the card below */
    }
    try {
      if (typeof ctx.select === 'function') ctx.select(record);
    } catch {
      /* select() owns the flight and the card; a failure there is not this panel's to report */
    }
    close(false);
    input.blur();
  }

  // --- events ---------------------------------------------------------------------------

  const onInput = () => {
    window.clearTimeout(state.inputTimer);
    state.inputTimer = window.setTimeout(() => run(input.value), INPUT_DEBOUNCE_MS);
  };

  const onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!state.hits.length) return;
        event.preventDefault();
        if (!state.open) {
          setOpen(true);
          setActive(0);
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const n = state.hits.length;
        setActive((state.active + step + n) % n);
        return;
      }
      case 'Enter': {
        if (state.open && state.active >= 0 && state.hits[state.active]) {
          event.preventDefault();
          pick(state.hits[state.active].record);
        }
        return;
      }
      case 'Escape': {
        if (state.open || input.value) {
          event.preventDefault();
          close(true);
          paintList();
        }
        return;
      }
      case 'Tab': {
        setOpen(false);
        return;
      }
      default:
    }
  };

  const onFocusOut = (event) => {
    const next = event.relatedTarget;
    if (next && wrap.contains(next)) return;
    setOpen(false);
  };

  const onFocusIn = () => {
    if (!state.open && state.hits.length) setOpen(true);
  };

  const onFly = () => {
    if (state.active < 0 || !state.hits[state.active]) return;
    pick(state.hits[state.active].record);
  };

  const onLayer = (event) => {
    const id = event && event.detail && event.detail.id;
    if (id) state.reported.add(id);
    state.dirty = true;
    window.clearTimeout(state.rebuildTimer);
    state.rebuildTimer = window.setTimeout(rebuild, REBUILD_DEBOUNCE_MS);
  };

  const onMotion = () => wrap.classList.toggle('is-reduced-motion', reduceMotion.matches);

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('focus', onFocusIn);
  wrap.addEventListener('focusout', onFocusOut);
  fly.addEventListener('click', onFly);
  window.addEventListener('sr:layer', onLayer);
  window.addEventListener('sr:layers-ready', onLayer);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotion);

  rebuild();

  // --- contract -------------------------------------------------------------------------

  return {
    /** Rebuild the index now. Called after layers load; safe to call at any time. */
    refresh() {
      rebuild();
    },
    focus() {
      input.focus();
      input.select();
    },
    destroy() {
      window.clearTimeout(state.inputTimer);
      window.clearTimeout(state.rebuildTimer);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('focus', onFocusIn);
      wrap.removeEventListener('focusout', onFocusOut);
      fly.removeEventListener('click', onFly);
      window.removeEventListener('sr:layer', onLayer);
      window.removeEventListener('sr:layers-ready', onLayer);
      if (reduceMotion.removeEventListener) reduceMotion.removeEventListener('change', onMotion);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}
