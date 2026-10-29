#!/bin/bash
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
cd /private/tmp/claude-501/c4-work/tools
until grep -q ALLDONE ../bake-all2.log; do sleep 15; done
B=/Users/ivansuskov/code/space-radar-wt-r15-c4/scripts/bake-own-colours.mjs
run() { n=$1; f=$2; shift; shift; echo "== $n"; node --max-old-space-size=4096 $B ../parts-eyes/$f.glb ../baked/$n.glb "$@" 2>&1 | grep -v '^prune' ; }
run cm eyes-cm --tris=13000 --colours=8 --no-guess '--recolour=orion_capsule=#ebe9e3;retopo_shield=#4a3b34'
run esm eyes-esm --tris=14000 --colours=10 --no-guess '--recolour=Cube.017=#bdbdba;serviceMod=#d2d1cc:foil'
for i in 1 2 3 4; do run array-$i eyes-array-$i --tris=2400 --colours=6 --no-guess --min-part=0.0005; done
echo EYESDONE
