# Space Radar — the plan

## The thesis

The satellite trackers that already exist are for people who already know what a TLE is.
KeepTrack (open source, `thkruz/keeptrack.space`) tracks 37,000+ objects with real SGP4 orbital
math and is genuinely excellent — and it looks like mission control software, because that is
who it is for. NASA's own *Eyes on the Solar System* is the visual bar (real spacecraft, comets
and 150+ missions, beautifully rendered, scrubbable through time) but it is NASA's closed
application, not something anyone can fork.

Nobody has shipped the thing in between: real, live, correctly-computed positions, rendered as
something a person who just got curious about space would want to open and touch. That is the
gap. Space Radar is a 3D, WebGL, open-eventually globe — Earth first, the rest of the solar
system around it — showing satellites, debris, crewed stations, active spacecraft, comets and
tracked asteroids with their real positions, where clicking any object tells you what it is in
plain language. The audience is a beginner, not an operator: fewer numbers on screen, more
"what am I looking at," a beautiful default view rather than a dense one.

## What stage 1 is, on purpose

Cheap and mostly-API, per the brief: no backend to run or pay for, no server-side job that computes
orbits, nothing beyond static hosting. Everything that changes over time is fetched live, in the
browser, from public sources that already do the hard part:

- **Satellites, stations and debris** — Celestrak's TLE feeds (free, no key, updated daily), turned
  into live positions in the browser with `satellite.js` (a maintained, widely-used SGP4/SDP4
  implementation in JavaScript — the same math KeepTrack runs, just run client-side per object
  instead of for a whole catalogue).
- **Comets and asteroids** — NASA JPL's Small-Body Database API (free, no key) for orbital elements,
  propagated the same way.
- **Launches and upcoming missions** — The Launch Library 2 API from The Space Devs (free tier, no
  key for reasonable use), which already carries agency, rocket and pad data in a form built for
  exactly this kind of app.
- **"Where is the ISS / who is up there right now"** — Open Notify's API, a small free existing
  service that answers precisely that, worth including for the "wow" factor at near-zero cost.

None of these need a paid key or a subscription tier to start. The one thing worth budgeting for
later is a Space-Track.org account (also free, but registration-gated and rate-limited) if
Celestrak's public mirror ever proves insufficient — not needed for stage 1.

## Where the money and attention actually go

Per the brief: design and UI, not infrastructure. The budget for stage 1 is almost entirely
visual and interaction work, not data plumbing:

- **Rendering** — Three.js, the library every serious project in this space already uses
  (KeepTrack, several of the open solar-system viewers). Realistic Earth references worth building
  from: `earth-wallpaper` (procedural clouds, atmosphere glow, real starfield, pure Three.js/GLSL)
  and the simpler `earth-webgl` project as a lighter-weight fallback pattern.
- **Textures** — Solar System Scope's free texture pack (CC BY 4.0, built from real NASA/Viking/
  Cassini/Hubble imagery) for every planet, so nothing is drawn from guesswork.
- **3D models for the non-planet objects** — NASA's own 3D Resources portal (also mirrored on
  GitHub as `nasa/NASA-3D-Resources`), which already has a ready ISS model and other spacecraft,
  free to use.
- **The interaction layer is the actual product**: click any object for a plain-language card
  (what it is, who operates it, when it launched — not raw orbital elements), smooth camera
  movement rather than a snap-to-object cut, a day/night terminator on Earth, and category
  toggles (stations, debris, comets, asteroids, upcoming launches) so a first-time visitor is not
  handed 30,000 dots at once. That last point is the main lesson from what already exists: KeepTrack
  is correct and overwhelming; the solar-system viewers are calm and pretty but mostly static.
  Stage 1's job is to be both.

## Two audiences, two doors into the same product

Space Radar should not assume that liking space means owning a telescope or regularly looking at
the sky. It has two adjacent audiences:

- **Space dreamers** come for awe, escape, beautiful imagery, astronaut and mission stories, and
  the feeling of travelling beyond Earth from a phone. Their first action is **Explore from your
  screen**: a cinematic guided view, a daily object or story, mission moments, and an Earth-from-
  orbit perspective. They can save favourite worlds and objects without creating an account in
  stage 1.
- **Sky-watchers** come with a practical question: **What can I see tonight?** Their first view is
  local and time-sensitive: visible objects, direction, timing, weather context, event reminders,
  and a simple observation log.

These are two entry routes, not separate products. Every dreamer story can end with one optional,
specific bridge into the real sky — for example, *Jupiter is visible from your location tonight* —
while every practical object card can open into the larger story of the object or mission. No
telescope should be required for onboarding, progress or belonging.

