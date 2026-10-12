#!/usr/bin/env python3
"""Strip comments and indentation from the shader text inside JavaScript template literals.

    python3 scripts/strip_shaders.py                  # dry run over site/js: what it would save, file by file
    python3 scripts/strip_shaders.py --check          # the same, exit 1 if any shader would change meaning
    python3 scripts/minify_site.py --out X --shaders  # the real thing (OFF by default; or SR_STRIP_SHADERS=1)

WHY (internal #553 / #531, 2026-10-10). scripts/minify_site.py copies a template literal byte for byte,
because inside a template a `//` may be a URL and a space may be part of the text. A shader is the
one kind of template whose text is known: GLSL, in which `//` and `/* */` are always comments and
indentation never matters. The shaders of this app are documented at length (the source is the
documentation) and every visitor downloaded that documentation. This module is the step that stops it,
and ONLY for a template that is a shader.

OFF BY DEFAULT. A deploy builds exactly what it built before until the lead switches this on
(`--shaders` on minify_site.py, or `SR_STRIP_SHADERS=1` in the environment of scripts/deploy.sh,
scripts/verify-deploy.sh and the screens workflow, which all call minify_site.py). Switching it on
changes what every deploy builds and every shader the visitor compiles, so it wants the `screens`
drawn-world check on the stripped tree once (tools/cdp.mjs reports any shader that fails to compile).

THE RULES, each one a way to do nothing instead of something wrong:
  - A template is a shader when the whole of it (all its `${}` pieces) contains `gl_` or `void main`.
    Anything else is not touched.
  - A template with a backslash anywhere is not touched (a line continuation, an escape).
  - A line that holds a `${` (the part before it, the part after it) is not touched: it is half of
    a line whose other half is in another piece.
  - What goes: `//` comments (whole-line and trailing), `/* */` comments, the spaces at the start
    and the end of a line, and lines left empty. Nothing is joined, so a `#define`, `#if` or
    `#version` line stays a line of its own. A block comment left open at the end of a piece means the
    template is not touched.
  - THE CHECK, per template: the old and the new text, with comments removed and every line trimmed
    and empty ones dropped, must be equal. A template that fails stays as written.
  - `keep_lines=True` (what the esbuild pass uses) blanks a removed line instead of deleting it, so a
    source map keeps its line numbers.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from minify_site import ROOT, Unreadable, scan_js  # noqa: E402

BLOCK = re.compile(r"/\*.*?\*/")
IS_SHADER = re.compile(r"\bgl_|void\s+main\b")


def _strip_lines(lines: list[str], skip_first: bool, skip_last: bool, keep_lines: bool) -> list[str] | None:
    """The lines of one template piece without comments and indentation, or None to leave it alone."""
    out: list[str] = []
    in_block = False
    last = len(lines) - 1
    for k, line in enumerate(lines):
        if (k == 0 and skip_first) or (k == last and skip_last):
            if in_block:
                return None
            out.append(line)
            continue
        text = line
        if in_block:
            end = text.find("*/")
            if end < 0:
                if keep_lines:
                    out.append("")
                continue
            text = text[end + 2:]
            in_block = False
        text = BLOCK.sub(" ", text)
        start = text.find("/*")
        if start >= 0:
            text = text[:start]
            in_block = True
        cut = text.find("//")
        if cut >= 0:
            text = text[:cut]
        text = text.strip(" \t\r")
        if text or keep_lines:
            out.append(text)
    if in_block:
        return None
    return out


def glsl_meaning(text: str) -> list[str]:
    """What a piece of GLSL says, apart from its layout: for the check. Comments out, lines trimmed, empty ones dropped."""
    text = re.sub(r"/\*.*?\*/", " ", text, flags=re.S)
    lines = []
    for line in text.split("\n"):
        cut = line.find("//")
        if cut >= 0:
            line = line[:cut]
        line = line.strip(" \t\r")
        if line:
            lines.append(line)
    return lines


def strip_shader_templates(text: str, keep_lines: bool = False) -> tuple[str, dict]:
    """`text` (JavaScript) with the shaders' comments and indentation removed; and what was done.

    Raises Unreadable when the file cannot be scanned. Returns (new text, stats) with stats keys
    templates (shaders found), changed, refused (list of reasons), before and after (bytes of shader text).
    """
    tokens = list(scan_js(text))
    # Group the template pieces: a "`" opens a group, a "}" continues the innermost open one.
    groups: list[list[int]] = []  # token indexes
    stack: list[int] = []
    for idx, (kind, a, b) in enumerate(tokens):
        if kind != "tpl":
            continue
        opens = text[a] == "`"
        if opens:
            groups.append([])
            stack.append(len(groups) - 1)
        groups[stack[-1]].append(idx)
        if text[b - 1] == "`":
            stack.pop()
    stats = {"templates": 0, "changed": 0, "refused": [], "before": 0, "after": 0}
    replace: dict[int, str] = {}
    for g in groups:
        pieces = [text[tokens[i][1]:tokens[i][2]] for i in g]
        whole = "".join(pieces)
        if not IS_SHADER.search(whole):
            continue
        stats["templates"] += 1
        if "\\" in whole:
            stats["refused"].append("a backslash")
            continue
        new_pieces: list[str] = []
        ok = True
        for n, piece in enumerate(pieces):
            opens = piece[0] == "`"
            closes = piece[-1] == "`"
            head = "`" if opens else "}"
            tail = "`" if closes else "${"
            body = piece[1:-1] if closes else piece[1:-2]
            lines = _strip_lines(body.split("\n"), skip_first=not opens, skip_last=not closes, keep_lines=keep_lines)
            if lines is None:
                ok = False
                stats["refused"].append("a block comment left open")
                break
            if closes and body.endswith("\n") and lines and lines[-1] != "":
                lines.append("")  # the last line keeps its line break before the closing backtick
            new_pieces.append(head + "\n".join(lines) + tail)
        if not ok:
            continue
        old_meaning = glsl_meaning("\0".join(p[1:-1] if p[-1] == "`" else p[1:-2] for p in pieces))
        new_meaning = glsl_meaning("\0".join(p[1:-1] if p[-1] == "`" else p[1:-2] for p in new_pieces))
        if old_meaning != new_meaning:
            stats["refused"].append("the check: the shader says something else")
            continue
        for i, new in zip(g, new_pieces):
            replace[i] = new
        stats["before"] += len(whole.encode("utf-8"))
        stats["after"] += len("".join(new_pieces).encode("utf-8"))
        stats["changed"] += 1
    if not replace:
        return text, stats
    out: list[str] = []
    for idx, (kind, a, b) in enumerate(tokens):
        out.append(replace.get(idx, text[a:b]))
    result = "".join(out)
    # The code outside the templates is the same code: compared token by token, not trusted.
    old_code = [text[a:b] for kind, a, b in scan_js(text) if kind not in ("tpl",)]
    new_code = [result[a:b] for kind, a, b in scan_js(result) if kind not in ("tpl",)]
    if old_code != new_code:
        raise Unreadable("the code outside the shaders changed")
    return result, stats


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--site", type=Path, default=ROOT / "site")
    ap.add_argument("--check", action="store_true", help="exit 1 when a file cannot be read or a shader fails its check")
    ap.add_argument("--keep-lines", action="store_true", help="blank removed lines instead of deleting them")
    args = ap.parse_args()
    total_before = total_after = shaders = 0
    rows = []
    bad = 0
    for path in sorted((args.site / "js").rglob("*.js")):
        text = path.read_text(encoding="utf-8")
        if not IS_SHADER.search(text):
            continue
        try:
            new, st = strip_shader_templates(text, keep_lines=args.keep_lines)
        except Unreadable as why:
            print(f"{path.relative_to(args.site)}: unreadable ({why})")
            bad += 1
            continue
        shaders += st["templates"]
        total_before += st["before"]
        total_after += st["after"]
        rows.append((st["before"] - st["after"], path.relative_to(args.site).as_posix(), st))
    for saved, rel, st in sorted(rows, reverse=True):
        if saved or st["refused"]:
            print(f"{rel}: {st['changed']}/{st['templates']} shaders, -{saved} B" + (f", left as written: {', '.join(st['refused'])}" if st["refused"] else ""))
    print(f"strip_shaders: {shaders} shader templates; {total_before} B -> {total_after} B ({total_before - total_after} B less, "
          f"{100 * (total_before - total_after) / max(total_before, 1):.0f} % of shader text), in the source as written (before the stripper's own pass)")
    return 1 if (args.check and bad) else 0


if __name__ == "__main__":
    sys.exit(main())
