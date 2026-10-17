// scene/deep/heroes.js -- THE HERO LIST (internal spec 0075, design section 2 and the 2026-10-14
// amendment of section 11). Read by scene/deep/deepsky.js; nothing here is fetched until a hero is near.
//
// ONE LINE PER HERO, AND STAGE A WROTE EVERY LINE. The stages that build the heroes run in parallel, so
// none of them edits this file: each fills its own registry file (registry/deepsky-heroes/<id>.yaml,
// mirrored to site/js/data/hero-<id>.js) and its own module (the `build` below), and sets `shipped:
// true` there when its review is signed. A stage that needs a line here that is not one of these has
// strayed outside its files; a new hero after these four is a new line at the end, in its own PR.
//
//   id       the registry file's name
//   record   the deep-sky record it draws
//   stage    the spec 0075 stage that owns the profile and the module
//   profile  its authored profile (generated; tiny: read when the coordinator starts)
//   build    its module: createHero(THREE, env) (scene/deep/helix.js says what a hero answers)
export const HEROES = [
  { id: 'helix', record: 'dso-helix-nebula', stage: 'b', profile: () => import('../../data/hero-helix.js'), build: () => import('./helix.js') },
  { id: 'lmc', record: 'dso-lmc', stage: 'c', profile: () => import('../../data/hero-lmc.js'), build: () => import('./lmc.js') },
  { id: 'm31', record: 'dso-m31', stage: 'd', profile: () => import('../../data/hero-m31.js'), build: () => import('./spiral.js') },
  { id: 'm33', record: 'dso-m33', stage: 'd', profile: () => import('../../data/hero-m33.js'), build: () => import('./spiral.js') },
  { id: 'orion', record: 'dso-m42', stage: 'W1-a', profile: () => import('../../data/hero-orion.js'), build: () => import('./orion.js') },
  { id: 'm57', record: 'dso-m57', stage: 'W3-b', profile: () => import('../../data/hero-m57.js'), build: () => import('./ring.js') },
  // 0076 W3-c (its profiles)
  // READ LAZILY (the lead, 2026-10-17: the first minute's bytes). These six lines carry a STUB profile, what the
  // coordinator reads at once (shipped, drawn, children); the full profile (data/hero-<id>.js) is imported with the
  // module, by `build`, when the record is near enough to fetch. `stub.shipped` must equal the registry's `shipped:`
  // (tests/test_remnant.mjs and tests/test_dustsheet.mjs hold it); a hero may set it false for good on a device below
  // its profile's `min_tier` (scene/deep/dustsheet.js), and the coordinator then draws the object as main does.
  { id: 'crab', record: 'dso-m1', stage: 'W3-c', stub: { shipped: false, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./remnant.js'), import('../../data/hero-crab.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
  { id: 'veil', record: 'dso-veil-nebula', stage: 'W3-c', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./remnant.js'), import('../../data/hero-veil.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
  { id: 'horsehead', record: 'dso-horsehead-nebula', stage: 'W3-c', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./dustsheet.js'), import('../../data/hero-horsehead.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
  { id: 'coalsack', record: 'dso-coalsack', stage: 'W3-c', stub: { shipped: false, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./dustsheet.js'), import('../../data/hero-coalsack.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
  { id: 'm78', record: 'dso-m78', stage: 'W3-c', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./dustsheet.js'), import('../../data/hero-m78.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
  { id: 'iris', record: 'dso-iris-nebula', stage: 'W3-c', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { const stub = this.stub; return Promise.all([import('./dustsheet.js'), import('../../data/hero-iris.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO, stub }) })); } },
];

// Deep layers that are not one object: the local volume's galaxies (stage e). Built on the stages named.
export const DEEP_LAYERS = [
  { id: 'localvolume', stage: 'e', stages: ['local-group'], build: () => import('./localvolume.js') },
];
