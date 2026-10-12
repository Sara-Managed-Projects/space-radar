#!/usr/bin/env python3
"""The /embed/ page: the generator writes working code, the list of embedders is honest.

  1. THE CODE WORKS. For EVERY object and EVERY trip the page offers, under Node: the page's
     generator (templates/embed/generate.js) writes the same <iframe> as the app's own Embed
     button (site/js/ui/embed.js embedSnippet), the same one the Python writer behind the page's
     no-JavaScript examples writes, and the frame's address is read back by the app's own reader
     (embedLink) as the object or the trip it was made for. The three examples printed in the
     page are what the generator writes. The caption is one plain link to
     https://www.spaceradar.ai/?from=embed, no nofollow, and unticking it leaves the iframe alone.
  2. IT REFUSES what is not an id (a quote, a tag, a path) and a kind that is not one of the three.
  3. THE LIST IS OPT-IN AND STARTS EMPTY: with registry/embedders.yaml as committed the page says
     it has none and links the Discussions "Show and tell" category, and lists nobody. A listed
     site is printed as a followed link; a row that is not https, a name over 80 characters or the
     same address twice stops the build.
  4. The page is in the sitemap, says the link line is optional for classrooms, and says what it
     draws is modelled.

Needs Node 22 on PATH and PyYAML. Run: python3 tests/test_seo_embed.py
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_embed  # noqa: E402

failures: list[str] = []


def ok(cond: bool, msg: str) -> None:
    print(("PASS: " if cond else "FAIL: ") + msg)
    if not cond:
        failures.append(msg)


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.options: dict[str, list[tuple[str, str]]] = {"gen-object": [], "gen-trip": []}
        self.pre: list[str] = []
        self.hrefs: list[tuple[str, str]] = []
        self._select = None
        self._opt = None
        self._pre = None
        self.text: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "select":
            self._select = a.get("id")
        elif tag == "option" and self._select in self.options:
            self._opt = [a.get("value", ""), ""]
        elif tag == "pre":
            self._pre = []
        elif tag == "a":
            self.hrefs.append((a.get("href", ""), a.get("rel", "")))

    def handle_endtag(self, tag):
        if tag == "select":
            self._select = None
        elif tag == "option" and self._opt:
            self.options[self._select].append((self._opt[0], self._opt[1]))
            self._opt = None
        elif tag == "pre" and self._pre is not None:
            self.pre.append("".join(self._pre))
            self._pre = None

    def handle_data(self, data):
        if self._opt is not None:
            self._opt[1] += data
        if self._pre is not None:
            self._pre.append(data)
        self.text.append(data)


class Frames(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tags: list[tuple[str, dict]] = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


node = shutil.which("node")
if not node:
    print("FAIL: node is on PATH")
    sys.exit(1)

# --- build the page the way the deploy does -----------------------------------------------------------
out = Path(tempfile.mkdtemp(prefix="embed-"))
r = subprocess.run([sys.executable, "scripts/build_seo.py", "--out", str(out)], cwd=ROOT, capture_output=True, text=True)
ok(r.returncode == 0, f"build_seo.py builds the embed page ({(r.stdout or r.stderr).strip().splitlines()[-1:]})")
html_text = (out / "embed" / "index.html").read_text(encoding="utf-8")
page = Page()
page.feed(html_text)
objects, trips = page.options["gen-object"], page.options["gen-trip"]
ok(len(objects) >= 200 and len(trips) == 26, f"the page offers {len(objects)} objects and {len(trips)} trips")
ok((out / "embed" / "generate.js").read_text() == (ROOT / "templates/embed/generate.js").read_text(), "embed/generate.js is the template's generator, unchanged")

# --- 1: the code works, for every choice -------------------------------------------------------------
script = """
import { pathToFileURL } from 'node:url';
const root = process.argv[1];
const G = await import(pathToFileURL(root + '/templates/embed/generate.js'));
const E = await import(pathToFileURL(root + '/site/js/ui/embed.js'));
const items = JSON.parse(process.argv[2]);
const out = [];
for (const it of items) {
  const row = { kind: it.kind, id: it.id, name: it.name };
  const title = G.frameTitle(it.kind, it.name);
  row.gen = G.snippet({ kind: it.kind, id: it.id, name: it.name, credit: false });
  row.genCredit = G.snippet({ kind: it.kind, id: it.id, name: it.name });
  const state = it.kind === 'map' ? {} : { [it.kind === 'trip' ? 'trip' : 'at']: it.id };
  row.app = E.embedSnippet(state, { title });
  const src = /src="([^"]+)"/.exec(row.gen)[1].replace(/&amp;/g, '&');
  row.read = E.embedLink(new URL(src).search);
  row.isEmbed = E.isEmbed(new URL(src).search);
  out.push(row);
}
const bad = [];
for (const [kind, id] of [['object', '"><script>'], ['object', '../x'], ['object', ''], ['trip', 'a'.repeat(81)], ['bogus', 'x'], ['trip', undefined]]) {
  try { G.snippet({ kind, id, name: 'x' }); bad.push('accepted ' + kind + ' ' + id); } catch { /* refused */ }
}
console.log(JSON.stringify({ rows: out, accepted: bad, sizes: [G.snippet({ kind: 'map', width: 5, height: 99999, credit: false }), G.snippet({ kind: 'map', width: 'x', credit: false })] }));
"""
items = [{"kind": "object", "id": i, "name": n} for i, n in objects] + [{"kind": "trip", "id": i, "name": n} for i, n in trips] + [{"kind": "map", "id": None, "name": ""}]
r = subprocess.run([node, "--input-type=module", "-e", script, str(ROOT), json.dumps(items)], capture_output=True, text=True)
ok(r.returncode == 0, f"the generator and the app's embed module load under Node ({r.stderr.strip()[:200]})")
res = json.loads(r.stdout) if r.returncode == 0 else {"rows": [], "accepted": ["did not run"], "sizes": ["", ""]}
rows = res["rows"]
ok(len(rows) == len(items), f"{len(rows)} choices generated")

differs = [x["id"] for x in rows if x["gen"] != x["app"]]
ok(not differs, f"the generator writes the app's own Embed snippet for every choice ({differs[:3]})")
py_differs = []
for x in rows:
    want = seo_embed.snippet(x["kind"], x["id"], x["name"], credit=False)
    if want != x["gen"]:
        py_differs.append(x["id"])
ok(not py_differs, f"the Python writer behind the page's examples agrees with the generator ({py_differs[:3]})")
unread = [x["id"] for x in rows if x["kind"] != "map" and x["read"] != {("trip" if x["kind"] == "trip" else "at"): x["id"]}]
ok(not unread, f"the app's reader gets back the object or the trip each address was made for ({unread[:3]})")
ok(all(x["isEmbed"] for x in rows), "every address turns the embed on (embed=1)")
ok([x for x in rows if x["kind"] == "map"][0]["read"] == {}, "the map's address names nothing: the Earth and what is around it")

def one_iframe(code: str, credit: bool) -> list[str]:
    p = Frames()
    p.feed(code)
    problems = []
    frames = [a for t, a in p.tags if t == "iframe"]
    anchors = [a for t, a in p.tags if t == "a"]
    if len(frames) != 1:
        return [f"{len(frames)} iframes"]
    f = frames[0]
    if not f["src"].startswith("https://www.spaceradar.ai/?embed=1"):
        problems.append("src")
    if not f.get("title") or not f.get("width", "").isdigit() or not f.get("height", "").isdigit():
        problems.append("title, width or height")
    if f.get("loading") != "lazy" or f.get("allow") != "fullscreen":
        problems.append("loading or allow")
    if any(k in f for k in ("sandbox", "referrerpolicy", "onload")):
        problems.append("an attribute nobody asked for")
    if credit:
        if len(anchors) != 1 or anchors[0].get("href") != "https://www.spaceradar.ai/?from=embed" or set(anchors[0]) - {"href"}:
            problems.append(f"the caption link is not one plain anchor to ?from=embed ({anchors})")
    elif anchors:
        problems.append("an anchor with the credit off")
    return problems

bad_frames = [x["id"] for x in rows if one_iframe(x["gen"], False) or one_iframe(x["genCredit"], True)]
ok(not bad_frames, f"every snippet is one titled lazy iframe, with one plain followed link back when the credit is on and none when off ({bad_frames[:3]})")
ok(all(x["genCredit"].startswith(x["gen"] + "\n") for x in rows), "unticking the credit leaves the iframe as it was")
ok(not res["accepted"], f"the generator refuses what is not an id or not a kind ({res['accepted']})")
ok('width="280"' in res["sizes"][0] and 'height="1200"' in res["sizes"][0] and 'width="600"' in res["sizes"][1], "sizes are held between 280 x 200 and 1600 x 1200, and fall back to 600 x 400")

# The three printed examples are what the generator writes (read back from the page, unescaped).
printed = page.pre
by_id = {(x["kind"], x["id"]): x["genCredit"] for x in rows}
want = [by_id[("object", seo_embed.DEFAULT_OBJECT)], by_id[("trip", seo_embed.EXAMPLE_TRIP)], by_id[("map", None)]]
ok(printed == want, f"the page's three examples are the generator's output ({len(printed)} printed)")

# --- 2/4: the page's words ----------------------------------------------------------------------------
plain = " ".join(page.text)
ok("optional" in plain and "classroom" in plain, "the page says the link line is optional, for a classroom")
ok("modelled" in plain, "the page says what the frame draws is modelled")
sm = (out / "sitemap.xml").read_text(encoding="utf-8")
ok("https://www.spaceradar.ai/embed/index.html</loc>" in sm, "the sitemap lists the embed page")

# --- 3: the list ------------------------------------------------------------------------------------------
SHOW = "https://github.com/Sara-Managed-Projects/space-radar/discussions/categories/show-and-tell"
ok(seo_embed.read_embedders() == [], "registry/embedders.yaml starts empty")
sites = html_text[html_text.index("<h2>Sites that embed it</h2>"):html_text.index("</main>")]
ok("None yet." in sites and SHOW in sites and "<li>" not in sites, "with nobody listed, the page says so and links Show and tell")
with tempfile.TemporaryDirectory() as tmp:
    def write(rows: str) -> Path:
        p = Path(tmp) / "e.yaml"
        p.write_text("version: 1\nembedders:\n" + rows, encoding="utf-8")
        return p
    good = seo_embed.read_embedders(write('  - {name: "Hill Road Primary", url: "https://example.org/space/", note: "a class page"}\n'))
    shown = seo_embed.embedders_html(good)
    ok('<a href="https://example.org/space/" rel="noopener">Hill Road Primary</a>' in shown and "nofollow" not in shown and "None yet" not in shown, "a listed site is a followed link and the empty line is gone")
    for why, rows in (("an http address", '  - {name: "A", url: "http://example.org/"}\n'),
                      ("a name over 80 characters", '  - {name: "%s", url: "https://example.org/"}\n' % ("x" * 81)),
                      ("a note over 120 characters", '  - {name: "A", url: "https://example.org/", note: "%s"}\n' % ("x" * 121)),
                      ("the same address twice", '  - {name: "A", url: "https://example.org/"}\n  - {name: "B", url: "https://example.org/"}\n'),
                      ("a script address", '  - {name: "A", url: "javascript:alert(1)"}\n')):
        try:
            seo_embed.read_embedders(write(rows))
            ok(False, f"the list refuses {why}")
        except SystemExit:
            ok(True, f"the list refuses {why}")

shutil.rmtree(out, ignore_errors=True)
print(f"\n{len(failures)} failure(s)" if failures else "\nall embed-page checks pass")
sys.exit(1 if failures else 0)
