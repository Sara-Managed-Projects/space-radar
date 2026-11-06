![Pan seen side on in the map: a pale walnut-shaped moon with a sharp ridge round its middle, its card open on the left.](pan.webp "Pan in release 1.9.0, as the look workflow photographed it: the equatorial ridge that Cassini found, from the Planetary Data System's shape model.")

Release 1.9.0 draws eleven of Saturn's small moons in the shapes Cassini measured. Pan, Daphnis, Atlas, Prometheus, Pandora, Epimetheus, Janus, Telesto, Calypso, Helene and Hyperion used to be dots, and a generic grey rock when you flew close. Select one now and the rock is replaced by the plate model that Thomas, Joseph and Ansty built from Cassini's pictures.

## The eleven

Most of these moons are tiny by Saturn's standards, a few kilometres to a few hundred across, and none is round. Pan and Atlas orbit inside or at the edge of the rings and have ridges round their equators, so from the side they look like walnuts or flying saucers. Prometheus is long and narrow. Epimetheus and Janus share almost the same orbit and swap places every four years. Telesto and Calypso ride in Tethys's orbit, one ahead and one behind, and Helene does the same in Dione's. Hyperion, farther out, is the spongy one, one of the largest irregular bodies in the Solar System.

![Atlas in the map, a smooth pale disc with a raised rim, like a flying saucer seen slightly from above.](atlas.webp "Atlas, the saucer at the edge of Saturn's A ring, from the camera's first side in the look run.")

## Where the shapes come from

The source is one dataset: Saturn Small Moon Shape Models V1.0, delivered to NASA's Planetary Data System (doi:10.26033/ewy3-jy61). Each model there has 27,000 to 29,000 plates. Space Radar thins each to 16,000 triangles, about 75 to 80 kB a file, and loads it only when you select the moon. The thinned shape keeps the source's volume within 0.02 % and its size within a few metres; the models' own uncertainty, in the dataset's words, is typically well under half a kilometre.

The grey of each moon is not picked by eye. It comes from its geometric albedo, how much light it throws back, through the same rule the small bodies of release 1.5.0 use. Hyperion's is 0.44; the others' run from 0.71 to 1.67, which is fresh ice. That is why most of them look nearly white.

## Why it matters

Saturn's moons are usually shown as a list of names. The shapes are the story: a moon thought to have grown a ridge from ring particles, two moons that trade orbits, a moon like a sponge. Placed on the map, each sits at its own distance from Saturn, and the card gives its height above the planet, its speed and its distance from Earth.

## How to try it

Open one directly, press "Fly to it", and drag to turn round it:

- [Pan, the ridge in the Encke Gap](https://www.spaceradar.ai/#go=pan)
- [Atlas, the saucer](https://www.spaceradar.ai/#go=atlas)
- [Janus and Epimetheus, the orbit swappers](https://www.spaceradar.ai/#go=janus)
- [Hyperion, the sponge](https://www.spaceradar.ai/#go=hyperion)

The others are on the moons layer: search for Daphnis, Prometheus, Pandora, Epimetheus, Telesto, Calypso or Helene.

![Hyperion in the map, a pale irregular lump with shallow hollows, against stars.](hyperion.webp "Hyperion from the far side of the look run. Its large hollows are in the model; its small craters are not.")

## What was hard

The first version of the files drew streaks: the generator numbered the triangles twice, so half the surface faced inward. A contract test caught it before the release, and the files were made again. The other difficulty was looking at the result. When the release was made, the app would not start in a headless browser on a build machine that was overloaded, so the moons were checked only on sheets drawn beside Cassini's photographs, and the probe written to photograph them in the app had never run. It ran for the first time on 6 November 2026 against the released 1.9.0, for Pan, Atlas, Janus and Hyperion: every file arrived, no errors, and the pictures on this page are from that run.

## Measured, modelled, reconstructed

- **Measured:** the shapes, from Cassini's pictures through the published models; the albedos, read from the moons' Wikipedia pages on 5 November 2026, which cite Verbiscer and others (2007 and 2018); the orbits, from JPL.
- **Modelled:** the turning. Nine moons turn at the pole and rate of NAIF's `pck00011.tpc`, the IAU's 2009 constants, which keeps one face to Saturn. Which side faces the camera at a given moment is that formula's, not a prediction, and the card says so. Hyperion and Daphnis are not turned at all: Hyperion tumbles chaotically and neither is in the constants file.
- **Reconstructed:** any part of a moon Cassini did not see is the fit's. The models are global shapes: the craters of Hyperion, Epimetheus and Janus are not in them, only the large hollows and swells. The place of each moon on its orbit is marked on the card as illustrative.

Not in this release: Phoebe, whose 123 MB model was not fetched, and Amalthea, Thebe, Deimos, Proteus and Larissa, whose models sit on a server that answered the build machine with a bot challenge. The project did not work around it.

## Pictures and sources

Screenshots of Space Radar 1.9.0 (MIT licence) from the project's `look` workflow, probe `r190-moons`, run 42169987369. Shapes: Thomas, Joseph and Ansty, Saturn Small Moon Shape Models V1.0, NASA Planetary Data System. The models were prepared by Sara-Agent, the project's agent, in [pull request 1383](https://github.com/Sara-Managed-Projects/space-radar/pull/1383); every row is in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
