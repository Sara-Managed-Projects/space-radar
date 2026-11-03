![WorldView-3 in orbit, a gold foil telescope barrel above a dark bus with two blue solar wings.](worldview-3.webp "WorldView-3, seen through the close lens: a lens for looking only, not what the map's normal camera gives.")

Release 1.4.0 adds sixty models of spacecraft and rocket stages, taking the map from 165 models of craft and small bodies to 225. Before this, most of these sixty wore a generic satellite shape. Now each has its own: the agency's model where one exists, otherwise built here from cited metres and photographs.

## What arrived

The sixty come in eight groups:

- **Four landers:** Luna 16, Mars Pathfinder with Sojourner, Phoenix and Mars 3, standing on their landing sites.
- **Six communications craft:** Thuraya-2 and -3, Inmarsat-4, ViaSat-3, O3b, Globalstar's second generation and O3b mPOWER.
- **Six military and small craft:** WGS, AEHF, MUOS, SBIRS GEO, AMSAT-OSCAR 7 and SWAS.
- **Ten weather craft:** Meteosat-11, Fengyun-2H, Meteosat-12 (MTG-I1), MTG-S1, INSAT-3D, GEO-KOMPSAT-2A and 2B, Meteor-M No.2-4, Midori II and Resurs-DK 1.
- **Seven commercial Earth imagers:** WorldView-3, BlackSky Global Gen-2, Satellogic NewSat, Planet Pelican, the HawkEye 360 Pathfinder block, GHGSat-C and Gaofen-1.
- **Ten national Earth-observation craft:** CBERS-4 and 4A, Amazonia-1, KOMPSAT-3 and 3A, KOMPSAT-5, Cartosat-2, Resourcesat-2 and 2A, EOS-06, Kanopus-V and Resurs-P.
- **Eleven science craft:** GCOM-W, GCOM-C, DAMPE, CSES, SCISAT-1, the two PROBA-3 craft, PROBA-V, FORMOSAT-7, OAO-2 and OAO-3.
- **Six spent rocket stages:** the second stages of the Kosmos-3M, Delta II, Atlas V (Centaur), Falcon 9 and H-IIA, and the Centaur D.

## Why a satellite's shape matters on a map

A map of orbits is mostly dots, and the question a visitor asks of a dot is what it is. A generic shape answers that badly: it says "satellite" for an object that may be a weather station, a spy camera or a discarded fuel tank. The shape tells you the job.

MUOS is a clear case. It is one of the US Navy's narrowband communications satellites, and it is known by its two large gold mesh reflectors. WorldView-3 is built round its telescope, a barrel with its aperture to the Earth under the bus. Meteosat-12, the first imager of Meteosat Third Generation, is stabilised on three axes, so it no longer needs to spin as the older Meteosats do, and its box shape shows it.

![MUOS in orbit: a central body, two strings of blue solar panels and a large gold mesh dish.](muos.webp "MUOS, close lens: a gold mesh reflector, the mark of the craft, .")

The stages are a different kind of object. They are not working craft. They are what was left in orbit after the launch, and on the map they now look like empty tanks with an engine at one end.

![Meteosat-12 in orbit, a foil-covered box with its round imager window and a single solar wing.](meteosat-12.webp "Meteosat-12 (MTG-I1), close lens, built here from cited dimensions. It wore the generic shape before 1.4.0.")

## How the models were built

Most of these craft have no published model. For WorldView-3 a search of NASA's 3D Resources, 1 583 paths read on 2026-10-27, found none, and no operator was found publishing one under a free licence. So the shapes are built here in code, one script a craft, from a part library first made for release 1.3.0, with the dimensions cited and the pictures listed beside each file. No image-to-3D tool was used and no published mesh was copied. The rocket stages came from a parametric builder, where one stage is a few dozen calls with its published dimensions as the arguments. SWAS is the exception in its group, from NASA's own model.

## Why it was hard

A builder often has only a maker's illustration, a pre-launch picture and a table of sizes. The rule was to draw only what has been officially released. Military craft are drawn only from what the services and the makers have published. ViaSat-3 is drawn as it was designed, because no free picture shows how the first one's reflector really lies, and the card says so. The first craft's reflector did not deploy fully in 2023, and a confident drawing of how it lies would be a claim nobody can check.

## Measured, built, not known

- **Measured:** each craft's position, from its orbital elements, and the dimensions cited for each model.
- **Built here:** the shape itself, from those numbers and pictures. Its card says how it was made.
- **Not known:** anything an operator has not released. It is left out or drawn as designed, not guessed, and it is said where it matters.

## How to try it

Open [WorldView-3](https://www.spaceradar.ai/#go=sat-40115), [Meteosat-12](https://www.spaceradar.ai/#go=sat-54743) or [a MUOS](https://www.spaceradar.ai/#go=sat-38093) and use Follow to stay with it. "How we know" on the card says where the shape came from.

## Pictures and sources

Screenshots of Space Radar 1.4.0 (MIT licence) from the project's `look` workflow, probe `model`, cropped, in the close lens the probe uses to fill the picture. Each model's sources and licence are in `registry/models.yaml`. The models were built by Sara-Agent, the project's agent, in pull requests [1290](https://github.com/Sara-Managed-Projects/space-radar/pull/1290), [1291](https://github.com/Sara-Managed-Projects/space-radar/pull/1291), [1292](https://github.com/Sara-Managed-Projects/space-radar/pull/1292), [1294](https://github.com/Sara-Managed-Projects/space-radar/pull/1294), [1295](https://github.com/Sara-Managed-Projects/space-radar/pull/1295), [1296](https://github.com/Sara-Managed-Projects/space-radar/pull/1296), [1297](https://github.com/Sara-Managed-Projects/space-radar/pull/1297) and [1300](https://github.com/Sara-Managed-Projects/space-radar/pull/1300).
