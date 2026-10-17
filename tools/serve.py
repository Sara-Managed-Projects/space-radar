"""A THREADED static server for local measurement.

    python3 tools/serve.py site 8190       # the app
    python3 tools/serve.py . 8190          # the repository, for tools/shape-sheet.html

`python3 -m http.server` is single threaded. The app asks for ~87 files at boot, so a headless
Chrome and a leftover one queue behind each other until the driver times out, which reads as "the
page never loads". Logging is off because a boot is several hundred lines of it.
"""
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

USAGE = """python3 tools/serve.py site 8190       # the app
python3 tools/serve.py . 8190          # the repository, for tools/shape-sheet.html"""

if len(sys.argv) != 3 or sys.argv[1] in ("--help", "-h"):
    print(USAGE)
    sys.exit(0 if sys.argv[1:] and sys.argv[1] in ("--help", "-h") else 2)

try:
    port = int(sys.argv[2])
except ValueError:
    print(f"serve.py: port must be a number, got {sys.argv[2]}", file=sys.stderr)
    sys.exit(2)

root = sys.argv[1]
handler = functools.partial(SimpleHTTPRequestHandler, directory=root)
handler.log_message = lambda *a, **k: None
ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
