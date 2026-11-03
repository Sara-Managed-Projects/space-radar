// The words of the Moment `voskhod-2` (internal #1058, release 1.7.2): Leonov's spacewalk and the landing in the taiga, 18 and 19 March 1965.
// Named by the moment's `wordsFile`; imported by moments/player.js only, never at boot. Every time is the published one (Wikipedia, "Voskhod 2";
// Sven Grahn's account, which cites General Kamanin's diary); the sources say so. What is ours is said in the caption where it is shown.
import { COPY } from './en.js';
import './en.moments.js';
import { HOOK } from './lang.js';

Object.assign(COPY.momentStories, {
  'voskhod-2': {
    title: 'Voskhod 2: the first spacewalk',
    blurb: 'Baikonur, 18 March 1965: Alexei Leonov leaves the ship through an inflatable airlock for 12 minutes, and a day later the crew land by hand in the taiga, 386 km from where they should have.',
    chPad: 'Site 1',
    chAscent: 'Lift-off',
    chOrbit: 'Orbit',
    chEva: 'The airlock and the walk',
    chBack: 'The way back in',
    chFail: 'The automatic landing fails',
    chRetro: 'Retrofire by hand',
    chEntry: 'Entry',
    chLand: 'The taiga',
    ready: 'T−10 s at Site 1, Baikonur: the Voskhod rocket, and under its shroud the Voskhod 3KD with Pavel Belyayev and Alexei Leonov. 07:00:00 UTC on 18 March 1965. The rocket drawn is the Vostok-K\'s; the real one had a different third stage.',
    liftoff: 'Lift-off. As on Voskhod 1 there is no way to abort for the first minutes, until the shroud goes.',
    boosters: 'T+119 s: the four strap-on blocks fall away.',
    shroud: 'About T+2.5 minutes: the shroud is jettisoned, and the spacecraft is seen for the first time, with the Volga airlock folded against its sphere.',
    core: 'T+301 s: the core stage is let go and the third stage, the Blok I, takes over for another 240 seconds.',
    orbit: 'Orbit: 167 by 475 km, 64.8 degrees, 90.9 minutes a lap. A Vostok sphere, a retro rocket on top of it as a spare, and two crew seats where Vostok had an ejection seat.',
    volga: 'Belyayev inflates the Volga airlock: some 40 air-booms stiffen a fabric tube 2.5 m long and 1.2 m wide in about seven minutes. The moment he did it is ours; it is drawn already out, not inflating.',
    depress: '08:28:13 UTC: Leonov, in the Berkut suit and its white backpack, depressurises the airlock. The ship\'s electronics were cooled by its air, which is why a lock was needed at all.',
    hatch: '08:32:54: the outer hatch of the airlock is opened.',
    out: '08:34:51: Leonov leaves the airlock, high over north-central Africa, and pushes out to the end of his 5.35 m umbilical. The first person to be in space outside a spacecraft.',
    tether: 'He fixes a camera on the airlock\'s rim and looks down from the Straits of Gibraltar to the Caspian Sea. His pose here is read off a frame of the film.',
    swell: 'His suit has ballooned in the vacuum: he cannot reach the shutter on his leg for his chest camera, and his gloves and boots have stiffened. To get back in he will have to let air out of the suit.',
    back: 'He goes in head first, against the procedure, and sticks sideways in the tube while turning to shut the outer hatch. He lets the suit\'s pressure fall below the safety limit to bend.',
    inside: '08:47:00: back in the airlock; the hatch is closed at 08:48:40. 12 minutes 9 seconds outside, over north-central Africa to eastern Siberia.',
    repress: '08:51:54: the airlock is repressurised. A little later Belyayev fires the bolts, and the airlock is let go (the moment is ours).',
    jettison: 'The Volga is let go and tumbles away; the ship has no way to use it again.',
    auto: 'On revolution 16 the automatic landing system is programmed from the ground, but its command "6" does not go through, reportedly a fault in the Sun orientation system. The burn planned about now (its clock is ours, near) does not happen.',
    manual: '07:16 UTC, 19 March: Vjezna-3 tells the crew by shortwave to switch the automatic system off and use manual descent. Belyayev has another revolution to prepare.',
    late: 'The two men, in their suits, cannot get back to their seats once Belyayev has turned the ship by hand with the Vzor optical sight. Retrofire is 46 seconds late.',
    retro: 'Retrofire by hand with the KTDU-60 engine. The clock of it and the place are ours: it was about 45 minutes before the published landing, and the sources do not say.',
    wires: 'The instrument module does not separate cleanly; the sphere spins wildly until the wires burn through at about 100 km. (Drawn parted at entry, a little early.)',
    entry: 'Entry. The 46 seconds put the ship about 386 km past its field, in the forest of the Upper Kama Upland north-east of Perm.',
    chutes: 'The parachutes. Unlike Vostok, nobody ejects: the crew land inside the sphere, with a solid rocket firing at about a metre to soften the touchdown (not drawn).',
    landing: '09:02:17 UTC: touchdown at about 59.57 N 55.47 E, in deep snow in the taiga, 75 km from Perm.',
    taiga: 'The pilots of the search helicopters find the red parachute only hours later. The crew spend two nights in the forest at minus 5 and colder before they ski to a helicopter.',
    pathAscent: 'the published event times, with heights and distances between them approximate',
    pathOrbit: 'the published orbit drifted for a day, the retrofire at a clock and place that are ours, and the entry and the canopy drawn between',
    srcWiki: 'Voskhod 2, Wikipedia (the times of the spacewalk, the orbit, the landing)',
    srcRocket: 'Voskhod (rocket), Wikipedia (the burn times of the three stages)',
    srcGrahn: 'Sven Grahn, "The Voskhod 2 mission revisited" (the failed automatic descent, the call for the manual one, citing General Kamanin\'s diary)',
    srcNssdc: 'Voskhod 2, NASA NSSDCA Master Catalog (launch and orbit)',
  },
});

// The story's words in the visitor's language when a translation has them (copy/lang.js; the other sections are localised by en.moments.js).
if (HOOK.localise) HOOK.localise({ COPY }, ['momentStories']);
