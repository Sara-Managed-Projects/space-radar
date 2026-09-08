// propagate/static.js -- things that do not move on any human timescale: stars, galaxies, the
// centre of the Milky Way.
//
// A static record carries its position in KILOMETRES in a named frame: `pos: {x, y, z}` and
// `frame` (spec 0028). Proper motion is real -- Barnard's Star crosses a Moon's width in 180
// years -- and at every zoom this app draws it is far below one pixel, so a fixed position is
// `measured`, not an approximation the card has to apologise for.
//
// It is NOT the `fixed` propagator: that one is geodetic degrees on a world's surface and turns
// with the world. A star turns with nothing.

export function staticPos(record) {
  const p = record && record.pos;
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return null;
  return { x: p.x, y: p.y, z: p.z, frame: record.frame || 'sun-inertial', cls: 'measured' };
}

export { staticPos as static };
export default staticPos;
