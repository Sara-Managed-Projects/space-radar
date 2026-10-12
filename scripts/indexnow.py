#!/usr/bin/env python3
"""IndexNow: tell Bing, Yandex and the other engines that share the protocol which pages changed.

    python3 scripts/indexnow.py key                       print the key; `host` prints the site's address
    python3 scripts/indexnow.py write-key DIR             write DIR/<key>.txt (the key file)
    python3 scripts/indexnow.py fetch URL FILE            save a sitemap (the live one, before a deploy)
    python3 scripts/indexnow.py changed OLD NEW           the URLs of NEW sitemap.xml that are new or
                                                          whose lastmod differs from OLD (a path or URL)
    python3 scripts/indexnow.py ping OLD NEW [--dry-run]  the above, POSTed to api.indexnow.org

THE KEY IS PUBLIC BY DESIGN. IndexNow proves that you own a site by fetching https://HOST/<key>.txt
and finding the key in it, so the key is written on the site for anybody to read: it is a constant
here, generated once with `secrets.token_hex(16)` and committed. Rotating it is changing KEY.

NEVER FAILS A DEPLOY. scripts/deploy.sh runs this only when INDEXNOW=1 is in the environment, after
everything is uploaded, and ignores its exit status; here, a network error, a refusal or a sitemap
that cannot be read is a warning on stderr and exit 0. A ping is a courtesy to the search engines,
not part of the release. At most 10 000 URLs go in one request (the protocol's limit).
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

KEY = "2468e6435f04752f7344406ba5e29cda"
HOST = "https://www.spaceradar.ai"
ENDPOINT = "https://api.indexnow.org/indexnow"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
LIMIT = 10000


def key_file_name() -> str:
    return f"{KEY}.txt"


def write_key(out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    path = out / key_file_name()
    path.write_text(KEY + "\n", encoding="utf-8")
    return path


def read_sitemap(source: str) -> dict[str, str] | None:
    """{url: lastmod} from a path or an https URL; None when it cannot be read."""
    try:
        if source.startswith(("http://", "https://")):
            with urllib.request.urlopen(urllib.request.Request(source, headers={"User-Agent": "space-radar-deploy"}), timeout=20) as r:
                data = r.read()
        else:
            data = Path(source).read_bytes()
        root = ET.fromstring(data)
    except (OSError, urllib.error.URLError, ET.ParseError, ValueError) as e:
        print(f"indexnow: could not read {source}: {e}", file=sys.stderr)
        return None
    return {(u.findtext(f"{NS}loc") or "").strip(): (u.findtext(f"{NS}lastmod") or "").strip()
            for u in root.findall(f"{NS}url")}


def fetch(url: str, dest: Path) -> None:
    """Save `url` to `dest`; nothing is written when it cannot be read."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "space-radar-deploy"}), timeout=20) as r:
            data = r.read()
        dest.write_bytes(data)
    except (OSError, urllib.error.URLError, ValueError) as e:
        print(f"indexnow: could not fetch {url}: {e}", file=sys.stderr)


def changed(old: dict[str, str], new: dict[str, str]) -> list[str]:
    return sorted(u for u, d in new.items() if u and old.get(u) != d)


def payload(urls: list[str], host: str = HOST) -> dict:
    return {"host": host.split("://", 1)[-1], "key": KEY, "keyLocation": f"{host}/{key_file_name()}", "urlList": urls[:LIMIT]}


def ping(urls: list[str], dry_run: bool = False) -> int:
    if not urls:
        print("indexnow: nothing changed, nothing to send")
        return 0
    body = payload(urls)
    if dry_run:
        print(f"indexnow: would POST {len(body['urlList'])} URL(s) to {ENDPOINT}")
        return 0
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            print(f"indexnow: sent {len(body['urlList'])} URL(s), answered {r.status}")
    except urllib.error.HTTPError as e:  # 202 is a success some engines answer with; 4xx/5xx is a warning
        print(f"indexnow: {ENDPOINT} answered {e.code} (the deploy is not affected)", file=sys.stderr)
    except (OSError, urllib.error.URLError, ValueError) as e:
        print(f"indexnow: could not reach {ENDPOINT}: {e} (the deploy is not affected)", file=sys.stderr)
    return 0


def main(argv: list[str]) -> int:
    args = [a for a in argv if a != "--dry-run"]
    dry = "--dry-run" in argv
    try:
        if args[:1] == ["key"]:
            print(KEY)
        elif args[:1] == ["host"]:
            print(HOST)
        elif args[:1] == ["write-key"] and len(args) == 2:
            print(write_key(Path(args[1])))
        elif args[:1] == ["fetch"] and len(args) == 3:
            fetch(args[1], Path(args[2]))
        elif args[:1] == ["changed"] and len(args) == 3:
            old, new = read_sitemap(args[1]), read_sitemap(args[2])
            print("\n".join(changed(old or {}, new or {})))
        elif args[:1] == ["ping"] and len(args) == 3:
            old, new = read_sitemap(args[1]), read_sitemap(args[2])
            # Without the sitemap that was live there is no telling what changed; pinging every URL on
            # every such deploy would be spam, so a deploy that could not read it sends nothing.
            if old is None or new is None:
                print("indexnow: no previous or no new sitemap to compare, nothing sent")
                return 0
            return ping(changed(old, new), dry)
        else:
            print(__doc__, file=sys.stderr)
            return 2
    except Exception as e:  # noqa: BLE001 - this script must never be the reason a deploy fails
        print(f"indexnow: {e}", file=sys.stderr)
        return 0 if args[:1] == ["ping"] else 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
