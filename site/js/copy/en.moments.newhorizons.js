// The words of the Moment `new-horizons-pluto` (internal #1058): New Horizons' flyby of Pluto and Charon on 14 July 2015, from six hours before the
// closest approach to forty minutes after. Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot. The clock's T-0 is the second
// JPL Horizons has the craft nearest Pluto (11:48:29 UT, which the repository's own file of the path has too); NASA's timetable has the closest approach 88 s
// later, 11:49:57 UTC, and the captions say both.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'new-horizons-pluto': {
    title: 'New Horizons at Pluto',
    blurb: '14 July 2015: the first visit to Pluto, from six hours out to the pass at 13.8 km/s, on JPL\'s own track: Pluto and Charon as discs, the crescent behind.',
    chApproach: 'The approach',
    chClosest: 'Closest approach',
    chAway: 'Looking back',
    chCharon: 'Charon',
    ready: '05:48 UTC, six hours out: 300 000 km from Pluto, after more than nine years and 3 billion miles (NASA). Pluto and Charon are points still. The clock counts seconds from the closest approach in JPL\'s Horizons track, 11:48:29 UT.',
    approach: 'Pluto is some 2 380 km across and Charon some 1 210 km; they circle each other every 6.4 days. In this replay Charon stands above longitude 0 of Pluto\'s equator, 19 591 km out, which is where the two keep their faces to each other (our drawing).',
    last: 'The craft is on its own: for much of the day it points its instruments at Pluto and is out of contact with mission control (NASA). It is lit from the sunward side and heads for the line where day ends on Pluto.',
    closest: 'Closest approach to Pluto: 12 490 km over the surface at 13.78 km/s in JPL\'s track at 11:48:29 UT. NASA\'s timetable has about 7:49 am EDT, 11:49:57 UTC, 12 500 km up at 30 800 mph; the 88 s between the two clocks are not reconciled here.',
    pluto: 'The craft is over the night side of Pluto now: it crossed the line between day and night some five minutes ago, and looks back at the sunlit planet. Backlit, Pluto\'s haze would glow (not drawn: only the planet\'s rim does).',
    away: 'Behind it Pluto is a crescent that grows thinner as the craft recedes. The Earth is 4.77 billion km away, 4 hours 25 minutes by radio (our sum from the planets\' places).',
    charon: 'About 14 minutes after Pluto, Charon: within 28 860 km (NASA). In this replay it is nearest at 12:02:36 UT, JPL\'s Pluto second plus 14 min 7 s; Wikipedia has 12:02:22.',
    clock: 'What the craft sees now reaches the Earth 4 hours 25 minutes late, and a reply would take as long to come back: nothing could be steered from the ground.',
    home: 'At about 00:53 UTC on 15 July (8:53 pm EDT on the 14th) the "phone home" signal arrived: New Horizons had survived the flyby and was well (Astronomy magazine, from NASA).',
    pathFlyby: 'JPL Horizons\' track of the craft about Pluto, as this site\'s own file of it has it; its attitude is drawn nose-forward, and is ours',
    srcTimetable: 'The encounter timetable of 14 July 2015 as printed from NASA, "Pluto\'s time to shine just hours away" (the closest approach, 30 800 mph, Charon 14 minutes later)',
    srcHorizons: 'JPL Horizons, spacecraft -98 about Pluto (the track: the range rate changes sign between 11:48 and 11:49 UT), and this site\'s file of it',
    srcWiki: 'New Horizons, Wikipedia (Charon\'s closest approach, 12:02:22 UTC)',
    srcPhone: '"Phoning home from Pluto", Astronomy magazine (the 8:53 pm EDT signal)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);
