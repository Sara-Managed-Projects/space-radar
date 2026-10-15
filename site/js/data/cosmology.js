// data/cosmology.js -- ONE DECLARED COSMOLOGY for the whole map (internal spec 0075 task 15, DS-D02,
// DS-D03, design section 10). Pure: no DOM, no three.js; tests/test_cosmology.mjs holds it to values
// Astropy computed once (tests/fixtures/cosmology_astropy.json, scripts/cosmology_reference.py).
//
// WHICH. Planck 2018 (Planck Collaboration, "Planck 2018 results. VI. Cosmological parameters",
// A&A 641, A6, 2020; Table 2, the last column, TT,TE,EE+lowE+lensing+BAO), exactly as Astropy's
// `Planck18` takes it: H0 = 67.66 km/s/Mpc; matter 0.3111, of which 0.30966 is cold dark matter and
// baryons and the rest one neutrino of 0.06 eV; the microwave background at 2.7255 K; Neff = 3.046;
// space flat, so dark energy is what is left (0.6889 less the light's and the neutrinos' share).
//
// WHAT A DISTANCE MEANS PAST THE LOCAL GROUP. A redshift is not a distance, and "redshift times a
// constant" is not one either. Light from far away left when the universe was smaller, so three
// numbers answer three different questions:
//   - LIGHT-TRAVEL TIME (lookback): how long ago the light we see now set out. "Its light left N
//     billion years ago." Never more than the age of the universe, 13.8 billion years.
//   - COMOVING DISTANCE: how far away the place is NOW, measured along today's universe; in a flat
//     universe it is also the proper distance today. This is where the map draws a far thing.
//     The edge of what can ever have been seen (the particle horizon) is about 46 billion
//     light-years away by this measure, although no light has travelled longer than 13.8 billion
//     years: space stretched while the light was on its way (NASA, "How big is space?", 2025:
//     https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/).
//   - The distance it was at when the light left is the comoving distance over 1 + z; the map
//     does not print it.
// Within about 100 million light-years (z < 0.01) the three agree to a few per cent and the map
// uses each galaxy's own measured distance (Cepheids, the tip of the red giant branch...), not a
// redshift at all.
//
// HOW. dz/E(z) integrated with Simpson's rule in s = sqrt(a) (a = 1 / (1 + z), the scale factor), in
// which the integrand stays smooth from today back to the Big Bang (radiation makes E grow as 1/a^2,
// and s takes that out). 2 000 steps; well under a millisecond. The neutrinos are Astropy's
// (Komatsu et al. 2011's fit for a massive species), so the two agree to a few parts in a million.
//
// Contract (all pure):
//   PLANCK18                       the parameters, with their source
//   E(z)                           H(z) / H0
//   comovingLy(z)                  light-years now (comoving = proper distance today, flat space)
//   comovingMpc(z)
//   lookbackGyr(z)                 how long ago its light left, billions of years
//   ageGyr(z)                      the universe's age when that light left; ageGyr(0) is its age now
//   horizonLy()                    the particle horizon: the radius of the observable universe now
//   cmbLy()                        where the microwave background we see left from, now (z = Z_CMB)
//   distanceWords(z)               { lookbackGyr, comovingGly, cosmology }: the card's two numbers

/** Exact SI and IAU numbers Astropy uses. */
const C_KM_S = 299792.458;
const MPC_KM = 3.0856775814913673e19;
const LY_KM = 9460730472580.8; // a Julian year of light (IAU)
const GYR_S = 3.15576e16; // 1e9 Julian years
const SIGMA_SB = 5.670374419e-8; // W m^-2 K^-4 (CODATA 2018)
const C_M_S = 299792458;
const G_SI = 6.6743e-11; // m^3 kg^-1 s^-2 (CODATA 2018)
const K_B_EV = 8.617333262e-5; // eV / K (CODATA 2018)

/** The cosmology, as Planck 2018 gives it and Astropy's Planck18 holds it. */
export const PLANCK18 = Object.freeze({
  id: 'planck18',
  name: 'Planck 2018',
  source: 'Planck Collaboration 2020, A&A 641, A6, Table 2 (TT,TE,EE+lowE+lensing+BAO); as astropy.cosmology.Planck18',
  H0: 67.66, // km/s/Mpc
  Om0: 0.30966, // cold dark matter and baryons today (the massive neutrino is counted apart)
  Tcmb0: 2.7255, // K
  Neff: 3.046,
  mNuEv: [0, 0, 0.06],
  /** The redshift of the surface the microwave background left (Planck 2018 VI, Table 2, last column: z* = 1089.80). */
  zCmb: 1089.8,
});

