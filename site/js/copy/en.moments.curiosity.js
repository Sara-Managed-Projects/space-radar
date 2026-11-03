// The words of the Moment `curiosity-edl` (internal #1058): Curiosity's entry, descent and landing, 6 August 2012 (UTC), seen from 30 seconds
// before the atmosphere to the descent stage's crash. Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot.
// Every time is JPL's (its "Timeline of Major Mission Events During Curiosity's Landing") and every height and speed NASA's press kit's
// typical case; the path between them is ours, and the captions and the foot line say so.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'curiosity-edl': {
    title: 'Curiosity: seven minutes to Mars',
    blurb: '6 August 2012: the Mars Science Laboratory from the top of the Martian air to Gale crater: the heat shield, the parachute, the rocket backpack and the sky crane, on JPL\'s own clock.',
    chEntry: 'The atmosphere',
    chHeat: 'Peak heating',
    chChute: 'The parachute',
    chPowered: 'Rocket descent',
    chCrane: 'The sky crane',
    chLanded: 'Touchdown',
    ready: 'Mars, 30 s before the air. The cruise stage was let go ten minutes ago; Curiosity rides inside its aeroshell, heat shield forward, at about 5.9 km/s. Clock: seconds from entry, 05:10:45.7 UTC on 6 August 2012.',
    entry: 'Entry, 05:10:45.7 UTC: 131 km above the height of the landing site\'s ground (NASA\'s figure; the entry point is far upstream of the site), 5.9 km/s. The vehicle flies tilted, with some lift, so it can be steered.',
    guided: 'Small thrusters on the back shell steer the lift in S-curves to land on the target (not drawn). More than nine tenths of the slowing before the parachute is done by the air.',
    heating: 'About 80 s in: peak heating, some 2 100 C on the shield\'s face. The peak of the slowing comes some ten seconds later; in this reconstruction it is about 9.6 g.',
    slow: 'The glow fades as the air thickens and the speed falls. Nine minutes before entry the vehicle shed two tungsten blocks of 75 kg to set its centre of mass off the axis for the lifting flight (not drawn).',
    weights: 'About 20 s before the parachute the last ballast goes: six blocks of 25 kg, to bring the weight back to the axis for the descent under the canopy (not drawn).',
    chute: '259.2 s, 05:15:04.9 UTC: the parachute opens, 11 km up at about 405 m/s: a canopy some 16 m across on 80 lines, each over 50 m long. It is drawn in the colours of the flight one.',
    shield: '278.9 s, 05:15:24.6 UTC: the heat shield is let go, some 8 km up at 125 m/s, and falls away. The rover\'s descent camera starts to film the ground and the stage\'s radar to read it.',
    radar: 'Under the parachute the rover hangs inside the back shell, tucked under its rocket backpack. The radar measures the height and the speed; the flight computer waits for the moment to cut loose.',
    backshell: 'About 80 s after the shield, at some 1.6 km and 80 m/s, the back shell lets go of the rover and its rocket backpack. All eight landing engines, 400 to 3 100 N each, light.',
    divert: 'The descent stage dives clear and makes a 300 m manoeuvre to stay away from the back shell and the parachute, which drift on (their fall here is illustrative). It slows to 0.75 m/s.',
    skycrane: '412.9 s, 05:17:38.6 UTC: about 20 m up the rover lets go of the stage, and four of its eight engines are off. The stage lowers it on a 7.6 m bridle of three cords, the wheels pop into place.',
    touchdown: '431.6 s, 05:17:57.3 UTC: touchdown, about 0.75 m/s, in Gale crater, 2.4 km from the middle of the target ellipse. Seven minutes and eleven seconds from the air.',
    cut: 'The rover waits two seconds, sensing its weight on the wheels, then fires the pyrotechnics that cut the cords. The stage throttles up.',
    flyaway: 'The stage flies away to crash some 650 m off, so that it does not fall on the rover (its path here is illustrative).',
    earth: 'The signal took 13 min 48 s to reach the Earth: 05:31:45.4 UTC, 10:31 pm in Pasadena. "Touchdown confirmed. We\'re safe on Mars!" (Allen Chen, JPL).',
    pathEdl: 'the published event times, heights and speeds joined by a point mass fitted to them; the compass heading is ours',
    pathDescent: 'the published speeds and times, the stage\'s last 135 m and the sky crane joined between them; the flyaway is illustrative',
    pathBackshell: 'ours: the back shell and its parachute drift and fall; no path of theirs is published in what was read',
    pathRover: 'JPL\'s times and NASA\'s 20 m and 0.75 m/s, the bridle paying out over the 18.7 s between them',
    srcJpl: 'JPL, "Timeline of Major Mission Events During Curiosity\'s Landing" (the times of entry, parachute, heat shield, rover separation, touchdown)',
    srcKit: 'NASA, Mars Science Laboratory Landing press kit, July 2012 (entry at 131 km and 5.9 km/s, parachute, shield and back shell heights and speeds, public domain)',
    srcPowered: 'Sell and others, "Powered Flight Design and Reconstructed Performance Summary for the Mars Science Laboratory Mission", AAS 13-424 (the 300 m divert)',
    srcWiki: 'Mars Science Laboratory, Wikipedia (the parachute, the bridle, the engines, the stage\'s crash)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);
