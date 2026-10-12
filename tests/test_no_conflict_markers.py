#!/usr/bin/env python3
"""No merge conflict markers in the tree, and every tool script parses (internal #472, after public #507).

On 2026-10-08 a rebase stopped on a conflict in tools/cdp.mjs and the merge went ahead with the markers
still in the file: no probe could start until #509 removed them. Two checks, both cheap:
  1. no tracked text file has a `<<<<<<< ` line and a `>>>>>>> ` line (a marker pair; a lone `=======`
     is a Markdown underline and is not looked at);
  2. every workflow under .github/workflows/ is valid YAML (a step name with a colon in it is not, and
     GitHub then reports a workflow that never ran, not a red check);
  3. `node --check` parses every tools/*.mjs, scripts/*.mjs and tests/*.mjs (a file with markers or a
     half-applied merge does not).
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split("\n")
TEXT = {".js", ".mjs", ".py", ".yaml", ".yml", ".md", ".html", ".css", ".json", ".sh", ".txt", ".csv"}
bad = []
for rel in files:
    p = ROOT / rel
    if not rel or p.suffix not in TEXT or not p.is_file() or p.stat().st_size > 8_000_000:
        continue
    try:
        text = p.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue
    lines = text.split("\n")
    if any(l.startswith("<<<<<<< ") for l in lines) and any(l.startswith(">>>>>>> ") for l in lines):
        bad.append(f"{rel}: has merge conflict markers")
if bad:
    print("\n".join("  ** " + b for b in bad))
    sys.exit(1)
print(f"no conflict markers in {len(files)} tracked files")

try:
    import yaml
    for rel in files:
        if rel.startswith(".github/workflows/") and rel.endswith((".yml", ".yaml")):
            try:
                yaml.safe_load((ROOT / rel).read_text(encoding="utf-8"))
            except yaml.YAMLError as exc:
                bad.append(f"{rel}: not valid YAML: {str(exc).splitlines()[-1][:140]}")
except ImportError:
    print("PyYAML is not installed: the workflows were not parsed")
if bad:
    print("\n".join("  ** " + b for b in bad))
    sys.exit(1)

node = subprocess.run(["which", "node"], capture_output=True, text=True).stdout.strip()
if not node:
    print("node is not on PATH: syntax check skipped")
    sys.exit(0)
mjs = [f for f in files if f.endswith(".mjs") and f.split("/")[0] in ("tools", "scripts", "tests")]
broken = []
for rel in mjs:
    r = subprocess.run([node, "--check", str(ROOT / rel)], capture_output=True, text=True)
    if r.returncode != 0:
        broken.append(f"{rel}: {(r.stderr.strip().splitlines() or ['?'])[-1][:160]}")
if broken:
    print("\n".join("  ** " + b for b in broken))
    sys.exit(1)
print(f"node --check parses {len(mjs)} scripts")
