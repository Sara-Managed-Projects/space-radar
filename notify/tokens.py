"""Signed tokens for confirm/unsubscribe links. No login, no password: a token only proves "the
holder received this exact email", nothing about who they are.

A token is an HMAC-SHA256 over `email:nonce`, keyed by a secret read from the environment AT CALL
TIME -- never hardcoded, never committed (NOTIFY_SECRET_ENV names the variable; see
notify/lambda_handler.py). The nonce is a per-subscription random string, so a token cannot be
forged without the secret, and subscriptions.py rotates the nonce on unsubscribe so an old link
stops working even though its signature still checks out.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import secrets

NOTIFY_SECRET_ENV = "NOTIFY_SECRET"

# A fixed, clearly-marked test-only constant. Real deploys read NOTIFY_SECRET from the Lambda's
# environment (set by provision-notifier.sh's owner, from a real secret); this value is never read
# at runtime and exists only so tests do not need a secrets manager to exercise the token math.
TEST_ONLY_SECRET = "test-only-notify-secret-do-not-use-in-prod"


def new_nonce() -> str:
    return secrets.token_urlsafe(18)


def _sign(email: str, nonce: str, secret: str) -> str:
    mac = hmac.new(secret.encode("utf-8"), f"{email}:{nonce}".encode("utf-8"), hashlib.sha256)
    return mac.hexdigest()


def make_token(email: str, nonce: str, secret: str) -> str:
    """`base64url(email).nonce.hexsig` -- readable enough to debug, signed enough to trust."""
    sig = _sign(email, nonce, secret)
    enc_email = base64.urlsafe_b64encode(email.encode("utf-8")).decode("ascii").rstrip("=")
    return f"{enc_email}.{nonce}.{sig}"


def split_token(token: str) -> tuple[str, str, str] | None:
    """`(email, nonce, sig)`, or None if the token is not even well-formed."""
    try:
        enc_email, nonce, sig = token.split(".", 2)
        pad = "=" * (-len(enc_email) % 4)
        email = base64.urlsafe_b64decode(enc_email + pad).decode("utf-8")
    except (ValueError, UnicodeDecodeError, binascii.Error):
        return None
    return email, nonce, sig


def verify_token(token: str, secret: str) -> str | None:
    """The email a token proves, or None if it is malformed or does not match `secret`."""
    parts = split_token(token)
    if parts is None:
        return None
    email, nonce, sig = parts
    if not hmac.compare_digest(_sign(email, nonce, secret), sig):
        return None
    return email
