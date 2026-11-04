# Questions people ask

Short answers, each one checked against what the app does. For how close the positions are, and
what "measured", "modelled" and "illustrative" mean, read the
[accuracy page](https://www.spaceradar.ai/accuracy/); for where every number comes from, the
[sources page](https://www.spaceradar.ai/sources/).

## Is the map live, or is it a snapshot?

Both, and they are two different times.

- **The input time** is when the publisher worked out the satellite's orbit. Every set of orbital
  elements carries one, called its epoch. It does not move until the publisher issues a new set.
- **The computed time** is the moment on the map's clock for which Space Radar works out where the
  satellite is. The calculation (SGP4) runs in your browser, so the computed time follows the clock:
  it is now, unless you scrub the time.

The position is live in the sense that it is recalculated for the computed time. It is only as
good as the input time is recent, which is why a card says how old the elements are ("Position
propagated from elements 6 days old"). Our hourly saved copy of a publisher's file is a third
time, the day it was last read, and the sources page shows it.

A worked case, the International Space Station. On 4 November 2026 at about 05:49 UTC, CelesTrak's
[element set for the station](https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json)
(NORAD 25544) had the epoch 3 November 2026, 22:01:52 UTC, and a mean motion of 15.49
revolutions a day, which is 93 minutes a lap. Asked for 05:49 UTC, the calculation used elements
7 hours 48 minutes old: input time 22:01, computed time 05:49, five laps between them. The
position is worked out forward from that starting point, and a small error in the orbit grows
with the time since. That growth is why the age is shown, and why a week-old set can leave a low
satellite minutes of travel from where the map draws it.

## I am in a trip and cannot find the way out

Press **Escape**, or press the **Leave** button in the trip's controls. Either one ends the trip
at once; for a trip that stayed on this world's map the camera stays exactly where it is.
(A trip that moved the map's centre to another world puts it back where it was, which moves the
camera; the button's tooltip says which.) Dragging the camera yourself only pauses the trip, it
never ends it: **Space** or the play button flies back to the stop and carries on, and the left
and right arrow keys step between stops.

## Why are distances and sizes not true to scale?

On a screen, a map of the Solar System has to give up either true sizes or true distances, and
usually both. The space between worlds is so much larger than the worlds. If the Earth were a 1 cm
marble, the Moon (384 400 km away, about 30 Earth widths) would be a small ball about 30 cm
away, and the Sun (150 million km, nearly 12 000 Earth widths) would be about 120 m away and just
over a metre across. Neptune (4.5 billion km) would be about 3.5 km away. No screen holds that, so
a picture that shows several worlds at once makes them larger than life, or places them closer
than they are, or both.

Space Radar's rule is to say so: where something is drawn larger than life, the app says it, and
the scale rail at the top left of the map says where you are on the ladder from the Earth to the
Local Group and, the first time you cross to a further place, how far away it really is. For which numbers are measured and which are drawn to explain, see
the [accuracy page](https://www.spaceradar.ai/accuracy/).
