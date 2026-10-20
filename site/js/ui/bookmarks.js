// ui/bookmarks.js -- arrival views: where the camera stood, kept as a link (internal i#882, SR-PLAN-081;
// release 1.3.0 stage W3-e).
//
// Contract: viewsPanel(ctx, { record, storage?, base? }) -> HTMLElement   the body of the share sheet's row
//           "Arrival views"; .refresh(), .destroy()
// Also exported, pure, for tests/test_bookmarks.mjs:
//   CURATED_WORLDS, CURATED_KINDS                    the authored poses and the worlds they are made for
//   curatedFor(record, radiusOf)                     the views offered for a record: [{ id, at, stage, cam, kind, name }]
//   viewOf(record, pose, stageId)                    a view of a record from a camera pose (ui/urlstate.js camValue), or null
//   viewLink(view, base)                             the link that opens it: `#v=1&build=..&at=..&stage=..&cam=..`
//   viewKey(view)                                    the id a saved view is kept under
//   readSaved(storage), writeSaved(storage, list), addSaved(list, view), removeSaved(list, id)   at most MAX_SAVED, never throwing
//
// A DIRECT LINK, NOT A NEW FORMAT. An arrival view is the keys the address already has: `at` (what), `stage` (which
// map) and `cam` (where the camera stands round it: ui/urlstate.js camValue, public #397). Nothing is added to
// KEYS and nothing collides with `go` or `imagine` (tests/test_urlstate.mjs holds that). Opening a view is writing
// that address: main.js's own hashchange handler (public #331) then flies to the thing, changes the stage if it must,
// and, when the flight has landed, stands the camera at the pose. So a view, a link from the share sheet and a pasted
// address are one path, and "reproducible" is whatever the address reproduces.
//
// TWO KINDS, BOTH SAID PLAINLY.
//   FROM THE SHEET: two poses for each planet, authored here: from above the plane of the planets, and level with it.
//   The scene's axes are the ecliptic's for every planet (scene/stage.js: +Y is the ecliptic's north in the frame
//   the planets are in), so "polar 12" is looking down on the north side of that plane and "polar 90" is the
//   plane itself, and the distance is five radii, from the world's own radius (registry/compare.yaml, NASA's fact
//   sheet). They are views the camera takes, not measurements of the planet: the row says "From above the plane of
//   the planets" and not what is seen. Mars, Jupiter, Saturn, Uranus and Neptune have no more than these.
//   SAVED HERE: the view the camera has now, kept in this browser (localStorage `sr:arrival-views`, twelve at most), for
//   the thing that is selected. Never sent anywhere, never counted, and not in a link unless the visitor copies it.
//
// NOT AT BOOT: ui/sharesheet.js imports this when its sheet opens; the sheet is itself a dynamic import.
import { COPY, fmt, t } from '../copy/en.js';
import '../copy/en.later.js';
import { camValue, parseCam, DEFAULT_STAGE, VERSION, BUILD } from './urlstate.js';

export const SAVED_KEY = 'sr:arrival-views';
export const MAX_SAVED = 12;
/** The worlds the authored poses are made for: the planets, whose stage is drawn in the ecliptic's own axes. */
export const CURATED_WORLDS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
/**
 * The poses, in degrees round the target and in the world's own radii. `az` is where round the pole the camera stands (0 is
 * scene +Z); `polar` is the angle from the ecliptic's north (12 is nearly overhead, 90 is in the plane). Five radii is a
 * distance at which a planet fills about a third of the view's height.
 */
export const CURATED_KINDS = {
  above: { az: 20, polar: 12, radii: 5 },
  inPlane: { az: 20, polar: 90, radii: 5 },
};

/** The kilometres a world's radius is, or 0. `rows` is data/compare.js COMPARE_BODIES. Pure. */
export function radiusFrom(rows, id) {
  const row = (Array.isArray(rows) ? rows : []).find((r) => r && r.world === id);
  return row && Number(row.radius_km) > 0 ? Number(row.radius_km) : 0;
}

/** The id a view is kept under: the thing and the pose, so the same view is never kept twice. */
export function viewKey(view) {
  return view ? `${view.at}@${view.cam}` : '';
}

/**
 * The authored views of a record: for each planet, from above and in the plane. `radiusOf(id)` gives a world's radius in km
 * (0 when unknown, and then there is no view: a distance is never guessed). Pure.
 */
export function curatedFor(record, radiusOf) {
  const id = record && record.id;
  if (!CURATED_WORLDS.includes(id)) return [];
  const km = Number(typeof radiusOf === 'function' ? radiusOf(id) : 0);
  if (!(km > 0)) return [];
  const out = [];
  for (const [kind, pose] of Object.entries(CURATED_KINDS)) {
    const cam = camValue({ azimuthDeg: pose.az, polarDeg: pose.polar, distanceKm: km * pose.radii });
    if (cam) out.push({ id: `${id}:${kind}`, at: id, stage: id, cam, kind, name: String(record.name || id), curated: true });
  }
  return out;
}

