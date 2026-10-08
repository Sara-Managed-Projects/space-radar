# Run Space Radar on your own computer

This page is for teachers, librarians, club leaders and anyone who is not a programmer. You do not
need an account, a licence key or a build tool. Space Radar is a folder of files; any program that
can serve a folder to a web browser can run it. It also runs **with no internet at all**, with the
limits listed honestly [below](#3-run-it-with-no-internet).

> **Classroom quick start**
>
> 1. **Download** `space-radar-<version>.zip` from the [Releases page](https://github.com/Sara-Managed-Projects/space-radar/releases/latest) and unzip it.
> 2. **Serve** it: open a terminal in that folder and run `python3 -m http.server 8177 --directory site` (Windows: `py` instead of `python3`).
> 3. **Open** <http://localhost:8177> in the browser.
> 4. Pick a trip and press **Present**: large words, no panels, your clicker moves it on.
> 5. After that first visit it **works offline** on that computer, even with the server stopped.

**What you need**

- A computer from the last eight years or so, with Chrome, Edge, Firefox or Safari.
- [Python 3](https://www.python.org/downloads/) (3.8 or newer). macOS and most Linux systems already
  have it. On Windows, install it from python.org and tick "Add python.exe to PATH".
- About 110 MB of disk space (the app is 83 MB, 40 MB of it the trips' narration and music; the
  saved data copy is about 24 MB).

---

## 1. Get the files

**The easy way: a release zip.** Open the
[Releases page](https://github.com/Sara-Managed-Projects/space-radar/releases/latest), download
`space-radar-<version>.zip` and unzip it. The zip already contains a saved copy of the data, so it
works offline as it is.

**Or the newest code**, if you have git:

```bash
git clone https://github.com/Sara-Managed-Projects/space-radar.git
cd space-radar
```

A clone has no saved data copy. That is fine while you are online; for offline use, do
[step 3](#3-run-it-with-no-internet) once.

## 2. Start it

Open a terminal **in the folder you unzipped or cloned** (the one that contains `site`).

| System | Command |
|---|---|
| Windows (PowerShell or Command Prompt) | `py -m http.server 8177 --directory site` |
| macOS | `python3 -m http.server 8177 --directory site` |
| Linux, ChromeOS (Linux enabled) | `python3 -m http.server 8177 --directory site` |

Then open **<http://localhost:8177>** in the browser. Leave the terminal window open while you use
it; press `Ctrl` + `C` in that window to stop.

Any other static file server works just as well (`npx serve site`, nginx, Apache, Caddy, IIS), and
the folder does not have to be the root of the address: `http://server/space-radar/` works exactly
like `http://localhost:8177/`. Every path the app asks for is beside the page.

Double-clicking `index.html` does **not** work: browsers refuse to load a modern page's scripts
from `file://`. It has to come through a server, even a local one.

## 3. Run it with no internet

Space Radar keeps two kinds of things:

- **What ships in the folder**: the planets, moons and their maps, 109 389 stars, the constellations,
  nebula photographs, the sky in infrared, microwaves and gamma rays, every 3D model, all 25
  guided trips with their narration and music, landing sites, and the mathematics that moves it all. This needs no network, ever.
- **What changes daily**: the list of satellites and their orbits, upcoming launches, asteroids
  passing by, space weather. The app reads a **saved copy** of these from `site/data/v1/` first,
  and only then asks the publishers for anything newer.

A release zip includes that saved copy. For a clone, or to refresh an old copy, run this once
**while online**:

```bash
python3 scripts/save_offline_data.py        # Windows: py scripts\save_offline_data.py
```

It downloads about 24 MB from spaceradar.ai into `site/data/v1/` and contacts nobody else. Then
disconnect, start the server as in step 2, and it works. The script is in the release zip too, so a
copy that has grown old can be refreshed the same way.

### After one visit, it starts without the server too

A release zip (and spaceradar.ai itself) carries a **service worker**: a small program the browser
keeps, which holds on to the page, its code, and the maps, models and sounds you have used. Open
the app once and it will start again later with the server switched off, the cable out, or on a
hill with no signal, and its status line will say `Offline: showing saved copies from 13 days ago`
with the age of the oldest copy on screen.

- It keeps **what that browser has used**. The whole app is kept at once (about 5.3 MB, 205 files); a trip's
  pictures, a planet's map and a trip's narration are kept the first time they are shown or
  played. To have a trip ready for a room with no network, play it through once on that computer.
- Browsers only allow this on `https://` addresses and on `localhost`. On pupils' machines that
  open `http://<teacher's computer>:8177` there is no service worker, and they need the teacher's
  server running. That is the browser's rule, not ours.
- A clone from git is not stamped with a build, so its worker keeps only what was loaded and always
  asks the server first. Run `python3 scripts/stamp_sw.py` once to make a clone behave like a
  release (it rewrites `site/sw.js`; `git checkout site/sw.js` undoes it).
- **To switch it off**, open the app once with `?sw=0` at the end of the address
  (`http://localhost:8177/?sw=0`): the worker is removed and everything it kept is deleted.
- After you replace the folder with a newer release, the app says "A newer version is ready" with
  a Reload link; it also updates by itself the next time every tab of it has been closed.

Proved on 2026-10-06 in headless Chrome with every outside host unresolvable: a stamped copy with
a saved data copy was served at `http://localhost:8391/classroom/space-radar/` (a subfolder),
opened once, and the server was then stopped. On the second visit the app started from the worker
(184 app files, 22 maps and bundled data files, and 13 saved data copies kept), the *Moon landings*
trip flew its first three stops, the Tonight tab showed the next visible pass, and the status line
read "Offline: showing saved copies from 14 days ago" (the copy used for the test was that old). Not kept by that first visit: narration and music nobody had played, and
maps of worlds nobody had visited. `tests/probes/offline-probe.js` is the probe, and its header
says how to run it again.

### What works offline, and what does not

Measured on 2026-10-05 by serving `site/` locally in headless Chrome with **every** outside host
blocked: the page was usable in 13 seconds and all layers were in after 29; 166 requests were
answered from the folder, the Sources line read "12 sources read · 3 could not be read", about
11 000 objects were drawn, and a trip started with its narration and music files loading from disk.

| Works with no internet | Needs the internet |
|---|---|
| The Earth, the Moon, every planet and moon, with their maps and air | **Today's clouds**, storms and lightning on the Earth (you get a fixed cloud map instead) |
| The stars, constellations, the Milky Way, nebula photographs, exoplanets | **Close-up map tiles** of the Earth, the Moon and Mars (the built-in maps stay; they are just less sharp up close) |
| All 25 guided trips, with narration, captions and music | **Fresh** launches, satellites, asteroid passes and space weather (see below) |
| Satellites, the ISS and Tiangong, from the saved copy | The aurora forecast and the "who is in space right now" crew list, once the copy is old |
| Search, the object cards, the time scrubber, mission timelines, Tonight's passes | **Earth data maps** (sea temperature, rain and the rest), today's sunspot groups, and the sharper zoomed-in tiles of the infrared sky |
| The sky from the ground, present mode, photo mode | Links out to Wikipedia and the publishers; sharing to social networks |
| The sky from a city you pick by hand | Your exact location, on some setups (see Troubleshooting) |

**Be honest with your class about age.** A satellite's position is worked out from orbital
elements measured on a certain day. The saved copy is as old as the day it was made, and the app
says so at the foot of every card ("Position propagated from elements 13 days old"). After a week or
two, a low satellite such as the ISS can be minutes away from where the app draws it; after a
launch date has passed, the launch stays in the list until the copy is refreshed. Planets, moons,
stars and eclipses are computed, not downloaded, and are right for any date. Refresh the copy
every week or two if you can.

## 4. A school server, a USB stick, a kiosk

**One computer serving a whole room.** Start it so other machines can reach it:

```bash
python3 -m http.server 8177 --directory site --bind 0.0.0.0
```

Pupils open `http://<that computer's address>:8177`. This works without internet as long as the
room's own network is up. For a permanent install, point nginx, Apache or Caddy at the `site`
folder as the root of a host name or port. No database, no server-side code, nothing to update but
the folder.

**A USB stick.** Copy the whole unzipped folder to the stick. On the other computer, open a
terminal in that folder on the stick and run the command from step 2. The computer still needs
Python; the portable ("embeddable") Python for Windows also works from a stick.

**A projector, a classroom, a planetarium: present mode.** One trip for a room: the panels go,
the words of each stop are set large enough to read from the back, and whoever holds the clicker
decides when to go on. Add `&present=1` to a trip's link, or press **Present** on the trip's first
card:

```
http://localhost:8177/#trip=moon-phases&present=1
http://localhost:8177/#trip=mars-where-we-have-driven&present=auto
```

| Key | What it does |
|---|---|
| `→`, `Page Down`, `Space` | Next stop (and, on the first card, start). A presenter's clicker sends these. |
| `←`, `Page Up` | Previous stop |
| `F` | Full screen, and out of it |
| `A` | Let the trip move on by itself, or wait for you again (`present=auto` starts that way) |
| `P` | Pause and resume |
| `M`, `V` | Sound on and off; the voice on and off |
| `Esc` | Leave the trip |

The words on screen are the captions, so the room does not need sound. For sound, press the
speaker and the voice button on the first card: a synthetic voice reads each stop, and each stop
then waits for it to finish. Trips good for a first lesson: `moon-phases` (why the Moon changes
shape), `planets-tonight`, `tonight-from-your-street`, `the-sun-today`,
`mars-where-we-have-driven`, `the-constellations`, `life-of-a-star`. Six trips start from your own
place (`tonight-from-your-street`, `planets-tonight`, `moon-phases`, `a-dark-sky`,
`comets-and-meteors`, `journey-to-the-station`): they use the place set under **Where you are** (or
a guess from the computer's time zone, and they say so), so set the school's town first. The
living Earth's data maps need the internet.

### A screen in a corridor

A screen nobody is standing at: a corridor, a lobby, a museum wall, an observatory's waiting room.
Add `#ambient=1` to the address and Space Radar plays its trips one after another, with the words
of each stop as captions, until somebody takes the controls. The **Play on its own** row under the
trips does the same on your own computer.

```
http://localhost:8177/#ambient=lobby
http://localhost:8177/#ambient=classroom-45&sound=1
http://localhost:8177/#ambient=tonight
http://localhost:8177/#ambient=moon-landings,the-sun-today,black-holes
```

| Reel | What plays | One lap |
|---|---|---|
| `lobby` (what `#ambient=1` plays) | Fourteen of the most visual trips, good with no sound. It starts silent. | about 50 min |
| `classroom-45` | Twelve school favourites, from the living Earth to the edge of what we can see. It asks for sound. | about 45 min |
| `tonight` | The seven trips that start from your own ground: tonight's sky, the planets, the Moon. Set the place under **Where you are** first; with no place it plays `lobby` instead. | about 20 min |
| trip names with commas | Your own list, in your order. | |

Every reel goes round again when it ends. `#autopilot=` is the same key under another name.

| Add to the address | What it does |
|---|---|
| `&shuffle=1` | A new order every lap |
| `&sound=1` | Ask for sound (see below); `&sound=0` keeps it silent whatever the browser remembered |
| `&voice=0` | Music only: no narrator, and each stop stays up for as long as its words take to read |
| `&captions=0` | No words on screen (only sensible with the voice on) |

**Sound needs one key press.** A browser plays nothing until somebody has touched the page. So a
reel that wants sound shows one card, "Press any key to start with sound", for ten seconds, and
then starts silent with captions. Start Chrome with the autoplay flag below and the card never
shows: the sound starts by itself.

**Somebody walks up.** Any key or touch shows **Take the controls** for ten seconds; `Esc` takes
them at once. The trip stops where it is and the whole app is theirs. Two minutes after the last
touch the screen goes back to its reel, at the next trip. (Started from the **Play on its own**
row instead of the address, taking the controls simply ends it.)

**Start the browser as a kiosk.** Quit Chrome completely first, or the flags are ignored.

```bash
# Windows (one line, in a shortcut's Target or a .bat file in the Startup folder)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --no-first-run --autoplay-policy=no-user-gesture-required "http://localhost:8177/#ambient=lobby"

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --kiosk --no-first-run --autoplay-policy=no-user-gesture-required "http://localhost:8177/#ambient=lobby"

# Linux (the binary is google-chrome, chromium or chromium-browser, depending on the system)
chromium --kiosk --no-first-run --autoplay-policy=no-user-gesture-required "http://localhost:8177/#ambient=lobby"
```

`--kiosk` is full screen with no address bar (`Alt+F4`, or `Cmd+Q` on a Mac, leaves it).
`--autoplay-policy=no-user-gesture-required` lets the sound start with nobody there; leave it out
for a silent screen. Start the server from step 2 first, at login, the same way. Switch the
computer's own screen saver and sleep off: the page asks the browser to keep the screen awake, and
a browser may refuse.

**What it does when things go wrong**, with nobody there to press a button:

- A stop that has not arrived, or has not moved on, inside its time is skipped. A trip that fails
  twice is left for the next one.
- A trip whose data is not there (no network and no saved copy, or no place set for a trip that
  starts from your ground) is left out of the lap. Nothing is said on screen.
- If the graphics card drops the page's picture and does not give it back within five seconds,
  the page reloads and goes on from the stop the trip had reached.
- A newer version of the app never interrupts a trip and never asks: it takes over between two.
- After twelve hours the page reloads itself between two trips, to start clean. On a screen whose
  sound was started by a key press, that reload waits for 02:00 to 05:00, because after it the
  screen is silent until somebody presses a key again (the autoplay flag avoids that).
- What happened is kept as a short log in the browser's console (`F12`), never on the screen.

**With no internet.** Follow step 3 (a release zip already has the saved data copy). Then, with
the network still on, let the reel play one whole lap on that computer in that browser: the
service worker keeps each map, model and narration clip the first time it is used, so after one
lap everything the reel shows is on the disk. After that the cable can come out. *The living
Earth* shows its fixed cloud map instead of today's; its four data-map stops stay in, show the
plain globe, and say in one small line that the picture did not arrive.

Seen on 2026-10-08 in headless Chrome on a laptop's own graphics card, at eight times the speed:
three trips and 21 stops of `lobby` back to back with nothing skipped; `classroom-45` with every
outside host unreachable (one trip that needs the live satellite list was left out without a word,
another played four of its eight stops); and a lost picture, once given back after two seconds
(nothing reloaded) and once kept (the page reloaded after five and went on). Not yet run: a whole
lap at real speed, an hour, sound, or a lap with the server switched off.

**A Raspberry Pi.** Not measured: nobody has run Space Radar on one yet, so we cannot tell you a
frame rate. It needs WebGL 2 in the browser, and the app lowers its own detail on a slow graphics
chip, but a trip to the Milky Way draws 109 389 stars. Try `#ambient=lobby` for ten minutes before
you mount anything on a wall; a second-hand small PC is the safer choice until somebody measures it.

**One trip, by itself, once.** `present=auto` with the voice on still flies and reads a single
trip and stops on its last card; press **H** (or the eye button) to hide every panel and leave
only the scene.

## 5. Troubleshooting

| What you see | What to do |
|---|---|
| A blank page, or a list of files | The server was started in the wrong folder. Start it from the folder that *contains* `site`, with `--directory site`. |
| "python is not recognized" (Windows) | Use `py` instead of `python3`, or reinstall Python with "Add python.exe to PATH" ticked. |
| "Address already in use" | Something else has port 8177. Use another number in the command and the address, e.g. `8200`. |
| The Earth is there, but no satellites | There is no saved copy and no internet. Do step 3 once while online. |
| Satellites appear slowly, or the first minute is empty | The network is connected but blocks the publishers (common behind school filters). The app waits for each to answer. Run fully offline with a saved copy instead, or ask for `celestrak.org`, `ll.thespacedevs.com` and `*.nasa.gov` to be allowed. |
| It is slow or jerky | Close other tabs; make the window smaller; use Chrome or Edge with hardware acceleration switched on. The app lowers its own detail when frames are slow. |
| "Use my location" does nothing on pupils' machines | Browsers share a location only over `https` or on `localhost`. Pick the city by hand in **Tonight**; the app otherwise guesses from the time zone and says it is a guess. |
| No sound | Sound is off until you turn it on, in a trip's toolbar. The first click on the page is needed by the browser before any audio plays. |
| After updating the folder, the old version still shows | Press Reload on the "A newer version is ready" line, or close every tab of the app and open it again. If it still shows the old one, open it once with `?sw=0` at the end of the address. |
| The status line says "Offline" although the network is fine | The app could not reach its own server (the one started in step 2). Start it again; the line clears on the next read. |

Something else? [Open an issue](https://github.com/Sara-Managed-Projects/space-radar/issues/new/choose)
and say what computer and browser you have. Reports from real classrooms are the most useful ones
we get.

## Updating

Download the newest zip and replace the folder, or `git pull` and run the save script again.
Releases are listed, with what changed, in [CHANGELOG.md](../CHANGELOG.md).
