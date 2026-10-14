// GENERATED from registry/deepsky-heroes/lmc.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "lmc",
  "record": "dso-lmc",
  "stage": "c",
  "shipped": true,
  "children": [
    "dso-tarantula-nebula"
  ],
  "levels": {
    "1": "the photograph (scene/nebulae.js), with this model filling what the photograph's frame cuts off",
    "2": "Gaia-mapped stars in a tilted disc, unresolved light, H II nodes, the Tarantula and R136",
    "3": "the same with more march steps for the disc's dust and the Tarantula's gas"
  },
  "frame": {
    "pa_deg": 122.5,
    "incl_deg": 34.7,
    "near_side": "NE",
    "units_ly": 100,
    "centre": {
      "ra_deg": 80.8917,
      "dec_deg": -69.7567
    },
    "extent": {
      "maj_arcmin": 645,
      "min_arcmin": 517,
      "pa_deg": 9.3,
      "fade_from": 0.85,
      "fade_to": 1.35
    },
    "source": "van der Marel & Cioni 2001, AJ 122, 1807 (arXiv:astro-ph/0105339); van der Marel 2001, AJ 122, 1827 (arXiv:astro-ph/0105340)"
  },
  "layers": [
    {
      "kind": "maps",
      "what": "Gaia DR3 star counts, two maps (all members; young blue stars), 128 x 128 bins of 0.125 deg",
      "file": "data/deep/lmc-density.bin",
      "bytes": 65536,
      "sha256": "e18e52449d5a904912d9d60df14fdbac71edc895b3ca35a50312591642c1ad47",
      "bins": 128,
      "bin_deg": 0.125,
      "selection": "G < 19.5; parallax < 5 sigma + 0.05 mas; proper motion within 1.5 mas/yr of (1.85, 0.30) mas/yr; young: BP-RP < 0.5 and G < 18",
      "source": "Gaia DR3 (Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1), counted by scripts/build_deep_lmc.py; cuts in the manner of Gaia Collaboration, Luri et al. 2021, A&A 649, A7",
      "licence": "CC BY-SA 3.0 IGO"
    },
    {
      "kind": "photograph",
      "what": "where the LMC's photograph covers the galaxy, its light is the disc's emissivity (spread through the old layer), so seen along our line the model is the photograph",
      "record": "dso-lmc",
      "source": "registry/nebulae.yaml lmc: NOIRLab noirlab2030a (SMASH), already credited in CREDITS.md"
    },
    {
      "kind": "stars",
      "what": "the old population (red giants and clump stars), as points drawn from map 0",
      "map": 0,
      "scale_height_ly": 1600,
      "count": {
        "t0": 6000,
        "t1": 42000,
        "t2": 84000
      },
      "colour": [
        1.0,
        0.84,
        0.66
      ],
      "source": "van der Marel 2001, AJ 122, 1827; van der Marel, Alves, Hardy & Suntzeff 2002, AJ 124, 2639 (arXiv:astro-ph/0205161)"
    },
    {
      "kind": "stars",
      "what": "young blue stars and their associations, as points drawn from map 1",
      "map": 1,
      "scale_height_ly": 330,
      "count": {
        "t0": 2500,
        "t1": 14000,
        "t2": 26000
      },
      "colour": [
        0.66,
        0.79,
        1.0
      ],
      "source": "Gaia DR3 map 1 above; the thickness is illustrative"
    },
    {
      "kind": "body",
      "what": "the unresolved light of both maps, and dust that follows the young stars (an illustration)",
      "source": "the two maps above; the dust is not mapped (an illustration of where star formation keeps it)"
    },
    {
      "kind": "nodes",
      "what": "the brightest H II regions, catalogued positions (Henize 1956 numbers), sizes where SIMBAD has them",
      "colour": [
        1.0,
        0.42,
        0.55
      ],
      "default_arcmin": 5,
      "nodes": [
        {
          "name": "N 11",
          "ra_deg": 74.2142,
          "dec_deg": -66.4067
        },
        {
          "name": "N 44",
          "ra_deg": 80.5288,
          "dec_deg": -67.9461,
          "arcmin": 6.0
        },
        {
          "name": "N 51",
          "ra_deg": 81.6958,
          "dec_deg": -67.5183,
          "arcmin": 15.0
        },
        {
          "name": "N 55",
          "ra_deg": 83.1371,
          "dec_deg": -66.4056,
          "arcmin": 7.0
        },
        {
          "name": "N 63",
          "ra_deg": 83.89,
          "dec_deg": -66.0406,
          "arcmin": 9.0
        },
        {
          "name": "N 70",
          "ra_deg": 85.8229,
          "dec_deg": -67.8467,
          "arcmin": 8.0
        },
        {
          "name": "N 79",
          "ra_deg": 73.0,
          "dec_deg": -69.375,
          "arcmin": 16.0
        },
        {
          "name": "N 83",
          "ra_deg": 73.5625,
          "dec_deg": -69.1767,
          "arcmin": 6.0
        },
        {
          "name": "N 91",
          "ra_deg": 74.6238,
          "dec_deg": -68.4506,
          "arcmin": 8.0
        },
        {
          "name": "N 105",
          "ra_deg": 77.4879,
          "dec_deg": -68.8919
        },
        {
          "name": "N 113",
          "ra_deg": 78.3404,
          "dec_deg": -69.3592
        },
        {
          "name": "N 119",
          "ra_deg": 79.6633,
          "dec_deg": -69.2228
        },
        {
          "name": "N 144",
          "ra_deg": 81.6771,
          "dec_deg": -68.8261,
          "arcmin": 13.0
        },
        {
          "name": "N 148",
          "ra_deg": 83.0454,
          "dec_deg": -68.4731,
          "arcmin": 16.0
        },
        {
          "name": "N 154",
          "ra_deg": 83.77,
          "dec_deg": -69.7236,
          "arcmin": 18.0
        },
        {
          "name": "N 158",
          "ra_deg": 84.7968,
          "dec_deg": -69.5038,
          "arcmin": 3.7
        },
        {
          "name": "N 159",
          "ra_deg": 84.9444,
          "dec_deg": -69.7611,
          "arcmin": 7.3
        },
        {
          "name": "N 160",
          "ra_deg": 84.9496,
          "dec_deg": -69.6189,
          "arcmin": 3.7
        },
        {
          "name": "N 180",
          "ra_deg": 87.3042,
          "dec_deg": -70.1067,
          "arcmin": 12.0
        },
        {
          "name": "N 206",
          "ra_deg": 82.9833,
          "dec_deg": -71.0053,
          "arcmin": 3.2
        },
        {
          "name": "N 214",
          "ra_deg": 85.225,
          "dec_deg": -71.245
        }
      ],
      "source": "SIMBAD (Wenger et al. 2000, A&AS 143, 9), the Henize 1956 (ApJS 2, 315) H II regions, read 2026-10-15"
    },
    {
      "kind": "nebula",
      "what": "the Tarantula Nebula (30 Doradus, NGC 2070), its glowing gas round R136",
      "record": "dso-tarantula-nebula",
      "ra_deg": 84.6583,
      "dec_deg": -69.095,
      "arcmin": 40,
      "shell": {
        "radius_ly": 300,
        "width_ly": 150
      },
      "source": "Pellegrini, Baldwin & Ferland 2011, ApJ 738, 34 (arXiv:1101.3778); Pellegrini et al. 2010, ApJS 191, 160 (arXiv:1009.4948)"
    },
    {
      "kind": "cluster",
      "what": "R136, the young cluster at the Tarantula's heart, and its glow",
      "ra_deg": 84.67665,
      "dec_deg": -69.10093,
      "plummer_ly": 10,
      "radius_ly": 70,
      "count": {
        "t0": 300,
        "t1": 900,
        "t2": 1600
      },
      "colour": [
        0.74,
        0.84,
        1.0
      ],
      "source": "SIMBAD, RMC 136, read 2026-10-15"
    }
  ],
  "colours": {
    "mode": "enhanced",
    "note": "Stars: warm for the old population, blue-white for the young (their Gaia colours, simplified). The H II regions in the pink of hydrogen-alpha; the Tarantula's centre in the teal of doubly ionised oxygen ([O III]), where the gas is most ionised, and its edges in hydrogen-alpha: the narrow-band palette of the ESO and Hubble pictures, declared enhanced.",
    "lines": {
      "Ha": "#ff6b8c",
      "OIII": "#73f2e6"
    }
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Gaia DR3: Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1 (CC BY-SA 3.0 IGO)",
    "Gaia Collaboration, Luri et al. 2021, A&A 649, A7 (arXiv:2012.01771)",
    "Pietrzyński et al. 2019, Nature 567, 200 (the distance, registry/dso-hand.yaml)",
    "van der Marel & Cioni 2001, AJ 122, 1807; van der Marel 2001, AJ 122, 1827; van der Marel et al. 2002, AJ 124, 2639; van der Marel & Kallivayalil 2014, ApJ 781, 121",
    "SIMBAD (CDS): Henize 1956 H II regions, RMC 136",
    "Pellegrini, Baldwin & Ferland 2011, ApJ 738, 34; Pellegrini et al. 2010, ApJS 191, 160"
  ],
  "review": {
    "data_vs_model": "Maps on the sky are Gaia counts (data); depth per star, brightness per star, dust and the Tarantula's gas in depth are a model, and the card says so. No parallax is used as a depth.",
    "geometry": "Tilt and line of nodes from van der Marel & Cioni 2001 (as the registry); near side north-east; scale heights 1 600 ly (from V/sigma) and 330 ly (illustrative). To check: the near side against the paper's own figure, and whether to switch to the Gaia EDR3 kinematic angles.",
    "colours": "Enhanced, declared: H-alpha pink and [O III] teal for the gas, simplified Gaia colours for the stars.",
    "distance": "161 740 ly (Pietrzynski et al. 2019). The Tarantula takes the LMC's distance in its own direction; by the tilted disc it would sit about 2 000 ly nearer, which the registry does not do yet (the card says its depth is not measured).",
    "credits": "CREDITS.md section 3l, the LMC sub-heading: Gaia (CC BY-SA 3.0 IGO), SIMBAD, the papers above.",
    "by": "Space Radar maintainers",
    "date": "2026-10-15"
  },
  "credits": [
    "Gaia DR3 star counts: ESA/Gaia/DPAC, CC BY-SA 3.0 IGO; the derived map site/data/deep/lmc-density.bin is under the same licence",
    "H II region and R136 positions: SIMBAD, CDS, Strasbourg",
    "Geometry: van der Marel & Cioni 2001; van der Marel 2001; van der Marel et al. 2002; Pellegrini et al. 2011"
  ]
};
