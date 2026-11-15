// ui/worldabout.js -- the paragraph of our own under the first line of the Sun's, the Moon's and a planet's card (internal #302).
//
// Contract: fillWorldAbout(record, box, el, remember) -> Promise<void>
// Imported by ui/cards.js when such a card is built, never at boot. The words (copy/en.cards.js worldAbout) come with it, so the
// card's first paint has none and this fills the hidden paragraph the card left; `remember(text)` hands the text back for Read aloud.
// The same file makes ui/cardfacts.js whyLine answer, which is what keeps the Wikipedia block away (ui/wikicard.js hasOwnWords).

import { COPY, t } from '../copy/en.js';
import { WORLD_ABOUT_PAGES } from '../copy/en.cards.js';
import { whyLine } from './cardfacts.js';

export async function fillWorldAbout(record, box, el, remember) {
  const text = whyLine(record);
  const pages = WORLD_ABOUT_PAGES[String(record.id || '').toLowerCase()];
  if (!text || !pages) return;
  remember(text);
  box.textContent = text;
  box.hidden = false;
  box.after(el('p', 'sr-card__note', t(COPY.worldAbout.source, { page: pages[0], path: pages[1] })));
}
