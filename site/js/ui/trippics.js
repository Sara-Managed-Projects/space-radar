// ui/trippics.js -- a trip's picture, under its card and over its intro (spec 0068 task 1).
//
// Ivan, 2026-10-02: "tour cards should have in background picture for this tour (showing
// explanation not only with text but image itself, should gradual image on the grid square)". One
// WebP per trip, site/images/trips/<id>.webp, 640 x 360 and at most `trip_picture_bytes`
// (registry/budgets.yaml), rendered by the app at the trip's own picture stop
// (scripts/build_trip_thumbs.py, tools/trip-pictures.probe.js). The card fades it into its glass
// (ui.css .sr-tripcard__pic and the card's ::after); the intro sheet wears it as its header.
//
// NOT ON THE FIRST VISIT'S CRITICAL PATH. The trips are on the first screen, so `loading=lazy`
// alone would fetch four pictures while the catalogues are still arriving. A picture is asked for
// only once the map has settled (PICTURE_DELAY_MS after sr:layers-ready, the moment main.js lets
// the later layers come) AND its card is on screen (an IntersectionObserver: a phone's closed sheet
// and the trips behind "All 9 trips" ask for nothing). It decodes off the main thread
// (`decoding=async`) and fades in over the card's tint, which is what the card shows until then.
//
// A REBUILT CARD IS A NEW <img>. ui/explore.js rebuilds the cards as plans land; a picture already
// fetched once is put straight back, already shown, so a repaint never flickers through the fade.
//
// DECORATIVE. The card's title says what the trip is, so the picture is `alt=""` and hidden from
// assistive technology; a picture that fails to load is removed and the tint is the card again.

/** After sr:layers-ready: past the two seconds the first-visit byte test measures, as the later layers. */
export const PICTURE_DELAY_MS = 3000;

/** Where a trip's picture is served from, relative to the page (index.html is at the site root). */
export function tripPictureUrl(id) {
  return `images/trips/${encodeURIComponent(String(id || ''))}.webp`;
}

const shown = new Set();
const waiting = new Set();
let open = false;
let observer = null;

function load(img) {
  waiting.delete(img);
  if (observer) observer.unobserve(img);
  const url = img.dataset.src;
  if (!url || img.getAttribute('src')) return;
  img.addEventListener('load', () => { shown.add(url); img.classList.add('is-loaded'); }, { once: true });
  img.addEventListener('error', () => img.remove(), { once: true });
  img.src = url;
}

function watch(img) {
  if (typeof IntersectionObserver !== 'function') { load(img); return; }
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && open) load(e.target);
    }, { rootMargin: '64px' });
  }
  observer.observe(img);
}

/** Open the gate: every picture waiting for it is watched now (and loads as its card shows). */
function openGate() {
  if (open) return;
  open = true;
  for (const img of [...waiting]) if (img.isConnected) watch(img); else waiting.delete(img);
}

if (typeof window !== 'undefined') {
  const later = () => setTimeout(openGate, PICTURE_DELAY_MS);
  if (window.__srLayersReady) later();
  else window.addEventListener('sr:layers-ready', later, { once: true });
}

/**
 * The picture for trip `id`, as an <img> to lay under a card or over a sheet. It fetches nothing
 * until the gate is open and it is on screen, then fades in (class `is-loaded`).
 * @param {string} id
 * @param {string} className
 */
export function tripPicture(id, className) {
  const img = document.createElement('img');
  img.className = className;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.decoding = 'async';
  img.loading = 'lazy';
  img.draggable = false;
  img.width = 640;
  img.height = 360;
  const url = tripPictureUrl(id);
  img.dataset.src = url;
  if (shown.has(url)) {
    img.classList.add('is-loaded');
    img.src = url;
    return img;
  }
  // Watched only once it is in the document: an observer told about a detached node never fires.
  queueMicrotask(() => {
    if (!img.isConnected) return;
    if (open) watch(img);
    else waiting.add(img);
  });
  return img;
}
