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
        "place": "path",
        "path_at": "1977-09-05T13:59:00Z",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "1979-03-05T12:05:00Z",
        "title": "Closest to Jupiter",
        "text": "It passes 280 000 km from Jupiter, having found a faint ring around the planet.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "saturn",
        "date": "1980-11-12T23:46:00Z",
        "title": "Closest to Saturn",
        "text": "It passes 126 000 km from Saturn, and after Saturn heads north out of the plane of the planets.",
        "place": "path",
        "world": "saturn"
      },
      {
        "id": "pale-blue-dot",
        "date": "1990-02-14",
        "precision": "day",
        "title": "The Pale Blue Dot",
        "text": "From 6 billion km it photographs Earth as a point of light about a pixel in size.",
        "place": "path",
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
        "place": "path"
      },
      {
        "id": "termination-shock",
        "date": "2004-12-16",
        "precision": "day",
        "title": "The termination shock",
        "text": "It reaches the termination shock and enters the heliosheath.",
        "place": "path"
      },
      {
        "id": "interstellar",
        "date": "2012-08-25",
        "precision": "day",
        "title": "Into interstellar space",
        "text": "It becomes the first spacecraft to leave the heliosphere and begins measuring the interstellar environment.",
        "place": "path"
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
        "place": "path",
        "path_at": "1977-08-20T15:32:00Z",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "1979-07-09T22:29:00Z",
        "title": "Closest to Jupiter",
        "text": "It passes 645 000 km from Jupiter and sends back 17 000 new pictures of the planet, its moons and its ring.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "saturn",
        "date": "1981-08-26T01:21:00Z",
        "title": "Closest to Saturn",
        "text": "It passes 101 000 km from Saturn and photographs the spokes and kinks in its rings.",
        "place": "path",
        "world": "saturn"
      },
      {
        "id": "uranus",
        "date": "1986-01-24T17:59:00Z",
        "title": "Closest to Uranus",
        "text": "It passes 81 500 km from Uranus, still the only spacecraft to have been there, and finds ten new moons.",
        "place": "path",
        "world": "uranus"
      },
      {
        "id": "neptune",
        "date": "1989-08-25T03:56:00Z",
        "title": "Closest to Neptune",
        "text": "It flies 4 800 km over Neptune's cloud tops, the closest of its four flybys, and photographs Triton.",
        "place": "path",
        "world": "neptune"
      },
      {
        "id": "termination-shock",
        "date": "2007-08-30",
        "precision": "day",
        "title": "The termination shock",
        "text": "It passes the termination shock and enters the heliosheath.",
        "place": "path"
      },
      {
        "id": "interstellar",
        "date": "2018-11-05",
        "precision": "day",
        "title": "Into interstellar space",
        "text": "It crosses the edge of the heliosphere with a working plasma instrument; Voyager 1's had stopped in 1980.",
        "place": "path",
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
        "place": "path",
        "path_at": "2006-01-19T19:51:00Z",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "2007-02-28T05:43:00Z",
        "title": "Jupiter's push",
        "text": "It swings past Jupiter for a gravity assist that shortens the trip to Pluto by three years.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "pluto",
        "date": "2015-07-14",
        "precision": "day",
        "title": "Closest to Pluto",
        "text": "It comes within 12 500 km of Pluto and photographs a vast heart-shaped glacier of nitrogen ice.",
        "place": "path",
        "path_at": "2015-07-14T11:48:00Z",
        "world": "pluto"
      },
      {
        "id": "arrokoth",
        "date": "2019-01-01T05:33:00Z",
        "title": "Arrokoth",
        "text": "It flies 3 500 km from Arrokoth, an object of the Kuiper belt.",
        "place": "path",
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
        "place": "path",
        "path_at": "2011-08-05T17:19:00Z",
        "world": "earth"
      },
      {
        "id": "earth-flyby",
        "date": "2013-10-09T19:21:00Z",
        "title": "Back past Earth",
        "text": "It flies past Earth, about 559 km up at its closest.",
        "place": "path",
        "world": "earth"
      },
      {
        "id": "arrival",
        "date": "2016-07-05T03:53:00Z",
        "title": "Into orbit round Jupiter",
        "text": "Word reaches Earth that a 35-minute engine burn has put it into a polar orbit of Jupiter.",
        "place": "path",
        "world": "jupiter"
      }
    ]
  },
  {
    "id": "cassini",
    "record": "deep-cassini",
    "display": "Cassini",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Cassini quick facts",
      "url": "https://science.nasa.gov/mission/cassini/quick-facts/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1997-10-15",
        "precision": "day",
        "title": "Launch",
        "text": "Cassini leaves Cape Canaveral on a Titan IVB/Centaur, carrying the Huygens probe.",
        "place": "path",
        "world": "earth"
      },
      {
        "id": "venus-1",
        "date": "1998-04-26",
        "precision": "day",
        "title": "Past Venus",
        "text": "The first of its two passes of Venus on the way out.",
        "place": "path",
        "path_at": "1998-04-26T13:45:00Z",
        "world": "venus"
      },
      {
        "id": "venus-2",
        "date": "1999-06-24",
        "precision": "day",
        "title": "Past Venus again",
        "text": "It passes Venus a second time, 600 km from the planet.",
        "place": "path",
        "path_at": "1999-06-24T20:30:00Z",
        "world": "venus"
      },
      {
        "id": "earth-flyby",
        "date": "1999-08-18",
        "precision": "day",
        "title": "Back past Earth",
        "text": "It flies past Earth, 1 171 km up at its closest.",
        "place": "path",
        "path_at": "1999-08-18T03:28:00Z",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "2000-12-30T10:12:00Z",
        "title": "Past Jupiter",
        "text": "It passes Jupiter at about 10 million km, on its way to Saturn.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "arrival",
        "date": "2004-07-01",
        "precision": "day",
        "title": "Arrival at Saturn",
        "text": "It arrives at Saturn after a journey of nearly seven years.",
        "place": "path",
        "path_at": "2004-07-01T02:39:00Z",
        "world": "saturn"
      },
      {
        "id": "huygens-release",
        "date": "2004-12-24",
        "precision": "day",
        "title": "Huygens let go",
        "text": "The Huygens probe is released towards Titan, Saturn's largest moon.",
        "place": "path",
        "world": "saturn"
      },
      {
        "id": "huygens",
        "date": "2005-01-14T11:30:00Z",
        "title": "Huygens lands on Titan",
        "text": "Huygens lands on Titan after a descent of 2 hours and 27 minutes, the first landing in the outer Solar System.",
        "place": "path",
        "world": "saturn",
        "source": {
          "name": "NASA Science, Huygens probe",
          "url": "https://science.nasa.gov/mission/cassini/spacecraft/huygens-probe/"
        }
      },
      {
        "id": "earth-from-saturn",
        "date": "2013-07-19",
        "precision": "day",
        "title": "Earth, seen from Saturn",
        "text": "From Saturn's shadow it photographs the planet, its rings and, in the background, Earth.",
        "place": "path",
        "world": "saturn",
        "source": {
          "name": "NASA Science, Cassini-Huygens",
          "url": "https://science.nasa.gov/mission/cassini/"
        }
      },
      {
        "id": "grand-finale",
        "date": "2017-04-22",
        "precision": "day",
        "title": "The Grand Finale begins",
        "text": "A last close pass of Titan bends its path to dive between Saturn and its rings, 22 times.",
        "place": "path",
        "world": "saturn",
        "source": {
          "name": "NASA Science, Cassini's Grand Finale",
          "url": "https://science.nasa.gov/mission/cassini/grand-finale/overview/"
        }
      },
      {
        "id": "end",
        "date": "2017-09-15",
        "precision": "day",
        "title": "Into Saturn",
        "text": "It plunges into Saturn's atmosphere, sending data for as long as its thrusters can hold the antenna on Earth.",
        "place": "path",
        "path_at": "2017-09-15T10:30:00Z",
        "world": "saturn",
        "source": {
          "name": "NASA Science, Cassini's Grand Finale",
          "url": "https://science.nasa.gov/mission/cassini/grand-finale/overview/"
        }
      }
    ]
  },
  {
    "id": "galileo",
    "record": "deep-galileo",
    "display": "Galileo",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Galileo",
      "url": "https://science.nasa.gov/mission/galileo/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1989-10-18",
        "precision": "day",
        "title": "Launch",
        "text": "Galileo leaves the ground in the cargo bay of the space shuttle Atlantis.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "deployed",
        "date": "1989-10-18T23:15:00Z",
        "title": "Out of the shuttle",
        "text": "Atlantis lets Galileo and its upper stage go from the cargo bay, bound first for Venus.",
        "place": "path",
        "path_at": "1989-10-19T01:29:00Z",
        "world": "earth"
      },
      {
        "id": "venus",
        "date": "1990-02-10",
        "precision": "day",
        "title": "Past Venus",
        "text": "It passes Venus 16 000 km up, the first of three gravity assists.",
        "place": "path",
        "path_at": "1990-02-10T05:59:00Z",
        "world": "venus"
      },
      {
        "id": "earth-1",
        "date": "1990-12-08",
        "precision": "day",
        "title": "Back past Earth",
        "text": "It swings past Earth 960 km up, onto a two-year orbit of the Sun.",
        "place": "path",
        "path_at": "1990-12-08T20:34:00Z",
        "world": "earth"
      },
      {
        "id": "gaspra",
        "date": "1991-10-29",
        "precision": "day",
        "title": "The first asteroid visit",
        "text": "It passes 1 601 km from Gaspra, the first spacecraft to meet an asteroid.",
        "place": "path"
      },
      {
        "id": "earth-2",
        "date": "1992-12-08",
        "precision": "day",
        "title": "Past Earth a second time",
        "text": "A second pass of Earth, 303 km up, sends it on towards Jupiter.",
        "place": "path",
        "path_at": "1992-12-08T15:10:00Z",
        "world": "earth"
      },
      {
        "id": "ida",
        "date": "1993-08-28",
        "precision": "day",
        "title": "Ida and its moon",
        "text": "It passes the asteroid Ida and finds it has a moon, Dactyl, the first seen round an asteroid.",
        "place": "path"
      },
      {
        "id": "arrival",
        "date": "1995-12-07",
        "precision": "day",
        "title": "Into orbit round Jupiter",
        "text": "It enters orbit round Jupiter on the day its probe dives into the planet's atmosphere.",
        "place": "path",
        "path_at": "1995-12-07T21:54:00Z",
        "world": "jupiter"
      },
      {
        "id": "end",
        "date": "2003-09-21",
        "precision": "day",
        "title": "Into Jupiter",
        "text": "After 34 orbits it is flown into Jupiter, to keep it from ever striking Europa.",
        "place": "path",
        "world": "jupiter"
      }
    ]
  },
  {
    "id": "dawn",
    "record": "deep-dawn",
    "display": "Dawn",
    "read": "2026-10-07",
    "source": {
      "name": "NASA NSSDCA, Dawn",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A"
    },
    "events": [
      {
        "id": "launch",
        "date": "2007-09-27T11:34:00Z",
        "title": "Launch",
        "text": "Dawn leaves Cape Canaveral on a Delta II, bound for the asteroid belt.",
        "place": "path",
        "path_at": "2007-09-27T12:40:00Z",
        "world": "earth"
      },
      {
        "id": "mars",
        "date": "2009-02-18T00:28:00Z",
        "title": "Past Mars",
        "text": "It passes within 542 km of the surface of Mars, which bends its path outwards.",
        "place": "path",
        "world": "mars"
      },
      {
        "id": "vesta",
        "date": "2011-07-16",
        "precision": "day",
        "title": "Into orbit round Vesta",
        "text": "Dawn reaches the asteroid Vesta and uses its thrusters to go into orbit.",
        "place": "path"
      },
      {
        "id": "leaves-vesta",
        "date": "2012-09-05T06:26:00Z",
        "title": "Leaving Vesta",
        "text": "It departs Vesta for Ceres.",
        "place": "path"
      },
      {
        "id": "ceres",
        "date": "2015-03-06T12:29:00Z",
        "title": "Into orbit round Ceres",
        "text": "It enters its first orbit round the dwarf planet Ceres.",
        "place": "path"
      },
      {
        "id": "end",
        "date": "2018-10-31",
        "precision": "day",
        "title": "The last contact",
        "text": "Communications end. Dawn stays in orbit round Ceres.",
        "place": "path",
        "path_at": "2018-10-31T00:00:00Z"
      }
    ]
  },
  {
    "id": "pioneer-10",
    "record": "deep-pioneer-10",
    "display": "Pioneer 10",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Pioneer 10",
      "url": "https://science.nasa.gov/mission/pioneer-10/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1972-03-03T01:49:00Z",
        "title": "Launch",
        "text": "Pioneer 10 leaves Cape Canaveral on an Atlas-Centaur, the first spacecraft sent to the outer Solar System.",
        "place": "path",
        "path_at": "1972-03-03T02:04:00Z",
        "world": "earth",
        "source": {
          "name": "NASA NSSDCA, Pioneer 10",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-012A"
        }
      },
      {
        "id": "asteroid-belt",
        "date": "1972-07-15",
        "precision": "day",
        "title": "Into the asteroid belt",
        "text": "It enters the asteroid belt, and comes out the far side in February 1973.",
        "place": "path"
      },
      {
        "id": "jupiter",
        "date": "1973-12-04T02:26:00Z",
        "title": "Closest to Jupiter",
        "text": "It races past Jupiter at a range of 130 354 km.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "neptune-orbit",
        "date": "1983-06-13",
        "precision": "day",
        "title": "Past the farthest planet",
        "text": "It crosses the orbit of Neptune, the first human-made object to go beyond the planets.",
        "place": "path"
      },
      {
        "id": "last-signal",
        "date": "2003-01-23",
        "precision": "day",
        "title": "The last signal",
        "text": "Its last signal is received, sent from 12.23 billion km away.",
        "place": "path"
      }
    ]
  },
  {
    "id": "pioneer-11",
    "record": "deep-pioneer-11",
    "display": "Pioneer 11",
    "read": "2026-10-06",
    "source": {
      "name": "NASA Science, Pioneer 11",
      "url": "https://science.nasa.gov/mission/pioneer-11/"
    },
    "events": [
      {
        "id": "launch",
        "date": "1973-04-06T02:11:00Z",
        "title": "Launch",
        "text": "Pioneer 11, the sister craft of Pioneer 10, leaves Earth.",
        "place": "path",
        "path_at": "1973-04-06T02:25:00Z",
        "world": "earth"
      },
      {
        "id": "jupiter",
        "date": "1974-12-03T05:22:00Z",
        "title": "Closest to Jupiter",
        "text": "It passes 42 500 km over Jupiter's cloud tops, three times closer than Pioneer 10.",
        "place": "path",
        "world": "jupiter"
      },
      {
        "id": "saturn",
        "date": "1979-09-01T16:31:00Z",
        "title": "The first craft at Saturn",
        "text": "It passes Saturn at a range of about 20 900 km, the first spacecraft to study the planet up close.",
        "place": "path",
        "world": "saturn"
      },
      {
        "id": "neptune-orbit",
        "date": "1990-02-23",
        "precision": "day",
        "title": "Past the orbit of Neptune",
        "text": "It crosses the orbit of Neptune, the fourth spacecraft to do so.",
        "place": "path"
      },
      {
        "id": "last-contact",
        "date": "1995-09-30",
        "precision": "day",
        "title": "The last contact",
        "text": "The last contact with Pioneer 11, then 44.1 astronomical units from Earth.",
        "place": "path"
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
        "place": "path",
        "path_at": "2021-12-25T13:01:00Z",
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
        "place": "path",
        "world": "earth"
      },
      {
        "id": "first-images",
        "date": "2022-07-12",
        "precision": "day",
        "title": "The first pictures",
        "text": "The first full-colour images are shown, a deep field and the edge of the Carina Nebula among them.",
        "place": "path",
        "world": "earth",
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
        "place": "site",
        "record": "saturn-v-lc-39a",
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
    "id": "saturn-v",
    "record": "saturn-v-lc-39a",
    "display": "Saturn V",
    "read": "2026-10-08",
    "source": {
      "name": "NASA NSSDCA, Apollo 11 Command and Service Module",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059A"
    },
    "events": [
      {
        "id": "apollo-8",
        "date": "1968-12-21T12:51:00Z",
        "title": "Apollo 8 leaves for the Moon",
        "text": "The first Saturn V to carry people sends Borman, Lovell and Anders to orbit the Moon.",
        "place": "site",
        "source": {
          "name": "NASA NSSDCA, Apollo 8",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1968-118A"
        }
      },
      {
        "id": "apollo-11",
        "date": "1969-07-16T13:32:00Z",
        "title": "Apollo 11 leaves for the Moon",
        "text": "Armstrong, Aldrin and Collins lift off from pad 39A. Four days later two of them land.",
        "place": "site"
      },
      {
        "id": "apollo-17",
        "date": "1972-12-07T05:33:00Z",
        "title": "Apollo 17, at night",
        "text": "The last crew to the Moon leaves after a delay of 2 hours 40 minutes: the first night launch of an Apollo.",
        "place": "site",
        "source": {
          "name": "NASA NSSDCA, Apollo 17 Command and Service Module",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096A"
        }
      }
    ]
  },
  {
    "id": "space-shuttle",
    "record": "shuttle-lc-39b",
    "display": "Space Shuttle",
    "read": "2026-10-08",
    "source": {
      "name": "NASA NSSDCA, STS 31",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1990-037A"
    },
    "events": [
      {
        "id": "sts-26",
        "date": "1988-09-29",
        "precision": "day",
        "title": "Flying again",
        "text": "Discovery launches on STS-26, the first Shuttle flight after the loss of Challenger.",
        "place": "site",
        "source": {
          "name": "NASA NSSDCA, STS 26",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1988-091A"
        }
      },
      {
        "id": "sts-31",
        "date": "1990-04-24",
        "precision": "day",
        "title": "Hubble goes up",
        "text": "Discovery launches on STS-31 with the Hubble Space Telescope in its payload bay.",
        "place": "site"
      },
      {
        "id": "sts-116",
        "date": "2006-12-10",
        "precision": "day",
        "title": "The last Shuttle from 39B",
        "text": "Discovery launches at night on STS-116, the last Space Shuttle to leave from this pad.",
        "place": "site",
        "source": {
          "name": "NASA NSSDCA, STS 116",
          "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2006-055A"
        }
      }
    ]
  },
  {
    "id": "near-shoemaker",
    "record": "deep-near",
    "display": "NEAR Shoemaker",
    "read": "2026-10-08",
    "source": {
      "name": "NASA NSSDCA, NEAR Shoemaker",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-008A"
    },
    "events": [
      {
        "id": "launch",
        "date": "1996-02-17",
        "precision": "day",
        "title": "Launch",
        "text": "NEAR leaves Earth for the asteroid Eros.",
        "place": "none",
        "world": "earth"
      },
      {
        "id": "eros-orbit",
        "date": "2000-02-14",
        "precision": "day",
        "title": "Into orbit round Eros",
        "text": "NEAR goes into orbit round the asteroid Eros.",
        "place": "path"
      },
      {
        "id": "touchdown",
        "date": "2001-02-12",
        "precision": "day",
        "title": "Down on Eros",
        "text": "At the end of its mission it is set down on the surface of Eros, and goes on sending for two weeks.",
        "place": "path"
      }
    ]
  },
  {
    "id": "stardust",
    "record": "deep-stardust",
    "display": "Stardust",
    "read": "2026-10-08",
    "source": {
      "name": "NASA NSSDCA, Stardust",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1999-003A"
    },
    "events": [
      {
        "id": "launch",
        "date": "1999-02-07",
        "precision": "day",
        "title": "Launch",
        "text": "Stardust leaves Earth for comet Wild 2.",
        "place": "path",
        "path_at": "1999-02-07T21:32:00Z"
      },
      {
        "id": "wild-2",
        "date": "2004-01-02",
        "precision": "day",
        "title": "Through the coma of Wild 2",
        "text": "It makes its closest pass of comet Wild 2.",
        "place": "path"
      },
      {
        "id": "capsule",
        "date": "2006-01-15",
        "precision": "day",
        "title": "The capsule lands",
        "text": "The sample capsule comes down on Earth while the spacecraft flies on.",
        "place": "path"
      },
      {
        "id": "tempel-1",
        "date": "2011-02-15",
        "precision": "day",
        "title": "Past Tempel 1",
        "text": "On a second mission it passes comet Tempel 1, the comet Deep Impact struck.",
        "place": "path"
      }
    ]
  },
  {
    "id": "deep-impact",
    "record": "deep-deep-impact",
    "display": "Deep Impact",
    "read": "2026-10-08",
    "source": {
      "name": "NASA NSSDCA, Deep Impact",
      "url": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2005-001A"
    },
    "events": [
      {
        "id": "launch",
        "date": "2005-01-12",
        "precision": "day",
        "title": "Launch",
        "text": "Deep Impact leaves Earth carrying an impactor for comet Tempel 1.",
        "place": "path",
        "path_at": "2005-01-12T19:23:00Z"
      },
      {
        "id": "impact",
        "date": "2005-07-04",
        "precision": "day",
        "title": "The impact",
        "text": "Its impactor strikes comet Tempel 1 while the spacecraft watches from a distance.",
        "place": "path"
      },
      {
        "id": "hartley-2",
        "date": "2010-11-04",
        "precision": "day",
        "title": "Past Hartley 2",
        "text": "On an extended mission it flies past a second comet, Hartley 2.",
        "place": "path"
      }
    ]
  },
  {
    "id": "perseverance",
    "record": "jezero",
    "path_record": "deep-mars-2020",
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
        "place": "path",
        "path_at": "2020-07-30T12:52:00Z",
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
  },
  {
    "id": "apophis",
    "record": "asteroid-99942",
    "display": "Apophis",
    "read": "2026-10-07",
    "source": {
      "name": "NASA Science, Apophis",
      "url": "https://science.nasa.gov/solar-system/asteroids/apophis/"
    },
    "events": [
      {
        "id": "discovery",
        "date": "2004-06-19",
        "precision": "day",
        "title": "Discovered",
        "text": "Roy Tucker, David Tholen and Fabrizio Bernardi find it from Kitt Peak National Observatory in Arizona.",
        "place": "none"
      },
      {
        "id": "earth-2029",
        "date": "2029-04-13",
        "precision": "day",
        "title": "Past Earth",
        "text": "Apophis passes about 32 000 km above the ground, closer than many satellites in geosynchronous orbit. It will miss.",
        "place": "path",
        "path_at": "2029-04-13T21:45:00Z",
        "world": "earth",
        "predicted": true
      }
    ]
  }
];
