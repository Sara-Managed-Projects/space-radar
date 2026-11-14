// fr: French (France), the words of site/js/copy/en.js, en.later.js and en.facts.js (public #525, spec 0077 W2-f).
// Fetched by copy/index.js only when the page speaks French (?lang=fr). docs/TRANSLATING.md says how it was made.
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English, aiming at natural
// French and not a word-for-word copy, and has NOT been read by a native speaker yet. Until a second native
// speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks French only to a visitor who asks for it (?lang=fr), never from the browser's language.
// The checker prints this status in its table: node scripts/check-translation.mjs --table
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: the informal "tu". The app talks to a curious fourteen-year-old and to a family or a class, and the French
//     popular-science sites and programmes for that reader (Les Petits Débrouillards, the planetarium and museum sites for
//     children and families, Duolingo-style apps) use "tu". Instructions are second-person singular imperatives ("Touche",
//     "Glisse", "Indique où tu es"); a button that names an action is the bare infinitive ("Partager", "Embarquer").
//   * Honesty words, one word each, everywhere (grep tr/ to check):
//       measured = mesuré             worked out / computed = calculé        modelled = modélisé
//       illustrative = illustratif    reconstructed = reconstitué            artist's impression / render = vue d'artiste
//       sample = échantillon          estimate / estimated = estimation / estimé     imagined (exoplanet faces) = imaginé
//       inferred (only where English says "inferred", not "worked out") = déduit      propagated = propagé / prolongé
//       "about" = environ / à peu près    "at least" = au moins    "not measured" is never softened (non mesuré).
//     "drawn" is always "dessiné"; "generated" is "généré".
//   * Names: the Sun, the Moon and the planets take their French names (Mercure, Vénus, Terre, Lune, Saturne, Pluton; Io, Europe,
//     Ganymède, Callisto, Encelade, Téthys, Dioné, Rhéa, Japet, Obéron; Titan, Triton, Charon, Phobos, Deimos, Miranda, Ariel,
//     Umbriel, Titania are the same). COPY.worlds carries the article ("le Soleil", "la Terre", "la Lune") like the English
//     "the Sun" and the Spanish "el Sol"; templates that take {world} put it after "autour de", "sur", "derrière", or after a
//     colon, never after "de" (which would give "de le Soleil"). Spacecraft, stars, catalogue entries and agencies keep their names.
//     Constellation names inside prose are French where there is a settled name (la Carène, la Poupe, les Voiles, le Serpent).
//   * Words: "fiche" is a card, "carte" is the map, "voyage" a trip, "étape" a stop, "couche" a layer, "panneau" a panel,
//     "volet" the phone's bottom sheet, "Aspect" the Look panel (Mesuré / Cinéma), "visite" the tour, "Son" the sound,
//     "Pose" the Exposure panel (Œil / Caméra / Profonde), "Direct" is Live, "pluie d'étoiles filantes" a meteor shower.
//   * Numbers: the decimal sign is a comma (RULES.decimal) and groups of three digits are written with the app's narrow
//     no-break space. Large numbers: million, milliard (10^9), billion (10^12). The glossary writes the light-year as
//     "9 460 milliards de km" rather than "9,46 billions", to spare a reader the English "billion" false friend. AU is "UA",
//     light-year is "année-lumière" ("al" in tight spots), a percent sign has a no-break space before it ("45 %").
//   * Typography: a narrow no-break space (U+202F) before ? ! ; and inside « », a no-break space (U+00A0) before ":" and
//     between a number and a unit; the apostrophe is ’.
//   * The compass is written as the locative form, so that one string serves "regarde au sud-ouest" and "à l'est":
//     "au nord", "au nord-est", "à l'est", "à l'ouest-sud-ouest". The short points use French letters: N NNE NE ENE E ESE SE SSE
//     S SSO SO OSO O ONO NO NNO (O is ouest). A pair "from {from} to {to}" is written "{from} → {to}".
//   * Number words (COPY.numberWords): aucun, un, deux ... dix. A fist (poing) measures height: "à environ deux poings
//     au-dessus de l'horizon".
//   * Catalogue type phrases (a galaxy's "spiral galaxy", a nebula's "emission nebula") come in English from the data; RULES.typeWords
//     turns the 46 phrases the catalogue holds into French ("galaxie spirale barrée vue par la tranche") and RULES.article gives
//     un/une from the head noun.
//
// NOTES, questions for a reviewer (by key; nothing here was changed to make it easier):
//   * nextList.eclipseNear / eclipseFrom: "près de {city}" and "à environ {km} km de {city}" give "de Adelaide", "de Auckland"
//     for a city that begins with a vowel (copy/en.js CITIES are English names). Elision cannot be done from a string.
//   * card.values.millionSuns, billionYearsAgo, millionYearsAgo: written in the plural ("millions"), right from 2 up; a value
//     between 1 and 2 million would read "1,4 millions" where French writes "1,4 million".
//   * card.it / leadVerbs: the card turns "{name} est ..." into "Ceci est ..." under a title that already names the object;
//     "C'est ..." would be better but the code joins with a space ("C' est"). articles is ["Le", "le"] (two items, as English).
//   * r12Navigate.the / theWord: the English list of names that take "the" cannot carry French genders (le Soleil, la Lune,
//     la Voie lactée), and an empty string falls back to English (copy/index.js), which would print "the Sun". the is set to
//     placeholders that never match (∅), so the button reads the registry name alone; theWord stays empty on purpose (same
//     pattern as Portuguese).
//   * Names that come from the registry (object names, "Earth", "the Moon", a star's host, a shower's name, the type of a
//     rocket mission, an exoplanet's discovery method) are English and are put into French sentences as they are.
//   * sky.worldFrom.*: the English "rises {rise} in the {riseDir}" is written as nouns ("lever à 09:46, à l'est") so that no
//     verb has to agree with the body (Lune is feminine, Mars is not).
//   * tonight.best.phases: written as full capitalised phrases ("Premier croissant", "Lune gibbeuse croissante") because the code
//     uses them alone (Today card title, time-pill mark), not after "Moon".
//   * 033 drawing.worldDeparture.venus and others are long single sentences, kept as one string as in English.
//   * tests/test_chrome_copy.mjs: one line still over its 60 characters, tonight.skybar.honesty ("Étoiles mesurées, planètes
//     calculées, air modélisé, sol dessiné.", 64): the four honesty words cannot be said in fewer without dropping one of the four
//     claims (the Spanish fails the same line). Every other chrome line fits at its width.
//   * card.regime.round is "Orbite : {world}" and card.rows.heightAbove "Altitude sur {world}" for that reason ("autour d'Uranus").

export const META = {
  code: 'fr',
  name: 'Français',
  english: 'French',
  review: { status: 'agent-reviewed', by: [], note: 'Needs a second native speaker (docs/TRANSLATING.md, Review).' },
};

// The grammar English had as code (copy/en.js `article`, `typeWords`): French needs the gender of a type word.
const FEMININE = new Set([
  'galaxie', 'nébuleuse', 'région', 'paire', 'étoile', 'planète', 'tempête', 'dépression', 'station', 'fusée', 'sonde', 'comète',
  'constellation', 'antenne', 'lune', 'super-terre', 'mini-neptune', 'géante', 'orbite', 'rampe',
  // Star colours (COPY.templates.star.colours) agree with "étoile".
  'bleue', 'blanche', 'blanc', 'jaune', 'orange', 'rouge',
]);

// The 46 type phrases data/dso.json holds (English, as the catalogue writes them), in French. Keys are lower case.
const TYPES = {
  'globular cluster': 'amas globulaire',
  'open cluster': 'amas ouvert',
  'dwarf spheroidal galaxy': 'galaxie naine sphéroïdale',
  'spiral galaxy': 'galaxie spirale',
  'emission nebula': 'nébuleuse en émission',
  'planetary nebula': 'nébuleuse planétaire',
  'dwarf irregular galaxy': 'galaxie naine irrégulière',
  'barred spiral galaxy': 'galaxie spirale barrée',
  'elliptical galaxy': 'galaxie elliptique',
  'lenticular galaxy': 'galaxie lenticulaire',
  'h ii region nebula with cluster': 'région H II avec un amas',
  'h ii region nebula': 'région H II',
  'dwarf elliptical galaxy': 'galaxie naine elliptique',
  'barred irregular galaxy': 'galaxie irrégulière barrée',
  'ultra-faint dwarf galaxy': 'galaxie naine ultra-faible',
  'dark nebula': 'nébuleuse sombre',
  'young open cluster in an emission nebula': 'jeune amas ouvert dans une nébuleuse en émission',
  'supernova remnant': 'rémanent de supernova',
  'nebula with cluster': 'nébuleuse avec un amas',
  'milky way star cloud': 'nuage d’étoiles de la Voie lactée',
  'optical double': 'étoile double optique',
  'asterism': 'astérisme',
  'diffuse nebula': 'nébuleuse diffuse',
  'starburst galaxy': 'galaxie à sursaut de formation d’étoiles',
  'dwarf irregular starburst galaxy': 'galaxie naine irrégulière à sursaut de formation d’étoiles',
  'transition dwarf galaxy, part irregular, part spheroidal': 'galaxie naine de transition, en partie irrégulière, en partie sphéroïdale',
  'transition dwarf galaxy, part spheroidal, part irregular': 'galaxie naine de transition, en partie sphéroïdale, en partie irrégulière',
  'barred irregular galaxy, seen edge-on': 'galaxie irrégulière barrée, vue par la tranche',
  'ultra-faint dwarf galaxy, or perhaps a star cluster': 'galaxie naine ultra-faible, ou peut-être un amas d’étoiles',
  'spiral galaxy, seen nearly edge-on and bursting with new stars': 'galaxie spirale, vue presque par la tranche et riche en jeunes étoiles',
  'peculiar galaxy with a giant black hole firing radio jets': 'galaxie particulière avec un trou noir géant qui lance des jets radio',
  'pair of open clusters': 'paire d’amas ouverts',
  'spiral galaxy seen exactly edge-on': 'galaxie spirale vue exactement par la tranche',
  'reflection nebula': 'nébuleuse par réflexion',
  'reflection and emission nebula': 'nébuleuse par réflexion et en émission',
  'spiral galaxy seen edge-on': 'galaxie spirale vue par la tranche',
  'barred spiral galaxy seen edge-on': 'galaxie spirale barrée vue par la tranche',
  'spiral galaxy seen face-on': 'galaxie spirale vue de face',
  'barred spiral galaxy seen nearly edge-on': 'galaxie spirale barrée vue presque par la tranche',
  'pair of colliding galaxies': 'paire de galaxies en collision',
  'barred spiral galaxy — the one we live in': 'galaxie spirale barrée — celle où nous vivons',
};

export const RULES = {
  /** The decimal sign (copy/en.js num() reads it). */
  decimal: ',',
  /** French: one for |n| < 2 (0, 1 and 1,5 are singular), many from 2. */
  plural(n, one, many) {
    return Math.abs(Number(n)) < 2 ? one : many;
  },
  /** "un" or "une" for a French type phrase, by its head noun: "une galaxie spirale", "un amas ouvert", "une étoile" (a colour: "bleue"). */
  article(phrase) {
    const words = String(phrase || '').trim().toLowerCase().split(/\s+/);
    let first = words[0] || '';
    if (first === 'jeune' && words[1]) first = words[1];
    return FEMININE.has(first) ? 'une' : 'un';
  },
  /** The catalogue's English type phrase in French (lower case, for the middle of a sentence); an unknown phrase is lowered as English does. */
  typeWords(text) {
    const s = String(text || '').trim();
    const hit = TYPES[s.toLowerCase()];
    if (hit) return hit;
    return s.split(/(\s+)/).map((w) => (/^[A-Z0-9]{1,3}$/.test(w) ? w : w.toLowerCase())).join('');
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "Construction du ciel…",
    "bootEarth": "Mise en place de la Terre…",
    "bootCatalogues": "Lecture des catalogues…",
    "tagline": "Tout ce qui se déplace autour de la Terre, à sa vraie position, en ce moment.",
    "sceneSelected": "Une carte de l’espace dessinée aux positions réelles, avec {name} sélectionné : sa fiche, dans le panneau à côté de la carte, dit ce que c’est."
  },
  "compareText": {
    "size": [
      "à peu près la taille d’un grille-pain",
      "à peu près la taille d’un lave-linge",
      "à peu près la taille d’une voiture",
      "à peu près la taille d’un bus",
      "à peu près la taille d’une maison",
      "aussi haut qu’un immeuble de 15 étages",
      "aussi haut qu’un immeuble de 25 étages",
      "à peu près la taille d’un terrain de football",
      "aussi haut qu’une tour de 40 étages",
      "à peu près la taille d’un paquebot",
      "aussi haut que le plus haut bâtiment du monde",
      "à peu près la taille d’une petite montagne",
      "à peu près la taille d’une ville"
    ],
    "magnitude": [
      "aussi brillant que la pleine Lune",
      "plus brillant que n’importe quelle étoile ou planète",
      "aussi brillant que Vénus",
      "aussi brillant que les étoiles les plus brillantes",
      "aussi brillant qu’une étoile ordinaire",
      "tout juste visible depuis un endroit sombre",
      "trop faible pour être vu sans télescope"
    ],
    "speed": [
      "{n} km/h, la vitesse sur autoroute",
      "{n} km/h, à peu près la vitesse d’un avion de ligne",
      "{n} km/h, plus vite qu’une balle de fusil",
      "{n} km/h, environ {m} km chaque minute"
    ],
    "driving": "à {n} km d’altitude, environ {h} {word} de route si elle montait tout droit",
    "hour": "heure",
    "hours": "heures",
    "up": "à {n} km d’altitude",
    "moon": "{ld} fois la distance de la Lune",
    "lightMinutes": "à {lt} minutes-lumière",
    "lightHours": "à {lh} heures-lumière",
    "compass": [
      "au nord",
      "au nord-nord-est",
      "au nord-est",
      "à l’est-nord-est",
      "à l’est",
      "à l’est-sud-est",
      "au sud-est",
      "au sud-sud-est",
      "au sud",
      "au sud-sud-ouest",
      "au sud-ouest",
      "à l’ouest-sud-ouest",
      "à l’ouest",
      "à l’ouest-nord-ouest",
      "au nord-ouest",
      "au nord-nord-ouest"
    ]
  },
  "numberWords": [
    "aucun",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
    "dix"
  ],
  "shell": {
    "sideLabel": "Explorer",
    "back": "Explorer",
    "backLabel": "Retour à Explorer",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "Afficher le panneau",
    "collapse": "Masquer le panneau",
    "topLabel": "Recherche et outils"
  },
  "tabs": {
    "label": "Où",
    "earth": "Terre",
    "planets": "Planètes",
    "stars": "Étoiles",
    "tonight": "Ce soir"
  },
  "rightNow": {
    "title": "En ce moment",
    "storms": "{n} tempêtes tournent, {name} est la plus forte.",
    "stormOne": "Une tempête tourne : {name}.",
    "clouds": "Nuages du jour",
    "people": "Humains dans l’espace",
    "iss": "ISS",
    "tiangong": "Tiangong",
    "crewAt": "{n} sur {name}"
  },
  "statusLine": {
    "reading": "Lecture des sources",
    "read": "{n} lues pendant cette visite",
    "readOne": "Une lue pendant cette visite",
    "stale": "{n} périmées",
    "failed": "{n} illisibles",
    "oldest": "la plus ancienne : {age}",
    "open": "Ouvrir les sources",
    "label": "{text}. Ouvrir les sources",
    "offline": "Hors ligne : copies enregistrées {age}",
    "offlineNone": "Hors ligne : aucune copie enregistrée sur cet appareil"
  },
  "mission": {
    "title": "Sa mission",
    "count": "{i} sur {n}",
    "navLabel": "Événements : {name}",
    "prev": "Événement précédent",
    "next": "Événement suivant",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (prévu)",
    "go": "Aller à ce moment",
    "goTitle": "Régler l’horloge sur ce moment et le cadrer",
    "here": "L’horloge est sur ce moment. « Direct » la ramène au présent.",
    "noteSite": "La carte peut montrer ce lieu ce jour-là, sous la lumière de ce jour-là.",
    "notePath": "La carte garde sa trajectoire pour ce jour-là.",
    "noteCruise": "Pas de trajectoire de notre part pour ce jour-là : {name} est dessiné sur la droite qui remonte depuis l’endroit où il est mesuré aujourd’hui, avec une précision d’environ une unité astronomique.",
    "noteNone": "La carte n’a pas de trajectoire pour {name} ce jour-là, donc l’horloge reste où elle est.",
    "noteNoneWorld": "La carte n’a pas de trajectoire pour {name} ce jour-là, donc l’horloge reste où elle est. Le monde qu’il a rencontré se dessine à n’importe quelle date.",
    "seeWorld": "Voir {world} ce jour-là",
    "seeWorldTitle": "Régler l’horloge sur ce jour et aller vers {world}. {name} lui-même n’y est pas dessiné",
    "all": "Les {n} événements",
    "fewer": "Masquer la liste",
    "source": "Dates et chiffres : ",
    "unknown": "Ce lien désigne un événement que la carte ne connaît pas."
  },
  "tripCard": {
    "title": "Voyages",
    "meta": "{n} étapes · {m} min",
    "metaOne": "Une étape · {m} min",
    "planning": "Calcul des étapes",
    "starting": "Démarrage…",
    "cannotRun": "Impossible pour le moment",
    "offOne": "Un voyage est impossible pour l’instant",
    "offMany": "{n} voyages sont impossibles pour l’instant",
    "offWhy": "{line} : {reason}",
    "all": "Les {n} voyages",
    "fewer": "Moins de voyages",
    "onItsOwn": "Enchaîner seul",
    "onItsOwnTitle": "Les voyages s’enchaînent jusqu’à ce que tu reprennes les commandes",
    "justWatch": "Juste regarder",
    "reelLength": "{m} min par tour",
    "drift": "Dérive",
    "driftLength": "sans fin",
    "driftTitle": "La caméra erre d’une chose à l’autre"
  },
  "explore": {
    "worldsTitle": "Les mondes",
    "worldsDrawn": "Planètes dessinées en points, plus grosses qu’en vrai.",
    "farTitle": "Lieux lointains",
    "systemsTitle": "Systèmes d’étoiles",
    "systemsMild": "Planètes près de la zone habitable",
    "systemsExtreme": "Systèmes extrêmes",
    "exoRow": "Planètes d’autres étoiles",
    "exoShow": "afficher",
    "exoHide": "masquer",
    "exoTitle": "Marque chaque étoile connue pour avoir des planètes",
    "lightYears": "{n} al",
    "au": "{n} UA"
  },
  "rail": {
    "label": "Outils",
    "show": "Quoi afficher (L)",
    "share": "Partager (P)",
    "more": "Plus d’outils",
    "moreLabel": "Plus",
    "menuShare": "Partager",
    "menuHide": "Masquer les panneaux",
    "menuGitHub": "Code sur GitHub",
    "blog": "Blog",
    "blogHref": "https://blog.spaceradar.ai/",
    "models": "Modèles",
    "modelsHref": "https://models.spaceradar.ai/",
    "video": "Vidéo",
    "videoHref": "https://video.spaceradar.ai/",
    "tour": "Faire la visite",
    "menuTour": "Faire la visite"
  },
  "timePill": {
    "label": "Heure",
    "when": "{date} {time} UTC",
    "live": "DIRECT · {when}",
    "held": "{when} · figé",
    "away": "{when} · {off}",
    "unknown": "Heure inconnue",
    "prev": "‹",
    "next": "›",
    "prevTitle": "Reculer dans le temps",
    "nextTitle": "Avancer dans le temps",
    "backToLive": "Direct",
    "backToLiveTitle": "Retour à l’heure réelle, maintenant",
    "rate": "{n}×",
    "rateTitle": "Vitesse {n}×. Appuie pour passer à {next}×",
    "hold": "Clique pour figer le temps, glisse pour le parcourir",
    "run": "Clique pour relancer le temps, glisse pour le parcourir",
    "localTitle": "Ton heure : {time}, {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "1 min",
      "hour": "1 h",
      "day": "1 jour",
      "event": "Événement"
    },
    "unitWords": {
      "minute": "une minute",
      "hour": "une heure",
      "day": "un jour",
      "event": "un événement"
    },
    "prevEvent": "L’événement d’avant",
    "nextEvent": "L’événement suivant",
    "noEventBack": "Aucun événement plus tôt sur la frise.",
    "noEventOn": "Aucun événement plus tard sur la frise.",
    "moonMark": "{phase}, {date}",
    "sunMark": "{what} chez toi, {date}",
    "sunMarkGuess": "{what} à l’endroit deviné pour toi, {date}",
    "sunWords": {
      "sunrise": "Lever du Soleil",
      "sunset": "Coucher du Soleil"
    },
    "unitTitle": "Pas de {unit}. Appuie pour passer à {next}",
    "tapeLabel": "Frise du temps. Fais-la glisser, ou utilise les flèches du clavier",
    "tapeTitle": "Glisse pour parcourir le temps",
    "now": "maintenant",
    "nowTitle": "Retour à maintenant",
    "rough": "approximatif",
    "roughTitle": "Au-delà d’une semaine, la place d’un satellite sur son orbite n’est plus qu’approximative",
    "roughSay": "Si loin du présent, les positions des satellites sont approximatives.",
    "worlds": "Planètes et lunes restent justes pendant des siècles.",
    "markTitle": "{what}. Appuie pour y aller",
    "endTitle": "La frise s’arrête ici : un mois en arrière, un an en avant"
  },
  "punctuation": {
    "comma": ", ",
    "dot": ".",
    "separator": " · ",
    "listJoin": ", ",
    "dash": " — ",
    "colon": " : ",
    "ellipsis": "…",
    "sentenceJoin": ". "
  },
  "worlds": {
    "sun": "le Soleil",
    "mercury": "Mercure",
    "venus": "Vénus",
    "earth": "la Terre",
    "moon": "la Lune",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturne",
    "uranus": "Uranus",
    "neptune": "Neptune",
    "pluto": "Pluton",
    "io": "Io",
    "europa": "Europe",
    "ganymede": "Ganymède",
    "callisto": "Callisto",
    "phobos": "Phobos",
    "deimos": "Deimos",
    "enceladus": "Encelade",
    "titan": "Titan",
    "triton": "Triton",
    "charon": "Charon"
  },
  "worldFacts": {
    "cite": {
      "pluto": "position calculée avec Astronomy Engine (Don Cross, licence MIT), qui suit Pluton sous l’attraction du Soleil et des planètes géantes ; rayon d’après l’encadré de l’article Pluton de Wikipédia, nature d’après NASA Science, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "io": "position calculée avec Astronomy Engine (Don Cross, licence MIT) : Jupiter, plus la théorie L1.2 de ses lunes (Lainey, Duriez et Vienne) ; rayon d’après la fiche de la NASA sur les satellites de Jupiter, nature d’après NASA Science, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "europa": "position calculée avec Astronomy Engine (Don Cross, licence MIT) : Jupiter, plus la théorie L1.2 de ses lunes (Lainey, Duriez et Vienne) ; rayon d’après la fiche de la NASA sur les satellites de Jupiter, nature d’après NASA Science, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "ganymede": "position calculée avec Astronomy Engine (Don Cross, licence MIT) : Jupiter, plus la théorie L1.2 de ses lunes (Lainey, Duriez et Vienne) ; rayon d’après la fiche de la NASA sur les satellites de Jupiter, nature d’après NASA Science, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "callisto": "position calculée avec Astronomy Engine (Don Cross, licence MIT) : Jupiter, plus la théorie L1.2 de ses lunes (Lainey, Duriez et Vienne) ; rayon d’après la fiche de la NASA sur les satellites de Jupiter, nature d’après NASA Science, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "phobos": "position : Mars d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 6 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, luminosité d’après la fiche de la NASA sur Mars, nature et couleur d’après NASA Science, le tout consulté le 22 septembre 2026",
      "deimos": "position : Mars d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 120 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, luminosité d’après la fiche de la NASA sur Mars, nature et couleur d’après NASA Science, le tout consulté le 22 septembre 2026",
      "enceladus": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 1 480 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, nature et couleur d’après NASA Science, façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "titan": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 840 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, nature d’après NASA Science, atterrissage de Huygens, couleur et façon de l’observer d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "triton": "position : Neptune d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 10 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, nature d’après NASA Science, couleur et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "charon": "position : Pluton d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 1 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, luminosité d’après la fiche de la NASA sur Pluton, nature et couleur d’après NASA Science, le tout consulté le 22 septembre 2026",
      "mimas": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 700 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites de Saturne, nature et couleur d’après NASA Science, luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "tethys": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 120 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites de Saturne, nature d’après NASA Science, couleur et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "dione": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 240 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites de Saturne, couleur d’après NASA Science, nature et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "rhea": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 200 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites de Saturne, nature et couleur d’après NASA Science, luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "iapetus": "position : Saturne d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 6 800 km près entre 2000 et 2050, soit 0,19 % de son orbite ; rayon d’après les paramètres physiques des satellites du JPL, les deux albédos d’après la fiche de la NASA sur les satellites de Saturne, nature et couleur d’après NASA Science, luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "miranda": "position : Uranus d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 120 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites d’Uranus, nature d’après NASA Science, couleur et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "ariel": "position : Uranus d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 120 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites d’Uranus, nature et couleur d’après NASA Science, luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "umbriel": "position : Uranus d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 410 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites d’Uranus, nature d’après NASA Science, couleur et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "titania": "position : Uranus d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 1 000 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites d’Uranus, nature et couleur d’après NASA Science, luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026",
      "oberon": "position : Uranus d’après Astronomy Engine (Don Cross, licence MIT), plus une orbite ajustée sur JPL Horizons et vérifiée par rapport à elle à 1 230 km près entre 2000 et 2050 ; rayon d’après les paramètres physiques des satellites du JPL, albédo d’après la fiche de la NASA sur les satellites d’Uranus, nature d’après NASA Science, couleur et luminosité d’après Wikipédia, le tout consulté le 22 septembre 2026"
    }
  },
  "worldView": {
    "withParent": "{parent} : disque dessiné {n} fois plus large dans le ciel qu’il ne paraît, pour qu’on le repère ; autour, tout est à la même échelle, et l’écart entre {name} et {parent} est élargi dans la même proportion.",
    "withParentFloor": "{name} lui-même est dessiné encore plus gros, sans quoi il serait trop petit pour être vu.",
    "crowded": "{name} n’est pas dessiné aussi large que cela : {near} n’est qu’à {deg} degrés dans ce ciel, et un disque de cette taille le cacherait."
  },
  "stars": {
    "unnamed": "Une étoile sans nom (HYG {n})"
  },
  "systems": {
    "mercuryRing": "L’orbite de Mercure, pour l’échelle"
  },
  "ladder": {
    "title": "À quelle distance",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, chargement en cours",
    "weShowTitle": "Ce que la carte dessine de tout ce qu’on connaît",
    "weShowRow": "{n} {what} — sur {of}",
    "edge": "Le bord de la carte",
    "edgeHow": "s’y envoler",
    "edgeTitle": "Un seul vol d’ici jusqu’au bord de ce que dessine la carte",
    "home": "La Terre",
    "homeHow": "rentrer",
    "homeTitle": "Un seul vol d’ici jusqu’à la Terre",
    "flightOff": "Impossible d’ici : va d’abord sur Terre, Planètes ou Étoiles"
  },
  "sceneNote": {
    "refused": "Impossible de lire les satellites.",
    "refusedTitle": "CelesTrak, qui publie les orbites, n’a pas pu être lu depuis cette connexion. La Lune, les planètes, les étoiles et les voyages qui n’ont pas besoin de satellites marchent toujours.",
    "why": "Sources",
    "close": "×",
    "closeTitle": "Fermer cette note"
  },
  "link": {
    "unknownVersion": "Lien d’une carte plus récente : vue par défaut.",
    "unknownTrip": "Ce voyage n’existe plus ici : vue par défaut.",
    "unknownAt": "Cet objet n’est pas sur la carte : vue par défaut.",
    "unknownStage": "Impossible de centrer la carte sur ce lieu : vue par défaut."
  },
  "share": {
    "link": "Partager",
    "linkTitle": "Partager cette vue : la carte postale, le lien et quelques lignes de texte",
    "title": "Partager",
    "close": "Fermer",
    "pictureAlt": "La carte postale : cette vue redessinée en taille d’impression, avec sa légende",
    "drawing": "Dessin de la carte postale…",
    "noPicture": "La carte postale n’a pas pu être dessinée pour le moment.",
    "withTag": "Étiquette sur la sélection",
    "linkLabel": "Lien",
    "copyLink": "Copier le lien",
    "textLabel": "Texte",
    "lookingUp": "Recherche sur Wikipédia…",
    "wikiSource": "L’article de Wikipédia cité ici",
    "noWiki": "Pas de texte Wikipédia : publication plus courte.",
    "attribution": "Source : Wikipédia, CC BY-SA 4.0",
    "native": "Partager…",
    "nativeTitle": "Le partage de ton appareil, avec la carte postale là où il accepte une image",
    "nativeFailed": "Le partage ne s’est pas ouvert ; copie ou télécharge plutôt",
    "copy": "Copier le texte",
    "copyTitle": "Copier le texte et le lien, prêts à coller dans une publication",
    "copied": "Texte et lien copiés",
    "linkCopied": "Lien copié",
    "copyRefused": "Copie refusée ; texte sélectionné, copie-le toi-même.",
    "jpeg": "Télécharger en JPEG",
    "jpegTitle": "Enregistrer la carte postale en image JPEG, 6 sur 4 pouces à 300 points par pouce",
    "pdf": "Télécharger en PDF",
    "pdfTitle": "Enregistrer la carte postale en PDF d’une page, 6 sur 4 pouces, pour l’imprimer",
    "email": "E-mail",
    "emailTitle": "Écrire un e-mail avec le texte et le lien",
    "emailNote": "Pas d’image par e-mail : Partager… ou télécharger.",
    "networksLabel": "Publier sur",
    "networkTitle": "Ouvrir {network} avec cette publication, dans un nouvel onglet",
    "networkLabel": "Publier sur {network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}, sur Space Radar",
    "failed": "Le partage n’a pas pu s’ouvrir pour le moment",
    "mark": "spaceradar.ai",
    "photo": "Mode photo",
    "photoTitle": "Composer une image : tout est masqué, avec un cadre et une légende",
    "embed": "Intégrer",
    "embedTitle": "Copier le code qui place cette vue en direct dans une page web",
    "embedCopied": "Code d’intégration copié",
    "embedRefused": "La copie a été refusée à l’instant",
    "embedFrameTitle": "{name}, en direct sur Space Radar",
    "textRow": "Texte de la publication"
  },
  "embed": {
    "open": "Ouvrir dans Space Radar",
    "openTitle": "Ouvrir cette vue dans la carte complète, dans un nouvel onglet",
    "barLabel": "Space Radar, intégré",
    "stationUnread": "La Terre est affichée : la position de la station n’a pas pu être lue"
  },
  "density": {
    "panelTitle": "Densité",
    "regular": "Normale",
    "compact": "Compacte",
    "auto": "Automatique",
    "autoCompact": "Compacte pour l’instant, car cette fenêtre est basse.",
    "autoRegular": "Normale pour l’instant ; compacte à 800 px de haut ou moins."
  },
  "nextList": {
    "justHappened": "Vient d’arriver",
    "justHappenedTitle": "Lancements et rentrées atmosphériques des sept derniers jours",
    "calendar": "Calendrier",
    "calendarTitle": "Ajouter « {title} » à ton calendrier : télécharge un fichier .ics",
    "calendarSaved": "{file} enregistré",
    "calendarFailed": "Le fichier de calendrier n’a pas pu être créé",
    "sameName": "{name} ({id})",
    "title": "À venir",
    "showAll": "Voir les {n}",
    "showFewer": "Voir moins",
    "now": "à peu près maintenant",
    "inMinutes": "dans {n} minutes",
    "inHours": "dans {n} heures",
    "todayAt": "aujourd’hui à {time}",
    "tomorrowAt": "demain à {time}",
    "launch": "{name} : décollage {when}",
    "launchRough": "{name} : décollage {when}, à peu près — la date n’est pas encore fixée",
    "approach": "{name} approche la Terre {when}, à {ld} fois la distance de la Lune",
    "approachNoDistance": "{name} approche la Terre {when}",
    "sizeM": "Il mesure {n} m de large",
    "sizeKm": "Il mesure {n} km de large",
    "sizeRangeM": "Environ {lo} à {hi} m de large, estimé d’après son éclat",
    "sizeRangeKm": "Environ {lo} à {hi} km de large, estimé d’après son éclat",
    "sizeMixed": "Environ {lo} m à {hi} km de large, estimé d’après son éclat",
    "perihelion": "{name} : au plus près du Soleil {when}",
    "pass": "{name} te survole {when}",
    "train": "Un train de {n} satellites : passage au-dessus de toi {when}",
    "aurora": "Prévision de la NOAA, {when} : Kp {kp}, {word}",
    "auroraNow": "Tempête géomagnétique en cours : {word} (Kp {kp})",
    "shower": "Pluie d’étoiles filantes des {name} : pic vers le {date}, jusqu’à {zhr} par heure sous un ciel sombre",
    "showerMoon": "Pluie d’étoiles filantes des {name} : pic vers le {date}, jusqu’à {zhr} par heure sous un ciel sombre, avec une Lune éclairée à {pct} % cette nuit-là",
    "showerNoMoon": "Pluie d’étoiles filantes des {name} : pic vers le {date}, jusqu’à {zhr} par heure sous un ciel sombre, avec une Lune presque nouvelle",
    "radiantHigh": "Depuis chez toi, son radiant est au plus haut vers {time}",
    "radiantLow": "Depuis chez toi, son radiant reste bas toute la nuit : attends-toi à beaucoup moins d’étoiles filantes",
    "radiantNeverUp": "Depuis chez toi, son radiant reste sous l’horizon cette nuit-là",
    "eclipseKinds": {
      "total": "totale",
      "annular": "annulaire",
      "partial": "partielle",
      "hybrid": "hybride",
      "penumbral": "de pénombre"
    },
    "solarEclipseTitle": "Éclipse solaire {kind}",
    "lunarEclipseTitle": "Éclipse lunaire {kind}",
    "solarEclipse": "Éclipse solaire {kind} le {date} : l’ombre de la Lune tombe le plus profondément {where}",
    "solarEclipseGrazing": "Éclipse solaire {kind} le {date}, visible seulement tout au nord ou tout au sud",
    "lunarEclipse": "Éclipse lunaire {kind} le {date}, la Lune dans l’ombre de la Terre pour tous ceux qui peuvent la voir",
    "lunarEclipsePenumbral": "Éclipse lunaire {kind} le {date} : la Lune ne s’assombrit que légèrement, dans la pénombre de la Terre",
    "seasonTitles": {
      "march": "Équinoxe de mars",
      "june": "Solstice de juin",
      "september": "Équinoxe de septembre",
      "december": "Solstice de décembre"
    },
    "seasons": {
      "march": "Équinoxe de mars le {date} : le jour et la nuit sont presque égaux partout",
      "june": "Solstice de juin le {date} : le jour le plus long au nord, le plus court au sud",
      "september": "Équinoxe de septembre le {date} : le jour et la nuit sont presque égaux partout",
      "december": "Solstice de décembre le {date} : le jour le plus long au sud, le plus court au nord"
    },
    "solstice": "{title} le {date}",
    "equinox": "{title} le {date}",
    "eclipseNear": "près de {city}",
    "eclipseFrom": "à environ {km} km de {city}",
    "eclipseLocal": "Depuis chez toi : début à {begin}, maximum à {peak} avec {pct} % du Soleil masqué, fin à {end}",
    "eclipseLocalTotal": "Depuis chez toi : début à {begin}, totalité à {peak}, fin à {end}",
    "eclipseNotVisible": "Invisible depuis chez toi",
    "eclipseBelowHorizon": "Depuis chez toi, le Soleil est sous l’horizon pendant l’éclipse",
    "classOf": {
      "launch": "Un plan : l’heure visée par la société de lancement, qui peut bouger",
      "approach": "Calculé par NASA JPL à partir de l’orbite mesurée de l’astéroïde",
      "perihelion": "Calculé à partir de l’orbite publiée de la comète",
      "shower": "La date habituelle de chaque année ; le pic se décale d’environ un jour",
      "aurora": "Prévision de la NOAA, par tranches de trois heures",
      "auroraNow": "Mesuré par la NOAA ces dernières heures",
      "pass": "Calculé ici à partir d’éléments orbitaux mesurés {age}",
      "passNoAge": "Calculé ici à partir d’éléments orbitaux",
      "eclipse": "Calculé ici à la minute près d’après le mouvement du Soleil et de la Lune",
      "season": "Calculé ici à la minute près d’après la position du Soleil",
      "conjunction": "Calculé ici pour ton lieu, quand ils sont au plus près et tous deux dans le ciel sombre"
    },
    "row": {
      "conjunctionTitle": "{a} et {b}",
      "conjunction": "{when} · {sep}° d’écart, {height}, {dir}",
      "conjunctionValue": "{sep}°",
      "low": "bas",
      "mid": "à mi-hauteur",
      "high": "haut",
      "launch": "Décollage {when} · prévu",
      "launchRough": "Vers {when} · date non fixée",
      "approach": "Passage près de la Terre {when}",
      "approachValue": "{ld} × la Lune",
      "approachSized": "Passage près de la Terre {when} · {size}",
      "sizeM": "{n} m",
      "sizeKm": "{n} km",
      "sizeRangeM": "environ {lo} à {hi} m",
      "sizeRangeKm": "environ {lo} à {hi} km",
      "perihelion": "Au plus près du Soleil {when}",
      "pass": "Passe au-dessus de toi {when}",
      "trainTitle": "Train Starlink de {n}",
      "auroraTitle": "Prévision d’aurore",
      "auroraNowTitle": "Tempête géomagnétique en ce moment",
      "aurora": "Prévision NOAA, {when}",
      "auroraNow": "Mesuré par la NOAA ces dernières heures",
      "kp": "Kp {kp}",
      "showerTitle": "Étoiles filantes : {name}",
      "shower": "Pic vers le {date} · jusqu’à {zhr} par heure",
      "eclipse": "{date} · calculé à la minute près",
      "eclipseHere": "{date} · d’ici, de {begin} à {end}",
      "eclipseNotHere": "{date} · invisible d’ici"
    },
    "none": "Rien à venir dans ce qui est chargé.",
    "notLoaded": "Non chargé, donc pas dans la liste : {layers}."
  },
  "groundTrack": {
    "tick": "+{n} min",
    "label": "Suivre",
    "rideAlong": "Embarquer",
    "rideAlongTitle": "Place la caméra juste derrière, face à sa trajectoire. Glisse pour arrêter.",
    "lookBeside": "Regarder à ses côtés",
    "showTrack": "Afficher sa trace au sol",
    "hideTrack": "Masquer sa trace au sol",
    "highNote": "Sa trace au sol n’est pas dessinée d’office à cette altitude : elle bouge à peine.",
    "trackNote": "La ligne sur le globe est le sol sous l’objet, 45 minutes en arrière (en tirets) et 90 en avant, avec un repère toutes les 5 minutes."
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "Météo spatiale : {level} — mesuré {age}, {via}.",
    "forecastOnly": "Météo spatiale : {level} — une prévision, pas une mesure ; {via}.",
    "stale": "Cette mesure est plus ancienne que ce que promet la NOAA ; prends-la pour une estimation.",
    "stormComing": "La NOAA prévoit une hausse jusqu’à Kp {kp}.",
    "couldNotLook": "Météo spatiale : lecture impossible — {why}",
    "couldNotLook0": "Météo spatiale : lecture impossible.",
    "justNow": "à l’instant",
    "currentBin": "pour la période de trois heures en cours",
    "aMinuteAgo": "il y a une minute",
    "minutesAgo": "il y a {n} minutes",
    "anHourAgo": "il y a une heure",
    "hoursAgo": "il y a {n} heures",
    "aDayAgo": "il y a un jour",
    "daysAgo": "il y a {n} jours",
    "ageUnknown": "à une heure que la NOAA n’a pas précisée",
    "viaLive": "NOAA SWPC, lu en direct",
    "viaSnapshot": "NOAA SWPC, d’après notre copie",
    "words": {
      "unknown": "pas de mesure",
      "quiet": "calme",
      "unsettled": "perturbé",
      "active": "actif",
      "minorStorm": "une petite tempête — aurores possibles tout au nord et tout au sud",
      "moderateStorm": "une tempête modérée — aurores probables aux hautes latitudes",
      "strongStorm": "une forte tempête — aurores loin des pôles, satellites écartés de leur route",
      "severeStorm": "une tempête sévère",
      "extremeStorm": "une tempête extrême"
    }
  },
  "chooser": {
    "label": "Ce qu’il y a sous ton doigt",
    "hint": "{n} ici. Touches-en un, ou touche le ciel pour fermer."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "Fermer",
    "closeTitle": "Fermer cette fiche (Échap)",
    "it": "Ceci",
    "articles": [
      "Le",
      "le"
    ],
    "leadVerbs": [
      "est",
      "était"
    ],
    "makeCentre": "Centrer la carte sur {name}",
    "isCentre": "C’est le centre de la carte",
    "centreShort": "Centrer la carte ici",
    "ownPage": "Sa propre page",
    "ownPageTitle": "Une page sur cet objet, avec un lien à partager, dans un nouvel onglet",
    "isCentreShort": "Centré ici",
    "comparisonsLabel": "Pour s’en faire une idée",
    "rightNowLabel": "En ce moment",
    "seeItLabel": "Le voir d’ici",
    "actionsLabel": "Ce que tu peux faire",
    "unknownName": "Objet sans nom",
    "unknownKind": "{name} est sur la carte, mais nous ne savons pas de quel genre d’objet il s’agit",
    "rows": {
      "altitude": "Altitude",
      "speed": "Vitesse",
      "groundPoint": "Survole",
      "below": "Sous lui en ce moment",
      "fromYou": "Distance de toi",
      "fromGuess": "Distance jusqu’à {place}, notre estimation de ton lieu",
      "distanceFromEarth": "Distance à la Terre",
      "distanceFromSun": "Distance au Soleil",
      "lightLeft": "Sa lumière l’a quitté",
      "sunlight": "En ce moment",
      "hostStar": "Son étoile",
      "across": "Largeur",
      "mass": "Masse",
      "spin": "Un tour dure",
      "source": "Lu sur",
      "whySource": "Pourquoi on le sait, lu sur",
      "widthSource": "Largeur lue sur",
      "distanceNote": "À propos de cette distance",
      "objectType": "Ce que c’est",
      "constellation": "Constellation",
      "distanceRange": "Distance, meilleures estimations",
      "planetRadius": "Largeur",
      "planetMass": "Masse",
      "yearLength": "Une année là-bas",
      "found": "Découverte",
      "catalogueCopy": "Copie du catalogue",
      "spectralType": "Type d’étoile",
      "brightness": "Éclat apparent",
      "luminosity": "Luminosité",
      "starWidth": "Largeur",
      "catalogue": "Catalogue",
      "lightTime": "Temps radio, aller simple",
      "nextPass": "Prochain passage au-dessus de toi",
      "crew": "Personnes à bord",
      "operator": "Exploité par",
      "launched": "Lancement",
      "ended": "Fin",
      "pathEnds": "Sa trajectoire s’arrête",
      "pathBegins": "Sa trajectoire commence",
      "period": "Un tour dure",
      "location": "Où il se trouve",
      "onWorld": "Posé sur",
      "orbiting": "En orbite autour de",
      "heightAbove": "Altitude sur {world}",
      "closestApproach": "Au plus près de la Terre",
      "moons": "Lunes",
      "perihelion": "Au plus près du Soleil",
      "magnitude": "Éclat",
      "phase": "Phase",
      "liftoff": "Décollage",
      "pad": "Depuis",
      "destination": "En route vers",
      "whereabouts": "Où il est",
      "lastSeen": "Dernière position connue",
      "stormNow": "Au dernier bulletin",
      "stormWind": "Vent le plus fort sur sa trajectoire",
      "stormAdvisory": "Dernier bulletin",
      "stormCentre": "Son centre",
      "stormAgency": "Bulletin émis par",
      "stormAlert": "Niveau d’alerte GDACS"
    },
    "values": {
      "km": "{n} km",
      "kmh": "{n} km/h",
      "belowBorder": "près de la frontière entre {a} et {b}",
      "belowLand": "terre",
      "belowWater": "eaux libres",
      "stormWind": "{n} km/h, prévisions comprises",
      "stormWindCategory": "{n} km/h, catégorie {cat}, prévisions comprises",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "force ouragan",
        "typhoon": "force typhon",
        "cyclone": "force cyclone",
        "storm": "tempête tropicale",
        "depression": "dépression tropicale"
      },
      "stormAlert": {
        "green": "vert",
        "orange": "orange",
        "red": "rouge"
      },
      "launchedAgo": "il y a {n} jours, le {date}",
      "au": "{n} unités astronomiques",
      "lightYears": "{n} années-lumière",
      "inSunlight": "dans la lumière du Soleil",
      "inShadow": "dans l’ombre de la Terre",
      "yearsAgo": "il y a {n} ans",
      "monthsAgo": "il y a {n} mois",
      "suns": "{n} × le Soleil",
      "sunsWide": "{n} × le Soleil, estimé",
      "sunsWideMeasured": "{n} × le Soleil, mesuré",
      "earths": "{n} × la Terre",
      "lightYearsRange": "{lo} à {hi} années-lumière",
      "kmRange": "{lo} à {hi} km",
      "noMoonsKnown": "aucune connue",
      "sunsRange": "{lo} à {hi} × le Soleil",
      "millionSuns": "{n} millions de Soleils",
      "billionSuns": "{n} milliards de Soleils",
      "milliseconds": "{n} millisecondes",
      "billionYearsAgo": "il y a {n} milliards d’années",
      "millionYearsAgo": "il y a {n} millions d’années",
      "days": "{n} jours",
      "hours": "{n} heures",
      "yearByMethod": "{year}, {method}",
      "asOf": "au {date}",
      "magnitude": "magnitude {n}",
      "lunar": "{n} fois la distance de la Lune",
      "minutes": "{n} minutes",
      "seconds": "{n} secondes",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{lat}, {lon} sur {world}",
      "north": "{n}° N",
      "south": "{n}° S",
      "east": "{n}° E",
      "west": "{n}° O"
    },
    "couldNotLook": "Calcul impossible",
    "nobodyKnows": "Personne ne le sait",
    "wouldNeed": "Il faudrait {wouldNeed}.",
    "endedLine": "Sa mission s’est terminée le {date}. Ses événements, plus bas, y remontent.",
    "pathEndedLine": "La trajectoire de cet objet que JPL conserve s’arrête le {date}. Ses événements, plus bas, y remontent.",
    "pathBeginsLine": "La trajectoire de cet objet que JPL conserve commence le {date}. Ses événements, plus bas, y remontent.",
    "actions": {
      "flyTo": "S’y rendre",
      "flyToTitle": "Déplacer la caméra vers cet objet",
      "flyEnded": "Mission terminée le {date}. Choisis un événement de sa mission pour y aller",
      "flyPathEnded": "Sa trajectoire s’arrête le {date}. Choisis un événement de sa mission pour y aller",
      "flyPathBegins": "Sa trajectoire commence le {date}. Choisis un événement de sa mission pour y aller",
      "flyNowhere": "Cet objet n’a pas de position à cet instant",
      "seeFromHere": "Le voir d’ici",
      "seeFromHereTitle": "Lever les yeux depuis ton propre lieu sur Terre",
      "follow": "Suivre",
      "followTitle": "S’y rendre et le garder au milieu de la vue",
      "ride": "Embarquer",
      "rideShort": "Embarquer",
      "seeShort": "Voir",
      "postcard": "Carte postale",
      "share": "Partager"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "Planète",
      "moon": "Lune",
      "dwarf": "Planète naine",
      "ourStar": "Étoile",
      "exoplanet": "Exoplanète"
    },
    "regime": {
      "leo": "Orbite terrestre basse",
      "meo": "Orbite terrestre moyenne",
      "geo": "Orbite géostationnaire",
      "heo": "Orbite terrestre haute",
      "inner": "Système solaire interne",
      "outer": "Système solaire externe",
      "belt": "Ceinture d’astéroïdes",
      "beyondNeptune": "Au-delà de Neptune",
      "round": "Orbite : {world}",
      "inCon": "Constellation {con}",
      "onWorld": "Sur {world}",
      "centre": "Centre du système solaire",
      "nearby": "Parmi les plus proches"
    },
    "hero": {
      "label": "En trois chiffres",
      "missing": "—",
      "captions": {
        "altitude": "{u} d’altitude",
        "away": "à {u}",
        "speed": "{u}",
        "period": "{u} par tour",
        "distanceFromSun": "{u} du Soleil",
        "distanceFromEarth": "{u} de la Terre",
        "lightTime": "{u} par trajet",
        "spin": "{u} par tour",
        "yearLength": "{u} par an",
        "brightness": "magnitude",
        "spectralType": "classe de l’étoile",
        "across": "{u} de large",
        "lightLeft": "à {u}",
        "launched": "jours dans l’espace",
        "fromYou": "{u} de toi",
        "heightAbove": "{u} d’altitude",
        "other": "{u}"
      },
      "units": {
        "minutes": "min",
        "hours": "h",
        "days": "jours",
        "seconds": "s",
        "milliseconds": "ms",
        "astronomical units": "UA",
        "light-years": "al",
        "years ago": "al",
        "million years ago": "millions d’al",
        "billion years ago": "milliards d’al",
        "months ago": "mois-lumière"
      }
    },
    "sections": {
      "label": "En savoir plus",
      "see": "Quand le voir",
      "path": "Sa trajectoire",
      "aboard": "Qui est à bord",
      "ridingOn": "Ce qui le porte",
      "about": "À propos",
      "sources": "Sources de cette fiche",
      "placeGuessed": "lieu deviné",
      "needsPlace": "nécessite ton lieu",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "{n} groupes de taches solaires sont dessinés, d’après la liste de la NOAA du {date} : chacun en une tache ronde à la place et à la taille signalées, emportée depuis par la rotation du Soleil.",
    "spotsOne": "Un groupe de taches solaires est dessiné, d’après la liste de la NOAA du {date} : en une tache ronde à la place et à la taille signalées, emportée depuis par la rotation du Soleil.",
    "spotsPaired": "{n} groupes de taches solaires sont dessinés, d’après la liste de la NOAA du {date}, emportés depuis par la rotation du Soleil. Parmi eux, {pairs} à plusieurs taches sont dessinés en une tache de tête à l’ouest et une tache de queue à l’est ; l’écart entre les deux et la façon dont l’aire se partage sont illustratifs. Les autres sont une seule tache ronde.",
    "spotsPairedOne": "Un groupe de taches solaires est dessiné, d’après la liste de la NOAA du {date}, emporté depuis par la rotation du Soleil : en une tache de tête à l’ouest et une tache de queue à l’est. L’écart entre les deux et la façon dont l’aire se partage sont illustratifs.",
    "regionsCredit": "Groupes de taches solaires du jour : NOAA Space Weather Prediction Center, résumé des régions solaires",
    "flaresCredit": "Éruptions solaires : NOAA Space Weather Prediction Center, liste d’événements validée",
    "cmeCredit": "Éjections de masse coronale : NASA DONKI (Moon to Mars Space Weather Analysis Office et CCMC)"
  },
  "clouds": {
    "live": "Nuages : vus {when}, {ago}, en infrarouge par {satellites}, via NASA GIBS. Les sommets les plus froids, là où il y a des orages, sont dessinés plus hauts et plus blancs que le reste. Au-dessus de l’Europe, de l’Afrique, de l’océan Indien et des pôles, qu’aucun de ces satellites ne voit, ils sont illustratifs.",
    "at": "à {time} UTC",
    "between": "entre {from} et {to} UTC",
    "atDated": "le {date} à {time} UTC",
    "betweenDated": "le {date} entre {from} et {to} UTC",
    "clockElsewhere": " L’horloge est à {time} UTC le {date} ; les nuages restent tels que cette image les a vus.",
    "and": " et ",
    "illustrative": "Nuages : illustratifs. C’est une image d’un jour passé, qui dérive lentement ; ce n’est pas la météo d’aujourd’hui.",
    "illustrativeSaveData": "Nuages : illustratifs. Les images satellites du jour ne sont pas téléchargées sur une connexion qui économise les données.",
    "illustrativeScrubbed": "Nuages : illustratifs, car l’horloge est à plus de 12 heures de la dernière image satellite, celle du {date} à {time} UTC.",
    "gibsAcknowledgement": "Nous reconnaissons l’utilisation d’images fournies par les services du Global Imagery Browse Services (GIBS) de la NASA, qui fait partie de l’Earth Science Data and Information System (ESDIS) de la NASA.",
    "satelliteCredit": "Nuages en direct : images infrarouges de GOES-East et GOES-West, NOAA ; images infrarouges de Himawari, Agence météorologique japonaise (JMA)."
  },
  "aurora": {
    "live": "Aurore polaire : là où le modèle OVATION de la NOAA l’attend dans l’heure qui vient (sa prévision pour {time} UTC, faite {ago}), pas une photographie. Les plis fins qu’on y voit sont dessinés.",
    "liveNoFolds": "Aurore polaire : là où le modèle OVATION de la NOAA l’attend dans l’heure qui vient (sa prévision pour {time} UTC, faite {ago}), pas une photographie.",
    "waiting": "Aurore polaire : la prévision de la NOAA n’est pas encore arrivée.",
    "failed": "Aurore polaire : la prévision de la NOAA n’a pas pu être lue à l’instant, donc rien n’est dessiné.",
    "far": "Aurore polaire : non dessinée, car l’horloge est à plus de trois heures de la dernière prévision de la NOAA.",
    "saveData": "Aurore polaire : la prévision de la NOAA n’est pas téléchargée sur une connexion qui économise les données.",
    "switchedOff": "Aurore polaire : désactivée dans les couches.",
    "credit": "Aurore polaire : prévision du modèle OVATION Prime du NOAA Space Weather Prediction Center (domaine public).",
    "rightNow": "Aurores probables près des pôles",
    "rightNowReach": "Aurores probables jusqu’à {lat}° de latitude",
    "rightNowValue": "Kp {kp}",
    "showMe": "S’envoler vers l’aurore, côté nuit"
  },
  "weather": {
    "lightning": {
      "live": "Foudre : environ {n} impacts par minute là où la carte de la NOAA porte, sur les Amériques et le Pacifique (son décompte jusqu’à {time}, {ago}). Les lieux et la fréquence sont mesurés ; l’instant de chaque éclair est dessiné, plus grand que nature.",
      "quiet": "Foudre : presque aucun impact là où la carte de la NOAA porte, sur les Amériques et le Pacifique (son décompte jusqu’à {time}, {ago}).",
      "waiting": "Foudre : la carte de la NOAA n’est pas encore arrivée.",
      "failed": "Foudre : la carte de la NOAA n’a pas pu être lue à l’instant, donc rien n’est dessiné.",
      "away": "Foudre : non dessinée, car l’horloge est à plus d’une heure de la dernière carte de la NOAA.",
      "off": "Foudre : non téléchargée sur cet appareil ou cette connexion.",
      "reducedMotion": "Foudre : non dessinée, car cet appareil demande moins de mouvement.",
      "switchedOff": "Foudre : désactivée dans les couches.",
      "credit": "Foudre : densité d’impacts de NOAA nowCOAST, produite par l’Ocean Prediction Center du NWS à partir des réseaux au sol NLDN et GLD360 (domaine public)."
    },
    "worlds": {
      "jupiter": "Météo : les bandes glissent les unes contre les autres aux vitesses de vent mesurées depuis Hubble, et la Grande Tache rouge tourne. Mouvement modélisé : aucun nuage n’est dessiné là où il est aujourd’hui.",
      "saturn": "Météo : les bandes se déplacent aux vitesses de vent mesurées par Cassini. Mouvement modélisé, pas les nuages d’aujourd’hui. L’hexagone du pôle nord est dessiné à sa place mesurée ; son aspect est illustratif.",
      "venus": "Météo : la couche de nuages fait le tour de la planète en quatre jours environ, comme l’a mesuré Venus Express, soixante fois plus vite que le sol. Mouvement modélisé, pas les nuages d’aujourd’hui.",
      "uranus": "Météo : l’air tourne aux vitesses de vent mesurées depuis Keck et Gemini. Mouvement modélisé, pas les nuages d’aujourd’hui.",
      "neptune": "Météo : l’air file autour de la planète aux vitesses de vent mesurées par Voyager 2, les plus rapides de toutes les planètes. Mouvement modélisé, pas les nuages d’aujourd’hui.",
      "mars": "Météo : sur Mars, c’est {season}. Les calottes de givre et la poussière de l’air, d’épaisseur optique proche de {tau}, sont ce que cette saison apporte d’ordinaire : saisonnier et illustratif, pas la météo d’aujourd’hui.",
      "titan": "Météo : les traînées pâles au nord figurent les nuages de méthane que les télescopes Webb et Keck y ont vus en novembre 2022 et en juillet 2023. Illustratif : on ne sait pas où sont aujourd’hui les nuages de Titan."
    },
    "also": {
      "venus": "Le Y sombre qui tourne avec elle, c’est ce que voient les caméras ultraviolettes ; à l’œil, Vénus est presque unie, et la place du Y ici est illustrative. Des éclairs ont été signalés sur Vénus et sont encore débattus ; aucun n’est dessiné.",
      "uranus": "La calotte brillante au-dessus du pôle nord est réelle : sa luminosité et sa couleur, latitude par latitude, viennent de la carte de Hubble d’octobre 2025, et Hubble l’a vue s’éclaircir d’année en année à l’approche de l’été boréal de 2028.",
      "neptune": "L’ovale sombre de la carte de l’artiste est la Grande Tache sombre de Voyager 2 en 1989, disparue en 1994 : illustratif, non dessiné dans l’aspect Mesuré. Dans l’aspect Cinéma, des cirrus de méthane projettent des ombres, dessinées six fois plus larges et plus hautes que mesuré ; chaque traînée est de notre fait."
    },
    "flashes": {
      "jupiter": "Sur sa face nuit, de rares éclairs figurent les foudres découvertes par Juno, presque toutes très au nord : les latitudes sont mesurées, chaque éclair est illustratif et dessiné plus grand que nature.",
      "saturn": "Sur sa face nuit, de rares éclairs à 36 degrés sud figurent les foudres que Cassini y a photographiées en 2009 : illustratifs et plus grands que nature, et plus rien ne les surveille aujourd’hui."
    },
    "seasons": [
      "le printemps boréal",
      "l’été boréal",
      "l’automne boréal",
      "l’hiver boréal"
    ]
  },
  "drawing": {
    "orbitLine": "La ligne montre le tour à venir, calculé à partir des mêmes éléments que le point.",
    "orbitLineYear": "La ligne est l’année à venir de sa trajectoire, calculée à partir des mêmes éléments que le point.",
    "orbitLineWhole": "La ligne est toute son orbite autour du Soleil, calculée à partir des mêmes éléments que le point.",
    "orbitLinePassage": "La ligne est son unique passage dans le système solaire, à l’aller et au retour, calculé à partir des mêmes éléments que le point.",
    "variant": "dessiné d’après les dimensions publiées pour {name}",
    "family": "dessiné comme {name} — la forme et la hauteur de la famille, pas cette version exacte",
    "generic": "dessiné comme une fusée générique ; nous n’avons aucune dimension pour {name}",
    "genericUnnamed": "dessiné comme une fusée générique ; nous n’avons aucune dimension pour ce lanceur",
    "disputed": "les sources ne s’accordent pas sur sa hauteur ({disputed})",
    "objectVariant": "dessiné d’après les dimensions publiées pour {name}",
    "objectModel": "dessiné d’après un modèle publié pour {name}",
    "padEmpty": "le pas de tir est un lieu mesuré ; {name} n’y est dessiné qu’autour des lancements de la liste",
    "objectMapped": {
      "dawn": "sa surface est la mosaïque en noir et blanc de la sonde Dawn, teintée d’un gris que nous avons choisi ; les ombres dans ses cratères sont celles que Dawn a photographiées et ne bougent pas ici avec le Soleil"
    },
    "objectFamily": "dessiné comme {name} — le genre d’objet, pas celui-ci exactement",
    // b200-m2-buses: begin
    "objectBus": "Plateforme : {bus} ({source}). Dessiné avec une plateforme de remplacement.",
    // b200-m2-buses: end
    "objectOwn": "dessiné comme {name}",
    "objectMade": {
      "images": "forme construite à partir de photographies ; proportions approximatives",
      "render": "forme construite d’après une vue d’artiste ; proportions approximatives",
      "dimensions": "forme construite à partir de dimensions et d’images publiées ; détails simplifiés",
      // b200-m4-buses: begin -- a geostationary bus built here from published sizes and the maker's renders (registry/geo-buses.yaml `made: renders`), machine-drafted
      "renders": "forme construite à partir de dimensions publiées et de vues du constructeur ; détails estimés"
      // b200-m4-buses: end
    },
    "objectWas": {
      "hitomi": "montré entier, tel qu’il a été lancé en février 2016 ; il s’est brisé cinq semaines plus tard, et ce qui est suivi ici est son corps principal sans les panneaux solaires",
      "envisat": "montré stable, instruments tournés vers la Terre, comme il volait quand il fonctionnait ; il est hors service depuis 2012 et personne ne le dirige",
      "ers1": "montré stable, instruments tournés vers la Terre, comme il volait quand il fonctionnait ; sa mission s’est terminée en 2000 et personne ne le dirige"
    },
    "objectGeneric": "dessiné comme un objet générique ; nous n’avons aucune forme pour {name}",
    "classShape": {
      "satellite": "un satellite générique",
      "station": "une station spatiale générique",
      "debris": "un morceau de débris",
      "rocket": "une fusée générique",
      "probe": "une sonde générique",
      "telescope": "un télescope générique",
      "asteroid": "un astéroïde générique",
      "dwarf": "une simple boule ronde de sa taille mesurée",
      "comet": "une comète générique",
      "site": "un site au sol générique",
      "star": "un point de lumière, dont la taille suit l’éclat vu de l’endroit où tu es",
      "exoplanet": "une marque sur son étoile — l’orbite elle-même est bien trop petite pour être dessinée",
      "dso": "une lueur douce, à la manière de son genre d’objet, à sa distance mesurée et de sa largeur mesurée ; le motif qu’on y voit est illustratif et sa vraie forme n’est pas dessinée",
      "exotic": "un anneau à sa distance mesurée ; un trou noir n’a pas de forme à dessiner et un pulsar est bien trop petit",
      "exoticStar": "un anneau à sa distance mesurée ; l’étoile elle-même n’est qu’un point à cette échelle"
    },
    "storm": "dessiné comme une marque en son centre ; la tempête elle-même est le nuage tout autour",
    "feature": "un lieu nommé : rien n’est dessiné ici qu’une marque en son centre, placée d’après la source citée ; le sol dessous est la carte elle-même", // 0077 W3-d
    "objectSpin": { "spin": "il tourne autour de son pôle mesuré, à sa vitesse mesurée ; la face tournée vers le Soleil en ce moment n’est pas une prédiction", "pair": "les deux tournent autour de leur pôle mesuré, à leurs vitesses mesurées, et Dimorphos fait le tour à la distance et en la durée mesurées après l’impact de DART ; sa place sur cette orbite est illustrative", "comet": "il tourne autour de son pôle mesuré, à la vitesse mesurée en 2014, que le Soleil a modifiée de quelques minutes à chaque passage depuis ; la face tournée vers le Soleil en ce moment n’est pas une prédiction", "still": "il est dessiné dans l’orientation de son modèle radar et ne tourne pas ici : le modèle n’indique pas où se trouve son axe de rotation", "moonSpin": "elle garde une face tournée vers Saturne et tourne autour du pôle que lui donnent les constantes de l’UAI, une fois par tour ; quelle face regarde la caméra à cet instant, c’est cette formule qui le dit, ce n’est pas une prévision", "moonStill": "elle est dessinée dans l’orientation de son modèle et ne tourne pas ici : les constantes que lit cette appli ne lui donnent ni pôle ni rythme stables" }, // 0077 W3-d 0079 B2
    "objectSeen": { "lutetia": "les images de Rosetta couvrent plus de la moitié de sa surface ; le reste de la forme est ajusté d’après ses variations de luminosité, pas photographié", "steins": "les images de Rosetta couvrent environ 60 pour cent de sa surface ; le reste de la forme est ajusté d’après ses variations de luminosité, pas photographié", "donj": "la forme est construite à partir des images de Lucy par photogrammétrie stéréo et par ajustement de son contour ; la face que Lucy n’a pas vue vient de l’ajustement", "arrokoth": "les images de New Horizons couvrent la face survolée ; l’autre face est déduite, pas photographiée, et la couleur est sa carte d’albédo teintée de rouge", "radar": "la forme est construite à partir d’échos radar, pas d’images : son contour est mesuré, ses plus fins détails ne le sont pas", "comet": "la forme vient de Rosetta, de plus de 20 000 images sur deux ans, et toute la surface est couverte", "cassini": "la forme est construite à partir des images de Cassini et son incertitude est en général bien inférieure à un demi-kilomètre ; toute partie que Cassini n’a pas vue vient de l’ajustement, pas d’une photographie" }, // 0079 B1 0079 B2
    "objectRelief": "le modèle est simplifié, et le relief fin qui s’y trouve est celui du modèle complet, intégré à la surface", // 0079 B1
    "worldFlat": "dessiné comme une simple boule : il n’y a pas ici de carte de surface pour {name}, et sa couleur unique est choisie d’après des descriptions publiées, pas mesurée",
    "worldFlatIrregular": "dessiné comme une simple boule de la taille de son rayon moyen : il n’y a pas ici de carte de surface pour {name}, sa couleur unique est choisie d’après des descriptions publiées, pas mesurée, et {name} est en réalité un rocher irrégulier dont la vraie forme n’est pas dessinée",
    "worldFlatShaped": "dessiné dans sa forme mesurée et d’une seule couleur : il n’y a pas ici de carte de surface pour {name}, et la couleur est choisie d’après des descriptions publiées, pas mesurée",
    "worldShaped": "dessiné dans sa forme mesurée",
    "worldMap": {
      "tinted": "sa surface est une mosaïque en noir et blanc, teintée d’une couleur choisie d’après des descriptions publiées",
      "toned": "ses couleurs viennent d’images en infrarouge, en vert et en ultraviolet, adoucies vers ce que verrait un œil",
      "redblue": "ses couleurs viennent des images rouges et bleues de New Horizons, le vert étant pris à mi-chemin entre les deux et la couleur renforcée de moitié ; les parties photographiées seulement en noir et blanc reçoivent la couleur moyenne de la carte",
      "enhanced": "ses couleurs sont celles publiées par la NASA, composées à partir de trois filtres couleur de New Horizons, dont aucun n’est vert : c’est une couleur rehaussée, plus forte que ce qu’un œil verrait, et pas la même",
      "balanced": "ses couleurs viennent d’images orange, vertes et bleues, équilibrées sur sa couleur publiée et adoucies vers ce que verrait un œil",
      "infrared": "sa surface est une carte en proche infrarouge faite à travers la brume, teintée et adoucie ; en lumière visible, la brume cache le sol",
      "natural": "ses couleurs sont des couleurs naturelles, tirées de la lumière rouge et bleue mesurée par la caméra couleur de New Horizons, le vert, pour lequel elle n’avait pas de filtre, étant estimé entre les deux, et rendues deux fois et demie plus fortes que celles de la caméra, comme les montrent les images en couleurs naturelles de la NASA", // 0078 r14-pluto
      "matched": "ses couleurs partent de la lumière rouge et bleue mesurée par la caméra couleur de New Horizons, le vert, pour lequel elle n’avait pas de filtre, étant estimé entre les deux, puis sont accordées, nuance par nuance, à l’image en couleurs de cette face publiée par la NASA (PIA19952) : plus fortes que celles de la caméra, comme la NASA les a publiées" // 0078 r14-pluto
    },
    "worldCoverage": {
      "miranda": "seule la moitié sud a été photographiée, par Voyager 2 en 1986 ; le reste est laissé uni, pas deviné",
      "ariel": "seule la moitié sud a été photographiée, par Voyager 2 en 1986 ; le reste est laissé uni, pas deviné",
      "umbriel": "seule la moitié sud a été photographiée, par Voyager 2 en 1986 ; le reste est laissé uni, pas deviné",
      "titania": "seule la moitié sud a été photographiée, par Voyager 2 en 1986 ; le reste est laissé uni, pas deviné",
      "oberon": "seule la moitié sud a été photographiée, par Voyager 2 en 1986 ; le reste est laissé uni, pas deviné",
      "triton": "Voyager 2 en a photographié une partie en 1989 ; le reste est laissé uni, pas deviné",
      "pluto": "l’extrême sud était plongé dans la nuit d’hiver quand la sonde New Horizons est passée en 2015 : le sol dessiné là est modélisé, une texture discrète aux couleurs des terres au-dessus, pas une photographie", // 0078 r14-pluto
      "charon": "l’extrême sud était plongé dans la nuit d’hiver quand la sonde New Horizons est passée en 2015 : le sol dessiné là est modélisé, une texture discrète aux couleurs des terres au-dessus, pas une photographie" // 0078 r14-pluto
    },
    "worldLit": "éclairé comme le montrerait un appareil photo exposé pour la lumière du Soleil qu’il reçoit",
    "worldLight": "vu de loin, c’est une lumière à son éclat calculé : la lueur est la façon dont un appareil photo enregistre un point trop brillant pour être résolu",
    "exoticDeparture": {
      "pulseSlowed": "son clignotement est dessiné {n} fois plus lent que sa rotation, pour que l’œil puisse le suivre",
      "pulseTrue": "son clignotement est dessiné à la vitesse de sa rotation",
      "portrait": "tant que cette fiche est ouverte, un modèle est dessiné à sa place, bien plus grand qu’il ne paraîtrait d’ici : l’ombre et la lumière courbée que donne sa masse, le disque modélisé"
    },
    "worldDeparture": {
      "earth": "sur un grand écran, ses montagnes viennent des altitudes ETOPO 2022 de la NOAA, dessinées {relief} fois plus raides qu’elles ne sont pour qu’un Soleil bas les montre ; la lueur de l’air sur son bord est dessinée {air} fois plus haute que l’air ; depuis l’orbite basse sur un grand écran, ses nuages se dressent vers l’horizon et sous un Soleil bas, dessinés {clouds} fois plus épais qu’ils ne sont pour qu’on voie leur inclinaison, leurs longues ombres et la dernière lumière sur leurs sommets (à leur vraie épaisseur dans l’aspect Mesuré), la hauteur de chaque sommet venant de sa température mesurée là où l’image du jour la couvre, et de l’éclat de la carte des nuages ailleurs",
      "mercury": "sur un grand écran, son relief vient du modèle d’altitude de MESSENGER, dessiné {steep} fois plus raide que mesuré pour que les bords des cratères accrochent la lumière",
      "pluto": "son sol clair et sombre est dessiné avec {plutoContrast} fois le contraste de l’image de la caméra, plus près des albédos mesurés ; le côté que New Horizons n’a vu que de loin est adouci à sa propre netteté ; sur un grand écran, son relief vient des altitudes stéréo de New Horizons, là où il y en a, dessiné {plutoSteep} fois plus raide que mesuré ; la fine brume bleue de son bord est dessinée comme une lueur, plus forte à contre-jour, dont l’intensité est choisie", // 0078 r14-pluto
      "mars": "sur un grand écran, son relief vient des altitudes mesurées par l’altimètre laser de Mars Global Surveyor, dessiné {mola} fois plus raide et plus haut qu’il n’est pour qu’un Soleil bas le montre : les ombres que projettent Olympus Mons et les parois du canyon sont autant de fois trop longues.",
      "venus": "la lueur autour de son bord et au-delà de sa face éclairée figure une brume épaisse ; son épaisseur dessinée et sa portée sont illustratives ; dans l’aspect Cinéma, ses bandes de nuages sont dessinées avec {uv} fois le contraste de sa carte, comme les voient les caméras ultraviolettes (à l’œil, elles sont presque unies), et l’aspect Mesuré montre la carte telle quelle ; son sol, vu par radar, est en relief d’après l’altimètre de Magellan, dessiné {ground} fois plus raide et plus haut que mesuré",
      "neptune": "dans l’aspect Cinéma, les cinq arcs de son anneau extérieur sont dessinés comme Voyager 2 les a vus en 1989, tournant à leur vitesse mesurée ; où ils se trouvent aujourd’hui autour de l’anneau n’est pas calculé, et deux d’entre eux ont depuis pâli ou bougé",
      "saturn": "ses bandes sont dessinées avec {contrast} fois le contraste de sa carte, un réglage de notre part ; « Vu par Hubble » n’est pas ajusté ; sur un grand écran et de près, les anneaux fins et les lacunes de ses anneaux sont là où Cassini les a mesurés à travers la lumière d’une étoile en 2008, posés sur la carte, et dans l’aspect Cinéma le scintillement de grains encore plus proches est dessiné ; à quelques kilomètres des anneaux sur un grand écran, dans l’aspect Cinéma, leurs plus gros morceaux, de deux à cinq mètres de large, sont dessinés en boules de glace : leur nombre et leur taille suivent la répartition mesurée des tailles et l’épaisseur optique des anneaux, mais l’endroit où se trouve chacun, et les amas de l’anneau A, sont illustratifs, et ils sont dessinés immobiles, comme si tu voyageais avec eux",
      "titan": "juste au-dessus de sa brume, à environ 500 km d’altitude, une fine couche de brume détachée est dessinée là où Cassini l’a vue en 2005-2007 ; elle s’est affaissée et estompée dans les années qui ont suivi, et on ne sait pas où elle est aujourd’hui"
    },
    "worldEarthshine": "sa face nuit brille de la lumière cendrée, la propre lumière de la Terre, dessinée {n} fois plus brillante que cet appareil photo ne la saisirait, à peu près comme l’œil la voit",
    "worldAir": "son air est dessiné {n} fois plus épais qu’il n’est pour qu’on le voie à cette taille, et la couleur de sa brume est illustrative",
    "worldAirTrue": "sa brume est dessinée à sa hauteur mesurée, et sa couleur est illustrative",
    "worldRings": "ses anneaux sont à leurs distances mesurées, dessinés {w} fois plus larges et bien plus brillants qu’ils ne sont pour qu’on les voie : les vrais sont des fils sombres comme du charbon",
    "worldRingsDense": "ses anneaux sont à leurs distances mesurées, dessinés {w} fois plus larges, {d} fois plus opaques et bien plus brillants qu’ils ne sont pour qu’on les voie : les vrais sont de faibles fils sombres comme du charbon",
    "worldSun": "de près, son bord s’assombrit et rougit comme le dit un modèle de son atmosphère ; le grain figure sa surface bouillonnante : ses cellules naissent, s’éclaircissent et s’effacent comme de vrais granules, dessinées plus grosses qu’elles ne sont (jusqu’à leur vraie taille de très près) et bien plus vite, et le réseau brillant vers le bord est illustratif ; de très près, la carte photographiée cède la place à cette surface dessinée, elle aussi illustrative ; la couronne est illustrative, et dessinée bien plus brillante qu’elle n’est pour qu’on puisse la voir ; les boucles et les haies sur son bord se dressent là où les régions actives de la NOAA sont près du limbe, et leurs formes et leurs hauteurs sont illustratives ; les étoiles à côté sont estompées, car son éclat les cache à n’importe quel appareil photo",
    "worldMosaic": "Sous la caméra en ce moment : {title}, à environ {res} par pixel à l’écran.",
    "worldMosaicDetail": "Sous la caméra en ce moment : {title}, qui affine la carte des couleurs à environ {res} par pixel.",
    "worldRelief": "Son relief, d’après {title}, est un dessin des pentes sous une lumière fixe. Les pentes dans le sens de cette lumière sont rééclairées par le Soleil là où il est maintenant, {n} fois plus raides que mesuré ; les pentes en travers ne sont pas dessinées.",
    "worldReliefTrue": "Son relief, d’après {title}, est un dessin des pentes sous une lumière fixe. Les pentes dans le sens de cette lumière sont rééclairées par le Soleil là où il est maintenant ; les pentes en travers ne sont pas dessinées.",
    "worldReliefBaked": "Ses collines sont ombrées dans cette carte sous une lumière fixe, pas par le Soleil là où il est maintenant.",
    "mount": "la façon dont nous l’accrochons au modèle est de notre cru, et il est dessiné bien plus grand qu’il n’est — à sa vraie taille, il serait trop petit pour être vu"
  },
  "trip": {
    "notEnoughStops": "Seules {count} étapes de ce voyage sont disponibles pour l’instant, et il en faut {min}.",
    "heldBody": "Nous n’avons pas trouvé celle-ci à l’instant. Tout le reste du voyage fonctionne toujours.",
    "heldTitle": "Nous n’avons pas trouvé cette étape",
    "stopOf": "étape {n} sur {count}",
    "planning": "Calcul de ce qui peut être montré…",
    "shape": "{count} étapes · {mins} min",
    "shapeOneMinute": "{count} étapes · 1 min",
    "startTitle": "Lancer ce voyage",
    "nextEventLine": "Prochain : {date}",
    "introStart": "Démarrer",
    "introSkip": "Pas maintenant",
    "introMicro": "Voyage guidé",
    "stopsLabel": "Étapes",
    "startAtTitle": "Commencer le voyage à l’étape {n}",
    "droppedOne": "Une étape ne peut pas être montrée aujourd’hui et n’est pas comptée ci-dessus.",
    "droppedMany": "{n} étapes ne peuvent pas être montrées aujourd’hui et ne sont pas comptées ci-dessus.",
    "clockClamped": "Le temps est revenu à sa vitesse normale pour ce voyage.",
    "clockMoves": "Ce voyage déplace l’horloge. Elle est remise en place quand tu pars.",
    "clockRestored": "Quand tu pars, l’horloge revient là où tu l’avais mise.",
    "stopTimeNow": "Montré maintenant",
    "stopTimeAt": "Montré : {when}",
    "stopTimeRate": "Montré : {when}, défilant {rate}",
    "stopTimePaused": "Montré : {when}, figé pendant la pause du voyage",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "Ombre calculée d’après les positions de la Lune et du Soleil ; horaires d’après Astronomy Engine, à environ une minute près. Les fines lignes et la bande pâle marquent les bords de l’ombre et la trajectoire de son cœur : des lignes sur une carte, pas de la lumière.",
    "eclipseLineLatched": "L’ombre n’est pas dessinée sur cet appareil ; l’heure, elle, est juste.",
    "eclipseColour": "La couleur est une illustration ; l’ombre est calculée.",
    "orbitsLine": "Planètes dessinées plus grosses qu’elles ne sont, en points ; leurs places et leurs trajectoires sont calculées.",
    "moonPathLine": "La Terre et la Lune sont dessinées plus grosses qu’elles ne sont, en points, chacune éclairée du côté qui fait face au Soleil. La place de la Lune et sa trajectoire sont calculées.",
    "systemLine": "Tailles et orbites d’après la NASA Exoplanet Archive ; les couleurs et l’inclinaison des orbites sont illustratives.",
    "systemLineGuessed": "Tailles et orbites d’après la NASA Exoplanet Archive ; les couleurs, les places des planètes sur leurs orbites et l’inclinaison des orbites sont illustratives.",
    "systemPhaseUnknown": ", les places des planètes sur leurs orbites",
    "rateWords": {
      "10": "dix fois plus vite que la réalité",
      "60": "une minute par seconde",
      "600": "dix minutes par seconde",
      "3600": "une heure par seconde",
      "36000": "dix heures par seconde",
      "525600": "un jour par sixième de seconde"
    },
    "rateGeneric": "{n} fois plus vite que la réalité",
    "yourPlace": "Ton lieu",
    "observerSet": "Ton lieu : {place}, choisi par toi.",
    "observerDevice": "Ton lieu : près de l’endroit où ton appareil dit que tu es.",
    "observerGuess": "Ton lieu est une estimation d’après le fuseau horaire de ton horloge : {place}. Règle-le sous « Où tu es » pour plus de précision.",
    "needsPlace": "Il faut un lieu. Indique d’abord où tu es.",
    "stationFromYou": "En ce moment, elle est à {km} km de toi.",
    "drawnAtClassSize": "Le modèle est dessiné sur {px} pixels de large quelle que soit la distance ; la vraie station ne serait qu’un point brillant.",
    "passNight": "Pendant ce passage, elle est éclairée par le Soleil sur un ciel sombre : tu pourrais la voir, si la météo le permet.",
    "passDay": "Tu ne verrais pas ce passage : ton ciel est trop clair, ou la station est dans l’ombre de la Terre.",
    "lookMoonUp": "La Lune est éclairée à {pct} %, {alt}, {az}.",
    "lookMoonDown": "La Lune est sous ton horizon à cette heure. Elle se lève à {time}.",
    "lookMoonDownNoRise": "La Lune est sous ton horizon à cette heure.",
    "lookWorldUp": "{name} est {alt}, {az}.",
    "lookWorldDown": "{name} est sous ton horizon à cette heure.",
    "lookPlanet": "La planète la plus brillante levée à cette heure est {name} : {alt}, {az}.",
    "lookNoPlanet": "Aucune planète visible à l’œil nu n’est levée à cette heure. La vue regarde là où elles passeront.",
    "lookStar": "L’étoile la plus brillante levée à cette heure est {name} : {alt}, {az}.",
    "lookFigure": "Meilleure position à cette heure : {name}, {alt}, {az}.",
    "lookNoFigure": "Aucune des figures célèbres n’est bien placée à cette heure.",
    "lookNoPass": "Aucun passage de la station au-dessus de ton lieu n’a été trouvé dans la semaine qui vient.",
    "lookDaylight": "Ton ciel n’est pas sombre à cette heure, donc il n’y a encore rien à repérer.",
    "lookMilkyWay": "La vue regarde la Voie lactée là où elle traverse {name}, {alt}, {az}. Les trois ciels sont un modèle d’une nuit claire moyenne.",
    "lookNoMilkyWay": "La Voie lactée est basse sur ton horizon à cette heure, donc la vue regarde plutôt haut dans le ciel.",
    "lookShower": "La prochaine pluie d’étoiles filantes est celle des {name}, à son maximum vers le {date}.",
    "lookShowerUp": "Son radiant est {alt}, {az} à cette heure.",
    "lookShowerDown": "Son radiant est sous ton horizon à cette heure ; la vue regarde là où il se lèvera.",
    "lookShowerRate": "Au maximum, depuis un endroit sombre avec le radiant haut : environ {rate} étoiles filantes par heure.",
    "lookShowerMoon": {
      "dark": "La Lune est éclairée à {pct} % cette nuit-là, donc le ciel reste sombre.",
      "some": "La Lune est éclairée à {pct} % cette nuit-là et cachera une partie des plus faibles.",
      "bright": "La Lune est éclairée à {pct} % cette nuit-là et cachera toutes les étoiles filantes sauf les plus brillantes."
    },
    "approachNext": "Prochain dans la table de NASA JPL : {name}, le {date}, à {ld} fois la distance de la Lune.",
    "approachNextFar": "Prochain dans la table de NASA JPL : {name}, le {date}.",
    "approachNone": "La table des passages rapprochés de NASA JPL n’est pas chargée, donc aucun prochain passage n’est nommé.",
    "satellitesCount": "{n} satellites en service dans le catalogue que cette page a chargé depuis CelesTrak, dont {starlink} Starlink.",
    "satellitesLoading": "Le catalogue est encore en chargement ; le nombre s’affichera quand il sera là.",
    "portraitLine": "Un modèle, pas la photographie : l’ombre et l’anneau de lumière courbée autour sont ceux que donne sa masse, le disque lumineux est modélisé, et les étoiles derrière ne sont pas courbées. Il est dessiné bien plus grand qu’il ne paraîtrait d’ici ; le lieu est mesuré. La photographie de l’Event Horizon Telescope est sur sa fiche : {credit} · {licence}.",
    "tonightUp": "Depuis {place} ce soir : levé de {begin} à {end}, au plus haut à {time}, {alt}, {az}.",
    "tonightGlare": "Depuis {place} ce soir : {name} est trop près du Soleil pour être vu.",
    "tonightDown": "Depuis {place} ce soir : {name} n’est pas au-dessus de l’horizon pendant que le ciel est sombre.",
    "frameLabel": "voyage guidé",
    "stopRole": "étape",
    "liveLabel": "étape {n} sur {count} : {title}",
    "stopMicro": "Étape {n} sur {count}",
    "progressShort": "{n} / {count}",
    "pause": "Pause",
    "pauseTitle": "Mettre en pause (Espace)",
    "play": "Lecture",
    "resume": "Reprendre",
    "resumeTitle": "Retourner à l’étape et continuer (Espace)",
    "back": "Étape précédente",
    "backTitle": "Étape précédente (←)",
    "next": "Étape suivante",
    "nextTitle": "Étape suivante (→)",
    "replay": "Rejouer",
    "replayTitle": "Refaire ce mouvement (R)",
    "share": "Partager",
    "shareTitle": "Partager un lien vers cette étape",
    "collapse": "Masquer la fiche",
    "collapseTitle": "Masquer la fiche et regarder (C)",
    "expand": "Voir la fiche",
    "expandTitle": "Faire revenir la fiche (C)",
    "soundOn": "Son",
    "volume": "Volume",
    "volumeTitle": "Volume de la musique, des sons et de la voix",
    "volumeValue": "{pct} pour cent",
    "voiceWill": "Une voix lira ce texte. Elle est synthétique.",
    "voiceCan": "Une voix synthétique peut lire ce texte : appuie sur Voix.",
    "soundOnTitle": "La musique et les sons sont activés : les couper (M)",
    "soundOffTitle": "La musique et les sons sont coupés : les activer (M)",
    "voice": "Voix",
    "voiceOnTitle": "Une voix synthétique lit chaque étape : l’arrêter et garder la musique (V)",
    "voiceOffTitle": "Faire lire chaque étape à voix haute par une voix synthétique (V)",
    "present": "Présenter",
    "presentTitle": "Montrer ce voyage à une salle : gros textes, pas de panneaux, tu appuies sur Suivant",
    "presentOffTitle": "Quitter le mode présentation et rouvrir les panneaux",
    "presentAuto": "Auto",
    "presentAutoOffTitle": "Chaque étape attend Suivant : laisser le voyage avancer tout seul (A)",
    "presentAutoOnTitle": "Le voyage avance tout seul : faire attendre chaque étape jusqu’à Suivant (A)",
    "fullScreen": "Plein écran",
    "fullScreenTitle": "Remplir tout l’écran (F)",
    "fullScreenOffTitle": "Quitter le plein écran (F)",
    "leave": "Quitter",
    "leaveTitle": "Quitter le voyage. La caméra reste exactement où elle est. (Échap)",
    "leaveTitleStage": "Quitter le voyage. La carte retourne au monde sur lequel elle était centrée avant, ce qui déplace la caméra. (Échap)",
    "progressLabel": "Où tu en es dans le voyage",
    "controlsLabel": "Commandes du voyage",
    "pausedChip": "Voyage en pause",
    "endMicro": "Fin du voyage",
    "endBody": "La caméra reste où elle est. Rien ici ne revient en arrière.",
    "endBodyStage": "« Voler librement » reste ici. « Rentrer » remet la carte sur le monde où elle était centrée avant le voyage.",
    "endExplore": "Voler librement",
    "endExploreTitle": "Garder cette vue et continuer tout seul",
    "endStayTitleStage": "Rester ici et continuer à voler depuis l’endroit où le voyage s’est arrêté",
    "endHome": "Rentrer",
    "endExploreTitleStage": "Continuer tout seul, de retour sur la carte d’où tu étais parti",
    "endSend": "Envoyer l’image",
    "endSendTitle": "Faire une carte postale de l’endroit où le voyage s’est arrêté, avec ses mots et un lien",
    "endReplay": "Revoir",
    "endReplayTitle": "Revoir ce voyage depuis le début",
    "endShareTitle": "Partager un lien vers ce voyage",
    "endNextMicro": "Voyage suivant",
    "endNext": "Suivant : {title}",
    "docTitle": "Space Radar — {title} — étape {n} sur {count}"
  },
  "sky": {
    "radiant": "Radiant : {name}",
    "bodies": {
      "sun": "Soleil",
      "moon": "Lune",
      "mercury": "Mercure",
      "venus": "Vénus",
      "mars": "Mars",
      "jupiter": "Jupiter",
      "saturn": "Saturne",
      "uranus": "Uranus",
      "neptune": "Neptune"
    },
    "fov": {
      "degrees": "Champ de {deg}° · {name}",
      "arcmin": "Champ de {min}′ · {name}",
      "names": {
        "eye": "œil nu",
        "binoculars": "jumelles",
        "telescope": "télescope"
      }
    },
    "lines": {
      "sunPath": "Trajectoire du Soleil",
      "equator": "Équateur céleste",
      "poleNorth": "Pôle nord céleste",
      "poleSouth": "Pôle sud céleste"
    },
    "what": {
      "star": "Étoile",
      "starMag": "étoile · mag {mag}",
      "planet": "planète · mag {mag}",
      "sun": "notre étoile",
      "moon": "la lune de la Terre",
      "dso": "ciel profond",
      "dsoMag": "{kind} · mag {mag}",
      "open": "{name}, {sub}. Ouvrir sa fiche.",
      "plain": "{name}, {sub}.",
      "openTitle": "Ouvrir sa fiche"
    },
    "compassShort": [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSO",
      "SO",
      "OSO",
      "O",
      "ONO",
      "NO",
      "NNO"
    ],
    "lookLine": "Regarde {dir}, {fists}, à {time}. Le mouvement dure environ {mins} minutes.",
    "lookLineNoDuration": "Regarde {dir}, {fists}, à {time}.",
    "sunlit": "Le Soleil l’éclaire encore, et c’est ce qui permet de le voir.",
    "notSunlit": "Pendant ce passage, il est dans l’ombre de la Terre : tu ne le verras pas.",
    "fistsHorizon": "juste au-dessus de l’horizon",
    "fistsOverhead": "presque à la verticale",
    "fistsOne": "à environ un poing au-dessus de l’horizon",
    "fistsMany": "à environ {n} poings au-dessus de l’horizon",
    "noObserver": "Indique où tu es et cette ligne te dira où regarder.",
    "noPass": "Il ne passe pas au-dessus de ton horizon dans les 24 heures qui viennent.",
    "notVisibleFromGround": "Celui-ci est trop loin pour être repéré à l’œil nu.",
    "leftGround": "Tu as quitté le sol pour y voler. Le ciel, c’est dans Ce soir.",
    "nakedEye": "Assez brillant pour être vu à l’œil nu depuis un endroit sombre.",
    "needsTelescope": "Trop faible pour l’œil ; un télescope, ou une longue photo, le montre.",
    "starOnly": "Seule son étoile se voit, et seulement au télescope ; la planète elle-même est bien trop faible.",
    "onTheGround": "Celui-ci est posé sur le sol, donc il n’y a rien à chercher en levant les yeux.",
    "storm": "Depuis le sol, c’est la météo elle-même. Depuis l’orbite, c’est une spirale de nuages large de centaines de kilomètres.",
    "onAnotherWorld": "Celui-ci est posé sur {world}. Tu ne le repéreras pas à l’œil nu d’ici, même par une nuit très claire.",
    "worldRise": "Lever vu de chez toi : {time}.",
    "worldHere": "chez toi",
    "worldFrom": {
      "down": "Depuis {place} : lever à {rise}, {riseDir} ; point le plus haut à {highTime}, {highAlt} ; coucher à {set}, {setDir}.",
      "downNoSet": "Depuis {place} : lever à {rise}, {riseDir} ; point le plus haut à {highTime}, {highAlt}.",
      "up": "Depuis {place} : dans le ciel en ce moment, {alt}, {dir}. Point le plus haut à {highTime}, {highAlt} ; coucher à {set}, {setDir}.",
      "upPast": "Depuis {place} : dans le ciel en ce moment, {alt}, {dir}. Point le plus haut déjà passé ; coucher à {set}, {setDir}.",
      "never": "Depuis {place} : pas de lever dans le jour et demi qui vient.",
      "always": "Depuis {place} : dans le ciel en ce moment, {alt}, {dir}. Pas de coucher aujourd’hui.",
      "honest": "Calculé pour un horizon au niveau de la mer ; les collines et les maisons n’y sont pas comptées."
    },
    "worldNoRise": "Celui-ci se voit à l’œil nu. Calculer quand il se lève depuis ton lieu n’est pas encore dans cette version.",
    "worldSee": {
      "pluto": "Pas à l’œil nu, ni aux jumelles : Pluton est près de 3 000 fois plus faible que la plus faible étoile visible, il faut donc un télescope.",
      "io": "Aux jumelles ordinaires, c’est un point de lumière à côté de Jupiter ; à l’œil nu, il se perd dans l’éclat de Jupiter.",
      "europa": "Aux jumelles ordinaires, c’est un point de lumière à côté de Jupiter ; à l’œil nu, il se perd dans l’éclat de Jupiter.",
      "ganymede": "Aux jumelles ordinaires, c’est un point de lumière à côté de Jupiter ; à l’œil nu, il se perd dans l’éclat de Jupiter.",
      "callisto": "Aux jumelles ordinaires, c’est un point de lumière à côté de Jupiter ; à l’œil nu, il se perd dans l’éclat de Jupiter.",
      "titan": "Pas à l’œil nu : Titan est de magnitude 8,2 au mieux, il faut donc un petit télescope ou de fortes jumelles, et l’éclat de Saturne à côté le rend difficile même ainsi.",
      "enceladus": "Pas à l’œil nu : Encelade est de magnitude 11,7, et si près de la brillante Saturne et de ses anneaux qu’il est difficile à voir même avec un petit télescope.",
      "triton": "Pas à l’œil nu, ni aux jumelles : Triton est de magnitude 13,5, environ 600 fois plus faible que la plus faible étoile visible, il faut donc un télescope.",
      "charon": "À peine : Charon est de magnitude 16,8, 13 000 fois plus faible que la plus faible étoile visible, et si près de Pluton que des amateurs n’ont séparé le couple qu’en 2008, en le photographiant avec un télescope de 14 pouces.",
      "phobos": "Pas à l’œil nu : Phobos est de magnitude 11,3 au mieux et colle à Mars, dont l’éclat le noie ; il a été découvert en 1877 avec un télescope de 26 pouces.",
      "deimos": "Pas à l’œil nu : Deimos est de magnitude 12,4 au mieux et près de Mars, dont l’éclat le noie ; il a été découvert en 1877 avec un télescope de 26 pouces.",
      "neptune": "Pas à l’œil nu : Neptune est de magnitude 7,7 à 7,9, trop faible pour être vue sans aide. De fortes jumelles ou un télescope la montrent comme un petit disque bleu.",
      "mimas": "Pas à l’œil nu : Mimas est de magnitude 12,9 et colle à Saturne, il faut donc un grand télescope et une nuit stable.",
      "tethys": "Pas à l’œil nu : Téthys est de magnitude 10,2, à la portée d’un petit télescope, bien que l’éclat de Saturne à côté la rende difficile.",
      "dione": "Pas à l’œil nu : Dioné est de magnitude 10,4, à la portée d’un petit télescope, bien que l’éclat de Saturne à côté la rende difficile.",
      "rhea": "Pas à l’œil nu : Rhéa est de magnitude 10, la plus brillante des lunes de Saturne après Titan, et un petit télescope la montrera.",
      "iapetus": "Pas à l’œil nu : Japet va de la magnitude 10,2 à 11,9 selon que sa face brillante ou sa face sombre se tourne vers nous, un petit télescope le saisit donc quand il est au plus brillant.",
      "miranda": "À peine : Miranda est de magnitude 16,6, perdue dans l’éclat d’Uranus, et invisible dans bien des télescopes d’amateur.",
      "ariel": "Pas à l’œil nu, ni aux jumelles : Ariel est de magnitude 14,8, à peu près aussi faible que Pluton lorsqu’il est au plus près, il faut donc un bon télescope et un ciel sombre.",
      "umbriel": "Pas à l’œil nu, ni aux jumelles : Umbriel est de magnitude 15,1, la plus faible des quatre grandes lunes d’Uranus, il faut donc un bon télescope et un ciel sombre.",
      "titania": "Pas à l’œil nu : Titania est de magnitude 13,9, la plus brillante des lunes d’Uranus, et demande tout de même un télescope d’une certaine taille.",
      "oberon": "Pas à l’œil nu : Obéron est de magnitude 14,1 et c’est le plus éloigné d’Uranus des cinq, il faut donc un télescope et une nuit stable."
    },
    "couldNotLook": "Impossible de calculer un passage d’ici.",
    "nowhereToLook": "Personne ne sait où il est, donc il n’y a nulle part où regarder."
  },
  "controls": {
    "title": "Commandes",
    "layersTitle": "Quoi afficher",
    "layerCount": "{n}",
    "layerCountLoading": "comptage",
    "layerHint": {
      "exoplanets": "Désactivé par défaut. Coche pour les afficher."
    },
    "layerCountEmpty": "vide",
    "layerCountEmptyTitle": "Cette couche est revenue vide : sa source n’a pas pu être lue, ou n’a rien pour l’instant.",
    "layerWaits": "plus tard",
    "layerWaitsTitle": "Chargée quand tu l’actives, pour économiser des données.",
    "layersFailed": "{n} couches vides.",
    "layersFailedOne": "Une couche vide.",
    "layersFailedWhy": "Voir les sources",
    "layerCountParts": {
      "onMap": "{n} sur la carte",
      "riding": "{n} portés par autre chose",
      "unplaceable": "{n} que nous ne savons pas placer",
      "auroraPeak": "jusqu’à {n} % de chances",
      "lightningPerMin": "{n} impacts par minute"
    },
    "layersEmpty": "Aucune couche n’est encore chargée.",
    "groups": {
      "around-earth": "Autour de la Terre",
      "earth": "Météo et sol",
      "solar-system": "Système solaire",
      "beyond": "Étoiles et au-delà"
    },
    "groupCount": "{on} sur {n}",
    "groupAll": "Tout",
    "groupNone": "Aucun",
    "groupAllLabel": "Afficher toutes les couches : {group}",
    "groupNoneLabel": "Masquer toutes les couches : {group}",
    "layerFilter": "Trouver une couche",
    "layersKeys": "Couches : flèches haut/bas pour bouger, Espace pour activer.",
    "layerFilterEmpty": "Aucune couche de ce nom.",
    "keysRow": "Touches",
    "keysRowTouch": "Gestes",
    "keysRowTitle": "Montrer les touches qui déplacent la vue",
    "keysRowTitleTouch": "Montrer les gestes qui déplacent la vue",
    "swatchMixed": "Dessiné dans ses propres couleurs",
    "keyedNote": "Points colorés selon {key} : la légende est en dessous.",
    "localTimeFallback": "local",
    "locationPlaceholder": "Saisis une ville",
    "locationSearchLabel": "Trouver une ville",
    "locationUseMine": "Utiliser ma position",
    "locationUseMineTitle": "Demander au navigateur où tu es",
    "locationInsecure": "Le navigateur ne partage ta position qu’avec les pages servies en https. Cette page est en http simple, donc le bouton est désactivé. Choisis plutôt une ville, ou ouvre l’adresse https quand il y en aura une.",
    "locationUnsupported": "Pas de localisation sur ce navigateur. Choisis une ville.",
    "locationDenied": "Le navigateur a dit non. Choisis plutôt une ville.",
    "locationFailed": "Position introuvable. Choisis plutôt une ville.",
    "locationAsking": "Question posée au navigateur",
    "locationClear": "Effacer",
    "locationNoMatch": "Aucune ville de la liste intégrée ne correspond.",
    "tonightCouldNotLook": "Calcul impossible : aucun satellite n’est chargé."
  },
  "search": {
    "title": "Trouver un objet",
    "placeholder": "Planètes, étoiles, satellites",
    "placeholderPhone": "Rechercher",
    "inputLabel": "Chercher un objet par son nom ou son numéro de catalogue",
    "listLabel": "Objets correspondants",
    "fly": "S’y rendre",
    "flyTitle": "Déplacer la caméra vers l’objet en surbrillance et ouvrir sa fiche",
    "hint": "Deux lettres suffisent. Entrée choisit le premier.",
    "noMatch": "Rien pour « {q} ».",
    "closest": "Noms les plus proches",
    "more": "Encore {n} : tape davantage pour affiner.",
    "searching": "{n} objets explorés.",
    "searchingOne": "Un objet exploré.",
    "searchingBut": "{n} objets explorés, {m} couches pas encore.",
    "searchingButOne": "{n} objets explorés, une couche pas encore.",
    "empty": "Rien n’est encore chargé pour la recherche.",
    "inputTitle": "Rechercher (/)",
    "key": "/",
    "notLoaded": "Non chargé, donc non cherché : {layers}.",
    "stillLoading": "Encore en chargement, donc pas encore cherché : {layers}.",
    "loadsWhenOn": "Chargé seulement quand tu l’actives, pour économiser des données, donc pas encore cherché : {layers}.",
    "couldNotRead": "Illisible, donc non cherché : {layers}.",
    "fallback": "Rien ne commence ainsi. Voici ce qui le contient.",
    "switchedOn": "Activé : {layer}.",
    "belowHorizon": "{name} est sous l’horizon.",
    "notLoadedCount": "Combien d’objets cela laisse de côté, on ne peut pas le savoir avant leur chargement."
  },
  "quality": {
    "dataSaver": "Économie de données : les deux plus grosses listes attendent.",
    "lowered": "Images lentes ({ms} ms) : image plus simple.",
    "tierPhone": "Cartes de surface en 2k pour un téléphone.",
    "tierSaver": "Cartes en 2k pour économiser des données.",
    "tierSmall": "Cartes de surface en 2k pour cet appareil.",
    "tierLatched": "Cartes revenues en 2k : images lentes.",
    "tierLow": "Cartes de surface en 2k, comme le demande Basse.",
    "tier1": "Cartes de surface en 4k, chargées au repos.",
    "tier2": "Cartes en 4k, plus de mondes gardés nets.",
    "promoted": "Montée d’un cran après des images rapides.",
    "mapsWorn": "Cartes sur cet appareil : {credits}.",
    "panelTitle": "Qualité",
    "choices": {
      "auto": "Auto",
      "low": "Basse",
      "medium": "Moyenne",
      "high": "Haute",
      "ultra": "Ultra"
    },
    "autoNow": "Auto : {tier}",
    "titles": {
      "auto": "Choisie d’après cet appareil et sa fluidité",
      "low": "Image la plus légère : pour une batterie ou un vieil ordinateur",
      "medium": "Cartes, relief et météo plus nets",
      "high": "Plus de mondes gardés nets à la fois",
      "ultra": "Pleine résolution et détails les plus fins de près"
    },
    "fellBack": "Images lentes : la qualité est revenue sur Auto."
  },
  "status": {
    "title": "Sources",
    "intro": "Chaque source que lit la carte, l’âge de cette lecture, et d’où elle vient. Rien n’est caché dans un pied de page.",
    "stateOk": "ok",
    "stateStale": "périmée",
    "stateUnknown": "lecture impossible",
    "stateOkTitle": "Lue récemment et dans sa fenêtre de fraîcheur.",
    "stateStaleTitle": "Nous en avons une copie, mais elle est plus ancienne que ce que la source promet.",
    "stateUnknownTitle": "Nous n’avons jamais réussi à lire cette source dans ce navigateur. Ce n’est pas la même chose que « tout va bien », ni qu’une erreur sur une copie que nous gardons.",
    "ageNever": "jamais lue",
    "ageLabel": "dernière lecture {age}",
    "ageNeverLine": "pas encore de bonne copie dans ce navigateur",
    "viaSnapshotLine": "d’après notre copie, récupérée {age}",
    "viaLiveLine": "lue en direct, source : {publisher}, {age}",
    "snapshotOverdue": "une copie plus récente est en retard",
    "snapshotChecking": "(recherche d’une plus récente)",
    "couldNotLookLine": "lecture impossible : {reason}",
    "reasonNoRoute": "{why}, et un navigateur ne peut pas lire {publisher} directement",
    "snapshotWhy": {
      "no-index": "notre index de copies n’a pas pu être lu",
      "not-in-index": "nos copies n’incluent pas cette source",
      "refused": "la dernière récolte a été refusée",
      "error": "la dernière récolte a échoué",
      "skipped": "le collecteur l’a ignorée",
      "unreadable": "notre copie n’a pas pu être lue"
    },
    "harvestUnchecked": "Nos copies : pas encore vérifiées.",
    "harvestUnavailable": "Nos copies ne sont pas disponibles pour le moment, donc chaque source ci-dessous est lue en direct chez son éditeur, ou pas du tout.",
    "harvestLine": "Nos copies : écrites {age} · {ok} flux ok · {refused} refusés · {error} en échec",
    "errorLabel": "Dernière erreur",
    "attributionTitle": "Crédits",
    "attributionIntro": "Les données de cette carte sont le travail d’autres personnes.",
    "footCreditsIntro": "Images et textures :",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "Textures de planètes et d’étoiles, sous licence CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "Images de nuages, de la face nuit et de la surface, et modèles 3D",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "Nuages",
    "auroraTitle": "Aurore polaire",
    "weatherTitle": "Foudre",
    "layersTitle": "En direct ou intégré",
    "layersIntro": "« En direct » est lu chez son éditeur, ou calculé pour cet instant, pendant que tu regardes. Un catalogue est livré avec l’appli : les étoiles, les galaxies, les antennes et les sites d’atterrissage au sol ne bougent pas pendant que tu regardes. Un échantillon intégré remplace une source qu’un navigateur ne peut pas appeler du tout.",
    "layerLive": "en direct",
    "layerCatalogue": "catalogue",
    "layerSample": "échantillon intégré",
    "layerIllustrative": "dessiné, pas suivi",
    "layerMixed": "mixte",
    "layerEmpty": "rien de chargé",
    "layerCountLabel": "{n} affichés",
    "sourcesEmpty": "Aucune source n’a été déclarée.",
    "notAsked": "{n} autres sources ne sont lues que lorsqu’une couche qui en a besoin est activée."
  },
  "time": {
    "justNow": "à l’instant",
    "aMinuteAgo": "il y a une minute",
    "minutesAgo": "il y a {n} minutes",
    "anHourAgo": "il y a une heure",
    "hoursAgo": "il y a {n} heures",
    "aDayAgo": "il y a un jour",
    "daysAgo": "il y a {n} jours",
    "lessThanAMinute": "moins d’une minute",
    "aMinute": "une minute",
    "minutes": "{n} minutes",
    "anHour": "une heure",
    "hours": "{n} heures",
    "aDay": "un jour",
    "days": "{n} jours",
    "months": "{n} mois",
    "years": "{n} ans",
    "inFuture": "dans {d}",
    "ago": "il y a {d}"
  },
  "sheet": {
    "handle": "Hauteur du volet",
    "closed": "fermé",
    "peek": "abaissé",
    "half": "à moitié ouvert",
    "full": "tout ouvert",
    "state": "{height}. Les flèches haut et bas le changent",
    "title": "Hauteur du volet : {height}. Touche ou glisse pour la changer"
  },
  "print": {
    "title": "Enregistrer cette vue en carte postale de 6 sur 4 pouces (JPEG)",
    "making": "Création de la carte postale",
    "saved": "Carte postale enregistrée",
    "failed": "La carte postale n’a pas pu être créée à l’instant",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "Tel que l’œil le voit",
      "deep": "Pose profonde : lumière faible relevée"
    },
    "look": {
      "measured": "Aspect Mesuré"
    }
  },
  "hud": {
    "fromYou": "de toi",
    "fromPlace": "depuis {place}",
    "behind": "derrière {world}",
    "offScreen": "{name}, à {distance}, hors de l’écran : s’y rendre",
    "live": "{name} : {readouts}"
  },
  "clean": {
    "hide": "Masquer tous les panneaux (H)",
    "show": "Réafficher les panneaux (H ou Échap)",
    "hint": "H ou Échap pour les panneaux. Maj+H garde les étiquettes et l’heure"
  },
  "mark": {
    "label": "Code source sur GitHub",
    "title": "Code source de Space Radar sur GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "Dossier de presse",
    "pressTitle": "Ce que c’est, des images et le logo à utiliser",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "Station",
    "satellite": "Satellite",
    "debris": "Débris",
    "rocket": "Fusée",
    "probe": "Sonde",
    "telescope": "Télescope",
    "asteroid": "Astéroïde",
    "comet": "Comète",
    "site": "Site au sol",
    "world": "Monde",
    "star": "Étoile",
    "exoplanet": "Planète d’une autre étoile",
    "dso": "Objet du ciel profond",
    "exotic": "Objet extrême",
    "storm": "Cyclone tropical",
    "earthevent": "Événement sur Terre",
    "oddity": "Curiosité",
    "unknown": "Objet"
  },
  "cls": {
    "nearEarthApprox": "Si près de la Terre, sa place est approximative : l’orbite dessinée tourne autour du Soleil seul et ignore l’attraction de la Terre.",
    "label": "Comment nous savons où il est",
    "measured": "position mesurée",
    "inferred": "position propagée à partir d’éléments vieux de {n} {unit}",
    "inferredUnknownAge": "position propagée à partir d’éléments d’âge inconnu",
    "inferredNoElements": "position calculée plutôt que mesurée",
    "stormAdvisory": "son centre au bulletin de {time} UTC, {ago} ; une tempête bouge, donc elle a bougé depuis",
    "stormAdvisoryDated": "son centre au bulletin du {date} à {time} UTC, {ago} ; une tempête bouge, donc elle a bougé depuis",
    "illustrative": "dessiné pour montrer où il va ; la vraie trajectoire n’est pas publique",
    "placeIllustrative": "son orbite réelle, tirée du catalogue de CelesTrak, à une place inventée le long de celle-ci ; nous n’avons aucun élément actuel pour lui",
    "sample": "données d’échantillon intégrées, pas une position en direct",
    "provisional": "pas encore dans le catalogue public — ce sont les éléments de l’opérateur lui-même, publiés via CelesTrak ; un numéro définitif viendra quand Space-Track l’inscrira",
    "unknown": "nous ne pouvons pas dire comment cette position a été calculée",
    "unplaced": "personne ne sait où il est, donc rien n’est dessiné pour lui",
    "inferredArc": "la dernière fois que quelqu’un l’a vu, c’était le {date}, et {caveat}",
    "precisionSplit": "{anchorName} : position mesurée à {anchorM} m près ; celui-ci a été {how} et est placé à {objectM} m près",
    "precisionSplitUnknown": "{anchorName} : position mesurée à {anchorM} m près ; cet objet lui-même n’a jamais été relevé",
    "precisionSplitHowOnly": "{anchorName} : position mesurée à {anchorM} m près ; cet objet a été {how}, et personne n’a publié avec quelle précision",
    "precisionOwn": "situé à {objectM} m près, {how}",
    "aboard": "c’est la position de son porteur, {carrier}, car l’objet est boulonné à l’extérieur et va où il va",
    "how": {
      "surveyed": "relevé depuis l’orbite",
      "photogrammetric": "retrouvé sur des photographies",
      "orbital_imaging": "retrouvé sur des images orbitales",
      "unsurveyed": "laissé sans relevé",
      "map_reference": "pris sur une carte"
    },
    "hourWord": "heure",
    "hoursWord": "heures",
    "dayWord": "jour",
    "daysWord": "jours",
    "minuteWord": "minute",
    "minutesWord": "minutes",
    "yearWord": "an",
    "yearsWord": "ans"
  },
  "unplaced": {
    "why": "{whyUnknown}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "Incendie",
      "volcano": "Volcan en éruption",
      "iceberg": "Iceberg"
    },
    "rows": {
      "kind": "Ce que c’est",
      "reported": "Dernier signalement",
      "since": "En éruption depuis",
      "first": "Premier signalement",
      "size": "Taille",
      "where": "Où",
      "by": "Signalé par"
    },
    "sizeValue": "{n} km²",
    "sizeSmall": "moins de 1 km²",
    "by": "{agencies}, via NASA EONET",
    "sky": "C’est au sol. Depuis l’orbite, un incendie est un panache de fumée, un volcan une colonne de cendres, un iceberg une dalle blanche sur l’eau sombre.",
    "drawn": "dessiné comme une marque à son dernier emplacement signalé ; son étendue au sol n’est pas dessinée",
    "honesty": "Un point d’EONET, de la NASA, signalé en dernier le {date} et lu {read}. Pour regarder, pas un registre officiel de l’endroit ni du moment."
  },
  "deepFacts": {
    "methodRow": "Distance trouvée par",
    "billionLightYears": "{n} milliards d’années-lumière",
    "methods": {
      "parallax": "parallaxe : le décalage de son étoile devant le ciel lointain",
      "eclipsing-binary": "les étoiles binaires à éclipses qu’on y trouve",
      "cepheid": "les étoiles variables céphéides qu’on y trouve",
      "TRGB": "ses plus brillantes géantes rouges",
      "standard-candle": "des étoiles ou des explosions d’éclat connu",
      "redshift": "son décalage vers le rouge, via une cosmologie",
      "kinematic": "la vitesse de son déplacement avec la rotation de la galaxie",
      "assumed-member-of-parent": "aucune méthode propre : on le place à la distance de sa galaxie"
    },
    "drawnTag": {
      "reconstruction": "· reconstitué",
      "model": "· modèle",
      "photograph": "· photographie",
      "catalogue": "· catalogue",
      "illustration": "· illustration"
    },
    "drawnWords": {
      "reconstruction": "une reconstitution 3D d’après une étude publiée",
      "model": "un modèle de son genre, pas ses propres étoiles",
      "photograph": "une vraie photographie, vue de chez nous",
      "catalogue": "des positions de catalogue",
      "illustration": "une lueur et une marque illustratives de son genre"
    },
    "drawnLine": "Ce qui est dessiné : {drawn}.",
    "drawnJoin": " ; ailleurs, ",
    "records": {
      "dso-milky-way": {
        "drawn": "une illustration construite sur des mesures",
        "split": "Mesuré : les étoiles à quelques milliers d’années-lumière (Gaia), l’angle de la barre, les directions le long des bras et les bras les plus proches (Reid et al. 2019). Déduit : l’autre côté, au-delà du centre, caché par la poussière ; ses bras sont les bras proches prolongés."
      }
    }
  },
  "truth": {
    "label": "Comment nous le savons",
    "hints": {
      "measured": "Mesuré",
      "inferred": "Calculé",
      "illustrative": "Illustratif",
      "sample": "Échantillon",
      "unknown": "Inconnu",
      "unplaced": "Non placé",
      "reconstruction": "Reconstitué",
      "model": "Modèle",
      "photograph": "Photographie",
      "catalogue": "Catalogue",
      "illustration": "Illustration"
    },
    "loading": "Ouverture de la légende.",
    "failed": "La légende ne s’est pas chargée. La ligne ci-dessous le dit en bref."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "De près, de petits tourbillons roulent là où les vents mesurés se cisaillent et dans le sillage de la Grande Tache rouge, et l’Ovale BA et trois ovales blancs tournent. L’endroit du cisaillement est mesuré ; chaque tourbillon est généré, plus fin que la carte : illustratif."
    },
    "poles": {
      "jupiter": "Les cyclones autour de chaque pôle sont modélisés d’après les observations de Juno en 2017, huit autour du pôle nord et cinq autour du pôle sud : une reconstitution, pas une photographie. La couche plus sombre entre eux est illustrative."
    }
  },
  "weatherDetail": "Plus près que ne le permet la netteté de la carte, une fine texture de nuages striés est générée pour porter l’image : elle suit les vents mesurés et garde les couleurs de la carte, et pas une seule strie n’est un vrai nuage. Illustratif.",
  "weatherVortex": {
    "turning": {
      "saturn": "De près, un petit cyclone tourne dans l’hexagone : son œil fait 2 000 km de large et sa paroi tourne à 150 mètres par seconde, comme Cassini l’a mesuré en 2012. La spirale dessinée autour est illustrative, et plus rien ne le surveille aujourd’hui."
    },
    "still": {
      "saturn": "De près, un petit cyclone se tient dans l’hexagone : son œil fait 2 000 km de large, comme Cassini l’a mesuré en 2012, quand sa paroi tournait à 150 mètres par seconde. La spirale dessinée autour est illustrative, et plus rien ne le surveille aujourd’hui."
    }
  },
  "sunAlive": {
    "prominences": "{n} protubérances se dressent sur son bord, aux régions actives que la NOAA liste à moins de quinze degrés du limbe. Les emplacements sont mesurés ; les formes, les hauteurs et le mouvement sont illustratifs.",
    "prominencesOne": "Une protubérance se dresse sur son bord, à une région active que la NOAA liste à moins de quinze degrés du limbe. L’emplacement est mesuré ; la forme, la hauteur et le mouvement sont illustratifs.",
    "flare": "Une éruption de classe {cls} est visible dans la région {region} : elle a culminé à {time} UTC le {date}, d’après la liste d’événements de la NOAA. Son heure, sa classe, sa région et son déclin sont mesurés ; son éclat dessiné est illustratif.",
    "cme": "Une éjection de masse coronale partie à {time} UTC le {date} à {speed} km/s est dessinée comme la montre un coronographe : une boucle brillante qui s’éloigne, un creux plus sombre derrière elle et un cœur brillant. Son départ, sa direction, sa largeur et sa vitesse viennent du catalogue DONKI de la NASA ; le nuage garde cette vitesse, ce que ne font pas les vrais, et son aspect est illustratif."
  },
  "starSystem": {
    "zoneLabel": "Zone habitable, calculée",
    "orbitOf": {
      "mercury": "Orbite de Mercure, pour l’échelle",
      "earth": "Orbite de la Terre, pour l’échelle",
      "jupiter": "Orbite de Jupiter, pour l’échelle",
      "neptune": "Orbite de Neptune, pour l’échelle"
    },
    "rows": {
      "known": "Ce qu’on sait",
      "orbit": "Distance à son étoile",
      "temperature": "Température, calculée",
      "zone": "Zone habitable, calculée",
      "starTemperature": "Température de surface",
      "starWidth": "Largeur",
      "starGlow": "Halo",
      "starMass": "Masse",
      "planets": "Planètes dessinées",
      "stars": "Étoiles du système",
      "companion": "Second soleil"
    },
    "unseen": "Personne n’a vu sa surface.",
    "measuredOne": "Sa {what} est mesurée.",
    "measuredMany": "Mesurées : {what}.",
    "estimatedOne": "Sa {what} est une estimation.",
    "estimatedMany": "Estimations : {what}.",
    "unmeasuredOne": "Sa {what} n’est pas mesurée.",
    "and": " et ",
    "what": {
      "size": "taille",
      "year": "année",
      "mass": "masse",
      "least": "masse minimale possible"
    },
    "au": "{n} UA",
    "auComputed": "{n} UA, calculées d’après son année et la masse de son étoile",
    "earthsEstimated": "{n} × la Terre, estimation de l’archive d’après sa masse",
    "massEstimated": "{n} × la Terre, estimation de l’archive d’après sa taille",
    "massLeast": "Au moins {n} × la Terre",
    "sizeDefault": "Non mesurée : dessinée à la taille de la Terre",
    "temperature": "{k} K ({c} °C), si elle réfléchit {pct} % de sa lumière comme la Terre",
    "zone": {
      "inside": "À l’intérieur",
      "edge": "En bordure : à l’intérieur des limites larges seulement",
      "hotter": "Plus près de l’étoile que la zone",
      "colder": "Plus loin de l’étoile que la zone"
    },
    "zoneNone": {
      "too-hot": "Non calculée : la formule ne couvre pas une étoile aussi chaude",
      "too-cool": "Non calculée : la formule ne couvre pas une étoile aussi froide",
      "no-temperature": "Non calculée : la température de l’étoile n’est pas mesurée",
      "no-luminosity": "Non calculée : l’éclat de l’étoile n’est pas mesuré",
      "twoStars": "Non calculée : elle tourne autour de deux étoiles et le catalogue n’en décrit qu’une"
    },
    "zoneRange": "{a} à {b} UA de l’étoile (Kopparapu et al. 2014)",
    "overlay": {
      "title": "Superposer à la carte",
      "zone": "Zone habitable",
      "orbits": "Orbites de nos planètes",
      "zoneTitle": "Là où de l’eau liquide pourrait durer à la surface d’une planète, calculé d’après la température et l’éclat de l’étoile",
      "orbitsTitle": "Les orbites des planètes de notre propre système solaire, dessinées autour de cette étoile pour l’échelle",
      "note": {
        "none": "Rien n’est superposé au système.",
        "zone": "La bande verte est la zone habitable, calculée (Kopparapu et al. 2014), pas observée.",
        "orbits": "Les anneaux en tirets sont des orbites de notre propre système solaire, pour l’échelle. Rien ici ne les suit.",
        "both": "La bande verte est la zone habitable, calculée ; les anneaux en tirets sont les orbites de nos propres planètes, pour l’échelle."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "Non mesuré",
    "starPoint": "Non mesurée : dessinée comme un point de lumière",
    "starWhite": "Non mesurée : dessinée en blanc",
    "starGlowValue": "Dessiné plus large que l’étoile, dans sa couleur, pour qu’on le voie de loin",
    "starsOne": "{n} dans le catalogue ; une est dessinée",
    "starsBoth": "Deux, toutes deux dessinées",
    "companionValue": "{width} de large, {mass} de masse, {k} K{derived}",
    "companionDerived": " (valeur de modèle ; sa couleur est illustrative)",
    "zoneBoth": "{a} à {b} UA, lumière des deux soleils additionnée",
    "pairLine": "Les deux soleils tournent l’un autour de l’autre tous les {days} jours, à {a} UA l’un de l’autre en moyenne, sur l’orbite mesurée par les articles scientifiques ; la planète tourne autour des deux. Leurs positions sont calculées d’après cette orbite ; le plan dans lequel ils sont dessinés, celui des planètes, est celui que la vue du ciel utilise.",
    "line": "Tailles et années d’après la NASA Exoplanet Archive, consultée le {date}. Les orbites sont dessinées comme des cercles{computed} ; les couleurs{phase} et l’inclinaison des orbites sont illustratives{defaults}.",
    "lineComputed": ", dont {n} dimensionnées d’après l’année et la masse de l’étoile",
    "lineDefaults": " ; une planète sans taille mesurée est dessinée à la taille de la Terre"
  },
  "shells": {
    "radio": "La radio venue de la Terre a atteint {n} années-lumière"
  },
  "groundDoor": {
    "stand": "Se tenir ici",
    "drive": "Se tenir ici et conduire",
    "standTitle": "Se tenir sur le sol mesuré à {name}",
    "driveTitle": "Se tenir sur le sol mesuré à {name} et conduire le rover",
    "noDrive": "Ce rover ne peut pas être conduit ici : son sol n’est pas encore mesuré dans l’application. Curiosity, Perseverance, Zhurong et Opportunity le peuvent, depuis leurs propres fiches."
  },
  "flood": {
    "on": "L’éclairer",
    "off": "Vraie lumière",
    "title": "Éclairer le modèle uniformément, pour le voir dans l’ombre. Ce n’est pas la vraie lumière.",
    "note": "Notre lampe, pas la vraie lumière."
  },
  "ephemeris": {
    "drawn": "Dessiné d’après JPL Horizons, interpolé : à environ {km} km de la trajectoire de JPL.",
    "note": "La carte garde sa trajectoire pour ce jour-là, d’après JPL Horizons, précise à environ {km} km.",
    "noteLate": "La trajectoire de JPL pour cet objet commence {n} minutes après ce moment, et l’horloge va là. Précise à environ {km} km.",
    "noteDay": "La page de la NASA donne le jour. L’horloge va à {time} UTC, le passage le plus proche dans la trajectoire de JPL ce jour-là, précis à environ {km} km.",
    "failed": "Sa trajectoire pour ce jour-là ne s’est pas chargée, donc l’horloge reste où elle est. Choisis-le à nouveau pour réessayer.",
    "span": "La trajectoire de JPL pour cet objet va de {from} à {to}.",
    "before": "L’horloge est avant, donc la carte n’a pas de position pour lui.",
    "after": "L’horloge est après, donc la carte n’a pas de position pour lui.",
    "go": "Aller à la date disponible la plus proche",
    "goBefore": "Mettre l’horloge sur {date}, où commence la trajectoire de JPL pour cet objet",
    "goAfter": "Mettre l’horloge sur {date}, où s’arrête la trajectoire de JPL pour cet objet"
  },
  "offline": {
    "updateReady": "Une version plus récente est prête",
    "reload": "Recharger"
  },
  "keepTrip": {
    "keep": "Garder hors ligne",
    "keepTitle": "Enregistrer la voix, les modèles et les cartes de ce voyage sur cet appareil pour qu’il se lise sans connexion",
    "keeping": "Enregistrement : {done} sur {total}",
    "kept": "Gardé hors ligne",
    "keptTitle": "Gardé sur cet appareil. Appuie pour le récupérer à nouveau.",
    "keptNote": "{n} fichiers, {size}, enregistrés sur cet appareil. Les données en direct (météo, tempêtes, satellites) ne sont pas gardées.",
    "again": "Réessayer",
    "failedNote": "{done} fichiers sur {total} enregistrés. Vérifie la connexion et réessaie."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "Appuie sur une touche pour démarrer avec le son",
    "gateTitleTouch": "Touche l’écran pour démarrer avec le son",
    "gateNote": "Si personne n’est là, ça démarre en silence, avec des sous-titres, dans {n} secondes.",
    "upNext": "Voyage suivant",
    "shape": "{n} étapes · {m} min",
    "take": "Prendre les commandes",
    "takeTitle": "Arrêter les voyages et déplacer la carte toi-même"
  },
  "drift": {
    "name": "Dérive",
    "pause": "Pause (Espace)",
    "resume": "Reprendre (Espace)",
    "next": "Lieu suivant (N)",
    "options": "Options",
    "optionsTitle": "Ce qu’on traverse, ce qu’on montre et le rythme",
    "leave": "Arrêter la dérive (Échap)",
    "through": "Traverser",
    "cats": {
      "craft": "Engins spatiaux",
      "worlds": "Mondes",
      "small": "Petits corps",
      "stars": "Étoiles",
      "deep": "Ciel profond"
    },
    "show": "Afficher",
    "real": "Vrais modèles",
    "realTitle": "Seulement ce qui a un vrai modèle, une vraie carte ou une vraie photographie",
    "names": "Noms",
    "namesTitle": "Le nom et les chiffres à côté de chaque lieu",
    "bare": "Rien que l’espace",
    "bareTitle": "Rien que le ciel et ce qu’il contient : ni noms, ni repères, ni lignes, ni panneaux",
    "pace": "Rythme",
    "paces": {
      "calm": "Calme",
      "steady": "Régulier",
      "brisk": "Vif"
    },
    "hint": "Dérive en cours. Fais glisser la carte pour prendre les commandes",
    "nothing": "Rien à traverser avec ces choix",
    "notFromGround": "La dérive part de l’espace, pas du sol"
  },
  "tour": {
    "label": "La visite",
    "micro": "Visite",
    "count": "{n} / {of}",
    "next": "Suivant",
    "nextTitle": "L’étape suivante (N)",
    "done": "Terminé",
    "doneTitle": "Terminer la visite",
    "skip": "Passer",
    "skipTitle": "Quitter la visite (Échap)",
    "voice": "Voix",
    "voiceTitle": "Lire chaque étape à voix haute, avec une voix synthétique",
    "waited": "Regarde un peu, puis continue.",
    "invite": "Première fois ? Fais la visite",
    "inviteTitle": "Huit étapes autour de la carte"
  },
  "undo": {
    "moved": "Déplacé vers {name}",
    "movedNowhere": "La vue a bougé",
    "night": "Nuit à {name} : la vue large",
    "back": "Revenir où tu étais",
    "done": "Revenu où tu étais"
  },
  "searchRows": {
    "kinds": {
      "sun": "Étoile",
      "planet": "Planète",
      "moon": "Lune",
      "station": "Station spatiale",
      "satellite": "Satellite",
      "telescope": "Télescope spatial",
      "probe": "Sonde spatiale",
      "rocket": "Fusée",
      "launch": "Lancement",
      "debris": "Débris",
      "asteroid": "Astéroïde",
      "comet": "Comète",
      "site": "Lieu",
      "landing": "Site d’atterrissage",
      "star": "Étoile",
      "exoplanet": "Planète d’une autre étoile",
      "dso": "Objet du ciel profond",
      "storm": "Tempête tropicale",
      "oddity": "Curiosité",
      "earthevent": "Événement sur Terre",
      "blackhole": "Trou noir",
      "pulsar": "Pulsar",
      "magnetar": "Magnétar",
      "quasar": "Quasar"
    },
    "upNow": "dans le ciel maintenant, {compass}",
    "lowNow": "bas maintenant, {compass}",
    "downNow": "sous ton horizon maintenant",
    "trip": "Voyage",
    "starPattern": "Constellation d’étoiles",
    "mission": "Mission",
    "eventName": "{mission} : {title}",
    "event": "Événement de mission · {date}",
    "eventNoDate": "Événement de mission",
    "group": "Constellation de satellites · {n} sur la carte · appuie pour les lister",
    "nearMe": "Près de moi ce soir",
    "nearMeSub": "Ce qui est dans ton ciel"
  },
  "countdown": {
    "go": "Feu vert pour le lancement",
    "tbc": "Heure à confirmer",
    "tbd": "Heure pas encore fixée",
    "hold": "En attente : le compte à rebours est suspendu",
    "inFlight": "En vol",
    "success": "Lancé",
    "deployed": "Charge utile déployée",
    "failure": "Le lancement a échoué",
    "partial": "Un échec partiel",
    "byPlan": "Selon le plan. Pas de nouvelle plus récente",
    "byPlanClimbing": "Selon le plan, en montée. Pas de nouvelle plus récente",
    "age": "lu {age}"
  },
  "today": {
    "title": "Aujourd’hui",
    "moonTitle": "{phase}",
    "moonLine": "{pct} % éclairée · {next} le {date}",
    "moonNext": [
      "nouvelle Lune",
      "premier quartier",
      "pleine Lune",
      "dernier quartier"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "30 derniers jours",
    "launched": "{n} nouveaux objets en orbite",
    "launchedLine": "Le plus récent : {name}",
    "debris": "Les débris en chiffres",
    "debrisClose": "Fermer la vue des débris",
    "debrisTitle": "Compte tout ce qui est suivi en orbite. Lit tout le catalogue, environ 1,5 Mo"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a} et {b}.",
    "title": "D’après {sources}. Appuie pour y aller",
    "names": {
      "sat-25544": "l’ISS",
      "sat-48274": "Tiangong"
    },
    "pass": "{name} te survole {when}",
    "launch": "{name} doit décoller {when}",
    "showerToday": "le pic des {name} est aujourd’hui",
    "showerTomorrow": "le pic des {name} est demain",
    "moonName": "La Lune",
    "moonPhases": [
      "nouvelle",
      "",
      "pleine",
      ""
    ],
    "moonToday": "la Lune est {phase} aujourd’hui",
    "moonOne": "la Lune est à un jour d’être {phase}",
    "moonDays": "la Lune est à {n} jours d’être {phase}",
    "moonLit": "la Lune est éclairée à {pct} %",
    "crew": "{n} personnes sont en orbite en ce moment",
    "crewOne": "une personne est en orbite en ce moment",
    "storms": "{n} tempêtes tournent",
    "stormOne": "une tempête tourne",
    "approach": "{name} passe près de la Terre {when}",
    "launched": "{n} nouveaux objets en orbite en 30 jours",
    "dateToday": "aujourd’hui, c’est le {date}",
    "dateClock": "l’horloge est réglée sur le {date}",
    "sources": {
      "pass": "les éléments orbitaux de CelesTrak",
      "launch": "Launch Library 2",
      "shower": "le calendrier des pluies de l’IMO",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "l’horloge de ton appareil"
    }
  },
  "wonder": {
    "kicker": "Merveille du jour",
    "label": "Merveille du jour : {title}"
  },
  "story": {
    "kicker": "L’histoire de la semaine · semaine {week}",
    "label": "L’histoire de la semaine : {title}",
    "ruleTitle": "Comment on l’a calculé : {rule}",
    "lowest": {
      "title": "Le plus bas de notre catalogue : {name}",
      "line": "Jamais au-dessus de {apogee} km, jusqu’à {perigee} km, un tour en {min} min.",
      "rule": "Le plus bas des points les plus hauts parmi {n} jeux d’éléments de moins de 7 jours"
    },
    "farthest": {
      "title": "Le plus lointain de notre catalogue : {name}",
      "line": "Jusqu’à {apogee} km, puis retour à {perigee} km, un tour en {lap}.",
      "hours": "{n} heures",
      "days": "{n} jours",
      "rule": "Point le plus haut parmi {n} jeux d’éléments de moins de 7 jours"
    },
    "busiest": {
      "title": "L’altitude la plus fréquentée de notre catalogue : {lo} à {hi} km",
      "line": "{n} des {total} objets que nous suivons y volent : {pct} sur 100.",
      "rule": "Tranche de {band} km d’altitude moyenne la plus remplie, sur {n} jeux de moins de 7 jours"
    },
    "oldest": {
      "title": "Le plus ancien lancement de notre catalogue : {name}",
      "line": "Lancé en {year}, {years} ans là-haut, un tour en {min} min.",
      "rule": "Année de lancement la plus ancienne parmi {n} jeux d’éléments de moins de 7 jours"
    }
  },
  "happened": {
    "flown": "Décollé {age}",
    "lost": "Échec du lancement {age}"
  },
  "passport": {
    "title": "Passeport",
    "openTitle": "Où tu es allé, gardé dans ce navigateur seulement",
    "summary": "{places} · {n} voyages sur {total}",
    "places": "{n} lieux",
    "placeOne": "{n} lieu",
    "kept": "Gardé dans ce navigateur seulement, jamais envoyé.",
    "notKept": "Ce navigateur ne garde rien, donc rien ici.",
    "placesTitle": "Lieux ouverts",
    "tripsTitle": "Voyages terminés",
    "outOf": "{n} sur {total}",
    "barLabel": "{n} voyages terminés sur {total}",
    "placeTitle": "Aller à {name}",
    "noPlaces": "Aucun lieu. Ouvres-en un sur la carte.",
    "noTrips": "Aucun voyage terminé pour l’instant.",
    "seenTitle": "Vu de tes propres yeux",
    "noSeen": "Rien de coché. Une fiche a un bouton « Je l’ai vu ».",
    "seenIt": "Je l’ai vu",
    "toolsLabel": "Plus pour cet objet",
    "seenOn": "Vu le {date}",
    "seenTitleOff": "Coche quand tu l’as vu de tes propres yeux",
    "seenTitleOn": "Coché comme vu. Appuie pour retirer la coche",
    "seenNotKept": "Ce navigateur ne garde rien, donc la coche ne restera pas",
    "remind": "Me le rappeler",
    "remindTitle": "Télécharge un fichier de calendrier avec un rappel : {title}",
    "forget": "M’oublier",
    "forgetConfirm": "Oui, oublier",
    "forgetTitle": "Efface le passeport et le choix du son de ce navigateur",
    "forgotten": "Oublié. Ce navigateur ne garde plus rien.",
    "stamp": "Voyage {n} sur {total} · {date}",
    "stampPlaces": "{places} ouverts jusqu’ici",
    "resume": "Reprendre à l’étape {n}"
  },
  "kept": {
    "title": "Ce que ce site garde sur ton appareil",
    "lines": [
      "Ton passeport : lieux ouverts, voyages terminés, choses cochées comme vues.",
      "Ton choix de son et de voix, et la façon dont tu as laissé les panneaux.",
      "Une copie des dernières données lues, pour que la carte s’ouvre sans connexion.",
      "Quand un écran tourne tout seul, un court journal de ses voyages, pour cet onglet seulement."
    ],
    "place": "Ton lieu est arrondi au dixième de degré et gardé seulement tant que cette page est ouverte.",
    "none": "Pas de compte, pas de cookies, pas de statistiques. « M’oublier », dans le Passeport, efface le passeport et le choix du son."
  },
  "buildInfo": {
    "line": "Construit à partir de {sha}, {date}",
    "title": "Le commit à partir duquel ce site a été construit, sur GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "L’espace ressemble-t-il à ça ?",
    "lead": "L’endroit où sont les choses et la façon dont elles bougent sont mesurés ou calculés. Leur aspect vient de trois sortes d’images.",
    "kinds": [
      [
        "Un modèle 3D",
        "Les nébuleuses et les galaxies sont des modèles 3D construits à partir de mesures publiées, leur lumière tirée de photographies de télescope (en longue pose) ; celles qui n’ont pas encore de modèle sont une douce lueur de leur taille. Pour l’œil, le même gaz est une faible lueur grise. Une fiche peut montrer la photographie à côté de son modèle."
      ],
      [
        "Une carte sur un modèle",
        "Les planètes et les lunes sont des globes habillés de cartes faites à partir d’images de sondes, certaines lissées par un artiste. Les engins spatiaux sont des modèles 3D, la plupart tirés de fichiers publiés par la NASA. La lumière qui les éclaire est calculée pour le moment affiché."
      ],
      [
        "Une vue d’artiste",
        "Personne n’a vu la surface d’une planète d’une autre étoile. Ces visages sont imaginés à partir d’une taille et d’une température mesurées, et leurs fiches le disent."
      ]
    ],
    "foot": "Les tailles et les distances sont parfois modifiées pour qu’une chose puisse être vue. Quand c’est le cas, la fiche ou l’image le dit."
  },
  "debris": {
    "title": "Débris en orbite",
    "reading": "Lecture du catalogue, environ 1,5 Mo",
    "failed": "Le catalogue n’a pas pu être lu.",
    "retry": "Réessayer",
    "empty": "Le catalogue ne liste rien en orbite.",
    "lead": "{gone} des {total} objets suivis en orbite ne fonctionnent plus.",
    "kinds": {
      "debris": "morceaux de débris",
      "rocket": "étages de fusée usagés",
      "dead": "satellites hors service",
      "working": "satellites en service"
    },
    "bandsTitle": "Par altitude",
    "bands": {
      "low": "Moins de 600 km",
      "crowded": "600 à 1 000 km",
      "upper": "1 000 à 2 000 km",
      "medium": "2 000 à 34 000 km",
      "geo": "Autour de 36 000 km",
      "beyond": "Au-delà de 37 600 km",
      "stretched": "Orbites étirées"
    },
    "bandAria": "{band} : {total} en tout. {debris} débris, {rocket} étages de fusée, {dead} satellites hors service, {working} en service.",
    "show": "Montrer sur la carte",
    "hide": "Masquer de la carte",
    "showTitle": "Chaque débris et chaque étage de fusée usagé, coloré selon son genre",
    "drawn": "{n} points : le gris est un débris, le jaune un étage de fusée usagé. Chacun est à sa vraie altitude et à sa vraie inclinaison, à un endroit inventé de son orbite.",
    "storiesTitle": "Dans le catalogue",
    "oneObject": "un objet",
    "objects": "{n} objets",
    "oneLaunch": "un lancement",
    "launches": "{n} lancements",
    "oneThing": "un objet",
    "things": "{n} objets",
    "storyLaunched": "Dans la semaine jusqu’au {date}, le catalogue a reçu {objects} provenant de {launches}.",
    "storyCameDown": "Cette semaine-là, il est retombé {things}.",
    "storyCameDownBiggest": "Cette semaine-là, il est retombé {things}, le plus gros étant {name}.",
    "storyCloud": "Le plus gros nuage de débris vient de {name} : {pieces} morceaux encore en orbite.",
    "storyClouds": "Les plus gros nuages de débris : {name}, {pieces} morceaux encore là-haut ; puis {name2}, {pieces2}, et {name3}, {pieces3}.",
    "storyOldest": "Le plus vieil objet encore en orbite est {name}, lancé en {year} : {years} ans de tours.",
    "untracked": "Trop petits pour être suivis, d’après le modèle de l’ESA : environ {mid} millions de morceaux de 1 à 10 cm et {small} millions de 1 mm à 1 cm (chiffres : {when}). Une estimation, pas un comptage.",
    "untrackedSource": "Statistiques de l’ESA sur l’environnement spatial",
    "honesty": "Compté d’après le catalogue de CelesTrak lu le {date} : ce que le radar peut suivre, à partir d’environ 10 cm de large. Les morceaux plus petits sont bien plus nombreux et ne sont dans aucun catalogue. L’endroit où se trouve chaque point sur son orbite est illustratif.",
    "drawnPlaced": "{n} points : le gris est un débris, le jaune un étage de fusée usagé. {placed} sont là où les place leur propre jeu d’éléments ; les {rest} autres sont à leur vraie altitude et à leur vraie inclinaison, à un endroit inventé de l’orbite.",
    "honestyPlaced": "Compté d’après le catalogue de CelesTrak lu le {date} : ce que le radar peut suivre, à partir d’environ 10 cm de large. Les morceaux plus petits sont bien plus nombreux et ne sont dans aucun catalogue. Les endroits viennent des jeux d’éléments de CelesTrak du {built} ; un point sans jeu d’éléments publié est à un endroit inventé de son orbite, et sa fiche le dit."
  },
  "klassFar": {
    "dwarf": "Planète naine",
    "interstellar": "Objet interstellaire"
  },
  "moments": {
    "title": "Qu’est-ce qui t’amène",
    "wonder": {
      "id": "wonder",
      "label": "Merveilles",
      "hint": "Vole partout et touche n’importe quoi."
    },
    "now": {
      "id": "now",
      "label": "Maintenant",
      "hint": "Ce qui est au-dessus de ta tête cette minute."
    },
    "next": {
      "id": "next",
      "label": "À venir",
      "hint": "Ce qui arrive, et quand."
    }
  },
  "audio": {
    "on": "Son : activé",
    "off": "Son : coupé",
    "toggleTitle": "Musique et sons. Coupés jusqu’à ce que tu les actives ; mémorisé sur cet appareil.",
    "mute": "Couper",
    "unmute": "Son",
    "muteTitle": "Couper la musique et les sons",
    "unmuteTitle": "Activer la musique et les sons",
    "panelTitle": "Son",
    "panelNote": "Une musique discrète pour la carte et ses voyages. Rien n’est téléchargé avant que tu l’actives.",
    "creditsLine": "Musique et sons : {credits}",
    "narrationCredit": "Narration : une voix synthétique, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "Dessinée de la couleur que sa lumière mesure (B−V {bv}, V−R {vr}), aussi brillante que sa surface le réfléchit (albédo {albedo}) sur une échelle compressée pour que le plus sombre de ces mondes reste visible.",
    "colourRed": "Dessinée de la couleur que sa lumière mesure (B−V {bv}, V−R {vr}), l’une des choses les plus rouges du système solaire, aussi brillante que sa surface le réfléchit (albédo {albedo}) sur une échelle compressée pour que le plus sombre de ces mondes reste visible.",
    "shapeEgg": "Sa forme est l’œuf que sa courbe de lumière et une occultation stellaire de 2017 ont mesuré, {a} × {b} × {c} km.",
    "shapeMeasured": "Sa forme est celle que des occultations stellaires ont mesurée.",
    "shapeUnknown": "Sa forme n’a jamais été mesurée : on la dessine ronde.",
    "ring": "Son anneau est à sa distance, sa largeur et son opacité mesurées ; l’inclinaison de l’anneau sur le ciel n’est pas dessinée.",
    "faintRings": "Ses deux anneaux, découverts en 2023, sont trop faibles pour être vus à leur vraie opacité, donc ils ne sont pas dessinés.",
    "surface": "Aucun télescope n’a résolu sa surface : rien dessus n’est dessiné, et elle est dessinée immobile, sans tourner.",
    "source": "Chiffres : {src}."
  },
  "worldFace": {
    "titan": {
      "title": "Titan, de deux façons",
      "modes": {
        "own": "Infrarouge",
        "radar": "Radar"
      },
      "notes": {
        "own": "Le sol de Titan tel que la caméra de Cassini l’a vu à travers la brume en lumière proche infrarouge (938 nm), dans l’orange de la brume. Les mers du nord sont assombries le long des contours dessinés par le radar de Cassini, et de près, là où le Soleil s’y reflète, elles brillent : l’endroit du reflet est calculé ; sa taille et son éclat sont illustratifs.",
        "radar": "Des bandes du sol de Titan telles que le radar de Cassini les a vues à travers la brume, de 2004 à 2015 : le clair est un sol rugueux ou incliné vers le radar, le sombre est lisse, et les mers de méthane et d’éthane liquides sont noires. Le gris est de notre fait : le radar n’a pas de couleur. Le radar a vu 61 % de Titan ; entre ses bandes, la carte infrarouge apparaît, atténuée, en orange. USGS Astrogeology et NASA/JPL-Caltech, domaine public."
      }
    },
    "venus": {
      "title": "Vénus, de deux façons",
      "modes": {
        "own": "Nuages",
        "surface": "Sol"
      },
      "notes": {
        "own": "Le sommet des nuages, qui est tout ce qu’un œil ou un télescope voit jamais de Vénus.",
        "surface": "Le sol sous les nuages, cartographié par radar depuis l’orbite par la sonde Magellan de la NASA entre 1990 et 1992. Le clair est un sol rugueux, le sombre est lisse. L’orange est ajouté, et les bandes que Magellan a manquées sont comblées à partir de leurs bords. Il est éclairé par le Soleil comme si les nuages n’existaient pas : ses montagnes et ses escarpements, d’après l’altimètre de Magellan, dessinés six fois plus hauts, projettent leurs ombres. Il ne bouge pas avec les nuages."
      }
    },
    "jupiter": {
      "title": "Jupiter, de deux façons",
      "modes": {
        "own": "Carte d’artiste",
        "hubble": "Vu par Hubble"
      },
      "notes": {
        "own": "Une carte d’artiste, faite à partir d’images de sondes et lissée (Solar System Scope). C’est l’image que la plupart des gens connaissent.",
        "hubble": "Jupiter tel que Hubble l’a cartographié le 11 décembre 2025. Les bandes sont là où elles étaient ce jour-là, et aucun nuage n’est là où il est aujourd’hui. Les couleurs viennent des filtres rouge, vert et violet de Hubble, un peu plus jaunes que ce que verrait un œil. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapté."
      }
    },
    "saturn": {
      "title": "Saturne, de deux façons",
      "modes": {
        "own": "Carte d’artiste",
        "hubble": "Vu par Hubble"
      },
      "notes": {
        "own": "Une carte d’artiste, faite à partir d’images de sondes et lissée (Solar System Scope). C’est l’image que la plupart des gens connaissent.",
        "hubble": "Saturne tel que Hubble l’a cartographié le 29 août 2025, dans ses filtres rouge, vert et violet, un peu plus jaune que ce que verrait un œil. La bande à l’équateur que les anneaux cachaient ce jour-là est comblée à partir des nuages de chaque côté. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapté."
      }
    },
    "uranus": {
      "title": "Uranus, de deux façons",
      "modes": {
        "own": "Carte d’artiste",
        "hubble": "Vu par Hubble"
      },
      "notes": {
        "own": "Une carte d’artiste, faite à partir d’images de sondes et lissée (Solar System Scope). C’est l’image que la plupart des gens connaissent.",
        "hubble": "Uranus tel que Hubble l’a cartographié le 23 octobre 2025. La planète est couchée sur le côté, son pôle nord tourné vers nous, donc Hubble n’a vu que la moitié nord ; la moitié sud prend la couleur de l’équateur, sans rien deviner. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapté."
      }
    },
    "neptune": {
      "title": "Neptune, de deux façons",
      "modes": {
        "own": "Carte d’artiste",
        "hubble": "Vu par Hubble"
      },
      "notes": {
        "own": "Une carte d’artiste, faite à partir d’images de sondes et lissée (Solar System Scope). C’est l’image que la plupart des gens connaissent.",
        "hubble": "Neptune tel que Hubble l’a cartographié le 24 août 2025 : plus pâle que les images célèbres. L’extrême nord échappait à la vue de Hubble et prend la couleur des derniers nuages qu’il a vus, sans rien deviner. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adapté."
      }
    }
  },
  "exposure": {
    "panelTitle": "Pose",
    "modes": {
      "eye": "Œil",
      "camera": "Caméra",
      "deep": "Profonde"
    },
    "notes": {
      "eye": "Ce que tu verrais depuis un endroit sombre : faible et gris.",
      "camera": "Une longue pose : des minutes de lumière, comme un appareil photo les garde.",
      "deep": "Un étirement d’observatoire : le gaz le plus faible est relevé."
    },
    "real": "Le gaz est réel, et faible : à l’œil, au télescope, c’est une lueur grise, car l’œil de nuit ne voit pas les couleurs. La carte le dessine comme un modèle 3D ; la photographie que montre le curseur est une longue pose.",
    "colours": {
      "broadband": "Elle a été prise à travers de larges filtres de couleur ({filters}), donc les couleurs sont proches de ce que verrait un œil bien plus sensible.",
      "mixed": "Elle a été prise à travers de larges filtres de couleur, avec un filtre étroit pour l’hydrogène incandescent en plus ({filters}), donc le gaz rouge est ici plus fort qu’un œil ne le verrait.",
      "narrowband": "Ses couleurs sont attribuées : chacune est la lumière d’un seul gaz à travers un filtre étroit ({filters}), choisies pour montrer la structure, pas ce que verrait un œil.",
      "infrared": "Elle a été prise en lumière infrarouge, qu’aucun œil ne voit ({filters}), donc chaque couleur ici est choisie : elle montre ce qui est là, pas ce que verrait un œil.",
      "unstated": "Son archive ne dit pas quels filtres ont servi, donc nous ne disons pas si ce sont les couleurs qu’un œil verrait."
    },
    "part": "Elle montre {part}, pas la totalité.",
    "creditLead": "Image : ",
    "creditTail": " · {licence}, bords estompés et ciel assombri par nos soins"
  },
  "look": {
    "panelTitle": "Aspect",
    "modes": {
      "measured": "Mesuré",
      "film": "Cinéma"
    },
    "titles": {
      "measured": "Seulement ce qui est mesuré ou modélisé, à la vraie vitesse",
      "film": "Ajoute des détails générés et une météo illustrative"
    }
  },
  "lookSaid": {
    "measured": "Aspect Mesuré : rien de généré ni d’illustratif n’y est dessiné.",
    "film": "Aspect Cinéma : des détails générés et une météo illustrative sont dessinés.",
    "worlds": {
      "saturn": "Météo : les bandes se déplacent aux vitesses de vent mesurées par Cassini. Mouvement modélisé, pas les nuages d’aujourd’hui."
    },
    "also": {
      "venus": "Des éclairs ont été signalés sur Vénus et sont encore débattus ; aucun n’est dessiné."
    },
    "turning": {
      "jupiter": "De près, l’Ovale BA et trois ovales blancs tournent là où la carte les place."
    },
    "poles": {
      "jupiter": "Les cyclones autour de chaque pôle sont modélisés d’après les observations de Juno en 2017, huit autour d’un cyclone central au nord et cinq autour d’un autre au sud : une reconstitution, pas une photographie."
    },
    "sun": {
      "measured": "Aspect Mesuré : le grain généré est désactivé, et la couronne et les protubérances sont figées.",
      "film": "Aspect Cinéma : le grain est généré, et la couronne et les protubérances bougent comme dessinées, pas comme mesurées."
    }
  },
  "otherLight": {
    "panelTitle": "Autres lumières",
    "bands": {
      "visible": "Visible",
      "infrared": "Infrarouge",
      "microwave": "Micro-ondes",
      "gamma": "Rayons gamma"
    },
    "notes": {
      "visible": "Le ciel tel que le voient les yeux et les appareils photo.",
      "infrared": "Le ciel en infrarouge, en fausses couleurs : poussière chaude et étoiles froides.",
      "microwave": "Les micro-ondes, en luminosité : la Galaxie devant la plus vieille lumière.",
      "gamma": "Les rayons gamma, en fausses couleurs : pulsars, blazars, lueur des rayons cosmiques."
    },
    "colours": {
      "infrared": "Le rouge est 22 µm, le vert 4,6 µm, le bleu 3,4 µm (WISE)",
      "microwave": "Une seule bande, 94 GHz, dessinée en luminosité (WMAP)",
      "gamma": "Le rouge est 0,3 à 1 GeV, le vert 1 à 3, le bleu au-dessus de 3 (Fermi)"
    },
    "mixLabel": "Du ciel visible vers {band}",
    "mixValue": "{pct} % {band}",
    "loading": "Chargement de l’image du ciel entier.",
    "failed": "Cette image n’est pas arrivée. Le ciel reste comme il était.",
    "creditLead": "Relevé : ",
    "creditTail": ". Tuiles : CDS, Strasbourg."
  },
  "overlay": {
    "panelTitle": "Données de la Terre",
    "keyTitle": "Sur le globe en ce moment",
    "keyOff": "Retirer",
    "keyOffTitle": "Montrer la Terre telle qu’elle est",
    "none": "Aucune",
    "loading": "Demande de l’image à la NASA.",
    "failed": "Cette image n’est pas arrivée. Le globe reste comme il était.",
    "noEarth": "Affiché sur la Terre, quand elle est en vue.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "L’image est celle du {date}.",
      "monthly": "L’image est une moyenne mensuelle : {date}."
    },
    "made": {
      "measured": "Mesuré depuis l’orbite ; transparent là où rien n’a été vu.",
      "analysed": "Mesuré, avec les trous comblés.",
      "modelled": "Un modèle météo alimenté par des mesures, pas une image directe."
    },
    "credit": "Données : {credit}, via NASA GIBS. Une carte de données, pas une photographie.",
    "wind": {
      "title": "Vent",
      "loading": "Demande du champ de vent.",
      "failed": "Le champ de vent n’est pas arrivé. Le globe reste comme il était.",
      "what": "Le vent à dix mètres au-dessus du sol ; la couleur est sa vitesse.",
      "dated": "La prévision est pour le {date}, {time} UTC.",
      "mean": "Environ {mean} m/s en moyenne, jusqu’à {max}.",
      "sped": "Les traînées font défiler {n} heures de vent par seconde.",
      "spedDay": "Les traînées font défiler un jour de vent par seconde.",
      "still": "Chaque traînée est un morceau de l’écoulement, immobile.",
      "credit": "Données : {credit}. Un modèle météo, pas une mesure."
    },
    "currents": {
      "title": "Courants océaniques",
      "loading": "Demande des courants océaniques.",
      "failed": "Les courants océaniques du jour ne sont pas là. Le globe reste comme il était.",
      "what": "Courants à la surface de la mer ; la couleur est la température de l’eau.",
      "dated": "Calculé à partir de la hauteur de la mer mesurée par des satellites le {date} : le courant régulier, sans marées ni dérive due au vent, le moins sûr à l’équateur.",
      "tempDated": "Température mesurée le {date}, trous comblés.",
      "tempMissing": "Une traînée grise est de l’eau sans température dans les données.",
      "sped": "Les traînées font défiler {n} jours de dérive par seconde ; une longue traînée est une eau rapide.",
      "spedHours": "Les traînées font défiler {n} heures de dérive par seconde ; une longue traînée est une eau rapide.",
      "still": "Chaque traînée est un morceau de l’écoulement, immobile ; une longue est une eau rapide.",
      "credit": "Données : {credit}."
    },
    "legendAria": "{title}, de {low} à {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "Les figures sont une tradition, dessinées par nous ; les étoiles à leurs coins sont à leurs distances mesurées.",
    "lineSky": "Les figures sont une tradition, dessinées par nous, par-dessus les étoiles telles qu’on les voit depuis la Terre.",
    "ecliptic": "La ligne en tirets est l’écliptique, la trajectoire du Soleil au cours de l’année.",
    "distance": "{n} al",
    "namedDistance": "{name}, {n} al"
  },
  "colourKey": {
    "title": "Couleur selon",
    "unknown": "inconnu pour ceux-ci",
    "scope": "On compte ce qui est dessiné d’ici, couches activées.",
    "byLayer": "La forme est ce qu’elle est ; la couleur est sa couche.",
    "crewed": "parmi eux, conçus pour un équipage",
    "swarm": "parmi eux, dans une grande constellation"
  },
  "trajectory": {
    "label": "Sa trajectoire, le prochain tour et demi",
    "ariaLabel": "Altitude au fil du temps, et trace au sol sur une carte plate",
    "km": "{n} km",
    "now": "maintenant",
    "laps": "1½ tour plus tard",
    "north": "N",
    "south": "S",
    "note": "Calculée à partir des mêmes éléments que le point ; la carte est le sol juste en dessous."
  },
  "timeFacts": {
    "label": "Les 90 prochaines minutes",
    "barLabel": "Soleil et ombre pendant les 90 prochaines minutes : {parts}",
    "barSunlit": "{mins} min au soleil",
    "barShadow": "{mins} min dans l’ombre de la Terre",
    "now": "maintenant",
    "end": "+90 min",
    "entersShadowIn": "Entre dans l’ombre de la Terre dans {mins}",
    "entersSunlightIn": "Ressort dans la lumière du Soleil dans {mins}",
    "entersShadowAt": "Entre dans l’ombre de la Terre à {time}",
    "entersSunlightAt": "Ressort dans la lumière du Soleil à {time}",
    "allSunlit": "Au soleil pendant les 90 prochaines minutes",
    "allShadow": "Dans l’ombre de la Terre pendant les 90 prochaines minutes",
    "minutes": "{n} min",
    "underAMinute": "moins d’une minute",
    "lapIn": "Termine ce tour dans {mmss}",
    "lapAt": "Termine ce tour à {time}",
    "orbit": "Orbite n° {n} depuis le lancement",
    "orbitNote": "Déduit : le compte du catalogue à l’époque des éléments, plus les tours depuis.",
    "launched": "Lancé en {year}",
    "nowSunlit": "Au soleil",
    "nowShadow": "Dans l’ombre de la Terre",
    "shadowIn": "ombre dans {mins}",
    "sunlightIn": "soleil dans {mins}",
    "shadowAt": "ombre à {time}",
    "sunlightAt": "soleil à {time}",
    "lapEndsIn": "fin du tour dans {mmss}",
    "lapEndsAt": "fin du tour à {time}"
  },
  "train": {
    "label": "En train",
    "oneOf": "Un des {n} lancés ensemble ({designator}).",
    "youLead": "Celui-ci est en tête.",
    "leads": "{name} est en tête ; celui-ci est le n° {position} de la file.",
    "stillRaising": "Encore en train de monter en une seule ligne, à environ {alt} km d’altitude — le chapelet de lumières que les gens signalent.",
    "spreadOut": "Maintenant dispersés, à environ {alt} km d’altitude ; ce n’est plus une ligne dans le ciel."
  },
  "aboard": {
    "label": "Aussi à bord",
    "openTitle": "Ouvrir la fiche de cet objet",
    "note": "Ils n’ont pas de point à eux. Ils sont exactement là où est cet engin, car ils sont boulonnés dessus.",
    "backTitle": "Ouvrir la fiche de l’engin qui le porte"
  },
  "myth": {
    "label": "On dit souvent",
    "line": "{claim} — {correction}",
    "contested": "On dit souvent, et c’est vraiment débattu : {claim} — {correction}"
  },
  "source": {
    "prefix": "Source",
    "unknown": "Source non notée",
    "fetched": "lue {age}"
  },
  "photo": {
    "title": "Composer une image",
    "barLabel": "Image",
    "shapesLabel": "Format",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "Cadrer l’image en {shape}",
    "caption": "Légende",
    "captionTitle": "Le bandeau avec le nom, la date et l’adresse",
    "save": "Enregistrer l’image",
    "saveTitle": "Enregistrer ce qu’il y a dans le cadre en JPEG",
    "saveTitlePng": "Enregistrer ce qu’il y a dans le cadre en PNG",
    "timeLabel": "Heure",
    "earlier": "Avant",
    "later": "Après",
    "timeTitle": "{dir} : {unit}, comme le pas de la pastille d’heure",
    "lens": "Objectif",
    "lensValue": "{n}°",
    "lensTitle": "Champ de vision, {n} degrés. Étroit, c’est un téléobjectif ; large, on voit plus",
    "png": "PNG",
    "pngTitle": "Enregistrer sans perte, en fichier plus gros",
    "share": "Partager",
    "shareTitle": "Confier l’image au partage de cet appareil",
    "sharedSaved": "Cet appareil n’a pas voulu la partager. Image enregistrée à la place",
    "done": "Quitter le mode photo",
    "making": "Création de l’image",
    "saved": "Image enregistrée",
    "failed": "L’image n’a pas pu être créée à l’instant",
    "honesty": "Dessiné d’après des positions mesurées, pas une photographie"
  },
  "tonight": {
    "title": "Ce soir",
    "placeGuess": "Près de {place}, deviné d’après ton fuseau horaire",
    "placeSet": "Depuis {place}",
    "placeMine": "Depuis près de chez toi",
    "placeShared": "Depuis {place}, partagé avec toi",
    "noPlace": "Indique où tu es pour voir ce qui passe au-dessus.",
    "coords": "{lat}, {lon}",
    "working": "Calcul des passages de ce soir…",
    "passLine": "{name} · {time} · {from} → {to}, {fists} au plus haut ({deg}°) · {mins} min",
    "startsIn": "Commence dans {countdown}",
    "startsAt": "Commence à {time}",
    "upNow": "Dans le ciel, regarde {dir}",
    "showMe": "Montre-moi",
    "showMeTitle": "Ouvrir le ciel depuis chez toi, face à l’endroit où il se lève",
    "guessCaveat": "Les heures peuvent différer de quelques minutes là où tu es.",
    "unitRises": "se lève",
    "unitHigh": "au plus haut",
    "unitLong": "min visible",
    "degrees": "{deg}°",
    "path": "{from} → {to}",
    "rowDetail": "{time} · {deg}° de haut · {mins} min",
    "nothingTonight": "Rien de brillant au-dessus de toi ce soir.",
    "nextPass": "Prochain : {when} · {name}",
    "nothingAtAll": "Rien de brillant pendant trois jours.",
    "darkFrom": "Nuit noire dès {time}",
    "darkUntil": "Nuit noire jusqu’à {time}",
    "darkNow": "Il fait nuit noire",
    "neverDark": "Il ne fait pas nuit noire ce soir",
    "moonRises": "Lune {pct} %, se lève à {time}",
    "moonUp": "Lune {pct} %, dans le ciel",
    "moonDown": "Lune {pct} %, sous l’horizon",
    "more": "Voir plus",
    "fewer": "Voir moins",
    "arcLabel": "Sa trajectoire dans le ciel : se lève {from}, culmine à {deg}°, se couche {to}",
    "cardinals": {
      "N": "N",
      "E": "E",
      "S": "S",
      "W": "O"
    },
    "best": {
      "title": "Le meilleur de ce soir",
      "nothing": "Rien ne se détache ce soir.",
      "rowTitle": "L’afficher sur le ciel",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "mag {mag}",
      "passAria": "{name} : apparaît à {t0} {d0}, culmine à {t1} à {deg}° {d1}, disparaît à {t2} {d2}, magnitude {mag}.",
      "fades": "Il s’efface dans l’ombre de la Terre avant de se coucher.",
      "appears": "Il sort de l’ombre de la Terre à mi-hauteur.",
      "notVisible": "Invisible : le ciel est clair ou il est dans l’ombre.",
      "rocket": "Étage de fusée · {name}",
      "debris": "Débris · {name}",
      "planetLine": "pic {time} · {deg}° de haut, {dir}",
      "moonTitle": "{phase} · {pct} %",
      "moonSets": "se couche à {time}",
      "moonRises": "se lève à {time}",
      "moonAllNight": "dans le ciel toute la nuit",
      "phases": {
        "new": "Nouvelle Lune",
        "waxingCrescent": "Premier croissant",
        "firstQuarter": "Premier quartier",
        "waxingGibbous": "Lune gibbeuse croissante",
        "full": "Pleine Lune",
        "waningGibbous": "Lune gibbeuse décroissante",
        "lastQuarter": "Dernier quartier",
        "waningCrescent": "Dernier croissant"
      },
      "showerLine": "jusqu’à {zhr}/h · pic {time}, {dir}",
      "dsoLine": "pic {time} · {deg}° de haut, {dir} · {how}",
      "dsoNeeds": {
        "eye": "à l’œil nu",
        "binoculars": "jumelles"
      },
      "view": "Ma vue",
      "viewHeight": "Hauteur minimale",
      "facings": {
        "any": "Tout autour",
        "n": "Nord",
        "e": "Est",
        "s": "Sud",
        "w": "Ouest"
      },
      "facingTitles": {
        "any": "Tout le ciel",
        "n": "Seulement ce qui se voit le mieux au nord",
        "e": "Seulement ce qui se voit le mieux à l’est",
        "s": "Seulement ce qui se voit le mieux au sud",
        "w": "Seulement ce qui se voit le mieux à l’ouest"
      },
      "heights": {
        "0": "Toute hauteur",
        "15": "Au-dessus de 15°",
        "30": "Au-dessus de 30°"
      },
      "viewNothing": "Rien ne passe dans cette partie du ciel ce soir.",
      "darkHours": "Nuit {from}–{to}",
      "moonless": "pas de Lune, une nuit noire",
      "moonBright": "Lune {pct} %, étoiles faibles noyées",
      "moonFaint": "Lune {pct} %, peu de lumière",
      "neverDark": "Il ne fait pas nuit noire ce soir.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "Calculé pour ton lieu. L’éclat est une estimation."
    },
    "skybar": {
      "title": "Le ciel",
      "field": "Champ de vision",
      "fields": {
        "eye": "Œil",
        "binoculars": "Jumelles",
        "telescope": "Télescope"
      },
      "fieldNotes": {
        "eye": "Aussi large que ce que tu vois. Utilise la molette ou pince pour zoomer.",
        "binoculars": "Un champ de 7° : des étoiles plus faibles apparaissent.",
        "telescope": "Un champ de 1° : les planètes deviennent des disques."
      },
      "following": "Suit {name}. Glisse pour lâcher.",
      "followSet": "{name} s’est couché ; vue libérée.",
      "show": "Lignes et noms",
      "toggles": {
        "figures": "Figures",
        "names": "Noms",
        "art": "Dessins",
        "bounds": "Frontières",
        "sunPath": "Route du Soleil",
        "equator": "Équateur",
        "grid": "Grille",
        "starGrid": "Grille d’étoiles",
        "meteors": "Météores",
        "trails": "Traînées",
        "seeThrough": "Sol transparent"
      },
      "toggleTitles": {
        "seeThrough": "Terre transparente, pour voir sous l’horizon",
        "figures": "Les figures des constellations",
        "names": "Noms des constellations et des étoiles brillantes",
        "sunPath": "La route que suivent le Soleil, la Lune et les planètes",
        "equator": "L’équateur du ciel, au-dessus de celui de la Terre",
        "grid": "Hauteur et direction, avec la ligne nord-sud",
        "starGrid": "La grille sur laquelle les étoiles sont cartographiées",
        "art": "Les figures occidentales en dessins, de Johan Meuris",
        "bounds": "Les frontières officielles des 88 constellations",
        "meteors": "Traînées des pluies actives ce soir, à leur rythme",
        "trails": "La dernière heure de chaque étoile brillante, en longue pose"
      },
      "time": "Heure dans le ciel",
      "timeNow": "Maintenant",
      "timeNowTitle": "Retour au présent",
      "timeDusk": "Soir",
      "timeMidnight": "Minuit",
      "timeDawn": "Aube",
      "timeTitles": {
        "dusk": "La fin du crépuscule civil ce soir",
        "midnight": "Le milieu de la nuit",
        "dawn": "Le début du crépuscule civil au matin"
      },
      "timeStrip": "Fais glisser pour tourner le ciel",
      "timeTicks": {
        "dusk": "Soir",
        "midnight": "Minuit",
        "dawn": "Aube"
      },
      "timeStripAria": "L’heure du ciel : fais glisser, ou utilise les flèches, dix minutes par pas",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "jour",
        "golden": "Soleil bas",
        "civil": "crépuscule civil",
        "nautical": "crépuscule nautique",
        "astronomical": "dernier crépuscule",
        "night": "nuit"
      },
      "timeFar": "Pas de satellites si loin d’aujourd’hui : orbites périmées.",
      "eyepiece": "Oculaire",
      "eyepieces": {
        "low": "Faible · 1°",
        "medium": "Moyen · 30′",
        "high": "Fort · 12′"
      },
      "eyepieceTitles": {
        "low": "Un champ d’un degré : la largeur de deux pleines Lunes",
        "medium": "Un demi-degré : toute la Lune",
        "high": "Un cinquième de degré : des planètes en disques"
      },
      "centre": "Ce qui est au centre",
      "centreTitle": "Nommer ce que vise le milieu de la vue ; Entrée ouvre sa fiche",
      "con": {
        "kind": "constellation",
        "label": "{name}, une constellation.",
        "inside": "dans {name}"
      },
      "landscape": {
        "city": "Horizon : celui d’une ville, dessiné. Pas ta rue.",
        "hills": "Horizon : des collines, dessinées. Pas les tiennes.",
        "coast": "Mer {dir}, d’après la carte de l’eau. Terre dessinée."
      },
      "artWesternOnly": "Les dessins appartiennent aux figures occidentales",
      "culture": "Quel ciel",
      "cultures": {
        "western": "Occidental",
        "chinese": "Chinois",
        "maori": "Māori",
        "hawaiian": "Hawaïen",
        "samoan": "Samoan",
        "tongan": "Tongien",
        "norse": "Nordique",
        "boorong": "Boorong"
      },
      "cultureNotes": {
        "western": "Les 88 constellations adoptées par les astronomes en 1922.",
        "chinese": "Environ 300 petits astérismes. Une lecture d’un ciel vivant.",
        "maori": "Six figures. Les noms varient selon les iwi ; ciel vivant.",
        "hawaiian": "Lignes d’étoiles de navigateur, encore utilisées pour se guider.",
        "samoan": "Quatorze figures de la tradition samoane, toujours vivante.",
        "tongan": "Routes d’étoiles et figures des Tonga, tradition vivante.",
        "norse": "Six figures, une reconstitution du ciel nordique.",
        "boorong": "Le ciel d’une famille boorong, raconté en 1857. Vivant."
      },
      "cultureCredits": {
        "western": "Dessins : Johan Meuris, pour Stellarium, Free Art License. La Carène, la Poupe et les Voiles partagent un seul dessin ; le Serpent n’en a pas.",
        "chinese": "Figures : Sun Shuwei et Karrie Berglund, pour Stellarium, CC BY-SA 4.0. Une reconstitution documentée.",
        "maori": "Figures : Dan Smale, pour Stellarium, CC BY-SA 4.0. Une reconstitution documentée.",
        "hawaiian": "Figures : d’après Nainoa Thompson, par les Kamehameha Schools Kapālama, pour Stellarium, CC BY-SA 4.0.",
        "samoan": "Figures : Jake Fitisemanu avec des gardiens de la tradition samoane, pour Stellarium, CC BY-SA 4.0. Une reconstitution documentée.",
        "tongan": "Figures : Dan Smale, pour Stellarium, CC BY-SA 4.0. Une reconstitution documentée à partir de sources limitées.",
        "norse": "Figures : Jonas Persson, pour Stellarium, CC BY-SA 4.0. Une reconstitution, pas un témoignage.",
        "boorong": "Figures : John Morieson et Alex Cherney, pour Stellarium, CC BY-SA 4.0. Une lecture d’un ciel vivant."
      },
      "meteorNote": "{name} : environ {n} par heure ici.",
      "meteorFew": "{name} : moins d’une par heure ici.",
      "meteorDown": "{name} : radiant sous l’horizon, pas de traînées.",
      "meteorHonest": "Rythme de ce soir modélisé ; traînées illustratives.",
      "meteorSporadic": "Pas de pluie d’étoiles filantes ce soir. Source antihéliaque : {n} par heure.",
      "darkness": "Ton ciel",
      "darknessModes": {
        "city": "Ville",
        "town": "Bourg",
        "dark": "Lieu sombre"
      },
      "darknessAuto": "Auto",
      "darknessAutoTitle": "Lire le genre de ciel d’après les lumières nocturnes de ton lieu",
      "darknessBy": {
        "place": "Estimé d’après la carte NASA des lumières de nuit ici.",
        "reading": "Lecture des lumières nocturnes de ton lieu.",
        "unread": "Carte des lumières de nuit illisible : choisis ton ciel.",
        "trip": "Fixé par cette étape du voyage."
      },
      "darknessNotes": {
        "city": "Ville : étoiles jusqu’à la magnitude 4, pas de Voie lactée.",
        "town": "Périphérie d’un bourg : étoiles jusqu’à la magnitude 5,3.",
        "dark": "Lieu sombre : étoiles jusqu’à 6,5 et la Voie lactée."
      },
      "point": {
        "row": "Pointer ton téléphone",
        "on": "Pointer ton téléphone",
        "title": "Lève le téléphone : la vue tourne avec lui",
        "note": "Lève le téléphone vers le ciel et tourne. La vue suit.",
        "noPlace": "Il faut ton lieu, pour savoir où est le nord.",
        "denied": "Capteur de mouvement refusé. Glisser marche toujours.",
        "deniedHow": "Pour l’autoriser : recharge, puis choisis Autoriser.",
        "none": "Aucun capteur de mouvement ici. Glisser marche toujours.",
        "unsupported": "Ce navigateur n’a pas de capteur. Glisser marche toujours.",
        "lineUpWith": "Ciel décalé ? Glisse pour aligner {name}.",
        "lineUpPlain": "Ciel décalé ? Glisse jusqu’à aligner une étoile brillante.",
        "lined": "Aligné à la main, à {n}° de la boussole.",
        "reset": "Annuler l’alignement",
        "resetTitle": "Revenir au nord propre de la boussole",
        "accuracy": "La boussole dit être juste à environ {n}° près.",
        "relative": "Pas de boussole ici. Fais glisser le ciel pour l’aligner.",
        "declination": "Nord vrai : boussole corrigée de {n}° vers l’{dir}.",
        "east": "est",
        "west": "ouest",
        "honest": "Le nord vient de la boussole ; le métal la fausse."
      },
      "red": "Lumière rouge",
      "redTitle": "Passer la page en rouge pour garder tes yeux habitués à l’obscurité",
      "honesty": "Étoiles mesurées, planètes calculées, air modélisé, sol dessiné."
    }
  },
  "keyHint": {
    "title": "Commandes",
    "titleTouch": "Gestes",
    "label": "Touches qui déplacent la vue",
    "labelTouch": "Gestes qui déplacent la vue",
    "close": "Fermer",
    "closeTitle": "Fermer (Échap)",
    "does": {
      "turn": "Tourner",
      "zoom": "Plus près, plus loin",
      "pan": "Déplacer sur le côté",
      "pick": "Choisir un objet",
      "search": "Chercher",
      "hide": "Tout masquer",
      "show": "Quoi afficher",
      "share": "Partager",
      "esc": "Fermer",
      "keys": "Toutes les touches",
      "tripPlay": "Lecture, pause",
      "tripStep": "Précédent, suivant",
      "tripCard": "Masquer la fiche",
      "tripReplay": "Rejouer",
      "tripSound": "Son",
      "tripLeave": "Quitter"
    },
    "how": {
      "drag": "Glisser",
      "wheel": "Molette",
      "pinch": "Pincer",
      "two": "Deux doigts",
      "tap": "Toucher"
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
      "pgUp": "PgUp",
      "pgDn": "PgDn",
      "h": "H",
      "l": "L",
      "p": "P",
      "esc": "Échap",
      "help": "?",
      "space": "Espace",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "Raccourcis clavier",
    "tripTitle": "Dans un voyage"
  },
  "render": {
    "eyebrow": "Space Radar · un voyage",
    "site": "spaceradar.ai",
    "fly": "À toi de piloter",
    "music": "Musique : John Bartmann, CC0. Crédits complets sur spaceradar.ai."
  },
  "glossary": {
    "title": "Mots de cette page",
    "hint": "Touche un terme pour une phrase simple."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} est un incendie qui se trouvait ici lors de son dernier signalement, le {date}",
        "volcano": "{name} est en éruption depuis le {date}",
        "iceberg": "{name} se trouvait ici lors de son dernier signalement, le {date}"
      },
      "size": "environ {n} km² lors de ce signalement"
    },
    "storm": {
      "lead": "{name} est {a} {status} dont le centre se trouvait ici {ago}",
      "leadUnknown": "{name} est un cyclone tropical dont le centre se trouvait ici {ago}",
      "leadBefore": "{name} est {a} {status} dont le centre arrive ici {ago}",
      "leadBeforeUnknown": "{name} est un cyclone tropical dont le centre arrive ici {ago}",
      "wind": "les vents les plus forts sur sa trajectoire, prévisions comprises, atteignent {n} km/h",
      "statuses": {
        "hurricane": "ouragan",
        "typhoon": "typhon",
        "cyclone": "cyclone tropical",
        "storm": "tempête tropicale",
        "depression": "dépression tropicale"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} est un trou noir à {dist} années-lumière",
      "leadPulsar": "{name} est un pulsar à {dist} années-lumière",
      "leadMagnetar": "{name} est un magnétar à {dist} années-lumière",
      "leadQuasar": "{name} est un quasar à {dist} années-lumière",
      "leadStar": "{name} est une étoile à {dist} années-lumière",
      "leadRange": "{name} est {a} {kind} à une distance comprise entre {lo} et {hi} années-lumière",
      "mass": "d’une masse égale à {n} fois celle du Soleil",
      "massRange": "d’une masse comprise entre {lo} et {hi} fois celle du Soleil",
      "massMillions": "d’une masse égale à {n} millions de fois celle du Soleil",
      "massBillions": "d’une masse égale à {n} milliards de fois celle du Soleil",
      "spins": "tournant {n} fois par seconde",
      "spinsSlow": "tournant une fois toutes les {n} secondes",
      "kinds": {
        "blackhole": "trou noir",
        "pulsar": "pulsar",
        "magnetar": "magnétar",
        "star": "étoile",
        "quasar": "quasar"
      }
    },
    "dso": {
      "leadHome": "{name} est la galaxie où nous vivons ; son centre est à {dist} années-lumière",
      "lead": "{name} est {a} {type} à {dist} années-lumière",
      "leadRange": "{name} est {a} {type} à une distance comprise entre {lo} et {hi} années-lumière",
      "leadUntyped": "{name} est à {dist} années-lumière",
      "size": "environ {n} années-lumière de large",
      "seenAs": "vu tel qu’il était il y a {n} ans",
      "seenAsMillions": "vu tel qu’il était il y a {n} millions d’années",
      "constellation": "dans la constellation {con}",
      "kinds": {
        "galaxy": "galaxie",
        "nebula": "nébuleuse",
        "cluster": "amas d’étoiles",
        "other": "objet du ciel profond"
      }
    },
    "exoplanet": {
      "lead": "{name} est une planète qui tourne autour de l’étoile {host}, à {dist} années-lumière",
      "leadNoHost": "{name} est une planète qui tourne autour d’une autre étoile, à {dist} années-lumière",
      "size": "environ {n} fois plus large que la Terre",
      "sizeSmaller": "environ {n} de la largeur de la Terre",
      "mass": "{n} fois la masse de la Terre",
      "year": "son année dure {n} jours",
      "yearHours": "son année dure {n} heures",
      "found": "découverte en {year} par la méthode {method}",
      "foundYear": "découverte en {year}",
      "asOf": "d’après une copie du catalogue à la date du {date}"
    },
    "star": {
      "lead": "{name} est une étoile à {dist} années-lumière",
      "leadColour": "{name} est {a} étoile {colour} à {dist} années-lumière",
      "near": "l’une des plus proches qui existent",
      "seenAs": "vue telle qu’elle était il y a {n} ans",
      "seenAsMonths": "vue telle qu’elle était il y a {n} mois",
      "luminosity": "brillant {n} fois plus que le Soleil",
      "dimmer": "brillant à {n} de l’éclat du Soleil",
      "colours": {
        "O": "bleue",
        "B": "blanc bleuté",
        "A": "blanche",
        "F": "blanc jaunâtre",
        "G": "jaune",
        "K": "orange",
        "M": "rouge"
      }
    },
    "station": {
      "lead": "{name} est une station spatiale habitée qui tourne autour de la Terre",
      "whyPass": "traversant ton ciel à {time}",
      "crew": "avec {crew} personnes à bord",
      "altitude": "à {alt} km d’altitude",
      "speed": "faisant un tour toutes les {period} minutes"
    },
    "satellite": {
      "lead": "{name} est un satellite qui tourne autour de la Terre",
      "leadKind": "{name} est {kind} qui tourne autour de la Terre",
      "leadDocked": "{name} est {kind} amarré à la station {station}",
      "aSpacecraft": "un engin spatial",
      "aTelescope": "un télescope spatial",
      "whyLaunchedDays": "lancé il y a {n} jours",
      "whyLaunchedYear": "lancé en {year}",
      "operator": "exploité par {operator}",
      "purpose": "{purpose}",
      "altitude": "à {alt} km d’altitude",
      "whyPass": "traversant ton ciel à {time}"
    },
    "debris": {
      "lead": "{name} est un morceau de débris suivi",
      "origin": "provenance : {origin}",
      "brokeUp": "dont la fragmentation date de {year}",
      "decay": "retombée attendue dans l’atmosphère : {date} environ",
      "altitude": "à {alt} km d’altitude",
      "burnsUp": "presque tout brûle pendant la descente"
    },
    "rocket": {
      "lead": "{name} est un lancement de fusée",
      "leadWithPad": "{name} est un lancement de fusée depuis {pad}",
      "leadStage": "{name} est un étage de fusée usagé qui tourne autour de la Terre",
      "stageLaunched": "lancé en {year}",
      "whyCountdown": "décollage {when}",
      "whyFlown": "qui a décollé {when}",
      "destination": "en route vers {destination}",
      "missionType": "mission : {missionType}",
      "illustrative": "la trajectoire dessinée ici est un croquis de la montée, pas un tracé mesuré"
    },
    "probe": {
      "lead": "{name} est un engin spatial dans le système solaire",
      "leadOrbits": "{name} est un engin spatial qui tourne autour de {world}",
      "destination": "en route vers {destination}",
      "lightTime": "assez loin pour qu’un message radio mette {mins} minutes dans chaque sens",
      "lightTimeSeconds": "assez près pour qu’un message radio ne mette que {secs} secondes dans chaque sens",
      "lightTimeHours": "assez loin pour qu’un message radio mette {hours} heures dans chaque sens",
      "distanceSun": "à {au} unités astronomiques du Soleil",
      "milestone": "prochaine étape : {milestone}, prévue le {date}"
    },
    "telescope": {
      "lead": "{name} est un télescope spatial",
      "observing": "pointé cette semaine vers {target}",
      "station": "placé à {station}",
      "altitude": "à {alt} km d’altitude",
      "sees": "il observe en {band}"
    },
    "asteroid": {
      "lead": "{name} est un objet proche de la Terre, sur sa propre orbite autour du Soleil",
      "leadMainBelt": "{name} est un astéroïde de la ceinture principale, entre Mars et Jupiter",
      "leadBeyond": "{name} est un petit corps au-delà de Neptune, sur sa propre orbite autour du Soleil", // 0079 B1
      "leadDwarf": "{name} est une planète naine sur sa propre orbite autour du Soleil",
      "leadDwarfBelt": "{name} est une planète naine de la ceinture d’astéroïdes, entre Mars et Jupiter",
      "leadDwarfBeyond": "{name} est une planète naine au-delà de Neptune",
      "leadDwarfFarBeyond": "{name} est une planète naine bien au-delà de Neptune",
      "leadInterstellarOut": "{name} vient d’une autre étoile et s’éloigne du système solaire",
      "leadInterstellarIn": "{name} vient d’une autre étoile et tombe vers le Soleil",
      "distanceSun": "à {au} unités astronomiques du Soleil",
      "whyApproach": "passe près de la Terre le {date}, à {ld} fois la distance de la Lune",
      "size": "{size}",
      "willNotHit": "il ne heurtera pas la Terre"
    },
    "comet": {
      "lead": "{name} est une comète sur une longue boucle autour du Soleil",
      "leadPeriodic": "{name} est une comète qui revient autour du Soleil tous les {n} ans",
      "leadInterstellarOut": "{name} est une comète venue d’une autre étoile, qui s’éloigne du système solaire",
      "leadInterstellarIn": "{name} est une comète venue d’une autre étoile, qui tombe vers le Soleil",
      "whyPerihelion": "au plus près du Soleil le {date}",
      "nakedEye": "assez brillante pour être trouvée sans télescope",
      "faint": "trop faible pour être vue sans télescope",
      "distanceSun": "à {au} unités astronomiques du Soleil"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} est l’une des choses étranges que des gens ont envoyées hors de la planète"
    },
    "site": {
      "lead": "{name} est un lieu au sol qui travaille avec des engins spatiaux",
      "leadKind": "{name} est {a} {kind}",
      "where": "emplacement : {where}",
      "whyDsn": "en communication avec {spacecraft} en ce moment",
      "whyLaunch": "prochain lancement : {launch}, {when}",
      "kinds": {
        "pad": "pas de tir",
        "dish": "antenne radio",
        "observatory": "observatoire",
        "tracking": "station de suivi"
      }
    },
    "world": {
      "lead": "{name} est un monde du système solaire",
      "leadMoon": "{name} est la lune de la Terre",
      "leadSun": "{name} est l’étoile au centre du système solaire",
      "distanceKm": "à {n} km",
      "whyPhase": "{phase} ce soir",
      "whyRise": "se lève chez toi à {time}",
      "distance": "{distance}",
      "diameter": "d’un diamètre d’environ {n} km",
      "leadWhat": "{name} est {what}",
      "what": {
        "pluto": "une planète naine au-delà de Neptune, comptée comme la neuvième planète jusqu’en 2006",
        "io": "l’une des quatre grandes lunes de Jupiter, et le monde le plus volcanique du système solaire",
        "europa": "l’une des quatre grandes lunes de Jupiter, avec un océan d’eau salée sous sa glace",
        "ganymede": "la plus grande lune de Jupiter et la plus grande du système solaire, plus grosse que Mercure",
        "callisto": "l’une des quatre grandes lunes de Jupiter, et l’objet le plus criblé de cratères du système solaire",
        "titan": "la plus grande lune de Saturne, sous une épaisse brume orange, avec des lacs de méthane ; Huygens s’y est posé en 2005",
        "enceladus": "une petite lune glacée de Saturne dont les geysers projettent dans l’espace l’océan caché sous sa glace",
        "triton": "la plus grande lune de Neptune ; elle tourne à l’envers et est probablement un objet de la ceinture de Kuiper capturé",
        "charon": "la plus grande lune de Pluton, moitié moins grosse que Pluton ; les deux se montrent toujours les mêmes faces",
        "phobos": "la plus grosse des deux lunes de Mars, un rocher bosselé qui s’enfonce en spirale vers Mars de 1,8 m par siècle",
        "deimos": "la plus petite des deux lunes de Mars, un petit rocher bosselé couvert de cratères",
        "mimas": "la plus intérieure des lunes rondes de Saturne, marquée d’un cratère large d’un tiers de la lune elle-même",
        "tethys": "la cinquième plus grande lune de Saturne, presque de la pure glace d’eau, fendue par un gouffre et un énorme cratère",
        "dione": "une lune glacée de Saturne dont la face arrière est zébrée d’un réseau de falaises de glace brillantes",
        "rhea": "la deuxième plus grande lune de Saturne, une boule de neige sale gelée faite de glace et de roche",
        "iapetus": "la troisième plus grande lune de Saturne : une face noire comme du charbon, l’autre dix fois plus brillante",
        "miranda": "la plus petite des cinq grandes lunes d’Uranus, avec des canyons jusqu’à 12 fois la profondeur du Grand Canyon",
        "ariel": "la plus brillante et la plus jeune d’aspect des cinq grandes lunes d’Uranus, entaillée de vallées de failles",
        "umbriel": "la plus sombre des grandes lunes d’Uranus, qui réfléchit environ un cinquième de la lumière qu’elle reçoit",
        "titania": "la plus grande lune d’Uranus, d’un gris neutre, fendue par des vallées de failles longues de près de 1 600 km",
        "oberon": "la deuxième plus grande lune d’Uranus, sombre, cratérisée, et portant une montagne de 6 km de haut"
      }
    }
  },
  "live": {
    "label": "Depuis la Terre, maintenant",
    "km": "km",
    "light": "La lumière met",
    "lightYears": "années-lumière",
    "noteFar": "Calculé d’après la position dessinée, à trois chiffres. Cela ne défile pas.",
    "note": "Calculé d’après l’orbite dessinée. Les derniers chiffres montrent le mouvement, pas sa place au kilomètre près.",
    "seconds": "{s} s",
    "minSec": "{min} min {s} s",
    "hourMinSec": "{h} h {min} min {s} s",
    "sparkLabel": "Distance à la Terre",
    "sparkAria": "Distance à la Terre de {from} à {to}. {closest}",
    "sparkNow": "maintenant",
    "closest": "Au plus près : {date} · {dist}",
    "closestAbout": "Au plus près : vers {date} · {dist}",
    "months": [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc."
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "Mettre l’horloge sur ce moment de plus grande proximité",
    "moonDistances": "{n} distances Terre-Lune",
    "au": "{n} UA",
    "sparkNote": "Calculé d’après l’orbite dessinée, un point tous les six jours.",
    "sparkApprox": "À cette distance, la date et la distance sont approximatives : l’attraction de la Terre est ignorée.",
    "upYears": "Là-haut depuis {n} ans : lancé le {date}",
    "upOneYear": "Là-haut depuis 1 an : lancé le {date}",
    "upUnderAYear": "Là-haut depuis moins d’un an : lancé le {date}",
    "upSinceYear": "Lancé en {year} : environ {n} ans là-haut",
    "upSinceYearNew": "Lancé en {year}",
    "smallBodyHonest": "Calculé d’après son orbite pour un horizon au niveau de la mer. Être au-dessus de l’horizon ne veut pas dire être assez brillant pour se voir : la plupart demandent un télescope."
  },
  "crew": {
    "label": "Personnes à bord",
    "count": "{n} personnes à bord",
    "countOne": "1 personne à bord",
    "hint": "{n} à bord",
    "person": "{agency} · {days} jours là-haut",
    "personNoAgency": "{days} jours là-haut",
    "dockedLabel": "Amarré en ce moment, et depuis quand",
    "docked": "{port} · {date}",
    "asOf": "Lu {age} sur Launch Library 2 (The Space Devs).",
    "stale": "Lu le {date} : plus de deux jours, donc cela a pu changer.",
    "joined": "Les noms sont ceux des équipages des vaisseaux amarrés en ce moment.",
    "unmatched": "Les noms en mémoire ne correspondaient pas à ce nombre, donc aucun n’est montré.",
    "waiting": "Lecture de la liste d’équipage.",
    "none": "Pas de liste d’équipage pour cette station."
  },
  "happened7": {
    "launchesFrom": "depuis {place}",
    "reached": "a atteint l’orbite",
    "failed": "n’a pas atteint l’orbite",
    "partial": "a atteint l’orbite, mais pas celle prévue",
    "launchDetail": "{rocket} : {status}, {from}",
    "launchDetailNoPlace": "{rocket} : {status}",
    "cameDown": "Retombé le {date} (date de chute du catalogue)",
    "debris": "et {n} morceaux de débris",
    "debrisOne": "et 1 morceau de débris",
    "showAll": "Voir les {n}",
    "showFewer": "Voir moins",
    "asOf": "Lancements lus {age} sur Launch Library 2.",
    "stale": "Lancements lus le {date} : plus de deux jours.",
    "none": "Rien en mémoire pour les sept derniers jours.",
    "waiting": "Lecture de ce qui s’est passé.",
    "decays": "Ce qui est retombé",
    "decaysTitle": "Lit tout le catalogue, environ 1,5 Mo",
    "decaysNone": "Rien d’entier n’est retombé ces sept derniers jours.",
    "decaysFailed": "Le catalogue n’a pas pu être lu.",
    "flyTitle": "Aller à l’endroit d’où il a été lancé",
    "ago": "{age}"
  },
  "oldest": {
    "label": "Là-haut depuis le plus longtemps",
    "row": "{years} ans · lancé le {date}",
    "note": "Charges utiles et corps de fusée encore en orbite, par date de lancement dans le catalogue.",
    "showTitle": "L’afficher sur la carte"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "Ouvre, dans un nouvel onglet, la page de l’éditeur : {publisher}"
  },
  "placeKeep": {
    "group": "Où tu es",
    "change": "Changer de lieu",
    "changeTitle": "Une ville, ou l’endroit où le navigateur dit que tu es",
    "remember": "Retenir ce lieu",
    "rememberTitle": "Le garde dans ce navigateur seulement, à 0,1° près",
    "forget": "Oublier ce lieu",
    "forgetTitle": "Supprime le lieu gardé dans ce navigateur",
    "kept": "Gardé dans ce navigateur seulement.",
    "share": "Partager ce lieu",
    "shareTitle": "Copie un lien qui porte ce lieu à 0,1° près",
    "copied": "Lien copié. Il porte ce lieu à 0,1° près.",
    "copyFailed": "Le lien n’a pas pu être copié."
  },
  "scale": {
    "least": "Planètes : taille dessinée au moins ×{n}",
    "one": "{name} : taille dessinée ×{n}",
    "title": "Les points sont plus larges que les planètes. Appuie pour la vraie taille.",
    "trueLine": "Vraie taille : {name}, {px} px de large",
    "trueTitle": "La plus large planète, sans les points. Appuie pour les redessiner."
  },
  "launchChip": {
    "opens": "appuie pour sa fiche",
    "train": "Nouveau train Starlink de {n}, il te survole {when}"
  },
  "welcome": {
    "label": "Première visite",
    "title": "Première fois ici",
    "dots": "Chaque point est réel. Appuie sur l’un.",
    "move": "Glisse pour tourner. Utilise la molette pour zoomer.",
    "moveTouch": "Glisse pour tourner. Pince pour zoomer.",
    "trips": "Un voyage guidé : une courte histoire.",
    "trip": "Voyage guidé",
    "tripTitle": "Lance le premier voyage de la liste",
    "look": "Regarder autour",
    "lookTitle": "Range ces lignes"
  },
  "opening": {
    "label": "Ouverture",
    "from": "Depuis {source}",
    "wait": "Préparation du voyage",
    "skip": "Appuie sur une touche pour passer"
  },
  "base": {
    "label": "Retour à la base",
    "title": "Retour à la base : la Terre, maintenant, rien de sélectionné",
    "name": "base",
    "trip": "Quitter le voyage et retourner à la base"
  },
  "exoface": {
    "tag": "Vue d’artiste",
    "measured": "Mesuré : {parts}.",
    "estimated": "Estimé : {parts}.",
    "least": "Au moins {n} masses terrestres.",
    "radius": "{n} rayons terrestres",
    "mass": "{n} masses terrestres",
    "a": "une",
    "an": "une",
    "yearHours": "{a} année de {n} heures",
    "yearDays": "{a} année de {n} jours",
    "yearYears": "un tour de {n} ans",
    "join": ", ",
    "missing": "—",
    "surface": "La surface est imaginée.",
    "clouds": "Le sommet des nuages est imaginé.",
    "nothingMeasured": "Rien ici n’est mesuré.",
    "whole": "Le monde entier est imaginé.",
    "imaginedName": "Un monde imaginé n° {n}",
    "another": "Un autre monde",
    "back": "Retour à la carte",
    "stageLabel": "Un monde imaginé",
    "why": "Dessiné comme {cls}, {climate} : calculé, pas vu.",
    "whyGiant": "Dessiné comme {cls} : calculé d’après sa taille, pas vu.",
    "cls": {
      "rock": "un monde rocheux",
      "superEarth": "une super-Terre",
      "water": "un monde d’eau",
      "miniNeptune": "une mini-Neptune",
      "iceGiant": "un géant de glace",
      "gasGiant": "un géant gazeux"
    },
    "climate": {
      "lava": "en fusion sous son étoile",
      "desert": "avec un climat chaud et sec",
      "temperate": "avec un climat assez doux pour des mers",
      "snowball": "sous une croûte de glace",
      "eyeball": "avec une seule face tournée vers son étoile"
    }
  },
  "deep": {
    "inside": "À l’intérieur : {parent}",
    "companion": "Compagnon : {parent}",
    "kinds": {
      "HII": "nébuleuse en émission",
      "PN": "nébuleuse planétaire",
      "SNR": "rémanent de supernova",
      "RfN": "nébuleuse par réflexion",
      "DrkN": "nébuleuse sombre",
      "GCl": "amas globulaire"
    },
    "back": "Retour : {parent}",
    "backTitle": "S’éloigner pour voir {parent} tout autour"
  },
  "deepHelix": {
    "card": {
      "helix": "Sa lumière vient de la photographie de l’ESO, sa forme d’O’Dell, McCullough et Meixner (2004) : un disque intérieur incliné de 23° et un anneau extérieur incliné de 53°. Les nœuds sont placés à leurs distances mesurées. Pas encore relu par un astronome."
    },
    "how": "Hubble et des télescopes au sol montrent deux ellipses, de 499″ sur 459″ et de 742″ sur 446″. Lues comme des cercles vus de biais, ce sont deux anneaux inclinés de 23° et 53°, et les vitesses des nœuds qui s’approchent et s’éloignent de nous disent quel côté de chacun est le plus proche (O’Dell, McCullough et Meixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "Ce modèle est construit à partir de sa photographie et des comptages de Gaia de ses propres étoiles, incliné comme mesuré."
    },
    "rows": {
      "dso-lmc": [
        [
          "Profondeur de ses étoiles",
          "Non mesurée étoile par étoile : à cette distance, la parallaxe d’une étoile est trop petite. Le modèle répartit ses étoiles dans l’épaisseur connue du disque."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "Profondeur dans le Grand Nuage de Magellan",
          "Non mesurée : elle est dessinée à la distance du Grand Nuage de Magellan, dans sa propre direction. Sur le disque incliné, elle peut se trouver environ 2 000 années-lumière plus près."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "Le bord de l’univers observable",
    "horizonNow": "À environ {n} milliards d’années-lumière maintenant",
    "horizonWhy": "Sa lumière est partie il y a {age} milliards d’années ; l’espace s’est étiré depuis",
    "edge": "{n} milliards d’années-lumière : au-delà de tout ce que nous pouvons voir",
    "edgeWhy": "L’univers observable s’arrête à environ {h} milliards d’années-lumière.",
    "edgeNothing": "Rien de mesuré ne se trouve ici : cette bande est une illustration.",
    "cmbTitle": "La plus vieille lumière, telle que notre ciel la montre",
    "cmbWhen": "Elle est partie environ {k} ans après le Big Bang",
    "cmbPainted": "Peinte à l’intérieur de la sphère d’où elle est partie : une illustration",
    "cmbElse": "Vue de n’importe où ailleurs, la carte serait différente",
    "cmbCold": "−{n} µK",
    "cmbMid": "moyenne {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "Échelle de couleurs : bleu jusqu’à {n} millionièmes de degré de moins que {t} kelvins, orange jusqu’à {n} de plus",
    "cmbSource": "Carte WMAP sur neuf ans, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "Sa lumière vient de la photographie de l’ESO, sa forme est reconstituée d’après Wen et O’Dell (1995) et O’Dell (2001) : une fine couche lumineuse sur la face proche d’un nuage sombre, le Trapèze environ 0,2 parsec devant elle. Pas encore relu par un astronome."
    },
    "rows": {
      "dso-m42": [
        [
          "Sa forme en profondeur",
          "Reconstituée. Près du Trapèze, elle est mesurée : la couche lumineuse se trouve à environ 0,2 parsec derrière son étoile la plus brillante. Plus loin, la profondeur suit l’image publiée d’une cuvette qui s’ouvre vers nous, pas une mesure."
        ],
        [
          "Derrière elle",
          "Le nuage moléculaire sombre dans lequel la nébuleuse est creusée. Vue de derrière, la nébuleuse y est cachée."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-m43": [
        [
          "Sa forme en profondeur",
          "Reconstituée : un creux plus petit sur le même nuage, éclairé par l’étoile NU Orionis. Sa profondeur n’est pas mesurée."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ]
    },
    "how": "La lueur de la nébuleuse vient d’une fine couche où la lumière de l’étoile la plus brillante du Trapèze ronge un nuage sombre. Wen et O’Dell (1995) ont cartographié à quelle distance derrière l’étoile se trouve cette couche d’après son éclat, car une zone plus proche d’elle reçoit plus de lumière."
  },
  "r12Truth": {
    "here": "Sur cette fiche",
    "words": "Les mots, partout",
    "terms": "Mots de cette fiche",
    "rows": {
      "where": "Où il est",
      "drawnNow": "Dessiné maintenant",
      "drawn": "Ce qui est dessiné",
      "photo": "Photographie de",
      "filters": "Filtres",
      "colours": "Couleurs",
      "taken": "Prise",
      "released": "Publiée",
      "sky": "Ciel montré",
      "survey": "Relevé par",
      "look": "Aspect"
    },
    "span": "{a} à {b}",
    "notPublished": "Date non publiée",
    "position": {
      "measured": "Vu par un instrument à un moment connu",
      "inferred": "Prolongé à partir d’une mesure plus ancienne",
      "illustrative": "Dessiné pour montrer l’idée, pas mesuré",
      "sample": "Données d’échantillon intégrées, pas en direct"
    },
    "drawn": {
      "photograph": "Vraie lumière, photographiée de notre côté",
      "reconstruction": "Une forme 3D tirée d’une étude publiée",
      "model": "Un modèle de son genre, pas ses propres étoiles",
      "catalogue": "Des positions mesurées par un relevé",
      "illustration": "Dessiné pour montrer son genre, pas lui"
    },
    "colours": {
      "broadband": "Larges filtres de couleur",
      "mixed": "Filtres de couleur et hydrogène",
      "narrowband": "Gaz associés à des couleurs",
      "unstated": "Non précisé"
    },
    "falseColour": "{band}, fausses couleurs",
    "glossary": [
      {
        "term": "parsec",
        "match": [
          "kpc"
        ],
        "say": "Environ 3,26 années-lumière : la distance à laquelle l’orbite de la Terre paraîtrait large d’une seconde d’arc. Les articles écrivent pc, et kpc pour mille."
      },
      {
        "term": "million d’années-lumière",
        "match": [
          "millions d’années"
        ],
        "say": "Un million d’années-lumière, noté Mal. Andromède, la plus proche des grandes galaxies, est à environ 2,5 millions."
      },
      {
        "term": "milliard d’années-lumière",
        "match": [
          "milliards d’années"
        ],
        "say": "Mille millions d’années-lumière, noté Gal. Le bord de ce que nous pouvons voir est aujourd’hui à environ 46 milliards d’années-lumière."
      },
      {
        "term": "temps de parcours de la lumière",
        "match": [
          "lumière l’a quitté"
        ],
        "say": "Il y a combien de temps la lumière que nous voyons a quitté quelque chose. Pour les galaxies lointaines, ce sont des milliards d’années : nous les voyons telles qu’elles étaient alors."
      },
      {
        "term": "distance comobile",
        "match": [
          "comobile",
          "milliards d’années-lumière"
        ],
        "say": "À quelle distance se trouve quelque chose aujourd’hui, en comptant de combien l’espace s’est étiré depuis que sa lumière est partie. Très loin, c’est plus que ne le suggère le temps de trajet de la lumière."
      }
    ],
    "termLine": "{term} : {say}",
    "lookWord": "Aspect {mode}"
  },
  "r12Sun": {
    "image": "La moitié du Soleil tournée vers la Terre est l’image du Solar Dynamics Observatory prise à {time} UTC le {date}, tournée avec le Soleil depuis : de la lumière ultraviolette extrême à {wl} ångström venant d’un gaz proche du million de degrés dans les boucles au-dessus de la surface, dans les fausses couleurs de SDO et dessinée plus brillante. La face cachée, qu’il n’a pas vue, est dessinée d’après un modèle dans les mêmes fausses couleurs, et les deux sont fondues là où elles se rejoignent. C’est une image de consultation, pas une image pour la science. Avec l’aimable autorisation de la NASA/SDO et des équipes scientifiques AIA, EVE et HMI.",
    "loops": "Les boucles dorées au-dessus de {n} des régions actives du jour sont illustratives : leurs emplacements sont ceux de la NOAA, leurs formes, leurs hauteurs et leur nombre ne le sont pas. Avec l’aspect Mesuré, elles sont retirées.",
    "loopsOne": "Les boucles dorées au-dessus d’une des régions actives du jour sont illustratives : l’emplacement est celui de la NOAA, les formes, les hauteurs et le nombre ne le sont pas. Avec l’aspect Mesuré, elles sont retirées.",
    "none": "Aucune image du Soleil du jour n’a pu être lue, donc tout le disque est dessiné."
  },
  "r12Nearby": {
    "castShadows": "Ses ombres sont projetées par les hauteurs mêmes du sol, d’après {title}, là où le Soleil se trouve maintenant et à l’échelle vraie : mesurées, une hauteur tous les 670 m au mieux, donc un cratère de moins de deux kilomètres environ ne projette rien.",
    "sunriseModelled": "Sa couleur au lever et au coucher du Soleil est modélisée : une lumière du Soleil rougie par l’air qu’elle a frôlé, diffusion de Rayleigh seulement."
  },
  "r12Giants": {
    "spot": "Sauf une : la Grande Tache rouge est placée à {l2}° de longitude Système II, reportée depuis l’endroit où l’équipe JUPOS et la British Astronomical Association l’ont mesurée le {date} ({at}°) à {rate}° par mois, le milieu des deux dérives qu’elles ont mesurées cette année-là ({lo} et {hi}), donc à présent elle peut être à {pm}° de part et d’autre. La carte est tournée pour l’y mettre, et ses autres nuages tournent avec elle.",
    "rings": {
      "uranus": "ses anneaux sont à leurs distances mesurées et aussi sombres qu’ils le sont : leurs particules réfléchissent environ 1,5 % de la lumière, un trentième de ce que font ses nuages, donc devant la planète ce sont des fils sombres ; ils sont dessinés 10 fois plus larges qu’ils ne sont pour qu’on les voie, et la pose Profonde les relève 4 fois, comme le fait une longue pose",
      "jupiter": "son anneau faible est aux distances et aux épaisseurs optiques que donne la fiche de la NASA : le halo et l’anneau principal, de la poussière et des grains sombres qui arrêtent quelques millionièmes de la lumière ; les deux anneaux de gaze plus faibles au-delà ne sont pas dessinés. Du côté du Soleil, ce n’est presque rien ; avec le Soleil derrière lui, la poussière renvoie la lumière vers l’avant et il se voit, comme il s’est montré à Galileo et à New Horizons depuis la face nuit. Pour se voir, il est dessiné 8 000 fois plus brillant qu’il n’est avec la pose Caméra et 40 000 fois avec Profonde ; avec Œil il n’est pas dessiné, ce qui est aussi son aspect réel, et il ne l’est pas non plus à la qualité la plus basse. Le halo fait quelque 10 000 km d’épaisseur et est dessiné plat, pas plus brillant que son épaisseur ne le permet ; la façon dont le halo s’estompe vers l’intérieur et dont l’anneau principal s’approfondit vers son bord extérieur net, la part de la lumière due à la poussière, la distance à laquelle elle la renvoie vers l’avant, la couleur rougeâtre de l’anneau et l’éclat maximal auquel il est dessiné sont illustratifs"
    }
  },
  "r12Plumes": {
    "line": "Panaches dessinés tels qu’ils ont été vus : {list}.",
    "item": "{name}, environ {km} km de haut ({by}, {when})",
    "jets": "les jets des quatre rayures de tigre, d’au moins {km} km de haut ({by}, {when})",
    "truth": "Leurs emplacements et leurs hauteurs sont mesurés ; les arcs des grains sont un modèle, et leur lumière est étirée pour qu’on les voie. Ils ne sont peut-être pas en éruption maintenant.",
    "stripes": "Les rayures sont dessinées droites d’après les centres et les longueurs du répertoire toponymique, et les emplacements des 101 jets le long d’elles sont un modèle.",
    "column": "Ce sont des colonnes sombres que le vent a portées vers l’ouest à leur sommet ; la largeur d’une colonne n’est pas connue et est dessinée étroite.",
    "hot": "Les points orange du côté nuit sont des points chauds où la lave rougeoie ({list}) : leurs emplacements sont mesurés, leur éclat ne l’est pas.",
    "film": "Avec l’aspect Cinéma, les grains parcourent leurs arcs {k} fois plus vite que l’horloge.",
    "still": "Ils sont figés, comme avec l’aspect Mesuré ou un mouvement réduit.",
    "review": "Pas encore relu par un astronome.",
    "span": "{a} à {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "Ses étoiles",
      "lightLabel": "Leur lumière",
      "depthLabel": "Leur profondeur",
      "reviewLabel": "Relecture",
      "globularStars": "Un modèle de son genre, pas ses propres étoiles : {n} étoiles plus brillantes que le point de retournement, placées d’après le profil de King avec le rayon de cœur de Harris ({rc} années-lumière) et le rayon de marée ({rt}). Leur nombre, leur éclat et leurs couleurs sont un modèle.",
      "globularLight": "Ensemble, environ {pct} % de la lumière de l’amas (magnitude absolue {mv}) ; les étoiles faibles qu’aucun point ne représente forment la lueur. Dessiné jusqu’à la magnitude 10, comme le montre la pose d’un appareil photo.",
      "openStars": "{n} membres issus de Gaia (Hunt et Reffert 2023, {name}), chacun avec une probabilité d’appartenance d’au moins {p}, à l’intérieur de son rayon de marée. Dessinés jusqu’à la magnitude 10, comme le montre la pose d’un appareil photo.",
      "openStarsHyg": "{n} membres issus de Gaia (Hunt et Reffert 2023, {name}), chacun avec une probabilité d’appartenance d’au moins {p}, à l’intérieur de son rayon de marée ; {h} plus brillants sont les propres étoiles du catalogue de la carte. Dessinés jusqu’à la magnitude 10, comme le montre la pose d’un appareil photo.",
      "openDepthSome": "{m} sont placés d’après leur propre parallaxe ; les {k} autres à la distance de l’amas, leur profondeur à l’intérieur étant modélisée.",
      "openDepthNone": "Leurs directions sont mesurées ; leur profondeur à l’intérieur de l’amas est modélisée, car à cette distance la parallaxe d’une étoile n’est pas assez précise.",
      "review": "Ce modèle n’a pas encore été relu par un astronome."
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "un point brillant là où son décalage vers le rouge le place, avec un anneau qui marque l’endroit ; son disque et son jet sont bien trop petits pour être dessinés",
      "host": "Sa galaxie hôte est dessinée faible et ronde à la taille angulaire que donne la source, {size} secondes d’arc de large vues d’ici ; en réalité, cela fait environ {ly} années-lumière. Son aplatissement et son inclinaison ne sont pas dessinés.",
      "point": "La source ne donne aucune taille pour sa galaxie hôte, donc aucune n’est dessinée."
    },
    "cluster": {
      "members": "{n} galaxies membres d’après {catalogue} ; {own} d’entre elles sont à des distances mesurées une à une.",
      "membersNoOwn": "{n} galaxies membres d’après {catalogue}.",
      "distanceSbf": "L’amas est à {mpc} mégaparsecs ({mly} millions d’années-lumière), une moyenne de distances trouvées par les fluctuations de brillance de surface.",
      "distanceZ": "L’amas est à {mly} millions d’années-lumière : le décalage vers le rouge moyen de ses membres ({z}), converti en distance comobile dans l’unique cosmologie de la carte.",
      "depthMeasured": "Une galaxie sans distance propre est répartie en profondeur selon la dispersion mesurée de l’amas, {rms} mégaparsecs ; ce placement est un modèle.",
      "depthModelled": "Aucune galaxie ici n’a de distance propre, donc elles sont réparties en profondeur aussi largement qu’en travers du ciel, comme si l’amas était rond ; ce placement est un modèle.",
      "size": "Chaque galaxie est aussi large que le dit le rayon de demi-lumière de son catalogue, dessinée comme une forme ronde, brillante au centre ; son aplatissement et son inclinaison ne sont pas dessinés."
    }
  },
  "deepRing": {
    "card": {
      "m27": "Sa lumière vient de la photographie de NOIRLab, montrée dans les teintes propres de ses gaz ; sa forme est une reconstitution : la ceinture brillante, un anneau épais vu presque par la tranche ; les « oreilles » plus pâles, ses lobes, d’après les vitesses de ses coquilles mesurées par Meaburn et d’autres (2005). Pas encore relu par un astronome.",
      "southern-ring": "Sa lumière vient de la photographie infrarouge de Webb ; sa forme suit Kastner et d’autres (2024) et De Marco et d’autres (2022) : un anneau vu presque selon son axe, une bulle qui le traverse et un halo moléculaire autour des deux. Pas encore relu par un astronome.",
      "m57": "Sa lumière vient de la photographie de Hubble, sa forme d’O’Dell, Ferland, Henney et Peimbert (2013) : un anneau épais incliné de 13,5°, vu presque dans son axe, le gaz plus bleu de son milieu dessiné s’étirant vers nous et loin de nous. Ses couleurs sont celles de la photographie, prise à travers des filtres étroits. Pas encore relu par un astronome."
    },
    "rows": {
      "dso-m27": [["Sa forme en profondeur", "Reconstituée. Sa taille, son angle sur le ciel et les vitesses de ses coquilles sont mesurés ; que sa ceinture brillante soit un anneau vu presque par la tranche, et la façon dont ses « oreilles » s’étendent vers nous et à l’opposé, est la lecture habituelle d’une nébuleuse de cet aspect, dessinée comme illustration."], ["Ses couleurs", "Les teintes propres de ses gaz, d’après les filtres étroits de la photographie : l’oxygène bleu-vert, l’hydrogène et le soufre rouges. La force de chacun est notre choix."], ["Relecture", "Ce modèle n’a pas encore été relu par un astronome."]],
      "dso-southern-ring-nebula": [["Sa forme en profondeur", "Reconstituée. Que son anneau brillant soit vu à 15–30° de son axe est mesuré (Kastner et d’autres, 2024) ; quel côté est le plus proche, l’épaisseur de l’anneau et la longueur de la bulle sont illustratifs."], ["Ses couleurs", "Une lumière infrarouge qu’aucun œil ne voit, colorée par les auteurs de l’image de Webb."], ["Relecture", "Ce modèle n’a pas encore été relu par un astronome."]],
      "dso-m57": [
        [
          "Sa distance",
          "Parallaxe (Gaia DR3) de son étoile centrale, Gaia DR3 2090486618786534784 : 1,270 ± 0,044 milliseconde d’arc, environ 2 570 années-lumière (2 480 à 2 660)."
        ],
        [
          "Sa forme en profondeur",
          "Reconstituée. La taille de l’anneau sur le ciel, l’inclinaison de son grand axe et laquelle de ses extrémités est la plus proche sont mesurées. Son épaisseur et la forme du gaz en son milieu ne le sont pas : ils sont dessinés comme une illustration."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ]
    },
    "how": "Les images de Hubble en lumières de couleur unique, avec les vitesses du gaz mesurées à travers la nébuleuse, montrent un anneau épais presque de face : son grand axe est incliné de 13,5°, son extrémité nord-est plus proche de nous. Un gaz plus rapide remplit son milieu et s’étire vers nous et loin de nous le long de notre ligne de visée (O’Dell, Ferland, Henney et Peimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "m45": "Sa lumière est la photographie de NOIRLab : un nuage de poussière qui traverse l’amas, juste devant ses étoiles, diffuse leur lumière bleue (Ritchey et d’autres, 2006). Sa profondeur est reconstituée. Pas encore relu par un astronome.",
      "crab": "Sa lumière vient de la photographie de Hubble, en fausses couleurs, portée par une coque dont la forme suit Martin, Milisavljevic et Drissen (2021) : une cage de filaments longue d’environ 4 parsecs autour d’un milieu vide. Pas encore relu par un astronome.",
      "veil": "Sa lumière vient de la photographie de NOIRLab, en fausses couleurs, portée par une fine sphère de 37 parsecs de diamètre (Fesen et autres, 2018) : les filaments sont son bord vu par la tranche. Pas encore relu par un astronome.",
      "horsehead": "Son obscurité se lit dans la photographie de NOIRLab : de la poussière devant le gaz lumineux d’IC 434, qui absorbe et rougit ce qui est derrière elle et n’émet aucune lumière. Pas encore relu par un astronome.",
      "coalsack": "Son obscurité se lit dans la Voie lactée autour d’elle : un nuage de poussière à environ 590 années-lumière qui assombrit et rougit les étoiles derrière lui. Pas encore relu par un astronome.",
      "m78": "Sa lumière est la photographie de NOIRLab : de la poussière qui diffuse la lumière bleue de l’étoile devant elle, sur la face d’un nuage sombre. Sa profondeur est reconstituée. Pas encore relu par un astronome.",
      "iris": "Sa lumière est la photographie de NOIRLab : de la poussière qui diffuse la lumière de la jeune étoile HD 200775 dans un creux de son nuage. Sa profondeur est reconstituée. Pas encore relu par un astronome."
    },
    "rows": {
      "dso-m45": [["Sa forme en profondeur", "Reconstituée. Le gaz est devant les étoiles, comme le montre leur lumière ; à quelle distance devant, et l’épaisseur de la poussière, sont illustratifs, et les profondeurs des étoiles dans l’amas sont un modèle fixe, non mesurées."], ["Ce que fait la poussière", "Elle diffuse la lumière des étoiles, surtout la bleue, et brille donc en bleu autour des plus brillantes, Mérope et Maïa surtout. C’est un nuage de passage, pas celui dont les étoiles sont nées."], ["Relecture", "Ce modèle n’a pas encore été relu par un astronome."]],
      "dso-m1": [
        [
          "Sa forme en profondeur",
          "Reconstituée à partir d’un contour mesuré. Les filaments s’étendent sur environ 2 parsecs le long de l’axe du vent du pulsar et aucun ne se trouve à moins d’un demi-parsec du centre (Martin et autres, 2021). Dessinée comme un ellipsoïde le long de cet axe ; l’extrémité la plus proche de nous est supposée."
        ],
        [
          "Ses couleurs",
          "Fausses couleurs : les filtres étroits de la photographie pour l’oxygène et le soufre, associés à des couleurs par les auteurs de l’image."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-veil-nebula": [
        [
          "Sa forme en profondeur",
          "Reconstituée : une sphère de 37 parsecs de diamètre, la taille et la distance mesurées par Fesen et autres (2018). L’épaisseur de la coque est illustrative."
        ],
        [
          "Ses couleurs",
          "Fausses couleurs : les filtres étroits de la photographie pour l’oxygène, le soufre et l’hydrogène, associés à des couleurs par l’auteur de l’image."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "Sa forme en profondeur",
          "Reconstituée. La poussière est devant le gaz lumineux d’IC 434, comme on l’observe ; à quelle distance devant, et son épaisseur, sont illustratives."
        ],
        [
          "Ce que fait la poussière",
          "Elle ne fait qu’absorber : les étoiles et la lueur derrière elle sont atténuées, plus dans le bleu que dans le rouge, donc elles paraissent plus rouges. Elle n’émet aucune lumière propre."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-coalsack": [
        [
          "Son degré d’obscurité",
          "Lu d’après l’obscurité plus forte de la Voie lactée ici qu’à la même distance de sa ligne médiane, tout près. C’est une estimation, plus basse que celle des cartes infrarouges, car des étoiles devant le nuage ajoutent leur lumière."
        ],
        [
          "Ce que fait la poussière",
          "Elle ne fait qu’absorber : les étoiles derrière elle sont atténuées et rougies. Celles devant elle ne le sont pas. Une partie de l’obscurité au nord-est est un second nuage bien plus loin, dessiné ici à la distance proche."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-m78": [
        [
          "Sa forme en profondeur",
          "Reconstituée : la poussière éclairée en nappe, avec son étoile devant et un nuage sombre derrière. Les profondeurs sont illustratives."
        ],
        [
          "Vue d’un autre côté",
          "Modélisé : la poussière diffuse plus de lumière vers l’avant que sur le côté, donc d’un autre côté la même poussière paraît plus ou moins brillante."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ],
      "dso-iris-nebula": [
        [
          "Sa forme en profondeur",
          "Reconstituée : les parois éclairées en nappe, avec l’étoile devant et un nuage sombre derrière. Les profondeurs sont illustratives."
        ],
        [
          "Vue d’un autre côté",
          "Modélisé : la poussière diffuse plus de lumière vers l’avant que sur le côté, donc d’un autre côté la même poussière paraît plus ou moins brillante."
        ],
        [
          "Relecture",
          "Ce modèle n’a pas encore été relu par un astronome."
        ]
      ]
    },
    "how": "Le gaz d’un rémanent file vers l’extérieur à vitesse constante, donc sa vitesse vers nous ou loin de nous dit à quelle distance devant ou derrière le centre il se trouve. Martin, Milisavljevic et Drissen (2021) ont transformé ainsi 310 000 spectres de la nébuleuse du Crabe en sa forme."
  },
  "r12Navigate": {
    "chainLabel": "Où il est",
    "chainTitle": "Voler vers {name}",
    "milkyWay": "Voie lactée",
    "outside": "Hors de la Voie lactée",
    "the": [
      "∅",
      "∅",
      "∅"
    ],
    "theWord": "",
    "backParent": "Retour : {parent}",
    "backParentTitle": "S’éloigner jusqu’à {parent}",
    "legendTitle": "Ouvrir la légende : ce que veut dire chacun de ces mots",
    "label": "Où tu es",
    "title": "Où est la caméra sur l’échelle, de la Terre jusqu’au Groupe local",
    "back": "Retour",
    "backTo": "Retour : {name}",
    "sep": "›",
    "rungs": {
      "earth": "Terre",
      "sun": "Système solaire",
      "stellar": "Étoiles proches",
      "galaxy": "Voie lactée",
      "local-group": "Groupe local"
    },
    "notes": {
      "sun": "Accéléré : le Soleil est à {distance}",
      "stellar": "Accéléré : l’étoile la plus proche est à {distance}",
      "galaxy": "Accéléré : le centre de notre galaxie est à {distance}",
      "local-group": "Accéléré : Andromède est à {distance}"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "Le Soleil",
      "ROCKY_PLANET": "Planètes rocheuses",
      "GAS_GIANT": "Géantes gazeuses",
      "ICE_GIANT": "Géantes de glace",
      "RINGS": "Anneaux",
      "VOLCANIC_MOON": "Lune volcanique",
      "ICY_MOON": "Lunes glacées",
      "TITAN": "Lune avec une atmosphère",
      "AIRLESS_MOON": "Lunes sans air",
      "DWARF_PLANET": "Planètes naines",
      "ASTEROID": "Astéroïdes",
      "COMET": "Comètes",
      "ARTIFICIAL_SATELLITE": "Satellites",
      "LAUNCH_AND_ROCKET": "Lancements et fusées",
      "SPACE_PROBE": "Sondes spatiales",
      "LANDING_SITE": "Sites d’atterrissage",
      "EXOPLANET": "Exoplanètes",
      "STAR": "Étoiles",
      "BINARY_AND_MULTIPLE": "Étoiles doubles et multiples",
      "COMPACT_REMNANT": "Étoiles mortes",
      "BLACK_HOLE": "Trous noirs",
      "OPEN_CLUSTER": "Amas ouverts",
      "GLOBULAR_CLUSTER": "Amas globulaires",
      "EMISSION_NEBULA": "Nébuleuses en émission",
      "PLANETARY_NEBULA": "Nébuleuses planétaires",
      "DARK_NEBULA": "Nébuleuses sombres",
      "REFLECTION_NEBULA": "Nébuleuses par réflexion",
      "SUPERNOVA_REMNANT": "Rémanents de supernova",
      "GALAXY_SPIRAL": "Galaxies spirales",
      "GALAXY_IRREGULAR": "Galaxies irrégulières",
      "GALAXY_ELLIPTICAL": "Galaxies elliptiques",
      "GALAXY_INTERACTION": "Galaxies en interaction",
      "AGN_QUASAR": "Quasars",
      "GALAXY_GROUP": "Groupes de galaxies",
      "GROUND_SITE": "Stations au sol",
      "ODDITY": "Curiosités"
    },
    "other": "Autres choses",
    "byName": "Par nom",
    "of": "{label} : {world}",
    "only": "Modèles 3D",
    "onlyTitle": "Lister seulement ce qui est dessiné d’après un modèle 3D : un vrai modèle ou une reconstitution",
    "real": "vrai modèle 3D",
    "rebuilt": "reconstitution 3D",
    "noneWithModel": "Aucun d’eux n’a de modèle 3D.",
    "counting": "comptage…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "Mouvement",
      "choices": {
        "on": "Activé",
        "off": "Désactivé"
      },
      "titles": {
        "on": "Les vols glissent et les voyages avancent tout seuls, comme la carte est conçue pour le faire",
        "off": "Chaque vol est un déplacement instantané, rien ne bouge qui ne soit mesuré, et un voyage attend Suivant"
      },
      "device": "Ton appareil demande moins de mouvement, donc c’est désactivé."
    },
    "summary": {
      "label": "Ce qui est à l’écran",
      "stage": "Vue actuelle : {stage}.",
      "selected": "Sélection : {name}, {kind}.",
      "nothing": "Rien n’est sélectionné.",
      "trip": "Étape {n} sur {count} du voyage : {title}.",
      "tripIntro": "Le voyage {title} est ouvert.",
      "measured": "Dessiné tel que mesuré."
    }
  }
};

// 1.6.2 (internal #1057): the words of the Moments (copy/en.moments.js and its three story files), French. Machine-drafted like the rest of this file
// (docs/TRANSLATING.md): drafted by a program from the English, NOT read by a native speaker. The spoken lines of the recordings
// (Armstrong's first words) stay in the language they were said in. Added to COPY here; the story files call HOOK.localise after they load.
Object.assign(COPY, {
  "momentPlayer": {
    "micro": "Moment",
    "play": "Lecture",
    "pause": "Pause",
    "replay": "Revoir",
    "close": "Fermer le moment",
    "chapters": "Chapitres",
    "chaptersTitle": "Aller à un chapitre",
    "share": "Copier un lien vers cette seconde",
    "copied": "Lien copié",
    "copyFailed": "Copie ce lien : {url}",
    "director": "Réalisateur",
    "directorTitle": "Rendre la caméra au réalisateur",
    "freeNote": "Ta caméra. Fais glisser pour regarder autour ; Réalisateur la reprend.",
    "scrubber": "Temps de mission",
    "met": "Temps écoulé depuis le début de la mission",
    "rateTitle": "Ici le temps passe {rate} plus vite qu’en vrai",
    "realTime": "Temps réel",
    "loading": "Chargement du moment…",
    "missing": "Il n’y a pas de moment nommé {id}.",
    "unreachable": "Ce moment ne s’est pas chargé. Il n’est gardé sur cet appareil qu’après avoir été ouvert une fois en ligne.",
    "modelMissing": "Le modèle {model} ne s’est pas chargé ; sa trajectoire et ses flammes sont tout de même dessinées.",
    "chapterOf": "Chapitre {n} sur {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "Mesuré",
      "reconstructed": "Reconstitué",
      "illustrative": "Illustratif"
    },
    "truthLine": "{truth} : {path}.",
    "cutNote": "Pour l’instant, les étages sont découpés dans un seul modèle.",
    "drawnNote": "Les flammes, la vapeur, les parachutes et la lueur d’une rentrée sont dessinés.",
    "groundNote": "Le sol près du pas de tir est illustratif ; carte de la Terre Solar System Scope, CC BY 4.0.",
    "groundNoteMars": "Le sol près du site est illustratif ; carte de Mars Solar System Scope, CC BY 4.0.",
    "keys": "Espace lance ou met en pause, les flèches avancent, Échap ferme"
  },
  "momentShelf": {
    "title": "Moments",
    "note": "Missions rejouées sur une seule horloge, avec les heures réelles des événements. Les trajectoires sont reconstituées ou illustratives, et le disent.",
    "minutes": "{m} min",
    "all": "Les {n} moments",
    "fewer": "Moins de moments",
    "replay": "Rejouer ce moment",
    "replayTitle": "Rejouer {title} sur l’horloge de la mission",
    "replayNamed": "Rejouer {title}",
    "cards": {
      "apollo-11": {
        "title": "Apollo 11",
        "when": "du 16 au 24 juillet 1969",
        "blurb": "Du pas de tir 39A au Pacifique en passant par la base de la Tranquillité : décollage, la Lune, l’alunissage, la remontée, le retour."
      },
      "apollo-13": {
        "title": "Apollo 13",
        "when": "du 11 au 17 avril 1970",
        "blurb": "Du pas de tir 39A au Pacifique : l’alunissage qui n’a pas eu lieu, un réservoir d’oxygène qui a explosé, et le module lunaire comme canot de sauvetage."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "du 1er au 10 avril 2026",
        "blurb": "Du pas de tir 39B au Pacifique au large de San Diego, autour de la face cachée de la Lune. On dit ce qui a été réellement fait et ce qui était prévu."
      },
      "sputnik-1": {
        "title": "Sputnik 1",
        "when": "4 octobre 1957",
        "blurb": "De Baïkonour au premier tour de la Terre : le premier satellite artificiel, une sphère polie de 585 mm, et son bip."
      },
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "du 18 au 19 mars 1965",
        "blurb": "Alexeï Leonov sort dans l’espace pendant douze minutes par un sas gonflable, puis l’équipage se pose à la main dans la taïga, loin de son champ."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "du 12 au 14 avril 1981",
        "blurb": "La première navette spatiale : Columbia depuis le pas de tir 39A, les propulseurs et le réservoir, 54 heures en orbite et un vol plané jusqu’au lac asséché d’Edwards."
      },
      "curiosity-edl": {
        "title": "Atterrissage de Curiosity",
        "when": "6 août 2012",
        "blurb": "Les sept minutes du haut de l’air martien au cratère Gale : le bouclier thermique, le parachute, le sac à dos fusée et la grue céleste, à l’heure du JPL."
      },
      "new-horizons-pluto": {
        "title": "New Horizons à Pluton",
        "when": "14 juillet 2015",
        "blurb": "La première visite de Pluton : de six heures avant au passage à 13,8 km/s, sur la trajectoire du JPL, Pluton et Charon en disques, le croissant laissé derrière."
      },
      "hubble-deployment": {
        "title": "Le largage de Hubble",
        "when": "25 avril 1990",
        "blurb": "Le bras de Discovery sort le télescope spatial Hubble de la soute lors de STS-31, un panneau solaire s’arrête, et à 19:38 UTC le télescope est largué."
      },
      "falcon9-og2-2": {
        "title": "Le premier atterrissage d’un Falcon 9",
        "when": "21 décembre 2015",
        "blurb": "Le vol 20 de Falcon 9 emporte 11 satellites ORBCOMM depuis Cap Canaveral, et son premier étage revient se poser sur Landing Zone 1 : le premier atterrissage du premier étage d’une fusée orbitale."
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 avril 1961",
        "blurb": "Iouri Gagarine, un tour de la Terre en 108 minutes, de Baïkonour à un champ près de Smelovka."
      }
    }
  },
  "momentStories": {
    "demo-saturn": {
      "title": "Saturn V : de l’allumage à la séparation des étages",
      "blurb": "Les trois premières minutes d’Apollo 11, le 16 juillet 1969, depuis le pas de tir du complexe de lancement 39A.",
      "chIgnition": "Allumage",
      "chLiftoff": "Décollage",
      "chClimb": "Pression dynamique maximale",
      "chStaging": "Séparation des étages",
      "ignition": "T−8,9 s : la séquence d’allumage démarre les cinq moteurs F-1, le central d’abord, puis les paires extérieures.",
      "holddown": "Les bras de retenue gardent la fusée sur son pas de tir jusqu’à ce que les cinq moteurs soient à pleine poussée.",
      "liftoff": "Décollage, 13:32:00.6 UTC : cinq F-1, quelque 33 800 kN, soulevant près de 3 000 tonnes.",
      "tower": "Dégagée de la tour, la fusée s’oriente sur son azimut de vol, à 72 degrés à l’est du nord.",
      "maxq": "Après le mur du son, une minute plus tard, vient la pression dynamique maximale, quand l’air pousse le plus fort : 35 kPa (735 lb/ft²).",
      "ceco": "T+135 s : le moteur central s’éteint, pour garder l’accélération sous 4 g.",
      "staging": "T+161,7 s : les moteurs extérieurs s’arrêtent. À quelque 67 km d’altitude le S-IC se détache et tombe, ses rétrofusées allumées.",
      "sii": "T+163,0 s : les cinq moteurs J-2 du S-II s’allument. L’hydrogène brûle avec une flamme pâle, presque transparente.",
      "interstage": "L’anneau interétage se détache ; à T+197,9 s la tour de sauvetage part. L’orbite de parking est 8,5 minutes plus loin.",
      "pathAscent": "heures du rapport de mission d’Apollo 11, hauteurs intermédiaires approximatives",
      "sources": "Rapport de mission d’Apollo 11, NASA MSC-00171, 1969 (tableau 3-I, séquence des événements ; section 7.1, lancement)"
    },
    "vostok-1": {
      "title": "Vostok 1 : la première personne dans l’espace",
      "blurb": "Iouri Gagarine, 12 avril 1961 : de Baïkonour, un tour de la Terre, jusqu’à un champ près de Smelovka, sur l’horloge de la mission, en 108 minutes.",
      "chPad": "Le Départ de Gagarine",
      "chAscent": "Ascension",
      "chOrbit": "Une orbite",
      "chRetro": "Rétrofreinage",
      "chEntry": "Rentrée",
      "chEject": "Éjection",
      "chLand": "Atterrissage",
      "ready": "Baïkonour, site 1, 06:07 UTC. Iouri Gagarine, 27 ans, est dans la capsule au sommet de la fusée R-7.",
      "korolev": "Sergueï Korolev à la radio : « Étage préliminaire… intermédiaire… principal… décollage ! »",
      "liftoff": "Décollage. Gagarine : « Poyekhali ! », « En route ! »",
      "boosters": "T+119 s : les quatre propulseurs d’appoint s’éteignent et se détachent.",
      "shroud": "T+156 s : la coiffe qui couvre la capsule est larguée.",
      "core": "T+300 s : l’étage central est épuisé et se détache ; le dernier étage s’allume.",
      "earth": "Vers T+6 min, Gagarine : « Je vois la Terre. La visibilité est bonne. »",
      "kosberg": "Vers T+10 min le dernier étage s’arrête. Gagarine : « Kossberg a fonctionné ! », du nom du concepteur de son moteur.",
      "orbit": "En orbite : 181 sur 327 km, inclinée de 64,95 degrés sur l’équateur, 89,1 minutes par tour. La capsule se sépare de l’étage.",
      "retro": "T+1 h 18 min, au-dessus de la côte ouest de l’Afrique : la rétrofusée brûle environ 42 secondes. Son heure et son lieu sont publiés ; son ampleur est ici ajustée à l’atterrissage.",
      "wires": "Le module d’instruments devait se détacher dix secondes après le rétrofreinage. Un faisceau de fils le retient ; les deux retombent ensemble en culbutant dans l’air.",
      "entry": "Les fils brûlent et la sphère se stabilise, bouclier thermique en avant. Gagarine a rapporté ensuite plus de 10 g.",
      "eject": "À 7 km l’écoutille saute et le siège éjecte Gagarine. La sphère de Vostok touchait le sol trop durement pour une personne à l’intérieur.",
      "chutes": "À 2,5 km le parachute principal de la capsule s’ouvre, 27 m de large ; celui du pilote s’était ouvert presque aussitôt. Le siège tombe seul.",
      "landing": "T+1 h 48 min : Gagarine atterrit à 26 km au sud-ouest d’Engels, dans la région de Saratov, 108 minutes après le lancement. Les sources diffèrent de dix minutes sur l’atterrissage.",
      "pathAscent": "la montée est faite des heures publiées des événements reliées par des courbes lisses ; les hauteurs et distances entre elles sont les nôtres",
      "pathOrbit": "l’orbite, le rétrofreinage et la rentrée sont des arcs à deux corps ajustés aux heures publiées et au champ d’atterrissage, pas des données de suivi",
      "pathPilot": "la descente sous le parachute du pilote est dessinée ; aucune source ne donne la distance jusqu’à la capsule",
      "srcWiki": "Wikipédia, Vostok 1 (heures des événements, orbite, citations ; lu le 2 novembre 2026)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (orbite, engin)"
    },
    "apollo-11": {
      "title": "Apollo 11 : jusqu’à la Lune et retour",
      "blurb": "Du complexe de lancement 39A, le 16 juillet 1969, au Pacifique le 24 : décollage, la Lune, la base de la Tranquillité et le retour, sur l’horloge de la mission.",
      "chIgnition": "Allumage",
      "chLiftoff": "Décollage",
      "chStaging": "Séparation des étages",
      "chParking": "Orbite de parking",
      "chTli": "En route pour la Lune",
      "chCoast": "Trois jours de voyage",
      "chLoi": "En orbite lunaire",
      "chUndock": "Eagle se sépare",
      "chDescent": "Descente motorisée",
      "chSurface": "Base de la Tranquillité",
      "chAscent": "La remontée",
      "chDock": "Amarrage",
      "chTei": "Le retour",
      "chEntry": "Rentrée",
      "chSplash": "Amerrissage",
      "ignition": "T−8,9 s : la séquence d’allumage démarre les cinq moteurs F-1, le central d’abord, puis les paires extérieures.",
      "liftoff": "Décollage, 13:32:00 UTC : cinq F-1, quelque 33 800 kN, soulevant près de 3 000 tonnes.",
      "tower": "Dégagée de la tour, la fusée s’oriente sur son azimut de vol, à 72 degrés à l’est du nord.",
      "maxq": "Le mur du son est franchi après une minute ; puis la pression dynamique maximale, quand l’air pousse le plus fort : 35 kPa.",
      "ceco": "T+135 s : le moteur central s’éteint, pour garder l’accélération sous 4 g.",
      "staging": "T+161,7 s : les moteurs extérieurs s’arrêtent. À quelque 67 km d’altitude le S-IC se détache et tombe, ses rétrofusées allumées.",
      "sii": "T+163,0 s : les cinq moteurs J-2 du S-II s’allument. L’hydrogène brûle avec une flamme pâle, presque transparente.",
      "interstage": "L’anneau interétage se détache ; à T+197,9 s la tour de sauvetage part.",
      "siicut": "T+9 min 13 s : le S-II s’éteint et se détache ; le S-IVB s’allume.",
      "parking": "T+11 min 52 s : orbite de parking, à 185 km. Deux heures et demie de vérifications, un tour et demi de la Terre.",
      "tli": "2:44:16 : le S-IVB se rallume pendant 5 min 48 s et porte l’ensemble à 10,8 km/s. La destination est la Lune.",
      "sla": "3:17 : les quatre panneaux autour du module lunaire s’ouvrent. Columbia se sépare, se retourne et s’amarre nez à nez avec Eagle (non dessiné).",
      "extract": "Vers 3:57 : Columbia tire Eagle hors du S-IVB. L’étage épuisé est abandonné.",
      "coast": "Trois jours jusqu’à la Lune, 384 000 km, dessinés à quelque 8 000 fois la vitesse réelle. L’engin mesure 11 mètres : c’est un point.",
      "loi": "75:49:50, derrière la Lune et sans contact radio : le moteur de service brûle six minutes pour se faire capturer.",
      "lunarorbit": "Orbite lunaire, à environ 100 km d’altitude, deux heures par tour.",
      "undock": "100:12 : Eagle, avec Armstrong et Aldrin, se sépare de Columbia, où reste Collins.",
      "pdi": "102:33:05 : la descente motorisée commence, à 15 km d’altitude et à environ 500 km du site.",
      "landing": "L’ordinateur poserait l’engin dans un cratère semé de rochers. Armstrong prend les commandes et continue, avec moins d’une minute de carburant.",
      "landed": "102:45:40, 20:17:40 UTC. « Houston, Tranquility Base here. The Eagle has landed. »",
      "step": "109:24:15, 02:56 UTC le 21 juillet : Armstrong descend de l’échelle.",
      "smallstep": "« That’s one small step for [a] man, one giant leap for mankind. » Armstrong, 109:24:48 ; l’extrait est l’enregistrement de la NASA.",
      "liftoffe": "124:22 : l’étage de remontée décolle de l’étage de descente, qui reste sur la Lune. 17:54 UTC le 21 juillet.",
      "rendezvous": "Eagle poursuit Columbia de 18 km à 100 km. Les manœuvres sont dessinées comme une forme, pas celles de la mission.",
      "docked": "128:03, 21:35 UTC : amarrés. L’équipage et 21,5 kg de roche lunaire passent à bord.",
      "jettison": "130:09 : l’étage de remontée d’Eagle est largué pour tourner autour de la Lune.",
      "tei": "135:23:42, sur la face cachée : le moteur de service brûle 2 min 30 s. En route pour la maison.",
      "home": "Deux jours et demi pour revenir, les mêmes 384 000 km.",
      "smsep": "194:49 : le module de service est coupé et la capsule tourne son bouclier thermique vers l’avant.",
      "entry": "195:03, interface de rentrée, à 122 km d’altitude et 11 km/s. Le bouclier rougeoie ; jusqu’à environ 6 g.",
      "drogue": "Vers 195:12 : deux parachutes stabilisateurs, puis trois principaux.",
      "mains": "Trois parachutes principaux, de 25 m de large, ralentissent la capsule à quelque 9 m/s.",
      "splash": "195:18:35, 16:50:35 UTC le 24 juillet : amerrissage dans le Pacifique, à 24 km du porte-avions USS Hornet (non dessiné). Huit jours, trois heures, 18 minutes.",
      "pathAscent": "les heures des événements du rapport de mission, hauteurs et distances intermédiaires approximatives",
      "pathTrip": "reconstitué à partir des heures du journal de vol en arcs à deux corps : une conique à l’aller, un cercle autour de la Lune, une conique au retour ; pas des données de suivi",
      "pathLm": "la descente est dessinée à rebours depuis la base de la Tranquillité et le rendez-vous est une forme ; les heures des événements sont celles de la mission",
      "srcReport": "Rapport de mission d’Apollo 11, NASA MSC-00171, 1969 (heures des événements, lancement, alunissage)",
      "srcJournal": "Journal de vol d’Apollo 11, NASA (heures des événements à la seconde)",
      "srcClip": "Les premiers mots d’Armstrong sur la Lune : enregistrement de la NASA, domaine public, de Wikimedia Commons",
      "srcLanding": "L’annonce de l’alunissage : enregistrement de la NASA, domaine public, de Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II : autour de la Lune",
      "blurb": "Du complexe de lancement 39B, le 1er avril 2026, au Pacifique au large de San Diego le 10 : quatre personnes autour de la face cachée de la Lune, sur l’horloge de la mission.",
      "chPad": "Pas de tir 39B",
      "chLiftoff": "Décollage",
      "chStaging": "Propulseurs largués",
      "chOrbit": "Haute orbite terrestre",
      "chTli": "En route pour la Lune",
      "chMoon": "La face cachée",
      "chHome": "Le retour",
      "chEntry": "Rentrée",
      "chSplash": "Amerrissage",
      "ready": "Complexe de lancement 39B, centre spatial Kennedy, 1er avril 2026. Wiseman, Glover, Koch et Hansen sont à bord d’Orion, au sommet du Space Launch System.",
      "cored": "T−6,4 s : les quatre moteurs RS-25 de l’étage central démarrent. Réalisé, comme prévu.",
      "liftoff": "Décollage, 22:35:12 UTC (18:35 EDT) : les deux propulseurs à cinq segments s’allument à zéro. Réalisé.",
      "srb": "Vers T+2 min : les propulseurs s’éteignent et se séparent à 48 km, à 5 000 km/h. Réalisé ; ils retombent dans l’Atlantique.",
      "las": "Prévu, T+3 min 22 s : la tour de sauvetage est larguée. Les vols rapportés ne donnent pas la seconde ; c’est celle du plan de vol.",
      "meco": "Prévu, T+8 min : l’étage central s’arrête, sur un arc suborbital d’apogée proche de 2 300 km. L’heure du plan de vol.",
      "coresep": "L’étage central est libéré et retombe en rentrée destructrice sur le Pacifique, environ deux heures après le lancement. Réalisé.",
      "prb": "Vers T+50 min, au sommet de l’arc : l’étage supérieur brûle pour relever le point bas hors de l’air. Réalisé ; la seconde n’est pas publiée.",
      "arb": "Une heure plus tard, au point bas : une poussée de 15 minutes porte le point haut de l’orbite à 70 000 km, un tour de près d’une journée. Réalisé.",
      "fairings": "Prévu : les trois panneaux autour du module de service sont largués ; les quatre panneaux solaires se déploient. L’heure du plan de vol, dessinés ici déployés.",
      "arrays": "Les quatre panneaux d’Orion sont sortis : ils fourniront son énergie pendant dix jours.",
      "sep": "Prévu : Orion se sépare de l’étage supérieur ; Glover le pilote ensuite à la main, à côté de l’étage, pendant environ 70 minutes. L’heure de la séparation n’est pas publiée.",
      "tli": "Jour de vol 2, environ 25 heures après le départ : le moteur principal du module de service brûle 5 min 49 s, pour la Lune. Réalisé ; la minute indiquée est celle du plan de vol.",
      "outbound": "Quatre jours d’aller. Une poussée de correction à l’aller a été effectuée, de 17,5 s au jour de vol 5 ; elle est trop petite pour être dessinée.",
      "record": "17:56 UTC le 6 avril : Orion dépasse le record de distance d’Apollo 13 en 1970, à 248 655 miles de la Terre. Réalisé.",
      "moon": "Jour de vol 6 : Orion entre dans la sphère d’influence de la Lune. Il ne se mettra pas en orbite : il contourne la face cachée et retombe vers la maison.",
      "los": "22:46 UTC : derrière la Lune, sans contact pendant 38 minutes. Réalisé.",
      "closest": "Approche maximale, 23:00 UTC le 6 avril : 6 545 km au-dessus de la face cachée de la Lune. Réalisé.",
      "far": "23:02 UTC : au plus loin de la Terre, 406 771 km. Réalisé.",
      "aos": "23:24 UTC : le contact revient depuis l’arrière de la Lune. Réalisé.",
      "home": "Quatre jours de retour. Trois poussées de correction au retour ont été effectuées, de 15, 9 et 8 secondes ; elles sont trop petites pour être dessinées.",
      "esmsep": "Prévu : le module de service est libéré environ 20 minutes avant la rentrée. L’heure du largage n’est pas publiée ; celle du plan de vol est dessinée.",
      "entry": "Interface de rentrée, prévue environ 13 minutes avant l’amerrissage : à 122 km d’altitude et 11 km/s, le bouclier thermique rougeoyant. Une rentrée directe plus raide a remplacé la rentrée à rebond prévue. Réalisé.",
      "drogue": "Parachutes stabilisateurs, puis parachutes pilotes et trois parachutes principaux, de 35 m de large. Réalisé ; les heures sont celles du plan de vol.",
      "mains": "Trois parachutes principaux ramènent la capsule jusqu’à la mer.",
      "splash": "Amerrissage, 00:07:27 UTC le 11 avril (17:07 PDT, 10 avril), 32,3 N 117,8 O, au sud-ouest de San Diego ; l’USS John P. Murtha recueille l’équipage (navire non dessiné). Neuf jours, une heure, 32 minutes. Réalisé.",
      "pathAscent": "les heures du plan de vol, avec des hauteurs et distances intermédiaires qui sont les nôtres ; le décollage et la séparation des propulseurs sont réels",
      "pathTrip": "reconstitué à partir de l’orbite réelle, de l’approche maximale et de l’amerrissage, en arcs à deux corps et une hyperbole autour de la Lune ; pas des données de suivi",
      "srcWiki": "Wikipédia, Artemis II (ce qui a été réellement fait, avec heures et distances ; lu le 2 novembre 2026)",
      "srcNasa": "NASA, Artemis II (le plan de vol ; modèle de la fusée et de la capsule : NASA 3D Resources)"
    },
    "apollo-13": {
      "title": "Apollo 13 : le vol du retour",
      "blurb": "Du complexe de lancement 39A, le 11 avril 1970, au Pacifique le 17 : un alunissage qui n’a pas eu lieu, un réservoir d’oxygène qui a éclaté et le module lunaire comme canot de sauvetage.",
      "chIgnition": "Allumage",
      "chLiftoff": "Décollage",
      "chStaging": "Séparation des étages",
      "chParking": "Orbite de parking",
      "chTli": "En route pour la Lune",
      "chCoast": "Deux jours de voyage",
      "chBang": "La détonation",
      "chLifeboat": "Aquarius, le canot de sauvetage",
      "chReturn": "De nouveau sur une trajectoire de retour",
      "chMoon": "Autour de la face cachée",
      "chBurn": "La poussée du retour",
      "chHome": "Trois jours pour rentrer",
      "chSm": "Le module de service",
      "chUndock": "Aquarius est largué",
      "chEntry": "Rentrée",
      "chSplash": "Amerrissage",
      "ignition": "Vers T−9 s : les cinq moteurs F-1 démarrent, le central d’abord. Complexe de lancement 39A, 14 h 13, heure de l’Est.",
      "liftoff": "Décollage, 19:13:00 UTC, 11 avril 1970 : James Lovell, Jack Swigert et Fred Haise, en route pour les hautes terres de Fra Mauro.",
      "roll": "À 12,6 s l’ensemble bascule sur son azimut de vol, à 72,043 degrés à l’est du nord.",
      "staging": "2:44 : les moteurs extérieurs du premier étage s’éteignent et l’étage se détache ; le deuxième étage s’allume à 2:45.",
      "tower": "3:21 : la tour de sauvetage est larguée.",
      "pogo": "À 5:30 le moteur central du deuxième étage s’arrête de lui-même, 132 secondes trop tôt, après que l’étage a commencé à vibrer trop fort. Les quatre autres brûlent 34 secondes de plus pour compenser.",
      "siicut": "9:53 : le deuxième étage s’éteint et se détache ; le S-IVB s’allume.",
      "parking": "12:30 : orbite de parking, 190 sur 185 km d’altitude. Suivent deux heures et demie de vérifications.",
      "tli": "2:35:46 : le S-IVB se rallume pendant 5 min 51 s et envoie l’engin vers la Lune à près de 11 km/s.",
      "sep": "3:06:39 : Odyssey se sépare du S-IVB, se retourne et s’amarre à Aquarius à 3:19:09. Les quatre panneaux de l’adaptateur se détachent.",
      "extract": "4:01 : Odyssey tire Aquarius hors de l’étage épuisé, qui est abandonné.",
      "coast": "Deux jours jusqu’à la Lune, dessinés à quelque 9 000 fois la vitesse réelle. L’engin mesure 11 mètres : c’est un point.",
      "tv": "55:53:20 : le centre de contrôle demande un brassage de routine des réservoirs d’oxygène. Une émission de télévision s’est achevée il y a quelques minutes ; l’équipage range.",
      "bang": "55:54:53, 03:07 UTC le 14 avril : une détonation. Le réservoir d’oxygène 2 a éclaté et arraché le panneau extérieur de la baie 4 du module de service. La trajectoire du panneau est dessinée, pas mesuré.",
      "problem": "55:55:20 : « Okay, Houston, we’ve had a problem here. » Jack Swigert ; l’enregistrement de la NASA, diffusé tel qu’il a été consigné.",
      "problem2": "55:55:42 : « Houston, we’ve had a problem. » James Lovell ; l’enregistrement de la NASA.",
      "barber": "En quelques minutes l’oxygène du réservoir 1 s’échappe aussi. Les piles à combustible produisent l’électricité et l’eau de l’engin à partir de cet oxygène, et elles défaillent.",
      "lifeboat": "Aquarius devient le canot de sauvetage : conçu pour garder deux hommes en vie pendant deux jours, il doit en garder trois en vie pendant quatre. Odyssey est éteint pour garder ses batteries pour la rentrée.",
      "mcc2": "61:29:43 : le moteur de descente du module lunaire brûle 34 s, 11,5 m/s, pour placer l’engin sur une trajectoire qui revient vers la Terre. La trajectoire dessinée ne s’infléchit pas pour autant.",
      "impact": "77:56:40 : le S-IVB épuisé, envoyé devant, heurte la Lune à 2,4 S 27,9 O, et le sismomètre d’Apollo 12 l’enregistre (non dessiné).",
      "farside": "Vers 77:28, derrière la Lune et sans contact radio : la face cachée, 254 km plus bas.",
      "closest": "Plus proche passage, à 254 km au-dessus de la face cachée. À quelque 400 000 km de la Terre : plus loin qu’aucun être humain n’était jamais allé.",
      "tei": "79:27:39, deux heures après la Lune : le moteur de descente brûle 4 min 24 s, 262 m/s, pour avancer l’arrivée de 152 heures à 143 et la ramener dans le Pacifique.",
      "home": "Trois jours pour rentrer, dans le froid, à court d’eau, l’engin réduit au minimum d’énergie.",
      "mcc3": "105:18 : le moteur de descente brûle 14 s à 10 pour cent, 2,4 m/s, pour rendre la rentrée un peu plus raide.",
      "mcc4": "137:39:52 : une dernière correction de 0,9 m/s, faite par les petits propulseurs du module lunaire (non dessinée).",
      "smsep": "138:01:48, 4 heures 39 minutes avant la rentrée : le module de service est coupé. Son panneau manque depuis 82 heures.",
      "photo": "L’équipage photographie le module qui s’éloigne : un panneau entier manque et l’isolant déchiré ressort. La baie est dessinée d’après AS13-59-8500 ; les dégâts à une antenne parabolique ne le sont pas.",
      "undock": "141:30 : Aquarius, qui a gardé trois hommes en vie pendant quelque 83 heures, est largué avec la pression du tunnel d’amarrage. Le module de commande est seul.",
      "entry": "142:40:46, interface de rentrée, à 122 km d’altitude et 11 km/s. Le premier pic est d’environ 5 g.",
      "drogue": "Vers 142:48 : deux parachutes stabilisateurs, puis trois principaux.",
      "mains": "Trois parachutes principaux ralentissent la capsule à quelque 9 m/s.",
      "splash": "142:54:41, 18:07 UTC le 17 avril : amerrissage dans le Pacifique Sud, en vue de l’USS Iwo Jima. Les trois hommes sont à bord en moins de 45 minutes.",
      "pathAscent": "les heures des événements du rapport de mission, hauteurs et distances intermédiaires approximatives",
      "pathTrip": "les états et les heures du rapport de mission, une trajectoire intégrée avec un ajustement de la vitesse d’injection et un arc de Lambert pour le retour ; pas des données de suivi",
      "pathLm": "amarré à Odyssey jusqu’à 141:30 ; la dérive après le désamarrage est illustrative",
      "pathSm": "illustratif : la vitesse de dérive du module de service épuisé est la nôtre",
      "srcReport": "Rapport de mission d’Apollo 13, NASA MSC-02680, 1971 (heures des événements, états, rentrée)",
      "srcJournal": "Journal de vol d’Apollo 13, NASA (la radio, à la seconde)",
      "srcClip": "Les deux phrases radio : enregistrement de la NASA, domaine public, de Wikimedia Commons",
      "srcPhoto": "La baie 4 du module de service : photographie NASA AS13-59-8500, domaine public, de Wikimedia Commons"
    },
    "sputnik-1": {
      "title": "Sputnik 1 : le premier satellite",
      "blurb": "Baïkonour, 4 octobre 1957 : le premier satellite artificiel, une sphère polie de 585 mm, de la rampe à son premier tour de la Terre, avec son bip.",
      "chPad": "Site 1",
      "chAscent": "Décollage",
      "chBoosters": "Les propulseurs d’appoint",
      "chCore": "L’étage central",
      "chSep": "PS-1 est largué",
      "chOrbit": "Un tour",
      "ready": "T−10 s au site 1, Baïkonour : la fusée 8K71PS et, sous sa coiffe, une sphère de 585 mm. 19:28:34 UTC le 4 octobre 1957, déjà le 5 octobre sur le site de lancement. La lampe du pas de tir est de notre fait : le pas de tir était dans le noir, et la fusée est éclairée pour qu’on la voie.",
      "liftoff": "Décollage. L’étage central et les quatre propulseurs d’appoint du R-7 brûlent ensemble ; la fusée militaire a été débarrassée de son ogive pour l’occasion.",
      "regulator": "Vers 16 s un régulateur de carburant tombe en panne : l’étage central brûle le kérosène trop vite et sa poussée reste 4 pour cent trop forte presque tout le vol. La mission y survit.",
      "boosters": "T+116 s : les quatre propulseurs d’appoint se détachent, comme le montre la télémétrie. L’étage central continue seul.",
      "core": "T+295,4 s : l’étage central s’éteint, à 223 km d’altitude et quelque 7,8 km/s, une seconde plus tôt que prévu, quand un capteur voit la pompe à kérosène vide s’emballer.",
      "sep": "T+315,3 s, 19,9 s après l’extinction : PS-1 est largué. La coiffe se détache, les quatre antennes se déploient (non animées ici) et l’émetteur démarre.",
      "beep": "Les premiers bips sont entendus à la station de suivi IP-1 pendant deux minutes, jusqu’à ce que le satellite passe sous l’horizon. Le son est l’enregistrement du signal par la NASA.",
      "shadow": "Le lancement a eu lieu juste après minuit sur le site, et pendant ses 13 premières minutes PS-1 vole dans l’ombre de la Terre, il est donc dessiné sombre. Il entre en plein soleil vers T+13 min.",
      "orbit": "Orbite : 223 sur 950 km, 65,1 degrés, 96,2 minutes par tour. L’étage central le suit (non dessiné).",
      "lap": "Un tour dans cette rediffusion. Les batteries se sont épuisées le 26 octobre, après 326 orbites ; la sphère est retombée le 4 janvier 1958, après environ 1 440.",
      "pathAscent": "les heures publiées des événements, hauteurs et distances intermédiaires approximatives",
      "pathOrbit": "l’orbite publiée en conique depuis la fin du lancement, un tour ; la culbute du satellite n’est pas dessinée",
      "srcWiki": "Sputnik 1, Wikipédia (heures des événements, orbite, dimensions), d’après la NASA, le NSSDC et les sources russes qu’elle cite",
      "srcNssdc": "Sputnik 1, catalogue maître NSSDCA de la NASA (lancement et orbite)",
      "srcClip": "Le bip : enregistrement de la NASA, domaine public, de Wikimedia Commons"
    },
    // 1.7.2: Voskhod 2 and STS-1 drafted in French (public #527), Spanish (#525) and Portuguese Brazil (#526). Machine-drafted like the rest of this file.
    "voskhod-2": {
      "title": "Voskhod 2 : la première sortie dans l’espace",
      "blurb": "Baïkonour, 18 mars 1965 : Alexeï Leonov quitte le vaisseau par un sas gonflable pendant 12 minutes et, un jour plus tard, l’équipage se pose à la main dans la taïga, à 386 km de l’endroit prévu.",
      "chPad": "Site 1",
      "chAscent": "Décollage",
      "chOrbit": "Orbite",
      "chEva": "Le sas et la sortie",
      "chBack": "Le retour à bord",
      "chFail": "L’atterrissage automatique échoue",
      "chRetro": "Rétrofreinage à la main",
      "chEntry": "Rentrée",
      "chLand": "La taïga",
      "ready": "T−10 s au site 1, Baïkonour : la fusée Voskhod et, sous sa coiffe, la Voskhod 3KD avec Pavel Belyayev et Alexeï Leonov. 07:00:00 UTC le 18 mars 1965. La fusée dessinée est celle de la Vostok-K ; la vraie avait un troisième étage différent.",
      "liftoff": "Décollage. Comme sur Voskhod 1, il n’y a aucun moyen d’abandonner pendant les premières minutes, jusqu’à ce que la coiffe parte.",
      "boosters": "T+119 s : les quatre blocs latéraux se détachent.",
      "shroud": "Vers T+2,5 minutes : la coiffe est éjectée et le vaisseau apparaît pour la première fois, avec le sas Volga replié contre sa sphère.",
      "core": "T+301 s : l’étage central est libéré et le troisième étage, le Blok I, prend le relais pour encore 240 secondes.",
      "orbit": "Orbite : 167 sur 475 km, 64,8 degrés, 90,9 minutes par tour. Une sphère Vostok, une rétrofusée de réserve au-dessus, et deux sièges d’équipage là où Vostok avait un siège éjectable.",
      "volga": "Belyayev gonfle le sas Volga : une quarantaine de tubes d’air rigidifient un tube de tissu de 2,5 m de long et 1,2 m de large en environ sept minutes. L’instant où il l’a fait est le nôtre ; il est dessiné déjà déployé, pas en train de gonfler.",
      "depress": "08:28:13 UTC : Leonov, dans la combinaison Berkut et son sac à dos blanc, dépressurise le sas. L’électronique du vaisseau était refroidie par son air, c’est pourquoi un sas était nécessaire.",
      "hatch": "08:32:54 : l’écoutille extérieure du sas est ouverte.",
      "out": "08:34:51 : Leonov quitte le sas, haut au-dessus du centre-nord de l’Afrique, et se pousse jusqu’au bout de son ombilical de 5,35 m. La première personne dans l’espace hors d’un vaisseau.",
      "tether": "Il fixe une caméra sur le rebord du sas et regarde du détroit de Gibraltar à la mer Caspienne. Sa pose ici est lue sur une image du film.",
      "swell": "Sa combinaison s’est gonflée dans le vide : il n’atteint pas le déclencheur de sa caméra de poitrine sur la jambe, et ses gants et ses bottes se sont raidis. Pour rentrer, il devra laisser sortir de l’air de la combinaison.",
      "back": "Il rentre la tête la première, contre la procédure, et se coince de travers dans le tube en tournant pour fermer l’écoutille extérieure. Il laisse la pression de la combinaison descendre sous la limite de sécurité pour pouvoir se plier.",
      "inside": "08:47:00 : de retour dans le sas ; l’écoutille est fermée à 08:48:40. 12 minutes 9 secondes dehors, du centre-nord de l’Afrique à l’est de la Sibérie.",
      "repress": "08:51:54 : le sas est repressurisé. Un peu plus tard Belyayev tire les boulons, et le sas est largué (l’instant est le nôtre).",
      "jettison": "La Volga est larguée et s’éloigne en tournoyant ; le vaisseau ne peut plus s’en servir.",
      "auto": "À la révolution 16 le système d’atterrissage automatique est programmé depuis le sol, mais son ordre « 6 » ne passe pas, apparemment à cause d’une panne du système d’orientation vers le Soleil. La poussée prévue vers maintenant (son horloge est la nôtre, approximative) n’a pas lieu.",
      "manual": "07:16 UTC, 19 mars : Vjezna-3 dit à l’équipage par ondes courtes de couper le système automatique et d’utiliser la descente manuelle. Belyayev a encore une révolution pour se préparer.",
      "late": "Les deux hommes, dans leurs combinaisons, ne peuvent pas regagner leurs sièges une fois que Belyayev a tourné le vaisseau à la main avec le viseur optique Vzor. Le rétrofreinage arrive avec 46 secondes de retard.",
      "retro": "Rétrofreinage à la main avec le moteur KTDU-60. Son heure et son lieu sont les nôtres : c’était environ 45 minutes avant l’atterrissage publié, et les sources ne le disent pas.",
      "wires": "Le module d’instruments ne se sépare pas proprement ; la sphère tourne violemment jusqu’à ce que les câbles brûlent vers 100 km. (Dessiné séparé à la rentrée, un peu tôt.)",
      "entry": "Rentrée. Les 46 secondes portent le vaisseau environ 386 km au-delà de son champ, dans la forêt des hautes terres de la Haute Kama, au nord-est de Perm.",
      "chutes": "Les parachutes. Contrairement à Vostok, personne ne s’éjecte : l’équipage atterrit dans la sphère, avec une fusée à propergol solide qui s’allume à environ un mètre pour amortir l’impact (non dessinée).",
      "landing": "09:02:17 UTC : atterrissage vers 59,57 N 55,47 E, dans la neige profonde de la taïga, à 75 km de Perm.",
      "taiga": "Les pilotes des hélicoptères de recherche ne trouvent le parachute rouge que des heures plus tard. L’équipage passe deux nuits dans la forêt par moins 5 degrés, voire plus froid avant de skier jusqu’à un hélicoptère.",
      "pathAscent": "les heures publiées des événements, hauteurs et distances intermédiaires approximatives",
      "pathOrbit": "l’orbite publiée avec sa dérive d’un jour, le rétrofreinage à une heure et un lieu qui sont les nôtres, et la rentrée et la voilure dessinées entre les deux",
      "srcWiki": "Voskhod 2, Wikipédia (les heures de la sortie dans l’espace, l’orbite, l’atterrissage)",
      "srcRocket": "Voskhod (fusée), Wikipédia (les durées de combustion des trois étages)",
      "srcGrahn": "Sven Grahn, « The Voskhod 2 mission revisited » (l’échec de la descente automatique, l’appel à la manuelle, citant le journal du général Kamanin)",
      "srcNssdc": "Voskhod 2, catalogue maître NSSDCA de la NASA (lancement et orbite)"
    },
    "sts-1": {
      "title": "STS-1 : le premier vol de Columbia",
      "blurb": "Kennedy, 12 avril 1981 : John Young et Robert Crippen emmènent la première navette spatiale du complexe de lancement 39A en orbite et, 54 heures plus tard, la font planer jusqu’au lit de lac asséché d’Edwards.",
      "chPad": "Complexe de lancement 39A",
      "chAscent": "Décollage",
      "chSrb": "Les propulseurs",
      "chMeco": "Moteurs principaux coupés",
      "chOrbit": "Orbite",
      "chHome": "Le chemin du retour",
      "chEntry": "Rentrée",
      "chLand": "Piste 23",
      "ready": "T−10 s au complexe de lancement 39A, centre spatial Kennedy : Columbia, un réservoir externe blanc et deux propulseurs à propergol solide. 12:00:04 UTC le 12 avril 1981, vingt ans jour pour jour après Vostok 1. STS-1 et STS-2 ont volé avec le réservoir peint en blanc.",
      "ignition": "T−6,6 s : les trois moteurs principaux démarrent, et tout l’ensemble bascule vers l’avant, vers les pieds de l’équipage, puis revient.",
      "liftoff": "Décollage : les propulseurs s’allument quand l’ensemble revient à la verticale. Crippen l’a comparé à une catapulte à vapeur. Le pas de tir est dessiné simple et la tranchée de flammes est la nôtre.",
      "roll": "Dégagé de la tour, l’ensemble pivote jusqu’à son cap, 067 degrés, et s’incline tête en bas, l’orbiteur sous le réservoir, pour ménager ses ailes. (Dessiné déjà sur le cap.)",
      "maxq": "T+56 s : Max Q, à Mach 1,06 et 29 kPa. Les moteurs principaux ont été réduits à 65 pour cent pour la traverser.",
      "srb": "T+2 min 12 s : les propulseurs, qui ont mieux fonctionné que prévu, sont largués à 53 km, 2,8 km plus haut que prévu. Ils retombent dans l’Atlantique sous parachutes.",
      "meco": "T+8 min 34 s : extinction des moteurs principaux à 118 km.",
      "tank": "18 secondes plus tard le réservoir externe est largué. Il se brise en vol et retombe dans l’océan Indien.",
      "oms1": "T+10 min 34 s : la première poussée de l’OMS, 86 secondes, avec les deux moteurs dans les nacelles de queue de l’orbiteur (non dessinée : la flamme est presque invisible).",
      "oms2": "T+44 min 2 s : la deuxième poussée, 75 secondes, au sommet de la montée : 246 sur 248 km, 40,3 degrés, 89,9 minutes. L’heure de l’apogée est celle du rapport ; la trajectoire jusqu’à elle est la nôtre.",
      "doors": "Les portes de la soute s’ouvrent pour que les radiateurs fonctionnent, avant la fin de la deuxième orbite, faute de quoi l’équipage aurait dû rentrer. L’heure est la nôtre. À la télévision ils voient des tuiles manquantes sur les nacelles de l’OMS.",
      "oms3": "T+6 h 20 min 46 s et 7 h 05 min 32 s : deux poussées sur un seul moteur portent l’orbite à 274 km. L’équipage passe environ 53 heures en orbite à tester la machine.",
      "wake": "Jour 3 : petit déjeuner, rangement, les combinaisons d’éjection, et les portes de la baie fermées pour la rentrée. Young et Crippen s’attachent. Leur orbite a fait 35 tours.",
      "deorbit": "À la 36ᵉ orbite, au-dessus du sud de l’océan Indien, une poussée de 160 secondes des deux moteurs OMS. Son heure et son lieu sont les nôtres, environ 55 minutes avant le terrain. Young cabre Columbia en attitude de rentrée nez haut.",
      "entry": "Interface de rentrée à 120 km, à quelque 8 110 km du terrain à 28 240 km/h. L’angle d’attaque est de 40 degrés jusqu’à ce que le pire du chauffage soit passé. Cette reconstitution place l’interface au-dessus du Pacifique occidental ; le rapport dit l’oriental.",
      "blackout": "Une lueur rose à 100 km ; les deux hommes baissent leurs visières. Environ 21 minutes sans radio, dont 16 pour l’air ionisé. La plus grande partie de la rentrée est pilotée par les ordinateurs, avec des inversions de roulis à Mach 18,5 et 9,8.",
      "bigsur": "La côte californienne près de Big Sur à Mach 7 et 41 km. Columbia a parcouru 583 km en travers de la trace de son orbite pour rejoindre le terrain, qui est dessiné.",
      "hac": "Young prend les commandes. Après les inversions à Mach 4,8 et 2,8, un large virage à gauche vers la piste 23 du lit de lac, rejoint par un T-38 d’accompagnement. La taille du virage est la nôtre.",
      "touch": "T+54 h 20 min 53 s, 18:20:57 UTC : le train principal touche à 339 km/h, plus lent et environ 800 m plus loin sur la piste que prévu, à Edwards, piste 23. La descente du train est dessinée quelques secondes avant.",
      "stop": "Young : « This is the world’s greatest all-electric flying machine. I’ll tell you that. That was super ! » 36 orbites, 1 729 348 km, 2 jours 6 heures 20 minutes 53 secondes.",
      "pathAscent": "les heures et hauteurs publiées des événements, avec les distances entre elles approximatives",
      "pathOrbit": "les poussées et orbites publiées reliées par des arcs, la poussée de désorbitation, la rentrée et l’approche dessinées entre les deux ; les heures et les lieux que nous avons choisis sont dits dans les légendes",
      "srcWiki": "STS-1, Wikipédia (heures et hauteurs des événements, les orbites, les poussées, la rentrée et l’atterrissage), d’après les documents de mission de la NASA",
      "srcNssdc": "STS-1 Columbia, catalogue maître NSSDCA de la NASA (lancement et atterrissage)"
    },
    "hubble-deployment": {
      "title": "Hubble largué par Discovery",
      "blurb": "STS-31, 25 avril 1990 : le bras sort le télescope spatial Hubble de la soute de Discovery, ses panneaux solaires se déroulent (l’un s’arrête), ses antennes se déploient, et à 19:38 UTC Steven Hawley le lâche.",
      "chBay": "Dans la soute",
      "chLift": "Hors de la soute",
      "chArrays": "Les panneaux",
      "chStop": "L’un s’arrête",
      "chAntennas": "Les antennes",
      "chSwing": "Vers le point de largage",
      "chRelease": "Largage",
      "chAway": "Discovery s’écarte",
      "ready": "Jour de vol 2, 25 avril 1990, à 613 km d’altitude. La soute de Discovery est ouverte et le télescope spatial Hubble, long de 13,2 m, repose dans son logement. La position de la navette au-dessus de la Terre, et toutes les horloges d’ici sauf celle du largage, sont les nôtres : les sources donnent l’heure du largage et presque rien d’autre.",
      "grapple": "L’effecteur terminal du bras referme son collet sur le point de saisie, près d’un des mécanismes d’antenne du télescope. Steven Hawley manœuvre le bras depuis le poste arrière du pont de vol. Les articulations du bras sont dessinées comme un bras à deux segments qui atteint chaque endroit ; ce n’est pas de la télémesure.",
      "umbilical": "Le télescope passe sur sa propre alimentation et celle de la navette est coupée (NASA). Les verrous qui le tenaient dans la soute, deux sur les rebords et un au fond, sont les nôtres dans leur forme et leur heure.",
      "unberth": "Le bras soulève le télescope à la verticale, hors de son logement. L’horloge et la hauteur sont les nôtres.",
      "arrays": "Les panneaux solaires, enroulés sur des tambours et repliés le long du tube pour le lancement, sont écartés sur les côtés. La façon dont ils étaient rangés est dessinée d’après des photographies, non d’après des plans. Ces premiers panneaux, jaune doré, ont été remplacés en 1993.",
      "unroll": "Le premier panneau se déroule le long de ses mâts jusqu’à environ 7 m sur 2,5 m. Le temps que cela a pris est le nôtre.",
      "stop": "Le second panneau sort à moitié et s’arrête. McCandless et Sullivan attendent dans le sas partiellement dépressurisé, au cas où une sortie dans l’espace serait nécessaire pour le libérer. Lequel des panneaux c’était est raconté de deux façons ; celui qui est dessiné, c’est nous qui l’avons choisi.",
      "wait": "Les contrôleurs réessaient sans cesse, et l’orbite entre dans l’ombre de la Terre puis en sort. Le largage, prévu à la 19e orbite, est repoussé d’une orbite. Le temps que cela a pris, et le moment, sont les nôtres.",
      "free": "La dernière tentative depuis le sol réussit et le panneau se déroule jusqu’au bout ; la sortie dans l’espace n’est pas nécessaire. L’heure est la nôtre.",
      "antennas": "Les deux mâts d’antenne à grand gain se déploient, vers le bas et vers l’extérieur, et leurs paraboles sont libres. La façon dont ils étaient repliés, et le moment, sont les nôtres.",
      "swing": "Le bras fait pivoter le télescope jusqu’à la position de largage, au-dessus de la soute. Le trajet est le nôtre.",
      "readyRelease": "Les systèmes de pointage de Hubble sont allumés et testés alors que le bras le tient encore. Chaque système est vérifié avant que le bras le lâche (NASA).",
      "release": "19:38 UTC, 25 avril 1990, 31 heures 4 minutes après le décollage : Hawley ouvre le collet et Hubble est libre. Jonathan’s Space Report donne 19:38 ; America Space dit 15:37 EDT.",
      "away": "Le télescope reste là où on l’a mis et Discovery s’écarte. America Space raconte que sur le pont de vol on a crié pour avoir un appareil photo. Le bras se retire.",
      "pulses": "Discovery fait deux brèves poussées de ses propulseurs pour relever un peu son orbite, de sorte qu’il prend régulièrement du retard. Les heures et la taille des poussées sont les nôtres.",
      "trail": "Discovery reste près de Hubble pendant environ deux jours par précaution (NASA) ; le plan était de le suivre à environ 40 milles marins au cas où la porte de l’ouverture poserait problème.",
      "pathOrbit": "un cercle de 613 km à 28,45 degrés, tel que publié ; l’endroit le long de ce cercle, c’est nous qui l’avons choisi pour qu’il soit au soleil",
      "pathHst": "le télescope depuis le largage, sur l’orbite où il a été lâché",
      "srcNasa": "STS-31, page des archives de la navette spatiale de la NASA (heure de lancement, orbite)",
      "srcKit": "Dossier de presse de STS-31, NASA (le plan de déploiement, les tâches de l’équipage, la 19e orbite, le suivi)",
      "srcJsr": "Jonathan’s Space Report n° 36 (largage à 19:38 UTC, le retard d’une orbite, le panneau qui ne s’ouvrait pas)",
      "srcAmerica": "America Space, « Somebody Get a Camera » (les panneaux, les antennes, les poussées des propulseurs, 15:37 EDT)"
    },
    "falcon9-og2-2": {
      "title": "Le premier atterrissage d’un Falcon 9",
      "blurb": "Cap Canaveral, 21 décembre 2015 : le vol 20 de Falcon 9 emporte 11 satellites ORBCOMM et son premier étage revient sur Landing Zone 1, le premier atterrissage du premier étage d’une fusée orbitale.",
      "chPad": "Complexe de lancement 40",
      "chAscent": "Décollage",
      "chSep": "Extinction et séparation",
      "chReturn": "Le boostback",
      "chEntry": "La descente",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 s, Space Launch Complex 40, Cap Canaveral, 20:29 heure locale le 21 décembre 2015 : un Falcon 9 Full Thrust, haut de 70 m, pour son premier vol, avec 11 satellites ORBCOMM. C’est la nuit ; la fusée est dessinée à la lumière d’une lampe qui est la nôtre. SpaceX appelle l’atterrissage « un objectif d’essai secondaire ».",
      "ignition": "T−3 s : les neuf moteurs Merlin du premier étage démarrent.",
      "liftoff": "Décollage à 01:29:00 UTC le 22 décembre. Le premier étage fait 41 m sur les 70.",
      "mach1": "T+1:05 : Mach 1, d’après la reconstitution de la retransmission.",
      "maxq": "T+1:13 : max Q, le moment où l’air presse le plus fort ; les moteurs ont été réduits pour le passer.",
      "meco": "T+2:23 : extinction des moteurs principaux à 75 km et 1,67 km/s (la reconstitution de la retransmission ; SpaceX avait prévu T+2:20).",
      "sep": "T+2:25 : les étages se séparent. Le premier étage se retourne queue en avant grâce à ses propulseurs à gaz froid, ce qui est dessiné sur une demi-minute ; le temps que cela a pris est le nôtre.",
      "s2": "T+2:34 : le moteur à vide du deuxième étage s’allume et l’étage s’éloigne. Sa trajectoire n’est dessinée que sur un petit bout, et elle est la nôtre.",
      "fairing": "T+2:48 : les deux moitiés de la coiffe, larges de 5,2 m, sont larguées.",
      "boostback": "T+3:47 : trois moteurs du premier étage s’allument pour la poussée de boostback, qui retourne sa trajectoire vers le Cap. Leur durée est la nôtre : environ 35 secondes dans ce dessin.",
      "fins": "Les quatre ailerons en grille se déploient pour diriger l’étage dans l’air. Le moment est le nôtre.",
      "coast": "L’étage poursuit sa course au sommet, à environ 190 km d’altitude dans ce dessin (le nôtre), et commence à redescendre.",
      "entry": "T+8:01 : trois moteurs se rallument pour la poussée d’entrée, qui ralentit l’étage avant l’air dense.",
      "entryEnd": "T+8:21 : la poussée d’entrée est terminée. En chute dans l’air, l’étage se dirige avec ses ailerons.",
      "landingBurn": "T+9:11 : un moteur s’allume pour la poussée d’atterrissage, qui doit arrêter l’étage sur la plateforme. Elle dure 33 secondes.",
      "legs": "Les quatre jambes d’atterrissage, repliées le long du flanc pendant le vol, se déploient vers le bas quelques secondes avant le contact. Le moment est le nôtre.",
      "touch": "T+9:44, 01:38:44 UTC : le premier étage se tient sur Landing Zone 1, une plateforme ronde de 86 m de large marquée d’une croix, à quelque 9 km au sud de la rampe qu’il a quittée. Aucun premier étage de fusée orbitale ne s’était posé auparavant.",
      "sats": "Pendant ce temps, le deuxième étage déploie les 11 satellites, de T+14:26 à T+19:05 (non dessiné), puis rallume son moteur pour montrer qu’il en est capable, en vue d’un vol futur.",
      "pathAscent": "les heures d’événements publiées, ainsi que l’altitude et la vitesse publiées à l’extinction des moteurs principaux, la montée entre les deux étant la nôtre ; la fusée a volé dans le noir et est dessinée éclairée par une lampe",
      "pathBooster": "les heures de poussée publiées et le lieu d’atterrissage, l’arc, ses vitesses et la durée du boostback étant calculés par nous comme un point matériel ; dessiné éclairé par une lampe",
      "pathStage2": "le deuxième étage depuis la séparation, poussé par nous dans la direction qu’il suivait ; il s’arrête là où s’arrête l’image",
      "srcKit": "SpaceX, dossier de presse de la mission ORBCOMM-2, 21 décembre 2015 (le plan : les heures, les poussées, l’atterrissage comme objectif d’essai secondaire)",
      "srcRecon": "Spaceflight101, « Reconstruction : Milestone Falcon 9 Flight with eleven OG2 Satellites » (les heures d’événements d’après la retransmission, MECO à 75 km et 1,67 km/s)",
      "srcWiki": "Falcon 9 flight 20, Wikipedia (l’heure de lancement, la charge utile, le rallumage du deuxième étage)",
      "srcLz": "Landing Zones 1 and 2, Wikipedia (le lieu, et les plateformes de 282 ft marquées d’un X)"
    }
  }
});

// 1.6.3 (internal #995): the sections and strings this file did not have yet (r13Deep, compare, passportKinds, photoCompare, entrances,
// the 1.5 strings and the gaps in card, drawing, cls, templates and the rest), fr. Machine-drafted like the rest of this file (docs/TRANSLATING.md):
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
        "iauName": "Nom approuvé par l’UAI",
        "onBody": "Sur",
        "whenSite": "Quand"
      }
    },
    "drawing": {
      "markOnly": "une marque à son emplacement ; rien n’y est à dessiner",
      "noPlace": "non dessiné : on ne peut pas marquer d’endroit pour lui",
      "shower": "un nom au point d’où semblent venir ses météores, dans la vue du ciel près de son pic ; une direction, pas un endroit de l’espace"
    },
    "klass": {
      "shower": "Pluie d’étoiles filantes"
    },
    "cls": {
      "shower": "une direction dans le ciel : la médiane des solutions publiées par l’UAI pour cette pluie",
      "noPlace": "aucun endroit n’est dessiné pour lui : le corps sur lequel il se trouve n’est pas un monde de cette appli",
      "approxPlace": "placé d’après des coordonnées publiées, à environ {n} degrés près"
    },
    "unplaced": {
      "noDistanceRow": "Non mesurée : le catalogue n’a pas de parallaxe pour elle",
      "iauApproved": "{name}, approuvé le {date}"
    },
    "starSystem": {
      "auYearComputed": "{n} UA ; son année, environ {y} ans, est calculée à partir de cela et de la masse de son étoile"
    },
    "searchRows": {
      "kinds": {
        "galaxy": "Galaxie",
        "cluster": "Amas de galaxies",
        "browndwarf": "Naine brune",
        "whitedwarf": "Naine blanche"
      }
    },
    "templates": {
      "exotic": {
        "kinds": {
          "galaxy": "galaxie",
          "cluster": "amas de galaxies",
          "browndwarf": "naine brune",
          "whitedwarf": "naine blanche"
        },
        "leadGalaxy": "{name} est une galaxie à {dist} années-lumière, là où elle est maintenant",
        "leadCluster": "{name} est un amas de galaxies à {dist} années-lumière, là où il est maintenant",
        "leadBrowndwarf": "{name} est une naine brune à {dist} années-lumière",
        "leadWhitedwarf": "{name} est une naine blanche à {dist} années-lumière"
      },
      "site": {
        "mpc": "son code au Minor Planet Center est {code}",
        "closed": "fermé en {year}",
        "kinds": {
          "launch-site": "site de lancement",
          "landing-site": "site d’atterrissage"
        }
      },
      "shower": {
        "lead": "{name} est une pluie d’étoiles filantes",
        "peak": "avec un pic vers le {date}",
        "speed": "avec des météores qui frappent l’air à {n} km par seconde",
        "parent": "issue de la poussière de {parent}"
      }
    },
    "a45": {
      "farNote": "à quelle distance il est maintenant ({how}), d’après son décalage vers le rouge de {z} dans la cosmologie de Planck 2018",
      "comoving": "distance comobile",
      "pulsarDistance": [
        "d’après la parallaxe du pulsar lui-même",
        "la distance de l’amas globulaire, du rémanent de supernova ou de l’autre objet auquel il appartient",
        "l’estimation d’un modèle à partir du signal radio (le modèle YMW16 des électrons libres de la Galaxie), pas une mesure : elle peut être très fausse"
      ],
      "shape": {
        "galaxy": "une marque à la distance que donne son décalage vers le rouge ; une galaxie aussi lointaine fait au plus quelques pixels, donc sa forme n’est pas dessinée",
        "browndwarf": "un anneau à sa distance mesurée ; une naine brune est un point à cette échelle et ne donne presque aucune lumière visible",
        "whitedwarf": "un anneau à sa distance mesurée ; la naine blanche elle-même est un point à cette échelle",
        "cluster": "une marque au centre de l’amas en rayons X ; les galaxies membres ne sont dessinées que pour Virgo, Coma, Fornax et Perseus (l’étape du Groupe local)"
      },
      "quasarZ7": "Un quasar vu tel qu’il était environ {age} millions d’années après le Big Bang : l’un des {n} connus au-delà du décalage vers le rouge 7.",
      "unplaced": {
        "unnamed": "Étoile HYG {id}",
        "lead": "{name} est une étoile dans la direction où tu regardes ; personne n’a mesuré à quelle distance elle est",
        "leadColour": "{name} est {a} étoile {colour} dans la direction où tu regardes ; personne n’a mesuré à quelle distance elle est",
        "note": "Dessinée dans le ciel et nulle part dans l’espace, car un endroit a besoin d’une distance.",
        "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0) : direction et magnitude seulement"
      }
    },
    "r13Deep": {
      "card": {
        "dso-tarantula-nebula": "Sa lumière près de notre ligne de visée est la photographie de Webb ; son gaz est un modèle d’une cavité autour de l’amas R136, dans une coque de gaz brillant retenue par des nuages moléculaires, d’après Pellegrini, Baldwin et Ferland (2011). Pas encore relu par un astronome.",
        "dso-m43": "Sa lumière vient de la photographie de l’ESO, sa forme est reconstituée comme un creux plus petit dans le même nuage sombre que la nébuleuse d’Orion, éclairé par l’étoile NU Orionis. Pas encore relu par un astronome.",
        "dso-m51": "Construite d’après son inclinaison et sa structure publiées : une spirale à deux bras vue presque de face, sa compagne NGC 5195 derrière le bout de son bras nord, et le bras qui l’atteint ; les profondeurs sont un modèle. Pas encore relu par un astronome.",
        "dso-m81": "Construite d’après son inclinaison et sa structure publiées : un grand bulbe ancien et deux bras très serrés avec de la poussière sur leur bord intérieur. Pas encore relu par un astronome.",
        "dso-m101": "Construite d’après son inclinaison et sa structure publiées : un grand disque vu presque de face, de nombreux bras et ses régions géantes de formation d’étoiles là où le ciel les met. Pas encore relu par un astronome.",
        "dso-m104": "Construite d’après son inclinaison et sa structure publiées : un énorme bulbe rond et un disque mince vu presque par la tranche, avec son anneau de poussière devant. Pas encore relu par un astronome.",
        "dso-antennae-galaxies": "Deux galaxies en collision là où le ciel les met, et leurs deux queues de marée ; la distance de chaque partie, devant ou derrière, est un modèle d’après les simulations de la collision. Pas encore relu par un astronome.",
        "dso-m83": "Construite d’après son inclinaison et sa structure publiées : une spirale barrée vue presque de face, avec des bras riches en jeunes étoiles et en hydrogène brillant. Pas encore relu par un astronome.",
        "dso-ngc-1300": "Construite d’après sa structure publiée : une longue barre avec des bandes de poussière sur ses bords avant et deux bras qui partent de ses extrémités, leur forme ajustée à la photographie de Hubble. Pas encore relu par un astronome.",
        "dso-centaurus-a": "Construite d’après des chiffres publiés : une galaxie elliptique géante traversée par un disque gauchi de poussière et de jeunes étoiles, d’après un modèle ajusté sur les images de Spitzer ; ses deux jets sont dessinés en fausses couleurs, car ils brillent en rayons X et en ondes radio, pas en lumière visible. Pas encore relu par un astronome."
      }
    },
    "compare": {
      "row": "Comparer",
      "hint": "à l’échelle",
      "missing": "—",
      "none": "Aucune",
      "yes": "Oui",
      "no": "Non",
      "range": "{a} à {b}",
      "numUnit": "{num} {unit}",
      "modeLabel": "Vue",
      "modes": {
        "pair": "Côte à côte",
        "lab": "Tous les mondes"
      },
      "withLabel": "Comparer avec",
      "scaleLabel": "Échelle",
      "scales": {
        "true": "À l’échelle",
        "same": "Même largeur"
      },
      "propLabel": "Classer tous les mondes par",
      "props": {
        "across": "Largeur",
        "mass": "Masse",
        "gravity": "Gravité",
        "temp": "Température",
        "spin": "Durée d’un tour",
        "year": "Durée d’une année",
        "dist": "Distance au Soleil",
        "moons": "Nombre de lunes"
      },
      "names": {
        "sun": "Le Soleil",
        "mercury": "Mercure",
        "venus": "Vénus",
        "earth": "Terre",
        "moon": "La Lune",
        "mars": "Mars",
        "jupiter": "Jupiter",
        "saturn": "Saturne",
        "uranus": "Uranus",
        "neptune": "Neptune",
        "pluto": "Pluton"
      },
      "the": {
        "sun": "le Soleil",
        "moon": "la Lune"
      },
      "wider": "{big} est {n} fois plus large que {small}.",
      "same": "{a} et {b} ont à peu près la même largeur.",
      "figure": "{a} et {b}, dessinés {how}.",
      "figureTrue": "à une seule échelle",
      "figureSame": "à la même largeur, pas à l’échelle",
      "tableLabel": "{a} à côté de {b}",
      "rows": {
        "across": "Diamètre",
        "mass": "Masse",
        "gravity": "Gravité",
        "temp": "Température",
        "spin": "Un tour dure",
        "year": "Une année là-bas",
        "dist": "Depuis le Soleil",
        "air": "Atmosphère",
        "pressure": "Pression de l’air",
        "moons": "Lunes",
        "rings": "Anneaux"
      },
      "units": {
        "km": "km",
        "earthOne": "Terre",
        "earths": "Terres",
        "g": "m/s²",
        "c": "°C",
        "hours": "heures",
        "days": "jours",
        "years": "ans",
        "au": "UA",
        "bar": "bar",
        "microbar": "µbar"
      },
      "notes": {
        "average": "moyenne",
        "flattened": "en moyenne ; il est aplati",
        "range": "sa plage",
        "bar1": "au niveau de 1 bar",
        "edge": "au bord visible",
        "photosphere": "la surface visible",
        "retro": "tourne à l’envers",
        "sunSpin": "à 16° de latitude",
        "withEarth": "avec la Terre",
        "exosphere": "une mince exosphère",
        "photosphereAir": "dans la photosphère"
      },
      "air": {
        "part": "{share} % {gas}",
        "join": ", ",
        "almostNone": "Presque aucune",
        "noSurface": "Pas de surface"
      },
      "gas": {
        "hydrogen": "hydrogène",
        "helium": "hélium",
        "methane": "méthane",
        "nitrogen": "azote",
        "oxygen": "oxygène",
        "argon": "argon",
        "carbon dioxide": "dioxyde de carbone"
      },
      "source": "Fiches de données planétaires de la NASA, lues le {date}.",
      "giantNote": "Un géant n’a pas de surface : sa gravité et sa température sont celles du niveau de 1 bar.",
      "moonsNote": "Le nombre de lunes augmente à mesure que de nouvelles sont confirmées.",
      "spinNote": "La rotation du Soleil est la valeur de la fiche à 16° de latitude.",
      "drawnTrue": "Dessinés à une seule échelle d’après le rayon moyen de chacun, pas des photographies.",
      "drawnSame": "Même largeur, donc pas à l’échelle. Les anneaux gardent leur part de cette largeur.",
      "tiny": "{name} fait moins d’un pixel ici et est dessiné comme un point.",
      "ringsDrawn": "Les anneaux sont inclinés pour l’image ; leurs rayons sont ceux de la NASA.",
      "labLog": "Les barres sont logarithmiques, pour que les petites valeurs restent visibles.",
      "labLinear": "Les barres sont proportionnelles au nombre.",
      "labTitle": "Comparer avec {name}",
      "thisCard": "Le monde de cette fiche"
    },
    "passportKinds": {
      "kindsTitle": "Ouverts, par genre",
      "noKinds": "Rien à compter par genre pour l’instant.",
      "kinds": {
        "worlds": "Planètes, lunes et le Soleil",
        "stations": "Stations spatiales",
        "satellites": "Satellites et leurs fusées",
        "spacecraft": "Sondes et télescopes spatiaux",
        "small": "Comètes et astéroïdes",
        "stars": "Étoiles",
        "exoplanets": "Planètes d’autres étoiles",
        "deep": "Nébuleuses, galaxies et ciel profond",
        "earth": "Lieux et météo sur Terre"
      },
      "notedTitle": "Notés",
      "noNoted": "Rien de noté pour l’instant. Ouvre un lieu sur la carte.",
      "notedFine": "Le jour où l’on a vu pour la première fois qu’une note tenait dans ce navigateur. Gardé ici, jamais classé ni envoyé.",
      "noted": {
        "first": {
          "name": "Un premier lieu",
          "said": "Tu as ouvert un lieu sur la carte."
        },
        "planets": {
          "name": "Les huit planètes",
          "said": "Tu as ouvert toutes les planètes, de Mercure à Neptune."
        },
        "station": {
          "name": "Une station spatiale",
          "said": "Tu as ouvert une station en orbite."
        },
        "craft": {
          "name": "Un engin là-haut",
          "said": "Tu as ouvert une sonde ou un télescope spatial."
        },
        "small": {
          "name": "Une comète ou un astéroïde",
          "said": "Tu as ouvert un petit corps du système solaire."
        },
        "star": {
          "name": "Une étoile",
          "said": "Tu as ouvert une étoile au-delà du Soleil."
        },
        "exoplanet": {
          "name": "La planète d’une autre étoile",
          "said": "Tu as ouvert une planète qui tourne autour d’une autre étoile."
        },
        "deep": {
          "name": "Le ciel profond",
          "said": "Tu as ouvert une nébuleuse, une galaxie ou un amas."
        },
        "trip": {
          "name": "Un voyage jusqu’au bout",
          "said": "Tu as terminé un voyage guidé."
        },
        "eyes": {
          "name": "Vu de tes propres yeux",
          "said": "Tu as coché quelque chose comme vu."
        },
        "every": {
          "name": "Un de chaque genre",
          "said": "Tu as ouvert au moins une chose de chaque genre ci-dessus."
        }
      }
    },
    "photoCompare": {
      "title": "Comparer avec la photographie",
      "reconstruction": "Reconstitution",
      "photograph": "Photographie",
      "valueText": "{n} % photographie",
      "flying": "En route vers l’endroit d’où la photographie a été prise.",
      "note": "La carte dessine un modèle 3D. La photographie n’apparaît qu’ici : à plat et face au Soleil, donc si tu te détournes, elle s’efface."
    },
    "entrances": {
      "label": "Trois façons d’entrer",
      "tonight": "Ce soir",
      "tonightTitle": "Ce qui passe au-dessus de toi ce soir, depuis ton lieu",
      "explore": "Explorer",
      "exploreTitle": "Parcourir toute la carte",
      "trip": "Voyage guidé",
      "tripTitle": "Lance le premier voyage guidé de la liste"
    }
  });
}
// 1.6.3: end

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "Taille et distance",
    "size": "Taille",
    "sizeTrue": "réelle",
    "sizeValue": "×{n}",
    "sizeTitle": "De combien les mondes sont dessinés plus grands que nature, de réelle à ×{max}",
    "dist": "Distance",
    "distTrue": "réelle",
    "distLog": "logarithmique",
    "distSome": "{p} % du chemin vers logarithmique",
    "distTitle": "À quel point les distances au Soleil sont resserrées, de réelles à logarithmiques. Les directions restent mesurées.",
    "presets": "Vues toutes prêtes",
    "presetTrue": "Échelle réelle",
    "presetTrueTitle": "Chaque monde à sa taille réelle et à sa distance réelle",
    "presetClass": "En classe",
    "presetClassTitle": "Mondes ×{n} et distances logarithmiques, comme un planétaire",
    "held": "Un voyage dessine tout à l’échelle réelle. Les curseurs reviennent quand il se termine.",
    "note": "La position de chaque monde dans le ciel est toujours mesurée. Le badge indique de combien il est dessiné plus grand.",
    "noteSize": "{name} : taille dessinée ×{n} par rapport à la réalité (curseur Taille).",
    "noteDist": "Distance dessinée au Soleil : {drawn} UA, pour {au} UA en réalité, dans sa vraie direction (curseur Distance).",
    "noteMoon": "Écart avec {parent} : dessiné {n} fois plus grand qu’en réalité, dans sa vraie direction, pour rester hors de la planète agrandie.",
    "noteSun": "Le Soleil est dessiné ×{n} plus grand qu’en réalité, par le curseur Taille, et tenu à l’écart de Mercure.",
    "badgeSun": "Soleil ×{n}",
    "badgeLog": "distances log.",
    "badgeSome": "distances à {p} % du log.",
    "badgeJoin": " · ",
    "badgeTitle": "Les curseurs Taille et Distance de l’onglet Planètes dessinent cette vue."
  },
  "cutaway": {
    "button": "Voir l’intérieur",
    "buttonTitle": "Ouvrir {name} jusqu’à ses couches, aux profondeurs que donnent les mesures",
    "title": "Intérieur : {name}",
    "close": "Fermer la coupe",
    "model": "Couches d’après {model}.",
    "source": "Source",
    "layers": "Couches, de la surface vers le bas",
    "depthRange": "{top}–{bottom} km",
    "toCentre": "{top} km jusqu’au centre",
    "cls": {
      "measured": "mesuré",
      "modelled": "modélisé",
      "inferred": "déduit"
    },
    "clsTitle": "{cls} : {source}",
    "probe": "Profondeur",
    "probeTitle": "Glisse de la surface jusqu’au centre",
    "depth": "{km} km de profondeur",
    "atCentre": "le centre",
    "layer": "Couche",
    "pressure": "Pression",
    "temperature": "Température",
    "density": "Densité",
    "valueCls": "{value} ({cls})",
    "note": "Les profondeurs sont celles des sources ; les couleurs sont choisies. Entre le haut et le bas d’une couche, la sonde donne une valeur intermédiaire.",
    "unknown": "Il n’y a pas encore de coupe de ce monde.",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} millions de GPa",
      "k": "{n} K",
      "millionK": "{n} millions de K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "Croûte",
      "mantle": "Manteau",
      "upper-mantle": "Manteau supérieur",
      "lower-mantle": "Manteau inférieur",
      "outer-core": "Noyau externe liquide",
      "inner-core": "Noyau interne solide",
      "liquid-core": "Noyau liquide",
      "iron-core": "Noyau de fer",
      "molten-silicate": "Couche de roche fondue",
      "partial-melt": "Couche partiellement fondue",
      "ice-shell": "Carapace de glace",
      "ocean": "Océan",
      "hp-ice": "Glace haute pression",
      "rock-mantle": "Manteau rocheux",
      "rock-core": "Noyau rocheux",
      "hydrated-core": "Noyau de roche et de glace",
      "molecular": "Hydrogène et hélium",
      "metallic": "Hydrogène métallique",
      "dilute-core": "Noyau dilué",
      "ice-mantle": "Eau, ammoniac et méthane",
      "convective": "Zone convective",
      "radiative": "Zone radiative",
      "solar-core": "Cœur"
    }
  },
  "helio": {
    "chip": "Héliosphère · modélisée",
    "chipTitle": "D’où vient le dessin de la bulle autour du Système solaire",
    "legendTitle": "L’héliosphère",
    "rowTs": "Choc terminal, là où le vent solaire ralentit sous la vitesse du son. Forme modélisée passant par les deux traversées : Voyager 1 à {a} UA, Voyager 2 à {b} UA (mesurées).",
    "rowHp": "Héliopause, là où le vent du Soleil rencontre le gaz interstellaire. Forme modélisée (Parker 1961) passant par les traversées : Voyager 1 à {a} UA, Voyager 2 à {b} UA (mesurées).",
    "rowBow": "Vague d’étrave, là où le gaz interstellaire s’entasse devant. Dessin illustratif : deux fois la distance de l’héliopause (McComas et al. 2012).",
    "rowRibbon": "Ruban d’IBEX, une bande brillante qu’IBEX a mesurée sur le ciel (Funsten et al. 2013). Sa distance n’est pas mesurée : il est dessiné à {au} UA.",
    "rowMotion": "Le chemin du Soleil à travers le gaz interstellaire local, {v} km/s (IBEX, McComas et al. 2015). La flèche représente {years} ans de ce chemin, {au} UA.",
    "sources": "Lieux des traversées d’après les trajectoires des Voyager dans JPL Horizons, aux dates de traversée de la NASA. Formes : Parker 1961, Wilkin 1996, d’après Izmodenov & Alexashov 2015 et Opher et al. 2015.",
    "crossing": "{craft} : {surface}, {au} UA, {date}",
    "motion": "Le chemin du Soleil, {v} km/s",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "choc terminal",
      "hp": "héliopause"
    },
    "surfaceLabel": {
      "ts": "Choc terminal (modélisé)",
      "hp": "Héliopause (modélisée)",
      "bow": "Vague d’étrave (illustrative)",
      "ribbon": "Ruban d’IBEX (mesuré sur le ciel)"
    },
    "date": "{d} {m} {y}",
    "months": [
      "janv.",
      "févr.",
      "mars",
      "avr.",
      "mai",
      "juin",
      "juil.",
      "août",
      "sept.",
      "oct.",
      "nov.",
      "déc."
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "Un trajet autour de quelque chose, retenu par la gravité. Va assez vite sur le côté, et tu continues de tomber à côté de la Terre au lieu de tomber dessus.",
  "low Earth orbit": "La couche très fréquentée d’environ 200 à 2 000 km d’altitude. La station, la plupart des satellites et la plupart des débris sont ici.",
  "geostationary": "Une orbite à 35 786 km d’altitude où un tour dure aussi longtemps qu’un tour de la Terre sur elle-même, 23 heures 56 minutes. Le satellite semble donc suspendu au-dessus d’un seul point.",
  "polar orbit": "Une orbite qui passe au-dessus des pôles. La Terre tourne dessous, donc le satellite finit par voir chaque partie de sa surface.",
  "elements": "Six nombres et une date qui décrivent une orbite. Donne-les aux bonnes mathématiques et tu obtiens une position.",
  "epoch": "Le moment où un jeu d’éléments orbitaux était exact. Plus on s’en éloigne, moins la réponse est précise.",
  "apogee": "Le point haut d’une orbite autour de la Terre.",
  "perigee": "Le point bas d’une orbite autour de la Terre.",
  "perihelion": "Le point où quelque chose qui tourne autour du Soleil s’en approche le plus.",
  "inclination": "L’inclinaison d’une orbite par rapport à l’équateur. Quatre-vingt-dix degrés, c’est passer par les pôles.",
  "propagated": "Prolongé à partir d’une mesure plus ancienne. Pas une observation fraîche, et ça dérive.",
  "lunar distance": "La distance de la Terre à la Lune, environ 384 000 km. Une règle pratique pour les passages d’astéroïdes.",
  "astronomical unit": "La distance de la Terre au Soleil, environ 150 millions de km.",
  "light-time": "Le temps que met la lumière à franchir une distance. C’est aussi le temps que met un message radio.",
  "light-year": "La distance que parcourt la lumière en une année julienne, environ 9 460 milliards de km. Une règle pour mesurer l’écart entre les étoiles.",
  "magnitude": "À quel point quelque chose paraît brillant. L’échelle va à l’envers : plus le nombre est petit, plus c’est brillant.",
  "azimuth": "Une direction de boussole en degrés. Zéro est le nord, 90 est l’est.",
  "elevation": "À quelle hauteur se trouve quelque chose au-dessus de l’horizon, en degrés. Quatre-vingt-dix, c’est à la verticale.",
  "terminator": "La ligne entre le jour et la nuit sur un monde.",
  "twilight": "Le moment après le coucher du Soleil où le ciel n’est pas encore tout à fait noir. C’est là que les satellites se voient le mieux.",
  "sunlit": "Encore éclairé par le Soleil alors que le sol en dessous est dans le noir. C’est ce qui rend un satellite visible.",
  "radiant": "Le point du ciel d’où semble venir une pluie d’étoiles filantes.",
  "ZHR": "À peu près combien d’étoiles filantes par heure tu verrais sous un ciel parfaitement sombre, avec le radiant au zénith. En général, on en voit moins.",
  "close approach": "Quand un astéroïde passe près de la Terre. Près, en astronomie, veut souvent dire plus loin que la Lune.",
  "near-Earth object": "Un astéroïde ou une comète dont l’orbite l’amène près de celle de la Terre.",
  "reentry": "Quand quelque chose retombe dans l’atmosphère. La plus grande partie brûle pendant la descente.",
  "debris": "Des satellites morts, des étages de fusée usagés et des fragments. Des dizaines de milliers de morceaux sont suivis.",
  "constellation": "Un dessin d’étoiles que des gens ont nommé il y a longtemps. Les étoiles d’une même constellation ne sont en général pas proches les unes des autres.",
  "L1": "Un point d’équilibre entre la Terre et le Soleil, à environ 1,5 million de km vers le Soleil. Idéal pour observer le Soleil.",
  "L2": "Un point d’équilibre à 1,5 million de km de la Terre, du côté opposé au Soleil, où un télescope peut garder la Terre et le Soleil derrière lui et rester froid.",
  "transit": "Quand une chose passe devant une autre, vue de là où tu es.",
  "conjunction": "Quand deux choses paraissent proches dans le ciel. Elles ne sont pas proches dans l’espace.",
  "ephemeris": "Un tableau de l’endroit où sera quelque chose, calculé à l’avance.",
  "umbra": "La partie sombre au centre d’une ombre, où la lumière est entièrement bloquée. Dans l’ombre de la Lune, le Soleil disparaît.",
  "penumbra": "La partie extérieure et plus claire d’une ombre, où seule une partie de la lumière est bloquée. Une Lune dans la pénombre de la Terre ne s’assombrit qu’un peu.",
  "totality": "Les minutes d’une éclipse totale pendant lesquelles le Soleil est entièrement caché. Le ciel devient assez sombre pour voir des étoiles.",
  "annular": "En forme d’anneau. Lors d’une éclipse annulaire, la Lune est trop loin pour couvrir tout le Soleil, et un anneau brillant reste autour d’elle."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "Aller à une date (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "Chercher",
    "property": "Chercher par propriété",
    "countries": "Satellites par pays",
    "operators": "Par opérateur",
    "clouds": "Nuages de débris",
    "chartOurs": "Nos planètes côte à côte"
  },
  "find": {
    "title": "Chercher",
    "label": "Chercher par propriété, par pays et par nuage de débris",
    "tabs": {
      "property": "Propriétés",
      "country": "Par pays",
      "clouds": "Débris et flottes"
    },
    "kindsLabel": "Quoi chercher",
    "kinds": {
      "stars": "Étoiles",
      "exoplanets": "Planètes",
      "satellites": "Satellites",
      "comets": "Comètes"
    },
    "presetsLabel": "Questions",
    "refine": "Affiner",
    "presets": {
      "rockyHz50": "Planètes rocheuses dans la zone habitable à moins de 50 années-lumière",
      "nearStars": "Étoiles à moins de 20 années-lumière",
      "temperate": "Planètes à peu près aussi chaudes que la Terre",
      "hotJupiters": "Géantes chaudes",
      "cometsSoon": "Comètes au plus près du Soleil d’ici 2030",
      "geo": "Satellites actifs sur l’anneau géostationnaire",
      "low": "Satellites actifs sous 400 km"
    },
    "fields": {
      "within": "À moins de (années-lumière)",
      "fromHere": "Mesuré depuis la caméra, pas depuis le Soleil",
      "radius": "Rayon (Terres)",
      "mass": "Masse (Terres)",
      "teq": "Température (K)",
      "insol": "Lumière stellaire (Terre = 1)",
      "height": "Altitude (km)",
      "year": "Lancé (année)",
      "perihelion": "Au plus près du Soleil (année)",
      "from": "de",
      "to": "à",
      "zone": "Dans la zone habitable",
      "zoneWide": "Dedans ou à sa limite",
      "rocky": "Rocheuse",
      "working": "Actifs seulement",
      "owner": "Propriétaire",
      "operator": "Opérateur",
      "any": "Tous",
      "range": "{label} : {word}"
    },
    "columns": {
      "name": "Nom",
      "dist": "Distance (al)",
      "radius": "Rayon (Terres)",
      "teq": "Temp. (K)",
      "insol": "Lumière",
      "zone": "Zone",
      "spect": "Type",
      "mag": "Magnitude",
      "owner": "Propriétaire",
      "height": "Altitude (km)",
      "year": "Lancé",
      "perihelion": "Périhélie",
      "qAu": "Au plus près (UA)"
    },
    "zones": {
      "inside": "dedans",
      "edge": "limite",
      "hotter": "trop chaude",
      "colder": "trop froide"
    },
    "sortTitle": "Trier par {col}",
    "tableLabel": "Ce qui correspond, une ligne chacun : appuie sur une ligne pour y aller",
    "status": "{n} trouvés",
    "statusSome": "{n} trouvés ; les {shown} premiers sont listés",
    "none": "Rien ne correspond. Élargis une plage ou décoche une case.",
    "looking": "Recherche…",
    "loading": "Chargement des données à parcourir…",
    "failed": "La recherche n’a pas abouti. Réessaie dans un instant.",
    "rowTitle": "Aller à {name}",
    "noRecord": "Pas dessiné sur la carte",
    "modelled": "Calculé avec une masse d’étoile estimée : modélisé",
    "copyLink": "Copier le lien vers cette question",
    "copied": "Lien copié",
    "honesty": {
      "stars": "Les étoiles nommées de HYG v4.4, 3 390 en tout, à leurs distances mesurées. Mesuré.",
      "exoplanets": "Rayon, masse, période et étoile : mesurés, NASA Exoplanet Archive. Taille de l’orbite, lumière reçue, température et zone : calculées ; marquées * là où la masse de l’étoile est estimée d’après sa lumière, modélisé. Rocheuse : 1,6 rayon terrestre ou moins, ou 3 masses terrestres sans rayon connu (Rogers 2015).",
      "satellites": "Catalogue de CelesTrak, lu le {date}. L’altitude est la moyenne des points le plus haut et le plus bas de l’orbite. Mesuré.",
      "comets": "Dates de périhélie de la Small-Body Database du JPL. Calculées à partir d’orbites mesurées."
    },
    "chart": {
      "open": "Côte à côte",
      "openTitle": "Les planètes de {host} côte à côte, à l’échelle",
      "title": "{host}, à l’échelle",
      "ours": "Le Système solaire",
      "label": "Les planètes de {host} dessinées côte à côte à leur vraie taille, dans l’ordre depuis l’étoile",
      "note": "Une seule échelle pour toutes les planètes ; les écarts ne sont pas des distances. Une planète sans rayon mesuré est dessinée en pointillé, à la taille médiane.",
      "close": "Fermer le schéma"
    },
    "pill": "{name} : {n} en surbrillance",
    "pillClear": "Enlever la surbrillance"
  },
  "owners": {
    "modesLabel": "Grouper par",
    "modes": {
      "countries": "Pays",
      "operators": "Opérateurs",
      "points": "Points de Lagrange",
      "nopath": "Sans trajectoire publique"
    },
    "reading": "Lecture du catalogue de CelesTrak (7 Mo)…",
    "failed": "Le catalogue ne s’est pas chargé.",
    "retry": "Réessayer",
    "lead": "{n} propriétaires ont quelque chose en orbite : {total} objets suivis.",
    "row": "{n} en orbite",
    "rowSub": "{working} actifs · {debris} débris",
    "rowTitle": "Mettre en surbrillance ce que {name} a en orbite",
    "joint": "{a} et {b}",
    "ussr": "Le catalogue compte l’Union soviétique et la Russie comme un seul propriétaire.",
    "unknown": "Pas encore connu",
    "byName": "par nom",
    "byNameTitle": "Compté d’après les noms que portent ses satellites dans le catalogue",
    "kinds": "{working} actifs, {dead} hors service, {rocket} étages de fusée, {debris} débris.",
    "lit": "{n} d’entre eux sont dessinés et en surbrillance sur la carte.",
    "litNone": "Aucun n’est dessiné sur la carte.",
    "show": "Les mettre en surbrillance",
    "clear": "Effacer",
    "page": "Page de {name}",
    "noPathTitle": "Sans trajectoire publique : {n}",
    "noPathNone": "Toutes ses charges utiles en orbite ont une trajectoire publique.",
    "why": {
      "no-elements": "Pas d’orbite publique : le catalogue le liste, mais aucun jeu d’éléments n’est publié",
      "deep-space": "Au-delà de l’orbite terrestre, et pas de trajectoire ici",
      "deep-drawn": "Au-delà de l’orbite terrestre : dessiné d’après sa trajectoire du JPL"
    },
    "points": {
      "sel1": "Soleil–Terre L1",
      "sel2": "Soleil–Terre L2",
      "eml2": "Terre–Lune L2",
      "sel1Why": "À 1,5 million de km vers le Soleil : une vue du Soleil qui ne se couche jamais.",
      "sel2Why": "À 1,5 million de km à l’opposé du Soleil : froid et sombre, pour les télescopes.",
      "eml2Why": "Au-delà de la face cachée de la Lune : un relais qui voit à la fois la face cachée et la Terre.",
      "empty": "Rien d’inscrit ici pour l’instant."
    },
    "nopathLead": "{n} charges utiles en orbite n’ont pas de trajectoire publique. Les plus récentes d’abord :",
    "source": "Catalogue de satellites de CelesTrak, lu le {date} : mesuré. Drapeaux : Wikimedia Commons, domaine public."
  },
  "breakups": {
    "cloudsTitle": "Nuages de débris",
    "fleetsTitle": "Constellations",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "Un satellite météo chinois, détruit par un missile antisatellite chinois à 865 km le 11 janvier 2007 : le plus grand nuage jamais créé.",
      "cosmos1408": "Un satellite soviétique hors service, détruit par un missile antisatellite russe à environ 480 km le 15 novembre 2021.",
      "iridium33": "Un satellite téléphonique actif, percuté par Cosmos 2251, hors service, à 789 km au-dessus de la Sibérie le 10 février 2009 : la première collision entre deux satellites entiers.",
      "cosmos2251": "Un satellite russe hors service qui a percuté Iridium 33 à 789 km le 10 février 2009."
    },
    "counts": "{up} des {catalogued} fragments catalogués sont encore en orbite.",
    "lit": "{n} en surbrillance sur la carte.",
    "spreadTitle": "Le voir s’étaler",
    "steps": {
      "event": "Au moment de l’événement",
      "week": "Une semaine plus tard",
      "year": "Un an plus tard",
      "today": "Aujourd’hui"
    },
    "play": "Lire depuis l’événement",
    "stop": "Arrêter",
    "places": "Revenir aux positions d’aujourd’hui",
    "spreadNote": "Modélisé : chaque fragment part d’un même point, sur l’orbite qu’il a aujourd’hui, et dérive à mesure que le renflement de la Terre fait tourner son plan. Les fragments retombés ne sont pas dessinés.",
    "source": "Source :",
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
    "fleetLit": "{n} en surbrillance sur la carte.",
    "fleetNote": "Reconnus aux noms que leurs opérateurs leur donnent dans le catalogue.",
    "loadingActive": "Chargement de tous les satellites actifs d’abord (7 Mo)…",
    "loadingDebris": "Chargement de tous les débris suivis d’abord (7 Mo)…",
    "moment": "2007 : Fengyun-1C",
    "momentTitle": "Aller à la minute où Fengyun-1C a été détruit et mettre son nuage en surbrillance"
  },
  "dateJump": {
    "title": "Aller à une date",
    "field": "Date et heure (UTC)",
    "text": "Ou tape-la",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "Aller",
    "hint": "N’importe quel moment de 1700 à 2200, en UTC.",
    "errors": {
      "unknown": "Je ne comprends pas cette date. Essaie 1969-07-20 20:17, 20 July 1969 ou next total eclipse.",
      "range": "Hors de la période 1700–2200.",
      "empty": "Tape d’abord une date.",
      "eclipse": "Pas d’éclipse de ce genre entre 1700 et 2200."
    },
    "searching": "Recherche…",
    "gone": "Maintenant {when}.",
    "eclipse": "{what}, {when}.",
    "eclipses": {
      "sunTotal": "Éclipse totale de Soleil",
      "sunAnnular": "Éclipse annulaire de Soleil",
      "sunPartial": "Éclipse partielle de Soleil",
      "moonTotal": "Éclipse totale de Lune",
      "moonPartial": "Éclipse partielle de Lune",
      "moonPenumbral": "Éclipse pénombrale de Lune"
    },
    "rangesTitle": "Avec quelle précision, et quand",
    "ranges": {
      "worlds": "Soleil, Lune et planètes : de 1700 à 2200, calculés (astronomy-engine).",
      "satellites": "Satellites : précis jusqu’à une semaine avant ou après aujourd’hui ; estompés au-delà d’un mois.",
      "craft": "Sondes spatiales : seulement sur leurs propres trajectoires du JPL.",
      "stars": "Étoiles : dans la vue du ciel, déplacées par leurs mouvements mesurés dès que la date est à plus de 50 ans d’aujourd’hui."
    },
    "quick": {
      "total": "Prochaine éclipse totale de Soleil",
      "lunar": "Prochaine éclipse de Lune"
    },
    "missionsTitle": "Tirées de nos missions",
    "momentsTitle": "Moments",
    "presetsLabel": "Dates où aller",
    "faded": "Satellites estompés : leurs orbites sont mesurées pour aujourd’hui, pas pour {year}.",
    "close": "Fermer"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "Selon Wikipédia",
    "quotedLive": "Cité de Wikipédia tel qu’il se lit aujourd’hui, non vérifié par nous.",
    "quotedBaked": "Cité de Wikipédia tel qu’il se lisait le {date}, non vérifié par nous.",
    "textCredit": "Texte : contributeurs de Wikipédia, CC BY-SA 4.0.",
    "readArticle": "Lire l’article complet",
    "inEnglish": "Il n’existe pas encore d’article dans cette langue : voici l’article anglais.",
    "family": "À propos de {fleet} dans son ensemble : il n’y a pas d’article pour ce satellite en particulier.",
    "photo": "Photo : {artist}, {licence}, via Wikimedia Commons.",
    "photoNoArtist": "Photo : {licence}, via Wikimedia Commons.",
    "photoAlt": "L’image en tête de l’article Wikipédia {title}",
    "loading": "Interrogation de Wikipédia…",
    "read": "Lire à voix haute",
    "readTitle": "Lit cette fiche à voix haute avec la voix de ton appareil",
    "stop": "Arrêter la lecture",
    "reading": "Lecture à voix haute"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "Temps profond",
    "back": "−{n} ans",
    "on": "+{n} ans",
    "backTitle": "Reculer de {n} ans, même date et même heure",
    "onTitle": "Avancer de {n} ans, même date et même heure",
    "presetsLabel": "D’autres étoiles polaires",
    "presets": {
      "thuban": "Thuban, 2800 av. J.-C.",
      "vega": "Véga, 13 700 apr. J.-C.",
      "far": "50 000 apr. J.-C."
    },
    "presetTitles": {
      "thuban": "Quand on bâtissait les pyramides, Thuban du Dragon était l’étoile polaire",
      "vega": "Vers 13 700 apr. J.-C., le pôle passe à 6,5° de Véga",
      "far": "Le ciel dans cinquante mille ans"
    },
    "yearAd": "{n} apr. J.-C.",
    "yearBc": "{n} av. J.-C.",
    "moved": "Le ciel de {year} : chaque étoile déplacée par son propre mouvement mesuré.",
    "far": "Ni Lune ni planètes ne sont dessinées si loin d’aujourd’hui, et le Soleil est là où le calendrier le place.",
    "pole": "Étoile polaire : {name}, à {deg}° du pôle.",
    "noPole": "Aucune étoile brillante ne marque le pôle : la plus proche, {name}, est à {deg}°.",
    "unnamed": "une étoile de magnitude {mag}",
    "honest": "Les mouvements sont mesurés (Hipparcos et Gaia, via HYG) ; les prolonger en ligne droite pendant des millénaires est modélisé. Le basculement de l’axe de la Terre : Vondrák, Capitaine et Wallace 2011."
  },
  "variables": {
    "label": "Comment sa lumière change",
    "types": {
      "eclipse": "Une paire à éclipses : deux étoiles qui passent l’une devant l’autre.",
      "binary": "Une paire serrée, déformée, dont la lumière ne reste jamais fixe.",
      "pulse": "Une étoile pulsante : elle enfle et se contracte.",
      "sine": "Une petite étoile à pulsation rapide.",
      "sr": "Une géante semi-régulière : sa période et son amplitude sont mesurées, mais pas l’endroit de son cycle où elle se trouve ; la courbe est une esquisse.",
      "irregular": "Une variable irrégulière : aucune horloge ne dit son éclat, le ciel garde donc celui du catalogue."
    },
    "periodDays": "Période {n} jours.",
    "periodYears": "Période {n} ans.",
    "aria": "Courbe de lumière de {name}, de la magnitude {bright} à {faint} ; maintenant {now}.",
    "now": "maintenant",
    "nowLine": "Maintenant magnitude {mag} ({band}) ; elle va de {bright} à {faint}.",
    "range": "Elle va de la magnitude {bright} à {faint} ({band}).",
    "far": "Sa courbe n’est pas prolongée à plus de {years} ans d’aujourd’hui ; elle va de la magnitude {bright} à {faint} ({band}).",
    "nextMin": "Prochain minimum : {when}",
    "measured": "Mesuré : les magnitudes datées du Grand Assombrissement. Éléments : {cite}.",
    "modelled": "Modélisé : la forme est tirée de la période, de l’époque et de l’amplitude du catalogue ({cite}).",
    "notes": {
      "alf-ori": "En 2019 et 2020, elle a faibli jusqu’à la magnitude 1,6, le Grand Assombrissement : un nuage de poussière qu’elle avait éjecté en cachait une partie.",
      "omi-cet": "Les maxima de Mira arrivent des semaines en avance ou en retard d’un cycle à l’autre ; ces dates peuvent être décalées d’autant.",
      "bet-lyr": "Sa période s’allonge de 19 secondes par an ; la courbe suit l’éphéméride quadratique de Harmanec et Scholz (1993).",
      "bet-per": "Les éclipses d’Algol tiennent à la minute : elle faiblit une dizaine d’heures tous les 2,87 jours.",
      "eps-aur": "Éclipsée près de deux ans tous les 27 ans par un disque sombre autour de sa compagne ; la dernière éclipse a duré de 2009 à 2011.",
      "eta-car": "Lors de sa Grande Éruption des années 1840, elle est devenue la deuxième étoile la plus brillante du ciel.",
      "t-crb": "Une nova récurrente : elle a atteint la magnitude 2 en 1866 et en 1946."
    }
  },
  "blackHoleSpin": {
    "spin": "Dessiné en rotation, avec un spin a = {a} : l’ombre a la forme que projette un trou qui tourne (Bardeen 1973), repoussée du côté qui vient vers nous. {why} La lumière autour est encore tracée sans spin : la forme est donc modélisée.",
    "spinWhy": {
      "m87-star": "Le spin est choisi : les modèles les mieux ajustés de l’article V de l’EHT 2019 tournent à 0,94.",
      "sgr-a-star": "Le spin est choisi : l’article V de l’EHT 2022 privilégie 0,5 à 0,94."
    }
  }
});
// b200-f3-stars: end
// b200-c1-culture: begin -- a sky figure's story and the other cultures' pictures (copy/en.later.js skyLore, forge #143), machine-drafted
Object.assign(COPY, {
  "skyLore": {
    "figure": "une figure du ciel {culture}",
    "figureLabel": "{name}, une figure du ciel {culture}. Appuie pour lire son histoire.",
    "openTitle": "Appuie pour lire son histoire",
    "sub": "Le ciel {culture}",
    "close": "Fermer l’histoire",
    "loading": "Chargement de l’histoire…",
    "failed": "L’histoire ne s’est pas chargée. Réessaie dans un instant.",
    "fromStellarium": "D’après la description de cette culture du ciel dans Stellarium. {credit}.",
    "ours": "Dans nos propres mots, d’après : {cite}.",
    "honesty": "Illustratif : un récit, tel que sa source le rapporte. Les noms et les histoires varient selon les peuples et les conteurs.",
    "none": "Aucune des sources que nous pouvons partager ne rapporte d’histoire pour cette figure. Ce sont des traditions vivantes : nous le disons plutôt que de deviner.",
    "inEnglish": "L’histoire est en anglais, la langue de sa source : il n’en existe aucune traduction sous licence.",
    "artTitles": {
      "maori": "Les figures maories en dessins, tirées de la culture du ciel maorie de Stellarium, CC BY-SA 4.0",
      "hawaiian": "Les lignes d’étoiles hawaïennes en dessins de Kealoha Kaneakua, pour Stellarium, CC BY-SA 4.0",
      "boorong": "Les figures boorong en dessins, tirées de la culture du ciel boorong de Stellarium, CC BY-SA 4.0"
    },
    "artNone": "Aucun dessin de ce ciel sous une licence que nous pouvons partager : ses figures restent des lignes."
  }
});
// b200-c1-culture: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "Trajectoire",
    "flightTitle": "Préparer un trajet de caméra entre des vues, le prévisualiser et le partager par un lien",
    "record": "Enregistrer",
    "recordTitle": "Enregistrer cette vue, une trajectoire ou un voyage en vidéo",
    "dome": "Dôme et 360",
    "domeTitle": "Montrer le ciel en dôme de planétarium ou en image à 360 degrés",
    "failed": "Le chargement a échoué. Réessaie dans un instant."
  },
  "flight": {
    "title": "Trajectoire",
    "sheet": "Trajectoire : fais glisser pour redimensionner",
    "close": "Fermer la trajectoire",
    "play": "Lire",
    "playTitle": "Parcourir la trajectoire depuis la position du curseur",
    "stop": "Arrêter",
    "stopTitle": "Arrêter le vol ici",
    "scrub": "Position sur la trajectoire",
    "scrubAt": "{at} sur {total}",
    "hint": "Amène la carte sur une vue qui te plaît, puis appuie sur Ajouter cette vue. Deux vues font une trajectoire.",
    "hintOne": "Une vue. Va ailleurs et ajoutes-en une autre.",
    "hintMany": "{n} vues. Appuie sur Lire, ou fais glisser le curseur pour regarder le long de la trajectoire.",
    "add": "Ajouter cette vue",
    "addTitle": "Garder la position de la caméra, ce qu’elle regarde et l’horloge",
    "keysLabel": "Les vues de la trajectoire, dans l’ordre",
    "keyName": "{n}. {name}",
    "goTitle": "Aller à cette vue",
    "keyLive": "l’horloge telle qu’elle tourne",
    "point": "Un point de l’espace",
    "duration": "Vol",
    "seconds": "{n} s",
    "ease": "Courbe",
    "eases": {
      "smooth": "Départ et arrêt en douceur",
      "cruise": "Croisière",
      "constant": "Vitesse constante"
    },
    "rate": "Horloge",
    "rateLive": "Temps réel",
    "up": "↑",
    "upLabel": "Avancer la vue {n}",
    "down": "↓",
    "downLabel": "Reculer la vue {n}",
    "replace": "Prendre cette vue",
    "replaceLabel": "Remplacer la vue {n} par la vue actuelle",
    "remove": "Retirer",
    "removeLabel": "Retirer la vue {n}",
    "copyLink": "Copier le lien",
    "copyLinkTitle": "Toute la trajectoire dans un lien : rien n’est stocké nulle part",
    "linkCopied": "Lien copié ({n} caractères). Qui l’ouvre voit ce vol.",
    "linkInBar": "Le lien est dans la barre d’adresse : copie-le là.",
    "draft": "Enregistrer un brouillon de voyage",
    "draftTitle": "Un brouillon de fichier de voyage pour les voyages de la carte, à terminer par une personne",
    "draftSaved": "Brouillon enregistré. À toi d’en écrire les fiches.",
    "record": "Enregistrer ce vol",
    "recordTitle": "Enregistrer le vol en vidéo",
    "clear": "Vider",
    "clearTitle": "Retirer toutes les vues",
    "needTwo": "Une trajectoire demande au moins deux vues.",
    "full": "Une trajectoire compte au plus {n} vues.",
    "noView": "Cette vue ne peut pas être gardée : regarde d’abord quelque chose.",
    "badLink": "Ce lien de vol n’a pas pu être lu.",
    "honesty": "Chaque vue montre les choses là où elles sont à l’heure de son horloge. Les vols entre les vues sont des mouvements de caméra que nous dessinons, pas la route d’un engin spatial."
  },
  "record": {
    "title": "Enregistrer",
    "sheet": "Enregistrer : fais glisser pour redimensionner",
    "close": "Fermer Enregistrer",
    "whatLabel": "Quoi enregistrer",
    "sourceView": "Cette vue",
    "sourcePath": "La trajectoire",
    "sourceTrip": "Le voyage, jusqu’à la fin",
    "length": "Durée",
    "seconds": "{n} secondes",
    "shapeLabel": "Format",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "Carré",
      "tall": "Vertical 9:16 (Reels, TikTok, Shorts)"
    },
    "smooth": "Image par image (fluide sur tout appareil)",
    "smoothNote": "La page recharge cette vue sur sa propre horloge et dessine chaque image avant de la prendre : un appareil lent enregistre lentement, mais jamais par saccades.",
    "silent": "L’image par image n’enregistre pas le son.",
    "withSound": "Le son que tu entends est enregistré aussi.",
    "noSound": "Le son est coupé, la vidéo sera muette. Active le son d’abord pour garder la voix et la musique du voyage.",
    "start": "Lancer l’enregistrement",
    "stop": "Arrêter",
    "save": "Enregistrer la vidéo",
    "share": "Partager la vidéo",
    "saved": "Vidéo enregistrée.",
    "cannot": "Ce navigateur ne peut pas enregistrer de vidéo. Les versions récentes de Chrome, Edge, Safari et Firefox le peuvent.",
    "rolling": "Enregistrement : {at} s",
    "made": "Terminé : {mb} Mo. Enregistre-la ou partage-la.",
    "empty": "Le navigateur n’a rien enregistré. Réessaie, ou coche Image par image.",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · cartes et données : NASA, ESA, Solar System Scope et d’autres",
    "endTitle": "Vois par toi-même",
    "endLine": "Space Radar : gratuit, dans ton navigateur.",
    "endCredit": "Cartes et données : NASA, ESA, USGS, Solar System Scope, HYG et d’autres, sous leurs propres licences (CC BY, CC BY-SA). Crédits sur spaceradar.ai.",
    "filmTitle": "Enregistrement image par image",
    "filmWarming": "Préparation de la vue…",
    "filmFrame": "Image {n} sur {total}",
    "filmDone": "Terminé : {mb} Mo, {s} secondes. Le fichier est enregistré.",
    "filmFailed": "L’enregistrement s’est arrêté : {why}",
    "back": "Retour à la carte"
  },
  "dome": {
    "title": "Dôme et 360",
    "sheet": "Dôme et 360 : fais glisser pour redimensionner",
    "close": "Fermer Dôme et 360",
    "kindLabel": "Comment le ciel est dessiné",
    "normal": "Normal",
    "dome": "Dôme, 180 degrés (planétarium)",
    "wide": "360 degrés (YouTube 360)",
    "tilt": "Inclinaison du dôme",
    "tiltDeg": "{n}°",
    "size": "Taille",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "Enregistrer cette image",
    "skySize": "Face de la skybox",
    "saveSky": "Enregistrer une skybox",
    "saved": "Enregistré : {w} × {h} px.",
    "saveFailed": "L’image n’a pas pu être dessinée.",
    "intro": "Une image de dôme ou à 360 degrés de ce que voit la caméra, en direct. Les noms sont masqués tant qu’elle est active.",
    "live": "En direct, {n} px par face.",
    "livePhone": "En direct à {n} px par face : sur un téléphone, c’est un aperçu. Enregistre une image pour en avoir une nette.",
    "noGpu": "Le processeur graphique de cet appareil ne peut pas le dessiner.",
    "busy": "Ferme d’abord le monde imaginé ou le Moment : il dessine sa propre image.",
    "off": "Retour à l’image normale.",
    "credit": "Libre d’usage avec ce crédit : Space Radar, spaceradar.ai. Cartes et données : NASA, ESA, USGS, Solar System Scope, HYG et d’autres ; le panneau Sources donne la licence de chacun.",
    "how": "Pour un dôme, ajoute #proj=dome,30 au lien d’un voyage et ouvre-le en plein écran. docs/PLANETARIUMS.md donne les étapes."
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "Défi du jour",
    "close": "Fermer",
    "day": "L’énigme du {day} (UTC), la même pour tout le monde aujourd’hui.",
    "games": {
      "find-earth": {
        "title": "Trouve la Terre",
        "blurb": "Des galaxies jusqu’à notre planète, en aussi peu de choix que possible."
      },
      "which-world": {
        "title": "Quel est ce monde ?",
        "blurb": "Un gros plan d’une vraie carte : choisis le monde parmi quatre."
      },
      "guess-distance": {
        "title": "Devine la distance",
        "blurb": "Fais glisser jusqu’au bon nombre d’années-lumière."
      }
    },
    "other": "Autres défis",
    "loading": "La carte se charge encore ; le défi commence dès qu’elle est prête.",
    "rung": "Étape {n} sur {of} : {where}",
    "rungs": {
      "local-group": "le Groupe local",
      "galaxy": "la Voie lactée",
      "stellar": "le voisinage du Soleil",
      "sun": "le Système solaire"
    },
    "ask": {
      "local-group": "Quelle marque est notre galaxie, la Voie lactée ?",
      "galaxy": "Quelle marque est le Soleil ?",
      "stellar": "Quelle marque est le Soleil ?",
      "sun": "Quelle marque est la Terre ?"
    },
    "hints": {
      "local-group": "La nôtre a deux petites compagnes tout près, les Nuages de Magellan.",
      "galaxy": "Le Soleil est à environ 27 000 années-lumière du trou noir central, dans un bras tranquille.",
      "stellar": "Les étoiles les plus proches du Soleil sont de faibles naines rouges et Alpha du Centaure, à 4,4 années-lumière.",
      "sun": "La Terre est le troisième monde à partir du Soleil."
    },
    "hint": "Indice (coûte un essai)",
    "mark": "Marque {letter}, {where}",
    "places": {
      "tl": "en haut à gauche",
      "tc": "en haut",
      "tr": "en haut à droite",
      "ml": "à gauche",
      "mc": "au centre",
      "mr": "à droite",
      "bl": "en bas à gauche",
      "bc": "en bas",
      "br": "en bas à droite"
    },
    "milkyWay": "la Voie lactée",
    "sunName": "le Soleil",
    "tries": "Choix {n} sur {max}",
    "wrong": "Pas celle-là : {letter} est {name}.",
    "right": "Oui : {name}. On se rapproche.",
    "found": "Tu as trouvé la Terre en {n} choix.",
    "lost": "Plus de choix. La Terre était le troisième monde à partir du Soleil.",
    "honest": "Les marques sont là où la carte dessine chaque objet. À l’étape du Système solaire, les mondes sont dessinés plus près qu’ils ne le sont, comme partout sur cette scène.",
    "round": "Manche {n} sur {of}",
    "worldAsk": "De quel monde est ce gros plan ?",
    "more": "Voir plus de la carte",
    "worldRight": "Oui : {name}.",
    "worldWrong": "Non : c’était {name}.",
    "credit": "Carte : {credit}",
    "worldPicture": "Un gros plan d’une vraie carte d’un monde du Système solaire",
    "distAsk": "À quelle distance est {name} ?",
    "slider": "Distance en années-lumière",
    "guess": "Deviner",
    "reveal": "{name} est à {value} : tu étais {off}.",
    "offs": {
      "hit": "à moins d’un quart près",
      "near": "à moins du double",
      "far": "à moins du quintuple",
      "miss": "à plus d’un facteur cinq"
    },
    "source": "Distance : {source}",
    "units": {
      "ly": "{n} années-lumière",
      "kly": "{n} milliers d’années-lumière",
      "mly": "{n} millions d’années-lumière",
      "bly": "{n} milliards d’années-lumière"
    },
    "next": "Suivant",
    "scores": {
      "find-earth": "{n} choix sur 10",
      "which-world": "{n} mondes sur 3",
      "guess-distance": "{n} sur 3 à moins du double"
    },
    "shareTitle": "Space Radar : {game}",
    "share": "Partager le résultat",
    "copied": "Copié. Colle-le où tu veux.",
    "copyFailed": "Copie impossible : sélectionne le texte ci-dessus.",
    "played": "C’est fini pour aujourd’hui. Un nouveau défi arrive à minuit UTC.",
    "streak": "{n} jours d’affilée"
  }
});
// b200-f6-learn: end
// b200-f8-xr: begin -- the gamepad and the headset (copy/en.xr.js, forge #164, #158), machine-drafted
Object.assign(COPY, {
  "pad": {
    "title": "Manette",
    "label": "Commandes de la manette",
    "close": "Fermer les commandes de la manette",
    "capStickL": "Stick gauche",
    "capStickR": "Stick droit",
    "capTriggers": "RT · LT",
    "capA": "A · Croix",
    "capX": "X · Carré",
    "capB": "B · Rond",
    "capY": "Y · Triangle",
    "capDpad": "Croix directionnelle ↑ ↓",
    "capView": "Affichage · Share",
    "turn": "Tourner autour",
    "fly": "Avancer et reculer, glisser de côté",
    "speed": "Plus vite, plus lentement",
    "choose": "Choisir ce qui est dans l’anneau",
    "go": "Y aller",
    "back": "Retour",
    "ship": "Activer ou désactiver la physique de vaisseau",
    "ladder": "Monter et descendre l’échelle des distances",
    "controls": "Ces commandes (Menu aussi)",
    "shipToggle": "Physique de vaisseau",
    "shipHow": "Tu continues à dériver quand tu lâches. Enfonce un stick pour t’arrêter.",
    "notStandard": "Cette manette ne dit pas où sont ses boutons : son stick gauche tourne la vue, ses boutons ne servent pas.",
    "connected": "Manette connectée. Appuie sur Y pour ses commandes.",
    "disconnected": "Manette déconnectée.",
    "shipOn": "Physique de vaisseau activée : tu continues à dériver quand tu lâches.",
    "shipOff": "Physique de vaisseau désactivée.",
    "nothing": "Rien à choisir dans l’anneau.",
    "chooseFirst": "Choisis d’abord quelque chose : A prend ce qui est dans l’anneau.",
    "rung": "{label}, {distance}",
    "home": "La Terre",
    "trip": "Un voyage contrôle la caméra. Ses propres boutons sont à l’écran."
  },
  "headset": {
    "enter": "Passer au casque",
    "enterTitle": "Se tenir sous le ciel ou parcourir l’échelle des distances dans un casque de réalité virtuelle",
    "noteTitle": "Avant de le mettre",
    "comfort": "Les déplacements sont des sauts, pas des glissements, et les rotations se font par pas de 30 degrés : l’horizon reste droit. Assieds-toi ou dégage l’espace autour de toi.",
    "seizure": "Un petit nombre de personnes font des crises à cause de lumières ou de motifs clignotants. Si tu as le vertige ou la nausée, ou si tu vois quelque chose d’étrange, arrête-toi et retire le casque.",
    "how": "Regarde quelque chose et appuie sur A ou sur la gâchette droite pour le choisir. X y va, B revient, Y montre les commandes, comme sur une manette. Dans un Moment, A lance et met en pause, B ramène à la carte. Maintiens B une seconde pour sortir.",
    "untried": "Nouveau, et pas encore essayé sur un vrai casque : dis-nous ce que tu vois.",
    "go": "Entrer",
    "cancel": "Pas maintenant",
    "busy": "Ferme d’abord le monde imaginé, Dôme et 360 ou l’enregistrement : chacun dessine sa propre image.",
    "failed": "Le casque n’a pas démarré.",
    "left": "De retour à l’écran.",
    "panelHelp": "A choisir   X aller   B retour   Y commandes",
    "panelMove": "Stick gauche : autour, et le long de l’échelle   Stick droit : tourner, avancer et reculer",
    "panelLeave": "Maintenir B pour sortir",
    "chosen": "Choisi : {name}",
    "nothing": "Rien droit devant",
    "momentHelp": "A lecture ou pause   B retour à la carte   Y commandes",
    "frame": "Image {ms} ms, {fps} par seconde (objectif : 72)",
    "lighter": "Les images duraient trop : le dessin est allégé."
  }
});
// b200-f8-xr: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "Enregistrements réels d’ici",
    "play": "Écouter {name}",
    "stop": "Arrêter",
    "hide": "Masquer les enregistrements d’ici",
    "sonified": "De vraies données, transformées en son",
    "microphone": "Un vrai son, capté par un micro",
    "playing": "Lecture : {name}. {how}.",
    "failed": "Cet enregistrement ne s’est pas chargé.",
    "names": {
      "real-voyager-plasma": "Voyager 1 dans l’espace interstellaire",
      "real-juno-ganymede": "Juno au passage de Ganymède",
      "real-cassini-saturn": "la radio de Saturne",
      "real-insight-impact": "un météoroïde frappant Mars",
      "real-insight-wind": "le vent sur Mars",
      "real-perseverance-dust-devil": "un tourbillon de poussière sur Mars"
    }
  }
});
// b200-f9-reach: end
// b200-f7-ground: begin -- standing on another world and its sky (copy/en.ground.js, forge #146, #147), machine-drafted
Object.assign(COPY, {
  "ground": {
    "stageLabel": "Debout sur un autre monde",
    "tagGround": "Au sol · {world}",
    "tagSky": "Le ciel depuis {world}",
    "kindMeasured": "sol mesuré",
    "kindPlain": "sol non mesuré",
    "kindModelled": "modélisé",
    "placeAt": "{world}, {lat}°, {lon}° est",
    "worlds": {
      "moon": "la Lune",
      "mars": "Mars",
      "titan": "Titan",
      "europa": "Europe",
      "earth": "la Terre",
      "proxima-b": "Proxima Centauri b",
      "trappist-1e": "TRAPPIST-1 e"
    },
    "measuredGround": "Mesuré : les reliefs sont le modèle de terrain stéréo à l’échelle réelle, le sol est l’image prise par l’orbiteur lui-même (ses ombres sont celles du jour de la prise de vue). Aucun rocher ni cratère n’est inventé.",
    "plainGround": "Le sol ici n’est pas tiré de mesures : une plaine jusqu’à l’horizon. Le ciel est calculé.",
    "modelLine": "Aux coordonnées d’atterrissage : {what}. Son orientation ne provient pas d’une image.",
    "timeLine": "{local} heure solaire locale · {utc} · Soleil à {sun}°",
    "timeLineStar": "{utc} · {star} à {sun}° de hauteur, toujours au même endroit",
    "drive": "Conduire le rover",
    "walk": "Marcher",
    "driving": "En conduite, environ {x} fois plus vite que le rover ne peut aller.",
    "walking": "À pied.",
    "skyOpen": "Le ciel",
    "skyClose": "Masquer le ciel",
    "leave": "Quitter",
    "sources": "Sources et licences",
    "padLabel": "Marcher : pousse le pouce dans la direction voulue",
    "keys": "W A S D ou les flèches pour marcher, Q et E pour tourner, R et F pour regarder vers le haut et vers le bas, Maj pour courir, + et - pour zoomer, Échap pour quitter.",
    "padDrive": "Conduire : pousse le bouton vers le haut pour avancer, vers le bas pour reculer, sur le côté pour tourner",
    "keysDrive": "W ou la flèche du haut pour avancer, S ou le bas pour reculer, A et D ou les flèches latérales pour tourner, R et F pour regarder en haut et en bas, Maj pour aller plus vite, Échap pour quitter.",
    "howtoKeys": "Tu conduis. W ou ↑ pour avancer, S ou ↓ pour reculer, A et D ou ← et → pour tourner. Fais glisser pour regarder autour.",
    "howtoTouch": "Tu conduis. Pousse le cercle vers le haut pour avancer, vers le bas pour reculer, sur le côté pour tourner. Fais glisser le ciel pour regarder autour.",
    "driveHint": "Ce rover peut être conduit : appuie sur « Conduire le rover ».",
    "tripDriveTitle": "Quitter le voyage ici et conduire ce rover",
    "skyTitle": "Ce ciel",
    "poleStar": "Étoile polaire : {name}, à {sep}° du pôle (magnitude {mag}).",
    "noPoleStar": "Aucune étoile plus brillante que la magnitude 4,5 à moins de 10° du pôle de ce monde.",
    "unnamedStar": "une étoile sans nom usuel",
    "poleLabel": "{name} (étoile polaire)",
    "rises": "{name} se lève à {local} heure solaire locale ({utc}).",
    "sets": "{name} se couche à {local} heure solaire locale ({utc}).",
    "neverSets": "{name}, depuis ici, ne se lève ni ne se couche et reste dans la même partie du ciel.",
    "notToday": "{name} ne se lève ni ne se couche pendant la période examinée.",
    "transit": "{front} passe devant le disque du Soleil à {local} heure solaire locale ({utc}), pendant {s} secondes.",
    "noTransit": "Aucun passage de Phobos ou de Deimos devant le Soleil depuis ici dans les {days} prochains sols.",
    "working": "Calcul des levers et des couchers…",
    "earthNow": "La Terre : {alt}° de hauteur, azimut {az}°, éclairée à {lit} %, magnitude {mag}.",
    "airNotes": {
      "mars": "Couleurs mesurées : le ciel de jour vient du panorama en couleurs réelles de Spirit (PIA07882), le coucher de soleil bleu de celui de Curiosity dans Gale (PIA19400).",
      "moon": "Pas d’air, donc le ciel est noir à midi. Un vrai œil, ébloui par le sol éclairé par le Soleil, ne verrait que peu de ces étoiles.",
      "europa": "Pas d’air, donc le ciel est noir à midi. Jupiter reste immobile dans le ciel de la face tournée vers lui.",
      "titan": "Couleur illustrative : la brume orange cache à l’œil les étoiles et Saturne ; ils sont dessinés pâles là où ils se trouvent.",
      "earth": "",
      "proxima-b": "Modélisé : on suppose que Proxima b présente toujours la même face à son étoile, comme l’attendent ses découvreurs (Anglada-Escudé et al. 2016) ; l’inclinaison de son orbite et la position de Proxima b et de Proxima d sur leurs orbites ne sont pas connues, elles sont donc supposées. La couleur du ciel est illustrative : personne ne sait s’il y a de l’air. Alpha Centauri A et B sont à leur vraie place ; les autres étoiles sont dessinées comme le Soleil les voit.",
      "trappist-1e": "Modélisé : on suppose que TRAPPIST-1 e présente toujours la même face à son étoile (Gillon et al. 2017) ; ses planètes sœurs sont là où les placent leurs instants de transit mesurés, sur des orbites circulaires dans un même plan, tourné d’une manière supposée autour de notre ligne de visée. La couleur du ciel est illustrative : personne ne sait s’il y a de l’air. Les autres étoiles sont dessinées comme le Soleil les voit."
    },
    "parentNote": "Cette lune présente toujours la même face à sa planète, donc la planète ne se lève ni ne se couche.",
    "starNote": "On suppose que cette planète présente toujours la même face à son étoile, donc l’étoile ne se lève ni ne se couche.",
    "discNote": "Le Soleil, la Terre, Phobos et les autres corps étendus sont des disques de leur vraie taille et de leur vraie phase, en couleurs unies, et non leurs cartes ou leurs formes.",
    "frameNote": "Rotation : le rapport IAU WGCCRE 2015 (Archinal et al. 2018). Positions : les éphémérides propres à l’application.",
    "compass": {
      "N": "N",
      "E": "E",
      "S": "S",
      "W": "O"
    },
    "bodies": {
      "sun": "Le Soleil",
      "mercury": "Mercure",
      "venus": "Vénus",
      "earth": "La Terre",
      "moon": "La Lune",
      "mars": "Mars",
      "phobos": "Phobos",
      "deimos": "Deimos",
      "jupiter": "Jupiter",
      "io": "Io",
      "europa": "Europe",
      "ganymede": "Ganymède",
      "callisto": "Callisto",
      "saturn": "Saturne",
      "titan": "Titan",
      "uranus": "Uranus",
      "neptune": "Neptune",
      "proxima": "Proxima Centauri",
      "proxima-d": "Proxima d",
      "alpha-cen-a": "Alpha Centauri A",
      "alpha-cen-b": "Alpha Centauri B",
      "trappist-1": "TRAPPIST-1",
      "trappist-1b": "TRAPPIST-1 b",
      "trappist-1c": "TRAPPIST-1 c",
      "trappist-1d": "TRAPPIST-1 d",
      "trappist-1f": "TRAPPIST-1 f",
      "trappist-1g": "TRAPPIST-1 g",
      "trappist-1h": "TRAPPIST-1 h"
    },
    "earthAndMoon": "La Terre et la Lune",
    "unknownGround": "Il n’y a pas encore de modèle de terrain pour ce site.",
    "unknownSky": "Cette carte ne permet pas encore de se tenir à cet endroit : seulement sur la Lune, Mars, Titan, Europe, Proxima b ou TRAPPIST-1 e."
  }
});
// b200-f7-ground: end
// b200-c3-learn: begin -- the Fengyun-1C Moment (copy/en.moments.fengyun.js and its shelf card, forge #153), machine-drafted
COPY.momentShelf.cards['fengyun-1c'] = {
  "title": "2007 : Fengyun-1C",
  "when": "du 11 janvier 2007 à aujourd’hui",
  "blurb": "Un missile chinois détruit un vieux satellite météo à 865 km d’altitude, et ses 3 531 débris catalogués s’étalent d’un point en une coquille autour de la Terre, racontés par une voix."
};
COPY.momentStories['fengyun-1c'] = {
  "title": "2007 : Fengyun-1C",
  "blurb": "Un missile chinois détruit un vieux satellite météo à 865 km d’altitude, et ses débris s’étalent d’un point en une coquille autour de la Terre, toujours là aujourd’hui.",
  "chBefore": "Fengyun-1C",
  "chHit": "Le test",
  "chRing": "Un anneau",
  "chMonths": "Deux mois",
  "chYear": "La première année",
  "chShell": "Une coquille",
  "chToday": "Aujourd’hui",
  "v1a": "Le soir du 11 janvier 2007. Fengyun-1C, un satellite météo chinois retiré du service, de 960 kg, tourne autour de la Terre en passant par les pôles, entre 845 et 865 km d’altitude.",
  "v1b": "Un missile lancé près de Xichang monte à sa rencontre. Sa trajectoire n’a jamais été publiée, elle n’est donc pas dessinée.",
  "v2a": "22 h 26 UTC : l’intercepteur frappe le satellite de face, à environ 8 km/s de vitesse relative, et le brise en milliers de morceaux.",
  "v2b": "Chaque morceau repart un peu plus vite ou plus lentement que les autres, donc chacun sur son orbite.",
  "v3a": "Une orbite plus haute met plus longtemps à faire le tour. Tour après tour, les morceaux s’étirent le long de l’ancienne orbite et, en quelques jours, se referment en anneau.",
  "v4a": "Le renflement de la Terre fait tourner le plan de chaque orbite, un peu plus vite ou plus lentement selon l’altitude et l’inclinaison, et l’anneau commence à s’ouvrir en éventail.",
  "v4b": "Deux mois après le test, plus de 1 200 morceaux étaient catalogués et près de 400 autres étaient suivis, selon l’Orbital Debris Quarterly News de la NASA.",
  "v5a": "Fin 2007, le catalogue comptait 2 317 morceaux, et seuls 22 étaient retombés. La NASA estimait au moins 150 000 morceaux d’un centimètre ou plus, trop petits pour être suivis.",
  "v6a": "Année après année, les plans se répartissent tout autour. En janvier 2013, le nuage est une coquille autour de la Terre : 3 378 morceaux catalogués, 3 076 encore en orbite.",
  "v6b": "Les satellites doivent les éviter. La Station spatiale internationale s’est écartée de l’un d’eux en janvier 2012.",
  "v7a": "Aujourd’hui le catalogue compte 3 531 morceaux de Fengyun-1C, et 2 310 sont encore là-haut, près de vingt ans plus tard. Le 10 novembre 2021, la station s’est de nouveau écartée de l’un d’eux.",
  "v7b": "Les chiffres sont mesurés. L’image est un modèle : les survivants d’aujourd’hui sur leurs orbites d’aujourd’hui, ramenés à l’instant du test.",
  "pathSat": "l’orbite de Fengyun-1C, 845 sur 865 km à 98,6 degrés (NASA ODQN, avril 2007), en conique ; l’endroit de l’orbite où le satellite a été frappé est illustratif",
  "cloudNote": "Les morceaux sont les 2 310 que le catalogue garde encore, sur les orbites qu’il donne aujourd’hui, étalés depuis un point par un modèle (mouvement à deux corps et dérive due au renflement de la Terre) ; les morceaux retombés ne sont pas dessinés, et les chiffres des légendes sont mesurés. Au moment de l’impact, chaque débris part de son point le plus bas d’aujourd’hui : le nuage commence donc par une ligne sous le satellite, pas par un point, car le frottement de l’air a abaissé bien des orbites depuis 2007.",
  "drawnNote": "Illustratif : Fengyun-1C est une marque cerclée et chaque débris un point de même taille, rien à l’échelle ; l’impact lui-même n’est pas dessiné.",
  "footMore": "Plus",
  "footLess": "Moins",
  "srcOdqn07": "NASA Orbital Debris Quarterly News 11(2), avril 2007 : le satellite, son orbite, les premiers chiffres",
  "srcOdqn08": "NASA Orbital Debris Quarterly News 12(1), janvier 2008 : le compte à la fin de 2007",
  "srcOdqn13": "NASA Orbital Debris Quarterly News 17(1), janvier 2013 : catalogués, retombés et encore en orbite",
  "srcOdqn14": "NASA Orbital Debris Quarterly News 18(1), janvier 2014 : la manœuvre de la station en janvier 2012",
  "srcOdqn22": "NASA Orbital Debris Quarterly News 26(1), mars 2022 : la manœuvre de la station du 10 novembre 2021",
  "srcCelestrak": "CelesTrak, Chinese ASAT test : l’heure la plus probable de l’événement, 22:26:10 UTC",
  "srcSatcat": "Catalogue de satellites de CelesTrak (SATCAT), lu le 2026-11-07 : le compte d’aujourd’hui et l’orbite de chaque morceau",
  "srcWiki": "Wikipédia, 2007 Chinese anti-satellite missile test : la vitesse de rapprochement"
};
// b200-c3-learn: end
// b200-c2-deep: begin -- the 3D stars over deep time, the variable stars worth going out for, the black holes against the EHT's pictures and the cards in the trips' voice (copy/en.deep.js, forge #141, #142, #149, #151), machine-drafted
Object.assign(COPY, {
  "starDeep": {
    "moved": "Les étoiles de {year} : chacune déplacée de son propre mouvement mesuré (Hipparcos et Gaia, via HYG) ; les prolonger en ligne droite aussi longtemps est modélisé.",
    "hidden": "Les étoiles sans mouvement mesuré ne sont pas dessinées aussi loin d’aujourd’hui.",
    "noPluto": "Pluton et ses lunes ne sont pas dessinés aussi loin d’aujourd’hui : leur éphéméride (astronomy-engine) n’a de table que pour les années 0 à 4000.",
    "selected": "{name} est alors à {d} années-lumière du Soleil (modélisé) ; sa fiche et son étiquette donnent la distance d’aujourd’hui, {today}."
  },
  "varEvents": {
    "min": "{name} au minimum",
    "max": "{name} près de son plus grand éclat",
    "minLine": "Jusqu’à la magnitude {mag}, à {alt}° de hauteur vers le {dir}.",
    "maxLine": "Vers la magnitude {mag}, à {alt}° de hauteur vers le {dir}.",
    "minClass": "Daté d’après ses minima mesurés (Kreiner 2004), prolongés par sa période : juste au quart d’heure près environ.",
    "maxClass": "Modélisé d’après la période et l’époque du catalogue : les maxima d’une Mira arrivent des semaines en avance ou en retard.",
    "aria": "{title}, {when}. {line}"
  },
  "holeCompare": {
    "fromEarth": "Vu de la Terre",
    "fromEarthTitle": "Se placer sur la ligne du trou à la Terre, nord en haut et est à gauche, comme on imprime les images de l’EHT",
    "compare": "Comparer avec l’image de l’EHT",
    "compareTitle": "Afficher l’image de l’Event Horizon Telescope à côté du trou dessiné, tous deux vus de la Terre, nord en haut",
    "hide": "Masquer l’image de l’EHT",
    "caption": "EHT, {date}",
    "orient": "Nord en haut, est à gauche, comme le trou est dessiné maintenant.",
    "credit": "Images : EHT Collaboration, CC BY 4.0.",
    "source": "Source",
    "alt": "L’image de {name} par l’Event Horizon Telescope, {date} : un anneau de lumière orange autour d’un centre sombre.",
    "brightest": "Vu de la Terre, nord en haut, l’anneau dessiné est le plus brillant vers un angle de position d’environ {ours}° (mesuré sur le dessin) ; l’image de l’EHT du {date} l’est vers {theirs}°.",
    "approx": {
      "m87-star": "Ajusté : l’inclinaison (17° de notre ligne de visée) et l’angle du jet sur le ciel (288°) sont mesurés (Walker et al. 2018), et le flot tournant dans le sens horaire (EHT 2019, article V), le côté qui s’approche, avivé par son mouvement, tombe au sud. Mesuré en luminosité linéaire autour de l’anneau, notre côté brillant vaut environ 2,5 fois le côté faible (2,1 flouté aux 20 µas de l’EHT) ; le leur 2,7 en 2017 et 4,2 en 2018 : le nôtre correspond donc à 2017. Approché : la lumière est tracée comme autour d’un trou qui ne tourne pas, et le gaz est un disque mince en orbites circulaires, non le flot chaud et épais des modèles de l’EHT. Leur tache brillante s’est déplacée d’environ 30° en un an ; la nôtre ne bouge pas.",
      "sgr-a-star": "Ajusté : vu à 30° de son axe, comme les modèles les mieux ajustés de l’article V d’EHT 2022, tournant dans le sens horaire comme les sursauts vus par GRAVITY. Choisi : la direction de l’axe sur le ciel, que personne n’a mesurée ; il est tourné pour que le côté brillant tombe là où l’image de l’EHT est la plus brillante. Approché : la lumière est tracée autour d’un trou qui ne tourne pas, autour d’un disque mince ; l’image de l’EHT est une moyenne sur une nuit d’un flot qui change en quelques minutes, et ses trois nœuds brillants ne sont pas tous réels, disent ses auteurs. Notre côté brillant vaut environ cinq fois le côté faible (4,5 flouté aux 20 µas de l’EHT), le leur 1,7 : à 30°, les orbites circulaires avivent le côté proche bien plus que ne le montre la moyenne d’une nuit de l’EHT."
    }
  },
  "cardVoice": {
    "readTitle": "Lire cette fiche à voix haute : le texte cité de Wikipédia, avec la voix de synthèse des voyages",
    "credit": "Voix : Kokoro-82M (af_heart), une voix de synthèse, Apache-2.0 ; les mots sont ceux de Wikipédia (CC BY-SA 4.0)."
  }
});
// b200-c2-deep: end

// b200-s1-fixes: begin -- the long mission clock's units (copy/en.moments.js momentPlayer metYears, metDays), machine-drafted
COPY.momentPlayer.metYears = "{y} a {d} j";
COPY.momentPlayer.metDays = "{d} j";
COPY.truth.exoPacked = "notre copie compacte du {date}"; // forge #88: which list an exoplanet came from
COPY.truth.exoLive = "la liste de l’Archive, lue le {date}";
// b200-s1-fixes: end
// b200-f10-stars3d: begin -- the 3D star map's AT-HYG tier (copy/en.startiers.js, forge #140), machine-drafted
Object.assign(COPY, {
  "starTiers": {
    "unnamed": "Une étoile sans nom (AT-HYG {n})",
    "cite": "AT-HYG v4.0 (CC BY-SA 4.0, David Nash) : position et éclat de Tycho-2, distance {dist}",
    "from": {
      "gaia-dr3": "de Gaia DR3",
      "gaia-dr2": "de Gaia DR2",
      "hipparcos": "d’Hipparcos",
      "gliese": "du catalogue de Gliese",
      "other": "d’un catalogue plus ancien"
    },
    "error": "Distance juste à environ ±{pct} % (parallaxe sur son erreur, environ {poe}) : modélisée d’après l’erreur typique de la mission à cet éclat ({mas} milliseconde d’arc), car AT-HYG ne donne pas l’erreur propre de cette étoile",
    "noError": "AT-HYG ne donne aucune erreur pour cette distance",
    "guess": "Cette distance est une estimation : au-delà de 3 kpc (environ 10 000 années-lumière), une parallaxe ne fait que quelques dixièmes de milliseconde d’arc, et l’erreur propre de l’étoile n’est pas dans AT-HYG, qui ne garde qu’une parallaxe plus grande que son erreur",
    "lineHyg": "Étoiles en 3D : les 109 389 de HYG.",
    "lineAthyg": "Étoiles en 3D : les 109 389 de HYG et {n} millions d’AT-HYG, chargées autour de la caméra sur un barreau de l’échelle (jusqu’à {k} millions à la fois) et dessinées jusqu’à la magnitude {lim} vue de la caméra, plus faibles que ce que voit un œil, en s’estompant.",
    "shell": "Sur la scène d’un monde, les étoiles en 3D sont celles de HYG seules : {n} étoiles d’AT-HYG de magnitude 7,5 ou plus brillantes vues du Soleil n’y sont pas dessinées.",
    "why": {
      "low": "La qualité basse ne dessine que HYG.",
      "latched": "La cadence d’images était basse : HYG seulement.",
      "saver": "Économie de données : HYG seulement.",
      "none": ""
    },
    "gaiaHeld": "Gaia DR3 n’est pas un niveau : l’ESA ne licencie les données de son archive que pour un usage non commercial (CC BY-NC 3.0 IGO).",
    "farTime": "Les étoiles d’AT-HYG ne sont dessinées qu’à la date d’aujourd’hui : la vue des temps lointains n’utilise que HYG."
  }
});
// b200-f10-stars3d: end
// b200-s4a-look: begin -- how a world is drawn (its card's note), the Earth in a card's breadcrumb and our missions' event titles in the date field (copy/en.js worldView, sky.bodies; copy/en.find.js dateJump.eventTitles; 2.0.0 look finding 8) and what a tap no figure of another sky reaches says (copy/en.later.js skyLore; finding 10), machine-drafted
COPY.worldView.nearer = "La direction de {name} est la vraie, mais l’astre est dessiné plus près et plus grand qu’en réalité, pour que tu le trouves.";
COPY.worldView.asIs = "{name} est dessiné là où il est, à sa vraie taille.";
COPY.sky.bodies.earth = "Terre";
COPY.dateJump.eventTitles = {
  "Launch": "Lancement",
  "Closest to Jupiter": "Au plus près de Jupiter",
  "Closest to Saturn": "Au plus près de Saturne",
  "The Pale Blue Dot": "Le point bleu pâle",
  "The most distant thing we made": "L’objet le plus lointain que nous ayons fabriqué",
  "The termination shock": "Le choc terminal",
  "Into interstellar space": "Dans l’espace interstellaire",
  "Closest to Uranus": "Au plus près d’Uranus",
  "Closest to Neptune": "Au plus près de Neptune",
  "Jupiter's push": "L’élan de Jupiter",
  "Saturn's orbit": "L’orbite de Saturne",
  "Closest to Pluto": "Au plus près de Pluton",
  "Arrokoth": "Arrokoth",
  "Back past Earth": "De nouveau près de la Terre",
  "Into orbit round Jupiter": "En orbite autour de Jupiter",
  "Past Venus": "Près de Vénus",
  "Past Venus again": "De nouveau près de Vénus",
  "Past Jupiter": "Près de Jupiter",
  "Arrival at Saturn": "Arrivée à Saturne",
  "Huygens let go": "Huygens se détache",
  "Huygens lands on Titan": "Huygens se pose sur Titan",
  "Earth, seen from Saturn": "La Terre vue de Saturne",
  "The Grand Finale begins": "Le Grand Final commence",
  "Into Saturn": "Dans Saturne",
  "Out of the shuttle": "Hors de la navette",
  "The first asteroid visit": "La première visite d’un astéroïde",
  "Past Earth a second time": "Près de la Terre une deuxième fois",
  "Ida and its moon": "Ida et sa lune",
  "Into Jupiter": "Dans Jupiter",
  "Past Mars": "Près de Mars",
  "Into orbit round Vesta": "En orbite autour de Vesta",
  "Leaving Vesta": "Départ de Vesta",
  "Into orbit round Ceres": "En orbite autour de Cérès",
  "The last contact": "Le dernier contact",
  "Into the asteroid belt": "Dans la ceinture d’astéroïdes",
  "Past the farthest planet": "Au-delà de la planète la plus lointaine",
  "The last signal": "Le dernier signal",
  "The first craft at Saturn": "Le premier engin à Saturne",
  "Past the orbit of Neptune": "Au-delà de l’orbite de Neptune",
  "Arrival at L2": "Arrivée en L2",
  "The first pictures": "Les premières images",
  "Into orbit round the Moon": "En orbite autour de la Lune",
  "The Eagle has landed": "Eagle s’est posé",
  "One small step": "Un petit pas",
  "Leaving the Moon": "Départ de la Lune",
  "Splashdown": "Amerrissage",
  "Apollo 8 leaves for the Moon": "Apollo 8 part pour la Lune",
  "Apollo 11 leaves for the Moon": "Apollo 11 part pour la Lune",
  "Apollo 17, at night": "Apollo 17, de nuit",
  "Flying again": "De nouveau en vol",
  "Hubble goes up": "Hubble s’envole",
  "The last Shuttle from 39B": "La dernière navette depuis 39B",
  "Past Mathilde": "Près de Mathilde",
  "A first pass of Eros": "Un premier passage près d’Éros",
  "Into orbit round Eros": "En orbite autour d’Éros",
  "Down on Eros": "Posé sur Éros",
  "Through the coma of Wild 2": "À travers la chevelure de Wild 2",
  "The capsule lands": "La capsule atterrit",
  "Past Tempel 1": "Près de Tempel 1",
  "The impact": "L’impact",
  "Earth and Moon flyby": "Survol de la Terre et de la Lune",
  "Past Hartley 2": "Près de Hartley 2",
  "The course correction": "La correction de trajectoire",
  "Let go": "Largage",
  "Europa and Io, on the way in": "Europe et Io, à l’approche",
  "Into Jupiter’s air": "Dans l’atmosphère de Jupiter",
  "Landing in Jezero": "Atterrissage dans Jezero",
  "The first flight": "Le premier vol",
  "The first rock core": "La première carotte de roche",
  "Two become one": "Deux ne font plus qu’un",
  "People move in": "Les premiers occupants",
  "The last shuttle sets off": "La dernière navette s’envole",
  "Discovered": "Découverte",
  "Past Earth": "Près de la Terre",
};
// 2.0.0 look finding 10: a tap no figure of another people's sky reaches (copy/en.later.js skyLore)
COPY.skyLore.notHereTitle = "Aucune figure du ciel {culture} ici";
COPY.skyLore.notHere = "Aucune figure du ciel {culture} n’est dessinée là où tu as appuyé. La plus proche est {name}, à {deg}°.";
COPY.skyLore.notHereNone = "Aucune figure du ciel {culture} n’est dessinée là où tu as appuyé.";
COPY.skyLore.nearest = "L’histoire de {name}";
// b200-s4a-look: end

// redesign 2026-11-10: begin -- machine-drafted: the Games link of the explore panel (copy/en.js games), the rail's
// email updates (rail.subscribe), their popover and the row under Coming up (copy/en.subscribe.js emailUpdates;
// comingUp is the old subscribe.heading, moved)
COPY.rail.subscribe = "Nouvelles par e-mail";
COPY.rail.coffee = "Offre-nous un café";
COPY.rail.coffeeLabel = "Soutenir Space Radar sur Buy Me a Coffee";
COPY.games = {"label": "Jeux", "title": "Jeux spatiaux de l’équipe Space Radar (s’ouvre dans un nouvel onglet)", "href": "https://games.spaceradar.ai/"};
COPY.emailUpdates = {
  "title": "Nouvelles gratuites par e-mail",
  "text": "Choisis ce qui t’intéresse. Rien n’est envoyé avant ta confirmation.",
  "pick": "Choisis-en au moins une",
  "news": "Actualités de Space Radar",
  "journal": "Le Journal",
  "games": "Jeux spatiaux",
  "sky": "Alertes du ciel",
  "models": "Modèles de Space Radar",
  "video": "Vidéos de Space Radar",
  "email": "Adresse e-mail",
  "placeholder": "toi@example.org",
  "button": "S’abonner",
  "sending": "Envoi…",
  "retry": "Réessayer",
  "check": "Vérifie ta boîte de réception : nous avons envoyé un lien à {email}. Rien n’est envoyé avant que tu cliques dessus.",
  "invalidEmail": "Cette adresse ne semble pas correcte.",
  "rateLimited": "Trop d’essais depuis ici. Réessaie dans quelques minutes.",
  "busy": "Beaucoup d’inscriptions aujourd’hui. Réessaie demain.",
  "sendFailed": "Nous n’avons pas pu envoyer l’e-mail. Réessaie plus tard.",
  "invalidLists": "Choisis au moins une liste.",
  "other": "Un problème est survenu. Réessaie.",
  "unreachable": "Impossible de joindre le serveur.",
  "privacy": "Nous gardons ton adresse et les listes choisies, rien d’autre. Aucun pixel de suivi, aucun lien réécrit. Chaque e-mail permet de se désabonner en un clic.",
  "privacyLink": "Confidentialité",
  "honeypot": "Laisse ce champ vide",
  "close": "Fermer",
  "comingUp": "Ce qui arrive, par e-mail",
  "skyButton": "Recevoir les alertes du ciel"
};
// redesign 2026-11-10: end
