"""The www sitemap is an index of every Space Radar sitemap (docs/SEO_SITEMAPS.md).

    PAGES, IMAGES        the main site's own sitemaps, by name: sitemap-pages.xml (every page worth indexing, with its
                         date; scripts/build_seo.py sitemap()) and sitemap-images.xml (the share pictures)
    LANGUAGE_PAGES       sitemap-pages-<lang>.xml: the pages in one of the app's other languages, each <url> with the
                         xhtml:link alternates of every language the page exists in (scripts/seo_i18n.py), listed after
                         sitemap-pages.xml in the app's order (es fr de pt ru uk zh hi he ar), only for a language with a page
    OTHER_SITEMAPS       the other sites' sitemaps, each on its own host and listing only that host's pages
    index(host, lastmod) the sitemap index written as sitemap.xml: the main site's two first, then the other sites'

WHY ONE INDEX. robots.txt and a search console both take one address, https://www.spaceradar.ai/sitemap.xml, and from it a
crawler finds every page of every site: the map and its static pages, the journal, games, models and video. Google and
Bing accept an index whose sitemaps are on other hosts when every host is verified by the same owner (a Domain property
for spaceradar.ai in Search Console covers them all); each site's own robots.txt names its own sitemap too, so nothing
depends on the index alone.

THE RULES IT KEEPS (sitemaps.org, Google's "Manage your sitemaps with a sitemap index file"): the 0.9 namespace; at most
50 000 sitemaps; every <loc> an absolute https URL; an index never names another index, so the video site's two sitemaps
(pages, and the films with Google's video extension) are named and its own sitemap-index.xml is not. A <lastmod> only
where it is known: the main site's from its build; the other sites' are theirs to say, so they carry none.

What each other site emits is its builder's (internal repo): blog/src/site-build.mjs, games/src/games-build.mjs (pages,
with Google's image and video extensions), models/src/models-build.mjs (pages, with images) and video/src/video-build.mjs
(sitemap.xml with posters, sitemap-video.xml). A site that adds a sitemap adds its address here.
"""

from __future__ import annotations

from html import escape

PAGES = "sitemap-pages.xml"
IMAGES = "sitemap-images.xml"
OTHER_SITEMAPS = (
    "https://blog.spaceradar.ai/sitemap.xml",
    "https://games.spaceradar.ai/sitemap.xml",
    "https://models.spaceradar.ai/sitemap.xml",
    "https://video.spaceradar.ai/sitemap.xml",
    "https://video.spaceradar.ai/sitemap-video.xml",
)


LANGUAGE_PAGES = "sitemap-pages-{lang}.xml"  # one per language that has a page (scripts/seo_i18n.py), in site/js/copy/lang.js's order


def own(host: str, languages: list[str] | tuple = ()) -> list[str]:
    """The main site's sitemaps, by address: the English pages, then one per language (`languages` are their file names,
    sitemap-pages-es.xml ..., in the app's order), then the pictures."""
    return [f"{host}/{PAGES}"] + [f"{host}/{n}" for n in languages] + [f"{host}/{IMAGES}"]


def index(host: str, lastmod: str, languages: list[str] | tuple = ()) -> str:
    """The sitemap index (sitemap.xml): the main site's sitemaps with the build's date, then every other site's."""
    rows = [f"<sitemap><loc>{escape(u)}</loc><lastmod>{lastmod}</lastmod></sitemap>" for u in own(host, languages)]
    rows += [f"<sitemap><loc>{escape(u)}</loc></sitemap>" for u in OTHER_SITEMAPS]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</sitemapindex>\n")
