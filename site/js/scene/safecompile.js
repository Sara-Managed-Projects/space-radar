// safecompile: `renderer.compileAsync` that survives a material being disposed while it polls (internal #325).
// three's own version looks every material's program up in `renderer.properties` every 10 ms and reads
// `.currentProgram.isReady()`; a stage change that disposes the object in between removes that entry, the read
// throws inside a timer nobody can catch, and the page's boot-failure handler reacted to it. This one does the
// same walk (`renderer.compile` starts the compiles), but a material that has lost its entry or its program is
// simply done, and a cap ends the wait for a program that never links.
export function compileSafe(renderer, object, camera, scene, capMs = 20000) {
  if (!renderer) return Promise.resolve(null);
  // A stand-in renderer (the tests') has no property map to walk: its own compileAsync is all there is.
  if (!renderer.properties || typeof renderer.compile !== 'function') return typeof renderer.compileAsync === 'function' ? Promise.resolve(renderer.compileAsync(object, camera, scene || undefined)) : Promise.resolve(null);
  let pending;
  try { pending = renderer.compile(object, camera, scene || null); } catch { return Promise.resolve(null); }
  const props = renderer.properties;
  const t0 = Date.now();
  return new Promise((resolve) => {
    const poll = () => {
      for (const m of [...pending]) {
        let p = null;
        try { p = props && props.get(m) && props.get(m).currentProgram; } catch { p = null; }
        let ready = !p;
        try { if (p && p.isReady()) ready = true; } catch { ready = true; }
        if (ready) pending.delete(m);
      }
      if (pending.size === 0 || Date.now() - t0 > capMs) resolve(object);
      else setTimeout(poll, 10);
    };
    setTimeout(poll, 10);
  });
}
