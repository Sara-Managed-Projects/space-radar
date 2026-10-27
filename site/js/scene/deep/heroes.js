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
  // 0077 W2-e: begin
  // The Carina Nebula (scene/deep/carina.js, Orion's technique with its own profile) and the Small Magellanic Cloud
  // (scene/deep/smc.js), read lazily as W3-c's lines are: the stub is what the coordinator reads at once.
  { id: 'carina', record: 'dso-carina-nebula', stage: 'W2-e', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./carina.js'), import('../../data/hero-carina.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  // The SMC ships with its light as patches (0077 W3-f, internal #783: within main's frame cost, no haze, no veil).
  { id: 'smc', record: 'dso-smc', stage: 'W2-e', stub: { shipped: true, drawn: ['model'], children: [] }, /* 0077 W3-f: shipped */ profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./smc.js'), import('../../data/hero-smc.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  // 0077 W2-e: end
  // 0077 W3-f: begin
  // Spirals from their own numbers (internal #873) and interacting galaxies (internal #875), all drawn by scene/deep/spiral.js's
  // generator from their profiles (registry/deepsky-heroes/<id>.yaml), read lazily as W3-c's lines are.
  { id: 'm51', record: 'dso-m51', stage: 'W3-f', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-m51.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'm81', record: 'dso-m81', stage: 'W3-f', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-m81.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'm101', record: 'dso-m101', stage: 'W3-f', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-m101.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'm104', record: 'dso-m104', stage: 'W3-f', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-m104.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'antennae', record: 'dso-antennae-galaxies', stage: 'W3-f', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-antennae.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  // 0077 W3-f: end
  // 0078 r14-neb-b: begin
  // `stub.arrive` (lead review of #1298): the arrival's distance as a share of the catalogue's framing (main.js arrivalDistance),
  // where the drawn body is not the catalogue's size: M27 with its outer arcs is twice its 6.7', Centaurus A's bright glow
  // half its 25.7'; both then sit at about 45 % of the view's height.
  // No photographs in the scene (Ivan, 2026-10-26): the objects that were only a photograph get a 3D hero, read lazily as
  // W3-c's lines are. M27 and the Southern Ring on ring.js (M57's technique, each with its own profile), the Pleiades'
  // nebulosity on reflection.js (dust in front of the cluster lit by its stars; the stars themselves are stars3d.js's).
  { id: 'm27', record: 'dso-m27', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['reconstruction'], children: [], arrive: 2.5 }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./ring.js'), import('../../data/hero-m27.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'southern-ring', record: 'dso-southern-ring-nebula', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./ring.js'), import('../../data/hero-southern-ring.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'm45', record: 'dso-m45', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['reconstruction'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./reflection.js'), import('../../data/hero-m45.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  // The galaxies that were only a photograph, from their own numbers on spiral.js's generator: M83 and NGC 1300 (barred
  // spirals), Centaurus A (an elliptical crossed by its warped dust disc; its jets drawn in false colour, an illustration).
  { id: 'm83', record: 'dso-m83', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-m83.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'ngc1300', record: 'dso-ngc-1300', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['model'], children: [] }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-ngc1300.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  { id: 'cena', record: 'dso-centaurus-a', stage: 'r14-neb-b', stub: { shipped: true, drawn: ['model', 'illustration'], children: [], arrive: 0.6 }, profile() { return Promise.resolve({ HERO: this.stub }); }, build() { return Promise.all([import('./spiral.js'), import('../../data/hero-cena.js')]).then(([m, p]) => ({ createHero: (T, env) => m.createHero(T, { ...env, profile: p.HERO }) })); } },
  // 0078 r14-neb-b: end
];

// Deep layers that are not one object: the local volume's galaxies (stage e). Built on the stages named.
export const DEEP_LAYERS = [
  { id: 'localvolume', stage: 'e', stages: ['local-group'], build: () => import('./localvolume.js') },
  // 0076 W4-b: Virgo, Coma, Fornax and Perseus as instanced impostors, and two quasars with their host cue. `ask` is what the coordinator
  // hands the layer (scene/deep/deepsky.js); `debug` is the key of `sr.deep.debug({ far: false })`, which takes it off for a probe's BEFORE shot.
  { id: 'galclusters', stage: 'W4-b', stages: ['local-group'], build: () => import('./galclusters.js'), ask: (env, on) => ({ recordById: env.recordById, on }) },
  // 0077 W2-e: begin
  // The Magellanic Bridge and Stream (scene/deep/magellanic.js: HI4PI's hydrogen at a modelled distance, false colour) ship
  // with the SMC's hero, not before (internal #783, wave 3): MAGELLANIC below is its line, kept out of this list until then.
  // 0077 W2-e: end
  // 0077 W3-f: begin (the SMC ships, and its Bridge and Stream with it: MAGELLANIC's line, defined below, is read lazily)
  { id: 'magellanic', stage: 'W2-e', stages: ['stellar', 'galaxy', 'local-group'], build: () => import('./magellanic.js') },
  // 0077 W3-f: end
];

// 0077 W2-e: begin
// The Magellanic Bridge and Stream's deep-layer line, NOT in DEEP_LAYERS until the SMC's hero ships (internal #783): its
// tests build it from here.
export const MAGELLANIC = { id: 'magellanic', stage: 'W2-e', stages: ['stellar', 'galaxy', 'local-group'], build: () => import('./magellanic.js') };
// 0077 W2-e: end
// 0077 W2-d: begin (the photograph slider is offered only where a reconstruction is shipped; ui/photocompare.js, internal i#776)
/** The hero list's line for a record, or null. */
export const heroForRecord = (recordId) => HEROES.find((h) => h.record === recordId) || null;

/**
 * Is the record's reconstruction shipped? Reads its profile, which is small data and is read when the hero is
 * near anyway; false for a record with no hero, a hero that is not signed off, and a profile that will not load.
 */
export function heroShipped(recordId) {
  const h = heroForRecord(recordId);
  if (!h) return Promise.resolve(false);
  return Promise.resolve().then(() => h.profile()).then((m) => !!(m && m.HERO && m.HERO.shipped)).catch(() => false);
}
// 0077 W2-d: end