/** A view of `record` from `pose` ({azimuthDeg, polarDeg, distanceKm}) on the map `stageId`, or null when it is not a pose. Pure. */
export function viewOf(record, pose, stageId) {
  const cam = camValue(pose);
  if (!record || !record.id || !cam) return null;
  return { id: `${record.id}@${cam}`, at: String(record.id), stage: String(stageId || DEFAULT_STAGE), cam, name: String(record.name || record.id), curated: false };
}

/**
 * The link that opens a view, as the share sheet makes one: the format and the release, then `at`, `stage` (left out on the Earth's
 * map, as the app leaves it out) and `cam`, commas kept. Pure.
 */
export function viewLink(view, base = '/') {
  if (!view || !view.at || !parseCam(view.cam)) return '';
  const root = String(base).endsWith('/') ? String(base) : `${base}/`;
  const keys = [`v=${VERSION}`, `build=${encodeURIComponent(BUILD)}`, `at=${encodeURIComponent(view.at)}`];
  if (view.stage && view.stage !== DEFAULT_STAGE) keys.push(`stage=${encodeURIComponent(view.stage)}`);
  keys.push(`cam=${view.cam}`);
  return `${root}#${keys.join('&')}`;
}

/** The saved views, or [] for nothing, junk or a storage that throws. Each is checked: a pose that is not one is dropped. Pure but for the storage. */
export function readSaved(storage) {
  try {
    const raw = storage && storage.getItem(SAVED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const v of list) {
      if (!v || typeof v.at !== 'string' || typeof v.cam !== 'string' || !parseCam(v.cam)) continue;
      const view = { id: `${v.at}@${v.cam}`, at: v.at, stage: typeof v.stage === 'string' && v.stage ? v.stage : DEFAULT_STAGE, cam: v.cam, name: typeof v.name === 'string' && v.name ? v.name : v.at, curated: false };
      if (!out.some((o) => o.id === view.id)) out.push(view);
      if (out.length >= MAX_SAVED) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** Keep the list. False when the storage would not take it. Only the four fields a view is made of are written. */
export function writeSaved(storage, list) {
  try {
    if (!storage) return false;
    storage.setItem(SAVED_KEY, JSON.stringify((list || []).slice(0, MAX_SAVED).map((v) => ({ at: v.at, stage: v.stage, cam: v.cam, name: v.name }))));
    return true;
  } catch {
    return false;
  }
}

/** The list with a view added at the front: the same view moves up instead of repeating; null when twelve are kept and it is a new one. Pure. */
export function addSaved(list, view) {
  const rest = (list || []).filter((v) => v.id !== view.id);
  if (rest.length >= MAX_SAVED) return null;
  return [view, ...rest];
}

/** The list without one view. Pure. */
export function removeSaved(list, id) {
  return (list || []).filter((v) => v.id !== id);
}

function defaultStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** What a row is called: an authored view by what the camera does (the sheet is about that one thing), a saved one by the thing's name. */
export function viewWords(view) {
  const V = COPY.views;
  if (view && view.curated && V.curated[view.kind]) return V.curated[view.kind];
  return String(view && view.name ? view.name : '');
}

/** How far out a saved view stands, short: "349 600 km out". Pure. */
export function awayWords(view) {
  const p = parseCam(view && view.cam);
  return p ? t(COPY.views.away, { km: fmt.int(Math.round(p.distanceKm)) }) : '';
}

/** A saved view's pose in a line: where round, how far from the pole, how far off. Pure. */
export function poseWords(view) {
  const p = parseCam(view && view.cam);
  if (!p) return '';
  const deg = (v) => String(Math.round(v));
  return t(COPY.views.pose, { az: deg(p.azimuthDeg), pol: deg(p.polarDeg), km: fmt.int(Math.round(p.distanceKm)) });
}

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}

/**
 * The panel: the authored views for the record, then the saved ones, then Save. Each view is a row with Go (fly there and stand
 * where it was framed) and Copy link; a saved one also has Remove. The record is the share sheet's (the selection), or null: then
 * only the saved views are listed and nothing can be saved, because a view is a view OF something.
 */
export function viewsPanel(ctx, opts = {}) {
  const V = COPY.views;
  const storage = 'storage' in opts ? opts.storage : defaultStorage();
  const record = opts.record || null;
  const base = opts.base || '/';
  const radiusOf = opts.radiusOf || (() => 0);
  const wrap = node('div', 'sr-share__views');
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', V.label);
  const list = node('ul', 'sr-share__viewlist');
  wrap.appendChild(list);
  const none = node('p', 'sr-share__note', V.none);
  wrap.appendChild(none);
  const saveBtn = node('button', 'sr-share__btn sr-share__viewsave', V.save);
  saveBtn.type = 'button';
  saveBtn.title = V.saveTitle;
  saveBtn.hidden = !record;
  wrap.appendChild(saveBtn);
  const note = node('p', 'sr-share__note sr-share__viewnote');
  note.setAttribute('role', 'status');
  note.hidden = true;
  wrap.appendChild(note);
  let saved = readSaved(storage);

  const say = (line) => { note.textContent = line; note.hidden = !line; };

  /** Fly there: write the address, and main.js's hashchange does the rest, as for a pasted link. */
  function open(view) {
    const link = viewLink(view, base);
    const hash = link.slice(link.indexOf('#'));
    try {
      if (ctx && ctx.share && typeof ctx.share.close === 'function') ctx.share.close();
    } catch { /* the sheet was already closed */ }
    // main.js takes `cam` off the address once it has stood the camera there (applyCam), so the same view opened twice is two hash changes.
    if (typeof location !== 'undefined') location.hash = hash;
    if (ctx) ctx.lastView = { opened: view.id, hash };
  }

  async function copyLink(view) {
    const link = viewLink(view, base);
    try {
      await navigator.clipboard.writeText(link);
      say(V.copied);
    } catch {
      say(V.copyRefused);
    }
    if (ctx) ctx.lastView = { copied: view.id, link };
  }

  function row(view, removable) {
    const li = node('li', 'sr-share__viewrow');
    li.dataset.view = view.id;
    // What a screen reader hears for the three buttons: the thing and the view, since the row's own words are a sentence away.
    const label = view.curated ? `${view.name}, ${viewWords(view)}` : `${view.name}, ${poseWords(view)}`;
    const name = node('span', 'sr-share__viewname');
    name.appendChild(node('span', 'sr-share__viewtitle', viewWords(view)));
    // A saved view says how far out in a line that fits beside three buttons; the whole pose is its tooltip.
    if (!view.curated) name.appendChild(node('span', 'sr-share__viewpose', awayWords(view)));
    name.title = view.curated ? V[`${view.kind}Title`] || '' : poseWords(view);
    const go = node('button', 'sr-share__viewbtn', V.go);
    go.type = 'button';
    go.title = V.goTitle;
    go.setAttribute('aria-label', t(V.act, { act: V.go, what: label }));
    go.addEventListener('click', () => open(view));
    const copy = node('button', 'sr-share__viewbtn', V.copy);
    copy.type = 'button';
    copy.title = V.copyTitle;
    copy.setAttribute('aria-label', t(V.act, { act: V.copy, what: label }));
    copy.addEventListener('click', () => copyLink(view));
    li.append(name, go, copy);
    if (removable) {
      const rm = node('button', 'sr-share__viewbtn', V.remove);
      rm.type = 'button';
      rm.title = V.removeTitle;
      rm.setAttribute('aria-label', t(V.act, { act: V.remove, what: label }));
      rm.addEventListener('click', () => {
        saved = removeSaved(saved, view.id);
        writeSaved(storage, saved);
        refresh();
      });
      li.appendChild(rm);
    }
    return li;
  }

  function refresh() {
    while (list.firstChild) list.removeChild(list.firstChild);
    const curated = record ? curatedFor(record, radiusOf) : [];
    // The saved ones are of any thing; the ones of this record come first.
    const mine = saved.filter((v) => record && v.at === record.id);
    const others = saved.filter((v) => !record || v.at !== record.id);
    for (const v of curated) list.appendChild(row(v, false));
    for (const v of [...mine, ...others]) list.appendChild(row(v, true));
    none.hidden = list.childElementCount > 0;
  }

  saveBtn.addEventListener('click', () => {
    let pose = null;
    try { pose = ctx && typeof ctx.camPose === 'function' ? ctx.camPose() : null; } catch { pose = null; }
    const stageId = ctx && ctx.stage && ctx.stage.worldId ? ctx.stage.worldId : DEFAULT_STAGE;
    const view = viewOf(record, pose, stageId);
    if (!view) { say(V.copyRefused); return; }
    const next = addSaved(saved, view);
    if (!next) { say(V.full); return; }
    saved = next;
    say(writeSaved(storage, saved) ? V.saved : V.savedPage);
    if (ctx) ctx.lastView = { saved: view.id };
    refresh();
  });

  wrap.refresh = refresh;
  wrap.destroy = () => wrap.remove();
  refresh();
  return wrap;
}
