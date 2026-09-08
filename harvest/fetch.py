"""HTTP for the harvester: urllib, a timeout, one retry, and conditional GET.

Everything the upstreams have taught us is here as a rule rather than a comment:

  * ONE User-Agent that names the project and a contact. Wikidata refuses anonymous scripts, and
    CelesTrak's usage policy asks for it.
  * Conditional GET. `If-None-Match` from the ETag we hold, `If-Modified-Since` from the time we
    last fetched. A 304 is a success that carried no bytes; the caller records it as such.
  * ONE retry, and only for the failures a retry can fix: a connection that never opened, a
    timeout, a 5xx. A 4xx is an answer, not a fault, and is returned to the caller as-is --
    CelesTrak firewalls a client that retries its 403.
  * No compression negotiation. urllib sends `Accept-Encoding: identity`; the bodies are read
    once and measured in the bytes the upstream sent.
"""

from __future__ import annotations

import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import format_datetime

USER_AGENT = "space-radar-harvester/1.0 (+https://spaceradar.ai)"
DEFAULT_TIMEOUT_S = 30
RETRY_PAUSE_S = 2.0


class FetchError(Exception):
    """The request could not be completed after the one retry. `.cause` is the last exception."""

    def __init__(self, message: str, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause


@dataclass(frozen=True)
class Response:
    url: str
    status: int
    body: bytes
    content_type: str
    etag: str | None
    last_modified: str | None
    duration_ms: int

    @property
    def text(self) -> str:
        return self.body.decode(_charset(self.content_type), errors="replace")


def with_params(url: str, params: dict[str, str]) -> str:
    """`url` with `params` appended as a query string (keeping any query it already has)."""
    if not params:
        return url
    sep = "&" if "?" in url else "?"
    return url + sep + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)


def http_date(iso: str) -> str:
    """`2026-09-08T01:30:00Z` -> `Mon, 08 Sep 2026 01:30:00 GMT`, for If-Modified-Since."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(timezone.utc)
    return format_datetime(dt, usegmt=True)


def get(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    etag: str | None = None,
    since: str | None = None,
    timeout: float = DEFAULT_TIMEOUT_S,
    retries: int = 1,
    sleep=time.sleep,
    opener=None,
) -> Response:
    """GET `url`. Returns a Response for every HTTP answer (2xx, 304, 4xx, 5xx after retry).

    Raises FetchError only when no HTTP answer was obtained at all -- DNS, connection, timeout --
    or when the last retry still met a 5xx.
    """
    req_headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    if headers:
        req_headers.update(headers)
    if etag:
        req_headers["If-None-Match"] = etag
    if since:
        req_headers["If-Modified-Since"] = http_date(since)

    open_ = (opener or urllib.request.build_opener()).open
    attempt = 0
    last: BaseException | None = None
    while True:
        started = time.monotonic()
        try:
            req = urllib.request.Request(url, headers=req_headers, method="GET")
            with open_(req, timeout=timeout) as resp:
                body = resp.read()
                return _response(url, resp.status, body, resp.headers, started)
        except urllib.error.HTTPError as e:
            body = e.read() if e.fp is not None else b""
            if 500 <= e.code < 600 and attempt < retries:
                last = e
            else:
                return _response(url, e.code, body, e.headers, started)
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, OSError) as e:
            last = e
        if attempt >= retries:
            raise FetchError(f"{_describe(last)} (after {attempt + 1} attempt(s))", last)
        attempt += 1
        sleep(RETRY_PAUSE_S)


def _response(url: str, status: int, body: bytes, headers, started: float) -> Response:
    ct = headers.get("Content-Type") if headers is not None else None
    return Response(
        url=url,
        status=int(status),
        body=body,
        content_type=(ct or "application/octet-stream").strip(),
        etag=_clean(headers.get("ETag")) if headers is not None else None,
        last_modified=_clean(headers.get("Last-Modified")) if headers is not None else None,
        duration_ms=int((time.monotonic() - started) * 1000),
    )


def _clean(value) -> str | None:
    if value is None:
        return None
    v = str(value).strip()
    return v or None


def _charset(content_type: str) -> str:
    for part in content_type.split(";")[1:]:
        k, _, v = part.strip().partition("=")
        if k.lower() == "charset" and v:
            return v.strip('"').strip() or "utf-8"
    return "utf-8"


def _describe(e: BaseException | None) -> str:
    if e is None:
        return "no answer"
    if isinstance(e, urllib.error.HTTPError):
        return f"HTTP {e.code}"
    if isinstance(e, urllib.error.URLError):
        return f"could not reach the server: {e.reason}"
    if isinstance(e, (socket.timeout, TimeoutError)):
        return "timed out"
    return f"{type(e).__name__}: {e}"
