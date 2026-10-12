// tests/probes/finish-verify.js -- what the first look found, looked at again (2026-10-08). Run
// AFTER the axe probe in the same page, so one browser answers both:
//
//   (cat tests/vendor/axe.min.js tests/probes/finish-common.js; sed '$d' tests/probes/axe-probe.js; \
//    cat tests/probes/finish-verify.js) > /tmp/verify.run.js
//
// The welcome's lines on one line each; `?` for every key, still up after the first visit's twelve
// seconds, its trip rows not cut short, and shut by `?`; the ring on the box under the arrow keys;
// True size to one figure; the house in the rail only while away and not over a clear screen.
await step('verify-welcome', async () => {
  localStorage.removeItem('sr:welcome');
  await c.welcome.show(); await wait(700);
  out.v_welcome = { lines: qa('.sr-welcome__lines li').map((n) => ({ t: n.textContent, h: Math.round(n.getBoundingClientRect().height), clipped: n.scrollWidth > n.clientWidth + 1 })), css: qa('link[rel=stylesheet]').map((l) => l.href.split('/').pop()) };
  out.shot_vw = await shot('v1-welcome');
  q('.sr-welcome__look').click(); await wait(300);
});
await step('verify-keys', async () => {
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  await key('?');
  await until(() => q('.sr-keyhint') && !q('.sr-keyhint').hidden && q('.sr-keyhint').classList.contains('is-all'), 6000);
  await wait(800);
  out.v_keys = { open: !!(q('.sr-keyhint') && !q('.sr-keyhint').hidden), all: q('.sr-keyhint').classList.contains('is-all'), box: box('.sr-keyhint'),
    trip: qa('.sr-keyhint__trip .sr-keyhint__item').map((n) => ({ t: n.textContent.trim(), cut: [...n.querySelectorAll('.sr-keyhint__does')].some((d) => d.scrollWidth > d.clientWidth + 1) })) };
  out.shot_vk = await shot('v2-keys');
  // The first visit's own showing arrives meanwhile (asked for here, as main.js would), and twelve seconds pass.
  await c.keyhint.show(); await wait(13500);
  out.v_keys.stays = !!(q('.sr-keyhint') && !q('.sr-keyhint').hidden && q('.sr-keyhint').classList.contains('is-all'));
  await key('?'); await wait(500);
  out.v_keys.closedByKey = !!(q('.sr-keyhint').hidden || q('.sr-keyhint').classList.contains('is-leaving'));
});
await step('verify-layers', async () => {
  await key('l');
  await until(() => q('#sr-show') && !q('#sr-show').hidden && q('.sr-show__list'), 8000); await wait(500);
  await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown');
  const a = document.activeElement; const cs = getComputedStyle(a);
  out.v_layers = { focus: focusName(), outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} +${cs.outlineOffset}`, row: getComputedStyle(a.closest('label')).backgroundColor, tabbable: qa('.sr-show__list [tabindex="0"], .sr-show__list input, .sr-show__list button').filter((n) => n.tabIndex === 0).length };
  out.shot_vl = await shot('v3-layers');
  await key('Escape'); await wait(300);
});
await step('verify-scale', async () => {
  c.explore.setTab('planets');
  await until(() => c.stage.worldId === 'sun' && q('.sr-scalebadge') && !q('.sr-scalebadge').hidden, 15000); await wait(2500);
  out.v_scale = { text: txt('.sr-scalebadge'), house: !!q('#sr-rail .sr-rail__btn--base'), railFirst: q('#sr-rail').firstElementChild.className };
  q('.sr-scalebadge').click(); await wait(900);
  out.v_scale.trueText = txt('.sr-scalebadge');
  q('.sr-scalebadge').click(); await wait(500);
  await key('h'); await wait(1300);
  out.v_scale.clean = { on: document.documentElement.classList.contains('sr-clean'), house: !!q('#sr-rail .sr-rail__btn--base'), badge: shown(q('.sr-scalebadge')) };
  out.shot_vc = await shot('v4-clean');
  await key('h'); await wait(1300);
  out.v_scale.houseBack = !!q('#sr-rail .sr-rail__btn--base');
  c.returnToBase(); await until(() => c.stage.worldId === 'earth' && !c.cameraRig.state.flying, 15000); await wait(2200);
  out.v_scale.houseAtHome = !!q('#sr-rail .sr-rail__btn--base');
});
out.t.end = el();
return out;
