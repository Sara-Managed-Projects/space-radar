// GENERATED from registry/textures.yaml by scripts/gen_textures_js.py. Do not edit.
//
// `python3 scripts/gen_textures_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** Every map the scene can wear, a file per device tier (scene/quality.js, scene/texturetiers.js). */
export const TEXTURES = [
  {
    "id": "earth-realistic",
    "world": "earth",
    "slot": "day",
    "when": "idle",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_earth_daymap.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 463087,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/earth_day_{mm}.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": [
          587366,
          589298,
          584612,
          575956,
          573982,
          585684,
          577510,
          571606,
          586856,
          580030,
          585554,
          587964
        ],
        "format": "rgb",
        "monthly": true,
        "credit": "Earth by day (4k): Blue Marble Next Generation, NASA Earth Observatory"
      }
    ]
  },
  {
    "id": "earth-night",
    "world": "earth",
    "slot": "night",
    "when": "idle",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_earth_nightmap.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 84590,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/earth_night.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 232346,
        "format": "mono",
        "credit": "Earth at night (4k): Black Marble 2016, NASA Earth Observatory"
      }
    ]
  },
  {
    "id": "earth-water",
    "world": "earth",
    "slot": "water",
    "when": "idle",
    "files": [
      {
        "tier": 1,
        "file": "textures/4k/earth_water.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 253660,
        "format": "mono",
        "credit": "Earth water mask (4k): Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "earth-clouds",
    "world": "earth",
    "slot": "clouds",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_earth_clouds.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 575032,
        "format": "mono",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "starfield",
    "world": "sky",
    "slot": "map",
    "when": "idle",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_stars_milky_way.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 60004,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/milky_way.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 111648,
        "format": "rgb",
        "credit": "Milky Way (4k): NASA/Goddard Space Flight Center Scientific Visualization Studio, Gaia DR2: ESA/Gaia/DPAC"
      }
    ]
  },
  {
    "id": "moon",
    "world": "moon",
    "slot": "map",
    "when": "near",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_moon.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 1053869,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/moon.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 1744972,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "mercury",
    "world": "mercury",
    "slot": "map",
    "when": "near",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_mercury_messenger.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 560552,
        "format": "rgb",
        "credit": "Mercury map: USGS Astrogeology Science Center and NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (MESSENGER MDIS), public domain"
      },
      {
        "tier": 1,
        "file": "textures/4k/mercury.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 1277368,
        "format": "rgb",
        "credit": "Mercury map: USGS Astrogeology Science Center and NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (MESSENGER MDIS), public domain"
      }
    ]
  },
  {
    "id": "mars",
    "world": "mars",
    "slot": "map",
    "when": "near",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_mars.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 750547,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/mars.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 817910,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "jupiter",
    "world": "jupiter",
    "slot": "map",
    "when": "near",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_jupiter.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 498976,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/jupiter.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 351130,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "sun",
    "world": "sun",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_sun.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 822427,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "venus",
    "world": "venus",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_venus_atmosphere.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 229696,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "venus-surface",
    "world": "venus",
    "slot": "surface",
    "when": "asked",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_venus_magellan.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 225388,
        "format": "rgb",
        "credit": "Venus surface map: USGS Astrogeology Science Center and NASA/JPL-Caltech (Magellan radar, C3-MIDR mosaic), public domain"
      }
    ]
  },
  {
    "id": "saturn",
    "world": "saturn",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_saturn.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 199916,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "saturn-ring",
    "world": "saturn",
    "slot": "ring",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_saturn_ring_alpha.png",
        "px": [
          2048,
          125
        ],
        "bytes": 12119,
        "format": "rgba",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "uranus",
    "world": "uranus",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_uranus.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 77751,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "neptune",
    "world": "neptune",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_neptune.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 241580,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      }
    ]
  },
  {
    "id": "io",
    "world": "io",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_io_usgs.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 178088,
        "format": "rgb",
        "credit": "Io map: USGS Astrogeology Science Center (Galileo SSI and Voyager), public domain"
      }
    ]
  },
  {
    "id": "europa",
    "world": "europa",
    "slot": "map",
    "when": "boot",
    "coverage": 0.995,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_europa_usgs.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 210708,
        "format": "rgb",
        "credit": "Europa map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain"
      }
    ]
  },
  {
    "id": "ganymede",
    "world": "ganymede",
    "slot": "map",
    "when": "boot",
    "coverage": 0.996,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_ganymede_usgs.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 220436,
        "format": "rgb",
        "credit": "Ganymede map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain"
      }
    ]
  },
  {
    "id": "callisto",
    "world": "callisto",
    "slot": "map",
    "when": "boot",
    "coverage": 0.991,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_callisto_usgs.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 212040,
        "format": "rgb",
        "credit": "Callisto map: USGS Astrogeology Science Center (Voyager and Galileo SSI), public domain"
      }
    ]
  },
  {
    "id": "enceladus",
    "world": "enceladus",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_enceladus_cassini.webp",
        "px": [
          1536,
          768
        ],
        "bytes": 227872,
        "format": "rgb",
        "credit": "Enceladus map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute, public domain"
      }
    ]
  },
  {
    "id": "mimas",
    "world": "mimas",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_mimas_cassini.webp",
        "px": [
          1792,
          896
        ],
        "bytes": 231248,
        "format": "rgb",
        "credit": "Mimas map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18437), public domain"
      }
    ]
  },
  {
    "id": "tethys",
    "world": "tethys",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_tethys_cassini.webp",
        "px": [
          1536,
          768
        ],
        "bytes": 221400,
        "format": "rgb",
        "credit": "Tethys map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18439), public domain"
      }
    ]
  },
  {
    "id": "dione",
    "world": "dione",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_dione_cassini.webp",
        "px": [
          1792,
          896
        ],
        "bytes": 232500,
        "format": "rgb",
        "credit": "Dione map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18434), public domain"
      }
    ]
  },
  {
    "id": "rhea",
    "world": "rhea",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_rhea_cassini.webp",
        "px": [
          1536,
          768
        ],
        "bytes": 230008,
        "format": "rgb",
        "credit": "Rhea map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18438), public domain"
      }
    ]
  },
  {
    "id": "iapetus",
    "world": "iapetus",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_iapetus_cassini.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 226040,
        "format": "rgb",
        "credit": "Iapetus map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute (Cassini, PIA18436), public domain"
      }
    ]
  },
  {
    "id": "titan",
    "world": "titan",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_titan_cassini_iss.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 62786,
        "format": "rgb",
        "credit": "Titan map: USGS Astrogeology Science Center and NASA/JPL-Caltech/Space Science Institute (Cassini ISS, 938 nm), public domain"
      }
    ]
  },
  {
    "id": "triton",
    "world": "triton",
    "slot": "map",
    "when": "boot",
    "coverage": 0.669,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_triton_voyager.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 80414,
        "format": "rgb",
        "credit": "Triton map: USGS Astrogeology Science Center and NASA/JPL-Caltech/Lunar and Planetary Institute (Voyager 2, P. Schenk, PIA18668), public domain"
      }
    ]
  },
  {
    "id": "miranda",
    "world": "miranda",
    "slot": "map",
    "when": "boot",
    "coverage": 0.394,
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_miranda_voyager.webp",
        "px": [
          1440,
          720
        ],
        "bytes": 49792,
        "format": "rgb",
        "credit": "Miranda map: NASA/JPL-Caltech/USGS (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "ariel",
    "world": "ariel",
    "slot": "map",
    "when": "boot",
    "coverage": 0.337,
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_ariel_voyager.webp",
        "px": [
          1440,
          720
        ],
        "bytes": 28216,
        "format": "rgb",
        "credit": "Ariel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "umbriel",
    "world": "umbriel",
    "slot": "map",
    "when": "boot",
    "coverage": 0.369,
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_umbriel_voyager.webp",
        "px": [
          1440,
          720
        ],
        "bytes": 12276,
        "format": "rgb",
        "credit": "Umbriel map: NASA/JPL-Caltech/USGS (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "titania",
    "world": "titania",
    "slot": "map",
    "when": "boot",
    "coverage": 0.318,
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_titania_voyager.webp",
        "px": [
          1440,
          720
        ],
        "bytes": 27046,
        "format": "rgb",
        "credit": "Titania map: NASA/JPL-Caltech/USGS (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "oberon",
    "world": "oberon",
    "slot": "map",
    "when": "boot",
    "coverage": 0.34,
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_oberon_voyager.webp",
        "px": [
          1440,
          720
        ],
        "bytes": 28288,
        "format": "rgb",
        "credit": "Oberon map: NASA/JPL-Caltech/USGS (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "pluto",
    "world": "pluto",
    "slot": "map",
    "when": "boot",
    "coverage": 0.769,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_pluto_nh_colour.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 75378,
        "format": "rgb",
        "credit": "Pluto map: NASA/JHUAPL/SwRI (New Horizons MVIC colour mosaic, NASA Planetary Data System) and USGS Astrogeology Science Center (LORRI mosaic), public domain"
      }
    ]
  },
  {
    "id": "charon",
    "world": "charon",
    "slot": "map",
    "when": "boot",
    "coverage": 0.74,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_charon_nh_colour.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 45378,
        "format": "rgb",
        "credit": "Charon map: NASA/JHUAPL/SwRI (New Horizons MVIC colour mosaic, NASA Planetary Data System) and USGS Astrogeology Science Center (LORRI mosaic), public domain"
      }
    ]
  },
  {
    "id": "phobos",
    "world": "phobos",
    "slot": "map",
    "when": "boot",
    "coverage": 1.0,
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_phobos_viking.webp",
        "px": [
          2048,
          1024
        ],
        "bytes": 189854,
        "format": "rgb",
        "credit": "Phobos map: USGS Astrogeology Science Center (Viking Orbiter mosaic, control by P. Stooke), public domain"
      }
    ]
  }
];
