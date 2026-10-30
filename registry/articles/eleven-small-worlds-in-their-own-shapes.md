![Arrokoth, two reddish lobes of different sizes joined at a neck, against the Milky Way, with its card open beside it.](arrokoth.webp "Arrokoth in release 1.5.0: New Horizons' shape model with its own brightness map, 43 au from the Sun.")

Release 1.5.0 gives eleven small bodies of the Solar System the shapes that spacecraft and radar actually measured. Select one of them on the map and fly close, and the generic grey rock is replaced by a published shape model: Arrokoth's two lobes, Kleopatra's dog bone, the contact binary 1996 HW1. Each sits on its own orbit from JPL, and each card says what was seen and what was filled in.

## The eleven

Five come from the missions that flew past them. Arrokoth is New Horizons' target beyond Neptune, the most distant object a spacecraft has visited, two lumps of ice and rock joined at a neck about 35 kilometres from end to end. Donaldjohanson is the main-belt asteroid NASA's Lucy flew past in April 2025, named for the discoverer of the Lucy fossil that the mission is named after; its shape is DLR's, from Lucy's pictures. The comet 67P/Churyumov-Gerasimenko and the asteroids Lutetia and Steins come from Rosetta.

Six come from radar. Toutatis, Geographos, Kleopatra, Mithra, Golevka and 1996 HW1 were never visited; their outlines were worked out from the echoes of radio pulses sent from Earth by planetary radar teams; Toutatis's model, for one, is Hudson and Ostro's from Goldstone. The models are the ones NASA publishes for 3D printing.

![Donaldjohanson, a pale elongated rock with a narrow waist, seen as the map frames it.](donaldjohanson.webp "52246 Donaldjohanson as the map frames it on arrival: DLR's shape from Lucy's flyby.")

None of these ten asteroids was a place on the map before this release. The map drew a generic rock only for what JPL's close-approach table held that week, and 67P was one dot among the comets.

## Grey from albedo, relief from the source

The colour of each body is not chosen by eye. Its grey follows its measured albedo, the fraction of light it reflects, through one rule for all eleven, with a tint of the same lightness for its spectral type. The albedo and its reference are written in each body's row of the registry. Arrokoth's is the published 0.21 and 67P's the published 0.065, which is why the comet looks so much darker than the asteroids beside it.

Where a model had to be simplified to load quickly in a browser, the full-resolution model's surface detail was baked into a normal map inside the file, so the craters and ridges you see are the source's own and nothing is invented. Arrokoth keeps its published brightness map, softened, and its red is a modelled approximation of New Horizons' colour.

![Kleopatra, a long metal-rich asteroid shaped like a dog bone, with its card open.](kleopatra.webp "216 Kleopatra, 276 km from end to end, from the radar shape model (Ostro and others, 2000).")

## Why it was hard

Shape models come in many formats and sizes. Rosetta's full 67P model has 788 000 plates; the browser gets 40 000 with the rest of the detail carried in the normal map, and the file arrives only when you select the comet and come close. The turning was the other problem. The mission bodies turn at the pole and rate their datasets give. The radar bodies do not turn at all, because their files state no axes, and their cards say so rather than inventing a spin.

## How to try it

Search the map for a name, or open one directly:

- [Arrokoth, beyond Neptune](https://www.spaceradar.ai/#go=asteroid-486958)
- [Kleopatra, in the main belt](https://www.spaceradar.ai/#go=asteroid-216)
- [Donaldjohanson, visited by Lucy](https://www.spaceradar.ai/#go=asteroid-52246)
- [1996 HW1, a near-Earth contact binary](https://www.spaceradar.ai/#go=asteroid-8567)

Press "Fly to it", then drag to turn round the body. "About it" on the card says how its shape was made.

![1996 HW1, two lobes touching, a smooth radar shape seen against dark space.](1996-hw1.webp "8567 (1996 HW1), found by radar to be a contact binary: two lobes touching.")

## Measured, modelled, reconstructed

- **Measured:** the outlines, the poles and rotation rates of the mission bodies, and the orbits, which are held to JPL Horizons within 0.0002 au by the project's tests.
- **Modelled:** the grey, from one rule on the albedo; the tint, from the spectral type; and the phase of every turn, which no source gives for a chosen day.
- **Reconstructed:** the sides that no camera saw. Lutetia, Steins, Donaldjohanson and Arrokoth were each imaged from one side as the spacecraft went by, and their cards say which part is inferred.

The radar shapes are smooth at this size, from 3 000 to 13 000 plates each: recognisable, but plain. About 54 more radar shapes, and Halley, Gaspra, Ida and Mathilde, wait on a server that refused the project's build machine. The Rosetta datasets for 67P, Lutetia and Steins state no licence, and whether to keep them is still an open question for the owner.

## Pictures and sources

Screenshots of Space Radar 1.5.1 (MIT licence) from the project's `look` workflow, probe `r15-b1`. Arrokoth's shape and albedo map: Porter (2024), New Horizons LORRI data, NASA Planetary Data System (CC0). Donaldjohanson: DLR, NASA NAIF Lucy SPICE bundle (CC0). Radar shapes: NASA 3D Resources (public domain). The shapes were prepared by Sara-Agent, the project's agent, in [pull request 1309](https://github.com/Sara-Managed-Projects/space-radar/pull/1309); every row is in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
