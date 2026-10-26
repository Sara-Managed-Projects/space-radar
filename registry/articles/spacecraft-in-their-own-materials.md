![The Hubble Space Telescope in orbit over the Earth: a silver foil body with two solar arrays and an antenna on a boom.](hubble.webp "Hubble in release 1.3.0: rebuilt here in aluminised foil, with its solar arrays and antennae, over the Earth.")

Release 1.3.0 is about craft that look like themselves. It adds 34 new models of spacecraft, landers, rovers and small bodies, taking the total to 165, and it changes how a model is lit. The second part matters as much as the first, so this article takes them in that order.

## Why a spacecraft looked like a toy

Until now every model went through a "toon" ramp: three flat steps of light, whatever the surface. That is right for the app's drawn shapes and wrong for a model whose file records what it is made of. Gold blanket, bare aluminium, white cloth and cells under glass all came out as one flat tone with a single highlight. The turning point was SLIM, the Japanese Moon lander, rebuilt with every feature JAXA's own model shows, which still read as a yellow box.

![SLIM, a gold-foil Moon lander, with the crinkled blanket and bright struts.](slim-materials.webp "SLIM in its own materials: crinkled gold foil, a white panel, bare metal nozzles.")

![SLIM drawn flat in the older look: a plain yellow box.](slim-flat.webp "The same lander in the older flat look, as a phone still draws it.")

The new look is physically based. At tier 1 and above (a laptop or desktop; a phone is tier 0), a model whose file carries real materials is lit with a metalness and a roughness for each surface. Gold and silver blanket gets crinkled folds, white beta cloth is matt, and a solar array shows its grid of cells under glass. It uses the same Sun and the same world's light and shadow as everything else. A phone keeps the flat look, and the frame-rate latch takes the new look off again if a machine cannot keep up. A model chooses with one registry field, `look: pbr` or `look: toon`.

## Flagships first

Webb is NASA's own model, re-baked from the larger of its two files with each of its 46 materials reduced separately, the 18 primary mirror segments kept whole, so the mirror is gold metal. Hubble was rebuilt here from published numbers and photographs at flagship detail, in aluminised foil. Neither shows a box any more.

![The James Webb Space Telescope, seen from the sunward side: a gold segmented mirror and a grey sunshield.](webb.webp "Webb in true materials: gold mirror segments and a layered sunshield, from NASA's own geometry.")

## Craft that were boxes

Many more of the new models replace a generic satellite. Biomass is an example, a forest-measuring radar satellite with a 12-metre mesh reflector on a 7.5-metre boom:

![Biomass drawn as the generic satellite of the earlier map: a white box with two blue panels.](biomass-before.webp "Before: Biomass as the generic satellite.")

![Biomass in release 1.3.0: a gold bus, a solar wing and a large mesh reflector on its boom.](biomass-after.webp "After: a model built from the published dimensions, with the reflector open.")

The batch also holds EarthCARE, the three Swarm craft and MetOp-SG A1; Mars Express, Gaia, Hayabusa2 and the United Arab Emirates' Hope; IRIS, TIMED, the two TRACERS, ISIS 1 and SERT 2 still joined to its Agena stage; and Tiangong, the Shenzhou orbital module, THEMIS and New Horizons. Where a boom is too long for the frame, TRACERS' four, it is drawn short and the card says so.

## Landers as they came to rest

The Moon's landers are drawn the way they came to rest: Vikram with its ramp down, Odysseus on its side, SLIM on its nose, and Blue Ghost, Surveyor 1 and 3, the Chang'e 3 to 6 landers, Yutu beside its lander, and the two Lunokhods. Zhurong is on Mars with its wings spread.

![Zhurong, China's Mars rover, on red ground with solar wings spread.](zhurong.webp "Zhurong on Utopia Planitia, wings spread, built from published dimensions.")

## Measured, modelled, illustrative

This is where the project is strict, so it is worth reading slowly.

- **Measured:** the geometry and the colours are the files' own. A model is either the agency's published file or built here from cited metres and several photographs, and a built one's card says "shape built from published dimensions and pictures".
- **Modelled:** the metalness and the roughness of each finish are typical values for that kind of surface, chosen by this project, not measured on the craft.
- **Illustrative:** the foil's folds and the cell grid are drawn at a size the eye can read at the app's framing, not the size of the real ones. The fill light on the shadowed side is ours too; in space that side is black, and a model nobody can see says nothing.

Yutu-2 has no landing site on the map because nobody publishes where it is now.

## See them

- [The Hubble Space Telescope](https://www.spaceradar.ai/#go=sat-20580)
- [The James Webb Space Telescope](https://www.spaceradar.ai/#go=deep-jwst)
- [Zhurong, Utopia Planitia](https://www.spaceradar.ai/#go=utopia)
- [SLIM, near Shioli crater](https://www.spaceradar.ai/#go=slim)

## Pictures and sources

Screenshots of Space Radar (MIT licence). Webb is NASA's model (public domain). The other shapes are built here from published numbers, under the repository's licence, and compared with agency photographs that are public domain or CC0; the exact rows, with what was looked at and what was not reproduced, are in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md), sections 3b-14 to 3b-16.
