// d4-rotators: the stars drawn flattened by their spin (internal #276), and the round ones unchanged.
//   for Vega, Altair, Regulus and Rasalhague: the disc at about four radii out, from where the flight arrives and again from a quarter of
//   the way round the star (the axis is fixed in space, so the second view is the first one seen from the side), then Sirius,
//   which has no measured flattening and must stay a round disc.
// The probe fails if a rotator is not drawn flattened, or Sirius is.
look.probe = 'd4-rotators';
const out = { step: {}, stars: {} };
const find = (ids) => { for (const id of ids) { const r = sr.recordById(id); if (r) return r; } look.missing.push(ids[0]); return null; };
const guard = async (name, fn) => { try { await fn(); out.step[name] = 'ok'; } catch (e) { out.step[name] = 'threw'; look.errors.push('probe: ' + name + ' threw: ' + (e && e.stack || e)); } };
sr.setStage('stellar'); await sleep(12000);
const one = async (key, id, label, expectFlat) => {
  await guard(key, async () => {
    const rec = find([id]);
    if (!rec) return;
    sr.select(rec, { fly: true, undo: false });
    await sleep(25000);
    const st = sr.starDisc ? sr.starDisc.state() : null;
    const units = st && st.radiusKm ? st.radiusKm / sr.stage.unitKm : 0;
    if (units) { rig.flyTo({ distance: units * 4, ms: 0 }); await sleep(6000); }
    const after = sr.starDisc ? sr.starDisc.state() : null;
    out.stars[key] = { flattened: after && after.flattened, drawn: after && after.drawn, radiusPx: after && Math.round(after.radiusPx), teffK: after && after.teffK };
    if (after && !!after.flattened !== expectFlat) out.fail = `${label}: flattened is ${after.flattened}, expected ${expectFlat}`;
    await shot(`d4-${key}-a`, `${label} about four radii out, from the side the flight arrived on`, 3000);
    rig.flyTo({ azimuth: rig.state.azimuth + Math.PI / 2, polar: rig.state.polar, ms: 0 });
    await sleep(5000);
    await shot(`d4-${key}-b`, `${label} from a quarter of the way round the star`, 3000);
  });
};
await one('vega', 'hip-91262', 'Vega (Rpol 2.418, Req 2.726 Suns, seen 6 degrees from its pole)', true);
await one('altair', 'hip-97649', 'Altair (Rpol 1.565, Req 2.008 Suns, axis 51 degrees from the line of sight)', true);
await one('regulus', 'hip-49669', 'Regulus (Rpol 3.22, Req 4.21 Suns, seen nearly equator-on)', true);
await one('rasalhague', 'hip-86032', 'Rasalhague (Rpol 2.390, Req 2.871 Suns, seen nearly equator-on)', true);
await one('sirius', 'hip-32349', 'Sirius, which has no measured flattening: a round disc as before', false);
return finish(out);
