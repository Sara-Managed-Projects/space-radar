// GENERATED from registry/deepsky-heroes/smc.yaml by scripts/gen_deepsky_heroes_js.py. Do not edit.
// A deep-sky hero's authored profile (internal spec 0075, design section 3): read by
// scene/deep/heroes.js when the hero comes near, never at boot.
export const HERO = {
  "id": "smc",
  "record": "dso-smc",
  "stage": "W2-e",
  "shipped": true,
  "children": [],
  "levels": {
    "1": "the photograph (scene/nebulae.js), with this model filling what the photograph's frame cuts off",
    "2": "Gaia-mapped stars in two populations at their measured depths, their unresolved light as patches (the photograph's where it covers them)",
    "3": "the same (the patches cost what they cost at level 2; there is no march to refine)"
  },
  "frame": {
    "units_ly": 100,
    "distance_ly": 203650,
    "centre": {
      "ra_deg": 13.1867,
      "dec_deg": -72.8286
    },
    "extent": {
      "fade_from_deg": 2.6,
      "fade_to_deg": 4.2
    },
    "axes": "x west, y north, z toward the Sun; the catalogue centre at the origin"
  },
  "layers": [
    {
      "part": "maps",
      "kind": "maps",
      "what": "Gaia DR3 star counts, two maps (all members; young blue stars), 128 x 128 bins of 0.075 deg",
      "file": "data/deep/smc-density.bin",
      "bytes": 65536,
      "sha256": "44f95215d856f57674fec9943c88a2a5d659f63381543afcd00ea88ab411c7b0",
      "bins": 128,
      "bin_deg": 0.075,
      "selection": "G < 19.5; parallax < 5 sigma + 0.05 mas; proper motion within 1.0 mas/yr of (0.686, -1.237) mas/yr; young: BP-RP < 0.5 and G < 18",
      "source": "Gaia DR3 (Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1), counted by scripts/build_deep_smc.py; the SMC's proper motion and cuts in the manner of Gaia Collaboration, Luri et al. 2021, A&A 649, A7",
      "licence": "CC BY-NC 3.0 IGO (https://www.cosmos.esa.int/web/gaia-users/license)"
    },
    {
      "part": "photograph",
      "kind": "photograph",
      "what": "where the SMC's photograph covers the galaxy, its light is the galaxy's light, spread through the two populations' depths in proportion to their counts there, so seen along our line the model is the photograph",
      "record": "dso-smc",
      "file": "site/images/deep/smc/smc-light.webp",
      "made_by": "scripts/build_deep_smc.py --light: its stars taken out (its pink H II regions kept), and two Milky Way globulars in front of it, 47 Tucanae and NGC 362, filled from round them",
      "source": "registry/nebulae.yaml smc: NOIRLab noirlab2030b (SMASH), already credited in CREDITS.md"
    },
    {
      "part": "old",
      "kind": "stars",
      "what": "the old population (red giants and red clump stars), from map 0, near a tilted plane",
      "map": 0,
      "incl_deg": 41,
      "nodes_pa_deg": 178,
      "near_side": "E",
      "z0_ly": 4900,
      "count": {
        "t0": 5000,
        "t1": 30000,
        "t2": 50000
      },
      "colour": [
        1.0,
        0.84,
        0.66
      ],
      "weight": 1.0,
      "source": "Tatton, B. L. et al. 2021, MNRAS, doi:10.1093/mnras/staa3857 (arXiv:2012.12288: 'a flat plane ... has an inclination i=35-48 and position angle PA=170-186'); Scowcroft, V. et al. 2016, ApJ 816, 49 (arXiv:1502.06995)"
    },
    {
      "part": "young",
      "kind": "stars",
      "what": "young blue stars and their associations, from map 1, stretched along our line from north-east (near) to south-west (far), as the Cepheids are",
      "map": 1,
      "near_pa_deg": 55,
      "depth_ly_per_deg": 23000,
      "depth_max_ly": 45000,
      "z0_ly": 10000,
      "count": {
        "t0": 2000,
        "t1": 10000,
        "t2": 16000
      },
      "colour": [
        0.66,
        0.79,
        1.0
      ],
      "weight": 0.6,
      "source": "Ripepi, V. et al. 2017, MNRAS 472, 808 (arXiv:1707.04500: the Cepheids 'heavily elongated for more than 25-30 kpc approximately in the east/north-east towards south-west direction'); Scowcroft, V. et al. 2016, ApJ 816, 49 (arXiv:1502.06995: 'tilted and elongated such that its eastern side is up to 20 kpc closer than its western side'); Jacyszyn-Dobrzeniecka, A. M. et al. 2016, AcA 66, 149 (arXiv:1602.09141: 'an extended ellipsoid', the northern part nearer and younger)"
    },
    {
      "part": "stream",
      "kind": "gas",
      "what": "the Magellanic Bridge and the Magellanic Stream: neutral hydrogen pulled out of the Clouds, mapped by its 21 cm radio line. It gives off no visible light; it is drawn in false colour (a radio map), and only in this place on the sky",
      "map": {
        "l_min": -150,
        "l_max": 20,
        "b_min": -40,
        "b_max": 30,
        "px_deg": 4,
        "log_min": 18.6,
        "log_max": 21.6
      },
      "file": "site/images/deep/magellanic/hi-column.webp",
      "made_by": "scripts/build_deep_magellanic.py",
      "distance": {
        "lmc_ly": 161740,
        "smc_ly": 203650,
        "root_l_deg": -15.5,
        "tip_ly": 330000,
        "leading_arm": false
      },
      "colour": [
        0.45,
        0.62,
        1.0
      ],
      "source": "Westmeier, T. 2018, MNRAS 474, 289 (arXiv:1712.00909): the all-sky map of high-velocity H I from HI4PI (HI4PI Collaboration 2016, A&A 594, A116), served by NASA's LAMBDA (https://lambda.gsfc.nasa.gov/product/foreground/fg_hi4pi_hvhi_info.html), read 2026-10-20; Nidever, D. L., Majewski, S. R. & Butler Burton, W. 2008, ApJ 679, 432 (the Magellanic coordinates); Fox, A. J. et al. 2019, Astro2020 science white paper (arXiv:1903.04831: the distance)",
      "licence": "The map is a NASA LAMBDA product with no licence of its own stated; HI4PI's data are distributed by CDS under VizieR's terms (free in a scientific context, the authors and publication cited). Cited as both ask; Space Radar is free and non-commercial"
    }
  ],
  "colours": {
    "mode": true,
    "note": "The galaxy's colours are the photograph's own where it covers it (DECam's broad filters), shown with each exposure's stretch as the photograph is; beyond it the two populations' colours, illustrative. The Bridge and the Stream are FALSE colour: hydrogen at 21 cm, which no eye or camera sees",
    "enhanced": {
      "mode": "enhanced",
      "under": "deep",
      "note": "Deep: ENHANCED. The photograph's own Deep stretch (gamma 0.7, saturation 1.25, as scene/nebulae.js gives every photograph)"
    }
  },
  "drawn": [
    "model"
  ],
  "sources": [
    "Graczyk, D. et al. 2020, ApJ 904, 13 (arXiv:2010.08754): the distance, 62.44 kpc, from eclipsing binaries (registry/dso-hand.yaml)",
    "Gaia Collaboration, Vallenari, A. et al. 2023, A&A 674, A1 (Gaia DR3); Gaia Collaboration, Luri, X. et al. 2021, A&A 649, A7 (the Clouds' proper motions)",
    "Ripepi, V. et al. 2017, The VMC survey XXV: the 3D structure of the SMC from classical Cepheids, MNRAS 472, 808 (https://arxiv.org/abs/1707.04500)",
    "Scowcroft, V. et al. 2016, The Carnegie Hubble Program: the distance and structure of the SMC as revealed by mid-infrared observations of Cepheids, ApJ 816, 49 (https://arxiv.org/abs/1502.06995)",
    "Jacyszyn-Dobrzeniecka, A. M. et al. 2016, OGLE-ing the Magellanic System: three-dimensional structure of the Clouds and the Bridge using classical Cepheids, AcA 66, 149 (https://arxiv.org/abs/1602.09141)",
    "Tatton, B. L. et al. 2021, The VMC survey XL: three-dimensional structure of the SMC as derived from red clump stars, MNRAS, doi:10.1093/mnras/staa3857 (https://arxiv.org/abs/2012.12288)",
    "Westmeier, T. 2018, A new all-sky map of Galactic high-velocity clouds from the 21-cm HI4PI survey, MNRAS 474, 289 (https://arxiv.org/abs/1712.00909); HI4PI Collaboration, Ben Bekhti, N. et al. 2016, A&A 594, A116",
    "Nidever, D. L., Majewski, S. R. & Butler Burton, W. 2008, ApJ 679, 432 (Magellanic coordinates)",
    "Fox, A. J. et al. 2019, The Magellanic Stream as a probe of astrophysics, Astro2020 white paper (https://arxiv.org/abs/1903.04831)",
    "NOIRLab noirlab2030b (SMASH), the photograph the app already shows: the galaxy's light where it covers it"
  ],
  "review": {
    "data_vs_model": "Measured: the distance, where the stars are on the sky (Gaia's counts), the depth trends (the Cepheids' east-to-south-west stretch, the red clump's tilted plane), the hydrogen's column on the sky, and the light (the photograph). Model: each drawn star's depth (a spread round the measured trends) and brightness, the populations' thickness, the Stream's distance beyond its root",
    "geometry": "Ripepi et al. 2017 and Scowcroft et al. 2016 for the young stars' stretch along our line; Tatton et al. 2021 for the old stars' plane; the spreads are illustrative and said so; the red clump's second group on the east is not drawn",
    "colours": "The photograph's own where it covers the galaxy; illustrative population colours beyond it; the hydrogen in declared false colour",
    "distance": "62.44 kpc (203 650 ly), Graczyk et al. 2020 (registry/dso-hand.yaml); the LMC's 49.59 kpc for the Bridge's other end; the Stream's far end from models, said so",
    "credits": "CREDITS.md section 3l, the SMC and the Magellanic Stream (0077 W2-e); the card's rows say what is measured and that no astronomer has reviewed it",
    "by": "Space Radar maintainers",
    "date": "2026-10-20",
    "astronomer": "not yet: the independent review is internal #785; the card says so"
  },
  "credits": [
    "The SMC's star counts: Gaia DR3, ESA/Gaia/DPAC (CC BY-NC 3.0 IGO), counted by Space Radar",
    "Its depth: Ripepi et al. 2017, MNRAS 472, 808; Scowcroft et al. 2016, ApJ 816, 49; Jacyszyn-Dobrzeniecka et al. 2016, AcA 66, 149; Tatton et al. 2021, MNRAS (arXiv:2012.12288)",
    "The Magellanic Bridge and Stream: HI4PI high-velocity H I, Westmeier 2018, MNRAS 474, 289; HI4PI Collaboration 2016, A&A 594, A116; via NASA LAMBDA",
    "Its light: the photograph noirlab2030b, CTIO/NOIRLab/NSF/AURA/SMASH/D. Nidever (CC BY 4.0)"
  ]
};
