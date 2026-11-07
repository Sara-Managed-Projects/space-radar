# Space Radar on a dome, in 360 and as a skybox

Space Radar can draw what its camera sees as a planetarium's **dome master** (a 180-degree fisheye), as an
**equirectangular 360-degree** frame (what YouTube 360 and every VR player read), and as a **skybox** (the six
faces of a cube). It is free, at any size your graphics card can draw, for anyone, with the credit below. It runs
in a browser: a laptop with a desktop graphics card and the dome's projector input is enough.

The code is `site/js/scene/projection.js` (the drawing) and `site/js/ui/projectpanel.js` (the panel); forge #157.

## The three pictures

| link | what it draws | shape |
|---|---|---|
| `#proj=dome` | 180-degree azimuthal-equidistant fisheye. The middle of the disc is straight ahead of the camera; the rim is 90 degrees from it; the angle from the middle grows evenly with the distance from it. | square; black outside the disc |
| `#proj=dome,30` | The same, tilted: the camera's view direction is drawn 30 degrees below the middle, toward the bottom of the frame, which is the front of a tilted dome. Any tilt from 0 to 90. | square |
| `#proj=360` | Equirectangular: longitude across (the camera's heading in the middle, its right to the right), latitude up, the horizon level with the camera's own up whatever its tilt. | 2:1 |
| (panel) Save a skybox | The six cube faces in the scene's own axes, +X, −X, +Y, −Y, +Z, −Z, side by side in one PNG, in the OpenGL cube-map convention (each face as `glTexImage2D` takes it). | 6:1 strip |

`#proj=` goes on any link of the map, beside everything else it says: `#at=saturn&proj=dome`,
`#trip=to-the-edge&proj=dome,30`, `#ambient=lobby&proj=dome`. Take it off (or choose Normal in the panel) and the
picture is the ordinary one again.

While a projection is on, the names over the scene, the reticle and the tag are hidden: they are laid out for the
ordinary camera and would point at the wrong places.

## Run a trip on a dome

1. Use a computer with a desktop graphics card. A projection draws the whole scene six times a frame; a desktop GPU
   runs it live at 1024 or 2048 pixels a cube face. A phone runs it at 512 pixels a face and says that it is a
   preview.
2. Plug the dome's projector in as a second screen, and open the trip's link with the dome tilt you need. For a
   dome tilted 30 degrees:

   ```
   https://www.spaceradar.ai/#trip=to-the-edge&proj=dome,30
   ```

   A dome master is square: make the browser window full screen on the projector (`F11`, or `Ctrl+Cmd+F` on a Mac),
   and the picture is the largest square that fits, in the middle.
3. Press **H** for the clear screen (the panels go; `H` or `Escape` brings them back), then **Start** on the
   trip's card. For a show that plays on its own, use a reel: `#ambient=lobby&proj=dome,30` plays its trips one
   after another and goes round again (docs/RUN_LOCALLY.md, "A school server, a USB stick, a kiosk", has the kiosk
   flags for a screen nobody touches).
4. Sound: the trip's voice and music come out of the computer, as they do on a screen.

To try the dome without one, open the same link on a laptop: the disc in the middle of the window is what the dome
would show, with the front of the dome at the bottom.

## Save a frame, a skybox, or a whole film

**One frame.** Share (or `P`) → **Dome and 360** → choose the picture → **Save this frame**: a PNG, 2048, 4096 or 8192
pixels across for a dome, 4096 × 2048 or 8192 × 4096 for 360, up to what the graphics card can draw at once (the
panel offers only the sizes it can). It is drawn once at that size, so a phone can save a sharp one too.

**A skybox.** The same panel → **Save a skybox**, 1024 or 2048 pixels a face.

**A film, frame by frame, at any resolution the card can draw.** `tools/render-trip.mjs` films a trip one frame at a
time on its own clock, so nothing stutters however slow the machine (spec 0070); `--proj` films it as a dome master
or a 360 frame:

```
node tools/render-trip.mjs to-the-edge --res=4096x4096 --proj=dome,30
node tools/render-trip.mjs to-the-edge --res=7680x3840 --proj=360
```

The film is written with its voice, music, captions and credits as for any trip (tools/README.md). A 360 film for
YouTube needs the spatial-media metadata YouTube asks for (Google's "Spatial Media Metadata Injector"), added
after; this repository does not add it.

## Credit and licence

Every picture is free to use, at any size, with this credit:

> Space Radar, spaceradar.ai. Maps and data: NASA, ESA, USGS, Solar System Scope, HYG and others.

The map's own code is MIT. Its maps and catalogues keep their own licences (CC BY 4.0, CC BY-SA 4.0 and others); the
app's Sources panel and `CREDITS.md` list each one. A show that uses the pictures credits them as above.

## Honest limits

- What is drawn is the map's drawing: the same positions, the same models and the same honesty labels as on the
  screen. A dome does not make anything more measured than it was.
- The live projection is drawn from one cube of 512 to 2048 pixels a face. A dome master saved at 4096 pixels is
  drawn from a 2048-pixel cube, which is sharp at the middle of the dome and, like every cube-based fisheye, a
  little softer where four faces meet.
- Only the map is projected. A Moment and an imagined world draw their own pictures and are not projected; the
  panel says so.
- The six-renders-a-frame cost was measured only in software rendering on a laptop, where it is slow; it has not
  been measured on a phone or on a planetarium's machine.

## Planetariums and clubs

If you run it on a dome, tell us what worked and what did not, through
https://github.com/Sara-Managed-Projects/space-radar/issues (the clubs and planetariums thread is #109).
