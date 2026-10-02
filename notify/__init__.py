"""Email-only event subscription (issue #251).

Scope, settled against the sibling issues rather than guessed: #290 proposes push notifications
for a "this passes over you" alert, which needs an ongoing per-device lat/lon and is computed
client-side; email cannot do that without tracking a subscriber's location server-side, which is
out of scope here and stays #290's job. This package only ever mails events that are the same for
every subscriber: upcoming launches (read from the harvester's existing `data/v1/launches.json`
snapshot, never refetched here) and meteor shower peak dates (from `registry/showers.yaml`, mirrored
in `notify/showers.py`). See #297, the tracking issue, for how the two fit together.

Modules, mirroring harvest/'s shape:
    tokens.py          HMAC-signed confirm/unsubscribe tokens. No login, no password.
    subscriptions.py   the pending -> confirmed -> unsubscribed state machine, pure functions.
    showers.py         the small hand-synced mirror of registry/showers.yaml's id/display/peak.
    digest.py          next-N-launches, next-shower-peak math, the dedupe ledger, digest content.
    lambda_handler.py  the one Lambda: an HTTP route for subscribe/confirm/unsubscribe behind a
                       Function URL, and the scheduled digest, matching harvest/lambda_handler.py's
                       convention that boto3 is imported inside the handler body and nowhere else.
"""
