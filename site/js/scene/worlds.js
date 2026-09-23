// The worlds: Earth, the Moon, the Sun, the seven planets, Pluto, Jupiter's four big moons, and
// Phobos, Deimos, Enceladus, Titan, Triton and Charon, each built from a ROW.
//
// Contract: createWorlds(scene) -> { update(tMs), meshFor(id), positionOf(id, tMs),
//                                    setEclipseAllowed(on), eclipse() }
//
// The table below mirrors registry/worlds.yaml, and scripts/check_registry.py refuses the two when
// they disagree on an id, a parent, a radius or a flat colour. Adding Titan was a row here, a row
// there and a row in stage.js's STAGES, plus its orbit in propagate/moons.js -- there is no Mars.js,
// and this file contains no `if (id === ...)` anywhere in its drawing path.
// Ephemerides are astronomy-engine, which is a pure function of time and needs no network.
//
// ---------------------------------------------------------------------------------------------
// THE SCALING, WHICH IS AN EXAGGERATION AND MUST NEVER BE SILENT (spec 0006 requirement 7)
// ---------------------------------------------------------------------------------------------
// Earth, the Moon and the Sun are drawn at TRUE distance and TRUE radius. Nothing about them is
// exaggerated; the Sun really does sit 149 600 units away in an Earth stage, and the logarithmic
// depth buffer is what makes that affordable.
//
// The planets cannot be. Jupiter at opposition is 6.3e8 km, which is 630 000 units, and its true
// angular radius from Earth is 1.1e-4 rad -- a fifth of a pixel on a 1080-tall screen at a 45
// degree field of view. Drawn honestly it is not there. So a planet is drawn at its TRUE
// DIRECTION, at a compressed distance and with a floor on its angular size:
//
//     drawnDistance = DISTANCE_AT_REF_KM * (trueDistance / REF_KM) ^ DISTANCE_EXPONENT
//     drawnRadius   = max( trueRadius * drawnDistance / trueDistance,
//                          drawnDistance * MIN_ANGULAR_RADIUS_RAD )
//
// The exponent keeps the ordering and the relative motion (Venus really does come closer) while
// squeezing 4.1e7 .. 4.5e9 km into 1 450 .. 4 700 units. The angular floor of 0.0035 rad is an
// apparent diameter of 0.40 degrees -- a little smaller than the real Moon, so a planet is a
// findable disc and not a fake moon.
//
// `viewScale(id)` returns the exact numbers, and the card is expected to print them. The one
// thing never altered is DIRECTION: where a planet is in the sky is measured, always.
//
// ---------------------------------------------------------------------------------------------
// AND FROM A STAGE THAT IS NOT EARTH (2026-09-22)
// ---------------------------------------------------------------------------------------------
// The rule above was written for the Earth stage, where it works because Earth is INSIDE the
// planetary system: the eight planets and Pluto sit at every elongation, and measured from Earth
// on 2026-09-22 at 1280x800 the nearest two discs belonging to different systems were the Moon and
// Pluto, 8.2 degrees -- 138 pixels -- apart. There is room for everything.
//
// From outside that system there is not. An observer at Saturn or Pluto sees everything nearer the
// Sun than itself inside a cone of arcsin(a / d) around the Sun, and DIRECTION IS MEASURED, ALWAYS:
// no compression of distance can widen that cone. Measured the same day, same viewport:
//
//   from SATURN   Mercury and Venus are 0.137 degrees = 2.3 px apart, and the floor drew each of
//                 them 3.4 px in radius: Mercury's centre sat INSIDE Venus's disc. Earth, Mercury,
//                 Venus and the Sun all fell within 1.5 degrees, 26 px, of one another.
//   from PLUTO    85 pairs of drawn discs were within 140 px; Earth and Mars were 5.8 px apart with
//                 6.8 px of radii between them. Every compressed world was drawn between 4.77e6 and
//                 5.26e6 km, a spread of 10 %, so the compressed distance carried no information
//                 either.
//
// So the exaggeration was breaking this file's own rule -- nothing is drawn inside anything else --
// and it was the exaggeration doing it, not the sky: the true discs are a thousandth of a pixel.
// The floor is therefore CAPPED BY THE NEIGHBOURS: a compressed world is never drawn wider than
// NEIGHBOUR_SHARE of the angle to the nearest other compressed world, so two of them always keep a
// gap of (1 - 2 x NEIGHBOUR_SHARE) of that angle between their edges, and never smaller than one
// pixel of radius, below which a disc is nothing at all. The angle is measured from the CAMERA,
// like the moon floor (#214): a camera 3.5 world radii out looks at the shell from the side, and
// that parallax closed the Mercury-Venus gap from 0.21 degrees at Saturn's centre to 0.137 at the
// arrival camera. `viewScale(id).note` says when the cap bit, and which world it was.
//
// Only the compressed worlds are counted. A moon drawn around ANOTHER planet, and the Sun, are
// not: a planet must not shrink because a 6 km rock drawn as a one-pixel dot passes in front of
// it, and a planet crossing the Sun is a real conjunction. Measured over three dates from five
// stages, that leaves one such pair at a time (Venus over Deimos from Pluto; Venus over Phobos and
// the Sun from Jupiter on 2026-01-01), each a 1 px dot on a 1 to 3 px disc, against seven
// planet-on-planet overlaps from Pluto alone before the cap.
//
// What this does NOT change: from Earth the nearest cross-system pair is 0.143 rad and
// NEIGHBOUR_SHARE x 0.143 = 0.057 rad, sixteen times the 0.0035 floor, so every disc keeps the size
// it had. Measured before and after, three dates: every compressed world 3.35 to 3.40 px, and the
// drawn radius in km identical, because when the cap does not bite the arithmetic is the old one.
//
// The other half of the same defect was the MOON. Its row says VIEW_TRUE because from the Earth
// stage it is true, and `view` was read as if it held from everywhere -- so from Saturn the Moon
// was drawn at its true 1.265e9 km, 371 times farther out than the drawn Earth, 0.0013 px in
// radius, and still took a label: a name beside nothing, 1.5 px from Earth's. A row's `view` says
// how a world is drawn from INSIDE ITS OWN SYSTEM. From outside one, the PARENT decides: a world
// that goes round a planet is drawn with that planet, exactly like Io, Titan and Charon; a world
// that goes round the Sun is compressed; and the Sun, which goes round nothing, is never either.
//
// A MOON OF A SQUEEZED PLANET (VIEW_WITH_PARENT) cannot keep its own direction, and the numbers say
// why. From Earth on 2026-09-22 Jupiter is drawn 0.0035 rad in radius where the real one is
// 7.8e-5 -- 45 times wider -- and Callisto, the outermost big moon, is 0.0021 rad from the real
// Jupiter's centre. Drawn in its own true direction every one of the four would sit INSIDE the
// enlarged Jupiter disc. So a moon is drawn around its planet's drawn disc at the planet's own
// enlargement: offset from the planet's true centre, times drawnRadius / trueRadius, added to the
// drawn centre -- the same arithmetic viewAdjust() below applies to a rover on Mars. The system
// keeps its true shape measured in planet radii; across the sky it is 45 times wider, and the card
// says so. The moon's own radius takes the same factor, with a floor of MOON_VIEW's angle so it is
// a dot rather than nothing: Europa at Jupiter's scale would be 0.08 of a pixel in radius on an
// 800-pixel screen, and with the floor it is one.

import * as THREE from '../../vendor/three.module.min.js';
import * as Astronomy from '../../vendor/astronomy.js';
import { stage, SUN_INERTIAL, EARTH_INERTIAL, isLadderStage } from './stage.js';
import { j2000ToTeme, rotateDir, stageFrame, isPlanetMoon, worldHelioEclKm } from '../propagate/frames.js';
import { createEarth, updateEarth, updateEarthEclipse } from './earth.js';
import { ECLIPSE_GLSL, eclipseLikely, MOON_RADIUS_KM } from './eclipse.js';
import { COPY, t, fmt } from '../copy/en.js';

const KM_PER_AU = Astronomy.KM_PER_AU;
const DEG = Math.PI / 180;

// --- the exaggeration, named and exported so the UI can say it ---------------------------------

export const PLANET_VIEW = {
  /** 1 au, the distance the shell is anchored at. */
  REF_KM: 1.495978707e8,
  /** Where a body 1 au away is drawn, in km of the stage's frame. 2 000 units at unit_km 1000. */
  DISTANCE_AT_REF_KM: 2.0e6,
  /** 0.25: Neptune ends up 3.2x farther out than Venus, not 110x. */
  DISTANCE_EXPONENT: 0.25,
  /** 0.0035 rad = 0.40 degrees across. The Moon is 0.52. */
  MIN_ANGULAR_RADIUS_RAD: 0.0035,
  /**
   * 0.4: the most of the way to the nearest other compressed world a disc may reach. Two discs
   * that both take it are separated by an angle and cover 0.8 of it, so a fifth of the gap between
   * their centres is always empty sky. From Earth nothing comes near this (the nearest cross-system
   * pair on 2026-09-22 was 0.143 rad, and 0.4 x 0.143 is sixteen floors); from Saturn it is what
   * stops Mercury being drawn inside Venus.
   */
  NEIGHBOUR_SHARE: 0.4,
  /**
   * 0.001 rad, one pixel of radius on an 800-pixel screen at the 45 degree field of view: the same
   * least-a-ball-can-be as MOON_VIEW's floor below. The neighbour cap stops here. Two worlds closer
   * together than two pixels cannot be told apart from this stage whatever is drawn, and two dots
   * touching is a truer picture of that than one disc with another hidden inside it.
   */
  MIN_VISIBLE_ANGULAR_RADIUS_RAD: 0.001,
};

