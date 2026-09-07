// ui/status.js -- what the app could and could not read.
//
// Contract export: createStatus(ctx): void
//
// Spec 0018 requirement 9: the site says its own state. Every source, its age in words and
// one of three states:
//
//   ok             read recently and inside its freshness window
//   stale          we hold a copy and it is older than the source promises
//   could not look we have never had a good read in this browser
//
// "Could not look" is a THIRD answer, not a decoration on the other two. It is distinct
// from stale (we have something, it is old) and from an error on a copy we hold (the copy
// still renders, and the error is shown under it). A source that has never been fetched
// must never read as fine.
//
// The panel also carries the full attribution list -- cards carry their own source line,
// this is the whole set -- and which layers are live and which are bundled sample data,
// because in v1 several classes ship as samples and the visitor must see that at a glance.

import { COPY, t, fmt, ageInWords } from '../copy/en.js';

const HOST_ID = 'sr-status';
const REFRESH_MS = 5000;

const STATE_OK = 'ok';
const STATE_STALE = 'stale';
const STATE_UNKNOWN = 'unknown';

let host = null;
let built = false;

// ---------------------------------------------------------------------------------------
// DOM helpers -- textContent only
// ---------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function ensureHost() {
  if (host && host.isConnected) return host;
  host = document.getElementById(HOST_ID);
  if (!host) {
    host = el('section', 'sr-status');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }
  host.classList.add('sr-status');
  host.setAttribute('aria-label', COPY.status.title);
  return host;
}

// ---------------------------------------------------------------------------------------
// Reading the source rows
// ---------------------------------------------------------------------------------------

function sourceRows(ctx) {
  try {
    const rows = ctx && ctx.sources && ctx.sources.status ? ctx.sources.status() : null;
    return Array.isArray(rows) ? rows : [];
  } catch {
    // Even the status call failing is itself a "could not look", not an empty panel.
    return [];
  }
}

/**
 * The three states. A row with no fetchedAt has never produced a good copy in this
 * browser, whatever else it reports -- that is "could not look", never "ok".
 */
function stateOf(row) {
  const fetchedAt = Number(row && row.fetchedAt);
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return STATE_UNKNOWN;
  return row && row.stale ? STATE_STALE : STATE_OK;
}

function stateWords(state) {
  if (state === STATE_OK) return COPY.status.stateOk;
  if (state === STATE_STALE) return COPY.status.stateStale;
  return COPY.status.stateUnknown;
}

function stateTitle(state) {
  if (state === STATE_OK) return COPY.status.stateOkTitle;
  if (state === STATE_STALE) return COPY.status.stateStaleTitle;
  return COPY.status.stateUnknownTitle;
}

function ageLine(row) {
  if (stateOf(row) === STATE_UNKNOWN) return COPY.status.ageNeverLine;
  const ageMs = Number(row.ageMs);
  return t(COPY.status.ageLabel, {
    age: ageInWords(Number.isFinite(ageMs) ? ageMs : null),
  });
}

// ---------------------------------------------------------------------------------------
// Live or bundled, derived from the records actually on screen rather than from a promise
// ---------------------------------------------------------------------------------------

function layerKinds(ctx) {
  const byLayer = new Map();
  let records = [];
  try {
    records = ctx && typeof ctx.records === 'function' ? ctx.records() : [];
  } catch {
    records = [];
  }
  if (!Array.isArray(records)) records = [];
  for (const record of records) {
    if (!record || !record.layer) continue;
    let entry = byLayer.get(record.layer);
    if (!entry) {
      entry = { id: record.layer, total: 0, sample: 0, illustrative: 0, live: 0 };
      byLayer.set(record.layer, entry);
    }
    entry.total += 1;
    if (record.cls === 'sample') entry.sample += 1;
    else if (record.cls === 'illustrative') entry.illustrative += 1;
    else entry.live += 1;
  }
  return byLayer;
}

function layerDisplay(ctx, id) {
  const l = ctx && ctx.layers;
  const list = Array.isArray(l) ? l : l && Array.isArray(l.LAYERS) ? l.LAYERS : [];
  const row = list.find((layer) => layer && layer.id === id);
  return (row && (row.display || row.id)) || id;
}

function kindWords(entry) {
  if (!entry || entry.total === 0) return COPY.status.layerEmpty;
  if (entry.sample === entry.total) return COPY.status.layerSample;
  if (entry.illustrative === entry.total) return COPY.status.layerIllustrative;
  if (entry.sample > 0 || entry.illustrative > 0) return COPY.status.layerMixed;
  return COPY.status.layerLive;
}

