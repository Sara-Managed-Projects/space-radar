// tests/test_printcard.mjs -- the screen as a printable postcard (ui/printcompose.js; spec 0061 task 8
// shows it in the share sheet and saves it from there and from the card's Postcard).
//
// Ivan, 2026-09-28: "postcards of space on click, where current screen will be as postcard which is
// possible to print then (could be downloaded in PDF or JPEG)". Asserted: the print size is the
// 6 x 4 in postcard at 300 dpi in the screen's orientation; the caption names the selection, else the
// trip, else the app, and always the instant; and the hand-written PDF is well formed -- every xref
// offset lands on its object, startxref on the table, the JPEG goes in byte for byte, and the page
// is exactly 6 x 4 in.
//
//   node tests/test_printcard.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const { printSize, caption, pdfFromJpeg } = await import(join(ROOT, 'site/js/ui/printcompose.js'));

const land = printSize(16 / 9);
check(land.w === 1800 && land.h === 1200 && land.ptW === 432 && land.ptH === 288 && !land.portrait, `landscape is 1800 x 1200 px on 432 x 288 pt (${JSON.stringify(land)})`);
const port = printSize(390 / 844);
check(port.w === 1200 && port.h === 1800 && port.ptW === 288 && port.ptH === 432 && port.portrait, 'a portrait phone gets the portrait postcard');
check(printSize(NaN).w === 1800, 'an unknown aspect is landscape');

const clock = { now: () => Date.UTC(2027, 7, 2, 10, 6, 35) };
const a = caption({ clock }, { id: 'europa', name: 'Europa' }, null);
check(a.title === 'Europa' && a.when === '2027-08-02, 10:06 UTC' && a.mark === 'spaceradar.ai', `a selection names itself and the instant (${JSON.stringify(a)})`);
const b = caption({ clock }, null, { phase: 'dwell', tourTitle: 'Chasing the solar eclipse', stopTitle: 'The shadow on the ground' });
check(/Chasing the solar eclipse/.test(b.title) && /The shadow on the ground/.test(b.title), `a trip names the trip and its stop (${b.title})`);
const c = caption({ clock }, null, { phase: 'idle', tourTitle: 'Old trip' });
check(c.title === 'Space Radar', 'no selection and no running trip: the app');

// A fake JPEG: SOI, some bytes that look like binary, EOI.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
const pdf = pdfFromJpeg(jpeg, 1800, 1200, 432, 288);
const text = Buffer.from(pdf).toString('latin1');
check(text.startsWith('%PDF-1.4\n'), 'a PDF 1.4 header');
check(text.includes('/MediaBox [0 0 432 288]'), 'the page is 6 x 4 in');
check(text.includes('/Width 1800 /Height 1200') && text.includes('/Filter /DCTDecode') && text.includes(`/Length ${jpeg.length}`), 'the image is the JPEG as it is, at its pixel size');
check(Buffer.from(pdf).indexOf(Buffer.from(jpeg)) > 0, 'the JPEG bytes are embedded unchanged');
const xrefAt = text.lastIndexOf('\nxref\n') + 1; // not the 'xref' inside 'startxref'
const sx = /startxref\n(\d+)\n%%EOF\n$/.exec(text);
check(sx && Number(sx[1]) === xrefAt, `startxref points at the table (${sx && sx[1]} vs ${xrefAt})`);
const rows = text.slice(xrefAt).split('\n').slice(3, 8);
rows.forEach((row, i) => {
  const off = Number(row.slice(0, 10));
  check(text.slice(off, off + `${i + 1} 0 obj`.length) === `${i + 1} 0 obj`, `xref row ${i + 1} lands on object ${i + 1}`);
});
const drawLen = /5 0 obj\n<< \/Length (\d+) >>\nstream\n([^\n]*)\nendstream/.exec(text);
check(drawLen && Number(drawLen[1]) === drawLen[2].length && drawLen[2] === 'q 432 0 0 288 0 0 cm /Im0 Do Q', 'the page draws the image over the whole page, and says its own length');

const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
check(/PDF/.test(COPY.share.pdf) && /JPEG/.test(COPY.share.jpeg), 'the share sheet offers both formats');
const named = caption({ clock }, { id: 'sat-25544', name: 'ISS (ZARYA)' }, null, 'International Space Station');
check(named.title === 'International Space Station', `the caption is the card's name, not the catalogue's (${named.title})`);

if (problems.length) { console.error('printcard FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('printcard ok: a 6 x 4 in postcard at 300 dpi in the screen\'s orientation, captioned with what it shows and when, as a JPEG or a well-formed one-page PDF');
