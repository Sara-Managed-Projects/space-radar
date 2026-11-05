#!/bin/bash
# 0079 B2 (internal #1066): the published shape models scripts/gen_smallmoon_shapes.mjs reads, fetched into
# ~/.cache/spaceradar-src/b2/raw/<name>/ (one directory per download, never run, never imported from).
#
#   bash scripts/fetch-small-moon-sources.sh [--help]
#
# Where each comes from, read 2026-11-05:
#   the eleven small moons of Saturn   the PDS Small Bodies Node's own copies of Thomas, Joseph and Ansty's plate models
#                                      (Saturn Small Moon Shape Models V1.0, doi:10.26033/ewy3-jy61) as OBJ,
#                                      sbn.psi.edu/pds/shape-models/files/SATURN_SMALL_MOONS/<name>_30k_plt.tab.obj
# NOT here, and why: the Stooke, Thomas and Gaskell sets for Halley, Gaspra, Ida, Dactyl and Mathilde, and the Thomas models of Amalthea,
# Thebe, Deimos, Proteus and Larissa, all on sbnarchive.psi.edu, which answers every request from this machine with a Cloudflare bot
# challenge (HTTP 403, `cf-mitigated: challenge`). That is bot detection and it was not worked around. The SBN's own OBJ copies of the
# eleven above sit on sbn.psi.edu, which answers plainly.
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then sed -n 2,14p "$0"; exit 0; fi
set -e
R=${SPACERADAR_SRC:-$HOME/.cache/spaceradar-src/b2/raw}
U=https://sbn.psi.edu/pds/shape-models/files/SATURN_SMALL_MOONS
get() { d=$R/$1; mkdir -p "$d"; [ -s "$d/$2" ] || curl -s -f -m 900 -o "$d/$2" "$3"; echo "$1/$2 $(wc -c < "$d/$2") bytes"; }
for m in atlas calypso daphnis epimetheus helene hyperion janus pan pandora prometheus telesto; do
  get "$m" "${m}_30k_plt.tab.obj" "$U/${m}_30k_plt.tab.obj"
done