// ------------------------------------------------------------------------------------ the densities
const P = PLANCK18;
const H0_S = (P.H0 / MPC_KM); // 1/s
const RHO_CRIT = (3 * H0_S * H0_S) / (8 * Math.PI * G_SI); // kg/m^3
const A_B_C2 = (4 * SIGMA_SB) / (C_M_S ** 3); // radiation constant over c^2, kg m^-3 K^-4
/** Photons today, of the critical density. */
export const OGAMMA0 = (A_B_C2 * P.Tcmb0 ** 4) / RHO_CRIT;
const TNU0 = 0.7137658555036082 * P.Tcmb0; // (4/11)^(1/3)
const N_NU = Math.floor(P.Neff);
const NEFF_PER_NU = P.Neff / N_NU;
const MASSIVE = P.mNuEv.filter((m) => m > 0);
const MASSLESS = N_NU - MASSIVE.length;
const NU_Y = MASSIVE.map((m) => m / (K_B_EV * TNU0));

/** The neutrinos' density over the photons' at z (Astropy's nu_relative_density; Komatsu et al. 2011 eq. 26). */
function nuRelative(z) {
  const prefac = 0.22710731766; // 7/8 (4/11)^(4/3)
  let rel = MASSLESS;
  for (const y of NU_Y) rel += (1 + (0.3173 * y / (1 + z)) ** 1.83) ** (1 / 1.83);
  return prefac * NEFF_PER_NU * rel;
}
/** Neutrinos today, of the critical density. */
export const ONU0 = OGAMMA0 * nuRelative(0);
/** Dark energy today: whatever a flat universe leaves. */
export const ODE0 = 1 - P.Om0 - OGAMMA0 - ONU0;

/** H(z) / H0. */
export function E(z) {
  const zp1 = 1 + z;
  const Or = OGAMMA0 * (1 + nuRelative(z));
  return Math.sqrt(zp1 ** 3 * (Or * zp1 + P.Om0) + ODE0);
}

/** c / H0, Mpc. */
export const HUBBLE_MPC = C_KM_S / P.H0;
/** 1 / H0, Gyr. */
export const HUBBLE_GYR = MPC_KM / P.H0 / GYR_S;
const MPC_LY = MPC_KM / LY_KM;

// ------------------------------------------------------------------------------------ the integrals
const STEPS = 2000; // even, for Simpson
/** Simpson's rule of f over [a, b]. */
function simpson(f, a, b, n = STEPS) {
  if (!(b > a)) return 0;
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return (s * h) / 3;
}
const zOf = (s) => 1 / (s * s) - 1;
const sOf = (z) => 1 / Math.sqrt(1 + z);
// In s = sqrt(a): dz = -2 ds / s^3, so
//   comoving:  dz / E           = 2 ds / (s^3 E)
//   lookback:  dz / ((1+z) E)   = 2 ds / (s E)
// both smooth and going to 0 at s -> 0, where s^4 E -> sqrt(Omega_radiation): the first is
// 2 s / sqrt(Omega_r + Omega_m s^2 + ...), the second 2 s^3 / sqrt(...).
const chiIntegrand = (s) => (s <= 0 ? 0 : 2 / (s ** 3 * E(zOf(s))));
const timeIntegrand = (s) => (s <= 0 ? 0 : 2 / (s * E(zOf(s))));
const valid = (z) => Number.isFinite(z) && z >= 0;

/** Comoving distance, Mpc. */
export function comovingMpc(z) {
  if (!valid(z)) return NaN;
  return HUBBLE_MPC * simpson(chiIntegrand, sOf(z), 1);
}
/** Comoving distance (= proper distance today in flat space), light-years. */
export function comovingLy(z) {
  return comovingMpc(z) * MPC_LY;
}
/** Light-travel (lookback) time, Gyr: how long ago the light we see now left. */
export function lookbackGyr(z) {
  if (!valid(z)) return NaN;
  return HUBBLE_GYR * simpson(timeIntegrand, sOf(z), 1);
}
/** The age of the universe when light seen at redshift z left, Gyr; ageGyr(0) is its age now. */
export function ageGyr(z) {
  if (!valid(z)) return NaN;
  return HUBBLE_GYR * simpson(timeIntegrand, 0, sOf(z));
}
let horizon = null;
/** The particle horizon now: the radius of the observable universe, light-years (about 46 billion). */
export function horizonLy() {
  if (horizon === null) horizon = HUBBLE_MPC * simpson(chiIntegrand, 0, 1, 4000) * MPC_LY;
  return horizon;
}
/** Where the microwave background we see left from, now (comoving), light-years. */
export function cmbLy() {
  return comovingLy(P.zCmb);
}

/**
 * The card's numbers for a thing seen at redshift z: how long ago its light left and how far away
 * it is now, with the cosmology named (design section 10's words; DS-D02).
 */
export function distanceWords(z) {
  return {
    z,
    lookbackGyr: lookbackGyr(z),
    comovingGly: comovingLy(z) / 1e9,
    cosmology: P.name,
  };
}
