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
    "notLoaded": "ما زال يُحمَّل",
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
    "oftenSaidLabel": "يُقال كثيرًا",
    "notApplicable": "هذا ليس مما يخص هذا الجرم",
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
      "still": "مرسوم بوضع نموذجه الراداري ولا يدور هنا: فالنموذج لا يذكر في أي اتجاه يقع محور دورانه"
    },
    "objectSeen": {
      "lutetia": "غطّت صور Rosetta أكثر من نصف سطحه؛ والباقي من الشكل مُلائم لتغيرات سطوعه، وليس مصوَّرًا",
      "steins": "غطّت صور Rosetta نحو 60 في المئة من سطحه؛ والباقي من الشكل مُلائم لتغيرات سطوعه، وليس مصوَّرًا",
      "donj": "الشكل مبني من صور Lucy بالمساحة التصويرية المجسّمة وبمطابقة محيطه؛ والجانب الذي لم يره Lucy هو من المطابقة",
      "arrokoth": "تغطي صور New Horizons الجانب الذي مرّت بجانبه؛ والجانب الآخر مستنتج وليس مصوَّرًا، واللون هو خريطة ألبيدو بصبغة حمراء",
      "radar": "الشكل مبني من أصداء الرادار، وليس من صور: فمحيطه مقيس، أما أدق تفاصيله فلا",
      "comet": "الشكل هو شكل Rosetta، من أكثر من 20 000 صورة على مدى عامين، والسطح كله مغطى"
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
    "systemLine": "الأحجام والمدارات من NASA Exoplanet Archive؛ والألوان{phase} وميل المدارات توضيحية.",
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
    "honesty": "معدود من فهرس CelesTrak كما قُرئ في {date}: ما يستطيع الرادار تتبعه، من نحو 10 سم عرضًا. والقطع الأصغر أكثر عددًا بكثير وليست في أي فهرس. أما موضع النقطة على مدارها فتوضيحي."
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
      "timeNoNight": "لا يحل الظلام هنا الليلة.",
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
    "from": "من",
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
    "keys": "مسافة للتشغيل أو الإيقاف المؤقت، والأسهم للخطو، وEscape للإغلاق"
  },
  "momentShelf": {
    "title": "لحظات",
    "note": "ثلاث مهمات تُعاد على ساعة واحدة، بأوقات الأحداث الحقيقية. المسارات معاد بناؤها وتقول ذلك.",
    "minutes": "{m} د",
    "replay": "أعد هذه اللحظة",
    "replayTitle": "أعد {title} على ساعة المهمة",
    "replayNamed": "إعادة عرض {title}",
    "cards": {
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
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 أبريل 1961",
        "blurb": "يوري غاغارين، دورة واحدة حول الأرض في 108 دقائق، من بايكونور إلى حقل قرب سميلوفكا."
      }
    }
  },
  "momentStories": {
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
      "srcClip": "أولى كلمات أرمسترونغ على القمر: تسجيل NASA، ملكية عامة، من Wikimedia Commons"
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
  "ephemeris": "جدول يبيّن أين سيكون الشيء، محسوب مسبقًا."
};