/** Sun and Moon: true distance, true radius, nothing exaggerated. */
const VIEW_TRUE = 'true';
/** Planets: true direction, compressed distance, floored angular size. */
const VIEW_COMPRESSED = 'compressed';
/** A moon of a compressed planet: its true place around the planet, at the planet's drawn scale. */
const VIEW_WITH_PARENT = 'with-parent';

export const MOON_VIEW = {
  /**
   * 0.001 rad is one pixel of radius on an 800-pixel-tall screen at the 45 degree field of view:
   * the least a ball can be and still be seen. Under a third of PLANET_VIEW's floor, so a moon is
   * always drawn smaller than the planet it goes round.
   */
  MIN_ANGULAR_RADIUS_RAD: 0.001,
};


/** Other names people type. Mirrors `aliases:` in registry/worlds.yaml; search reads them. */
export const WORLD_ALIASES = {
  sun: ['Sol', 'our star'],
  earth: ['Terra', 'home'],
  moon: ['Luna'],
  mars: ['the Red Planet'],
  venus: ['the Morning Star', 'the Evening Star'],
  pluto: ['134340 Pluto'],
  io: ['Jupiter I'],
  europa: ['Jupiter II'],
  ganymede: ['Jupiter III'],
  callisto: ['Jupiter IV'],
  // The numbered designations people also type: Titan is Saturn VI, Triton is Neptune I.
  phobos: ['Mars I'],
  deimos: ['Mars II'],
  enceladus: ['Saturn II'],
  titan: ['Saturn VI'],
  triton: ['Neptune I'],
  charon: ['Pluto I'],
  // The rest of Saturn's round moons and all five of Uranus's (2026-09-22). The numbers are the
  // order of discovery as NASA's satellite fact sheets print them, which is why Uranus's run
  // Ariel I, Umbriel II, Titania III, Oberon IV and Miranda V rather than outward from the planet.
  mimas: ['Saturn I'],
  tethys: ['Saturn III'],
  dione: ['Saturn IV'],
  rhea: ['Saturn V'],
  iapetus: ['Saturn VIII'],
  miranda: ['Uranus V'],
  ariel: ['Uranus I'],
  umbriel: ['Uranus II'],
  titania: ['Uranus III'],
  oberon: ['Uranus IV'],
};


// --- the worlds as RECORDS (spec 0028 step 0) ---------------------------------------------------
//
// One record per world so the rest of the app -- the layer list, search, a tap, the card -- can
// treat a planet like any other object. The record's id IS the world id (`mars`), which is what
// ui/cards.js already keys its Moon sentence on. `propagator: body` is the contract's own ephemeris
// propagator, so `propagate(record, t)` answers with the TRUE position; the drawn disc may be
// nearer (PLANET_VIEW), and main.js asks `drawnPositionOf` when it wants the disc.

/** @returns {Array<Object>} one record per world, klass `world`, layer `worlds`. */
// Every world card ended "Source not recorded". The positions are not unsourced: propagate/body.js
// computes them with Astronomy Engine, whose licence and version CREDITS.md already records. The
// card reads `meta.cite` first (ui/cards.js sourceRow), so this is where the world says so.
const WORLD_CITE = 'computed with Astronomy Engine (Don Cross, MIT licence): truncated VSOP87 for the planets, ELP for the Moon';

export function worldRecords() {
  return WORLDS.map((w) => ({
    id: w.id,
    name: w.display,
    klass: 'world',
    layer: 'worlds',
    propagator: 'body',
    body: w.body,
    world: w.id,
    frame: w.frame,
    cls: 'measured',
    meta: {
      worldId: w.id,
      radiusKm: w.radiusKm,
      parent: w.parent,
      aliases: (WORLD_ALIASES[w.id] || []).slice(),
      view: w.view,
      // Pluto and the moons are not VSOP87, so WORLD_CITE would be wrong about them; theirs names
      // their own method and where their facts were read (copy/en.js worldFacts).
      cite: COPY.worldFacts.cite[w.id] || WORLD_CITE,
      // A world with no surface map says so on its card (ui/cards.js drawingLine), and one that is
      // not round says the ball is not its shape.
      flat: !!w.look.flat,
      irregular: !!w.look.irregular,
    },
  }));
}

/**
 * The fair-to-the-small-thing rule for discs, pure so a test can hold it (spec 0028 req 4).
 * Each candidate is {id, cx, cy, r} in PIXELS from the top-left. A tap counts for a disc when it
 * lands within `forgivePx` of the disc's EDGE; among those, the SMALLER disc wins, then the nearer.
 * A finger that lands on a tiny moon drawn over a big planet means the moon.
 */
export function pickWorldDisc(candidates, tapX, tapY, forgivePx = 24) {
  let best = null;
  for (const c of candidates) {
    if (!c || !(c.r >= 0)) continue;
    const edge = Math.max(0, Math.hypot(c.cx - tapX, c.cy - tapY) - c.r);
    if (edge > forgivePx) continue;
    if (!best || c.r < best.r || (c.r === best.r && edge < best.edge)) best = { ...c, edge };
  }
  return best;
}

// --- the rows ----------------------------------------------------------------------------------
// Mirrors registry/worlds.yaml. `textures` are the exact filenames in site/textures/.
//
// `tint` is the colour a world is drawn in UNTIL its map is loaded, and it is not a design choice:
// it is the texture's own mean, measured on 2026-09-16 by decoding each file, weighting every row
// of the equirectangular map by cos(latitude) so the poles count for the area they cover, and
// averaging in LINEAR light before converting back to sRGB -- the shader works in linear, so an
// sRGB average would draw the flat disc darker than the textured one it stands in for. Re-measure
// it if a texture changes; a Mars dot the wrong red is exactly the kind of thing nobody notices.

