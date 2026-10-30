![Sagittarius A* as Space Radar draws it: a dark shadow, a thin bright ring and a disc of orange light brighter on one side.](sgr-a-star.webp "Sagittarius A* as its card frames it. This is a model, drawn far larger than it would look from here.")

Release 1.4.0 draws Sagittarius A*, M87* and Cygnus X-1 as black holes in 3D, with each shadow sized from the hole's mass, and the sizes come out within the Event Horizon Telescope's measurements. Until now a stop at a black hole showed the EHT's photograph on a flat square. The photographs are still on the cards. The scene is a model you can fly round.

## What is on screen

There are three things to look for. The shadow is the dark middle. Round it runs a thin, sharp photon ring, made by light that went round the hole before it reached you. Outside that is the disc of hot gas, glowing white-yellow near the middle and deep orange to red further out.

One side of the disc is brighter than the other. The gas on that side is moving toward you, and its light is shifted and brightened. The far side of the disc does not hide behind the hole. Its light bends over the top and under the shadow, so you can see the back of the disc from the front.

![Sagittarius A* turned 75 degrees: the disc seen more from its edge, with its far side bent over the shadow.](sgr-a-star-turned.webp "Sagittarius A* turned 75 degrees. The arch over the shadow is the far side of the disc, bent by the hole.")

M87* has a jet, narrow, faint and bluish, at a position angle of 288 degrees and 17 degrees from our line, with its knots, as Walker and others measured in 2018 and Perlman and others in 2011. Its true length, 18 000 light-years, is drawn only when you stand outside it. The counter-jet is a trace.

![M87* turned 80 degrees, its disc nearly side-on and a pale blue jet running out to the right.](m87.webp "M87* turned 80 degrees, with the jet to the side. The hole is drawn 3.8 times larger than life here.")

Cygnus X-1 looks like something else, and rightly so. Its companion, the blue supergiant HDE 226868, has 29 Suns of mass and is 22.9 Suns wide, on an orbit of 0.22 astronomical units. The hole beside it is too small to find at that scale, even drawn 19 400 times larger than it is. The supergiant fills the view.

![Cygnus X-1: a large pale blue star filling the frame, with its small companion's disc beside it.](cygnus-x-1.webp "Cygnus X-1 as framed: the supergiant dominates, and the disc is a small patch at its side.")

## How it works

Each pixel of a camera-facing square runs a small piece of general relativity in the shader. It traces the light back through the curved space of a hole that does not spin, stepping along Binet's equation 72, 120 or 170 times depending on the device. If the ray falls in, the pixel is shadow. If it crosses the disc, the pixel takes the disc's colour, shifted by a factor g and brightened as g to the fourth power, which is where the bright side comes from.

No size was set by hand. The shadow's width follows from the mass in the registry, and the model gives Sagittarius A* a shadow of 53 microarcseconds as seen from Earth, against the EHT's 51.8 ± 2.3, and M87* 40.6, against 42 ± 3. M87's ring comes out brightest in the south from Earth, as in the EHT's picture, and a test holds that.

## Why it was hard

Light from a patch of disc can arrive by more than one path, so a flat sprite or a texture cannot do this: it has to be traced for each pixel, on phones as well. It costs at most five draw calls and 13 kB of gzipped code, fetched only when a black hole is shown, so a visitor who never flies to one pays nothing for it. When it shipped, its cost had been measured only in software, not on a real graphics card, so the step counts may still change.

Some things still look wrong, and they are worth saying. From the card's framing the camera is about 100 hole-masses away, so the view is wide-angle and the arch is clear only from the side. The stars behind a hole are not bent, because that would need a second render pass. There is no spin and the disc is thin.

## Measured, modelled, illustrative

- **Measured:** the masses and places, the EHT's shadow sizes (2019 and 2022), M87*'s jet angles and knots, and Cygnus X-1's orbit and supergiant.
- **Modelled:** the disc (Shakura and Sunyaev, in Schwarzschild space, no spin) and the axis of Sagittarius A*, chosen at 48 degrees, the most the EHT's fit allows, so the disc's far side shows above the shadow.
- **Illustrative:** the filaments in the disc, the soft glow, and the width of the jet.

The line under each stop says the same in short: a model, not the photograph, drawn far larger than it would look from here, with its place measured.

## How to try it

Open [Sagittarius A*](https://www.spaceradar.ai/#go=exotic-sgr-a-star) and drag to turn it, then try [M87*](https://www.spaceradar.ai/#go=exotic-m87-star) for the jet and [Cygnus X-1](https://www.spaceradar.ai/#go=exotic-cygnus-x-1) for the supergiant. The black-holes trip visits them with its narration written again for the model, saying that the EHT photographed the gas and the shadow and that what is drawn is a model.

## Pictures and sources

Screenshots of Space Radar 1.4.0 (MIT licence) from the project's `look` workflow, probe `r14-mwbh`, cropped. The black holes were built by Sara-Agent, the project's agent, in [pull request 1293](https://github.com/Sara-Managed-Projects/space-radar/pull/1293). Sources: the Event Horizon Telescope Collaboration, 2019 and 2022; Walker and others, 2018; Perlman and others, 2011; Brocksopp and others, 1999; Miller-Jones and others, 2021. The full list is in `CREDITS.md`, section 3m.
