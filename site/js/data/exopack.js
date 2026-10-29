// data/exopack.js -- the confirmed planets as one small typed file (release 1.5.0, 0079 a13).
//
// site/data/exoplanets.bin is written by scripts/exopack.py from the NASA Exoplanet Archive's
// pscomppars table (the layout is in that file's head): 6 423 planets, 259 kB, 133 kB gzipped. It
// replaces the 879 kB snapshot and the 583 kB CSV as what the layer fetches, because the layer is
// ON by default now and a visitor should pay for the numbers a card prints and no more.
//
// decodeExoplanets() returns the SAME records data/parsers.js parseExoplanets() makes from the CSV
// (klass, layer, pos, meta), to the quantisation the file states; tests/test_exopack.mjs decodes the
// file and compares every planet with the CSV row it came from, and with parseExoplanets.
//
// LOADED LATE. The layer is in main.js's LATER_LAYERS: it is asked for after the first screen,
// never at boot, so nothing here is in the first visit's bytes (tests/test_boot_diet.mjs).
import { skyToSunInertialKm } from './parsers.js';

const LY_PER_PC = 3.2615637771674333;
const NONE16 = 0xffff;

/** The file's header, and the offset where its columns begin. Throws on anything that is not the file. */
export function readHeader(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 8 || dv.getUint32(0, false) !== 0x53525850 /* 'SRXP' */ || dv.getUint8(4) !== 1) throw new Error('not an exoplanet pack');
  const hlen = dv.getUint16(6, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hlen)));
  return { header, offset: 8 + hlen };
}

/**
 * @param {ArrayBuffer} buf
 * @returns {Array<Object>} one `static` record per planet, placed at its star
 */
export function decodeExoplanets(buf) {
  const { header, offset } = readHeader(buf);
  const n = header.n;
  let at = offset;
  const col = (Type) => {
    // slice() copies, so the view is aligned whatever the header's length was
    const out = new Type(buf.slice(at, at + n * Type.BYTES_PER_ELEMENT));
    at += n * Type.BYTES_PER_ELEMENT;
    return out;
  };
  const raD = col(Int32Array), decD = col(Int32Array), distD = col(Int32Array);
  const rade = col(Uint16Array), mass = col(Uint16Array), per = col(Uint16Array);
  const teff = col(Uint16Array), srad = col(Uint16Array), year = col(Uint16Array);
  const method = col(Uint8Array), spect = col(Uint16Array);
  const names = new TextDecoder().decode(new Uint8Array(buf, at, header.namesBytes)).split('\n');
  const asOf = header.asOf || null;
  const out = [];
  let ra = 0, dec = 0, dist = 0;
  for (let i = 0; i < n; i++) {
    ra += raD[i]; dec += decD[i]; dist += distD[i];
    const name = names[i];
    const distPc = dist / 1000;
    if (!name || !(distPc > 0)) continue;
    const host = header.hosts[i] !== undefined ? header.hosts[i] : name.replace(/ [a-z]$/, '');
    out.push({
      id: 'exo-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      klass: 'exoplanet',
      layer: 'exoplanets',
      propagator: 'static',
      frame: 'sun-inertial',
      pos: skyToSunInertialKm(ra / 1e6, dec / 1e6, distPc),
      cls: 'measured',
      meta: {
        host,
        distLy: Math.round(distPc * LY_PER_PC * 100) / 100,
        radiusEarths: rade[i] === NONE16 ? null : rade[i] / 100,
        massEarths: mass[i] === NONE16 ? null : Math.pow(10, mass[i] / 10000 - 2),
        periodDays: per[i] === NONE16 ? null : Math.pow(10, per[i] / 6000 - 2),
        discYear: year[i] === 0 ? null : year[i],
        method: method[i] === 255 ? null : header.methods[method[i]],
        starTeffK: teff[i] === 0 ? null : teff[i],
        starRadiusSuns: srad[i] === NONE16 ? null : srad[i] / 100,
        starSpect: spect[i] === NONE16 ? null : header.spects[spect[i]],
        aliases: host ? [host] : [],
        asOf,
        drawnAtStar: true,
        cite: asOf ? `NASA Exoplanet Archive (pscomppars), copy as of ${asOf}` : 'NASA Exoplanet Archive (pscomppars)',
      },
    });
  }
  return out;
}
