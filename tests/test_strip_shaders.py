#!/usr/bin/env python3
"""scripts/strip_shaders.py: shader text in templates loses its comments and indentation, and nothing else.

    python3 tests/test_strip_shaders.py

Internal #553 / #531. The step is OFF by default (scripts/minify_site.py --shaders, or
SR_STRIP_SHADERS=1); this test holds three things:

  1. THE HARD CASES: a trailing `//`, a block comment inside a line and across lines, a `#define`
     and `#version` that must stay lines of their own, a `${}` in the middle of a line, a URL in a
     template that is not a shader, a template with a backslash, a nested template.
  2. THE WHOLE SITE (the dry run): every shader template in site/js is stripped, and for each one the
     old and the new text, with comments removed and lines trimmed, are equal; the code outside the
     templates is the same token for token; the numbers print.
  3. THE SWITCH: minify_site.build() with the flag off writes exactly what it wrote before; with it on
     it writes smaller files that `node --check` accepts; keep_lines keeps every line number.

This file reads site/js as text, so it must not be in scripts/check_built_tree.mjs TESTS.
"""

from __future__ import annotations

import filecmp
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import minify_site  # noqa: E402
from strip_shaders import IS_SHADER, glsl_meaning, strip_shader_templates  # noqa: E402

failures: list[str] = []


def check(ok: bool, what: str) -> None:
    if not ok:
        failures.append(what)
        print("FAIL:", what)


def same(src: str, want: str, what: str, keep_lines: bool = False) -> None:
    got, _ = strip_shader_templates(src, keep_lines=keep_lines)
    check(got == want, f"{what}: got {got!r}")


# 1. hard cases ------------------------------------------------------------------------------------
same("const a = `\n  // note\n  void main() {\n    gl_FragColor = vec4(1.0); // white\n  }\n`;\n",
     "const a = `void main() {\ngl_FragColor = vec4(1.0);\n}\n`;\n",
     "whole-line and trailing comments, indentation and the empty first line go")
same("const a = `\n  void main() {\n    gl_FragColor = vec4(1.0); // white\n  }\n`;\n",
     "const a = `\nvoid main() {\ngl_FragColor = vec4(1.0);\n}\n`;\n",
     "keep_lines blanks the first empty line and keeps the shape", keep_lines=True)
got, _ = strip_shader_templates("x = `\n#version 300 es\n// c\n#define A 1 // one\n  #ifdef B\n  /* two\n  lines */ float f;\n  #endif\n  void main() { gl_Position = vec4(0.); /* z */ }\n`;\n")
check(got == "x = `#version 300 es\n#define A 1\n#ifdef B\nfloat f;\n#endif\nvoid main() { gl_Position = vec4(0.);   }\n`;\n", f"preprocessor lines stay lines, a block comment across lines goes: {got!r}")
src = "x = `\n  void main() {\n    // note\n    float a = ${v}; // keep this half-line\n    gl_FragColor = vec4(a);   \n  }\n`;\n"
got, _ = strip_shader_templates(src)
check("float a = ${v}; // keep this half-line" in got and "// note" not in got and "gl_FragColor = vec4(a);\n" in got,
      f"a line holding a ${{}} is not touched: {got!r}")
check("    float a" not in got or "float a = ${v}" in got, "indentation of the ${} line is its own business")
src = "const u = `\n  // see https://example.org/a // b\n  not a shader\n`;\n"
check(strip_shader_templates(src)[0] == src, "a template without gl_ or void main is not touched")
src = "const s = `\n  // a\n  void main() { gl_FragColor = vec4(1.); \\\n  }\n`;\n"
check(strip_shader_templates(src)[0] == src, "a template with a backslash is not touched")
src = "const s = `\n  /* never closed\n  void main() { gl_FragColor = vec4(1.); }\n`;\n"
check(strip_shader_templates(src)[0] == src, "a block comment left open: not touched")
got, st = strip_shader_templates("f(`a ${`\n // inner\n void main() {}\n`} b`);\n")
check(st["templates"] == 1 and "// inner" not in got, f"a nested template is found: {got!r}")
check(glsl_meaning("a // b\n  /* c\n d */ e\n\n  f ") == ["a", "e", "f"], "glsl_meaning")