export const WORLDS = [
  {
    id: 'sun', display: 'The Sun', parent: '', radiusKm: 696340.0,
    body: 'Sun', frame: SUN_INERTIAL, view: VIEW_TRUE,
    look: { map: '2k_sun.jpg', tint: 0xf18833, emissive: true, corona: true },
  },
  {
    id: 'earth', display: 'Earth', parent: 'sun', radiusKm: 6371.0,
    body: 'Earth', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'earth-gmst',
    // The night and cloud maps are WebP and the day map is not, on purpose. Both of those are read
    // as brightness, and lossy WebP keeps brightness at full resolution; the day map is also read
    // as COLOUR -- the ocean mask is blue minus red (earth.js OCEAN_MASK) -- and WebP halves colour
    // resolution. Measured: 1.6 % of the map's pixels changed between sea and land.
    look: { earth: true, day: '2k_earth_daymap.jpg', night: '2k_earth_nightmap.webp', clouds: '2k_earth_clouds.webp' },
  },
  {
    id: 'moon', display: 'The Moon', parent: 'earth', radiusKm: 1737.4,
    body: 'Moon', frame: EARTH_INERTIAL, view: VIEW_TRUE, rotation: 'iau',
    look: { map: '2k_moon.jpg', tint: 0x9b9796 },
  },
  {
    id: 'mercury', display: 'Mercury', parent: 'sun', radiusKm: 2439.7,
    body: 'Mercury', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_mercury.jpg', tint: 0x848383 },
  },
  {
    id: 'venus', display: 'Venus', parent: 'sun', radiusKm: 6051.8,
    body: 'Venus', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_venus_atmosphere.jpg', tint: 0xe6bf81 },
  },
  {
    id: 'mars', display: 'Mars', parent: 'sun', radiusKm: 3389.5,
    body: 'Mars', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_mars.jpg', tint: 0xb75d41 },
  },
  {
    id: 'jupiter', display: 'Jupiter', parent: 'sun', radiusKm: 69911.0,
    body: 'Jupiter', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_jupiter.jpg', tint: 0xb3aba1 },
  },
  {
    id: 'saturn', display: 'Saturn', parent: 'sun', radiusKm: 58232.0,
    body: 'Saturn', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_saturn.jpg', tint: 0xdfcca8, ring: { innerKm: 74500, outerKm: 140220, map: '2k_saturn_ring_alpha.png' } },
  },
  {
    id: 'uranus', display: 'Uranus', parent: 'sun', radiusKm: 25362.0,
    body: 'Uranus', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_uranus.jpg', tint: 0x9eced5 },
  },
  {
    id: 'neptune', display: 'Neptune', parent: 'sun', radiusKm: 24622.0,
    body: 'Neptune', frame: SUN_INERTIAL, view: VIEW_COMPRESSED, rotation: 'iau',
    look: { map: '2k_neptune.jpg', tint: 0x395eb7 },
  },
  // THE FLAT ONES. No map ships for these five and none is fetched (`flat: true`, no `map`), so the
  // tint is not a texture's mean like the rows above: it is a HUE from a published description,
  // made lighter or darker in the order of the measured geometric albedo (`albedo`, from the NASA
  // fact sheets registry/worlds.yaml cites) -- Europa 0.68, Io 0.62, Pluto 0.52, Ganymede 0.44,
  // Callisto 0.19. tests/test_worlds_layer.mjs holds the order. The card says the colour was
  // chosen, not measured. No `rotation`: there is nothing on a plain ball to turn.
  //
  // The moons come AFTER Jupiter on purpose: update() places a moon from its planet's drawn disc,
  // so the planet has to have been placed first in the same frame.
  {
    // "charcoal black, to dark orange and white" (Wikipedia): a light orange-tan.
    id: 'pluto', display: 'Pluto', parent: 'sun', radiusKm: 1188.3,
    body: 'Pluto', frame: SUN_INERTIAL, view: VIEW_COMPRESSED,
    look: { flat: true, tint: 0xb4926f, albedo: 0.52 },
  },
  {
    // "shades of yellow, red, white, black, and green, largely due to ... sulfur" (Wikipedia).
    id: 'io', display: 'Io', parent: 'jupiter', radiusKm: 1821.5,
    body: 'Io', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xc9b061, albedo: 0.62 },
  },
  {
    // "a pale ... surface striated by light tan cracks and streaks" (Wikipedia).
    id: 'europa', display: 'Europa', parent: 'jupiter', radiusKm: 1560.8,
    body: 'Europa', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xd6cfc0, albedo: 0.68 },
  },
  {
    // "very old, highly cratered, dark regions and somewhat younger ... lighter regions" (Wikipedia).
    id: 'ganymede', display: 'Ganymede', parent: 'jupiter', radiusKm: 2631.2,
    body: 'Ganymede', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x958b7e, albedo: 0.44 },
  },
  {
    // "Callisto's surface has an albedo of about 20%" (Wikipedia): the darkest of the four.
    id: 'callisto', display: 'Callisto', parent: 'jupiter', radiusKm: 2410.3,
    body: 'Callisto', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x5e564c, albedo: 0.19 },
  },
  // SIXTEEN MORE MOONS (six on 2026-09-22, ten more the same day), flat like the five above and in
  // the same one light-to-dark order: their albedos are NASA's fact sheets' too (the Saturnian,
  // Uranian, Neptunian and Mars sheets, Pluto's for Charon). All twenty-one flat worlds now run
  // Enceladus 1.0, Tethys 0.8, Triton 0.72, Dione 0.7, Rhea 0.7, Europa 0.68, Io 0.62, Mimas 0.6,
  // Pluto 0.52, Ganymede 0.44, Charon 0.42, Ariel 0.39, Miranda 0.32, Iapetus 0.275, Titania 0.27,
  // Oberon 0.23, Titan 0.22, Umbriel 0.21, Callisto 0.19, Deimos 0.08, Phobos 0.07, and the test
  // holds every one of them. Radii are JPL's satellite physical parameters. Where they are is
  // propagate/moons.js (fitted to JPL Horizons, error measured there). Each comes after its planet,
  // for the reason above; Mars, Saturn, Uranus and Neptune are planets and Pluto is first of the
  // flat rows.
  //
  // TITAN'S TINT MOVED on 2026-09-22, from #a8702e to #8f5e26: the same orange, darker. It was the
  // only row that had to. Ten more worlds had to fit between Charon (albedo 0.42) and Callisto
  // (0.19), five of them between Charon and Titan, and Titan's old orange was light enough
  // (luminance 0.20 against Charon's 0.26) that the five would have had to share four hundredths of
  // a luminance and come out as one grey. Titan is now 0.14, which is still above Callisto's 0.10
  // and leaves the five a step apiece.
  {
    // "the most reflective body in the solar system ... bright white all over" (NASA Science).
    id: 'enceladus', display: 'Enceladus', parent: 'saturn', radiusKm: 252.1,
    body: 'Enceladus', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xeff1f1, albedo: 1.0 },
  },
  {
    // "Titan's orange color comes from a thick atmospheric haze" (Wikipedia): the haze, not the
    // ground, is what anyone has seen of Titan in visible light. Darkened 2026-09-22, same hue.
    id: 'titan', display: 'Titan', parent: 'saturn', radiusKm: 2574.76,
    body: 'Titan', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x8f5e26, albedo: 0.22 },
  },
  {
    // "Triton's reddish color" (Wikipedia) on frost with "an icy sheen" (NASA Science): a pale pink.
    id: 'triton', display: 'Triton', parent: 'neptune', radiusKm: 1352.6,
    body: 'Triton', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xe3d4cc, albedo: 0.72 },
  },
  {
    // "Charon's color palette is not as diverse as Pluto's. Most striking is the reddish north
    // (top) polar region" (NASA Science): a grey, faintly warm.
    id: 'charon', display: 'Charon', parent: 'pluto', radiusKm: 606.0,
    body: 'Charon', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x8e8a86, albedo: 0.42 },
  },
  {
    // "composed of C-type rock, similar to blackish carbonaceous chondrite asteroids" (NASA
    // Science, of both moons of Mars). `irregular`: a lumpy rock drawn as a ball of its mean
    // radius, and its card says the true shape is not drawn.
    id: 'phobos', display: 'Phobos', parent: 'mars', radiusKm: 11.08,
    body: 'Phobos', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x4a4540, albedo: 0.07, irregular: true },
  },
  {
    // The same NASA sentence; a shade lighter than Phobos for its 0.08 against 0.07.
    id: 'deimos', display: 'Deimos', parent: 'mars', radiusKm: 6.2,
    body: 'Deimos', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x524d47, albedo: 0.08, irregular: true },
  },
  // The other five round moons of Saturn, then all five of Uranus's (2026-09-22).
  {
    // "very bright, the second-brightest of the moons of Saturn after Enceladus, and neutral in
    // color" (Wikipedia): a near-white with no hue to speak of.
    id: 'tethys', display: 'Tethys', parent: 'saturn', radiusKm: 531.1,
    body: 'Tethys', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xe3e5e7, albedo: 0.8 },
  },
  {
    // "a network of bright ice cliffs" on ice over "a dense core (probably silicate rock)" (NASA
    // Science, Wikipedia): white ice, faintly warm.
    id: 'dione', display: 'Dione', parent: 'saturn', radiusKm: 561.4,
    body: 'Dione', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xd4d5d3, albedo: 0.7 },
  },
  {
    // "a frozen dirty snowball" (NASA Science): Dione's albedo to the fact sheet's one figure, and
    // the same white a shade dirtier.
    id: 'rhea', display: 'Rhea', parent: 'saturn', radiusKm: 763.5,
    body: 'Rhea', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xd5d3cc, albedo: 0.7 },
  },
  {
    // "consists almost entirely of water ice, which is the only substance ever detected on Mimas"
    // (NASA Science): grey ice.
    id: 'mimas', display: 'Mimas', parent: 'saturn', radiusKm: 198.2,
    body: 'Mimas', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0xa7aaac, albedo: 0.6 },
  },
  {
    // The two-faced one: "as dark as coal (albedo 0.03-0.05 with a slight reddish tinge)" on the
    // leading side and "much brighter at 0.5-0.6" on the trailing one (NASA Science). ONE ball
    // cannot be both, so it is drawn at the mean of the fact sheet's 0.05 and 0.5, in the reddish
    // tinge the dark side is described by, and copy/en.js says on the card that it has two faces.
    id: 'iapetus', display: 'Iapetus', parent: 'saturn', radiusKm: 734.3,
    body: 'Iapetus', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x89735f, albedo: 0.275 },
  },
  {
    // "the brightest surface of the five largest Uranian moons, but none of them reflect more than
    // about a third of the sunlight that strikes them ... darkened by a carbonaceous material"
    // (NASA Science): a light neutral grey, and the lightest of Uranus's five.
    id: 'ariel', display: 'Ariel', parent: 'uranus', radiusKm: 578.9,
    body: 'Ariel', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x868786, albedo: 0.39 },
  },
  {
    // "fairly uniformly dark. However, the cliffs bordering certain impact craters reveal, at
    // depth, the presence of much more luminous material" (Wikipedia): mid grey.
    id: 'miranda', display: 'Miranda', parent: 'uranus', radiusKm: 235.8,
    body: 'Miranda', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x7d7f81, albedo: 0.32 },
  },
  {
    // "The neutral gray color of Titania is typical of most of the significant Uranian moons"
    // (NASA Science), against Wikipedia's "relatively dark and slightly red": NASA's grey, since
    // it is the one describing what the colour IS.
    id: 'titania', display: 'Titania', parent: 'uranus', radiusKm: 788.9,
    body: 'Titania', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x767573, albedo: 0.27 },
  },
  {
    // "dark and slightly red in color" (Wikipedia): a dark warm grey.
    id: 'oberon', display: 'Oberon', parent: 'uranus', radiusKm: 761.4,
    body: 'Oberon', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x7a6a62, albedo: 0.23 },
  },
  {
    // "the darkest among Uranian moons" (Wikipedia), "reflects only 16 percent of the light that
    // strikes its surface" (NASA Science): a dark neutral grey, darker than all four of its
    // sisters and than Titan.
    id: 'umbriel', display: 'Umbriel', parent: 'uranus', radiusKm: 584.7,
    body: 'Umbriel', frame: SUN_INERTIAL, view: VIEW_WITH_PARENT,
    look: { flat: true, tint: 0x616060, albedo: 0.21 },
  },
];

