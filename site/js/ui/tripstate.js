// A trip's state before any trip has started: what ui/trip.js starts from and mutates, and what
// ui/tripgate.js answers with while ui/trip.js has not been fetched (2026-10-06, internal #405).
// One literal for both, so a field added to the trip's state is in the idle answer the same day.
// A fresh object each call: the trip mutates its own.

export function idleTripState() {
  return {
    phase: 'idle',
    tourId: null,
    tourTitle: null,
    stopId: null,
    stopTitle: null,
    // Spec 0037: the event type the stop's instant comes from ('solar-eclipse', ...), or null.
    stopEventType: null,
    // The planets whose paths and dots the Sun stage draws while this trip runs (`orbits:`,
    // scene/orbitrings.js), and which the frame's "drawn larger" line is about. Empty when none.
    orbits: [],
    // What the stop on screen asks the scene to add (2026-10-05), each null when it asks nothing:
    // `sky` = { figures, stars, ecliptic } for scene/figures3d.js, `overlay` an id of
    // registry/overlays.yaml for scene/earthoverlay.js, `exposure` a mode of scene/exposure.js.
    // main.js applies them (and fetches the modules); leaving puts back what the visitor had.
    // `wants` says at the intro which of the modules this trip will need, so they are there in time.
    sky: null,
    overlay: null,
    exposure: null,
    // The stop's lens (`zoom:` on a sky stop): under 1 is a wider angle, for a figure too tall for
    // the camera's 45 degrees. main.js eases the camera's zoom to it and back to 1 on leave.
    zoom: 1,
    // 2026-10-06, the remaining shows. `portrait`: the record whose picture scene/portraits.js draws
    // at its place while the stop is up (a black hole with the Event Horizon Telescope's picture),
    // or null. `names`: the stop keeps the other objects' names up in present mode (`names: true`).
    portrait: null,
    names: false,
    wants: { figures: false, overlay: false, spaceWeather: false, portrait: false, pictures: false },
    // The stop on screen is seen from the visitor's own ground (`look:`, 2026-10-06): the sky view
    // has the camera, and the frame and the present mode read this to say so.
    ground: false,
    // The last stop is over and the trip is flying home in one flight (`return: true`, ui/trip.js flyHome).
    returning: false,
    index: -1,
    count: 0,
    // The resolved stops' ids and titles, in order: the intro sheet lists them (spec 0061 task 7).
    stops: [],
    estimateMs: 0,
    generation: 0,
    pausedBy: null,
    pacing: 'auto',
    reducedMotion: false,
    clockClamped: false,
    // Spec 0030. `clockMoves`: a stop in this trip sets the clock, so the intro and the end card say
    // so. `clockOwned`: one already has, so the clock is the trip's until leave and the frame prints
    // the "Shown at" line from it.
    clockMoves: false,
    clockOwned: false,
    // Whether this trip has moved the map's centre. The frame reads it, because leaving then puts
    // the centre back and the camera CANNOT stay where it is: one unit is a different distance
    // there. Every "the camera stays where it is" line in copy/en.js has a second version for it.
    stageChanged: false,
    // Spec 0034 req 3: the stop's `chapter:` once it has landed (the k = 0.6 title point, or the
    // arrival for a cut), kept across the stops of one chapter, cleared by the first that has
    // another or none. The frame prints it above the trip's title.
    chapter: null,
    dropped: [],
    held: null,
    reason: null,
    // The generated line under the current stop's words (spec 0038): the visitor's place, the
    // station's distance from them, or its next pass. Null when the stop has none.
    stopNote: null,
  };
}
