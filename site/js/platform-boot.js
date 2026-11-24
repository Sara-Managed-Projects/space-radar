// platform-boot.js -- the platform bridge for a page that is not the map: a Lab simulator (scripts/gen_lab_index.py
// writes it into each head between the chrome:head markers) and the static pages (scripts/seo_chrome.py styles()).
// It adds the platform's script where the host is ours (ui/platform-bridge.js) and makes every heart already in the page
// (`[data-sr-fav]`, written by the generator with its words) work from this browser's own list. On localhost, in a fork
// and offline it does the hearts and nothing else.
import { loadPlatform } from './ui/platform-bridge.js';
import { wireHeart } from './ui/favs.js';

export function bootPage(win) {
  if (!win || !win.document) return;
  loadPlatform(win);
  for (const b of win.document.querySelectorAll('button[data-sr-fav]')) {
    wireHeart(b, { add: b.dataset.srAdd || b.getAttribute('aria-label') || '', remove: b.dataset.srRemove || b.getAttribute('aria-label') || '' });
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bootPage(window), { once: true });
  else bootPage(window);
}
