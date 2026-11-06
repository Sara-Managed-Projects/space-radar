![The Hohmann Transfer Hop simulator: Earth with the space station's orbit, a dashed transfer ellipse out to a large dashed circle at 42,164 km, and the two burns of 2.40 and 1.46 km/s written above it.](hohmann.webp "Hohmann Transfer Hop on spaceradar.ai, release 1.9.0: from the space station's orbit to geostationary in two burns, 3.86 km/s in all.")

Release 1.9.0 adds fourteen simulators to the Space Radar Lab, which now lists 90 of them. Each one is a single page that takes one idea in space science and lets you push it with a slider: how far apart two burns have to be to climb to geostationary orbit, where the habitable zone sits around a dim red star, how much older a twin gets while the other flies at 99 % of the speed of light.

## What is in the fourteen

Eight came in the first batch. **Kepler's Third Law Race** turns the eight planets at their true relative speeds and keeps a table of each orbit's size, period and P²/a³; all eight ratios land between 0.986 and 1.001. **Sunshine by Planet** draws the sunlight at each planet as a bar, from 9,082.7 W/m² at Mercury to 1.508 at Neptune, so Earth gets about 900 times more than Neptune. **Escape Velocity Ladder** fires balls straight up at 8, 10, 11 and 11.2 km/s, with the Moon's distance marked; the last one never comes back. **Sun and Moon Look the Same Size** sets the two discs at their true sizes in the sky and moves the Moon from perigee to apogee, naming a total or an annular eclipse. **Parallax Thumb Trick** shifts a nearby star against far ones between January and July. **Why GEO Stays Put** puts a satellite at any height from 200 to 60,000 km over a dot on the ground; at 35,786 km the two stay together. **Star Colour Is Temperature** turns a temperature slider into a colour, a peak wavelength and a spectral class. **The Moon Drifts Away** runs Earth and the Moon forward 1.4 billion years.

Six more came in the second batch. **Twin Clock Time Dilation**, **Big Stars Burn Fast**, **Squeeze Earth Into a Marble**, **Habitable Zone Slider**, **Olympus Mons vs Everest** and **Hohmann Transfer Hop**.

![The Habitable Zone Slider set to the Sun's power: a green band from 0.99 to 1.67 AU on a log ruler, with Venus marked too hot and Earth and Mars in the zone.](habitable-zone.webp "Habitable Zone Slider with the star at 1.0 times the Sun's power: the zone runs from 0.99 to 1.67 AU.")

## Why they matter

A number on a card is easy to read and hard to feel. "Geostationary orbit is 35,786 km up" means little until you drag a satellite down to 400 km and watch it lap the ground dot 15.5 times a day. The Lab is where the map's cards send you when one idea needs to be felt rather than read, and each page works with a finger on a phone or with the keyboard alone.

Each page has the same few parts: a picture that runs on its own, a Pause button, a time slider, one slider for the value that matters, a caption in plain words that changes with it, and a grey box called "What is and is not to scale". Under "How this was made and sources" every number is traced to where it came from, with the date it was read.

## How to try it

Open the [Lab](https://www.spaceradar.ai/lab/) and pick one, or start with these three:

- [Hohmann Transfer Hop](https://www.spaceradar.ai/lab/hohmann-transfer-hop/): drag the target orbit out to 42,164 km and the two burns read 2.40 and 1.46 km/s, 3.86 km/s in all, and the half-ellipse takes 5.29 hours.
- [Habitable Zone Slider](https://www.spaceradar.ai/lab/habitable-zone-slider/): turn the star's power down to 0.000566 of the Sun's and the slider snaps to TRAPPIST-1, whose zone is 0.024 to 0.040 AU, with planets e and f inside it.
- [Twin Clock Time Dilation](https://www.spaceradar.ai/lab/twin-clock-time-dilation/): at 0.99 of light speed the ship's clock reads one year while the home clock reads 7.09.

Then go [back to the live map](https://www.spaceradar.ai/#go=sat-25544) and find the space station whose orbit the Hohmann page starts from.

![Twin Clock Time Dilation at 0.99 of light speed: a blue home clock and an orange ship clock, with the line "1 ship year = 7.09 home years" under them.](twin-clock.webp "Twin Clock Time Dilation at 0.99 c: the Lorentz factor is 7.089.")

## What was hard

Writing one number down is easy; making fourteen pages agree with their own sources is not. Three of the requests that asked for these pages had arithmetic that the pages do not repeat: Saturn's sunlight is 14.9 W/m², not 14.8, and a 10 km/s shot peaks 31,900 km from Earth's centre, not 31,896. The Habitable Zone request said Mars falls outside the Sun's zone, but its own edges, 0.99 to 1.67 AU, put Mars at 1.524 AU inside it, so the page follows the numbers and labels Mars "in the zone". The Olympus Mons lesson on the map's card now says "about 2.4 times as tall as Mount Everest", not two and a half, so the card and the Lab page agree.

## Measured, modelled, reconstructed

- **Measured:** the inputs. Planet distances and periods from JPL and NASA's planetary fact sheets, Earth's GM and radius from JPL and NASA, the Moon's perigee and apogee, Proxima Centauri's 4.2465 light-years, the heights of Olympus Mons (21.287 km), Everest (8.849 km) and Mauna Kea (4.207 km).
- **Modelled:** everything a formula gives. Escape heights from energy, the habitable zone from the simple square-root rule (Kopparapu and others, 2013), star lifetimes from 10 billion years times the mass to the power of minus 2.5, which the page calls a rough law, a star's colour from a blackbody, the Moon's drift at today's 3.8 cm a year held constant.
- **Reconstructed:** the pictures' pace. The time-lapse speeds of the orbits and clocks, the ball's flight in the escape picture and the mountains' widths are drawn for clarity, and the grey box on each page says so. The parallax angle is exaggerated, and that page says so too.

The Lab pages are English-only, as the 76 before them are.

## Pictures and sources

Screenshots of the live pages on spaceradar.ai, release 1.9.0 (MIT licence), taken on 6 November 2026; the Lab pages are separate from the 3D map that the `look` workflow photographs. The simulators were built by Sara-Agent, the project's agent, in [pull request 1383](https://github.com/Sara-Managed-Projects/space-radar/pull/1383) from public requests #583 to #597; every source is listed on its page and in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
