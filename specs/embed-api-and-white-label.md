# A read-only JSON API and white-label embeds (spec, not built)

Forge internal #554 asked for three things. The first, an Embed tab on every view's share sheet, ships in the research
train of 2026-11-24 (`site/js/ui/sharesheet.js`, `docs/EMBEDDING.md`). The other two, a read-only public API and a
white-label embed for classrooms, are larger and touch the hosting, the platform's plans and the licences of the data,
so they are written down here for a decision before anyone builds them.

## 1. A read-only JSON API

**What.** `https://www.spaceradar.ai/api/v1/` serves, as static JSON, what the map already computes or saves:

| path | what | from |
|---|---|---|
| `objects/<id>.json` | one record: id, name, class, the card's three numbers, `cls` (measured, inferred, illustrative, sample), sources | the same rows `scripts/build_seo.py` turns into `/o/<slug>.html` |
| `objects/index.json` | every id with its name, class and page | `object-pages.json`, which the share sheet already reads |
| `ephemeris/<id>.csv?from=&to=&step=` | positions over a span, for a planet, a probe or a satellite | **not static**: needs a function (below) |
| `now/<id>.json` | where it is now (sub-point, height, speed) | **not static** |

**How.** Phase one is static only: the deploy writes `api/v1/objects/*.json` beside the object pages (one more output of
`scripts/build_seo.py`), CloudFront serves them with `Access-Control-Allow-Origin: *`, `Cache-Control: max-age=3600`.
No key, no account, no cookie, no rate limit beyond CloudFront's. Phase two (ephemeris and now) needs a Lambda behind
CloudFront running the app's own propagators (`site/js/propagate/`, SGP4 and the saved ephemerides), cached per minute.

**Rules.**
- Every value carries its `cls` and its source line, as the card does; nothing is served that the map does not draw.
- **Licences decide what may be re-served.** CelesTrak's elements, JPL Horizons' vectors and HYG/AT-HYG (CC BY-SA 4.0,
  share-alike: the API's star rows would be CC BY-SA too) each need their terms read for redistribution as an API, and the
  response must carry the attribution. Launch Library 2 is rate-limited and has its own terms. Until each is read, phase
  one serves only fields computed by this project from registry rows it owns.
- Versioned path (`/v1/`), documented in `docs/API.md` with examples, JSON Schema per response, and a test that every
  response validates.

**Open questions for the lead.** Is the API free for everyone (the free-and-paid rule says the sky stays free), or is the
ephemeris CSV export the Ultra extra the research listed? Who answers abuse? Does CloudFront's free tier hold the traffic?

## 2. White-label embeds for classrooms

**What.** The embed (`?embed=1`) without the "Open in Space Radar" corner, with a classroom theme (larger type, the
honesty words always on, no time controls), for a school's own site.

**How.** A query key `brand=0` the embed reads only when the page's entitlements say `ultra` (CONTRACT.md: a feature
checks `ent`, never `plan`). The embed cannot know the visitor's entitlement (it runs in someone else's page, with no
cookie of ours: `sr_s` is SameSite=Lax and an iframe is a third-party context). So the entitlement must belong to the
**site that embeds**, not the visitor: a signed token in the snippet (`brand=0&k=<HMAC of the host and an expiry>`),
issued from the account pages to an Ultra account for one host, checked by the embed against `document.referrer`'s
origin or `ancestorOrigins`. A token copied to another host fails and the corner stays.

**Rules.** The credit line under the frame is the visitor's choice already (the Embed tab's checkbox). The corner link
inside the frame is the one way a reader can reach the source and the sources sheet, so white-label keeps a small
"Sources" affordance even without the brand. The cookie notice must never load inside the frame (`?embed=1` already loads
no platform script on the light embed; the bridge must keep that: `platform-bridge.js` skips when `isEmbed(location.search)`).

## 3. Hosting headers (for the lead: the hosting config is not in this repository)

The repository has no CloudFront response-headers policy, CSP or `X-Frame-Options` (searched 2026-11-24), so today any
page may frame any page of www, which is what the embed needs. **When a headers policy is added**, framing must stay
allowed for the embed and only there:

- `?embed=1` (the app shell with that query): `Content-Security-Policy: frame-ancestors *` (or a list, if white-label
  narrows it), and **no** `X-Frame-Options`.
- Every other page: `Content-Security-Policy: frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`, against
  click-jacking of the account and share flows.

CloudFront response-headers policies attach per cache behaviour (path pattern), not per query string, and the embed's
address is the root with a query (`/?embed=1`). So either a CloudFront Function on viewer-response sets the two headers
from the query, or the embed moves to its own path (`/embed/frame.html?at=...`, a copy of the shell) with its own
behaviour. The first keeps every snippet already pasted working.
