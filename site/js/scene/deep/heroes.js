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
];

// Deep layers that are not one object: the local volume's galaxies (stage e). Built on the stages named.
export const DEEP_LAYERS = [
  { id: 'localvolume', stage: 'e', stages: ['local-group'], build: () => import('./localvolume.js') },
];
