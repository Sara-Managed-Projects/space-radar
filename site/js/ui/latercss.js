// ui/latercss.js -- a stylesheet that arrives with the module that needs it.
//
// Contract: loadCss(name) -> Promise, resolved when css/<name>.css has loaded (or failed: the
// element is still built, unstyled is better than absent). One <link> per name however many ask.
//
// The scale badge, the launch chip, the way home and the welcome are fetched after the first
// visit has settled; their rules (css/finishers.css) are not a first visit's bytes either. The
// controls hint does the same for its own sheet (ui/keyhint.js).

const loading = new Map();

export function loadCss(name, doc = document) {
  if (loading.has(name)) return loading.get(name);
  const promise = new Promise((resolve) => {
    const href = new URL(`../../css/${name}.css`, import.meta.url).href;
    if ([...doc.querySelectorAll('link[rel=stylesheet]')].some((l) => l.href === href)) { resolve(); return; }
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => resolve(), { once: true });
    doc.head.appendChild(link);
  });
  loading.set(name, promise);
  return promise;
}
