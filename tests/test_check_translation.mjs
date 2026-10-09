// The translation checker (scripts/check-translation.mjs) says what is wrong, and passes a copy of
// English. A check that cannot fail is not a check: each rule is broken on purpose below.
import { compare, check, skeleton } from '../scripts/check-translation.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const en = { a: 'Hello {name}', b: { c: 'Close', d: 'Open {n} of {m}' }, e: ['one', 'two'] };
const none = () => ({ missing: [], extra: [], kind: [], placeholder: [], untouched: [] });

let r = compare(en, JSON.parse(JSON.stringify(en)), '', none());
assert.deepEqual([r.missing, r.extra, r.kind, r.placeholder], [[], [], [], []], 'a copy of English is complete');

r = compare(en, { a: 'Bonjour {name}', b: { c: 'Fermer' }, e: ['un', 'deux'] }, '', none());
assert.deepEqual(r.missing, ['b.d'], 'a missing key is named with its path');

r = compare(en, { a: 'Bonjour', b: { c: 'Fermer', d: 'Ouvrir {n} sur {x}' }, e: [] }, '', none());
assert.deepEqual(r.placeholder.sort(), ['a: {name} is missing', 'b.d: {m} is missing', 'b.d: {x} is not in the English'].sort(), 'a lost or invented slot is named');

r = compare(en, { a: 'Hi {name}', b: 'Close', e: ['x'], z: 'extra' }, '', none());
assert.equal(r.kind.length, 1, 'text where English has a group is a kind error');
assert.deepEqual(r.extra, ['z'], 'an unknown key is extra');

// End to end: English against itself passes; English with one string removed fails.
const dir = mkdtempSync(join(tmpdir(), 'tr-'));
writeFileSync(join(dir, 'same.mjs'), `
  import { COPY, GLOSSARY } from ${JSON.stringify(new URL('../site/js/copy/en.js', import.meta.url).href)};
  import ${JSON.stringify(new URL('../site/js/copy/en.later.js', import.meta.url).href)};
  export { COPY, GLOSSARY };`);
assert.equal((await check(join(dir, 'same.mjs'))).failed, false, 'English passes against itself');
writeFileSync(join(dir, 'short.mjs'), `
  import { COPY as E, GLOSSARY } from ${JSON.stringify(new URL('../site/js/copy/en.js', import.meta.url).href)};
  import ${JSON.stringify(new URL('../site/js/copy/en.later.js', import.meta.url).href)};
  const COPY = structuredClone(E); delete COPY.app.name;
  export { COPY, GLOSSARY };`);
const short = await check(join(dir, 'short.mjs'));
assert.equal(short.failed, true);
assert.deepEqual(short.out.missing, ['COPY.app.name'], 'one removed string is found');
// The starting file it writes is complete English (so it passes), and every string is untouched.
writeFileSync(join(dir, 'fr.mjs'), await skeleton('fr'));
const sk = await check(join(dir, 'fr.mjs'));
assert.equal(sk.failed, false, 'the skeleton has every key and every slot');
assert.ok(sk.out.untouched.length > 1000, 'and says that nothing is translated yet');
assert.equal((await check(join(dir, 'fr.mjs'), true)).failed, true, '--strict refuses an untranslated file');
console.log('translation checker ok');
