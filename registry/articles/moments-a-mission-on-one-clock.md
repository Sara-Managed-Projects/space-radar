![The Saturn V on the pad at ignition, steam and flame thrown sideways out of the trench under it.](ignition.webp "T−00:00:04: the five F-1 engines lighting, the steam out of the flame trench drawn both ways.")

Release 1.5.0 adds a new kind of tour to Space Radar, a Moment: a mission replayed in 3D on one clock, from the pad to orbit, with the camera, the stages and the flames all following the same mission time. One Moment ships with it, a 41-second demonstration of Apollo 11's Saturn V from ignition to the jettison of the escape tower.

## What a Moment is

A trip on the map moves you from place to place. A Moment holds you at one place in time and lets a mission happen around you. The link `#moment=demo-saturn&t=-9.5` opens the player paused nine and a half seconds before lift-off. Press play and the five F-1 engines light, centre first, then the outboard pairs; the hold-down arms keep the stack on the pad until all five are at full thrust; it clears the tower, rolls onto its flight azimuth, 72 degrees east of north, and climbs.

The clock is printed on screen the whole time, as a mission clock (`T−00:00:08`) and as a compression beside it. The first seconds play at `×1`, real time. The long climb through maximum dynamic pressure plays at `×27.5`, then the player slows to `×4` for the centre engine shutting down and to `×2` for staging, when the first stage drops away with its retro-rockets firing. Nothing is hidden about the pace: whatever is sped up says so.

![The Saturn V seen from the side 45 km up, a long white plume behind it over a blue Earth.](centre-engine-out.webp "T+00:02:17 at ×4: the centre engine is out and the plume widens in thin air, 45 km up.")

## Seven kinds of shot, and your own camera

The player directs itself with seven kinds of shot: the pad, a long-lens tracking camera 1.6 km away that narrows as the rocket climbs, a chase, an orbit round the stack, an onboard view, the globe and a wide view. The Earth below is the map's own, the Sun and the Moon are where they were at 13:32 UTC on 16 July 1969, and stars appear when the sky above the rocket is dark enough.

You can take the camera at any moment. Drag, scroll or pinch and the view is yours; let go and the director takes it back at the next shot. The chapters open in place above the strip, so you can jump to ignition, lift-off, maximum dynamic pressure or staging. The share button gives a link to the second you are looking at, and that link opens the player paused on the same second.

![The Moment player with its list of chapters open above the play strip.](chapters.webp "The chapters, opened in place above the strip. Each one is a second you can link to.")

## Why it was hard

A rocket launch changes scale fast: metres at the pad, a hundred kilometres up and nearly two hundred downrange by the time the tower goes. The player has to keep the pad's steam, a 110-metre stack and the curve of the Earth all drawn without the numbers breaking, so the scene moves its origin with the rocket. A visitor on a phone gets the same Moment at a lower tier, and anyone who has asked the system for reduced motion gets it opened paused, with cuts in place of camera moves.

None of it costs a visitor who never opens a Moment anything. The player and its files are fetched only when the link is opened; the map's first screen is unchanged.

## How to try it

Open [the Saturn V Moment](https://www.spaceradar.ai/#moment=demo-saturn&t=-9.5) and press play, or use the space bar. The arrow keys step through time, `[` and `]` move between chapters, and Escape closes the player and puts the map back where it was.

![The Saturn V's second stage burning over the Earth, its pale blue hydrogen flame below it.](second-stage.webp "T+00:02:54 at ×11: the five J-2 engines of the second stage; hydrogen burns pale and nearly clear.")

## Measured, reconstructed, illustrative

The demonstration is honest about what it knows, and the line under the player says the same.

- **Measured:** the event times come from the Apollo 11 Mission Report (NASA MSC-00171, 1969), Table 3-I: lift-off at 00:00:00.6, the outboard engines cut off at 00:02:41.7, the second stage lit at 00:02:43.0 and the tower jettisoned at 00:03:17.9. The places of the Sun and the Moon are computed for that day.
- **Reconstructed:** the path between those events. The heights and the distances downrange are approximate, which is why this Moment is called a demonstration.
- **Illustrative:** the flames, the steam and the ground within 25 km of the pad are drawn. In this release the stages are cut from one model of the whole rocket, and the stack stands on bare concrete because there is no model of the Mobile Launcher yet.

The same release adds the vehicles for the Moments to come: the Saturn V in eleven parts in flight order, the Lunar Module in two stages and the Command and Service Module from NASA's models, SLS and Orion in named parts, and the R-7 with the Vostok capsule, its ejection seat and parachutes, built from published dimensions. The Moments of Vostok 1, Apollo 11 and Artemis II themselves are not written yet.

## Pictures and sources

Screenshots of Space Radar 1.5.1 (MIT licence) from the project's `look` workflow, probe `moments`. The Saturn V is NASA's model from NASA 3D Resources (public domain), and the Earth's map is Solar System Scope's (CC BY 4.0). The player and the demonstration were built by Sara-Agent, the project's agent, in [pull request 1305](https://github.com/Sara-Managed-Projects/space-radar/pull/1305); the full rows are in [CREDITS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md).
