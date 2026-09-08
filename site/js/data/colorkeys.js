// GENERATED from registry/colorkeys.yaml by scripts/gen_colorkeys_js.py. Do not edit.
//
// `python3 scripts/gen_colorkeys_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** Colour keys: which field, which buckets, which colour. Order is the registry's; `class` is the default. */
export const COLOR_KEYS = [
  {
    "id": "class",
    "label": "What it is",
    "by": "klass",
    "buckets": []
  },
  {
    "id": "altitude",
    "label": "How high it flies",
    "by": "perigee_km",
    "unit": "km",
    "buckets": [
      {
        "id": "very-low",
        "label": "under 400 km — drag brings these down within years",
        "min": 0,
        "max": 400,
        "colour": "#FF9F43"
      },
      {
        "id": "low",
        "label": "400–1 000 km — where most satellites live",
        "min": 400,
        "max": 1000,
        "colour": "#7FD1FF"
      },
      {
        "id": "upper-leo",
        "label": "1 000–2 000 km — above the crowd",
        "min": 1000,
        "max": 2000,
        "colour": "#9EF0D8"
      },
      {
        "id": "medium",
        "label": "2 000–35 000 km — navigation satellites live here",
        "min": 2000,
        "max": 35000,
        "colour": "#C3A6FF"
      },
      {
        "id": "geo",
        "label": "35 000 km and beyond — holding still over one spot",
        "min": 35000,
        "max": 1000000000,
        "colour": "#FFD166"
      }
    ]
  },
  {
    "id": "inclination",
    "label": "How tilted its orbit is",
    "by": "inclination_deg",
    "unit": "deg",
    "buckets": [
      {
        "id": "equatorial",
        "label": "under 20° — round the equator",
        "min": 0,
        "max": 20,
        "colour": "#FFD166"
      },
      {
        "id": "mid",
        "label": "20–60° — the crewed stations and most of the crowd",
        "min": 20,
        "max": 60,
        "colour": "#7FD1FF"
      },
      {
        "id": "high",
        "label": "60–85° — sees the high latitudes",
        "min": 60,
        "max": 85,
        "colour": "#9EF0D8"
      },
      {
        "id": "polar",
        "label": "85–95° — over both poles every lap",
        "min": 85,
        "max": 95,
        "colour": "#F2F4F7"
      },
      {
        "id": "retrograde",
        "label": "over 95° — against the Earth's spin, the sun-synchronous ones",
        "min": 95,
        "max": 181,
        "colour": "#FF8FA3"
      }
    ]
  },
  {
    "id": "launch-age",
    "label": "How long it has been up",
    "by": "launch_year",
    "unit": "year",
    "buckets": [
      {
        "id": "this-year",
        "label": "launched this year",
        "min": 2026,
        "max": 2100,
        "colour": "#FF9F43"
      },
      {
        "id": "recent",
        "label": "launched 2021–2025",
        "min": 2021,
        "max": 2026,
        "colour": "#7FD1FF"
      },
      {
        "id": "teens",
        "label": "launched 2010–2020",
        "min": 2010,
        "max": 2021,
        "colour": "#9EF0D8"
      },
      {
        "id": "noughties",
        "label": "launched 2000–2009",
        "min": 2000,
        "max": 2010,
        "colour": "#C3A6FF"
      },
      {
        "id": "old",
        "label": "launched before 2000",
        "min": 1957,
        "max": 2000,
        "colour": "#7A8494"
      }
    ]
  }
];
