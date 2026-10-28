#!/bin/bash
# 0079 B1 (internal #1065): the published shape models scripts/gen_smallbody_shapes.py reads, fetched into
# ~/.cache/spaceradar-src/b1/raw/<name>/ (one directory per download, never run, never imported from).
#
#   bash scripts/fetch-small-body-sources.sh
#
# Where each comes from, read 2026-10-28:
#   67P, Lutetia, Steins   NASA PDS Small Bodies Node's mirror at the University of Maryland, pds-smallbodies.astro.umd.edu/holdings
#   Arrokoth               the same host, the PDS4 collection nh_derived:arrokoth_shapemodel_porter2024 (shape, texture coordinates, albedo map)
#   Donaldjohanson         NASA's Navigation and Ancillary Information Facility, the Lucy SPICE bundle (a DSK; NAIF's host chains to a root the
#                          macOS curl lacks, so Node, which carries it, does the fetch)
#   the radar shapes       NASA 3D Resources on GitHub, 3D Printing/<body>/<body>.stl
# NOT here, and why: the Stooke, Thomas and Gaskell sets for Halley, Gaspra, Ida, Dactyl and Mathilde, Hudson's radar shapes and Lawrence's,
# all on sbnarchive.psi.edu, which answers every request from this machine with a Cloudflare bot challenge (HTTP 403, `cf-mitigated:
# challenge`). That is bot detection and it was not worked around.
set -e
R=${SPACERADAR_SRC:-$HOME/.cache/spaceradar-src/b1/raw}
U=https://pds-smallbodies.astro.umd.edu/holdings
get() { d=$R/$1; mkdir -p "$d"; [ -s "$d/$2" ] || curl -s -f -m 900 -o "$d/$2" "$3"; echo "$1/$2 $(wc -c < "$d/$2") bytes"; }
get 67p cg_spc_shap5_199k_cart.wrl $U/ro-c-multi-5-67p-shape-v2.0/data/triplate/spc_lam_psi/shap5/cg_spc_shap5_199k_cart.wrl
get 67p-hi cg_spc_shap5_788k_cart.wrl $U/ro-c-multi-5-67p-shape-v2.0/data/triplate/spc_lam_psi/shap5/cg_spc_shap5_788k_cart.wrl
get lutetia lutetia_098k_cart.wrl $U/ro-a-osinac_osiwac-5-lutetia-shape-v1.0/data/lutetia_098k_cart.wrl
get lutetia-hi lutetia_780k_cart.wrl $U/ro-a-osinac_osiwac-5-lutetia-shape-v1.0/data/lutetia_780k_cart.wrl
get steins steins_cart.wrl $U/ro-a-osinac_osiwac-5-steins-shape-v1.0/data/steins_cart.wrl
get arrokoth arrokoth_porter_2024_v01.obj "$U/pds4-nh_derived:arrokoth_shapemodel_porter2024-v1.0/arrokoth_porter_2024_v01.obj"
get arrokoth-albedo albedo_arrokoth4_fp36h2_masked1.png "$U/pds4-nh_derived:arrokoth_shapemodel_porter2024-v1.0/albedo_arrokoth4_fp36h2_masked1.png"
N=https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Printing
for b in "4179 Toutatis" "1620 Geographos" "216 Kleopatra" "4486 Mithra" "6489 Golevka" "8567 1996 HW1"; do
  slug=nasa-asteroid-$(echo "$b" | tr ' ' '-' | tr 'A-Z' 'a-z')
  enc=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote('Asteroid ' + sys.argv[1]))" "$b")
  get "$slug" "Asteroid $b.stl" "$N/$enc/$enc.stl"
done
d=$R/donj; mkdir -p "$d"
if [ ! -s "$d/lcy_donj_k548_iso20m_v10.bds" ]; then
  node -e 'fetch(process.argv[1]).then((r) => r.arrayBuffer()).then((b) => process.stdout.write(Buffer.from(b)))' \
    https://naif.jpl.nasa.gov/pub/naif/pds/pds4/lucy/lucy_spice/spice_kernels/dsk/lcy_donj_k548_iso20m_v10.bds > "$d/lcy_donj_k548_iso20m_v10.bds"
fi
echo "donj/lcy_donj_k548_iso20m_v10.bds $(wc -c < "$d/lcy_donj_k548_iso20m_v10.bds") bytes"
