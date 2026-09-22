// GENERATED from registry/showers.yaml by scripts/gen_showers_js.py. Do not edit.
//
// `python3 scripts/gen_showers_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** The annual showers: nominal peak (MM-DD, it moves by a day between years), ZHR, radiant. */
export const SHOWERS = [
  {
    "id": "quadrantids",
    "display": "Quadrantids",
    "peak": "01-03",
    "zhr": 110,
    "ra_h": 15.33,
    "dec": 49.5,
    "parent": "asteroid 2003 EH1",
    "note": "A sharp peak only a few hours wide, so the date matters more than for any other shower."
  },
  {
    "id": "lyrids",
    "display": "Lyrids",
    "peak": "04-22",
    "zhr": 18,
    "ra_h": 18.17,
    "dec": 34.0,
    "parent": "comet Thatcher",
    "note": "Modest most years, with occasional outbursts nobody predicts."
  },
  {
    "id": "eta-aquariids",
    "display": "Eta Aquariids",
    "peak": "05-06",
    "zhr": 50,
    "ra_h": 22.5,
    "dec": -1.0,
    "parent": "comet Halley",
    "note": "Dust from Halley's comet. Much better from the southern hemisphere."
  },
  {
    "id": "perseids",
    "display": "Perseids",
    "peak": "08-12",
    "zhr": 100,
    "ra_h": 3.22,
    "dec": 58.0,
    "parent": "comet Swift-Tuttle",
    "note": "The one most people have heard of, and warm enough in the north to sit outside for."
  },
  {
    "id": "orionids",
    "display": "Orionids",
    "peak": "10-21",
    "zhr": 20,
    "ra_h": 6.35,
    "dec": 16.0,
    "parent": "comet Halley",
    "note": "Halley's dust again, from the other side of its orbit."
  },
  {
    "id": "leonids",
    "display": "Leonids",
    "peak": "11-17",
    "zhr": 15,
    "ra_h": 10.28,
    "dec": 21.0,
    "parent": "comet Tempel-Tuttle",
    "note": "Quiet now, but it produces a storm roughly every 33 years."
  },
  {
    "id": "geminids",
    "display": "Geminids",
    "peak": "12-14",
    "zhr": 150,
    "ra_h": 7.47,
    "dec": 33.0,
    "parent": "asteroid 3200 Phaethon",
    "note": "The best of the year, and one of two major showers whose parent is an asteroid rather than a comet; the Quadrantids are the other."
  },
  {
    "id": "ursids",
    "display": "Ursids",
    "peak": "12-22",
    "zhr": 10,
    "ra_h": 14.6,
    "dec": 76.0,
    "parent": "comet Tuttle",
    "note": "Small, and circumpolar from the north, so the radiant never sets."
  }
];
