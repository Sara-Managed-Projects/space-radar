// tests/test_cardvoice.mjs -- the baked Wikipedia cards read aloud in the trips' Kokoro voice (forge #151; release 2.0.0
// batch c2-deep): site/audio/cards/en/, ui/wikicard.js cardHash and clipFor, scripts/narrate-cards.py --check.
//
//   node tests/test_cardvoice.mjs
//
// What it holds:
//   1. ONE HASH: ui/wikicard.js cardHash is scripts/narrate-cards.py card_hash, on plain text and on the leads with
//      accents, dashes, IPA and a character outside the basic plane; clipFor finds a clip only for exactly its text.
//   2. THE FILES: every baked English card has a clip of its present text or a reason it has none; each clip's Opus,
//      AAC and captions are there at the index's sizes, its captions are the card's sentences, and a recogniser heard it;
//      nothing else is in the folder. The index names the voice and the text's licence.
//   3. SMALL, AND ONLY ON PRESS: the clips are under `card_voice_total_kb`, each under the trips' `narration_trip_kb`
//      share; no module of the first visit names site/audio/cards (ui/wikicard.js, which a card's About it imports, does).
//   4. THE GUARD: `python3 scripts/narrate-cards.py --check` passes, and the script answers --help.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = await import(join(ROOT, 'site/js/ui/wikicard.js'));
const DIR = join(ROOT, 'site/audio/cards/en');
const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(ROOT, 'site/data/wikicards/en.json'), 'utf8')).cards;
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1. one hash
const samples = ['Algol', 'Messier 52 — NGC 7654, −0.05 ± 0.01 (/ˈsɪriəs/)', 'Ophiuchus 𝔐 Éé', cards.sun.x, cards['dso-m52'].x];
const py = spawnSync('python3', ['-c', `import sys, json, importlib.util
spec = importlib.util.spec_from_file_location('nc', ${JSON.stringify(join(ROOT, 'scripts/narrate-cards.py'))}); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(json.dumps([m.card_hash(t) for t in json.load(sys.stdin)]))`], { input: JSON.stringify(samples), encoding: 'utf8' });
const pyHashes = py.status === 0 ? JSON.parse(py.stdout) : [];
check(py.status === 0, `narrate-cards.py card_hash ran: ${py.stderr.slice(-300)}`);
samples.forEach((s, i) => check(W.cardHash(s) === pyHashes[i], `cardHash agrees with card_hash on sample ${i}`));
const someKey = Object.keys(index.clips)[0];
check(!!W.clipFor(index, someKey, cards[someKey].x), 'clipFor finds a clip for its exact text');
check(!W.clipFor(index, someKey, `${cards[someKey].x} `), 'and not for a text one character longer');
check(!W.clipFor(null, someKey, 'x') && !W.clipFor(index, 'no-such-card', 'x'), 'no index or no clip: null');

// 2. the files
check(index.voice === 'af_heart' && /CC BY-SA 4\.0/.test(index.text) && /Kokoro-82M/.test(index.credit), 'the index names the voice and the text\'s licence');
for (const key of Object.keys(cards)) check(index.clips[key] || index.skipped[key], `${key}: a clip or a reason`);
let total = 0;
let largest = 0;
for (const [key, row] of Object.entries(index.clips)) {
  check(cards[key] && row.h === W.cardHash(cards[key].x), `${key}: the clip says the card's present text`);
  for (const ext of ['opus', 'm4a', 'vtt']) {
    let size = -1;
    try { size = statSync(join(DIR, `${key}.${ext}`)).size; } catch { /* missing */ }
    check(size === row[ext], `${key}.${ext} is the index's ${row[ext]} B (${size})`);
    total += Math.max(0, size);
  }
  largest = Math.max(largest, row.opus);
  check(Number.isFinite(row.wer) && row.wer <= 0.08, `${key}: heard by a recogniser, word error ${row.wer}`);
  const vtt = readFileSync(join(DIR, `${key}.vtt`), 'utf8');
  check(vtt.startsWith('WEBVTT') && (vtt.match(/-->/g) || []).length >= 1, `${key}: captions`);
}
for (const f of readdirSync(DIR)) check(f === 'index.json' || index.clips[f.replace(/\.(opus|m4a|vtt)$/, '')], `${f} is in the index`);

// 3. small, and only on press
const gate = Number((/id: card_voice_total_kb, value: (\d+)/.exec(budgets) || [])[1]);
const tripGate = Number((/id: narration_trip_kb, value: (\d+)/.exec(budgets) || [])[1]);
check(gate > 0 && total / 1000 <= gate, `the clips are ${(total / 1000).toFixed(0)} kB, within card_voice_total_kb (${gate})`);
check(tripGate > 0 && largest / 1000 < tripGate / 4, `the largest clip is ${(largest / 1000).toFixed(0)} kB of Opus, a quarter of a trip's share at most`);
const boot = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(!/audio\/cards/.test(boot), 'main.js names no card clip');
check(/audio\/cards\/en\//.test(readFileSync(join(ROOT, 'site/js/ui/wikicard.js'), 'utf8')), 'ui/wikicard.js fetches them, on a press');

// 4. the guard
const guard = spawnSync('python3', [join(ROOT, 'scripts/narrate-cards.py'), '--check'], { encoding: 'utf8' });
check(guard.status === 0, `narrate-cards.py --check: ${(guard.stdout + guard.stderr).trim().slice(0, 600)}`);
const help = spawnSync('python3', [join(ROOT, 'scripts/narrate-cards.py'), '--help'], { encoding: 'utf8' });
check(help.status === 0 && /usage/.test(help.stdout), 'narrate-cards.py answers --help');

if (problems.length) { console.error(`cardvoice: ${problems.length} problem(s)\n  ${problems.slice(0, 40).join('\n  ')}`); process.exit(1); }
console.log(`cardvoice ok: ${Object.keys(index.clips).length} cards in the trips' voice, ${Object.keys(index.skipped).length} on the device's; ${(total / 1000).toFixed(0)} kB with the twins and captions`);
