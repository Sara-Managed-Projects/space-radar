#!/usr/bin/env python3
"""scripts/minify_site.py: what a deploy uploads is the source without its comments, and nothing else.

    python3 tests/test_minify.py

Internal #405. The stripped copy is what visitors run, so the scanner is held to the cases that
break a naive one, and then the whole of site/js and site/css goes through it:

  1. THE HARD CASES, each with the output it must give: `//` in a string, in a regular expression
     and in a template literal; a shader's own comments inside a template; a regular expression
     after `(`, `=`, `return`; a division after `)`, `]`, a name and a number; nested templates;
     a block comment across lines (a line break to the language) and inside a line; a licence kept.
  2. IN DOUBT, THE SOURCE: a file the scanner cannot read to the end raises Unreadable, and build()
     ships it as written.
  3. THE SITE: every module strips without a refusal, holds the same code tokens, is smaller, and
     (when node is installed) passes `node --check`. Shaders keep their lines. The numbers print.
  4. --tree makes a folder that serves whole; stamp_sw.py --overlay hashes the stripped files.
"""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from minify_site import Unreadable, _code_tokens, build, strip_css, strip_js  # noqa: E402

failures: list[str] = []


def check(ok: bool, what: str) -> None:
    if not ok:
        failures.append(what)


def same(source: str, want: str, what: str) -> None:
    try:
        got = strip_js(source)
    except Unreadable as why:
        failures.append(f"{what}: refused ({why})")
        return
    check(got == want, f"{what}:\n   want {want!r}\n   got  {got!r}")


# --- 1. the hard cases ----------------------------------------------------------------------------
same("// a comment\nconst a = 1; // why\n\n\n  const b = 2;\n", "const a = 1;\nconst b = 2;\n",
     "comments, indentation and empty lines go")
same("const u = 'https://example.org/a'; // the address\n", "const u = 'https://example.org/a';\n",
     "`//` inside a string is the string")
same('const u = "/* not a comment */";\n', 'const u = "/* not a comment */";\n',
     "`/*` inside a string is the string")
same("const re = /https?:\\/\\/[^/]+/g; // a pattern\n", "const re = /https?:\\/\\/[^/]+/g;\n",
     "a regular expression with slashes and a class holding `/`")
same("const q = /['\"`]/.test(s) ? 1 : 2; // quotes in a class\n", "const q = /['\"`]/.test(s) ? 1 : 2;\n",
     "quotes inside a regular expression open no string")
same("x = a / b / c; // two divisions\n", "x = a / b / c;\n", "division after a name")
same("x = (a + b) / 2 // half\ny = n[0] / 3; z = 4 / 2;\n", "x = (a + b) / 2\ny = n[0] / 3; z = 4 / 2;\n",
     "division after `)`, `]` and a number")
same("if (/^\\d+$/.test(t)) return /x\\/\\/y/.exec(t); // both are patterns\n",
     "if (/^\\d+$/.test(t)) return /x\\/\\/y/.exec(t);\n", "a regular expression after `(` and after `return`")
same("i++ / 2; // divides\n", "i++ / 2;\n", "division after `++`")
same("const s = `a // not a comment\n    b /* nor this */\n  ${ x /* this is */ + `in // ner ${ y } ` } // nor this\n`; // but this is\n",
     "const s = `a // not a comment\n    b /* nor this */\n  ${ x + `in // ner ${ y } ` } // nor this\n`;\n",
     "a template keeps its text, its line breaks and its indentation; code inside `${}` is code")
same("const fs = `\n  // the shader's own comment\n  void main() {\n    gl_FragColor = vec4(1.0); // white\n  }\n`;\n",
     "const fs = `\n  // the shader's own comment\n  void main() {\n    gl_FragColor = vec4(1.0); // white\n  }\n`;\n",
     "a shader inside a template literal is copied byte for byte")
