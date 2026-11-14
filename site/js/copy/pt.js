// pt: Brazilian Portuguese, the words of site/js/copy/en.js, en.later.js and en.facts.js (public #524, spec 0077 W2-f).
// Fetched by copy/index.js only when the page speaks Portuguese (?lang=pt, ?lang=pt-BR). docs/TRANSLATING.md says how it was made.
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English, aiming at natural
// Brazilian Portuguese and not a word-for-word copy, and has NOT been read by a native speaker yet. Until a second
// native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Portuguese only to a visitor who asks for it (?lang=pt), never from the browser's language.
// Brazil, not Portugal: "você", gerunds ("lendo"), "tela", "celular", "aparelho", "ônibus", "arquivo", "baixar", "equipe".
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: "você" (the Brazilian informal-neutral address of a good popular-science site for young people and
//     families: the app talks to a curious fourteen-year-old). Imperatives follow "você" ("Toque", "Arraste", "Defina").
//     A press or a click is "Pressione" (works on a phone and on a desktop); a finger on a glass is "Toque".
//   * Honesty words, one word each, everywhere: medido (measured), calculado (worked out), modelado (modelled),
//     ilustrativo (illustrative), reconstruído (reconstructed), concepção artística (artist's impression),
//     amostra (sample), estimativa (estimate / guess; "palpite" only where English says "guess"), "cerca de" (about),
//     "pelo menos" (at least), "deduzido" (inferred, where English says inferred and not worked out), "propagado" (propagated).
//     Every sentence that said how sure a thing is keeps its strength; "not measured" is "não medido", never softened.
//   * The Sun, the Moon, the planets and the big moons take their Portuguese names (Júpiter, Io, Europa, Ganimedes, Calisto,
//     Fobos, Deimos, Encélado, Titã, Tritão, Caronte, Tétis, Reia, Jápeto, Titânia); spacecraft, stars, catalogue
//     entries, agencies and instruments keep the name they have. COPY.worlds keeps the article for the Sun, the Moon and the
//     Earth ("o Sol", "a Lua", "a Terra") because it is read mid-sentence; so no template puts a preposition before a world's
//     name ("Orbita {world}", "Sobre {world}", "Altura sobre {world}"): "de o Sol" would be wrong.
//   * Words used the same way throughout: ficha (a card), viagem (a trip), parada (a stop), camada (a layer), aparelho (a device),
//     modo Medido / modo Filme (the Look panel's "Aparência"), cartão-postal (postcard), pegar carona (ride along),
//     detrito (debris), ciclone (the storms of the right-now line are tropical cyclones), crepúsculo (twilight).
//   * Numbers: the decimal sign is the comma (RULES.decimal) and groups of three digits are separated by a narrow no-break
//     space, as in the English strings. Large words: milhão (10^6), bilhão (10^9), trilhão (10^12), "mil milhões" only to
//     explain it. Percent has no space ("50%"). Units: km, UA (unidade astronômica), al (ano-luz), "anos-luz".
//   * The compass is the Portuguese one (nor-nordeste, lés-nordeste, oés-sudoeste...) and its short forms use L and O
//     (leste, oeste): N NNE NE LNE L LSE SE SSE S SSO SO OSO O ONO NO NNO. Coordinates read "° L" and "° O".
//   * numberWords: nenhum, um, dois, três... Two is masculine ("dois dias", "dois punhos", "dois ciclones"); the sentences that
//     count things take a masculine noun (ciclones) so the number never has to agree with a feminine one.
//   * RULES.article gives um/uma from the head word of a (Portuguese) type phrase; RULES.typeWords turns the English type
//     phrases of the deep-sky catalogue ("Barred spiral galaxy", "emission nebula"...) into Portuguese before they go into a
//     sentence, because those catalogue words are not in COPY.
//
// NOTES, strings a reviewer should look at (key: why):
//   * sentence.crew ("{n} pessoas estão em órbita agora") and card/other lines with a number word: numberWords[2] is "dois", so
//     a count of exactly two would read "dois pessoas"; the station crew is never two, so it was left as is.
//   * card.articles ("O", "o") and values.belowBorder: English place names ("the South Pacific Ocean") are inserted after "o";
//     Portuguese cannot choose the right article for an English place name. Names the registry gives in English stay English.
//   * r12Navigate.the / theWord: the English list of names that take "the" cannot carry Portuguese genders; it is set to
//     placeholders that never match, so the button reads "Voltar para: {nome}".
//   * deep.inside / companion / back: the parent name comes from the registry in English; written "Dentro de: {parent}" to
//     avoid a preposition + article that depends on the name.
//   * cloud.gibsAcknowledgement is NASA's required acknowledgement text and is kept in English on purpose.
//   * drawing.* lines ("desenhado como ...") are fragments with no subject; they use the masculine ("desenhado"), which may
//     disagree with a feminine object (a sonda, a nave, a Lua).
//   * templates.satellite.whyLaunchedDays/Year ("lançado ..."), probe/telescope/comet fragments: same masculine default.
//   * templates.dso / exoplanet: the catalogue's own words (method, type of object when not in the table below) stay English.
//   * sentence.names: "a ISS", "a Tiangong" (feminine: estação); the code puts the first letter in capitals.
//   * tonight.skybar.timeTicks: "Anoit." "Meia" "Alva" are abbreviations for a three-tick strip.

export const META = {
  code: 'pt',
  name: 'Português (Brasil)',
  english: 'Portuguese (Brazil)',
  review: { status: 'agent-reviewed', by: [], note: 'Machine-translated, agent-reviewed against the English on 2026-11-14 (terms, numbers, units, names, slots), with the pages a search engine reads. Not native-reviewed yet (docs/TRANSLATING.md, Review).' },
};

// Colours of the stars (COPY.templates.star.colours) are adjectives for "estrela", so they take "uma".
const COLOURS = new Set(['azul', 'branco-azulada', 'branca', 'amarelo-esbranquiçada', 'amarela', 'laranja', 'vermelha']);
// Feminine nouns that do not end in -a / -ão / -dade; masculine nouns that do end in -a / -ão.
const FEMININE = new Set(['nuvem', 'nave', 'base', 'ponte', 'fonte', 'luz', 'torre', 'noite', 'classe', 'cratera', 'imagem', 'origem', 'viagem', 'órbita', 'depressão', 'estação', 'região', 'tempestade']);
const MASCULINE = new Set(['planeta', 'cometa', 'mapa', 'dia', 'sistema', 'programa', 'problema', 'tema', 'clima', 'diagrama', 'furacão', 'tufão', 'vulcão', 'avião', 'balão', 'magnetar', 'pulsar', 'quasar']);

// The English type phrases of the deep-sky catalogue (data/dso.json `typeText`), lowercased, in Portuguese.
const TYPES = {
  'supernova remnant': 'remanescente de supernova',
  'globular cluster': 'aglomerado globular',
  'open cluster': 'aglomerado aberto',
  'nebula with cluster': 'nebulosa com aglomerado',
  'h ii region nebula with cluster': 'região H II com aglomerado',
  'h ii region nebula': 'região H II',
  'milky way star cloud': 'nuvem estelar da Via Láctea',
  'planetary nebula': 'nebulosa planetária',
  'spiral galaxy': 'galáxia espiral',
  'dwarf elliptical galaxy': 'galáxia elíptica anã',
  'optical double': 'dupla óptica',
  'elliptical galaxy': 'galáxia elíptica',
  'barred spiral galaxy': 'galáxia espiral barrada',
  'asterism': 'asterismo',
  'diffuse nebula': 'nebulosa difusa',
  'starburst galaxy': 'galáxia com surto de formação de estrelas',
  'lenticular galaxy': 'galáxia lenticular',
  'barred irregular galaxy': 'galáxia irregular barrada',
  'dwarf irregular galaxy': 'galáxia irregular anã',
  'dwarf spheroidal galaxy': 'galáxia esferoidal anã',
  'dwarf irregular starburst galaxy': 'galáxia irregular anã com surto de formação de estrelas',
  'transition dwarf galaxy, part irregular, part spheroidal': 'galáxia anã de transição, em parte irregular, em parte esferoidal',
  'transition dwarf galaxy, part spheroidal, part irregular': 'galáxia anã de transição, em parte esferoidal, em parte irregular',
  'barred irregular galaxy, seen edge-on': 'galáxia irregular barrada, vista de perfil',
  'ultra-faint dwarf galaxy, or perhaps a star cluster': 'galáxia anã ultrafraca, ou talvez um aglomerado de estrelas',
  'ultra-faint dwarf galaxy': 'galáxia anã ultrafraca',
  'spiral galaxy, seen nearly edge-on and bursting with new stars': 'galáxia espiral, vista quase de perfil e cheia de estrelas novas',
  'peculiar galaxy with a giant black hole firing radio jets': 'galáxia peculiar com um buraco negro gigante lançando jatos de rádio',
  'emission nebula': 'nebulosa de emissão',
  'pair of open clusters': 'par de aglomerados abertos',
  'spiral galaxy seen exactly edge-on': 'galáxia espiral vista exatamente de perfil',
  'dark nebula': 'nebulosa escura',
  'young open cluster in an emission nebula': 'aglomerado aberto jovem em uma nebulosa de emissão',
  'reflection nebula': 'nebulosa de reflexão',
  'reflection and emission nebula': 'nebulosa de reflexão e de emissão',
  'spiral galaxy seen edge-on': 'galáxia espiral vista de perfil',
  'barred spiral galaxy seen edge-on': 'galáxia espiral barrada vista de perfil',
  'spiral galaxy seen face-on': 'galáxia espiral vista de frente',
  'barred spiral galaxy seen nearly edge-on': 'galáxia espiral barrada vista quase de perfil',
  'pair of colliding galaxies': 'par de galáxias em colisão',
  'barred spiral galaxy — the one we live in': 'galáxia espiral barrada — a nossa',
};

export const RULES = {
  /** The decimal sign: copy/en.js num() reads it ("1,5"). */
  decimal: ',',
  /** "um" or "uma" for a Portuguese type phrase, by its first word: "uma galáxia", "um aglomerado de estrelas", "uma tempestade tropical". */
  article(phrase) {
    const first = String(phrase || '').trim().toLowerCase().split(/\s+/)[0] || '';
    if (COLOURS.has(first)) return 'uma';
    if (MASCULINE.has(first)) return 'um';
    if (FEMININE.has(first)) return 'uma';
    if (/(?:a|ade|ção|são|gem|ie|ice)$/.test(first)) return 'uma';
    return 'um';
  },
  /** A catalogue's English type phrase in Portuguese, for the middle of a sentence; a phrase not in the table is lowered as English is. */
  typeWords(text) {
    const s = String(text || '').trim();
    const key = s.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TYPES, key)) return TYPES[key];
    return s.split(/(\s+)/).map((w) => (/^[A-Z0-9]{1,3}$/.test(w) ? w : w.toLowerCase())).join('');
  },
  /** Portuguese (Brazil) says "um" for |n| < 2 ("0 hora", "1,5 hora" in speech is rare here but follows the brief), else the plural. */
  plural(n, one, many) {
    return Math.abs(Number(n)) < 2 ? one : many;
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "Montando o céu…",
    "bootEarth": "Posicionando a Terra…",
    "bootCatalogues": "Lendo os catálogos…",
    "tagline": "Tudo o que se move ao redor da Terra, onde realmente está, agora mesmo.",
    "sceneSelected": "Um mapa do espaço desenhado em posições reais, com {name} selecionado: a ficha dele, no painel ao lado do mapa, diz o que ele é."
  },
  "compareText": {
    "size": [
      "do tamanho de uma torradeira",
      "do tamanho de uma máquina de lavar",
      "do tamanho de um carro",
      "do tamanho de um ônibus",
      "do tamanho de uma casa",
      "tão alto quanto um prédio de 15 andares",
      "tão alto quanto um prédio de 25 andares",
      "do tamanho de um campo de futebol",
      "tão alto quanto uma torre de 40 andares",
      "do tamanho de um navio de cruzeiro",
      "tão alto quanto o prédio mais alto da Terra",
      "do tamanho de uma montanha pequena",
      "do tamanho de uma cidade"
    ],
    "magnitude": [
      "tão brilhante quanto a Lua cheia",
      "mais brilhante que qualquer estrela ou planeta",
      "tão brilhante quanto Vênus",
      "tão brilhante quanto as estrelas mais brilhantes",
      "tão brilhante quanto uma estrela comum",
      "mal visível em um lugar escuro",
      "fraco demais para ser visto sem telescópio"
    ],
    "speed": [
      "{n} km/h, a velocidade de uma rodovia",
      "{n} km/h, mais ou menos a velocidade de um avião de passageiros",
      "{n} km/h, mais rápido que a bala de um fuzil",
      "{n} km/h, cerca de {m} km por minuto"
    ],
    "driving": "a {n} km de altura, cerca de {h} {word} de carro se a estrada subisse reta",
    "hour": "hora",
    "hours": "horas",
    "up": "a {n} km de altura",
    "moon": "{ld}× a distância da Lua",
    "lightMinutes": "a {lt} minutos-luz",
    "lightHours": "a {lh} horas-luz",
    "compass": [
      "norte",
      "nor-nordeste",
      "nordeste",
      "lés-nordeste",
      "leste",
      "lés-sudeste",
      "sudeste",
      "su-sudeste",
      "sul",
      "su-sudoeste",
      "sudoeste",
      "oés-sudoeste",
      "oeste",
      "oés-noroeste",
      "noroeste",
      "nor-noroeste"
    ]
  },
  "numberWords": [
    "nenhum",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
    "dez"
  ],
  "shell": {
    "sideLabel": "Explorar",
    "back": "Explorar",
    "backLabel": "Voltar para Explorar",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "Mostrar o painel",
    "collapse": "Ocultar o painel",
    "topLabel": "Busca e ferramentas"
  },
  "tabs": {
    "label": "Onde",
    "earth": "Terra",
    "planets": "Planetas",
    "stars": "Estrelas",
    "tonight": "Esta noite"
  },
  "rightNow": {
    "title": "Agora mesmo",
    "storms": "{n} ciclones ativos; o mais forte é {name}.",
    "stormOne": "Um ciclone ativo: {name}.",
    "clouds": "As nuvens de hoje",
    "people": "Pessoas no espaço",
    "iss": "ISS",
    "tiangong": "Tiangong",
    "crewAt": "{n} na {name}"
  },
  "statusLine": {
    "reading": "Lendo as fontes",
    "read": "{n} lidas nesta visita",
    "readOne": "Uma lida nesta visita",
    "stale": "{n} desatualizadas",
    "failed": "{n} não puderam ser lidas",
    "oldest": "a mais antiga, {age}",
    "open": "Abrir as fontes",
    "label": "{text}. Abrir as fontes",
    "offline": "Sem conexão: mostrando cópias salvas {age}",
    "offlineNone": "Sem conexão: nenhuma cópia salva neste aparelho"
  },
  "mission": {
    "title": "A missão",
    "count": "{i} de {n}",
    "navLabel": "Os eventos de {name}",
    "prev": "Evento anterior",
    "next": "Evento seguinte",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (previsto)",
    "go": "Ir para este momento",
    "goTitle": "Ajustar o relógio para este momento e enquadrá-lo",
    "here": "O relógio está neste momento. “Ao vivo” o traz de volta.",
    "noteSite": "O mapa pode mostrar este lugar naquele dia, com a luz daquele dia.",
    "notePath": "O mapa guarda a trajetória dele para aquele dia.",
    "noteCruise": "Não temos trajetória para aquele dia: {name} é desenhado na reta de volta a partir de onde foi medido agora, com precisão de cerca de uma unidade astronômica.",
    "noteNone": "O mapa não tem trajetória de {name} para aquele dia, então o relógio fica onde está.",
    "noteNoneWorld": "O mapa não tem trajetória de {name} para aquele dia, então o relógio fica onde está. O mundo que ele encontrou é desenhado para qualquer data.",
    "seeWorld": "Ver {world} naquele dia",
    "seeWorldTitle": "Ajustar o relógio para aquele dia e ir até {world}. {name} em si não é desenhado lá",
    "all": "Todos os {n} eventos",
    "fewer": "Ocultar a lista",
    "source": "Datas e valores: ",
    "unknown": "Esse link cita um evento que este mapa não tem."
  },
  "tripCard": {
    "title": "Viagens",
    "meta": "{n} paradas · {m} min",
    "metaOne": "Uma parada · {m} min",
    "planning": "Calculando as paradas",
    "starting": "Começando…",
    "cannotRun": "Não pode rodar agora",
    "offOne": "Uma viagem não pode rodar agora",
    "offMany": "{n} viagens não podem rodar agora",
    "offWhy": "{line}: {reason}",
    "all": "Todas as {n} viagens",
    "fewer": "Menos viagens",
    "onItsOwn": "Deixar rodando",
    "onItsOwnTitle": "Viagens uma atrás da outra, até você assumir o controle",
    "justWatch": "Só assistir",
    "reelLength": "{m} min por volta",
    "drift": "À deriva",
    "driftLength": "sem fim",
    "driftTitle": "A câmera vai passando de uma coisa para a próxima"
  },
  "explore": {
    "worldsTitle": "Os mundos",
    "worldsDrawn": "Planetas desenhados como pontos, maiores do que são.",
    "farTitle": "Lugares distantes",
    "systemsTitle": "Sistemas estelares",
    "systemsMild": "Planetas perto da zona habitável",
    "systemsExtreme": "Sistemas extremos",
    "exoRow": "Planetas de outras estrelas",
    "exoShow": "mostrar",
    "exoHide": "ocultar",
    "exoTitle": "Marca todas as estrelas com planetas conhecidos",
    "lightYears": "{n} al",
    "au": "{n} UA"
  },
  "rail": {
    "label": "Ferramentas",
    "show": "O que mostrar (L)",
    "share": "Compartilhar (P)",
    "more": "Mais ferramentas",
    "moreLabel": "Mais",
    "menuShare": "Compartilhar",
    "menuHide": "Ocultar os painéis",
    "menuGitHub": "Código no GitHub",
    "blog": "Blog",
    "blogHref": "https://blog.spaceradar.ai/",
    "models": "Modelos",
    "modelsHref": "https://models.spaceradar.ai/",
    "video": "Vídeo",
    "videoHref": "https://video.spaceradar.ai/",
    "tour": "Fazer o tour",
    "menuTour": "Fazer o tour"
  },
  "timePill": {
    "label": "Hora",
    "when": "{date} {time} UTC",
    "live": "VIVO · {when}",
    "held": "{when} · parado",
    "away": "{when} · {off}",
    "unknown": "Hora desconhecida",
    "prev": "‹",
    "next": "›",
    "prevTitle": "Voltar no tempo",
    "nextTitle": "Avançar no tempo",
    "backToLive": "Ao vivo",
    "backToLiveTitle": "Voltar ao tempo real, agora",
    "rate": "{n}×",
    "rateTitle": "Velocidade {n}×. Pressione para {next}×",
    "hold": "Clique para parar o tempo, arraste para se mover por ele",
    "run": "Clique para o tempo correr, arraste para se mover por ele",
    "localTitle": "Sua hora: {time}, {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "1 min",
      "hour": "1 h",
      "day": "1 dia",
      "event": "Evento"
    },
    "unitWords": {
      "minute": "um minuto",
      "hour": "uma hora",
      "day": "um dia",
      "event": "um evento"
    },
    "prevEvent": "O evento anterior",
    "nextEvent": "O próximo evento",
    "noEventBack": "Nenhum evento anterior na linha do tempo.",
    "noEventOn": "Nenhum evento posterior na linha do tempo.",
    "moonMark": "{phase}, {date}",
    "sunMark": "{what} onde você está, {date}",
    "sunMarkGuess": "{what} no lugar que supusemos ser o seu, {date}",
    "sunWords": {
      "sunrise": "Nascer do Sol",
      "sunset": "Pôr do Sol"
    },
    "unitTitle": "Passos de {unit}. Pressione para {next}",
    "tapeLabel": "Linha do tempo. Arraste-a ou use as setas do teclado",
    "tapeTitle": "Arraste para se mover pelo tempo",
    "now": "agora",
    "nowTitle": "Voltar para agora",
    "rough": "impreciso",
    "roughTitle": "Passada uma semana a partir de agora, o lugar de um satélite na órbita é só aproximado",
    "roughSay": "Os lugares dos satélites são aproximados tão longe de agora.",
    "worlds": "Planetas e luas se mantêm por séculos.",
    "markTitle": "{what}. Pressione para ir até lá",
    "endTitle": "A linha do tempo termina aqui: um mês para trás, um ano para a frente"
  },
  "punctuation": {
    "comma": ", ",
    "dot": ".",
    "separator": " · ",
    "listJoin": ", ",
    "dash": " — ",
    "colon": ": ",
    "ellipsis": "…",
    "sentenceJoin": ". "
  },
  "worlds": {
    "sun": "o Sol",
    "mercury": "Mercúrio",
    "venus": "Vênus",
    "earth": "a Terra",
    "moon": "a Lua",
    "mars": "Marte",
    "jupiter": "Júpiter",
    "saturn": "Saturno",
    "uranus": "Urano",
    "neptune": "Netuno",
    "pluto": "Plutão",
    "io": "Io",
    "europa": "Europa",
    "ganymede": "Ganimedes",
    "callisto": "Calisto",
    "phobos": "Fobos",
    "deimos": "Deimos",
    "enceladus": "Encélado",
    "titan": "Titã",
    "triton": "Tritão",
    "charon": "Caronte"
  },
  "worldFacts": {
    "cite": {
      "pluto": "posição calculada com o Astronomy Engine (Don Cross, licença MIT), que acompanha Plutão sob a atração do Sol e dos planetas gigantes; raio do quadro de informações de Plutão na Wikipédia, o que ele é, da NASA Science, sua cor e como vê-lo, da Wikipédia, tudo lido em 2026-09-22",
      "io": "posição calculada com o Astronomy Engine (Don Cross, licença MIT): Júpiter, mais a teoria L1.2 das suas luas (Lainey, Duriez e Vienne); raio da tabela de dados dos satélites de Júpiter da NASA, o que ele é, da NASA Science, sua cor e como vê-lo, da Wikipédia, tudo lido em 2026-09-22",
      "europa": "posição calculada com o Astronomy Engine (Don Cross, licença MIT): Júpiter, mais a teoria L1.2 das suas luas (Lainey, Duriez e Vienne); raio da tabela de dados dos satélites de Júpiter da NASA, o que ela é, da NASA Science, sua cor e como vê-la, da Wikipédia, tudo lido em 2026-09-22",
      "ganymede": "posição calculada com o Astronomy Engine (Don Cross, licença MIT): Júpiter, mais a teoria L1.2 das suas luas (Lainey, Duriez e Vienne); raio da tabela de dados dos satélites de Júpiter da NASA, o que ele é, da NASA Science, sua cor e como vê-lo, da Wikipédia, tudo lido em 2026-09-22",
      "callisto": "posição calculada com o Astronomy Engine (Don Cross, licença MIT): Júpiter, mais a teoria L1.2 das suas luas (Lainey, Duriez e Vienne); raio da tabela de dados dos satélites de Júpiter da NASA, o que ela é, da NASA Science, sua cor e como vê-la, da Wikipédia, tudo lido em 2026-09-22",
      "phobos": "posição: Marte pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 6 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, brilho da tabela de dados de Marte da NASA, o que ele é e sua cor, da NASA Science, tudo lido em 2026-09-22",
      "deimos": "posição: Marte pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 120 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, brilho da tabela de dados de Marte da NASA, o que ele é e sua cor, da NASA Science, tudo lido em 2026-09-22",
      "enceladus": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 1 480 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, o que ele é e sua cor, da NASA Science, como vê-lo, da Wikipédia, tudo lido em 2026-09-22",
      "titan": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 840 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, o que ele é, da NASA Science, o pouso da Huygens, sua cor e como vê-lo, da Wikipédia, tudo lido em 2026-09-22",
      "triton": "posição: Netuno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 10 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, o que ele é, da NASA Science, sua cor e brilho, da Wikipédia, tudo lido em 2026-09-22",
      "charon": "posição: Plutão pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 1 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, brilho da tabela de dados de Plutão da NASA, o que ele é e sua cor, da NASA Science, tudo lido em 2026-09-22",
      "mimas": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 700 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Saturno da NASA, o que ele é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
      "tethys": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 120 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Saturno da NASA, o que ela é, da NASA Science, sua cor e brilho, da Wikipédia, tudo lido em 2026-09-22",
      "dione": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 240 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Saturno da NASA, sua cor, da NASA Science, o que ela é e seu brilho, da Wikipédia, tudo lido em 2026-09-22",
      "rhea": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 200 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Saturno da NASA, o que ela é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
      "iapetus": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 6 800 km entre 2000 e 2050, o que equivale a 0,19% da sua órbita; raio dos parâmetros físicos de satélites do JPL, os dois albedos da tabela de dados dos satélites de Saturno da NASA, o que ele é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
      "miranda": "posição: Urano pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 120 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Urano da NASA, o que ela é, da NASA Science, sua cor e brilho, da Wikipédia, tudo lido em 2026-09-22",
      "ariel": "posição: Urano pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 120 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Urano da NASA, o que ela é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
      "umbriel": "posição: Urano pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 410 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Urano da NASA, o que ela é, da NASA Science, sua cor e brilho, da Wikipédia, tudo lido em 2026-09-22",
      "titania": "posição: Urano pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 1 000 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Urano da NASA, o que ela é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
      "oberon": "posição: Urano pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 1 230 km entre 2000 e 2050; raio dos parâmetros físicos de satélites do JPL, albedo da tabela de dados dos satélites de Urano da NASA, o que ele é, da NASA Science, sua cor e brilho, da Wikipédia, tudo lido em 2026-09-22"
    }
  },
  "worldView": {
    "withParent": "{parent} é desenhado {n} vezes mais largo no céu do que parece, para que você o encontre, e {name} é desenhado ao redor dele na mesma escala: a distância dele até {parent} é ampliada na mesma medida.",
    "withParentFloor": "O próprio {name} é desenhado ainda maior, senão ficaria pequeno demais para ser visto.",
    "crowded": "{name} não é desenhado tão largo assim: {near} está a apenas {deg} graus dele neste céu, e um disco desse tamanho o cobriria."
  },
  "stars": {
    "unnamed": "Uma estrela sem nome (HYG {n})"
  },
  "systems": {
    "mercuryRing": "A órbita de Mercúrio, para comparar a escala"
  },
  "ladder": {
    "title": "Quão longe",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, ainda carregando",
    "weShowTitle": "O que este mapa desenha do que se conhece",
    "weShowRow": "{n} {what} — de {of}",
    "edge": "A borda do mapa",
    "edgeHow": "voar até lá",
    "edgeTitle": "Um voo daqui até a borda do que este mapa desenha",
    "home": "A Terra",
    "homeHow": "voltar para casa",
    "homeTitle": "Um voo daqui de volta à Terra",
    "flightOff": "Daqui não: vá antes para Terra, Planetas ou Estrelas"
  },
  "sceneNote": {
    "refused": "Não foi possível ler os satélites.",
    "refusedTitle": "Não foi possível ler, nesta conexão, o CelesTrak, que publica as órbitas. A Lua, os planetas, as estrelas e as viagens que não precisam de satélites continuam funcionando.",
    "why": "Fontes",
    "close": "×",
    "closeTitle": "Fechar este aviso"
  },
  "link": {
    "unknownVersion": "Este link é de um mapa mais novo. Mostrando a vista padrão.",
    "unknownTrip": "Essa viagem não está mais no mapa. Mostrando a vista padrão.",
    "unknownAt": "Esse objeto não está neste mapa; mostrando a vista padrão.",
    "unknownStage": "Não dá para centrar o mapa aí. Mostrando a vista padrão."
  },
  "share": {
    "link": "Compartilhar",
    "linkTitle": "Compartilhar esta vista: o cartão-postal, o link e algumas linhas sobre ela",
    "title": "Compartilhar",
    "close": "Fechar",
    "pictureAlt": "O cartão-postal: esta vista desenhada de novo em tamanho de impressão, com a legenda",
    "drawing": "Desenhando o cartão-postal…",
    "noPicture": "Não foi possível desenhar o cartão-postal agora.",
    "withTag": "Etiqueta na seleção",
    "linkLabel": "Link",
    "copyLink": "Copiar o link",
    "textLabel": "Texto",
    "lookingUp": "Procurando na Wikipédia…",
    "wikiSource": "O artigo da Wikipédia que o texto cita",
    "noWiki": "Sem texto da Wikipédia: publicação mais curta.",
    "attribution": "Da Wikipédia, CC BY-SA 4.0",
    "native": "Compartilhar…",
    "nativeTitle": "O compartilhamento do seu aparelho, com o cartão-postal onde ele aceitar imagem",
    "nativeFailed": "O compartilhamento não abriu; copie ou baixe",
    "copy": "Copiar texto",
    "copyTitle": "Copiar o texto e o link, prontos para colar em uma publicação",
    "copied": "Texto e link copiados",
    "linkCopied": "Link copiado",
    "copyRefused": "Cópia recusada; o texto está selecionado para copiar",
    "jpeg": "Baixar JPEG",
    "jpegTitle": "Salvar o cartão-postal como imagem JPEG, 6 por 4 polegadas a 300 pontos por polegada",
    "pdf": "Baixar PDF",
    "pdfTitle": "Salvar o cartão-postal como PDF de uma página, 6 por 4 polegadas, para imprimir",
    "email": "E-mail",
    "emailTitle": "Escrever um e-mail com o texto e o link",
    "emailNote": "E-mail sem imagem: use Compartilhar… ou baixe.",
    "networksLabel": "Publicar em",
    "networkTitle": "Abrir {network} com esta publicação, em uma nova aba",
    "networkLabel": "Publicar em {network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}, no Space Radar",
    "failed": "Não foi possível abrir o compartilhamento agora",
    "mark": "spaceradar.ai",
    "photo": "Modo foto",
    "photoTitle": "Compor uma imagem: tudo oculto, uma moldura, uma legenda",
    "embed": "Incorporar",
    "embedTitle": "Copiar o código que coloca esta vista ao vivo em uma página da web",
    "embedCopied": "Código de incorporação copiado",
    "embedRefused": "A cópia foi recusada agora",
    "embedFrameTitle": "{name}, ao vivo no Space Radar",
    "textRow": "Texto da publicação"
  },
  "embed": {
    "open": "Abrir no Space Radar",
    "openTitle": "Abrir esta vista no mapa completo, em uma nova aba",
    "barLabel": "Space Radar, incorporado",
    "stationUnread": "Mostrando a Terra: não foi possível ler a posição da estação"
  },
  "density": {
    "panelTitle": "Densidade",
    "regular": "Normal",
    "compact": "Compacta",
    "auto": "Automática",
    "autoCompact": "Compacta agora, porque esta janela é baixa.",
    "autoRegular": "Normal agora; Compacta com janela de até 800 px de altura."
  },
  "nextList": {
    "justHappened": "Acabou de acontecer",
    "justHappenedTitle": "Lançamentos e reentradas dos últimos sete dias",
    "calendar": "Calendário",
    "calendarTitle": "Adicionar “{title}” ao seu calendário: baixa um arquivo .ics",
    "calendarSaved": "{file} salvo",
    "calendarFailed": "Não foi possível criar o arquivo de calendário",
    "sameName": "{name} ({id})",
    "title": "Em breve",
    "showAll": "Mostrar todos os {n}",
    "showFewer": "Mostrar menos",
    "now": "por volta de agora",
    "inMinutes": "em {n} min",
    "inHours": "em {n} h",
    "todayAt": "hoje às {time}",
    "tomorrowAt": "amanhã às {time}",
    "launch": "{name} decola {when}",
    "launchRough": "{name} decola {when}, mais ou menos: a data ainda não está definida",
    "approach": "{name} passa pela Terra {when}, a {ld}× a distância da Lua",
    "approachNoDistance": "{name} passa pela Terra {when}",
    "sizeM": "Tem {n} m de largura",
    "sizeKm": "Tem {n} km de largura",
    "sizeRangeM": "Cerca de {lo} a {hi} m de largura, estimado pelo brilho",
    "sizeRangeKm": "Cerca de {lo} a {hi} km de largura, estimado pelo brilho",
    "sizeMixed": "Cerca de {lo} m a {hi} km de largura, estimado pelo brilho",
    "perihelion": "{name} fica o mais perto do Sol {when}",
    "pass": "{name} passa sobre você {when}",
    "train": "Um trem de {n} satélites passa sobre você {when}",
    "aurora": "A NOAA prevê {word} {when} (Kp {kp})",
    "auroraNow": "Uma tempestade geomagnética está em andamento: {word} (Kp {kp})",
    "shower": "A chuva de meteoros {name} tem pico por volta de {date}, com até {zhr} por hora sob um céu escuro",
    "showerMoon": "A chuva de meteoros {name} tem pico por volta de {date}, com até {zhr} por hora sob um céu escuro, e a Lua estará {pct}% iluminada naquela noite",
    "showerNoMoon": "A chuva de meteoros {name} tem pico por volta de {date}, com até {zhr} por hora sob um céu escuro, e a Lua estará quase nova",
    "radiantHigh": "Do seu lugar, o radiante fica mais alto por volta das {time}",
    "radiantLow": "Do seu lugar, o radiante fica baixo a noite toda, então espere bem menos meteoros",
    "radiantNeverUp": "Do seu lugar, o radiante fica abaixo do horizonte naquela noite",
    "eclipseKinds": {
      "total": "Total",
      "annular": "Anular",
      "partial": "Parcial",
      "hybrid": "Híbrido",
      "penumbral": "Penumbral"
    },
    "solarEclipseTitle": "Eclipse solar {kind}",
    "lunarEclipseTitle": "Eclipse lunar {kind}",
    "solarEclipse": "Eclipse solar {kind} em {date}: a sombra da Lua cai mais fundo {where}",
    "solarEclipseGrazing": "Eclipse solar {kind} em {date}, visto só do extremo norte ou do extremo sul",
    "lunarEclipse": "Eclipse lunar {kind} em {date}, com a Lua na sombra da Terra para todos que puderem vê-la",
    "lunarEclipsePenumbral": "Eclipse lunar {kind} em {date}: a Lua só escurece um pouco, na sombra externa da Terra",
    "seasonTitles": {
      "march": "Equinócio de março",
      "june": "Solstício de junho",
      "september": "Equinócio de setembro",
      "december": "Solstício de dezembro"
    },
    "seasons": {
      "march": "Equinócio de março em {date}: dia e noite quase iguais em todo lugar",
      "june": "Solstício de junho em {date}: o dia mais longo no norte, o mais curto no sul",
      "september": "Equinócio de setembro em {date}: dia e noite quase iguais em todo lugar",
      "december": "Solstício de dezembro em {date}: o dia mais longo no sul, o mais curto no norte"
    },
    "solstice": "{title} em {date}",
    "equinox": "{title} em {date}",
    "eclipseNear": "perto de {city}",
    "eclipseFrom": "a cerca de {km} km de {city}",
    "eclipseLocal": "Do seu lugar: começa às {begin}, máximo às {peak} com {pct}% do Sol coberto, termina às {end}",
    "eclipseLocalTotal": "Do seu lugar: começa às {begin}, totalidade às {peak}, fim às {end}",
    "eclipseNotVisible": "Não é visível de onde você está",
    "eclipseBelowHorizon": "Do seu lugar, o Sol fica abaixo do horizonte enquanto ele acontece",
    "classOf": {
      "launch": "Um plano: o horário que a empresa de lançamento pretende cumprir, que pode mudar",
      "approach": "Calculado pelo JPL da NASA a partir da órbita medida do asteroide",
      "perihelion": "Calculado a partir da órbita publicada do cometa",
      "shower": "A data anual de costume; o pico varia cerca de um dia",
      "aurora": "Previsão da NOAA, de três em três horas",
      "auroraNow": "Medido pela NOAA nas últimas horas",
      "pass": "Calculado aqui a partir de elementos orbitais medidos {age}",
      "passNoAge": "Calculado aqui a partir de elementos orbitais",
      "eclipse": "Calculado aqui, ao minuto, a partir do movimento do Sol e da Lua",
      "season": "Calculado aqui, ao minuto, a partir de onde o Sol está",
      "conjunction": "Calculado aqui para o seu lugar, no momento de maior proximidade enquanto os dois estão no céu escuro"
    },
    "row": {
      "conjunctionTitle": "{a} e {b}",
      "conjunction": "{when} · a {sep}° de distância, {height} no {dir}",
      "conjunctionValue": "{sep}°",
      "low": "baixo",
      "mid": "a meia altura",
      "high": "alto",
      "launch": "Decola {when} · planejado",
      "launchRough": "{when}, mais ou menos · data indefinida",
      "approach": "Passa pela Terra {when}",
      "approachValue": "{ld}× a Lua",
      "approachSized": "Passa pela Terra {when} · {size}",
      "sizeM": "{n} m",
      "sizeKm": "{n} km",
      "sizeRangeM": "cerca de {lo} a {hi} m",
      "sizeRangeKm": "cerca de {lo} a {hi} km",
      "perihelion": "Mais perto do Sol {when}",
      "pass": "Passa sobre você {when}",
      "trainTitle": "Trem de {n} Starlink",
      "auroraTitle": "Previsão de aurora",
      "auroraNowTitle": "Tempestade geomagnética agora",
      "aurora": "Previsão da NOAA, {when}",
      "auroraNow": "Medido pela NOAA nas últimas horas",
      "kp": "Kp {kp}",
      "showerTitle": "Meteoros {name}",
      "shower": "Pico por volta de {date} · até {zhr} por hora",
      "eclipse": "{date} · calculado ao minuto",
      "eclipseHere": "{date} · daqui, das {begin} às {end}",
      "eclipseNotHere": "{date} · não visível daqui"
    },
    "none": "Nada em breve no que foi carregado.",
    "notLoaded": "Não carregado, por isso não listado: {layers}."
  },
  "groundTrack": {
    "tick": "+{n} min",
    "label": "Acompanhar",
    "rideAlong": "Pegar carona",
    "rideAlongTitle": "Colocar a câmera logo atrás dele, olhando para a frente ao longo da trajetória. Arraste para parar.",
    "lookBeside": "Olhar de lado",
    "showTrack": "Desenhar a trilha no solo",
    "hideTrack": "Ocultar a trilha no solo",
    "highNote": "A trilha dele sobre o solo não é desenhada por conta própria tão no alto: ele quase não se mexe.",
    "trackNote": "A linha no globo é o solo abaixo dele, 45 minutos para trás (tracejada) e 90 para a frente, com uma marca a cada 5 minutos."
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "Clima espacial: {level} — medido {age}, {via}.",
    "forecastOnly": "Clima espacial: {level} — uma previsão, não uma medição; {via}.",
    "stale": "Essa leitura é mais antiga do que a NOAA garante; trate-a como um palpite.",
    "stormComing": "A NOAA prevê que suba para Kp {kp}.",
    "couldNotLook": "Clima espacial: não foi possível consultar — {why}",
    "couldNotLook0": "Clima espacial: não foi possível consultar.",
    "justNow": "agora há pouco",
    "currentBin": "para o período atual de três horas",
    "aMinuteAgo": "há um minuto",
    "minutesAgo": "há {n} minutos",
    "anHourAgo": "há uma hora",
    "hoursAgo": "há {n} horas",
    "aDayAgo": "há um dia",
    "daysAgo": "há {n} dias",
    "ageUnknown": "em um horário que a NOAA não informou",
    "viaLive": "NOAA SWPC, lido ao vivo",
    "viaSnapshot": "NOAA SWPC, de uma cópia nossa",
    "words": {
      "unknown": "sem leitura",
      "quiet": "calmo",
      "unsettled": "instável",
      "active": "ativo",
      "minorStorm": "uma tempestade fraca — aurora possível no extremo norte e no extremo sul",
      "moderateStorm": "uma tempestade moderada — aurora provável em latitudes altas",
      "strongStorm": "uma tempestade forte — aurora longe dos polos, satélites desviados da rota",
      "severeStorm": "uma tempestade severa",
      "extremeStorm": "uma tempestade extrema"
    }
  },
  "chooser": {
    "label": "Coisas sob o seu dedo",
    "hint": "{n} aqui. Toque em uma, ou toque no céu para fechar."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "Fechar",
    "closeTitle": "Fechar esta ficha (Esc)",
    "it": "Isto",
    "articles": [
      "O",
      "o"
    ],
    "leadVerbs": [
      "é",
      "foi"
    ],
    "makeCentre": "Fazer de {name} o centro do mapa",
    "isCentre": "Este é o centro do mapa",
    "centreShort": "Centrar o mapa aqui",
    "ownPage": "Página própria",
    "ownPageTitle": "Uma página sobre ele, com link para compartilhar, em uma nova aba",
    "isCentreShort": "Centrado aqui",
    "comparisonsLabel": "Para ter uma noção",
    "rightNowLabel": "Agora mesmo",
    "seeItLabel": "Veja daqui",
    "actionsLabel": "O que você pode fazer",
    "unknownName": "Objeto sem nome",
    "unknownKind": "{name} está no mapa, mas não sabemos que tipo de objeto é",
    "rows": {
      "altitude": "Altura acima do solo",
      "speed": "Velocidade",
      "groundPoint": "Passando sobre",
      "below": "Embaixo dele agora",
      "fromYou": "Distância de você",
      "fromGuess": "Distância de {place}, nosso palpite para o seu lugar",
      "distanceFromEarth": "Distância da Terra",
      "distanceFromSun": "Distância do Sol",
      "lightLeft": "A luz dele partiu",
      "sunlight": "Agora ele está",
      "hostStar": "A estrela dele",
      "across": "Largura",
      "mass": "Massa",
      "spin": "Uma volta leva",
      "source": "Lido de",
      "whySource": "Por que se sabe, lido de",
      "widthSource": "Largura lida de",
      "distanceNote": "Mais ou menos essa distância",
      "objectType": "O que é",
      "constellation": "Constelação",
      "distanceRange": "Distância, melhores estimativas",
      "planetRadius": "Largura, em Terras",
      "planetMass": "Massa, em Terras",
      "yearLength": "Um ano lá",
      "found": "Descoberto",
      "catalogueCopy": "Cópia do catálogo",
      "spectralType": "Tipo de estrela",
      "brightness": "Brilho aparente",
      "luminosity": "Luz emitida",
      "starWidth": "Largura",
      "catalogue": "Catálogo",
      "lightTime": "Tempo de rádio, em cada sentido",
      "nextPass": "Próxima passagem sobre você",
      "crew": "Pessoas a bordo",
      "operator": "Operado por",
      "launched": "Lançado",
      "ended": "Terminou",
      "pathEnds": "A trajetória termina",
      "pathBegins": "A trajetória começa",
      "period": "Uma volta leva",
      "location": "Onde está",
      "onWorld": "Pousado sobre",
      "orbiting": "Orbita",
      "heightAbove": "Altura sobre {world}",
      "closestApproach": "Mais perto da Terra",
      "moons": "Luas",
      "perihelion": "Mais perto do Sol",
      "magnitude": "Brilho",
      "phase": "Fase",
      "liftoff": "Decolagem",
      "pad": "De",
      "destination": "Rumo a",
      "whereabouts": "Onde está",
      "lastSeen": "Última posição conhecida",
      "stormNow": "No último aviso",
      "stormWind": "Vento mais forte na trajetória",
      "stormAdvisory": "Último aviso",
      "stormCentre": "O centro dele",
      "stormAgency": "Aviso de",
      "stormAlert": "Nível de alerta do GDACS"
    },
    "values": {
      "km": "{n} km",
      "kmh": "{n} km/h",
      "belowBorder": "perto da fronteira entre {a} e {b}",
      "belowLand": "terra firme",
      "belowWater": "mar aberto",
      "stormWind": "{n} km/h, incluindo a previsão",
      "stormWindCategory": "{n} km/h, categoria {cat}, incluindo a previsão",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "força de furacão",
        "typhoon": "força de tufão",
        "cyclone": "força de ciclone",
        "storm": "tempestade tropical",
        "depression": "depressão tropical"
      },
      "stormAlert": {
        "green": "verde",
        "orange": "laranja",
        "red": "vermelho"
      },
      "launchedAgo": "há {n} dias, em {date}",
      "au": "{n} unidades astronômicas",
      "lightYears": "{n} anos-luz",
      "inSunlight": "na luz do Sol",
      "inShadow": "na sombra da Terra",
      "yearsAgo": "há {n} anos",
      "monthsAgo": "há {n} meses",
      "suns": "{n}× o Sol",
      "sunsWide": "{n}× o Sol, estimado",
      "sunsWideMeasured": "{n}× o Sol, medido",
      "earths": "{n}× a Terra",
      "lightYearsRange": "{lo} a {hi} anos-luz",
      "kmRange": "{lo} a {hi} km",
      "noMoonsKnown": "nenhuma conhecida",
      "sunsRange": "{lo} a {hi}× o Sol",
      "millionSuns": "{n} milhões de Sóis",
      "billionSuns": "{n} bilhões de Sóis",
      "milliseconds": "{n} milissegundos",
      "billionYearsAgo": "há {n} bilhões de anos",
      "millionYearsAgo": "há {n} milhões de anos",
      "days": "{n} dias",
      "hours": "{n} horas",
      "yearByMethod": "{year}, {method}",
      "asOf": "em {date}",
      "magnitude": "magnitude {n}",
      "lunar": "{n}× a distância da Lua",
      "minutes": "{n} minutos",
      "seconds": "{n} segundos",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{lat}, {lon} · {world}",
      "north": "{n}° N",
      "south": "{n}° S",
      "east": "{n}° L",
      "west": "{n}° O"
    },
    "couldNotLook": "Não foi possível calcular isto",
    "nobodyKnows": "Ninguém sabe",
    "wouldNeed": "Levaria {wouldNeed}.",
    "endedLine": "A missão terminou em {date}. Os eventos dela, abaixo, remontam até lá.",
    "pathEndedLine": "A trajetória que o JPL guarda para ele termina em {date}. Os eventos dele, abaixo, remontam até lá.",
    "pathBeginsLine": "A trajetória que o JPL guarda para ele começa em {date}. Os eventos dele, abaixo, remontam até lá.",
    "actions": {
      "flyTo": "Voar até lá",
      "flyToTitle": "Levar a câmera até este objeto",
      "flyEnded": "Terminou em {date}. Escolha um evento da missão para ir até lá",
      "flyPathEnded": "A trajetória termina em {date}. Escolha um evento da missão para ir até lá",
      "flyPathBegins": "A trajetória começa em {date}. Escolha um evento da missão para ir até lá",
      "flyNowhere": "Não há posição para este objeto neste momento",
      "seeFromHere": "Ver daqui",
      "seeFromHereTitle": "Olhar para cima a partir do seu próprio lugar na Terra",
      "follow": "Seguir",
      "followTitle": "Voar até ele e mantê-lo no meio da vista",
      "ride": "Pegar carona",
      "rideShort": "Carona",
      "seeShort": "Ver",
      "postcard": "Postal",
      "share": "Compartilhar"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "Planeta",
      "moon": "Lua",
      "dwarf": "Planeta anão",
      "ourStar": "Estrela",
      "exoplanet": "Exoplaneta"
    },
    "regime": {
      "leo": "Órbita baixa da Terra",
      "meo": "Órbita média da Terra",
      "geo": "Órbita geoestacionária",
      "heo": "Órbita alta da Terra",
      "inner": "Sistema solar interno",
      "outer": "Sistema solar externo",
      "belt": "Cinturão de asteroides",
      "beyondNeptune": "Além de Netuno",
      "round": "Orbita {world}",
      "inCon": "Em {con}",
      "onWorld": "Sobre {world}",
      "centre": "Centro do sistema solar",
      "nearby": "Entre os mais próximos"
    },
    "hero": {
      "label": "Em três números",
      "missing": "—",
      "captions": {
        "altitude": "{u} de altura",
        "away": "{u} de distância",
        "speed": "{u}",
        "period": "{u} por volta",
        "distanceFromSun": "{u} do Sol",
        "distanceFromEarth": "{u} da Terra",
        "lightTime": "{u} em cada sentido",
        "spin": "{u} por volta",
        "yearLength": "{u} por ano",
        "brightness": "magnitude",
        "spectralType": "classe da estrela",
        "across": "{u} de largura",
        "lightLeft": "{u} de distância",
        "launched": "dias no espaço",
        "fromYou": "{u} de você",
        "heightAbove": "{u} de altura",
        "other": "{u}"
      },
      "units": {
        "minutes": "min",
        "hours": "h",
        "days": "dias",
        "seconds": "s",
        "milliseconds": "ms",
        "astronomical units": "UA",
        "light-years": "al",
        "years ago": "al",
        "million years ago": "milhões de al",
        "billion years ago": "bilhões de al",
        "months ago": "meses-luz"
      }
    },
    "sections": {
      "label": "Mais sobre ele",
      "see": "Quando dá para ver",
      "path": "A trajetória",
      "aboard": "Quem está a bordo",
      "ridingOn": "No que ele viaja",
      "about": "Sobre ele",
      "sources": "Fontes deste registro",
      "placeGuessed": "lugar suposto",
      "needsPlace": "precisa do seu lugar",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "{n} grupos de manchas solares estão desenhados, a partir da lista da NOAA para {date}: cada um como uma mancha redonda no lugar e no tamanho informados, levada pela rotação do Sol desde então.",
    "spotsOne": "Um grupo de manchas solares está desenhado, a partir da lista da NOAA para {date}: como uma mancha redonda no lugar e no tamanho informados, levada pela rotação do Sol desde então.",
    "spotsPaired": "{n} grupos de manchas solares estão desenhados, a partir da lista da NOAA para {date}, levados pela rotação do Sol desde então. {pairs} com várias manchas são desenhados como uma mancha líder a oeste e uma seguidora a leste; o intervalo entre elas e como a área se divide entre as duas são ilustrativos. Os demais são uma única mancha redonda.",
    "spotsPairedOne": "Um grupo de manchas solares está desenhado, a partir da lista da NOAA para {date}, levado pela rotação do Sol desde então: como uma mancha líder a oeste e uma seguidora a leste. O intervalo entre elas e como a área se divide entre as duas são ilustrativos.",
    "regionsCredit": "Grupos de manchas solares de hoje: NOAA Space Weather Prediction Center, resumo das regiões solares",
    "flaresCredit": "Erupções solares: NOAA Space Weather Prediction Center, lista editada de eventos",
    "cmeCredit": "Ejeções de massa coronal: NASA DONKI (Moon to Mars Space Weather Analysis Office e CCMC)"
  },
  "clouds": {
    "live": "Nuvens: vistas {when}, {ago}, em infravermelho por {satellites}, por meio do NASA GIBS. Os topos mais frios, onde há tempestades, são desenhados mais altos e mais brancos que o resto. Sobre a Europa, a África, o oceano Índico e os polos, que nenhum desses satélites enxerga, elas são ilustrativas.",
    "at": "às {time} UTC",
    "between": "entre {from} e {to} UTC",
    "atDated": "em {date} às {time} UTC",
    "betweenDated": "em {date} entre {from} e {to} UTC",
    "clockElsewhere": " O relógio está em {time} UTC de {date}; as nuvens ficam como aquela imagem as viu.",
    "and": " e ",
    "illustrative": "Nuvens: ilustrativas. É uma imagem de um dia do passado, à deriva devagar; não é o tempo de hoje.",
    "illustrativeSaveData": "Nuvens: ilustrativas. As imagens de satélite de hoje não são baixadas em uma conexão que economiza dados.",
    "illustrativeScrubbed": "Nuvens: ilustrativas, porque o relógio está a mais de 12 horas da imagem de satélite mais recente, de {date} às {time} UTC.",
    "gibsAcknowledgement": "Reconhecemos o uso de imagens fornecidas pelos serviços Global Imagery Browse Services (GIBS) da NASA, parte do Earth Science Data and Information System (ESDIS) da NASA.",
    "satelliteCredit": "Nuvens ao vivo: imagens em infravermelho do GOES-East e do GOES-West, NOAA; imagens em infravermelho do Himawari, Agência Meteorológica do Japão (JMA)."
  },
  "aurora": {
    "live": "Aurora: onde o modelo OVATION da NOAA a espera na próxima hora (previsão para {time} UTC, feita {ago}), não uma fotografia. As dobras finas nela são desenhadas.",
    "liveNoFolds": "Aurora: onde o modelo OVATION da NOAA a espera na próxima hora (previsão para {time} UTC, feita {ago}), não uma fotografia.",
    "waiting": "Aurora: a previsão da NOAA ainda não chegou.",
    "failed": "Aurora: não foi possível ler a previsão da NOAA agora, então nenhuma é desenhada.",
    "far": "Aurora: não desenhada, porque o relógio está a mais de três horas da previsão mais recente da NOAA.",
    "saveData": "Aurora: a previsão da NOAA não é baixada em uma conexão que economiza dados.",
    "switchedOff": "Aurora: desligada nas camadas.",
    "credit": "Aurora: previsão do modelo OVATION Prime do NOAA Space Weather Prediction Center (domínio público).",
    "rightNow": "Aurora provável perto dos polos",
    "rightNowReach": "Aurora provável até {lat}° de latitude",
    "rightNowValue": "Kp {kp}",
    "showMe": "Voar até a aurora no lado da noite"
  },
  "weather": {
    "lightning": {
      "live": "Raios: cerca de {n} descargas por minuto onde o mapa da NOAA alcança, as Américas e o Pacífico (contagem até {time}, {ago}). Onde e com que frequência são medidos; o instante de cada clarão é desenhado, e maior do que na vida real.",
      "quiet": "Raios: quase nenhum onde o mapa da NOAA alcança, as Américas e o Pacífico (contagem até {time}, {ago}).",
      "waiting": "Raios: o mapa da NOAA ainda não chegou.",
      "failed": "Raios: não foi possível ler o mapa da NOAA agora, então nenhum é desenhado.",
      "away": "Raios: não desenhados, porque o relógio está a mais de uma hora do mapa mais recente da NOAA.",
      "off": "Raios: não baixados neste aparelho ou nesta conexão.",
      "reducedMotion": "Raios: não desenhados, porque este aparelho pede menos movimento.",
      "switchedOff": "Raios: desligados nas camadas.",
      "credit": "Raios: densidade de descargas do NOAA nowCOAST, produzida pelo NWS Ocean Prediction Center a partir das redes terrestres NLDN e GLD360 (domínio público)."
    },
    "worlds": {
      "jupiter": "Clima: as faixas deslizam umas pelas outras às velocidades de vento medidas a partir do Hubble, e a Grande Mancha Vermelha gira. Movimento modelado: nenhuma nuvem é desenhada onde ela está hoje.",
      "saturn": "Clima: as faixas se movem às velocidades de vento que a Cassini mediu. Movimento modelado, não as nuvens de hoje. O hexágono no polo norte é desenhado no lugar medido; sua aparência é ilustrativa.",
      "venus": "Clima: a camada de nuvens dá a volta em cerca de quatro dias, como a Venus Express mediu, sessenta vezes mais rápido que o solo. Movimento modelado, não as nuvens de hoje.",
      "uranus": "Clima: o ar vai à deriva às velocidades de vento medidas a partir do Keck e do Gemini. Movimento modelado, não as nuvens de hoje.",
      "neptune": "Clima: o ar corre ao redor às velocidades de vento que a Voyager 2 mediu, as mais rápidas de qualquer planeta. Movimento modelado, não as nuvens de hoje.",
      "mars": "Clima: em Marte é {season}. As calotas de gelo e a poeira no ar, com profundidade óptica perto de {tau}, são o que essa estação costuma trazer: sazonais e ilustrativas, não o tempo de hoje.",
      "titan": "Clima: as faixas claras no norte representam as nuvens de metano que os telescópios Webb e Keck viram ali em novembro de 2022 e julho de 2023. Ilustrativo: não se sabe onde estão hoje as nuvens de Titã."
    },
    "also": {
      "venus": "O Y escuro que gira junto é o que as câmeras de ultravioleta enxergam; a olho nu Vênus é quase lisa, e o lugar dele aqui é ilustrativo. Raios em Vênus já foram relatados e ainda são debatidos; nenhum é desenhado.",
      "uranus": "A calota brilhante sobre o polo norte é real: o brilho e a cor, latitude por latitude, vêm do mapa do Hubble de outubro de 2025, e o Hubble a vê ficar mais brilhante a cada ano, conforme chega o verão do norte de 2028.",
      "neptune": "O oval escuro no mapa de artista é a Grande Mancha Escura da Voyager 2, de 1989, que sumiu em 1994: ilustrativa, não desenhada no modo Medido. No modo Filme, os cirros de metano projetam sombras, desenhadas seis vezes mais largas e mais altas do que o medido; cada faixa é nossa."
    },
    "flashes": {
      "jupiter": "No lado da noite, clarões raros representam os raios que a Juno encontrou, quase todos bem ao norte: as latitudes são medidas, e cada clarão é ilustrativo e desenhado maior do que na vida real.",
      "saturn": "No lado da noite, clarões raros a 36 graus sul representam os raios que a Cassini fotografou ali em 2009: ilustrativos e maiores do que na vida real, e hoje ninguém os está observando."
    },
    "seasons": [
      "primavera no norte",
      "verão no norte",
      "outono no norte",
      "inverno no norte"
    ]
  },
  "drawing": {
    "orbitLine": "A linha é uma volta à frente, calculada a partir dos mesmos elementos que o ponto.",
    "orbitLineYear": "A linha é o próximo ano da trajetória, calculado a partir dos mesmos elementos que o ponto.",
    "orbitLineWhole": "A linha é a órbita inteira ao redor do Sol, calculada a partir dos mesmos elementos que o ponto.",
    "orbitLinePassage": "A linha é a única passagem dele pelo Sistema Solar, de ida e volta, calculada a partir dos mesmos elementos que o ponto.",
    "variant": "desenhado a partir das dimensões publicadas de {name}",
    "family": "desenhado como {name} — o formato e a altura da família, não esta versão exata",
    "generic": "desenhado como um foguete genérico; não temos as dimensões de {name}",
    "genericUnnamed": "desenhado como um foguete genérico; não temos as dimensões deste veículo",
    "disputed": "as fontes divergem sobre a altura ({disputed})",
    "objectVariant": "desenhado a partir das dimensões publicadas de {name}",
    "objectModel": "desenhado a partir de um modelo publicado de {name}",
    "padEmpty": "a plataforma é um lugar medido; {name} só é desenhado nela durante os lançamentos listados",
    "objectMapped": {
      "dawn": "a superfície é o mosaico em preto e branco da sonda Dawn, colorido com um cinza que escolhemos; as sombras nas crateras são as que a Dawn fotografou e não se movem com o Sol aqui"
    },
    "objectFamily": "desenhado como {name} — o tipo de coisa, não este exemplar exato",
    // b200-m2-buses: begin
    "objectBus": "Plataforma: {bus} ({source}). Desenhado com uma plataforma substituta.",
    // b200-m2-buses: end
    "objectOwn": "desenhado como {name}",
    "objectMade": {
      "images": "forma construída a partir de fotografias; proporções aproximadas",
      "render": "forma construída a partir de uma concepção artística; proporções aproximadas",
      "dimensions": "forma construída a partir de dimensões e imagens publicadas; detalhes simplificados",
      // b200-m4-buses: begin -- a geostationary bus built here from published sizes and the maker's renders (registry/geo-buses.yaml `made: renders`), machine-drafted
      "renders": "forma construída a partir de dimensões publicadas e de concepções do fabricante; detalhes estimados"
      // b200-m4-buses: end
    },
    "objectWas": {
      "hitomi": "mostrado inteiro, como foi lançado em fevereiro de 2016; ele se partiu cinco semanas depois, e o que se acompanha aqui é o corpo principal, sem os painéis solares",
      "envisat": "mostrado estável, com os instrumentos voltados para a Terra, como voava enquanto funcionava; está inativo desde 2012 e ninguém o controla",
      "ers1": "mostrado estável, com os instrumentos voltados para a Terra, como voava enquanto funcionava; a missão terminou em 2000 e ninguém o controla"
    },
    "objectGeneric": "desenhado como um objeto genérico; não temos a forma de {name}",
    "classShape": {
      "satellite": "um satélite genérico",
      "station": "uma estação espacial genérica",
      "debris": "um detrito",
      "rocket": "um foguete genérico",
      "probe": "uma sonda genérica",
      "telescope": "um telescópio genérico",
      "asteroid": "um asteroide genérico",
      "dwarf": "um corpo redondo e liso do tamanho medido",
      "comet": "um cometa genérico",
      "site": "uma instalação em terra genérica",
      "star": "um ponto de luz, com tamanho dado pelo brilho que tem visto de onde você está",
      "exoplanet": "uma marca na estrela dele — a órbita em si é pequena demais para ser desenhada",
      "dso": "um brilho suave ao jeito do seu tipo, na distância medida, tão largo quanto o medido; o padrão nele é ilustrativo e a forma real não é desenhada",
      "exotic": "um anel na distância medida; um buraco negro não tem forma para desenhar e um pulsar é pequeno demais",
      "exoticStar": "um anel na distância medida; a estrela em si é um ponto nesta escala"
    },
    "storm": "desenhada como uma marca no centro; a tempestade em si é a nuvem ao redor",
    "feature": "um lugar com nome: nada é desenhado aqui além de uma marca no centro, posta segundo a fonte citada; o chão embaixo é o próprio mapa", // 0077 W3-d
    "objectSpin": { "spin": "ele gira em torno do polo medido, na velocidade medida; o lado voltado para o Sol neste momento não é uma previsão", "pair": "os dois giram em torno do polo medido, nas velocidades medidas, e Dimorphos dá a volta na distância e no período medidos depois do impacto da DART; onde ele está nessa órbita é ilustrativo", "comet": "ele gira em torno do polo medido, na velocidade medida em 2014, que o Sol alterou em alguns minutos a cada passagem desde então; o lado voltado para o Sol neste momento não é uma previsão", "still": "ele é desenhado na orientação do seu modelo de radar e não gira aqui: o modelo não diz para onde aponta o seu eixo de rotação", "moonSpin": "mantém uma face voltada para Saturno e gira em torno do polo que as constantes da UAI lhe dão, uma vez por volta; que lado olha para a câmera neste momento é o dessa fórmula, não é uma previsão", "moonStill": "é desenhada na orientação do seu modelo e aqui não gira: as constantes que este app lê não lhe dão polo nem ritmo estáveis" }, // 0077 W3-d 0079 B2
    "objectSeen": { "lutetia": "as imagens da Rosetta cobrem mais da metade da sua superfície; o resto da forma é ajustado a partir das variações de brilho, não fotografado", "steins": "as imagens da Rosetta cobrem cerca de 60% da sua superfície; o resto da forma é ajustado a partir das variações de brilho, não fotografado", "donj": "a forma é construída a partir das imagens da Lucy por fotogrametria estéreo e pelo ajuste do seu contorno; o lado que a Lucy não viu é o do ajuste", "arrokoth": "as imagens da New Horizons cobrem o lado junto ao qual ela passou; o outro lado é inferido, não fotografado, e a cor é o seu mapa de albedo num tom vermelho", "radar": "a forma é construída a partir de ecos de radar, não de imagens: o contorno é medido e os detalhes mais finos não", "comet": "a forma é a da Rosetta, a partir de mais de 20 000 imagens ao longo de dois anos, e cobre toda a superfície", "cassini": "a forma é construída a partir das imagens da Cassini e costuma ter uma incerteza bem inferior a meio quilômetro; o que a Cassini não viu é do ajuste, não foi fotografado" }, // 0079 B1 0079 B2
    "objectRelief": "o modelo é simplificado, e o relevo fino nele é o do modelo completo, gravado na superfície", // 0079 B1
    "worldFlat": "desenhado como uma bola lisa: não há aqui um mapa da superfície de {name}, e a única cor foi escolhida a partir de descrições publicadas, não medida",
    "worldFlatIrregular": "desenhado como uma bola lisa do tamanho do raio médio: não há aqui um mapa da superfície de {name}, a única cor foi escolhida a partir de descrições publicadas, não medida, e {name} é na verdade uma rocha irregular cuja forma real não é desenhada",
    "worldFlatShaped": "desenhado na forma medida e em uma só cor: não há aqui um mapa da superfície de {name}, e a cor foi escolhida a partir de descrições publicadas, não medida",
    "worldShaped": "desenhado na forma medida",
    "worldMap": {
      "tinted": "a superfície é um mosaico em preto e branco, colorido com uma cor escolhida a partir de descrições publicadas",
      "toned": "as cores vêm de imagens em infravermelho, verde e ultravioleta, atenuadas em direção ao que um olho veria",
      "redblue": "as cores vêm das imagens vermelhas e azuis da New Horizons, com o verde tirado a meio caminho entre elas e a cor reforçada em metade; as partes fotografadas só em preto e branco recebem a cor média do mapa",
      "enhanced": "as cores são as que a NASA publicou, montadas a partir de três dos filtros de cor da New Horizons, nenhum deles verde: é cor realçada, mais forte que o que um olho veria e diferente dele",
      "balanced": "as cores vêm de imagens em laranja, verde e azul, equilibradas até a cor publicada e atenuadas em direção ao que um olho veria",
      "infrared": "a superfície é um mapa em infravermelho próximo feito através da névoa, colorido e suavizado; na luz visível a névoa esconde o solo",
      "natural": "as cores são cor natural, da luz vermelha e azul que a câmera colorida da New Horizons mediu, com o verde, para o qual não tinha filtro, estimado entre elas, e reforçadas duas vezes e meia em relação às da câmera, como as imagens em cor natural da NASA o mostram", // 0078 r14-pluto
      "matched": "as cores partem da luz vermelha e azul que a câmera colorida da New Horizons mediu, com o verde, para o qual não tinha filtro, estimado entre elas, e depois são igualadas, tom a tom, à própria imagem colorida da NASA desta face (PIA19952): mais fortes que as da câmera, como a NASA a publicou" // 0078 r14-pluto
    },
    "worldCoverage": {
      "miranda": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "ariel": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "umbriel": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "titania": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "oberon": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "triton": "a Voyager 2 fotografou parte dele em 1989; o resto fica liso, sem palpite",
      "pluto": "o extremo sul estava na escuridão do inverno quando a New Horizons passou, em 2015: o solo desenhado ali é modelado, uma textura tênue nas cores das terras acima, não uma fotografia", // 0078 r14-pluto
      "charon": "o extremo sul estava na escuridão do inverno quando a New Horizons passou, em 2015: o solo desenhado ali é modelado, uma textura tênue nas cores das terras acima, não uma fotografia" // 0078 r14-pluto
    },
    "worldLit": "iluminado como o mostraria uma câmera exposta para a sua própria luz solar",
    "worldLight": "visto de longe, é uma luz com o brilho calculado: o halo é como uma câmera registra um ponto brilhante demais para ser resolvido",
    "exoticDeparture": {
      "pulseSlowed": "o piscar é desenhado {n} vezes mais lento do que o giro, para que um olho consiga acompanhá-lo",
      "pulseTrue": "o piscar é desenhado no ritmo em que ele gira",
      "portrait": "enquanto esta ficha está aberta, um modelo é desenhado no lugar dele, bem maior do que pareceria daqui: a sombra e a luz curvada como a massa as dá, o disco modelado"
    },
    "worldDeparture": {
      "earth": "em uma tela maior, as montanhas vêm das alturas do ETOPO 2022 da NOAA, desenhadas {relief} vezes mais íngremes do que são para que um Sol baixo as mostre; o brilho do ar ao redor da borda é desenhado {air} vezes mais alto do que o ar é; da órbita baixa, em uma tela maior, as nuvens se erguem em direção ao horizonte e sob um Sol baixo, desenhadas {clouds} vezes mais espessas do que são para que se vejam a inclinação, as sombras longas e a última luz no topo delas (na espessura real no modo Medido), com a altura de cada topo tirada da temperatura medida onde a imagem de hoje cobre e do brilho do mapa de nuvens nos demais lugares",
      "mercury": "em uma tela maior, o relevo vem do modelo de elevação da MESSENGER, desenhado {steep} vezes mais íngreme do que o medido para que as bordas das crateras peguem a luz",
      "pluto": "o solo claro e escuro é desenhado com {plutoContrast} vezes o contraste da imagem da câmera, mais perto dos albedos medidos; o lado que a New Horizons só viu de longe é suavizado até a sua própria nitidez; em uma tela maior, o relevo vem das alturas estéreo da New Horizons, onde existem, desenhado {plutoSteep} vezes mais íngreme do que o medido; a fina névoa azul na borda é desenhada como um brilho, mais forte contra o Sol, cuja intensidade é escolhida", // 0078 r14-pluto
      "mars": "em uma tela maior, o relevo vem das alturas que o altímetro a laser da Mars Global Surveyor mediu, desenhadas {mola} vezes mais íngremes e altas do que são para que um Sol baixo as mostre: as sombras que o Monte Olimpo e as paredes dos cânions projetam são tantas vezes mais longas.",
      "venus": "o halo ao redor da borda e além do lado do dia representa uma névoa densa; sua espessura desenhada e seu alcance são ilustrativos; no modo Filme, as faixas de nuvens são desenhadas com {uv} vezes o contraste do mapa, como as câmeras de ultravioleta as veem (a olho nu são quase lisas), e o modo Medido mostra o mapa como ele é; o solo, por radar, está em relevo a partir do altímetro da Magellan, desenhado {ground} vezes mais íngreme e alto do que o medido",
      "neptune": "no modo Filme, os cinco arcos do anel externo são desenhados como a Voyager 2 os viu em 1989, girando à velocidade medida; onde estão hoje ao redor do anel não é calculado, e dois deles desde então desbotaram ou mudaram de lugar",
      "saturn": "as faixas são desenhadas com {contrast} vezes o contraste do mapa, um ajuste nosso; “Como o Hubble viu” não tem ajuste; em uma tela maior e de perto, os anéis finos e as lacunas dos anéis estão onde a Cassini os mediu pela luz de uma estrela em 2008, sobrepostos ao mapa, e no modo Filme é desenhado o brilho dos grãos, ainda mais de perto; a poucos quilômetros dos anéis, em uma tela maior, no modo Filme, suas maiores partículas, de dois a cinco metros de largura, são desenhadas como bolas de gelo: quantas e de que tamanho seguem a distribuição medida de tamanhos e a profundidade óptica dos anéis, mas onde fica cada uma, e os aglomerados no anel A, são ilustrativos, e elas são desenhadas paradas, como se você viajasse junto com elas",
      "titan": "logo acima da névoa, a cerca de 500 km de altura, uma fina camada de névoa separada é desenhada onde a Cassini a viu em 2005 a 2007; ela desceu e desbotou nos anos seguintes, e não se sabe onde está agora"
    },
    "worldEarthshine": "o lado escuro brilha com a luz da Terra, o próprio brilho do nosso planeta, desenhada {n} vezes mais forte do que essa câmera a captaria, mais ou menos como o olho a vê",
    "worldAir": "o ar é desenhado {n} vezes mais espesso do que é para que apareça neste tamanho, e a cor da névoa é ilustrativa",
    "worldAirTrue": "a névoa é desenhada na altura medida, e a cor dela é ilustrativa",
    "worldRings": "os anéis estão nas distâncias medidas, desenhados {w} vezes mais largos e bem mais brilhantes do que são para que apareçam: os de verdade são fios escuros como carvão",
    "worldRingsDense": "os anéis estão nas distâncias medidas, desenhados {w} vezes mais largos, {d} vezes mais opacos e bem mais brilhantes do que são para que apareçam: os de verdade são fios tênues, escuros como carvão",
    "worldSun": "de perto, a borda escurece e avermelha como um modelo da atmosfera diz que deve; o granulado representa a superfície em ebulição: as células nascem, brilham e se apagam como os grânulos de verdade, desenhadas mais grossas do que são (até o tamanho real, bem de perto) e bem mais rápidas, e a rede brilhante perto da borda é ilustrativa; bem de perto, o mapa fotografado dá lugar a essa superfície desenhada, que também é ilustrativa; a coroa é ilustrativa e desenhada bem mais brilhante do que é para que possa ser vista; os arcos e cercas na borda ficam onde as regiões ativas da NOAA estão perto do limbo, e seus formatos e alturas são ilustrativos; as estrelas ao lado estão esmaecidas, porque o clarão do Sol as esconde de qualquer câmera",
    "worldMosaic": "Sob a câmera agora: {title}, desenhado aqui com cerca de {res} por pixel.",
    "worldMosaicDetail": "Sob a câmera agora: {title}, afinando o mapa de cores com cerca de {res} por pixel.",
    "worldRelief": "O relevo vem de {title}: um desenho de declives sob uma luz fixa. Os declives na direção dessa luz são iluminados de novo pelo Sol onde ele está agora, {n} vezes mais íngremes do que o medido; os declives transversais a ela não são desenhados.",
    "worldReliefTrue": "O relevo vem de {title}: um desenho de declives sob uma luz fixa. Os declives na direção dessa luz são iluminados de novo pelo Sol onde ele está agora; os declives transversais a ela não são desenhados.",
    "worldReliefBaked": "As colinas estão sombreadas neste mapa sob uma luz fixa, não pelo Sol onde ele está agora.",
    "mount": "o ponto onde o prendemos ao modelo é arranjo nosso, e ele é desenhado bem maior do que é — no tamanho real seria pequeno demais para ser visto"
  },
  "trip": {
    "notEnoughStops": "Só {count} das paradas desta viagem podem ser encontradas agora, e ela precisa de {min}.",
    "heldBody": "Não conseguimos encontrar esta agora. Todo o resto da viagem continua funcionando.",
    "heldTitle": "Não conseguimos encontrar esta",
    "stopOf": "parada {n} de {count}",
    "planning": "Calculando o que pode ser mostrado…",
    "shape": "{count} paradas · {mins} min",
    "shapeOneMinute": "{count} paradas · 1 min",
    "startTitle": "Fazer esta viagem",
    "nextEventLine": "Próximo: {date}",
    "introStart": "Começar",
    "introSkip": "Agora não",
    "introMicro": "Viagem guiada",
    "stopsLabel": "Paradas",
    "startAtTitle": "Começar a viagem pela parada {n}",
    "droppedOne": "Uma parada não pode ser mostrada hoje e não entra na conta acima.",
    "droppedMany": "{n} paradas não podem ser mostradas hoje e não entram na conta acima.",
    "clockClamped": "O tempo voltou à velocidade normal para esta viagem.",
    "clockMoves": "Esta viagem mexe no relógio. Ele é devolvido quando você sai.",
    "clockRestored": "Ao sair, o relógio volta para onde você o deixou.",
    "stopTimeNow": "Mostrado agora",
    "stopTimeAt": "Mostrado em {when}",
    "stopTimeRate": "Mostrado em {when}, correndo {rate}",
    "stopTimePaused": "Mostrado em {when}, parado enquanto a viagem está em pausa",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "Sombra calculada a partir das posições da Lua e do Sol; horários do Astronomy Engine, com precisão de cerca de um minuto. As linhas finas e a faixa clara marcam as bordas da sombra e o caminho do seu núcleo: linhas em um mapa, não luz.",
    "eclipseLineLatched": "A sombra não é desenhada neste aparelho; os horários estão corretos.",
    "eclipseColour": "A cor é uma ilustração; a sombra é calculada.",
    "orbitsLine": "Planetas desenhados maiores do que são, como pontos; os lugares e as trajetórias deles são calculados.",
    "moonPathLine": "A Terra e a Lua são desenhadas maiores do que são, como pontos, cada uma iluminada no lado voltado para o Sol. O lugar da Lua e a trajetória dela são calculados.",
    "systemLine": "Tamanhos e órbitas do NASA Exoplanet Archive; as cores e a inclinação das órbitas são ilustrativas.",
    "systemLineGuessed": "Tamanhos e órbitas do NASA Exoplanet Archive; as cores, os lugares dos planetas nas órbitas e a inclinação das órbitas são ilustrativas.",
    "systemPhaseUnknown": ", os lugares dos planetas nas órbitas",
    "rateWords": {
      "10": "dez vezes mais rápido que a vida real",
      "60": "um minuto por segundo",
      "600": "dez minutos por segundo",
      "3600": "uma hora por segundo",
      "36000": "dez horas por segundo",
      "525600": "um dia a cada sexto de segundo"
    },
    "rateGeneric": "{n} vezes mais rápido que a vida real",
    "yourPlace": "Seu lugar",
    "observerSet": "Seu lugar: {place}, definido por você.",
    "observerDevice": "Seu lugar: perto de onde o seu aparelho diz que você está.",
    "observerGuess": "Seu lugar é um palpite a partir do fuso horário do seu relógio: {place}. Defina-o em Onde você está para ter um melhor.",
    "needsPlace": "Precisa de um lugar. Defina primeiro onde você está.",
    "stationFromYou": "Agora ela está a {km} km de você.",
    "drawnAtClassSize": "O modelo é desenhado com {px} pixels de largura, qualquer que seja a distância; a estação de verdade seria um ponto brilhante.",
    "passNight": "Nesta passagem ela está iluminada pelo Sol contra um céu escuro: você poderia vê-la, se o tempo ajudar.",
    "passDay": "Você não veria esta passagem: seu céu está claro demais, ou a estação está na sombra da Terra.",
    "lookMoonUp": "A Lua está {pct}% iluminada, {alt} no {az}.",
    "lookMoonDown": "A Lua está abaixo do seu horizonte a esta hora. Ela nasce às {time}.",
    "lookMoonDownNoRise": "A Lua está abaixo do seu horizonte a esta hora.",
    "lookWorldUp": "{name} está {alt} no {az}.",
    "lookWorldDown": "{name} está abaixo do seu horizonte a esta hora.",
    "lookPlanet": "O planeta mais brilhante no céu a esta hora é {name}: {alt} no {az}.",
    "lookNoPlanet": "Nenhum planeta visível a olho nu está no céu a esta hora. A vista aponta para onde eles vão passar.",
    "lookStar": "A estrela mais brilhante no céu a esta hora é {name}: {alt} no {az}.",
    "lookFigure": "Melhor posicionada a esta hora: {name}, {alt} no {az}.",
    "lookNoFigure": "Nenhuma das figuras mais conhecidas está bem posicionada a esta hora.",
    "lookNoPass": "Nenhuma passagem da estação sobre o seu lugar foi encontrada na próxima semana.",
    "lookDaylight": "Seu céu não está escuro a esta hora, então ainda não há nada para destacar.",
    "lookMilkyWay": "A vista aponta para a Via Láctea onde ela atravessa {name}, {alt} no {az}. Os três céus são um modelo de uma noite clara média.",
    "lookNoMilkyWay": "A Via Láctea está baixa no seu horizonte a esta hora, então a vista aponta para o alto do céu.",
    "lookShower": "A próxima chuva de meteoros é a {name}, no auge por volta de {date}.",
    "lookShowerUp": "O radiante dela está {alt} no {az} a esta hora.",
    "lookShowerDown": "O radiante dela está abaixo do seu horizonte a esta hora; a vista aponta para onde ele vai nascer.",
    "lookShowerRate": "No pico, de um lugar escuro com o radiante alto: cerca de {rate} meteoros por hora.",
    "lookShowerMoon": {
      "dark": "A Lua está {pct}% iluminada naquela noite, então o céu continua escuro.",
      "some": "A Lua está {pct}% iluminada naquela noite e vai esconder alguns dos meteoros fracos.",
      "bright": "A Lua está {pct}% iluminada naquela noite e vai esconder todos, menos os brilhantes."
    },
    "approachNext": "Próximo na tabela do JPL da NASA: {name}, em {date}, a {ld} vezes a distância da Lua.",
    "approachNextFar": "Próximo na tabela do JPL da NASA: {name}, em {date}.",
    "approachNone": "A tabela de passagens próximas do JPL da NASA não carregou, então nenhuma próxima passagem é citada.",
    "satellitesCount": "{n} satélites em funcionamento no catálogo que esta página carregou do CelesTrak, {starlink} deles Starlink.",
    "satellitesLoading": "O catálogo ainda está carregando; a contagem aparece quando ele terminar.",
    "portraitLine": "Um modelo, não a fotografia: a sombra e o anel de luz curvada ao redor dele são os que a massa dele dá, o disco luminoso é modelado e as estrelas atrás não se curvam. É desenhado bem maior do que pareceria daqui; o lugar é medido. A fotografia do Event Horizon Telescope está na ficha: {credit} · {licence}.",
    "tonightUp": "De {place} esta noite: no céu das {begin} às {end}, mais alto às {time}, {alt} no {az}.",
    "tonightGlare": "De {place} esta noite: {name} está perto demais do Sol para ser visto.",
    "tonightDown": "De {place} esta noite: {name} não fica acima do horizonte enquanto o céu está escuro.",
    "frameLabel": "viagem guiada",
    "stopRole": "parada",
    "liveLabel": "parada {n} de {count}: {title}",
    "stopMicro": "Parada {n} de {count}",
    "progressShort": "{n} / {count}",
    "pause": "Pausar",
    "pauseTitle": "Pausar (Espaço)",
    "play": "Tocar",
    "resume": "Retomar",
    "resumeTitle": "Voar de volta à parada e continuar (Espaço)",
    "back": "Parada anterior",
    "backTitle": "Parada anterior (←)",
    "next": "Próxima parada",
    "nextTitle": "Próxima parada (→)",
    "replay": "Repetir",
    "replayTitle": "Voar este movimento de novo (R)",
    "share": "Compartilhar",
    "shareTitle": "Compartilhar um link para esta parada",
    "collapse": "Ocultar ficha",
    "collapseTitle": "Ocultar a ficha e assistir (C)",
    "expand": "Mostrar ficha",
    "expandTitle": "Trazer a ficha de volta (C)",
    "soundOn": "Som",
    "volume": "Volume",
    "volumeTitle": "Volume da música, dos sons e da voz",
    "volumeValue": "{pct}%",
    "voiceWill": "Uma voz vai ler isto. Ela é sintética.",
    "voiceCan": "Uma voz sintética pode ler isto: pressione Voz.",
    "soundOnTitle": "Música e sons ligados: desligar (M)",
    "soundOffTitle": "Música e sons desligados: ligar (M)",
    "voice": "Voz",
    "voiceOnTitle": "Uma voz sintética está lendo cada parada: desligar e manter a música (V)",
    "voiceOffTitle": "Ouvir cada parada lida em voz alta por uma voz sintética (V)",
    "present": "Apresentar",
    "presentTitle": "Mostrar esta viagem para uma sala: letras grandes, sem painéis, você pressiona Próxima",
    "presentOffTitle": "Sair do modo de apresentação e trazer os painéis de volta",
    "presentAuto": "Automático",
    "presentAutoOffTitle": "Cada parada espera por Próxima: deixar a viagem avançar sozinha (A)",
    "presentAutoOnTitle": "A viagem avança sozinha: fazer cada parada esperar por Próxima (A)",
    "fullScreen": "Tela cheia",
    "fullScreenTitle": "Ocupar a tela toda (F)",
    "fullScreenOffTitle": "Sair da tela cheia (F)",
    "leave": "Sair",
    "leaveTitle": "Sair da viagem. A câmera fica exatamente onde está. (Esc)",
    "leaveTitleStage": "Sair da viagem. O mapa volta para o mundo em que estava centrado antes, o que move a câmera. (Esc)",
    "progressLabel": "Quanto da viagem já passou",
    "controlsLabel": "Controles da viagem",
    "pausedChip": "Viagem pausada",
    "endMicro": "Fim da viagem",
    "endBody": "A câmera fica onde está. Nada aqui volta atrás.",
    "endBodyStage": "Continuar voando deixa você aqui, longe. Voltar para casa devolve o mapa ao mundo em que estava centrado antes da viagem.",
    "endExplore": "Continuar voando",
    "endExploreTitle": "Manter esta vista e seguir por conta própria",
    "endStayTitleStage": "Ficar aqui longe e continuar voando de onde a viagem terminou",
    "endHome": "Voltar para casa",
    "endExploreTitleStage": "Seguir por conta própria, de volta ao mapa de onde você partiu",
    "endSend": "Enviar imagem",
    "endSendTitle": "Fazer um cartão-postal de onde a viagem terminou, com as palavras dela e um link",
    "endReplay": "Assistir de novo",
    "endReplayTitle": "Assistir a esta viagem de novo, do começo",
    "endShareTitle": "Compartilhar um link para esta viagem",
    "endNextMicro": "Próxima viagem",
    "endNext": "Próxima: {title}",
    "docTitle": "Space Radar — {title} — parada {n} de {count}"
  },
  "sky": {
    "radiant": "radiante: {name}",
    "bodies": {
      "sun": "Sol",
      "moon": "Lua",
      "mercury": "Mercúrio",
      "venus": "Vênus",
      "mars": "Marte",
      "jupiter": "Júpiter",
      "saturn": "Saturno",
      "uranus": "Urano",
      "neptune": "Netuno"
    },
    "fov": {
      "degrees": "campo de {deg}° · {name}",
      "arcmin": "campo de {min}′ · {name}",
      "names": {
        "eye": "olho nu",
        "binoculars": "binóculo",
        "telescope": "telescópio"
      }
    },
    "lines": {
      "sunPath": "Caminho do Sol",
      "equator": "Equador do céu",
      "poleNorth": "Polo norte do céu",
      "poleSouth": "Polo sul do céu"
    },
    "what": {
      "star": "Estrela",
      "starMag": "estrela · mag {mag}",
      "planet": "planeta · mag {mag}",
      "sun": "nossa estrela",
      "moon": "lua da Terra",
      "dso": "céu profundo",
      "dsoMag": "{kind} · mag {mag}",
      "open": "{name}, {sub}. Abrir a ficha.",
      "plain": "{name}, {sub}.",
      "openTitle": "Abrir a ficha"
    },
    "compassShort": [
      "N",
      "NNE",
      "NE",
      "LNE",
      "L",
      "LSE",
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
    "lookLine": "Olhe para o {dir}, {fists}, às {time}. Ele se move por cerca de {mins} minutos.",
    "lookLineNoDuration": "Olhe para o {dir}, {fists}, às {time}.",
    "sunlit": "Ele ainda pega a luz do Sol, e é isso que o torna visível.",
    "notSunlit": "Nesta passagem ele está na sombra da Terra, então você não o verá.",
    "fistsHorizon": "logo acima do horizonte",
    "fistsOverhead": "quase a pino",
    "fistsOne": "cerca de um punho acima do horizonte",
    "fistsMany": "cerca de {n} punhos acima do horizonte",
    "noObserver": "Defina onde você está e esta linha dirá para onde olhar.",
    "noPass": "Ele não aparece acima do seu horizonte nas próximas 24 horas.",
    "notVisibleFromGround": "Este está longe demais para ser visto a olho nu.",
    "leftGround": "Saiu do chão para voar até lá. O céu fica na aba Esta noite.",
    "nakedEye": "Brilhante o bastante para ser visto a olho nu, de um lugar escuro.",
    "needsTelescope": "Fraco demais para o olho; um telescópio, ou uma fotografia de longa exposição, o mostra.",
    "starOnly": "Só a estrela dele pode ser vista, e só com telescópio; o planeta em si é fraco demais.",
    "onTheGround": "Este fica no chão, então não há para onde olhar no céu.",
    "storm": "Do chão, é o próprio tempo. Da órbita, é uma espiral de nuvens com centenas de quilômetros de largura.",
    "onAnotherWorld": "Este está sobre {world}. Você não o enxergará a olho nu daqui, por mais clara que seja a noite.",
    "worldRise": "De onde você está, ele nasce às {time}.",
    "worldHere": "onde você está",
    "worldFrom": {
      "down": "De {place}: nasce às {rise} no {riseDir}, mais alto às {highTime}, {highAlt}; se põe às {set} no {setDir}.",
      "downNoSet": "De {place}: nasce às {rise} no {riseDir}, mais alto às {highTime}, {highAlt}.",
      "up": "De {place}: no céu agora, {alt}, no {dir}. Mais alto às {highTime}, {highAlt}; se põe às {set} no {setDir}.",
      "upPast": "De {place}: no céu agora, {alt}, no {dir}. Já passou do ponto mais alto; se põe às {set} no {setDir}.",
      "never": "De {place}, ele não nasce no próximo dia e meio.",
      "always": "De {place}: no céu agora, {alt}, no {dir}. Ele não se põe hoje.",
      "honest": "Calculado para um horizonte ao nível do mar; morros e casas não entram na conta."
    },
    "worldNoRise": "Você pode ver este a olho nu. Calcular a que horas ele nasce no seu lugar ainda não está nesta versão.",
    "worldSee": {
      "pluto": "Nem a olho nu, nem com binóculo: Plutão é quase 3 000 vezes mais fraco que a estrela mais fraca que você consegue ver, então é preciso um telescópio.",
      "io": "Um binóculo comum o mostra como um ponto de luz ao lado de Júpiter; a olho nu ele se perde no clarão de Júpiter.",
      "europa": "Um binóculo comum a mostra como um ponto de luz ao lado de Júpiter; a olho nu ela se perde no clarão de Júpiter.",
      "ganymede": "Um binóculo comum o mostra como um ponto de luz ao lado de Júpiter; a olho nu ele se perde no clarão de Júpiter.",
      "callisto": "Um binóculo comum a mostra como um ponto de luz ao lado de Júpiter; a olho nu ela se perde no clarão de Júpiter.",
      "titan": "Não a olho nu: Titã tem magnitude 8,2 no máximo do brilho, então é preciso um telescópio pequeno ou um binóculo forte, e o clarão de Saturno ao lado dificulta até isso.",
      "enceladus": "Não a olho nu: Encélado tem magnitude 11,7 e fica tão perto do brilhante Saturno e de seus anéis que é difícil de ver até com um telescópio pequeno.",
      "triton": "Nem a olho nu, nem com binóculo: Tritão tem magnitude 13,5, cerca de 600 vezes mais fraco que a estrela mais fraca que você consegue ver, então é preciso um telescópio.",
      "charon": "Por pouco: Caronte tem magnitude 16,8, 13 000 vezes mais fraco que a estrela mais fraca que você consegue ver, e fica tão perto de Plutão que astrônomos amadores separaram o par em 2008, fotografando-o com um telescópio de 14 polegadas.",
      "phobos": "Não a olho nu: Fobos tem magnitude 11,3 no melhor momento e fica colado a Marte, cujo clarão o afoga; foi descoberto em 1877 com um telescópio de 26 polegadas.",
      "deimos": "Não a olho nu: Deimos tem magnitude 12,4 no melhor momento e fica perto de Marte, cujo clarão o afoga; foi descoberto em 1877 com um telescópio de 26 polegadas.",
      "neptune": "Não a olho nu: Netuno tem magnitude 7,7 a 7,9, fraco demais para ser visto sem ajuda. Um binóculo forte ou um telescópio o mostra como um pequeno disco azul.",
      "mimas": "Não a olho nu: Mimas tem magnitude 12,9 e fica colado a Saturno, então é preciso um telescópio grande e uma noite estável.",
      "tethys": "Não a olho nu: Tétis tem magnitude 10,2, ao alcance de um telescópio pequeno, embora o clarão de Saturno ao lado dificulte.",
      "dione": "Não a olho nu: Dione tem magnitude 10,4, ao alcance de um telescópio pequeno, embora o clarão de Saturno ao lado dificulte.",
      "rhea": "Não a olho nu: Reia tem magnitude 10, a mais brilhante das luas de Saturno depois de Titã, e um telescópio pequeno a mostra.",
      "iapetus": "Não a olho nu: Jápeto vai da magnitude 10,2 a 11,9 conforme o lado claro e o lado escuro se alternam voltados para nós, então um telescópio pequeno o pega no melhor momento.",
      "miranda": "Por pouco: Miranda tem magnitude 16,6, perdida no clarão de Urano, e é invisível em muitos telescópios de amadores.",
      "ariel": "Nem a olho nu, nem com binóculo: Ariel tem magnitude 14,8, tão fraca quanto Plutão perto da maior aproximação, então é preciso um bom telescópio e um céu escuro.",
      "umbriel": "Nem a olho nu, nem com binóculo: Umbriel tem magnitude 15,1, a mais fraca das quatro grandes de Urano, então é preciso um bom telescópio e um céu escuro.",
      "titania": "Não a olho nu: Titânia tem magnitude 13,9, a mais brilhante das luas de Urano, e ainda assim exige um telescópio de algum tamanho.",
      "oberon": "Não a olho nu: Oberon tem magnitude 14,1 e é a mais afastada de Urano entre as cinco, então é preciso um telescópio e uma noite estável."
    },
    "couldNotLook": "Não foi possível calcular uma passagem daqui.",
    "nowhereToLook": "Ninguém sabe onde este está, então não há para onde olhar."
  },
  "controls": {
    "title": "Controles",
    "layersTitle": "O que mostrar",
    "layerCount": "{n}",
    "layerCountLoading": "contando",
    "layerHint": {
      "exoplanets": "Desligados por padrão. Marque para mostrá-los."
    },
    "layerCountEmpty": "vazia",
    "layerCountEmptyTitle": "Esta camada voltou sem nada: não foi possível ler a fonte, ou ela não tem nada agora.",
    "layerWaits": "ainda não",
    "layerWaitsTitle": "Carregada quando você a liga, para economizar dados.",
    "layersFailed": "{n} camadas voltaram vazias.",
    "layersFailedOne": "Uma camada voltou vazia.",
    "layersFailedWhy": "Ver fontes",
    "layerCountParts": {
      "onMap": "{n} no mapa",
      "riding": "{n} viajando em outro objeto",
      "unplaceable": "{n} sem posição conhecida",
      "auroraPeak": "até {n}% de chance",
      "lightningPerMin": "{n} descargas por minuto"
    },
    "layersEmpty": "Nenhuma camada foi carregada ainda.",
    "groups": {
      "around-earth": "Ao redor da Terra",
      "earth": "Tempo e solo",
      "solar-system": "Sistema solar",
      "beyond": "Estrelas e além"
    },
    "groupCount": "{on} de {n}",
    "groupAll": "Todas",
    "groupNone": "Nenhuma",
    "groupAllLabel": "Mostrar todas as camadas de {group}",
    "groupNoneLabel": "Ocultar todas as camadas de {group}",
    "layerFilter": "Buscar uma camada",
    "layersKeys": "Camadas. Setas movem; Espaço liga ou desliga.",
    "layerFilterEmpty": "Nenhuma camada com esse nome.",
    "keysRow": "Teclas",
    "keysRowTouch": "Gestos",
    "keysRowTitle": "Mostrar as teclas que movem a vista",
    "keysRowTitleTouch": "Mostrar os gestos que movem a vista",
    "swatchMixed": "Desenhado nas próprias cores",
    "keyedNote": "Pontos coloridos por {key}: a legenda está abaixo.",
    "localTimeFallback": "local",
    "locationPlaceholder": "Digite uma cidade",
    "locationSearchLabel": "Buscar uma cidade",
    "locationUseMine": "Usar minha localização",
    "locationUseMineTitle": "Perguntar ao navegador onde você está",
    "locationInsecure": "O navegador só compartilha sua localização com páginas servidas por https. Esta página está em http simples, então o botão está desligado. Escolha uma cidade, ou abra o endereço https quando houver um.",
    "locationUnsupported": "Este navegador não localiza você. Escolha uma cidade.",
    "locationDenied": "O navegador disse não. Escolha uma cidade.",
    "locationFailed": "O navegador não achou você. Escolha uma cidade.",
    "locationAsking": "Perguntando ao navegador",
    "locationClear": "Limpar",
    "locationNoMatch": "Nenhuma cidade da lista incluída corresponde a isso.",
    "tonightCouldNotLook": "Sem consulta: nenhum satélite carregado."
  },
  "search": {
    "title": "Buscar um objeto",
    "placeholder": "Buscar planeta, estrela, satélite",
    "placeholderPhone": "Buscar no espaço",
    "inputLabel": "Buscar um objeto pelo nome ou pelo número de catálogo",
    "listLabel": "Objetos encontrados",
    "fly": "Voar até lá",
    "flyTitle": "Levar a câmera ao objeto destacado e abrir a ficha dele",
    "hint": "Duas letras bastam. Enter escolhe o primeiro.",
    "noMatch": "Nada chamado “{q}” aqui.",
    "closest": "Nomes mais próximos",
    "more": "Há mais {n}. Digite mais para refinar.",
    "searching": "{n} objetos pesquisados.",
    "searchingOne": "Um objeto pesquisado.",
    "searchingBut": "{n} objetos pesquisados, {m} camadas ainda não.",
    "searchingButOne": "{n} objetos pesquisados, uma camada ainda não.",
    "empty": "Nada foi carregado ainda para pesquisar.",
    "inputTitle": "Buscar (/)",
    "key": "/",
    "notLoaded": "Não carregadas, por isso não pesquisadas: {layers}.",
    "stillLoading": "Ainda carregando, por isso não pesquisadas: {layers}.",
    "loadsWhenOn": "Carregadas só quando você as liga, para economizar dados, por isso ainda não pesquisadas: {layers}.",
    "couldNotRead": "Não puderam ser lidas, por isso não pesquisadas: {layers}.",
    "fallback": "Nada começa com isso. Estes contêm o termo.",
    "switchedOn": "Ligada: {layer}.",
    "belowHorizon": "{name} está abaixo do horizonte.",
    "notLoadedCount": "Quantos objetos isso deixa de fora só dá para saber quando carregarem."
  },
  "quality": {
    "dataSaver": "Economia de dados ativa: as duas maiores listas esperam.",
    "lowered": "Quadros lentos ({ms} ms): imagem simples.",
    "tierPhone": "Mapas de superfície em 2k, para o celular.",
    "tierSaver": "Mapas de superfície em 2k: poupa dados.",
    "tierSmall": "Mapas de superfície em 2k, para este aparelho.",
    "tierLatched": "Mapas de volta a 2k: quadros lentos.",
    "tierLow": "Mapas de superfície em 2k, como pede o modo Baixa.",
    "tier1": "Mapas de superfície em 4k, baixados quando há folga.",
    "tier2": "Mapas de superfície em 4k, mais mundos nítidos.",
    "promoted": "Subiu um degrau depois de quadros rápidos.",
    "mapsWorn": "Mapas neste aparelho: {credits}.",
    "panelTitle": "Qualidade",
    "choices": {
      "auto": "Auto",
      "low": "Baixa",
      "medium": "Média",
      "high": "Alta",
      "ultra": "Ultra"
    },
    "autoNow": "Auto: {tier}",
    "titles": {
      "auto": "Escolhida conforme este aparelho e a taxa de quadros",
      "low": "A imagem mais leve: para bateria fraca ou um notebook antigo",
      "medium": "Mapas, relevo e clima mais nítidos",
      "high": "Mais mundos nítidos ao mesmo tempo",
      "ultra": "Resolução máxima e os degraus mais finos de perto"
    },
    "fellBack": "Os quadros estavam lentos: a qualidade voltou para Auto.",
    "restore": "Recarregar em qualidade total",
    "restoreTitle": "Recarregue esta vista na qualidade que o seu dispositivo merece."
  },
  "status": {
    "title": "Fontes",
    "intro": "Toda fonte que o mapa lê, quão antiga é essa leitura e de onde ela vem. Nada aqui fica escondido num rodapé.",
    "stateOk": "ok",
    "stateStale": "desatualizada",
    "stateUnknown": "sem leitura",
    "stateOkTitle": "Lida recentemente e dentro do prazo de atualização.",
    "stateStaleTitle": "Temos uma cópia, mas ela é mais antiga do que esta fonte promete.",
    "stateUnknownTitle": "Nunca tivemos uma boa leitura desta fonte neste navegador. Isso não é o mesmo que estar tudo bem, nem o mesmo que um erro numa cópia que guardamos.",
    "ageNever": "nunca lida",
    "ageLabel": "última leitura {age}",
    "ageNeverLine": "ainda sem uma boa cópia neste navegador",
    "viaSnapshotLine": "da nossa cópia, obtida {age}",
    "viaLiveLine": "lida ao vivo de {publisher} {age}",
    "snapshotOverdue": "uma cópia mais recente está atrasada",
    "snapshotChecking": "(procurando uma mais nova)",
    "couldNotLookLine": "não foi possível consultar: {reason}",
    "reasonNoRoute": "{why}, e um navegador não consegue ler {publisher} diretamente",
    "snapshotWhy": {
      "no-index": "não foi possível ler o índice das nossas cópias",
      "not-in-index": "nossas cópias não incluem esta fonte",
      "refused": "a última coleta dela foi recusada",
      "error": "a última coleta dela falhou",
      "skipped": "o coletor a pulou",
      "unreadable": "não foi possível ler a nossa cópia dela"
    },
    "harvestUnchecked": "Nossas cópias: ainda não verificadas.",
    "harvestUnavailable": "Nossas cópias não estão disponíveis agora, então cada fonte abaixo é lida ao vivo de quem a publica, ou não é lida.",
    "harvestLine": "Nossas cópias: gravadas {age} · {ok} feeds ok · {refused} recusados · {error} com falha",
    "errorLabel": "Último erro",
    "attributionTitle": "Créditos",
    "attributionIntro": "Os dados deste mapa são trabalho de outras pessoas.",
    "footCreditsIntro": "Imagens e texturas:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "Texturas de planetas e estrelas, licenciadas sob CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "Imagens de nuvens, do lado da noite e da superfície, e os modelos 3D",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "Nuvens",
    "auroraTitle": "Aurora",
    "weatherTitle": "Raios",
    "layersTitle": "Ao vivo ou incluído",
    "layersIntro": "Ao vivo é lido de quem publica, ou calculado para este momento, enquanto você assiste. Um catálogo vem com o aplicativo: estrelas, galáxias e as antenas e os locais de pouso no solo não se movem enquanto você olha. Uma amostra incluída faz as vezes de uma fonte que o navegador não consegue acessar de jeito nenhum.",
    "layerLive": "ao vivo",
    "layerCatalogue": "catálogo",
    "layerSample": "amostra incluída",
    "layerIllustrative": "desenhado, não rastreado",
    "layerMixed": "misto",
    "layerEmpty": "nada carregado",
    "layerCountLabel": "{n} mostrados",
    "sourcesEmpty": "Nenhuma fonte foi declarada.",
    "notAsked": "Mais {n} fontes só são lidas quando se liga uma camada que precisa delas."
  },
  "time": {
    "justNow": "agora há pouco",
    "aMinuteAgo": "há um minuto",
    "minutesAgo": "há {n} minutos",
    "anHourAgo": "há uma hora",
    "hoursAgo": "há {n} horas",
    "aDayAgo": "há um dia",
    "daysAgo": "há {n} dias",
    "lessThanAMinute": "menos de um minuto",
    "aMinute": "um minuto",
    "minutes": "{n} minutos",
    "anHour": "uma hora",
    "hours": "{n} horas",
    "aDay": "um dia",
    "days": "{n} dias",
    "months": "{n} meses",
    "years": "{n} anos",
    "inFuture": "em {d}",
    "ago": "há {d}"
  },
  "sheet": {
    "handle": "Altura do painel",
    "closed": "fechado",
    "peek": "baixo",
    "half": "meio aberto",
    "full": "totalmente aberto",
    "state": "{height}. As setas para cima e para baixo mudam",
    "title": "Altura do painel: {height}. Toque ou arraste para mudar"
  },
  "print": {
    "title": "Salvar esta vista como cartão-postal de 6 por 4 polegadas (JPEG)",
    "making": "Fazendo o cartão-postal",
    "saved": "Cartão-postal salvo",
    "failed": "Não foi possível fazer o cartão-postal agora",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "Como o olho vê",
      "deep": "Realce profundo: luz fraca realçada"
    },
    "look": {
      "measured": "Modo Medido"
    }
  },
  "hud": {
    "fromYou": "de você",
    "fromPlace": "de {place}",
    "behind": "atrás: {world}",
    "offScreen": "{name}, a {distance}, fora da tela: voar até lá",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "Ocultar todos os painéis (H)",
    "show": "Mostrar os painéis de novo (H ou Esc)",
    "hint": "H ou Esc para os painéis. Shift+H mantém rótulos e hora"
  },
  "mark": {
    "label": "Código no GitHub",
    "title": "Código-fonte do Space Radar no GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "Kit de imprensa",
    "pressTitle": "O que é, imagens e a marca para usar",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "Estação",
    "satellite": "Satélite",
    "debris": "Detrito",
    "rocket": "Foguete",
    "probe": "Sonda",
    "telescope": "Telescópio",
    "asteroid": "Asteroide",
    "comet": "Cometa",
    "site": "Local em solo",
    "world": "Mundo",
    "star": "Estrela",
    "exoplanet": "Planeta de outra estrela",
    "dso": "Objeto do céu profundo",
    "exotic": "Objeto extremo",
    "storm": "Ciclone tropical",
    "earthevent": "Evento na Terra",
    "oddity": "Curiosidade",
    "unknown": "Objeto"
  },
  "cls": {
    "nearEarthApprox": "Tão perto da Terra, o lugar dele é aproximado: a órbita desenhada é só ao redor do Sol e deixa de fora a atração da Terra.",
    "label": "Como sabemos onde está",
    "measured": "posição medida",
    "inferred": "posição propagada a partir de elementos com {n} {unit} de idade",
    "inferredUnknownAge": "posição propagada a partir de elementos de idade desconhecida",
    "inferredNoElements": "posição calculada, não medida",
    "stormAdvisory": "o centro dele no aviso das {time} UTC, {ago}; uma tempestade se move, então já se moveu desde então",
    "stormAdvisoryDated": "o centro dele no aviso das {time} UTC de {date}, {ago}; uma tempestade se move, então já se moveu desde então",
    "illustrative": "desenhado para mostrar para onde vai; a trajetória real não é pública",
    "placeIllustrative": "sua órbita real, do catálogo do CelesTrak, em um ponto inventado ao longo dela; não temos elementos atuais dele",
    "sample": "dados de amostra incluídos, não uma posição ao vivo",
    "provisional": "ainda não está no catálogo público — estes são os elementos do próprio operador, publicados pelo CelesTrak; um número permanente vem quando o Space-Track o listar",
    "unknown": "não sabemos dizer como esta posição foi calculada",
    "unplaced": "ninguém sabe onde isto está, então nada é desenhado para ele",
    "inferredArc": "a última vez que alguém o viu foi em {date}, e {caveat}",
    "precisionSplit": "{anchorName} é medido com precisão de {anchorM} m; este foi {how} e está situado com precisão de {objectM} m",
    "precisionSplitUnknown": "{anchorName} é medido com precisão de {anchorM} m; este objeto em si nunca foi mapeado",
    "precisionSplitHowOnly": "{anchorName} é medido com precisão de {anchorM} m; este objeto foi {how}, e ninguém publicou com que precisão",
    "precisionOwn": "localizado com precisão de {objectM} m, {how}",
    "aboard": "esta é a posição do próprio {carrier}, porque o objeto está parafusado por fora dele e vai aonde ele vai",
    "how": {
      "surveyed": "mapeado a partir da órbita",
      "photogrammetric": "localizado em fotografias",
      "orbital_imaging": "localizado em imagens orbitais",
      "unsurveyed": "nunca mapeado",
      "map_reference": "tirado de um mapa"
    },
    "hourWord": "hora",
    "hoursWord": "horas",
    "dayWord": "dia",
    "daysWord": "dias",
    "minuteWord": "minuto",
    "minutesWord": "minutos",
    "yearWord": "ano",
    "yearsWord": "anos"
  },
  "unplaced": {
    "why": "{whyUnknown}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "Incêndio",
      "volcano": "Vulcão em erupção",
      "iceberg": "Iceberg"
    },
    "rows": {
      "kind": "O que é",
      "reported": "Último relato",
      "since": "Em erupção desde",
      "first": "Primeiro relato",
      "size": "Tamanho",
      "where": "Onde",
      "by": "Relatado por"
    },
    "sizeValue": "{n} km²",
    "sizeSmall": "menos de 1 km²",
    "by": "{agencies}, via NASA EONET",
    "sky": "Fica no solo. Da órbita, um incêndio é uma coluna de fumaça, um vulcão é uma coluna de cinzas e um iceberg é uma placa branca sobre água escura.",
    "drawn": "desenhado como uma marca no último lugar relatado; a extensão no solo não é desenhada",
    "honesty": "Um ponto do EONET da NASA, relatado pela última vez em {date} e lido {read}. Serve para olhar, não é um registro oficial de onde ou quando."
  },
  "deepFacts": {
    "methodRow": "Distância obtida por",
    "billionLightYears": "{n} bilhões de anos-luz",
    "methods": {
      "parallax": "paralaxe: o deslocamento da estrela dele contra o céu distante",
      "eclipsing-binary": "estrelas binárias eclipsantes dentro dele",
      "cepheid": "estrelas variáveis cefeidas dentro dele",
      "TRGB": "as gigantes vermelhas mais brilhantes dentro dele",
      "standard-candle": "estrelas ou explosões de brilho conhecido",
      "redshift": "o desvio para o vermelho, por meio de uma cosmologia",
      "kinematic": "a velocidade com que ele se move junto com a rotação da galáxia",
      "assumed-member-of-parent": "nenhuma própria: ele é colocado na distância da sua galáxia"
    },
    "drawnTag": {
      "reconstruction": "· reconstruído",
      "model": "· modelo",
      "photograph": "· fotografia",
      "catalogue": "· catálogo",
      "illustration": "· ilustração"
    },
    "drawnWords": {
      "reconstruction": "uma reconstrução 3D a partir de um estudo publicado",
      "model": "um modelo do seu tipo, não as estrelas dele",
      "photograph": "uma fotografia real, do nosso lado",
      "catalogue": "posições do catálogo",
      "illustration": "um brilho e uma marca ilustrativos do seu tipo"
    },
    "drawnLine": "O que é desenhado: {drawn}.",
    "drawnJoin": "; nas outras partes, ",
    "records": {
      "dso-milky-way": {
        "drawn": "uma ilustração construída sobre medições",
        "split": "Medido: as estrelas a poucos milhares de anos-luz (Gaia), o ângulo da barra, as direções ao longo dos braços e os braços mais próximos (Reid et al. 2019). Deduzido: o lado distante, além do centro, escondido pela poeira; os braços dele são os próximos levados para lá."
      }
    }
  },
  "truth": {
    "label": "Como sabemos",
    "hints": {
      "measured": "Medido",
      "inferred": "Calculado",
      "illustrative": "Ilustrativo",
      "sample": "Amostra",
      "unknown": "Desconhecido",
      "unplaced": "Sem posição",
      "reconstruction": "Reconstruído",
      "model": "Modelo",
      "photograph": "Fotografia",
      "catalogue": "Catálogo",
      "illustration": "Ilustração"
    },
    "loading": "Abrindo a legenda.",
    "failed": "A legenda não carregou. A linha abaixo diz o essencial."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "De perto, pequenos redemoinhos rolam onde os ventos medidos se cisalham e na esteira da Grande Mancha Vermelha, e o Oval BA e três ovais brancos giram. Onde está o cisalhamento é medido; cada redemoinho é gerado, mais fino que o mapa: ilustrativo."
    },
    "poles": {
      "jupiter": "Os ciclones ao redor de cada polo são modelados a partir das observações da Juno de 2017, oito ao redor de um no norte e cinco no sul: uma reconstrução, não uma fotografia. A camada mais escura nos intervalos é ilustrativa."
    }
  },
  "weatherDetail": "De mais perto do que o mapa é nítido, uma textura fina de nuvens em faixas é gerada para sustentar a imagem: ela se move com os ventos medidos e mantém as cores do próprio mapa, e nenhuma faixa dela é uma nuvem de verdade. Ilustrativo.",
  "weatherVortex": {
    "turning": {
      "saturn": "De perto, um pequeno ciclone gira dentro do hexágono: o olho dele tem 2 000 km de largura e a parede dele dá a volta a 150 metros por segundo, como a Cassini mediu em 2012. A espiral desenhada ao redor é ilustrativa, e hoje ninguém o observa."
    },
    "still": {
      "saturn": "De perto, um pequeno ciclone fica dentro do hexágono: o olho dele tem 2 000 km de largura, como a Cassini mediu em 2012, quando a parede dele dava a volta a 150 metros por segundo. A espiral desenhada ao redor é ilustrativa, e hoje ninguém o observa."
    }
  },
  "sunAlive": {
    "prominences": "{n} protuberâncias se erguem na borda, nas regiões ativas que a NOAA lista a até quinze graus do limbo. Os lugares são medidos; os formatos, as alturas e o movimento são ilustrativos.",
    "prominencesOne": "Uma protuberância se ergue na borda, em uma região ativa que a NOAA lista a até quinze graus do limbo. O lugar é medido; o formato, a altura e o movimento são ilustrativos.",
    "flare": "Uma erupção de classe {cls} aparece na região {region}: teve pico às {time} UTC de {date}, segundo a lista de eventos da NOAA. O horário, a classe, a região e o esmaecimento são medidos; o brilho com que é desenhada é ilustrativo.",
    "cme": "Uma ejeção de massa coronal que partiu às {time} UTC de {date} a {speed} km/s é desenhada como um coronógrafo a mostra: um laço brilhante se afastando, um vazio mais escuro atrás dele e um núcleo brilhante. O início, a direção, a largura e a velocidade vêm do catálogo DONKI da NASA; a nuvem mantém essa velocidade, o que as de verdade não fazem, e a aparência dela é ilustrativa."
  },
  "starSystem": {
    "zoneLabel": "Zona habitável, calculada",
    "orbitOf": {
      "mercury": "A órbita de Mercúrio, para comparar a escala",
      "earth": "A órbita da Terra, para comparar a escala",
      "jupiter": "A órbita de Júpiter, para comparar a escala",
      "neptune": "A órbita de Netuno, para comparar a escala"
    },
    "rows": {
      "known": "O que se sabe",
      "orbit": "Distância da estrela",
      "temperature": "Temperatura, calculada",
      "zone": "Zona habitável, calculada",
      "starTemperature": "Temperatura da superfície",
      "starWidth": "Largura",
      "starGlow": "Halo",
      "starMass": "Massa",
      "planets": "Planetas desenhados",
      "stars": "Estrelas no sistema",
      "companion": "Segundo sol"
    },
    "unseen": "Ninguém viu a superfície dele.",
    "measuredOne": "Medido: {what}.",
    "measuredMany": "Medidos: {what}.",
    "estimatedOne": "Estimativa: {what}.",
    "estimatedMany": "Estimativa: {what}.",
    "unmeasuredOne": "Não medido: {what}.",
    "and": " e ",
    "what": {
      "size": "tamanho",
      "year": "ano",
      "mass": "massa",
      "least": "massa mínima possível"
    },
    "au": "{n} UA",
    "auComputed": "{n} UA, calculado a partir do ano dele e da massa da estrela",
    "earthsEstimated": "{n}× a Terra, estimativa do arquivo a partir da massa",
    "massEstimated": "{n}× a Terra, estimativa do arquivo a partir do tamanho",
    "massLeast": "Pelo menos {n}× a Terra",
    "sizeDefault": "Não medido: desenhado do tamanho da Terra",
    "temperature": "{k} K ({c} °C), se refletir {pct}% da luz como a Terra faz",
    "zone": {
      "inside": "Dentro dela",
      "edge": "Na borda: só dentro dos limites mais largos",
      "hotter": "Mais perto da estrela que ela",
      "colder": "Mais longe da estrela que ela"
    },
    "zoneNone": {
      "too-hot": "Não calculada: a fórmula não cobre uma estrela tão quente",
      "too-cool": "Não calculada: a fórmula não cobre uma estrela tão fria",
      "no-temperature": "Não calculada: a temperatura da estrela não é medida",
      "no-luminosity": "Não calculada: o brilho da estrela não é medido",
      "twoStars": "Não calculada: ele orbita duas estrelas e o catálogo descreve uma"
    },
    "zoneRange": "{a} a {b} UA da estrela (Kopparapu et al. 2014)",
    "overlay": {
      "title": "Sobrepor ao mapa",
      "zone": "Zona habitável",
      "orbits": "Órbitas dos nossos planetas",
      "zoneTitle": "Onde a água líquida poderia durar na superfície de um planeta, calculado a partir da temperatura e do brilho da estrela",
      "orbitsTitle": "As órbitas dos planetas do nosso próprio Sistema Solar, desenhadas ao redor desta estrela para comparar a escala",
      "note": {
        "none": "Nada está sobreposto ao sistema.",
        "zone": "A faixa verde é a zona habitável, calculada (Kopparapu et al. 2014), não observada.",
        "orbits": "Os anéis tracejados são órbitas do nosso próprio Sistema Solar, para comparar a escala. Nada aqui as segue.",
        "both": "A faixa verde é a zona habitável, calculada; os anéis tracejados são as órbitas dos nossos planetas, para comparar a escala."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "Não medido",
    "starPoint": "Não medido: desenhada como um ponto de luz",
    "starWhite": "Não medido: desenhada em branco",
    "starGlowValue": "Desenhado mais largo que a estrela, na cor dela, para ser visto de longe",
    "starsOne": "{n} no catálogo; uma é desenhada",
    "starsBoth": "Duas, ambas desenhadas",
    "companionValue": "{width} de largura, {mass} de massa, {k} K{derived}",
    "companionDerived": " (valor de modelo; a cor é ilustrativa)",
    "zoneBoth": "{a} a {b} UA, somando a luz dos dois sóis",
    "pairLine": "Os dois sóis giram um em torno do outro a cada {days} dias, a {a} UA de distância em média, na órbita que os artigos científicos mediram; o planeta gira em torno dos dois. As posições deles são calculadas a partir dessa órbita; o plano em que são desenhados, o plano dos planetas, é o que a vista do céu usa.",
    "line": "Tamanhos e anos do NASA Exoplanet Archive, lido em {date}. As órbitas são desenhadas como círculos{computed}; as cores{phase} e a inclinação das órbitas são ilustrativas{defaults}.",
    "lineComputed": ", {n} deles com tamanho calculado a partir do ano e da massa da estrela",
    "lineDefaults": "; um planeta sem tamanho medido é desenhado do tamanho da Terra"
  },
  "shells": {
    "radio": "O rádio da Terra já chegou a {n} anos-luz"
  },
  "groundDoor": {
    "stand": "Ficar aqui",
    "drive": "Ficar aqui e dirigir",
    "standTitle": "Pisar o solo medido em {name}",
    "driveTitle": "Pisar o solo medido em {name} e dirigir o rover",
    "noDrive": "Este rover não pode ser dirigido aqui: o seu solo ainda não está medido no app. Curiosity, Perseverance, Zhurong e Opportunity podem, a partir dos seus próprios fichas."
  },
  "flood": {
    "on": "Iluminar",
    "off": "Luz real",
    "title": "Iluminar o modelo por igual, para que dê para vê-lo na sombra. Não é a luz real.",
    "note": "Nossa lâmpada, não a luz real."
  },
  "ephemeris": {
    "drawn": "Desenhado a partir do JPL Horizons, interpolado: a cerca de {km} km da própria trajetória do JPL.",
    "note": "O mapa guarda a trajetória dele para aquele dia, do JPL Horizons, com precisão de cerca de {km} km.",
    "noteLate": "A trajetória do JPL para ele começa {n} minutos depois deste momento, e o relógio vai para lá. Precisão de cerca de {km} km.",
    "noteDay": "A página da NASA informa o dia. O relógio vai para {time} UTC, a passagem mais próxima na trajetória do JPL naquele dia, com precisão de cerca de {km} km.",
    "failed": "A trajetória dele para aquele dia não carregou, então o relógio fica onde está. Escolha-o de novo para tentar outra vez.",
    "span": "A trajetória do JPL para ele vai de {from} a {to}.",
    "before": "O relógio está antes disso, então o mapa não tem posição para ele.",
    "after": "O relógio está depois disso, então o mapa não tem posição para ele.",
    "go": "Ir para a data disponível mais próxima",
    "goBefore": "Mover o relógio para {date}, onde a trajetória do JPL para ele começa",
    "goAfter": "Mover o relógio para {date}, onde a trajetória do JPL para ele termina"
  },
  "offline": {
    "updateReady": "Há uma versão mais nova pronta",
    "reload": "Recarregar"
  },
  "keepTrip": {
    "keep": "Guardar offline",
    "keepTitle": "Salvar a voz, os modelos e os mapas desta viagem neste aparelho, para que ela rode sem conexão",
    "keeping": "Guardando {done} de {total}",
    "kept": "Guardada offline",
    "keptTitle": "Guardada neste aparelho. Pressione para baixar de novo.",
    "keptNote": "{n} arquivos, {size}, salvos neste aparelho. Dados ao vivo (tempo, ciclones, satélites) não são guardados.",
    "again": "Tentar de novo",
    "failedNote": "Guardados {done} de {total} arquivos. Verifique a conexão e tente de novo."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "Pressione qualquer tecla para começar com som",
    "gateTitleTouch": "Toque na tela para começar com som",
    "gateNote": "Sem ninguém aqui, ele começa sem som, com legendas, em {n} segundos.",
    "upNext": "Próxima viagem",
    "shape": "{n} paradas · {m} min",
    "take": "Assumir o controle",
    "takeTitle": "Parar as viagens e mover o mapa você mesmo"
  },
  "drift": {
    "name": "À deriva",
    "pause": "Pausar (Espaço)",
    "resume": "Continuar (Espaço)",
    "next": "Próximo lugar (N)",
    "options": "Opções",
    "optionsTitle": "Por onde viajar, o que mostrar e o ritmo",
    "leave": "Parar de derivar (Esc)",
    "through": "Viajar por",
    "cats": {
      "craft": "Espaçonaves",
      "worlds": "Mundos",
      "small": "Corpos pequenos",
      "stars": "Estrelas",
      "deep": "Céu profundo"
    },
    "show": "Mostrar",
    "real": "Modelos reais",
    "realTitle": "Só coisas com modelo, mapa ou fotografia reais",
    "names": "Nomes",
    "namesTitle": "O nome e os números ao lado de cada lugar",
    "bare": "Só o espaço",
    "bareTitle": "Nada além do céu e das coisas nele: sem nomes, marcas, linhas ou painéis",
    "pace": "Ritmo",
    "paces": {
      "calm": "Calmo",
      "steady": "Constante",
      "brisk": "Ágil"
    },
    "hint": "À deriva. Arraste o mapa para assumir o controle",
    "nothing": "Nada para percorrer com essas escolhas",
    "notFromGround": "A deriva começa do espaço, não do chão"
  },
  "tour": {
    "label": "O tour",
    "micro": "Tour",
    "count": "{n} / {of}",
    "next": "Próximo",
    "nextTitle": "O próximo passo (N)",
    "done": "Concluir",
    "doneTitle": "Encerrar o tour",
    "skip": "Pular",
    "skipTitle": "Sair do tour (Esc)",
    "voice": "Voz",
    "voiceTitle": "Ler cada passo em voz alta, com uma voz sintética",
    "waited": "Dê uma olhada e depois continue.",
    "invite": "Primeira vez aqui: faça o tour",
    "inviteTitle": "Oito passos pelo mapa"
  },
  "undo": {
    "moved": "Movido para {name}",
    "movedNowhere": "A vista mudou",
    "night": "Noite em {name}: a vista ampla",
    "back": "Voltar para onde você estava",
    "done": "De volta para onde você estava"
  },
  "searchRows": {
    "kinds": {
      "sun": "Estrela",
      "planet": "Planeta",
      "moon": "Lua",
      "station": "Estação espacial",
      "satellite": "Satélite",
      "telescope": "Telescópio espacial",
      "probe": "Espaçonave",
      "rocket": "Foguete",
      "launch": "Lançamento",
      "debris": "Detrito",
      "asteroid": "Asteroide",
      "comet": "Cometa",
      "site": "Lugar",
      "landing": "Local de pouso",
      "star": "Estrela",
      "exoplanet": "Planeta de outra estrela",
      "dso": "Objeto do céu profundo",
      "storm": "Ciclone tropical",
      "oddity": "Curiosidade",
      "earthevent": "Evento na Terra",
      "blackhole": "Buraco negro",
      "pulsar": "Pulsar",
      "magnetar": "Magnetar",
      "quasar": "Quasar"
    },
    "upNow": "no céu agora, no {compass}",
    "lowNow": "baixo no {compass} agora",
    "downNow": "abaixo do seu horizonte agora",
    "trip": "Viagem",
    "starPattern": "Constelação de estrelas",
    "mission": "Missão",
    "eventName": "{mission}: {title}",
    "event": "Evento da missão · {date}",
    "eventNoDate": "Evento da missão",
    "group": "Constelação · {n} satélites no mapa · pressione para listá-los",
    "nearMe": "Perto de mim esta noite",
    "nearMeSub": "O que há no seu céu"
  },
  "countdown": {
    "go": "Liberado para o lançamento",
    "tbc": "Horário a confirmar",
    "tbd": "Horário ainda não definido",
    "hold": "Em espera: a contagem está pausada",
    "inFlight": "Em voo",
    "success": "Lançado",
    "deployed": "Carga liberada",
    "failure": "O lançamento falhou",
    "partial": "Uma falha parcial",
    "byPlan": "Conforme o plano. Sem notícia mais nova",
    "byPlanClimbing": "Conforme o plano, subindo. Sem notícia mais nova",
    "age": "lido {age}"
  },
  "today": {
    "title": "Hoje",
    "moonTitle": "{phase}",
    "moonLine": "{pct}% iluminada · {next} em {date}",
    "moonNext": [
      "lua nova",
      "quarto crescente",
      "lua cheia",
      "quarto minguante"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "Últimos 30 dias",
    "launched": "{n} novos objetos em órbita",
    "launchedLine": "Mais recente: {name}",
    "debris": "Detritos, em números",
    "debrisClose": "Fechar a vista de detritos",
    "debrisTitle": "Conta tudo o que está rastreado em órbita. Lê o catálogo inteiro, cerca de 1,5 MB"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a} e {b}.",
    "title": "Fontes: {sources}. Pressione para ir até lá",
    "names": {
      "sat-25544": "a ISS",
      "sat-48274": "a Tiangong"
    },
    "pass": "{name} passa sobre você {when}",
    "launch": "{name} deve decolar {when}",
    "showerToday": "o pico de {name} é hoje",
    "showerTomorrow": "o pico de {name} é amanhã",
    "moonName": "A Lua",
    "moonPhases": [
      "nova",
      "",
      "cheia",
      ""
    ],
    "moonToday": "a Lua está {phase} hoje",
    "moonOne": "a Lua está a um dia de ficar {phase}",
    "moonDays": "a Lua está a {n} dias de ficar {phase}",
    "moonLit": "a Lua está {pct}% iluminada",
    "crew": "{n} pessoas estão em órbita agora",
    "crewOne": "uma pessoa está em órbita agora",
    "storms": "{n} ciclones estão ativos",
    "stormOne": "um ciclone está ativo",
    "approach": "{name} passa pela Terra {when}",
    "launched": "{n} novos objetos chegaram à órbita em 30 dias",
    "dateToday": "hoje é {date}",
    "dateClock": "o relógio está ajustado para {date}",
    "sources": {
      "pass": "elementos do CelesTrak",
      "launch": "Launch Library 2",
      "shower": "calendário de chuvas de meteoros da IMO",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "relógio do seu aparelho"
    }
  },
  "wonder": {
    "kicker": "Maravilha do dia",
    "label": "Maravilha do dia: {title}"
  },
  "story": {
    "kicker": "A história da semana · semana {week}",
    "label": "A história da semana: {title}",
    "ruleTitle": "Como foi calculado: {rule}",
    "lowest": {
      "title": "O mais baixo do nosso catálogo: {name}",
      "line": "Nunca acima de {apogee} km, descendo até {perigee} km, uma volta em {min} min.",
      "rule": "Menor ponto mais alto entre {n} conjuntos de elementos com menos de 7 dias"
    },
    "farthest": {
      "title": "O mais distante do nosso catálogo: {name}",
      "line": "Vai até {apogee} km, volta a {perigee} km, uma volta em {lap}.",
      "hours": "{n} horas",
      "days": "{n} dias",
      "rule": "Ponto mais alto entre {n} conjuntos de elementos com menos de 7 dias"
    },
    "busiest": {
      "title": "A altura mais movimentada que temos: {lo} a {hi} km",
      "line": "{n} dos {total} objetos que temos voam ali: {pct} em 100.",
      "rule": "A faixa mais cheia de {band} km de altura média entre {n} conjuntos com menos de 7 dias"
    },
    "oldest": {
      "title": "O lançamento mais antigo do nosso catálogo: {name}",
      "line": "Lançado em {year}, {years} anos lá em cima, uma volta em {min} min.",
      "rule": "Ano de lançamento mais antigo entre {n} conjuntos de elementos com menos de 7 dias"
    }
  },
  "happened": {
    "flown": "Decolou {age}",
    "lost": "O lançamento falhou {age}"
  },
  "passport": {
    "title": "Passaporte",
    "openTitle": "Onde você já esteve, guardado só neste navegador",
    "summary": "{places} · {n} de {total} viagens",
    "places": "{n} lugares",
    "placeOne": "{n} lugar",
    "kept": "Guardado só neste navegador, nunca enviado.",
    "notKept": "Este navegador não guarda nada: nada aqui.",
    "placesTitle": "Lugares que você abriu",
    "tripsTitle": "Viagens concluídas",
    "outOf": "{n} de {total}",
    "barLabel": "{n} de {total} viagens concluídas",
    "placeTitle": "Ir para {name}",
    "noPlaces": "Nenhum lugar ainda. Abra um no mapa.",
    "noTrips": "Nenhuma viagem concluída ainda.",
    "seenTitle": "Visto com os seus próprios olhos",
    "noSeen": "Nada marcado ainda. Uma ficha tem um botão Eu vi.",
    "seenIt": "Eu vi",
    "toolsLabel": "Mais para este objeto",
    "seenOn": "Visto em {date}",
    "seenTitleOff": "Marque quando você o tiver visto com os seus próprios olhos",
    "seenTitleOn": "Marcado como visto. Pressione para desmarcar",
    "seenNotKept": "Este navegador não guarda nada, então a marca não vai ficar",
    "remind": "Lembrar",
    "remindTitle": "Baixa um arquivo de calendário com um lembrete: {title}",
    "forget": "Esquecer de mim",
    "forgetConfirm": "Sim, esquecer",
    "forgetTitle": "Apaga o passaporte e a escolha de som deste navegador",
    "forgotten": "Esquecido. Este navegador não guarda nada agora.",
    "stamp": "Viagem {n} de {total} · {date}",
    "stampPlaces": "{places} abertos até agora",
    "resume": "Continuar da parada {n}"
  },
  "kept": {
    "title": "O que este site guarda no seu aparelho",
    "lines": [
      "Seu passaporte: lugares abertos, viagens concluídas, coisas marcadas como vistas.",
      "Sua escolha de som e de voz, e como você deixou os painéis.",
      "Uma cópia dos últimos dados lidos, para o mapa abrir sem conexão.",
      "Enquanto uma tela roda sozinha, um registro curto das viagens dela, só para esta aba."
    ],
    "place": "Seu lugar é arredondado para um décimo de grau e só é guardado enquanto esta página está aberta.",
    "none": "Sem conta, sem cookies, sem análise de uso. Esquecer de mim, no Passaporte, apaga o passaporte e a escolha de som."
  },
  "buildInfo": {
    "line": "Construído a partir de {sha}, {date}",
    "title": "O commit a partir do qual este site foi construído, no GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "O espaço se parece com isto?",
    "lead": "Onde as coisas estão, e como se movem, é medido ou calculado. Como elas aparecem vem de três tipos de imagem.",
    "kinds": [
      [
        "Um modelo 3D",
        "As nebulosas e as galáxias são modelos 3D feitos a partir de medidas publicadas, com a luz tirada de fotografias de telescópio (de longa exposição); as que ainda não têm modelo são um brilho suave do seu tamanho. Para o olho, o mesmo gás é um brilho cinza e fraco. Uma ficha pode mostrar a fotografia ao lado do modelo."
      ],
      [
        "Um mapa sobre um modelo",
        "Planetas e luas são globos vestidos com mapas feitos de imagens de sondas, alguns suavizados por um artista. As espaçonaves são modelos 3D, a maioria de arquivos publicados pela NASA. A luz sobre eles é calculada para o momento mostrado."
      ],
      [
        "Uma concepção artística",
        "Ninguém viu a superfície de um planeta de outra estrela. Essas faces são imaginadas a partir de um tamanho e de uma temperatura medidos, e as fichas deles dizem isso."
      ]
    ],
    "foot": "Tamanhos e distâncias às vezes são alterados para que dê para ver a coisa. Quando são, a ficha ou a imagem avisa."
  },
  "debris": {
    "title": "Detritos em órbita",
    "reading": "Lendo o catálogo, cerca de 1,5 MB",
    "failed": "Não foi possível ler o catálogo.",
    "retry": "Tentar de novo",
    "empty": "O catálogo não lista nada em órbita.",
    "lead": "{gone} dos {total} objetos rastreados em órbita não funcionam mais.",
    "kinds": {
      "debris": "pedaços de detrito",
      "rocket": "estágios de foguete gastos",
      "dead": "satélites inativos",
      "working": "satélites em funcionamento"
    },
    "bandsTitle": "Por altura",
    "bands": {
      "low": "Abaixo de 600 km",
      "crowded": "600 a 1 000 km",
      "upper": "1 000 a 2 000 km",
      "medium": "2 000 a 34 000 km",
      "geo": "Por volta de 36 000 km",
      "beyond": "Além de 37 600 km",
      "stretched": "Órbitas alongadas"
    },
    "bandAria": "{band}: {total} no total. {debris} detritos, {rocket} corpos de foguete, {dead} satélites inativos, {working} em funcionamento.",
    "show": "Mostrar no mapa",
    "hide": "Ocultar do mapa",
    "showTitle": "Cada pedaço de detrito e cada foguete gasto, colorido por tipo",
    "drawn": "{n} pontos: cinza é detrito, amarelo é um foguete gasto. Cada um está na altura e na inclinação reais, em um ponto inventado da sua órbita.",
    "storiesTitle": "Do catálogo",
    "oneObject": "Um objeto",
    "objects": "{n} objetos",
    "oneLaunch": "um lançamento",
    "launches": "{n} lançamentos",
    "oneThing": "Uma coisa",
    "things": "{n} coisas",
    "storyLaunched": "Novidades no catálogo na semana até {date}: {objects}, de {launches}.",
    "storyCameDown": "Reentradas naquela semana: {things}.",
    "storyCameDownBiggest": "Reentradas naquela semana: {things}, a maior delas {name}.",
    "storyCloud": "A maior nuvem de detritos vem de {name}: {pieces} fragmentos ainda em órbita.",
    "storyClouds": "As maiores nuvens de detritos: {name}, {pieces} fragmentos ainda lá em cima; depois {name2}, {pieces2}, e {name3}, {pieces3}.",
    "storyOldest": "A coisa mais antiga ainda em órbita é {name}, lançada em {year}: {years} anos de voltas.",
    "untracked": "Pequenos demais para rastrear, segundo o modelo da ESA: cerca de {mid} milhões de fragmentos de 1 a 10 cm e {small} milhões de 1 mm a 1 cm, em {when}. Uma estimativa, não uma contagem.",
    "untrackedSource": "Estatísticas do ambiente espacial da ESA",
    "honesty": "Contado a partir do catálogo do CelesTrak lido em {date}: o que o radar consegue rastrear, a partir de cerca de 10 cm de largura. Pedaços menores são muito mais numerosos e não estão em nenhum catálogo. O ponto em que cada um fica na órbita é ilustrativo.",
    "drawnPlaced": "{n} pontos: cinza é detrito, amarelo é um foguete gasto. {placed} estão onde o seu próprio conjunto de elementos os põe; os outros {rest} estão na altura e na inclinação reais, em um ponto inventado da órbita.",
    "honestyPlaced": "Contado a partir do catálogo do CelesTrak lido em {date}: o que o radar consegue rastrear, a partir de cerca de 10 cm de largura. Pedaços menores são muito mais numerosos e não estão em nenhum catálogo. Os pontos vêm dos conjuntos de elementos do CelesTrak de {built}; um ponto sem conjunto de elementos publicado fica em um ponto inventado da órbita, e a sua ficha diz isso."
  },
  "klassFar": {
    "dwarf": "Planeta anão",
    "interstellar": "Objeto interestelar"
  },
  "moments": {
    "title": "O que você veio fazer aqui",
    "wonder": {
      "id": "wonder",
      "label": "Maravilha",
      "hint": "Voe por aí e toque em qualquer coisa."
    },
    "now": {
      "id": "now",
      "label": "Agora",
      "hint": "O que está sobre a sua cabeça neste minuto."
    },
    "next": {
      "id": "next",
      "label": "A seguir",
      "hint": "O que vem por aí, e quando."
    }
  },
  "audio": {
    "on": "Som: ligado",
    "off": "Som: desligado",
    "toggleTitle": "Música e sons. Desligados até você ligar; a escolha fica lembrada neste aparelho.",
    "mute": "Silenciar",
    "unmute": "Som",
    "muteTitle": "Desligar a música e os sons",
    "unmuteTitle": "Ligar a música e os sons",
    "panelTitle": "Som",
    "panelNote": "Uma trilha tranquila para o mapa e as viagens. Nada é baixado até você ligar.",
    "creditsLine": "Música e sons: {credits}",
    "narrationCredit": "Narração: uma voz sintética, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "Desenhado na cor que a luz dele mede (B−V {bv}, V−R {vr}), tão claro quanto a superfície reflete (albedo {albedo}), numa escala comprimida para que o mais escuro desses mundos ainda apareça.",
    "colourRed": "Desenhado na cor que a luz dele mede (B−V {bv}, V−R {vr}), uma das coisas mais vermelhas do Sistema Solar, tão claro quanto a superfície reflete (albedo {albedo}), numa escala comprimida para que o mais escuro desses mundos ainda apareça.",
    "shapeEgg": "A forma dele é o ovo que a curva de luz e uma ocultação estelar de 2017 mediram, {a} × {b} × {c} km.",
    "shapeMeasured": "A forma dele é a que ocultações estelares mediram.",
    "shapeUnknown": "A forma dele nunca foi medida, então é desenhado redondo.",
    "ring": "O anel está na distância, na largura e na opacidade medidas; a inclinação do anel no céu não é desenhada.",
    "faintRings": "Os dois anéis dele, descobertos em 2023, são fracos demais para serem vistos com a opacidade real, então não são desenhados.",
    "surface": "Nenhum telescópio resolveu a superfície dele: nada nela é desenhado, e ele é desenhado parado, sem girar.",
    "source": "Números: {src}."
  },
  "worldFace": {
    "titan": {
      "title": "Titã, de duas maneiras",
      "modes": {
        "own": "Infravermelho",
        "radar": "Radar"
      },
      "notes": {
        "own": "O solo de Titã como a câmera da Cassini o viu através da névoa, em luz do infravermelho próximo (938 nm), no laranja da névoa. Os mares do norte são escurecidos ao longo dos contornos que o radar da Cassini traçou e, de perto, onde o Sol se espelha neles, eles brilham: onde cai o brilho é calculado; o tamanho e a intensidade são ilustrativos.",
        "radar": "Faixas do solo de Titã como o radar da Cassini as viu através da névoa, de 2004 a 2015: claro é terreno áspero ou inclinado em direção ao radar, escuro é liso, e os mares de metano e etano líquidos são pretos. O cinza é nosso: o radar não tem cor. O radar viu 61% de Titã; entre as faixas aparece o mapa em infravermelho, escurecido, em laranja. USGS Astrogeology e NASA/JPL-Caltech, domínio público."
      }
    },
    "venus": {
      "title": "Vênus, de duas maneiras",
      "modes": {
        "own": "Nuvens",
        "surface": "Solo"
      },
      "notes": {
        "own": "O topo das nuvens, que é tudo o que um olho ou um telescópio já viu de Vênus.",
        "surface": "O solo sob as nuvens, mapeado por radar a partir da órbita pela Magellan, da NASA, entre 1990 e 1992. Claro é terreno áspero e escuro é liso. O laranja foi acrescentado, e as faixas que a Magellan não cobriu são preenchidas a partir das bordas. Ele é iluminado pelo Sol como se as nuvens não existissem: as montanhas e escarpas, do altímetro da Magellan, desenhadas seis vezes mais altas, projetam sombras. Ele não se move com as nuvens."
      }
    },
    "jupiter": {
      "title": "Júpiter, de duas maneiras",
      "modes": {
        "own": "Mapa de artista",
        "hubble": "Como o Hubble viu"
      },
      "notes": {
        "own": "Um mapa de artista, feito a partir de imagens de sondas e suavizado (Solar System Scope). É a imagem que a maioria das pessoas conhece.",
        "hubble": "Júpiter como o Hubble o mapeou em 11 de dezembro de 2025. As faixas estão onde estavam naquele dia, e nenhuma nuvem está onde está hoje. As cores são as dos filtros vermelho, verde e violeta do Hubble, um pouco mais amareladas do que um olho veria. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    "saturn": {
      "title": "Saturno, de duas maneiras",
      "modes": {
        "own": "Mapa de artista",
        "hubble": "Como o Hubble viu"
      },
      "notes": {
        "own": "Um mapa de artista, feito a partir de imagens de sondas e suavizado (Solar System Scope). É a imagem que a maioria das pessoas conhece.",
        "hubble": "Saturno como o Hubble o mapeou em 29 de agosto de 2025, nos filtros vermelho, verde e violeta, um pouco mais amarelado do que um olho veria. A faixa no equador que os anéis esconderam naquele dia é preenchida a partir das nuvens dos dois lados. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    "uranus": {
      "title": "Urano, de duas maneiras",
      "modes": {
        "own": "Mapa de artista",
        "hubble": "Como o Hubble viu"
      },
      "notes": {
        "own": "Um mapa de artista, feito a partir de imagens de sondas e suavizado (Solar System Scope). É a imagem que a maioria das pessoas conhece.",
        "hubble": "Urano como o Hubble o mapeou em 23 de outubro de 2025. O planeta gira deitado, com o polo norte voltado para nós, então o Hubble só viu a metade norte; a metade sul recebe a cor do equador, sem palpite. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    },
    "neptune": {
      "title": "Netuno, de duas maneiras",
      "modes": {
        "own": "Mapa de artista",
        "hubble": "Como o Hubble viu"
      },
      "notes": {
        "own": "Um mapa de artista, feito a partir de imagens de sondas e suavizado (Solar System Scope). É a imagem que a maioria das pessoas conhece.",
        "hubble": "Netuno como o Hubble o mapeou em 24 de agosto de 2025: mais pálido que as imagens famosas. O extremo norte ficou fora da vista do Hubble e recebe a cor das últimas nuvens que ele viu, sem palpite. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, adaptado."
      }
    }
  },
  "exposure": {
    "panelTitle": "Exposição",
    "modes": {
      "eye": "Olho",
      "camera": "Câmera",
      "deep": "Profunda"
    },
    "notes": {
      "eye": "O que você veria de um lugar escuro: fraco e cinza.",
      "camera": "Uma longa exposição: minutos de luz, como uma câmera a guarda.",
      "deep": "O realce de um observatório: o gás mais fraco ressaltado."
    },
    "real": "O gás é real, e fraco: para o olho num telescópio ele é um brilho cinza, porque o olho noturno não enxerga cor. O mapa o desenha como um modelo 3D; a fotografia que o controle deslizante mostra é uma longa exposição.",
    "colours": {
      "broadband": "Foi feita com filtros largos de cor ({filters}), então as cores ficam perto do que um olho muito mais sensível veria.",
      "mixed": "Foi feita com filtros largos de cor, mais um filtro estreito para o hidrogênio incandescente ({filters}), então o gás vermelho está mais forte aqui do que um olho o veria.",
      "narrowband": "As cores são mapeadas: cada uma é a luz de um único gás através de um filtro estreito ({filters}), escolhidas para mostrar a estrutura, não o que um olho veria.",
      "infrared": "Foi feita em luz infravermelha, que nenhum olho enxerga ({filters}), então toda cor aqui é escolhida: mostra o que existe, não o que um olho veria.",
      "unstated": "O arquivo dela não diz quais filtros foram usados, então não dizemos se estas são as cores que um olho veria."
    },
    "part": "Mostra {part}, não o todo.",
    "creditLead": "Imagem: ",
    "creditTail": " · {licence}, bordas esmaecidas e céu escurecido por nós"
  },
  "look": {
    "panelTitle": "Aparência",
    "modes": {
      "measured": "Medido",
      "film": "Filme"
    },
    "titles": {
      "measured": "Só o que é medido ou modelado, em ritmo real",
      "film": "Acrescenta detalhes gerados e clima ilustrativo"
    }
  },
  "lookSaid": {
    "measured": "Modo Medido: nada gerado nem ilustrativo é desenhado nele.",
    "film": "Modo Filme: detalhes gerados e clima ilustrativo são desenhados.",
    "worlds": {
      "saturn": "Clima: as faixas se movem às velocidades de vento que a Cassini mediu. Movimento modelado, não as nuvens de hoje."
    },
    "also": {
      "venus": "Raios em Vênus já foram relatados e ainda são debatidos; nenhum é desenhado."
    },
    "turning": {
      "jupiter": "De perto, o Oval BA e três ovais brancos giram onde o mapa os tem."
    },
    "poles": {
      "jupiter": "Os ciclones ao redor de cada polo são modelados a partir das observações da Juno de 2017, oito ao redor de um no norte e cinco no sul: uma reconstrução, não uma fotografia."
    },
    "sun": {
      "measured": "Modo Medido: o granulado gerado está desligado, e a coroa e as protuberâncias ficam paradas.",
      "film": "Modo Filme: o granulado é gerado, e a coroa e as protuberâncias se movem como desenhadas, não como medidas."
    }
  },
  "otherLight": {
    "panelTitle": "Outra luz",
    "bands": {
      "visible": "Visível",
      "infrared": "Infravermelho",
      "microwave": "Micro-ondas",
      "gamma": "Raios gama"
    },
    "notes": {
      "visible": "O céu como os olhos e as câmeras o veem.",
      "infrared": "O céu em infravermelho, em cor falsa: poeira morna e estrelas frias.",
      "microwave": "Micro-ondas, como brilho: a Galáxia sobre a luz mais antiga.",
      "gamma": "Raios gama, em cor falsa: pulsares, blazares, o brilho dos raios cósmicos."
    },
    "colours": {
      "infrared": "Vermelho é 22 µm, verde 4,6 µm, azul 3,4 µm (WISE)",
      "microwave": "Uma banda, 94 GHz, desenhada como brilho (WMAP)",
      "gamma": "Vermelho é 0,3 a 1 GeV, verde 1 a 3, azul acima de 3 (Fermi)"
    },
    "mixLabel": "Do céu visível para {band}",
    "mixValue": "{pct}% {band}",
    "loading": "Buscando a imagem do céu inteiro.",
    "failed": "Essa imagem não chegou. O céu continua como estava.",
    "creditLead": "Levantamento: ",
    "creditTail": ". Mosaicos: CDS, Estrasburgo."
  },
  "overlay": {
    "panelTitle": "Dados da Terra",
    "keyTitle": "No globo agora",
    "keyOff": "Tirar",
    "keyOffTitle": "Mostrar a Terra como ela é",
    "none": "Nenhum",
    "loading": "Pedindo a imagem à NASA.",
    "failed": "Essa imagem não chegou. O globo continua como estava.",
    "noEarth": "Mostrado na Terra, quando ela está à vista.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "A imagem é de {date}.",
      "monthly": "A imagem é a média de {date}."
    },
    "made": {
      "measured": "Medido da órbita; limpo onde nada foi visto.",
      "analysed": "Medido, com as lacunas preenchidas.",
      "modelled": "Um modelo meteorológico alimentado com medições, não uma imagem direta."
    },
    "credit": "Dados: {credit}, via NASA GIBS. Um mapa de dados, não uma fotografia.",
    "wind": {
      "title": "Vento",
      "loading": "Pedindo o campo de vento.",
      "failed": "O campo de vento não chegou. O globo continua como estava.",
      "what": "O vento a dez metros do solo; a cor é a velocidade.",
      "dated": "A previsão é para {date}, {time} UTC.",
      "mean": "Cerca de {mean} m/s em média, até {max}.",
      "sped": "Os traços movem {n} horas de vento por segundo.",
      "spedDay": "Os traços movem um dia de vento por segundo.",
      "still": "Cada traço é um pedaço do fluxo, parado.",
      "credit": "Dados: {credit}. Um modelo meteorológico, não uma medição."
    },
    "currents": {
      "title": "Correntes oceânicas",
      "loading": "Pedindo as correntes oceânicas.",
      "failed": "As correntes oceânicas de hoje não estão aqui. O globo continua como estava.",
      "what": "Correntes na superfície do mar; a cor é a temperatura da água.",
      "dated": "Calculadas a partir da altura do mar que satélites mediram em {date}: o fluxo constante, sem marés nem deriva do vento, menos certo no equador.",
      "tempDated": "Temperatura medida em {date}, lacunas preenchidas.",
      "tempMissing": "Um traço cinza é água sem temperatura nos dados.",
      "sped": "Os traços movem {n} dias de deriva por segundo; um traço longo é água rápida.",
      "spedHours": "Os traços movem {n} horas de deriva por segundo; um traço longo é água rápida.",
      "still": "Cada traço é um pedaço do fluxo, parado; um traço longo é água rápida.",
      "credit": "Dados: {credit}."
    },
    "legendAria": "{title}, de {low} a {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "As figuras são uma tradição, desenhadas por nós; as estrelas nos cantos delas estão nas distâncias medidas.",
    "lineSky": "As figuras são uma tradição, desenhadas por nós, sobre as estrelas como são vistas da Terra.",
    "ecliptic": "A linha tracejada é a eclíptica, o caminho do Sol ao longo do ano.",
    "distance": "{n} al",
    "namedDistance": "{name}, {n} al"
  },
  "colourKey": {
    "title": "Colorir por",
    "unknown": "desconhecido para estes",
    "scope": "Contando o que é desenhado daqui, nas camadas ligadas.",
    "byLayer": "A forma é o que ele é; a cor é a camada dele.",
    "crewed": "destes, construídos para levar tripulação",
    "swarm": "destes, em uma grande constelação"
  },
  "trajectory": {
    "label": "A trajetória dele, a próxima volta e meia",
    "ariaLabel": "Altura ao longo do tempo, e a trilha no solo em um mapa plano",
    "km": "{n} km",
    "now": "agora",
    "laps": "1½ volta depois",
    "north": "N",
    "south": "S",
    "note": "Calculado a partir dos mesmos elementos que o ponto; o mapa é o solo bem abaixo dele."
  },
  "timeFacts": {
    "label": "Os próximos 90 minutos",
    "barLabel": "Luz do Sol e sombra nos próximos 90 minutos: {parts}",
    "barSunlit": "{mins} min na luz do Sol",
    "barShadow": "{mins} min na sombra da Terra",
    "now": "agora",
    "end": "+90 min",
    "entersShadowIn": "Entra na sombra da Terra em {mins}",
    "entersSunlightIn": "Sai para a luz do Sol em {mins}",
    "entersShadowAt": "Entra na sombra da Terra às {time}",
    "entersSunlightAt": "Sai para a luz do Sol às {time}",
    "allSunlit": "Na luz do Sol durante todos os próximos 90 minutos",
    "allShadow": "Na sombra da Terra durante todos os próximos 90 minutos",
    "minutes": "{n} min",
    "underAMinute": "menos de um minuto",
    "lapIn": "Completa esta volta em {mmss}",
    "lapAt": "Completa esta volta às {time}",
    "orbit": "Órbita {n} desde o lançamento",
    "orbitNote": "Deduzido: a contagem do catálogo na época dos elementos, mais as voltas desde então.",
    "launched": "Lançado em {year}",
    "nowSunlit": "Na luz do Sol",
    "nowShadow": "Na sombra da Terra",
    "shadowIn": "sombra em {mins}",
    "sunlightIn": "luz do Sol em {mins}",
    "shadowAt": "sombra às {time}",
    "sunlightAt": "luz do Sol às {time}",
    "lapEndsIn": "volta termina em {mmss}",
    "lapEndsAt": "volta termina às {time}"
  },
  "train": {
    "label": "Em um trem",
    "oneOf": "Um de {n} lançados juntos ({designator}).",
    "youLead": "Este lidera.",
    "leads": "{name} lidera; este é o {position}º da fila.",
    "stillRaising": "Ainda subindo em fila, a cerca de {alt} km de altura — o colar de luzes que as pessoas relatam.",
    "spreadOut": "Já espalhados, a cerca de {alt} km de altura; não são mais uma fila no céu."
  },
  "aboard": {
    "label": "Também a bordo",
    "openTitle": "Abrir a ficha deste",
    "note": "Estes não têm um ponto próprio. Estão exatamente onde esta espaçonave está, porque estão presos a ela.",
    "backTitle": "Abrir a ficha da espaçonave que carrega este"
  },
  "myth": {
    "label": "Costuma-se dizer",
    "line": "{claim} — {correction}",
    "contested": "Costuma-se dizer, e é realmente disputado: {claim} — {correction}"
  },
  "source": {
    "prefix": "Fonte",
    "unknown": "Fonte não registrada",
    "fetched": "lido {age}"
  },
  "photo": {
    "title": "Compor uma imagem",
    "barLabel": "Imagem",
    "shapesLabel": "Formato",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "Enquadrar a imagem em {shape}",
    "caption": "Legenda",
    "captionTitle": "A faixa com o nome, a data e o endereço",
    "save": "Salvar imagem",
    "saveTitle": "Salvar o que está dentro da moldura como JPEG",
    "saveTitlePng": "Salvar o que está dentro da moldura como PNG",
    "timeLabel": "Hora",
    "earlier": "Antes",
    "later": "Depois",
    "timeTitle": "{dir}: {unit}, como o seletor de hora avança",
    "lens": "Lente",
    "lensValue": "{n}°",
    "lensTitle": "Campo de visão, {n} graus. Estreito é uma lente longa; largo abrange mais",
    "png": "PNG",
    "pngTitle": "Salvar sem perdas, em um arquivo maior",
    "share": "Compartilhar",
    "shareTitle": "Passar a imagem para o menu de compartilhamento deste aparelho",
    "sharedSaved": "Este aparelho não quis compartilhar. A imagem foi salva em vez disso",
    "done": "Sair do modo foto",
    "making": "Fazendo a imagem",
    "saved": "Imagem salva",
    "failed": "Não foi possível fazer a imagem agora",
    "honesty": "Desenhado a partir de posições medidas, não uma fotografia"
  },
  "tonight": {
    "title": "Esta noite",
    "placeGuess": "Perto de {place}, um palpite a partir do seu fuso horário",
    "placeSet": "De {place}",
    "placeMine": "De perto do seu lugar",
    "placeShared": "De {place}, compartilhado com você",
    "noPlace": "Defina onde você está para ver o que passa.",
    "coords": "{lat}, {lon}",
    "working": "Calculando as passagens desta noite…",
    "passLine": "{name} · {time} · de {from} a {to}, {fists} no ponto mais alto ({deg}°) · {mins} min",
    "startsIn": "Começa em {countdown}",
    "startsAt": "Começa às {time}",
    "upNow": "No céu agora, olhe para o {dir}",
    "showMe": "Mostrar",
    "showMeTitle": "Abrir o céu a partir do seu lugar, de frente para onde ele nasce",
    "guessCaveat": "Os horários podem variar alguns minutos.",
    "unitRises": "nasce",
    "unitHigh": "no ponto mais alto",
    "unitLong": "min à vista",
    "degrees": "{deg}°",
    "path": "De {from} a {to}",
    "rowDetail": "{time} · {deg} de altura · {mins} min",
    "nothingTonight": "Nada brilhante passa por cima esta noite.",
    "nextPass": "Próxima: {when} · {name}",
    "nothingAtAll": "Nada brilhante passa em três dias.",
    "darkFrom": "Escuro a partir das {time}",
    "darkUntil": "Escuro até as {time}",
    "darkNow": "Escuro agora",
    "neverDark": "Não escurece esta noite",
    "moonRises": "Lua {pct}%, nasce às {time}",
    "moonUp": "Lua {pct}%, no céu agora",
    "moonDown": "Lua {pct}%, abaixo do horizonte",
    "more": "Mais passagens",
    "fewer": "Menos passagens",
    "arcLabel": "O caminho dele pelo céu: nasce no {from}, ponto mais alto a {deg}° de altura, se põe no {to}",
    "cardinals": {
      "N": "N",
      "E": "L",
      "S": "S",
      "W": "O"
    },
    "best": {
      "title": "O melhor desta noite",
      "nothing": "Nada se destaca esta noite.",
      "rowTitle": "Mostrar no céu",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "mag {mag}",
      "passAria": "{name}: surge às {t0} {d0}, topo às {t1} ({deg}° {d1}), some às {t2} {d2}, magnitude {mag}.",
      "fades": "Ele some na sombra da Terra antes de se pôr.",
      "appears": "Ele sai da sombra da Terra no meio da subida.",
      "notVisible": "Não visível: o céu está claro ou ele está na sombra.",
      "rocket": "Corpo de foguete · {name}",
      "debris": "Detrito · {name}",
      "planetLine": "melhor às {time} · {deg}° de altura, {dir}",
      "moonTitle": "{phase} · {pct}%",
      "moonSets": "se põe às {time}",
      "moonRises": "nasce às {time}",
      "moonAllNight": "no céu a noite toda",
      "phases": {
        "new": "Lua nova",
        "waxingCrescent": "Lua crescente",
        "firstQuarter": "Quarto crescente",
        "waxingGibbous": "Lua gibosa crescente",
        "full": "Lua cheia",
        "waningGibbous": "Lua gibosa minguante",
        "lastQuarter": "Quarto minguante",
        "waningCrescent": "Lua minguante"
      },
      "showerLine": "até {zhr} por hora · melhor às {time}, {dir}",
      "dsoLine": "melhor às {time} · {deg}° de altura, {dir} · {how}",
      "dsoNeeds": {
        "eye": "a olho nu",
        "binoculars": "binóculo"
      },
      "view": "Minha vista",
      "viewHeight": "Altura mínima",
      "facings": {
        "any": "Todos os lados",
        "n": "Norte",
        "e": "Leste",
        "s": "Sul",
        "w": "Oeste"
      },
      "facingTitles": {
        "any": "O céu inteiro",
        "n": "Só o que é melhor no norte",
        "e": "Só o que é melhor no leste",
        "s": "Só o que é melhor no sul",
        "w": "Só o que é melhor no oeste"
      },
      "heights": {
        "0": "Qualquer altura",
        "15": "Acima de 15°",
        "30": "Acima de 30°"
      },
      "viewNothing": "Nada passa por essa parte do céu esta noite.",
      "darkHours": "Escuro {from}–{to}",
      "moonless": "sem Lua, uma noite escura",
      "moonBright": "Lua {pct}% esconde estrelas fracas",
      "moonFaint": "Lua {pct}%, pouca luz",
      "neverDark": "Não escurece esta noite.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "Calculado para o seu lugar. O brilho é estimado."
    },
    "skybar": {
      "title": "O céu",
      "field": "Campo de visão",
      "fields": {
        "eye": "Olho nu",
        "binoculars": "Binóculo",
        "telescope": "Telescópio"
      },
      "fieldNotes": {
        "eye": "Tão amplo quanto você vê. Role ou faça pinça para dar zoom.",
        "binoculars": "Um campo de 7°: aparecem estrelas mais fracas.",
        "telescope": "Um campo de 1°: os planetas viram discos."
      },
      "following": "Seguindo {name}. Arraste para soltar.",
      "followSet": "{name} se pôs, então a vista soltou.",
      "show": "Linhas e nomes",
      "toggles": {
        "figures": "Figuras",
        "names": "Nomes",
        "art": "Imagens",
        "bounds": "Limites",
        "sunPath": "Caminho do Sol",
        "equator": "Equador",
        "grid": "Grade",
        "starGrid": "Grade estelar",
        "meteors": "Meteoros",
        "trails": "Rastros",
        "seeThrough": "Solo transparente"
      },
      "toggleTitles": {
        "seeThrough": "Desenhar o solo transparente, para achar o que está sob o horizonte",
        "figures": "As figuras das constelações",
        "names": "Nomes das constelações e das estrelas brilhantes",
        "sunPath": "O caminho que o Sol, a Lua e os planetas seguem",
        "equator": "O equador do céu, acima do da Terra",
        "grid": "Altura e direção, com a linha norte-sul",
        "starGrid": "A grade sobre a qual as estrelas são mapeadas",
        "art": "As figuras ocidentais como desenhos, de Johan Meuris",
        "bounds": "Os limites oficiais das 88 constelações",
        "meteors": "Rastros das chuvas ativas esta noite, na taxa desta noite",
        "trails": "A última hora de cada estrela brilhante, em longa exposição"
      },
      "time": "Hora no céu",
      "timeNow": "Agora",
      "timeNowTitle": "Voltar ao presente",
      "timeDusk": "Anoitecer",
      "timeMidnight": "Meia-noite",
      "timeDawn": "Amanhecer",
      "timeTitles": {
        "dusk": "O fim do crepúsculo civil ao anoitecer",
        "midnight": "O meio da noite",
        "dawn": "O início do crepúsculo civil de manhã"
      },
      "timeStrip": "Arraste para girar o céu",
      "timeTicks": {
        "dusk": "Anoit.",
        "midnight": "Meia",
        "dawn": "Alva"
      },
      "timeStripAria": "A hora do céu: arraste, ou use as setas do teclado, dez minutos por passo",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "dia",
        "golden": "Sol baixo",
        "civil": "crepúsculo civil",
        "nautical": "crepúsculo náutico",
        "astronomical": "crepúsculo astronômico",
        "night": "noite"
      },
      "timeFar": "Sem satélites tão longe de hoje: órbitas desatualizadas.",
      "eyepiece": "Ocular",
      "eyepieces": {
        "low": "Baixa · 1°",
        "medium": "Média · 30′",
        "high": "Alta · 12′"
      },
      "eyepieceTitles": {
        "low": "Um campo de um grau: a largura de duas Luas cheias",
        "medium": "Meio grau: a Lua inteira",
        "high": "Um quinto de grau: planetas como discos"
      },
      "centre": "O que está no centro",
      "centreTitle": "Nomear o que está no meio da vista; Enter abre a ficha",
      "con": {
        "kind": "constelação",
        "label": "{name}, uma constelação.",
        "inside": "em {name}"
      },
      "landscape": {
        "city": "Horizonte: o de uma cidade, desenhado. Não a sua rua.",
        "hills": "Horizonte: morros, desenhados. Não os seus.",
        "coast": "Mar ao {dir}, a partir do mapa de água. Terra desenhada."
      },
      "artWesternOnly": "As imagens são das figuras ocidentais",
      "culture": "De quem é o céu",
      "cultures": {
        "western": "Ocidental",
        "chinese": "Chinês",
        "maori": "Māori",
        "hawaiian": "Havaiano",
        "samoan": "Samoano",
        "tongan": "Tonganês",
        "norse": "Nórdico",
        "boorong": "Boorong"
      },
      "cultureNotes": {
        "western": "As 88 constelações em que os astrônomos concordaram em 1922.",
        "chinese": "Uns 300 asterismos pequenos. Uma leitura de um céu vivo.",
        "maori": "Seis figuras. Os nomes variam entre os iwi; o céu é vivo.",
        "hawaiian": "Rotas estelares de navegador, usadas até hoje para guiar.",
        "samoan": "Catorze figuras da tradição samoana. Uma tradição viva.",
        "tongan": "Caminhos e figuras de estrelas de Tonga. Uma tradição viva.",
        "norse": "Seis figuras, uma reconstrução do céu nórdico.",
        "boorong": "O céu de uma família Boorong, contado em 1857. Ainda vivo."
      },
      "cultureCredits": {
        "western": "Imagens: Johan Meuris, para o Stellarium, Free Art License. Carina, Puppis e Vela compartilham um desenho; Serpens não tem nenhum.",
        "chinese": "Figuras: Sun Shuwei e Karrie Berglund, para o Stellarium, CC BY-SA 4.0. Uma reconstrução documentada.",
        "maori": "Figuras: Dan Smale, para o Stellarium, CC BY-SA 4.0. Uma reconstrução documentada.",
        "hawaiian": "Figuras: segundo Nainoa Thompson, pela Kamehameha Schools Kapālama, para o Stellarium, CC BY-SA 4.0.",
        "samoan": "Figuras: Jake Fitisemanu com guardiões samoanos, para o Stellarium, CC BY-SA 4.0. Uma reconstrução documentada.",
        "tongan": "Figuras: Dan Smale, para o Stellarium, CC BY-SA 4.0. Uma reconstrução documentada a partir de fontes limitadas.",
        "norse": "Figuras: Jonas Persson, para o Stellarium, CC BY-SA 4.0. Uma reconstrução, não um registro.",
        "boorong": "Figuras: John Morieson e Alex Cherney, para o Stellarium, CC BY-SA 4.0. Uma leitura de um céu vivo."
      },
      "meteorNote": "{name}: uns {n} por hora neste céu.",
      "meteorFew": "{name}: menos de um por hora neste céu.",
      "meteorDown": "{name}: radiante abaixo, sem rastros.",
      "meteorHonest": "A taxa desta noite é um modelo. Os rastros são ilustrativos.",
      "meteorSporadic": "Sem chuva esta noite. Fonte antissolar: {n} por hora.",
      "darkness": "Seu céu",
      "darknessModes": {
        "city": "Cidade",
        "town": "Periferia",
        "dark": "Lugar escuro"
      },
      "darknessAuto": "Auto",
      "darknessAutoTitle": "Ler o tipo de céu pelas luzes noturnas do seu lugar",
      "darknessBy": {
        "place": "Estimado pelo mapa de luzes noturnas da NASA no seu lugar.",
        "reading": "Lendo as luzes noturnas do seu lugar.",
        "unread": "Não deu para ler o mapa de luzes: escolha o seu céu.",
        "trip": "Fixado por esta parada da viagem."
      },
      "darknessNotes": {
        "city": "Cidade: estrelas até a magnitude 4, sem Via Láctea.",
        "town": "Periferia: estrelas até a magnitude 5,3.",
        "dark": "Lugar escuro: estrelas até 6,5 e a Via Láctea."
      },
      "point": {
        "row": "Apontar o celular",
        "on": "Apontar o celular",
        "title": "Levante o celular: a vista gira com ele",
        "note": "Levante o celular para o céu e gire. A vista acompanha.",
        "noPlace": "Precisa do seu lugar, para saber onde fica o norte.",
        "denied": "O celular negou o sensor de movimento. Arrastar funciona.",
        "deniedHow": "Para permitir: recarregue e escolha Permitir.",
        "none": "Nenhum sensor de movimento respondeu. Arrastar funciona.",
        "unsupported": "Sem sensor de movimento neste navegador. Arrastar funciona.",
        "lineUpWith": "Céu errado? Arraste até {name} alinhar.",
        "lineUpPlain": "Céu errado? Arraste até uma estrela brilhante alinhar.",
        "lined": "Alinhado à mão, a {n}° da bússola.",
        "reset": "Desfazer o alinhamento",
        "resetTitle": "Voltar ao norte da própria bússola",
        "accuracy": "A bússola diz ter precisão de cerca de {n}°.",
        "relative": "Sem bússola aqui. Arraste o céu para alinhá-lo.",
        "declination": "Norte verdadeiro: bússola corrigida em {n}° a {dir}.",
        "east": "leste",
        "west": "oeste",
        "honest": "O norte é o da bússola do celular. Metal por perto o desvia."
      },
      "red": "Luz vermelha",
      "redTitle": "Deixar a página vermelha para manter os olhos acostumados ao escuro",
      "honesty": "Estrelas medidas, planetas calculados, ar modelado, solo desenhado"
    }
  },
  "keyHint": {
    "title": "Controles",
    "titleTouch": "Gestos",
    "label": "Teclas que movem a vista",
    "labelTouch": "Gestos que movem a vista",
    "close": "Fechar",
    "closeTitle": "Fechar (Esc)",
    "does": {
      "turn": "Girar",
      "zoom": "Aproximar, afastar",
      "pan": "Mover de lado",
      "pick": "Escolher uma coisa",
      "search": "Buscar",
      "hide": "Ocultar tudo",
      "show": "O que mostrar",
      "share": "Compartilhar",
      "esc": "Fechar",
      "keys": "Todas as teclas",
      "tripPlay": "Tocar, pausar",
      "tripStep": "Voltar, avançar",
      "tripCard": "Ocultar ficha",
      "tripReplay": "Repetir",
      "tripSound": "Som",
      "tripLeave": "Sair"
    },
    "how": {
      "drag": "Arraste",
      "wheel": "Role",
      "pinch": "Pinça",
      "two": "Dois dedos",
      "tap": "Toque"
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
      "esc": "Esc",
      "help": "?",
      "space": "Espaço",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "Atalhos de teclado",
    "tripTitle": "Em uma viagem"
  },
  "render": {
    "eyebrow": "Space Radar · uma viagem",
    "site": "spaceradar.ai",
    "fly": "Voe você mesmo",
    "music": "Música: John Bartmann, CC0. Créditos completos em spaceradar.ai."
  },
  "glossary": {
    "title": "Palavras desta página",
    "hint": "Toque em um termo para ver uma frase simples."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} é um incêndio que estava aqui no último relato, {date}",
        "volcano": "{name} está em erupção desde {date}",
        "iceberg": "{name} estava aqui no último relato, {date}"
      },
      "size": "cerca de {n} km² naquele relato"
    },
    "storm": {
      "lead": "{name} é {a} {status} cujo centro estava aqui {ago}",
      "leadUnknown": "{name} é um ciclone tropical cujo centro estava aqui {ago}",
      "leadBefore": "{name} é {a} {status} cujo centro chega aqui {ago}",
      "leadBeforeUnknown": "{name} é um ciclone tropical cujo centro chega aqui {ago}",
      "wind": "os ventos mais fortes na trajetória dele, incluindo a previsão, chegam a {n} km/h",
      "statuses": {
        "hurricane": "furacão",
        "typhoon": "tufão",
        "cyclone": "ciclone tropical",
        "storm": "tempestade tropical",
        "depression": "depressão tropical"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} é um buraco negro a {dist} anos-luz de distância",
      "leadPulsar": "{name} é um pulsar a {dist} anos-luz de distância",
      "leadMagnetar": "{name} é um magnetar a {dist} anos-luz de distância",
      "leadQuasar": "{name} é um quasar a {dist} anos-luz de distância",
      "leadStar": "{name} é uma estrela a {dist} anos-luz de distância",
      "leadRange": "{name} é {a} {kind} em algum ponto entre {lo} e {hi} anos-luz de distância",
      "mass": "com {n} vezes a massa do Sol",
      "massRange": "com massa entre {lo} e {hi} vezes a do Sol",
      "massMillions": "com {n} milhões de vezes a massa do Sol",
      "massBillions": "com {n} bilhões de vezes a massa do Sol",
      "spins": "girando {n} vezes por segundo",
      "spinsSlow": "girando uma vez a cada {n} segundos",
      "kinds": {
        "blackhole": "buraco negro",
        "pulsar": "pulsar",
        "magnetar": "magnetar",
        "star": "estrela",
        "quasar": "quasar"
      }
    },
    "dso": {
      "leadHome": "{name} é a galáxia em que vivemos; o centro dela fica a {dist} anos-luz de distância",
      "lead": "{name} é {a} {type} a {dist} anos-luz de distância",
      "leadRange": "{name} é {a} {type} em algum ponto entre {lo} e {hi} anos-luz de distância",
      "leadUntyped": "{name} fica a {dist} anos-luz de distância",
      "size": "cerca de {n} anos-luz de largura",
      "seenAs": "visto como era há {n} anos",
      "seenAsMillions": "visto como era há {n} milhões de anos",
      "constellation": "na constelação de {con}",
      "kinds": {
        "galaxy": "galáxia",
        "nebula": "nebulosa",
        "cluster": "aglomerado de estrelas",
        "other": "objeto do céu profundo"
      }
    },
    "exoplanet": {
      "lead": "{name} é um planeta ao redor da estrela {host}, a {dist} anos-luz de distância",
      "leadNoHost": "{name} é um planeta ao redor de outra estrela, a {dist} anos-luz de distância",
      "size": "cerca de {n} vezes a largura da Terra",
      "sizeSmaller": "cerca de {n} da largura da Terra",
      "mass": "{n} vezes a massa da Terra",
      "year": "o ano dele dura {n} dias",
      "yearHours": "o ano dele dura {n} horas",
      "found": "descoberto em {year} pelo método {method}",
      "foundYear": "descoberto em {year}",
      "asOf": "de uma cópia do catálogo de {date}"
    },
    "star": {
      "lead": "{name} é uma estrela a {dist} anos-luz de distância",
      "leadColour": "{name} é {a} estrela {colour} a {dist} anos-luz de distância",
      "near": "uma das mais próximas que existem",
      "seenAs": "vista como era há {n} anos",
      "seenAsMonths": "vista como era há {n} meses",
      "luminosity": "brilhando {n} vezes mais que o Sol",
      "dimmer": "brilhando com {n} do brilho do Sol",
      "colours": {
        "O": "azul",
        "B": "branco-azulada",
        "A": "branca",
        "F": "amarelo-esbranquiçada",
        "G": "amarela",
        "K": "laranja",
        "M": "vermelha"
      }
    },
    "station": {
      "lead": "{name} é uma estação espacial tripulada que gira ao redor da Terra",
      "whyPass": "cruzando o seu céu às {time}",
      "crew": "com {crew} pessoas a bordo",
      "altitude": "a {alt} km de altura",
      "speed": "dando uma volta a cada {period} minutos"
    },
    "satellite": {
      "lead": "{name} é um satélite que gira ao redor da Terra",
      "leadKind": "{name} é {kind} que gira ao redor da Terra",
      "leadDocked": "{name} é {kind} em acoplagem na {station}",
      "aSpacecraft": "uma espaçonave",
      "aTelescope": "um telescópio espacial",
      "whyLaunchedDays": "lançado há {n} dias",
      "whyLaunchedYear": "lançado em {year}",
      "operator": "operado por {operator}",
      "purpose": "{purpose}",
      "altitude": "a {alt} km de altura",
      "whyPass": "cruzando o seu céu às {time}"
    },
    "debris": {
      "lead": "{name} é um pedaço de detrito rastreado",
      "origin": "restante de {origin}",
      "brokeUp": "que se partiu em {year}",
      "decay": "com previsão de voltar à atmosfera por volta de {date}",
      "altitude": "a {alt} km de altura",
      "burnsUp": "quase tudo dele queima na descida"
    },
    "rocket": {
      "lead": "{name} é um lançamento de foguete",
      "leadWithPad": "{name} é um lançamento de foguete de {pad}",
      "leadStage": "{name} é um estágio de foguete gasto que gira ao redor da Terra",
      "stageLaunched": "lançado em {year}",
      "whyCountdown": "decolando {when}",
      "whyFlown": "que decolou {when}",
      "destination": "rumo a {destination}",
      "missionType": "uma missão de {missionType}",
      "illustrative": "a trajetória desenhada aqui é um esboço da subida, não um caminho medido"
    },
    "probe": {
      "lead": "{name} é uma espaçonave lá fora no sistema solar",
      "leadOrbits": "{name} é uma espaçonave que orbita {world}",
      "destination": "a caminho de {destination}",
      "lightTime": "longe o bastante para que uma mensagem de rádio leve {mins} minutos em cada sentido",
      "lightTimeSeconds": "perto o bastante para que uma mensagem de rádio leve {secs} segundos em cada sentido",
      "lightTimeHours": "longe o bastante para que uma mensagem de rádio leve {hours} horas em cada sentido",
      "distanceSun": "a {au} unidades astronômicas do Sol",
      "milestone": "com {milestone} previsto para {date}"
    },
    "telescope": {
      "lead": "{name} é um telescópio espacial",
      "observing": "apontado para {target} esta semana",
      "station": "estacionado em {station}",
      "altitude": "a {alt} km de altura",
      "sees": "ele enxerga em {band}"
    },
    "asteroid": {
      "lead": "{name} é um objeto próximo da Terra, em órbita própria ao redor do Sol",
      "leadMainBelt": "{name} é um asteroide do cinturão principal, entre Marte e Júpiter",
      "leadBeyond": "{name} é um corpo pequeno além de Netuno, na sua própria órbita em torno do Sol", // 0079 B1
      "leadDwarf": "{name} é um planeta anão em órbita própria ao redor do Sol",
      "leadDwarfBelt": "{name} é um planeta anão no cinturão de asteroides, entre Marte e Júpiter",
      "leadDwarfBeyond": "{name} é um planeta anão além de Netuno",
      "leadDwarfFarBeyond": "{name} é um planeta anão bem além de Netuno",
      "leadInterstellarOut": "{name} veio de outra estrela e está saindo do Sistema Solar",
      "leadInterstellarIn": "{name} veio de outra estrela e está caindo em direção ao Sol",
      "distanceSun": "a {au} unidades astronômicas do Sol",
      "whyApproach": "passando pela Terra em {date} a {ld}× a distância da Lua",
      "size": "{size}",
      "willNotHit": "não vai atingir a Terra"
    },
    "comet": {
      "lead": "{name} é um cometa em uma longa volta ao redor do Sol",
      "leadPeriodic": "{name} é um cometa que dá a volta ao redor do Sol a cada {n} anos",
      "leadInterstellarOut": "{name} é um cometa de outra estrela, saindo do Sistema Solar",
      "leadInterstellarIn": "{name} é um cometa de outra estrela, caindo em direção ao Sol",
      "whyPerihelion": "mais perto do Sol em {date}",
      "nakedEye": "brilhante o bastante para ser achado sem telescópio",
      "faint": "fraco demais para ser visto sem telescópio",
      "distanceSun": "a {au} unidades astronômicas do Sol"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} é uma das coisas curiosas que as pessoas mandaram para fora do planeta"
    },
    "site": {
      "lead": "{name} é um lugar em terra que trabalha com espaçonaves",
      "leadKind": "{name} é {a} {kind}",
      "where": "em {where}",
      "whyDsn": "falando com {spacecraft} agora mesmo",
      "whyLaunch": "com {launch} previsto para {when}",
      "kinds": {
        "pad": "plataforma de lançamento",
        "dish": "antena de rádio",
        "observatory": "observatório",
        "tracking": "estação de rastreamento"
      }
    },
    "world": {
      "lead": "{name} é um mundo do sistema solar",
      "leadMoon": "{name} é a lua natural da Terra",
      "leadSun": "{name} é a estrela no centro do sistema solar",
      "distanceKm": "a {n} km de distância",
      "whyPhase": "{phase} esta noite",
      "whyRise": "nascendo, de onde você está, às {time}",
      "distance": "{distance}",
      "diameter": "cerca de {n} km de diâmetro",
      "leadWhat": "{name} é {what}",
      "what": {
        "pluto": "um planeta anão além de Netuno, contado como o nono planeta até 2006",
        "io": "uma das quatro grandes luas de Júpiter, e o mundo mais vulcânico do sistema solar",
        "europa": "uma das quatro grandes luas de Júpiter, com um oceano de água salgada sob o gelo",
        "ganymede": "a maior lua de Júpiter e a maior do sistema solar, maior que Mercúrio",
        "callisto": "uma das quatro grandes luas de Júpiter, e o objeto com mais crateras do sistema solar",
        "titan": "a maior lua de Saturno, sob uma densa névoa laranja, com lagos de metano; a Huygens pousou ali em 2005",
        "enceladus": "uma pequena lua gelada de Saturno cujos gêiseres lançam ao espaço o oceano que fica sob o gelo",
        "triton": "a maior lua de Netuno; ela orbita ao contrário e provavelmente é um objeto do Cinturão de Kuiper capturado",
        "charon": "a maior lua de Plutão, com metade do tamanho dele; os dois sempre voltam as mesmas faces um para o outro",
        "phobos": "a maior das duas luas de Marte, uma rocha irregular que espirala em direção a Marte a 1,8 m por século",
        "deimos": "a menor das duas luas de Marte, uma pequena rocha irregular coberta de crateras",
        "mimas": "a lua redonda mais interna de Saturno, marcada por uma cratera com um terço da largura da própria lua",
        "tethys": "a quinta maior lua de Saturno, quase só gelo de água, cortada por um desfiladeiro e por uma cratera enorme",
        "dione": "uma lua gelada de Saturno cujo lado de trás é entrecortado por uma rede de penhascos de gelo brilhantes",
        "rhea": "a segunda maior lua de Saturno, uma bola de neve suja e congelada de gelo e rocha",
        "iapetus": "a terceira maior lua de Saturno: um lado escuro como carvão, o outro dez vezes mais brilhante",
        "miranda": "a menor das cinco grandes luas de Urano, com cânions até 12 vezes mais fundos que o Grand Canyon",
        "ariel": "a mais brilhante e de aparência mais jovem das cinco grandes luas de Urano, cortada por vales de falhas",
        "umbriel": "a mais escura das grandes luas de Urano, que reflete cerca de um quinto da luz que chega a ela",
        "titania": "a maior lua de Urano, de cinza neutro, cortada por vales de falhas com quase 1 600 km de comprimento",
        "oberon": "a segunda maior lua de Urano, escura, cheia de crateras, e com uma montanha de 6 km de altura"
      }
    }
  },
  "live": {
    "label": "Da Terra agora",
    "km": "km",
    "light": "A luz leva",
    "lightYears": "anos-luz",
    "noteFar": "Calculado a partir da posição desenhada, com três algarismos. Não fica mudando.",
    "note": "Calculado a partir da órbita desenhada. Os últimos dígitos mostram que ele se move, não o lugar dele ao quilômetro.",
    "seconds": "{s} s",
    "minSec": "{min} min {s} s",
    "hourMinSec": "{h} h {min} min {s} s",
    "sparkLabel": "Distância da Terra",
    "sparkAria": "Distância da Terra de {from} a {to}. {closest}",
    "sparkNow": "agora",
    "closest": "Mais perto: {date} · {dist}",
    "closestAbout": "Mais perto: por volta de {date} · {dist}",
    "months": [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez"
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "Ajustar o relógio para esta maior aproximação",
    "moonDistances": "{n} distâncias da Lua",
    "au": "{n} UA",
    "sparkNote": "Calculado a partir da órbita desenhada, um ponto a cada seis dias.",
    "sparkApprox": "Tão perto, a data e a distância são aproximadas: a atração da Terra fica de fora.",
    "upYears": "No espaço há {n} anos: lançado em {date}",
    "upOneYear": "No espaço há 1 ano: lançado em {date}",
    "upUnderAYear": "No espaço há menos de um ano: lançado em {date}",
    "upSinceYear": "Lançado em {year}: cerca de {n} anos lá em cima",
    "upSinceYearNew": "Lançado em {year}",
    "smallBodyHonest": "Calculado a partir da órbita para um horizonte ao nível do mar. Estar no céu não é ser brilhante o bastante para ver: a maioria precisa de telescópio."
  },
  "crew": {
    "label": "Pessoas a bordo",
    "count": "{n} pessoas a bordo",
    "countOne": "1 pessoa a bordo",
    "hint": "{n} a bordo",
    "person": "{agency} · {days} dias no espaço",
    "personNoAgency": "{days} dias no espaço",
    "dockedLabel": "Acoplado agora, e desde quando",
    "docked": "{port} · {date}",
    "asOf": "Lido {age} do Launch Library 2 (The Space Devs).",
    "stale": "Lido em {date}: com mais de dois dias, pode ter mudado.",
    "joined": "Os nomes são as tripulações dos veículos acoplados agora.",
    "unmatched": "Os nomes registrados não bateram com esta contagem, então nenhum é mostrado.",
    "waiting": "Lendo a lista da tripulação.",
    "none": "Sem lista de tripulação para esta estação."
  },
  "happened7": {
    "launchesFrom": "de {place}",
    "reached": "chegou à órbita",
    "failed": "não chegou à órbita",
    "partial": "chegou à órbita, mas não à planejada",
    "launchDetail": "{rocket}: {status}, {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "Voltou à Terra em {date} (data de decaimento do catálogo)",
    "debris": "e {n} pedaços de detrito",
    "debrisOne": "e 1 pedaço de detrito",
    "showAll": "Mostrar todos os {n}",
    "showFewer": "Mostrar menos",
    "asOf": "Lançamentos lidos {age} do Launch Library 2.",
    "stale": "Lançamentos lidos em {date}: com mais de dois dias.",
    "none": "Nada registrado nos últimos sete dias.",
    "waiting": "Lendo o que aconteceu.",
    "decays": "O que voltou à Terra",
    "decaysTitle": "Lê o catálogo inteiro, cerca de 1,5 MB",
    "decaysNone": "Nada inteiro voltou à Terra nos últimos sete dias.",
    "decaysFailed": "Não foi possível ler o catálogo.",
    "flyTitle": "Voar até o lugar de onde foi lançado",
    "ago": "{age}"
  },
  "oldest": {
    "label": "No espaço há mais tempo",
    "row": "{years} anos · lançado em {date}",
    "note": "Cargas úteis e corpos de foguete ainda em órbita, pela data de lançamento no catálogo.",
    "showTitle": "Mostrar no mapa"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "Abre a página do próprio {publisher} em uma nova aba"
  },
  "placeKeep": {
    "group": "Onde você está",
    "change": "Mudar o lugar",
    "changeTitle": "Uma cidade, ou onde o navegador diz que você está",
    "remember": "Lembrar este lugar",
    "rememberTitle": "Guarda só neste navegador, com precisão de 0,1°",
    "forget": "Esquecer este lugar",
    "forgetTitle": "Remove o lugar guardado neste navegador",
    "kept": "Guardado só neste navegador.",
    "share": "Compartilhar este lugar",
    "shareTitle": "Copia um link que leva este lugar com precisão de 0,1°",
    "copied": "Link copiado. Ele leva este lugar com precisão de 0,1°.",
    "copyFailed": "Não foi possível copiar o link."
  },
  "scale": {
    "least": "Planetas desenhados pelo menos ×{n} maiores",
    "one": "{name} desenhado ×{n} maior",
    "title": "Os pontos são mais largos que os planetas. Pressione para ver o tamanho real.",
    "trueLine": "Tamanho real: {name}, {px} px de largura",
    "trueTitle": "O planeta mais largo, sem os pontos. Pressione para desenhá-los de novo."
  },
  "launchChip": {
    "opens": "pressione para ver a ficha",
    "train": "Novo trem de {n} Starlink, sobre você {when}"
  },
  "welcome": {
    "label": "Primeira visita",
    "title": "Primeira vez aqui",
    "dots": "Cada ponto é uma coisa real. Pressione um.",
    "move": "Arraste para girar. Role para aproximar.",
    "moveTouch": "Arraste para girar. Faça o movimento de pinça para aproximar.",
    "trips": "Uma viagem guiada: uma história em minutos.",
    "trip": "Viagem guiada",
    "tripTitle": "Começa a primeira viagem da lista",
    "look": "Olhar em volta",
    "lookTitle": "Guarda estas linhas"
  },
  "opening": {
    "label": "Abertura",
    "from": "De {source}",
    "wait": "Preparando a viagem",
    "skip": "Qualquer tecla ou toque pula isto"
  },
  "base": {
    "label": "Voltar à base",
    "title": "Voltar à base: a Terra, agora, nada selecionado",
    "name": "base",
    "trip": "Sair da viagem e voltar à base"
  },
  "exoface": {
    "tag": "Concepção artística",
    "measured": "Medido: {parts}.",
    "estimated": "Estimativa: {parts}.",
    "least": "Pelo menos {n} massas terrestres.",
    "radius": "{n} raios terrestres",
    "mass": "{n} massas terrestres",
    "a": "um",
    "an": "um",
    "yearHours": "{a} ano de {n} horas",
    "yearDays": "{a} ano de {n} dias",
    "yearYears": "uma volta de {n} anos",
    "join": ", ",
    "missing": "—",
    "surface": "A superfície é imaginada.",
    "clouds": "O topo das nuvens é imaginado.",
    "nothingMeasured": "Nada aqui é medido.",
    "whole": "O mundo inteiro é imaginado.",
    "imaginedName": "Um mundo imaginado n.º {n}",
    "another": "Outro mundo",
    "back": "Voltar ao mapa",
    "stageLabel": "Um mundo imaginado",
    "why": "Desenhado como {cls}, {climate}: calculado, não visto.",
    "whyGiant": "Desenhado como {cls}: calculado a partir do tamanho, não visto.",
    "cls": {
      "rock": "um mundo rochoso",
      "superEarth": "uma super-Terra",
      "water": "um mundo de água",
      "miniNeptune": "um mini-Netuno",
      "iceGiant": "um gigante de gelo",
      "gasGiant": "um gigante gasoso"
    },
    "climate": {
      "lava": "derretido sob a estrela",
      "desert": "quente e seco",
      "temperate": "ameno o bastante para ter mares",
      "snowball": "congelado",
      "eyeball": "com uma face sempre voltada para a estrela"
    }
  },
  "deep": {
    "inside": "Dentro de: {parent}",
    "companion": "Companheiro de: {parent}",
    "kinds": {
      "HII": "nebulosa de emissão",
      "PN": "nebulosa planetária",
      "SNR": "remanescente de supernova",
      "RfN": "nebulosa de reflexão",
      "DrkN": "nebulosa escura",
      "GCl": "aglomerado globular"
    },
    "back": "Voltar para: {parent}",
    "backTitle": "Afastar-se até {parent}, que o envolve"
  },
  "deepHelix": {
    "card": {
      "helix": "A luz vem da fotografia do ESO, a forma de O’Dell, McCullough e Meixner (2004): um disco interno inclinado 23° e um anel externo inclinado 53°. Os nós ficam nas distâncias medidas. Ainda não revisado por um astrônomo."
    },
    "how": "O Hubble e telescópios em terra mostram duas elipses, 499″ por 459″ e 742″ por 446″. Lidas como círculos vistos de viés, são dois anéis inclinados 23° e 53°, e as velocidades dos nós ao se aproximarem e se afastarem de nós dizem qual lado de cada um é o mais próximo (O’Dell, McCullough e Meixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "Este modelo é construído a partir da fotografia dela e das contagens da Gaia das próprias estrelas dela, inclinado como medido."
    },
    "rows": {
      "dso-lmc": [
        [
          "Profundidade das estrelas",
          "Não medida estrela por estrela: a essa distância a paralaxe de uma estrela é pequena demais. O modelo espalha as estrelas pela espessura conhecida do disco."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "Profundidade dentro da LMC",
          "Não medida: é desenhada na distância da LMC, na direção própria dela. No disco inclinado, pode estar cerca de 2 000 anos-luz mais perto."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "A borda do universo observável",
    "horizonNow": "Cerca de {n} bilhões de anos-luz de distância agora",
    "horizonWhy": "A luz dela partiu há {age} bilhões de anos; o espaço se esticou desde então",
    "edge": "{n} bilhões de anos-luz: além de tudo o que podemos ver",
    "edgeWhy": "O universo observável termina a cerca de {h} bilhões de anos-luz.",
    "edgeNothing": "Nada medido está aqui fora: esta faixa é uma ilustração.",
    "cmbTitle": "A luz mais antiga, como o nosso céu a mostra",
    "cmbWhen": "Ela partiu cerca de {k} anos depois do Big Bang",
    "cmbPainted": "Pintada dentro da esfera de onde ela partiu: uma ilustração",
    "cmbElse": "Visto de qualquer outro lugar, o mapa é diferente",
    "cmbCold": "−{n} µK",
    "cmbMid": "média de {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "Escala de cor: azul até {n} milionésimos de grau mais frio que {t} kelvin, laranja até {n} mais quente",
    "cmbSource": "Mapa de nove anos do WMAP, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "A luz vem da fotografia do ESO, a forma foi reconstruída segundo Wen e O’Dell (1995) e O’Dell (2001): uma camada fina e brilhante na face próxima de uma nuvem escura, com o Trapézio cerca de 0,2 parsec à frente dela. Ainda não revisado por um astrônomo."
    },
    "rows": {
      "dso-m42": [
        [
          "A forma em profundidade",
          "Reconstruída. Perto do Trapézio ela é medida: a camada brilhante fica cerca de 0,2 parsec atrás da estrela mais brilhante dele. Mais longe, a profundidade segue a imagem publicada de uma tigela que se abre em nossa direção, não uma medição."
        ],
        [
          "Atrás dela",
          "A nuvem molecular escura da qual a nebulosa é esculpida. Vista por trás, a nebulosa fica escondida nela."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-m43": [
        [
          "A forma em profundidade",
          "Reconstruída: uma cavidade menor na mesma nuvem, iluminada pela estrela NU Orionis. A profundidade dela não é medida."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ]
    },
    "how": "O brilho da nebulosa vem de uma camada fina onde a luz da estrela mais brilhante do Trapézio vai corroendo uma nuvem escura. Wen e O’Dell (1995) mapearam a que distância atrás da estrela essa camada fica a partir do brilho dela, já que um trecho mais próximo recebe mais luz."
  },
  "r12Truth": {
    "here": "Nesta ficha",
    "words": "As palavras, em todo lugar",
    "terms": "Palavras desta ficha",
    "rows": {
      "where": "Onde está",
      "drawnNow": "Desenhado agora",
      "drawn": "O que é desenhado",
      "photo": "Fotografia de",
      "filters": "Filtros",
      "colours": "Cores",
      "taken": "Tirada em",
      "released": "Publicada em",
      "sky": "Céu mostrado",
      "survey": "Levantamento de",
      "look": "Aparência"
    },
    "span": "{a} a {b}",
    "notPublished": "Data não publicada",
    "position": {
      "measured": "Visto por um instrumento em um horário conhecido",
      "inferred": "Propagado a partir de uma medição mais antiga",
      "illustrative": "Desenhado para mostrar a ideia, não medido",
      "sample": "Dados de amostra incluídos, não ao vivo"
    },
    "drawn": {
      "photograph": "Luz real, fotografada do nosso lado",
      "reconstruction": "Uma forma 3D de um estudo publicado",
      "model": "Um modelo do seu tipo, não as estrelas dele",
      "catalogue": "Posições que um levantamento mediu",
      "illustration": "Desenhado para mostrar o tipo dele, não ele"
    },
    "colours": {
      "broadband": "Filtros largos de cor",
      "mixed": "Filtros de cor e hidrogênio",
      "narrowband": "Gases mapeados em cores",
      "unstated": "Não informado"
    },
    "falseColour": "{band}, em cor falsa",
    "glossary": [
      {
        "term": "parsec",
        "match": [
          "kpc"
        ],
        "say": "Cerca de 3,26 anos-luz: a distância da qual a órbita da Terra pareceria ter um segundo de arco de largura. Os artigos escrevem pc, e kpc para mil."
      },
      {
        "term": "milhões de anos-luz",
        "match": [
          "milhões de anos"
        ],
        "say": "Um milhão de anos-luz, escrito Mly. Andrômeda, a galáxia grande mais próxima, está a cerca de 2,5 milhões."
      },
      {
        "term": "bilhões de anos-luz",
        "match": [
          "bilhões de anos"
        ],
        "say": "Mil milhões de anos-luz, escrito Gly. A borda do que podemos ver está agora a cerca de 46 bilhões de anos-luz."
      },
      {
        "term": "tempo de retrospectiva",
        "match": [
          "partiu"
        ],
        "say": "Há quanto tempo a luz que vemos saiu de algo. Das galáxias distantes são bilhões de anos: nós as vemos como eram então."
      },
      {
        "term": "distância comóvel",
        "match": [
          "comóvel",
          "bilhões de anos-luz"
        ],
        "say": "A que distância algo está agora, contando quanto o espaço se esticou desde que a luz dele partiu. Bem longe, é mais do que o tempo de viagem da luz sugere."
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "Modo {mode}"
  },
  "r12Sun": {
    "image": "A metade do Sol voltada para a Terra é a imagem do Solar Dynamics Observatory tirada às {time} UTC de {date}, girada com o Sol desde então: luz do ultravioleta extremo em {wl} ångström, de gás a quase um milhão de graus nos laços sobre a superfície, na cor falsa do SDO e desenhada mais brilhante. O lado oposto, que ele não viu, é desenhado a partir de um modelo na mesma cor falsa, e os dois se misturam onde se encontram. É uma imagem de consulta, não de uso científico. Cortesia da NASA/SDO e das equipes científicas AIA, EVE e HMI.",
    "loops": "Os laços dourados sobre {n} das regiões ativas de hoje são ilustrativos: os lugares são da NOAA, os formatos, as alturas e o número não. No modo Medido eles são retirados.",
    "loopsOne": "Os laços dourados sobre uma das regiões ativas de hoje são ilustrativos: o lugar é da NOAA, os formatos, as alturas e o número não. No modo Medido eles são retirados.",
    "none": "Não foi possível ler nenhuma imagem do Sol de hoje, então o disco inteiro é desenhado."
  },
  "r12Nearby": {
    "castShadows": "As sombras dele são projetadas pelas próprias alturas do solo, de {title}, onde o Sol está agora e em escala real: medidas, uma altura a cada 670 m no melhor dos casos, então uma cratera com menos de cerca de dois quilômetros não projeta nenhuma.",
    "sunriseModelled": "A cor dele ao nascer e ao pôr do Sol é modelada: luz solar avermelhada pelo ar que ela roçou, só com espalhamento de Rayleigh."
  },
  "r12Giants": {
    "spot": "Exceto uma: a Grande Mancha Vermelha é colocada em {l2}° de longitude do Sistema II, levada de onde a equipe JUPOS e a British Astronomical Association a mediram em {date} ({at}°) a {rate}° por mês, o meio das duas derivas que mediram naquele ano ({lo} e {hi}), então a esta altura ela pode estar {pm}° para qualquer lado. O mapa é girado para colocá-la ali, e as outras nuvens giram junto com ele.",
    "rings": {
      "uranus": "os anéis dele estão nas distâncias medidas e são tão escuros quanto são: as partículas refletem cerca de 1,5% da luz, um trigésimo do que as nuvens refletem, então diante do planeta são fios escuros; são desenhados 10 vezes mais largos do que são para que apareçam, e a exposição Profunda os realça 4 vezes, como faz uma longa exposição",
      "jupiter": "o anel tênue dele está nas distâncias e profundidades ópticas que a tabela de dados da NASA dá: o halo e o anel principal, poeira e grãos escuros que bloqueiam alguns milionésimos da luz; os dois anéis de gaze mais fracos além deles não são desenhados. Do lado do Sol ele é quase nada; com o Sol atrás dele a poeira lança a luz para a frente e ele aparece, como apareceu para a Galileo e a New Horizons, do lado da noite. Para aparecer, ele é desenhado 8 000 vezes mais brilhante do que é na exposição Câmera e 40 000 vezes na Profunda; na exposição Olho não é desenhado, que é como ele pareceria, e também não na qualidade mais baixa. O halo tem cerca de 10 000 km de espessura e é desenhado achatado, não mais brilhante do que a espessura permite; como o halo se apaga para dentro e o anel principal se adensa em direção à borda externa nítida, quanto da luz é da poeira, até onde ela a lança para a frente, a cor avermelhada do anel e o máximo de brilho com que é desenhado são ilustrativos"
    }
  },
  "r12Plumes": {
    "line": "Plumas desenhadas como foram vistas: {list}.",
    "item": "{name}, com cerca de {km} km de altura ({by}, {when})",
    "jets": "os jatos das quatro listras de tigre, com pelo menos {km} km de altura ({by}, {when})",
    "truth": "Os lugares e as alturas delas são medidos; os arcos dos grãos são um modelo, e a luz deles é esticada para que possam ser vistos. Pode ser que não estejam em erupção agora.",
    "stripes": "As listras são desenhadas retas a partir dos centros e dos comprimentos do gazetteer, e os lugares dos 101 jatos ao longo delas são um modelo.",
    "column": "São colunas escuras que o vento levou para o oeste no topo; a largura de uma coluna não é conhecida e é desenhada estreita.",
    "hot": "Os pontos laranja no lado da noite são pontos quentes onde a lava brilha ({list}): os lugares são medidos, o brilho não.",
    "film": "No modo Filme, os grãos percorrem seus arcos {k} vezes mais rápido que o relógio.",
    "still": "Ficam parados, como no modo Medido ou com movimento reduzido.",
    "review": "Ainda não revisado por um astrônomo.",
    "span": "{a} a {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "As estrelas",
      "lightLabel": "A luz delas",
      "depthLabel": "A profundidade delas",
      "reviewLabel": "Revisão",
      "globularStars": "Um modelo do seu tipo, não as estrelas dele: {n} estrelas mais brilhantes que o ponto de saída da sequência principal, colocadas pelo perfil de King com o raio do núcleo de Harris ({rc} anos-luz) e o raio de maré ({rt}). O número, o brilho e as cores delas são um modelo.",
      "globularLight": "Juntas, cerca de {pct}% da luz do aglomerado (magnitude absoluta {mv}); as estrelas fracas que nenhum ponto representa são o brilho difuso. Desenhado até a magnitude 10, como a exposição de uma câmera o mostra.",
      "openStars": "{n} membros do Gaia (Hunt e Reffert 2023, {name}), cada um com probabilidade de pertencer de pelo menos {p}, dentro do raio de maré. Desenhados até a magnitude 10, como a exposição de uma câmera os mostra.",
      "openStarsHyg": "{n} membros do Gaia (Hunt e Reffert 2023, {name}), cada um com probabilidade de pertencer de pelo menos {p}, dentro do raio de maré; {h} mais brilhantes são estrelas do catálogo do próprio mapa. Desenhados até a magnitude 10, como a exposição de uma câmera os mostra.",
      "openDepthSome": "{m} são colocadas pela própria paralaxe; as outras {k} na distância do aglomerado, com a profundidade delas dentro dele modelada.",
      "openDepthNone": "As direções delas são medidas; a profundidade dentro do aglomerado é modelada, pois a essa distância a paralaxe de uma estrela não é precisa o bastante.",
      "review": "Este modelo ainda não foi revisado por um astrônomo."
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "um ponto brilhante onde o desvio para o vermelho o coloca, com um anel marcando o lugar; o disco e o jato dele são pequenos demais para desenhar",
      "host": "A galáxia hospedeira é desenhada fraca e redonda, no tamanho angular que a fonte informa, {size} segundos de arco de largura vistos daqui; na verdade são cerca de {ly} anos-luz. O achatamento e a inclinação dela não são desenhados.",
      "point": "A fonte não informa o tamanho da galáxia hospedeira, então nenhum é desenhado."
    },
    "cluster": {
      "members": "{n} galáxias-membro de {catalogue}; {own} delas estão em distâncias medidas uma a uma.",
      "membersNoOwn": "{n} galáxias-membro de {catalogue}.",
      "distanceSbf": "O aglomerado está a {mpc} megaparsecs ({mly} milhões de anos-luz) de distância, uma média de distâncias obtidas pelas flutuações de brilho superficial.",
      "distanceZ": "O aglomerado está a {mly} milhões de anos-luz de distância: o desvio para o vermelho médio dos membros ({z}), levado a uma distância comóvel na cosmologia única do mapa.",
      "depthMeasured": "Uma galáxia sem distância própria é espalhada em profundidade pela dispersão medida do aglomerado, {rms} megaparsecs; essa colocação é um modelo.",
      "depthModelled": "Nenhuma galáxia aqui tem distância própria, então elas são espalhadas em profundidade tão amplamente quanto no céu, como se o aglomerado fosse redondo; essa colocação é um modelo.",
      "size": "Cada galáxia tem a largura que o raio de meia luz do catálogo diz, desenhada como uma forma redonda, brilhante no centro; o achatamento e a inclinação dela não são desenhados."
    }
  },
  "deepRing": {
    "card": {
      "m27": "A luz vem da fotografia do NOIRLab, mostrada nos tons próprios dos gases; a forma é uma reconstrução: a cintura brilhante, um anel espesso visto quase de perfil; as «orelhas» mais tênues, os lóbulos, segundo as velocidades das camadas medidas por Meaburn e outros (2005). Ainda não revisado por um astrônomo.",
      "southern-ring": "A luz vem da fotografia em infravermelho do Webb; a forma segue Kastner e outros (2024) e De Marco e outros (2022): um anel visto quase ao longo do eixo, uma bolha que o atravessa e um halo molecular ao redor de ambos. Ainda não revisado por um astrônomo.",
      "m57": "A luz vem da fotografia do Hubble, a forma de O’Dell, Ferland, Henney e Peimbert (2013): um anel grosso inclinado 13,5°, visto quase ao longo do eixo, com o gás mais azulado do meio desenhado se estendendo em nossa direção e na direção oposta. As cores são as da fotografia, feita com filtros estreitos. Ainda não revisado por um astrônomo."
    },
    "rows": {
      "dso-m27": [["A forma em profundidade", "Reconstruída. O tamanho, o ângulo no céu e as velocidades das camadas são medidos; que a cintura seja um anel quase de perfil, e como as «orelhas» se estendem em nossa direção e na direção oposta, é a leitura habitual de uma nebulosa com este aspecto, desenhada como ilustração."], ["As cores", "Os tons próprios dos gases, a partir dos filtros estreitos da fotografia: oxigênio verde-azulado, hidrogênio e enxofre vermelhos. A força de cada um é escolha nossa."], ["Revisão", "Este modelo ainda não foi revisado por um astrônomo."]],
      "dso-southern-ring-nebula": [["A forma em profundidade", "Reconstruída. Que o anel brilhante é visto a 15–30° do eixo é medido (Kastner e outros, 2024); que lado está mais perto, a espessura do anel e o comprimento da bolha são ilustrativos."], ["As cores", "Luz infravermelha que nenhum olho vê, colorida pelos autores da imagem do Webb."], ["Revisão", "Este modelo ainda não foi revisado por um astrônomo."]],
      "dso-m57": [
        [
          "A distância",
          "Paralaxe (Gaia DR3) da estrela central, Gaia DR3 2090486618786534784: 1,270 ± 0,044 milissegundos de arco, cerca de 2 570 anos-luz (2 480 a 2 660)."
        ],
        [
          "A forma em profundidade",
          "Reconstruída. O tamanho do anel no céu, a inclinação do eixo maior e qual ponta está mais perto são medidos. A espessura e a forma do gás pelo meio não são: são desenhadas como ilustração."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ]
    },
    "how": "As imagens do Hubble em cores únicas de luz, com as velocidades do gás medidas ao longo da nebulosa, mostram um anel grosso quase de frente: o eixo maior inclinado 13,5°, com a ponta nordeste mais perto de nós. Um gás mais rápido preenche o meio e se estende em nossa direção e na direção oposta, ao longo da nossa linha de visão (O’Dell, Ferland, Henney e Peimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "m45": "A luz é a fotografia do NOIRLab: uma nuvem de poeira que atravessa o aglomerado, bem à frente das estrelas, espalha a luz azul delas (Ritchey e outros, 2006). A profundidade é reconstruída. Ainda não revisado por um astrônomo.",
      "crab": "A luz vem da fotografia do Hubble, em cor falsa, levada sobre uma casca cuja forma segue Martin, Milisavljevic e Drissen (2021): uma gaiola de filamentos com cerca de 4 parsecs de comprimento ao redor de um meio vazio. Ainda não revisado por um astrônomo.",
      "veil": "A luz vem da fotografia do NOIRLab, em cor falsa, levada sobre uma esfera fina de 37 parsecs de largura (Fesen e outros, 2018): os filamentos são a borda dela vista de perfil. Ainda não revisado por um astrônomo.",
      "horsehead": "A escuridão é lida a partir da fotografia do NOIRLab: poeira diante do gás brilhante de IC 434, que absorve e avermelha o que está atrás e não emite luz. Ainda não revisado por um astrônomo.",
      "coalsack": "A escuridão é lida a partir da Via Láctea ao redor: uma nuvem de poeira a cerca de 590 anos-luz que escurece e avermelha as estrelas atrás dela. Ainda não revisado por um astrônomo.",
      "m78": "A luz é a fotografia do NOIRLab: poeira espalhando a luz azul da estrela à frente, na face de uma nuvem escura. A profundidade é reconstruída. Ainda não revisado por um astrônomo.",
      "iris": "A luz é a fotografia do NOIRLab: poeira espalhando a luz da jovem estrela HD 200775 em uma cavidade da nuvem. A profundidade é reconstruída. Ainda não revisado por um astrônomo."
    },
    "rows": {
      "dso-m45": [["A forma em profundidade", "Reconstruída. O gás está à frente das estrelas, como a luz dele mostra; a que distância à frente e qual a espessura da poeira são ilustrativos, e as profundidades das estrelas dentro do aglomerado são um modelo fixo, não medidas."], ["O que a poeira faz", "Espalha a luz das estrelas, sobretudo a azul, e por isso brilha em azul ao redor das mais brilhantes, sobretudo Mérope e Maia. É uma nuvem de passagem, não aquela de onde as estrelas nasceram."], ["Revisão", "Este modelo ainda não foi revisado por um astrônomo."]],
      "dso-m1": [
        [
          "A forma em profundidade",
          "Reconstruída a partir de um contorno medido. Os filamentos se estendem cerca de 2 parsecs ao longo do eixo do vento do pulsar e nenhum fica a menos de meio parsec do centro (Martin e outros, 2021). Desenhada como um elipsoide ao longo desse eixo; qual ponta está mais perto de nós é suposto."
        ],
        [
          "As cores",
          "Cor falsa: os filtros estreitos da fotografia para oxigênio e enxofre, mapeados em cores pelos autores da imagem."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-veil-nebula": [
        [
          "A forma em profundidade",
          "Reconstruída: uma esfera de 37 parsecs de largura, o tamanho e a distância que Fesen e outros (2018) mediram. A espessura da casca é ilustrativa."
        ],
        [
          "As cores",
          "Cor falsa: os filtros estreitos da fotografia para oxigênio, enxofre e hidrogênio, mapeados em cores pelo autor da imagem."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "A forma em profundidade",
          "Reconstruída. A poeira está à frente do gás brilhante de IC 434, como observado; a que distância à frente, e quão espessa ela é, são ilustrativos."
        ],
        [
          "O que a poeira faz",
          "Ela só absorve: as estrelas e o brilho atrás dela ficam mais fracos, e mais no azul do que no vermelho, então parecem mais avermelhados. Ela não emite luz própria."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-coalsack": [
        [
          "Quão escuro é",
          "Lido a partir de quanto a Via Láctea é mais escura aqui do que à mesma distância da linha central dela nas proximidades. É uma estimativa e menor do que os mapas em infravermelho dão, porque as estrelas diante da nuvem acrescentam a luz delas."
        ],
        [
          "O que a poeira faz",
          "Ela só absorve: as estrelas atrás dela ficam mais fracas e avermelhadas. As estrelas diante dela não. Parte da escuridão a nordeste é uma segunda nuvem bem atrás, desenhada aqui na distância próxima."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-m78": [
        [
          "A forma em profundidade",
          "Reconstruída: a poeira iluminada como uma lâmina, com a estrela à frente e uma nuvem escura atrás. As profundidades são ilustrativas."
        ],
        [
          "De outro lado",
          "Modelado: a poeira espalha mais luz para a frente do que para os lados, então de outro lado a mesma poeira parece mais brilhante ou mais fraca."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ],
      "dso-iris-nebula": [
        [
          "A forma em profundidade",
          "Reconstruída: as paredes iluminadas como uma lâmina, com a estrela à frente e uma nuvem escura atrás. As profundidades são ilustrativas."
        ],
        [
          "De outro lado",
          "Modelado: a poeira espalha mais luz para a frente do que para os lados, então de outro lado a mesma poeira parece mais brilhante ou mais fraca."
        ],
        [
          "Revisão",
          "Este modelo ainda não foi revisado por um astrônomo."
        ]
      ]
    },
    "how": "O gás de um remanescente voa para fora a uma velocidade constante, então a velocidade dele em nossa direção ou na direção oposta diz a que distância à frente ou atrás do centro ele está. Martin, Milisavljevic e Drissen (2021) transformaram 310 000 espectros da Nebulosa do Caranguejo na forma dela dessa maneira."
  },
  "r12Navigate": {
    "chainLabel": "Onde está",
    "chainTitle": "Voar até {name}",
    "milkyWay": "Via Láctea",
    "outside": "Fora da Via Láctea",
    "the": [
      "∅",
      "∅",
      "∅"
    ],
    "theWord": "",
    "backParent": "Voltar para: {parent}",
    "backParentTitle": "Afastar-se até {parent}",
    "legendTitle": "Abrir a legenda: o que cada uma destas palavras significa",
    "label": "Onde você está",
    "title": "Onde a câmera está na escada, da Terra até o Grupo Local",
    "back": "Voltar",
    "backTo": "Voltar para: {name}",
    "sep": "›",
    "rungs": {
      "earth": "Terra",
      "sun": "Sistema Solar",
      "stellar": "Estrelas próximas",
      "galaxy": "Via Láctea",
      "local-group": "Grupo Local"
    },
    "notes": {
      "sun": "Acelerado: o Sol está a {distance}",
      "stellar": "Acelerado: a estrela mais próxima está a {distance}",
      "galaxy": "Acelerado: o centro da nossa galáxia está a {distance}",
      "local-group": "Acelerado: Andrômeda está a {distance}"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "O Sol",
      "ROCKY_PLANET": "Planetas rochosos",
      "GAS_GIANT": "Gigantes gasosos",
      "ICE_GIANT": "Gigantes de gelo",
      "RINGS": "Anéis",
      "VOLCANIC_MOON": "Lua vulcânica",
      "ICY_MOON": "Luas geladas",
      "TITAN": "Lua com atmosfera",
      "AIRLESS_MOON": "Luas sem atmosfera",
      "DWARF_PLANET": "Planetas anões",
      "ASTEROID": "Asteroides",
      "COMET": "Cometas",
      "ARTIFICIAL_SATELLITE": "Satélites",
      "LAUNCH_AND_ROCKET": "Lançamentos e foguetes",
      "SPACE_PROBE": "Sondas espaciais",
      "LANDING_SITE": "Locais de pouso",
      "EXOPLANET": "Exoplanetas",
      "STAR": "Estrelas",
      "BINARY_AND_MULTIPLE": "Estrelas binárias e múltiplas",
      "COMPACT_REMNANT": "Estrelas mortas",
      "BLACK_HOLE": "Buracos negros",
      "OPEN_CLUSTER": "Aglomerados abertos",
      "GLOBULAR_CLUSTER": "Aglomerados globulares",
      "EMISSION_NEBULA": "Nebulosas de emissão",
      "PLANETARY_NEBULA": "Nebulosas planetárias",
      "DARK_NEBULA": "Nebulosas escuras",
      "REFLECTION_NEBULA": "Nebulosas de reflexão",
      "SUPERNOVA_REMNANT": "Remanescentes de supernova",
      "GALAXY_SPIRAL": "Galáxias espirais",
      "GALAXY_IRREGULAR": "Galáxias irregulares",
      "GALAXY_ELLIPTICAL": "Galáxias elípticas",
      "GALAXY_INTERACTION": "Galáxias em interação",
      "AGN_QUASAR": "Quasares",
      "GALAXY_GROUP": "Grupos de galáxias",
      "GROUND_SITE": "Estações em terra",
      "ODDITY": "Curiosidades"
    },
    "other": "Outras coisas",
    "byName": "Por nome",
    "of": "{label} de {world}",
    "only": "Modelos 3D",
    "onlyTitle": "Listar só o que é desenhado a partir de um modelo 3D: um modelo real ou uma reconstrução",
    "real": "modelo 3D real",
    "rebuilt": "reconstrução 3D",
    "noneWithModel": "Nenhum destes tem modelo 3D.",
    "counting": "contando…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "Movimento",
      "choices": {
        "on": "Ligado",
        "off": "Desligado"
      },
      "titles": {
        "on": "Os voos deslizam e as viagens avançam sozinhas, do jeito que o mapa foi projetado",
        "off": "Todo voo é um salto instantâneo, nada se move que não seja medido, e uma viagem espera por Próximo"
      },
      "device": "Seu aparelho pede menos movimento, então está desligado."
    },
    "summary": {
      "label": "O que está na tela",
      "stage": "Olhando para {stage}.",
      "selected": "Selecionado: {name}, {kind}.",
      "nothing": "Nada está selecionado.",
      "trip": "Parada {n} de {count} da viagem: {title}.",
      "tripIntro": "A viagem {title} está aberta.",
      "measured": "Desenhado como medido."
    }
  }
};

// 1.6.2 (internal #1057): the words of the Moments (copy/en.moments.js and its three story files), Brazilian Portuguese. Machine-drafted like the rest of this file
// (docs/TRANSLATING.md): drafted by a program from the English, NOT read by a native speaker. The spoken lines of the recordings
// (Armstrong's first words) stay in the language they were said in. Added to COPY here; the story files call HOOK.localise after they load.
Object.assign(COPY, {
  "momentPlayer": {
    "micro": "Momento",
    "play": "Reproduzir",
    "pause": "Pausar",
    "replay": "Ver de novo",
    "close": "Fechar o momento",
    "chapters": "Capítulos",
    "chaptersTitle": "Ir para um capítulo",
    "share": "Copiar um link para este segundo",
    "copied": "Link copiado",
    "copyFailed": "Copie este link: {url}",
    "director": "Direção",
    "directorTitle": "Devolver a câmera à direção",
    "freeNote": "Sua câmera. Arraste para olhar ao redor; Direção a pega de volta.",
    "scrubber": "Tempo de missão",
    "met": "Tempo decorrido da missão",
    "rateTitle": "Aqui o tempo corre {rate} mais rápido que o real",
    "realTime": "Tempo real",
    "loading": "Carregando o momento…",
    "missing": "Não existe nenhum momento chamado {id}.",
    "unreachable": "Este momento não carregou. Ele só fica salvo neste aparelho depois de aberto uma vez online.",
    "modelMissing": "O modelo {model} não carregou; a trajetória e as chamas continuam desenhadas.",
    "chapterOf": "Capítulo {n} de {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "Medido",
      "reconstructed": "Reconstruído",
      "illustrative": "Ilustrativo"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "Por enquanto, os estágios são recortados de um único modelo.",
    "drawnNote": "As chamas, o vapor, os paraquedas e o brilho de uma reentrada são desenhados.",
    "groundNote": "O chão perto da plataforma é ilustrativo; mapa da Terra do Solar System Scope, CC BY 4.0.",
    "groundNoteMars": "O chão perto do local é ilustrativo; mapa de Marte do Solar System Scope, CC BY 4.0.",
    "keys": "Espaço reproduz ou pausa, as setas avançam, Esc fecha"
  },
  "momentShelf": {
    "title": "Momentos",
    "note": "Missões repetidas em um único relógio, com os horários reais dos eventos. As trajetórias são reconstruídas ou ilustrativas e dizem isso.",
    "minutes": "{m} min",
    "all": "Todos os {n} momentos",
    "fewer": "Menos momentos",
    "replay": "Rever este momento",
    "replayTitle": "Rever {title} no relógio da missão",
    "replayNamed": "Rever {title}",
    "cards": {
      "apollo-11": {
        "title": "Apollo 11",
        "when": "de 16 a 24 de julho de 1969",
        "blurb": "Da plataforma 39A ao Pacífico passando pela Base da Tranquilidade: decolagem, a Lua, o pouso, a subida, a volta."
      },
      "apollo-13": {
        "title": "Apollo 13",
        "when": "de 11 a 17 de abril de 1970",
        "blurb": "Da plataforma 39A ao Pacífico: o pouso na Lua que não aconteceu, um tanque de oxigênio que estourou e o módulo lunar como bote salva-vidas."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "de 1 a 10 de abril de 2026",
        "blurb": "Da plataforma 39B ao Pacífico ao largo de San Diego, em volta do lado oculto da Lua. Dizemos o que foi voado e o que estava planejado."
      },
      "sputnik-1": {
        "title": "Sputnik 1",
        "when": "4 de outubro de 1957",
        "blurb": "De Baikonur à primeira volta à Terra: o primeiro satélite artificial, uma esfera polida de 585 mm, e seu bipe."
      },
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "de 18 a 19 de março de 1965",
        "blurb": "Alexei Leonov sai ao espaço por doze minutos por uma eclusa inflável, e a tripulação pousa em controle manual na taiga, longe do seu campo."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "de 12 a 14 de abril de 1981",
        "blurb": "O primeiro ônibus espacial: o Columbia a partir da plataforma 39A, os foguetes e o tanque, 54 horas em órbita e uma planagem até o leito seco de Edwards."
      },
      "curiosity-edl": {
        "title": "Pouso do Curiosity",
        "when": "6 de agosto de 2012",
        "blurb": "Os sete minutos do alto do ar marciano até a cratera Gale: o escudo térmico, o paraquedas, a mochila foguete e o guindaste celeste, no relógio do JPL."
      },
      "new-horizons-pluto": {
        "title": "New Horizons em Plutão",
        "when": "14 de julho de 2015",
        "blurb": "A primeira visita a Plutão: de seis horas antes à passagem a 13,8 km/s, pela trajetória do próprio JPL, Plutão e Caronte como discos, o crescente que fica para trás."
      },
      "hubble-deployment": {
        "title": "A liberação do Hubble",
        "when": "25 de abril de 1990",
        "blurb": "O braço do Discovery ergue o Telescópio Espacial Hubble para fora do compartimento de carga na STS-31, um painel solar para e, às 19:38 UTC, o telescópio é solto."
      },
      "falcon9-og2-2": {
        "title": "O primeiro pouso de um Falcon 9",
        "when": "21 de dezembro de 2015",
        "blurb": "O voo 20 do Falcon 9 leva 11 satélites ORBCOMM para longe de Cabo Canaveral, e seu primeiro estágio volta voando e pousa na Landing Zone 1: o primeiro pouso do primeiro estágio de um foguete orbital."
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 de abril de 1961",
        "blurb": "Yuri Gagarin, uma volta à Terra em 108 minutos, de Baikonur a um campo perto de Smelovka."
      }
    }
  },
  "momentStories": {
    "demo-saturn": {
      "title": "Saturn V: da ignição à separação dos estágios",
      "blurb": "Os três primeiros minutos da Apollo 11, em 16 de julho de 1969, da plataforma do Complexo de Lançamento 39A.",
      "chIgnition": "Ignição",
      "chLiftoff": "Decolagem",
      "chClimb": "Pressão dinâmica máxima",
      "chStaging": "Separação dos estágios",
      "ignition": "T−8,9 s: a sequência de ignição liga os cinco motores F-1, o central primeiro, depois os pares externos.",
      "holddown": "Os braços de fixação mantêm o foguete na plataforma até os cinco motores chegarem ao empuxo total.",
      "liftoff": "Decolagem, 13:32:00,6 UTC: cinco F-1, uns 33 800 kN, erguendo quase 3 000 toneladas.",
      "tower": "Livre da torre, o foguete gira para o azimute de voo, 72 graus a leste do norte.",
      "maxq": "Passada a velocidade do som, um minuto depois vem a pressão dinâmica máxima, quando o ar empurra mais forte: 35 kPa (735 lb/ft²).",
      "ceco": "T+135 s: o motor central desliga, para manter a aceleração abaixo de 4 g.",
      "staging": "T+161,7 s: os motores externos desligam. A uns 67 km de altura o S-IC se solta e cai, com seus retrofoguetes acesos.",
      "sii": "T+163,0 s: os cinco motores J-2 do S-II acendem. O hidrogênio queima com uma chama pálida e quase transparente.",
      "interstage": "O anel entre estágios se solta; em T+197,9 s a torre de escape sai. A órbita de estacionamento está 8,5 minutos adiante.",
      "pathAscent": "horários do Relatório da Missão Apollo 11, com as alturas intermediárias aproximadas",
      "sources": "Relatório da Missão Apollo 11, NASA MSC-00171, 1969 (tabela 3-I, sequência de eventos; seção 7,1, lançamento)"
    },
    "vostok-1": {
      "title": "Vostok 1: a primeira pessoa no espaço",
      "blurb": "Yuri Gagarin, 12 de abril de 1961: de Baikonur, uma volta à Terra, até um campo perto de Smelovka, no relógio da missão, em 108 minutos.",
      "chPad": "A Partida de Gagarin",
      "chAscent": "Subida",
      "chOrbit": "Uma órbita",
      "chRetro": "Retrofrenagem",
      "chEntry": "Reentrada",
      "chEject": "Ejeção",
      "chLand": "Pouso",
      "ready": "Baikonur, Sítio 1, 06:07 UTC. Yuri Gagarin, 27 anos, está na cápsula no alto do foguete R-7.",
      "korolev": "Serguei Korolev no rádio: “Estágio preliminar… intermediário… principal… decolagem!”",
      "liftoff": "Decolagem. Gagarin: “Poyekhali!”, “Vamos!”",
      "boosters": "T+119 s: os quatro propulsores laterais se esgotam e se soltam.",
      "shroud": "T+156 s: a carenagem sobre a cápsula é lançada fora.",
      "core": "T+300 s: o estágio central se esgota e se solta; o último estágio acende.",
      "earth": "Por volta de T+6 min, Gagarin: “Estou vendo a Terra. A visibilidade é boa.”",
      "kosberg": "Por volta de T+10 min o último estágio desliga. Gagarin: “O Kosberg funcionou!”, pelo projetista do motor.",
      "orbit": "Em órbita: 181 por 327 km, inclinada 64,95 graus em relação ao equador, 89,1 minutos por volta. A cápsula se separa do estágio.",
      "retro": "T+1 h 18 min, sobre a costa oeste da África: o retrofoguete queima por cerca de 42 segundos. Seu horário e lugar são publicados; sua força aqui é ajustada ao pouso.",
      "wires": "O módulo de instrumentos deveria se soltar dez segundos após a retrofrenagem. Um feixe de fios o prende; os dois caem juntos, girando, no ar.",
      "entry": "Os fios queimam e a esfera se estabiliza com o escudo térmico para a frente. Gagarin relatou depois mais de 10 g.",
      "eject": "A 7 km a escotilha é arrancada e o assento dispara Gagarin para fora. A esfera da Vostok pousava forte demais para uma pessoa dentro.",
      "chutes": "A 2,5 km o paraquedas principal da cápsula se abre, com 27 m de largura; o do piloto abriu quase na hora. O assento cai solto.",
      "landing": "T+1 h 48 min: Gagarin pousa a 26 km a sudoeste de Engels, na região de Saratov, 108 minutos após o lançamento. As fontes diferem em dez minutos sobre o pouso.",
      "pathAscent": "a subida são os horários publicados dos eventos ligados por curvas suaves; as alturas e distâncias entre eles são nossas",
      "pathOrbit": "a órbita, a retrofrenagem e a reentrada são arcos de dois corpos ajustados aos horários publicados e ao campo de pouso, não dados de rastreamento",
      "pathPilot": "a descida sob o paraquedas do piloto é desenhada; nenhuma fonte dá a distância até a cápsula",
      "srcWiki": "Wikipédia, Vostok 1 (horários dos eventos, órbita, citações; lido em 2 de novembro de 2026)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (órbita, nave)"
    },
    "apollo-11": {
      "title": "Apollo 11: à Lua e de volta",
      "blurb": "Do Complexo de Lançamento 39A, em 16 de julho de 1969, ao Pacífico no dia 24: decolagem, a Lua, a Base da Tranquilidade e a volta, no relógio da missão.",
      "chIgnition": "Ignição",
      "chLiftoff": "Decolagem",
      "chStaging": "Separação dos estágios",
      "chParking": "Órbita de estacionamento",
      "chTli": "Rumo à Lua",
      "chCoast": "Três dias de viagem",
      "chLoi": "Para a órbita lunar",
      "chUndock": "O Eagle se separa",
      "chDescent": "Descida propulsada",
      "chSurface": "Base da Tranquilidade",
      "chAscent": "De volta lá para cima",
      "chDock": "Acoplamento",
      "chTei": "Para casa",
      "chEntry": "Reentrada",
      "chSplash": "Amerissagem",
      "ignition": "T−8,9 s: a sequência de ignição liga os cinco motores F-1, o central primeiro, depois os pares externos.",
      "liftoff": "Decolagem, 13:32:00 UTC: cinco F-1, uns 33 800 kN, erguendo quase 3 000 toneladas.",
      "tower": "Livre da torre, o foguete gira para o azimute de voo, 72 graus a leste do norte.",
      "maxq": "Passada a velocidade do som, um minuto depois; então a pressão dinâmica máxima, quando o ar empurra mais forte: 35 kPa.",
      "ceco": "T+135 s: o motor central desliga, para manter a aceleração abaixo de 4 g.",
      "staging": "T+161,7 s: os motores externos desligam. A uns 67 km de altura o S-IC se solta e cai, com seus retrofoguetes acesos.",
      "sii": "T+163,0 s: os cinco motores J-2 do S-II acendem. O hidrogênio queima com uma chama pálida e quase transparente.",
      "interstage": "O anel entre estágios se solta; em T+197,9 s a torre de escape sai.",
      "siicut": "T+9 min 13 s: o S-II desliga e se solta; o S-IVB acende.",
      "parking": "T+11 min 52 s: órbita de estacionamento, a 185 km. Duas horas e meia de verificações, uma volta e meia à Terra.",
      "tli": "2:44:16: o S-IVB acende de novo por 5 min 48 s e leva o conjunto a 10,8 km/s. O destino é a Lua.",
      "sla": "3:17: os quatro painéis em volta do módulo lunar se abrem. O Columbia se separa, dá meia-volta e acopla de frente com o Eagle (não desenhado).",
      "extract": "Por volta de 3:57: o Columbia puxa o Eagle para fora do S-IVB. O estágio vazio fica para trás.",
      "coast": "Três dias até a Lua, 384 000 km, desenhados a umas 8 000 vezes a velocidade real. A nave tem 11 metros, então é um ponto.",
      "loi": "75:49:50, atrás da Lua e sem contato de rádio: o motor de serviço queima seis minutos para ser capturado.",
      "lunarorbit": "Órbita lunar, a uns 100 km de altura, duas horas por volta.",
      "undock": "100:12: o Eagle, com Armstrong e Aldrin, se separa do Columbia, onde Collins fica.",
      "pdi": "102:33:05: começa a descida propulsada, a 15 km de altura e a uns 500 km do local.",
      "landing": "O computador pousaria numa cratera cheia de pedras. Armstrong assume os controles e segue voando, com menos de um minuto de combustível.",
      "landed": "102:45:40, 20:17:40 UTC. “Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15, 02:56 UTC de 21 de julho: Armstrong desce da escada.",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” Armstrong, 109:24:48; o trecho é a gravação da NASA.",
      "liftoffe": "124:22: o estágio de subida decola do estágio de descida, que fica na Lua. 17:54 UTC de 21 de julho.",
      "rendezvous": "O Eagle persegue o Columbia de 18 km até 100 km. As manobras são desenhadas como uma forma, não as da missão.",
      "docked": "128:03, 21:35 UTC: acoplados. A tripulação e 21,5 kg de rocha lunar passam para o Columbia.",
      "jettison": "130:09: o estágio de subida do Eagle é solto para circular a Lua.",
      "tei": "135:23:42, no lado oculto: o motor de serviço queima 2 min 30 s. Para casa.",
      "home": "Dois dias e meio de volta, os mesmos 384 000 km.",
      "smsep": "194:49: o módulo de serviço é cortado e a cápsula vira o escudo térmico para a frente.",
      "entry": "195:03, interface de reentrada, a 122 km de altura e 11 km/s. O escudo brilha; até uns 6 g.",
      "drogue": "Por volta de 195:12: dois paraquedas estabilizadores, depois três principais.",
      "mains": "Três paraquedas principais, de 25 m de largura, reduzem a cápsula a uns 9 m/s.",
      "splash": "195:18:35, 16:50:35 UTC de 24 de julho: amerissagem no Pacífico, a 24 km do porta-aviões USS Hornet (não desenhado). Oito dias, três horas, 18 minutos.",
      "pathAscent": "os horários dos eventos do Relatório da Missão, com alturas e distâncias intermediárias aproximadas",
      "pathTrip": "reconstruído a partir dos horários do Diário de Voo como arcos de dois corpos: uma cônica de ida, um círculo em volta da Lua, uma cônica de volta; não são dados de rastreamento",
      "pathLm": "a descida é desenhada de trás para a frente a partir da Base da Tranquilidade e o encontro é uma forma; os horários dos eventos são os da missão",
      "srcReport": "Relatório da Missão Apollo 11, NASA MSC-00171, 1969 (horários dos eventos, lançamento, pouso)",
      "srcJournal": "Diário de Voo da Apollo 11, NASA (horários dos eventos ao segundo)",
      "srcClip": "As primeiras palavras de Armstrong na Lua: gravação da NASA, domínio público, do Wikimedia Commons",
      "srcLanding": "O aviso da alunissagem: gravação da NASA, domínio público, do Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: em volta da Lua",
      "blurb": "Do Complexo de Lançamento 39B, em 1 de abril de 2026, ao Pacífico ao largo de San Diego no dia 10: quatro pessoas em volta do lado oculto da Lua, no relógio da missão.",
      "chPad": "Plataforma 39B",
      "chLiftoff": "Decolagem",
      "chStaging": "Propulsores soltos",
      "chOrbit": "Órbita terrestre alta",
      "chTli": "Rumo à Lua",
      "chMoon": "O lado oculto",
      "chHome": "A volta",
      "chEntry": "Reentrada",
      "chSplash": "Amerissagem",
      "ready": "Complexo de Lançamento 39B, Centro Espacial Kennedy, 1 de abril de 2026. Wiseman, Glover, Koch e Hansen estão a bordo da Orion, no alto do Space Launch System.",
      "cored": "T−6,4 s: os quatro motores RS-25 do estágio central dão partida. Voado, como planejado.",
      "liftoff": "Decolagem, 22:35:12 UTC (18:35 EDT): os dois propulsores de cinco segmentos acendem em zero. Voado.",
      "srb": "Por volta de T+2 min: os propulsores se esgotam e se separam a 48 km, a 5 000 km/h. Voado; caem no Atlântico.",
      "las": "Planejado, T+3 min 22 s: a torre de escape do lançamento é lançada fora. Os voos relatados não dão o segundo; este é o do plano de voo.",
      "meco": "Planejado, T+8 min: o estágio central desliga, num arco suborbital com apogeu perto de 2 300 km. O horário do plano de voo.",
      "coresep": "O estágio central é solto e cai numa reentrada destrutiva sobre o Pacífico, umas duas horas após o lançamento. Voado.",
      "prb": "Por volta de T+50 min, no alto do arco: o estágio superior queima para tirar o ponto mais baixo da órbita de dentro da atmosfera. Voado, o segundo não é publicado.",
      "arb": "Uma hora depois, no ponto baixo: uma queima de 15 minutos eleva o lado distante da órbita a 70 000 km, uma volta de quase um dia. Voado.",
      "fairings": "Planejado: os três painéis em volta do módulo de serviço são lançados fora; os quatro painéis solares se desdobram. O horário do plano de voo, desenhados aqui já abertos.",
      "arrays": "Os quatro painéis da Orion estão abertos: vão gerar a energia dela por dez dias.",
      "sep": "Planejado: a Orion se separa do estágio superior; Glover então a pilota manualmente ao lado do estágio por uns 70 minutos. O horário da separação não é publicado.",
      "tli": "Dia de voo 2, umas 25 horas depois: o motor principal do módulo de serviço queima 5 min 49 s, rumo à Lua. Voado; o minuto mostrado é o do plano de voo.",
      "outbound": "Quatro dias de ida. Uma queima de correção de ida foi voada, de 17,5 s no dia de voo 5; é pequena demais para desenhar.",
      "record": "17:56 UTC de 6 de abril: a Orion passa o recorde de distância da Apollo 13, de 1970, 248 655 milhas da Terra. Voado.",
      "moon": "Dia de voo 6: a Orion entra na esfera de influência da Lua. Não entrará em órbita: contorna o lado oculto e cai de volta para casa.",
      "los": "22:46 UTC: atrás da Lua, sem contato por 38 minutos. Voado.",
      "closest": "Maior aproximação, 23:00 UTC de 6 de abril: 6 545 km acima do lado oculto da Lua. Voado.",
      "far": "23:02 UTC: mais longe da Terra, 406 771 km. Voado.",
      "aos": "23:24 UTC: contato de novo, de trás da Lua. Voado.",
      "home": "Quatro dias de volta. Três queimas de correção de volta foram voadas, de 15, 9 e 8 segundos; são pequenas demais para desenhar.",
      "esmsep": "Planejado: o módulo de serviço é solto uns 20 minutos antes da reentrada. O horário da soltura não é publicado; usamos o do plano de voo.",
      "entry": "Interface de reentrada, planejada uns 13 minutos antes da amerissagem: a 122 km de altura e 11 km/s, com o escudo térmico brilhando. Uma reentrada direta mais íngreme substituiu a reentrada com salto planejada. Voado.",
      "drogue": "Paraquedas estabilizadores, depois paraquedas-piloto e três principais, de 35 m de largura. Voado; os horários são os do plano de voo.",
      "mains": "Três principais levam a cápsula até o mar.",
      "splash": "Amerissagem, 00:07:27 UTC de 11 de abril (17:07 PDT, 10 de abril), 32,3 N 117,8 O, a sudoeste de San Diego; o USS John P. Murtha recolhe a tripulação (navio não desenhado). Nove dias, uma hora, 32 minutos. Voado.",
      "pathAscent": "os horários do plano de voo, com alturas e distâncias intermediárias nossas; a decolagem e a separação dos propulsores são voadas",
      "pathTrip": "reconstruído a partir da órbita voada, da maior aproximação e da amerissagem, como arcos de dois corpos e uma hipérbole em volta da Lua; não são dados de rastreamento",
      "srcWiki": "Wikipédia, Artemis II (o que foi voado, com horários e distâncias; lido em 2 de novembro de 2026)",
      "srcNasa": "NASA, Artemis II (o plano de voo; modelo do foguete e da cápsula: NASA 3D Resources)"
    },
    "apollo-13": {
      "title": "Apollo 13: o voo para casa",
      "blurb": "Do Complexo de Lançamento 39A, em 11 de abril de 1970, ao Pacífico no dia 17: um pouso lunar que não aconteceu, um tanque de oxigênio que estourou e o módulo lunar como bote salva-vidas.",
      "chIgnition": "Ignição",
      "chLiftoff": "Decolagem",
      "chStaging": "Separação de estágios",
      "chParking": "Órbita de estacionamento",
      "chTli": "Rumo à Lua",
      "chCoast": "Dois dias de viagem",
      "chBang": "O estrondo",
      "chLifeboat": "O Aquarius, o bote salva-vidas",
      "chReturn": "De volta a uma trajetória de retorno",
      "chMoon": "Pelo lado oculto",
      "chBurn": "A queima para casa",
      "chHome": "Três dias para casa",
      "chSm": "O módulo de serviço",
      "chUndock": "O Aquarius é solto",
      "chEntry": "Reentrada",
      "chSplash": "Amerissagem",
      "ignition": "Por volta de T−9 s: os cinco motores F-1 ligam, o central primeiro. Complexo de Lançamento 39A, 2:13 p.m., horário do leste dos EUA.",
      "liftoff": "Decolagem, 19:13:00 UTC, 11 de abril de 1970: James Lovell, Jack Swigert e Fred Haise, rumo às terras altas de Fra Mauro.",
      "roll": "Aos 12,6 s o conjunto gira para o azimute de voo, 72,043 graus a leste do norte.",
      "staging": "2:44: os motores externos do primeiro estágio desligam e o estágio se solta; o segundo estágio acende aos 2:45.",
      "tower": "3:21: a torre de escape do lançamento é lançada fora.",
      "pogo": "Aos 5:30 o motor central do segundo estágio se desliga sozinho, 132 segundos antes do previsto, depois que o estágio começou a vibrar forte demais. Os outros quatro queimam 34 segundos a mais para compensar.",
      "siicut": "9:53: o segundo estágio desliga e se solta; o S-IVB acende.",
      "parking": "12:30: órbita de estacionamento, de 190 por 185 km de altura. Seguem-se duas horas e meia de verificações.",
      "tli": "2:35:46: o S-IVB acende de novo, por 5 min 51 s, e envia a nave rumo à Lua a quase 11 km/s.",
      "sep": "3:06:39: o Odyssey se separa do S-IVB, dá meia-volta e acopla ao Aquarius às 3:19:09. Os quatro painéis do adaptador se soltam.",
      "extract": "4:01: o Odyssey puxa o Aquarius para fora do estágio vazio, que fica para trás.",
      "coast": "Dois dias até a Lua, desenhados a umas 9 000 vezes a velocidade real. A nave tem 11 metros, então é um ponto.",
      "tv": "55:53:20: o Controle da Missão pede uma agitação de rotina dos tanques de oxigênio. Uma transmissão de televisão terminou minutos atrás; a tripulação está arrumando tudo.",
      "bang": "55:54:53, 03:07 UTC de 14 de abril: um estrondo. O tanque de oxigênio 2 estourou e arrancou o painel externo do compartimento 4 do módulo de serviço. O voo do painel é desenhado, não medido.",
      "problem": "55:55:20: “Okay, Houston, we've had a problem here.” Jack Swigert; a gravação da NASA, tocada como foi registrada.",
      "problem2": "55:55:42: “Houston, we've had a problem.” James Lovell; a gravação da NASA.",
      "barber": "Em poucos minutos o oxigênio do tanque 1 também vaza. As células de combustível produzem a energia e a água da nave a partir desse oxigênio, e estão falhando.",
      "lifeboat": "O Aquarius vira o bote salva-vidas: construído para manter dois homens vivos por dois dias, precisa manter três vivos por quatro. O Odyssey é desligado para guardar suas baterias para a reentrada.",
      "mcc2": "61:29:43: o motor de descida do módulo lunar queima por 34 s, 11,5 m/s, para pôr a nave numa trajetória que volta à Terra. A trajetória desenhada não se curva por isso.",
      "impact": "77:56:40: o S-IVB vazio, enviado à frente, atinge a Lua em 2,4 S 27,9 O, e o sismômetro da Apollo 12 o registra (não desenhado).",
      "farside": "Por volta de 77:28, atrás da Lua e sem contato de rádio: o lado oculto, 254 km abaixo.",
      "closest": "Maior aproximação, 254 km acima do lado oculto. A uns 400 000 km da Terra: mais longe do que quaisquer humanos já tinham estado.",
      "tei": "79:27:39, duas horas depois da Lua: o motor de descida queima por 4 min 24 s, 262 m/s, para antecipar a chegada de 152 horas para 143 e levá-la ao Pacífico.",
      "home": "Três dias para casa, com frio, pouca água e a nave desligada ao mínimo.",
      "mcc3": "105:18: o motor de descida queima por 14 s a 10%, 2,4 m/s, para deixar a reentrada um pouco mais íngreme.",
      "mcc4": "137:39:52: uma última correção de 0,9 m/s, feita pelos pequenos propulsores do módulo lunar (não desenhada).",
      "smsep": "138:01:48, 4 horas 39 minutos antes da reentrada: o módulo de serviço é cortado. Seu painel está faltando há 82 horas.",
      "photo": "A tripulação fotografa o módulo enquanto ele se afasta: falta um painel inteiro e o isolamento rasgado aparece. O compartimento é desenhado a partir de AS13-59-8500; o dano a uma antena parabólica não é.",
      "undock": "141:30: o Aquarius, que manteve três homens vivos por cerca de 83 horas, é solto com a pressão do túnel de acoplamento. O módulo de comando fica sozinho.",
      "entry": "142:40:46, interface de reentrada, a 122 km de altura e 11 km/s. O primeiro pico é de uns 5 g.",
      "drogue": "Por volta de 142:48: dois paraquedas estabilizadores, depois três principais.",
      "mains": "Três paraquedas principais reduzem a cápsula a uns 9 m/s.",
      "splash": "142:54:41, 18:07 UTC de 17 de abril: amerissagem no Pacífico Sul, à vista do USS Iwo Jima. Os três estão a bordo em até 45 minutos.",
      "pathAscent": "os horários dos eventos do Relatório da Missão, com alturas e distâncias intermediárias aproximadas",
      "pathTrip": "os estados e horários do Relatório da Missão, uma trajetória integrada com um ajuste da velocidade de injeção e um arco de Lambert de volta; não são dados de rastreamento",
      "pathLm": "acoplado ao Odyssey até 141:30; a deriva depois do desacoplamento é ilustrativa",
      "pathSm": "ilustrativo: a velocidade de deriva do módulo de serviço vazio é nossa",
      "srcReport": "Relatório da Missão Apollo 13, NASA MSC-02680, 1971 (horários dos eventos, estados, reentrada)",
      "srcJournal": "Diário de Voo da Apollo 13, NASA (o rádio, ao segundo)",
      "srcClip": "As duas falas de rádio: gravação da NASA, domínio público, do Wikimedia Commons",
      "srcPhoto": "O compartimento 4 do módulo de serviço: fotografia AS13-59-8500 da NASA, domínio público, do Wikimedia Commons"
    },
    "sputnik-1": {
      "title": "Sputnik 1: o primeiro satélite",
      "blurb": "Baikonur, 4 de outubro de 1957: o primeiro satélite artificial, uma esfera polida de 585 mm, da plataforma à sua primeira volta à Terra, com seu bipe.",
      "chPad": "Sítio 1",
      "chAscent": "Decolagem",
      "chBoosters": "Os propulsores laterais",
      "chCore": "O estágio central",
      "chSep": "O PS-1 é solto",
      "chOrbit": "Uma volta",
      "ready": "T−10 s no Sítio 1, Baikonur: o foguete 8K71PS e, sob sua carenagem, uma esfera de 585 mm. 19:28:34 UTC de 4 de outubro de 1957, já dia 5 no local de lançamento. A lâmpada da plataforma é nossa: era uma plataforma no escuro, e o foguete é iluminado para poder ser visto.",
      "liftoff": "Decolagem. O estágio central e os quatro blocos laterais do R-7 queimam juntos; o foguete militar foi despojado da ogiva para isso.",
      "regulator": "Por volta dos 16 s um regulador de combustível falha: o estágio central queima querosene rápido demais e seu empuxo fica 4% acima durante a maior parte do voo. A missão sobrevive a isso.",
      "boosters": "T+116 s: os quatro blocos laterais se soltam, como a telemetria mostra. O estágio central segue sozinho.",
      "core": "T+295,4 s: o estágio central desliga, a 223 km de altura e uns 7,8 km/s, um segundo antes do previsto, quando um sensor vê a bomba de querosene vazia disparar.",
      "sep": "T+315,3 s, 19,9 s após o desligamento: o PS-1 é solto. A carenagem se solta, as quatro antenas se abrem (não animadas aqui) e o transmissor liga.",
      "beep": "Os primeiros bipes são ouvidos na estação de rastreamento IP-1 por dois minutos, até o satélite afundar abaixo do horizonte. O som é a gravação do sinal pela NASA.",
      "shadow": "O lançamento foi logo após a meia-noite no local, e nos primeiros 13 minutos o PS-1 voa na sombra da Terra, por isso é desenhado escuro. Ele entra na luz do Sol por volta de T+13 min.",
      "orbit": "Órbita: 223 por 950 km, 65,1 graus, 96,2 minutos por volta. O estágio central o acompanha (não desenhado).",
      "lap": "Uma volta nesta reprodução. As baterias acabaram em 26 de outubro, após 326 órbitas; a esfera caiu em 4 de janeiro de 1958, após cerca de 1 440.",
      "pathAscent": "os horários publicados dos eventos, com alturas e distâncias intermediárias aproximadas",
      "pathOrbit": "a órbita publicada como uma cônica a partir do fim do lançamento, uma volta; o giro descontrolado do satélite não é desenhado",
      "srcWiki": "Sputnik 1, Wikipédia (horários dos eventos, órbita, dimensões), a partir da NASA, do NSSDC e das fontes russas que ela cita",
      "srcNssdc": "Sputnik 1, Catálogo Mestre NSSDCA da NASA (lançamento e órbita)",
      "srcClip": "O bipe: gravação da NASA, domínio público, do Wikimedia Commons"
    },
    // 1.7.2 (public #526): Voskhod 2 and STS-1. Machine-drafted like the rest of this file (docs/TRANSLATING.md). Young's words stay as he said them. Brazil, not Portugal.
    "voskhod-2": {
      "title": "Voskhod 2: a primeira caminhada espacial",
      "blurb": "Baikonur, 18 de março de 1965: Alexei Leonov sai da nave por uma eclusa inflável durante 12 minutos e, um dia depois, a tripulação pousa em controle manual na taiga, a 386 km de onde deveria.",
      "chPad": "Sítio 1",
      "chAscent": "Decolagem",
      "chOrbit": "Órbita",
      "chEva": "A eclusa e a caminhada",
      "chBack": "A volta para dentro",
      "chFail": "O pouso automático falha",
      "chRetro": "Retrofrenagem manual",
      "chEntry": "Reentrada",
      "chLand": "A taiga",
      "ready": "T−10 s no Sítio 1, Baikonur: o foguete Voskhod e, sob sua carenagem, a Voskhod 3KD com Pavel Belyayev e Alexei Leonov. 07:00:00 UTC de 18 de março de 1965. O foguete desenhado é o da Vostok-K; o real tinha um terceiro estágio diferente.",
      "liftoff": "Decolagem. Como na Voskhod 1, não há como abortar nos primeiros minutos, até a carenagem sair.",
      "boosters": "T+119 s: os quatro blocos laterais se soltam.",
      "shroud": "Por volta de T+2,5 minutos: a carenagem é ejetada e a nave aparece pela primeira vez, com a eclusa Volga dobrada contra sua esfera.",
      "core": "T+301 s: o estágio central é solto e o terceiro estágio, o Blok I, assume por mais 240 segundos.",
      "orbit": "Órbita: 167 por 475 km, 64,8 graus, 90,9 minutos por volta. Uma esfera Vostok, um retrofoguete de reserva em cima e dois assentos de tripulação onde a Vostok tinha um assento ejetável.",
      "volga": "Belyayev infla a eclusa Volga: uns 40 tubos de ar enrijecem um tubo de tecido de 2,5 m de comprimento e 1,2 m de largura em cerca de sete minutos. O momento em que ele fez isso é nosso; ela é desenhada já aberta, não inflando.",
      "depress": "08:28:13 UTC: Leonov, no traje Berkut e sua mochila branca, despressuriza a eclusa. A eletrônica da nave era resfriada pelo ar dela, e por isso uma eclusa era necessária.",
      "hatch": "08:32:54: a escotilha externa da eclusa é aberta.",
      "out": "08:34:51: Leonov sai da eclusa, alto sobre o centro-norte da África, e se empurra até a ponta do seu cabo umbilical de 5,35 m. A primeira pessoa no espaço fora de uma nave.",
      "tether": "Ele fixa uma câmera na borda da eclusa e olha do estreito de Gibraltar até o mar Cáspio. A pose dele aqui é lida de um fotograma do filme.",
      "swell": "O traje inchou no vácuo: ele não alcança o obturador da câmera do peito na perna, e as luvas e as botas endureceram. Para voltar terá de soltar ar do traje.",
      "back": "Ele entra de cabeça, contra o procedimento, e fica atravessado no tubo ao girar para fechar a escotilha externa. Deixa a pressão do traje cair abaixo do limite de segurança para poder se dobrar.",
      "inside": "08:47:00: de volta na eclusa; a escotilha se fecha às 08:48:40. 12 minutos e 9 segundos fora, do centro-norte da África até o leste da Sibéria.",
      "repress": "08:51:54: a eclusa é repressurizada. Um pouco depois Belyayev dispara os parafusos explosivos e a eclusa é solta (o momento é nosso).",
      "jettison": "A Volga é solta e se afasta girando; a nave não pode usá-la de novo.",
      "auto": "Na revolução 16 o sistema de pouso automático é programado do solo, mas seu comando «6» não passa, ao que parece por uma falha no sistema de orientação pelo Sol. A queima prevista por volta de agora (seu relógio é nosso, aproximado) não acontece.",
      "manual": "07:16 UTC, 19 de março: a Vjezna-3 diz à tripulação por onda curta que desliguem o sistema automático e usem a descida manual. Belyayev tem mais uma revolução para se preparar.",
      "late": "Os dois homens, de traje, não conseguem voltar aos assentos depois que Belyayev girou a nave manualmente com o visor óptico Vzor. A retrofrenagem chega 46 segundos atrasada.",
      "retro": "Retrofrenagem manual com o motor KTDU-60. Seu horário e seu lugar são nossos: foi uns 45 minutos antes do pouso publicado, e as fontes não dizem.",
      "wires": "O módulo de instrumentos não se separa direito; a esfera gira com violência até os cabos queimarem por volta dos 100 km. (Desenhado separado na reentrada, um pouco cedo.)",
      "entry": "Reentrada. Os 46 segundos levam a nave uns 386 km além do seu campo, à floresta do planalto do Alto Kama, a nordeste de Perm.",
      "chutes": "Os paraquedas. Diferente da Vostok, ninguém é ejetado: a tripulação pousa dentro da esfera, com um foguete sólido que acende a cerca de um metro para suavizar o impacto (não desenhado).",
      "landing": "09:02:17 UTC: tocam o solo por volta de 59,57 N 55,47 L, na neve funda da taiga, a 75 km de Perm.",
      "taiga": "Os pilotos dos helicópteros de busca encontram o paraquedas vermelho só horas depois. A tripulação passa duas noites na floresta a uns −5 °C e mais frio antes de esquiar até um helicóptero.",
      "pathAscent": "os horários publicados dos eventos, com alturas e distâncias intermediárias aproximadas",
      "pathOrbit": "a órbita publicada, com a deriva de um dia, a retrofrenagem a um horário e um lugar que são nossos, e a reentrada e o dossel desenhados no meio",
      "srcWiki": "Voskhod 2, Wikipédia (os horários da caminhada espacial, a órbita, o pouso)",
      "srcRocket": "Voskhod (foguete), Wikipédia (os tempos de queima dos três estágios)",
      "srcGrahn": "Sven Grahn, «The Voskhod 2 mission revisited» (a falha da descida automática, a chamada à manual, citando o diário do general Kamanin)",
      "srcNssdc": "Voskhod 2, Catálogo Mestre NSSDCA da NASA (lançamento e órbita)"
    },
    "sts-1": {
      "title": "STS-1: o primeiro voo do Columbia",
      "blurb": "Kennedy, 12 de abril de 1981: John Young e Robert Crippen levam o primeiro ônibus espacial do Complexo de Lançamento 39A à órbita e, 54 horas depois, o fazem planar até o leito seco de Edwards.",
      "chPad": "Complexo de Lançamento 39A",
      "chAscent": "Decolagem",
      "chSrb": "Os propulsores",
      "chMeco": "Motores principais desligados",
      "chOrbit": "Órbita",
      "chHome": "O caminho de volta",
      "chEntry": "Reentrada",
      "chLand": "Pista 23",
      "ready": "T−10 s no Complexo de Lançamento 39A, Centro Espacial Kennedy: o Columbia, um tanque externo branco e dois propulsores de combustível sólido. 12:00:04 UTC de 12 de abril de 1981, vinte anos justos depois da Vostok 1. O STS-1 e o STS-2 voaram o tanque pintado de branco.",
      "ignition": "T−6,6 s: os três motores principais acendem e o conjunto inteiro balança para a frente, na direção dos pés da tripulação, e volta.",
      "liftoff": "Decolagem: os propulsores acendem quando o conjunto volta à vertical. Crippen comparou a uma catapulta a vapor. A plataforma é desenhada simples e a vala de chamas é nossa.",
      "roll": "Livre da torre, o conjunto gira para o rumo, 067 graus, e se inclina de cabeça para baixo, o orbitador sob o tanque, para poupar as asas. (Desenhado já no rumo.)",
      "maxq": "T+56 s: Max Q, a Mach 1,06 e 29 kPa. Os motores principais foram reduzidos a 65% para atravessá-la.",
      "srb": "T+2 min 12 s: os propulsores, que renderam melhor do que o esperado, são soltos a 53 km, 2,8 km mais alto do que o planejado. Caem no Atlântico com paraquedas.",
      "meco": "T+8 min 34 s: desligamento dos motores principais a 118 km.",
      "tank": "18 segundos depois o tanque externo é solto. Ele se parte no ar e cai no oceano Índico.",
      "oms1": "T+10 min 34 s: a primeira queima do OMS, 86 segundos, com os dois motores nas gôndolas de cauda do orbitador (não desenhada: a chama é quase invisível).",
      "oms2": "T+44 min 2 s: a segunda queima, 75 segundos, no topo da subida: 246 por 248 km, 40,3 graus, 89,9 minutos. O horário do apogeu é o do relatório; a trajetória até ele é nossa.",
      "doors": "As portas do compartimento de carga abrem para os radiadores trabalharem; antes do fim da segunda órbita, ou a tripulação teria de voltar. O horário é nosso. Na televisão veem placas térmicas perdidas das gôndolas do OMS.",
      "oms3": "T+6 h 20 min 46 s e 7 h 05 min 32 s: duas queimas de um só motor sobem a órbita a 274 km. A tripulação passa umas 53 horas em órbita testando a máquina.",
      "wake": "Dia 3: café da manhã, arrumar, os trajes de ejeção e as portas do compartimento fechadas para a reentrada. Young e Crippen se prendem. A órbita deles deu 35 voltas.",
      "deorbit": "Na órbita 36, sobre o sul do oceano Índico, uma queima de 160 segundos dos dois motores OMS. Seu horário e seu lugar são nossos, uns 55 minutos antes do campo. Young inclina o Columbia à atitude de reentrada com o nariz alto.",
      "entry": "Interface de reentrada a 120 km, a uns 8 110 km do campo a 28 240 km/h. O ângulo de ataque é de 40 graus até passar o pior do calor. Esta reconstrução põe a interface sobre o Pacífico ocidental; o relatório diz o oriental.",
      "blackout": "Um brilho rosa a 100 km; os dois baixam as viseiras. Uns 21 minutos sem rádio, 16 deles pelo ar ionizado. A maior parte da reentrada é voada pelos computadores, com inversões de rolamento a Mach 18,5 e 9,8.",
      "bigsur": "A costa da Califórnia perto de Big Sur a Mach 7 e 41 km. O Columbia voou 583 km através da trilha de sua órbita para chegar ao campo, que é desenhado.",
      "hac": "Young assume os controles. Feitas as inversões a Mach 4,8 e 2,8, uma ampla curva à esquerda rumo à pista 23 do leito seco, com um T-38 de perseguição. O tamanho da curva é nosso.",
      "touch": "T+54 h 20 m 53 s, 18:20:57 UTC: o trem principal toca a 339 km/h, mais lento e uns 800 m mais adiante na pista do que o planejado, em Edwards, pista 23. A descida do trem é desenhada alguns segundos antes.",
      "stop": "Young: “This is the world's greatest all-electric flying machine. I'll tell you that. That was super!” 36 órbitas, 1 729 348 km, 2 dias 6 horas 20 minutos 53 segundos.",
      "pathAscent": "os horários e alturas publicados dos eventos, com as distâncias entre eles aproximadas",
      "pathOrbit": "as queimas e órbitas publicadas unidas por arcos, a queima de desorbitagem, a reentrada e a aproximação desenhadas no meio; os horários e os lugares que escolhemos são ditos nas legendas",
      "srcWiki": "STS-1, Wikipédia (horários e alturas dos eventos, as órbitas, as queimas, a reentrada e o pouso), a partir dos documentos da missão da NASA",
      "srcNssdc": "STS-1 Columbia, Catálogo Mestre NSSDCA da NASA (lançamento e pouso)"
    },
    "hubble-deployment": {
      "title": "A liberação do Hubble pelo Discovery",
      "blurb": "STS-31, 25 de abril de 1990: o braço ergue o Telescópio Espacial Hubble para fora do compartimento de carga do Discovery, seus painéis solares se desenrolam (um deles para), suas antenas se abrem e, às 19:38 UTC, Steven Hawley o solta.",
      "chBay": "No compartimento",
      "chLift": "Para fora do compartimento",
      "chArrays": "Os painéis",
      "chStop": "Um deles para",
      "chAntennas": "As antenas",
      "chSwing": "Até o ponto de liberação",
      "chRelease": "Solto",
      "chAway": "Afastando-se",
      "ready": "Dia de voo 2, 25 de abril de 1990, a 613 km de altura. O compartimento de carga do Discovery está aberto e o Telescópio Espacial Hubble, de 13,2 m de comprimento, está em seu berço. Onde o ônibus espacial está sobre a Terra, e todo horário aqui, exceto a liberação, é nosso: as fontes dão a liberação e pouco mais.",
      "grapple": "O efetuador do braço fecha seu laço no ponto de captura ao lado de um dos acionadores de antena do telescópio. Steven Hawley opera o braço do posto de voo traseiro. As juntas do braço são desenhadas como um braço de dois segmentos que alcança cada lugar; não são telemetria.",
      "umbilical": "O telescópio passa para a energia própria e o fornecimento do ônibus espacial a ele é desligado (NASA). As travas que o seguravam no compartimento, duas nas bordas e uma no piso, são nossas na forma e no horário.",
      "unberth": "O braço ergue o telescópio na vertical para fora do berço. O relógio e a altura são nossos.",
      "arrays": "Os painéis solares, enrolados em tambores e dobrados ao longo do tubo para o lançamento, são abertos para os lados. Como estavam guardados é desenhado a partir de fotografias, não de desenhos técnicos. Esses primeiros painéis, amarelo-dourados, foram substituídos em 1993.",
      "unroll": "O primeiro painel se desenrola ao longo de seus braços até cerca de 7 m por 2,5 m. Quanto tempo levou é nosso.",
      "stop": "O segundo painel sai até a metade e para. McCandless e Sullivan esperam na eclusa parcialmente despressurizada, caso seja preciso uma caminhada espacial para soltá-lo. Qual painel foi é contado de duas maneiras; o desenhado é escolha nossa.",
      "wait": "Os controladores tentam de novo e de novo, e a órbita passa pela sombra da Terra e sai dela. A liberação, planejada para a 19ª órbita, atrasa uma. Quanto tempo levou, e quando, é nosso.",
      "free": "A última tentativa a partir do solo funciona e o painel se desenrola até o fim; a caminhada espacial não é necessária. O horário é nosso.",
      "antennas": "Os dois braços das antenas de alto ganho saltam para baixo e para fora, e seus pratos ficam livres. Como estavam dobrados, e quando, é nosso.",
      "swing": "O braço gira o telescópio até a posição de liberação, sobre o compartimento. A rota é nossa.",
      "readyRelease": "Os sistemas de apontamento do Hubble são ligados e testados com o braço ainda segurando o telescópio. Cada sistema é verificado antes de o braço soltá-lo (NASA).",
      "release": "19:38 UTC, 25 de abril de 1990, 31 horas e 4 minutos após a decolagem: Hawley abre o laço e o Hubble está livre. O Jonathan's Space Report dá 19:38; a America Space diz 3:37 p.m. EDT.",
      "away": "O telescópio fica onde foi posto e o Discovery se afasta. A America Space diz que no posto de voo gritaram por uma câmera. O braço recua.",
      "pulses": "O Discovery aciona seus propulsores duas vezes para elevar um pouco a órbita, de modo que fique para trás de forma constante. Os horários e o tamanho dos pulsos são nossos.",
      "trail": "O Discovery fica perto do Hubble por cerca de dois dias, por precaução (NASA); o plano era segui-lo a cerca de 40 milhas náuticas, caso a porta da abertura desse problema.",
      "pathOrbit": "um círculo de 613 km a 28,45 graus como publicado, com o lugar nele escolhido por nós para estar à luz do Sol",
      "pathHst": "o telescópio desde a liberação, na órbita em que foi liberado",
      "srcNasa": "STS-31, página do arquivo do Ônibus Espacial da NASA (horário do lançamento, órbita)",
      "srcKit": "Kit de imprensa da STS-31, NASA (o plano de implantação, as tarefas da tripulação, a 19ª órbita, o acompanhamento)",
      "srcJsr": "Jonathan's Space Report n.º 36 (liberação às 19:38 UTC, o atraso de uma órbita, o painel que não abria)",
      "srcAmerica": "America Space, “Somebody Get a Camera” (os painéis, as antenas, os pulsos dos propulsores, 3:37 p.m. EDT)"
    },
    "falcon9-og2-2": {
      "title": "O primeiro pouso de um Falcon 9",
      "blurb": "Cabo Canaveral, 21 de dezembro de 2015: o voo 20 do Falcon 9 leva 11 satélites ORBCOMM para longe e seu primeiro estágio volta à Landing Zone 1, o primeiro pouso do primeiro estágio de um foguete orbital.",
      "chPad": "Complexo de Lançamento 40",
      "chAscent": "Decolagem",
      "chSep": "Corte e separação",
      "chReturn": "Boostback",
      "chEntry": "O caminho para baixo",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 s, Space Launch Complex 40, Cabo Canaveral, 8:29 p.m. de 21 de dezembro de 2015: Falcon 9 Full Thrust, 70 m de altura, em seu primeiro voo, levando 11 satélites ORBCOMM. É noite; o foguete é desenhado à luz de uma lâmpada nossa. A SpaceX chama o pouso de “um objetivo secundário de teste”.",
      "ignition": "T−3 s: os nove motores Merlin do primeiro estágio ligam.",
      "liftoff": "Decolagem às 01:29:00 UTC de 22 de dezembro. O primeiro estágio tem 41 m dos 70.",
      "mach1": "T+1:05: Mach 1, como a reconstrução da transmissão indica.",
      "maxq": "T+1:13: max Q, o momento em que o ar pressiona mais forte; os motores foram reduzidos para isso.",
      "meco": "T+2:23: corte dos motores principais a 75 km e 1,67 km/s (a reconstrução da transmissão; a SpaceX havia planejado T+2:20).",
      "sep": "T+2:25: os estágios se separam. O primeiro estágio gira com a cauda para a frente com seus propulsores de gás frio, o que é desenhado ao longo de cerca de meio minuto; quanto tempo levou é nosso.",
      "s2": "T+2:34: o motor a vácuo do segundo estágio acende e ele se afasta. Sua trajetória é desenhada só por um trecho curto, e é nossa.",
      "fairing": "T+2:48: as duas metades da carenagem, de 5,2 m de largura, são soltas.",
      "boostback": "T+3:47: três motores do primeiro estágio acendem para a queima de boostback, que vira sua trajetória de volta para o Cabo. Quanto tempo queimam é nosso: cerca de 35 segundos neste desenho.",
      "fins": "As quatro aletas de grade se abrem para guiar o estágio pelo ar. Quando isso ocorreu é nosso.",
      "coast": "O estágio segue em inércia sobre o topo, a cerca de 190 km de altura neste desenho (nosso), e começa a descer.",
      "entry": "T+8:01: três motores acendem de novo para a queima de reentrada, para frear o estágio antes do ar denso.",
      "entryEnd": "T+8:21: a queima de reentrada termina. Caindo pelo ar, o estágio se guia com suas aletas.",
      "landingBurn": "T+9:11: um motor acende para a queima de pouso, que tem de parar o estágio na plataforma. Dura 33 segundos.",
      "legs": "As quatro pernas de pouso, dobradas ao longo da lateral durante o voo, descem alguns segundos antes do toque. Quando, é nosso.",
      "touch": "T+9:44, 01:38:44 UTC: o primeiro estágio está de pé na Landing Zone 1, uma plataforma redonda de 86 m de diâmetro com uma cruz, a uns 9 km ao sul da plataforma de onde saiu. Nenhum primeiro estágio de um foguete orbital tinha pousado antes.",
      "sats": "Enquanto isso, o segundo estágio libera os 11 satélites, de T+14:26 a T+19:05 (não desenhado), e depois reacende seu motor para mostrar que consegue, para um voo posterior.",
      "pathAscent": "os horários publicados dos eventos, e a altura e a velocidade publicadas no corte dos motores principais, com a subida entre eles nossa; o foguete voou no escuro e é desenhado iluminado por uma lâmpada",
      "pathBooster": "os tempos de queima publicados e o local de pouso, com o arco, suas velocidades e a duração do boostback voados por nós como ponto de massa; desenhado iluminado por uma lâmpada",
      "pathStage2": "o segundo estágio desde a separação, empurrado por nós ao longo do caminho que seguia; ele para onde a imagem para",
      "srcKit": "SpaceX, kit de imprensa da missão ORBCOMM-2, 21 de dezembro de 2015 (o plano: os horários, as queimas, o pouso como objetivo secundário de teste)",
      "srcRecon": "Spaceflight101, “Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites” (os horários dos eventos a partir da transmissão, MECO a 75 km e 1,67 km/s)",
      "srcWiki": "Falcon 9 voo 20, Wikipédia (o horário do lançamento, a carga, a reignição do segundo estágio)",
      "srcLz": "Landing Zones 1 e 2, Wikipédia (o local, e as plataformas de 282 ft marcadas com um X)"
    }
  }
});

// 1.6.3 (internal #995): the sections and strings this file did not have yet (r13Deep, compare, passportKinds, photoCompare, entrances,
// the 1.5 strings and the gaps in card, drawing, cls, templates and the rest), pt. Machine-drafted like the rest of this file (docs/TRANSLATING.md):
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
        "iauName": "Nome aprovado pela UAI",
        "onBody": "Em",
        "whenSite": "Quando"
      }
    },
    "drawing": {
      "markOnly": "uma marca no lugar dele; não há nada ali para desenhar",
      "noPlace": "não desenhado: não há lugar dele para marcar",
      "shower": "um nome no ponto de onde seus meteoros parecem vir, na vista do céu perto do pico; uma direção, não um lugar no espaço"
    },
    "klass": {
      "shower": "Chuva de meteoros"
    },
    "cls": {
      "shower": "uma direção no céu: a mediana das soluções publicadas pela UAI para esta chuva",
      "noPlace": "nenhum lugar é desenhado para ele: o corpo em que ele está não é um mundo neste app",
      "approxPlace": "colocado a partir de coordenadas publicadas, com precisão de cerca de {n} graus"
    },
    "unplaced": {
      "noDistanceRow": "Não medida: o catálogo não tem paralaxe para ela",
      "iauApproved": "{name}, aprovado em {date}"
    },
    "starSystem": {
      "auYearComputed": "{n} UA; o ano de lá, cerca de {y} anos, é calculado a partir disso e da massa da estrela"
    },
    "searchRows": {
      "kinds": {
        "galaxy": "Galáxia",
        "cluster": "Aglomerado de galáxias",
        "browndwarf": "Anã marrom",
        "whitedwarf": "Anã branca"
      }
    },
    "templates": {
      "exotic": {
        "kinds": {
          "galaxy": "galáxia",
          "cluster": "aglomerado de galáxias",
          "browndwarf": "anã marrom",
          "whitedwarf": "anã branca"
        },
        "leadGalaxy": "{name} é uma galáxia a {dist} anos-luz de distância, onde ela está agora",
        "leadCluster": "{name} é um aglomerado de galáxias a {dist} anos-luz de distância, onde ele está agora",
        "leadBrowndwarf": "{name} é uma anã marrom a {dist} anos-luz de distância",
        "leadWhitedwarf": "{name} é uma anã branca a {dist} anos-luz de distância"
      },
      "site": {
        "mpc": "o código dele no Minor Planet Center é {code}",
        "closed": "fechado em {year}",
        "kinds": {
          "launch-site": "local de lançamento",
          "landing-site": "local de pouso"
        }
      },
      "shower": {
        "lead": "{name} é uma chuva de meteoros",
        "peak": "com pico por volta de {date}",
        "speed": "com meteoros que atingem o ar a {n} km por segundo",
        "parent": "vinda da poeira de {parent}"
      }
    },
    "a45": {
      "farNote": "a que distância está agora ({how}), a partir do desvio para o vermelho de {z} na cosmologia de Planck 2018",
      "comoving": "distância comóvel",
      "pulsarDistance": [
        "da própria paralaxe do pulsar",
        "a distância do aglomerado globular, do remanescente de supernova ou de outro objeto a que ele pertence",
        "a estimativa de um modelo a partir do sinal de rádio (o modelo YMW16 dos elétrons livres da Galáxia), não uma medição: pode errar bastante"
      ],
      "shape": {
        "galaxy": "uma marca na distância que o desvio para o vermelho dá; uma galáxia tão distante tem no máximo alguns pixels, então a forma dela não é desenhada",
        "browndwarf": "um anel na distância medida; uma anã marrom é um ponto nesta escala e quase não dá luz visível",
        "whitedwarf": "um anel na distância medida; a própria anã branca é um ponto nesta escala",
        "cluster": "uma marca no centro do aglomerado em raios X; as galáxias-membro só são desenhadas para Virgo, Coma, Fornax e Perseus (a etapa do Grupo Local)"
      },
      "quasarZ7": "Um quasar visto como era cerca de {age} milhões de anos depois do Big Bang: um dos {n} conhecidos além do desvio para o vermelho 7.",
      "unplaced": {
        "unnamed": "Estrela HYG {id}",
        "lead": "{name} é uma estrela na direção em que você olha; ninguém mediu a que distância ela está",
        "leadColour": "{name} é {a} estrela {colour} na direção em que você olha; ninguém mediu a que distância ela está",
        "note": "Desenhada no céu e em lugar nenhum do espaço, porque um lugar precisa de uma distância.",
        "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): só direção e magnitude"
      }
    },
    "r13Deep": {
      "card": {
        "dso-tarantula-nebula": "A luz dela perto da nossa linha de visada é a fotografia do Webb; o gás é um modelo de uma cavidade em volta do aglomerado R136, dentro de uma casca de gás brilhante contida por nuvens moleculares, segundo Pellegrini, Baldwin e Ferland (2011). Ainda não revisado por um astrônomo.",
        "dso-m43": "A luz dela vem da fotografia do ESO, e a forma é reconstruída como uma cavidade menor na mesma nuvem escura da Nebulosa de Órion, iluminada pela estrela NU Orionis. Ainda não revisado por um astrônomo.",
        "dso-m51": "Construída a partir da inclinação e da estrutura publicadas: uma espiral de dois braços vista quase de frente, a companheira NGC 5195 atrás da ponta do braço norte e o braço que chega até ela; as profundidades são um modelo. Ainda não revisado por um astrônomo.",
        "dso-m81": "Construída a partir da inclinação e da estrutura publicadas: um bojo grande e antigo e dois braços bem enrolados, com poeira na borda interna. Ainda não revisado por um astrônomo.",
        "dso-m101": "Construída a partir da inclinação e da estrutura publicadas: um disco grande visto quase de frente, muitos braços e as regiões gigantes de formação de estrelas onde o céu as coloca. Ainda não revisado por um astrônomo.",
        "dso-m104": "Construída a partir da inclinação e da estrutura publicadas: um bojo enorme e redondo e um disco fino visto quase de perfil, com o anel de poeira na frente. Ainda não revisado por um astrônomo.",
        "dso-antennae-galaxies": "Duas galáxias em colisão onde o céu as coloca, e as duas caudas de maré; a que distância cada parte está, à frente ou atrás, é um modelo segundo as simulações da colisão. Ainda não revisado por um astrônomo.",
        "dso-m83": "Construída a partir da inclinação e da estrutura publicadas: uma espiral barrada vista quase de frente, com braços ricos em estrelas jovens e hidrogênio brilhante. Ainda não revisado por um astrônomo.",
        "dso-ngc-1300": "Construída a partir da estrutura publicada: uma barra longa com faixas de poeira nas bordas da frente e dois braços que saem das pontas, com a forma ajustada à fotografia do Hubble. Ainda não revisado por um astrônomo.",
        "dso-centaurus-a": "Construída a partir de números publicados: uma galáxia elíptica gigante cortada por um disco deformado de poeira e estrelas jovens, segundo um modelo ajustado às imagens do Spitzer; os dois jatos são desenhados em cores falsas, porque brilham em raios X e ondas de rádio, não em luz visível. Ainda não revisado por um astrônomo."
      }
    },
    "compare": {
      "row": "Comparar",
      "hint": "em escala",
      "missing": "—",
      "none": "Nenhum",
      "yes": "Sim",
      "no": "Não",
      "range": "{a} a {b}",
      "numUnit": "{num} {unit}",
      "modeLabel": "Vista",
      "modes": {
        "pair": "Lado a lado",
        "lab": "Todos os mundos"
      },
      "withLabel": "Comparar com",
      "scaleLabel": "Escala",
      "scales": {
        "true": "Em escala",
        "same": "Mesma largura"
      },
      "propLabel": "Ordenar todos os mundos por",
      "props": {
        "across": "Largura",
        "mass": "Massa",
        "gravity": "Gravidade",
        "temp": "Temperatura",
        "spin": "Duração de uma volta",
        "year": "Duração de um ano",
        "dist": "Distância do Sol",
        "moons": "Número de luas"
      },
      "names": {
        "sun": "O Sol",
        "mercury": "Mercúrio",
        "venus": "Vênus",
        "earth": "A Terra",
        "moon": "A Lua",
        "mars": "Marte",
        "jupiter": "Júpiter",
        "saturn": "Saturno",
        "uranus": "Urano",
        "neptune": "Netuno",
        "pluto": "Plutão"
      },
      "the": {
        "sun": "o Sol",
        "moon": "a Lua"
      },
      "wider": "{big} tem {n} vezes mais largura que {small}.",
      "same": "{a} e {b} têm quase a mesma largura.",
      "figure": "{a} e {b}, desenhados {how}.",
      "figureTrue": "em uma só escala",
      "figureSame": "com a mesma largura, fora de escala",
      "tableLabel": "{a} e {b}, lado a lado",
      "rows": {
        "across": "Diâmetro",
        "mass": "Massa",
        "gravity": "Gravidade",
        "temp": "Temperatura",
        "spin": "Uma volta dura",
        "year": "Um ano lá",
        "dist": "Distância do Sol",
        "air": "Atmosfera",
        "pressure": "Pressão do ar",
        "moons": "Luas",
        "rings": "Anéis"
      },
      "units": {
        "km": "km",
        "earthOne": "Terra",
        "earths": "Terras",
        "g": "m/s²",
        "c": "°C",
        "hours": "horas",
        "days": "dias",
        "years": "anos",
        "au": "UA",
        "bar": "bar",
        "microbar": "µbar"
      },
      "notes": {
        "average": "média",
        "flattened": "em média; a forma é achatada",
        "range": "a faixa dele",
        "bar1": "no nível de 1 bar",
        "edge": "na borda visível",
        "photosphere": "a superfície visível",
        "retro": "gira ao contrário",
        "sunSpin": "a 16° de latitude",
        "withEarth": "com a Terra",
        "exosphere": "uma exosfera fina",
        "photosphereAir": "na fotosfera"
      },
      "air": {
        "part": "{share}% {gas}",
        "join": ", ",
        "almostNone": "Quase nenhuma",
        "noSurface": "Sem superfície"
      },
      "gas": {
        "hydrogen": "hidrogênio",
        "helium": "hélio",
        "methane": "metano",
        "nitrogen": "nitrogênio",
        "oxygen": "oxigênio",
        "argon": "argônio",
        "carbon dioxide": "dióxido de carbono"
      },
      "source": "Planetary Fact Sheets da NASA (tabelas de dados planetários), lidas em {date}.",
      "giantNote": "Um gigante não tem superfície: a gravidade e a temperatura dele são as do nível de 1 bar.",
      "moonsNote": "O número de luas cresce à medida que novas são confirmadas.",
      "spinNote": "A volta do Sol é o valor da tabela a 16° de latitude.",
      "drawnTrue": "Desenhados em uma só escala a partir do raio médio de cada um, não são fotografias.",
      "drawnSame": "Mesma largura, então fora de escala. Os anéis mantêm a mesma proporção.",
      "tiny": "Aqui, {name} é menor que um pixel e vira um ponto.",
      "ringsDrawn": "Os anéis são inclinados para a imagem; os raios deles são os da NASA.",
      "labLog": "As barras são logarítmicas, para os valores pequenos continuarem visíveis.",
      "labLinear": "As barras são proporcionais à quantidade.",
      "labTitle": "Comparar: {name}",
      "thisCard": "O mundo desta ficha"
    },
    "passportKinds": {
      "kindsTitle": "Abertos, por tipo",
      "noKinds": "Ainda não há nada para contar por tipo.",
      "kinds": {
        "worlds": "Planetas, luas e o Sol",
        "stations": "Estações espaciais",
        "satellites": "Satélites e seus foguetes",
        "spacecraft": "Sondas e telescópios espaciais",
        "small": "Cometas e asteroides",
        "stars": "Estrelas",
        "exoplanets": "Planetas de outras estrelas",
        "deep": "Nebulosas, galáxias e o céu profundo",
        "earth": "Lugares e clima na Terra"
      },
      "notedTitle": "Anotados",
      "noNoted": "Ainda não há nada anotado. Abra um lugar no mapa.",
      "notedFine": "O dia em que se viu pela primeira vez que uma anotação valia neste navegador. Fica guardado aqui, nunca é classificado nem enviado.",
      "noted": {
        "first": {
          "name": "Um primeiro lugar",
          "said": "Você abriu um lugar no mapa."
        },
        "planets": {
          "name": "Todos os oito planetas",
          "said": "Você abriu todos os planetas, de Mercúrio a Netuno."
        },
        "station": {
          "name": "Uma estação espacial",
          "said": "Você abriu uma estação em órbita."
        },
        "craft": {
          "name": "Uma nave lá fora",
          "said": "Você abriu uma sonda ou um telescópio espacial."
        },
        "small": {
          "name": "Um cometa ou um asteroide",
          "said": "Você abriu um corpo pequeno do Sistema Solar."
        },
        "star": {
          "name": "Uma estrela",
          "said": "Você abriu uma estrela além do Sol."
        },
        "exoplanet": {
          "name": "Um planeta de outra estrela",
          "said": "Você abriu um planeta que gira em torno de outra estrela."
        },
        "deep": {
          "name": "O céu profundo",
          "said": "Você abriu uma nebulosa, uma galáxia ou um aglomerado."
        },
        "trip": {
          "name": "Uma viagem até o fim",
          "said": "Você terminou uma viagem guiada."
        },
        "eyes": {
          "name": "Visto com seus próprios olhos",
          "said": "Você marcou algo como visto."
        },
        "every": {
          "name": "Um de cada tipo",
          "said": "Você abriu pelo menos uma coisa de cada tipo acima."
        }
      }
    },
    "photoCompare": {
      "title": "Comparar com a fotografia",
      "reconstruction": "Reconstrução",
      "photograph": "Fotografia",
      "valueText": "{n}% fotografia",
      "flying": "Indo até o ponto de onde a fotografia foi tirada.",
      "note": "O mapa desenha um modelo 3D. A fotografia aparece só aqui: plana e virada para o Sol, então, se você se virar, ela some."
    },
    "entrances": {
      "label": "Três jeitos de entrar",
      "tonight": "Esta noite",
      "tonightTitle": "O que está sobre você esta noite, a partir do seu lugar",
      "explore": "Explorar",
      "exploreTitle": "Olhe o mapa inteiro",
      "trip": "Viagem guiada",
      "tripTitle": "Começa a primeira viagem guiada da lista"
    }
  });
}
// 1.6.3: end

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "Tamanho e distância",
    "size": "Tamanho",
    "sizeTrue": "real",
    "sizeValue": "×{n}",
    "sizeTitle": "Quanto maiores do que na realidade os mundos são desenhados, de real até ×{max}",
    "dist": "Distância",
    "distTrue": "real",
    "distLog": "logarítmica",
    "distSome": "{p}% do caminho até logarítmica",
    "distTitle": "Quanto as distâncias até o Sol são comprimidas, de real até logarítmica. As direções continuam medidas.",
    "presets": "Vistas prontas",
    "presetTrue": "Escala real",
    "presetTrueTitle": "Cada mundo no tamanho real e na distância real",
    "presetClass": "Sala de aula",
    "presetClassTitle": "Mundos ×{n} e distâncias logarítmicas, como um planetário mecânico",
    "held": "Uma viagem desenha tudo em escala real. Os controles voltam quando ela termina.",
    "note": "Onde cada mundo está no céu é sempre medido. O selo diz quanto maior ele foi desenhado.",
    "noteSize": "{name}: desenho ×{n} maior do que o real (controle Tamanho).",
    "noteDist": "Distância desenhada até o Sol: {drawn} UA; a real é {au} UA, na direção real (controle Distância).",
    "noteMoon": "Distância até {parent} desenhada {n} vezes maior do que a real, na direção real, para ficar fora do planeta ampliado.",
    "noteSun": "O Sol está desenhado ×{n} maior do que é, pelo controle Tamanho, e afastado de Mercúrio.",
    "badgeSun": "Sol ×{n}",
    "badgeLog": "distâncias log.",
    "badgeSome": "distâncias a {p}% do log",
    "badgeJoin": " · ",
    "badgeTitle": "Os controles Tamanho e Distância da aba Planetas desenham esta vista."
  },
  "cutaway": {
    "button": "Ver por dentro",
    "buttonTitle": "Abrir {name} até as camadas, nas profundidades que as medições dão",
    "title": "Por dentro: {name}",
    "close": "Fechar o corte",
    "model": "Camadas segundo {model}.",
    "source": "Fonte",
    "layers": "Camadas, da superfície para baixo",
    "depthRange": "{top}–{bottom} km",
    "toCentre": "{top} km até o centro",
    "cls": {
      "measured": "medido",
      "modelled": "modelado",
      "inferred": "deduzido"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "Profundidade",
    "probeTitle": "Deslize da superfície até o centro",
    "depth": "{km} km de profundidade",
    "atCentre": "o centro",
    "layer": "Camada",
    "pressure": "Pressão",
    "temperature": "Temperatura",
    "density": "Densidade",
    "valueCls": "{value} ({cls})",
    "note": "As profundidades são das fontes; as cores foram escolhidas. Entre o topo e a base de uma camada, a sonda mostra valores intermediários.",
    "unknown": "Ainda não há um corte desse mundo.",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} milhões de GPa",
      "k": "{n} K",
      "millionK": "{n} milhões de K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "Crosta",
      "mantle": "Manto",
      "upper-mantle": "Manto superior",
      "lower-mantle": "Manto inferior",
      "outer-core": "Núcleo externo líquido",
      "inner-core": "Núcleo interno sólido",
      "liquid-core": "Núcleo líquido",
      "iron-core": "Núcleo de ferro",
      "molten-silicate": "Camada de rocha derretida",
      "partial-melt": "Camada parcialmente derretida",
      "ice-shell": "Casca de gelo",
      "ocean": "Oceano",
      "hp-ice": "Gelo de alta pressão",
      "rock-mantle": "Manto rochoso",
      "rock-core": "Núcleo rochoso",
      "hydrated-core": "Núcleo de rocha e gelo",
      "molecular": "Hidrogênio e hélio",
      "metallic": "Hidrogênio metálico",
      "dilute-core": "Núcleo diluído",
      "ice-mantle": "Água, amônia e metano",
      "convective": "Zona de convecção",
      "radiative": "Zona radiativa",
      "solar-core": "Núcleo"
    }
  },
  "helio": {
    "chip": "Heliosfera · modelada",
    "chipTitle": "De onde vem o desenho da bolha ao redor do Sistema Solar",
    "legendTitle": "A heliosfera",
    "rowTs": "Choque de terminação, onde o vento solar fica mais lento que a velocidade do som. Forma modelada que passa pelos dois cruzamentos: Voyager 1 a {a} UA, Voyager 2 a {b} UA (medidos).",
    "rowHp": "Heliopausa, onde o vento do Sol encontra o gás interestelar. Forma modelada (Parker 1961) que passa pelos cruzamentos: Voyager 1 a {a} UA, Voyager 2 a {b} UA (medidos).",
    "rowBow": "Onda de proa, onde o gás interestelar se acumula à frente. Ilustrativa: o dobro da distância da heliopausa (McComas et al. 2012).",
    "rowRibbon": "Faixa do IBEX, uma faixa brilhante que o IBEX mediu no céu (Funsten et al. 2013). A distância dela não é medida: está desenhada a {au} UA.",
    "rowMotion": "O caminho do Sol pelo gás interestelar local, {v} km/s (IBEX, McComas et al. 2015). A seta mostra {years} anos desse caminho, {au} UA.",
    "sources": "Locais dos cruzamentos a partir das trajetórias das Voyager no JPL Horizons, nas datas de cruzamento da NASA. Formas: Parker 1961, Wilkin 1996, seguindo Izmodenov & Alexashov 2015 e Opher et al. 2015.",
    "crossing": "{craft}: {surface}, {au} UA, {date}",
    "motion": "O caminho do Sol, {v} km/s",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "choque de terminação",
      "hp": "heliopausa"
    },
    "surfaceLabel": {
      "ts": "Choque de terminação (modelado)",
      "hp": "Heliopausa (modelada)",
      "bow": "Onda de proa (ilustrativa)",
      "ribbon": "Faixa do IBEX (medida no céu)"
    },
    "date": "{d} {m} {y}",
    "months": [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez"
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "Um caminho ao redor de algo, mantido pela gravidade. Se você for rápido o bastante para o lado, continua caindo ao largo da Terra, em vez de cair nela.",
  "low Earth orbit": "A camada movimentada de cerca de 200 a 2 000 km de altura. A estação, a maioria dos satélites e a maior parte dos detritos estão aqui.",
  "geostationary": "Uma órbita a 35 786 km de altura em que uma volta leva o mesmo tempo que a Terra leva para girar uma vez, 23 horas e 56 minutos. Por isso o satélite parece parado sobre um único ponto.",
  "polar orbit": "Uma órbita sobre os polos. A Terra gira por baixo, então o satélite acaba vendo todas as partes dela.",
  "elements": "Seis números mais uma data que descrevem uma órbita. Aplique-os à matemática certa e você obtém uma posição.",
  "epoch": "O momento em que um conjunto de elementos orbitais era verdadeiro. Quanto mais longe dele, menos exata a resposta.",
  "apogee": "O ponto alto de uma órbita ao redor da Terra.",
  "perigee": "O ponto baixo de uma órbita ao redor da Terra.",
  "perihelion": "O ponto em que algo que orbita o Sol chega mais perto dele.",
  "inclination": "O quanto uma órbita é inclinada em relação ao equador. Noventa graus passa sobre os polos.",
  "propagated": "Propagado a partir de uma medição mais antiga. Não é uma observação nova, e vai se desviando.",
  "lunar distance": "A distância da Terra à Lua, cerca de 384 000 km. Uma régua útil para passagens de asteroides.",
  "astronomical unit": "A distância da Terra ao Sol, cerca de 150 milhões de km.",
  "light-time": "Quanto tempo a luz leva para atravessar uma distância. É também quanto tempo leva uma mensagem de rádio.",
  "light-year": "A distância que a luz percorre em um ano juliano, cerca de 9,46 trilhões de km. Uma régua para o vão entre as estrelas.",
  "magnitude": "O quanto algo parece brilhante. A escala vai ao contrário: números menores são mais brilhantes.",
  "azimuth": "Uma direção da bússola em graus. Zero é norte, 90 é leste.",
  "elevation": "A que altura algo está acima do horizonte, em graus. Noventa é a pino.",
  "terminator": "A linha entre o dia e a noite em um mundo.",
  "twilight": "O tempo depois do pôr do Sol em que o céu ainda não está totalmente escuro. É quando os satélites são mais fáceis de ver.",
  "sunlit": "Ainda pegando a luz do Sol, mesmo com o solo abaixo escuro. É isso que torna um satélite visível.",
  "radiant": "O ponto do céu de onde uma chuva de meteoros parece vir.",
  "ZHR": "Mais ou menos quantos meteoros por hora você veria sob um céu perfeitamente escuro com o radiante bem acima de você. Em geral se veem menos.",
  "close approach": "Quando um asteroide passa perto da Terra. Perto, em astronomia, costuma significar mais longe que a Lua.",
  "near-Earth object": "Um asteroide ou cometa cuja órbita o leva para perto da órbita da Terra.",
  "reentry": "Quando algo cai de volta na atmosfera. A maior parte queima na descida.",
  "debris": "Satélites inativos, estágios de foguete gastos e fragmentos. Dezenas de milhares de pedaços são rastreados.",
  "constellation": "Um padrão de estrelas que as pessoas nomearam há muito tempo. As estrelas de uma costumam estar longe umas das outras.",
  "L1": "Um ponto de equilíbrio entre a Terra e o Sol, a cerca de 1,5 milhão de km em direção ao Sol. Bom para observar o Sol.",
  "L2": "Um ponto de equilíbrio a 1,5 milhão de km da Terra, no lado oposto ao Sol, onde um telescópio pode manter a Terra e o Sol atrás dele e continuar frio.",
  "transit": "Quando uma coisa passa na frente de outra, vista de onde você está.",
  "conjunction": "Quando duas coisas aparecem juntas no céu. Elas não estão perto no espaço.",
  "ephemeris": "Uma tabela de onde algo estará, calculada com antecedência.",
  "umbra": "A parte escura do meio de uma sombra, onde a luz é bloqueada por completo. Dentro da umbra da Lua, o Sol some.",
  "penumbra": "A parte externa e mais clara de uma sombra, onde só parte da luz é bloqueada. Uma Lua na penumbra da Terra só escurece um pouco.",
  "totality": "Os minutos de um eclipse total em que o Sol fica totalmente coberto. O céu escurece o bastante para ver estrelas.",
  "annular": "Em forma de anel. Num eclipse anular a Lua está longe demais para cobrir o Sol inteiro, e sobra um anel brilhante em volta dela."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "Ir para uma data (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "Buscar",
    "property": "Buscar por propriedade",
    "countries": "Satélites por país",
    "operators": "Por operador",
    "clouds": "Nuvens de detritos",
    "chartOurs": "Nossos planetas lado a lado"
  },
  "find": {
    "title": "Buscar",
    "label": "Buscar por propriedade, por país e por nuvem de detritos",
    "tabs": {
      "property": "Propriedades",
      "country": "Por país",
      "clouds": "Detritos e frotas"
    },
    "kindsLabel": "O que buscar",
    "kinds": {
      "stars": "Estrelas",
      "exoplanets": "Planetas",
      "satellites": "Satélites",
      "comets": "Cometas"
    },
    "presetsLabel": "Perguntas",
    "refine": "Refinar",
    "presets": {
      "rockyHz50": "Planetas rochosos na zona habitável a até 50 anos-luz",
      "nearStars": "Estrelas a até 20 anos-luz",
      "temperate": "Planetas mais ou menos tão quentes quanto a Terra",
      "hotJupiters": "Gigantes quentes",
      "cometsSoon": "Cometas no ponto mais próximo do Sol até 2030",
      "geo": "Satélites ativos no anel geoestacionário",
      "low": "Satélites ativos abaixo de 400 km"
    },
    "fields": {
      "within": "A até (anos-luz)",
      "fromHere": "Medido a partir da câmera, não do Sol",
      "radius": "Raio (Terras)",
      "mass": "Massa (Terras)",
      "teq": "Temperatura (K)",
      "insol": "Luz da estrela (Terra = 1)",
      "height": "Altitude (km)",
      "year": "Lançado (ano)",
      "perihelion": "Mais perto do Sol (ano)",
      "from": "de",
      "to": "até",
      "zone": "Na zona habitável",
      "zoneWide": "Dentro dela ou na borda",
      "rocky": "Rochoso",
      "working": "Só ativos",
      "owner": "Proprietário",
      "operator": "Operador",
      "any": "Qualquer",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "Nome",
      "dist": "Distância (al)",
      "radius": "Raio (Terras)",
      "teq": "Temp. (K)",
      "insol": "Luz",
      "zone": "Zona",
      "spect": "Tipo",
      "mag": "Magnitude",
      "owner": "Proprietário",
      "height": "Altitude (km)",
      "year": "Lançado",
      "perihelion": "Periélio",
      "qAu": "Mais perto (UA)"
    },
    "zones": {
      "inside": "dentro",
      "edge": "borda",
      "hotter": "quente demais",
      "colder": "frio demais"
    },
    "sortTitle": "Ordenar por {col}",
    "tableLabel": "O que corresponde, uma linha cada: toque numa linha para ir até lá",
    "status": "{n} encontrados",
    "statusSome": "{n} encontrados; os primeiros {shown} estão listados",
    "none": "Nada corresponde. Amplie um intervalo ou desmarque uma caixa.",
    "looking": "Buscando…",
    "loading": "Carregando onde buscar…",
    "failed": "A busca não rodou. Tente de novo daqui a pouco.",
    "rowTitle": "Ir para {name}",
    "noRecord": "Não está desenhado no mapa",
    "modelled": "Calculado com uma massa estelar estimada: modelado",
    "copyLink": "Copiar o link desta pergunta",
    "copied": "Link copiado",
    "honesty": {
      "stars": "As estrelas com nome do HYG v4.4, 3 390 delas, em suas distâncias medidas. Medido.",
      "exoplanets": "Raio, massa, período e estrela: medidos, NASA Exoplanet Archive. Tamanho da órbita, luz recebida, temperatura e zona: calculados; marcados com * onde a massa da estrela é estimada pela sua luz, modelado. Rochoso: 1,6 raio terrestre ou menos, ou 3 massas terrestres sem raio medido (Rogers 2015).",
      "satellites": "Catálogo da CelesTrak, lido em {date}. A altitude é a média dos pontos mais alto e mais baixo da órbita. Medido.",
      "comets": "Datas de periélio da Small-Body Database do JPL. Calculadas a partir de órbitas medidas."
    },
    "chart": {
      "open": "Lado a lado",
      "openTitle": "Os planetas de {host} lado a lado, em escala",
      "title": "{host}, em escala",
      "ours": "O Sistema Solar",
      "label": "Os planetas de {host} desenhados lado a lado em seu tamanho real, em ordem a partir da estrela",
      "note": "Uma escala para todos os planetas; os espaços não são distâncias. Um planeta sem raio medido é desenhado tracejado, no tamanho mediano.",
      "close": "Fechar o gráfico"
    },
    "pill": "{name}: {n} em destaque",
    "pillClear": "Tirar o destaque"
  },
  "owners": {
    "modesLabel": "Agrupar por",
    "modes": {
      "countries": "Países",
      "operators": "Operadores",
      "points": "Pontos de Lagrange",
      "nopath": "Sem trajetória pública"
    },
    "reading": "Lendo o catálogo da CelesTrak (7 MB)…",
    "failed": "O catálogo não carregou.",
    "retry": "Tentar de novo",
    "lead": "{n} proprietários têm algo em órbita: {total} objetos rastreados.",
    "row": "{n} em órbita",
    "rowSub": "{working} ativos · {debris} detritos",
    "rowTitle": "Destacar o que {name} tem em órbita",
    "joint": "{a} e {b}",
    "ussr": "O catálogo conta a União Soviética e a Rússia como um único proprietário.",
    "unknown": "Ainda desconhecido",
    "byName": "pelo nome",
    "byNameTitle": "Contado pelos nomes que seus satélites têm no catálogo",
    "kinds": "{working} ativos, {dead} que não funcionam mais, {rocket} corpos de foguete, {debris} pedaços de detritos.",
    "lit": "{n} deles estão desenhados e destacados no mapa.",
    "litNone": "Nenhum deles está desenhado no mapa.",
    "show": "Destacá-los",
    "clear": "Limpar",
    "page": "Página de {name}",
    "noPathTitle": "Sem trajetória pública: {n}",
    "noPathNone": "Todas as suas cargas úteis em órbita têm trajetória pública.",
    "why": {
      "no-elements": "Sem órbita pública: o catálogo o lista, mas nenhum conjunto de elementos é publicado",
      "deep-space": "Além da órbita da Terra, e sem trajetória para ele aqui",
      "deep-drawn": "Além da órbita da Terra: desenhado pela sua trajetória do JPL"
    },
    "points": {
      "sel1": "Sol–Terra L1",
      "sel2": "Sol–Terra L2",
      "eml2": "Terra–Lua L2",
      "sel1Why": "A 1,5 milhão de km em direção ao Sol: uma vista do Sol que nunca se põe.",
      "sel2Why": "A 1,5 milhão de km longe do Sol: frio e escuro, para telescópios.",
      "eml2Why": "Além do lado oculto da Lua: um retransmissor que vê o lado oculto e a Terra ao mesmo tempo.",
      "empty": "Nada listado aqui agora."
    },
    "nopathLead": "{n} cargas úteis em órbita não têm trajetória pública. As mais novas primeiro:",
    "source": "Catálogo de satélites da CelesTrak, lido em {date}: medido. Bandeiras: Wikimedia Commons, domínio público."
  },
  "breakups": {
    "cloudsTitle": "Nuvens de detritos",
    "fleetsTitle": "Constelações",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "Um satélite meteorológico chinês, destruído por um míssil antissatélite chinês a 865 km em 11 de janeiro de 2007: a maior nuvem já criada.",
      "cosmos1408": "Um satélite soviético inativo, destruído por um míssil antissatélite russo a cerca de 480 km em 15 de novembro de 2021.",
      "iridium33": "Um satélite de telefonia ativo, atingido pelo Cosmos 2251 inativo a 789 km sobre a Sibéria em 10 de fevereiro de 2009: a primeira colisão entre dois satélites inteiros.",
      "cosmos2251": "Um satélite russo inativo que atingiu o Iridium 33 a 789 km em 10 de fevereiro de 2009."
    },
    "counts": "{up} dos {catalogued} pedaços catalogados ainda estão em órbita.",
    "lit": "{n} destacados no mapa.",
    "spreadTitle": "Ver a nuvem se espalhar",
    "steps": {
      "event": "No momento do evento",
      "week": "Uma semana depois",
      "year": "Um ano depois",
      "today": "Hoje"
    },
    "play": "Reproduzir a partir do evento",
    "stop": "Parar",
    "places": "Voltar às posições de hoje",
    "spreadNote": "Modelado: cada pedaço parte de um mesmo ponto, na órbita que tem hoje, e deriva à medida que o achatamento da Terra gira seu plano. Pedaços que já caíram não são desenhados.",
    "source": "Fonte:",
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
    "fleetLit": "{n} destacados no mapa.",
    "fleetNote": "Reconhecidos pelos nomes que seus operadores lhes dão no catálogo.",
    "loadingActive": "Carregando antes todos os satélites ativos (7 MB)…",
    "loadingDebris": "Carregando antes todos os detritos rastreados (7 MB)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "Ir ao minuto em que o Fengyun-1C foi destruído e destacar a sua nuvem"
  },
  "dateJump": {
    "title": "Ir para uma data",
    "field": "Data e hora (UTC)",
    "text": "Ou digite",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "Ir",
    "hint": "Qualquer momento de 1700 a 2200, em UTC.",
    "errors": {
      "unknown": "Não entendo essa data. Tente 1969-07-20 20:17, 20 July 1969 ou next total eclipse.",
      "range": "Fora de 1700 a 2200.",
      "empty": "Digite uma data primeiro.",
      "eclipse": "Nenhum eclipse assim entre 1700 e 2200."
    },
    "searching": "Buscando…",
    "gone": "Agora {when}.",
    "eclipse": "{what}, {when}.",
    "eclipses": {
      "sunTotal": "Eclipse total do Sol",
      "sunAnnular": "Eclipse anular do Sol",
      "sunPartial": "Eclipse parcial do Sol",
      "moonTotal": "Eclipse total da Lua",
      "moonPartial": "Eclipse parcial da Lua",
      "moonPenumbral": "Eclipse penumbral da Lua"
    },
    "rangesTitle": "Com que precisão, e quando",
    "ranges": {
      "worlds": "Sol, Lua e planetas: de 1700 a 2200, calculados (astronomy-engine).",
      "satellites": "Satélites: precisos a uma semana de hoje; esmaecidos depois de um mês.",
      "craft": "Sondas espaciais: só dentro das próprias trajetórias do JPL.",
      "stars": "Estrelas: na vista do céu, deslocadas pelos movimentos medidos quando a data está a mais de 50 anos de hoje."
    },
    "quick": {
      "total": "Próximo eclipse total do Sol",
      "lunar": "Próximo eclipse da Lua"
    },
    "missionsTitle": "Das nossas missões",
    "momentsTitle": "Momentos",
    "presetsLabel": "Datas para visitar",
    "faded": "Satélites esmaecidos: as órbitas deles são medidas para hoje, não para {year}.",
    "close": "Fechar"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "Da Wikipédia",
    "quotedLive": "Citado da Wikipédia como está hoje, não conferido por nós.",
    "quotedBaked": "Citado da Wikipédia como estava em {date}, não conferido por nós.",
    "textCredit": "Texto: colaboradores da Wikipédia, CC BY-SA 4.0.",
    "readArticle": "Ler o artigo inteiro",
    "inEnglish": "Ainda não há artigo neste idioma, então este é o em inglês.",
    "family": "Sobre {fleet} como um todo: não há artigo para este satélite em particular.",
    "photo": "Foto: {artist}, {licence}, via Wikimedia Commons.",
    "photoNoArtist": "Foto: {licence}, via Wikimedia Commons.",
    "photoAlt": "A imagem do topo do artigo da Wikipédia {title}",
    "loading": "Consultando a Wikipédia…",
    "read": "Ler em voz alta",
    "readTitle": "Leia esta ficha em voz alta com a voz do próprio aparelho",
    "stop": "Parar a leitura",
    "reading": "Lendo em voz alta"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "Tempo profundo",
    "back": "−{n} anos",
    "on": "+{n} anos",
    "backTitle": "Voltar {n} anos, mantendo a data e a hora",
    "onTitle": "Avançar {n} anos, mantendo a data e a hora",
    "presetsLabel": "Outras estrelas polares",
    "presets": {
      "thuban": "Thuban, 2800 a.C.",
      "vega": "Vega, 13 700 d.C.",
      "far": "50 000 d.C."
    },
    "presetTitles": {
      "thuban": "Quando as pirâmides foram construídas, Thuban, no Dragão, era a estrela polar",
      "vega": "Por volta de 13 700 d.C. o polo passa a 6,5° de Vega",
      "far": "O céu daqui a cinquenta mil anos"
    },
    "yearAd": "{n} d.C.",
    "yearBc": "{n} a.C.",
    "moved": "O céu de {year}: cada estrela deslocada pelo próprio movimento medido.",
    "far": "Tão longe de hoje não se desenham a Lua nem os planetas, e o Sol fica onde o calendário o põe.",
    "pole": "Estrela polar: {name}, a {deg}° do polo.",
    "noPole": "Nenhuma estrela brilhante marca o polo: a mais próxima, {name}, está a {deg}°.",
    "unnamed": "uma estrela de magnitude {mag}",
    "honest": "Os movimentos são medidos (Hipparcos e Gaia, via HYG); levá-los em linha reta por milênios é um modelo. O giro do eixo da Terra: Vondrák, Capitaine e Wallace 2011."
  },
  "variables": {
    "label": "Como sua luz muda",
    "types": {
      "eclipse": "Um par eclipsante: duas estrelas que passam uma na frente da outra.",
      "binary": "Um par próximo, deformado, cuja luz nunca fica parada.",
      "pulse": "Uma estrela pulsante: ela incha e encolhe.",
      "sine": "Uma estrela pequena de pulsação rápida.",
      "sr": "Uma gigante semirregular: seu período e sua amplitude são medidos, mas não em que ponto do ciclo ela está, então a curva é um esboço.",
      "irregular": "Uma variável irregular: nenhum relógio diz seu brilho, então o céu mantém o do catálogo."
    },
    "periodDays": "Período {n} dias.",
    "periodYears": "Período {n} anos.",
    "aria": "Curva de luz de {name}, da magnitude {bright} a {faint}; agora {now}.",
    "now": "agora",
    "nowLine": "Agora magnitude {mag} ({band}); varia de {bright} a {faint}.",
    "range": "Varia da magnitude {bright} a {faint} ({band}).",
    "far": "Sua curva não é levada a mais de {years} anos de hoje; varia da magnitude {bright} a {faint} ({band}).",
    "nextMin": "Próximo mínimo: {when}",
    "measured": "Medido: as magnitudes datadas do Grande Escurecimento. Elementos: {cite}.",
    "modelled": "Modelado: a forma é desenhada a partir do período, da época e da amplitude do catálogo ({cite}).",
    "notes": {
      "alf-ori": "Em 2019 e 2020 caiu para magnitude 1,6, o Grande Escurecimento: uma nuvem de poeira que ela expeliu escondeu parte dela.",
      "omi-cet": "Os máximos de Mira chegam semanas antes ou depois de um ciclo para o outro; estas datas podem errar o mesmo tanto.",
      "bet-lyr": "Seu período cresce 19 segundos por ano; a curva segue a efeméride quadrática de Harmanec e Scholz (1993).",
      "bet-per": "Os eclipses de Algol acertam no minuto: ela enfraquece cerca de dez horas a cada 2,87 dias.",
      "eps-aur": "Eclipsada por quase dois anos a cada 27, por um disco escuro em volta da companheira; o último eclipse foi de 2009 a 2011.",
      "eta-car": "Na Grande Erupção da década de 1840 tornou-se a segunda estrela mais brilhante do céu.",
      "t-crb": "Uma nova recorrente: chegou à magnitude 2 em 1866 e em 1946."
    }
  },
  "blackHoleSpin": {
    "spin": "Desenhado girando, com spin a = {a}: a sombra tem a forma que um buraco que gira projeta (Bardeen 1973), empurrada para longe do lado que vem em nossa direção. {why} A luz ao redor ainda é traçada sem spin, então a forma é um modelo.",
    "spinWhy": {
      "m87-star": "O spin é escolhido: os modelos que melhor se ajustam do artigo V do EHT 2019 giram a 0,94.",
      "sgr-a-star": "O spin é escolhido: o artigo V do EHT 2022 favorece de 0,5 a 0,94."
    }
  }
});
// b200-f3-stars: end
// b200-c1-culture: begin -- a sky figure's story and the other cultures' pictures (copy/en.later.js skyLore, forge #143), machine-drafted
Object.assign(COPY, {
  "skyLore": {
    "figure": "uma figura do céu {culture}",
    "figureLabel": "{name}, uma figura do céu {culture}. Toque para ler sua história.",
    "openTitle": "Toque para ler sua história",
    "sub": "O céu {culture}",
    "close": "Fechar a história",
    "loading": "Carregando a história…",
    "failed": "A história não carregou. Tente de novo daqui a pouco.",
    "fromStellarium": "Da descrição desta cultura do céu no Stellarium. {credit}.",
    "ours": "Com nossas próprias palavras, segundo: {cite}.",
    "honesty": "Ilustrativo: um relato, como sua fonte o registra. Nomes e histórias mudam entre povos e narradores.",
    "none": "Nenhuma das fontes que podemos compartilhar registra uma história desta figura. São tradições vivas, então dizemos isso em vez de adivinhar.",
    "inEnglish": "A história está em inglês, a língua de sua fonte: não existe tradução licenciada.",
    "artTitles": {
      "maori": "As figuras maori em desenhos, da cultura do céu maori do Stellarium, CC BY-SA 4.0",
      "hawaiian": "As linhas de estrelas havaianas em desenhos de Kealoha Kaneakua, para o Stellarium, CC BY-SA 4.0",
      "boorong": "As figuras boorong em desenhos, da cultura do céu boorong do Stellarium, CC BY-SA 4.0"
    },
    "artNone": "Não há desenhos deste céu sob uma licença que possamos compartilhar: suas figuras ficam em linhas."
  }
});
// b200-c1-culture: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "Trajetória",
    "flightTitle": "Planeje um trajeto de câmera entre vistas, veja antes e compartilhe como link",
    "record": "Gravar",
    "recordTitle": "Grave esta vista, uma trajetória ou uma viagem como vídeo",
    "dome": "Cúpula e 360",
    "domeTitle": "Mostre o céu como uma cúpula de planetário ou uma imagem de 360 graus",
    "failed": "Isso não carregou. Tente de novo daqui a pouco."
  },
  "flight": {
    "title": "Trajetória",
    "sheet": "Trajetória: arraste para redimensionar",
    "close": "Fechar a trajetória",
    "play": "Reproduzir",
    "playTitle": "Voar a trajetória a partir de onde está o controle",
    "stop": "Parar",
    "stopTitle": "Parar o voo onde está",
    "scrub": "Ponto da trajetória",
    "scrubAt": "{at} de {total}",
    "hint": "Leve o mapa a uma vista de que você goste e toque em Adicionar esta vista. Duas vistas fazem uma trajetória.",
    "hintOne": "Uma vista. Vá para outro lugar e adicione outra.",
    "hintMany": "{n} vistas. Toque em Reproduzir ou arraste o controle para olhar ao longo da trajetória.",
    "add": "Adicionar esta vista",
    "addTitle": "Guardar onde a câmera está, o que ela olha e o relógio",
    "keysLabel": "As vistas da trajetória, em ordem",
    "keyName": "{n}. {name}",
    "goTitle": "Ir para esta vista",
    "keyLive": "o relógio como ele corre",
    "point": "Um ponto no espaço",
    "duration": "Voo",
    "seconds": "{n} s",
    "ease": "Curva",
    "eases": {
      "smooth": "Partida e parada suaves",
      "cruise": "Cruzeiro",
      "constant": "Velocidade constante"
    },
    "rate": "Relógio",
    "rateLive": "Tempo real",
    "up": "↑",
    "upLabel": "Adiantar a vista {n}",
    "down": "↓",
    "downLabel": "Atrasar a vista {n}",
    "replace": "Usar esta vista",
    "replaceLabel": "Trocar a vista {n} pela vista atual",
    "remove": "Remover",
    "removeLabel": "Remover a vista {n}",
    "copyLink": "Copiar link",
    "copyLinkTitle": "A trajetória inteira em um link: nada é guardado em lugar nenhum",
    "linkCopied": "Link copiado ({n} caracteres). Quem abrir verá este voo.",
    "linkInBar": "O link está na barra de endereço: copie de lá.",
    "draft": "Salvar rascunho de viagem",
    "draftTitle": "Um rascunho de arquivo de viagem para as viagens do mapa, para uma pessoa terminar",
    "draftSaved": "Rascunho salvo. As fichas são suas para escrever.",
    "record": "Gravar este voo",
    "recordTitle": "Gravar o voo como vídeo",
    "clear": "Limpar",
    "clearTitle": "Remover todas as vistas",
    "needTwo": "Uma trajetória precisa de pelo menos duas vistas.",
    "full": "Uma trajetória comporta no máximo {n} vistas.",
    "noView": "Esta vista não pode ser guardada: olhe para algo primeiro.",
    "badLink": "Não foi possível ler este link de voo.",
    "honesty": "Cada vista mostra as coisas onde estão na hora do seu relógio. Os voos entre as vistas são movimentos de câmera que desenhamos, não a rota de uma nave."
  },
  "record": {
    "title": "Gravar",
    "sheet": "Gravar: arraste para redimensionar",
    "close": "Fechar Gravar",
    "whatLabel": "O que gravar",
    "sourceView": "Esta vista",
    "sourcePath": "A trajetória",
    "sourceTrip": "A viagem, até o fim",
    "length": "Duração",
    "seconds": "{n} segundos",
    "shapeLabel": "Formato",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "Quadrado",
      "tall": "Vertical 9:16 (Reels, TikTok, Shorts)"
    },
    "smooth": "Quadro a quadro (suave em qualquer aparelho)",
    "smoothNote": "A página recarrega esta vista num relógio próprio e desenha cada quadro antes de capturá-lo: um aparelho lento grava devagar, mas nunca aos trancos.",
    "silent": "Quadro a quadro não grava som.",
    "withSound": "O som que você ouve também é gravado.",
    "noSound": "O som está desligado, então o vídeo fica mudo. Ligue o som antes para manter a voz e a música da viagem.",
    "start": "Começar a gravar",
    "stop": "Parar",
    "save": "Salvar o vídeo",
    "share": "Compartilhar o vídeo",
    "saved": "Vídeo salvo.",
    "cannot": "Este navegador não grava vídeo. Versões recentes do Chrome, Edge, Safari e Firefox gravam.",
    "rolling": "Gravando: {at} s",
    "made": "Pronto: {mb} MB. Salve ou compartilhe.",
    "empty": "O navegador não gravou nada. Tente de novo ou marque Quadro a quadro.",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · mapas e dados: NASA, ESA, Solar System Scope e outros",
    "endTitle": "Veja você mesmo",
    "endLine": "Space Radar: grátis, no seu navegador.",
    "endCredit": "Mapas e dados: NASA, ESA, USGS, Solar System Scope, HYG e outros, sob suas próprias licenças (CC BY, CC BY-SA). Créditos em spaceradar.ai.",
    "filmTitle": "Gravando quadro a quadro",
    "filmWarming": "Preparando a vista…",
    "filmFrame": "Quadro {n} de {total}",
    "filmDone": "Pronto: {mb} MB, {s} segundos. O arquivo foi salvo.",
    "filmFailed": "A gravação parou: {why}",
    "back": "Voltar ao mapa"
  },
  "dome": {
    "title": "Cúpula e 360",
    "sheet": "Cúpula e 360: arraste para redimensionar",
    "close": "Fechar Cúpula e 360",
    "kindLabel": "Como o céu é desenhado",
    "normal": "Normal",
    "dome": "Cúpula, 180 graus (planetário)",
    "wide": "360 graus (YouTube 360)",
    "tilt": "Inclinação da cúpula",
    "tiltDeg": "{n}°",
    "size": "Tamanho",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "Salvar este quadro",
    "skySize": "Face do skybox",
    "saveSky": "Salvar um skybox",
    "saved": "Salvo: {w} × {h} px.",
    "saveFailed": "Não foi possível desenhar a imagem.",
    "intro": "Uma imagem de cúpula ou de 360 graus do que a câmera vê, ao vivo. Os nomes ficam ocultos enquanto ela está ativa.",
    "live": "Ao vivo, {n} px por face.",
    "livePhone": "Ao vivo a {n} px por face: num celular é uma prévia. Salve um quadro para ter um nítido.",
    "noGpu": "Os gráficos deste aparelho não conseguem desenhar isso.",
    "busy": "Feche antes o mundo imaginado ou o Momento: ele desenha sua própria imagem.",
    "off": "De volta à imagem normal.",
    "credit": "Livre para usar com este crédito: Space Radar, spaceradar.ai. Mapas e dados: NASA, ESA, USGS, Solar System Scope, HYG e outros; o painel Fontes lista a licença de cada um.",
    "how": "Para uma cúpula, coloque #proj=dome,30 depois do link de uma viagem e abra em tela cheia. docs/PLANETARIUMS.md tem os passos."
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "Desafio do dia",
    "close": "Fechar",
    "day": "O desafio de {day} (UTC), o mesmo para todos hoje.",
    "games": {
      "find-earth": {
        "title": "Encontre a Terra",
        "blurb": "Das galáxias até o nosso planeta, com o menor número de escolhas possível."
      },
      "which-world": {
        "title": "Que mundo é este?",
        "blurb": "Um close de um mapa real: escolha o mundo entre quatro."
      },
      "guess-distance": {
        "title": "Adivinhe a distância",
        "blurb": "Deslize até quantos anos-luz de distância ele está."
      }
    },
    "other": "Outros desafios",
    "loading": "O mapa ainda está carregando; o desafio começa quando ele estiver pronto.",
    "rung": "Passo {n} de {of}: {where}",
    "rungs": {
      "local-group": "o Grupo Local",
      "galaxy": "a Via Láctea",
      "stellar": "a vizinhança do Sol",
      "sun": "o Sistema Solar"
    },
    "ask": {
      "local-group": "Qual marca é a nossa galáxia, a Via Láctea?",
      "galaxy": "Qual marca é o Sol?",
      "stellar": "Qual marca é o Sol?",
      "sun": "Qual marca é a Terra?"
    },
    "hints": {
      "local-group": "A nossa tem duas pequenas companheiras bem ao lado, as Nuvens de Magalhães.",
      "galaxy": "O Sol fica a uns 27 000 anos-luz do buraco negro do centro, num braço tranquilo.",
      "stellar": "As estrelas mais próximas do Sol são anãs vermelhas fracas e Alfa Centauri, a 4,4 anos-luz.",
      "sun": "A Terra é o terceiro mundo a partir do Sol."
    },
    "hint": "Dica (custa uma tentativa)",
    "mark": "Marca {letter}, {where}",
    "places": {
      "tl": "em cima à esquerda",
      "tc": "em cima",
      "tr": "em cima à direita",
      "ml": "à esquerda",
      "mc": "no meio",
      "mr": "à direita",
      "bl": "embaixo à esquerda",
      "bc": "embaixo",
      "br": "embaixo à direita"
    },
    "milkyWay": "a Via Láctea",
    "sunName": "o Sol",
    "tries": "Escolha {n} de {max}",
    "wrong": "Não é essa: {letter} é {name}.",
    "right": "Sim: {name}. Aproximando.",
    "found": "Você encontrou a Terra em {n} escolhas.",
    "lost": "Acabaram as escolhas. A Terra era o terceiro mundo a partir do Sol.",
    "honest": "As marcas ficam onde o mapa desenha cada objeto. No passo do Sistema Solar os mundos são desenhados mais perto do que estão, como em todo esse cenário.",
    "round": "Rodada {n} de {of}",
    "worldAsk": "De que mundo é este close?",
    "more": "Mostrar mais do mapa",
    "worldRight": "Sim: {name}.",
    "worldWrong": "Não: era {name}.",
    "credit": "Mapa: {credit}",
    "worldPicture": "Um close de um mapa real de um mundo do Sistema Solar",
    "distAsk": "A que distância está {name}?",
    "slider": "Distância em anos-luz",
    "guess": "Chutar",
    "reveal": "{name} está a {value}: você errou {off}.",
    "offs": {
      "hit": "por menos de um quarto",
      "near": "por menos do dobro",
      "far": "por menos de cinco vezes",
      "miss": "por mais de cinco vezes"
    },
    "source": "Distância: {source}",
    "units": {
      "ly": "{n} anos-luz",
      "kly": "{n} mil anos-luz",
      "mly": "{n} milhões de anos-luz",
      "bly": "{n} bilhões de anos-luz"
    },
    "next": "Próximo",
    "scores": {
      "find-earth": "{n} de 10 escolhas",
      "which-world": "{n} de 3 mundos",
      "guess-distance": "{n} de 3 por menos do dobro"
    },
    "shareTitle": "Space Radar: {game}",
    "share": "Compartilhar o resultado",
    "copied": "Copiado. Cole onde quiser.",
    "copyFailed": "Não deu para copiar: selecione o texto acima.",
    "played": "Pronto por hoje. Um novo chega à meia-noite UTC.",
    "streak": "{n} dias seguidos"
  }
});
// b200-f6-learn: end
// b200-f8-xr: begin -- the gamepad and the headset (copy/en.xr.js, forge #164, #158), machine-drafted
Object.assign(COPY, {
  "pad": {
    "title": "Controle",
    "label": "Comandos do controle",
    "close": "Fechar os comandos do controle",
    "capStickL": "Analógico esquerdo",
    "capStickR": "Analógico direito",
    "capTriggers": "RT · LT",
    "capA": "A · Xis",
    "capX": "X · Quadrado",
    "capB": "B · Círculo",
    "capY": "Y · Triângulo",
    "capDpad": "Direcional ↑ ↓",
    "capView": "Exibir · Share",
    "turn": "Girar em volta",
    "fly": "Aproximar e afastar, deslizar para o lado",
    "speed": "Mais rápido, mais devagar",
    "choose": "Escolher o que está no anel",
    "go": "Ir até lá",
    "back": "Voltar",
    "ship": "Física de nave ligada ou desligada",
    "ladder": "Subir e descer a escada de distâncias",
    "controls": "Estes comandos (Menu também)",
    "shipToggle": "Física de nave",
    "shipHow": "Você continua à deriva ao soltar. Pressione um analógico para parar.",
    "notStandard": "Este controle não informa onde ficam seus botões: o analógico esquerdo gira a vista, os botões não são usados.",
    "connected": "Controle conectado. Pressione Y para ver os comandos.",
    "disconnected": "Controle desconectado.",
    "shipOn": "Física de nave ligada: você continua à deriva ao soltar.",
    "shipOff": "Física de nave desligada.",
    "nothing": "Nada no anel para escolher.",
    "chooseFirst": "Escolha algo primeiro: A pega o que está no anel.",
    "rung": "{label}, {distance}",
    "home": "A Terra",
    "trip": "Uma viagem está com a câmera. Os botões dela estão na tela."
  },
  "headset": {
    "enter": "Entrar no headset",
    "enterTitle": "Ficar sob o céu ou percorrer a escada de distâncias em um headset de realidade virtual",
    "noteTitle": "Antes de colocar",
    "comfort": "Os movimentos são saltos, não deslizes, e os giros são passos de 30 graus, então o horizonte fica reto. Sente-se ou libere o espaço ao seu redor.",
    "seizure": "Um pequeno número de pessoas tem convulsões causadas por luzes ou padrões piscantes. Se sentir tontura ou enjoo, ou vir algo estranho, pare e tire o headset.",
    "how": "Olhe para algo e pressione A ou o gatilho direito para escolher. X vai até lá, B volta, Y mostra os comandos, como no controle. Dentro de um Momento, A toca e pausa e B volta ao mapa. Segure B por um segundo para sair.",
    "untried": "Novo, e ainda não testado em um headset de verdade: conte-nos o que você vê.",
    "go": "Entrar",
    "cancel": "Agora não",
    "busy": "Feche primeiro o mundo imaginado, Cúpula e 360 ou a gravação: cada um desenha sua própria imagem.",
    "failed": "O headset não iniciou.",
    "left": "De volta à tela.",
    "panelHelp": "A escolhe   X vai   B volta   Y comandos",
    "panelMove": "Analógico esquerdo: em volta, e pela escada   Analógico direito: girar, aproximar e afastar",
    "panelLeave": "Segure B para sair",
    "chosen": "Escolhido: {name}",
    "nothing": "Nada bem à frente",
    "momentHelp": "A toca ou pausa   B volta ao mapa   Y comandos",
    "frame": "Quadro {ms} ms, {fps} por segundo (meta: 72)",
    "lighter": "Os quadros demoravam demais: desenhando menos."
  }
});
// b200-f8-xr: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "Gravações reais daqui",
    "play": "Ouvir {name}",
    "stop": "Parar",
    "hide": "Ocultar as gravações daqui",
    "sonified": "Dados reais transformados em som",
    "microphone": "Som real, de um microfone",
    "playing": "Tocando: {name}. {how}.",
    "failed": "Essa gravação não carregou.",
    "names": {
      "real-voyager-plasma": "a Voyager 1 no espaço interestelar",
      "real-juno-ganymede": "a Juno passando por Ganimedes",
      "real-cassini-saturn": "o rádio de Saturno",
      "real-insight-impact": "um meteoroide atingindo Marte",
      "real-insight-wind": "o vento em Marte",
      "real-perseverance-dust-devil": "um redemoinho de poeira em Marte"
    }
  }
});
// b200-f9-reach: end
// b200-f7-ground: begin -- standing on another world and its sky (copy/en.ground.js, forge #146, #147), machine-drafted
Object.assign(COPY, {
  "ground": {
    "stageLabel": "De pé em outro mundo",
    "tagGround": "No solo · {world}",
    "tagSky": "O céu · {world}",
    "kindMeasured": "solo medido",
    "kindPlain": "solo não medido",
    "kindModelled": "modelado",
    "placeAt": "{world}, {lat}°, {lon}° L",
    "worlds": {
      "moon": "Lua",
      "mars": "Marte",
      "titan": "Titã",
      "europa": "Europa",
      "earth": "Terra",
      "proxima-b": "Proxima Centauri b",
      "trappist-1e": "TRAPPIST-1 e"
    },
    "measuredGround": "Medido: as alturas são o modelo estereoscópico do terreno em escala real, e o solo é a própria imagem do orbitador (as sombras são as do dia em que foi tirada). Nenhuma rocha ou cratera é inventada.",
    "plainGround": "O solo aqui não é desenhado a partir de medições: uma planície até o horizonte. O céu é calculado.",
    "modelLine": "Nas coordenadas do pouso: {what}. A direção para onde está virado não vem de uma imagem.",
    "timeLine": "{local} hora solar local · {utc} · Sol a {sun}°",
    "timeLineStar": "{utc} · {star} a {sun}° de altura, onde está sempre",
    "drive": "Dirigir o rover",
    "walk": "Caminhar",
    "driving": "Dirigindo, cerca de {x} vezes mais rápido do que o rover consegue ir.",
    "walking": "Caminhando.",
    "skyOpen": "O céu",
    "skyClose": "Ocultar o céu",
    "leave": "Sair",
    "sources": "Fontes e licenças",
    "padLabel": "Caminhar: empurre o polegar na direção desejada",
    "keys": "W A S D ou as setas para caminhar, Q e E para girar, R e F para olhar para cima e para baixo, Shift para correr, + e - para aproximar e afastar, Esc para sair.",
    "padDrive": "Dirigir: empurre o botão para cima para avançar, para baixo para recuar, para o lado para virar",
    "keysDrive": "W ou a seta para cima para avançar, S ou para baixo para recuar, A e D ou as setas laterais para virar, R e F para olhar para cima e para baixo, Shift para ir mais rápido, Esc para sair.",
    "howtoKeys": "Você está dirigindo. W ou ↑ para avançar, S ou ↓ para recuar, A e D ou ← e → para virar. Arraste para olhar em volta.",
    "howtoTouch": "Você está dirigindo. Empurre o círculo para cima para avançar, para baixo para recuar, para o lado para virar. Arraste o céu para olhar em volta.",
    "driveHint": "Este rover pode ser dirigido: toque em “Dirigir o rover”.",
    "tripDriveTitle": "Sair da viagem aqui e dirigir este rover",
    "skyTitle": "Este céu",
    "poleStar": "Estrela polar: {name}, a {sep}° do polo (magnitude {mag}).",
    "noPoleStar": "Nenhuma estrela mais brilhante que a magnitude 4,5 a menos de 10° do polo deste mundo.",
    "unnamedStar": "uma estrela sem nome comum",
    "poleLabel": "{name} (estrela polar)",
    "rises": "{name} nasce às {local}, hora solar local ({utc}).",
    "sets": "{name} se põe às {local}, hora solar local ({utc}).",
    "neverSets": "{name} não nasce nem se põe daqui: fica sempre na mesma parte do céu.",
    "notToday": "{name} não nasce nem se põe no período pesquisado.",
    "transit": "{front} passa diante do disco do Sol às {local}, hora solar local ({utc}), durante {s} segundos.",
    "noTransit": "Nenhuma passagem de Fobos ou Deimos diante do Sol vista daqui nos próximos {days} sóis.",
    "working": "Calculando o nascer e o pôr…",
    "earthNow": "A Terra: {alt}° de altura, direção {az}°, {lit}% iluminada, magnitude {mag}.",
    "airNotes": {
      "mars": "Cores medidas: o céu diurno vem do panorama em cores reais do Spirit (PIA07882), e o pôr do sol azul, do Curiosity em Gale (PIA19400).",
      "moon": "Sem ar, o céu é negro ao meio-dia. Um olho de verdade, ofuscado pelo solo iluminado pelo Sol, veria poucas destas estrelas.",
      "europa": "Sem ar, o céu é negro ao meio-dia. Júpiter fica parado no céu do lado voltado para ele.",
      "titan": "Cor ilustrativa: a névoa laranja esconde do olho as estrelas e Saturno; eles são desenhados fracos onde estão.",
      "earth": "",
      "proxima-b": "Modelado: supõe-se que Proxima b mantém sempre a mesma face voltada para a sua estrela, como esperam os seus descobridores (Anglada-Escudé et al. 2016); a inclinação da sua órbita e a posição de Proxima b e de Proxima d nas suas órbitas não são conhecidas, por isso são supostas. A cor do céu é ilustrativa: ninguém sabe se o planeta tem ar. Alfa Centauri A e B estão nas suas posições reais; as outras estrelas são desenhadas como o Sol as vê.",
      "trappist-1e": "Modelado: supõe-se que TRAPPIST-1 e mantém sempre a mesma face voltada para a sua estrela (Gillon et al. 2017); os seus planetas irmãos estão onde os seus tempos de trânsito medidos os colocam, em órbitas circulares num mesmo plano, girado de um modo suposto em torno da nossa linha de visada. A cor do céu é ilustrativa: ninguém sabe se o planeta tem ar. As outras estrelas são desenhadas como o Sol as vê."
    },
    "parentNote": "Esta lua mantém sempre a mesma face voltada para o seu planeta, por isso o planeta não nasce nem se põe.",
    "starNote": "Supõe-se que este planeta mantém sempre a mesma face voltada para a sua estrela, por isso a estrela não nasce nem se põe.",
    "discNote": "O Sol, a Terra, Fobos e os outros corpos extensos são discos do seu tamanho e fase reais em cores lisas, não seus mapas nem suas formas.",
    "frameNote": "Rotação: o relatório IAU WGCCRE 2015 (Archinal et al. 2018). Posições: as efemérides do próprio aplicativo.",
    "compass": {
      "N": "N",
      "E": "L",
      "S": "S",
      "W": "O"
    },
    "bodies": {
      "sun": "O Sol",
      "mercury": "Mercúrio",
      "venus": "Vênus",
      "earth": "A Terra",
      "moon": "A Lua",
      "mars": "Marte",
      "phobos": "Fobos",
      "deimos": "Deimos",
      "jupiter": "Júpiter",
      "io": "Io",
      "europa": "Europa",
      "ganymede": "Ganimedes",
      "callisto": "Calisto",
      "saturn": "Saturno",
      "titan": "Titã",
      "uranus": "Urano",
      "neptune": "Netuno",
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
    "earthAndMoon": "A Terra e a Lua",
    "nightOpened": "É noite neste local agora, por isso o relógio foi posto às {local} de hora solar local, com o Sol a {sun}° de altura. O relógio leva-o de volta ao agora.",
    "unknownGround": "Ainda não há modelo de terreno para esse local.",
    "unknownSky": "Este mapa ainda não permite ficar de pé nesse lugar: só na Lua, em Marte, em Titã, em Europa, em Proxima b ou em TRAPPIST-1 e."
  }
});
// b200-f7-ground: end
// b200-c3-learn: begin -- the Fengyun-1C Moment (copy/en.moments.fengyun.js and its shelf card, forge #153), machine-drafted
COPY.momentShelf.cards['fengyun-1c'] = {
  "title": "2007: Fengyun-1C",
  "when": "11 de janeiro de 2007 até hoje",
  "blurb": "Um míssil chinês destrói um velho satélite meteorológico a 865 km de altura, e seus 3 531 fragmentos catalogados se espalham de um ponto até formar uma casca em volta da Terra, narrado por uma voz."
};
COPY.momentStories['fengyun-1c'] = {
  "title": "2007: Fengyun-1C",
  "blurb": "Um míssil chinês destrói um velho satélite meteorológico a 865 km de altura, e seus fragmentos se espalham de um ponto até formar uma casca em volta da Terra que continua lá.",
  "chBefore": "Fengyun-1C",
  "chHit": "O teste",
  "chRing": "Um anel",
  "chMonths": "Dois meses",
  "chYear": "O primeiro ano",
  "chShell": "Uma casca",
  "chToday": "Hoje",
  "v1a": "A noite de 11 de janeiro de 2007. O Fengyun-1C, um satélite meteorológico chinês aposentado de 960 kg, circula a Terra passando sobre os polos, a 845 a 865 km de altura.",
  "v1b": "Um míssil lançado perto de Xichang está subindo ao seu encontro. A trajetória dele nunca foi publicada, por isso não está desenhada.",
  "v2a": "22:26 UTC: o interceptador atinge o satélite de frente, a cerca de 8 km/s de aproximação, e o parte em milhares de pedaços.",
  "v2b": "Cada pedaço segue um pouco mais rápido ou mais devagar que os outros, então cada um fica numa órbita própria.",
  "v3a": "Uma órbita mais alta leva mais tempo para dar a volta. Volta após volta, os pedaços se estendem ao longo da órbita antiga e, em poucos dias, se fecham num anel.",
  "v4a": "O achatamento da Terra gira o plano de cada órbita, um pouco mais rápido ou mais devagar para cada altura e inclinação, e o anel começa a se abrir em leque.",
  "v4b": "Dois meses depois do teste, mais de 1 200 pedaços tinham sido catalogados e quase 400 outros estavam sendo rastreados, informou o Orbital Debris Quarterly News da NASA.",
  "v5a": "No fim de 2007 o catálogo tinha 2 317 pedaços, e só 22 tinham caído. A NASA estimou pelo menos 150 000 pedaços de um centímetro ou mais, pequenos demais para rastrear.",
  "v6a": "Ano após ano, os planos se espalham por toda a volta. Em janeiro de 2013 a nuvem é uma casca em volta da Terra: 3 378 pedaços catalogados, 3 076 ainda em órbita.",
  "v6b": "Os satélites precisam desviar deles. A Estação Espacial Internacional saiu do caminho de um em janeiro de 2012.",
  "v7a": "Hoje o catálogo tem 3 531 pedaços do Fengyun-1C, e 2 310 ainda estão lá em cima, quase vinte anos depois. Em 10 de novembro de 2021 a estação desviou de novo de um deles.",
  "v7b": "As contagens são medidas. A imagem é um modelo: os sobreviventes de hoje nas órbitas de hoje, espalhados de volta até o momento do teste.",
  "pathSat": "a órbita do Fengyun-1C, de 845 por 865 km a 98,6 graus (NASA ODQN, abril de 2007), como uma cônica; onde nela o satélite foi atingido é ilustrativo",
  "cloudNote": "Os pedaços são os 2 310 que o catálogo ainda tem, nas órbitas que ele dá hoje, espalhados a partir de um ponto por um modelo (movimento de dois corpos e a deriva causada pelo achatamento da Terra); pedaços que caíram não são desenhados, e as contagens nas legendas são medidas. No impacto, cada pedaço parte do seu ponto mais baixo de hoje, então a nuvem começa como uma linha abaixo do satélite, não como um ponto: o arrasto do ar baixou muitas órbitas desde 2007.",
  "drawnNote": "Ilustrativo: o Fengyun-1C é uma marca com anel e cada pedaço um ponto do mesmo tamanho, nada em escala; o impacto em si não é desenhado.",
  "footMore": "Mais",
  "footLess": "Menos",
  "srcOdqn07": "NASA Orbital Debris Quarterly News 11(2), abril de 2007: o satélite, sua órbita, as primeiras contagens",
  "srcOdqn08": "NASA Orbital Debris Quarterly News 12(1), janeiro de 2008: a contagem no fim de 2007",
  "srcOdqn13": "NASA Orbital Debris Quarterly News 17(1), janeiro de 2013: catalogados, caídos e ainda em órbita",
  "srcOdqn14": "NASA Orbital Debris Quarterly News 18(1), janeiro de 2014: a manobra da estação em janeiro de 2012",
  "srcOdqn22": "NASA Orbital Debris Quarterly News 26(1), março de 2022: a manobra da estação de 10 de novembro de 2021",
  "srcCelestrak": "CelesTrak, Chinese ASAT test: o horário mais provável do evento, 22:26:10 UTC",
  "srcSatcat": "Catálogo de satélites do CelesTrak (SATCAT), lido em 2026-11-07: a contagem de hoje e a órbita de cada pedaço",
  "srcWiki": "Wikipédia, 2007 Chinese anti-satellite missile test: a velocidade de aproximação"
};
// b200-c3-learn: end
// b200-c2-deep: begin -- the 3D stars over deep time, the variable stars worth going out for, the black holes against the EHT's pictures and the cards in the trips' voice (copy/en.deep.js, forge #141, #142, #149, #151), machine-drafted
Object.assign(COPY, {
  "starDeep": {
    "moved": "As estrelas de {year}: cada uma deslocada pelo seu próprio movimento medido (Hipparcos e Gaia, via HYG); prolongá-los em linha reta por tanto tempo é modelado.",
    "hidden": "Estrelas sem movimento medido não são desenhadas tão longe de hoje.",
    "noPluto": "Plutão e suas luas não são desenhados tão longe de hoje: a efeméride deles (astronomy-engine) só tem tabela para os anos 0 a 4000.",
    "selected": "{name} está então a {d} anos-luz do Sol (modelado); a ficha e o rótulo dão a distância de hoje, {today}."
  },
  "varEvents": {
    "min": "{name} no mínimo",
    "max": "{name} perto do seu brilho máximo",
    "minLine": "Até a magnitude {mag}, a {alt}° de altura no {dir}.",
    "maxLine": "Cerca de magnitude {mag}, a {alt}° de altura no {dir}.",
    "minClass": "Calculado a partir dos seus mínimos medidos (Kreiner 2004), prolongados pelo seu período: certo a um quarto de hora, mais ou menos.",
    "maxClass": "Modelado a partir do período e da época do catálogo: os máximos de uma Mira chegam semanas antes ou depois.",
    "aria": "{title}, {when}. {line}"
  },
  "holeCompare": {
    "fromEarth": "Visto da Terra",
    "fromEarthTitle": "Ficar na linha do buraco até a Terra, norte em cima e leste à esquerda, como as imagens do EHT são impressas",
    "compare": "Comparar com a imagem do EHT",
    "compareTitle": "Mostrar a imagem do Event Horizon Telescope ao lado do buraco desenhado, ambos vistos da Terra com o norte em cima",
    "hide": "Ocultar a imagem do EHT",
    "caption": "EHT, {date}",
    "orient": "Norte em cima, leste à esquerda, como o buraco está desenhado agora.",
    "credit": "Imagens: EHT Collaboration, CC BY 4.0.",
    "source": "Fonte",
    "alt": "A imagem de {name} pelo Event Horizon Telescope, {date}: um anel de luz laranja em volta de um centro escuro.",
    "brightest": "Visto da Terra com o norte em cima, o anel desenhado é mais brilhante num ângulo de posição de cerca de {ours}° (medido no desenho); a imagem do EHT de {date} é mais brilhante perto de {theirs}°.",
    "approx": {
      "m87-star": "Ajustado: a inclinação (17° da nossa linha de visada) e o ângulo do jato no céu (288°) são medidos (Walker et al. 2018), e com o fluxo girando no sentido horário (EHT 2019, artigo V) o lado que se aproxima, avivado pelo seu movimento, fica ao sul. Medido em brilho linear ao redor do anel, o nosso lado brilhante é cerca de 2,5 vezes o fraco (2,1 borrado aos 20 µas do EHT); o deles, 2,7 em 2017 e 4,2 em 2018, então o nosso corresponde ao de 2017. Aproximado: a luz é traçada como em volta de um buraco que não gira e o gás é um disco fino em órbitas circulares, não o fluxo quente e espesso dos modelos do EHT. A mancha brilhante deles moveu-se cerca de 30° num ano; a nossa não se move.",
      "sgr-a-star": "Ajustado: visto a 30° do seu eixo, como os modelos que melhor se ajustam do artigo V do EHT 2022, girando no sentido horário como as erupções vistas pelo GRAVITY. Escolhido: para onde o eixo aponta no céu, o que ninguém mediu; está girado para que o lado mais brilhante caia onde a imagem do EHT é mais brilhante. Aproximado: a luz é traçada em volta de um buraco que não gira, em volta de um disco fino; a imagem do EHT é uma média de uma noite de um fluxo que muda em minutos, e os seus três nós brilhantes não são todos reais, dizem os seus autores. O nosso lado brilhante é cerca de cinco vezes o fraco (4,5 borrado aos 20 µas do EHT), o deles 1,7: a 30°, as órbitas circulares avivam o lado próximo muito mais do que mostra a média de uma noite do EHT."
    }
  },
  "cardVoice": {
    "readTitle": "Ler esta ficha em voz alta: o texto citado da Wikipédia na voz sintética das viagens",
    "credit": "Voz: Kokoro-82M (af_heart), uma voz sintética, Apache-2.0; as palavras são da Wikipédia (CC BY-SA 4.0)."
  }
});
// b200-c2-deep: end

// b200-s1-fixes: begin -- the long mission clock's units (copy/en.moments.js momentPlayer metYears, metDays), machine-drafted
COPY.momentPlayer.metYears = "{y} a {d} d";
COPY.momentPlayer.metDays = "{d} d";
COPY.truth.exoPacked = "nossa cópia compactada de {date}"; // forge #88: which list an exoplanet came from
COPY.truth.exoLive = "a lista do Arquivo, lida em {date}";
// b200-s1-fixes: end
// b200-f10-stars3d: begin -- the 3D star map's AT-HYG tier (copy/en.startiers.js, forge #140), machine-drafted
Object.assign(COPY, {
  "starTiers": {
    "unnamed": "Uma estrela sem nome (AT-HYG {n})",
    "cite": "AT-HYG v4.0 (CC BY-SA 4.0, David Nash): posição e brilho do Tycho-2, distância do {dist}",
    "from": {
      "gaia-dr3": "Gaia DR3",
      "gaia-dr2": "Gaia DR2",
      "hipparcos": "Hipparcos",
      "gliese": "catálogo de Gliese",
      "other": "um catálogo mais antigo"
    },
    "error": "Distância precisa a cerca de ±{pct}% (paralaxe sobre seu erro, cerca de {poe}): modelada a partir do erro típico da missão neste brilho ({mas} milissegundos de arco), porque o AT-HYG não traz o erro próprio desta estrela",
    "noError": "O AT-HYG não dá erro para esta distância",
    "guess": "Esta distância é um palpite: além de 3 kpc (cerca de 10 000 anos-luz) uma paralaxe tem poucos décimos de milissegundo de arco, e o erro próprio da estrela não está no AT-HYG, que só guarda uma paralaxe maior que seu erro",
    "lineHyg": "Estrelas em 3D: as 109 389 do HYG.",
    "lineAthyg": "Estrelas em 3D: as 109 389 do HYG e {n} milhões do AT-HYG, carregadas ao redor da câmera num degrau da escada (até {k} milhões de uma vez) e desenhadas até a magnitude {lim} vista da câmera, mais fracas do que um olho vê, esmaecendo no fim.",
    "shell": "No palco de um mundo as estrelas em 3D são só as do HYG: {n} estrelas do AT-HYG de magnitude 7,5 ou mais brilhantes vistas do Sol não são desenhadas ali.",
    "why": {
      "low": "A qualidade baixa desenha só o HYG.",
      "latched": "A taxa de quadros estava baixa: só o HYG.",
      "saver": "Economia de dados: só o HYG.",
      "none": ""
    },
    "gaiaHeld": "O Gaia DR3 não é um nível: a ESA licencia os dados do seu arquivo só para uso não comercial (CC BY-NC 3.0 IGO).",
    "farTime": "As estrelas do AT-HYG são desenhadas só na data de hoje: a vista do tempo distante usa só o HYG."
  }
});
// b200-f10-stars3d: end
// b200-s4a-look: begin -- how a world is drawn (its card's note), the Earth in a card's breadcrumb and our missions' event titles in the date field (copy/en.js worldView, sky.bodies; copy/en.find.js dateJump.eventTitles; 2.0.0 look finding 8) and what a tap no figure of another sky reaches says (copy/en.later.js skyLore; finding 10), machine-drafted
COPY.worldView.nearer = "{name} é desenhado na direção real, mas mais perto e maior do que é, para que você o encontre.";
COPY.worldView.asIs = "{name} é desenhado onde está, no tamanho que tem.";
COPY.sky.bodies.earth = "Terra";
COPY.dateJump.eventTitles = {
  "Launch": "Lançamento",
  "Closest to Jupiter": "O mais perto de Júpiter",
  "Closest to Saturn": "O mais perto de Saturno",
  "The Pale Blue Dot": "O pálido ponto azul",
  "The most distant thing we made": "A coisa mais distante que já fizemos",
  "The termination shock": "O choque de terminação",
  "Into interstellar space": "Rumo ao espaço interestelar",
  "Closest to Uranus": "O mais perto de Urano",
  "Closest to Neptune": "O mais perto de Netuno",
  "Jupiter's push": "O empurrão de Júpiter",
  "Saturn's orbit": "A órbita de Saturno",
  "Closest to Pluto": "O mais perto de Plutão",
  "Arrokoth": "Arrokoth",
  "Back past Earth": "De volta perto da Terra",
  "Into orbit round Jupiter": "Em órbita de Júpiter",
  "Past Venus": "Passando por Vênus",
  "Past Venus again": "Passando por Vênus de novo",
  "Past Jupiter": "Passando por Júpiter",
  "Arrival at Saturn": "Chegada a Saturno",
  "Huygens let go": "Huygens se solta",
  "Huygens lands on Titan": "Huygens pousa em Titã",
  "Earth, seen from Saturn": "A Terra vista de Saturno",
  "The Grand Finale begins": "Começa o Grand Finale",
  "Into Saturn": "Dentro de Saturno",
  "Out of the shuttle": "Fora do ônibus espacial",
  "The first asteroid visit": "A primeira visita a um asteroide",
  "Past Earth a second time": "Passando pela Terra pela segunda vez",
  "Ida and its moon": "Ida e sua lua",
  "Into Jupiter": "Dentro de Júpiter",
  "Past Mars": "Passando por Marte",
  "Into orbit round Vesta": "Em órbita de Vesta",
  "Leaving Vesta": "Deixando Vesta",
  "Into orbit round Ceres": "Em órbita de Ceres",
  "The last contact": "O último contato",
  "Into the asteroid belt": "Rumo ao cinturão de asteroides",
  "Past the farthest planet": "Além do planeta mais distante",
  "The last signal": "O último sinal",
  "The first craft at Saturn": "A primeira nave em Saturno",
  "Past the orbit of Neptune": "Além da órbita de Netuno",
  "Arrival at L2": "Chegada a L2",
  "The first pictures": "As primeiras imagens",
  "Into orbit round the Moon": "Em órbita da Lua",
  "The Eagle has landed": "A Águia pousou",
  "One small step": "Um pequeno passo",
  "Leaving the Moon": "Deixando a Lua",
  "Splashdown": "Amerissagem",
  "Apollo 8 leaves for the Moon": "A Apollo 8 parte para a Lua",
  "Apollo 11 leaves for the Moon": "A Apollo 11 parte para a Lua",
  "Apollo 17, at night": "A Apollo 17, à noite",
  "Flying again": "Voando de novo",
  "Hubble goes up": "O Hubble sobe",
  "The last Shuttle from 39B": "O último ônibus espacial da 39B",
  "Past Mathilde": "Passando por Mathilde",
  "A first pass of Eros": "Uma primeira passagem por Eros",
  "Into orbit round Eros": "Em órbita de Eros",
  "Down on Eros": "Pouso em Eros",
  "Through the coma of Wild 2": "Pela coma do Wild 2",
  "The capsule lands": "A cápsula pousa",
  "Past Tempel 1": "Passando pelo Tempel 1",
  "The impact": "O impacto",
  "Earth and Moon flyby": "Sobrevoo da Terra e da Lua",
  "Past Hartley 2": "Passando pelo Hartley 2",
  "The course correction": "A correção de rota",
  "Let go": "Solta",
  "Europa and Io, on the way in": "Europa e Io, no caminho",
  "Into Jupiter’s air": "No ar de Júpiter",
  "Landing in Jezero": "Pouso em Jezero",
  "The first flight": "O primeiro voo",
  "The first rock core": "O primeiro núcleo de rocha",
  "Two become one": "Dois viram um",
  "People move in": "As pessoas se mudam",
  "The last shuttle sets off": "O último ônibus espacial parte",
  "Discovered": "Descoberto",
  "Past Earth": "Passando pela Terra",
};
// 2.0.0 look finding 10: a tap no figure of another people's sky reaches (copy/en.later.js skyLore)
COPY.skyLore.notHereTitle = "Nenhuma figura do céu {culture} aqui";
COPY.skyLore.notHere = "Onde você tocou não há nenhuma figura do céu {culture} desenhada. A mais próxima é {name}, a {deg}°.";
COPY.skyLore.notHereNone = "Onde você tocou não há nenhuma figura do céu {culture} desenhada.";
COPY.skyLore.nearest = "A história de {name}";
// b200-s4a-look: end

// redesign 2026-11-10: begin -- machine-drafted: the Games link of the explore panel (copy/en.js games), the rail's
// email updates (rail.subscribe), their popover and the row under Coming up (copy/en.subscribe.js emailUpdates;
// comingUp is the old subscribe.heading, moved)
COPY.rail.subscribe = "Novidades por e-mail";
COPY.rail.coffee = "Pague-nos um café";
COPY.rail.coffeeLabel = "Apoie o Space Radar no Buy Me a Coffee";
COPY.games = {"label": "Jogos", "title": "Jogos espaciais da equipe do Space Radar (abre em uma nova aba)", "href": "https://games.spaceradar.ai/"};
COPY.emailUpdates = {
  "title": "Novidades grátis por e-mail",
  "text": "Escolha sobre o que quer saber. Nada é enviado até você confirmar.",
  "pick": "Escolha pelo menos uma",
  "news": "Notícias do Space Radar",
  "journal": "O Diário",
  "games": "Jogos espaciais",
  "sky": "Alertas do céu",
  "models": "Modelos do Space Radar",
  "video": "Vídeos do Space Radar",
  "email": "Endereço de e-mail",
  "placeholder": "voce@example.org",
  "button": "Inscrever-se",
  "sending": "Enviando…",
  "retry": "Tentar de novo",
  "check": "Confira sua caixa de entrada: enviamos um link para {email}. Nada é enviado até você clicar nele.",
  "invalidEmail": "Esse endereço não parece correto.",
  "rateLimited": "Tentativas demais daqui. Tente de novo em alguns minutos.",
  "busy": "Muitas inscrições hoje. Tente de novo amanhã.",
  "sendFailed": "Não conseguimos enviar o e-mail. Tente de novo mais tarde.",
  "invalidLists": "Escolha pelo menos uma lista.",
  "other": "Algo deu errado. Tente de novo.",
  "unreachable": "Não foi possível falar com o servidor.",
  "privacy": "Guardamos seu endereço e as listas que você escolher, nada mais. Sem pixels de rastreamento, sem links reescritos. Todo e-mail tem descadastro com um clique.",
  "privacyLink": "Privacidade",
  "honeypot": "Deixe isto vazio",
  "close": "Fechar",
  "comingUp": "O que vem aí, por e-mail",
  "skyButton": "Receber alertas do céu"
};
// redesign 2026-11-10: end
