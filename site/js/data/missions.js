// GENERATED from registry/missions.yaml by scripts/gen_missions_js.py. Do not edit.
//
// `python3 scripts/gen_missions_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML, where each row's source and what
// `place` means are written down.

/** The missions with an event list: the record whose card shows it, its source, its dated events in order. */
export const MISSIONS = [
  {
    "id": "voyager-1",
    "record": "deep-voyager-1",
    "display": "Voyager 1",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Voyager 1",
      "url": "https://science.nasa.gov/mission/voyager/voyager-1/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1977-09-05T12:56:00Z",
        "title": "Launch",
        "text": "Voyager 1 leaves Cape Canaveral on a Titan IIIE-Centaur, after its twin and on a faster route.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "1979-03-05T12:05:00Z",
        "title": "Closest to Jupiter",
        "text": "It passes 280 000 km from Jupiter, having found a faint ring around the planet.",
        "place": "none",
        "world": "jupiter"
      },
      {
        "id": "saturn",
        "date": "1980-11-12T23:46:00Z",
        "title": "Closest to Saturn",
        "text": "It passes 126 000 km from Saturn, and after Saturn heads north out of the plane of the planets.",
        "place": "none",
        "world": "saturn"
      },
      {
        "id": "pale-blue-dot",
        "date": "1990-02-14",
        "precision": "day",
        "title": "The Pale Blue Dot",
        "text": "From 6 billion km it photographs Earth as a point of light about a pixel in size.",
        "place": "cruise",
        "source": {
          "name": "NASA Science, Voyager 1's Pale Blue Dot",
          "url": "https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot/"
        }
      },
      {
        "id": "most-distant",
        "date": "1998-02-17",
        "precision": "day",
        "title": "The most distant thing we made",
        "text": "At 69.4 astronomical units from the Sun it overtakes Pioneer 10 as the most distant human-made object.",
        "place": "cruise"
      },
      {
        "id": "termination-shock",
        "date": "2004-12-16",
        "precision": "day",
        "title": "The termination shock",
        "text": "It reaches the termination shock and enters the heliosheath.",
        "place": "cruise"
      },
      {
        "id": "interstellar",
        "date": "2012-08-25",
        "precision": "day",
        "title": "Into interstellar space",
        "text": "It becomes the first spacecraft to leave the heliosphere and begins measuring the interstellar environment.",
        "place": "cruise"
      }
    ]
  },
  {
    "id": "voyager-2",
    "record": "deep-voyager-2",
    "display": "Voyager 2",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Voyager 2",
      "url": "https://science.nasa.gov/mission/voyager/voyager-2/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1977-08-20T14:29:00Z",
        "title": "Launch",
        "text": "Voyager 2 leaves Cape Canaveral on a Titan IIIE-Centaur.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "1979-07-09T22:29:00Z",
        "title": "Closest to Jupiter",
        "text": "It passes 645 000 km from Jupiter and sends back 17 000 new pictures of the planet, its moons and its ring.",
        "place": "none",
        "world": "jupiter"
      },
      {
        "id": "saturn",
        "date": "1981-08-26T01:21:00Z",
        "title": "Closest to Saturn",
        "text": "It passes 101 000 km from Saturn and photographs the spokes and kinks in its rings.",
        "place": "none",
        "world": "saturn"
      },
      {
        "id": "uranus",
        "date": "1986-01-24T17:59:00Z",
        "title": "Closest to Uranus",
        "text": "It passes 81 500 km from Uranus, still the only spacecraft to have been there, and finds ten new moons.",
        "place": "none",
        "world": "uranus"
      },
      {
        "id": "neptune",
        "date": "1989-08-25T03:56:00Z",
        "title": "Closest to Neptune",
        "text": "It flies 4 800 km over Neptune's cloud tops, the closest of its four flybys, and photographs Triton.",
        "place": "none",
        "world": "neptune"
      },
      {
        "id": "termination-shock",
        "date": "2007-08-30",
        "precision": "day",
        "title": "The termination shock",
        "text": "It passes the termination shock and enters the heliosheath.",
        "place": "cruise"
      },
      {
        "id": "interstellar",
        "date": "2018-11-05",
        "precision": "day",
        "title": "Into interstellar space",
        "text": "It crosses the edge of the heliosphere with a working plasma instrument; Voyager 1's had stopped in 1980.",
        "place": "cruise",
        "source": {
          "name": "NASA, Voyager 2 probe enters interstellar space",
          "url": "https://science.nasa.gov/missions/voyager-program/voyager-2/nasas-voyager-2-probe-enters-interstellar-space/"
        }
      }
    ]
  },
  {
    "id": "new-horizons",
    "record": "deep-new-horizons",
    "display": "New Horizons",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, New Horizons",
      "url": "https://science.nasa.gov/mission/new-horizons/"
    },
    "events": [
      {
        "id": "launch",
        "date": "2006-01-19T19:00:00Z",
        "title": "Launch",
        "text": "New Horizons leaves Cape Canaveral on an Atlas V 551.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "2007-02-28T05:43:00Z",
        "title": "Jupiter's push",
        "text": "It swings past Jupiter for a gravity assist that shortens the trip to Pluto by three years.",
        "place": "none",
        "world": "jupiter"
      },
      {
        "id": "pluto",
        "date": "2015-07-14",
        "precision": "day",
        "title": "Closest to Pluto",
        "text": "It comes within 12 500 km of Pluto and photographs a vast heart-shaped glacier of nitrogen ice.",
        "place": "none",
        "world": "pluto"
      },
      {
        "id": "arrokoth",
        "date": "2019-01-01T05:33:00Z",
        "title": "Arrokoth",
        "text": "It flies 3 500 km from Arrokoth, an object of the Kuiper belt.",
        "place": "cruise",
        "source": {
          "name": "NASA NSSDCA, New Horizons",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2006-001A"
        }
      }
    ]
  },
  {
    "id": "juno",
    "record": "deep-juno",
    "display": "Juno",
    "read": "2026-10-06",
    "source": {
      "name": "NASA NSSDCA, Juno",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-040A"
    },
    "events": [
      {
        "id": "launch",
        "date": "2011-08-05T16:25:00Z",
        "title": "Launch",
        "text": "Juno leaves Cape Canaveral on an Atlas V 551.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "earth-flyby",
        "date": "2013-10-09T19:21:00Z",
        "title": "Back past Earth",
        "text": "It flies past Earth, about 559 km up at its closest.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "arrival",
        "date": "2016-07-05T03:53:00Z",
        "title": "Into orbit round Jupiter",
        "text": "Word reaches Earth that a 35-minute engine burn has put it into a polar orbit of Jupiter.",
        "place": "none",
        "world": "jupiter"
      }
    ]
  },
  {
    "id": "webb",
    "record": "deep-jwst",
    "display": "James Webb Space Telescope",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Webb",
      "url": "https://science.nasa.gov/mission/webb/"
    },
    "events": [
      {
        "id": "launch",
        "date": "2021-12-25T12:20:00Z",
        "title": "Launch",
        "text": "Webb leaves Kourou, French Guiana, on an Ariane 5.",
        "place": "none",
        "world": "earth",
        "source": {
          "name": "NASA NSSDCA, James Webb Space Telescope",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2021-130A"
        }
      },
      {
        "id": "l2",
        "date": "2022-01-24",
        "precision": "day",
        "title": "Arrival at L2",
        "text": "It arrives at L2, 1.5 million km from Earth.",
        "place": "none"
      },
      {
        "id": "first-images",
        "date": "2022-07-12",
        "precision": "day",
        "title": "The first pictures",
        "text": "The first full-colour images are shown, a deep field and the edge of the Carina Nebula among them.",
        "place": "none",
        "source": {
          "name": "NASA, Webb's first images",
          "url": "https://www.nasa.gov/news-release/nasa-reveals-webb-telescopes-first-images-of-unseen-universe/"
        }
      }
    ]
  },
  {
    "id": "apollo-11",
    "record": "apollo-11",
    "display": "Apollo 11",
    "read": "2026-10-06",
    "source": {
      "name": "NASA, Apollo 11 mission overview",
      "url": "https://www.nasa.gov/history/apollo-11-mission-overview/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1969-07-16T13:32:00Z",
        "title": "Launch",
        "text": "Armstrong, Aldrin and Collins leave Cape Kennedy on a Saturn V.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "lunar-orbit",
        "date": "1969-07-19T17:22:00Z",
        "title": "Into orbit round the Moon",
        "text": "Behind the Moon and out of contact with Earth, the engine fires to put the spacecraft in lunar orbit.",
        "place": "none",
        "world": "moon"
      },
      {
        "id": "landing",
        "date": "1969-07-20T20:17:00Z",
        "title": "The Eagle has landed",
        "text": "Eagle lands in the Sea of Tranquility, flown partly by hand by Armstrong.",
        "place": "site"
      },
      {
        "id": "first-step",
        "date": "1969-07-21T02:56:00Z",
        "title": "One small step",
        "text": "Armstrong steps onto the surface. Aldrin follows 19 minutes later.",
        "place": "site",
        "source": {
          "name": "NASA NSSDCA, Apollo 11 Lunar Module",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C"
        }
      },
      {
        "id": "liftoff",
        "date": "1969-07-21T17:54:00Z",
        "title": "Leaving the Moon",
        "text": "After 21 hours and 36 minutes on the surface, Eagle's ascent stage lifts off.",
        "place": "site"
      },
      {
        "id": "splashdown",
        "date": "1969-07-24T16:50:00Z",
        "title": "Splashdown",
        "text": "Columbia splashes down in the Pacific after a flight of 8 days and 3 hours.",
        "place": "none",
        "world": "earth"
      }
    ]
  },
  {
    "id": "perseverance",
    "record": "jezero",
    "display": "Perseverance",
    "read": "2026-10-06",
    "source": {
      "name": "NASA NSSDCA, Mars 2020 Perseverance",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2020-052A"
    },
    "events": [
      {
        "id": "launch",
        "date": "2020-07-30T11:50:00Z",
        "title": "Launch",
        "text": "Perseverance leaves Cape Canaveral on an Atlas V, carrying the Ingenuity helicopter.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "landing",
        "date": "2021-02-18T20:55:00Z",
        "title": "Landing in Jezero",
        "text": "The rover lands in Jezero crater after a seven-month cruise. The time is when the signal reached Earth.",
        "place": "site"
      },
      {
        "id": "first-flight",
        "date": "2021-04-19T07:34:00Z",
        "title": "The first flight",
        "text": "Ingenuity flies for 39.1 seconds, hovering 3 metres up for 30 of them.",
        "place": "site"
      },
      {
        "id": "first-core",
        "date": "2021-09-06",
        "precision": "day",
        "title": "The first rock core",
        "text": "The rover seals Montdenier, its first core of rock and its second sample, in a tube.",
        "place": "site",
        "source": {
          "name": "NASA Science, Mars rock samples",
          "url": "https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/"
        }
      }
    ]
  },
  {
    "id": "iss",
    "record": "sat-25544",
    "display": "International Space Station",
    "read": "2026-10-06",
    "source": {
      "name": "NASA, International Space Station reference",
      "url": "https://www.nasa.gov/reference/international-space-station/"
    },
    "events": [
      {
        "id": "unity",
        "date": "1998-12-06",
        "precision": "day",
        "title": "Two become one",
        "text": "The shuttle Endeavour's robot arm captures Zarya and mates it to Unity: the first two modules are joined.",
        "place": "none",
        "source": {
          "name": "NASA, STS-88",
          "url": "https://www.nasa.gov/mission/sts-88/"
        }
      },
      {
        "id": "first-crew",
        "date": "2000-11-02",
        "precision": "day",
        "title": "People move in",
        "text": "Expedition 1 docks. The station has been continuously inhabited since.",
        "place": "none"
      },
      {
        "id": "last-shuttle",
        "date": "2011-07-08",
        "precision": "day",
        "title": "The last shuttle sets off",
        "text": "Atlantis launches on STS-135, the final Space Shuttle mission, with supplies and spare parts for the station.",
        "place": "none",
        "source": {
          "name": "NASA, STS-135",
          "url": "https://www.nasa.gov/mission/sts-135/"
        }
      }
    ]
  }
];
