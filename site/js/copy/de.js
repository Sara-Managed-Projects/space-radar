// de: German, the words of site/js/copy/en.js, en.later.js and en.facts.js (public #525, spec 0077 W2-f).
// Fetched by copy/index.js only when the page speaks German (?lang=de). docs/TRANSLATING.md says how it was made.
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English, aiming at natural
// German and not a word-for-word copy, and has NOT been read by a native speaker yet. Until a second native
// speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks German only to a visitor who asks for it (?lang=de), never from the browser's language.
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: the informal "du". The app talks to a curious fourteen-year-old and to a family or a class, and the
//     German popular-science sites and programmes for that reader (Wissen macht Ah!, Planet Schule, the museum and
//     planetarium sites for children and families) use "du". Instructions are second-person singular imperatives
//     ("Tippe auf ...", "Lege fest, wo du bist"); where a button names an action it is the bare infinitive ("Teilen", "Hinfliegen").
//   * Honesty words, one word each, everywhere (grep tr/ to check):
//       measured = gemessen          worked out / calculated = berechnet     modelled = modelliert
//       illustrative = illustrativ   reconstructed = rekonstruiert           artist's impression = künstlerische Darstellung
//       sample = Stichprobe          imagined (exoplanet faces) = ausgedacht  estimate / estimated = Schätzung / geschätzt
//       inferred (only where English says "inferred", not "worked out") = erschlossen
//       "about" = etwa              "at least" = mindestens                  "not measured" is never softened.
//     "propagated" (elements carried forward) = fortgeschrieben / weitergerechnet; "a model" = ein Modell.
//   * Names: the Sun, the Moon and the planets take their German names (Merkur, Neptun, Ganymed, Kallisto; Io, Europa, Titan,
//     Enceladus, Triton, Charon are the same). COPY.worlds carries the article in the nominative ("die Sonne", "die Erde",
//     "der Mond") and every template that takes {world} puts it after a colon or as a subject, never after a preposition,
//     because the article of "der Mond" changes with the case. Spacecraft, stars, catalogue entries and agencies keep their names.
//   * Words: "Steckbrief" is a card, "Karte" is the map, "Reise" a trip, "Station" a stop of a trip, "Ebene" a layer,
//     "Bereich" a panel, "Aussehen" the Look panel (Gemessen / Film), "Rundgang" the tour, "Ton" the sound, "Überflug" a pass.
//   * Numbers: the decimal sign is a comma (RULES.decimal), groups of three digits are written with the app's narrow no-break
//     space. Large numbers: Million, Milliarde (10^9), Billion (10^12): English "trillion" is written "Billion".
//     AU is "AE" (Astronomische Einheit), light-year is "Lichtjahr" (Lj), "magnitude" is "Größenklasse" in sentences and "mag" in tight tags.
//   * The compass is written as the dative-after-"im" form so that one string serves "im Südosten", "nach Südosten" and
//     "von Südwesten nach Nordosten": Norden, Nordnordosten, Nordosten, Ostnordosten, Osten ... Short forms are N, NNO, NO, ONO, O ...
//     (German East is O, not E).
//   * Times: "vor 4 Minuten" / "in 4 Minuten" (both take the dative, so COPY.time is written in the dative: "einer Minute", "{n} Tagen").
//
// NOTES, for the reviewer and the lead (things the code or the data cannot carry in German):
//   * COPY.card.articles is ["Die", ""]: withoutLeadingName() ("X ist ..." becomes "Es ist ...") only knows the names it is
//     given; the second entry is the "the" put before a place name, which English place data has and German cannot decline, so it is empty.
//   * COPY.r12Navigate.the / theWord: the English list of names that take "the" cannot carry German case ("zur Sonne",
//     "zum Mond"), and an empty string falls back to English (copy/index.js), which would print "the Sun". the is set to
//     placeholders that never match (∅), so the button reads the registry name alone; theWord stays empty on purpose (same
//     pattern as Portuguese and French).
//   * templates.satellite.leadKind and leadDocked take `kind` from the model registry in English ("a Dragon spacecraft"), which
//     German cannot decline; the template is written so that it still reads ("{name} ist {kind} im Orbit um die Erde").
//   * templates.exoplanet.found puts the data's lowercase English method word inside „...“ ("mit der Methode „transit“ entdeckt").
//   * Catalogue type words (typeText) are translated by RULES.typeWords from a table of the 46 phrases the registry has today;
//     other cards (the "What it is" row, the sky tags) still show the English typeText, which is data.
//   * Record names, trips, the voice and the registry's own descriptions are English: they are not in COPY.
//   * Questions on the English: 070-sentence names "sat-25544": "the ISS" is the only name with an article;
//     tonight.best.dsoLine / markEnds put {dir} after a time ("21:30 Südosten") because the English does.

export const META = {
  code: 'de',
  name: 'Deutsch',
  english: 'German',
  review: { status: 'machine-drafted', by: [], note: 'Needs a second native speaker (docs/TRANSLATING.md, Review).' },
};

// ---- The grammar English had as code (copy/en.js `article`, `typeWords`, `plural`) -------------------------

// The head noun of a phrase decides "ein" or "eine": the LAST word of a compound, the noun before "mit", "in", "der", "von"
// or a comma. Masculine and neuter are both "ein" in the nominative, so only the feminine nouns need listing.
const FEMININE = /(galaxie|galaxy|region|wolke|station|rakete|raketenstufe|sonde|welt|sichel|stufe|rampe|antenne|sternwarte|kuriosität|supernova|eruption|dämmerung|bahn)$/i;

export const RULES = {
  decimal: ',',

  /** German: one only for exactly 1 ("1 Minute", "0 Minuten", "2 Minuten"). */
  plural(n, one, many) {
    return Math.abs(Number(n)) === 1 ? one : many;
  },

  /** "ein" or "eine" for a German type phrase, from its head noun: "eine Galaxie", "ein offener Sternhaufen", "eine Startrampe". */
  article(phrase) {
    let head = String(phrase || '').trim();
    head = head.split(/,| \(| mit | in | der | des | von | und /)[0].trim();
    const last = head.split(/\s+/).pop() || '';
    return FEMININE.test(last) ? 'eine' : 'ein';
  },

  /**
   * The registry's English catalogue type phrases ("Spiral galaxy", "emission nebula in the Large Magellanic Cloud") in German,
   * as they stand after "ist ein/eine ...". German nouns keep their capitals, so nothing is lowercased; a phrase that is not
   * in the table is returned as it came.
   */
  typeWords(text) {
    const s = String(text || '').trim();
    let tail = '';
    let base = s;
    for (const [en, de] of PLACES) {
      if (base.toLowerCase().endsWith(en)) { tail = de; base = base.slice(0, base.length - en.length); break; }
    }
    const hit = TYPES[base.toLowerCase()];
    return hit ? hit + tail : s;
  },
};

const PLACES = [
  [' in the large magellanic cloud', ' in der Großen Magellanschen Wolke'],
  [' in the small magellanic cloud', ' in der Kleinen Magellanschen Wolke'],
  [' in the milky way', ' in der Milchstraße'],
  [' in the local group', ' in der Lokalen Gruppe'],
];

// Every typeText in site/data/dso.json (2026-10-20), lowercased, and the same phrase in German after "ein/eine".
const TYPES = {
  'globular cluster': 'Kugelsternhaufen',
  'open cluster': 'offener Sternhaufen',
  'dwarf spheroidal galaxy': 'sphäroidale Zwerggalaxie',
  'spiral galaxy': 'Spiralgalaxie',
  'emission nebula': 'Emissionsnebel',
  'planetary nebula': 'planetarischer Nebel',
  'dwarf irregular galaxy': 'irreguläre Zwerggalaxie',
  'barred spiral galaxy': 'Balkenspiralgalaxie',
  'elliptical galaxy': 'elliptische Galaxie',
  'lenticular galaxy': 'Linsengalaxie',
  'h ii region nebula with cluster': 'H-II-Region mit Sternhaufen',
  'dwarf elliptical galaxy': 'elliptische Zwerggalaxie',
  'h ii region nebula': 'H-II-Region',
  'barred irregular galaxy': 'irreguläre Balkengalaxie',
  'ultra-faint dwarf galaxy': 'extrem lichtschwache Zwerggalaxie',
  'dark nebula': 'Dunkelnebel',
  'young open cluster in an emission nebula': 'junger offener Sternhaufen in einem Emissionsnebel',
  'supernova remnant': 'Supernova-Überrest',
  'nebula with cluster': 'Nebel mit Sternhaufen',
  'milky way star cloud': 'Sternwolke der Milchstraße',
  'optical double': 'optischer Doppelstern',
  'asterism': 'Asterismus',
  'diffuse nebula': 'diffuser Nebel',
  'starburst galaxy': 'Starburst-Galaxie',
  'dwarf irregular starburst galaxy': 'irreguläre Starburst-Zwerggalaxie',
  'transition dwarf galaxy, part irregular, part spheroidal': 'Übergangs-Zwerggalaxie, teils irregulär, teils sphäroidal',
  'barred irregular galaxy, seen edge-on': 'irreguläre Balkengalaxie, von der Kante gesehen',
  'ultra-faint dwarf galaxy, or perhaps a star cluster': 'extrem lichtschwache Zwerggalaxie, vielleicht auch ein Sternhaufen',
  'transition dwarf galaxy, part spheroidal, part irregular': 'Übergangs-Zwerggalaxie, teils sphäroidal, teils irregulär',
  'spiral galaxy, seen nearly edge-on and bursting with new stars': 'Spiralgalaxie, fast von der Kante gesehen und voller neuer Sterne',
  'peculiar galaxy with a giant black hole firing radio jets': 'ungewöhnliche Galaxie mit einem riesigen Schwarzen Loch, das Radiojets ausstößt',
  'pair of open clusters': 'Paar offener Sternhaufen',
  'spiral galaxy seen exactly edge-on': 'Spiralgalaxie, genau von der Kante gesehen',
  'reflection nebula': 'Reflexionsnebel',
  'reflection and emission nebula': 'Reflexions- und Emissionsnebel',
  'spiral galaxy seen edge-on': 'Spiralgalaxie, von der Kante gesehen',
  'barred spiral galaxy seen edge-on': 'Balkenspiralgalaxie, von der Kante gesehen',
  'spiral galaxy seen face-on': 'Spiralgalaxie in Draufsicht',
  'barred spiral galaxy seen nearly edge-on': 'Balkenspiralgalaxie, fast von der Kante gesehen',
  'pair of colliding galaxies': 'Paar kollidierender Galaxien',
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "Der Himmel wird aufgebaut…",
    "bootEarth": "Die Erde wird platziert…",
    "bootCatalogues": "Die Kataloge werden gelesen…",
    "tagline": "Alles, was sich rund um die Erde bewegt – dort, wo es wirklich ist, genau jetzt.",
    "sceneSelected": "Eine Karte des Weltraums mit den echten Positionen. Ausgewählt ist {name}: Der Steckbrief im Bereich neben der Karte sagt, was es ist."
  },
  "compareText": {
    "size": [
      "etwa so groß wie ein Toaster",
      "etwa so groß wie eine Waschmaschine",
      "etwa so groß wie ein Auto",
      "etwa so groß wie ein Bus",
      "etwa so groß wie ein Haus",
      "etwa so hoch wie ein Haus mit 15 Stockwerken",
      "etwa so hoch wie ein Haus mit 25 Stockwerken",
      "etwa so groß wie ein Fußballfeld",
      "etwa so hoch wie ein Turm mit 40 Stockwerken",
      "etwa so groß wie ein Kreuzfahrtschiff",
      "etwa so hoch wie das höchste Gebäude der Erde",
      "etwa so groß wie ein kleiner Berg",
      "etwa so groß wie eine Stadt"
    ],
    "magnitude": [
      "so hell wie der Vollmond",
      "heller als jeder Stern und jeder Planet",
      "so hell wie die Venus",
      "so hell wie die hellsten Sterne",
      "so hell wie ein gewöhnlicher Stern",
      "an einem dunklen Ort gerade noch zu sehen",
      "zu schwach, um es ohne Teleskop zu sehen"
    ],
    "speed": [
      "{n} km/h, so schnell wie auf der Autobahn",
      "{n} km/h, etwa so schnell wie ein Verkehrsflugzeug",
      "{n} km/h, schneller als eine Gewehrkugel",
      "{n} km/h, etwa {m} km in jeder Minute"
    ],
    "driving": "{n} km hoch, etwa {h} {word} Autofahrt, wenn die Straße senkrecht nach oben ginge",
    "hour": "Stunde",
    "hours": "Stunden",
    "up": "{n} km hoch",
    "moon": "{ld}× so weit weg wie der Mond",
    "lightMinutes": "{lt} Lichtminuten entfernt",
    "lightHours": "{lh} Lichtstunden entfernt",
    "compass": [
      "Norden",
      "Nordnordosten",
      "Nordosten",
      "Ostnordosten",
      "Osten",
      "Ostsüdosten",
      "Südosten",
      "Südsüdosten",
      "Süden",
      "Südsüdwesten",
      "Südwesten",
      "Westsüdwesten",
      "Westen",
      "Westnordwesten",
      "Nordwesten",
      "Nordnordwesten"
    ]
  },
  "numberWords": [
    "keine",
    "ein",
    "zwei",
    "drei",
    "vier",
    "fünf",
    "sechs",
    "sieben",
    "acht",
    "neun",
    "zehn"
  ],
  "shell": {
    "sideLabel": "Erkunden",
    "back": "Erkunden",
    "backLabel": "Zurück zu „Erkunden“",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "Bereich einblenden",
    "collapse": "Bereich ausblenden",
    "topLabel": "Suche und Werkzeuge"
  },
  "tabs": {
    "label": "Wo",
    "earth": "Erde",
    "planets": "Planeten",
    "stars": "Sterne",
    "tonight": "Heute Nacht"
  },
  "rightNow": {
    "title": "Gerade jetzt",
    "storms": "{n} Stürme drehen sich, am stärksten ist {name}.",
    "stormOne": "Ein Sturm dreht sich: {name}.",
    "clouds": "Die Wolken von heute",
    "people": "Menschen im All",
    "iss": "ISS",
    "tiangong": "Tiangong",
    "crewAt": "{n} auf {name}"
  },
  "statusLine": {
    "reading": "Quellen werden gelesen",
    "read": "{n} bei diesem Besuch gelesen",
    "readOne": "Eine bei diesem Besuch gelesen",
    "stale": "{n} veraltet",
    "failed": "{n} nicht lesbar",
    "oldest": "älteste {age}",
    "open": "Quellen öffnen",
    "label": "{text}. Quellen öffnen",
    "offline": "Offline: gespeicherte Kopien ({age})",
    "offlineNone": "Offline: keine gespeicherten Kopien auf diesem Gerät"
  },
  "mission": {
    "title": "Die Mission",
    "count": "{i} von {n}",
    "navLabel": "Die Ereignisse von {name}",
    "prev": "Früheres Ereignis",
    "next": "Späteres Ereignis",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (vorhergesagt)",
    "go": "Zu diesem Zeitpunkt",
    "goTitle": "Die Uhr auf diesen Zeitpunkt stellen und ihn ins Bild holen",
    "here": "Die Uhr steht auf diesem Zeitpunkt. „Live“ bringt sie zurück.",
    "noteSite": "Die Karte kann diesen Ort an jenem Tag zeigen, im Licht dieses Tages.",
    "notePath": "Die Karte kennt den Weg für diesen Tag.",
    "noteCruise": "Für diesen Tag haben wir keinen eigenen Weg: {name} wird auf der geraden Linie zurück von der Stelle gezeichnet, an der es jetzt gemessen wird, auf etwa eine Astronomische Einheit genau.",
    "noteNone": "Die Karte hat für {name} an diesem Tag keinen Weg, deshalb bleibt die Uhr stehen.",
    "noteNoneWorld": "Die Karte hat für {name} an diesem Tag keinen Weg, deshalb bleibt die Uhr stehen. Die Welt, der es begegnet ist, wird für jedes Datum gezeichnet.",
    "seeWorld": "An jenem Tag ansehen: {world}",
    "seeWorldTitle": "Die Uhr auf jenen Tag stellen und hingehen: {world}. {name} selbst wird dort nicht gezeichnet",
    "all": "Alle {n} Ereignisse",
    "fewer": "Liste ausblenden",
    "source": "Daten und Zahlen: ",
    "unknown": "Dieser Link nennt ein Ereignis, das diese Karte nicht hat."
  },
  "tripCard": {
    "title": "Reisen",
    "meta": "{n} Stationen · {m} Min.",
    "metaOne": "1 Station · {m} Min.",
    "planning": "Stationen werden berechnet",
    "starting": "Startet …",
    "cannotRun": "Gerade nicht möglich",
    "offOne": "Eine Reise ist gerade nicht möglich",
    "offMany": "{n} Reisen sind gerade nicht möglich",
    "offWhy": "{line}: {reason}",
    "all": "Alle {n} Reisen",
    "fewer": "Weniger Reisen",
    "onItsOwn": "Von allein laufen",
    "onItsOwnTitle": "Eine Reise nach der anderen, bis du selbst die Steuerung übernimmst",
    "justWatch": "Nur zuschauen",
    "reelLength": "{m} Min. pro Runde",
    "drift": "Treiben",
    "driftLength": "ohne Ende",
    "driftTitle": "Die Kamera wandert von einem Ding zum nächsten"
  },
  "explore": {
    "worldsTitle": "Die Welten",
    "worldsDrawn": "Planeten als Punkte gezeichnet, größer als sie sind.",
    "farTitle": "Ferne Orte",
    "systemsTitle": "Sternsysteme",
    "systemsMild": "Planeten nahe der habitablen Zone",
    "systemsExtreme": "Extreme Systeme",
    "exoRow": "Planeten anderer Sterne",
    "exoShow": "zeigen",
    "exoHide": "ausblenden",
    "exoTitle": "Markiert jeden Stern, von dem Planeten bekannt sind",
    "lightYears": "{n} Lj",
    "au": "{n} AE"
  },
  "rail": {
    "label": "Werkzeuge",
    "show": "Was zeigen (L)",
    "share": "Teilen (P)",
    "more": "Weitere Werkzeuge",
    "moreLabel": "Mehr",
    "menuShare": "Teilen",
    "menuHide": "Bereiche ausblenden",
    "menuGitHub": "Quellcode auf GitHub",
    "blog": "Blog",
    "blogHref": "https://blog.spaceradar.ai/",
    "tour": "Rundgang machen",
    "menuTour": "Rundgang machen"
  },
  "timePill": {
    "label": "Zeit",
    "when": "{date} {time} UTC",
    "live": "LIVE · {when}",
    "held": "{when} · angehalten",
    "away": "{when} · {off}",
    "unknown": "Zeit unbekannt",
    "prev": "‹",
    "next": "›",
    "prevTitle": "Zurück in der Zeit",
    "nextTitle": "Weiter in der Zeit",
    "backToLive": "Live",
    "backToLiveTitle": "Zurück zur echten Zeit, jetzt",
    "rate": "{n}×",
    "rateTitle": "Tempo {n}×. Drücken für {next}×",
    "hold": "Klicken hält die Zeit an, Ziehen bewegt sie",
    "run": "Klicken lässt die Zeit laufen, Ziehen bewegt sie",
    "localTitle": "Deine Zeit: {time}, {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "1 Min.",
      "hour": "1 Std.",
      "day": "1 Tag",
      "event": "Ereignis"
    },
    "unitWords": {
      "minute": "eine Minute",
      "hour": "eine Stunde",
      "day": "ein Tag",
      "event": "ein Ereignis"
    },
    "prevEvent": "Das Ereignis davor",
    "nextEvent": "Das nächste Ereignis",
    "noEventBack": "Kein früheres Ereignis auf der Zeitleiste.",
    "noEventOn": "Kein späteres Ereignis auf der Zeitleiste.",
    "moonMark": "Mond: {phase}, {date}",
    "sunMark": "{what} bei dir, {date}",
    "sunMarkGuess": "{what} an dem Ort, den wir für dich vermuten, {date}",
    "sunWords": {
      "sunrise": "Sonnenaufgang",
      "sunset": "Sonnenuntergang"
    },
    "unitTitle": "Schrittweite: {unit}. Drücken: {next}",
    "tapeLabel": "Zeitleiste. Ziehen oder die Pfeiltasten benutzen",
    "tapeTitle": "Ziehen, um durch die Zeit zu fahren",
    "now": "jetzt",
    "nowTitle": "Zurück zu jetzt",
    "rough": "grober",
    "roughTitle": "Nach mehr als einer Woche ist der Ort eines Satelliten auf seiner Bahn nur grob bekannt",
    "roughSay": "So weit von jetzt sind Satellitenorte nur grob.",
    "worlds": "Die Orte von Planeten und Monden stimmen über Jahrhunderte.",
    "markTitle": "{what}. Drücken, um hinzugehen",
    "endTitle": "Hier endet die Zeitleiste: einen Monat zurück, ein Jahr voraus"
  },
  "punctuation": {
    "comma": ", ",
    "dot": ".",
    "separator": " · ",
    "listJoin": ", ",
    "dash": " – ",
    "colon": ": ",
    "ellipsis": "…",
    "sentenceJoin": ". "
  },
  "worlds": {
    "sun": "die Sonne",
    "mercury": "Merkur",
    "venus": "Venus",
    "earth": "die Erde",
    "moon": "der Mond",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "uranus": "Uranus",
    "neptune": "Neptun",
    "pluto": "Pluto",
    "io": "Io",
    "europa": "Europa",
    "ganymede": "Ganymed",
    "callisto": "Kallisto",
    "phobos": "Phobos",
    "deimos": "Deimos",
    "enceladus": "Enceladus",
    "titan": "Titan",
    "triton": "Triton",
    "charon": "Charon"
  },
  "worldFacts": {
    "cite": {
      "pluto": "Position berechnet mit Astronomy Engine (Don Cross, MIT-Lizenz), die Pluto unter der Anziehung der Sonne und der Riesenplaneten verfolgt; Radius aus dem Pluto-Infokasten von Wikipedia, was es ist, von NASA Science, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "io": "Position berechnet mit Astronomy Engine (Don Cross, MIT-Lizenz): Jupiter plus die Theorie L1.2 für seine Monde (Lainey, Duriez und Vienne); Radius aus dem NASA-Datenblatt zu den Jupitermonden, was es ist, von NASA Science, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "europa": "Position berechnet mit Astronomy Engine (Don Cross, MIT-Lizenz): Jupiter plus die Theorie L1.2 für seine Monde (Lainey, Duriez und Vienne); Radius aus dem NASA-Datenblatt zu den Jupitermonden, was es ist, von NASA Science, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "ganymede": "Position berechnet mit Astronomy Engine (Don Cross, MIT-Lizenz): Jupiter plus die Theorie L1.2 für seine Monde (Lainey, Duriez und Vienne); Radius aus dem NASA-Datenblatt zu den Jupitermonden, was es ist, von NASA Science, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "callisto": "Position berechnet mit Astronomy Engine (Don Cross, MIT-Lizenz): Jupiter plus die Theorie L1.2 für seine Monde (Lainey, Duriez und Vienne); Radius aus dem NASA-Datenblatt zu den Jupitermonden, was es ist, von NASA Science, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "phobos": "Position: Mars aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 6 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Helligkeit aus dem Mars-Datenblatt der NASA, was es ist und Farbe von NASA Science, alles gelesen am 22.09.2026",
      "deimos": "Position: Mars aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 120 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Helligkeit aus dem Mars-Datenblatt der NASA, was es ist und Farbe von NASA Science, alles gelesen am 22.09.2026",
      "enceladus": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 1 480 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, was es ist und Farbe von NASA Science, Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "titan": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 840 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, was es ist, von NASA Science, die Landung von Huygens, Farbe und Beobachtungstipps von Wikipedia, alles gelesen am 22.09.2026",
      "triton": "Position: Neptun aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 10 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, was es ist, von NASA Science, Farbe und Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "charon": "Position: Pluto aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 1 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Helligkeit aus dem Pluto-Datenblatt der NASA, was es ist und Farbe von NASA Science, alles gelesen am 22.09.2026",
      "mimas": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 700 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Saturnmonden, was es ist und Farbe von NASA Science, Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "tethys": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 120 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Saturnmonden, was es ist, von NASA Science, Farbe und Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "dione": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 240 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Saturnmonden, Farbe von NASA Science, was es ist und Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "rhea": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 200 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Saturnmonden, was es ist und Farbe von NASA Science, Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "iapetus": "Position: Saturn aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 6 800 km von 2000 bis 2050, das sind 0,19 Prozent seiner Bahn; Radius aus den physikalischen Satellitenparametern des JPL, beide Albedowerte aus dem NASA-Datenblatt zu den Saturnmonden, was es ist und Farbe von NASA Science, Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "miranda": "Position: Uranus aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 120 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Uranusmonden, was es ist, von NASA Science, Farbe und Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "ariel": "Position: Uranus aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 120 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Uranusmonden, was es ist und Farbe von NASA Science, Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "umbriel": "Position: Uranus aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 410 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Uranusmonden, was es ist, von NASA Science, Farbe und Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "titania": "Position: Uranus aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 1 000 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Uranusmonden, was es ist und Farbe von NASA Science, Helligkeit von Wikipedia, alles gelesen am 22.09.2026",
      "oberon": "Position: Uranus aus Astronomy Engine (Don Cross, MIT-Lizenz), dazu eine an JPL Horizons angepasste Bahn, dagegen geprüft: Abweichung höchstens 1 230 km von 2000 bis 2050; Radius aus den physikalischen Satellitenparametern des JPL, Albedo aus dem NASA-Datenblatt zu den Uranusmonden, was es ist, von NASA Science, Farbe und Helligkeit von Wikipedia, alles gelesen am 22.09.2026"
    }
  },
  "worldView": {
    "withParent": "Zum Auffinden ist {parent} am Himmel {n}-mal breiter gezeichnet, als es scheint. {name} ist im selben Maßstab darum herum gezeichnet: Sein Abstand zum Zentralkörper ({parent}) ist genauso weit gedehnt.",
    "withParentFloor": "{name} selbst ist noch größer gezeichnet, sonst wäre es zu klein, um es zu sehen.",
    "crowded": "{name} ist nicht so breit gezeichnet: {near} ist an diesem Himmel nur {deg} Grad entfernt, und eine Scheibe dieser Größe würde es verdecken."
  },
  "stars": {
    "unnamed": "Ein Stern ohne Namen (HYG {n})"
  },
  "systems": {
    "mercuryRing": "Die Merkurbahn, als Maßstab"
  },
  "ladder": {
    "title": "Wie weit",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, lädt noch",
    "weShowTitle": "Was diese Karte von allem Bekannten zeichnet",
    "weShowRow": "{n} {what} – von {of}",
    "edge": "Der Rand der Karte",
    "edgeHow": "hinausfliegen",
    "edgeTitle": "Ein Flug von hier bis an den Rand dessen, was diese Karte zeichnet",
    "home": "Die Erde",
    "homeHow": "nach Hause fliegen",
    "homeTitle": "Ein Flug von hier zurück zur Erde",
    "flightOff": "Nicht von hier: erst zu „Erde“, „Planeten“ oder „Sterne“"
  },
  "sceneNote": {
    "refused": "Satelliten nicht lesbar.",
    "refusedTitle": "CelesTrak, wo die Bahnen veröffentlicht werden, ließ sich von dieser Verbindung aus nicht lesen. Der Mond, die Planeten, die Sterne und die Reisen, die keine Satelliten brauchen, funktionieren weiter.",
    "why": "Quellen",
    "close": "×",
    "closeTitle": "Diesen Hinweis schließen"
  },
  "link": {
    "unknownVersion": "Link von neuerer Karte. Standardansicht gezeigt.",
    "unknownTrip": "Diese Reise gibt es nicht mehr. Standardansicht gezeigt.",
    "unknownAt": "Objekt nicht auf dieser Karte. Standardansicht gezeigt.",
    "unknownStage": "Kein Zentrieren dort möglich. Standardansicht gezeigt."
  },
  "share": {
    "link": "Teilen",
    "linkTitle": "Diese Ansicht teilen: die Postkarte, den Link und ein paar Zeilen dazu",
    "title": "Teilen",
    "close": "Schließen",
    "pictureAlt": "Die Postkarte: diese Ansicht in Druckgröße neu gezeichnet, mit ihrer Bildunterschrift",
    "drawing": "Die Postkarte wird gezeichnet …",
    "noPicture": "Die Postkarte ließ sich gerade nicht zeichnen.",
    "withTag": "Etikett an der Auswahl",
    "linkLabel": "Link",
    "copyLink": "Link kopieren",
    "textLabel": "Text",
    "lookingUp": "Wird bei Wikipedia nachgeschlagen …",
    "wikiSource": "Der Wikipedia-Artikel, aus dem hier zitiert wird",
    "noWiki": "Kein Wikipedia-Text hier: Beitrag kürzer.",
    "attribution": "Aus Wikipedia, CC BY-SA 4.0",
    "native": "Teilen …",
    "nativeTitle": "Das eigene Teilen-Menü deines Geräts, mit der Postkarte, wo es ein Bild annehmen kann",
    "nativeFailed": "Teilen ließ sich nicht öffnen; kopiere oder lade herunter",
    "copy": "Text kopieren",
    "copyTitle": "Text und Link kopieren, bereit zum Einfügen in einen Beitrag",
    "copied": "Text und Link kopiert",
    "linkCopied": "Link kopiert",
    "copyRefused": "Kopieren verweigert; der Text ist zum Kopieren markiert",
    "jpeg": "JPEG herunterladen",
    "jpegTitle": "Die Postkarte als JPEG-Bild speichern, 6 mal 4 Zoll bei 300 Punkten pro Zoll",
    "pdf": "PDF herunterladen",
    "pdfTitle": "Die Postkarte als einseitiges PDF speichern, 6 mal 4 Zoll, zum Drucken",
    "email": "E-Mail",
    "emailTitle": "Eine E-Mail mit dem Text und dem Link schreiben",
    "emailNote": "E-Mail ohne Bild: „Teilen …“ oder herunterladen.",
    "networksLabel": "Posten auf",
    "networkTitle": "{network} mit diesem Beitrag öffnen, in einem neuen Tab",
    "networkLabel": "Auf {network} posten",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}, auf Space Radar",
    "failed": "Das Teilen ließ sich gerade nicht öffnen",
    "mark": "spaceradar.ai",
    "photo": "Fotomodus",
    "photoTitle": "Ein Bild gestalten: alles ausgeblendet, ein Rahmen, eine Bildunterschrift",
    "embed": "Einbetten",
    "embedTitle": "Den Code kopieren, der diese Live-Ansicht in eine Webseite setzt",
    "embedCopied": "Einbettungscode kopiert",
    "embedRefused": "Das Kopieren wurde gerade verweigert",
    "embedFrameTitle": "{name}, live auf Space Radar",
    "textRow": "Beitragstext"
  },
  "embed": {
    "open": "In Space Radar öffnen",
    "openTitle": "Diese Ansicht in der ganzen Karte öffnen, in einem neuen Tab",
    "barLabel": "Space Radar, eingebettet",
    "stationUnread": "Gezeigt wird die Erde: Der Ort der Station ließ sich nicht lesen"
  },
  "density": {
    "panelTitle": "Dichte",
    "regular": "Normal",
    "compact": "Kompakt",
    "auto": "Automatisch",
    "autoCompact": "Jetzt kompakt, weil dieses Fenster niedrig ist.",
    "autoRegular": "Jetzt normal; kompakt ab 800 px Fensterhöhe oder weniger."
  },
  "nextList": {
    "justHappened": "Gerade passiert",
    "justHappenedTitle": "Starts und Wiedereintritte der letzten sieben Tage",
    "calendar": "Kalender",
    "calendarTitle": "„{title}“ zu deinem Kalender hinzufügen: lädt eine .ics-Datei herunter",
    "calendarSaved": "{file} gespeichert",
    "calendarFailed": "Die Kalenderdatei ließ sich nicht erstellen",
    "sameName": "{name} ({id})",
    "title": "Demnächst",
    "showAll": "Alle {n} zeigen",
    "showFewer": "Weniger zeigen",
    "now": "etwa jetzt",
    "inMinutes": "in {n} Minuten",
    "inHours": "in {n} Stunden",
    "todayAt": "heute um {time}",
    "tomorrowAt": "morgen um {time}",
    "launch": "Start von {name}: {when}",
    "launchRough": "Start von {name}: {when}, ungefähr – das Datum steht noch nicht fest",
    "approach": "{name} fliegt an der Erde vorbei: {when}, {ld}× so weit weg wie der Mond",
    "approachNoDistance": "{name} passiert die Erde {when}",
    "sizeM": "Durchmesser: {n} m",
    "sizeKm": "Durchmesser: {n} km",
    "sizeRangeM": "Durchmesser etwa {lo} bis {hi} m, aus der Helligkeit geschätzt",
    "sizeRangeKm": "Durchmesser etwa {lo} bis {hi} km, aus der Helligkeit geschätzt",
    "sizeMixed": "Durchmesser etwa {lo} m bis {hi} km, aus der Helligkeit geschätzt",
    "perihelion": "{name} ist der Sonne am nächsten: {when}",
    "pass": "{name} überfliegt dich {when}",
    "train": "Ein Zug aus {n} Satelliten fliegt über dich hinweg: {when}",
    "aurora": "NOAA-Vorhersage ab {when}: {word} (Kp {kp})",
    "auroraNow": "Ein geomagnetischer Sturm ist im Gange: {word} (Kp {kp})",
    "shower": "Meteorstrom {name}: Maximum etwa am {date}, bis zu {zhr} Sternschnuppen pro Stunde unter dunklem Himmel",
    "showerMoon": "Meteorstrom {name}: Maximum etwa am {date}, bis zu {zhr} Sternschnuppen pro Stunde unter dunklem Himmel, der Mond ist in dieser Nacht zu {pct} % beleuchtet",
    "showerNoMoon": "Meteorstrom {name}: Maximum etwa am {date}, bis zu {zhr} Sternschnuppen pro Stunde unter dunklem Himmel, und der Mond ist fast neu",
    "radiantHigh": "An deinem Ort steht sein Radiant um {time} am höchsten",
    "radiantLow": "Von deinem Ort aus bleibt sein Radiant die ganze Nacht tief, du darfst also weit weniger erwarten",
    "radiantNeverUp": "Von deinem Ort aus bleibt sein Radiant in dieser Nacht unter dem Horizont",
    "eclipseKinds": {
      "total": "Totale",
      "annular": "Ringförmige",
      "partial": "Partielle",
      "hybrid": "Hybride",
      "penumbral": "Penumbrale"
    },
    "solarEclipseTitle": "{kind} Sonnenfinsternis",
    "lunarEclipseTitle": "{kind} Mondfinsternis",
    "solarEclipse": "{kind} Sonnenfinsternis am {date}: Der Schatten des Mondes fällt am tiefsten {where}",
    "solarEclipseGrazing": "{kind} Sonnenfinsternis am {date}, nur im hohen Norden oder im hohen Süden zu sehen",
    "lunarEclipse": "{kind} Mondfinsternis am {date}: Der Mond steht im Schatten der Erde, für alle, die ihn sehen können",
    "lunarEclipsePenumbral": "{kind} Mondfinsternis am {date}: Der Mond wird nur ein wenig dunkler, im äußeren Schatten der Erde",
    "seasonTitles": {
      "march": "Tagundnachtgleiche im März",
      "june": "Sonnenwende im Juni",
      "september": "Tagundnachtgleiche im September",
      "december": "Sonnenwende im Dezember"
    },
    "seasons": {
      "march": "Tagundnachtgleiche im März am {date}: Tag und Nacht sind fast überall gleich lang",
      "june": "Sonnenwende im Juni am {date}: der längste Tag im Norden, der kürzeste im Süden",
      "september": "Tagundnachtgleiche im September am {date}: Tag und Nacht sind fast überall gleich lang",
      "december": "Sonnenwende im Dezember am {date}: der längste Tag im Süden, der kürzeste im Norden"
    },
    "solstice": "{title} am {date}",
    "equinox": "{title} am {date}",
    "eclipseNear": "bei {city}",
    "eclipseFrom": "etwa {km} km von {city} entfernt",
    "eclipseLocal": "Von deinem Ort aus: Beginn {begin}, Maximum {peak} mit {pct} % der Sonne bedeckt, Ende {end}",
    "eclipseLocalTotal": "Von deinem Ort aus: Beginn {begin}, Totalität {peak}, Ende {end}",
    "eclipseNotVisible": "Von deinem Ort aus nicht zu sehen",
    "eclipseBelowHorizon": "Von deinem Ort aus steht die Sonne währenddessen unter dem Horizont",
    "classOf": {
      "launch": "Ein Plan: die Zeit, die der Startanbieter anpeilt – sie kann sich verschieben",
      "approach": "Vom NASA JPL aus der gemessenen Bahn des Asteroiden berechnet",
      "perihelion": "Aus der veröffentlichten Bahn des Kometen berechnet",
      "shower": "Das übliche Datum im Jahr; das Maximum verschiebt sich um etwa einen Tag",
      "aurora": "Die Vorhersage der NOAA, jeweils für drei Stunden",
      "auroraNow": "Von der NOAA in den letzten Stunden gemessen",
      "pass": "Hier berechnet, aus Bahnelementen, die {age} gemessen wurden",
      "passNoAge": "Hier berechnet, aus Bahnelementen",
      "eclipse": "Hier auf die Minute berechnet, aus der Bewegung von Sonne und Mond",
      "season": "Hier auf die Minute berechnet, aus dem Stand der Sonne",
      "conjunction": "Hier für deinen Ort berechnet, im Moment der größten Nähe, solange beide im Dunkeln am Himmel stehen"
    },
    "row": {
      "conjunctionTitle": "{a} und {b}",
      "conjunction": "{when} · {sep}° Abstand, {height} im {dir}",
      "conjunctionValue": "{sep}°",
      "low": "tief",
      "mid": "mittelhoch",
      "high": "hoch",
      "launch": "Start: {when} · geplant",
      "launchRough": "Etwa {when} · Datum nicht fest",
      "approach": "Vorbeiflug an der Erde: {when}",
      "approachValue": "{ld}× Mondabstand",
      "approachSized": "Vorbeiflug an der Erde: {when} · {size}",
      "sizeM": "{n} m",
      "sizeKm": "{n} km",
      "sizeRangeM": "etwa {lo} bis {hi} m",
      "sizeRangeKm": "etwa {lo} bis {hi} km",
      "perihelion": "Der Sonne am nächsten: {when}",
      "pass": "Überflug: {when}",
      "trainTitle": "Starlink-Zug aus {n}",
      "auroraTitle": "Polarlicht-Vorhersage",
      "auroraNowTitle": "Geomagnetischer Sturm jetzt",
      "aurora": "NOAA-Vorhersage, ab {when}",
      "auroraNow": "Von der NOAA in den letzten Stunden gemessen",
      "kp": "Kp {kp}",
      "showerTitle": "Meteore: {name}",
      "shower": "Maximum etwa am {date} · bis zu {zhr} pro Stunde",
      "eclipse": "{date} · auf die Minute berechnet",
      "eclipseHere": "{date} · von hier {begin} bis {end}",
      "eclipseNotHere": "{date} · von hier nicht zu sehen"
    },
    "none": "Nichts Anstehendes in dem, was geladen ist.",
    "notLoaded": "Nicht geladen, deshalb nicht aufgeführt: {layers}."
  },
  "groundTrack": {
    "tick": "+{n} Min.",
    "label": "Verfolgen",
    "rideAlong": "Mitfliegen",
    "rideAlongTitle": "Die Kamera knapp dahinter setzen, mit Blick voraus entlang seiner Bahn. Ziehen zum Anhalten.",
    "lookBeside": "Von der Seite aus schauen",
    "showTrack": "Bodenspur zeichnen",
    "hideTrack": "Bodenspur ausblenden",
    "highNote": "Seine Spur über dem Boden wird in dieser Höhe nicht eigens gezeichnet: Es bewegt sich kaum.",
    "trackNote": "Die Linie auf dem Globus ist der Boden unter ihm, 45 Minuten zurück (gestrichelt) und 90 voraus, mit einer Markierung alle 5 Minuten."
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "Weltraumwetter: {level} – gemessen {age}, {via}.",
    "forecastOnly": "Weltraumwetter: {level} – eine Vorhersage, keine Messung; {via}.",
    "stale": "Dieser Messwert ist älter, als die NOAA verspricht; nimm ihn als Schätzung.",
    "stormComing": "Die NOAA sagt einen Anstieg auf Kp {kp} voraus.",
    "couldNotLook": "Weltraumwetter: konnte nicht nachgesehen werden – {why}",
    "couldNotLook0": "Weltraumwetter: konnte nicht nachgesehen werden.",
    "justNow": "gerade eben",
    "currentBin": "für den aktuellen Zeitraum von drei Stunden",
    "aMinuteAgo": "vor einer Minute",
    "minutesAgo": "vor {n} Minuten",
    "anHourAgo": "vor einer Stunde",
    "hoursAgo": "vor {n} Stunden",
    "aDayAgo": "vor einem Tag",
    "daysAgo": "vor {n} Tagen",
    "ageUnknown": "zu einer Zeit, die die NOAA nicht nannte",
    "viaLive": "NOAA SWPC, live gelesen",
    "viaSnapshot": "NOAA SWPC, aus unserer Kopie",
    "words": {
      "unknown": "kein Messwert",
      "quiet": "ruhig",
      "unsettled": "unruhig",
      "active": "aktiv",
      "minorStorm": "ein schwacher Sturm – Polarlicht im hohen Norden und Süden möglich",
      "moderateStorm": "ein mäßiger Sturm – Polarlicht in hohen Breiten wahrscheinlich",
      "strongStorm": "ein starker Sturm – Polarlicht weit weg von den Polen, Satelliten werden von ihrer Bahn gedrängt",
      "severeStorm": "ein schwerer Sturm",
      "extremeStorm": "ein extremer Sturm"
    }
  },
  "chooser": {
    "label": "Dinge unter deinem Finger",
    "hint": "{n} hier. Tippe eines an oder tippe auf den Himmel, um zu schließen."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "Schließen",
    "closeTitle": "Diesen Steckbrief schließen (Esc)",
    "it": "Es",
    "articles": [
      "Die",
      ""
    ],
    "leadVerbs": [
      "ist",
      "war"
    ],
    "makeCentre": "{name} zur Mitte der Karte machen",
    "isCentre": "Das ist die Mitte der Karte",
    "centreShort": "Karte hier zentrieren",
    "ownPage": "Eigene Seite",
    "ownPageTitle": "Eine Seite über es, auf die du verlinken kannst, in einem neuen Tab",
    "isCentreShort": "Hier zentriert",
    "comparisonsLabel": "Damit du ein Gefühl dafür bekommst",
    "rightNowLabel": "Gerade jetzt",
    "seeItLabel": "Von hier aus ansehen",
    "actionsLabel": "Was du tun kannst",
    "unknownName": "Objekt ohne Namen",
    "unknownKind": "{name} ist auf der Karte, aber wir wissen nicht, was für ein Objekt es ist",
    "rows": {
      "altitude": "Höhe über dem Boden",
      "speed": "Tempo",
      "groundPoint": "Fliegt über",
      "below": "Jetzt darunter",
      "fromYou": "Entfernung von dir",
      "fromGuess": "Entfernung von {place}, unsere Vermutung für deinen Ort",
      "distanceFromEarth": "Entfernung von der Erde",
      "distanceFromSun": "Entfernung von der Sonne",
      "lightLeft": "Sein Licht startete",
      "sunlight": "Gerade jetzt",
      "hostStar": "Sein Stern",
      "across": "Durchmesser",
      "mass": "Masse",
      "spin": "Eine Drehung dauert",
      "source": "Gelesen aus",
      "whySource": "Warum man es kennt, gelesen aus",
      "widthSource": "Breite gelesen aus",
      "distanceNote": "Etwa diese Entfernung",
      "objectType": "Was es ist",
      "constellation": "Sternbild",
      "distanceRange": "Entfernung, beste Schätzungen",
      "planetRadius": "Breite (Erde = 1)",
      "planetMass": "Masse (Erde = 1)",
      "yearLength": "Ein Jahr dort",
      "found": "Entdeckt",
      "catalogueCopy": "Katalogkopie",
      "spectralType": "Art des Sterns",
      "brightness": "Scheinbare Helligkeit",
      "luminosity": "Lichtleistung",
      "starWidth": "Durchmesser",
      "catalogue": "Katalog",
      "lightTime": "Funklaufzeit je Richtung",
      "nextPass": "Nächster Überflug",
      "crew": "Menschen an Bord",
      "operator": "Betrieben von",
      "launched": "Gestartet",
      "ended": "Beendet",
      "pathEnds": "Sein Weg endet",
      "pathBegins": "Sein Weg beginnt",
      "period": "Ein Umlauf dauert",
      "location": "Wo es steht",
      "onWorld": "Steht auf",
      "orbiting": "Im Orbit um",
      "heightAbove": "Höhe über dem Boden ({world})",
      "closestApproach": "Der Erde am nächsten",
      "moons": "Monde",
      "perihelion": "Der Sonne am nächsten",
      "magnitude": "Helligkeit",
      "phase": "Phase",
      "liftoff": "Start",
      "pad": "Startplatz",
      "destination": "Ziel",
      "whereabouts": "Wo es ist",
      "lastSeen": "Zuletzt bekannt",
      "stormNow": "Bei der letzten Meldung",
      "stormWind": "Stärkster Wind auf seiner Bahn",
      "stormAdvisory": "Letzte Meldung",
      "stormCentre": "Sein Zentrum",
      "stormAgency": "Gemeldet von",
      "stormAlert": "GDACS-Alarmstufe"
    },
    "values": {
      "km": "{n} km",
      "kmh": "{n} km/h",
      "belowBorder": "nahe der Grenze von {a} und {b}",
      "belowLand": "Land",
      "belowWater": "offenes Wasser",
      "stormWind": "{n} km/h, Vorhersage eingerechnet",
      "stormWindCategory": "{n} km/h, Kategorie {cat}, Vorhersage eingerechnet",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "Hurrikanstärke",
        "typhoon": "Taifunstärke",
        "cyclone": "Zyklonstärke",
        "storm": "tropischer Sturm",
        "depression": "tropisches Tief"
      },
      "stormAlert": {
        "green": "grün",
        "orange": "orange",
        "red": "rot"
      },
      "launchedAgo": "vor {n} Tagen, am {date}",
      "au": "{n} Astronomische Einheiten",
      "lightYears": "{n} Lichtjahre",
      "inSunlight": "im Sonnenlicht",
      "inShadow": "im Schatten der Erde",
      "yearsAgo": "vor {n} Jahren",
      "monthsAgo": "vor {n} Monaten",
      "suns": "{n}× Sonne",
      "sunsWide": "{n}× Sonne, geschätzt",
      "sunsWideMeasured": "{n}× Sonne, gemessen",
      "earths": "{n}× Erde",
      "lightYearsRange": "{lo} bis {hi} Lichtjahre",
      "kmRange": "{lo} bis {hi} km",
      "noMoonsKnown": "keine bekannt",
      "sunsRange": "{lo} bis {hi}× Sonne",
      "millionSuns": "{n} Millionen Sonnen",
      "billionSuns": "{n} Milliarden Sonnen",
      "milliseconds": "{n} Millisekunden",
      "billionYearsAgo": "vor {n} Milliarden Jahren",
      "millionYearsAgo": "vor {n} Millionen Jahren",
      "days": "{n} Tage",
      "hours": "{n} Stunden",
      "yearByMethod": "{year}, {method}",
      "asOf": "Stand: {date}",
      "magnitude": "Größenklasse {n}",
      "lunar": "{n}× so weit weg wie der Mond",
      "minutes": "{n} Minuten",
      "seconds": "{n} Sekunden",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{lat}, {lon} ({world})",
      "north": "{n}° N",
      "south": "{n}° S",
      "east": "{n}° O",
      "west": "{n}° W"
    },
    "couldNotLook": "Ließ sich nicht berechnen",
    "nobodyKnows": "Das weiß niemand",
    "wouldNeed": "Es würde {wouldNeed} dauern.",
    "endedLine": "Seine Mission endete am {date}. Seine Ereignisse unten führen dorthin zurück.",
    "pathEndedLine": "Der Weg, den das JPL für es hat, endet am {date}. Seine Ereignisse unten führen dorthin zurück.",
    "pathBeginsLine": "Der Weg, den das JPL für es hat, beginnt am {date}. Seine Ereignisse unten führen dorthin zurück.",
    "actions": {
      "flyTo": "Hinfliegen",
      "flyToTitle": "Die Kamera zu diesem Objekt bewegen",
      "flyEnded": "Es endete am {date}. Wähle ein Ereignis seiner Mission, um dorthin zu gehen",
      "flyPathEnded": "Sein Weg endet am {date}. Wähle ein Ereignis seiner Mission, um dorthin zu gehen",
      "flyPathBegins": "Sein Weg beginnt am {date}. Wähle ein Ereignis seiner Mission, um dorthin zu gehen",
      "flyNowhere": "Für dieses Objekt gibt es im Moment keine Position",
      "seeFromHere": "Von hier aus ansehen",
      "seeFromHereTitle": "Von deinem eigenen Ort auf der Erde nach oben schauen",
      "follow": "Folgen",
      "followTitle": "Hinfliegen und es in der Mitte der Ansicht halten",
      "ride": "Mitfliegen",
      "rideShort": "Mitflug",
      "seeShort": "Ansehen",
      "postcard": "Postkarte",
      "share": "Teilen"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "Planet",
      "moon": "Mond",
      "dwarf": "Zwergplanet",
      "ourStar": "Stern",
      "exoplanet": "Exoplanet"
    },
    "regime": {
      "leo": "Niedriger Erdorbit",
      "meo": "Mittlerer Erdorbit",
      "geo": "Geostationärer Orbit",
      "heo": "Hoher Erdorbit",
      "inner": "Inneres Sonnensystem",
      "outer": "Äußeres Sonnensystem",
      "belt": "Asteroidengürtel",
      "beyondNeptune": "Jenseits des Neptun",
      "round": "Orbit: {world}",
      "inCon": "Sternbild {con}",
      "onWorld": "Ort: {world}",
      "centre": "Zentrum des Sonnensystems",
      "nearby": "Unter den nächsten"
    },
    "hero": {
      "label": "In drei Zahlen",
      "missing": "—",
      "captions": {
        "altitude": "{u} hoch",
        "away": "{u} entfernt",
        "speed": "{u}",
        "period": "{u} pro Runde",
        "distanceFromSun": "{u} von der Sonne",
        "distanceFromEarth": "{u} von der Erde",
        "lightTime": "{u} je Richtung",
        "spin": "{u} pro Drehung",
        "yearLength": "{u} pro Jahr",
        "brightness": "Größenklasse",
        "spectralType": "Sternklasse",
        "across": "{u} breit",
        "lightLeft": "{u} entfernt",
        "launched": "Tage im All",
        "fromYou": "{u} von dir",
        "heightAbove": "{u} hoch",
        "other": "{u}"
      },
      "units": {
        "minutes": "Min.",
        "hours": "Std.",
        "days": "Tage",
        "seconds": "s",
        "milliseconds": "ms",
        "astronomical units": "AE",
        "light-years": "Lj",
        "years ago": "Lj",
        "million years ago": "Mio. Lj",
        "billion years ago": "Mrd. Lj",
        "months ago": "Lichtmonate"
      }
    },
    "sections": {
      "label": "Mehr dazu",
      "see": "Wann man es sehen kann",
      "path": "Sein Weg",
      "aboard": "Wer an Bord ist",
      "ridingOn": "Worauf es mitfliegt",
      "about": "Über dieses Objekt",
      "sources": "Quellen für diesen Eintrag",
      "placeGuessed": "Ort geschätzt",
      "needsPlace": "braucht deinen Ort",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "{n} Sonnenfleckengruppen sind gezeichnet, nach der Liste der NOAA vom {date}: jede als ein runder Fleck an ihrem gemeldeten Ort und in ihrer gemeldeten Größe, seither von der Drehung der Sonne weitergetragen.",
    "spotsOne": "Eine Sonnenfleckengruppe ist gezeichnet, nach der Liste der NOAA vom {date}: als ein runder Fleck an ihrem gemeldeten Ort und in ihrer gemeldeten Größe, seither von der Drehung der Sonne weitergetragen.",
    "spotsPaired": "{n} Sonnenfleckengruppen sind gezeichnet, nach der Liste der NOAA vom {date}, seither von der Drehung der Sonne weitergetragen. Bei {pairs} davon mit mehreren Flecken gibt es einen führenden Fleck im Westen und einen folgenden im Osten; der Abstand und die Aufteilung der Fläche auf die beiden sind illustrativ. Die übrigen sind je ein runder Fleck.",
    "spotsPairedOne": "Eine Sonnenfleckengruppe ist gezeichnet, nach der Liste der NOAA vom {date}, seither von der Drehung der Sonne weitergetragen: als ein führender Fleck im Westen und ein folgender im Osten. Der Abstand und die Aufteilung der Fläche auf die beiden sind illustrativ.",
    "regionsCredit": "Die Sonnenfleckengruppen von heute: NOAA Space Weather Prediction Center, Übersicht der Sonnenregionen",
    "flaresCredit": "Sonneneruptionen: NOAA Space Weather Prediction Center, bearbeitete Ereignisliste",
    "cmeCredit": "Koronale Massenauswürfe: NASA DONKI (Moon to Mars Space Weather Analysis Office und CCMC)"
  },
  "clouds": {
    "live": "Wolken: gesehen {when}, {ago}, im Infrarot von {satellites}, über NASA GIBS. Die kältesten Wolkenspitzen, wo Gewitter sind, sind höher und weißer gezeichnet als der Rest. Über Europa, Afrika, dem Indischen Ozean und den Polen, die keiner dieser Satelliten sieht, sind sie illustrativ.",
    "at": "um {time} UTC",
    "between": "zwischen {from} und {to} UTC",
    "atDated": "am {date} um {time} UTC",
    "betweenDated": "am {date} zwischen {from} und {to} UTC",
    "clockElsewhere": " Die Uhr steht auf {time} UTC am {date}; die Wolken bleiben so, wie dieses Bild sie sah.",
    "and": " und ",
    "illustrative": "Wolken: illustrativ. Das ist ein Bild eines vergangenen Tages, das langsam driftet; es ist nicht das Wetter von heute.",
    "illustrativeSaveData": "Wolken: illustrativ. Die heutigen Satellitenbilder werden bei einer Verbindung, die Daten spart, nicht geladen.",
    "illustrativeScrubbed": "Wolken: illustrativ, weil die Uhr mehr als 12 Stunden vom neuesten Satellitenbild entfernt ist, vom {date} um {time} UTC.",
    "gibsAcknowledgement": "Wir danken für die Nutzung von Bildern, die von den Diensten der NASA Global Imagery Browse Services (GIBS) bereitgestellt werden, einem Teil des NASA Earth Science Data and Information System (ESDIS).",
    "satelliteCredit": "Live-Wolken: Infrarotbilder von GOES-East und GOES-West, NOAA; Infrarotbilder von Himawari, Japan Meteorological Agency (JMA)."
  },
  "aurora": {
    "live": "Polarlicht: wo das Modell OVATION der NOAA es in der nächsten Stunde erwartet (seine Vorhersage für {time} UTC, erstellt {ago}), kein Foto. Die feinen Falten darin sind gezeichnet.",
    "liveNoFolds": "Polarlicht: wo das Modell OVATION der NOAA es in der nächsten Stunde erwartet (seine Vorhersage für {time} UTC, erstellt {ago}), kein Foto.",
    "waiting": "Polarlicht: Die Vorhersage der NOAA ist noch nicht eingetroffen.",
    "failed": "Polarlicht: Die Vorhersage der NOAA ließ sich gerade nicht lesen, deshalb wird keines gezeichnet.",
    "far": "Polarlicht: nicht gezeichnet, weil die Uhr mehr als drei Stunden von der neuesten Vorhersage der NOAA entfernt ist.",
    "saveData": "Polarlicht: Die Vorhersage der NOAA wird bei einer Verbindung, die Daten spart, nicht geladen.",
    "switchedOff": "Polarlicht: in den Ebenen ausgeschaltet.",
    "credit": "Polarlicht: Vorhersage mit dem Modell OVATION Prime des NOAA Space Weather Prediction Center (gemeinfrei).",
    "rightNow": "Polarlicht wahrscheinlich nahe den Polen",
    "rightNowReach": "Polarlicht wahrscheinlich bis {lat}° Breite",
    "rightNowValue": "Kp {kp}",
    "showMe": "Zum Polarlicht auf der Nachtseite fliegen"
  },
  "weather": {
    "lightning": {
      "live": "Blitze: etwa {n} Einschläge pro Minute dort, wo die Karte der NOAA reicht, in Amerika und über dem Pazifik (ihre Zählung bis {time}, {ago}). Wo und wie oft, ist gemessen; der Augenblick jedes Blitzes ist gezeichnet, und größer als in Wirklichkeit.",
      "quiet": "Blitze: fast keine dort, wo die Karte der NOAA reicht, in Amerika und über dem Pazifik (ihre Zählung bis {time}, {ago}).",
      "waiting": "Blitze: Die Karte der NOAA ist noch nicht eingetroffen.",
      "failed": "Blitze: Die Karte der NOAA ließ sich gerade nicht lesen, deshalb werden keine gezeichnet.",
      "away": "Blitze: nicht gezeichnet, weil die Uhr mehr als eine Stunde von der neuesten Karte der NOAA entfernt ist.",
      "off": "Blitze: auf diesem Gerät oder dieser Verbindung nicht geladen.",
      "reducedMotion": "Blitze: nicht gezeichnet, weil dieses Gerät weniger Bewegung wünscht.",
      "switchedOff": "Blitze: in den Ebenen ausgeschaltet.",
      "credit": "Blitze: Einschlagsdichte von NOAA nowCOAST, erstellt vom NWS Ocean Prediction Center aus den Bodennetzen NLDN und GLD360 (gemeinfrei)."
    },
    "worlds": {
      "jupiter": "Wetter: Die Bänder gleiten mit den Windgeschwindigkeiten aneinander vorbei, die von Hubble aus gemessen wurden, und der Große Rote Fleck dreht sich. Modellierte Bewegung: Dort, wo heute eine Wolke ist, wird keine gezeichnet.",
      "saturn": "Wetter: Die Bänder bewegen sich mit den Windgeschwindigkeiten, die Cassini gemessen hat. Modellierte Bewegung, nicht die Wolken von heute. Das Sechseck am Nordpol ist an seinem gemessenen Ort gezeichnet; sein Aussehen ist illustrativ.",
      "venus": "Wetter: Die Wolkendecke dreht sich in etwa vier Tagen einmal herum, wie Venus Express gemessen hat, sechzigmal schneller als der Boden. Modellierte Bewegung, nicht die Wolken von heute.",
      "uranus": "Wetter: Die Luft treibt mit den Windgeschwindigkeiten herum, die von Keck und Gemini aus gemessen wurden. Modellierte Bewegung, nicht die Wolken von heute.",
      "neptune": "Wetter: Die Luft strömt mit den Windgeschwindigkeiten herum, die Voyager 2 gemessen hat, den schnellsten auf allen Planeten. Modellierte Bewegung, nicht die Wolken von heute.",
      "mars": "Wetter: Auf dem Mars ist {season}. Die Eiskappen und der Staub in seiner Luft, eine optische Dicke von etwa {tau}, sind das, was diese Jahreszeit üblicherweise bringt: jahreszeitlich und illustrativ, nicht das Wetter von heute.",
      "titan": "Wetter: Die hellen Streifen im Norden stehen für die Methanwolken, die die Teleskope Webb und Keck dort im November 2022 und im Juli 2023 gesehen haben. Illustrativ: Wo die Wolken des Titan heute sind, ist nicht bekannt."
    },
    "also": {
      "venus": "Das dunkle Y, das mit herumzieht, ist das, was Ultraviolettkameras sehen; für das Auge ist die Venus fast einfarbig, und die Lage des Y ist hier illustrativ. Blitze auf der Venus wurden gemeldet und sind noch umstritten; es wird keiner gezeichnet.",
      "uranus": "Die helle Kappe über dem Nordpol ist echt: Ihre Helligkeit und Farbe, Breitengrad für Breitengrad, stammen aus Hubbles Karte vom Oktober 2025, und Hubble hat beobachtet, wie sie Jahr für Jahr heller wird, je näher der Nordsommer 2028 rückt.",
      "neptune": "Das dunkle Oval auf der künstlerischen Karte ist der Große Dunkle Fleck, den Voyager 2 im Jahr 1989 sah und der 1994 verschwunden war: illustrativ, in „Gemessen“ nicht gezeichnet. In „Film“ werfen Methan-Zirren Schatten, sechsmal breiter und höher gezeichnet als gemessen; jeder Streifen stammt von uns."
    },
    "flashes": {
      "jupiter": "Auf seiner Nachtseite stehen seltene Lichtblitze für die Blitze, die Juno gefunden hat, die meisten weit im Norden: Die Breitengrade sind gemessen, jeder Lichtblitz ist illustrativ und größer als in Wirklichkeit gezeichnet.",
      "saturn": "Auf seiner Nachtseite stehen seltene Lichtblitze bei 36 Grad Süd für die Blitze, die Cassini dort 2009 fotografiert hat: illustrativ und größer als in Wirklichkeit, und derzeit schaut niemand danach."
    },
    "seasons": [
      "Frühling im Norden",
      "Sommer im Norden",
      "Herbst im Norden",
      "Winter im Norden"
    ]
  },
  "drawing": {
    "orbitLine": "Die Linie ist ein Umlauf voraus, berechnet aus denselben Bahnelementen wie der Punkt.",
    "orbitLineYear": "Die Linie ist das kommende Jahr seines Weges, berechnet aus denselben Bahnelementen wie der Punkt.",
    "orbitLineWhole": "Die Linie ist seine ganze Bahn um die Sonne, berechnet aus denselben Bahnelementen wie der Punkt.",
    "orbitLinePassage": "Die Linie ist sein einmaliger Durchgang durchs Sonnensystem, hinein und wieder hinaus, berechnet aus denselben Bahnelementen wie der Punkt.",
    "variant": "gezeichnet nach veröffentlichten Maßen für {name}",
    "family": "gezeichnet als {name} – die Grundform und die Höhe der Familie, nicht genau diese Version",
    "generic": "gezeichnet als allgemeine Rakete; für {name} haben wir keine Maße",
    "genericUnnamed": "gezeichnet als allgemeine Rakete; für dieses Fahrzeug haben wir keine Maße",
    "disputed": "die Quellen sind sich über seine Höhe nicht einig ({disputed})",
    "objectVariant": "gezeichnet nach veröffentlichten Maßen für {name}",
    "objectModel": "gezeichnet nach einem veröffentlichten Modell von {name}",
    "padEmpty": "die Startrampe ist ein gemessener Ort; {name} wird nur um die aufgeführten Starts herum darauf gezeichnet",
    "objectMapped": {
      "dawn": "seine Oberfläche ist das Schwarz-Weiß-Mosaik der Raumsonde Dawn, in einem von uns gewählten Grau getönt; die Schatten in seinen Kratern sind die, die Dawn fotografiert hat, und wandern hier nicht mit der Sonne"
    },
    "objectFamily": "gezeichnet als {name} – die Art von Ding, nicht genau dieses",
    // b200-m2-buses: begin
    "objectBus": "Bus: {bus} ({source}). Mit einem Ersatz-Bus gezeichnet.",
    // b200-m2-buses: end
    "objectOwn": "gezeichnet als {name}",
    "objectMade": {
      "images": "Form aus Fotos gebaut; Proportionen ungefähr",
      "render": "Form nach einer künstlerischen Darstellung gebaut; Proportionen ungefähr",
      "dimensions": "Form aus veröffentlichten Maßen und Bildern gebaut; Einzelheiten vereinfacht"
    },
    "objectWas": {
      "hitomi": "ganz gezeigt, so wie im Februar 2016 gestartet; fünf Wochen später brach es auseinander, und was hier verfolgt wird, ist sein Hauptkörper ohne die Solarflügel",
      "envisat": "in ruhiger Lage gezeigt, die Instrumente zur Erde gerichtet, so wie es flog, als es noch arbeitete; es ist seit 2012 tot, und niemand steuert es",
      "ers1": "in ruhiger Lage gezeigt, die Instrumente zur Erde gerichtet, so wie es flog, als es noch arbeitete; seine Mission endete 2000, und niemand steuert es"
    },
    "objectGeneric": "gezeichnet als allgemeines Objekt; für {name} haben wir keine Form",
    "classShape": {
      "satellite": "ein allgemeiner Satellit",
      "station": "eine allgemeine Raumstation",
      "debris": "ein Trümmerstück",
      "rocket": "eine allgemeine Rakete",
      "probe": "eine allgemeine Sonde",
      "telescope": "ein allgemeines Teleskop",
      "asteroid": "ein allgemeiner Asteroid",
      "dwarf": "ein schlichter runder Körper in seiner gemessenen Größe",
      "comet": "ein allgemeiner Komet",
      "site": "ein allgemeiner Ort am Boden",
      "star": "ein Lichtpunkt, in seiner Größe danach bemessen, wie hell er von deinem Ort aus aussieht",
      "exoplanet": "eine Markierung an seinem Stern – die Bahn selbst ist viel zu klein zum Zeichnen",
      "dso": "ein weiches Leuchten, wie es seiner Art entspricht, in seiner gemessenen Entfernung und so breit, wie es gemessen wird; das Muster darin ist illustrativ, und seine wahre Form wird nicht gezeichnet",
      "exotic": "ein Ring in seiner gemessenen Entfernung; ein Schwarzes Loch hat keine Form, die man zeichnen könnte, und ein Pulsar ist viel zu klein",
      "exoticStar": "ein Ring in seiner gemessenen Entfernung; der Stern selbst ist in diesem Maßstab ein Punkt"
    },
    "storm": "gezeichnet als Markierung an seinem Zentrum; der Sturm selbst ist die Wolke darum herum",
    "feature": "ein benannter Ort: gezeichnet ist hier nur eine Markierung an seinem Zentrum, gesetzt nach der genannten Quelle; der Boden darunter ist die Karte selbst", // 0077 W3-d
    "objectSpin": { "spin": "er dreht sich um seinen gemessenen Pol mit der gemessenen Geschwindigkeit; welche Seite gerade zur Sonne zeigt, ist keine Vorhersage", "pair": "beide drehen sich um ihren gemessenen Pol mit den gemessenen Geschwindigkeiten, und Dimorphos umkreist ihn in dem Abstand und der Zeit, die nach dem Einschlag von DART gemessen wurden; wo er auf dieser Bahn steht, ist illustrativ", "comet": "er dreht sich um seinen gemessenen Pol mit der 2014 gemessenen Geschwindigkeit, die die Sonne seither bei jedem Vorbeiflug um einige Minuten verändert hat; welche Seite der Sonne in diesem Moment zugewandt ist, ist keine Vorhersage", "still": "er ist in der Ausrichtung seines Radarmodells gezeichnet und dreht sich hier nicht: das Modell gibt nicht an, wo seine Drehachse liegt", "moonSpin": "er zeigt Saturn immer dieselbe Seite und dreht sich einmal pro Umlauf um den Pol, den die Konstanten der IAU für ihn angeben; welche Seite gerade zur Kamera zeigt, ist das Ergebnis dieser Formel, keine Vorhersage", "moonStill": "er ist in der Ausrichtung seines Modells gezeichnet und dreht sich hier nicht: In den Konstanten, die diese App liest, sind für ihn kein stetiger Pol und keine Drehrate angegeben" }, // 0077 W3-d 0079 B2
    "objectSeen": { "lutetia": "Rosettas Bilder decken mehr als die Hälfte seiner Oberfläche ab; der Rest der Form ist aus seinen Helligkeitsänderungen angepasst, nicht fotografiert", "steins": "Rosettas Bilder decken etwa 60 Prozent seiner Oberfläche ab; der Rest der Form ist aus seinen Helligkeitsänderungen angepasst, nicht fotografiert", "donj": "die Form ist aus Lucys Bildern durch Stereophotogrammetrie und durch Anpassen seines Umrisses gebaut; die Seite, die Lucy nicht gesehen hat, ist die der Anpassung", "arrokoth": "die Bilder von New Horizons decken die Seite ab, an der die Sonde vorbeiflog; die andere Seite ist erschlossen, nicht fotografiert, und die Farbe ist seine Albedokarte in einem roten Ton", "radar": "die Form ist aus Radarechos gebaut, nicht aus Bildern: ihr Umriss ist gemessen, ihre feinsten Einzelheiten sind es nicht", "comet": "die Form ist die von Rosetta, aus mehr als 20 000 Bildern über zwei Jahre, und die ganze Oberfläche ist abgedeckt", "cassini": "die Form ist aus Cassinis Bildern gebaut und typischerweise auf deutlich weniger als einen halben Kilometer genau; was Cassini nicht gesehen hat, ist die der Anpassung, nicht fotografiert" }, // 0079 B1 0079 B2
    "objectRelief": "das Modell ist vereinfacht, und das feine Relief darauf ist das des vollständigen Modells, in die Oberfläche eingebrannt", // 0079 B1
    "worldFlat": "gezeichnet als schlichte Kugel: Eine Oberflächenkarte von {name} gibt es hier nicht, und die eine Farbe ist aus veröffentlichten Beschreibungen gewählt, nicht gemessen",
    "worldFlatIrregular": "gezeichnet als schlichte Kugel von der Größe seines mittleren Radius: Eine Oberflächenkarte von {name} gibt es hier nicht, die eine Farbe ist aus veröffentlichten Beschreibungen gewählt, nicht gemessen, und {name} ist in Wirklichkeit ein klumpiger Felsbrocken, dessen wahre Form nicht gezeichnet wird",
    "worldFlatShaped": "gezeichnet in seiner gemessenen Form und in einer Farbe: Eine Oberflächenkarte von {name} gibt es hier nicht, und die Farbe ist aus veröffentlichten Beschreibungen gewählt, nicht gemessen",
    "worldShaped": "gezeichnet in seiner gemessenen Form",
    "worldMap": {
      "tinted": "seine Oberfläche ist ein Schwarz-Weiß-Mosaik, in einer aus veröffentlichten Beschreibungen gewählten Farbe getönt",
      "toned": "seine Farben stammen aus Infrarot-, Grün- und Ultraviolettbildern, abgeschwächt in Richtung dessen, was ein Auge sehen würde",
      "redblue": "seine Farben stammen aus den Rot- und Blaubildern von New Horizons, mit Grün genau zwischen beiden und der Farbe um die Hälfte verstärkt; die Teile, die nur in Schwarz-Weiß fotografiert wurden, bekommen die Durchschnittsfarbe der Karte",
      "enhanced": "seine Farben sind die von der NASA veröffentlichten, zusammengesetzt aus drei Farbfiltern von New Horizons, keiner davon grün: Das sind verstärkte Farben, kräftiger als das, was ein Auge sähe, und nicht dasselbe",
      "balanced": "seine Farben stammen aus Orange-, Grün- und Blaubildern, auf seine veröffentlichte Farbe abgestimmt und abgeschwächt in Richtung dessen, was ein Auge sehen würde",
      "infrared": "seine Oberfläche ist eine Nahinfrarot-Karte, die durch den Dunst hindurch gemacht wurde, getönt und weichgezeichnet; im sichtbaren Licht verbirgt der Dunst den Boden",
      "natural": "seine Farben sind natürliche Farben, aus dem roten und blauen Licht, das die Farbkamera von New Horizons gemessen hat, mit Grün, für das sie keinen Filter hatte, zwischen beiden geschätzt, zweieinhalbmal so kräftig wie die der Kamera, so wie die Bilder der NASA in natürlichen Farben ihn zeigen", // 0078 r14-pluto
      "matched": "seine Farben gehen vom roten und blauen Licht aus, das die Farbkamera von New Horizons gemessen hat, mit Grün, für das sie keinen Filter hatte, zwischen beiden geschätzt, und sind dann Ton für Ton an das eigene Farbbild der NASA von dieser Seite (PIA19952) angeglichen: kräftiger als die der Kamera, so wie die NASA es veröffentlicht hat" // 0078 r14-pluto
    },
    "worldCoverage": {
      "miranda": "nur die südliche Hälfte wurde fotografiert, 1986 von Voyager 2; der Rest bleibt schlicht, nicht geraten",
      "ariel": "nur die südliche Hälfte wurde fotografiert, 1986 von Voyager 2; der Rest bleibt schlicht, nicht geraten",
      "umbriel": "nur die südliche Hälfte wurde fotografiert, 1986 von Voyager 2; der Rest bleibt schlicht, nicht geraten",
      "titania": "nur die südliche Hälfte wurde fotografiert, 1986 von Voyager 2; der Rest bleibt schlicht, nicht geraten",
      "oberon": "nur die südliche Hälfte wurde fotografiert, 1986 von Voyager 2; der Rest bleibt schlicht, nicht geraten",
      "triton": "Voyager 2 hat 1989 einen Teil fotografiert; der Rest bleibt schlicht, nicht geraten",
      "pluto": "der ferne Süden lag in Winterdunkelheit, als New Horizons 2015 vorbeiflog: der Boden dort ist modelliert, eine schwache Textur in den Farben des Landes darüber, kein Foto", // 0078 r14-pluto
      "charon": "der ferne Süden lag in Winterdunkelheit, als New Horizons 2015 vorbeiflog: der Boden dort ist modelliert, eine schwache Textur in den Farben des Landes darüber, kein Foto" // 0078 r14-pluto
    },
    "worldLit": "beleuchtet, wie eine Kamera es zeigen würde, die auf sein eigenes Sonnenlicht belichtet ist",
    "worldLight": "von weit weg ist es ein Licht in seiner berechneten Helligkeit: Das Leuchten ist die Art, wie eine Kamera einen Punkt aufzeichnet, der zu hell ist, um aufgelöst zu werden",
    "exoticDeparture": {
      "pulseSlowed": "sein Blinken ist {n}-mal langsamer gezeichnet, als es sich dreht, damit ein Auge ihm folgen kann",
      "pulseTrue": "sein Blinken ist so schnell gezeichnet, wie es sich dreht",
      "portrait": "solange dieser Steckbrief offen ist, wird an seinem Ort ein Modell gezeichnet, viel größer, als es von hier aus aussähe: Schatten und gebogenes Licht, wie seine Masse sie macht, die Scheibe modelliert"
    },
    "worldDeparture": {
      "earth": "auf einem größeren Bildschirm stammen seine Berge aus den ETOPO-2022-Höhen der NOAA, {relief}-mal steiler gezeichnet, als sie sind, damit eine tiefstehende Sonne sie zeigt; das Leuchten der Luft um seinen Rand ist {air}-mal höher gezeichnet, als die Luft ist; aus niedriger Umlaufbahn stehen auf einem größeren Bildschirm seine Wolken zum Horizont hin und unter einer tiefstehenden Sonne auf, {clouds}-mal dicker gezeichnet, als sie sind, damit man ihre Neigung, ihre langen Schatten und das letzte Licht auf ihren Spitzen sehen kann (im Aussehen „Gemessen“ in ihrer wahren Dicke), die Höhe jeder Spitze aus ihrer gemessenen Temperatur, wo das heutige Bild sie abdeckt, und sonst aus der Helligkeit der Wolkenkarte",
      "mercury": "auf einem größeren Bildschirm stammt sein Relief aus dem Höhenmodell von MESSENGER, {steep}-mal steiler gezeichnet als gemessen, damit Kraterränder das Licht fangen",
      "pluto": "sein heller und dunkler Boden ist mit {plutoContrast}-mal dem Kontrast des Kamerabilds gezeichnet, näher an den gemessenen Albedos; die Seite, die New Horizons nur von weitem sah, ist auf ihre eigene Schärfe weichgezeichnet; auf einem größeren Bildschirm stammt sein Relief aus den Stereohöhen von New Horizons, wo es welche gibt, {plutoSteep}-mal steiler gezeichnet als gemessen; der dünne blaue Dunst an seinem Rand ist als Schimmer gezeichnet, am stärksten gegen die Sonne, dessen Stärke gewählt ist", // 0078 r14-pluto
      "mars": "auf einem größeren Bildschirm stammt sein Relief aus den Höhen, die der Laserhöhenmesser von Mars Global Surveyor gemessen hat, {mola}-mal steiler und höher gezeichnet, als sie sind, damit eine tiefstehende Sonne sie zeigt: Die Schatten, die der Olympus Mons und die Canyonwände werfen, sind entsprechend viele Male zu lang.",
      "venus": "das Leuchten um seinen Rand und über seine Tagseite hinaus steht für einen tiefen Dunst; wie dick er gezeichnet ist und wie weit er reicht, ist illustrativ; im Aussehen „Film“ sind seine Wolkenbänder mit dem {uv}-fachen Kontrast seiner Karte gezeichnet, so wie Ultraviolettkameras sie sehen (für ein Auge sind sie fast einfarbig), und das Aussehen „Gemessen“ zeigt die Karte, wie sie ist; sein Boden ist per Radar als Relief aus Magellans Höhenmesser gezeichnet, {ground}-mal steiler und höher als gemessen",
      "neptune": "im Aussehen „Film“ sind die fünf Bögen seines äußeren Rings so gezeichnet, wie Voyager 2 sie 1989 sah, und laufen mit ihrer gemessenen Geschwindigkeit herum; wo sie heute im Ring sind, wird nicht berechnet, und zwei von ihnen sind seither verblasst oder gewandert",
      "saturn": "seine Bänder sind mit dem {contrast}-fachen Kontrast seiner Karte gezeichnet, eine Anpassung von uns; „So sah Hubble es“ ist nicht angepasst; auf einem größeren Bildschirm und aus der Nähe liegen die Ringlets und Lücken seiner Ringe dort, wo Cassini sie 2008 im Licht eines Sterns gemessen hat, über die Karte gelegt, und im Aussehen „Film“ ist aus noch größerer Nähe das Funkeln der Körner gezeichnet; innerhalb weniger Kilometer von den Ringen entfernt sind auf einem größeren Bildschirm im Aussehen „Film“ ihre größten Teilchen, zwei bis fünf Meter groß, als Eiskugeln gezeichnet: Wie viele es sind und wie groß, folgt der gemessenen Verteilung der Größen und der optischen Dicke der Ringe, aber wo jedes einzelne ist, und die Klumpen im A-Ring, sind illustrativ, und sie sind ruhend gezeichnet, als würdest du mit ihnen mitfliegen",
      "titan": "knapp über seinem Dunst, etwa 500 km hoch, ist eine dünne, abgelöste Dunstschicht dort gezeichnet, wo Cassini sie 2005 bis 2007 sah; sie sank und verblasste in den Jahren danach, und wo sie jetzt ist, ist nicht bekannt"
    },
    "worldEarthshine": "seine dunkle Seite leuchtet im Erdschein, im eigenen Licht der Erde, {n}-mal heller gezeichnet, als diese Kamera es einfangen würde, etwa so, wie das Auge es sieht",
    "worldAir": "seine Luft ist {n}-mal dicker gezeichnet, als sie ist, damit sie in dieser Größe zu sehen ist, und die Farbe seines Dunstes ist illustrativ",
    "worldAirTrue": "sein Dunst ist in seiner gemessenen Höhe gezeichnet, und seine Farbe ist illustrativ",
    "worldRings": "seine Ringe liegen in ihren gemessenen Abständen, {w}-mal breiter und viel heller gezeichnet, als sie sind, damit man sie sieht: Die echten sind Fäden, so dunkel wie Holzkohle",
    "worldRingsDense": "seine Ringe liegen in ihren gemessenen Abständen, {w}-mal breiter, {d}-mal undurchsichtiger und viel heller gezeichnet, als sie sind, damit man sie sieht: Die echten sind schwache Fäden, so dunkel wie Holzkohle",
    "worldSun": "aus der Nähe dunkelt und rötet sich sein Rand, so wie ein Modell seiner Atmosphäre es verlangt; die Körnung steht für seine brodelnde Oberfläche: Ihre Zellen entstehen, werden heller und verblassen, wie es echte Granulen tun, gröber gezeichnet, als sie sind (aus ganz großer Nähe in ihrer wahren Größe) und viel schneller, und das helle Netz zum Rand hin ist illustrativ; aus ganz großer Nähe weicht die fotografierte Karte dieser gezeichneten Oberfläche, die ebenfalls illustrativ ist; die Korona ist illustrativ und viel heller gezeichnet, als sie ist, damit man sie sehen kann; die Schleifen und Hecken an seinem Rand stehen dort, wo die aktiven Regionen der NOAA nahe am Rand liegen, und ihre Formen und Höhen sind illustrativ; die Sterne daneben sind verblasst, weil sein Gleißen sie vor jeder Kamera verbirgt",
    "worldMosaic": "Unter der Kamera jetzt: {title}, hier mit etwa {res} pro Pixel gezeichnet.",
    "worldMosaicDetail": "Unter der Kamera jetzt: {title}, das die Farbkarte auf etwa {res} pro Pixel schärft.",
    "worldRelief": "Sein Relief stammt aus {title}: einer Zeichnung der Hänge unter einem festen Licht. Die Hänge entlang dieses Lichts werden von der Sonne, wo sie jetzt steht, neu beleuchtet, {n}-mal steiler als gemessen; Hänge quer dazu werden nicht gezeichnet.",
    "worldReliefTrue": "Sein Relief stammt aus {title}: einer Zeichnung der Hänge unter einem festen Licht. Die Hänge entlang dieses Lichts werden von der Sonne, wo sie jetzt steht, neu beleuchtet; Hänge quer dazu werden nicht gezeichnet.",
    "worldReliefBaked": "Seine Hügel sind unter einem festen Licht in diese Karte hineingeschattet, nicht von der Sonne, wo sie jetzt steht.",
    "mount": "wie wir es am Modell aufhängen, ist unsere eigene Anordnung, und es ist viel größer gezeichnet, als es ist – in wahrer Größe wäre es zu klein, um es zu sehen"
  },
  "trip": {
    "notEnoughStops": "Nur {count} der Stationen dieser Reise lassen sich gerade finden, und sie braucht {min}.",
    "heldBody": "Diese Station ließ sich gerade nicht finden. Alles andere auf der Reise funktioniert weiter.",
    "heldTitle": "Diese Station ließ sich nicht finden",
    "stopOf": "Station {n} von {count}",
    "planning": "Es wird berechnet, was gezeigt werden kann …",
    "shape": "{count} Stationen · {mins} Min.",
    "shapeOneMinute": "{count} Stationen · 1 Min.",
    "startTitle": "Diese Reise fliegen",
    "nextEventLine": "Als Nächstes: {date}",
    "introStart": "Los",
    "introSkip": "Jetzt nicht",
    "introMicro": "Geführte Reise",
    "stopsLabel": "Stationen",
    "startAtTitle": "Die Reise bei Station {n} beginnen",
    "droppedOne": "Eine Station lässt sich heute nicht zeigen und ist oben nicht mitgezählt.",
    "droppedMany": "{n} Stationen lassen sich heute nicht zeigen und sind oben nicht mitgezählt.",
    "clockClamped": "Die Zeit wurde für diese Reise auf normale Geschwindigkeit zurückgesetzt.",
    "clockMoves": "Diese Reise verstellt die Uhr. Beim Verlassen wird sie zurückgestellt.",
    "clockRestored": "Beim Verlassen wird die Uhr dorthin zurückgestellt, wo du sie hattest.",
    "stopTimeNow": "Jetzt gezeigt",
    "stopTimeAt": "Gezeigt: {when}",
    "stopTimeRate": "Gezeigt: {when}, läuft {rate}",
    "stopTimePaused": "Gezeigt: {when}, angehalten, solange die Reise pausiert",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "Schatten aus den Positionen von Mond und Sonne berechnet; die Zeitangaben von Astronomy Engine, auf etwa eine Minute genau. Die dünnen Linien und das blasse Band markieren die Ränder des Schattens und den Weg seines Kerns: Linien auf einer Karte, kein Licht.",
    "eclipseLineLatched": "Der Schatten wird auf diesem Gerät nicht gezeichnet; die Zeitangabe stimmt.",
    "eclipseColour": "Die Farbe ist eine Illustration; der Schatten ist berechnet.",
    "orbitsLine": "Planeten größer als in Wirklichkeit gezeichnet, als Punkte; ihre Orte und Bahnen sind berechnet.",
    "moonPathLine": "Die Erde und der Mond sind größer als in Wirklichkeit gezeichnet, als Punkte, jeweils auf der Seite beleuchtet, die der Sonne zugewandt ist. Der Ort des Mondes und seine Bahn sind berechnet.",
    "systemLine": "Größen und Bahnen aus dem NASA Exoplanet Archive; die Farben und die Neigung der Bahnen sind illustrativ.",
    "systemLineGuessed": "Größen und Bahnen aus dem NASA Exoplanet Archive; die Farben, die Orte der Planeten auf ihren Bahnen und die Neigung der Bahnen sind illustrativ.",
    "systemPhaseUnknown": ", die Orte der Planeten auf ihren Bahnen",
    "rateWords": {
      "10": "zehnmal schneller als das Leben",
      "60": "eine Minute pro Sekunde",
      "600": "zehn Minuten pro Sekunde",
      "3600": "eine Stunde pro Sekunde",
      "36000": "zehn Stunden pro Sekunde",
      "525600": "ein Tag in jeder Sechstelsekunde"
    },
    "rateGeneric": "{n}-mal schneller als das Leben",
    "yourPlace": "Dein Ort",
    "observerSet": "Dein Ort: {place}, von dir festgelegt.",
    "observerDevice": "Dein Ort: in der Nähe dessen, was dein Gerät als deinen Standort angibt.",
    "observerGuess": "Dein Ort ist eine Schätzung aus der Zeitzone deiner Uhr: {place}. Lege ihn unter „Wo du bist“ fest, dann wird er besser.",
    "needsPlace": "Braucht einen Ort. Lege zuerst fest, wo du bist.",
    "stationFromYou": "Gerade ist sie {km} km von dir entfernt.",
    "drawnAtClassSize": "Das Modell wird unabhängig von der Entfernung {px} Pixel breit gezeichnet; die echte Station wäre ein heller Punkt.",
    "passNight": "Bei diesem Überflug wird sie von der Sonne beleuchtet, vor dunklem Himmel: Du könntest sie sehen, wenn das Wetter mitspielt.",
    "passDay": "Diesen Überflug würdest du nicht sehen: Dein Himmel ist zu hell, oder die Station liegt im Schatten der Erde.",
    "lookMoonUp": "Der Mond ist zu {pct} % beleuchtet, {alt}, im {az}.",
    "lookMoonDown": "Der Mond steht zu dieser Stunde unter deinem Horizont. Er geht um {time} auf.",
    "lookMoonDownNoRise": "Der Mond steht zu dieser Stunde unter deinem Horizont.",
    "lookWorldUp": "{name} steht {alt}, im {az}.",
    "lookWorldDown": "{name} steht zu dieser Stunde unter deinem Horizont.",
    "lookPlanet": "Der hellste Planet am Himmel ist zu dieser Stunde {name}: {alt}, im {az}.",
    "lookNoPlanet": "Zu dieser Stunde steht kein Planet am Himmel, den du mit bloßem Auge sehen könntest. Die Ansicht blickt dorthin, wo sie vorbeikommen werden.",
    "lookStar": "Der hellste Stern am Himmel ist zu dieser Stunde {name}: {alt}, im {az}.",
    "lookFigure": "Zu dieser Stunde am besten zu sehen: {name}, {alt}, im {az}.",
    "lookNoFigure": "Keine der bekannten Sternfiguren steht zu dieser Stunde günstig.",
    "lookNoPass": "In der nächsten Woche wurde kein Überflug der Station über deinem Ort gefunden.",
    "lookDaylight": "Dein Himmel ist zu dieser Stunde nicht dunkel, deshalb gibt es noch nichts herauszusuchen.",
    "lookMilkyWay": "Die Ansicht blickt zur Milchstraße, dorthin, wo sie durch {name} verläuft, {alt}, im {az}. Die drei Himmel sind ein Modell einer durchschnittlichen klaren Nacht.",
    "lookNoMilkyWay": "Die Milchstraße steht zu dieser Stunde tief an deinem Horizont, deshalb blickt die Ansicht stattdessen hoch an den Himmel.",
    "lookShower": "Der nächste Meteorstrom ist {name}, am besten um den {date}.",
    "lookShowerUp": "Sein Radiant steht zu dieser Stunde {alt}, im {az}.",
    "lookShowerDown": "Sein Radiant steht zu dieser Stunde unter deinem Horizont; die Ansicht blickt dorthin, wo er aufgehen wird.",
    "lookShowerRate": "Im Maximum, von einem dunklen Ort aus und bei hohem Radianten: etwa {rate} Meteore pro Stunde.",
    "lookShowerMoon": {
      "dark": "Der Mond ist in dieser Nacht zu {pct} % beleuchtet, der Himmel bleibt also dunkel.",
      "some": "Der Mond ist in dieser Nacht zu {pct} % beleuchtet und verdeckt einige der schwachen Meteore.",
      "bright": "Der Mond ist in dieser Nacht zu {pct} % beleuchtet und verdeckt alle bis auf die hellen Meteore."
    },
    "approachNext": "Als Nächstes in der Tabelle des NASA JPL: {name}, am {date}, in {ld}-facher Mondentfernung.",
    "approachNextFar": "Als Nächstes in der Tabelle des NASA JPL: {name}, am {date}.",
    "approachNone": "Die Tabelle des NASA JPL zu nahen Vorbeiflügen wurde nicht geladen, deshalb wird kein nächster Vorbeiflug genannt.",
    "satellitesCount": "{n} arbeitende Satelliten in dem Katalog, den diese Seite von CelesTrak geladen hat, davon {starlink} von Starlink.",
    "satellitesLoading": "Der Katalog lädt noch; die Zahl erscheint, sobald er da ist.",
    "portraitLine": "Ein Modell, nicht das Foto: Schatten und der um ihn gebogene Lichtring sind so, wie seine Masse sie macht, die leuchtende Scheibe ist modelliert, und die Sterne dahinter werden nicht gebogen. Er ist viel größer gezeichnet, als er von hier aus aussähe; der Ort ist gemessen. Das Foto des Event Horizon Telescope steht auf seinem Steckbrief: {credit} · {licence}.",
    "tonightUp": "Von {place} aus heute Nacht: oben von {begin} bis {end}, am höchsten um {time}, {alt}, im {az}.",
    "tonightGlare": "Von {place} aus heute Nacht: {name} ist zu nah an der Sonne, um gesehen zu werden.",
    "tonightDown": "Von {place} aus heute Nacht: {name} steht nicht über dem Horizont, solange der Himmel dunkel ist.",
    "frameLabel": "geführte Reise",
    "stopRole": "Station",
    "liveLabel": "Station {n} von {count}: {title}",
    "stopMicro": "Station {n} von {count}",
    "progressShort": "{n} / {count}",
    "pause": "Pause",
    "pauseTitle": "Pause (Leertaste)",
    "play": "Abspielen",
    "resume": "Weiter",
    "resumeTitle": "Zur Station zurückfliegen und weitermachen (Leertaste)",
    "back": "Vorige Station",
    "backTitle": "Vorige Station (←)",
    "next": "Nächste Station",
    "nextTitle": "Nächste Station (→)",
    "replay": "Nochmal",
    "replayTitle": "Diese Bewegung noch einmal fliegen (R)",
    "share": "Teilen",
    "shareTitle": "Einen Link zu dieser Station teilen",
    "collapse": "Ausblenden",
    "collapseTitle": "Den Steckbrief ausblenden und zuschauen (C)",
    "expand": "Einblenden",
    "expandTitle": "Den Steckbrief zurückholen (C)",
    "soundOn": "Ton",
    "volume": "Lautstärke",
    "volumeTitle": "Lautstärke von Musik, Geräuschen und Stimme",
    "volumeValue": "{pct} Prozent",
    "voiceWill": "Eine Stimme liest dies vor. Sie ist synthetisch.",
    "voiceCan": "Eine synthetische Stimme kann dies vorlesen: „Stimme“ drücken.",
    "soundOnTitle": "Musik und Geräusche sind an: ausschalten (M)",
    "soundOffTitle": "Musik und Geräusche sind aus: einschalten (M)",
    "voice": "Stimme",
    "voiceOnTitle": "Eine synthetische Stimme liest jede Station vor: ausschalten und die Musik behalten (V)",
    "voiceOffTitle": "Jede Station von einer synthetischen Stimme vorlesen lassen (V)",
    "present": "Präsentieren",
    "presentTitle": "Diese Reise einem Raum voller Leute zeigen: große Schrift, keine Bereiche, du drückst „Nächste Station“",
    "presentOffTitle": "Den Präsentationsmodus verlassen und die Bereiche zurückbringen",
    "presentAuto": "Automatisch",
    "presentAutoOffTitle": "Jede Station wartet auf „Nächste Station“: die Reise von allein weiterlaufen lassen (A)",
    "presentAutoOnTitle": "Die Reise läuft von allein weiter: jede Station auf „Nächste Station“ warten lassen (A)",
    "fullScreen": "Vollbild",
    "fullScreenTitle": "Den ganzen Bildschirm füllen (F)",
    "fullScreenOffTitle": "Das Vollbild verlassen (F)",
    "leave": "Verlassen",
    "leaveTitle": "Die Reise verlassen. Die Kamera bleibt genau dort, wo sie ist. (Esc)",
    "leaveTitleStage": "Die Reise verlassen. Die Karte geht zurück zu der Welt, auf die sie vorher zentriert war, dabei bewegt sich die Kamera. (Esc)",
    "progressLabel": "Wie weit du in der Reise bist",
    "controlsLabel": "Steuerung der Reise",
    "pausedChip": "Reise pausiert",
    "endMicro": "Ende der Reise",
    "endBody": "Die Kamera bleibt, wo sie ist. Hier geht nichts zurück.",
    "endBodyStage": "„Weiterfliegen“ bleibt hier draußen. „Nach Hause“ setzt die Karte wieder auf die Welt, auf die sie vor der Reise zentriert war.",
    "endExplore": "Weiterfliegen",
    "endExploreTitle": "Diese Ansicht behalten und allein weitermachen",
    "endStayTitleStage": "Hier draußen bleiben und von dort weiterfliegen, wo die Reise endete",
    "endHome": "Nach Hause",
    "endExploreTitleStage": "Allein weitermachen, zurück auf der Karte, von der du gestartet bist",
    "endSend": "Bild senden",
    "endSendTitle": "Eine Postkarte von dem Ort machen, an dem die Reise endete, mit ihren Worten und einem Link",
    "endReplay": "Nochmal ansehen",
    "endReplayTitle": "Diese Reise noch einmal von Anfang an ansehen",
    "endShareTitle": "Einen Link zu dieser Reise teilen",
    "endNextMicro": "Nächste Reise",
    "endNext": "Als Nächstes: {title}",
    "docTitle": "Space Radar – {title} – Station {n} von {count}"
  },
  "sky": {
    "radiant": "Radiant: {name}",
    "bodies": {
      "sun": "Sonne",
      "moon": "Mond",
      "mercury": "Merkur",
      "venus": "Venus",
      "mars": "Mars",
      "jupiter": "Jupiter",
      "saturn": "Saturn",
      "uranus": "Uranus",
      "neptune": "Neptun"
    },
    "fov": {
      "degrees": "{deg}° Feld · {name}",
      "arcmin": "{min}′ Feld · {name}",
      "names": {
        "eye": "Auge",
        "binoculars": "Fernglas",
        "telescope": "Teleskop"
      }
    },
    "lines": {
      "sunPath": "Weg der Sonne",
      "equator": "Himmelsäquator",
      "poleNorth": "Himmelsnordpol",
      "poleSouth": "Himmelssüdpol"
    },
    "what": {
      "star": "Stern",
      "starMag": "Stern · {mag} mag",
      "planet": "Planet · {mag} mag",
      "sun": "unser Stern",
      "moon": "Mond der Erde",
      "dso": "Deep Sky",
      "dsoMag": "{kind} · {mag} mag",
      "open": "{name}, {sub}. Steckbrief öffnen.",
      "plain": "{name}, {sub}.",
      "openTitle": "Steckbrief öffnen"
    },
    "compassShort": [
      "N",
      "NNO",
      "NO",
      "ONO",
      "O",
      "OSO",
      "SO",
      "SSO",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW"
    ],
    "lookLine": "Schau nach {dir}, {fists}, um {time}. Es bewegt sich etwa {mins} Minuten lang.",
    "lookLineNoDuration": "Schau nach {dir}, {fists}, um {time}.",
    "sunlit": "Es fängt noch Sonnenlicht ein, und deshalb ist es sichtbar.",
    "notSunlit": "Es liegt bei diesem Überflug im Schatten der Erde, du wirst es also nicht sehen.",
    "fistsHorizon": "knapp über dem Horizont",
    "fistsOverhead": "fast genau über dir",
    "fistsOne": "etwa eine Faust über dem Horizont",
    "fistsMany": "etwa {n} Fäuste über dem Horizont",
    "noObserver": "Lege fest, wo du bist, dann sagt dir diese Zeile, wohin du schauen musst.",
    "noPass": "In den nächsten 24 Stunden kommt es nicht über deinen Horizont.",
    "notVisibleFromGround": "Dieses ist zu weit weg, um es mit bloßem Auge auszumachen.",
    "leftGround": "Es hat den Boden verlassen, um dorthin zu fliegen. „Heute Nacht“ hat den Himmel.",
    "nakedEye": "Hell genug, um es von einem dunklen Ort aus mit bloßem Auge zu sehen.",
    "needsTelescope": "Für das Auge zu schwach; ein Teleskop oder ein lang belichtetes Foto zeigt es.",
    "starOnly": "Nur sein Stern ist zu sehen, und nur durch ein Teleskop; der Planet selbst ist viel zu schwach.",
    "onTheGround": "Dieses steht auf dem Boden, es gibt also nichts, wohin man nach oben schauen könnte.",
    "storm": "Vom Boden aus ist es das Wetter selbst. Aus dem Orbit ist es eine Wolkenspirale, Hunderte Kilometer breit.",
    "onAnotherWorld": "Dieses Objekt steht auf einer anderen Welt ({world}). Du wirst es von hier aus nicht mit bloßem Auge ausmachen, wie klar die Nacht auch ist.",
    "worldRise": "Von deinem Ort aus geht es um {time} auf.",
    "worldHere": "deinem Ort",
    "worldFrom": {
      "down": "Von {place}: geht um {rise} im {riseDir} auf, am höchsten um {highTime}, {highAlt}; geht um {set} im {setDir} unter.",
      "downNoSet": "Von {place}: geht um {rise} im {riseDir} auf, am höchsten um {highTime}, {highAlt}.",
      "up": "Von {place}: steht jetzt am Himmel, {alt}, im {dir}. Am höchsten um {highTime}, {highAlt}; geht um {set} im {setDir} unter.",
      "upPast": "Von {place}: steht jetzt am Himmel, {alt}, im {dir}. Der höchste Punkt ist vorbei; geht um {set} im {setDir} unter.",
      "never": "Von {place} geht es in den nächsten eineinhalb Tagen nicht auf.",
      "always": "Von {place}: steht jetzt am Himmel, {alt}, im {dir}. Es geht heute nicht unter.",
      "honest": "Für einen Horizont auf Meereshöhe berechnet; Hügel und Häuser sind darin nicht enthalten."
    },
    "worldNoRise": "Du kannst dieses mit eigenen Augen sehen. Zu berechnen, wann es von deinem Ort aus aufgeht, ist in dieser Version noch nicht enthalten.",
    "worldSee": {
      "pluto": "Nicht mit bloßem Auge und nicht mit dem Fernglas: Pluto ist fast 3 000-mal schwächer als der schwächste Stern, den du sehen kannst, man braucht also ein Teleskop.",
      "io": "Ein normales Fernglas zeigt einen Lichtpunkt neben Jupiter; mit bloßem Auge geht er in Jupiters Glanz unter.",
      "europa": "Ein normales Fernglas zeigt einen Lichtpunkt neben Jupiter; mit bloßem Auge geht er in Jupiters Glanz unter.",
      "ganymede": "Ein normales Fernglas zeigt einen Lichtpunkt neben Jupiter; mit bloßem Auge geht er in Jupiters Glanz unter.",
      "callisto": "Ein normales Fernglas zeigt einen Lichtpunkt neben Jupiter; mit bloßem Auge geht er in Jupiters Glanz unter.",
      "titan": "Nicht mit bloßem Auge: Titan hat im hellsten Fall Größenklasse 8,2, man braucht also ein kleines Teleskop oder ein starkes Fernglas, und Saturns Glanz daneben macht selbst das schwer.",
      "enceladus": "Nicht mit bloßem Auge: Enceladus hat Größenklasse 11,7 und steht so nah am hellen Saturn und seinen Ringen, dass er selbst durch ein kleines Teleskop schwer zu sehen ist.",
      "triton": "Nicht mit bloßem Auge und nicht mit dem Fernglas: Triton hat Größenklasse 13,5, ist etwa 600-mal schwächer als der schwächste Stern, den du sehen kannst, man braucht also ein Teleskop.",
      "charon": "Kaum: Charon hat Größenklasse 16,8, ist 13 000-mal schwächer als der schwächste Stern, den du sehen kannst, und steht so nah an Pluto, dass Amateure das Paar 2008 trennten, indem sie es durch ein 14-Zoll-Teleskop fotografierten.",
      "phobos": "Nicht mit bloßem Auge: Phobos hat im besten Fall Größenklasse 11,3 und klebt am Mars, dessen Glanz ihn überstrahlt; entdeckt wurde er 1877 mit einem 26-Zoll-Teleskop.",
      "deimos": "Nicht mit bloßem Auge: Deimos hat im besten Fall Größenklasse 12,4 und steht nah am Mars, dessen Glanz ihn überstrahlt; entdeckt wurde er 1877 mit einem 26-Zoll-Teleskop.",
      "neptune": "Nicht mit bloßem Auge: Neptun hat Größenklasse 7,7 bis 7,9, zu schwach, um ohne Hilfe gesehen zu werden. Ein starkes Fernglas oder ein Teleskop zeigt ihn als kleine blaue Scheibe.",
      "mimas": "Nicht mit bloßem Auge: Mimas hat Größenklasse 12,9 und klebt am Saturn, man braucht also ein großes Teleskop und eine ruhige Nacht.",
      "tethys": "Nicht mit bloßem Auge: Tethys hat Größenklasse 10,2, für ein kleines Teleskop erreichbar, auch wenn Saturns Glanz daneben die Beobachtung erschwert.",
      "dione": "Nicht mit bloßem Auge: Dione hat Größenklasse 10,4, für ein kleines Teleskop erreichbar, auch wenn Saturns Glanz daneben die Beobachtung erschwert.",
      "rhea": "Nicht mit bloßem Auge: Rhea hat Größenklasse 10 und ist nach Titan der hellste der Saturnmonde; ein kleines Teleskop genügt.",
      "iapetus": "Nicht mit bloßem Auge: Iapetus schwankt zwischen Größenklasse 10,2 und 11,9, weil abwechselnd seine helle und seine dunkle Seite zu uns zeigt; ein kleines Teleskop zeigt ihn am besten, wenn die helle Seite zu uns zeigt.",
      "miranda": "Kaum: Miranda hat Größenklasse 16,6, verloren im Glanz des Uranus, und ist für viele Amateurteleskope unsichtbar.",
      "ariel": "Nicht mit bloßem Auge und nicht mit dem Fernglas: Ariel hat Größenklasse 14,8, etwa so schwach wie Pluto in seiner größten Nähe, man braucht also ein gutes Teleskop und einen dunklen Himmel.",
      "umbriel": "Nicht mit bloßem Auge und nicht mit dem Fernglas: Umbriel hat Größenklasse 15,1, der schwächste der vier großen Uranusmonde, man braucht also ein gutes Teleskop und einen dunklen Himmel.",
      "titania": "Nicht mit bloßem Auge: Titania hat Größenklasse 13,9, der hellste der Uranusmonde, und braucht trotzdem ein Teleskop von einiger Größe.",
      "oberon": "Nicht mit bloßem Auge: Oberon hat Größenklasse 14,1 und steht von den fünf am weitesten draußen bei Uranus, man braucht also ein Teleskop und eine ruhige Nacht."
    },
    "couldNotLook": "Von hier aus ließ sich kein Überflug berechnen.",
    "nowhereToLook": "Niemand weiß, wo dieses ist, also gibt es keine Stelle, wohin man schauen könnte."
  },
  "controls": {
    "title": "Steuerung",
    "layersTitle": "Was zeigen",
    "layerCount": "{n}",
    "layerCountLoading": "zählt",
    "layerHint": {
      "exoplanets": "Standardmäßig aus. Anhaken, um sie zu zeigen."
    },
    "layerCountEmpty": "leer",
    "layerCountEmptyTitle": "Diese Ebene kam ohne Inhalt zurück: Quelle nicht lesbar oder gerade leer.",
    "layerWaits": "später",
    "layerWaitsTitle": "Wird geladen, wenn du sie einschaltest, um Daten zu sparen.",
    "layersFailed": "{n} Ebenen kamen leer zurück.",
    "layersFailedOne": "Eine Ebene kam leer zurück.",
    "layersFailedWhy": "Quellen ansehen",
    "layerCountParts": {
      "onMap": "{n} auf der Karte",
      "riding": "{n} sitzen auf etwas anderem",
      "unplaceable": "{n} können wir nicht verorten",
      "auroraPeak": "bis zu {n} % wahrscheinlich",
      "lightningPerMin": "{n} Einschläge pro Minute"
    },
    "layersEmpty": "Es sind noch keine Ebenen geladen.",
    "groups": {
      "around-earth": "Rund um die Erde",
      "earth": "Wetter und Boden",
      "solar-system": "Sonnensystem",
      "beyond": "Sterne und weiter"
    },
    "groupCount": "{on} von {n}",
    "groupAll": "Alle",
    "groupNone": "Keine",
    "groupAllLabel": "Alle Ebenen zeigen: {group}",
    "groupNoneLabel": "Alle Ebenen ausblenden: {group}",
    "layerFilter": "Ebene suchen",
    "layersKeys": "Ebenen. Pfeile bewegen, die Leertaste schaltet um.",
    "layerFilterEmpty": "Keine Ebene mit diesem Namen.",
    "keysRow": "Tasten",
    "keysRowTouch": "Gesten",
    "keysRowTitle": "Die Tasten zeigen, die die Ansicht bewegen",
    "keysRowTitleTouch": "Die Gesten zeigen, die die Ansicht bewegen",
    "swatchMixed": "In eigenen Farben gezeichnet",
    "keyedNote": "Punkte nach {key} gefärbt: Die Legende steht unten.",
    "localTimeFallback": "lokal",
    "locationPlaceholder": "Stadt suchen",
    "locationSearchLabel": "Stadt suchen",
    "locationUseMine": "Meinen Standort nutzen",
    "locationUseMineTitle": "Den Browser fragen, wo du bist",
    "locationInsecure": "Der Browser teilt deinen Standort nur mit Seiten, die über https ausgeliefert werden. Diese Seite läuft über einfaches http, deshalb ist die Schaltfläche ausgeschaltet. Wähle stattdessen eine Stadt oder öffne die https-Adresse, sobald es eine gibt.",
    "locationUnsupported": "Dieser Browser ortet nicht. Wähle eine Stadt.",
    "locationDenied": "Der Browser hat abgelehnt. Wähle eine Stadt.",
    "locationFailed": "Der Browser fand dich nicht. Wähle eine Stadt.",
    "locationAsking": "Der Browser wird gefragt",
    "locationClear": "Löschen",
    "locationNoMatch": "Keine Stadt in der mitgelieferten Liste passt dazu.",
    "tonightCouldNotLook": "Nicht prüfbar: keine Satelliten geladen."
  },
  "search": {
    "title": "Ein Objekt finden",
    "placeholder": "Planeten, Sterne und Satelliten",
    "placeholderPhone": "Weltraum suchen",
    "inputLabel": "Ein Objekt nach Name oder Katalognummer suchen",
    "listLabel": "Passende Objekte",
    "fly": "Hinfliegen",
    "flyTitle": "Die Kamera zum markierten Objekt bewegen und seinen Steckbrief öffnen",
    "hint": "Zwei Buchstaben reichen. Die Eingabetaste wählt den obersten Treffer.",
    "noMatch": "Kein Treffer für „{q}“.",
    "closest": "Ähnlichste Namen",
    "more": "{n} weitere. Tippe mehr, um einzugrenzen.",
    "searching": "{n} Objekte durchsucht.",
    "searchingOne": "Ein Objekt durchsucht.",
    "searchingBut": "{n} Objekte durchsucht, {m} Ebenen noch nicht.",
    "searchingButOne": "{n} Objekte durchsucht, eine Ebene noch nicht.",
    "empty": "Noch nichts zum Durchsuchen geladen.",
    "inputTitle": "Suche (/)",
    "key": "/",
    "notLoaded": "Nicht geladen, deshalb nicht durchsucht: {layers}.",
    "stillLoading": "Lädt noch, deshalb noch nicht durchsucht: {layers}.",
    "loadsWhenOn": "Wird nur geladen, wenn du sie einschaltest, um Daten zu sparen, deshalb noch nicht durchsucht: {layers}.",
    "couldNotRead": "Ließ sich nicht lesen, deshalb nicht durchsucht: {layers}.",
    "fallback": "Nichts beginnt damit. Diese enthalten es.",
    "switchedOn": "Eingeschaltet: {layer}.",
    "belowHorizon": "{name} liegt unter dem Horizont.",
    "notLoadedCount": "Wie viele Objekte dadurch fehlen, lässt sich erst sagen, wenn sie geladen sind."
  },
  "quality": {
    "dataSaver": "Datensparmodus: 2 große Listen warten.",
    "lowered": "Langsam ({ms} ms): einfacheres Bild.",
    "tierPhone": "Oberflächenkarten in 2k, fürs Handy.",
    "tierSaver": "Oberflächenkarten in 2k, um Daten zu sparen.",
    "tierSmall": "Oberflächenkarten in 2k, für dieses Gerät.",
    "tierLatched": "Wieder 2k-Karten: Bilder waren langsam.",
    "tierLow": "Oberflächenkarten in 2k, wie „Niedrig“ es verlangt.",
    "tier1": "Oberflächenkarten 4k, im Leerlauf geladen.",
    "tier2": "Oberflächenkarten 4k, mehr Welten scharf.",
    "promoted": "Nach schnellen Bildern eine Stufe höher.",
    "mapsWorn": "Karten auf diesem Gerät: {credits}.",
    "panelTitle": "Qualität",
    "choices": {
      "auto": "Auto",
      "low": "Niedrig",
      "medium": "Mittel",
      "high": "Hoch",
      "ultra": "Ultra"
    },
    "autoNow": "Auto: {tier}",
    "titles": {
      "auto": "Nach diesem Gerät und seiner Bildrate gewählt",
      "low": "Leichtestes Bild: für einen Akku oder einen alten Laptop",
      "medium": "Schärfere Karten, Relief und Wetter",
      "high": "Mehr Welten gleichzeitig scharf",
      "ultra": "Volle Auflösung und die feinsten Stufen aus der Nähe"
    },
    "fellBack": "Die Bilder waren langsam: Qualität wieder auf Auto."
  },
  "status": {
    "title": "Quellen",
    "intro": "Jede Quelle, die gelesen wird, wie alt dieser Messwert ist und woher er kommt. Nichts davon ist in einer Fußzeile versteckt.",
    "stateOk": "ok",
    "stateStale": "veraltet",
    "stateUnknown": "nicht lesbar",
    "stateOkTitle": "Kürzlich gelesen und innerhalb ihres Frischefensters.",
    "stateStaleTitle": "Wir haben eine Kopie, aber sie ist älter, als diese Quelle verspricht.",
    "stateUnknownTitle": "Wir haben von dieser Quelle in diesem Browser noch nie einen guten Messwert bekommen. Das ist nicht dasselbe wie „in Ordnung“, und es ist nicht dasselbe wie ein Fehler bei einer Kopie, die wir haben.",
    "ageNever": "nie gelesen",
    "ageLabel": "zuletzt gelesen {age}",
    "ageNeverLine": "in diesem Browser noch keine gute Kopie",
    "viaSnapshotLine": "aus unserem Schnappschuss, geholt {age}",
    "viaLiveLine": "live von {publisher} gelesen {age}",
    "snapshotOverdue": "eine frischere Kopie ist überfällig",
    "snapshotChecking": "(es wird nach einer neueren gesucht)",
    "couldNotLookLine": "nicht lesbar: {reason}",
    "reasonNoRoute": "{why}, und ein Browser kann {publisher} nicht direkt lesen",
    "snapshotWhy": {
      "no-index": "unser Schnappschuss-Index ließ sich nicht lesen",
      "not-in-index": "unsere Schnappschüsse enthalten diese Quelle nicht",
      "refused": "der letzte Abruf wurde abgelehnt",
      "error": "der letzte Abruf ist fehlgeschlagen",
      "skipped": "der Abruf hat sie übersprungen",
      "unreadable": "unser Schnappschuss davon ließ sich nicht lesen"
    },
    "harvestUnchecked": "Unsere Schnappschüsse: noch nicht geprüft.",
    "harvestUnavailable": "Unsere Schnappschüsse sind gerade nicht verfügbar, deshalb wird jede Quelle unten live von ihrem Herausgeber gelesen – oder gar nicht.",
    "harvestLine": "Unsere Schnappschüsse: geschrieben {age} · {ok} Feeds ok · {refused} abgelehnt · {error} fehlgeschlagen",
    "errorLabel": "Letzter Fehler",
    "attributionTitle": "Nachweise",
    "attributionIntro": "Die Daten auf dieser Karte sind die Arbeit anderer.",
    "footCreditsIntro": "Bilder und Texturen:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "Planeten- und Sterntexturen, lizenziert unter CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "Wolken-, Nachtseiten- und Oberflächenbilder und die 3D-Modelle",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "Wolken",
    "auroraTitle": "Polarlicht",
    "weatherTitle": "Blitze",
    "layersTitle": "Live oder mitgeliefert",
    "layersIntro": "Live wird von seinem Herausgeber gelesen oder für diesen Moment berechnet, während du zuschaust. Ein Katalog wird mit der App ausgeliefert: Sterne, Galaxien und die Antennen und Landeplätze am Boden bewegen sich nicht, während du hinsiehst. Eine mitgelieferte Stichprobe steht für eine Quelle, die ein Browser gar nicht aufrufen kann.",
    "layerLive": "live",
    "layerCatalogue": "Katalog",
    "layerSample": "mitgelieferte Stichprobe",
    "layerIllustrative": "gezeichnet, nicht verfolgt",
    "layerMixed": "gemischt",
    "layerEmpty": "nichts geladen",
    "layerCountLabel": "{n} gezeigt",
    "sourcesEmpty": "Es wurden keine Quellen angegeben.",
    "notAsked": "{n} weitere Quellen werden nur gelesen, wenn eine Ebene eingeschaltet ist, die sie braucht."
  },
  "time": {
    "justNow": "gerade eben",
    "aMinuteAgo": "vor einer Minute",
    "minutesAgo": "vor {n} Minuten",
    "anHourAgo": "vor einer Stunde",
    "hoursAgo": "vor {n} Stunden",
    "aDayAgo": "vor einem Tag",
    "daysAgo": "vor {n} Tagen",
    "lessThanAMinute": "weniger als einer Minute",
    "aMinute": "einer Minute",
    "minutes": "{n} Minuten",
    "anHour": "einer Stunde",
    "hours": "{n} Stunden",
    "aDay": "einem Tag",
    "days": "{n} Tagen",
    "months": "{n} Monaten",
    "years": "{n} Jahren",
    "inFuture": "in {d}",
    "ago": "vor {d}"
  },
  "sheet": {
    "handle": "Höhe des Bereichs",
    "closed": "geschlossen",
    "peek": "abgesenkt",
    "half": "halb offen",
    "full": "ganz offen",
    "state": "{height}. Pfeil hoch und runter ändern sie",
    "title": "Höhe des Bereichs: {height}. Tippen oder ziehen, um sie zu ändern"
  },
  "print": {
    "title": "Diese Ansicht als Postkarte (6 × 4 Zoll) speichern (JPEG)",
    "making": "Die Postkarte wird erstellt",
    "saved": "Postkarte gespeichert",
    "failed": "Die Postkarte ließ sich gerade nicht erstellen",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "So, wie das Auge es sieht",
      "deep": "Starke Dehnung: schwaches Licht angehoben"
    },
    "look": {
      "measured": "Aussehen „Gemessen“"
    }
  },
  "hud": {
    "fromYou": "von dir",
    "fromPlace": "von {place}",
    "behind": "verdeckt: {world}",
    "offScreen": "{name}, {distance} entfernt, außer Bild: hinfliegen",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "Alle Bereiche ausblenden (H)",
    "show": "Die Bereiche wieder einblenden (H oder Esc)",
    "hint": "H oder Esc für die Bereiche. Umschalt+H behält Beschriftungen und Zeit"
  },
  "mark": {
    "label": "Quellcode auf GitHub",
    "title": "Quellcode von Space Radar auf GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "Pressemappe",
    "pressTitle": "Was es ist, Bilder und das Zeichen zum Verwenden",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "Raumstation",
    "satellite": "Satellit",
    "debris": "Trümmer",
    "rocket": "Rakete",
    "probe": "Sonde",
    "telescope": "Teleskop",
    "asteroid": "Asteroid",
    "comet": "Komet",
    "site": "Ort am Boden",
    "world": "Welt",
    "star": "Stern",
    "exoplanet": "Planet eines anderen Sterns",
    "dso": "Deep-Sky-Objekt",
    "exotic": "Extremes Objekt",
    "storm": "Tropischer Wirbelsturm",
    "earthevent": "Ereignis auf der Erde",
    "oddity": "Kuriosität",
    "unknown": "Objekt"
  },
  "cls": {
    "nearEarthApprox": "So nah an der Erde ist sein Ort nur ungefähr: Die gezeichnete Bahn führt allein um die Sonne und lässt die Anziehung der Erde weg.",
    "label": "Woher wir wissen, wo es ist",
    "measured": "gemessene Position",
    "inferred": "Position fortgeschrieben aus Bahnelementen, die {n} {unit} alt sind",
    "inferredUnknownAge": "Position fortgeschrieben aus Bahnelementen unbekannten Alters",
    "inferredNoElements": "Position berechnet, nicht gemessen",
    "stormAdvisory": "sein Zentrum bei der Meldung von {time} UTC, {ago}; ein Sturm zieht weiter, er hat sich seither also bewegt",
    "stormAdvisoryDated": "sein Zentrum bei der Meldung vom {date}, {time} UTC, {ago}; ein Sturm zieht weiter, er hat sich seither also bewegt",
    "illustrative": "gezeichnet, um zu zeigen, wohin es fliegt; die echte Bahn ist nicht öffentlich",
    "placeIllustrative": "seine echte Bahn aus dem Katalog von CelesTrak, an einem erfundenen Ort darauf; aktuelle Bahnelemente haben wir für es nicht",
    "sample": "mitgelieferte Stichprobendaten, keine Live-Position",
    "provisional": "noch nicht im öffentlichen Katalog – das sind die eigenen Bahnelemente des Betreibers, über CelesTrak veröffentlicht; eine dauerhafte Nummer kommt, sobald Space-Track es aufführt",
    "unknown": "wir können nicht sagen, wie diese Position bestimmt wurde",
    "unplaced": "niemand weiß, wo dies ist, deshalb wird nichts dafür gezeichnet",
    "inferredArc": "zuletzt hat es jemand am {date} gesehen, und {caveat}",
    "precisionSplit": "{anchorName} ist auf {anchorM} m genau gemessen; dies wurde {how} und ist auf {objectM} m genau platziert",
    "precisionSplitUnknown": "{anchorName} ist auf {anchorM} m genau gemessen; dieses Objekt selbst wurde nie vermessen",
    "precisionSplitHowOnly": "{anchorName} ist auf {anchorM} m genau gemessen; dieses Objekt wurde {how}, und niemand hat veröffentlicht, wie genau",
    "precisionOwn": "auf {objectM} m genau verortet: {how}",
    "aboard": "dies ist die eigene Position von {carrier}, weil das Objekt außen daran festgeschraubt ist und dorthin fliegt, wohin es fliegt",
    "how": {
      "surveyed": "aus dem Orbit vermessen",
      "photogrammetric": "auf Fotos gefunden",
      "orbital_imaging": "auf Orbitalbildern gefunden",
      "unsurveyed": "nie vermessen",
      "map_reference": "einer Karte entnommen"
    },
    "hourWord": "Stunde",
    "hoursWord": "Stunden",
    "dayWord": "Tag",
    "daysWord": "Tage",
    "minuteWord": "Minute",
    "minutesWord": "Minuten",
    "yearWord": "Jahr",
    "yearsWord": "Jahre"
  },
  "unplaced": {
    "why": "{whyUnknown}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "Brand",
      "volcano": "Ausbrechender Vulkan",
      "iceberg": "Eisberg"
    },
    "rows": {
      "kind": "Was es ist",
      "reported": "Letzte Meldung",
      "since": "Ausbruch seit",
      "first": "Zuerst gemeldet",
      "size": "Größe",
      "where": "Wo",
      "by": "Gemeldet von"
    },
    "sizeValue": "{n} km²",
    "sizeSmall": "unter 1 km²",
    "by": "{agencies}, über NASA EONET",
    "sky": "Es liegt am Boden. Aus dem Orbit ist ein Feuer eine Rauchfahne, ein Vulkan eine Aschesäule, ein Eisberg eine weiße Platte auf dunklem Wasser.",
    "drawn": "gezeichnet als Markierung an seinem zuletzt gemeldeten Ort; seine Ausdehnung am Boden wird nicht gezeichnet",
    "honesty": "Ein Punkt aus dem EONET der NASA, zuletzt gemeldet {date} und gelesen {read}. Zum Anschauen, kein amtliches Verzeichnis darüber, wo oder wann."
  },
  "deepFacts": {
    "methodRow": "Entfernung bestimmt durch",
    "billionLightYears": "{n} Milliarden Lichtjahre",
    "methods": {
      "parallax": "Parallaxe: die Verschiebung seines Sterns vor dem fernen Himmel",
      "eclipsing-binary": "Bedeckungsveränderliche Sterne darin",
      "cepheid": "Cepheiden (veränderliche Sterne) darin",
      "TRGB": "die hellsten Roten Riesen darin",
      "standard-candle": "Sterne oder Explosionen bekannter Helligkeit",
      "redshift": "seine Rotverschiebung, über ein kosmologisches Modell",
      "kinematic": "wie schnell es sich mit der Drehung der Galaxie bewegt",
      "assumed-member-of-parent": "keine eigene: Es wird in der Entfernung seiner Galaxie platziert"
    },
    "drawnTag": {
      "reconstruction": "· rekonstruiert",
      "model": "· Modell",
      "photograph": "· Foto",
      "catalogue": "· Katalog",
      "illustration": "· Illustration"
    },
    "drawnWords": {
      "reconstruction": "eine 3D-Rekonstruktion nach einer veröffentlichten Studie",
      "model": "ein Modell seiner Art, nicht seine eigenen Sterne",
      "photograph": "ein echtes Foto, von unserer Seite aus",
      "catalogue": "Katalogpositionen",
      "illustration": "ein illustratives Leuchten und eine Markierung seiner Art"
    },
    "drawnLine": "Gezeichnet ist: {drawn}.",
    "drawnJoin": "; anderswo ",
    "records": {
      "dso-milky-way": {
        "drawn": "eine Illustration auf Grundlage von Messungen",
        "split": "Gemessen: die Sterne innerhalb weniger tausend Lichtjahre (Gaia), der Winkel des Balkens, die Richtungen entlang der Arme und die näheren Arme (Reid et al. 2019). Erschlossen: die ferne Seite hinter dem Zentrum, vom Staub verdeckt; ihre Arme sind die nahen, herumgeführt."
      }
    }
  },
  "truth": {
    "label": "Woher wir es wissen",
    "hints": {
      "measured": "Gemessen",
      "inferred": "Berechnet",
      "illustrative": "Illustrativ",
      "sample": "Stichprobe",
      "unknown": "Nicht bekannt",
      "unplaced": "Nicht platziert",
      "reconstruction": "Rekonstruiert",
      "model": "Modell",
      "photograph": "Foto",
      "catalogue": "Katalog",
      "illustration": "Illustration"
    },
    "loading": "Die Legende wird geöffnet.",
    "failed": "Die Legende wurde nicht geladen. Die Zeile darunter sagt es kurz."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "Aus der Nähe rollen kleine Wirbel dort, wo die gemessenen Winde scheren, und im Kielwasser des Großen Roten Flecks, und das Oval BA und drei weiße Ovale drehen sich. Wo die Scherung ist, ist gemessen; jeder Wirbel ist erzeugt, feiner als die Karte: illustrativ."
    },
    "poles": {
      "jupiter": "Die Zyklone um jeden Pol sind nach Junos Beobachtungen von 2017 modelliert, acht rund um einen im Norden und fünf im Süden: eine Rekonstruktion, kein Foto. Die dunklere Wolkendecke in den Lücken ist illustrativ."
    }
  },
  "weatherDetail": "Näher, als die Karte scharf ist, wird eine feine, streifige Wolkentextur erzeugt, die das Bild trägt: Sie bewegt sich mit den gemessenen Winden und behält die eigenen Farben der Karte, und kein einziger Streifen davon ist eine echte Wolke. Illustrativ.",
  "weatherVortex": {
    "turning": {
      "saturn": "Aus der Nähe dreht sich ein kleiner Zyklon im Sechseck: Sein Auge ist 2 000 km breit, und seine Wand läuft mit 150 Metern pro Sekunde herum, wie Cassini 2012 gemessen hat. Die Spirale darum herum ist illustrativ, und derzeit beobachtet ihn niemand."
    },
    "still": {
      "saturn": "Aus der Nähe sitzt ein kleiner Zyklon im Sechseck: Sein Auge ist 2 000 km breit, wie Cassini 2012 gemessen hat, als seine Wand mit 150 Metern pro Sekunde herumlief. Die Spirale darum herum ist illustrativ, und derzeit beobachtet ihn niemand."
    }
  },
  "sunAlive": {
    "prominences": "{n} Protuberanzen stehen an seinem Rand, an den aktiven Regionen, die die NOAA innerhalb von fünfzehn Grad vom Rand aufführt. Die Orte sind gemessen; die Formen, Höhen und die Bewegung sind illustrativ.",
    "prominencesOne": "Eine Protuberanz steht an seinem Rand, an einer aktiven Region, die die NOAA innerhalb von fünfzehn Grad vom Rand aufführt. Der Ort ist gemessen; die Form, die Höhe und die Bewegung sind illustrativ.",
    "flare": "Eine Eruption der Klasse {cls} ist an der Region {region} zu sehen: Sie erreichte ihr Maximum um {time} UTC am {date}, laut Ereignisliste der NOAA. Ihre Zeit, Klasse, Region und ihr Abklingen sind gemessen; wie hell sie gezeichnet ist, ist illustrativ.",
    "cme": "Ein koronaler Massenauswurf, der um {time} UTC am {date} mit {speed} km/s aufbrach, ist so gezeichnet, wie ihn ein Koronograf zeigt: eine helle Schleife, die nach außen wandert, dahinter ein dunklerer Hohlraum und ein heller Kern. Sein Beginn, seine Richtung, Breite und Geschwindigkeit stammen aus dem DONKI-Katalog der NASA; die Wolke behält diese Geschwindigkeit, was echte nicht tun, und ihr Aussehen ist illustrativ."
  },
  "starSystem": {
    "zoneLabel": "Habitable Zone, berechnet",
    "orbitOf": {
      "mercury": "Die Merkurbahn, als Maßstab",
      "earth": "Die Erdbahn, als Maßstab",
      "jupiter": "Die Jupiterbahn, als Maßstab",
      "neptune": "Die Neptunbahn, als Maßstab"
    },
    "rows": {
      "known": "Was bekannt ist",
      "orbit": "Entfernung von seinem Stern",
      "temperature": "Temperatur, berechnet",
      "zone": "Habitable Zone, berechnet",
      "starTemperature": "Oberflächentemperatur",
      "starWidth": "Durchmesser",
      "starGlow": "Leuchten",
      "starMass": "Masse",
      "planets": "Gezeichnete Planeten",
      "stars": "Sterne im System",
      "companion": "Zweite Sonne"
    },
    "unseen": "Niemand hat seine Oberfläche gesehen.",
    "measuredOne": "Gemessen: {what}.",
    "measuredMany": "Gemessen: {what}.",
    "estimatedOne": "Geschätzt: {what}.",
    "estimatedMany": "Geschätzt: {what}.",
    "unmeasuredOne": "Nicht gemessen: {what}.",
    "and": " und ",
    "what": {
      "size": "Größe",
      "year": "Jahr",
      "mass": "Masse",
      "least": "Mindestmasse"
    },
    "au": "{n} AE",
    "auComputed": "{n} AE, berechnet aus seinem Jahr und der Masse seines Sterns",
    "earthsEstimated": "{n}× Erde, Schätzung des Archivs aus der Masse",
    "massEstimated": "{n}× Erde, Schätzung des Archivs aus der Größe",
    "massLeast": "Mindestens {n}× Erde",
    "sizeDefault": "Nicht gemessen: in Erdgröße gezeichnet",
    "temperature": "{k} K ({c} °C), wenn er {pct} % seines Lichts zurückwirft wie die Erde",
    "zone": {
      "inside": "In der Zone",
      "edge": "Am Rand: nur innerhalb der weiteren Grenzen",
      "hotter": "Näher am Stern als die Zone",
      "colder": "Weiter vom Stern weg als die Zone"
    },
    "zoneNone": {
      "too-hot": "Nicht berechnet: Die Formel gilt nicht für einen so heißen Stern",
      "too-cool": "Nicht berechnet: Die Formel gilt nicht für einen so kühlen Stern",
      "no-temperature": "Nicht berechnet: Die Temperatur des Sterns ist nicht gemessen",
      "no-luminosity": "Nicht berechnet: Die Helligkeit des Sterns ist nicht gemessen",
      "twoStars": "Nicht berechnet: Er umkreist zwei Sterne, und der Katalog beschreibt einen"
    },
    "zoneRange": "{a} bis {b} AE vom Stern (Kopparapu et al. 2014)",
    "overlay": {
      "title": "Über die Karte legen",
      "zone": "Habitable Zone",
      "orbits": "Bahnen unserer Planeten",
      "zoneTitle": "Wo flüssiges Wasser auf der Oberfläche eines Planeten bestehen könnte, berechnet aus Temperatur und Helligkeit des Sterns",
      "orbitsTitle": "Die Bahnen der Planeten unseres eigenen Sonnensystems, als Maßstab um diesen Stern gezeichnet",
      "note": {
        "none": "Über das System ist nichts gelegt.",
        "zone": "Das grüne Band ist die habitable Zone, berechnet (Kopparapu et al. 2014), nicht beobachtet.",
        "orbits": "Die gestrichelten Ringe sind Bahnen aus unserem eigenen Sonnensystem, als Maßstab. Nichts hier folgt ihnen.",
        "both": "Das grüne Band ist die habitable Zone, berechnet; die gestrichelten Ringe sind die Bahnen unserer eigenen Planeten, als Maßstab."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "Nicht gemessen",
    "starPoint": "Nicht gemessen: als Lichtpunkt gezeichnet",
    "starWhite": "Nicht gemessen: weiß gezeichnet",
    "starGlowValue": "Breiter als der Stern gezeichnet, in seiner Farbe, damit man ihn von weit weg sehen kann",
    "starsOne": "{n} im Katalog; einer ist gezeichnet",
    "starsBoth": "Zwei, beide gezeichnet",
    "companionValue": "{width} breit, {mass} schwer, {k} K{derived}",
    "companionDerived": " (ein Modellwert; seine Farbe ist illustrativ)",
    "zoneBoth": "{a} bis {b} AE, das Licht beider Sonnen zusammengezählt",
    "pairLine": "Die beiden Sonnen umkreisen einander alle {days} Tage, im Mittel {a} AE voneinander entfernt, auf der Bahn, die die Fachartikel gemessen haben; der Planet umkreist beide. Ihre Positionen sind aus dieser Bahn berechnet; die Ebene, in der sie gezeichnet sind, die Ebene der Planeten, ist die, die die Himmelsansicht benutzt.",
    "line": "Größen und Jahre aus dem NASA Exoplanet Archive, gelesen am {date}. Die Bahnen sind als Kreise gezeichnet{computed}; die Farben{phase} und die Neigung der Bahnen sind illustrativ{defaults}.",
    "lineComputed": ", bei {n} davon ist die Größe aus dem Jahr und der Masse des Sterns berechnet",
    "lineDefaults": "; ein Planet ohne gemessene Größe ist in Erdgröße gezeichnet"
  },
  "shells": {
    "radio": "Funk von der Erde hat {n} Lichtjahre erreicht"
  },
  "subscribe": {
    "heading": "Was kommt, per E-Mail",
    "emailLabel": "Deine E-Mail-Adresse",
    "emailPlaceholder": "du@example.com",
    "pickOne": "Hake mindestens eines an.",
    "launchesLabel": "Kommende Starts",
    "showersLabel": "Maxima von Meteorströmen",
    "approachesLabel": "Nahe Vorbeiflüge",
    "submit": "Abonnieren",
    "sending": "Wird gesendet …",
    "pending": "Prüfe deine E-Mails, um zu bestätigen.",
    "couldNotReach": "Der Abo-Dienst war nicht erreichbar."
  },
  "flood": {
    "on": "Anleuchten",
    "off": "Echtes Licht",
    "title": "Das Modell gleichmäßig beleuchten, damit man es im Schatten sehen kann. Nicht das echte Licht.",
    "note": "Unsere Lampe, nicht das echte Licht."
  },
  "ephemeris": {
    "drawn": "Nach JPL Horizons gezeichnet, interpoliert: auf etwa {km} km genau an der eigenen Bahn des JPL.",
    "note": "Die Karte kennt den Weg für diesen Tag, von JPL Horizons, auf etwa {km} km genau.",
    "noteLate": "Die Bahn des JPL dafür beginnt {n} Minuten nach diesem Moment, und die Uhr geht dorthin. Auf etwa {km} km genau.",
    "noteDay": "Die Seite der NASA nennt den Tag. Die Uhr geht zu {time} UTC, dem nächsten Vorbeiflug in der Bahn des JPL an diesem Tag, auf etwa {km} km genau.",
    "failed": "Sein Weg für diesen Tag wurde nicht geladen, deshalb bleibt die Uhr stehen. Wähle ihn noch einmal, um es erneut zu versuchen.",
    "span": "Der Weg des JPL dafür reicht von {from} bis {to}.",
    "before": "Die Uhr steht davor, deshalb hat die Karte keine Position dafür.",
    "after": "Die Uhr steht danach, deshalb hat die Karte keine Position dafür.",
    "go": "Zum nächstmöglichen Datum",
    "goBefore": "Die Uhr auf {date} stellen, wo der Weg des JPL dafür beginnt",
    "goAfter": "Die Uhr auf {date} stellen, wo der Weg des JPL dafür endet"
  },
  "offline": {
    "updateReady": "Eine neuere Version ist bereit",
    "reload": "Neu laden"
  },
  "keepTrip": {
    "keep": "Offline behalten",
    "keepTitle": "Die Stimme, die Modelle und die Karten dieser Reise auf diesem Gerät speichern, damit sie ohne Verbindung läuft",
    "keeping": "{done} von {total} gespeichert",
    "kept": "Offline behalten",
    "keptTitle": "Auf diesem Gerät behalten. Drücken, um es erneut zu holen.",
    "keptNote": "{n} Dateien, {size}, auf diesem Gerät gespeichert. Live-Daten (Wetter, Stürme, Satelliten) werden nicht behalten.",
    "again": "Nochmal versuchen",
    "failedNote": "{done} von {total} Dateien behalten. Prüfe die Verbindung und versuche es noch einmal."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "Drücke eine beliebige Taste, um mit Ton zu starten",
    "gateTitleTouch": "Berühre den Bildschirm, um mit Ton zu starten",
    "gateNote": "Wenn niemand da ist, startet es in {n} Sekunden still, mit Untertiteln.",
    "upNext": "Nächste Reise",
    "shape": "{n} Stationen · {m} Min.",
    "take": "Steuerung übernehmen",
    "takeTitle": "Die Reisen anhalten und die Karte selbst bewegen"
  },
  "drift": {
    "name": "Treiben",
    "pause": "Pause (Leertaste)",
    "resume": "Weiter (Leertaste)",
    "next": "Nächster Ort (N)",
    "options": "Optionen",
    "optionsTitle": "Wodurch man reist, was gezeigt wird und das Tempo",
    "leave": "Das Treiben beenden (Esc)",
    "through": "Reisen durch",
    "cats": {
      "craft": "Raumfahrzeuge",
      "worlds": "Welten",
      "small": "Kleinkörper",
      "stars": "Sterne",
      "deep": "Deep Sky"
    },
    "show": "Zeigen",
    "real": "Echte Modelle",
    "realTitle": "Nur Dinge mit einem echten Modell, einer Karte oder einem Foto",
    "names": "Namen",
    "namesTitle": "Der Name und die Zahlen neben jedem Ort",
    "bare": "Nur All",
    "bareTitle": "Nichts als der Himmel und die Dinge darin: keine Namen, Markierungen, Linien oder Bereiche",
    "pace": "Tempo",
    "paces": {
      "calm": "Ruhig",
      "steady": "Gleichmäßig",
      "brisk": "Zügig"
    },
    "hint": "Es treibt dahin. Ziehe die Karte, um die Steuerung zu übernehmen",
    "nothing": "Mit diesen Einstellungen gibt es nichts, wodurch man treiben könnte",
    "notFromGround": "Das Treiben beginnt im All, nicht vom Boden aus"
  },
  "tour": {
    "label": "Der Rundgang",
    "micro": "Rundgang",
    "count": "{n} / {of}",
    "next": "Weiter",
    "nextTitle": "Der nächste Schritt (N)",
    "done": "Fertig",
    "doneTitle": "Den Rundgang beenden",
    "skip": "Überspringen",
    "skipTitle": "Den Rundgang verlassen (Esc)",
    "voice": "Stimme",
    "voiceTitle": "Jeden Schritt vorlesen, mit einer synthetischen Stimme",
    "waited": "Sieh dich um, dann geht es weiter.",
    "invite": "Zum ersten Mal hier: Mach den Rundgang",
    "inviteTitle": "Acht Schritte rund um die Karte"
  },
  "undo": {
    "moved": "Weiter zu {name}",
    "movedNowhere": "Die Ansicht hat sich bewegt",
    "night": "Nacht in {name}: die weite Ansicht",
    "back": "Zurück, wo du warst",
    "done": "Wieder dort, wo du warst"
  },
  "searchRows": {
    "kinds": {
      "sun": "Stern",
      "planet": "Planet",
      "moon": "Mond",
      "station": "Raumstation",
      "satellite": "Satellit",
      "telescope": "Weltraumteleskop",
      "probe": "Raumfahrzeug",
      "rocket": "Rakete",
      "launch": "Start",
      "debris": "Trümmer",
      "asteroid": "Asteroid",
      "comet": "Komet",
      "site": "Ort",
      "landing": "Landeplatz",
      "star": "Stern",
      "exoplanet": "Planet eines anderen Sterns",
      "dso": "Deep-Sky-Objekt",
      "storm": "Tropischer Sturm",
      "oddity": "Kuriosität",
      "earthevent": "Ereignis auf der Erde",
      "blackhole": "Schwarzes Loch",
      "pulsar": "Pulsar",
      "magnetar": "Magnetar",
      "quasar": "Quasar"
    },
    "upNow": "jetzt am Himmel, im {compass}",
    "lowNow": "jetzt tief im {compass}",
    "downNow": "jetzt unter deinem Horizont",
    "trip": "Reise",
    "starPattern": "Sternbild",
    "mission": "Mission",
    "eventName": "{mission}: {title}",
    "event": "Missionsereignis · {date}",
    "eventNoDate": "Missionsereignis",
    "group": "Satelliten-Konstellation · {n} Satelliten auf der Karte · drücken, um sie aufzulisten",
    "nearMe": "Heute Nacht in meiner Nähe",
    "nearMeSub": "Was an deinem Himmel steht"
  },
  "countdown": {
    "go": "Start freigegeben",
    "tbc": "Zeit noch zu bestätigen",
    "tbd": "Zeit nicht festgelegt",
    "hold": "Angehalten: Der Countdown pausiert",
    "inFlight": "Im Flug",
    "success": "Gestartet",
    "deployed": "Nutzlast ausgesetzt",
    "failure": "Der Start ist fehlgeschlagen",
    "partial": "Ein Teilversagen",
    "byPlan": "Nach Plan. Keine neuere Meldung",
    "byPlanClimbing": "Nach Plan, im Aufstieg. Keine neuere Meldung",
    "age": "gelesen {age}"
  },
  "today": {
    "title": "Heute",
    "moonTitle": "Mond: {phase}",
    "moonLine": "{pct} % beleuchtet · {next} am {date}",
    "moonNext": [
      "Neumond",
      "erstes Viertel",
      "Vollmond",
      "letztes Viertel"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "Letzte 30 Tage",
    "launched": "{n} neue Objekte im Orbit",
    "launchedLine": "Neuestes: {name}",
    "debris": "Trümmer in Zahlen",
    "debrisClose": "Die Trümmeransicht schließen",
    "debrisTitle": "Zählt alles, was im Orbit verfolgt wird. Liest den ganzen Katalog, etwa 1,5 MB"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a}; {b}.",
    "title": "Quellen: {sources}. Drücken, um hinzugehen",
    "names": {
      "sat-25544": "die ISS",
      "sat-48274": "Tiangong"
    },
    "pass": "{name} überfliegt dich {when}",
    "launch": "{name} soll {when} starten",
    "showerToday": "heute: Maximum der {name}",
    "showerTomorrow": "morgen: Maximum der {name}",
    "moonName": "Der Mond",
    "moonPhases": [
      "Neumond",
      "",
      "Vollmond",
      ""
    ],
    "moonToday": "heute ist {phase}",
    "moonOne": "bis {phase} ist es noch ein Tag",
    "moonDays": "bis {phase} sind es noch {n} Tage",
    "moonLit": "der Mond ist zu {pct} % beleuchtet",
    "crew": "gerade sind {n} Menschen im Orbit",
    "crewOne": "gerade ist ein Mensch im Orbit",
    "storms": "{n} Stürme drehen sich",
    "stormOne": "ein Sturm dreht sich",
    "approach": "{name} passiert die Erde {when}",
    "launched": "{n} neue Objekte in 30 Tagen im Orbit",
    "dateToday": "heute ist {date}",
    "dateClock": "die Uhr steht auf {date}",
    "sources": {
      "pass": "Bahnelemente von CelesTrak",
      "launch": "Launch Library 2",
      "shower": "der Meteorstrom-Kalender der IMO",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "die Uhr deines Geräts"
    }
  },
  "wonder": {
    "kicker": "Wunder des Tages",
    "label": "Wunder des Tages: {title}"
  },
  "story": {
    "kicker": "Geschichte dieser Woche · Woche {week}",
    "label": "Geschichte dieser Woche: {title}",
    "ruleTitle": "Wie es berechnet wurde: {rule}",
    "lowest": {
      "title": "Am niedrigsten in unserem Katalog: {name}",
      "line": "Nie höher als {apogee} km, bis hinunter auf {perigee} km, ein Umlauf in {min} Min.",
      "rule": "Niedrigster höchster Punkt von {n} Bahnelementsätzen, die weniger als 7 Tage alt sind"
    },
    "farthest": {
      "title": "Am weitesten draußen in unserem Katalog: {name}",
      "line": "Hinaus bis {apogee} km, zurück bis {perigee} km, ein Umlauf in {lap}.",
      "hours": "{n} Stunden",
      "days": "{n} Tagen",
      "rule": "Höchster Punkt von {n} Bahnelementsätzen, die weniger als 7 Tage alt sind"
    },
    "busiest": {
      "title": "Die belebteste Höhe, die wir kennen: {lo} bis {hi} km",
      "line": "{n} der {total} Objekte, die wir kennen, fliegen dort: {pct} von 100.",
      "rule": "Die vollsten {band} km mittlerer Höhe in {n} Sätzen, die weniger als 7 Tage alt sind"
    },
    "oldest": {
      "title": "Ältester Start in unserem Katalog: {name}",
      "line": "Gestartet {year}, seit {years} Jahren oben, ein Umlauf in {min} Min.",
      "rule": "Frühestes Startjahr von {n} Bahnelementsätzen, die weniger als 7 Tage alt sind"
    }
  },
  "happened": {
    "flown": "Gestartet {age}",
    "lost": "Start fehlgeschlagen {age}"
  },
  "passport": {
    "title": "Reisepass",
    "openTitle": "Wo du gewesen bist, nur in diesem Browser gespeichert",
    "summary": "{places} · {n} von {total} Reisen",
    "places": "{n} Orte",
    "placeOne": "{n} Ort",
    "kept": "Nur in diesem Browser gespeichert, nie gesendet.",
    "notKept": "Hier ist nichts: Dein Browser speichert nichts.",
    "placesTitle": "Orte, die du geöffnet hast",
    "tripsTitle": "Beendete Reisen",
    "outOf": "{n} von {total}",
    "barLabel": "{n} von {total} Reisen beendet",
    "placeTitle": "Zu {name} gehen",
    "noPlaces": "Noch keine Orte. Öffne einen auf der Karte.",
    "noTrips": "Noch keine Reise beendet.",
    "seenTitle": "Mit eigenen Augen gesehen",
    "noSeen": "Noch nichts abgehakt. Ein Steckbrief hat „Gesehen“.",
    "seenIt": "Gesehen",
    "toolsLabel": "Mehr für dieses Objekt",
    "seenOn": "Gesehen am {date}",
    "seenTitleOff": "Abhaken, wenn du es mit eigenen Augen gesehen hast",
    "seenTitleOn": "Als gesehen abgehakt. Drücken, um den Haken zurückzunehmen",
    "seenNotKept": "Dieser Browser speichert nichts, der Haken bleibt nicht",
    "remind": "Erinnere mich",
    "remindTitle": "Lädt eine Kalenderdatei mit einer Erinnerung herunter: {title}",
    "forget": "Vergiss mich",
    "forgetConfirm": "Ja, vergessen",
    "forgetTitle": "Löscht den Reisepass und die Ton-Auswahl aus diesem Browser",
    "forgotten": "Vergessen. Der Browser hält nichts mehr.",
    "stamp": "Reise {n} von {total} · {date}",
    "stampPlaces": "bisher {places} geöffnet",
    "resume": "Weiter ab Station {n}"
  },
  "kept": {
    "title": "Was diese Seite auf deinem Gerät speichert",
    "lines": [
      "Dein Reisepass: geöffnete Orte, beendete Reisen, als gesehen abgehakte Dinge.",
      "Deine Auswahl für Ton und Stimme und wie du die Bereiche hinterlassen hast.",
      "Eine Kopie der Daten, die zuletzt gelesen wurden, damit sich die Karte ohne Verbindung öffnet.",
      "Während ein Bildschirm von allein läuft, ein kurzes Protokoll seiner Reisen, nur für diesen Tab."
    ],
    "place": "Dein Ort wird auf ein Zehntel Grad gerundet und nur gehalten, solange diese Seite offen ist.",
    "none": "Kein Konto, keine Cookies, keine Analysen. „Vergiss mich“ im Reisepass löscht den Reisepass und die Ton-Auswahl."
  },
  "buildInfo": {
    "line": "Gebaut aus {sha}, {date}",
    "title": "Der Commit, aus dem diese Seite gebaut wurde, auf GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "Sieht der Weltraum so aus?",
    "lead": "Wo die Dinge sind und wie sie sich bewegen, ist gemessen oder berechnet. Wie sie aussehen, kommt aus drei Arten von Bildern.",
    "kinds": [
      [
        "Ein 3D-Modell",
        "Die Nebel und Galaxien sind 3D-Modelle aus veröffentlichten Messungen, ihr Licht aus Teleskopfotos (lang belichtet); wo es noch kein Modell gibt, ein sanftes Leuchten in seiner Größe. Für das Auge ist dasselbe Gas ein schwaches graues Leuchten. Ein Steckbrief kann das Foto neben dem Modell zeigen."
      ],
      [
        "Eine Karte auf einem Modell",
        "Planeten und Monde sind Kugeln mit Karten, die aus Bildern von Raumsonden gemacht sind, manche davon von einem Künstler geglättet. Raumfahrzeuge sind 3D-Modelle, die meisten aus den veröffentlichten Dateien der NASA. Das Licht darauf ist für den gezeigten Moment berechnet."
      ],
      [
        "Eine künstlerische Darstellung",
        "Niemand hat die Oberfläche eines Planeten bei einem anderen Stern gesehen. Diese Gesichter sind aus einer gemessenen Größe und Temperatur ausgedacht, und ihre Steckbriefe sagen das."
      ]
    ],
    "foot": "Größen und Abstände werden manchmal verändert, damit man ein Ding überhaupt sehen kann. Wo das so ist, sagt es der Steckbrief oder das Bild."
  },
  "debris": {
    "title": "Trümmer im Orbit",
    "reading": "Der Katalog wird gelesen, etwa 1,5 MB",
    "failed": "Der Katalog ließ sich nicht lesen.",
    "retry": "Nochmal versuchen",
    "empty": "Der Katalog führt nichts im Orbit auf.",
    "lead": "{gone} der {total} im Orbit verfolgten Dinge funktionieren nicht mehr.",
    "kinds": {
      "debris": "Trümmerstücke",
      "rocket": "ausgediente Raketenkörper",
      "dead": "tote Satelliten",
      "working": "arbeitende Satelliten"
    },
    "bandsTitle": "Nach Höhe",
    "bands": {
      "low": "Unter 600 km",
      "crowded": "600 bis 1 000 km",
      "upper": "1 000 bis 2 000 km",
      "medium": "2 000 bis 34 000 km",
      "geo": "Um 36 000 km",
      "beyond": "Jenseits von 37 600 km",
      "stretched": "Gestreckte Bahnen"
    },
    "bandAria": "{band}: {total} insgesamt. {debris} Trümmerstücke, {rocket} Raketenkörper, {dead} tote Satelliten, {working} arbeitende.",
    "show": "Auf der Karte zeigen",
    "hide": "Von der Karte ausblenden",
    "showTitle": "Jedes Trümmerstück und jede ausgediente Rakete, nach Art gefärbt",
    "drawn": "{n} Punkte: Grau sind Trümmer, Gelb eine ausgediente Rakete. Jeder liegt in seiner echten Höhe und Neigung, an einem erfundenen Ort auf seiner Bahn.",
    "storiesTitle": "Aus dem Katalog",
    "oneObject": "Ein Objekt",
    "objects": "{n} Objekte",
    "oneLaunch": "einem Start",
    "launches": "{n} Starts",
    "oneThing": "Ein Ding",
    "things": "{n} Dinge",
    "storyLaunched": "In der Woche bis {date} neu im Katalog: {objects} aus {launches}.",
    "storyCameDown": "In dieser Woche wieder in die Atmosphäre eingetreten: {things}.",
    "storyCameDownBiggest": "In dieser Woche wieder in die Atmosphäre eingetreten: {things}, das größte davon {name}.",
    "storyCloud": "Die größte Trümmerwolke stammt von {name}: {pieces} Teile noch im Orbit.",
    "storyClouds": "Die größten Trümmerwolken: {name}, {pieces} Teile noch oben; dann {name2}, {pieces2}, und {name3}, {pieces3}.",
    "storyOldest": "Das älteste Ding, das noch im Orbit ist, ist {name}, gestartet {year}: {years} Jahre voller Umläufe.",
    "untracked": "Zu klein zum Verfolgen, nach dem Modell der ESA: etwa {mid} Millionen Teile von 1 bis 10 cm und {small} Millionen von 1 mm bis 1 cm, Stand {when}. Eine Schätzung, keine Zählung.",
    "untrackedSource": "Statistiken der ESA zur Weltraumumgebung",
    "honesty": "Gezählt nach dem Katalog von CelesTrak, wie er am {date} gelesen wurde: was Radar verfolgen kann, ab etwa 10 cm Größe. Kleinere Teile sind weit zahlreicher und stehen in keinem Katalog. Wo ein Punkt auf seiner Bahn liegt, ist illustrativ.",
    "drawnPlaced": "{n} Punkte: Grau sind Trümmer, Gelb eine ausgediente Rakete. {placed} liegen dort, wo ihr eigener Bahnelementesatz sie hinsetzt; die übrigen {rest} liegen in ihrer echten Höhe und Neigung, an einem erfundenen Ort auf der Bahn.",
    "honestyPlaced": "Gezählt nach dem Katalog von CelesTrak, wie er am {date} gelesen wurde: was Radar verfolgen kann, ab etwa 10 cm Größe. Kleinere Teile sind weit zahlreicher und stehen in keinem Katalog. Die Orte stammen aus den Bahnelementesätzen von CelesTrak vom {built}; ein Punkt ohne veröffentlichten Bahnelementesatz liegt an einem erfundenen Ort auf seiner Bahn, und seine Karte sagt es."
  },
  "klassFar": {
    "dwarf": "Zwergplanet",
    "interstellar": "Interstellares Objekt"
  },
  "moments": {
    "title": "Wofür bist du hier",
    "wonder": {
      "id": "wonder",
      "label": "Staunen",
      "hint": "Flieg herum und tippe auf irgendetwas."
    },
    "now": {
      "id": "now",
      "label": "Jetzt",
      "hint": "Was in dieser Minute über deinem Kopf ist."
    },
    "next": {
      "id": "next",
      "label": "Bald",
      "hint": "Was kommt, und wann."
    }
  },
  "audio": {
    "on": "Ton: an",
    "off": "Ton: aus",
    "toggleTitle": "Musik und Geräusche. Aus, bis du sie einschaltest; auf diesem Gerät gemerkt.",
    "mute": "Stumm",
    "unmute": "Ton",
    "muteTitle": "Musik und Geräusche ausschalten",
    "unmuteTitle": "Musik und Geräusche einschalten",
    "panelTitle": "Ton",
    "panelNote": "Eine leise Musik für die Karte und ihre Reisen. Nichts wird heruntergeladen, bevor du sie einschaltest.",
    "creditsLine": "Musik und Geräusche: {credits}",
    "narrationCredit": "Erzählung: eine synthetische Stimme, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "In der Farbe gezeichnet, die sein Licht misst (B−V {bv}, V−R {vr}), so hell, wie seine Oberfläche zurückwirft (Albedo {albedo}), auf einer gestauchten Skala, damit auch die dunkelste dieser Welten noch zu sehen ist.",
    "colourRed": "In der Farbe gezeichnet, die sein Licht misst (B−V {bv}, V−R {vr}), eines der rötesten Dinge im Sonnensystem, so hell, wie seine Oberfläche zurückwirft (Albedo {albedo}), auf einer gestauchten Skala, damit auch die dunkelste dieser Welten noch zu sehen ist.",
    "shapeEgg": "Seine Form ist das Ei, das seine Lichtkurve und eine Sternbedeckung von 2017 gemessen haben, {a} × {b} × {c} km.",
    "shapeMeasured": "Seine Form ist die, die Sternbedeckungen gemessen haben.",
    "shapeUnknown": "Seine Form wurde nie gemessen, deshalb ist es rund gezeichnet.",
    "ring": "Sein Ring liegt in seiner gemessenen Entfernung, Breite und Undurchsichtigkeit; wie der Ring am Himmel geneigt ist, wird nicht gezeichnet.",
    "faintRings": "Seine zwei Ringe, 2023 entdeckt, sind bei ihrer echten Undurchsichtigkeit zu schwach zum Sehen, deshalb werden sie nicht gezeichnet.",
    "surface": "Kein Teleskop hat seine Oberfläche aufgelöst: Nichts darauf wird gezeichnet, und es ist ruhend gezeichnet, ohne Drehung.",
    "source": "Zahlen: {src}."
  },
  "worldFace": {
    "titan": {
      "title": "Titan, auf zwei Arten",
      "modes": {
        "own": "Infrarot",
        "radar": "Radar"
      },
      "notes": {
        "own": "Titans Boden, wie ihn Cassinis Kamera durch den Dunst im nahen Infrarotlicht (938 nm) sah, im Orange des Dunstes. Die Meere im Norden sind entlang der Umrisse abgedunkelt, die Cassinis Radar gezeichnet hat, und aus der Nähe, wo sich die Sonne in ihnen spiegelt, glitzern sie: Wo das Glitzern fällt, ist berechnet; seine Größe und Helligkeit sind illustrativ.",
        "radar": "Streifen von Titans Boden, wie ihn Cassinis Radar durch den Dunst sah, 2004 bis 2015: Hell ist rauer Boden oder zum Radar geneigter Boden, dunkel ist glatt, und die Meere aus flüssigem Methan und Ethan sind schwarz. Das Grau stammt von uns: Radar hat keine Farbe. Das Radar sah 61 % von Titan; zwischen seinen Streifen scheint die Infrarotkarte durch, abgedunkelt, in Orange. USGS Astrogeology und NASA/JPL-Caltech, gemeinfrei."
      }
    },
    "venus": {
      "title": "Venus, auf zwei Arten",
      "modes": {
        "own": "Wolken",
        "surface": "Boden"
      },
      "notes": {
        "own": "Die Wolkenobergrenzen, das Einzige, was ein Auge oder ein Teleskop je von der Venus sieht.",
        "surface": "Der Boden unter den Wolken, von der NASA-Sonde Magellan zwischen 1990 und 1992 per Radar aus dem Orbit kartiert. Hell ist rauer Boden und dunkel ist glatt. Das Orange ist hinzugefügt, und die Streifen, die Magellan verpasst hat, sind von ihren Rändern aus aufgefüllt. Er wird von der Sonne beleuchtet, als wären die Wolken nicht da: Seine Berge und Steilhänge aus Magellans Höhenmesser, sechsmal höher gezeichnet, werfen ihre Schatten. Er bewegt sich nicht mit den Wolken."
      }
    },
    "jupiter": {
      "title": "Jupiter, auf zwei Arten",
      "modes": {
        "own": "Künstlerkarte",
        "hubble": "So sah Hubble es"
      },
      "notes": {
        "own": "Eine Karte eines Künstlers, aus Bildern von Raumsonden gemacht und geglättet (Solar System Scope). Es ist das Bild, das die meisten Menschen kennen.",
        "hubble": "Jupiter, wie Hubble ihn am 11. Dezember 2025 kartiert hat. Die Bänder sind dort, wo sie an jenem Tag waren, und keine Wolke ist dort, wo sie heute ist. Die Farben sind Hubbles rote, grüne und violette Filter, ein wenig gelber, als ein Auge sie sähe. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, bearbeitet."
      }
    },
    "saturn": {
      "title": "Saturn, auf zwei Arten",
      "modes": {
        "own": "Künstlerkarte",
        "hubble": "So sah Hubble es"
      },
      "notes": {
        "own": "Eine Karte eines Künstlers, aus Bildern von Raumsonden gemacht und geglättet (Solar System Scope). Es ist das Bild, das die meisten Menschen kennen.",
        "hubble": "Saturn, wie Hubble ihn am 29. August 2025 kartiert hat, in seinen roten, grünen und violetten Filtern, ein wenig gelber, als ein Auge ihn sähe. Der Streifen am Äquator, den die Ringe an jenem Tag verdeckten, ist aus den Wolken auf beiden Seiten aufgefüllt. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, bearbeitet."
      }
    },
    "uranus": {
      "title": "Uranus, auf zwei Arten",
      "modes": {
        "own": "Künstlerkarte",
        "hubble": "So sah Hubble es"
      },
      "notes": {
        "own": "Eine Karte eines Künstlers, aus Bildern von Raumsonden gemacht und geglättet (Solar System Scope). Es ist das Bild, das die meisten Menschen kennen.",
        "hubble": "Uranus, wie Hubble ihn am 23. Oktober 2025 kartiert hat. Der Planet liegt auf der Seite, mit dem Nordpol zu uns, deshalb sah Hubble nur die nördliche Hälfte; die südliche Hälfte hat die Farbe des Äquators, nicht geraten. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, bearbeitet."
      }
    },
    "neptune": {
      "title": "Neptun, auf zwei Arten",
      "modes": {
        "own": "Künstlerkarte",
        "hubble": "So sah Hubble es"
      },
      "notes": {
        "own": "Eine Karte eines Künstlers, aus Bildern von Raumsonden gemacht und geglättet (Solar System Scope). Es ist das Bild, das die meisten Menschen kennen.",
        "hubble": "Neptun, wie Hubble ihn am 24. August 2025 kartiert hat: blasser als die berühmten Bilder. Der ferne Norden lag außerhalb von Hubbles Sicht und hat die Farbe der letzten Wolken, die Hubble sah, nicht geraten. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, bearbeitet."
      }
    }
  },
  "exposure": {
    "panelTitle": "Belichtung",
    "modes": {
      "eye": "Auge",
      "camera": "Kamera",
      "deep": "Tief"
    },
    "notes": {
      "eye": "Was du von einem dunklen Ort aus sehen würdest: schwach und grau.",
      "camera": "Eine Langzeitbelichtung: Minuten an Licht, so wie eine Kamera es festhält.",
      "deep": "Die Dehnung einer Sternwarte: das schwächste Gas angehoben."
    },
    "real": "Das Gas ist echt und schwach: Für das Auge am Teleskop ist es ein graues Leuchten, weil das Auge nachts keine Farbe sieht. Das Bild am Himmel ist eine Langzeitbelichtung.",
    "colours": {
      "broadband": "Es wurde durch breite Farbfilter aufgenommen ({filters}), die Farben sind also nahe an dem, was ein viel empfindlicheres Auge sähe.",
      "mixed": "Es wurde durch breite Farbfilter aufgenommen, dazu ein schmaler für leuchtenden Wasserstoff ({filters}), das rote Gas ist hier also stärker, als ein Auge es fände.",
      "narrowband": "Seine Farben sind zugeordnet: Jede ist das Licht eines einzelnen Gases durch einen schmalen Filter ({filters}), gewählt, um die Struktur zu zeigen, nicht das, was ein Auge sähe.",
      "infrared": "Es wurde in Infrarotlicht aufgenommen, das kein Auge sehen kann ({filters}), deshalb ist jede Farbe hier gewählt: Es zeigt, was da ist, nicht was ein Auge sähe.",
      "unstated": "Sein Archiv sagt nicht, welche Filter benutzt wurden, deshalb sagen wir nicht, ob das die Farben sind, die ein Auge sähe."
    },
    "part": "Es zeigt {part}, nicht das Ganze.",
    "creditLead": "Bild: ",
    "creditTail": " · {licence}, Ränder von uns ausgeblendet und Himmel abgedunkelt"
  },
  "look": {
    "panelTitle": "Aussehen",
    "modes": {
      "measured": "Gemessen",
      "film": "Film"
    },
    "titles": {
      "measured": "Nur das, was gemessen oder modelliert ist, in echter Geschwindigkeit",
      "film": "Fügt erzeugte Details und illustratives Wetter hinzu"
    }
  },
  "lookSaid": {
    "measured": "Aussehen „Gemessen“: Nichts Erzeugtes oder Illustratives wird darauf gezeichnet.",
    "film": "Aussehen „Film“: Erzeugte Details und illustratives Wetter werden gezeichnet.",
    "worlds": {
      "saturn": "Wetter: Die Bänder bewegen sich mit den Windgeschwindigkeiten, die Cassini gemessen hat. Modellierte Bewegung, nicht die Wolken von heute."
    },
    "also": {
      "venus": "Blitze auf der Venus wurden gemeldet und sind noch umstritten; es wird keiner gezeichnet."
    },
    "turning": {
      "jupiter": "Aus der Nähe drehen sich das Oval BA und drei weiße Ovale dort, wo die Karte sie hat."
    },
    "poles": {
      "jupiter": "Die Zyklone um jeden Pol sind nach Junos Beobachtungen von 2017 modelliert, acht rund um einen im Norden und fünf im Süden: eine Rekonstruktion, kein Foto."
    },
    "sun": {
      "measured": "Aussehen „Gemessen“: Die erzeugte Körnung ist aus, und Korona und Protuberanzen stehen still.",
      "film": "Aussehen „Film“: Die Körnung ist erzeugt, und Korona und Protuberanzen bewegen sich wie gezeichnet, nicht wie gemessen."
    }
  },
  "otherLight": {
    "panelTitle": "Anderes Licht",
    "bands": {
      "visible": "Sichtbar",
      "infrared": "Infrarot",
      "microwave": "Mikrowellen",
      "gamma": "Gammastrahlen"
    },
    "notes": {
      "visible": "Der Himmel, wie Augen und Kameras ihn sehen.",
      "infrared": "Der Himmel im Infrarot, in Falschfarben: warmer Staub und kühle Sterne.",
      "microwave": "Mikrowellen, als Helligkeit: die Galaxis über dem ältesten Licht.",
      "gamma": "Gammastrahlen, in Falschfarben: Pulsare, Blazare, das Leuchten kosmischer Strahlung."
    },
    "colours": {
      "infrared": "Rot ist 22 µm, Grün 4,6 µm, Blau 3,4 µm (WISE)",
      "microwave": "Ein Band, 94 GHz, als Helligkeit gezeichnet (WMAP)",
      "gamma": "Rot ist 0,3 bis 1 GeV, Grün 1 bis 3, Blau über 3 (Fermi)"
    },
    "mixLabel": "Vom sichtbaren Himmel zu {band}",
    "mixValue": "{pct} % {band}",
    "loading": "Das Bild des ganzen Himmels wird geholt.",
    "failed": "Dieses Bild ist nicht angekommen. Der Himmel ist, wie er war.",
    "creditLead": "Himmelsdurchmusterung: ",
    "creditTail": ". Kacheln: CDS, Straßburg."
  },
  "overlay": {
    "panelTitle": "Erddaten",
    "keyTitle": "Jetzt auf dem Globus",
    "keyOff": "Wegnehmen",
    "keyOffTitle": "Die Erde so zeigen, wie sie ist",
    "none": "Keine",
    "loading": "Die NASA wird nach dem Bild gefragt.",
    "failed": "Dieses Bild ist nicht angekommen. Der Globus ist, wie er war.",
    "noEarth": "Wird auf der Erde gezeigt, wenn sie im Bild ist.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "Das Bild zeigt den {date}.",
      "monthly": "Das Bild ist der Mittelwert von {date}."
    },
    "made": {
      "measured": "Aus dem Orbit gemessen; leer, wo nichts gesehen wurde.",
      "analysed": "Gemessen, mit aufgefüllten Lücken.",
      "modelled": "Ein Wettermodell, mit Messungen gefüttert, kein direktes Bild."
    },
    "credit": "Daten: {credit}, über NASA GIBS. Eine Karte von Daten, kein Foto.",
    "wind": {
      "title": "Wind",
      "loading": "Das Windfeld wird angefragt.",
      "failed": "Das Windfeld ist nicht angekommen. Der Globus ist, wie er war.",
      "what": "Der Wind zehn Meter über dem Boden; die Farbe ist seine Geschwindigkeit.",
      "dated": "Die Vorhersage gilt für den {date}, {time} UTC.",
      "mean": "Im Mittel etwa {mean} m/s, bis zu {max}.",
      "sped": "Die Striche bewegen {n} Stunden Wind in einer Sekunde.",
      "spedDay": "Die Striche bewegen einen Tag Wind in einer Sekunde.",
      "still": "Jeder Strich ist ein Stück der Strömung, stillstehend.",
      "credit": "Daten: {credit}. Ein Wettermodell, keine Messung."
    },
    "currents": {
      "title": "Meeresströmungen",
      "loading": "Die Meeresströmungen werden angefragt.",
      "failed": "Die heutigen Meeresströmungen sind nicht da. Der Globus ist, wie er war.",
      "what": "Strömungen an der Meeresoberfläche; die Farbe ist die Temperatur des Wassers.",
      "dated": "Berechnet aus der Höhe des Meeres, die Satelliten am {date} gemessen haben: die stetige Strömung, ohne Gezeiten und Winddrift, am unsichersten am Äquator.",
      "tempDated": "Temperatur gemessen am {date}, Lücken aufgefüllt.",
      "tempMissing": "Ein grauer Strich ist Wasser ohne Temperatur in den Daten.",
      "sped": "Die Striche bewegen {n} Tage Drift in einer Sekunde; ein langer Strich ist schnelles Wasser.",
      "spedHours": "Die Striche bewegen {n} Stunden Drift in einer Sekunde; ein langer Strich ist schnelles Wasser.",
      "still": "Jeder Strich ist ein Stück der Strömung, stillstehend; ein langer ist schnelles Wasser.",
      "credit": "Daten: {credit}."
    },
    "legendAria": "{title}, von {low} bis {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "Die Figuren sind eine Überlieferung, von uns gezeichnet; die Sterne an ihren Ecken stehen in ihren gemessenen Entfernungen.",
    "lineSky": "Die Figuren sind eine Überlieferung, von uns gezeichnet, über den Sternen, wie man sie von der Erde aus sieht.",
    "ecliptic": "Die gestrichelte Linie ist die Ekliptik, der Weg der Sonne durch das Jahr.",
    "distance": "{n} Lj",
    "namedDistance": "{name}, {n} Lj"
  },
  "colourKey": {
    "title": "Farbe nach",
    "unknown": "für diese nicht bekannt",
    "scope": "Gezählt: was von hier aus gezeichnet ist, in aktiven Ebenen",
    "byLayer": "Die Form ist, was es ist; die Farbe ist seine Ebene.",
    "crewed": "davon gebaut, um eine Besatzung zu tragen",
    "swarm": "davon in einer großen Konstellation"
  },
  "trajectory": {
    "label": "Sein Weg, die nächsten eineinhalb Umläufe",
    "ariaLabel": "Höhe über der Zeit und die Bodenspur auf einer flachen Karte",
    "km": "{n} km",
    "now": "jetzt",
    "laps": "1½ Umläufe später",
    "north": "N",
    "south": "S",
    "note": "Berechnet aus denselben Bahnelementen wie der Punkt; die Karte ist der Boden direkt darunter."
  },
  "timeFacts": {
    "label": "Die nächsten 90 Minuten",
    "barLabel": "Sonnenlicht und Schatten in den nächsten 90 Minuten: {parts}",
    "barSunlit": "{mins} Min. im Sonnenlicht",
    "barShadow": "{mins} Min. im Schatten der Erde",
    "now": "jetzt",
    "end": "+90 Min.",
    "entersShadowIn": "Tritt in {mins} in den Schatten der Erde ein",
    "entersSunlightIn": "Kommt in {mins} ins Sonnenlicht",
    "entersShadowAt": "Tritt um {time} in den Schatten der Erde ein",
    "entersSunlightAt": "Kommt um {time} ins Sonnenlicht",
    "allSunlit": "Während der gesamten nächsten 90 Minuten im Sonnenlicht",
    "allShadow": "Während der gesamten nächsten 90 Minuten im Schatten der Erde",
    "minutes": "{n} Min.",
    "underAMinute": "weniger als einer Minute",
    "lapIn": "Beendet diesen Umlauf in {mmss}",
    "lapAt": "Beendet diesen Umlauf um {time}",
    "orbit": "Umlauf {n} seit dem Start",
    "orbitNote": "Erschlossen: die Zählung des Katalogs zum Zeitpunkt der Bahnelemente, plus die Umläufe seither.",
    "launched": "Gestartet {year}",
    "nowSunlit": "Im Sonnenlicht",
    "nowShadow": "Im Schatten der Erde",
    "shadowIn": "Schatten in {mins}",
    "sunlightIn": "Sonnenlicht in {mins}",
    "shadowAt": "Schatten um {time}",
    "sunlightAt": "Sonnenlicht um {time}",
    "lapEndsIn": "Umlauf endet in {mmss}",
    "lapEndsAt": "Umlauf endet um {time}"
  },
  "train": {
    "label": "In einem Zug",
    "oneOf": "Einer von {n}, die zusammen gestartet sind ({designator}).",
    "youLead": "Dieser führt.",
    "leads": "{name} führt; dieser steht an Position {position} in der Reihe.",
    "stillRaising": "Steigt noch als eine Reihe, etwa {alt} km hoch – die Lichterkette, von der Leute berichten.",
    "spreadOut": "Jetzt verteilt, etwa {alt} km hoch; keine Reihe mehr am Himmel."
  },
  "aboard": {
    "label": "Auch an Bord",
    "openTitle": "Den Steckbrief dazu öffnen",
    "note": "Diese haben keinen eigenen Punkt. Sie sind genau dort, wo dieses Raumfahrzeug ist, weil sie daran festgeschraubt sind.",
    "backTitle": "Den Steckbrief des Raumfahrzeugs öffnen, das dies trägt"
  },
  "myth": {
    "label": "Oft gesagt",
    "line": "{claim} – {correction}",
    "contested": "Oft gesagt, und wirklich umstritten: {claim} – {correction}"
  },
  "source": {
    "prefix": "Quelle",
    "unknown": "Quelle nicht verzeichnet",
    "fetched": "gelesen {age}"
  },
  "photo": {
    "title": "Ein Bild gestalten",
    "barLabel": "Bild",
    "shapesLabel": "Format",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "Das Bild im Format {shape} rahmen",
    "caption": "Bildunterschrift",
    "captionTitle": "Der Streifen mit Namen, Datum und Adresse",
    "save": "Bild speichern",
    "saveTitle": "Speichern, was im Rahmen liegt, als JPEG",
    "saveTitlePng": "Speichern, was im Rahmen liegt, als PNG",
    "timeLabel": "Zeit",
    "earlier": "Früher",
    "later": "Später",
    "timeTitle": "{dir} um {unit}, wie die Zeitanzeige schaltet",
    "lens": "Objektiv",
    "lensValue": "{n}°",
    "lensTitle": "Blickfeld, {n} Grad. Schmal ist ein langes Objektiv; weit nimmt mehr auf",
    "png": "PNG",
    "pngTitle": "Verlustfrei speichern, als größere Datei",
    "share": "Teilen",
    "shareTitle": "Das Bild dem Teilen-Menü dieses Geräts übergeben",
    "sharedSaved": "Dieses Gerät wollte es nicht teilen. Stattdessen wurde das Bild gespeichert",
    "done": "Fotomodus verlassen",
    "making": "Das Bild wird erstellt",
    "saved": "Bild gespeichert",
    "failed": "Das Bild ließ sich gerade nicht erstellen",
    "honesty": "Aus gemessenen Positionen gezeichnet, kein Foto"
  },
  "tonight": {
    "title": "Heute Nacht",
    "placeGuess": "Nahe {place}, aus deiner Zeitzone geschätzt",
    "placeSet": "Von {place} aus",
    "placeMine": "Von nahe deinem Ort",
    "placeShared": "Von {place} aus, mit dir geteilt",
    "noPlace": "Lege deinen Ort fest, um Überflüge zu sehen.",
    "coords": "{lat}, {lon}",
    "working": "Die Überflüge dieser Nacht werden berechnet …",
    "passLine": "{name} · {time} · von {from} nach {to}, im höchsten Punkt {fists} ({deg}°) · {mins} Min.",
    "startsIn": "Beginnt in {countdown}",
    "startsAt": "Beginnt um {time}",
    "upNow": "Jetzt am Himmel, schau nach {dir}",
    "showMe": "Zeigen",
    "showMeTitle": "Den Himmel von deinem Ort aus öffnen, mit Blick dorthin, wo es aufgeht",
    "guessCaveat": "Zeiten können bei dir ein paar Minuten abweichen.",
    "unitRises": "geht auf",
    "unitHigh": "am höchsten",
    "unitLong": "Min. sichtbar",
    "degrees": "{deg}°",
    "path": "Von {from} nach {to}",
    "rowDetail": "{time} · {deg} hoch · {mins} Min.",
    "nothingTonight": "Heute Nacht zieht nichts Helles vorbei.",
    "nextPass": "Als Nächstes: {when} · {name}",
    "nothingAtAll": "Drei Tage lang zieht nichts Helles vorbei.",
    "darkFrom": "Dunkel ab {time}",
    "darkUntil": "Dunkel bis {time}",
    "darkNow": "Jetzt dunkel",
    "neverDark": "Heute Nacht wird es nicht dunkel",
    "moonRises": "Mond {pct} %, geht um {time} auf",
    "moonUp": "Mond {pct} %, jetzt am Himmel",
    "moonDown": "Mond {pct} %, unter dem Horizont",
    "more": "Weitere Überflüge",
    "fewer": "Weniger Überflüge",
    "arcLabel": "Sein Weg über den Himmel: geht im {from} auf, am höchsten {deg}° hoch, geht im {to} unter",
    "cardinals": {
      "N": "N",
      "E": "O",
      "S": "S",
      "W": "W"
    },
    "best": {
      "title": "Das Beste heute Nacht",
      "nothing": "Heute Nacht fällt nichts auf.",
      "rowTitle": "Am Himmel zeigen",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "{mag} mag",
      "passAria": "{name}: erscheint {t0} {d0}, am höchsten {t1} bei {deg}° {d1}, weg {t2} {d2}, {mag} mag.",
      "fades": "Es verblasst im Schatten der Erde, bevor es untergeht.",
      "appears": "Es tritt auf halber Höhe aus dem Schatten der Erde.",
      "notVisible": "Nicht sichtbar: Himmel hell oder im Schatten.",
      "rocket": "Raketenkörper · {name}",
      "debris": "Trümmer · {name}",
      "planetLine": "am besten {time} · {deg}° hoch, im {dir}",
      "moonTitle": "Mond · {phase} · {pct} %",
      "moonSets": "geht um {time} unter",
      "moonRises": "geht um {time} auf",
      "moonAllNight": "die ganze Nacht am Himmel",
      "phases": {
        "new": "Neumond",
        "waxingCrescent": "zunehmende Sichel",
        "firstQuarter": "erstes Viertel",
        "waxingGibbous": "zunehmender Mond",
        "full": "Vollmond",
        "waningGibbous": "abnehmender Mond",
        "lastQuarter": "letztes Viertel",
        "waningCrescent": "abnehmende Sichel"
      },
      "showerLine": "bis zu {zhr} pro Stunde · am besten {time}, im {dir}",
      "dsoLine": "Max. {time} · {deg}° hoch, {dir} · {how}",
      "dsoNeeds": {
        "eye": "bloßes Auge",
        "binoculars": "Fernglas"
      },
      "view": "Meine Blickrichtung",
      "viewHeight": "Wie hoch es stehen muss",
      "facings": {
        "any": "Rundum",
        "n": "Norden",
        "e": "Osten",
        "s": "Süden",
        "w": "Westen"
      },
      "facingTitles": {
        "any": "Der ganze Himmel",
        "n": "Nur das Beste im Norden",
        "e": "Nur das Beste im Osten",
        "s": "Nur das Beste im Süden",
        "w": "Nur das Beste im Westen"
      },
      "heights": {
        "0": "Beliebige Höhe",
        "15": "Über 15°",
        "30": "Über 30°"
      },
      "viewNothing": "Durch diesen Teil des Himmels zieht heute Nacht nichts.",
      "darkHours": "Dunkel {from}–{to}",
      "moonless": "kein Mond, eine dunkle Nacht",
      "moonBright": "Mond {pct} % dämpft schwache Sterne",
      "moonFaint": "Mond {pct} %, wenig Licht",
      "neverDark": "Heute Nacht wird es nicht dunkel.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "Für deinen Ort berechnet; Helligkeit geschätzt."
    },
    "skybar": {
      "title": "Der Himmel",
      "field": "Blickfeld",
      "fields": {
        "eye": "Auge",
        "binoculars": "Fernglas",
        "telescope": "Teleskop"
      },
      "fieldNotes": {
        "eye": "So weit, wie du siehst. Zoom: scrollen oder zwei Finger.",
        "binoculars": "Ein Feld von 7°: Schwächere Sterne treten hervor.",
        "telescope": "Ein Feld von 1°: Planeten werden zu Scheiben."
      },
      "following": "Folgt {name}. Ziehen zum Loslassen.",
      "followSet": "{name} ging unter, die Ansicht ließ los.",
      "show": "Linien und Namen",
      "toggles": {
        "figures": "Figuren",
        "names": "Namen",
        "art": "Bilder",
        "bounds": "Grenzen",
        "sunPath": "Sonnenbahn",
        "equator": "Äquator",
        "grid": "Gitter",
        "starGrid": "Sterngitter",
        "meteors": "Meteore",
        "trails": "Spuren",
        "seeThrough": "Durchsichtiger Boden"
      },
      "toggleTitles": {
        "seeThrough": "Land durchsichtig zeichnen: Was liegt unterm Horizont?",
        "figures": "Die Figuren der Sternbilder",
        "names": "Namen von Sternbildern und hellen Sternen",
        "sunPath": "Der Weg, den Sonne, Mond und Planeten einhalten",
        "equator": "Der Äquator des Himmels, über dem der Erde",
        "grid": "Höhe und Richtung, mit der Nord-Süd-Linie",
        "starGrid": "Das Gitter, auf dem die Sterne kartiert sind",
        "art": "Die westlichen Figuren als Zeichnungen, von Johan Meuris",
        "bounds": "Die offiziellen Grenzen der 88 Sternbilder",
        "meteors": "Leuchtspuren der heutigen Ströme, in heutiger Rate",
        "trails": "Letzte Stunde jedes hellen Sterns, lang belichtet"
      },
      "time": "Zeit am Himmel",
      "timeNow": "Jetzt",
      "timeNowTitle": "Zurück in die Gegenwart",
      "timeDusk": "Abend",
      "timeMidnight": "Mitternacht",
      "timeDawn": "Morgen",
      "timeTitles": {
        "dusk": "Das Ende der bürgerlichen Dämmerung heute Abend",
        "midnight": "Die Mitte der Nacht",
        "dawn": "Der Beginn der bürgerlichen Dämmerung am Morgen"
      },
      "timeStrip": "Ziehen, um den Himmel zu drehen",
      "timeTicks": {
        "dusk": "Abend",
        "midnight": "Mitte",
        "dawn": "Morgen"
      },
      "timeStripAria": "Die Zeit am Himmel: ziehen oder die Pfeiltasten benutzen, zehn Minuten pro Schritt",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "Tag",
        "golden": "tiefe Sonne",
        "civil": "bürgerliche Dämmerung",
        "nautical": "nautische Dämmerung",
        "astronomical": "letzte Dämmerung",
        "night": "Nacht"
      },
      "timeFar": "Keine Satelliten so weit von heute: Ihre Bahnen veralten.",
      "eyepiece": "Okular",
      "eyepieces": {
        "low": "Niedrig · 1°",
        "medium": "Mittel · 30′",
        "high": "Hoch · 12′"
      },
      "eyepieceTitles": {
        "low": "Ein Feld von einem Grad: zwei Vollmonde breit",
        "medium": "Ein halbes Grad: der ganze Mond",
        "high": "Ein Fünftel Grad: Planeten als Scheiben"
      },
      "centre": "Was in der Mitte ist",
      "centreTitle": "Benennen, worauf die Mitte der Ansicht liegt; die Eingabetaste öffnet den Steckbrief",
      "con": {
        "kind": "Sternbild",
        "label": "{name}, ein Sternbild.",
        "inside": "in {name}"
      },
      "landscape": {
        "city": "Horizont: eine Stadt, gezeichnet. Nicht deine Straße.",
        "hills": "Horizontlinie: Hügel, gezeichnet. Nicht deine eigenen.",
        "coast": "Meer im {dir}, nach der Wasserkarte. Land gezeichnet."
      },
      "artWesternOnly": "Die Bilder gehören zu den westlichen Figuren",
      "culture": "Wessen Himmel",
      "cultures": {
        "western": "Westlich",
        "chinese": "Chinesisch",
        "maori": "Māori",
        "hawaiian": "Hawaiianisch",
        "samoan": "Samoanisch",
        "tongan": "Tongaisch",
        "norse": "Nordisch",
        "boorong": "Boorong"
      },
      "cultureNotes": {
        "western": "Die 88 Sternbilder von 1922, von Astronomen vereinbart.",
        "chinese": "Etwa 300 Asterismen. Eine Lesart eines lebendigen Himmels.",
        "maori": "Sechs Figuren; Namen je nach Iwi. Lebendiger Himmel.",
        "hawaiian": "Sternlinien eines Navigators, bis heute zum Steuern genutzt.",
        "samoan": "Vierzehn Figuren samoanischer Überlieferung. Lebendig.",
        "tongan": "Sternpfade und Figuren Tongas. Eine lebendige Tradition.",
        "norse": "Sechs Figuren, eine Rekonstruktion des nordischen Himmels.",
        "boorong": "Himmel einer Boorong-Familie, erzählt 1857. Noch lebendig."
      },
      "cultureCredits": {
        "western": "Bilder: Johan Meuris, für Stellarium, Free Art License. Carina, Puppis und Vela teilen sich eine Zeichnung; Serpens hat keine.",
        "chinese": "Figuren: Sun Shuwei und Karrie Berglund, für Stellarium, CC BY-SA 4.0. Eine dokumentierte Rekonstruktion.",
        "maori": "Figuren: Dan Smale, für Stellarium, CC BY-SA 4.0. Eine dokumentierte Rekonstruktion.",
        "hawaiian": "Figuren: nach Nainoa Thompson, von den Kamehameha Schools Kapālama, für Stellarium, CC BY-SA 4.0.",
        "samoan": "Figuren: Jake Fitisemanu mit samoanischen Hütern, für Stellarium, CC BY-SA 4.0. Eine dokumentierte Rekonstruktion.",
        "tongan": "Figuren: Dan Smale, für Stellarium, CC BY-SA 4.0. Eine dokumentierte Rekonstruktion aus begrenzten Quellen.",
        "norse": "Figuren: Jonas Persson, für Stellarium, CC BY-SA 4.0. Eine Rekonstruktion, keine Aufzeichnung.",
        "boorong": "Figuren: John Morieson und Alex Cherney, für Stellarium, CC BY-SA 4.0. Eine Lesart eines lebendigen Himmels."
      },
      "meteorNote": "{name}: etwa {n} pro Stunde hier.",
      "meteorFew": "{name}: unter eins pro Stunde hier.",
      "meteorDown": "{name}: Radiant unten, keine Spuren.",
      "meteorHonest": "Die heutige Rate ist ein Modell, die Spuren illustrativ.",
      "meteorSporadic": "Kein Strom. Antihelion-Quelle: {n} pro Stunde.",
      "darkness": "Dein Himmel",
      "darknessModes": {
        "city": "Stadt",
        "town": "Kleinstadt",
        "dark": "Dunkler Ort"
      },
      "darknessAuto": "Auto",
      "darknessAutoTitle": "Die Art des Himmels aus den nächtlichen Lichtern an deinem Ort ablesen",
      "darknessBy": {
        "place": "Geschätzt aus NASAs Nachtlicht-Karte deines Ortes.",
        "reading": "Die nächtlichen Lichter an deinem Ort werden gelesen.",
        "unread": "Nachtlicht-Karte nicht lesbar: Wähle deinen Himmel.",
        "trip": "Von dieser Station der Reise festgehalten."
      },
      "darknessNotes": {
        "city": "Stadt: Sterne bis Größenklasse 4, keine Milchstraße.",
        "town": "Ortsrand: Sterne bis Größenklasse 5,3.",
        "dark": "Dunkler Ort: Sterne bis 6,5 und die Milchstraße."
      },
      "point": {
        "row": "Handy ausrichten",
        "on": "Handy ausrichten",
        "title": "Das Handy hochhalten: Die Ansicht dreht sich mit",
        "note": "Halte das Handy zum Himmel und drehe dich. Ansicht folgt.",
        "noPlace": "Braucht deinen Ort, um zu wissen, wo Norden ist.",
        "denied": "Bewegungssensor verweigert. Ziehen geht weiter.",
        "deniedHow": "Zum Erlauben neu laden und „Erlauben“ wählen.",
        "none": "Kein Bewegungssensor da. Ziehen geht weiter.",
        "unsupported": "Browser ohne Bewegungssensor. Ziehen geht weiter.",
        "lineUpWith": "Falsch? Ziehe, bis {name} passt.",
        "lineUpPlain": "Falsch? Ziehe, bis ein heller Stern passt.",
        "lined": "Von Hand ausgerichtet, {n}° vom Kompass entfernt.",
        "reset": "Ausrichtung zurücknehmen",
        "resetTitle": "Zurück zum eigenen Norden des Kompasses",
        "accuracy": "Der Kompass gibt an, auf etwa {n}° genau zu sein.",
        "relative": "Kein Kompass. Ziehe den Himmel zurecht.",
        "declination": "Wahrer Norden: Kompass um {n}° nach {dir} korrigiert.",
        "east": "Osten",
        "west": "Westen",
        "honest": "Norden = Handy-Kompass. Metall in der Nähe stört."
      },
      "red": "Rotlicht",
      "redTitle": "Die Seite rot färben, damit sich die Augen an die Dunkelheit gewöhnt halten",
      "honesty": "Sterne gemessen, Planeten berechnet, Luft modelliert, Land gezeichnet."
    }
  },
  "keyHint": {
    "title": "Steuerung",
    "titleTouch": "Gesten",
    "label": "Tasten, die die Ansicht bewegen",
    "labelTouch": "Gesten, die die Ansicht bewegen",
    "close": "Schließen",
    "closeTitle": "Schließen (Esc)",
    "does": {
      "turn": "Drehen",
      "zoom": "Näher, weiter weg",
      "pan": "Seitlich bewegen",
      "pick": "Ein Ding wählen",
      "search": "Suchen",
      "hide": "Alles ausblenden",
      "show": "Was zeigen",
      "share": "Teilen",
      "esc": "Schließen",
      "keys": "Alle Tasten",
      "tripPlay": "Abspielen, Pause",
      "tripStep": "Zurück, weiter",
      "tripCard": "Steckbrief ausblenden",
      "tripReplay": "Nochmal",
      "tripSound": "Ton",
      "tripLeave": "Verlassen"
    },
    "how": {
      "drag": "Ziehen",
      "wheel": "Scrollen",
      "pinch": "Zusammenziehen",
      "two": "Zwei Finger",
      "tap": "Tippen"
    },
    "caps": {
      "up": "↑",
      "left": "←",
      "down": "↓",
      "right": "→",
      "w": "W",
      "s": "S",
      "plus": "+",
      "minus": "−",
      "slash": "/",
      "pgUp": "Bild↑",
      "pgDn": "Bild↓",
      "h": "H",
      "l": "L",
      "p": "P",
      "esc": "Esc",
      "help": "?",
      "space": "Leertaste",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "Tastenkürzel",
    "tripTitle": "In einer Reise"
  },
  "render": {
    "eyebrow": "Space Radar · eine Reise",
    "site": "spaceradar.ai",
    "fly": "Selbst fliegen",
    "music": "Musik: John Bartmann, CC0. Alle Nachweise auf spaceradar.ai."
  },
  "glossary": {
    "title": "Wörter auf dieser Seite",
    "hint": "Tippe auf einen Begriff für einen einfachen Satz."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} ist ein Feuer, das bei der letzten Meldung am {date} hier war",
        "volcano": "{name} bricht seit dem {date} aus",
        "iceberg": "{name} war bei der letzten Meldung am {date} hier"
      },
      "size": "bei dieser Meldung etwa {n} km²"
    },
    "storm": {
      "lead": "{name} ist {a} {status}, dessen Zentrum {ago} hier war",
      "leadUnknown": "{name} ist ein tropischer Wirbelsturm, dessen Zentrum {ago} hier war",
      "leadBefore": "{name} ist {a} {status}, dessen Zentrum {ago} hier ankommt",
      "leadBeforeUnknown": "{name} ist ein tropischer Wirbelsturm, dessen Zentrum {ago} hier ankommt",
      "wind": "mit Winden bis zu {n} km/h auf seiner Bahn, Vorhersage eingerechnet",
      "statuses": {
        "hurricane": "Hurrikan",
        "typhoon": "Taifun",
        "cyclone": "tropischer Wirbelsturm",
        "storm": "tropischer Sturm",
        "depression": "tropisches Tief"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} ist ein Schwarzes Loch, {dist} Lichtjahre entfernt",
      "leadPulsar": "{name} ist ein Pulsar, {dist} Lichtjahre entfernt",
      "leadMagnetar": "{name} ist ein Magnetar, {dist} Lichtjahre entfernt",
      "leadQuasar": "{name} ist ein Quasar, {dist} Lichtjahre entfernt",
      "leadStar": "{name} ist ein Stern, {dist} Lichtjahre entfernt",
      "leadRange": "{name} ist {a} {kind}, irgendwo zwischen {lo} und {hi} Lichtjahren entfernt",
      "mass": "so schwer wie {n} Sonnen",
      "massRange": "so schwer wie {lo} bis {hi} Sonnen",
      "massMillions": "so schwer wie {n} Millionen Sonnen",
      "massBillions": "so schwer wie {n} Milliarden Sonnen",
      "spins": "dreht sich {n}-mal pro Sekunde",
      "spinsSlow": "dreht sich einmal alle {n} Sekunden",
      "kinds": {
        "blackhole": "Schwarzes Loch",
        "pulsar": "Pulsar",
        "magnetar": "Magnetar",
        "star": "Stern",
        "quasar": "Quasar"
      }
    },
    "dso": {
      "leadHome": "{name} ist die Galaxie, in der wir leben; ihr Zentrum ist {dist} Lichtjahre entfernt",
      "lead": "{name} ist {a} {type}, {dist} Lichtjahre entfernt",
      "leadRange": "{name} ist {a} {type}, irgendwo zwischen {lo} und {hi} Lichtjahren entfernt",
      "leadUntyped": "{name} ist {dist} Lichtjahre entfernt",
      "size": "etwa {n} Lichtjahre breit",
      "seenAs": "gesehen, wie es vor {n} Jahren war",
      "seenAsMillions": "gesehen, wie es vor {n} Millionen Jahren war",
      "constellation": "im Sternbild {con}",
      "kinds": {
        "galaxy": "Galaxie",
        "nebula": "Nebel",
        "cluster": "Sternhaufen",
        "other": "Deep-Sky-Objekt"
      }
    },
    "exoplanet": {
      "lead": "{name} ist ein Planet um den Stern {host}, {dist} Lichtjahre entfernt",
      "leadNoHost": "{name} ist ein Planet um einen anderen Stern, {dist} Lichtjahre entfernt",
      "size": "etwa {n}-mal so breit wie die Erde",
      "sizeSmaller": "etwa {n} der Breite der Erde",
      "mass": "{n}-mal die Masse der Erde",
      "year": "sein Jahr dauert {n} Tage",
      "yearHours": "sein Jahr dauert {n} Stunden",
      "found": "{year} mit der Methode „{method}“ entdeckt",
      "foundYear": "{year} entdeckt",
      "asOf": "aus einer Kopie des Katalogs, Stand {date}"
    },
    "star": {
      "lead": "{name} ist ein Stern, {dist} Lichtjahre entfernt",
      "leadColour": "{name} ist {a} {colour} Stern, {dist} Lichtjahre entfernt",
      "near": "einer der nächsten, die es gibt",
      "seenAs": "gesehen, wie er vor {n} Jahren war",
      "seenAsMonths": "gesehen, wie er vor {n} Monaten war",
      "luminosity": "{n}-mal so hell wie die Sonne",
      "dimmer": "mit {n} der Helligkeit der Sonne",
      "colours": {
        "O": "blauer",
        "B": "blauweißer",
        "A": "weißer",
        "F": "gelblich weißer",
        "G": "gelber",
        "K": "oranger",
        "M": "roter"
      }
    },
    "station": {
      "lead": "{name} ist eine bemannte Raumstation, die die Erde umkreist",
      "whyPass": "zieht um {time} über deinen Himmel",
      "crew": "mit {crew} Menschen an Bord",
      "altitude": "{alt} km hoch",
      "speed": "braucht für einen Umlauf {period} Minuten"
    },
    "satellite": {
      "lead": "{name} ist ein Satellit, der die Erde umkreist",
      "leadKind": "{name} ist {kind} im Orbit um die Erde",
      "leadDocked": "{name} ist {kind}, angedockt an {station}",
      "aSpacecraft": "ein Raumfahrzeug",
      "aTelescope": "ein Weltraumteleskop",
      "whyLaunchedDays": "vor {n} Tagen gestartet",
      "whyLaunchedYear": "{year} gestartet",
      "operator": "betrieben von {operator}",
      "purpose": "{purpose}",
      "altitude": "{alt} km hoch",
      "whyPass": "zieht um {time} über deinen Himmel"
    },
    "debris": {
      "lead": "{name} ist ein verfolgtes Trümmerstück",
      "origin": "übrig geblieben von {origin}",
      "brokeUp": "{year} in Stücke zerbrochen",
      "decay": "wird voraussichtlich etwa am {date} in die Atmosphäre zurückfallen",
      "altitude": "{alt} km hoch",
      "burnsUp": "fast alles davon verglüht auf dem Weg nach unten"
    },
    "rocket": {
      "lead": "{name} ist ein Raketenstart",
      "leadWithPad": "{name} ist ein Raketenstart von {pad}",
      "leadStage": "{name} ist eine ausgediente Raketenstufe, die die Erde umkreist",
      "stageLaunched": "{year} gestartet",
      "whyCountdown": "hebt {when} ab",
      "whyFlown": "{when} abgehoben",
      "destination": "unterwegs zu {destination}",
      "missionType": "eine Mission vom Typ {missionType}",
      "illustrative": "die hier gezeichnete Bahn ist eine Skizze des Aufstiegs, keine gemessene Bahn"
    },
    "probe": {
      "lead": "{name} ist ein Raumfahrzeug draußen im Sonnensystem",
      "leadOrbits": "{name} ist ein Raumfahrzeug im Orbit, Bahnzentrum: {world}",
      "destination": "unterwegs zu {destination}",
      "lightTime": "so weit weg, dass eine Funknachricht {mins} Minuten pro Richtung braucht",
      "lightTimeSeconds": "so nah, dass eine Funknachricht {secs} Sekunden pro Richtung braucht",
      "lightTimeHours": "so weit weg, dass eine Funknachricht {hours} Stunden pro Richtung braucht",
      "distanceSun": "{au} Astronomische Einheiten von der Sonne entfernt",
      "milestone": "als Nächstes: {milestone} am {date}"
    },
    "telescope": {
      "lead": "{name} ist ein Weltraumteleskop",
      "observing": "diese Woche auf {target} gerichtet",
      "station": "geparkt bei {station}",
      "altitude": "{alt} km hoch",
      "sees": "beobachtet im Bereich: {band}"
    },
    "asteroid": {
      "lead": "{name} ist ein erdnahes Objekt auf seiner eigenen Bahn um die Sonne",
      "leadMainBelt": "{name} ist ein Asteroid im Hauptgürtel, zwischen Mars und Jupiter",
      "leadBeyond": "{name} ist ein kleiner Körper jenseits des Neptun auf einer eigenen Bahn um die Sonne", // 0079 B1
      "leadDwarf": "{name} ist ein Zwergplanet auf seiner eigenen Bahn um die Sonne",
      "leadDwarfBelt": "{name} ist ein Zwergplanet im Asteroidengürtel, zwischen Mars und Jupiter",
      "leadDwarfBeyond": "{name} ist ein Zwergplanet jenseits des Neptun",
      "leadDwarfFarBeyond": "{name} ist ein Zwergplanet weit jenseits des Neptun",
      "leadInterstellarOut": "{name} kam von einem anderen Stern und verlässt gerade das Sonnensystem",
      "leadInterstellarIn": "{name} kam von einem anderen Stern und fällt auf die Sonne zu",
      "distanceSun": "{au} Astronomische Einheiten von der Sonne entfernt",
      "whyApproach": "zieht am {date} an der Erde vorbei, {ld}× so weit weg wie der Mond",
      "size": "{size}",
      "willNotHit": "es wird die Erde nicht treffen"
    },
    "comet": {
      "lead": "{name} ist ein Komet auf einer langen Schleife um die Sonne",
      "leadPeriodic": "{name} ist ein Komet, der alle {n} Jahre um die Sonne kommt",
      "leadInterstellarOut": "{name} ist ein Komet von einem anderen Stern, auf dem Weg hinaus aus dem Sonnensystem",
      "leadInterstellarIn": "{name} ist ein Komet von einem anderen Stern, der auf die Sonne zufällt",
      "whyPerihelion": "der Sonne am nächsten am {date}",
      "nakedEye": "hell genug, um ihn ohne Teleskop zu finden",
      "faint": "zu schwach, um ihn ohne Teleskop zu sehen",
      "distanceSun": "{au} Astronomische Einheiten entfernt"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} ist eines der seltsamen Dinge, die Menschen von unserem Planeten fortgeschickt haben"
    },
    "site": {
      "lead": "{name} ist ein Ort am Boden, der mit Raumfahrzeugen arbeitet",
      "leadKind": "{name} ist {a} {kind}",
      "where": "gelegen in {where}",
      "whyDsn": "spricht gerade mit {spacecraft}",
      "whyLaunch": "{launch} startet {when}",
      "kinds": {
        "pad": "Startrampe",
        "dish": "Radioantenne",
        "observatory": "Sternwarte",
        "tracking": "Bodenstation"
      }
    },
    "world": {
      "lead": "{name} ist eine Welt im Sonnensystem",
      "leadMoon": "{name} ist der Mond der Erde",
      "leadSun": "{name} ist der Stern im Zentrum des Sonnensystems",
      "distanceKm": "{n} km entfernt",
      "whyPhase": "heute Nacht: {phase}",
      "whyRise": "geht an deinem Ort um {time} auf",
      "distance": "{distance}",
      "diameter": "etwa {n} km Durchmesser",
      "leadWhat": "{name} ist {what}",
      "what": {
        "pluto": "ein Zwergplanet jenseits des Neptun, bis 2006 als neunter Planet gezählt",
        "io": "einer der vier großen Jupitermonde und die vulkanisch aktivste Welt im Sonnensystem",
        "europa": "einer der vier großen Jupitermonde, mit einem Salzwasserozean unter seinem Eis",
        "ganymede": "der größte Mond des Jupiter und der größte im Sonnensystem, größer als der Merkur",
        "callisto": "einer der vier großen Jupitermonde und das am stärksten verkraterte Objekt im Sonnensystem",
        "titan": "der größte Mond des Saturn, unter dichtem orangefarbenem Dunst, mit Methanseen; Huygens landete dort 2005",
        "enceladus": "ein kleiner Eismond des Saturn, dessen Geysire den Ozean unter seinem Eis ins All sprühen",
        "triton": "der größte Mond des Neptun; er läuft rückwärts und ist wahrscheinlich ein eingefangenes Objekt aus dem Kuipergürtel",
        "charon": "der größte Mond des Pluto, halb so groß wie Pluto; die beiden zeigen einander immer dieselbe Seite",
        "phobos": "der größere der beiden Marsmonde, ein klumpiger Felsbrocken, der pro Jahrhundert 1,8 m näher an den Mars heranspiralt",
        "deimos": "der kleinere der beiden Marsmonde, ein kleiner klumpiger Felsbrocken voller Krater",
        "mimas": "der innerste runde Mond des Saturn, gezeichnet von einem Krater, der ein Drittel so breit ist wie der Mond selbst",
        "tethys": "der fünftgrößte Mond des Saturn, fast reines Wassereis, gespalten von einem Graben und einem riesigen Krater",
        "dione": "ein Eismond des Saturn, dessen nachlaufende Seite von einem Netz heller Eisklippen durchzogen ist",
        "rhea": "der zweitgrößte Mond des Saturn, ein gefrorener schmutziger Schneeball aus Eis und Gestein",
        "iapetus": "der drittgrößte Mond des Saturn: eine Seite so dunkel wie Kohle, die andere zehnmal heller",
        "miranda": "der kleinste der fünf großen Uranusmonde, mit Schluchten, die bis zu zwölfmal so tief sind wie der Grand Canyon",
        "ariel": "der hellste und jüngste aussehende der fünf großen Uranusmonde, von Verwerfungstälern durchzogen",
        "umbriel": "der dunkelste der großen Uranusmonde, der etwa ein Fünftel des Lichts zurückwirft, das ihn erreicht",
        "titania": "der größte Mond des Uranus, neutralgrau, von Verwerfungstälern gespalten, die fast 1 600 km lang sind",
        "oberon": "der zweitgrößte Mond des Uranus, dunkel, verkratert, mit einem 6 km hohen Berg"
      }
    }
  },
  "live": {
    "label": "Von der Erde, jetzt",
    "km": "km",
    "light": "Das Licht braucht",
    "lightYears": "Lichtjahre",
    "noteFar": "Berechnet aus der gezeichneten Position, auf drei Stellen genau. Sie tickt nicht.",
    "note": "Berechnet aus der gezeichneten Bahn. Die letzten Ziffern zeigen, dass es sich bewegt, nicht seinen Ort auf den Kilometer genau.",
    "seconds": "{s} s",
    "minSec": "{min} Min. {s} s",
    "hourMinSec": "{h} Std. {min} Min. {s} s",
    "sparkLabel": "Entfernung von der Erde",
    "sparkAria": "Entfernung von der Erde von {from} bis {to}. {closest}",
    "sparkNow": "jetzt",
    "closest": "Am nächsten: {date} · {dist}",
    "closestAbout": "Am nächsten: etwa {date} · {dist}",
    "months": [
      "Jan.",
      "Feb.",
      "März",
      "Apr.",
      "Mai",
      "Juni",
      "Juli",
      "Aug.",
      "Sept.",
      "Okt.",
      "Nov.",
      "Dez."
    ],
    "shortDate": "{day}. {month} {year}",
    "closestTitle": "Die Uhr auf diese größte Annäherung stellen",
    "moonDistances": "{n} Mondentfernungen",
    "au": "{n} AE",
    "sparkNote": "Berechnet aus der gezeichneten Bahn, ein Punkt alle sechs Tage.",
    "sparkApprox": "So nah sind Datum und Entfernung nur ungefähr: Die Anziehung der Erde ist weggelassen.",
    "upYears": "Seit {n} Jahren oben: gestartet {date}",
    "upOneYear": "Seit 1 Jahr oben: gestartet {date}",
    "upUnderAYear": "Seit weniger als einem Jahr oben: gestartet {date}",
    "upSinceYear": "Gestartet {year}: seit etwa {n} Jahren oben",
    "upSinceYearNew": "Gestartet {year}",
    "smallBodyHonest": "Aus seiner Bahn für einen Horizont auf Meereshöhe berechnet. Am Himmel zu stehen heißt nicht, hell genug zum Sehen zu sein: Die meisten brauchen ein Teleskop."
  },
  "crew": {
    "label": "Menschen an Bord",
    "count": "{n} Menschen an Bord",
    "countOne": "1 Mensch an Bord",
    "hint": "{n} an Bord",
    "person": "{agency} · Tage im All: {days}",
    "personNoAgency": "Tage im All: {days}",
    "dockedLabel": "Jetzt angedockt, und seit wann",
    "docked": "{port} · {date}",
    "asOf": "Gelesen {age} von Launch Library 2 (The Space Devs).",
    "stale": "Gelesen am {date}: mehr als zwei Tage alt, es kann sich also etwas geändert haben.",
    "joined": "Die Namen sind die Besatzungen der Fahrzeuge, die jetzt angedockt sind.",
    "unmatched": "Die gespeicherten Namen passten nicht zu dieser Zahl, deshalb werden keine gezeigt.",
    "waiting": "Die Besatzungsliste wird gelesen.",
    "none": "Keine Besatzungsliste für diese Station."
  },
  "happened7": {
    "launchesFrom": "von {place}",
    "reached": "erreichte den Orbit",
    "failed": "erreichte den Orbit nicht",
    "partial": "erreichte einen Orbit, aber nicht den geplanten",
    "launchDetail": "{rocket}: {status}, {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "Wieder eingetreten am {date} (Verfallsdatum laut Katalog)",
    "debris": "und {n} Trümmerstücke",
    "debrisOne": "und 1 Trümmerstück",
    "showAll": "Alle {n} zeigen",
    "showFewer": "Weniger zeigen",
    "asOf": "Starts gelesen {age} von Launch Library 2.",
    "stale": "Starts gelesen am {date}: mehr als zwei Tage alt.",
    "none": "Für die letzten sieben Tage ist nichts verzeichnet.",
    "waiting": "Es wird gelesen, was passiert ist.",
    "decays": "Was zurückgekommen ist",
    "decaysTitle": "Liest den ganzen Katalog, etwa 1,5 MB",
    "decaysNone": "In den letzten sieben Tagen ist nichts Ganzes zurückgekommen.",
    "decaysFailed": "Der Katalog ließ sich nicht lesen.",
    "flyTitle": "Dorthin fliegen, wo es gestartet ist",
    "ago": "{age}"
  },
  "oldest": {
    "label": "Am längsten oben",
    "row": "{years} Jahre · gestartet {date}",
    "note": "Nutzlasten und Raketenkörper, die noch im Orbit sind, nach Startdatum im Katalog.",
    "showTitle": "Auf der Karte zeigen"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "Öffnet die eigene Seite von {publisher} in einem neuen Tab"
  },
  "placeKeep": {
    "group": "Wo du bist",
    "change": "Ort ändern",
    "changeTitle": "Eine Stadt oder der Ort, den der Browser für dich angibt",
    "remember": "Diesen Ort merken",
    "rememberTitle": "Speichert ihn nur in diesem Browser, auf 0,1° genau",
    "forget": "Diesen Ort vergessen",
    "forgetTitle": "Entfernt den in diesem Browser gespeicherten Ort",
    "kept": "Nur in diesem Browser gespeichert.",
    "share": "Diesen Ort teilen",
    "shareTitle": "Kopiert einen Link, der diesen Ort auf 0,1° genau enthält",
    "copied": "Link kopiert. Er enthält diesen Ort auf 0,1° genau.",
    "copyFailed": "Der Link ließ sich nicht kopieren."
  },
  "scale": {
    "least": "Planeten mindestens ×{n} größer gezeichnet",
    "one": "{name} ×{n} größer gezeichnet",
    "title": "Die Punkte sind breiter als die Planeten. Drücken für die wahre Größe.",
    "trueLine": "Wahre Größe: {name} ist hier {px} px breit",
    "trueTitle": "Der breiteste Planet, ohne die Punkte. Drücken, um sie wieder zu zeichnen."
  },
  "launchChip": {
    "opens": "drücken für den Steckbrief",
    "train": "Neuer Starlink-Zug aus {n}: über dir {when}"
  },
  "welcome": {
    "label": "Erster Besuch",
    "title": "Zum ersten Mal hier",
    "dots": "Jeder Punkt ist echt. Drücke auf einen.",
    "move": "Ziehen dreht, Scrollen zoomt heran.",
    "moveTouch": "Ziehen dreht, zwei Finger zoomen.",
    "trips": "Geführte Reise: Geschichte in Minuten.",
    "trip": "Geführte Reise",
    "tripTitle": "Startet die erste Reise auf der Liste",
    "look": "Umsehen",
    "lookTitle": "Räumt diese Zeilen weg"
  },
  "opening": {
    "label": "Eröffnung",
    "from": "Von {source}",
    "wait": "Die Reise wird vorbereitet",
    "skip": "Eine beliebige Taste oder ein Druck überspringt das"
  },
  "base": {
    "label": "Zurück zur Basis",
    "title": "Zurück zur Basis: die Erde, jetzt, nichts ausgewählt",
    "name": "Basis",
    "trip": "Die Reise verlassen und zur Basis zurückkehren"
  },
  "exoface": {
    "tag": "Künstlerische Darstellung",
    "measured": "Gemessen: {parts}.",
    "estimated": "Geschätzt: {parts}.",
    "least": "Mindestens {n} Erdmassen.",
    "radius": "{n} Erdradien",
    "mass": "{n} Erdmassen",
    "a": "ein",
    "an": "ein",
    "yearHours": "{a} {n}-Stunden-Jahr",
    "yearDays": "{a} {n}-Tage-Jahr",
    "yearYears": "ein Umlauf von {n} Jahren",
    "join": ", ",
    "missing": "—",
    "surface": "Die Oberfläche ist ausgedacht.",
    "clouds": "Die Wolkenobergrenzen sind ausgedacht.",
    "nothingMeasured": "Hier ist nichts gemessen.",
    "whole": "Die ganze Welt ist ausgedacht.",
    "imaginedName": "Eine ausgedachte Welt Nr. {n}",
    "another": "Eine andere Welt",
    "back": "Zurück zur Karte",
    "stageLabel": "Eine ausgedachte Welt",
    "why": "Gezeichnet als {cls}, {climate}: berechnet, nicht gesehen.",
    "whyGiant": "Gezeichnet als {cls}: aus seiner Größe berechnet, nicht gesehen.",
    "cls": {
      "rock": "eine Gesteinswelt",
      "superEarth": "eine Supererde",
      "water": "eine Wasserwelt",
      "miniNeptune": "ein Mini-Neptun",
      "iceGiant": "ein Eisriese",
      "gasGiant": "ein Gasriese"
    },
    "climate": {
      "lava": "unter seinem Stern geschmolzen",
      "desert": "heiß und trocken",
      "temperate": "mild genug für Meere",
      "snowball": "ganz zugefroren",
      "eyeball": "eine Seite immer seinem Stern zugewandt"
    }
  },
  "deep": {
    "inside": "Im Inneren von {parent}",
    "companion": "Ein Begleiter von {parent}",
    "kinds": {
      "HII": "Emissionsnebel",
      "PN": "planetarischer Nebel",
      "SNR": "Supernova-Überrest",
      "RfN": "Reflexionsnebel",
      "DrkN": "Dunkelnebel",
      "GCl": "Kugelsternhaufen"
    },
    "back": "Zurück zu {parent}",
    "backTitle": "Hinaus zu {parent}, das es umgibt, fliegen"
  },
  "deepHelix": {
    "card": {
      "helix": "Sein Licht stammt vom Foto der ESO, seine Form von O’Dell, McCullough und Meixner (2004): eine innere Scheibe, um 23° geneigt, und ein äußerer Ring, um 53° geneigt. Die Knoten sind in ihren gemessenen Entfernungen platziert. Noch nicht von einem Astronomen geprüft."
    },
    "how": "Hubble und Teleskope am Boden zeigen zwei Ellipsen, 499″ mal 459″ und 742″ mal 446″. Als schräg gesehene Kreise gelesen, sind es zwei Ringe, um 23° und 53° geneigt, und die Geschwindigkeiten der Knoten auf uns zu und von uns weg sagen, welche Seite jedes Rings näher ist (O’Dell, McCullough und Meixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "Dieses Modell ist aus seinem Foto und Gaias Zählungen seiner eigenen Sterne gebaut, geneigt, wie gemessen."
    },
    "rows": {
      "dso-lmc": [
        [
          "Tiefe seiner Sterne",
          "Nicht Stern für Stern gemessen: Bei dieser Entfernung ist die Parallaxe eines Sterns zu klein. Das Modell verteilt seine Sterne über die bekannte Dicke der Scheibe."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "Tiefe in der LMC",
          "Nicht gemessen: Er ist in der Entfernung der LMC in seiner eigenen Richtung gezeichnet. Auf der geneigten Scheibe kann er etwa 2 000 Lichtjahre näher liegen."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "Der Rand des beobachtbaren Universums",
    "horizonNow": "Jetzt etwa {n} Milliarden Lichtjahre entfernt",
    "horizonWhy": "Sein Licht brach vor {age} Milliarden Jahren auf; der Raum hat sich seither gedehnt",
    "edge": "{n} Milliarden Lichtjahre: jenseits von allem, was wir sehen können",
    "edgeWhy": "Das beobachtbare Universum endet etwa {h} Milliarden Lichtjahre entfernt.",
    "edgeNothing": "Hier draußen liegt nichts Gemessenes: Dieses Band ist eine Illustration.",
    "cmbTitle": "Das älteste Licht, wie unser Himmel es zeigt",
    "cmbWhen": "Es brach etwa {k} Jahre nach dem Urknall auf",
    "cmbPainted": "Innen auf die Kugel gemalt, von der es ausging: eine Illustration",
    "cmbElse": "Von irgendwo sonst gesehen, sieht die Karte anders aus",
    "cmbCold": "−{n} µK",
    "cmbMid": "Mittel {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "Farbskala: Blau bis zu {n} Millionstel Grad kälter als {t} Kelvin, Orange bis zu {n} wärmer",
    "cmbSource": "WMAP-Karte nach neun Jahren, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "Sein Licht stammt vom Foto der ESO, seine Form ist nach Wen und O’Dell (1995) und O’Dell (2001) rekonstruiert: eine dünne leuchtende Schicht auf der nahen Seite einer dunklen Wolke, das Trapez etwa 0,2 Parsec davor. Noch nicht von einem Astronomen geprüft."
    },
    "rows": {
      "dso-m42": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert. Nahe dem Trapez ist sie gemessen: Die leuchtende Schicht liegt etwa 0,2 Parsec hinter seinem hellsten Stern. Weiter draußen folgt die Tiefe dem veröffentlichten Bild einer Schale, die sich zu uns hin öffnet, nicht einer Messung."
        ],
        [
          "Dahinter",
          "Die dunkle Molekülwolke, aus der der Nebel herausgeschnitten ist. Von hinten gesehen, ist der Nebel in ihr verborgen."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-m43": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert: eine kleinere Mulde in derselben Wolke, beleuchtet vom Stern NU Orionis. Ihre Tiefe ist nicht gemessen."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ]
    },
    "how": "Das Leuchten des Nebels kommt von einer dünnen Schicht, wo sich das Licht des hellsten Sterns des Trapezes in eine dunkle Wolke frisst. Wen und O’Dell (1995) haben aus ihrer Helligkeit kartiert, wie weit diese Schicht hinter dem Stern liegt, denn ein näherer Fleck von ihr bekommt mehr Licht."
  },
  "r12Truth": {
    "here": "Auf diesem Steckbrief",
    "words": "Die Wörter, überall",
    "terms": "Wörter auf diesem Steckbrief",
    "rows": {
      "where": "Wo es ist",
      "drawnNow": "Jetzt gezeichnet",
      "drawn": "Was gezeichnet ist",
      "photo": "Foto von",
      "filters": "Filter",
      "colours": "Farben",
      "taken": "Aufgenommen",
      "released": "Veröffentlicht",
      "sky": "Gezeigter Himmel",
      "survey": "Durchmusterung von",
      "look": "Aussehen"
    },
    "span": "{a} bis {b}",
    "notPublished": "Datum nicht veröffentlicht",
    "position": {
      "measured": "Von einem Instrument zu einer bekannten Zeit gesehen",
      "inferred": "Von einer älteren Messung weitergerechnet",
      "illustrative": "Gezeichnet, um die Idee zu zeigen, nicht gemessen",
      "sample": "Mitgelieferte Stichprobendaten, nicht live"
    },
    "drawn": {
      "photograph": "Echtes Licht, von unserer Seite aus fotografiert",
      "reconstruction": "Eine 3D-Form aus einer veröffentlichten Studie",
      "model": "Ein Modell seiner Art, nicht seine eigenen Sterne",
      "catalogue": "Positionen, die eine Durchmusterung gemessen hat",
      "illustration": "Gezeichnet, um seine Art zu zeigen, nicht es selbst"
    },
    "colours": {
      "broadband": "Breite Farbfilter",
      "mixed": "Farbfilter und Wasserstoff",
      "narrowband": "Gase auf Farben abgebildet",
      "unstated": "Nicht angegeben"
    },
    "falseColour": "{band}, Falschfarben",
    "glossary": [
      {
        "term": "Parsec",
        "match": [
          "kpc"
        ],
        "say": "Etwa 3,26 Lichtjahre: die Entfernung, aus der die Erdbahn eine Bogensekunde breit erschiene. In Fachtexten steht pc, und kpc für tausend."
      },
      {
        "term": "Millionen Lichtjahre",
        "match": [
          "Millionen Jahren"
        ],
        "say": "Eine Million Lichtjahre, geschrieben Mly. Andromeda, die nächste große Galaxie, ist etwa 2,5 Millionen entfernt."
      },
      {
        "term": "Milliarden Lichtjahre",
        "match": [
          "Milliarden Jahren"
        ],
        "say": "Tausend Millionen Lichtjahre, geschrieben Gly. Der Rand dessen, was wir sehen können, ist jetzt etwa 46 Milliarden Lichtjahre entfernt."
      },
      {
        "term": "Lichtlaufzeit",
        "match": [
          "Licht startete"
        ],
        "say": "Wie lange das Licht, das wir sehen, schon unterwegs ist. Bei fernen Galaxien sind es Milliarden Jahre: Wir sehen sie, wie sie damals waren."
      },
      {
        "term": "mitbewegte Entfernung",
        "match": [
          "mitbewegt",
          "Milliarden Lichtjahre"
        ],
        "say": "Wie weit etwas jetzt entfernt ist, wenn man mitzählt, wie sehr sich der Raum gedehnt hat, seit sein Licht aufbrach. Weit draußen ist es mehr, als die Laufzeit des Lichts vermuten lässt."
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "{mode} Aussehen"
  },
  "r12Sun": {
    "image": "Die der Erde zugewandte Hälfte der Sonne ist das Bild des Solar Dynamics Observatory von {time} UTC am {date}, seither mit der Sonne weitergedreht: extremes ultraviolettes Licht bei {wl} Ångström von Gas nahe einer Million Grad in den Schleifen über der Oberfläche, in den Falschfarben von SDO und heller gezeichnet. Die Rückseite, die es nicht sah, ist nach einem Modell in denselben Falschfarben gezeichnet, und beide sind dort ineinander überblendet, wo sie sich treffen. Es ist ein Übersichtsbild, keines für die Wissenschaft. Mit freundlicher Genehmigung von NASA/SDO und den Wissenschaftsteams von AIA, EVE und HMI.",
    "loops": "Die goldenen Schleifen über {n} der heutigen aktiven Regionen sind illustrativ: Ihre Orte stammen von der NOAA, ihre Formen, Höhen und ihre Zahl nicht. Unter „Gemessen“ sind sie abgeschaltet.",
    "loopsOne": "Die goldenen Schleifen über einer der heutigen aktiven Regionen sind illustrativ: Der Ort stammt von der NOAA, die Formen, Höhen und die Zahl nicht. Unter „Gemessen“ sind sie abgeschaltet.",
    "none": "Es ließ sich kein Bild der heutigen Sonne lesen, deshalb ist die ganze Scheibe gezeichnet."
  },
  "r12Nearby": {
    "castShadows": "Seine Schatten werden von den eigenen Höhen des Bodens geworfen, aus {title}, dort, wo die Sonne jetzt steht, und im wahren Maßstab: gemessen, im besten Fall eine Höhe alle 670 m, deshalb wirft ein Krater unter etwa zwei Kilometern keinen.",
    "sunriseModelled": "Seine Farbe bei Sonnenauf- und Sonnenuntergang ist modelliert: Sonnenlicht, von der Luft gerötet, die es streifte, nur Rayleigh-Streuung."
  },
  "r12Giants": {
    "spot": "Bis auf einen: Der Große Rote Fleck liegt bei {l2}° Länge im System II, fortgeschrieben von dort, wo ihn das JUPOS-Team und die British Astronomical Association am {date} gemessen haben ({at}°), mit {rate}° pro Monat, der Mitte der beiden Driften, die sie in jenem Jahr gemessen haben ({lo} und {hi}), sodass er jetzt etwa {pm}° nach beiden Seiten abweichen kann. Die Karte ist so gedreht, dass er dort liegt, und ihre anderen Wolken drehen sich mit.",
    "rings": {
      "uranus": "seine Ringe liegen in ihren gemessenen Abständen und sind so dunkel, wie sie sind: Ihre Teilchen werfen etwa 1,5 % des Lichts zurück, ein Dreißigstel dessen, was seine Wolken tun, vor dem Planeten sind sie also dunkle Fäden; sie sind 10-mal breiter gezeichnet, als sie sind, damit man sie sieht, und die Belichtung „Tief“ hebt sie um das 4-Fache an, wie es eine Langzeitbelichtung tut",
      "jupiter": "sein schwacher Ring liegt in den Entfernungen und mit den optischen Dicken, die das Datenblatt der NASA angibt: der Halo und der Hauptring, Staub und dunkle Körner, die einige Millionstel des Lichts aufhalten; die zwei schwächeren Gossamer-Ringe dahinter sind nicht gezeichnet. Von der Seite der Sonne aus ist er fast nichts; mit der Sonne dahinter wirft der Staub Licht nach vorn, und er zeigt sich, wie er sich Galileo und New Horizons von der Nachtseite aus zeigte. Um überhaupt zu erscheinen, ist er unter der Belichtung „Kamera“ 8 000-mal heller gezeichnet, als er ist, und 40 000-mal unter „Tief“; unter „Auge“ ist er nicht gezeichnet, so würde er auch aussehen, und ebenso wenig in der niedrigsten Qualität. Der Halo ist etwa 10 000 km dick und flach gezeichnet, nicht heller, als seine Dicke es erlaubt; wie der Halo nach innen verblasst und der Hauptring zu seinem scharfen Außenrand hin dichter wird, wie viel vom Licht vom Staub kommt, wie weit er es nach vorn wirft, die rötliche Farbe des Rings und die größte gezeichnete Helligkeit sind illustrativ"
    }
  },
  "r12Plumes": {
    "line": "Fontänen so gezeichnet, wie sie gesehen wurden: {list}.",
    "item": "{name}, etwa {km} km hoch ({by}, {when})",
    "jets": "die Jets der vier Tigerstreifen, mindestens {km} km hoch ({by}, {when})",
    "truth": "Ihre Orte und Höhen sind gemessen; die Bögen der Körner sind ein Modell, und ihr Licht ist gedehnt, damit man sie sehen kann. Sie brechen jetzt vielleicht nicht aus.",
    "stripes": "Die Streifen sind gerade nach den Mittelpunkten und Längen des Ortsverzeichnisses gezeichnet, und die Orte der 101 Jets entlang von ihnen sind ein Modell.",
    "column": "Es sind dunkle Säulen, die der Wind an ihren Spitzen nach Westen getragen hat; wie breit eine Säule ist, ist nicht bekannt und schmal gezeichnet.",
    "hot": "Die orangefarbenen Punkte auf der Nachtseite sind heiße Stellen, an denen Lava glüht ({list}): Ihre Orte sind gemessen, ihre Helligkeit nicht.",
    "film": "Unter „Film“ fliegen die Körner ihre Bögen {k}-mal schneller als die Uhr.",
    "still": "Sie stehen still, wie unter „Gemessen“ oder bei verringerter Bewegung.",
    "review": "Noch nicht von einem Astronomen geprüft.",
    "span": "{a} bis {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "Seine Sterne",
      "lightLabel": "Ihr Licht",
      "depthLabel": "Ihre Tiefe",
      "reviewLabel": "Prüfung",
      "globularStars": "Ein Modell seiner Art, nicht seine eigenen Sterne: {n} Sterne heller als der Abknickpunkt, nach dem Profil von King mit dem Kernradius von Harris ({rc} Lichtjahre) und dem Gezeitenradius ({rt}) platziert. Ihre Zahl, Helligkeit und Farben sind ein Modell.",
      "globularLight": "Zusammen etwa {pct} % des Lichts des Haufens (absolute Helligkeit {mv}); die schwachen Sterne, für die kein Punkt steht, sind das Leuchten. Bis zur Größenklasse 10 gezeichnet, wie es die Belichtung einer Kamera zeigt.",
      "openStars": "{n} Mitglieder aus Gaia (Hunt und Reffert 2023, {name}), jedes mit einer Zugehörigkeitswahrscheinlichkeit von mindestens {p}, innerhalb seines Gezeitenradius. Bis zur Größenklasse 10 gezeichnet, wie es die Belichtung einer Kamera zeigt.",
      "openStarsHyg": "{n} Mitglieder aus Gaia (Hunt und Reffert 2023, {name}), jedes mit einer Zugehörigkeitswahrscheinlichkeit von mindestens {p}, innerhalb seines Gezeitenradius; {h} hellere sind die Katalogsterne der Karte selbst. Bis zur Größenklasse 10 gezeichnet, wie es die Belichtung einer Kamera zeigt.",
      "openDepthSome": "{m} sind nach ihrer eigenen Parallaxe platziert; die anderen {k} in der Entfernung des Haufens, ihre Tiefe darin modelliert.",
      "openDepthNone": "Ihre Richtungen sind gemessen; ihre Tiefe im Haufen ist modelliert, denn bei dieser Entfernung ist die Parallaxe eines einzelnen Sterns nicht genau genug.",
      "review": "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "ein heller Punkt dort, wo seine Rotverschiebung ihn hinsetzt, mit einem Ring, der die Stelle markiert; seine Scheibe und sein Jet sind viel zu klein zum Zeichnen",
      "host": "Seine Wirtsgalaxie ist schwach und rund gezeichnet, in der Winkelgröße, die die Quelle angibt, {size} Bogensekunden breit von hier aus gesehen; in Wahrheit sind das etwa {ly} Lichtjahre. Ihre Abplattung und ihre Neigung sind nicht gezeichnet.",
      "point": "Die Quelle gibt keine Größe für seine Wirtsgalaxie an, deshalb ist keine gezeichnet."
    },
    "cluster": {
      "members": "{n} Mitgliedsgalaxien aus {catalogue}; {own} davon stehen in Entfernungen, die einzeln gemessen wurden.",
      "membersNoOwn": "{n} Mitgliedsgalaxien aus {catalogue}.",
      "distanceSbf": "Der Haufen ist {mpc} Megaparsec ({mly} Millionen Lichtjahre) entfernt, ein Mittel aus Entfernungen, die aus Schwankungen der Flächenhelligkeit gefunden wurden.",
      "distanceZ": "Der Haufen ist {mly} Millionen Lichtjahre entfernt: die mittlere Rotverschiebung seiner Mitglieder ({z}), umgerechnet in eine mitbewegte Entfernung in der einen Kosmologie der Karte.",
      "depthMeasured": "Eine Galaxie ohne eigene Entfernung ist in der Tiefe um die gemessene Streuung des Haufens verteilt, {rms} Megaparsec; diese Platzierung ist ein Modell.",
      "depthModelled": "Keine Galaxie hat hier eine eigene Entfernung, deshalb sind sie in der Tiefe so weit verteilt wie am Himmel, als wäre der Haufen rund; diese Platzierung ist ein Modell.",
      "size": "Jede Galaxie ist so breit, wie ihr Halblichtradius im Katalog sagt, gezeichnet als runde, in der Mitte helle Form; ihre Abplattung und ihre Neigung sind nicht gezeichnet."
    }
  },
  "deepRing": {
    "card": {
      "m27": "Sein Licht stammt aus dem Foto von NOIRLab, in den eigenen Farbtönen seiner Gase; seine Form ist eine Rekonstruktion: die helle Taille ein dicker Ring, fast von der Kante gesehen, die blasseren „Ohren“ seine Keulen, nach den Geschwindigkeiten seiner Schalen, die Meaburn und andere (2005) gemessen haben. Noch nicht von einem Astronomen geprüft.",
      "southern-ring": "Sein Licht stammt aus dem Infrarotfoto von Webb; seine Form folgt Kastner und anderen (2024) und De Marco und anderen (2022): ein Ring, fast entlang seiner Achse gesehen, eine Blase durch ihn hindurch und ein molekularer Halo um beide. Noch nicht von einem Astronomen geprüft.",
      "m57": "Sein Licht stammt vom Foto von Hubble, seine Form von O’Dell, Ferland, Henney und Peimbert (2013): ein dicker Ring, um 13,5° geneigt, fast entlang seiner Achse gesehen, das bläulichere Gas seiner Mitte so gezeichnet, dass es auf uns zu und von uns weg reicht. Seine Farben sind die des Fotos, durch schmale Filter aufgenommen. Noch nicht von einem Astronomen geprüft."
    },
    "rows": {
      "dso-m27": [["Seine Form in der Tiefe", "Rekonstruiert. Größe, Winkel am Himmel und die Geschwindigkeiten der Schalen sind gemessen; dass die Taille ein Ring fast von der Kante ist und wie die „Ohren“ zu uns hin und von uns weg reichen, ist die übliche Deutung eines Nebels dieses Aussehens, als Illustration gezeichnet."], ["Seine Farben", "Die eigenen Farbtöne seiner Gase, aus den schmalen Filtern des Fotos: Sauerstoff blaugrün, Wasserstoff und Schwefel rot. Wie stark jedes gezeigt wird, haben wir gewählt."], ["Prüfung", "Dieses Modell wurde noch nicht von einem Astronomen geprüft."]],
      "dso-southern-ring-nebula": [["Seine Form in der Tiefe", "Rekonstruiert. Dass sein heller Ring 15–30° von seiner Achse gesehen wird, ist gemessen (Kastner und andere, 2024); welche Seite näher ist, die Dicke des Rings und die Länge der Blase sind illustrativ."], ["Seine Farben", "Infrarotlicht, das kein Auge sieht, von den Bildmachern des Webb-Teleskops eingefärbt."], ["Prüfung", "Dieses Modell wurde noch nicht von einem Astronomen geprüft."]],
      "dso-m57": [
        [
          "Seine Entfernung",
          "Parallaxe (Gaia DR3) seines Zentralsterns, Gaia DR3 2090486618786534784: 1,270 ± 0,044 Millibogensekunden, etwa 2 570 Lichtjahre (2 480 bis 2 660)."
        ],
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert. Die Größe des Rings am Himmel, die Neigung seiner langen Achse und welches Ende näher liegt, sind gemessen. Seine Dicke und die Form des Gases durch seine Mitte sind es nicht: Sie sind als Illustration gezeichnet."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ]
    },
    "how": "Hubbles Bilder in einzelnen Lichtfarben, mit den gemessenen Geschwindigkeiten des Gases quer durch den Nebel, zeigen einen dicken Ring fast von oben: Seine lange Achse ist um 13,5° geneigt, sein nordöstliches Ende uns näher. Schnelleres Gas füllt seine Mitte und reicht auf uns zu und von uns weg entlang unserer Blickrichtung (O’Dell, Ferland, Henney und Peimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "m45": "Sein Licht ist das Foto von NOIRLab: eine Staubwolke, die durch den Haufen zieht, knapp vor seinen Sternen, und deren blaues Licht streut (Ritchey und andere, 2006). Seine Tiefe ist rekonstruiert. Noch nicht von einem Astronomen geprüft.",
      "crab": "Sein Licht stammt vom Foto von Hubble, in Falschfarben, getragen von einer Schale, deren Form Martin, Milisavljevic und Drissen (2021) folgt: ein Filamentkäfig von etwa 4 Parsec Länge um eine leere Mitte. Noch nicht von einem Astronomen geprüft.",
      "veil": "Sein Licht stammt vom Foto von NOIRLab, in Falschfarben, getragen von einer dünnen Kugel von 37 Parsec Durchmesser (Fesen und andere, 2018): Die Filamente sind ihr Rand, von der Kante gesehen. Noch nicht von einem Astronomen geprüft.",
      "horsehead": "Seine Dunkelheit ist aus dem Foto von NOIRLab abgelesen: Staub vor dem leuchtenden Gas von IC 434, der schluckt und rötet, was dahinter ist, und kein Licht abgibt. Noch nicht von einem Astronomen geprüft.",
      "coalsack": "Seine Dunkelheit ist aus der Milchstraße um ihn herum abgelesen: eine Staubwolke in etwa 590 Lichtjahren Entfernung, die die Sterne dahinter abdunkelt und rötet. Noch nicht von einem Astronomen geprüft.",
      "m78": "Sein Licht ist das Foto von NOIRLab: Staub, der das blaue Licht des Sterns davor streut, auf der Vorderseite einer dunklen Wolke. Seine Tiefe ist rekonstruiert. Noch nicht von einem Astronomen geprüft.",
      "iris": "Sein Licht ist das Foto von NOIRLab: Staub, der das Licht des jungen Sterns HD 200775 in einer Mulde seiner Wolke streut. Seine Tiefe ist rekonstruiert. Noch nicht von einem Astronomen geprüft."
    },
    "rows": {
      "dso-m45": [["Seine Form in der Tiefe", "Rekonstruiert. Das Gas liegt vor den Sternen, wie ihr Licht zeigt; wie weit davor und wie dick der Staub ist, ist illustrativ, und die Tiefen der Sterne im Haufen sind ein festes Modell, nicht gemessen."], ["Was der Staub tut", "Er streut das Licht der Sterne, das blaue am stärksten, und leuchtet daher blau um die hellsten, vor allem Merope und Maia. Es ist eine durchziehende Wolke, nicht die, aus der die Sterne entstanden sind."], ["Prüfung", "Dieses Modell wurde noch nicht von einem Astronomen geprüft."]],
      "dso-m1": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert aus einem gemessenen Umriss. Die Filamente reichen etwa 2 Parsec entlang der Achse des Pulsarwinds, und keines liegt innerhalb eines halben Parsec vom Zentrum (Martin und andere, 2021). Als Ellipsoid entlang dieser Achse gezeichnet; welches Ende uns näher ist, ist angenommen."
        ],
        [
          "Seine Farben",
          "Falschfarben: die Schmalbandfilter des Fotos für Sauerstoff und Schwefel, von den Machern des Bildes auf Farben abgebildet."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-veil-nebula": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert: eine Kugel von 37 Parsec Durchmesser, in der Größe und Entfernung, die Fesen und andere (2018) gemessen haben. Die Dicke der Hülle ist illustrativ."
        ],
        [
          "Seine Farben",
          "Falschfarben: die Schmalbandfilter des Fotos für Sauerstoff, Schwefel und Wasserstoff, vom Macher des Bildes auf Farben abgebildet."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert. Der Staub liegt vor dem leuchtenden Gas von IC 434, wie beobachtet; wie weit davor und wie dick er ist, ist illustrativ."
        ],
        [
          "Was der Staub tut",
          "Er schluckt nur: Die Sterne und das Leuchten dahinter sind abgedunkelt, mehr im Blau als im Rot, deshalb sehen sie röter aus. Er gibt kein eigenes Licht ab."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-coalsack": [
        [
          "Wie dunkel er ist",
          "Abgelesen daran, wie viel dunkler die Milchstraße hier ist als in gleichem Abstand von ihrer Mittellinie in der Nähe. Das ist eine Schätzung und niedriger, als Infrarotkarten ergeben, weil Sterne vor der Wolke ihr Licht hinzufügen."
        ],
        [
          "Was der Staub tut",
          "Er schluckt nur: Die Sterne dahinter sind abgedunkelt und gerötet. Sterne davor nicht. Ein Teil der Dunkelheit im Nordosten ist eine zweite Wolke weit dahinter, hier in der nahen Entfernung gezeichnet."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-m78": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert: der beleuchtete Staub als Schicht, mit seinem Stern davor und einer dunklen Wolke dahinter. Die Tiefen sind illustrativ."
        ],
        [
          "Von einer anderen Seite",
          "Modelliert: Staub streut mehr Licht nach vorn als zur Seite, deshalb sieht derselbe Staub von einer anderen Seite heller oder schwächer aus."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ],
      "dso-iris-nebula": [
        [
          "Seine Form in der Tiefe",
          "Rekonstruiert: die beleuchteten Wände als Schicht, mit dem Stern davor und einer dunklen Wolke dahinter. Die Tiefen sind illustrativ."
        ],
        [
          "Von einer anderen Seite",
          "Modelliert: Staub streut mehr Licht nach vorn als zur Seite, deshalb sieht derselbe Staub von einer anderen Seite heller oder schwächer aus."
        ],
        [
          "Prüfung",
          "Dieses Modell ist noch nicht von einem Astronomen geprüft worden."
        ]
      ]
    },
    "how": "Das Gas eines Überrests fliegt mit stetiger Geschwindigkeit nach außen, deshalb sagt seine Geschwindigkeit auf uns zu oder von uns weg, wie weit vor oder hinter dem Zentrum es ist. Martin, Milisavljevic und Drissen (2021) haben 310 000 Spektren des Krebsnebels auf diese Weise in seine Form verwandelt."
  },
  "r12Navigate": {
    "chainLabel": "Wo es ist",
    "chainTitle": "Zu {name} fliegen",
    "milkyWay": "Milchstraße",
    "outside": "Außerhalb der Milchstraße",
    "the": [
      "∅",
      "∅",
      "∅"
    ],
    "theWord": "",
    "backParent": "Zurück zu {parent}",
    "backParentTitle": "Hinaus zu {parent} fliegen",
    "legendTitle": "Die Legende öffnen: was jedes dieser Wörter bedeutet",
    "label": "Wo du bist",
    "title": "Wo die Kamera auf der Leiter steht, von der Erde bis zur Lokalen Gruppe",
    "back": "Zurück",
    "backTo": "Zurück zu {name}",
    "sep": "›",
    "rungs": {
      "earth": "Erde",
      "sun": "Sonnensystem",
      "stellar": "Nahe Sterne",
      "galaxy": "Milchstraße",
      "local-group": "Lokale Gruppe"
    },
    "notes": {
      "sun": "Beschleunigt: Die Sonne ist {distance} entfernt",
      "stellar": "Beschleunigt: Der nächste Stern ist {distance} entfernt",
      "galaxy": "Beschleunigt: Das Zentrum unserer Galaxie ist {distance} entfernt",
      "local-group": "Beschleunigt: Andromeda ist {distance} entfernt"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "Die Sonne",
      "ROCKY_PLANET": "Gesteinsplaneten",
      "GAS_GIANT": "Gasriesen",
      "ICE_GIANT": "Eisriesen",
      "RINGS": "Ringe",
      "VOLCANIC_MOON": "Vulkanischer Mond",
      "ICY_MOON": "Eismonde",
      "TITAN": "Mond mit Atmosphäre",
      "AIRLESS_MOON": "Monde ohne Luft",
      "DWARF_PLANET": "Zwergplaneten",
      "ASTEROID": "Asteroiden",
      "COMET": "Kometen",
      "ARTIFICIAL_SATELLITE": "Satelliten",
      "LAUNCH_AND_ROCKET": "Starts und Raketen",
      "SPACE_PROBE": "Raumsonden",
      "LANDING_SITE": "Landeplätze",
      "EXOPLANET": "Exoplaneten",
      "STAR": "Sterne",
      "BINARY_AND_MULTIPLE": "Doppel- und Mehrfachsterne",
      "COMPACT_REMNANT": "Tote Sterne",
      "BLACK_HOLE": "Schwarze Löcher",
      "OPEN_CLUSTER": "Offene Sternhaufen",
      "GLOBULAR_CLUSTER": "Kugelsternhaufen",
      "EMISSION_NEBULA": "Emissionsnebel",
      "PLANETARY_NEBULA": "Planetarische Nebel",
      "DARK_NEBULA": "Dunkelnebel",
      "REFLECTION_NEBULA": "Reflexionsnebel",
      "SUPERNOVA_REMNANT": "Supernova-Überreste",
      "GALAXY_SPIRAL": "Spiralgalaxien",
      "GALAXY_IRREGULAR": "Irreguläre Galaxien",
      "GALAXY_ELLIPTICAL": "Elliptische Galaxien",
      "GALAXY_INTERACTION": "Wechselwirkende Galaxien",
      "AGN_QUASAR": "Quasare",
      "GALAXY_GROUP": "Galaxiengruppen",
      "GROUND_SITE": "Bodenstationen",
      "ODDITY": "Kuriositäten"
    },
    "other": "Andere Dinge",
    "byName": "Nach Name",
    "of": "{label}: {world}",
    "only": "3D-Modelle",
    "onlyTitle": "Nur das auflisten, was nach einem 3D-Modell gezeichnet ist: ein echtes Modell oder eine Rekonstruktion",
    "real": "echtes 3D-Modell",
    "rebuilt": "3D-Rekonstruktion",
    "noneWithModel": "Keines davon hat ein 3D-Modell.",
    "counting": "zählt …"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "Bewegung",
      "choices": {
        "on": "An",
        "off": "Aus"
      },
      "titles": {
        "on": "Flüge gleiten und Reisen laufen von selbst weiter, wie die Karte gemacht ist",
        "off": "Jeder Flug ist ein Sprung, nichts bewegt sich, was nicht gemessen ist, und eine Reise wartet auf „Nächste Station“"
      },
      "device": "Dein Gerät bittet um weniger Bewegung, deshalb ist sie aus."
    },
    "summary": {
      "label": "Was auf dem Bildschirm ist",
      "stage": "Blick auf {stage}.",
      "selected": "{name} ist ausgewählt, {kind}.",
      "nothing": "Nichts ist ausgewählt.",
      "trip": "Reise, Station {n} von {count}: {title}.",
      "tripIntro": "Die Reise {title} ist geöffnet.",
      "measured": "Gezeichnet, wie gemessen."
    }
  }
};

// 1.6.2 (internal #1057): the words of the Moments (copy/en.moments.js and its three story files), German. Machine-drafted like the rest of this file
// (docs/TRANSLATING.md): drafted by a program from the English, NOT read by a native speaker. The spoken lines of the recordings
// (Armstrong's first words) stay in the language they were said in. Added to COPY here; the story files call HOOK.localise after they load.
Object.assign(COPY, {
  "momentPlayer": {
    "micro": "Moment",
    "play": "Abspielen",
    "pause": "Pause",
    "replay": "Nochmal ansehen",
    "close": "Den Moment schließen",
    "chapters": "Kapitel",
    "chaptersTitle": "Zu einem Kapitel springen",
    "share": "Einen Link zu dieser Sekunde kopieren",
    "copied": "Link kopiert",
    "copyFailed": "Diesen Link kopieren: {url}",
    "director": "Regie",
    "directorTitle": "Die Kamera an die Regie zurückgeben",
    "freeNote": "Deine Kamera. Zieh, um dich umzusehen; Regie nimmt sie zurück.",
    "scrubber": "Missionszeit",
    "met": "Seit Missionsbeginn vergangene Zeit",
    "rateTitle": "Die Zeit läuft hier {rate} so schnell wie in Wirklichkeit",
    "realTime": "Echtzeit",
    "loading": "Der Moment wird geladen …",
    "missing": "Es gibt keinen Moment namens {id}.",
    "unreachable": "Dieser Moment wurde nicht geladen. Er wird auf diesem Gerät erst gespeichert, nachdem er einmal online geöffnet wurde.",
    "modelMissing": "Das Modell {model} wurde nicht geladen; seine Bahn und seine Flammen werden trotzdem gezeichnet.",
    "chapterOf": "Kapitel {n} von {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "Gemessen",
      "reconstructed": "Rekonstruiert",
      "illustrative": "Illustrativ"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "Die Stufen sind vorerst aus einem einzigen Modell geschnitten.",
    "drawnNote": "Flammen und Dampf sind gezeichnet.",
    "groundNote": "Der Boden an der Rampe ist illustrativ; Erdkarte von Solar System Scope, CC BY 4.0.",
    "groundNoteMars": "Der Boden am Landeplatz ist illustrativ; Marskarte von Solar System Scope, CC BY 4.0.",
    "keys": "Leertaste startet oder pausiert, Pfeile springen, Esc schließt"
  },
  "momentShelf": {
    "title": "Momente",
    "note": "Missionen, auf einer einzigen Uhr wiederholt, mit den echten Zeiten der Ereignisse. Die Bahnen sind rekonstruiert oder illustrativ und sagen es.",
    "minutes": "{m} Min.",
    "all": "Alle {n} Momente",
    "fewer": "Weniger Momente",
    "replay": "Diesen Moment ansehen",
    "replayTitle": "{title} auf der Missionsuhr ansehen",
    "replayNamed": "{title} ansehen",
    "cards": {
      "apollo-11": {
        "title": "Apollo 11",
        "when": "16. bis 24. Juli 1969",
        "blurb": "Von Rampe 39A über die Tranquility Base zum Pazifik: Start, der Mond, die Landung, der Aufstieg, die Heimkehr."
      },
      "apollo-13": {
        "title": "Apollo 13",
        "when": "11. bis 17. April 1970",
        "blurb": "Von Rampe 39A zum Pazifik: die Mondlandung, die nicht stattfand, ein geplatzter Sauerstofftank und die Mondfähre als Rettungsboot."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1. bis 10. April 2026",
        "blurb": "Von Rampe 39B zum Pazifik vor San Diego, um die Rückseite des Mondes. Es steht dabei, was geflogen wurde und was geplant war."
      },
      "sputnik-1": {
        "title": "Sputnik 1",
        "when": "4. Oktober 1957",
        "blurb": "Von Baikonur zur ersten Erdumrundung: der erste künstliche Satellit, eine polierte Kugel von 585 mm, und sein Piepen."
      },
      "voskhod-2": {
        "title": "Woschod 2",
        "when": "18. bis 19. März 1965",
        "blurb": "Alexei Leonow steigt zwölf Minuten lang durch eine aufblasbare Schleuse in den Weltraum, und die Besatzung landet von Hand in der Taiga, weit von ihrem Feld entfernt."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "12. bis 14. April 1981",
        "blurb": "Das erste Space Shuttle: Columbia von Rampe 39A, die Booster und der Tank, 54 Stunden im Orbit und ein Gleitflug auf den ausgetrockneten See von Edwards."
      },
      "curiosity-edl": {
        "title": "Curiositys Landung",
        "when": "6. August 2012",
        "blurb": "Die sieben Minuten von der Obergrenze der Marsluft bis zum Gale-Krater: Hitzeschild, Fallschirm, Raketenrucksack und Himmelskran, auf der Uhr des JPL."
      },
      "new-horizons-pluto": {
        "title": "New Horizons am Pluto",
        "when": "14. Juli 2015",
        "blurb": "Der erste Besuch beim Pluto: von sechs Stunden vorher bis zum Vorbeiflug mit 13,8 km/s, auf der Bahn des JPL selbst, Pluto und Charon als Scheiben, die Sichel dahinter."
      },
      "hubble-deployment": {
        "title": "Hubbles Freisetzung",
        "when": "25. April 1990",
        "blurb": "Der Arm der Discovery hebt das Hubble-Weltraumteleskop bei STS-31 aus der Ladebucht, ein Solarflügel bleibt stehen, und um 19:38 UTC wird das Teleskop losgelassen."
      },
      "falcon9-og2-2": {
        "title": "Die erste Landung einer Falcon 9",
        "when": "21. Dezember 2015",
        "blurb": "Falcon 9 Flug 20 bringt 11 ORBCOMM-Satelliten von Cape Canaveral auf den Weg, und ihre erste Stufe fliegt zurück und landet auf der Landing Zone 1: die erste Landung der ersten Stufe einer Orbitalrakete."
      },
      "vostok-1": {
        "title": "Wostok 1",
        "when": "12. April 1961",
        "blurb": "Juri Gagarin, einmal um die Erde in 108 Minuten, von Baikonur zu einem Feld bei Smelowka."
      }
    }
  },
  "momentStories": {
    "demo-saturn": {
      "title": "Saturn V: von der Zündung bis zur Stufentrennung",
      "blurb": "Die ersten drei Minuten von Apollo 11, am 16. Juli 1969, von der Rampe am Startkomplex 39A.",
      "chIgnition": "Zündung",
      "chLiftoff": "Start",
      "chClimb": "Maximaler Staudruck",
      "chStaging": "Stufentrennung",
      "ignition": "T−8.9 s: Die Zündfolge startet die fünf F-1-Triebwerke, das mittlere zuerst, dann die äußeren Paare.",
      "holddown": "Die Haltearme halten die Rakete auf der Rampe, bis alle fünf Triebwerke volle Schubkraft haben.",
      "liftoff": "Start, 13:32:00.6 UTC: fünf F-1, rund 33 800 kN, die fast 3 000 Tonnen heben.",
      "tower": "Frei vom Turm dreht die Rakete auf ihren Flugazimut ein, 72 Grad östlich von Nord.",
      "maxq": "Nach einer Minute die Schallgrenze, dann der maximale Staudruck, wenn die Luft am stärksten drückt: 35 kPa (735 lb/ft²).",
      "ceco": "T+135 s: Das mittlere Triebwerk schaltet ab, damit die Beschleunigung unter 4 g bleibt.",
      "staging": "T+161.7 s: Die äußeren Triebwerke schalten ab. In etwa 67 km Höhe fällt die S-IC ab, ihre Bremsraketen zünden.",
      "sii": "T+163.0 s: Die fünf J-2-Triebwerke der S-II zünden. Wasserstoff brennt blass und fast klar.",
      "interstage": "Der Zwischenstufenring löst sich; bei T+197.9 s geht der Fluchtturm ab. Die Parkbahn ist 8.5 Minuten entfernt.",
      "pathAscent": "Zeiten aus dem Apollo-11-Missionsbericht, die Höhen dazwischen angenähert",
      "sources": "Apollo-11-Missionsbericht, NASA MSC-00171, 1969 (Tabelle 3-I, Ereignisfolge; Abschnitt 7.1, Start)"
    },
    "vostok-1": {
      "title": "Wostok 1: der erste Mensch im Weltraum",
      "blurb": "Juri Gagarin, 12. April 1961: von Baikonur einmal um die Erde bis zu einem Feld bei Smelowka, auf der Missionsuhr, in 108 Minuten.",
      "chPad": "Gagarins Start",
      "chAscent": "Aufstieg",
      "chOrbit": "Eine Umlaufbahn",
      "chRetro": "Bremszündung",
      "chEntry": "Wiedereintritt",
      "chEject": "Ausschuss",
      "chLand": "Landung",
      "ready": "Baikonur, Startplatz 1, 06:07 UTC. Juri Gagarin, 27, sitzt in der Kapsel oben auf der R-7-Rakete.",
      "korolev": "Sergei Koroljow im Funk: „Vorstufe … Zwischenstufe … Hauptstufe … Abheben!“",
      "liftoff": "Start. Gagarin: „Poyekhali!“, „Los geht’s!“",
      "boosters": "T+119 s: Die vier Seitenbooster brennen aus und fallen ab.",
      "shroud": "T+156 s: Die Verkleidung über der Kapsel wird abgeworfen.",
      "core": "T+300 s: Die Kernstufe ist leer und fällt ab; die letzte Stufe zündet.",
      "earth": "Etwa bei T+6 min, Gagarin: „Ich sehe die Erde. Die Sicht ist gut.“",
      "kosberg": "Etwa bei T+10 min schaltet die letzte Stufe ab. Gagarin: „Kosberg hat funktioniert!“, nach dem Konstrukteur ihres Triebwerks.",
      "orbit": "In der Umlaufbahn: 181 mal 327 km, 64.95 Grad zum Äquator geneigt, 89.1 Minuten pro Umlauf. Die Kapsel trennt sich von der Stufe.",
      "retro": "T+1 h 18 min, über der Westküste Afrikas: Das Bremstriebwerk brennt etwa 42 Sekunden. Zeit und Ort sind veröffentlicht; seine Stärke ist hier an die Landung angepasst.",
      "wires": "Das Instrumentenmodul sollte sich zehn Sekunden nach der Bremszündung lösen. Ein Kabelbündel hält es; beide taumeln zusammen in die Luft.",
      "entry": "Die Kabel brennen durch, und die Kugel richtet sich mit dem Hitzeschild nach vorn aus. Gagarin berichtete später von mehr als 10 g.",
      "eject": "In 7 km Höhe wird die Luke abgesprengt, und der Sitz schießt Gagarin hinaus. Wostoks Kugel landete zu hart für einen Menschen darin.",
      "chutes": "In 2.5 km Höhe öffnet sich der Hauptfallschirm der Kapsel, 27 m breit; der Fallschirm des Piloten hatte sich fast sofort geöffnet. Der Sitz fällt frei.",
      "landing": "T+1 h 48 min: Gagarin landet 26 km südwestlich von Engels im Gebiet Saratow, 108 Minuten nach dem Start. Die Quellen weichen bei der Landung um zehn Minuten ab.",
      "pathAscent": "der Aufstieg sind die veröffentlichten Ereigniszeiten, durch glatte Kurven verbunden; Höhen und Entfernungen dazwischen sind unsere",
      "pathOrbit": "Umlaufbahn, Bremszündung und Wiedereintritt sind Zweikörperbögen, angepasst an die veröffentlichten Zeiten und das Landefeld, keine Bahnverfolgungsdaten",
      "pathPilot": "der Abstieg am Fallschirm des Piloten ist gezeichnet; keine Quelle nennt die Entfernung zur Kapsel",
      "srcWiki": "Wikipedia, Wostok 1 (Ereigniszeiten, Umlaufbahn, Zitate; gelesen am 2. November 2026)",
      "srcNssdc": "NASA NSSDCA, Wostok 1 (Umlaufbahn, Raumfahrzeug)"
    },
    "apollo-11": {
      "title": "Apollo 11: zum Mond und zurück",
      "blurb": "Vom Startkomplex 39A am 16. Juli 1969 zum Pazifik am 24.: Start, der Mond, die Tranquility Base und die Heimkehr, auf der Missionsuhr.",
      "chIgnition": "Zündung",
      "chLiftoff": "Start",
      "chStaging": "Stufentrennung",
      "chParking": "Parkbahn",
      "chTli": "Aufbruch zum Mond",
      "chCoast": "Drei Tage unterwegs",
      "chLoi": "In die Mondumlaufbahn",
      "chUndock": "Eagle trennt sich",
      "chDescent": "Angetriebener Abstieg",
      "chSurface": "Tranquility Base",
      "chAscent": "Wieder hinauf",
      "chDock": "Ankopplung",
      "chTei": "Heimwärts",
      "chEntry": "Wiedereintritt",
      "chSplash": "Wasserung",
      "ignition": "T−8.9 s: Die Zündfolge startet die fünf F-1-Triebwerke, das mittlere zuerst, dann die äußeren Paare.",
      "liftoff": "Start, 13:32:00 UTC: fünf F-1, rund 33 800 kN, die fast 3 000 Tonnen heben.",
      "tower": "Frei vom Turm dreht die Rakete auf ihren Flugazimut ein, 72 Grad östlich von Nord.",
      "maxq": "Nach einer Minute die Schallgrenze; dann der maximale Staudruck, wenn die Luft am stärksten drückt: 35 kPa.",
      "ceco": "T+135 s: Das mittlere Triebwerk schaltet ab, damit die Beschleunigung unter 4 g bleibt.",
      "staging": "T+161.7 s: Die äußeren Triebwerke schalten ab. In etwa 67 km Höhe fällt die S-IC ab, ihre Bremsraketen zünden.",
      "sii": "T+163.0 s: Die fünf J-2-Triebwerke der S-II zünden. Wasserstoff brennt blass und fast klar.",
      "interstage": "Der Zwischenstufenring löst sich; bei T+197.9 s geht der Fluchtturm ab.",
      "siicut": "T+9 min 13 s: Die S-II schaltet ab und fällt ab; die S-IVB zündet.",
      "parking": "T+11 min 52 s: Parkbahn, 185 km hoch. Zweieinhalb Stunden Kontrollen, anderthalb Runden um die Erde.",
      "tli": "2:44:16: Die S-IVB zündet noch einmal für 5 min 48 s und bringt den Verband auf 10.8 km/s. Das Ziel ist der Mond.",
      "sla": "3:17: Die vier Platten um die Mondfähre klappen auf. Columbia trennt sich, dreht um und koppelt Nase an Nase an Eagle an (nicht gezeichnet).",
      "extract": "Etwa 3:57: Columbia zieht Eagle aus der S-IVB. Die leere Stufe bleibt zurück.",
      "coast": "Drei Tage bis zum Mond, 384 000 km, gezeichnet mit etwa der 8 000-fachen Geschwindigkeit. Das Raumschiff ist 11 Meter lang, also ein Punkt.",
      "loi": "75:49:50, hinter dem Mond und ohne Funkkontakt: Das Servicetriebwerk brennt sechs Minuten, um eingefangen zu werden.",
      "lunarorbit": "Mondumlaufbahn, etwa 100 km hoch, zwei Stunden pro Runde.",
      "undock": "100:12: Eagle mit Armstrong und Aldrin trennt sich von Columbia, wo Collins bleibt.",
      "pdi": "102:33:05: Der angetriebene Abstieg beginnt, 15 km hoch und etwa 500 km vor dem Ziel.",
      "landing": "Der Computer würde in einem Krater voller Felsbrocken landen. Armstrong übernimmt die Steuerung und fliegt weiter, mit weniger als einer Minute Treibstoff.",
      "landed": "102:45:40, 20:17:40 UTC. „Houston, Tranquility Base here. The Eagle has landed.“",
      "step": "109:24:15, 02:56 UTC am 21. Juli: Armstrong steigt von der Leiter.",
      "smallstep": "„That's one small step for [a] man, one giant leap for mankind.“ Armstrong, 109:24:48; der Ausschnitt ist die NASA-Aufnahme.",
      "liftoffe": "124:22: Die Aufstiegsstufe hebt von der Abstiegsstufe ab, die auf dem Mond bleibt. 17:54 UTC am 21. Juli.",
      "rendezvous": "Eagle jagt Columbia von 18 km auf 100 km hinauf. Die Manöver sind als Form gezeichnet, nicht die der Mission.",
      "docked": "128:03, 21:35 UTC: angekoppelt. Die Besatzung und 21.5 kg Mondgestein wechseln hinüber.",
      "jettison": "130:09: Eagles Aufstiegsstufe wird abgeworfen und kreist um den Mond.",
      "tei": "135:23:42, auf der Rückseite: Das Servicetriebwerk zündet für 2 min 30 s. Heimwärts.",
      "home": "Zweieinhalb Tage zurück, dieselben 384 000 km.",
      "smsep": "194:49: Das Servicemodul wird abgetrennt, und die Kapsel dreht ihren Hitzeschild nach vorn.",
      "entry": "195:03, Eintrittsschnittstelle, 122 km hoch bei 11 km/s. Der Schild glüht; bis zu etwa 6 g.",
      "drogue": "Etwa 195:12: zwei Bremsfallschirme, dann drei Hauptfallschirme.",
      "mains": "Drei Hauptfallschirme, 25 m breit, bremsen die Kapsel auf etwa 9 m/s.",
      "splash": "195:18:35, 16:50:35 UTC am 24. Juli: Wasserung im Pazifik, 24 km vom Flugzeugträger USS Hornet entfernt (nicht gezeichnet). Acht Tage, drei Stunden, 18 Minuten.",
      "pathAscent": "die Ereigniszeiten des Missionsberichts, Höhen und Entfernungen dazwischen angenähert",
      "pathTrip": "rekonstruiert aus den Ereigniszeiten des Flugjournals als Zweikörperbögen: ein Kegelschnitt hinaus, ein Kreis um den Mond, ein Kegelschnitt heim; keine Bahnverfolgungsdaten",
      "pathLm": "der Abstieg ist rückwärts von der Tranquility Base aus gezeichnet und das Rendezvous ist eine Form; die Ereigniszeiten sind die der Mission",
      "srcReport": "Apollo-11-Missionsbericht, NASA MSC-00171, 1969 (Ereigniszeiten, Start, Landung)",
      "srcJournal": "Apollo-11-Flugjournal, NASA (Ereigniszeiten auf die Sekunde)",
      "srcClip": "Armstrongs erste Worte auf dem Mond: NASA-Aufnahme, gemeinfrei, von Wikimedia Commons",
      "srcLanding": "Die Landemeldung: NASA-Aufnahme, gemeinfrei, von Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: um den Mond",
      "blurb": "Vom Startkomplex 39B am 1. April 2026 zum Pazifik vor San Diego am 10.: vier Menschen um die Rückseite des Mondes, auf der Missionsuhr.",
      "chPad": "Rampe 39B",
      "chLiftoff": "Start",
      "chStaging": "Booster abgeworfen",
      "chOrbit": "Hohe Erdumlaufbahn",
      "chTli": "Aufbruch zum Mond",
      "chMoon": "Die Rückseite",
      "chHome": "Auf dem Heimweg",
      "chEntry": "Wiedereintritt",
      "chSplash": "Wasserung",
      "ready": "Startkomplex 39B, Kennedy Space Center, 1. April 2026. Wiseman, Glover, Koch und Hansen sind an Bord von Orion, oben auf dem Space Launch System.",
      "cored": "T−6.4 s: Die vier RS-25-Triebwerke der Kernstufe starten. Geflogen, wie geplant.",
      "liftoff": "Start, 22:35:12 UTC (18:35 Uhr EDT): Die beiden Booster mit fünf Segmenten zünden bei null. Geflogen.",
      "srb": "Etwa bei T+2 min: Die Booster brennen aus und trennen sich in 48 km Höhe bei 5 000 km/h. Geflogen; sie stürzen in den Atlantik.",
      "las": "Geplant, T+3 min 22 s: Der Fluchtturm wird abgeworfen. Die berichteten Flüge geben die Sekunde nicht an; dies ist die des Flugplans.",
      "meco": "Geplant, T+8 min: Die Kernstufe schaltet ab, auf einem suborbitalen Bogen mit einem Apogäum bei etwa 2 300 km. Die Zeit des Flugplans.",
      "coresep": "Die Kernstufe wird freigegeben und stürzt etwa zwei Stunden nach dem Start in einem zerstörerischen Wiedereintritt über den Pazifik. Geflogen.",
      "prb": "Etwa bei T+50 min, am höchsten Punkt des Bogens: Die Oberstufe brennt, um den tiefsten Punkt aus der Luft zu heben. Geflogen, die Sekunde ist nicht veröffentlicht.",
      "arb": "Eine Stunde später, am tiefsten Punkt: Ein 15-Minuten-Brennen hebt die ferne Seite der Bahn auf 70 000 km, ein Umlauf von fast einem Tag. Geflogen.",
      "fairings": "Geplant: Die drei Platten um das Servicemodul werden abgeworfen; die vier Solarflächen entfalten sich. Die Zeit des Flugplans, hier schon entfaltet gezeichnet.",
      "arrays": "Orions vier Solarflächen sind draußen: Sie liefern zehn Tage lang seinen Strom.",
      "sep": "Geplant: Orion trennt sich von der Oberstufe; Glover fliegt es dann etwa 70 Minuten lang von Hand neben der Stufe. Die Zeit der Trennung ist nicht veröffentlicht.",
      "tli": "Flugtag 2, etwa 25 Stunden nach dem Start: Das Haupttriebwerk des Servicemoduls brennt 5 min 49 s, zum Mond. Geflogen; die gezeigte Minute ist die des Flugplans.",
      "outbound": "Vier Tage hinaus. Ein Korrekturbrennen auf dem Hinweg wurde geflogen, 17.5 s an Flugtag 5; es ist zu klein zum Zeichnen.",
      "record": "17:56 UTC am 6. April: Orion übertrifft den Entfernungsrekord von Apollo 13 aus dem Jahr 1970, 248 655 Meilen von der Erde. Geflogen.",
      "moon": "Flugtag 6: Orion tritt in den Einflussbereich des Mondes ein. Es geht nicht in eine Umlaufbahn: Es fliegt um die Rückseite und fällt heim.",
      "los": "22:46 UTC: hinter dem Mond, 38 Minuten ohne Kontakt. Geflogen.",
      "closest": "Größte Annäherung, 23:00 UTC am 6. April: 6 545 km über der Rückseite des Mondes. Geflogen.",
      "far": "23:02 UTC: größte Entfernung von der Erde, 406 771 km. Geflogen.",
      "aos": "23:24 UTC: wieder Kontakt von hinter dem Mond. Geflogen.",
      "home": "Vier Tage heim. Drei Korrekturbrennen auf dem Rückweg wurden geflogen, von 15, 9 und 8 Sekunden; sie sind zu klein zum Zeichnen.",
      "esmsep": "Geplant: Das Servicemodul wird etwa 20 Minuten vor dem Wiedereintritt abgetrennt. Die Zeit der Trennung ist nicht veröffentlicht; gezeichnet ist die des Flugplans.",
      "entry": "Eintrittsschnittstelle, geplant etwa 13 Minuten vor der Wasserung: 122 km hoch bei 11 km/s, der Hitzeschild glüht. Ein steilerer direkter Eintritt ersetzte den geplanten Eintritt mit Sprung. Geflogen.",
      "drogue": "Bremsfallschirme, dann Hilfsschirme und drei Hauptfallschirme, 35 m breit. Geflogen; die Zeiten sind die des Flugplans.",
      "mains": "Drei Hauptfallschirme bringen die Kapsel hinunter zum Meer.",
      "splash": "Wasserung, 00:07:27 UTC am 11. April (17:07 Uhr PDT, 10. April), 32.3 N 117.8 W, südwestlich von San Diego; die USS John P. Murtha birgt die Besatzung (Schiff nicht gezeichnet). Neun Tage, eine Stunde, 32 Minuten. Geflogen.",
      "pathAscent": "die Ereigniszeiten des Flugplans, Höhen und Entfernungen dazwischen sind unsere; Start und Boostertrennung sind geflogen",
      "pathTrip": "rekonstruiert aus der geflogenen Bahn, der größten Annäherung und der Wasserung, als Zweikörperbögen und eine Hyperbel um den Mond; keine Bahnverfolgungsdaten",
      "srcWiki": "Wikipedia, Artemis II (was geflogen wurde, mit Zeiten und Entfernungen; gelesen am 2. November 2026)",
      "srcNasa": "NASA, Artemis II (der Flugplan; Modell der Rakete und der Kapsel: NASA 3D Resources)"
    },
    "apollo-13": {
      "title": "Apollo 13: der Flug nach Hause",
      "blurb": "Vom Startkomplex 39A, 11. April 1970, bis in den Pazifik am 17.: eine Mondlandung, die nicht stattfand, ein geplatzter Sauerstofftank und die Mondfähre als Rettungsboot.",
      "chIgnition": "Zündung",
      "chLiftoff": "Start",
      "chStaging": "Stufentrennung",
      "chParking": "Parkbahn",
      "chTli": "Aufbruch zum Mond",
      "chCoast": "Zwei Tage unterwegs",
      "chBang": "Der Knall",
      "chLifeboat": "Aquarius, das Rettungsboot",
      "chReturn": "Wieder auf Rückkehrbahn",
      "chMoon": "Um die Rückseite",
      "chBurn": "Die Zündung nach Hause",
      "chHome": "Drei Tage heimwärts",
      "chSm": "Das Servicemodul",
      "chUndock": "Aquarius wird abgeworfen",
      "chEntry": "Wiedereintritt",
      "chSplash": "Wasserung",
      "ignition": "Etwa T−9 s: Die fünf F-1-Triebwerke zünden, das mittlere zuerst. Startkomplex 39A, 2:13 p.m. Ostküstenzeit.",
      "liftoff": "Start, 19:13:00 UTC, 11. April 1970: James Lovell, Jack Swigert und Fred Haise, unterwegs zum Hochland von Fra Mauro.",
      "roll": "Bei 12.6 s dreht der Verband auf seinen Flugazimut ein, 72.043 Grad östlich von Nord.",
      "staging": "2:44: Die äußeren Triebwerke der ersten Stufe schalten ab, und die Stufe fällt ab; die zweite Stufe zündet bei 2:45.",
      "tower": "3:21: Der Fluchtturm wird abgeworfen.",
      "pogo": "Bei 5:30 schaltet das mittlere Triebwerk der zweiten Stufe von selbst ab, 132 Sekunden zu früh, nachdem die Stufe zu stark zu vibrieren begann. Die anderen vier brennen 34 Sekunden länger, um das auszugleichen.",
      "siicut": "9:53: Die zweite Stufe schaltet ab und fällt ab; die S-IVB zündet.",
      "parking": "12:30: Parkbahn, 190 mal 185 km hoch. Es folgen zweieinhalb Stunden Kontrollen.",
      "tli": "2:35:46: Die S-IVB zündet noch einmal, 5 min 51 s lang, und schickt das Raumschiff mit fast 11 km/s zum Mond.",
      "sep": "3:06:39: Odyssey trennt sich von der S-IVB, dreht um und koppelt bei 3:19:09 an Aquarius an. Die vier Adapterplatten fallen ab.",
      "extract": "4:01: Odyssey zieht Aquarius aus der leeren Stufe, die zurückbleibt.",
      "coast": "Zwei Tage bis zum Mond, gezeichnet mit etwa der 9 000-fachen Geschwindigkeit. Das Raumschiff ist 11 Meter lang, also ein Punkt.",
      "tv": "55:53:20: Das Kontrollzentrum bittet um ein routinemäßiges Durchrühren der Sauerstofftanks. Eine Fernsehübertragung ist vor wenigen Minuten zu Ende gegangen; die Besatzung räumt auf.",
      "bang": "55:54:53, 03:07 UTC am 14. April: ein Knall. Sauerstofftank 2 ist geplatzt und hat die Außenplatte von Fach 4 des Servicemoduls weggerissen. Der Flug der Platte ist gezeichnet, nicht gemessen.",
      "problem": "55:55:20: „Okay, Houston, we've had a problem here.“ Jack Swigert; die NASA-Aufnahme, abgespielt wie protokolliert.",
      "problem2": "55:55:42: „Houston, we've had a problem.“ James Lovell; die NASA-Aufnahme.",
      "barber": "Binnen Minuten entweicht auch der Sauerstoff aus Tank 1. Die Brennstoffzellen erzeugen aus diesem Sauerstoff Strom und Wasser für das Raumschiff, und sie fallen aus.",
      "lifeboat": "Aquarius wird zum Rettungsboot: gebaut, um zwei Männer zwei Tage am Leben zu halten, muss es drei vier Tage am Leben halten. Odyssey wird heruntergefahren, damit seine Batterien für den Wiedereintritt reichen.",
      "mcc2": "61:29:43: Das Abstiegstriebwerk der Mondfähre zündet 34 s lang, 11.5 m/s, um das Raumschiff auf eine Bahn zu bringen, die zur Erde zurückführt. Die gezeichnete Bahn knickt dafür nicht ab.",
      "impact": "77:56:40: Die leere S-IVB, vorausgeschickt, schlägt bei 2.4 S 27.9 W auf dem Mond auf, und das Seismometer von Apollo 12 zeichnet es auf (nicht gezeichnet).",
      "farside": "Etwa 77:28, hinter dem Mond und ohne Funkkontakt: die Rückseite, 254 km darunter.",
      "closest": "Größte Annäherung, 254 km über der Mondrückseite. Rund 400 000 km von der Erde: weiter weg, als je Menschen gewesen waren.",
      "tei": "79:27:39, zwei Stunden nach dem Mond: Das Abstiegstriebwerk zündet 4 min 24 s lang, 262 m/s, um die Landung von 152 auf 143 Stunden vorzuziehen und in den Pazifik zu legen.",
      "home": "Drei Tage heimwärts, kalt, mit knappem Wasser und das Raumschiff auf das Minimum heruntergefahren.",
      "mcc3": "105:18: Das Abstiegstriebwerk zündet 14 s lang mit 10 Prozent, 2.4 m/s, um den Wiedereintritt etwas steiler zu machen.",
      "mcc4": "137:39:52: eine letzte Korrektur von 0.9 m/s, ausgeführt von den kleinen Triebwerken der Mondfähre (nicht gezeichnet).",
      "smsep": "138:01:48, 4 Stunden 39 Minuten vor dem Wiedereintritt: Das Servicemodul wird abgetrennt. Seine Platte fehlt seit 82 Stunden.",
      "photo": "Die Besatzung fotografiert das Modul, während es davontreibt: eine ganze Platte fehlt, und zerrissene Isolierung ragt heraus. Das Fach ist nach AS13-59-8500 gezeichnet; der Schaden an einer Antennenschüssel nicht.",
      "undock": "141:30: Aquarius, das drei Männer rund 83 Stunden am Leben gehalten hat, wird mit dem Druck im Kopplungstunnel abgeworfen. Die Kommandokapsel ist auf sich allein gestellt.",
      "entry": "142:40:46, Eintrittsschnittstelle, 122 km hoch bei 11 km/s. Die erste Spitze liegt bei etwa 5 g.",
      "drogue": "Etwa 142:48: zwei Bremsfallschirme, dann drei Hauptfallschirme.",
      "mains": "Drei Hauptfallschirme bremsen die Kapsel auf etwa 9 m/s.",
      "splash": "142:54:41, 18:07 UTC am 17. April: Wasserung im Südpazifik, in Sichtweite der USS Iwo Jima. Alle drei sind innerhalb von 45 Minuten an Bord.",
      "pathAscent": "die Ereigniszeiten des Missionsberichts, die Höhen und Entfernungen dazwischen angenähert",
      "pathTrip": "die Zustände und Zeiten des Missionsberichts, eine integrierte Bahn mit einer Anpassung der Einschussgeschwindigkeit und ein Lambert-Bogen nach Hause; keine Bahnverfolgungsdaten",
      "pathLm": "an Odyssey angekoppelt bis 141:30; die Drift nach dem Abkoppeln ist illustrativ",
      "pathSm": "illustrativ: die Driftgeschwindigkeit des leeren Servicemoduls ist unsere",
      "srcReport": "Apollo-13-Missionsbericht, NASA MSC-02680, 1971 (Ereigniszeiten, Zustände, Wiedereintritt)",
      "srcJournal": "Apollo-13-Flugjournal, NASA (der Funk, auf die Sekunde)",
      "srcClip": "Die beiden Funksprüche: NASA-Aufnahme, gemeinfrei, von Wikimedia Commons",
      "srcPhoto": "Fach 4 des Servicemoduls: NASA-Foto AS13-59-8500, gemeinfrei, von Wikimedia Commons"
    },
    "sputnik-1": {
      "title": "Sputnik 1: der erste Satellit",
      "blurb": "Baikonur, 4. Oktober 1957: der erste künstliche Satellit, eine polierte Kugel von 585 mm, von der Rampe bis zu seiner ersten Erdumrundung, mit seinem Piepen.",
      "chPad": "Startplatz 1",
      "chAscent": "Start",
      "chBoosters": "Die Seitenbooster",
      "chCore": "Die Kernstufe",
      "chSep": "PS-1 wird abgeworfen",
      "chOrbit": "Eine Runde",
      "ready": "T−10 s auf Startplatz 1 in Baikonur: die Rakete 8K71PS und, unter ihrer Spitze, eine Kugel von 585 mm. 19:28:34 UTC am 4. Oktober 1957, am Startort schon der 5. Die Lampe an der Rampe ist von uns: Die Rampe war dunkel, und die Rakete wird angestrahlt, damit man sie sieht.",
      "liftoff": "Start. Die Kernstufe und die vier Seitenblöcke der R-7 brennen gemeinsam; der Militärrakete wurde dafür der Sprengkopf abgenommen.",
      "regulator": "Nach etwa 16 s fällt ein Treibstoffregler aus: Die Kernstufe verbrennt das Kerosin zu schnell, und ihr Schub liegt fast den ganzen Flug über 4 Prozent zu hoch. Die Mission übersteht das.",
      "boosters": "T+116 s: Die vier Seitenblöcke fallen ab, wie die Telemetrie zeigt. Die Kernstufe fliegt allein weiter.",
      "core": "T+295.4 s: Die Kernstufe schaltet ab, 223 km hoch bei etwa 7.8 km/s, eine Sekunde früher als vorgesehen, als ein Sensor die leere Kerosinpumpe hochdrehen sieht.",
      "sep": "T+315.3 s, 19.9 s nach dem Abschalten: PS-1 wird abgeworfen. Die Spitze fällt ab, die vier Antennen schwenken aus (hier nicht animiert), und der Sender startet.",
      "beep": "Die ersten Piepsignale sind an der Bodenstation IP-1 zwei Minuten lang zu hören, bis der Satellit unter den Horizont sinkt. Der Ton ist die NASA-Aufnahme des Signals.",
      "shadow": "Der Start war kurz nach Mitternacht am Startort, und in seinen ersten 13 Minuten fliegt PS-1 im Erdschatten, deshalb wird er dunkel gezeichnet. Etwa bei T+13 min tritt er ins Sonnenlicht.",
      "orbit": "Umlaufbahn: 223 mal 950 km, 65.1 Grad, 96.2 Minuten pro Runde. Die Kernstufe folgt ihm auf der Bahn (nicht gezeichnet).",
      "lap": "Eine Runde in dieser Wiedergabe. Die Batterien waren am 26. Oktober nach 326 Umläufen leer; die Kugel stürzte am 4. Januar 1958 nach etwa 1 440 ab.",
      "pathAscent": "die veröffentlichten Ereigniszeiten, die Höhen und Entfernungen dazwischen angenähert",
      "pathOrbit": "die veröffentlichte Bahn als Kegelschnitt ab dem Ende des Starts, eine Runde; das Taumeln des Satelliten ist nicht gezeichnet",
      "srcWiki": "Sputnik 1, Wikipedia (Ereigniszeiten, Umlaufbahn, Abmessungen), nach NASA, NSSDC und den russischen Quellen, die sie nennt",
      "srcNssdc": "Sputnik 1, NASA NSSDCA Master Catalog (Start und Umlaufbahn)",
      "srcClip": "Das Piepen: NASA-Aufnahme, gemeinfrei, von Wikimedia Commons"
    },
    // 1.7.2 (public #528): Voskhod 2 and STS-1. Machine-drafted like the rest of this file (docs/TRANSLATING.md). Young's words stay as he said them.
    "voskhod-2": {
      "title": "Woschod 2: der erste Weltraumspaziergang",
      "blurb": "Baikonur, 18. März 1965: Alexei Leonow verlässt das Schiff zwölf Minuten lang durch eine aufblasbare Schleuse, und einen Tag später landet die Besatzung von Hand in der Taiga, 386 km von dem Ort entfernt, an dem sie hätte landen sollen.",
      "chPad": "Startplatz 1",
      "chAscent": "Start",
      "chOrbit": "Umlaufbahn",
      "chEva": "Die Schleuse und der Ausstieg",
      "chBack": "Der Weg zurück hinein",
      "chFail": "Die automatische Landung scheitert",
      "chRetro": "Bremszündung von Hand",
      "chEntry": "Wiedereintritt",
      "chLand": "Die Taiga",
      "ready": "T−10 s auf Startplatz 1 in Baikonur: die Woschod-Rakete und, unter ihrer Spitze, die Woschod 3KD mit Pawel Beljajew und Alexei Leonow. 07:00:00 UTC am 18. März 1965. Die gezeichnete Rakete ist die der Wostok-K; die echte hatte eine andere dritte Stufe.",
      "liftoff": "Start. Wie bei Woschod 1 gibt es in den ersten Minuten keinen Abbruch, bis die Spitze abfällt.",
      "boosters": "T+119 s: Die vier Seitenblöcke fallen ab.",
      "shroud": "Etwa bei T+2.5 Minuten: Die Spitze wird abgeworfen, und das Raumschiff ist zum ersten Mal zu sehen, mit der Volga-Schleuse an seine Kugel geklappt.",
      "core": "T+301 s: Die Kernstufe wird freigegeben, und die dritte Stufe, der Blok I, übernimmt für weitere 240 Sekunden.",
      "orbit": "Umlaufbahn: 167 mal 475 km, 64.8 Grad, 90.9 Minuten pro Runde. Eine Wostok-Kugel, eine Bremsrakete oben darauf als Reserve, und zwei Besatzungssitze, wo die Wostok einen Schleudersitz hatte.",
      "volga": "Beljajew bläst die Volga-Schleuse auf: Etwa 40 Luftschläuche versteifen in rund sieben Minuten einen Stoffschlauch von 2.5 m Länge und 1.2 m Breite. Der Moment, in dem er es tat, ist von uns; sie ist schon ausgefahren gezeichnet, nicht beim Aufblasen.",
      "depress": "08:28:13 UTC: Leonow, im Berkut-Anzug und seinem weißen Rucksack, drucklosiert die Schleuse. Die Elektronik des Schiffs wurde durch seine Luft gekühlt, deshalb brauchte man überhaupt eine Schleuse.",
      "hatch": "08:32:54: Die äußere Luke der Schleuse wird geöffnet.",
      "out": "08:34:51: Leonow verlässt die Schleuse, hoch über dem nördlichen Zentralafrika, und stößt sich bis ans Ende seines 5.35 m langen Versorgungsschlauchs. Der erste Mensch im Weltraum außerhalb eines Raumschiffs.",
      "tether": "Er befestigt eine Kamera am Rand der Schleuse und blickt von der Straße von Gibraltar bis zum Kaspischen Meer hinunter. Seine Pose hier ist von einem Bild des Films abgelesen.",
      "swell": "Sein Anzug hat sich im Vakuum aufgebläht: Er erreicht den Auslöser an seinem Bein für die Brustkamera nicht, und Handschuhe und Stiefel sind steif geworden. Um wieder hineinzugelangen, muss er Luft aus dem Anzug ablassen.",
      "back": "Er geht entgegen der Vorschrift mit dem Kopf zuerst hinein und bleibt quer im Schlauch stecken, während er sich dreht, um die äußere Luke zu schließen. Er lässt den Anzugdruck unter die Sicherheitsgrenze fallen, um sich biegen zu können.",
      "inside": "08:47:00: zurück in der Schleuse; die Luke wird um 08:48:40 geschlossen. 12 Minuten 9 Sekunden draußen, vom nördlichen Zentralafrika bis Ostsibirien.",
      "repress": "08:51:54: Die Schleuse wird wieder unter Druck gesetzt. Wenig später zündet Beljajew die Bolzen, und die Schleuse wird abgeworfen (der Moment ist von uns).",
      "jettison": "Die Volga wird freigegeben und taumelt davon; das Schiff kann sie nicht noch einmal nutzen.",
      "auto": "In Umlauf 16 wird das automatische Landesystem vom Boden aus programmiert, aber sein Befehl „6“ kommt nicht durch, angeblich ein Fehler im Sonnenausrichtungssystem. Die etwa jetzt geplante Zündung (ihre Uhrzeit ist von uns, ungefähr) findet nicht statt.",
      "manual": "07:16 UTC, 19. März: Vjezna-3 sagt der Besatzung über Kurzwelle, das Automatiksystem abzuschalten und die manuelle Landung zu nutzen. Beljajew hat noch einen Umlauf zur Vorbereitung.",
      "late": "Die beiden Männer können in ihren Anzügen nicht zu ihren Sitzen zurück, sobald Beljajew das Schiff von Hand mit dem optischen Vzor-Visier gedreht hat. Die Bremszündung kommt 46 Sekunden zu spät.",
      "retro": "Bremszündung von Hand mit dem KTDU-60-Triebwerk. Ihre Uhrzeit und ihr Ort sind von uns: Es war etwa 45 Minuten vor der veröffentlichten Landung, und die Quellen sagen es nicht.",
      "wires": "Das Instrumentenmodul trennt sich nicht sauber; die Kugel taumelt wild, bis die Kabel etwa bei 100 km durchbrennen. (Beim Wiedereintritt schon getrennt gezeichnet, etwas zu früh.)",
      "entry": "Wiedereintritt. Die 46 Sekunden tragen das Schiff etwa 386 km über sein Feld hinaus, in den Wald des Oberen-Kama-Hochlands nordöstlich von Perm.",
      "chutes": "Die Fallschirme. Anders als bei der Wostok katapultiert sich niemand: Die Besatzung landet in der Kugel, mit einer Feststoffrakete, die etwa einen Meter über dem Boden zündet, um den Aufprall abzufangen (nicht gezeichnet).",
      "landing": "09:02:17 UTC: Aufsetzen bei etwa 59.57 N 55.47 E, im tiefen Schnee der Taiga, 75 km von Perm.",
      "taiga": "Die Piloten der Suchhubschrauber finden den roten Fallschirm erst Stunden später. Die Besatzung verbringt zwei Nächte im Wald bei minus 5 und kälter, bevor sie auf Skiern zu einem Hubschrauber gelangen.",
      "pathAscent": "die veröffentlichten Ereigniszeiten, die Höhen und Entfernungen dazwischen angenähert",
      "pathOrbit": "die veröffentlichte Bahn mit einer Tagesdrift, die Bremszündung zu einer Uhrzeit und an einem Ort, die von uns sind, und Wiedereintritt und Schirm dazwischen gezeichnet",
      "srcWiki": "Woschod 2, Wikipedia (die Zeiten des Weltraumspaziergangs, die Umlaufbahn, die Landung)",
      "srcRocket": "Woschod (Rakete), Wikipedia (die Brenndauern der drei Stufen)",
      "srcGrahn": "Sven Grahn, „The Voskhod 2 mission revisited“ (das Scheitern der automatischen Landung, der Ruf nach der manuellen, mit Zitat aus dem Tagebuch von General Kamanin)",
      "srcNssdc": "Woschod 2, NASA NSSDCA Master Catalog (Start und Umlaufbahn)"
    },
    "sts-1": {
      "title": "STS-1: Columbias erster Flug",
      "blurb": "Kennedy, 12. April 1981: John Young und Robert Crippen bringen das erste Space Shuttle vom Startkomplex 39A in den Orbit und gleiten es 54 Stunden später auf den ausgetrockneten See von Edwards.",
      "chPad": "Startkomplex 39A",
      "chAscent": "Start",
      "chSrb": "Die Booster",
      "chMeco": "Haupttriebwerke aus",
      "chOrbit": "Umlaufbahn",
      "chHome": "Der Weg nach Hause",
      "chEntry": "Wiedereintritt",
      "chLand": "Piste 23",
      "ready": "T−10 s am Startkomplex 39A, Kennedy Space Center: Columbia, ein weißer Außentank und zwei Feststoffbooster. 12:00:04 UTC am 12. April 1981, auf den Tag genau zwanzig Jahre nach Wostok 1. STS-1 und STS-2 flogen den Tank weiß lackiert.",
      "ignition": "T−6.6 s: Die drei Haupttriebwerke starten, und der ganze Verband kippt nach vorn, zu den Füßen der Besatzung, und wieder zurück.",
      "liftoff": "Start: Die Booster zünden, als der Verband wieder senkrecht steht. Crippen verglich es mit einem Dampfkatapult. Die Rampe ist schlicht gezeichnet, und der Flammengraben ist von uns.",
      "roll": "Frei vom Turm rollt der Verband auf seinen Kurs, 067 Grad, und neigt sich kopfüber, der Orbiter unter dem Tank, um die Flügel zu schonen. (Schon auf dem Kurs gezeichnet.)",
      "maxq": "T+56 s: Max Q, bei Mach 1.06 und 29 kPa. Die Haupttriebwerke wurden auf 65 Prozent zurückgefahren, um hindurchzukommen.",
      "srb": "T+2 min 12 s: Die Booster, die besser liefen als erwartet, werden in 53 km Höhe abgeworfen, 2.8 km höher als geplant. Sie fallen an Fallschirmen in den Atlantik.",
      "meco": "T+8 min 34 s: Abschalten der Haupttriebwerke in 118 km Höhe.",
      "tank": "18 Sekunden später wird der Außentank freigegeben. Er zerbricht in der Luft und fällt in den Indischen Ozean.",
      "oms1": "T+10 min 34 s: die erste OMS-Zündung, 86 Sekunden, mit den beiden Triebwerken in den Heckkapseln des Orbiters (nicht gezeichnet: die Flamme ist fast unsichtbar).",
      "oms2": "T+44 min 2 s: die zweite Zündung, 75 Sekunden, am höchsten Punkt des Aufstiegs: 246 mal 248 km, 40.3 Grad, 89.9 Minuten. Die Uhrzeit des Apogäums ist die des Berichts; die Bahn dorthin ist von uns.",
      "doors": "Die Laderaumtüren öffnen sich, damit die Kühler arbeiten; vor dem Ende des zweiten Umlaufs, sonst hätte die Besatzung heimkehren müssen. Die Uhrzeit ist von uns. Im Fernsehen sehen sie fehlende Kacheln an den OMS-Kapseln.",
      "oms3": "T+6 h 20 min 46 s und 7 h 05 min 32 s: zwei Einzelschub-Zündungen heben die Bahn auf 274 km. Die Besatzung verbringt etwa 53 Stunden im Orbit und prüft die Maschine.",
      "wake": "Tag 3: Frühstück, verstauen, die Schleudersitzanzüge, und die Laderaumtüren für den Wiedereintritt geschlossen. Young und Crippen schnallen sich an. Ihre Bahn hat 35 Runden gemacht.",
      "deorbit": "Im 36. Umlauf, über dem südlichen Indischen Ozean, eine 160-sekündige Zündung beider OMS-Triebwerke. Ihre Uhrzeit und ihr Ort sind von uns, etwa 55 Minuten vor dem Feld. Young stellt Columbia in die Bug-hoch-Wiedereintrittslage.",
      "entry": "Wiedereintrittsschnittstelle in 120 km Höhe, etwa 8 110 km vom Feld entfernt bei 28 240 km/h. Der Anstellwinkel beträgt 40 Grad, bis das Schlimmste der Erwärmung vorbei ist. Diese Rekonstruktion legt die Schnittstelle über den westlichen Pazifik; der Bericht sagt den östlichen.",
      "blackout": "Ein rosa Schein in 100 km Höhe; beide Männer klappen die Visiere herunter. Etwa 21 Minuten ohne Funk, 16 davon wegen der ionisierten Luft. Den größten Teil des Wiedereintritts fliegen die Computer, mit Rollwenden bei Mach 18.5 und 9.8.",
      "bigsur": "Die kalifornische Küste bei Big Sur bei Mach 7 und 41 km. Columbia ist 583 km quer zu ihrer Bahnspur zum Feld geflogen, das gezeichnet ist.",
      "hac": "Young übernimmt die Steuerung. Wenden bei Mach 4.8 und 2.8 erledigt, eine weite Linkskurve auf die Seebett-Piste 23, ein T-38-Begleitflugzeug schließt auf. Die Größe der Kurve ist von uns.",
      "touch": "T+54 h 20 m 53 s, 18:20:57 UTC: Das Hauptfahrwerk setzt bei 339 km/h auf, langsamer und etwa 800 m weiter die Piste hinunter als geplant, in Edwards, Piste 23. Das Ausfahren des Fahrwerks ist einige Sekunden zuvor gezeichnet.",
      "stop": "Young: „This is the world's greatest all-electric flying machine. I'll tell you that. That was super!“ 36 Umläufe, 1 729 348 km, 2 Tage 6 Stunden 20 Minuten 53 Sekunden.",
      "pathAscent": "die veröffentlichten Ereigniszeiten und Höhen, die Entfernungen dazwischen angenähert",
      "pathOrbit": "die veröffentlichten Zündungen und Bahnen durch Bögen verbunden, die Deorbit-Zündung, Wiedereintritt und Anflug dazwischen gezeichnet; die Uhrzeiten und Orte, die wir gewählt haben, stehen in den Bildunterschriften",
      "srcWiki": "STS-1, Wikipedia (Ereigniszeiten und Höhen, die Umlaufbahnen, die Zündungen, der Wiedereintritt und die Landung), nach den Missionsunterlagen der NASA",
      "srcNssdc": "STS-1 Columbia, NASA NSSDCA Master Catalog (Start und Landung)"
    },
    "hubble-deployment": {
      "title": "Hubbles Freisetzung aus der Discovery",
      "blurb": "STS-31, 25. April 1990: Der Arm hebt das Hubble-Weltraumteleskop aus Discoverys Ladebucht, seine Solarflügel rollen sich aus (einer bleibt stehen), seine Antennen klappen auf, und um 19:38 UTC lässt Steven Hawley es los.",
      "chBay": "In der Ladebucht",
      "chLift": "Aus der Bucht",
      "chArrays": "Die Solarflügel",
      "chStop": "Einer bleibt stehen",
      "chAntennas": "Die Antennen",
      "chSwing": "Zum Freisetzungspunkt",
      "chRelease": "Losgelassen",
      "chAway": "Rückzug",
      "ready": "Flugtag 2, 25. April 1990, 613 km hoch. Discoverys Ladebucht ist offen, und das Hubble-Weltraumteleskop, 13.2 m lang, liegt in seiner Halterung. Wo das Shuttle über der Erde ist und jede Uhrzeit hier außer der Freisetzung, ist von uns gewählt: Die Quellen geben die Freisetzung an und wenig mehr.",
      "grapple": "Der Endeffektor des Arms schließt seine Schlinge um die Greifvorrichtung neben einem der Antennenantriebe des Teleskops. Steven Hawley bedient den Arm vom hinteren Flugdeck. Die Gelenke des Arms sind als zweigliedriger Arm gezeichnet, der jeden Ort erreicht; Telemetrie sind sie nicht.",
      "umbilical": "Das Teleskop schaltet auf eigene Stromversorgung um, und die Versorgung durch das Shuttle wird abgeschaltet (NASA). Die Riegel, die es in der Bucht hielten, zwei an den Rändern und einer am Boden, sind in Form und Zeit von uns.",
      "unberth": "Der Arm hebt das Teleskop senkrecht aus seiner Halterung. Die Uhr und die Höhe sind von uns.",
      "arrays": "Die Solarflügel, für den Start auf Trommeln aufgerollt und am Rohr entlang gefaltet, werden seitlich ausgeschwenkt. Wie sie verstaut waren, ist nach Fotos gezeichnet, nicht nach Konstruktionszeichnungen. Diese ersten Flügel, goldgelb, wurden 1993 ersetzt.",
      "unroll": "Der erste Flügel rollt sich entlang seiner Ausleger auf etwa 7 m mal 2.5 m aus. Wie lange das dauerte, ist von uns.",
      "stop": "Der zweite Flügel kommt ein Stück heraus und bleibt stehen. McCandless und Sullivan warten in der teilweise entlüfteten Luftschleuse, falls ein Weltraumspaziergang nötig ist, um ihn zu lösen. Welcher Flügel es war, wird auf zwei Arten erzählt; der gezeichnete ist von uns gewählt.",
      "wait": "Die Bodenkontrolle versucht es immer wieder, und die Bahn führt durch den Erdschatten und wieder hinaus. Die Freisetzung, für den 19. Umlauf geplant, verschiebt sich um einen. Wie lange es dauerte, und wann, ist von uns.",
      "free": "Der letzte Versuch vom Boden gelingt, und der Flügel rollt sich ganz aus; der Weltraumspaziergang ist nicht nötig. Die Zeit ist von uns.",
      "antennas": "Die beiden Ausleger der Hochgewinnantennen schnellen nach unten und außen heraus, und ihre Schüsseln sind frei. Wie sie gefaltet waren, und wann, ist von uns.",
      "swing": "Der Arm schwenkt das Teleskop in die Freisetzungsposition über der Bucht. Die Route ist von uns.",
      "readyRelease": "Hubbles Lagesysteme werden eingeschaltet und getestet, während der Arm es noch hält. Jedes System wird geprüft, bevor der Arm loslässt (NASA).",
      "release": "19:38 UTC, 25. April 1990, 31 Stunden 4 Minuten nach dem Start: Hawley öffnet die Schlinge, und Hubble ist frei. Jonathan's Space Report gibt 19:38 an; America Space nennt 3:37 p.m. EDT.",
      "away": "Das Teleskop hängt dort, wo man es hingestellt hat, und Discovery weicht zurück. America Space berichtet, auf dem Flugdeck habe man nach einer Kamera gerufen. Der Arm zieht sich zurück.",
      "pulses": "Discovery zündet zweimal kurz seine Triebwerke, um seine Bahn etwas anzuheben, sodass es gleichmäßig zurückbleibt. Die Zeiten und die Stärke der Impulse sind von uns.",
      "trail": "Discovery bleibt etwa zwei Tage lang als Vorsichtsmaßnahme in Hubbles Nähe (NASA); geplant war, ihm in etwa 40 Seemeilen Abstand zu folgen, falls die Blendenklappe Probleme machte.",
      "pathOrbit": "ein Kreis von 613 km bei 28.45 Grad wie veröffentlicht, der Ort darauf von uns gewählt, damit er im Sonnenlicht liegt",
      "pathHst": "das Teleskop ab der Freisetzung, auf der Bahn, in die es entlassen wurde",
      "srcNasa": "STS-31, NASA-Seite im Space-Shuttle-Archiv (Startzeit, Bahn)",
      "srcKit": "STS-31-Pressemappe, NASA (der Einsatzplan, die Aufgaben der Besatzung, der 19. Umlauf, das Folgen)",
      "srcJsr": "Jonathan's Space Report Nr. 36 (Freisetzung um 19:38 UTC, die Verzögerung um einen Umlauf, der Flügel, der sich nicht öffnete)",
      "srcAmerica": "America Space, „Somebody Get a Camera“ (die Flügel, die Antennen, die Triebwerksimpulse, 3:37 p.m. EDT)"
    },
    "falcon9-og2-2": {
      "title": "Die erste Landung einer Falcon 9",
      "blurb": "Cape Canaveral, 21. Dezember 2015: Falcon 9 Flug 20 bringt 11 ORBCOMM-Satelliten auf den Weg, und ihre erste Stufe kehrt zur Landing Zone 1 zurück, die erste Landung der ersten Stufe einer Orbitalrakete.",
      "chPad": "Startkomplex 40",
      "chAscent": "Start",
      "chSep": "Abschaltung und Trennung",
      "chReturn": "Boostback",
      "chEntry": "Der Weg nach unten",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 s, Space Launch Complex 40, Cape Canaveral, 8:29 p.m. am 21. Dezember 2015: Falcon 9 Full Thrust, 70 m hoch, auf ihrem ersten Flug, mit 11 ORBCOMM-Satelliten. Es ist Nacht; die Rakete ist im Licht einer Lampe von uns gezeichnet. SpaceX nennt die Landung „ein zweitrangiges Testziel“.",
      "ignition": "T−3 s: Die neun Merlin-Triebwerke der ersten Stufe zünden.",
      "liftoff": "Start um 01:29:00 UTC am 22. Dezember. Die erste Stufe macht 41 m der 70 aus.",
      "mach1": "T+1:05: Mach 1, wie es die Rekonstruktion der Übertragung angibt.",
      "maxq": "T+1:13: max Q, der Moment, in dem die Luft am stärksten drückt; die Triebwerke wurden dafür gedrosselt.",
      "meco": "T+2:23: Abschaltung der Haupttriebwerke in 75 km Höhe bei 1.67 km/s (die Rekonstruktion der Übertragung; SpaceX hatte T+2:20 geplant).",
      "sep": "T+2:25: Die Stufen trennen sich. Die erste Stufe dreht sich mit ihren Kaltgasdüsen mit dem Heck voran, das ist über etwa eine halbe Minute gezeichnet; wie lange es dauerte, ist von uns.",
      "s2": "T+2:34: Das Vakuumtriebwerk der zweiten Stufe zündet, und sie zieht davon. Ihre Bahn ist nur ein kurzes Stück gezeichnet und ist von uns.",
      "fairing": "T+2:48: Die beiden Hälften der Nutzlastverkleidung, 5.2 m breit, werden abgeworfen.",
      "boostback": "T+3:47: Drei Triebwerke der ersten Stufe zünden für den Boostback-Schub, der ihre Bahn zum Cape zurückdreht. Wie lange sie brennen, ist von uns: in dieser Zeichnung etwa 35 Sekunden.",
      "fins": "Die vier Gitterflossen schwenken aus, um die Stufe durch die Luft zu lenken. Wann das war, ist von uns.",
      "coast": "Die Stufe fliegt über den höchsten Punkt, in dieser Zeichnung etwa 190 km hoch (von uns), und beginnt den Abstieg.",
      "entry": "T+8:01: Drei Triebwerke zünden wieder für den Wiedereintrittsschub, der die Stufe vor der dichten Luft abbremst.",
      "entryEnd": "T+8:21: Der Wiedereintrittsschub ist zu Ende. Beim Fall durch die Luft steuert die Stufe mit ihren Flossen.",
      "landingBurn": "T+9:11: Ein Triebwerk zündet für den Landeschub, der die Stufe auf der Plattform zum Stehen bringen muss. Er dauert 33 Sekunden.",
      "legs": "Die vier Landebeine, für den Flug an der Seite hochgeklappt, schwenken einige Sekunden vor dem Aufsetzen nach unten. Wann, ist von uns.",
      "touch": "T+9:44, 01:38:44 UTC: Die erste Stufe steht auf der Landing Zone 1, einer runden Plattform von 86 m Durchmesser mit einem Kreuz darauf, etwa 9 km südlich der Rampe, die sie verlassen hat. Noch nie war die erste Stufe einer Orbitalrakete gelandet.",
      "sats": "Währenddessen setzt die zweite Stufe die 11 Satelliten aus, von T+14:26 bis T+19:05 (nicht gezeichnet), und zündet dann ihr Triebwerk noch einmal, um zu zeigen, dass sie es kann, für einen späteren Flug.",
      "pathAscent": "die veröffentlichten Ereigniszeiten und die veröffentlichte Höhe und Geschwindigkeit bei der Abschaltung der Haupttriebwerke, der Aufstieg dazwischen ist von uns; die Rakete flog im Dunkeln und ist von einer Lampe beleuchtet gezeichnet",
      "pathBooster": "die veröffentlichten Brennzeiten und der Landeort, der Bogen, seine Geschwindigkeiten und die Länge des Boostbacks von uns als Massepunkt geflogen; von einer Lampe beleuchtet gezeichnet",
      "pathStage2": "die zweite Stufe ab der Trennung, von uns auf dem Weg weitergeschoben, den sie nahm; sie endet, wo das Bild endet",
      "srcKit": "SpaceX, Pressemappe zur ORBCOMM-2-Mission, 21. Dezember 2015 (der Plan: die Zeiten, die Zündungen, die Landung als zweitrangiges Testziel)",
      "srcRecon": "Spaceflight101, „Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites“ (die Ereigniszeiten aus der Übertragung, MECO bei 75 km und 1.67 km/s)",
      "srcWiki": "Falcon 9 Flug 20, Wikipedia (die Startzeit, die Nutzlast, die Wiederzündung der zweiten Stufe)",
      "srcLz": "Landing Zones 1 und 2, Wikipedia (der Ort, und die Plattformen von 282 ft, mit einem X markiert)"
    }
  }
});

// 1.6.3 (internal #995): the sections and strings this file did not have yet (r13Deep, compare, passportKinds, photoCompare, entrances,
// the 1.5 strings and the gaps in card, drawing, cls, templates and the rest), de. Machine-drafted like the rest of this file (docs/TRANSLATING.md):
// drafted by a program from the English, NOT read by a native speaker. A key this file already has is left as it is.
{
  const topUp = (dst, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') topUp(dst[k], src[k]);
      else if (!(k in dst)) dst[k] = src[k];
    }
  };
  topUp(COPY, {
    "card": {
      "rows": {
        "iauName": "Von der IAU anerkannter Name",
        "onBody": "Auf",
        "whenSite": "Wann"
      }
    },
    "drawing": {
      "markOnly": "eine Markierung an seinem Ort; dort gibt es nichts zu zeichnen",
      "noPlace": "nicht gezeichnet: Für ihn lässt sich kein Ort markieren",
      "shower": "ein Name an dem Punkt, aus dem seine Meteore zu kommen scheinen, in der Himmelsansicht nahe dem Maximum; eine Richtung, kein Ort im Raum"
    },
    "klass": {
      "shower": "Meteorstrom"
    },
    "cls": {
      "shower": "eine Richtung am Himmel: der Median der von der IAU veröffentlichten Lösungen für diesen Meteorstrom",
      "noPlace": "für ihn wird kein Ort gezeichnet: Der Körper, auf dem er liegt, ist in dieser App keine Welt",
      "approxPlace": "nach veröffentlichten Koordinaten platziert, auf etwa {n} Grad genau"
    },
    "unplaced": {
      "noDistanceRow": "Nicht gemessen: Der Katalog hat keine Parallaxe dafür",
      "iauApproved": "{name}, anerkannt am {date}"
    },
    "starSystem": {
      "auYearComputed": "{n} AE; das Jahr dort, etwa {y} Jahre, ist daraus und aus der Masse des Sterns berechnet"
    },
    "searchRows": {
      "kinds": {
        "galaxy": "Galaxie",
        "cluster": "Galaxienhaufen",
        "browndwarf": "Brauner Zwerg",
        "whitedwarf": "Weißer Zwerg"
      }
    },
    "templates": {
      "exotic": {
        "kinds": {
          "galaxy": "Galaxie",
          "cluster": "Galaxienhaufen",
          "browndwarf": "Brauner Zwerg",
          "whitedwarf": "Weißer Zwerg"
        },
        "leadGalaxy": "{name} ist eine Galaxie, {dist} Lichtjahre entfernt, dort, wo sie jetzt ist",
        "leadCluster": "{name} ist ein Galaxienhaufen, {dist} Lichtjahre entfernt, dort, wo er jetzt ist",
        "leadBrowndwarf": "{name} ist ein Brauner Zwerg, {dist} Lichtjahre entfernt",
        "leadWhitedwarf": "{name} ist ein Weißer Zwerg, {dist} Lichtjahre entfernt"
      },
      "site": {
        "mpc": "sein Code beim Minor Planet Center ist {code}",
        "closed": "{year} geschlossen",
        "kinds": {
          "launch-site": "Startplatz",
          "landing-site": "Landeplatz"
        }
      },
      "shower": {
        "lead": "{name} ist ein Meteorstrom",
        "peak": "mit dem Maximum etwa am {date}",
        "speed": "mit Meteoren, die mit {n} km pro Sekunde in die Luft eintreten",
        "parent": "aus dem Staub von {parent}"
      }
    },
    "a45": {
      "farNote": "wie weit er jetzt entfernt ist ({how}), aus seiner Rotverschiebung von {z} in der Kosmologie von Planck 2018",
      "comoving": "mitbewegte Entfernung",
      "pulsarDistance": [
        "aus der Parallaxe des Pulsars selbst",
        "die Entfernung des Kugelsternhaufens, Supernova-Überrests oder anderen Objekts, zu dem er gehört",
        "die Schätzung eines Modells aus dem Radiosignal (das Modell YMW16 für die freien Elektronen der Galaxis), keine Messung: Sie kann weit danebenliegen"
      ],
      "shape": {
        "galaxy": "eine Markierung in der Entfernung, die ihre Rotverschiebung ergibt; eine so ferne Galaxie ist höchstens ein paar Pixel groß, ihre Form wird also nicht gezeichnet",
        "browndwarf": "ein Ring in seiner gemessenen Entfernung; ein Brauner Zwerg ist in diesem Maßstab ein Punkt und gibt fast kein sichtbares Licht ab",
        "whitedwarf": "ein Ring in seiner gemessenen Entfernung; der Weiße Zwerg selbst ist in diesem Maßstab ein Punkt",
        "cluster": "eine Markierung im Röntgenzentrum des Haufens; die Mitgliedsgalaxien werden nur für Virgo, Coma, Fornax und Perseus gezeichnet (die Stufe der Lokalen Gruppe)"
      },
      "quasarZ7": "Ein Quasar, gesehen, wie er etwa {age} Millionen Jahre nach dem Urknall war: einer von {n} bekannten jenseits der Rotverschiebung 7.",
      "unplaced": {
        "unnamed": "HYG-Stern {id}",
        "lead": "{name} ist ein Stern in der Richtung, in die du schaust; niemand hat gemessen, wie weit er entfernt ist",
        "leadColour": "{name} ist {a} {colour} Stern in der Richtung, in die du schaust; niemand hat gemessen, wie weit er entfernt ist",
        "note": "Auf den Himmel gezeichnet und nirgends im Raum, denn ein Ort braucht eine Entfernung.",
        "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): nur Richtung und Helligkeit"
      }
    },
    "r13Deep": {
      "card": {
        "dso-tarantula-nebula": "Ihr Licht nahe unserer Blickrichtung ist das Foto von Webb; ihr Gas ist ein Modell einer Höhle um den Haufen R136 in einer Hülle aus leuchtendem Gas, die von Molekülwolken eingefasst wird, nach Pellegrini, Baldwin und Ferland (2011). Noch nicht von einem Astronomen geprüft.",
        "dso-m43": "Ihr Licht stammt aus dem Foto der ESO, ihre Form ist rekonstruiert als kleinere Mulde in derselben dunklen Wolke wie der Orionnebel, beleuchtet vom Stern NU Orionis. Noch nicht von einem Astronomen geprüft.",
        "dso-m51": "Gebaut aus ihrer veröffentlichten Neigung und Struktur: eine Spirale mit zwei Armen, fast von oben gesehen, ihre Begleiterin NGC 5195 hinter dem Ende ihres Nordarms und der Arm, der sie erreicht; die Tiefen sind ein Modell. Noch nicht von einem Astronomen geprüft.",
        "dso-m81": "Gebaut aus ihrer veröffentlichten Neigung und Struktur: ein großer, alter Bulge und zwei eng gewundene Arme mit Staub an der Innenseite. Noch nicht von einem Astronomen geprüft.",
        "dso-m101": "Gebaut aus ihrer veröffentlichten Neigung und Struktur: eine große Scheibe, fast von oben gesehen, viele Arme und ihre riesigen Sternentstehungsgebiete dort, wo der Himmel sie zeigt. Noch nicht von einem Astronomen geprüft.",
        "dso-m104": "Gebaut aus ihrer veröffentlichten Neigung und Struktur: ein riesiger runder Bulge und eine dünne Scheibe, fast von der Kante gesehen, mit ihrem Staubring davor. Noch nicht von einem Astronomen geprüft.",
        "dso-antennae-galaxies": "Zwei zusammenstoßende Galaxien dort, wo der Himmel sie zeigt, und ihre beiden Gezeitenschweife; wie weit jeder Teil davor oder dahinter liegt, ist ein Modell nach den Simulationen des Zusammenstoßes. Noch nicht von einem Astronomen geprüft.",
        "dso-m83": "Gebaut aus ihrer veröffentlichten Neigung und Struktur: eine Balkenspirale, fast von oben gesehen, ihre Arme reich an jungen Sternen und leuchtendem Wasserstoff. Noch nicht von einem Astronomen geprüft.",
        "dso-ngc-1300": "Gebaut aus ihrer veröffentlichten Struktur: ein langer Balken mit Staubbändern an seinen vorderen Kanten und zwei Armen, die von seinen Enden ausgehen, ihre Form dem Foto von Hubble angepasst. Noch nicht von einem Astronomen geprüft.",
        "dso-centaurus-a": "Gebaut aus veröffentlichten Zahlen: eine riesige elliptische Galaxie, von einer verbogenen Scheibe aus Staub und jungen Sternen durchzogen, nach einem Modell, das an die Bilder von Spitzer angepasst ist; ihre beiden Jets sind in Falschfarben gezeichnet, denn sie leuchten im Röntgen- und Radiolicht, nicht im sichtbaren Licht. Noch nicht von einem Astronomen geprüft."
      }
    },
    "compare": {
      "row": "Vergleichen",
      "hint": "maßstabsgetreu",
      "missing": "—",
      "none": "Keine",
      "yes": "Ja",
      "no": "Nein",
      "range": "{a} bis {b}",
      "numUnit": "{num} {unit}",
      "modeLabel": "Ansicht",
      "modes": {
        "pair": "Nebeneinander",
        "lab": "Alle Welten"
      },
      "withLabel": "Vergleichen mit",
      "scaleLabel": "Maßstab",
      "scales": {
        "true": "Maßstabsgetreu",
        "same": "Gleiche Breite"
      },
      "propLabel": "Alle Welten sortieren nach",
      "props": {
        "across": "Breite",
        "mass": "Masse",
        "gravity": "Schwerkraft",
        "temp": "Temperatur",
        "spin": "Dauer einer Drehung",
        "year": "Länge eines Jahres",
        "dist": "Abstand zur Sonne",
        "moons": "Zahl der Monde"
      },
      "names": {
        "sun": "Die Sonne",
        "mercury": "Merkur",
        "venus": "Venus",
        "earth": "Erde",
        "moon": "Der Mond",
        "mars": "Mars",
        "jupiter": "Jupiter",
        "saturn": "Saturn",
        "uranus": "Uranus",
        "neptune": "Neptun",
        "pluto": "Pluto"
      },
      "the": {
        "sun": "die Sonne",
        "moon": "der Mond"
      },
      "wider": "{big} ist {n}-mal so breit wie {small}.",
      "same": "{a} und {b} sind etwa gleich breit.",
      "figure": "{a} und {b}, gezeichnet {how}.",
      "figureTrue": "in einem Maßstab",
      "figureSame": "in gleicher Breite, nicht maßstabsgetreu",
      "tableLabel": "{a} und {b} im Vergleich",
      "rows": {
        "across": "Durchmesser",
        "mass": "Masse",
        "gravity": "Schwerkraft",
        "temp": "Temperatur",
        "spin": "Eine Drehung dauert",
        "year": "Ein Jahr dort",
        "dist": "Von der Sonne",
        "air": "Atmosphäre",
        "pressure": "Luftdruck",
        "moons": "Monde",
        "rings": "Ringe"
      },
      "units": {
        "km": "km",
        "earthOne": "Erde",
        "earths": "Erden",
        "g": "m/s²",
        "c": "°C",
        "hours": "Stunden",
        "days": "Tage",
        "years": "Jahre",
        "au": "AE",
        "bar": "bar",
        "microbar": "µbar"
      },
      "notes": {
        "average": "Mittelwert",
        "flattened": "im Mittel; die Welt ist abgeplattet",
        "range": "ihr Bereich",
        "bar1": "auf der Ebene von 1 bar",
        "edge": "am sichtbaren Rand",
        "photosphere": "die sichtbare Oberfläche",
        "retro": "dreht sich rückwärts",
        "sunSpin": "bei 16° Breite",
        "withEarth": "mit der Erde",
        "exosphere": "eine dünne Exosphäre",
        "photosphereAir": "in der Photosphäre"
      },
      "air": {
        "part": "{share} % {gas}",
        "join": ", ",
        "almostNone": "Fast keine",
        "noSurface": "Keine Oberfläche"
      },
      "gas": {
        "hydrogen": "Wasserstoff",
        "helium": "Helium",
        "methane": "Methan",
        "nitrogen": "Stickstoff",
        "oxygen": "Sauerstoff",
        "argon": "Argon",
        "carbon dioxide": "Kohlendioxid"
      },
      "source": "Planetary Fact Sheets der NASA, gelesen am {date}.",
      "giantNote": "Ein Riese hat keine Oberfläche: Seine Schwerkraft und seine Temperatur gelten auf der Ebene von 1 bar.",
      "moonsNote": "Die Zahl der Monde wächst, wenn neue bestätigt werden.",
      "spinNote": "Die Drehung der Sonne ist der Wert des Datenblatts bei 16° Breite.",
      "drawnTrue": "In einem Maßstab aus dem mittleren Radius jeder Welt gezeichnet, keine Fotos.",
      "drawnSame": "Gleiche Breite, also nicht maßstabsgetreu. Ringe behalten ihren Anteil daran.",
      "tiny": "{name} ist hier kleiner als ein Pixel und wird als Punkt gezeichnet.",
      "ringsDrawn": "Die Ringe sind für das Bild gekippt; ihre Radien sind die der NASA.",
      "labLog": "Die Balken sind logarithmisch, damit kleine Werte sichtbar bleiben.",
      "labLinear": "Die Balken sind proportional zur Anzahl.",
      "labTitle": "Vergleich: {name}",
      "thisCard": "Die Welt auf diesem Steckbrief"
    },
    "passportKinds": {
      "kindsTitle": "Geöffnet, nach Art",
      "noKinds": "Noch nichts, was sich nach Art zählen lässt.",
      "kinds": {
        "worlds": "Planeten, Monde und die Sonne",
        "stations": "Raumstationen",
        "satellites": "Satelliten und ihre Raketen",
        "spacecraft": "Sonden und Weltraumteleskope",
        "small": "Kometen und Asteroiden",
        "stars": "Sterne",
        "exoplanets": "Planeten anderer Sterne",
        "deep": "Nebel, Galaxien und der tiefe Himmel",
        "earth": "Orte und Wetter auf der Erde"
      },
      "notedTitle": "Vermerkt",
      "noNoted": "Noch nichts vermerkt. Öffne einen Ort auf der Karte.",
      "notedFine": "Der Tag, an dem in diesem Browser zum ersten Mal zu sehen war, dass ein Vermerk gilt. Er bleibt hier, wird nie eingeordnet oder gesendet.",
      "noted": {
        "first": {
          "name": "Ein erster Ort",
          "said": "Du hast einen Ort auf der Karte geöffnet."
        },
        "planets": {
          "name": "Alle acht Planeten",
          "said": "Du hast jeden Planeten geöffnet, von Merkur bis Neptun."
        },
        "station": {
          "name": "Eine Raumstation",
          "said": "Du hast eine Station im Orbit geöffnet."
        },
        "craft": {
          "name": "Ein Raumfahrzeug da draußen",
          "said": "Du hast eine Sonde oder ein Weltraumteleskop geöffnet."
        },
        "small": {
          "name": "Ein Komet oder ein Asteroid",
          "said": "Du hast einen kleinen Körper des Sonnensystems geöffnet."
        },
        "star": {
          "name": "Ein Stern",
          "said": "Du hast einen Stern jenseits der Sonne geöffnet."
        },
        "exoplanet": {
          "name": "Der Planet eines anderen Sterns",
          "said": "Du hast einen Planeten geöffnet, der einen anderen Stern umkreist."
        },
        "deep": {
          "name": "Der tiefe Himmel",
          "said": "Du hast einen Nebel, eine Galaxie oder einen Haufen geöffnet."
        },
        "trip": {
          "name": "Eine Reise bis zum Ende",
          "said": "Du hast eine geführte Reise beendet."
        },
        "eyes": {
          "name": "Mit eigenen Augen gesehen",
          "said": "Du hast etwas als gesehen abgehakt."
        },
        "every": {
          "name": "Eins von jeder Art",
          "said": "Du hast von jeder Art oben mindestens eins geöffnet."
        }
      }
    },
    "photoCompare": {
      "title": "Mit dem Foto vergleichen",
      "reconstruction": "Rekonstruktion",
      "photograph": "Foto",
      "valueText": "{n} % Foto",
      "flying": "Flug zu dem Ort, von dem aus das Foto aufgenommen wurde.",
      "note": "Die Karte zeichnet ein 3D-Modell. Das Foto wird nur hier gezeigt: flach und der Sonne zugewandt, dreh dich also weg, und es blendet aus."
    },
    "entrances": {
      "label": "Drei Wege hinein",
      "tonight": "Heute Nacht",
      "tonightTitle": "Was heute Nacht über dir steht, von deinem Ort aus",
      "explore": "Erkunden",
      "exploreTitle": "Die ganze Karte ansehen",
      "trip": "Geführte Reise",
      "tripTitle": "Startet die erste geführte Reise der Liste"
    }
  });
}
// 1.6.3: end

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "Größe und Abstand",
    "size": "Größe",
    "sizeTrue": "echt",
    "sizeValue": "×{n}",
    "sizeTitle": "Wie viel größer als in Wirklichkeit die Welten gezeichnet sind, von echt bis ×{max}",
    "dist": "Abstand",
    "distTrue": "echt",
    "distLog": "logarithmisch",
    "distSome": "{p} % des Wegs zu logarithmisch",
    "distTitle": "Wie stark die Abstände zur Sonne zusammengestaucht werden, von echt bis logarithmisch. Die Richtungen bleiben gemessen.",
    "presets": "Fertige Ansichten",
    "presetTrue": "Echter Maßstab",
    "presetTrueTitle": "Jede Welt in ihrer echten Größe und in ihrem echten Abstand",
    "presetClass": "Klassenzimmer",
    "presetClassTitle": "Welten ×{n} und logarithmische Abstände, wie bei einem Planetenmodell",
    "held": "Eine Reise zeichnet alles echt. Die Regler kommen zurück, wenn sie zu Ende ist.",
    "note": "Wo jede Welt am Himmel steht, ist immer gemessen. Die Plakette sagt, wie viel größer sie gezeichnet ist.",
    "noteSize": "{name}: ×{n} größer gezeichnet als in Wirklichkeit (Regler „Größe“).",
    "noteDist": "Gezeichnet {drawn} AE von der Sonne entfernt, in Wirklichkeit sind es {au} AE, in der echten Richtung (Regler „Abstand“).",
    "noteMoon": "Abstand zu {parent}: {n}-mal so weit gezeichnet wie in Wirklichkeit, in der echten Richtung, damit der Mond außerhalb des vergrößerten Planeten bleibt.",
    "noteSun": "Die Sonne ist ×{n} größer gezeichnet, als sie ist (Regler „Größe“), und hält Abstand zu Merkur.",
    "badgeSun": "Sonne ×{n}",
    "badgeLog": "log. Abstände",
    "badgeSome": "Abstände {p} % zu log.",
    "badgeJoin": " · ",
    "badgeTitle": "Die Regler „Größe“ und „Abstand“ im Bereich Planeten zeichnen diese Ansicht."
  },
  "cutaway": {
    "button": "Hineinschauen",
    "buttonTitle": "Ins Innere schauen: {name}, Schicht für Schicht, in den Tiefen, die die Messungen ergeben",
    "title": "Im Inneren: {name}",
    "close": "Schnitt schließen",
    "model": "Schichten nach {model}.",
    "source": "Quelle",
    "layers": "Schichten, von der Oberfläche nach unten",
    "depthRange": "{top}–{bottom} km",
    "toCentre": "{top} km bis zum Mittelpunkt",
    "cls": {
      "measured": "gemessen",
      "modelled": "modelliert",
      "inferred": "erschlossen"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "Tiefe",
    "probeTitle": "Schiebe von der Oberfläche hinunter bis zum Mittelpunkt",
    "depth": "{km} km tief",
    "atCentre": "der Mittelpunkt",
    "layer": "Schicht",
    "pressure": "Druck",
    "temperature": "Temperatur",
    "density": "Dichte",
    "valueCls": "{value} ({cls})",
    "note": "Die Tiefen stammen aus den Quellen, die Farben sind ausgesucht. Zwischen Ober- und Unterkante einer Schicht zeigt die Sonde Zwischenwerte.",
    "unknown": "Von dieser Welt gibt es noch keinen Schnitt.",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} Millionen GPa",
      "k": "{n} K",
      "millionK": "{n} Millionen K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "Kruste",
      "mantle": "Mantel",
      "upper-mantle": "Oberer Mantel",
      "lower-mantle": "Unterer Mantel",
      "outer-core": "Flüssiger äußerer Kern",
      "inner-core": "Fester innerer Kern",
      "liquid-core": "Flüssiger Kern",
      "iron-core": "Eisenkern",
      "molten-silicate": "Schicht aus geschmolzenem Gestein",
      "partial-melt": "Teilweise geschmolzene Schicht",
      "ice-shell": "Eispanzer",
      "ocean": "Ozean",
      "hp-ice": "Hochdruckeis",
      "rock-mantle": "Gesteinsmantel",
      "rock-core": "Gesteinskern",
      "hydrated-core": "Kern aus Gestein und Eis",
      "molecular": "Wasserstoff und Helium",
      "metallic": "Metallischer Wasserstoff",
      "dilute-core": "Verdünnter Kern",
      "ice-mantle": "Wasser, Ammoniak und Methan",
      "convective": "Konvektionszone",
      "radiative": "Strahlungszone",
      "solar-core": "Kern"
    }
  },
  "helio": {
    "chip": "Heliosphäre · modelliert",
    "chipTitle": "Woraus die Blase um das Sonnensystem gezeichnet ist",
    "legendTitle": "Die Heliosphäre",
    "rowTs": "Terminationsschock: Hier wird der Sonnenwind langsamer als der Schall. Modellierte Form durch die beiden Durchgänge: Voyager 1 bei {a} AE, Voyager 2 bei {b} AE (gemessen).",
    "rowHp": "Heliopause: Hier trifft der Wind der Sonne auf das interstellare Gas. Modellierte Form (Parker 1961) durch die Durchgänge: Voyager 1 bei {a} AE, Voyager 2 bei {b} AE (gemessen).",
    "rowBow": "Bugwelle: Hier staut sich das interstellare Gas vorne auf. Illustrativ: doppelt so weit wie die Heliopause (McComas et al. 2012).",
    "rowRibbon": "IBEX-Band: ein helles Band, das IBEX am Himmel gemessen hat (Funsten et al. 2013). Seine Entfernung ist nicht gemessen: Es ist in {au} AE gezeichnet.",
    "rowMotion": "Der Weg der Sonne durch das lokale interstellare Gas, {v} km/s (IBEX, McComas et al. 2015). Der Pfeil zeigt {years} Jahre davon, {au} AE.",
    "sources": "Orte der Durchgänge aus den Bahnen der Voyager-Sonden in JPL Horizons, an den Daten, die die NASA für die Durchgänge nennt. Formen: Parker 1961, Wilkin 1996, nach Izmodenov & Alexashov 2015 und Opher et al. 2015.",
    "crossing": "{craft}: {surface}, {au} AE, {date}",
    "motion": "Weg der Sonne, {v} km/s",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "Terminationsschock",
      "hp": "Heliopause"
    },
    "surfaceLabel": {
      "ts": "Terminationsschock (modelliert)",
      "hp": "Heliopause (modelliert)",
      "bow": "Bugwelle (illustrativ)",
      "ribbon": "IBEX-Band (am Himmel gemessen)"
    },
    "date": "{d}. {m} {y}",
    "months": [
      "Jan.",
      "Feb.",
      "März",
      "Apr.",
      "Mai",
      "Juni",
      "Juli",
      "Aug.",
      "Sept.",
      "Okt.",
      "Nov.",
      "Dez."
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "Ein Weg um etwas herum, von der Schwerkraft gehalten. Wer seitlich schnell genug ist, fällt immer wieder an der Erde vorbei, statt auf sie.",
  "low Earth orbit": "Die belebte Schale in etwa 200 bis 2 000 km Höhe. Die Station, die meisten Satelliten und die meisten Trümmer sind hier.",
  "geostationary": "Eine Umlaufbahn in 35 786 km Höhe, auf der ein Umlauf so lange dauert, wie die Erde für eine Drehung braucht, 23 Stunden 56 Minuten. So scheint der Satellit über einem Ort stillzustehen.",
  "polar orbit": "Eine Umlaufbahn über die Pole. Die Erde dreht sich darunter weg, deshalb sieht der Satellit irgendwann jeden Teil von ihr.",
  "elements": "Sechs Zahlen und ein Datum, die eine Umlaufbahn beschreiben (Bahnelemente). Gibt man sie in die richtige Mathematik, bekommt man eine Position.",
  "epoch": "Der Moment, in dem ein Satz von Bahnelementen stimmte. Je weiter man davon entfernt ist, desto ungenauer wird die Antwort.",
  "apogee": "Das Apogäum ist der höchste Punkt einer Umlaufbahn um die Erde.",
  "perigee": "Das Perigäum ist der tiefste Punkt einer Umlaufbahn um die Erde.",
  "perihelion": "Das Perihel ist der Punkt, an dem etwas, das die Sonne umkreist, ihr am nächsten kommt.",
  "inclination": "Wie stark eine Umlaufbahn gegenüber dem Äquator geneigt ist (Bahnneigung). Neunzig Grad führen über die Pole.",
  "propagated": "Von einer älteren Messung aus weitergerechnet („fortgeschrieben“). Keine frische Beobachtung, und sie driftet.",
  "lunar distance": "Die Entfernung von der Erde zum Mond, etwa 384 000 km (eine Mondentfernung). Ein praktisches Lineal für Asteroiden-Vorbeiflüge.",
  "astronomical unit": "Die Entfernung von der Erde zur Sonne, etwa 150 Millionen km (eine Astronomische Einheit, AE).",
  "light-time": "Wie lange Licht braucht, um eine Strecke zu durchqueren (Lichtlaufzeit). So lange braucht auch eine Funknachricht.",
  "light-year": "Die Strecke, die das Licht in einem julianischen Jahr zurücklegt, etwa 9,46 Billionen km. Ein Lineal für die Lücken zwischen den Sternen.",
  "magnitude": "Wie hell etwas aussieht (Größenklasse oder Magnitude). Die Skala läuft rückwärts: Kleinere Zahlen sind heller.",
  "azimuth": "Eine Himmelsrichtung in Grad (Azimut). Null ist Norden, 90 ist Osten.",
  "elevation": "Wie hoch etwas über dem Horizont steht, in Grad (Höhe). Neunzig ist senkrecht nach oben.",
  "terminator": "Die Linie zwischen Tag und Nacht auf einer Welt (Terminator).",
  "twilight": "Die Zeit nach Sonnenuntergang, in der der Himmel noch nicht ganz dunkel ist (Dämmerung). Dann sind Satelliten am leichtesten zu sehen.",
  "sunlit": "Noch vom Sonnenlicht getroffen, obwohl der Boden darunter dunkel ist. Das macht einen Satelliten sichtbar.",
  "radiant": "Der Punkt am Himmel, aus dem ein Meteorstrom zu kommen scheint (Radiant).",
  "ZHR": "Ungefähr, wie viele Meteore pro Stunde du unter einem vollkommen dunklen Himmel sähest, wenn der Radiant genau über dir steht. Meistens siehst du weniger.",
  "close approach": "Wenn ein Asteroid nah an der Erde vorbeifliegt. Nah heißt in der Astronomie meist: weiter weg als der Mond.",
  "near-Earth object": "Ein Asteroid oder Komet, dessen Bahn ihn in die Nähe der Erdbahn bringt (erdnahes Objekt).",
  "reentry": "Wenn etwas wieder in die Atmosphäre fällt (Wiedereintritt). Das meiste verglüht auf dem Weg nach unten.",
  "debris": "Tote Satelliten, ausgediente Raketenstufen und Bruchstücke (Weltraumschrott). Zehntausende Teile werden verfolgt.",
  "constellation": "Ein Muster aus Sternen, das Menschen vor langer Zeit benannt haben (Sternbild). Die Sterne darin liegen meist weit voneinander entfernt.",
  "L1": "Ein Gleichgewichtspunkt zwischen Erde und Sonne, etwa 1,5 Millionen km sonnenwärts. Gut, um die Sonne zu beobachten.",
  "L2": "Ein Gleichgewichtspunkt 1,5 Millionen km von der Erde entfernt, auf der sonnenabgewandten Seite, wo ein Teleskop Erde und Sonne hinter sich lassen und kalt bleiben kann.",
  "transit": "Wenn von deinem Standort aus gesehen ein Ding vor einem anderen vorbeizieht (Transit).",
  "conjunction": "Wenn zwei Dinge am Himmel dicht beieinander erscheinen (Konjunktion). Im Raum sind sie nicht nah.",
  "ephemeris": "Eine Tabelle, wo etwas sein wird, im Voraus berechnet (Ephemeride).",
  "umbra": "Der dunkle Kern eines Schattens, in dem das Licht ganz abgeschirmt ist. Im Kernschatten des Mondes verschwindet die Sonne.",
  "penumbra": "Der hellere äußere Teil eines Schattens, in dem nur ein Teil des Lichts abgeschirmt ist. Ein Mond im Halbschatten der Erde wird nur ein wenig dunkler.",
  "totality": "Die Minuten einer totalen Finsternis, in denen die Sonne ganz bedeckt ist. Der Himmel wird so dunkel, dass man Sterne sieht.",
  "annular": "Ringförmig. Bei einer ringförmigen Finsternis ist der Mond zu weit entfernt, um die ganze Sonne zu bedecken, und um ihn bleibt ein heller Ring."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "Zu einem Datum (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "Finden",
    "property": "Nach Eigenschaften finden",
    "countries": "Satelliten nach Land",
    "operators": "Nach Betreiber",
    "clouds": "Trümmerwolken",
    "chartOurs": "Unsere Planeten nebeneinander"
  },
  "find": {
    "title": "Finden",
    "label": "Nach Eigenschaften, nach Land und nach Trümmerwolke finden",
    "tabs": {
      "property": "Eigenschaften",
      "country": "Nach Land",
      "clouds": "Trümmer und Flotten"
    },
    "kindsLabel": "Was du suchst",
    "kinds": {
      "stars": "Sterne",
      "exoplanets": "Planeten",
      "satellites": "Satelliten",
      "comets": "Kometen"
    },
    "presetsLabel": "Fragen",
    "refine": "Verfeinern",
    "presets": {
      "rockyHz50": "Gesteinsplaneten in der habitablen Zone, bis 50 Lichtjahre entfernt",
      "nearStars": "Sterne bis 20 Lichtjahre entfernt",
      "temperate": "Planeten, etwa so warm wie die Erde",
      "hotJupiters": "Heiße Riesen",
      "cometsSoon": "Kometen, die der Sonne bis 2030 am nächsten kommen",
      "geo": "Aktive Satelliten im geostationären Ring",
      "low": "Aktive Satelliten unter 400 km"
    },
    "fields": {
      "within": "Bis (Lichtjahre)",
      "fromHere": "Von der Kamera aus gemessen, nicht von der Sonne",
      "radius": "Radius (Erden)",
      "mass": "Masse (Erden)",
      "teq": "Temperatur (K)",
      "insol": "Sternenlicht (Erde = 1)",
      "height": "Höhe (km)",
      "year": "Gestartet (Jahr)",
      "perihelion": "Sonnennächster Punkt (Jahr)",
      "from": "von",
      "to": "bis",
      "zone": "In der habitablen Zone",
      "zoneWide": "Darin oder an ihrem Rand",
      "rocky": "Gesteinsplanet",
      "working": "Nur aktive",
      "owner": "Eigentümer",
      "operator": "Betreiber",
      "any": "Alle",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "Name",
      "dist": "Entfernung (Lj)",
      "radius": "Radius (Erden)",
      "teq": "Temp. (K)",
      "insol": "Licht",
      "zone": "Zone",
      "spect": "Typ",
      "mag": "Helligkeit",
      "owner": "Eigentümer",
      "height": "Höhe (km)",
      "year": "Start",
      "perihelion": "Perihel",
      "qAu": "Nächster (AE)"
    },
    "zones": {
      "inside": "innen",
      "edge": "Rand",
      "hotter": "zu heiß",
      "colder": "zu kalt"
    },
    "sortTitle": "Nach {col} sortieren",
    "tableLabel": "Was passt, eine Zeile pro Treffer: Tippe auf eine Zeile, um hinzufliegen",
    "status": "{n} gefunden",
    "statusSome": "{n} gefunden; die ersten {shown} stehen hier",
    "none": "Nichts passt. Erweitere einen Bereich oder nimm ein Häkchen weg.",
    "looking": "Suche…",
    "loading": "Lade, was durchsucht wird…",
    "failed": "Die Suche ist nicht gelaufen. Versuch es gleich noch einmal.",
    "rowTitle": "Zu {name}",
    "noRecord": "Nicht auf der Karte gezeichnet",
    "modelled": "Über eine geschätzte Sternmasse berechnet: modelliert",
    "copyLink": "Link zu dieser Frage kopieren",
    "copied": "Link kopiert",
    "honesty": {
      "stars": "Die benannten Sterne aus HYG v4.4, 3 390 Stück, in ihren gemessenen Entfernungen. Gemessen.",
      "exoplanets": "Radius, Masse, Umlaufzeit und Stern: gemessen, NASA Exoplanet Archive. Bahngröße, Sternenlicht, Temperatur und Zone: berechnet; mit * markiert, wo die Masse des Sterns aus seinem Licht geschätzt ist, modelliert. Gesteinsplanet: höchstens 1,6 Erdradien, oder 3 Erdmassen, wenn kein Radius bekannt ist (Rogers 2015).",
      "satellites": "Katalog von CelesTrak, gelesen am {date}. Die Höhe ist das Mittel aus höchstem und tiefstem Bahnpunkt. Gemessen.",
      "comets": "Perihel-Daten aus der Small-Body Database des JPL. Aus gemessenen Bahnen berechnet."
    },
    "chart": {
      "open": "Nebeneinander",
      "openTitle": "Die Planeten von {host} nebeneinander, maßstabsgetreu",
      "title": "{host}, maßstabsgetreu",
      "ours": "Das Sonnensystem",
      "label": "Die Planeten von {host} nebeneinander in ihrer wahren Größe, geordnet vom Stern aus",
      "note": "Ein Maßstab für alle Planeten; die Lücken sind keine Entfernungen. Ein Planet ohne gemessenen Radius ist gestrichelt in mittlerer Größe gezeichnet.",
      "close": "Diagramm schließen"
    },
    "pill": "{name}: {n} hervorgehoben",
    "pillClear": "Hervorhebung aufheben"
  },
  "owners": {
    "modesLabel": "Gruppieren nach",
    "modes": {
      "countries": "Länder",
      "operators": "Betreiber",
      "points": "Lagrange-Punkte",
      "nopath": "Ohne öffentliche Bahn"
    },
    "reading": "Lese den Katalog von CelesTrak (7 MB)…",
    "failed": "Der Katalog wurde nicht geladen.",
    "retry": "Noch einmal versuchen",
    "lead": "{n} Eigentümer haben etwas im Orbit: {total} verfolgte Objekte.",
    "row": "{n} oben",
    "rowSub": "{working} aktiv · {debris} Trümmer",
    "rowTitle": "Hervorheben, was {name} im Orbit hat",
    "joint": "{a} und {b}",
    "ussr": "Der Katalog zählt die Sowjetunion und Russland als einen Eigentümer.",
    "unknown": "Noch unbekannt",
    "byName": "nach Name",
    "byNameTitle": "Gezählt nach den Namen, die seine Satelliten im Katalog tragen",
    "kinds": "{working} aktiv, {dead} außer Betrieb, {rocket} Raketenstufen, {debris} Trümmerteile.",
    "lit": "{n} davon sind auf der Karte gezeichnet und hervorgehoben.",
    "litNone": "Keines davon ist auf der Karte gezeichnet.",
    "show": "Hervorheben",
    "clear": "Aufheben",
    "page": "Seite zu {name}",
    "noPathTitle": "Ohne öffentliche Bahn: {n}",
    "noPathNone": "Jede seiner Nutzlasten im Orbit hat eine öffentliche Bahn.",
    "why": {
      "no-elements": "Keine öffentliche Bahn: Der Katalog führt es, aber es werden keine Bahnelemente veröffentlicht",
      "deep-space": "Jenseits der Erdumlaufbahn, und hier gibt es keine Bahn dafür",
      "deep-drawn": "Jenseits der Erdumlaufbahn: nach seiner JPL-Bahn gezeichnet"
    },
    "points": {
      "sel1": "Sonne–Erde L1",
      "sel2": "Sonne–Erde L2",
      "eml2": "Erde–Mond L2",
      "sel1Why": "1,5 Millionen km zur Sonne hin: ein Blick auf die Sonne, die nie untergeht.",
      "sel2Why": "1,5 Millionen km von der Sonne weg: kalt und dunkel, für Teleskope.",
      "eml2Why": "Hinter der Rückseite des Mondes: ein Relais, das die Rückseite und die Erde zugleich sieht.",
      "empty": "Hier ist derzeit nichts verzeichnet."
    },
    "nopathLead": "{n} Nutzlasten im Orbit haben keine öffentliche Bahn. Die neuesten zuerst:",
    "source": "Satellitenkatalog von CelesTrak, gelesen am {date}: gemessen. Flaggen: Wikimedia Commons, gemeinfrei."
  },
  "breakups": {
    "cloudsTitle": "Trümmerwolken",
    "fleetsTitle": "Konstellationen",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "Ein chinesischer Wettersatellit, am 11. Januar 2007 in 865 km Höhe von einer chinesischen Antisatellitenrakete zerstört: die größte Wolke, die je entstanden ist.",
      "cosmos1408": "Ein toter sowjetischer Satellit, am 15. November 2021 in etwa 480 km Höhe von einer russischen Antisatellitenrakete zerstört.",
      "iridium33": "Ein aktiver Telefonsatellit, am 10. Februar 2009 in 789 km Höhe über Sibirien vom toten Kosmos 2251 getroffen: der erste Zusammenstoß zweier ganzer Satelliten.",
      "cosmos2251": "Ein toter russischer Satellit, der am 10. Februar 2009 in 789 km Höhe Iridium 33 traf."
    },
    "counts": "{up} der {catalogued} katalogisierten Teile sind noch im Orbit.",
    "lit": "{n} auf der Karte hervorgehoben.",
    "spreadTitle": "Zusehen, wie sie sich ausbreitet",
    "steps": {
      "event": "Beim Ereignis",
      "week": "Eine Woche später",
      "year": "Ein Jahr später",
      "today": "Heute"
    },
    "play": "Ab dem Ereignis abspielen",
    "stop": "Anhalten",
    "places": "Zurück zu den heutigen Orten",
    "spreadNote": "Modelliert: Jedes Teil startet an einem Punkt, auf der Bahn, die es heute hat, und driftet, während der Äquatorwulst der Erde seine Bahnebene dreht. Teile, die abgestürzt sind, werden nicht gezeichnet.",
    "source": "Quelle:",
    "fleets": {
      "starlink": "Starlink",
      "oneweb": "OneWeb",
      "kuiper": "Kuiper",
      "qianfan": "Qianfan",
      "gps": "GPS",
      "glonass": "GLONASS",
      "galileo": "Galileo",
      "beidou": "BeiDou",
      "iridium": "Iridium"
    },
    "fleetLit": "{n} auf der Karte hervorgehoben.",
    "fleetNote": "Erkannt an den Namen, die ihre Betreiber ihnen im Katalog geben.",
    "loadingActive": "Lade zuerst alle aktiven Satelliten (7 MB)…",
    "loadingDebris": "Lade zuerst alle verfolgten Trümmerteile (7 MB)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "Zur Minute, in der Fengyun-1C zerstört wurde, und seine Wolke hervorheben"
  },
  "dateJump": {
    "title": "Zu einem Datum",
    "field": "Datum und Uhrzeit (UTC)",
    "text": "Oder tippe es ein",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "Los",
    "hint": "Jeder Zeitpunkt von 1700 bis 2200, in UTC.",
    "errors": {
      "unknown": "Dieses Datum verstehe ich nicht. Versuch 1969-07-20 20:17, 20 July 1969 oder next total eclipse.",
      "range": "Außerhalb von 1700 bis 2200.",
      "empty": "Gib zuerst ein Datum ein.",
      "eclipse": "Keine solche Finsternis zwischen 1700 und 2200."
    },
    "searching": "Suche…",
    "gone": "Jetzt {when}.",
    "eclipse": "{what}, {when}.",
    "eclipses": {
      "sunTotal": "Totale Sonnenfinsternis",
      "sunAnnular": "Ringförmige Sonnenfinsternis",
      "sunPartial": "Partielle Sonnenfinsternis",
      "moonTotal": "Totale Mondfinsternis",
      "moonPartial": "Partielle Mondfinsternis",
      "moonPenumbral": "Halbschatten-Mondfinsternis"
    },
    "rangesTitle": "Wie genau, und wann",
    "ranges": {
      "worlds": "Sonne, Mond und Planeten: 1700 bis 2200, berechnet (astronomy-engine).",
      "satellites": "Satelliten: genau innerhalb einer Woche um heute; nach einem Monat verblasst.",
      "craft": "Raumsonden: nur innerhalb ihrer eigenen JPL-Bahnen.",
      "stars": "Sterne: in der Himmelsansicht um ihre gemessenen Bewegungen versetzt, sobald das Datum mehr als 50 Jahre von heute entfernt ist."
    },
    "quick": {
      "total": "Nächste totale Sonnenfinsternis",
      "lunar": "Nächste Mondfinsternis"
    },
    "missionsTitle": "Aus unseren Missionen",
    "momentsTitle": "Momente",
    "presetsLabel": "Daten zum Hinspringen",
    "faded": "Satelliten verblasst: Ihre Bahnen sind für heute gemessen, nicht für {year}.",
    "close": "Schließen"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "Aus Wikipedia",
    "quotedLive": "Zitiert aus Wikipedia, wie es heute dort steht, von uns nicht geprüft.",
    "quotedBaked": "Zitiert aus Wikipedia, wie es am {date} dort stand, von uns nicht geprüft.",
    "textCredit": "Text: Wikipedia-Autorinnen und -Autoren, CC BY-SA 4.0.",
    "readArticle": "Den ganzen Artikel lesen",
    "inEnglish": "In dieser Sprache gibt es noch keinen Artikel, deshalb ist dies der englische.",
    "family": "Über {fleet} als Ganzes: Für diesen einen Satelliten gibt es keinen Artikel.",
    "photo": "Foto: {artist}, {licence}, über Wikimedia Commons.",
    "photoNoArtist": "Foto: {licence}, über Wikimedia Commons.",
    "photoAlt": "Das Bild oben im Wikipedia-Artikel {title}",
    "loading": "Wikipedia wird gefragt…",
    "read": "Vorlesen",
    "readTitle": "Liest diesen Steckbrief mit der Stimme deines Geräts vor",
    "stop": "Vorlesen beenden",
    "reading": "Wird vorgelesen"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "Tiefe Zeit",
    "back": "−{n} Jahre",
    "on": "+{n} Jahre",
    "backTitle": "{n} Jahre zurück, Datum und Uhrzeit bleiben",
    "onTitle": "{n} Jahre voraus, Datum und Uhrzeit bleiben",
    "presetsLabel": "Andere Polarsterne",
    "presets": {
      "thuban": "Thuban, 2800 v. Chr.",
      "vega": "Wega, 13 700 n. Chr.",
      "far": "50 000 n. Chr."
    },
    "presetTitles": {
      "thuban": "Als die Pyramiden gebaut wurden, war Thuban im Drachen der Polarstern",
      "vega": "Um 13 700 n. Chr. kommt der Pol der Wega bis auf 6,5° nahe",
      "far": "Der Himmel in fünfzigtausend Jahren"
    },
    "yearAd": "{n} n. Chr.",
    "yearBc": "{n} v. Chr.",
    "moved": "Der Himmel von {year}: jeder Stern um seine eigene gemessene Bewegung versetzt.",
    "far": "So weit von heute werden weder Mond noch Planeten gezeichnet, und die Sonne steht, wo der Kalender sie hinstellt.",
    "pole": "Polarstern: {name}, {deg}° vom Pol.",
    "noPole": "Kein heller Stern markiert den Pol: der nächste, {name}, ist {deg}° entfernt.",
    "unnamed": "ein Stern der Größe {mag}",
    "honest": "Die Bewegungen sind gemessen (Hipparcos und Gaia, über HYG); sie über Jahrtausende geradlinig fortzuschreiben, ist modelliert. Die Drehung der Erdachse: Vondrák, Capitaine und Wallace 2011."
  },
  "variables": {
    "label": "Wie sich sein Licht ändert",
    "types": {
      "eclipse": "Ein Bedeckungspaar: zwei Sterne, die voreinander vorbeiziehen.",
      "binary": "Ein enges Paar, aus der Kugelform gezogen, sodass sein Licht nie stillsteht.",
      "pulse": "Ein pulsierender Stern: Er bläht sich auf und schrumpft.",
      "sine": "Ein kleiner, schnell pulsierender Stern.",
      "sr": "Ein halbregelmäßiger Riese: Periode und Spanne sind gemessen, nicht aber, wo im Zyklus er steht, darum ist die Kurve eine Skizze.",
      "irregular": "Ein unregelmäßiger Veränderlicher: Keine Uhr kann sagen, wie hell er ist, darum behält der Himmel die Helligkeit des Katalogs."
    },
    "periodDays": "Periode {n} Tage.",
    "periodYears": "Periode {n} Jahre.",
    "aria": "Lichtkurve von {name}, von Größe {bright} bis {faint}; jetzt {now}.",
    "now": "jetzt",
    "nowLine": "Jetzt Größe {mag} ({band}); Spanne von {bright} bis {faint}.",
    "range": "Spanne von Größe {bright} bis {faint} ({band}).",
    "far": "Die Kurve wird nicht mehr als {years} Jahre von heute fortgeschrieben; Spanne von Größe {bright} bis {faint} ({band}).",
    "nextMin": "Nächstes Minimum: {when}",
    "measured": "Gemessen: die datierten Helligkeiten der Großen Verdunkelung. Elemente: {cite}.",
    "modelled": "Modelliert: Die Form ist aus Periode, Epoche und Spanne des Katalogs gezeichnet ({cite}).",
    "notes": {
      "alf-ori": "2019 und 2020 verblasste er auf Größe 1,6, die Große Verdunkelung: Eine ausgestoßene Staubwolke verdeckte einen Teil von ihm.",
      "omi-cet": "Miras Maxima kommen von Zyklus zu Zyklus Wochen zu früh oder zu spät, so weit können diese Daten danebenliegen.",
      "bet-lyr": "Seine Periode wächst um 19 Sekunden im Jahr; die Kurve folgt der quadratischen Ephemeride von Harmanec und Scholz (1993).",
      "bet-per": "Algols Bedeckungen halten die Minute: Alle 2,87 Tage wird er etwa zehn Stunden lang schwächer.",
      "eps-aur": "Alle 27 Jahre fast zwei Jahre lang bedeckt, von einer dunklen Scheibe um seinen Begleiter; die letzte Bedeckung lief von 2009 bis 2011.",
      "eta-car": "In seinem Großen Ausbruch der 1840er wurde er zum zweithellsten Stern am Himmel.",
      "t-crb": "Eine wiederkehrende Nova: 1866 und 1946 flammte sie bis Größe 2 auf."
    }
  },
  "blackHoleSpin": {
    "spin": "Drehend gezeichnet, mit Spin a = {a}: Der Schatten hat die Form, die ein drehendes Loch wirft (Bardeen 1973), weggeschoben von der Seite, die auf uns zukommt. {why} Das Licht um ihn wird weiter ohne Spin verfolgt, darum ist die Form modelliert.",
    "spinWhy": {
      "m87-star": "Der Spin ist gewählt: Die am besten passenden Modelle von EHT 2019, Teil V, drehen mit 0,94.",
      "sgr-a-star": "Der Spin ist gewählt: EHT 2022, Teil V, bevorzugt 0,5 bis 0,94."
    }
  }
});
// b200-f3-stars: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "Flugbahn",
    "flightTitle": "Eine Kamerabahn zwischen Ansichten planen, vorab ansehen und als Link teilen",
    "record": "Aufnehmen",
    "recordTitle": "Diese Ansicht, eine Flugbahn oder eine Reise als Video aufnehmen",
    "dome": "Kuppel und 360",
    "domeTitle": "Den Himmel als Planetariumskuppel oder als 360-Grad-Bild zeigen",
    "failed": "Das wurde nicht geladen. Versuchen Sie es gleich noch einmal."
  },
  "flight": {
    "title": "Flugbahn",
    "sheet": "Flugbahn: zum Ändern der Größe ziehen",
    "close": "Flugbahn schließen",
    "play": "Abspielen",
    "playTitle": "Die Bahn ab der Stelle des Reglers fliegen",
    "stop": "Stopp",
    "stopTitle": "Den Flug hier anhalten",
    "scrub": "Stelle auf der Bahn",
    "scrubAt": "{at} von {total}",
    "hint": "Fliegen Sie die Karte zu einer Ansicht, die Ihnen gefällt, und drücken Sie dann „Diese Ansicht hinzufügen“. Zwei Ansichten ergeben eine Bahn.",
    "hintOne": "Eine Ansicht. Fliegen Sie woandershin und fügen Sie eine weitere hinzu.",
    "hintMany": "{n} Ansichten. Drücken Sie Abspielen oder ziehen Sie den Regler, um die Bahn entlangzuschauen.",
    "add": "Diese Ansicht hinzufügen",
    "addTitle": "Festhalten, wo die Kamera steht, was sie ansieht, und die Uhr",
    "keysLabel": "Die Ansichten der Bahn, der Reihe nach",
    "keyName": "{n}. {name}",
    "goTitle": "Zu dieser Ansicht gehen",
    "keyLive": "die Uhr, wie sie läuft",
    "point": "Ein Punkt im Raum",
    "duration": "Flug",
    "seconds": "{n} s",
    "ease": "Verlauf",
    "eases": {
      "smooth": "Sanft anfahren und anhalten",
      "cruise": "Reiseflug",
      "constant": "Gleichmäßig"
    },
    "rate": "Uhr",
    "rateLive": "Echtzeit",
    "up": "↑",
    "upLabel": "Ansicht {n} nach vorn",
    "down": "↓",
    "downLabel": "Ansicht {n} nach hinten",
    "replace": "Diese Ansicht nehmen",
    "replaceLabel": "Ansicht {n} durch die jetzige ersetzen",
    "remove": "Entfernen",
    "removeLabel": "Ansicht {n} entfernen",
    "copyLink": "Link kopieren",
    "copyLinkTitle": "Die ganze Bahn in einem Link: nichts wird irgendwo gespeichert",
    "linkCopied": "Link kopiert ({n} Zeichen). Wer ihn öffnet, sieht diesen Flug.",
    "linkInBar": "Der Link steht in der Adresszeile: kopieren Sie ihn dort.",
    "draft": "Reiseentwurf speichern",
    "draftTitle": "Ein Entwurf einer Reisedatei für die Reisen der Karte, von einem Menschen fertigzustellen",
    "draftSaved": "Reiseentwurf gespeichert. Die Karten schreiben Sie.",
    "record": "Diesen Flug aufnehmen",
    "recordTitle": "Den Flug als Video aufnehmen",
    "clear": "Leeren",
    "clearTitle": "Alle Ansichten entfernen",
    "needTwo": "Eine Bahn braucht mindestens zwei Ansichten.",
    "full": "Eine Bahn fasst höchstens {n} Ansichten.",
    "noView": "Diese Ansicht lässt sich nicht festhalten: schauen Sie zuerst etwas an.",
    "badLink": "Dieser Fluglink ließ sich nicht lesen.",
    "honesty": "Jede Ansicht zeigt die Dinge dort, wo sie zu ihrer Uhrzeit sind. Die Flüge dazwischen sind Kamerafahrten, die wir zeichnen, nicht die Bahn eines Raumfahrzeugs."
  },
  "record": {
    "title": "Aufnehmen",
    "sheet": "Aufnehmen: zum Ändern der Größe ziehen",
    "close": "Aufnehmen schließen",
    "whatLabel": "Was aufgenommen wird",
    "sourceView": "Diese Ansicht",
    "sourcePath": "Die Flugbahn",
    "sourceTrip": "Die Reise bis zum Ende",
    "length": "Länge",
    "seconds": "{n} Sekunden",
    "shapeLabel": "Format",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "Quadratisch",
      "tall": "Hochformat 9:16 (Reels, TikTok, Shorts)"
    },
    "smooth": "Bild für Bild (auf jedem Gerät flüssig)",
    "smoothNote": "Die Seite lädt diese Ansicht mit einer eigenen Uhr neu und zeichnet jedes Bild fertig, bevor es aufgenommen wird: Ein langsames Gerät nimmt langsam auf, aber nie ruckelig.",
    "silent": "Bild für Bild wird kein Ton aufgenommen.",
    "withSound": "Der Ton, den Sie hören, wird mit aufgenommen.",
    "noSound": "Der Ton ist aus, das Video bleibt stumm. Schalten Sie den Ton zuerst ein, um Stimme und Musik der Reise mitzunehmen.",
    "start": "Aufnahme starten",
    "stop": "Stopp",
    "save": "Video speichern",
    "share": "Video teilen",
    "saved": "Video gespeichert.",
    "cannot": "Dieser Browser kann kein Video aufnehmen. Aktuelle Versionen von Chrome, Edge, Safari und Firefox können es.",
    "rolling": "Aufnahme: {at} s",
    "made": "Fertig: {mb} MB. Speichern oder teilen Sie es.",
    "empty": "Der Browser hat nichts aufgenommen. Versuchen Sie es noch einmal oder wählen Sie Bild für Bild.",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · Karten und Daten: NASA, ESA, Solar System Scope und andere",
    "endTitle": "Sehen Sie selbst",
    "endLine": "Space Radar: kostenlos, im Browser.",
    "endCredit": "Karten und Daten: NASA, ESA, USGS, Solar System Scope, HYG und andere, unter ihren eigenen Lizenzen (CC BY, CC BY-SA). Nachweise auf spaceradar.ai.",
    "filmTitle": "Aufnahme Bild für Bild",
    "filmWarming": "Die Ansicht wird vorbereitet…",
    "filmFrame": "Bild {n} von {total}",
    "filmDone": "Fertig: {mb} MB, {s} Sekunden. Die Datei ist gespeichert.",
    "filmFailed": "Die Aufnahme wurde abgebrochen: {why}",
    "back": "Zurück zur Karte"
  },
  "dome": {
    "title": "Kuppel und 360",
    "sheet": "Kuppel und 360: zum Ändern der Größe ziehen",
    "close": "Kuppel und 360 schließen",
    "kindLabel": "Wie der Himmel gezeichnet wird",
    "normal": "Normal",
    "dome": "Kuppel, 180 Grad (Planetarium)",
    "wide": "360 Grad (YouTube 360)",
    "tilt": "Neigung der Kuppel",
    "tiltDeg": "{n}°",
    "size": "Größe",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "Dieses Bild speichern",
    "skySize": "Skybox-Seite",
    "saveSky": "Eine Skybox speichern",
    "saved": "Gespeichert: {w} × {h} px.",
    "saveFailed": "Das Bild ließ sich nicht zeichnen.",
    "intro": "Ein Kuppelbild oder ein 360-Grad-Bild dessen, was die Kamera sieht, live. Solange es an ist, sind die Namen ausgeblendet.",
    "live": "Live, {n} px je Seite.",
    "livePhone": "Live mit {n} px je Seite: Auf einem Telefon ist das eine Vorschau. Speichern Sie ein Bild für ein scharfes.",
    "noGpu": "Die Grafik dieses Geräts kann es nicht zeichnen.",
    "busy": "Schließen Sie zuerst die erdachte Welt oder den Moment: Er zeichnet sein eigenes Bild.",
    "off": "Zurück zum normalen Bild.",
    "credit": "Frei nutzbar mit diesem Nachweis: Space Radar, spaceradar.ai. Karten und Daten: NASA, ESA, USGS, Solar System Scope, HYG und andere; die Quellenliste nennt jede Lizenz.",
    "how": "Für eine Kuppel hängen Sie #proj=dome,30 an den Link einer Reise und öffnen ihn im Vollbild. docs/PLANETARIUMS.md beschreibt die Schritte."
  }
});
// b200-f5-make: end
