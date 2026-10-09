# Roadmap

Where Space Radar is going, in plain words. It is a direction, not a promise: dates move, and
anything marked "help wanted" moves faster with you. Every line links a public issue; a line with
no open issue is not on this page. Updated 2026-10-09.

How to read it: **Now** is this month, **Next** is this quarter, **Later** is when something else
has landed or someone takes it. The things we will not do are at the end, because they matter as
much as the plan.

## Now (October 2026)

- **The live site follows `main`.** Today it can be days behind, and the saved data goes stale
  between hand refreshes. [Continuous deploy and fresh snapshots](https://github.com/Sara-Managed-Projects/space-radar/issues/291).
- **Pages a search engine can read** for the questions people ask: the ISS, Starlink, planets
  tonight, the 40 star systems, sky events, About and Sources and Accuracy, and a page for
  teachers. [Tracked here](https://github.com/Sara-Managed-Projects/space-radar/issues/555).
- **Kind to everyone's motion settings.** [Reduced motion throughout trips](https://github.com/Sara-Managed-Projects/space-radar/issues/236).
- **Credit where it is due.** [An attribution footer for NASA and Solar System Scope assets](https://github.com/Sara-Managed-Projects/space-radar/issues/255).
- **Small hardening for screens that run on their own:**
  [a test for the kiosk watchdog](https://github.com/Sara-Managed-Projects/space-radar/issues/502),
  [a fallback for the home page's one true sentence](https://github.com/Sara-Managed-Projects/space-radar/issues/503),
  [the new brand icons in the offline zip](https://github.com/Sara-Managed-Projects/space-radar/issues/501).
- **Clearer cards.** [Say when the clock is outside a spacecraft's recorded path](https://github.com/Sara-Managed-Projects/space-radar/issues/493).

## Next (to the end of 2026)

- **More languages.** A loader so the app can use a translation file, then the first
  languages. [The loader](https://github.com/Sara-Managed-Projects/space-radar/issues/524) and
  [the translation epic](https://github.com/Sara-Managed-Projects/space-radar/issues/551); read
  [docs/TRANSLATING.md](docs/TRANSLATING.md) and pick a language.
- **More star systems to fly into**, by fame, each with its measured and its imagined parts
  labelled. [The next batch](https://github.com/Sara-Managed-Projects/space-radar/issues/556).
- **Better-looking spacecraft.** [An art pass for the procedural models](https://github.com/Sara-Managed-Projects/space-radar/issues/267)
  (Tiangong, Surveyor, rocket bodies and oddities), and [comet tails that respond to the Sun](https://github.com/Sara-Managed-Projects/space-radar/issues/550).
- **Alerts you ask for.** [Email for close approaches as well as launches and meteor showers](https://github.com/Sara-Managed-Projects/space-radar/issues/377),
  and [proof that the confirmation and unsubscribe links work](https://github.com/Sara-Managed-Projects/space-radar/issues/379).
- **More trips, written by more people.** [A trip about the two launch pads at Kennedy](https://github.com/Sara-Managed-Projects/space-radar/issues/548)
  is the example; the way to write one is in [CONTRIBUTING.md](CONTRIBUTING.md#add-a-trip).
- **Classrooms and museums.** Real reports from real rooms:
  [try present mode and tell us](https://github.com/Sara-Managed-Projects/space-radar/issues/552).

## Later

- **Comets with real shapes and tails.** [Comets](https://github.com/Sara-Managed-Projects/space-radar/issues/421)
  (one shape needs a free account with the European Space Agency that a maintainer has to open).
- **A filmic finish** to the picture: [bloom, grading and better anti-aliasing](https://github.com/Sara-Managed-Projects/space-radar/issues/261).
- **Hold the phone up** and the sky on the screen matches the sky overhead:
  [the idea](https://github.com/Sara-Managed-Projects/space-radar/issues/440).
- **Counts without trackers.** Whether trips started, finished and shared can be counted without
  following anyone is [undecided](https://github.com/Sara-Managed-Projects/space-radar/issues/294).
  If it happens it will be counts, not people.

## Not doing

- **No accounts.** Using Space Radar will never need one.
- **No advertising, no paid tiers.** It is free and MIT-licensed.
- **No trackers.** No analytics scripts, no cookies, no fingerprinting.
- **No invented detail without a label.** Everything drawn is measured, modelled or an artist's
  impression and says which ([the honesty rules](CONTRIBUTING.md#the-honesty-rules)). A face
  nobody has seen is never drawn as a photograph.
- **No promises about sky events we have not computed.** A date on a page is computed or sourced,
  and the page says which.

Want something here sooner, or something that is missing? Open an
[idea](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=idea.yml) or start
a thread in [Discussions](https://github.com/Sara-Managed-Projects/space-radar/discussions).
