// The words of the modules that load after the first screen (2026-10-06, internal #405).
//
// WHY A SECOND FILE. copy/en.js is in the boot graph: the chrome needs its words for the first
// frame. But 45 kB of it was read only by modules a first visit does not fetch -- the card
// (ui/cards.js), the Tonight tab, the debris view, the Sources sheet's sound rows, the keys hint,
// the share and photo sheets -- and every first visit downloaded it all the same. Those sections
// live here, in the order they had there, and are ADDED TO THE SAME `COPY` OBJECT when this file is
// evaluated: a reader still writes `COPY.templates`, and nothing about a key's name has changed.
//
// THE RULE, AND WHAT HOLDS IT. A module that reads a section defined here imports this file
// (`import '../copy/en.later.js';`) beside copy/en.js, so the section is there before the module's
// own code runs. No module in the boot graph may import it. tests/test_boot_diet.mjs checks both,
// and that no section is defined twice; scripts/check_copy.py and tests/test_chrome_copy.mjs read
// this file with the other. A section moves here only when nothing at boot reads it.
import { COPY, article } from './en.js';

Object.assign(COPY, {
  // scene/shells.js (internal #306): two distances drawn as wire spheres on the ladder's rungs.
  // Each label says what the sphere is and how far, in words the scene can carry on one line.
  shells: {
    radio: 'Radio from Earth has reached {n} light-years',
    cmb: 'The microwave background: 46.5 billion light-years',
  },
  // ui/subscribe.js (issue #251): email-only alerts for upcoming launches and meteor shower
  // peaks -- the same for every subscriber, never a per-location pass alert (that is issue #290).
  subscribe: {
    // The row's label under Coming up: one line in a 320 px column (spec 0061 req 11).
    heading: 'Email me launches and showers',
    emailLabel: 'Your email address',
    emailPlaceholder: 'you@example.com',
    pickOne: 'Tick at least one of the two.',
    launchesLabel: 'Upcoming launches',
    showersLabel: 'Meteor shower peaks',
    submit: 'Subscribe',
    sending: 'Sending…',
    pending: 'Check your email to confirm.',
    couldNotReach: 'Could not reach the subscription service.',
  },

  // The flood light on a model's card (ui/cards.js floodControls, scene/models.js setFloodLight;
  // internal #272). `note` is the honesty line and is on screen for as long as the lamp is.
  flood: {
    on: 'Light it',
    off: 'Real light',
    title: 'Light the model evenly, so it can be seen in shadow. Not the real light.',
    note: 'Our lamp, not the real light.',
  },

  // A craft drawn from its own path file (propagate/ephemeris.js, ui/missions.js; internal #277).
  // {km} is the bound tests/test_ephemerides.mjs holds the file to against JPL's positions.
  ephemeris: {
    drawn: 'Drawn from JPL Horizons, interpolated: within about {km} km of JPL’s own track.',
    note: 'The map holds its path for that day, from JPL Horizons, good to about {km} km.',
    noteLate: 'JPL’s track of it begins {n} minutes after this moment, and the clock goes there. Good to about {km} km.',
    noteDay: 'NASA’s page gives the day. The clock goes to {time} UTC, the closest pass in JPL’s track that day, good to about {km} km.',
    failed: 'Its path for that day did not load, so the clock stays where it is. Choose it again to retry.',
  },

  // The service worker's one line (ui/offline.js): a newer build is installed and waiting.
  offline: {
    updateReady: 'A newer version is ready',
    reload: 'Reload',
  },
  // ui/autopilot.js (spec 0036): a screen that plays the trips on its own. The mark is the only
  // chrome besides the captions; the gate is the one question it ever asks.
  autopilot: {
    mark: 'spaceradar.ai',
    gateTitle: 'Press any key to start with sound',
    gateTitleTouch: 'Touch the screen to start with sound',
    gateNote: 'With nobody here it starts silent, with captions, in {n} seconds.',
    upNext: 'Next trip',
    shape: '{n} stops · {m} min',
    take: 'Take the controls',
    takeTitle: 'Stop the trips and move the map yourself',
  },

  // The toast after the app has moved the view for you (ui/camundo.js, internal #274).
  undo: {
    moved: 'Moved to {name}',
    movedNowhere: 'The view moved',
    // A storm or a launch pad on the night side: the camera stands back to the whole Earth.
    night: 'Night at {name}: the wide view',
    back: 'Back to where you were',
    done: 'Back where you were',
  },

  // What a search row says under the name, and the rows that are not objects (ui/searchrows.js).
  searchRows: {
    kinds: {
      sun: 'Star', planet: 'Planet', moon: 'Moon', station: 'Space station', satellite: 'Satellite', telescope: 'Space telescope',
      probe: 'Spacecraft', rocket: 'Rocket', launch: 'Launch', debris: 'Debris', asteroid: 'Asteroid', comet: 'Comet', site: 'Place', landing: 'Landing site',
      star: 'Star', exoplanet: 'Planet of another star', dso: 'Deep-sky object', storm: 'Tropical storm', oddity: 'Oddity',
      earthevent: 'Event on Earth',
      blackhole: 'Black hole', pulsar: 'Pulsar', magnetar: 'Magnetar',
    },
    upNow: 'up now, {compass}',
    lowNow: 'low in the {compass} now',
    downNow: 'below your horizon now',
    trip: 'Trip',
    mission: 'Mission',
    eventName: '{mission}: {title}',
    event: 'Mission event · {date}',
    eventNoDate: 'Mission event',
    // One row for a constellation's satellites; {n} is how many the map holds.
    group: 'Constellation · {n} satellites on the map · press to list them',
    nearMe: 'Near me tonight',
    nearMeSub: 'What is up in your sky',
  },

  // A launch within a day (ui/countdown.js). The states are Launch Library's own status field;
  // it has no "scrubbed", so neither does this.
  countdown: {
    go: 'Go for launch',
    tbc: 'Time to be confirmed',
    tbd: 'Time not settled',
    hold: 'On hold: the count is paused',
    inFlight: 'In flight',
    success: 'Launched',
    deployed: 'Payload deployed',
    failure: 'The launch failed',
    partial: 'A partial failure',
    byPlan: 'By the plan. No newer word',
    byPlanClimbing: 'By the plan, climbing. No newer word',
    // {age} is ageInWords: "an hour ago".
    age: 'read {age}',
  },

  // The home's dated cards (ui/today.js): generated from what is loaded, never typed.
  today: {
    title: 'Today',
    moonTitle: '{phase} Moon',
    moonLine: '{pct} % lit · {next} on {date}',
    moonNext: ['new Moon', 'first quarter', 'full Moon', 'last quarter'],
    approachLine: '{value} · {detail}',
    launchedKicker: 'Last 30 days',
    launched: '{n} new objects in orbit',
    launchedLine: 'Newest: {name}',
    debris: 'Debris, by the numbers',
    debrisClose: 'Close the debris view',
    debrisTitle: 'Counts everything tracked in orbit. Reads the whole catalogue, about 1.5 MB',
  },

  // The home's first line (ui/sentence.js): ONE sentence that is true now, made of one or two of
  // these clauses. Each clause starts in lower case (the sentence capitalises its first) and is
  // filled from loaded data only; `sources` names where each one's data came from, for the tooltip.
  sentence: {
    one: '{a}.',
    two: '{a}, and {b}.',
    title: 'From {sources}. Press to go there',
    // How a crewed station is said inside a sentence, by the record its elements load as.
    names: { 'sat-25544': 'the ISS', 'sat-48274': 'Tiangong' },
    pass: '{name} passes over you {when}',
    // "Is due to": a launch time is a plan, and the sentence must stay true if it slips.
    launch: '{name} is due to launch {when}',
    showerToday: 'the {name} peak today',
    showerTomorrow: 'the {name} peak tomorrow',
    moonName: 'The Moon',
    // By Astronomy Engine's quarter number: only the new and the full Moon are counted down to.
    moonPhases: ['new', '', 'full', ''],
    moonToday: 'the Moon is {phase} today',
    moonOne: 'the Moon is one day from {phase}',
    moonDays: 'the Moon is {n} days from {phase}',
    moonLit: 'the Moon is {pct} % lit',
    crew: '{n} people are in orbit right now',
    crewOne: 'one person is in orbit right now',
    storms: '{n} storms are turning',
    stormOne: 'one storm is turning',
    approach: '{name} passes Earth {when}',
    launched: '{n} new objects reached orbit in 30 days',
    sources: {
      pass: 'CelesTrak elements',
      launch: 'Launch Library 2',
      shower: 'the IMO shower calendar',
      moon: 'Astronomy Engine',
      crew: 'Open Notify',
      storms: 'GDACS',
      approach: 'NASA JPL',
      launched: 'CelesTrak',
    },
  },

  // The wonder of the day (ui/today.js; the choice is ui/passport.js wonderOfTheDay): one line
  // over the dated cards, an event inside 30 days or else a famous thing whose turn the day is.
  wonder: {
    kicker: 'Wonder of the day',
    label: 'Wonder of the day: {title}',
  },

  // "Just happened" (internal #134): one row at the head of Coming up. {age} is ageInWords.
  happened: {
    flown: 'Lifted off {age}',
    lost: 'Launch failed {age}',
  },

  // The passport (ui/passport.js, spec 0041): where you have been, kept in this browser only.
  passport: {
    title: 'Passport',
    openTitle: 'Where you have been, kept in this browser only',
    // The row at the home's foot: "12 places · 3 of 25 trips".
    summary: '{places} · {n} of {total} trips',
    places: '{n} places',
    placeOne: '{n} place',
    // Said once, in the view: what this is and where it lives.
    kept: 'Kept in this browser only, never sent.',
    notKept: 'This browser keeps nothing, so nothing is here.',
    placesTitle: 'Places you opened',
    tripsTitle: 'Trips finished',
    outOf: '{n} of {total}',
    barLabel: '{n} of {total} trips finished',
    placeTitle: 'Go to {name}',
    noPlaces: 'No places yet. Open one on the map.',
    noTrips: 'No trips finished yet.',
    forget: 'Forget me',
    forgetConfirm: 'Yes, forget',
    forgetTitle: 'Clears the passport and the sound choice from this browser',
    forgotten: 'Forgotten. This browser holds nothing now.',
    // The end card's stamp: "Trip 7 of 25 · 7 October 2026". {date} is the visitor's own day.
    stamp: 'Trip {n} of {total} · {date}',
    // A trip card's line for a trip left in the last 24 hours.
    resume: 'Continue from stop {n}',
  },

  // The Sources sheet's last section (ui/status.js; spec 0041 task 4, internal #437): what the site
  // keeps in this browser, in the place that already says where everything comes from. Each line
  // is held to the code by tests/test_passport.mjs and tests/test_place_privacy.mjs.
  kept: {
    title: 'What this site keeps on your device',
    lines: [
      'Your passport: the places you opened and the trips you finished.',
      'Your sound and voice choice, and how you left the panels.',
      'A copy of the data it last read, so the map opens without a connection.',
    ],
    place: 'Your place is rounded to a tenth of a degree and held only while this page is open.',
    none: 'No account, no cookies, no analytics. Forget me, in the Passport, clears the passport and the sound choice.',
  },

  // Debris as a problem (ui/debris.js; the counting is data/satcat.js). Its sentences are filled
  // from CelesTrak's catalogue: none of the numbers is written here.
  debris: {
    title: 'Debris in orbit',
    reading: 'Reading the catalogue, about 1.5 MB',
    failed: 'The catalogue could not be read.',
    retry: 'Try again',
    empty: 'The catalogue lists nothing in orbit.',
    lead: '{gone} of the {total} things tracked in orbit no longer work.',
    kinds: { debris: 'pieces of debris', rocket: 'spent rocket bodies', dead: 'dead satellites', working: 'working satellites' },
    bandsTitle: 'By height',
    bands: {
      low: 'Under 600 km',
      crowded: '600 to 1 000 km',
      upper: '1 000 to 2 000 km',
      medium: '2 000 to 34 000 km',
      geo: 'Around 36 000 km',
      beyond: 'Beyond 37 600 km',
      stretched: 'Stretched orbits',
    },
    bandAria: '{band}: {total} in all. {debris} debris, {rocket} rocket bodies, {dead} dead satellites, {working} working.',
    show: 'Show on the map',
    hide: 'Hide from the map',
    showTitle: 'Every piece of debris and spent rocket, coloured by kind',
    drawn: '{n} dots: grey is debris, yellow a spent rocket. Each is at its real height and tilt, at a made-up place on its orbit.',
    storiesTitle: 'From the catalogue',
    oneObject: 'One object',
    objects: '{n} objects',
    oneLaunch: 'one launch',
    launches: '{n} launches',
    oneThing: 'One thing',
    things: '{n} things',
    storyLaunched: '{objects} from {launches} joined the catalogue in the week to {date}.',
    storyCameDown: '{things} came down in that week.',
    storyCameDownBiggest: '{things} came down in that week, the largest of them {name}.',
    storyCloud: 'The biggest cloud of debris is from {name}: {pieces} pieces still in orbit.',
    storyClouds: 'The biggest clouds of debris: {name}, {pieces} pieces still up; then {name2}, {pieces2}, and {name3}, {pieces3}.',
    storyOldest: 'The oldest thing still in orbit is {name}, launched in {year}: {years} years of laps.',
    // "From about 10 cm": NASA's Orbital Debris Program Office FAQ, read 2026-10-06 ("Large orbital
    // debris (> 10 cm) is tracked routinely by the U.S. Space Surveillance Network"),
    // https://orbitaldebris.jsc.nasa.gov/faq/. No other number in these sentences is written here.
    // What is too small to track: ESA's modelled counts (ui/debris.js ESA_MODEL carries the numbers,
    // the page and the day it was read). {mid} and {small} are millions.
    untracked: 'Too small to track, by ESA’s model: about {mid} million pieces of 1 to 10 cm and {small} million of 1 mm to 1 cm, as of {when}. An estimate, not a count.',
    untrackedSource: 'ESA space environment statistics',
    honesty: 'Counted from CelesTrak’s catalogue as read on {date}: what radar can track, from about 10 cm across. Smaller pieces are far more numerous and are in no catalogue. Where a dot is along its orbit is illustrative.',
  },

  klass: {
    station: 'Station',
    satellite: 'Satellite',
    debris: 'Debris',
    rocket: 'Rocket',
    probe: 'Probe',
    telescope: 'Telescope',
    asteroid: 'Asteroid',
    comet: 'Comet',
    site: 'Ground site',
    world: 'World',
    star: 'Star',
    exoplanet: 'Planet of another star',
    dso: 'Deep-sky object',
    exotic: 'Extreme object',
    storm: 'Tropical cyclone',
    // A wildfire, an erupting volcano or an iceberg from NASA's EONET (data/eonet.js).
    earthevent: 'Event on Earth',
    // Not a physical class -- a curatorial one. A golf ball, a car and a photograph have nothing
    // in common except that somebody sent them and nobody had to.
    oddity: 'Oddity',
    unknown: 'Object',
  },

  // The card's badge for the far-bodies layer, whose records are filed under the asteroid and comet
  // classes for their glyph and model (ui/cards.js klassLabel).
  klassFar: {
    dwarf: 'Dwarf planet',
    interstellar: 'Interstellar object',
  },

  moments: {
    title: 'What are you here for',
    wonder: {
      id: 'wonder',
      label: 'Wonder',
      hint: 'Fly around and tap anything.',
    },
    now: {
      id: 'now',
      label: 'Now',
      hint: 'What is above your head this minute.',
    },
    next: {
      id: 'next',
      label: 'Next',
      hint: 'What is coming, and when.',
    },
  },

  // Sound (spec 0035): off until the visitor turns it on, and remembered once they have. The words
  // say the state, not the action, on the toggle ("Sound: off"), and the action on the mute in the
  // bars ("Mute"), because a bar button is pressed mid-trip by somebody who already hears it.
  audio: {
    on: 'Sound: on',
    off: 'Sound: off',
    toggleTitle: 'Music and sounds. Off until you turn it on; remembered on this device.',
    mute: 'Mute',
    unmute: 'Sound',
    muteTitle: 'Turn the music and sounds off',
    unmuteTitle: 'Turn the music and sounds on',
    panelTitle: 'Sound',
    panelNote: 'A quiet score for the map and its trips. Nothing is downloaded until you turn it on.',
    creditsLine: 'Music and sounds: {credits}',
    // Spec 0069 task 5. The registry's own line (registry/narration.yaml `voice.credit`, carried
    // by CREDITS.md section 9b): tests/test_narration.mjs holds the three to one string.
    narrationCredit: 'Narration: a synthetic voice, Kokoro-82M (bf_emma), Apache-2.0',
  },

  // A world with a second face on its card (scene/worlds.js `faces`, 2026-10-06, public #417).
  // Venus: NASA's Magellan page, read 2026-10-06, has the radar mapping begin on 15 September 1990
  // and "finished coverage at 98%" in September 1992.
  worldFace: {
    venus: {
      title: 'Venus, two ways',
      modes: { own: 'Clouds', surface: 'Ground' },
      notes: {
        own: 'The cloud tops, which is all an eye or a telescope ever sees of Venus.',
        surface: 'The ground under the clouds, mapped by radar from orbit by NASA\u2019s Magellan between 1990 and 1992. Bright is rough ground and dark is smooth. The orange is added, and the strips Magellan missed are filled in from their edges.',
      },
    },
    // 2026-10-07: the four giants' second face, Hubble's yearly OPAL maps (registry/textures.yaml
    // `<id>-hubble`; the dates are the FITS headers' DATE-OBS and the READMEs', read 2026-10-07 at
    // https://archive.stsci.edu/hlsp/opal). A giant has no surface: the map is one day's clouds.
    // What Hubble could not see from the Earth is said, because it is filled and not measured. The
    // credit is in the note because CC BY 4.0 asks for it beside the picture.
    jupiter: {
      title: 'Jupiter, two ways',
      modes: { own: 'Artist\u2019s map', hubble: 'As Hubble saw it' },
      notes: {
        own: 'An artist\u2019s map, made from spacecraft pictures and smoothed (Solar System Scope). It is the picture most people know.',
        hubble: 'Jupiter as Hubble mapped it on 11 December 2025. The bands are where they were that day, and no cloud is where it is today. The colours are Hubble\u2019s red, green and violet filters, a little yellower than an eye would see. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapted.',
      },
    },
    saturn: {
      title: 'Saturn, two ways',
      modes: { own: 'Artist\u2019s map', hubble: 'As Hubble saw it' },
      notes: {
        own: 'An artist\u2019s map, made from spacecraft pictures and smoothed (Solar System Scope). It is the picture most people know.',
        hubble: 'Saturn as Hubble mapped it on 29 August 2025, in its red, green and violet filters, a little yellower than an eye would see. The strip at the equator that the rings hid that day is filled in from the clouds either side of it. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapted.',
      },
    },
    uranus: {
      title: 'Uranus, two ways',
      modes: { own: 'Artist\u2019s map', hubble: 'As Hubble saw it' },
      notes: {
        own: 'An artist\u2019s map, made from spacecraft pictures and smoothed (Solar System Scope). It is the picture most people know.',
        hubble: 'Uranus as Hubble mapped it on 23 October 2025. The planet lies on its side with its north pole toward us, so Hubble saw only the northern half; the southern half is given the colour of the equator, not guessed. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapted.',
      },
    },
    neptune: {
      title: 'Neptune, two ways',
      modes: { own: 'Artist\u2019s map', hubble: 'As Hubble saw it' },
      notes: {
        own: 'An artist\u2019s map, made from spacecraft pictures and smoothed (Solar System Scope). It is the picture most people know.',
        hubble: 'Neptune as Hubble mapped it on 24 August 2025: paler than the famous pictures. The far north was out of Hubble\u2019s sight and is given the colour of the last clouds it saw, not guessed. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapted.',
      },
    },
  },

  // Spec 0067: the shutter. The gas clouds in space pictures are real and faint; a photograph's
  // colour is minutes of collected light, and sometimes single gases mapped to colours an eye would
  // not see. The control's line says which exposure is on; the card's lines say how this object's
  // picture was made (`colours` in registry/nebulae.yaml picks the sentence, `filters` fills it).
  exposure: {
    panelTitle: 'Exposure',
    modes: { eye: 'Eye', camera: 'Camera', deep: 'Deep' },
    notes: {
      eye: 'What you would see from a dark place: faint and grey.',
      camera: 'A long exposure: minutes of light, as a camera keeps it.',
      deep: 'An observatory\u2019s stretch: the faintest gas lifted.',
    },
    real: 'The gas is real, and faint: to the eye at a telescope it is a grey glow, because the night eye sees no colour. The picture on the sky is a long exposure.',
    colours: {
      broadband: 'It was taken through broad colour filters ({filters}), so the colours are close to what a far more sensitive eye would see.',
      mixed: 'It was taken through broad colour filters with a narrow one for glowing hydrogen added ({filters}), so the red gas is stronger here than an eye would find it.',
      narrowband: 'Its colours are mapped: each one is the light of a single gas through a narrow filter ({filters}), chosen to show the structure, not what an eye would see.',
      // Webb's pictures (2026-10-06): light no eye sees at all, so every colour is a choice.
      infrared: 'It was taken in infrared light, which no eye can see ({filters}), so every colour here is chosen: it shows what is there, not what an eye would see.',
      unstated: 'Its archive does not say which filters were used, so we do not say whether these are the colours an eye would see.',
    },
    part: 'It shows {part}, not the whole of it.',
    creditLead: 'Picture: ',
    creditTail: ' \u00b7 {licence}, edges faded and sky darkened by us',
  },

  // The sky in other light (registry/otherlight.yaml, scene/otherlight.js): the chooser in What to
  // show. Each note is the honest line: which light, and that its colours are not an eye's.
  otherLight: {
    panelTitle: 'Other light',
    bands: { visible: 'Visible', infrared: 'Infrared', microwave: 'Microwave', gamma: 'Gamma rays' },
    notes: {
      visible: 'The sky as eyes and cameras see it.',
      infrared: 'The sky in infrared, false colour: warm dust and cool stars.',
      microwave: 'Microwaves, as brightness: the Galaxy over the oldest light.',
      gamma: 'Gamma rays, false colour: pulsars, blazars, cosmic-ray glow.',
    },
    // What the survey's own composite shows as red, green and blue (the buttons' tooltips).
    colours: {
      infrared: 'Red is 22 µm, green 4.6 µm, blue 3.4 µm (WISE)',
      microwave: 'One band, 94 GHz, drawn as brightness (WMAP)',
      gamma: 'Red is 0.3 to 1 GeV, green 1 to 3, blue above 3 (Fermi)',
    },
    mixLabel: 'From the visible sky to {band}',
    mixValue: '{pct} % {band}',
    loading: 'Fetching the picture of the whole sky.',
    failed: 'That picture did not arrive. The sky is as it was.',
    creditLead: 'Survey: ',
    creditTail: '. Tiles: CDS, Strasbourg.',
  },

  // Earth data overlays (registry/overlays.yaml, scene/earthoverlay.js): one measured map over the
  // globe, with its legend, the day it is of and whose data it is.
  overlay: {
    panelTitle: 'Earth data',
    none: 'None',
    loading: 'Asking NASA for the picture.',
    failed: 'That picture did not arrive. The globe is as it was.',
    noEarth: 'Shown on the Earth, when it is in view.',
    // {what} is the registry row's own sentence; {date} "3 October 2026" or "June 2026".
    line: '{what} {dated} {made} {credit}',
    dated: { daily: 'The picture is of {date}.', monthly: 'The picture is the mean of {date}.' },
    made: {
      measured: 'Measured from orbit; clear where nothing was seen.',
      analysed: 'Measured, with the gaps filled in.',
      modelled: 'A weather model fed with measurements, not a direct picture.',
    },
    credit: 'Data: {credit}, through NASA GIBS. A map of data, not a photograph.',
    // The wind (scene/wind.js, data/wind.js): NOAA's forecast model, drawn as moving streaks.
    wind: {
      title: 'Wind',
      loading: 'Asking for the wind field.',
      failed: 'The wind field did not arrive. The globe is as it was.',
      what: 'The wind ten metres above the ground; colour is its speed.',
      dated: 'The forecast is for {date}, {time} UTC.',
      mean: 'About {mean} m/s on average, up to {max}.',
      sped: 'The streaks move {n} hours of wind in a second.',
      spedDay: 'The streaks move a day of wind in a second.',
      still: 'Each streak is a piece of the flow, standing still.',
      credit: 'Data: {credit}. A weather model, not a measurement.',
    },
    legendAria: '{title}, from {low} to {high} {unit}',
    legendHigh: '{high} {unit}',
  },

  // Constellation figures that draw themselves (scene/figures3d.js): the line under a stop.
  figures: {
    line: 'The figures are a tradition, drawn by us; the stars at their corners are at their measured distances.',
    lineSky: 'The figures are a tradition, drawn by us, over the stars as they are seen from Earth.',
    ecliptic: 'The dashed line is the ecliptic, the Sun\u2019s path through the year.',
  },

  // Colour keys (spec 0026 req 11).
  colourKey: {
    title: 'Colour by',
    unknown: 'not known for these',
    scope: 'Counting what is drawn from here, on the layers that are on.',
    // "What it is": a dot is drawn in its LAYER's colour (a rocket body on "Bright enough to see"
    // is sky blue), so the class rows are counts, and the layer swatches above are the key.
    byLayer: 'Shape is what it is; colour is its layer.',
    // Two shapes that are not classes (scene/glyphatlas.js glyphFor), counted out of the rows above.
    crewed: 'of those, built to carry a crew',
    swarm: 'of those, in a big constellation',
  },

  // The card's trajectory chart (spec 0026 req 14).
  trajectory: {
    label: 'Its path, the next lap and a half',
    ariaLabel: 'Height over time, and the ground track on a flat map',
    km: '{n} km',
    now: 'now',
    laps: '1½ laps later',
    north: 'N',
    south: 'S',
    note: 'Worked out from the same elements as the dot; the map is the ground directly below it.',
  },

  // Spec 0048: the next ninety minutes of an Earth orbiter, in time (sky/timefacts.js). Every
  // number here is worked out from the same elements as the dot, and the orbit count says it is
  // inferred because it carries a catalogue count forward.
  timeFacts: {
    label: 'The next 90 minutes',
    barLabel: 'Sunlight and shadow over the next 90 minutes: {parts}',
    barSunlit: '{mins} min in sunlight',
    barShadow: '{mins} min in Earth’s shadow',
    now: 'now',
    end: '+90 min',
    // Counting down in the clock's own time: at 1x that is yours; scrubbed, it is the time shown.
    entersShadowIn: 'Enters Earth’s shadow in {mins}',
    entersSunlightIn: 'Comes out into sunlight in {mins}',
    // Faster than a minute a second, a countdown is a blur; the clock time of the event is not.
    entersShadowAt: 'Enters Earth’s shadow at {time}',
    entersSunlightAt: 'Comes out into sunlight at {time}',
    allSunlit: 'In sunlight for all of the next 90 minutes',
    allShadow: 'In Earth’s shadow for all of the next 90 minutes',
    minutes: '{n} min',
    underAMinute: 'under a minute',
    // A lap runs from one northbound equator crossing to the next (sky/timefacts.js).
    lapIn: 'Completes this lap in {mmss}',
    lapAt: 'Completes this lap at {time}',
    orbit: 'Orbit {n} since launch',
    orbitNote: 'Inferred: the catalogue’s count at the elements’ epoch, plus the laps since.',
    // The year from the international designator ("1998-067A"); the day comes with SATCAT (task 2).
    launched: 'Launched in {year}',
    // The bar's own two lines on the card view (spec 0061 §4, row D): the light now on the left, the
    // next change on the right, and under the bar where the lap ends. Short, because they sit beside
    // a bar 320 px wide; the full sentences above stay in "Its path".
    nowSunlit: 'In sunlight',
    nowShadow: 'In Earth’s shadow',
    shadowIn: 'shadow in {mins}',
    sunlightIn: 'sunlight in {mins}',
    shadowAt: 'shadow at {time}',
    sunlightAt: 'sunlight at {time}',
    lapEndsIn: 'lap ends in {mmss}',
    lapEndsAt: 'lap ends at {time}',
  },

  // A launch's satellites as one thing (spec 0026 req 17).
  train: {
    label: 'In a train',
    oneOf: 'One of {n} launched together ({designator}).',
    youLead: 'This one leads.',
    leads: '{name} leads; this one is {position} in the line.',
    stillRaising: 'Still climbing as one line, about {alt} km up — the string of lights people report.',
    spreadOut: 'Spread out now, about {alt} km up; no longer a line in the sky.',
  },

  // Spec 0013 requirement 4, and spec 0001 principle 2 made visible.
  cls: {
    // An asteroid or comet on its two-body ellipse while within 0.05 au of the Earth (ui/cards.js nearEarthOnEllipse).
    nearEarthApprox: 'This close to the Earth its place is approximate: the orbit drawn is round the Sun alone and leaves out the Earth’s pull.',
    label: 'How we know where it is',
    measured: 'measured position',
    inferred: 'position propagated from elements {n} {unit} old',
    inferredUnknownAge: 'position propagated from elements of unknown age',
    // For a record with NO elements at all: a surface object drawn at a surveyed point near it.
    // "Position propagated from elements of unknown age" was printed under Alan Shepard's golf
    // balls, which have no elements and were never propagated from anything.
    inferredNoElements: 'position worked out rather than measured',
    // A storm's centre is measured, at one moment; this is the half of the line that says which.
    stormAdvisory: 'its centre at the {time} UTC advisory, {ago}; a storm moves, so it has moved since',
    // With the advisory's date, when the clock stands on another UTC day (public #330).
    stormAdvisoryDated: 'its centre at the {time} UTC advisory of {date}, {ago}; a storm moves, so it has moved since',
    illustrative: 'drawn to show where it goes; the real track is not public',
    // A dot of the "All tracked debris" layer: its orbit's height and tilt are the catalogue's.
    placeIllustrative: 'its real orbit, from CelesTrak’s catalogue, at a made-up place along it; we hold no current elements for it',
    sample: 'bundled sample data, not a live position',
    // spec 0026 req 15: a fresh launch the public catalogue has not numbered yet.
    provisional: 'not yet in the public catalogue — these are the operator’s own elements, published through CelesTrak; a permanent number comes when Space-Track lists it',
    unknown: 'we cannot say how this position was worked out',
    // A record with no position at all -- not a failed calculation, an absent fact. It reads
    // where the class line reads for everything else, so the card never has an empty honesty slot.
    unplaced: 'nobody knows where this is, so nothing is drawn for it',
    // The ADDITION to the inferred line, for a set of elements whose last observation is much
    // older than the epoch they are integrated from. The Roadster's elements are stated at a 2026
    // epoch and rest on 374 photographs that stopped in March 2018.
    inferredArc: 'the last time anybody saw it was {date}, and {caveat}',
    // Two numbers for two things. "The golf balls are at the Apollo 14 site (+/- 0.4 m)" is
    // false; this is the sentence that is true.
    precisionSplit:
      "{anchorName} is measured to {anchorM} m; this was {how} and is placed to within {objectM} m",
    precisionSplitUnknown:
      '{anchorName} is measured to {anchorM} m; this object itself has never been surveyed',
    // The THIRD case, and the golf balls are the reason. Somebody did find them -- Saunders, in
    // enhanced film -- and nobody published how closely. "never been surveyed" throws away the
    // finding; a metre figure invents the error bar. This says both halves and neither more.
    precisionSplitHowOnly:
      '{anchorName} is measured to {anchorM} m; this object was {how}, and nobody has published '
      + 'how closely',
    precisionOwn: 'located to within {objectM} m, {how}',
    // For a thing that is bolted to another thing. It has no position of its own and never will:
    // the class line above already printed the CARRIER's class, because the carrier's fields are
    // what was propagated. This says whose position that was, so the card is never surer of
    // itself than the spacecraft it is riding on.
    aboard: 'this is {carrier}’s own position, because the object is bolted to the outside of it and goes where it goes',
    how: {
      surveyed: 'surveyed from orbit',
      photogrammetric: 'found in photographs',
      orbital_imaging: 'found in orbital images',
      unsurveyed: 'never surveyed',
      map_reference: 'taken from a map',
    },
    hourWord: 'hour',
    hoursWord: 'hours',
    dayWord: 'day',
    daysWord: 'days',
    minuteWord: 'minute',
    minutesWord: 'minutes',
    yearWord: 'year',
    yearsWord: 'years',
  },

  // Things that ride on other things. Two rows in registry/oddities.yaml are `attached`: they
  // are not objects in space, they are parts of objects in space, so they have no dot of their
  // own and are reached from the carrier's card instead. These two blocks are the two ends of
  // that link -- "also aboard" on the spacecraft, "riding on" on the part.
  aboard: {
    label: 'Also aboard',
    openTitle: 'Open the card for this',
    // Said once, on the carrier's card, because it is true of every row in the list and the
    // alternative is a visitor wondering why they cannot tap the thing they can see.
    note: 'These have no dot of their own. They are exactly where this spacecraft is, because they are bolted to it.',
    ridingLabel: 'Riding on',
    backTitle: 'Open the card for the spacecraft carrying this',
  },

  // The myth block. On this subject the debunk is reliably the better story: Alan Shepard's golf
  // shot was 40 yards and not 200, the Roadster never goes near the asteroid belt, and the
  // tardigrades on the Moon are dehydrated tuns in epoxy. Every correction in the registry
  // carries a source, because a debunk with no source is a rumour going the other way.
  myth: {
    label: 'Often said',
    line: '{claim} — {correction}',
    // For a myth that is not settled. The Beatles story is disputed by the man who produced the
    // Golden Record; saying "wrong" would be making the same mistake in the other direction.
    contested: 'Often said, and genuinely disputed: {claim} — {correction}',
  },

  unplaced: {
    why: '{whyUnknown}',
  },

  source: {
    prefix: 'Source',
    unknown: 'Source not recorded',
    fetched: 'read {age}',
  },

  // Photo mode (public #288, ui/photomode.js): Share's "Photo mode". Everything off the screen, a
  // frame in one of four shapes, and the picture saved through the postcard's own path.
  photo: {
    title: 'Compose a picture',
    barLabel: 'Picture',
    shapesLabel: 'Shape',
    shapes: { '16:9': '16:9', '1:1': '1:1', '4:5': '4:5', '9:16': '9:16' },
    shapeTitle: 'Frame the picture at {shape}',
    caption: 'Caption',
    captionTitle: 'The strip with the name, the date and the address',
    save: 'Save picture',
    saveTitle: 'Save what is inside the frame as a JPEG',
    saveTitlePng: 'Save what is inside the frame as a PNG',
    lens: 'Lens',
    lensValue: '{n}°',
    lensTitle: 'Field of view, {n} degrees. Narrow is a long lens; wide takes in more',
    png: 'PNG',
    pngTitle: 'Save without loss, as a larger file',
    done: 'Leave photo mode',
    making: 'Making the picture',
    saved: 'Picture saved',
    failed: 'The picture could not be made just now',
    // The strip's last line: a composed picture travels without the card that says how it was drawn.
    honesty: 'Drawn from measured positions, not a photograph',
  },

  // Spec 0051: what you can see tonight (sky/tonight.js tonightWords). The place is a guess from the
  // device's time zone unless the visitor set one, and says so; the Tonight tab (spec 0061) shows it.
  tonight: {
    title: 'Tonight',
    // One line each in the sidebar (spec 0061 req 11).
    placeGuess: 'Near {place}, guessed from your time zone',
    placeSet: 'From {place}',
    // The browser gave the coordinates and no name: the place is the visitor's own, and "near"
    // because the app keeps it only to a tenth of a degree, about 11 km (spec 0051 req 3).
    placeMine: 'From near your place',
    placeShared: 'From {place}, shared with you',
    noPlace: 'Set where you are to see what passes over.',
    coords: '{lat}, {lon}',
    working: 'Working out tonight’s passes…',
    // "International Space Station · 21:03 · from SW to NE, about five fists above the horizon at
    // its highest (52°) · 5 min": direction and fist words are the card's own (copy/en.js above).
    passLine: '{name} · {time} · from {from} to {to}, {fists} at its highest ({deg}°) · {mins} min',
    startsIn: 'Starts in {countdown}',
    // Scrubbed, a countdown from a clock that is not now would count to nothing: the clock time.
    startsAt: 'Starts at {time}',
    upNow: 'Up now, look {dir}',
    showMe: 'Show me',
    showMeTitle: 'Open the sky from your place, facing where it rises',
    guessCaveat: 'Times can be a few minutes off where you are.',
    // THE PASS AS DRAWN (spec 0061 task 5, ui/tonight.js): the name, three numbers with their
    // units under them, and the way it goes. passLine above stays the whole account: the block's
    // accessible name and a list row's tooltip.
    unitRises: 'rises',
    unitHigh: 'at its highest',
    unitLong: 'min in view',
    degrees: '{deg}°',
    path: 'From {from} to {to}',
    rowDetail: '{time} · {deg} up · {mins} min',
    // Nothing tonight: the empty line, and the next one on a line of its own.
    nothingTonight: 'Nothing bright passes over tonight.',
    nextPass: 'Next: {when} · {name}',
    nothingAtAll: 'Nothing bright passes over for three days.',
    darkFrom: 'Dark from {time}',
    darkUntil: 'Dark until {time}',
    darkNow: 'Dark now',
    neverDark: 'It does not get dark tonight',
    moonRises: 'Moon {pct} %, rises {time}',
    moonUp: 'Moon {pct} %, up now',
    moonDown: 'Moon {pct} %, below the horizon',
    more: 'More passes',
    fewer: 'Fewer passes',
    arcLabel: 'Its path across the sky: rises in the {from}, highest {deg}° up, sets in the {to}',
    // The arc's compass letters (ui/skyarc.js), as the trajectory chart spells its N and S.
    cardinals: { N: 'N', E: 'E', S: 'S', W: 'W' },
    // TONIGHT'S BEST (internal #358, sky/tonightbest.js): one ranked list, one line a row. A pass
    // is its three moments in one mono line (pub #448): appears, highest, gone.
    best: {
      title: 'Tonight’s best',
      nothing: 'Nothing stands out tonight.',
      rowTitle: 'Show it on the sky',
      passLine: '{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}',
      // Brightness, at the right of a row's name: lower is brighter, and a dash is "not known".
      mag: 'mag {mag}',
      passAria: '{name}: appears {t0} {d0}, highest {t1} at {deg}° {d1}, gone {t2} {d2}, magnitude {mag}.',
      fades: 'It fades into the Earth’s shadow before it sets.',
      appears: 'It comes out of the Earth’s shadow part-way up.',
      notVisible: 'Not visible: the sky is bright or it is in shadow.',
      rocket: 'Rocket body · {name}',
      debris: 'Debris · {name}',
      planetLine: 'best {time} · {deg}° up, {dir}',
      moonTitle: 'Moon · {phase} · {pct} %',
      moonSets: 'sets {time}',
      moonRises: 'rises {time}',
      moonAllNight: 'up all night',
      phases: {
        new: 'new', waxingCrescent: 'waxing crescent', firstQuarter: 'first quarter', waxingGibbous: 'waxing gibbous',
        full: 'full', waningGibbous: 'waning gibbous', lastQuarter: 'last quarter', waningCrescent: 'waning crescent',
      },
      showerLine: 'up to {zhr} an hour · best {time}, {dir}',
      // A nebula, a cluster or a galaxy the site has a photograph of (sky/tonightbest.js deepSkyTonight).
      dsoLine: 'best {time} · {deg}° up, {dir} · {how}',
      dsoNeeds: { eye: 'by eye', binoculars: 'binoculars' },
      // "My view faces west" (internal #300): the list limited to a window's part of the sky.
      view: 'My view',
      viewHeight: 'How high it must be',
      facings: { any: 'All round', n: 'North', e: 'East', s: 'South', w: 'West' },
      facingTitles: { any: 'The whole sky', n: 'Only what is best in the north', e: 'Only what is best in the east', s: 'Only what is best in the south', w: 'Only what is best in the west' },
      heights: { 0: 'Any height', 15: 'Above 15°', 30: 'Above 30°' },
      viewNothing: 'Nothing passes through that part of the sky tonight.',
      darkHours: 'Dark {from} to {to}',
      moonless: 'no Moon, a dark night',
      moonBright: 'Moon {pct} % hides faint stars',
      moonFaint: 'Moon {pct} %, little light',
      neverDark: 'It does not get dark tonight.',
      // The three names drawn on a pass's arc across the sky.
      markEnds: '{time} {dir}',
      markPeak: '{time} {deg}°',
      honesty: 'Computed for your place. Brightness is an estimate.',
    },
    // THE SKY'S CONTROLS (internal #351, #356, #357; pub #454), in the Tonight view: the field of
    // view, what is drawn over the stars, how dark the visitor's own sky is, and red light.
    skybar: {
      title: 'The sky',
      field: 'Field of view',
      fields: { eye: 'Eye', binoculars: 'Binoculars', telescope: 'Telescope' },
      fieldNotes: {
        eye: 'As wide as you see. Scroll or pinch to zoom.',
        binoculars: 'A 7° field: fainter stars come out.',
        telescope: 'A 1° field: planets become discs.',
      },
      show: 'Lines and names',
      toggles: { figures: 'Figures', names: 'Names', art: 'Pictures', bounds: 'Borders', sunPath: 'Sun’s path', equator: 'Equator', grid: 'Grid', starGrid: 'Star grid', meteors: 'Meteors', trails: 'Trails', seeThrough: 'See-through ground' },
      toggleTitles: {
        seeThrough: 'Draw the land see-through, to find what is under the horizon',
        figures: 'The constellation figures',
        names: 'Names of constellations and bright stars',
        sunPath: 'The path the Sun, the Moon and the planets keep to',
        equator: 'The sky’s equator, above the Earth’s',
        grid: 'Height and direction, with the north-south line',
        starGrid: 'The grid the stars are mapped on',
        art: 'The western figures as drawings, by Johan Meuris',
        bounds: 'The official borders of the 88 constellations',
        meteors: 'Streaks from the showers active tonight, at tonight’s rate',
        trails: 'Each bright star’s last hour, as a long exposure',
      },
      // The sky's own time (check 15): the night's three moments, and a strip to drag.
      time: 'Time in the sky',
      timeNow: 'Now',
      timeNowTitle: 'Back to the present',
      timeDusk: 'Dusk',
      timeMidnight: 'Midnight',
      timeDawn: 'Dawn',
      timeTitles: { dusk: 'The end of civil twilight this evening', midnight: 'The middle of the night', dawn: 'The start of civil twilight in the morning' },
      timeStrip: 'Drag to turn the sky',
      // Where the night's moments are on the strip (internal #447): HUD units over a tick.
      timeTicks: { dusk: 'Dusk', midnight: 'Mid', dawn: 'Dawn' },
      timeStripAria: 'The sky’s time: drag, or use the arrow keys, ten minutes a step',
      timeAt: '{time} · {phase}',
      timePhases: { day: 'day', golden: 'low Sun', civil: 'civil twilight', nautical: 'nautical twilight', astronomical: 'last twilight', night: 'night' },
      timeNoNight: 'It does not get dark here tonight.',
      timeFar: 'No satellites this far from today: their orbits go stale.',
      // The eyepiece (internal #351): three round fields through a telescope.
      eyepiece: 'Eyepiece',
      eyepieces: { low: 'Low · 1°', medium: 'Medium · 30′', high: 'High · 12′' },
      eyepieceTitles: { low: 'A one-degree field: two full Moons wide', medium: 'Half a degree: the whole Moon', high: 'A fifth of a degree: planets as discs' },
      // What is at the centre (internal #418): the tag without a pointer.
      centre: 'What is at the centre',
      centreTitle: 'Name what the middle of the view is on; Enter opens its card',
      // Which constellation a tap fell in (sky/constellation.js), and after a thing's own words.
      con: { kind: 'constellation', label: '{name}, a constellation.', inside: 'in {name}' },
      // The land under the sky (sky/landscape.js): which of three was drawn, and why.
      landscape: {
        city: 'Skyline: a city’s, drawn. Not your street.',
        hills: 'Skyline: hills, drawn. Not your own.',
        coast: 'Sea to the {dir}, from the water map. Land drawn.',
      },
      artWesternOnly: 'Pictures belong to the western figures',
      // Whose sky (internal #355). Each note says whose reading the figures are and under which
      // licence; registry/skycultures.yaml has the full credit, CREDITS.md repeats it.
      culture: 'Whose sky',
      cultures: { western: 'Western', chinese: 'Chinese', maori: 'Māori', hawaiian: 'Hawaiian' },
      cultureNotes: {
        western: 'The 88 constellations astronomers agreed on in 1922.',
        chinese: 'About 300 small asterisms. One reading of a living sky.',
        maori: 'Six figures. Names differ between iwi; the sky is living.',
        hawaiian: 'A navigator’s star lines, still used to steer by.',
      },
      // Whose work each is, and its licence: owed in full, so these run longer than a line of chrome.
      cultureCredits: {
        western: 'Pictures: Johan Meuris, for Stellarium, Free Art License.',
        chinese: 'Figures: Sun Shuwei and Karrie Berglund, for Stellarium, CC BY-SA 4.0. A documented reconstruction.',
        maori: 'Figures: Dan Smale, for Stellarium, CC BY-SA 4.0. A documented reconstruction.',
        hawaiian: 'Figures: after Nainoa Thompson, by Kamehameha Schools Kapālama, for Stellarium, CC BY-SA 4.0.',
      },
      // Meteors (internal #352): {n} is sky/meteors.js visibleRate() for this sky, rounded.
      meteorNote: '{name}: about {n} an hour in this sky.',
      meteorFew: '{name}: under one an hour in this sky.',
      meteorDown: '{name}: the radiant is down, no streaks.',
      meteorHonest: 'Tonight’s rate is a model. Streaks are illustrative.',
      meteorSporadic: 'No shower tonight. Antihelion source: {n} an hour.',
      darkness: 'Your sky',
      darknessModes: { city: 'City', town: 'Town', dark: 'Dark place' },
      // Auto reads the kind of sky off NASA's map of the Earth's night lights at the place
      // (sky/skyglow.js): an estimate, said as one, and any of the three overrules it.
      darknessAuto: 'Auto',
      darknessAutoTitle: 'Read the kind of sky from the night lights at your place',
      darknessBy: {
        place: 'Estimated from NASA’s map of night lights at your place.',
        reading: 'Reading the night lights at your place.',
        unread: 'The night-lights map could not be read: pick your sky.',
        trip: 'Held by this stop of the trip.',
      },
      darknessNotes: {
        city: 'City: stars to magnitude 4, no Milky Way.',
        town: 'Town edge: stars to magnitude 5.3.',
        dark: 'Dark place: stars to 6.5 and the Milky Way.',
      },
      // Point your phone (internal #450; sky/pointing.js). Phones and tablets only. The sensor is
      // asked for on the press, never before. {name} is a bright thing that is up; {n} is degrees.
      point: {
        row: 'Point your phone',
        on: 'Point your phone',
        title: 'Hold the phone up: the view turns with it',
        note: 'Hold the phone up to the sky and turn. The view follows.',
        noPlace: 'Needs your place, to know which way is north.',
        // The refusal, calm, with how to turn it on; dragging still works.
        denied: 'The phone refused its motion sensor. Dragging still works.',
        deniedHow: 'To allow it: reload, then choose Allow when asked.',
        none: 'No motion sensor answered here. Dragging still works.',
        unsupported: 'This browser gives no motion sensor. Dragging still works.',
        lineUp: 'Line it up',
        lineUpWith: 'Sky off? Drag until {name} lines up.',
        lineUpPlain: 'Sky off? Drag until a bright star lines up.',
        lined: 'Lined up by hand, {n}° from the compass.',
        reset: 'Undo line-up',
        resetTitle: 'Go back to the compass’s own north',
        accuracy: 'The compass says it is good to about {n}°.',
        relative: 'No compass here. Drag the sky to line it up.',
        declination: 'True north: compass corrected {n}° {dir}.',
        east: 'east',
        west: 'west',
        honest: 'North is the phone’s compass. Metal nearby bends it.',
      },
      red: 'Red light',
      redTitle: 'Turn the page red to keep your eyes used to the dark',
      honesty: 'Stars measured, planets computed, air modelled, land drawn.',
    },
  },

  // The controls hint (spec 0068 task 2, ui/keyhint.js): once per visitor, bottom-right. Each
  // keycap is a key the app really answers (tests/test_keyhint.mjs holds them to the code); what a
  // row does is one or two words, how else to do it one word under it.
  keyHint: {
    title: 'Controls',
    titleTouch: 'Gestures',
    label: 'Keys that move the view',
    labelTouch: 'Gestures that move the view',
    close: 'Close',
    closeTitle: 'Close (Escape)',
    does: {
      turn: 'Turn',
      zoom: 'Closer, farther',
      pan: 'Move sideways',
      pick: 'Choose a thing',
      search: 'Search',
      hide: 'Hide all',
      show: 'What to show',
      share: 'Share',
      esc: 'Close',
    },
    how: {
      drag: 'Drag',
      wheel: 'Scroll',
      pinch: 'Pinch',
      two: 'Two fingers',
      tap: 'Tap',
    },
    caps: {
      up: '↑',
      left: '←',
      down: '↓',
      right: '→',
      w: 'W',
      s: 'S',
      plus: '+',
      minus: '−',
      slash: '/',
      pgUp: 'PgUp',
      pgDn: 'PgDn',
      h: 'H',
      l: 'L',
      p: 'P',
      esc: 'Esc',
    },
  },

  // The film (spec 0070, ui/rendermode.js): title card, lower third, end card, thumbnail.
  render: {
    eyebrow: 'Space Radar · a trip',
    site: 'spaceradar.ai',
    fly: 'Fly it yourself',
    music: 'Music: John Bartmann, CC0. Full credits at spaceradar.ai.',
  },

  glossary: {
    title: 'Words on this page',
    hint: 'Tap a term for a plain sentence.',
  },

  // ------------------------------------------------------------------------------------
  // The ten class templates. Each is a lead plus optional clauses; cards.js adds clauses
  // in order while the sentence stays under 160 characters, and never invents a number.
  // The "why now" clause is first in every list, per spec 0013's template table.
  // ------------------------------------------------------------------------------------
  // The card of a wildfire, a volcano or an iceberg (ui/cards.js; data/eonet.js says what each
  // field is). Nothing here is a number: the dates, the size and the names are EONET's.
  earthEvent: {
    kinds: { wildfire: 'Fire', volcano: 'Erupting volcano', iceberg: 'Iceberg' },
    rows: { kind: 'What it is', reported: 'Last report', since: 'Erupting since', first: 'First reported', size: 'Size', where: 'Where', by: 'Reported by' },
    sizeValue: '{n} km²',
    sizeSmall: 'under 1 km²',
    // {agencies} are the ids EONET gives its sources (IRWIN, GDACS, SIVolcano, NATICE).
    by: '{agencies}, through NASA EONET',
    sky: 'It is on the ground. From orbit a fire is a plume of smoke, a volcano a column of ash, an iceberg a white slab on dark water.',
    drawn: 'drawn as a mark at its last reported place; its extent on the ground is not drawn',
    // The honesty line: what the point is, whose it is, and the publisher's own caveat in plain words.
    honesty: 'One point from NASA’s EONET, last reported {date} and read {read}. For looking, not an official record of where or when.',
  },

  templates: {
    // A wildfire, a volcano or an iceberg's first sentence (data/eonet.js): what, and as of when.
    earthevent: {
      lead: {
        wildfire: '{name} is a fire that was here at its last report, {date}',
        volcano: '{name} has been erupting since {date}',
        iceberg: '{name} was here at its last report, {date}',
      },
      size: 'about {n} km² at that report',
    },
    // A tropical cyclone's first sentence (2026-09-28). "whose centre was here" and not "is here":
    // the point is the latest advisory's, and the card's honesty line says how old that is.
    storm: {
      lead: '{name} is {a} {status} whose centre was here {ago}',
      leadUnknown: '{name} is a tropical cyclone whose centre was here {ago}',
      // The clock in the six hours before the advisory: "was here in 2 hours" read as nonsense.
      leadBefore: '{name} is {a} {status} whose centre reaches here {ago}',
      leadBeforeUnknown: '{name} is a tropical cyclone whose centre reaches here {ago}',
      wind: 'the strongest winds on its track, forecast included, reach {n} km/h',
      statuses: {
        hurricane: 'hurricane',
        typhoon: 'typhoon',
        cyclone: 'tropical cyclone',
        storm: 'tropical storm',
        depression: 'tropical depression',
      },
    },
    exotic: {
      leadBlackhole: '{name} is a black hole {dist} light-years away',
      leadPulsar: '{name} is a pulsar {dist} light-years away',
      leadMagnetar: '{name} is a magnetar {dist} light-years away',
      leadStar: '{name} is a star {dist} light-years away',
      leadRange: '{name} is {a} {kind} somewhere between {lo} and {hi} light-years away',
      mass: 'weighing {n} Suns',
      massRange: 'weighing between {lo} and {hi} Suns',
      massMillions: 'weighing {n} million Suns',
      massBillions: 'weighing {n} billion Suns',
      spins: 'turning {n} times a second',
      spinsSlow: 'turning once every {n} seconds',
      kinds: { blackhole: 'black hole', pulsar: 'pulsar', magnetar: 'magnetar', star: 'star' },
    },
    dso: {
      leadHome: '{name} is the galaxy we live in; its centre is {dist} light-years away',
      lead: '{name} is {a} {type} {dist} light-years away',
      leadRange: '{name} is {a} {type} somewhere between {lo} and {hi} light-years away',
      leadUntyped: '{name} is {dist} light-years away',
      size: 'about {n} light-years across',
      // A participle, so it hangs off the sentence: "..., the light you see left it 2.54 million
      // years ago" was a second sentence joined with a comma.
      seenAs: 'seen as it was {n} years ago',
      seenAsMillions: 'seen as it was {n} million years ago',
      constellation: 'in {con}',
      // OpenNGC type codes -> words, for the sentence. The card's row prints the source's own words.
      kinds: { galaxy: 'galaxy', nebula: 'nebula', cluster: 'star cluster', other: 'deep-sky object' },
    },
    exoplanet: {
      lead: '{name} is a planet around the star {host}, {dist} light-years away',
      leadNoHost: '{name} is a planet around another star, {dist} light-years away',
      size: 'about {n} times as wide as Earth',
      sizeSmaller: 'about {n} of Earth’s width',
      mass: '{n} times Earth’s mass',
      year: 'its year lasts {n} days',
      yearHours: 'its year lasts {n} hours',
      found: 'found in {year} by the {method} method',
      foundYear: 'found in {year}',
      asOf: 'from a copy of the catalogue as of {date}',
    },
    star: {
      lead: '{name} is a star {dist} light-years away',
      // The colour goes in the lead: "Proxima Centauri is a star 4.23 light-years away, one of the
      // nearest there are, a red star, the light you see left it 4 years ago" said "star" twice
      // and ran two sentences together with a comma (read on a trip card, 2026-09-22).
      // {a} is article(colour): "an orange star". A literal 'a' printed "Arcturus is ... a orange star".
      leadColour: '{name} is {a} {colour} star {dist} light-years away',
      near: 'one of the nearest there are',
      seenAs: 'seen as it was {n} years ago',
      seenAsMonths: 'seen as it was {n} months ago',
      luminosity: 'shining {n} times as bright as the Sun',
      dimmer: 'shining at {n} of the Sun’s brightness',
      // Spectral class letter -> the colour a person would see. The letters are the physics; the
      // words are what the eye reports, and they are the whole reason to print the class at all.
      colours: { O: 'blue', B: 'blue-white', A: 'white', F: 'yellow-white', G: 'yellow', K: 'orange', M: 'red' },
    },
    station: {
      lead: '{name} is a crewed space station circling Earth',
      whyPass: 'crossing your sky at {time}',
      crew: 'with {crew} people aboard',
      altitude: '{alt} km up',
      speed: 'going round once every {period} minutes',
    },
    satellite: {
      lead: '{name} is a satellite going round the Earth',
      // {kind} is the model route's own name for the type -- "a Dragon spacecraft", "a Starlink V2
      // Mini", "a GLONASS navigation satellite" -- where the route knows one.
      leadKind: '{name} is {kind} going round the Earth',
      // Within DOCKED_KM of a crewed station, right now: measured 2026-09-22, the vehicles at the ISS
      // and Tiangong sit 0.00 to 0.43 km from them and everything else is over 1 600 km away.
      leadDocked: '{name} is {kind} docked at the {station}',
      aSpacecraft: 'a spacecraft',
      // A route for one named telescope (Hubble, Chandra, TESS) carries a proper name, not a type;
      // its class says what it is.
      aTelescope: 'a space telescope',
      whyLaunchedDays: 'launched {n} days ago',
      whyLaunchedYear: 'launched in {year}',
      operator: 'flown by {operator}',
      purpose: '{purpose}',
      altitude: '{alt} km up',
      whyPass: 'crossing your sky at {time}',
    },
    debris: {
      lead: '{name} is a tracked piece of debris',
      origin: 'left over from {origin}',
      brokeUp: 'which broke up in {year}',
      decay: 'expected to fall back into the atmosphere around {date}',
      altitude: '{alt} km up',
      burnsUp: 'almost all of it burns up on the way down',
    },
    rocket: {
      lead: '{name} is a rocket launch',
      leadWithPad: '{name} is a rocket launch from {pad}',
      // A rocket BODY in orbit is catalogued as klass rocket too -- SL-8 R/B, ATLAS CENTAUR 2 -- and
      // the card called a 1970s upper stage "a rocket launch". Spent stages are among the brightest
      // things in the visual layer, so it was one of the commonest cards to be wrong.
      leadStage: '{name} is a spent rocket stage going round the Earth',
      stageLaunched: 'launched in {year}',
      whyCountdown: 'lifting off {when}',
      whyFlown: 'which lifted off {when}',
      destination: 'heading for {destination}',
      missionType: 'a {missionType} mission',
      illustrative: 'the track drawn here is a sketch of the climb, not a measured path',
    },
    probe: {
      lead: '{name} is a spacecraft out in the solar system',
      // A craft round another world (#215): "out in the solar system" was all its card said of
      // where it is, while the rows under it read "In orbit round: Mars" (2026-09-22).
      leadOrbits: '{name} is a spacecraft circling {world}',
      destination: 'on its way to {destination}',
      lightTime: 'far enough that a radio message takes {mins} minutes each way',
      // Under a minute, seconds: LRO's card said "0.022 minutes each way" (2026-09-22).
      lightTimeSeconds: 'near enough that a radio message takes {secs} seconds each way',
      // Past two hours, hours: "1431 minutes each way" was Voyager 1, a day away (2026-09-22).
      lightTimeHours: 'far enough that a radio message takes {hours} hours each way',
      distanceSun: '{au} astronomical units from the Sun',
      milestone: 'with {milestone} due on {date}',
    },
    telescope: {
      lead: '{name} is a space telescope',
      observing: 'pointed at {target} this week',
      station: 'parked at {station}',
      altitude: '{alt} km up',
      sees: 'it sees in {band}',
    },
    asteroid: {
      lead: '{name} is a near-Earth object on its own orbit around the Sun',
      // Ceres, Vesta and Pallas are in the layer too, and each carries `neo: false`: perihelia of
      // 2.1 to 2.5 au, nowhere near Earth. The card called all of them near-Earth objects.
      leadMainBelt: '{name} is an asteroid in the main belt, between Mars and Jupiter',
      // The far-bodies layer (2026-09-22). Its first sentence has to be true of a world 95 au out,
      // and "a near-Earth object" or "in the main belt" is true of none of them but Ceres. Which
      // of these a card uses is decided from the record's own perihelion and aphelion
      // (ui/cards.js farRegion), never from a label somebody typed.
      leadDwarf: '{name} is a dwarf planet on its own orbit around the Sun',
      leadDwarfBelt: '{name} is a dwarf planet in the asteroid belt, between Mars and Jupiter',
      leadDwarfBeyond: '{name} is a dwarf planet beyond Neptune',
      leadDwarfFarBeyond: '{name} is a dwarf planet far beyond Neptune',
      // 'Oumuamua: not bound to the Sun (e 1.20). Which way it is going is the clock's to say --
      // a visitor can wind the app back to before 9 September 2017.
      leadInterstellarOut: '{name} came from another star and is on its way out of the Solar System',
      leadInterstellarIn: '{name} came from another star and is falling in towards the Sun',
      distanceSun: '{au} astronomical units from the Sun',
      whyApproach: "passing Earth on {date} at {ld}× the Moon's distance",
      size: '{size}',
      // Only written when a named source says so (spec 0013 requirement 6).
      willNotHit: 'it will not hit Earth',
    },
    comet: {
      lead: '{name} is a comet on a long loop around the Sun',
      // A periodic comet -- 123P, Halley's -- comes back every few years or decades. "A long loop"
      // was right only for the C/ comets, and the card said it of 123P/West-Hartley, period 7.6 years.
      leadPeriodic: '{name} is a comet that comes round the Sun every {n} years',
      // 2I/Borisov (e 3.36): "a long loop around the Sun" would be the one thing it is not.
      leadInterstellarOut: '{name} is a comet from another star, on its way out of the Solar System',
      leadInterstellarIn: '{name} is a comet from another star, falling in towards the Sun',
      whyPerihelion: 'closest to the Sun on {date}',
      nakedEye: 'bright enough to find without a telescope',
      faint: 'too faint to see without a telescope',
      distanceSun: '{au} astronomical units out',
    },
    // The one plain sentence for an oddity is the registry row's own `fact:`, capped at the
    // card's 160 characters where it is WRITTEN (scripts/check_registry.py) rather than truncated
    // here where it is read. `fallback` is for a row with no fact, which the validator refuses --
    // it exists so the card degrades to a true sentence rather than to an empty one.
    oddity: {
      lead: '{fact}',
      fallback: '{name} is one of the odd things people have sent off the planet',
    },
    site: {
      lead: '{name} is a place on the ground that works with spacecraft',
      leadKind: '{name} is {a} {kind}', // {a}: "an observatory"
      where: 'in {where}',
      whyDsn: 'talking to {spacecraft} right now',
      whyLaunch: 'with {launch} due {when}',
      kinds: {
        pad: 'launch pad',
        dish: 'radio dish',
        observatory: 'observatory',
        tracking: 'tracking station',
      },
    },
    world: {
      lead: '{name} is a world in the solar system',
      leadMoon: '{name} is the Earth’s own moon',
      // The worlds layer holds the Sun too, and "The Sun is a world in the solar system" is wrong.
      leadSun: '{name} is the star at the centre of the solar system',
      // The Moon's distance in kilometres: the comparison chooser picks "x the Moon's distance" for
      // anything in lunar range, and printed "The Moon ... 1.02x the Moon's distance" about itself.
      distanceKm: '{n} km away',
      whyPhase: '{phase} tonight',
      whyRise: 'rising from where you are at {time}',
      distance: '{distance}',
      diameter: 'about {n} km across',
      // What a world IS, where "a world in the solar system" says too little. Only the worlds that
      // came with sourced facts carry a line (registry/worlds.yaml `facts.what` names the page each
      // was read from); the rest keep `lead`. Short on purpose: the distance and the size have to
      // fit after it inside the card's 160 characters.
      leadWhat: '{name} is {what}',
      what: {
        pluto: 'a dwarf planet beyond Neptune, counted as the ninth planet until 2006',
        io: 'one of Jupiter’s four big moons, and the most volcanic world in the solar system',
        europa: 'one of Jupiter’s four big moons, with a salt-water ocean under its ice',
        ganymede: 'Jupiter’s biggest moon and the biggest in the solar system, larger than Mercury',
        callisto: 'one of Jupiter’s four big moons, and the most heavily cratered object in the solar system',
        // Six more (2026-09-22), each from its NASA Science page (registry/worlds.yaml `facts.what`;
        // Titan's landing from `facts.landing`).
        titan: 'Saturn’s biggest moon, under thick orange haze, with methane lakes; Huygens landed there in 2005',
        enceladus: 'a small icy moon of Saturn whose geysers spray the ocean under its ice out into space',
        triton: 'Neptune’s biggest moon; it orbits backwards and is probably a captured Kuiper Belt object',
        charon: 'Pluto’s biggest moon, half Pluto’s size; the two always turn the same faces to each other',
        phobos: 'the larger of Mars’s two moons, a lumpy rock spiralling in towards Mars by 1.8 m a century',
        deimos: 'the smaller of Mars’s two moons, a small lumpy rock covered in craters',
        // Ten more (2026-09-22), each from its NASA Science page or its Wikipedia article, as
        // registry/worlds.yaml `facts.what` records. Short, because the distance and the size have
        // to fit after it: Titania's leaves 60 characters spare at the widest the distance gets.
        mimas: 'Saturn’s innermost round moon, marked by a crater a third as wide as the moon itself',
        tethys: 'Saturn’s fifth largest moon, almost pure water ice, split by a chasm and a huge crater',
        dione: 'an icy moon of Saturn whose trailing side is laced with a network of bright ice cliffs',
        rhea: 'Saturn’s second largest moon, a frozen dirty snowball of ice and rock',
        iapetus: 'Saturn’s third largest moon: one side as dark as coal, the other ten times brighter',
        miranda: 'the smallest of Uranus’s five big moons, with canyons up to 12 times the Grand Canyon’s depth',
        ariel: 'the brightest and youngest-looking of Uranus’s five big moons, cut across by fault valleys',
        umbriel: 'the darkest of Uranus’s big moons, reflecting about a fifth of the light that reaches it',
        titania: 'Uranus’s largest moon, neutral grey, split by fault valleys nearly 1 600 km long',
        oberon: 'Uranus’s second largest moon, dark, cratered, and carrying a mountain 6 km high',
      },
    },
  },
});

