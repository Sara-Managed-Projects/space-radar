![The Sombrero Galaxy edge-on as a model: a round glowing bulge cut by a thin dark lane.](sombrero-model.webp "The Sombrero Galaxy as the map draws it from published numbers: a huge bulge, a thin disc, and a lane of dust seen edge-on. 29.8 million light-years away.")

A photograph of a galaxy is a single view. Hubble can show you the Sombrero as it looks from here, and nobody can show you what it looks like from above. Release 1.3.0 draws five of them as objects with a front and a back, from numbers that astronomers have published about their shape, then lets you fly round them. It also redraws one of the sky's best-known nebulae and puts the Small Magellanic Cloud into depth.

## The recipe

Each galaxy comes from one generator, which turns a short list of numbers into stars: a bulge, a disc, arms with a pitch angle, a tilt. Every number in a galaxy's registry file is tagged. It is **published** (with the paper and the page it was read from), **assumed**, or **illustrative**. From our side of a galaxy you see the photograph; turn away and the model takes over, and a slider on the card moves between the two.

Lengths are worked out at each galaxy's distance, so the size on the sky stays the measured one whatever the distance does.

## The Sombrero

The Sombrero Galaxy (M104) is 29.8 million light-years away. Its model has a huge bulge of old stars (a Sersic index of 3.9 and a 3.15-kiloparsec half-light radius, from Gadotti's 2012 fit), a thin disc seen almost edge-on, and the dust ring in front. The bulge is drawn round from every side. No source says which edge of the disc is nearer to us, so the sign of the tilt is assumed, and the registry says that.

![The Sombrero Galaxy as Hubble's photograph shows it: a bright white bulge and a thin dust lane.](sombrero-photograph.webp "The same galaxy as Hubble's photograph, which the map shows from our line of sight.")

## The Whirlpool

M51 is a two-armed spiral seen nearly face-on, and the model draws it from its published tilt and structure. Its companion, NGC 5195, is drawn behind it, because M51's outer arm absorbs light in front of the companion's nucleus (Ritchey and others, 2015). How far behind, 4 kiloparsecs, is illustrative, and so are the companion's profile and the arm that runs to it.

![The Whirlpool Galaxy as a model seen face-on: a spiral of two arms around a bright core.](whirlpool-model.webp "The Whirlpool Galaxy as a model, 23 million light-years away: two arms, a bulge and a disc.")

![The Whirlpool Galaxy in Hubble's photograph, with its companion at the end of one arm.](whirlpool-photograph.webp "Hubble's photograph of the same galaxy, at the same place on the sky.")

M81 and the Pinwheel Galaxy (M101) join them, each from its own paper.

## The Antennae

The Antennae are two galaxies in collision, drawn as a system: each galaxy has its own frame and each tail is a stream of its parent galaxy. The tilts are read from the catalogue's outlines, but the collision has bent both galaxies, so those numbers are illustrative; how far each part of the tail is in front of or behind the rest is a model after published simulations. The distance, 71.75 million light-years, is Schweizer and colleagues' (2008).

![The Antennae galaxies as a model: two bright cores and long curved tails of stars.](antennae-model.webp "The Antennae as a model, with their tails. The depths of the tails come from published simulations; the map says that it is a model.")

## Carina, in 3D

The Carina Nebula sits 7,665 light-years away, not the 8,500 an infobox gives: the Homunculus nebula's expansion parallax and Gaia's measurements of the clusters' stars agree on 2.35 kiloparsecs. Its model is a bipolar cavity of two lobes about 40 parsecs across, which Nathan Smith and colleagues described in 2000, with a dark V-shaped lane of dust in front of the glowing gas and Eta Carinae inside it. Fourteen hot O and Wolf-Rayet stars sit at the places SIMBAD gives. The depth of the glowing wall is not measured, and the card says so.

## The Small Magellanic Cloud

The Small Magellanic Cloud was held back from the previous wave because it read as a veil and cost five times the frame time of the older map. It shipped in the third wave, drawn from Gaia's star counts. It is not a flat disc: its young stars are measured to stretch over more than 25 to 30 kiloparsecs along our line of sight, with the eastern side up to 20 kiloparsecs nearer than the western. How far each drawn star is in front or behind is a statistical spread round those trends, never a parallax. The Magellanic Bridge and the Stream are neutral hydrogen from a radio survey (HI4PI); only the end at the Clouds is anchored, so the Stream's distance beyond them is a model, and the map says it.

## Measured, modelled, illustrative

- **Measured:** each galaxy's place, distance, tilt, size and arm angle where a paper gives them, and the photograph's light.
- **Modelled:** what is behind and in front, such as the Antennae's tails and the SMC's depth; the Stream's distance.
- **Illustrative:** how far behind the Whirlpool's companion sits, the stars' individual places and brightnesses, and the colours.

None of these has been reviewed by an astronomer yet, and each card says so.

## Fly there

- [The Sombrero Galaxy](https://www.spaceradar.ai/#go=dso-m104)
- [The Whirlpool Galaxy](https://www.spaceradar.ai/#go=dso-m51)
- [The Antennae Galaxies](https://www.spaceradar.ai/#go=dso-antennae-galaxies)
- [The Carina Nebula](https://www.spaceradar.ai/#go=dso-carina-nebula)
- [The Small Magellanic Cloud](https://www.spaceradar.ai/#go=dso-smc)

## Pictures and sources

Screenshots of Space Radar (MIT licence). The photographs under the models are ESA/Hubble's (M51: NASA, ESA, S. Beckwith (STScI) and the Hubble Heritage Team; M104: NASA/ESA and the Hubble Heritage Team (STScI/AURA); CC BY 4.0) and ESO's for Carina (acknowledging VPHAS+ and the Cambridge Astronomical Survey Unit). The Gaia counts for the SMC are CC BY-NC 3.0 IGO. The papers are cited row by row in `registry/deepsky-heroes/` and in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md), section 3g.
