// The words of the Moment `sputnik-1` (internal #1058): the launch of 4 October 1957 and one lap of the Earth. Named by the moment's
// `wordsFile`; imported by moments/player.js only, never at boot. Every time is the published one (Wikipedia, "Sputnik 1", from NASA,
// NSSDC and the Russian sources it cites); the sources say so.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'sputnik-1': {
    title: 'Sputnik 1: the first satellite',
    blurb: 'Baikonur, 4 October 1957: the first artificial satellite, a polished sphere of 585 mm, from the pad to its first lap of the Earth, with its beep.',
    chPad: 'Site 1',
    chAscent: 'Lift-off',
    chBoosters: 'The strap-ons',
    chCore: 'The core stage',
    chSep: 'PS-1 is let go',
    chOrbit: 'One lap',
    ready: 'T−10 s at Site 1, Baikonur: the 8K71PS rocket and, under its cone, a sphere of 585 mm. 19:28:34 UTC on 4 October 1957, already the 5th at the launch site.',
    liftoff: 'Lift-off. The core stage and the four strap-on blocks of the R-7 burn together; the military rocket has been stripped of its warhead for this.',
    regulator: 'About 16 s in a fuel regulator fails: the core stage burns kerosene too fast and its thrust runs 4 percent high for most of the flight. The mission survives it.',
    boosters: 'T+116 s: the four strap-on blocks fall away, as the telemetry shows. The core stage goes on alone.',
    core: 'T+295.4 s: the core stage shuts down, 223 km up at some 7.8 km/s, a second before it was meant to, when a sensor sees the empty kerosene pump racing.',
    sep: 'T+315.3 s, 19.9 s after cut-off: PS-1 is let go. The cone falls away, the four whips swing out (not animated here) and the transmitter starts.',
    beep: 'The first beeps are heard at tracking station IP-1 for two minutes, until the satellite sinks below the horizon. The sound is NASA\'s recording of the signal.',
    shadow: 'The launch was just after midnight at the site, and for its first 13 minutes PS-1 flies in the Earth\'s shadow, so it is drawn dark. It comes into sunlight at about T+13 min.',
    orbit: 'Orbit: 223 by 950 km, 65.1 degrees, 96.2 minutes a lap. The core stage follows it round (not drawn).',
    lap: 'One lap in this replay. The batteries ran out on 26 October, after 326 orbits; the sphere fell on 4 January 1958, after about 1 440.',
    pathAscent: 'the published event times, with heights and distances between them approximate',
    pathOrbit: 'the published orbit as a conic from the end of the launch, one lap; the satellite\'s tumble is not drawn',
    srcWiki: 'Sputnik 1, Wikipedia (event times, orbit, dimensions), from NASA, NSSDC and the Russian sources it cites',
    srcNssdc: 'Sputnik 1, NASA NSSDCA Master Catalog (launch and orbit)',
    srcClip: 'The beep: NASA recording, public domain, from Wikimedia Commons',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);
