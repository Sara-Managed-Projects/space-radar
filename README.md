<div align="center">

# Space Radar

**A living 3D map of everything in motion around Earth — at its real position, right now.**

Satellites, crewed stations, debris, rockets on their way up, probes on their way out,
telescopes at their stations, asteroids and comets on their orbits, and the pads, dishes and
observatories on the ground that talk to them.

[**Open it →**](https://d3hn5yuejgw4ux.cloudfront.net)  ·  soon at **spaceradar.ai**

</div>

![Space Radar](assets/readme/hero.png)

---

## The idea

Every satellite tracker that exists is built for someone who already knows what a TLE is. They are
correct and they are overwhelming. The beautiful ones, meanwhile, are closed and mostly static.

Space Radar is the thing in between: **real positions, computed properly, drawn so that a person
who just got curious understands what they are looking at.** The setting is photographed — real
Earth textures, a true day–night terminator, real star positions. The things that move are drawn,
because a photoreal satellite at that distance is a grey smudge that tells a beginner nothing,
while a friendly one at a *true* position invites the tap.

There are three things you can do, and the interface knows which one you are doing.

| | |
|---|---|
| 🌍 **Wonder** | Fly around and tap anything. What is that dot, and why does it matter? |
| 🔭 **Now** | What is above my head *this minute*, from where I am standing? |
| 🚀 **Next** | Tell me before the next launch, meteor peak or close approach. |

---

## What it looks like

<table>
<tr>
<td width="50%"><img src="assets/readme/card.png" alt="Tapping the space station opens a card in plain language"><br><b>Tap anything.</b> One plain sentence first, then the numbers you can actually feel — the size of a football field, four hours of driving straight up.</td>
<td width="50%"><img src="assets/readme/sky.png" alt="The sky as seen from a location on the ground"><br><b>Look up from where you are.</b> Real stars, real constellations, a horizon, and heights in fists rather than degrees.</td>
</tr>
<tr>
<td width="50%"><img src="assets/readme/catalogue.png" alt="The full catalogue of 16,000 tracked objects"><br><b>Switch on everything.</b> Around 16,500 tracked objects, each propagated individually in your browser.</td>
<td width="50%"><img src="assets/readme/sources.png" alt="The sources panel showing what loaded and what did not"><br><b>It tells you what it could not read.</b> Three states, not two — and “could not look” is one of them.</td>
</tr>
</table>

<div align="center">
<img src="assets/readme/mobile.png" alt="Space Radar on a phone" width="300"><br>
<sub><b>On a phone the sky is the product.</b> Two buttons; everything else is a drawer.</sub>
</div>

---

## Every position says where it came from

This is the rule the whole project is organised around. A friendly drawing of something that is
not really there is the exact failure a map like this must avoid, so nothing on screen is allowed
to be ambiguous about how it was obtained.

- **Measured** — a real position from a real fetch.
- **Propagated** — worked forward from real orbital elements, and the card says how old they are.
- **Illustrative** — a *drawing*. A rocket's ascent arc is always this: the real trajectory is not
  published by anyone, so the arc is shaped from the target orbit and labelled as a drawing.
- **Sample** — bundled demonstration data. Nothing was fetched. Drawn with a dashed halo.

Three object classes are sample data today: asteroids, deep-space probes, and reentries. Not
because it was easier — because NASA JPL's APIs send **no `Access-Control-Allow-Origin` header at
all**, so a browser genuinely cannot call them, and Space-Track needs a login. Fixing that means a
small scheduled job; until then the app says so on the object rather than pretending.

---

## Nine silhouettes, learned once

![The nine object classes and their colours](assets/readme/classes.svg)

Size on screen encodes *class*, never true size — at true scale every one of these is invisible.
The real size lives on the card as something you can picture instead.

---

## How it works

![Public APIs, a static host, and a browser that does the physics](assets/readme/architecture.svg)

There is **no server, no database and no build step.** The browser fetches a handful of public
APIs, caches them, and does the orbital mechanics itself:

- **SGP4** for every object in Earth orbit, the same model the catalogues are published for.
- **Kepler** propagation from published elements for asteroids and comets.
- **Sun, Moon, planets, eclipses and twilight** computed offline by an ephemeris library — no
  network call at all for the most-used part of the app.
- **Alt-azimuth** from your position for the sky view, including whether a satellite is sunlit
  while you are in darkness, which is what decides if you can actually see it.

Measured on the live site: **17 555 objects, 11 draw calls, WebGL2, device pixel ratio clamped to
2.** The whole scene is a handful of instanced meshes.

### Try it in thirty seconds

```bash
git clone https://github.com/Sara-Managed-Projects/space-radar.git
cd space-radar
python3 -m http.server 8177 --directory site
```

Then open <http://127.0.0.1:8177>. That is the entire toolchain. `site/` is what gets served, byte
for byte — there is nothing to compile.

### Put it on your own bucket

```bash
./scripts/provision.sh --bucket your-unique-bucket-name
./scripts/deploy.sh    --bucket your-unique-bucket-name --distribution E1ABCDEF23456
```

`provision.sh` makes a **private** S3 bucket, an origin access control, and a CloudFront
distribution whose ARN is the only thing the bucket policy admits. HTTPS matters here beyond good
manners: geolocation and device orientation only work in a secure context, so a plain HTTP bucket
cannot run the sky view. Both scripts take `--dry-run`.

### Your own domain

```bash
# 1. the certificate MUST be in us-east-1, whatever region the bucket is in
aws acm request-certificate --region us-east-1 \
  --domain-name example.com --subject-alternative-names www.example.com \
  --validation-method DNS

# 2. add the CNAME records it asks for at your DNS host, wait for ISSUED, then:
./scripts/attach-domain.sh --distribution E1ABCDEF23456 \
  --domain example.com --domain www.example.com
```

The script refuses to run against a certificate that is not yet issued, and against a name the
certificate does not cover — both of which otherwise fail deep inside CloudFront with an unhelpful
message.

**The apex catches everyone once.** A bare domain cannot be a CNAME, and CloudFront has no fixed
IP for an A record. Either use Route 53 (an ALIAS record at the apex), a DNS host that flattens
CNAMEs, or forward the apex to `www` and point `www` at the distribution. The script prints the
right instruction for whichever names you attached.

---

## What is in the repository

```
site/                 the entire app, served as-is
  index.html          the shell; reports a failed boot in words, never a black screen
  js/propagate/       frames and the six propagators, one signature between them
  js/data/            fetching, caching, parsing, and the bundled sample data
  js/scene/           renderer, stage, worlds, Earth shader, starfield, glyphs, models
  js/sky/             pass prediction and the ground-up view
  js/ui/              cards, controls, and the sources panel
  vendor/             three.js, satellite.js, astronomy-engine
  textures/ data/     planet textures and the star catalogue
registry/             seven YAML files. Adding a world, an object class, a data source or an
                      event type is a ROW here — not a code change. CI enforces it.
scripts/              provision, deploy, and the README screenshot script
tests/                registry validation, the module contract, and a growth test
```

**The registry is the architecture.** `tests/test_growth.py` adds Europa — a moon two levels down
the world tree, so its frame has to compose through Jupiter — and proves it is five registry rows
and nothing under `site/js/`. If that test ever fails, the architecture regressed, whatever the
feature that caused it.

---

## The stack

![three.js r185, satellite.js 7.1.0, astronomy-engine 2.1.19, plain ES modules](assets/readme/stack.svg)

| | |
|---|---|
| **Rendering** | [three.js](https://threejs.org) r185, WebGL2, logarithmic depth buffer, instanced glyphs |
| **Orbital mechanics** | [satellite.js](https://github.com/shashwatak/satellite-js) 7.1.0 — SGP4/SDP4 |
| **Astronomy** | [astronomy-engine](https://github.com/cosinekitty/astronomy) 2.1.19 — planets, eclipses, rise and set |
| **Language** | Plain ES modules. No bundler, no npm at runtime, no framework, no CDN. |
| **Hosting** | S3 behind CloudFront. Private bucket, origin access control, HTTPS. |
| **CI** | GitHub Actions — registry validation, the module contract, and screenshots of the real app |

Everything is vendored into `site/vendor/`. Nothing is fetched from a third-party CDN at runtime,
and the only outbound call the page makes to anyone but its own origin is an optional cloud-cover
forecast for the sky view.

---

## Where the data comes from

Everything here is public, free, and used within its stated terms. **[CREDITS.md](CREDITS.md)** has
the full list with licence texts and required attribution lines.

| Source | What it gives | Attribution |
|---|---|---|
| [CelesTrak](https://celestrak.org) | orbital elements for everything in Earth orbit | Orbital data: CelesTrak (T. S. Kelso) |
| [The Space Devs](https://thespacedevs.com) | launches, pads, agencies, missions | Launch data by The Space Devs |
| [NASA Deep Space Network](https://eyes.nasa.gov/dsn/) | which dish is talking to which spacecraft, live | NASA/JPL |
| [NOAA SWPC](https://services.swpc.noaa.gov) | geomagnetic activity and the aurora oval | NOAA Space Weather Prediction Center |
| [Minor Planet Center](https://minorplanetcenter.net) | comet orbital elements | IAU Minor Planet Center |
| [Solar System Scope](https://www.solarsystemscope.com/textures/) | planet and Milky Way textures | CC BY 4.0 |
| [d3-celestial](https://github.com/ofrohn/d3-celestial) | star catalogue and constellation lines | Olaf Frohn, BSD-3-Clause |

**If you fork this, read CelesTrak's usage policy.** It allows one download per file per two hours
and firewalls clients that retry a rejection. The app already honours it with a per-source cache;
please do not remove that.

---

## Contributing

Issues and pull requests are welcome. The things most worth doing, roughly in order:

1. **The scheduled harvester.** Move the API calls out of the browser into a small cron job that
   writes JSON snapshots. It is what turns the three `sample` classes into live ones, and it is the
   single biggest improvement available.
2. **Real 3D models.** Everything is procedural geometry today, so a satellite reads as its class
   rather than as that particular spacecraft. NASA publishes public-domain models.
3. **Frame rate on real phones.** The budgets in the code are targets, not measurements. Numbers
   from an actual mid-range Android would be genuinely useful.
4. **Copy.** Every card should be readable by a curious twelve-year-old. Some are not yet.

Before opening a PR, run what CI runs:

```bash
python3 scripts/check_registry.py   # the seven registries validate
python3 tests/test_growth.py        # adding a world is still just a registry row
python3 tests/test_refusals.py      # the validator still refuses what it claims to
node     tests/test_contract.mjs    # every cross-module import resolves
```

---

## Licence

The project's own code is [MIT](LICENSE). Vendored libraries, textures and catalogues keep their
own licences — all of them are listed in [CREDITS.md](CREDITS.md), and all of them permit this use.

<div align="center">
<sub>Built with real orbital mechanics and a lot of respect for the people who publish the data for free.</sub>
</div>
