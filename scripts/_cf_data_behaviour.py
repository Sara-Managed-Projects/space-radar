#!/usr/bin/env python3
"""Measure how a CloudFront distribution caches /data/v1/*, and print -- never apply -- the fix.

WHY THIS IS MEASURED AND NOT ASSUMED. The harvester replaces invalidation with TTL expiry
(docs/architecture.md, the cache-headers table): index.json says `max-age=60, s-maxage=300`, and
the design only holds if CloudFront honours that header. provision.sh built the distribution with
one behaviour and a managed cache policy whose DEFAULT TTL is a day; a cache policy does apply the
origin's Cache-Control within its MinTTL..MaxTTL, so the header wins when it is present -- but an
object under data/v1/ that ever arrives without one is pinned for that day, and there is no
invalidation step to save it. Whether that is the state of a given distribution is a fact about
the account, so it is read, not believed.

TWO MODES, ONE OF WHICH TOUCHES AWS, READ-ONLY:

  python3 scripts/_cf_data_behaviour.py --distribution ID [--region R] [--prefix 'data/v1/*']
      Two calls: `cloudfront get-distribution-config` and `cloudfront get-cache-policy`. Prints the
      behaviour that serves the prefix, its TTLs, whether origin headers are honoured, and -- when
      the cache would pin data -- the exact commands that add a data/v1/* behaviour with a policy
      honouring origin headers (min 0, default 60, max 600). It never runs them. Exit 0 either way;
      the verdict is on stdout for a human. Used by: scripts/provision-harvester.sh.

  python3 scripts/_cf_data_behaviour.py --render-config CACHE_POLICY_ID < get-distribution-config.json
      No AWS. Reads the JSON `get-distribution-config` printed and writes the DistributionConfig
      with the data/v1/* behaviour added (a copy of the default behaviour, shorter TTL), ready for
      `update-distribution --distribution-config file://...`. Step 3 of the emitted commands.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys

MANAGED_POLICY_NAME = "space-radar-data-v1"
# The header-less case is what the new policy is for: 60 s is what the index promises a browser,
# and 600 s is the longest anything under data/v1/ may be held at the edge whatever its header says.
NEW_POLICY = {
    "Name": MANAGED_POLICY_NAME,
    "Comment": "Space Radar /data/v1/*: honour origin Cache-Control, never pin past 600 s",
    "MinTTL": 0,
    "DefaultTTL": 60,
    "MaxTTL": 600,
    "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingGzip": True,
        "EnableAcceptEncodingBrotli": True,
        "HeadersConfig": {"HeaderBehavior": "none"},
        "CookiesConfig": {"CookieBehavior": "none"},
        "QueryStringsConfig": {"QueryStringBehavior": "none"},
    },
}
# Fields of the default behaviour that carry over to a path behaviour unchanged. The TTL comes
# from the new policy; the path pattern is added; everything else -- origin, protocol, methods,
# compression, function associations, response-headers policy -- should be exactly what every
# other file on the site already gets.
CARRIED = (
    "TargetOriginId", "TrustedSigners", "TrustedKeyGroups", "ViewerProtocolPolicy",
    "AllowedMethods", "SmoothStreaming", "Compress", "LambdaFunctionAssociations",
    "FunctionAssociations", "FieldLevelEncryptionId", "OriginRequestPolicyId",
    "ResponseHeadersPolicyId", "RealtimeLogConfigArn", "GrpcConfig",
)


def aws(*args: str) -> dict:
    """One read-only aws call, as JSON. The verbs this file may use are the two in the docstring."""
    verb = args[1] if len(args) > 1 else ""
    assert verb.startswith("get-"), f"refusing a non-read verb: {verb}"
    proc = subprocess.run(["aws", *args, "--output", "json"], capture_output=True, text=True)
    if proc.returncode != 0:
        raise SystemExit(f"error: aws {' '.join(args)} failed:\n{proc.stderr.strip()}")
    return json.loads(proc.stdout)


def matching_behaviour(config: dict, prefix: str) -> tuple[str, dict]:
    """The behaviour CloudFront picks for the prefix: the one whose PathPattern is it, else default."""
    for item in (config.get("CacheBehaviors") or {}).get("Items") or []:
        if item.get("PathPattern", "").lstrip("/") == prefix.lstrip("/"):
            return item["PathPattern"], item
    return "default", config["DefaultCacheBehavior"]


def ttls(behaviour: dict, region: str) -> tuple[str, int, int, int]:
    """(policy name, MinTTL, DefaultTTL, MaxTTL) for a behaviour, whichever way it states them."""
    policy_id = behaviour.get("CachePolicyId")
    if policy_id:
        cfg = aws("cloudfront", "get-cache-policy", "--id", policy_id, "--region", region)
        c = cfg["CachePolicy"]["CachePolicyConfig"]
        return f"{c['Name']} ({policy_id})", c["MinTTL"], c["DefaultTTL"], c["MaxTTL"]
    # Legacy settings: the TTLs live on the behaviour itself.
    return ("legacy ForwardedValues", behaviour.get("MinTTL", 0),
            behaviour.get("DefaultTTL", 86400), behaviour.get("MaxTTL", 31536000))


def measure(distribution: str, region: str, prefix: str) -> int:
    doc = aws("cloudfront", "get-distribution-config", "--id", distribution, "--region", region)
    config = doc["DistributionConfig"]
    where, behaviour = matching_behaviour(config, prefix)
    policy, tmin, tdef, tmax = ttls(behaviour, region)

    # A cache policy applies the origin's Cache-Control clamped to MinTTL..MaxTTL. The origin is
    # only IGNORED when the clamp leaves no room (MinTTL == MaxTTL), which is the console's
    # "customize, all three equal" pattern.
    honoured = tmin < tmax
    edge = min(max(300, tmin), tmax) if honoured else tmin
    headerless = tdef if honoured else tmin
    problems = []
    if not honoured:
        problems.append(f"origin Cache-Control is ignored (MinTTL == MaxTTL == {tmin} s)")
    if tmin > 60:
        problems.append(f"MinTTL {tmin} s pins index.json past the 60 s it promises")
    if headerless > 60:
        problems.append(f"an object under {prefix.rstrip('*')} WITHOUT Cache-Control would be held "
                        f"{headerless} s")

    if where == "default":
        print(f"==> CloudFront {distribution}: /{prefix} is served by the DEFAULT behaviour "
              f"(no {prefix} behaviour exists)")
    else:
        print(f"==> CloudFront {distribution}: a `{where}` behaviour exists")
    print(f"    cache policy    {policy}")
    print(f"    MinTTL {tmin} s   DefaultTTL {tdef} s   MaxTTL {tmax} s")
    print(f"    origin headers  {'honoured' if honoured else 'IGNORED'} "
          f"(a cache policy applies origin Cache-Control within MinTTL..MaxTTL)")
    print(f"    index.json (s-maxage=300) is held {edge} s at the edge; "
          f"a header-less object {headerless} s")

    if not problems:
        print("    verdict: nothing to change")
        return 0

    print("    verdict: add a `%s` behaviour with a policy honouring origin headers "
          "(min 0, default 60, max 600), because:" % prefix)
    for p in problems:
        print(f"      - {p}")
    origin = behaviour["TargetOriginId"]
    policy_json = json.dumps(NEW_POLICY, separators=(",", ":"))
    print(f"""
    EMIT ONLY. Nothing below is run by any script in this repository; it changes the
    distribution and is the owner's command. In order:

      # 1. a cache policy that honours origin Cache-Control and never holds data/v1/ past 600 s
      aws cloudfront create-cache-policy --region {region} \\
        --cache-policy-config '{policy_json}' \\
        --query 'CachePolicy.Id' --output text
      # 2. the current config (its ETag is the --if-match below)
      aws cloudfront get-distribution-config --id {distribution} --region {region} \\
        --output json > dist/{distribution}.json
      # 3. the same config plus a `{prefix}` behaviour on origin `{origin}`, using the Id from step 1
      python3 scripts/_cf_data_behaviour.py --render-config <CachePolicyId> --prefix '{prefix}' \\
        < dist/{distribution}.json > dist/{distribution}.new.json
      # 4. apply. Takes a few minutes to reach every edge.
      aws cloudfront update-distribution --id {distribution} --region {region} \\
        --if-match "$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["ETag"])' dist/{distribution}.json)" \\
        --distribution-config file://dist/{distribution}.new.json
