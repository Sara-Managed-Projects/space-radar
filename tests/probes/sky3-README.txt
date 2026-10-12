The sky from the ground, round three: three probes, one run each (public PR "sky-from-ground-3").

  python3 tools/serve.py site 8431 &
  cat tests/probes/sky3-common.js tests/probes/sky3-a.js > /tmp/a.js
  node tools/cdp.mjs 'http://localhost:8431/?sw=0' /tmp/a.js --width=1440 --height=900 --gl=gpu \
       --block=celestrak.org,ll.thespacedevs.com --shot-dir=/tmp/sky3
  (b the same; c with --width=390 --height=844 --mobile)

Each returns the numbers its frames were taken at (the Sun's altitude, the limiting magnitude,
the stars drawn from the HYG files and from the tiles, the landscape chosen).
