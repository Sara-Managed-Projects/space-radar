// scene/ktx2.js -- a map as a GPU-compressed texture when one is there, the WebP when it is not
// (spec 0056 task 1, internal #155).
//
// Contract: createKtx2({ renderer, present?, importLoader? }) ->
//             { load(url, loadWebp) -> Promise<{ texture, format: 'ktx2' | 'webp', why? }>,
//               has(url), stats(), dispose() }
//           ktx2UrlFor(url) -> the `.ktx2` twin's address for a `.webp`, `.png` or `.jpg` one. Pure.
//
// WHY. A 4k WebP of the Earth is 0.7 MB on the wire and 89 MB in the GPU once it is decoded, with
// its mip chain: the maps, not the meshes, are what a phone runs out of. A KTX2 file (Basis
// Universal) stays compressed in GPU memory at a sixth to an eighth of that, and its mips come in
// the file. The price is a transcoder: a 527 kB WebAssembly module and about 160 kB of JavaScript.
//
// SO NOTHING HERE IS ON A FIRST VISIT, and nothing is fetched until it is needed:
//   - this module is imported dynamically by whoever loads maps; the boot graph cannot reach it
//     (tests/test_boot_diet.mjs);
//   - vendor/basis/KTX2Loader.js is imported the first time load() is asked for a map that HAS a
//     twin, and the loader fetches its transcoder then;
//   - `present` says which maps have a twin. It is a list the caller hands over (from the
//     registry, when a map first ships as KTX2), never a probe: asking the server "is there a
//     .ktx2?" for every map would cost a request each to learn "no". Today no map ships one, the
//     list is empty, and load() is exactly loadWebp().
//
// THE FALLBACK IS THE RULE, NOT THE EXCEPTION. A device with no compressed format the transcoder
// can target, a transcoder that does not arrive (offline, a blocked WebAssembly), a file that does
// not parse: each ends in the WebP, loaded the way it always was, with `why` saying what happened.
// After the transcoder itself has failed once it is not asked again in this page.

const TWIN = /\.(webp|png|jpe?g)(\?.*)?$/i;

/** `textures/8k_earth_daymap.webp` -> `textures/8k_earth_daymap.ktx2`. Null for anything else. Pure. */
export function ktx2UrlFor(url) {
  const s = String(url || '');
  return TWIN.test(s) ? s.replace(TWIN, '.ktx2$2') : null;
}

const defaultImport = () => import('../../vendor/basis/KTX2Loader.js');

/**
 * @param {{ renderer: object, present?: Iterable<string>|((url: string) => boolean),
 *           importLoader?: () => Promise<{ KTX2Loader: Function }> }} opts
 *   `present`: the `.ktx2` addresses that exist (or a predicate over them).
 */
export function createKtx2(opts = {}) {
  const { renderer } = opts;
  const importLoader = opts.importLoader || defaultImport;
  const given = opts.present;
  const set = typeof given === 'function' ? null : new Set(given || []);
  const has = (url) => {
    const twin = ktx2UrlFor(url);
    if (!twin) return false;
    return typeof given === 'function' ? !!given(twin) : set.has(twin);
  };
  let loader = null;      // a promise of the KTX2Loader, made once
  let broken = '';        // why the transcoder is not to be asked again
  const count = { ktx2: 0, webp: 0, fellBack: 0 };

  function ensure() {
    if (!loader) {
      loader = importLoader().then((m) => {
        const l = new m.KTX2Loader();
        // The transcoder's two files sit beside the loader (vendor/basis/), found from the loader's
        // own address, so a copy of the site under any folder works.
        l.detectSupport(renderer);
        return l;
      });
      loader.catch((e) => { broken = (e && e.message) || 'the transcoder did not load'; });
    }
    return loader;
  }

  /**
   * The map at `url`, compressed when it has a twin and this device can take it, else by
   * `loadWebp(url)`, which is the caller's own way of loading the picture (and may be async).
   */
  async function load(url, loadWebp) {
    const plain = async (why) => {
      const texture = await loadWebp(url);
      count.webp += 1;
      if (why) count.fellBack += 1;
      return why ? { texture, format: 'webp', why } : { texture, format: 'webp' };
    };
    if (!renderer || !has(url)) return plain('');
    if (broken) return plain(broken);
    try {
      const l = await ensure();
      const texture = await l.loadAsync(ktx2UrlFor(url));
      count.ktx2 += 1;
      return { texture, format: 'ktx2' };
    } catch (e) {
      return plain((e && e.message) || 'the compressed map did not load');
    }
  }

  function dispose() {
    if (!loader) return;
    loader.then((l) => l.dispose()).catch(() => { /* never made */ });
    loader = null;
  }

  return { load, has, stats: () => ({ ...count, transcoder: loader ? (broken ? 'failed' : 'asked') : 'never' }), dispose };
}