function kindClass(entry) {
  if (!entry || entry.total === 0) return 'is-empty';
  if (entry.sample === entry.total) return 'is-sample';
  if (entry.illustrative === entry.total) return 'is-illustrative';
  if (entry.sample > 0 || entry.illustrative > 0) return 'is-mixed';
  return 'is-live';
}

// ---------------------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------------------

function renderSources(ctx, into) {
  clear(into);
  const rows = sourceRows(ctx);
  if (!rows.length) {
    into.appendChild(el('li', 'sr-source sr-source--empty', COPY.status.sourcesEmpty));
    return;
  }
  for (const row of rows) {
    const state = stateOf(row);
    const item = el('li', `sr-source is-${state}`);

    const head = el('div', 'sr-source__head');
    head.appendChild(el('span', 'sr-source__label', row.label || row.id));
    const badge = el('span', `sr-state sr-state--${state}`, stateWords(state));
    badge.title = stateTitle(state);
    head.appendChild(badge);
    item.appendChild(head);

    item.appendChild(el('p', 'sr-source__age sr-num', ageLine(row)));

    if (row.error) {
      item.appendChild(
        el(
          'p',
          'sr-source__error',
          COPY.status.errorLabel + COPY.punctuation.colon + String(row.error),
        ),
      );
    }
    into.appendChild(item);
  }
}

function renderLayers(ctx, into) {
  clear(into);
  const kinds = layerKinds(ctx);
  if (!kinds.size) {
    into.appendChild(el('li', 'sr-kind sr-kind--empty', COPY.status.layerEmpty));
    return;
  }
  for (const entry of kinds.values()) {
    const item = el('li', `sr-kind ${kindClass(entry)}`);
    item.appendChild(el('span', 'sr-kind__name', layerDisplay(ctx, entry.id)));
    item.appendChild(el('span', 'sr-kind__state', kindWords(entry)));
    item.appendChild(
      el('span', 'sr-kind__count sr-num', t(COPY.status.layerCountLabel, { n: fmt.int(entry.total) })),
    );
    into.appendChild(item);
  }
}

function renderAttribution(ctx, into) {
  clear(into);
  const seen = new Set();
  for (const row of sourceRows(ctx)) {
    const text = row && row.attribution ? String(row.attribution) : null;
    if (!text || seen.has(text)) continue;
    seen.add(text);
    into.appendChild(el('li', 'sr-credit', text));
  }
  if (!seen.size) into.appendChild(el('li', 'sr-credit sr-credit--empty', COPY.status.sourcesEmpty));
}

// ---------------------------------------------------------------------------------------
// Contract export
// ---------------------------------------------------------------------------------------

export function createStatus(ctx) {
  if (built) return;
  built = true;
  const node = ensureHost();
  clear(node);

  node.appendChild(el('h2', 'sr-status__title', COPY.status.title));
  node.appendChild(el('p', 'sr-status__intro', COPY.status.intro));

  const sourceList = el('ul', 'sr-status__sources');
  node.appendChild(sourceList);

  const layersBlock = el('section', 'sr-status__block');
  layersBlock.appendChild(el('h3', 'sr-status__subtitle', COPY.status.layersTitle));
  layersBlock.appendChild(el('p', 'sr-status__intro', COPY.status.layersIntro));
  const layerList = el('ul', 'sr-status__kinds');
  layersBlock.appendChild(layerList);
  node.appendChild(layersBlock);

  const creditBlock = el('section', 'sr-status__block');
  creditBlock.appendChild(el('h3', 'sr-status__subtitle', COPY.status.attributionTitle));
  creditBlock.appendChild(el('p', 'sr-status__intro', COPY.status.attributionIntro));
  const creditList = el('ul', 'sr-status__credits');
  creditBlock.appendChild(creditList);
  node.appendChild(creditBlock);

  const paint = () => {
    try {
      renderSources(ctx, sourceList);
      renderLayers(ctx, layerList);
      renderAttribution(ctx, creditList);
    } catch {
      /* keep the last good panel rather than blanking the one page that says what is wrong */
    }
  };
  paint();

  // A slow repaint so ages stay true. It reads nothing that is drawn in the scene, and
  // it stops when the tab is hidden because it rides the animation frame.
  if (typeof requestAnimationFrame === 'function') {
    let last = -Infinity;
    const step = () => {
      const wall = typeof performance !== 'undefined' ? performance.now() : last + REFRESH_MS;
      if (wall - last >= REFRESH_MS) {
        last = wall;
        paint();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