same("const o = { a: `${ { b: 1 }.b }` }; // braces inside ${}\n", "const o = { a: `${ { b: 1 }.b }` };\n",
     "braces inside a template's expression do not end it")
same("a = 1 /* one */ + 2;\nb = 3\n/* a comment\n   across lines */\n(c)\n", "a = 1 + 2;\nb = 3\n(c)\n",
     "a block comment inside a line is a space; across lines it leaves the line break")
same("/*! kept */\n/**\n * @license MIT\n */\n// Copyright 2026 Somebody\n/** gone */\nx();\n",
     "/*! kept */\n/**\n * @license MIT\n */\n// Copyright 2026 Somebody\nx();\n", "a licence, a copyright and /*! stay")
same("const t = 'it\\'s // fine'; const d = \"a\\\\\"; // the string ended\n",
     "const t = 'it\\'s // fine'; const d = \"a\\\\\";\n", "escapes inside strings")
same("  return (\n    a\n    // why\n    + b\n  );\n", "return (\na\n+ b\n);\n", "no two lines are joined")

css = strip_css("/* a rule */\n.a {\n  color: red; /* why */\n  background: url(data:image/svg+xml;utf8,/*x*/);\n  content: '/* kept */';\n}\n\n/*! licence */\n")
check(css == ".a {\ncolor: red;\nbackground: url(data:image/svg+xml;utf8,/*x*/);\ncontent: '/* kept */';\n}\n/*! licence */\n",
      f"css: comments and indentation go; a url(), a string and a licence stay:\n{css!r}")

# --- 2. in doubt, the source ----------------------------------------------------------------------
for broken, what in (("const a = 'never closed;\n", "an unclosed string"),
                     ("const a = `never closed ${ b };\n", "an unclosed template"),
                     ("/* never closed\nconst a = 1;\n", "an unclosed comment")):
    try:
        strip_js(broken)
        failures.append(f"{what} was stripped instead of refused")
    except Unreadable:
        pass

with tempfile.TemporaryDirectory() as tmp:
    site = Path(tmp) / "site"
    (site / "js" / "ui").mkdir(parents=True)
    (site / "css").mkdir()
    (site / "data").mkdir()
    (site / "index.html").write_text("<!doctype html>", encoding="utf-8")
    (site / "sw.js").write_text((ROOT / "site" / "sw.js").read_text(encoding="utf-8"), encoding="utf-8")
    (site / "data" / "x.json").write_text("{}", encoding="utf-8")
    good = "// why\nexport const a = 1; // one\n"
    bad = "// why\nexport const a = 'never closed;\n"
    (site / "js" / "good.js").write_text(good, encoding="utf-8")
    (site / "js" / "ui" / "bad.js").write_text(bad, encoding="utf-8")
    (site / "js" / "README.md").write_text("# the contract\n", encoding="utf-8")
    (site / "css" / "ui.css").write_text("/* why */\n.a { color: red; }\n", encoding="utf-8")
    out = Path(tmp) / "out"
    code = build(site, out, tree=True, quiet=True)
    check(code == 0, "build() without --node exits 0")
    check((out / "js" / "good.js").read_text(encoding="utf-8") == "export const a = 1;\n", "a readable module is stripped")
    check((out / "js" / "ui" / "bad.js").read_text(encoding="utf-8") == bad, "a module the scanner cannot read is shipped as written")
    check((out / "js" / "README.md").is_file(), "a file beside the code is copied")
    check((out / "css" / "ui.css").read_text(encoding="utf-8") == ".a { color: red; }\n", "the stylesheet is stripped")
    # 4. --tree: everything else is there, as a link to the source.
    check((out / "index.html").is_symlink() and (out / "data").is_symlink() and (out / "data" / "x.json").read_text() == "{}",
          "--tree links the rest of site/ so the folder serves whole")
    check(not (out / "js").is_symlink() and not (out / "css").is_symlink(), "js/ and css/ are copies, never links to the source")
    # 4. stamp_sw.py --overlay: the worker's hashes are the stripped files'.
    stamped = Path(tmp) / "sw.js"
    done = subprocess.run([sys.executable, str(ROOT / "scripts/stamp_sw.py"), "--site", str(site), "--overlay", str(out), "--out", str(stamped)],
                          capture_output=True, text=True)
    check(done.returncode == 0, f"stamp_sw.py --overlay runs: {done.stderr}")
    if done.returncode == 0:
        line = re.search(r"const BUILD = (\{.*\});", stamped.read_text(encoding="utf-8"))
        shell = dict(json.loads(line.group(1))["shell"]) if line else {}
        want = hashlib.sha256(b"export const a = 1;\n").hexdigest()[:16]
        check(shell.get("js/good.js") == want, "stamp_sw.py --overlay hashes the stripped module, not the source")
        plain = Path(tmp) / "sw-plain.js"
        subprocess.run([sys.executable, str(ROOT / "scripts/stamp_sw.py"), "--site", str(site), "--out", str(plain)], capture_output=True, text=True)
        line2 = re.search(r"const BUILD = (\{.*\});", plain.read_text(encoding="utf-8"))
        check(line2 and dict(json.loads(line2.group(1))["shell"]).get("js/good.js") == hashlib.sha256(good.encode()).hexdigest()[:16],
              "and without --overlay it hashes the source, as before")
    # A second run into the same folder is refused rather than mixed.
    try:
        build(site, out, quiet=True)
        failures.append("build() wrote into a folder that already held a build")
    except SystemExit:
        pass

