// uk: Ukrainian, the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).
// Fetched by copy/index.js only when the page speaks Ukrainian (?lang=uk); hidden until a native reader has signed off (docs/TRANSLATING.md).
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.
// Until a second native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Ukrainian only to a visitor who asks for it (?lang=uk), and the language picker does not list it.
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: «ви» for the reader, or imperative/impersonal forms; plain words, short sentences.
//   * Honesty words, one each: виміряно (measured), обчислено (worked out), змодельовано (modelled), ілюстративно (illustrative), реконструйовано (reconstructed), художнє зображення (artist's impression), зразок (sample); "здійснено" = flown (Artemis II).
//   * Planets/moons use the usual Ukrainian names (Іо, Європа, Енцелад, Титан, Харон, Діморфос); Sun/Moon: Сонце/Місяць; natural moon = "природний супутник", artificial = "супутник".
//   * Spacecraft, missions, agencies, instruments, catalogues stay Latin (Voyager 2, Hubble, Webb, NASA JPL); people and places are in Cyrillic (Гагарін, Байконур, Армстронг).
//   * Astronaut quotes stay as said (Armstrong in English; Gagarin's "Poyekhali!" kept, plus "Поїхали!"). Korolev's and Gagarin's other Russian lines are given in Ukrainian, not Russian.
//   * Counts that need case agreement are rewritten as "label: {n}" (e.g. "Штормів зараз: {n}"); distances read "світлових років від нас: {dist}"; abbreviations (св. р., а. о., хв, год, діб) elsewhere.
//   * numberWords are nominative masculine (жодного, один, два...); the sentences using them were built to take a nominative after a colon, but the "fists" line (sky.fistsMany) is a compromise.
//   * Zero-width space on purpose (no articles in Ukrainian): card.articles.0/1, exoface.a/an, r12Navigate.theWord; card.leadVerbs is "—"/"був" so "X — ..." becomes "Це — ...";
//   * Compass directions are noun forms (північ-північний схід); "in the {dir}" became "напрям: {dir}" because the slot cannot be declined. Short compass uses Пн/Пд/С/З.
//   * Unsure: "зона життя" for habitable zone; "Вигляд" for Look with modes «Виміряний»/«Кіно»; "Угруповання" for a satellite constellation; "млн Сонць" in card values; Boorong left Latin.
//   * The NASA GIBS acknowledgement (clouds.gibsAcknowledgement) is left in English because it is required wording.

export const META = {
  code: "uk",
  name: "Українська",
  english: "Ukrainian",
  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },
};

