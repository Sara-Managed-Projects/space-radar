// embed/generate.js -- the code generator on /embed/ (templates/embed/generate.js, copied by
// scripts/seo_embed.py). Built at deploy time, not part of the app: the page is a page, and a visit to
// the map downloads none of it.
//
// It writes the SAME <iframe> the app's own Embed button writes (site/js/ui/embed.js embedSnippet), and
// tests/test_seo_embed.py runs both under Node over every object and trip and holds the two equal,
// and holds each address to what the app's reader accepts (embedLink). A caption link back is added
// unless the person unticks it: a plain anchor to https://www.spaceradar.ai/?from=embed, no tracker.
//
// The pure functions are exported and need no DOM. The page wires itself only when there is one.

export const BASE = 'https://www.spaceradar.ai/';
export const CREDIT_HREF = 'https://www.spaceradar.ai/?from=embed';
export const DEFAULT_SIZE = { width: 600, height: 400 };
export const LIMITS = { minWidth: 280, maxWidth: 1600, minHeight: 200, maxHeight: 1200 };
// What the app's reader lets through for an id (site/js/ui/embed.js SAFE_VALUE).
export const SAFE_VALUE = /^[A-Za-z0-9._:+\- ]{1,80}$/;

// The same escaping as ui/embed.js attr(): & " < >, and not the apostrophe.
const attr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The frame's address: the map alone, one object (`at`) or one guided trip (`trip`). */
export function embedAddress(kind, id) {
  if (kind === 'map') return `${BASE}?embed=1`;
  if (kind !== 'object' && kind !== 'trip') throw new Error(`kind must be object, trip or map, not ${kind}`);
  if (!SAFE_VALUE.test(String(id || ''))) throw new Error(`"${id}" is not an id the embed reads`);
  return `${BASE}?embed=1&${kind === 'trip' ? 'trip' : 'at'}=${encodeURIComponent(String(id))}`;
}

const whole = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : dflt;
};

/** The words a screen reader gives the frame. */
export function frameTitle(kind, name) {
  if (kind === 'map') return 'Space Radar, a live 3D map of space';
  if (kind === 'trip') return `${name}, a guided trip on Space Radar`;
  return `${name}, live on Space Radar`;
}

/**
 * The code to paste: the <iframe>, and under it, unless `credit` is false, one line with a link back.
 * @param {{kind: 'object'|'trip'|'map', id?: string, name?: string, width?: number, height?: number, credit?: boolean}} o
 */
export function snippet(o) {
  const w = whole(o.width, LIMITS.minWidth, LIMITS.maxWidth, DEFAULT_SIZE.width);
  const h = whole(o.height, LIMITS.minHeight, LIMITS.maxHeight, DEFAULT_SIZE.height);
  const frame = `<iframe src="${attr(embedAddress(o.kind, o.id))}" title="${attr(frameTitle(o.kind, o.name))}" width="${w}" height="${h}" loading="lazy" allow="fullscreen" style="border:0;max-width:100%"></iframe>`;
  if (o.credit === false) return frame;
  return `${frame}\n<p>Live view by <a href="${CREDIT_HREF}">Space Radar</a></p>`;
}

// ------------------------------------------------------------------------------ the page

function wire(doc) {
  const form = doc.getElementById('gen');
  if (!form) return;
  const $ = (id) => doc.getElementById(id);
  const out = $('gen-code');
  const note = $('gen-note');
  const kinds = [...form.querySelectorAll('input[name="kind"]')];
  const kind = () => (kinds.find((k) => k.checked) || kinds[0]).value;
  const pickFor = { object: $('gen-object'), trip: $('gen-trip') };
  const own = $('gen-own');

  function current() {
    const k = kind();
    const sel = pickFor[k];
    const typed = k === 'object' ? own.value.trim() : '';
    const id = typed || (sel ? sel.value : '');
    const name = typed || (sel && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '');
    return { kind: k, id, name, width: $('gen-width').value, height: $('gen-height').value, credit: $('gen-credit').checked };
  }

  function render() {
    for (const k of ['object', 'trip']) $(`gen-row-${k}`).hidden = kind() !== k;
    try {
      out.value = snippet(current());
      note.textContent = '';
    } catch (e) {
      out.value = '';
      note.textContent = e.message;
    }
    const preview = $('gen-preview');
    if (preview.firstChild) { preview.textContent = ''; $('gen-show').textContent = $('gen-show').dataset.show; }
  }

  form.addEventListener('input', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  $('gen-copy').addEventListener('click', async () => {
    if (!out.value) return;
    try {
      await navigator.clipboard.writeText(out.value);
      $('gen-status').textContent = 'Copied.';
    } catch {
      out.focus();
      out.select();
      $('gen-status').textContent = 'Press Ctrl+C (Cmd+C on a Mac) to copy the selected code.';
    }
  });
  $('gen-show').addEventListener('click', () => {
    const box = $('gen-preview');
    const btn = $('gen-show');
    if (box.firstChild) { box.textContent = ''; btn.textContent = btn.dataset.show; return; }
    try {
      const o = current();
      const frame = doc.createElement('iframe');
      frame.src = embedAddress(o.kind, o.id);
      frame.title = frameTitle(o.kind, o.name);
      frame.width = String(whole(o.width, LIMITS.minWidth, LIMITS.maxWidth, DEFAULT_SIZE.width));
      frame.height = String(whole(o.height, LIMITS.minHeight, LIMITS.maxHeight, DEFAULT_SIZE.height));
      frame.setAttribute('allow', 'fullscreen');
      frame.style.cssText = 'border:0;max-width:100%';
      box.appendChild(frame);
      btn.textContent = btn.dataset.hide;
    } catch (e) {
      note.textContent = e.message;
    }
  });
  render();
}

if (typeof document !== 'undefined') wire(document);
