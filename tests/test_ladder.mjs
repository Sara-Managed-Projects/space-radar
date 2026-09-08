// tests/test_ladder.mjs -- spec 0028 step 2: the rungs beyond the Solar System, and the sky that
// is only true from here.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage, STAGES, isLadderStage } = await import(join(JS, 'scene/stage.js'));
const { smoothstep, ruleFactor, createLod } = await import(join(JS, 'scene/lod.js'));
const { LOD_RULES } = await import(join(JS, 'data/lod.js'));
const { createWorlds, compressesFrom } = await import(join(JS, 'scene/worlds.js'));

const LY_KM = 9460730472580.8;
const tMs = Date.parse('2026-09-08T12:00:00Z');

// 1. the rungs exist, are ladder stages, and one unit is what the row says
for (const [id, km] of [['stellar', LY_KM], ['galaxy', 30856775814913670], ['local-group', LY_KM * 1e6]]) {
  check(STAGES[id] && Math.abs(STAGES[id].unitKm - km) / km < 1e-9, `${id} is a stage with unit_km ${km}`);
  check(isLadderStage(id), `${id} is a rung of the ladder`);
}
check(!isLadderStage('earth') && !isLadderStage('sun') && !isLadderStage('nowhere'), 'worlds and unknown ids are not rungs');

// 2. a star-like point 4.2465 ly from the Sun lands 4.2465 units out on the stellar rung -- the
//    float32 problem this step exists for: in the Earth stage the same point is 4e10 units.
stage.setWorld('stellar');
stage.setTime(tMs);
const proxima = { x: 4.2465 * LY_KM, y: 0, z: 0, frame: 'sun-inertial' };
const v = stage.toScene(proxima, 'sun-inertial', tMs);
check(v && Math.abs(v.length() - 4.2465) < 1e-6, `Proxima's distance is 4.2465 units on the stellar rung (${v && v.length()})`);
stage.setWorld('earth');
stage.setTime(tMs);
const v2 = stage.toScene(proxima, 'sun-inertial', tMs);
check(v2 && v2.length() > 3.9e10, `the same point is ${v2 && v2.length().toExponential(2)} units in the Earth stage -- past float32's reach`);

// 3. compression is a view from a planet, never from the Sun or a rung
check(compressesFrom('earth') && compressesFrom('mars') && compressesFrom('moon'), 'from a planet or moon the others are squeezed');
check(!compressesFrom('sun') && !compressesFrom('stellar') && !compressesFrom('galaxy'), 'from the Sun and from every rung nothing is squeezed');
{
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null });
  stage.setWorld('sun'); stage.setTime(tMs); worlds.update(tMs);
  const e = worlds.viewScale('earth');
  check(e && e.exaggerated === false && Math.abs(e.trueDistanceKm - e.drawnDistanceKm) < 1, 'from the Sun stage Earth is drawn at its true distance');
  stage.setWorld('earth'); stage.setTime(tMs); worlds.update(tMs);
  const m = worlds.viewScale('mars');
  check(m && m.exaggerated === true, 'from the Earth stage Mars is still drawn nearer (and says so)');
  worlds.dispose();
}

// 4. the sky-from-here rule: full inside 500 au, gone past 5 000 au, eased between
const rule = LOD_RULES.find((r) => r.id === 'sky-from-here');
check(!!rule && rule.what === 'sky-panorama' && rule.fade === 'out', 'the sky-from-here rule is in the mirror');
const AU = 1.495978707e8;
check(ruleFactor(rule, 1 * AU) === 1, 'at 1 au the sky is fully drawn');
check(ruleFactor(rule, 400 * AU) === 1, 'at 400 au the sky is fully drawn');
check(ruleFactor(rule, 6000 * AU) === 0, 'at 6 000 au the sky is gone');
const mid = ruleFactor(rule, 2750 * AU);
check(mid > 0.3 && mid < 0.7, `half way it is half there (${mid})`);
check(smoothstep(5, 0, 10) === 0.5 && smoothstep(-1, 0, 10) === 0 && smoothstep(11, 0, 10) === 1, 'smoothstep is a smoothstep');
check(ruleFactor({ what: 'x', fade: 'in', from_km: 0, to_km: 10 }, 10) === 1 && ruleFactor({ what: 'x', fade: 'in', from_km: 0, to_km: 10 }, 0) === 0, 'fade in is the reverse');
{
  const calls = [];
  const lod = createLod({ 'sky-panorama': (k) => calls.push(k) });
  lod.apply(1 * AU); lod.apply(1.01 * AU); lod.apply(6000 * AU); lod.apply(7000 * AU);
  check(calls.length === 2 && calls[0] === 1 && calls[1] === 0, `the hook is called only when the strength changes (${JSON.stringify(calls)})`);
  const quiet = createLod({});
  quiet.apply(1); // a rule with no hook is skipped, never thrown on
}

if (problems.length) { console.error('ladder FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('ladder ok: three rungs beyond the Solar System, nothing squeezed from the Sun or a rung, the sky-from-here fades out between 500 and 5 000 au');
