// GENERATED from registry/exotics.yaml by scripts/gen_exotics_js.py. Do not edit.
//
// `python3 scripts/gen_exotics_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// Every row is a fact sheet with the page its numbers were read from; the generator turned the
// source's hours-minutes-seconds into degrees and a range into low/high/mid. data/layers.js turns
// these into `static` records on the sun-inertial axes.

/** Black holes and other extremes, one fact sheet each, with the source it was read from. */
export const EXOTICS = [
  {
    "id": "sgr-a-star",
    "name": "Sagittarius A*",
    "kind": "blackhole",
    "why": "The black hole at the centre of our galaxy, four million Suns in one point. Every star on this map goes round it.",
    "aliases": [
      "Sgr A*",
      "galactic centre black hole"
    ],
    "source": "https://en.wikipedia.org/wiki/Sagittarius_A* (infobox, read 2026-09-08)",
    "raDeg": 266.416837,
    "decDeg": -29.007811,
    "distLy": 26996,
    "massMsun": 4297000
  },
  {
    "id": "m87-star",
    "name": "M87*",
    "kind": "blackhole",
    "why": "The first black hole anyone photographed: the orange ring of 2019. Six and a half billion Suns, at the heart of the galaxy M87.",
    "aliases": [
      "Powehi",
      "Virgo A black hole"
    ],
    "source": "https://en.wikipedia.org/wiki/Messier_87 (infobox and the M87* section; EHT 2019 mass, read 2026-09-08)",
    "raDeg": 187.705931,
    "decDeg": 12.391123,
    "distLy": 53500000,
    "massMsun": 6500000000
  },
  {
    "id": "cygnus-x-1",
    "name": "Cygnus X-1",
    "kind": "blackhole",
    "why": "The first black hole anyone was sure of, found in 1964 by its X-rays. It is eating a blue supergiant, HDE 226868.",
    "aliases": [
      "Cyg X-1"
    ],
    "source": "https://en.wikipedia.org/wiki/Cygnus_X-1 (infobox, read 2026-09-08)",
    "raDeg": 299.590316,
    "decDeg": 35.201607,
    "distLy": 7300,
    "massMsunLow": 13.8,
    "massMsunHigh": 17.5,
    "massMsun": 15.65
  },
  {
    "id": "gaia-bh1",
    "name": "Gaia BH1",
    "kind": "blackhole",
    "why": "The nearest known black hole, found in 2022 by the wobble of the Sun-like star that orbits it. It is quiet: nothing falls in.",
    "source": "https://en.wikipedia.org/wiki/Gaia_BH1 (infobox, read 2026-09-08)",
    "raDeg": 262.171236,
    "decDeg": -0.580979,
    "distLy": 1560,
    "massMsun": 9.27
  },
  {
    "id": "gaia-bh3",
    "name": "Gaia BH3",
    "kind": "blackhole",
    "why": "The heaviest black hole from a dead star in our galaxy, thirty-three Suns, found in 2024 in the Gaia data.",
    "source": "https://en.wikipedia.org/wiki/Gaia_BH3 (infobox, read 2026-09-08)",
    "raDeg": 294.827958,
    "decDeg": 14.931667,
    "distLy": 1936,
    "massMsun": 33.08
  },
  {
    "id": "v404-cygni",
    "name": "V404 Cygni",
    "kind": "blackhole",
    "why": "A black hole that flares: in 2015 it lit up brighter than anything else in the X-ray sky for two weeks, then went quiet again.",
    "source": "https://en.wikipedia.org/wiki/V404_Cygni (infobox, read 2026-09-08)",
    "raDeg": 306.015917,
    "decDeg": 33.867222,
    "distLy": 7800,
    "massMsun": 9
  },
  {
    "id": "ton-618",
    "name": "TON 618",
    "kind": "blackhole",
    "why": "One of the heaviest black holes known, forty billion Suns, so far away that its light left before the Earth existed.",
    "source": "https://en.wikipedia.org/wiki/TON_618 (infobox; 2019 mass estimate, read 2026-09-08)",
    "distance_note": "light-travel distance; redshift 2.219, so its light left 10.8 billion years ago and the object is farther now",
    "raDeg": 187.10375,
    "decDeg": 31.477222,
    "distLy": 10800000000,
    "massMsun": 40700000000
  },
  {
    "id": "crab-pulsar",
    "name": "Crab Pulsar",
    "kind": "pulsar",
    "why": "What was left when a star seen exploding in 1054 collapsed: a city-sized star spinning thirty times a second, inside the Crab Nebula (M1).",
    "aliases": [
      "PSR B0531+21"
    ],
    "source": "https://en.wikipedia.org/wiki/Crab_Pulsar (infobox, read 2026-09-08)",
    "raDeg": 83.633125,
    "decDeg": 22.0145,
    "distLy": 6200,
    "periodS": 0.0333924123
  },
  {
    "id": "vela-pulsar",
    "name": "Vela Pulsar",
    "kind": "pulsar",
    "why": "The brightest pulsar in the gamma-ray sky, eleven times a second, from a supernova about eleven thousand years ago.",
    "aliases": [
      "PSR B0833-45"
    ],
    "source": "https://en.wikipedia.org/wiki/Vela_Pulsar (infobox, read 2026-09-08)",
    "raDeg": 128.836064,
    "decDeg": -45.176432,
    "distLy": 959,
    "periodS": 0.089328385024
  },
  {
    "id": "psr-b1919-21",
    "name": "PSR B1919+21",
    "kind": "pulsar",
    "why": "The first pulsar ever found, by Jocelyn Bell Burnell in 1967. Its tick was so regular it was nicknamed LGM-1: Little Green Men.",
    "aliases": [
      "LGM-1",
      "CP 1919"
    ],
    "source": "https://en.wikipedia.org/wiki/PSR_B1919%2B21 (infobox, read 2026-09-08)",
    "raDeg": 290.436729,
    "decDeg": 21.883958,
    "distLyLow": 300,
    "distLyHigh": 3600,
    "distLy": 1950.0,
    "periodS": 1.3373021601895
  }
];