export const RULES = {
  decimal: ',',
  article() {
    return '';
  },
  plural(n, one, many) {
    const num = Math.abs(Number(n));
    const parts = String(many).split('|');
    const few = parts[0];
    const lots = parts.length > 1 ? parts[1] : parts[0];
    if (!Number.isFinite(num)) return lots;
    if (!Number.isInteger(num)) return few; // 1,5 години; 0,5 хвилини
    const m10 = num % 10;
    const m100 = num % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return lots;
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "Будуємо небо…",
    "bootEarth": "Розміщуємо Землю…",
    "bootCatalogues": "Читаємо каталоги…",
    "tagline": "Усе, що рухається навколо Землі, — там, де воно справді є, просто зараз.",
    "sceneSelected": "Мапа космосу, намальована за справжніми положеннями; ви вибрали {name}: його картка на панелі поряд із мапою розповідає, що це."
  },
  "compareText": {
    "size": [
      "завбільшки з тостер",
      "завбільшки з пральну машину",
      "завбільшки з автомобіль",
      "завбільшки з автобус",
      "завбільшки з будинок",
      "заввишки з 15-поверховий будинок",
      "заввишки з 25-поверховий будинок",
      "завбільшки з футбольне поле",
      "заввишки з 40-поверхову вежу",
      "завбільшки з круїзний лайнер",
      "заввишки з найвищу будівлю на Землі",
      "завбільшки з невелику гору",
      "завбільшки з місто"
    ],
    "magnitude": [
      "яскравий, як повний Місяць",
      "яскравіший за будь-яку зорю чи планету",
      "яскравий, як Венера",
      "яскравий, як найяскравіші зорі",
      "яскравий, як звичайна зоря",
      "ледве видно з темного місця",
      "надто тьмяний, щоб побачити без телескопа"
    ],
    "speed": [
      "{n} км/год — швидкість на автостраді",
      "{n} км/год — приблизно швидкість пасажирського літака",
      "{n} км/год — швидше за гвинтівкову кулю",
      "{n} км/год — близько {m} км щохвилини"
    ],
    "driving": "{n} км угору — приблизно {h} {word} за кермом, якби дорога йшла просто вгору",
    "hour": "година",
    "hours": "години|годин",
    "up": "{n} км угору",
    "moon": "{ld}× відстані до Місяця",
    "lightMinutes": "{lt} св. хв від нас",
    "lightHours": "{lh} св. год від нас",
    "compass": [
      "північ",
      "північ-північний схід",
      "північний схід",
      "схід-північний схід",
      "схід",
      "схід-південний схід",
      "південний схід",
      "південь-південний схід",
      "південь",
      "південь-південний захід",
      "південний захід",
      "захід-південний захід",
      "захід",
      "захід-північний захід",
      "північний захід",
      "північ-північний захід"
    ]
  },
  "numberWords": [
    "жодного",
    "один",
    "два",
    "три",
    "чотири",
    "п’ять",
    "шість",
    "сім",
    "вісім",
    "дев’ять",
    "десять"
  ],
  "shell": {
    "sideLabel": "Огляд",
    "back": "Огляд",
    "backLabel": "Назад до огляду",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "Показати панель",
    "collapse": "Сховати панель",
    "topLabel": "Пошук і інструменти"
  },
  "tabs": {
    "label": "Де",
    "earth": "Земля",
    "planets": "Планети",
    "stars": "Зорі",
    "tonight": "Цієї ночі"
  },
  "rightNow": {
    "title": "Зараз",
    "storms": "{n} — стільки штормів зараз крутиться, найсильніший — {name}.",
    "stormOne": "Крутиться один шторм: {name}.",
    "clouds": "Хмари сьогодні",
    "people": "Люди в космосі",
    "iss": "МКС",
    "tiangong": "Тяньгун",
    "crewAt": "{n} на {name}"
  },
  "statusLine": {
    "reading": "Читаємо джерела",
    "read": "Прочитано за візит: {n}",
    "readOne": "Прочитано за візит: одне",
    "stale": "Застарілих: {n}",
    "failed": "Не вдалося прочитати: {n}",
    "oldest": "найстаріше: {age}",
    "open": "Відкрити джерела",
    "label": "{text}. Відкрити джерела",
    "offline": "Без мережі: показано збережені копії з {age}",
    "offlineNone": "Без мережі: на цьому пристрої немає збережених копій"
  },
  "mission": {
    "title": "Її місія",
    "count": "{i} з {n}",
    "navLabel": "Події: {name}",
    "prev": "Попередня подія",
    "next": "Наступна подія",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (прогноз)",
    "go": "Перейти до цієї миті",
    "goTitle": "Встановити годинник на цю мить і показати її",
    "here": "Годинник стоїть на цій миті. Кнопка «Наживо» поверне його назад.",
    "noteSite": "Мапа може показати це місце в той день, при тодішньому світлі.",
    "notePath": "Мапа має траєкторію на цей день.",
    "noteCruise": "Власної траєкторії на цей день у нас немає: {name} намальовано на прямій лінії назад від місця, де його виміряно зараз; точність близько однієї астрономічної одиниці.",
    "noteNone": "Мапа не має траєкторії для {name} на цей день, тому годинник залишається на місці.",
    "noteNoneWorld": "Мапа не має траєкторії для {name} на цей день, тому годинник залишається на місці. Світ, який він зустрів, намальовано для будь-якої дати.",
    "seeWorld": "Побачити {world} того дня",
    "seeWorldTitle": "Встановити годинник на той день і перейти до: {world}. Самого апарата {name} там не намальовано",
    "all": "Усі події: {n}",
    "fewer": "Сховати список",
    "source": "Дати й цифри: ",
    "unknown": "Це посилання веде до події, якої немає на цій мапі."
  },
  "tripCard": {
    "title": "Подорожі",
    "meta": "Зупинок: {n} · {m} хв",
    "metaOne": "Одна зупинка · {m} хв",
    "planning": "Обираємо зупинки",
    "starting": "Починаємо…",
    "cannotRun": "Зараз не можна запустити",
    "offOne": "Одну подорож зараз не можна запустити",
    "offMany": "Подорожей, які зараз не запускаються: {n}",
    "offWhy": "{line}: {reason}",
    "all": "Усі подорожі ({n})",
    "fewer": "Менше подорожей",
    "onItsOwn": "Грати самій",
    "onItsOwnTitle": "Подорожі йдуть одна за одною, поки ви не візьмете керування",
    "justWatch": "Просто дивитися",
    "reelLength": "{m} хв на коло",
    "drift": "Дрейф",
    "driftLength": "без кінця",
    "driftTitle": "Камера блукає від одного об’єкта до іншого"
  },
  "explore": {
    "worldsTitle": "Світи",
    "worldsDrawn": "Планети намальовано крапками, більшими, ніж вони є.",
    "farTitle": "Далекі місця",
    "systemsTitle": "Зоряні системи",
    "systemsMild": "Планети поблизу зони життя",
    "systemsExtreme": "Незвичайні системи",
    "exoRow": "Планети інших зір",
    "exoShow": "показати",
    "exoHide": "сховати",
    "exoTitle": "Позначає кожну зорю, біля якої відомі планети",
    "lightYears": "{n} св. р.",
    "au": "{n} а. о."
  },
  "rail": {
    "label": "Інструменти",
    "show": "Що показати (L)",
    "share": "Поділитися (P)",
    "more": "Більше інструментів",
    "moreLabel": "Ще",
    "menuShare": "Поділитися",
    "menuHide": "Сховати панелі",
    "menuGitHub": "Код на GitHub",
    "blog": "Блог",
    "blogHref": "https://blog.spaceradar.ai/",
    "tour": "Пройти тур",
    "menuTour": "Пройти тур"
  },
  "timePill": {
    "label": "Час",
    "when": "{date} {time} UTC",
    "live": "НАЖИВО · {when}",
    "held": "{when} · стоїть",
    "away": "{when} · {off}",
    "unknown": "Час невідомий",
    "prev": "‹",
    "next": "›",
    "prevTitle": "Назад у часі",
    "nextTitle": "Уперед у часі",
    "backToLive": "Наживо",
    "backToLiveTitle": "Назад до справжнього часу, до цієї миті",
    "rate": "{n}×",
    "rateTitle": "Швидкість {n}×. Натисніть, щоб отримати {next}×",
    "hold": "Клацніть, щоб зупинити час, або тягніть, щоб рухатися ним",
    "run": "Клацніть, щоб пустити час, або тягніть, щоб рухатися ним",
    "localTitle": "Ваш час {time}, {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "1 хв",
      "hour": "1 год",
      "day": "1 доба",
      "event": "Подія"
    },
    "unitWords": {
      "minute": "одна хвилина",
      "hour": "одна година",
      "day": "одна доба",
      "event": "одна подія"
    },
    "prevEvent": "Попередня подія",
    "nextEvent": "Наступна подія",
    "noEventBack": "На шкалі часу раніше подій немає.",
    "noEventOn": "На шкалі часу далі подій немає.",
    "moonMark": "Місяць: {phase}, {date}",
    "sunMark": "{what} там, де ви, {date}",
    "sunMarkGuess": "{what} у місці, яке ми вгадали для вас, {date}",
    "sunWords": {
      "sunrise": "Схід Сонця",
      "sunset": "Захід Сонця"
    },
    "unitTitle": "Кроки: {unit}. Натисніть, щоб отримати: {next}",
    "tapeLabel": "Шкала часу. Тягніть її або користуйтеся стрілками",
    "tapeTitle": "Тягніть, щоб рухатися в часі",
    "now": "зараз",
    "nowTitle": "Назад до цієї миті",
    "rough": "грубіше",
    "roughTitle": "Далі ніж за тиждень від сьогодні місце супутника на орбіті відоме лише грубо",
    "roughSay": "Так далеко від сьогодні місця супутників відомі лише грубо.",
    "worlds": "Планети й супутники тримають своє місце сторіччями.",
    "markTitle": "{what}. Натисніть, щоб перейти туди",
    "endTitle": "Тут шкала часу закінчується: місяць назад, рік уперед"
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
    "sun": "Сонце",
    "mercury": "Меркурій",
    "venus": "Венера",
    "earth": "Земля",
    "moon": "Місяць",
    "mars": "Марс",
    "jupiter": "Юпітер",
    "saturn": "Сатурн",
    "uranus": "Уран",
    "neptune": "Нептун",
    "pluto": "Плутон",
    "io": "Іо",
    "europa": "Європа",
    "ganymede": "Ганімед",
    "callisto": "Каллісто",
    "phobos": "Фобос",
    "deimos": "Деймос",
    "enceladus": "Енцелад",
    "titan": "Титан",
    "triton": "Тритон",
    "charon": "Харон"
  },
  "worldFacts": {
    "cite": {
      "pluto": "положення обчислено за Astronomy Engine (Don Cross, ліцензія MIT), яка веде Плутон під притяганням Сонця й планет-гігантів; радіус із довідкової картки про Плутон у Вікіпедії, що це за світ — з NASA Science, його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "io": "положення обчислено за Astronomy Engine (Don Cross, ліцензія MIT): Юпітер плюс теорія руху його супутників L1.2 (Lainey, Duriez і Vienne); радіус із довідника NASA про супутники Юпітера, що це за світ — з NASA Science, його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "europa": "положення обчислено за Astronomy Engine (Don Cross, ліцензія MIT): Юпітер плюс теорія руху його супутників L1.2 (Lainey, Duriez і Vienne); радіус із довідника NASA про супутники Юпітера, що це за світ — з NASA Science, його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "ganymede": "положення обчислено за Astronomy Engine (Don Cross, ліцензія MIT): Юпітер плюс теорія руху його супутників L1.2 (Lainey, Duriez і Vienne); радіус із довідника NASA про супутники Юпітера, що це за світ — з NASA Science, його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "callisto": "положення обчислено за Astronomy Engine (Don Cross, ліцензія MIT): Юпітер плюс теорія руху його супутників L1.2 (Lainey, Duriez і Vienne); радіус із довідника NASA про супутники Юпітера, що це за світ — з NASA Science, його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "phobos": "положення: Марс за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 6 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, яскравість із довідника NASA про Марс, що це за світ і його колір — з NASA Science; усе прочитано 2026-09-22",
      "deimos": "положення: Марс за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 120 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, яскравість із довідника NASA про Марс, що це за світ і його колір — з NASA Science; усе прочитано 2026-09-22",
      "enceladus": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 1 480 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, що це за світ і його колір — з NASA Science, як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "titan": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 840 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, що це за світ — з NASA Science, посадка «Гюйгенса», його колір і як його побачити — з Вікіпедії; усе прочитано 2026-09-22",
      "triton": "положення: Нептун за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 10 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, що це за світ — з NASA Science, його колір і яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "charon": "положення: Плутон за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 1 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, яскравість із довідника NASA про Плутон, що це за світ і його колір — з NASA Science; усе прочитано 2026-09-22",
      "mimas": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 700 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Сатурна, що це за світ і його колір — з NASA Science, яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "tethys": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 120 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Сатурна, що це за світ — з NASA Science, його колір і яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "dione": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 240 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Сатурна, його колір — з NASA Science, що це за світ і його яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "rhea": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 200 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Сатурна, що це за світ і його колір — з NASA Science, яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "iapetus": "положення: Сатурн за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 6 800 км за 2000–2050 роки, а це 0,19 відсотка його орбіти; радіус із фізичних параметрів супутників від JPL, обидва альбедо з довідника NASA про супутники Сатурна, що це за світ і його колір — з NASA Science, яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "miranda": "положення: Уран за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 120 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Урана, що це за світ — з NASA Science, його колір і яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "ariel": "положення: Уран за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 120 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Урана, що це за світ і його колір — з NASA Science, яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "umbriel": "положення: Уран за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 410 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Урана, що це за світ — з NASA Science, його колір і яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "titania": "положення: Уран за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 1 000 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Урана, що це за світ і його колір — з NASA Science, яскравість — з Вікіпедії; усе прочитано 2026-09-22",
      "oberon": "положення: Уран за Astronomy Engine (Don Cross, ліцензія MIT) плюс орбіта, підігнана до JPL Horizons і звірена з ним з відхиленням до 1 230 км за 2000–2050 роки; радіус із фізичних параметрів супутників від JPL, альбедо з довідника NASA про супутники Урана, що це за світ — з NASA Science, його колір і яскравість — з Вікіпедії; усе прочитано 2026-09-22"
    }
  },
  "worldView": {
    "withParent": "Диск {parent} намальовано у {n} разів ширшим, ніж він здається на небі, щоб його було легко знайти; {name} намальовано навколо в тому самому масштабі: проміжок між ним і {parent} розтягнуто так само.",
    "withParentFloor": "{name} намальовано ще більшим, інакше його не було б видно.",
    "crowded": "{name} не намальовано таким широким: на цьому небі {near} лише за {deg}° від нього, і такий диск закрив би його."
  },
  "stars": {
    "unnamed": "Зоря без назви (HYG {n})"
  },
  "systems": {
    "mercuryRing": "Орбіта Меркурія для порівняння масштабу"
  },
  "ladder": {
    "title": "Як далеко",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, ще завантажується",
    "weShowTitle": "Що з відомого малює ця мапа",
    "weShowRow": "{what}: {n} з {of}",
    "edge": "Край мапи",
    "edgeHow": "летіти",
    "edgeTitle": "Один політ звідси до краю того, що малює ця мапа",
    "home": "Земля",
    "homeHow": "летіти додому",
    "homeTitle": "Один політ звідси назад до Землі",
    "flightOff": "Звідси не вийде: спершу перейдіть до Землі, Планет або Зір"
  },
  "sceneNote": {
    "refused": "Супутники не вдалося прочитати.",
    "refusedTitle": "З цього з’єднання не вдалося прочитати CelesTrak, який публікує орбіти. Місяць, планети, зорі й подорожі, яким супутники не потрібні, усе одно працюють.",
    "why": "Джерела",
    "close": "×",
    "closeTitle": "Закрити цю примітку"
  },
  "link": {
    "unknownVersion": "Це посилання зі свіжішої версії мапи. Показано типовий вигляд.",
    "unknownTrip": "Цієї подорожі на мапі вже немає. Показано типовий вигляд.",
    "unknownAt": "Цього об’єкта на мапі немає; показано типовий вигляд.",
    "unknownStage": "Мапа не може центруватися на цьому місці. Показано типовий вигляд."
  },
  "share": {
    "link": "Поділитися",
    "linkTitle": "Поділитися цим виглядом: листівка, посилання й кілька рядків тексту",
    "title": "Поділитися",
    "close": "Закрити",
    "pictureAlt": "Листівка: цей вигляд, перемальований у розмірі для друку, з підписом",
    "drawing": "Малюємо листівку…",
    "noPicture": "Листівку зараз не вдалося намалювати.",
    "withTag": "Позначка на вибраному",
    "linkLabel": "Посилання",
    "copyLink": "Скопіювати посилання",
    "textLabel": "Текст",
    "lookingUp": "Шукаємо у Вікіпедії…",
    "wikiSource": "Стаття у Вікіпедії, яку тут цитовано",
    "noWiki": "Тексту з Вікіпедії тут немає: допис коротший.",
    "attribution": "З Вікіпедії, CC BY-SA 4.0",
    "native": "Поділитися…",
    "nativeTitle": "Власне меню «Поділитися» вашого пристрою, з листівкою там, де можна додати зображення",
    "nativeFailed": "Меню не відкрилося; скопіюйте або завантажте",
    "copy": "Скопіювати текст",
    "copyTitle": "Скопіювати текст і посилання, готові до вставлення в допис",
    "copied": "Текст і посилання скопійовано",
    "linkCopied": "Посилання скопійовано",
    "copyRefused": "Копіювання не дозволено; текст виділено, скопіюйте його",
    "jpeg": "Завантажити JPEG",
    "jpegTitle": "Зберегти листівку як зображення JPEG, 6 на 4 дюйми, 300 точок на дюйм",
    "pdf": "Завантажити PDF",
    "pdfTitle": "Зберегти листівку як одну сторінку PDF, 6 на 4 дюйми, для друку",
    "email": "Ел. пошта",
    "emailTitle": "Написати лист із текстом і посиланням",
    "emailNote": "Лист не бере зображення: скористайтеся «Поділитися…» або завантажте його.",
    "networksLabel": "Опублікувати в",
    "networkTitle": "Відкрити {network} з цим дописом у новій вкладці",
    "networkLabel": "Опублікувати в {network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name} на Space Radar",
    "failed": "Меню «Поділитися» зараз не вдалося відкрити",
    "mark": "spaceradar.ai",
    "photo": "Режим фото",
    "photoTitle": "Скласти знімок: усе приховано, рамка, підпис",
    "embed": "Вбудувати",
    "embedTitle": "Скопіювати код, який вставляє цей живий вигляд на вебсторінку",
    "embedCopied": "Код для вбудовування скопійовано",
    "embedRefused": "Копіювання зараз не дозволено",
    "embedFrameTitle": "{name}, наживо на Space Radar",
    "textRow": "Текст допису"
  },
  "embed": {
    "open": "Відкрити в Space Radar",
    "openTitle": "Відкрити цей вигляд на повній мапі, у новій вкладці",
    "barLabel": "Space Radar, вбудовано",
    "stationUnread": "Показано Землю: місце станції не вдалося прочитати"
  },
  "density": {
    "panelTitle": "Щільність",
    "regular": "Звичайна",
    "compact": "Компактна",
    "auto": "Автоматично",
    "autoCompact": "Зараз компактна, бо це вікно низьке.",
    "autoRegular": "Зараз звичайна; стає компактною, коли вікно заввишки 800 px або менше."
  },
  "nextList": {
    "justHappened": "Щойно сталося",
    "justHappenedTitle": "Запуски й повернення в атмосферу за останні сім днів",
    "calendar": "Календар",
    "calendarTitle": "Додати «{title}» до календаря: завантажується один файл .ics",
    "calendarSaved": "Збережено {file}",
    "calendarFailed": "Не вдалося створити файл календаря",
    "sameName": "{name} ({id})",
    "title": "Найближчим часом",
    "showAll": "Показати всі ({n})",
    "showFewer": "Показати менше",
    "now": "приблизно зараз",
    "inMinutes": "через {n} хв",
    "inHours": "через {n} год",
    "todayAt": "сьогодні о {time}",
    "tomorrowAt": "завтра о {time}",
    "launch": "{name} злітає {when}",
    "launchRough": "{name} злітає {when}, плюс-мінус: дату ще не визначено",
    "approach": "{name} пролітає повз Землю {when} на відстані {ld}× відстані до Місяця",
    "approachNoDistance": "{name} пролітає повз Землю {when}",
    "sizeM": "Завширшки {n} м",
    "sizeKm": "Завширшки {n} км",
    "sizeRangeM": "Завширшки приблизно від {lo} до {hi} м, оцінка за яскравістю",
    "sizeRangeKm": "Завширшки приблизно від {lo} до {hi} км, оцінка за яскравістю",
    "sizeMixed": "Завширшки приблизно від {lo} м до {hi} км, оцінка за яскравістю",
    "perihelion": "{name} найближче до Сонця {when}",
    "pass": "{name} пролітає над вами {when}",
    "train": "Над вами пролітає потяг із {n} супутників {when}",
    "aurora": "NOAA прогнозує: {word}, з {when} (Kp {kp})",
    "auroraNow": "Триває геомагнітна буря: {word} (Kp {kp})",
    "shower": "Метеорний потік {name} має пік близько {date}: до {zhr} за годину під темним небом",
    "showerMoon": "Метеорний потік {name} має пік близько {date}: до {zhr} за годину під темним небом; тієї ночі Місяць освітлений на {pct}%",
    "showerNoMoon": "Метеорний потік {name} має пік близько {date}: до {zhr} за годину під темним небом; Місяць майже новий",
    "radiantHigh": "Звідти, де ви, його радіант найвище близько {time}",
    "radiantLow": "Звідти, де ви, його радіант усю ніч низько, тож метеорів буде набагато менше",
    "radiantNeverUp": "Звідти, де ви, його радіант тієї ночі під горизонтом",
    "eclipseKinds": {
      "total": "Повне",
      "annular": "Кільцеве",
      "partial": "Часткове",
      "hybrid": "Гібридне",
      "penumbral": "Напівтіньове"
    },
    "solarEclipseTitle": "{kind} сонячне затемнення",
    "lunarEclipseTitle": "{kind} місячне затемнення",
    "solarEclipse": "{kind} сонячне затемнення, {date}: найглибше тінь Місяця падає {where}",
    "solarEclipseGrazing": "{kind} сонячне затемнення, {date}, видно лише з далекої півночі або далекого півдня",
    "lunarEclipse": "{kind} місячне затемнення, {date}: Місяць у тіні Землі для всіх, хто його бачить",
    "lunarEclipsePenumbral": "{kind} місячне затемнення, {date}: Місяць лише трохи тьмяніє в зовнішній тіні Землі",
    "seasonTitles": {
      "march": "Березневе рівнодення",
      "june": "Червневе сонцестояння",
      "september": "Вересневе рівнодення",
      "december": "Грудневе сонцестояння"
    },
    "seasons": {
      "march": "Березневе рівнодення, {date}: день і ніч майже рівні скрізь",
      "june": "Червневе сонцестояння, {date}: на півночі найдовший день, на півдні найкоротший",
      "september": "Вересневе рівнодення, {date}: день і ніч майже рівні скрізь",
      "december": "Грудневе сонцестояння, {date}: на півдні найдовший день, на півночі найкоротший"
    },
    "solstice": "{title}, {date}",
    "equinox": "{title}, {date}",
    "eclipseNear": "біля міста {city}",
    "eclipseFrom": "приблизно за {km} км від міста {city}",
    "eclipseLocal": "Звідти, де ви: починається {begin}, найглибша фаза {peak}, закрито {pct}% Сонця, закінчується {end}",
    "eclipseLocalTotal": "Звідти, де ви: починається {begin}, повна фаза {peak}, закінчується {end}",
    "eclipseNotVisible": "Звідти, де ви, не видно",
    "eclipseBelowHorizon": "Там, де ви, Сонце під горизонтом, поки це триває",
    "classOf": {
      "launch": "План: час, на який націлився постачальник запуску; він може зсунутися",
      "approach": "Обчислено NASA JPL за виміряною орбітою астероїда",
      "perihelion": "Обчислено за опублікованою орбітою комети",
      "shower": "Звична щорічна дата; пік зсувається приблизно на добу",
      "aurora": "Прогноз NOAA, по три години",
      "auroraNow": "Виміряно NOAA за останні кілька годин",
      "pass": "Обчислено тут за елементами орбіти, виміряними {age}",
      "passNoAge": "Обчислено тут за елементами орбіти",
      "eclipse": "Обчислено тут з точністю до хвилини за рухом Сонця й Місяця",
      "season": "Обчислено тут з точністю до хвилини за положенням Сонця",
      "conjunction": "Обчислено тут для вашого місця: коли вони найближчі, поки обидва над горизонтом у темряві"
    },
    "row": {
      "conjunctionTitle": "{a} і {b}",
      "conjunction": "{when} · між ними {sep}°, {height}, напрям: {dir}",
      "conjunctionValue": "{sep}°",
      "low": "низько",
      "mid": "на півдорозі вгору",
      "high": "високо",
      "launch": "Зліт {when} · за планом",
      "launchRough": "Близько {when} · дату не визначено",
      "approach": "Повз Землю {when}",
      "approachValue": "{ld}× до Місяця",
      "approachSized": "Повз Землю {when} · {size}",
      "sizeM": "{n} м",
      "sizeKm": "{n} км",
      "sizeRangeM": "приблизно від {lo} до {hi} м",
      "sizeRangeKm": "приблизно від {lo} до {hi} км",
      "perihelion": "Найближче до Сонця {when}",
      "pass": "Над вами {when}",
      "trainTitle": "Потяг Starlink із {n}",
      "auroraTitle": "Прогноз полярного сяйва",
      "auroraNowTitle": "Геомагнітна буря зараз",
      "aurora": "Прогноз NOAA, з {when}",
      "auroraNow": "Виміряно NOAA за останні години",
      "kp": "Kp {kp}",
      "showerTitle": "Метеори: {name}",
      "shower": "Пік близько {date} · до {zhr} за годину",
      "eclipse": "{date} · обчислено з точністю до хвилини",
      "eclipseHere": "{date} · звідси від {begin} до {end}",
      "eclipseNotHere": "{date} · звідси не видно"
    },
    "none": "У завантаженому нічого найближчим часом немає.",
    "notLoaded": "Не завантажено, тому не в списку: {layers}."
  },
  "groundTrack": {
    "tick": "+{n} хв",
    "label": "Стежити",
    "rideAlong": "Летіти разом",
    "rideAlongTitle": "Поставити камеру одразу позаду нього, щоб дивитися вперед уздовж його траси. Потягніть, щоб зупинити.",
    "lookBeside": "Дивитися збоку",
    "showTrack": "Показати наземний слід",
    "hideTrack": "Сховати наземний слід",
    "highNote": "Його наземний слід так високо сам не малюється: він майже не рухається.",
    "trackNote": "Лінія на глобусі — це поверхня під ним: 45 хвилин назад (пунктиром) і 90 уперед, із позначкою кожні 5 хвилин."
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "Космічна погода: {level} — виміряно {age}, {via}.",
    "forecastOnly": "Космічна погода: {level} — прогноз, а не вимірювання; {via}.",
    "stale": "Це показання старіше, ніж обіцяє NOAA; вважайте його здогадом.",
    "stormComing": "NOAA прогнозує зростання до Kp {kp}.",
    "couldNotLook": "Космічна погода: не вдалося перевірити — {why}",
    "couldNotLook0": "Космічна погода: не вдалося перевірити.",
    "justNow": "щойно",
    "currentBin": "за поточний трьохгодинний період",
    "aMinuteAgo": "хвилину тому",
    "minutesAgo": "{n} хв тому",
    "anHourAgo": "годину тому",
    "hoursAgo": "{n} год тому",
    "aDayAgo": "добу тому",
    "daysAgo": "{n} дн. тому",
    "ageUnknown": "у час, якого NOAA не вказала",
    "viaLive": "NOAA SWPC, зчитано наживо",
    "viaSnapshot": "NOAA SWPC, з нашої копії",
    "words": {
      "unknown": "немає даних",
      "quiet": "спокійно",
      "unsettled": "неспокійно",
      "active": "активно",
      "minorStorm": "слабка буря — полярне сяйво можливе далеко на півночі й півдні",
      "moderateStorm": "помірна буря — полярне сяйво ймовірне у високих широтах",
      "strongStorm": "сильна буря — полярне сяйво далеко від полюсів, супутники зсуває з курсу",
      "severeStorm": "дуже сильна буря",
      "extremeStorm": "екстремальна буря"
    }
  },
  "chooser": {
    "label": "Об’єкти під вашим пальцем",
    "hint": "Тут: {n}. Торкніться одного або неба, щоб закрити."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "Закрити",
    "closeTitle": "Закрити цю картку (Escape)",
    "it": "Це",
    "articles": [
      "\u200b",
      "\u200b"
    ],
    "leadVerbs": [
      "—",
      "був"
    ],
    "makeCentre": "Зробити {name} центром мапи",
    "isCentre": "Це центр мапи",
    "centreShort": "Центрувати тут",
    "ownPage": "Власна сторінка",
    "ownPageTitle": "Сторінка про нього, на яку можна дати посилання, у новій вкладці",
    "isCentreShort": "Центровано тут",
    "comparisonsLabel": "Щоб відчути масштаб",
    "rightNowLabel": "Зараз",
    "seeItLabel": "Побачити звідси",
    "actionsLabel": "Що можна зробити",
    "unknownName": "Об’єкт без назви",
    "unknownKind": "{name} є на мапі, але ми не знаємо, що це за об’єкт",
    "rows": {
      "altitude": "Висота над землею",
      "speed": "Швидкість",
      "groundPoint": "Пролітає над",
      "below": "Під ним зараз",
      "fromYou": "Відстань від вас",
      "fromGuess": "Відстань від {place} — наша здогадка про ваше місце",
      "distanceFromEarth": "Відстань від Землі",
      "distanceFromSun": "Відстань від Сонця",
      "lightLeft": "Його світло вирушило",
      "sunlight": "Зараз воно",
      "hostStar": "Його зоря",
      "across": "Поперечник",
      "mass": "Маса",
      "spin": "Один оберт триває",
      "source": "Прочитано з",
      "whySource": "Чому це відомо, прочитано з",
      "widthSource": "Ширину прочитано з",
      "distanceNote": "Приблизно така відстань",
      "objectType": "Що це",
      "constellation": "Сузір’я",
      "distanceRange": "Відстань, найкращі оцінки",
      "planetRadius": "Поперечник, у діаметрах Землі",
      "planetMass": "Маса, у масах Землі",
      "yearLength": "Один рік там",
      "found": "Відкрито",
      "catalogueCopy": "Копія з каталогу",
      "spectralType": "Тип зорі",
      "brightness": "Яскравість на вигляд",
      "luminosity": "Світність",
      "starWidth": "Поперечник",
      "catalogue": "Каталог",
      "iauName": "Назва, схвалена МАС",
      "lightTime": "Радіосигналу в один бік",
      "nextPass": "Наступний проліт над вами",
      "crew": "Людей на борту",
      "operator": "Керує",
      "launched": "Запущено",
      "ended": "Завершено",
      "pathEnds": "Його траєкторія закінчується",
      "pathBegins": "Його траєкторія починається",
      "period": "Один виток триває",
      "location": "Де він стоїть",
      "onBody": "На",
      "whenSite": "Коли",
      "onWorld": "Стоїть на",
      "orbiting": "На орбіті навколо",
      "heightAbove": "Висота над поверхнею ({world})",
      "closestApproach": "Найближче до Землі",
      "moons": "Супутники",
      "perihelion": "Найближче до Сонця",
      "magnitude": "Яскравість",
      "phase": "Фаза",
      "liftoff": "Старт",
      "pad": "Звідки",
      "destination": "Куди прямує",
      "whereabouts": "Де він",
      "lastSeen": "Востаннє відомо",
      "stormNow": "За останнім повідомленням",
      "stormWind": "Найсильніший вітер на траєкторії",
      "stormAdvisory": "Останнє повідомлення",
      "stormCentre": "Його центр",
      "stormAgency": "Повідомляє",
      "stormAlert": "Рівень тривоги GDACS"
    },
    "values": {
      "km": "{n} км",
      "kmh": "{n} км/год",
      "belowBorder": "біля кордону: {a} і {b}",
      "belowLand": "суходіл",
      "belowWater": "відкрита вода",
      "stormWind": "{n} км/год, з урахуванням прогнозу",
      "stormWindCategory": "{n} км/год, категорія {cat}, з урахуванням прогнозу",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "сила урагану",
        "typhoon": "сила тайфуну",
        "cyclone": "сила циклону",
        "storm": "тропічний шторм",
        "depression": "тропічна депресія"
      },
      "stormAlert": {
        "green": "зелений",
        "orange": "помаранчевий",
        "red": "червоний"
      },
      "launchedAgo": "{n} дн. тому, {date}",
      "au": "{n} а. о.",
      "lightYears": "{n} св. р.",
      "inSunlight": "на сонячному світлі",
      "inShadow": "у тіні Землі",
      "yearsAgo": "{n} р. тому",
      "monthsAgo": "{n} міс. тому",
      "suns": "{n}× Сонця",
      "sunsWide": "{n}× Сонця, оцінка",
      "sunsWideMeasured": "{n}× Сонця, виміряно",
      "earths": "{n}× Землі",
      "lightYearsRange": "від {lo} до {hi} св. р.",
      "kmRange": "від {lo} до {hi} км",
      "noMoonsKnown": "жодного відомого",
      "sunsRange": "від {lo} до {hi}× Сонця",
      "millionSuns": "{n} млн Сонць",
      "billionSuns": "{n} млрд Сонць",
      "milliseconds": "{n} мс",
      "billionYearsAgo": "{n} млрд років тому",
      "millionYearsAgo": "{n} млн років тому",
      "days": "{n} діб",
      "hours": "{n} год",
      "yearByMethod": "{year}, {method}",
      "asOf": "станом на {date}",
      "magnitude": "зоряна величина {n}",
      "lunar": "{n}× відстані до Місяця",
      "minutes": "{n} хв",
      "seconds": "{n} с",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{world}: {lat}, {lon}",
      "north": "{n}° пн. ш.",
      "south": "{n}° пд. ш.",
      "east": "{n}° сх. д.",
      "west": "{n}° зх. д."
    },
    "couldNotLook": "Не вдалося обчислити",
    "nobodyKnows": "Ніхто не знає",
    "wouldNeed": "Для цього знадобилося б: {wouldNeed}.",
    "endedLine": "Місію завершено {date}. Події нижче ведуть до того часу.",
    "pathEndedLine": "Траєкторія, яку має JPL, закінчується {date}. Події нижче ведуть до того часу.",
    "pathBeginsLine": "Траєкторія, яку має JPL, починається {date}. Події нижче ведуть до того часу.",
    "actions": {
      "flyTo": "Летіти",
      "flyToTitle": "Перемістити камеру до цього об’єкта",
      "flyEnded": "Завершено {date}. Виберіть подію його місії, щоб перейти туди",
      "flyPathEnded": "Траєкторія закінчується {date}. Виберіть подію його місії, щоб перейти туди",
      "flyPathBegins": "Траєкторія починається {date}. Виберіть подію його місії, щоб перейти туди",
      "flyNowhere": "У цю мить положення цього об’єкта невідоме",
      "seeFromHere": "Побачити звідси",
      "seeFromHereTitle": "Подивитися вгору зі свого місця на Землі",
      "follow": "Стежити",
      "followTitle": "Летіти до нього й тримати його посеред кадру",
      "ride": "Летіти разом",
      "rideShort": "Разом",
      "seeShort": "Побачити",
      "postcard": "Листівка",
      "share": "Поширити"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "Планета",
      "moon": "Природний супутник",
      "dwarf": "Карликова планета",
      "ourStar": "Зоря",
      "exoplanet": "Екзопланета"
    },
    "regime": {
      "leo": "Низька навколоземна орбіта",
      "meo": "Середня навколоземна орбіта",
      "geo": "Геостаціонарна орбіта",
      "heo": "Висока навколоземна орбіта",
      "inner": "Внутрішня частина Сонячної системи",
      "outer": "Зовнішня частина Сонячної системи",
      "belt": "Пояс астероїдів",
      "beyondNeptune": "За Нептуном",
      "round": "Орбіта: {world}",
      "inCon": "У сузір’ї {con}",
      "onWorld": "Поверхня: {world}",
      "centre": "Центр Сонячної системи",
      "nearby": "Серед найближчих"
    },
    "hero": {
      "label": "У трьох числах",
      "missing": "—",
      "captions": {
        "altitude": "{u} над землею",
        "away": "{u} від нас",
        "speed": "{u}",
        "period": "{u} на виток",
        "distanceFromSun": "{u} від Сонця",
        "distanceFromEarth": "{u} від Землі",
        "lightTime": "{u} в один бік",
        "spin": "{u} на оберт",
        "yearLength": "{u} на рік",
        "brightness": "зоряна величина",
        "spectralType": "клас зорі",
        "across": "{u} завширшки",
        "lightLeft": "{u} від нас",
        "launched": "діб у космосі",
        "fromYou": "{u} від вас",
        "heightAbove": "{u} над поверхнею",
        "other": "{u}"
      },
      "units": {
        "minutes": "хв",
        "hours": "год",
        "days": "діб",
        "seconds": "с",
        "milliseconds": "мс",
        "astronomical units": "а. о.",
        "light-years": "св. р.",
        "years ago": "св. р.",
        "million years ago": "млн св. р.",
        "billion years ago": "млрд св. р.",
        "months ago": "св. міс."
      }
    },
    "sections": {
      "label": "Більше про нього",
      "see": "Коли його видно",
      "path": "Його траєкторія",
      "aboard": "Хто на борту",
      "ridingOn": "На чому він летить",
      "about": "Про нього",
      "sources": "Джерела цього запису",
      "placeGuessed": "місце вгадано",
      "needsPlace": "потрібне ваше місце",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "Намальовано груп сонячних плям: {n}. Їх узято зі списку NOAA на {date}: кожну — як одну круглу пляму на повідомленому місці й повідомленого розміру, перенесену обертанням Сонця відтоді.",
    "spotsOne": "Намальовано одну групу сонячних плям зі списку NOAA на {date}: як одну круглу пляму на повідомленому місці й повідомленого розміру, перенесену обертанням Сонця відтоді.",
    "spotsPaired": "Намальовано груп сонячних плям: {n}. Їх узято зі списку NOAA на {date} і перенесено обертанням Сонця відтоді. Груп із кількома плямами: {pairs}; їх намальовано як головну пляму на заході й хвостову на сході, а проміжок між ними та поділ площі між двома ілюстративні. Решту намальовано як одну круглу пляму.",
    "spotsPairedOne": "Намальовано одну групу сонячних плям зі списку NOAA на {date}, перенесену обертанням Сонця відтоді: як головну пляму на заході й хвостову на сході. Проміжок між ними та поділ площі між двома ілюстративні.",
    "regionsCredit": "Сьогоднішні групи сонячних плям: NOAA Space Weather Prediction Center, зведення сонячних областей",
    "flaresCredit": "Сонячні спалахи: NOAA Space Weather Prediction Center, відредагований список подій",
    "cmeCredit": "Корональні викиди маси: NASA DONKI (Moon to Mars Space Weather Analysis Office і CCMC)"
  },
  "clouds": {
    "live": "Хмари: зафіксовано {when}, {ago}, в інфрачервоному світлі супутниками {satellites} через NASA GIBS. Найхолодніші верхівки, де грози, намальовано вищими й біліше за решту. Над Європою, Африкою, Індійським океаном і полюсами, яких жоден із цих супутників не бачить, хмари ілюстративні.",
    "at": "о {time} UTC",
    "between": "між {from} і {to} UTC",
    "atDated": "{date} о {time} UTC",
    "betweenDated": "{date} між {from} і {to} UTC",
    "clockElsewhere": " Годинник показує {time} UTC, {date}; хмари залишаються такими, якими їх бачив той знімок.",
    "and": " і ",
    "illustrative": "Хмари: ілюстративні. Це один знімок дня в минулому, що повільно дрейфує; це не сьогоднішня погода.",
    "illustrativeSaveData": "Хмари: ілюстративні. Сьогоднішні супутникові знімки не завантажуються на з’єднанні, що економить трафік.",
    "illustrativeScrubbed": "Хмари: ілюстративні, бо годинник більш ніж на 12 годин віддалений від останнього супутникового знімка, {date} о {time} UTC.",
    "gibsAcknowledgement": "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",
    "satelliteCredit": "Живі хмари: інфрачервоні знімки GOES-East і GOES-West, NOAA; інфрачервоні знімки Himawari, Японське метеорологічне агентство (JMA)."
  },
  "aurora": {
    "live": "Полярне сяйво: де його очікує модель OVATION від NOAA протягом наступної години (прогноз на {time} UTC, зроблений {ago}), а не фотографія. Тонкі складки в ньому намальовано.",
    "liveNoFolds": "Полярне сяйво: де його очікує модель OVATION від NOAA протягом наступної години (прогноз на {time} UTC, зроблений {ago}), а не фотографія.",
    "waiting": "Полярне сяйво: прогноз NOAA ще не надійшов.",
    "failed": "Полярне сяйво: прогноз NOAA зараз не вдалося прочитати, тому нічого не намальовано.",
    "far": "Полярне сяйво: не намальовано, бо годинник більш ніж на три години віддалений від останнього прогнозу NOAA.",
    "saveData": "Полярне сяйво: прогноз NOAA не завантажується на з’єднанні, що економить трафік.",
    "switchedOff": "Полярне сяйво: вимкнено в шарах.",
    "credit": "Полярне сяйво: прогноз за моделлю OVATION Prime від NOAA Space Weather Prediction Center (суспільне надбання).",
    "rightNow": "Полярне сяйво ймовірне біля полюсів",
    "rightNowReach": "Полярне сяйво ймовірне аж до широти {lat}°",
    "rightNowValue": "Kp {kp}",
    "showMe": "Летіти до полярного сяйва на нічному боці"
  },
  "weather": {
    "lightning": {
      "live": "Блискавки: ударів на хвилину — близько {n} там, куди сягає мапа NOAA, тобто в Америці й над Тихим океаном (її підрахунок до {time}, {ago}). Де саме й як часто — виміряно; мить кожного спалаху намальована, і більшою, ніж насправді.",
      "quiet": "Блискавки: майже немає там, куди сягає мапа NOAA, тобто в Америці й над Тихим океаном (її підрахунок до {time}, {ago}).",
      "waiting": "Блискавки: мапа NOAA ще не надійшла.",
      "failed": "Блискавки: мапу NOAA зараз не вдалося прочитати, тому нічого не намальовано.",
      "away": "Блискавки: не намальовано, бо годинник більш ніж на годину віддалений від останньої мапи NOAA.",
      "off": "Блискавки: не завантажуються на цьому пристрої чи з’єднанні.",
      "reducedMotion": "Блискавки: не намальовано, бо цей пристрій просить менше руху.",
      "switchedOff": "Блискавки: вимкнено в шарах.",
      "credit": "Блискавки: щільність ударів із NOAA nowCOAST, яку створив Центр прогнозування океану NWS за наземними мережами NLDN і GLD360 (суспільне надбання)."
    },
    "worlds": {
      "jupiter": "Погода: смуги ковзають одна повз одну зі швидкістю вітру, виміряною з Hubble, а Велика червона пляма обертається. Змодельований рух: жодної хмари не намальовано там, де вона є сьогодні.",
      "saturn": "Погода: смуги рухаються зі швидкістю вітру, яку виміряв Cassini. Змодельований рух, а не сьогоднішні хмари. Шестикутник на північному полюсі намальовано на його виміряному місці; його вигляд ілюстративний.",
      "venus": "Погода: хмарний покрив обертається приблизно за чотири доби, як виміряв Venus Express, у шістдесят разів швидше за поверхню. Змодельований рух, а не сьогоднішні хмари.",
      "uranus": "Погода: повітря дрейфує навколо зі швидкістю вітру, виміряною з Keck і Gemini. Змодельований рух, а не сьогоднішні хмари.",
      "neptune": "Погода: повітря мчить навколо зі швидкістю вітру, яку виміряв Voyager 2, — найбільшою на будь-якій планеті. Змодельований рух, а не сьогоднішні хмари.",
      "mars": "Погода: на Марсі зараз {season}. Полярні шапки з інею й пил у повітрі, оптична товща близько {tau}, — це те, що зазвичай приносить цей сезон: сезонне й ілюстративне, а не сьогоднішня погода.",
      "titan": "Погода: світлі смуги на півночі позначають метанові хмари, які телескопи Webb і Keck побачили там у листопаді 2022 і липні 2023 року. Ілюстративно: де хмари Титана сьогодні, невідомо."
    },
    "also": {
      "venus": "Темна літера Y, що обертається разом із ними, — те, що бачать ультрафіолетові камери; оку Венера майже однорідна, і місце цієї позначки тут ілюстративне. Про блискавки на Венері повідомлялося, і суперечки тривають; жодної не намальовано.",
      "uranus": "Яскрава шапка над північним полюсом справжня: її яскравість і колір, широта за широтою, узято з мапи Hubble за жовтень 2025 року, і Hubble рік за роком бачить, як вона яскравішає в міру наближення північного літа 2028 року.",
      "neptune": "Темний овал на мапі художника — Велика темна пляма Voyager 2 у 1989 році, якої вже не було у 1994-му: ілюстративна, у вигляді «Виміряний» не намальована. У вигляді «Кіно» метанові перисті хмари відкидають тіні, намальовані в шість разів ширшими й вищими, ніж виміряно; кожна смуга — наша."
    },
    "flashes": {
      "jupiter": "На нічному боці рідкісні спалахи позначають блискавки, які знайшов Juno, здебільшого далеко на півночі: широти виміряно, кожен спалах ілюстративний і намальований більшим, ніж насправді.",
      "saturn": "На нічному боці рідкісні спалахи на 36 градусах південної широти позначають блискавки, які Cassini сфотографував там у 2009 році: ілюстративно й більшими, ніж насправді; зараз за ними ніхто не стежить."
    },
    "seasons": [
      "північна весна",
      "північне літо",
      "північна осінь",
      "північна зима"
    ]
  },
  "drawing": {
    "orbitLine": "Лінія — це один виток уперед, обчислений за тими самими елементами, що й крапка.",
    "orbitLineYear": "Лінія — це наступний рік його шляху, обчислений за тими самими елементами, що й крапка.",
    "orbitLineWhole": "Лінія — це вся його орбіта навколо Сонця, обчислена за тими самими елементами, що й крапка.",
    "orbitLinePassage": "Лінія — це його єдиний проліт крізь Сонячну систему, досередини й назовні, обчислений за тими самими елементами, що й крапка.",
    "variant": "намальовано за опублікованими розмірами для {name}",
    "family": "намальовано як {name} — форма й висота родини, а не саме цієї версії",
    "generic": "намальовано як типова ракета; розмірів для {name} у нас немає",
    "genericUnnamed": "намальовано як типова ракета; розмірів для цього носія у нас немає",
    "disputed": "джерела розходяться щодо його висоти ({disputed})",
    "objectVariant": "намальовано за опублікованими розмірами для {name}",
    "objectModel": "намальовано за опублікованою моделлю {name}",
    "padEmpty": "стартовий майданчик — виміряне місце; {name} намальовано на ньому лише навколо перелічених запусків",
    "objectMapped": {
      "dawn": "його поверхня — чорно-білий мозаїчний знімок апарата Dawn, підфарбований обраним нами сірим; тіні в його кратерах — ті, які сфотографував Dawn, і вони тут не рухаються разом із Сонцем"
    },
    "objectFamily": "намальовано як {name} — як приклад такого роду, а не саме цей об’єкт",
    // b200-m2-buses: begin
    "objectBus": "Платформа: {bus} ({source}). Намальовано із платформою-замінником.",
    // b200-m2-buses: end
    "objectOwn": "намальовано як {name}",
    "objectMade": {
      "images": "форму побудовано за фотографіями; пропорції наближені",
      "render": "форму побудовано за художнім зображенням; пропорції наближені",
      "dimensions": "форму побудовано за опублікованими розмірами й знімками; деталі спрощено"
    },
    "objectWas": {
      "hitomi": "показано цілим, яким його запустили в лютому 2016 року; через п’ять тижнів він розпався, і тут відстежується його головний корпус без сонячних панелей",
      "envisat": "показано стійким, з приладами до Землі, яким він літав, поки працював; з 2012 року він мертвий, і ніхто ним не керує",
      "ers1": "показано стійким, з приладами до Землі, яким він літав, поки працював; його місія завершилася в 2000 році, і ніхто ним не керує"
    },
    "objectGeneric": "намальовано як типовий об’єкт; форми {name} у нас немає",
    "classShape": {
      "satellite": "типовий супутник",
      "station": "типова космічна станція",
      "debris": "уламок",
      "rocket": "типова ракета",
      "probe": "типовий зонд",
      "telescope": "типовий телескоп",
      "asteroid": "типовий астероїд",
      "dwarf": "проста кругла куля його виміряного розміру",
      "comet": "типова комета",
      "site": "типове наземне місце",
      "star": "точка світла, розмір якої залежить від того, яким яскравим воно здається звідти, де ви",
      "exoplanet": "позначка біля його зорі — сама орбіта надто мала, щоб її намалювати",
      "dso": "м’яке сяйво, типове для об’єктів його роду, на виміряній відстані, такої ширини, яку воно має за виміром; візерунок у ньому ілюстративний, а справжню форму не намальовано",
      "exotic": "кільце на виміряній відстані; чорна діра не має форми, яку можна намалювати, а пульсар надто малий",
      "exoticStar": "кільце на виміряній відстані; сама зоря в цьому масштабі — точка"
    },
    "storm": "намальовано як позначку в його центрі; сам шторм — це хмара навколо неї",
    "feature": "назване місце: тут нічого не намальовано, крім позначки в його центрі, поставленої за наведеним довідником; ґрунт під нею — це сама мапа",
    "markOnly": "позначка на його місці; там немає чого малювати",
    "noPlace": "не намальовано: немає його місця, яке можна було б позначити",
    "shower": "назва в точці, з якої нібито летять його метеори, на вигляді неба поблизу піку; це напрям, а не місце в космосі",
    "objectSpin": {
      "spin": "він обертається навколо свого виміряного полюса з виміряною швидкістю; яким боком він зараз повернений до Сонця, не є прогнозом",
      "pair": "обидва обертаються навколо своїх виміряних полюсів із виміряною швидкістю, а Діморфос обертається на відстані й за період, виміряні після удару DART; де він на цій орбіті, ілюстративно",
      "comet": "він обертається навколо свого виміряного полюса зі швидкістю, виміряною в 2014 році, яку Сонце з кожним проходом змінювало на хвилини; яким боком він зараз повернений до Сонця, не є прогнозом",
      "still": "його намальовано в орієнтації його радарної моделі, і тут він не обертається: модель не вказує, куди спрямована його вісь обертання",
      "moonSpin": "вона завжди повернута до Сатурна однією стороною й робить один оберт за виток навколо полюса, який дають для неї сталі МАС; яка сторона дивиться на камеру в цю мить, визначає ця формула, це не прогноз",
      "moonStill": "вона намальована в орієнтації своєї моделі й тут не обертається: у сталих, які читає цей застосунок, для неї немає стійкого полюса й швидкості обертання"
    },
    "objectSeen": {
      "lutetia": "знімки Rosetta охопили понад половину його поверхні; решту форми підібрано за змінами яскравості, а не сфотографовано",
      "steins": "знімки Rosetta охопили близько 60 відсотків його поверхні; решту форми підібрано за змінами яскравості, а не сфотографовано",
      "donj": "форму побудовано за знімками Lucy методом стереофотограмметрії та підгонкою обрису; бік, якого Lucy не бачив, — це результат підгонки",
      "arrokoth": "знімки New Horizons охоплюють бік, повз який він пролетів; другий бік виведено, а не сфотографовано, а колір — це його мапа альбедо в червоному відтінку",
      "radar": "форму побудовано за радіолокаційними відлуннями, а не за знімками: його обрис виміряно, а найдрібніші деталі — ні",
      "comet": "це форма за Rosetta, більш ніж із 20 000 знімків за два роки, і вся поверхня охоплена",
      "cassini": "форму побудовано за знімками Cassini, і похибка зазвичай значно менша за пів кілометра; те, чого Cassini не бачив, узято з підгонки, не сфотографовано"
    },
    "objectRelief": "модель спрощено, а дрібний рельєф на ній — із повної моделі, запечений у поверхню",
    "worldFlat": "намальовано як просту кулю: мапи поверхні {name} тут немає, а його єдиний колір обрано за опублікованими описами, а не виміряно",
    "worldFlatIrregular": "намальовано як просту кулю розміром із його середній радіус: мапи поверхні {name} тут немає, його єдиний колір обрано за опублікованими описами, а не виміряно, а {name} насправді — бугриста брила, справжню форму якої не намальовано",
    "worldFlatShaped": "намальовано у виміряній формі й одним кольором: мапи поверхні {name} тут немає, а колір обрано за опублікованими описами, а не виміряно",
    "worldShaped": "намальовано у виміряній формі",
    "worldMap": {
      "tinted": "його поверхня — чорно-білий мозаїчний знімок, підфарбований кольором, обраним за опублікованими описами",
      "toned": "його кольори взято зі знімків в інфрачервоному, зеленому й ультрафіолетовому світлі та наближено до того, що побачило б око",
      "redblue": "його кольори взято з червоних і синіх знімків New Horizons, із зеленим посередині між ними та кольором, посиленим у півтора раза; ділянки, сфотографовані лише чорно-білими, мають середній колір мапи",
      "enhanced": "його кольори — ті, що опублікувала NASA, складені з трьох кольорових фільтрів New Horizons, жоден із яких не зелений: це посилений колір, сильніший за те, що побачило б око, і не такий самий",
      "balanced": "його кольори взято зі знімків в оранжевому, зеленому й синьому світлі, збалансовано до опублікованого кольору та наближено до того, що побачило б око",
      "infrared": "його поверхня — мапа в ближньому інфрачервоному світлі, зроблена крізь серпанок, підфарбована й пом’якшена; у видимому світлі серпанок ховає поверхню",
      "natural": "його кольори — природні, з червоного й синього світла, яке виміряла кольорова камера New Horizons, а зелений, для якого фільтра не було, оцінено між ними й посилено у два з половиною раза проти власного кольору камери, як його показують природнокольорові знімки NASA",
      "matched": "його кольори починаються з червоного й синього світла, яке виміряла кольорова камера New Horizons, із зеленим, для якого фільтра не було й який оцінено між ними, а потім відтінок за відтінком підганяються до власного кольорового знімка NASA цього боку (PIA19952): сильніші за кольори камери, як NASA їх опублікувала"
    },
    "worldCoverage": {
      "miranda": "сфотографовано лише південну половину, апаратом Voyager 2 у 1986 році; решту залишено однорідною, а не вгадано",
      "ariel": "сфотографовано лише південну половину, апаратом Voyager 2 у 1986 році; решту залишено однорідною, а не вгадано",
      "umbriel": "сфотографовано лише південну половину, апаратом Voyager 2 у 1986 році; решту залишено однорідною, а не вгадано",
      "titania": "сфотографовано лише південну половину, апаратом Voyager 2 у 1986 році; решту залишено однорідною, а не вгадано",
      "oberon": "сфотографовано лише південну половину, апаратом Voyager 2 у 1986 році; решту залишено однорідною, а не вгадано",
      "triton": "Voyager 2 сфотографував частину його поверхні в 1989 році; решту залишено однорідною, а не вгадано",
      "pluto": "крайній південь був у зимовій темряві, коли New Horizons пролітав у 2015 році: намальована там поверхня змодельована — ледь помітна текстура в кольорах землі над нею, а не фотографія",
      "charon": "крайній південь був у зимовій темряві, коли New Horizons пролітав у 2015 році: намальована там поверхня змодельована — ледь помітна текстура в кольорах землі над нею, а не фотографія"
    },
    "worldLit": "освітлено так, як його показала б камера, налаштована на його власне сонячне світло",
    "worldLight": "здалеку це світло з обчисленою яскравістю: сяйво — те, як камера записує точку, надто яскраву, щоб її розрізнити",
    "exoticDeparture": {
      "pulseSlowed": "його блимання намальовано в {n} разів повільнішим за обертання, щоб око могло за ним стежити",
      "pulseTrue": "його блимання намальовано з тією швидкістю, з якою він обертається",
      "portrait": "поки ця картка відкрита, на його місці намальовано його модель, набагато більшу, ніж він виглядав би звідси: тінь і світло, викривлені навколо нього так, як цього вимагає його маса, диск змодельовано"
    },
    "worldDeparture": {
      "earth": "на більшому екрані його гори взято з висот NOAA ETOPO 2022 і намальовано в {relief} разів крутішими, ніж вони є, щоб низьке Сонце їх показувало; сяйво повітря навколо його краю намальовано в {air} разів вищим, ніж повітря є; з низької орбіти на більшому екрані його хмари здіймаються до обрію й під низьким Сонцем, намальовані в {clouds} разів товщими, ніж вони є, щоб було видно їхній нахил, довгі тіні й останнє світло на верхівках (у справжню товщину — у вигляді «Виміряний»), а висоту кожної верхівки взято з її виміряної температури там, де сьогоднішній знімок охоплює, і з яскравості хмарної мапи в інших місцях",
      "mercury": "на більшому екрані його рельєф узято з моделі висот MESSENGER і намальовано в {steep} разів крутішим, ніж виміряно, щоб краї кратерів ловили світло",
      "pluto": "його світлу й темну поверхню намальовано з контрастом у {plutoContrast} разів більшим, ніж на знімку камери, ближчим до виміряних альбедо; бік, який New Horizons бачив лише здалеку, пом’якшено до його власної різкості; на більшому екрані його рельєф узято зі стереовисот New Horizons, де вони є, і намальовано в {plutoSteep} разів крутішим, ніж виміряно; тонкий синій серпанок на його краю намальовано як сяйво, найяскравіше проти Сонця, силу якого обрано",
      "mars": "на більшому екрані його рельєф узято з висот, які виміряв лазерний висотомір Mars Global Surveyor, і намальовано в {mola} разів крутішим і вищим, ніж вони є, щоб низьке Сонце їх показувало: тіні від Олімпу й стін каньйону в стільки ж разів задовгі.",
      "venus": "сяйво навколо його краю й за його денним боком позначає глибокий серпанок; наскільки він товстий і як далеко сягає, намальовано ілюстративно; у вигляді «Кіно» його хмарні смуги намальовано з контрастом у {uv} разів більшим, ніж у його мапі, як їх бачать ультрафіолетові камери (оку вони майже однорідні), а вигляд «Виміряний» показує мапу такою, яка вона є; його поверхню, виміряну радаром, показано рельєфом за висотоміром Magellan, у {ground} разів крутішим і вищим, ніж виміряно",
      "neptune": "у вигляді «Кіно» п’ять дуг його зовнішнього кільця намальовано такими, якими їх бачив Voyager 2 у 1989 році, і вони обертаються з виміряною швидкістю; де вони на кільці сьогодні, не обчислено, а дві з них відтоді згасли або зсунулися",
      "saturn": "його смуги намальовано з контрастом у {contrast} разів більшим, ніж у його мапі, це наше коригування; «Яким його бачив Hubble» не коригується; на більшому екрані й зблизька кільцеві смужки й проміжки в його кільцях — там, де їх виміряв Cassini крізь світло зорі у 2008 році, накладені на мапу, а у вигляді «Кіно» ще ближче намальовано мерехтіння зерен; у межах кількох кілометрів від кілець на більшому екрані, у вигляді «Кіно», їхні найбільші частинки завширшки від двох до п’яти метрів намальовано кулями з льоду: скільки їх і які вони великі, випливає з виміряного розподілу розмірів і оптичної товщі кілець, але де кожна з них і де згустки в кільці A, ілюстративно, і їх намальовано нерухомими, ніби ви летите разом із ними",
      "titan": "трохи вище його серпанку, на висоті близько 500 км, намальовано тонкий відокремлений шар серпанку там, де Cassini бачив його у 2005–2007 роках; він опустився й згас у наступні роки, і де він зараз, невідомо"
    },
    "worldEarthshine": "його темний бік світиться попелястим сяйвом — власним світлом Землі, намальованим у {n} разів яскравішим, ніж його вловила б камера, приблизно так, як його бачить око",
    "worldAir": "його повітря намальовано в {n} разів товщим, ніж воно є, щоб воно було видно в такому розмірі, а колір його серпанку ілюстративний",
    "worldAirTrue": "його серпанок намальовано на виміряній висоті, а його колір ілюстративний",
    "worldRings": "його кільця на виміряних відстанях, намальовані в {w} разів ширшими й набагато яскравішими, ніж вони є, щоб їх було видно: справжні — це нитки, темні, як вугілля",
    "worldRingsDense": "його кільця на виміряних відстанях, намальовані в {w} разів ширшими, в {d} разів непрозорішими й набагато яскравішими, ніж вони є, щоб їх було видно: справжні — це слабкі нитки, темні, як вугілля",
    "worldSun": "зблизька його край темнішає й червоніє так, як це має робити за моделлю його атмосфери; зернистість позначає його киплячу поверхню: її комірки народжуються, яскравішають і згасають, як справжні гранули, намальовані грубішими, ніж вони є (зблизька до справжнього розміру), і набагато швидшими, а яскрава сітка ближче до краю ілюстративна; зовсім зблизька сфотографована мапа поступається місцем намальованій поверхні, яка теж ілюстративна; корона ілюстративна й намальована набагато яскравішою, ніж вона є, щоб її було видно; петлі й живоплоти на краю стоять там, де за даними NOAA активні області біля лімба, а їхні форми й висоти ілюстративні; зорі поруч вицвілі, бо його сяйво ховає їх від будь-якої камери",
    "worldMosaic": "Під камерою зараз: {title}, намальовано тут приблизно по {res} на піксель.",
    "worldMosaicDetail": "Під камерою зараз: {title}, що уточнює кольорову мапу приблизно по {res} на піксель.",
    "worldRelief": "Його рельєф узято з {title}: малюнок схилів під одним нерухомим світлом. Схили вздовж цього світла освітлено знову Сонцем там, де воно зараз, у {n} разів крутішими, ніж виміряно; схили впоперек нього не намальовано.",
    "worldReliefTrue": "Його рельєф узято з {title}: малюнок схилів під одним нерухомим світлом. Схили вздовж цього світла освітлено знову Сонцем там, де воно зараз; схили впоперек нього не намальовано.",
    "worldReliefBaked": "Його пагорби затінено в цій мапі під нерухомим світлом, а не Сонцем там, де воно зараз.",
    "mount": "те, де ми його чіпляємо на моделі, — наше власне розташування, і його намальовано набагато більшим, ніж він є: у справжньому розмірі він був би замалий, щоб його побачити"
  },
  "trip": {
    "notEnoughStops": "Зараз можна знайти лише {count} зупинок цієї подорожі, а потрібно щонайменше {min}.",
    "heldBody": "Цього об’єкта зараз не вдалося знайти. Усе інше в подорожі працює.",
    "heldTitle": "Не вдалося знайти цей об’єкт",
    "stopOf": "зупинка {n} з {count}",
    "planning": "З’ясовуємо, що можна показати…",
    "shape": "Зупинок: {count} · {mins} хв",
    "shapeOneMinute": "Зупинок: {count} · 1 хв",
    "startTitle": "Пролетіти цю подорож",
    "nextEventLine": "Далі: {date}",
    "introStart": "Почати",
    "introSkip": "Не зараз",
    "introMicro": "Подорож із гідом",
    "stopsLabel": "Зупинки",
    "startAtTitle": "Почати подорож із зупинки {n}",
    "droppedOne": "Одну зупинку сьогодні показати не можна, її не враховано вище.",
    "droppedMany": "Зупинок, які сьогодні показати не можна й які не враховано вище: {n}.",
    "clockClamped": "Для цієї подорожі час повернено до звичайної швидкості.",
    "clockMoves": "Ця подорож переставляє годинник. Коли ви вийдете, його повернуть назад.",
    "clockRestored": "Коли ви вийдете, годинник повернеться туди, де був.",
    "stopTimeNow": "Показано зараз",
    "stopTimeAt": "Показано: {when}",
    "stopTimeRate": "Показано: {when}, час іде так: {rate}",
    "stopTimePaused": "Показано: {when}, час стоїть, поки подорож на паузі",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "Тінь обчислено за положеннями Місяця й Сонця; час — з Astronomy Engine, з точністю до хвилини. Тонкі лінії й бліда смуга позначають краї тіні та шлях її ядра: це лінії на мапі, а не світло.",
    "eclipseLineLatched": "Тінь на цьому пристрої не малюється; час правильний.",
    "eclipseColour": "Колір ілюстративний; тінь обчислена.",
    "orbitsLine": "Планети намальовано крапками, більшими, ніж вони є; їхні місця й шляхи обчислено.",
    "moonPathLine": "Землю й Місяць намальовано крапками, більшими, ніж вони є, кожну освітлену з боку, повернутого до Сонця. Місце Місяця та його шлях обчислено.",
    "systemLine": "Розміри й орбіти — з NASA Exoplanet Archive; кольори і нахил орбіт ілюстративні.",
    "systemLineGuessed": "Розміри й орбіти — з NASA Exoplanet Archive; кольори, місця планет на їхніх орбітах і нахил орбіт ілюстративні.",
    "systemPhaseUnknown": ", місця планет на їхніх орбітах",
    "rateWords": {
      "10": "у десять разів швидше, ніж у житті",
      "60": "хвилина за секунду",
      "600": "десять хвилин за секунду",
      "3600": "година за секунду",
      "36000": "десять годин за секунду",
      "525600": "доба за одну шосту секунди"
    },
    "rateGeneric": "у {n} разів швидше, ніж у житті",
    "yourPlace": "Ваше місце",
    "observerSet": "Ваше місце: {place}, задане вами.",
    "observerDevice": "Ваше місце: поблизу того, де вас бачить пристрій.",
    "observerGuess": "Ваше місце — здогадка за часовим поясом вашого годинника: {place}. Вкажіть точніше в розділі «Де ви».",
    "needsPlace": "Потрібне місце. Спершу вкажіть, де ви.",
    "stationFromYou": "Зараз вона за {km} км від вас.",
    "drawnAtClassSize": "Модель намальовано завширшки {px} пікселів незалежно від відстані; справжня станція була б яскравою крапкою.",
    "passNight": "Під час цього прольоту вона освітлена Сонцем на темному небі: ви могли б її побачити, якщо дозволить погода.",
    "passDay": "Цей проліт ви не побачили б: ваше небо надто світле, або станція в тіні Землі.",
    "lookMoonUp": "Місяць освітлений на {pct}%, {alt}, напрям: {az}.",
    "lookMoonDown": "Цієї години Місяць під вашим горизонтом. Він зійде о {time}.",
    "lookMoonDownNoRise": "Цієї години Місяць під вашим горизонтом.",
    "lookWorldUp": "{name}: {alt}, напрям: {az}.",
    "lookWorldDown": "Цієї години {name} під вашим горизонтом.",
    "lookPlanet": "Найяскравіша планета на небі цієї години — {name}: {alt}, напрям: {az}.",
    "lookNoPlanet": "Цієї години на небі немає планет, які можна побачити оком. Камеру спрямовано туди, де вони пройдуть.",
    "lookStar": "Найяскравіша зоря на небі цієї години — {name}: {alt}, напрям: {az}.",
    "lookFigure": "Найкраще видно цієї години: {name}, {alt}, напрям: {az}.",
    "lookNoFigure": "Жодне з відомих сузір’їв цієї години не стоїть добре.",
    "lookNoPass": "Протягом наступного тижня проліт станції над вашим місцем не знайдено.",
    "lookDaylight": "Цієї години ваше небо не темне, тож виокремлювати поки що нічого.",
    "lookMilkyWay": "Камеру спрямовано на Чумацький Шлях там, де він проходить через {name}: {alt}, напрям: {az}. Три неба — це модель середньої ясної ночі.",
    "lookNoMilkyWay": "Цієї години Чумацький Шлях низько над вашим горизонтом, тож камеру спрямовано високо в небо.",
    "lookShower": "Наступний потік — {name}, найкраще видно близько {date}.",
    "lookShowerUp": "Цієї години його радіант: {alt}, напрям: {az}.",
    "lookShowerDown": "Цієї години його радіант під вашим горизонтом; камеру спрямовано туди, де він зійде.",
    "lookShowerRate": "На піку, з темного місця й за високого радіанта: близько {rate} метеорів на годину.",
    "lookShowerMoon": {
      "dark": "Тієї ночі Місяць освітлений на {pct}%, тож небо залишається темним.",
      "some": "Тієї ночі Місяць освітлений на {pct}% і сховає частину слабких метеорів.",
      "bright": "Тієї ночі Місяць освітлений на {pct}% і сховає всі метеори, крім яскравих."
    },
    "approachNext": "Далі в таблиці NASA JPL: {name}, {date}, на відстані {ld} відстаней до Місяця.",
    "approachNextFar": "Далі в таблиці NASA JPL: {name}, {date}.",
    "approachNone": "Таблицю тісних прольотів NASA JPL не завантажено, тому наступний проліт не названо.",
    "satellitesCount": "Працюючих супутників у каталозі, який ця сторінка завантажила з CelesTrak: {n}, з них Starlink: {starlink}.",
    "satellitesLoading": "Каталог ще завантажується; кількість з’явиться, коли він завантажиться.",
    "portraitLine": "Модель, а не фотографія: тінь і кільце світла, викривлене навколо нього, такі, якими їх робить його маса, світний диск змодельовано, а зорі позаду не викривлені. Його намальовано набагато більшим, ніж він виглядав би звідси; місце виміряно. Фотографія Event Horizon Telescope є на його картці: {credit} · {licence}.",
    "tonightUp": "З місця {place} цієї ночі: над горизонтом від {begin} до {end}, найвище о {time}, {alt}, напрям: {az}.",
    "tonightGlare": "З місця {place} цієї ночі: {name} надто близько до Сонця, щоб його побачити.",
    "tonightDown": "З місця {place} цієї ночі: {name} не над горизонтом, поки небо темне.",
    "frameLabel": "подорож із гідом",
    "stopRole": "зупинка",
    "liveLabel": "зупинка {n} з {count}: {title}",
    "stopMicro": "Зупинка {n} з {count}",
    "progressShort": "{n} / {count}",
    "pause": "Пауза",
    "pauseTitle": "Пауза (пробіл)",
    "play": "Грати",
    "resume": "Далі",
    "resumeTitle": "Повернутися до зупинки й іти далі (пробіл)",
    "back": "Попередня зупинка",
    "backTitle": "Попередня зупинка (←)",
    "next": "Наступна зупинка",
    "nextTitle": "Наступна зупинка (→)",
    "replay": "Ще раз",
    "replayTitle": "Пролетіти цей перехід ще раз (R)",
    "share": "Поділитися",
    "shareTitle": "Поділитися посиланням на цю зупинку",
    "collapse": "Сховати картку",
    "collapseTitle": "Сховати картку й дивитися (C)",
    "expand": "Показати картку",
    "expandTitle": "Повернути картку (C)",
    "soundOn": "Звук",
    "volume": "Гучність",
    "volumeTitle": "Гучність музики, звуків і голосу",
    "volumeValue": "{pct} відсотків",
    "voiceWill": "Це прочитає голос. Він синтетичний.",
    "voiceCan": "Синтетичний голос може це прочитати: натисніть «Голос».",
    "soundOnTitle": "Музика й звуки ввімкнені: вимкнути (M)",
    "soundOffTitle": "Музика й звуки вимкнені: ввімкнути (M)",
    "voice": "Голос",
    "voiceOnTitle": "Синтетичний голос читає кожну зупинку: вимкнути його й залишити музику (V)",
    "voiceOffTitle": "Нехай синтетичний голос читає кожну зупинку вголос (V)",
    "present": "Показ",
    "presentTitle": "Показати цю подорож у кімнаті: великі слова, без панелей, ви натискаєте «Далі»",
    "presentOffTitle": "Вийти з режиму показу й повернути панелі",
    "presentAuto": "Автоматично",
    "presentAutoOffTitle": "Кожна зупинка чекає на «Далі»: нехай подорож іде сама (A)",
    "presentAutoOnTitle": "Подорож іде сама: нехай кожна зупинка чекає на «Далі» (A)",
    "fullScreen": "На весь екран",
    "fullScreenTitle": "Заповнити весь екран (F)",
    "fullScreenOffTitle": "Вийти з повноекранного режиму (F)",
    "leave": "Вийти",
    "leaveTitle": "Вийти з подорожі. Камера залишається точно там, де є. (Escape)",
    "leaveTitleStage": "Вийти з подорожі. Мапа повертається до світу, на якому була центрована раніше, і камера переміщується. (Escape)",
    "progressLabel": "Скільки подорожі пройдено",
    "controlsLabel": "Керування подорожжю",
    "pausedChip": "Подорож на паузі",
    "endMicro": "Кінець подорожі",
    "endBody": "Камера залишається там, де є. Нічого тут не повертається назад.",
    "endBodyStage": "«Летіти далі» залишає вас тут. «Додому» повертає мапу до світу, на якому вона була центрована перед подорожжю.",
    "endExplore": "Летіти далі",
    "endExploreTitle": "Залишити цей вигляд і продовжити самостійно",
    "endStayTitleStage": "Залишитися тут і летіти далі з того місця, де закінчилася подорож",
    "endHome": "Додому",
    "endExploreTitleStage": "Продовжити самостійно, повернувшись на мапу, з якої ви почали",
    "endSend": "Надіслати знімок",
    "endSendTitle": "Зробити листівку з місця, де закінчилася подорож, зі словами й посиланням",
    "endReplay": "Дивитися знову",
    "endReplayTitle": "Подивитися цю подорож знову з початку",
    "endShareTitle": "Поділитися посиланням на цю подорож",
    "endNextMicro": "Наступна подорож",
    "endNext": "Далі: {title}",
    "docTitle": "Space Radar — {title} — зупинка {n} з {count}"
  },
  "sky": {
    "radiant": "Радіант: {name}",
    "bodies": {
      "sun": "Сонце",
      "moon": "Місяць",
      "mercury": "Меркурій",
      "venus": "Венера",
      "mars": "Марс",
      "jupiter": "Юпітер",
      "saturn": "Сатурн",
      "uranus": "Уран",
      "neptune": "Нептун"
    },
    "fov": {
      "degrees": "поле {deg}° · {name}",
      "arcmin": "поле {min}′ · {name}",
      "names": {
        "eye": "око",
        "binoculars": "бінокль",
        "telescope": "телескоп"
      }
    },
    "lines": {
      "sunPath": "Шлях Сонця",
      "equator": "Небесний екватор",
      "poleNorth": "Північний полюс неба",
      "poleSouth": "Південний полюс неба"
    },
    "what": {
      "star": "Зоря",
      "starMag": "зоря · {mag} зор. вел.",
      "planet": "планета · {mag} зор. вел.",
      "sun": "наша зоря",
      "moon": "супутник Землі",
      "dso": "глибокий космос",
      "dsoMag": "{kind} · {mag} зор. вел.",
      "open": "{name}, {sub}. Відкрити його картку.",
      "plain": "{name}, {sub}.",
      "openTitle": "Відкрити його картку"
    },
    "compassShort": [
      "Пн",
      "ПнПнС",
      "ПнС",
      "СПнС",
      "С",
      "СПдС",
      "ПдС",
      "ПдПдС",
      "Пд",
      "ПдПдЗ",
      "ПдЗ",
      "ЗПдЗ",
      "З",
      "ЗПнЗ",
      "ПнЗ",
      "ПнПнЗ"
    ],
    "lookLine": "Дивіться на {dir}, {fists}, о {time}. Він рухається приблизно {mins} хв.",
    "lookLineNoDuration": "Дивіться на {dir}, {fists}, о {time}.",
    "sunlit": "Він ще ловить сонячне світло, і саме тому його видно.",
    "notSunlit": "Під час цього прольоту він у тіні Землі, тож ви його не побачите.",
    "fistsHorizon": "просто над горизонтом",
    "fistsOverhead": "майже просто вгору",
    "fistsOne": "приблизно один кулак над горизонтом",
    "fistsMany": "над горизонтом, у кулаках: приблизно {n}",
    "noObserver": "Вкажіть, де ви, і цей рядок підкаже, куди дивитися.",
    "noPass": "Протягом наступних 24 годин він не піднімається над вашим горизонтом.",
    "notVisibleFromGround": "Цей об’єкт надто далеко, щоб виокремити його оком.",
    "leftGround": "Піднявся з землі, щоб полетіти туди. Небо — у розділі «Цієї ночі».",
    "nakedEye": "Достатньо яскравий, щоб побачити власними очима з темного місця.",
    "needsTelescope": "Надто тьмяний для ока; його показує телескоп або довга експозиція.",
    "starOnly": "Видно лише його зорю, і тільки в телескоп; сама планета надто тьмяна.",
    "onTheGround": "Цей об’єкт стоїть на землі, тож задирати голову нема чого.",
    "storm": "З землі це просто погода. З орбіти це спіраль хмар завширшки сотні кілометрів.",
    "onAnotherWorld": "Цей об’єкт стоїть на світі: {world}. Звідси ви його оком не виокремите, якою б ясною не була ніч.",
    "worldRise": "Звідти, де ви, він сходить о {time}.",
    "worldHere": "там, де ви",
    "worldFrom": {
      "down": "З місця {place}: сходить о {rise}, напрям: {riseDir}; найвище о {highTime}, {highAlt}; заходить о {set}, напрям: {setDir}.",
      "downNoSet": "З місця {place}: сходить о {rise}, напрям: {riseDir}; найвище о {highTime}, {highAlt}.",
      "up": "З місця {place}: зараз над горизонтом, {alt}, напрям: {dir}. Найвище о {highTime}, {highAlt}; заходить о {set}, напрям: {setDir}.",
      "upPast": "З місця {place}: зараз над горизонтом, {alt}, напрям: {dir}. Найвищу точку вже пройдено; заходить о {set}, напрям: {setDir}.",
      "never": "З місця {place} він не зійде протягом наступної півтори доби.",
      "always": "З місця {place}: зараз над горизонтом, {alt}, напрям: {dir}. Сьогодні він не заходить.",
      "honest": "Обчислено для горизонту на рівні моря; пагорбів і будинків тут немає."
    },
    "worldNoRise": "Цей об’єкт можна побачити власними очима. Обчислення того, коли він сходить над вашим місцем, у цій версії ще немає.",
    "worldSee": {
      "pluto": "Не оком і не в бінокль: Плутон майже в 3 000 разів тьмяніший за найтьмянішу зорю, яку ви бачите, тож потрібен телескоп.",
      "io": "Звичайний бінокль показує його як крапку світла поряд із Юпітером; оком він губиться в сяйві Юпітера.",
      "europa": "Звичайний бінокль показує її як крапку світла поряд із Юпітером; оком вона губиться в сяйві Юпітера.",
      "ganymede": "Звичайний бінокль показує його як крапку світла поряд із Юпітером; оком він губиться в сяйві Юпітера.",
      "callisto": "Звичайний бінокль показує її як крапку світла поряд із Юпітером; оком вона губиться в сяйві Юпітера.",
      "titan": "Не оком: Титан має найбільшу яскравість 8,2 зоряної величини, тож потрібен малий телескоп або сильний бінокль, а сяйво Сатурна поряд ускладнює навіть це.",
      "enceladus": "Не оком: Енцелад має 11,7 зоряної величини і так близький до яскравого Сатурна та його кілець, що його важко побачити навіть у малий телескоп.",
      "triton": "Не оком і не в бінокль: Тритон має 13,5 зоряної величини, приблизно в 600 разів тьмяніший за найтьмянішу зорю, яку ви бачите, тож потрібен телескоп.",
      "charon": "Ледь-ледь: Харон має 16,8 зоряної величини, в 13 000 разів тьмяніший за найтьмянішу зорю, яку ви бачите, і так близький до Плутона, що аматори розділили цю пару у 2008 році, фотографуючи її через 14-дюймовий телескоп.",
      "phobos": "Не оком: Фобос у найкращий момент має 11,3 зоряної величини й тулиться до Марса, сяйво якого його тамує; його знайшли у 1877 році 26-дюймовим телескопом.",
      "deimos": "Не оком: Деймос у найкращий момент має 12,4 зоряної величини і близький до Марса, сяйво якого його тамує; його знайшли у 1877 році 26-дюймовим телескопом.",
      "neptune": "Не оком: Нептун має від 7,7 до 7,9 зоряної величини, надто тьмяний, щоб побачити без допомоги. Сильний бінокль або телескоп показують його як малий синій диск.",
      "mimas": "Не оком: Міманс має 12,9 зоряної величини й тулиться до Сатурна, тож потрібні великий телескоп і спокійна ніч.",
      "tethys": "Не оком: Тетія має 10,2 зоряної величини, доступна малому телескопу, хоча сяйво Сатурна поряд ускладнює спостереження.",
      "dione": "Не оком: Діона має 10,4 зоряної величини, доступна малому телескопу, хоча сяйво Сатурна поряд ускладнює спостереження.",
      "rhea": "Не оком: Рея має 10 зоряної величини, найяскравіша з супутників Сатурна після Титана, і малий телескоп її покаже.",
      "iapetus": "Не оком: Япет змінюється від 10,2 до 11,9 зоряної величини, коли до нас по черзі повертаються його світлий і темний боки, тож малий телескоп ловить його в найкращий момент.",
      "miranda": "Ледь-ледь: Міранда має 16,6 зоряної величини, губиться в сяйві Урана й невидима для багатьох аматорських телескопів.",
      "ariel": "Не оком і не в бінокль: Аріель має 14,8 зоряної величини, приблизно така ж тьмяна, як Плутон поблизу найближчої точки, тож потрібні добрий телескоп і темне небо.",
      "umbriel": "Не оком і не в бінокль: Умбріель має 15,1 зоряної величини, найтьмяніший із чотирьох великих супутників Урана, тож потрібні добрий телескоп і темне небо.",
      "titania": "Не оком: Титанія має 13,9 зоряної величини, найяскравіша з супутників Урана, і все одно потрібен телескоп певного розміру.",
      "oberon": "Не оком: Оберон має 14,1 зоряної величини і найдалі від Урана з цих п’яти, тож потрібні телескоп і спокійна ніч."
    },
    "couldNotLook": "Не вдалося обчислити проліт звідси.",
    "nowhereToLook": "Ніхто не знає, де цей об’єкт, тож дивитися нікуди."
  },
  "controls": {
    "title": "Керування",
    "layersTitle": "Що показати",
    "layerCount": "{n}",
    "layerCountLoading": "рахуємо",
    "layerHint": {
      "exoplanets": "Вимкнено. Поставте позначку, щоб показати."
    },
    "layerCountEmpty": "порожньо",
    "layerCountEmptyTitle": "Цей шар виявився порожнім: його джерело не вдалося прочитати, або в ньому зараз нічого немає.",
    "layerWaits": "ще ні",
    "layerWaitsTitle": "Завантажується, коли ви його вмикаєте, щоб економити трафік.",
    "layersFailed": "Порожніх шарів: {n}.",
    "layersFailedOne": "Один шар виявився порожнім.",
    "layersFailedWhy": "Дивитися джерела",
    "layerCountParts": {
      "onMap": "на мапі: {n}",
      "riding": "на чомусь іншому: {n}",
      "unplaceable": "не вдалося розмістити: {n}",
      "auroraPeak": "ймовірність до {n} %",
      "lightningPerMin": "ударів за хвилину: {n}"
    },
    "layersEmpty": "Жодного шару ще не завантажено.",
    "groups": {
      "around-earth": "Навколо Землі",
      "earth": "Погода й земля",
      "solar-system": "Сонячна система",
      "beyond": "Зорі й далі"
    },
    "groupCount": "{on} з {n}",
    "groupAll": "Усі",
    "groupNone": "Жодного",
    "groupAllLabel": "Показати всі шари групи: {group}",
    "groupNoneLabel": "Сховати всі шари групи: {group}",
    "layerFilter": "Знайти шар",
    "layersKeys": "Шари. Стрілки вгору й вниз переміщують; пробіл вмикає один.",
    "layerFilterEmpty": "Немає шару з такою назвою.",
    "keysRow": "Клавіші",
    "keysRowTouch": "Жести",
    "keysRowTitle": "Показати клавіші, що рухають вигляд",
    "keysRowTitleTouch": "Показати жести, що рухають вигляд",
    "swatchMixed": "Намальовано власними кольорами",
    "keyedNote": "Крапки пофарбовано за ознакою «{key}»: умовні позначення нижче.",
    "localTimeFallback": "місцевий",
    "locationPlaceholder": "Введіть місто",
    "locationSearchLabel": "Знайти місто",
    "locationUseMine": "Моє місце",
    "locationUseMineTitle": "Запитати в браузера, де ви",
    "locationInsecure": "Браузер ділиться вашим місцем лише зі сторінками, що йдуть через https. Ця сторінка на звичайному http, тому кнопку вимкнено. Виберіть натомість місто або відкрийте адресу https, коли вона з’явиться.",
    "locationUnsupported": "У цьому браузері немає служби місця. Виберіть натомість місто.",
    "locationDenied": "Браузер відмовив. Виберіть натомість місто.",
    "locationFailed": "Браузер не зміг вас знайти. Виберіть натомість місто.",
    "locationAsking": "Питаємо в браузера",
    "locationClear": "Скинути",
    "locationNoMatch": "У вбудованому списку немає такого міста.",
    "tonightCouldNotLook": "Не вдалося переглянути: жодного супутника не завантажено."
  },
  "search": {
    "title": "Знайти об’єкт",
    "placeholder": "Шукати планети, зорі, супутники",
    "placeholderPhone": "Шукати в космосі",
    "inputLabel": "Шукати об’єкт за назвою або номером у каталозі",
    "listLabel": "Знайдені об’єкти",
    "fly": "Летіти до нього",
    "flyTitle": "Перемістити камеру до виділеного об’єкта й відкрити його картку",
    "hint": "Досить двох літер. Enter вибирає перший.",
    "noMatch": "Нічого з назвою «{q}» тут немає.",
    "closest": "Найближчі назви",
    "more": "Збігів іще: {n}. Введіть більше, щоб звузити.",
    "searching": "Об’єктів перевірено: {n}.",
    "searchingOne": "Перевірено один об’єкт.",
    "searchingBut": "Об’єктів перевірено: {n}, шарів ще ні: {m}.",
    "searchingButOne": "Об’єктів перевірено: {n}, один шар ще ні.",
    "empty": "Для пошуку ще нічого не завантажено.",
    "inputTitle": "Пошук (/)",
    "key": "/",
    "notLoaded": "Не завантажено, тому не шукали: {layers}.",
    "stillLoading": "Ще завантажується, тому поки не шукали: {layers}.",
    "loadsWhenOn": "Завантажується лише коли ви його вмикаєте, щоб економити трафік, тому поки не шукали: {layers}.",
    "couldNotRead": "Не вдалося прочитати, тому не шукали: {layers}.",
    "fallback": "Нічого не починається так. Ось що це містить.",
    "switchedOn": "Увімкнено: {layer}.",
    "belowHorizon": "{name} під горизонтом.",
    "notLoadedCount": "Скільки об’єктів це пропускає, невідомо, поки їх не завантажено."
  },
  "quality": {
    "dataSaver": "Економія трафіку ввімкнена: два найбільші списки чекають.",
    "lowered": "Повільні кадри ({ms} мс): простіша картинка.",
    "tierPhone": "Мапи поверхні у 2k, під телефон.",
    "tierSaver": "Мапи поверхні у 2k, щоб економити трафік.",
    "tierSmall": "Мапи поверхні у 2k, під цей пристрій.",
    "tierLatched": "Мапи поверхні знову у 2k: кадри були повільні.",
    "tierLow": "Мапи поверхні у 2k, як просить режим «Низька».",
    "tier1": "Мапи поверхні у 4k, завантажуються в простої.",
    "tier2": "Мапи поверхні у 4k, більше світів лишаються різкими.",
    "promoted": "Піднято на крок після швидких кадрів.",
    "mapsWorn": "Мапи на цьому пристрої: {credits}.",
    "panelTitle": "Якість",
    "choices": {
      "auto": "Авто",
      "low": "Низька",
      "medium": "Середня",
      "high": "Висока",
      "ultra": "Ультра"
    },
    "autoNow": "Авто: {tier}",
    "titles": {
      "auto": "Вибирається за пристроєм і частотою кадрів",
      "low": "Найлегша картинка: для батареї або старого ноутбука",
      "medium": "Різкіші мапи, рельєф і погода",
      "high": "Більше світів різкі водночас",
      "ultra": "Повна роздільна здатність і найдрібніші кроки зблизька"
    },
    "fellBack": "Кадри були повільні: якість знову «Авто»."
  },
  "status": {
    "title": "Джерела",
    "intro": "Кожне джерело, яке воно читає, наскільки давнє це читання і звідки воно. Нічого тут не сховано дрібним шрифтом унизу.",
    "stateOk": "добре",
    "stateStale": "застаріле",
    "stateUnknown": "не вдалося перевірити",
    "stateOkTitle": "Прочитано недавно й у межах строку свіжості.",
    "stateStaleTitle": "Копія в нас є, але вона старіша, ніж обіцяє це джерело.",
    "stateUnknownTitle": "У цьому браузері ми ніколи не мали доброго читання цього джерела. Це не те саме, що «добре», і не те саме, що помилка на копії, яку ми маємо.",
    "ageNever": "ніколи не читалося",
    "ageLabel": "востаннє прочитано {age}",
    "ageNeverLine": "у цьому браузері ще немає доброї копії",
    "viaSnapshotLine": "з нашого знімка, отриманого {age}",
    "viaLiveLine": "прочитано наживо з джерела {publisher}, {age}",
    "snapshotOverdue": "свіжіша копія запізнюється",
    "snapshotChecking": "(шукаємо новішу)",
    "couldNotLookLine": "не вдалося перевірити: {reason}",
    "reasonNoRoute": "{why}, а браузер не може прочитати {publisher} напряму",
    "snapshotWhy": {
      "no-index": "не вдалося прочитати індекс наших знімків",
      "not-in-index": "наші знімки не охоплюють це джерело",
      "refused": "останній збір з нього було відхилено",
      "error": "останній збір з нього завершився помилкою",
      "skipped": "збирач його пропустив",
      "unreadable": "наш знімок з нього не вдалося прочитати"
    },
    "harvestUnchecked": "Наші знімки: ще не перевірено.",
    "harvestUnavailable": "Наші знімки зараз недоступні, тому кожне джерело нижче читається наживо з його видавця або не читається зовсім.",
    "harvestLine": "Наші знімки: записано {age} · потоків у порядку: {ok} · відхилено: {refused} · помилок: {error}",
    "errorLabel": "Остання помилка",
    "attributionTitle": "Подяки",
    "attributionIntro": "Дані на цій мапі — праця інших людей.",
    "footCreditsIntro": "Зображення й текстури:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "Текстури планет і зір, ліцензія CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "Знімки хмар, нічного боку й поверхонь, а також 3D-моделі",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "Хмари",
    "auroraTitle": "Полярне сяйво",
    "weatherTitle": "Блискавки",
    "layersTitle": "Наживо чи вбудовано",
    "layersIntro": "«Наживо» читається з видавця або обчислюється для цієї миті, поки ви дивитеся. Каталог постачається із застосунком: зорі, галактики, а також антени й місця посадки на землі не рухаються, поки ви дивитеся. Вбудований зразок замінює джерело, до якого браузер узагалі не може звернутися.",
    "layerLive": "наживо",
    "layerCatalogue": "каталог",
    "layerSample": "вбудований зразок",
    "layerIllustrative": "намальовано, не відстежується",
    "layerMixed": "змішане",
    "layerEmpty": "нічого не завантажено",
    "layerCountLabel": "показано: {n}",
    "sourcesEmpty": "Жодного джерела не заявлено.",
    "notAsked": "Іще джерел, які читаються лише тоді, коли ввімкнено потрібний їм шар: {n}."
  },
  "time": {
    "justNow": "щойно",
    "aMinuteAgo": "хвилину тому",
    "minutesAgo": "{n} хв тому",
    "anHourAgo": "годину тому",
    "hoursAgo": "{n} год тому",
    "aDayAgo": "добу тому",
    "daysAgo": "{n} дн. тому",
    "lessThanAMinute": "менш як 1 хв",
    "aMinute": "1 хв",
    "minutes": "{n} хв",
    "anHour": "1 год",
    "hours": "{n} год",
    "aDay": "1 дн.",
    "days": "{n} дн.",
    "months": "{n} міс.",
    "years": "{n} р.",
    "inFuture": "через {d}",
    "ago": "{d} тому"
  },
  "sheet": {
    "handle": "Висота панелі",
    "closed": "закрита",
    "peek": "опущена",
    "half": "наполовину відкрита",
    "full": "повністю відкрита",
    "state": "{height}. Стрілки вгору й вниз змінюють її",
    "title": "Висота панелі: {height}. Торкніться або потягніть, щоб змінити"
  },
  "print": {
    "title": "Зберегти цей вигляд як листівку 6 на 4 дюйми (JPEG)",
    "making": "Робимо листівку",
    "saved": "Листівку збережено",
    "failed": "Листівку зараз не вдалося зробити",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "Як бачить око",
      "deep": "Глибоке розтягнення: слабке світло підсилено"
    },
    "look": {
      "measured": "Вигляд «Виміряний»"
    }
  },
  "hud": {
    "fromYou": "від вас",
    "fromPlace": "від {place}",
    "behind": "позаду: {world}",
    "offScreen": "{name}, {distance} від вас, за межами екрана: летіти до нього",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "Сховати всі панелі (H)",
    "show": "Показати панелі знову (H або Escape)",
    "hint": "H або Escape — повернути панелі. Shift+H залишає підписи й час"
  },
  "mark": {
    "label": "Код на GitHub",
    "title": "Вихідний код Space Radar на GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "Матеріали для преси",
    "pressTitle": "Що це, зображення й знак, яким можна користуватися",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "Станція",
    "satellite": "Супутник",
    "debris": "Уламки",
    "rocket": "Ракета",
    "probe": "Зонд",
    "telescope": "Телескоп",
    "asteroid": "Астероїд",
    "comet": "Комета",
    "site": "Наземний об’єкт",
    "world": "Світ",
    "star": "Зоря",
    "exoplanet": "Планета іншої зорі",
    "dso": "Об’єкт далекого космосу",
    "exotic": "Екстремальний об’єкт",
    "storm": "Тропічний циклон",
    "earthevent": "Подія на Землі",
    "oddity": "Дивина",
    "shower": "Метеорний потік",
    "unknown": "Об’єкт"
  },
  "cls": {
    "nearEarthApprox": "Так близько до Землі його місце наближене: намальована орбіта — навколо самого Сонця й не враховує притягання Землі.",
    "label": "Як ми знаємо, де він",
    "measured": "виміряне положення",
    "inferred": "положення екстрапольовано з елементів віком {n} {unit}",
    "inferredUnknownAge": "положення екстрапольовано з елементів невідомого віку",
    "inferredNoElements": "положення обчислено, а не виміряно",
    "stormAdvisory": "його центр за повідомленням о {time} UTC, {ago}; шторм рухається, тож відтоді він змістився",
    "stormAdvisoryDated": "його центр за повідомленням {date} о {time} UTC, {ago}; шторм рухається, тож відтоді він змістився",
    "illustrative": "намальовано, щоб показати, куди він рухається; справжня траєкторія не публікується",
    "placeIllustrative": "його справжня орбіта з каталогу CelesTrak, але у вигаданому місці на ній; поточних елементів для нього в нас немає",
    "sample": "вбудовані зразкові дані, а не положення наживо",
    "provisional": "ще немає в публічному каталозі — це власні елементи оператора, опубліковані через CelesTrak; постійний номер з’явиться, коли його внесе Space-Track",
    "unknown": "ми не можемо сказати, як обчислено це положення",
    "unplaced": "ніхто не знає, де це, тому нічого не намальовано",
    "shower": "напрям на небі: медіана опублікованих рішень МАС для цього потоку",
    "noPlace": "місце не намальовано: тіло, на якому він, не є світом у цьому застосунку",
    "approxPlace": "розміщено за опублікованими координатами, з точністю близько {n} градусів",
    "inferredArc": "востаннє його бачили {date}, і {caveat}",
    "precisionSplit": "{anchorName} виміряно з точністю до {anchorM} м; це було {how}, і його розміщено з точністю до {objectM} м",
    "precisionSplitUnknown": "{anchorName} виміряно з точністю до {anchorM} м; сам цей об’єкт ніколи не обстежували",
    "precisionSplitHowOnly": "{anchorName} виміряно з точністю до {anchorM} м; цей об’єкт було {how}, і ніхто не опублікував, з якою точністю",
    "precisionOwn": "розташовано з точністю до {objectM} м: {how}",
    "aboard": "це власне положення носія — {carrier}, бо об’єкт прикріплений до нього ззовні й іде туди, куди йде він",
    "how": {
      "surveyed": "обстежено з орбіти",
      "photogrammetric": "знайдено на фотографіях",
      "orbital_imaging": "знайдено на орбітальних знімках",
      "unsurveyed": "ніколи не обстежено",
      "map_reference": "взято з мапи"
    },
    "hourWord": "година",
    "hoursWord": "години|годин",
    "dayWord": "доба",
    "daysWord": "доби|діб",
    "minuteWord": "хвилина",
    "minutesWord": "хвилини|хвилин",
    "yearWord": "рік",
    "yearsWord": "роки|років"
  },
  "unplaced": {
    "why": "{whyUnknown}",
    "noDistanceRow": "Не виміряно: у каталозі для нього немає паралакса",
    "iauApproved": "{name}, схвалено {date}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "Пожежа",
      "volcano": "Вулкан, що вивергається",
      "iceberg": "Айсберг"
    },
    "rows": {
      "kind": "Що це",
      "reported": "Останнє повідомлення",
      "since": "Виверження триває з",
      "first": "Вперше повідомлено",
      "size": "Розмір",
      "where": "Де",
      "by": "Повідомили"
    },
    "sizeValue": "{n} км²",
    "sizeSmall": "менше ніж 1 км²",
    "by": "{agencies}, через NASA EONET",
    "sky": "Це на землі. З орбіти пожежа — стовп диму, вулкан — стовп попелу, айсберг — біла брила на темній воді.",
    "drawn": "намальовано як позначку на останньому повідомленому місці; його протяжність на землі не намальовано",
    "honesty": "Одна точка з NASA EONET, востаннє повідомлена {date}, прочитана {read}. Для огляду, а не офіційний запис про те, де й коли."
  },
  "deepFacts": {
    "methodRow": "Відстань знайдено за",
    "billionLightYears": "{n} млрд св. р.",
    "methods": {
      "parallax": "паралаксом: зсув його зорі на тлі далекого неба",
      "eclipsing-binary": "затемнюваними подвійними зорями в ньому",
      "cepheid": "цефеїдами в ньому",
      "TRGB": "найяскравішими червоними гігантами в ньому",
      "standard-candle": "зорями чи вибухами відомої яскравості",
      "redshift": "його червоним зміщенням, через космологію",
      "kinematic": "швидкістю, з якою воно рухається разом з обертанням галактики",
      "assumed-member-of-parent": "власної немає: його поставлено на відстані його галактики"
    },
    "drawnTag": {
      "reconstruction": "· реконструйовано",
      "model": "· модель",
      "photograph": "· фотографія",
      "catalogue": "· каталог",
      "illustration": "· ілюстрація"
    },
    "drawnWords": {
      "reconstruction": "тривимірна реконструкція за опублікованим дослідженням",
      "model": "модель об’єкта його роду, а не його власні зорі",
      "photograph": "справжня фотографія, з нашого боку",
      "catalogue": "положення з каталогу",
      "illustration": "ілюстративне сяйво й позначка його роду"
    },
    "drawnLine": "Що намальовано: {drawn}.",
    "drawnJoin": "; в інших місцях — ",
    "records": {
      "dso-milky-way": {
        "drawn": "ілюстрація, побудована на вимірюваннях",
        "split": "Виміряно: зорі в межах кількох тисяч світлових років (Gaia), кут перемички, напрямки вздовж рукавів і ближчі рукави (Reid та ін., 2019). Обчислено: далекий бік за центром, прихований пилом; його рукави — ближні, перенесені на той бік."
      }
    }
  },
  "truth": {
    "label": "Як ми знаємо",
    "hints": {
      "measured": "Виміряно",
      "inferred": "Обчислено",
      "illustrative": "Ілюстративно",
      "sample": "Зразок",
      "unknown": "Невідомо",
      "unplaced": "Не розміщено",
      "reconstruction": "Реконструйовано",
      "model": "Модель",
      "photograph": "Фотографія",
      "catalogue": "Каталог",
      "illustration": "Ілюстрація"
    },
    "loading": "Відкриваємо умовні позначення.",
    "failed": "Умовні позначення не завантажилися. Рядок нижче коротко каже те саме."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "Зблизька видно, як крутяться малі вихори там, де зсув виміряних вітрів, і в сліді Великої червоної плями, а ще обертаються Овал BA і три білі овали. Де саме зсув, виміряно; кожен вихор згенеровано, дрібніший за мапу: ілюстративно."
    },
    "poles": {
      "jupiter": "Циклони навколо кожного полюса змодельовано за спостереженнями Juno 2017 року: вісім навколо одного на півночі й п’ять на півдні. Це реконструкція, а не фотографія. Темніший покрив у проміжках ілюстративний."
    }
  },
  "weatherDetail": "Ближче, ніж мапа різка, створюється тонка смугаста текстура хмар, щоб тримати картинку: вона рухається з виміряними вітрами й зберігає кольори самої мапи, а жодна її смуга не є справжньою хмарою. Ілюстративно.",
  "weatherVortex": {
    "turning": {
      "saturn": "Зблизька всередині шестикутника крутиться малий циклон: його око має 2 000 км у поперечнику, а стінка обертається зі швидкістю 150 метрів за секунду, як виміряв Cassini у 2012 році. Спіраль, намальована навколо, ілюстративна, і зараз за ним ніхто не стежить."
    },
    "still": {
      "saturn": "Зблизька всередині шестикутника є малий циклон: його око має 2 000 км у поперечнику, як виміряв Cassini у 2012 році, коли його стінка оберталася зі швидкістю 150 метрів за секунду. Спіраль, намальована навколо, ілюстративна, і зараз за ним ніхто не стежить."
    }
  },
  "sunAlive": {
    "prominences": "Протуберанців на його краю: {n}. Вони стоять над активними областями зі списку NOAA, що в межах п’ятнадцяти градусів від лімба. Місця виміряно; форми, висоти й рух ілюстративні.",
    "prominencesOne": "Один протуберанець стоїть на його краю над активною областю зі списку NOAA, що в межах п’ятнадцяти градусів від лімба. Місце виміряно; форма, висота й рух ілюстративні.",
    "flare": "Спалах класу {cls} видно в області {region}: пік був о {time} UTC, {date}, за списком подій NOAA. Його час, клас, область і згасання виміряно; наскільки яскраво його намальовано, ілюстративно.",
    "cme": "Корональний викид маси, що вирушив о {time} UTC, {date}, зі швидкістю {speed} км/с, намальовано так, як його показує коронограф: яскрава петля, що рухається назовні, темніша порожнина позаду й яскраве ядро. Початок, напрям, ширину й швидкість узято з каталогу NASA DONKI; хмара зберігає цю швидкість, чого справжні не роблять, а її вигляд ілюстративний."
  },
  "starSystem": {
    "zoneLabel": "Зона життя, обчислена",
    "orbitOf": {
      "mercury": "Орбіта Меркурія для порівняння масштабу",
      "earth": "Орбіта Землі для порівняння масштабу",
      "jupiter": "Орбіта Юпітера для порівняння масштабу",
      "neptune": "Орбіта Нептуна для порівняння масштабу"
    },
    "rows": {
      "known": "Що відомо",
      "orbit": "Відстань до її зорі",
      "temperature": "Температура, обчислена",
      "zone": "Зона життя, обчислена",
      "starTemperature": "Температура поверхні",
      "starWidth": "Поперечник",
      "starGlow": "Сяйво",
      "starMass": "Маса",
      "planets": "Планети на малюнку",
      "stars": "Зорі в системі",
      "companion": "Друга зоря"
    },
    "unseen": "Ніхто не бачив її поверхні.",
    "measuredOne": "Виміряно: {what}.",
    "measuredMany": "Виміряно: {what}.",
    "estimatedOne": "Оцінка: {what}.",
    "estimatedMany": "Оцінка: {what}.",
    "unmeasuredOne": "Не виміряно: {what}.",
    "and": " і ",
    "what": {
      "size": "розмір",
      "year": "рік",
      "mass": "маса",
      "least": "найменша можлива маса"
    },
    "au": "{n} а. о.",
    "auComputed": "{n} а. о., обчислено за її роком і масою її зорі",
    "auYearComputed": "{n} а. о.; її рік (у земних роках: близько {y}) обчислено з цього та маси її зорі",
    "earthsEstimated": "{n}× Землі, оцінка архіву за її масою",
    "massEstimated": "{n}× Землі, оцінка архіву за її розміром",
    "massLeast": "Щонайменше {n}× Землі",
    "sizeDefault": "Не виміряно: намальовано розміром із Землю",
    "temperature": "{k} K ({c} °C), якщо вона відбиває {pct} % свого світла, як Земля",
    "zone": {
      "inside": "Усередині неї",
      "edge": "На її краю: лише в ширших межах",
      "hotter": "Ближче до зорі, ніж вона",
      "colder": "Далі від зорі, ніж вона"
    },
    "zoneNone": {
      "too-hot": "Не обчислено: формула не охоплює таку гарячу зорю",
      "too-cool": "Не обчислено: формула не охоплює таку холодну зорю",
      "no-temperature": "Не обчислено: температуру зорі не виміряно",
      "no-luminosity": "Не обчислено: яскравість зорі не виміряно",
      "twoStars": "Не обчислено: вона обертається навколо двох зір, а каталог описує одну"
    },
    "zoneRange": "від {a} до {b} а. о. від зорі (Kopparapu та ін., 2014)",
    "overlay": {
      "title": "Накласти на мапу",
      "zone": "Зона життя",
      "orbits": "Орбіти наших планет",
      "zoneTitle": "Де рідка вода могла б триматися на поверхні планети, обчислено за температурою й яскравістю зорі",
      "orbitsTitle": "Орбіти планет нашої Сонячної системи, намальовані навколо цієї зорі для порівняння масштабу",
      "note": {
        "none": "На систему нічого не накладено.",
        "zone": "Зелена смуга — зона життя, обчислена, а не спостережена (Kopparapu та ін., 2014).",
        "orbits": "Пунктирні кільця — орбіти з нашої Сонячної системи, для порівняння масштабу. Тут ніщо по них не рухається.",
        "both": "Зелена смуга — зона життя, обчислена; пунктирні кільця — орбіти наших власних планет, для порівняння масштабу."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "Не виміряно",
    "starPoint": "Не виміряно: намальовано як точку світла",
    "starWhite": "Не виміряно: намальовано білою",
    "starGlowValue": "Намальовано ширшим за зорю, її кольору, щоб її було видно здалеку",
    "starsOne": "У каталозі: {n}; одну намальовано",
    "starsBoth": "Дві, обидві намальовано",
    "companionValue": "завширшки {width}, масою {mass}, {k} K{derived}",
    "companionDerived": " (модельне значення; її колір ілюстративний)",
    "zoneBoth": "від {a} до {b} а. о., світло обох зір складено",
    "pairLine": "Дві зорі обертаються одна навколо одної кожні {days} діб, у середньому за {a} а. о. одна від одної, по орбіті, яку виміряли в наукових статтях; планета обертається навколо обох. Їхні положення обчислено за цією орбітою; площина, в якій їх намальовано, площина планет, — та, яку використовує вигляд неба.",
    "line": "Розміри й роки — з NASA Exoplanet Archive, прочитано {date}. Орбіти намальовано колами{computed}; кольори{phase} і нахил орбіт ілюстративні{defaults}.",
    "lineComputed": ", {n} із них — з розмірами, виведеними з року й маси зорі",
    "lineDefaults": "; планету без виміряного розміру намальовано розміром із Землю"
  },
  "shells": {
    "radio": "Радіо із Землі дійшло на {n} св. р."
  },
  "subscribe": {
    "heading": "Надсилайте мені, що буде найближчим часом",
    "emailLabel": "Ваша електронна адреса",
    "emailPlaceholder": "you@example.com",
    "pickOne": "Позначте хоча б одне.",
    "launchesLabel": "Майбутні запуски",
    "showersLabel": "Піки метеорних потоків",
    "approachesLabel": "Тісні зближення",
    "submit": "Підписатися",
    "sending": "Надсилаємо…",
    "pending": "Перевірте пошту, щоб підтвердити.",
    "couldNotReach": "Не вдалося зв’язатися зі службою підписки."
  },
  "flood": {
    "on": "Підсвітити",
    "off": "Справжнє світло",
    "title": "Освітити модель рівномірно, щоб її було видно в тіні. Це не справжнє світло.",
    "note": "Наша лампа, а не справжнє світло."
  },
  "ephemeris": {
    "drawn": "Намальовано за JPL Horizons, з інтерполяцією: у межах близько {km} км від власної траєкторії JPL.",
    "note": "Мапа має його траєкторію на цей день, з JPL Horizons, з точністю близько {km} км.",
    "noteLate": "Траєкторія JPL для нього починається через {n} хв після цієї миті, і годинник переходить туди. Точність близько {km} км.",
    "noteDay": "Сторінка NASA вказує день. Годинник переходить на {time} UTC — найближчий проліт у траєкторії JPL того дня, з точністю близько {km} км.",
    "failed": "Його траєкторія на цей день не завантажилася, тому годинник залишається на місці. Виберіть його знову, щоб повторити.",
    "span": "Траєкторія JPL для нього йде від {from} до {to}.",
    "before": "Годинник стоїть раніше, тому мапа не має для нього положення.",
    "after": "Годинник стоїть пізніше, тому мапа не має для нього положення.",
    "go": "Перейти до найближчої доступної дати",
    "goBefore": "Перевести годинник на {date}, де починається траєкторія JPL для нього",
    "goAfter": "Перевести годинник на {date}, де закінчується траєкторія JPL для нього"
  },
  "offline": {
    "updateReady": "Готова новіша версія",
    "reload": "Перезавантажити"
  },
  "keepTrip": {
    "keep": "Зберегти для роботи без мережі",
    "keepTitle": "Зберегти голос, моделі й мапи цієї подорожі на цьому пристрої, щоб вона грала без з’єднання",
    "keeping": "Зберігаємо {done} з {total}",
    "kept": "Збережено для роботи без мережі",
    "keptTitle": "Збережено на цьому пристрої. Натисніть, щоб завантажити знову.",
    "keptNote": "Файлів: {n}, {size}, збережено на цьому пристрої. Дані наживо (погода, шторми, супутники) не зберігаються.",
    "again": "Спробувати знову",
    "failedNote": "Збережено файлів: {done} з {total}. Перевірте з’єднання й спробуйте знову."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "Натисніть будь-яку клавішу, щоб почати зі звуком",
    "gateTitleTouch": "Торкніться екрана, щоб почати зі звуком",
    "gateNote": "Якщо нікого немає, почнеться без звуку, з підписами, за {n} с.",
    "upNext": "Наступна подорож",
    "shape": "Зупинок: {n} · {m} хв",
    "take": "Взяти керування",
    "takeTitle": "Зупинити подорожі й рухати мапу самому"
  },
  "drift": {
    "name": "Дрейф",
    "pause": "Пауза (пробіл)",
    "resume": "Далі (пробіл)",
    "next": "Наступне місце (N)",
    "options": "Параметри",
    "optionsTitle": "Через що мандрувати, що показувати і в якому темпі",
    "leave": "Припинити дрейф (Escape)",
    "through": "Мандрувати крізь",
    "cats": {
      "craft": "Космічні апарати",
      "worlds": "Світи",
      "small": "Малі тіла",
      "stars": "Зорі",
      "deep": "Далекий космос"
    },
    "show": "Показувати",
    "real": "Справжні моделі",
    "realTitle": "Лише те, що має справжню модель, мапу чи фотографію",
    "names": "Назви",
    "namesTitle": "Назва й числа біля кожного місця",
    "bare": "Лише космос",
    "bareTitle": "Тільки небо й те, що в ньому: без назв, позначок, ліній і панелей",
    "pace": "Темп",
    "paces": {
      "calm": "Спокійний",
      "steady": "Рівний",
      "brisk": "Жвавий"
    },
    "hint": "Дрейф. Потягніть мапу, щоб узяти керування",
    "nothing": "З такими параметрами немає крізь що мандрувати",
    "notFromGround": "Дрейф починається з космосу, а не із землі"
  },
  "tour": {
    "label": "Тур",
    "micro": "Тур",
    "count": "{n} / {of}",
    "next": "Далі",
    "nextTitle": "Наступний крок (N)",
    "done": "Готово",
    "doneTitle": "Завершити тур",
    "skip": "Пропустити",
    "skipTitle": "Вийти з туру (Escape)",
    "voice": "Голос",
    "voiceTitle": "Читати кожен крок уголос синтетичним голосом",
    "waited": "Роздивіться, а потім ідіть далі.",
    "invite": "Ви тут уперше: пройдіть тур",
    "inviteTitle": "Вісім кроків мапою"
  },
  "undo": {
    "moved": "Переміщено до: {name}",
    "movedNowhere": "Вигляд змінився",
    "night": "Ніч у місці {name}: широкий вигляд",
    "back": "Назад, де ви були",
    "done": "Знову там, де ви були"
  },
  "searchRows": {
    "kinds": {
      "sun": "Зоря",
      "planet": "Планета",
      "moon": "Природний супутник",
      "station": "Космічна станція",
      "satellite": "Супутник",
      "telescope": "Космічний телескоп",
      "probe": "Космічний апарат",
      "rocket": "Ракета",
      "launch": "Запуск",
      "debris": "Уламки",
      "asteroid": "Астероїд",
      "comet": "Комета",
      "site": "Місце",
      "landing": "Місце посадки",
      "star": "Зоря",
      "exoplanet": "Планета іншої зорі",
      "dso": "Об’єкт далекого космосу",
      "storm": "Тропічний шторм",
      "oddity": "Дивина",
      "earthevent": "Подія на Землі",
      "blackhole": "Чорна діра",
      "pulsar": "Пульсар",
      "magnetar": "Магнетар",
      "quasar": "Квазар",
      "galaxy": "Галактика",
      "cluster": "Скупчення галактик",
      "browndwarf": "Коричневий карлик",
      "whitedwarf": "Білий карлик"
    },
    "upNow": "зараз над горизонтом, {compass}",
    "lowNow": "зараз низько, {compass}",
    "downNow": "зараз під вашим горизонтом",
    "trip": "Подорож",
    "starPattern": "Сузір’я",
    "mission": "Місія",
    "eventName": "{mission}: {title}",
    "event": "Подія місії · {date}",
    "eventNoDate": "Подія місії",
    "group": "Угруповання · супутників на мапі: {n} · натисніть, щоб побачити список",
    "nearMe": "Біля мене цієї ночі",
    "nearMeSub": "Що є на вашому небі"
  },
  "countdown": {
    "go": "Дозвіл на запуск",
    "tbc": "Час уточнюється",
    "tbd": "Час не визначено",
    "hold": "Утримання: відлік зупинено",
    "inFlight": "У польоті",
    "success": "Запущено",
    "deployed": "Корисне навантаження розгорнуто",
    "failure": "Запуск не вдався",
    "partial": "Часткова невдача",
    "byPlan": "За планом. Новіших відомостей немає",
    "byPlanClimbing": "За планом, іде вгору. Новіших відомостей немає",
    "age": "прочитано {age}"
  },
  "today": {
    "title": "Сьогодні",
    "moonTitle": "Місяць: {phase}",
    "moonLine": "{pct} % освітлено · {next}: {date}",
    "moonNext": [
      "новий Місяць",
      "перша чверть",
      "повний Місяць",
      "остання чверть"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "Останні 30 діб",
    "launched": "Нових об’єктів на орбіті: {n}",
    "launchedLine": "Найновіший: {name}",
    "debris": "Уламки в цифрах",
    "debrisClose": "Закрити вигляд уламків",
    "debrisTitle": "Рахує все, що відстежується на орбіті. Читає весь каталог, близько 1,5 МБ"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a}, і {b}.",
    "title": "З джерел: {sources}. Натисніть, щоб перейти",
    "names": {
      "sat-25544": "МКС",
      "sat-48274": "Тяньгун"
    },
    "pass": "{name} пролітає над вами {when}",
    "launch": "{name} має злетіти {when}",
    "showerToday": "сьогодні пік потоку {name}",
    "showerTomorrow": "завтра пік потоку {name}",
    "moonName": "Місяць",
    "moonPhases": [
      "молодик",
      "",
      "повня",
      ""
    ],
    "moonToday": "Місяць сьогодні — {phase}",
    "moonOne": "до фази «{phase}» лишився один день",
    "moonDays": "до фази «{phase}» лишилося днів: {n}",
    "moonLit": "Місяць освітлений на {pct} %",
    "crew": "зараз на орбіті людей: {n}",
    "crewOne": "зараз на орбіті одна людина",
    "storms": "штормів зараз: {n}",
    "stormOne": "зараз крутиться один шторм",
    "approach": "{name} пролітає повз Землю {when}",
    "launched": "за 30 діб на орбіту потрапило нових об’єктів: {n}",
    "dateToday": "сьогодні {date}",
    "dateClock": "годинник показує {date}",
    "sources": {
      "pass": "елементи орбіт CelesTrak",
      "launch": "Launch Library 2",
      "shower": "календар метеорних потоків IMO",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "годинник вашого пристрою"
    }
  },
  "wonder": {
    "kicker": "Диво дня",
    "label": "Диво дня: {title}"
  },
  "story": {
    "kicker": "Історія цього тижня · тиждень {week}",
    "label": "Історія цього тижня: {title}",
    "ruleTitle": "Як це обчислено: {rule}",
    "lowest": {
      "title": "Найнижчий у нашому каталозі: {name}",
      "line": "Ніколи вище {apogee} км, спускається до {perigee} км, виток за {min} хв.",
      "rule": "Найнижча найвища точка з {n} наборів елементів, молодших за 7 діб"
    },
    "farthest": {
      "title": "Найдальший у нашому каталозі: {name}",
      "line": "Віддаляється до {apogee} км, повертається до {perigee} км, один виток за {lap}.",
      "hours": "{n} год",
      "days": "{n} діб",
      "rule": "Найвища точка з {n} наборів елементів, молодших за 7 діб"
    },
    "busiest": {
      "title": "Найзаселеніша висота в нашому каталозі: від {lo} до {hi} км",
      "line": "{n} із {total} наших об’єктів літають там: {pct} зі 100.",
      "rule": "Найповніші {band} км середньої висоти в {n} наборах, молодших за 7 діб"
    },
    "oldest": {
      "title": "Найстаріший запуск у нашому каталозі: {name}",
      "line": "Запущено у {year} році; років на орбіті: {years}; виток за {min} хв.",
      "rule": "Найраніший рік запуску з {n} наборів елементів, молодших за 7 діб"
    }
  },
  "happened": {
    "flown": "Старт: {age}",
    "lost": "Невдалий запуск {age}"
  },
  "passport": {
    "title": "Паспорт",
    "openTitle": "Де ви побували, зберігається лише в цьому браузері",
    "summary": "{places} · подорожі: {n} з {total}",
    "places": "місця: {n}",
    "placeOne": "місце: {n}",
    "kept": "Зберігається лише в цьому браузері, ніколи не надсилається.",
    "notKept": "Цей браузер нічого не зберігає, тож тут порожньо.",
    "placesTitle": "Місця, які ви відкривали",
    "tripsTitle": "Завершені подорожі",
    "outOf": "{n} з {total}",
    "barLabel": "Завершено подорожей: {n} з {total}",
    "placeTitle": "Перейти до: {name}",
    "noPlaces": "Місць ще немає. Відкрийте одне на мапі.",
    "noTrips": "Завершених подорожей ще немає.",
    "seenTitle": "Бачено на власні очі",
    "noSeen": "Нічого ще не відмічено. На картці є кнопка «Бачено».",
    "seenIt": "Бачено",
    "toolsLabel": "Ще для цього об’єкта",
    "seenOn": "Бачено {date}",
    "seenTitleOff": "Відмітьте, коли побачите це власними очима",
    "seenTitleOn": "Відмічено як бачене. Натисніть, щоб зняти позначку",
    "seenNotKept": "Цей браузер нічого не зберігає, тож позначка не залишиться",
    "remind": "Нагадати",
    "remindTitle": "Завантажує файл календаря з нагадуванням: {title}",
    "forget": "Забути мене",
    "forgetConfirm": "Так, забути",
    "forgetTitle": "Очищає паспорт і вибір звуку з цього браузера",
    "forgotten": "Забуто. Цей браузер тепер нічого не зберігає.",
    "stamp": "Подорож {n} з {total} · {date}",
    "stampPlaces": "{places} (відкрито досі)",
    "resume": "Продовжити із зупинки {n}"
  },
  "kept": {
    "title": "Що цей сайт зберігає на вашому пристрої",
    "lines": [
      "Ваш паспорт: відкриті місця, завершені подорожі, відмічене як бачене.",
      "Ваш вибір звуку й голосу та те, як ви залишили панелі.",
      "Копія даних, які він прочитав востаннє, щоб мапа відкривалася без з’єднання.",
      "Поки екран грає сам, короткий журнал його подорожей, лише для цієї вкладки."
    ],
    "place": "Ваше місце округлюється до десятої частки градуса й зберігається лише поки відкрита ця сторінка.",
    "none": "Ні облікового запису, ні cookie, ні аналітики. «Забути мене» в паспорті очищає паспорт і вибір звуку."
  },
  "buildInfo": {
    "line": "Зібрано з {sha}, {date}",
    "title": "Коміт, з якого зібрано цей сайт, на GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "Чи так виглядає космос?",
    "lead": "Де розташовані об’єкти й як вони рухаються, виміряно або обчислено. Як вони виглядають, походить із трьох видів зображень.",
    "kinds": [
      [
        "Тривимірна модель",
        "Туманності й галактики — це тривимірні моделі, побудовані за опублікованими вимірюваннями, а їхнє світло взято з фотографій телескопів (довгі витримки); та, що ще без моделі, — м’яке сяйво її розміру. Для ока той самий газ — слабке сіре сяйво. На картці можна показати фотографію поряд із моделлю."
      ],
      [
        "Мапа на моделі",
        "Планети й супутники — це кулі, на які натягнуто мапи зі знімків космічних апаратів, деякі з них згладив художник. Космічні апарати — тривимірні моделі, здебільшого з файлів, опублікованих NASA. Світло на них обчислено для показаної миті."
      ],
      [
        "Художнє зображення",
        "Ніхто не бачив поверхні планети іншої зорі. Ці обличчя уявлено за виміряним розміром і температурою, і їхні картки про це кажуть."
      ]
    ],
    "foot": "Розміри й відстані іноді змінено, щоб річ узагалі можна було побачити. Де це так, про це кажуть картка чи малюнок."
  },
  "debris": {
    "title": "Уламки на орбіті",
    "reading": "Читаємо каталог, близько 1,5 МБ",
    "failed": "Каталог не вдалося прочитати.",
    "retry": "Спробувати знову",
    "empty": "У каталозі немає нічого на орбіті.",
    "lead": "{gone} із {total} об’єктів, які відстежуються на орбіті, уже не працюють.",
    "kinds": {
      "debris": "шматків уламків",
      "rocket": "відпрацьованих ступенів ракет",
      "dead": "мертвих супутників",
      "working": "працюючих супутників"
    },
    "bandsTitle": "За висотою",
    "bands": {
      "low": "До 600 км",
      "crowded": "Від 600 до 1 000 км",
      "upper": "Від 1 000 до 2 000 км",
      "medium": "Від 2 000 до 34 000 км",
      "geo": "Близько 36 000 км",
      "beyond": "Понад 37 600 км",
      "stretched": "Витягнуті орбіти"
    },
    "bandAria": "{band}: усього {total}. Уламків: {debris}, ступенів ракет: {rocket}, мертвих супутників: {dead}, працюючих: {working}.",
    "show": "Показати на мапі",
    "hide": "Сховати з мапи",
    "showTitle": "Кожен уламок і відпрацьована ракета, пофарбовані за видом",
    "drawn": "Крапок: {n}. Сірі — уламки, жовті — відпрацьовані ракети. Кожна на справжній висоті й зі справжнім нахилом, у вигаданому місці своєї орбіти.",
    "storiesTitle": "З каталогу",
    "oneObject": "один",
    "objects": "{n}",
    "oneLaunch": "один",
    "launches": "{n}",
    "oneThing": "один",
    "things": "{n}",
    "storyLaunched": "За тиждень до {date} до каталогу додано об’єктів: {objects}; запусків: {launches}.",
    "storyCameDown": "За той тиждень зійшло з орбіти: {things}.",
    "storyCameDownBiggest": "За той тиждень зійшло з орбіти: {things}, найбільший з них — {name}.",
    "storyCloud": "Найбільша хмара уламків — від {name}: на орбіті ще шматків: {pieces}.",
    "storyClouds": "Найбільші хмари уламків: {name}, на орбіті ще шматків: {pieces}; далі {name2}, {pieces2}, і {name3}, {pieces3}.",
    "storyOldest": "Найстаріший об’єкт, що досі на орбіті, — {name}, запущений у {year} році; років на орбіті: {years}.",
    "untracked": "Надто малі для відстеження, за моделлю ESA: приблизно {mid} млн шматків завбільшки 1–10 см і {small} млн завбільшки від 1 мм до 1 см, станом на {when}. Це оцінка, а не підрахунок.",
    "untrackedSource": "Статистика космічного середовища ESA",
    "honesty": "Підраховано за каталогом CelesTrak, прочитаним {date}: те, що може відстежити радар, від приблизно 10 см у поперечнику. Менших шматків набагато більше, і їх немає в жодному каталозі. Де крапка на своїй орбіті, ілюстративно.",
    "drawnPlaced": "Крапок: {n}. Сірі — уламки, жовті — відпрацьовані ракети. {placed} стоять там, де їх ставить власний набір елементів орбіти; решта {rest} — на справжній висоті й зі справжнім нахилом, у вигаданому місці орбіти.",
    "honestyPlaced": "Підраховано за каталогом CelesTrak, прочитаним {date}: те, що може відстежити радар, від приблизно 10 см у поперечнику. Менших шматків набагато більше, і їх немає в жодному каталозі. Місця взято з наборів елементів CelesTrak від {built}; крапка без опублікованого набору елементів стоїть у вигаданому місці своєї орбіти, і її картка про це каже."
  },
  "klassFar": {
    "dwarf": "Карликова планета",
    "interstellar": "Міжзоряний об’єкт"
  },
  "moments": {
    "title": "Чого ви тут шукаєте",
    "wonder": {
      "id": "wonder",
      "label": "Диво",
      "hint": "Облітайте мапу й торкайтеся чого завгодно."
    },
    "now": {
      "id": "now",
      "label": "Зараз",
      "hint": "Що над вашою головою просто цієї хвилини."
    },
    "next": {
      "id": "next",
      "label": "Далі",
      "hint": "Що наближається і коли."
    }
  },
  "audio": {
    "on": "Звук: увімк.",
    "off": "Звук: вимк.",
    "toggleTitle": "Музика й звуки. Вимкнені, поки ви їх не ввімкнете; запам’ятовується на цьому пристрої.",
    "mute": "Вимкнути",
    "unmute": "Звук",
    "muteTitle": "Вимкнути музику й звуки",
    "unmuteTitle": "Ввімкнути музику й звуки",
    "panelTitle": "Звук",
    "panelNote": "Тиха музика для мапи та її подорожей. Нічого не завантажується, поки ви її не ввімкнете.",
    "creditsLine": "Музика й звуки: {credits}",
    "narrationCredit": "Озвучення: синтетичний голос, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "Намальовано кольором, який виміряно в його світлі (B−V {bv}, V−R {vr}), настільки яскравим, наскільки його поверхня відбиває світло (альбедо {albedo}), на шкалі, стиснутій так, щоб найтемніший із цих світів усе ще було видно.",
    "colourRed": "Намальовано кольором, який виміряно в його світлі (B−V {bv}, V−R {vr}), — одним із найчервоніших у Сонячній системі, настільки яскравим, наскільки його поверхня відбиває світло (альбедо {albedo}), на шкалі, стиснутій так, щоб найтемніший із цих світів усе ще було видно.",
    "shapeEgg": "Його форма — яйце, яке виміряли за його кривою блиску та за покриттям зорі в 2017 році, {a} × {b} × {c} км.",
    "shapeMeasured": "Його форма — та, яку виміряли за покриттями зір.",
    "shapeUnknown": "Його форму ніколи не вимірювали, тому його намальовано круглим.",
    "ring": "Його кільце на виміряній відстані, виміряної ширини й непрозорості; як кільце нахилене на небі, не намальовано.",
    "faintRings": "Два його кільця, знайдені в 2023 році, надто слабкі, щоб їх було видно з їхньою справжньою непрозорістю, тому їх не намальовано.",
    "surface": "Жоден телескоп не розгледів його поверхні: нічого на ній не намальовано, і його показано нерухомим, без обертання.",
    "source": "Числа: {src}."
  },
  "worldFace": {
    "titan": {
      "title": "Титан у двох видах",
      "modes": {
        "own": "Інфрачервоний",
        "radar": "Радар"
      },
      "notes": {
        "own": "Поверхня Титана такою, якою її бачила камера Cassini крізь серпанок у ближньому інфрачервоному світлі (938 нм), в оранжевому кольорі серпанку. Моря на півночі затемнено вздовж обрисів, які накреслив радар Cassini, а зблизька, де в них віддзеркалюється Сонце, вони виблискують: де падає відблиск, обчислено; його розмір і яскравість ілюстративні.",
        "radar": "Смуги поверхні Титана такими, якими їх бачив радар Cassini крізь серпанок у 2004–2015 роках: світле — це нерівна поверхня або поверхня, нахилена до радара, темне — гладка, а моря рідкого метану й етану чорні. Сірий колір наш: радар не має кольору. Радар охопив 61 % Титана; між його смугами крізь них проглядає притемнена інфрачервона мапа, оранжева. USGS Astrogeology і NASA/JPL-Caltech, суспільне надбання."
      }
    },
    "venus": {
      "title": "Венера у двох видах",
      "modes": {
        "own": "Хмари",
        "surface": "Поверхня"
      },
      "notes": {
        "own": "Верхівки хмар — це все, що око чи телескоп будь-коли бачать на Венері.",
        "surface": "Поверхня під хмарами, змальована радаром з орбіти апаратом NASA Magellan у 1990–1992 роках. Світле — нерівна поверхня, темне — гладка. Оранжевий колір додано, а смуги, яких Magellan не охопив, заповнено від їхніх країв. Вона освітлена Сонцем так, ніби хмар немає: її гори й уступи за висотоміром Magellan, намальовані вшестеро вищими, відкидають тіні. Вона не рухається разом із хмарами."
      }
    },
    "jupiter": {
      "title": "Юпітер у двох видах",
      "modes": {
        "own": "Мапа художника",
        "hubble": "Яким його бачив Hubble"
      },
      "notes": {
        "own": "Мапа художника, зроблена зі знімків космічних апаратів і згладжена (Solar System Scope). Це зображення, яке знає більшість людей.",
        "hubble": "Юпітер таким, яким його змалював Hubble 11 грудня 2025 року. Смуги там, де вони були того дня, і жодна хмара не там, де вона сьогодні. Кольори — червоний, зелений і фіолетовий фільтри Hubble, трохи жовтіші, ніж побачило б око. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, адаптовано."
      }
    },
    "saturn": {
      "title": "Сатурн у двох видах",
      "modes": {
        "own": "Мапа художника",
        "hubble": "Яким його бачив Hubble"
      },
      "notes": {
        "own": "Мапа художника, зроблена зі знімків космічних апаратів і згладжена (Solar System Scope). Це зображення, яке знає більшість людей.",
        "hubble": "Сатурн таким, яким його змалював Hubble 29 серпня 2025 року, у червоному, зеленому й фіолетовому фільтрах, трохи жовтішим, ніж побачило б око. Смугу на екваторі, яку того дня закривали кільця, заповнено за хмарами по обидва боки від неї. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, адаптовано."
      }
    },
    "uranus": {
      "title": "Уран у двох видах",
      "modes": {
        "own": "Мапа художника",
        "hubble": "Яким його бачив Hubble"
      },
      "notes": {
        "own": "Мапа художника, зроблена зі знімків космічних апаратів і згладжена (Solar System Scope). Це зображення, яке знає більшість людей.",
        "hubble": "Уран таким, яким його змалював Hubble 23 жовтня 2025 року. Планета лежить на боці, а її північний полюс повернутий до нас, тож Hubble бачив лише північну половину; південній половині дано колір екватора, а не вгадано. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, адаптовано."
      }
    },
    "neptune": {
      "title": "Нептун у двох видах",
      "modes": {
        "own": "Мапа художника",
        "hubble": "Яким його бачив Hubble"
      },
      "notes": {
        "own": "Мапа художника, зроблена зі знімків космічних апаратів і згладжена (Solar System Scope). Це зображення, яке знає більшість людей.",
        "hubble": "Нептун таким, яким його змалював Hubble 24 серпня 2025 року: блідіший за відомі знімки. Далека північ була поза полем зору Hubble, і їй дано колір останніх хмар, які він бачив, а не вгадано. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, адаптовано."
      }
    }
  },
  "exposure": {
    "panelTitle": "Експозиція",
    "modes": {
      "eye": "Око",
      "camera": "Камера",
      "deep": "Глибока"
    },
    "notes": {
      "eye": "Те, що ви побачили б із темного місця: слабко й сіро.",
      "camera": "Довга експозиція: хвилини світла, як його накопичує камера.",
      "deep": "Розтягнення, як в обсерваторії: найслабший газ підсилено."
    },
    "real": "Газ справжній і слабкий: для ока біля телескопа це сіре сяйво, бо нічний зір не бачить кольору. Мапа малює його як тривимірну модель; фотографія, яку показує повзунок, — довга експозиція.",
    "colours": {
      "broadband": "Знято крізь широкі кольорові фільтри ({filters}), тож кольори близькі до того, що побачило б набагато чутливіше око.",
      "mixed": "Знято крізь широкі кольорові фільтри з доданим вузьким для світного водню ({filters}), тож червоний газ тут сильніший, ніж його знайшло б око.",
      "narrowband": "Його кольори умовні: кожен із них — світло одного газу крізь вузький фільтр ({filters}), обране, щоб показати будову, а не те, що побачило б око.",
      "infrared": "Знято в інфрачервоному світлі, якого не бачить жодне око ({filters}), тож усі кольори тут обрано: вони показують, що там є, а не те, що побачило б око.",
      "unstated": "Його архів не вказує, які фільтри використано, тож ми не кажемо, чи це кольори, які побачило б око."
    },
    "part": "Показано {part}, а не цілий об’єкт.",
    "creditLead": "Знімок: ",
    "creditTail": " · {licence}, краї розмито, а небо затемнено нами"
  },
  "look": {
    "panelTitle": "Вигляд",
    "modes": {
      "measured": "Виміряний",
      "film": "Кіно"
    },
    "titles": {
      "measured": "Лише те, що виміряно або змодельовано, зі справжньою швидкістю",
      "film": "Додає згенеровані деталі й ілюстративну погоду"
    }
  },
  "lookSaid": {
    "measured": "Вигляд «Виміряний»: нічого згенерованого чи ілюстративного на ньому не намальовано.",
    "film": "Вигляд «Кіно»: намальовано згенеровані деталі й ілюстративну погоду.",
    "worlds": {
      "saturn": "Погода: смуги рухаються зі швидкістю вітру, яку виміряв Cassini. Змодельований рух, а не сьогоднішні хмари."
    },
    "also": {
      "venus": "Про блискавки на Венері повідомлялося, і суперечки тривають; жодної не намальовано."
    },
    "turning": {
      "jupiter": "Зблизька Овал BA і три білі овали обертаються там, де вони є на мапі."
    },
    "poles": {
      "jupiter": "Циклони навколо кожного полюса змодельовано за спостереженнями Juno 2017 року: вісім навколо одного на півночі й п’ять на півдні. Це реконструкція, а не фотографія."
    },
    "sun": {
      "measured": "Вигляд «Виміряний»: згенеровану зернистість вимкнено, а корону й протуберанці втримано нерухомими.",
      "film": "Вигляд «Кіно»: зернистість згенеровано, а корона й протуберанці рухаються так, як намальовано, а не так, як виміряно."
    }
  },
  "otherLight": {
    "panelTitle": "Інше світло",
    "bands": {
      "visible": "Видиме",
      "infrared": "Інфрачервоне",
      "microwave": "Мікрохвильове",
      "gamma": "Гамма-промені"
    },
    "notes": {
      "visible": "Небо таким, яким його бачать очі й камери.",
      "infrared": "Небо в інфрачервоному світлі, умовні кольори: теплий пил і холодні зорі.",
      "microwave": "Мікрохвилі як яскравість: Галактика над найдавнішим світлом.",
      "gamma": "Гамма-промені, умовні кольори: пульсари, блазари, сяйво космічних променів."
    },
    "colours": {
      "infrared": "Червоний — 22 мкм, зелений — 4,6 мкм, синій — 3,4 мкм (WISE)",
      "microwave": "Один діапазон, 94 ГГц, намальований як яскравість (WMAP)",
      "gamma": "Червоний — від 0,3 до 1 ГеВ, зелений — від 1 до 3, синій — понад 3 (Fermi)"
    },
    "mixLabel": "Від видимого неба до: {band}",
    "mixValue": "{pct} % {band}",
    "loading": "Завантажуємо знімок усього неба.",
    "failed": "Цей знімок не надійшов. Небо таке, як було.",
    "creditLead": "Огляд: ",
    "creditTail": ". Плитки: CDS, Страсбург."
  },
  "overlay": {
    "panelTitle": "Дані про Землю",
    "keyTitle": "На глобусі зараз",
    "keyOff": "Зняти",
    "keyOffTitle": "Показати Землю такою, яка вона є",
    "none": "Нічого",
    "loading": "Просимо в NASA знімок.",
    "failed": "Цей знімок не надійшов. Глобус такий, як був.",
    "noEarth": "Показується на Землі, коли вона в полі зору.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "Знімок за {date}.",
      "monthly": "Знімок — середнє за {date}."
    },
    "made": {
      "measured": "Виміряно з орбіти; порожньо там, де нічого не побачено.",
      "analysed": "Виміряно, а прогалини заповнено.",
      "modelled": "Модель погоди, яку годують вимірюваннями, а не прямий знімок."
    },
    "credit": "Дані: {credit}, через NASA GIBS. Мапа даних, а не фотографія.",
    "wind": {
      "title": "Вітер",
      "loading": "Просимо поле вітру.",
      "failed": "Поле вітру не надійшло. Глобус такий, як був.",
      "what": "Вітер на висоті десяти метрів над землею; колір — його швидкість.",
      "dated": "Прогноз на {date}, {time} UTC.",
      "mean": "У середньому близько {mean} м/с, до {max}.",
      "sped": "За секунду смуги проходять {n} год вітру.",
      "spedDay": "За секунду смуги проходять добу вітру.",
      "still": "Кожна смуга — шматок потоку, що стоїть на місці.",
      "credit": "Дані: {credit}. Модель погоди, а не вимірювання."
    },
    "currents": {
      "title": "Океанічні течії",
      "loading": "Просимо океанічні течії.",
      "failed": "Сьогоднішніх океанічних течій тут немає. Глобус такий, як був.",
      "what": "Течії на поверхні моря; колір — температура води.",
      "dated": "Обчислено за висотою моря, яку супутники виміряли {date}: стійкий потік, без припливів і вітрового дрейфу, найменш певний на екваторі.",
      "tempDated": "Температуру виміряно {date}, прогалини заповнено.",
      "tempMissing": "Сіра смуга — вода без температури в даних.",
      "sped": "За секунду смуги проходять {n} діб дрейфу; довга смуга — швидка вода.",
      "spedHours": "За секунду смуги проходять {n} год дрейфу; довга смуга — швидка вода.",
      "still": "Кожна смуга — шматок потоку, що стоїть на місці; довга — швидка вода.",
      "credit": "Дані: {credit}."
    },
    "legendAria": "{title}, від {low} до {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "Фігури — це традиція, намальована нами; зорі в їхніх кутах — на виміряних відстанях.",
    "lineSky": "Фігури — це традиція, намальована нами, поверх зір такими, якими їх видно із Землі.",
    "ecliptic": "Пунктирна лінія — екліптика, шлях Сонця протягом року.",
    "distance": "{n} св. р.",
    "namedDistance": "{name}, {n} св. р."
  },
  "colourKey": {
    "title": "Колір за",
    "unknown": "для них невідомо",
    "scope": "Рахуємо те, що звідси намальовано, на ввімкнених шарах.",
    "byLayer": "Форма — яка є; колір — її шар.",
    "crewed": "із них збудовано для екіпажу",
    "swarm": "із них у великому угрупованні"
  },
  "trajectory": {
    "label": "Його шлях, наступні півтора витка",
    "ariaLabel": "Висота з часом і наземний слід на пласкій мапі",
    "km": "{n} км",
    "now": "зараз",
    "laps": "через 1½ витка",
    "north": "Пн",
    "south": "Пд",
    "note": "Обчислено за тими самими елементами, що й крапка; мапа — це поверхня просто під ним."
  },
  "timeFacts": {
    "label": "Наступні 90 хвилин",
    "barLabel": "Сонячне світло й тінь протягом наступних 90 хвилин: {parts}",
    "barSunlit": "{mins} хв на світлі",
    "barShadow": "{mins} хв у тіні Землі",
    "now": "зараз",
    "end": "+90 хв",
    "entersShadowIn": "Заходить у тінь Землі через {mins}",
    "entersSunlightIn": "Виходить на сонячне світло через {mins}",
    "entersShadowAt": "Заходить у тінь Землі о {time}",
    "entersSunlightAt": "Виходить на сонячне світло о {time}",
    "allSunlit": "На світлі всі наступні 90 хвилин",
    "allShadow": "У тіні Землі всі наступні 90 хвилин",
    "minutes": "{n} хв",
    "underAMinute": "менш як 1 хв",
    "lapIn": "Завершує цей виток через {mmss}",
    "lapAt": "Завершує цей виток о {time}",
    "orbit": "Виток № {n} від запуску",
    "orbitNote": "Виведено: підрахунок каталогу на епоху елементів плюс витки відтоді.",
    "launched": "Запущено у {year} році",
    "nowSunlit": "На світлі",
    "nowShadow": "У тіні Землі",
    "shadowIn": "тінь через {mins}",
    "sunlightIn": "світло через {mins}",
    "shadowAt": "тінь о {time}",
    "sunlightAt": "світло о {time}",
    "lapEndsIn": "виток закінчується через {mmss}",
    "lapEndsAt": "виток закінчується о {time}"
  },
  "train": {
    "label": "У потязі",
    "oneOf": "Один із {n}, запущених разом ({designator}).",
    "youLead": "Цей іде першим.",
    "leads": "Першим іде {name}; місце цього в ряду: {position}.",
    "stillRaising": "Ще піднімаються одним рядом, приблизно на {alt} км угору, — той ряд вогнів, про який розповідають люди.",
    "spreadOut": "Тепер розійшлися, приблизно на {alt} км угору; це вже не лінія на небі."
  },
  "aboard": {
    "label": "Також на борту",
    "openTitle": "Відкрити картку цього",
    "note": "У них немає власної крапки. Вони точно там, де цей апарат, бо прикріплені до нього.",
    "backTitle": "Відкрити картку апарата, що це несе"
  },
  "myth": {
    "label": "Часто кажуть",
    "line": "{claim} — {correction}",
    "contested": "Часто кажуть, і це справді оспорюється: {claim} — {correction}"
  },
  "source": {
    "prefix": "Джерело",
    "unknown": "Джерело не записано",
    "fetched": "прочитано {age}"
  },
  "photo": {
    "title": "Скласти знімок",
    "barLabel": "Знімок",
    "shapesLabel": "Форма",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "Скадрувати знімок у форматі {shape}",
    "caption": "Підпис",
    "captionTitle": "Смужка з назвою, датою й адресою",
    "save": "Зберегти знімок",
    "saveTitle": "Зберегти те, що в рамці, як JPEG",
    "saveTitlePng": "Зберегти те, що в рамці, як PNG",
    "timeLabel": "Час",
    "earlier": "Раніше",
    "later": "Пізніше",
    "timeTitle": "{dir}: крок — {unit}, як у мітці часу",
    "lens": "Об’єктив",
    "lensValue": "{n}°",
    "lensTitle": "Поле зору, {n} градусів. Вузьке — довгий об’єктив; широке охоплює більше",
    "png": "PNG",
    "pngTitle": "Зберегти без втрат, більшим файлом",
    "share": "Поділитися",
    "shareTitle": "Передати знімок у меню «Поділитися» цього пристрою",
    "sharedSaved": "Цей пристрій не став ділитися. Натомість знімок збережено",
    "done": "Вийти з режиму фото",
    "making": "Робимо знімок",
    "saved": "Знімок збережено",
    "failed": "Знімок зараз не вдалося зробити",
    "honesty": "Намальовано за виміряними положеннями, а не фотографія"
  },
  "tonight": {
    "title": "Цієї ночі",
    "placeGuess": "Поблизу {place}, вгадано за вашим часовим поясом",
    "placeSet": "З місця {place}",
    "placeMine": "З місця поблизу вас",
    "placeShared": "З місця {place}, яким з вами поділилися",
    "noPlace": "Вкажіть, де ви, щоб побачити, що пролітає над вами.",
    "coords": "{lat}, {lon}",
    "working": "Обчислюємо прольоти цієї ночі…",
    "passLine": "{name} · {time} · від {from} до {to}, у найвищій точці {fists} ({deg}°) · {mins} хв",
    "startsIn": "Починається через {countdown}",
    "startsAt": "Починається о {time}",
    "upNow": "Зараз над горизонтом, дивіться на {dir}",
    "showMe": "Показати",
    "showMeTitle": "Відкрити небо з вашого місця, обличчям туди, де воно сходить",
    "guessCaveat": "Час там, де ви, може відрізнятися на кілька хвилин.",
    "unitRises": "сходить",
    "unitHigh": "у найвищій точці",
    "unitLong": "хв у полі зору",
    "degrees": "{deg}°",
    "path": "Від {from} до {to}",
    "rowDetail": "{time} · {deg} над горизонтом · {mins} хв",
    "nothingTonight": "Цієї ночі над вами не пролітає нічого яскравого.",
    "nextPass": "Далі: {when} · {name}",
    "nothingAtAll": "Три дні над вами не пролітає нічого яскравого.",
    "darkFrom": "Темно з {time}",
    "darkUntil": "Темно до {time}",
    "darkNow": "Зараз темно",
    "neverDark": "Цієї ночі не стемніє",
    "moonRises": "Місяць {pct} %, сходить о {time}",
    "moonUp": "Місяць {pct} %, зараз над горизонтом",
    "moonDown": "Місяць {pct} %, під горизонтом",
    "more": "Більше прольотів",
    "fewer": "Менше прольотів",
    "arcLabel": "Його шлях небом: сходить (напрям: {from}), найвище на {deg}°, заходить (напрям: {to})",
    "cardinals": {
      "N": "Пн",
      "E": "С",
      "S": "Пд",
      "W": "З"
    },
    "best": {
      "title": "Найкраще цієї ночі",
      "nothing": "Цієї ночі нічого особливого немає.",
      "rowTitle": "Показати на небі",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "{mag} зор. вел.",
      "passAria": "{name}: з’являється {t0} {d0}, найвище {t1} на {deg}° {d1}, зникає {t2} {d2}, зоряна величина {mag}.",
      "fades": "Воно згасає в тіні Землі, перш ніж зайти.",
      "appears": "Воно виходить із тіні Землі на півдорозі вгору.",
      "notVisible": "Не видно: небо світле або воно в тіні.",
      "rocket": "Ступінь ракети · {name}",
      "debris": "Уламок · {name}",
      "planetLine": "найкраще о {time} · {deg}° над горизонтом, {dir}",
      "moonTitle": "Місяць · {phase} · {pct} %",
      "moonSets": "заходить о {time}",
      "moonRises": "сходить о {time}",
      "moonAllNight": "над горизонтом усю ніч",
      "phases": {
        "new": "молодик",
        "waxingCrescent": "серп, що росте",
        "firstQuarter": "перша чверть",
        "waxingGibbous": "майже повний, росте",
        "full": "повня",
        "waningGibbous": "майже повний, спадає",
        "lastQuarter": "остання чверть",
        "waningCrescent": "серп, що спадає"
      },
      "showerLine": "до {zhr} за годину · найкраще о {time}, {dir}",
      "dsoLine": "найкраще о {time} · {deg}° над горизонтом, {dir} · {how}",
      "dsoNeeds": {
        "eye": "неозброєним оком",
        "binoculars": "у бінокль"
      },
      "view": "Мій вигляд",
      "viewHeight": "Наскільки високо має бути",
      "facings": {
        "any": "Усе навколо",
        "n": "Північ",
        "e": "Схід",
        "s": "Південь",
        "w": "Захід"
      },
      "facingTitles": {
        "any": "Усе небо",
        "n": "Лише найкраще на півночі",
        "e": "Лише найкраще на сході",
        "s": "Лише найкраще на півдні",
        "w": "Лише найкраще на заході"
      },
      "heights": {
        "0": "Будь-яка висота",
        "15": "Вище 15°",
        "30": "Вище 30°"
      },
      "viewNothing": "Цієї ночі через цю частину неба нічого не проходить.",
      "darkHours": "Темно від {from} до {to}",
      "moonless": "Місяця немає, темна ніч",
      "moonBright": "Місяць {pct} % ховає слабкі зорі",
      "moonFaint": "Місяць {pct} %, світла мало",
      "neverDark": "Цієї ночі не стемніє.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "Обчислено для вашого місця. Яскравість — оцінка."
    },
    "skybar": {
      "title": "Небо",
      "field": "Поле зору",
      "fields": {
        "eye": "Око",
        "binoculars": "Бінокль",
        "telescope": "Телескоп"
      },
      "fieldNotes": {
        "eye": "Таке широке, як ви бачите. Прокрутіть або розведіть пальці, щоб збільшити.",
        "binoculars": "Поле 7°: з’являються слабші зорі.",
        "telescope": "Поле 1°: планети стають дисками."
      },
      "following": "Стежимо за: {name}. Потягніть небо, щоб відпустити.",
      "followSet": "Зайшло: {name}, тож вигляд відпустило.",
      "show": "Лінії та назви",
      "toggles": {
        "figures": "Фігури",
        "names": "Назви",
        "art": "Малюнки",
        "bounds": "Межі",
        "sunPath": "Шлях Сонця",
        "equator": "Екватор",
        "grid": "Сітка",
        "starGrid": "Зоряна сітка",
        "meteors": "Метеори",
        "trails": "Сліди",
        "seeThrough": "Прозора земля"
      },
      "toggleTitles": {
        "seeThrough": "Намалювати землю прозорою, щоб знайти те, що під горизонтом",
        "figures": "Фігури сузір’їв",
        "names": "Назви сузір’їв і яскравих зір",
        "sunPath": "Шлях, яким ідуть Сонце, Місяць і планети",
        "equator": "Екватор неба, над екватором Землі",
        "grid": "Висота й напрям, з лінією північ — південь",
        "starGrid": "Сітка, на якій нанесено зорі",
        "art": "Західні фігури як малюнки, автор — Johan Meuris",
        "bounds": "Офіційні межі 88 сузір’їв",
        "meteors": "Смуги від потоків, активних цієї ночі, з частотою цієї ночі",
        "trails": "Остання година кожної яскравої зорі як довга експозиція"
      },
      "time": "Час на небі",
      "timeNow": "Зараз",
      "timeNowTitle": "Назад до сьогодення",
      "timeDusk": "Сутінки",
      "timeMidnight": "Північ",
      "timeDawn": "Світанок",
      "timeTitles": {
        "dusk": "Кінець цивільних сутінків цього вечора",
        "midnight": "Середина ночі",
        "dawn": "Початок цивільних сутінків уранці"
      },
      "timeStrip": "Потягніть, щоб повернути небо",
      "timeTicks": {
        "dusk": "Сутінки",
        "midnight": "Північ",
        "dawn": "Світанок"
      },
      "timeStripAria": "Час неба: тягніть або користуйтеся стрілками, десять хвилин за крок",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "день",
        "golden": "низьке Сонце",
        "civil": "цивільні сутінки",
        "nautical": "навігаційні сутінки",
        "astronomical": "останні сутінки",
        "night": "ніч"
      },
      "timeFar": "Так далеко від сьогодні супутників немає: їхні орбіти застарівають.",
      "eyepiece": "Окуляр",
      "eyepieces": {
        "low": "Слабкий · 1°",
        "medium": "Середній · 30′",
        "high": "Сильний · 12′"
      },
      "eyepieceTitles": {
        "low": "Поле в один градус: завширшки як два повні Місяці",
        "medium": "Півградуса: увесь Місяць",
        "high": "П’ята частина градуса: планети як диски"
      },
      "centre": "Що в центрі",
      "centreTitle": "Назвати те, на чому середина вигляду; Enter відкриває його картку",
      "con": {
        "kind": "сузір’я",
        "label": "{name}, сузір’я.",
        "inside": "у сузір’ї {name}"
      },
      "landscape": {
        "city": "Обрій: міський, намальований. Не ваша вулиця.",
        "hills": "Обрій: пагорби, намальовані. Не ваші власні.",
        "coast": "Море в напрямку: {dir}, за мапою води. Суходіл намальовано."
      },
      "artWesternOnly": "Малюнки є лише для західних фігур",
      "culture": "Чиє небо",
      "cultures": {
        "western": "Західне",
        "chinese": "Китайське",
        "maori": "Маорі",
        "hawaiian": "Гавайське",
        "samoan": "Самоанське",
        "tongan": "Тонганське",
        "norse": "Скандинавське",
        "boorong": "Boorong"
      },
      "cultureNotes": {
        "western": "88 сузір’їв, про які астрономи домовилися у 1922 році.",
        "chinese": "Близько 300 малих астеризмів. Одне прочитання живого неба.",
        "maori": "Шість фігур. Назви різняться між іві; небо живе.",
        "hawaiian": "Зоряні лінії мореплавця, якими й досі керують курсом.",
        "samoan": "Чотирнадцять фігур самоанських переказів. Жива традиція.",
        "tongan": "Зоряні шляхи й фігури Тонги. Жива традиція.",
        "norse": "Шість фігур, одна реконструкція скандинавського неба.",
        "boorong": "Небо родини Boorong, як його розповіли у 1857 році. Досі живе."
      },
      "cultureCredits": {
        "western": "Малюнки: Johan Meuris, для Stellarium, Free Art License. Carina, Puppis і Vela мають один спільний малюнок; Serpens його не має.",
        "chinese": "Фігури: Sun Shuwei і Karrie Berglund, для Stellarium, CC BY-SA 4.0. Задокументована реконструкція.",
        "maori": "Фігури: Dan Smale, для Stellarium, CC BY-SA 4.0. Задокументована реконструкція.",
        "hawaiian": "Фігури: за Nainoa Thompson, від Kamehameha Schools Kapālama, для Stellarium, CC BY-SA 4.0.",
        "samoan": "Фігури: Jake Fitisemanu разом із самоанськими хранителями, для Stellarium, CC BY-SA 4.0. Задокументована реконструкція.",
        "tongan": "Фігури: Dan Smale, для Stellarium, CC BY-SA 4.0. Задокументована реконструкція за обмеженими джерелами.",
        "norse": "Фігури: Jonas Persson, для Stellarium, CC BY-SA 4.0. Реконструкція, а не запис.",
        "boorong": "Фігури: John Morieson і Alex Cherney, для Stellarium, CC BY-SA 4.0. Одне прочитання живого неба."
      },
      "meteorNote": "{name}: близько {n} за годину на цьому небі.",
      "meteorFew": "{name}: менше одного за годину на цьому небі.",
      "meteorDown": "{name}: радіант під горизонтом, смуг немає.",
      "meteorHonest": "Частота цієї ночі — модель. Смуги ілюстративні.",
      "meteorSporadic": "Цієї ночі потоку немає. Антигеліонне джерело: {n} за годину.",
      "darkness": "Ваше небо",
      "darknessModes": {
        "city": "Місто",
        "town": "Містечко",
        "dark": "Темне місце"
      },
      "darknessAuto": "Авто",
      "darknessAutoTitle": "Визначити вид неба за нічними вогнями у вашому місці",
      "darknessBy": {
        "place": "Оцінено за мапою нічних вогнів NASA у вашому місці.",
        "reading": "Читаємо нічні вогні у вашому місці.",
        "unread": "Мапу нічних вогнів не вдалося прочитати: виберіть своє небо.",
        "trip": "Задано цією зупинкою подорожі."
      },
      "darknessNotes": {
        "city": "Місто: зорі до 4-ї зоряної величини, без Чумацького Шляху.",
        "town": "Край містечка: зорі до 5,3 зор. вел.",
        "dark": "Темне місце: зорі до 6,5 і Чумацький Шлях."
      },
      "point": {
        "row": "Спрямуйте телефон",
        "on": "Спрямуйте телефон",
        "title": "Підніміть телефон: вигляд повертається разом із ним",
        "note": "Підніміть телефон до неба й повертайтеся. Вигляд іде за вами.",
        "noPlace": "Потрібне ваше місце, щоб знати, де північ.",
        "denied": "Телефон відмовив у доступі до датчика руху. Перетягування все одно працює.",
        "deniedHow": "Щоб дозволити: перезавантажте сторінку й виберіть «Дозволити», коли спитають.",
        "none": "Датчик руху тут не відповів. Перетягування все одно працює.",
        "unsupported": "Цей браузер не надає датчика руху. Перетягування все одно працює.",
        "lineUpWith": "Небо зсунулося? Тягніть, поки не збіжиться {name}.",
        "lineUpPlain": "Небо зсунулося? Тягніть, поки не збіжиться яскрава зоря.",
        "lined": "Вирівняно вручну, на {n}° від компаса.",
        "reset": "Скасувати вирівнювання",
        "resetTitle": "Повернутися до власної півночі компаса",
        "accuracy": "Компас каже, що його точність — приблизно {n}°.",
        "relative": "Компаса тут немає. Перетягніть небо, щоб вирівняти.",
        "declination": "Справжня північ: компас виправлено на {n}°, напрям: {dir}.",
        "east": "схід",
        "west": "захід",
        "honest": "Північ — за компасом телефона. Метал поруч його збиває."
      },
      "red": "Червоне світло",
      "redTitle": "Зробити сторінку червоною, щоб очі звикали до темряви",
      "honesty": "Зорі виміряно, планети обчислено, повітря змодельовано, землю намальовано."
    }
  },
  "keyHint": {
    "title": "Керування",
    "titleTouch": "Жести",
    "label": "Клавіші, що рухають вигляд",
    "labelTouch": "Жести, що рухають вигляд",
    "close": "Закрити",
    "closeTitle": "Закрити (Escape)",
    "does": {
      "turn": "Повернути",
      "zoom": "Ближче, далі",
      "pan": "Зсунути вбік",
      "pick": "Вибрати об’єкт",
      "search": "Пошук",
      "hide": "Сховати все",
      "show": "Що показати",
      "share": "Поділитися",
      "esc": "Закрити",
      "keys": "Усі клавіші",
      "tripPlay": "Грати, пауза",
      "tripStep": "Назад, далі",
      "tripCard": "Сховати картку",
      "tripReplay": "Ще раз",
      "tripSound": "Звук",
      "tripLeave": "Вийти"
    },
    "how": {
      "drag": "Перетягнути",
      "wheel": "Прокрутити",
      "pinch": "Звести пальці",
      "two": "Двома пальцями",
      "tap": "Торкнутися"
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
      "space": "Пробіл",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "Клавіатурні скорочення",
    "tripTitle": "Під час подорожі"
  },
  "render": {
    "eyebrow": "Space Radar · подорож",
    "site": "spaceradar.ai",
    "fly": "Пролетіти самому",
    "music": "Музика: John Bartmann, CC0. Усі подяки — на spaceradar.ai."
  },
  "glossary": {
    "title": "Слова на цій сторінці",
    "hint": "Торкніться терміна, щоб прочитати просте пояснення."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} — пожежа, яка була тут на момент останнього повідомлення, {date}",
        "volcano": "{name} — вулкан, що вивергається з {date}",
        "iceberg": "{name} — айсберг, який був тут на момент останнього повідомлення, {date}"
      },
      "size": "близько {n} км² на момент того повідомлення"
    },
    "storm": {
      "lead": "{name} — {a} {status}; центр системи був тут {ago}",
      "leadUnknown": "{name} — тропічний циклон; центр системи був тут {ago}",
      "leadBefore": "{name} — {a} {status}; центр системи дійде сюди {ago}",
      "leadBeforeUnknown": "{name} — тропічний циклон; центр системи дійде сюди {ago}",
      "wind": "найсильніший вітер на траєкторії, з урахуванням прогнозу, сягає {n} км/год",
      "statuses": {
        "hurricane": "ураган",
        "typhoon": "тайфун",
        "cyclone": "тропічний циклон",
        "storm": "тропічний шторм",
        "depression": "тропічна депресія"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} — чорна діра, світлових років від нас: {dist}",
      "leadPulsar": "{name} — пульсар, світлових років від нас: {dist}",
      "leadMagnetar": "{name} — магнетар, світлових років від нас: {dist}",
      "leadQuasar": "{name} — квазар, світлових років від нас: {dist}",
      "leadStar": "{name} — зоря, світлових років від нас: {dist}",
      "leadRange": "{name} — {a} {kind}, світлових років від нас: від {lo} до {hi}",
      "mass": "маса в масах Сонця: {n}",
      "massRange": "маса в масах Сонця: від {lo} до {hi}",
      "massMillions": "маса в масах Сонця: {n} млн",
      "massBillions": "маса в масах Сонця: {n} млрд",
      "spins": "обертів на секунду: {n}",
      "spinsSlow": "один оберт за {n} с",
      "kinds": {
        "blackhole": "чорна діра",
        "pulsar": "пульсар",
        "magnetar": "магнетар",
        "star": "зоря",
        "quasar": "квазар",
        "galaxy": "галактика",
        "cluster": "скупчення галактик",
        "browndwarf": "коричневий карлик",
        "whitedwarf": "білий карлик"
      },
      "leadGalaxy": "{name} — галактика, світлових років від нас: {dist}, там, де вона зараз",
      "leadCluster": "{name} — скупчення галактик, світлових років від нас: {dist}, там, де воно зараз",
      "leadBrowndwarf": "{name} — коричневий карлик, світлових років від нас: {dist}",
      "leadWhitedwarf": "{name} — білий карлик, світлових років від нас: {dist}"
    },
    "dso": {
      "leadHome": "{name} — галактика, у якій ми живемо; світлових років до її центру: {dist}",
      "lead": "{name} — {a} {type}, світлових років від нас: {dist}",
      "leadRange": "{name} — {a} {type}, світлових років від нас: від {lo} до {hi}",
      "leadUntyped": "{name} — світлових років від нас: {dist}",
      "size": "поперечник у світлових роках: близько {n}",
      "seenAs": "ми бачимо його таким, яким воно було років тому: {n}",
      "seenAsMillions": "ми бачимо його таким, яким воно було мільйонів років тому: {n}",
      "constellation": "у сузір’ї {con}",
      "kinds": {
        "galaxy": "галактика",
        "nebula": "туманність",
        "cluster": "зоряне скупчення",
        "other": "об’єкт далекого космосу"
      }
    },
    "exoplanet": {
      "lead": "{name} — планета біля зорі {host}, світлових років від нас: {dist}",
      "leadNoHost": "{name} — планета біля іншої зорі, світлових років від нас: {dist}",
      "size": "поперечник близько {n}× земного",
      "sizeSmaller": "поперечник близько {n} земного",
      "mass": "маса — {n}× земної",
      "year": "її рік триває діб: {n}",
      "yearHours": "її рік триває годин: {n}",
      "found": "відкрита у {year} році методом «{method}»",
      "foundYear": "відкрита у {year} році",
      "asOf": "за копією каталогу станом на {date}"
    },
    "star": {
      "lead": "{name} — зоря, світлових років від нас: {dist}",
      "leadColour": "{name} — {a} {colour} зоря, світлових років від нас: {dist}",
      "near": "одна з найближчих",
      "seenAs": "ми бачимо її такою, якою вона була років тому: {n}",
      "seenAsMonths": "ми бачимо її такою, якою вона була місяців тому: {n}",
      "luminosity": "яскравість — {n}× сонячної",
      "dimmer": "яскравість — {n} від сонячної",
      "colours": {
        "O": "блакитна",
        "B": "блакитно-біла",
        "A": "біла",
        "F": "жовтувато-біла",
        "G": "жовта",
        "K": "оранжева",
        "M": "червона"
      }
    },
    "station": {
      "lead": "{name} — космічна станція з екіпажем, що кружляє навколо Землі",
      "whyPass": "перетинає ваше небо о {time}",
      "crew": "людей на борту: {crew}",
      "altitude": "на висоті {alt} км",
      "speed": "один виток триває близько {period} хв"
    },
    "satellite": {
      "lead": "{name} — супутник, що кружляє навколо Землі",
      "leadKind": "{name} — {kind}, що кружляє навколо Землі",
      "leadDocked": "{name} — {kind}, пристикований до станції: {station}",
      "aSpacecraft": "космічний апарат",
      "aTelescope": "космічний телескоп",
      "whyLaunchedDays": "запущено {n} діб тому",
      "whyLaunchedYear": "запущено у {year} році",
      "operator": "оператор: {operator}",
      "purpose": "{purpose}",
      "altitude": "на висоті {alt} км",
      "whyPass": "перетинає ваше небо о {time}"
    },
    "debris": {
      "lead": "{name} — відстежуваний уламок",
      "origin": "залишок від: {origin}",
      "brokeUp": "який розпався у {year} році",
      "decay": "має впасти назад в атмосферу приблизно {date}",
      "altitude": "на висоті {alt} км",
      "burnsUp": "майже весь він згоряє на шляху вниз"
    },
    "rocket": {
      "lead": "{name} — запуск ракети",
      "leadWithPad": "{name} — запуск ракети зі стартового майданчика: {pad}",
      "leadStage": "{name} — відпрацьований ступінь ракети, що кружляє навколо Землі",
      "stageLaunched": "запущено у {year} році",
      "whyCountdown": "злітає {when}",
      "whyFlown": "злетіла {when}",
      "destination": "прямує до: {destination}",
      "missionType": "місія типу: {missionType}",
      "illustrative": "траєкторія, намальована тут, — ескіз підйому, а не виміряний шлях"
    },
    "probe": {
      "lead": "{name} — космічний апарат у Сонячній системі",
      "leadOrbits": "{name} — космічний апарат, що кружляє довкола об’єкта: {world}",
      "destination": "летить до: {destination}",
      "lightTime": "так далеко, що радіоповідомлення йде в один бік хвилин: {mins}",
      "lightTimeSeconds": "так близько, що радіоповідомлення йде в один бік секунд: {secs}",
      "lightTimeHours": "так далеко, що радіоповідомлення йде в один бік годин: {hours}",
      "distanceSun": "астрономічних одиниць від Сонця: {au}",
      "milestone": "наступна віха — {milestone}, {date}"
    },
    "telescope": {
      "lead": "{name} — космічний телескоп",
      "observing": "цього тижня націлений на: {target}",
      "station": "розміщений у точці: {station}",
      "altitude": "на висоті {alt} км",
      "sees": "бачить у діапазоні: {band}"
    },
    "asteroid": {
      "lead": "{name} — навколоземний об’єкт на власній орбіті навколо Сонця",
      "leadMainBelt": "{name} — астероїд головного поясу між Марсом і Юпітером",
      "leadBeyond": "{name} — мале тіло за Нептуном, на власній орбіті навколо Сонця",
      "leadDwarf": "{name} — карликова планета на власній орбіті навколо Сонця",
      "leadDwarfBelt": "{name} — карликова планета в поясі астероїдів, між Марсом і Юпітером",
      "leadDwarfBeyond": "{name} — карликова планета за Нептуном",
      "leadDwarfFarBeyond": "{name} — карликова планета далеко за Нептуном",
      "leadInterstellarOut": "{name} — гість від іншої зорі, що залишає Сонячну систему",
      "leadInterstellarIn": "{name} — гість від іншої зорі, що падає до Сонця",
      "distanceSun": "астрономічних одиниць від Сонця: {au}",
      "whyApproach": "пролітає повз Землю {date} на відстані {ld}× відстані до Місяця",
      "size": "{size}",
      "willNotHit": "зіткнення із Землею не буде"
    },
    "comet": {
      "lead": "{name} — комета на довгій петлі навколо Сонця",
      "leadPeriodic": "{name} — комета, що знову повертається до Сонця; період обігу в роках: {n}",
      "leadInterstellarOut": "{name} — комета від іншої зорі, що залишає Сонячну систему",
      "leadInterstellarIn": "{name} — комета від іншої зорі, що падає до Сонця",
      "whyPerihelion": "найближче до Сонця {date}",
      "nakedEye": "достатньо яскрава, щоб знайти без телескопа",
      "faint": "надто тьмяна, щоб побачити без телескопа",
      "distanceSun": "астрономічних одиниць від Сонця: {au}"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} — одна з дивних речей, які люди відправили за межі планети"
    },
    "site": {
      "lead": "{name} — місце на землі, що працює з космічними апаратами",
      "leadKind": "{name} — {a} {kind}",
      "where": "місцезнаходження: {where}",
      "whyDsn": "зараз на зв’язку з апаратом {spacecraft}",
      "whyLaunch": "найближчий запуск: {launch}, {when}",
      "mpc": "його код у Центрі малих планет — {code}",
      "closed": "закрито у {year} році",
      "kinds": {
        "pad": "стартовий майданчик",
        "dish": "радіоантена",
        "observatory": "обсерваторія",
        "tracking": "станція стеження",
        "launch-site": "місце запуску",
        "landing-site": "місце посадки"
      }
    },
    "shower": {
      "lead": "{name} — метеорний потік",
      "peak": "пік близько {date}",
      "speed": "метеори входять в атмосферу зі швидкістю {n} км/с",
      "parent": "його пил походить від: {parent}"
    },
    "world": {
      "lead": "{name} — світ у Сонячній системі",
      "leadMoon": "{name} — власний супутник Землі",
      "leadSun": "{name} — зоря в центрі Сонячної системи",
      "distanceKm": "за {n} км від нас",
      "whyPhase": "сьогодні: {phase}",
      "whyRise": "сходить там, де ви, о {time}",
      "distance": "{distance}",
      "diameter": "поперечник близько {n} км",
      "leadWhat": "{name} — {what}",
      "what": {
        "pluto": "карликова планета за Нептуном, яку до 2006 року вважали дев’ятою планетою",
        "io": "один із чотирьох великих супутників Юпітера й найвулканічніший світ у Сонячній системі",
        "europa": "один із чотирьох великих супутників Юпітера, з океаном солоної води під льодом",
        "ganymede": "найбільший супутник Юпітера й найбільший у Сонячній системі, більший за Меркурій",
        "callisto": "один із чотирьох великих супутників Юпітера й найкратерніший об’єкт у Сонячній системі",
        "titan": "найбільший супутник Сатурна під густим оранжевим серпанком, з метановими озерами; у 2005 році на ньому сів Huygens",
        "enceladus": "малий крижаний супутник Сатурна, чиї гейзери викидають океан з-під льоду в космос",
        "triton": "найбільший супутник Нептуна; обертається у зворотному напрямку й, імовірно, є захопленим об’єктом поясу Койпера",
        "charon": "найбільший супутник Плутона, удвічі менший за самого Плутона; вони завжди обернені одне до одного тим самим боком",
        "phobos": "більший із двох супутників Марса, бугриста брила, що наближається до Марса по спіралі на 1,8 м за сторіччя",
        "deimos": "менший із двох супутників Марса, мала бугриста брила, вкрита кратерами",
        "mimas": "найближчий до Сатурна круглий супутник, позначений кратером завширшки в третину самого супутника",
        "tethys": "п’ятий за розміром супутник Сатурна, майже чистий водяний лід, розсічений ущелиною й величезним кратером",
        "dione": "крижаний супутник Сатурна, чий задній бік вкриває мережа яскравих крижаних урвищ",
        "rhea": "другий за розміром супутник Сатурна, замерзла брудна сніжка з льоду й каменю",
        "iapetus": "третій за розміром супутник Сатурна: один бік чорний, як вугілля, а другий у десять разів яскравіший",
        "miranda": "найменший із п’яти великих супутників Урана, з каньйонами, у 12 разів глибшими за Гранд-Каньйон",
        "ariel": "найяскравіший і наймолодший на вигляд із п’яти великих супутників Урана, перетятий розламними долинами",
        "umbriel": "найтемніший із великих супутників Урана, що відбиває близько п’ятої частини світла, яке на нього падає",
        "titania": "найбільший супутник Урана, нейтрально-сірий, розсічений розламними долинами завдовжки майже 1 600 км",
        "oberon": "другий за розміром супутник Урана, темний, кратерний, з горою заввишки 6 км"
      }
    }
  },
  "live": {
    "label": "Від Землі зараз",
    "km": "км",
    "light": "Світло йде",
    "lightYears": "світлових років",
    "noteFar": "Обчислено за намальованим положенням, до трьох значущих цифр. Воно не змінюється щосекунди.",
    "note": "Обчислено за намальованою орбітою. Останні цифри показують рух, а не місце з точністю до кілометра.",
    "seconds": "{s} с",
    "minSec": "{min} хв {s} с",
    "hourMinSec": "{h} год {min} хв {s} с",
    "sparkLabel": "Відстань від Землі",
    "sparkAria": "Відстань від Землі: від {from} до {to}. {closest}",
    "sparkNow": "зараз",
    "closest": "Найближче: {date} · {dist}",
    "closestAbout": "Найближче: приблизно {date} · {dist}",
    "months": [
      "січ",
      "лют",
      "бер",
      "кві",
      "тра",
      "чер",
      "лип",
      "сер",
      "вер",
      "жов",
      "лис",
      "гру"
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "Встановити годинник на це найближче зближення",
    "moonDistances": "{n} відстаней до Місяця",
    "au": "{n} а. о.",
    "sparkNote": "Обчислено за намальованою орбітою, одна точка на кожні шість діб.",
    "sparkApprox": "Так близько дата й відстань наближені: притягання Землі не враховано.",
    "upYears": "На орбіті, років: {n}; запущено {date}",
    "upOneYear": "На орбіті 1 рік; запущено {date}",
    "upUnderAYear": "На орбіті менше року; запущено {date}",
    "upSinceYear": "Запущено у {year} році; на орбіті близько років: {n}",
    "upSinceYearNew": "Запущено у {year} році",
    "smallBodyHonest": "Обчислено за його орбітою для горизонту на рівні моря. Бути над горизонтом — не те саме, що бути достатньо яскравим, щоб побачити: більшості потрібен телескоп."
  },
  "crew": {
    "label": "Люди на борту",
    "count": "Людей на борту: {n}",
    "countOne": "1 людина на борту",
    "hint": "На борту: {n}",
    "person": "{agency} · діб на орбіті: {days}",
    "personNoAgency": "діб на орбіті: {days}",
    "dockedLabel": "Пристиковано зараз і відколи",
    "docked": "{port} · {date}",
    "asOf": "Прочитано {age} з Launch Library 2 (The Space Devs).",
    "stale": "Прочитано {date}: старіше двох діб, тож могло змінитися.",
    "joined": "Імена — це екіпажі апаратів, пристикованих зараз.",
    "unmatched": "Імена у файлі не збіглися з цією кількістю, тому їх не показано.",
    "waiting": "Читаємо список екіпажу.",
    "none": "Для цієї станції списку екіпажу немає."
  },
  "happened7": {
    "launchesFrom": "з місця: {place}",
    "reached": "на орбіту виведено",
    "failed": "до орбіти не дійшло",
    "partial": "на орбіту виведено, але не на ту, що планувалася",
    "launchDetail": "{rocket}: {status}, {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "Впало {date} (дата входу в атмосферу за каталогом)",
    "debris": "і шматків уламків: {n}",
    "debrisOne": "і 1 шматок уламків",
    "showAll": "Показати всі ({n})",
    "showFewer": "Показати менше",
    "asOf": "Запуски прочитано {age} з Launch Library 2.",
    "stale": "Запуски прочитано {date}: старіше двох діб.",
    "none": "За останні сім діб у файлі нічого немає.",
    "waiting": "Читаємо, що сталося.",
    "decays": "Що впало",
    "decaysTitle": "Читає весь каталог, близько 1,5 МБ",
    "decaysNone": "Цілих об’єктів за останні сім діб не впало.",
    "decaysFailed": "Каталог не вдалося прочитати.",
    "flyTitle": "Летіти туди, звідки він стартував",
    "ago": "{age}"
  },
  "oldest": {
    "label": "Найдовше на орбіті",
    "row": "років: {years} · запущено {date}",
    "note": "Корисні навантаження й ступені ракет, що досі на орбіті, за датою запуску в каталозі.",
    "showTitle": "Показати на мапі"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "Відкриває власну сторінку {publisher} у новій вкладці"
  },
  "placeKeep": {
    "group": "Де ви",
    "change": "Змінити місце",
    "changeTitle": "Місто або те, де вас бачить браузер",
    "remember": "Запам’ятати це місце",
    "rememberTitle": "Зберігає лише в цьому браузері, з точністю до 0,1°",
    "forget": "Забути це місце",
    "forgetTitle": "Видаляє місце, збережене в цьому браузері",
    "kept": "Збережено лише в цьому браузері.",
    "share": "Поділитися цим місцем",
    "shareTitle": "Копіює посилання, що містить це місце з точністю до 0,1°",
    "copied": "Посилання скопійовано. Воно містить це місце з точністю до 0,1°.",
    "copyFailed": "Посилання не вдалося скопіювати."
  },
  "scale": {
    "least": "Планети намальовано щонайменше ×{n} більшими",
    "one": "{name} намальовано ×{n} більшим",
    "title": "Крапки ширші за планети. Натисніть, щоб побачити справжній розмір.",
    "trueLine": "Справжній розмір: {name} тут {px} px завширшки",
    "trueTitle": "Найширша планета, крапки прибрано. Натисніть, щоб намалювати їх знову."
  },
  "launchChip": {
    "opens": "натисніть, щоб відкрити картку",
    "train": "Новий потяг Starlink із {n}, над вами {when}"
  },
  "welcome": {
    "label": "Перший візит",
    "title": "Ви тут уперше",
    "dots": "Кожна крапка — справжня річ. Натисніть на одну.",
    "move": "Тягніть, щоб повернути. Прокручуйте, щоб наблизитися.",
    "moveTouch": "Тягніть, щоб повернути. Розводьте пальці, щоб наблизитися.",
    "trips": "Подорож із гідом — це одна історія за кілька хвилин.",
    "trip": "Подорож із гідом",
    "tripTitle": "Починає першу подорож зі списку",
    "look": "Роздивитися",
    "lookTitle": "Прибирає ці рядки"
  },
  "opening": {
    "label": "Початок",
    "from": "Звідки {source}",
    "wait": "Готуємо подорож",
    "skip": "Будь-яка клавіша чи натискання пропускає це"
  },
  "base": {
    "label": "Повернення на базу",
    "title": "Повернення на базу: Земля, зараз, нічого не вибрано",
    "name": "база",
    "trip": "Вийти з подорожі й повернутися на базу"
  },
  "exoface": {
    "tag": "Художнє зображення",
    "measured": "Виміряно: {parts}.",
    "estimated": "Оцінено: {parts}.",
    "least": "Маса щонайменше {n}× земної.",
    "radius": "радіус {n}× земного",
    "mass": "маса {n}× земної",
    "a": "\u200b",
    "an": "\u200b",
    "yearHours": "{a} рік тривалістю {n} год",
    "yearDays": "{a} рік тривалістю {n} діб",
    "yearYears": "виток тривалістю в роках: {n}",
    "join": ", ",
    "missing": "—",
    "surface": "Поверхню уявлено.",
    "clouds": "Верхівки хмар уявлено.",
    "nothingMeasured": "Тут нічого не виміряно.",
    "whole": "Увесь світ уявлено.",
    "imaginedName": "Уявний світ № {n}",
    "another": "Інший світ",
    "back": "Назад до мапи",
    "stageLabel": "Уявний світ",
    "why": "Намальовано так: {cls}, {climate}: обчислено, а не побачено.",
    "whyGiant": "Намальовано так: {cls}: обчислено за розміром, а не побачено.",
    "cls": {
      "rock": "кам’янистий світ",
      "superEarth": "суперземля",
      "water": "водяний світ",
      "miniNeptune": "міні-Нептун",
      "iceGiant": "крижаний гігант",
      "gasGiant": "газовий гігант"
    },
    "climate": {
      "lava": "лава під її зорею",
      "desert": "жарка суха пустеля",
      "temperate": "м’який клімат, достатній для морів",
      "snowball": "крижаний покрив",
      "eyeball": "один бік завжди до зорі"
    }
  },
  "deep": {
    "inside": "Усередині: {parent}",
    "companion": "Супутник об’єкта: {parent}",
    "kinds": {
      "HII": "емісійна туманність",
      "PN": "планетарна туманність",
      "SNR": "залишок наднової",
      "RfN": "відбивна туманність",
      "DrkN": "темна туманність",
      "GCl": "кулясте скупчення"
    },
    "back": "Назад до: {parent}",
    "backTitle": "Відлетіти до об’єкта, що його охоплює: {parent}"
  },
  "deepHelix": {
    "card": {
      "helix": "Його світло взято з фотографії ESO, форму — з O’Dell, McCullough і Meixner (2004): внутрішній диск, нахилений на 23°, і зовнішнє кільце, нахилене на 53°. Вузли розміщено на їхніх виміряних відстанях. Астроном цього ще не переглядав."
    },
    "how": "Hubble і наземні телескопи показують два еліпси, 499″ на 459″ і 742″ на 446″. Якщо читати їх як кола, видимі під нахилом, це два кільця, нахилені на 23° і 53°, а швидкості вузлів до нас і від нас показують, який бік кожного ближчий (O’Dell, McCullough і Meixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "Цю модель побудовано за її фотографією та підрахунками Gaia її власних зір, нахилену так, як виміряно."
    },
    "rows": {
      "dso-lmc": [
        [
          "Глибина її зір",
          "Не виміряно зоря за зорею: на такій відстані паралакс зорі надто малий. Модель розподіляє її зорі по відомій товщині диска."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "Глибина всередині LMC",
          "Не виміряно: її намальовано на відстані LMC у її власному напрямку. На нахиленому диску вона може лежати приблизно на 2 000 світлових років ближче."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "Край видимого всесвіту",
    "horizonNow": "Зараз приблизно за {n} млрд світлових років від нас",
    "horizonWhy": "Його світло вирушило {age} млрд років тому; відтоді простір розтягнувся",
    "edge": "{n} млрд світлових років: за межами всього, що ми бачимо",
    "edgeWhy": "Видимий всесвіт закінчується приблизно за {h} млрд світлових років.",
    "edgeNothing": "Тут немає нічого виміряного: ця смуга — ілюстрація.",
    "cmbTitle": "Найдавніше світло таким, яким його показує наше небо",
    "cmbWhen": "Воно вирушило приблизно через {k} років після Великого вибуху",
    "cmbPainted": "Намальовано всередині сфери, з якої воно вирушило: ілюстрація",
    "cmbElse": "З будь-якого іншого місця мапа була б іншою",
    "cmbCold": "−{n} мкК",
    "cmbMid": "середнє {t} К",
    "cmbWarm": "+{n} мкК",
    "cmbSay": "Шкала кольорів: синій — до {n} мільйонних часток градуса холодніше за {t} кельвіна, оранжевий — до {n} тепліше",
    "cmbSource": "дев’ятирічна мапа WMAP, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "Його світло взято з фотографії ESO, форму реконструйовано за Wen і O’Dell (1995) та O’Dell (2001): тонкий світний шар на ближньому боці темної хмари, Трапеція приблизно за 0,2 парсека перед ним. Астроном цього ще не переглядав."
    },
    "rows": {
      "dso-m42": [
        [
          "Його форма в глибину",
          "Реконструйовано. Біля Трапеції виміряно: світний шар лежить приблизно за 0,2 парсека позаду її найяскравішої зорі. Далі глибина відповідає опублікованій картині чаші, що відкривається до нас, а не вимірюванню."
        ],
        [
          "Позаду нього",
          "Темна молекулярна хмара, з якої вирізьблено туманність. Якщо дивитися ззаду, туманність у ній прихована."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-m43": [
        [
          "Його форма в глибину",
          "Реконструйовано: менша западина на тій самій хмарі, освітлена зорею NU Orionis. Її глибину не виміряно."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ]
    },
    "how": "Сяйво туманності йде від тонкого шару, де світло найяскравішої зорі Трапеції в’їдається в темну хмару. Wen і O’Dell (1995) змалювали, наскільки далеко за зорею лежить цей шар, за його яскравістю, бо ближча ділянка отримує більше світла."
  },
  "r12Truth": {
    "here": "На цій картці",
    "words": "Слова, усюди",
    "terms": "Слова на цій картці",
    "rows": {
      "where": "Де це",
      "drawnNow": "Намальовано зараз",
      "drawn": "Що намальовано",
      "photo": "Фотографія від",
      "filters": "Фільтри",
      "colours": "Кольори",
      "taken": "Знято",
      "released": "Опубліковано",
      "sky": "Показане небо",
      "survey": "Огляд від",
      "look": "Вигляд"
    },
    "span": "від {a} до {b}",
    "notPublished": "Дату не опубліковано",
    "position": {
      "measured": "Побачено приладом у відомий час",
      "inferred": "Обчислено вперед від старішого вимірювання",
      "illustrative": "Намальовано, щоб показати ідею, а не виміряно",
      "sample": "Вбудовані зразкові дані, не наживо"
    },
    "drawn": {
      "photograph": "Справжнє світло, сфотографоване з нашого боку",
      "reconstruction": "Тривимірна форма з опублікованого дослідження",
      "model": "Модель об’єкта його роду, а не його власні зорі",
      "catalogue": "Положення, які виміряв огляд",
      "illustration": "Намальовано, щоб показати його рід, а не його самого"
    },
    "colours": {
      "broadband": "Широкі кольорові фільтри",
      "mixed": "Кольорові фільтри й водень",
      "narrowband": "Гази, відображені кольорами",
      "unstated": "Не вказано"
    },
    "falseColour": "{band}, умовні кольори",
    "glossary": [
      {
        "term": "парсек",
        "match": [
          "kpc"
        ],
        "say": "Приблизно 3,26 світлового року: відстань, з якої орбіта Землі здавалася б завширшки одну кутову секунду. У наукових статтях пишуть пк, а для тисячі — кпк."
      },
      {
        "term": "мільйон світлових років",
        "match": [
          "млн років тому"
        ],
        "say": "Мільйон світлових років, скорочено Mly. До Андромеди, найближчої великої галактики, близько 2,5 мільйона."
      },
      {
        "term": "мільярд світлових років",
        "match": [
          "млрд років тому"
        ],
        "say": "Тисяча мільйонів світлових років, скорочено Gly. Край того, що ми бачимо, зараз за приблизно 46 мільярдів світлових років."
      },
      {
        "term": "час, відколи вирушило світло",
        "match": [
          "світло вирушило"
        ],
        "say": "Як давно вирушило світло, яке ми бачимо. Від далеких галактик це мільярди років: ми бачимо їх такими, якими вони були тоді."
      },
      {
        "term": "супутня відстань",
        "match": [
          "супутня",
          "млрд світлових років"
        ],
        "say": "Наскільки далеко щось зараз, з урахуванням того, наскільки розтягнувся простір, відколи вирушило його світло. Далеко вона більша, ніж підказує час подорожі світла."
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "вигляд «{mode}»"
  },
  "r12Sun": {
    "image": "Половина Сонця, що була повернута до Землі, — це знімок Solar Dynamics Observatory, зроблений о {time} UTC, {date}, і повернений разом із Сонцем відтоді: екстремальне ультрафіолетове світло на {wl} Å від газу близько мільйона градусів у петлях над поверхнею, в умовних кольорах SDO й намальоване яскравішим. Далекий бік, якого він не бачив, намальовано за моделлю в тих самих умовних кольорах, а де вони сходяться, їх змішано. Це оглядовий знімок, не для науки. Надано NASA/SDO та науковими командами AIA, EVE і HMI.",
    "loops": "Золоті петлі над {n} із сьогоднішніх активних областей ілюстративні: їхні місця взято в NOAA, а їхні форми, висоти й кількість — ні. У вигляді «Виміряний» їх прибрано.",
    "loopsOne": "Золоті петлі над однією із сьогоднішніх активних областей ілюстративні: місце взято в NOAA, а форми, висоти й кількість — ні. У вигляді «Виміряний» їх прибрано.",
    "none": "Не вдалося прочитати жодного знімка сьогоднішнього Сонця, тому намальовано весь диск."
  },
  "r12Nearby": {
    "castShadows": "Його тіні відкидають власні висоти поверхні, з {title}, там, де Сонце зараз, і в справжньому масштабі: виміряно, одна висота щонайбільше на кожні 670 м, тож кратер менший за приблизно два кілометри не відкидає жодної.",
    "sunriseModelled": "Його колір на сході й заході Сонця змодельовано: сонячне світло, почервоніле від повітря, яке воно зачепило, лише розсіювання Релея."
  },
  "r12Giants": {
    "spot": "Крім одного: Велику червону пляму поставлено на довготі {l2}° за Системою II, перенесеній з того, де її виміряли команда JUPOS і Британська астрономічна асоціація {date} ({at}°), зі швидкістю {rate}° на місяць, посередині між двома дрейфами, які вони виміряли того року ({lo} і {hi}), тож зараз вона може бути на {pm}° в обидва боки. Мапу повернуто, щоб поставити її туди, і решта її хмар обертається разом із нею.",
    "rings": {
      "uranus": "його кільця на виміряних відстанях і такі темні, якими є: їхні частинки відбивають близько 1,5 % світла, тридцяту частину того, що відбивають його хмари, тож перед планетою вони — темні нитки; їх намальовано в 10 разів ширшими, ніж вони є, щоб їх було видно, а експозиція «Глибока» підсилює їх у 4 рази, як це робить довга експозиція",
      "jupiter": "його слабке кільце на відстанях і оптичних товщах, які дає довідник NASA: гало й головне кільце, пил і темні зерна, що затримують кілька мільйонних часток світла; два слабші павутинні кільця далі за ними не намальовано. З боку Сонця воно майже ніщо; коли Сонце позаду нього, пил кидає світло вперед, і воно видно, як його бачили Galileo і New Horizons з нічного боку. Щоб воно взагалі було видно, його намальовано в 8 000 разів яскравішим, ніж воно є, в експозиції «Камера», і в 40 000 разів у «Глибокій»; в експозиції «Око» його не намальовано, так воно й виглядало б, як і на найнижчій якості. Гало завтовшки близько 10 000 км і намальоване пласким, не яскравішим, ніж дозволяє його товщина; те, як гало слабшає всередину, а головне кільце густішає до різкого зовнішнього краю, яка частка світла припадає на пил, як далеко вперед він його кидає, червонуватий колір кільця й найбільша яскравість, з якою його намальовано, — ілюстративні"
    }
  },
  "r12Plumes": {
    "line": "Шлейфи намальовано такими, якими їх бачили: {list}.",
    "item": "{name}, заввишки близько {km} км ({by}, {when})",
    "jets": "струмені чотирьох «тигрових смуг», заввишки щонайменше {km} км ({by}, {when})",
    "truth": "Їхні місця й висоти виміряно; дуги зерен — модель, а їхнє світло розтягнуто, щоб їх було видно. Вони можуть зараз і не вивергатися.",
    "stripes": "Смуги намальовано прямими за центрами й довжинами з довідника назв, а місця 101 струменя вздовж них — модель.",
    "column": "Це темні стовпи, які вітер на їхніх верхівках зніс на захід; яка ширина стовпа, невідомо, і його намальовано вузьким.",
    "hot": "Оранжеві точки на нічному боці — гарячі плями, де світиться лава ({list}): їхні місця виміряно, а яскравість — ні.",
    "film": "У вигляді «Кіно» зерна летять своїми дугами в {k} разів швидше за годинник.",
    "still": "Їх утримано нерухомими, як у вигляді «Виміряний» або за зменшеного руху.",
    "review": "Астроном цього ще не переглядав.",
    "span": "від {a} до {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "Її зорі",
      "lightLabel": "Їхнє світло",
      "depthLabel": "Їхня глибина",
      "reviewLabel": "Перевірка",
      "globularStars": "Модель об’єкта його роду, а не його власні зорі: зір яскравіших за точку відриву — {n}, розміщених за профілем King із радіусом ядра за Harris ({rc} світлових років) і приливним радіусом ({rt}). Їхня кількість, яскравість і кольори — модель.",
      "globularLight": "Разом близько {pct} % світла скупчення (абсолютна зоряна величина {mv}); слабкі зорі, яких не представляє жодна точка, — це сяйво. Намальовано до 10-ї зоряної величини, як показує експозиція камери.",
      "openStars": "Членів зі Gaia (Hunt і Reffert 2023, {name}): {n}, кожен із ймовірністю належності щонайменше {p}, у межах приливного радіуса. Намальовано до 10-ї зоряної величини, як їх показує експозиція камери.",
      "openStarsHyg": "Членів зі Gaia (Hunt і Reffert 2023, {name}): {n}, кожен із ймовірністю належності щонайменше {p}, у межах приливного радіуса; {h} яскравіших — власні каталожні зорі мапи. Намальовано до 10-ї зоряної величини, як їх показує експозиція камери.",
      "openDepthSome": "{m} розміщено за їхнім власним паралаксом; решту {k} — на відстані скупчення, а їхню глибину в ньому змодельовано.",
      "openDepthNone": "Їхні напрямки виміряно; їхню глибину всередині скупчення змодельовано, бо на такій відстані паралакс однієї зорі недостатньо точний.",
      "review": "Цю модель ще не переглядав астроном."
    }
  },
  "a45": {
    "farNote": "наскільки далеко воно зараз ({how}), за його червоним зміщенням {z} у космології Planck 2018",
    "comoving": "супутня відстань",
    "pulsarDistance": [
      "за власним паралаксом пульсара",
      "відстань до кулястого скупчення, залишку наднової чи іншого об’єкта, до якого він належить",
      "оцінка моделі за радіосигналом (модель YMW16 вільних електронів Галактики), а не вимірювання: вона може сильно помилятися"
    ],
    "shape": {
      "galaxy": "позначка на відстані, яку дає її червоне зміщення; галактика так далеко — щонайбільше кілька пікселів завширшки, тож її форму не намальовано",
      "browndwarf": "кільце на виміряній відстані; коричневий карлик у цьому масштабі — точка, що випромінює майже нуль видимого світла",
      "whitedwarf": "кільце на виміряній відстані; сам білий карлик у цьому масштабі — точка",
      "cluster": "позначка в рентгенівському центрі скупчення; галактики-члени намальовано лише для Діви, Волосся Вероніки, Печі й Персея (етап Місцевої групи)"
    },
    "quasarZ7": "Квазар, який ми бачимо таким, яким він був приблизно через {age} млн років після Великого вибуху: один із {n} відомих за червоного зміщення 7.",
    "unplaced": {
      "unnamed": "Зоря HYG {id}",
      "lead": "{name} — зоря в напрямку, куди ви дивитеся; ніхто не виміряв, як далеко вона",
      "leadColour": "{name} — {a} {colour} зоря в напрямку, куди ви дивитеся; ніхто не виміряв, як далеко вона",
      "note": "Намальовано на небі, але ніде в космосі, бо для місця потрібна відстань.",
      "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): лише напрям і зоряна величина"
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "яскрава точка там, куди її ставить червоне зміщення, з кільцем, що позначає місце; її диск і струмінь надто малі, щоб їх намалювати",
      "host": "Її материнську галактику намальовано слабкою й круглою, з кутовим розміром, який дає джерело, — {size} кутових секунд завширшки, якщо дивитися звідси; насправді це приблизно {ly} світлових років. Її сплюснутість і нахил не намальовано.",
      "point": "Джерело не дає розміру її материнської галактики, тому нічого не намальовано."
    },
    "cluster": {
      "members": "Галактик-членів із {catalogue}: {n}; з них {own} стоять на відстанях, виміряних поодинці.",
      "membersNoOwn": "Галактик-членів із {catalogue}: {n}.",
      "distanceSbf": "Скупчення за {mpc} мегапарсеків ({mly} млн світлових років) від нас — середнє з відстаней, знайдених за флуктуаціями поверхневої яскравості.",
      "distanceZ": "Скупчення за {mly} млн світлових років від нас: середнє червоне зміщення його членів ({z}), перенесене на супутню відстань в єдиній космології мапи.",
      "depthMeasured": "Галактику без власної відстані розподілено в глибину за виміряним розкидом скупчення (у мегапарсеках: {rms}); це розміщення — модель.",
      "depthModelled": "Жодна галактика тут не має власної відстані, тому їх розподілено в глибину так само широко, як по небу, ніби скупчення кругле; це розміщення — модель.",
      "size": "Кожна галактика така широка, як каже її каталожний радіус половини світла, намальована круглою, яскравою в центрі формою; її сплюснутість і нахил не намальовано."
    }
  },
  "deepRing": {
    "card": {
      "m57": "Його світло взято з фотографії Hubble, форму — з O’Dell, Ferland, Henney і Peimbert (2013): товсте кільце, нахилене на 13,5°, видиме майже вздовж своєї осі, а синіший газ його середини намальовано таким, що тягнеться до нас і від нас. Його кольори — кольори фотографії, знятої крізь вузькі фільтри. Астроном цього ще не переглядав.",
      "m27": "Його світло взято з фотографії NOIRLab, показаної у власних відтінках його газів; його форма — реконструкція: яскрава талія — товсте кільце, видиме майже з ребра, слабші вуха — його частки, за швидкостями оболонок, які виміряли Meaburn та інші (2005). Астроном цього ще не переглядав.",
      "southern-ring": "Його світло взято з інфрачервоної фотографії Webb; його форма відповідає Kastner та ін. (2024) і De Marco та ін. (2022): кільце, видиме майже вздовж осі, бульбашка крізь нього й молекулярне гало навколо обох. Астроном цього ще не переглядав."
    },
    "rows": {
      "dso-m57": [
        [
          "Його відстань",
          "Паралакс (Gaia DR3) його центральної зорі, Gaia DR3 2090486618786534784: 1,270 ± 0,044 мілісекунди дуги, близько 2 570 світлових років (від 2 480 до 2 660)."
        ],
        [
          "Його форма в глибину",
          "Реконструйовано. Розмір кільця на небі, нахил його довгої осі та те, який кінець ближчий, виміряно. Його товщину та форму газу крізь його середину — ні: їх намальовано як ілюстрацію."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-m27": [
        [
          "Його форма в глибину",
          "Реконструйовано. Його розмір, його кут на небі та швидкості його оболонок виміряно; те, що талія — кільце, видиме майже з ребра, і як його вуха тягнуться до нас і від нас, — звичне прочитання туманності такого вигляду, намальоване як ілюстрація."
        ],
        [
          "Його кольори",
          "Власні відтінки його газів, з вузьких фільтрів фотографії: кисень — бірюзовий, водень і сірка — червоні. Наскільки сильно показано кожен, — наш вибір."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-southern-ring-nebula": [
        [
          "Його форма в глибину",
          "Реконструйовано. Те, що його яскраве кільце видно під кутом від 15 до 30° до осі, виміряно (Kastner та ін., 2024); який бік ближчий, товщина кільця й довжина бульбашки — ілюстративні."
        ],
        [
          "Його кольори",
          "Інфрачервоне світло, якого не бачить жодне око, якому кольори дали автори зображень Webb."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ]
    },
    "how": "Знімки Hubble в окремих кольорах світла, з виміряними швидкостями газу по туманності, показують товсте кільце майже анфас: його довга вісь нахилена на 13,5°, а північно-східний кінець ближчий до нас. Швидший газ заповнює його середину й тягнеться до нас і від нас уздовж променя зору (O’Dell, Ferland, Henney і Peimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "crab": "Його світло взято з фотографії Hubble, в умовних кольорах, нанесене на оболонку, форма якої відповідає Martin, Milisavljevic і Drissen (2021): клітка з волокон завдовжки близько 4 парсеків навколо порожньої середини. Астроном цього ще не переглядав.",
      "veil": "Його світло взято з фотографії NOIRLab, в умовних кольорах, нанесене на тонку сферу завширшки 37 парсеків (Fesen та ін., 2018): волокна — її край, видимий з ребра. Астроном цього ще не переглядав.",
      "horsehead": "Його темряву прочитано з фотографії NOIRLab: пил перед світним газом IC 434, який поглинає й червонить те, що за ним, і сам не випромінює світла. Астроном цього ще не переглядав.",
      "coalsack": "Його темряву прочитано з Чумацького Шляху навколо: хмара пилу приблизно за 590 світлових років, що тьмянить і червонить зорі за нею. Астроном цього ще не переглядав.",
      "m78": "Його світло — фотографія NOIRLab: пил, що розсіює синє світло зорі перед ним, на лиці темної хмари. Його глибину реконструйовано. Астроном цього ще не переглядав.",
      "iris": "Його світло — фотографія NOIRLab: пил, що розсіює світло молодої зорі HD 200775 у западині її хмари. Його глибину реконструйовано. Астроном цього ще не переглядав.",
      "m45": "Його світло — фотографія NOIRLab: хмара пилу, що дрейфує крізь скупчення просто перед його зорями й розсіює їхнє синє світло (Ritchey та ін., 2006). Його глибину реконструйовано. Астроном цього ще не переглядав."
    },
    "rows": {
      "dso-m1": [
        [
          "Його форма в глибину",
          "Реконструйовано за виміряним обрисом. Волокна сягають приблизно 2 парсеків уздовж осі вітру пульсара, і жодне не лежить ближче ніж пів парсека від центра (Martin та ін., 2021). Намальовано як еліпсоїд уздовж цієї осі; який кінець ближчий до нас, припущено."
        ],
        [
          "Його кольори",
          "Умовні кольори: вузькі фільтри фотографії для кисню й сірки, відображені на кольори авторами знімка."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-veil-nebula": [
        [
          "Його форма в глибину",
          "Реконструйовано: сфера завширшки 37 парсеків, розмір і відстань, які виміряли Fesen та ін. (2018). Товщина оболонки ілюстративна."
        ],
        [
          "Його кольори",
          "Умовні кольори: вузькі фільтри фотографії для кисню, сірки й водню, відображені на кольори автором знімка."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "Його форма в глибину",
          "Реконструйовано. Пил перед світним газом IC 434, як спостерігається; як далеко перед ним і наскільки він товстий, — ілюстративно."
        ],
        [
          "Що робить пил",
          "Він лише поглинає: зорі й сяйво за ним тьмяніють, і в синьому сильніше, ніж у червоному, тож виглядають червонішими. Власного світла він не випромінює."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-coalsack": [
        [
          "Наскільки він темний",
          "Прочитано за тим, наскільки Чумацький Шлях тут темніший, ніж на такій самій відстані від його серединної лінії поблизу. Це оцінка, і вона нижча, ніж дають інфрачервоні мапи, бо зорі перед хмарою додають своє світло."
        ],
        [
          "Що робить пил",
          "Він лише поглинає: зорі за ним тьмяніють і червоніють. Зорі перед ним — ні. Частина темряви на північному сході — друга хмара далеко позаду, намальована тут на ближній відстані."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-m78": [
        [
          "Його форма в глибину",
          "Реконструйовано: освітлений пил як лист із його зорею попереду й темною хмарою позаду. Глибини ілюстративні."
        ],
        [
          "З іншого боку",
          "Змодельовано: пил розсіює більше світла вперед, ніж убік, тож з іншого боку той самий пил виглядає яскравішим або слабшим."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-iris-nebula": [
        [
          "Його форма в глибину",
          "Реконструйовано: освітлені стінки як лист із зорею попереду й темною хмарою позаду. Глибини ілюстративні."
        ],
        [
          "З іншого боку",
          "Змодельовано: пил розсіює більше світла вперед, ніж убік, тож з іншого боку той самий пил виглядає яскравішим або слабшим."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ],
      "dso-m45": [
        [
          "Його форма в глибину",
          "Реконструйовано. Газ перед зорями, як показує їхнє світло; як далеко перед ними й наскільки товстий пил, — ілюстративно, а власні глибини зір усередині скупчення — фіксована модель, а не вимірювання."
        ],
        [
          "Що робить пил",
          "Він розсіює світло зір, найбільше синє, тож світиться синім навколо найяскравіших із них, найбільше біля Меропи й Майї. Це хмара, що проходить повз, а не те, з чого народилися зорі."
        ],
        [
          "Перевірка",
          "Цю модель ще не переглядав астроном."
        ]
      ]
    },
    "how": "Газ залишку летить назовні зі сталою швидкістю, тож його швидкість до нас або від нас показує, як далеко він перед центром або позаду нього. Martin, Milisavljevic і Drissen (2021) так перетворили 310 000 спектрів Краба на його форму."
  },
  "r12Navigate": {
    "chainLabel": "Де це",
    "chainTitle": "Летіти до: {name}",
    "milkyWay": "Чумацький Шлях",
    "outside": "Поза Чумацьким Шляхом",
    "the": [
      "Сонце",
      "Місяць",
      "Чумацький Шлях"
    ],
    "theWord": "\u200b",
    "backParent": "Назад до: {parent}",
    "backParentTitle": "Відлетіти до: {parent}",
    "legendTitle": "Відкрити умовні позначення: що означає кожне з цих слів",
    "label": "Де ви",
    "title": "Де камера на драбині, від Землі до Місцевої групи",
    "back": "Назад",
    "backTo": "Назад до: {name}",
    "sep": "›",
    "rungs": {
      "earth": "Земля",
      "sun": "Сонячна система",
      "stellar": "Найближчі зорі",
      "galaxy": "Чумацький Шлях",
      "local-group": "Місцева група"
    },
    "notes": {
      "sun": "Прискорено: відстань до Сонця — {distance}",
      "stellar": "Прискорено: відстань до найближчої зорі — {distance}",
      "galaxy": "Прискорено: відстань до центру нашої галактики — {distance}",
      "local-group": "Прискорено: відстань до Андромеди — {distance}"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "Сонце",
      "ROCKY_PLANET": "Кам’янисті планети",
      "GAS_GIANT": "Газові гіганти",
      "ICE_GIANT": "Крижані гіганти",
      "RINGS": "Кільця",
      "VOLCANIC_MOON": "Вулканічний супутник",
      "ICY_MOON": "Крижані супутники",
      "TITAN": "Супутник з атмосферою",
      "AIRLESS_MOON": "Супутники без атмосфери",
      "DWARF_PLANET": "Карликові планети",
      "ASTEROID": "Астероїди",
      "COMET": "Комети",
      "ARTIFICIAL_SATELLITE": "Супутники",
      "LAUNCH_AND_ROCKET": "Запуски й ракети",
      "SPACE_PROBE": "Космічні зонди",
      "LANDING_SITE": "Місця посадки",
      "EXOPLANET": "Екзопланети",
      "STAR": "Зорі",
      "BINARY_AND_MULTIPLE": "Подвійні й кратні зорі",
      "COMPACT_REMNANT": "Мертві зорі",
      "BLACK_HOLE": "Чорні діри",
      "OPEN_CLUSTER": "Розсіяні скупчення",
      "GLOBULAR_CLUSTER": "Кулясті скупчення",
      "EMISSION_NEBULA": "Емісійні туманності",
      "PLANETARY_NEBULA": "Планетарні туманності",
      "DARK_NEBULA": "Темні туманності",
      "REFLECTION_NEBULA": "Відбивні туманності",
      "SUPERNOVA_REMNANT": "Залишки наднових",
      "GALAXY_SPIRAL": "Спіральні галактики",
      "GALAXY_IRREGULAR": "Неправильні галактики",
      "GALAXY_ELLIPTICAL": "Еліптичні галактики",
      "GALAXY_INTERACTION": "Галактики, що взаємодіють",
      "AGN_QUASAR": "Квазари",
      "GALAXY_GROUP": "Групи галактик",
      "GROUND_SITE": "Наземні станції",
      "ODDITY": "Дивини"
    },
    "other": "Інше",
    "byName": "За назвою",
    "of": "{label}: {world}",
    "only": "3D-моделі",
    "onlyTitle": "Показати лише те, що намальовано за тривимірною моделлю: справжньою або реконструкцією",
    "real": "справжня 3D-модель",
    "rebuilt": "3D-реконструкція",
    "noneWithModel": "Жоден із них не має тривимірної моделі.",
    "counting": "рахуємо…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "Рух",
      "choices": {
        "on": "Увімк.",
        "off": "Вимк."
      },
      "titles": {
        "on": "Польоти плавні, а подорожі йдуть самі, як і задумано в мапі",
        "off": "Кожен політ — миттєвий перехід, ніщо не рухається, чого не виміряно, а подорож чекає на «Далі»"
      },
      "device": "Ваш пристрій просить менше руху, тому вимкнено."
    },
    "summary": {
      "label": "Що на екрані",
      "stage": "Дивимося на: {stage}.",
      "selected": "Вибрано: {name}, {kind}.",
      "nothing": "Нічого не вибрано.",
      "trip": "Зупинка подорожі {n} з {count}: {title}.",
      "tripIntro": "Відкрито подорож: {title}.",
      "measured": "Намальовано як виміряно."
    }
  },
  "r13Deep": {
    "card": {
      "dso-tarantula-nebula": "Його світло поблизу нашого променя зору — фотографія Webb; його газ — модель порожнини навколо скупчення R136 усередині оболонки світного газу, затиснутого молекулярними хмарами, за Pellegrini, Baldwin і Ferland (2011). Астроном цього ще не переглядав.",
      "dso-m43": "Його світло взято з фотографії ESO, форму реконструйовано як меншу западину на тій самій темній хмарі, що й туманність Оріона, освітлену зорею NU Orionis. Астроном цього ще не переглядав.",
      "dso-m51": "Побудовано за опублікованим нахилом і будовою: двоповоротна спіраль, видима майже анфас, її супутниця NGC 5195 позаду кінця її північного рукава й рукав, що сягає її; глибини — модель. Астроном цього ще не переглядав.",
      "dso-m81": "Побудовано за опублікованим нахилом і будовою: велике старе балдж, два щільно закручені рукави з пилом на їхніх внутрішніх краях. Астроном цього ще не переглядав.",
      "dso-m101": "Побудовано за опублікованим нахилом і будовою: великий диск, видимий майже анфас, багато рукавів і гігантські області зореутворення там, де їх ставить небо. Астроном цього ще не переглядав.",
      "dso-m104": "Побудовано за опублікованим нахилом і будовою: величезне кругле балдж і тонкий диск, видимий майже з ребра, а перед ним кільце пилу. Астроном цього ще не переглядав.",
      "dso-antennae-galaxies": "Дві галактики, що стикаються, там, де їх ставить небо, і два їхні припливні хвости; як далеко кожна частина попереду чи позаду, — модель за симуляціями зіткнення. Астроном цього ще не переглядав.",
      "dso-m83": "Побудовано за опублікованим нахилом і будовою: спіраль із перемичкою, видима майже анфас, її рукави багаті молодими зорями й світним воднем. Астроном цього ще не переглядав.",
      "dso-ngc-1300": "Побудовано за опублікованою будовою: довга перемичка з пиловими смугами на передніх краях і два рукави від її кінців, форму яких підігнано до фотографії Hubble. Астроном цього ще не переглядав.",
      "dso-centaurus-a": "Побудовано за опублікованими числами: гігантська еліптична галактика, перетята викривленим диском пилу й молодих зір, за моделлю, підігнаною до знімків Spitzer; її два струмені намальовано в умовних кольорах, бо вони сяють у рентгенівських і радіохвилях, а не у видимому світлі. Астроном цього ще не переглядав."
    }
  },
  "compare": {
    "row": "Порівняти",
    "hint": "в масштабі",
    "missing": "—",
    "none": "Немає",
    "yes": "Так",
    "no": "Ні",
    "range": "від {a} до {b}",
    "numUnit": "{num} {unit}",
    "modeLabel": "Вигляд",
    "modes": {
      "pair": "Поруч",
      "lab": "Усі світи"
    },
    "withLabel": "Порівняти з",
    "scaleLabel": "Масштаб",
    "scales": {
      "true": "В масштабі",
      "same": "Однакова ширина"
    },
    "propLabel": "Упорядкувати всі світи за",
    "props": {
      "across": "Ширина",
      "mass": "Маса",
      "gravity": "Тяжіння",
      "temp": "Температура",
      "spin": "Тривалість обороту",
      "year": "Тривалість року",
      "dist": "Відстань від Сонця",
      "moons": "Кількість супутників"
    },
    "names": {
      "sun": "Сонце",
      "mercury": "Меркурій",
      "venus": "Венера",
      "earth": "Земля",
      "moon": "Місяць",
      "mars": "Марс",
      "jupiter": "Юпітер",
      "saturn": "Сатурн",
      "uranus": "Уран",
      "neptune": "Нептун",
      "pluto": "Плутон"
    },
    "the": {
      "sun": "Сонце",
      "moon": "Місяць"
    },
    "wider": "Поперечник: {big} більший за {small} у {n} разів.",
    "same": "{a} і {b} приблизно однакової ширини.",
    "figure": "{a} і {b}, намальовані {how}.",
    "figureTrue": "в одному масштабі",
    "figureSame": "однакової ширини, не в масштабі",
    "tableLabel": "{a} і {b}",
    "rows": {
      "across": "Поперечник",
      "mass": "Маса",
      "gravity": "Тяжіння",
      "temp": "Температура",
      "spin": "Один оберт триває",
      "year": "Один рік там",
      "dist": "Від Сонця",
      "air": "Атмосфера",
      "pressure": "Тиск повітря",
      "moons": "Супутники",
      "rings": "Кільця"
    },
    "units": {
      "km": "км",
      "earthOne": "× Землі",
      "earths": "× Землі",
      "g": "м/с²",
      "c": "°C",
      "hours": "год",
      "days": "діб",
      "years": "р.",
      "au": "а. о.",
      "bar": "бар",
      "microbar": "мкбар"
    },
    "notes": {
      "average": "середнє",
      "flattened": "у середньому; вона сплюснута",
      "range": "діапазон",
      "bar1": "на рівні 1 бар",
      "edge": "на видимому краї",
      "photosphere": "видима поверхня",
      "retro": "обертається у зворотний бік",
      "sunSpin": "на широті 16°",
      "withEarth": "разом із Землею",
      "exosphere": "тонка екзосфера",
      "photosphereAir": "у фотосфері"
    },
    "air": {
      "part": "{share} % {gas}",
      "join": ", ",
      "almostNone": "Майже немає",
      "noSurface": "Поверхні немає"
    },
    "gas": {
      "hydrogen": "водень",
      "helium": "гелій",
      "methane": "метан",
      "nitrogen": "азот",
      "oxygen": "кисень",
      "argon": "аргон",
      "carbon dioxide": "вуглекислий газ"
    },
    "source": "Planetary Fact Sheets від NASA, прочитано {date}.",
    "giantNote": "У гіганта немає поверхні: його тяжіння й температура — на рівні 1 бар.",
    "moonsNote": "Кількість супутників зростає, коли підтверджують нові.",
    "spinNote": "Оберт Сонця — значення з довідника на широті 16°.",
    "drawnTrue": "Намальовано в одному масштабі за середнім радіусом кожного; це не фотографії.",
    "drawnSame": "Однакова ширина, тож не в масштабі. Кільця зберігають свою частку від неї.",
    "tiny": "{name} тут менший за піксель і намальований крапкою.",
    "ringsDrawn": "Кільця нахилені для малюнка; їхні радіуси взято в NASA.",
    "labLog": "Стовпчики логарифмічні, щоб малі значення лишалися видимими.",
    "labLinear": "Стовпчики пропорційні кількості.",
    "labTitle": "Порівняти з: {name}",
    "thisCard": "Світ на цій картці"
  },
  "passportKinds": {
    "kindsTitle": "Відкрито, за видами",
    "noKinds": "Рахувати за видами поки нічого.",
    "kinds": {
      "worlds": "Планети, супутники й Сонце",
      "stations": "Космічні станції",
      "satellites": "Супутники та їхні ракети",
      "spacecraft": "Зонди й космічні телескопи",
      "small": "Комети й астероїди",
      "stars": "Зорі",
      "exoplanets": "Планети інших зір",
      "deep": "Туманності, галактики й далекий космос",
      "earth": "Місця й погода на Землі"
    },
    "notedTitle": "Відзначено",
    "noNoted": "Нічого ще не відзначено. Відкрийте місце на мапі.",
    "notedFine": "День, коли вперше стало видно, що позначка тримається в цьому браузері. Зберігається тут, ніколи не оцінюється й не надсилається.",
    "noted": {
      "first": {
        "name": "Перше місце",
        "said": "Ви відкрили місце на мапі."
      },
      "planets": {
        "name": "Усі вісім планет",
        "said": "Ви відкрили кожну планету, від Меркурія до Нептуна."
      },
      "station": {
        "name": "Космічна станція",
        "said": "Ви відкрили станцію на орбіті."
      },
      "craft": {
        "name": "Апарат там, далеко",
        "said": "Ви відкрили зонд або космічний телескоп."
      },
      "small": {
        "name": "Комета або астероїд",
        "said": "Ви відкрили мале тіло Сонячної системи."
      },
      "star": {
        "name": "Зоря",
        "said": "Ви відкрили зорю за межами Сонця."
      },
      "exoplanet": {
        "name": "Планета іншої зорі",
        "said": "Ви відкрили планету, що обертається навколо іншої зорі."
      },
      "deep": {
        "name": "Далекий космос",
        "said": "Ви відкрили туманність, галактику або скупчення."
      },
      "trip": {
        "name": "Подорож до кінця",
        "said": "Ви завершили подорож із гідом."
      },
      "eyes": {
        "name": "Бачено на власні очі",
        "said": "Ви відмітили щось як побачене."
      },
      "every": {
        "name": "По одному з кожного виду",
        "said": "Ви відкрили щонайменше по одному об’єкту кожного з перелічених вище видів."
      }
    }
  },
  "photoCompare": {
    "title": "Порівняти з фотографією",
    "reconstruction": "Реконструкція",
    "photograph": "Фотографія",
    "valueText": "{n} % фотографії",
    "flying": "Летимо туди, звідки зроблено фотографію.",
    "note": "Мапа малює тривимірну модель. Фотографію показано лише тут: плоскою й повернутою до Сонця, тож якщо відвернутися, вона зникає."
  },
  "entrances": {
    "label": "Три входи",
    "tonight": "Цієї ночі",
    "tonightTitle": "Що над головою цієї ночі, з вашого місця",
    "explore": "Огляд",
    "exploreTitle": "Роззирнутися по всій мапі",
    "trip": "Подорож із гідом",
    "tripTitle": "Починає першу подорож із гідом зі списку"
  },
  "momentPlayer": {
    "micro": "Момент",
    "play": "Грати",
    "pause": "Пауза",
    "replay": "Ще раз",
    "close": "Закрити момент",
    "chapters": "Розділи",
    "chaptersTitle": "Перейти до розділу",
    "share": "Скопіювати посилання на цю секунду",
    "copied": "Посилання скопійовано",
    "copyFailed": "Скопіюйте це посилання: {url}",
    "director": "Режисер",
    "directorTitle": "Повернути камеру режисерові",
    "freeNote": "Ваша камера. Тягніть, щоб роззирнутися; «Режисер» поверне її назад.",
    "scrubber": "Час місії",
    "met": "Час від початку місії",
    "rateTitle": "Час тут іде швидше, ніж насправді: {rate}",
    "realTime": "Справжній час",
    "loading": "Завантажуємо момент…",
    "missing": "Моменту «{id}» не існує.",
    "unreachable": "Цей момент не завантажився. На цьому пристрої він зберігається лише після того, як його один раз відкрито з мережею.",
    "modelMissing": "Модель {model} не завантажилася; її шлях і полум’я все одно намальовано.",
    "chapterOf": "Розділ {n} з {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "Виміряно",
      "reconstructed": "Реконструйовано",
      "illustrative": "Ілюстративно"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "Ступені поки вирізано з однієї моделі.",
    "drawnNote": "Полум’я й пару намальовано.",
    "groundNote": "Земля біля стартового майданчика ілюстративна; мапа Землі — Solar System Scope, CC BY 4.0.",
    "groundNoteMars": "Ground near the site illustrative; Mars map Solar System Scope, CC BY 4.0.",
    "keys": "Пробіл грає або ставить на паузу, стрілки крокують, Escape закриває"
  },
  "momentShelf": {
    "title": "Моменти",
    "note": "Три місії, відтворені на одному годиннику зі справжнім часом подій. Траєкторії реконструйовано, і про це сказано.",
    "minutes": "{m} хв",
    "all": "Усі моменти ({n})",
    "fewer": "Менше моментів",
    "replay": "Відтворити цей момент",
    "replayTitle": "Відтворити «{title}» на годиннику місії",
    "replayNamed": "Відтворити «{title}»",
    "cards": {
      // 1.7.2 (public #534): Voskhod 2 and STS-1. Machine-drafted like the rest of this file. Hubble and Falcon 9 stay English until a translator has them.
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "18–19 березня 1965",
        "blurb": "Олексій Леонов на дванадцять хвилин виходить у космос через надувний шлюз, і екіпаж сідає вручну в тайзі, далеко від розрахункового поля."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "12–14 квітня 1981",
        "blurb": "Перший Space Shuttle: Columbia з майданчика 39A, прискорювачі й бак, 54 години на орбіті і планерування на сухе озеро Едвардс."
      },
      "hubble-deployment": {
        "title": "Hubble's release",
        "when": "25 April 1990",
        "blurb": "Discovery's arm lifts the Hubble Space Telescope out of the bay on STS-31, one solar array stops, and at 19:38 UTC the telescope is let go."
      },
      "falcon9-og2-2": {
        "title": "The first Falcon 9 landing",
        "when": "21 December 2015",
        "blurb": "Falcon 9 flight 20 lifts 11 ORBCOMM satellites away from Cape Canaveral, and its first stage flies back and lands on Landing Zone 1: the first landing of an orbital rocket's first stage."
      },
      "apollo-11": {
        "title": "Apollo 11",
        "when": "16–24 липня 1969",
        "blurb": "Від стартового майданчика 39A до Тихого океану через Базу Спокою: старт, Місяць, посадка, зліт, додому."
      },
      "apollo-13": {
        "title": "Apollo 13",
        "when": "11–17 квітня 1970",
        "blurb": "Від майданчика 39A до Тихого океану: посадка, якої не було, вибух кисневого бака й місячний модуль як рятувальний човен."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1–10 квітня 2026",
        "blurb": "Від майданчика 39B до Тихого океану біля Сан-Дієго, навколо зворотного боку Місяця. Сказано, що здійснено, а що було за планом."
      },
      "sputnik-1": {
        "title": "Супутник-1",
        "when": "4 жовтня 1957",
        "blurb": "Від Байконура до першого витка навколо Землі: перший штучний супутник, полірована куля діаметром 585 мм, і його сигнал."
      },
      "curiosity-edl": {
        "title": "Curiosity landing",
        "when": "6 August 2012",
        "blurb": "The seven minutes from the top of the Martian air to Gale crater: the heat shield, the parachute, the rocket backpack and the sky crane, on JPL's own clock."
      },
      "new-horizons-pluto": {
        "title": "New Horizons at Pluto",
        "when": "14 July 2015",
        "blurb": "The first visit to Pluto: from six hours out to the pass at 13.8 km/s on JPL's own track, Pluto and Charon as discs, the crescent left behind."
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 квітня 1961",
        "blurb": "Юрій Гагарін: один виток навколо Землі за 108 хвилин, від Байконура до поля біля Смелівки."
      }
    }
  },
  "momentStories": {
    // 1.7.2: Apollo 13 and Sputnik 1, English until a translator has them (Spanish, French, German and Portuguese have them)
    "apollo-13": {
      "title": "Apollo 13: the flight home",
      "blurb": "Launch Complex 39A, 11 April 1970, to the Pacific on the 17th: a Moon landing that did not happen, an oxygen tank that burst, and the lunar module as the lifeboat.",
      "chIgnition": "Ignition",
      "chLiftoff": "Lift-off",
      "chStaging": "Staging",
      "chParking": "Parking orbit",
      "chTli": "Leaving for the Moon",
      "chCoast": "Two days out",
      "chBang": "The bang",
      "chLifeboat": "Aquarius, the lifeboat",
      "chReturn": "Back on a return path",
      "chMoon": "Round the far side",
      "chBurn": "The burn home",
      "chHome": "Three days home",
      "chSm": "The service module",
      "chUndock": "Aquarius is let go",
      "chEntry": "Entry",
      "chSplash": "Splashdown",
      "ignition": "About T−9 s: the five F-1 engines start, centre first. Launch Complex 39A, 2:13 pm Eastern time.",
      "liftoff": "Lift-off, 19:13:00 UTC, 11 April 1970: James Lovell, Jack Swigert and Fred Haise, bound for the Fra Mauro highlands.",
      "roll": "At 12.6 s the stack rolls onto its flight azimuth, 72.043 degrees east of north.",
      "staging": "2:44: the outboard engines of the first stage cut off and the stage falls away; the second stage lights at 2:45.",
      "tower": "3:21: the launch escape tower is let go.",
      "pogo": "At 5:30 the second stage's centre engine shuts itself down, 132 seconds early, after the stage began to shake too hard. The other four burn 34 seconds longer to make up.",
      "siicut": "9:53: the second stage shuts down and falls away; the S-IVB lights.",
      "parking": "12:30: parking orbit, 190 by 185 km up. Two and a half hours of checks follow.",
      "tli": "2:35:46: the S-IVB lights again, for 5 min 51 s, and sends the craft toward the Moon at almost 11 km/s.",
      "sep": "3:06:39: Odyssey separates from the S-IVB, turns round and docks with Aquarius at 3:19:09. The four adapter panels fall away.",
      "extract": "4:01: Odyssey pulls Aquarius out of the spent stage, which is left behind.",
      "coast": "Two days to the Moon, drawn at some 9 000 times real speed. The craft is 11 metres long, so it is a dot.",
      "tv": "55:53:20: Mission Control asks for a routine stir of the oxygen tanks. A television broadcast ended minutes ago; the crew are tidying up.",
      "bang": "55:54:53, 03:07 UTC on 14 April: a bang. Oxygen tank 2 has burst and blown the outer panel off bay 4 of the service module. The panel's flight is drawn, not measured.",
      "problem": "55:55:20: “Okay, Houston, we've had a problem here.” Jack Swigert; the NASA recording, played as logged.",
      "problem2": "55:55:42: “Houston, we've had a problem.” James Lovell; the NASA recording.",
      "barber": "Within minutes the oxygen of tank 1 is leaking away too. The fuel cells make the craft's power and water from that oxygen, and they are failing.",
      "lifeboat": "Aquarius becomes the lifeboat: built to keep two men alive for two days, it has to keep three alive for four. Odyssey is shut down to keep its batteries for entry.",
      "mcc2": "61:29:43: the lunar module's descent engine fires for 34 s, 11.5 m/s, to put the craft on a path that comes back to Earth. The path drawn does not bend for it.",
      "impact": "77:56:40: the spent S-IVB, sent on ahead, hits the Moon at 2.4 S 27.9 W, and the Apollo 12 seismometer records it (not drawn).",
      "farside": "About 77:28, behind the Moon and out of radio contact: the far side, 254 km below.",
      "closest": "Closest approach, 254 km above the far side. Some 400 000 km from Earth: farther than any humans had been.",
      "tei": "79:27:39, two hours after the Moon: the descent engine fires for 4 min 24 s, 262 m/s, to bring the landing forward from 152 hours to 143 and to the Pacific.",
      "home": "Three days home, cold, short of water and with the craft powered down to the minimum.",
      "mcc3": "105:18: the descent engine fires for 14 s at 10 percent, 2.4 m/s, to steepen the entry a little.",
      "mcc4": "137:39:52: a last 0.9 m/s correction, made by the lunar module's small thrusters (not drawn).",
      "smsep": "138:01:48, 4 hours 39 minutes before entry: the service module is cut away. Its panel has been gone for 82 hours.",
      "photo": "The crew photograph the module as it drifts off: a whole panel missing and torn insulation standing out. The bay is drawn from AS13-59-8500; the damage to an antenna dish is not.",
      "undock": "141:30: Aquarius, which has kept three men alive for some 83 hours, is let go with the pressure in the docking tunnel. The command module is on its own.",
      "entry": "142:40:46, entry interface, 122 km up at 11 km/s. The first peak is about 5 g.",
      "drogue": "About 142:48: two drogue parachutes, then three mains.",
      "mains": "Three main parachutes slow the capsule to some 9 m/s.",
      "splash": "142:54:41, 18:07 UTC on 17 April: splashdown in the South Pacific, in sight of USS Iwo Jima. All three are aboard within 45 minutes.",
      "pathAscent": "the Mission Report's event times, with heights and distances between them approximate",
      "pathTrip": "the Mission Report's states and times, an integrated path with a trim of the injection speed, and a Lambert arc home; not tracking data",
      "pathLm": "docked to Odyssey until 141:30; the drift after undocking is illustrative",
      "pathSm": "illustrative: the drift speed of the spent service module is ours",
      "srcReport": "Apollo 13 Mission Report, NASA MSC-02680, 1971 (event times, states, entry)",
      "srcJournal": "Apollo 13 Flight Journal, NASA (the radio, to the second)",
      "srcClip": "The two radio lines: NASA recording, public domain, from Wikimedia Commons",
      "srcPhoto": "The service module's bay 4: NASA photograph AS13-59-8500, public domain, from Wikimedia Commons"
    },
    "sputnik-1": {
      "title": "Sputnik 1: the first satellite",
      "blurb": "Baikonur, 4 October 1957: the first artificial satellite, a polished sphere of 585 mm, from the pad to its first lap of the Earth, with its beep.",
      "chPad": "Site 1",
      "chAscent": "Lift-off",
      "chBoosters": "The strap-ons",
      "chCore": "The core stage",
      "chSep": "PS-1 is let go",
      "chOrbit": "One lap",
      "ready": "T−10 s at Site 1, Baikonur: the 8K71PS rocket and, under its cone, a sphere of 585 mm. 19:28:34 UTC on 4 October 1957, already the 5th at the launch site. The pad's lamp is ours: it was a dark pad, and the rocket is lit so it can be seen.",
      "liftoff": "Lift-off. The core stage and the four strap-on blocks of the R-7 burn together; the military rocket has been stripped of its warhead for this.",
      "regulator": "About 16 s in a fuel regulator fails: the core stage burns kerosene too fast and its thrust runs 4 percent high for most of the flight. The mission survives it.",
      "boosters": "T+116 s: the four strap-on blocks fall away, as the telemetry shows. The core stage goes on alone.",
      "core": "T+295.4 s: the core stage shuts down, 223 km up at some 7.8 km/s, a second before it was meant to, when a sensor sees the empty kerosene pump racing.",
      "sep": "T+315.3 s, 19.9 s after cut-off: PS-1 is let go. The cone falls away, the four whips swing out (not animated here) and the transmitter starts.",
      "beep": "The first beeps are heard at tracking station IP-1 for two minutes, until the satellite sinks below the horizon. The sound is NASA's recording of the signal.",
      "shadow": "The launch was just after midnight at the site, and for its first 13 minutes PS-1 flies in the Earth's shadow, so it is drawn dark. It comes into sunlight at about T+13 min.",
      "orbit": "Orbit: 223 by 950 km, 65.1 degrees, 96.2 minutes a lap. The core stage follows it round (not drawn).",
      "lap": "One lap in this replay. The batteries ran out on 26 October, after 326 orbits; the sphere fell on 4 January 1958, after about 1 440.",
      "pathAscent": "the published event times, with heights and distances between them approximate",
      "pathOrbit": "the published orbit as a conic from the end of the launch, one lap; the satellite's tumble is not drawn",
      "srcWiki": "Sputnik 1, Wikipedia (event times, orbit, dimensions), from NASA, NSSDC and the Russian sources it cites",
      "srcNssdc": "Sputnik 1, NASA NSSDCA Master Catalog (launch and orbit)",
      "srcClip": "The beep: NASA recording, public domain, from Wikimedia Commons"
    },
    // 1.7.2 (public #534): Voskhod 2 and STS-1. Machine-drafted like the rest of this file (docs/TRANSLATING.md). Young's words stay as he said them.
    "voskhod-2": {
      "title": "Voskhod 2: перший вихід у відкритий космос",
      "blurb": "Байконур, 18 березня 1965: Олексій Леонов на 12 хвилин виходить з корабля через надувний шлюз, а за добу екіпаж сідає вручну в тайзі, за 386 км від того місця, де мав.",
      "chPad": "Майданчик 1",
      "chAscent": "Старт",
      "chOrbit": "Орбіта",
      "chEva": "Шлюз і вихід",
      "chBack": "Назад усередину",
      "chFail": "Автоматична посадка зривається",
      "chRetro": "Гальмування вручну",
      "chEntry": "Вхід в атмосферу",
      "chLand": "Тайга",
      "ready": "T−10 с на майданчику 1, Байконур: ракета Voskhod і під обтічником — Voskhod 3KD з Павлом Бєляєвим і Олексієм Леоновим. 07:00:00 UTC 18 березня 1965. Намальована ракета — від Vostok-K; у справжньої був інший третій ступінь.",
      "liftoff": "Старт. Як на Voskhod 1, у перші хвилини аварійного порятунку немає, поки не скинуто обтічник.",
      "boosters": "T+119 с: чотири бічні блоки відпадають.",
      "shroud": "Близько T+2,5 хв: обтічник скидається, і корабель видно вперше — зі шлюзом «Волга», складеним біля сфери.",
      "core": "T+301 с: центральний ступінь відходить, і третій ступінь, Блок І, працює ще 240 секунд.",
      "orbit": "Орбіта: 167 на 475 км, 64,8 градуса, 90,9 хвилини на виток. Сфера Vostok, запасна гальмівна ракета зверху і два крісла екіпажу там, де у Vostok було катапультоване крісло.",
      "volga": "Бєляєв надуває шлюз «Волга»: близько 40 повітряних труб приблизно за сім хвилин жорстко ставлять тканинну трубу завдовжки 2,5 м і завширшки 1,2 м. Момент, коли він це зробив, — наш; шлюз намальовано вже висунутим, не в процесі надування.",
      "depress": "08:28:13 UTC: Леонов у скафандрі «Беркут» і білому ранці скидає тиск у шлюзі. Електроніку корабля охолоджувало його повітря — тому шлюз і був потрібен.",
      "hatch": "08:32:54: відкривається зовнішній люк шлюзу.",
      "out": "08:34:51: Леонов виходить зі шлюзу високо над північною Центральною Африкою і відштовхується до кінця 5,35-метрового фала. Перша людина в космосі поза кораблем.",
      "tether": "Він кріпить камеру на обід шлюзу і дивиться вниз від Гібралтарської протоки до Каспійського моря. Його поза тут знята з кадру фільму.",
      "swell": "Скафандр роздувся у вакуумі: він не дістає до спуску затвора на нозі для нагрудної камери, рукавиці й черевики задубіли. Щоб повернутися, доведеться випустити повітря зі скафандра.",
      "back": "Він входить головою вперед, усупереч процедурі, і застрягає боком у трубі, повертаючись закрити зовнішній люк. Він знижує тиск скафандра нижче безпечної межі, щоб зігнутися.",
      "inside": "08:47:00: знову в шлюзі; люк закрито о 08:48:40. 12 хвилин 9 секунд ззовні — від північної Центральної Африки до Східного Сибіру.",
      "repress": "08:51:54: у шлюзі знову тиск. Трохи пізніше Бєляєв підриває болти, і шлюз відкидається (момент — наш).",
      "jettison": "«Волга» відходить і перекидається геть; корабель більше не може нею скористатися.",
      "auto": "На 16-му витку автоматичну посадку програмують із землі, але команда «6» не проходить — за повідомленнями, через збій сонячної орієнтації. Запланований близько цього часу імпульс (його годинник — наш, наближено) не трапляється.",
      "manual": "07:16 UTC 19 березня: Vjezna-3 короткою хвилею велить екіпажу вимкнути автоматику і сідати вручну. У Бєляєва ще один виток на підготовку.",
      "late": "Двоє в скафандрах не можуть повернутися в крісла, коли Бєляєв вручну розвернув корабель оптичним візиром «Взор». Гальмування запізнюється на 46 секунд.",
      "retro": "Гальмування вручну двигуном КТДУ-60. Його годинник і місце — наші: це було приблизно за 45 хвилин до опублікованої посадки, і джерела цього не кажуть.",
      "wires": "Приладовий відсік відокремлюється нечисто; сфера шалено крутиться, поки дроти не перегорають близько 100 км. (Намальовано вже роз’єднаним на вході, трохи раніше.)",
      "entry": "Вхід в атмосферу. Ці 46 секунд відносять корабель приблизно на 386 км далі поля — у ліс Верхньокамської височини на північний схід від Пермі.",
      "chutes": "Парашути. На відміну від Vostok, ніхто не катапультується: екіпаж сідає всередині сфери; твердопаливна ракета спрацьовує приблизно з метра, щоб пом’якшити удар (не намальована).",
      "landing": "09:02:17 UTC: торкання близько 59,57 пн. ш. 55,47 сх. д., у глибокому снігу тайги, за 75 км від Пермі.",
      "taiga": "Пілоти пошукових вертольотів знаходять червоний купол лише за кілька годин. Екіпаж проводить дві ночі в лісі при мінус 5 і холодніше, перш ніж дійти на лижах до вертольота.",
      "pathAscent": "опубліковані часи подій; висоти й відстані між ними наближені",
      "pathOrbit": "опублікована орбіта з добовим зносом, гальмування в годинах і місці, які наші, і вхід із куполом, намальовані між ними",
      "srcWiki": "Voskhod 2, Wikipedia (часи виходу, орбіта, посадка)",
      "srcRocket": "Voskhod (ракета), Wikipedia (часи роботи трьох ступенів)",
      "srcGrahn": "Sven Grahn, «The Voskhod 2 mission revisited» (збій автоматичного спуску, виклик на ручний; з посиланням на щоденник генерала Каманіна)",
      "srcNssdc": "Voskhod 2, NASA NSSDCA Master Catalog (старт і орбіта)"
    },
    "sts-1": {
      "title": "STS-1: перший політ Columbia",
      "blurb": "Кеннеді, 12 квітня 1981: Джон Янг і Роберт Кріппен виводять перший Space Shuttle зі стартового комплексу 39A на орбіту і через 54 години планують його на сухе озеро Едвардс.",
      "chPad": "Стартовий комплекс 39A",
      "chAscent": "Старт",
      "chSrb": "Прискорювачі",
      "chMeco": "Основні двигуни вимкнено",
      "chOrbit": "Орбіта",
      "chHome": "Шлях додому",
      "chEntry": "Вхід в атмосферу",
      "chLand": "Смуга 23",
      "ready": "T−10 с на стартовому комплексі 39A, Космічний центр Кеннеді: Columbia, білий зовнішній бак і два твердопаливні прискорювачі. 12:00:04 UTC 12 квітня 1981 — рівно двадцять років після Vostok 1. STS-1 і STS-2 летіли з баком, пофарбованим у білий.",
      "ignition": "T−6,6 с: запалюються три основні двигуни, і вся зв’язка хитається вперед, до ніг екіпажу, і назад.",
      "liftoff": "Старт: прискорювачі запалюються, коли зв’язка повертається до вертикалі. Кріппен порівняв це з паровою катапультою. Майданчик намальовано просто, а вогневий рів — наш.",
      "roll": "Після вежі зв’язка крениться на курс 067 градусів і переходить у положення головами вниз, орбітер під баком, щоб зберегти крила. (Намальовано вже на курсі.)",
      "maxq": "T+56 с: Max Q, на Маху 1,06 і 29 кПа. Основні двигуни прибрано до 65 відсотків, щоб пройти його.",
      "srb": "T+2 хв 12 с: прискорювачі, що спрацювали краще за очікуване, відпускають на 53 км — на 2,8 км вище плану. Вони падають в Атлантику на парашутах.",
      "meco": "T+8 хв 34 с: вимкнення основних двигунів на 118 км.",
      "tank": "Через 18 секунд відпускають зовнішній бак. Він руйнується в повітрі й падає в Індійський океан.",
      "oms1": "T+10 хв 34 с: перший імпульс OMS, 86 секунд, двома двигунами в хвостових гондолах орбітера (не намальовано: полум’я майже невидиме).",
      "oms2": "T+44 хв 2 с: другий імпульс, 75 секунд, на вершині підйому: 246 на 248 км, 40,3 градуса, 89,9 хвилини. Годинник апогею — з звіту; шлях до нього — наш.",
      "doors": "Двері вантажного відсіку відкриваються, щоб працювали радіатори, до кінця другого витка — інакше екіпажу довелося б повертатися. Годинник — наш. По телебаченню вони бачать, що з гондол OMS злетіли плитки.",
      "oms3": "T+6 год 20 хв 46 с і 7 год 05 хв 32 с: два однодвигунні імпульси піднімають орбіту до 274 км. Екіпаж проводить близько 53 годин на орбіті, випробовуючи машину.",
      "wake": "День 3: сніданок, укладання, катапультні костюми, і двері відсіку зачиняють перед входом. Янг і Кріппен пристібаються. Їхня орбіта зробила 35 витків.",
      "deorbit": "На 36-му витку, над південним Індійським океаном, 160-секундний імпульс обома двигунами OMS. Його годинник і місце — наші, приблизно за 55 хвилин до поля. Янг піднімає ніс Columbia у положення для входу носом угору.",
      "entry": "Межа входу на 120 км, близько 8 110 км від поля на 28 240 км/год. Кут атаки 40 градусів, поки не мине найгірше нагрівання. Ця реконструкція ставить межу над західною Тихою; звіт каже — над східною.",
      "blackout": "Рожеве сяйво на 100 км; обоє опускають візори. Близько 21 хвилини без радіо, 16 з них через іонізоване повітря. Більшість входу ведуть комп’ютери, з розворотами крену на Маху 18,5 і 9,8.",
      "bigsur": "Узбережжя Каліфорнії біля Big Sur на Маху 7 і 41 км. Columbia пролетіла 583 км упоперек сліду орбіти, щоб дістатись до поля; це намальовано.",
      "hac": "Янг бере управління. Розвороти на Маху 4,8 і 2,8 зроблено, широкий лівий розворот на смугу сухого озера 23, приєднується переслідувач T-38. Розмір розвороту — наш.",
      "touch": "T+54 год 20 хв 53 с, 18:20:57 UTC: основні стійки торкаються на 339 км/год, повільніше і приблизно на 800 м далі по смузі, ніж планували, на Едвардсі, смуга 23. Опускання стійок намальовано на кілька секунд раніше.",
      "stop": "Young: \"This is the world's greatest all-electric flying machine. I'll tell you that. That was super!\" 36 витків, 1 729 348 км, 2 доби 6 годин 20 хвилин 53 секунди.",
      "pathAscent": "опубліковані часи подій і висоти; відстані між ними наближені",
      "pathOrbit": "опубліковані імпульси й орбіти, з’єднані дугами, гальмівний імпульс, вхід і захід, намальовані між ними; години й місця, які ми обрали, сказано в підписах",
      "srcWiki": "STS-1, Wikipedia (часи й висоти подій, орбіти, імпульси, вхід і посадка), за місійними документами NASA",
      "srcNssdc": "STS-1 Columbia, NASA NSSDCA Master Catalog (старт і посадка)"
    },
    // 1.7.7: Hubble's deployment and the first Falcon 9 landing, English until a translator has them
    "hubble-deployment": {
      "title": "Hubble's release from Discovery",
      "blurb": "STS-31, 25 April 1990: the arm lifts the Hubble Space Telescope out of Discovery's bay, its solar arrays unroll (one of them stops), its antennas unfold, and at 19:38 UTC Steven Hawley lets it go.",
      "chBay": "In the bay",
      "chLift": "Out of the bay",
      "chArrays": "The arrays",
      "chStop": "One stops",
      "chAntennas": "The antennas",
      "chSwing": "To the release point",
      "chRelease": "Let go",
      "chAway": "Backing away",
      "ready": "Flight day 2, 25 April 1990, 613 km up. Discovery's bay is open and the Hubble Space Telescope, 13.2 m long, sits in its berth. Where the shuttle is over the Earth, and every clock here but the release, is ours: the sources give the release and little else.",
      "grapple": "The arm's end effector closes its snare on the grapple fixture beside one of the telescope's antenna drives. Steven Hawley works the arm from the aft flight deck. The arm's joints are drawn as a two-link arm reaching each place; they are not telemetry.",
      "umbilical": "The telescope switches to its own power and the shuttle's supply to it is turned off (NASA). The latches that held it in the bay, two on the sills and one on the floor, are ours in shape and in time.",
      "unberth": "The arm lifts the telescope straight up out of its berth. The clock and the height are ours.",
      "arrays": "The solar arrays, rolled up on drums and folded along the tube for the launch, are swung out from the sides. How they were stowed is drawn from photographs, not from drawings. These first arrays, golden-yellow, were replaced in 1993.",
      "unroll": "The first array unrolls along its booms to about 7 m by 2.5 m. How long it took is ours.",
      "stop": "The second array comes out part-way and stops. McCandless and Sullivan wait in the partly depressurised airlock in case a spacewalk is needed to free it. Which array it was is told two ways; the one drawn is ours.",
      "wait": "Controllers try again and again, and the orbit goes through the Earth's shadow and out. The release, planned for the 19th orbit, slips by one. How long it took, and when, is ours.",
      "free": "The last attempt from the ground works and the array unrolls the rest of the way; the spacewalk is not needed. The time is ours.",
      "antennas": "The two high-gain antenna booms spring out, downward and outward, and their dishes are free. The way they were folded, and when, is ours.",
      "swing": "The arm swings the telescope up to the release position, over the bay. The route is ours.",
      "readyRelease": "Hubble's pointing systems are switched on and tested with the arm still holding it. Each system is checked before the arm lets go (NASA).",
      "release": "19:38 UTC, 25 April 1990, 31 hours 4 minutes after lift-off: Hawley opens the snare and Hubble is free. Jonathan's Space Report gives 19:38; America Space says 3:37 p.m. EDT.",
      "away": "The telescope hangs where it was put and Discovery backs off. America Space says the flight deck shouted for a camera. The arm draws back.",
      "pulses": "Discovery pulses its thrusters twice to raise its orbit a little, so it drifts steadily behind. The times and the size of the pulses are ours.",
      "trail": "Discovery stays near Hubble for about two days as a precaution (NASA); the plan was to trail it at about 40 nautical miles in case the aperture door gave trouble.",
      "pathOrbit": "a circle of 613 km at 28.45 degrees as published, the place along it chosen by us to be in sunlight",
      "pathHst": "the telescope from the release, in the orbit it was released in",
      "srcNasa": "STS-31, NASA's Space Shuttle archive page (launch time, orbit)",
      "srcKit": "STS-31 press kit, NASA (the deployment plan, the crew's tasks, the 19th orbit, the trail)",
      "srcJsr": "Jonathan's Space Report no. 36 (release at 19:38 UTC, the delay of an orbit, the array that would not open)",
      "srcAmerica": "America Space, \"Somebody Get a Camera\" (the arrays, the antennas, the thruster pulses, 3:37 p.m. EDT)"
    },
    "falcon9-og2-2": {
      "title": "The first Falcon 9 landing",
      "blurb": "Cape Canaveral, 21 December 2015: Falcon 9 flight 20 lifts 11 ORBCOMM satellites away and its first stage comes back to Landing Zone 1, the first landing of an orbital rocket's first stage.",
      "chPad": "Launch Complex 40",
      "chAscent": "Lift-off",
      "chSep": "Cut-off and separation",
      "chReturn": "Boostback",
      "chEntry": "The way down",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 s, Space Launch Complex 40, Cape Canaveral, 8:29 p.m. on 21 December 2015: Falcon 9 Full Thrust, 70 m tall, on its first flight, carrying 11 ORBCOMM satellites. It is night; the rocket is drawn in a lamp's light of ours. SpaceX calls the landing \"a secondary test objective\".",
      "ignition": "T−3 s: the nine Merlin engines of the first stage start.",
      "liftoff": "Lift-off at 01:29:00 UTC on 22 December. The first stage is 41 m of the 70.",
      "mach1": "T+1:05: Mach 1, as the reconstruction of the webcast has it.",
      "maxq": "T+1:13: max Q, the moment the air presses hardest; the engines were throttled back for it.",
      "meco": "T+2:23: main engine cut-off at 75 km and 1.67 km/s (the reconstruction of the webcast; SpaceX had planned T+2:20).",
      "sep": "T+2:25: the stages separate. The first stage turns tail-first on its cold-gas thrusters, which is drawn over about half a minute; how long it took is ours.",
      "s2": "T+2:34: the second stage's vacuum engine lights and it pulls away. Its path is drawn only a little way, and is ours.",
      "fairing": "T+2:48: the two halves of the fairing, 5.2 m across, are let go.",
      "boostback": "T+3:47: three of the first stage's engines light for the boostback burn, which turns its path round toward the Cape. How long they burn is ours: about 35 seconds in this drawing.",
      "fins": "The four grid fins swing out to steer the stage through the air. When they did is ours.",
      "coast": "The stage coasts over the top, about 190 km up in this drawing (ours), and starts down.",
      "entry": "T+8:01: three engines light again for the entry burn, to slow the stage before the thick air.",
      "entryEnd": "T+8:21: the entry burn is over. Falling through the air, the stage steers by its fins.",
      "landingBurn": "T+9:11: one engine lights for the landing burn, which has to stop the stage on the pad. It lasts 33 seconds.",
      "legs": "The four landing legs, folded up the side for the flight, swing down a few seconds before touchdown. When is ours.",
      "touch": "T+9:44, 01:38:44 UTC: the first stage stands on Landing Zone 1, a round pad 86 m across with a cross on it, some 9 km south of the pad it left. No first stage of an orbital rocket had landed before.",
      "sats": "Meanwhile the second stage deploys the 11 satellites, from T+14:26 to T+19:05 (not drawn), and then relights its engine to show it can, for a later flight.",
      "pathAscent": "the published event times, and the published height and speed at main engine cut-off, with the climb between them ours; the rocket flew in the dark and is drawn lit by a lamp",
      "pathBooster": "the published burn times and the landing place, with the arc, its speeds and the boostback's length flown by us as a point mass; drawn lit by a lamp",
      "pathStage2": "the second stage from separation, pushed on by us along the way it was going; it stops where the picture does",
      "srcKit": "SpaceX, ORBCOMM-2 Mission press kit, 21 December 2015 (the plan: the times, the burns, the landing as a secondary test objective)",
      "srcRecon": "Spaceflight101, \"Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites\" (the event times from the webcast, MECO at 75 km and 1.67 km/s)",
      "srcWiki": "Falcon 9 flight 20, Wikipedia (the launch time, the payload, the relight of the second stage)",
      "srcLz": "Landing Zones 1 and 2, Wikipedia (the place, and the 282 ft pads marked with an X)"
    },
    "demo-saturn": {
      "title": "Saturn V: від запалювання до розділення ступенів",
      "blurb": "Перші три хвилини Apollo 11, 16 липня 1969 року, зі стартового комплексу 39A.",
      "chIgnition": "Запалювання",
      "chLiftoff": "Старт",
      "chClimb": "Крізь max Q",
      "chStaging": "Розділення ступенів",
      "ignition": "T−8,9 с: послідовність запалювання запускає п’ять двигунів F-1, спершу центральний, потім зовнішні пари.",
      "holddown": "Утримувальні штанги тримають ракету на майданчику, поки всі п’ять двигунів не вийдуть на повну тягу.",
      "liftoff": "Старт, 13:32:00,6 UTC: п’ять F-1, близько 33 800 кН, піднімають майже 3 000 тонн.",
      "tower": "Минувши вежу, ракета розвертається на свій азимут польоту, 72 градуси на схід від півночі.",
      "maxq": "Через хвилину ракета долає швидкість звуку; потім max Q, найбільший тиск повітря: 35 кПа (735 фунтів/фут²).",
      "ceco": "T+135 с: центральний двигун вимикається, щоб тримати прискорення нижче 4 g.",
      "staging": "T+161,7 с: зовнішні двигуни вимикаються. На висоті близько 67 км ступінь S-IC відпадає, вмикаючи гальмівні двигуни.",
      "sii": "T+163,0 с: запалюються п’ять двигунів J-2 ступеня S-II. Водень горить блідо й майже прозоро.",
      "interstage": "Міжступеневе кільце відпадає; на T+197,9 с відлітає вежа аварійного порятунку. До опорної орбіти ще 8,5 хвилини.",
      "pathAscent": "час за звітом про місію Apollo 11, висоти між ними наближені",
      "sources": "Apollo 11 Mission Report, NASA MSC-00171, 1969 (таблиця 3-I, послідовність подій; розділ 7.1, запуск)"
    },
    "vostok-1": {
      "title": "Vostok 1: перша людина в космосі",
      "blurb": "Юрій Гагарін, 12 квітня 1961 року: від Байконура один виток навколо Землі до поля біля Смелівки, за годинником місії, за 108 хвилин.",
      "chPad": "Старт Гагаріна",
      "chAscent": "Підйом",
      "chOrbit": "Один виток",
      "chRetro": "Гальмівний імпульс",
      "chEntry": "Вхід в атмосферу",
      "chEject": "Катапультування",
      "chLand": "Посадка",
      "ready": "Байконур, стартовий майданчик № 1, 06:07 UTC. Юрій Гагарін, 27 років, у капсулі на вершині ракети Р-7.",
      "korolev": "Сергій Корольов по радіо: «Попередня… проміжна… головна… підйом!»",
      "liftoff": "Старт. Гагарін: «Poyekhali!» — тобто «Поїхали!»",
      "boosters": "T+119 с: чотири бічні прискорювачі вигоряють і відпадають.",
      "shroud": "T+156 с: обтічник над капсулою скидається.",
      "core": "T+300 с: центральний ступінь відпрацьовано, і він відпадає; запалюється останній ступінь.",
      "earth": "Приблизно на T+6 хв Гагарін: «Бачу Землю. Видимість добра.»",
      "kosberg": "Приблизно на T+10 хв останній ступінь вимикається. Гагарін: «Косберг спрацював!» — на честь конструктора його двигуна.",
      "orbit": "На орбіті: 181 на 327 км, нахил 64,95 градуса до екватора, 89,1 хвилини на виток. Капсула відокремлюється від ступеня.",
      "retro": "T+1 год 18 хв, над західним узбережжям Африки: гальмівний двигун працює близько 42 секунд. Його час і місце опубліковано; його силу тут підібрано під посадку.",
      "wires": "Приладовий відсік мав відокремитися за десять секунд після гальмівного імпульсу. Його тримає пучок проводів; обидва разом кружляють у повітрі.",
      "entry": "Дроти перегорають, і куля вирівнюється тепловим щитом уперед. Згодом Гагарін повідомив про перевантаження понад 10 g.",
      "eject": "На висоті 7 км люк відстрілюється, і крісло викидає Гагаріна. Куля Vostok приземлялася надто жорстко для людини всередині.",
      "chutes": "На висоті 2,5 км розкривається основний парашут капсули завширшки 27 м; власний парашут пілота розкрився майже одразу. Крісло падає вільно.",
      "landing": "T+1 год 48 хв: Гагарін приземляється за 26 км на південний захід від Енгельса, Саратовська область, через 108 хвилин після старту. Джерела розходяться щодо посадки на десять хвилин.",
      "pathAscent": "підйом — це опубліковані часи подій, з’єднані плавними кривими; висоти й відстані між ними наші",
      "pathOrbit": "орбіта, гальмівний імпульс і вхід в атмосферу — дуги задачі двох тіл, підігнані до опублікованих часів і поля посадки, а не дані стеження",
      "pathPilot": "спуск під парашутом пілота намальовано; жодне джерело не вказує відстань до капсули",
      "srcWiki": "Вікіпедія, Vostok 1 (часи подій, орбіта, цитати; прочитано 2 листопада 2026)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (орбіта, космічний апарат)"
    },
    "apollo-11": {
      "title": "Apollo 11: до Місяця й назад",
      "blurb": "Стартовий комплекс 39A, 16 липня 1969 року, до Тихого океану 24-го: старт, Місяць, База Спокою й додому, за годинником місії.",
      "chIgnition": "Запалювання",
      "chLiftoff": "Старт",
      "chStaging": "Розділення ступенів",
      "chParking": "Опорна орбіта",
      "chTli": "Курс на Місяць",
      "chCoast": "Три доби в дорозі",
      "chLoi": "На орбіту Місяця",
      "chUndock": "Eagle відокремлюється",
      "chDescent": "Спуск з двигуном",
      "chSurface": "База Спокою",
      "chAscent": "Назад угору",
      "chDock": "Стикування",
      "chTei": "Додому",
      "chEntry": "Вхід в атмосферу",
      "chSplash": "Приводнення",
      "ignition": "T−8,9 с: послідовність запалювання запускає п’ять двигунів F-1, спершу центральний, потім зовнішні пари.",
      "liftoff": "Старт, 13:32:00 UTC: п’ять F-1, близько 33 800 кН, піднімають майже 3 000 тонн.",
      "tower": "Минувши вежу, ракета розвертається на свій азимут польоту, 72 градуси на схід від півночі.",
      "maxq": "Через хвилину ракета долає швидкість звуку; потім max Q, найбільший тиск повітря: 35 кПа.",
      "ceco": "T+135 с: центральний двигун вимикається, щоб тримати прискорення нижче 4 g.",
      "staging": "T+161,7 с: зовнішні двигуни вимикаються. На висоті близько 67 км ступінь S-IC відпадає, вмикаючи гальмівні двигуни.",
      "sii": "T+163,0 с: запалюються п’ять двигунів J-2 ступеня S-II. Водень горить блідо й майже прозоро.",
      "interstage": "Міжступеневе кільце відпадає; на T+197,9 с відлітає вежа аварійного порятунку.",
      "siicut": "T+9 хв 13 с: S-II вимикається й відпадає; запалюється S-IVB.",
      "parking": "T+11 хв 52 с: опорна орбіта, 185 км угору. Дві з половиною години перевірок, півтора витка навколо Землі.",
      "tli": "2:44:16: S-IVB запалюється знову на 5 хв 48 с і розганяє зв’язку до 10,8 км/с. Мета — Місяць.",
      "sla": "3:17: чотири панелі навколо місячного модуля розкриваються. Columbia відокремлюється, розвертається й стикується носом до носа з Eagle (не намальовано).",
      "extract": "Приблизно 3:57: Columbia витягує Eagle з S-IVB. Відпрацьований ступінь лишається позаду.",
      "coast": "Три доби до Місяця, 384 000 км, намальовано приблизно в 8 000 разів швидше за справжню швидкість. Апарат завдовжки 11 метрів, тож це крапка.",
      "loi": "75:49:50, за Місяцем і поза радіозв’язком: маршовий двигун службового модуля горить шість хвилин, щоб апарат захопило.",
      "lunarorbit": "Орбіта Місяця, близько 100 км угору, дві години на виток.",
      "undock": "100:12: Eagle з Армстронгом і Олдріном відокремлюється від Columbia, де лишається Коллінз.",
      "pdi": "102:33:05: починається спуск з двигуном, 15 км угору й приблизно за 500 км до місця.",
      "landing": "Комп’ютер посадив би апарат у кратер, усипаний валунами. Армстронг бере керування і летить далі, маючи пального менш ніж на хвилину.",
      "landed": "102:45:40, 20:17:40 UTC. “Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15, 02:56 UTC 21 липня: Армстронг сходить із драбини.",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” Армстронг, 109:24:48; запис — з архіву NASA.",
      "liftoffe": "124:22: злітний ступінь відривається від посадкового, який лишається на Місяці. 17:54 UTC 21 липня.",
      "rendezvous": "Eagle наздоганяє Columbia, піднімаючись з 18 км до 100 км. Маневри намальовано як форму, а не власні маневри місії.",
      "docked": "128:03, 21:35 UTC: стикування. Екіпаж і 21,5 кг місячних порід переходять до іншого модуля.",
      "jettison": "130:09: злітний ступінь Eagle відпускають, щоб він кружляв навколо Місяця.",
      "tei": "135:23:42, на зворотному боці: маршовий двигун працює 2 хв 30 с. Додому.",
      "home": "Дві з половиною доби назад, ті самі 384 000 км.",
      "smsep": "194:49: службовий модуль відкидають, і капсула повертається тепловим щитом уперед.",
      "entry": "195:03, вхід в атмосферу, 122 км угору, 11 км/с. Щит розжарюється; перевантаження до 6 g.",
      "drogue": "Приблизно 195:12: два стабілізувальні парашути, потім три основні.",
      "mains": "Три основні парашути завширшки 25 м гальмують капсулу приблизно до 9 м/с.",
      "splash": "195:18:35, 16:50:35 UTC 24 липня: приводнення в Тихому океані, за 24 км від авіаносця USS Hornet (не намальовано). Вісім діб, три години, 18 хвилин.",
      "pathAscent": "часи подій зі звіту про місію, а висоти й відстані між ними наближені",
      "pathTrip": "реконструйовано за часами подій із Flight Journal як дуги задачі двох тіл: конічна траєкторія туди, коло навколо Місяця, конічна додому; не дані стеження",
      "pathLm": "спуск намальовано в зворотний бік від Бази Спокою, а зустріч — це форма; часи подій — місії",
      "srcReport": "Apollo 11 Mission Report, NASA MSC-00171, 1969 (часи подій, запуск, посадка)",
      "srcJournal": "Apollo 11 Flight Journal, NASA (часи подій з точністю до секунди)",
      "srcClip": "Перші слова Армстронга на Місяці: запис NASA, суспільне надбання, з Wikimedia Commons",
      "srcLanding": "Повідомлення про посадку: запис NASA, суспільне надбання, з Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: навколо Місяця",
      "blurb": "Стартовий комплекс 39B, 1 квітня 2026 року, до Тихого океану біля Сан-Дієго 10-го: четверо людей навколо зворотного боку Місяця, за годинником місії.",
      "chPad": "Майданчик 39B",
      "chLiftoff": "Старт",
      "chStaging": "Прискорювачі відпали",
      "chOrbit": "Висока навколоземна орбіта",
      "chTli": "Курс на Місяць",
      "chMoon": "Зворотний бік",
      "chHome": "Додому",
      "chEntry": "Вхід в атмосферу",
      "chSplash": "Приводнення",
      "ready": "Стартовий комплекс 39B, Космічний центр Кеннеді, 1 квітня 2026 року. Вайзмен, Гловер, Кох і Гансен на борту Orion, на вершині Space Launch System.",
      "cored": "T−6,4 с: запускаються чотири двигуни RS-25 центрального ступеня. Здійснено за планом.",
      "liftoff": "Старт, 22:35:12 UTC (18:35 EDT): два п’ятисекційні прискорювачі запалюються на нулі. Здійснено.",
      "srb": "Приблизно T+2 хв: прискорювачі вигоряють і відокремлюються на висоті 48 км, зі швидкістю 5 000 км/год. Здійснено; вони приводняються в Атлантиці.",
      "las": "За планом, T+3 хв 22 с: вежа аварійного порятунку скидається. У повідомленнях про політ секунди немає; ця — з плану польоту.",
      "meco": "За планом, T+8 хв: центральний ступінь вимикається на суборбітальній дузі з апогеєм близько 2 300 км. Час із плану польоту.",
      "coresep": "Центральний ступінь відокремлюється й падає на руйнівний вхід в атмосферу над Тихим океаном, приблизно через дві години після старту. Здійснено.",
      "prb": "Приблизно T+50 хв, на вершині дуги: верхній ступінь працює, щоб підняти найнижчу точку з повітря. Здійснено, секунда не опублікована.",
      "arb": "Через годину, в найнижчій точці: 15-хвилинна робота двигуна піднімає дальній бік орбіти до 70 000 км, виток триває майже добу. Здійснено.",
      "fairings": "За планом: три панелі навколо службового модуля скидаються; чотири сонячні панелі розкриваються. Час із плану польоту, тут намальовано розкритими.",
      "arrays": "Чотири сонячні панелі Orion розкрито: вони даватимуть йому енергію десять діб.",
      "sep": "За планом: Orion відокремлюється від верхнього ступеня; потім Гловер веде його вручну поруч зі ступенем близько 70 хвилин. Час відокремлення не опублікований.",
      "tli": "Другий день польоту, близько 25 годин від початку: головний двигун службового модуля працює 5 хв 49 с, щоб летіти до Місяця. Здійснено; хвилина, показана тут, — з плану польоту.",
      "outbound": "Чотири доби в дорозі. Виконано одну корекцію дорогою туди, 17,5 с на п’ятий день польоту; вона надто мала, щоб її намалювати.",
      "record": "17:56 UTC 6 квітня: Orion перевершує рекорд відстані Apollo 13 1970 року, 248 655 миль від Землі. Здійснено.",
      "moon": "Шостий день польоту: Orion входить у сферу впливу Місяця. На орбіту він не вийде: облетить зворотний бік і падатиме додому.",
      "los": "22:46 UTC: за Місяцем, без зв’язку 38 хвилин. Здійснено.",
      "closest": "Найближче зближення, 23:00 UTC 6 квітня: 6 545 км над зворотним боком Місяця. Здійснено.",
      "far": "23:02 UTC: найдалі від Землі, 406 771 км. Здійснено.",
      "aos": "23:24 UTC: знову зв’язок з-за Місяця. Здійснено.",
      "home": "Чотири доби додому. Виконано три корекції на зворотному шляху, по 15, 9 і 8 секунд; вони надто малі, щоб їх намалювати.",
      "esmsep": "За планом: службовий модуль відокремлюється приблизно за 20 хвилин до входу в атмосферу. Час відокремлення не опублікований; намальовано з плану польоту.",
      "entry": "Вхід в атмосферу, за планом приблизно за 13 хвилин до приводнення: 122 км угору, 11 км/с, тепловий щит розжарений. Крутіший прямий вхід замінив запланований вхід зі стрибком. Здійснено.",
      "drogue": "Стабілізувальні парашути, потім пілотні й три основні купола завширшки 35 м. Здійснено; часи — з плану польоту.",
      "mains": "Три основні парашути опускають капсулу до моря.",
      "splash": "Приводнення, 00:07:27 UTC 11 квітня (17:07 PDT, 10 квітня), 32,3 пн. ш. 117,8 зх. д., на південний захід від Сан-Дієго; USS John P. Murtha підбирає екіпаж (корабель не намальовано). Дев’ять діб, одна година, 32 хвилини. Здійснено.",
      "pathAscent": "часи подій із плану польоту, а висоти й відстані між ними наші; старт і відокремлення прискорювачів здійснено",
      "pathTrip": "реконструйовано за здійсненою орбітою, найближчим зближенням і приводненням, як дуги задачі двох тіл і гіпербола навколо Місяця; не дані стеження",
      "srcWiki": "Вікіпедія, Artemis II (що здійснено, з часами й відстанями; прочитано 2 листопада 2026)",
      "srcNasa": "NASA, Artemis II (план польоту; модель ракети й капсули: NASA 3D Resources)"
    }
  }
};

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "Розмір і відстань",
    "size": "Розмір",
    "sizeTrue": "справжній",
    "sizeValue": "×{n}",
    "sizeTitle": "У скільки разів світи намальовано більшими, ніж насправді: від справжнього розміру до ×{max}",
    "dist": "Відстань",
    "distTrue": "справжня",
    "distLog": "логарифмічна",
    "distSome": "{p}% шляху до логарифмічної",
    "distTitle": "Наскільки стиснуто відстані від Сонця: від справжніх до логарифмічних. Напрямки залишаються виміряними.",
    "presets": "Готові види",
    "presetTrue": "Справжній масштаб",
    "presetTrueTitle": "Кожен світ у справжньому розмірі й на справжній відстані",
    "presetClass": "Для класу",
    "presetClassTitle": "Світи ×{n} і логарифмічні відстані, як у механічній моделі Сонячної системи",
    "held": "Під час подорожі все намальовано в справжньому масштабі. Повзунки повернуться, коли вона закінчиться.",
    "note": "Де кожен світ на небі — завжди виміряно. Значок показує, у скільки разів його намальовано більшим.",
    "noteSize": "{name}: розмір на малюнку ×{n} від справжнього (повзунок «Розмір»).",
    "noteDist": "Намальовано на відстані {drawn} а. о. від Сонця, а справжня відстань — {au} а. о.; напрямок справжній (повзунок «Відстань»).",
    "noteMoon": "Відстань від планети ({parent}) збільшено ×{n}, напрямок справжній, щоб супутник лишався поза збільшеною планетою.",
    "noteSun": "Сонце намальовано ×{n} більшим, ніж насправді (повзунок «Розмір»), і так, щоб Меркурій лишався поза ним.",
    "badgeSun": "Сонце ×{n}",
    "badgeLog": "лог. відстані",
    "badgeSome": "відстані на {p}% до лог.",
    "badgeJoin": " · ",
    "badgeTitle": "Цей вигляд задають повзунки «Розмір» і «Відстань» на вкладці «Планети»."
  },
  "cutaway": {
    "button": "Зазирнути всередину",
    "buttonTitle": "Показати шари всередині: {name}, на глибинах, які дають вимірювання",
    "title": "Усередині: {name}",
    "close": "Закрити розріз",
    "model": "Шари: {model}.",
    "source": "Джерело",
    "layers": "Шари, від поверхні вглиб",
    "depthRange": "{top}–{bottom} км",
    "toCentre": "від {top} км до центру",
    "cls": {
      "measured": "виміряно",
      "modelled": "змодельовано",
      "inferred": "виведено"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "Глибина",
    "probeTitle": "Посуньте вниз від поверхні до центру",
    "depth": "{km} км углиб",
    "atCentre": "центр",
    "layer": "Шар",
    "pressure": "Тиск",
    "temperature": "Температура",
    "density": "Густина",
    "valueCls": "{value} ({cls})",
    "note": "Глибини взято з джерел; кольори вибрано. Між верхом і низом шару зонд показує проміжні значення.",
    "unknown": "Розрізу цього світу ще немає.",
    "units": {
      "gpa": "{n} ГПа",
      "mpa": "{n} МПа",
      "kpa": "{n} кПа",
      "millionGpa": "{n} млн ГПа",
      "k": "{n} К",
      "millionK": "{n} млн К",
      "rho": "{n} г/см³"
    },
    "kinds": {
      "crust": "Кора",
      "mantle": "Мантія",
      "upper-mantle": "Верхня мантія",
      "lower-mantle": "Нижня мантія",
      "outer-core": "Рідке зовнішнє ядро",
      "inner-core": "Тверде внутрішнє ядро",
      "liquid-core": "Рідке ядро",
      "iron-core": "Залізне ядро",
      "molten-silicate": "Шар розплавленої породи",
      "partial-melt": "Частково розплавлений шар",
      "ice-shell": "Крижана оболонка",
      "ocean": "Океан",
      "hp-ice": "Лід високого тиску",
      "rock-mantle": "Кам’яна мантія",
      "rock-core": "Кам’яне ядро",
      "hydrated-core": "Ядро з каменю й льоду",
      "molecular": "Водень і гелій",
      "metallic": "Металічний водень",
      "dilute-core": "Розмите ядро",
      "ice-mantle": "Вода, аміак і метан",
      "convective": "Конвективна зона",
      "radiative": "Зона променистого перенесення",
      "solar-core": "Ядро"
    }
  },
  "helio": {
    "chip": "Геліосфера · змодельовано",
    "chipTitle": "З чого намальовано бульбашку навколо Сонячної системи",
    "legendTitle": "Геліосфера",
    "rowTs": "Ударна хвиля завершення: тут сонячний вітер сповільнюється нижче швидкості звуку. Змодельована форма, проведена через два перетини: Voyager 1 на {a} а. о., Voyager 2 на {b} а. о. (виміряно).",
    "rowHp": "Геліопауза: тут вітер Сонця зустрічається з міжзоряним газом. Змодельована форма (Parker 1961), проведена через перетини: Voyager 1 на {a} а. о., Voyager 2 на {b} а. о. (виміряно).",
    "rowBow": "Носова хвиля: тут міжзоряний газ нагромаджується попереду. Ілюстративно: удвічі далі, ніж геліопауза (McComas та ін. 2012).",
    "rowRibbon": "Стрічка IBEX — яскрава смуга на небі, яку виміряв IBEX (Funsten та ін. 2013). Її відстань не виміряно: намальовано на {au} а. о.",
    "rowMotion": "Рух Сонця крізь місцевий міжзоряний газ, {v} км/с (IBEX, McComas та ін. 2015). Стрілка — це шлях за {years} р., {au} а. о.",
    "sources": "Місця перетинів — із треків Voyager у JPL Horizons на дати перетинів за NASA. Форми: Parker 1961, Wilkin 1996, за Izmodenov & Alexashov 2015 та Opher та ін. 2015.",
    "crossing": "{craft}: {surface}, {au} а. о., {date}",
    "motion": "Рух Сонця, {v} км/с",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "ударна хвиля завершення",
      "hp": "геліопауза"
    },
    "surfaceLabel": {
      "ts": "Ударна хвиля завершення (змодельовано)",
      "hp": "Геліопауза (змодельовано)",
      "bow": "Носова хвиля (ілюстративно)",
      "ribbon": "Стрічка IBEX (виміряно на небі)"
    },
    "date": "{d} {m} {y}",
    "months": [
      "січ",
      "лют",
      "бер",
      "кві",
      "тра",
      "чер",
      "лип",
      "сер",
      "вер",
      "жов",
      "лис",
      "гру"
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "Шлях навколо чогось, який тримає тяжіння. Якщо рухатися вбік достатньо швидко, ви весь час падаєте повз Землю, а не на неї.",
  "low Earth orbit": "Жвавий шар приблизно від 200 до 2 000 км угору. Тут станція, більшість супутників і більшість уламків.",
  "geostationary": "Орбіта на висоті 35 786 км, де один виток триває стільки, скільки Земля робить один оберт, — 23 години 56 хвилин. Тому супутник ніби висить над однією точкою.",
  "polar orbit": "Орбіта над полюсами. Земля обертається під нею, тож супутник з часом бачить кожну її частину.",
  "elements": "Шість чисел і дата, що описують орбіту. Підставте їх у відповідну математику, і ви отримаєте положення.",
  "epoch": "Мить, коли набір елементів орбіти був правильним. Що далі від неї, то менш точна відповідь.",
  "apogee": "Найвища точка орбіти навколо Землі.",
  "perigee": "Найнижча точка орбіти навколо Землі.",
  "perihelion": "Точка, де тіло, що обертається навколо Сонця, найближче до нього.",
  "inclination": "Наскільки орбіта нахилена до екватора. Дев’яносто градусів — над полюсами.",
  "propagated": "Обчислено вперед від старішого вимірювання. Це не свіже спостереження, і воно з часом розходиться з дійсністю.",
  "lunar distance": "Відстань від Землі до Місяця, близько 384 000 км. Зручна лінійка для прольотів астероїдів.",
  "astronomical unit": "Відстань від Землі до Сонця, близько 150 мільйонів км.",
  "light-time": "Скільки часу світло проходить відстань. Стільки ж іде і радіоповідомлення.",
  "light-year": "Відстань, яку світло проходить за один юліанський рік, близько 9,46 трильйона км. Лінійка для проміжків між зорями.",
  "magnitude": "Наскільки яскравим щось здається. Шкала йде навпаки: менші числа — яскравіші.",
  "azimuth": "Напрям за компасом у градусах. Нуль — північ, 90 — схід.",
  "elevation": "Наскільки високо щось над горизонтом, у градусах. Дев’яносто — просто вгору.",
  "terminator": "Лінія між днем і ніччю на світі.",
  "twilight": "Час після заходу Сонця, коли небо ще не зовсім темне. Тоді супутники видно найлегше.",
  "sunlit": "Ще ловить сонячне світло, хоча земля внизу темна. Саме це робить супутник видимим.",
  "radiant": "Точка на небі, з якої нібито летить метеорний потік.",
  "ZHR": "Приблизно скільки метеорів за годину ви побачили б під ідеально темним небом, коли радіант високо. Зазвичай ви бачите менше.",
  "close approach": "Коли астероїд пролітає поблизу Землі. «Поблизу» в астрономії зазвичай означає далі, ніж Місяць.",
  "near-Earth object": "Астероїд або комета, чия орбіта підводить її близько до орбіти Землі.",
  "reentry": "Коли щось падає назад в атмосферу. Більшість згоряє дорогою вниз.",
  "debris": "Мертві супутники, відпрацьовані ступені ракет і уламки. Відстежують десятки тисяч шматків.",
  "constellation": "Візерунок із зір, який люди назвали давно. Зорі в одному сузір’ї зазвичай зовсім не поруч.",
  "L1": "Точка рівноваги між Землею та Сонцем, приблизно за 1,5 мільйона км у бік Сонця. Добра для спостереження за Сонцем.",
  "L2": "Точка рівноваги за 1,5 мільйона км від Землі з боку, протилежного Сонцю, де телескоп може тримати Землю й Сонце позаду й залишатися холодним.",
  "transit": "Коли одне тіло проходить перед іншим, якщо дивитися з вашого місця.",
  "conjunction": "Коли два тіла здаються на небі поруч. У просторі вони не поруч.",
  "ephemeris": "Таблиця того, де щось буде, обчислена заздалегідь.",
  "umbra": "Темна середина тіні, де світло перекрите повністю. У тіні Місяця Сонце зникає.",
  "penumbra": "Світліша зовнішня частина тіні, де перекрита лише частина світла. Місяць у півтіні Землі лише трохи тьмяніє.",
  "totality": "Хвилини повного затемнення, коли Сонце закрите цілком. Небо темніє настільки, що видно зорі.",
  "annular": "Кільцеподібне. Під час кільцеподібного затемнення Місяць надто далеко, щоб закрити все Сонце, і навколо нього лишається яскраве кільце."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "Перейти до дати (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "Пошук",
    "property": "Пошук за властивостями",
    "countries": "Супутники за країнами",
    "operators": "За операторами",
    "clouds": "Хмари уламків",
    "chartOurs": "Наші планети поруч"
  },
  "find": {
    "title": "Пошук",
    "label": "Пошук за властивостями, за країною і за хмарою уламків",
    "tabs": {
      "property": "Властивості",
      "country": "За країнами",
      "clouds": "Уламки й угруповання"
    },
    "kindsLabel": "Що шукати",
    "kinds": {
      "stars": "Зорі",
      "exoplanets": "Планети",
      "satellites": "Супутники",
      "comets": "Комети"
    },
    "presetsLabel": "Запитання",
    "refine": "Уточнити",
    "presets": {
      "rockyHz50": "Кам’янисті планети в зоні придатності до життя ближче 50 світлових років",
      "nearStars": "Зорі ближче 20 світлових років",
      "temperate": "Планети приблизно такі ж теплі, як Земля",
      "hotJupiters": "Гарячі гіганти",
      "cometsSoon": "Комети, що найближче підійдуть до Сонця до 2030 року",
      "geo": "Робочі супутники на геостаціонарній орбіті",
      "low": "Робочі супутники нижче 400 км"
    },
    "fields": {
      "within": "Ближче (світлових років)",
      "fromHere": "Рахувати від камери, а не від Сонця",
      "radius": "Радіус (Землі)",
      "mass": "Маса (Землі)",
      "teq": "Температура (K)",
      "insol": "Світло зорі (Земля = 1)",
      "height": "Висота (км)",
      "year": "Запуск (рік)",
      "perihelion": "Найближче до Сонця (рік)",
      "from": "від",
      "to": "до",
      "zone": "У зоні придатності до життя",
      "zoneWide": "У ній або на її краю",
      "rocky": "Кам’яниста",
      "working": "Лише робочі",
      "owner": "Власник",
      "operator": "Оператор",
      "any": "Будь-який",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "Назва",
      "dist": "Відстань (св. р.)",
      "radius": "Радіус (Землі)",
      "teq": "Темп. (K)",
      "insol": "Світло",
      "zone": "Зона",
      "spect": "Клас",
      "mag": "Зоряна величина",
      "owner": "Власник",
      "height": "Висота (км)",
      "year": "Запуск",
      "perihelion": "Перигелій",
      "qAu": "Найближче (а. о.)"
    },
    "zones": {
      "inside": "усередині",
      "edge": "край",
      "hotter": "надто гаряче",
      "colder": "надто холодно"
    },
    "sortTitle": "Сортувати за: {col}",
    "tableLabel": "Що підходить, по рядку на кожне: натисніть рядок, щоб туди полетіти",
    "status": "Знайдено: {n}",
    "statusSome": "Знайдено: {n}; показано перші {shown}",
    "none": "Нічого не підходить. Розширте діапазон або зніміть позначку.",
    "looking": "Шукаємо…",
    "loading": "Завантажуємо, де шукати…",
    "failed": "Пошук не відбувся. Спробуйте трохи згодом.",
    "rowTitle": "Перейти до: {name}",
    "noRecord": "Не намальовано на мапі",
    "modelled": "Обчислено через оцінену масу зорі: модель",
    "copyLink": "Скопіювати посилання на це запитання",
    "copied": "Посилання скопійовано",
    "honesty": {
      "stars": "Зорі з назвами з HYG v4.4, 3 390 штук, на виміряних відстанях. Виміряно.",
      "exoplanets": "Радіус, маса, період і зоря: виміряні, NASA Exoplanet Archive. Розмір орбіти, світло зорі, температура і зона: обчислені; позначені *, де масу зорі оцінено за її світністю, модель. Кам’яниста: не більше 1,6 радіуса Землі або 3 мас Землі, якщо радіус невідомий (Rogers 2015).",
      "satellites": "Каталог CelesTrak, прочитано {date}. Висота: середнє найвищої й найнижчої точок орбіти. Виміряно.",
      "comets": "Дати перигелію з Small-Body Database JPL. Обчислено за виміряними орбітами."
    },
    "chart": {
      "open": "Поруч",
      "openTitle": "Планети {host} поруч, у масштабі",
      "title": "{host}, у масштабі",
      "ours": "Сонячна система",
      "label": "Планети {host} поруч у справжніх розмірах, по порядку від зорі",
      "note": "Один масштаб для всіх планет; проміжки не є відстанями. Планету без виміряного радіуса намальовано пунктиром, середнім розміром.",
      "close": "Закрити схему"
    },
    "pill": "{name}: підсвічено {n}",
    "pillClear": "Прибрати підсвічування"
  },
  "owners": {
    "modesLabel": "Групувати",
    "modes": {
      "countries": "Країни",
      "operators": "Оператори",
      "points": "Точки Лагранжа",
      "nopath": "Без відкритої траєкторії"
    },
    "reading": "Читаємо каталог CelesTrak (7 МБ)…",
    "failed": "Каталог не завантажився.",
    "retry": "Спробувати ще раз",
    "lead": "У {n} власників є щось на орбіті: {total} відстежуваних об’єктів.",
    "row": "{n} на орбіті",
    "rowSub": "{working} працюють · {debris} уламків",
    "rowTitle": "Підсвітити, що {name} має на орбіті",
    "joint": "{a} і {b}",
    "ussr": "Каталог рахує Радянський Союз і Росію одним власником.",
    "unknown": "Поки невідомо",
    "byName": "за назвою",
    "byNameTitle": "Пораховано за назвами його супутників у каталозі",
    "kinds": "Працюють: {working}, не працюють: {dead}, ступенів ракет: {rocket}, уламків: {debris}.",
    "lit": "З них на мапі намальовано й підсвічено: {n}.",
    "litNone": "Жоден із них не намальований на мапі.",
    "show": "Підсвітити",
    "clear": "Прибрати",
    "page": "Сторінка: {name}",
    "noPathTitle": "Без відкритої траєкторії: {n}",
    "noPathNone": "Усі його апарати на орбіті мають відкриту траєкторію.",
    "why": {
      "no-elements": "Немає відкритої орбіти: у каталозі він є, але елементи орбіти не публікуються",
      "deep-space": "За межами навколоземної орбіти, і траєкторії для нього тут немає",
      "deep-drawn": "За межами навколоземної орбіти: намальовано за траєкторією JPL"
    },
    "points": {
      "sel1": "Сонце–Земля L1",
      "sel2": "Сонце–Земля L2",
      "eml2": "Земля–Місяць L2",
      "sel1Why": "1,5 млн км у бік Сонця: вид на Сонце, яке ніколи не заходить.",
      "sel2Why": "1,5 млн км у бік від Сонця: холодно й темно, місце для телескопів.",
      "eml2Why": "За зворотним боком Місяця: ретранслятор, що бачить і зворотний бік, і Землю.",
      "empty": "Зараз тут нічого немає."
    },
    "nopathLead": "Апаратів на орбіті без відкритої траєкторії: {n}. Спершу найновіші:",
    "source": "Каталог супутників CelesTrak, прочитано {date}: виміряно. Прапори: Wikimedia Commons, суспільне надбання."
  },
  "breakups": {
    "cloudsTitle": "Хмари уламків",
    "fleetsTitle": "Угруповання",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "Китайський метеосупутник, знищений китайською протисупутниковою ракетою на висоті 865 км 11 січня 2007 року: найбільша хмара в історії.",
      "cosmos1408": "Мертвий радянський супутник, знищений російською протисупутниковою ракетою на висоті близько 480 км 15 листопада 2021 року.",
      "iridium33": "Робочий супутник зв’язку, у який 10 лютого 2009 року на висоті 789 км над Сибіром урізався мертвий «Космос-2251»: перше зіткнення двох цілих супутників.",
      "cosmos2251": "Мертвий російський супутник, що зіткнувся з Iridium 33 на висоті 789 км 10 лютого 2009 року."
    },
    "counts": "З {catalogued} внесених до каталогу уламків на орбіті ще {up}.",
    "lit": "Підсвічено на мапі: {n}.",
    "spreadTitle": "Подивитися, як вона розповзається",
    "steps": {
      "event": "У мить події",
      "week": "Через тиждень",
      "year": "Через рік",
      "today": "Сьогодні"
    },
    "play": "Програти від події",
    "stop": "Стоп",
    "places": "Повернути сьогоднішні місця",
    "spreadNote": "Модель: кожен уламок стартує з однієї точки на своїй сьогоднішній орбіті й дрейфує, поки сплюснутість Землі повертає площину орбіти. Уламки, що впали, не малюються.",
    "source": "Джерело:",
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
    "fleetLit": "Підсвічено на мапі: {n}.",
    "fleetNote": "Визначено за назвами, які їм дають оператори в каталозі.",
    "loadingActive": "Спершу завантажуємо всі робочі супутники (7 МБ)…",
    "loadingDebris": "Спершу завантажуємо всі відстежувані уламки (7 МБ)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "Перейти до хвилини, коли знищили Fengyun-1C, і підсвітити його хмару"
  },
  "dateJump": {
    "title": "Перейти до дати",
    "field": "Дата й час (UTC)",
    "text": "Або введіть текстом",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "Перейти",
    "hint": "Будь-яка мить з 1700 по 2200 рік, за UTC.",
    "errors": {
      "unknown": "Не розумію такої дати. Спробуйте 1969-07-20 20:17, 20 July 1969 або next total eclipse.",
      "range": "Поза 1700–2200.",
      "empty": "Спершу введіть дату.",
      "eclipse": "Такого затемнення між 1700 і 2200 роком немає."
    },
    "searching": "Шукаємо…",
    "gone": "Зараз {when}.",
    "eclipse": "{what}, {when}.",
    "eclipses": {
      "sunTotal": "Повне сонячне затемнення",
      "sunAnnular": "Кільцеподібне сонячне затемнення",
      "sunPartial": "Часткове сонячне затемнення",
      "moonTotal": "Повне місячне затемнення",
      "moonPartial": "Часткове місячне затемнення",
      "moonPenumbral": "Півтіньове місячне затемнення"
    },
    "rangesTitle": "Наскільки точно і коли",
    "ranges": {
      "worlds": "Сонце, Місяць і планети: з 1700 по 2200 рік, обчислено (astronomy-engine).",
      "satellites": "Супутники: точні в межах тижня від сьогодні; бліднуть далі за місяць.",
      "craft": "Міжпланетні апарати: лише в межах власних траєкторій JPL.",
      "stars": "Зорі: там, де вони зараз; їхній рух за століття не малюється."
    },
    "quick": {
      "total": "Наступне повне сонячне затемнення",
      "lunar": "Наступне місячне затемнення"
    },
    "missionsTitle": "З наших місій",
    "momentsTitle": "Моменти",
    "presetsLabel": "Дати для переходу",
    "faded": "Супутники зблідли: їхні орбіти виміряні для сьогодні, а не для {year} року.",
    "close": "Закрити"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "З Вікіпедії",
    "quotedLive": "Цитата з Вікіпедії в сьогоднішньому вигляді, нами не перевірена.",
    "quotedBaked": "Цитата з Вікіпедії в тому вигляді, як була {date}, нами не перевірена.",
    "textCredit": "Текст: дописувачі Вікіпедії, CC BY-SA 4.0.",
    "readArticle": "Читати статтю повністю",
    "inEnglish": "Цією мовою статті ще немає, тому тут англійська.",
    "family": "Про {fleet} загалом: окремої статті про цей супутник немає.",
    "photo": "Фото: {artist}, {licence}, через Wikimedia Commons.",
    "photoNoArtist": "Фото: {licence}, через Wikimedia Commons.",
    "photoAlt": "Зображення на початку статті Вікіпедії {title}",
    "loading": "Питаємо Вікіпедію…",
    "read": "Прочитати вголос",
    "readTitle": "Прочитати цю картку вголос голосом вашого пристрою",
    "stop": "Зупинити читання",
    "reading": "Читаю вголос"
  }
});
// b200-f4-cards: end
