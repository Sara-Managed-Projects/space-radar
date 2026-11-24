// GENERATED from registry/events.yaml by scripts/gen_events_js.py. Do not edit.
//
// `python3 scripts/gen_events_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// data/events.js builds one record per occurrence for every type here with `enabled: true` and a
// builder behind it (spec 0031). `prominence` orders the stream: 1 leads.

/** Every event type the registry knows, defaults resolved. Order is the registry's. */
export const EVENT_TYPES = [
  {
    "id": "launch",
    "display": "Rocket launch",
    "prominence": 3,
    "locationDependent": true,
    "enabled": true,
    "source": "ll2-upcoming"
  },
  {
    "id": "meteor-shower",
    "display": "Meteor shower peak",
    "prominence": 2,
    "locationDependent": true,
    "enabled": true,
    "source": "registry/showers.yaml"
  },
  {
    "id": "close-approach",
    "display": "Asteroid passes Earth",
    "prominence": 2,
    "locationDependent": false,
    "enabled": true,
    "source": "jpl-cad"
  },
  {
    "id": "solar-eclipse",
    "display": "Solar eclipse",
    "prominence": 1,
    "locationDependent": true,
    "enabled": true,
    "source": "computed"
  },
  {
    "id": "lunar-eclipse",
    "display": "Lunar eclipse",
    "prominence": 1,
    "locationDependent": true,
    "enabled": true,
    "source": "computed"
  },
  {
    "id": "solstice",
    "display": "Solstice",
    "prominence": 3,
    "locationDependent": false,
    "enabled": true,
    "source": "computed"
  },
  {
    "id": "equinox",
    "display": "Equinox",
    "prominence": 3,
    "locationDependent": false,
    "enabled": true,
    "source": "computed"
  },
  {
    "id": "station-pass",
    "display": "The station passes over you",
    "prominence": 2,
    "locationDependent": true,
    "enabled": true,
    "source": "celestrak-stations"
  },
  {
    "id": "starlink-train",
    "display": "A fresh Starlink train",
    "prominence": 3,
    "locationDependent": true,
    "enabled": true,
    "source": "celestrak-supplemental-starlink"
  },
  {
    "id": "reentry",
    "display": "Something comes down",
    "prominence": 2,
    "locationDependent": true,
    "enabled": false,
    "source": "space-track-tip"
  },
  {
    "id": "aurora",
    "display": "Aurora likely",
    "prominence": 2,
    "locationDependent": true,
    "enabled": true,
    "source": "swpc-kp"
  },
  {
    "id": "conjunction",
    "display": "Two planets meet",
    "prominence": 3,
    "locationDependent": true,
    "enabled": false,
    "source": "computed"
  },
  {
    "id": "mission-milestone",
    "display": "A spacecraft arrives somewhere",
    "prominence": 1,
    "locationDependent": false,
    "enabled": false,
    "source": "ll2-events"
  },
  {
    "id": "decay",
    "display": "Something came down",
    "prominence": 4,
    "locationDependent": false,
    "enabled": false,
    "source": "celestrak-satcat"
  },
  {
    "id": "data-release",
    "display": "A big catalogue goes public",
    "prominence": 2,
    "locationDependent": false,
    "enabled": true,
    "source": "registry/events.yaml",
    "dates": [
      {
        "id": "gaia-dr4",
        "name": "Gaia DR4",
        "date": "2026-12-02",
        "object": "deep-gaia",
        "chipFrom": "2026-11-24",
        "chipUntil": "2026-12-04",
        "journal": "https://blog.spaceradar.ai/gaia-dr4-release-day/",
        "journalFrom": "2026-11-30",
        "source": "https://www.cosmos.esa.int/web/gaia/release",
        "read": "2026-11-24"
      }
    ]
  }
];
