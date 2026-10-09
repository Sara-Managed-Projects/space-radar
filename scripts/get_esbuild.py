#!/usr/bin/env python3
"""Print the path of the pinned esbuild binary, fetching and checking it first if it is not here yet.

    python3 scripts/get_esbuild.py            # prints /…/.cache/space-radar/esbuild/0.25.9-darwin-x64/esbuild
    python3 scripts/get_esbuild.py --check    # the pins are well formed; fetches nothing

WHY THIS AND NOT `npm install` (internal #515, 2026-10-09). The site has no build step and no
package.json, and a deploy machine may have node and no npm (Ivan's Mac has exactly that). The
minifier a deploy runs is one static binary; this fetches that one file from the npm registry,
refuses it unless the archive's SHA-512 is the one npm published for this exact version (the
`integrity` field, copied below on 2026-10-09) and the binary inside has the SHA-256 recorded
here that day, and keeps it outside the repository. Nothing is installed globally and nothing is
executed that was not checked: a changed byte upstream is a refused deploy, not a different site.

esbuild is MIT (c) Evan Wallace. It is run, not shipped: no file of it is in the repository or on
the site, so it has a line under "Tools" in CREDITS.md and no licence text to carry.

To move the pin: change VERSION, replace each `sri` with `dist.integrity` from
https://registry.npmjs.org/@esbuild/<platform>/<version>, run this with --print-binary-hashes on
each platform (or read them from the archives), and run tests/test_minify_real.mjs.
"""

from __future__ import annotations

import base64
import hashlib
import io
import os
import platform
import sys
import tarfile
import urllib.request
from pathlib import Path

VERSION = "0.25.9"
PINS = {
    "darwin-x64": {
        "sri": "sha512-jhHfBzjYTA1IQu8VyrjCX4ApJDnH+ez+IYVEoJHeqJm9VhG9Dh2BYaJritkYK3vMaXrf7Ogr/0MQ8/MeIefsPQ==",
        "binary_sha256": "13b00c1322c3cfb030e086d60cacbb85add0074162d75d972099cf9ccb65ca23",
    },
    "darwin-arm64": {
        "sri": "sha512-XIpIDMAjOELi/9PB30vEbVMs3GV1v2zkkPnuyRRURbhqjyzIINwj+nbQATh4H9GxUgH1kFsEyQMxwiLFKUS6Rg==",
        "binary_sha256": "f7357c1e944f135066b69260729b07a39d1b39a03bfe7d84644224fc827595ed",
    },
    "linux-x64": {
        "sri": "sha512-iSwByxzRe48YVkmpbgoxVzn76BXjlYFXC7NvLYq+b+kDjyyk30J0JY47DIn8z1MO3K0oSl9fZoRmZPQI4Hklzg==",
        "binary_sha256": "92d1ca653cf188da8d7650ddfe1c32d5a139bf3a9a2808f3e622e6d667ce0389",
    },
    "linux-arm64": {
        "sri": "sha512-BlB7bIcLT3G26urh5Dmse7fiLmLXnRlopw4s8DalgZ8ef79Jj4aUcYbk90g8iCa2467HX8SAIidbL7gsqXHdRw==",
        "binary_sha256": "7be7c2877b14b94154742fdacedd4b82749dded2caff6e01077de94e47414407",
    },
}


class Refused(Exception):
    pass


def this_platform() -> str:
    system = {"Darwin": "darwin", "Linux": "linux"}.get(platform.system())
    machine = {"x86_64": "x64", "amd64": "x64", "arm64": "arm64", "aarch64": "arm64"}.get(platform.machine().lower())
    name = f"{system}-{machine}"
    if name not in PINS:
        raise Refused(f"no pinned esbuild for {platform.system()} {platform.machine()}; add it to PINS, or deploy with --strip-only")
    return name


def url(name: str) -> str:
    return f"https://registry.npmjs.org/@esbuild/{name}/-/{name}-{VERSION}.tgz"


def cache_dir() -> Path:
    base = os.environ.get("XDG_CACHE_HOME") or str(Path.home() / ".cache")
    return Path(base) / "space-radar" / "esbuild"


def binary_from(archive: bytes, name: str) -> bytes:
    """The one file we run, out of an archive already checked against npm's SHA-512."""
    pin = PINS[name]
    algo, _, want = pin["sri"].partition("-")
    if algo != "sha512" or base64.b64encode(hashlib.sha512(archive).digest()).decode() != want:
        raise Refused(f"the esbuild {VERSION} archive for {name} is not the one npm published (SHA-512 differs); nothing was kept")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        # Read by name, into memory: nothing in the archive chooses where a file lands.
        member = tar.extractfile("package/bin/esbuild")
        if member is None:
            raise Refused("the archive holds no package/bin/esbuild")
        binary = member.read()
    if hashlib.sha256(binary).hexdigest() != pin["binary_sha256"]:
        raise Refused(f"the esbuild binary for {name} is not the one recorded on 2026-10-09 (SHA-256 differs); nothing was kept")
    return binary


def ensure(name: str | None = None, fetch=None) -> Path:
    name = name or this_platform()
    target = cache_dir() / f"{VERSION}-{name}" / "esbuild"
    if target.is_file():
        # Checked again every time it is used: a cache is somebody's home folder.
        if hashlib.sha256(target.read_bytes()).hexdigest() == PINS[name]["binary_sha256"]:
            return target
        target.unlink()
    if fetch is None:
        def fetch(address: str) -> bytes:
            with urllib.request.urlopen(address, timeout=120) as res:  # noqa: S310 (a fixed https address)
                return res.read()
    try:
        archive = fetch(url(name))
    except Refused:
        raise
    except Exception as why:  # no network, a registry outage
        raise Refused(f"could not fetch {url(name)} ({why}); deploy with --strip-only, or put the binary at {target}") from why
    binary = binary_from(archive, name)
    target.parent.mkdir(parents=True, exist_ok=True)
    tmp = target.with_name(f"esbuild.{os.getpid()}.tmp")
    tmp.write_bytes(binary)
    tmp.chmod(0o755)
    tmp.replace(target)
    return target


def main() -> int:
    if "--check" in sys.argv:
        bad = [n for n, p in PINS.items() if not p["sri"].startswith("sha512-") or len(base64.b64decode(p["sri"][7:])) != 64
               or len(p["binary_sha256"]) != 64 or any(c not in "0123456789abcdef" for c in p["binary_sha256"])]
        if bad:
            print(f"get_esbuild: malformed pin for {bad}", file=sys.stderr)
            return 1
        print(f"get_esbuild: esbuild {VERSION} is pinned for {', '.join(PINS)} by npm's SHA-512 and the binary's SHA-256")
        return 0
    try:
        print(ensure())
    except Refused as why:
        print(f"get_esbuild: {why}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
