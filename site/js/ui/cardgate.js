// The card, asked for when the first thing is chosen -- not at boot (2026-10-06, internal #405).
//
// WHY. ui/cards.js and what only it imports were 188 kB of a first visit that opens no card: the
// first screen is the Earth and a row of dots, and the card is what a tap on one of them brings up.
// This file is what the boot graph imports instead. It has the card's three boot-time calls
// (showCard, hideCard, tagLines) and fetches the real module on the first showCard(), or when
// main.js warms it in an idle moment after the layers settle, whichever comes first.
//
//   showCard(record, ctx, opts)   the card's own call; before the module is here, the LAST request
//                                 is kept and shown the moment it lands (a second selection made
//                                 while it loads replaces the first, as it would on screen)
//   hideCard()                    drops a waiting request too
//   tagLines(record, ctx, m)      the tracked object's three lines (ui/hud.js, the planets list);
//                                 null until the module is here, and it never fetches: both callers
//                                 repaint, and a tag is only wanted once something is selected
//   wantCards()                   -> Promise<module | null>; null when it could not be fetched
//                                 (asked again on the next call)
//   wantFacts()                   the same for ui/cardfacts.js ALONE: the tag's lines without the
//                                 card. The light embed asks for this and never for the card
//                                 (internal #429); once either module is here tagLines() answers
//
// A module that is itself loaded later (the trip, the share sheet, photo mode, the print composer)
// imports ui/cards.js directly: it is past the first visit, and wants the card synchronously.

let mod = null;
let asked = null;
let waiting = null;

export function wantCards() {
  if (mod) return Promise.resolve(mod);
  if (!asked) {
    asked = import('./cards.js').then((m) => { mod = m; return m; }).catch((e) => {
      asked = null;
      console.warn('the card did not load', e && e.message);
      return null;
    });
  }
  return asked;
}

export function showCard(record, ctx, opts = {}) {
  if (mod) { waiting = null; return mod.showCard(record, ctx, opts); }
  // Nothing to show is hideCard(), as in the module itself, and needs no module.
  if (!record && !(opts && opts.lead)) { waiting = null; return undefined; }
  waiting = { record, ctx, opts };
  wantCards().then((m) => {
    if (!m || !waiting) return;
    const w = waiting;
    waiting = null;
    m.showCard(w.record, w.ctx, w.opts);
  });
  return undefined;
}

export function hideCard() {
  waiting = null;
  if (mod) mod.hideCard();
}

let facts = null;
let factsAsked = null;

export function wantFacts() {
  if (facts) return Promise.resolve(facts);
  if (!factsAsked) {
    factsAsked = import('./cardfacts.js').then((m) => { facts = m; return m; }).catch((e) => {
      factsAsked = null;
      console.warn('the tag\'s lines did not load', e && e.message);
      return null;
    });
  }
  return factsAsked;
}

export function tagLines(record, ctx, m) {
  const from = mod || facts;
  return from ? from.tagLines(record, ctx, m) : null;
}
