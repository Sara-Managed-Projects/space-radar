// Render tools/shape-sheet.html in headless Chrome and write the result as a PNG.
//
//   python3 tools/serve.py . 8190 &
//   node tools/sheet-png.mjs 'http://127.0.0.1:8190/tools/shape-sheet.html?m=telescope:gaia' out.png
//
// The sheet leaves its canvas on `window.__sheet.dataUrl`, so no screenshot is involved and the
// image is exactly the WebGL buffer.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [url, out] = process.argv.slice(2);
if (!url || !out) { console.error('usage: node tools/sheet-png.mjs <sheet url> <out.png>'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const probe = join(mkdtempSync(join(tmpdir(), 'sheet-')), 'probe.js');
writeFileSync(probe, `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!window.__ready && !window.__err && Date.now() - t0 < 90000) await wait(200);
if (!window.__ready) return { ready: false, err: String(window.__err || 'timed out') };
return window.__sheet;`);
const json = execFileSync(process.execPath, [join(here, 'cdp.mjs'), url, probe, '--width=1100', '--height=800'], { maxBuffer: 64 * 1024 * 1024 }).toString();
const val = JSON.parse(json);
if (!val || !val.dataUrl) { console.error('the sheet did not render:', JSON.stringify(val).slice(0, 300)); process.exit(1); }
writeFileSync(out, Buffer.from(val.dataUrl.split(',')[1], 'base64'));
console.log(`wrote ${out}: ${val.labels.join(', ')}`);
