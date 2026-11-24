"""The "will I see it" table of the total solar eclipse of 2 August 2027, on its event page (forge #553).

    /events/total-eclipse-2027.html gains a section: twenty places, along the path and in the partial band round it, with what
    each sees (total or partial), how much of the Sun is covered, the maximum in UT and the length of totality, and a link to
    the map's checker (#cat=eclipse) for any other place.

The numbers are the map's own checker's: scripts/eclipse2027_table.mjs runs site/js/sky/besselian.js, NASA GSFC's Besselian
elements of this eclipse with the local circumstances method, on the places of site/data/eclipse-2027-places.json (Natural
Earth). Nothing is typed but the place names; tests/test_eclipse_2027.mjs holds the arithmetic to NASA's tables.
"""

from __future__ import annotations

import html
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENT_ID = "total-eclipse-2027"
# West to east along the path, then the partial band's big cities, nearest the path first.
PLACES = ["Cádiz", "Gibraltar", "Málaga", "Tangier", "Oran", "Sfax", "Banghazi", "Luxor", "Sohag", "Jeddah", "Makkah", "Sanaa",
          "Algiers", "Tunis", "Cairo", "Lisbon", "Madrid", "Riyadh", "Rome", "London"]


def rows() -> list[dict]:
    node = shutil.which("node")
    if not node:
        raise SystemExit("seo_eclipse2027: needs Node 22 on PATH (the arithmetic is site/js/sky/besselian.js)")
    run = subprocess.run([node, str(ROOT / "scripts" / "eclipse2027_table.mjs")], input=json.dumps({"places": PLACES}), capture_output=True,
                         text=True, cwd=ROOT)
    if run.returncode != 0:
        raise SystemExit(f"seo_eclipse2027: scripts/eclipse2027_table.mjs failed:\n{run.stderr}")
    return json.loads(run.stdout)["rows"]


def percent(x: float) -> str:
    p = x * 100
    return f"{p:.1f}" if 99.5 <= p < 100 else f"{round(p):d}"


def section() -> str:
    esc = html.escape
    body = []
    for r in rows():
        total = r["kind"] == "total"
        m, s = divmod(round(r["durationS"]), 60)
        where = r["name"] if r["country"] == r["name"] else f'{r["name"]}, {r["country"]}'
        body.append(f'<tr><td translate="no">{esc(where)}</td><td>{"Total" if total else "Partial"}</td>'
                    f'<td>{percent(r["obscuration"])} percent</td><td>{r["maxUtc"][11:16]} UT</td>'
                    f'<td>{f"{m} min {s} s" if total else "—"}</td></tr>')
    return ("<h2>Will I see it? Twenty places</h2>\n"
            "<p>What twenty places along the path and round it will see, worked out from NASA's Besselian elements of this eclipse, "
            "the same arithmetic as the map's checker. For any other place, type its name there.</p>\n"
            '<p><a href="../#cat=eclipse">Check your place on the map</a></p>\n'
            '<div class="tbl__s"><table><thead><tr><th>Place</th><th>What it sees</th><th>Sun covered</th><th>Greatest eclipse</th>'
            "<th>Totality</th></tr></thead><tbody>" + "".join(body) + "</tbody></table></div>\n")
