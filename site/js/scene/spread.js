// scene/spread.js -- run a list of heavy steps one per turn instead of all in one frame (internal #549).
//
// WHY. Entering the galaxy rung of the roof-to-the-edge trip stalled for about three seconds: the
// Milky Way's points, dust lanes and Andromeda twin (scene/galaxy.js) were all built in the one task
// that the file's arrival started, and their shaders were compiled by the first frame that drew
// them. A step list lets a module do the same work in pieces, each in its own turn, with the browser
// free to draw in between; the data is the same, only WHEN changes.
//
// spread(steps, schedule) -> Promise that resolves after the last step ran, in order, one step per
// turn of `schedule` (default: requestIdleCallback with a 120 ms timeout, else a 16 ms timer). A
// step that throws rejects the promise and the rest do not run. No DOM, no THREE: a node test drives it.

/** The default turn: an idle moment when the browser has one, a short timer when not. */
export function defaultSchedule(fn) {
  if (typeof requestIdleCallback === 'function') return requestIdleCallback(() => fn(), { timeout: 120 });
  return setTimeout(fn, 16);
}

export function spread(steps, schedule = defaultSchedule) {
  const list = Array.isArray(steps) ? steps.slice() : [];
  return new Promise((resolve, reject) => {
    let i = 0;
    const turn = () => {
      if (i >= list.length) { resolve(i); return; }
      try { list[i++](); } catch (err) { reject(err); return; }
      schedule(turn);
    };
    schedule(turn);
  });
}