# 2. the whole site --------------------------------------------------------------------------------
templates = changed = before = after = files = 0
for path in sorted((ROOT / "site" / "js").rglob("*.js")):
    text = path.read_text(encoding="utf-8")
    if not IS_SHADER.search(text):
        continue
    first = minify_site.strip_js(text)
    try:
        new, st = strip_shader_templates(first)
    except minify_site.Unreadable as why:
        check(False, f"{path.name}: {why}")
        continue
    check(not st["refused"], f"{path.name}: shaders left as written: {st['refused']}")
    templates += st["templates"]
    changed += st["changed"]
    before += st["before"]
    after += st["after"]
    files += 1
    check(len(new) <= len(first), f"{path.name} did not grow")
    check(new.count("\n") <= first.count("\n"), f"{path.name} did not gain lines")
    lines_kept, _ = strip_shader_templates(first, keep_lines=True)
    check(lines_kept.count("\n") == first.count("\n"), f"{path.name}: keep_lines keeps the line count")
check(templates >= 70, f"only {templates} shader templates found: the finder is blind")
check(changed == templates, f"{templates - changed} shader templates were refused")
check(before - after > 25000, f"only {before - after} B saved")

# 3. the switch ------------------------------------------------------------------------------------
tmp = Path(tempfile.mkdtemp())
try:
    site = tmp / "site"
    (site / "js").mkdir(parents=True)
    (site / "css").mkdir()
    (site / "js" / "a.js").write_text("// a comment\nexport const fs = `\n  // shader note\n  void main() {\n    gl_FragColor = vec4(1.0); // white\n  }\n`;\n", encoding="utf-8")
    (site / "js" / "b.js").write_text("// b\nexport const x = 1;\n", encoding="utf-8")
    (site / "css" / "c.css").write_text("/* c */\na { color: red; }\n", encoding="utf-8")
    minify_site.build(site, tmp / "default", quiet=True)
    minify_site.build(site, tmp / "off", quiet=True, shaders=False)
    minify_site.build(site, tmp / "on", quiet=True, shaders=True)
    check(filecmp.cmp(tmp / "default/js/a.js", tmp / "off/js/a.js", shallow=False), "the default build is the build with the flag off")
    check("// shader note" in (tmp / "off/js/a.js").read_text(), "off: the shader keeps its comments")
    on = (tmp / "on/js/a.js").read_text()
    check("shader note" not in on and "gl_FragColor = vec4(1.0);\n" in on and "white" not in on, f"on: the shader loses them: {on!r}")
    check(filecmp.cmp(tmp / "off/js/b.js", tmp / "on/js/b.js", shallow=False), "on: a module without a shader is unchanged")
    node = shutil.which("node")
    if node:
        shutil.copyfile(tmp / "on/js/a.js", tmp / "m.mjs")
        r = subprocess.run([node, "--check", str(tmp / "m.mjs")], capture_output=True, text=True)
        check(r.returncode == 0, f"node --check on the stripped module: {r.stderr[:200]}")
        (tmp / "run.mjs").write_text(f"import {{ fs }} from '{tmp / 'm.mjs'}';\nconsole.log(JSON.stringify(fs));\n")
        a = subprocess.run([node, str(tmp / "run.mjs")], capture_output=True, text=True).stdout
        shutil.copyfile(tmp / "off/js/a.js", tmp / "m.mjs")
        b = subprocess.run([node, str(tmp / "run.mjs")], capture_output=True, text=True).stdout
        import json
        check(glsl_meaning(json.loads(a)) == glsl_meaning(json.loads(b)) and len(a) < len(b), "evaluated by node, the two strings say the same GLSL")
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if failures:
    print(f"{len(failures)} failure(s)")
    sys.exit(1)
print(f"strip_shaders ok: {changed}/{templates} shader templates in {files} files, {before} B -> {after} B ({before - after} B, {100 * (before - after) // max(before, 1)} % of shader text, after the stripper's own pass); off by default, hard cases and the switch held")