// Cards and live facts (2026-10-08; internal #295, #296, #127, #133 to #136, #137): the numbers
// that move on an open card, the six-year distance curve, who is aboard a station, what just
// happened, the oldest things up, links out, and a place to keep or share.
Object.assign(COPY, {
  live: {
    label: 'From Earth now',
    km: 'km',
    light: 'Light takes',
    note: 'Worked out from the orbit drawn. The last digits show it moving, not its place to a kilometre.',
    seconds: '{s} s',
    minSec: '{min} min {s} s',
    hourMinSec: '{h} h {min} min {s} s',
    sparkLabel: 'Distance from Earth',
    sparkAria: 'Distance from Earth from {from} to {to}. {closest}',
    sparkNow: 'now',
    closest: 'Closest: {date} · {dist}',
    closestAbout: 'Closest: about {date} · {dist}',
    // "13 Apr 2029": the button is one line of a 320 px card.
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    shortDate: '{day} {month} {year}',
    closestTitle: 'Set the clock to this closest approach',
    moonDistances: '{n} Moon distances',
    au: '{n} AU',
    sparkNote: 'Worked out from the orbit drawn, a point every six days.',
    sparkApprox: 'This close the date and distance are approximate: the Earth’s pull is left out.',
    upYears: 'Up for {n} years: launched {date}',
    upOneYear: 'Up for 1 year: launched {date}',
    upUnderAYear: 'Up for less than a year: launched {date}',
    upSinceYear: 'Launched in {year}: about {n} years up',
    upSinceYearNew: 'Launched in {year}',
    // Rises, highest and sets for a comet or an asteroid: the sentences are the planets' own
    // (COPY.sky.worldFrom, public #500); this is what the line is worked out from.
    smallBodyHonest: 'Worked out from its orbit for a sea-level horizon. Being up is not being bright enough to see: most need a telescope.',
  },
  crew: {
    label: 'People aboard',
    count: '{n} people aboard',
    countOne: '1 person aboard',
    hint: '{n} aboard',
    person: '{agency} · {days} days up',
    personNoAgency: '{days} days up',
    dockedLabel: 'Docked now, and since when',
    docked: '{port} · {date}',
    asOf: 'Read {age} from Launch Library 2 (The Space Devs).',
    stale: 'Read on {date}: more than two days old, so it may have changed.',
    joined: 'Names are the crews of the vehicles docked now.',
    unmatched: 'The names on file did not match this count, so none are shown.',
    waiting: 'Reading the crew list.',
    none: 'No crew list for this station.',
  },
  happened7: {
    launchesFrom: 'from {place}',
    reached: 'reached orbit',
    failed: 'did not reach orbit',
    partial: 'reached orbit, but not the one planned',
    // The outcome first: the row is one line and its end is what gets cut.
    launchDetail: '{rocket}: {status}, {from}',
    launchDetailNoPlace: '{rocket}: {status}',
    cameDown: 'Came down on {date} (catalogue decay date)',
    debris: 'and {n} pieces of debris',
    debrisOne: 'and 1 piece of debris',
    showAll: 'Show all {n}',
    showFewer: 'Show fewer',
    asOf: 'Launches read {age} from Launch Library 2.',
    stale: 'Launches read on {date}: more than two days old.',
    none: 'Nothing on file for the last seven days.',
    waiting: 'Reading what happened.',
    decays: 'What came down',
    decaysTitle: 'Reads the whole catalogue, about 1.5 MB',
    decaysNone: 'Nothing whole came down in the last seven days.',
    decaysFailed: 'The catalogue could not be read.',
    flyTitle: 'Fly to where it launched from',
    ago: '{age}',
  },
  oldest: {
    label: 'Up the longest',
    row: '{years} years · launched {date}',
    note: 'Payloads and rocket bodies still in orbit, by launch date in the catalogue.',
    showTitle: 'Show it on the map',
  },
  links: {
    row: '{words} · {publisher}',
    title: 'Opens {publisher}’s own page in a new tab',
  },
  placeKeep: {
    remember: 'Remember this place',
    rememberTitle: 'Keeps it in this browser only, to the nearest 0.1°',
    forget: 'Forget this place',
    forgetTitle: 'Removes the place kept in this browser',
    kept: 'Kept in this browser only.',
    share: 'Share this place',
    shareTitle: 'Copies a link that carries this place to the nearest 0.1°',
    copied: 'Link copied. It carries this place to 0.1°.',
    copyFailed: 'The link could not be copied.',
    shared: 'A place shared with you: {name}',
    sharedCoords: '{lat}°, {lon}°',
  },
});
