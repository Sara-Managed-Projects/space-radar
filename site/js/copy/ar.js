// ar: Arabic, the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).
// Fetched by copy/index.js only when the page speaks Arabic (?lang=ar); hidden until a native reader has signed off (docs/TRANSLATING.md).
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.
// Until a second native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Arabic only to a visitor who asks for it (?lang=ar), and the language picker does not list it.
//
// CHOICES, so a reviewer can disagree with them:
//   * (none recorded)

export const META = {
  code: "ar",
  name: "العربية",
  english: "Arabic",
  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },
};

export const RULES = {
  decimal: '.',
  article() {
    return '';
  },
  // Arabic: one (1), two (2), few (3-10), many (11-99), other (100+). Extra forms ride in `many`
  // joined by '|' as "dual|few|many|other". Non-integers take the 'other' form.
  plural(n, one, many) {
    const forms = String(many).split('|');
    if (forms.length < 4) return Math.abs(n) === 1 ? one : many;
    const a = Math.abs(n);
    if (a === 1) return one;
    if (!Number.isInteger(a)) return forms[3];
    if (a === 2) return forms[0];
    const r = a % 100;
    if (a === 0 || (r >= 3 && r <= 10)) return forms[1];
    if (r >= 11 && r <= 99) return forms[2];
    return forms[3];
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "جارٍ بناء السماء…",
    "bootEarth": "جارٍ وضع الأرض…",
    "bootCatalogues": "جارٍ قراءة الفهارس…",
    "tagline": "كل ما يتحرك حول الأرض، في مكانه الحقيقي، الآن.",
    "sceneSelected": "خريطة للفضاء مرسومة على المواضع الحقيقية، وقد حددت {name}: بطاقته في اللوحة بجانب الخريطة تقول ما هو."
  },
  "compareText": {
    "size": [
      "بحجم محمصة خبز تقريبًا",
      "بحجم غسالة تقريبًا",
      "بحجم سيارة تقريبًا",
      "بحجم حافلة تقريبًا",
      "بحجم منزل تقريبًا",
      "بارتفاع مبنى من 15 طابقًا تقريبًا",
      "بارتفاع مبنى من 25 طابقًا تقريبًا",
      "بحجم ملعب كرة قدم تقريبًا",
      "بارتفاع برج من 40 طابقًا تقريبًا",
      "بحجم سفينة سياحية تقريبًا",
      "بارتفاع أعلى مبنى على الأرض تقريبًا",
      "بحجم جبل صغير تقريبًا",
      "بحجم مدينة تقريبًا"
    ],
    "magnitude": [
      "بسطوع القمر البدر",
      "أسطع من أي نجم أو كوكب",
      "بسطوع الزهرة",
      "بسطوع ألمع النجوم",
      "بسطوع نجم عادي",
      "بالكاد يُرى من مكان مظلم",
      "أخفت من أن يُرى دون تلسكوب"
    ],
    "speed": [
      "{n} كم/س، سرعة الطريق السريع",
      "{n} كم/س، نحو سرعة طائرة ركاب",
      "{n} كم/س، أسرع من رصاصة بندقية",
      "{n} كم/س، نحو {m} كم في كل دقيقة"
    ],
    "driving": "{n} كم إلى الأعلى، نحو {h} {word} من القيادة لو كان الطريق يصعد عموديًا",
    "hour": "ساعة",
    "hours": "ساعتان|ساعات|ساعة|ساعة",
    "up": "{n} كم إلى الأعلى",
    "moon": "{ld}× مسافة القمر",
    "lightMinutes": "على بعد {lt} دقيقة ضوئية",
    "lightHours": "على بعد {lh} ساعة ضوئية",
    "compass": [
      "شمال",
      "شمال-شمال شرق",
      "شمال شرق",
      "شرق-شمال شرق",
      "شرق",
      "شرق-جنوب شرق",
      "جنوب شرق",
      "جنوب-جنوب شرق",
      "جنوب",
      "جنوب-جنوب غرب",
      "جنوب غرب",
      "غرب-جنوب غرب",
      "غرب",
      "غرب-شمال غرب",
      "شمال غرب",
      "شمال-شمال غرب"
    ]
  },
  "numberWords": [
    "لا",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
    "عشرة"
  ],
  "shell": {
    "sideLabel": "استكشف",
    "back": "استكشف",
    "backLabel": "العودة إلى الاستكشاف",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "أظهر اللوحة",
    "collapse": "أخفِ اللوحة",
    "topLabel": "البحث والأدوات"
  },
  "tabs": {
    "label": "أين",
    "earth": "الأرض",
    "planets": "الكواكب",
    "stars": "النجوم",
    "tonight": "الليلة"
  },
  "rightNow": {
    "title": "الآن",
    "storms": "عدد العواصف الدائرة {n}، وأقواها {name}.",
    "stormOne": "عاصفة واحدة تدور: {name}.",
    "clouds": "غيوم اليوم",
    "people": "الناس في الفضاء",
    "iss": "ISS",
    "tiangong": "تيانقونغ",
    "crewAt": "{n} على {name}"
  },
  "statusLine": {
    "reading": "نقرأ المصادر",
    "read": "قُرئ في هذه الزيارة: {n}",
    "readOne": "قُرئ مصدر واحد في هذه الزيارة",
    "stale": "متقادم: {n}",
    "failed": "تعذرت قراءة: {n}",
    "oldest": "الأقدم {age}",
    "open": "افتح المصادر",
    "label": "{text}. افتح المصادر",
    "offline": "بلا اتصال: نعرض نسخًا محفوظة ({age})",
    "offlineNone": "بلا اتصال: لا نسخ محفوظة على هذا الجهاز"
  },
  "mission": {
    "title": "مهمته",
    "count": "{i} من {n}",
    "navLabel": "أحداث {name}",
    "prev": "الحدث السابق",
    "next": "الحدث التالي",
    "when": "{date}، {time} UTC",
    "predicted": "{when} (متوقع)",
    "go": "اذهب إلى هذه اللحظة",
    "goTitle": "اضبط الساعة على هذه اللحظة وركّز عليها",
    "here": "الساعة عند هذه اللحظة. زر «مباشر» يعيدها.",
    "noteSite": "تستطيع الخريطة عرض هذا المكان في ذلك اليوم، بضوء ذلك اليوم.",
    "notePath": "تحتفظ الخريطة بمساره في ذلك اليوم.",
    "noteCruise": "ليس لدينا مسار لذلك اليوم: يُرسم {name} على الخط المستقيم الممتد إلى الوراء من موضعه المقيس الآن، بدقة تقارب وحدة فلكية واحدة.",
    "noteNone": "ليس في الخريطة مسار لـ{name} في ذلك اليوم، لذا تبقى الساعة حيث هي.",
    "noteNoneWorld": "ليس في الخريطة مسار لـ{name} في ذلك اليوم، لذا تبقى الساعة حيث هي. أما العالم الذي التقاه فيُرسم لأي تاريخ.",
    "seeWorld": "شاهد {world} في ذلك اليوم",
    "seeWorldTitle": "اضبط الساعة على ذلك اليوم واذهب إلى {world}. لا يُرسم {name} نفسه هناك",
    "all": "كل الأحداث ({n})",
    "fewer": "أخفِ القائمة",
    "source": "التواريخ والأرقام: ",
    "unknown": "يشير هذا الرابط إلى حدث ليس في هذه الخريطة."
  },
  "tripCard": {
    "title": "الرحلات",
    "meta": "محطات: {n} · {m} د",
    "metaOne": "محطة واحدة · {m} د",
    "planning": "نحسب المحطات",
    "starting": "نبدأ…",
    "cannotRun": "لا تعمل الآن",
    "offOne": "رحلة واحدة لا تعمل الآن",
    "offMany": "رحلات لا تعمل الآن: {n}",
    "offWhy": "{line}: {reason}",
    "all": "كل الرحلات ({n})",
    "fewer": "رحلات أقل",
    "onItsOwn": "تشغيل تلقائي",
    "onItsOwnTitle": "رحلة بعد رحلة إلى أن تمسك بالتحكم",
    "justWatch": "شاهد فقط",
    "reelLength": "{m} د للدورة",
    "drift": "انجراف",
    "driftLength": "بلا نهاية",
    "driftTitle": "تتجول الكاميرا من شيء إلى آخر"
  },
  "explore": {
    "worldsTitle": "العوالم",
    "worldsDrawn": "الكواكب مرسومة نقاطًا، أكبر مما هي عليه.",
    "farTitle": "أماكن بعيدة",
    "systemsTitle": "أنظمة النجوم",
    "systemsMild": "كواكب قرب النطاق الصالح للحياة",
    "systemsExtreme": "أنظمة متطرفة",
    "exoRow": "كواكب النجوم الأخرى",
    "exoShow": "أظهر",
    "exoHide": "أخفِ",
    "exoTitle": "يعلّم كل نجم عُرف أن له كواكب",
    "lightYears": "{n} س.ض",
    "au": "{n} و.ف"
  },
  "rail": {
    "label": "الأدوات",
    "show": "ما يُعرض (L)",
    "share": "مشاركة (P)",
    "more": "أدوات أخرى",
    "moreLabel": "المزيد",
    "menuShare": "مشاركة",
    "menuHide": "أخفِ اللوحات",
    "menuGitHub": "المصدر على GitHub",
    "blog": "المدونة",
    "blogHref": "https://blog.spaceradar.ai/",
    "tour": "ابدأ الجولة",
    "menuTour": "ابدأ الجولة"
  },
  "timePill": {
    "label": "الوقت",
    "when": "\u2066{date} {time} UTC\u2069",
    "live": "مباشر · {when}",
    "held": "{when} · متوقف",
    "away": "{when} · {off}",
    "unknown": "الوقت غير معروف",
    "prev": "‹",
    "next": "›",
    "prevTitle": "إلى الوراء في الزمن",
    "nextTitle": "إلى الأمام في الزمن",
    "backToLive": "مباشر",
    "backToLiveTitle": "العودة إلى الوقت الحقيقي، الآن",
    "rate": "{n}×",
    "rateTitle": "السرعة {n}×. اضغط للانتقال إلى {next}×",
    "hold": "انقر لتثبيت الوقت، واسحب للتنقل عبره",
    "run": "انقر ليجري الوقت، واسحب للتنقل عبره",
    "localTitle": "وقتك {time}، {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "1 د",
      "hour": "1 س",
      "day": "1 يوم",
      "event": "حدث"
    },
    "unitWords": {
      "minute": "دقيقة واحدة",
      "hour": "ساعة واحدة",
      "day": "يوم واحد",
      "event": "حدث واحد"
    },
    "prevEvent": "الحدث السابق",
    "nextEvent": "الحدث التالي",
    "noEventBack": "لا حدث أسبق على الخط الزمني.",
    "noEventOn": "لا حدث أحدث على الخط الزمني.",
    "moonMark": "القمر {phase}، {date}",
    "sunMark": "{what} في مكانك، {date}",
    "sunMarkGuess": "{what} في المكان المخمّن لك، {date}",
    "sunWords": {
      "sunrise": "الشروق",
      "sunset": "الغروب"
    },
    "unitTitle": "الخطوة: {unit}. اضغط للانتقال إلى {next}",
    "tapeLabel": "الخط الزمني. اسحبه أو استخدم مفاتيح الأسهم",
    "tapeTitle": "اسحب للتنقل عبر الزمن",
    "now": "الآن",
    "nowTitle": "العودة إلى الآن",
    "rough": "تقريبي",
    "roughTitle": "بعد أكثر من أسبوع من الآن يصبح موضع القمر الاصطناعي على مداره تقريبيًا",
    "roughSay": "مواضع الأقمار الاصطناعية تقريبية على هذا البعد من الآن.",
    "worlds": "تبقى مواضع الكواكب وأقمارها ثابتة الدقة قرونًا.",
    "markTitle": "{what}. اضغط للذهاب إلى هناك",
    "endTitle": "ينتهي الخط الزمني هنا: شهر إلى الوراء، وسنة إلى الأمام"
  },
  "punctuation": {
    "comma": "، ",
    "dot": ".",
    "separator": " · ",
    "listJoin": "، ",
    "dash": " — ",
    "colon": ": ",
    "ellipsis": "…",
    "sentenceJoin": ". "
  },
  "worlds": {
    "sun": "الشمس",
    "mercury": "عطارد",
    "venus": "الزهرة",
    "earth": "الأرض",
    "moon": "القمر",
    "mars": "المريخ",
    "jupiter": "المشتري",
    "saturn": "زحل",
    "uranus": "أورانوس",
    "neptune": "نبتون",
    "pluto": "بلوتو",
    "io": "آيو",
    "europa": "أوروبا",
    "ganymede": "غانيميد",
    "callisto": "كاليستو",
    "phobos": "فوبوس",
    "deimos": "ديموس",
    "enceladus": "إنسيلادوس",
    "titan": "تيتان",
    "triton": "تريتون",
    "charon": "شارون"
  },
  "worldFacts": {
    "cite": {
      "pluto": "الموضع محسوب بمحرك Astronomy Engine (Don Cross، رخصة MIT) الذي يتتبع بلوتو تحت جذب الشمس والكواكب العملاقة؛ نصف القطر من مربع معلومات بلوتو في ويكيبيديا، وما هو من NASA Science، ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "io": "الموضع محسوب بمحرك Astronomy Engine (Don Cross، رخصة MIT): المشتري، مع نظرية L1.2 لأقماره (Lainey وDuriez وVienne)؛ نصف القطر من صحيفة حقائق NASA عن أقمار المشتري، وما هو من NASA Science، ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "europa": "الموضع محسوب بمحرك Astronomy Engine (Don Cross، رخصة MIT): المشتري، مع نظرية L1.2 لأقماره (Lainey وDuriez وVienne)؛ نصف القطر من صحيفة حقائق NASA عن أقمار المشتري، وما هو من NASA Science، ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "ganymede": "الموضع محسوب بمحرك Astronomy Engine (Don Cross، رخصة MIT): المشتري، مع نظرية L1.2 لأقماره (Lainey وDuriez وVienne)؛ نصف القطر من صحيفة حقائق NASA عن أقمار المشتري، وما هو من NASA Science، ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "callisto": "الموضع محسوب بمحرك Astronomy Engine (Don Cross، رخصة MIT): المشتري، مع نظرية L1.2 لأقماره (Lainey وDuriez وVienne)؛ نصف القطر من صحيفة حقائق NASA عن أقمار المشتري، وما هو من NASA Science، ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "phobos": "الموضع: المريخ من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 6 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والسطوع من صحيفة حقائق NASA عن المريخ، وما هو ولونه من NASA Science، وكلها قُرئت في 2026-09-22",
      "deimos": "الموضع: المريخ من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 120 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والسطوع من صحيفة حقائق NASA عن المريخ، وما هو ولونه من NASA Science، وكلها قُرئت في 2026-09-22",
      "enceladus": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 1 480 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، وما هو ولونه من NASA Science، وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "titan": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 840 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، وما هو من NASA Science، وهبوط هويغنز ولونه وطريقة رؤيته من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "triton": "الموضع: نبتون من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 10 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، وما هو من NASA Science، ولونه وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "charon": "الموضع: بلوتو من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 1 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والسطوع من صحيفة حقائق NASA عن بلوتو، وما هو ولونه من NASA Science، وكلها قُرئت في 2026-09-22",
      "mimas": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 700 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار زحل، وما هو ولونه من NASA Science، والسطوع من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "tethys": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 120 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار زحل، وما هو من NASA Science، ولونه وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "dione": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 240 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار زحل، ولونه من NASA Science، وما هو وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "rhea": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 200 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار زحل، وما هو ولونه من NASA Science، والسطوع من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "iapetus": "الموضع: زحل من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 6 800 كم بين 2000 و2050، أي 0.19 في المئة من مداره؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو الاثنان من صحيفة حقائق NASA عن أقمار زحل، وما هو ولونه من NASA Science، والسطوع من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "miranda": "الموضع: أورانوس من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 120 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار أورانوس، وما هو من NASA Science، ولونه وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "ariel": "الموضع: أورانوس من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 120 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار أورانوس، وما هو ولونه من NASA Science، والسطوع من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "umbriel": "الموضع: أورانوس من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 410 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار أورانوس، وما هو من NASA Science، ولونه وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "titania": "الموضع: أورانوس من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 1 000 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار أورانوس، وما هو ولونه من NASA Science، والسطوع من ويكيبيديا، وكلها قُرئت في 2026-09-22",
      "oberon": "الموضع: أورانوس من Astronomy Engine (Don Cross، رخصة MIT)، مع مدار مضبوط على JPL Horizons ومتحقَّق منه مقابله بفارق لا يتجاوز 1 230 كم بين 2000 و2050؛ نصف القطر من المعاملات الفيزيائية للأقمار لدى JPL، والألبيدو من صحيفة حقائق NASA عن أقمار أورانوس، وما هو من NASA Science، ولونه وسطوعه من ويكيبيديا، وكلها قُرئت في 2026-09-22"
    }
  },
  "worldView": {
    "withParent": "يُرسم {parent} أعرض بـ{n} مرات مما يبدو في السماء لتجده بسهولة، ويُرسم {name} حوله بالمقياس نفسه: وقد اتسعت المسافة بينه وبين {parent} بالقدر نفسه.",
    "withParentFloor": "ويُرسم {name} نفسه أكبر من ذلك، وإلا كان أصغر من أن يُرى.",
    "crowded": "لا يُرسم {name} بهذا العرض: فـ{near} لا يبعد في هذه السماء إلا {deg} درجات، وقرص بهذا الحجم كان سيغطيه."
  },
  "stars": {
    "unnamed": "نجم بلا اسم (HYG {n})"
  },
  "systems": {
    "mercuryRing": "مدار عطارد، للمقارنة بالمقياس"
  },
  "ladder": {
    "title": "كم يبعد",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, ما زال يُحمَّل",
    "weShowTitle": "ما ترسمه هذه الخريطة مما هو معروف",
    "weShowRow": "{n} {what} — من {of}",
    "edge": "حافة الخريطة",
    "edgeHow": "انطلق إليها",
    "edgeTitle": "رحلة واحدة من هنا إلى حافة ما ترسمه هذه الخريطة",
    "home": "الأرض",
    "homeHow": "عُد إليها",
    "homeTitle": "رحلة واحدة من هنا نزولًا إلى الأرض",
    "flightOff": "ليس من هذا المكان: اذهب أولًا إلى الأرض أو الكواكب أو النجوم"
  },
  "sceneNote": {
    "refused": "تعذرت قراءة الأقمار الاصطناعية.",
    "refusedTitle": "تعذرت قراءة CelesTrak، الذي ينشر المدارات، من هذا الاتصال. ما زال القمر والكواكب والنجوم والرحلات التي لا تحتاج إلى أقمار اصطناعية تعمل.",
    "why": "المصادر",
    "close": "×",
    "closeTitle": "أغلق هذه الملاحظة"
  },
  "link": {
    "unknownVersion": "هذا الرابط من خريطة أحدث. نعرض العرض الافتراضي.",
    "unknownTrip": "هذه الرحلة لم تعد في هذه الخريطة. نعرض العرض الافتراضي.",
    "unknownAt": "هذا الجرم ليس في هذه الخريطة؛ نعرض العرض الافتراضي.",
    "unknownStage": "لا تستطيع هذه الخريطة التمركز على ذلك المكان. نعرض العرض الافتراضي."
  },
  "share": {
    "link": "مشاركة",
    "linkTitle": "شارك هذا العرض: البطاقة البريدية والرابط وبضعة أسطر عنه",
    "title": "مشاركة",
    "close": "إغلاق",
    "pictureAlt": "البطاقة البريدية: هذا العرض مرسومًا من جديد بحجم الطباعة، مع تعليقه",
    "drawing": "نرسم البطاقة البريدية…",
    "noPicture": "تعذر رسم البطاقة البريدية الآن.",
    "withTag": "ضع علامة على المحدد",
    "linkLabel": "الرابط",
    "copyLink": "انسخ الرابط",
    "textLabel": "النص",
    "lookingUp": "نبحث عنه في ويكيبيديا…",
    "wikiSource": "مقالة ويكيبيديا التي يقتبس منها",
    "noWiki": "لا نص من ويكيبيديا هنا: المنشور أقصر.",
    "attribution": "من ويكيبيديا، CC BY-SA 4.0",
    "native": "شارك…",
    "nativeTitle": "مشاركة جهازك نفسه، مع البطاقة البريدية حيث يمكنه أخذ صورة",
    "nativeFailed": "لم تُفتح المشاركة؛ انسخ أو نزّل بدلًا من ذلك",
    "copy": "انسخ النص",
    "copyTitle": "انسخ النص والرابط، جاهزين للصقهما في منشور",
    "copied": "نُسخ النص والرابط",
    "linkCopied": "نُسخ الرابط",
    "copyRefused": "رُفض النسخ؛ النص محدد لتنسخه",
    "jpeg": "نزّل JPEG",
    "jpegTitle": "احفظ البطاقة البريدية صورة JPEG، 6 في 4 بوصات بدقة 300 نقطة في البوصة",
    "pdf": "نزّل PDF",
    "pdfTitle": "احفظ البطاقة البريدية ملف PDF من صفحة واحدة، 6 في 4 بوصات، للطباعة",
    "email": "البريد الإلكتروني",
    "emailTitle": "اكتب رسالة بريد إلكتروني فيها النص والرابط",
    "emailNote": "البريد لا يحمل صورة: استخدم «شارك…» أو نزّلها.",
    "networksLabel": "انشر على",
    "networkTitle": "افتح {network} بهذا المنشور، في علامة تبويب جديدة",
    "networkLabel": "انشر على {network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}، على Space Radar",
    "failed": "تعذر فتح المشاركة الآن",
    "mark": "spaceradar.ai",
    "photo": "وضع الصورة",
    "photoTitle": "ركّب صورة: كل شيء مخفي، وإطار، وتعليق",
    "embed": "تضمين",
    "embedTitle": "انسخ الشيفرة التي تضع هذا العرض المباشر في صفحة ويب",
    "embedCopied": "نُسخت شيفرة التضمين",
    "embedRefused": "رُفض النسخ الآن",
    "embedFrameTitle": "{name}، مباشرًا على Space Radar",
    "textRow": "نص المنشور"
  },
  "embed": {
    "open": "افتح في Space Radar",
    "openTitle": "افتح هذا العرض في الخريطة الكاملة، في علامة تبويب جديدة",
    "barLabel": "Space Radar، مضمَّنًا",
    "stationUnread": "نعرض الأرض: تعذرت قراءة موضع المحطة"
  },
  "density": {
    "panelTitle": "الكثافة",
    "regular": "عادية",
    "compact": "مدمجة",
    "auto": "تلقائية",
    "autoCompact": "مدمجة الآن، لأن هذه النافذة قصيرة.",
    "autoRegular": "عادية الآن؛ تصبح مدمجة حين يبلغ ارتفاع النافذة 800 بكسل أو أقل."
  },
  "nextList": {
    "justHappened": "حدث للتو",
    "justHappenedTitle": "إطلاقات وعودات إلى الغلاف الجوي في الأيام السبعة الأخيرة",
    "calendar": "التقويم",
    "calendarTitle": "أضف «{title}» إلى تقويمك: ينزّل ملف .ics واحدًا",
    "calendarSaved": "حُفظ {file}",
    "calendarFailed": "تعذر إنشاء ملف التقويم",
    "sameName": "{name} ({id})",
    "title": "قريبًا",
    "showAll": "أظهر الكل ({n})",
    "showFewer": "أظهر أقل",
    "now": "الآن تقريبًا",
    "inMinutes": "بعد {n} د",
    "inHours": "بعد {n} س",
    "todayAt": "اليوم في {time}",
    "tomorrowAt": "غدًا في {time}",
    "launch": "ينطلق {name} {when}",
    "launchRough": "ينطلق {name} {when} تقريبًا — لم يُحدد الموعد بعد",
    "approach": "يمر {name} قرب الأرض {when}، على بعد {ld}× مسافة القمر",
    "approachNoDistance": "يمر {name} قرب الأرض {when}",
    "sizeM": "عرضه {n} م",
    "sizeKm": "عرضه {n} كم",
    "sizeRangeM": "عرضه نحو {lo} إلى {hi} م، تقديرًا من سطوعه",
    "sizeRangeKm": "عرضه نحو {lo} إلى {hi} كم، تقديرًا من سطوعه",
    "sizeMixed": "عرضه نحو {lo} م إلى {hi} كم، تقديرًا من سطوعه",
    "perihelion": "يكون {name} أقرب ما يكون من الشمس {when}",
    "pass": "يعبر {name} فوقك {when}",
    "train": "قطار من {n} من الأقمار الاصطناعية يعبر فوقك {when}",
    "aurora": "تتوقع NOAA {word}، ابتداءً من {when} (Kp {kp})",
    "auroraNow": "عاصفة مغنطيسية أرضية جارية: {word} (Kp {kp})",
    "shower": "تبلغ زخة شهب {name} ذروتها نحو {date}، بما يصل إلى {zhr} في الساعة تحت سماء مظلمة",
    "showerMoon": "تبلغ زخة شهب {name} ذروتها نحو {date}، بما يصل إلى {zhr} في الساعة تحت سماء مظلمة، والقمر مضاء بنسبة {pct}% في تلك الليلة",
    "showerNoMoon": "تبلغ زخة شهب {name} ذروتها نحو {date}، بما يصل إلى {zhr} في الساعة تحت سماء مظلمة، والقمر شبه محاق",
    "radiantHigh": "من مكانك يكون مصدرها (الراديانت) في أعلى ارتفاع نحو {time}",
    "radiantLow": "من مكانك يبقى مصدرها منخفضًا طوال الليل، فتوقع عددًا أقل بكثير",
    "radiantNeverUp": "من مكانك يبقى مصدرها تحت الأفق في تلك الليلة",
    "eclipseKinds": {
      "total": "كلي",
      "annular": "حلقي",
      "partial": "جزئي",
      "hybrid": "هجين",
      "penumbral": "شبه ظلي"
    },
    "solarEclipseTitle": "كسوف شمسي {kind}",
    "lunarEclipseTitle": "خسوف قمري {kind}",
    "solarEclipse": "كسوف شمسي {kind} في {date}: يسقط ظل القمر أعمق ما يكون {where}",
    "solarEclipseGrazing": "كسوف شمسي {kind} في {date}، لا يُرى إلا من أقصى الشمال أو أقصى الجنوب",
    "lunarEclipse": "خسوف قمري {kind} في {date}، والقمر في ظل الأرض لكل من يستطيع رؤيته",
    "lunarEclipsePenumbral": "خسوف قمري {kind} في {date}: يخفت القمر قليلًا فقط، في الظل الخارجي للأرض",
    "seasonTitles": {
      "march": "اعتدال مارس",
      "june": "انقلاب يونيو",
      "september": "اعتدال سبتمبر",
      "december": "انقلاب ديسمبر"
    },
    "seasons": {
      "march": "اعتدال مارس في {date}: النهار والليل متساويان تقريبًا في كل مكان",
      "june": "انقلاب يونيو في {date}: أطول نهار في الشمال وأقصره في الجنوب",
      "september": "اعتدال سبتمبر في {date}: النهار والليل متساويان تقريبًا في كل مكان",
      "december": "انقلاب ديسمبر في {date}: أطول نهار في الجنوب وأقصره في الشمال"
    },
    "solstice": "{title} في {date}",
    "equinox": "{title} في {date}",
    "eclipseNear": "قرب {city}",
    "eclipseFrom": "على بعد نحو {km} كم من {city}",
    "eclipseLocal": "من مكانك: يبدأ {begin}، وأعمق ما يكون {peak} بتغطية {pct}% من الشمس، وينتهي {end}",
    "eclipseLocalTotal": "من مكانك: يبدأ {begin}، والكلية عند {peak}، وينتهي {end}",
    "eclipseNotVisible": "لا يُرى من مكانك",
    "eclipseBelowHorizon": "من مكانك تكون الشمس تحت الأفق أثناء حدوثه",
    "classOf": {
      "launch": "خطة: الوقت الذي تستهدفه الجهة المطلِقة، وقد يتغير",
      "approach": "محسوب من NASA JPL انطلاقًا من مدار الكويكب المقيس",
      "perihelion": "محسوب انطلاقًا من المدار المنشور للمذنَّب",
      "shower": "التاريخ السنوي المعتاد؛ وتتحرك الذروة بنحو يوم",
      "aurora": "توقع NOAA، كل ثلاث ساعات",
      "auroraNow": "مقيس من NOAA في الساعات القليلة الماضية",
      "pass": "محسوب هنا من عناصر مدارية مقيسة {age}",
      "passNoAge": "محسوب هنا من عناصر مدارية",
      "eclipse": "محسوب هنا بدقة الدقيقة من حركة الشمس والقمر",
      "season": "محسوب هنا بدقة الدقيقة من موضع الشمس",
      "conjunction": "محسوب هنا لمكانك، عند أقرب اقتراب بينهما وهما معًا فوق الأفق في الظلام"
    },
    "row": {
      "conjunctionTitle": "{a} و{b}",
      "conjunction": "{when} · بينهما {sep}°، {height} نحو {dir}",
      "conjunctionValue": "{sep}°",
      "low": "منخفض",
      "mid": "في منتصف الارتفاع",
      "high": "مرتفع",
      "launch": "ينطلق {when} · مخطط",
      "launchRough": "نحو {when} · لم يُحدد الموعد",
      "approach": "يمر قرب الأرض {when}",
      "approachValue": "{ld}× القمر",
      "approachSized": "يمر قرب الأرض {when} · {size}",
      "sizeM": "{n} م",
      "sizeKm": "{n} كم",
      "sizeRangeM": "نحو {lo} إلى {hi} م",
      "sizeRangeKm": "نحو {lo} إلى {hi} كم",
      "perihelion": "أقرب ما يكون من الشمس {when}",
      "pass": "يعبر فوقك {when}",
      "trainTitle": "قطار ستارلينك من {n}",
      "auroraTitle": "توقع الشفق",
      "auroraNowTitle": "عاصفة مغنطيسية أرضية الآن",
      "aurora": "توقع NOAA، ابتداءً من {when}",
      "auroraNow": "مقيس من NOAA في الساعات الماضية",
      "kp": "Kp {kp}",
      "showerTitle": "شهب {name}",
      "shower": "الذروة نحو {date} · حتى {zhr} في الساعة",
      "eclipse": "{date} · محسوب بدقة الدقيقة",
      "eclipseHere": "{date} · من هنا {begin} إلى {end}",
      "eclipseNotHere": "{date} · لا يُرى من هنا"
    },
    "none": "لا شيء قادم فيما جرى تحميله.",
    "notLoaded": "لم يُحمَّل، فلم يُدرج: {layers}."
  },
  "groundTrack": {
    "tick": "+{n} د",
    "label": "تابعه",
    "rideAlong": "ارافقه",
    "rideAlongTitle": "ضع الكاميرا خلفه مباشرة، تنظر أمامه على امتداد مساره. اسحب لتتوقف.",
    "lookBeside": "انظر من جانبه",
    "showTrack": "ارسم مساره على الأرض",
    "hideTrack": "أخفِ مساره على الأرض",
    "highNote": "لا يُرسم مساره على الأرض تلقائيًا على هذا الارتفاع: فهو بالكاد يتحرك.",
    "trackNote": "الخط على الكرة هو الأرض تحته، قبل 45 دقيقة (متقطعًا) وبعد 90 دقيقة، وعلامة كل 5 دقائق."
  },
  "spaceWeather": {
    "level": "Kp {kp}، {word}",
    "levelWithScale": "Kp {kp}، {word} ({scale})",
    "measured": "طقس الفضاء: {level} — مقيس {age}، {via}.",
    "forecastOnly": "طقس الفضاء: {level} — توقع وليس قياسًا؛ {via}.",
    "stale": "هذه القراءة أقدم مما تعد به NOAA؛ اعتبرها تخمينًا.",
    "stormComing": "تتوقع NOAA ارتفاعه إلى Kp {kp}.",
    "couldNotLook": "طقس الفضاء: تعذرت النظرة — {why}",
    "couldNotLook0": "طقس الفضاء: تعذرت النظرة.",
    "justNow": "للتو",
    "currentBin": "للفترة الحالية البالغة ثلاث ساعات",
    "aMinuteAgo": "قبل دقيقة",
    "minutesAgo": "قبل {n} د",
    "anHourAgo": "قبل ساعة",
    "hoursAgo": "قبل {n} س",
    "aDayAgo": "قبل يوم",
    "daysAgo": "قبل {n} يوم",
    "ageUnknown": "في وقت لم تذكره NOAA",
    "viaLive": "NOAA SWPC، قراءة مباشرة",
    "viaSnapshot": "NOAA SWPC، من نسختنا",
    "words": {
      "unknown": "لا قراءة",
      "quiet": "هادئ",
      "unsettled": "غير مستقر",
      "active": "نشط",
      "minorStorm": "عاصفة طفيفة — قد يظهر الشفق في أقصى الشمال والجنوب",
      "moderateStorm": "عاصفة متوسطة — الشفق مرجح في خطوط العرض العالية",
      "strongStorm": "عاصفة قوية — شفق بعيد عن القطبين، وأقمار اصطناعية تنحرف عن مسارها",
      "severeStorm": "عاصفة شديدة",
      "extremeStorm": "عاصفة قصوى"
    }
  },
  "chooser": {
    "label": "ما تحت إصبعك",
    "hint": "هنا {n}. المس واحدًا، أو المس السماء للإغلاق."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "إغلاق",
    "closeTitle": "أغلق هذه البطاقة (Escape)",
    "it": "هو",
    "articles": [
      "\u200b",
      "\u200b"
    ],
    "leadVerbs": [
      "يُعد",
      "كان"
    ],
    "makeCentre": "اجعل {name} مركز الخريطة",
    "isCentre": "هذا هو مركز الخريطة",
    "centreShort": "اجعله مركز الخريطة",
    "ownPage": "صفحته الخاصة",
    "ownPageTitle": "صفحة عنه يمكنك مشاركة رابطها، في علامة تبويب جديدة",
    "isCentreShort": "هو المركز هنا",
    "comparisonsLabel": "ليكون الأمر أوضح",
    "rightNowLabel": "الآن",
    "seeItLabel": "شاهده من هنا",
    "actionsLabel": "ما يمكنك فعله",
    "unknownName": "جرم بلا اسم",
    "unknownKind": "{name} على الخريطة، لكننا لا نعرف أي نوع من الأجرام هو",
    "rows": {
      "altitude": "الارتفاع عن الأرض",
      "speed": "السرعة",
      "groundPoint": "يمر فوق",
      "below": "تحته الآن",
      "fromYou": "البعد عنك",
      "fromGuess": "البعد عن {place}، وهو تخميننا لمكانك",
      "distanceFromEarth": "البعد عن الأرض",
      "distanceFromSun": "البعد عن الشمس",
      "lightLeft": "غادره ضوؤه",
      "sunlight": "هو الآن",
      "hostStar": "نجمه",
      "across": "القطر",
      "mass": "الكتلة",
      "spin": "دورة واحدة تستغرق",
      "source": "المصدر",
      "whySource": "لماذا هو معروف، من",
      "widthSource": "العرض من",
      "distanceNote": "تقريبًا عند هذا البعد",
      "objectType": "ما هو",
      "constellation": "الكوكبة",
      "distanceRange": "البعد، أفضل التقديرات",
      "planetRadius": "القطر، بوحدات الأرض",
      "planetMass": "الكتلة، بوحدات الأرض",
      "yearLength": "السنة هناك",
      "found": "اكتُشف",
      "catalogueCopy": "نسخة الفهرس",
      "spectralType": "نوع النجم",
      "brightness": "سطوعه الظاهري",
      "luminosity": "كمية الضوء الصادر",
      "starWidth": "القطر",
      "catalogue": "الفهرس",
      "iauName": "الاسم المعتمد من الاتحاد الفلكي الدولي",
      "lightTime": "زمن الراديو في الاتجاه الواحد",
      "nextPass": "مروره التالي فوقك",
      "crew": "الأشخاص على متنه",
      "operator": "يشغّله",
      "launched": "أُطلق",
      "ended": "انتهى",
      "pathEnds": "ينتهي مساره",
      "pathBegins": "يبدأ مساره",
      "period": "الدورة الواحدة تستغرق",
      "location": "موقعه",
      "onBody": "على",
      "whenSite": "متى",
      "onWorld": "واقف على",
      "orbiting": "في مدار حول",
      "heightAbove": "الارتفاع فوق {world}",
      "closestApproach": "أقرب اقتراب من الأرض",
      "moons": "الأقمار",
      "perihelion": "أقرب اقتراب من الشمس",
      "magnitude": "السطوع",
      "phase": "الطور",
      "liftoff": "الإقلاع",
      "pad": "من",
      "destination": "متجه إلى",
      "whereabouts": "مكانه",
      "lastSeen": "آخر موضع معروف",
      "stormNow": "في آخر نشرة",
      "stormWind": "أقوى رياح على مساره",
      "stormAdvisory": "آخر نشرة",
      "stormCentre": "مركزها",
      "stormAgency": "بحسب نشرة",
      "stormAlert": "مستوى تنبيه GDACS"
    },
    "values": {
      "km": "{n} كم",
      "kmh": "{n} كم/س",
      "belowBorder": "قرب حدود {a} و{b}",
      "belowLand": "يابسة",
      "belowWater": "مياه مفتوحة",
      "stormWind": "{n} كم/س، مع التوقع",
      "stormWindCategory": "{n} كم/س، الفئة {cat}، مع التوقع",
      "stormAdvisory": "{time} UTC، {ago}",
      "stormAdvisoryDated": "{date}، {time} UTC، {ago}",
      "stormStatus": {
        "hurricane": "بقوة إعصار هاريكين",
        "typhoon": "بقوة إعصار تايفون",
        "cyclone": "بقوة إعصار سايكلون",
        "storm": "عاصفة مدارية",
        "depression": "منخفض مداري"
      },
      "stormAlert": {
        "green": "أخضر",
        "orange": "برتقالي",
        "red": "أحمر"
      },
      "launchedAgo": "قبل {n} يوم، في {date}",
      "au": "{n} وحدة فلكية",
      "lightYears": "{n} سنة ضوئية",
      "inSunlight": "في ضوء الشمس",
      "inShadow": "في ظل الأرض",
      "yearsAgo": "قبل {n} سنة",
      "monthsAgo": "قبل {n} شهر",
      "suns": "{n}× الشمس",
      "sunsWide": "{n}× الشمس، تقديرًا",
      "sunsWideMeasured": "{n}× الشمس، قيمة مقيسة",
      "earths": "{n}× الأرض",
      "lightYearsRange": "من {lo} إلى {hi} سنة ضوئية",
      "kmRange": "من {lo} إلى {hi} كم",
      "noMoonsKnown": "لا يُعرف أي منها",
      "sunsRange": "من {lo} إلى {hi}× الشمس",
      "millionSuns": "{n} مليون شمس",
      "billionSuns": "{n} مليار شمس",
      "milliseconds": "{n} ملي ثانية",
      "billionYearsAgo": "قبل {n} مليار سنة",
      "millionYearsAgo": "قبل {n} مليون سنة",
      "days": "{n} يوم",
      "hours": "{n} ساعة",
      "yearByMethod": "{year}، {method}",
      "asOf": "حتى {date}",
      "magnitude": "القدر {n}",
      "lunar": "{n}× مسافة القمر",
      "minutes": "{n} دقيقة",
      "seconds": "{n} ثانية",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}، {lon}",
      "latLonOn": "{lat}، {lon} على {world}",
      "north": "{n}° شمالًا",
      "south": "{n}° جنوبًا",
      "east": "{n}° شرقًا",
      "west": "{n}° غربًا"
    },
    "couldNotLook": "تعذر حساب هذا",
    "nobodyKnows": "لا أحد يعرف",
    "wouldNeed": "سيحتاج الأمر إلى {wouldNeed}.",
    "endedLine": "انتهت مهمته في {date}. أحداثه، أدناه، تعود إليه.",
    "pathEndedLine": "ينتهي المسار الذي يحتفظ به JPL له في {date}. أحداثه، أدناه، تعود إليه.",
    "pathBeginsLine": "يبدأ المسار الذي يحتفظ به JPL له في {date}. أحداثه، أدناه، تعود إليه.",
    "actions": {
      "flyTo": "طِر إليه",
      "flyToTitle": "انقل الكاميرا إلى هذا الجرم",
      "flyEnded": "انتهت مهمته في {date}. اختر حدثًا من مهمته لتذهب إليه",
      "flyPathEnded": "ينتهي مساره في {date}. اختر حدثًا من مهمته لتذهب إليه",
      "flyPathBegins": "يبدأ مساره في {date}. اختر حدثًا من مهمته لتذهب إليه",
      "flyNowhere": "لا موضع لهذا الجرم في هذه اللحظة",
      "seeFromHere": "شاهده من هنا",
      "seeFromHereTitle": "انظر إلى الأعلى من مكانك على الأرض",
      "follow": "تابعه",
      "followTitle": "طِر إليه وأبقه في وسط العرض",
      "ride": "ارافقه",
      "rideShort": "ارافقه",
      "seeShort": "شاهده",
      "postcard": "بطاقة بريدية",
      "share": "مشاركة"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "كوكب",
      "moon": "قمر",
      "dwarf": "كوكب قزم",
      "ourStar": "نجم",
      "exoplanet": "كوكب خارجي"
    },
    "regime": {
      "leo": "مدار أرضي منخفض",
      "meo": "مدار أرضي متوسط",
      "geo": "مدار أرضي ثابت بالنسبة إلى الأرض",
      "heo": "مدار أرضي مرتفع",
      "inner": "النظام الشمسي الداخلي",
      "outer": "النظام الشمسي الخارجي",
      "belt": "حزام الكويكبات",
      "beyondNeptune": "ما وراء نبتون",
      "round": "حول {world}",
      "inCon": "في {con}",
      "onWorld": "على {world}",
      "centre": "مركز النظام الشمسي",
      "nearby": "من أقرب الأجرام"
    },
    "hero": {
      "label": "في ثلاثة أرقام",
      "missing": "—",
      "captions": {
        "altitude": "{u} للأعلى",
        "away": "{u} بعيدًا",
        "speed": "{u}",
        "period": "{u} للدورة",
        "distanceFromSun": "{u} عن الشمس",
        "distanceFromEarth": "{u} عن الأرض",
        "lightTime": "{u} في كل اتجاه",
        "spin": "{u} للدورة",
        "yearLength": "{u} للسنة",
        "brightness": "القدر",
        "spectralType": "فئة النجم",
        "across": "{u} قطرًا",
        "lightLeft": "{u} بعيدًا",
        "launched": "يومًا في الفضاء",
        "fromYou": "{u} عنك",
        "heightAbove": "{u} للأعلى",
        "other": "{u}"
      },
      "units": {
        "minutes": "د",
        "hours": "س",
        "days": "يوم",
        "seconds": "ث",
        "milliseconds": "مللي ث",
        "astronomical units": "و.ف",
        "light-years": "س.ض",
        "years ago": "س.ض",
        "million years ago": "مليون س.ض",
        "billion years ago": "مليار س.ض",
        "months ago": "شهر ضوئي"
      }
    },
    "sections": {
      "label": "المزيد عنه",
      "see": "متى يمكنك رؤيته",
      "path": "مساره",
      "aboard": "من على متنه",
      "ridingOn": "على ماذا يركب",
      "about": "عنه",
      "sources": "مصادر هذا السجل",
      "placeGuessed": "المكان مخمّن",
      "needsPlace": "يحتاج إلى مكانك",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "تُرسم {n} مجموعة من البقع الشمسية، من قائمة NOAA ليوم {date}: كل مجموعة بقعة مستديرة واحدة في موضعها وحجمها المُبلَّغ عنهما، أدارتها الشمس بدورانها منذ ذلك الحين.",
    "spotsOne": "تُرسم مجموعة واحدة من البقع الشمسية، من قائمة NOAA ليوم {date}: بقعة مستديرة واحدة في موضعها وحجمها المُبلَّغ عنهما، أدارتها الشمس بدورانها منذ ذلك الحين.",
    "spotsPaired": "تُرسم {n} مجموعة من البقع الشمسية، من قائمة NOAA ليوم {date}، أدارتها الشمس بدورانها منذ ذلك الحين. أما المجموعات المتعددة البقع وعددها {pairs} فتُرسم بقعة سابقة إلى الغرب وبقعة لاحقة إلى الشرق؛ والفاصل بينهما وكيفية توزيع المساحة عليهما توضيحيان. وبقية المجموعات بقعة مستديرة واحدة.",
    "spotsPairedOne": "تُرسم مجموعة واحدة من البقع الشمسية، من قائمة NOAA ليوم {date}، أدارتها الشمس بدورانها منذ ذلك الحين: بقعة سابقة إلى الغرب وبقعة لاحقة إلى الشرق. والفاصل بينهما وكيفية توزيع المساحة عليهما توضيحيان.",
    "regionsCredit": "مجموعات البقع الشمسية اليوم: مركز التنبؤ بطقس الفضاء في NOAA، ملخص المناطق الشمسية",
    "flaresCredit": "التوهجات الشمسية: مركز التنبؤ بطقس الفضاء في NOAA، قائمة الأحداث المحرَّرة",
    "cmeCredit": "الانقذافات الكتلية الإكليلية: NASA DONKI (مكتب تحليل طقس الفضاء من القمر إلى المريخ وCCMC)"
  },
  "clouds": {
    "live": "السحب: رُصدت {when}، {ago}، بالأشعة تحت الحمراء بواسطة {satellites}، عبر NASA GIBS. أبرد القمم، حيث العواصف الرعدية، تُرسم أعلى وأشد بياضًا من الباقي. وفوق أوروبا وإفريقيا والمحيط الهندي والقطبين، التي لا يراها أي من تلك الأقمار، تكون السحب توضيحية.",
    "at": "عند {time} UTC",
    "between": "بين {from} و{to} UTC",
    "atDated": "في {date} عند {time} UTC",
    "betweenDated": "في {date} بين {from} و{to} UTC",
    "clockElsewhere": " الساعة عند {time} UTC في {date}؛ وتبقى السحب كما رأتها تلك الصورة.",
    "and": " و",
    "illustrative": "السحب: توضيحية. هذه صورة واحدة ليوم مضى، تنجرف ببطء؛ وليست طقس اليوم.",
    "illustrativeSaveData": "السحب: توضيحية. لا تُجلب صور الأقمار الاصطناعية لليوم على اتصال يوفّر البيانات.",
    "illustrativeScrubbed": "السحب: توضيحية، لأن الساعة تبعد أكثر من 12 ساعة عن أحدث صورة من الأقمار الاصطناعية، وهي ليوم {date} عند {time} UTC.",
    "gibsAcknowledgement": "نشكر استخدام الصور التي وفّرتها خدمات NASA's Global Imagery Browse Services (GIBS)، وهي جزء من NASA's Earth Science Data and Information System (ESDIS).",
    "satelliteCredit": "السحب الحية: صور GOES-East وGOES-West بالأشعة تحت الحمراء، NOAA؛ وصور Himawari بالأشعة تحت الحمراء، وكالة الأرصاد الجوية اليابانية (JMA)."
  },
  "aurora": {
    "live": "الشفق: حيث يتوقعه نموذج OVATION من NOAA في الساعة القادمة (توقعه لـ{time} UTC، وقد صدر {ago})، وليس صورة فوتوغرافية. والطيات الدقيقة فيه مرسومة.",
    "liveNoFolds": "الشفق: حيث يتوقعه نموذج OVATION من NOAA في الساعة القادمة (توقعه لـ{time} UTC، وقد صدر {ago})، وليس صورة فوتوغرافية.",
    "waiting": "الشفق: لم يصل توقع NOAA بعد.",
    "failed": "الشفق: تعذرت قراءة توقع NOAA الآن، فلا شيء مرسوم.",
    "far": "الشفق: غير مرسوم، لأن الساعة تبعد أكثر من ثلاث ساعات عن أحدث توقع من NOAA.",
    "saveData": "الشفق: لا يُجلب توقع NOAA على اتصال يوفّر البيانات.",
    "switchedOff": "الشفق: مُطفأ في الطبقات.",
    "credit": "الشفق: توقع من نموذج OVATION Prime في مركز التنبؤ بطقس الفضاء في NOAA (ملكية عامة).",
    "rightNow": "الشفق مرجح قرب القطبين",
    "rightNowReach": "الشفق مرجح حتى خط العرض {lat}°",
    "rightNowValue": "Kp {kp}",
    "showMe": "طِر إلى الشفق في الجانب الليلي"
  },
  "weather": {
    "lightning": {
      "live": "البرق: نحو {n} ضربة في الدقيقة حيث تصل خريطة NOAA، أي الأمريكتين والمحيط الهادئ (عدّها حتى {time}، {ago}). مكان الضربات وتواترها مقيسان؛ أما لحظة كل وميض فمرسومة، وأكبر من حجمها الحقيقي.",
      "quiet": "البرق: يكاد لا يوجد حيث تصل خريطة NOAA، أي الأمريكتين والمحيط الهادئ (عدّها حتى {time}، {ago}).",
      "waiting": "البرق: لم تصل خريطة NOAA بعد.",
      "failed": "البرق: تعذرت قراءة خريطة NOAA الآن، فلا شيء مرسوم.",
      "away": "البرق: غير مرسوم، لأن الساعة تبعد أكثر من ساعة عن أحدث خريطة من NOAA.",
      "off": "البرق: لا يُجلب على هذا الجهاز أو هذا الاتصال.",
      "reducedMotion": "البرق: غير مرسوم، لأن هذا الجهاز يطلب حركة أقل.",
      "switchedOff": "البرق: مُطفأ في الطبقات.",
      "credit": "البرق: كثافة الضربات من NOAA nowCOAST، أعدّها مركز التنبؤ بالمحيطات في NWS من الشبكتين الأرضيتين NLDN وGLD360 (ملكية عامة)."
    },
    "worlds": {
      "jupiter": "الطقس: تنزلق الأحزمة بعضها قرب بعض بسرعات الرياح المقيسة من Hubble، وتدور البقعة الحمراء العظمى. حركة منمذجة: لا غيمة مرسومة في مكانها اليوم.",
      "saturn": "الطقس: تتحرك الأحزمة بسرعات الرياح التي قاسها Cassini. حركة منمذجة، وليست غيوم اليوم. والسداسي عند القطب الشمالي مرسوم في موضعه المقيس؛ أما شكله فتوضيحي.",
      "venus": "الطقس: تدور طبقة الغيوم في نحو أربعة أيام، كما قاس Venus Express، أسرع من سطح الكوكب بستين مرة. حركة منمذجة، وليست غيوم اليوم.",
      "uranus": "الطقس: ينجرف الهواء بسرعات الرياح المقيسة من Keck وGemini. حركة منمذجة، وليست غيوم اليوم.",
      "neptune": "الطقس: يجري الهواء بسرعات الرياح التي قاسها Voyager 2، وهي الأسرع على أي كوكب. حركة منمذجة، وليست غيوم اليوم.",
      "mars": "الطقس: الفصل الآن على المريخ هو {season}. القلنسوتان الجليديتان والغبار في هواء المريخ، بعمق بصري قرب {tau}، هما ما يأتي به ذلك الفصل عادةً: موسميان وتوضيحيان، وليسا طقس اليوم.",
      "titan": "الطقس: الخطوط الباهتة في الشمال تمثل غيوم الميثان التي رآها تلسكوبا Webb وKeck هناك في نوفمبر 2022 ويوليو 2023. توضيحي: لا يُعرف أين غيوم تيتان اليوم."
    },
    "also": {
      "venus": "حرف Y الداكن الذي يدور معه هو ما تراه الكاميرات فوق البنفسجية؛ وبالعين يكاد الزهرة يكون أملس، ومكانه هنا توضيحي. وقد أُبلغ عن برق على الزهرة وما زال محل جدل؛ ولا برق مرسوم.",
      "uranus": "القلنسوة الساطعة فوق القطب الشمالي حقيقية: سطوعها ولونها، خط عرض بعد خط عرض، مأخوذان من خريطة Hubble لأكتوبر 2025، وقد رصد Hubble ازدياد سطوعها عامًا بعد عام مع اقتراب صيف الشمال في 2028.",
      "neptune": "البيضاوي الداكن على خريطة الفنان هو البقعة المظلمة العظمى التي رآها Voyager 2 في 1989، وكانت قد زالت بحلول 1994: توضيحية، وغير مرسومة في المظهر المقيس. وفي المظهر السينمائي تلقي السحب الرقيقة من الميثان ظلالًا، مرسومة أعرض وأعلى بست مرات مما قيس؛ وكل خط فيها من صنعنا."
    },
    "flashes": {
      "jupiter": "على جانبه الليلي، تمثل وميضات نادرة البرق الذي وجده Juno، ومعظمه في أقصى الشمال: خطوط العرض مقيسة، وكل وميض توضيحي ومرسوم أكبر من حجمه الحقيقي.",
      "saturn": "على جانبه الليلي، تمثل وميضات نادرة عند خط العرض 36 جنوبًا البرق الذي صوّره Cassini هناك في 2009: توضيحية وأكبر من حجمها الحقيقي، ولا أحد يرصده الآن."
    },
    "seasons": [
      "ربيع الشمال",
      "صيف الشمال",
      "خريف الشمال",
      "شتاء الشمال"
    ]
  },
  "drawing": {
    "orbitLine": "الخط هو دورة واحدة قادمة، محسوبة من العناصر نفسها التي حُسبت منها النقطة.",
    "orbitLineYear": "الخط هو السنة القادمة من مساره، محسوبة من العناصر نفسها التي حُسبت منها النقطة.",
    "orbitLineWhole": "الخط هو مداره كله حول الشمس، محسوب من العناصر نفسها التي حُسبت منها النقطة.",
    "orbitLinePassage": "الخط هو مروره الوحيد عبر المجموعة الشمسية، داخلًا وخارجًا، محسوبًا من العناصر نفسها التي حُسبت منها النقطة.",
    "variant": "مرسوم من أبعاد منشورة لـ{name}",
    "family": "مرسوم على هيئة {name} — الشكل والارتفاع العامان للعائلة، وليس هذا الإصدار بعينه",
    "generic": "مرسوم على هيئة صاروخ عام؛ ليست لدينا أبعاد لـ{name}",
    "genericUnnamed": "مرسوم على هيئة صاروخ عام؛ ليست لدينا أبعاد لهذه المركبة",
    "disputed": "المصادر تختلف في ارتفاعه ({disputed})",
    "objectVariant": "مرسوم من أبعاد منشورة لـ{name}",
    "objectModel": "مرسوم من نموذج منشور لـ{name}",
    "padEmpty": "المنصة مكان مقيس؛ ولا يُرسم {name} عليها إلا حول الإطلاقات المدرجة",
    "objectMapped": {
      "dawn": "سطحه هو الفسيفساء بالأبيض والأسود لمركبة Dawn، مصبوغة برمادي اخترناه؛ أما ظلال فوهاته فهي التي صوّرها Dawn ولا تتحرك مع الشمس هنا"
    },
    "objectFamily": "مرسوم على هيئة {name} — من النوع نفسه، وليس هذا الجرم بعينه",
    // b200-m2-buses: begin
    "objectBus": "المنصة: {bus} ({source}). مرسوم بمنصة بديلة.",
    // b200-m2-buses: end
    "objectOwn": "مرسوم على هيئة {name}",
    "objectMade": {
      "images": "الشكل مبني من صور فوتوغرافية؛ والنسب تقريبية",
      "render": "الشكل مبني من رسم فني؛ والنسب تقريبية",
      "dimensions": "الشكل مبني من أبعاد منشورة وصور؛ والتفاصيل مبسّطة"
    },
    "objectWas": {
      "hitomi": "معروض سليمًا، كما أُطلق في فبراير 2016؛ وانكسر بعد خمسة أسابيع، وما يُتتبع هنا هو جسمه الرئيسي دون الألواح الشمسية",
      "envisat": "معروض ثابتًا، وأجهزته نحو الأرض، كما كان يطير حين كان يعمل؛ وهو ميت منذ 2012 ولا أحد يوجّهه",
      "ers1": "معروض ثابتًا، وأجهزته نحو الأرض، كما كان يطير حين كان يعمل؛ وانتهت مهمته في 2000 ولا أحد يوجّهه"
    },
    "objectGeneric": "مرسوم على هيئة جرم عام؛ ليس لدينا شكل لـ{name}",
    "classShape": {
      "satellite": "قمر اصطناعي عام",
      "station": "محطة فضائية عامة",
      "debris": "قطعة حطام",
      "rocket": "صاروخ عام",
      "probe": "مسبار عام",
      "telescope": "تلسكوب عام",
      "asteroid": "كويكب عام",
      "dwarf": "جرم مستدير بسيط بحجمه المقيس",
      "comet": "مذنب عام",
      "site": "موقع أرضي عام",
      "star": "نقطة ضوء، يتحدد حجمها بسطوعه كما يبدو من مكانك",
      "exoplanet": "علامة عند نجمه — فمداره أصغر بكثير من أن يُرسم",
      "dso": "وهج ناعم على طريقة نوعه عند بعده المقيس، بالاتساع الذي يقاس له؛ والنمط فيه توضيحي، وشكله الحقيقي غير مرسوم",
      "exotic": "حلقة عند بعده المقيس؛ فالثقب الأسود لا شكل له ليُرسم، والنجم النابض أصغر بكثير من أن يُرسم",
      "exoticStar": "حلقة عند بعده المقيس؛ والنجم نفسه نقطة بهذا المقياس"
    },
    "storm": "مرسوم علامةً عند مركزه؛ والعاصفة نفسها هي السحب حوله",
    "feature": "مكان مسمّى: لا شيء مرسوم هنا سوى علامة عند مركزه، وُضعت من المرجع المذكور؛ والأرض تحتها هي الخريطة نفسها",
    "markOnly": "علامة عند مكانه؛ ولا شيء قائم هناك ليُرسم",
    "noPlace": "غير مرسوم: لا مكان له لنضع عليه علامة",
    "shower": "اسم عند النقطة التي تبدو شهبه قادمة منها، في منظر السماء قرب ذروتها؛ اتجاه، وليس مكانًا في الفضاء",
    "objectSpin": {
      "spin": "يدور حول قطبه المقيس بمعدله المقيس؛ أما أي جانب يواجه الشمس في هذه اللحظة فليس تنبؤًا",
      "pair": "كلاهما يدور حول قطبه المقيس بمعدليهما المقيسين، ويدور Dimorphos على المسافة وبالمدة اللتين قيستا بعد أن ضربته DART؛ أما موضعه على ذلك المدار فتوضيحي",
      "comet": "يدور حول قطبه المقيس بالمعدل المقيس في 2014، وقد غيّرته الشمس بدقائق في كل مرور منذئذ؛ أما أي جانب يواجه الشمس في هذه اللحظة فليس تنبؤًا",
      "still": "مرسوم بوضع نموذجه الراداري ولا يدور هنا: فالنموذج لا يذكر في أي اتجاه يقع محور دورانه",
      "moonSpin": "يبقى وجهٌ واحد منه متجهًا إلى زحل ويدور حول القطب الذي تعطيه له ثوابت الاتحاد الفلكي الدولي دورةً واحدة في كل لفّة؛ أما أي جانب يواجه الكاميرا في هذه اللحظة فتحدده تلك الصيغة، وليس تنبؤًا",
      "moonStill": "يُرسم بالاتجاه الذي يظهر به نموذجه ولا يدور هنا: الثوابت التي يقرؤها هذا التطبيق لا تعطيه قطبًا ومعدل دوران ثابتين"
    },
    "objectSeen": {
      "lutetia": "غطّت صور Rosetta أكثر من نصف سطحه؛ والباقي من الشكل مُلائم لتغيرات سطوعه، وليس مصوَّرًا",
      "steins": "غطّت صور Rosetta نحو 60 في المئة من سطحه؛ والباقي من الشكل مُلائم لتغيرات سطوعه، وليس مصوَّرًا",
      "donj": "الشكل مبني من صور Lucy بالمساحة التصويرية المجسّمة وبمطابقة محيطه؛ والجانب الذي لم يره Lucy هو من المطابقة",
      "arrokoth": "تغطي صور New Horizons الجانب الذي مرّت بجانبه؛ والجانب الآخر مستنتج وليس مصوَّرًا، واللون هو خريطة ألبيدو بصبغة حمراء",
      "radar": "الشكل مبني من أصداء الرادار، وليس من صور: فمحيطه مقيس، أما أدق تفاصيله فلا",
      "comet": "الشكل هو شكل Rosetta، من أكثر من 20 000 صورة على مدى عامين، والسطح كله مغطى",
      "cassini": "الشكل مبني من صور Cassini، وعدم اليقين فيه عادةً أقل بكثير من نصف كيلومتر؛ وما لم تره Cassini منه فهو من التلاؤم وليس مصورًا"
    },
    "objectRelief": "النموذج مبسّط، والتضاريس الدقيقة عليه هي للنموذج الكامل نفسه، مدمجة في السطح",
    "worldFlat": "مرسوم كرة بسيطة: لا خريطة سطح لـ{name} هنا، ولونه الواحد مختار من أوصاف منشورة، وليس مقيسًا",
    "worldFlatIrregular": "مرسوم كرة بسيطة بحجم متوسط نصف قطره: لا خريطة سطح لـ{name} هنا، ولونه الواحد مختار من أوصاف منشورة، وليس مقيسًا، و{name} في الحقيقة صخرة متكتلة لا يُرسم شكلها الحقيقي",
    "worldFlatShaped": "مرسوم بشكله المقيس وبلون واحد: لا خريطة سطح لـ{name} هنا، واللون مختار من أوصاف منشورة، وليس مقيسًا",
    "worldShaped": "مرسوم بشكله المقيس",
    "worldMap": {
      "tinted": "سطحه فسيفساء بالأبيض والأسود، مصبوغة بلون مختار من أوصاف منشورة",
      "toned": "ألوانه من صور بالأشعة تحت الحمراء والخضراء وفوق البنفسجية، خُفّفت نحو ما تراه العين",
      "redblue": "ألوانه من صور New Horizons الحمراء والزرقاء، مع الأخضر مأخوذًا في منتصف الطريق بينهما، واللون مضاعف بمقدار النصف؛ أما الأجزاء المصوَّرة بالأبيض والأسود فقط فتُعطى متوسط ألوان الخريطة",
      "enhanced": "ألوانه هي التي نشرتها NASA، مركّبة من ثلاثة مرشحات لونية في New Horizons، وليس بينها الأخضر: وهذا لون معزَّز، أقوى مما تراه العين وليس مثله",
      "balanced": "ألوانه من صور برتقالية وخضراء وزرقاء، موازنة على لونه المنشور ومخففة نحو ما تراه العين",
      "infrared": "سطحه خريطة بالأشعة تحت الحمراء القريبة صُنعت عبر الضباب، مصبوغة ومنعَّمة؛ وفي الضوء المرئي يخفي الضباب الأرض",
      "natural": "ألوانه ألوان طبيعية، من الضوء الأحمر والأزرق الذي قاسته كاميرا New Horizons الملونة، مع الأخضر، الذي لم يكن لها مرشح له، مقدَّرًا بينهما، ومضاعفًا مرتين ونصفًا عن قوته في الكاميرا، كما تظهره صور NASA بالألوان الطبيعية",
      "matched": "تبدأ ألوانه من الضوء الأحمر والأزرق الذي قاسته كاميرا New Horizons الملونة، مع الأخضر، الذي لم يكن لها مرشح له، مقدَّرًا بينهما، ثم تُطابَق، درجةً درجة، مع صورة NASA الملونة لهذا الوجه (PIA19952): أقوى من ألوان الكاميرا، كما نشرتها NASA"
    },
    "worldCoverage": {
      "miranda": "صُوّر نصفه الجنوبي فقط، بواسطة Voyager 2 في 1986؛ وبقية السطح تُركت ملساء، دون تخمين",
      "ariel": "صُوّر نصفه الجنوبي فقط، بواسطة Voyager 2 في 1986؛ وبقية السطح تُركت ملساء، دون تخمين",
      "umbriel": "صُوّر نصفه الجنوبي فقط، بواسطة Voyager 2 في 1986؛ وبقية السطح تُركت ملساء، دون تخمين",
      "titania": "صُوّر نصفه الجنوبي فقط، بواسطة Voyager 2 في 1986؛ وبقية السطح تُركت ملساء، دون تخمين",
      "oberon": "صُوّر نصفه الجنوبي فقط، بواسطة Voyager 2 في 1986؛ وبقية السطح تُركت ملساء، دون تخمين",
      "triton": "صوّر Voyager 2 جزءًا منه في 1989؛ وبقية السطح تُركت ملساء، دون تخمين",
      "pluto": "كان أقصى الجنوب في ظلام الشتاء حين مرّ New Horizons في 2015: والأرض المرسومة هناك منمذجة، نسيج خافت بألوان الأرض فوقها، وليست صورة فوتوغرافية",
      "charon": "كان أقصى الجنوب في ظلام الشتاء حين مرّ New Horizons في 2015: والأرض المرسومة هناك منمذجة، نسيج خافت بألوان الأرض فوقها، وليست صورة فوتوغرافية"
    },
    "worldLit": "مضاء كما تُظهره كاميرا ضُبط تعريضها على ضوء شمسه",
    "worldLight": "يُرى من بعيد ضوءًا بسطوعه المحسوب: والوهج هو الطريقة التي تسجّل بها الكاميرا نقطة أسطع من أن تُحلَّل",
    "exoticDeparture": {
      "pulseSlowed": "يُرسم وميضه أبطأ {n} مرة من دورانه، لتتمكن العين من متابعته",
      "pulseTrue": "يُرسم وميضه بمعدل دورانه",
      "portrait": "ما دامت هذه البطاقة مفتوحة يُرسم نموذج له في مكانه، أكبر بكثير مما سيبدو من هنا: الظل والضوء المنحني حوله بقدر ما تصنعه كتلته، والقرص منمذج"
    },
    "worldDeparture": {
      "earth": "على شاشة أكبر تؤخذ جباله من ارتفاعات ETOPO 2022 لدى NOAA، وتُرسم أشد انحدارًا {relief} مرة مما هي لتُظهرها شمس منخفضة؛ ووهج الهواء حول حافته يُرسم أعلى {air} مرة من الهواء؛ ومن مدار منخفض على شاشة أكبر تقف غيومه نحو الأفق وتحت شمس منخفضة، مرسومة أسمك {clouds} مرة مما هي لتُرى ميلتها وظلالها الطويلة وآخر ضوء على قممها (وبسُمكها الحقيقي في المظهر المقيس)، وارتفاع كل قمة من درجة حرارتها المقيسة حيث تغطي صورة اليوم، ومن سطوع خريطة الغيوم في غير ذلك",
      "mercury": "على شاشة أكبر تؤخذ تضاريسه من نموذج الارتفاعات لدى MESSENGER، وتُرسم أشد انحدارًا {steep} مرة مما قيس لتلتقط حواف الفوهات الضوء",
      "pluto": "يُرسم أرضه الفاتحة والداكنة بتباين يساوي {plutoContrast} مرة تباين صورة الكاميرا، أقرب إلى الألبيدو المقيسة؛ والجانب الذي لم يره New Horizons إلا من بعيد مُنعّم إلى حدّته؛ وعلى شاشة أكبر تؤخذ تضاريسه من ارتفاعات New Horizons المجسّمة حيث وُجدت، وتُرسم أشد انحدارًا {plutoSteep} مرة مما قيس؛ والضباب الأزرق الرقيق عند حافته يُرسم وهجًا، أسطع ما يكون في مقابل الشمس، وشدته مختارة",
      "mars": "على شاشة أكبر تؤخذ تضاريسه من ارتفاعات قاسها مقياس الارتفاع الليزري في Mars Global Surveyor، وتُرسم أشد انحدارًا وأعلى {mola} مرة مما هي لتُظهرها شمس منخفضة: فالظلال التي يلقيها أوليمبوس مونس وجدران الأودية أطول بذلك العدد من المرات.",
      "venus": "الوهج حول حافته وما وراء جانبه النهاري يمثل ضبابًا عميقًا؛ وسُمكه المرسوم ومداه توضيحيان؛ وفي المظهر السينمائي تُرسم أحزمة غيومه بتباين يساوي {uv} مرة تباين خريطته، كما تراها الكاميرات فوق البنفسجية (وهي للعين شبه ملساء)، أما المظهر المقيس فيعرض الخريطة كما هي؛ وأرضه، بالرادار، بتضاريس من مقياس ارتفاع Magellan، مرسومة أشد انحدارًا وارتفاعًا {ground} مرة مما قيس",
      "neptune": "في المظهر السينمائي تُرسم الأقواس الخمسة لحلقته الخارجية كما رآها Voyager 2 في 1989، تدور بسرعتها المقيسة؛ أما مواضعها حول الحلقة اليوم فلا تُحسب، وقد خبت اثنان منها أو تحركا منذئذ",
      "saturn": "تُرسم أحزمته بتباين يساوي {contrast} مرة تباين خريطته، وهذا تعديل منا؛ أما «كما رآه Hubble» فلا تعديل فيه؛ وعلى شاشة أكبر ومن قرب تكون حلقاته الصغيرة وفجواتها حيث قاسها Cassini عبر ضوء نجم في 2008، موضوعة فوق الخريطة، وفي المظهر السينمائي يُرسم بريق الحبيبات من أقرب؛ وعلى بعد بضعة كيلومترات من الحلقات على شاشة أكبر، في المظهر السينمائي، تُرسم أكبر جسيماتها، بعرض من مترين إلى خمسة أمتار، كرات من الجليد: عددها وحجمها يتبعان توزيع الأحجام المقيس والعمق البصري للحلقات، أما مكان كل جسيم والتكتلات في الحلقة A فتوضيحية، وتُرسم ساكنة، كأنك ترافقها",
      "titan": "فوق ضبابه مباشرة، على ارتفاع نحو 500 كم، تُرسم طبقة رقيقة منفصلة من الضباب حيث رآها Cassini في 2005 إلى 2007؛ وقد هبطت وخبت في السنوات التي تلت، ولا يُعرف أين هي الآن"
    },
    "worldEarthshine": "يتوهج جانبه المظلم بضوء الأرض المنعكس، ضوء الأرض نفسه، ويُرسم أسطع {n} مرة مما تلتقطه تلك الكاميرا، نحو ما تراه العين",
    "worldAir": "يُرسم هواؤه أسمك {n} مرة مما هو ليظهر بهذا الحجم، ولون ضبابه توضيحي",
    "worldAirTrue": "يُرسم ضبابه بارتفاعه المقيس، ولونه توضيحي",
    "worldRings": "حلقاته عند أبعادها المقيسة، مرسومة أعرض {w} مرة وأسطع بكثير مما هي لتظهر: فالحقيقية خيوط داكنة كالفحم",
    "worldRingsDense": "حلقاته عند أبعادها المقيسة، مرسومة أعرض {w} مرة وأكثر عتمة {d} مرة وأسطع بكثير مما هي لتظهر: فالحقيقية خيوط خافتة داكنة كالفحم",
    "worldSun": "من قرب، تغمق حافته وتحمرّ كما يقول نموذج لغلافه الجوي أنها ينبغي؛ والحبيبات تمثل سطحه الغالي: خلاياه تولد وتسطع وتخبو كما تفعل الحبيبات الحقيقية، لكنها مرسومة أخشن مما هي (وبحجمها الحقيقي من قرب شديد) وأسرع بكثير، والشبكة الساطعة نحو الحافة توضيحية؛ ومن قرب شديد تفسح الخريطة المصوّرة المجال لذلك السطح المرسوم، وهو توضيحي أيضًا؛ والإكليل توضيحي، ومرسوم أسطع بكثير مما هو ليُرى؛ والحلقات والأسيجة على حافته تقع حيث المناطق النشطة لدى NOAA قرب الطرف، وأشكالها وارتفاعاتها توضيحية؛ والنجوم بجانبه باهتة، لأن وهجه يحجبها عن أي كاميرا",
    "worldMosaic": "تحت الكاميرا الآن: {title}، مرسوم هنا بدقة نحو {res} للبكسل.",
    "worldMosaicDetail": "تحت الكاميرا الآن: {title}، يُحدّد خريطة الألوان بدقة نحو {res} للبكسل.",
    "worldRelief": "تضاريسه من {title}: رسم للمنحدرات تحت ضوء ثابت واحد. والمنحدرات في اتجاه ذلك الضوء يضيئها من جديد موضع الشمس الآن، أشد انحدارًا {n} مرة مما قيس؛ أما المنحدرات المتعامدة معه فلا تُرسم.",
    "worldReliefTrue": "تضاريسه من {title}: رسم للمنحدرات تحت ضوء ثابت واحد. والمنحدرات في اتجاه ذلك الضوء يضيئها من جديد موضع الشمس الآن؛ أما المنحدرات المتعامدة معه فلا تُرسم.",
    "worldReliefBaked": "تلاله مظلّلة في هذه الخريطة تحت ضوء ثابت، وليس بالشمس حيث هي الآن.",
    "mount": "المكان الذي نعلّقه فيه على النموذج ترتيب من عندنا، ويُرسم أكبر بكثير مما هو — وبحجمه الحقيقي سيكون أصغر من أن يُرى"
  },
  "trip": {
    "notEnoughStops": "لا يمكن الآن العثور إلا على {count} من محطات هذه الرحلة، وهي تحتاج إلى {min}.",
    "heldBody": "لم نستطع العثور على هذه المحطة الآن. وكل ما عداها في الرحلة ما زال يعمل.",
    "heldTitle": "لم نستطع العثور على هذه المحطة",
    "stopOf": "المحطة {n} من {count}",
    "planning": "نحسب ما يمكن عرضه…",
    "shape": "محطات: {count} · {mins} د",
    "shapeOneMinute": "محطات: {count} · 1 د",
    "startTitle": "ابدأ هذه الرحلة",
    "nextEventLine": "التالي: {date}",
    "introStart": "ابدأ",
    "introSkip": "ليس الآن",
    "introMicro": "رحلة موجّهة",
    "stopsLabel": "المحطات",
    "startAtTitle": "ابدأ الرحلة من المحطة {n}",
    "droppedOne": "محطة واحدة لا يمكن عرضها اليوم ولا تُحسب أعلاه.",
    "droppedMany": "محطات لا يمكن عرضها اليوم ولا تُحسب أعلاه: {n}.",
    "clockClamped": "أُعيد الوقت إلى سرعته العادية في هذه الرحلة.",
    "clockMoves": "هذه الرحلة تحرّك الساعة. وتُعاد إلى ما كانت عليه حين تغادر.",
    "clockRestored": "مغادرتك تعيد الساعة إلى حيث كانت.",
    "stopTimeNow": "معروض الآن",
    "stopTimeAt": "معروض عند {when}",
    "stopTimeRate": "معروض عند {when}، يجري {rate}",
    "stopTimePaused": "معروض عند {when}، متوقف ما دامت الرحلة متوقفة",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "الظل محسوب من موضعي القمر والشمس؛ والتوقيت من Astronomy Engine، بدقة نحو دقيقة. الخطان الرفيعان والشريط الباهت يعلّمان حافتي الظل ومسار قلبه: خطوط على الخريطة، وليست ضوءًا.",
    "eclipseLineLatched": "لا يُرسم الظل على هذا الجهاز؛ والتوقيت صحيح.",
    "eclipseColour": "اللون توضيحي؛ والظل محسوب.",
    "orbitsLine": "الكواكب مرسومة أكبر مما هي، نقاطًا؛ ومواضعها ومساراتها محسوبة.",
    "moonPathLine": "الأرض والقمر مرسومان أكبر مما هما، نقطتين، كلٌّ منهما مضاء على الجانب المواجه للشمس. وموضع القمر ومساره محسوبان.",
    "systemLine": "الأحجام والمدارات من NASA Exoplanet Archive؛ والألوان وميل المدارات توضيحية.",
    "systemLineGuessed": "الأحجام والمدارات من NASA Exoplanet Archive؛ والألوان، ومواضع الكواكب على مداراتها وميل المدارات توضيحية.",
    "systemPhaseUnknown": "، ومواضع الكواكب على مداراتها",
    "rateWords": {
      "10": "أسرع من الواقع بعشر مرات",
      "60": "دقيقة في كل ثانية",
      "600": "عشر دقائق في كل ثانية",
      "3600": "ساعة في كل ثانية",
      "36000": "عشر ساعات في كل ثانية",
      "525600": "يوم كل سدس ثانية"
    },
    "rateGeneric": "أسرع من الواقع بـ{n} مرة",
    "yourPlace": "مكانك",
    "observerSet": "مكانك: {place}، حدّدته أنت.",
    "observerDevice": "مكانك: قرب ما يقوله جهازك.",
    "observerGuess": "مكانك تخمين من المنطقة الزمنية لساعتك: {place}. حدّده من «مكانك» للحصول على أفضل.",
    "needsPlace": "يحتاج إلى مكان. حدّد مكانك أولًا.",
    "stationFromYou": "المحطة الآن على بعد {km} كم منك.",
    "drawnAtClassSize": "يُرسم النموذج بعرض {px} بكسل مهما كانت المسافة؛ أما المحطة الحقيقية فنقطة ساطعة.",
    "passNight": "في هذا المرور تكون مضاءة بالشمس في سماء مظلمة: يمكنك رؤيتها، إن سمح الطقس.",
    "passDay": "لن ترى هذا المرور: سماؤك أفتح من أن يُرى فيها، أو المحطة في ظل الأرض.",
    "lookMoonUp": "القمر مضاء بنسبة {pct}%، {alt} نحو {az}.",
    "lookMoonDown": "القمر تحت أفقك في هذه الساعة. يطلع في {time}.",
    "lookMoonDownNoRise": "القمر تحت أفقك في هذه الساعة.",
    "lookWorldUp": "{name} {alt} نحو {az}.",
    "lookWorldDown": "{name} تحت أفقك في هذه الساعة.",
    "lookPlanet": "ألمع كوكب فوق الأفق في هذه الساعة هو {name}: {alt} نحو {az}.",
    "lookNoPlanet": "لا كوكب تستطيع رؤيته بالعين المجردة فوق الأفق في هذه الساعة. يتجه المنظر إلى حيث سيمرّون.",
    "lookStar": "ألمع نجم فوق الأفق في هذه الساعة هو {name}: {alt} نحو {az}.",
    "lookFigure": "الأفضل موضعًا في هذه الساعة: {name}، {alt} نحو {az}.",
    "lookNoFigure": "لا شيء من الأشكال المعروفة في موضع جيد في هذه الساعة.",
    "lookNoPass": "لم نجد في الأسبوع القادم أي مرور للمحطة فوق مكانك.",
    "lookDaylight": "سماؤك ليست مظلمة في هذه الساعة، فلا شيء يُنتقى بعد.",
    "lookMilkyWay": "يتجه المنظر إلى درب التبانة حيث يمر عبر {name}، {alt} نحو {az}. السماوات الثلاث نموذج لليلة صافية عادية.",
    "lookNoMilkyWay": "درب التبانة منخفض عند أفقك في هذه الساعة، فيتجه المنظر إلى أعلى السماء بدلًا منه.",
    "lookShower": "الزخة القادمة هي {name}، وتكون في أفضل حالاتها نحو {date}.",
    "lookShowerUp": "مصدرها (الراديانت) {alt} نحو {az} في هذه الساعة.",
    "lookShowerDown": "مصدرها تحت أفقك في هذه الساعة؛ ويتجه المنظر إلى حيث سيطلع.",
    "lookShowerRate": "في الذروة، من مكان مظلم ومصدرها مرتفع: نحو {rate} شهاب في الساعة.",
    "lookShowerMoon": {
      "dark": "القمر مضاء بنسبة {pct}% في تلك الليلة، فتبقى السماء مظلمة.",
      "some": "القمر مضاء بنسبة {pct}% في تلك الليلة وسيخفي بعض الشهب الخافتة.",
      "bright": "القمر مضاء بنسبة {pct}% في تلك الليلة وسيخفي كل الشهب إلا الساطعة."
    },
    "approachNext": "التالي في جدول NASA JPL: {name}، في {date}، على بعد {ld} أضعاف مسافة القمر.",
    "approachNextFar": "التالي في جدول NASA JPL: {name}، في {date}.",
    "approachNone": "لم يُحمَّل جدول NASA JPL للمرورات القريبة، فلا يُسمّى أي مرور تالٍ.",
    "satellitesCount": "الأقمار الاصطناعية العاملة في الفهرس الذي حمّلته هذه الصفحة من CelesTrak: {n}، منها {starlink} من Starlink.",
    "satellitesLoading": "ما زال الفهرس يُحمَّل؛ ويظهر العدد حين يكتمل.",
    "portraitLine": "نموذج، وليس صورة فوتوغرافية: فالظل وحلقة الضوء المنحني حوله بقدر ما تصنعه كتلته، والقرص المتوهج منمذج، والنجوم خلفه غير منحنية. وهو مرسوم أكبر بكثير مما سيبدو من هنا؛ أما مكانه فمقيس. وصورة Event Horizon Telescope الفوتوغرافية على بطاقته: {credit} · {licence}.",
    "tonightUp": "من {place} الليلة: فوق الأفق من {begin} إلى {end}، وأعلى ما يكون عند {time}، {alt} نحو {az}.",
    "tonightGlare": "من {place} الليلة: {name} قريب جدًا من الشمس فلا يُرى.",
    "tonightDown": "من {place} الليلة: {name} ليس فوق الأفق ما دامت السماء مظلمة.",
    "frameLabel": "رحلة موجّهة",
    "stopRole": "محطة",
    "liveLabel": "المحطة {n} من {count}: {title}",
    "stopMicro": "المحطة {n} من {count}",
    "progressShort": "{n} / {count}",
    "pause": "إيقاف مؤقت",
    "pauseTitle": "إيقاف مؤقت (Space)",
    "play": "تشغيل",
    "resume": "تابع",
    "resumeTitle": "عُد إلى المحطة وتابع (Space)",
    "back": "المحطة السابقة",
    "backTitle": "المحطة السابقة (←)",
    "next": "المحطة التالية",
    "nextTitle": "المحطة التالية (→)",
    "replay": "أعد",
    "replayTitle": "كرّر هذه الحركة (R)",
    "share": "مشاركة",
    "shareTitle": "شارك رابط هذه المحطة",
    "collapse": "أخفِ البطاقة",
    "collapseTitle": "أخفِ البطاقة وشاهد (C)",
    "expand": "أظهر البطاقة",
    "expandTitle": "أعد البطاقة (C)",
    "soundOn": "الصوت",
    "volume": "مستوى الصوت",
    "volumeTitle": "مستوى صوت الموسيقى والأصوات والراوي",
    "volumeValue": "{pct} في المئة",
    "voiceWill": "سيقرأ صوتٌ هذا. وهو صوت اصطناعي.",
    "voiceCan": "يمكن لصوت اصطناعي أن يقرأ هذا: اضغط «القراءة».",
    "soundOnTitle": "الموسيقى والأصوات تعمل: أوقفها (M)",
    "soundOffTitle": "الموسيقى والأصوات متوقفة: شغّلها (M)",
    "voice": "القراءة",
    "voiceOnTitle": "صوت اصطناعي يقرأ كل محطة: أوقفه وأبقِ الموسيقى (V)",
    "voiceOffTitle": "دع صوتًا اصطناعيًا يقرأ كل محطة بصوت عالٍ (V)",
    "present": "عرض",
    "presentTitle": "اعرض هذه الرحلة على قاعة: كلمات كبيرة، بلا لوحات، وأنت تضغط «التالي»",
    "presentOffTitle": "غادر وضع العرض وأعد اللوحات",
    "presentAuto": "تشغيل تلقائي",
    "presentAutoOffTitle": "كل محطة تنتظر «التالي»: دع الرحلة تتقدم وحدها (A)",
    "presentAutoOnTitle": "الرحلة تتقدم وحدها: اجعل كل محطة تنتظر «التالي» (A)",
    "fullScreen": "ملء الشاشة",
    "fullScreenTitle": "املأ الشاشة كلها (F)",
    "fullScreenOffTitle": "غادر ملء الشاشة (F)",
    "leave": "غادر",
    "leaveTitle": "غادر الرحلة. تبقى الكاميرا حيث هي تمامًا. (Escape)",
    "leaveTitleStage": "غادر الرحلة. تعود الخريطة إلى العالم الذي كانت متمركزة عليه من قبل، مما يحرك الكاميرا. (Escape)",
    "progressLabel": "كم قطعت من الرحلة",
    "controlsLabel": "أزرار الرحلة",
    "pausedChip": "الرحلة متوقفة مؤقتًا",
    "endMicro": "نهاية الرحلة",
    "endBody": "تبقى الكاميرا حيث هي. لا شيء هنا يعود إلى الوراء.",
    "endBodyStage": "«واصل التحليق» يبقيك هنا. «العودة» تعيد الخريطة إلى العالم الذي كانت متمركزة عليه قبل الرحلة.",
    "endExplore": "واصل التحليق",
    "endExploreTitle": "احتفظ بهذا العرض وتابع بنفسك",
    "endStayTitleStage": "ابقَ هنا بعيدًا وحلّق من حيث انتهت الرحلة",
    "endHome": "العودة",
    "endExploreTitleStage": "تابع بنفسك، على الخريطة التي بدأت منها",
    "endSend": "أرسل صورة",
    "endSendTitle": "اصنع بطاقة بريدية من المكان الذي انتهت عنده الرحلة، مع كلماتها ورابط",
    "endReplay": "شاهد مجددًا",
    "endReplayTitle": "شاهد هذه الرحلة مجددًا من البداية",
    "endShareTitle": "شارك رابط هذه الرحلة",
    "endNextMicro": "الرحلة التالية",
    "endNext": "التالي: {title}",
    "docTitle": "Space Radar — {title} — المحطة {n} من {count}"
  },
  "sky": {
    "radiant": "مصدر {name}",
    "bodies": {
      "sun": "الشمس",
      "moon": "القمر",
      "mercury": "عطارد",
      "venus": "الزهرة",
      "mars": "المريخ",
      "jupiter": "المشتري",
      "saturn": "زحل",
      "uranus": "أورانوس",
      "neptune": "نبتون"
    },
    "fov": {
      "degrees": "مجال {deg}° · {name}",
      "arcmin": "مجال {min}′ · {name}",
      "names": {
        "eye": "العين",
        "binoculars": "المنظار",
        "telescope": "التلسكوب"
      }
    },
    "lines": {
      "sunPath": "مسار الشمس",
      "equator": "خط استواء السماء",
      "poleNorth": "القطب الشمالي للسماء",
      "poleSouth": "القطب الجنوبي للسماء"
    },
    "what": {
      "star": "نجم",
      "starMag": "نجم · القدر {mag}",
      "planet": "كوكب · القدر {mag}",
      "sun": "نجمنا",
      "moon": "قمر الأرض",
      "dso": "الفضاء العميق",
      "dsoMag": "{kind} · القدر {mag}",
      "open": "{name}، {sub}. افتح بطاقته.",
      "plain": "{name}، {sub}.",
      "openTitle": "افتح بطاقته"
    },
    "compassShort": [
      "ش",
      "ش ش ق",
      "ش ق",
      "ق ش ق",
      "ق",
      "ق ج ق",
      "ج ق",
      "ج ج ق",
      "ج",
      "ج ج غ",
      "ج غ",
      "غ ج غ",
      "غ",
      "غ ش غ",
      "ش غ",
      "ش ش غ"
    ],
    "lookLine": "انظر نحو {dir}، {fists}، عند {time}. يتحرك نحو {mins} دقيقة.",
    "lookLineNoDuration": "انظر نحو {dir}، {fists}، عند {time}.",
    "sunlit": "ما زال يلتقط ضوء الشمس، وهذا ما يجعله مرئيًا.",
    "notSunlit": "هو في ظل الأرض في هذا المرور، فلن تراه.",
    "fistsHorizon": "فوق الأفق مباشرة",
    "fistsOverhead": "تقريبًا فوق رأسك مباشرة",
    "fistsOne": "نحو قبضة واحدة فوق الأفق",
    "fistsMany": "نحو {n} قبضات فوق الأفق",
    "noObserver": "حدّد مكانك وسيخبرك هذا السطر أين تنظر.",
    "noPass": "لا يظهر فوق أفقك في الساعات الأربع والعشرين القادمة.",
    "notVisibleFromGround": "هذا بعيد جدًا بحيث لا يُرى بالعين المجردة.",
    "leftGround": "غادر الأرض ليحلّق هناك. أما الليلة فللسماء.",
    "nakedEye": "ساطع بما يكفي لتراه بعينيك من مكان مظلم.",
    "needsTelescope": "خافت على العين؛ يُظهره تلسكوب، أو صورة بتعريض طويل.",
    "starOnly": "لا يُرى إلا نجمه، وبالتلسكوب فقط؛ أما الكوكب نفسه فخافت جدًا.",
    "onTheGround": "هذا واقف على الأرض، فلا شيء تنظر إليه في الأعلى.",
    "storm": "من الأرض هي الطقس نفسه. ومن المدار هي دوامة سحب بعرض مئات الكيلومترات.",
    "onAnotherWorld": "هذا واقف على {world}. لن تلتقطه بالعين من هنا، مهما صفت الليلة.",
    "worldRise": "من مكانك يطلع في {time}.",
    "worldHere": "مكانك",
    "worldFrom": {
      "down": "من {place}: يطلع {rise} نحو {riseDir}، وأعلى ما يكون {highTime}، {highAlt}؛ ويغرب {set} نحو {setDir}.",
      "downNoSet": "من {place}: يطلع {rise} نحو {riseDir}، وأعلى ما يكون {highTime}، {highAlt}.",
      "up": "من {place}: فوق الأفق الآن، {alt}، نحو {dir}. وأعلى ما يكون {highTime}، {highAlt}؛ ويغرب {set} نحو {setDir}.",
      "upPast": "من {place}: فوق الأفق الآن، {alt}، نحو {dir}. تجاوز أعلى نقطة له؛ ويغرب {set} نحو {setDir}.",
      "never": "من {place} لا يطلع خلال اليوم ونصف اليوم القادمين.",
      "always": "من {place}: فوق الأفق الآن، {alt}، نحو {dir}. لا يغرب اليوم.",
      "honest": "محسوب لأفق عند مستوى سطح البحر؛ والتلال والبيوت ليست فيه."
    },
    "worldNoRise": "تستطيع رؤية هذا بعينيك. أما حساب وقت طلوعه من مكانك فليس في هذا الإصدار بعد.",
    "worldSee": {
      "pluto": "لا بالعين المجردة ولا بالمنظار: بلوتو أخفت بنحو 3 000 مرة من أخفت نجم تراه، فيحتاج إلى تلسكوب.",
      "io": "يُظهره منظار عادي نقطة ضوء بجانب المشتري؛ وبالعين يضيع في وهج المشتري.",
      "europa": "يُظهره منظار عادي نقطة ضوء بجانب المشتري؛ وبالعين يضيع في وهج المشتري.",
      "ganymede": "يُظهره منظار عادي نقطة ضوء بجانب المشتري؛ وبالعين يضيع في وهج المشتري.",
      "callisto": "يُظهره منظار عادي نقطة ضوء بجانب المشتري؛ وبالعين يضيع في وهج المشتري.",
      "titan": "لا بالعين المجردة: قدر تيتان 8.2 في أسطع حالاته، فيحتاج إلى تلسكوب صغير أو منظار قوي، ووهج زحل بجانبه يجعل حتى ذلك صعبًا.",
      "enceladus": "لا بالعين المجردة: قدر إنسيلادوس 11.7، وهو قريب جدًا من زحل الساطع وحلقاته حتى إن رؤيته صعبة حتى بتلسكوب صغير.",
      "triton": "لا بالعين المجردة ولا بالمنظار: قدر تريتون 13.5، أخفت بنحو 600 مرة من أخفت نجم تراه، فيحتاج إلى تلسكوب.",
      "charon": "بالكاد: قدر شارون 16.8، أخفت بـ13 000 مرة من أخفت نجم تراه، وقريب جدًا من بلوتو حتى إن الهواة فصلوا الزوج عام 2008 بتصويرهما عبر تلسكوب قطره 14 بوصة.",
      "phobos": "لا بالعين المجردة: قدر فوبوس 11.3 في أفضل حالاته، وهو ملتصق بالمريخ الذي يغرقه وهجه؛ وقد اكتُشف عام 1877 بتلسكوب قطره 26 بوصة.",
      "deimos": "لا بالعين المجردة: قدر ديموس 12.4 في أفضل حالاته، وهو قريب من المريخ الذي يغرقه وهجه؛ وقد اكتُشف عام 1877 بتلسكوب قطره 26 بوصة.",
      "neptune": "لا بالعين المجردة: قدر نبتون من 7.7 إلى 7.9، أخفت من أن يُرى دون عون. يُظهره منظار قوي أو تلسكوب قرصًا أزرق صغيرًا.",
      "mimas": "لا بالعين المجردة: قدر ميماس 12.9 وهو ملتصق بزحل، فيحتاج إلى تلسكوب كبير وليلة هادئة.",
      "tethys": "لا بالعين المجردة: قدر تيثيس 10.2، في متناول تلسكوب صغير، وإن كان وهج زحل بجانبه يجعله صعبًا.",
      "dione": "لا بالعين المجردة: قدر ديون 10.4، في متناول تلسكوب صغير، وإن كان وهج زحل بجانبه يجعله صعبًا.",
      "rhea": "لا بالعين المجردة: قدر ريا 10، وهو ألمع أقمار زحل بعد تيتان، ويُظهره تلسكوب صغير.",
      "iapetus": "لا بالعين المجردة: يتراوح قدر يابيتوس من 10.2 إلى 11.9 بينما يتناوب جانبه الساطع وجانبه الداكن مواجهتنا، فيلتقطه تلسكوب صغير في أفضل حالاته.",
      "miranda": "بالكاد: قدر ميراندا 16.6، ضائع في وهج أورانوس، وغير مرئي في كثير من تلسكوبات الهواة.",
      "ariel": "لا بالعين المجردة ولا بالمنظار: قدر أرييل 14.8، خافت نحو بلوتو عند أقرب اقتراب له، فيحتاج إلى تلسكوب جيد وسماء مظلمة.",
      "umbriel": "لا بالعين المجردة ولا بالمنظار: قدر أمبرييل 15.1، أخفت أقمار أورانوس الأربعة الكبيرة، فيحتاج إلى تلسكوب جيد وسماء مظلمة.",
      "titania": "لا بالعين المجردة: قدر تيتانيا 13.9، وهو ألمع أقمار أورانوس، ومع ذلك يحتاج إلى تلسكوب بحجم ما.",
      "oberon": "لا بالعين المجردة: قدر أوبرون 14.1، وهو أبعد الخمسة عن أورانوس، فيحتاج إلى تلسكوب وليلة هادئة."
    },
    "couldNotLook": "تعذر حساب مرور من هنا.",
    "nowhereToLook": "لا أحد يعرف أين هذا، فلا مكان تنظر إليه."
  },
  "controls": {
    "title": "الأدوات",
    "layersTitle": "ما يُعرض",
    "layerCount": "{n}",
    "layerCountLoading": "نعدّ",
    "layerHint": {
      "exoplanets": "مُطفأة. ضع علامة لتظهر."
    },
    "layerCountEmpty": "فارغة",
    "layerCountEmptyTitle": "عادت هذه الطبقة بلا شيء: تعذرت قراءة مصدرها، أو لا شيء فيه الآن.",
    "layerWaits": "ليس بعد",
    "layerWaitsTitle": "تُحمَّل حين تشغّلها، لتوفير البيانات.",
    "layersFailed": "طبقات عادت فارغة: {n}.",
    "layersFailedOne": "طبقة واحدة عادت فارغة.",
    "layersFailedWhy": "انظر المصادر",
    "layerCountParts": {
      "onMap": "{n} على الخريطة",
      "riding": "{n} محمول على غيره",
      "unplaceable": "{n} لا نستطيع تحديد مكانه",
      "auroraPeak": "حتى {n} % محتمل",
      "lightningPerMin": "{n} ضربة في الدقيقة"
    },
    "layersEmpty": "لم تُحمَّل أي طبقة بعد.",
    "groups": {
      "around-earth": "حول الأرض",
      "earth": "الطقس والأرض",
      "solar-system": "النظام الشمسي",
      "beyond": "النجوم وما بعدها"
    },
    "groupCount": "{on} من {n}",
    "groupAll": "الكل",
    "groupNone": "لا شيء",
    "groupAllLabel": "أظهر كل طبقة في {group}",
    "groupNoneLabel": "أخفِ كل طبقة في {group}",
    "layerFilter": "ابحث عن طبقة",
    "layersKeys": "الطبقات. السهمان لأعلى ولأسفل للتنقل؛ والمسافة لتبديل واحدة.",
    "layerFilterEmpty": "لا طبقة بهذا الاسم.",
    "keysRow": "المفاتيح",
    "keysRowTouch": "الإيماءات",
    "keysRowTitle": "أظهر المفاتيح التي تحرك العرض",
    "keysRowTitleTouch": "أظهر الإيماءات التي تحرك العرض",
    "swatchMixed": "مرسوم بألوانه الخاصة",
    "keyedNote": "نقاط ملونة بحسب {key}: المفتاح أدناه.",
    "localTimeFallback": "محلي",
    "locationPlaceholder": "اكتب اسم مدينة",
    "locationSearchLabel": "ابحث عن مدينة",
    "locationUseMine": "استخدم موقعي",
    "locationUseMineTitle": "اسأل المتصفح أين أنت",
    "locationInsecure": "لا يشارك المتصفح موقعك إلا مع الصفحات المقدَّمة عبر https. وهذه الصفحة على http عادي، فالزر معطَّل. اختر مدينة بدلًا من ذلك، أو افتح عنوان https متى وُجد.",
    "locationUnsupported": "لا خدمة موقع في هذا المتصفح. اختر مدينة بدلًا من ذلك.",
    "locationDenied": "رفض المتصفح. اختر مدينة بدلًا من ذلك.",
    "locationFailed": "لم يستطع المتصفح تحديد مكانك. اختر مدينة بدلًا من ذلك.",
    "locationAsking": "نسأل المتصفح",
    "locationClear": "امسح",
    "locationNoMatch": "لا مدينة في القائمة المرفقة تطابق ذلك.",
    "tonightCouldNotLook": "تعذر الفحص: لم تُحمَّل أي أقمار اصطناعية."
  },
  "search": {
    "title": "ابحث عن جرم",
    "placeholder": "ابحث عن كواكب ونجوم وأقمار اصطناعية",
    "placeholderPhone": "ابحث في الفضاء",
    "inputLabel": "ابحث عن جرم بالاسم أو برقم الفهرس",
    "listLabel": "الأجرام المطابقة",
    "fly": "طِر إليه",
    "flyTitle": "انقل الكاميرا إلى الجرم المحدد وافتح بطاقته",
    "hint": "يكفي حرفان. يختار Enter أول نتيجة.",
    "noMatch": "لا شيء اسمه «{q}» هنا.",
    "closest": "أقرب الأسماء",
    "more": "نتائج مطابقة أخرى: {n}. اكتب أكثر لتضيّق البحث.",
    "searching": "الأجرام المبحوث فيها: {n}.",
    "searchingOne": "بُحث في جرم واحد.",
    "searchingBut": "الأجرام المبحوث فيها: {n}؛ الطبقات التي لم تُحمَّل بعد: {m}.",
    "searchingButOne": "الأجرام المبحوث فيها: {n}؛ طبقة واحدة لم تُحمَّل بعد.",
    "empty": "لم يُحمَّل شيء بعد للبحث فيه.",
    "inputTitle": "بحث (/)",
    "key": "/",
    "notLoaded": "لم تُحمَّل، فلم يُبحث فيها: {layers}.",
    "stillLoading": "ما زالت تُحمَّل، فلم يُبحث فيها بعد: {layers}.",
    "loadsWhenOn": "تُحمَّل حين تشغّلها فقط، لتوفير البيانات، فلم يُبحث فيها بعد: {layers}.",
    "couldNotRead": "تعذرت قراءتها، فلم يُبحث فيها: {layers}.",
    "fallback": "لا شيء يبدأ بذلك. هذه تحتويه.",
    "switchedOn": "شُغِّلت: {layer}.",
    "belowHorizon": "{name} تحت الأفق.",
    "notLoadedCount": "لا يمكن معرفة عدد الأجرام التي يُغفلها ذلك حتى تُحمَّل."
  },
  "quality": {
    "dataSaver": "موفّر البيانات يعمل: القائمتان الأكبر تنتظران.",
    "lowered": "إطارات بطيئة ({ms} مللي ث): صورة أبسط.",
    "tierPhone": "خرائط السطح بدقة 2k، بحجم مناسب للهاتف.",
    "tierSaver": "خرائط السطح بدقة 2k، لتوفير البيانات.",
    "tierSmall": "خرائط السطح بدقة 2k، بحجم مناسب لهذا الجهاز.",
    "tierLatched": "عادت خرائط السطح إلى 2k: كانت الإطارات بطيئة.",
    "tierLow": "خرائط السطح بدقة 2k، كما تطلب «منخفضة».",
    "tier1": "خرائط السطح بدقة 4k، تُجلب عند الخمول.",
    "tier2": "خرائط السطح بدقة 4k، مع إبقاء عوالم أكثر حادة.",
    "promoted": "ارتفعت درجة بعد إطارات سريعة.",
    "mapsWorn": "الخرائط على هذا الجهاز: {credits}.",
    "panelTitle": "الجودة",
    "choices": {
      "auto": "تلقائية",
      "low": "منخفضة",
      "medium": "متوسطة",
      "high": "عالية",
      "ultra": "فائقة"
    },
    "autoNow": "تلقائية: {tier}",
    "titles": {
      "auto": "تُختار بحسب هذا الجهاز ومعدل إطاراته",
      "low": "أخف صورة: للبطارية أو لحاسوب قديم",
      "medium": "خرائط وتضاريس وطقس أحدّ",
      "high": "عوالم أكثر تبقى حادة في وقت واحد",
      "ultra": "الدقة الكاملة وأدق الدرجات من قرب"
    },
    "fellBack": "كانت الإطارات بطيئة: عادت الجودة إلى «تلقائية»."
  },
  "status": {
    "title": "المصادر",
    "intro": "كل مصدر يقرأ منه، وعمر تلك القراءة، ومن أين تأتي. لا شيء هنا مخبأ في تذييل.",
    "stateOk": "سليم",
    "stateStale": "متقادم",
    "stateUnknown": "تعذرت القراءة",
    "stateOkTitle": "قُرئ حديثًا وضمن مدة حداثته.",
    "stateStaleTitle": "لدينا نسخة، لكنها أقدم مما يعد به هذا المصدر.",
    "stateUnknownTitle": "لم تكن لدينا قط قراءة جيدة من هذا المصدر في هذا المتصفح. وهذا ليس مثل «سليم»، وليس مثل خطأ في نسخة نحتفظ بها.",
    "ageNever": "لم يُقرأ قط",
    "ageLabel": "آخر قراءة {age}",
    "ageNeverLine": "لا نسخة جيدة في هذا المتصفح بعد",
    "viaSnapshotLine": "من لقطتنا، جُلبت {age}",
    "viaLiveLine": "قراءة مباشرة من {publisher} {age}",
    "snapshotOverdue": "نسخة أحدث متأخرة",
    "snapshotChecking": "(نتحقق من وجود أحدث)",
    "couldNotLookLine": "تعذرت القراءة: {reason}",
    "reasonNoRoute": "{why}، ولا يستطيع المتصفح قراءة {publisher} مباشرة",
    "snapshotWhy": {
      "no-index": "تعذرت قراءة فهرس لقطاتنا",
      "not-in-index": "لقطاتنا لا تشمل هذا المصدر",
      "refused": "رُفض آخر جمع له",
      "error": "فشل آخر جمع له",
      "skipped": "تخطّاه الجامع",
      "unreadable": "تعذرت قراءة لقطتنا له"
    },
    "harvestUnchecked": "لقطاتنا: لم تُفحص بعد.",
    "harvestUnavailable": "لقطاتنا غير متاحة الآن، فكل مصدر أدناه يُقرأ مباشرة من ناشره، أو لا يُقرأ.",
    "harvestLine": "لقطاتنا: كُتبت {age} · سليم {ok} · مرفوض {refused} · فاشل {error}",
    "errorLabel": "آخر خطأ",
    "attributionTitle": "الشكر والتقدير",
    "attributionIntro": "البيانات على هذه الخريطة عمل غيرنا.",
    "footCreditsIntro": "الصور والخامات:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "خامات الكواكب والنجوم، برخصة CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "صور السحب والجانب الليلي والسطح، والنماذج ثلاثية الأبعاد",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "السحب",
    "auroraTitle": "الشفق",
    "weatherTitle": "البرق",
    "layersTitle": "مباشر أو مرفق",
    "layersIntro": "المباشر يُقرأ من ناشره، أو يُحسب لهذه اللحظة، وأنت تشاهد. والفهرس يأتي مع التطبيق: النجوم والمجرات والأطباق ومواقع الهبوط على الأرض لا تتحرك وأنت تنظر. وتحلّ عينة مرفقة محل مصدر لا يستطيع المتصفح استدعاءه أصلًا.",
    "layerLive": "مباشر",
    "layerCatalogue": "فهرس",
    "layerSample": "عينة مرفقة",
    "layerIllustrative": "مرسوم، غير متتبَّع",
    "layerMixed": "مختلط",
    "layerEmpty": "لا شيء محمّل",
    "layerCountLabel": "المعروض: {n}",
    "sourcesEmpty": "لم يُعلَن عن أي مصدر.",
    "notAsked": "مصادر أخرى لا تُقرأ إلا حين تُفعَّل طبقة تحتاج إليها: {n}."
  },
  "time": {
    "justNow": "للتو",
    "aMinuteAgo": "قبل دقيقة",
    "minutesAgo": "قبل {n} د",
    "anHourAgo": "قبل ساعة",
    "hoursAgo": "قبل {n} س",
    "aDayAgo": "قبل يوم",
    "daysAgo": "قبل {n} يوم",
    "lessThanAMinute": "أقل من دقيقة",
    "aMinute": "دقيقة",
    "minutes": "{n} د",
    "anHour": "ساعة",
    "hours": "{n} س",
    "aDay": "يوم",
    "days": "{n} يوم",
    "months": "{n} شهر",
    "years": "{n} سنة",
    "inFuture": "بعد {d}",
    "ago": "قبل {d}"
  },
  "sheet": {
    "handle": "ارتفاع اللوحة",
    "closed": "مغلقة",
    "peek": "منخفضة",
    "half": "مفتوحة نصفًا",
    "full": "مفتوحة كاملًا",
    "state": "{height}. السهمان لأعلى ولأسفل يغيّرانه",
    "title": "ارتفاع اللوحة: {height}. المس أو اسحب لتغييره"
  },
  "print": {
    "title": "احفظ هذا العرض بطاقة بريدية 6 في 4 بوصات (JPEG)",
    "making": "نصنع البطاقة البريدية",
    "saved": "حُفظت البطاقة البريدية",
    "failed": "تعذر صنع البطاقة البريدية الآن",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}، {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "كما تراه العين",
      "deep": "تمديد عميق: الضوء الخافت مرفوع"
    },
    "look": {
      "measured": "المظهر المقيس"
    }
  },
  "hud": {
    "fromYou": "منك",
    "fromPlace": "من {place}",
    "behind": "خلف {world}",
    "offScreen": "{name}، على بعد {distance}، خارج الشاشة: طِر إليه",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "أخفِ كل اللوحات (H)",
    "show": "أظهر اللوحات مجددًا (H أو Escape)",
    "hint": "H أو Escape للوحات. Shift+H يُبقي التسميات والوقت"
  },
  "mark": {
    "label": "المصدر على GitHub",
    "title": "الشيفرة المصدرية لـSpace Radar على GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "حزمة الصحافة",
    "pressTitle": "ما هو، وصور، والشعار المستخدم",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "محطة",
    "satellite": "قمر اصطناعي",
    "debris": "حطام",
    "rocket": "صاروخ",
    "probe": "مسبار",
    "telescope": "تلسكوب",
    "asteroid": "كويكب",
    "comet": "مذنب",
    "site": "موقع أرضي",
    "world": "عالم",
    "star": "نجم",
    "exoplanet": "كوكب خارجي",
    "dso": "جرم من الفضاء العميق",
    "exotic": "جرم متطرف",
    "storm": "إعصار مداري",
    "earthevent": "حدث على الأرض",
    "oddity": "غرابة",
    "shower": "زخة شهب",
    "unknown": "جرم"
  },
  "cls": {
    "nearEarthApprox": "على هذا القرب من الأرض يكون مكانه تقريبيًا: فالمدار المرسوم حول الشمس وحدها ويُغفل جذب الأرض.",
    "label": "كيف نعرف أين هو",
    "measured": "موضع مقيس",
    "inferred": "موضع محسوب بالمدار انطلاقًا من عناصر عمرها {n} {unit}",
    "inferredUnknownAge": "موضع محسوب بالمدار انطلاقًا من عناصر مجهولة العمر",
    "inferredNoElements": "موضع محسوب وليس مقيسًا",
    "stormAdvisory": "مركزها في نشرة {time} UTC، {ago}؛ والعاصفة تتحرك، فقد تحركت منذئذ",
    "stormAdvisoryDated": "مركزها في نشرة {time} UTC ليوم {date}، {ago}؛ والعاصفة تتحرك، فقد تحركت منذئذ",
    "illustrative": "مرسوم ليُظهر وجهته؛ والمسار الحقيقي غير منشور",
    "placeIllustrative": "مداره الحقيقي، من فهرس CelesTrak، عند مكان مختلق عليه؛ وليست لدينا عناصر حالية له",
    "sample": "بيانات عينة مرفقة، وليست موضعًا مباشرًا",
    "provisional": "ليس في الفهرس العام بعد — هذه عناصر المشغّل نفسه، منشورة عبر CelesTrak؛ ويأتي رقم دائم حين يدرجه Space-Track",
    "unknown": "لا نستطيع القول كيف حُسب هذا الموضع",
    "unplaced": "لا أحد يعرف أين هذا، فلا شيء مرسوم له",
    "shower": "اتجاه في السماء: وسيط الحلول المنشورة للاتحاد الفلكي الدولي (IAU) لهذه الزخة",
    "noPlace": "لا مكان مرسوم له: فالجرم الذي هو عليه ليس عالمًا في هذا التطبيق",
    "approxPlace": "موضوع من إحداثيات منشورة، بدقة نحو {n} درجات",
    "inferredArc": "آخر مرة رآه فيها أحد كانت {date}، و{caveat}",
    "precisionSplit": "{anchorName} مقيس بدقة {anchorM} م؛ وهذا {how} وموضوع بدقة {objectM} م",
    "precisionSplitUnknown": "{anchorName} مقيس بدقة {anchorM} م؛ أما هذا الجرم نفسه فلم يُمسح قط",
    "precisionSplitHowOnly": "{anchorName} مقيس بدقة {anchorM} م؛ وهذا الجرم {how}، ولم ينشر أحد مدى دقة ذلك",
    "precisionOwn": "محدد الموقع بدقة {objectM} م، {how}",
    "aboard": "هذا هو موضع {carrier} نفسه، لأن الجرم مثبّت بمسامير على سطحه الخارجي ويذهب حيث يذهب",
    "how": {
      "surveyed": "مُسح من المدار",
      "photogrammetric": "وُجد في صور فوتوغرافية",
      "orbital_imaging": "وُجد في صور مدارية",
      "unsurveyed": "لم يُمسح قط",
      "map_reference": "مأخوذ من خريطة"
    },
    "hourWord": "ساعة",
    "hoursWord": "ساعتان|ساعات|ساعة|ساعة",
    "dayWord": "يوم",
    "daysWord": "يومان|أيام|يومًا|يوم",
    "minuteWord": "دقيقة",
    "minutesWord": "دقيقتان|دقائق|دقيقة|دقيقة",
    "yearWord": "سنة",
    "yearsWord": "سنتان|سنوات|سنة|سنة"
  },
  "unplaced": {
    "why": "{whyUnknown}",
    "noDistanceRow": "غير مقيس: ليس في الفهرس اختلاف منظر له",
    "iauApproved": "{name}، اعتُمد في {date}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "حريق",
      "volcano": "بركان ثائر",
      "iceberg": "جبل جليدي"
    },
    "rows": {
      "kind": "ما هو",
      "reported": "آخر بلاغ",
      "since": "ثائر منذ",
      "first": "أول بلاغ",
      "size": "المساحة",
      "where": "أين",
      "by": "أبلغ عنه"
    },
    "sizeValue": "{n} كم²",
    "sizeSmall": "أقل من 1 كم²",
    "by": "{agencies}، عبر NASA EONET",
    "sky": "هو على الأرض. ومن المدار الحريق عمود دخان، والبركان عمود رماد، والجبل الجليدي لوح أبيض على ماء داكن.",
    "drawn": "مرسوم علامة عند آخر مكان أُبلغ عنه؛ وامتداده على الأرض غير مرسوم",
    "honesty": "نقطة واحدة من NASA EONET، أُبلغ عنها آخر مرة في {date} وقُرئت {read}. للنظر، وليست سجلًا رسميًا لمكان الحدث أو زمنه."
  },
  "deepFacts": {
    "methodRow": "قُدِّر البعد بـ",
    "billionLightYears": "{n} مليار سنة ضوئية",
    "methods": {
      "parallax": "اختلاف المنظر: انزياح نجمه أمام السماء البعيدة",
      "eclipsing-binary": "ثنائيات كاسفة من النجوم فيه",
      "cepheid": "نجوم متغيرة من نوع القيفاويات فيه",
      "TRGB": "أسطع العمالقة الحمر فيه",
      "standard-candle": "نجوم أو انفجارات معروفة السطوع",
      "redshift": "انزياحه نحو الأحمر، عبر نموذج كوني",
      "kinematic": "سرعة حركته مع دوران المجرة",
      "assumed-member-of-parent": "لا طريقة خاصة به: وُضع على بعد مجرته"
    },
    "drawnTag": {
      "reconstruction": "· معاد بناؤه",
      "model": "· نموذج",
      "photograph": "· صورة",
      "catalogue": "· فهرس",
      "illustration": "· رسم توضيحي"
    },
    "drawnWords": {
      "reconstruction": "إعادة بناء ثلاثية الأبعاد من دراسة منشورة",
      "model": "نموذج لنوعه، وليس نجومه هو",
      "photograph": "صورة فوتوغرافية حقيقية، من جانبنا",
      "catalogue": "مواضع الفهرس",
      "illustration": "وهج وعلامة توضيحيان لنوعه"
    },
    "drawnLine": "المرسوم: {drawn}.",
    "drawnJoin": "؛ وفي غير ذلك، ",
    "records": {
      "dso-milky-way": {
        "drawn": "رسم توضيحي مبني على قياسات",
        "split": "مقيس: النجوم ضمن بضعة آلاف من السنوات الضوئية (Gaia)، وزاوية القضيب، والاتجاهات على امتداد الأذرع والأذرع الأقرب (Reid et al. 2019). مستنتج: الجانب البعيد وراء المركز، تحجبه الغيوم الغبارية؛ وأذرعه هي الأذرع القريبة مدوّرة."
      }
    }
  },
  "truth": {
    "label": "كيف نعرف",
    "hints": {
      "measured": "مقيس",
      "inferred": "محسوب",
      "illustrative": "توضيحي",
      "sample": "عينة",
      "unknown": "غير معروف",
      "unplaced": "بلا مكان",
      "reconstruction": "معاد بناؤه",
      "model": "نموذج",
      "photograph": "صورة فوتوغرافية",
      "catalogue": "فهرس",
      "illustration": "رسم توضيحي"
    },
    "loading": "نفتح دليل الرموز.",
    "failed": "لم يُحمَّل دليل الرموز. والسطر أدناه يقوله باختصار."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "من قرب، تدور دوامات صغيرة حيث تتقاطع الرياح المقيسة بسرعات مختلفة وفي أعقاب البقعة الحمراء العظمى، ويدور البيضاوي BA وثلاثة بيضاويات بيضاء. مكان التقاطع مقيس؛ وكل دوامة مولَّدة، أدق من الخريطة: توضيحية."
    },
    "poles": {
      "jupiter": "الأعاصير حول كل قطب منمذجة من رصد Juno في 2017، ثمانية حول قطب الشمال وخمسة في الجنوب: إعادة بناء، وليست صورة فوتوغرافية. والغطاء الأغمق في الفجوات توضيحي."
    }
  },
  "weatherDetail": "على مسافة أقرب مما تحتمل الخريطة من حدّة، يُولَّد نسيج سحابي رفيع مخطّط ليحمل الصورة: يتحرك مع الرياح المقيسة ويحتفظ بألوان الخريطة نفسها، وليس فيه خط واحد سحابة حقيقية. توضيحي.",
  "weatherVortex": {
    "turning": {
      "saturn": "من قرب، يدور إعصار صغير داخل السداسي: عينه بعرض 2 000 كم وجداره يدور بسرعة 150 مترًا في الثانية، كما قاس Cassini في 2012. واللولب المرسوم حوله توضيحي، ولا أحد يرصده الآن."
    },
    "still": {
      "saturn": "من قرب، يقبع إعصار صغير داخل السداسي: عينه بعرض 2 000 كم، كما قاس Cassini في 2012، حين كان جداره يدور بسرعة 150 مترًا في الثانية. واللولب المرسوم حوله توضيحي، ولا أحد يرصده الآن."
    }
  },
  "sunAlive": {
    "prominences": "تقف على حافتها بروزات شمسية عددها {n}، عند المناطق النشطة التي تدرجها NOAA ضمن خمس عشرة درجة من الحافة. الأماكن مقيسة؛ أما الأشكال والارتفاعات والحركة فتوضيحية.",
    "prominencesOne": "يقف على حافتها بروز شمسي واحد، عند منطقة نشطة تدرجها NOAA ضمن خمس عشرة درجة من الحافة. المكان مقيس؛ أما الشكل والارتفاع والحركة فتوضيحية.",
    "flare": "يظهر توهج من الفئة {cls} عند المنطقة {region}: بلغ ذروته عند {time} UTC في {date}، بحسب قائمة أحداث NOAA. وقته وفئته ومنطقته وخفوته مقيسة؛ أما سطوعه المرسوم فتوضيحي.",
    "cme": "انقذاف كتلي إكليلي غادر عند {time} UTC في {date} بسرعة {speed} كم/ث يُرسم كما يُظهره الكوروناغراف: حلقة ساطعة تتحرك إلى الخارج، وتجويف أغمق خلفها ونواة ساطعة. بدايته واتجاهه وعرضه وسرعته من فهرس DONKI لدى NASA؛ والسحابة تحتفظ بتلك السرعة، وهذا ما لا تفعله الحقيقية، ومظهرها توضيحي."
  },
  "starSystem": {
    "zoneLabel": "النطاق الصالح للحياة، محسوب",
    "orbitOf": {
      "mercury": "مدار عطارد، للمقارنة بالمقياس",
      "earth": "مدار الأرض، للمقارنة بالمقياس",
      "jupiter": "مدار المشتري، للمقارنة بالمقياس",
      "neptune": "مدار نبتون، للمقارنة بالمقياس"
    },
    "rows": {
      "known": "ما هو معروف",
      "orbit": "البعد عن نجمها",
      "temperature": "درجة الحرارة، محسوبة",
      "zone": "النطاق الصالح للحياة، محسوب",
      "starTemperature": "درجة حرارة السطح",
      "starWidth": "القطر",
      "starGlow": "الوهج",
      "starMass": "الكتلة",
      "planets": "الكواكب المرسومة",
      "stars": "النجوم في المنظومة",
      "companion": "الشمس الثانية"
    },
    "unseen": "لم ير أحد سطحه.",
    "measuredOne": "قِيس {what}.",
    "measuredMany": "قِيس {what}.",
    "estimatedOne": "قُدِّر {what}.",
    "estimatedMany": "قُدِّر {what}.",
    "unmeasuredOne": "لم يُقَس {what}.",
    "and": " و",
    "what": {
      "size": "الحجم",
      "year": "السنة",
      "mass": "الكتلة",
      "least": "أدنى كتلة ممكنة"
    },
    "au": "{n} و.ف",
    "auComputed": "{n} و.ف، محسوبة من سنته وكتلة نجمه",
    "auYearComputed": "{n} و.ف؛ وسنته، نحو {y} سنة، محسوبة من ذلك ومن كتلة نجمه",
    "earthsEstimated": "{n}× الأرض، تقدير الأرشيف من كتلته",
    "massEstimated": "{n}× الأرض، تقدير الأرشيف من حجمه",
    "massLeast": "على الأقل {n}× الأرض",
    "sizeDefault": "غير مقيس: مرسوم بحجم الأرض",
    "temperature": "{k} K ({c} °م)، إن عكس {pct} % من ضوئه كما تفعل الأرض",
    "zone": {
      "inside": "داخله",
      "edge": "عند حافته: داخل الحدود الأوسع فقط",
      "hotter": "أقرب إلى النجم منه",
      "colder": "أبعد عن النجم منه"
    },
    "zoneNone": {
      "too-hot": "غير محسوب: الصيغة لا تشمل نجمًا بهذه الحرارة",
      "too-cool": "غير محسوب: الصيغة لا تشمل نجمًا بهذه البرودة",
      "no-temperature": "غير محسوب: درجة حرارة النجم غير مقيسة",
      "no-luminosity": "غير محسوب: سطوع النجم غير مقيس",
      "twoStars": "غير محسوب: يدور حول نجمين والفهرس يصف واحدًا"
    },
    "zoneRange": "من {a} إلى {b} و.ف من النجم (Kopparapu et al. 2014)",
    "overlay": {
      "title": "ضعها فوق الخريطة",
      "zone": "النطاق الصالح للحياة",
      "orbits": "مدارات كواكبنا",
      "zoneTitle": "حيث يمكن للماء السائل أن يدوم على سطح كوكب، محسوب من حرارة النجم وسطوعه",
      "orbitsTitle": "مدارات كواكب مجموعتنا الشمسية، مرسومة حول هذا النجم للمقارنة بالمقياس",
      "note": {
        "none": "لا شيء موضوع فوق المنظومة.",
        "zone": "الشريط الأخضر هو النطاق الصالح للحياة، محسوب (Kopparapu et al. 2014)، وليس مرصودًا.",
        "orbits": "الحلقات المتقطعة مدارات من مجموعتنا الشمسية، للمقارنة بالمقياس. ولا شيء هنا يتبعها.",
        "both": "الشريط الأخضر هو النطاق الصالح للحياة، محسوب؛ والحلقات المتقطعة مدارات كواكبنا، للمقارنة بالمقياس."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "غير مقيس",
    "starPoint": "غير مقيس: مرسوم نقطة ضوء",
    "starWhite": "غير مقيس: مرسوم أبيض",
    "starGlowValue": "مرسوم أعرض من النجم، بلونه، ليُرى من بعيد",
    "starsOne": "في الفهرس: {n}؛ والمرسوم واحد",
    "starsBoth": "اثنان، كلاهما مرسوم",
    "companionValue": "عرضها {width}، وكتلتها {mass}، و{k} K{derived}",
    "companionDerived": " (قيمة نموذج؛ ولونها توضيحي)",
    "zoneBoth": "من {a} إلى {b} و.ف، مع جمع ضوء الشمسين",
    "pairLine": "تدور الشمسان إحداهما حول الأخرى كل {days} يوم، وتبعد إحداهما عن الأخرى {a} و.ف في المتوسط، على المدار الذي قاسته الأوراق العلمية؛ والكوكب يدور حولهما معًا. مواضعهما محسوبة من ذلك المدار؛ والمستوى الذي تُرسمان فيه، وهو مستوى الكواكب، هو الذي يستخدمه منظر السماء.",
    "line": "الأحجام والسنوات من NASA Exoplanet Archive، قُرئت في {date}. تُرسم المدارات دوائر{computed}؛ والألوان{phase} وميل المدارات توضيحية{defaults}.",
    "lineComputed": "، وحُسب مقياس {n} منها من السنة وكتلة النجم",
    "lineDefaults": "؛ والكوكب الذي لا حجم مقيسًا له يُرسم بحجم الأرض"
  },
  "shells": {
    "radio": "بلغ البث الراديوي من الأرض مسافة {n} سنة ضوئية"
  },
  "subscribe": {
    "heading": "راسلني بما هو قادم",
    "emailLabel": "عنوان بريدك الإلكتروني",
    "emailPlaceholder": "you@example.com",
    "pickOne": "اختر واحدًا على الأقل.",
    "launchesLabel": "الإطلاقات القادمة",
    "showersLabel": "ذروات زخات الشهب",
    "approachesLabel": "الاقترابات القريبة",
    "submit": "اشترك",
    "sending": "نرسل…",
    "pending": "راجع بريدك للتأكيد.",
    "couldNotReach": "تعذر الوصول إلى خدمة الاشتراك."
  },
  "flood": {
    "on": "أضئه",
    "off": "الضوء الحقيقي",
    "title": "أضئ النموذج بالتساوي ليُرى في الظل. وهذا ليس الضوء الحقيقي.",
    "note": "مصباحنا، وليس الضوء الحقيقي."
  },
  "ephemeris": {
    "drawn": "مرسوم من JPL Horizons بالاستكمال: ضمن نحو {km} كم من مسار JPL نفسه.",
    "note": "تحتفظ الخريطة بمساره في ذلك اليوم، من JPL Horizons، بدقة نحو {km} كم.",
    "noteLate": "يبدأ مساره لدى JPL بعد هذه اللحظة بـ{n} دقيقة، وتذهب الساعة إلى هناك. بدقة نحو {km} كم.",
    "noteDay": "تذكر صفحة NASA اليوم. تذهب الساعة إلى {time} UTC، أقرب مرور في مسار JPL ذلك اليوم، بدقة نحو {km} كم.",
    "failed": "لم يُحمَّل مساره لذلك اليوم، فتبقى الساعة حيث هي. اخترْه مجددًا لتعيد المحاولة.",
    "span": "يمتد مسار JPL له من {from} إلى {to}.",
    "before": "الساعة قبل ذلك، فلا موضع له في الخريطة.",
    "after": "الساعة بعد ذلك، فلا موضع له في الخريطة.",
    "go": "اذهب إلى أقرب تاريخ متاح",
    "goBefore": "انقل الساعة إلى {date}، حيث يبدأ مسار JPL له",
    "goAfter": "انقل الساعة إلى {date}، حيث ينتهي مسار JPL له"
  },
  "offline": {
    "updateReady": "نسخة أحدث جاهزة",
    "reload": "أعد التحميل"
  },
  "keepTrip": {
    "keep": "احفظ دون اتصال",
    "keepTitle": "احفظ صوت هذه الرحلة ونماذجها وخرائطها على هذا الجهاز لتعمل بلا اتصال",
    "keeping": "نحفظ {done} من {total}",
    "kept": "محفوظة دون اتصال",
    "keptTitle": "محفوظة على هذا الجهاز. اضغط لجلبها من جديد.",
    "keptNote": "الملفات: {n}، {size}، محفوظة على هذا الجهاز. البيانات المباشرة (الطقس والعواصف والأقمار الاصطناعية) لا تُحفظ.",
    "again": "حاول مجددًا",
    "failedNote": "حُفظ {done} من أصل {total}. تحقق من الاتصال وحاول مجددًا."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "اضغط أي مفتاح لتبدأ بالصوت",
    "gateTitleTouch": "المس الشاشة لتبدأ بالصوت",
    "gateNote": "إن لم يكن أحد هنا، يبدأ صامتًا، مع ترجمة مكتوبة، بعد {n} ثانية.",
    "upNext": "الرحلة التالية",
    "shape": "محطات: {n} · {m} د",
    "take": "امسك بالتحكم",
    "takeTitle": "أوقف الرحلات وحرّك الخريطة بنفسك"
  },
  "drift": {
    "name": "انجراف",
    "pause": "إيقاف مؤقت (Space)",
    "resume": "تابع (Space)",
    "next": "المكان التالي (N)",
    "options": "خيارات",
    "optionsTitle": "ما تسافر عبره، وما يُعرض، والإيقاع",
    "leave": "أوقف الانجراف (Escape)",
    "through": "سافر عبر",
    "cats": {
      "craft": "مركبات فضائية",
      "worlds": "عوالم",
      "small": "أجرام صغيرة",
      "stars": "نجوم",
      "deep": "الفضاء العميق"
    },
    "show": "اعرض",
    "real": "نماذج حقيقية",
    "realTitle": "فقط ما له نموذج أو خريطة أو صورة حقيقية",
    "names": "الأسماء",
    "namesTitle": "الاسم والأرقام بجانب كل مكان",
    "bare": "الفضاء فقط",
    "bareTitle": "لا شيء سوى السماء وما فيها: بلا أسماء ولا علامات ولا خطوط ولا لوحات",
    "pace": "الإيقاع",
    "paces": {
      "calm": "هادئ",
      "steady": "ثابت",
      "brisk": "سريع"
    },
    "hint": "انجراف. اسحب الخريطة لتمسك بالتحكم",
    "nothing": "لا شيء للانجراف عبره بهذه الخيارات",
    "notFromGround": "يبدأ الانجراف من الفضاء، لا من الأرض"
  },
  "tour": {
    "label": "الجولة",
    "micro": "جولة",
    "count": "{n} / {of}",
    "next": "التالي",
    "nextTitle": "الخطوة التالية (N)",
    "done": "تم",
    "doneTitle": "أنهِ الجولة",
    "skip": "تخطَّ",
    "skipTitle": "غادر الجولة (Escape)",
    "voice": "القراءة",
    "voiceTitle": "اقرأ كل خطوة بصوت عالٍ، بصوت اصطناعي",
    "waited": "ألقِ نظرة، ثم تابع.",
    "invite": "أول مرة هنا: ابدأ الجولة",
    "inviteTitle": "ثماني خطوات حول الخريطة"
  },
  "undo": {
    "moved": "انتقلت إلى {name}",
    "movedNowhere": "تحرك العرض",
    "night": "ليل في {name}: العرض الواسع",
    "back": "العودة إلى حيث كنت",
    "done": "عدت إلى حيث كنت"
  },
  "searchRows": {
    "kinds": {
      "sun": "نجم",
      "planet": "كوكب",
      "moon": "قمر",
      "station": "محطة فضائية",
      "satellite": "قمر اصطناعي",
      "telescope": "تلسكوب فضائي",
      "probe": "مركبة فضائية",
      "rocket": "صاروخ",
      "launch": "إطلاق",
      "debris": "حطام",
      "asteroid": "كويكب",
      "comet": "مذنب",
      "site": "مكان",
      "landing": "موقع هبوط",
      "star": "نجم",
      "exoplanet": "كوكب خارجي",
      "dso": "جرم من الفضاء العميق",
      "storm": "عاصفة مدارية",
      "oddity": "غرابة",
      "earthevent": "حدث على الأرض",
      "blackhole": "ثقب أسود",
      "pulsar": "نجم نابض",
      "magnetar": "مغناطار",
      "quasar": "كوازار",
      "galaxy": "مجرة",
      "cluster": "عنقود مجرات",
      "browndwarf": "قزم بني",
      "whitedwarf": "قزم أبيض"
    },
    "upNow": "فوق الأفق الآن، {compass}",
    "lowNow": "منخفض نحو {compass} الآن",
    "downNow": "تحت أفقك الآن",
    "trip": "رحلة",
    "starPattern": "كوكبة من النجوم",
    "mission": "مهمة",
    "eventName": "{mission}: {title}",
    "event": "حدث في مهمة · {date}",
    "eventNoDate": "حدث في مهمة",
    "group": "مجموعة أقمار · على الخريطة: {n} · اضغط لعرضها",
    "nearMe": "قربي الليلة",
    "nearMeSub": "ما هو فوق سمائك"
  },
  "countdown": {
    "go": "الإطلاق مُجاز",
    "tbc": "الوقت قيد التأكيد",
    "tbd": "الوقت لم يُحسم",
    "hold": "معلّق: العدّ متوقف",
    "inFlight": "في الطيران",
    "success": "أُطلق",
    "deployed": "نُشرت الحمولة",
    "failure": "فشل الإطلاق",
    "partial": "فشل جزئي",
    "byPlan": "بحسب الخطة. لا جديد",
    "byPlanClimbing": "بحسب الخطة، صاعد. لا جديد",
    "age": "قُرئ {age}"
  },
  "today": {
    "title": "اليوم",
    "moonTitle": "القمر {phase}",
    "moonLine": "{pct} % مضاء · {next} في {date}",
    "moonNext": [
      "المحاق",
      "التربيع الأول",
      "البدر",
      "التربيع الأخير"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "آخر 30 يومًا",
    "launched": "أجرام جديدة في المدار: {n}",
    "launchedLine": "الأحدث: {name}",
    "debris": "الحطام بالأرقام",
    "debrisClose": "أغلق عرض الحطام",
    "debrisTitle": "يعدّ كل ما يُتتبع في المدار. يقرأ الفهرس كله، نحو 1.5 ميغابايت"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a}، و{b}.",
    "title": "من {sources}. اضغط للذهاب إلى هناك",
    "names": {
      "sat-25544": "محطة الفضاء الدولية",
      "sat-48274": "تيانقونغ"
    },
    "pass": "{name} يمر فوقك {when}",
    "launch": "موعد إطلاق {name} {when}",
    "showerToday": "ذروة {name} اليوم",
    "showerTomorrow": "ذروة {name} غدًا",
    "moonName": "القمر",
    "moonPhases": [
      "المحاق",
      "",
      "البدر",
      ""
    ],
    "moonToday": "القمر اليوم في طور {phase}",
    "moonOne": "القمر على بعد يوم واحد من {phase}",
    "moonDays": "القمر على بعد {n} يوم من {phase}",
    "moonLit": "القمر مضاء بنسبة {pct} %",
    "crew": "عدد الأشخاص في المدار الآن {n}",
    "crewOne": "شخص واحد في المدار الآن",
    "storms": "عدد العواصف الدائرة {n}",
    "stormOne": "عاصفة واحدة تدور",
    "approach": "{name} يمر قرب الأرض {when}",
    "launched": "بلغ المدار {n} من الأجرام الجديدة في 30 يومًا",
    "dateToday": "اليوم هو {date}",
    "dateClock": "الساعة مضبوطة على {date}",
    "sources": {
      "pass": "عناصر CelesTrak",
      "launch": "Launch Library 2",
      "shower": "تقويم IMO للزخات",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "ساعة جهازك"
    }
  },
  "wonder": {
    "kicker": "عجيبة اليوم",
    "label": "عجيبة اليوم: {title}"
  },
  "story": {
    "kicker": "قصة هذا الأسبوع · الأسبوع {week}",
    "label": "قصة هذا الأسبوع: {title}",
    "ruleTitle": "كيف حُسب: {rule}",
    "lowest": {
      "title": "الأدنى في فهرسنا: {name}",
      "line": "لا يعلو عن {apogee} كم، وينزل إلى {perigee} كم، ودورة في {min} د.",
      "rule": "أدنى أعلى نقطة بين {n} من مجموعات العناصر التي يقل عمرها عن 7 أيام"
    },
    "farthest": {
      "title": "الأبعد في فهرسنا: {name}",
      "line": "يبتعد إلى {apogee} كم، ويعود إلى {perigee} كم، ودورة واحدة في {lap}.",
      "hours": "{n} ساعة",
      "days": "{n} يوم",
      "rule": "أعلى نقطة بين {n} من مجموعات العناصر التي يقل عمرها عن 7 أيام"
    },
    "busiest": {
      "title": "أزحم ارتفاع لدينا: من {lo} إلى {hi} كم",
      "line": "{n} من أصل {total} من الأجرام التي نحتفظ بها تطير هناك: {pct} من كل 100.",
      "rule": "أكثر نطاق عرضه {band} كم من متوسط الارتفاع ازدحامًا بين {n} من المجموعات التي يقل عمرها عن 7 أيام"
    },
    "oldest": {
      "title": "أقدم إطلاق في فهرسنا: {name}",
      "line": "أُطلق عام {year}، ومضت عليه {years} سنة في الأعلى، ودورة في {min} د.",
      "rule": "أقدم سنة إطلاق بين {n} من مجموعات العناصر التي يقل عمرها عن 7 أيام"
    }
  },
  "happened": {
    "flown": "انطلق {age}",
    "lost": "فشل الإطلاق {age}"
  },
  "passport": {
    "title": "جواز السفر",
    "openTitle": "أين ذهبت، محفوظ في هذا المتصفح فقط",
    "summary": "{places} · الرحلات: {n} من {total}",
    "places": "أماكن: {n}",
    "placeOne": "{n} مكان",
    "kept": "محفوظ في هذا المتصفح فقط، ولا يُرسل أبدًا.",
    "notKept": "هذا المتصفح لا يحفظ شيئًا، فلا شيء هنا.",
    "placesTitle": "أماكن فتحتها",
    "tripsTitle": "رحلات أنهيتها",
    "outOf": "{n} من {total}",
    "barLabel": "الرحلات المنتهية: {n} من {total}",
    "placeTitle": "اذهب إلى {name}",
    "noPlaces": "لا أماكن بعد. افتح واحدًا على الخريطة.",
    "noTrips": "لم تنتهِ أي رحلة بعد.",
    "seenTitle": "رأيته بعينيك",
    "noSeen": "لم يوضع شيء بعد. في البطاقة زر «رأيته».",
    "seenIt": "رأيته",
    "toolsLabel": "المزيد لهذا الجرم",
    "seenOn": "رُئي {date}",
    "seenTitleOff": "ضع علامة حين تراه بعينيك",
    "seenTitleOn": "موضوع عليه علامة أنه رُئي. اضغط لسحب العلامة",
    "seenNotKept": "هذا المتصفح لا يحفظ شيئًا، فلن تبقى العلامة",
    "remind": "ذكّرني",
    "remindTitle": "ينزّل ملف تقويم فيه تذكير: {title}",
    "forget": "انسني",
    "forgetConfirm": "نعم، انسني",
    "forgetTitle": "يمسح جواز السفر واختيار الصوت من هذا المتصفح",
    "forgotten": "نُسيتَ. هذا المتصفح لا يحمل شيئًا الآن.",
    "stamp": "الرحلة {n} من {total} · {date}",
    "stampPlaces": "فُتح حتى الآن: {places}",
    "resume": "تابع من المحطة {n}"
  },
  "kept": {
    "title": "ما يحتفظ به هذا الموقع على جهازك",
    "lines": [
      "جواز سفرك: الأماكن المفتوحة، والرحلات المنتهية، وما وضعت عليه علامة أنك رأيته.",
      "اختيارك للصوت والقراءة، وكيف تركت اللوحات.",
      "نسخة من آخر ما قرأه من بيانات، لتفتح الخريطة دون اتصال.",
      "حين تعمل شاشة وحدها، سجل قصير لرحلاتها، لعلامة التبويب هذه فقط."
    ],
    "place": "يُقرَّب مكانك إلى عُشر درجة ولا يُحتفظ به إلا ما دامت هذه الصفحة مفتوحة.",
    "none": "لا حساب، ولا ملفات تعريف ارتباط، ولا تحليلات. «انسني»، في جواز السفر، تمسح جواز السفر واختيار الصوت."
  },
  "buildInfo": {
    "line": "بُني من {sha}، {date}",
    "title": "الإيداع الذي بُني منه هذا الموقع، على GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "هل هكذا يبدو الفضاء؟",
    "lead": "أماكن الأشياء وكيف تتحرك مقيسة أو محسوبة. أما مظهرها فيأتي من ثلاثة أنواع من الصور.",
    "kinds": [
      [
        "نموذج ثلاثي الأبعاد",
        "السدم والمجرات نماذج ثلاثية الأبعاد مبنية من قياسات منشورة، وضوؤها مأخوذ من صور التلسكوبات (تعريضات طويلة)؛ وما لا نموذج له بعد وهج ناعم بحجمه. وبالعين يكون الغاز نفسه وهجًا رماديًا خافتًا. وقد تعرض البطاقة الصورة الفوتوغرافية بجانب نموذجها."
      ],
      [
        "خريطة على نموذج",
        "الكواكب والأقمار كرات ترتدي خرائط صُنعت من صور المركبات الفضائية، وبعضها نعّمه فنان. والمركبات الفضائية نماذج ثلاثية الأبعاد، معظمها من ملفات NASA المنشورة. والضوء عليها محسوب للحظة المعروضة."
      ],
      [
        "تصور فني",
        "لم ير أحد سطح كوكب يدور حول نجم آخر. وهذه الوجوه متخيلة من حجم ودرجة حرارة مقيسين، وبطاقاتها تقول ذلك."
      ]
    ],
    "foot": "تُغيَّر الأحجام والمسافات أحيانًا ليُرى الشيء أصلًا. وحيث يحدث ذلك، تقول البطاقة أو الصورة."
  },
  "debris": {
    "title": "الحطام في المدار",
    "reading": "نقرأ الفهرس، نحو 1.5 ميغابايت",
    "failed": "تعذرت قراءة الفهرس.",
    "retry": "حاول مجددًا",
    "empty": "لا يدرج الفهرس شيئًا في المدار.",
    "lead": "{gone} من أصل {total} من الأشياء المتتبَّعة في المدار لم تعد تعمل.",
    "kinds": {
      "debris": "قطع حطام",
      "rocket": "أجسام صواريخ مستهلكة",
      "dead": "أقمار اصطناعية ميتة",
      "working": "أقمار اصطناعية عاملة"
    },
    "bandsTitle": "بحسب الارتفاع",
    "bands": {
      "low": "أقل من 600 كم",
      "crowded": "600 إلى 1 000 كم",
      "upper": "1 000 إلى 2 000 كم",
      "medium": "2 000 إلى 34 000 كم",
      "geo": "نحو 36 000 كم",
      "beyond": "ما بعد 37 600 كم",
      "stretched": "مدارات ممتدة"
    },
    "bandAria": "{band}: {total} في المجموع. {debris} حطام، {rocket} أجسام صواريخ، {dead} أقمار ميتة، {working} عاملة.",
    "show": "أظهر على الخريطة",
    "hide": "أخفِ عن الخريطة",
    "showTitle": "كل قطعة حطام وصاروخ مستهلك، ملونة بحسب النوع",
    "drawn": "النقاط: {n}. الرمادي حطام، والأصفر صاروخ مستهلك. كل منها على ارتفاعه وميله الحقيقيين، في مكان مختلق على مداره.",
    "storiesTitle": "من الفهرس",
    "oneObject": "جرم واحد",
    "objects": "{n} جرم",
    "oneLaunch": "إطلاق واحد",
    "launches": "{n} إطلاق",
    "oneThing": "شيء واحد",
    "things": "{n} شيء",
    "storyLaunched": "انضم إلى الفهرس {objects} من {launches} في الأسبوع المنتهي في {date}.",
    "storyCameDown": "عاد {things} إلى الأرض في ذلك الأسبوع.",
    "storyCameDownBiggest": "عاد {things} إلى الأرض في ذلك الأسبوع، وأكبرها {name}.",
    "storyCloud": "أكبر سحابة حطام هي من {name}: {pieces} قطعة ما زالت في المدار.",
    "storyClouds": "أكبر سحب الحطام: {name}، {pieces} قطعة ما زالت في الأعلى؛ ثم {name2}، {pieces2}، و{name3}، {pieces3}.",
    "storyOldest": "أقدم ما زال في المدار هو {name}، أُطلق عام {year}: {years} سنة من الدورات.",
    "untracked": "أصغر من أن يُتتبع، بحسب نموذج ESA: نحو {mid} مليون قطعة بحجم 1 إلى 10 سم و{small} مليون بحجم 1 مم إلى 1 سم، حتى {when}. تقدير، وليس عدًّا.",
    "untrackedSource": "إحصاءات بيئة الفضاء لدى ESA",
    "honesty": "معدود من فهرس CelesTrak كما قُرئ في {date}: ما يستطيع الرادار تتبعه، من نحو 10 سم عرضًا. والقطع الأصغر أكثر عددًا بكثير وليست في أي فهرس. أما موضع النقطة على مدارها فتوضيحي.",
    "drawnPlaced": "النقاط: {n}. الرمادي حطام، والأصفر صاروخ مستهلك. {placed} منها في المكان الذي تضعها فيه مجموعة عناصرها المدارية؛ و{rest} الأخرى على ارتفاعها وميلها الحقيقيين، في مكان مختلق على المدار.",
    "honestyPlaced": "معدود من فهرس CelesTrak كما قُرئ في {date}: ما يستطيع الرادار تتبعه، من نحو 10 سم عرضًا. والقطع الأصغر أكثر عددًا بكثير وليست في أي فهرس. الأماكن مأخوذة من مجموعات العناصر المدارية لدى CelesTrak في {built}؛ والنقطة التي لا مجموعة عناصر منشورة لها تقع في مكان مختلق على مدارها، وبطاقتها تقول ذلك."
  },
  "klassFar": {
    "dwarf": "كوكب قزم",
    "interstellar": "جرم بين نجمي"
  },
  "moments": {
    "title": "ما الذي جئت من أجله",
    "wonder": {
      "id": "wonder",
      "label": "دهشة",
      "hint": "حلّق وانقر على أي شيء."
    },
    "now": {
      "id": "now",
      "label": "الآن",
      "hint": "ما فوق رأسك في هذه الدقيقة."
    },
    "next": {
      "id": "next",
      "label": "التالي",
      "hint": "ما هو قادم، ومتى."
    }
  },
  "audio": {
    "on": "الصوت: يعمل",
    "off": "الصوت: متوقف",
    "toggleTitle": "الموسيقى والأصوات. متوقفة حتى تشغّلها؛ ويُتذكر ذلك على هذا الجهاز.",
    "mute": "كتم",
    "unmute": "الصوت",
    "muteTitle": "أوقف الموسيقى والأصوات",
    "unmuteTitle": "شغّل الموسيقى والأصوات",
    "panelTitle": "الصوت",
    "panelNote": "موسيقى هادئة للخريطة ورحلاتها. لا شيء يُنزَّل حتى تشغّلها.",
    "creditsLine": "الموسيقى والأصوات: {credits}",
    "narrationCredit": "السرد: صوت اصطناعي، Kokoro-82M (af_heart)، Apache-2.0"
  },
  "dwarfLook": {
    "colour": "مرسوم بالألوان التي يقيسها ضوءه (B−V {bv}، V−R {vr})، وبسطوع ما يعكسه سطحه (ألبيدو {albedo}) على مقياس مضغوط ليظل أغمق هذه العوالم ظاهرًا.",
    "colourRed": "مرسوم بالألوان التي يقيسها ضوءه (B−V {bv}، V−R {vr})، وهو من أكثر ما في المجموعة الشمسية احمرارًا، وبسطوع ما يعكسه سطحه (ألبيدو {albedo}) على مقياس مضغوط ليظل أغمق هذه العوالم ظاهرًا.",
    "shapeEgg": "شكله هو البيضة التي قاسها منحنى ضوئه واحتجاب نجمي عام 2017، {a} × {b} × {c} كم.",
    "shapeMeasured": "شكله هو الذي قاسته احتجابات نجمية.",
    "shapeUnknown": "لم يُقَس شكله قط، فهو مرسوم كرويًا.",
    "ring": "حلقته عند بعدها وعرضها وعتمتها المقيسة؛ أما ميل الحلقة في السماء فغير مرسوم.",
    "faintRings": "حلقتاه، اللتان اكتُشفتا في 2023، أخفت من أن تُريا بعتمتهما الحقيقية، فلا تُرسمان.",
    "surface": "لم يحلّل أي تلسكوب سطحه: لا شيء عليه مرسوم، وهو مرسوم ساكنًا، لا يدور.",
    "source": "الأرقام: {src}."
  },
  "worldFace": {
    "titan": {
      "title": "تيتان، بطريقتين",
      "modes": {
        "own": "الأشعة تحت الحمراء",
        "radar": "الرادار"
      },
      "notes": {
        "own": "أرض تيتان كما رأتها كاميرا Cassini عبر الضباب بضوء قريب من تحت الحمراء (938 نانومتر)، بلون الضباب البرتقالي. والبحار في الشمال مغمَّقة على طول الخطوط التي رسمها رادار Cassini، ومن قرب، حيث تنعكس الشمس فيها، تلمع: مكان اللمعان محسوب؛ أما حجمه وسطوعه فتوضيحيان.",
        "radar": "شرائط من أرض تيتان كما رآها رادار Cassini عبر الضباب، من 2004 إلى 2015: الساطع أرض وعرة أو أرض مائلة نحو الرادار، والداكن أملس، وبحار الميثان والإيثان السائلين سوداء. والرمادي منا: فالرادار لا لون له. رأى الرادار 61 % من تيتان؛ وبين شرائطه تظهر خريطة الأشعة تحت الحمراء، خافتة، بالبرتقالي. USGS Astrogeology وNASA/JPL-Caltech، ملكية عامة."
      }
    },
    "venus": {
      "title": "الزهرة، بطريقتين",
      "modes": {
        "own": "السحب",
        "surface": "الأرض"
      },
      "notes": {
        "own": "قمم السحب، وهي كل ما رأته عين أو تلسكوب من الزهرة.",
        "surface": "الأرض تحت السحب، رسمها Magellan التابع لـNASA بالرادار من المدار بين 1990 و1992. الساطع أرض وعرة والداكن أملس. والبرتقالي مضاف، والشرائط التي فاتت Magellan مملوءة من حوافها. وهي مضاءة بالشمس كأن السحب غير موجودة: وجبالها وحوافها الصخرية من مقياس ارتفاع Magellan، مرسومة أعلى بست مرات، تلقي ظلالها. ولا تتحرك مع السحب."
      }
    },
    "jupiter": {
      "title": "المشتري، بطريقتين",
      "modes": {
        "own": "خريطة فنان",
        "hubble": "كما رآه Hubble"
      },
      "notes": {
        "own": "خريطة فنان، صُنعت من صور المركبات الفضائية ونُعّمت (Solar System Scope). وهي الصورة التي يعرفها معظم الناس.",
        "hubble": "المشتري كما رسمه Hubble في 11 ديسمبر 2025. الأحزمة حيث كانت في ذلك اليوم، ولا غيمة في مكانها اليوم. الألوان من مرشحات Hubble الحمراء والخضراء والبنفسجية، أميل إلى الاصفرار قليلًا مما تراه العين. NASA وESA وA.A. Simon وM.H. Wong (OPAL)، CC BY 4.0، بتصرف."
      }
    },
    "saturn": {
      "title": "زحل، بطريقتين",
      "modes": {
        "own": "خريطة فنان",
        "hubble": "كما رآه Hubble"
      },
      "notes": {
        "own": "خريطة فنان، صُنعت من صور المركبات الفضائية ونُعّمت (Solar System Scope). وهي الصورة التي يعرفها معظم الناس.",
        "hubble": "زحل كما رسمه Hubble في 29 أغسطس 2025، بمرشحاته الحمراء والخضراء والبنفسجية، أميل إلى الاصفرار قليلًا مما تراه العين. والشريط عند خط الاستواء الذي حجبته الحلقات في ذلك اليوم مملوء من السحب على جانبيه. NASA وESA وA.A. Simon وM.H. Wong (OPAL)، CC BY 4.0، بتصرف."
      }
    },
    "uranus": {
      "title": "أورانوس، بطريقتين",
      "modes": {
        "own": "خريطة فنان",
        "hubble": "كما رآه Hubble"
      },
      "notes": {
        "own": "خريطة فنان، صُنعت من صور المركبات الفضائية ونُعّمت (Solar System Scope). وهي الصورة التي يعرفها معظم الناس.",
        "hubble": "أورانوس كما رسمه Hubble في 23 أكتوبر 2025. الكوكب مستلقٍ على جنبه وقطبه الشمالي نحونا، فلم يرَ Hubble إلا نصفه الشمالي؛ ويُعطى النصف الجنوبي لون خط الاستواء، دون تخمين. NASA وESA وA.A. Simon وM.H. Wong (OPAL)، CC BY 4.0، بتصرف."
      }
    },
    "neptune": {
      "title": "نبتون، بطريقتين",
      "modes": {
        "own": "خريطة فنان",
        "hubble": "كما رآه Hubble"
      },
      "notes": {
        "own": "خريطة فنان، صُنعت من صور المركبات الفضائية ونُعّمت (Solar System Scope). وهي الصورة التي يعرفها معظم الناس.",
        "hubble": "نبتون كما رسمه Hubble في 24 أغسطس 2025: أشحب من الصور الشهيرة. وكان أقصى الشمال خارج مرمى Hubble، ويُعطى لون آخر سحب رآها، دون تخمين. NASA وESA وA.A. Simon وM.H. Wong (OPAL)، CC BY 4.0، بتصرف."
      }
    }
  },
  "exposure": {
    "panelTitle": "التعريض",
    "modes": {
      "eye": "العين",
      "camera": "الكاميرا",
      "deep": "عميق"
    },
    "notes": {
      "eye": "ما كنت سترى من مكان مظلم: خافت ورمادي.",
      "camera": "تعريض طويل: دقائق من الضوء، كما تحتفظ بها الكاميرا.",
      "deep": "تمديد مرصد: أخفت الغاز مرفوع."
    },
    "real": "الغاز حقيقي، وخافت: وبالعين عند التلسكوب وهج رمادي، لأن عين الليل لا ترى اللون. والخريطة ترسمه نموذجًا ثلاثي الأبعاد؛ أما الصورة التي يعرضها المنزلق فتعريض طويل.",
    "colours": {
      "broadband": "التُقطت عبر مرشحات لونية عريضة ({filters})، فألوانها قريبة مما تراه عين أشد حساسية بكثير.",
      "mixed": "التُقطت عبر مرشحات لونية عريضة مع مرشح ضيق للهيدروجين المتوهج ({filters})، فالغاز الأحمر هنا أقوى مما تجده العين.",
      "narrowband": "ألوانها مُخطَّطة: كل لون هو ضوء غاز واحد عبر مرشح ضيق ({filters})، اختير ليُظهر البنية، لا ما تراه العين.",
      "infrared": "التُقطت بضوء الأشعة تحت الحمراء الذي لا تراه أي عين ({filters})، فكل لون هنا مختار: يُظهر ما هو موجود، لا ما تراه العين.",
      "unstated": "لا يذكر أرشيفها أي مرشحات استُخدمت، فلا نقول هل هذه الألوان هي ما تراه العين."
    },
    "part": "تُظهر {part}، لا كله.",
    "creditLead": "الصورة: ",
    "creditTail": " · {licence}، حوافها مخفّتة والسماء مغمَّقة منا"
  },
  "look": {
    "panelTitle": "المظهر",
    "modes": {
      "measured": "مقيس",
      "film": "سينمائي"
    },
    "titles": {
      "measured": "فقط ما هو مقيس أو منمذج، بالمعدل الحقيقي",
      "film": "يضيف تفاصيل مولَّدة وطقسًا توضيحيًا"
    }
  },
  "lookSaid": {
    "measured": "المظهر المقيس: لا شيء مولَّد أو توضيحي مرسوم عليه.",
    "film": "المظهر السينمائي: تُرسم تفاصيل مولَّدة وطقس توضيحي.",
    "worlds": {
      "saturn": "الطقس: تتحرك الأحزمة بسرعات الرياح التي قاسها Cassini. حركة منمذجة، وليست غيوم اليوم."
    },
    "also": {
      "venus": "أُبلغ عن برق على الزهرة وما زال محل جدل؛ ولا برق مرسوم."
    },
    "turning": {
      "jupiter": "من قرب، يدور البيضاوي BA وثلاثة بيضاويات بيضاء حيث تضعها الخريطة."
    },
    "poles": {
      "jupiter": "الأعاصير حول كل قطب منمذجة من رصد Juno في 2017، ثمانية حول قطب الشمال وخمسة في الجنوب: إعادة بناء، وليست صورة فوتوغرافية."
    },
    "sun": {
      "measured": "المظهر المقيس: الحبيبات المولَّدة مُطفأة، والإكليل والبروزات ثابتان.",
      "film": "المظهر السينمائي: الحبيبات مولَّدة، والإكليل والبروزات تتحرك كما رُسمت، لا كما قيست."
    }
  },
  "otherLight": {
    "panelTitle": "ضوء آخر",
    "bands": {
      "visible": "المرئي",
      "infrared": "تحت الحمراء",
      "microwave": "الميكروويف",
      "gamma": "أشعة غاما"
    },
    "notes": {
      "visible": "السماء كما تراها العيون والكاميرات.",
      "infrared": "السماء بالأشعة تحت الحمراء، بألوان زائفة: غبار دافئ ونجوم باردة.",
      "microwave": "الميكروويف، سطوعًا: المجرة فوق أقدم ضوء.",
      "gamma": "أشعة غاما، بألوان زائفة: نجوم نابضة وبلازارات ووهج الأشعة الكونية."
    },
    "colours": {
      "infrared": "الأحمر 22 µm، والأخضر 4.6 µm، والأزرق 3.4 µm (WISE)",
      "microwave": "حزمة واحدة، 94 GHz، مرسومة سطوعًا (WMAP)",
      "gamma": "الأحمر من 0.3 إلى 1 GeV، والأخضر من 1 إلى 3، والأزرق فوق 3 (Fermi)"
    },
    "mixLabel": "من السماء المرئية إلى {band}",
    "mixValue": "{pct} % {band}",
    "loading": "نجلب صورة السماء كلها.",
    "failed": "لم تصل تلك الصورة. السماء كما كانت.",
    "creditLead": "المسح: ",
    "creditTail": ". البلاطات: CDS، ستراسبورغ."
  },
  "overlay": {
    "panelTitle": "بيانات الأرض",
    "keyTitle": "على الكرة الآن",
    "keyOff": "أزلها",
    "keyOffTitle": "اعرض الأرض كما هي",
    "none": "لا شيء",
    "loading": "نطلب الصورة من NASA.",
    "failed": "لم تصل تلك الصورة. الكرة كما كانت.",
    "noEarth": "تُعرض على الأرض، حين تكون في المنظر.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "الصورة ليوم {date}.",
      "monthly": "الصورة هي متوسط {date}."
    },
    "made": {
      "measured": "مقيسة من المدار؛ وصافية حيث لم يُرَ شيء.",
      "analysed": "مقيسة، مع ملء الفجوات.",
      "modelled": "نموذج طقس مغذّى بقياسات، وليس صورة مباشرة."
    },
    "credit": "البيانات: {credit}، عبر NASA GIBS. خريطة بيانات، وليست صورة فوتوغرافية.",
    "wind": {
      "title": "الرياح",
      "loading": "نطلب حقل الرياح.",
      "failed": "لم يصل حقل الرياح. الكرة كما كانت.",
      "what": "الرياح على ارتفاع عشرة أمتار فوق الأرض؛ واللون سرعتها.",
      "dated": "التوقع ليوم {date}، {time} UTC.",
      "mean": "نحو {mean} م/ث في المتوسط، وحتى {max}.",
      "sped": "تحرك الخطوط ما يعادل {n} ساعة من الرياح في كل ثانية.",
      "spedDay": "تحرك الخطوط يومًا من الرياح في كل ثانية.",
      "still": "كل خط قطعة من التدفق، واقفة.",
      "credit": "البيانات: {credit}. نموذج طقس، وليس قياسًا."
    },
    "currents": {
      "title": "التيارات المحيطية",
      "loading": "نطلب التيارات المحيطية.",
      "failed": "تيارات المحيط لليوم غير موجودة هنا. الكرة كما كانت.",
      "what": "تيارات على سطح البحر؛ واللون درجة حرارة الماء.",
      "dated": "محسوبة من ارتفاع البحر الذي قاسته الأقمار الاصطناعية في {date}: التدفق الثابت، دون مدّ وجزر ولا انجراف رياح، وهي الأقل يقينًا عند خط الاستواء.",
      "tempDated": "الحرارة مقيسة في {date}، والفجوات مملوءة.",
      "tempMissing": "الخط الرمادي ماء بلا درجة حرارة في البيانات.",
      "sped": "تحرك الخطوط ما يعادل {n} يوم من الانجراف في كل ثانية؛ والخط الطويل ماء سريع.",
      "spedHours": "تحرك الخطوط ما يعادل {n} ساعة من الانجراف في كل ثانية؛ والخط الطويل ماء سريع.",
      "still": "كل خط قطعة من التدفق، واقفة؛ والطويل ماء سريع.",
      "credit": "البيانات: {credit}."
    },
    "legendAria": "{title}، من {low} إلى {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "الأشكال تقليد، رسمناه نحن؛ والنجوم عند زواياها على أبعادها المقيسة.",
    "lineSky": "الأشكال تقليد، رسمناه نحن، فوق النجوم كما تُرى من الأرض.",
    "ecliptic": "الخط المتقطع هو دائرة البروج، مسار الشمس خلال السنة.",
    "distance": "{n} س.ض",
    "namedDistance": "{name}، {n} س.ض"
  },
  "colourKey": {
    "title": "التلوين بحسب",
    "unknown": "غير معروف لهذه",
    "scope": "نعدّ ما يُرسم من هنا، على الطبقات المفعّلة.",
    "byLayer": "الشكل هو ما هو عليه؛ واللون طبقته.",
    "crewed": "منها، مبنية لتحمل طاقمًا",
    "swarm": "منها، ضمن مجموعة أقمار كبيرة"
  },
  "trajectory": {
    "label": "مساره، الدورة القادمة ونصف",
    "ariaLabel": "الارتفاع عبر الزمن، ومساره على الأرض في خريطة مسطحة",
    "km": "{n} كم",
    "now": "الآن",
    "laps": "بعد دورة ونصف",
    "north": "ش",
    "south": "ج",
    "note": "محسوب من العناصر نفسها التي حُسبت منها النقطة؛ والخريطة هي الأرض تحته مباشرة."
  },
  "timeFacts": {
    "label": "الدقائق التسعون القادمة",
    "barLabel": "ضوء الشمس والظل خلال الدقائق التسعين القادمة: {parts}",
    "barSunlit": "{mins} د في ضوء الشمس",
    "barShadow": "{mins} د في ظل الأرض",
    "now": "الآن",
    "end": "+90 د",
    "entersShadowIn": "يدخل ظل الأرض بعد {mins}",
    "entersSunlightIn": "يخرج إلى ضوء الشمس بعد {mins}",
    "entersShadowAt": "يدخل ظل الأرض عند {time}",
    "entersSunlightAt": "يخرج إلى ضوء الشمس عند {time}",
    "allSunlit": "في ضوء الشمس طوال الدقائق التسعين القادمة",
    "allShadow": "في ظل الأرض طوال الدقائق التسعين القادمة",
    "minutes": "{n} د",
    "underAMinute": "أقل من دقيقة",
    "lapIn": "يُتم هذه الدورة بعد {mmss}",
    "lapAt": "يُتم هذه الدورة عند {time}",
    "orbit": "المدار {n} منذ الإطلاق",
    "orbitNote": "مستنتج: عدّ الفهرس عند حقبة العناصر، زائد الدورات منذئذ.",
    "launched": "أُطلق عام {year}",
    "nowSunlit": "في ضوء الشمس",
    "nowShadow": "في ظل الأرض",
    "shadowIn": "ظل بعد {mins}",
    "sunlightIn": "ضوء بعد {mins}",
    "shadowAt": "ظل عند {time}",
    "sunlightAt": "ضوء عند {time}",
    "lapEndsIn": "تنتهي الدورة بعد {mmss}",
    "lapEndsAt": "تنتهي الدورة عند {time}"
  },
  "train": {
    "label": "في قطار",
    "oneOf": "واحد من {n} أُطلقت معًا ({designator}).",
    "youLead": "هذا هو القائد.",
    "leads": "{name} هو القائد؛ وهذا هو رقم {position} في الصف.",
    "stillRaising": "ما زال يرتفع خطًّا واحدًا، على ارتفاع نحو {alt} كم — سلسلة الأضواء التي يتحدث عنها الناس.",
    "spreadOut": "انتشر الآن، على ارتفاع نحو {alt} كم؛ ولم يعد خطًّا في السماء."
  },
  "aboard": {
    "label": "على متنه أيضًا",
    "openTitle": "افتح بطاقة هذا",
    "note": "ليس لهذه نقطة خاصة بها. هي بالضبط حيث تكون هذه المركبة، لأنها مثبّتة بمسامير عليها.",
    "backTitle": "افتح بطاقة المركبة التي تحمل هذا"
  },
  "myth": {
    "label": "يُقال كثيرًا",
    "line": "{claim} — {correction}",
    "contested": "يُقال كثيرًا، وهو محل خلاف حقيقي: {claim} — {correction}"
  },
  "source": {
    "prefix": "المصدر",
    "unknown": "المصدر غير مسجّل",
    "fetched": "قُرئ {age}"
  },
  "photo": {
    "title": "ركّب صورة",
    "barLabel": "الصورة",
    "shapesLabel": "الشكل",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "اضبط إطار الصورة على {shape}",
    "caption": "التعليق",
    "captionTitle": "الشريط بالاسم والتاريخ والعنوان",
    "save": "احفظ الصورة",
    "saveTitle": "احفظ ما داخل الإطار صورة JPEG",
    "saveTitlePng": "احفظ ما داخل الإطار صورة PNG",
    "timeLabel": "الوقت",
    "earlier": "أبكر",
    "later": "أحدث",
    "timeTitle": "{dir} بمقدار {unit}، كما تخطو أداة الوقت",
    "lens": "العدسة",
    "lensValue": "{n}°",
    "lensTitle": "مجال الرؤية {n} درجة. الضيق عدسة طويلة؛ والواسع يضم أكثر",
    "png": "PNG",
    "pngTitle": "احفظ دون فقد، بملف أكبر",
    "share": "مشاركة",
    "shareTitle": "سلّم الصورة إلى ورقة المشاركة في هذا الجهاز",
    "sharedSaved": "لم يشاركها هذا الجهاز. حُفظت الصورة بدلًا من ذلك",
    "done": "غادر وضع الصورة",
    "making": "نصنع الصورة",
    "saved": "حُفظت الصورة",
    "failed": "تعذر صنع الصورة الآن",
    "honesty": "مرسومة من مواضع مقيسة، وليست صورة فوتوغرافية"
  },
  "tonight": {
    "title": "الليلة",
    "placeGuess": "قرب {place}، تخمينًا من منطقتك الزمنية",
    "placeSet": "من {place}",
    "placeMine": "من قرب مكانك",
    "placeShared": "من {place}، شورك معك",
    "noPlace": "حدّد مكانك لترى ما يمر فوقك.",
    "coords": "{lat}, {lon}",
    "working": "نحسب مرورات الليلة…",
    "passLine": "{name} · {time} · من {from} إلى {to}، {fists} في أعلى نقطة ({deg}°) · {mins} د",
    "startsIn": "يبدأ بعد {countdown}",
    "startsAt": "يبدأ عند {time}",
    "upNow": "فوق الأفق الآن، انظر نحو {dir}",
    "showMe": "أرني",
    "showMeTitle": "افتح السماء من مكانك، متجهًا إلى حيث يطلع",
    "guessCaveat": "قد تختلف الأوقات بضع دقائق عند مكانك.",
    "unitRises": "يطلع",
    "unitHigh": "أعلى نقطة",
    "unitLong": "د في المنظر",
    "degrees": "{deg}°",
    "path": "من {from} إلى {to}",
    "rowDetail": "{time} · الارتفاع {deg} · {mins} د",
    "nothingTonight": "لا شيء ساطع يمر فوقك الليلة.",
    "nextPass": "التالي: {when} · {name}",
    "nothingAtAll": "لا شيء ساطع يمر فوقك خلال ثلاثة أيام.",
    "darkFrom": "مظلم من {time}",
    "darkUntil": "مظلم حتى {time}",
    "darkNow": "مظلم الآن",
    "neverDark": "لا يحل الظلام الليلة",
    "moonRises": "القمر {pct} %، يطلع {time}",
    "moonUp": "القمر {pct} %، فوق الأفق الآن",
    "moonDown": "القمر {pct} %، تحت الأفق",
    "more": "مرورات أخرى",
    "fewer": "مرورات أقل",
    "arcLabel": "مساره عبر السماء: يطلع في {from}، وأعلى نقطة {deg}° ارتفاعًا، ويغرب في {to}",
    "cardinals": {
      "N": "ش",
      "E": "ق",
      "S": "ج",
      "W": "غ"
    },
    "best": {
      "title": "أفضل ما في الليلة",
      "nothing": "لا شيء بارز الليلة.",
      "rowTitle": "أره في السماء",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "القدر {mag}",
      "passAria": "{name}: يظهر {t0} {d0}، وأعلى نقطة {t1} عند {deg}° {d1}، ويختفي {t2} {d2}، القدر {mag}.",
      "fades": "يخفت في ظل الأرض قبل أن يغرب.",
      "appears": "يخرج من ظل الأرض في منتصف الصعود.",
      "notVisible": "غير مرئي: السماء مضيئة أو هو في الظل.",
      "rocket": "جسم صاروخ · {name}",
      "debris": "حطام · {name}",
      "planetLine": "الأفضل {time} · {deg}° ارتفاعًا، {dir}",
      "moonTitle": "القمر · {phase} · {pct} %",
      "moonSets": "يغرب {time}",
      "moonRises": "يطلع {time}",
      "moonAllNight": "فوق الأفق طوال الليل",
      "phases": {
        "new": "محاق",
        "waxingCrescent": "هلال متزايد",
        "firstQuarter": "تربيع أول",
        "waxingGibbous": "أحدب متزايد",
        "full": "بدر",
        "waningGibbous": "أحدب متناقص",
        "lastQuarter": "تربيع أخير",
        "waningCrescent": "هلال متناقص"
      },
      "showerLine": "حتى {zhr} في الساعة · الأفضل {time}، {dir}",
      "dsoLine": "الأفضل {time} · {deg}° ارتفاعًا، {dir} · {how}",
      "dsoNeeds": {
        "eye": "بالعين",
        "binoculars": "بالمنظار"
      },
      "view": "منظري",
      "viewHeight": "كم يجب أن يرتفع",
      "facings": {
        "any": "كل الاتجاهات",
        "n": "شمال",
        "e": "شرق",
        "s": "جنوب",
        "w": "غرب"
      },
      "facingTitles": {
        "any": "السماء كلها",
        "n": "فقط الأفضل في الشمال",
        "e": "فقط الأفضل في الشرق",
        "s": "فقط الأفضل في الجنوب",
        "w": "فقط الأفضل في الغرب"
      },
      "heights": {
        "0": "أي ارتفاع",
        "15": "فوق 15°",
        "30": "فوق 30°"
      },
      "viewNothing": "لا شيء يمر الليلة في ذلك الجزء من السماء.",
      "darkHours": "مظلم من {from} إلى {to}",
      "moonless": "لا قمر، ليلة مظلمة",
      "moonBright": "القمر {pct} % يخفي النجوم الخافتة",
      "moonFaint": "القمر {pct} %، ضوء قليل",
      "neverDark": "لا يحل الظلام الليلة.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "محسوب لمكانك. السطوع تقدير."
    },
    "skybar": {
      "title": "السماء",
      "field": "مجال الرؤية",
      "fields": {
        "eye": "العين",
        "binoculars": "المنظار",
        "telescope": "التلسكوب"
      },
      "fieldNotes": {
        "eye": "بسعة ما تراه. مرّر أو اقرص للتقريب.",
        "binoculars": "مجال 7°: تظهر نجوم أخفت.",
        "telescope": "مجال 1°: تصبح الكواكب أقراصًا."
      },
      "following": "نتابع {name}. اسحب السماء لتتركه.",
      "followSet": "غاب {name} تحت الأفق، فتركه العرض.",
      "show": "الخطوط والأسماء",
      "toggles": {
        "figures": "الأشكال",
        "names": "الأسماء",
        "art": "الرسوم",
        "bounds": "الحدود",
        "sunPath": "مسار الشمس",
        "equator": "خط الاستواء",
        "grid": "الشبكة",
        "starGrid": "شبكة النجوم",
        "meteors": "الشهب",
        "trails": "الآثار",
        "seeThrough": "أرض شفافة"
      },
      "toggleTitles": {
        "seeThrough": "ارسم اليابسة شفافة، لتجد ما تحت الأفق",
        "figures": "أشكال الكوكبات",
        "names": "أسماء الكوكبات والنجوم الساطعة",
        "sunPath": "المسار الذي تلتزم به الشمس والقمر والكواكب",
        "equator": "خط استواء السماء، فوق خط استواء الأرض",
        "grid": "الارتفاع والاتجاه، مع خط الشمال-الجنوب",
        "starGrid": "الشبكة التي رُسمت عليها النجوم",
        "art": "الأشكال الغربية رسومًا، من عمل Johan Meuris",
        "bounds": "الحدود الرسمية للكوكبات الـ88",
        "meteors": "خطوط من الزخات النشطة الليلة، بمعدل الليلة",
        "trails": "آخر ساعة لكل نجم ساطع، كأنها تعريض طويل"
      },
      "time": "الوقت في السماء",
      "timeNow": "الآن",
      "timeNowTitle": "العودة إلى الحاضر",
      "timeDusk": "الغسق",
      "timeMidnight": "منتصف الليل",
      "timeDawn": "الفجر",
      "timeTitles": {
        "dusk": "نهاية الشفق المدني هذا المساء",
        "midnight": "منتصف الليل",
        "dawn": "بداية الشفق المدني في الصباح"
      },
      "timeStrip": "اسحب لتدير السماء",
      "timeTicks": {
        "dusk": "الغسق",
        "midnight": "منتصف",
        "dawn": "الفجر"
      },
      "timeStripAria": "وقت السماء: اسحب، أو استخدم مفاتيح الأسهم، عشر دقائق في الخطوة",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "نهار",
        "golden": "شمس منخفضة",
        "civil": "شفق مدني",
        "nautical": "شفق بحري",
        "astronomical": "الشفق الأخير",
        "night": "ليل"
      },
      "timeFar": "لا أقمار اصطناعية على هذا البعد من اليوم: مداراتها تتقادم.",
      "eyepiece": "العدسة العينية",
      "eyepieces": {
        "low": "منخفضة · 1°",
        "medium": "متوسطة · 30′",
        "high": "عالية · 12′"
      },
      "eyepieceTitles": {
        "low": "مجال درجة واحدة: بعرض بدرين",
        "medium": "نصف درجة: القمر كله",
        "high": "خُمس درجة: الكواكب أقراصًا"
      },
      "centre": "ما في المركز",
      "centreTitle": "سمِّ ما يقع عليه وسط العرض؛ يفتح Enter بطاقته",
      "con": {
        "kind": "كوكبة",
        "label": "{name}، كوكبة.",
        "inside": "في {name}"
      },
      "landscape": {
        "city": "الأفق: لمدينة، مرسوم. وليس شارعك.",
        "hills": "الأفق: تلال، مرسومة. وليست تلالك.",
        "coast": "بحر نحو {dir}، من خريطة المياه. واليابسة مرسومة."
      },
      "artWesternOnly": "الرسوم للأشكال الغربية فقط",
      "culture": "سماء من",
      "cultures": {
        "western": "الغرب",
        "chinese": "الصين",
        "maori": "الماوري",
        "hawaiian": "هاواي",
        "samoan": "ساموا",
        "tongan": "تونغا",
        "norse": "النورديون",
        "boorong": "بورونغ"
      },
      "cultureNotes": {
        "western": "الكوكبات الـ88 التي اتفق عليها الفلكيون عام 1922.",
        "chinese": "نحو 300 نجمية صغيرة. قراءة واحدة لسماء حية.",
        "maori": "ست صور. تختلف الأسماء بين القبائل (iwi)؛ والسماء حية.",
        "hawaiian": "خطوط نجوم لملاح، ما زالت تُستخدم للإبحار.",
        "samoan": "أربع عشرة صورة من تراث ساموا. تقليد حي.",
        "tongan": "مسارات نجوم وصور من تونغا. تقليد حي.",
        "norse": "ست صور، إعادة بناء واحدة للسماء النوردية.",
        "boorong": "سماء عائلة من البورونغ، كما رُويت عام 1857. ما زالت حية."
      },
      "cultureCredits": {
        "western": "الرسوم: Johan Meuris، لأجل Stellarium، رخصة Free Art. تشترك Carina وPuppis وVela في رسم واحد؛ ولا رسم لـSerpens.",
        "chinese": "الصور: Sun Shuwei وKarrie Berglund، لأجل Stellarium، CC BY-SA 4.0. إعادة بناء موثقة.",
        "maori": "الصور: Dan Smale، لأجل Stellarium، CC BY-SA 4.0. إعادة بناء موثقة.",
        "hawaiian": "الصور: عن Nainoa Thompson، من Kamehameha Schools Kapālama، لأجل Stellarium، CC BY-SA 4.0.",
        "samoan": "الصور: Jake Fitisemanu مع حراس ساموا، لأجل Stellarium، CC BY-SA 4.0. إعادة بناء موثقة.",
        "tongan": "الصور: Dan Smale، لأجل Stellarium، CC BY-SA 4.0. إعادة بناء موثقة من مصادر محدودة.",
        "norse": "الصور: Jonas Persson، لأجل Stellarium، CC BY-SA 4.0. إعادة بناء، وليست سجلًا.",
        "boorong": "الصور: John Morieson وAlex Cherney، لأجل Stellarium، CC BY-SA 4.0. قراءة واحدة لسماء حية."
      },
      "meteorNote": "{name}: نحو {n} في الساعة في هذه السماء.",
      "meteorFew": "{name}: أقل من واحد في الساعة في هذه السماء.",
      "meteorDown": "{name}: المصدر تحت الأفق، فلا خطوط.",
      "meteorHonest": "معدل الليلة نموذج. والخطوط توضيحية.",
      "meteorSporadic": "لا زخة الليلة. المصدر المقابل للشمس: {n} في الساعة.",
      "darkness": "سماؤك",
      "darknessModes": {
        "city": "مدينة",
        "town": "بلدة",
        "dark": "مكان مظلم"
      },
      "darknessAuto": "تلقائي",
      "darknessAutoTitle": "اقرأ نوع السماء من أضواء الليل عند مكانك",
      "darknessBy": {
        "place": "تقدير من خريطة NASA لأضواء الليل عند مكانك.",
        "reading": "نقرأ أضواء الليل عند مكانك.",
        "unread": "تعذرت قراءة خريطة أضواء الليل: اختر سماءك.",
        "trip": "مثبتة بهذه المحطة من الرحلة."
      },
      "darknessNotes": {
        "city": "مدينة: نجوم حتى القدر 4، ولا درب تبانة.",
        "town": "طرف بلدة: نجوم حتى القدر 5.3.",
        "dark": "مكان مظلم: نجوم حتى 6.5 ودرب التبانة."
      },
      "point": {
        "row": "وجّه هاتفك",
        "on": "وجّه هاتفك",
        "title": "ارفع الهاتف: يدور العرض معه",
        "note": "ارفع الهاتف نحو السماء وأدره. يتبعك العرض.",
        "noPlace": "يحتاج إلى مكانك، ليعرف أين الشمال.",
        "denied": "رفض الهاتف مستشعر الحركة. ما زال السحب يعمل.",
        "deniedHow": "للسماح: أعد التحميل، ثم اختر «سماح» حين يُسأل.",
        "none": "لم يستجب أي مستشعر حركة هنا. ما زال السحب يعمل.",
        "unsupported": "لا يوفر هذا المتصفح مستشعر حركة. ما زال السحب يعمل.",
        "lineUpWith": "السماء مزاحة؟ اسحب حتى يصطف {name}.",
        "lineUpPlain": "السماء مزاحة؟ اسحب حتى يصطف نجم ساطع.",
        "lined": "اصطفاف يدوي، {n}° عن البوصلة.",
        "reset": "ألغِ الاصطفاف",
        "resetTitle": "عُد إلى شمال البوصلة نفسه",
        "accuracy": "تقول البوصلة إنها دقيقة إلى نحو {n}°.",
        "relative": "لا بوصلة هنا. اسحب السماء لتصطف.",
        "declination": "الشمال الحقيقي: صُححت البوصلة {n}° {dir}.",
        "east": "شرقًا",
        "west": "غربًا",
        "honest": "الشمال من بوصلة الهاتف. والمعدن القريب يحرفها."
      },
      "red": "ضوء أحمر",
      "redTitle": "اجعل الصفحة حمراء لتبقى عيناك معتادتين على الظلام",
      "honesty": "النجوم مقيسة، والكواكب محسوبة، والهواء منمذج، واليابسة مرسومة."
    }
  },
  "keyHint": {
    "title": "أزرار التحكم",
    "titleTouch": "الإيماءات",
    "label": "مفاتيح تحرك العرض",
    "labelTouch": "إيماءات تحرك العرض",
    "close": "إغلاق",
    "closeTitle": "إغلاق (Escape)",
    "does": {
      "turn": "دوّر",
      "zoom": "أقرب، أبعد",
      "pan": "تحرك جانبًا",
      "pick": "اختر شيئًا",
      "search": "بحث",
      "hide": "أخفِ الكل",
      "show": "ما يُعرض",
      "share": "مشاركة",
      "esc": "إغلاق",
      "keys": "كل المفاتيح",
      "tripPlay": "تشغيل، إيقاف مؤقت",
      "tripStep": "السابق، التالي",
      "tripCard": "أخفِ البطاقة",
      "tripReplay": "أعد",
      "tripSound": "الصوت",
      "tripLeave": "غادر"
    },
    "how": {
      "drag": "اسحب",
      "wheel": "مرّر",
      "pinch": "اقرص",
      "two": "إصبعان",
      "tap": "المس"
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
      "space": "Space",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "اختصارات لوحة المفاتيح",
    "tripTitle": "في الرحلة"
  },
  "render": {
    "eyebrow": "Space Radar · رحلة",
    "site": "spaceradar.ai",
    "fly": "حلّق بنفسك",
    "music": "الموسيقى: John Bartmann، CC0. التقدير الكامل في spaceradar.ai."
  },
  "glossary": {
    "title": "كلمات في هذه الصفحة",
    "hint": "المس مصطلحًا لتقرأ جملة بسيطة."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} حريق كان هنا عند آخر بلاغ، {date}",
        "volcano": "{name} يثور منذ {date}",
        "iceberg": "{name} كان هنا عند آخر بلاغ، {date}"
      },
      "size": "نحو {n} كم² عند ذلك البلاغ"
    },
    "storm": {
      "lead": "{name} هو {a} {status}، وكان مركز العاصفة هنا {ago}",
      "leadUnknown": "{name} إعصار مداري كان مركز العاصفة هنا {ago}",
      "leadBefore": "{name} هو {a} {status}، ويصل مركز العاصفة إلى هنا {ago}",
      "leadBeforeUnknown": "{name} إعصار مداري يصل مركز العاصفة إلى هنا {ago}",
      "wind": "أقوى الرياح على مسارها، مع التوقع، تبلغ {n} كم/س",
      "statuses": {
        "hurricane": "إعصار هاريكين",
        "typhoon": "إعصار تايفون",
        "cyclone": "إعصار مداري",
        "storm": "عاصفة مدارية",
        "depression": "منخفض مداري"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} ثقب أسود على بعد {dist} سنة ضوئية",
      "leadPulsar": "{name} نجم نابض على بعد {dist} سنة ضوئية",
      "leadMagnetar": "{name} مغناطار على بعد {dist} سنة ضوئية",
      "leadQuasar": "{name} كوازار على بعد {dist} سنة ضوئية",
      "leadStar": "{name} نجم على بعد {dist} سنة ضوئية",
      "leadRange": "{name} {a} {kind} على بعد يتراوح بين {lo} و{hi} سنة ضوئية",
      "mass": "بكتلة تعادل {n} شمس",
      "massRange": "بكتلة تتراوح بين {lo} و{hi} شمس",
      "massMillions": "بكتلة تعادل {n} مليون شمس",
      "massBillions": "بكتلة تعادل {n} مليار شمس",
      "spins": "يدور {n} مرة في الثانية",
      "spinsSlow": "يدور مرة كل {n} ثانية",
      "kinds": {
        "blackhole": "ثقب أسود",
        "pulsar": "نجم نابض",
        "magnetar": "مغناطار",
        "star": "نجم",
        "quasar": "كوازار",
        "galaxy": "مجرة",
        "cluster": "عنقود مجرات",
        "browndwarf": "قزم بني",
        "whitedwarf": "قزم أبيض"
      },
      "leadGalaxy": "{name} مجرة على بعد {dist} سنة ضوئية، حيث هي الآن",
      "leadCluster": "{name} عنقود مجرات على بعد {dist} سنة ضوئية، حيث هو الآن",
      "leadBrowndwarf": "{name} قزم بني على بعد {dist} سنة ضوئية",
      "leadWhitedwarf": "{name} قزم أبيض على بعد {dist} سنة ضوئية"
    },
    "dso": {
      "leadHome": "{name} هي المجرة التي نعيش فيها؛ ومركزها على بعد {dist} سنة ضوئية",
      "lead": "{name} {a} {type} على بعد {dist} سنة ضوئية",
      "leadRange": "{name} {a} {type} على بعد يتراوح بين {lo} و{hi} سنة ضوئية",
      "leadUntyped": "{name} على بعد {dist} سنة ضوئية",
      "size": "عرضه نحو {n} سنة ضوئية",
      "seenAs": "نراه كما كان قبل {n} سنة",
      "seenAsMillions": "نراه كما كان قبل {n} مليون سنة",
      "constellation": "في {con}",
      "kinds": {
        "galaxy": "مجرة",
        "nebula": "سديم",
        "cluster": "عنقود نجمي",
        "other": "جرم من الفضاء العميق"
      }
    },
    "exoplanet": {
      "lead": "{name} كوكب يدور حول النجم {host} على بعد {dist} سنة ضوئية",
      "leadNoHost": "{name} كوكب يدور حول نجم آخر على بعد {dist} سنة ضوئية",
      "size": "نحو {n} أضعاف عرض الأرض",
      "sizeSmaller": "نحو {n} من عرض الأرض",
      "mass": "{n} أضعاف كتلة الأرض",
      "year": "تدوم سنته {n} يومًا",
      "yearHours": "تدوم سنته {n} ساعة",
      "found": "اكتُشف عام {year} بطريقة {method}",
      "foundYear": "اكتُشف عام {year}",
      "asOf": "من نسخة من الفهرس بتاريخ {date}"
    },
    "star": {
      "lead": "{name} نجم على بعد {dist} سنة ضوئية",
      "leadColour": "{name} {a} نجم {colour} على بعد {dist} سنة ضوئية",
      "near": "من أقرب النجوم",
      "seenAs": "نراه كما كان قبل {n} سنة",
      "seenAsMonths": "نراه كما كان قبل {n} شهر",
      "luminosity": "يسطع بما يعادل {n} أضعاف سطوع الشمس",
      "dimmer": "يسطع بنسبة {n} من سطوع الشمس",
      "colours": {
        "O": "أزرق",
        "B": "أبيض مزرق",
        "A": "أبيض",
        "F": "أبيض مصفر",
        "G": "أصفر",
        "K": "برتقالي",
        "M": "أحمر"
      }
    },
    "station": {
      "lead": "{name} محطة فضائية مأهولة تدور حول الأرض",
      "whyPass": "تعبر سماءك عند {time}",
      "crew": "وعلى متنها {crew} أشخاص",
      "altitude": "على ارتفاع {alt} كم",
      "speed": "وتدور مرة كل {period} دقيقة"
    },
    "satellite": {
      "lead": "{name} قمر اصطناعي يدور حول الأرض",
      "leadKind": "{name} {kind} في مدار حول الأرض",
      "leadDocked": "{name} {kind} في وضع الالتحام مع {station}",
      "aSpacecraft": "مركبة فضائية",
      "aTelescope": "تلسكوب فضائي",
      "whyLaunchedDays": "أُطلق قبل {n} يوم",
      "whyLaunchedYear": "أُطلق عام {year}",
      "operator": "تشغّله {operator}",
      "purpose": "{purpose}",
      "altitude": "على ارتفاع {alt} كم",
      "whyPass": "يعبر سماءك عند {time}"
    },
    "debris": {
      "lead": "{name} قطعة حطام متتبَّعة",
      "origin": "بقايا من {origin}",
      "brokeUp": "الذي تفكك عام {year}",
      "decay": "يُتوقع أن يعود إلى الغلاف الجوي نحو {date}",
      "altitude": "على ارتفاع {alt} كم",
      "burnsUp": "يحترق كله تقريبًا في طريق هبوطه"
    },
    "rocket": {
      "lead": "{name} إطلاق صاروخ",
      "leadWithPad": "{name} إطلاق صاروخ من {pad}",
      "leadStage": "{name} مرحلة صاروخ مستهلكة تدور حول الأرض",
      "stageLaunched": "أُطلقت عام {year}",
      "whyCountdown": "ينطلق {when}",
      "whyFlown": "الذي انطلق {when}",
      "destination": "متجه إلى {destination}",
      "missionType": "مهمة من نوع {missionType}",
      "illustrative": "المسار المرسوم هنا رسم تخطيطي للصعود، وليس مسارًا مقيسًا"
    },
    "probe": {
      "lead": "{name} مركبة فضائية في أعماق المجموعة الشمسية",
      "leadOrbits": "{name} مركبة فضائية تدور حول {world}",
      "destination": "في طريقها إلى {destination}",
      "lightTime": "بعيدة بحيث تستغرق الرسالة اللاسلكية {mins} دقيقة في الاتجاه الواحد",
      "lightTimeSeconds": "قريبة بحيث تستغرق الرسالة اللاسلكية {secs} ثانية في الاتجاه الواحد",
      "lightTimeHours": "بعيدة بحيث تستغرق الرسالة اللاسلكية {hours} ساعة في الاتجاه الواحد",
      "distanceSun": "{au} وحدة فلكية عن الشمس",
      "milestone": "ومن المقرر أن يحدث {milestone} في {date}"
    },
    "telescope": {
      "lead": "{name} تلسكوب فضائي",
      "observing": "موجَّه إلى {target} هذا الأسبوع",
      "station": "متمركز عند {station}",
      "altitude": "على ارتفاع {alt} كم",
      "sees": "يرصد بضوء {band}"
    },
    "asteroid": {
      "lead": "{name} جرم قريب من الأرض على مداره الخاص حول الشمس",
      "leadMainBelt": "{name} كويكب في الحزام الرئيسي، بين المريخ والمشتري",
      "leadBeyond": "{name} جرم صغير وراء نبتون، على مداره الخاص حول الشمس",
      "leadDwarf": "{name} كوكب قزم على مداره الخاص حول الشمس",
      "leadDwarfBelt": "{name} كوكب قزم في حزام الكويكبات، بين المريخ والمشتري",
      "leadDwarfBeyond": "{name} كوكب قزم وراء نبتون",
      "leadDwarfFarBeyond": "{name} كوكب قزم بعيد جدًا وراء نبتون",
      "leadInterstellarOut": "{name} جاء من نجم آخر وهو في طريقه خارج المجموعة الشمسية",
      "leadInterstellarIn": "{name} جاء من نجم آخر وهو يسقط نحو الشمس",
      "distanceSun": "{au} وحدة فلكية عن الشمس",
      "whyApproach": "يمر قرب الأرض في {date} على بعد {ld}× مسافة القمر",
      "size": "{size}",
      "willNotHit": "لن يصطدم بالأرض"
    },
    "comet": {
      "lead": "{name} مذنب على حلقة طويلة حول الشمس",
      "leadPeriodic": "{name} مذنب يدور حول الشمس كل {n} سنة",
      "leadInterstellarOut": "{name} مذنب من نجم آخر، في طريقه خارج المجموعة الشمسية",
      "leadInterstellarIn": "{name} مذنب من نجم آخر، يسقط نحو الشمس",
      "whyPerihelion": "أقرب ما يكون من الشمس في {date}",
      "nakedEye": "ساطع بما يكفي ليُعثر عليه دون تلسكوب",
      "faint": "أخفت من أن يُرى دون تلسكوب",
      "distanceSun": "على بعد {au} وحدة فلكية"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} من الأشياء الغريبة التي أرسلها الناس بعيدًا عن الكوكب"
    },
    "site": {
      "lead": "{name} مكان على الأرض يعمل مع المركبات الفضائية",
      "leadKind": "{name} {a} {kind}",
      "where": "في {where}",
      "whyDsn": "يتحدث الآن مع {spacecraft}",
      "whyLaunch": "ومن المقرر {launch} {when}",
      "mpc": "رمزه لدى مركز الكواكب الصغرى هو {code}",
      "closed": "أُغلق عام {year}",
      "kinds": {
        "pad": "منصة إطلاق",
        "dish": "طبق راديو",
        "observatory": "مرصد",
        "tracking": "محطة تتبع",
        "launch-site": "موقع إطلاق",
        "landing-site": "موقع هبوط"
      }
    },
    "shower": {
      "lead": "{name} زخة شهب",
      "peak": "تبلغ ذروتها نحو {date}",
      "speed": "وتصطدم شهبها بالهواء بسرعة {n} كم في الثانية",
      "parent": "من غبار {parent}"
    },
    "world": {
      "lead": "{name} عالم في المجموعة الشمسية",
      "leadMoon": "{name} هو قمر الأرض نفسها",
      "leadSun": "{name} هي النجم الواقع في مركز المجموعة الشمسية",
      "distanceKm": "على بعد {n} كم",
      "whyPhase": "{phase} الليلة",
      "whyRise": "يطلع من مكانك عند {time}",
      "distance": "{distance}",
      "diameter": "عرضه نحو {n} كم",
      "leadWhat": "{name} {what}",
      "what": {
        "pluto": "كوكب قزم وراء نبتون، عُدَّ الكوكب التاسع حتى عام 2006",
        "io": "أحد أقمار المشتري الأربعة الكبيرة، وأكثر عوالم المجموعة الشمسية نشاطًا بركانيًا",
        "europa": "أحد أقمار المشتري الأربعة الكبيرة، وتحت جليده محيط من الماء المالح",
        "ganymede": "أكبر أقمار المشتري وأكبر قمر في المجموعة الشمسية، أكبر من عطارد",
        "callisto": "أحد أقمار المشتري الأربعة الكبيرة، وأكثر أجرام المجموعة الشمسية تحفّرًا بالفوهات",
        "titan": "أكبر أقمار زحل، تحت ضباب برتقالي كثيف، وفيه بحيرات من الميثان؛ وقد هبط عليه Huygens عام 2005",
        "enceladus": "قمر جليدي صغير لزحل، تقذف نوافيره المحيط الذي تحت جليده إلى الفضاء",
        "triton": "أكبر أقمار نبتون؛ يدور في الاتجاه المعاكس، وهو على الأرجح جرم أسره نبتون من حزام كايبر",
        "charon": "أكبر أقمار بلوتو، بنصف حجمه؛ ويدير كل منهما الوجه نفسه للآخر دائمًا",
        "phobos": "الأكبر بين قمري المريخ، صخرة متكتلة تدور حلزونيًا نحو المريخ بمقدار 1.8 م في القرن",
        "deimos": "الأصغر بين قمري المريخ، صخرة صغيرة متكتلة مغطاة بالفوهات",
        "mimas": "أقرب أقمار زحل المستديرة إليه، تعلوه فوهة عرضها ثلث عرض القمر نفسه",
        "tethys": "خامس أكبر أقمار زحل، من جليد مائي شبه نقي، يشقه وادٍ سحيق وفوهة ضخمة",
        "dione": "قمر جليدي لزحل يتزين جانبه الخلفي بشبكة من جروف الجليد الساطعة",
        "rhea": "ثاني أكبر أقمار زحل، كرة ثلج متجمدة متسخة من جليد وصخر",
        "iapetus": "ثالث أكبر أقمار زحل: جانب منه داكن كالفحم، والآخر أسطع بعشر مرات",
        "miranda": "أصغر أقمار أورانوس الخمسة الكبيرة، فيه أودية يصل عمقها إلى 12 ضعف عمق غراند كانيون",
        "ariel": "أسطع أقمار أورانوس الخمسة الكبيرة وأحدثها مظهرًا، تقطعه أودية صدعية",
        "umbriel": "أغمق أقمار أورانوس الكبيرة، يعكس نحو خُمس الضوء الذي يصله",
        "titania": "أكبر أقمار أورانوس، رمادي محايد، تشقه أودية صدعية يقارب طولها 1 600 كم",
        "oberon": "ثاني أكبر أقمار أورانوس، داكن، مليء بالفوهات، ويحمل جبلًا ارتفاعه 6 كم"
      }
    }
  },
  "live": {
    "label": "من الأرض الآن",
    "km": "كم",
    "light": "يستغرق الضوء",
    "lightYears": "سنة ضوئية",
    "noteFar": "محسوب من الموضع المرسوم، بثلاثة أرقام. ولا يتغير مع الثواني.",
    "note": "محسوب من المدار المرسوم. الأرقام الأخيرة تُظهر حركته، لا مكانه بدقة كيلومتر.",
    "seconds": "{s} ث",
    "minSec": "{min} د {s} ث",
    "hourMinSec": "{h} س {min} د {s} ث",
    "sparkLabel": "البعد عن الأرض",
    "sparkAria": "البعد عن الأرض من {from} إلى {to}. {closest}",
    "sparkNow": "الآن",
    "closest": "الأقرب: {date} · {dist}",
    "closestAbout": "الأقرب: نحو {date} · {dist}",
    "months": [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر"
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "اضبط الساعة على أقرب اقتراب",
    "moonDistances": "{n} أضعاف مسافة القمر",
    "au": "{n} و.ف",
    "sparkNote": "محسوب من المدار المرسوم، بنقطة كل ستة أيام.",
    "sparkApprox": "على هذا القرب يكون التاريخ والبعد تقريبيين: فجذب الأرض مُغفل.",
    "upYears": "في الأعلى منذ {n} سنة: أُطلق {date}",
    "upOneYear": "في الأعلى منذ سنة واحدة: أُطلق {date}",
    "upUnderAYear": "في الأعلى منذ أقل من سنة: أُطلق {date}",
    "upSinceYear": "أُطلق عام {year}: نحو {n} سنة في الأعلى",
    "upSinceYearNew": "أُطلق عام {year}",
    "smallBodyHonest": "محسوب من مداره لأفق عند مستوى سطح البحر. أن يكون فوق الأفق لا يعني أنه ساطع بما يكفي ليُرى: معظمها يحتاج إلى تلسكوب."
  },
  "crew": {
    "label": "الأشخاص على متنه",
    "count": "عدد من على متنه: {n}",
    "countOne": "شخص واحد على متنه",
    "hint": "على متنه: {n}",
    "person": "{agency} · {days} يوم في الأعلى",
    "personNoAgency": "{days} يوم في الأعلى",
    "dockedLabel": "الراسية الآن، ومنذ متى",
    "docked": "{port} · {date}",
    "asOf": "قُرئ {age} من Launch Library 2 (The Space Devs).",
    "stale": "قُرئ في {date}: أقدم من يومين، فقد يكون تغيّر.",
    "joined": "الأسماء هي طواقم المركبات الراسية الآن.",
    "unmatched": "لم تطابق الأسماء المحفوظة هذا العدد، فلا تُعرض.",
    "waiting": "نقرأ قائمة الطاقم.",
    "none": "لا قائمة طاقم لهذه المحطة."
  },
  "happened7": {
    "launchesFrom": "من {place}",
    "reached": "بلغ المدار",
    "failed": "لم يبلغ المدار",
    "partial": "بلغ المدار، لكن ليس المدار المخطط",
    "launchDetail": "{rocket}: {status}، {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "عاد إلى الأرض في {date} (تاريخ التحلل في الفهرس)",
    "debris": "و{n} قطعة حطام",
    "debrisOne": "وقطعة حطام واحدة",
    "showAll": "أظهر الكل ({n})",
    "showFewer": "أظهر أقل",
    "asOf": "الإطلاقات قُرئت {age} من Launch Library 2.",
    "stale": "الإطلاقات قُرئت في {date}: أقدم من يومين.",
    "none": "لا شيء مسجّل للأيام السبعة الأخيرة.",
    "waiting": "نقرأ ما حدث.",
    "decays": "ما عاد إلى الأرض",
    "decaysTitle": "يقرأ الفهرس كله، نحو 1.5 ميغابايت",
    "decaysNone": "لم يعد إلى الأرض شيء كامل في الأيام السبعة الأخيرة.",
    "decaysFailed": "تعذرت قراءة الفهرس.",
    "flyTitle": "طِر إلى حيث أُطلق",
    "ago": "{age}"
  },
  "oldest": {
    "label": "الأطول بقاءً في الأعلى",
    "row": "{years} سنة · أُطلق {date}",
    "note": "حمولات وأجسام صواريخ ما زالت في المدار، بحسب تاريخ الإطلاق في الفهرس.",
    "showTitle": "أظهره على الخريطة"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "يفتح صفحة {publisher} نفسها في علامة تبويب جديدة"
  },
  "placeKeep": {
    "group": "مكانك",
    "change": "غيّر المكان",
    "changeTitle": "مدينة، أو حيث يقول المتصفح إنك",
    "remember": "تذكّر هذا المكان",
    "rememberTitle": "يحتفظ به في هذا المتصفح فقط، إلى أقرب 0.1°",
    "forget": "انسَ هذا المكان",
    "forgetTitle": "يزيل المكان المحفوظ في هذا المتصفح",
    "kept": "محفوظ في هذا المتصفح فقط.",
    "share": "شارك هذا المكان",
    "shareTitle": "ينسخ رابطًا يحمل هذا المكان إلى أقرب 0.1°",
    "copied": "نُسخ الرابط. يحمل هذا المكان بدقة 0.1°.",
    "copyFailed": "تعذر نسخ الرابط."
  },
  "scale": {
    "least": "الكواكب مرسومة أكبر بـ×{n} على الأقل",
    "one": "{name} مرسوم أكبر بـ×{n}",
    "title": "النقاط أعرض من الكواكب. اضغط للحجم الحقيقي.",
    "trueLine": "الحجم الحقيقي: عرض {name} هنا {px} بكسل",
    "trueTitle": "أعرض الكواكب، مع إخفاء النقاط. اضغط لرسمها من جديد."
  },
  "launchChip": {
    "opens": "اضغط لبطاقته",
    "train": "قطار Starlink جديد من {n} فوقك {when}"
  },
  "welcome": {
    "label": "الزيارة الأولى",
    "title": "أول مرة هنا",
    "dots": "كل نقطة شيء حقيقي. اضغط واحدة.",
    "move": "اسحب لتدير. مرّر لتقترب.",
    "moveTouch": "اسحب لتدير. اقرص لتقترب.",
    "trips": "الرحلة الموجّهة قصة واحدة في دقائق.",
    "trip": "رحلة موجّهة",
    "tripTitle": "يبدأ أول رحلة في القائمة",
    "look": "تجوّل",
    "lookTitle": "يزيل هذه الأسطر"
  },
  "opening": {
    "label": "الافتتاح",
    "from": "من {source}",
    "wait": "نجهّز الرحلة",
    "skip": "أي مفتاح أو ضغطة يتخطى هذا"
  },
  "base": {
    "label": "العودة إلى القاعدة",
    "title": "العودة إلى القاعدة: الأرض، الآن، دون تحديد شيء",
    "name": "القاعدة",
    "trip": "غادر الرحلة وعُد إلى القاعدة"
  },
  "exoface": {
    "tag": "تصور فني",
    "measured": "مقيس: {parts}.",
    "estimated": "مقدَّر: {parts}.",
    "least": "على الأقل {n} من كتل الأرض.",
    "radius": "{n} من أنصاف أقطار الأرض",
    "mass": "{n} من كتل الأرض",
    "a": "\u200b",
    "an": "\u200b",
    "yearHours": "{a} سنة مدتها {n} ساعة",
    "yearDays": "{a} سنة مدتها {n} يومًا",
    "yearYears": "دورة مدتها {n} سنة",
    "join": "، ",
    "missing": "—",
    "surface": "السطح متخيَّل.",
    "clouds": "قمم السحب متخيَّلة.",
    "nothingMeasured": "لا شيء هنا مقيس.",
    "whole": "العالم كله متخيَّل.",
    "imaginedName": "عالم متخيَّل رقم {n}",
    "another": "عالم آخر",
    "back": "العودة إلى الخريطة",
    "stageLabel": "عالم متخيَّل",
    "why": "مرسوم على هيئة {cls}، {climate}: محسوب، وليس مرئيًا.",
    "whyGiant": "مرسوم على هيئة {cls}: محسوب من حجمه، وليس مرئيًا.",
    "cls": {
      "rock": "عالم صخري",
      "superEarth": "أرض فائقة",
      "water": "عالم مائي",
      "miniNeptune": "نبتون صغير",
      "iceGiant": "عملاق جليدي",
      "gasGiant": "عملاق غازي"
    },
    "climate": {
      "lava": "منصهر تحت نجمه",
      "desert": "حار وجاف",
      "temperate": "معتدل بما يكفي لبحار",
      "snowball": "متجمد بالكامل",
      "eyeball": "أحد وجهيه دائمًا نحو نجمه"
    }
  },
  "deep": {
    "inside": "داخل {parent}",
    "companion": "رفيق لـ{parent}",
    "kinds": {
      "HII": "سديم انبعاثي",
      "PN": "سديم كوكبي",
      "SNR": "بقايا مستعر أعظم",
      "RfN": "سديم انعكاسي",
      "DrkN": "سديم مظلم",
      "GCl": "عنقود كروي"
    },
    "back": "العودة إلى {parent}",
    "backTitle": "طِر إلى {parent} الذي يحيط به"
  },
  "deepHelix": {
    "card": {
      "helix": "ضوؤه مأخوذ من صورة ESO الفوتوغرافية، وشكله من O’Dell وMcCullough وMeixner (2004): قرص داخلي مائل 23° وحلقة خارجية مائلة 53°. والعُقد موضوعة عند أبعادها المقيسة. لم يراجعه فلكي بعد."
    },
    "how": "يُظهر Hubble والتلسكوبات الأرضية قطعين ناقصين، 499″ في 459″ و742″ في 446″. وبقراءتهما دائرتين مرئيتين بميل، تكونان حلقتين مائلتين 23° و53°، وتقول سرعات العُقد نحونا وبعيدًا عنا أي جانب من كل حلقة هو الأقرب (O’Dell وMcCullough وMeixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "هذا النموذج مبني من صورته الفوتوغرافية ومن عدّ Gaia لنجومه، ومائل كما قيس."
    },
    "rows": {
      "dso-lmc": [
        [
          "عمق نجومه",
          "لا يُقاس نجمًا نجمًا: على هذا البعد يكون اختلاف منظر النجم أصغر من أن يُقاس. فالنموذج ينشر نجومه ضمن السماكة المعروفة للقرص."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "العمق داخل سحابة ماجلان الكبرى",
          "غير مقيس: يُرسم على بعد السحابة في اتجاهه. وعلى القرص المائل قد يقع أقرب بنحو 2 000 سنة ضوئية."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "حافة الكون المرصود",
    "horizonNow": "يبعد الآن نحو {n} مليار سنة ضوئية",
    "horizonWhy": "انطلق ضوؤه قبل {age} مليار سنة؛ وقد تمدد الفضاء منذئذ",
    "edge": "{n} مليار سنة ضوئية: ما وراء كل ما نستطيع رؤيته",
    "edgeWhy": "ينتهي الكون المرصود على بعد نحو {h} مليار سنة ضوئية.",
    "edgeNothing": "لا شيء مقيس يقع هنا: هذا النطاق رسم توضيحي.",
    "cmbTitle": "أقدم ضوء، كما تُظهره سماؤنا",
    "cmbWhen": "غادر بعد نحو {k} سنة من الانفجار العظيم",
    "cmbPainted": "مرسوم داخل الكرة التي غادر منها: رسم توضيحي",
    "cmbElse": "ومن أي مكان آخر تختلف الخريطة",
    "cmbCold": "−{n} µK",
    "cmbMid": "المتوسط {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "مقياس الألوان: الأزرق حتى {n} من المليون من الدرجة أبرد من {t} كلفن، والبرتقالي حتى {n} أدفأ",
    "cmbSource": "خريطة WMAP لتسع سنوات، NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "ضوؤه مأخوذ من صورة ESO الفوتوغرافية، وشكله مُعاد بناؤه عن Wen وO’Dell (1995) وO’Dell (2001): طبقة رقيقة متوهجة على الوجه القريب لسحابة مظلمة، والترابيزيوم أمامها بنحو 0.2 فرسخ فلكي. لم يراجعه فلكي بعد."
    },
    "rows": {
      "dso-m42": [
        [
          "شكله في العمق",
          "مُعاد بناؤه. قرب الترابيزيوم هو مقيس: الطبقة المتوهجة تقع خلف ألمع نجومه بنحو 0.2 فرسخ فلكي. أما أبعد من ذلك فيتبع العمق الصورة المنشورة لوعاء ينفتح نحونا، وليس قياسًا."
        ],
        [
          "خلفه",
          "السحابة الجزيئية المظلمة التي نُحت منها السديم. ومن الخلف يختبئ السديم فيها."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-m43": [
        [
          "شكله في العمق",
          "مُعاد بناؤه: تجويف أصغر على السحابة نفسها، يضيئه النجم NU Orionis. وعمقه غير مقيس."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ]
    },
    "how": "يأتي توهج السديم من طبقة رقيقة يلتهم فيها ضوء ألمع نجوم الترابيزيوم سحابة مظلمة. ورسم Wen وO’Dell (1995) بُعد تلك الطبقة خلف النجم من سطوعها، لأن البقعة الأقرب منها تتلقى ضوءًا أكثر."
  },
  "r12Truth": {
    "here": "على هذه البطاقة",
    "words": "الكلمات، في كل مكان",
    "terms": "كلمات على هذه البطاقة",
    "rows": {
      "where": "أين هو",
      "drawnNow": "المرسوم الآن",
      "drawn": "ما هو مرسوم",
      "photo": "صورة بواسطة",
      "filters": "المرشحات",
      "colours": "الألوان",
      "taken": "التُقطت",
      "released": "نُشرت",
      "sky": "السماء المعروضة",
      "survey": "المسح بواسطة",
      "look": "المظهر"
    },
    "span": "{a} إلى {b}",
    "notPublished": "التاريخ غير منشور",
    "position": {
      "measured": "رآه جهاز في وقت معروف",
      "inferred": "محسوب انطلاقًا من قياس أقدم",
      "illustrative": "مرسوم لإيضاح الفكرة، وليس مقيسًا",
      "sample": "بيانات عينة مرفقة، وليست مباشرة"
    },
    "drawn": {
      "photograph": "ضوء حقيقي، مصوَّر من جانبنا",
      "reconstruction": "شكل ثلاثي الأبعاد معاد بناؤه من دراسة منشورة",
      "model": "نموذج لنوعه، وليس نجومه هو",
      "catalogue": "مواضع قاسها مسح",
      "illustration": "مرسوم ليُظهر نوعه، لا هو"
    },
    "colours": {
      "broadband": "مرشحات لونية عريضة",
      "mixed": "مرشحات لونية وهيدروجين",
      "narrowband": "غازات مرسومة بألوان",
      "unstated": "غير مذكور"
    },
    "falseColour": "{band}، ألوان زائفة",
    "glossary": [
      {
        "term": "فرسخ فلكي",
        "match": [
          "kpc"
        ],
        "say": "نحو 3.26 سنة ضوئية: المسافة التي يبدو منها مدار الأرض بعرض ثانية قوسية واحدة. وتكتب الأوراق pc، وkpc للألف."
      },
      {
        "term": "مليون سنة ضوئية",
        "match": [
          "مليون سنة"
        ],
        "say": "مليون سنة ضوئية، تُكتب Mly. وأندروميدا، أقرب مجرة كبيرة، تبعد نحو 2.5 مليون."
      },
      {
        "term": "مليار سنة ضوئية",
        "match": [
          "مليار سنة"
        ],
        "say": "ألف مليون سنة ضوئية، تُكتب Gly. وحافة ما نستطيع رؤيته تبعد الآن نحو 46 مليار سنة ضوئية."
      },
      {
        "term": "زمن الاسترجاع",
        "match": [
          "غادره ضوؤه"
        ],
        "say": "منذ متى غادر الضوء الذي نراه شيئًا ما. ومن المجرات البعيدة تكون المدة مليارات السنين: فنراها كما كانت حينها."
      },
      {
        "term": "المسافة المصاحبة",
        "match": [
          "المصاحبة",
          "مليار سنة ضوئية"
        ],
        "say": "كم يبعد شيء ما الآن، مع حساب مقدار تمدد الفضاء منذ غادره ضوؤه. وعلى البعد الكبير تكون أكثر مما يوحي به زمن سفر الضوء."
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "المظهر: {mode}"
  },
  "r12Sun": {
    "image": "نصف الشمس الذي واجه الأرض هو صورة مرصد ديناميكا الشمس (SDO) الملتقطة عند {time} UTC في {date}، وقد أُدير مع دوران الشمس منذئذ: ضوء فوق بنفسجي متطرف عند {wl} أنغستروم من غاز قريب من مليون درجة في الحلقات فوق السطح، بألوان SDO الزائفة ومرسوم أسطع. أما الجانب البعيد، الذي لم يره، فمرسوم من نموذج بالألوان الزائفة نفسها، ويمتزج الاثنان حيث يلتقيان. وهي صورة تصفح، وليست للعلم. بإذن من NASA/SDO وفرق AIA وEVE وHMI العلمية.",
    "loops": "الحلقات الذهبية فوق {n} من مناطق اليوم النشطة توضيحية: أماكنها من NOAA، أما أشكالها وارتفاعاتها وعددها فلا. وفي المظهر المقيس تُزال.",
    "loopsOne": "الحلقات الذهبية فوق إحدى مناطق اليوم النشطة توضيحية: المكان من NOAA، أما الأشكال والارتفاعات والعدد فلا. وفي المظهر المقيس تُزال.",
    "none": "تعذرت قراءة أي صورة للشمس اليوم، فيُرسم القرص كله."
  },
  "r12Nearby": {
    "castShadows": "ظلاله تلقيها ارتفاعات الأرض نفسها، من {title}، حيث تقف الشمس الآن وبالمقياس الحقيقي: مقيسة، بارتفاع واحد كل 670 م في أفضل الأحوال، فلا تُلقي فوهة أصغر من نحو كيلومترين أي ظل.",
    "sunriseModelled": "لونه عند الشروق والغروب منمذج: ضوء الشمس محمرّ بالهواء الذي لامسه، بتشتت رايلي فقط."
  },
  "r12Giants": {
    "spot": "إلا واحدة: البقعة الحمراء العظمى موضوعة عند خط الطول {l2}° في النظام II، محمولة من حيث قاسها فريق JUPOS والجمعية الفلكية البريطانية في {date} ({at}°) بمعدل {rate}° في الشهر، وهو منتصف الانجرافين اللذين قاساهما في تلك السنة ({lo} و{hi})، فقد تكون الآن على بعد {pm}° على أي من الجانبين. وتُدار الخريطة لتضعها هناك، وتدور معها سحبها الأخرى.",
    "rings": {
      "uranus": "حلقاته عند أبعادها المقيسة وبقتامتها الحقيقية: تعكس جسيماتها نحو 1.5 % من الضوء، أي جزءًا من ثلاثين مما تعكسه سحبه، فهي أمام الكوكب خيوط داكنة؛ وهي مرسومة أعرض بـ10 مرات مما هي لتظهر، ويرفعها تعريض «عميق» 4 مرات، كما يفعل التعريض الطويل",
      "jupiter": "حلقته الخافتة عند الأبعاد والأعماق البصرية التي تعطيها صحيفة حقائق NASA: الهالة والحلقة الرئيسية، غبار وحبيبات داكنة تحجب بضعة أجزاء من المليون من الضوء؛ أما الحلقتان الخافتتان الأرق وراءهما فغير مرسومتين. ومن جهة الشمس لا يكاد يُرى شيء؛ ومع الشمس خلفه يلقي الغبار الضوء إلى الأمام فيظهر، كما ظهر لـGalileo وNew Horizons من الجانب الليلي. ولكي يظهر أصلًا يُرسم أسطع بـ8 000 مرة مما هو في تعريض «الكاميرا» وبـ40 000 مرة في «عميق»؛ وفي «العين» لا يُرسم، وهذا ما سيبدو عليه، ولا يُرسم كذلك في أدنى جودة. والهالة بسُمك نحو 10 000 كم وتُرسم مسطحة، لا أسطع مما يسمح به سمكها؛ وكيف تخبو الهالة نحو الداخل وتزداد الحلقة الرئيسية كثافة نحو حافتها الخارجية الحادة، وما حصة الغبار من الضوء، وكم يلقيه إلى الأمام، ولون الحلقة المحمر، وأسطع ما تُرسم به، كل ذلك توضيحي"
    }
  },
  "r12Plumes": {
    "line": "الأعمدة مرسومة كما رُئيت: {list}.",
    "item": "{name}، بارتفاع نحو {km} كم ({by}، {when})",
    "jets": "نفّاثات الخطوط النمرية الأربعة، بارتفاع {km} كم على الأقل ({by}، {when})",
    "truth": "أماكنها وارتفاعاتها مقيسة؛ أما أقواس الحبيبات فنموذج، وضوؤها ممدود لتُرى. وقد لا تثور الآن.",
    "stripes": "الخطوط مرسومة مستقيمة من مراكز وأطوال القاموس الجغرافي، وأماكن النفّاثات الـ101 على امتدادها نموذج.",
    "column": "أعمدة داكنة حملتها الرياح إلى الغرب عند قممها؛ وعرض العمود غير معروف ومرسوم ضيقًا.",
    "hot": "النقاط البرتقالية على الجانب الليلي بقع ساخنة تتوهج فيها الحمم ({list}): أماكنها مقيسة، وسطوعها لا.",
    "film": "في المظهر السينمائي تطير الحبيبات في أقواسها أسرع من الساعة بـ{k} مرة.",
    "still": "هي ثابتة، كما في المظهر المقيس أو عند تقليل الحركة.",
    "review": "لم يراجعه فلكي بعد.",
    "span": "{a} إلى {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "نجومه",
      "lightLabel": "ضوؤها",
      "depthLabel": "عمقها",
      "reviewLabel": "المراجعة",
      "globularStars": "نموذج لنوعه، وليس نجومه هو: {n} نجمًا أسطع من نقطة الانعطاف، موضوعة بمنحنى King مع نصف القطر النووي لدى Harris ({rc} سنة ضوئية) ونصف القطر المدّي ({rt}). عددها وسطوعها وألوانها نموذج.",
      "globularLight": "معًا نحو {pct}% من ضوء العنقود (القدر المطلق {mv})؛ والنجوم الخافتة التي لا تمثلها نقطة هي الوهج. مرسوم حتى القدر 10، كما يُظهره تعريض الكاميرا.",
      "openStars": "{n} عضوًا من Gaia (Hunt وReffert 2023، {name})، لكل منهم احتمال عضوية لا يقل عن {p}، داخل نصف قطره المدّي. مرسومة حتى القدر 10، كما يُظهرها تعريض الكاميرا.",
      "openStarsHyg": "{n} عضوًا من Gaia (Hunt وReffert 2023، {name})، لكل منهم احتمال عضوية لا يقل عن {p}، داخل نصف قطره المدّي؛ و{h} أسطع منها هي نجوم فهرس الخريطة نفسه. مرسومة حتى القدر 10، كما يُظهرها تعريض الكاميرا.",
      "openDepthSome": "{m} موضوعة باختلاف منظرها الخاص؛ والـ{k} الأخرى على بعد العنقود، وعمقها داخله منمذج.",
      "openDepthNone": "اتجاهاتها مقيسة؛ وعمقها داخل العنقود منمذج، لأن اختلاف منظر النجم الواحد على هذا البعد غير دقيق بما يكفي.",
      "review": "لم يراجع فلكي هذا النموذج بعد."
    }
  },
  "a45": {
    "farNote": "كم يبعد الآن ({how})، من انزياحه نحو الأحمر {z} في كون Planck 2018",
    "comoving": "المسافة المصاحبة",
    "pulsarDistance": [
      "من اختلاف المنظر الخاص بالنجم النابض",
      "بعد العنقود الكروي أو بقايا المستعر الأعظم أو الجرم الآخر الذي ينتمي إليه",
      "تقدير نموذج من الإشارة الراديوية (نموذج YMW16 للإلكترونات الحرة في المجرة)، وليس قياسًا: وقد يكون بعيدًا عن الصواب"
    ],
    "shape": {
      "galaxy": "علامة على البعد الذي يعطيه انزياحه نحو الأحمر؛ والمجرة بهذا البعد بضعة بكسلات عرضًا على الأكثر، فلا يُرسم شكلها",
      "browndwarf": "حلقة عند بعده المقيس؛ والقزم البني نقطة بهذا المقياس ولا يصدر ضوءًا مرئيًا يكاد يُذكر",
      "whitedwarf": "حلقة عند بعده المقيس؛ والقزم الأبيض نفسه نقطة بهذا المقياس",
      "cluster": "علامة عند مركز العنقود بالأشعة السينية؛ ولا تُرسم المجرات الأعضاء إلا لعناقيد Virgo وComa وFornax وPerseus (مرحلة المجموعة المحلية)"
    },
    "quasarZ7": "كوازار نراه كما كان بعد نحو {age} مليون سنة من الانفجار العظيم: واحد من {n} معروفة وراء الانزياح نحو الأحمر 7.",
    "unplaced": {
      "unnamed": "نجم HYG {id}",
      "lead": "{name} نجم في الاتجاه الذي تنظر إليه؛ ولم يقس أحد كم يبعد",
      "leadColour": "{name} {a} نجم {colour} في الاتجاه الذي تنظر إليه؛ ولم يقس أحد كم يبعد",
      "note": "مرسوم على السماء وليس في أي مكان من الفضاء، لأن المكان يحتاج إلى بعد.",
      "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): الاتجاه والقدر فقط"
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "نقطة ساطعة حيث يضعها انزياحه نحو الأحمر، مع حلقة تعلّم المكان؛ وقرصه ونفّاثه أصغر بكثير من أن يُرسما",
      "host": "تُرسم مجرته المضيفة خافتة ومستديرة بالحجم الزاوي الذي يعطيه المصدر، {size} ثانية قوسية عرضًا كما تُرى من هنا؛ وهذا في الحقيقة نحو {ly} سنة ضوئية. أما تفلطحها وميلها فغير مرسومين.",
      "point": "لا يعطي المصدر حجمًا لمجرته المضيفة، فلا يُرسم شيء."
    },
    "cluster": {
      "members": "{n} مجرة عضوًا من {catalogue}؛ {own} منها عند أبعاد قيست واحدة واحدة.",
      "membersNoOwn": "{n} مجرة عضوًا من {catalogue}.",
      "distanceSbf": "يبعد العنقود {mpc} ميغابارسك ({mly} مليون سنة ضوئية)، وهو متوسط أبعاد وُجدت من تقلبات السطوع السطحي.",
      "distanceZ": "يبعد العنقود {mly} مليون سنة ضوئية: متوسط انزياح أعضائه نحو الأحمر ({z})، محمولًا إلى مسافة مصاحبة في كون الخريطة الوحيد.",
      "depthMeasured": "المجرة التي لا بعد خاص بها تُنشر في العمق بتشتت العنقود المقيس، {rms} ميغابارسك؛ وذلك الوضع نموذج.",
      "depthModelled": "لا مجرة هنا لها بعد خاص بها، فتُنشر في العمق بالاتساع نفسه الذي في السماء، كأن العنقود كروي؛ وذلك الوضع نموذج.",
      "size": "كل مجرة بعرض ما يقوله نصف قطر نصف الضوء في الفهرس، مرسومة شكلًا مستديرًا ساطعًا في مركزه؛ أما تفلطحها وميلها فغير مرسومين."
    }
  },
  "deepRing": {
    "card": {
      "m57": "ضوؤه مأخوذ من صورة Hubble الفوتوغرافية، وشكله من O’Dell وFerland وHenney وPeimbert (2013): حلقة سميكة مائلة 13.5°، تُرى من قرب محورها، والغاز الأزرق في وسطها مرسوم ممتدًا نحونا وبعيدًا عنا. وألوانه ألوان الصورة، التُقطت عبر مرشحات ضيقة. لم يراجعه فلكي بعد.",
      "m27": "ضوؤه مأخوذ من صورة NOIRLab الفوتوغرافية، معروضًا بألوان غازاته نفسها؛ وشكله إعادة بناء: الخصر الساطع حلقة سميكة تُرى من جانبها تقريبًا، والأذنان الأخفت فصاه، بحسب سرعات القشور التي قاسها Meaburn وآخرون (2005). لم يراجعه فلكي بعد.",
      "southern-ring": "ضوؤه مأخوذ من صورة Webb الفوتوغرافية بالأشعة تحت الحمراء؛ وشكله يتبع Kastner وآخرين (2024) وDe Marco وآخرين (2022): حلقة تُرى من قرب محورها، وفقاعة عبرها وهالة جزيئية حولهما. لم يراجعه فلكي بعد."
    },
    "rows": {
      "dso-m57": [
        [
          "بعده",
          "اختلاف المنظر (Gaia DR3) لنجمه المركزي، Gaia DR3 2090486618786534784: 1.270 ± 0.044 ملّي ثانية قوسية، نحو 2 570 سنة ضوئية (2 480 إلى 2 660)."
        ],
        [
          "شكله في العمق",
          "معاد بناؤه. حجم الحلقة في السماء وميل محورها الطويل وأي طرف أقرب مقيسة. أما سُمكها وهيئة الغاز عبر وسطها فلا: وهي مرسومة رسمًا توضيحيًا."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-m27": [
        [
          "شكله في العمق",
          "معاد بناؤه. حجمه وزاويته في السماء وسرعات قشوره مقيسة؛ أما كون الخصر حلقة تُرى من جانبها تقريبًا، وكيف تمتد أذناه نحونا وبعيدًا عنا، فهو القراءة المعتادة لسديم بهذا المظهر، ومرسوم رسمًا توضيحيًا."
        ],
        [
          "ألوانه",
          "ألوان غازاته نفسها، من المرشحات الضيقة للصورة: الأكسجين أزرق مخضر، والهيدروجين والكبريت أحمر. وقوة إظهار كل منها اختيارنا."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-southern-ring-nebula": [
        [
          "شكله في العمق",
          "معاد بناؤه. أن حلقته الساطعة تُرى من 15 إلى 30° عن محورها مقيس (Kastner وآخرون، 2024)؛ أما أي جانب أقرب وسُمك الحلقة وطول الفقاعة فتوضيحية."
        ],
        [
          "ألوانه",
          "ضوء تحت أحمر لا تراه عين، أعطاه صانعو صور Webb ألوانًا."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ]
    },
    "how": "تُظهر صور Hubble بألوان ضوء مفردة، مع سرعات الغاز المقيسة عبر السديم، حلقة سميكة تقابلنا تقريبًا: محورها الطويل مائل 13.5°، وطرفه الشمالي الشرقي أقرب إلينا. ويملأ وسطها غاز أسرع يمتد نحونا وبعيدًا عنا على امتداد خط نظرنا (O’Dell وFerland وHenney وPeimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "crab": "ضوؤه مأخوذ من صورة Hubble الفوتوغرافية، بألوان زائفة، محمولًا على قشرة يتبع شكلها Martin وMilisavljevic وDrissen (2021): قفص من الخيوط بطول نحو 4 فراسخ فلكية حول وسط فارغ. لم يراجعه فلكي بعد.",
      "veil": "ضوؤه مأخوذ من صورة NOIRLab الفوتوغرافية، بألوان زائفة، محمولًا على كرة رقيقة بعرض 37 فرسخًا فلكيًا (Fesen وآخرون، 2018): والخيوط هي حافتها تُرى من جانبها. لم يراجعه فلكي بعد.",
      "horsehead": "عتمته مقروءة من صورة NOIRLab الفوتوغرافية: غبار أمام الغاز المتوهج لـIC 434، يمتص ما وراءه ويحمرّه ولا يصدر ضوءًا. لم يراجعه فلكي بعد.",
      "coalsack": "عتمته مقروءة من درب التبانة حوله: سحابة غبار على بعد نحو 590 سنة ضوئية تخفت النجوم وراءها وتحمرّها. لم يراجعه فلكي بعد.",
      "m78": "ضوؤه صورة NOIRLab الفوتوغرافية: غبار يشتت الضوء الأزرق للنجم الذي أمامه، على وجه سحابة مظلمة. وعمقه معاد بناؤه. لم يراجعه فلكي بعد.",
      "iris": "ضوؤه صورة NOIRLab الفوتوغرافية: غبار يشتت ضوء النجم الفتي HD 200775 في تجويف من سحابته. وعمقه معاد بناؤه. لم يراجعه فلكي بعد.",
      "m45": "ضوؤه صورة NOIRLab الفوتوغرافية: سحابة غبار تنجرف عبر العنقود، أمام نجومه مباشرة، تشتت ضوءها الأزرق (Ritchey وآخرون، 2006). وعمقه معاد بناؤه. لم يراجعه فلكي بعد."
    },
    "rows": {
      "dso-m1": [
        [
          "شكله في العمق",
          "معاد بناؤه من محيط مقيس. تمتد الخيوط نحو فرسخين فلكيين على محور رياح النجم النابض، ولا يقع أي منها ضمن نصف فرسخ من المركز (Martin وآخرون، 2021). ومرسومة مجسّمًا ناقصيًا على ذلك المحور؛ أما أي طرف أقرب إلينا فمفترض."
        ],
        [
          "ألوانه",
          "ألوان زائفة: المرشحات الضيقة في الصورة للأكسجين والكبريت، حوّلها صانعو الصورة إلى ألوان."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-veil-nebula": [
        [
          "شكله في العمق",
          "معاد بناؤه: كرة بعرض 37 فرسخًا فلكيًا، الحجم والبعد اللذان قاسهما Fesen وآخرون (2018). وسُمك القشرة توضيحي."
        ],
        [
          "ألوانه",
          "ألوان زائفة: المرشحات الضيقة في الصورة للأكسجين والكبريت والهيدروجين، حوّلها صانع الصورة إلى ألوان."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "شكله في العمق",
          "معاد بناؤه. الغبار أمام الغاز المتوهج لـIC 434، كما رُصد؛ أما كم هو أمامه وما سُمكه فتوضيحي."
        ],
        [
          "ما يفعله الغبار",
          "يمتص فقط: النجوم والوهج وراءه تخفت، وفي الأزرق أكثر منها في الأحمر، فتبدو أكثر احمرارًا. ولا يصدر ضوءًا خاصًا به."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-coalsack": [
        [
          "مدى عتمته",
          "مقروء من مقدار ما يكون درب التبانة هنا أغمق مما هو على البعد نفسه من خطه الأوسط قريبًا. وهذا تقدير وأقل مما تعطيه خرائط الأشعة تحت الحمراء، لأن النجوم أمام السحابة تضيف ضوءها."
        ],
        [
          "ما يفعله الغبار",
          "يمتص فقط: النجوم وراءه تخفت وتحمرّ. أما النجوم أمامه فلا. وجزء من العتمة نحو الشمال الشرقي سحابة ثانية بعيدة جدًا خلفه، مرسومة هنا على البعد القريب."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-m78": [
        [
          "شكله في العمق",
          "معاد بناؤه: الغبار المضاء صفيحة، ونجمها أمامها وسحابة مظلمة وراءها. والأعماق توضيحية."
        ],
        [
          "من جانب آخر",
          "منمذج: يشتت الغبار ضوءًا إلى الأمام أكثر مما يشتته جانبيًا، فمن جانب آخر يبدو الغبار نفسه أسطع أو أخفت."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-iris-nebula": [
        [
          "شكله في العمق",
          "معاد بناؤه: الجدران المضاءة صفيحة، والنجم أمامها وسحابة مظلمة وراءها. والأعماق توضيحية."
        ],
        [
          "من جانب آخر",
          "منمذج: يشتت الغبار ضوءًا إلى الأمام أكثر مما يشتته جانبيًا، فمن جانب آخر يبدو الغبار نفسه أسطع أو أخفت."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ],
      "dso-m45": [
        [
          "شكله في العمق",
          "معاد بناؤه. الغاز أمام النجوم، كما يُظهر ضوؤها؛ أما كم هو أمامها وما سُمك الغبار فتوضيحي، وأعماق النجوم نفسها داخل العنقود نموذج ثابت، وليست مقيسة."
        ],
        [
          "ما يفعله الغبار",
          "يشتت ضوء النجوم، والأزرق أكثر، فيتوهج أزرق حول ألمعها، Merope وMaia أكثر من غيرهما. وهو سحابة عابرة، وليس ما وُلدت منه النجوم."
        ],
        [
          "المراجعة",
          "لم يراجع فلكي هذا النموذج بعد."
        ]
      ]
    },
    "how": "يطير غاز البقايا إلى الخارج بسرعة ثابتة، فتقول سرعته نحونا أو بعيدًا عنا كم هو أمام المركز أو خلفه. وبهذه الطريقة حوّل Martin وMilisavljevic وDrissen (2021) 310 000 طيف لسديم السرطان إلى شكله."
  },
  "r12Navigate": {
    "chainLabel": "أين هو",
    "chainTitle": "طِر إلى {name}",
    "milkyWay": "درب التبانة",
    "outside": "خارج درب التبانة",
    "the": [
      "الشمس",
      "القمر",
      "درب التبانة"
    ],
    "theWord": "\u200b",
    "backParent": "العودة إلى {parent}",
    "backParentTitle": "طِر إلى {parent}",
    "legendTitle": "افتح دليل الرموز: معنى كل كلمة من هذه",
    "label": "أين أنت",
    "title": "أين الكاميرا على السلّم، من الأرض إلى المجموعة المحلية",
    "back": "رجوع",
    "backTo": "العودة إلى {name}",
    "sep": "›",
    "rungs": {
      "earth": "الأرض",
      "sun": "المجموعة الشمسية",
      "stellar": "النجوم القريبة",
      "galaxy": "درب التبانة",
      "local-group": "المجموعة المحلية"
    },
    "notes": {
      "sun": "مُسرَّع: الشمس تبعد {distance}",
      "stellar": "مُسرَّع: أقرب نجم يبعد {distance}",
      "galaxy": "مُسرَّع: مركز مجرتنا يبعد {distance}",
      "local-group": "مُسرَّع: أندروميدا تبعد {distance}"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "الشمس",
      "ROCKY_PLANET": "كواكب صخرية",
      "GAS_GIANT": "عمالقة غازية",
      "ICE_GIANT": "عمالقة جليدية",
      "RINGS": "حلقات",
      "VOLCANIC_MOON": "قمر بركاني",
      "ICY_MOON": "أقمار جليدية",
      "TITAN": "قمر ذو غلاف جوي",
      "AIRLESS_MOON": "أقمار بلا هواء",
      "DWARF_PLANET": "كواكب قزمة",
      "ASTEROID": "كويكبات",
      "COMET": "مذنبات",
      "ARTIFICIAL_SATELLITE": "أقمار اصطناعية",
      "LAUNCH_AND_ROCKET": "إطلاقات وصواريخ",
      "SPACE_PROBE": "مسابر فضائية",
      "LANDING_SITE": "مواقع هبوط",
      "EXOPLANET": "كواكب خارجية",
      "STAR": "نجوم",
      "BINARY_AND_MULTIPLE": "نجوم ثنائية ومتعددة",
      "COMPACT_REMNANT": "نجوم ميتة",
      "BLACK_HOLE": "ثقوب سوداء",
      "OPEN_CLUSTER": "عناقيد مفتوحة",
      "GLOBULAR_CLUSTER": "عناقيد كروية",
      "EMISSION_NEBULA": "سدم انبعاثية",
      "PLANETARY_NEBULA": "سدم كوكبية",
      "DARK_NEBULA": "سدم مظلمة",
      "REFLECTION_NEBULA": "سدم انعكاسية",
      "SUPERNOVA_REMNANT": "بقايا مستعرات عظمى",
      "GALAXY_SPIRAL": "مجرات حلزونية",
      "GALAXY_IRREGULAR": "مجرات غير منتظمة",
      "GALAXY_ELLIPTICAL": "مجرات إهليلجية",
      "GALAXY_INTERACTION": "مجرات متفاعلة",
      "AGN_QUASAR": "كوازارات",
      "GALAXY_GROUP": "مجموعات مجرات",
      "GROUND_SITE": "محطات أرضية",
      "ODDITY": "غرائب"
    },
    "other": "أشياء أخرى",
    "byName": "بالاسم",
    "of": "{label} {world}",
    "only": "نماذج ثلاثية الأبعاد",
    "onlyTitle": "اعرض فقط ما يُرسم من نموذج ثلاثي الأبعاد: نموذج حقيقي أو إعادة بناء",
    "real": "نموذج ثلاثي الأبعاد حقيقي",
    "rebuilt": "إعادة بناء ثلاثية الأبعاد",
    "noneWithModel": "ليس لأي منها نموذج ثلاثي الأبعاد.",
    "counting": "نعدّ…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "الحركة",
      "choices": {
        "on": "يعمل",
        "off": "متوقف"
      },
      "titles": {
        "on": "تنساب الرحلات الطيرانية وتتقدم الرحلات وحدها، كما صُممت الخريطة",
        "off": "كل طيران انتقال فوري، ولا يتحرك شيء لم يُقَس أنه يتحرك، وتنتظر الرحلة «التالي»"
      },
      "device": "جهازك يطلب حركة أقل، فهي متوقفة."
    },
    "summary": {
      "label": "ما على الشاشة",
      "stage": "ننظر إلى {stage}.",
      "selected": "{name} محدد، {kind}.",
      "nothing": "لا شيء محدد.",
      "trip": "محطة الرحلة {n} من {count}: {title}.",
      "tripIntro": "رحلة {title} مفتوحة.",
      "measured": "مرسوم كما قيس."
    }
  },
  "r13Deep": {
    "card": {
      "dso-tarantula-nebula": "ضوؤه قرب خط نظرنا صورة Webb الفوتوغرافية؛ وغازه نموذج لتجويف حول العنقود R136 داخل قشرة من غاز متوهج تحصرها سحب جزيئية، عن Pellegrini وBaldwin وFerland (2011). لم يراجعه فلكي بعد.",
      "dso-m43": "ضوؤه مأخوذ من صورة ESO الفوتوغرافية، وشكله معاد بناؤه تجويفًا أصغر على السحابة المظلمة نفسها التي لسديم الجبار، يضيئه النجم NU Orionis. لم يراجعه فلكي بعد.",
      "dso-m51": "مبني من ميله وبنيته المنشورين: مجرة حلزونية ذات ذراعين تُرى من الوجه تقريبًا، ورفيقتها NGC 5195 خلف طرف ذراعها الشمالية، والذراع التي تصل إليها؛ والأعماق نموذج. لم يراجعه فلكي بعد.",
      "dso-m81": "مبني من ميله وبنيته المنشورين: انتفاخ قديم كبير، وذراعان ملتفتان بإحكام والغبار على حافتيهما الداخليتين. لم يراجعه فلكي بعد.",
      "dso-m101": "مبني من ميله وبنيته المنشورين: قرص كبير يُرى من الوجه تقريبًا، وأذرع كثيرة ومناطق تكوّن النجوم العملاقة فيه حيث تضعها السماء. لم يراجعه فلكي بعد.",
      "dso-m104": "مبني من ميله وبنيته المنشورين: انتفاخ مستدير ضخم وقرص رقيق يُرى من جانبه تقريبًا، وحلقة غباره أمامه. لم يراجعه فلكي بعد.",
      "dso-antennae-galaxies": "مجرتان تتصادمان حيث تضعهما السماء، وذنباهما المدّيان؛ وكم يبعد كل جزء، أمامًا أو خلفًا، نموذج عن محاكاة التصادم. لم يراجعه فلكي بعد.",
      "dso-m83": "مبني من ميله وبنيته المنشورين: مجرة حلزونية ذات قضيب تُرى من الوجه تقريبًا، وأذرعها غنية بالنجوم الفتية والهيدروجين المتوهج. لم يراجعه فلكي بعد.",
      "dso-ngc-1300": "مبني من بنيته المنشورة: قضيب طويل وممرات غبار على حافتيه الأماميتين وذراعان من طرفيه، طابقنا شكلهما مع صورة Hubble الفوتوغرافية. لم يراجعه فلكي بعد.",
      "dso-centaurus-a": "مبني من أرقام منشورة: مجرة إهليلجية عملاقة يعبرها قرص ملتو من الغبار والنجوم الفتية، عن نموذج مطابق لصور Spitzer؛ ونفّاثاها مرسومان بألوان زائفة، لأنهما يتألقان بالأشعة السينية والموجات الراديوية، لا بالضوء المرئي. لم يراجعه فلكي بعد."
    }
  },
  "compare": {
    "row": "قارن",
    "hint": "بالمقياس",
    "missing": "—",
    "none": "لا شيء",
    "yes": "نعم",
    "no": "لا",
    "range": "{a} إلى {b}",
    "numUnit": "{num} {unit}",
    "modeLabel": "العرض",
    "modes": {
      "pair": "جنبًا إلى جنب",
      "lab": "كل العوالم"
    },
    "withLabel": "قارن مع",
    "scaleLabel": "المقياس",
    "scales": {
      "true": "بالمقياس",
      "same": "العرض نفسه"
    },
    "propLabel": "رتّب كل العوالم بحسب",
    "props": {
      "across": "القطر",
      "mass": "الكتلة",
      "gravity": "الجاذبية",
      "temp": "الحرارة",
      "spin": "طول الدورة",
      "year": "طول السنة",
      "dist": "البعد عن الشمس",
      "moons": "عدد الأقمار"
    },
    "names": {
      "sun": "الشمس",
      "mercury": "عطارد",
      "venus": "الزهرة",
      "earth": "الأرض",
      "moon": "القمر",
      "mars": "المريخ",
      "jupiter": "المشتري",
      "saturn": "زحل",
      "uranus": "أورانوس",
      "neptune": "نبتون",
      "pluto": "بلوتو"
    },
    "the": {
      "sun": "الشمس",
      "moon": "القمر"
    },
    "wider": "عرض {big} يعادل {n} أضعاف عرض {small}.",
    "same": "{a} و{b} بعرض متقارب تقريبًا.",
    "figure": "{a} و{b}، مرسومان {how}.",
    "figureTrue": "بمقياس واحد",
    "figureSame": "بالعرض نفسه، لا بالمقياس",
    "tableLabel": "{a} بجانب {b}",
    "rows": {
      "across": "القطر",
      "mass": "الكتلة",
      "gravity": "الجاذبية",
      "temp": "الحرارة",
      "spin": "الدورة الواحدة تستغرق",
      "year": "السنة هناك",
      "dist": "عن الشمس",
      "air": "الغلاف الجوي",
      "pressure": "ضغط الهواء",
      "moons": "الأقمار",
      "rings": "الحلقات"
    },
    "units": {
      "km": "كم",
      "earthOne": "× الأرض",
      "earths": "× الأرض",
      "g": "م/ث²",
      "c": "°م",
      "hours": "ساعة",
      "days": "يوم",
      "years": "سنة",
      "au": "و.ف",
      "bar": "بار",
      "microbar": "µبار"
    },
    "notes": {
      "average": "المتوسط",
      "flattened": "في المتوسط؛ وهو مفلطح",
      "range": "نطاقه",
      "bar1": "عند مستوى 1 بار",
      "edge": "عند الحافة المرئية",
      "photosphere": "السطح المرئي",
      "retro": "يدور إلى الوراء",
      "sunSpin": "عند خط العرض 16°",
      "withEarth": "مع الأرض",
      "exosphere": "غلاف خارجي رقيق",
      "photosphereAir": "في الغلاف الضوئي"
    },
    "air": {
      "part": "{share}% {gas}",
      "join": "، ",
      "almostNone": "يكاد لا يوجد",
      "noSurface": "بلا سطح"
    },
    "gas": {
      "hydrogen": "هيدروجين",
      "helium": "هيليوم",
      "methane": "ميثان",
      "nitrogen": "نيتروجين",
      "oxygen": "أكسجين",
      "argon": "أرغون",
      "carbon dioxide": "ثاني أكسيد الكربون"
    },
    "source": "صحائف حقائق الكواكب لدى NASA، قُرئت {date}.",
    "giantNote": "العملاق بلا سطح: جاذبيته وحرارته عند مستوى 1 بار.",
    "moonsNote": "يزداد عدد الأقمار كلما تأكدت أقمار جديدة.",
    "spinNote": "دورة الشمس هي قيمة الصحيفة عند خط العرض 16°.",
    "drawnTrue": "مرسومة بمقياس واحد من متوسط نصف قطر كل منها، وليست صورًا فوتوغرافية.",
    "drawnSame": "العرض نفسه، فليست بالمقياس. وتحتفظ الحلقات بحصتها منه.",
    "tiny": "{name} أصغر من بكسل هنا ويُرسم نقطة.",
    "ringsDrawn": "الحلقات مائلة من أجل الصورة؛ وأنصاف أقطارها من NASA.",
    "labLog": "الأعمدة لوغاريتمية، لتبقى القيم الصغيرة ظاهرة.",
    "labLinear": "الأعمدة متناسبة مع العدد.",
    "labTitle": "قارن مع {name}",
    "thisCard": "العالم على هذه البطاقة"
  },
  "passportKinds": {
    "kindsTitle": "ما فتحت، بحسب النوع",
    "noKinds": "لا شيء لعدّه بحسب النوع بعد.",
    "kinds": {
      "worlds": "الكواكب والأقمار والشمس",
      "stations": "محطات فضائية",
      "satellites": "أقمار اصطناعية وصواريخها",
      "spacecraft": "مسابر وتلسكوبات فضائية",
      "small": "مذنبات وكويكبات",
      "stars": "نجوم",
      "exoplanets": "كواكب نجوم أخرى",
      "deep": "سدم ومجرات والفضاء العميق",
      "earth": "أماكن وطقس على الأرض"
    },
    "notedTitle": "مسجّل",
    "noNoted": "لا شيء مسجّل بعد. افتح مكانًا على الخريطة.",
    "notedFine": "اليوم الذي رُئي فيه أول مرة أن ملاحظة صحّت في هذا المتصفح. محفوظ هنا، ولا يُرتَّب ولا يُرسل أبدًا.",
    "noted": {
      "first": {
        "name": "أول مكان",
        "said": "فتحت مكانًا على الخريطة."
      },
      "planets": {
        "name": "الكواكب الثمانية كلها",
        "said": "فتحت كل كوكب، من عطارد إلى نبتون."
      },
      "station": {
        "name": "محطة فضائية",
        "said": "فتحت محطة في المدار."
      },
      "craft": {
        "name": "مركبة هناك",
        "said": "فتحت مسبارًا أو تلسكوبًا فضائيًا."
      },
      "small": {
        "name": "مذنب أو كويكب",
        "said": "فتحت جرمًا صغيرًا من المجموعة الشمسية."
      },
      "star": {
        "name": "نجم",
        "said": "فتحت نجمًا غير الشمس."
      },
      "exoplanet": {
        "name": "كوكب نجم آخر",
        "said": "فتحت كوكبًا يدور حول نجم آخر."
      },
      "deep": {
        "name": "الفضاء العميق",
        "said": "فتحت سديمًا أو مجرة أو عنقودًا."
      },
      "trip": {
        "name": "رحلة حتى نهايتها",
        "said": "أنهيت رحلة موجّهة."
      },
      "eyes": {
        "name": "رأيته بعينيك",
        "said": "وضعت علامة على شيء أنك رأيته."
      },
      "every": {
        "name": "واحد من كل نوع",
        "said": "فتحت شيئًا واحدًا على الأقل من كل نوع أعلاه."
      }
    }
  },
  "photoCompare": {
    "title": "قارن بالصورة الفوتوغرافية",
    "reconstruction": "إعادة بناء",
    "photograph": "صورة فوتوغرافية",
    "valueText": "{n}% صورة فوتوغرافية",
    "flying": "ننتقل إلى حيث التُقطت الصورة.",
    "note": "ترسم الخريطة نموذجًا ثلاثي الأبعاد. أما الصورة الفوتوغرافية فتظهر هنا فقط: مسطحة ومواجهة للشمس، فإذا أدرت وجهك عنها تخفت."
  },
  "entrances": {
    "label": "ثلاث طرق للدخول",
    "tonight": "الليلة",
    "tonightTitle": "ما فوق رأسك الليلة، من مكانك",
    "explore": "استكشف",
    "exploreTitle": "تجوّل في الخريطة كلها",
    "trip": "رحلة موجّهة",
    "tripTitle": "يبدأ أول رحلة موجّهة في القائمة"
  },
  "momentPlayer": {
    "micro": "لحظة",
    "play": "تشغيل",
    "pause": "إيقاف مؤقت",
    "replay": "شغّل مجددًا",
    "close": "أغلق اللحظة",
    "chapters": "الفصول",
    "chaptersTitle": "اقفز إلى فصل",
    "share": "انسخ رابطًا إلى هذه الثانية",
    "copied": "نُسخ الرابط",
    "copyFailed": "انسخ هذا الرابط: {url}",
    "director": "المخرج",
    "directorTitle": "أعد الكاميرا إلى المخرج",
    "freeNote": "الكاميرا كاميرتك. اسحب لتنظر حولك؛ و«المخرج» يعيدها.",
    "scrubber": "وقت المهمة",
    "met": "الزمن المنقضي من المهمة",
    "rateTitle": "يجري الوقت هنا أسرع {rate} مما كان",
    "realTime": "الوقت الحقيقي",
    "loading": "نحمّل اللحظة…",
    "missing": "لا لحظة اسمها {id}.",
    "unreachable": "لم تُحمَّل هذه اللحظة. وتُحفظ على هذا الجهاز فقط بعد أن تُفتح مرة واحدة متصلًا بالإنترنت.",
    "modelMissing": "لم يُحمَّل نموذج {model}؛ ومساره ولهبه ما زالا مرسومين.",
    "chapterOf": "الفصل {n} من {m}",
    "quoteBy": "{who}، {at}",
    "truthWords": {
      "measured": "مقيس",
      "reconstructed": "معاد بناؤه",
      "illustrative": "توضيحي"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "المراحل مقصوصة من نموذج واحد حاليًا.",
    "drawnNote": "اللهب والبخار مرسومان.",
    "groundNote": "الأرض قرب المنصة توضيحية؛ وخريطة الأرض من Solar System Scope، CC BY 4.0.",
    "groundNoteMars": "Ground near the site illustrative; Mars map Solar System Scope, CC BY 4.0.",
    "keys": "مسافة للتشغيل أو الإيقاف المؤقت، والأسهم للخطو، وEscape للإغلاق"
  },
  "momentShelf": {
    "title": "لحظات",
    "note": "ثلاث مهمات تُعاد على ساعة واحدة، بأوقات الأحداث الحقيقية. المسارات معاد بناؤها وتقول ذلك.",
    "minutes": "{m} د",
    "all": "كل اللحظات ({n})",
    "fewer": "لحظات أقل",
    "replay": "أعد هذه اللحظة",
    "replayTitle": "أعد {title} على ساعة المهمة",
    "replayNamed": "إعادة عرض {title}",
    "cards": {
      // 1.7.2: English until a translator has them
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "18 to 19 March 1965",
        "blurb": "Alexei Leonov steps out of an inflatable airlock into space for twelve minutes, and the crew land by hand in the taiga, far from their field."
      },
      "sts-1": {
        "title": "STS-1",
        "when": "12 to 14 April 1981",
        "blurb": "The first Space Shuttle: Columbia from pad 39A, the boosters and the tank, 54 hours in orbit and a glide onto the Edwards lakebed."
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
        "when": "16 إلى 24 يوليو 1969",
        "blurb": "من المنصة 39A إلى المحيط الهادئ عبر قاعدة الهدوء: الإقلاع، والقمر، والهبوط، والصعود، والعودة."
      },
      "apollo-13": {
        "title": "أبولو 13",
        "when": "من 11 إلى 17 أبريل 1970",
        "blurb": "من المنصة 39A إلى المحيط الهادئ: هبوط لم يحدث، وخزان أكسجين انفجر، والمركبة القمرية قارب نجاة."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1 إلى 10 أبريل 2026",
        "blurb": "من المنصة 39B إلى المحيط الهادئ قبالة سان دييغو، حول الجانب البعيد من القمر. وما حدث فعلًا يُقال إنه حدث، وما كان مخططًا يُقال إنه مخطط."
      },
      "sputnik-1": {
        "title": "سبوتنيك 1",
        "when": "4 أكتوبر 1957",
        "blurb": "من بايكونور إلى أول دورة حول الأرض: أول قمر صناعي، كرة مصقولة قطرها 585 مم، وصفيرها."
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
        "when": "12 أبريل 1961",
        "blurb": "يوري غاغارين، دورة واحدة حول الأرض في 108 دقائق، من بايكونور إلى حقل قرب سميلوفكا."
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
    // 1.7.2: Voskhod 2 and STS-1 in English until a translator has them (Spanish: public #525).
    "voskhod-2": {
      "title": "Voskhod 2: the first spacewalk",
      "blurb": "Baikonur, 18 March 1965: Alexei Leonov leaves the ship through an inflatable airlock for 12 minutes, and a day later the crew land by hand in the taiga, 386 km from where they should have.",
      "chPad": "Site 1",
      "chAscent": "Lift-off",
      "chOrbit": "Orbit",
      "chEva": "The airlock and the walk",
      "chBack": "The way back in",
      "chFail": "The automatic landing fails",
      "chRetro": "Retrofire by hand",
      "chEntry": "Entry",
      "chLand": "The taiga",
      "ready": "T−10 s at Site 1, Baikonur: the Voskhod rocket, and under its shroud the Voskhod 3KD with Pavel Belyayev and Alexei Leonov. 07:00:00 UTC on 18 March 1965. The rocket drawn is the Vostok-K's; the real one had a different third stage.",
      "liftoff": "Lift-off. As on Voskhod 1 there is no way to abort for the first minutes, until the shroud goes.",
      "boosters": "T+119 s: the four strap-on blocks fall away.",
      "shroud": "About T+2.5 minutes: the shroud is jettisoned, and the spacecraft is seen for the first time, with the Volga airlock folded against its sphere.",
      "core": "T+301 s: the core stage is let go and the third stage, the Blok I, takes over for another 240 seconds.",
      "orbit": "Orbit: 167 by 475 km, 64.8 degrees, 90.9 minutes a lap. A Vostok sphere, a retro rocket on top of it as a spare, and two crew seats where Vostok had an ejection seat.",
      "volga": "Belyayev inflates the Volga airlock: some 40 air-booms stiffen a fabric tube 2.5 m long and 1.2 m wide in about seven minutes. The moment he did it is ours; it is drawn already out, not inflating.",
      "depress": "08:28:13 UTC: Leonov, in the Berkut suit and its white backpack, depressurises the airlock. The ship's electronics were cooled by its air, which is why a lock was needed at all.",
      "hatch": "08:32:54: the outer hatch of the airlock is opened.",
      "out": "08:34:51: Leonov leaves the airlock, high over north-central Africa, and pushes out to the end of his 5.35 m umbilical. The first person to be in space outside a spacecraft.",
      "tether": "He fixes a camera on the airlock's rim and looks down from the Straits of Gibraltar to the Caspian Sea. His pose here is read off a frame of the film.",
      "swell": "His suit has ballooned in the vacuum: he cannot reach the shutter on his leg for his chest camera, and his gloves and boots have stiffened. To get back in he will have to let air out of the suit.",
      "back": "He goes in head first, against the procedure, and sticks sideways in the tube while turning to shut the outer hatch. He lets the suit's pressure fall below the safety limit to bend.",
      "inside": "08:47:00: back in the airlock; the hatch is closed at 08:48:40. 12 minutes 9 seconds outside, over north-central Africa to eastern Siberia.",
      "repress": "08:51:54: the airlock is repressurised. A little later Belyayev fires the bolts, and the airlock is let go (the moment is ours).",
      "jettison": "The Volga is let go and tumbles away; the ship has no way to use it again.",
      "auto": "On revolution 16 the automatic landing system is programmed from the ground, but its command \"6\" does not go through, reportedly a fault in the Sun orientation system. The burn planned about now (its clock is ours, near) does not happen.",
      "manual": "07:16 UTC, 19 March: Vjezna-3 tells the crew by shortwave to switch the automatic system off and use manual descent. Belyayev has another revolution to prepare.",
      "late": "The two men, in their suits, cannot get back to their seats once Belyayev has turned the ship by hand with the Vzor optical sight. Retrofire is 46 seconds late.",
      "retro": "Retrofire by hand with the KTDU-60 engine. The clock of it and the place are ours: it was about 45 minutes before the published landing, and the sources do not say.",
      "wires": "The instrument module does not separate cleanly; the sphere spins wildly until the wires burn through at about 100 km. (Drawn parted at entry, a little early.)",
      "entry": "Entry. The 46 seconds put the ship about 386 km past its field, in the forest of the Upper Kama Upland north-east of Perm.",
      "chutes": "The parachutes. Unlike Vostok, nobody ejects: the crew land inside the sphere, with a solid rocket firing at about a metre to soften the touchdown (not drawn).",
      "landing": "09:02:17 UTC: touchdown at about 59.57 N 55.47 E, in deep snow in the taiga, 75 km from Perm.",
      "taiga": "The pilots of the search helicopters find the red parachute only hours later. The crew spend two nights in the forest at minus 5 and colder before they ski to a helicopter.",
      "pathAscent": "the published event times, with heights and distances between them approximate",
      "pathOrbit": "the published orbit drifted for a day, the retrofire at a clock and place that are ours, and the entry and the canopy drawn between",
      "srcWiki": "Voskhod 2, Wikipedia (the times of the spacewalk, the orbit, the landing)",
      "srcRocket": "Voskhod (rocket), Wikipedia (the burn times of the three stages)",
      "srcGrahn": "Sven Grahn, \"The Voskhod 2 mission revisited\" (the failed automatic descent, the call for the manual one, citing General Kamanin's diary)",
      "srcNssdc": "Voskhod 2, NASA NSSDCA Master Catalog (launch and orbit)"
    },
    "sts-1": {
      "title": "STS-1: Columbia's first flight",
      "blurb": "Kennedy, 12 April 1981: John Young and Robert Crippen take the first Space Shuttle from Launch Complex 39A to orbit and, 54 hours later, glide it onto the lakebed at Edwards.",
      "chPad": "Launch Complex 39A",
      "chAscent": "Lift-off",
      "chSrb": "The boosters",
      "chMeco": "Main engines off",
      "chOrbit": "Orbit",
      "chHome": "The way home",
      "chEntry": "Entry",
      "chLand": "Runway 23",
      "ready": "T−10 s at Launch Complex 39A, Kennedy Space Center: Columbia, a white external tank and two solid rocket boosters. 12:00:04 UTC on 12 April 1981, twenty years to the day after Vostok 1. STS-1 and STS-2 flew the tank painted white.",
      "ignition": "T−6.6 s: the three main engines start, and the whole stack rocks forward, towards the crew's feet, and back.",
      "liftoff": "Lift-off: the boosters light as the stack comes back to the vertical. Crippen likened it to a steam catapult. The pad is drawn plain and the flame trench is ours.",
      "roll": "Clear of the tower, the stack rolls to its heading, 067 degrees, and pitches heads-down, the orbiter under the tank, to spare its wings. (Drawn already on the heading.)",
      "maxq": "T+56 s: Max Q, at Mach 1.06 and 29 kPa. The main engines have been throttled back to 65 percent to get through it.",
      "srb": "T+2 min 12 s: the boosters, which performed better than expected, are let go at 53 km, 2.8 km higher than planned. They fall into the Atlantic on parachutes.",
      "meco": "T+8 min 34 s: main engine cut-off at 118 km.",
      "tank": "18 seconds later the external tank is let go. It breaks up in the air and falls into the Indian Ocean.",
      "oms1": "T+10 min 34 s: the first OMS burn, 86 seconds, with the two engines in the orbiter's tail pods (not drawn: the flame is nearly invisible).",
      "oms2": "T+44 min 2 s: the second burn, 75 seconds, at the top of the climb: 246 by 248 km, 40.3 degrees, 89.9 minutes. The clock of the apogee is the report's; the path to it is ours.",
      "doors": "The payload bay doors open to let the radiators work, before the end of the second orbit or the crew would have had to come home. The clock is ours. They see tiles lost from the OMS pods on the television.",
      "oms3": "T+6 h 20 min 46 s and 7 h 05 min 32 s: two single-engine burns raise the orbit to 274 km. The crew spend about 53 hours in orbit testing the machine.",
      "wake": "Day 3: breakfast, stowing, the ejection suits, and the bay doors shut for entry. Young and Crippen strap in. Their orbit has made 35 laps.",
      "deorbit": "In the 36th orbit, over the southern Indian Ocean, a 160-second burn of both OMS engines. Its clock and place are ours, about 55 minutes before the field. Young pitches Columbia up to the nose-high entry attitude.",
      "entry": "Entry interface at 120 km, some 8 110 km from the field at 28 240 km/h. The angle of attack is 40 degrees until the worst of the heating is over. This reconstruction puts the interface over the western Pacific; the report says the eastern.",
      "blackout": "A pink glow at 100 km; both men lower their visors. About 21 minutes without radio, 16 of them for the ionised air. Most of the entry is flown by the computers, with roll reversals at Mach 18.5 and 9.8.",
      "bigsur": "The California coast near Big Sur at Mach 7 and 41 km. Columbia has flown 583 km across its orbit's track to reach the field, which is drawn.",
      "hac": "Young takes the controls. Mach 4.8 and 2.8 reversals done, a wide left turn onto the lakebed runway 23, a T-38 chase plane joining. The size of the turn is ours.",
      "touch": "T+54 h 20 m 53 s, 18:20:57 UTC: the main gear touch down at 339 km/h, slower and about 800 m further down the runway than planned, at Edwards, runway 23. The gear's lowering is drawn a few seconds before.",
      "stop": "Young: \"This is the world's greatest all-electric flying machine. I'll tell you that. That was super!\" 36 orbits, 1 729 348 km, 2 days 6 hours 20 minutes 53 seconds.",
      "pathAscent": "the published event times and heights, with the distances between them approximate",
      "pathOrbit": "the published burns and orbits joined by arcs, the deorbit burn, entry and the approach drawn between; the clocks and places we chose are said in the captions",
      "srcWiki": "STS-1, Wikipedia (event times and heights, the orbits, the burns, the entry and the landing), from NASA's mission documents",
      "srcNssdc": "STS-1 Columbia, NASA NSSDCA Master Catalog (launch and landing)"
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
      "title": "Saturn V: من الإشعال إلى فصل المراحل",
      "blurb": "الدقائق الثلاث الأولى من Apollo 11، 16 يوليو 1969، من المنصة في مجمع الإطلاق 39A.",
      "chIgnition": "الإشعال",
      "chLiftoff": "الإقلاع",
      "chClimb": "عبر أقصى ضغط",
      "chStaging": "فصل المراحل",
      "ignition": "T−8.9 ث: يبدأ تسلسل الإشعال بتشغيل محركات F-1 الخمسة، المحرك الأوسط أولًا، ثم أزواج المحركات الخارجية.",
      "holddown": "تُبقي أذرع التثبيت الصاروخ على المنصة حتى تبلغ المحركات الخمسة دفعها الكامل.",
      "liftoff": "الإقلاع، 13:32:00.6 UTC: خمسة محركات F-1، بدفع نحو 33 800 كيلونيوتن، ترفع نحو 3 000 طن.",
      "tower": "بعد أن يتخطى البرج، يدور الصاروخ إلى سمت طيرانه، 72 درجة شرق الشمال.",
      "maxq": "بعد دقيقة يتجاوز سرعة الصوت؛ ثم أقصى ضغط (max Q)، حين يدفعه الهواء بأشد قوة: 35 كيلوباسكال (735 رطل/قدم²).",
      "ceco": "T+135 ث: يتوقف المحرك الأوسط، ليبقى التسارع دون 4 g.",
      "staging": "T+161.7 ث: تتوقف المحركات الخارجية. على ارتفاع نحو 67 كم تنفصل المرحلة S-IC وتشتعل صواريخها العكسية.",
      "sii": "T+163.0 ث: تشتعل محركات J-2 الخمسة في المرحلة S-II. يحترق الهيدروجين بلهب شاحب شبه شفاف.",
      "interstage": "تسقط حلقة ما بين المراحل؛ وعند T+197.9 ث يذهب برج النجاة. ويأتي مدار الانتظار بعد 8.5 دقائق.",
      "pathAscent": "أوقات تقرير مهمة Apollo 11، والارتفاعات بينها تقريبية",
      "sources": "تقرير مهمة Apollo 11، NASA MSC-00171، 1969 (الجدول 3-I، تسلسل الأحداث؛ القسم 7.1، الإطلاق)"
    },
    "vostok-1": {
      "title": "Vostok 1: أول إنسان في الفضاء",
      "blurb": "يوري غاغارين، 12 أبريل 1961: من بايكونور دورةً واحدة حول الأرض إلى حقل قرب سميلوفكا، على ساعة المهمة، في 108 دقائق.",
      "chPad": "منصة غاغارين",
      "chAscent": "الصعود",
      "chOrbit": "مدار واحد",
      "chRetro": "الدفع العكسي",
      "chEntry": "الدخول",
      "chEject": "القذف",
      "chLand": "الهبوط",
      "ready": "بايكونور، الموقع 1، 06:07 UTC. يوري غاغارين، 27 عامًا، في الكبسولة فوق الصاروخ R-7.",
      "korolev": "سيرغي كوروليوف عبر اللاسلكي: «المرحلة التمهيدية… المتوسطة… الرئيسية… إقلاع!»",
      "liftoff": "الإقلاع. غاغارين: «Poyekhali!» أي «هيا بنا!»",
      "boosters": "T+119 ث: تنتهي المعززات الأربعة الجانبية وتسقط.",
      "shroud": "T+156 ث: يُلقى الغطاء الواقي فوق الكبسولة.",
      "core": "T+300 ث: تنفد المرحلة المركزية وتسقط؛ وتشتعل المرحلة الأخيرة.",
      "earth": "نحو T+6 د، غاغارين: «أرى الأرض. الرؤية جيدة.»",
      "kosberg": "نحو T+10 د تتوقف المرحلة الأخيرة. غاغارين: «اشتغل كوسبيرغ!»، نسبةً إلى مصمم محركها.",
      "orbit": "في المدار: 181 في 327 كم، بميل 64.95 درجة عن خط الاستواء، و89.1 دقيقة للدورة. تنفصل الكبسولة عن المرحلة.",
      "retro": "T+1 س 18 د، فوق الساحل الغربي لإفريقيا: يشتعل الصاروخ العكسي نحو 42 ثانية. وقته ومكانه منشوران؛ أما حجمه هنا فمُلائم للهبوط.",
      "wires": "كان يُفترض أن تنفصل وحدة الأجهزة بعد عشر ثوانٍ من الدفع العكسي. تمسكها حزمة أسلاك؛ فتهوي الاثنتان معًا في الهواء.",
      "entry": "تحترق الأسلاك وتستقر الكرة والدرع الحراري إلى الأمام. وأبلغ غاغارين لاحقًا عن أكثر من 10 g.",
      "eject": "على ارتفاع 7 كم يُفجَّر الباب ويقذف المقعد غاغارين خارجًا. فقد هبطت كرة Vostok بقوة أشد من أن يتحملها من بداخلها.",
      "chutes": "على ارتفاع 2.5 كم تنفتح المظلة الرئيسية للكبسولة، بعرض 27 م؛ وانفتحت مظلة الطيار نفسه تقريبًا فورًا. ويسقط المقعد حرًّا.",
      "landing": "T+1 س 48 د: يهبط غاغارين على بعد 26 كم جنوب غرب إنغلس، في مقاطعة ساراتوف، بعد 108 دقائق من الإقلاع. وتختلف المصادر بعشر دقائق في وقت الهبوط.",
      "pathAscent": "الصعود هو أوقات الأحداث المنشورة موصولة بمنحنيات ملساء؛ أما الارتفاعات والمسافات بينها فمنا",
      "pathOrbit": "المدار والدفع العكسي والدخول أقواس جسمين مطابقة للأوقات المنشورة وحقل الهبوط، وليست بيانات تتبع",
      "pathPilot": "النزول تحت مظلة الطيار مرسوم؛ ولا مصدر يعطي المسافة إلى الكبسولة",
      "srcWiki": "ويكيبيديا، Vostok 1 (أوقات الأحداث، والمدار، والاقتباسات؛ قُرئت في 2 نوفمبر 2026)",
      "srcNssdc": "NASA NSSDCA، Vostok 1 (المدار، المركبة)"
    },
    "apollo-11": {
      "title": "Apollo 11: إلى القمر والعودة",
      "blurb": "مجمع الإطلاق 39A، 16 يوليو 1969، إلى المحيط الهادئ في 24 منه: الإقلاع، والقمر، وقاعدة الهدوء، والعودة، على ساعة المهمة.",
      "chIgnition": "الإشعال",
      "chLiftoff": "الإقلاع",
      "chStaging": "فصل المراحل",
      "chParking": "مدار الانتظار",
      "chTli": "المغادرة إلى القمر",
      "chCoast": "ثلاثة أيام في الطريق",
      "chLoi": "إلى المدار القمري",
      "chUndock": "انفصال Eagle",
      "chDescent": "الهبوط بالدفع",
      "chSurface": "قاعدة الهدوء",
      "chAscent": "الصعود مجددًا",
      "chDock": "الالتحام",
      "chTei": "العودة",
      "chEntry": "الدخول",
      "chSplash": "الهبوط في البحر",
      "ignition": "T−8.9 ث: يبدأ تسلسل الإشعال بتشغيل محركات F-1 الخمسة، المحرك الأوسط أولًا، ثم أزواج المحركات الخارجية.",
      "liftoff": "الإقلاع، 13:32:00 UTC: خمسة محركات F-1، بدفع نحو 33 800 كيلونيوتن، ترفع نحو 3 000 طن.",
      "tower": "بعد أن يتخطى البرج، يدور الصاروخ إلى سمت طيرانه، 72 درجة شرق الشمال.",
      "maxq": "بعد دقيقة يتجاوز سرعة الصوت؛ ثم أقصى ضغط (max Q)، حين يدفعه الهواء بأشد قوة: 35 كيلوباسكال.",
      "ceco": "T+135 ث: يتوقف المحرك الأوسط، ليبقى التسارع دون 4 g.",
      "staging": "T+161.7 ث: تتوقف المحركات الخارجية. على ارتفاع نحو 67 كم تنفصل المرحلة S-IC وتشتعل صواريخها العكسية.",
      "sii": "T+163.0 ث: تشتعل محركات J-2 الخمسة في المرحلة S-II. يحترق الهيدروجين بلهب شاحب شبه شفاف.",
      "interstage": "تسقط حلقة ما بين المراحل؛ وعند T+197.9 ث يذهب برج النجاة.",
      "siicut": "T+9 د 13 ث: تتوقف S-II وتسقط؛ وتشتعل S-IVB.",
      "parking": "T+11 د 52 ث: مدار الانتظار، على ارتفاع 185 كم. ساعتان ونصف من الفحوص، ودورة ونصف حول الأرض.",
      "tli": "2:44:16: تشتعل S-IVB مجددًا 5 د 48 ث وتحمل الصاروخ إلى 10.8 كم/ث. الوجهة هي القمر.",
      "sla": "3:17: تنفتح الألواح الأربعة حول وحدة الهبوط القمرية. تنفصل Columbia، وتدور، وتلتحم أنفًا بأنف مع Eagle (غير مرسوم).",
      "extract": "نحو 3:57: تسحب Columbia وحدة Eagle من S-IVB. وتُترك المرحلة المستهلكة خلفها.",
      "coast": "ثلاثة أيام إلى القمر، 384 000 كم، مرسومة بنحو 8 000 ضعف السرعة الحقيقية. والمركبة بطول 11 مترًا، فهي نقطة.",
      "loi": "75:49:50، خلف القمر وبلا اتصال لاسلكي: يحترق محرك الخدمة ست دقائق ليُؤسَر في مدار القمر.",
      "lunarorbit": "مدار قمري، على ارتفاع نحو 100 كم، وساعتان للدورة.",
      "undock": "100:12: تنفصل Eagle، وفيها أرمسترونغ وألدرين، عن Columbia، حيث يبقى كولينز.",
      "pdi": "102:33:05: يبدأ الهبوط بالدفع، على ارتفاع 15 كم وقبل الموقع بنحو 500 كم.",
      "landing": "كان الحاسوب سيهبط بالمركبة في فوهة تتناثر فيها الصخور. يمسك أرمسترونغ بالمقود ويواصل الطيران، وبقي من الوقود أقل من دقيقة.",
      "landed": "102:45:40، 20:17:40 UTC. “Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15، 02:56 UTC في 21 يوليو: يخطو أرمسترونغ من السلّم.",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” أرمسترونغ، 109:24:48؛ والمقطع هو تسجيل NASA.",
      "liftoffe": "124:22: ترتفع مرحلة الصعود عن مرحلة الهبوط التي تبقى على القمر. 17:54 UTC في 21 يوليو.",
      "rendezvous": "تطارد Eagle المركبة Columbia صاعدةً من 18 كم إلى 100 كم. المناورات مرسومة شكلًا، وليست مناورات المهمة نفسها.",
      "docked": "128:03، 21:35 UTC: التحام. ينتقل الطاقم و21.5 كغ من صخور القمر.",
      "jettison": "130:09: تُترك مرحلة صعود Eagle لتدور حول القمر.",
      "tei": "135:23:42، على الجانب البعيد: يشتعل محرك الخدمة 2 د 30 ث. إلى البيت.",
      "home": "يومان ونصف في العودة، على 384 000 كم نفسها.",
      "smsep": "194:49: تُقطع وحدة الخدمة وتدير الكبسولة درعها الحراري إلى الأمام.",
      "entry": "195:03، حد الدخول، على ارتفاع 122 كم بسرعة 11 كم/ث. يتوهج الدرع؛ وحتى نحو 6 g.",
      "drogue": "نحو 195:12: مظلتان مثبّتتان، ثم ثلاث رئيسية.",
      "mains": "ثلاث مظلات رئيسية، بعرض 25 م، تبطئ الكبسولة إلى نحو 9 م/ث.",
      "splash": "195:18:35، 16:50:35 UTC في 24 يوليو: هبوط في المحيط الهادئ، على بعد 24 كم من حاملة الطائرات USS Hornet (غير مرسومة). ثمانية أيام وثلاث ساعات و18 دقيقة.",
      "pathAscent": "أوقات أحداث تقرير المهمة، والارتفاعات والمسافات بينها تقريبية",
      "pathTrip": "معاد بناؤه من أوقات أحداث Flight Journal أقواس جسمين: قطع مخروطي في الذهاب، ودائرة حول القمر، وقطع مخروطي في العودة؛ وليست بيانات تتبع",
      "pathLm": "النزول مرسوم عكسيًا من قاعدة الهدوء، واللقاء شكل؛ وأوقات الأحداث هي أوقات المهمة",
      "srcReport": "تقرير مهمة Apollo 11، NASA MSC-00171، 1969 (أوقات الأحداث، الإطلاق، الهبوط)",
      "srcJournal": "Apollo 11 Flight Journal، NASA (أوقات الأحداث حتى الثانية)",
      "srcClip": "أولى كلمات أرمسترونغ على القمر: تسجيل NASA، ملكية عامة، من Wikimedia Commons",
      "srcLanding": "إعلان الهبوط: تسجيل NASA، ملكية عامة، من Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: حول القمر",
      "blurb": "مجمع الإطلاق 39B، 1 أبريل 2026، إلى المحيط الهادئ قبالة سان دييغو في 10 منه: أربعة أشخاص حول الجانب البعيد من القمر، على ساعة المهمة.",
      "chPad": "المنصة 39B",
      "chLiftoff": "الإقلاع",
      "chStaging": "سقوط المعززات",
      "chOrbit": "مدار أرضي مرتفع",
      "chTli": "المغادرة إلى القمر",
      "chMoon": "الجانب البعيد",
      "chHome": "العودة إلى البيت",
      "chEntry": "الدخول",
      "chSplash": "الهبوط في البحر",
      "ready": "مجمع الإطلاق 39B، مركز كينيدي للفضاء، 1 أبريل 2026. Wiseman وGlover وKoch وHansen على متن Orion، فوق Space Launch System.",
      "cored": "T−6.4 ث: تبدأ محركات RS-25 الأربعة في المرحلة المركزية. حدث فعلًا، كما خُطط.",
      "liftoff": "الإقلاع، 22:35:12 UTC (6:35 مساءً بتوقيت EDT): يشتعل معززان من خمسة أجزاء عند الصفر. حدث فعلًا.",
      "srb": "نحو T+2 د: تنتهي المعززات وتنفصل على ارتفاع 48 كم، بسرعة 5 000 كم/س. حدث فعلًا؛ وتسقط في المحيط الأطلسي.",
      "las": "مخطط، T+3 د 22 ث: يُلقى برج إلغاء الإطلاق. لا تذكر الرحلات المعلنة الثانية؛ وهذه من خطة الرحلة.",
      "meco": "مخطط، T+8 د: تتوقف المرحلة المركزية، في قوس دون مداري تبلغ ذروته نحو 2 300 كم. وقت خطة الرحلة.",
      "coresep": "تُترك المرحلة المركزية وتسقط في دخول مدمّر فوق المحيط الهادئ، بعد نحو ساعتين من الإطلاق. حدث فعلًا.",
      "prb": "نحو T+50 د، عند قمة القوس: تحترق المرحلة العليا لترفع النقطة الدنيا خارج الهواء. حدث فعلًا، والثانية غير منشورة.",
      "arb": "بعد ساعة، عند النقطة الدنيا: حرق 15 دقيقة يرفع الجانب البعيد من المدار إلى 70 000 كم، بدورة تقارب يومًا. حدث فعلًا.",
      "fairings": "مخطط: تُلقى الألواح الثلاثة حول وحدة الخدمة؛ وتنفتح الصفائف الشمسية الأربع. وقت خطة الرحلة، ومرسومة هنا منشورة.",
      "arrays": "صفائف Orion الأربع مفتوحة: وستولّد طاقتها عشرة أيام.",
      "sep": "مخطط: تنفصل Orion عن المرحلة العليا؛ ثم يقودها Glover بيده بجانب المرحلة نحو 70 دقيقة. وقت الانفصال غير منشور.",
      "tli": "اليوم 2 من الرحلة، بعد نحو 25 ساعة: يحترق المحرك الرئيسي لوحدة الخدمة 5 د 49 ث، نحو القمر. حدث فعلًا؛ والدقيقة المعروضة من خطة الرحلة.",
      "outbound": "أربعة أيام في الذهاب. نُفذ حرق تصحيحي واحد في الذهاب، 17.5 ث في اليوم 5؛ وهو أصغر من أن يُرسم.",
      "record": "17:56 UTC في 6 أبريل: تتجاوز Orion رقم Apollo 13 القياسي للمسافة من عام 1970، 248 655 ميلًا عن الأرض. حدث فعلًا.",
      "moon": "اليوم 6 من الرحلة: تدخل Orion مجال تأثير القمر. ولن تدور حوله: بل تطير حول الجانب البعيد وتسقط عائدة.",
      "los": "22:46 UTC: خلف القمر، بلا اتصال 38 دقيقة. حدث فعلًا.",
      "closest": "أقرب اقتراب، 23:00 UTC في 6 أبريل: 6 545 كم فوق الجانب البعيد من القمر. حدث فعلًا.",
      "far": "23:02 UTC: أبعد نقطة عن الأرض، 406 771 كم. حدث فعلًا.",
      "aos": "23:24 UTC: عاد الاتصال من خلف القمر. حدث فعلًا.",
      "home": "أربعة أيام في العودة. نُفذت ثلاثة حروق تصحيحية في العودة، مدتها 15 و9 و8 ثوانٍ؛ وهي أصغر من أن تُرسم.",
      "esmsep": "مخطط: تنفصل وحدة الخدمة قبل الدخول بنحو 20 دقيقة. وقت الانفصال غير منشور؛ ويُرسم وقت خطة الرحلة.",
      "entry": "حد الدخول، مخطط قبل الهبوط في البحر بنحو 13 دقيقة: على ارتفاع 122 كم بسرعة 11 كم/ث، والدرع الحراري يتوهج. وحلّ دخول مباشر أشد انحدارًا محل دخول الارتداد المخطط. حدث فعلًا.",
      "drogue": "مظلتان مثبّتتان، ثم مظلتان قائدتان وثلاث مظلات رئيسية، بعرض 35 م. حدث فعلًا؛ والأوقات من خطة الرحلة.",
      "mains": "ثلاث مظلات رئيسية تنزل بالكبسولة إلى البحر.",
      "splash": "الهبوط في البحر، 00:07:27 UTC في 11 أبريل (5:07 مساءً بتوقيت PDT، 10 أبريل)، 32.3 شمالًا 117.8 غربًا، جنوب غرب سان دييغو؛ وتنتشل السفينة USS John P. Murtha الطاقم (السفينة غير مرسومة). تسعة أيام وساعة و32 دقيقة. حدث فعلًا.",
      "pathAscent": "أوقات أحداث خطة الرحلة، والارتفاعات والمسافات بينها منا؛ أما الإقلاع وانفصال المعززات فقد حدثا فعلًا",
      "pathTrip": "معاد بناؤه من المدار الذي حدث فعلًا وأقرب اقتراب والهبوط في البحر، أقواس جسمين وقطع زائد حول القمر؛ وليست بيانات تتبع",
      "srcWiki": "ويكيبيديا، Artemis II (ما حدث فعلًا، بالأوقات والمسافات؛ قُرئت في 2 نوفمبر 2026)",
      "srcNasa": "NASA، Artemis II (خطة الرحلة؛ نموذج الصاروخ والكبسولة: NASA 3D Resources)"
    }
  }
};

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "الحجم والمسافة",
    "size": "الحجم",
    "sizeTrue": "حقيقي",
    "sizeValue": "×{n}",
    "sizeTitle": "كم تُرسم العوالم أكبر من حجمها الحقيقي، من الحجم الحقيقي إلى ×{max}",
    "dist": "المسافة",
    "distTrue": "حقيقية",
    "distLog": "لوغاريتمية",
    "distSome": "{p}% من الطريق إلى اللوغاريتمية",
    "distTitle": "مقدار ضغط المسافات عن الشمس، من الحقيقية إلى اللوغاريتمية. الاتجاهات تبقى مقيسة.",
    "presets": "مناظر جاهزة",
    "presetTrue": "المقياس الحقيقي",
    "presetTrueTitle": "كل عالم بحجمه الحقيقي وعلى مسافته الحقيقية",
    "presetClass": "الفصل الدراسي",
    "presetClassTitle": "العوالم ×{n} والمسافات لوغاريتمية، مثل نموذج آلي للمجموعة الشمسية",
    "held": "في الرحلة يُرسم كل شيء بمقياسه الحقيقي. تعود المنزلقات عندما تنتهي.",
    "note": "مكان كل عالم في السماء مقيس دائمًا. والشارة تقول كم يُرسم أكبر من حجمه.",
    "noteSize": "{name}: مرسوم ×{n} أكبر من حجمه الحقيقي، بمنزلق الحجم.",
    "noteDist": "مرسوم على بعد {drawn} و.ف من الشمس، بينما هو على بعد {au} و.ف، في اتجاهه الحقيقي (منزلق المسافة).",
    "noteMoon": "بُعده عن {parent} مرسوم ×{n} من بُعده الحقيقي، في اتجاهه الحقيقي، ليبقى خارج الكوكب المكبَّر.",
    "noteSun": "الشمس مرسومة ×{n} أكبر من حجمها الحقيقي، بمنزلق الحجم، وبحيث يبقى عطارد خارجها.",
    "badgeSun": "الشمس ×{n}",
    "badgeLog": "مسافات لوغاريتمية",
    "badgeSome": "المسافات {p}% نحو اللوغاريتمية",
    "badgeJoin": " · ",
    "badgeTitle": "منزلقا الحجم والمسافة في تبويب الكواكب يرسمان هذا المنظر."
  },
  "cutaway": {
    "button": "انظر إلى الداخل",
    "buttonTitle": "افتح {name} لترى طبقاته، على الأعماق التي تعطيها القياسات",
    "title": "داخل {name}",
    "close": "أغلق المقطع",
    "model": "الطبقات من {model}.",
    "source": "المصدر",
    "layers": "الطبقات، من السطح إلى الأسفل",
    "depthRange": "{top}–{bottom} كم",
    "toCentre": "من {top} كم إلى المركز",
    "cls": {
      "measured": "مقيس",
      "modelled": "منمذج",
      "inferred": "مستنتج"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "العمق",
    "probeTitle": "اسحب إلى الأسفل من السطح إلى المركز",
    "depth": "على عمق {km} كم",
    "atCentre": "المركز",
    "layer": "الطبقة",
    "pressure": "الضغط",
    "temperature": "درجة الحرارة",
    "density": "الكثافة",
    "valueCls": "{value} ({cls})",
    "note": "الأعماق من المصادر؛ أما الألوان فمختارة. بين أعلى الطبقة وأسفلها يقرأ المسبار قيمًا بينهما.",
    "unknown": "لا يوجد مقطع لهذا العالم بعد.",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} مليون GPa",
      "k": "{n} K",
      "millionK": "{n} مليون K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "القشرة",
      "mantle": "الوشاح",
      "upper-mantle": "الوشاح العلوي",
      "lower-mantle": "الوشاح السفلي",
      "outer-core": "اللب الخارجي السائل",
      "inner-core": "اللب الداخلي الصلب",
      "liquid-core": "لب سائل",
      "iron-core": "لب حديدي",
      "molten-silicate": "طبقة صخور منصهرة",
      "partial-melt": "طبقة منصهرة جزئيًا",
      "ice-shell": "قشرة جليدية",
      "ocean": "محيط",
      "hp-ice": "جليد عالي الضغط",
      "rock-mantle": "وشاح صخري",
      "rock-core": "لب صخري",
      "hydrated-core": "لب من الصخر والجليد",
      "molecular": "الهيدروجين والهيليوم",
      "metallic": "هيدروجين معدني",
      "dilute-core": "لب مخفف",
      "ice-mantle": "ماء وأمونيا وميثان",
      "convective": "منطقة الحمل",
      "radiative": "المنطقة الإشعاعية",
      "solar-core": "اللب"
    }
  },
  "helio": {
    "chip": "الغلاف الشمسي · منمذج",
    "chipTitle": "مما رُسمت الفقاعة المحيطة بالمجموعة الشمسية",
    "legendTitle": "الغلاف الشمسي",
    "rowTs": "صدمة الإنهاء، حيث تتباطأ الرياح الشمسية إلى ما دون سرعة الصوت. شكل منمذج يمر بالعبورين: Voyager 1 عند {a} و.ف، وVoyager 2 عند {b} و.ف (مقيس).",
    "rowHp": "حد الغلاف الشمسي (الهيليوبوز)، حيث تلتقي رياح الشمس بالغاز بين النجمي. شكل منمذج (Parker 1961) يمر بالعبورين: Voyager 1 عند {a} و.ف، وVoyager 2 عند {b} و.ف (مقيس).",
    "rowBow": "الموجة القوسية، حيث يتراكم الغاز بين النجمي في المقدمة. توضيحي: ضعف مسافة حد الغلاف الشمسي (McComas et al. 2012).",
    "rowRibbon": "شريط IBEX، حزمة ساطعة قاسها IBEX في السماء (Funsten et al. 2013). مسافته غير مقيسة: مرسوم على بعد {au} و.ف.",
    "rowMotion": "مسار الشمس عبر الغاز بين النجمي المحلي، {v} كم/ث (IBEX، McComas et al. 2015). السهم يمثل {years} سنة منه، أي {au} و.ف.",
    "sources": "أماكن العبور من مسارات Voyager في JPL Horizons في تواريخ العبور التي أعلنتها NASA. الأشكال: Parker 1961، Wilkin 1996، استنادًا إلى Izmodenov & Alexashov 2015 وOpher et al. 2015.",
    "crossing": "{craft}: {surface}، {au} و.ف، {date}",
    "motion": "مسار الشمس، {v} كم/ث",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "صدمة الإنهاء",
      "hp": "حد الغلاف الشمسي"
    },
    "surfaceLabel": {
      "ts": "صدمة الإنهاء (منمذجة)",
      "hp": "حد الغلاف الشمسي (منمذج)",
      "bow": "الموجة القوسية (توضيحية)",
      "ribbon": "شريط IBEX (مقيس في السماء)"
    },
    "date": "{d} {m} {y}",
    "months": [
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر"
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "مسار حول شيء ما، تمسكه الجاذبية. إن كانت سرعتك الجانبية كافية، تظل تسقط متجاوزًا الأرض بدل أن تسقط عليها.",
  "low Earth orbit": "الطبقة المزدحمة من نحو 200 إلى 2000 كم في الأعلى. فيها المحطة الفضائية ومعظم الأقمار الاصطناعية ومعظم الحطام.",
  "geostationary": "مدار على ارتفاع 35 786 كم تستغرق فيه الدورة الواحدة ما تستغرقه الأرض لتدور مرة واحدة، 23 ساعة و56 دقيقة. فيبدو القمر الاصطناعي معلقًا فوق مكان واحد.",
  "polar orbit": "مدار يمر فوق القطبين. والأرض تدور تحته، فيرى القمر الاصطناعي كل جزء منها في النهاية.",
  "elements": "ستة أرقام وتاريخ يصفان مدارًا. أدخلها في الرياضيات المناسبة تحصل على موضع.",
  "epoch": "اللحظة التي كانت فيها مجموعة العناصر المدارية صحيحة. وكلما ابتعدت عنها قلّت دقة الجواب.",
  "apogee": "أعلى نقطة في مدار حول الأرض.",
  "perigee": "أدنى نقطة في مدار حول الأرض.",
  "perihelion": "النقطة التي يقترب فيها ما يدور حول الشمس منها أكثر ما يكون.",
  "inclination": "مقدار ميل المدار عن خط الاستواء. تسعون درجة تعني المرور فوق القطبين.",
  "propagated": "محسوب انطلاقًا من قياس أقدم. وليس رصدًا جديدًا، وهو ينحرف مع الوقت.",
  "lunar distance": "المسافة من الأرض إلى القمر، نحو 384 000 كم. مسطرة مفيدة لمرورات الكويكبات.",
  "astronomical unit": "المسافة من الأرض إلى الشمس، نحو 150 مليون كم.",
  "light-time": "المدة التي يستغرقها الضوء ليقطع مسافة. وهي أيضًا مدة وصول رسالة لاسلكية.",
  "light-year": "المسافة التي يقطعها الضوء في سنة جولية واحدة، نحو 9.46 تريليون كم. مسطرة للفجوات بين النجوم.",
  "magnitude": "مدى سطوع الشيء كما يبدو. والمقياس معكوس: الأرقام الأصغر أسطع.",
  "azimuth": "اتجاه بوصلة بالدرجات. الصفر شمال، و90 شرق.",
  "elevation": "ارتفاع الشيء فوق الأفق بالدرجات. وتسعون تعني فوق رأسك مباشرة.",
  "terminator": "الخط الفاصل بين النهار والليل على عالم ما.",
  "twilight": "الوقت بعد الغروب حين لا تكون السماء مظلمة تمامًا بعد. وفيه تسهل رؤية الأقمار الاصطناعية.",
  "sunlit": "ما زال يلتقط ضوء الشمس رغم أن الأرض تحته مظلمة. وهذا ما يجعل القمر الاصطناعي مرئيًا.",
  "radiant": "النقطة في السماء التي تبدو زخة الشهب قادمة منها.",
  "ZHR": "تقريبًا كم شهابًا في الساعة سترى تحت سماء مظلمة تمامًا ومصدر الزخة فوق رأسك. وفي العادة ترى أقل.",
  "close approach": "حين يمر كويكب قرب الأرض. و«القرب» في علم الفلك يعني عادةً أبعد من القمر.",
  "near-Earth object": "كويكب أو مذنب يقرّبه مداره من مدار الأرض.",
  "reentry": "حين يسقط شيء عائدًا إلى الغلاف الجوي. ومعظمه يحترق في طريقه إلى الأسفل.",
  "debris": "أقمار اصطناعية ميتة ومراحل صواريخ مستهلكة وشظايا. وعشرات الآلاف من القطع متتبَّعة.",
  "constellation": "نمط من النجوم سمّاه الناس منذ زمن بعيد. والنجوم في الكوكبة الواحدة لا تكون عادةً قريبة بعضها من بعض.",
  "L1": "نقطة توازن بين الأرض والشمس، على بعد نحو 1.5 مليون كم نحو الشمس. جيدة لمراقبة الشمس.",
  "L2": "نقطة توازن على بعد 1.5 مليون كم من الأرض في الجهة المقابلة للشمس، حيث يستطيع تلسكوب أن يُبقي الأرض والشمس خلفه ويظل باردًا.",
  "transit": "حين يمر شيء أمام آخر كما يُرى من حيث تقف.",
  "conjunction": "حين يظهر شيئان متقاربين في السماء. وهما ليسا متقاربين في الفضاء.",
  "ephemeris": "جدول يبيّن أين سيكون الشيء، محسوب مسبقًا.",
  "umbra": "الجزء المظلم في وسط الظل، حيث يُحجب الضوء تمامًا. في ظل القمر التام تختفي الشمس.",
  "penumbra": "الجزء الخارجي الأفتح من الظل، حيث يُحجب بعض الضوء فقط. القمر في شبه ظل الأرض يخفت قليلًا فقط.",
  "totality": "دقائق الكسوف الكلي التي تُغطّى فيها الشمس تمامًا. تُظلم السماء بما يكفي لرؤية النجوم.",
  "annular": "على شكل حلقة. في الكسوف الحلقي يكون القمر أبعد من أن يغطي الشمس كلها، فتبقى حولها حلقة ساطعة."
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "الانتقال إلى تاريخ (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "بحث",
    "property": "البحث بالخصائص",
    "countries": "الأقمار الصناعية حسب البلد",
    "operators": "حسب المشغّل",
    "clouds": "سحب الحطام",
    "chartOurs": "كواكبنا جنبًا إلى جنب"
  },
  "find": {
    "title": "بحث",
    "label": "البحث بالخصائص وبالبلد وبسحابة الحطام",
    "tabs": {
      "property": "بالخصائص",
      "country": "حسب البلد",
      "clouds": "الحطام والأساطيل"
    },
    "kindsLabel": "عمّ تبحث",
    "kinds": {
      "stars": "النجوم",
      "exoplanets": "الكواكب",
      "satellites": "الأقمار الصناعية",
      "comets": "المذنّبات"
    },
    "presetsLabel": "أسئلة",
    "refine": "تضييق البحث",
    "presets": {
      "rockyHz50": "كواكب صخرية في النطاق الصالح للحياة على بعد أقل من 50 سنة ضوئية",
      "nearStars": "نجوم على بعد أقل من 20 سنة ضوئية",
      "temperate": "كواكب دافئة تقريبًا مثل الأرض",
      "hotJupiters": "عمالقة حارّة",
      "cometsSoon": "مذنّبات تبلغ أقرب نقطة من الشمس قبل 2030",
      "geo": "أقمار صناعية عاملة في الحلقة الثابتة بالنسبة للأرض",
      "low": "أقمار صناعية عاملة تحت 400 كم"
    },
    "fields": {
      "within": "ضمن (سنوات ضوئية)",
      "fromHere": "يُقاس من الكاميرا لا من الشمس",
      "radius": "نصف القطر (بالأرض)",
      "mass": "الكتلة (بالأرض)",
      "teq": "الحرارة (K)",
      "insol": "ضوء النجم (الأرض = 1)",
      "height": "الارتفاع (كم)",
      "year": "الإطلاق (سنة)",
      "perihelion": "أقرب نقطة من الشمس (سنة)",
      "from": "من",
      "to": "إلى",
      "zone": "في النطاق الصالح للحياة",
      "zoneWide": "داخله أو على حافته",
      "rocky": "صخري",
      "working": "العاملة فقط",
      "owner": "المالك",
      "operator": "المشغّل",
      "any": "أي",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "الاسم",
      "dist": "المسافة (س.ض)",
      "radius": "نصف القطر (بالأرض)",
      "teq": "الحرارة (K)",
      "insol": "الضوء",
      "zone": "النطاق",
      "spect": "النوع",
      "mag": "القدر",
      "owner": "المالك",
      "height": "الارتفاع (كم)",
      "year": "الإطلاق",
      "perihelion": "الحضيض الشمسي",
      "qAu": "الأقرب (و.ف)"
    },
    "zones": {
      "inside": "داخله",
      "edge": "على الحافة",
      "hotter": "حارّ جدًا",
      "colder": "بارد جدًا"
    },
    "sortTitle": "الترتيب حسب {col}",
    "tableLabel": "ما يطابق، صفّ لكل واحد: اضغط صفًّا للانتقال إليه",
    "status": "عُثر على {n}",
    "statusSome": "عُثر على {n}؛ يظهر أول {shown}",
    "none": "لا شيء يطابق. وسّع نطاقًا أو أزل علامة.",
    "looking": "جارٍ البحث…",
    "loading": "جارٍ تحميل ما سيُبحث فيه…",
    "failed": "لم يكتمل البحث. حاول مرة أخرى بعد قليل.",
    "rowTitle": "الانتقال إلى {name}",
    "noRecord": "غير مرسوم على الخريطة",
    "modelled": "محسوب عبر كتلة نجم مقدّرة: نموذج",
    "copyLink": "نسخ رابط هذا السؤال",
    "copied": "نُسخ الرابط",
    "honesty": {
      "stars": "النجوم المسمّاة في HYG v4.4، وعددها 3 390، على مسافاتها المقيسة. مقيس.",
      "exoplanets": "نصف القطر والكتلة والدورة والنجم: مقيسة، من NASA Exoplanet Archive. حجم المدار وضوء النجم والحرارة والنطاق: محسوبة؛ وعليها * حيث قُدّرت كتلة النجم من ضوئه، نموذج. صخري: 1.6 نصف قطر أرضي أو أقل، أو 3 كتل أرضية عند غياب نصف القطر (Rogers 2015).",
      "satellites": "فهرس CelesTrak، قُرئ في {date}. الارتفاع هو متوسط أعلى نقطة وأدنى نقطة في المدار. مقيس.",
      "comets": "تواريخ الحضيض الشمسي من Small-Body Database التابعة لـ JPL، محسوبة من مدارات مقيسة."
    },
    "chart": {
      "open": "جنبًا إلى جنب",
      "openTitle": "كواكب {host} جنبًا إلى جنب، بمقياس واحد",
      "title": "{host}، بمقياس واحد",
      "ours": "المجموعة الشمسية",
      "label": "كواكب {host} مرسومة جنبًا إلى جنب بأحجامها الحقيقية، بالترتيب من النجم",
      "note": "مقياس واحد لكل الكواكب؛ الفراغات ليست مسافات. الكوكب الذي لم يُقس نصف قطره مرسوم بخط متقطع وبالحجم الأوسط.",
      "close": "إغلاق الرسم"
    },
    "pill": "{name}: {n} مضاءة",
    "pillClear": "إزالة الإبراز"
  },
  "owners": {
    "modesLabel": "التجميع حسب",
    "modes": {
      "countries": "البلدان",
      "operators": "المشغّلون",
      "points": "نقاط لاغرانج",
      "nopath": "بلا مسار علني"
    },
    "reading": "جارٍ قراءة فهرس CelesTrak (7 MB)…",
    "failed": "لم يُحمَّل الفهرس.",
    "retry": "أعد المحاولة",
    "lead": "لدى {n} مالكًا شيء في المدار: {total} جسمًا متتبَّعًا.",
    "row": "{n} في المدار",
    "rowSub": "{working} عاملة · {debris} حطام",
    "rowTitle": "إبراز ما تملكه {name} في المدار",
    "joint": "{a} و{b}",
    "ussr": "يعدّ الفهرس الاتحاد السوفيتي وروسيا مالكًا واحدًا.",
    "unknown": "غير معروف بعد",
    "byName": "بالاسم",
    "byNameTitle": "محسوبة بالأسماء التي تحملها أقماره في الفهرس",
    "kinds": "{working} عاملة، {dead} متوقفة عن العمل، {rocket} مراحل صواريخ، {debris} قطع حطام.",
    "lit": "{n} منها مرسومة ومُبرزة على الخريطة.",
    "litNone": "لا شيء منها مرسوم على الخريطة.",
    "show": "إبرازها",
    "clear": "مسح",
    "page": "صفحة {name}",
    "noPathTitle": "بلا مسار علني: {n}",
    "noPathNone": "لكل حمولاته في المدار مسار علني.",
    "why": {
      "no-elements": "لا مدار علنيًا: الفهرس يذكره، لكن لا تُنشر عناصر مداره",
      "deep-space": "خارج مدار الأرض، ولا مسار له هنا",
      "deep-drawn": "خارج مدار الأرض: مرسوم من مسار JPL"
    },
    "points": {
      "sel1": "الشمس–الأرض L1",
      "sel2": "الشمس–الأرض L2",
      "eml2": "الأرض–القمر L2",
      "sel1Why": "1.5 مليون كم نحو الشمس: منظر لشمس لا تغيب أبدًا.",
      "sel2Why": "1.5 مليون كم بعيدًا عن الشمس: بارد ومظلم، للتلسكوبات.",
      "eml2Why": "وراء الجانب البعيد من القمر: مرحّل يرى الجانب البعيد والأرض معًا.",
      "empty": "لا شيء مُدرج هنا الآن."
    },
    "nopathLead": "{n} حمولة في المدار بلا مسار علني. الأحدث أولًا:",
    "source": "فهرس الأقمار الصناعية من CelesTrak، قُرئ في {date}: مقيس. الأعلام: Wikimedia Commons، ملكية عامة."
  },
  "breakups": {
    "cloudsTitle": "سحب الحطام",
    "fleetsTitle": "الكوكبات",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "قمر صيني للأرصاد الجوية، دمّره صاروخ صيني مضاد للأقمار الصناعية على ارتفاع 865 كم في 11 يناير 2007: أكبر سحابة حطام صُنعت على الإطلاق.",
      "cosmos1408": "قمر سوفيتي متوقف، دمّره صاروخ روسي مضاد للأقمار الصناعية على ارتفاع نحو 480 كم في 15 نوفمبر 2021.",
      "iridium33": "قمر اتصالات عامل اصطدم به كوزموس 2251 المتوقف على ارتفاع 789 كم فوق سيبيريا في 10 فبراير 2009: أول اصطدام بين قمرين صناعيين كاملين.",
      "cosmos2251": "قمر روسي متوقف اصطدم بإيريديوم 33 على ارتفاع 789 كم في 10 فبراير 2009."
    },
    "counts": "{up} من أصل {catalogued} قطعة مفهرسة ما زالت في المدار.",
    "lit": "{n} مُبرزة على الخريطة.",
    "spreadTitle": "شاهدها تنتشر",
    "steps": {
      "event": "لحظة الحدث",
      "week": "بعد أسبوع",
      "year": "بعد سنة",
      "today": "اليوم"
    },
    "play": "تشغيل من الحدث",
    "stop": "إيقاف",
    "places": "العودة إلى مواقع اليوم",
    "spreadNote": "نموذج: تبدأ كل قطعة من نقطة واحدة، على المدار الذي لها اليوم، وتنجرف بينما يدير انتفاخ الأرض مستوى مدارها. القطع التي سقطت لا تُرسم.",
    "source": "المصدر:",
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
    "fleetLit": "{n} مُبرزة على الخريطة.",
    "fleetNote": "تُعرف بالأسماء التي يعطيها لها مشغّلوها في الفهرس.",
    "loadingActive": "جارٍ تحميل كل الأقمار العاملة أولًا (7 MB)…",
    "loadingDebris": "جارٍ تحميل كل قطع الحطام المتتبَّعة أولًا (7 MB)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "الانتقال إلى الدقيقة التي دُمّر فيها فنغيون-1C وإبراز سحابته"
  },
  "dateJump": {
    "title": "الانتقال إلى تاريخ",
    "field": "التاريخ والوقت (UTC)",
    "text": "أو اكتبه",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "انتقال",
    "hint": "أي لحظة من 1700 إلى 2200، بتوقيت UTC.",
    "errors": {
      "unknown": "لم أفهم هذا التاريخ. جرّب 1969-07-20 20:17 أو 20 July 1969 أو next total eclipse.",
      "range": "خارج 1700 إلى 2200.",
      "empty": "اكتب تاريخًا أولًا.",
      "eclipse": "لا يوجد كسوف أو خسوف كهذا بين 1700 و2200."
    },
    "searching": "جارٍ البحث…",
    "gone": "الآن {when}.",
    "eclipse": "{what}، {when}.",
    "eclipses": {
      "sunTotal": "كسوف كلي للشمس",
      "sunAnnular": "كسوف حلقي للشمس",
      "sunPartial": "كسوف جزئي للشمس",
      "moonTotal": "خسوف كلي للقمر",
      "moonPartial": "خسوف جزئي للقمر",
      "moonPenumbral": "خسوف شبه ظلي للقمر"
    },
    "rangesTitle": "ما مدى الدقة، ومتى",
    "ranges": {
      "worlds": "الشمس والقمر والكواكب: من 1700 إلى 2200، محسوبة (astronomy-engine).",
      "satellites": "الأقمار الصناعية: دقيقة في حدود أسبوع من اليوم؛ باهتة بعد شهر.",
      "craft": "المركبات الفضائية: داخل مسارات JPL الخاصة بها فقط.",
      "stars": "النجوم: في عرض السماء تُزاح بحركاتها المقيسة متى بعُد التاريخ أكثر من 50 سنة عن اليوم."
    },
    "quick": {
      "total": "الكسوف الكلي القادم للشمس",
      "lunar": "الخسوف القادم للقمر"
    },
    "missionsTitle": "من مهماتنا",
    "momentsTitle": "لحظات",
    "presetsLabel": "تواريخ للانتقال إليها",
    "faded": "الأقمار الصناعية باهتة: مداراتها مقيسة لليوم، لا لعام {year}.",
    "close": "إغلاق"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "من ويكيبيديا",
    "quotedLive": "مقتبس من ويكيبيديا كما هو اليوم، ولم نتحقق منه.",
    "quotedBaked": "مقتبس من ويكيبيديا كما كان في {date}، ولم نتحقق منه.",
    "textCredit": "النص: مساهمو ويكيبيديا، CC BY-SA 4.0.",
    "readArticle": "اقرأ المقالة كاملة",
    "inEnglish": "لا توجد مقالة بهذه اللغة بعد، لذا هذه هي المقالة الإنجليزية.",
    "family": "عن {fleet} ككل: لا توجد مقالة عن هذا القمر الصناعي بعينه.",
    "photo": "الصورة: {artist}، {licence}، عبر Wikimedia Commons.",
    "photoNoArtist": "الصورة: {licence}، عبر Wikimedia Commons.",
    "photoAlt": "الصورة في أعلى مقالة ويكيبيديا {title}",
    "loading": "نسأل ويكيبيديا…",
    "read": "اقرأ بصوت عالٍ",
    "readTitle": "اقرأ هذه البطاقة بصوت جهازك",
    "stop": "أوقف القراءة",
    "reading": "تجري القراءة"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "الزمن العميق",
    "back": "−{n} سنة",
    "on": "+{n} سنة",
    "backTitle": "العودة {n} سنة إلى الوراء مع إبقاء التاريخ والساعة",
    "onTitle": "التقدّم {n} سنة مع إبقاء التاريخ والساعة",
    "presetsLabel": "نجوم قطبية أخرى",
    "presets": {
      "thuban": "الثعبان، 2800 ق.م",
      "vega": "النسر الواقع، 13 700 م",
      "far": "50 000 م"
    },
    "presetTitles": {
      "thuban": "حين بُنيت الأهرامات كان الثعبان في كوكبة التنين هو النجم القطبي",
      "vega": "نحو عام 13 700 م يقترب القطب من النسر الواقع إلى 6.5°",
      "far": "السماء بعد خمسين ألف سنة"
    },
    "yearAd": "{n} م",
    "yearBc": "{n} ق.م",
    "moved": "سماء {year}: كل نجم مُزاح بحركته المقيسة الخاصة.",
    "far": "لا يُرسم القمر ولا الكواكب على هذا البعد من اليوم، والشمس حيث يضعها التقويم.",
    "pole": "النجم القطبي: {name}، على بعد {deg}° من القطب.",
    "noPole": "لا نجم ساطع يعلّم القطب: أقربها، {name}، على بعد {deg}°.",
    "unnamed": "نجم من القدر {mag}",
    "honest": "الحركات مقيسة (هيباركوس وغايا عبر HYG)؛ ومدّها في خطوط مستقيمة آلاف السنين نموذج. دوران محور الأرض: فوندراك وكابيتين ووالاس 2011."
  },
  "variables": {
    "label": "كيف يتغيّر ضوؤه",
    "types": {
      "eclipse": "زوج كسوفي: نجمان يمرّ أحدهما أمام الآخر.",
      "binary": "زوج متقارب مشدود عن الاستدارة، فلا يثبت ضوؤه أبدًا.",
      "pulse": "نجم نابض: ينتفخ وينكمش.",
      "sine": "نجم صغير سريع النبض.",
      "sr": "عملاق شبه منتظم: دورته ومداه مقيسان، لكن لا يُعرف أين هو من دورته، فالمنحنى رسم تقريبي.",
      "irregular": "متغيّر غير منتظم: لا ساعة تقول كم هو ساطع، فتبقي السماء سطوع الفهرس."
    },
    "periodDays": "الدورة {n} يومًا.",
    "periodYears": "الدورة {n} سنة.",
    "aria": "منحنى ضوء {name}، من القدر {bright} إلى {faint}؛ الآن {now}.",
    "now": "الآن",
    "nowLine": "الآن القدر {mag} ({band})؛ ويتراوح من {bright} إلى {faint}.",
    "range": "يتراوح من القدر {bright} إلى {faint} ({band}).",
    "far": "لا يُمدّ منحناه أبعد من {years} سنة من اليوم؛ ويتراوح من القدر {bright} إلى {faint} ({band}).",
    "nextMin": "النهاية الصغرى التالية: {when}",
    "measured": "مقيس: أقدار الخفوت العظيم المؤرّخة. العناصر: {cite}.",
    "modelled": "نموذج: الشكل مرسوم من دورة الفهرس وعهده ومداه ({cite}).",
    "notes": {
      "alf-ori": "في 2019 و2020 خفت إلى القدر 1.6، الخفوت العظيم: سحابة غبار قذفها حجبت جزءًا منه.",
      "omi-cet": "تأتي نهايات ميرا العظمى مبكرة أو متأخرة أسابيع من دورة إلى أخرى، فقد تخطئ هذه التواريخ بقدر ذلك.",
      "bet-lyr": "تطول دورته 19 ثانية كل سنة؛ ويتبع المنحنى التقويم التربيعي لهارمانيتس وشولتس (1993).",
      "bet-per": "كسوفات الغول دقيقة إلى الدقيقة: يخفت نحو عشر ساعات كل 2.87 يوم.",
      "eps-aur": "يُكسف نحو سنتين كل 27 سنة بقرص مظلم حول رفيقه؛ وامتدّ آخر كسوف من 2009 إلى 2011.",
      "eta-car": "في ثورانه العظيم في أربعينيات القرن التاسع عشر صار ثاني ألمع نجم في السماء.",
      "t-crb": "مستعر متكرر: توهّج إلى القدر 2 في 1866 و1946."
    }
  },
  "blackHoleSpin": {
    "spin": "مرسوم دوّارًا بدوران a = {a}: للظل الشكل الذي يلقيه ثقب دوّار (باردين 1973)، مدفوعًا بعيدًا عن الجانب المقبل نحونا. {why} وما زال الضوء حوله يُتتبّع بلا دوران، فالشكل نموذج.",
    "spinWhy": {
      "m87-star": "الدوران مختار: أفضل نماذج الورقة الخامسة من EHT 2019 تدور بـ 0.94.",
      "sgr-a-star": "الدوران مختار: تفضّل الورقة الخامسة من EHT 2022 من 0.5 إلى 0.94."
    }
  }
});
// b200-f3-stars: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "مسار الطيران",
    "flightTitle": "خطّط لمسار الكاميرا بين المشاهد، وعاينه، وشاركه كرابط",
    "record": "تسجيل",
    "recordTitle": "سجّل هذا المشهد أو مسار طيران أو رحلة كفيديو",
    "dome": "قبة و360",
    "domeTitle": "اعرض السماء كقبة قبة سماوية أو كصورة بزاوية 360 درجة",
    "failed": "لم يُحمَّل ذلك. حاول مرة أخرى بعد قليل."
  },
  "flight": {
    "title": "مسار الطيران",
    "sheet": "مسار الطيران: اسحب لتغيير الحجم",
    "close": "إغلاق مسار الطيران",
    "play": "تشغيل",
    "playTitle": "حلّق في المسار من موضع المنزلق",
    "stop": "إيقاف",
    "stopTitle": "أوقف الطيران هنا",
    "scrub": "الموضع على المسار",
    "scrubAt": "{at} من {total}",
    "hint": "حلّق بالخريطة إلى مشهد يعجبك، ثم اضغط «أضف هذا المشهد». مشهدان يصنعان مسارًا.",
    "hintOne": "مشهد واحد. حلّق إلى مكان آخر وأضف مشهدًا آخر.",
    "hintMany": "{n} مشاهد. اضغط تشغيل، أو اسحب المنزلق للنظر على طول المسار.",
    "add": "أضف هذا المشهد",
    "addTitle": "احفظ موضع الكاميرا وما تنظر إليه والساعة",
    "keysLabel": "مشاهد المسار بالترتيب",
    "keyName": "{n}. {name}",
    "goTitle": "انتقل إلى هذا المشهد",
    "keyLive": "الساعة كما تجري",
    "point": "نقطة في الفضاء",
    "duration": "الطيران",
    "seconds": "{n} ث",
    "ease": "التسارع",
    "eases": {
      "smooth": "بداية وتوقف ناعمان",
      "cruise": "طيران ثابت",
      "constant": "سرعة ثابتة"
    },
    "rate": "الساعة",
    "rateLive": "الوقت الحقيقي",
    "up": "↑",
    "upLabel": "قدّم المشهد {n}",
    "down": "↓",
    "downLabel": "أخّر المشهد {n}",
    "replace": "استخدم هذا المشهد",
    "replaceLabel": "استبدل المشهد {n} بالمشهد الحالي",
    "remove": "إزالة",
    "removeLabel": "أزل المشهد {n}",
    "copyLink": "نسخ الرابط",
    "copyLinkTitle": "المسار كله في رابط واحد: لا يُحفظ شيء في أي مكان",
    "linkCopied": "نُسخ الرابط ({n} حرفًا). من يفتحه يشاهد هذا الطيران.",
    "linkInBar": "الرابط في شريط العنوان: انسخه من هناك.",
    "draft": "حفظ مسودة رحلة",
    "draftTitle": "مسودة ملف رحلة لرحلات الخريطة، ليكملها شخص",
    "draftSaved": "حُفظت مسودة الرحلة. البطاقات لك لتكتبها.",
    "record": "سجّل هذا الطيران",
    "recordTitle": "سجّل الطيران كفيديو",
    "clear": "مسح",
    "clearTitle": "أزل كل المشاهد",
    "needTwo": "يحتاج المسار إلى مشهدين على الأقل.",
    "full": "يتسع المسار لـ{n} مشاهد على الأكثر.",
    "noView": "لا يمكن حفظ هذا المشهد: انظر إلى شيء أولًا.",
    "badLink": "تعذّرت قراءة رابط الطيران هذا.",
    "honesty": "كل مشهد يُظهر الأشياء حيث هي في وقت ساعته. الطيران بين المشاهد حركات كاميرا نرسمها، وليس مسار مركبة فضائية."
  },
  "record": {
    "title": "تسجيل",
    "sheet": "تسجيل: اسحب لتغيير الحجم",
    "close": "إغلاق التسجيل",
    "whatLabel": "ماذا تسجّل",
    "sourceView": "هذا المشهد",
    "sourcePath": "مسار الطيران",
    "sourceTrip": "الرحلة حتى نهايتها",
    "length": "المدة",
    "seconds": "{n} ثانية",
    "shapeLabel": "الشكل",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "مربع",
      "tall": "عمودي 9:16 (Reels وTikTok وShorts)"
    },
    "smooth": "إطارًا بإطار (سلس على أي جهاز)",
    "smoothNote": "تعيد الصفحة تحميل هذا المشهد على ساعة خاصة بها وترسم كل إطار كاملًا قبل التقاطه: الجهاز البطيء يسجّل ببطء، لكن دون تقطّع أبدًا.",
    "silent": "التسجيل إطارًا بإطار لا يسجّل الصوت.",
    "withSound": "الصوت الذي تسمعه يُسجَّل أيضًا.",
    "noSound": "الصوت مغلق، لذا سيكون الفيديو صامتًا. شغّل الصوت أولًا لتحتفظ بصوت الرحلة وموسيقاها.",
    "start": "ابدأ التسجيل",
    "stop": "إيقاف",
    "save": "احفظ الفيديو",
    "share": "شارك الفيديو",
    "saved": "حُفظ الفيديو.",
    "cannot": "لا يستطيع هذا المتصفح تسجيل الفيديو. الإصدارات الحديثة من Chrome وEdge وSafari وFirefox تستطيع.",
    "rolling": "جارٍ التسجيل: {at} ث",
    "made": "تم: {mb} ميغابايت. احفظه أو شاركه.",
    "empty": "لم يسجّل المتصفح شيئًا. حاول مرة أخرى، أو اختر إطارًا بإطار.",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · الخرائط والبيانات: NASA وESA وSolar System Scope وغيرها",
    "endTitle": "شاهد بنفسك",
    "endLine": "Space Radar: مجاني، في متصفحك.",
    "endCredit": "الخرائط والبيانات: NASA وESA وUSGS وSolar System Scope وHYG وغيرها، بتراخيصها الخاصة (CC BY وCC BY-SA). الشكر والمصادر في spaceradar.ai.",
    "filmTitle": "تسجيل إطارًا بإطار",
    "filmWarming": "جارٍ تجهيز المشهد…",
    "filmFrame": "الإطار {n} من {total}",
    "filmDone": "تم: {mb} ميغابايت، {s} ثانية. حُفظ الملف.",
    "filmFailed": "توقف التسجيل: {why}",
    "back": "العودة إلى الخريطة"
  },
  "dome": {
    "title": "قبة و360",
    "sheet": "قبة و360: اسحب لتغيير الحجم",
    "close": "إغلاق قبة و360",
    "kindLabel": "كيف تُرسم السماء",
    "normal": "عادي",
    "dome": "قبة، 180 درجة (قبة سماوية)",
    "wide": "360 درجة (YouTube 360)",
    "tilt": "ميل القبة",
    "tiltDeg": "{n}°",
    "size": "الحجم",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "احفظ هذا الإطار",
    "skySize": "وجه صندوق السماء",
    "saveSky": "احفظ صندوق سماء",
    "saved": "حُفظ: {w} × {h} px.",
    "saveFailed": "تعذّر رسم الصورة.",
    "intro": "صورة قبة أو صورة بزاوية 360 درجة لما تراه الكاميرا، مباشرة. تُخفى الأسماء ما دامت مفعّلة.",
    "live": "مباشر، {n} px لكل وجه.",
    "livePhone": "مباشر بدقة {n} px لكل وجه: على الهاتف هذه معاينة. احفظ إطارًا لتحصل على صورة حادة.",
    "noGpu": "رسوميات هذا الجهاز لا تستطيع رسمها.",
    "busy": "أغلق أولًا العالم المتخيَّل أو اللحظة: فهو يرسم صورته الخاصة.",
    "off": "عودة إلى الصورة العادية.",
    "credit": "حر الاستخدام مع هذا الإسناد: Space Radar، spaceradar.ai. الخرائط والبيانات: NASA وESA وUSGS وSolar System Scope وHYG وغيرها؛ تسرد لوحة المصادر ترخيص كل منها.",
    "how": "للقبة، أضف ‎#proj=dome,30 بعد رابط رحلة وافتحه بملء الشاشة. الخطوات في docs/PLANETARIUMS.md."
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "تحدّي اليوم",
    "close": "إغلاق",
    "day": "لغز يوم {day} (بالتوقيت العالمي)، وهو نفسه للجميع اليوم.",
    "games": {
      "find-earth": {
        "title": "اعثر على الأرض",
        "blurb": "من المجرّات نزولًا إلى كوكبنا، بأقل عدد ممكن من الاختيارات."
      },
      "which-world": {
        "title": "أيّ عالم هذا؟",
        "blurb": "لقطة مقرّبة من خريطة حقيقية: اختر العالم من بين أربعة."
      },
      "guess-distance": {
        "title": "خمّن المسافة",
        "blurb": "حرّك المؤشّر إلى عدد السنوات الضوئية التي تفصله عنا."
      }
    },
    "other": "تحدّيات أخرى",
    "loading": "ما زالت الخريطة تُحمَّل؛ يبدأ التحدّي حين تجهز.",
    "rung": "الخطوة {n} من {of}: {where}",
    "rungs": {
      "local-group": "المجموعة المحلية",
      "galaxy": "درب التبّانة",
      "stellar": "جوار الشمس",
      "sun": "المجموعة الشمسية"
    },
    "ask": {
      "local-group": "أيّ علامة هي مجرّتنا، درب التبّانة؟",
      "galaxy": "أيّ علامة هي الشمس؟",
      "stellar": "أيّ علامة هي الشمس؟",
      "sun": "أيّ علامة هي الأرض؟"
    },
    "hints": {
      "local-group": "لمجرّتنا رفيقتان صغيرتان قريبتان منها، سحابتا ماجلان.",
      "galaxy": "تبعد الشمس نحو 27 ألف سنة ضوئية عن الثقب الأسود في المركز، في ذراع هادئة.",
      "stellar": "أقرب النجوم إلى الشمس أقزام حمراء خافتة، وألفا قنطورس على بعد 4.4 سنوات ضوئية.",
      "sun": "الأرض هي العالم الثالث بعدًا عن الشمس."
    },
    "hint": "تلميح (يكلّف محاولة)",
    "mark": "العلامة {letter}، {where}",
    "places": {
      "tl": "أعلى اليسار",
      "tc": "في الأعلى",
      "tr": "أعلى اليمين",
      "ml": "يسارًا",
      "mc": "في الوسط",
      "mr": "يمينًا",
      "bl": "أسفل اليسار",
      "bc": "في الأسفل",
      "br": "أسفل اليمين"
    },
    "milkyWay": "درب التبّانة",
    "sunName": "الشمس",
    "tries": "الاختيار {n} من {max}",
    "wrong": "ليست هذه: {letter} هي {name}.",
    "right": "نعم: {name}. نقترب الآن.",
    "found": "وجدت الأرض في {n} اختيارات.",
    "lost": "نفدت الاختيارات. كانت الأرض العالم الثالث بعدًا عن الشمس.",
    "honest": "تقع العلامات حيث ترسم الخريطة كل جرم. في خطوة المجموعة الشمسية تُرسم العوالم أقرب مما هي عليه، كما في كل ذلك المشهد.",
    "round": "الجولة {n} من {of}",
    "worldAsk": "من أيّ عالم هذه اللقطة المقرّبة؟",
    "more": "أظهر المزيد من الخريطة",
    "worldRight": "نعم: {name}.",
    "worldWrong": "لا: كان {name}.",
    "credit": "الخريطة: {credit}",
    "worldPicture": "لقطة مقرّبة من خريطة حقيقية لأحد عوالم المجموعة الشمسية",
    "distAsk": "كم يبعد {name}؟",
    "slider": "المسافة بالسنوات الضوئية",
    "guess": "خمّن",
    "reveal": "يبعد {name} مسافة {value}: كان تخمينك {off}.",
    "offs": {
      "hit": "ضمن الربع",
      "near": "ضمن الضعف",
      "far": "ضمن خمسة أضعاف",
      "miss": "بعيدًا بأكثر من خمسة أضعاف"
    },
    "source": "المسافة: {source}",
    "units": {
      "ly": "{n} سنة ضوئية",
      "kly": "{n} ألف سنة ضوئية",
      "mly": "{n} مليون سنة ضوئية",
      "bly": "{n} مليار سنة ضوئية"
    },
    "next": "التالي",
    "scores": {
      "find-earth": "{n} من 10 اختيارات",
      "which-world": "{n} من 3 عوالم",
      "guess-distance": "{n} من 3 ضمن الضعف"
    },
    "shareTitle": "Space Radar: {game}",
    "share": "شارك النتيجة",
    "copied": "نُسخت. الصقها في أي مكان.",
    "copyFailed": "تعذّر النسخ: حدّد النص أعلاه.",
    "played": "انتهيت لليوم. يأتي تحدٍّ جديد عند منتصف الليل بالتوقيت العالمي.",
    "streak": "{n} أيام متتالية"
  }
});
// b200-f6-learn: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "تسجيلات حقيقية من هنا",
    "play": "استمع إلى {name}",
    "stop": "إيقاف",
    "hide": "إخفاء التسجيلات هنا",
    "sonified": "بيانات حقيقية حُوّلت إلى صوت",
    "microphone": "صوت حقيقي من ميكروفون",
    "playing": "قيد التشغيل: {name}. {how}.",
    "failed": "لم يُحمَّل هذا التسجيل.",
    "names": {
      "real-voyager-plasma": "فوييجر 1 في الفضاء بين النجمي",
      "real-juno-ganymede": "جونو وهي تمر بجانب غانيميد",
      "real-cassini-saturn": "إشارات زحل الراديوية",
      "real-insight-impact": "نيزك يرتطم بالمريخ",
      "real-perseverance-dust-devil": "دوامة غبار على المريخ"
    }
  }
});
// b200-f9-reach: end
