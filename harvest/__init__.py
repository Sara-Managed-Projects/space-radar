"""The harvester: one scheduled job that reads every upstream so the browser never has to.

Registry-driven. `registry/sources.yaml` is the list of upstreams; `scripts/gen_sources_json.py`
mirrors it into `harvest/sources.json` (the browser mirrors are JS; this one is JSON, for the same
reason: the runtime parses no YAML). The job iterates the mirror, fetches each row that is due,
counts what came back with the row's parser, refuses anything worse than what it already holds,
and writes two kinds of file:

    <prefix>/index.json         the manifest: one entry per source, with timestamps and status
    <prefix>/<source-id>.json   the snapshot: the upstream body, verbatim, with its stamps

Runtime is the Python 3.12 standard library and nothing else. boto3 is imported inside
`lambda_handler.handler` and nowhere else, so `python3 -m harvest --dest DIR` needs no AWS.

Nothing in this package names a source. A source is a row and a parser module.
"""

__version__ = "1.0"
