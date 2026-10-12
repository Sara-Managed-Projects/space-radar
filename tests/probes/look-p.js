// look-p.js -- a phone: the eclipse trip's peak and its first stop. After look-common.js, with --mobile.
if (await tripStop('chasing-the-solar-eclipse', 1)) { out.eclipse = ctx.worlds.eclipse ? ctx.worlds.eclipse() : null; await shot('phone-eclipse-1-peak', 3500); }
if (await tripStop('chasing-the-solar-eclipse', 0)) { await wait(4000); await shot('phone-eclipse-0-arrives'); }
out.tier = ctx.quality && ctx.quality.tier;
out.ms = Date.now() - t0;
return out;