# --- 3. the site ----------------------------------------------------------------------------------
node = shutil.which("node")
with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp) / "min"
    code = build(ROOT / "site", out, node=node, quiet=True)
    check(code == 0, "a module of the stripped site fails `node --check`")
    before = after = modules = 0
    shader_lines = 0
    for path in sorted((ROOT / "site" / "js").rglob("*.js")):
        rel = path.relative_to(ROOT / "site")
        src = path.read_text(encoding="utf-8")
        got = (out / rel).read_text(encoding="utf-8")
        modules += 1
        before += len(src.encode())
        after += len(got.encode())
        if got == src and re.search(r"^\s*//", src, re.M):
            failures.append(f"{rel} was shipped as written: the scanner could not read it (run scripts/minify_site.py to see why)")
            continue
        check(_code_tokens(got) == _code_tokens(src), f"{rel}: the stripped file does not hold the same code")
        # No line of code starts with a space, except inside a template literal -- where every such
        # line must be a line of the source, untouched (a shader keeps its shape and its comments).
        src_lines = set(src.split("\n"))
        for ln in got.split("\n"):
            if ln[:1] in (" ", "\t"):
                shader_lines += 1
                check(ln in src_lines, f"{rel}: an indented output line is not a source line: {ln[:60]!r}")
    for path in sorted((ROOT / "site" / "css").glob("*.css")):
        got = (out / "css" / path.name).read_text(encoding="utf-8")
        check("/*" not in re.sub(r"""url\([^)]*\)|"[^"\n]*"|'[^'\n]*'""", "", got) or "licen" in got.lower() or "/*!" in got,
              f"css/{path.name} still has a comment")
    check(modules > 150, f"only {modules} modules were read: the test is looking at the wrong folder")
    check(after < before * 0.7, f"the stripped site is {after} B of {before} B: comments are no longer being removed")
    check(shader_lines > 100, f"only {shader_lines} indented lines survived: the shaders' template literals are not being kept verbatim")

if failures:
    for f in failures:
        print(f"FAIL: {f}")
    sys.exit(1)
print(f"minify ok: 16 hard cases, 3 refusals, and {modules} modules of site/js go from {before} B to {after} B "
      f"with the same code tokens{' and pass node --check' if node else ' (node not installed: syntax not checked)'}; "
      f"{shader_lines} template-literal lines are kept byte for byte; --tree serves whole and stamp_sw.py --overlay hashes what is served")
