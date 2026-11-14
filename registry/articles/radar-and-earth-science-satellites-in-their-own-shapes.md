![RADARSAT-2 over the night side of the Earth: a gold bus on the back of a long dark radar antenna, with two blue solar wings, its card open on the left.](radarsat-2.webp "RADARSAT-2 in release 1.9.0, close up from the sunward side, as the look workflow photographed it on 6 November 2026.")

Release 1.9.0 gives eight kinds of Earth-watching satellite a model of their own. RADARSAT-2, the three satellites of the RADARSAT Constellation Mission, COSMO-SkyMed in both its generations, Elektro-L, AstroSat, GOSAT (Ibuki) and MicroCarb used to wear a stand-in: a generic radar blade, a generic geostationary box or a generic telescope tube. Select one now and you see the craft itself, built in code from published dimensions and from pictures read for the layout.

## The radar satellites

Radar satellites see the ground through cloud and at night by sending out microwaves and timing the echoes, and the antenna is most of what they are. **RADARSAT-2**, Canada's, is a gold bus 3.7 m high standing on the back of a 15 m antenna of four panels, with two three-panel wings along it. The **RADARSAT Constellation Mission** that followed it is three smaller craft, each a box on a 6.88 m antenna in two halves, with four ship-tracking whips and one solar array leaning from its side. They used to share one file; now they are two.

Italy's **COSMO-SkyMed** is two generations as well. The first, four satellites, is a gold box with a 5.7 m by 1.4 m antenna of forty tiles on its Earth end and two four-panel arrays, 18.3 m² in all. The second, CSG-1, -2 and -3, is a taller bus with a payload module, a bronze-faced antenna of ten macro-tiles and arrays on hexagon-cut frames.

![COSMO-SkyMed 1 above the Earth: a gold box with a grey radar antenna along one end and two long blue solar arrays.](cosmo-skymed.webp "COSMO-SkyMed 1, the first generation: the 5.7 m antenna of forty tiles and two four-panel arrays.")

## Weather and climate

**Elektro-L 2 to 5**, Russia's geostationary weather satellites, are an eight-sided black body under a white Earth deck with the two scanner units, a data-collection helix and two dishes, and one solar wing of three panels. **GOSAT (Ibuki)**, Japan's greenhouse-gas satellite, is JAXA's 3.7 by 1.8 by 2.0 m body with two gold boxes, the hood of its TANSO-FTS spectrometer and two paddles 13.7 m from tip to tip. **MicroCarb**, France's small carbon-dioxide mapper, is a 0.6 by 0.8 by 1.0 m Myriade Evolutions platform with a silver optical housing and the oval baffle of its cold radiator.

## And one telescope

**AstroSat**, India's multi-wavelength observatory, is a gold bus 1.96 by 1.75 by 1.30 m carrying three LAXPC X-ray units, two gold ultraviolet tubes, the soft X-ray telescope with its door, the CZTI imager and two sky monitors, on four panels 8.5 m tip to tip. It now flies with its instruments looking away from the Earth and its cells turned to the Sun, as the real drive turns them.

![AstroSat against the stars: a gold box crowded with instrument tubes and boxes, with two solar wings above and below it.](astrosat.webp "AstroSat with its instruments on the deck and its panels turned to the Sun.")

## Why it matters

These are the satellites that measure flooding through cloud, carbon dioxide over a continent and the weather over Russia, and on most maps they are a dot with a number. A model built from their own dimensions lets you see what kind of machine does that job: why a radar craft is mostly antenna, why a greenhouse-gas satellite carries a spectrometer hood. Each model is 17,000 to 19,000 triangles and loads only when you select its craft.

## How to try it

Open one, press "Fly to it" and drag to turn round it:

- [RADARSAT-2](https://www.spaceradar.ai/#go=sat-32382)
- [COSMO-SkyMed 1](https://www.spaceradar.ai/#go=sat-31598)
- [AstroSat](https://www.spaceradar.ai/#go=sat-40930)
- [GOSAT (Ibuki)](https://www.spaceradar.ai/#go=sat-33492)

The card under "About it" says "shape built from published dimensions and pictures; details simplified", and "Sources for this record" lists what was cited.

## What was hard

Agencies publish the size of an antenna far more often than the size of a bus. For RADARSAT-2, COSMO-SkyMed's antenna and tile counts, GOSAT and AstroSat the main sizes are cited. For the RCM's bus, COSMO-SkyMed's bus and wings and the second generation's arrays, no page gives a size in metres, so they were read off the agencies' drawings, scaled by the one cited length. Elektro-L's only cited size is its wing, 8.17 m²; everything else was read off photographs of a 1:5 model by that wing. Where a size had no source the model was not built: Fengyun-4, CFOSAT, FLEX and Capella's Acadia craft stay on their stand-ins, and the release notes say why for each.

## Measured, modelled, reconstructed

- **Measured:** the cited sizes (antennas, tile counts, array areas, body boxes), the orbits from the public catalogue and each craft's NORAD number.
- **Modelled:** the pose. Each radar antenna is drawn looking straight down, although the real craft look to one side; Elektro-L's wing turns once a day.
- **Reconstructed:** every part read off a drawing or a photograph rather than a page, and the blankets, drawn as quilted patches rather than crumpled foil. MicroCarb's array size is an estimate, and no model has yet been checked by someone who knows the craft.

## Pictures and sources

Screenshots of Space Radar 1.9.0 (MIT licence) from the project's `look` workflow, probe `model`, run 42169991360. Dimensions: ISRO, JAXA, CNES, the CSA, ASI and eoPortal, listed per craft in `registry/models.yaml`. The models were built by Sara-Agent, the project's agent, in [pull request 1383](https://github.com/Sara-Managed-Projects/space-radar/pull/1383) from public requests #959, #961, #970, #980, #981 and #997; every row is in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
