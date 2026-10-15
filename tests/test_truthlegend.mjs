// The truth on every card (internal spec 0076 W1-c; internal #908, #892, #884, #918, #798): the HUD tag
// says what draws by the shares, the card's row "How we know" opens the one legend of the honesty words,
// every photograph and other-light sky says when and with what it was taken (or that the date is not
// published), the deep sky's glossary terms are reachable from the card, and the Milky Way's card says
// what of it is measured and what inferred.
//
//   node tests/test_truthlegend.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// A small document, enough for the legend's builders: elements with a class, text and children.
class El {
  constructor(tag) { this.tagName = tag.toUpperCase(); this.className = ''; this.children = []; this._text = ''; this.parent = null; this.attrs = {}; }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  replaceChildren(...cs) { this.children = []; for (const c of cs) this.appendChild(c); }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  closest(sel) { let n = this; while (n) { if (sel === '.sr-card' && String(n.className).split(' ').includes('sr-card')) return n; n = n.parent; } return null; }
  contains(n) { while (n) { if (n === this) return true; n = n.parent; } return false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  all() { return [this, ...this.children.flatMap((c) => c.all())]; }
}
globalThis.document = { createElement: (tag) => new El(tag), createTreeWalker: (root) => {
  const texts = root.all().filter((n) => n._text).map((n) => ({ nodeValue: n._text, parent: n }));
  let i = -1;
  return { nextNode: () => { i += 1; return i < texts.length ? { nodeValue: texts[i].nodeValue, parentNode: texts[i].parent, ...texts[i] } : null; } };
} };

const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const facts = await import(join(JS, 'ui/cardfacts.js'));
const legend = await import(join(JS, 'ui/truthlegend.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { OTHER_LIGHT } = await import(join(JS, 'data/otherlight.js'));
const { DRAWN_CLASSES } = await import(join(JS, 'data/deepsky.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// --- 1. what draws now, by the shares (spec 0075 task 40) ----------------------------------------
const { drawnByShares, drawnNow } = facts;
const both = ['reconstruction', 'photograph', 'illustration'];
check(drawnByShares(both, ['reconstruction'], 1, 1) === 'photograph', 'on our line the photograph draws, and the tag says so (task 40)');
check(drawnByShares(both, ['reconstruction'], 0, 1) === 'reconstruction', 'turned off our line the hero draws: reconstructed');
check(drawnByShares(both, ['reconstruction'], 0, 0) === 'illustration', 'far away, neither: the glow and mark of its kind');
check(drawnByShares(both, ['reconstruction'], 0.3, 1) === 'reconstruction', 'the photograph fading out: the hero has the larger share');
check(drawnByShares(['photograph', 'illustration'], [], 0.8, 0) === 'photograph', 'a photograph with no hero');
check(drawnByShares(['illustration'], [], 1, 1) === 'illustration', 'a record with no photograph is never called one, whatever the scene reports');

const helix = { id: 'dso-helix-nebula', name: 'Helix Nebula', klass: 'dso', cls: 'measured', meta: { drawnClasses: ['photograph', 'illustration'], heroDrawn: ['reconstruction'], heroId: 'helix' } };
const scene = (photo, hero, ids = ['dso-helix-nebula']) => ({ nebulae: { drawn: () => photo }, deep: { heroShares: () => new Map(ids.map((id) => [id, hero])) } });
check(drawnNow(helix, scene(1, 1)) === 'photograph', `the Helix on our line: ${drawnNow(helix, scene(1, 1))}`);
check(drawnNow(helix, scene(0, 1)) === 'reconstruction', `the Helix turned: ${drawnNow(helix, scene(0, 1))}`);
check(drawnNow(helix, null) === 'reconstruction', 'with no scene (the light embed) the most three-dimensional class, as before');
const tarantula = { id: 'dso-tarantula-nebula', klass: 'dso', cls: 'measured', meta: { parent: 'dso-lmc', drawnClasses: ['photograph', 'illustration'], heroDrawn: ['model'] } };
check(drawnNow(tarantula, scene(0, 1, ['dso-lmc'])) === 'model', "a child drawn by its parent's hero takes the parent's share");
check(COPY.deepFacts.drawnTag[drawnNow(helix, scene(1, 1))] === '· photograph', 'the tag\'s suffix on our line is "· photograph"');
// The tag reads it: tagLines' suffix is drawnNow's, not the static first class.
const cardfactsSrc = readFileSync(join(JS, 'ui/cardfacts.js'), 'utf8');
check(/drawnTag\[drawnNow\(record, ctx\)\]/.test(cardfactsSrc), 'tagLines() names what draws now (drawnNow), not the most 3D class');

// --- 2. the Milky Way's words (internal #918) ------------------------------------------------------
const mw = { id: 'dso-milky-way', name: 'The Milky Way', klass: 'dso', cls: 'measured', propagator: 'static', meta: {} };
const mwLine = facts.honestyClause(mw, {});
check(/Measured:/.test(mwLine) && /Inferred:/.test(mwLine), `the Milky Way's card says what is measured and what is inferred: ${mwLine}`);
check(/few thousand light-years/.test(mwLine) && /bar/.test(mwLine) && /arms/.test(mwLine) && /far side/.test(mwLine), 'measured: the stars within a few thousand light-years, the bar and the arms; inferred: the far side');
check(!/illustrative glow and mark/.test(mwLine), 'the Milky Way is not "an illustrative glow and mark of its kind"');

// --- 3. when and with what (internal #892) --------------------------------------------------------
const { takenWords } = legend;
check(takenWords('2014') === '2014', 'a year');
check(takenWords('1997-09') === 'September 1997', `a month: ${takenWords('1997-09')}`);
check(takenWords('2012-06-05') === '5 June 2012', `a day: ${takenWords('2012-06-05')}`);
check(takenWords('2004..2006') === '2004 to 2006', `a span: ${takenWords('2004..2006')}`);
check(takenWords('') === null && takenWords('soon') === null && takenWords('2010-13') === null, 'nothing else is a date: the card then says it is not published');
for (const r of NEBULAE) {
  const o = r.observed || {};
  check(typeof o.by === 'string' && o.by.length >= 4, `${r.id}: the photograph names its telescope and camera (observed.by)`);
  check(takenWords(o.released) !== null, `${r.id}: the page's release date bounds when it was taken (observed.released)`);
  check(o.taken === undefined || takenWords(o.taken) !== null, `${r.id}: observed.taken "${o.taken}" is a date or a span`);
}
for (const b of OTHER_LIGHT) {
  const o = b.observed || {};
  check(typeof o.by === 'string' && o.by.includes(b.mission), `${b.id}: the sky in other light names its mission (observed.by)`);
  check(takenWords(o.taken) !== null, `${b.id}: the sky in other light says when it was taken`);
}

// --- 4. the legend's rows: the existing classes only ----------------------------------------------
const H = COPY.truth.hints;
const m42 = NEBULAE.find((r) => r.id === 'm42');
const card = { id: 'dso-m42', klass: 'dso', cls: 'measured', meta: { drawnClasses: ['photograph', 'illustration'] } };
const look = { ...scene(1, 0, []), look: () => 'measured', otherLight: { band: null } };
const L = legend.legendRows(card, look, {}, { picture: m42, text: 'Distance from the Sun 1 344 light-years. Its light left it 1 344 years ago.' });
const R = COPY.r12Truth.rows;
const row = (rows, k) => (rows.find((x) => x[0] === k) || [])[1];
check(row(L.here, R.where) === H.measured, 'On this card: where it is, in the honesty line\'s own word');
check(row(L.here, R.drawnNow) === H.photograph, 'On this card: what draws now');
check(row(L.here, R.photo) === 'VLT Survey Telescope, OmegaCAM', 'On this card: the photograph\'s telescope and camera');
check(row(L.here, R.taken) === COPY.r12Truth.notPublished, 'M42\'s page publishes no date: the card says so');
check(row(L.here, R.released) === '27 July 2017', 'and the page\'s own date');
check(row(L.here, R.look) === COPY.look.modes.measured, 'and the look it is drawn in');
const expected = [...['measured', 'inferred', 'illustrative', 'sample'].map((c) => H[c]), ...DRAWN_CLASSES.map((c) => H[c]), ...['measured', 'film'].map((k) => `${COPY.look.modes[k]} look`)];
check(JSON.stringify(L.words.map((w) => w[0])) === JSON.stringify(expected), `The words, everywhere: a position's four classes, the five drawn ones and the two looks, no other (${L.words.map((w) => w[0])})`);
check(L.words.every(([k, v]) => k && v && v.length <= 60), 'each word has one short meaning');
const ir = OTHER_LIGHT.find((b) => b.id === 'infrared');
const L2 = legend.legendRows({ id: 'mars', klass: 'world', cls: 'measured', meta: {} }, { look: () => 'film' }, {}, { band: ir });
check(row(L2.here, R.survey) && row(L2.here, R.survey).startsWith('WISE') && row(L2.here, R.taken) === '2010 to 2011', 'a sky in other light: its survey and when it was taken');
check(!L2.here.some((x) => x[0] === R.drawn), 'a world has no deep-sky drawn row');

// --- 5. the glossary (internal #884) --------------------------------------------------------------
const yaml = readFileSync(join(ROOT, 'registry/glossary.yaml'), 'utf8');
const yterms = new Map([...yaml.matchAll(/^\s+- \{term: ([^,]+), say: "((?:[^"\\]|\\.)*)"\}\s*$/gm)].map((mm) => [mm[1].trim(), mm[2]]));
for (const term of ['parsec', 'million light-years', 'billion light-years', 'lookback time', 'comoving distance']) {
  check(yterms.has(term), `registry/glossary.yaml explains "${term}"`);
  const g = COPY.r12Truth.glossary.find((x) => x.term === term);
  check(g && g.say === yterms.get(term), `copy/en.later.js r12Truth.glossary["${term}"] is glossary.yaml's sentence word for word`);
}
const terms = legend.termsIn('2 540 000 light-years. Its light left it 2.5 million years ago.').map((g) => g.term);
check(terms.includes('light-year') && terms.includes('lookback time') && terms.includes('million light-years'), `the card's own words send the reader to their terms: ${terms}`);
check(legend.termsIn('orbit orbits apogee perigee epoch elements magnitude azimuth elevation').length <= 6, 'at most six terms');
check(L.terms.some((g) => g.term === 'lookback time'), 'the legend lists the terms the card uses');

// --- 6. the row and its panel: the card's own parts, nothing new ------------------------------------
const tr = facts.truthRow(helix, scene(1, 1), {});
check(tr.label === COPY.truth.label && tr.hint === H.photograph, `the row is "${COPY.truth.label}", hinted with what draws now (${tr.hint})`);
const cardNode = new El('div'); cardNode.className = 'sr-card sr-float';
const name = new El('h1'); name.textContent = 'Orion Nebula 1 344 light-years'; cardNode.appendChild(name);
cardNode.appendChild(tr.panel);
await legend.fillLegend(tr.panel, card, look, {});
const classes = new Set(tr.panel.all().slice(1).map((n) => n.className).filter(Boolean));
const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
for (const c of classes) check(new RegExp(`\\.${c}\\b`).test(css), `the legend uses only the card's existing classes: .${c} is in site/css/ui.css`);
check(tr.panel.children.length >= 2 && tr.panel.children.every((n) => n.tagName === 'SECTION' && n.children[0].tagName === 'H3'), 'one section per group, each under its microlabel (the panel\'s gap falls between groups)');
check(/light-year:/.test(tr.panel.textContent), 'the card\'s own words are in its legend\'s glossary');
const cardsSrc = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/add\('truth', truth\.label, truth\.hint, truth\.panel\);[\s\S]{0,400}return more;\n}/.test(cardsSrc), 'ui/cards.js adds the row last, straight above the honesty line');
check(!/from '\.\/truthlegend\.js'/.test(cardsSrc + cardfactsSrc) && /import\('\.\/truthlegend\.js'\)/.test(cardfactsSrc), 'the legend is fetched when the row opens, never imported statically');

if (problems.length) {
  for (const p of problems) console.log(`::error::${p}`);
  process.exit(1);
}
console.log(`truth legend ok: the tag follows the shares, ${NEBULAE.length} photographs and ${OTHER_LIGHT.length} other-light skies say when and with what, the Milky Way says what is measured and what inferred, five deep-sky terms match the glossary, and the legend is the card's own parts`);
