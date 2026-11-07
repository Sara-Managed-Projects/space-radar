// es: Spanish, the words of site/js/copy/en.js, en.later.js and en.facts.js (public #525, spec 0077 W1-e).
// Fetched by copy/index.js only when the page speaks Spanish (?lang=es). docs/TRANSLATING.md says how it was made.
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English, aiming at natural
// Spanish and not a word-for-word copy, and has NOT been read by a native speaker yet. Until a second native
// speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Spanish only to a visitor who asks for it (?lang=es), never from the browser's language.
// The checker prints this status in its table: node scripts/check-translation.mjs --table
//
// CHOICES, so a reviewer can disagree with them:
//   * One Spanish for everyone: neutral, plain words, the informal "tú" (the app talks to a curious fourteen-year-old).
//   * Honesty words, one word each, everywhere: medido (measured), calculado (worked out), modelado (modelled),
//     ilustrativo (illustrative), reconstruido (reconstructed), recreación artística (artist's impression),
//     muestra (sample). Every sentence that said how sure a thing is keeps its strength.
//   * The Sun, the Moon, the planets and the big moons take their Spanish names (Júpiter, Ío, Titán, Encélado);
//     spacecraft, stars, catalogue entries and agencies keep the name they have.
//   * "Aspecto" is the Look panel (Medido / Cine); "ficha" is a card; "viaje" is a trip; "parada" a stop.
//   * Numbers keep the app's own format (a narrow no-break space between groups of three digits, a point for the
//     decimal) because most of them are written by code that is shared by every language.
//   * The compass is written like the English one, with hyphens (nor-noreste, oeste-suroeste), and O is oeste.

export const META = {
  code: 'es',
  name: 'Español',
  english: 'Spanish',
  review: { status: 'machine-drafted', by: [], note: 'Needs a second native speaker (docs/TRANSLATING.md, Review).' },
};

// The grammar English had as code (copy/en.js `article`): Spanish needs the gender of a type word.
const FEMININE_E = new Set(['nave', 'noche', 'nube', 'fuente', 'luz', 'cruz', 'sonda', 'torre', 'clase']);
const MASCULINE_A = new Set(['día', 'mapa', 'planeta', 'cometa', 'sistema', 'programa', 'problema', 'tema', 'clima', 'diagrama', 'magnetar']);
// Star colours (COPY.templates.star.colours) are adjectives for "estrella", so they take "una".
const COLOURS = new Set(['azul', 'blanco-azulada', 'blanca', 'amarillo-blanquecina', 'amarilla', 'naranja', 'roja']);

export const RULES = {
  /** "un" or "una" for a Spanish type phrase, by its first word: "una galaxia", "un cúmulo estelar", "una nave espacial". */
  article(phrase) {
    const first = String(phrase || '').trim().toLowerCase().split(/\s+/)[0] || '';
    if (COLOURS.has(first)) return 'una';
    if (MASCULINE_A.has(first)) return 'un';
    if (FEMININE_E.has(first) || /(?:a|ión|dad|tud|umbre|ie)$/.test(first)) return 'una';
    return 'un';
  },
};

export const COPY = {
  app: {
    name: "Space Radar",
    bootSky: "Construyendo el cielo…",
    bootEarth: "Colocando la Tierra…",
    bootCatalogues: "Leyendo los catálogos…",
    tagline: "Todo lo que se mueve alrededor de la Tierra, donde está de verdad, ahora mismo.",
    sceneSelected: "Un mapa del espacio dibujado en posiciones reales; has seleccionado {name}: su ficha, en el panel junto al mapa, dice qué es."
  },
  compareText: {
    size: [
      "más o menos del tamaño de una tostadora",
      "más o menos del tamaño de una lavadora",
      "más o menos del tamaño de un coche",
      "más o menos del tamaño de un autobús",
      "más o menos del tamaño de una casa",
      "tan alto como un edificio de 15 plantas",
      "tan alto como un edificio de 25 plantas",
      "más o menos del tamaño de un campo de fútbol",
      "tan alto como una torre de 40 plantas",
      "más o menos del tamaño de un crucero",
      "tan alto como el edificio más alto de la Tierra",
      "más o menos del tamaño de una montaña pequeña",
      "más o menos del tamaño de una ciudad"
    ],
    magnitude: [
      "tan brillante como la Luna llena",
      "más brillante que cualquier estrella o planeta",
      "tan brillante como Venus",
      "tan brillante como las estrellas más brillantes",
      "tan brillante como una estrella corriente",
      "apenas visible desde un lugar oscuro",
      "demasiado débil para verse sin telescopio"
    ],
    speed: [
      "{n} km/h, la velocidad de una autopista",
      "{n} km/h, más o menos la velocidad de un avión de línea",
      "{n} km/h, más rápido que la bala de un rifle",
      "{n} km/h, unos {m} km cada minuto"
    ],
    driving: "a {n} km de altura, unas {h} {word} de coche si la carretera subiera en vertical",
    hour: "hora",
    hours: "horas",
    up: "a {n} km de altura",
    moon: "{ld} veces la distancia a la Luna",
    lightMinutes: "a {lt} minutos luz",
    lightHours: "a {lh} horas luz",
    compass: [
      "norte",
      "nor-noreste",
      "noreste",
      "este-noreste",
      "este",
      "este-sureste",
      "sureste",
      "sur-sureste",
      "sur",
      "sur-suroeste",
      "suroeste",
      "oeste-suroeste",
      "oeste",
      "oeste-noroeste",
      "noroeste",
      "nor-noroeste"
    ]
  },
  numberWords: ["ningún", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"],
  shell: {
    sideLabel: "Explorar",
    back: "Explorar",
    backLabel: "Volver a Explorar",
    backChevron: "‹",
    openChevron: "›",
    handleMark: "S",
    expand: "Mostrar el panel",
    collapse: "Ocultar el panel",
    topLabel: "Búsqueda y herramientas"
  },
  tabs: {
    label: "Dónde",
    earth: "Tierra",
    planets: "Planetas",
    stars: "Estrellas",
    tonight: "Esta noche"
  },
  rightNow: {
    title: "Ahora mismo",
    storms: "{n} tormentas en marcha; la más fuerte es {name}.",
    stormOne: "Hay una tormenta en marcha: {name}.",
    clouds: "Las nubes de hoy",
    people: "Gente en órbita",
    iss: "EEI",
    tiangong: "Tiangong",
    crewAt: "{n} en {name}"
  },
  statusLine: {
    reading: "Leyendo las fuentes",
    read: "{n} leídas en esta visita",
    readOne: "Una leída en esta visita",
    stale: "{n} desactualizadas",
    failed: "{n} no se pudieron leer",
    oldest: "la más antigua, {age}",
    open: "Abrir las fuentes",
    label: "{text}. Abrir las fuentes",
    offline: "Sin conexión: se muestran copias guardadas {age}",
    offlineNone: "Sin conexión: no hay copias guardadas en este dispositivo"
  },
  mission: {
    title: "Su misión",
    count: "{i} de {n}",
    navLabel: "Los hitos de {name}",
    prev: "Hito anterior",
    next: "Hito siguiente",
    when: "{date}, {time} UTC",
    predicted: "{when} (previsto)",
    go: "Ir a este momento",
    goTitle: "Poner el reloj en este momento y encuadrarlo",
    here: "El reloj está en este momento. «En vivo» lo devuelve al presente.",
    noteSite: "El mapa puede mostrar este lugar ese día, con la luz de ese día.",
    notePath: "El mapa guarda su trayectoria de ese día.",
    noteCruise: "No tenemos su trayectoria de ese día: {name} se dibuja sobre la línea recta hacia atrás desde donde se mide ahora, con un error de hasta una unidad astronómica.",
    noteNone: "El mapa no tiene la trayectoria de {name} de ese día, así que el reloj se queda donde está.",
    noteNoneWorld: "El mapa no tiene la trayectoria de {name} de ese día, así que el reloj se queda donde está. El mundo con el que se encontró sí se dibuja para cualquier fecha.",
    seeWorld: "Ver {world} ese día",
    seeWorldTitle: "Poner el reloj en ese día e ir a {world}. {name} no se dibuja allí",
    all: "Los {n} hitos",
    fewer: "Ocultar la lista",
    source: "Fechas y cifras: ",
    unknown: "Ese enlace nombra un hito que este mapa no tiene."
  },
  tripCard: {
    title: "Viajes",
    meta: "{n} paradas · {m} min",
    metaOne: "Una parada · {m} min",
    planning: "Preparando las paradas",
    starting: "Empezando…",
    cannotRun: "No se puede hacer ahora",
    offOne: "Un viaje no se puede hacer ahora",
    offMany: "{n} viajes no se pueden hacer ahora",
    offWhy: "{line}: {reason}",
    all: "Los {n} viajes",
    fewer: "Menos viajes",
    onItsOwn: "Reproducir solo",
    onItsOwnTitle: "Un viaje tras otro hasta que tomes los mandos",
    justWatch: "Solo mirar",
    reelLength: "{m} min por vuelta",
    drift: "Deriva",
    driftLength: "sin fin",
    driftTitle: "La cámara va de una cosa a la siguiente"
  },
  explore: {
    worldsTitle: "Los mundos",
    worldsDrawn: "Planetas como puntos, más grandes que en la realidad.",
    farTitle: "Lugares lejanos",
    systemsTitle: "Sistemas estelares",
    systemsMild: "Planetas cerca de la zona habitable",
    systemsExtreme: "Sistemas extremos",
    exoRow: "Planetas de otras estrellas",
    exoShow: "mostrar",
    exoHide: "ocultar",
    exoTitle: "Marca todas las estrellas con planetas conocidos",
    lightYears: "{n} a. l.",
    au: "{n} UA"
  },
  rail: {
    label: "Herramientas",
    show: "Qué mostrar (L)",
    share: "Compartir (P)",
    more: "Más herramientas",
    moreLabel: "Más",
    menuShare: "Compartir",
    menuHide: "Ocultar los paneles",
    menuGitHub: "Código en GitHub",
    blog: "Blog",
    blogHref: "https://blog.spaceradar.ai/",
    tour: "Hacer el recorrido",
    menuTour: "Hacer el recorrido"
  },
  timePill: {
    label: "Hora",
    when: "{date} {time} UTC",
    live: "EN VIVO · {when}",
    held: "{when} · detenido",
    away: "{when} · {off}",
    unknown: "Hora desconocida",
    prev: "‹",
    next: "›",
    prevTitle: "Atrás en el tiempo",
    nextTitle: "Adelante en el tiempo",
    backToLive: "En vivo",
    backToLiveTitle: "Volver a la hora real, ahora",
    rate: "{n}×",
    rateTitle: "Velocidad {n}×. Pulsa para {next}×",
    hold: "Clic para detener el tiempo, arrastra para moverte",
    run: "Clic para que corra el tiempo, arrastra para moverte",
    localTitle: "Tu hora: {time}, {zone}. {hold}",
    readLabel: "{text}. {hold}",
    units: {
      minute: "1 min",
      hour: "1 h",
      day: "1 día",
      event: "Hito"
    },
    unitWords: {
      minute: "un minuto",
      hour: "una hora",
      day: "un día",
      event: "un hito"
    },
    prevEvent: "El hito anterior",
    nextEvent: "El hito siguiente",
    noEventBack: "No hay ningún hito anterior en la línea de tiempo.",
    noEventOn: "No hay ningún hito posterior en la línea de tiempo.",
    moonMark: "La Luna está en fase {phase}, {date}",
    sunMark: "{what} donde estás, {date}",
    sunMarkGuess: "{what} en el lugar que hemos supuesto para ti, {date}",
    sunWords: {
      sunrise: "Amanecer",
      sunset: "Atardecer"
    },
    unitTitle: "Pasos de {unit}. Pulsa para {next}",
    tapeLabel: "Línea de tiempo. Arrástrala o usa las teclas de flecha",
    tapeTitle: "Arrastra para moverte por el tiempo",
    now: "ahora",
    nowTitle: "Volver a ahora",
    rough: "aproximado",
    roughTitle: "Pasada una semana desde ahora, el lugar de un satélite en su órbita es aproximado",
    roughSay: "Lejos de ahora, el lugar de un satélite es aproximado.",
    worlds: "Los planetas y las lunas se mantienen durante siglos.",
    markTitle: "{what}. Pulsa para ir allí",
    endTitle: "La línea de tiempo termina aquí: un mes atrás, un año adelante"
  },
  punctuation: {
    comma: ", ",
    dot: ".",
    separator: " · ",
    listJoin: ", ",
    dash: " — ",
    colon: ": ",
    ellipsis: "…",
    sentenceJoin: ". "
  },
  worlds: {
    sun: "el Sol",
    mercury: "Mercurio",
    venus: "Venus",
    earth: "la Tierra",
    moon: "la Luna",
    mars: "Marte",
    jupiter: "Júpiter",
    saturn: "Saturno",
    uranus: "Urano",
    neptune: "Neptuno",
    pluto: "Plutón",
    io: "Ío",
    europa: "Europa",
    ganymede: "Ganímedes",
    callisto: "Calisto",
    phobos: "Fobos",
    deimos: "Deimos",
    enceladus: "Encélado",
    titan: "Titán",
    triton: "Tritón",
    charon: "Caronte"
  },
  worldFacts: {
    cite: {
      pluto: "posición calculada con Astronomy Engine (Don Cross, licencia MIT), que sigue a Plutón bajo la atracción del Sol y de los planetas gigantes; radio de la ficha de Plutón en Wikipedia, qué es según NASA Science, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      io: "posición calculada con Astronomy Engine (Don Cross, licencia MIT): Júpiter, más la teoría L1.2 de sus lunas (Lainey, Duriez y Vienne); radio de la hoja de datos de los satélites jovianos de la NASA, qué es según NASA Science, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      europa: "posición calculada con Astronomy Engine (Don Cross, licencia MIT): Júpiter, más la teoría L1.2 de sus lunas (Lainey, Duriez y Vienne); radio de la hoja de datos de los satélites jovianos de la NASA, qué es según NASA Science, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      ganymede: "posición calculada con Astronomy Engine (Don Cross, licencia MIT): Júpiter, más la teoría L1.2 de sus lunas (Lainey, Duriez y Vienne); radio de la hoja de datos de los satélites jovianos de la NASA, qué es según NASA Science, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      callisto: "posición calculada con Astronomy Engine (Don Cross, licencia MIT): Júpiter, más la teoría L1.2 de sus lunas (Lainey, Duriez y Vienne); radio de la hoja de datos de los satélites jovianos de la NASA, qué es según NASA Science, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      phobos: "posición: Marte según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 6 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, brillo de la hoja de datos de Marte de la NASA, qué es y su color según NASA Science, todo consultado el 2026-09-22",
      deimos: "posición: Marte según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 120 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, brillo de la hoja de datos de Marte de la NASA, qué es y su color según NASA Science, todo consultado el 2026-09-22",
      enceladus: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 1 480 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, qué es y su color según NASA Science, cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      titan: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 840 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, qué es según NASA Science, el aterrizaje de Huygens, su color y cómo verlo según Wikipedia, todo consultado el 2026-09-22",
      triton: "posición: Neptuno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 10 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, qué es según NASA Science, su color y brillo según Wikipedia, todo consultado el 2026-09-22",
      charon: "posición: Plutón según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 1 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, brillo de la hoja de datos de Plutón de la NASA, qué es y su color según NASA Science, todo consultado el 2026-09-22",
      mimas: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 700 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Saturno de la NASA, qué es y su color según NASA Science, brillo según Wikipedia, todo consultado el 2026-09-22",
      tethys: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 120 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Saturno de la NASA, qué es según NASA Science, su color y brillo según Wikipedia, todo consultado el 2026-09-22",
      dione: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 240 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Saturno de la NASA, su color según NASA Science, qué es y su brillo según Wikipedia, todo consultado el 2026-09-22",
      rhea: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 200 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Saturno de la NASA, qué es y su color según NASA Science, brillo según Wikipedia, todo consultado el 2026-09-22",
      iapetus: "posición: Saturno según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 6 800 km entre 2000 y 2050, es decir, el 0.19 por ciento de su órbita; radio de los parámetros físicos de satélites del JPL, los dos albedos de la hoja de datos de los satélites de Saturno de la NASA, qué es y su color según NASA Science, brillo según Wikipedia, todo consultado el 2026-09-22",
      miranda: "posición: Urano según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 120 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Urano de la NASA, qué es según NASA Science, su color y brillo según Wikipedia, todo consultado el 2026-09-22",
      ariel: "posición: Urano según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 120 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Urano de la NASA, qué es y su color según NASA Science, brillo según Wikipedia, todo consultado el 2026-09-22",
      umbriel: "posición: Urano según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 410 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Urano de la NASA, qué es según NASA Science, su color y brillo según Wikipedia, todo consultado el 2026-09-22",
      titania: "posición: Urano según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 1 000 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Urano de la NASA, qué es y su color según NASA Science, brillo según Wikipedia, todo consultado el 2026-09-22",
      oberon: "posición: Urano según Astronomy Engine (Don Cross, licencia MIT), más una órbita ajustada a JPL Horizons y comprobada con ella con una diferencia de hasta 1 230 km entre 2000 y 2050; radio de los parámetros físicos de satélites del JPL, albedo de la hoja de datos de los satélites de Urano de la NASA, qué es según NASA Science, su color y brillo según Wikipedia, todo consultado el 2026-09-22"
    }
  },
  worldView: {
    withParent: "{parent} se dibuja {n} veces más ancho en el cielo de lo que se ve, para que puedas encontrarlo, y {name} se dibuja a su alrededor a la misma escala: su distancia a {parent} se ensancha en la misma proporción.",
    withParentFloor: "{name} se dibuja todavía más grande, porque si no sería demasiado pequeño para verse.",
    crowded: "{name} no se dibuja tan ancho: {near} está a solo {deg} grados en este cielo y un disco de ese tamaño lo taparía."
  },
  stars: {
    unnamed: "Una estrella sin nombre (HYG {n})"
  },
  systems: {
    mercuryRing: "La órbita de Mercurio, como escala"
  },
  ladder: {
    title: "A qué distancia",
    rowName: "{label}, {distance}",
    rowNameLoading: "{label}, cargando todavía",
    weShowTitle: "Lo que este mapa dibuja de lo que se conoce",
    weShowRow: "{n} {what} — de {of}",
    edge: "El borde del mapa",
    edgeHow: "volar hasta allí",
    edgeTitle: "Un solo vuelo desde aquí hasta el borde de lo que dibuja este mapa",
    home: "La Tierra",
    homeHow: "volver a casa",
    homeTitle: "Un solo vuelo desde aquí de vuelta a la Tierra",
    flightOff: "Desde aquí no: ve antes a Tierra, Planetas o Estrellas"
  },
  sceneNote: {
    refused: "No se pudieron leer los satélites.",
    refusedTitle: "No se pudo leer CelesTrak, que publica las órbitas, desde esta conexión. La Luna, los planetas, las estrellas y los viajes que no necesitan satélites siguen funcionando.",
    why: "Fuentes",
    close: "×",
    closeTitle: "Cerrar esta nota"
  },
  link: {
    unknownVersion: "Enlace de un mapa más nuevo. Se muestra la vista inicial.",
    unknownTrip: "Ese viaje ya no está en el mapa. Vista inicial.",
    unknownAt: "Ese objeto no está en el mapa; se muestra la vista inicial.",
    unknownStage: "No se puede centrar ahí. Se muestra la vista inicial."
  },
  share: {
    link: "Compartir",
    linkTitle: "Compartir esta vista: la postal, el enlace y unas líneas sobre ella",
    title: "Compartir",
    close: "Cerrar",
    pictureAlt: "La postal: esta vista dibujada de nuevo a tamaño de impresión, con su pie de foto",
    drawing: "Dibujando la postal…",
    noPicture: "No se pudo dibujar la postal en este momento.",
    withTag: "Etiqueta en la selección",
    linkLabel: "Enlace",
    copyLink: "Copiar el enlace",
    textLabel: "Texto",
    lookingUp: "Buscándolo en Wikipedia…",
    wikiSource: "El artículo de Wikipedia que se cita",
    noWiki: "Sin texto de Wikipedia: publicación más corta.",
    attribution: "De Wikipedia, CC BY-SA 4.0",
    native: "Compartir…",
    nativeTitle: "El menú de compartir de tu propio dispositivo, con la postal donde admita una imagen",
    nativeFailed: "No se abrió «Compartir»; copia o descarga",
    copy: "Copiar el texto",
    copyTitle: "Copiar el texto y el enlace, listos para pegar en una publicación",
    copied: "Texto y enlace copiados",
    linkCopied: "Enlace copiado",
    copyRefused: "No se pudo copiar; el texto queda seleccionado",
    jpeg: "Descargar JPEG",
    jpegTitle: "Guardar la postal como imagen JPEG, de 6 por 4 pulgadas a 300 puntos por pulgada",
    pdf: "Descargar PDF",
    pdfTitle: "Guardar la postal como PDF de una página, de 6 por 4 pulgadas, para imprimir",
    email: "Correo",
    emailTitle: "Escribir un correo con el texto y el enlace",
    emailNote: "Sin imagen por correo: «Compartir…» o descarga.",
    networksLabel: "Publicar en",
    networkTitle: "Abrir {network} con esta publicación, en una pestaña nueva",
    networkLabel: "Publicar en {network}",
    networks: {
      x: "X",
      facebook: "Facebook",
      linkedin: "LinkedIn",
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      reddit: "Reddit"
    },
    subject: "{name}, en Space Radar",
    failed: "No se pudo abrir el menú de compartir en este momento",
    mark: "spaceradar.ai",
    photo: "Modo foto",
    photoTitle: "Componer una imagen: todo oculto, un marco y un pie de foto",
    embed: "Insertar",
    embedTitle: "Copiar el código que inserta esta vista en vivo en una página web",
    embedCopied: "Código de inserción copiado",
    embedRefused: "No se permitió copiar en este momento",
    embedFrameTitle: "{name}, en vivo en Space Radar",
    textRow: "Texto de la publicación"
  },
  embed: {
    open: "Abrir en Space Radar",
    openTitle: "Abrir esta vista en el mapa completo, en una pestaña nueva",
    barLabel: "Space Radar, insertado",
    stationUnread: "Se muestra la Tierra: no se pudo leer la posición de la estación"
  },
  density: {
    panelTitle: "Densidad",
    regular: "Normal",
    compact: "Compacta",
    auto: "Automática",
    autoCompact: "Compacta ahora, porque esta ventana es baja.",
    autoRegular: "Normal ahora; Compacta con ventana de 800 px de alto o menos"
  },
  nextList: {
    justHappened: "Acaba de ocurrir",
    justHappenedTitle: "Lanzamientos y reentradas de los últimos siete días",
    calendar: "Calendario",
    calendarTitle: "Añadir «{title}» a tu calendario: descarga un archivo .ics",
    calendarSaved: "Guardado: {file}",
    calendarFailed: "No se pudo crear el archivo de calendario",
    sameName: "{name} ({id})",
    title: "Próximamente",
    showAll: "Mostrar los {n}",
    showFewer: "Mostrar menos",
    now: "más o menos ahora",
    inMinutes: "en {n} minutos",
    inHours: "en {n} horas",
    todayAt: "hoy a las {time}",
    tomorrowAt: "mañana a las {time}",
    launch: "{name} despega {when}",
    launchRough: "{name} despega {when}, más o menos: la fecha aún no está fijada",
    approach: "{name} pasa junto a la Tierra {when}, a {ld} veces la distancia de la Luna",
    approachNoDistance: "{name}: paso cercano {when}",
    sizeM: "Mide {n} m de ancho",
    sizeKm: "Mide {n} km de ancho",
    sizeRangeM: "Entre {lo} y {hi} m de ancho, estimado por su brillo",
    sizeRangeKm: "Entre {lo} y {hi} km de ancho, estimado por su brillo",
    sizeMixed: "Entre {lo} m y {hi} km de ancho, estimado por su brillo",
    perihelion: "{name} está lo más cerca del Sol {when}",
    pass: "{name} pasa sobre ti {when}",
    train: "Un tren de {n} satélites pasa sobre ti {when}",
    aurora: "NOAA prevé {word}, {when} (Kp {kp})",
    auroraNow: "Hay una tormenta geomagnética en marcha: {word} (Kp {kp})",
    shower: "La lluvia de meteoros {name} alcanza su máximo hacia el {date}, con hasta {zhr} por hora bajo un cielo oscuro",
    showerMoon: "La lluvia de meteoros {name} alcanza su máximo hacia el {date}, con hasta {zhr} por hora bajo un cielo oscuro, y esa noche la Luna estará iluminada al {pct}%",
    showerNoMoon: "La lluvia de meteoros {name} alcanza su máximo hacia el {date}, con hasta {zhr} por hora bajo un cielo oscuro, y la Luna estará casi nueva",
    radiantHigh: "Desde donde estás, su radiante está más alto hacia las {time}",
    radiantLow: "Desde donde estás, su radiante se queda bajo toda la noche, así que cuenta con muchos menos",
    radiantNeverUp: "Desde donde estás, su radiante se queda bajo el horizonte esa noche",
    eclipseKinds: {
      total: "total",
      annular: "anular",
      partial: "parcial",
      hybrid: "híbrido",
      penumbral: "penumbral"
    },
    solarEclipseTitle: "Eclipse solar {kind}",
    lunarEclipseTitle: "Eclipse lunar {kind}",
    solarEclipse: "Eclipse solar {kind} el {date}: la sombra de la Luna cae con más fuerza {where}",
    solarEclipseGrazing: "Eclipse solar {kind} el {date}, visible solo desde el extremo norte o el extremo sur",
    lunarEclipse: "Eclipse lunar {kind} el {date}, con la Luna en la sombra de la Tierra para todos los que pueden verla",
    lunarEclipsePenumbral: "Eclipse lunar {kind} el {date}: la Luna solo se atenúa un poco, en la penumbra de la Tierra",
    seasonTitles: {
      march: "Equinoccio de marzo",
      june: "Solsticio de junio",
      september: "Equinoccio de septiembre",
      december: "Solsticio de diciembre"
    },
    seasons: {
      march: "Equinoccio de marzo el {date}: el día y la noche duran casi lo mismo en todas partes",
      june: "Solsticio de junio el {date}: el día más largo en el norte y el más corto en el sur",
      september: "Equinoccio de septiembre el {date}: el día y la noche duran casi lo mismo en todas partes",
      december: "Solsticio de diciembre el {date}: el día más largo en el sur y el más corto en el norte"
    },
    solstice: "{title} el {date}",
    equinox: "{title} el {date}",
    eclipseNear: "cerca de {city}",
    eclipseFrom: "a unos {km} km de {city}",
    eclipseLocal: "Desde tu lugar: de {begin} a {end}, máximo a las {peak} con el {pct}% del Sol cubierto",
    eclipseLocalTotal: "Desde tu lugar: de {begin} a {end}, totalidad a las {peak}",
    eclipseNotVisible: "No se ve desde donde estás",
    eclipseBelowHorizon: "Desde donde estás, el Sol está bajo el horizonte mientras ocurre",
    classOf: {
      launch: "Un plan: la hora a la que apunta quien realiza el lanzamiento, que puede cambiar",
      approach: "Calculado por el JPL de la NASA a partir de la órbita medida del asteroide",
      perihelion: "Calculado a partir de la órbita publicada del cometa",
      shower: "La fecha habitual de cada año; el máximo varía en torno a un día",
      aurora: "Pronóstico de NOAA, de tres en tres horas",
      auroraNow: "Medido por NOAA en las últimas horas",
      pass: "Calculado aquí a partir de elementos orbitales medidos {age}",
      passNoAge: "Calculado aquí a partir de elementos orbitales",
      eclipse: "Calculado aquí al minuto a partir del movimiento del Sol y de la Luna",
      season: "Calculado aquí al minuto a partir de dónde está el Sol",
      conjunction: "Calculado aquí para tu lugar, en su máximo acercamiento mientras ambos están sobre el horizonte en la oscuridad"
    },
    row: {
      conjunctionTitle: "{a} y {b}",
      conjunction: "{when} · separados {sep}°, {height}, hacia el {dir}",
      conjunctionValue: "{sep}°",
      low: "cerca del horizonte",
      mid: "a media altura",
      high: "alto en el cielo",
      launch: "Despega {when} · previsto",
      launchRough: "Más o menos {when} · fecha sin fijar",
      approach: "Paso cercano {when}",
      approachValue: "{ld}× la Luna",
      approachSized: "Paso cercano {when} · {size}",
      sizeM: "{n} m",
      sizeKm: "{n} km",
      sizeRangeM: "unos {lo} a {hi} m",
      sizeRangeKm: "unos {lo} a {hi} km",
      perihelion: "Lo más cerca del Sol {when}",
      pass: "Pasa sobre ti {when}",
      trainTitle: "Tren de {n} Starlink",
      auroraTitle: "Pronóstico de auroras",
      auroraNowTitle: "Tormenta geomagnética ahora",
      aurora: "Pronóstico de NOAA, {when}",
      auroraNow: "Medido por NOAA en las últimas horas",
      kp: "Kp {kp}",
      showerTitle: "Meteoros {name}",
      shower: "Máx. {date} · hasta {zhr}/h",
      eclipse: "{date} · calculado al minuto",
      eclipseHere: "{date} · desde aquí, de {begin} a {end}",
      eclipseNotHere: "{date} · no se ve desde aquí"
    },
    none: "Nada próximo en lo que se ha cargado.",
    notLoaded: "Sin cargar, y por eso sin listar: {layers}."
  },
  groundTrack: {
    tick: "+{n} min",
    label: "Seguirlo",
    rideAlong: "Acompañarlo",
    rideAlongTitle: "Pone la cámara justo detrás, mirando hacia delante a lo largo de su trayectoria. Arrastra para parar.",
    lookBeside: "Mirar desde un lado",
    showTrack: "Dibujar su traza sobre la Tierra",
    hideTrack: "Ocultar su traza sobre la Tierra",
    highNote: "A esta altura no se dibuja por sí sola su traza sobre la Tierra: apenas se mueve.",
    trackNote: "La línea del globo es el suelo que tiene debajo: 45 minutos atrás (a trazos) y 90 por delante, con una marca cada 5 minutos."
  },
  spaceWeather: {
    level: "Kp {kp}, {word}",
    levelWithScale: "Kp {kp}, {word} ({scale})",
    measured: "Clima espacial: {level} — medido {age}, {via}.",
    forecastOnly: "Clima espacial: {level} — un pronóstico, no una medición; {via}.",
    stale: "Esa lectura es más antigua de lo que NOAA promete; tómala como una estimación.",
    stormComing: "NOAA prevé que suba a Kp {kp}.",
    couldNotLook: "Clima espacial: no se pudo consultar — {why}",
    couldNotLook0: "Clima espacial: no se pudo consultar.",
    justNow: "ahora mismo",
    currentBin: "para el periodo actual de tres horas",
    aMinuteAgo: "hace un minuto",
    minutesAgo: "hace {n} minutos",
    anHourAgo: "hace una hora",
    hoursAgo: "hace {n} horas",
    aDayAgo: "hace un día",
    daysAgo: "hace {n} días",
    ageUnknown: "en un momento que NOAA no indicó",
    viaLive: "NOAA SWPC, leído en vivo",
    viaSnapshot: "NOAA SWPC, de nuestra copia",
    words: {
      unknown: "sin lectura",
      quiet: "calma",
      unsettled: "inestabilidad",
      active: "actividad",
      minorStorm: "una tormenta menor: auroras posibles en el extremo norte y el extremo sur",
      moderateStorm: "una tormenta moderada: auroras probables en latitudes altas",
      strongStorm: "una tormenta fuerte: auroras lejos de los polos y satélites desviados de su rumbo",
      severeStorm: "una tormenta severa",
      extremeStorm: "una tormenta extrema"
    }
  },
  chooser: {
    label: "Lo que hay bajo tu dedo",
    hint: "{n} aquí. Toca uno, o toca el cielo para cerrar."
  },
  card: {
    photoCredit: "{credit} · {licence}",
    close: "Cerrar",
    closeTitle: "Cerrar esta ficha (Escape)",
    it: "Esto",
    articles: ["El", "el"],
    leadVerbs: ["es", "fue"],
    makeCentre: "Hacer de {name} el centro del mapa",
    isCentre: "Este es el centro del mapa",
    centreShort: "Centrar el mapa aquí",
    ownPage: "Su propia página",
    ownPageTitle: "Una página sobre él a la que puedes enlazar, en una pestaña nueva",
    isCentreShort: "Centrado aquí",
    comparisonsLabel: "Para hacerte una idea",
    rightNowLabel: "Ahora mismo",
    seeItLabel: "Verlo desde aquí",
    actionsLabel: "Lo que puedes hacer",
    unknownName: "Objeto sin nombre",
    unknownKind: "{name} está en el mapa, pero no sabemos qué tipo de objeto es",
    rows: {
      altitude: "Altura sobre el suelo",
      speed: "Velocidad",
      groundPoint: "Sobrevolando",
      below: "Debajo ahora",
      fromYou: "Distancia a ti",
      fromGuess: "Distancia a {place}, lo que suponemos que es tu lugar",
      distanceFromEarth: "Distancia a la Tierra",
      distanceFromSun: "Distancia al Sol",
      lightLeft: "Su luz partió",
      sunlight: "Ahora mismo está",
      hostStar: "Su estrella",
      across: "Ancho",
      mass: "Masa",
      spin: "Una vuelta tarda",
      source: "Leído de",
      whySource: "Por qué se conoce, leído de",
      widthSource: "Ancho leído de",
      distanceNote: "Más o menos esa distancia",
      objectType: "Qué es",
      constellation: "Constelación",
      distanceRange: "Distancia, mejores estimaciones",
      planetRadius: "Ancho, en Tierras",
      planetMass: "Masa, en Tierras",
      yearLength: "Un año allí",
      found: "Descubierto",
      catalogueCopy: "Copia del catálogo",
      spectralType: "Tipo de estrella",
      brightness: "Brillo aparente",
      luminosity: "Luz que emite",
      starWidth: "Ancho",
      catalogue: "Catálogo",
      lightTime: "Tiempo de radio en cada sentido",
      nextPass: "Próximo paso sobre ti",
      crew: "Personas a bordo",
      operator: "Operado por",
      launched: "Lanzado",
      ended: "Terminó",
      pathEnds: "Su trayectoria termina",
      pathBegins: "Su trayectoria empieza",
      period: "Una vuelta tarda",
      location: "Dónde está",
      onWorld: "Sobre",
      orbiting: "En órbita alrededor de",
      heightAbove: "Altura sobre {world}",
      closestApproach: "Lo más cerca de la Tierra",
      moons: "Lunas",
      perihelion: "Lo más cerca del Sol",
      magnitude: "Brillo",
      phase: "Fase",
      liftoff: "Despegue",
      pad: "Desde",
      destination: "Rumbo a",
      whereabouts: "Dónde está",
      lastSeen: "Último dato conocido",
      stormNow: "En el último aviso",
      stormWind: "Viento más fuerte en su trayectoria",
      stormAdvisory: "Último aviso",
      stormCentre: "Su centro",
      stormAgency: "Aviso de",
      stormAlert: "Nivel de alerta de GDACS"
    },
    values: {
      km: "{n} km",
      kmh: "{n} km/h",
      belowBorder: "cerca de la frontera entre {a} y {b}",
      belowLand: "tierra firme",
      belowWater: "mar abierto",
      stormWind: "{n} km/h, incluida la previsión",
      stormWindCategory: "{n} km/h, categoría {cat}, incluida la previsión",
      stormAdvisory: "{time} UTC, {ago}",
      stormAdvisoryDated: "{date}, {time} UTC, {ago}",
      stormStatus: {
        hurricane: "intensidad de huracán",
        typhoon: "intensidad de tifón",
        cyclone: "intensidad de ciclón",
        storm: "tormenta tropical",
        depression: "depresión tropical"
      },
      stormAlert: {
        green: "verde",
        orange: "naranja",
        red: "rojo"
      },
      launchedAgo: "hace {n} días, el {date}",
      au: "{n} UA",
      lightYears: "{n} años luz",
      inSunlight: "a la luz del Sol",
      inShadow: "en la sombra de la Tierra",
      yearsAgo: "hace {n} años",
      monthsAgo: "hace {n} meses",
      suns: "{n} veces el Sol",
      sunsWide: "{n} veces el Sol, estimado",
      sunsWideMeasured: "{n} veces el Sol, medido",
      earths: "{n} veces la Tierra",
      lightYearsRange: "de {lo} a {hi} años luz",
      kmRange: "de {lo} a {hi} km",
      noMoonsKnown: "ninguna conocida",
      sunsRange: "de {lo} a {hi} veces el Sol",
      millionSuns: "{n} millones de Soles",
      billionSuns: "{n} mil millones de Soles",
      milliseconds: "{n} milisegundos",
      billionYearsAgo: "hace {n} mil millones de años",
      millionYearsAgo: "hace {n} millones de años",
      days: "{n} días",
      hours: "{n} h",
      yearByMethod: "{year}, {method}",
      asOf: "a fecha de {date}",
      magnitude: "magnitud {n}",
      lunar: "{n} veces la distancia a la Luna",
      minutes: "{n} min",
      seconds: "{n} s",
      degrees: "{n}°",
      people: "{n}",
      latLon: "{lat}, {lon}",
      latLonOn: "{lat}, {lon} en {world}",
      north: "{n}° N",
      south: "{n}° S",
      east: "{n}° E",
      west: "{n}° O"
    },
    couldNotLook: "No se pudo calcular",
    nobodyKnows: "Nadie lo sabe",
    wouldNeed: "Haría falta {wouldNeed}.",
    endedLine: "Su misión terminó el {date}. Sus hitos, más abajo, te llevan de vuelta a ella.",
    pathEndedLine: "La trayectoria que guarda el JPL termina el {date}. Sus hitos, más abajo, te llevan de vuelta a ella.",
    pathBeginsLine: "La trayectoria que guarda el JPL empieza el {date}. Sus hitos, más abajo, te llevan de vuelta a ella.",
    actions: {
      flyTo: "Ir allí",
      flyToTitle: "Mover la cámara a este objeto",
      flyEnded: "Terminó el {date}. Elige un hito de su misión para ir allí",
      flyPathEnded: "Su trayectoria termina el {date}. Elige un hito de su misión para ir allí",
      flyPathBegins: "Su trayectoria empieza el {date}. Elige un hito de su misión para ir allí",
      flyNowhere: "Este objeto no tiene posición en este momento",
      seeFromHere: "Verlo desde aquí",
      seeFromHereTitle: "Mirar hacia arriba desde tu propio lugar de la Tierra",
      follow: "Seguir",
      followTitle: "Volar hasta él y mantenerlo en el centro de la vista",
      ride: "Acompañarlo",
      rideShort: "Acompañar",
      seeShort: "Verlo",
      postcard: "Postal",
      share: "Compartir"
    },
    micro: "{klass} · {regime}",
    microKlass: {
      planet: "Planeta",
      moon: "Luna",
      dwarf: "Planeta enano",
      ourStar: "Estrella",
      exoplanet: "Exoplaneta"
    },
    regime: {
      leo: "Órbita terrestre baja",
      meo: "Órbita terrestre media",
      geo: "Órbita geoestacionaria",
      heo: "Órbita terrestre alta",
      inner: "Sistema solar interior",
      outer: "Sistema solar exterior",
      belt: "Cinturón de asteroides",
      beyondNeptune: "Más allá de Neptuno",
      round: "Alrededor de {world}",
      inCon: "En {con}",
      onWorld: "En {world}",
      centre: "Centro del sistema solar",
      nearby: "Entre los más cercanos"
    },
    hero: {
      label: "En tres números",
      missing: "—",
      captions: {
        altitude: "{u} de altura",
        away: "a {u}",
        speed: "{u}",
        period: "{u} por vuelta",
        distanceFromSun: "{u} del Sol",
        distanceFromEarth: "{u} de la Tierra",
        lightTime: "{u} en cada sentido",
        spin: "{u} por vuelta",
        yearLength: "{u} por año",
        brightness: "magnitud",
        spectralType: "clase de estrella",
        across: "{u} de ancho",
        lightLeft: "a {u}",
        launched: "días en el espacio",
        fromYou: "a {u} de ti",
        heightAbove: "{u} de altura",
        other: "{u}"
      },
      units: {
        minutes: "min",
        hours: "h",
        days: "días",
        seconds: "s",
        milliseconds: "ms",
        "astronomical units": "UA",
        "light-years": "a. l.",
        "years ago": "a. l.",
        "million years ago": "millones de a. l.",
        "billion years ago": "miles de millones de a. l.",
        "months ago": "meses luz"
      }
    },
    sections: {
      label: "Más sobre él",
      see: "Cuándo puedes verlo",
      path: "Su trayectoria",
      aboard: "Quién está a bordo",
      ridingOn: "Sobre qué viaja",
      about: "Sobre él",
      sources: "Fuentes de este registro",
      placeGuessed: "lugar supuesto",
      needsPlace: "necesita tu lugar",
      passAt: "{time} UTC"
    }
  },
  sun: {
    spots: "Se dibujan {n} grupos de manchas solares, de la lista de NOAA del {date}: cada uno como una mancha redonda en el lugar y con el tamaño comunicados, desplazada desde entonces por el giro del Sol.",
    spotsOne: "Se dibuja un grupo de manchas solares, de la lista de NOAA del {date}: como una mancha redonda en el lugar y con el tamaño comunicados, desplazada desde entonces por el giro del Sol.",
    spotsPaired: "Se dibujan {n} grupos de manchas solares, de la lista de NOAA del {date}, desplazados desde entonces por el giro del Sol. {pairs} con varias manchas se dibujan como una mancha líder al oeste y una mancha seguidora al este; la separación y cómo se reparte el área entre las dos son ilustrativas. El resto son una sola mancha redonda.",
    spotsPairedOne: "Se dibuja un grupo de manchas solares, de la lista de NOAA del {date}, desplazado desde entonces por el giro del Sol: como una mancha líder al oeste y una mancha seguidora al este. La separación y cómo se reparte el área entre las dos son ilustrativas.",
    regionsCredit: "Grupos de manchas solares de hoy: NOAA Space Weather Prediction Center, resumen de regiones solares",
    flaresCredit: "Llamaradas solares: NOAA Space Weather Prediction Center, lista editada de eventos",
    cmeCredit: "Eyecciones de masa coronal: NASA DONKI (Moon to Mars Space Weather Analysis Office y CCMC)"
  },
  clouds: {
    live: "Nubes: vistas {when}, {ago}, en infrarrojo por {satellites}, a través de NASA GIBS. Las cimas más frías, donde hay tormentas, se dibujan más altas y más blancas que el resto. Sobre Europa, África, el océano Índico y los polos, que ninguno de esos satélites ve, son ilustrativas.",
    at: "a las {time} UTC",
    between: "entre las {from} y las {to} UTC",
    atDated: "el {date} a las {time} UTC",
    betweenDated: "el {date} entre las {from} y las {to} UTC",
    clockElsewhere: " El reloj marca las {time} UTC del {date}; las nubes siguen como las vio esa imagen.",
    and: " y ",
    illustrative: "Nubes: ilustrativas. Es una sola imagen de un día pasado, que se desplaza despacio; no es el tiempo de hoy.",
    illustrativeSaveData: "Nubes: ilustrativas. Las imágenes de satélite de hoy no se descargan en una conexión que ahorra datos.",
    illustrativeScrubbed: "Nubes: ilustrativas, porque el reloj está a más de 12 horas de la imagen de satélite más reciente, del {date} a las {time} UTC.",
    gibsAcknowledgement: "Reconocemos el uso de imágenes proporcionadas por los servicios Global Imagery Browse Services (GIBS) de la NASA, parte del sistema de datos e información de ciencias de la Tierra (ESDIS) de la NASA.",
    satelliteCredit: "Nubes en vivo: imágenes infrarrojas de GOES-East y GOES-West, NOAA; imágenes infrarrojas de Himawari, Agencia Meteorológica de Japón (JMA)."
  },
  aurora: {
    live: "Aurora: donde el modelo OVATION de NOAA la espera en la próxima hora (su pronóstico para las {time} UTC, hecho {ago}), no una fotografía. Los pliegues finos están dibujados.",
    liveNoFolds: "Aurora: donde el modelo OVATION de NOAA la espera en la próxima hora (su pronóstico para las {time} UTC, hecho {ago}), no una fotografía.",
    waiting: "Aurora: el pronóstico de NOAA aún no ha llegado.",
    failed: "Aurora: no se pudo leer el pronóstico de NOAA en este momento, así que no se dibuja ninguna.",
    far: "Aurora: no se dibuja, porque el reloj está a más de tres horas del último pronóstico de NOAA.",
    saveData: "Aurora: el pronóstico de NOAA no se descarga en una conexión que ahorra datos.",
    switchedOff: "Aurora: desactivada en las capas.",
    credit: "Aurora: pronóstico del modelo OVATION Prime del NOAA Space Weather Prediction Center (dominio público).",
    rightNow: "Aurora probable cerca de los polos",
    rightNowReach: "Aurora probable hasta los {lat}° de latitud",
    rightNowValue: "Kp {kp}",
    showMe: "Volar hasta la aurora del lado nocturno"
  },
  weather: {
    lightning: {
      live: "Rayos: unas {n} descargas por minuto donde llega el mapa de NOAA, en América y el Pacífico (su recuento hasta las {time}, {ago}). Dónde caen y con qué frecuencia es un dato medido; el instante de cada destello está dibujado, y más grande que en la realidad.",
      quiet: "Rayos: casi ninguno donde llega el mapa de NOAA, en América y el Pacífico (su recuento hasta las {time}, {ago}).",
      waiting: "Rayos: el mapa de NOAA aún no ha llegado.",
      failed: "Rayos: no se pudo leer el mapa de NOAA en este momento, así que no se dibuja ninguno.",
      away: "Rayos: no se dibujan, porque el reloj está a más de una hora del último mapa de NOAA.",
      off: "Rayos: no se descargan en este dispositivo ni con esta conexión.",
      reducedMotion: "Rayos: no se dibujan, porque este dispositivo pide menos movimiento.",
      switchedOff: "Rayos: desactivados en las capas.",
      credit: "Rayos: densidad de descargas de NOAA nowCOAST, elaborada por el Ocean Prediction Center del NWS a partir de las redes terrestres NLDN y GLD360 (dominio público)."
    },
    worlds: {
      jupiter: "Clima: las bandas se deslizan unas junto a otras a las velocidades del viento medidas desde Hubble, y la Gran Mancha Roja gira. Movimiento modelado: no se dibuja ninguna nube donde está hoy.",
      saturn: "Clima: las bandas se mueven a las velocidades del viento que midió Cassini. Movimiento modelado, no las nubes de hoy. El hexágono del polo norte se dibuja en su lugar medido; su aspecto es ilustrativo.",
      venus: "Clima: la capa de nubes da la vuelta en unos cuatro días, como midió Venus Express, sesenta veces más rápido que el suelo. Movimiento modelado, no las nubes de hoy.",
      uranus: "Clima: el aire gira a las velocidades del viento medidas desde Keck y Gemini. Movimiento modelado, no las nubes de hoy.",
      neptune: "Clima: el aire fluye alrededor del planeta a las velocidades del viento que midió la Voyager 2, las más rápidas de cualquier planeta. Movimiento modelado, no las nubes de hoy.",
      mars: "Clima: en Marte es {season}. Los casquetes de escarcha y el polvo del aire, con una profundidad óptica cercana a {tau}, son lo que esa estación suele traer: estacional e ilustrativo, no el tiempo de hoy.",
      titan: "Clima: las vetas pálidas del norte representan las nubes de metano que los telescopios Webb y Keck vieron allí en noviembre de 2022 y julio de 2023. Ilustrativo: no se sabe dónde están hoy las nubes de Titán."
    },
    also: {
      venus: "La Y oscura que gira con ella es lo que ven las cámaras ultravioleta; a simple vista Venus es casi lisa, y el lugar de la Y aquí es ilustrativo. Se han comunicado rayos en Venus y aún se debate; no se dibuja ninguno.",
      uranus: "El casquete brillante sobre el polo norte es real: su brillo y su color, latitud por latitud, se toman del mapa de Hubble de octubre de 2025, y Hubble lo ha visto aclararse año tras año a medida que se acerca el verano boreal de 2028.",
      neptune: "El óvalo oscuro del mapa del artista es la Gran Mancha Oscura de la Voyager 2 de 1989, desaparecida en 1994: ilustrativo, no se dibuja en el aspecto Medido. En el aspecto Cine, los cirros de metano proyectan sombras, dibujadas seis veces más anchas y más altas de lo medido; cada veta la hemos dibujado nosotros."
    },
    flashes: {
      jupiter: "En su lado nocturno, destellos poco frecuentes representan los rayos que encontró Juno, casi todos en el lejano norte: las latitudes son medidas, cada destello es ilustrativo y se dibuja más grande que en la realidad.",
      saturn: "En su lado nocturno, destellos poco frecuentes a 36 grados sur representan los rayos que Cassini fotografió allí en 2009: ilustrativos y más grandes que en la realidad, y ahora nada los vigila."
    },
    seasons: ["primavera boreal", "verano boreal", "otoño boreal", "invierno boreal"]
  },
  drawing: {
    orbitLine: "La línea es una vuelta por delante, calculada con los mismos elementos que el punto.",
    orbitLineYear: "La línea es el próximo año de su trayectoria, calculado con los mismos elementos que el punto.",
    orbitLineWhole: "La línea es toda su órbita alrededor del Sol, calculada con los mismos elementos que el punto.",
    orbitLinePassage: "La línea es su único paso por el sistema solar, de entrada y de salida, calculado con los mismos elementos que el punto.",
    variant: "se dibuja con las dimensiones publicadas de {name}",
    family: "se dibuja como {name}: la forma y la altura de la familia, no esta versión exacta",
    generic: "se dibuja como un cohete genérico; no tenemos las dimensiones de {name}",
    genericUnnamed: "se dibuja como un cohete genérico; no tenemos las dimensiones de este vehículo",
    disputed: "las fuentes no coinciden en su altura ({disputed})",
    objectVariant: "se dibuja con las dimensiones publicadas de {name}",
    objectModel: "se dibuja a partir de un modelo publicado de {name}",
    padEmpty: "la plataforma es un lugar medido; {name} se dibuja sobre ella solo en torno a los lanzamientos de la lista",
    objectMapped: {
      dawn: "su superficie es el mosaico en blanco y negro de la nave Dawn, teñido de un gris que hemos elegido nosotros; las sombras de sus cráteres son las que fotografió Dawn y aquí no se mueven con el Sol"
    },
    objectFamily: "se dibuja como {name}: el tipo de objeto, no este exacto",
    // b200-m2-buses: begin
    objectBus: "Plataforma: {bus} ({source}). Se dibuja con una plataforma de sustitución.",
    // b200-m2-buses: end
    objectOwn: "se dibuja como {name}",
    objectMade: {
      images: "forma construida a partir de fotografías; proporciones aproximadas",
      render: "forma construida a partir de una recreación de un artista; proporciones aproximadas",
      dimensions: "forma construida a partir de dimensiones publicadas e imágenes; detalles simplificados"
    },
    objectWas: {
      hitomi: "se muestra entero, tal como se lanzó en febrero de 2016; se rompió cinco semanas después, y lo que se sigue aquí es su cuerpo principal, sin los paneles solares",
      envisat: "se muestra estable, con sus instrumentos hacia la Tierra, como volaba mientras funcionaba; está inactivo desde 2012 y nadie lo gobierna",
      ers1: "se muestra estable, con sus instrumentos hacia la Tierra, como volaba mientras funcionaba; su misión terminó en 2000 y nadie lo gobierna"
    },
    objectGeneric: "se dibuja como un objeto genérico; no tenemos una forma para {name}",
    classShape: {
      satellite: "un satélite genérico",
      station: "una estación espacial genérica",
      debris: "un trozo de basura espacial",
      rocket: "un cohete genérico",
      probe: "una sonda genérica",
      telescope: "un telescopio genérico",
      asteroid: "un asteroide genérico",
      dwarf: "un cuerpo redondo y liso de su tamaño medido",
      comet: "un cometa genérico",
      site: "un lugar genérico en tierra",
      star: "un punto de luz, con un tamaño según cuánto brilla visto desde donde estás",
      exoplanet: "una marca en su estrella: la órbita en sí es demasiado pequeña para dibujarla",
      dso: "un resplandor suave, al estilo de los de su tipo, a su distancia medida y tan ancho como se mide; el patrón que contiene es ilustrativo y su forma real no se dibuja",
      exotic: "un anillo a su distancia medida; un agujero negro no tiene forma que dibujar y un púlsar es demasiado pequeño",
      exoticStar: "un anillo a su distancia medida; la estrella en sí es un punto a esta escala"
    },
    storm: "se dibuja como una marca en su centro; la tormenta en sí es la nube que lo rodea",
    feature: "un lugar con nombre: aquí no se dibuja más que una marca en su centro, colocada según la fuente citada; el suelo bajo ella es el propio mapa", // 0077 W3-d
    objectSpin: { spin: "gira alrededor de su polo medido, a su ritmo medido; qué cara mira al Sol en este momento no es una predicción", pair: "los dos giran alrededor de su polo medido, a sus ritmos medidos, y Dimorphos da la vuelta a la distancia y en el periodo medidos tras el impacto de DART; dónde está en esa órbita es ilustrativo", comet: "gira alrededor de su polo medido, al ritmo medido en 2014, que el Sol ha cambiado en unos minutos en cada paso desde entonces; qué cara mira al Sol en este momento no es una predicción", still: "está dibujado con la orientación de su modelo de radar y aquí no gira: el modelo no dice hacia dónde apunta su eje de giro", moonSpin: "mantiene una cara hacia Saturno y gira alrededor del polo que le dan las constantes de la UAI una vez por vuelta; qué lado mira a la cámara en este momento lo da esa fórmula, no es una predicción", moonStill: "se dibuja en la orientación de su modelo y aquí no gira: las constantes que lee esta aplicación no le dan un polo ni un ritmo estables" }, // 0077 W3-d 0079 B2
    objectSeen: { lutetia: "las imágenes de Rosetta cubren más de la mitad de su superficie; el resto de la forma se ajusta a partir de sus cambios de brillo, no está fotografiado", steins: "las imágenes de Rosetta cubren alrededor del 60 por ciento de su superficie; el resto de la forma se ajusta a partir de sus cambios de brillo, no está fotografiado", donj: "la forma está construida con las imágenes de Lucy mediante fotogrametría estéreo y ajustando su contorno; el lado que Lucy no vio es el del ajuste", arrokoth: "las imágenes de New Horizons cubren el lado junto al que pasó; el otro lado está deducido, no fotografiado, y el color es su mapa de albedo con un tinte rojo", radar: "la forma está construida con ecos de radar, no con imágenes: su contorno está medido y sus detalles más finos no", comet: "la forma es la de Rosetta, a partir de más de 20 000 imágenes a lo largo de dos años, y cubre toda la superficie", cassini: "la forma está construida con las imágenes de Cassini y suele tener una incertidumbre muy inferior a medio kilómetro; lo que Cassini no vio es del ajuste, no está fotografiado" }, // 0079 B1 0079 B2
    objectRelief: "el modelo está simplificado, y el relieve fino que lleva es el del modelo completo, integrado en la superficie", // 0079 B1
    worldFlat: "se dibuja como una bola lisa: aquí no hay un mapa de la superficie de {name}, y su único color está elegido a partir de descripciones publicadas, no medido",
    worldFlatIrregular: "se dibuja como una bola lisa del tamaño de su radio medio: aquí no hay un mapa de la superficie de {name}, su único color está elegido a partir de descripciones publicadas, no medido, y {name} es en realidad una roca irregular cuya forma verdadera no se dibuja",
    worldFlatShaped: "se dibuja con su forma medida y de un solo color: aquí no hay un mapa de la superficie de {name}, y el color está elegido a partir de descripciones publicadas, no medido",
    worldShaped: "se dibuja con su forma medida",
    worldMap: {
      tinted: "su superficie es un mosaico en blanco y negro, teñido de un color elegido a partir de descripciones publicadas",
      toned: "sus colores vienen de imágenes en infrarrojo, verde y ultravioleta, atenuados hacia lo que vería un ojo",
      redblue: "sus colores vienen de las imágenes roja y azul de New Horizons, con el verde tomado a medio camino entre ambas y el color reforzado en otra mitad; las partes fotografiadas solo en blanco y negro reciben el color medio del mapa",
      enhanced: "sus colores son los que publicó la NASA, compuestos con tres de los filtros de color de New Horizons, ninguno de ellos verde: es color realzado, más intenso que lo que vería un ojo y no igual a ello",
      balanced: "sus colores vienen de imágenes naranja, verde y azul, equilibradas con su color publicado y atenuadas hacia lo que vería un ojo",
      infrared: "su superficie es un mapa en infrarrojo cercano hecho a través de la bruma, teñido y suavizado; en luz visible la bruma oculta el suelo",
      natural: "sus colores son color natural, de la luz roja y azul que midió la cámara de color de New Horizons, con el verde, para el que no tenía filtro, estimado entre ambas, y reforzados unas dos veces y media respecto a los de la cámara, como los muestran las imágenes en color natural de la NASA", // 0078 r14-pluto
      matched: "sus colores parten de la luz roja y azul que midió la cámara de color de New Horizons, con el verde, para el que no tenía filtro, estimado entre ambas, y luego se igualan, tono a tono, a la propia imagen en color de la NASA de esta cara (PIA19952): más intensos que los de la cámara, como los publicó la NASA" // 0078 r14-pluto
    },
    worldCoverage: {
      miranda: "solo se fotografió la mitad sur, por la Voyager 2 en 1986; el resto se deja liso, no se adivina",
      ariel: "solo se fotografió la mitad sur, por la Voyager 2 en 1986; el resto se deja liso, no se adivina",
      umbriel: "solo se fotografió la mitad sur, por la Voyager 2 en 1986; el resto se deja liso, no se adivina",
      titania: "solo se fotografió la mitad sur, por la Voyager 2 en 1986; el resto se deja liso, no se adivina",
      oberon: "solo se fotografió la mitad sur, por la Voyager 2 en 1986; el resto se deja liso, no se adivina",
      triton: "la Voyager 2 fotografió una parte en 1989; el resto se deja liso, no se adivina",
      pluto: "el extremo sur estaba en la oscuridad del invierno cuando pasó New Horizons en 2015: el suelo que se dibuja allí está modelado, una textura tenue en los colores de la tierra de más arriba, no una fotografía", // 0078 r14-pluto
      charon: "el extremo sur estaba en la oscuridad del invierno cuando pasó New Horizons en 2015: el suelo que se dibuja allí está modelado, una textura tenue en los colores de la tierra de más arriba, no una fotografía" // 0078 r14-pluto
    },
    worldLit: "se ilumina como lo mostraría una cámara expuesta para su propia luz solar",
    worldLight: "visto desde lejos es una luz con su brillo calculado: el resplandor es como una cámara registra un punto demasiado brillante para resolverlo",
    exoticDeparture: {
      pulseSlowed: "su parpadeo se dibuja {n} veces más lento de lo que gira, para que un ojo pueda seguirlo",
      pulseTrue: "su parpadeo se dibuja al ritmo al que gira",
      portrait: "mientras esta ficha está abierta, se dibuja en su lugar un modelo, mucho más grande de lo que se vería desde aquí: la sombra y la luz curvada como las da su masa, el disco modelado"
    },
    worldDeparture: {
      earth: "en una pantalla más grande, sus montañas salen de las alturas ETOPO 2022 de NOAA, dibujadas {relief} veces más empinadas de lo que son para que un Sol bajo las muestre; el resplandor del aire alrededor de su borde se dibuja {air} veces más alto que el aire; desde una órbita baja y en una pantalla más grande, sus nubes se alzan hacia el horizonte y bajo un Sol bajo, dibujadas {clouds} veces más gruesas de lo que son para que se vean su inclinación, sus largas sombras y la última luz en sus cimas (con su grosor verdadero en el aspecto Medido), con la altura de cada cima tomada de su temperatura medida donde cubre la imagen de hoy y del brillo del mapa de nubes en el resto",
      titan: "justo encima de su bruma, a unos 500 km de altura, se dibuja una capa fina y separada de bruma donde la vio la Cassini entre 2005 y 2007; se hundió y se desvaneció en los años siguientes, y no se sabe dónde está ahora",
      mercury: "en una pantalla más grande, su relieve sale del modelo de elevación de MESSENGER, dibujado {steep} veces más empinado de lo medido para que los bordes de los cráteres atrapen la luz",
      pluto: "su suelo claro y oscuro se dibuja con {plutoContrast} veces el contraste de la imagen de la cámara, más cerca de los albedos medidos; el lado que New Horizons solo vio de lejos se suaviza a su propia nitidez; en una pantalla más grande, su relieve sale de las alturas estéreo de New Horizons, donde las hay, dibujado {plutoSteep} veces más empinado de lo medido; la fina bruma azul de su borde se dibuja como un brillo, más fuerte a contraluz, cuya intensidad es elegida", // 0078 r14-pluto
      mars: "en una pantalla más grande, su relieve sale de las alturas que midió el altímetro láser de Mars Global Surveyor, dibujadas {mola} veces más empinadas y más altas de lo que son para que un Sol bajo las muestre: las sombras que proyectan el Monte Olimpo y las paredes del cañón son más largas en esa misma proporción.",
      venus: "el resplandor alrededor de su borde y más allá de su lado diurno representa una bruma profunda; su grosor dibujado y hasta dónde llega son ilustrativos; en el aspecto Cine sus bandas de nubes se dibujan con {uv} veces el contraste de su mapa, como las ven las cámaras ultravioleta (a simple vista son casi lisas), y el aspecto Medido muestra el mapa tal cual es; su suelo, visto por radar, está en relieve con el altímetro de Magellan, dibujado {ground} veces más empinado y alto de lo medido",
      neptune: "en el aspecto Cine, los cinco arcos de su anillo exterior se dibujan como los vio la Voyager 2 en 1989, girando a su velocidad medida; no se calcula dónde están hoy a lo largo del anillo, y dos de ellos se han desvanecido o se han movido desde entonces",
      saturn: "sus bandas se dibujan con {contrast} veces el contraste de su mapa, un ajuste nuestro; «Como lo vio Hubble» no está ajustado; en una pantalla más grande y de cerca, los anillos finos y los huecos de sus anillos están donde los midió Cassini a través de la luz de una estrella en 2008, superpuestos al mapa, y en el aspecto Cine se dibuja además el destello de los granos, aún más de cerca: desde aquí no se ve ninguna partícula de los anillos"
    },
    worldEarthshine: "su lado oscuro brilla con la luz cenicienta, la propia luz de la Tierra, dibujada {n} veces más brillante de lo que la captaría esa cámara, más o menos como la ve el ojo",
    worldAir: "su aire se dibuja {n} veces más grueso de lo que es para que se vea a este tamaño, y el color de su bruma es ilustrativo",
    worldAirTrue: "su bruma se dibuja a su altura medida, y su color es ilustrativo",
    worldRings: "sus anillos están a sus distancias medidas, dibujados {w} veces más anchos y mucho más brillantes de lo que son para que se vean: los reales son hilos tan oscuros como el carbón",
    worldRingsDense: "sus anillos están a sus distancias medidas, dibujados {w} veces más anchos, {d} veces más opacos y mucho más brillantes de lo que son para que se vean: los reales son hilos tenues tan oscuros como el carbón",
    worldSun: "de cerca, su borde se oscurece y enrojece como dice que debe hacerlo un modelo de su atmósfera; el grano representa su superficie en ebullición: sus celdas nacen, se iluminan y se apagan como lo hacen los gránulos reales, dibujadas más gruesas de lo que son (hasta su tamaño real desde muy cerca) y mucho más rápido, y la red brillante hacia el borde es ilustrativa; desde muy cerca el mapa fotografiado deja paso a esa superficie dibujada, que también es ilustrativa; la corona es ilustrativa, y se dibuja mucho más brillante de lo que es para que pueda verse; los arcos y las espículas de su borde están donde las regiones activas de NOAA están cerca del limbo, y sus formas y alturas son ilustrativas; las estrellas a su lado están atenuadas, porque su resplandor las oculta a cualquier cámara",
    worldMosaic: "Bajo la cámara ahora: {title}, dibujado aquí a unos {res} por píxel.",
    worldMosaicDetail: "Bajo la cámara ahora: {title}, que afina el mapa de color a unos {res} por píxel.",
    worldRelief: "Su relieve viene de {title}: un dibujo de pendientes bajo una luz fija. Las pendientes en la dirección de esa luz se iluminan de nuevo con el Sol donde está ahora, {n} veces más empinadas de lo medido; las pendientes transversales a ella no se dibujan.",
    worldReliefTrue: "Su relieve viene de {title}: un dibujo de pendientes bajo una luz fija. Las pendientes en la dirección de esa luz se iluminan de nuevo con el Sol donde está ahora; las pendientes transversales a ella no se dibujan.",
    worldReliefBaked: "Sus colinas están sombreadas en este mapa bajo una luz fija, no por el Sol donde está ahora.",
    mount: "el lugar donde lo colgamos en el modelo es una disposición nuestra, y se dibuja mucho más grande de lo que es: a su tamaño real sería demasiado pequeño para verse"
  },
  trip: {
    notEnoughStops: "Ahora mismo solo se pueden encontrar {count} de las paradas de este viaje, y hacen falta {min}.",
    heldBody: "No hemos podido encontrar esta parada ahora mismo. Todo lo demás del viaje sigue funcionando.",
    heldTitle: "No hemos podido encontrar esta parada",
    stopOf: "parada {n} de {count}",
    planning: "Calculando qué se puede mostrar…",
    shape: "{count} paradas · {mins} min",
    shapeOneMinute: "{count} paradas · 1 min",
    startTitle: "Hacer este viaje",
    nextEventLine: "Siguiente: {date}",
    introStart: "Empezar",
    introSkip: "Ahora no",
    introMicro: "Viaje guiado",
    stopsLabel: "Paradas",
    startAtTitle: "Empezar el viaje en la parada {n}",
    droppedOne: "Hoy no se puede mostrar una parada y no se cuenta arriba.",
    droppedMany: "Hoy no se pueden mostrar {n} paradas y no se cuentan arriba.",
    clockClamped: "El tiempo ha vuelto a la velocidad normal para este viaje.",
    clockMoves: "Este viaje mueve el reloj. Se restablece cuando sales.",
    clockRestored: "Al salir, el reloj vuelve a donde lo tenías.",
    stopTimeNow: "Se muestra ahora",
    stopTimeAt: "Mostrado el {when}",
    stopTimeRate: "Mostrado el {when}, con el tiempo corriendo {rate}",
    stopTimePaused: "Mostrado el {when}, detenido mientras el viaje está en pausa",
    shownAtUtc: "{when} UTC",
    eclipseLine: "Sombra calculada a partir de las posiciones de la Luna y del Sol; los tiempos, de Astronomy Engine, con una precisión de un minuto aproximadamente. Las líneas finas y la banda pálida marcan los bordes de la sombra y la trayectoria de su núcleo: líneas en un mapa, no luz.",
    eclipseLineLatched: "La sombra no se dibuja en este dispositivo; los tiempos son correctos.",
    eclipseColour: "El color es una ilustración; la sombra está calculada.",
    orbitsLine: "Los planetas se dibujan más grandes de lo que son, como puntos; sus lugares y trayectorias están calculados.",
    moonPathLine: "La Tierra y la Luna se dibujan más grandes de lo que son, como puntos, cada una iluminada en el lado que mira al Sol. El lugar de la Luna y su trayectoria están calculados.",
    systemLine: "Tamaños y órbitas del NASA Exoplanet Archive; los colores y la inclinación de las órbitas son ilustrativos.",
    systemLineGuessed: "Tamaños y órbitas del NASA Exoplanet Archive; los colores, la posición de los planetas en sus órbitas y la inclinación de las órbitas son ilustrativos.",
    systemPhaseUnknown: ", la posición de los planetas en sus órbitas",
    rateWords: {
      "10": "diez veces más rápido que la vida real",
      "60": "un minuto por segundo",
      "600": "diez minutos por segundo",
      "3600": "una hora por segundo",
      "36000": "diez horas por segundo",
      "525600": "seis días por segundo"
    },
    rateGeneric: "{n} veces más rápido que la vida real",
    yourPlace: "Tu lugar",
    observerSet: "Tu lugar: {place}, fijado por ti.",
    observerDevice: "Tu lugar: cerca de donde dice tu dispositivo que estás.",
    observerGuess: "Tu lugar es una suposición a partir de la zona horaria de tu reloj: {place}. Fíjalo en «Dónde estás» para tener uno mejor.",
    needsPlace: "Necesita un lugar. Fija primero dónde estás.",
    stationFromYou: "Ahora mismo está a {km} km de ti.",
    drawnAtClassSize: "El modelo se dibuja con {px} píxeles de ancho sea cual sea la distancia; la estación real sería un punto brillante.",
    passNight: "En este paso está iluminada por el Sol sobre un cielo oscuro: podrías verla, si el tiempo lo permite.",
    passDay: "No verías este paso: tu cielo está demasiado claro, o la estación está en la sombra de la Tierra.",
    lookMoonUp: "La Luna está iluminada al {pct}%, {alt}, hacia el {az}.",
    lookMoonDown: "La Luna está bajo tu horizonte a esta hora. Sale a las {time}.",
    lookMoonDownNoRise: "La Luna está bajo tu horizonte a esta hora.",
    lookWorldUp: "{name} está {alt}, hacia el {az}.",
    lookWorldDown: "{name} está bajo tu horizonte a esta hora.",
    lookPlanet: "El planeta más brillante en el cielo a esta hora es {name}: {alt}, hacia el {az}.",
    lookNoPlanet: "A esta hora no hay en el cielo ningún planeta que puedas ver a simple vista. La vista mira hacia donde pasarán.",
    lookStar: "La estrella más brillante en el cielo a esta hora es {name}: {alt}, hacia el {az}.",
    lookFigure: "Lo mejor situado a esta hora: {name}, {alt}, hacia el {az}.",
    lookNoFigure: "Ninguna de las figuras más conocidas está bien situada a esta hora.",
    lookNoPass: "No se encontró ningún paso de la estación sobre tu lugar en la próxima semana.",
    lookDaylight: "Tu cielo no está oscuro a esta hora, así que todavía no hay nada que distinguir.",
    lookMilkyWay: "La vista mira hacia la Vía Láctea donde atraviesa {name}, {alt}, hacia el {az}. Los tres cielos son un modelo de una noche despejada media.",
    lookNoMilkyWay: "La Vía Láctea está baja sobre tu horizonte a esta hora, así que la vista mira en cambio a lo alto del cielo.",
    lookShower: "La próxima lluvia es la {name}, en su mejor momento hacia el {date}.",
    lookShowerUp: "Su radiante está {alt}, hacia el {az}, a esta hora.",
    lookShowerDown: "Su radiante está bajo tu horizonte a esta hora; la vista mira hacia donde saldrá.",
    lookShowerRate: "En el máximo, desde un lugar oscuro y con el radiante alto: unos {rate} meteoros por hora.",
    lookShowerMoon: {
      dark: "Esa noche la Luna está iluminada al {pct}%, así que el cielo sigue oscuro.",
      some: "Esa noche la Luna está iluminada al {pct}% y ocultará algunos de los meteoros débiles.",
      bright: "Esa noche la Luna está iluminada al {pct}% y ocultará todos menos los brillantes."
    },
    approachNext: "Lo siguiente en la tabla del JPL de la NASA: {name}, el {date}, a {ld} veces la distancia de la Luna.",
    approachNextFar: "Lo siguiente en la tabla del JPL de la NASA: {name}, el {date}.",
    approachNone: "La tabla de pasos cercanos del JPL de la NASA no se ha cargado, así que no se nombra ningún paso siguiente.",
    satellitesCount: "{n} satélites en funcionamiento en el catálogo que esta página cargó de CelesTrak, {starlink} de ellos Starlink.",
    satellitesLoading: "El catálogo aún se está cargando; el recuento aparece cuando termine.",
    portraitLine: "Un modelo, no la fotografía: la sombra y el anillo de luz curvada a su alrededor son los que da su masa, el disco luminoso está modelado y las estrellas de detrás no se curvan. Se dibuja mucho más grande de lo que se vería desde aquí; el lugar es medido. La fotografía del Event Horizon Telescope está en su ficha: {credit} · {licence}.",
    tonightUp: "Desde {place} esta noche: sobre el horizonte de {begin} a {end}, en su punto más alto a las {time}, {alt}, hacia el {az}.",
    tonightGlare: "Desde {place} esta noche: {name} está demasiado cerca del Sol para verse.",
    tonightDown: "Desde {place} esta noche: {name} no está sobre el horizonte mientras el cielo está oscuro.",
    frameLabel: "viaje guiado",
    stopRole: "parada",
    liveLabel: "parada {n} de {count}: {title}",
    stopMicro: "Parada {n} de {count}",
    progressShort: "{n} / {count}",
    pause: "Pausa",
    pauseTitle: "Pausa (Espacio)",
    play: "Reproducir",
    resume: "Reanudar",
    resumeTitle: "Volver a la parada y seguir (Espacio)",
    back: "Parada anterior",
    backTitle: "Parada anterior (←)",
    next: "Parada siguiente",
    nextTitle: "Parada siguiente (→)",
    replay: "Repetir",
    replayTitle: "Volar este movimiento otra vez (R)",
    share: "Compartir",
    shareTitle: "Compartir un enlace a esta parada",
    collapse: "Ocultar ficha",
    collapseTitle: "Ocultar la ficha y mirar (C)",
    expand: "Mostrar ficha",
    expandTitle: "Recuperar la ficha (C)",
    soundOn: "Sonido",
    volume: "Volumen",
    volumeTitle: "Volumen de la música, los sonidos y la voz",
    volumeValue: "{pct} por ciento",
    voiceWill: "Una voz leerá esto. Es sintética.",
    voiceCan: "Una voz sintética puede leer esto: pulsa Voz.",
    soundOnTitle: "La música y los sonidos están activados: desactívalos (M)",
    soundOffTitle: "La música y los sonidos están desactivados: actívalos (M)",
    voice: "Voz",
    voiceOnTitle: "Una voz sintética lee cada parada: desactívala y deja la música (V)",
    voiceOffTitle: "Que una voz sintética lea en voz alta cada parada (V)",
    present: "Presentar",
    presentTitle: "Mostrar este viaje a una sala: palabras grandes, sin paneles, y tú pulsas Siguiente",
    presentOffTitle: "Salir del modo presentación y recuperar los paneles",
    presentAuto: "Automático",
    presentAutoOffTitle: "Cada parada espera a «Siguiente»: deja que el viaje avance solo (A)",
    presentAutoOnTitle: "El viaje avanza solo: haz que cada parada espere a «Siguiente» (A)",
    fullScreen: "Pantalla completa",
    fullScreenTitle: "Llenar toda la pantalla (F)",
    fullScreenOffTitle: "Salir de la pantalla completa (F)",
    leave: "Salir",
    leaveTitle: "Salir del viaje. La cámara se queda exactamente donde está. (Escape)",
    leaveTitleStage: "Salir del viaje. El mapa vuelve al mundo en el que estaba centrado antes, lo que mueve la cámara. (Escape)",
    progressLabel: "Cuánto llevas del viaje",
    controlsLabel: "Controles del viaje",
    pausedChip: "Viaje en pausa",
    endMicro: "Fin del viaje",
    endBody: "La cámara se queda donde está. Aquí nada vuelve atrás.",
    endBodyStage: "«Seguir volando» te deja aquí fuera. «Volver a casa» devuelve el mapa al mundo en el que estaba centrado antes del viaje.",
    endExplore: "Seguir volando",
    endExploreTitle: "Conservar esta vista y seguir por tu cuenta",
    endStayTitleStage: "Quedarte aquí fuera y volar desde donde terminó el viaje",
    endHome: "Volver a casa",
    endExploreTitleStage: "Seguir por tu cuenta, de vuelta en el mapa del que partiste",
    endSend: "Enviar imagen",
    endSendTitle: "Hacer una postal de donde terminó el viaje, con sus palabras y un enlace",
    endReplay: "Verlo otra vez",
    endReplayTitle: "Ver este viaje otra vez desde el principio",
    endShareTitle: "Compartir un enlace a este viaje",
    endNextMicro: "Siguiente viaje",
    endNext: "Siguiente: {title}",
    docTitle: "Space Radar — {title} — parada {n} de {count}"
  },
  sky: {
    radiant: "radiante de {name}",
    bodies: {
      sun: "Sol",
      moon: "Luna",
      mercury: "Mercurio",
      venus: "Venus",
      mars: "Marte",
      jupiter: "Júpiter",
      saturn: "Saturno",
      uranus: "Urano",
      neptune: "Neptuno"
    },
    fov: {
      degrees: "campo de {deg}° · {name}",
      arcmin: "campo de {min}′ · {name}",
      names: {
        eye: "ojo",
        binoculars: "prismáticos",
        telescope: "telescopio"
      }
    },
    lines: {
      sunPath: "Trayectoria del Sol",
      equator: "Ecuador celeste",
      poleNorth: "Polo norte celeste",
      poleSouth: "Polo sur celeste"
    },
    what: {
      star: "Estrella",
      starMag: "estrella · mag {mag}",
      planet: "planeta · mag {mag}",
      sun: "nuestra estrella",
      moon: "la luna de la Tierra",
      dso: "cielo profundo",
      dsoMag: "{kind} · mag {mag}",
      open: "{name}, {sub}. Abrir su ficha.",
      plain: "{name}, {sub}.",
      openTitle: "Abrir su ficha"
    },
    compassShort: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
    lookLine: "Mira hacia el {dir}, {fists}, a las {time}. Se mueve durante unos {mins} minutos.",
    lookLineNoDuration: "Mira hacia el {dir}, {fists}, a las {time}.",
    sunlit: "Aún recibe luz del Sol, y eso es lo que lo hace visible.",
    notSunlit: "En este paso está en la sombra de la Tierra, así que no lo verás.",
    fistsHorizon: "justo sobre el horizonte",
    fistsOverhead: "casi en vertical",
    fistsOne: "a un puño más o menos sobre el horizonte",
    fistsMany: "a unos {n} puños sobre el horizonte",
    noObserver: "Fija dónde estás y esta línea te dirá hacia dónde mirar.",
    noPass: "No sube por encima de tu horizonte en las próximas 24 horas.",
    notVisibleFromGround: "Este está demasiado lejos para distinguirlo a simple vista.",
    leftGround: "Has dejado el suelo para volar hasta allí. El cielo está en «Esta noche».",
    nakedEye: "Lo bastante brillante para verlo a simple vista desde un lugar oscuro.",
    needsTelescope: "Demasiado débil para el ojo; un telescopio, o una fotografía de larga exposición, lo muestra.",
    starOnly: "Solo se puede ver su estrella, y solo con telescopio; el planeta en sí es demasiado débil.",
    onTheGround: "Este está en el suelo, así que no hay nada que mirar hacia arriba.",
    storm: "Desde el suelo es el tiempo mismo. Desde la órbita es una espiral de nubes de cientos de kilómetros de ancho.",
    onAnotherWorld: "Este está en {world}. No lo distinguirás a simple vista desde aquí, por clara que sea la noche.",
    worldRise: "Desde donde estás, sale a las {time}.",
    worldHere: "donde estás",
    worldFrom: {
      down: "Desde {place}: sale a las {rise} por el {riseDir}, alcanza su punto más alto a las {highTime}, {highAlt}; se pone a las {set} por el {setDir}.",
      downNoSet: "Desde {place}: sale a las {rise} por el {riseDir} y alcanza su punto más alto a las {highTime}, {highAlt}.",
      up: "Desde {place}: está sobre el horizonte ahora, {alt}, hacia el {dir}. Su punto más alto, a las {highTime}, {highAlt}; se pone a las {set} por el {setDir}.",
      upPast: "Desde {place}: está sobre el horizonte ahora, {alt}, hacia el {dir}. Ya pasó su punto más alto; se pone a las {set} por el {setDir}.",
      never: "Desde {place} no sale en el próximo día y medio.",
      always: "Desde {place}: está sobre el horizonte ahora, {alt}, hacia el {dir}. Hoy no se pone.",
      honest: "Calculado para un horizonte a nivel del mar; no cuenta con colinas ni casas."
    },
    worldNoRise: "Puedes verlo a simple vista. Calcular cuándo sale desde tu lugar aún no está en esta versión.",
    worldSee: {
      pluto: "Ni a simple vista ni con prismáticos: Plutón es casi 3 000 veces más débil que la estrella más débil que puedes ver, así que hace falta un telescopio.",
      io: "Unos prismáticos comunes lo muestran como un punto de luz junto a Júpiter; a simple vista se pierde en el resplandor de Júpiter.",
      europa: "Unos prismáticos comunes lo muestran como un punto de luz junto a Júpiter; a simple vista se pierde en el resplandor de Júpiter.",
      ganymede: "Unos prismáticos comunes lo muestran como un punto de luz junto a Júpiter; a simple vista se pierde en el resplandor de Júpiter.",
      callisto: "Unos prismáticos comunes lo muestran como un punto de luz junto a Júpiter; a simple vista se pierde en el resplandor de Júpiter.",
      titan: "No a simple vista: Titán tiene magnitud 8.2 en su máximo brillo, así que hace falta un telescopio pequeño o unos prismáticos potentes, y el resplandor de Saturno a su lado lo dificulta incluso así.",
      enceladus: "No a simple vista: Encélado tiene magnitud 11.7 y está tan cerca del brillante Saturno y de sus anillos que cuesta verlo incluso con un telescopio pequeño.",
      triton: "Ni a simple vista ni con prismáticos: Tritón tiene magnitud 13.5, unas 600 veces más débil que la estrella más débil que puedes ver, así que hace falta un telescopio.",
      charon: "Apenas: Caronte tiene magnitud 16.8, 13 000 veces más débil que la estrella más débil que puedes ver, y está tan cerca de Plutón que en 2008 unos aficionados separaron la pareja fotografiándola con un telescopio de 14 pulgadas.",
      phobos: "No a simple vista: Fobos tiene magnitud 11.3 en su mejor momento y se pega a Marte, cuyo resplandor lo ahoga; se descubrió en 1877 con un telescopio de 26 pulgadas.",
      deimos: "No a simple vista: Deimos tiene magnitud 12.4 en su mejor momento y está cerca de Marte, cuyo resplandor lo ahoga; se descubrió en 1877 con un telescopio de 26 pulgadas.",
      neptune: "No a simple vista: Neptuno tiene magnitud 7.7 a 7.9, demasiado débil para verlo sin ayuda. Unos prismáticos potentes o un telescopio lo muestran como un pequeño disco azul.",
      mimas: "No a simple vista: Mimas tiene magnitud 12.9 y se pega a Saturno, así que hace falta un telescopio grande y una noche estable.",
      tethys: "No a simple vista: Tetis tiene magnitud 10.2, al alcance de un telescopio pequeño, aunque el resplandor de Saturno a su lado lo dificulta.",
      dione: "No a simple vista: Dione tiene magnitud 10.4, al alcance de un telescopio pequeño, aunque el resplandor de Saturno a su lado lo dificulta.",
      rhea: "No a simple vista: Rea tiene magnitud 10, la más brillante de las lunas de Saturno después de Titán, y un telescopio pequeño la mostrará.",
      iapetus: "No a simple vista: Jápeto va de magnitud 10.2 a 11.9 según su lado brillante y su lado oscuro se turnan para mirarnos, así que un telescopio pequeño lo capta en su mejor momento.",
      miranda: "Apenas: Miranda tiene magnitud 16.6, se pierde en el resplandor de Urano y es invisible para muchos telescopios de aficionado.",
      ariel: "Ni a simple vista ni con prismáticos: Ariel tiene magnitud 14.8, tan débil como Plutón cerca de su máxima aproximación, así que hace falta un buen telescopio y un cielo oscuro.",
      umbriel: "Ni a simple vista ni con prismáticos: Umbriel tiene magnitud 15.1, la más débil de las cuatro grandes de Urano, así que hace falta un buen telescopio y un cielo oscuro.",
      titania: "No a simple vista: Titania tiene magnitud 13.9, la más brillante de las lunas de Urano, y aun así necesita un telescopio de cierto tamaño.",
      oberon: "No a simple vista: Oberón tiene magnitud 14.1 y es la más alejada de Urano de las cinco, así que hace falta un telescopio y una noche estable."
    },
    couldNotLook: "No se pudo calcular un paso desde aquí.",
    nowhereToLook: "Nadie sabe dónde está este, así que no hay dónde mirar."
  },
  controls: {
    title: "Controles",
    layersTitle: "Qué mostrar",
    layerCount: "{n}",
    layerCountLoading: "contando",
    layerHint: {
      exoplanets: "Desactivado por defecto. Márcalo para mostrarlos."
    },
    layerCountEmpty: "vacía",
    layerCountEmptyTitle: "Esta capa volvió vacía: no se pudo leer su fuente, o ahora no contiene nada.",
    layerWaits: "aún no",
    layerWaitsTitle: "Se carga cuando la activas, para ahorrar datos.",
    layersFailed: "{n} capas volvieron vacías.",
    layersFailedOne: "Una capa volvió vacía.",
    layersFailedWhy: "Ver fuentes",
    layerCountParts: {
      onMap: "{n} en el mapa",
      riding: "{n} montados sobre otra cosa",
      unplaceable: "{n} que no podemos situar",
      auroraPeak: "hasta un {n} % de probabilidad",
      lightningPerMin: "{n} descargas por minuto"
    },
    layersEmpty: "Todavía no se ha cargado ninguna capa.",
    groups: {
      "around-earth": "Alrededor de la Tierra",
      earth: "Tiempo y suelo",
      "solar-system": "Sistema solar",
      beyond: "Estrellas y más allá"
    },
    groupCount: "{on} de {n}",
    groupAll: "Todas",
    groupNone: "Ninguna",
    groupAllLabel: "Mostrar todas las capas de {group}",
    groupNoneLabel: "Ocultar todas las capas de {group}",
    layerFilter: "Buscar una capa",
    layersKeys: "Capas. Flechas arriba y abajo; Espacio activa una.",
    layerFilterEmpty: "Ninguna capa con ese nombre.",
    keysRow: "Teclas",
    keysRowTouch: "Gestos",
    keysRowTitle: "Mostrar las teclas que mueven la vista",
    keysRowTitleTouch: "Mostrar los gestos que mueven la vista",
    swatchMixed: "Dibujado con sus propios colores",
    keyedNote: "Puntos coloreados según {key}: la clave está debajo.",
    localTimeFallback: "local",
    locationPlaceholder: "Una ciudad",
    locationSearchLabel: "Buscar una ciudad",
    locationUseMine: "Usar mi ubicación",
    locationUseMineTitle: "Preguntar al navegador dónde estás",
    locationInsecure: "El navegador solo comparte tu ubicación con páginas servidas por https. Esta página está en http simple, así que el botón está desactivado. Elige una ciudad, o abre la dirección https cuando exista.",
    locationUnsupported: "El navegador no ofrece ubicación. Elige una ciudad.",
    locationDenied: "El navegador dijo que no. Elige una ciudad.",
    locationFailed: "El navegador no pudo encontrarte. Elige una ciudad.",
    locationAsking: "Preguntando al navegador",
    locationClear: "Borrar",
    locationNoMatch: "Ninguna ciudad de la lista incluida coincide.",
    tonightCouldNotLook: "No se pudo calcular: no hay satélites cargados."
  },
  search: {
    title: "Buscar un objeto",
    placeholder: "Planetas, estrellas, satélites",
    placeholderPhone: "Buscar en el espacio",
    inputLabel: "Buscar un objeto por nombre o número de catálogo",
    listLabel: "Objetos que coinciden",
    fly: "Ir allí",
    flyTitle: "Mover la cámara al objeto resaltado y abrir su ficha",
    hint: "Con dos letras basta. Intro elige el primero.",
    noMatch: "Nada llamado «{q}» aquí.",
    closest: "Nombres más cercanos",
    more: "{n} coincidencias más. Escribe más para afinar.",
    searching: "{n} objetos buscados.",
    searchingOne: "Un objeto buscado.",
    searchingBut: "{n} objetos buscados, {m} capas todavía no.",
    searchingButOne: "{n} objetos buscados, una capa todavía no.",
    empty: "Todavía no se ha cargado nada donde buscar.",
    inputTitle: "Buscar (/)",
    key: "/",
    notLoaded: "Sin cargar, y por eso sin buscar: {layers}.",
    stillLoading: "Aún cargando, así que todavía sin buscar: {layers}.",
    loadsWhenOn: "Se cargan solo cuando las activas, para ahorrar datos, así que todavía sin buscar: {layers}.",
    couldNotRead: "No se pudieron leer, así que sin buscar: {layers}.",
    fallback: "Nada empieza así. Estos lo contienen.",
    switchedOn: "Activada: {layer}.",
    belowHorizon: "{name} está bajo el horizonte.",
    notLoadedCount: "No se puede saber cuántos objetos quedan fuera hasta que se carguen."
  },
  quality: {
    dataSaver: "Ahorro de datos: las dos mayores esperan.",
    lowered: "Fotogramas lentos ({ms} ms): imagen simple.",
    tierPhone: "Mapas a 2k, a la medida de un teléfono.",
    tierSaver: "Mapas a 2k, para ahorrar datos.",
    tierSmall: "Mapas a 2k, a medida de este dispositivo.",
    tierLatched: "Mapas a 2k otra vez: fotogramas lentos.",
    tierLow: "Mapas a 2k, como pide Baja.",
    tier1: "Mapas a 4k, descargados sin prisa.",
    tier2: "Mapas a 4k, con más mundos nítidos.",
    promoted: "Un nivel más tras fotogramas rápidos.",
    mapsWorn: "Mapas en este dispositivo: {credits}.",
    panelTitle: "Calidad",
    choices: {
      auto: "Auto",
      low: "Baja",
      medium: "Media",
      high: "Alta",
      ultra: "Ultra"
    },
    autoNow: "Auto: {tier}",
    titles: {
      auto: "Elegida según este dispositivo y su tasa de fotogramas",
      low: "La imagen más ligera: para una batería o un portátil viejo",
      medium: "Mapas, relieve y tiempo más nítidos",
      high: "Más mundos nítidos a la vez",
      ultra: "Resolución completa y los pasos más finos de cerca"
    },
    fellBack: "Los fotogramas iban lentos: la calidad vuelve a Auto."
  },
  status: {
    title: "Fuentes",
    intro: "Cada fuente que lee, qué antigüedad tiene esa lectura y de dónde viene. Aquí no hay nada escondido en un pie de página.",
    stateOk: "correcta",
    stateStale: "desactualizada",
    stateUnknown: "no se pudo consultar",
    stateOkTitle: "Leída hace poco y dentro de su ventana de actualización.",
    stateStaleTitle: "Tenemos una copia, pero es más antigua de lo que promete esta fuente.",
    stateUnknownTitle: "En este navegador nunca hemos tenido una buena lectura de esta fuente. Eso no es lo mismo que estar bien, ni lo mismo que un error en una copia que tenemos.",
    ageNever: "nunca leída",
    ageLabel: "última lectura {age}",
    ageNeverLine: "todavía no hay una buena copia en este navegador",
    viaSnapshotLine: "de nuestra copia, descargada {age}",
    viaLiveLine: "leída en vivo de {publisher} {age}",
    snapshotOverdue: "una copia más reciente se retrasa",
    snapshotChecking: "(buscando una más nueva)",
    couldNotLookLine: "no se pudo consultar: {reason}",
    reasonNoRoute: "{why}, y un navegador no puede leer {publisher} directamente",
    snapshotWhy: {
      "no-index": "no se pudo leer el índice de nuestras copias",
      "not-in-index": "nuestras copias no incluyen esta fuente",
      refused: "su última recolección fue rechazada",
      error: "su última recolección falló",
      skipped: "el recolector la omitió",
      unreadable: "no se pudo leer nuestra copia de ella"
    },
    harvestUnchecked: "Nuestras copias: todavía sin comprobar.",
    harvestUnavailable: "Nuestras copias no están disponibles ahora mismo, así que cada fuente de abajo se lee en vivo de su editor, o no se lee.",
    harvestLine: "Nuestras copias: escritas {age} · {ok} fuentes correctas · {refused} rechazadas · {error} fallidas",
    errorLabel: "Último error",
    attributionTitle: "Créditos",
    attributionIntro: "Los datos de este mapa son obra de otras personas.",
    footCreditsIntro: "Imágenes y texturas:",
    footCreditsTextures: "Solar System Scope",
    footCreditsTexturesTitle: "Texturas de planetas y estrellas, con licencia CC BY 4.0",
    footCreditsTexturesHref: "https://www.solarsystemscope.com/textures/",
    footCreditsNasa: "NASA",
    footCreditsNasaTitle: "Imágenes de nubes, del lado nocturno y de la superficie, y los modelos 3D",
    footCreditsNasaHref: "https://www.nasa.gov/",
    footCreditsSep: " · ",
    cloudsTitle: "Nubes",
    auroraTitle: "Aurora",
    weatherTitle: "Rayos",
    layersTitle: "En vivo o incluido",
    layersIntro: "«En vivo» se lee de su editor, o se calcula para este momento, mientras miras. Un catálogo viene con la aplicación: las estrellas, las galaxias y las antenas y los lugares de alunizaje en el suelo no se mueven mientras miras. Una muestra incluida sustituye a una fuente a la que un navegador no puede llamar de ningún modo.",
    layerLive: "en vivo",
    layerCatalogue: "catálogo",
    layerSample: "muestra incluida",
    layerIllustrative: "dibujado, no seguido",
    layerMixed: "mixto",
    layerEmpty: "nada cargado",
    layerCountLabel: "{n} mostrados",
    sourcesEmpty: "No se ha declarado ninguna fuente.",
    notAsked: "{n} fuentes más se leen solo cuando se activa una capa que las necesita."
  },
  time: {
    justNow: "ahora mismo",
    aMinuteAgo: "hace un minuto",
    minutesAgo: "hace {n} minutos",
    anHourAgo: "hace una hora",
    hoursAgo: "hace {n} horas",
    aDayAgo: "hace un día",
    daysAgo: "hace {n} días",
    lessThanAMinute: "menos de un minuto",
    aMinute: "un minuto",
    minutes: "{n} minutos",
    anHour: "una hora",
    hours: "{n} horas",
    aDay: "un día",
    days: "{n} días",
    months: "{n} meses",
    years: "{n} años",
    inFuture: "dentro de {d}",
    ago: "hace {d}"
  },
  sheet: {
    handle: "Altura de la hoja",
    closed: "cerrada",
    peek: "bajada",
    half: "medio abierta",
    full: "totalmente abierta",
    state: "{height}. Las flechas arriba y abajo la cambian",
    title: "Altura de la hoja: {height}. Toca o arrastra para cambiarla"
  },
  print: {
    title: "Guardar esta vista como una postal de 6 por 4 pulgadas (JPEG)",
    making: "Haciendo la postal",
    saved: "Postal guardada",
    failed: "No se pudo hacer la postal en este momento",
    fileName: "space-radar-postal-{id}-{date}.{ext}",
    when: "{date}, {time} UTC",
    mark: "spaceradar.ai",
    exposure: {
      eye: "Como lo ve el ojo",
      deep: "Estiramiento profundo: luz tenue realzada"
    },
    look: {
      measured: "Aspecto Medido"
    }
  },
  hud: {
    fromYou: "de ti",
    fromPlace: "de {place}",
    behind: "detrás de {world}",
    offScreen: "{name}, a {distance}, fuera de pantalla: volar allí",
    live: "{name}: {readouts}"
  },
  clean: {
    hide: "Ocultar todos los paneles (H)",
    show: "Mostrar los paneles otra vez (H o Escape)",
    hint: "H o Escape para los paneles. Mayús+H conserva las etiquetas y la hora"
  },
  mark: {
    label: "Código en GitHub",
    title: "Código fuente de Space Radar en GitHub",
    href: "https://github.com/Sara-Managed-Projects/space-radar",
    press: "Dossier de prensa",
    pressTitle: "Qué es, imágenes y la marca que se puede usar",
    pressHref: "press/index.html"
  },
  klass: {
    station: "Estación",
    satellite: "Satélite",
    debris: "Basura espacial",
    rocket: "Cohete",
    probe: "Sonda",
    telescope: "Telescopio",
    asteroid: "Asteroide",
    comet: "Cometa",
    site: "Lugar en tierra",
    world: "Mundo",
    star: "Estrella",
    exoplanet: "Planeta de otra estrella",
    dso: "Objeto del cielo profundo",
    exotic: "Objeto extremo",
    storm: "Ciclón tropical",
    earthevent: "Suceso en la Tierra",
    oddity: "Rareza",
    unknown: "Objeto"
  },
  cls: {
    nearEarthApprox: "Tan cerca de la Tierra su posición es aproximada: la órbita dibujada es alrededor del Sol solo y omite la atracción de la Tierra.",
    label: "Cómo sabemos dónde está",
    measured: "posición medida",
    inferred: "posición propagada a partir de elementos de hace {n} {unit}",
    inferredUnknownAge: "posición propagada a partir de elementos de antigüedad desconocida",
    inferredNoElements: "posición calculada en lugar de medida",
    stormAdvisory: "su centro en el aviso de las {time} UTC, {ago}; una tormenta se mueve, así que ya se ha movido desde entonces",
    stormAdvisoryDated: "su centro en el aviso de las {time} UTC del {date}, {ago}; una tormenta se mueve, así que ya se ha movido desde entonces",
    illustrative: "se dibuja para mostrar por dónde va; la trayectoria real no es pública",
    placeIllustrative: "su órbita real, del catálogo de CelesTrak, en un lugar inventado de ella; no tenemos elementos actuales suyos",
    sample: "datos de muestra incluidos, no una posición en vivo",
    provisional: "todavía no está en el catálogo público: estos son los elementos del propio operador, publicados a través de CelesTrak; llegará un número permanente cuando Space-Track lo incluya",
    unknown: "no podemos decir cómo se calculó esta posición",
    unplaced: "nadie sabe dónde está, así que no se dibuja nada para él",
    inferredArc: "la última vez que alguien lo vio fue el {date}, y {caveat}",
    precisionSplit: "La posición de {anchorName} se ha medido con una precisión de {anchorM} m; la de este objeto fue {how} y está situada dentro de {objectM} m",
    precisionSplitUnknown: "La posición de {anchorName} se ha medido con una precisión de {anchorM} m; la de este objeto nunca se ha medido",
    precisionSplitHowOnly: "La posición de {anchorName} se ha medido con una precisión de {anchorM} m; la de este objeto fue {how}, y nadie ha publicado con qué precisión",
    precisionOwn: "su posición se conoce con una precisión de {objectM} m, {how}",
    aboard: "esta es la posición propia de {carrier}, porque el objeto está atornillado por fuera y va adonde va",
    how: {
      surveyed: "medida desde la órbita",
      photogrammetric: "hallada en fotografías",
      orbital_imaging: "hallada en imágenes orbitales",
      unsurveyed: "nunca medida",
      map_reference: "tomada de un mapa"
    },
    hourWord: "hora",
    hoursWord: "horas",
    dayWord: "día",
    daysWord: "días",
    minuteWord: "minuto",
    minutesWord: "minutos",
    yearWord: "año",
    yearsWord: "años"
  },
  unplaced: {
    why: "{whyUnknown}"
  },
  earthEvent: {
    kinds: {
      wildfire: "Incendio",
      volcano: "Volcán en erupción",
      iceberg: "Iceberg"
    },
    rows: {
      kind: "Qué es",
      reported: "Último informe",
      since: "En erupción desde",
      first: "Primer informe",
      size: "Tamaño",
      where: "Dónde",
      by: "Informado por"
    },
    sizeValue: "{n} km²",
    sizeSmall: "menos de 1 km²",
    by: "{agencies}, a través de NASA EONET",
    sky: "Está en el suelo. Desde la órbita un incendio es una columna de humo, un volcán una columna de ceniza y un iceberg una losa blanca sobre agua oscura.",
    drawn: "se dibuja como una marca en su último lugar informado; su extensión sobre el terreno no se dibuja",
    honesty: "Un punto de EONET de la NASA, informado por última vez el {date} y leído {read}. Para mirar, no un registro oficial de dónde ni cuándo."
  },
  deepFacts: {
    methodRow: "Distancia hallada por",
    billionLightYears: "{n} mil millones de años luz",
    methods: {
      parallax: "paralaje: el desplazamiento de su estrella respecto al cielo lejano",
      "eclipsing-binary": "estrellas binarias eclipsantes en ella",
      cepheid: "estrellas variables cefeidas en ella",
      TRGB: "las gigantes rojas más brillantes en ella",
      "standard-candle": "estrellas o explosiones de brillo conocido",
      redshift: "su corrimiento al rojo, a través de una cosmología",
      kinematic: "lo rápido que se mueve con la rotación de la galaxia",
      "assumed-member-of-parent": "ninguno propio: se sitúa a la distancia de su galaxia"
    },
    drawnTag: {
      reconstruction: "· reconstruido",
      model: "· modelo",
      photograph: "· fotografía",
      catalogue: "· catálogo",
      illustration: "· ilustración"
    },
    drawnWords: {
      reconstruction: "una reconstrucción en 3D a partir de un estudio publicado",
      model: "un modelo de su tipo, no de sus propias estrellas",
      photograph: "una fotografía real, desde nuestro lado",
      catalogue: "posiciones del catálogo",
      illustration: "un resplandor y una marca ilustrativos de su tipo"
    },
    drawnLine: "Lo que se dibuja: {drawn}.",
    drawnJoin: "; en otras partes, ",
    records: {
      "dso-milky-way": {
        drawn: "una ilustración construida sobre mediciones",
        split: "Medido: las estrellas a pocos miles de años luz (Gaia), el ángulo de la barra, las direcciones a lo largo de los brazos y los brazos más cercanos (Reid et al. 2019). Deducido: el lado lejano más allá del centro, oculto por el polvo; sus brazos son los cercanos llevados al otro lado."
      }
    }
  },
  truth: {
    label: "Cómo lo sabemos",
    hints: {
      measured: "Medido",
      inferred: "Calculado",
      illustrative: "Ilustrativo",
      sample: "Muestra",
      unknown: "Desconocido",
      unplaced: "Sin ubicar",
      reconstruction: "Reconstruido",
      model: "Modelo",
      photograph: "Fotografía",
      catalogue: "Catálogo",
      illustration: "Ilustración"
    },
    loading: "Abriendo la leyenda.",
    failed: "No se cargó la leyenda. La línea de abajo lo dice en breve."
  },
  weatherStorms: {
    turning: {
      jupiter: "De cerca, pequeños remolinos giran donde los vientos medidos se cizallan y en la estela de la Gran Mancha Roja, y el Óvalo BA y tres óvalos blancos giran. Dónde está la cizalladura es un dato medido; cada remolino está generado, más fino que el mapa: ilustrativo."
    },
    poles: {
      jupiter: "Los ciclones alrededor de cada polo están modelados a partir de las observaciones de Juno de 2017, ocho alrededor del polo norte y cinco alrededor del polo sur: una reconstrucción, no una fotografía. La capa más oscura en los huecos es ilustrativa."
    }
  },
  weatherDetail: "Más cerca de lo que el mapa es nítido, se genera una fina textura de nubes con vetas que sostiene la imagen: se mueve con los vientos medidos y conserva los colores del propio mapa, y ni una sola de sus vetas es una nube real. Ilustrativo.",
  weatherVortex: {
    turning: {
      saturn: "De cerca, un pequeño ciclón gira dentro del hexágono: su ojo mide 2 000 km de ancho y su pared da la vuelta a 150 metros por segundo, como midió Cassini en 2012. La espiral dibujada a su alrededor es ilustrativa, y ahora nada lo vigila."
    },
    still: {
      saturn: "De cerca, un pequeño ciclón está dentro del hexágono: su ojo mide 2 000 km de ancho, como midió Cassini en 2012, cuando su pared daba la vuelta a 150 metros por segundo. La espiral dibujada a su alrededor es ilustrativa, y ahora nada lo vigila."
    }
  },
  sunAlive: {
    prominences: "Se alzan {n} protuberancias en su borde, en las regiones activas que NOAA lista a menos de quince grados del limbo. Los lugares son medidos; las formas, las alturas y el movimiento son ilustrativos.",
    prominencesOne: "Se alza una protuberancia en su borde, en una región activa que NOAA lista a menos de quince grados del limbo. El lugar es medido; la forma, la altura y el movimiento son ilustrativos.",
    flare: "Se muestra una llamarada de clase {cls} en la región {region}: alcanzó su máximo a las {time} UTC del {date}, según la lista de eventos de NOAA. Su hora, su clase, su región y su decaimiento son medidos; el brillo con que se dibuja es ilustrativo.",
    cme: "Una eyección de masa coronal que salió a las {time} UTC del {date} a {speed} km/s se dibuja como la muestra un coronógrafo: un lazo brillante que avanza hacia fuera, un hueco más oscuro detrás y un núcleo brillante. Su inicio, dirección, anchura y velocidad son del catálogo DONKI de la NASA; la nube mantiene esa velocidad, cosa que las reales no hacen, y su aspecto es ilustrativo."
  },
  starSystem: {
    zoneLabel: "Zona habitable, calculada",
    orbitOf: {
      mercury: "La órbita de Mercurio, como escala",
      earth: "La órbita de la Tierra, como escala",
      jupiter: "La órbita de Júpiter, como escala",
      neptune: "La órbita de Neptuno, como escala"
    },
    rows: {
      known: "Lo que se sabe",
      orbit: "Distancia a su estrella",
      temperature: "Temperatura, calculada",
      zone: "Zona habitable, calculada",
      starTemperature: "Temperatura de la superficie",
      starWidth: "Ancho",
      starGlow: "Brillo",
      starMass: "Masa",
      planets: "Planetas dibujados",
      stars: "Estrellas del sistema",
      companion: "Segundo sol"
    },
    unseen: "Nadie ha visto su superficie.",
    measuredOne: "Se ha medido su {what}.",
    measuredMany: "Se han medido su {what}.",
    estimatedOne: "Su {what} es una estimación.",
    estimatedMany: "Su {what} son estimaciones.",
    unmeasuredOne: "Su {what} no se ha medido.",
    and: " y ",
    what: {
      size: "tamaño",
      year: "año",
      mass: "masa",
      least: "masa mínima posible"
    },
    au: "{n} UA",
    auComputed: "{n} UA, calculada a partir de su año y de la masa de su estrella",
    earthsEstimated: "{n}× la Tierra, estimación del archivo a partir de su masa",
    massEstimated: "{n}× la Tierra, estimación del archivo a partir de su tamaño",
    massLeast: "Al menos {n}× la Tierra",
    sizeDefault: "Sin medir: se dibuja del tamaño de la Tierra",
    temperature: "{k} K ({c} °C), si refleja el {pct} % de su luz como lo hace la Tierra",
    zone: {
      inside: "Dentro de ella",
      edge: "En su borde: solo dentro de los límites más amplios",
      hotter: "Más cerca de la estrella que ella",
      colder: "Más lejos de la estrella que ella"
    },
    zoneNone: {
      "too-hot": "No calculada: la fórmula no cubre una estrella tan caliente",
      "too-cool": "No calculada: la fórmula no cubre una estrella tan fría",
      "no-temperature": "No calculada: no se ha medido la temperatura de la estrella",
      "no-luminosity": "No calculada: no se ha medido el brillo de la estrella",
      twoStars: "No calculada: orbita dos estrellas y el catálogo describe una"
    },
    zoneRange: "De {a} a {b} UA de la estrella (Kopparapu et al. 2014)",
    overlay: {
      title: "Superponer al mapa",
      zone: "Zona habitable",
      orbits: "Órbitas de nuestros planetas",
      zoneTitle: "Dónde podría mantenerse agua líquida en la superficie de un planeta, calculado a partir de la temperatura y el brillo de la estrella",
      orbitsTitle: "Las órbitas de los planetas de nuestro propio sistema solar, dibujadas alrededor de esta estrella como escala",
      note: {
        none: "No se superpone nada al sistema.",
        zone: "La banda verde es la zona habitable, calculada (Kopparapu et al. 2014), no observada.",
        orbits: "Los anillos de trazos son órbitas de nuestro propio sistema solar, como escala. Nada de aquí las sigue.",
        both: "La banda verde es la zona habitable, calculada; los anillos de trazos son las órbitas de nuestros propios planetas, como escala."
      }
    },
    kelvin: "{n} K",
    notMeasured: "Sin medir",
    starPoint: "Sin medir: se dibuja como un punto de luz",
    starWhite: "Sin medir: se dibuja blanca",
    starGlowValue: "Se dibuja más ancho que la estrella, de su color, para que se vea desde muy lejos",
    starsOne: "{n} en el catálogo; se dibuja una",
    starsBoth: "Dos, las dos dibujadas",
    companionValue: "{width} de ancho, {mass} de masa, {k} K{derived}",
    companionDerived: " (un valor de modelo; su color es ilustrativo)",
    zoneBoth: "De {a} a {b} UA, sumando la luz de los dos soles",
    pairLine: "Los dos soles giran uno alrededor del otro cada {days} días, a {a} UA de distancia en promedio, en la órbita que midieron los artículos; el planeta gira alrededor de ambos. Sus posiciones se calculan a partir de esa órbita; el plano en el que se dibujan, el plano de los planetas, es el que usa la vista del cielo.",
    line: "Tamaños y años del NASA Exoplanet Archive, leídos el {date}. Las órbitas se dibujan como círculos{computed}; los colores{phase} y la inclinación de las órbitas son ilustrativos{defaults}.",
    lineComputed: ", {n} de ellas con el tamaño calculado a partir del año y de la masa de la estrella",
    lineDefaults: "; un planeta sin tamaño medido se dibuja del tamaño de la Tierra"
  },
  shells: {
    radio: "La radio desde la Tierra ha llegado a {n} años luz"
  },
  subscribe: {
    heading: "Lo que viene, por correo",
    emailLabel: "Tu dirección de correo",
    emailPlaceholder: "tu@ejemplo.com",
    pickOne: "Marca al menos una.",
    launchesLabel: "Próximos lanzamientos",
    showersLabel: "Máximos de lluvias de meteoros",
    approachesLabel: "Aproximaciones cercanas",
    submit: "Suscribirme",
    sending: "Enviando…",
    pending: "Revisa tu correo para confirmar.",
    couldNotReach: "No se pudo contactar con el servicio."
  },
  flood: {
    on: "Iluminarlo",
    off: "Luz real",
    title: "Iluminar el modelo de forma uniforme, para poder verlo en la sombra. No es la luz real.",
    note: "Nuestra lámpara, no la luz real."
  },
  ephemeris: {
    drawn: "Dibujado a partir de JPL Horizons, interpolado: a unos {km} km de la trayectoria del propio JPL.",
    note: "El mapa guarda su trayectoria de ese día, de JPL Horizons, con una precisión de unos {km} km.",
    noteLate: "La trayectoria del JPL empieza {n} minutos después de este momento, y el reloj va allí. Precisión de unos {km} km.",
    noteDay: "La página de la NASA da el día. El reloj va a las {time} UTC, el paso más cercano en la trayectoria del JPL ese día, con una precisión de unos {km} km.",
    failed: "Su trayectoria de ese día no se cargó, así que el reloj se queda donde está. Elígelo otra vez para reintentar.",
    span: "La trayectoria del JPL para él va de {from} a {to}.",
    before: "El reloj está antes de eso, así que el mapa no tiene posición para él.",
    after: "El reloj está después de eso, así que el mapa no tiene posición para él.",
    go: "Ir a la fecha disponible más cercana",
    goBefore: "Llevar el reloj al {date}, donde empieza la trayectoria del JPL para él",
    goAfter: "Llevar el reloj al {date}, donde termina la trayectoria del JPL para él"
  },
  offline: {
    updateReady: "Hay una versión más nueva lista",
    reload: "Recargar"
  },
  keepTrip: {
    keep: "Guardar sin conexión",
    keepTitle: "Guardar la voz, los modelos y los mapas de este viaje en este dispositivo para que se reproduzca sin conexión",
    keeping: "Guardando {done} de {total}",
    kept: "Guardado sin conexión",
    keptTitle: "Guardado en este dispositivo. Pulsa para descargarlo otra vez.",
    keptNote: "{n} archivos, {size}, guardados en este dispositivo. Los datos en vivo (tiempo, tormentas, satélites) no se guardan.",
    again: "Intentar de nuevo",
    failedNote: "Guardados {done} de {total} archivos. Comprueba la conexión e inténtalo de nuevo."
  },
  autopilot: {
    mark: "spaceradar.ai",
    gateTitle: "Pulsa cualquier tecla para empezar con sonido",
    gateTitleTouch: "Toca la pantalla para empezar con sonido",
    gateNote: "Si no hay nadie, empieza en silencio, con subtítulos, en {n} segundos.",
    upNext: "Siguiente viaje",
    shape: "{n} paradas · {m} min",
    take: "Tomar los mandos",
    takeTitle: "Detener los viajes y mover tú el mapa"
  },
  drift: {
    name: "Deriva",
    pause: "Pausa (Espacio)",
    resume: "Seguir (Espacio)",
    next: "Siguiente lugar (N)",
    options: "Opciones",
    optionsTitle: "Por qué viajar, qué mostrar y el ritmo",
    leave: "Dejar de derivar (Escape)",
    through: "Viajar por",
    cats: {
      craft: "Naves",
      worlds: "Mundos",
      small: "Cuerpos pequeños",
      stars: "Estrellas",
      deep: "Cielo profundo"
    },
    show: "Mostrar",
    real: "Modelos reales",
    realTitle: "Solo cosas con un modelo, un mapa o una fotografía reales",
    names: "Nombres",
    namesTitle: "El nombre y los números junto a cada lugar",
    bare: "Solo espacio",
    bareTitle: "Nada más que el cielo y lo que hay en él: sin nombres, marcas, líneas ni paneles",
    pace: "Ritmo",
    paces: {
      calm: "Tranquilo",
      steady: "Constante",
      brisk: "Ágil"
    },
    hint: "A la deriva. Arrastra el mapa para tomar los mandos",
    nothing: "No hay nada por lo que derivar con estas opciones",
    notFromGround: "La deriva empieza desde el espacio, no desde el suelo"
  },
  tour: {
    label: "El recorrido",
    micro: "Recorrido",
    count: "{n} / {of}",
    next: "Siguiente",
    nextTitle: "El paso siguiente (N)",
    done: "Hecho",
    doneTitle: "Terminar el recorrido",
    skip: "Omitir",
    skipTitle: "Salir del recorrido (Escape)",
    voice: "Voz",
    voiceTitle: "Leer cada paso en voz alta, con una voz sintética",
    waited: "Echa un vistazo y sigue.",
    invite: "Primera vez aquí: haz el recorrido",
    inviteTitle: "Ocho pasos por el mapa"
  },
  undo: {
    moved: "Movido a {name}",
    movedNowhere: "La vista se movió",
    night: "Noche en {name}: la vista amplia",
    back: "Volver a donde estabas",
    done: "De vuelta donde estabas"
  },
  searchRows: {
    kinds: {
      sun: "Estrella",
      planet: "Planeta",
      moon: "Luna",
      station: "Estación espacial",
      satellite: "Satélite",
      telescope: "Telescopio espacial",
      probe: "Nave espacial",
      rocket: "Cohete",
      launch: "Lanzamiento",
      debris: "Basura espacial",
      asteroid: "Asteroide",
      comet: "Cometa",
      site: "Lugar",
      landing: "Lugar de aterrizaje",
      star: "Estrella",
      exoplanet: "Planeta de otra estrella",
      dso: "Objeto del cielo profundo",
      storm: "Tormenta tropical",
      oddity: "Rareza",
      earthevent: "Suceso en la Tierra",
      blackhole: "Agujero negro",
      pulsar: "Púlsar",
      magnetar: "Magnetar",
      quasar: "Cuásar"
    },
    upNow: "sobre el horizonte ahora, hacia el {compass}",
    lowNow: "bajo, hacia el {compass}, ahora",
    downNow: "bajo tu horizonte ahora",
    trip: "Viaje",
    starPattern: "Constelación de estrellas",
    mission: "Misión",
    eventName: "{mission}: {title}",
    event: "Hito de misión · {date}",
    eventNoDate: "Hito de misión",
    group: "Constelación · {n} satélites en el mapa · pulsa para listarlos",
    nearMe: "Cerca de mí esta noche",
    nearMeSub: "Lo que hay en tu cielo"
  },
  countdown: {
    go: "Listo para el lanzamiento",
    tbc: "Hora por confirmar",
    tbd: "Hora sin fijar",
    hold: "En espera: la cuenta atrás está en pausa",
    inFlight: "En vuelo",
    success: "Lanzado",
    deployed: "Carga útil desplegada",
    failure: "El lanzamiento falló",
    partial: "Fallo parcial",
    byPlan: "Según el plan. Sin novedades",
    byPlanClimbing: "Según el plan, ascendiendo. Sin novedades",
    age: "leído {age}"
  },
  today: {
    title: "Hoy",
    moonTitle: "Luna: {phase}",
    moonLine: "{pct} % iluminada · {next} el {date}",
    moonNext: ["luna nueva", "cuarto creciente", "luna llena", "cuarto menguante"],
    approachLine: "{value} · {detail}",
    launchedKicker: "Últimos 30 días",
    launched: "{n} objetos nuevos en órbita",
    launchedLine: "El más reciente: {name}",
    debris: "La basura espacial, en cifras",
    debrisClose: "Cerrar la vista de basura espacial",
    debrisTitle: "Cuenta todo lo que se sigue en órbita. Lee todo el catálogo, unos 1.5 MB"
  },
  sentence: {
    one: "{a}.",
    two: "{a}, y {b}.",
    title: "De {sources}. Pulsa para ir allí",
    names: {
      "sat-25544": "la EEI",
      "sat-48274": "Tiangong"
    },
    pass: "{name} pasa sobre ti {when}",
    launch: "{name} despegará {when}",
    showerToday: "{name}: máximo hoy",
    showerTomorrow: "{name}: máximo mañana",
    moonName: "La Luna",
    moonPhases: ["nueva", "", "llena", ""],
    moonToday: "hoy la Luna está {phase}",
    moonOne: "la Luna está a un día de estar {phase}",
    moonDays: "la Luna está a {n} días de estar {phase}",
    moonLit: "la Luna está iluminada al {pct} %",
    crew: "{n} personas están en órbita ahora mismo",
    crewOne: "una persona está en órbita ahora mismo",
    storms: "{n} tormentas en marcha",
    stormOne: "una tormenta en marcha",
    approach: "{name}: paso cercano {when}",
    launched: "{n} objetos nuevos en órbita en 30 días",
    dateToday: "hoy es {date}",
    dateClock: "el reloj está puesto en {date}",
    sources: {
      pass: "elementos de CelesTrak",
      launch: "Launch Library 2",
      shower: "el calendario de lluvias de la IMO",
      moon: "Astronomy Engine",
      crew: "Open Notify",
      storms: "GDACS",
      approach: "NASA JPL",
      launched: "CelesTrak",
      clock: "el reloj de tu dispositivo"
    }
  },
  wonder: {
    kicker: "Maravilla del día",
    label: "Maravilla del día: {title}"
  },
  story: {
    kicker: "La historia de esta semana · semana {week}",
    label: "La historia de esta semana: {title}",
    ruleTitle: "Cómo se calculó: {rule}",
    lowest: {
      title: "Lo más bajo de nuestro catálogo: {name}",
      line: "Nunca por encima de {apogee} km, hasta {perigee} km, una vuelta en {min} min.",
      rule: "Punto más alto más bajo de {n} conjuntos de elementos de menos de 7 días"
    },
    farthest: {
      title: "Lo más lejano de nuestro catálogo: {name}",
      line: "Hasta {apogee} km, de vuelta a {perigee} km, una vuelta en {lap}.",
      hours: "{n} horas",
      days: "{n} días",
      rule: "Punto más alto de {n} conjuntos de elementos de menos de 7 días"
    },
    busiest: {
      title: "La altura más concurrida que tenemos: de {lo} a {hi} km",
      line: "{n} de los {total} objetos que tenemos vuelan ahí: {pct} de cada 100.",
      rule: "Los {band} km más poblados de altura media en {n} conjuntos de menos de 7 días"
    },
    oldest: {
      title: "El lanzamiento más antiguo de nuestro catálogo: {name}",
      line: "Lanzado en {year}, {years} años en el espacio, una vuelta en {min} min.",
      rule: "Año de lanzamiento más antiguo de {n} conjuntos de elementos de menos de 7 días"
    }
  },
  happened: {
    flown: "Despegó {age}",
    lost: "Lanzamiento fallido {age}"
  },
  passport: {
    title: "Pasaporte",
    openTitle: "Dónde has estado, guardado solo en este navegador",
    summary: "{places} · {n} de {total} viajes",
    places: "{n} lugares",
    placeOne: "{n} lugar",
    kept: "Guardado solo en este navegador, nunca enviado.",
    notKept: "Este navegador no guarda nada: aquí no hay nada.",
    placesTitle: "Lugares que abriste",
    tripsTitle: "Viajes terminados",
    outOf: "{n} de {total}",
    barLabel: "{n} de {total} viajes terminados",
    placeTitle: "Ir a {name}",
    noPlaces: "Todavía no hay lugares. Abre uno en el mapa.",
    noTrips: "Todavía no hay viajes terminados.",
    seenTitle: "Visto con tus propios ojos",
    noSeen: "Aún nada marcado. Cada ficha tiene un botón «Lo he visto».",
    seenIt: "Lo he visto",
    toolsLabel: "Más para este objeto",
    seenOn: "Visto el {date}",
    seenTitleOff: "Márcalo cuando lo hayas visto con tus propios ojos",
    seenTitleOn: "Marcado como visto. Pulsa para quitar la marca",
    seenNotKept: "Este navegador no guarda nada: la marca no se queda",
    remind: "Recuérdamelo",
    remindTitle: "Descarga un archivo de calendario con un recordatorio: {title}",
    forget: "Olvidarme",
    forgetConfirm: "Sí, olvidar",
    forgetTitle: "Borra el pasaporte y la elección de sonido de este navegador",
    forgotten: "Olvidado. Este navegador ya no guarda nada.",
    stamp: "Viaje {n} de {total} · {date}",
    stampPlaces: "Lugares abiertos hasta ahora: {places}",
    resume: "Seguir en la parada {n}"
  },
  kept: {
    title: "Lo que este sitio guarda en tu dispositivo",
    lines: [
      "Tu pasaporte: lugares abiertos, viajes terminados, cosas marcadas como vistas.",
      "Tu elección de sonido y de voz, y cómo dejaste los paneles.",
      "Una copia de los últimos datos que leyó, para que el mapa se abra sin conexión.",
      "Mientras una pantalla se reproduce sola, un breve registro de sus viajes, solo para esta pestaña."
    ],
    place: "Tu lugar se redondea a una décima de grado y se conserva solo mientras esta página está abierta.",
    none: "Sin cuenta, sin cookies, sin analítica. «Olvidarme», en el Pasaporte, borra el pasaporte y la elección de sonido."
  },
  buildInfo: {
    line: "Construido desde {sha}, {date}",
    title: "El commit desde el que se construyó este sitio, en GitHub",
    href: "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  realLook: {
    title: "¿Así se ve el espacio?",
    lead: "Dónde están las cosas y cómo se mueven es algo medido o calculado. Su aspecto viene de tres tipos de imagen.",
    kinds: [
      [
        "Un modelo 3D",
        "Las nebulosas y las galaxias son modelos 3D hechos con medidas publicadas, con la luz tomada de fotografías de telescopio (de larga exposición); las que aún no tienen modelo son un resplandor suave de su tamaño. Para el ojo, el mismo gas es un tenue resplandor gris. Una ficha puede mostrar la fotografía junto a su modelo."
      ],
      [
        "Un mapa sobre un modelo",
        "Los planetas y las lunas son globos que llevan mapas hechos con imágenes de naves, algunos suavizados por un artista. Las naves son modelos 3D, la mayoría a partir de archivos publicados por la NASA. La luz que reciben se calcula para el momento mostrado."
      ],
      [
        "Una recreación artística",
        "Nadie ha visto la superficie de un planeta de otra estrella. Esas caras se imaginan a partir de un tamaño y una temperatura medidos, y sus fichas lo dicen."
      ]
    ],
    foot: "A veces se cambian los tamaños y las distancias para que algo pueda verse siquiera. Cuando es así, la ficha o la imagen lo dice."
  },
  debris: {
    title: "Basura en órbita",
    reading: "Leyendo el catálogo, unos 1.5 MB",
    failed: "No se pudo leer el catálogo.",
    retry: "Intentar de nuevo",
    empty: "El catálogo no lista nada en órbita.",
    lead: "{gone} de los {total} objetos que se siguen en órbita ya no funcionan.",
    kinds: {
      debris: "fragmentos de basura",
      rocket: "cuerpos de cohete agotados",
      dead: "satélites muertos",
      working: "satélites en funcionamiento"
    },
    bandsTitle: "Por altura",
    bands: {
      low: "Menos de 600 km",
      crowded: "De 600 a 1 000 km",
      upper: "De 1 000 a 2 000 km",
      medium: "De 2 000 a 34 000 km",
      geo: "Alrededor de 36 000 km",
      beyond: "Más allá de 37 600 km",
      stretched: "Órbitas alargadas"
    },
    bandAria: "{band}: {total} en total. {debris} fragmentos de basura, {rocket} cuerpos de cohete, {dead} satélites muertos, {working} en funcionamiento.",
    show: "Mostrar en el mapa",
    hide: "Ocultar del mapa",
    showTitle: "Cada fragmento de basura y cada cohete agotado, coloreados por tipo",
    drawn: "{n} puntos: el gris es basura y el amarillo un cohete agotado. Cada uno está a su altura e inclinación reales, en un lugar inventado de su órbita.",
    storiesTitle: "Del catálogo",
    oneObject: "Un objeto",
    objects: "{n} objetos",
    oneLaunch: "un lanzamiento",
    launches: "{n} lanzamientos",
    oneThing: "Una cosa",
    things: "{n} cosas",
    storyLaunched: "{objects} de {launches} se sumaron al catálogo en la semana hasta el {date}.",
    storyCameDown: "Cayeron esa semana: {things}.",
    storyCameDownBiggest: "Cayeron esa semana: {things}; la mayor, {name}.",
    storyCloud: "La mayor nube de basura es la de {name}: {pieces} fragmentos que siguen en órbita.",
    storyClouds: "Las mayores nubes de basura: {name}, {pieces} fragmentos aún en órbita; después {name2}, {pieces2}, y {name3}, {pieces3}.",
    storyOldest: "Lo más antiguo que sigue en órbita es {name}, lanzado en {year}: {years} años de vueltas.",
    untracked: "Demasiado pequeño para seguirlo, según el modelo de la ESA: unos {mid} millones de fragmentos de 1 a 10 cm y {small} millones de 1 mm a 1 cm, a {when}. Una estimación, no un recuento.",
    untrackedSource: "Estadísticas del entorno espacial de la ESA",
    honesty: "Contado a partir del catálogo de CelesTrak leído el {date}: lo que el radar puede seguir, a partir de unos 10 cm de ancho. Los fragmentos más pequeños son mucho más numerosos y no están en ningún catálogo. Dónde está un punto a lo largo de su órbita es ilustrativo.",
    drawnPlaced: "{n} puntos: el gris es basura y el amarillo un cohete agotado. {placed} están donde los pone su propio conjunto de elementos; los otros {rest} están a su altura e inclinación reales, en un lugar inventado de la órbita.",
    honestyPlaced: "Contado a partir del catálogo de CelesTrak leído el {date}: lo que el radar puede seguir, a partir de unos 10 cm de ancho. Los fragmentos más pequeños son mucho más numerosos y no están en ningún catálogo. Los lugares vienen de los conjuntos de elementos de CelesTrak del {built}; un punto sin conjunto de elementos publicado está en un lugar inventado de su órbita, y su ficha lo dice."
  },
  klassFar: {
    dwarf: "Planeta enano",
    interstellar: "Objeto interestelar"
  },
  moments: {
    title: "Para qué estás aquí",
    wonder: {
      id: "wonder",
      label: "Asombro",
      hint: "Vuela y toca cualquier cosa."
    },
    now: {
      id: "now",
      label: "Ahora",
      hint: "Lo que hay sobre tu cabeza este minuto."
    },
    next: {
      id: "next",
      label: "Después",
      hint: "Lo que viene y cuándo."
    }
  },
  audio: {
    on: "Sonido: activado",
    off: "Sonido: desactivado",
    toggleTitle: "Música y sonidos. Desactivados hasta que los actives; se recuerda en este dispositivo.",
    mute: "Silenciar",
    unmute: "Sonido",
    muteTitle: "Desactivar la música y los sonidos",
    unmuteTitle: "Activar la música y los sonidos",
    panelTitle: "Sonido",
    panelNote: "Una banda sonora tranquila para el mapa y sus viajes. No se descarga nada hasta que la actives.",
    creditsLine: "Música y sonidos: {credits}",
    narrationCredit: "Narración: una voz sintética, Kokoro-82M (af_heart), Apache-2.0"
  },
  dwarfLook: {
    colour: "Dibujado del color que mide su luz (B−V {bv}, V−R {vr}), tan brillante como lo refleja su superficie (albedo {albedo}) en una escala comprimida para que el más oscuro de estos mundos aún se vea.",
    colourRed: "Dibujado del color que mide su luz (B−V {bv}, V−R {vr}), una de las cosas más rojas del Sistema Solar, tan brillante como lo refleja su superficie (albedo {albedo}) en una escala comprimida para que el más oscuro de estos mundos aún se vea.",
    shapeEgg: "Su forma es el huevo que midieron su curva de luz y una ocultación estelar de 2017, de {a} × {b} × {c} km.",
    shapeMeasured: "Su forma es la que midieron las ocultaciones estelares.",
    shapeUnknown: "Su forma nunca se ha medido, así que se dibuja redonda.",
    ring: "Su anillo está a su distancia, anchura y opacidad medidas; no se dibuja cómo está inclinado el anillo en el cielo.",
    faintRings: "Sus dos anillos, hallados en 2023, son demasiado tenues para verse con su opacidad real, así que no se dibujan.",
    surface: "Ningún telescopio ha resuelto su superficie: no se dibuja nada en ella, y se dibuja quieto, sin girar.",
    source: "Cifras: {src}."
  },
  worldFace: {
    titan: {
      title: "Titán, de dos maneras",
      modes: {
        own: "Infrarrojo",
        radar: "Radar"
      },
      notes: {
        own: "El suelo de Titán como lo vio la cámara de la Cassini a través de la bruma, con luz del infrarrojo cercano (938 nm), en el naranja de la bruma. Los mares del norte se oscurecen siguiendo los contornos que dibujó el radar de la Cassini y, de cerca, donde el Sol se refleja en ellos, brillan: dónde cae el destello está calculado; su tamaño y su brillo son ilustrativos.",
        radar: "Franjas del suelo de Titán como las vio el radar de la Cassini a través de la bruma, de 2004 a 2015: lo brillante es terreno rugoso o inclinado hacia el radar, lo oscuro es liso, y los mares de metano y etano líquidos son negros. El gris es nuestro: el radar no tiene color. El radar vio el 61 % de Titán; entre sus franjas se ve, atenuado y en naranja, el mapa infrarrojo. USGS Astrogeology y NASA/JPL-Caltech, dominio público."
      }
    },
    venus: {
      title: "Venus, de dos maneras",
      modes: {
        own: "Nubes",
        surface: "Suelo"
      },
      notes: {
        own: "Las cimas de las nubes, que es todo lo que un ojo o un telescopio ven de Venus.",
        surface: "El suelo bajo las nubes, cartografiado por radar desde la órbita por la Magellan de la NASA entre 1990 y 1992. Lo brillante es terreno rugoso y lo oscuro, liso. El naranja está añadido, y las franjas que Magellan no cubrió se rellenan desde sus bordes. Está iluminado por el Sol como si las nubes no estuvieran: sus montañas y escarpes, según el altímetro de Magellan y dibujados seis veces más altos, proyectan sus sombras. No se mueve con las nubes."
      }
    },
    jupiter: {
      title: "Júpiter, de dos maneras",
      modes: {
        own: "Mapa del artista",
        hubble: "Como lo vio Hubble"
      },
      notes: {
        own: "Un mapa del artista, hecho a partir de imágenes de naves y suavizado (Solar System Scope). Es la imagen que la mayoría de la gente conoce.",
        hubble: "Júpiter tal como lo cartografió Hubble el 11 de diciembre de 2025. Las bandas están donde estaban ese día, y ninguna nube está donde está hoy. Los colores son los de los filtros rojo, verde y violeta de Hubble, un poco más amarillos de lo que vería un ojo. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    saturn: {
      title: "Saturno, de dos maneras",
      modes: {
        own: "Mapa del artista",
        hubble: "Como lo vio Hubble"
      },
      notes: {
        own: "Un mapa del artista, hecho a partir de imágenes de naves y suavizado (Solar System Scope). Es la imagen que la mayoría de la gente conoce.",
        hubble: "Saturno tal como lo cartografió Hubble el 29 de agosto de 2025, en sus filtros rojo, verde y violeta, un poco más amarillo de lo que vería un ojo. La franja del ecuador que los anillos taparon ese día se rellena con las nubes de ambos lados. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    uranus: {
      title: "Urano, de dos maneras",
      modes: {
        own: "Mapa del artista",
        hubble: "Como lo vio Hubble"
      },
      notes: {
        own: "Un mapa del artista, hecho a partir de imágenes de naves y suavizado (Solar System Scope). Es la imagen que la mayoría de la gente conoce.",
        hubble: "Urano tal como lo cartografió Hubble el 23 de octubre de 2025. El planeta está de costado, con su polo norte hacia nosotros, así que Hubble solo vio la mitad norte; a la mitad sur se le da el color del ecuador, no se adivina. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    neptune: {
      title: "Neptuno, de dos maneras",
      modes: {
        own: "Mapa del artista",
        hubble: "Como lo vio Hubble"
      },
      notes: {
        own: "Un mapa del artista, hecho a partir de imágenes de naves y suavizado (Solar System Scope). Es la imagen que la mayoría de la gente conoce.",
        hubble: "Neptuno tal como lo cartografió Hubble el 24 de agosto de 2025: más pálido que las imágenes famosas. El extremo norte quedaba fuera de la vista de Hubble y se le da el color de las últimas nubes que vio, no se adivina. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    }
  },
  exposure: {
    panelTitle: "Exposición",
    modes: {
      eye: "Ojo",
      camera: "Cámara",
      deep: "Profunda"
    },
    notes: {
      eye: "Lo que verías desde un lugar oscuro: tenue y gris.",
      camera: "Una exposición larga: minutos de luz, como la conserva una cámara.",
      deep: "Un realce de observatorio: se levanta el gas más tenue."
    },
    real: "El gas es real, y tenue: para el ojo ante un telescopio es un resplandor gris, porque el ojo nocturno no ve color. La imagen en el cielo es una exposición larga.",
    colours: {
      broadband: "Se tomó con filtros de color de banda ancha ({filters}), así que los colores se acercan a lo que vería un ojo mucho más sensible.",
      mixed: "Se tomó con filtros de color de banda ancha y uno estrecho para el hidrógeno incandescente ({filters}), así que el gas rojo es aquí más intenso de lo que lo vería un ojo.",
      narrowband: "Sus colores están asignados: cada uno es la luz de un solo gas a través de un filtro estrecho ({filters}), elegidos para mostrar la estructura, no lo que vería un ojo.",
      infrared: "Se tomó en luz infrarroja, que ningún ojo puede ver ({filters}), así que todos los colores de aquí están elegidos: muestra lo que hay, no lo que vería un ojo.",
      unstated: "Su archivo no dice qué filtros se usaron, así que no decimos si estos son los colores que vería un ojo."
    },
    part: "Muestra {part}, no su totalidad.",
    creditLead: "Imagen: ",
    creditTail: " · {licence}, con los bordes atenuados y el cielo oscurecido por nosotros"
  },
  look: {
    panelTitle: "Aspecto",
    modes: {
      measured: "Medido",
      film: "Cine"
    },
    titles: {
      measured: "Solo lo medido o modelado, a ritmo real",
      film: "Añade detalle generado y tiempo atmosférico ilustrativo"
    }
  },
  lookSaid: {
    measured: "Aspecto Medido: no se dibuja nada generado ni ilustrativo.",
    film: "Aspecto Cine: se dibujan detalle generado y tiempo atmosférico ilustrativo.",
    worlds: {
      saturn: "Clima: las bandas se mueven a las velocidades del viento que midió Cassini. Movimiento modelado, no las nubes de hoy."
    },
    also: {
      venus: "Se han comunicado rayos en Venus y aún se debate; no se dibuja ninguno."
    },
    turning: {
      jupiter: "De cerca, el Óvalo BA y tres óvalos blancos giran donde el mapa los tiene."
    },
    poles: {
      jupiter: "Los ciclones alrededor de cada polo están modelados a partir de las observaciones de Juno de 2017, ocho alrededor del polo norte y cinco alrededor del polo sur: una reconstrucción, no una fotografía."
    },
    sun: {
      measured: "Aspecto Medido: el grano generado está desactivado, y la corona y las protuberancias se mantienen quietas.",
      film: "Aspecto Cine: el grano se genera, y la corona y las protuberancias se mueven como se dibujan, no como se miden."
    }
  },
  otherLight: {
    panelTitle: "Otras luces",
    bands: {
      visible: "Visible",
      infrared: "Infrarrojo",
      microwave: "Microondas",
      gamma: "Rayos gamma"
    },
    notes: {
      visible: "El cielo como lo ven los ojos y las cámaras.",
      infrared: "El cielo en infrarrojo, en falso color: polvo cálido y estrellas frías.",
      microwave: "Microondas, como brillo: la Galaxia sobre la luz más antigua.",
      gamma: "Rayos gamma, en falso color: púlsares, blazares, resplandor de rayos cósmicos."
    },
    colours: {
      infrared: "El rojo es 22 µm, el verde 4.6 µm, el azul 3.4 µm (WISE)",
      microwave: "Una sola banda, 94 GHz, dibujada como brillo (WMAP)",
      gamma: "El rojo es de 0.3 a 1 GeV, el verde de 1 a 3, el azul por encima de 3 (Fermi)"
    },
    mixLabel: "Del cielo visible a {band}",
    mixValue: "{pct} % {band}",
    loading: "Descargando la imagen de todo el cielo.",
    failed: "Esa imagen no llegó. El cielo sigue como estaba.",
    creditLead: "Sondeo: ",
    creditTail: ". Teselas: CDS, Estrasburgo."
  },
  overlay: {
    panelTitle: "Datos de la Tierra",
    keyTitle: "En el globo ahora",
    keyOff: "Quitarlo",
    keyOffTitle: "Mostrar la Tierra tal como es",
    none: "Ninguno",
    loading: "Pidiendo la imagen a la NASA.",
    failed: "Esa imagen no llegó. El globo sigue como estaba.",
    noEarth: "Se muestra en la Tierra, cuando está a la vista.",
    line: "{what} {dated} {made} {credit}",
    dated: {
      daily: "La imagen es del {date}.",
      monthly: "La imagen es la media de {date}."
    },
    made: {
      measured: "Medido desde la órbita; despejado donde no se vio nada.",
      analysed: "Medido, con los huecos rellenados.",
      modelled: "Un modelo meteorológico alimentado con mediciones, no una imagen directa."
    },
    credit: "Datos: {credit}, a través de NASA GIBS. Un mapa de datos, no una fotografía.",
    wind: {
      title: "Viento",
      loading: "Pidiendo el campo de viento.",
      failed: "El campo de viento no llegó. El globo sigue como estaba.",
      what: "El viento a diez metros del suelo; el color es su velocidad.",
      dated: "El pronóstico es para el {date}, {time} UTC.",
      mean: "Unos {mean} m/s de media, hasta {max}.",
      sped: "Las líneas mueven {n} horas de viento en un segundo.",
      spedDay: "Las líneas mueven un día de viento en un segundo.",
      still: "Cada línea es un trozo del flujo, detenido.",
      credit: "Datos: {credit}. Un modelo meteorológico, no una medición."
    },
    currents: {
      title: "Corrientes oceánicas",
      loading: "Pidiendo las corrientes oceánicas.",
      failed: "Aquí no están las corrientes oceánicas de hoy. El globo sigue como estaba.",
      what: "Corrientes en la superficie del mar; el color es la temperatura del agua.",
      dated: "Calculadas a partir de la altura del mar que midieron los satélites el {date}: el flujo estable, sin mareas ni deriva del viento, con menos certeza en el ecuador.",
      tempDated: "Temperatura medida el {date}, con los huecos rellenados.",
      tempMissing: "Una línea gris es agua sin temperatura en los datos.",
      sped: "Las líneas mueven {n} días de deriva en un segundo; una línea larga es agua rápida.",
      spedHours: "Las líneas mueven {n} horas de deriva en un segundo; una línea larga es agua rápida.",
      still: "Cada línea es un trozo del flujo, detenido; una larga es agua rápida.",
      credit: "Datos: {credit}."
    },
    legendAria: "{title}, de {low} a {high} {unit}",
    legendHigh: "{high} {unit}"
  },
  figures: {
    line: "Las figuras son una tradición, dibujadas por nosotros; las estrellas de sus esquinas están a sus distancias medidas.",
    lineSky: "Las figuras son una tradición, dibujadas por nosotros, sobre las estrellas tal como se ven desde la Tierra.",
    ecliptic: "La línea de trazos es la eclíptica, el camino del Sol a lo largo del año.",
    distance: "{n} a. l.",
    namedDistance: "{name}, {n} a. l."
  },
  colourKey: {
    title: "Color según",
    unknown: "no se conoce para estos",
    scope: "Cuenta lo que se dibuja desde aquí, en las capas activas.",
    byLayer: "La forma es lo que es; el color es su capa.",
    crewed: "de ellos, construidos para llevar tripulación",
    swarm: "de ellos, en una gran constelación"
  },
  trajectory: {
    label: "Su trayectoria, la próxima vuelta y media",
    ariaLabel: "Altura a lo largo del tiempo y traza sobre la Tierra en un mapa plano",
    km: "{n} km",
    now: "ahora",
    laps: "1½ vueltas después",
    north: "N",
    south: "S",
    note: "Calculada con los mismos elementos que el punto; el mapa es el suelo justo debajo de él."
  },
  timeFacts: {
    label: "Los próximos 90 minutos",
    barLabel: "Luz del Sol y sombra durante los próximos 90 minutos: {parts}",
    barSunlit: "{mins} min a la luz del Sol",
    barShadow: "{mins} min en la sombra de la Tierra",
    now: "ahora",
    end: "+90 min",
    entersShadowIn: "Entra en la sombra de la Tierra en {mins}",
    entersSunlightIn: "Sale a la luz del Sol en {mins}",
    entersShadowAt: "Entra en la sombra de la Tierra a las {time}",
    entersSunlightAt: "Sale a la luz del Sol a las {time}",
    allSunlit: "A la luz del Sol durante todos los próximos 90 minutos",
    allShadow: "En la sombra de la Tierra durante todos los próximos 90 minutos",
    minutes: "{n} min",
    underAMinute: "menos de un minuto",
    lapIn: "Completa esta vuelta en {mmss}",
    lapAt: "Completa esta vuelta a las {time}",
    orbit: "Órbita {n} desde el lanzamiento",
    orbitNote: "Deducido: el recuento del catálogo en la época de los elementos, más las vueltas desde entonces.",
    launched: "Lanzado en {year}",
    nowSunlit: "A la luz del Sol",
    nowShadow: "En la sombra de la Tierra",
    shadowIn: "sombra en {mins}",
    sunlightIn: "sol en {mins}",
    shadowAt: "sombra a las {time}",
    sunlightAt: "sol a las {time}",
    lapEndsIn: "la vuelta termina en {mmss}",
    lapEndsAt: "la vuelta termina a las {time}"
  },
  train: {
    label: "En tren",
    oneOf: "Uno de {n} lanzados juntos ({designator}).",
    youLead: "Este va en cabeza.",
    leads: "{name} va en cabeza; este es el número {position} de la fila.",
    stillRaising: "Todavía sube como una sola fila, a unos {alt} km de altura: la hilera de luces de la que habla la gente.",
    spreadOut: "Ya está disperso, a unos {alt} km de altura; ya no es una fila en el cielo."
  },
  aboard: {
    label: "También a bordo",
    openTitle: "Abrir la ficha de esto",
    note: "Estos no tienen un punto propio. Están exactamente donde está esta nave, porque están atornillados a ella.",
    backTitle: "Abrir la ficha de la nave que lleva esto"
  },
  myth: {
    label: "Se dice a menudo",
    line: "{claim} — {correction}",
    contested: "Se dice a menudo, y es realmente discutido: {claim} — {correction}"
  },
  source: {
    prefix: "Fuente",
    unknown: "Fuente no registrada",
    fetched: "leído {age}"
  },
  photo: {
    title: "Componer una imagen",
    barLabel: "Imagen",
    shapesLabel: "Formato",
    shapes: {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    shapeTitle: "Encuadrar la imagen en {shape}",
    caption: "Pie",
    captionTitle: "La tira con el nombre, la fecha y la dirección",
    save: "Guardar imagen",
    saveTitle: "Guardar lo que hay dentro del marco como JPEG",
    saveTitlePng: "Guardar lo que hay dentro del marco como PNG",
    timeLabel: "Hora",
    earlier: "Antes",
    later: "Después",
    timeTitle: "{dir}, en pasos de {unit}, como avanza el indicador de hora",
    lens: "Objetivo",
    lensValue: "{n}°",
    lensTitle: "Campo de visión, {n} grados. Estrecho es un teleobjetivo; ancho abarca más",
    png: "PNG",
    pngTitle: "Guardar sin pérdida, en un archivo más grande",
    share: "Compartir",
    shareTitle: "Pasar la imagen al menú de compartir de este dispositivo",
    sharedSaved: "Este dispositivo no quiso compartirla. Se guardó la imagen en su lugar",
    done: "Salir del modo foto",
    making: "Haciendo la imagen",
    saved: "Imagen guardada",
    failed: "No se pudo hacer la imagen en este momento",
    honesty: "Dibujado a partir de posiciones medidas, no una fotografía"
  },
  tonight: {
    title: "Esta noche",
    placeGuess: "Supuesto por tu zona horaria: {place}",
    placeSet: "Desde {place}",
    placeMine: "Desde cerca de tu lugar",
    placeShared: "Desde {place}, compartido contigo",
    noPlace: "Fija dónde estás para ver qué pasa por encima.",
    coords: "{lat}, {lon}",
    working: "Calculando los pasos de esta noche…",
    passLine: "{name} · {time} · del {from} al {to}, {fists} en su punto más alto ({deg}°) · {mins} min",
    startsIn: "Empieza en {countdown}",
    startsAt: "Empieza a las {time}",
    upNow: "Visible ahora, mira hacia el {dir}",
    showMe: "Muéstramelo",
    showMeTitle: "Abrir el cielo desde tu lugar, mirando hacia donde sale",
    guessCaveat: "Las horas pueden variar unos minutos.",
    unitRises: "sale",
    unitHigh: "en su punto más alto",
    unitLong: "min a la vista",
    degrees: "{deg}°",
    path: "Del {from} al {to}",
    rowDetail: "{time} · {deg}° arriba · {mins} min",
    nothingTonight: "Esta noche no pasa nada brillante sobre ti.",
    nextPass: "Siguiente: {when} · {name}",
    nothingAtAll: "Tres días sin nada brillante sobre ti.",
    darkFrom: "Oscuro desde las {time}",
    darkUntil: "Oscuro hasta las {time}",
    darkNow: "Oscuro ahora",
    neverDark: "Esta noche no oscurece",
    moonRises: "Luna {pct} %, sale a las {time}",
    moonUp: "Luna {pct} %, visible ahora",
    moonDown: "Luna {pct} %, bajo el horizonte",
    more: "Más pasos",
    fewer: "Menos pasos",
    arcLabel: "Su trayecto por el cielo: sale por el {from}, llega a {deg}° en su punto más alto y se pone por el {to}",
    cardinals: {
      N: "N",
      E: "E",
      S: "S",
      W: "O"
    },
    best: {
      title: "Lo mejor de esta noche",
      nothing: "Esta noche nada destaca.",
      rowTitle: "Mostrarlo en el cielo",
      passLine: "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      mag: "mag {mag}",
      passAria: "{name}: aparece a las {t0} {d0}; máx. a las {t1}, {deg}° {d1}; fin a las {t2} {d2}; mag. {mag}.",
      fades: "Se apaga en la sombra de la Tierra antes de ponerse.",
      appears: "Sale de la sombra de la Tierra a media altura.",
      notVisible: "No visible: el cielo está claro o está en sombra.",
      rocket: "Cuerpo de cohete · {name}",
      debris: "Basura · {name}",
      planetLine: "mejor {time} · {deg}° arriba, {dir}",
      moonTitle: "Luna · {phase} · {pct} %",
      moonSets: "se pone a las {time}",
      moonRises: "sale a las {time}",
      moonAllNight: "visible toda la noche",
      phases: {
        new: "nueva",
        waxingCrescent: "creciente",
        firstQuarter: "cuarto creciente",
        waxingGibbous: "gibosa creciente",
        full: "llena",
        waningGibbous: "gibosa menguante",
        lastQuarter: "cuarto menguante",
        waningCrescent: "menguante"
      },
      showerLine: "hasta {zhr}/h · mejor {time}, {dir}",
      dsoLine: "mejor {time} · {deg}° arriba, {dir} · {how}",
      dsoNeeds: {
        eye: "a ojo",
        binoculars: "prismáticos"
      },
      view: "Mi vista",
      viewHeight: "A qué altura debe estar",
      facings: {
        any: "Todo",
        n: "Norte",
        e: "Este",
        s: "Sur",
        w: "Oeste"
      },
      facingTitles: {
        any: "Todo el cielo",
        n: "Solo lo mejor del norte",
        e: "Solo lo mejor del este",
        s: "Solo lo mejor del sur",
        w: "Solo lo mejor del oeste"
      },
      heights: {
        "0": "Cualquier altura",
        "15": "Más de 15°",
        "30": "Más de 30°"
      },
      viewNothing: "Esta noche no pasa nada por esa parte del cielo.",
      darkHours: "Oscuro de {from} a {to}",
      moonless: "sin Luna, una noche oscura",
      moonBright: "La Luna al {pct} % oculta las estrellas débiles",
      moonFaint: "Luna {pct} %, poca luz",
      neverDark: "Esta noche no oscurece.",
      markEnds: "{time} {dir}",
      markPeak: "{time} {deg}°",
      honesty: "Calculado para tu lugar. El brillo es una estimación."
    },
    skybar: {
      title: "El cielo",
      field: "Campo de visión",
      fields: {
        eye: "Ojo",
        binoculars: "Prismáticos",
        telescope: "Telescopio"
      },
      fieldNotes: {
        eye: "Tan ancho como ves. Desplaza o pellizca para acercar.",
        binoculars: "Un campo de 7°: salen estrellas más débiles.",
        telescope: "Un campo de 1°: los planetas se convierten en discos."
      },
      following: "Siguiendo a {name}. Arrastra para soltar.",
      followSet: "{name} se puso; la vista lo soltó.",
      show: "Líneas y nombres",
      toggles: {
        figures: "Figuras",
        names: "Nombres",
        art: "Dibujos",
        bounds: "Fronteras",
        sunPath: "Camino del Sol",
        equator: "Ecuador",
        grid: "Cuadrícula",
        starGrid: "Cuadrícula estelar",
        meteors: "Meteoros",
        trails: "Estelas",
        seeThrough: "Suelo transparente"
      },
      toggleTitles: {
        seeThrough: "Tierra transparente, para ver lo que hay bajo el horizonte",
        figures: "Las figuras de las constelaciones",
        names: "Nombres de constelaciones y de estrellas brillantes",
        sunPath: "El camino que siguen el Sol, la Luna y los planetas",
        equator: "El ecuador del cielo, sobre el de la Tierra",
        grid: "Altura y dirección, con la línea norte-sur",
        starGrid: "La cuadrícula sobre la que se cartografían las estrellas",
        art: "Las figuras occidentales como dibujos, de Johan Meuris",
        bounds: "Las fronteras oficiales de las 88 constelaciones",
        meteors: "Estelas de las lluvias activas esta noche, a su ritmo",
        trails: "Última hora de cada estrella brillante, en exposición larga"
      },
      time: "Hora en el cielo",
      timeNow: "Ahora",
      timeNowTitle: "Volver al presente",
      timeDusk: "Anochecer",
      timeMidnight: "Medianoche",
      timeDawn: "Amanecer",
      timeTitles: {
        dusk: "El final del crepúsculo civil de esta tarde",
        midnight: "La mitad de la noche",
        dawn: "El comienzo del crepúsculo civil de la mañana"
      },
      timeStrip: "Arrastra para girar el cielo",
      timeTicks: {
        dusk: "Ocaso",
        midnight: "0 h",
        dawn: "Alba"
      },
      timeStripAria: "La hora del cielo: arrastra o usa las flechas, diez minutos por paso",
      timeAt: "{time} · {phase}",
      timePhases: {
        day: "día",
        golden: "Sol bajo",
        civil: "crepúsculo civil",
        nautical: "crepúsculo náutico",
        astronomical: "último crepúsculo",
        night: "noche"
      },
      timeFar: "Sin satélites tan lejos de hoy: sus órbitas caducan.",
      eyepiece: "Ocular",
      eyepieces: {
        low: "Bajo · 1°",
        medium: "Medio · 30′",
        high: "Alto · 12′"
      },
      eyepieceTitles: {
        low: "Un campo de un grado: dos Lunas llenas de ancho",
        medium: "Medio grado: toda la Luna",
        high: "Una quinta parte de grado: los planetas como discos"
      },
      centre: "Qué hay en el centro",
      centreTitle: "Nombrar lo que hay en el centro de la vista; Intro abre su ficha",
      con: {
        kind: "constelación",
        label: "{name}, una constelación.",
        inside: "en {name}"
      },
      landscape: {
        city: "Horizonte: el de una ciudad, dibujado. No tu calle.",
        hills: "Horizonte: colinas, dibujadas. No las tuyas.",
        coast: "Mar al {dir}, según el mapa del agua. Tierra dibujada."
      },
      artWesternOnly: "Los dibujos son de las figuras occidentales",
      culture: "De quién es el cielo",
      cultures: {
        western: "Occidental",
        chinese: "Chino",
        maori: "Maorí",
        hawaiian: "Hawaiano",
        samoan: "Samoano",
        tongan: "Tongano",
        norse: "Nórdico",
        boorong: "Boorong"
      },
      cultureNotes: {
        western: "Las 88 constelaciones acordadas por los astrónomos en 1922.",
        chinese: "Unos 300 asterismos pequeños. Una lectura de un cielo vivo.",
        maori: "Seis figuras. Los nombres varían entre iwi; cielo vivo.",
        hawaiian: "Líneas estelares de navegantes, aún usadas para guiarse.",
        samoan: "Catorce figuras de la tradición samoana. Una tradición viva.",
        tongan: "Caminos y figuras estelares de Tonga. Una tradición viva.",
        norse: "Seis figuras, una reconstrucción del cielo nórdico.",
        boorong: "El cielo de una familia boorong, contado en 1857. Vivo aún."
      },
      cultureCredits: {
        western: "Dibujos: Johan Meuris, para Stellarium, Free Art License. Carina, Puppis y Vela comparten un dibujo; Serpens no tiene ninguno.",
        chinese: "Figuras: Sun Shuwei y Karrie Berglund, para Stellarium, CC BY-SA 4.0. Una reconstrucción documentada.",
        maori: "Figuras: Dan Smale, para Stellarium, CC BY-SA 4.0. Una reconstrucción documentada.",
        hawaiian: "Figuras: según Nainoa Thompson, por Kamehameha Schools Kapālama, para Stellarium, CC BY-SA 4.0.",
        samoan: "Figuras: Jake Fitisemanu con custodios samoanos, para Stellarium, CC BY-SA 4.0. Una reconstrucción documentada.",
        tongan: "Figuras: Dan Smale, para Stellarium, CC BY-SA 4.0. Una reconstrucción documentada a partir de fuentes limitadas.",
        norse: "Figuras: Jonas Persson, para Stellarium, CC BY-SA 4.0. Una reconstrucción, no un registro.",
        boorong: "Figuras: John Morieson y Alex Cherney, para Stellarium, CC BY-SA 4.0. Una lectura de un cielo vivo."
      },
      meteorNote: "{name}: unos {n} por hora en tu cielo.",
      meteorFew: "{name}: menos de uno por hora en tu cielo.",
      meteorDown: "{name}: radiante abajo, sin estelas.",
      meteorHonest: "El ritmo es un modelo; las estelas son ilustrativas.",
      meteorSporadic: "Esta noche no hay lluvia. Fuente antihelio: {n} por hora.",
      darkness: "Tu cielo",
      darknessModes: {
        city: "Ciudad",
        town: "Pueblo",
        dark: "Lugar oscuro"
      },
      darknessAuto: "Auto",
      darknessAutoTitle: "Leer el tipo de cielo a partir de las luces nocturnas de tu lugar",
      darknessBy: {
        place: "Estimado con el mapa de luces nocturnas de la NASA.",
        reading: "Leyendo las luces nocturnas de tu lugar.",
        unread: "No se pudo leer el mapa de luces nocturnas: elige tu cielo.",
        trip: "Fijado por esta parada del viaje."
      },
      darknessNotes: {
        city: "Ciudad: estrellas hasta magnitud 4, sin Vía Láctea.",
        town: "Afueras de un pueblo: estrellas hasta magnitud 5.3.",
        dark: "Lugar oscuro: estrellas hasta 6.5 y la Vía Láctea."
      },
      point: {
        row: "Apunta con tu teléfono",
        on: "Apunta con tu teléfono",
        title: "Levanta el teléfono: la vista gira con él",
        note: "Levanta el teléfono al cielo y gira; la vista te sigue.",
        noPlace: "Necesita tu lugar, para saber dónde está el norte.",
        denied: "Sin permiso para el sensor de movimiento. Puedes arrastrar.",
        deniedHow: "Para permitirlo, recarga y elige Permitir cuando pregunte.",
        none: "Ningún sensor de movimiento responde. Puedes arrastrar.",
        unsupported: "El navegador no da sensor de movimiento. Puedes arrastrar.",
        lineUpWith: "Arrastra hasta que {name} encaje.",
        lineUpPlain: "¿No coincide? Arrastra hasta alinear una estrella brillante.",
        lined: "Alineado a mano, a {n}° de la brújula.",
        reset: "Deshacer la alineación",
        resetTitle: "Volver al norte de la propia brújula",
        accuracy: "La brújula dice que es buena hasta unos {n}°.",
        relative: "Aquí no hay brújula. Arrastra el cielo para alinearlo.",
        declination: "Norte verdadero: brújula corregida {n}° al {dir}.",
        east: "este",
        west: "oeste",
        honest: "Norte según la brújula del teléfono; el metal lo desvía."
      },
      red: "Luz roja",
      redTitle: "Poner la página en rojo para que tus ojos sigan acostumbrados a la oscuridad",
      honesty: "Estrellas medidas, planetas calculados, aire modelado, tierra dibujada."
    }
  },
  keyHint: {
    title: "Controles",
    titleTouch: "Gestos",
    label: "Teclas que mueven la vista",
    labelTouch: "Gestos que mueven la vista",
    close: "Cerrar",
    closeTitle: "Cerrar (Escape)",
    does: {
      turn: "Girar",
      zoom: "Acercar, alejar",
      pan: "Mover de lado",
      pick: "Elegir algo",
      search: "Buscar",
      hide: "Ocultar todo",
      show: "Qué mostrar",
      share: "Compartir",
      esc: "Cerrar",
      keys: "Todas las teclas",
      tripPlay: "Reproducir, pausa",
      tripStep: "Atrás, siguiente",
      tripCard: "Ocultar ficha",
      tripReplay: "Repetir",
      tripSound: "Sonido",
      tripLeave: "Salir"
    },
    how: {
      drag: "Arrastrar",
      wheel: "Rueda",
      pinch: "Pellizcar",
      two: "Dos dedos",
      tap: "Tocar"
    },
    caps: {
      up: "↑",
      left: "←",
      down: "↓",
      right: "→",
      w: "W",
      s: "S",
      plus: "+",
      minus: "−",
      slash: "/",
      pgUp: "RePág",
      pgDn: "AvPág",
      h: "H",
      l: "L",
      p: "P",
      esc: "Esc",
      help: "?",
      space: "Espacio",
      c: "C",
      r: "R",
      m: "M"
    },
    labelAll: "Atajos de teclado",
    tripTitle: "En un viaje"
  },
  render: {
    eyebrow: "Space Radar · un viaje",
    site: "spaceradar.ai",
    fly: "Vuélalo tú mismo",
    music: "Música: John Bartmann, CC0. Créditos completos en spaceradar.ai."
  },
  glossary: {
    title: "Palabras de esta página",
    hint: "Toca un término para ver una frase sencilla."
  },
  templates: {
    earthevent: {
      lead: {
        wildfire: "{name} es un incendio que estaba aquí en su último informe, el {date}",
        volcano: "{name} está en erupción desde el {date}",
        iceberg: "{name} estaba aquí en su último informe, el {date}"
      },
      size: "unos {n} km² en ese informe"
    },
    storm: {
      lead: "{name} es {a} {status} cuyo centro estuvo aquí {ago}",
      leadUnknown: "{name} es un ciclón tropical cuyo centro estuvo aquí {ago}",
      leadBefore: "{name} es {a} {status} cuyo centro llega aquí {ago}",
      leadBeforeUnknown: "{name} es un ciclón tropical cuyo centro llega aquí {ago}",
      wind: "los vientos más fuertes de su trayectoria, previsión incluida, alcanzan los {n} km/h",
      statuses: {
        hurricane: "huracán",
        typhoon: "tifón",
        cyclone: "ciclón tropical",
        storm: "tormenta tropical",
        depression: "depresión tropical"
      }
    },
    exotic: {
      leadBlackhole: "{name} es un agujero negro a {dist} años luz",
      leadPulsar: "{name} es un púlsar a {dist} años luz",
      leadMagnetar: "{name} es un magnetar a {dist} años luz",
      leadQuasar: "{name} es un cuásar a {dist} años luz",
      leadStar: "{name} es una estrella a {dist} años luz",
      leadRange: "{name} es {a} {kind} a una distancia de entre {lo} y {hi} años luz",
      mass: "con una masa de {n} Soles",
      massRange: "con una masa de entre {lo} y {hi} Soles",
      massMillions: "con una masa de {n} millones de Soles",
      massBillions: "con una masa de {n} mil millones de Soles",
      spins: "que gira {n} veces por segundo",
      spinsSlow: "que gira una vez cada {n} segundos",
      kinds: {
        blackhole: "agujero negro",
        pulsar: "púlsar",
        magnetar: "magnetar",
        star: "estrella",
        quasar: "cuásar"
      }
    },
    dso: {
      leadHome: "{name} es la galaxia en la que vivimos; su centro está a {dist} años luz",
      lead: "{name} es {a} {type} a {dist} años luz",
      leadRange: "{name} es {a} {type} a una distancia de entre {lo} y {hi} años luz",
      leadUntyped: "{name} está a {dist} años luz",
      size: "unos {n} años luz de ancho",
      seenAs: "lo que vemos es como era hace {n} años",
      seenAsMillions: "lo que vemos es como era hace {n} millones de años",
      constellation: "en {con}",
      kinds: {
        galaxy: "galaxia",
        nebula: "nebulosa",
        cluster: "cúmulo estelar",
        other: "objeto del cielo profundo"
      }
    },
    exoplanet: {
      lead: "{name} es un planeta que gira alrededor de la estrella {host}, a {dist} años luz",
      leadNoHost: "{name} es un planeta que gira alrededor de otra estrella, a {dist} años luz",
      size: "unas {n} veces más ancho que la Tierra",
      sizeSmaller: "aproximadamente {n} del ancho de la Tierra",
      mass: "{n} veces la masa de la Tierra",
      year: "su año dura {n} días",
      yearHours: "su año dura {n} horas",
      found: "descubierto en {year} por el método {method}",
      foundYear: "descubierto en {year}",
      asOf: "de una copia del catálogo a fecha de {date}"
    },
    star: {
      lead: "{name} es una estrella a {dist} años luz",
      leadColour: "{name} es {a} estrella {colour} a {dist} años luz",
      near: "una de las más cercanas que existen",
      seenAs: "lo que vemos es como era hace {n} años",
      seenAsMonths: "lo que vemos es como era hace {n} meses",
      luminosity: "que brilla {n} veces más que el Sol",
      dimmer: "que brilla con {n} del brillo del Sol",
      colours: {
        O: "azul",
        B: "blanco-azulada",
        A: "blanca",
        F: "amarillo-blanquecina",
        G: "amarilla",
        K: "naranja",
        M: "roja"
      }
    },
    station: {
      lead: "{name} es una estación espacial tripulada que gira alrededor de la Tierra",
      whyPass: "cruza tu cielo a las {time}",
      crew: "con {crew} personas a bordo",
      altitude: "a {alt} km de altura",
      speed: "da una vuelta cada {period} minutos"
    },
    satellite: {
      lead: "{name} es un satélite que da vueltas alrededor de la Tierra",
      leadKind: "{name} es {kind} que da vueltas alrededor de la Tierra",
      leadDocked: "{name} es {kind} acoplada a {station}",
      aSpacecraft: "una nave espacial",
      aTelescope: "un telescopio espacial",
      whyLaunchedDays: "se lanzó hace {n} días",
      whyLaunchedYear: "se lanzó en {year}",
      operator: "a cargo de {operator}",
      purpose: "{purpose}",
      altitude: "a {alt} km de altura",
      whyPass: "cruza tu cielo a las {time}"
    },
    debris: {
      lead: "{name} es un fragmento de basura espacial en seguimiento",
      origin: "resto de {origin}",
      brokeUp: "que se fragmentó en {year}",
      decay: "se espera que vuelva a caer a la atmósfera hacia el {date}",
      altitude: "a {alt} km de altura",
      burnsUp: "casi todo se desintegra durante el descenso"
    },
    rocket: {
      lead: "{name} es un lanzamiento de cohete",
      leadWithPad: "{name} es un lanzamiento de cohete desde {pad}",
      leadStage: "{name} es una etapa de cohete agotada que da vueltas alrededor de la Tierra",
      stageLaunched: "lanzada en {year}",
      whyCountdown: "despega {when}",
      whyFlown: "que despegó {when}",
      destination: "con rumbo a {destination}",
      missionType: "una misión de {missionType}",
      illustrative: "la trayectoria dibujada aquí es un esbozo del ascenso, no una trayectoria medida"
    },
    probe: {
      lead: "{name} es una nave espacial lejos, en el sistema solar",
      leadOrbits: "{name} es una nave espacial que orbita {world}",
      destination: "de camino a {destination}",
      lightTime: "tan lejos que un mensaje de radio tarda {mins} minutos en cada sentido",
      lightTimeSeconds: "tan cerca que un mensaje de radio tarda {secs} segundos en cada sentido",
      lightTimeHours: "tan lejos que un mensaje de radio tarda {hours} horas en cada sentido",
      distanceSun: "a {au} unidades astronómicas del Sol",
      milestone: "con {milestone} previsto para el {date}"
    },
    telescope: {
      lead: "{name} es un telescopio espacial",
      observing: "apuntando a {target} esta semana",
      station: "aparcado en {station}",
      altitude: "a {alt} km de altura",
      sees: "ve en {band}"
    },
    asteroid: {
      lead: "{name} es un objeto cercano a la Tierra, con su propia órbita alrededor del Sol",
      leadMainBelt: "{name} es un asteroide del cinturón principal, entre Marte y Júpiter",
      leadBeyond: "{name} es un cuerpo pequeño más allá de Neptuno, en su propia órbita alrededor del Sol", // 0079 B1
      leadDwarf: "{name} es un planeta enano con su propia órbita alrededor del Sol",
      leadDwarfBelt: "{name} es un planeta enano del cinturón de asteroides, entre Marte y Júpiter",
      leadDwarfBeyond: "{name} es un planeta enano más allá de Neptuno",
      leadDwarfFarBeyond: "{name} es un planeta enano muy lejos, más allá de Neptuno",
      leadInterstellarOut: "{name} vino de otra estrella y está saliendo del sistema solar",
      leadInterstellarIn: "{name} vino de otra estrella y cae hacia el Sol",
      distanceSun: "a {au} unidades astronómicas del Sol",
      whyApproach: "pasa junto a la Tierra el {date} a {ld}× la distancia de la Luna",
      size: "{size}",
      willNotHit: "no chocará con la Tierra"
    },
    comet: {
      lead: "{name} es un cometa en un largo bucle alrededor del Sol",
      leadPeriodic: "{name} es un cometa que vuelve a dar la vuelta al Sol cada {n} años",
      leadInterstellarOut: "{name} es un cometa de otra estrella, que sale del sistema solar",
      leadInterstellarIn: "{name} es un cometa de otra estrella, que cae hacia el Sol",
      whyPerihelion: "lo más cerca del Sol el {date}",
      nakedEye: "lo bastante brillante para encontrarlo sin telescopio",
      faint: "demasiado débil para verlo sin telescopio",
      distanceSun: "a {au} unidades astronómicas"
    },
    oddity: {
      lead: "{fact}",
      fallback: "{name} es una de las cosas curiosas que la gente ha enviado fuera del planeta"
    },
    site: {
      lead: "{name} es un lugar en tierra que trabaja con naves espaciales",
      leadKind: "{name} es {a} {kind}",
      where: "en {where}",
      whyDsn: "hablando ahora mismo con {spacecraft}",
      whyLaunch: "con {launch} previsto {when}",
      kinds: {
        pad: "plataforma de lanzamiento",
        dish: "antena parabólica",
        observatory: "observatorio",
        tracking: "estación de seguimiento"
      }
    },
    world: {
      lead: "{name} es un mundo del sistema solar",
      leadMoon: "{name} es la propia luna de la Tierra",
      leadSun: "{name} es la estrella en el centro del sistema solar",
      distanceKm: "a {n} km",
      whyPhase: "{phase} esta noche",
      whyRise: "sale a las {time} desde donde estás",
      distance: "{distance}",
      diameter: "unos {n} km de ancho",
      leadWhat: "{name} es {what}",
      what: {
        pluto: "un planeta enano más allá de Neptuno, contado como el noveno planeta hasta 2006",
        io: "una de las cuatro grandes lunas de Júpiter, y el mundo más volcánico del sistema solar",
        europa: "una de las cuatro grandes lunas de Júpiter, con un océano de agua salada bajo su hielo",
        ganymede: "la luna más grande de Júpiter y la más grande del sistema solar, mayor que Mercurio",
        callisto: "una de las cuatro grandes lunas de Júpiter, y el objeto con más cráteres del sistema solar",
        titan: "la luna más grande de Saturno, bajo una espesa bruma anaranjada y con lagos de metano; la sonda Huygens aterrizó allí en 2005",
        enceladus: "una pequeña luna helada de Saturno cuyos géiseres lanzan al espacio el océano que hay bajo su hielo",
        triton: "la luna más grande de Neptuno; orbita al revés y probablemente es un objeto del cinturón de Kuiper capturado",
        charon: "la luna más grande de Plutón, de la mitad de su tamaño; los dos se muestran siempre la misma cara",
        phobos: "la mayor de las dos lunas de Marte, una roca irregular que se acerca en espiral a Marte a razón de 1.8 m por siglo",
        deimos: "la menor de las dos lunas de Marte, una pequeña roca irregular cubierta de cráteres",
        mimas: "la luna redonda más interior de Saturno, marcada por un cráter de un tercio del ancho de la propia luna",
        tethys: "la quinta luna más grande de Saturno, de hielo de agua casi puro, partida por un abismo y un enorme cráter",
        dione: "una luna helada de Saturno cuya cara trasera está surcada por una red de brillantes acantilados de hielo",
        rhea: "la segunda luna más grande de Saturno, una bola de nieve sucia congelada de hielo y roca",
        iapetus: "la tercera luna más grande de Saturno: un lado tan oscuro como el carbón y el otro diez veces más brillante",
        miranda: "la menor de las cinco grandes lunas de Urano, con cañones de hasta 12 veces la profundidad del Gran Cañón",
        ariel: "la más brillante y de aspecto más joven de las cinco grandes lunas de Urano, atravesada por valles de falla",
        umbriel: "la más oscura de las grandes lunas de Urano, que refleja una quinta parte de la luz que le llega",
        titania: "la mayor luna de Urano, de un gris neutro, partida por valles de falla de casi 1 600 km de largo",
        oberon: "la segunda luna más grande de Urano, oscura, con cráteres y una montaña de 6 km de altura"
      }
    }
  },
  live: {
    label: "Desde la Tierra, ahora",
    km: "km",
    light: "La luz tarda",
    lightYears: "años luz",
    noteFar: "Calculado a partir de la posición dibujada, con tres cifras. No avanza.",
    note: "Calculado a partir de la órbita dibujada. Las últimas cifras muestran que se mueve, no su lugar al kilómetro.",
    seconds: "{s} s",
    minSec: "{min} min {s} s",
    hourMinSec: "{h} h {min} min {s} s",
    sparkLabel: "Distancia a la Tierra",
    sparkAria: "Distancia a la Tierra de {from} a {to}. {closest}",
    sparkNow: "ahora",
    closest: "Lo más cerca: {date} · {dist}",
    closestAbout: "Lo más cerca: hacia el {date} · {dist}",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    shortDate: "{day} {month} {year}",
    closestTitle: "Poner el reloj en este máximo acercamiento",
    moonDistances: "{n} distancias a la Luna",
    au: "{n} UA",
    sparkNote: "Calculado a partir de la órbita dibujada, un punto cada seis días.",
    sparkApprox: "Tan cerca, la fecha y la distancia son aproximadas: se omite la atracción de la Tierra.",
    upYears: "En el espacio desde hace {n} años: lanzado el {date}",
    upOneYear: "En el espacio desde hace 1 año: lanzado el {date}",
    upUnderAYear: "En el espacio desde hace menos de un año: lanzado el {date}",
    upSinceYear: "Lanzado en {year}: unos {n} años en el espacio",
    upSinceYearNew: "Lanzado en {year}",
    smallBodyHonest: "Calculado a partir de su órbita para un horizonte a nivel del mar. Estar sobre el horizonte no es ser lo bastante brillante para verse: la mayoría necesita un telescopio."
  },
  crew: {
    label: "Personas a bordo",
    count: "{n} personas a bordo",
    countOne: "1 persona a bordo",
    hint: "{n} a bordo",
    person: "{agency} · {days} días en el espacio",
    personNoAgency: "{days} días en el espacio",
    dockedLabel: "Acoplada ahora, y desde cuándo",
    docked: "{port} · {date}",
    asOf: "Leído {age} de Launch Library 2 (The Space Devs).",
    stale: "Leído el {date}: tiene más de dos días, así que puede haber cambiado.",
    joined: "Los nombres son las tripulaciones de los vehículos acoplados ahora.",
    unmatched: "Los nombres que tenemos no coincidían con este recuento, así que no se muestra ninguno.",
    waiting: "Leyendo la lista de la tripulación.",
    none: "No hay lista de tripulación para esta estación."
  },
  happened7: {
    launchesFrom: "desde {place}",
    reached: "llegó a la órbita",
    failed: "no llegó a la órbita",
    partial: "llegó a la órbita, pero no a la prevista",
    launchDetail: "{rocket}: {status}, {from}",
    launchDetailNoPlace: "{rocket}: {status}",
    cameDown: "Cayó el {date} (fecha de decaimiento del catálogo)",
    debris: "y {n} fragmentos de basura",
    debrisOne: "y 1 fragmento de basura",
    showAll: "Mostrar los {n}",
    showFewer: "Mostrar menos",
    asOf: "Lanzamientos leídos {age} de Launch Library 2.",
    stale: "Lanzamientos leídos el {date}: tienen más de dos días.",
    none: "Nada registrado de los últimos siete días.",
    waiting: "Leyendo lo que ocurrió.",
    decays: "Lo que cayó",
    decaysTitle: "Lee todo el catálogo, unos 1.5 MB",
    decaysNone: "Ningún objeto entero cayó en los últimos siete días.",
    decaysFailed: "No se pudo leer el catálogo.",
    flyTitle: "Volar hasta donde se lanzó",
    ago: "{age}"
  },
  oldest: {
    label: "Los que llevan más tiempo en órbita",
    row: "{years} años · lanzado el {date}",
    note: "Cargas útiles y cuerpos de cohete que siguen en órbita, por fecha de lanzamiento en el catálogo.",
    showTitle: "Mostrarlo en el mapa"
  },
  links: {
    row: "{words} · {publisher}",
    title: "Abre la propia página de {publisher} en una pestaña nueva"
  },
  placeKeep: {
    group: "Dónde estás",
    change: "Cambiar lugar",
    changeTitle: "Una ciudad, o donde dice el navegador que estás",
    remember: "Recordar este lugar",
    rememberTitle: "Lo guarda solo en este navegador, con una precisión de 0.1°",
    forget: "Olvidar este lugar",
    forgetTitle: "Elimina el lugar guardado en este navegador",
    kept: "Guardado solo en este navegador.",
    share: "Compartir este lugar",
    shareTitle: "Copia un enlace que lleva este lugar con una precisión de 0.1°",
    copied: "Enlace copiado. Lleva este lugar con una precisión de 0.1°.",
    copyFailed: "No se pudo copiar el enlace."
  },
  scale: {
    least: "Planetas dibujados al menos ×{n} más grandes",
    one: "{name} se dibuja ×{n} más grande",
    title: "Los puntos son más anchos que los planetas. Pulsa para ver el tamaño real.",
    trueLine: "Tamaño real: {name} mide aquí {px} px de ancho",
    trueTitle: "El planeta más ancho, sin los puntos. Pulsa para volver a dibujarlos."
  },
  launchChip: {
    opens: "pulsa para ver su ficha",
    train: "Nuevo tren Starlink de {n}, sobre ti {when}"
  },
  welcome: {
    label: "Primera visita",
    title: "Primera vez aquí",
    dots: "Cada punto es algo real. Pulsa uno.",
    move: "Arrastra para girar. Rueda para acercar.",
    moveTouch: "Arrastra para girar. Pellizca para acercar.",
    trips: "Un viaje guiado: una historia en minutos.",
    trip: "Viaje guiado",
    tripTitle: "Empieza el primer viaje de la lista",
    look: "Echar un vistazo",
    lookTitle: "Guarda estas líneas"
  },
  opening: {
    label: "Apertura",
    from: "Desde {source}",
    wait: "Preparando el viaje",
    skip: "Cualquier tecla o pulsación lo omite"
  },
  base: {
    label: "Volver a la base",
    title: "Volver a la base: la Tierra, ahora, sin nada seleccionado",
    name: "base",
    trip: "Salir del viaje y volver a la base"
  },
  exoface: {
    tag: "Recreación artística",
    measured: "Medido: {parts}.",
    estimated: "Estimado: {parts}.",
    least: "Al menos {n} masas terrestres.",
    radius: "{n} radios terrestres",
    mass: "{n} masas terrestres",
    a: "un",
    an: "un",
    yearHours: "{a} año de {n} horas",
    yearDays: "{a} año de {n} días",
    yearYears: "una vuelta de {n} años",
    join: ", ",
    missing: "—",
    surface: "La superficie es imaginada.",
    clouds: "Las cimas de las nubes son imaginadas.",
    nothingMeasured: "Aquí no se ha medido nada.",
    whole: "Todo el mundo es imaginado.",
    imaginedName: "Un mundo imaginado n.º {n}",
    another: "Otro mundo",
    back: "Volver al mapa",
    stageLabel: "Un mundo imaginado",
    why: "Se dibuja como {cls}, {climate}: calculado, no visto.",
    whyGiant: "Se dibuja como {cls}: calculado a partir de su tamaño, no visto.",
    cls: {
      rock: "un mundo rocoso",
      superEarth: "una supertierra",
      water: "un mundo de agua",
      miniNeptune: "un minineptuno",
      iceGiant: "un gigante helado",
      gasGiant: "un gigante gaseoso"
    },
    climate: {
      lava: "con la superficie fundida bajo su estrella",
      desert: "con un clima cálido y seco",
      temperate: "con un clima lo bastante suave para tener mares",
      snowball: "con la superficie helada por completo",
      eyeball: "con una cara siempre hacia su estrella"
    }
  },
  deep: {
    inside: "Dentro de {parent}",
    companion: "Acompaña a {parent}",
    kinds: {
      HII: "nebulosa de emisión",
      PN: "nebulosa planetaria",
      SNR: "remanente de supernova",
      RfN: "nebulosa de reflexión",
      DrkN: "nebulosa oscura",
      GCl: "cúmulo globular"
    },
    back: "Volver a {parent}",
    backTitle: "Volar hasta {parent}, que lo rodea"
  },
  deepHelix: {
    card: {
      helix: "Su luz procede de la fotografía de ESO y su forma de O’Dell, McCullough y Meixner (2004): un disco interior inclinado 23° y un anillo exterior inclinado 53°. Los nudos están colocados a sus distancias medidas. Aún no revisado por un astrónomo."
    },
    how: "Hubble y los telescopios en tierra muestran dos elipses, de 499″ por 459″ y de 742″ por 446″. Leídas como círculos vistos en oblicuo, son dos anillos inclinados 23° y 53°, y las velocidades de los nudos hacia nosotros y alejándose de nosotros dicen qué lado de cada uno está más cerca (O’Dell, McCullough y Meixner 2004)."
  },
  deepLmc: {
    card: {
      lmc: "Este modelo se construye a partir de su fotografía y de los recuentos de Gaia de sus propias estrellas, inclinado tal como se ha medido."
    },
    rows: {
      "dso-lmc": [
        [
          "Profundidad de sus estrellas",
          "No medida estrella por estrella: a esta distancia el paralaje de una estrella es demasiado pequeño. El modelo reparte sus estrellas dentro del grosor conocido del disco."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-tarantula-nebula": [
        [
          "Profundidad dentro de la Gran Nube de Magallanes",
          "No medida: se dibuja a la distancia de la Gran Nube de Magallanes en su propia dirección. En el disco inclinado podría estar unos 2 000 años luz más cerca."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ]
    }
  },
  deepGalaxy: {},
  deepCosmos: {
    horizon: "El borde del universo observable",
    horizonNow: "Ahora, a unos {n} mil millones de años luz",
    horizonWhy: "Su luz partió hace {age} mil millones de años; el espacio se ha estirado desde entonces",
    edge: "{n} mil millones de años luz: más allá de todo lo que podemos ver",
    edgeWhy: "El universo observable termina a unos {h} mil millones de años luz.",
    edgeNothing: "Aquí fuera no hay nada medido: esta banda es una ilustración.",
    cmbTitle: "La luz más antigua, tal como la muestra nuestro cielo",
    cmbWhen: "Salió unos {k} años después del Big Bang",
    cmbPainted: "Pintada dentro de la esfera de la que salió: una ilustración",
    cmbElse: "Vista desde cualquier otro lugar, el mapa es distinto",
    cmbCold: "−{n} µK",
    cmbMid: "media {t} K",
    cmbWarm: "+{n} µK",
    cmbSay: "Escala de color: azul hasta {n} millonésimas de grado más frío que {t} kelvin, naranja hasta {n} más cálido",
    cmbSource: "Mapa de nueve años de WMAP, NASA"
  },
  deepOrion: {
    card: {
      orion: "Su luz procede de la fotografía de ESO y su forma está reconstruida según Wen y O’Dell (1995) y O’Dell (2001): una fina capa luminosa en la cara cercana de una nube oscura, con el Trapecio unos 0.2 pársecs delante de ella. Aún no revisado por un astrónomo."
    },
    rows: {
      "dso-m42": [
        [
          "Su forma en profundidad",
          "Reconstruida. Cerca del Trapecio es medida: la capa luminosa está unos 0.2 pársecs detrás de su estrella más brillante. Más lejos, la profundidad sigue la imagen publicada de un cuenco que se abre hacia nosotros, no una medición."
        ],
        [
          "Detrás de ella",
          "La nube molecular oscura de la que está tallada la nebulosa. Vista desde atrás, la nebulosa queda oculta en ella."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-m43": [
        [
          "Su forma en profundidad",
          "Reconstruida: una cavidad menor en la misma nube, iluminada por la estrella NU Orionis. Su profundidad no está medida."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ]
    },
    how: "El resplandor de la nebulosa viene de una fina capa donde la luz de la estrella más brillante del Trapecio se abre paso en una nube oscura. Wen y O’Dell (1995) cartografiaron a qué distancia detrás de la estrella se halla esa capa a partir de su brillo, ya que una parte más cercana recibe más luz."
  },
  r12Truth: {
    here: "En esta ficha",
    words: "Las palabras, en todas partes",
    terms: "Palabras de esta ficha",
    rows: {
      where: "Dónde está",
      drawnNow: "Dibujado ahora",
      drawn: "Qué se dibuja",
      photo: "Fotografía de",
      filters: "Filtros",
      colours: "Colores",
      taken: "Fecha de la toma",
      released: "Fecha de publicación",
      sky: "Cielo mostrado",
      survey: "Sondeo de",
      look: "Aspecto"
    },
    span: "de {a} a {b}",
    notPublished: "Fecha sin publicar",
    position: {
      measured: "Visto por un instrumento en un momento conocido",
      inferred: "Calculado hacia delante a partir de una medición más antigua",
      illustrative: "Dibujado para mostrar la idea, no medido",
      sample: "Datos de muestra incluidos, no en vivo"
    },
    drawn: {
      photograph: "Luz real, fotografiada desde nuestro lado",
      reconstruction: "Una forma en 3D a partir de un estudio publicado",
      model: "Un modelo de su tipo, no de sus propias estrellas",
      catalogue: "Posiciones que midió un sondeo",
      illustration: "Dibujado para mostrar su tipo, no a él mismo"
    },
    colours: {
      broadband: "Filtros de color de banda ancha",
      mixed: "Filtros de color e hidrógeno",
      narrowband: "Gases asignados a colores",
      unstated: "No indicado"
    },
    falseColour: "{band}, en falso color",
    glossary: [
      {
        term: "pársec",
        match: ["kpc"],
        say: "Unos 3.26 años luz: la distancia desde la que la órbita de la Tierra se vería de un segundo de arco de ancho. Los artículos escriben pc, y kpc para mil."
      },
      {
        term: "millones de años luz",
        match: ["millones de años"],
        say: "Un millón de años luz, escrito Mly. Andrómeda, la galaxia grande más cercana, está a unos 2.5 millones."
      },
      {
        term: "mil millones de años luz",
        match: ["mil millones de años"],
        say: "Mil millones de años luz, escrito Gly. El borde de lo que podemos ver está ahora a unos 46 mil millones de años luz."
      },
      {
        term: "tiempo de retrospección",
        match: ["luz partió"],
        say: "Hace cuánto salió la luz que vemos de algo. De las galaxias lejanas son miles de millones de años: las vemos como eran entonces."
      },
      {
        term: "distancia comóvil",
        match: ["comóvil", "mil millones de años luz"],
        say: "A qué distancia está algo ahora, contando cuánto se ha estirado el espacio desde que salió su luz. Muy lejos es más de lo que sugiere el tiempo de viaje de la luz."
      }
    ],
    termLine: "{term}: {say}",
    lookWord: "Aspecto {mode}"
  },
  r12Sun: {
    image: "La mitad del Sol que miraba a la Tierra es la imagen del Solar Dynamics Observatory tomada a las {time} UTC del {date}, girada con el Sol desde entonces: luz ultravioleta extrema de {wl} ångström procedente de gas a cerca de un millón de grados en los lazos sobre la superficie, en el falso color de SDO y dibujada más brillante. La cara oculta, que no vio, se dibuja a partir de un modelo en el mismo falso color, y las dos se mezclan donde se encuentran. Es una imagen de exploración, no una imagen para la ciencia. Cortesía de NASA/SDO y de los equipos científicos de AIA, EVE y HMI.",
    loops: "Los lazos dorados sobre {n} de las regiones activas de hoy son ilustrativos: sus lugares son los de NOAA; sus formas, alturas y número no. En el aspecto Medido se quitan.",
    loopsOne: "Los lazos dorados sobre una de las regiones activas de hoy son ilustrativos: el lugar es el de NOAA; las formas, alturas y número no. En el aspecto Medido se quitan.",
    none: "No se pudo leer ninguna imagen del Sol de hoy, así que se dibuja todo el disco."
  },
  r12Nearby: {
    castShadows: "Sus sombras las proyectan las propias alturas del terreno, de {title}, donde está ahora el Sol y a escala real: medido, una altura cada 670 m como mucho, así que un cráter de menos de unos dos kilómetros no proyecta ninguna.",
    sunriseModelled: "Su color al amanecer y al atardecer es modelado: luz solar enrojecida por el aire que rozó, solo dispersión de Rayleigh."
  },
  r12Giants: {
    spot: "Salvo una: la Gran Mancha Roja se sitúa a {l2}° de longitud Sistema II, llevada desde donde la midieron el equipo JUPOS y la British Astronomical Association el {date} ({at}°) a {rate}° al mes, el punto medio de las dos derivas que midieron ese año ({lo} y {hi}), así que ahora puede estar {pm}° a cada lado. El mapa se gira para ponerla allí, y sus demás nubes giran con ella.",
    rings: {
      uranus: "sus anillos están a sus distancias medidas y son tan oscuros como son: sus partículas reflejan alrededor del 1.5 % de la luz, una treintava parte de lo que reflejan sus nubes, así que delante del planeta son hilos oscuros; se dibujan 10 veces más anchos de lo que son para que se vean, y la exposición Profunda los realza 4 veces, como lo hace una exposición larga",
      jupiter: "su tenue anillo está a las distancias y profundidades ópticas que da la hoja de datos de la NASA: el halo y el anillo principal, polvo y granos oscuros que detienen unas millonésimas de la luz; los dos anillos de gasa más tenues más allá de ellos no se dibujan. Desde el lado del Sol no es casi nada; con el Sol detrás, el polvo dispersa la luz hacia delante y se ve, como les ocurrió a Galileo y a New Horizons desde el lado nocturno. Para que se vea, se dibuja 8 000 veces más brillante de lo que es con la exposición Cámara y 40 000 veces con Profunda; con Ojo no se dibuja, que es como se vería, y tampoco en la calidad más baja. El halo tiene unos 10 000 km de grosor y se dibuja plano, no más brillante de lo que permite su grosor; cómo se desvanece el halo hacia dentro y cómo se hace más denso el anillo principal hacia su borde exterior nítido, cuánta de la luz es del polvo, cuánto la dispersa hacia delante, el color rojizo del anillo y lo más brillante que se dibuja son ilustrativos"
    }
  },
  r12Plumes: {
    line: "Penachos dibujados como se vieron: {list}.",
    item: "{name}, de unos {km} km de altura ({by}, {when})",
    jets: "los chorros de las cuatro rayas de tigre, de al menos {km} km de altura ({by}, {when})",
    truth: "Sus lugares y alturas son medidos; los arcos de los granos son un modelo, y su luz se estira para que se vean. Puede que ahora no estén en erupción.",
    stripes: "Las rayas se dibujan rectas a partir de los centros y longitudes del nomenclátor, y los lugares de los 101 chorros a lo largo de ellas son un modelo.",
    column: "Son columnas oscuras que el viento llevó hacia el oeste en su parte alta; se desconoce lo ancha que es una columna y se dibuja estrecha.",
    hot: "Los puntos naranjas del lado nocturno son puntos calientes donde brilla la lava ({list}): sus lugares son medidos, su brillo no.",
    film: "En el aspecto Cine los granos vuelan sus arcos {k} veces más rápido que el reloj.",
    still: "Se mantienen quietos, como en el aspecto Medido o con movimiento reducido.",
    review: "Aún no revisado por un astrónomo.",
    span: "de {a} a {b}"
  },
  r12Clusters: {
    rows: {},
    templates: {
      starsLabel: "Sus estrellas",
      lightLabel: "Su luz",
      depthLabel: "Su profundidad",
      reviewLabel: "Revisión",
      globularStars: "Un modelo de su tipo, no de sus propias estrellas: {n} estrellas más brillantes que el punto de giro, colocadas según el perfil de King con el radio del núcleo de Harris ({rc} años luz) y el radio de marea ({rt}). Su número, brillo y colores son un modelo.",
      globularLight: "En conjunto, alrededor del {pct}% de la luz del cúmulo (magnitud absoluta {mv}); las estrellas débiles que ningún punto representa son el resplandor. Dibujado hasta la magnitud 10, como lo muestra la exposición de una cámara.",
      openStars: "{n} miembros de Gaia (Hunt y Reffert 2023, {name}), cada uno con una probabilidad de pertenencia de al menos {p}, dentro de su radio de marea. Dibujados hasta la magnitud 10, como los muestra la exposición de una cámara.",
      openStarsHyg: "{n} miembros de Gaia (Hunt y Reffert 2023, {name}), cada uno con una probabilidad de pertenencia de al menos {p}, dentro de su radio de marea; {h} más brillantes son las estrellas del propio catálogo del mapa. Dibujados hasta la magnitud 10, como los muestra la exposición de una cámara.",
      openDepthSome: "{m} se sitúan por su propio paralaje; las otras {k}, a la distancia del cúmulo, con su profundidad dentro de él modelada.",
      openDepthNone: "Sus direcciones son medidas; su profundidad dentro del cúmulo es modelada, ya que a esta distancia el paralaje de una estrella no es lo bastante preciso.",
      review: "Este modelo aún no ha sido revisado por un astrónomo."
    }
  },
  r12Far: {
    quasar: {
      shape: "un punto brillante donde lo sitúa su corrimiento al rojo, con un anillo que marca el lugar; su disco y su chorro son demasiado pequeños para dibujarlos",
      host: "Su galaxia anfitriona se dibuja tenue y redonda con el tamaño angular que da la fuente, {size} segundos de arco de ancho vistos desde aquí; en realidad son unos {ly} años luz. No se dibujan su aplanamiento ni su inclinación.",
      point: "La fuente no da ningún tamaño para su galaxia anfitriona, así que no se dibuja ninguno."
    },
    cluster: {
      members: "{n} galaxias miembro de {catalogue}; {own} de ellas están a distancias medidas una por una.",
      membersNoOwn: "{n} galaxias miembro de {catalogue}.",
      distanceSbf: "El cúmulo está a {mpc} megapársecs ({mly} millones de años luz), una media de distancias halladas a partir de las fluctuaciones de brillo superficial.",
      distanceZ: "El cúmulo está a {mly} millones de años luz: el corrimiento al rojo medio de sus miembros ({z}), llevado a una distancia comóvil en la única cosmología del mapa.",
      depthMeasured: "Una galaxia sin distancia propia se reparte en profundidad según la dispersión medida del cúmulo, {rms} megapársecs; esa colocación es un modelo.",
      depthModelled: "Ninguna galaxia de aquí tiene una distancia propia, así que se reparten en profundidad tan ampliamente como en el cielo, como si el cúmulo fuera redondo; esa colocación es un modelo.",
      size: "Cada galaxia es tan ancha como dice el radio de media luz de su catálogo, dibujada como una forma redonda y brillante en el centro; no se dibujan su aplanamiento ni su inclinación."
    }
  },
  deepRing: {
    card: {
      "m27": "Su luz procede de la fotografía de NOIRLab, mostrada en los tonos propios de sus gases; su forma es una reconstrucción: la cintura brillante, un anillo grueso visto casi de canto; las «orejas» más tenues, sus lóbulos, según las velocidades de sus capas medidas por Meaburn y otros (2005). Aún no revisado por un astrónomo.",
      "southern-ring": "Su luz procede de la fotografía infrarroja del Webb; su forma sigue a Kastner y otros (2024) y De Marco y otros (2022): un anillo visto casi a lo largo de su eje, una burbuja que lo atraviesa y un halo molecular alrededor de ambos. Aún no revisado por un astrónomo.",
      m57: "Su luz procede de la fotografía de Hubble y su forma de O’Dell, Ferland, Henney y Peimbert (2013): un anillo grueso inclinado 13.5°, visto casi a lo largo de su eje, con el gas más azul de su centro dibujado extendiéndose hacia nosotros y alejándose de nosotros. Sus colores son los de la fotografía, tomada con filtros estrechos. Aún no revisado por un astrónomo."
    },
    rows: {
      "dso-m27": [["Su forma en profundidad", "Reconstruida. Su tamaño, su ángulo en el cielo y las velocidades de sus capas están medidos; que la cintura sea un anillo casi de canto, y cómo sus «orejas» se extienden hacia nosotros y en sentido contrario, es la lectura habitual de una nebulosa de este aspecto, dibujada como ilustración."], ["Sus colores", "Los tonos propios de sus gases, desde los filtros estrechos de la fotografía: oxígeno verde azulado, hidrógeno y azufre rojos. Cuánto se muestra cada uno es elección nuestra."], ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]],
      "dso-southern-ring-nebula": [["Su forma en profundidad", "Reconstruida. Que su anillo brillante se ve a 15–30° de su eje está medido (Kastner y otros, 2024); qué lado está más cerca, el grosor del anillo y la longitud de la burbuja son ilustrativos."], ["Sus colores", "Luz infrarroja que ningún ojo puede ver, coloreada por los autores de la imagen del Webb."], ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]],
      "dso-m57": [
        [
          "Su distancia",
          "Paralaje (Gaia DR3) de su estrella central, Gaia DR3 2090486618786534784: 1.270 ± 0.044 milisegundos de arco, unos 2 570 años luz (de 2 480 a 2 660)."
        ],
        [
          "Su forma en profundidad",
          "Reconstruida. El tamaño del anillo en el cielo, la inclinación de su eje largo y qué extremo está más cerca son medidos. Su grosor y la forma del gas que lo atraviesa por el centro no lo son: se dibujan como una ilustración."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ]
    },
    how: "Las imágenes de Hubble en colores sueltos de luz, con las velocidades del gas medidas a lo largo de la nebulosa, muestran un anillo grueso casi de frente: su eje largo está inclinado 13.5° y su extremo noreste está más cerca de nosotros. El gas más rápido llena su centro y se extiende hacia nosotros y alejándose a lo largo de nuestra línea de visión (O’Dell, Ferland, Henney y Peimbert 2013)."
  },
  r12Dust: {
    card: {
      "m45": "Su luz es la fotografía de NOIRLab: una nube de polvo que atraviesa el cúmulo, justo delante de sus estrellas, dispersa su luz azul (Ritchey y otros, 2006). Su profundidad está reconstruida. Aún no revisado por un astrónomo.",
      crab: "Su luz procede de la fotografía de Hubble, en falso color, llevada sobre una cáscara cuya forma sigue a Martin, Milisavljevic y Drissen (2021): una jaula de filamentos de unos 4 pársecs de largo alrededor de un centro vacío. Aún no revisado por un astrónomo.",
      veil: "Su luz procede de la fotografía de NOIRLab, en falso color, llevada sobre una esfera delgada de 37 pársecs de ancho (Fesen y otros, 2018): los filamentos son su borde visto de canto. Aún no revisado por un astrónomo.",
      horsehead: "Su oscuridad se lee en la fotografía de NOIRLab: polvo delante del gas incandescente de IC 434, que absorbe y enrojece lo que hay detrás y no emite luz. Aún no revisado por un astrónomo.",
      coalsack: "Su oscuridad se lee en la Vía Láctea que lo rodea: una nube de polvo a unos 590 años luz que atenúa y enrojece las estrellas que hay detrás. Aún no revisado por un astrónomo.",
      m78: "Su luz es la fotografía de NOIRLab: polvo que dispersa la luz azul de la estrella que tiene delante, en la cara de una nube oscura. Su profundidad está reconstruida. Aún no revisado por un astrónomo.",
      iris: "Su luz es la fotografía de NOIRLab: polvo que dispersa la luz de la joven estrella HD 200775 en un hueco de su nube. Su profundidad está reconstruida. Aún no revisado por un astrónomo."
    },
    rows: {
      "dso-m45": [["Su forma en profundidad", "Reconstruida. El gas está delante de las estrellas, como muestra su luz; a qué distancia delante y qué grosor tiene el polvo son ilustrativos, y las profundidades de las estrellas dentro del cúmulo son un modelo fijo, no medidas."], ["Qué hace el polvo", "Dispersa la luz de las estrellas, sobre todo la azul, así que brilla en azul alrededor de las más brillantes, Mérope y Maia sobre todo. Es una nube de paso, no aquella de la que nacieron las estrellas."], ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]],
      "dso-m1": [
        [
          "Su forma en profundidad",
          "Reconstruida a partir de un contorno medido. Los filamentos llegan a unos 2 pársecs a lo largo del eje del viento del púlsar y ninguno está a menos de medio pársec del centro (Martin y otros, 2021). Se dibuja como un elipsoide a lo largo de ese eje; qué extremo está más cerca de nosotros es una suposición."
        ],
        [
          "Sus colores",
          "Falso color: los filtros estrechos de la fotografía para el oxígeno y el azufre, asignados a colores por los autores de la imagen."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-veil-nebula": [
        [
          "Su forma en profundidad",
          "Reconstruida: una esfera de 37 pársecs de ancho, el tamaño y la distancia que midieron Fesen y otros (2018). El grosor de la cáscara es ilustrativo."
        ],
        [
          "Sus colores",
          "Falso color: los filtros estrechos de la fotografía para el oxígeno, el azufre y el hidrógeno, asignados a colores por el autor de la imagen."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-horsehead-nebula": [
        [
          "Su forma en profundidad",
          "Reconstruida. El polvo está delante del gas incandescente de IC 434, como se observa; a qué distancia delante, y lo grueso que es, son ilustrativos."
        ],
        [
          "Lo que hace el polvo",
          "Solo absorbe: las estrellas y el resplandor que hay detrás se atenúan, y más en el azul que en el rojo, así que parecen más rojizos. No emite luz propia."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-coalsack": [
        [
          "Lo oscura que es",
          "Se lee a partir de cuánto más oscura es aquí la Vía Láctea que a la misma distancia de su línea media en las cercanías. Es una estimación y menor que la de los mapas infrarrojos, porque las estrellas que están delante de la nube añaden su luz."
        ],
        [
          "Lo que hace el polvo",
          "Solo absorbe: las estrellas que hay detrás se atenúan y enrojecen. Las que están delante, no. Parte de la oscuridad del noreste es una segunda nube mucho más lejana, dibujada aquí a la distancia cercana."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-m78": [
        [
          "Su forma en profundidad",
          "Reconstruida: el polvo iluminado como una lámina con su estrella delante y una nube oscura detrás. Las profundidades son ilustrativas."
        ],
        [
          "Desde otro lado",
          "Modelado: el polvo dispersa más luz hacia delante que hacia los lados, así que desde otro lado el mismo polvo parece más o menos brillante."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ],
      "dso-iris-nebula": [
        [
          "Su forma en profundidad",
          "Reconstruida: las paredes iluminadas como una lámina con la estrella delante y una nube oscura detrás. Las profundidades son ilustrativas."
        ],
        [
          "Desde otro lado",
          "Modelado: el polvo dispersa más luz hacia delante que hacia los lados, así que desde otro lado el mismo polvo parece más o menos brillante."
        ],
        ["Revisión", "Este modelo aún no ha sido revisado por un astrónomo."]
      ]
    },
    how: "El gas de un remanente sale despedido a una velocidad constante, así que su velocidad hacia nosotros o alejándose de nosotros dice a qué distancia delante o detrás del centro está. Martin, Milisavljevic y Drissen (2021) convirtieron 310 000 espectros de la Nebulosa del Cangrejo en su forma de este modo."
  },
  r12Navigate: {
    chainLabel: "Dónde está",
    chainTitle: "Volar hasta {name}",
    milkyWay: "Vía Láctea",
    outside: "Fuera de la Vía Láctea",
    the: ["Sun", "Moon", "Milky Way"],
    theWord: "el",
    backParent: "Volver hacia {parent}",
    backParentTitle: "Alejarse hasta {parent}",
    legendTitle: "Abrir la leyenda: qué significa cada una de estas palabras",
    label: "Dónde estás",
    title: "Dónde está la cámara en la escalera, desde la Tierra hasta el Grupo Local",
    back: "Atrás",
    backTo: "Volver a {name}",
    sep: "›",
    rungs: {
      earth: "Tierra",
      sun: "Sistema solar",
      stellar: "Estrellas cercanas",
      galaxy: "Vía Láctea",
      "local-group": "Grupo Local"
    },
    notes: {
      sun: "Acelerado: el Sol está a {distance}",
      stellar: "Acelerado: la estrella más cercana está a {distance}",
      galaxy: "Acelerado: el centro de nuestra galaxia está a {distance}",
      "local-group": "Acelerado: Andrómeda está a {distance}"
    }
  },
  r12Search: {
    group: "{label} · {n}",
    groups: {
      SUN: "El Sol",
      ROCKY_PLANET: "Planetas rocosos",
      GAS_GIANT: "Gigantes gaseosos",
      ICE_GIANT: "Gigantes helados",
      RINGS: "Anillos",
      VOLCANIC_MOON: "Luna volcánica",
      ICY_MOON: "Lunas heladas",
      TITAN: "Luna con atmósfera",
      AIRLESS_MOON: "Lunas sin atmósfera",
      DWARF_PLANET: "Planetas enanos",
      ASTEROID: "Asteroides",
      COMET: "Cometas",
      ARTIFICIAL_SATELLITE: "Satélites",
      LAUNCH_AND_ROCKET: "Lanzamientos y cohetes",
      SPACE_PROBE: "Sondas espaciales",
      LANDING_SITE: "Lugares de aterrizaje",
      EXOPLANET: "Exoplanetas",
      STAR: "Estrellas",
      BINARY_AND_MULTIPLE: "Estrellas dobles y múltiples",
      COMPACT_REMNANT: "Estrellas muertas",
      BLACK_HOLE: "Agujeros negros",
      OPEN_CLUSTER: "Cúmulos abiertos",
      GLOBULAR_CLUSTER: "Cúmulos globulares",
      EMISSION_NEBULA: "Nebulosas de emisión",
      PLANETARY_NEBULA: "Nebulosas planetarias",
      DARK_NEBULA: "Nebulosas oscuras",
      REFLECTION_NEBULA: "Nebulosas de reflexión",
      SUPERNOVA_REMNANT: "Remanentes de supernova",
      GALAXY_SPIRAL: "Galaxias espirales",
      GALAXY_IRREGULAR: "Galaxias irregulares",
      GALAXY_ELLIPTICAL: "Galaxias elípticas",
      GALAXY_INTERACTION: "Galaxias en interacción",
      AGN_QUASAR: "Cuásares",
      GALAXY_GROUP: "Grupos de galaxias",
      GROUND_SITE: "Estaciones terrestres",
      ODDITY: "Rarezas"
    },
    other: "Otras cosas",
    byName: "Por nombre",
    of: "{label} de {world}",
    only: "Modelos 3D",
    onlyTitle: "Mostrar solo lo que se dibuja a partir de un modelo 3D: un modelo real o una reconstrucción",
    real: "modelo 3D real",
    rebuilt: "reconstrucción 3D",
    noneWithModel: "Ninguno de estos tiene un modelo 3D.",
    counting: "contando…"
  },
  r12Access: {
    motion: {
      panelTitle: "Movimiento",
      choices: {
        on: "Activado",
        off: "Desactivado"
      },
      titles: {
        on: "Los vuelos se deslizan y los viajes avanzan solos, como está hecho el mapa",
        off: "Cada vuelo es un salto instantáneo, no se mueve nada que no esté medido y un viaje espera a «Siguiente»"
      },
      device: "Tu dispositivo pide menos movimiento, así que está desactivado."
    },
    summary: {
      label: "Lo que hay en pantalla",
      stage: "Mirando {stage}.",
      selected: "Seleccionado: {name}, {kind}.",
      nothing: "No hay nada seleccionado.",
      trip: "Parada {n} de {count} del viaje: {title}.",
      tripIntro: "Viaje abierto: {title}.",
      measured: "Se dibuja tal como se midió."
    }
  }
};

// 0079 int: begin -- the strings stages A4, A5 and A6 of release 1.5.0 added to the English copy, in Spanish like the rest of this file
// (machine-drafted until two native speakers have read it). A key this file already has is left as it is.
{
  const topUp = (dst, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') topUp(dst[k], src[k]);
      else if (!(k in dst)) dst[k] = src[k];
    }
  };
  topUp(COPY, {
    card: { rows: { iauName: "Nombre aprobado por la UAI", onBody: "En", whenSite: "Cuándo" } },
    drawing: {
      markOnly: "una marca en su lugar; no hay nada allí que dibujar",
      noPlace: "no se dibuja: no hay un lugar suyo que marcar",
      shower: "un nombre en el punto de donde parecen venir sus meteoros, en la vista del cielo cerca de su máximo; una dirección, no un lugar del espacio"
    },
    klass: { shower: "Lluvia de meteoros" },
    cls: {
      shower: "una dirección en el cielo: la mediana de las soluciones publicadas por la UAI para esta lluvia",
      noPlace: "no se dibuja ningún lugar para él: el cuerpo en que está no es un mundo de esta aplicación",
      approxPlace: "situado según coordenadas publicadas, con una precisión de unos {n} grados"
    },
    unplaced: { noDistanceRow: "Sin medir: el catálogo no tiene paralaje para ella", iauApproved: "{name}, aprobado el {date}" },
    starSystem: { auYearComputed: "{n} UA; su año, de unos {y} años, se calcula a partir de eso y de la masa de su estrella" },
    searchRows: { kinds: { galaxy: "Galaxia", cluster: "Cúmulo de galaxias", browndwarf: "Enana marrón", whitedwarf: "Enana blanca" } },
    templates: {
      exotic: {
        kinds: { galaxy: "galaxia", cluster: "cúmulo de galaxias", browndwarf: "enana marrón", whitedwarf: "enana blanca" },
        leadGalaxy: "{name} es una galaxia a {dist} años luz, donde está ahora",
        leadCluster: "{name} es un cúmulo de galaxias a {dist} años luz, donde está ahora",
        leadBrowndwarf: "{name} es una enana marrón a {dist} años luz",
        leadWhitedwarf: "{name} es una enana blanca a {dist} años luz"
      },
      site: { mpc: "su código del Minor Planet Center es {code}", closed: "cerrado en {year}", kinds: { "launch-site": "base de lanzamiento", "landing-site": "lugar de aterrizaje" } },
      shower: { lead: "{name} es una lluvia de meteoros", peak: "con su máximo hacia el {date}", speed: "con meteoros que entran en el aire a {n} km por segundo", parent: "del polvo de {parent}" }
    }
  });
}
// 0079 int: end

// 1.6.2 (internal #1057): the words of the Moments (copy/en.moments.js and its three story files), Spanish. Machine-drafted like the rest of this file
// (docs/TRANSLATING.md): drafted by a program from the English, NOT read by a native speaker. The spoken lines of the recordings
// (Armstrong's first words) stay in the language they were said in. Added to COPY here; the story files call HOOK.localise after they load.
Object.assign(COPY, {
  "momentPlayer": {
    "micro": "Momento",
    "play": "Reproducir",
    "pause": "Pausa",
    "replay": "Ver otra vez",
    "close": "Cerrar el momento",
    "chapters": "Capítulos",
    "chaptersTitle": "Saltar a un capítulo",
    "share": "Copiar un enlace a este segundo",
    "copied": "Enlace copiado",
    "copyFailed": "Copia este enlace: {url}",
    "director": "Director",
    "directorTitle": "Devolver la cámara al director",
    "freeNote": "Tu cámara. Arrastra para mirar alrededor; Director te la quita.",
    "scrubber": "Tiempo de misión",
    "met": "Tiempo transcurrido de la misión",
    "rateTitle": "Aquí el tiempo corre {rate} más rápido que el real",
    "realTime": "Tiempo real",
    "loading": "Cargando el momento…",
    "missing": "No hay ningún momento llamado {id}.",
    "unreachable": "Este momento no se cargó. Solo queda guardado en este dispositivo después de abrirlo una vez con conexión.",
    "modelMissing": "El modelo {model} no se cargó; su trayectoria y sus llamas siguen dibujadas.",
    "chapterOf": "Capítulo {n} de {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "Medido",
      "reconstructed": "Reconstruido",
      "illustrative": "Ilustrativo"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "Por ahora, las etapas se recortan de un único modelo.",
    "drawnNote": "Las llamas y el vapor son dibujados.",
    "groundNote": "El suelo junto a la plataforma es ilustrativo; mapa de la Tierra de Solar System Scope, CC BY 4.0.",
    "groundNoteMars": "El suelo junto al sitio es ilustrativo; mapa de Marte de Solar System Scope, CC BY 4.0.",
    "keys": "Espacio reproduce o pausa, las flechas avanzan, Escape cierra"
  },
  "momentShelf": {
    "title": "Momentos",
    "note": "Misiones repetidas en un solo reloj, con las horas reales de los sucesos. Las trayectorias son reconstruidas o ilustrativas, y lo dicen.",
    "minutes": "{m} min",
    "all": "Los {n} momentos",
    "fewer": "Menos momentos",
    "replay": "Repetir este momento",
    "replayTitle": "Repetir {title} en el reloj de la misión",
    "replayNamed": "Repetir {title}",
    "cards": {
      "apollo-11": {
        "title": "Apolo 11",
        "when": "del 16 al 24 de julio de 1969",
        "blurb": "De la plataforma 39A al Pacífico pasando por la Base Tranquilidad: despegue, la Luna, el alunizaje, el ascenso, el regreso."
      },
      "apollo-13": {
        "title": "Apolo 13",
        "when": "del 11 al 17 de abril de 1970",
        "blurb": "De la plataforma 39A al Pacífico: el alunizaje que no ocurrió, un tanque de oxígeno que estalló y el módulo lunar como bote salvavidas."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "del 1 al 10 de abril de 2026",
        "blurb": "De la plataforma 39B al Pacífico frente a San Diego, por la cara oculta de la Luna. Se dice qué se voló y qué estaba planeado."
      },
      "sputnik-1": {
        "title": "Sputnik 1",
        "when": "4 de octubre de 1957",
        "blurb": "De Baikonur a la primera vuelta a la Tierra: el primer satélite artificial, una esfera pulida de 585 mm, y su pitido."
      },
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "del 18 al 19 de marzo de 1965",
        "blurb": "Alexei Leonov sale al espacio durante doce minutos por una esclusa inflable, y la tripulación aterriza a mano en la taiga, lejos de su campo."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "del 12 al 14 de abril de 1981",
        "blurb": "El primer transbordador espacial: el Columbia desde la plataforma 39A, los cohetes y el tanque, 54 horas en órbita y un planeo hasta el lecho seco de Edwards."
      },
      "curiosity-edl": {
        "title": "Aterrizaje de Curiosity",
        "when": "6 de agosto de 2012",
        "blurb": "Los siete minutos desde lo alto del aire marciano hasta el cráter Gale: el escudo térmico, el paracaídas, la mochila cohete y la grúa celeste, con el reloj del JPL."
      },
      "new-horizons-pluto": {
        "title": "New Horizons en Plutón",
        "when": "14 de julio de 2015",
        "blurb": "La primera visita a Plutón: de seis horas antes al paso a 13,8 km/s, por la trayectoria del propio JPL, Plutón y Caronte como discos, la media luna que queda atrás."
      },
      "hubble-deployment": {
        "title": "La suelta del Hubble",
        "when": "25 de abril de 1990",
        "blurb": "El brazo del Discovery saca el telescopio espacial Hubble de la bodega en la STS-31, un panel solar se detiene y a las 19:38 UTC el telescopio queda suelto."
      },
      "falcon9-og2-2": {
        "title": "El primer aterrizaje de un Falcon 9",
        "when": "21 de diciembre de 2015",
        "blurb": "El vuelo 20 del Falcon 9 lanza 11 satélites de ORBCOMM desde Cabo Cañaveral, y su primera etapa vuelve volando y aterriza en Landing Zone 1: el primer aterrizaje de la primera etapa de un cohete orbital."
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 de abril de 1961",
        "blurb": "Yuri Gagarin, una vuelta a la Tierra en 108 minutos, de Baikonur a un campo cerca de Smelovka."
      }
    }
  },
  "momentStories": {
    "demo-saturn": {
      "title": "Saturno V: de la ignición a la separación de etapas",
      "blurb": "Los tres primeros minutos del Apolo 11, el 16 de julio de 1969, desde la plataforma del Complejo de Lanzamiento 39A.",
      "chIgnition": "Ignición",
      "chLiftoff": "Despegue",
      "chClimb": "Máxima presión dinámica",
      "chStaging": "Separación de etapas",
      "ignition": "T−8.9 s: la secuencia de ignición enciende los cinco motores F-1, primero el central y luego los pares exteriores.",
      "holddown": "Los brazos de sujeción mantienen el cohete en la plataforma hasta que los cinco motores alcanzan el empuje total.",
      "liftoff": "Despegue, 13:32:00.6 UTC: cinco F-1, unos 33 800 kN, elevando casi 3 000 toneladas.",
      "tower": "Libre de la torre, el cohete gira hacia su acimut de vuelo, 72 grados al este del norte.",
      "maxq": "Pasada la velocidad del sonido, al minuto de vuelo, llega la máxima presión dinámica, cuando el aire empuja con más fuerza: 35 kPa (735 lb/ft²).",
      "ceco": "T+135 s: el motor central se apaga para mantener la aceleración por debajo de 4 g.",
      "staging": "T+161.7 s: los motores exteriores se apagan. A unos 67 km de altura la S-IC se separa y cae, con sus retrocohetes encendidos.",
      "sii": "T+163.0 s: se encienden los cinco motores J-2 de la S-II. El hidrógeno arde con una llama pálida y casi transparente.",
      "interstage": "El anillo de interetapa se desprende; a T+197.9 s sale la torre de escape. La órbita de aparcamiento está 8.5 minutos más adelante.",
      "pathAscent": "horas del Informe de la misión Apolo 11, con alturas intermedias aproximadas",
      "sources": "Informe de la misión Apolo 11, NASA MSC-00171, 1969 (tabla 3-I, secuencia de sucesos; sección 7.1, lanzamiento)"
    },
    "vostok-1": {
      "title": "Vostok 1: la primera persona en el espacio",
      "blurb": "Yuri Gagarin, 12 de abril de 1961: de Baikonur, una vuelta a la Tierra, hasta un campo cerca de Smelovka, en el reloj de la misión y en 108 minutos.",
      "chPad": "El Inicio de Gagarin",
      "chAscent": "Ascenso",
      "chOrbit": "Una órbita",
      "chRetro": "Retrofrenado",
      "chEntry": "Reentrada",
      "chEject": "Eyección",
      "chLand": "Aterrizaje",
      "ready": "Baikonur, Sitio 1, 06:07 UTC. Yuri Gagarin, de 27 años, está en la cápsula sobre el cohete R-7.",
      "korolev": "Serguéi Koroliov por radio: «Etapa preliminar… intermedia… principal… ¡despegue!»",
      "liftoff": "Despegue. Gagarin: «¡Poyekhali!», «¡Vamos!»",
      "boosters": "T+119 s: los cuatro propulsores laterales se agotan y se separan.",
      "shroud": "T+156 s: se expulsa la cofia que cubre la cápsula.",
      "core": "T+300 s: la etapa central se agota y se separa; se enciende la última etapa.",
      "earth": "Hacia T+6 min, Gagarin: «Veo la Tierra. La visibilidad es buena».",
      "kosberg": "Hacia T+10 min se apaga la última etapa. Gagarin: «¡Kosberg ha funcionado!», por el diseñador de su motor.",
      "orbit": "En órbita: 181 por 327 km, inclinada 64.95 grados respecto al ecuador, 89.1 minutos por vuelta. La cápsula se separa de la etapa.",
      "retro": "T+1 h 18 min, sobre la costa occidental de África: el retrocohete se enciende unos 42 segundos. Su hora y su lugar están publicados; aquí su magnitud se ajusta al aterrizaje.",
      "wires": "El módulo de instrumentos debía separarse diez segundos después del retrofrenado. Un haz de cables lo sujeta; los dos caen juntos dando vueltas hacia el aire.",
      "entry": "Los cables se queman y la esfera se orienta con el escudo térmico por delante. Gagarin contó después más de 10 g.",
      "eject": "A 7 km se expulsa la escotilla y el asiento lanza a Gagarin al exterior. La esfera de la Vostok aterrizaba demasiado fuerte para una persona en su interior.",
      "chutes": "A 2.5 km se abre el paracaídas principal de la cápsula, de 27 m de ancho; el paracaídas del piloto se abrió casi de inmediato. El asiento cae libre.",
      "landing": "T+1 h 48 min: Gagarin aterriza a 26 km al suroeste de Engels, en la región de Sarátov, 108 minutos después del lanzamiento. Las fuentes difieren en diez minutos sobre el aterrizaje.",
      "pathAscent": "el ascenso son las horas publicadas de los sucesos unidas con curvas suaves; las alturas y distancias intermedias son nuestras",
      "pathOrbit": "la órbita, el retrofrenado y la reentrada son arcos de dos cuerpos ajustados a las horas publicadas y al campo de aterrizaje, no datos de seguimiento",
      "pathPilot": "el descenso bajo el paracaídas del piloto es dibujado; ninguna fuente da la distancia hasta la cápsula",
      "srcWiki": "Wikipedia, Vostok 1 (horas de los sucesos, órbita, citas; leído el 2 de noviembre de 2026)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (órbita, nave)"
    },
    "apollo-11": {
      "title": "Apolo 11: a la Luna y de vuelta",
      "blurb": "Del Complejo de Lanzamiento 39A, el 16 de julio de 1969, al Pacífico el día 24: despegue, la Luna, la Base Tranquilidad y el regreso, en el reloj de la misión.",
      "chIgnition": "Ignición",
      "chLiftoff": "Despegue",
      "chStaging": "Separación de etapas",
      "chParking": "Órbita de aparcamiento",
      "chTli": "Rumbo a la Luna",
      "chCoast": "Tres días de viaje",
      "chLoi": "A la órbita lunar",
      "chUndock": "Eagle se separa",
      "chDescent": "Descenso propulsado",
      "chSurface": "Base Tranquilidad",
      "chAscent": "De vuelta arriba",
      "chDock": "Acoplamiento",
      "chTei": "Hacia casa",
      "chEntry": "Reentrada",
      "chSplash": "Amerizaje",
      "ignition": "T−8.9 s: la secuencia de ignición enciende los cinco motores F-1, primero el central y luego los pares exteriores.",
      "liftoff": "Despegue, 13:32:00 UTC: cinco F-1, unos 33 800 kN, elevando casi 3 000 toneladas.",
      "tower": "Libre de la torre, el cohete gira hacia su acimut de vuelo, 72 grados al este del norte.",
      "maxq": "Pasada la velocidad del sonido al minuto de vuelo; luego la máxima presión dinámica, cuando el aire empuja con más fuerza: 35 kPa.",
      "ceco": "T+135 s: el motor central se apaga para mantener la aceleración por debajo de 4 g.",
      "staging": "T+161.7 s: los motores exteriores se apagan. A unos 67 km de altura la S-IC se separa y cae, con sus retrocohetes encendidos.",
      "sii": "T+163.0 s: se encienden los cinco motores J-2 de la S-II. El hidrógeno arde con una llama pálida y casi transparente.",
      "interstage": "El anillo de interetapa se desprende; a T+197.9 s sale la torre de escape.",
      "siicut": "T+9 min 13 s: la S-II se apaga y se separa; se enciende la S-IVB.",
      "parking": "T+11 min 52 s: órbita de aparcamiento, a 185 km. Dos horas y media de comprobaciones, una vuelta y media a la Tierra.",
      "tli": "2:44:16: la S-IVB se enciende otra vez durante 5 min 48 s y lleva el conjunto a 10.8 km/s. El destino es la Luna.",
      "sla": "3:17: los cuatro paneles que rodean el módulo lunar se abren. Columbia se separa, da la vuelta y se acopla morro con morro a Eagle (no dibujado).",
      "extract": "Hacia 3:57: Columbia saca a Eagle de la S-IVB. La etapa agotada se queda atrás.",
      "coast": "Tres días hasta la Luna, 384 000 km, dibujados a unas 8 000 veces la velocidad real. La nave mide 11 metros, así que es un punto.",
      "loi": "75:49:50, detrás de la Luna y sin contacto por radio: el motor de servicio arde seis minutos para ser capturado.",
      "lunarorbit": "Órbita lunar, a unos 100 km de altura, dos horas por vuelta.",
      "undock": "100:12: Eagle, con Armstrong y Aldrin, se separa de Columbia, donde se queda Collins.",
      "pdi": "102:33:05: empieza el descenso propulsado, a 15 km de altura y a unos 500 km del lugar.",
      "landing": "El ordenador aterrizaría en un cráter lleno de rocas. Armstrong toma los mandos y sigue volando, con menos de un minuto de combustible.",
      "landed": "102:45:40, 20:17:40 UTC. «Houston, Tranquility Base here. The Eagle has landed.»",
      "step": "109:24:15, 02:56 UTC del 21 de julio: Armstrong baja de la escalerilla.",
      "smallstep": "«That's one small step for [a] man, one giant leap for mankind.» Armstrong, 109:24:48; el audio es la grabación de la NASA.",
      "liftoffe": "124:22: la etapa de ascenso despega de la etapa de descenso, que se queda en la Luna. 17:54 UTC del 21 de julio.",
      "rendezvous": "Eagle persigue a Columbia desde 18 km hasta 100 km. Las maniobras se dibujan como una forma, no las de la misión.",
      "docked": "128:03, 21:35 UTC: acoplados. La tripulación y 21.5 kg de roca lunar pasan a Columbia.",
      "jettison": "130:09: se suelta la etapa de ascenso de Eagle, que seguirá girando alrededor de la Luna.",
      "tei": "135:23:42, en la cara oculta: el motor de servicio se enciende 2 min 30 s. A casa.",
      "home": "Dos días y medio de vuelta, los mismos 384 000 km.",
      "smsep": "194:49: se corta el módulo de servicio y la cápsula gira con el escudo térmico por delante.",
      "entry": "195:03, interfaz de reentrada, a 122 km de altura y 11 km/s. El escudo brilla; hasta unos 6 g.",
      "drogue": "Hacia 195:12: dos paracaídas estabilizadores y luego tres principales.",
      "mains": "Tres paracaídas principales, de 25 m de ancho, frenan la cápsula hasta unos 9 m/s.",
      "splash": "195:18:35, 16:50:35 UTC del 24 de julio: amerizaje en el Pacífico, a 24 km del portaaviones USS Hornet (no dibujado). Ocho días, tres horas, 18 minutos.",
      "pathAscent": "las horas de los sucesos del Informe de la misión, con alturas y distancias intermedias aproximadas",
      "pathTrip": "reconstruido a partir de las horas del Diario de vuelo como arcos de dos cuerpos: una cónica de ida, un círculo alrededor de la Luna, una cónica de vuelta; no son datos de seguimiento",
      "pathLm": "el descenso se dibuja hacia atrás desde la Base Tranquilidad y el encuentro es una forma; las horas de los sucesos son las de la misión",
      "srcReport": "Informe de la misión Apolo 11, NASA MSC-00171, 1969 (horas de los sucesos, lanzamiento, alunizaje)",
      "srcJournal": "Diario de vuelo del Apolo 11, NASA (horas de los sucesos al segundo)",
      "srcClip": "Las primeras palabras de Armstrong en la Luna: grabación de la NASA, dominio público, de Wikimedia Commons",
      "srcLanding": "El aviso del alunizaje: grabación de la NASA, dominio público, de Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: alrededor de la Luna",
      "blurb": "Del Complejo de Lanzamiento 39B, el 1 de abril de 2026, al Pacífico frente a San Diego el día 10: cuatro personas por la cara oculta de la Luna, en el reloj de la misión.",
      "chPad": "Plataforma 39B",
      "chLiftoff": "Despegue",
      "chStaging": "Propulsores fuera",
      "chOrbit": "Órbita terrestre alta",
      "chTli": "Rumbo a la Luna",
      "chMoon": "La cara oculta",
      "chHome": "De regreso",
      "chEntry": "Reentrada",
      "chSplash": "Amerizaje",
      "ready": "Complejo de Lanzamiento 39B, Centro Espacial Kennedy, 1 de abril de 2026. Wiseman, Glover, Koch y Hansen van a bordo de Orion, sobre el Sistema de Lanzamiento Espacial.",
      "cored": "T−6.4 s: se encienden los cuatro motores RS-25 de la etapa central. Volado, como estaba planeado.",
      "liftoff": "Despegue, 22:35:12 UTC (6:35 p.m. EDT): los dos propulsores de cinco segmentos se encienden en el cero. Volado.",
      "srb": "Hacia T+2 min: los propulsores se agotan y se separan a 48 km, a 5 000 km/h. Volado; caen al Atlántico.",
      "las": "Planeado, T+3 min 22 s: se expulsa la torre de aborto del lanzamiento. Los vuelos informados no dan el segundo; este es el del plan de vuelo.",
      "meco": "Planeado, T+8 min: la etapa central se apaga, en un arco suborbital con apogeo cercano a 2 300 km. Es la hora del plan de vuelo.",
      "coresep": "La etapa central se suelta y cae en una reentrada destructiva sobre el Pacífico, unas dos horas después del lanzamiento. Volado.",
      "prb": "Hacia T+50 min, en lo alto del arco: la etapa superior arde para subir el punto bajo fuera del aire. Volado; el segundo no está publicado.",
      "arb": "Una hora después, en el punto bajo: una quema de 15 minutos eleva el lado lejano de la órbita a 70 000 km, una vuelta de casi un día. Volado.",
      "fairings": "Planeado: se expulsan los tres paneles que rodean el módulo de servicio; se despliegan los cuatro paneles solares. Es la hora del plan de vuelo, dibujados ya desplegados.",
      "arrays": "Los cuatro paneles de Orion están desplegados: producirán su energía durante diez días.",
      "sep": "Planeado: Orion se separa de la etapa superior; Glover la pilota después a mano junto a la etapa durante unos 70 minutos. La hora de la separación no está publicada.",
      "tli": "Día de vuelo 2, hacia las 25 horas: el motor principal del módulo de servicio arde 5 min 49 s, rumbo a la Luna. Volado; el minuto mostrado es el del plan de vuelo.",
      "outbound": "Cuatro días de ida. Se voló una quema de corrección de ida, de 17.5 s el día de vuelo 5; es demasiado pequeña para dibujarla.",
      "record": "17:56 UTC del 6 de abril: Orion supera el récord de distancia del Apolo 13 de 1970, 248 655 millas de la Tierra. Volado.",
      "moon": "Día de vuelo 6: Orion entra en la esfera de influencia de la Luna. No entrará en órbita: da la vuelta por la cara oculta y cae hacia casa.",
      "los": "22:46 UTC: detrás de la Luna, sin contacto durante 38 minutos. Volado.",
      "closest": "Máxima aproximación, 23:00 UTC del 6 de abril: 6 545 km sobre la cara oculta de la Luna. Volado.",
      "far": "23:02 UTC: máxima distancia a la Tierra, 406 771 km. Volado.",
      "aos": "23:24 UTC: contacto de nuevo desde detrás de la Luna. Volado.",
      "home": "Cuatro días de vuelta. Se volaron tres quemas de corrección de regreso, de 15, 9 y 8 segundos; son demasiado pequeñas para dibujarlas.",
      "esmsep": "Planeado: el módulo de servicio se suelta unos 20 minutos antes de la reentrada. La hora de la separación no está publicada; se dibuja la del plan de vuelo.",
      "entry": "Interfaz de reentrada, planeada unos 13 minutos antes del amerizaje: a 122 km de altura y 11 km/s, con el escudo térmico brillando. Una reentrada directa más pronunciada sustituyó a la reentrada con rebote prevista. Volado.",
      "drogue": "Paracaídas estabilizadores, luego piloto y tres paracaídas principales, de 35 m de ancho. Volado; las horas son las del plan de vuelo.",
      "mains": "Tres principales bajan la cápsula hasta el mar.",
      "splash": "Amerizaje, 00:07:27 UTC del 11 de abril (5:07 p.m. PDT, 10 de abril), 32.3 N 117.8 O, al suroeste de San Diego; el USS John P. Murtha recoge a la tripulación (barco no dibujado). Nueve días, una hora, 32 minutos. Volado.",
      "pathAscent": "las horas del plan de vuelo, con alturas y distancias intermedias nuestras; el despegue y la separación de los propulsores son volados",
      "pathTrip": "reconstruido a partir de la órbita volada, la máxima aproximación y el amerizaje, como arcos de dos cuerpos y una hipérbola alrededor de la Luna; no son datos de seguimiento",
      "srcWiki": "Wikipedia, Artemis II (lo que se voló, con horas y distancias; leído el 2 de noviembre de 2026)",
      "srcNasa": "NASA, Artemis II (el plan de vuelo; modelo del cohete y de la cápsula: NASA 3D Resources)"
    },
    "apollo-13": {
      "title": "Apolo 13: el viaje de regreso",
      "blurb": "Del Complejo de Lanzamiento 39A, el 11 de abril de 1970, al Pacífico el día 17: un alunizaje que no ocurrió, un tanque de oxígeno que estalló y el módulo lunar como bote salvavidas.",
      "chIgnition": "Ignición",
      "chLiftoff": "Despegue",
      "chStaging": "Separación de etapas",
      "chParking": "Órbita de aparcamiento",
      "chTli": "Rumbo a la Luna",
      "chCoast": "Dos días de viaje",
      "chBang": "El estallido",
      "chLifeboat": "Aquarius, el bote salvavidas",
      "chReturn": "De nuevo en trayectoria de regreso",
      "chMoon": "Por la cara oculta",
      "chBurn": "La quema hacia casa",
      "chHome": "Tres días hacia casa",
      "chSm": "El módulo de servicio",
      "chUndock": "Aquarius se suelta",
      "chEntry": "Reentrada",
      "chSplash": "Amerizaje",
      "ignition": "Hacia T−9 s: se encienden los cinco motores F-1, primero el central. Complejo de Lanzamiento 39A, 2:13 p.m. hora del este.",
      "liftoff": "Despegue, 19:13:00 UTC, 11 de abril de 1970: James Lovell, Jack Swigert y Fred Haise, rumbo a las tierras altas de Fra Mauro.",
      "roll": "A los 12.6 s el cohete gira hacia su acimut de vuelo, 72.043 grados al este del norte.",
      "staging": "2:44: los motores exteriores de la primera etapa se apagan y la etapa se separa; la segunda etapa se enciende a los 2:45.",
      "tower": "3:21: sale la torre de escape del lanzamiento.",
      "pogo": "A los 5:30 el motor central de la segunda etapa se apaga solo, 132 segundos antes de lo previsto, después de que la etapa empezara a vibrar demasiado fuerte. Los otros cuatro arden 34 segundos más para compensar.",
      "siicut": "9:53: la segunda etapa se apaga y se separa; se enciende la S-IVB.",
      "parking": "12:30: órbita de aparcamiento, de 190 por 185 km de altura. Siguen dos horas y media de comprobaciones.",
      "tli": "2:35:46: la S-IVB se enciende otra vez durante 5 min 51 s y envía la nave hacia la Luna a casi 11 km/s.",
      "sep": "3:06:39: Odyssey se separa de la S-IVB, da la vuelta y se acopla a Aquarius a las 3:19:09. Los cuatro paneles del adaptador se desprenden.",
      "extract": "4:01: Odyssey saca a Aquarius de la etapa agotada, que se queda atrás.",
      "coast": "Dos días hasta la Luna, dibujados a unas 9 000 veces la velocidad real. La nave mide 11 metros, así que es un punto.",
      "tv": "55:53:20: el Control de la Misión pide una agitación rutinaria de los tanques de oxígeno. Hace minutos terminó una transmisión de televisión; la tripulación está ordenando.",
      "bang": "55:54:53, 03:07 UTC del 14 de abril: un estallido. El tanque de oxígeno 2 ha reventado y ha arrancado el panel exterior del compartimento 4 del módulo de servicio. El vuelo del panel es dibujado, no medido.",
      "problem": "55:55:20: «Okay, Houston, we've had a problem here.» Jack Swigert; la grabación de la NASA, reproducida como se registró.",
      "problem2": "55:55:42: «Houston, we've had a problem.» James Lovell; la grabación de la NASA.",
      "barber": "En pocos minutos también se escapa el oxígeno del tanque 1. Las pilas de combustible producen la energía y el agua de la nave a partir de ese oxígeno, y están fallando.",
      "lifeboat": "Aquarius se convierte en el bote salvavidas: construido para mantener vivos a dos hombres durante dos días, ha de mantener vivos a tres durante cuatro. Odyssey se apaga para guardar sus baterías para la reentrada.",
      "mcc2": "61:29:43: el motor de descenso del módulo lunar arde 34 s, 11.5 m/s, para poner la nave en una trayectoria que vuelve a la Tierra. La trayectoria dibujada no se curva por ello.",
      "impact": "77:56:40: la S-IVB agotada, enviada por delante, se estrella en la Luna en 2.4 S 27.9 O, y el sismómetro del Apolo 12 lo registra (no dibujado).",
      "farside": "Hacia 77:28, detrás de la Luna y sin contacto por radio: la cara oculta, 254 km más abajo.",
      "closest": "Máxima aproximación, 254 km sobre la cara oculta. A unos 400 000 km de la Tierra: más lejos de lo que había llegado nunca ningún ser humano.",
      "tei": "79:27:39, dos horas después de la Luna: el motor de descenso arde 4 min 24 s, 262 m/s, para adelantar el regreso de las 152 horas a las 143 y llevarlo al Pacífico.",
      "home": "Tres días de regreso, con frío, escasez de agua y la nave apagada al mínimo.",
      "mcc3": "105:18: el motor de descenso arde 14 s al 10 por ciento, 2.4 m/s, para hacer la reentrada algo más pronunciada.",
      "mcc4": "137:39:52: una última corrección de 0.9 m/s, hecha con los pequeños propulsores del módulo lunar (no dibujada).",
      "smsep": "138:01:48, 4 horas 39 minutos antes de la reentrada: se corta el módulo de servicio. Su panel lleva 82 horas desaparecido.",
      "photo": "La tripulación fotografía el módulo mientras se aleja: falta un panel entero y el aislante desgarrado sobresale. El compartimento se dibuja a partir de AS13-59-8500; el daño a una antena parabólica, no.",
      "undock": "141:30: Aquarius, que ha mantenido vivos a tres hombres unas 83 horas, se suelta con la presión del túnel de acoplamiento. El módulo de mando se queda solo.",
      "entry": "142:40:46, interfaz de reentrada, a 122 km de altura y 11 km/s. El primer pico es de unos 5 g.",
      "drogue": "Hacia 142:48: dos paracaídas estabilizadores, luego tres principales.",
      "mains": "Tres paracaídas principales frenan la cápsula hasta unos 9 m/s.",
      "splash": "142:54:41, 18:07 UTC del 17 de abril: amerizaje en el Pacífico Sur, a la vista del USS Iwo Jima. Los tres están a bordo en menos de 45 minutos.",
      "pathAscent": "las horas de los sucesos del Informe de la misión, con alturas y distancias intermedias aproximadas",
      "pathTrip": "los estados y las horas del Informe de la misión, una trayectoria integrada con un ajuste de la velocidad de inyección y un arco de Lambert de regreso; no son datos de seguimiento",
      "pathLm": "acoplado a Odyssey hasta 141:30; la deriva tras el desacoplamiento es ilustrativa",
      "pathSm": "ilustrativo: la velocidad de deriva del módulo de servicio agotado es nuestra",
      "srcReport": "Informe de la misión Apolo 13, NASA MSC-02680, 1971 (horas de los sucesos, estados, reentrada)",
      "srcJournal": "Diario de vuelo del Apolo 13, NASA (la radio, al segundo)",
      "srcClip": "Las dos frases de radio: grabación de la NASA, dominio público, de Wikimedia Commons",
      "srcPhoto": "El compartimento 4 del módulo de servicio: fotografía AS13-59-8500 de la NASA, dominio público, de Wikimedia Commons"
    },
    "sputnik-1": {
      "title": "Sputnik 1: el primer satélite",
      "blurb": "Baikonur, 4 de octubre de 1957: el primer satélite artificial, una esfera pulida de 585 mm, de la plataforma a su primera vuelta a la Tierra, con su pitido.",
      "chPad": "Sitio 1",
      "chAscent": "Despegue",
      "chBoosters": "Los propulsores laterales",
      "chCore": "La etapa central",
      "chSep": "Se suelta el PS-1",
      "chOrbit": "Una vuelta",
      "ready": "T−10 s en el Sitio 1, Baikonur: el cohete 8K71PS y, bajo su cofia, una esfera de 585 mm. 19:28:34 UTC del 4 de octubre de 1957, ya el día 5 en el lugar de lanzamiento. La luz de la plataforma es nuestra: era una plataforma a oscuras, y el cohete se ilumina para que se vea.",
      "liftoff": "Despegue. La etapa central y los cuatro bloques laterales del R-7 arden a la vez; al cohete militar le han quitado la ojiva para esto.",
      "regulator": "Hacia los 16 s falla un regulador de combustible: la etapa central quema el queroseno demasiado rápido y su empuje va un 4 por ciento alto durante casi todo el vuelo. La misión lo supera.",
      "boosters": "T+116 s: los cuatro bloques laterales se separan, como muestra la telemetría. La etapa central sigue sola.",
      "core": "T+295.4 s: la etapa central se apaga, a 223 km de altura y unos 7.8 km/s, un segundo antes de lo previsto, cuando un sensor ve que la bomba de queroseno vacía se acelera.",
      "sep": "T+315.3 s, 19.9 s después del apagado: se suelta el PS-1. La cofia se desprende, las cuatro antenas se abren (no animadas aquí) y el transmisor se enciende.",
      "beep": "Los primeros pitidos se oyen en la estación de seguimiento IP-1 durante dos minutos, hasta que el satélite se hunde bajo el horizonte. El sonido es la grabación de la señal hecha por la NASA.",
      "shadow": "El lanzamiento fue poco después de medianoche en el lugar, y durante sus primeros 13 minutos el PS-1 vuela en la sombra de la Tierra, así que se dibuja oscuro. Entra en la luz del Sol hacia T+13 min.",
      "orbit": "Órbita: 223 por 950 km, 65.1 grados, 96.2 minutos por vuelta. La etapa central lo sigue en su vuelta (no dibujada).",
      "lap": "Una vuelta en esta repetición. Las baterías se agotaron el 26 de octubre, tras 326 órbitas; la esfera cayó el 4 de enero de 1958, tras unas 1 440.",
      "pathAscent": "las horas publicadas de los sucesos, con alturas y distancias intermedias aproximadas",
      "pathOrbit": "la órbita publicada como una cónica desde el final del lanzamiento, una vuelta; el volteo del satélite no se dibuja",
      "srcWiki": "Sputnik 1, Wikipedia (horas de los sucesos, órbita, dimensiones), a partir de la NASA, el NSSDC y las fuentes rusas que cita",
      "srcNssdc": "Sputnik 1, Catálogo maestro NSSDCA de la NASA (lanzamiento y órbita)",
      "srcClip": "El pitido: grabación de la NASA, dominio público, de Wikimedia Commons"
    },
    // 1.7.2 (public #525): Voskhod 2 and STS-1. Machine-drafted like the rest of this file (docs/TRANSLATING.md). Young's words stay as he said them.
    "voskhod-2": {
      "title": "Voskhod 2: el primer paseo espacial",
      "blurb": "Baikonur, 18 de marzo de 1965: Alexei Leonov sale de la nave por una esclusa inflable durante 12 minutos y, un día después, la tripulación aterriza a mano en la taiga, a 386 km de donde debía.",
      "chPad": "Sitio 1",
      "chAscent": "Despegue",
      "chOrbit": "Órbita",
      "chEva": "La esclusa y el paseo",
      "chBack": "El regreso al interior",
      "chFail": "Falla el aterrizaje automático",
      "chRetro": "Retrofrenado a mano",
      "chEntry": "Reentrada",
      "chLand": "La taiga",
      "ready": "T−10 s en el Sitio 1, Baikonur: el cohete Voskhod y, bajo su cofia, la Voskhod 3KD con Pavel Belyayev y Alexei Leonov. 07:00:00 UTC del 18 de marzo de 1965. El cohete dibujado es el de la Vostok-K; el real tenía una tercera etapa distinta.",
      "liftoff": "Despegue. Como en la Voskhod 1, no hay forma de abortar en los primeros minutos, hasta que se va la cofia.",
      "boosters": "T+119 s: los cuatro bloques laterales se separan.",
      "shroud": "Hacia T+2.5 minutos: se expulsa la cofia y se ve la nave por primera vez, con la esclusa Volga plegada contra su esfera.",
      "core": "T+301 s: se suelta la etapa central y la tercera etapa, el Blok I, toma el relevo durante otros 240 segundos.",
      "orbit": "Órbita: 167 por 475 km, 64.8 grados, 90.9 minutos por vuelta. Una esfera Vostok, un retrocohete de reserva encima y dos asientos de tripulación donde la Vostok tenía un asiento eyectable.",
      "volga": "Belyayev infla la esclusa Volga: unos 40 tubos de aire rigidizan un tubo de tela de 2.5 m de largo y 1.2 m de ancho en unos siete minutos. El momento en que lo hizo es nuestro; se dibuja ya desplegada, no inflándose.",
      "depress": "08:28:13 UTC: Leonov, con el traje Berkut y su mochila blanca, despresuriza la esclusa. La electrónica de la nave se enfriaba con su aire, y por eso hacía falta una esclusa.",
      "hatch": "08:32:54: se abre la escotilla exterior de la esclusa.",
      "out": "08:34:51: Leonov sale de la esclusa, alto sobre el norte-centro de África, y se empuja hasta el extremo de su cordón umbilical de 5.35 m. La primera persona en el espacio fuera de una nave.",
      "tether": "Fija una cámara en el borde de la esclusa y mira desde el estrecho de Gibraltar hasta el mar Caspio. Su pose aquí se lee de un fotograma de la película.",
      "swell": "Su traje se ha hinchado en el vacío: no alcanza el obturador de la cámara del pecho en la pierna, y los guantes y las botas se han endurecido. Para volver a entrar tendrá que soltar aire del traje.",
      "back": "Entra de cabeza, en contra del procedimiento, y se queda atravesado en el tubo al girar para cerrar la escotilla exterior. Deja que la presión del traje baje por debajo del límite de seguridad para poder doblarse.",
      "inside": "08:47:00: de vuelta en la esclusa; la escotilla se cierra a las 08:48:40. 12 minutos 9 segundos fuera, desde el norte-centro de África hasta el este de Siberia.",
      "repress": "08:51:54: se represuriza la esclusa. Un poco después Belyayev dispara los pernos y se suelta la esclusa (el momento es nuestro).",
      "jettison": "La Volga se suelta y se aleja dando vueltas; la nave no puede usarla otra vez.",
      "auto": "En la revolución 16 el sistema de aterrizaje automático se programa desde tierra, pero su orden «6» no llega, al parecer por un fallo del sistema de orientación al Sol. La quema prevista hacia ahora (su reloj es nuestro, aproximado) no ocurre.",
      "manual": "07:16 UTC, 19 de marzo: Vjezna-3 dice a la tripulación por onda corta que apaguen el sistema automático y usen el descenso manual. Belyayev tiene otra revolución para prepararse.",
      "late": "Los dos hombres, con los trajes puestos, no pueden volver a sus asientos una vez que Belyayev ha girado la nave a mano con el visor óptico Vzor. El retrofrenado llega 46 segundos tarde.",
      "retro": "Retrofrenado a mano con el motor KTDU-60. Su hora y su lugar son nuestros: fue unos 45 minutos antes del aterrizaje publicado, y las fuentes no lo dicen.",
      "wires": "El módulo de instrumentos no se separa bien; la esfera gira con violencia hasta que los cables se queman hacia los 100 km. (Dibujado separado en la reentrada, un poco pronto.)",
      "entry": "Reentrada. Los 46 segundos llevan la nave unos 386 km más allá de su campo, al bosque de las tierras altas del Alto Kama, al noreste de Perm.",
      "chutes": "Los paracaídas. A diferencia de la Vostok, nadie se eyecta: la tripulación aterriza dentro de la esfera, con un cohete sólido que se enciende a unos un metro para suavizar el impacto (no dibujado).",
      "landing": "09:02:17 UTC: tocan tierra hacia 59.57 N 55.47 E, en nieve profunda en la taiga, a 75 km de Perm.",
      "taiga": "Los pilotos de los helicópteros de búsqueda encuentran el paracaídas rojo solo horas después. La tripulación pasa dos noches en el bosque a unos −5 °C y más frío antes de esquiar hasta un helicóptero.",
      "pathAscent": "las horas publicadas de los sucesos, con alturas y distancias intermedias aproximadas",
      "pathOrbit": "la órbita publicada, con la deriva de un día, el retrofrenado a una hora y un lugar que son nuestros, y la reentrada y el dosel dibujados entre medias",
      "srcWiki": "Voskhod 2, Wikipedia (las horas del paseo espacial, la órbita, el aterrizaje)",
      "srcRocket": "Voskhod (cohete), Wikipedia (las horas de quema de las tres etapas)",
      "srcGrahn": "Sven Grahn, «The Voskhod 2 mission revisited» (el fallo del descenso automático, la llamada al manual, citando el diario del general Kamanin)",
      "srcNssdc": "Voskhod 2, Catálogo maestro NSSDCA de la NASA (lanzamiento y órbita)"
    },
    "sts-1": {
      "title": "STS-1: el primer vuelo del Columbia",
      "blurb": "Kennedy, 12 de abril de 1981: John Young y Robert Crippen llevan el primer transbordador espacial del Complejo de Lanzamiento 39A a órbita y, 54 horas después, lo hacen planear hasta el lecho seco de Edwards.",
      "chPad": "Complejo de Lanzamiento 39A",
      "chAscent": "Despegue",
      "chSrb": "Los propulsores",
      "chMeco": "Motores principales apagados",
      "chOrbit": "Órbita",
      "chHome": "El camino de vuelta",
      "chEntry": "Reentrada",
      "chLand": "Pista 23",
      "ready": "T−10 s en el Complejo de Lanzamiento 39A, Centro Espacial Kennedy: el Columbia, un tanque externo blanco y dos propulsores de combustible sólido. 12:00:04 UTC del 12 de abril de 1981, veinte años justos después de la Vostok 1. El STS-1 y el STS-2 volaron el tanque pintado de blanco.",
      "ignition": "T−6.6 s: se encienden los tres motores principales y todo el conjunto se balancea hacia delante, hacia los pies de la tripulación, y vuelve atrás.",
      "liftoff": "Despegue: los propulsores se encienden al volver el conjunto a la vertical. Crippen lo comparó con una catapulta de vapor. La plataforma se dibuja llana y la zanja de llamas es nuestra.",
      "roll": "Libre de la torre, el conjunto gira a su rumbo, 067 grados, y se inclina cabeza abajo, el orbitador bajo el tanque, para ahorrar las alas. (Dibujado ya en el rumbo.)",
      "maxq": "T+56 s: Max Q, a Mach 1.06 y 29 kPa. Los motores principales se han reducido al 65 por ciento para atravesarla.",
      "srb": "T+2 min 12 s: los propulsores, que rindieron mejor de lo esperado, se sueltan a 53 km, 2.8 km más alto de lo planeado. Caen al Atlántico con paracaídas.",
      "meco": "T+8 min 34 s: apagado de los motores principales a 118 km.",
      "tank": "18 segundos después se suelta el tanque externo. Se rompe en el aire y cae en el océano Índico.",
      "oms1": "T+10 min 34 s: la primera quema del OMS, 86 segundos, con los dos motores de las góndolas de cola del orbitador (no dibujada: la llama es casi invisible).",
      "oms2": "T+44 min 2 s: la segunda quema, 75 segundos, en lo alto del ascenso: 246 por 248 km, 40.3 grados, 89.9 minutos. La hora del apogeo es la del informe; la trayectoria hasta él es nuestra.",
      "doors": "Se abren las puertas de la bahía de carga para que trabajen los radiadores; antes del final de la segunda órbita, o la tripulación habría tenido que volver. La hora es nuestra. En la televisión ven azulejos perdidos de las góndolas del OMS.",
      "oms3": "T+6 h 20 min 46 s y 7 h 05 min 32 s: dos quemas de un solo motor suben la órbita a 274 km. La tripulación pasa unas 53 horas en órbita probando la máquina.",
      "wake": "Día 3: desayuno, guardar, los trajes de eyección y las puertas de la bahía cerradas para la reentrada. Young y Crippen se abrochan. Su órbita ha dado 35 vueltas.",
      "deorbit": "En la órbita 36, sobre el sur del océano Índico, una quema de 160 segundos de ambos motores OMS. Su hora y su lugar son nuestros, unos 55 minutos antes del campo. Young inclina el Columbia a la actitud de reentrada con el morro alto.",
      "entry": "Interfaz de reentrada a 120 km, a unos 8 110 km del campo a 28 240 km/h. El ángulo de ataque es de 40 grados hasta que pasa lo peor del calor. Esta reconstrucción pone la interfaz sobre el Pacífico occidental; el informe dice el oriental.",
      "blackout": "Un resplandor rosa a 100 km; los dos bajan las viseras. Unos 21 minutos sin radio, 16 de ellos por el aire ionizado. La mayor parte de la reentrada la vuelan los ordenadores, con inversiones de alabeo a Mach 18.5 y 9.8.",
      "bigsur": "La costa de California cerca de Big Sur a Mach 7 y 41 km. El Columbia ha volado 583 km a través de la traza de su órbita para llegar al campo, que se dibuja.",
      "hac": "Young toma los mandos. Hechas las inversiones a Mach 4.8 y 2.8, un amplio giro a la izquierda hacia la pista 23 del lecho seco, con un T-38 de persecución. El tamaño del giro es nuestro.",
      "touch": "T+54 h 20 m 53 s, 18:20:57 UTC: el tren principal toca a 339 km/h, más lento y unos 800 m más adelante en la pista de lo planeado, en Edwards, pista 23. La bajada del tren se dibuja unos segundos antes.",
      "stop": "Young: «This is the world's greatest all-electric flying machine. I'll tell you that. That was super!» 36 órbitas, 1 729 348 km, 2 días 6 horas 20 minutos 53 segundos.",
      "pathAscent": "las horas y alturas publicadas de los sucesos, con las distancias entre ellas aproximadas",
      "pathOrbit": "las quemas y órbitas publicadas unidas por arcos, la quema de desorbitación, la reentrada y la aproximación dibujadas entre medias; las horas y los lugares que elegimos se dicen en los pies de foto",
      "srcWiki": "STS-1, Wikipedia (horas y alturas de los sucesos, las órbitas, las quemas, la reentrada y el aterrizaje), a partir de los documentos de la misión de la NASA",
      "srcNssdc": "STS-1 Columbia, Catálogo maestro NSSDCA de la NASA (lanzamiento y aterrizaje)"
    },
    "hubble-deployment": {
      "title": "La suelta del Hubble desde el Discovery",
      "blurb": "STS-31, 25 de abril de 1990: el brazo saca el telescopio espacial Hubble de la bodega del Discovery, sus paneles solares se despliegan (uno se detiene), sus antenas se abren y a las 19:38 UTC Steven Hawley lo suelta.",
      "chBay": "En la bodega",
      "chLift": "Fuera de la bodega",
      "chArrays": "Los paneles",
      "chStop": "Uno se detiene",
      "chAntennas": "Las antenas",
      "chSwing": "Hacia el punto de suelta",
      "chRelease": "Suelta",
      "chAway": "Alejándose",
      "ready": "Día de vuelo 2, 25 de abril de 1990, a 613 km de altura. La bodega del Discovery está abierta y el telescopio espacial Hubble, de 13.2 m de largo, descansa en su soporte. Dónde está el transbordador sobre la Tierra, y todos los relojes de aquí salvo el de la suelta, son nuestros: las fuentes dan la hora de la suelta y poco más.",
      "grapple": "El efector final del brazo cierra su lazo sobre el punto de agarre junto a uno de los accionamientos de antena del telescopio. Steven Hawley maneja el brazo desde la cubierta de vuelo trasera. Las articulaciones del brazo se dibujan como un brazo de dos tramos que llega a cada lugar; no son telemetría.",
      "umbilical": "El telescopio pasa a su propia energía y se corta la alimentación del transbordador (NASA). Los cierres que lo sujetaban en la bodega, dos en los bordes y uno en el suelo, son nuestros en su forma y en su hora.",
      "unberth": "El brazo levanta el telescopio en vertical, fuera de su soporte. El reloj y la altura son nuestros.",
      "arrays": "Los paneles solares, enrollados en tambores y plegados a lo largo del tubo durante el lanzamiento, se despliegan hacia los lados. Cómo estaban guardados se dibuja a partir de fotografías, no de planos. Estos primeros paneles, amarillo dorado, se sustituyeron en 1993.",
      "unroll": "El primer panel se desenrolla a lo largo de sus brazos hasta unos 7 m por 2.5 m. Cuánto tardó es nuestro.",
      "stop": "El segundo panel sale a medias y se detiene. McCandless y Sullivan esperan en la esclusa parcialmente despresurizada por si hace falta un paseo espacial para liberarlo. Cuál de los paneles fue se cuenta de dos maneras; el que se dibuja lo hemos elegido nosotros.",
      "wait": "Los controladores lo intentan una y otra vez, y la órbita entra en la sombra de la Tierra y sale de ella. La suelta, prevista para la órbita 19, se retrasa una órbita. Cuánto tardó, y cuándo, es nuestro.",
      "free": "El último intento desde tierra funciona y el panel se desenrolla del todo; el paseo espacial no hace falta. La hora es nuestra.",
      "antennas": "Los dos brazos de las antenas de alta ganancia saltan hacia abajo y hacia fuera, y sus platos quedan libres. Cómo estaban plegados, y cuándo, es nuestro.",
      "swing": "El brazo gira el telescopio hasta la posición de suelta, sobre la bodega. La ruta es nuestra.",
      "readyRelease": "Los sistemas de apuntado del Hubble se encienden y se prueban con el brazo aún sujetándolo. Cada sistema se comprueba antes de que el brazo lo suelte (NASA).",
      "release": "19:38 UTC, 25 de abril de 1990, 31 horas 4 minutos después del despegue: Hawley abre el lazo y el Hubble queda libre. Jonathan's Space Report da las 19:38; America Space dice las 3:37 p.m. EDT.",
      "away": "El telescopio queda donde lo han puesto y el Discovery se aparta. America Space cuenta que en la cubierta de vuelo gritaron pidiendo una cámara. El brazo se retira.",
      "pulses": "El Discovery enciende dos veces sus propulsores para subir un poco su órbita, de modo que se queda atrás con regularidad. Las horas y el tamaño de los impulsos son nuestros.",
      "trail": "El Discovery se queda cerca del Hubble unos dos días por precaución (NASA); el plan era seguirlo a unas 40 millas náuticas por si la puerta de la abertura daba problemas.",
      "pathOrbit": "un círculo de 613 km a 28.45 grados, como está publicado; el lugar a lo largo de él lo hemos elegido nosotros para que esté a la luz del sol",
      "pathHst": "el telescopio desde la suelta, en la órbita en la que fue soltado",
      "srcNasa": "STS-31, página del archivo del transbordador espacial de la NASA (hora de lanzamiento, órbita)",
      "srcKit": "Dossier de prensa de STS-31, NASA (el plan de despliegue, las tareas de la tripulación, la órbita 19, el seguimiento)",
      "srcJsr": "Jonathan's Space Report n.º 36 (suelta a las 19:38 UTC, el retraso de una órbita, el panel que no se abría)",
      "srcAmerica": "America Space, «Somebody Get a Camera» (los paneles, las antenas, los impulsos de los propulsores, 3:37 p.m. EDT)"
    },
    "falcon9-og2-2": {
      "title": "El primer aterrizaje de un Falcon 9",
      "blurb": "Cabo Cañaveral, 21 de diciembre de 2015: el vuelo 20 del Falcon 9 lanza 11 satélites de ORBCOMM y su primera etapa vuelve a Landing Zone 1, el primer aterrizaje de la primera etapa de un cohete orbital.",
      "chPad": "Complejo de Lanzamiento 40",
      "chAscent": "Despegue",
      "chSep": "Apagado y separación",
      "chReturn": "Boostback",
      "chEntry": "El camino de bajada",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 s, Space Launch Complex 40, Cabo Cañaveral, 8:29 p.m. del 21 de diciembre de 2015: un Falcon 9 Full Thrust, de 70 m de alto, en su primer vuelo, con 11 satélites de ORBCOMM. Es de noche; el cohete se dibuja con la luz de una lámpara nuestra. SpaceX llama al aterrizaje «un objetivo secundario de la prueba».",
      "ignition": "T−3 s: arrancan los nueve motores Merlin de la primera etapa.",
      "liftoff": "Despegue a las 01:29:00 UTC del 22 de diciembre. La primera etapa son 41 m de los 70.",
      "mach1": "T+1:05: Mach 1, según la reconstrucción de la retransmisión.",
      "maxq": "T+1:13: max Q, el momento en que el aire aprieta con más fuerza; los motores se redujeron para pasarlo.",
      "meco": "T+2:23: apagado de los motores principales a 75 km y 1.67 km/s (la reconstrucción de la retransmisión; SpaceX había previsto T+2:20).",
      "sep": "T+2:25: las etapas se separan. La primera etapa gira con la cola por delante con sus propulsores de gas frío, algo que se dibuja a lo largo de medio minuto; cuánto tardó es nuestro.",
      "s2": "T+2:34: el motor de vacío de la segunda etapa se enciende y se aleja. Su trayectoria se dibuja solo un trecho, y es nuestra.",
      "fairing": "T+2:48: se sueltan las dos mitades de la cofia, de 5.2 m de ancho.",
      "boostback": "T+3:47: tres motores de la primera etapa se encienden para la quema de boostback, que vuelve su trayectoria hacia el Cabo. Cuánto arden es nuestro: unos 35 segundos en este dibujo.",
      "fins": "Las cuatro aletas reticuladas se abren para guiar la etapa por el aire. Cuándo lo hicieron es nuestro.",
      "coast": "La etapa avanza por inercia sobre la cima, a unos 190 km de altura en este dibujo (nuestro), y empieza a bajar.",
      "entry": "T+8:01: tres motores se encienden otra vez para la quema de entrada, que frena la etapa antes del aire denso.",
      "entryEnd": "T+8:21: termina la quema de entrada. Cayendo por el aire, la etapa se guía con sus aletas.",
      "landingBurn": "T+9:11: un motor se enciende para la quema de aterrizaje, que ha de detener la etapa sobre la plataforma. Dura 33 segundos.",
      "legs": "Las cuatro patas de aterrizaje, plegadas a lo largo del costado durante el vuelo, se abren hacia abajo unos segundos antes del contacto. Cuándo lo hacen es nuestro.",
      "touch": "T+9:44, 01:38:44 UTC: la primera etapa se posa en Landing Zone 1, una plataforma circular de 86 m de ancho con una cruz, a unos 9 km al sur de la plataforma de la que salió. Ninguna primera etapa de un cohete orbital había aterrizado antes.",
      "sats": "Mientras tanto la segunda etapa despliega los 11 satélites, de T+14:26 a T+19:05 (no dibujado), y luego vuelve a encender su motor para demostrar que puede, de cara a un vuelo futuro.",
      "pathAscent": "las horas publicadas de los sucesos, y la altura y la velocidad publicadas en el apagado de los motores principales, con el ascenso entre ellas nuestro; el cohete voló en la oscuridad y se dibuja iluminado por una lámpara",
      "pathBooster": "las horas publicadas de las quemas y el lugar de aterrizaje, con el arco, sus velocidades y la duración del boostback calculados por nosotros como un punto de masa; dibujado iluminado por una lámpara",
      "pathStage2": "la segunda etapa desde la separación, empujada por nosotros en la dirección que llevaba; se detiene donde acaba el dibujo",
      "srcKit": "SpaceX, dossier de prensa de la misión ORBCOMM-2, 21 de diciembre de 2015 (el plan: las horas, las quemas, el aterrizaje como objetivo secundario de la prueba)",
      "srcRecon": "Spaceflight101, «Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites» (las horas de los sucesos según la retransmisión, MECO a 75 km y 1.67 km/s)",
      "srcWiki": "Falcon 9 flight 20, Wikipedia (la hora de lanzamiento, la carga, el reencendido de la segunda etapa)",
      "srcLz": "Landing Zones 1 and 2, Wikipedia (el lugar, y las plataformas de 282 ft marcadas con una X)"
    }
  }
});

// 1.6.3 (internal #995): the sections and strings this file did not have yet (r13Deep, compare, passportKinds, photoCompare, entrances,
// the 1.5 strings and the gaps in card, drawing, cls, templates and the rest), es. Machine-drafted like the rest of this file (docs/TRANSLATING.md):
// drafted by a program from the English, NOT read by a native speaker. A key this file already has is left as it is.
{
  const topUp = (dst, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') topUp(dst[k], src[k]);
      else if (!(k in dst)) dst[k] = src[k];
    }
  };
  topUp(COPY, {
    "a45": {
      "farNote": "a qué distancia está ahora ({how}), según su corrimiento al rojo de {z} en la cosmología de Planck 2018",
      "comoving": "distancia comóvil",
      "pulsarDistance": [
        "del propio paralaje del púlsar",
        "la distancia del cúmulo globular, del remanente de supernova o del otro objeto al que pertenece",
        "una estimación de un modelo a partir de la señal de radio (el modelo YMW16 de los electrones libres de la Galaxia), no una medición: puede errar bastante"
      ],
      "shape": {
        "galaxy": "una marca a la distancia que da su corrimiento al rojo; una galaxia tan lejana mide como mucho unos pocos píxeles, así que su forma no se dibuja",
        "browndwarf": "un anillo a su distancia medida; una enana marrón es un punto a esta escala y casi no da luz visible",
        "whitedwarf": "un anillo a su distancia medida; la propia enana blanca es un punto a esta escala",
        "cluster": "una marca en el centro del cúmulo en rayos X; las galaxias miembro se dibujan solo para Virgo, Coma, Fornax y Perseus (la etapa del Grupo Local)"
      },
      "quasarZ7": "Un cuásar visto como era unos {age} millones de años después del Big Bang: uno de los {n} conocidos más allá del corrimiento al rojo 7.",
      "unplaced": {
        "unnamed": "Estrella HYG {id}",
        "lead": "{name} es una estrella en la dirección en la que miras; nadie ha medido a qué distancia está",
        "leadColour": "{name} es {a} estrella {colour} en la dirección en la que miras; nadie ha medido a qué distancia está",
        "note": "Dibujada en el cielo y en ningún lugar del espacio, porque un lugar necesita una distancia.",
        "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): solo dirección y magnitud"
      }
    },
    "r13Deep": {
      "card": {
        "dso-tarantula-nebula": "Su luz cerca de nuestra línea de visión es la fotografía de Webb; su gas es un modelo de una cavidad alrededor del cúmulo R136, dentro de una envoltura de gas brillante contenida por nubes moleculares, según Pellegrini, Baldwin y Ferland (2011). Aún no revisado por un astrónomo.",
        "dso-m43": "Su luz está tomada de la fotografía de ESO y su forma está reconstruida como un hueco más pequeño en la misma nube oscura que la Nebulosa de Orión, iluminado por la estrella NU Orionis. Aún no revisado por un astrónomo.",
        "dso-m51": "Construida a partir de su inclinación y estructura publicadas: una espiral de dos brazos vista casi de frente, su compañera NGC 5195 detrás del extremo de su brazo norte y el brazo que llega hasta ella; las profundidades son un modelo. Aún no revisado por un astrónomo.",
        "dso-m81": "Construida a partir de su inclinación y estructura publicadas: un bulbo grande y viejo y dos brazos muy apretados con polvo en su borde interior. Aún no revisado por un astrónomo.",
        "dso-m101": "Construida a partir de su inclinación y estructura publicadas: un disco grande visto casi de frente, con muchos brazos y sus gigantescas regiones de formación de estrellas donde las pone el cielo. Aún no revisado por un astrónomo.",
        "dso-m104": "Construida a partir de su inclinación y estructura publicadas: un enorme bulbo redondo y un disco fino visto casi de canto, con su anillo de polvo por delante. Aún no revisado por un astrónomo.",
        "dso-antennae-galaxies": "Dos galaxias que chocan, donde las pone el cielo, y sus dos colas de marea; lo lejos o cerca que está cada parte es un modelo, según las simulaciones de la colisión. Aún no revisado por un astrónomo.",
        "dso-m83": "Construida a partir de su inclinación y estructura publicadas: una espiral barrada vista casi de frente, con brazos ricos en estrellas jóvenes e hidrógeno brillante. Aún no revisado por un astrónomo.",
        "dso-ngc-1300": "Construida a partir de su estructura publicada: una barra larga con bandas de polvo en sus bordes delanteros y dos brazos que salen de sus extremos, con su forma ajustada a la fotografía de Hubble. Aún no revisado por un astrónomo.",
        "dso-centaurus-a": "Construida a partir de números publicados: una galaxia elíptica gigante cruzada por un disco deformado de polvo y estrellas jóvenes, según un modelo ajustado a las imágenes de Spitzer; sus dos chorros se dibujan en falso color, porque brillan en rayos X y en ondas de radio, no en luz visible. Aún no revisado por un astrónomo."
      }
    },
    "compare": {
      "row": "Comparar",
      "hint": "a escala",
      "missing": "—",
      "none": "Ninguno",
      "yes": "Sí",
      "no": "No",
      "range": "{a} a {b}",
      "numUnit": "{num} {unit}",
      "modeLabel": "Vista",
      "modes": {
        "pair": "Lado a lado",
        "lab": "Todos los mundos"
      },
      "withLabel": "Comparar con",
      "scaleLabel": "Escala",
      "scales": {
        "true": "A escala",
        "same": "Mismo ancho"
      },
      "propLabel": "Ordenar todos los mundos por",
      "props": {
        "across": "Anchura",
        "mass": "Masa",
        "gravity": "Gravedad",
        "temp": "Temperatura",
        "spin": "Duración de un giro",
        "year": "Duración de un año",
        "dist": "Distancia al Sol",
        "moons": "Número de lunas"
      },
      "names": {
        "sun": "El Sol",
        "mercury": "Mercurio",
        "venus": "Venus",
        "earth": "Tierra",
        "moon": "La Luna",
        "mars": "Marte",
        "jupiter": "Júpiter",
        "saturn": "Saturno",
        "uranus": "Urano",
        "neptune": "Neptuno",
        "pluto": "Plutón"
      },
      "the": {
        "sun": "el Sol",
        "moon": "la Luna"
      },
      "wider": "{big} es {n} veces más ancho que {small}.",
      "same": "{a} y {b} tienen más o menos el mismo ancho.",
      "figure": "{a} y {b}, dibujados {how}.",
      "figureTrue": "a una sola escala",
      "figureSame": "con el mismo ancho, sin escala",
      "tableLabel": "{a} junto a {b}",
      "rows": {
        "across": "Diámetro",
        "mass": "Masa",
        "gravity": "Gravedad",
        "temp": "Temperatura",
        "spin": "Un giro dura",
        "year": "Un año allí",
        "dist": "Desde el Sol",
        "air": "Atmósfera",
        "pressure": "Presión del aire",
        "moons": "Lunas",
        "rings": "Anillos"
      },
      "units": {
        "km": "km",
        "earthOne": "Tierra",
        "earths": "Tierras",
        "g": "m/s²",
        "c": "°C",
        "hours": "horas",
        "days": "días",
        "years": "años",
        "au": "UA",
        "bar": "bar",
        "microbar": "µbar"
      },
      "notes": {
        "average": "media",
        "flattened": "de media; está achatado",
        "range": "su intervalo",
        "bar1": "al nivel de 1 bar",
        "edge": "en el borde visible",
        "photosphere": "la superficie visible",
        "retro": "gira hacia atrás",
        "sunSpin": "a 16° de latitud",
        "withEarth": "con la Tierra",
        "exosphere": "una exosfera tenue",
        "photosphereAir": "en la fotosfera"
      },
      "air": {
        "part": "{share}% {gas}",
        "join": ", ",
        "almostNone": "Casi ninguna",
        "noSurface": "Sin superficie"
      },
      "gas": {
        "hydrogen": "hidrógeno",
        "helium": "helio",
        "methane": "metano",
        "nitrogen": "nitrógeno",
        "oxygen": "oxígeno",
        "argon": "argón",
        "carbon dioxide": "dióxido de carbono"
      },
      "source": "Hojas de datos planetarios de la NASA, leídas el {date}.",
      "giantNote": "Un gigante no tiene superficie: su gravedad y su temperatura son las del nivel de 1 bar.",
      "moonsNote": "El número de lunas crece a medida que se confirman otras nuevas.",
      "spinNote": "El giro del Sol es el valor de la hoja a 16° de latitud.",
      "drawnTrue": "Dibujados a una sola escala a partir del radio medio de cada uno; no son fotografías.",
      "drawnSame": "Mismo ancho, así que no están a escala. Los anillos conservan su parte proporcional.",
      "tiny": "{name} mide menos de un píxel aquí y se dibuja como un punto.",
      "ringsDrawn": "Los anillos se inclinan para el dibujo; sus radios son los de la NASA.",
      "labLog": "Las barras son logarítmicas, para que los valores pequeños se sigan viendo.",
      "labLinear": "Las barras son proporcionales a la cantidad.",
      "labTitle": "Comparar con {name}",
      "thisCard": "El mundo de esta ficha"
    },
    "passportKinds": {
      "kindsTitle": "Abiertos, por tipo",
      "noKinds": "Aún no hay nada que contar por tipo.",
      "kinds": {
        "worlds": "Planetas, lunas y el Sol",
        "stations": "Estaciones espaciales",
        "satellites": "Satélites y sus cohetes",
        "spacecraft": "Sondas y telescopios espaciales",
        "small": "Cometas y asteroides",
        "stars": "Estrellas",
        "exoplanets": "Planetas de otras estrellas",
        "deep": "Nebulosas, galaxias y el cielo profundo",
        "earth": "Lugares y tiempo en la Tierra"
      },
      "notedTitle": "Anotado",
      "noNoted": "Aún no hay nada anotado. Abre un lugar en el mapa.",
      "notedFine": "El día en que se vio por primera vez que una nota se cumplía en este navegador. Se guarda aquí, nunca se clasifica ni se envía.",
      "noted": {
        "first": {
          "name": "Un primer lugar",
          "said": "Abriste un lugar en el mapa."
        },
        "planets": {
          "name": "Los ocho planetas",
          "said": "Abriste todos los planetas, de Mercurio a Neptuno."
        },
        "station": {
          "name": "Una estación espacial",
          "said": "Abriste una estación en órbita."
        },
        "craft": {
          "name": "Una nave allá fuera",
          "said": "Abriste una sonda o un telescopio espacial."
        },
        "small": {
          "name": "Un cometa o un asteroide",
          "said": "Abriste un cuerpo pequeño del Sistema Solar."
        },
        "star": {
          "name": "Una estrella",
          "said": "Abriste una estrella más allá del Sol."
        },
        "exoplanet": {
          "name": "El planeta de otra estrella",
          "said": "Abriste un planeta que gira alrededor de otra estrella."
        },
        "deep": {
          "name": "El cielo profundo",
          "said": "Abriste una nebulosa, una galaxia o un cúmulo."
        },
        "trip": {
          "name": "Un viaje hasta el final",
          "said": "Terminaste un viaje guiado."
        },
        "eyes": {
          "name": "Visto con tus propios ojos",
          "said": "Marcaste algo como visto."
        },
        "every": {
          "name": "Uno de cada tipo",
          "said": "Abriste al menos una cosa de cada tipo de arriba."
        }
      }
    },
    "photoCompare": {
      "title": "Comparar con la fotografía",
      "reconstruction": "Reconstrucción",
      "photograph": "Fotografía",
      "valueText": "{n}% fotografía",
      "flying": "Yendo al punto desde el que se tomó la fotografía.",
      "note": "El mapa dibuja un modelo 3D. La fotografía se muestra solo aquí: plana y de cara al Sol, así que si te giras se desvanece."
    },
    "entrances": {
      "label": "Tres formas de entrar",
      "tonight": "Esta noche",
      "tonightTitle": "Qué hay sobre ti esta noche, desde tu lugar",
      "explore": "Explorar",
      "exploreTitle": "Mira todo el mapa",
      "trip": "Viaje guiado",
      "tripTitle": "Empieza el primer viaje guiado de la lista"
    }
  });
}
// 1.6.3: end

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "Tamaño y distancia",
    "size": "Tamaño",
    "sizeTrue": "real",
    "sizeValue": "×{n}",
    "sizeTitle": "Cuánto más grandes que en la realidad se dibujan los mundos, de real a ×{max}",
    "dist": "Distancia",
    "distTrue": "real",
    "distLog": "logarítmica",
    "distSome": "{p}% del camino a logarítmica",
    "distTitle": "Cuánto se comprimen las distancias al Sol, de real a logarítmica. Las direcciones siguen siendo medidas.",
    "presets": "Vistas listas",
    "presetTrue": "Escala real",
    "presetTrueTitle": "Cada mundo con su tamaño real y a su distancia real",
    "presetClass": "En clase",
    "presetClassTitle": "Mundos ×{n} y distancias logarítmicas, como en un planetario mecánico",
    "held": "Un viaje lo dibuja todo a escala real. Los controles vuelven cuando termina.",
    "note": "La posición de cada mundo en el cielo siempre es medida. La etiqueta dice cuánto más grande se dibuja.",
    "noteSize": "{name} se dibuja ×{n} más grande de lo que es, por el control Tamaño.",
    "noteDist": "Se dibuja a {drawn} UA del Sol, aunque está a {au} UA, en su dirección real (el control Distancia).",
    "noteMoon": "Se dibuja {n} veces más lejos de {parent} de lo que está, en su dirección real, para que quede fuera del planeta agrandado.",
    "noteSun": "El Sol se dibuja ×{n} más grande de lo que es, por el control Tamaño, y se mantiene apartado de Mercurio.",
    "badgeSun": "Sol ×{n}",
    "badgeLog": "distancias log.",
    "badgeSome": "distancias {p}% a log.",
    "badgeJoin": " · ",
    "badgeTitle": "Los controles Tamaño y Distancia de la pestaña Planetas dibujan esta vista."
  },
  "cutaway": {
    "button": "Mirar dentro",
    "buttonTitle": "Abre {name} hasta sus capas, a las profundidades que dan las mediciones",
    "title": "Interior: {name}",
    "close": "Cerrar el corte",
    "model": "Capas según {model}.",
    "source": "Fuente",
    "layers": "Capas, de la superficie hacia abajo",
    "depthRange": "{top}–{bottom} km",
    "toCentre": "{top} km hasta el centro",
    "cls": {
      "measured": "medido",
      "modelled": "modelado",
      "inferred": "deducido"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "Profundidad",
    "probeTitle": "Desliza desde la superficie hasta el centro",
    "depth": "{km} km de profundidad",
    "atCentre": "el centro",
    "layer": "Capa",
    "pressure": "Presión",
    "temperature": "Temperatura",
    "density": "Densidad",
    "valueCls": "{value} ({cls})",
    "note": "Las profundidades son las de las fuentes; los colores son elegidos. Entre la parte de arriba y la de abajo de una capa, la sonda da valores intermedios.",
    "unknown": "Todavía no hay un corte de ese mundo.",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} millones de GPa",
      "k": "{n} K",
      "millionK": "{n} millones de K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "Corteza",
      "mantle": "Manto",
      "upper-mantle": "Manto superior",
      "lower-mantle": "Manto inferior",
      "outer-core": "Núcleo externo líquido",
      "inner-core": "Núcleo interno sólido",
      "liquid-core": "Núcleo líquido",
      "iron-core": "Núcleo de hierro",
      "molten-silicate": "Capa de roca fundida",
      "partial-melt": "Capa parcialmente fundida",
      "ice-shell": "Capa de hielo",
      "ocean": "Océano",
      "hp-ice": "Hielo de alta presión",
      "rock-mantle": "Manto rocoso",
      "rock-core": "Núcleo rocoso",
      "hydrated-core": "Núcleo de roca y hielo",
      "molecular": "Hidrógeno y helio",
      "metallic": "Hidrógeno metálico",
      "dilute-core": "Núcleo diluido",
      "ice-mantle": "Agua, amoníaco y metano",
      "convective": "Zona convectiva",
      "radiative": "Zona radiativa",
      "solar-core": "Núcleo"
    }
  },
  "helio": {
    "chip": "Heliosfera · modelada",
    "chipTitle": "En qué se basa el dibujo de la burbuja que rodea el sistema solar",
    "legendTitle": "La heliosfera",
    "rowTs": "Choque de terminación, donde el viento solar baja de la velocidad del sonido. Forma modelada que pasa por los dos cruces: Voyager 1 a {a} UA, Voyager 2 a {b} UA (medidos).",
    "rowHp": "Heliopausa, donde el viento del Sol se encuentra con el gas interestelar. Forma modelada (Parker 1961) que pasa por los cruces: Voyager 1 a {a} UA, Voyager 2 a {b} UA (medidos).",
    "rowBow": "Onda de proa, donde el gas interestelar se amontona por delante. Ilustrativa: al doble de la distancia de la heliopausa (McComas et al. 2012).",
    "rowRibbon": "Cinta de IBEX, una banda brillante que IBEX midió en el cielo (Funsten et al. 2013). Su distancia no está medida: se dibuja a {au} UA.",
    "rowMotion": "El camino del Sol a través del gas interestelar local, {v} km/s (IBEX, McComas et al. 2015). La flecha son {years} años de ese camino, {au} UA.",
    "sources": "Lugares de los cruces según las trayectorias de las Voyager en JPL Horizons, en las fechas de cruce de la NASA. Formas: Parker 1961, Wilkin 1996, siguiendo a Izmodenov & Alexashov 2015 y Opher et al. 2015.",
    "crossing": "{craft}: {surface}, {au} UA, {date}",
    "motion": "El camino del Sol, {v} km/s",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "choque de terminación",
      "hp": "heliopausa"
    },
    "surfaceLabel": {
      "ts": "Choque de terminación (modelado)",
      "hp": "Heliopausa (modelada)",
      "bow": "Onda de proa (ilustrativa)",
      "ribbon": "Cinta de IBEX (medida en el cielo)"
    },
    "date": "{d} {m} {y}",
    "months": [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic"
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  orbit: "Un camino alrededor de algo, sostenido por la gravedad. Si vas lo bastante rápido de lado, sigues cayendo al lado de la Tierra en lugar de caer sobre ella.",
  "low Earth orbit": "La capa concurrida de unos 200 a 2 000 km de altura. Aquí están la estación, la mayoría de los satélites y la mayor parte de la basura.",
  geostationary: "Una órbita a 35 786 km de altura en la que una vuelta dura lo que tarda la Tierra en girar una vez, 23 horas y 56 minutos. Por eso el satélite parece colgar sobre un punto.",
  "polar orbit": "Una órbita sobre los polos. La Tierra gira debajo, así que el satélite acaba viendo todas sus partes.",
  elements: "Seis números y una fecha que describen una órbita. Con las matemáticas adecuadas dan una posición.",
  epoch: "El momento en que un conjunto de elementos orbitales era cierto. Cuanto más lejos estás de él, menos exacta es la respuesta.",
  apogee: "El punto más alto de una órbita alrededor de la Tierra.",
  perigee: "El punto más bajo de una órbita alrededor de la Tierra.",
  perihelion: "El punto en que algo que orbita el Sol se acerca más a él.",
  inclination: "Cuánto está inclinada una órbita respecto al ecuador. Noventa grados pasa sobre los polos.",
  propagated: "Calculado hacia delante a partir de una medición más antigua. No es una observación reciente, y se desvía.",
  "lunar distance": "La distancia de la Tierra a la Luna, unos 384 000 km. Una regla práctica para los pasos de asteroides.",
  "astronomical unit": "La distancia de la Tierra al Sol, unos 150 millones de km.",
  "light-time": "Lo que tarda la luz en cruzar una distancia. También es lo que tarda un mensaje de radio.",
  "light-year": "La distancia que recorre la luz en un año juliano, unos 9.46 billones de km. Una regla para los huecos entre estrellas.",
  magnitude: "Cuánto brilla algo a la vista. La escala va al revés: los números menores son más brillantes.",
  azimuth: "Una dirección de brújula en grados. Cero es el norte, 90 es el este.",
  elevation: "A qué altura está algo sobre el horizonte, en grados. Noventa es justo arriba.",
  terminator: "La línea entre el día y la noche en un mundo.",
  twilight: "El tiempo después de la puesta de sol en que el cielo todavía no está del todo oscuro. Es cuando más fácil resulta ver los satélites.",
  sunlit: "Aún recibe luz del Sol aunque el suelo de debajo esté oscuro. Eso es lo que hace visible a un satélite.",
  radiant: "El punto del cielo del que parece venir una lluvia de meteoros.",
  ZHR: "Más o menos cuántos meteoros por hora verías bajo un cielo oscuro perfecto con el radiante en lo alto. Normalmente ves menos.",
  "close approach": "Cuando un asteroide pasa cerca de la Tierra. «Cerca» en astronomía suele significar más lejos que la Luna.",
  "near-Earth object": "Un asteroide o cometa cuya órbita lo acerca a la de la Tierra.",
  reentry: "Cuando algo vuelve a caer a la atmósfera. La mayor parte se desintegra durante el descenso.",
  debris: "Satélites muertos, etapas de cohete agotadas y fragmentos. Se siguen decenas de miles de piezas.",
  constellation: "Un patrón de estrellas al que la gente puso nombre hace mucho. Las estrellas de uno no suelen estar cerca unas de otras.",
  L1: "Un punto de equilibrio entre la Tierra y el Sol, a unos 1.5 millones de km hacia el Sol. Bueno para vigilar el Sol.",
  L2: "Un punto de equilibrio a 1.5 millones de km de la Tierra, del lado opuesto al Sol, donde un telescopio puede mantener la Tierra y el Sol a su espalda y seguir frío.",
  transit: "Cuando una cosa pasa por delante de otra vista desde donde estás.",
  conjunction: "Cuando dos cosas parecen estar juntas en el cielo. No están cerca en el espacio.",
  ephemeris: "Una tabla de dónde estará algo, calculada de antemano.",
  umbra: "La parte oscura del centro de una sombra, donde la luz queda bloqueada del todo. En la umbra de la Luna, el Sol desaparece.",
  penumbra: "La parte exterior y más clara de una sombra, donde solo se bloquea parte de la luz. Una Luna en la penumbra de la Tierra apenas se oscurece un poco.",
  totality: "Los minutos de un eclipse total en que el Sol queda cubierto por completo. El cielo se oscurece lo bastante para ver estrellas.",
  annular: "En forma de anillo. En un eclipse anular la Luna está demasiado lejos para cubrir todo el Sol, y queda un anillo brillante a su alrededor."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "Ir a una fecha (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "Buscar",
    "property": "Buscar por propiedades",
    "countries": "Satélites por país",
    "operators": "Por operador",
    "clouds": "Nubes de basura espacial",
    "chartOurs": "Nuestros planetas lado a lado"
  },
  "find": {
    "title": "Buscar",
    "label": "Buscar por propiedades, por país y por nube de basura",
    "tabs": {
      "property": "Propiedades",
      "country": "Por país",
      "clouds": "Basura y flotas"
    },
    "kindsLabel": "Qué buscar",
    "kinds": {
      "stars": "Estrellas",
      "exoplanets": "Planetas",
      "satellites": "Satélites",
      "comets": "Cometas"
    },
    "presetsLabel": "Preguntas",
    "refine": "Afinar",
    "presets": {
      "rockyHz50": "Planetas rocosos en la zona habitable a menos de 50 años luz",
      "nearStars": "Estrellas a menos de 20 años luz",
      "temperate": "Planetas más o menos tan cálidos como la Tierra",
      "hotJupiters": "Gigantes calientes",
      "cometsSoon": "Cometas en su punto más cercano al Sol antes de 2030",
      "geo": "Satélites activos en el anillo geoestacionario",
      "low": "Satélites activos por debajo de 400 km"
    },
    "fields": {
      "within": "A menos de (años luz)",
      "fromHere": "Medido desde la cámara, no desde el Sol",
      "radius": "Radio (Tierras)",
      "mass": "Masa (Tierras)",
      "teq": "Temperatura (K)",
      "insol": "Luz estelar (Tierra = 1)",
      "height": "Altura (km)",
      "year": "Lanzado (año)",
      "perihelion": "Máximo acercamiento al Sol (año)",
      "from": "desde",
      "to": "hasta",
      "zone": "En la zona habitable",
      "zoneWide": "Dentro o en su borde",
      "rocky": "Rocoso",
      "working": "Solo activos",
      "owner": "Propietario",
      "operator": "Operador",
      "any": "Cualquiera",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "Nombre",
      "dist": "Distancia (al)",
      "radius": "Radio (Tierras)",
      "teq": "Temp. (K)",
      "insol": "Luz",
      "zone": "Zona",
      "spect": "Tipo",
      "mag": "Magnitud",
      "owner": "Propietario",
      "height": "Altura (km)",
      "year": "Lanzado",
      "perihelion": "Perihelio",
      "qAu": "Mínima (ua)"
    },
    "zones": {
      "inside": "dentro",
      "edge": "borde",
      "hotter": "demasiado caliente",
      "colder": "demasiado frío"
    },
    "sortTitle": "Ordenar por {col}",
    "tableLabel": "Lo que coincide, una fila cada uno: pulsa una fila para ir allí",
    "status": "{n} encontrados",
    "statusSome": "{n} encontrados; se listan los primeros {shown}",
    "none": "Nada coincide. Amplía un rango o quita una casilla.",
    "looking": "Buscando…",
    "loading": "Cargando dónde buscar…",
    "failed": "La búsqueda no se hizo. Inténtalo de nuevo en un momento.",
    "rowTitle": "Ir a {name}",
    "noRecord": "No está dibujado en el mapa",
    "modelled": "Calculado con una masa estelar estimada: modelado",
    "copyLink": "Copiar el enlace a esta pregunta",
    "copied": "Enlace copiado",
    "honesty": {
      "stars": "Las estrellas con nombre de HYG v4.4, 3 390, a sus distancias medidas. Medido.",
      "exoplanets": "Radio, masa, periodo y estrella: medidos, NASA Exoplanet Archive. Tamaño de la órbita, luz estelar, temperatura y zona: calculados; marcados con * donde la masa de la estrella se estima a partir de su luz, modelado. Rocoso: 1,6 radios terrestres o menos, o 3 masas terrestres si no hay radio (Rogers 2015).",
      "satellites": "Catálogo de CelesTrak, leído el {date}. La altura es la media entre el punto más alto y el más bajo de la órbita. Medido.",
      "comets": "Fechas de perihelio de la Small-Body Database del JPL. Calculadas a partir de órbitas medidas."
    },
    "chart": {
      "open": "Lado a lado",
      "openTitle": "Los planetas de {host} lado a lado, a escala",
      "title": "{host}, a escala",
      "ours": "El sistema solar",
      "label": "Los planetas de {host} dibujados lado a lado a su tamaño real, por orden desde la estrella",
      "note": "Una sola escala para todos los planetas; los huecos no son distancias. Un planeta sin radio medido se dibuja discontinuo, con el tamaño mediano.",
      "close": "Cerrar el gráfico"
    },
    "pill": "{name}: {n} resaltados",
    "pillClear": "Quitar el resaltado"
  },
  "owners": {
    "modesLabel": "Agrupar por",
    "modes": {
      "countries": "Países",
      "operators": "Operadores",
      "points": "Puntos de Lagrange",
      "nopath": "Sin trayectoria pública"
    },
    "reading": "Leyendo el catálogo de CelesTrak (7 MB)…",
    "failed": "El catálogo no se cargó.",
    "retry": "Reintentar",
    "lead": "{n} propietarios tienen algo en órbita: {total} objetos seguidos.",
    "row": "{n} en órbita",
    "rowSub": "{working} activos · {debris} restos",
    "rowTitle": "Resaltar lo que {name} tiene en órbita",
    "joint": "{a} y {b}",
    "ussr": "El catálogo cuenta la Unión Soviética y Rusia como un solo propietario.",
    "unknown": "Aún desconocido",
    "byName": "por nombre",
    "byNameTitle": "Contado por los nombres que llevan sus satélites en el catálogo",
    "kinds": "{working} activos, {dead} que ya no funcionan, {rocket} cuerpos de cohete, {debris} fragmentos de basura.",
    "lit": "{n} de ellos están dibujados y resaltados en el mapa.",
    "litNone": "Ninguno está dibujado en el mapa.",
    "show": "Resaltarlos",
    "clear": "Quitar",
    "page": "Página de {name}",
    "noPathTitle": "Sin trayectoria pública: {n}",
    "noPathNone": "Todas sus cargas útiles en órbita tienen una trayectoria pública.",
    "why": {
      "no-elements": "Sin órbita pública: el catálogo lo incluye, pero no se publican elementos orbitales",
      "deep-space": "Más allá de la órbita terrestre, y aquí no hay trayectoria para él",
      "deep-drawn": "Más allá de la órbita terrestre: dibujado con su trayectoria del JPL"
    },
    "points": {
      "sel1": "Sol–Tierra L1",
      "sel2": "Sol–Tierra L2",
      "eml2": "Tierra–Luna L2",
      "sel1Why": "A 1,5 millones de km hacia el Sol: una vista del Sol que nunca se pone.",
      "sel2Why": "A 1,5 millones de km en dirección contraria al Sol: frío y oscuro, para telescopios.",
      "eml2Why": "Más allá de la cara oculta de la Luna: un relé que ve a la vez la cara oculta y la Tierra.",
      "empty": "Ahora no hay nada aquí."
    },
    "nopathLead": "{n} cargas útiles en órbita no tienen trayectoria pública. Las más nuevas primero:",
    "source": "Catálogo de satélites de CelesTrak, leído el {date}: medido. Banderas: Wikimedia Commons, dominio público."
  },
  "breakups": {
    "cloudsTitle": "Nubes de basura",
    "fleetsTitle": "Constelaciones",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "Un satélite meteorológico chino, destruido por un misil antisatélite chino a 865 km el 11 de enero de 2007: la nube más grande jamás creada.",
      "cosmos1408": "Un satélite soviético muerto, destruido por un misil antisatélite ruso a unos 480 km el 15 de noviembre de 2021.",
      "iridium33": "Un satélite telefónico activo, golpeado por el Cosmos 2251 muerto a 789 km sobre Siberia el 10 de febrero de 2009: la primera colisión entre dos satélites enteros.",
      "cosmos2251": "Un satélite ruso muerto que chocó con Iridium 33 a 789 km el 10 de febrero de 2009."
    },
    "counts": "{up} de los {catalogued} fragmentos catalogados siguen en órbita.",
    "lit": "{n} resaltados en el mapa.",
    "spreadTitle": "Ver cómo se dispersa",
    "steps": {
      "event": "En el momento",
      "week": "Una semana después",
      "year": "Un año después",
      "today": "Hoy"
    },
    "play": "Reproducir desde el suceso",
    "stop": "Parar",
    "places": "Volver a las posiciones de hoy",
    "spreadNote": "Modelado: cada fragmento parte de un mismo punto, en la órbita que tiene hoy, y deriva a medida que el abultamiento de la Tierra gira su plano. Los fragmentos que ya cayeron no se dibujan.",
    "source": "Fuente:",
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
    "fleetLit": "{n} resaltados en el mapa.",
    "fleetNote": "Reconocidos por los nombres que sus operadores les dan en el catálogo.",
    "loadingActive": "Cargando primero todos los satélites activos (7 MB)…",
    "loadingDebris": "Cargando primero todos los fragmentos seguidos (7 MB)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "Ir al minuto en que Fengyun-1C fue destruido y resaltar su nube"
  },
  "dateJump": {
    "title": "Ir a una fecha",
    "field": "Fecha y hora (UTC)",
    "text": "O escríbela",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "Ir",
    "hint": "Cualquier momento de 1700 a 2200, en UTC.",
    "errors": {
      "unknown": "No entiendo esa fecha. Prueba 1969-07-20 20:17, 20 July 1969 o next total eclipse.",
      "range": "Fuera de 1700 a 2200.",
      "empty": "Escribe primero una fecha.",
      "eclipse": "No hay un eclipse así entre 1700 y 2200."
    },
    "searching": "Buscando…",
    "gone": "Ahora {when}.",
    "eclipse": "{what}, {when}.",
    "eclipses": {
      "sunTotal": "Eclipse total de Sol",
      "sunAnnular": "Eclipse anular de Sol",
      "sunPartial": "Eclipse parcial de Sol",
      "moonTotal": "Eclipse total de Luna",
      "moonPartial": "Eclipse parcial de Luna",
      "moonPenumbral": "Eclipse penumbral de Luna"
    },
    "rangesTitle": "Con qué precisión, y cuándo",
    "ranges": {
      "worlds": "Sol, Luna y planetas: de 1700 a 2200, calculado (astronomy-engine).",
      "satellites": "Satélites: precisos a una semana de hoy; atenuados pasado un mes.",
      "craft": "Sondas espaciales: solo dentro de sus propias trayectorias del JPL.",
      "stars": "Estrellas: en la vista del cielo, desplazadas por sus movimientos medidos cuando la fecha está a más de 50 años de hoy."
    },
    "quick": {
      "total": "Próximo eclipse total de Sol",
      "lunar": "Próximo eclipse de Luna"
    },
    "missionsTitle": "De nuestras misiones",
    "momentsTitle": "Momentos",
    "presetsLabel": "Fechas a las que ir",
    "faded": "Satélites atenuados: sus órbitas están medidas para hoy, no para {year}.",
    "close": "Cerrar"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "De Wikipedia",
    "quotedLive": "Citado de Wikipedia tal como se lee hoy, sin comprobar por nosotros.",
    "quotedBaked": "Citado de Wikipedia tal como se leía el {date}, sin comprobar por nosotros.",
    "textCredit": "Texto: colaboradores de Wikipedia, CC BY-SA 4.0.",
    "readArticle": "Leer el artículo completo",
    "inEnglish": "Todavía no hay artículo en este idioma, así que este es el inglés.",
    "family": "Sobre {fleet} en conjunto: no hay artículo para este satélite en concreto.",
    "photo": "Foto: {artist}, {licence}, vía Wikimedia Commons.",
    "photoNoArtist": "Foto: {licence}, vía Wikimedia Commons.",
    "photoAlt": "La imagen de cabecera del artículo de Wikipedia {title}",
    "loading": "Preguntando a Wikipedia…",
    "read": "Leer en voz alta",
    "readTitle": "Lee esta ficha en voz alta con la voz de tu dispositivo",
    "stop": "Dejar de leer",
    "reading": "Leyendo en voz alta"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "Tiempo profundo",
    "back": "−{n} años",
    "on": "+{n} años",
    "backTitle": "Retroceder {n} años, con la misma fecha y hora",
    "onTitle": "Avanzar {n} años, con la misma fecha y hora",
    "presetsLabel": "Otras estrellas polares",
    "presets": {
      "thuban": "Thuban, 2800 a. C.",
      "vega": "Vega, 13 700 d. C.",
      "far": "50 000 d. C."
    },
    "presetTitles": {
      "thuban": "Cuando se construyeron las pirámides, Thuban, en el Dragón, era la estrella polar",
      "vega": "Hacia el 13 700 d. C. el polo pasa a 6,5° de Vega",
      "far": "El cielo dentro de cincuenta mil años"
    },
    "yearAd": "{n} d. C.",
    "yearBc": "{n} a. C.",
    "moved": "El cielo de {year}: cada estrella desplazada por su propio movimiento medido.",
    "far": "Tan lejos de hoy no se dibujan la Luna ni los planetas, y el Sol está donde lo pone el calendario.",
    "pole": "Estrella polar: {name}, a {deg}° del polo.",
    "noPole": "Ninguna estrella brillante marca el polo: la más cercana, {name}, está a {deg}°.",
    "unnamed": "una estrella de magnitud {mag}",
    "honest": "Los movimientos están medidos (Hipparcos y Gaia, a través de HYG); prolongarlos en línea recta durante milenios es un modelo. El giro del eje de la Tierra: Vondrák, Capitaine y Wallace 2011."
  },
  "variables": {
    "label": "Cómo cambia su luz",
    "types": {
      "eclipse": "Una pareja eclipsante: dos estrellas que pasan una delante de la otra.",
      "binary": "Una pareja cercana deformada, cuya luz nunca está quieta.",
      "pulse": "Una estrella pulsante: se hincha y se encoge.",
      "sine": "Una estrella pequeña de pulsación rápida.",
      "sr": "Una gigante semirregular: su período y su rango están medidos, pero no en qué punto del ciclo está, así que la curva es un esbozo.",
      "irregular": "Una variable irregular: ningún reloj puede decir su brillo, así que el cielo mantiene el del catálogo."
    },
    "periodDays": "Período {n} días.",
    "periodYears": "Período {n} años.",
    "aria": "Curva de luz de {name}, de magnitud {bright} a {faint}; ahora {now}.",
    "now": "ahora",
    "nowLine": "Ahora magnitud {mag} ({band}); varía de {bright} a {faint}.",
    "range": "Varía de magnitud {bright} a {faint} ({band}).",
    "far": "Su curva no se prolonga más de {years} años desde hoy; varía de magnitud {bright} a {faint} ({band}).",
    "nextMin": "Próximo mínimo: {when}",
    "measured": "Medido: las magnitudes fechadas del Gran Oscurecimiento. Elementos: {cite}.",
    "modelled": "Modelado: la forma se dibuja a partir del período, la época y el rango del catálogo ({cite}).",
    "notes": {
      "alf-ori": "En 2019 y 2020 bajó a magnitud 1,6, el Gran Oscurecimiento: una nube de polvo que había expulsado ocultó parte de ella.",
      "omi-cet": "Los máximos de Mira llegan semanas antes o después de un ciclo a otro; estas fechas pueden desviarse otro tanto.",
      "bet-lyr": "Su período crece 19 segundos al año; la curva sigue la efeméride cuadrática de Harmanec y Scholz (1993).",
      "bet-per": "Los eclipses de Algol son puntuales al minuto: se debilita unas diez horas cada 2,87 días.",
      "eps-aur": "Eclipsada casi dos años cada 27 por un disco oscuro alrededor de su compañera; el último eclipse fue de 2009 a 2011.",
      "eta-car": "En su Gran Erupción de la década de 1840 llegó a ser la segunda estrella más brillante del cielo.",
      "t-crb": "Una nova recurrente: llegó a magnitud 2 en 1866 y en 1946."
    }
  },
  "blackHoleSpin": {
    "spin": "Dibujado girando, con espín a = {a}: la sombra tiene la forma que proyecta un agujero que gira (Bardeen 1973), desplazada lejos del lado que viene hacia nosotros. {why} La luz a su alrededor se sigue trazando sin espín, así que la forma es un modelo.",
    "spinWhy": {
      "m87-star": "El espín es elegido: los modelos que mejor ajustan del artículo V del EHT 2019 giran a 0,94.",
      "sgr-a-star": "El espín es elegido: el artículo V del EHT 2022 favorece de 0,5 a 0,94."
    }
  }
});
// b200-f3-stars: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "Trayectoria",
    "flightTitle": "Planifica un recorrido de cámara entre vistas, previsualízalo y compártelo como enlace",
    "record": "Grabar",
    "recordTitle": "Graba esta vista, una trayectoria o un viaje como vídeo",
    "dome": "Cúpula y 360",
    "domeTitle": "Muestra el cielo como una cúpula de planetario o una imagen de 360 grados",
    "failed": "No se ha cargado. Inténtalo de nuevo en un momento."
  },
  "flight": {
    "title": "Trayectoria",
    "sheet": "Trayectoria: arrastra para cambiar el tamaño",
    "close": "Cerrar la trayectoria",
    "play": "Reproducir",
    "playTitle": "Vuela la trayectoria desde donde está el control",
    "stop": "Parar",
    "stopTitle": "Detener el vuelo donde está",
    "scrub": "Punto de la trayectoria",
    "scrubAt": "{at} de {total}",
    "hint": "Lleva el mapa a una vista que te guste y pulsa Añadir esta vista. Dos vistas forman una trayectoria.",
    "hintOne": "Una vista. Vuela a otro sitio y añade otra.",
    "hintMany": "{n} vistas. Pulsa Reproducir o arrastra el control para mirar a lo largo de la trayectoria.",
    "add": "Añadir esta vista",
    "addTitle": "Guarda dónde está la cámara, qué mira y el reloj",
    "keysLabel": "Las vistas de la trayectoria, en orden",
    "keyName": "{n}. {name}",
    "goTitle": "Ir a esta vista",
    "keyLive": "el reloj tal como avanza",
    "point": "Un punto del espacio",
    "duration": "Vuelo",
    "seconds": "{n} s",
    "ease": "Curva",
    "eases": {
      "smooth": "Arranque y parada suaves",
      "cruise": "Crucero",
      "constant": "Velocidad constante"
    },
    "rate": "Reloj",
    "rateLive": "Tiempo real",
    "up": "↑",
    "upLabel": "Adelantar la vista {n}",
    "down": "↓",
    "downLabel": "Retrasar la vista {n}",
    "replace": "Usar esta vista",
    "replaceLabel": "Sustituir la vista {n} por la actual",
    "remove": "Quitar",
    "removeLabel": "Quitar la vista {n}",
    "copyLink": "Copiar enlace",
    "copyLinkTitle": "Toda la trayectoria en un enlace: no se guarda nada en ningún sitio",
    "linkCopied": "Enlace copiado ({n} caracteres). Quien lo abra verá este vuelo.",
    "linkInBar": "El enlace está en la barra de direcciones: cópialo de ahí.",
    "draft": "Guardar borrador de viaje",
    "draftTitle": "Un borrador de archivo de viaje para los viajes del mapa, para que una persona lo termine",
    "draftSaved": "Borrador guardado. Las tarjetas las escribes tú.",
    "record": "Grabar este vuelo",
    "recordTitle": "Grabar el vuelo como vídeo",
    "clear": "Vaciar",
    "clearTitle": "Quitar todas las vistas",
    "needTwo": "Una trayectoria necesita al menos dos vistas.",
    "full": "Una trayectoria admite {n} vistas como máximo.",
    "noView": "Esta vista no se puede guardar: mira algo primero.",
    "badLink": "No se ha podido leer este enlace de vuelo.",
    "honesty": "Cada vista muestra las cosas donde están a la hora de su reloj. Los vuelos entre vistas son movimientos de cámara que dibujamos, no la ruta de una nave."
  },
  "record": {
    "title": "Grabar",
    "sheet": "Grabar: arrastra para cambiar el tamaño",
    "close": "Cerrar Grabar",
    "whatLabel": "Qué grabar",
    "sourceView": "Esta vista",
    "sourcePath": "La trayectoria",
    "sourceTrip": "El viaje, hasta el final",
    "length": "Duración",
    "seconds": "{n} segundos",
    "shapeLabel": "Formato",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "Cuadrado",
      "tall": "Vertical 9:16 (Reels, TikTok, Shorts)"
    },
    "smooth": "Fotograma a fotograma (fluido en cualquier dispositivo)",
    "smoothNote": "La página vuelve a cargar esta vista con un reloj propio y dibuja cada fotograma antes de tomarlo: un dispositivo lento graba despacio, pero nunca a saltos.",
    "silent": "Fotograma a fotograma no graba sonido.",
    "withSound": "El sonido que oyes también se graba.",
    "noSound": "El sonido está apagado, así que el vídeo será mudo. Activa el sonido antes para conservar la voz y la música del viaje.",
    "start": "Empezar a grabar",
    "stop": "Parar",
    "save": "Guardar el vídeo",
    "share": "Compartir el vídeo",
    "saved": "Vídeo guardado.",
    "cannot": "Este navegador no puede grabar vídeo. Las versiones recientes de Chrome, Edge, Safari y Firefox sí pueden.",
    "rolling": "Grabando: {at} s",
    "made": "Listo: {mb} MB. Guárdalo o compártelo.",
    "empty": "El navegador no ha grabado nada. Inténtalo de nuevo o marca Fotograma a fotograma.",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · mapas y datos: NASA, ESA, Solar System Scope y otros",
    "endTitle": "Míralo tú mismo",
    "endLine": "Space Radar: gratis, en tu navegador.",
    "endCredit": "Mapas y datos: NASA, ESA, USGS, Solar System Scope, HYG y otros, con sus propias licencias (CC BY, CC BY-SA). Créditos en spaceradar.ai.",
    "filmTitle": "Grabando fotograma a fotograma",
    "filmWarming": "Preparando la vista…",
    "filmFrame": "Fotograma {n} de {total}",
    "filmDone": "Listo: {mb} MB, {s} segundos. El archivo está guardado.",
    "filmFailed": "La grabación se detuvo: {why}",
    "back": "Volver al mapa"
  },
  "dome": {
    "title": "Cúpula y 360",
    "sheet": "Cúpula y 360: arrastra para cambiar el tamaño",
    "close": "Cerrar Cúpula y 360",
    "kindLabel": "Cómo se dibuja el cielo",
    "normal": "Normal",
    "dome": "Cúpula, 180 grados (planetario)",
    "wide": "360 grados (YouTube 360)",
    "tilt": "Inclinación de la cúpula",
    "tiltDeg": "{n}°",
    "size": "Tamaño",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "Guardar este fotograma",
    "skySize": "Cara del skybox",
    "saveSky": "Guardar un skybox",
    "saved": "Guardado: {w} × {h} px.",
    "saveFailed": "No se ha podido dibujar la imagen.",
    "intro": "Una imagen de cúpula o de 360 grados de lo que ve la cámara, en directo. Los nombres se ocultan mientras está activa.",
    "live": "En directo, {n} px por cara.",
    "livePhone": "En directo a {n} px por cara: en un teléfono es una vista previa. Guarda un fotograma para tener uno nítido.",
    "noGpu": "Los gráficos de este dispositivo no pueden dibujarlo.",
    "busy": "Cierra antes el mundo imaginado o el Momento: dibuja su propia imagen.",
    "off": "De vuelta a la imagen normal.",
    "credit": "Libre de uso con este crédito: Space Radar, spaceradar.ai. Mapas y datos: NASA, ESA, USGS, Solar System Scope, HYG y otros; el panel Fuentes indica la licencia de cada uno.",
    "how": "Para una cúpula, añade #proj=dome,30 al enlace de un viaje y ábrelo a pantalla completa. docs/PLANETARIUMS.md explica los pasos."
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "Reto diario",
    "close": "Cerrar",
    "day": "El reto del {day} (UTC), el mismo para todos hoy.",
    "games": {
      "find-earth": {
        "title": "Encuentra la Tierra",
        "blurb": "Desde las galaxias hasta nuestro planeta, en los menos intentos posibles."
      },
      "which-world": {
        "title": "¿Qué mundo es este?",
        "blurb": "Un primer plano de un mapa real: elige el mundo entre cuatro."
      },
      "guess-distance": {
        "title": "Adivina la distancia",
        "blurb": "Desliza hasta los años luz a los que está."
      }
    },
    "other": "Otros retos",
    "loading": "El mapa aún se está cargando; el reto empieza cuando esté listo.",
    "rung": "Paso {n} de {of}: {where}",
    "rungs": {
      "local-group": "el Grupo Local",
      "galaxy": "la Vía Láctea",
      "stellar": "el vecindario del Sol",
      "sun": "el sistema solar"
    },
    "ask": {
      "local-group": "¿Qué marca es nuestra galaxia, la Vía Láctea?",
      "galaxy": "¿Qué marca es el Sol?",
      "stellar": "¿Qué marca es el Sol?",
      "sun": "¿Qué marca es la Tierra?"
    },
    "hints": {
      "local-group": "La nuestra tiene dos pequeñas compañeras muy cerca, las Nubes de Magallanes.",
      "galaxy": "El Sol está a unos 27 000 años luz del agujero negro del centro, en un brazo tranquilo.",
      "stellar": "Las estrellas más cercanas al Sol son enanas rojas débiles y Alfa Centauri, a 4,4 años luz.",
      "sun": "La Tierra es el tercer mundo contando desde el Sol."
    },
    "hint": "Pista (cuesta un intento)",
    "mark": "Marca {letter}, {where}",
    "places": {
      "tl": "arriba a la izquierda",
      "tc": "arriba",
      "tr": "arriba a la derecha",
      "ml": "izquierda",
      "mc": "centro",
      "mr": "derecha",
      "bl": "abajo a la izquierda",
      "bc": "abajo",
      "br": "abajo a la derecha"
    },
    "milkyWay": "la Vía Láctea",
    "sunName": "el Sol",
    "tries": "Intento {n} de {max}",
    "wrong": "Esa no: {letter} es {name}.",
    "right": "Sí, {name}. Acercándonos.",
    "found": "Encontraste la Tierra en {n} intentos.",
    "lost": "Sin intentos. La Tierra era el tercer mundo desde el Sol.",
    "honest": "Las marcas están donde el mapa dibuja cada objeto. En el paso del sistema solar los mundos se dibujan más cerca de lo que están, como en todo ese escenario.",
    "round": "Ronda {n} de {of}",
    "worldAsk": "¿De qué mundo es este primer plano?",
    "more": "Ver más del mapa",
    "worldRight": "Sí: {name}.",
    "worldWrong": "No: era {name}.",
    "credit": "Mapa: {credit}",
    "worldPicture": "Un primer plano de un mapa real de un mundo del sistema solar",
    "distAsk": "¿A qué distancia está {name}?",
    "slider": "Distancia en años luz",
    "guess": "Adivinar",
    "reveal": "{name} está a {value}: acertaste {off}.",
    "offs": {
      "hit": "con menos de un cuarto de error",
      "near": "dentro del doble",
      "far": "dentro del quíntuple",
      "miss": "con más de cinco veces de error"
    },
    "source": "Distancia: {source}",
    "units": {
      "ly": "{n} años luz",
      "kly": "{n} mil años luz",
      "mly": "{n} millones de años luz",
      "bly": "{n} mil millones de años luz"
    },
    "next": "Siguiente",
    "scores": {
      "find-earth": "{n} de 10 intentos",
      "which-world": "{n} de 3 mundos",
      "guess-distance": "{n} de 3 dentro del doble"
    },
    "shareTitle": "Space Radar: {game}",
    "share": "Compartir el resultado",
    "copied": "Copiado. Pégalo donde quieras.",
    "copyFailed": "No se pudo copiar: selecciona el texto de arriba.",
    "played": "Listo por hoy. Uno nuevo llega a medianoche UTC.",
    "streak": "{n} días seguidos"
  }
});
// b200-f6-learn: end
// b200-f8-xr: begin -- the gamepad and the headset (copy/en.xr.js, forge #164, #158), machine-drafted
Object.assign(COPY, {
  "pad": {
    "title": "Mando",
    "label": "Controles del mando",
    "close": "Cerrar los controles del mando",
    "capStickL": "Stick izquierdo",
    "capStickR": "Stick derecho",
    "capTriggers": "RT · LT",
    "capA": "A · Equis",
    "capX": "X · Cuadrado",
    "capB": "B · Círculo",
    "capY": "Y · Triángulo",
    "capDpad": "Cruceta ↑ ↓",
    "capView": "Vista · Share",
    "turn": "Girar alrededor",
    "fly": "Acercarse y alejarse, deslizarse de lado",
    "speed": "Más rápido, más lento",
    "choose": "Elegir lo que está en el anillo",
    "go": "Ir allí",
    "back": "Volver",
    "ship": "Física de nave sí o no",
    "ladder": "Subir y bajar por la escalera de distancias",
    "controls": "Estos controles (también Menú)",
    "shipToggle": "Física de nave",
    "shipHow": "Sigue a la deriva cuando suelta. Pulse un stick para detenerse.",
    "notStandard": "Este mando no dice dónde están sus botones: su stick izquierdo gira la vista, sus botones no se usan.",
    "connected": "Mando conectado. Pulse Y para ver sus controles.",
    "disconnected": "Mando desconectado.",
    "shipOn": "Física de nave activada: sigue a la deriva cuando suelta.",
    "shipOff": "Física de nave desactivada.",
    "nothing": "No hay nada en el anillo para elegir.",
    "chooseFirst": "Elija algo primero: A toma lo que está en el anillo.",
    "rung": "{label}, {distance}",
    "home": "La Tierra",
    "trip": "Un viaje tiene la cámara. Sus propios botones están en pantalla."
  },
  "headset": {
    "enter": "Entrar en el visor",
    "enterTitle": "Estar bajo el cielo o recorrer la escalera de distancias con un visor de realidad virtual",
    "noteTitle": "Antes de ponérselo",
    "comfort": "Los movimientos son saltos, no deslizamientos, y los giros son pasos de 30 grados, así el horizonte queda recto. Siéntese o despeje el espacio a su alrededor.",
    "seizure": "Un pequeño número de personas sufre convulsiones por luces o patrones intermitentes. Si se marea, siente náuseas o ve algo extraño, pare y quítese el visor.",
    "how": "Mire algo y pulse A o el gatillo derecho para elegirlo. X va allí, B vuelve, Y muestra los controles, como en un mando. Dentro de un Momento, A reproduce y pausa y B vuelve al mapa. Mantenga B un segundo para salir.",
    "untried": "Nuevo, y aún no probado en un visor real: cuéntenos lo que ve.",
    "go": "Entrar",
    "cancel": "Ahora no",
    "busy": "Cierre primero el mundo imaginado, Cúpula y 360 o la grabación: cada uno dibuja su propia imagen.",
    "failed": "El visor no se inició.",
    "left": "De vuelta en la pantalla.",
    "panelHelp": "A elegir   X ir   B volver   Y controles",
    "panelMove": "Stick izquierdo: alrededor, y por la escalera   Stick derecho: girar, acercarse y alejarse",
    "panelLeave": "Mantenga B para salir",
    "chosen": "Elegido: {name}",
    "nothing": "Nada justo delante",
    "momentHelp": "A reproducir o pausar   B volver al mapa   Y controles",
    "frame": "Fotograma {ms} ms, {fps} por segundo (meta: 72)",
    "lighter": "Los fotogramas tardaban demasiado: se dibuja menos."
  }
});
// b200-f8-xr: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "Grabaciones reales de aquí",
    "play": "Escuchar {name}",
    "stop": "Detener",
    "hide": "Ocultar las grabaciones de aquí",
    "sonified": "Datos reales convertidos en sonido",
    "microphone": "Sonido real, de un micrófono",
    "playing": "Sonando: {name}. {how}.",
    "failed": "Esa grabación no se cargó.",
    "names": {
      "real-voyager-plasma": "la Voyager 1 en el espacio interestelar",
      "real-juno-ganymede": "Juno pasando junto a Ganímedes",
      "real-cassini-saturn": "la radio de Saturno",
      "real-insight-impact": "un meteoroide que choca con Marte",
      "real-insight-wind": "el viento en Marte",
      "real-perseverance-dust-devil": "un remolino de polvo en Marte"
    }
  }
});
// b200-f9-reach: end
// b200-f7-ground: begin -- standing on another world and its sky (copy/en.ground.js, forge #146, #147), machine-drafted
Object.assign(COPY, {
  "ground": {
    "stageLabel": "De pie en otro mundo",
    "tagGround": "En la superficie · {world}",
    "tagSky": "El cielo desde {world}",
    "kindMeasured": "suelo medido",
    "kindPlain": "suelo no medido",
    "kindModelled": "modelado",
    "placeAt": "{world}, {lat}°, {lon}° este",
    "worlds": {
      "moon": "la Luna",
      "mars": "Marte",
      "titan": "Titán",
      "europa": "Europa",
      "earth": "la Tierra",
      "proxima-b": "Proxima Centauri b",
      "trappist-1e": "TRAPPIST-1 e"
    },
    "measuredGround": "Medido: las alturas son el modelo estereoscópico del terreno a escala real, y el suelo es la propia imagen del orbitador (sus sombras son las del día en que se tomó). No se ha inventado ninguna roca ni ningún cráter.",
    "plainGround": "El suelo aquí no está dibujado a partir de mediciones: una llanura hasta el horizonte. El cielo está calculado.",
    "modelLine": "En las coordenadas del aterrizaje: {what}. Hacia dónde mira no sale de una imagen.",
    "timeLine": "{local} hora solar local · {utc} · el Sol a {sun}°",
    "timeLineStar": "{utc} · {star} a {sun}° de altura, donde está siempre",
    "drive": "Conducir el rover",
    "walk": "Caminar",
    "driving": "Conduciendo, unas {x} veces más rápido de lo que puede ir el rover.",
    "walking": "Caminando.",
    "skyOpen": "El cielo",
    "skyClose": "Ocultar el cielo",
    "leave": "Salir",
    "sources": "Fuentes y licencias",
    "padLabel": "Caminar: empuja el pulgar hacia donde quieras ir",
    "keys": "W A S D o las flechas para caminar, Q y E para girar, R y F para mirar arriba y abajo, Shift para correr, + y - para acercar o alejar, Esc para salir.",
    "skyTitle": "Este cielo",
    "poleStar": "Estrella polar: {name}, a {sep}° del polo (magnitud {mag}).",
    "noPoleStar": "Ninguna estrella más brillante que la magnitud 4,5 a menos de 10° del polo de este mundo.",
    "unnamedStar": "una estrella sin nombre común",
    "poleLabel": "{name} (estrella polar)",
    "rises": "{name} sale a las {local}, hora solar local ({utc}).",
    "sets": "{name} se pone a las {local}, hora solar local ({utc}).",
    "neverSets": "{name} ni sale ni se pone desde aquí: permanece en la misma parte del cielo.",
    "notToday": "{name} ni sale ni se pone en el intervalo buscado.",
    "transit": "{front} cruza el disco del Sol a las {local}, hora solar local ({utc}), durante {s} segundos.",
    "noTransit": "Desde aquí, ni Fobos ni Deimos cruzan por delante del Sol en los próximos {days} soles.",
    "working": "Calculando las salidas y puestas…",
    "earthNow": "La Tierra: {alt}° de altura, rumbo {az}°, iluminada al {lit} %, magnitud {mag}.",
    "airNotes": {
      "mars": "Colores medidos: el cielo diurno, del panorama en color real de Spirit (PIA07882); la puesta de sol azul, de la de Curiosity en Gale (PIA19400).",
      "moon": "Sin aire, el cielo es negro a mediodía. Un ojo real, deslumbrado por el suelo iluminado por el Sol, vería pocas de estas estrellas.",
      "europa": "Sin aire, el cielo es negro a mediodía. Júpiter permanece inmóvil en el cielo de la cara que mira hacia él.",
      "titan": "Color ilustrativo: la neblina anaranjada oculta a la vista las estrellas y Saturno; se dibujan tenues donde están.",
      "earth": "",
      "proxima-b": "Modelado: se supone que Proxima b muestra siempre la misma cara a su estrella, como esperan sus descubridores (Anglada-Escudé et al. 2016); la inclinación de su órbita y la posición de Proxima b y Proxima d en sus órbitas no se conocen, así que se suponen. El color del cielo es ilustrativo: nadie sabe si el planeta tiene aire. Alfa Centauri A y B están en su posición real; las demás estrellas se dibujan como las ve el Sol.",
      "trappist-1e": "Modelado: se supone que TRAPPIST-1 e muestra siempre la misma cara a su estrella (Gillon et al. 2017); sus planetas hermanos están donde los sitúan sus tiempos de tránsito medidos, en órbitas circulares en un mismo plano, girado de una forma supuesta alrededor de nuestra línea de visión. El color del cielo es ilustrativo: nadie sabe si el planeta tiene aire. Las demás estrellas se dibujan como las ve el Sol."
    },
    "parentNote": "Esta luna muestra siempre la misma cara a su planeta, así que el planeta ni sale ni se pone.",
    "starNote": "Se supone que este planeta muestra siempre la misma cara a su estrella, así que la estrella ni sale ni se pone.",
    "discNote": "El Sol, la Tierra, Fobos y los demás cuerpos extensos son discos de su tamaño y fase reales en colores lisos, no sus mapas ni sus formas.",
    "frameNote": "Rotación: el informe IAU WGCCRE 2015 (Archinal et al. 2018). Posiciones: las efemérides propias de la aplicación.",
    "compass": {
      "N": "N",
      "E": "E",
      "S": "S",
      "W": "O"
    },
    "bodies": {
      "sun": "El Sol",
      "mercury": "Mercurio",
      "venus": "Venus",
      "earth": "La Tierra",
      "moon": "La Luna",
      "mars": "Marte",
      "phobos": "Fobos",
      "deimos": "Deimos",
      "jupiter": "Júpiter",
      "io": "Ío",
      "europa": "Europa",
      "ganymede": "Ganímedes",
      "callisto": "Calisto",
      "saturn": "Saturno",
      "titan": "Titán",
      "uranus": "Urano",
      "neptune": "Neptuno",
      "proxima": "Proxima Centauri",
      "proxima-d": "Proxima d",
      "alpha-cen-a": "Alfa Centauri A",
      "alpha-cen-b": "Alfa Centauri B",
      "trappist-1": "TRAPPIST-1",
      "trappist-1b": "TRAPPIST-1 b",
      "trappist-1c": "TRAPPIST-1 c",
      "trappist-1d": "TRAPPIST-1 d",
      "trappist-1f": "TRAPPIST-1 f",
      "trappist-1g": "TRAPPIST-1 g",
      "trappist-1h": "TRAPPIST-1 h"
    },
    "earthAndMoon": "La Tierra y la Luna",
    "unknownGround": "Todavía no hay un modelo del terreno para ese lugar.",
    "unknownSky": "Este mapa aún no permite estar de pie en ese lugar: solo en la Luna, Marte, Titán, Europa, Proxima b o TRAPPIST-1 e."
  }
});
// b200-f7-ground: end
// b200-c2-deep: begin -- the 3D stars over deep time, the variable stars worth going out for, the black holes against the EHT's pictures and the cards in the trips' voice (copy/en.deep.js, forge #141, #142, #149, #151), machine-drafted
Object.assign(COPY, {
  "starDeep": {
    "moved": "Las estrellas de {year}: cada una movida por su propio movimiento medido (Hipparcos y Gaia, a través de HYG); prolongarlos en línea recta tanto tiempo es modelado.",
    "hidden": "Las estrellas sin movimiento medido no se dibujan tan lejos de hoy."
  },
  "varEvents": {
    "min": "{name} en su mínimo",
    "max": "{name} cerca de su máximo brillo",
    "minLine": "Hasta magnitud {mag}, a {alt}° de altura hacia el {dir}.",
    "maxLine": "Magnitud {mag} aproximadamente, a {alt}° de altura hacia el {dir}.",
    "minClass": "Calculado a partir de sus mínimos medidos (Kreiner 2004) y prolongado con su período: acertado a un cuarto de hora, más o menos.",
    "maxClass": "Modelado a partir del período y la época del catálogo: los máximos de una Mira llegan semanas antes o después.",
    "aria": "{title}, {when}. {line}"
  },
  "holeCompare": {
    "fromEarth": "Visto desde la Tierra",
    "fromEarthTitle": "Ponerse en la línea del agujero a la Tierra, con el norte arriba y el este a la izquierda, como se imprimen las imágenes del EHT",
    "compare": "Comparar con la imagen del EHT",
    "compareTitle": "Mostrar la imagen del Event Horizon Telescope junto al agujero dibujado, ambos vistos desde la Tierra con el norte arriba",
    "hide": "Ocultar la imagen del EHT",
    "caption": "EHT, {date}",
    "orient": "Norte arriba, este a la izquierda, como está dibujado ahora el agujero.",
    "credit": "Imágenes: EHT Collaboration, CC BY 4.0.",
    "source": "Fuente",
    "alt": "La imagen del Event Horizon Telescope de {name}, {date}: un anillo de luz naranja alrededor de un centro oscuro.",
    "brightest": "Visto desde la Tierra con el norte arriba, el anillo dibujado es más brillante en un ángulo de posición de unos {ours}° (medido en el dibujo); la imagen del EHT del {date} es más brillante hacia los {theirs}°.",
    "approx": {
      "m87-star": "Ajustado: la inclinación (17° respecto a nuestra línea de visión) y el ángulo del chorro en el cielo (288°) están medidos (Walker et al. 2018), y con el flujo girando en sentido horario (EHT 2019, artículo V) el lado que se acerca, más brillante, queda al sur. Aproximado: la luz se traza como alrededor de un agujero que no gira y el gas es un disco delgado, no el flujo caliente y grueso de los modelos del EHT, así que nuestro lado brillante es una vez y media más brillante que el débil, mientras que el suyo lo es unas cuatro (2017) a seis veces (2018); y nuestra imagen es nítida, mientras que la suya está difuminada a 20 µas por un telescopio del tamaño de la Tierra. Su mancha brillante se movió unos 30° en un año; la nuestra no se mueve.",
      "sgr-a-star": "Ajustado: visto a 30° de su eje, como los modelos que mejor encajan del artículo V de EHT 2022, girando en sentido horario como las fulguraciones de GRAVITY. Elegido: hacia dónde apunta el eje en el cielo, que nadie ha medido; está girado para que el lado más brillante caiga donde la imagen del EHT es más brillante. Aproximado: la luz se traza alrededor de un agujero que no gira y de un disco delgado; la imagen del EHT es un promedio de una noche de un flujo que cambia en minutos, y sus tres nudos brillantes no son todos reales, dicen sus autores."
    }
  },
  "cardVoice": {
    "readTitle": "Leer esta ficha en voz alta: el texto citado de Wikipedia con la voz sintética de los viajes",
    "credit": "Voz: Kokoro-82M (af_heart), una voz sintética, Apache-2.0; las palabras son de Wikipedia (CC BY-SA 4.0)."
  }
});
// b200-c2-deep: end
