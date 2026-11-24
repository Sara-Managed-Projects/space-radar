// The words of a Moment's flight data: the published heights and speeds of a launch, drawn beside its replay (forge #571,
// site/js/moments/telemetrychart.js). Imported by that module only, which the player fetches for a moment that names
// `telemetry`, so neither a first visit nor another moment carries them.
import { COPY } from './en.js';
import { HOOK } from './lang.js';

COPY.momentTelemetry = {
  button: 'Flight data',
  buttonTitle: 'Show or hide the published heights and speeds',
  title: 'Flight data',
  rocket: { 'saturn-v': 'Saturn V' },
  flights: { apollo11: 'Apollo 11', apollo13: 'Apollo 13' },
  legendCompare: '{flight}, the same rocket',
  height: 'Height',
  speed: 'Speed over the Earth',
  unitKm: 'km',
  unitKms: 'km/s',
  unitMin: 'min',
  events: {
    liftoff: 'Lift-off',
    mach1: 'Mach 1',
    maxQ: 'Max Q',
    sicCeco: 'First stage centre engine off',
    sicOeco: 'First stage engines off',
    sicSep: 'First stage drops away',
    siiCeco: 'Second stage centre engine off',
    siiPlannedCeco: 'When that engine was due to stop',
    siiOeco: 'Second stage engines off',
    siiSep: 'Second stage drops away',
    sivbCutoff: 'Third stage engine off',
    orbit: 'In orbit',
  },
  markStaging: 'Staging',
  before: 'Waiting for lift-off',
  readout: '{event}, {time}: {height} km up, {speed} km/s',
  commanded: '(commanded time)',
  after: 'The table ends at orbit, {time}',
  maxQLine: 'Max Q {kpa} kPa at {time}, {height} km up',
  dots: 'Dots are NASA’s published table; the lines between them are not measurements.',
  truth: 'Worked out after the flight from the flight reports.',
  source: 'Apollo by the Numbers, NASA SP-2000-4029',
  sourceTitle: 'The book, a NASA PDF; tables on its pages {pages}',
  tableCaption: 'The published rows of {flight}',
  colTime: 'Time',
  colEvent: 'Event',
  colHeight: 'Height, km',
  colSpeed: 'Speed, km/s',
  seekHint: 'Choose a dot to go to that second',
};

// The section in the visitor's language when a translation has it (copy/lang.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentTelemetry']);