const BY_ID = new Map(WORLDS.map((w) => [w.id, w]));

// --- the cel material for everything that is not Earth -------------------------------------------
// docs/design-language.md: real texture, cel LIGHTING -- base, shadow (base x 0.55 shifted toward
// blue), highlight (base x 1.25), band width 0.15, plus a Fresnel rim at 0.35. Two steps put the
// planets beside the drawn objects instead of in a different picture.

const WORLD_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4( position, 1.0 );
  vPosW = worldPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * viewMatrix * worldPos;
  #include <logdepthbuf_vertex>
}
`;

/** Exported for tests/test_eclipse.mjs, which checks the lunar case is spliced in. */
export const WORLD_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uTint;
uniform vec3 uSunDir;
uniform vec3 uRimColour;
uniform float uRimGain;
uniform float uBand;
uniform float uAmbient;
// Spec 0037, 2026-09-23: a lunar eclipse, the mirror of the Earth's (scene/earth.js). Every cel world
// carries the uniforms; only the Moon's are ever filled, and at uEclipse 0 the branch is skipped.
uniform float uEclipse;
uniform vec3  uEarthPosKm;    // the Earth's centre from this body's, km, SCENE axes (true positions)
uniform float uSunDistKm;     // the Sun's centre from this body's, km; its direction is uSunDir
uniform float uBodyRadiusKm;
uniform vec3  uUmbraTint;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vPosW;
${ECLIPSE_GLSL}
void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vNormalW );
  vec3 viewDir = normalize( cameraPosition - vPosW );
  vec3 base = mix( uTint, texture2D( uMap, vUv ).rgb * uTint, uHasMap );

  float d = dot( n, uSunDir );
  vec3 shadow = base * 0.55 * vec3( 0.88, 0.94, 1.14 );   // x0.55, hue shifted toward blue
  vec3 highlight = base * 1.25;

  float b1 = smoothstep( 0.02 - uBand, 0.02 + uBand, d );
  float b2 = smoothstep( 0.55 - uBand, 0.55 + uBand, d );
  vec3 colour = mix( shadow, base, b1 );
  colour = mix( colour, highlight, b2 );

  float lit = smoothstep( -0.10, 0.10, d );
  colour *= mix( uAmbient, 1.0, lit );

  // The Earth covering the Sun, seen from this point of the Moon: the same formula as the Earth's
  // shadow, with the Earth (and 88 km of air, the library's number) as the occluder. The copper in
  // the umbra is ILLUSTRATIVE -- a constant tint on the surface, not light bent through the Earth's
  // air -- and the trip's card says so.
  float eclShade = 1.0;
  if ( uEclipse > 0.5 && d > 0.0 ) {
    float eclObs = eclObscuration( n * uBodyRadiusKm, uSunDir * uSunDistKm, uEarthPosKm, SUN_RADIUS_KM, EARTH_SHADOW_RADIUS_KM );
    eclShade = 1.0 - 0.9 * eclObs;
    colour = mix( colour * eclShade, base * uUmbraTint, smoothstep( 0.97, 1.0, eclObs ) );
  }

  float rim = pow( 1.0 - clamp( dot( n, viewDir ), 0.0, 1.0 ), 3.0 );
  colour += uRimColour * rim * uRimGain * lit * eclShade;

  gl_FragColor = vec4( colour, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function celMaterial(map, tint) {
  return new THREE.ShaderMaterial({
    name: 'world-cel',
    vertexShader: WORLD_VERT,
    fragmentShader: WORLD_FRAG,
    uniforms: {
      uMap: { value: map || null },
      uHasMap: { value: map ? 1 : 0 },
      uTint: { value: new THREE.Color(tint || 0xffffff) },
      uSunDir: { value: new THREE.Vector3(1, 0, 0) },
      uRimColour: { value: new THREE.Color(0xdfe9ff) },
      uRimGain: { value: 0.35 },
      uBand: { value: 0.15 },
      uAmbient: { value: 0.05 },
      uEclipse: { value: 0 },
      uEarthPosKm: { value: new THREE.Vector3(-384400, 0, 0) },
      uSunDistKm: { value: 1.496e8 },
      uBodyRadiusKm: { value: MOON_RADIUS_KM },
      // Copper, chosen (spec 0037 design §3), not computed: the colour of a totally eclipsed Moon in
      // photographs, a mid Danjon L2-L3. Multiplied into the map so the maria still read.
      uUmbraTint: { value: new THREE.Vector3(0.55, 0.22, 0.12) },
    },
  });
}

// --- construction --------------------------------------------------------------------------------

const _pos = new THREE.Vector3();
const _camPosU = new THREE.Vector3();
const _sunScene = new THREE.Vector3(1, 0, 0);
const _sunHere = new THREE.Vector3(1, 0, 0);
const _m4 = new THREE.Matrix4();

/**
 * Unit vector from `fromKm` to `toKm`, both in the stage's frame, expressed in SCENE axes.
 * One place, so the remap (x, z, -y) appears here and in stage.js and nowhere else.
 */
function sunDirFrom(toKm, fromKm, out) {
  if (!toKm || !fromKm) return out; // an unconvertible frame: keep the last direction, not NaN
  const dx = toKm.x - fromKm.x;
  const dy = toKm.y - fromKm.y;
  const dz = toKm.z - fromKm.z;
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return out; // the stage IS the Sun: keep the last direction rather than NaN
  return out.set(dx / len, dz / len, -dy / len);
}

/**
 * A world's map is fetched when its disc is at least this fraction of HALF the view's height --
 * six pixels of radius on an 800-pixel screen. Below it a cel-shaded ball in the texture's own mean
 * colour is the same picture as the textured one, because there are not enough pixels for a
 * surface feature to land on.
 */
export const TEXTURE_AT_HALF_VIEW = 0.015;

export function createWorlds(scene, opts = {}) {
  const base = opts.textureBase === undefined ? 'textures/' : opts.textureBase;
  // No document means no image decoding: a headless test builds every mesh and every
  // material, just without pixels. That is what makes this file testable outside a browser.
  // `opts.loadTexture(url, onLoad)` replaces the loader, which is how a test watches what is
  // fetched and when.
  const canLoad = typeof document !== 'undefined' && typeof THREE.TextureLoader === 'function';
  const threeLoader = canLoad ? new THREE.TextureLoader() : null;
  const load = typeof opts.loadTexture === 'function'
    ? opts.loadTexture
    : threeLoader ? (url, onLoad) => threeLoader.load(url, onLoad) : null;
  const maxAniso = opts.renderer && opts.renderer.capabilities
    ? opts.renderer.capabilities.getMaxAnisotropy()
    : 8;
  // The camera the maps are measured against. Without one nothing is ever fetched lazily, which
  // is what a headless test that only wants geometry needs.
  const camera = opts.camera || null;

  function configure(tex) {
    if (!tex) return tex;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  }

  function texture(name) {
    if (!name || !load) return null;
    return configure(load(base + name));
  }

  // WHY THE PLANETS WAIT. Every world used to fetch its map at construction: fourteen 2048 x 1024
  // textures, 6.4 MB on the wire and about 139 MB of GPU memory once decoded with mipmaps --
  // against a budget of 150 MB for EVERYTHING on a phone (docs/toolkit.md), before a single model,
  // star buffer or framebuffer. And from the default Earth view, every one of the nine maps below is
  // a disc a few pixels across: the Moon is 0.0045 rad, the Sun about the same, and a compressed
  // planet is held at 0.0035 rad (PLANET_VIEW). So a first visit downloaded 4.6 MB of surface
  // detail that could not be drawn. Now a world is drawn in its measured mean colour (`look.tint`)
  // until its disc grows past TEXTURE_AT_HALF_VIEW, or somebody selects it, and then the map loads
  // once and stays. Earth's three maps and the Milky Way are still fetched at once: they are on
  // screen from the first frame.
  const waiting = new Map(); // world id -> { name, apply(tex) }

  function fetchMap(id) {
    const job = waiting.get(id);
    if (!job) return false;
    waiting.delete(id); // before the load, so a second frame over the threshold cannot fetch it twice
    if (!load) return false;
    load(base + job.name, (tex) => job.apply(configure(tex)));
    return true;
  }

  const root = new THREE.Group();
  root.name = 'worlds';
  if (scene) scene.add(root);

  const meshes = new Map();
  const viewState = new Map();
  // The `worlds` layer's switch. The stage world and the Sun stay: one is the ground, the other the light.
  let layerOn = true;

  for (const w of WORLDS) {
    // The map is fetched ONCE, and not here: see `waiting` above. The material is built without it,
    // in the world's measured mean colour, and `apply` swaps the map in when it arrives.
    const map = null;
    const tint = w.look.tint === undefined ? 0xffffff : w.look.tint;
    const mesh = w.look.earth
      ? createEarth({
        day: texture(w.look.day),
        night: texture(w.look.night),
        clouds: texture(w.look.clouds),
      })
      : new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 48),
        // The Sun is not lit by anything, so it does not get the cel material: a flat disc of
        // its own texture, out of the tone mapper's way so it stays white rather than grey.
        w.look.emissive
          ? new THREE.MeshBasicMaterial({ map, color: tint, toneMapped: false, fog: false })
          : celMaterial(map, tint),
      );
    if (!w.look.earth && w.look.map) {
      const material = mesh.material;
      waiting.set(w.id, {
        name: w.look.map,
        apply(tex) {
          if (!tex) return;
          if (material.uniforms) {
            material.uniforms.uMap.value = tex;
            material.uniforms.uHasMap.value = 1;
            material.uniforms.uTint.value.set(0xffffff);
          } else {
            material.map = tex;
            material.color.set(0xffffff);
            material.needsUpdate = true; // a map where there was none is a different shader
          }
        },
      });
    }

    mesh.name = w.id;
    mesh.userData.kind = 'world';
    mesh.userData.worldId = w.id;
    mesh.userData.display = w.display;
    mesh.userData.cls = 'measured';
    mesh.matrixAutoUpdate = true;

    if (w.look.emissive) {
      const halo = coronaSprite();
      if (halo) { mesh.add(halo); mesh.userData.corona = halo; }
    }

    if (w.look.ring) {
      const ring = ringMesh(w, texture(w.look.ring.map));
      mesh.add(ring);
      mesh.userData.ring = ring;
    }

    root.add(mesh);
    meshes.set(w.id, mesh);
    viewState.set(w.id, { exaggerated: false });
  }

  // A directional light at the Sun for anyone drawing with a built-in material (models.js).
  // The world materials here take uSunDir directly and ignore it.
  const sunLight = new THREE.DirectionalLight(0xfff4e6, 3.0);
  sunLight.castShadow = false;
  const sunTarget = new THREE.Object3D();
  root.add(sunLight, sunTarget);
  sunLight.target = sunTarget;

  const fill = new THREE.AmbientLight(0x2a3550, 0.35);
  root.add(fill);

  // Spec 0037: eclipses. `allowed` is main.js's (the frame latch); `solar`/`lunar` are this frame's
  // cheap test (scene/eclipse.js eclipseLikely) from the Earth's centre; the shaders draw when both.
  let eclipseAllowed = true;
  const eclipseState = { solar: false, lunar: false, drawnSolar: false, drawnLunar: false };
  const _moonGeo = { x: 0, y: 0, z: 0 };
  const _sunGeo = { x: 0, y: 0, z: 0 };
  const _moonGeoScene = { x: 0, y: 0, z: 0 };

  // --- per-frame ---------------------------------------------------------------------------------

  // Where each VIEW_WITH_PARENT moon really is, in scene units, for viewAdjust(): its drawn place
  // is not its true place scaled along one line, so the true one is kept rather than recovered.
  const trueCentres = new Map();
  const _parentTrue = new THREE.Vector3();
  // Per-frame scratch, refilled in update() and never reallocated: every world's true position for
  // this instant, the unit directions of the ones the compression is about to move, and how close
  // each of those comes to another.
  const truePos = new Map();
  const crowd = [];
  const crowdSlot = [];
  const nearest = new Map();

  /**
   * Place a moon around its planet's DRAWN disc (the block at the top of this file). `_pos` holds
   * the moon's true scene position on the way in. False -- draw it where it is -- when the planet
   * is not drawn this frame or is not enlarged, which leaves nothing to be drawn around.
   */
  function drawWithParent(w, mesh, trueDistKm) {
    const parentMesh = meshes.get(w.parent);
    const ps = viewState.get(w.parent);
    if (!parentMesh || !parentMesh.visible || !ps || !ps.exaggerated) return false;
    if (!(ps.distanceFactor > 0) || !(ps.trueRadiusKm > 0)) return false;
    const k = ps.drawnRadiusKm / ps.trueRadiusKm;
    // The planet's true centre: the compression kept its direction, so dividing the drawn position
    // by the distance factor undoes it exactly -- viewAdjust() recovers a planet's centre the same way.
    _parentTrue.copy(parentMesh.position).multiplyScalar(1 / ps.distanceFactor);
    if (!trueCentres.has(w.id)) trueCentres.set(w.id, new THREE.Vector3());
    trueCentres.get(w.id).copy(_pos);
    _pos.sub(_parentTrue).multiplyScalar(k).add(parentMesh.position);
    const drawnDistKm = _pos.length() * stage.unitKm;
    const scaledKm = w.radiusKm * k;
    // The floor is a pixel as seen FROM THE CAMERA, not from the stage's origin (2026-09-22). The
    // two agree while the camera sits by Earth; flown up to the drawn Mars it is a hundred times
    // nearer than Earth, and a floor measured from Earth drew Phobos a quarter of Mars's drawn
    // width there, where its real share is 0.3 %. With no camera the origin stands in.
    let viewKm = drawnDistKm;
    if (camera) {
      camera.getWorldPosition(_camPosU);
      viewKm = _pos.distanceTo(_camPosU) * stage.unitKm;
    }
    const floorKm = viewKm * MOON_VIEW.MIN_ANGULAR_RADIUS_RAD;
    const drawnRadiusKm = Math.max(scaledKm, floorKm);
    mesh.position.copy(_pos);
    mesh.scale.setScalar(drawnRadiusKm / stage.unitKm);
    viewState.set(w.id, describe(w, trueDistKm, drawnDistKm, drawnRadiusKm, { parent: ps, floored: floorKm > scaledKm }));
    return true;
  }

  function update(tMs) {
    stage.setTime(tMs);

    // 0. Every world's TRUE position, once. The crowding pre-pass in step 2b and the loop in step 3
    //    both want them, and an ephemeris is the expensive thing in this function -- asking twice
    //    would double it for twenty-one worlds, sixty times a second.
    truePos.clear();
    for (const w of WORLDS) truePos.set(w.id, positionOf(w.id, tMs));

    // 1. The floating origin: where the stage's own world is, in the stage's frame. When the
    //    frame is already centred on that world (the Earth stage in earth-inertial, the Sun
    //    stage in sun-inertial) the origin is zero BY DEFINITION -- taking it from the ephemeris
    //    instead would round-trip 1.5e8 km through two rotations and leave the whole scene
    //    offset by the residual, which measured 9 metres. Exact beats measured when exact is
    //    available.
    const frameWorld = String(stage.frame).split('-')[0];
    if (frameWorld === stage.worldId) {
      stage.setOrigin(null);
    } else {
      const centre = truePos.get(stage.worldId);
      stage.setOrigin(centre ? stage.toStageFrame(centre, centre.frame, tMs) : null);
    }

    // 2. The Sun, in the stage's frame, in km. Everything's lighting is measured from here --
    //    from TRUE positions, never from the drawn ones, or a compressed planet would show the
    //    wrong phase.
    const sunKm = stage.toStageFrame({ x: 0, y: 0, z: 0 }, SUN_INERTIAL, tMs);
    sunDirFrom(sunKm, stage.originKm, _sunScene);
    sunLight.position.copy(_sunScene).multiplyScalar(1e5);
    if (sunLight.position.lengthSq() === 0) sunLight.position.set(0, 1e5, 0);
    sunTarget.position.set(0, 0, 0);

    // 2a. Eclipses (spec 0037). The Sun and the Moon from the Earth's centre, in km, from the TRUE
    //     positions whatever the stage draws them at -- the shadow is geometry, not picture. Three
    //     vector operations decide whether either shader branch runs this frame.
    const earthP = truePos.get('earth');
    const moonP = truePos.get('moon');
    const earthKm = earthP && sunKm ? stage.toStageFrame(earthP, earthP.frame, tMs) : null;
    const moonKm = moonP && earthKm ? stage.toStageFrame(moonP, moonP.frame, tMs) : null;
    eclipseState.solar = false;
    eclipseState.lunar = false;
    if (earthKm && moonKm) {
      _moonGeo.x = moonKm.x - earthKm.x; _moonGeo.y = moonKm.y - earthKm.y; _moonGeo.z = moonKm.z - earthKm.z;
      _sunGeo.x = sunKm.x - earthKm.x; _sunGeo.y = sunKm.y - earthKm.y; _sunGeo.z = sunKm.z - earthKm.z;
      eclipseState.solar = eclipseLikely(_sunGeo, _moonGeo, 'solar');
      eclipseState.lunar = eclipseLikely(_sunGeo, _moonGeo, 'lunar');
      // Scene axes are the stage frame's (x, z, -y): see sunDirFrom().
      _moonGeoScene.x = _moonGeo.x; _moonGeoScene.y = _moonGeo.z; _moonGeoScene.z = -_moonGeo.y;
    }
    eclipseState.drawnSolar = eclipseState.solar && eclipseAllowed;
    eclipseState.drawnLunar = eclipseState.lunar && eclipseAllowed;

    // 2b. HOW CROWDED THE SKY IS, before anything is sized. Where each compressed world WILL be
    //     drawn (its true direction at the compressed distance: step 3 repeats the same two lines),
    //     as a direction FROM THE CAMERA, and from those the angle to the nearest other one. Step 3
    //     holds the angular floor back with it so an enlarged disc cannot reach its neighbour.
    //
    //     From the camera, not from the stage, for the reason #214 measured the moon floor from the
    //     camera: this is a rule about the picture. A camera 3.5 world radii out looks at the shell
    //     from the side, and that parallax closed the Mercury-Venus gap from 0.21 degrees measured
    //     at Saturn's centre to 0.137 measured at the arrival camera (2026-09-22). With no camera
    //     -- a headless test that only wants geometry -- the stage's origin stands in.
    crowd.length = 0;
    const squeezes = compressesFrom(stage.worldId);
    const haveCam = !!camera;
    if (haveCam) camera.getWorldPosition(_camPosU);
    // Last frame's answers, blanked rather than thrown away: a world that drops out of the crowd
    // (the stage changed, a frame refused to convert) must read as "nobody near", not as whatever
    // it read last time.
    for (const entry of nearest.values()) { entry.rad = Infinity; entry.id = ''; }
    for (const w of WORLDS) {
      if (w.view !== VIEW_COMPRESSED || !squeezes || sameSystem(w.id, stage.worldId)) continue;
      const p = truePos.get(w.id);
      if (!p) continue;
      if (!crowdSlot[crowd.length]) crowdSlot[crowd.length] = { id: '', dir: [0, 0, 0], v: new THREE.Vector3() };
      const slot = crowdSlot[crowd.length];
      const v = slot.v;
      if (!stage.toSceneInto(p, p.frame, v, tMs) || v.lengthSq() === 0) continue;
      v.setLength(drawnDistanceKm(v.length() * stage.unitKm) / stage.unitKm);
      if (haveCam) v.sub(_camPosU);
      if (v.lengthSq() === 0) continue;
      v.normalize();
      slot.id = w.id;
      slot.dir[0] = v.x; slot.dir[1] = v.y; slot.dir[2] = v.z;
      crowd.push(slot);
    }
    nearestNeighbours(crowd, nearest);

    // 3. Every world.
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh) continue;
      const p = truePos.get(w.id);
      if (!p) { mesh.visible = false; continue; }
      mesh.visible = layerOn || w.id === stage.worldId || w.id === 'sun';

      // The world's own true position in the stage's frame, and from it the direction to the
      // Sun that lights it. Both in km, both before any of the drawing exaggeration below.
      const pKm = stage.toStageFrame(p, p.frame, tMs);
      const sunDirHere = sunDirFrom(sunKm, pKm, _sunHere);

      const isStage = w.id === stage.worldId;
      // Earth's mesh is in equatorial radii, not mean radii, so it says what to scale it by.
      const meshRadiusKm = mesh.userData.scaleRadiusKm || w.radiusKm;
      const trueRadiusUnits = meshRadiusKm / stage.unitKm;

      if (isStage) {
        mesh.position.set(0, 0, 0);
        mesh.scale.setScalar(trueRadiusUnits);
        viewState.set(w.id, describe(w, 0, 0));
      } else {
        // A null here is stage.js refusing a frame it cannot convert. Drawing the world at the
        // last position it happened to have is exactly the silent lie this refusal exists for.
        if (!stage.toSceneInto(p, p.frame, _pos, tMs)) { mesh.visible = false; continue; }
        const trueDistKm = _pos.length() * stage.unitKm;
        // Outside the world's own system the row's `view` no longer decides: its PARENT does. A
        // world that goes round a planet is drawn with that planet (the Moon from Saturn as much as
        // Io from Earth), a world that goes round the Sun is compressed, and the Sun is neither.
        const outside = squeezes && !sameSystem(w.id, stage.worldId);
        if (outside && w.parent && w.parent !== 'sun'
          && drawWithParent(w, mesh, trueDistKm)) {
          // placed around its planet's drawn disc (the block at the top of this file)
        } else if (outside && w.view === VIEW_COMPRESSED && trueDistKm > 0) {
          const drawnKm = drawnDistanceKm(trueDistKm);
          const shrink = drawnKm / trueDistKm;
          _pos.setLength(drawnKm / stage.unitKm);
          // THE FLOOR, AND THE CAP THAT KEEPS IT OFF THE NEIGHBOURS. They are measured from two
          // different places on purpose. The floor is an angle at the STAGE, because it says what a
          // planet IS here: a body 0.40 degrees across on a shell around the stage world, the same
          // size from wherever the camera stands, so a rover's marker on it (viewAdjust) does not
          // crawl as the camera orbits. The cap is an angle at the CAMERA, because it is a rule
          // about the PICTURE: one disc must not cover another on the screen being looked at. When
          // nothing is crowded the cap IS the floor and this is the arithmetic the Earth stage has
          // always run, to the last digit.
          const near = nearest.get(w.id) || { rad: Infinity, id: '' };
          const capRad = cappedAngularRadiusRad(near.rad);
          const crowded = capRad < PLANET_VIEW.MIN_ANGULAR_RADIUS_RAD;
          const viewKm = haveCam ? _pos.distanceTo(_camPosU) * stage.unitKm : drawnKm;
          const drawnRadiusKm = Math.max(
            w.radiusKm * shrink,
            (crowded ? viewKm : drawnKm) * capRad,
          );
          mesh.position.copy(_pos);
          mesh.scale.setScalar((drawnRadiusKm * (meshRadiusKm / w.radiusKm)) / stage.unitKm);
          viewState.set(w.id, describe(w, trueDistKm, drawnKm, drawnRadiusKm, null, crowded ? near : null));
        } else {
          mesh.position.copy(_pos);
          mesh.scale.setScalar(trueRadiusUnits);
          viewState.set(w.id, describe(w, trueDistKm, trueDistKm, w.radiusKm));
        }
      }

      // 4. Orientation and lighting.
      if (w.look.earth) {
        updateEarth(mesh, sunDirHere, tMs);
        updateEarthEclipse(mesh, eclipseState.drawnSolar, _moonGeoScene, Math.hypot(_sunGeo.x, _sunGeo.y, _sunGeo.z));
      } else {
        if (w.rotation === 'iau') applyIauOrientation(mesh, w.body, tMs, w.id);
        if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.uSunDir) {
          mesh.material.uniforms.uSunDir.value.copy(sunDirHere);
        }
        if (w.id === 'moon' && mesh.material && mesh.material.uniforms && mesh.material.uniforms.uEclipse) {
          const u = mesh.material.uniforms;
          u.uEclipse.value = eclipseState.drawnLunar ? 1 : 0;
          if (eclipseState.drawnLunar) {
            // The Earth from the Moon, and the Sun's distance from the Moon, in the scene axes the
            // fragment's normal is in; the Moon's orientation does not enter.
            u.uEarthPosKm.value.set(-_moonGeoScene.x, -_moonGeoScene.y, -_moonGeoScene.z);
            u.uSunDistKm.value = Math.hypot(sunKm.x - moonKm.x, sunKm.y - moonKm.y, sunKm.z - moonKm.z);
          }
        }
      }

      if (mesh.userData.corona) {
        // Keep the bloom at a constant angular size: it scales with the disc, which is drawn
        // at true angular size, so nothing to do but keep it facing the camera (Sprite does).
        mesh.userData.corona.material.rotation = 0;
      }

      // 5. Big enough to show a surface? Then fetch it. The same angular arithmetic as pick():
      //    radius over distance, over tan(fov / 2), is the disc's share of half the view height.
      if (camera && mesh.visible && waiting.has(w.id)) {
        camera.getWorldPosition(_camPosU);
        const dist = mesh.position.distanceTo(_camPosU);
        const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
        if (!(dist > 0) || mesh.scale.x / dist / tanHalfFov >= TEXTURE_AT_HALF_VIEW) fetchMap(w.id);
      }
    }
  }

  /**
   * Fetch a world's map now, whatever size it is drawn. main.js calls this when a world is
   * selected, so a flight toward Saturn spends its 900 ms downloading Saturn rather than arriving
   * at a flat tan ball and waiting. Returns true if this call started a fetch.
   */
  function preload(id) { return fetchMap(id); }

  /** The worlds still drawn in their mean colour, for the test and the status panel. */
  function waitingMaps() { return [...waiting.keys()]; }

  function meshFor(id) { return meshes.get(id) || null; }

  // --- the worlds as objects under a finger (spec 0028 step 0) ---------------------------------

  /** The `worlds` layer's checkbox. The stage world and the Sun are never hidden by it. */
  function setVisible(on) { layerOn = on !== false; }

  /** main.js: false under the frame latch, and the eclipse branches stay off (spec 0037 req 3). */
  function setEclipseAllowed(on) { eclipseAllowed = on !== false; }

  /** This frame's eclipse test and whether each shader drew it: {solar, lunar, drawnSolar, drawnLunar}. */
  function eclipse() { return { ...eclipseState }; }

  /** Where the DISC is, in scene units -- the compressed position, not the true one. */
  function drawnPositionOf(id, out) {
    const mesh = meshes.get(id);
    if (!mesh || !mesh.visible) return null;
    return (out || new THREE.Vector3()).copy(mesh.position);
  }

  /** The disc's radius in scene units, as drawn (equatorial for Earth, mean for the rest). */
  function drawnRadiusUnits(id) {
    const mesh = meshes.get(id);
    return mesh ? mesh.scale.x : 0;
  }

  const _proj = new THREE.Vector3();
  const _camPos = new THREE.Vector3();

  /**
   * Which world, if any, a tap meant. NDC in, a record out (or null). Every visible disc is
   * projected; `pickWorldDisc` decides. Called by main.js AFTER the glyph layers have had their
   * turn, so a satellite drawn over a planet still wins -- a glyph has no radius to subtract and
   * is always the smaller thing.
   */
  /**
   * Every disc within the forgiveness rule as {record, edge, r} for scene/pickrank.js; pick() is
   * the one-winner form.
   */
  function pickAll(ndcX, ndcY, camera, viewport, forgivePx = 24) {
    if (!camera || !viewport || !(viewport.w > 0) || !(viewport.h > 0)) return [];
    camera.updateMatrixWorld();
    camera.getWorldPosition(_camPos);
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    const tapX = (ndcX + 1) * halfW;
    const tapY = (1 - ndcY) * halfH;
    const records = worldRecords();
    const out = [];
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh || !mesh.visible) continue;
      const dist = mesh.position.distanceTo(_camPos);
      if (!(dist > 0)) continue;
      _proj.copy(mesh.position).project(camera);
      if (_proj.z > 1) continue;
      const r = (mesh.scale.x / dist / tanHalfFov) * halfH;
      const edge = Math.max(0, Math.hypot((_proj.x + 1) * halfW - tapX, (1 - _proj.y) * halfH - tapY) - r);
      if (edge > forgivePx) continue;
      const record = records.find((x) => x.id === w.id);
      if (record) out.push({ record, edge, r });
    }
    return out.sort((p, q) => (p.r - q.r) || (p.edge - q.edge));
  }

  function pick(ndcX, ndcY, camera, viewport) {
    if (!camera || !viewport || !(viewport.w > 0) || !(viewport.h > 0)) return null;
    camera.updateMatrixWorld();
    camera.getWorldPosition(_camPos);
    const halfW = viewport.w * 0.5;
    const halfH = viewport.h * 0.5;
    const tanHalfFov = Math.tan(((camera.fov || 45) * Math.PI) / 360);
    const candidates = [];
    for (const w of WORLDS) {
      const mesh = meshes.get(w.id);
      if (!mesh || !mesh.visible) continue;
      const dist = mesh.position.distanceTo(_camPos);
      if (!(dist > 0)) continue;
      _proj.copy(mesh.position).project(camera);
      if (_proj.z > 1) continue; // behind the camera
      // Angular radius -> pixels: r_px = (R / d) / tan(fov/2) * halfH. Good to a few % for discs
      // smaller than the view, which is every disc a finger can miss.
      const rPx = (mesh.scale.x / dist / tanHalfFov) * halfH;
      candidates.push({ id: w.id, cx: (_proj.x + 1) * halfW, cy: (1 - _proj.y) * halfH, r: rPx });
    }
    const hit = pickWorldDisc(candidates, (ndcX + 1) * halfW, (1 - ndcY) * halfH);
    if (!hit) return null;
    return worldRecords().find((r) => r.id === hit.id) || null;
  }

  const _adjCentre = new THREE.Vector3();

  /**
   * Put a body-fixed record on the globe it is standing on, even when that globe is drawn
   * somewhere else.
   *
   * A compressed world is drawn at `drawnDistanceKm` along its true direction and at
   * `drawnRadiusKm` instead of its real radius. A rover's position converts truthfully into the
   * scene and therefore lands nowhere near the drawn planet -- 268.8 million km away for Jezero,
   * measured. The same two numbers that moved the planet move what stands on it:
   *
   *     drawn = meshCentre + (true - trueCentre) * drawnRadius / trueRadius
   *
   * and the true centre is recoverable exactly, because the compression preserved the direction:
   * trueCentre = meshCentre / distanceFactor.
   *
   * ONLY `<world>-fixed`. An inertial frame is an orbit, not a surface, and `sun-inertial` is
   * every asteroid and every deep-space probe on the map -- correcting those to a "drawn Sun"
   * would move the whole solar system. The card still has to say the world is drawn closer than
   * it is; `viewScale(id).note` is the sentence, and it is unchanged.
   */
  function viewAdjust(out, frame) {
    const name = String(frame || '');
    const cut = name.lastIndexOf('-');
    if (cut < 0 || name.slice(cut + 1) !== 'fixed') return out;
    const id = name.slice(0, cut);
    if (id === stage.worldId) return out;
    const st = viewState.get(id);
    if (!st || !st.exaggerated) return out;
    const mesh = meshes.get(id);
    if (!mesh || !(st.distanceFactor > 0) || !(st.trueRadiusKm > 0)) return out;
    // A moon drawn around its planet was moved sideways, not along its own line of sight, so its
    // true centre is the one update() kept rather than one divided back out of the drawn position.
    if (st.withParent && trueCentres.has(id)) _adjCentre.copy(trueCentres.get(id));
    else _adjCentre.copy(mesh.position).multiplyScalar(1 / st.distanceFactor);
    return out.sub(_adjCentre).multiplyScalar(st.drawnRadiusKm / st.trueRadiusKm)
      .add(mesh.position);
  }
  stage.setViewAdjust(viewAdjust);

  /**
   * What the card must say when the view is exaggerated. Never silent: a world drawn at a
   * compressed distance reports exactly how much.
   */
  function viewScale(id) { return viewState.get(id) || null; }

  function dispose() {
    if (stage.viewAdjust === viewAdjust) stage.setViewAdjust(null);
    for (const mesh of meshes.values()) {
      mesh.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) { if (m.map && m.map.dispose) m.map.dispose(); m.dispose(); }
        }
      });
    }
    meshes.clear();
    if (scene) scene.remove(root);
  }

  return {
    update,
    preload,
    waitingMaps,
    meshFor,
    positionOf,
    viewScale,
    setVisible,
    setEclipseAllowed,
    eclipse,
    drawnPositionOf,
    drawnRadiusUnits,
    pick,
    pickAll,
    dispose,
    root,
    light: sunLight,
    worlds: WORLDS,
    /** Unit vector from the stage origin to the Sun, in scene axes. models.js wants this. */
    sunDirScene: () => _sunScene,
    ids: () => WORLDS.map((w) => w.id),
  };

  function describe(w, trueDistKm, drawnDistKm, drawnRadiusKm, around, heldBackBy) {
    const trueAng = trueDistKm > 0 ? w.radiusKm / trueDistKm : 0;
    const drawnAng = drawnDistKm > 0 ? (drawnRadiusKm || w.radiusKm) / drawnDistKm : 0;
    // A moon drawn around its planet can land at the same distance from the stage and still be
    // somewhere else entirely, so for one of those the test is simply that it was moved.
    const exaggerated = around ? true : trueDistKm > 0 && Math.abs(drawnDistKm - trueDistKm) / trueDistKm > 1e-6;
    const aroundNote = around
      ? t(COPY.worldView.withParent, { parent: around.parent.display, name: w.display, n: fmt.int(around.parent.angularFactor) })
        + (around.floored ? ` ${t(COPY.worldView.withParentFloor, { name: w.display })}` : '')
      : null;
    // The enlargement stopped short of a neighbour, so the card says which one and how close it is.
    const neighbour = heldBackBy && BY_ID.get(heldBackBy.id);
    const crowdedNote = neighbour
      ? ` ${t(COPY.worldView.crowded, { name: w.display, near: neighbour.display, deg: fmt.num((heldBackBy.rad * 180) / Math.PI, 2) })}`
      : '';
    return {
      id: w.id,
      display: w.display,
      trueDistanceKm: trueDistKm,
      drawnDistanceKm: drawnDistKm,
      distanceFactor: trueDistKm > 0 ? drawnDistKm / trueDistKm : 1,
      trueRadiusKm: w.radiusKm,
      drawnRadiusKm: drawnRadiusKm || w.radiusKm,
      trueAngularRadiusRad: trueAng,
      drawnAngularRadiusRad: drawnAng,
      angularFactor: trueAng > 0 ? drawnAng / trueAng : 1,
      exaggerated,
      withParent: !!around,
      /** The world whose nearness held this one's disc back, or null. */
      heldBackBy: neighbour ? neighbour.id : null,
      nearestNeighbourRad: heldBackBy ? heldBackBy.rad : Infinity,
      cls: exaggerated ? 'illustrative' : 'measured',
      note: aroundNote || (exaggerated
        ? `${w.display} is drawn in its true direction, but nearer and larger than it really is, so you can find it.${crowdedNote}`
        : `${w.display} is drawn where it is, at the size it is.`),
    };
  }

  function ringMesh(w, map) {
    const r = w.look.ring;
    const inner = r.innerKm / w.radiusKm;   // the ring is a child, so radii are in planet radii
    const outer = r.outerKm / w.radiusKm;
    const geo = new THREE.RingGeometry(inner, outer, 192, 1);
    // RingGeometry's own uv is a unit square over the bounding box, which smears a 1-D ring
    // strip. Rewrite it so u runs from the inner edge to the outer edge.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getY(i));
      uv.setXY(i, (d - inner) / (outer - inner), 0.5);
    }
    uv.needsUpdate = true;
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: map || null,
      color: 0xd9cdb4,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }));
    mesh.rotation.x = -Math.PI / 2;  // RingGeometry lies in XY; the ring is the planet's equator
    mesh.renderOrder = 1;
    mesh.name = `${w.id}-ring`;
    return mesh;
  }
}

// --- ephemeris ------------------------------------------------------------------------------------

/**
 * Where a world is, in km, in the frame named on the returned object.
 *   sun and the planets -> sun-inertial (heliocentric ecliptic J2000)
 *   moon                -> earth-inertial (geocentric equatorial J2000)
 * astronomy-engine returns equatorial J2000 vectors in au, so the heliocentric ones are rotated
 * into the ecliptic here -- once, at the source, so nothing downstream has to remember.
 */
export function positionOf(id, tMs) {
  const w = BY_ID.get(id);
  if (!w) return null;
  const date = new Date(tMs);

  if (id === 'sun') return { x: 0, y: 0, z: 0, frame: SUN_INERTIAL, cls: 'measured' };

  // A moon of another planet has no astronomy-engine Body. frames.js adds its offset (JupiterMoons()
  // for Jupiter's four, propagate/moons.js for the other six) to the planet's heliocentric vector
  // and hands back the same ecliptic frame as the planets below.
  if (isPlanetMoon(id)) {
    const h = worldHelioEclKm(id, tMs);
    return h ? { x: h.x, y: h.y, z: h.z, frame: SUN_INERTIAL, cls: 'measured' } : null;
  }

  if (id === 'moon') {
    // GeoMoon is EQJ (J2000 equator). frames.js defines 'earth-inertial' as TEME -- the frame
    // SGP4 works in -- and the two differ by precession, 0.36 degrees in 2026. Rotating here
    // means the Moon lands in the same frame as the satellites rather than a fifth of a degree
    // off them.
    const v = Astronomy.GeoMoon(date);
    const teme = j2000ToTeme(
      { x: v.x * KM_PER_AU, y: v.y * KM_PER_AU, z: v.z * KM_PER_AU },
      tMs,
    );
    return { x: teme.x, y: teme.y, z: teme.z, frame: EARTH_INERTIAL, cls: 'measured' };
  }

  const v = Astronomy.HelioVector(Astronomy.Body[w.body], date); // EQJ, au
  const e = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECL(), v);
  return {
    x: e.x * KM_PER_AU, y: e.y * KM_PER_AU, z: e.z * KM_PER_AU,
    frame: SUN_INERTIAL, cls: 'measured',
  };
}

/** The compression, on its own so a test can check it without a scene. */
export function drawnDistanceKm(trueDistanceKm) {
  const { DISTANCE_AT_REF_KM, REF_KM, DISTANCE_EXPONENT } = PLANET_VIEW;
  return DISTANCE_AT_REF_KM * Math.pow(trueDistanceKm / REF_KM, DISTANCE_EXPONENT);
}

/**
 * How wide a compressed world may be drawn, in radians of angular RADIUS, given the angle to the
 * nearest other compressed world. The floor, unless the neighbour is close enough that a disc that
 * size would reach it, and never under one pixel. Pure, so a test holds the numbers (the block at
 * the top of this file).
 *
 * @param {number} nearestRad angle to the nearest other compressed world; Infinity when alone.
 */
export function cappedAngularRadiusRad(nearestRad) {
  const { MIN_ANGULAR_RADIUS_RAD, NEIGHBOUR_SHARE, MIN_VISIBLE_ANGULAR_RADIUS_RAD } = PLANET_VIEW;
  // Two worlds in exactly one direction (a conjunction to the last digit): the cap cannot be
  // computed, so take the smallest disc that is still a disc rather than divide by nothing.
  if (!(nearestRad > 0)) return MIN_VISIBLE_ANGULAR_RADIUS_RAD;
  const share = NEIGHBOUR_SHARE * nearestRad;
  if (share >= MIN_ANGULAR_RADIUS_RAD) return MIN_ANGULAR_RADIUS_RAD;
  return Math.max(MIN_VISIBLE_ANGULAR_RADIUS_RAD, share);
}

/**
 * For each of `dirs` -- {id, dir: [x, y, z]} with dir a UNIT vector -- the nearest other entry and
 * how far away it is, in radians: `{ id -> { rad, id } }`, rad Infinity when there is nobody else.
 * Pure. Only the compressed worlds go in, and every one of those goes round the Sun, so no two of
 * them share a system and none has to be skipped.
 */
export function nearestNeighbours(dirs, out) {
  const list = Array.isArray(dirs) ? dirs : [];
  // `out` is a Map the caller owns, so the per-frame version of this allocates nothing: the entries
  // already in it are rewritten rather than replaced.
  const map = out || new Map();
  for (let i = 0; i < list.length; i++) {
    let rad = Infinity;
    let id = '';
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const a = list[i].dir;
      const b = list[j].dir;
      const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
      const ang = Math.acos(dot);
      if (ang < rad) { rad = ang; id = list[j].id; }
    }
    const entry = map.get(list[i].id);
    if (entry) { entry.rad = rad; entry.id = id; } else map.set(list[i].id, { rad, id });
  }
  return map;
}

/**
 * Is the view from this stage one that squeezes the planets? From a planet or a moon, yes: the
 * others are sub-pixel and the compression is what makes them findable (the block at the top of
 * this file). From the Sun stage, and from every rung of the ladder (stage.js `ladder`), no: those
 * stages exist to show the true layout, and a squeezed Neptune there would be a lie with no reason.
 */
export function compressesFrom(stageId) {
  if (stageId === 'sun' || isLadderStage(stageId)) return false;
  return true;
}

/**
 * The system a world belongs to: its parent when the parent is not the Sun, and itself otherwise.
 * So Earth and the Moon share one, and so do Jupiter and its four big moons, Saturn with Titan and
 * Enceladus, Mars with Phobos and Deimos, Neptune with Triton, and Pluto with Charon. A planet's
 * parent IS the Sun, and the Sun is the stage's light rather than a thing you find a planet by, so
 * a planet is its own system. ui/labels.js ranks names by this.
 */
export function systemOf(id) {
  const w = BY_ID.get(id);
  return w && w.parent && w.parent !== 'sun' ? w.parent : id;
}

/** A planet and its moons see each other truly; everything else across a stage boundary is squeezed. */
function sameSystem(a, b) {
  return systemOf(a) === systemOf(b);
}

const _bx = new THREE.Vector3();
const _by = new THREE.Vector3();
const _bz = new THREE.Vector3();

/**
 * Orient a world's mesh by asking propagate/frames.js where that world's own axes point.
 *
 * THE MESH AND THE MARKER MUST USE THE SAME ROTATION, and for six months they did not. This
 * function used to build its own matrix from the IAU angles -- Rz(ra+90).Rx(90-dec).Rz(W), an
 * EQJ orientation -- and apply it in scene axes. But a body-fixed MARKER reaches the scene
 * through frames.js, which on the Earth stage ends in j2000ToTeme, so the marker was precessed
 * and the mesh was not. Measured in Chrome: recovering Apollo 11's coordinates back through the
 * Moon mesh's own quaternion gave 0.6835 N / 23.846 E against registry/sites.yaml's 0.6741 N /
 * 23.4730 E -- a constant +0.373 degrees of longitude, 11.3 km of lunar surface, on all six
 * lunar rows. Earth was the control and showed zero error, because scene/earth.js builds its
 * mesh from frames.geodeticToEcef and cannot disagree with itself.
 *
 * So: three basis vectors, one formula, nothing written twice. The mesh's local axes are the
 * body-fixed axes after the scene remap (the same alignment argument as Earth's in earth.js:
 * +Y is the pole, +X is longitude 0 on the equator), which makes the three columns
 * remap(Rx), remap(Rz) and -remap(Ry).
 *
 * This is also what puts the Moon's near side towards us, libration included.
 *
 * @returns {boolean} false when the world has no rotation model -- leave the mesh unrotated
 *   rather than turn it by a guess.
 */
function applyIauOrientation(mesh, bodyName, tMs, worldId) {
  const body = Astronomy.Body[bodyName];
  if (body === undefined) return false;
  const from = `${worldId}-fixed`;
  const to = stageFrame(stage);
  const bx = rotateDir({ x: 1, y: 0, z: 0 }, from, to, tMs);
  const by = rotateDir({ x: 0, y: 1, z: 0 }, from, to, tMs);
  const bz = rotateDir({ x: 0, y: 0, z: 1 }, from, to, tMs);
  if (!bx || !by || !bz) return false;
  // The remap, (x, y, z) -> (x, z, -y), written out rather than multiplied in: this is the one
  // place three vectors go through it and a matrix product would hide which column is which.
  _bx.set(bx.x, bx.z, -bx.y).normalize();
  _by.set(-by.x, -by.z, by.y).normalize();
  _bz.set(bz.x, bz.z, -bz.y).normalize();
  _m4.makeBasis(_bx, _bz, _by);
  mesh.quaternion.setFromRotationMatrix(_m4);
  return true;
}

/** A warm bloom for the Sun. No lens flare (docs/design-language.md is explicit). */
function coronaSprite() {
  if (typeof document === 'undefined' || !document.createElement) return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.16, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(255,246,230,0.85)');
  g.addColorStop(0.35, 'rgba(255,201,138,0.28)');
  g.addColorStop(1.0, 'rgba(255,201,138,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }));
  sprite.scale.setScalar(4.5); // in Sun radii, because it is a child of the Sun's unit sphere
  sprite.name = 'sun-corona';
  return sprite;
}
