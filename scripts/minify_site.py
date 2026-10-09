#!/usr/bin/env python3
"""Strip comments and indentation from the app's JavaScript and CSS, into a folder that is deployed.

    python3 scripts/minify_site.py --out "$BUILT/min"            # js/, css/ and vendor/ only (scripts/deploy.sh)
    python3 scripts/minify_site.py --out /tmp/served --tree      # a whole served tree: js/, css/ and
                                                                 # vendor/ stripped, everything else linked
                                                                 # (screens.yml measures this one)
    python3 scripts/minify_site.py --out /tmp/x --node node      # and `node --check` every output
    python3 scripts/minify_site.py --out /tmp/x --esbuild auto   # then a real minifier over the modules,
                                                                 # with a source map beside each (see below)

WHY (internal #405, 2026-10-06). The source is the project's documentation: every module says why
it is the way it is, at length, and that is not negotiable. But there is no build step, so every
visitor downloaded the documentation too -- MEASURED that day, 47 % of the bytes of the app's own
JavaScript on a first visit were comments and indentation (930 kB of 1 978 kB). This is the smallest build step that
stops that: nothing is renamed, reordered or joined, the output is the same statements on the same
lines, and it is never committed. The repository, the tests and a local server all still run the
source as written.

WHAT IT REMOVES, AND NOTHING ELSE
  - `// ...` and `/* ... */` comments in code (a comment with a licence, a copyright or `/*!` stays);
  - the spaces and tabs at the start and the end of a line of code;
  - lines that are then empty.
A string, a regular expression and a template literal are copied byte for byte -- a shader inside a
template literal keeps its own comments and its indentation. No two lines are ever joined, so
automatic semicolon insertion sees exactly the line breaks it saw before.

WHY IT IS SAFE, IN ORDER OF HOW MUCH EACH IS WORTH
  1. IN DOUBT, IT SHIPS THE SOURCE. The one hard question in reading JavaScript without a parser
     is whether a `/` starts a regular expression or divides. The scanner decides from the token
     before it, and then CHECKS ITSELF two ways: the output, scanned again, must hold the same
     code tokens as the input; and every line it shortened must be the original line minus its
     ends. A file that fails either, or that the scanner cannot read to the end, is copied
     unchanged and named on stderr. A file copied unchanged is a few kilobytes; a file stripped
     wrongly is a broken site.
  2. `--node`: every output file is given to `node --check`. scripts/deploy.sh passes it (it needs
     node already, for the object pages) and refuses to deploy when a file fails.
  3. tests/test_minify.mjs holds the scanner to the cases that break naive ones (a URL in a string,
     `//` inside a regular expression and a template, a regular expression after `)`, nested
     templates, a licence header) and runs the whole of site/js and site/css through it.
  4. When it was written, every file's output was parsed beside its source with a real parser
     (acorn) and the two syntax trees were identical for all of them. That is evidence about the
     scanner on the day, not a gate: there is no parser in this repository, by choice.

THE SECOND PASS: A REAL MINIFIER, `--esbuild` (internal #515, 2026-10-09). The stripper leaves
every name and every space inside a line: MEASURED that day on the modules a first visit loads,
1 207 369 B, of which a minifier takes another 27 %. `--esbuild auto` (the pinned binary of
scripts/get_esbuild.py) or `--esbuild /path/to/esbuild` runs esbuild over the ES modules of js/
and vendor/, one file in and one file out:
  - `--minify` and nothing else: no bundling, no property renaming (a name read as `ctx['x']`,
    a probe's `window.spaceRadar`, a message a worker posts all keep their spelling), exports keep
    their names, import paths are not touched, `--target=es2020` so it writes no syntax newer than
    the source uses;
  - it reads the file AS WRITTEN and writes `<file>.js.map` with the source inside, so the live
    site debugs as the repository reads;
  - the comments the stripper keeps (a licence, a copyright) are put back at the top of the file,
    and the map is shifted by exactly those lines;
  - NOT the stylesheets (600 B on the wire to gain, and a minifier rewrites colours), NOT files
    named `*.min.js` (three.js is minified by its authors), NOT a script that is not a module
    (vendor/basis/basis_transcoder.js is fetched as text and run in a worker), and NOT a file the
    scanner above refused: those stay exactly as the first pass left them.
What holds it: `node --check` (--node), and scripts/check_built_tree.mjs, which the deploy and CI run:
every import of the built tree resolves to the file the source imports, every module node can load
exports the same names from both trees, a set of the node tests passes against the built tree,
and the boot graph is inside its byte budget. The first pass alone is still one flag away
(`deploy.sh --strip-only`), and the source as written two (`--no-minify`).

No dependencies: the standard library; node only for --node; the esbuild binary only for --esbuild.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# The folders this writes. vendor/ joined js/ and css/ on 2026-10-07 (internal #415): astronomy.js is
# shipped by its author with its documentation, 412 kB of which 235 kB are comments, and it was the
# third largest request of a first visit. Its licence header, and every other library's, stays (KEEP).
STRIPPED = ("js", "css", "vendor")

# A comment that must travel with the code: somebody else's terms.
KEEP = re.compile(r"licen[cs]e|copyright|@preserve|SPDX|\(c\)", re.I)

# After one of these words a `/` starts a regular expression; after any other word it divides.
REGEX_AFTER_WORD = frozenset(
    "return typeof instanceof in of new delete void throw case do else yield await".split()
)

WORD = re.compile(r"[A-Za-z_$][\w$]*")
NUMBER = re.compile(r"(?:0[xXbBoO][\da-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?)")
SPACES = re.compile(r"[ \t\r\f\v]+")


class Unreadable(Exception):
    """The scanner will not vouch for this file: ship it as written."""


def _string_end(text: str, i: int) -> int:
    """`i` is at a quote; the index just past its closing quote."""
    quote = text[i]
    j = i + 1
    n = len(text)
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == quote:
            return j + 1
        if c == "\n":
            raise Unreadable(f"a string opened at offset {i} runs past the end of its line")
        j += 1
    raise Unreadable(f"a string opened at offset {i} never closes")


def _regex_end(text: str, i: int) -> int:
    """`i` is at the `/` that opens a regular expression; the index just past its flags."""
    j = i + 1
    n = len(text)
    in_class = False
    while j < n:
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == "\n":
            raise Unreadable(f"a regular expression opened at offset {i} runs past the end of its line")
        if in_class:
            if c == "]":
                in_class = False
        elif c == "[":
            in_class = True
        elif c == "/":
            j += 1
            while j < n and (text[j].isalnum() or text[j] in "_$"):
                j += 1
            return j
        j += 1
    raise Unreadable(f"a regular expression opened at offset {i} never closes")


def scan_js(text: str):
    """Yield (kind, start, end) for every piece of a JavaScript file, in order, covering all of it.

    kind: 'ws' spaces and tabs in code, 'nl' a line break in code, 'line' a // comment (without its
    line break), 'block' a /* */ comment, 'str' a quoted string, 'regex' a regular expression,
    'tpl' a run of template-literal text with its delimiters (verbatim, line breaks and all),
    'word', 'num', 'punct' (one character, or `++`/`--`).
    """
    i = 0
    n = len(text)
    # What a `/` means next: True when the token before it ends a value.
    value_before = False
    # One entry per open template literal: the depth of `{` inside its current `${ ... }`.
    templates: list[int] = []

    def template_text(start: int) -> int:
        """From just inside a template (after ` or after a closing }), to just past ` or `${`."""
        j = start
        while j < n:
            c = text[j]
            if c == "\\":
                j += 2
                continue
            if c == "`":
                return j + 1
            if c == "$" and j + 1 < n and text[j + 1] == "{":
                return j + 2
            j += 1
        raise Unreadable(f"a template literal open at offset {start} never closes")

    while i < n:
        c = text[i]
        if c == "\n":
            yield ("nl", i, i + 1)
            i += 1
            continue
        m = SPACES.match(text, i)
        if m:
            yield ("ws", i, m.end())
            i = m.end()
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            j = text.find("\n", i)
            j = n if j < 0 else j
            yield ("line", i, j)
            i = j
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            if j < 0:
                raise Unreadable(f"a block comment opened at offset {i} never closes")
            yield ("block", i, j + 2)
            i = j + 2
            continue
        if c in "'\"":
            j = _string_end(text, i)
            yield ("str", i, j)
            i = j
            value_before = True
            continue
        if c == "`":
            j = template_text(i + 1)
            yield ("tpl", i, j)
            if text[j - 1] == "`":
                value_before = True
            else:
                templates.append(0)
                value_before = False
            i = j
            continue
        if c == "/":
            if value_before:
                yield ("punct", i, i + 1)
                i += 1
                value_before = False
            else:
                j = _regex_end(text, i)
                yield ("regex", i, j)
                i = j
                value_before = True
            continue
        m = WORD.match(text, i)
        if m:
            yield ("word", i, m.end())
            value_before = m.group(0) not in REGEX_AFTER_WORD
            i = m.end()
            continue
        if c.isdigit() or (c == "." and i + 1 < n and text[i + 1].isdigit()):
            m = NUMBER.match(text, i)
            if not m or m.end() == i:
                raise Unreadable(f"a number at offset {i} could not be read")
            yield ("num", i, m.end())
            value_before = True
            i = m.end()
            continue
        if c == "{" and templates:
            templates[-1] += 1
        elif c == "}" and templates:
            if templates[-1] == 0:
                # The end of a `${ ... }`: template text again, to the next ` or `${`.
                j = template_text(i + 1)
                yield ("tpl", i, j)
                if text[j - 1] == "`":
                    templates.pop()
                    value_before = True
                else:
                    value_before = False
                i = j
                continue
            templates[-1] -= 1
        if c in "+-" and i + 1 < n and text[i + 1] == c:
            yield ("punct", i, i + 2)
            i += 2
            # `x++ / 2` divides; `++` before a value is never followed by `/`.
            value_before = True
            continue
        if ord(c) > 127 and (c.isalpha() or c == "‌" or c == "‍"):
            # An identifier outside ASCII: none today; read it as a word rather than refuse.
            j = i + 1
            while j < n and (text[j].isalnum() or text[j] in "_$"):
                j += 1
            yield ("word", i, j)
            value_before = True
            i = j
            continue
        yield ("punct", i, i + 1)
        value_before = c in ")]}"
        i += 1
    if templates:
        raise Unreadable("a template literal is still open at the end of the file")


def _code_tokens(text: str) -> list[str]:
    """What a file says, without how it is laid out: for comparing a file with its stripped self."""
    return [text[a:b] for kind, a, b in scan_js(text) if kind not in ("ws", "nl", "line", "block")]


def strip_js(text: str) -> str:
    """The file without its comments, its indentation and its empty lines. Raises Unreadable."""
    out: list[str] = []
    line: list[str] = []  # the pieces of the output line being built

    def end_line() -> None:
        # Trailing spaces go; a line with nothing on it is not written.
        while line and line[-1].strip(" \t\r\f\v") == "" and "\n" not in line[-1]:
            line.pop()
        if line:
            out.append("".join(line))
            out.append("\n")
            line.clear()

    after_gap = False  # a comment has just left the line, with a space before it
    for kind, a, b in scan_js(text):
        piece = text[a:b]
        gap, after_gap = after_gap, False
        if kind == "nl":
            end_line()
        elif kind == "ws":
            if line and not gap:  # not at the start of a line, nor a second space where a comment was
                line.append(piece)
        elif kind == "line":
            if KEEP.search(piece):
                line.append(piece)
        elif kind == "block":
            if piece.startswith("/*!") or KEEP.search(piece):
                line.append(piece)
            elif "\n" in piece:
                # A comment across lines is a line break to the language: keep one.
                end_line()
            elif line:
                if line[-1][-1:] not in (" ", "\t"):
                    line.append(" ")
                after_gap = True
        else:
            line.append(piece)
    end_line()
    result = "".join(out)

    # THE TWO CHECKS (the docstring's point 1). Same code tokens, scanned again from the output...
    if _code_tokens(result) != _code_tokens(text):
        raise Unreadable("the stripped file does not hold the same code as the source")
    # ...and every output line is a source line with only its ends removed, in the same order.
    # (A line inside a template literal is the source line itself.) This does not use the scanner's
    # idea of what a comment is: a line cut anywhere but at a `//` or a `/*` fails it.
    source_lines = text.split("\n")
    at = 0
    for got in result.split("\n"):
        if got == "":
            continue
        probe = got.strip()
        while at < len(source_lines):
            src = source_lines[at]
            at += 1
            if src == got:
                break
            s = src.strip()
            if s.startswith(probe):
                rest = s[len(probe):].lstrip()
                if rest == "" or rest.startswith("//") or rest.startswith("/*"):
                    break
            # A line that lost a block comment from its middle or its start: compare without them.
            if "/*" in src and re.sub(r"\s+", " ", re.sub(r"/\*.*?\*/", " ", s)).strip().startswith(re.sub(r"\s+", " ", probe)):
                break
        else:
            raise Unreadable(f"an output line is not a source line with its ends removed: {got[:80]!r}")
    return result


CSS_PIECE = re.compile(r"""/\*.*?\*/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|url\(\s*[^'")\s][^)]*\)""", re.S)


def strip_css(text: str) -> str:
    """The stylesheet without its comments, its indentation and its empty lines."""
    def piece(m: re.Match) -> str:
        s = m.group(0)
        if not s.startswith("/*"):
            return s  # a string or an unquoted url(): byte for byte
        if s.startswith("/*!") or KEEP.search(s):
            return s
        return "\n" if "\n" in s else " "

    without = CSS_PIECE.sub(piece, text)
    if "/*" in CSS_PIECE.sub(lambda m: "" if m.group(0).startswith("/*") else "x", text):
        raise Unreadable("a comment in the stylesheet never closes")
    lines = [ln.strip() for ln in without.split("\n")]
    return "\n".join(ln for ln in lines if ln) + "\n"


MODULE = re.compile(r"^\s*(?:import\b|export\b)", re.M)
MAP_COMMENT = re.compile(r"\n?//# sourceMappingURL=[^\n]*\n?$")


def kept_comments(stripped: str) -> list[str]:
    """The comments the first pass kept: somebody's terms, which the second pass must not lose."""
    seen: list[str] = []
    for kind, a, b in scan_js(stripped):
        if kind in ("line", "block") and stripped[a:b] not in seen:
            seen.append(stripped[a:b])
    return seen


def minify_modules(site: Path, out: Path, esbuild: str, stripped: dict[str, str]) -> tuple[int, int]:
    """Run esbuild over the ES modules among `stripped` ({site-relative path: first-pass text}).

    Rewrites out/<path> and writes out/<path>.map. Returns (files, bytes written). Raises SystemExit
    when esbuild refuses: a deploy stops, it does not ship half of each pass.
    """
    import json

    todo = sorted(rel for rel, text in stripped.items() if not rel.endswith(".min.js") and MODULE.search(text))
    if not todo:
        return 0, 0
    total = 0
    with tempfile.TemporaryDirectory() as tmp:
        # One process for all of them; the paths go in a file because there are hundreds.
        done = subprocess.run(
            [esbuild, *todo, f"--outdir={tmp}", "--outbase=.", "--minify", "--format=esm", "--target=es2020",
             "--sourcemap=linked", "--sources-content=true", "--legal-comments=none", "--charset=utf8",
             "--log-level=warning"],
            cwd=site, capture_output=True, text=True)
        if done.returncode != 0 or done.stderr.strip():
            # A warning is a refusal too: esbuild warns about code that means something else than
            # it says (a duplicate case, an assignment to a constant), and that is not for a deploy
            # to wave through.
            raise SystemExit(f"minify_site: esbuild refused or warned; nothing is trusted from this pass:\n{done.stderr.strip()[:2000]}")
        for rel in todo:
            built = Path(tmp) / rel
            code = MAP_COMMENT.sub("", built.read_text(encoding="utf-8"))
            smap = json.loads((Path(tmp) / (rel + ".map")).read_text(encoding="utf-8"))
            banner = "".join(c + "\n" for c in kept_comments(stripped[rel]))
            # A line added above the code is one `;` before the mappings: the map still points true.
            smap["mappings"] = ";" * banner.count("\n") + smap["mappings"]
            # Not this machine's folders: the same map from any checkout.
            smap["sources"] = [f"source:///{rel}"]
            smap["file"] = Path(rel).name
            target = out / rel
            text = f"{banner}{code}\n//# sourceMappingURL={Path(rel).name}.map\n"
            target.write_text(text, encoding="utf-8")
            (out / (rel + ".map")).write_text(json.dumps(smap, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
            stat = (site / rel).stat()
            os.utime(target, (stat.st_atime, stat.st_mtime))
            os.utime(out / (rel + ".map"), (stat.st_atime, stat.st_mtime))
            total += len(text.encode("utf-8"))
    return len(todo), total


def build(site: Path, out: Path, tree: bool = False, node: str | None = None, quiet: bool = False,
          esbuild: str | None = None) -> int:
    """Write the stripped js/, css/ and vendor/ under `out`. Returns 0, or 1 when --node refuses a file."""
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f"minify_site: {out} is not empty; give it a new folder")
    out.mkdir(parents=True, exist_ok=True)
    before = after = 0
    kept: list[tuple[str, str]] = []
    written: list[Path] = []
    first_pass: dict[str, str] = {}
    for sub, suffix, strip in (("js", ".js", strip_js), ("css", ".css", strip_css), ("vendor", ".js", strip_js)):
        for path in sorted((site / sub).rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(site)
            target = out / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix != suffix:
                # The module contract (README.md) and anything else beside the code: as it is.
                shutil.copy2(path, target)
                continue
            text = path.read_text(encoding="utf-8")
            try:
                small = strip(text)
            except Unreadable as why:
                kept.append((rel.as_posix(), str(why)))
                small = text
            target.write_text(small, encoding="utf-8")
            # The source's own time, so `aws s3 sync` uploads what changed and not all of it.
            stat = path.stat()
            os.utime(target, (stat.st_atime, stat.st_mtime))
            before += len(text.encode("utf-8"))
            after += len(small.encode("utf-8"))
            if suffix == ".js":
                written.append(target)
                if small is not text:  # a file the scanner refused is not given to the second pass
                    first_pass[rel.as_posix()] = small
    second = ""
    if esbuild:
        if esbuild == "auto":
            sys.path.insert(0, str(Path(__file__).resolve().parent))
            import get_esbuild
            try:
                esbuild = str(get_esbuild.ensure())
            except get_esbuild.Refused as why:
                raise SystemExit(f"minify_site: {why}")
        was = sum(len(t.encode("utf-8")) for rel, t in first_pass.items() if not rel.endswith(".min.js") and MODULE.search(t))
        count, now = minify_modules(site, out, esbuild, first_pass)
        after += now - was
        second = f"; esbuild minified {count} modules, {was} B -> {now} B, a source map beside each"
    if tree:
        # Everything else the bucket serves, as links: the textures and models are hundreds of
        # megabytes and are not changed by this.
        for entry in sorted(site.iterdir()):
            if entry.name in STRIPPED or entry.name.startswith("."):
                continue
            os.symlink(entry.resolve(), out / entry.name)
    for rel, why in kept:
        print(f"minify_site: {rel} is shipped as written ({why})", file=sys.stderr)
    failed = 0
    if node:
        # As a module, whatever this node's default is for a .js file: a copy named .mjs is checked.
        with tempfile.TemporaryDirectory() as tmp:
            probe = Path(tmp) / "module.mjs"
            for target in written:
                shutil.copyfile(target, probe)
                done = subprocess.run([node, "--check", str(probe)], capture_output=True, text=True)
                if done.returncode != 0:
                    failed += 1
                    print(f"minify_site: node refuses {target.relative_to(out)}:\n{done.stderr.strip()[:600]}", file=sys.stderr)
    if not quiet:
        pct = 100 * (before - after) / before if before else 0
        print(f"minify_site: {before} B -> {after} B ({pct:.0f} % less) in {out}"
              + (f"; {len(kept)} file(s) shipped as written" if kept else "")
              + second
              + (f"; node checked {len(written)} modules" if node else ""))
    return 1 if failed else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--site", type=Path, default=ROOT / "site", help="the source folder (default: site/)")
    ap.add_argument("--out", type=Path, required=True, help="an empty or new folder to write js/ and css/ into")
    ap.add_argument("--tree", action="store_true", help="also link everything else in site/ into --out, so it can be served whole")
    ap.add_argument("--node", help="a node binary: `node --check` every stripped module, exit 1 if one fails")
    ap.add_argument("--esbuild", help="`auto` (the pinned binary of scripts/get_esbuild.py) or a path: minify the ES modules after stripping them, with source maps")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()
    return build(args.site, args.out, tree=args.tree, node=args.node, quiet=args.quiet, esbuild=args.esbuild)


if __name__ == "__main__":
    sys.exit(main())
