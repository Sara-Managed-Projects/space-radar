![The Lagoon Nebula as Space Radar draws it, glowing pink gas round a pale hollow, with dark dust in front.](lagoon.webp "The Lagoon Nebula from its own side of the sky: the light is the photograph's, without its stars.")

Release 1.4.0 draws eight emission nebulae in 3D, as walls of glowing gas with dust in front and stars among them, where the map used to show a flat photograph: the Lagoon, the Trifid, the Eagle with its Pillars, the Omega, the Rosette, the California, the North America with the Pelican, and the Cat's Paw. Release 1.2.0 did the same for [Orion and the Ring](https://www.spaceradar.ai/read/nebulae-in-three-dimensions.html). These eight share one builder, so each new nebula is a page of numbers and not a new program.

## What you see when you fly in

From the direction of the Earth each nebula looks much as it does in a telescope picture. Turn away from that line and the picture stops being a picture. Move 25 degrees to one side of the Lagoon, close in, and the bright gas lies on a curved wall with a hollow behind Herschel 36 and a dark lane hanging in front of it. The cluster NGC 6530 sits on the near side.

The Eagle is a cavity. The cluster NGC 6611 has blown a hole in its cloud, and the far wall of that hole glows. The Pillars of Creation stand in front of the wall as dust, with their tips toward the cluster, which is what wears them away.

![The Eagle Nebula seen from 25 degrees off our line, a bright cavity with dark dust standing in front of it.](eagle.webp "The Eagle at 25 degrees off our line and 0.4 of the arrival distance. The dark shapes are dust drawn in front of the wall.")

The Rosette is a thick ring: the winds of the cluster NGC 2244 emptied the middle of a thin, sheet-like cloud. It is drawn as a shell flattened along our line, and its near face carries 45 % of the light, so you can see through the middle and into it. The Cat's Paw is five bubbles along one dark filament, three of them with near caps. The North America and the Pelican are one region of glowing gas round the Bajamar Star, split in two by the dark cloud LDN 935 in front of it.

![The Rosette Nebula from 25 degrees off our line, a pink shell with a darker cavity in the middle.](rosette.webp "The Rosette, a shell round a cavity. Its depth along our line is drawn, not measured.")

## How the shape was made

The light is real, and it comes from the photograph. A script removes the stars from each picture and keeps what remains as the nebula's light, then the bright stars go back as stars at the places and brightness SIMBAD gives. For four of the eight (the Lagoon, the Trifid, the Eagle and the Omega) a sharper map of the same photograph, taken from the archive's large file, is laid round the heart.

The shape is a reconstruction. Telescopes measure a nebula's direction and its brightness very well and its depth badly, so each shape follows what papers say about that nebula: a blister on the near face of a dark cloud for the Lagoon (Tothill and others, 2008), a young bubble cut by dust lanes for the Trifid (Lefloch and Cernicharo, 2000), a front seen nearly edge-on for the Omega (Pellegrini and others, 2007), a wind in a sheet for the Rosette (Wareing and others, 2018). From our own side the model shows exactly the photograph's light. Turned, the same light lies on the reconstructed walls.

The same release takes every flat photograph of a nebula or galaxy out of the scene, so an object is now a 3D reconstruction, or a soft glow of its catalogue size until it has one. The card keeps the photograph behind "Compare with the photograph", where it can be held against the model.

## Why it was hard

A single picture has one point of view, and a wall built from it is only right from that point. The further you turn, the more the model is saying something the photograph never said. The rule that a lit front is brighter where it is nearer gives the walls their relief, and it is a rule of thumb, not a measurement. The other difficulty is the near side. A shell with a front to it blocks your view of its own back, so the near cap takes a share of the light (35 % on the Trifid, 45 % on the Rosette) to keep both sides readable.

## Measured, reconstructed, illustrative

- **Measured:** each nebula's direction, the places, brightness and types of its ionising stars from SIMBAD, and its light, from the photograph.
- **Reconstructed:** the walls, the bubbles and the shells, each after the paper named on its card.
- **Illustrative:** every depth. The dust in front of the Lagoon is drawn 8 light-years in front and the dark cloud before the North America 14, and neither number is measured. Nothing measures the California's depth at all; it is a long, shallow sheet lit by Xi Persei, and the card says so.

Each card also says that the model has not yet been reviewed by an astronomer.

## How to try it

Open [the Lagoon Nebula](https://www.spaceradar.ai/#go=dso-m8), wait for the flight to end, and drag sideways. From there, [the Eagle](https://www.spaceradar.ai/#go=dso-m16) and [the Rosette](https://www.spaceradar.ai/#go=dso-rosette-nebula) show the two other shapes, the cavity and the shell.

## Pictures and sources

Screenshots of Space Radar 1.4.0 (MIT licence) from the project's `look` workflow, probe `heroes`, cropped. The light comes from photographs by ESO, the Rubin Observatory and NOIRLab, with each credit on its card and in `CREDITS.md`. The nebulae were built by Sara-Agent, the project's agent, in [pull request 1288](https://github.com/Sara-Managed-Projects/space-radar/pull/1288), and the photographs were taken out of the scene in [pull request 1298](https://github.com/Sara-Managed-Projects/space-radar/pull/1298).
