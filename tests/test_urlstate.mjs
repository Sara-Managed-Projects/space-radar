// tests/test_urlstate.mjs -- the URL is the state (spec 0032): one module owns every key of the
// hash, reads what it knows, writes only what it knows, and a stop is found by number or by id.
//
// `location` and `history` are stubbed: the module reads location.hash at call time and writes
// through history.replaceState, and nothing else, so two objects are the whole browser here.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');

let replaced = 0;
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = {
  replaceState(_state, _title, url) {
    replaced += 1;
    const i = url.indexOf('#');
    globalThis.location.hash = i >= 0 ? url.slice(i) : '';
  },
};
const setHash = (h) => { globalThis.location.hash = h; };

const { KEYS, VERSION, read, write, clear, stopIndex, readMoment, writeMoment, HASH_KEY } = await import(join(JS, 'ui/urlstate.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ------------------------------------------------------------------------------- the reads
check(HASH_KEY === 'm' && KEYS[0] === 'm' && VERSION === '1', 'the moment is still the first key, and this is format 1');

setHash('#m=now&trip=moon-landings&stop=3');
check(same(read(), { m: 'now', trip: 'moon-landings', stop: '3' }), `three keys read back: ${JSON.stringify(read())}`);

setHash('#now');
check(read().m === 'now', 'the legacy bare `#now` still reads as m=now');
setHash('#now/anything');
check(read().m === 'now', 'the very first build\'s `#now/anything` still reads as m=now');
setHash('#foo&m=next');
check(read().m === 'next', 'a keyed m wins over a bare word');
check(readMoment(['wonder', 'now', 'next']) === 'next', 'readMoment() still answers through read()');
setHash('#m=elsewhere');
check(readMoment(['wonder', 'now', 'next']) === null, 'a moment the app does not know reads as none');

setHash('#v=2&m=now&trip=moon-landings');
check(read().unknownVersion === true && read().m === 'now', 'v=2 marks the state unknown, and the keys are still returned');
setHash('#v=1&m=now');
check(!read().unknownVersion, 'v=1 is this format');
setHash('#m=now');
check(!('unknownVersion' in read()), 'no v at all is this format');

setHash('#m=now&foo=bar&at=iss');
check(!('foo' in read()) && read().at === 'iss', 'an unknown key is dropped on read, the known ones kept');

setHash('#t=2027-08-02T10%3A00%3A00Z&rate=60');
check(read().t === '2027-08-02T10:00:00Z' && read().rate === '60', `an encoded instant decodes: ${JSON.stringify(read())}`);
setHash('#at=100%');
check(read().at === '100%', 'a stray percent sign is a value, not an exception');

// ------------------------------------------------------------------------------ the writes
setHash('#m=now&trip=moon-landings&stop=3');
write({ stop: 4 });
check(location.hash === '#m=now&trip=moon-landings&stop=4', `write({stop: 4}) keeps m and trip: ${location.hash}`);

clear(['trip', 'stop']);
check(location.hash === '#m=now', `clear([trip, stop]) leaves #m=now: ${location.hash}`);

write({ t: '2027-08-02T10:00:00Z', rate: '60' });
check(location.hash === '#m=now&t=2027-08-02T10%3A00%3A00Z&rate=60', `an ISO t is encoded on write: ${location.hash}`);
check(read().t === '2027-08-02T10:00:00Z', 'and reads back as it was written');
write({ t: '2027-08-02T12:00:00+02:00' });
check(location.hash.includes('t=2027-08-02T12%3A00%3A00%2B02%3A00') && read().t === '2027-08-02T12:00:00+02:00', 'a plus sign survives the fragment');

setHash('#m=now&foo=bar');
write({ at: 'iss' });
check(location.hash === '#m=now&at=iss', `an unknown key already in the hash is not written back: ${location.hash}`);
write({ foo: 'bar', bar: 'baz' });
check(location.hash === '#m=now&at=iss', `a patch of unknown keys writes nothing: ${location.hash}`);
for (const key of Object.keys(read())) check(KEYS.includes(key), `read() returned a key outside KEYS: ${key}`);

setHash('#stop=5&trip=outer-solar-system&m=wonder');
write({ stage: 'sun', at: null });
check(location.hash === '#m=wonder&trip=outer-solar-system&stop=5&stage=sun', `keys come out in KEYS order whatever order they went in: ${location.hash}`);

setHash('#now');
writeMoment('wonder');
check(location.hash === '#m=wonder', `writeMoment() replaces the legacy bare word with the keyed form: ${location.hash}`);
setHash('#m=wonder&trip=moon-landings&stop=2');
writeMoment('now');
check(location.hash === '#m=now&trip=moon-landings&stop=2', `writeMoment() keeps the trip keys: ${location.hash}`);

setHash('#m=now&at=iss');
const before = replaced;
write({ at: 'iss' });
write({});
write(null);
check(replaced === before, 'writing what is already there touches history not at all');

write({ m: null, at: null });
check(location.hash === '' && replaced === before + 1, `clearing the last key drops the # itself: ${JSON.stringify(location.hash)}`);
write({ m: '' });
check(location.hash === '' && replaced === before + 1, 'an empty value is a removal, and removing from nothing writes nothing');

// ---------------------------------------------------------------------------- stopIndex()
const tour = { id: 'moon-landings', stops: [{ id: 'luna-9' }, { id: 'surveyor-1' }, { id: 'apollo-11' }, { id: 'the-moon' }] };
check(stopIndex(tour, '3') === 2, 'stop=3 is the third stop, index 2');
check(stopIndex(tour, 3) === 2, 'a number works as well as a string');
check(stopIndex(tour, 'apollo-11') === 2, 'a stop id resolves to the same index');
check(stopIndex(tour, '1') === 0 && stopIndex(tour, '4') === 3, 'the first and the last');
check(stopIndex(tour, '0') === -1 && stopIndex(tour, '5') === -1 && stopIndex(tour, '-1') === -1, 'off either end is -1');
check(stopIndex(tour, 'nope') === -1 && stopIndex(tour, '') === -1 && stopIndex(tour, null) === -1 && stopIndex(tour, undefined) === -1, 'nothing named is -1');
check(stopIndex(null, '1') === -1 && stopIndex({}, '1') === -1, 'no tour, no index');

if (problems.length) {
  console.error(`urlstate FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`urlstate ok: ${KEYS.length} keys read and written through one module, unknown keys dropped and never written, v=${VERSION} the only version known, a stop found by number or by id`);
