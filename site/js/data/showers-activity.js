// GENERATED from registry/showers.yaml by scripts/gen_showers_activity_js.py. Do not edit.
//
// `python3 scripts/gen_showers_activity_js.py --check` fails CI if this file and the YAML disagree,
// so an edit here is an edit that will be reverted. Change the YAML.

/** Each shower's population index, activity period (MM-DD) and the Sun's longitude at its maximum (IMO 2027 calendar, Table 5). */
export const SHOWER_ACTIVITY = [
  {
    "id": "quadrantids",
    "r": 2.1,
    "active_from": "12-28",
    "active_to": "01-12",
    "sol": 283.15
  },
  {
    "id": "lyrids",
    "r": 2.1,
    "active_from": "04-14",
    "active_to": "04-30",
    "sol": 32.32
  },
  {
    "id": "eta-aquariids",
    "r": 2.4,
    "active_from": "04-19",
    "active_to": "05-28",
    "sol": 45.5
  },
  {
    "id": "alpha-capricornids",
    "r": 2.5,
    "active_from": "07-03",
    "active_to": "08-15",
    "sol": 128
  },
  {
    "id": "southern-delta-aquariids",
    "r": 2.5,
    "active_from": "07-12",
    "active_to": "08-23",
    "sol": 128
  },
  {
    "id": "perseids",
    "r": 2.2,
    "active_from": "07-17",
    "active_to": "08-24",
    "sol": 140.0
  },
  {
    "id": "draconids",
    "r": 2.6,
    "active_from": "10-06",
    "active_to": "10-10",
    "sol": 195.4
  },
  {
    "id": "orionids",
    "r": 2.5,
    "active_from": "10-02",
    "active_to": "11-07",
    "sol": 208.0
  },
  {
    "id": "southern-taurids",
    "r": 2.3,
    "active_from": "09-20",
    "active_to": "11-20",
    "sol": 223
  },
  {
    "id": "northern-taurids",
    "r": 2.3,
    "active_from": "10-20",
    "active_to": "12-10",
    "sol": 230
  },
  {
    "id": "leonids",
    "r": 2.5,
    "active_from": "11-06",
    "active_to": "11-30",
    "sol": 235.27
  },
  {
    "id": "geminids",
    "r": 2.6,
    "active_from": "12-04",
    "active_to": "12-20",
    "sol": 262.2
  },
  {
    "id": "ursids",
    "r": 2.8,
    "active_from": "12-17",
    "active_to": "12-26",
    "sol": 270.7
  }
];

/** The antihelion source, the same table's first row: `ahead_deg` is how far its radiant is from the Sun along the ecliptic. */
export const ANTIHELION = {
  "display": "Antihelion source",
  "zhr": 4,
  "r": 3.0,
  "v_kms": 30,
  "active_from": "12-10",
  "active_to": "09-20",
  "ahead_deg": 195
};
