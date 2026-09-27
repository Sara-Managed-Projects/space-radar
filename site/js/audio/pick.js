// audio/pick.js -- the two pure decisions the sound layer makes (spec 0035 design §3, 2026-09-23).
//
// Contract export: pickFormat(row, canPlay) -> [url, twin]   which file to fetch first
//                  rungOf(stageId, isLadder) -> 'earth' | 'world' | 'sun' | 'ladder'
//                  RUNGS, OPUS_TYPE, AAC_TYPE
//
// Pure, so tests/test_audio.mjs reads them with no browser. Nothing here touches the network.

export const RUNGS = ['earth', 'world', 'sun', 'ladder'];

// The two encodings every row ships (spec 0035 req 7). Opus is the smaller file at the same
// quality and Chrome, Firefox and Edge all decode it; Safari before 18.4 answers "" for Ogg and
// gets the AAC twin. Asked of canPlayType once, because the answer does not change in a session.
export const OPUS_TYPE = 'audio/ogg; codecs="opus"';
export const AAC_TYPE = 'audio/mp4; codecs="mp4a.40.2"';

/**
 * The file to fetch first and the one to fall back to, as URLs relative to the page. The twin is
 * the fallback whichever way round, because canPlayType is a promise about <audio>, not about
 * decodeAudioData, and "maybe" is the answer a browser gives when it does not know either.
 */
export function pickFormat(row, canPlay) {
  if (!row) return [];
  const ask = typeof canPlay === 'function' ? canPlay : () => '';
  let opus = '';
  try { opus = String(ask(OPUS_TYPE) || ''); } catch { opus = ''; }
  const first = opus ? row.file : row.twin;
  const second = opus ? row.twin : row.file;
  return [first, second].filter(Boolean);
}

/**
 * Which bed a stage hears. The Earth and the Moon share one (the trip between them is one place
 * to the ear); the Sun's own stage is its own; a rung of the ladder is deep space; every other
 * world is "another world". A stage this does not know is a world, never silence by accident.
 */
export function rungOf(stageId, isLadder) {
  const id = String(stageId || '');
  if (id === 'earth' || id === 'moon') return 'earth';
  if (id === 'sun') return 'sun';
  if (typeof isLadder === 'function' && isLadder(id)) return 'ladder';
  return 'world';
}
