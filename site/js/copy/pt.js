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
  review: { status: 'machine-drafted', by: [], note: 'Needs a second native speaker (docs/TRANSLATING.md, Review).' },
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
      "iapetus": "posição: Saturno pelo Astronomy Engine (Don Cross, licença MIT), mais uma órbita ajustada ao JPL Horizons e conferida com ele, com diferença de até 6 800 km entre 2000 e 2050, o que equivale a 0,19 por cento da sua órbita; raio dos parâmetros físicos de satélites do JPL, os dois albedos da tabela de dados dos satélites de Saturno da NASA, o que ele é e sua cor, da NASA Science, brilho da Wikipédia, tudo lido em 2026-09-22",
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
    "notLoaded": "ainda carregando",
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
      "approach": "Calculado pelo NASA JPL a partir da órbita medida do asteroide",
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
    "oftenSaidLabel": "Costuma-se dizer",
    "notApplicable": "Não é algo que este objeto tenha",
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
      "share": "Enviar"
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
    "objectOwn": "desenhado como {name}",
    "objectMade": {
      "images": "forma construída a partir de fotografias; proporções aproximadas",
      "render": "forma construída a partir de uma concepção artística; proporções aproximadas",
      "dimensions": "forma construída a partir de dimensões e imagens publicadas; detalhes simplificados"
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
    "worldFlat": "desenhado como uma bola lisa: não há aqui um mapa da superfície de {name}, e a única cor foi escolhida a partir de descrições publicadas, não medida",
    "worldFlatIrregular": "desenhado como uma bola lisa do tamanho do raio médio: não há aqui um mapa da superfície de {name}, a única cor foi escolhida a partir de descrições publicadas, não medida, e {name} é na verdade uma rocha irregular cuja forma real não é desenhada",
    "worldFlatShaped": "desenhado na forma medida e em uma só cor: não há aqui um mapa da superfície de {name}, e a cor foi escolhida a partir de descrições publicadas, não medida",
    "worldShaped": "desenhado na forma medida",
    "worldMap": {
      "tinted": "a superfície é um mosaico em preto e branco, colorido com uma cor escolhida a partir de descrições publicadas",
      "toned": "as cores vêm de imagens em infravermelho, verde e ultravioleta, atenuadas em direção ao que um olho veria",
      "redblue": "as cores vêm das imagens vermelhas e azuis da New Horizons, com o verde tirado a meio caminho entre elas e a cor reforçada em mais da metade; as partes fotografadas só em preto e branco recebem a cor média do mapa",
      "enhanced": "as cores são as que a NASA publicou, montadas a partir de três dos filtros de cor da New Horizons, nenhum deles verde: é cor realçada, mais forte que o que um olho veria e diferente dele",
      "balanced": "as cores vêm de imagens em laranja, verde e azul, equilibradas até a cor publicada e atenuadas em direção ao que um olho veria",
      "infrared": "a superfície é um mapa em infravermelho próximo feito através da névoa, colorido e suavizado; na luz visível a névoa esconde o solo"
    },
    "worldCoverage": {
      "miranda": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "ariel": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "umbriel": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "titania": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "oberon": "só a metade sul foi fotografada, pela Voyager 2 em 1986; o resto fica liso, sem palpite",
      "triton": "a Voyager 2 fotografou parte dele em 1989; o resto fica liso, sem palpite",
      "pluto": "o extremo sul estava na escuridão do inverno quando a New Horizons passou, em 2015, e fica liso, sem palpite",
      "charon": "o extremo sul estava na escuridão do inverno quando a New Horizons passou, em 2015, e fica liso, sem palpite"
    },
    "worldLit": "iluminado como o mostraria uma câmera exposta para a sua própria luz solar",
    "worldLight": "visto de longe, é uma luz com o brilho calculado: o halo é como uma câmera registra um ponto brilhante demais para ser resolvido",
    "exoticDeparture": {
      "pulseSlowed": "o piscar é desenhado {n} vezes mais lento do que o giro, para que um olho consiga acompanhá-lo",
      "pulseTrue": "o piscar é desenhado no ritmo em que ele gira",
      "portrait": "enquanto esta ficha está aberta, a imagem é desenhada no lugar dele, bem maior do que pareceria daqui"
    },
    "worldDeparture": {
      "earth": "em uma tela maior, as montanhas vêm das alturas do ETOPO 2022 da NOAA, desenhadas {relief} vezes mais íngremes do que são para que um Sol baixo as mostre; o brilho do ar ao redor da borda é desenhado {air} vezes mais alto do que o ar é; da órbita baixa, em uma tela maior, as nuvens se erguem em direção ao horizonte e sob um Sol baixo, desenhadas {clouds} vezes mais espessas do que são para que se vejam a inclinação, as sombras longas e a última luz no topo delas (na espessura real no modo Medido), com a altura de cada topo tirada da temperatura medida onde a imagem de hoje cobre e do brilho do mapa de nuvens nos demais lugares",
      "mercury": "em uma tela maior, o relevo vem do modelo de elevação da MESSENGER, desenhado {steep} vezes mais íngreme do que o medido para que as bordas das crateras peguem a luz",
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
    "systemLine": "Tamanhos e órbitas do NASA Exoplanet Archive; as cores{phase} e a inclinação das órbitas são ilustrativas.",
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
    "approachNext": "Próximo na tabela do NASA JPL: {name}, em {date}, a {ld} vezes a distância da Lua.",
    "approachNextFar": "Próximo na tabela do NASA JPL: {name}, em {date}.",
    "approachNone": "A tabela de passagens próximas do NASA JPL não carregou, então nenhuma próxima passagem é citada.",
    "satellitesCount": "{n} satélites em funcionamento no catálogo que esta página carregou do CelesTrak, {starlink} deles Starlink.",
    "satellitesLoading": "O catálogo ainda está carregando; a contagem aparece quando ele terminar.",
    "pictureLine": "Uma fotografia real, colocada onde fica no céu. Imagem: {credit} · {licence}, bordas esmaecidas e céu escurecido por nós.",
    "portraitLine": "O anel é a imagem do Event Horizon Telescope, feita com ondas de rádio. É desenhada bem maior do que pareceria daqui; o lugar é medido. Imagem: {credit} · {licence}, céu escurecido e bordas esmaecidas por nós.",
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
    "volumeValue": "{pct} por cento",
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
    "locationPlaceholder": "Qual cidade?",
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
    "dataSaver": "Economia de dados: as duas maiores esperam.",
    "lowered": "Quadros lentos ({ms} ms): imagem simples.",
    "tierPhone": "Mapas de superfície em 2k, para o celular.",
    "tierSaver": "Mapas de superfície em 2k: poupa dados.",
    "tierSmall": "Mapas de superfície em 2k, p/ este aparelho.",
    "tierLatched": "Mapas de volta a 2k: quadros lentos.",
    "tierLow": "Mapas de superfície em 2k, como pede o modo Baixa.",
    "tier1": "Superfície em 4k, baixada quando há folga.",
    "tier2": "Superfície em 4k, mais mundos nítidos.",
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
    "fellBack": "Os quadros estavam lentos: a qualidade voltou para Auto."
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
    "inferred": "posição propagada a partir de elementos com {n} {unit}",
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
  "subscribe": {
    "heading": "Lançamentos e chuvas por e-mail",
    "emailLabel": "Seu e-mail",
    "emailPlaceholder": "voce@exemplo.com",
    "pickOne": "Marque pelo menos uma das duas.",
    "launchesLabel": "Próximos lançamentos",
    "showersLabel": "Picos de chuvas de meteoros",
    "submit": "Assinar",
    "sending": "Enviando…",
    "pending": "Confira seu e-mail para confirmar.",
    "couldNotReach": "Não foi possível acessar o serviço de assinatura."
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
      "storm": "Tempestade tropical",
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
    "launch": "{name} decola {when}",
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
    "launched": "{n} objetos chegaram à órbita em 30 dias",
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
    "forget": "Esquecer-me",
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
        "Uma fotografia",
        "As nebulosas e as galáxias são fotografias de telescópio, de longa exposição. Para o olho num telescópio, o mesmo gás é um brilho cinza e fraco, e algumas imagens associam gases isolados a cores; cada ficha diz qual é o caso."
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
    "honesty": "Contado a partir do catálogo do CelesTrak lido em {date}: o que o radar consegue rastrear, a partir de cerca de 10 cm de largura. Pedaços menores são muito mais numerosos e não estão em nenhum catálogo. O ponto em que cada um fica na órbita é ilustrativo."
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
    "real": "O gás é real, e fraco: para o olho num telescópio ele é um brilho cinza, porque o olho noturno não enxerga cor. A imagem no céu é uma longa exposição.",
    "colours": {
      "broadband": "Foi feita com filtros largos de cor ({filters}), então as cores ficam perto do que um olho muito mais sensível veria.",
      "mixed": "Foi feita com filtros largos de cor, mais um filtro estreito para o hidrogênio incandescente ({filters}), então o gás vermelho está mais forte aqui do que um olho o veria.",
      "narrowband": "As cores são mapeadas: cada uma é a luz de um único gás através de um filtro estreito ({filters}), escolhidas para mostrar a estrutura, não o que um olho veria.",
      "infrared": "Foi feita em luz infravermelha, que nenhum olho enxerga ({filters}), então toda cor aqui é escolhida: mostra o que existe, não o que um olho veria.",
      "unstated": "O arquivo dela não diz quais filtros foram usados, então não dizemos se estas são as cores que um olho veria."
    },
    "part": "Mostra {part}, não o todo.",
    "figureAlt": "Fotografia de {name}",
    "figureCaption": "{name}: {w} por {h} minutos de arco de céu.",
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
      "infrared": "O céu em infravermelho, em cor falsa: poeira quente e estrelas frias.",
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
      "modelled": "Um modelo de tempo alimentado com medições, não uma imagem direta."
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
      "credit": "Dados: {credit}. Um modelo de tempo, não uma medição."
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
    "placeGuess": "Perto de {place}, suposto pelo fuso horário",
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
      "dsoLine": "melhor {time} · {deg}° acima, {dir} · {how}",
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
        "seeThrough": "Terra transparente, para achar o que está sob o horizonte",
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
        "astronomical": "último crepúsculo",
        "night": "noite"
      },
      "timeNoNight": "Não escurece aqui esta noite.",
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
        "western": "As 88 constelações que os astrônomos acordaram em 1922.",
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
      "honesty": "Estrela medida, planeta calculado, ar modelado, solo traçado"
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
    "moveTouch": "Arraste para girar. Pince para aproximar.",
    "trips": "Uma viagem guiada: uma história em minutos.",
    "trip": "Viagem guiada",
    "tripTitle": "Começa a primeira viagem da lista",
    "look": "Olhar em volta",
    "lookTitle": "Guarda estas linhas"
  },
  "opening": {
    "label": "Abertura",
    "from": "De",
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
      "globularStars": "Um modelo do seu tipo, não as estrelas dele: {n} estrelas mais brilhantes que o ponto de virada, colocadas pelo perfil de King com o raio do núcleo de Harris ({rc} anos-luz) e o raio de maré ({rt}). O número, o brilho e as cores delas são um modelo.",
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
      "m57": "A luz vem da fotografia do Hubble, a forma de O’Dell, Ferland, Henney e Peimbert (2013): um anel grosso inclinado 13,5°, visto quase ao longo do eixo, com o gás mais azulado do meio desenhado se estendendo em nossa direção e na direção oposta. As cores são as da fotografia, feita com filtros estreitos. Ainda não revisado por um astrônomo."
    },
    "rows": {
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
      "crab": "A luz vem da fotografia do Hubble, em cor falsa, levada sobre uma casca cuja forma segue Martin, Milisavljevic e Drissen (2021): uma gaiola de filamentos com cerca de 4 parsecs de comprimento ao redor de um meio vazio. Ainda não revisado por um astrônomo.",
      "veil": "A luz vem da fotografia do NOIRLab, em cor falsa, levada sobre uma esfera fina de 37 parsecs de largura (Fesen e outros, 2018): os filamentos são a borda dela vista de perfil. Ainda não revisado por um astrônomo.",
      "horsehead": "A escuridão é lida a partir da fotografia do NOIRLab: poeira diante do gás brilhante de IC 434, que absorve e avermelha o que está atrás e não emite luz. Ainda não revisado por um astrônomo.",
      "coalsack": "A escuridão é lida a partir da Via Láctea ao redor: uma nuvem de poeira a cerca de 590 anos-luz que escurece e avermelha as estrelas atrás dela. Ainda não revisado por um astrônomo.",
      "m78": "A luz é a fotografia do NOIRLab: poeira espalhando a luz azul da estrela à frente, na face de uma nuvem escura. A profundidade é reconstruída. Ainda não revisado por um astrônomo.",
      "iris": "A luz é a fotografia do NOIRLab: poeira espalhando a luz da jovem estrela HD 200775 em uma cavidade da nuvem. A profundidade é reconstruída. Ainda não revisado por um astrônomo."
    },
    "rows": {
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
        "on": "Os voos deslizam e as viagens avançam sozinhas, como o mapa foi feito para fazer",
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
  "ephemeris": "Uma tabela de onde algo estará, calculada com antecedência."
};
