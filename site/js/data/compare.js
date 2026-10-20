// GENERATED from registry/compare.yaml by scripts/gen_compare_js.py. Do not edit.
//
// `python3 scripts/gen_compare_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML. Read by ui/compare.js, which is
// fetched when a card's Compare row is opened and never at boot.

/** The day the NASA pages were read, as YYYY-MM-DD. */
export const COMPARE_READ = "2026-10-20";

/** What the Compare view and the comparison lab say about a world: NASA's Planetary Fact Sheets, one row a body. */
export const COMPARE_BODIES = [
  {
    "world": "sun",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
    "updated": "2024-05-09",
    "radius_km": 695700,
    "mass_e": 332900,
    "gravity": 274.0,
    "temp_c": 5499,
    "temp_at": "effective",
    "spin_h": 609.12,
    "year_d": null,
    "sun_mkm": null,
    "air": [
      [
        "hydrogen",
        90.965
      ],
      [
        "helium",
        8.889
      ]
    ],
    "air_bar": null,
    "moons": null,
    "rings": false
  },
  {
    "world": "mercury",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html",
    "updated": "2024-01-11",
    "radius_km": 2439.7,
    "mass_e": 0.0553,
    "gravity": 3.7,
    "temp_c": 167,
    "temp_at": "surface",
    "spin_h": 1407.6,
    "year_d": 87.969,
    "sun_mkm": 57.909,
    "air": [],
    "air_bar": 5e-15,
    "exosphere": true,
    "moons": 0,
    "rings": false
  },
  {
    "world": "venus",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html",
    "updated": "2024-01-11",
    "radius_km": 6051.8,
    "mass_e": 0.815,
    "gravity": 8.87,
    "temp_c": 464,
    "temp_at": "surface",
    "spin_h": 5832.6,
    "retro": true,
    "year_d": 224.701,
    "sun_mkm": 108.21,
    "air": [
      [
        "carbon dioxide",
        96.5
      ],
      [
        "nitrogen",
        3.5
      ]
    ],
    "air_bar": 92,
    "moons": 0,
    "rings": false
  },
  {
    "world": "earth",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html",
    "updated": "2024-11-15",
    "radius_km": 6371.0,
    "mass_e": 1,
    "gravity": 9.82,
    "temp_c": 15,
    "temp_at": "surface",
    "spin_h": 23.9345,
    "year_d": 365.256,
    "sun_mkm": 149.598,
    "air": [
      [
        "nitrogen",
        78.08
      ],
      [
        "oxygen",
        20.95
      ]
    ],
    "air_bar": 1.014,
    "moons": 1,
    "rings": false
  },
  {
    "world": "moon",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html",
    "updated": "2024-01-11",
    "radius_km": 1737.4,
    "mass_e": 0.0123,
    "gravity": 1.62,
    "temp_c": -20,
    "temp_at": "surface",
    "spin_h": 655.72,
    "year_d": null,
    "sun_mkm": 149.598,
    "air": [],
    "air_bar": 3e-15,
    "exosphere": true,
    "moons": 0,
    "rings": false
  },
  {
    "world": "mars",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html",
    "updated": "2025-05-19",
    "radius_km": 3389.5,
    "mass_e": 0.107,
    "gravity": 3.73,
    "temp_c": -59,
    "temp_at": "surface",
    "spin_h": 24.6229,
    "year_d": 686.98,
    "sun_mkm": 227.956,
    "air": [
      [
        "carbon dioxide",
        95.1
      ],
      [
        "nitrogen",
        2.59
      ],
      [
        "argon",
        1.94
      ]
    ],
    "air_bar": 0.00636,
    "moons": 2,
    "rings": false
  },
  {
    "world": "jupiter",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html",
    "updated": "2024-10-02",
    "radius_km": 69911,
    "mass_e": 317.83,
    "gravity": 25.92,
    "temp_c": -108,
    "temp_at": "bar1",
    "spin_h": 9.925,
    "year_d": 4332.589,
    "sun_mkm": 778.479,
    "air": [
      [
        "hydrogen",
        89.8
      ],
      [
        "helium",
        10.2
      ]
    ],
    "air_bar": null,
    "moons": 95,
    "rings": true,
    "rings_page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupringfact.html",
    "ring_bands": [
      [
        89400,
        123000,
        0.1
      ],
      [
        123000,
        128940,
        0.25
      ]
    ]
  },
  {
    "world": "saturn",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html",
    "updated": "2025-03-18",
    "radius_km": 58232,
    "mass_e": 95.16,
    "gravity": 11.19,
    "temp_c": -139,
    "temp_at": "bar1",
    "spin_h": 10.656,
    "year_d": 10755.699,
    "sun_mkm": 1432.041,
    "air": [
      [
        "hydrogen",
        96.3
      ],
      [
        "helium",
        3.25
      ]
    ],
    "air_bar": null,
    "moons": 274,
    "rings": true,
    "rings_page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html",
    "ring_bands": [
      [
        74658,
        91975,
        0.3
      ],
      [
        91975,
        117507,
        1
      ],
      [
        122340,
        136780,
        0.7
      ],
      [
        139826,
        139826,
        0.4
      ]
    ]
  },
  {
    "world": "uranus",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html",
    "updated": "2024-10-02",
    "radius_km": 25362,
    "mass_e": 14.54,
    "gravity": 9.01,
    "temp_c": -197,
    "temp_at": "bar1",
    "spin_h": 17.24,
    "retro": true,
    "year_d": 30685.4,
    "sun_mkm": 2867.043,
    "air": [
      [
        "hydrogen",
        82.5
      ],
      [
        "helium",
        15.2
      ],
      [
        "methane",
        2.3
      ]
    ],
    "air_bar": null,
    "moons": 28,
    "rings": true,
    "rings_page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html",
    "ring_bands": [
      [
        41837,
        41837,
        0.4
      ],
      [
        42234,
        42234,
        0.4
      ],
      [
        42571,
        42571,
        0.4
      ],
      [
        44718,
        44718,
        0.4
      ],
      [
        45661,
        45661,
        0.4
      ],
      [
        47176,
        47176,
        0.4
      ],
      [
        47627,
        47627,
        0.4
      ],
      [
        48300,
        48300,
        0.4
      ],
      [
        50024,
        50024,
        0.4
      ],
      [
        51149,
        51149,
        0.7
      ]
    ]
  },
  {
    "world": "neptune",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html",
    "updated": "2024-10-03",
    "radius_km": 24622,
    "mass_e": 17.15,
    "gravity": 11.27,
    "temp_c": -201,
    "temp_at": "bar1",
    "spin_h": 16.11,
    "year_d": 60189.018,
    "sun_mkm": 4514.953,
    "air": [
      [
        "hydrogen",
        80.0
      ],
      [
        "helium",
        19.0
      ],
      [
        "methane",
        1.5
      ]
    ],
    "air_bar": null,
    "moons": 16,
    "rings": true,
    "rings_page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/nepringfact.html",
    "ring_bands": [
      [
        41900,
        41900,
        0.2
      ],
      [
        53200,
        53200,
        0.3
      ],
      [
        53200,
        57200,
        0.15
      ],
      [
        62933,
        62933,
        0.5
      ]
    ]
  },
  {
    "world": "pluto",
    "page": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html",
    "updated": "2024-01-11",
    "radius_km": 1188,
    "mass_e": 0.0022,
    "gravity": 0.62,
    "temp_c": [
      -249,
      -235
    ],
    "temp_at": "surface",
    "spin_h": 153.2928,
    "retro": true,
    "year_d": 90560,
    "sun_mkm": 5869.656,
    "air": [
      [
        "nitrogen",
        99
      ],
      [
        "methane",
        0.5
      ]
    ],
    "air_bar": 1.3e-05,
    "moons": 5,
    "rings": false
  }
];
