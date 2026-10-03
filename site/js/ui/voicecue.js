// ui/voicecue.js -- the sentence the voice is saying, lit in the stop card (spec 0069).
//
// Contract export: cueRange(body, cue) -> [start, end] | null, pure
//                  paintCue(node, cue)   light `cue` inside `node`'s text, or clear it
//                  HIGHLIGHT
//
// THE CAPTIONS ARE THE CARD. The voice reads the stop's own words (scripts/narrate.py), so there
// is no second caption track to draw: the words are already on screen, and this marks which
// sentence is being said, from the clip's WebVTT timings (audio/narration.js cue()).
//
// WITH THE CSS CUSTOM HIGHLIGHT API, SO THE CARD'S DOM IS NOT TOUCHED. ui/cards.js writes the
// stop's body as one paragraph of text and repaints it when it likes; wrapping a sentence in a
// span would be a second writer of that paragraph. A Highlight is a range painted by the browser
// (css/ui.css `::highlight(sr-voice)`): nothing is inserted, a repaint of the card simply drops it
// and the next frame puts it back. A browser without the API (Firefox before 140) shows the card
// as it always was, which is the fallback the spec asks for: the words, unlit.

export const HIGHLIGHT = 'sr-voice';

/** Where `cue` sits in `body`, as [start, end) character offsets, or null when it is not there. */
export function cueRange(body, cue) {
  const text = String(body || '');
  const want = String(cue || '').trim();
  if (!text || !want) return null;
  const at = text.indexOf(want);
  return at === -1 ? null : [at, at + want.length];
}

let lastNode = null;
let lastCue = '';
let lastText = '';

export function paintCue(node, cue) {
  const registry = typeof CSS !== 'undefined' && CSS.highlights ? CSS.highlights : null;
  if (!registry || typeof Highlight !== 'function' || typeof Range !== 'function') return false;
  const leaf = node && node.firstChild && node.firstChild.nodeType === 3 ? node.firstChild : null;
  const text = leaf ? leaf.data : '';
  const want = cue || '';
  // Called every frame while a stop is up; the work is done only when something changed.
  if (leaf === lastNode && want === lastCue && text === lastText) return registry.has(HIGHLIGHT);
  lastNode = leaf;
  lastCue = want;
  lastText = text;
  const span = cueRange(text, want);
  if (!span) {
    registry.delete(HIGHLIGHT);
    return false;
  }
  const range = new Range();
  range.setStart(leaf, span[0]);
  range.setEnd(leaf, span[1]);
  registry.set(HIGHLIGHT, new Highlight(range));
  return true;
}
