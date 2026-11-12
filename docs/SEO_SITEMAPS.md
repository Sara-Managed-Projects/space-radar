# Sitemaps: one index for every Space Radar site

`https://www.spaceradar.ai/sitemap.xml` is a **sitemap index**. From that one address a crawler finds every page of
every Space Radar site: the map and its static pages, the journal, games, models and video. Before 2026-11-12 it was the
main site's own list of pages. That list is now `sitemap-pages.xml`.

## What the index lists

Written by `scripts/build_seo.py` at deploy time, from `scripts/seo_sitemaps.py`:

```xml
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>https://www.spaceradar.ai/sitemap-pages.xml</loc><lastmod>(newest page)</lastmod></sitemap>
<sitemap><loc>https://www.spaceradar.ai/sitemap-images.xml</loc><lastmod>(newest page)</lastmod></sitemap>
<sitemap><loc>https://blog.spaceradar.ai/sitemap.xml</loc></sitemap>
<sitemap><loc>https://games.spaceradar.ai/sitemap.xml</loc></sitemap>
<sitemap><loc>https://models.spaceradar.ai/sitemap.xml</loc></sitemap>
<sitemap><loc>https://video.spaceradar.ai/sitemap.xml</loc></sitemap>
<sitemap><loc>https://video.spaceradar.ai/sitemap-video.xml</loc></sitemap>
</sitemapindex>
```

| sitemap | made by | what it holds |
|---|---|---|
| `www…/sitemap-pages.xml` | `scripts/build_seo.py` `sitemap()` | the map, every trip, object, Lab and static page, each with its date |
| `www…/sitemap-images.xml` | `scripts/seo_share.py` | each page's share picture (Google's image extension) |
| `blog…/sitemap.xml` | internal `blog/src/site-build.mjs` | every story, category and page of the journal |
| `games…/sitemap.xml` | internal `games/src/games-build.mjs` | the games, with key art and trailers (image and video extensions) |
| `models…/sitemap.xml` | internal `models/src/models-build.mjs` | the models, with their pictures |
| `video…/sitemap.xml`, `sitemap-video.xml` | internal `video/src/video-build.mjs` | the pages with posters, and the films (video extension) |

The rules it keeps:

- An index may not name another index. The video site has its own `sitemap-index.xml`, so the index lists that site's
  two sitemaps and not its index.
- A `<lastmod>` appears only where it is known. The main site's two sitemaps take the date of their newest page. The
  other sites' dates are for those sites to give, so their entries have none.
- Every site still names its own sitemap in its own `robots.txt`: `www` names the index, `sitemap-pages.xml` and
  `sitemap-images.xml`, and each of the other four names its own sitemap. Nothing depends on the index alone.
- When a site adds a sitemap, its address goes into `OTHER_SITEMAPS` in `scripts/seo_sitemaps.py`.

`scripts/check_seo.py` holds the build to this. It checks that `sitemap.xml` is a 0.9 `sitemapindex` listing exactly
these addresses in this order, that each `www` one is in the build, that each address is https on a spaceradar.ai host,
and that no entry is an index. `sitemap-pages.xml` keeps every rule the old `sitemap.xml` had. `tests/test_seo_growth.py`
and the refusals in `tests/test_refusals.py` show each rule failing. IndexNow (`scripts/indexnow.py`, opt-in in
`deploy.sh`) compares the live `sitemap-pages.xml` with the new one. For the first deploy, when the live site has no
`sitemap-pages.xml` yet, it reads the old `sitemap.xml`. It treats an index as no list of pages, so it never sends every
URL.

## Why search engines accept it

The sitemaps protocol expects the sitemaps in an index to sit on the same host as the index. Google waives that rule
for *cross-site submission*: its sitemap guide lets one sitemap cover "multiple websites, including sites from different
domains" once you have "verified ownership of all the sites" in Search Console. It also asks that each site's own
robots.txt name that site's sitemap, which every site here does (Google, "Build and submit a sitemap" and "Manage your
sitemaps with a sitemap index file", read 2026-11-12). Bing reads the same protocol and the `Sitemap:` lines in each
`robots.txt`. Bing's help page could not be read on 2026-11-12 (it needs a script), so the Bing steps below rely on
verifying every host rather than on one quoted rule.

The safest form for both engines is a **Domain property for `spaceradar.ai`**. One verification covers `www`, `blog`,
`games`, `models` and `video`, over http and https.

## What the maintainer has to do (once, after the first deploy that ships this)

### Google Search Console

1. **Domain property.** Make sure a Domain property `spaceradar.ai` exists and is verified (a DNS TXT record at the
   registrar). If only URL-prefix properties exist (`https://www.spaceradar.ai/`, `https://blog.spaceradar.ai/`), add
   the Domain property. The URL-prefix ones can stay.
2. **One owner.** The same Google account must be a verified owner of every host: the Domain property gives that. Check
   it under Settings → Users and permissions.
3. **Submit the index.** In the Domain property, open Sitemaps and submit `https://www.spaceradar.ai/sitemap.xml`. If it
   was submitted before, when it was a list of pages, submit it again so Google reads it as an index.
4. **Read the result.** After a day or two the row should say *Success*, and opening it should show seven sitemaps with
   a count of discovered pages for each. Look for *Couldn't fetch* on any of them. `models` and `video` give that until
   those sites are live, and it clears on its own once they answer.
5. **Old entries.** Remove any separately submitted copy of the old pages list that no longer exists. Each site's own
   `…/sitemap.xml` may stay submitted in its own property. That does no harm.
6. **A week later.** Check Pages (indexing) for each host: the journal, games, models and video pages should be
   *discovered* through the www index as well as through their own sitemaps.

### Bing Webmaster Tools

1. **Verify every host.** The quickest way is *Import from Google Search Console*, which brings in the verified sites
   and their sitemaps. Otherwise add `www`, `blog`, `games`, `models` and `video` and verify each one (DNS CNAME, the XML
   file or the meta tag). All five must be in the same Bing account.
2. **Submit the index.** In the `www.spaceradar.ai` site, open Sitemaps and submit
   `https://www.spaceradar.ai/sitemap.xml`. Its status should become *Success* and it should list the seven sitemaps.
3. **Each site's own sitemap.** Also submit `https://blog.spaceradar.ai/sitemap.xml` (and games, models, video) in each
   site's own entry. Bing reads the `Sitemap:` lines in each `robots.txt` anyway; submitting is belt and braces.
4. **IndexNow.** The key file is served on `www` only (`scripts/indexnow.py`). IndexNow pings for the other hosts would
   need their own key files. That is not part of this change.
5. **Check the URL counts.** Under Sitemaps, *URLs discovered* for each child should roughly match the page counts the
   builders print.
