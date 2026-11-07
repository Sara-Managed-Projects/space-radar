// sky/worldair.js -- the colour of another world's sky, by where its Sun is (release 2.0.0 batch f7-ground, forge #147).
//
// Contract: AIR, skyLook(world, sunAltDeg) -> { zenith, horizon, glow, glowDeg, light, stars, kind },
//           srgbToLinear(rgb255) -> [r, g, b] (0..1), mixRgb(a, b, k)
// Pure: no DOM, no three. scene/groundstage.js paints its dome from this; tests/test_worldframe.mjs holds the anchors.
//
// WHAT IS MEASURED AND WHAT IS NOT. A colour here is one of three kinds, and `kind` says which:
//   measured     sampled from a calibrated picture taken on that ground, and the picture is named;
//   modelled     the physics' answer with no picture behind it (no air: a black sky);
//   illustrative a colour chosen to match words, not a measurement (Titan's orange: no camera has shown it in true colour).
//
// MARS (measured, 2026-11-07, this batch; the pixels' means are in tests/test_worldframe.mjs):
//   by day       sRGB (176, 134, 94), the "butterscotch" sky: the mean of the sky in Spirit's Lookout panorama, Pancam's
//                750, 530 and 480 nm filters rendered as approximately true colour (NASA/JPL/Cornell, PIA07882,
//                https://images.nasa.gov/details/PIA07882): (178, 136, 95) high on the left, (175, 132, 93) near the horizon.
//   at sunset    sRGB (172, 195, 222) round the Sun and (128, 128, 132) away from it: the means of Curiosity's first
//                colour sunset, Mastcam, sol 956, 15 April 2015, from Gale itself (NASA/JPL-Caltech/MSSS/Texas A&M,
//                PIA19400, https://images.nasa.gov/details/PIA19400), whose caption says why it is blue: fine dust
//                "permit[s] blue light to penetrate the atmosphere more efficiently than longer-wavelength colors".
//   Between the two the colours are mixed by the Sun's altitude (modelled): the blue glow widens and the butterscotch
//   greys as the Sun sinks through the last 12 degrees, and the sky darkens to night over the 16 degrees below the
//   horizon (modelled; Mars's dusty twilight is long, which the rovers' evening skies showed: Lemmon et al. 2004, Science 306, 1753).
// THE MOON AND EUROPA (modelled): no air, so a black sky at noon. The eye, dazzled by sunlit ground, would not see the
//   fainter stars; the stage draws them and says so.
// TITAN (illustrative): the haze is orange and the surface gets about a thousandth of the Earth's daylight (Tomasko et
//   al. 2005, Nature 438, 765: the Huygens probe's DISR); the colour below is chosen to look like that, and the stars
//   and Saturn are not visible through the haze (the stage draws them faint and says so).
// THE EARTH: a plain blue day sky (illustrative): sky/skyair.js draws the real one in the ground sky.
// PROXIMA B AND TRAPPIST-1 E (illustrative): an assumed thin air under a red dwarf's light, below.

/** The anchors, sRGB 0..255. */
export const AIR = {
  mars: { day: [176, 134, 94], sunsetGlow: [172, 195, 222], sunsetAway: [128, 128, 132], kind: 'measured' },
  titan: { day: [196, 128, 58], kind: 'illustrative' },
  earth: { day: [96, 150, 220], sunsetGlow: [255, 170, 110], sunsetAway: [70, 90, 140], kind: 'illustrative' },
  moon: { kind: 'modelled' },
  europa: { kind: 'modelled' },
  // ILLUSTRATIVE: nobody knows whether these planets have air. If they have a thin one like the Earth's, a red dwarf's
  // light (2 900 K, 2 566 K) would leave a paler, warmer sky than ours; these colours are chosen to say so, and the
  // stage labels them illustrative.
  'proxima-b': { day: [176, 146, 134], sunsetGlow: [228, 150, 112], sunsetAway: [78, 68, 78], kind: 'illustrative' },
  'trappist-1e': { day: [168, 134, 124], sunsetGlow: [222, 138, 100], sunsetAway: [72, 60, 70], kind: 'illustrative' },
};

const BLACK = [0, 0, 0];

/** sRGB 0..255 to linear 0..1. */
export function srgbToLinear(rgb) {
  return rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
}

export function mixRgb(a, b, k) {
  const t = Math.min(1, Math.max(0, k));
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const scale = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

/**
 * The sky for a Sun at `sunAltDeg` (its centre, true): linear colours 0..1 for the zenith, the horizon and the glow
 * round the Sun, the glow's width in degrees, `light` (how bright the day is, 0 night to 1 noon, for the ground's
 * fill light) and `stars` (0 hidden by the day sky to 1 a full night's).
 */
export function skyLook(world, sunAltDeg) {
  const air = AIR[world];
  const h = Number.isFinite(sunAltDeg) ? sunAltDeg : -90;
  if (!air || !air.day) {
    // No air: black whatever the Sun does. Light is the Sun's own, which the stage takes from its altitude.
    return { zenith: BLACK, horizon: BLACK, glow: BLACK, glowDeg: 0, light: h > 0 ? 1 : 0, stars: 1, kind: air ? air.kind : 'modelled' };
  }
  const dayK = smooth(-16, 12, h); // night to full day
  const dusk = 1 - smooth(-4, 12, h); // 0 by day, 1 from the Sun's last few degrees
  if (world === 'titan') {
    // One dim orange: the haze scatters light all round, so there is no glow to speak of and no blue hour.
    const c = scale(srgbToLinear(air.day), 0.55 * dayK);
    return { zenith: scale(c, 0.85), horizon: c, glow: scale(c, 1.2), glowDeg: 40, light: 0.25 * dayK, stars: 0, kind: air.kind };
  }
  const day = srgbToLinear(air.day);
  const away = srgbToLinear(air.sunsetAway);
  const glowC = srgbToLinear(air.sunsetGlow);
  const base = mixRgb(day, away, dusk);
  const zenith = scale(base, dayK * (0.82 + 0.18 * (1 - dusk)));
  const horizon = scale(base, dayK);
  const glow = scale(mixRgb(day, glowC, 0.35 + 0.65 * dusk), Math.max(dayK, smooth(-14, 0, h) * 0.9));
  return {
    zenith,
    horizon,
    glow,
    glowDeg: 10 + 18 * dusk,
    light: dayK,
    stars: 1 - smooth(-14, -2, h),
    kind: air.kind,
  };
}
