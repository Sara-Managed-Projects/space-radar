// GENERATED from registry/weather.yaml by scripts/gen_weather_js.py. Do not edit.
//
// `python3 scripts/gen_weather_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// OFF THE FIRST VISIT: only scene/weather/*.js imports this, and main.js imports those dynamically.
// A profile's points are [latitude in degrees, wind in m/s with the rotation]; the YAML says where
// each was read and how simplified it is.

/** Every weather effect: its world, what is drawn, and how much of it is known (measured, modelled or illustrative). */
export const WEATHER = [
  {
    "id": "earth-lightning",
    "world": "earth",
    "kind": "lightning",
    "class": "measured",
    "layer": "lightning",
    "off_at": [
      "tier0",
      "save_data",
      "reduced_motion"
    ],
    "source": "NOAA nowCOAST, Lightning Strike Density (NWS Ocean Prediction Center; ground networks NLDN and GLD360)"
  },
  {
    "id": "earth-events",
    "world": "earth",
    "kind": "events",
    "class": "measured",
    "layer": "earth-events",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "source": "NASA EONET v3, the Earth Observatory Natural Event Tracker (NASA GSFC ESDIS); events from IRWIN, GDACS, the Smithsonian Global Volcanism Program and the US National Ice Center"
  },
  {
    "id": "jupiter-bands",
    "world": "jupiter",
    "kind": "zonal-flow",
    "class": "modelled",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "profile": {
      "radius_km": 71492,
      "flattening": 0.0649,
      "sense": 1,
      "points": [
        [
          -90,
          0
        ],
        [
          -66,
          0
        ],
        [
          -61,
          20
        ],
        [
          -57,
          0
        ],
        [
          -53.5,
          30
        ],
        [
          -49.5,
          10
        ],
        [
          -46,
          0
        ],
        [
          -43.5,
          40
        ],
        [
          -39.5,
          -5
        ],
        [
          -36.5,
          35
        ],
        [
          -32.5,
          -20
        ],
        [
          -29.5,
          0
        ],
        [
          -26.5,
          45
        ],
        [
          -23,
          0
        ],
        [
          -20,
          -50
        ],
        [
          -16,
          10
        ],
        [
          -12,
          50
        ],
        [
          -7,
          150
        ],
        [
          0,
          80
        ],
        [
          7,
          100
        ],
        [
          13,
          40
        ],
        [
          17.5,
          -20
        ],
        [
          21,
          0
        ],
        [
          24,
          150
        ],
        [
          27,
          0
        ],
        [
          31.5,
          -30
        ],
        [
          35.5,
          35
        ],
        [
          39.5,
          -15
        ],
        [
          42.5,
          25
        ],
        [
          45.5,
          -5
        ],
        [
          48,
          30
        ],
        [
          52,
          -5
        ],
        [
          56,
          20
        ],
        [
          60,
          0
        ],
        [
          65,
          15
        ],
        [
          70,
          0
        ],
        [
          90,
          0
        ]
      ]
    },
    "spot": {
      "u": 0.3635,
      "v": 0.398,
      "half_u": 0.036,
      "half_v": 0.04,
      "period_days": 6
    },
    "source": "Tollefson et al. 2017, Changes in Jupiter's Zonal Wind Profile preceding and during the Juno mission, Icarus 296, 163"
  },
  {
    "id": "saturn-bands",
    "world": "saturn",
    "kind": "zonal-flow",
    "class": "modelled",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "profile": {
      "radius_km": 60268,
      "flattening": 0.098,
      "sense": 1,
      "points": [
        [
          -90,
          0
        ],
        [
          -73,
          0
        ],
        [
          -70,
          80
        ],
        [
          -65,
          0
        ],
        [
          -58,
          80
        ],
        [
          -52,
          0
        ],
        [
          -42,
          90
        ],
        [
          -35,
          0
        ],
        [
          -28,
          60
        ],
        [
          -20,
          220
        ],
        [
          -10,
          360
        ],
        [
          0,
          380
        ],
        [
          10,
          360
        ],
        [
          20,
          220
        ],
        [
          28,
          60
        ],
        [
          35,
          0
        ],
        [
          42,
          110
        ],
        [
          50,
          0
        ],
        [
          60,
          100
        ],
        [
          66,
          0
        ],
        [
          72,
          5
        ],
        [
          78.1,
          104
        ],
        [
          82,
          10
        ],
        [
          90,
          0
        ]
      ]
    },
    "source": "García-Melendo et al. 2011, Saturn's zonal wind profile in 2004-2009 from Cassini ISS images, Icarus 215, 62"
  },
  {
    "id": "saturn-hexagon",
    "world": "saturn",
    "kind": "hexagon",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "hexagon": {
      "lat_deg": 78.1,
      "flattening": 0.098,
      "sides": 6
    },
    "source": "Sánchez-Lavega et al. 2021, Interaction of Saturn's Hexagon with convective storms, GRL 48 (the jet at 78.1 N planetographic, 104 m/s); Godfrey 1988, Icarus 76, 335 (the discovery)"
  },
  {
    "id": "venus-superrotation",
    "world": "venus",
    "kind": "zonal-flow",
    "class": "modelled",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "profile": {
      "radius_km": 6122,
      "flattening": 0,
      "sense": -1,
      "points": [
        [
          -90,
          0
        ],
        [
          -50,
          100
        ],
        [
          50,
          100
        ],
        [
          90,
          0
        ]
      ]
    },
    "source": "Sánchez-Lavega et al. 2008, Variable winds on Venus mapped in three dimensions, GRL 35, L13204 (Venus Express VIRTIS, cloud tops)"
  },
  {
    "id": "uranus-drift",
    "world": "uranus",
    "kind": "zonal-flow",
    "class": "modelled",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "profile": {
      "radius_km": 25559,
      "flattening": 0.0229,
      "sense": -1,
      "points": [
        [
          -90,
          0
        ],
        [
          -75,
          150
        ],
        [
          -60,
          250
        ],
        [
          -45,
          200
        ],
        [
          -30,
          80
        ],
        [
          -20,
          0
        ],
        [
          0,
          -50
        ],
        [
          20,
          0
        ],
        [
          30,
          80
        ],
        [
          45,
          200
        ],
        [
          60,
          250
        ],
        [
          75,
          150
        ],
        [
          90,
          0
        ]
      ]
    },
    "source": "Sromovsky et al. 2015, High S/N Keck and Gemini AO imaging of Uranus during 2012-2014, Icarus 258, 192"
  },
  {
    "id": "neptune-drift",
    "world": "neptune",
    "kind": "zonal-flow",
    "class": "modelled",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "profile": {
      "radius_km": 24764,
      "flattening": 0.0171,
      "sense": 1,
      "points": [
        [
          -90,
          0
        ],
        [
          -80,
          150
        ],
        [
          -70,
          235
        ],
        [
          -60,
          123
        ],
        [
          -50,
          -3
        ],
        [
          -40,
          -128
        ],
        [
          -30,
          -239
        ],
        [
          -20,
          -325
        ],
        [
          -10,
          -379
        ],
        [
          0,
          -398
        ],
        [
          10,
          -379
        ],
        [
          20,
          -325
        ],
        [
          30,
          -239
        ],
        [
          40,
          -128
        ],
        [
          50,
          -3
        ],
        [
          60,
          123
        ],
        [
          70,
          235
        ],
        [
          80,
          150
        ],
        [
          90,
          0
        ]
      ]
    },
    "source": "Sromovsky et al. 1993, Dynamics of Neptune's major cloud features, Icarus 105, 110 (Voyager 2; the fit u = -398 + 0.188 lat^2 - 1.2e-5 lat^4 m/s)"
  },
  {
    "id": "mars-season",
    "world": "mars",
    "kind": "mars-season",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "north_cap": [
      [
        0,
        60
      ],
      [
        30,
        66
      ],
      [
        60,
        74
      ],
      [
        90,
        82
      ],
      [
        150,
        82
      ],
      [
        200,
        68
      ],
      [
        240,
        58
      ],
      [
        300,
        54
      ],
      [
        330,
        55
      ],
      [
        360,
        60
      ]
    ],
    "south_cap": [
      [
        0,
        -62
      ],
      [
        60,
        -52
      ],
      [
        120,
        -50
      ],
      [
        160,
        -53
      ],
      [
        200,
        -60
      ],
      [
        240,
        -70
      ],
      [
        270,
        -80
      ],
      [
        300,
        -86
      ],
      [
        330,
        -86
      ],
      [
        360,
        -62
      ]
    ],
    "dust_tau": [
      [
        0,
        0.25
      ],
      [
        135,
        0.25
      ],
      [
        180,
        0.35
      ],
      [
        220,
        0.6
      ],
      [
        245,
        0.9
      ],
      [
        275,
        0.55
      ],
      [
        300,
        0.5
      ],
      [
        325,
        0.7
      ],
      [
        345,
        0.4
      ],
      [
        360,
        0.25
      ]
    ],
    "dust_north": 0.6,
    "source": "Allison and McEwen 2000, Planet. Space Sci. 48, 215 (the season, Ls, from the date); Piqueux et al. 2015, Icarus 251, 164 (the seasonal caps' edges by Ls, MRO MCS); Kass et al. 2016, GRL 43, 6111 (the dusty season)"
  },
  {
    "id": "jupiter-lightning",
    "world": "jupiter",
    "kind": "giant-lightning",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data",
      "reduced_motion"
    ],
    "lightning": {
      "bands": [
        [
          40,
          80,
          2
        ],
        [
          -80,
          -40,
          1
        ]
      ],
      "mean_gap_s": 8,
      "slots": 2,
      "life_s": 0.4,
      "radius_deg": 1.6
    },
    "source": "Brown et al. 2018, Prevalent lightning sferics at 600 megahertz near Jupiter's poles, Nature 558, 87 (Juno's microwave radiometer: 377 sferics, 'prevalent in the polar regions, absent near the equator, and most frequent in the northern hemisphere, at latitudes higher than 40 degrees north'); Becker et al. 2020, Nature 584, 55 (Juno's star camera: small flashes on the night side, from above the 2-bar level)"
  },
  {
    "id": "saturn-lightning",
    "world": "saturn",
    "kind": "giant-lightning",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data",
      "reduced_motion"
    ],
    "lightning": {
      "bands": [
        [
          -38,
          -34.8,
          1
        ]
      ],
      "mean_gap_s": 9,
      "slots": 1,
      "life_s": 0.4,
      "radius_deg": 1.6
    },
    "source": "Dyudina et al. 2010, Detection of visible lightning on Saturn, GRL 37, L09205 (Cassini's camera, 17 August 2009, night side: 'at -36.4 +- 0.1 degrees planetocentric latitude', one flash a minute, each lighting a spot about 200 km across); Dyudina et al. 2013, Icarus 226, 1020 (the great storm of 2010-2011 at about 35 N)"
  },
  {
    "id": "venus-y",
    "world": "venus",
    "kind": "planetary-wave",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "wave": {
      "period_days": 4,
      "depth": 0.2,
      "arm_deg": 45
    },
    "source": "Imai et al. 2019, Planetary-scale variations in winds and UV brightness at the Venusian cloud top, JGR Planets 124 (Akatsuki's ultraviolet imager at 365 nm, 2017: 'the 4-day Kelvin wave and 5-day Rossby wave with zonal wavenumber 1'); JAXA, Akatsuki's UVI pictures ('a vast darker region which has a shape of laid V or Y ... flows westward')"
  },
  {
    "id": "titan-clouds",
    "world": "titan",
    "kind": "cloud-patches",
    "class": "illustrative",
    "off_at": [
      "tier0",
      "save_data"
    ],
    "patches": [
      [
        62,
        50,
        3.5,
        16
      ],
      [
        48,
        -20,
        3,
        12
      ],
      [
        56,
        170,
        3,
        18
      ]
    ],
    "source": "NASA, Webb and Keck telescopes team up to track clouds on Titan (1 December 2022: Webb on 4 November 2022 and Keck two days later, one cloud 'over the northern polar region near Kraken Mare'); Nixon et al. 2025, Nature Astronomy (November 2022 and July 2023: 'northern hemisphere tropospheric clouds evolving in altitude')"
  }
];
