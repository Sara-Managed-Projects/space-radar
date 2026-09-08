"""Wikidata SPARQL results JSON: `{head:{vars}, results:{bindings:[...]}}`."""

from __future__ import annotations


def validate(body) -> None:
    if not isinstance(body, dict) or not isinstance(body.get("results"), dict):
        raise ValueError("SPARQL results JSON has `head` and `results`")
    if not isinstance(body["results"].get("bindings"), list):
        raise ValueError("SPARQL `results.bindings` is a list")


def count(body) -> int:
    validate(body)
    return len(body["results"]["bindings"])
