// ui/cardtrain.js -- the card's rows of the research train (forge #544, #547, #548; the awesome-space research of
// 2026-11-23), fetched by ui/cards.js only for a card that has one, so the card (and the embed that carries it) pays
// nothing for them elsewhere.
//
// Contract: trainRow(kind, record, ctx, api) -> a row that opens in place (ui/cards.js disclosure), or null
//   kind  'release'        a catalogue's day on its object's card (ui/releaseday.js): Gaia DR4 on Gaia's; open by itself,
//                          since the top bar's chip opens the card for it, and one the visitor shut stays shut
//         'camera'         the station's live camera (ui/isscam.js), built the first time the row is opened
//         'space-weather'  NOAA's Kp measured and forecast, what a storm does, the aurora layer (ui/spacepanel.js)
//   api   { disclosure, panelOf, el, rid, isOpen, setOpen }: the card's own pieces, so the rows are the card's rows

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.live.js';
import { releaseFor, releaseSection } from './releaseday.js';

const releaseShut = new Set();

/** A row whose panel a module fills the first time it is opened. */
function later(id, label, hint, fill, { disclosure, panelOf, el, rid, isOpen, setOpen }) {
  const box = el('div', `sr-later sr-later--${id}`);
  const mount = () => { if (box.dataset.mounted) return; box.dataset.mounted = '1'; fill(box).catch(() => { box.dataset.mounted = ''; }); };
  const openNow = isOpen(rid, id);
  const node = disclosure(id, label, hint, panelOf([box]), openNow, (on) => { setOpen(rid, id, on); if (on) mount(); });
  if (openNow) mount();
  return node;
}

export function trainRow(kind, record, ctx, api) {
  const { disclosure, el, rid } = api;
  if (kind === 'release') {
    const nowMs = ctx && ctx.timePill && typeof ctx.timePill.anchor === 'function' ? ctx.timePill.anchor() : Date.now();
    const release = releaseFor(record, nowMs);
    const rel = release ? releaseSection(release, nowMs, el) : null;
    if (!rel) return null;
    return disclosure(`release-${release.id}`, rel.label, rel.hint, rel.panel, !releaseShut.has(rid), (on) => { if (on) releaseShut.delete(rid); else releaseShut.add(rid); });
  }
  if (kind === 'camera') {
    const C = COPY.issCam;
    return later('camera', C.section, C.hint, (box) => import('./isscam.js').then((mod) => mod.mountCameraRow(box, record, ctx)), api);
  }
  if (kind === 'space-weather') {
    const P = COPY.spacePanel;
    const sw = ctx && ctx.spaceWeather && ctx.spaceWeather.parsed;
    const kpNow = sw && Number.isFinite(sw.observedKp) ? sw.observedKp : null;
    return later('space-weather', P.section, kpNow !== null ? t(P.hintKp, { kp: fmt.smart(kpNow) }) : P.hintNone,
      (box) => import('./spacepanel.js').then((mod) => mod.mountSpacePanel(box, ctx)), api);
  }
  return null;
}
