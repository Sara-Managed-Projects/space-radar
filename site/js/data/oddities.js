// GENERATED from registry/oddities.yaml by scripts/gen_oddities_js.py. Do not edit.
//
// `python3 scripts/gen_oddities_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// A row is A CLAIM ABOUT A PLACE. `where.kind` says what KIND of answer "where is it?" has and
// `position_class` says HOW WELL we know it -- two fields, because the Tesla Roadster is in a
// real orbit nobody has looked at since 2018 and Beresheet is on a surface with a published
// 20 m error ellipse, and one field cannot say both.
//
// The evidence a reviewer reads -- full Horizons headers, element dumps, the reason a secondary
// source was used -- stays in the YAML and is not shipped. `cite` is the one line the card prints.
//
// The records these rows become are built hand-written next door in data/sample.js.

/** When registry/oddities.yaml was last checked against its sources. */
export const ODDITIES_OBSERVED_ON = "2026-09-07";

/** Every odd thing we sent, and the evidence for where it is now. */
export const ODDITIES = [
  {
    "id": "tesla-roadster",
    "display": "Tesla Roadster (Starman)",
    "klass": "oddity",
    "where": {
      "kind": "in_orbit",
      "frame": "sun-inertial",
      "horizons_id": "-143205",
      "elements": {
        "epoch_jd": 2461290.5,
        "a_au": 1.325285903087775,
        "e": 0.2559399569483128,
        "i_deg": 1.074796068637285,
        "node_deg": 316.8731402746523,
        "argp_deg": 177.7855717204305,
        "tp_jd": 2461496.674258765
      },
      "evidence_epoch": "2018-03-19"
    },
    "position_class": "inferred",
    "orbit_provenance": {
      "solution": "JPL solution #11, revised 2025-01-03",
      "obs_count": 374,
      "arc": "2018-02-08 to 2018-03-19",
      "caveat": "JPL warns the trajectory error may grow faster than the formal statistics say, from unmodelled thermal re-radiation"
    },
    "shape": {
      "build": "generic",
      "budget_tris": 1800,
      "stands_for": "generic",
      "drawn_name": "the first-generation Tesla Roadster"
    },
    "fact": "A cherry-red sports car with a dummy at the wheel, launched on the first Falcon Heavy and now looping round the Sun between Earth and Mars.",
    "myths": [
      {
        "claim": "it is heading for the asteroid belt",
        "correction": "its furthest point from the Sun is 1.66 au and the belt starts near 2.1 au. It will never reach Mars either.",
        "source": "CNBC and Space.com, 8 February 2018, correcting the launch-day statement"
      },
      {
        "claim": "it is tracked",
        "correction": "nobody has observed it since March 2018. Everything shown here is a calculation from elements fitted to 374 old photographs.",
        "source": "JPL Horizons object header for -143205"
      }
    ],
    "cite": "JPL Horizons, target −143205, read 2026-09-07"
  },
  {
    "id": "shepard-golf-balls",
    "display": "Alan Shepard's golf balls",
    "klass": "oddity",
    "where": {
      "kind": "on_surface",
      "world": "moon",
      "anchor": {
        "id": "apollo-14",
        "lat": -3.64589,
        "lon": 342.52806,
        "uncertainty_m": 0.4,
        "of": "the Apollo 14 lunar module Antares"
      },
      "object": {
        "precision_m": 40,
        "how": "photogrammetric"
      }
    },
    "position_class": "inferred",
    "shape": {
      "build": "generic",
      "budget_tris": 520,
      "stands_for": "generic",
      "drawn_name": "two golf balls and the six-iron head"
    },
    "fact": "Alan Shepard smuggled a six-iron head to the Moon in a sock, screwed it to a sample scoop handle, and hit two balls one-handed. They are still lying there.",
    "myths": [
      {
        "claim": "the second ball went 200 yards, or miles and miles and miles",
        "correction": "measured from the film in 2021: 24 yards and 40 yards. The most-repeated fact about golf on the Moon is about five times too big.",
        "source": "Andy Saunders, 2021, via Astronomy and Space.com"
      }
    ],
    "cite": "LROC spacecraft coordinates · Andy Saunders, 2021, from Hasselblad stills and 16 mm film"
  },
  {
    "id": "duke-family-photo",
    "display": "Charlie Duke's family photo",
    "klass": "oddity",
    "where": {
      "kind": "on_surface",
      "world": "moon",
      "anchor": {
        "id": "apollo-16",
        "lat": -8.9734,
        "lon": 15.5011,
        "uncertainty_m": 3.0,
        "of": "the Apollo 16 lunar module Orion"
      },
      "object": {
        "precision_m": "unknown",
        "how": "unsurveyed"
      }
    },
    "position_class": "inferred",
    "shape": {
      "build": "generic",
      "budget_tris": 70,
      "stands_for": "generic",
      "drawn_name": "a shrink-wrapped family snapshot lying in the dust"
    },
    "fact": "Charlie Duke left a photograph of his wife and two sons face-up in the lunar dust, took a picture of it, and walked away.",
    "myths": [
      {
        "claim": "the photograph is still there to be seen",
        "correction": "the plastic and the paper are still at Descartes; the image is not. Surface temperature at the site reaches about 120 °C in daylight.",
        "source": "NASA image AS16-117-18841; Charlie Duke interview, Fox News, Apollo 16 at 50"
      }
    ],
    "cite": "LROC spacecraft coordinates · NASA image AS16-117-18841"
  },
  {
    "id": "beresheet-lunar-library",
    "display": "The Beresheet lunar library",
    "klass": "oddity",
    "where": {
      "kind": "on_surface",
      "world": "moon",
      "object": {
        "lat": 32.5956,
        "lon": 19.3496,
        "precision_m": 20,
        "how": "orbital_imaging"
      }
    },
    "position_class": "measured",
    "shape": {
      "build": "generic",
      "budget_tris": 620,
      "stands_for": "generic",
      "drawn_name": "a stack of nickel discs and a tardigrade"
    },
    "fact": "An Israeli lander crashed here carrying 25 nickel discs holding thirty million pages, with dried tardigrades and human DNA set in resin between the layers.",
    "myths": [
      {
        "claim": "tardigrades are living on the Moon",
        "correction": "they were dehydrated tuns encased in epoxy. Cryptobiosis is a pause button, not life support, and this mare has no accessible water.",
        "source": "EarthSky, on the Beresheet lunar library"
      },
      {
        "claim": "the library survived the crash intact",
        "correction": "that is the payload owner's own claim, from orbital imagery that cannot resolve a 100-gram stack of discs.",
        "source": "Arch Mission Foundation; LROC post 1101"
      }
    ],
    "cite": "LROC post 1101, the Beresheet impact site · NASA"
  },
  {
    "id": "voyager-golden-record",
    "display": "The Voyager Golden Record",
    "klass": "oddity",
    "where": {
      "kind": "attached",
      "to": "deep-voyager-1",
      "also_on": [
        "deep-voyager-2"
      ],
      "mount": {
        "x": 0.0,
        "y": -0.35,
        "z": 0.62,
        "face": "bus_side"
      },
      "mount_class": "illustrative"
    },
    "position_class": "inherit",
    "shape": {
      "build": "generic",
      "budget_tris": 340,
      "stands_for": "generic",
      "drawn_name": "the Golden Record and its cover"
    },
    "fact": "Two gold-plated records bolted to the outside of two spacecraft carry whale song, greetings in 55 languages, and an hour of a woman's brainwaves.",
    "myths": [
      {
        "claim": "EMI blocked the Beatles' Here Comes the Sun from the record",
        "correction": "disputed by Timothy Ferris, who produced it and says it was never seriously considered. Contested, not settled.",
        "contested": true,
        "source": "Timothy Ferris, via the Planetary Society"
      }
    ],
    "cite": "The Planetary Society, The Voyager Golden Records · NASA"
  },
  {
    "id": "juno-lego-figures",
    "display": "The three LEGO figures on Juno",
    "klass": "oddity",
    "where": {
      "kind": "attached",
      "to": "deep-juno",
      "mount": {
        "x": 0.0,
        "y": 0.18,
        "z": 0.44,
        "face": "deck"
      },
      "mount_class": "illustrative"
    },
    "position_class": "inherit",
    "shape": {
      "build": "generic",
      "budget_tris": 560,
      "stands_for": "generic",
      "drawn_name": "three aluminium minifigures and their props"
    },
    "fact": "Three tiny aluminium LEGO people have been riding through Jupiter's radiation belts since 2011: Galileo, Jupiter, and his wife Juno.",
    "myths": [
      {
        "claim": "Juno is dead, so the figures are gone",
        "correction": "neither is established. The mission's funding lapsed on 30 September 2025, but JPL's reconstructed ephemeris runs to 24 August 2026.",
        "source": "JPL Horizons trajectory segments for -61; Space.com on Juno's uncertain end"
      }
    ],
    "cite": "JPL Horizons target −61 · Space.com on Juno's uncertain end",
    "as_of": "2026-09-07"
  },
  {
    "id": "rotj-lightsaber",
    "display": "Luke Skywalker's lightsaber",
    "klass": "oddity",
    "where": {
      "kind": "came_home",
      "world": "earth",
      "lat": 29.5518,
      "lon": -95.0982,
      "where_kept": "Space Center Houston, Texas",
      "left_space": "2007-11-07"
    },
    "position_class": "measured",
    "shape": {
      "build": "generic",
      "budget_tris": 260,
      "stands_for": "generic",
      "drawn_name": "the Graflex 3-cell flash handle the prop was built on"
    },
    "fact": "The lightsaber prop from Return of the Jedi spent fourteen days in orbit sealed in foam, and never once came out of its box.",
    "myths": [
      {
        "claim": "the lightsaber is in space",
        "correction": "it flew up and back on STS-120 in October 2007, stowed where no astronaut could reach it, and was handed back to Lucasfilm.",
        "source": "Space.com, on the STS-120 lightsaber"
      }
    ],
    "cite": "Space.com and collectSPACE on STS-120 · Space Center Houston"
  },
  {
    "id": "bean-astronaut-pin",
    "display": "Alan Bean's silver astronaut pin",
    "klass": "oddity",
    "where": {
      "kind": "unknown",
      "last_known": "somewhere near the Apollo 12 landing site, in an unidentified crater",
      "why_unknown": "Bean threw it as hard as he could. No source names the crater and no orbital image has ever resolved a lapel pin.",
      "would_need": "an LROC targeted observation, and it would not resolve it anyway"
    },
    "position_class": "inferred",
    "shape": {
      "build": "generic",
      "budget_tris": 180,
      "stands_for": "generic",
      "drawn_name": "a lapel pin"
    },
    "fact": "You wear the silver astronaut pin until your first spaceflight. Alan Bean had worn his for six years, so on the Moon he threw it into a crater.",
    "cite": "Astronomical Returns, The astronaut pin and the lone star on the Moon",
    "as_of": "2026-09-07"
  }
];