The dreamer route has evidence behind it. [NASA reports](https://www.nasa.gov/specials/nasa-social-media/)
that the first James Webb Space Telescope images produced record engagement on its social channels,
and that striking mission imagery drove positive reactions during
[Artemis II](https://www.nasa.gov/general/nasas-artemis-ii-breaks-agency-streaming-record/).
[Research into simulated views of Earth from space](https://www.sciencedirect.com/science/article/pii/S0272494424002019)
also finds that they can elicit awe without physical spaceflight. This supports an image-first,
emotional route into the product; it does not yet measure demand for Space Radar itself.

## Audience and growth plan

- Lead the homepage with wonder and offer two clear actions: **Explore space** and **See tonight's
  sky**. Do not make geolocation, equipment or astronomy knowledge the price of entry.
- Acquire dreamers through short, vertical visual stories on Instagram, TikTok and YouTube:
  Earth-from-orbit views, scale comparisons, unusual objects, mission milestones and “travel to”
  sequences. Each ends on a matching interactive scene, not a generic homepage.
- Acquire sky-watchers through searchable, location-aware pages and timely clips: “what is above
  me tonight,” meteor peaks, ISS passes, fresh satellite trains and rare alignments.
- Build sharing into both routes. A visitor can export a clean image or short clip with the object,
  place and time; dreamers share a journey, while observers share a sighting.
- Retain dreamers with a weekly cosmic journey, saved favourites, event countdowns and exploration
  streaks. Retain observers with relevant alerts and an observation history. Routine notifications
  remain opt-in so the product does not train people to ignore it.
- Measure the routes separately: landing-to-first-interaction, return within seven days, share
  rate, reminder signup, and how often a dreamer accepts the bridge into “visible tonight.” Those
  behaviours should decide which audience is larger; the current belief that dreamers are the
  broader top-of-funnel is an inference, not a measured fact.

Stage 1 should build the shared core and the lightest version of each route: one cinematic guided
journey for dreamers, one local “visible tonight” view for sky-watchers, story/object cards that
link the two, and a shareable still. VR, social groups, accounts, paid personalisation, soundscapes
and collectible systems remain later experiments until real usage shows which kind of return
behaviour exists.

## Content and feature priorities from the audience research

The research suggests a practical editorial rule: surface events that are unusual, visual and easy
to explain before routine catalogue activity. This is an inference from engagement around striking
mission imagery and rare moments, not a measurement of Space Radar visitors. It produces five
concrete priorities:

1. **Rare alignments as named events.** Surface satellite or spacecraft transits across the Sun or
   Moon, close-looking passes near bright planets, eclipses and notable conjunctions. When the
   geometry can be calculated safely for a visitor's location, make these subscribable rather than
   burying them in a general object list.
2. **Fresh satellite trains as their own category.** A recently launched train is visually
   recognisable and time-sensitive. Present it in plain language with when and where to look,
   rather than expecting a beginner to find it among individual catalogue entries.
3. **Near-Earth objects with proportionate context.** Asteroid tracking is a direct public-interest
   use case, but cards must distinguish a close astronomical pass from a danger. Show distance in
   familiar comparisons, name the source and observation time, and never manufacture alarm.
4. **A shareable capture.** Export a clean still in stage 1: the current view, object, place and
   time, with a short caption. A later experiment can add a short video. The export must work for a
   dreamer's guided journey as well as a sky-watcher's sighting.
5. **A quiet notification default.** Offer rare alignments, meteor peaks, close approaches,
   launches and fresh trains first. Routine passes are opt-in. Relevance and trust matter more than
   notification volume.

Object copy should make the tangible fact the first sentence — what it is, what it does and why it
is visible or interesting now — then offer the emotional or historical story. The cinematic layer
can be romantic; factual cards should stay calm, sourced and specific.

## Inspiration translated into product decisions

- **KeepTrack** proves that browser-based, real orbital tracking is credible; Space Radar borrows
  the truthfulness, not the operator-density of its interface.
- **NASA Eyes** sets the standard for cinematic movement, time controls and guided exploration;
  Space Radar's opportunity is to combine that feeling with an open, live, beginner-first globe.
- **James Webb and mission imagery** show the acquisition power of a single astonishing image;
  the product should open directly into a scene a visitor can move through, rather than publishing
  a gallery with an interactive tool hidden behind it.
- **The overview effect** inspires the Earth-from-orbit journey for dreamers. Start with an
  ordinary 2D screen; VR is a later experiment, because requiring hardware would shrink the very
  audience this route is meant to welcome.
- **[NASA and Zooniverse citizen science](https://science.nasa.gov/citizen-science/)** show that
  beginners can make meaningful contributions without professional equipment. Stage 1 can link to
  suitable real projects from relevant object cards; native classification or research workflows
  wait until Space Radar has an audience and a scientific partner.
- **Consumer sky guides** prove the value of a local, time-specific answer. Space Radar should make
  that answer visual and understandable without copying their dense charts or putting the useful
  sky view behind a paid tier.

## Visual style: cartoon objects, realistic setting

Ivan's direction after seeing the reference list: the *moving* objects — satellites, debris,
stations, spacecraft, comets, asteroids — should read as stylised, friendly cartoon models, not
photoreal CAD. Earth, the other planets, the starfield and the lighting stay as realistic as stage
1 can afford (real textures, a real day/night terminator, real relative scale for the planets).
The split matters for a beginner audience: the *setting* being real is what makes the app feel
truthful ("this is actually where things are"), while the *objects* being a little cartoonish is
what makes clicking on a bristling debris fragment or a rocket upper stage inviting instead of
clinical. NASA's 3D Resources models (named above) are the realistic fallback for anything not
worth a custom stylised model in stage 1; a stylised pass on the highest-traffic objects (ISS,
notable stations, a generic "satellite," a generic "rocket") is a design task, not a data task,
and fits the brief's steer that most of the effort goes into design rather than infrastructure.

## Stage 1 addition: an email-only events subscription

A visitor can leave an email address to hear about specific upcoming events — a launch, a notable
meteor shower, a close asteroid pass. Deliberately the smallest possible version of "personal
data": one email address, no account, no name, no location stored against it, matching Ivan's
brief directly. Sending itself is a stage-1-appropriate cheap add-on (a transactional email
provider's free tier, keyed to the same free event sources already in this plan — Launch Library 2
for launches, JPL's small-body database for close approaches, a small hand-maintained list for
named meteor showers since their peak dates are calendar facts, not something to fetch live).

This is validated by more than the brief. Looking at what people already use and complain about in
existing launch- and meteor-shower-alert apps (App Store listings and comparison write-ups, not a
proper user survey — an inferred signal, not a measured one): the single most-repeated request is
*flexible advance timing* ("a day before," "a week before," reminder gaps that force people to set
their own calendar entries by hand), alongside filtering by region or agency so notifications stay
relevant. Stage 1 should let a subscriber pick a lead time (same day / 1 day / 1 week before) per
event type rather than shipping one fixed reminder window — it is one extra field, and it is the
thing existing apps are most often criticised for lacking.

## Stage 1 addition: "what's above me right now"

With permission, take the visitor's location (browser geolocation, never stored beyond the
session) and re-orient the view to a ground-up sky view from that point: what is currently
overhead, in the direction they'd actually look. This is the single feature every reference project
above treats as advanced/pro-tier rather than a free default (comparable existing apps gate a
similar AR sky-overlay behind their more advanced tiers), so doing it well and for free in stage 1
is a real differentiator, not a me-too feature. Implementation is arithmetic on data already in the
plan: the visitor's lat/long plus each object's real-time position gives azimuth and elevation, so
"is it above my head" is a computation, not a new data source.

## Hosting

The same shape as Sara's own site: a static build, S3 bucket, CloudFront in front of it. No server
to run, no per-request cost beyond the free tier, and Sara already operates this exact pattern.

## What stage 1 deliberately is not

- Not the full 30,000+ object catalogue — a curated, categorised set (stations, notable debris,
  active comets/asteroids, upcoming launches) that stays fast and legible on a phone.
- Not a backend, a database, or a scheduled job. If a future stage needs caching (to stay under a
  public API's rate limit as traffic grows) that is the first paid infrastructure decision, made
  when it is actually needed rather than guessed now.
- Not public yet. The repository is private at Ivan's request; nothing about the architecture
  above depends on staying private, so opening it up later is a permissions change, not a rewrite.

## What the research could and could not confirm

Asked to check what enthusiasts want, specifically including Reddit: a direct search for Reddit
threads on satellite/launch-tracker feature requests did not surface actual thread content — only
App Store listings for competing apps. What is above is grounded in App Store descriptions,
review call-outs and 2026 comparison write-ups for existing launch- and meteor-alert apps instead,
which is a real signal but a narrower one than a genuine Reddit read. Worth a second pass with
Reddit's own search or a specific subreddit crawl before stage 1 locks its feature list, rather
than treating the two additions above as fully validated.

## Open questions for the next pass

- Exact selection rule for "notable debris" (Celestrak alone lists thousands) — likely a small
  hand-picked or agency-sourced list for stage 1 rather than an algorithm.
- Whether Space-Track.org registration is worth doing early anyway, since it is free and removes a
  dependency on Celestrak's mirror staying up.
- Attribution/licensing footer requirements for NASA and Solar System Scope assets — both permit
  free use, but the exact credit line should be written once and reused everywhere it is needed.
- Which objects get a custom cartoon model in stage 1 versus the NASA realistic fallback, and who
  draws them.
- Which transactional email provider fits the free/near-free bar the rest of stage 1 holds to.
