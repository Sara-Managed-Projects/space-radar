![The Milky Way's stage with the pulsar PSR J0437-4715 selected: its card says 509 light-years and 5.76 milliseconds a turn.](psr-j0437.webp "PSR J0437-4715, the nearest millisecond pulsar, 509 light-years away by parallax.")

Release 1.5.0 fills Space Radar's sky with what the catalogues know and the map had left out: the IAU's approved star names, more than ten thousand stars whose distance has never been measured, 4 383 pulsars, magnetars, dead stars and quiet black holes, the dwarf galaxies of the Local Group, named clusters of galaxies, the farthest galaxies yet found and a thousand quasars. Every one of them is something you can search for, select and read about, and every card says how its distance was found, or that it was not.

## A star with no distance

The map's 109 389 stars are each placed in 3D at the distance their parallax gives. The catalogue they come from, HYG, also lists 10 224 stars that have no parallax at all. Before this release they were simply missing. Now they are drawn as directions: points on the sky you see from a world's own stage, where you would look up and find them, but nowhere in the 3D space between the stars, because nobody knows where along that line they are.

Tap one and its card opens with its brightness and its class, and no distance. The row says "Not measured", and the camera stays where it is, because there is no place to fly to. The Garnet Star in Cepheus, one of the reddest stars the eye can see, is one of them. At the Camera setting about 850 of these stars are bright enough to be drawn; the rest are fainter, and the 63 that have names can be found by search.

![The card of the Garnet Star, a red supergiant: its magnitude 4.23 and class M2Ia, and no distance.](garnet-star.webp "The Garnet Star's card: a magnitude and a class, and no distance, because none has been measured.")

The same release joins the stars to the IAU's list of approved names, so a star's card can show the name the International Astronomical Union has given it, and a search for one of the names it gave to planets finds the planet.

## Dead stars, pulsars and black holes

The pulsars come from the ATNF catalogue, version 2.9.0, which lists 4 503. The map places 4 383 of them: by parallax where its error is under 20 %, by the cluster or remnant a pulsar belongs to where that is known, and otherwise by the dispersion of its radio pulses, which the card calls a model's estimate. They are small marks on a layer that is off until you turn it on. The magnetars of the McGill catalogue, the black holes of the BlackCAT tables, Gaia BH2, four record-holding white dwarfs and the 24 brown dwarfs within 20 light-years join them. Luhman 16 A, the nearest brown dwarf, is 6.5 light-years from the Sun.

![Luhman 16 A selected among the nearby stars: a brown dwarf 6.51 light-years from the Sun.](luhman-16.webp "Luhman 16 A, a brown dwarf 6.51 light-years away: a card and a mark, with no photograph.")

## Beyond the Milky Way

The Local Volume Database adds 85 confirmed dwarf galaxies of the Local Group the map did not have, which with the Milky Way, Andromeda and Triangulum makes 124 members. Thirty-five clusters of galaxies have their own records, among them the Bullet Cluster and El Gordo. A thousand of the brightest quasars of the Milliquas catalogue are on a layer of their own, with all nine known beyond a redshift of 7.

At the far end are the record holders. MoM-z14, at a redshift of 14.44, is drawn where it is now, 33.9 billion light-years away. That number is a comoving distance worked out from the redshift with the Planck 2018 cosmology, and the card gives the time its light has travelled from the same redshift beside it, so the two are not confused.

![MoM-z14 selected against the oldest light, the cosmic microwave background, with its card open.](mom-z14.webp "MoM-z14, at redshift 14.44, against the map's picture of the oldest light.")

## Why it was hard

None of this may slow down the first screen. The new catalogues together weigh 247 kB compressed, and none of it is fetched when the page opens: it arrives the first time a visitor searches, opens one of these layers, follows a link to one of these objects or climbs the ladder to where they are.

## Measured, modelled, illustrative

- **Measured:** positions, pulsar periods, parallax distances and redshifts, each from the catalogue or paper the card names.
- **Modelled:** a pulsar's distance from its dispersion, and a galaxy's present distance from its redshift. Both cards say so.
- **Illustrative:** the marks themselves. Nothing here is a 3D model except the black holes' existing portraits.

## How to try it

- [PSR J0437-4715, the nearest millisecond pulsar](https://www.spaceradar.ai/#go=exotic-psr-j0437-4715)
- [Luhman 16 A, the nearest brown dwarf](https://www.spaceradar.ai/#go=exotic-bd-luhman-16-a)
- [MoM-z14, the farthest galaxy on the map](https://www.spaceradar.ai/#go=exotic-mom-z14)

Or search for "Garnet Star", then look at its card.

## Pictures and sources

Screenshots of Space Radar 1.5.1 (MIT licence) from the project's `look` workflow, probe `r15-a45`. The data: IAU WGSN star names (CC BY); HYG v4.4 (CC BY-SA 4.0); the ATNF pulsar catalogue (Manchester and others, 2005); the McGill Online Magnetar Catalog (Olausen and Kaspi, 2014); BlackCAT (Corral-Santana and others, 2016); the Local Volume Database (CC0); MCXC and Milliquas v8 through HEASARC. The work is Sara-Agent's, the project's agent, in [pull request 1312](https://github.com/Sara-Managed-Projects/space-radar/pull/1312); the quoted terms are in section 3n of [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
