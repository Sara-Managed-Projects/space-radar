#!/bin/bash
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
cd /private/tmp/claude-501/c4-work/tools
B=/Users/ivansuskov/code/space-radar-wt-r15-c4/scripts/bake-own-colours.mjs
run() { n=$1; shift; echo "== $n"; node --max-old-space-size=4096 $B ../rawglb/$n.glb ../baked/$n.glb "$@" 2>&1 | grep -v '^prune' ; }
run lvsa --tris=3500 --colours=6 --no-guess
run icps --tris=6000 --colours=8 --no-guess
run srb-right --tris=9000 --colours=10 --no-guess
run srb-left --tris=9000 --colours=10 --no-guess
run las --tris=8000 --colours=8 --no-guess
run fairing-a --tris=2800 --colours=6 --no-guess
run fairing-b --tris=2800 --colours=6 --no-guess
run fairing-c --tris=2800 --colours=6 --no-guess
run hatchbox --tris=2000 --colours=4 --no-guess
run core-stage --tris=14000 --colours=10 --no-guess --min-part=0.002
run core-engines --tris=8000 --colours=6 --no-guess --min-part=0.002
echo ALLDONE
