"""Load the generated mirror of registry/sources.yaml and give each row a typed shape.

The runtime reads `harvest/sources.json`, never the YAML: PyYAML is a package-time dependency
(`scripts/gen_sources_json.py`), and CI refuses a stale mirror the same way it refuses a stale
rockets.js. A row's `list:` and `query:` files are already inlined by the generator, so a packaged
zip is self-contained.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

MIRROR = Path(__file__).resolve().parent / "sources.json"

# `15m`, `3h`, `24h`, `168h`, `7d`. The same suffixes scripts/check_registry.py accepts.
DURATION_UNITS = {"m": 60, "h": 3600, "d": 86400}


class RegistryError(ValueError):
    """The mirror is missing, malformed, or a row says something the runtime cannot act on."""


def parse_duration(value: str) -> int:
    """`'15m'` -> 900, `'3h'` -> 10800, `'168h'` -> 604800. Refuses anything else, loudly."""
    if not isinstance(value, str) or len(value) < 2:
        raise RegistryError(f"duration {value!r} must look like 15m, 3h or 168h")
    unit, digits = value[-1], value[:-1]
    if unit not in DURATION_UNITS or not digits.isdigit():
        raise RegistryError(f"duration {value!r} must look like 15m, 3h or 168h")
    return int(digits) * DURATION_UNITS[unit]


@dataclass(frozen=True)
class Source:
    id: str
    url: str
    auth: str
    refresh: str
    freshness_max: str
    parser: str
    outputs: tuple[str, ...]
    enabled: bool = True
    list: dict | None = None
    query: str | None = None
    extra: dict = field(default_factory=dict, compare=False)

    @property
    def refresh_seconds(self) -> int:
        return parse_duration(self.refresh)

    @property
    def secret(self) -> str | None:
        """`auth: secret:NAME` -> `'NAME'`; `auth: none` -> None."""
        if isinstance(self.auth, str) and self.auth.startswith("secret:"):
            name = self.auth[len("secret:"):].strip()
            if not name:
                raise RegistryError(f"{self.id}: `auth: secret:` names no secret")
            return name
        return None


def load(path: Path | str | None = None) -> list[Source]:
    """Every source row, in registry order. Raises RegistryError rather than guessing."""
    p = Path(path) if path else MIRROR
    if not p.exists():
        raise RegistryError(
            f"{p} is missing. Run: python3 scripts/gen_sources_json.py (it mirrors "
            f"registry/sources.yaml; the runtime parses no YAML)"
        )
    doc = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(doc, dict) or doc.get("schema") != 1:
        raise RegistryError(f"{p}: expected an object with schema: 1")
    rows = doc.get("sources")
    if not isinstance(rows, list):
        raise RegistryError(f"{p}: `sources` must be a list")
    out: list[Source] = []
    seen: set[str] = set()
    for row in rows:
        src = _source_of(row, p)
        if src.id in seen:
            raise RegistryError(f"{p}: duplicate source id {src.id!r}")
        seen.add(src.id)
        out.append(src)
    return out


def by_id(sources: list[Source]) -> dict[str, Source]:
    return {s.id: s for s in sources}


_KNOWN = {"id", "url", "auth", "refresh", "freshness_max", "parser", "outputs", "enabled", "list", "query"}


def _source_of(row: dict, where: Path) -> Source:
    if not isinstance(row, dict) or not row.get("id"):
        raise RegistryError(f"{where}: a row has no id")
    sid = str(row["id"])
    for key in ("url", "parser", "refresh", "freshness_max"):
        if not row.get(key):
            raise RegistryError(f"{where}[{sid}]: no `{key}`")
    parse_duration(row["refresh"])
    parse_duration(row["freshness_max"])
    auth = row.get("auth", "none")
    if auth != "none" and not str(auth).startswith("secret:"):
        raise RegistryError(f"{where}[{sid}]: auth {auth!r} must be `none` or `secret:NAME`")
    outputs = row.get("outputs") or []
    lst = row.get("list")
    if lst is not None and (not isinstance(lst, dict) or not isinstance(lst.get("ids"), list)):
        raise RegistryError(f"{where}[{sid}]: `list` must be an object with an `ids` list")
    return Source(
        id=sid,
        url=str(row["url"]),
        auth=str(auth),
        refresh=str(row["refresh"]),
        freshness_max=str(row["freshness_max"]),
        parser=str(row["parser"]),
        outputs=tuple(str(o) for o in outputs),
        enabled=row.get("enabled", True) is not False,
        list=lst,
        query=row.get("query"),
        extra={k: v for k, v in row.items() if k not in _KNOWN},
    )