""".rstrip())
    return 0


def render_config(policy_id: str, prefix: str) -> int:
    doc = json.load(sys.stdin)
    config = doc["DistributionConfig"] if "DistributionConfig" in doc else doc
    default = config["DefaultCacheBehavior"]
    behaviour = {"PathPattern": prefix}
    behaviour.update({k: default[k] for k in CARRIED if k in default})
    behaviour["CachePolicyId"] = policy_id

    items = list((config.get("CacheBehaviors") or {}).get("Items") or [])
    replaced = False
    for i, item in enumerate(items):
        if item.get("PathPattern", "").lstrip("/") == prefix.lstrip("/"):
            items[i] = behaviour
            replaced = True
    if not replaced:
        # First: CloudFront evaluates behaviours in order and a broader pattern before this one
        # would shadow it.
        items.insert(0, behaviour)
    config["CacheBehaviors"] = {"Quantity": len(items), "Items": items}
    json.dump(config, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--distribution", help="measure this distribution (read-only)")
    ap.add_argument("--region", default="eu-north-1")
    ap.add_argument("--prefix", default="data/v1/*", help="the path pattern the harvester owns")
    ap.add_argument("--render-config", metavar="CACHE_POLICY_ID",
                    help="transform get-distribution-config JSON on stdin; no AWS")
    args = ap.parse_args(argv)
    if bool(args.distribution) == bool(args.render_config):
        ap.error("exactly one of --distribution or --render-config")
    if args.render_config:
        return render_config(args.render_config, args.prefix)
    return measure(args.distribution, args.region, args.prefix)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
