// GENERATED from site/data/eph/manifest.json by scripts/build_ephemerides.py. Do not edit.
//
// What a browser needs to know about each craft's own path (internal #277): the file, its span,
// how well it follows JPL's track, and what JPL says of the track itself. `python3
// scripts/build_ephemerides.py --check` fails CI if this file, the manifest and the .bin files
// disagree. Imported by propagate/ephemeris.js, which nothing at boot imports.

/** The centre byte of a segment, in order. */
export const EPH_CENTRES = ["sun", "mercury", "venus", "earth", "moon", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];

/** Record id -> its path file. Times are UTC. */
export const EPHEMERIDES = {
  "deep-voyager-1": {
    "file": "deep-voyager-1.bin",
    "bytes": 29736,
    "name": "Voyager 1",
    "from": "1977-09-05T13:59:00Z",
    "to": "2031-01-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-31",
    "solution": "Voyager_1_ST+refit2022_m",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "1981-01-01T00:00:00Z",
      "text": "JPL calls its Voyager 1 path before 1981 a mission-design trajectory of rough accuracy, fitted to the encounters; from 1981 it is a refit of the tracking data."
    }
  },
  "deep-voyager-2": {
    "file": "deep-voyager-2.bin",
    "bytes": 33784,
    "name": "Voyager 2",
    "from": "1977-08-20T15:32:00Z",
    "to": "2031-01-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-32",
    "solution": "Voyager_2_ST+refit2022_m",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "1989-08-29T00:00:00Z",
      "text": "JPL calls its Voyager 2 path before 29 August 1989 a mission-design trajectory of rough accuracy, fitted to the encounters; after it, a refit of the tracking data."
    }
  },
  "deep-new-horizons": {
    "file": "deep-new-horizons.bin",
    "bytes": 17656,
    "name": "New Horizons",
    "from": "2006-01-19T19:51:00Z",
    "to": "2031-01-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-98",
    "solution": "NH_merged",
    "retrieved": "2026-10-08"
  },
  "deep-juno": {
    "file": "deep-juno.bin",
    "bytes": 134096,
    "name": "Juno",
    "from": "2011-08-05T17:19:00Z",
    "to": "2026-08-24T00:00:00Z",
    "goodToKm": 100.0,
    "horizonsId": "-61",
    "solution": "Juno_merged",
    "retrieved": "2026-10-08"
  },
  "deep-cassini": {
    "file": "deep-cassini.bin",
    "bytes": 249976,
    "name": "Cassini",
    "from": "1997-10-15T09:27:00Z",
    "to": "2017-09-15T10:30:00Z",
    "goodToKm": 100.0,
    "horizonsId": "-82",
    "solution": "cassini_merge",
    "retrieved": "2026-10-08"
  },
  "deep-galileo": {
    "file": "deep-galileo.bin",
    "bytes": 78524,
    "name": "Galileo",
    "from": "1989-10-19T01:29:00Z",
    "to": "2003-09-21T18:00:00Z",
    "goodToKm": 200.0,
    "horizonsId": "-77",
    "solution": "galileo_merged",
    "retrieved": "2026-10-08"
  },
  "deep-pioneer-10": {
    "file": "deep-pioneer-10.bin",
    "bytes": 27564,
    "name": "Pioneer 10",
    "from": "1972-03-03T02:04:00Z",
    "to": "2031-01-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-23",
    "solution": "pioneer_10_merged",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "2031-01-01T00:00:00Z",
      "text": "JPL says of this Pioneer 10 trajectory that it is suitable for general historical purposes; it was built on the planetary ephemeris of the 1970s."
    }
  },
  "deep-pioneer-11": {
    "file": "deep-pioneer-11.bin",
    "bytes": 33180,
    "name": "Pioneer 11",
    "from": "1973-04-06T02:25:00Z",
    "to": "2031-01-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-24",
    "solution": "pioneer_11_merged",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "2031-01-01T00:00:00Z",
      "text": "JPL says of this Pioneer 11 trajectory that it is suitable for general historical purposes; it was built on the planetary ephemeris of the 1970s."
    }
  },
  "deep-jwst": {
    "file": "deep-jwst.bin",
    "bytes": 12688,
    "name": "James Webb Space Telescope",
    "from": "2021-12-25T13:01:00Z",
    "to": "2026-10-26T00:00:00Z",
    "goodToKm": 20.0,
    "horizonsId": "-170",
    "solution": "JWST_merged",
    "retrieved": "2026-10-08"
  },
  "deep-mars-2020": {
    "file": "deep-mars-2020.bin",
    "bytes": 3528,
    "name": "Mars 2020",
    "from": "2020-07-30T12:52:00Z",
    "to": "2021-02-18T20:30:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-168",
    "solution": "Mars2020_merged",
    "retrieved": "2026-10-08"
  },
  "deep-dawn": {
    "file": "deep-dawn.bin",
    "bytes": 149404,
    "name": "Dawn",
    "from": "2007-09-27T12:40:00Z",
    "to": "2018-10-31T00:00:00Z",
    "goodToKm": 2000.0,
    "horizonsId": "-203",
    "solution": "dawn_final",
    "retrieved": "2026-10-08"
  },
  "deep-rosetta": {
    "file": "deep-rosetta.bin",
    "bytes": 10520,
    "name": "Rosetta",
    "from": "2004-03-02T09:26:00Z",
    "to": "2016-09-30T10:39:00Z",
    "goodToKm": 2000.0,
    "horizonsId": "-226",
    "solution": "rosetta_merged",
    "retrieved": "2026-10-08"
  },
  "deep-near": {
    "file": "deep-near.bin",
    "bytes": 5456,
    "name": "NEAR Shoemaker",
    "from": "1996-02-19T01:59:00Z",
    "to": "2001-02-12T19:44:00Z",
    "goodToKm": 2000.0,
    "horizonsId": "-93",
    "solution": "NEAR_merged",
    "retrieved": "2026-10-08"
  },
  "deep-stardust": {
    "file": "deep-stardust.bin",
    "bytes": 45588,
    "name": "Stardust",
    "from": "1999-02-07T21:32:00Z",
    "to": "2011-03-12T23:58:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-29",
    "solution": "stardust",
    "retrieved": "2026-10-08"
  },
  "deep-deep-impact": {
    "file": "deep-deep-impact.bin",
    "bytes": 41556,
    "name": "Deep Impact",
    "from": "2005-01-12T19:23:00Z",
    "to": "2013-09-19T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-140",
    "solution": "epoxi_merged",
    "retrieved": "2026-10-08"
  },
  "asteroid-99942": {
    "file": "asteroid-99942.bin",
    "bytes": 18532,
    "name": "Apophis",
    "from": "2026-10-01T00:00:00Z",
    "to": "2029-12-31T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "99942;",
    "solution": "JPL#220",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "2029-12-31T00:00:00Z",
      "text": "This is a prediction from JPL's orbit solution for Apophis, not a record of what happened."
    }
  },
  "deep-osiris-apex": {
    "file": "deep-osiris-apex.bin",
    "bytes": 24384,
    "name": "OSIRIS-APEX",
    "from": "2026-10-01T00:00:00Z",
    "to": "2030-03-01T00:00:00Z",
    "goodToKm": 10.0,
    "horizonsId": "-64",
    "solution": "ORX_merged",
    "retrieved": "2026-10-08",
    "rough": {
      "until": "2030-03-01T00:00:00Z",
      "text": "This is the mission's planned trajectory as JPL holds it, not a record of what happened."
    }
  }
};
