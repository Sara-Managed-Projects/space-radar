// ui/otherlight.js -- "Other light" in What to show: the sky in infrared, microwaves or gamma rays,
// and a slider between it and the visible sky (public #456; internal #283, #284).
//
// Contract: otherLightPanel(ctx) -> HTMLElement (with .destroy())
//
// One more settings row in a place that already exists (docs/ui-guide.md principle 2), under the
// shutter and built from the same classes as it (ui/exposure.js, ui/density.js): a row of choices,
// the chosen one pressed and bracketed, one line under them. The one new control is the slider,
// a native range input, shown only while a band is chosen.
//
// The line under the row is the honest one, said where the choice is made: which light this is
// and that its colours are not colours an eye could see. The credit is a link to the mission's own
// page; the tiles are CDS's.
//
// TWO LIGHTS (forge #565). Under the slider, a second row says where the slider starts: the visible
// sky, or another band (2MASS's near infrared against WISE's mid infrared is the one the research
// asked for). Blink jumps the slider to its other end. Nothing moves by itself, so there is nothing
// for reduced motion to stop. The line under the row then says why the two lights differ.
//
// The state is main.js's `ctx.otherLight` ({ band, mix, under, set(), onChange() }); choosing a band there
// is what imports scene/otherlight.js and fetches the band's picture. Nothing is remembered
// between visits: the visible sky is the sky.
import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { OTHER_LIGHT } from '../data/otherlight.js';
import { sr } from './platform-bridge.js';

export function otherLightPanel(ctx) {
  const C = COPY.otherLight;
  const ol = ctx.otherLight;
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-density sr-exposure sr-otherlight';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = C.panelTitle;
  wrap.appendChild(title);
  const row = document.createElement('div');
  row.className = 'ui-seg ui-seg--block';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', C.panelTitle);
  const buttons = new Map();
  for (const id of ['visible', ...OTHER_LIGHT.map((b) => b.id)]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-seg__btn';
    b.textContent = C.bands[id] || id;
    b.title = C.colours[id] || C.notes[id] || '';
    b.dataset.band = id;
    b.addEventListener('click', () => {
      const was = ol.band;
      ol.set(id === 'visible' ? null : id, id === 'visible' ? ol.mix : (ol.mix > 0.05 ? ol.mix : 1));
      if (ol.band !== was) sr('track', 'layer_toggle', { layer: `otherlight-${ol.band || was}`, on: !!ol.band });
    });
    buttons.set(id, b);
    row.appendChild(b);
  }
  wrap.appendChild(row);

  const mixRow = document.createElement('label');
  mixRow.className = 'sr-otherlight__mix';
  const from = document.createElement('span');
  from.className = 'sr-otherlight__end';
  from.textContent = C.bands.visible;
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'ui-range';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  const to = document.createElement('span');
  to.className = 'sr-otherlight__end';
  mixRow.append(from, slider, to);
  slider.addEventListener('input', () => ol.set(ol.band, Number(slider.value) / 100));
  wrap.appendChild(mixRow);

  // Where the slider starts: the visible sky or another band. The same row style as the slider's.
  const fromRow = document.createElement('div');
  fromRow.className = 'sr-otherlight__mix';
  const fromWord = document.createElement('span');
  fromWord.className = 'sr-otherlight__end';
  fromWord.textContent = C.fromLabel;
  const fromSeg = document.createElement('div');
  fromSeg.className = 'ui-seg';
  fromSeg.setAttribute('role', 'group');
  fromSeg.setAttribute('aria-label', C.fromGroup);
  const fromButtons = new Map();
  for (const id of ['visible', ...OTHER_LIGHT.map((b) => b.id)]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-seg__btn';
    b.textContent = C.bands[id] || id;
    b.dataset.under = id;
    b.addEventListener('click', () => ol.set(ol.band, ol.mix, id === 'visible' ? null : id));
    fromButtons.set(id, b);
    fromSeg.appendChild(b);
  }
  fromRow.append(fromWord, fromSeg);
  wrap.appendChild(fromRow);
  const blink = document.createElement('button');
  blink.type = 'button';
  blink.className = 'ui-btn ui-btn--secondary ui-btn--sm';
  blink.textContent = C.blink;
  blink.title = C.blinkTitle;
  blink.addEventListener('click', () => ol.set(ol.band, ol.mix >= 0.5 ? 0 : 1));
  mixRow.appendChild(blink);

  const note = document.createElement('p');
  note.className = 'sr-density__note';
  wrap.appendChild(note);
  const credit = document.createElement('p');
  credit.className = 'sr-density__note sr-otherlight__credit';
  const link = document.createElement('a');
  link.target = '_blank';
  link.rel = 'noopener';
  // Two bands, two credits: the one beneath is named after the one on top.
  const and = document.createElement('span');
  const link2 = document.createElement('a');
  link2.target = '_blank';
  link2.rel = 'noopener';
  and.append(document.createTextNode(C.creditAnd), link2);
  credit.append(document.createTextNode(C.creditLead), link, and, document.createTextNode(C.creditTail));
  wrap.appendChild(credit);

  let poll = 0;
  const paint = () => {
    const id = ol.band || 'visible';
    const band = OTHER_LIGHT.find((b) => b.id === ol.band) || null;
    for (const [k, b] of buttons) {
      b.setAttribute('aria-pressed', k === id ? 'true' : 'false');
    }
    mixRow.hidden = !band;
    fromRow.hidden = !band;
    credit.hidden = !band;
    const under = band && ol.under ? OTHER_LIGHT.find((b) => b.id === ol.under) || null : null;
    for (const [k, b] of fromButtons) {
      b.hidden = !!band && k === band.id;
      b.setAttribute('aria-pressed', k === (under ? under.id : 'visible') ? 'true' : 'false');
    }
    if (band) {
      const pct = Math.round(ol.mix * 100);
      if (Number(slider.value) !== pct) slider.value = String(pct);
      const name = C.bands[band.id] || band.id;
      const fromName = C.bands[under ? under.id : 'visible'] || '';
      from.textContent = fromName;
      to.textContent = name;
      slider.setAttribute('aria-label', under ? t(C.mixLabelFrom, { from: fromName, band: name }) : t(C.mixLabel, { band: name }));
      slider.setAttribute('aria-valuetext', t(C.mixValue, { pct, band: name }));
      link.href = band.terms;
      link.textContent = band.credit;
      and.hidden = !under;
      if (under) { link2.href = under.terms; link2.textContent = under.credit; }
    }
    // One line: what is on its way, what failed, or what this light is.
    const st = band && ol.layer && typeof ol.layer.state === 'function' ? ol.layer.state() : null;
    const waiting = !!band && (!st || (st.wanted === band.id && st.state === 'loading'));
    // Two bands: why they differ, said once (the pair's own sentence, or the general one).
    const why = band && under ? (C.whyPair[`${under.id}_${band.id}`] || C.whyPair[`${band.id}_${under.id}`] || C.whyAny) : '';
    note.textContent = band && st && st.state === 'failed' && st.band !== band.id ? C.failed : waiting ? C.loading : why || C.notes[id] || '';
    clearTimeout(poll);
    if (waiting) poll = setTimeout(paint, 400);
  };
  const off = ol.onChange(paint);
  paint();
  wrap.destroy = () => { off(); clearTimeout(poll); };
  return wrap;
}
