"""The pending -> confirmed -> unsubscribed state machine. Pure functions over a plain dict store
(email -> record) so callers -- tests, the Lambda handlers -- can serialize it to JSON with no
custom encoder, the same convention harvest/snapshot.py's manifest uses.

Record shape:
    {"email": str, "nonce": str, "status": "pending" | "confirmed" | "unsubscribed",
     "categories": ["launches", "meteor-showers", ...], "created_at": ISO str}

A record's current token is tokens.make_token(email, nonce, secret). The nonce changes on every
subscribe (even re-subscribing an existing email starts a fresh cycle) and on unsubscribe, so a
token from a previous cycle stops verifying here even though its signature is still valid.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from . import tokens

Store = dict[str, dict[str, Any]]  # email -> record

VALID_CATEGORIES = ("launches", "meteor-showers")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def subscribe(
    store: Store, email: str, categories: list[str], secret: str, *, now: str | None = None
) -> tuple[dict, str]:
    """Create (or restart) a pending record for `email`. Returns `(record, confirm_token)`."""
    email = (email or "").strip().lower()
    if not email or "@" not in email or email.startswith("@") or email.endswith("@"):
        raise ValueError(f"not an email address: {email!r}")
    chosen = sorted({c for c in categories if c in VALID_CATEGORIES})
    if not chosen:
        raise ValueError(f"categories must include at least one of {VALID_CATEGORIES}")
    nonce = tokens.new_nonce()
    record = {
        "email": email,
        "nonce": nonce,
        "status": "pending",
        "categories": chosen,
        "created_at": now or now_iso(),
    }
    store[email] = record
    return record, tokens.make_token(email, nonce, secret)


def _lookup_current(store: Store, token: str, secret: str) -> dict | None:
    """The record a token currently proves, or None (bad signature, unknown email, or a nonce
    from a cycle this token is no longer part of)."""
    email = tokens.verify_token(token, secret)
    if email is None:
        return None
    record = store.get(email)
    if record is None:
        return None
    parts = tokens.split_token(token)
    if parts is None or parts[1] != record["nonce"]:
        return None
    return record


def confirm(store: Store, token: str, secret: str) -> dict | None:
    """Mark the record this token names as confirmed. Idempotent: confirming twice is a no-op."""
    record = _lookup_current(store, token, secret)
    if record is None:
        return None
    record["status"] = "confirmed"
    return record


def unsubscribe(store: Store, token: str, secret: str) -> dict | None:
    """Mark the record unsubscribed and rotate its nonce, invalidating every outstanding token
    for this email -- including a confirm link from the same cycle that was never used."""
    record = _lookup_current(store, token, secret)
    if record is None:
        return None
    record["status"] = "unsubscribed"
    record["nonce"] = tokens.new_nonce()
    return record


def active_subscribers(store: Store, category: str) -> list[dict]:
    """Confirmed records that chose `category`, in no particular order."""
    return [r for r in store.values() if r["status"] == "confirmed" and category in r["categories"]]
