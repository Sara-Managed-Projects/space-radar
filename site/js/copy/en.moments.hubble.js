// The words of the Moment `hubble-deployment` (internal #1058, release 1.7.7): the Hubble Space Telescope let go from Discovery's arm on 25 April 1990, STS-31.
// Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot. The release time is the published one; every other clock, and where the
// shuttle was over the Earth, is ours, and the captions say so where it is shown.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'hubble-deployment': {
    title: 'Hubble\'s release from Discovery',
    blurb: 'STS-31, 25 April 1990: the arm lifts the Hubble Space Telescope out of Discovery\'s bay, its solar arrays unroll (one of them stops), its antennas unfold, and at 19:38 UTC Steven Hawley lets it go.',
    chBay: 'In the bay',
    chLift: 'Out of the bay',
    chArrays: 'The arrays',
    chStop: 'One stops',
    chAntennas: 'The antennas',
    chSwing: 'To the release point',
    chRelease: 'Let go',
    chAway: 'Backing away',
    ready: 'Flight day 2, 25 April 1990, 613 km up. Discovery\'s bay is open and the Hubble Space Telescope, 13.2 m long, sits in its berth. Where the shuttle is over the Earth, and every clock here but the release, is ours: the sources give the release and little else.',
    grapple: 'The arm\'s end effector closes its snare on the grapple fixture beside one of the telescope\'s antenna drives. Steven Hawley works the arm from the aft flight deck. The arm\'s joints are drawn as a two-link arm reaching each place; they are not telemetry.',
    umbilical: 'The telescope switches to its own power and the shuttle\'s supply to it is turned off (NASA). The latches that held it in the bay, two on the sills and one on the floor, are ours in shape and in time.',
    unberth: 'The arm lifts the telescope straight up out of its berth. The clock and the height are ours.',
    arrays: 'The solar arrays, rolled up on drums and folded along the tube for the launch, are swung out from the sides. How they were stowed is drawn from photographs, not from drawings. These first arrays, golden-yellow, were replaced in 1993.',
    unroll: 'The first array unrolls along its booms to about 7 m by 2.5 m. How long it took is ours.',
    stop: 'The second array comes out part-way and stops. McCandless and Sullivan wait in the partly depressurised airlock in case a spacewalk is needed to free it. Which array it was is told two ways; the one drawn is ours.',
    wait: 'Controllers try again and again, and the orbit goes through the Earth\'s shadow and out. The release, planned for the 19th orbit, slips by one. How long it took, and when, is ours.',
    free: 'The last attempt from the ground works and the array unrolls the rest of the way; the spacewalk is not needed. The time is ours.',
    antennas: 'The two high-gain antenna booms spring out, downward and outward, and their dishes are free. The way they were folded, and when, is ours.',
    swing: 'The arm swings the telescope up to the release position, over the bay. The route is ours.',
    readyRelease: 'Hubble\'s pointing systems are switched on and tested with the arm still holding it. Each system is checked before the arm lets go (NASA).',
    release: '19:38 UTC, 25 April 1990, 31 hours 4 minutes after lift-off: Hawley opens the snare and Hubble is free. Jonathan\'s Space Report gives 19:38; America Space says 3:37 p.m. EDT.',
    away: 'The telescope hangs where it was put and Discovery backs off. America Space says the flight deck shouted for a camera. The arm draws back.',
    pulses: 'Discovery pulses its thrusters twice to raise its orbit a little, so it drifts steadily behind. The times and the size of the pulses are ours.',
    trail: 'Discovery stays near Hubble for about two days as a precaution (NASA); the plan was to trail it at about 40 nautical miles in case the aperture door gave trouble.',
    pathOrbit: 'a circle of 613 km at 28.45 degrees as published, the place along it chosen by us to be in sunlight',
    pathHst: 'the telescope from the release, in the orbit it was released in',
    srcNasa: 'STS-31, NASA\'s Space Shuttle archive page (launch time, orbit)',
    srcKit: 'STS-31 press kit, NASA (the deployment plan, the crew\'s tasks, the 19th orbit, the trail)',
    srcJsr: 'Jonathan\'s Space Report no. 36 (release at 19:38 UTC, the delay of an orbit, the array that would not open)',
    srcAmerica: 'America Space, "Somebody Get a Camera" (the arrays, the antennas, the thruster pulses, 3:37 p.m. EDT)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);
