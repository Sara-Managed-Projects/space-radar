// sky/gloss.js -- a few plain words for a satellite whose name means nothing to most people (internal #304).
//
// "Biomass" as the headline pass of Tonight says nothing; "Biomass, a European forest-mapping
// satellite" does. Each line here is the data/layers.js NOTABLE row's own `why` (or, for Biomass, the
// registry/models.yaml row's `used_for`: ESA's P-band forest radar) cut to a handful of words, by
// catalogue number. The familiar names (the ISS, Hubble, Tiangong, Starlink) have no line: they need none.
// An object that is not here gets none, never a guess. Pure data; the English is the data's own, like `why`.

export const WHAT = {
  63772: 'a European forest-mapping satellite',
  28376: 'a NASA ozone-watching satellite',
  41240: 'a sea-level-measuring satellite',
  46984: 'a sea-level-measuring satellite',
  43613: 'an ice-measuring laser satellite',
  38358: 'an X-ray space telescope',
  25867: 'an X-ray space telescope',
  25989: 'a European X-ray telescope',
  43435: 'a planet-hunting space telescope',
  28485: 'a gamma-ray-burst space telescope',
  25994: 'a NASA Earth-watching satellite',
  27424: 'a NASA water-watching satellite',
  37849: 'a weather and night-lights satellite',
  43013: 'a US weather satellite',
  54234: 'a US weather satellite',
  41866: 'a US weather satellite',
  39084: 'a land-photographing satellite',
  49260: 'a land-photographing satellite',
  39634: 'a European radar-imaging satellite',
  40697: 'a European land-imaging satellite',
  42063: 'a European land-imaging satellite',
  43476: 'a gravity-measuring satellite pair',
  40376: 'a soil-moisture satellite',
};

/** The few words for a record, or ''. By its catalogue number (record.meta.noradId, else the digits of its id). */
export function whatIs(record) {
  if (!record) return '';
  const m = record.meta || {};
  const id = Number.isFinite(Number(m.noradId)) && m.noradId !== null && m.noradId !== undefined ? Number(m.noradId) : Number(String(record.id || '').replace(/\D/g, ''));
  return Object.prototype.hasOwnProperty.call(WHAT, id) ? WHAT[id] : '';
}
