The sky from the ground, round four ("Point your phone", internal #450 and #447): two probes, one run each.

  python3 tools/serve.py site 8451 &
  cat tests/probes/sky3-common.js tests/probes/sky5-a.js > /tmp/a.js
  node tools/cdp.mjs 'http://localhost:8451/?sw=0' /tmp/a.js --width=1440 --height=900 --gl=gpu \
       --block=celestrak.org,ll.thespacedevs.com --shot-dir=/tmp/sky5
  cat tests/probes/sky3-common.js tests/probes/sky5-c.js > /tmp/c.js
  (c with --width=390 --height=844 --mobile)

a: round three's night frame again (stars against lines), the horizon glow at Flagstaff and London
   the same way, the strip's ticks, the see-through ground, Jupiter's card line.
c: synthetic `deviceorientationabsolute` events; each step returns where the view looks against
   where the fed angles say it should. It proves the wiring, not a real phone's sensor.
