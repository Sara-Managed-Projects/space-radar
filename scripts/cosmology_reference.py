#!/usr/bin/env python3
"""The reference values site/js/data/cosmology.js is held to (internal spec 0075 task 15, DS-D03).

Run ONCE, by hand, outside the browser and outside CI, with Astropy installed:

    python3 -m venv /tmp/cosmo && /tmp/cosmo/bin/pip install astropy scipy
    /tmp/cosmo/bin/python scripts/cosmology_reference.py

It writes tests/fixtures/cosmology_astropy.json, which tests/test_cosmology.mjs reads. The file
names the Astropy version, the cosmology's own parameters as Astropy prints them, and for each
redshift the comoving distance, the light-travel (lookback) time and the age of the universe then.
Nothing in the site imports Astropy: the browser integrates the same equations itself.

The cosmology is Astropy's `Planck18`: Planck 2018 results VI (A&A 641, A6), Table 2, the last
column (TT,TE,EE+lowE+lensing+BAO): H0 = 67.66, Omega_m = 0.3111 of which 0.30966 is cold dark
matter and baryons and the rest one massive neutrino of 0.06 eV; Tcmb = 2.7255 K; Neff = 3.046;
flat, so Omega_Lambda = 0.6889 less the photons' and neutrinos' share.

The particle horizon (the radius of the observable universe today) has no finite redshift, so it is
integrated here in the scale factor a, from 0 to 1, with Astropy's own 1/E(z).
"""
import json
import sys
from pathlib import Path

import astropy
import astropy.units as u
from astropy.cosmology import Planck18 as C
from scipy.integrate import quad

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tests/fixtures/cosmology_astropy.json"
Z = [0.01, 0.1, 0.5, 1, 2, 2.219, 3, 6, 10, 1100]  # 2.219: TON 618 (registry/exotics.yaml)


def main():
    rows = []
    for z in Z:
        rows.append({
            "z": z,
            "comoving_mpc": C.comoving_distance(z).to(u.Mpc).value,
            "comoving_gly": C.comoving_distance(z).to(u.lyr).value / 1e9,
            "lookback_gyr": C.lookback_time(z).to(u.Gyr).value,
            "age_gyr": C.age(z).to(u.Gyr).value,
        })
    dh = C.hubble_distance.to(u.Mpc).value
    # chi = D_H * integral_0^1 da / (a^2 E(1/a - 1)); with a = s^2, da = 2s ds and the integrand
    # 2 / (s^3 E) is smooth at s -> 0 (E grows as 1/s^4 there, radiation).
    integral, _ = quad(lambda s: 2.0 / (s ** 3) * C.inv_efunc(1.0 / (s * s) - 1.0) if s > 1e-9 else 0.0,
                       0.0, 1.0, epsabs=0, epsrel=1e-11, limit=400)
    horizon_mpc = dh * integral
    data = {
        "about": "Reference values for site/js/data/cosmology.js, computed once by scripts/cosmology_reference.py",
        "astropy": astropy.__version__,
        "cosmology": str(C),
        "parameters": {
            "H0": C.H0.value, "Om0": C.Om0, "Ode0": C.Ode0, "Ogamma0": C.Ogamma0, "Onu0": C.Onu0,
            "Tcmb0": C.Tcmb0.value, "Neff": C.Neff, "m_nu_ev": [float(m) for m in C.m_nu.value],
        },
        "age_now_gyr": C.age(0).to(u.Gyr).value,
        "horizon_mpc": horizon_mpc,
        "horizon_gly": (horizon_mpc * u.Mpc).to(u.lyr).value / 1e9,
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n")
    print(json.dumps(data, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
