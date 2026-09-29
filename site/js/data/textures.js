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
        "file": "textures/2k_mercury.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 872555,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
      },
      {
        "tier": 1,
        "file": "textures/4k/mercury.webp",
        "px": [
          4096,
          2048
        ],
        "bytes": 1389708,
        "format": "rgb",
        "credit": "Planet textures: Solar System Scope (solarsystemscope.com), CC BY 4.0"
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
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_io_usgs.jpg",
        "px": [
          1224,
          612
        ],
        "bytes": 118131,
        "format": "rgb",
        "credit": "Io map: USGS Astrogeology Science Center (Galileo SSI), public domain"
      }
    ]
  },
  {
    "id": "europa",
    "world": "europa",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_europa_usgs.jpg",
        "px": [
          1024,
          512
        ],
        "bytes": 89436,
        "format": "rgb",
        "credit": "Europa map: USGS / PDS (Voyager and Galileo SSI), public domain"
      }
    ]
  },
  {
    "id": "enceladus",
    "world": "enceladus",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_enceladus_cassini.jpg",
        "px": [
          1024,
          512
        ],
        "bytes": 222843,
        "format": "rgb",
        "credit": "Enceladus map: NASA/JPL-Caltech/Space Science Institute/Lunar and Planetary Institute, public domain"
      }
    ]
  },
  {
    "id": "triton",
    "world": "triton",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/1k_triton_voyager.jpg",
        "px": [
          1024,
          512
        ],
        "bytes": 71547,
        "format": "rgb",
        "credit": "Triton map: NASA/JPL-Caltech/Lunar and Planetary Institute (Voyager 2), public domain"
      }
    ]
  },
  {
    "id": "pluto",
    "world": "pluto",
    "slot": "map",
    "when": "boot",
    "files": [
      {
        "tier": 0,
        "file": "textures/2k_pluto_newhorizons.jpg",
        "px": [
          2048,
          1024
        ],
        "bytes": 274287,
        "format": "rgb",
        "credit": "Pluto map: NASA/JHUAPL/SwRI (New Horizons, PIA20658), public domain"
      }
    ]
  }
];
