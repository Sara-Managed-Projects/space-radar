// ui/reveal.js -- bring a section into view inside the column that scrolls it, never the page.
//
// The controls column on a 1280 x 800 desktop shows 496 px of a 3 784 px panel (measured on the
// live site, 2026-09-21). Next's "Coming up" started 41 px below the visible bottom, and Now's
// "Where you are" and "Coming over tonight" more than 2 000 px below it. Pressing either moment
// changed the scene and left the part of the panel it exists for out of sight.
//
// The scroller rather than Element.scrollIntoView: on a phone the column is a drawer, and
// scrollIntoView also scrolls every ancestor that can scroll, the page beneath the drawer included.

/**
 * Deferred one frame, and that is not decoration: ui/next.js and ui/controls.js both answer the same
 * `sr:moment` event, and going from Next to Now one of them hides "Coming up" while the other would
 * be measuring -- a position read before that is off by the height of a section that is gone.
 *
 * @param {Element} el     the section to show
 * @param {number} above   how many pixels of what precedes it to keep in view
 */
export function revealInColumn(el, above = 0) {
  const go = () => {
    if (!el || el.hidden || typeof getComputedStyle !== 'function') return;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) {
        const top = el.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop;
        const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        p.scrollTo({ top: Math.max(0, top - above), behavior: reduce ? 'auto' : 'smooth' });
        return;
      }
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
  else go();
}
