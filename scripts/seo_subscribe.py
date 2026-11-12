"""The subscribe form of the static pages: the design kit's component (internal web-kit/src/subscribe.mjs) in Python.

    subscribe_form(root, source, ...)   the markup, the same as the kit's subscribeForm() gives
    ENDPOINT                            the subscription service's base URL (internal infra/subscribe/README.md)
    LISTS                               the lists a form may offer, with the words it shows

The markup is a plain <form method="post"> to the service, so it works with no script: the service answers a form post
with its own "check your inbox" page. site/js/pages/subscribe.js upgrades it to fetch() with the states idle, sending,
check your inbox and error, as the kit's js/subscribe.js does.

THE KIT'S RULES (web-kit/DESIGN.md section 3): one list is a single-purpose form with no checkbox and the button names
it; several lists are checkboxes with NONE ticked and one needed; "already subscribed" looks like "check your inbox";
the privacy line under every form, linking the privacy page (here the relative ../privacy/index.html, as every link
between the static pages is). A honeypot field `website` stays empty: off screen, tabindex -1, autocomplete off.

Nothing here tracks: the form sends the address, the lists, the page it is on and the empty honeypot, and nothing loads
from the service before the button is pressed.
"""

from __future__ import annotations

import html
import re

# The deployed service (stack space-radar-subscribe, eu-north-1). Its /health answers {"ok": true}.
ENDPOINT = "https://xc6vgkqu32sjm6cu4wqgvzrmsa0ytybx.lambda-url.eu-north-1.on.aws/"

# The lists the service knows (internal services/subscribe/lists.py), with the kit's words.
LISTS = {
    "news": ("Space Radar news", "New features and releases of the 3D map"),
    "journal": ("The Journal", "New posts on blog.spaceradar.ai"),
    "games": ("Space games", "News about every Space Radar game"),
    "sky": ("Sky alerts", "Launches, meteor showers and close approaches"),
    "models": ("Space Radar models", "New 3D models on models.spaceradar.ai"),
    "video": ("Space Radar video", "New films and series on video.spaceradar.ai"),
}
# Every static page offers these six, in this order (the service's ORDER).
ALL = ("news", "journal", "games", "sky", "models", "video")

PRIVACY_LINE = ("We keep your address and the lists you pick, nothing else. No tracking pixels, no rewritten links. "
                "Every email has a one-click unsubscribe.")

MAIL = ('<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" '
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/>'
        '<path d="M4 7.5l8 6 8-6"/></svg>')

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def subscribe_form(root: str, source: str, *, lists: tuple[str, ...] = ALL, form_id: str = "subscribe",
                   title: str = "Free email updates from Space Radar", level: str = "h2",
                   text: str = "News of the map, journal posts, the space games, the sky's coming events, new 3D models and films. Pick what you want; leave in one click.",
                   button: str = "Subscribe", variant: str = "band") -> str:
    """The kit's subscribeForm() markup. `root` is the page's way to the site root ("../", "../../", "/"), for the
    privacy link; `source` the page's absolute address (the script sends location.href instead)."""
    if not re.match(r"^https://[^/]+/(.*/)?$", ENDPOINT):
        raise SystemExit(f"seo_subscribe: the endpoint {ENDPOINT} is not an https URL ending in /")
    if not lists or any(x not in LISTS for x in lists):
        raise SystemExit(f"seo_subscribe: unknown list in {lists}")
    if not re.match(r"^[a-z][a-z0-9-]*$", form_id):
        raise SystemExit(f"seo_subscribe: form id {form_id}")
    if variant not in ("band", "card"):
        raise SystemExit(f"seo_subscribe: variant {variant}")
    i = form_id
    one = len(lists) == 1
    choose = (f'<input type="hidden" name="lists" value="{esc(lists[0])}">' if one else
              '<fieldset class="sub__l"><legend>Pick at least one</legend>'
              + "".join(f'<label><input type="checkbox" name="lists" value="{esc(x)}"><span>{esc(LISTS[x][0])}</span></label>'
                        for x in lists) + "</fieldset>")
    multi = "" if one else " data-multi"
    sentence = f'<p class="sub__x">{esc(text)}</p>' if text else ""
    return (f'<form class="sub sub--{variant}" id="{i}" method="post" action="{esc(ENDPOINT)}subscribe" accept-charset="utf-8" '
            f'aria-labelledby="{i}-h" data-sub{multi}>'
            f'<div class="sub__t"><{level} class="sub__h" id="{i}-h">{esc(title)}</{level}>{sentence}</div>'
            f'<div class="sub__f">{choose}<input type="hidden" name="source" value="{esc(source)}">'
            f'<div class="sub__r"><label class="sub__lb" for="{i}-e">Email address</label>'
            f'<input class="sub__e" id="{i}-e" type="email" name="email" autocomplete="email" inputmode="email" required '
            f'spellcheck="false" autocapitalize="off" maxlength="254" placeholder="you@example.org">'
            f'<button class="btn sub__b" type="submit">{MAIL}<span>{esc(button)}</span></button></div>'
            f'<div class="sub__hp" aria-hidden="true"><label for="{i}-w">Leave this empty</label>'
            f'<input id="{i}-w" type="text" name="website" tabindex="-1" autocomplete="off" value=""></div>'
            f'<p class="sub__s" role="status" aria-live="polite"></p>'
            f'<p class="sub__p">{esc(PRIVACY_LINE)} <a href="{esc(root)}privacy/index.html">Privacy</a>.</p></div></form>')


def script(root: str) -> str:
    """The form's states (site/js/pages/subscribe.js): a module, so it runs after the page is read and blocks nothing."""
    return f'<script type="module" src="{esc(root)}js/pages/subscribe.js"></script>\n'
