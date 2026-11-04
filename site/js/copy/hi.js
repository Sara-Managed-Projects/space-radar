// hi: Hindi, the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).
// Fetched by copy/index.js only when the page speaks Hindi (?lang=hi); hidden until a native reader has signed off (docs/TRANSLATING.md).
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.
// Until a second native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Hindi only to a visitor who asks for it (?lang=hi), and the language picker does not list it.
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: plain spoken Hindi, impersonal or aap-form, no "tum"; short sentences for read-aloud trips.
//   * Honesty words (one each, everywhere): measured = मापा हुआ; worked out/computed = गणना से निकाला; modelled = मॉडल (से बनाया); illustrative = सांकेतिक; reconstructed = पुनर्निर्मित; artist's impression = कलाकार की कल्पना; sample = नमूना.
//   * Look modes: Measured = "मापा हुआ", Film = "सिनेमा"; Hubble mode = "Hubble की नज़र से".
//   * Planets and big moons use the Hindi school names (शुक्र, बृहस्पति, शनि, अरुण, वरुण); Pluto stays प्लूटो (not यम); small moons are transliterated (टाइटन, यूरोपा, शैरन).
//   * natural moon = चंद्रमा, artificial satellite = उपग्रह; "Moon" for our Moon is also चंद्रमा.
//   * Spacecraft, agencies, catalogues, surveys and people stay in Latin script (Voyager, Hubble, NASA JPL, Kopparapu et al.); mission quotations by Armstrong stay in English; Gagarin's Poyekhali is kept, other Russian quotes are given in Hindi.
//   * Unsure: card.articles and card.leadVerbs are empty/"है","था" because the English "Name is ..." rewrite cannot work in SOV Hindi; theWord is empty.
//   * Unsure: "प्रकाश-वर्ष" written out in full for ly; "million" = मिलियन, "billion" = अरब; Moon phases use अमावस्या/पूर्णिमा, quarters as तिमाही; compass short forms (उउपू...) are ugly.
//   * Unsure: tropical cyclone words (हरिकेन, टाइफ़ून) and "रहने लायक पट्टी" for habitable zone; "परिमाण" for magnitude.

export const META = {
  code: "hi",
  name: "हिन्दी",
  english: "Hindi",
  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },
};

export const RULES = {
  // Hindi writes a decimal point in Latin digits, as the app does.
  decimal: '.',
  // Hindi has no indefinite article.
  article() {
    return '';
  },
  // Hindi treats 0 and 1 as singular; any other number takes the plural form.
  plural(n, one, many) {
    const x = Math.abs(Number(n));
    return x === 0 || x === 1 ? one : many;
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "आकाश बनाया जा रहा है…",
    "bootEarth": "पृथ्वी रखी जा रही है…",
    "bootCatalogues": "कैटलॉग पढ़े जा रहे हैं…",
    "tagline": "पृथ्वी के आसपास जो कुछ भी चल रहा है, ठीक वहीं जहाँ वह सचमुच है, अभी इसी पल।",
    "sceneSelected": "अंतरिक्ष का नक्शा, असली जगहों पर बना हुआ। इसमें {name} चुना गया है: नक्शे के बगल वाले पैनल में उसका कार्ड बताता है कि वह क्या है।"
  },
  "compareText": {
    "size": [
      "लगभग एक टोस्टर जितना बड़ा",
      "लगभग एक वॉशिंग मशीन जितना बड़ा",
      "लगभग एक कार जितना बड़ा",
      "लगभग एक बस जितना बड़ा",
      "लगभग एक घर जितना बड़ा",
      "लगभग 15 मंज़िला इमारत जितना ऊँचा",
      "लगभग 25 मंज़िला इमारत जितना ऊँचा",
      "लगभग एक फ़ुटबॉल मैदान जितना बड़ा",
      "लगभग 40 मंज़िला मीनार जितना ऊँचा",
      "लगभग एक क्रूज़ जहाज़ जितना बड़ा",
      "लगभग पृथ्वी की सबसे ऊँची इमारत जितना ऊँचा",
      "लगभग एक छोटे पहाड़ जितना बड़ा",
      "लगभग एक शहर जितना बड़ा"
    ],
    "magnitude": [
      "पूर्णिमा के चाँद जितना चमकीला",
      "किसी भी तारे या ग्रह से ज़्यादा चमकीला",
      "शुक्र जितना चमकीला",
      "सबसे चमकीले तारों जितना चमकीला",
      "एक आम तारे जितना चमकीला",
      "किसी अँधेरी जगह से बस दिखाई देता है",
      "टेलीस्कोप के बिना देखने के लिए बहुत धुँधला"
    ],
    "speed": [
      "{n} किमी/घंटा, हाईवे की रफ़्तार",
      "{n} किमी/घंटा, लगभग हवाई जहाज़ की रफ़्तार",
      "{n} किमी/घंटा, राइफ़ल की गोली से भी तेज़",
      "{n} किमी/घंटा, हर मिनट लगभग {m} किमी"
    ],
    "driving": "{n} किमी ऊपर, अगर सड़क सीधी ऊपर जाती तो गाड़ी चलाने में लगभग {h} {word} लगते",
    "hour": "घंटा",
    "hours": "घंटे",
    "up": "{n} किमी ऊपर",
    "moon": "चंद्रमा की दूरी का {ld} गुना",
    "lightMinutes": "{lt} प्रकाश-मिनट दूर",
    "lightHours": "{lh} प्रकाश-घंटे दूर",
    "compass": [
      "उत्तर",
      "उत्तर-उत्तर-पूर्व",
      "उत्तर-पूर्व",
      "पूर्व-उत्तर-पूर्व",
      "पूर्व",
      "पूर्व-दक्षिण-पूर्व",
      "दक्षिण-पूर्व",
      "दक्षिण-दक्षिण-पूर्व",
      "दक्षिण",
      "दक्षिण-दक्षिण-पश्चिम",
      "दक्षिण-पश्चिम",
      "पश्चिम-दक्षिण-पश्चिम",
      "पश्चिम",
      "पश्चिम-उत्तर-पश्चिम",
      "उत्तर-पश्चिम",
      "उत्तर-उत्तर-पश्चिम"
    ]
  },
  "numberWords": [
    "कोई नहीं",
    "एक",
    "दो",
    "तीन",
    "चार",
    "पाँच",
    "छह",
    "सात",
    "आठ",
    "नौ",
    "दस"
  ],
  "shell": {
    "sideLabel": "खोजें",
    "back": "खोजें",
    "backLabel": "खोजें पर वापस",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "पैनल दिखाएँ",
    "collapse": "पैनल छिपाएँ",
    "topLabel": "खोज और औज़ार"
  },
  "tabs": {
    "label": "कहाँ",
    "earth": "पृथ्वी",
    "planets": "ग्रह",
    "stars": "तारे",
    "tonight": "आज रात"
  },
  "rightNow": {
    "title": "अभी",
    "storms": "{n} तूफ़ान घूम रहे हैं, सबसे ताक़तवर {name}।",
    "stormOne": "एक तूफ़ान घूम रहा है: {name}।",
    "clouds": "आज के बादल",
    "people": "अंतरिक्ष में लोग",
    "iss": "ISS",
    "tiangong": "तियांगोंग",
    "crewAt": "{name} पर {n}"
  },
  "statusLine": {
    "reading": "स्रोत पढ़े जा रहे हैं",
    "read": "इस बार {n} पढ़े गए",
    "readOne": "इस बार एक पढ़ा गया",
    "stale": "{n} पुराने",
    "failed": "{n} पढ़े नहीं जा सके",
    "oldest": "सबसे पुराना {age}",
    "open": "स्रोत खोलें",
    "label": "{text}। स्रोत खोलें",
    "offline": "ऑफ़लाइन: {age} की सहेजी हुई प्रतियाँ दिख रही हैं",
    "offlineNone": "ऑफ़लाइन: इस डिवाइस पर कोई सहेजी प्रति नहीं है"
  },
  "mission": {
    "title": "इसका मिशन",
    "count": "{n} में से {i}",
    "navLabel": "{name} की घटनाएँ",
    "prev": "पिछली घटना",
    "next": "अगली घटना",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (अनुमानित)",
    "go": "इस पल पर जाएँ",
    "goTitle": "घड़ी को इस पल पर ले जाएँ और इसे फ़्रेम में लें",
    "here": "घड़ी इसी पल पर है। लाइव दबाने से वह वापस आ जाती है।",
    "noteSite": "नक्शा इस जगह को उस दिन की रोशनी में दिखा सकता है।",
    "notePath": "नक्शे में उस दिन का रास्ता मौजूद है।",
    "noteCruise": "उस दिन का हमारे पास कोई रास्ता नहीं है: {name} को आज की मापी हुई जगह से सीधी रेखा में पीछे खींचकर दिखाया गया है, जो लगभग एक खगोलीय इकाई तक ठीक है।",
    "noteNone": "नक्शे में उस दिन {name} का कोई रास्ता नहीं है, इसलिए घड़ी वहीं रहती है जहाँ है।",
    "noteNoneWorld": "नक्शे में उस दिन {name} का कोई रास्ता नहीं है, इसलिए घड़ी वहीं रहती है जहाँ है। जिस दुनिया से वह मिला था, वह किसी भी तारीख़ के लिए दिखाई जाती है।",
    "seeWorld": "उस दिन {world} देखें",
    "seeWorldTitle": "घड़ी को उस दिन पर ले जाएँ और {world} पर जाएँ। {name} खुद वहाँ नहीं दिखता",
    "all": "सभी {n} घटनाएँ",
    "fewer": "सूची छिपाएँ",
    "source": "तारीख़ें और आँकड़े: ",
    "unknown": "उस लिंक में ऐसी घटना है जो इस नक्शे में नहीं है।"
  },
  "tripCard": {
    "title": "सफ़र",
    "meta": "{n} पड़ाव · {m} मिनट",
    "metaOne": "एक पड़ाव · {m} मिनट",
    "planning": "पड़ाव तय हो रहे हैं",
    "starting": "शुरू हो रहा है…",
    "cannotRun": "अभी नहीं चल सकता",
    "offOne": "एक सफ़र अभी नहीं चल सकता",
    "offMany": "{n} सफ़र अभी नहीं चल सकते",
    "offWhy": "{line}: {reason}",
    "all": "सभी {n} सफ़र",
    "fewer": "कम सफ़र",
    "onItsOwn": "अपने आप चलाएँ",
    "onItsOwnTitle": "जब तक आप कमान न लें, सफ़र एक के बाद एक चलते रहेंगे",
    "justWatch": "बस देखें",
    "reelLength": "एक चक्कर {m} मिनट का",
    "drift": "बहाव",
    "driftLength": "कोई अंत नहीं",
    "driftTitle": "कैमरा एक चीज़ से दूसरी चीज़ तक घूमता रहता है"
  },
  "explore": {
    "worldsTitle": "दुनियाएँ",
    "worldsDrawn": "ग्रह बिंदुओं की तरह दिखाए गए हैं, असली से बड़े।",
    "farTitle": "दूर की जगहें",
    "systemsTitle": "तारा-मंडल",
    "systemsMild": "रहने लायक पट्टी के पास के ग्रह",
    "systemsExtreme": "अजीब तारा-मंडल",
    "exoRow": "दूसरे तारों के ग्रह",
    "exoShow": "दिखाएँ",
    "exoHide": "छिपाएँ",
    "exoTitle": "ग्रहों वाले हर ज्ञात तारे को चिह्नित करता है",
    "lightYears": "{n} प्रकाश-वर्ष",
    "au": "{n} AU"
  },
  "rail": {
    "label": "औज़ार",
    "show": "क्या दिखाएँ (L)",
    "share": "साझा करें (P)",
    "more": "और औज़ार",
    "moreLabel": "और",
    "menuShare": "साझा करें",
    "menuHide": "पैनल छिपाएँ",
    "menuGitHub": "GitHub पर सोर्स",
    "blog": "ब्लॉग",
    "blogHref": "https://blog.spaceradar.ai/",
    "tour": "टूर लें",
    "menuTour": "टूर लें"
  },
  "timePill": {
    "label": "समय",
    "when": "{date} {time} UTC",
    "live": "लाइव · {when}",
    "held": "{when} · रुका हुआ",
    "away": "{when} · {off}",
    "unknown": "समय पता नहीं",
    "prev": "‹",
    "next": "›",
    "prevTitle": "समय में पीछे",
    "nextTitle": "समय में आगे",
    "backToLive": "लाइव",
    "backToLiveTitle": "असली समय पर वापस, अभी",
    "rate": "{n}×",
    "rateTitle": "रफ़्तार {n}×। {next}× के लिए दबाएँ",
    "hold": "समय को रोकने के लिए क्लिक करें, उसमें घूमने के लिए खींचें",
    "run": "समय को चलाने के लिए क्लिक करें, उसमें घूमने के लिए खींचें",
    "localTitle": "आपका समय {time}, {zone}। {hold}",
    "readLabel": "{text}। {hold}",
    "units": {
      "minute": "1 मिनट",
      "hour": "1 घंटा",
      "day": "1 दिन",
      "event": "घटना"
    },
    "unitWords": {
      "minute": "एक मिनट",
      "hour": "एक घंटा",
      "day": "एक दिन",
      "event": "एक घटना"
    },
    "prevEvent": "पिछली घटना",
    "nextEvent": "अगली घटना",
    "noEventBack": "टाइमलाइन पर इससे पहले कोई घटना नहीं है।",
    "noEventOn": "टाइमलाइन पर इसके बाद कोई घटना नहीं है।",
    "moonMark": "चंद्रमा {phase} है, {date}",
    "sunMark": "आपकी जगह पर {what}, {date}",
    "sunMarkGuess": "आपके लिए अंदाज़े से चुनी जगह पर {what}, {date}",
    "sunWords": {
      "sunrise": "सूर्योदय",
      "sunset": "सूर्यास्त"
    },
    "unitTitle": "{unit} के कदम। {next} के लिए दबाएँ",
    "tapeLabel": "टाइमलाइन। इसे खींचें, या तीर वाली कुंजियाँ दबाएँ",
    "tapeTitle": "समय में घूमने के लिए खींचें",
    "now": "अभी",
    "nowTitle": "अभी पर वापस",
    "rough": "मोटा अनुमान",
    "roughTitle": "आज से एक हफ़्ते के आगे, उपग्रह की कक्षा में उसकी जगह का सिर्फ़ मोटा अनुमान मिलता है",
    "roughSay": "आज से इतनी दूर उपग्रहों की जगहें सिर्फ़ मोटे अनुमान की हैं।",
    "worlds": "ग्रहों और चंद्रमाओं की जगहें सदियों तक सही रहती हैं।",
    "markTitle": "{what}। वहाँ जाने के लिए दबाएँ",
    "endTitle": "टाइमलाइन यहीं खत्म होती है: एक महीना पीछे, एक साल आगे"
  },
  "punctuation": {
    "comma": ", ",
    "dot": "।",
    "separator": " · ",
    "listJoin": ", ",
    "dash": " — ",
    "colon": ": ",
    "ellipsis": "…",
    "sentenceJoin": "। "
  },
  "worlds": {
    "sun": "सूर्य",
    "mercury": "बुध",
    "venus": "शुक्र",
    "earth": "पृथ्वी",
    "moon": "चंद्रमा",
    "mars": "मंगल",
    "jupiter": "बृहस्पति",
    "saturn": "शनि",
    "uranus": "अरुण",
    "neptune": "वरुण",
    "pluto": "प्लूटो",
    "io": "आयो",
    "europa": "यूरोपा",
    "ganymede": "गैनिमीड",
    "callisto": "कैलिस्टो",
    "phobos": "फ़ोबोस",
    "deimos": "डीमोस",
    "enceladus": "एन्सेलेडस",
    "titan": "टाइटन",
    "triton": "ट्राइटन",
    "charon": "शैरन"
  },
  "worldFacts": {
    "cite": {
      "pluto": "जगह की गणना Astronomy Engine (Don Cross, MIT लाइसेंस) से की गई है, जो प्लूटो को सूर्य और विशाल ग्रहों के खिंचाव में चलता हुआ मानता है; त्रिज्या Wikipedia के प्लूटो इन्फ़ोबॉक्स से, यह क्या है NASA Science से, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "io": "जगह की गणना Astronomy Engine (Don Cross, MIT लाइसेंस) से की गई है: बृहस्पति, और उसके चंद्रमाओं का L1.2 सिद्धांत (Lainey, Duriez और Vienne); त्रिज्या NASA की बृहस्पति के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "europa": "जगह की गणना Astronomy Engine (Don Cross, MIT लाइसेंस) से की गई है: बृहस्पति, और उसके चंद्रमाओं का L1.2 सिद्धांत (Lainey, Duriez और Vienne); त्रिज्या NASA की बृहस्पति के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "ganymede": "जगह की गणना Astronomy Engine (Don Cross, MIT लाइसेंस) से की गई है: बृहस्पति, और उसके चंद्रमाओं का L1.2 सिद्धांत (Lainey, Duriez और Vienne); त्रिज्या NASA की बृहस्पति के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "callisto": "जगह की गणना Astronomy Engine (Don Cross, MIT लाइसेंस) से की गई है: बृहस्पति, और उसके चंद्रमाओं का L1.2 सिद्धांत (Lainey, Duriez और Vienne); त्रिज्या NASA की बृहस्पति के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "phobos": "जगह: मंगल Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 6 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, चमक NASA की मंगल फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, सब 2026-09-22 को पढ़ा गया",
      "deimos": "जगह: मंगल Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 120 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, चमक NASA की मंगल फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, सब 2026-09-22 को पढ़ा गया",
      "enceladus": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 1 480 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, यह क्या है और इसका रंग NASA Science से, इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "titan": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 840 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, यह क्या है NASA Science से, ह्यूगेन्स का उतरना, इसका रंग और इसे कैसे देखें Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "triton": "जगह: वरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 10 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, यह क्या है NASA Science से, इसका रंग और चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "charon": "जगह: प्लूटो Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 1 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, चमक NASA की प्लूटो फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, सब 2026-09-22 को पढ़ा गया",
      "mimas": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 700 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की शनि के उपग्रहों की फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "tethys": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 120 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की शनि के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "dione": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 240 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की शनि के उपग्रहों की फ़ैक्ट शीट से, इसका रंग NASA Science से, यह क्या है और इसकी चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "rhea": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 200 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की शनि के उपग्रहों की फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "iapetus": "जगह: शनि Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 6 800 किमी के भीतर मिलती है, यानी उसकी कक्षा का 0.19 प्रतिशत; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, दोनों एल्बीडो NASA की शनि के उपग्रहों की फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "miranda": "जगह: अरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 120 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की अरुण के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "ariel": "जगह: अरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 120 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की अरुण के उपग्रहों की फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "umbriel": "जगह: अरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 410 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की अरुण के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "titania": "जगह: अरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 1 000 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की अरुण के उपग्रहों की फ़ैक्ट शीट से, यह क्या है और इसका रंग NASA Science से, चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया",
      "oberon": "जगह: अरुण Astronomy Engine (Don Cross, MIT लाइसेंस) से, साथ में JPL Horizons पर बैठाई गई एक कक्षा, जो 2000 से 2050 तक उससे 1 230 किमी के भीतर मिलती है; त्रिज्या JPL के उपग्रहों के भौतिक मानकों से, एल्बीडो NASA की अरुण के उपग्रहों की फ़ैक्ट शीट से, यह क्या है NASA Science से, इसका रंग और चमक Wikipedia से, सब 2026-09-22 को पढ़ा गया"
    }
  },
  "worldView": {
    "withParent": "आसमान में {parent} को असली से {n} गुना चौड़ा बनाया गया है ताकि आप उसे ढूँढ सकें, और {name} को उसके चारों ओर उसी पैमाने पर बनाया गया है: {parent} से उसकी दूरी भी उतनी ही बढ़ाई गई है।",
    "withParentFloor": "{name} को खुद और भी बड़ा बनाया गया है, वरना वह देखने के लिए बहुत छोटा होता।",
    "crowded": "{name} को उतना चौड़ा नहीं बनाया गया: इस आसमान में {near} सिर्फ़ {deg} डिग्री दूर है, और उतनी बड़ी गोली उसे ढक देती।"
  },
  "stars": {
    "unnamed": "बिना नाम का तारा (HYG {n})"
  },
  "systems": {
    "mercuryRing": "बुध की कक्षा, पैमाना समझने के लिए"
  },
  "ladder": {
    "title": "कितनी दूर",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, अभी लोड हो रहा है",
    "weShowTitle": "जो कुछ ज्ञात है, उसमें से यह नक्शा क्या दिखाता है",
    "weShowRow": "{n} {what} — कुल {of} में से",
    "edge": "नक्शे का किनारा",
    "edgeHow": "उड़ चलें",
    "edgeTitle": "यहाँ से इस नक्शे के किनारे तक एक उड़ान",
    "home": "पृथ्वी",
    "homeHow": "घर लौटें",
    "homeTitle": "यहाँ से वापस पृथ्वी तक एक उड़ान",
    "flightOff": "इस जगह से नहीं: पहले पृथ्वी, ग्रह या तारे पर जाएँ"
  },
  "sceneNote": {
    "refused": "उपग्रह पढ़े नहीं जा सके।",
    "refusedTitle": "कक्षाएँ छापने वाली साइट CelesTrak इस कनेक्शन से पढ़ी नहीं जा सकी। चंद्रमा, ग्रह, तारे और वे सफ़र जिन्हें उपग्रहों की ज़रूरत नहीं, फिर भी चलते हैं।",
    "why": "स्रोत",
    "close": "×",
    "closeTitle": "यह नोट बंद करें"
  },
  "link": {
    "unknownVersion": "यह लिंक एक नए नक्शे का है। डिफ़ॉल्ट दृश्य दिखाया जा रहा है।",
    "unknownTrip": "वह सफ़र अब इस नक्शे में नहीं है। डिफ़ॉल्ट दृश्य दिखाया जा रहा है।",
    "unknownAt": "वह चीज़ इस नक्शे में नहीं है; डिफ़ॉल्ट दृश्य दिखाया जा रहा है।",
    "unknownStage": "यह नक्शा उस जगह को बीच में नहीं ला सकता। डिफ़ॉल्ट दिखाया जा रहा है।"
  },
  "share": {
    "link": "साझा करें",
    "linkTitle": "यह दृश्य साझा करें: पोस्टकार्ड, लिंक और उसके बारे में कुछ पंक्तियाँ",
    "title": "साझा करें",
    "close": "बंद करें",
    "pictureAlt": "पोस्टकार्ड: यही दृश्य प्रिंट के आकार में फिर से बनाया गया, कैप्शन के साथ",
    "drawing": "पोस्टकार्ड बन रहा है…",
    "noPicture": "पोस्टकार्ड अभी बन नहीं सका।",
    "withTag": "चुनी हुई चीज़ पर टैग",
    "linkLabel": "लिंक",
    "copyLink": "लिंक कॉपी करें",
    "textLabel": "टेक्स्ट",
    "lookingUp": "Wikipedia पर ढूँढ रहे हैं…",
    "wikiSource": "वह Wikipedia लेख जिससे यह लिया गया है",
    "noWiki": "यहाँ कोई Wikipedia टेक्स्ट नहीं है: पोस्ट छोटी होगी।",
    "attribution": "Wikipedia से, CC BY-SA 4.0",
    "native": "साझा करें…",
    "nativeTitle": "आपके डिवाइस का अपना शेयर, जहाँ तस्वीर ली जा सके वहाँ पोस्टकार्ड के साथ",
    "nativeFailed": "शेयर खुला नहीं; इसकी जगह कॉपी या डाउनलोड करें",
    "copy": "टेक्स्ट कॉपी करें",
    "copyTitle": "टेक्स्ट और लिंक कॉपी करें, पोस्ट में चिपकाने के लिए तैयार",
    "copied": "टेक्स्ट और लिंक कॉपी हो गए",
    "linkCopied": "लिंक कॉपी हो गया",
    "copyRefused": "कॉपी करने की इजाज़त नहीं मिली; टेक्स्ट चुना हुआ है, उसे कॉपी करें",
    "jpeg": "JPEG डाउनलोड करें",
    "jpegTitle": "पोस्टकार्ड को JPEG तस्वीर की तरह सहेजें, 6 गुणा 4 इंच, 300 डॉट प्रति इंच",
    "pdf": "PDF डाउनलोड करें",
    "pdfTitle": "पोस्टकार्ड को एक पन्ने की PDF की तरह सहेजें, 6 गुणा 4 इंच, छापने के लिए",
    "email": "ईमेल",
    "emailTitle": "टेक्स्ट और लिंक के साथ एक ईमेल लिखें",
    "emailNote": "ईमेल में तस्वीर नहीं जाती: साझा करें… दबाएँ या उसे डाउनलोड करें।",
    "networksLabel": "यहाँ पोस्ट करें",
    "networkTitle": "इस पोस्ट के साथ {network} नए टैब में खोलें",
    "networkLabel": "{network} पर पोस्ट करें",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}, Space Radar पर",
    "failed": "शेयर अभी खुल नहीं सका",
    "mark": "spaceradar.ai",
    "photo": "फ़ोटो मोड",
    "photoTitle": "एक तस्वीर बनाएँ: सब कुछ छिपा हुआ, एक फ़्रेम, एक कैप्शन",
    "embed": "एम्बेड",
    "embedTitle": "वह कोड कॉपी करें जो इस लाइव दृश्य को किसी वेब पेज में लगाता है",
    "embedCopied": "एम्बेड कोड कॉपी हो गया",
    "embedRefused": "कॉपी करने की इजाज़त अभी नहीं मिली",
    "embedFrameTitle": "{name}, Space Radar पर लाइव",
    "textRow": "पोस्ट का टेक्स्ट"
  },
  "embed": {
    "open": "Space Radar में खोलें",
    "openTitle": "इस दृश्य को पूरे नक्शे में, नए टैब में खोलें",
    "barLabel": "Space Radar, एम्बेड किया हुआ",
    "stationUnread": "पृथ्वी दिख रही है: स्टेशन की जगह पढ़ी नहीं जा सकी"
  },
  "density": {
    "panelTitle": "घनत्व",
    "regular": "सामान्य",
    "compact": "सिमटा हुआ",
    "auto": "अपने आप",
    "autoCompact": "अभी सिमटा हुआ है, क्योंकि यह विंडो छोटी है।",
    "autoRegular": "अभी सामान्य; विंडो 800 px या उससे कम ऊँची हो तो सिमटा हुआ।"
  },
  "nextList": {
    "justHappened": "अभी-अभी हुआ",
    "justHappenedTitle": "पिछले सात दिनों के प्रक्षेपण और वापसी",
    "calendar": "कैलेंडर",
    "calendarTitle": "“{title}” को अपने कैलेंडर में जोड़ें: एक .ics फ़ाइल डाउनलोड होती है",
    "calendarSaved": "{file} सहेजी गई",
    "calendarFailed": "कैलेंडर फ़ाइल बन नहीं सकी",
    "sameName": "{name} ({id})",
    "title": "आगे आने वाला",
    "showAll": "सभी {n} दिखाएँ",
    "showFewer": "कम दिखाएँ",
    "now": "लगभग अभी",
    "inMinutes": "{n} मिनट में",
    "inHours": "{n} घंटे में",
    "todayAt": "आज {time} बजे",
    "tomorrowAt": "कल {time} बजे",
    "launch": "{name} {when} उड़ान भरेगा",
    "launchRough": "{name} {when} के आसपास उड़ान भरेगा — तारीख़ अभी पक्की नहीं है",
    "approach": "{name} {when} पृथ्वी के पास से गुज़रेगा, चंद्रमा की दूरी का {ld} गुना दूर से",
    "approachNoDistance": "{name} {when} पृथ्वी के पास से गुज़रेगा",
    "sizeM": "यह {n} मीटर चौड़ा है",
    "sizeKm": "यह {n} किमी चौड़ा है",
    "sizeRangeM": "लगभग {lo} से {hi} मीटर चौड़ा, इसकी चमक से आँका गया",
    "sizeRangeKm": "लगभग {lo} से {hi} किमी चौड़ा, इसकी चमक से आँका गया",
    "sizeMixed": "लगभग {lo} मीटर से {hi} किमी चौड़ा, इसकी चमक से आँका गया",
    "perihelion": "{name} {when} सूर्य के सबसे पास होगा",
    "pass": "{name} {when} आपके ऊपर से गुज़रेगा",
    "train": "{n} उपग्रहों की एक रेल {when} आपके ऊपर से गुज़रेगी",
    "aurora": "NOAA का पूर्वानुमान है {word}, {when} से (Kp {kp})",
    "auroraNow": "भू-चुंबकीय तूफ़ान चल रहा है: {word} (Kp {kp})",
    "shower": "{name} उल्का वर्षा {date} के आसपास चरम पर होती है, अँधेरे आसमान में घंटे में {zhr} तक",
    "showerMoon": "{name} उल्का वर्षा {date} के आसपास चरम पर होती है, अँधेरे आसमान में घंटे में {zhr} तक, और उस रात चंद्रमा {pct}% रोशन रहेगा",
    "showerNoMoon": "{name} उल्का वर्षा {date} के आसपास चरम पर होती है, अँधेरे आसमान में घंटे में {zhr} तक, और चंद्रमा लगभग नया है",
    "radiantHigh": "आपकी जगह से इसका उद्गम बिंदु {time} के आसपास सबसे ऊपर होता है",
    "radiantLow": "आपकी जगह से इसका उद्गम बिंदु सारी रात नीचे रहता है, इसलिए उल्काएँ बहुत कम दिखेंगी",
    "radiantNeverUp": "आपकी जगह से इसका उद्गम बिंदु उस रात क्षितिज के नीचे रहता है",
    "eclipseKinds": {
      "total": "पूर्ण",
      "annular": "वलयाकार",
      "partial": "आंशिक",
      "hybrid": "मिश्रित",
      "penumbral": "उपछाया"
    },
    "solarEclipseTitle": "{kind} सूर्य ग्रहण",
    "lunarEclipseTitle": "{kind} चंद्र ग्रहण",
    "solarEclipse": "{date} को {kind} सूर्य ग्रहण: चंद्रमा की छाया सबसे गहरी {where} पड़ती है",
    "solarEclipseGrazing": "{date} को {kind} सूर्य ग्रहण, सिर्फ़ बहुत उत्तर या बहुत दक्षिण से दिखेगा",
    "lunarEclipse": "{date} को {kind} चंद्र ग्रहण, जिसे भी चाँद दिखेगा उसके लिए चंद्रमा पृथ्वी की छाया में रहेगा",
    "lunarEclipsePenumbral": "{date} को {kind} चंद्र ग्रहण: चंद्रमा पृथ्वी की बाहरी छाया में बस थोड़ा धुँधला पड़ता है",
    "seasonTitles": {
      "march": "मार्च विषुव",
      "june": "जून अयनांत",
      "september": "सितंबर विषुव",
      "december": "दिसंबर अयनांत"
    },
    "seasons": {
      "march": "{date} को मार्च विषुव: दिन और रात हर जगह लगभग बराबर होते हैं",
      "june": "{date} को जून अयनांत: उत्तर का सबसे लंबा दिन, दक्षिण का सबसे छोटा",
      "september": "{date} को सितंबर विषुव: दिन और रात हर जगह लगभग बराबर होते हैं",
      "december": "{date} को दिसंबर अयनांत: दक्षिण का सबसे लंबा दिन, उत्तर का सबसे छोटा"
    },
    "solstice": "{title}, {date} को",
    "equinox": "{title}, {date} को",
    "eclipseNear": "{city} के पास",
    "eclipseFrom": "{city} से लगभग {km} किमी दूर",
    "eclipseLocal": "आपकी जगह से: {begin} पर शुरू, {peak} पर सबसे गहरा, तब सूर्य का {pct}% ढका होगा, {end} पर खत्म",
    "eclipseLocalTotal": "आपकी जगह से: {begin} पर शुरू, {peak} पर पूर्णता, {end} पर खत्म",
    "eclipseNotVisible": "आपकी जगह से दिखाई नहीं देगा",
    "eclipseBelowHorizon": "आपकी जगह पर जब यह होगा, तब सूर्य क्षितिज के नीचे होगा",
    "classOf": {
      "launch": "एक योजना: प्रक्षेपण कराने वाले का तय किया समय, जो बदल सकता है",
      "approach": "NASA JPL ने क्षुद्रग्रह की मापी हुई कक्षा से गणना करके निकाला",
      "perihelion": "धूमकेतु की प्रकाशित कक्षा से गणना करके निकाला",
      "shower": "हर साल की आम तारीख़; चरम लगभग एक दिन इधर-उधर हो सकता है",
      "aurora": "NOAA का पूर्वानुमान, तीन-तीन घंटे का",
      "auroraNow": "NOAA ने पिछले कुछ घंटों में मापा",
      "pass": "यहाँ {age} मापे गए कक्षीय तत्वों से गणना करके निकाला",
      "passNoAge": "यहाँ कक्षीय तत्वों से गणना करके निकाला",
      "eclipse": "यहाँ सूर्य और चंद्रमा की चाल से मिनट तक सही गणना करके निकाला",
      "season": "यहाँ सूर्य की स्थिति से मिनट तक सही गणना करके निकाला",
      "conjunction": "यहाँ आपकी जगह के लिए गणना करके निकाला, जब दोनों अँधेरे में ऊपर हों और सबसे पास हों"
    },
    "row": {
      "conjunctionTitle": "{a} और {b}",
      "conjunction": "{when} · {sep}° दूर, {dir} में {height}",
      "conjunctionValue": "{sep}°",
      "low": "नीचे",
      "mid": "आधी ऊँचाई पर",
      "high": "ऊपर",
      "launch": "{when} उड़ान · योजना",
      "launchRough": "{when} के आसपास · तारीख़ पक्की नहीं",
      "approach": "{when} पृथ्वी के पास से",
      "approachValue": "{ld}× चंद्रमा",
      "approachSized": "{when} पृथ्वी के पास से · {size}",
      "sizeM": "{n} मीटर",
      "sizeKm": "{n} किमी",
      "sizeRangeM": "लगभग {lo} से {hi} मीटर",
      "sizeRangeKm": "लगभग {lo} से {hi} किमी",
      "perihelion": "{when} सूर्य के सबसे पास",
      "pass": "{when} आपके ऊपर से",
      "trainTitle": "{n} की Starlink रेल",
      "auroraTitle": "ध्रुवीय रोशनी का पूर्वानुमान",
      "auroraNowTitle": "अभी भू-चुंबकीय तूफ़ान",
      "aurora": "NOAA का पूर्वानुमान, {when} से",
      "auroraNow": "NOAA ने पिछले घंटों में मापा",
      "kp": "Kp {kp}",
      "showerTitle": "{name} उल्काएँ",
      "shower": "चरम {date} के आसपास · घंटे में {zhr} तक",
      "eclipse": "{date} · मिनट तक सही गणना",
      "eclipseHere": "{date} · यहाँ से {begin} से {end} तक",
      "eclipseNotHere": "{date} · यहाँ से नहीं दिखेगा"
    },
    "none": "जो कुछ लोड हुआ है उसमें आगे कुछ नहीं आ रहा।",
    "notLoaded": "लोड नहीं हुआ, इसलिए सूची में नहीं: {layers}।"
  },
  "groundTrack": {
    "tick": "+{n} मिनट",
    "label": "इसके पीछे चलें",
    "rideAlong": "साथ सवारी करें",
    "rideAlongTitle": "कैमरे को ठीक इसके पीछे रखें, इसके रास्ते पर आगे देखते हुए। रोकने के लिए खींचें।",
    "lookBeside": "इसके बगल से देखें",
    "showTrack": "इसका ज़मीनी रास्ता बनाएँ",
    "hideTrack": "इसका ज़मीनी रास्ता छिपाएँ",
    "highNote": "इतनी ऊँचाई पर इसका ज़मीन के ऊपर का रास्ता अपने आप नहीं बनता: यह मुश्किल से हिलता है।",
    "trackNote": "गोले पर जो लकीर है वह इसके ठीक नीचे की ज़मीन है, 45 मिनट पीछे (टूटी लकीर) और 90 मिनट आगे, हर 5 मिनट पर एक निशान के साथ।"
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "अंतरिक्ष मौसम: {level} — {age} मापा गया, {via}।",
    "forecastOnly": "अंतरिक्ष मौसम: {level} — यह पूर्वानुमान है, माप नहीं; {via}।",
    "stale": "यह रीडिंग NOAA के वादे से पुरानी है; इसे अंदाज़ा ही समझें।",
    "stormComing": "NOAA का पूर्वानुमान है कि यह बढ़कर Kp {kp} हो जाएगा।",
    "couldNotLook": "अंतरिक्ष मौसम: देखा नहीं जा सका — {why}",
    "couldNotLook0": "अंतरिक्ष मौसम: देखा नहीं जा सका।",
    "justNow": "अभी-अभी",
    "currentBin": "मौजूदा तीन घंटे की अवधि के लिए",
    "aMinuteAgo": "एक मिनट पहले",
    "minutesAgo": "{n} मिनट पहले",
    "anHourAgo": "एक घंटा पहले",
    "hoursAgo": "{n} घंटे पहले",
    "aDayAgo": "एक दिन पहले",
    "daysAgo": "{n} दिन पहले",
    "ageUnknown": "ऐसे समय पर जो NOAA ने नहीं बताया",
    "viaLive": "NOAA SWPC, लाइव पढ़ा गया",
    "viaSnapshot": "NOAA SWPC, हमारी प्रति से",
    "words": {
      "unknown": "कोई रीडिंग नहीं",
      "quiet": "शांत",
      "unsettled": "थोड़ा बेचैन",
      "active": "सक्रिय",
      "minorStorm": "हल्का तूफ़ान — बहुत उत्तर और बहुत दक्षिण में ध्रुवीय रोशनी संभव",
      "moderateStorm": "मध्यम तूफ़ान — ऊँचे अक्षांशों पर ध्रुवीय रोशनी की संभावना",
      "strongStorm": "तेज़ तूफ़ान — ध्रुवों से दूर तक ध्रुवीय रोशनी, उपग्रह अपनी राह से थोड़े हट सकते हैं",
      "severeStorm": "बहुत तेज़ तूफ़ान",
      "extremeStorm": "भीषण तूफ़ान"
    }
  },
  "chooser": {
    "label": "आपकी उँगली के नीचे की चीज़ें",
    "hint": "यहाँ {n} हैं। एक पर टैप करें, या बंद करने के लिए आसमान पर टैप करें।"
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "बंद करें",
    "closeTitle": "यह कार्ड बंद करें (Escape)",
    "it": "यह",
    "articles": [
      "\u200b",
      "\u200b"
    ],
    "leadVerbs": [
      "है",
      "था"
    ],
    "makeCentre": "{name} को नक्शे का केंद्र बनाएँ",
    "isCentre": "यह नक्शे का केंद्र है",
    "centreShort": "नक्शे को यहाँ केंद्र में लाएँ",
    "ownPage": "इसका अपना पन्ना",
    "ownPageTitle": "इसके बारे में एक पन्ना जिसका लिंक दिया जा सकता है, नए टैब में",
    "isCentreShort": "यहाँ केंद्र में",
    "comparisonsLabel": "अंदाज़ा लगाने के लिए",
    "rightNowLabel": "अभी",
    "seeItLabel": "यहाँ से देखें",
    "actionsLabel": "आप क्या कर सकते हैं",
    "unknownName": "बिना नाम की चीज़",
    "unknownKind": "{name} नक्शे में है, पर हमें नहीं पता कि वह किस तरह की चीज़ है",
    "rows": {
      "altitude": "ज़मीन से ऊँचाई",
      "speed": "रफ़्तार",
      "groundPoint": "ठीक ऊपर से गुज़र रहा है",
      "below": "अभी इसके नीचे",
      "fromYou": "आपसे दूरी",
      "fromGuess": "{place} से दूरी, जो आपकी जगह का हमारा अंदाज़ा है",
      "distanceFromEarth": "पृथ्वी से दूरी",
      "distanceFromSun": "सूर्य से दूरी",
      "lightLeft": "इसकी रोशनी इसे छोड़कर चली थी",
      "sunlight": "अभी यह है",
      "hostStar": "इसका तारा",
      "across": "चौड़ाई",
      "mass": "द्रव्यमान",
      "spin": "एक चक्कर में लगता है",
      "source": "यहाँ से पढ़ा",
      "whySource": "यह कैसे पता चला, यहाँ से पढ़ा",
      "widthSource": "चौड़ाई यहाँ से पढ़ी",
      "distanceNote": "उस दूरी के बारे में",
      "objectType": "यह क्या है",
      "constellation": "तारामंडल",
      "distanceRange": "दूरी, सबसे अच्छे अनुमान",
      "planetRadius": "चौड़ाई, पृथ्वी के हिसाब से",
      "planetMass": "द्रव्यमान, पृथ्वी के हिसाब से",
      "yearLength": "वहाँ का एक साल",
      "found": "खोजा गया",
      "catalogueCopy": "कैटलॉग की प्रति",
      "spectralType": "तारे का प्रकार",
      "brightness": "कितना चमकीला दिखता है",
      "luminosity": "रोशनी की मात्रा",
      "starWidth": "चौड़ाई",
      "catalogue": "कैटलॉग",
      "iauName": "IAU से मंज़ूर नाम",
      "lightTime": "रेडियो संदेश को एक तरफ़ लगने वाला समय",
      "nextPass": "आपके ऊपर से अगली बार",
      "crew": "सवार लोग",
      "operator": "चलाने वाला",
      "launched": "प्रक्षेपित",
      "ended": "खत्म हुआ",
      "pathEnds": "इसका रास्ता खत्म होता है",
      "pathBegins": "इसका रास्ता शुरू होता है",
      "period": "एक चक्कर में लगता है",
      "location": "यह कहाँ खड़ा है",
      "onBody": "किस पर",
      "whenSite": "कब",
      "onWorld": "किस पर खड़ा है",
      "orbiting": "किसकी कक्षा में",
      "heightAbove": "{world} से ऊँचाई",
      "closestApproach": "पृथ्वी के सबसे पास",
      "moons": "चंद्रमा",
      "perihelion": "सूर्य के सबसे पास",
      "magnitude": "चमक",
      "phase": "कला",
      "liftoff": "उड़ान भरना",
      "pad": "कहाँ से",
      "destination": "कहाँ जा रहा है",
      "whereabouts": "यह कहाँ है",
      "lastSeen": "आख़िरी बार पता चला",
      "stormNow": "ताज़ा सूचना के समय",
      "stormWind": "रास्ते में सबसे तेज़ हवा",
      "stormAdvisory": "ताज़ा सूचना",
      "stormCentre": "इसका केंद्र",
      "stormAgency": "सूचना देने वाली संस्था",
      "stormAlert": "GDACS चेतावनी स्तर"
    },
    "values": {
      "km": "{n} किमी",
      "kmh": "{n} किमी/घंटा",
      "belowBorder": "{a} और {b} की सरहद के पास",
      "belowLand": "ज़मीन",
      "belowWater": "खुला पानी",
      "stormWind": "{n} किमी/घंटा, पूर्वानुमान मिलाकर",
      "stormWindCategory": "{n} किमी/घंटा, श्रेणी {cat}, पूर्वानुमान मिलाकर",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "हरिकेन जितनी ताक़त",
        "typhoon": "टाइफ़ून जितनी ताक़त",
        "cyclone": "चक्रवात जितनी ताक़त",
        "storm": "उष्णकटिबंधीय तूफ़ान",
        "depression": "उष्णकटिबंधीय अवदाब"
      },
      "stormAlert": {
        "green": "हरा",
        "orange": "नारंगी",
        "red": "लाल"
      },
      "launchedAgo": "{n} दिन पहले, {date} को",
      "au": "{n} खगोलीय इकाई",
      "lightYears": "{n} प्रकाश-वर्ष",
      "inSunlight": "धूप में",
      "inShadow": "पृथ्वी की छाया में",
      "yearsAgo": "{n} साल पहले",
      "monthsAgo": "{n} महीने पहले",
      "suns": "सूर्य का {n} गुना",
      "sunsWide": "सूर्य का {n} गुना, अनुमान",
      "sunsWideMeasured": "सूर्य का {n} गुना, मापा हुआ",
      "earths": "पृथ्वी का {n} गुना",
      "lightYearsRange": "{lo} से {hi} प्रकाश-वर्ष",
      "kmRange": "{lo} से {hi} किमी",
      "noMoonsKnown": "कोई ज्ञात नहीं",
      "sunsRange": "सूर्य का {lo} से {hi} गुना",
      "millionSuns": "{n} मिलियन सूर्य",
      "billionSuns": "{n} अरब सूर्य",
      "milliseconds": "{n} मिलीसेकंड",
      "billionYearsAgo": "{n} अरब साल पहले",
      "millionYearsAgo": "{n} मिलियन साल पहले",
      "days": "{n} दिन",
      "hours": "{n} घंटे",
      "yearByMethod": "{year}, {method}",
      "asOf": "{date} तक",
      "magnitude": "परिमाण {n}",
      "lunar": "चंद्रमा की दूरी का {n} गुना",
      "minutes": "{n} मिनट",
      "seconds": "{n} सेकंड",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{world} पर {lat}, {lon}",
      "north": "{n}° उ.",
      "south": "{n}° द.",
      "east": "{n}° पू.",
      "west": "{n}° प."
    },
    "couldNotLook": "इसकी गणना नहीं हो सकी",
    "nobodyKnows": "किसी को नहीं पता",
    "wouldNeed": "इसमें {wouldNeed} लगेंगे।",
    "endedLine": "इसका मिशन {date} को खत्म हुआ। नीचे दी इसकी घटनाएँ उसी समय तक की हैं।",
    "pathEndedLine": "JPL के पास इसका रास्ता {date} को खत्म हो जाता है। नीचे दी इसकी घटनाएँ उसी समय तक की हैं।",
    "pathBeginsLine": "JPL के पास इसका रास्ता {date} से शुरू होता है। नीचे दी इसकी घटनाएँ उसी समय से शुरू होती हैं।",
    "actions": {
      "flyTo": "वहाँ उड़ें",
      "flyToTitle": "कैमरे को इस चीज़ तक ले जाएँ",
      "flyEnded": "यह {date} को खत्म हुआ। वहाँ जाने के लिए इसके मिशन की कोई घटना चुनें",
      "flyPathEnded": "इसका रास्ता {date} को खत्म होता है। वहाँ जाने के लिए इसके मिशन की कोई घटना चुनें",
      "flyPathBegins": "इसका रास्ता {date} से शुरू होता है। वहाँ जाने के लिए इसके मिशन की कोई घटना चुनें",
      "flyNowhere": "इस पल इस चीज़ की कोई जगह नहीं है",
      "seeFromHere": "यहाँ से देखें",
      "seeFromHereTitle": "पृथ्वी पर अपनी जगह से ऊपर देखें",
      "follow": "पीछा करें",
      "followTitle": "वहाँ उड़ें और इसे दृश्य के बीच में रखें",
      "ride": "साथ सवारी करें",
      "rideShort": "सवारी",
      "seeShort": "देखें",
      "postcard": "पोस्टकार्ड",
      "share": "साझा करें"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "ग्रह",
      "moon": "चंद्रमा",
      "dwarf": "बौना ग्रह",
      "ourStar": "तारा",
      "exoplanet": "बाह्यग्रह"
    },
    "regime": {
      "leo": "पृथ्वी की निचली कक्षा",
      "meo": "पृथ्वी की मध्य कक्षा",
      "geo": "भूस्थिर कक्षा",
      "heo": "पृथ्वी की ऊँची कक्षा",
      "inner": "सौरमंडल का भीतरी भाग",
      "outer": "सौरमंडल का बाहरी भाग",
      "belt": "क्षुद्रग्रह पट्टी",
      "beyondNeptune": "वरुण के पार",
      "round": "{world} के चारों ओर",
      "inCon": "{con} में",
      "onWorld": "{world} पर",
      "centre": "सौरमंडल का केंद्र",
      "nearby": "सबसे पास वालों में"
    },
    "hero": {
      "label": "तीन संख्याओं में",
      "missing": "—",
      "captions": {
        "altitude": "{u} ऊपर",
        "away": "{u} दूर",
        "speed": "{u}",
        "period": "{u} प्रति चक्कर",
        "distanceFromSun": "सूर्य से {u}",
        "distanceFromEarth": "पृथ्वी से {u}",
        "lightTime": "एक तरफ़ {u}",
        "spin": "{u} प्रति चक्कर",
        "yearLength": "{u} का एक साल",
        "brightness": "परिमाण",
        "spectralType": "तारे का वर्ग",
        "across": "{u} चौड़ा",
        "lightLeft": "{u} दूर",
        "launched": "दिन से अंतरिक्ष में",
        "fromYou": "आपसे {u}",
        "heightAbove": "{u} ऊपर",
        "other": "{u}"
      },
      "units": {
        "minutes": "मिनट",
        "hours": "घंटे",
        "days": "दिन",
        "seconds": "सेकंड",
        "milliseconds": "मि.सेकंड",
        "astronomical units": "AU",
        "light-years": "प्रकाश-वर्ष",
        "years ago": "प्रकाश-वर्ष",
        "million years ago": "मिलियन प्रकाश-वर्ष",
        "billion years ago": "अरब प्रकाश-वर्ष",
        "months ago": "प्रकाश-महीने"
      }
    },
    "sections": {
      "label": "इसके बारे में और",
      "see": "इसे कब देख सकते हैं",
      "path": "इसका रास्ता",
      "aboard": "कौन सवार है",
      "ridingOn": "यह किस पर सवार है",
      "about": "इसके बारे में",
      "sources": "इस रिकॉर्ड के स्रोत",
      "placeGuessed": "जगह का अंदाज़ा",
      "needsPlace": "आपकी जगह चाहिए",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "{n} सौर धब्बों के समूह बनाए गए हैं, NOAA की {date} की सूची से: हर समूह एक गोल धब्बे की तरह, उसकी बताई जगह और आकार पर, जिसे तब से सूर्य के घूमने ने आगे सरका दिया है।",
    "spotsOne": "एक सौर धब्बे का समूह बनाया गया है, NOAA की {date} की सूची से: एक गोल धब्बे की तरह, उसकी बताई जगह और आकार पर, जिसे तब से सूर्य के घूमने ने आगे सरका दिया है।",
    "spotsPaired": "{n} सौर धब्बों के समूह बनाए गए हैं, NOAA की {date} की सूची से, जिन्हें तब से सूर्य के घूमने ने आगे सरका दिया है। कई धब्बों वाले {pairs} समूहों को पश्चिम में एक अगला धब्बा और पूर्व में एक पिछला धब्बा बनाकर दिखाया गया है; दोनों के बीच की दूरी और क्षेत्रफल का बँटवारा सांकेतिक है। बाकी एक गोल धब्बा हैं।",
    "spotsPairedOne": "एक सौर धब्बे का समूह बनाया गया है, NOAA की {date} की सूची से, जिसे तब से सूर्य के घूमने ने आगे सरका दिया है: पश्चिम में एक अगला धब्बा और पूर्व में एक पिछला धब्बा बनाकर। दोनों के बीच की दूरी और क्षेत्रफल का बँटवारा सांकेतिक है।",
    "regionsCredit": "आज के सौर धब्बों के समूह: NOAA Space Weather Prediction Center, सौर क्षेत्र सारांश",
    "flaresCredit": "सौर ज्वालाएँ: NOAA Space Weather Prediction Center, संपादित घटना सूची",
    "cmeCredit": "कोरोनल मास इजेक्शन: NASA DONKI (Moon to Mars Space Weather Analysis Office और CCMC)"
  },
  "clouds": {
    "live": "बादल: {when}, {ago}, {satellites} ने इन्फ़्रारेड में देखे, NASA GIBS के ज़रिए। सबसे ठंडी चोटियाँ, जहाँ आँधी-तूफ़ान होते हैं, बाकी से ऊँची और ज़्यादा सफ़ेद बनाई गई हैं। यूरोप, अफ़्रीका, हिंद महासागर और ध्रुवों के ऊपर, जिन्हें इनमें से कोई उपग्रह नहीं देखता, बादल सांकेतिक हैं।",
    "at": "{time} UTC पर",
    "between": "{from} और {to} UTC के बीच",
    "atDated": "{date} को {time} UTC पर",
    "betweenDated": "{date} को {from} और {to} UTC के बीच",
    "clockElsewhere": " घड़ी {date} को {time} UTC पर है; बादल वैसे ही रहते हैं जैसे उस तस्वीर ने देखे थे।",
    "and": " और ",
    "illustrative": "बादल: सांकेतिक। यह बीते हुए एक दिन की एक तस्वीर है, जो धीरे-धीरे सरकती है; यह आज का मौसम नहीं है।",
    "illustrativeSaveData": "बादल: सांकेतिक। डेटा बचाने वाले कनेक्शन पर आज की उपग्रह तस्वीरें नहीं लाई जातीं।",
    "illustrativeScrubbed": "बादल: सांकेतिक, क्योंकि घड़ी ताज़ा उपग्रह तस्वीर से 12 घंटे से ज़्यादा दूर है, जो {date} को {time} UTC की है।",
    "gibsAcknowledgement": "हम NASA की Global Imagery Browse Services (GIBS) की सेवाओं से मिली तस्वीरों के इस्तेमाल के लिए आभार व्यक्त करते हैं। GIBS, NASA के Earth Science Data and Information System (ESDIS) का हिस्सा है।",
    "satelliteCredit": "लाइव बादल: GOES-East और GOES-West की इन्फ़्रारेड तस्वीरें, NOAA; Himawari की इन्फ़्रारेड तस्वीरें, Japan Meteorological Agency (JMA)।"
  },
  "aurora": {
    "live": "ध्रुवीय रोशनी: जहाँ NOAA का OVATION मॉडल अगले एक घंटे में उसकी उम्मीद करता है ({time} UTC के लिए उसका पूर्वानुमान, {ago} बना), तस्वीर नहीं। इसकी बारीक तहें बनाई गई हैं।",
    "liveNoFolds": "ध्रुवीय रोशनी: जहाँ NOAA का OVATION मॉडल अगले एक घंटे में उसकी उम्मीद करता है ({time} UTC के लिए उसका पूर्वानुमान, {ago} बना), तस्वीर नहीं।",
    "waiting": "ध्रुवीय रोशनी: NOAA का पूर्वानुमान अभी पहुँचा नहीं है।",
    "failed": "ध्रुवीय रोशनी: NOAA का पूर्वानुमान अभी पढ़ा नहीं जा सका, इसलिए कुछ नहीं बनाया गया।",
    "far": "ध्रुवीय रोशनी: नहीं बनाई गई, क्योंकि घड़ी NOAA के ताज़ा पूर्वानुमान से तीन घंटे से ज़्यादा दूर है।",
    "saveData": "ध्रुवीय रोशनी: डेटा बचाने वाले कनेक्शन पर NOAA का पूर्वानुमान नहीं लाया जाता।",
    "switchedOff": "ध्रुवीय रोशनी: परतों में बंद है।",
    "credit": "ध्रुवीय रोशनी: NOAA Space Weather Prediction Center के OVATION Prime मॉडल का पूर्वानुमान (सार्वजनिक संपत्ति)।",
    "rightNow": "ध्रुवों के पास ध्रुवीय रोशनी की संभावना",
    "rightNowReach": "{lat}° अक्षांश तक ध्रुवीय रोशनी की संभावना",
    "rightNowValue": "Kp {kp}",
    "showMe": "रात वाले हिस्से में ध्रुवीय रोशनी तक उड़ें"
  },
  "weather": {
    "lightning": {
      "live": "बिजली: जहाँ तक NOAA का नक्शा पहुँचता है, यानी अमेरिका महाद्वीपों और प्रशांत महासागर में, वहाँ लगभग {n} बिजलियाँ प्रति मिनट गिरती हैं ({time} तक की उसकी गिनती, {ago})। कहाँ और कितनी बार, यह मापा हुआ है; हर चमक का पल बनाया गया है, और असली से बड़ा।",
      "quiet": "बिजली: जहाँ तक NOAA का नक्शा पहुँचता है, यानी अमेरिका महाद्वीपों और प्रशांत महासागर में, वहाँ लगभग नहीं के बराबर ({time} तक की उसकी गिनती, {ago})।",
      "waiting": "बिजली: NOAA का नक्शा अभी पहुँचा नहीं है।",
      "failed": "बिजली: NOAA का नक्शा अभी पढ़ा नहीं जा सका, इसलिए कुछ नहीं बनाया गया।",
      "away": "बिजली: नहीं बनाई गई, क्योंकि घड़ी NOAA के ताज़ा नक्शे से एक घंटे से ज़्यादा दूर है।",
      "off": "बिजली: इस डिवाइस या कनेक्शन पर नहीं लाई गई।",
      "reducedMotion": "बिजली: नहीं बनाई गई, क्योंकि यह डिवाइस कम हलचल माँगता है।",
      "switchedOff": "बिजली: परतों में बंद है।",
      "credit": "बिजली: गिरने का घनत्व NOAA nowCOAST से, जिसे NWS Ocean Prediction Center ने ज़मीनी नेटवर्क NLDN और GLD360 से बनाया (सार्वजनिक संपत्ति)।"
    },
    "worlds": {
      "jupiter": "मौसम: पट्टियाँ एक-दूसरे के पास से उसी हवा की रफ़्तार से सरकती हैं जो Hubble से मापी गई है, और विशाल लाल धब्बा घूमता है। यह मॉडल से बनाई हलचल है: आज बादल जहाँ हैं वहाँ नहीं बनाए गए।",
      "saturn": "मौसम: पट्टियाँ उसी हवा की रफ़्तार से चलती हैं जो Cassini ने मापी थी। मॉडल से बनाई हलचल, आज के बादल नहीं। उत्तरी ध्रुव का षट्भुज उसकी मापी हुई जगह पर बनाया गया है; उसका रूप सांकेतिक है।",
      "venus": "मौसम: बादलों की परत लगभग चार दिन में एक चक्कर लगाती है, जैसा Venus Express ने मापा, यानी ज़मीन से साठ गुना तेज़। मॉडल से बनाई हलचल, आज के बादल नहीं।",
      "uranus": "मौसम: हवा उसी रफ़्तार से चक्कर लगाती है जो Keck और Gemini से मापी गई है। मॉडल से बनाई हलचल, आज के बादल नहीं।",
      "neptune": "मौसम: हवा उसी रफ़्तार से बहती है जो Voyager 2 ने मापी थी, किसी भी ग्रह में सबसे तेज़। मॉडल से बनाई हलचल, आज के बादल नहीं।",
      "mars": "मौसम: मंगल पर अभी {season} है। बर्फ़ की टोपियाँ और हवा की धूल, जिसकी प्रकाशीय गहराई लगभग {tau} है, वही हैं जो इस मौसम में आम तौर पर होती हैं: मौसमी और सांकेतिक, आज का मौसम नहीं।",
      "titan": "मौसम: उत्तर की हल्की लकीरें उन मीथेन बादलों को दिखाती हैं जो Webb और Keck टेलीस्कोपों ने नवंबर 2022 और जुलाई 2023 में वहाँ देखे थे। सांकेतिक: टाइटन के बादल आज कहाँ हैं, यह पता नहीं।"
    },
    "also": {
      "venus": "साथ घूमता गहरा Y वही है जो पराबैंगनी कैमरे देखते हैं; आँख को शुक्र लगभग सपाट दिखता है, और यहाँ उसकी जगह सांकेतिक है। शुक्र पर बिजली की खबरें आई हैं और उस पर अभी बहस है; इसलिए कोई नहीं बनाई गई।",
      "uranus": "उत्तरी ध्रुव के ऊपर की चमकीली टोपी असली है: उसकी चमक और रंग, अक्षांश-दर-अक्षांश, Hubble के अक्टूबर 2025 के नक्शे से लिए गए हैं, और Hubble ने उसे साल-दर-साल चमकीला होते देखा है क्योंकि 2028 की उत्तरी गर्मी आ रही है।",
      "neptune": "कलाकार के नक्शे पर गहरा अंडाकार Voyager 2 का 1989 का विशाल काला धब्बा है, जो 1994 तक गायब हो गया: सांकेतिक, मापा हुआ रूप में नहीं बनाया गया। सिनेमा रूप में मीथेन के पतले बादल छाया डालते हैं, जो मापे से छह गुना चौड़ी और ऊँची बनाई गई है; हर लकीर हमारी अपनी है।"
    },
    "flashes": {
      "jupiter": "इसके रात वाले हिस्से में कभी-कभार की चमकें उस बिजली को दिखाती हैं जो Juno ने पाई थी, ज़्यादातर बहुत उत्तर में: अक्षांश मापे हुए हैं, हर चमक सांकेतिक है और असली से बड़ी बनाई गई है।",
      "saturn": "इसके रात वाले हिस्से में 36 डिग्री दक्षिण पर कभी-कभार की चमकें उस बिजली को दिखाती हैं जिसकी तस्वीर Cassini ने 2009 में वहाँ ली थी: सांकेतिक और असली से बड़ी, और अब कोई उस पर नज़र नहीं रख रहा।"
    },
    "seasons": [
      "उत्तरी वसंत",
      "उत्तरी गर्मी",
      "उत्तरी पतझड़",
      "उत्तरी सर्दी"
    ]
  },
  "drawing": {
    "orbitLine": "यह लकीर एक चक्कर आगे तक की है, उन्हीं तत्वों से गणना करके निकाली गई जिनसे बिंदु की जगह निकली।",
    "orbitLineYear": "यह लकीर इसके रास्ते का आने वाला एक साल है, उन्हीं तत्वों से गणना करके निकाली गई जिनसे बिंदु की जगह निकली।",
    "orbitLineWhole": "यह लकीर सूर्य के चारों ओर इसकी पूरी कक्षा है, उन्हीं तत्वों से गणना करके निकाली गई जिनसे बिंदु की जगह निकली।",
    "orbitLinePassage": "यह लकीर सौरमंडल से इसका एक बार अंदर आना और बाहर जाना है, उन्हीं तत्वों से गणना करके निकाली गई जिनसे बिंदु की जगह निकली।",
    "variant": "{name} के प्रकाशित आकारों से बनाया गया",
    "family": "{name} की तरह बनाया गया — उसके परिवार का आकार और ऊँचाई, यही सटीक संस्करण नहीं",
    "generic": "एक आम रॉकेट की तरह बनाया गया; {name} के आकार हमारे पास नहीं हैं",
    "genericUnnamed": "एक आम रॉकेट की तरह बनाया गया; इस वाहन के आकार हमारे पास नहीं हैं",
    "disputed": "इसकी ऊँचाई पर स्रोत एकमत नहीं हैं ({disputed})",
    "objectVariant": "{name} के प्रकाशित आकारों से बनाया गया",
    "objectModel": "{name} के एक प्रकाशित मॉडल से बनाया गया",
    "padEmpty": "लॉन्च पैड एक मापी हुई जगह है; {name} उस पर सिर्फ़ सूची के प्रक्षेपणों के आसपास बनाया जाता है",
    "objectMapped": {
      "dawn": "इसकी सतह Dawn यान का श्वेत-श्याम मोज़ेक है, जिस पर हमारा चुना हुआ एक स्लेटी रंग चढ़ाया गया है; इसके गड्ढों की छायाएँ वही हैं जो Dawn ने खींची थीं और यहाँ सूर्य के साथ नहीं हिलतीं"
    },
    "objectFamily": "{name} की तरह बनाया गया — इस तरह की चीज़, यही सटीक चीज़ नहीं",
    "objectOwn": "{name} की तरह बनाया गया",
    "objectMade": {
      "images": "आकार तस्वीरों से बनाया गया; अनुपात लगभग",
      "render": "आकार कलाकार के बनाए चित्र से बनाया गया; अनुपात लगभग",
      "dimensions": "आकार प्रकाशित माप और तस्वीरों से बनाया गया; ब्योरे सरल किए गए"
    },
    "objectWas": {
      "hitomi": "पूरा दिखाया गया है, जैसा फ़रवरी 2016 में छोड़ा गया था; पाँच हफ़्ते बाद यह टूट गया, और यहाँ जिसे ट्रैक किया जा रहा है वह सोलर पैडल के बिना उसका मुख्य हिस्सा है",
      "envisat": "स्थिर दिखाया गया है, उपकरण पृथ्वी की तरफ़ किए हुए, जैसे यह काम करते समय उड़ता था; यह 2012 से निष्क्रिय है और इसे कोई दिशा नहीं देता",
      "ers1": "स्थिर दिखाया गया है, उपकरण पृथ्वी की तरफ़ किए हुए, जैसे यह काम करते समय उड़ता था; इसका मिशन 2000 में खत्म हो गया और इसे कोई दिशा नहीं देता"
    },
    "objectGeneric": "एक आम चीज़ की तरह बनाया गया; {name} का आकार हमारे पास नहीं है",
    "classShape": {
      "satellite": "एक आम उपग्रह",
      "station": "एक आम अंतरिक्ष स्टेशन",
      "debris": "मलबे का एक टुकड़ा",
      "rocket": "एक आम रॉकेट",
      "probe": "एक आम अंतरिक्ष यान",
      "telescope": "एक आम टेलीस्कोप",
      "asteroid": "एक आम क्षुद्रग्रह",
      "dwarf": "अपने मापे हुए आकार का एक सादा गोल पिंड",
      "comet": "एक आम धूमकेतु",
      "site": "ज़मीन पर एक आम जगह",
      "star": "रोशनी का एक बिंदु, जिसका आकार इस पर निर्भर है कि वह आपकी जगह से कितना चमकीला दिखता है",
      "exoplanet": "अपने तारे पर एक निशान — कक्षा खुद इतनी छोटी है कि बनाई नहीं जा सकती",
      "dso": "अपनी तरह की चीज़ों जैसी हल्की चमक, उसकी मापी हुई दूरी पर, उतनी चौड़ी जितनी वह मापी गई है; उसके भीतर की बनावट सांकेतिक है और उसका असली आकार नहीं बनाया गया",
      "exotic": "उसकी मापी हुई दूरी पर एक छल्ला; ब्लैक होल का कोई आकार नहीं जिसे बनाया जा सके और पल्सर बनाने के लिए बहुत छोटा है",
      "exoticStar": "उसकी मापी हुई दूरी पर एक छल्ला; इस पैमाने पर तारा खुद एक बिंदु है"
    },
    "storm": "इसके केंद्र पर एक निशान की तरह बनाया गया; तूफ़ान खुद उसके चारों ओर का बादल है",
    "feature": "एक नामी जगह: यहाँ उसके केंद्र पर एक निशान के सिवा कुछ नहीं बनाया गया, जो बताए गए संदर्भ से रखा गया है; उसके नीचे की ज़मीन खुद नक्शा है",
    "markOnly": "अपनी जगह पर एक निशान; वहाँ बनाने लायक कुछ खड़ा नहीं है",
    "noPlace": "नहीं बनाया गया: इसकी कोई जगह नहीं है जिस पर निशान लगाया जा सके",
    "shower": "उस बिंदु पर एक नाम जहाँ से इसकी उल्काएँ आती लगती हैं, आसमान के दृश्य में इसके चरम के पास; एक दिशा, अंतरिक्ष में कोई जगह नहीं",
    "objectSpin": {
      "spin": "यह अपने मापे हुए ध्रुव के चारों ओर मापी हुई रफ़्तार से घूमता है; इस पल कौन सा हिस्सा सूर्य की ओर है, यह कोई अनुमान नहीं है",
      "pair": "दोनों अपने मापे हुए ध्रुव के चारों ओर मापी हुई रफ़्तार से घूमते हैं, और डिमॉर्फ़ॉस उस दूरी और अवधि पर चक्कर लगाता है जो DART के टकराने के बाद मापी गई; उस कक्षा में वह कहाँ है, यह सांकेतिक है",
      "comet": "यह अपने मापे हुए ध्रुव के चारों ओर उस रफ़्तार से घूमता है जो 2014 में मापी गई थी, और सूर्य हर बार पास से गुज़रने पर उसे कुछ मिनटों से बदल चुका है; इस पल कौन सा हिस्सा सूर्य की ओर है, यह कोई अनुमान नहीं है",
      "still": "यह अपने रडार मॉडल की दिशा में बनाया गया है और यहाँ घूमता नहीं: मॉडल यह नहीं बताता कि इसकी घूर्णन धुरी किस ओर है"
    },
    "objectSeen": {
      "lutetia": "Rosetta की तस्वीरों ने इसकी आधी से ज़्यादा सतह को ढका; बाकी आकार इसकी चमक के बदलावों से बैठाया गया है, खींचा हुआ नहीं",
      "steins": "Rosetta की तस्वीरों ने इसकी लगभग 60 प्रतिशत सतह को ढका; बाकी आकार इसकी चमक के बदलावों से बैठाया गया है, खींचा हुआ नहीं",
      "donj": "आकार Lucy की तस्वीरों से, स्टीरियो फ़ोटोग्रामेट्री और रूपरेखा बैठाकर बनाया गया है; जो तरफ़ Lucy ने नहीं देखी, वह इस बैठाने का अनुमान है",
      "arrokoth": "New Horizons की तस्वीरें उसी तरफ़ की हैं जिसके पास से वह गुज़रा; दूसरी तरफ़ का अनुमान लगाया गया है, तस्वीर नहीं खींची गई, और रंग उसके एल्बीडो नक्शे पर लाल रंगत है",
      "radar": "आकार रडार की गूँज से बना है, तस्वीरों से नहीं: इसकी रूपरेखा मापी हुई है और सबसे बारीक ब्योरे नहीं",
      "comet": "आकार Rosetta का है, दो साल में खींची 20 000 से ज़्यादा तस्वीरों से, और पूरी सतह ढकी हुई है"
    },
    "objectRelief": "मॉडल सरल किया गया है, और उस पर जो बारीक उभार हैं वे पूरे मॉडल के अपने हैं, सतह में पकाकर डाले गए",
    "worldFlat": "एक सादी गेंद की तरह बनाया गया: यहाँ {name} का कोई सतह-नक्शा नहीं है, और इसका एक रंग प्रकाशित विवरणों से चुना गया है, मापा हुआ नहीं",
    "worldFlatIrregular": "अपनी औसत त्रिज्या जितनी एक सादी गेंद की तरह बनाया गया: यहाँ {name} का कोई सतह-नक्शा नहीं है, इसका एक रंग प्रकाशित विवरणों से चुना गया है, मापा हुआ नहीं, और {name} असल में एक ऊबड़-खाबड़ चट्टान है जिसका असली आकार नहीं बनाया गया",
    "worldFlatShaped": "अपने मापे हुए आकार में और एक रंग में बनाया गया: यहाँ {name} का कोई सतह-नक्शा नहीं है, और रंग प्रकाशित विवरणों से चुना गया है, मापा हुआ नहीं",
    "worldShaped": "अपने मापे हुए आकार में बनाया गया",
    "worldMap": {
      "tinted": "इसकी सतह एक श्वेत-श्याम मोज़ेक है, जिस पर प्रकाशित विवरणों से चुनी हुई रंगत चढ़ाई गई है",
      "toned": "इसके रंग इन्फ़्रारेड, हरी और पराबैंगनी तस्वीरों से आए हैं, जिन्हें आँख जो देखती उसकी ओर हल्का किया गया है",
      "redblue": "इसके रंग New Horizons की लाल और नीली तस्वीरों से आए हैं, हरा उन दोनों के ठीक बीच का लिया गया है और रंग डेढ़ गुना गाढ़ा किया गया है; जो हिस्से सिर्फ़ श्वेत-श्याम में खींचे गए उन्हें नक्शे का औसत रंग दिया गया है",
      "enhanced": "इसके रंग वही हैं जो NASA ने छापे, New Horizons के तीन रंग-फ़िल्टरों से जोड़े हुए, जिनमें कोई हरा नहीं है: यह बढ़ाया हुआ रंग है, आँख जो देखती है उससे गाढ़ा और अलग",
      "balanced": "इसके रंग नारंगी, हरी और नीली तस्वीरों से आए हैं, इसके प्रकाशित रंग से मिलाए गए और आँख जो देखती उसकी ओर हल्के किए गए",
      "infrared": "इसकी सतह धुंध के आर-पार बना निकट-इन्फ़्रारेड नक्शा है, जिसमें रंगत चढ़ाई और कोमल किया गया है; दिखने वाली रोशनी में धुंध ज़मीन को छिपा लेती है",
      "natural": "इसके रंग प्राकृतिक रंग हैं, New Horizons के रंगीन कैमरे की मापी लाल और नीली रोशनी से, हरे को, जिसका कोई फ़िल्टर नहीं था, उनके बीच का मानकर, कैमरे के अपने रंग से ढाई गुना गाढ़ा किया गया, जैसा NASA की प्राकृतिक रंग वाली तस्वीरें दिखाती हैं",
      "matched": "इसके रंग New Horizons के रंगीन कैमरे की मापी लाल और नीली रोशनी से शुरू होते हैं, हरे को, जिसका कोई फ़िल्टर नहीं था, उनके बीच का मानकर, और फिर रंगत-दर-रंगत NASA की अपनी इस हिस्से की रंगीन तस्वीर (PIA19952) से मिलाए गए हैं: कैमरे से ज़्यादा गाढ़े, जैसा NASA ने छापा"
    },
    "worldCoverage": {
      "miranda": "सिर्फ़ दक्षिणी आधे हिस्से की तस्वीर 1986 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "ariel": "सिर्फ़ दक्षिणी आधे हिस्से की तस्वीर 1986 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "umbriel": "सिर्फ़ दक्षिणी आधे हिस्से की तस्वीर 1986 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "titania": "सिर्फ़ दक्षिणी आधे हिस्से की तस्वीर 1986 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "oberon": "सिर्फ़ दक्षिणी आधे हिस्से की तस्वीर 1986 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "triton": "इसके एक हिस्से की तस्वीर 1989 में Voyager 2 ने खींची; बाकी सादा छोड़ा गया है, अंदाज़े से नहीं भरा गया",
      "pluto": "2015 में जब New Horizons वहाँ से गुज़रा, तब सुदूर दक्षिण सर्दी के अँधेरे में था: वहाँ की बनाई ज़मीन मॉडल से बनी है, ऊपर की ज़मीन के रंगों में एक हल्की बनावट, तस्वीर नहीं",
      "charon": "2015 में जब New Horizons वहाँ से गुज़रा, तब सुदूर दक्षिण सर्दी के अँधेरे में था: वहाँ की बनाई ज़मीन मॉडल से बनी है, ऊपर की ज़मीन के रंगों में एक हल्की बनावट, तस्वीर नहीं"
    },
    "worldLit": "ऐसी रोशनी में, जैसी कैमरा अपनी ही धूप के हिसाब से एक्सपोज़ करके दिखाता",
    "worldLight": "दूर से यह गणना की हुई चमक वाली एक रोशनी है: वह दमक वैसी है जैसे कैमरा उस बिंदु को दर्ज करता है जो अलग-अलग पहचानने के लिए बहुत चमकीला हो",
    "exoticDeparture": {
      "pulseSlowed": "इसकी झपक अपने घूमने से {n} गुना धीमी बनाई गई है, ताकि आँख उसे पकड़ सके",
      "pulseTrue": "इसकी झपक उसी रफ़्तार से बनाई गई है जिससे यह घूमता है",
      "portrait": "यह कार्ड खुला रहने तक इसका एक मॉडल इसकी जगह पर बनाया जाता है, यहाँ से दिखने वाले आकार से कहीं बड़ा: छाया और उसके चारों ओर मुड़ी रोशनी वैसी है जैसी उसका द्रव्यमान उन्हें बनाता है, डिस्क मॉडल से बनी है"
    },
    "worldDeparture": {
      "earth": "बड़ी स्क्रीन पर इसके पहाड़ NOAA की ETOPO 2022 ऊँचाइयों से हैं, असली से {relief} गुना ज़्यादा खड़े बनाए गए ताकि नीचा सूर्य उन्हें दिखा सके; इसके किनारे पर हवा की दमक हवा से {air} गुना ऊँची बनाई गई है; निचली कक्षा से बड़ी स्क्रीन पर इसके बादल क्षितिज की ओर और नीचे सूर्य के नीचे उठे दिखते हैं, असली से {clouds} गुना मोटे बनाए गए ताकि उनका झुकाव, उनकी लंबी छायाएँ और उनके शिखरों पर आख़िरी रोशनी दिख सके (मापा हुआ रूप में उनकी असली मोटाई पर), हर शिखर की ऊँचाई वहाँ उसके मापे तापमान से जहाँ आज की तस्वीर पहुँचती है और बाकी जगह बादल-नक्शे की चमक से",
      "mercury": "बड़ी स्क्रीन पर इसका उभार MESSENGER के ऊँचाई मॉडल से है, मापे से {steep} गुना ज़्यादा खड़ा बनाया गया ताकि गड्ढों के किनारे रोशनी पकड़ सकें",
      "pluto": "इसकी उजली और गहरी ज़मीन कैमरे की तस्वीर से {plutoContrast} गुना ज़्यादा कंट्रास्ट में बनाई गई है, जो मापे हुए एल्बीडो के ज़्यादा पास है; जो तरफ़ New Horizons ने सिर्फ़ दूर से देखी, उसे उसकी अपनी तीखेपन तक कोमल किया गया है; बड़ी स्क्रीन पर इसका उभार New Horizons की स्टीरियो ऊँचाइयों से है, जहाँ वे हैं, मापे से {plutoSteep} गुना ज़्यादा खड़ा; किनारे की पतली नीली धुंध एक दमक की तरह बनाई गई है, जो सूर्य के सामने सबसे चमकीली है, और उसकी ताक़त हमारी चुनी हुई है",
      "mars": "बड़ी स्क्रीन पर इसका उभार उन ऊँचाइयों से है जो Mars Global Surveyor के लेज़र ऊँचाईमापी ने मापीं, असली से {mola} गुना ज़्यादा खड़ी और ऊँची बनाई गईं ताकि नीचा सूर्य उन्हें दिखा सके: ओलंपस मॉन्स और घाटी की दीवारें जो छायाएँ डालती हैं, वे उतने गुना ज़्यादा लंबी हैं।",
      "venus": "इसके किनारे के चारों ओर और दिन वाले हिस्से के पार की दमक गहरी धुंध को दिखाती है; वह कितनी मोटी बनाई गई और कितनी दूर तक जाती है, यह सांकेतिक है; सिनेमा रूप में इसकी बादल-पट्टियाँ नक्शे से {uv} गुना ज़्यादा कंट्रास्ट में बनाई गई हैं, जैसे पराबैंगनी कैमरे उन्हें देखते हैं (आँख को वे लगभग सपाट दिखती हैं), और मापा हुआ रूप नक्शे को जैसा है वैसा दिखाता है; इसकी ज़मीन, रडार से, Magellan के ऊँचाईमापी के उभार में है, मापे से {ground} गुना ज़्यादा खड़ी और ऊँची बनाई गई",
      "neptune": "सिनेमा रूप में इसके बाहरी छल्ले की पाँच चापें वैसे बनाई गई हैं जैसे Voyager 2 ने उन्हें 1989 में देखा, अपनी मापी रफ़्तार से घूमती हुई; वे आज छल्ले में कहाँ हैं, इसकी गणना नहीं की गई, और उनमें से दो तब से फीकी पड़ चुकी हैं या खिसक गई हैं",
      "saturn": "इसकी पट्टियाँ नक्शे से {contrast} गुना ज़्यादा कंट्रास्ट में बनाई गई हैं, जो हमारा किया हुआ बदलाव है; “Hubble की नज़र से” में कोई बदलाव नहीं है; बड़ी स्क्रीन पर और पास से, इसके छल्लों की बारीक पट्टियाँ और दरारें वहीं हैं जहाँ Cassini ने 2008 में एक तारे की रोशनी के आर-पार उन्हें मापा, नक्शे के ऊपर रखी गईं, और सिनेमा रूप में और पास से कणों की झिलमिलाहट बनाई गई है; बड़ी स्क्रीन पर सिनेमा रूप में छल्लों से कुछ किलोमीटर के भीतर इनके सबसे बड़े कण, दो से पाँच मीटर चौड़े, बर्फ़ की गेंदों की तरह बनाए गए हैं: कितने और कितने बड़े, यह आकारों के मापे फैलाव और छल्लों की प्रकाशीय गहराई से तय है, पर हर कण कहाँ है, और A छल्ले के गुच्छे, सांकेतिक हैं, और वे स्थिर बनाए गए हैं, मानो आप उनके साथ-साथ सवार हों",
      "titan": "इसकी धुंध के ठीक ऊपर, लगभग 500 किमी की ऊँचाई पर, धुंध की एक पतली अलग परत वहाँ बनाई गई है जहाँ Cassini ने उसे 2005 से 2007 में देखा; उसके बाद के सालों में वह नीचे बैठ गई और फीकी पड़ी, और वह अब कहाँ है, यह पता नहीं"
    },
    "worldEarthshine": "इसका अँधेरा हिस्सा पृथ्वी की अपनी रोशनी, यानी पृथ्वी-प्रकाश से चमकता है, जो उस कैमरे के पकड़ने से {n} गुना ज़्यादा चमकीला बनाया गया है, लगभग जैसा आँख देखती है",
    "worldAir": "इसकी हवा असली से {n} गुना मोटी बनाई गई है ताकि वह इस आकार में दिखे, और इसकी धुंध का रंग सांकेतिक है",
    "worldAirTrue": "इसकी धुंध अपनी मापी हुई ऊँचाई पर बनाई गई है, और इसका रंग सांकेतिक है",
    "worldRings": "इसके छल्ले अपनी मापी हुई दूरियों पर हैं, असली से {w} गुना चौड़े और कहीं ज़्यादा चमकीले बनाए गए ताकि वे दिखें: असली छल्ले कोयले जितने काले धागे हैं",
    "worldRingsDense": "इसके छल्ले अपनी मापी हुई दूरियों पर हैं, असली से {w} गुना चौड़े, {d} गुना ज़्यादा अपारदर्शी और कहीं ज़्यादा चमकीले बनाए गए ताकि वे दिखें: असली छल्ले कोयले जितने काले धुँधले धागे हैं",
    "worldSun": "पास से इसका किनारा गहरा और लाल होता दिखता है, जैसा इसके वायुमंडल का मॉडल कहता है; दानेदार बनावट इसकी खौलती सतह को दिखाती है: इसकी कोशिकाएँ असली दानों की तरह जन्म लेती हैं, चमकती हैं और फीकी पड़ती हैं, असली से मोटी (बहुत पास से असली आकार तक) और कहीं ज़्यादा तेज़ बनाई गई हैं, और किनारे की ओर चमकीला जाल सांकेतिक है; बहुत पास से तस्वीर वाला नक्शा उस बनाई हुई सतह में बदल जाता है, जो खुद भी सांकेतिक है; कोरोना सांकेतिक है, और असली से कहीं ज़्यादा चमकीला बनाया गया है ताकि दिख सके; किनारे के लूप और झाड़ियाँ वहाँ हैं जहाँ NOAA के सक्रिय क्षेत्र किनारे के पास हैं, और उनके आकार और ऊँचाइयाँ सांकेतिक हैं; इसके बगल के तारे फीके हैं, क्योंकि इसकी चौंध उन्हें किसी भी कैमरे से छिपा लेती है",
    "worldMosaic": "अभी कैमरे के नीचे: {title}, यहाँ लगभग {res} प्रति पिक्सेल पर बनाया गया।",
    "worldMosaicDetail": "अभी कैमरे के नीचे: {title}, रंग-नक्शे को लगभग {res} प्रति पिक्सेल पर और तीखा करता हुआ।",
    "worldRelief": "इसका उभार {title} से है: एक तय रोशनी के नीचे ढलानों का चित्र। उस रोशनी की दिशा वाली ढलानों को अब सूर्य जहाँ है वहाँ से फिर रोशन किया जाता है, मापे से {n} गुना ज़्यादा खड़ा; उसके आड़े वाली ढलानें नहीं बनाई गईं।",
    "worldReliefTrue": "इसका उभार {title} से है: एक तय रोशनी के नीचे ढलानों का चित्र। उस रोशनी की दिशा वाली ढलानों को अब सूर्य जहाँ है वहाँ से फिर रोशन किया जाता है; उसके आड़े वाली ढलानें नहीं बनाई गईं।",
    "worldReliefBaked": "इसकी पहाड़ियाँ इस नक्शे में एक तय रोशनी के नीचे छाया देकर डाली गई हैं, अब जहाँ सूर्य है वहाँ से नहीं।",
    "mount": "हम इसे मॉडल पर जहाँ टाँगते हैं, वह हमारा अपना इंतज़ाम है, और यह असली से कहीं बड़ा बनाया गया है — असली आकार में यह दिखने के लिए बहुत छोटा होता"
  },
  "trip": {
    "notEnoughStops": "इस सफ़र के {count} पड़ाव ही अभी मिल सकते हैं, और इसे {min} चाहिए।",
    "heldBody": "यह वाला अभी हमें नहीं मिला। सफ़र की बाकी हर चीज़ अब भी चलती है।",
    "heldTitle": "यह वाला हमें नहीं मिला",
    "stopOf": "पड़ाव {n} / {count}",
    "planning": "तय हो रहा है कि क्या दिखाया जा सकता है…",
    "shape": "{count} पड़ाव · {mins} मिनट",
    "shapeOneMinute": "{count} पड़ाव · 1 मिनट",
    "startTitle": "यह सफ़र तय करें",
    "nextEventLine": "अगला: {date}",
    "introStart": "शुरू करें",
    "introSkip": "अभी नहीं",
    "introMicro": "गाइड वाला सफ़र",
    "stopsLabel": "पड़ाव",
    "startAtTitle": "सफ़र को पड़ाव {n} से शुरू करें",
    "droppedOne": "एक पड़ाव आज दिखाया नहीं जा सकता और ऊपर की गिनती में नहीं है।",
    "droppedMany": "{n} पड़ाव आज दिखाए नहीं जा सकते और ऊपर की गिनती में नहीं हैं।",
    "clockClamped": "इस सफ़र के लिए समय को वापस सामान्य रफ़्तार पर कर दिया गया है।",
    "clockMoves": "यह सफ़र घड़ी को चलाता है। आपके निकलने पर वह वापस रख दी जाती है।",
    "clockRestored": "निकलने पर घड़ी वहीं लौट जाएगी जहाँ आपने उसे रखा था।",
    "stopTimeNow": "अभी का दृश्य",
    "stopTimeAt": "{when} का दृश्य",
    "stopTimeRate": "{when} का दृश्य, {rate} चलता हुआ",
    "stopTimePaused": "{when} का दृश्य, सफ़र रुका है इसलिए ठहरा हुआ",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "छाया चंद्रमा और सूर्य की जगहों से गणना करके निकाली गई है; समय Astronomy Engine से, लगभग एक मिनट तक सही। पतली लकीरें और हल्की पट्टी छाया के किनारों और उसके बीच वाले हिस्से के रास्ते को दिखाती हैं: नक्शे पर लकीरें, रोशनी नहीं।",
    "eclipseLineLatched": "इस डिवाइस पर छाया नहीं बनाई गई; समय सही है।",
    "eclipseColour": "रंग सांकेतिक है; छाया गणना से निकाली गई है।",
    "orbitsLine": "ग्रह असली से बड़े, बिंदुओं की तरह बनाए गए हैं; उनकी जगहें और रास्ते गणना से निकाले गए हैं।",
    "moonPathLine": "पृथ्वी और चंद्रमा असली से बड़े, बिंदुओं की तरह बनाए गए हैं, हर एक का सूर्य की ओर वाला हिस्सा रोशन है। चंद्रमा की जगह और उसका रास्ता गणना से निकाले गए हैं।",
    "systemLine": "आकार और कक्षाएँ NASA Exoplanet Archive से; रंग{phase} और कक्षाओं का झुकाव सांकेतिक हैं।",
    "systemPhaseUnknown": ", ग्रहों की अपनी कक्षाओं में जगहें",
    "rateWords": {
      "10": "असली से दस गुना तेज़",
      "60": "एक सेकंड में एक मिनट",
      "600": "एक सेकंड में दस मिनट",
      "3600": "एक सेकंड में एक घंटा",
      "36000": "एक सेकंड में दस घंटे",
      "525600": "सेकंड के छठे हिस्से में एक दिन"
    },
    "rateGeneric": "असली से {n} गुना तेज़",
    "yourPlace": "आपकी जगह",
    "observerSet": "आपकी जगह: {place}, जो आपने खुद तय की।",
    "observerDevice": "आपकी जगह: वहीं के पास जहाँ आपका डिवाइस बताता है कि आप हैं।",
    "observerGuess": "आपकी जगह आपकी घड़ी के टाइम ज़ोन से लगाया अंदाज़ा है: {place}। बेहतर जगह के लिए इसे “आप कहाँ हैं” में तय करें।",
    "needsPlace": "एक जगह चाहिए। पहले अपनी जगह तय करें।",
    "stationFromYou": "अभी यह आपसे {km} किमी दूर है।",
    "drawnAtClassSize": "मॉडल दूरी चाहे जो हो, {px} पिक्सेल चौड़ा बनाया गया है; असली स्टेशन एक चमकीला बिंदु दिखता।",
    "passNight": "इस बार यह अँधेरे आसमान में धूप से चमकता है: मौसम साथ दे तो आप इसे देख सकते हैं।",
    "passDay": "इस बार आप इसे नहीं देख पाएँगे: आपका आसमान बहुत उजला है, या स्टेशन पृथ्वी की छाया में है।",
    "lookMoonUp": "चंद्रमा {pct}% रोशन है, {az} में {alt}।",
    "lookMoonDown": "इस घड़ी चंद्रमा आपके क्षितिज के नीचे है। यह {time} पर उगता है।",
    "lookMoonDownNoRise": "इस घड़ी चंद्रमा आपके क्षितिज के नीचे है।",
    "lookWorldUp": "{name} {az} में {alt} है।",
    "lookWorldDown": "इस घड़ी {name} आपके क्षितिज के नीचे है।",
    "lookPlanet": "इस घड़ी ऊपर सबसे चमकीला ग्रह {name} है: {az} में {alt}।",
    "lookNoPlanet": "इस घड़ी आँख से दिखने वाला कोई ग्रह ऊपर नहीं है। दृश्य उस तरफ़ है जहाँ से वे गुज़रेंगे।",
    "lookStar": "इस घड़ी ऊपर सबसे चमकीला तारा {name} है: {az} में {alt}।",
    "lookFigure": "इस घड़ी सबसे अच्छी जगह पर: {name}, {az} में {alt}।",
    "lookNoFigure": "जाने-माने आकारों में से कोई भी इस घड़ी अच्छी जगह पर नहीं है।",
    "lookNoPass": "अगले हफ़्ते में आपकी जगह के ऊपर से स्टेशन का कोई गुज़रना नहीं मिला।",
    "lookDaylight": "इस घड़ी आपका आसमान अँधेरा नहीं है, इसलिए अभी पहचानने को कुछ नहीं।",
    "lookMilkyWay": "दृश्य आकाशगंगा की ओर है जहाँ वह {name} से होकर गुज़रती है, {az} में {alt}। तीनों आसमान एक औसत साफ़ रात का मॉडल हैं।",
    "lookNoMilkyWay": "इस घड़ी आकाशगंगा आपके क्षितिज पर नीचे है, इसलिए दृश्य आसमान में ऊपर की ओर है।",
    "lookShower": "अगली उल्का वर्षा {name} है, जो {date} के आसपास सबसे अच्छी होती है।",
    "lookShowerUp": "इस घड़ी इसका उद्गम बिंदु {az} में {alt} है।",
    "lookShowerDown": "इस घड़ी इसका उद्गम बिंदु आपके क्षितिज के नीचे है; दृश्य उस तरफ़ है जहाँ वह उगेगा।",
    "lookShowerRate": "चरम पर, अँधेरी जगह से और उद्गम बिंदु ऊपर हो तो: घंटे में लगभग {rate} उल्काएँ।",
    "lookShowerMoon": {
      "dark": "उस रात चंद्रमा {pct}% रोशन है, इसलिए आसमान अँधेरा रहता है।",
      "some": "उस रात चंद्रमा {pct}% रोशन है और कुछ धुँधली उल्काओं को छिपा देगा।",
      "bright": "उस रात चंद्रमा {pct}% रोशन है और चमकीली उल्काओं के सिवा सब छिपा देगा।"
    },
    "approachNext": "NASA JPL की तालिका में अगला: {name}, {date} को, चंद्रमा की दूरी का {ld} गुना दूर से।",
    "approachNextFar": "NASA JPL की तालिका में अगला: {name}, {date} को।",
    "approachNone": "NASA JPL की नज़दीकी गुज़रने की तालिका लोड नहीं हुई, इसलिए अगला कोई नहीं बताया गया।",
    "satellitesCount": "CelesTrak से इस पन्ने ने जो कैटलॉग लोड किया उसमें {n} चालू उपग्रह हैं, जिनमें {starlink} Starlink के हैं।",
    "satellitesLoading": "कैटलॉग अभी लोड हो रहा है; लोड होते ही गिनती दिखेगी।",
    "portraitLine": "एक मॉडल, तस्वीर नहीं: छाया और उसके चारों ओर मुड़ी रोशनी का छल्ला वैसे हैं जैसे उसका द्रव्यमान उन्हें बनाता है, चमकती डिस्क मॉडल से बनी है, और पीछे के तारे मुड़े नहीं हैं। यह यहाँ से दिखने वाले आकार से कहीं बड़ा बनाया गया है; इसकी जगह मापी हुई है। Event Horizon Telescope की तस्वीर इसके कार्ड पर है: {credit} · {licence}।",
    "tonightUp": "आज रात {place} से: {begin} से {end} तक ऊपर, {time} पर सबसे ऊँचा, {az} में {alt}।",
    "tonightGlare": "आज रात {place} से: {name} सूर्य के इतने पास है कि दिखाई नहीं देगा।",
    "tonightDown": "आज रात {place} से: जब तक आसमान अँधेरा है, {name} क्षितिज के ऊपर नहीं आता।",
    "frameLabel": "गाइड वाला सफ़र",
    "stopRole": "पड़ाव",
    "liveLabel": "पड़ाव {n} / {count}: {title}",
    "stopMicro": "पड़ाव {n} / {count}",
    "progressShort": "{n} / {count}",
    "pause": "रोकें",
    "pauseTitle": "रोकें (Space)",
    "play": "चलाएँ",
    "resume": "फिर चलाएँ",
    "resumeTitle": "पड़ाव पर वापस उड़ें और आगे बढ़ें (Space)",
    "back": "पिछला पड़ाव",
    "backTitle": "पिछला पड़ाव (←)",
    "next": "अगला पड़ाव",
    "nextTitle": "अगला पड़ाव (→)",
    "replay": "दोबारा",
    "replayTitle": "यह उड़ान दोबारा देखें (R)",
    "share": "साझा करें",
    "shareTitle": "इस पड़ाव का लिंक साझा करें",
    "collapse": "कार्ड छिपाएँ",
    "collapseTitle": "कार्ड छिपाएँ और देखें (C)",
    "expand": "कार्ड दिखाएँ",
    "expandTitle": "कार्ड को वापस लाएँ (C)",
    "soundOn": "आवाज़",
    "volume": "वॉल्यूम",
    "volumeTitle": "संगीत, आवाज़ों और बोलने वाली आवाज़ का वॉल्यूम",
    "volumeValue": "{pct} प्रतिशत",
    "voiceWill": "एक आवाज़ इसे पढ़ेगी। वह बनावटी आवाज़ है।",
    "voiceCan": "एक बनावटी आवाज़ इसे पढ़ सकती है: आवाज़ दबाएँ।",
    "soundOnTitle": "संगीत और आवाज़ें चालू हैं: बंद करें (M)",
    "soundOffTitle": "संगीत और आवाज़ें बंद हैं: चालू करें (M)",
    "voice": "आवाज़",
    "voiceOnTitle": "एक बनावटी आवाज़ हर पड़ाव को पढ़ रही है: उसे बंद करें और संगीत रखें (V)",
    "voiceOffTitle": "हर पड़ाव को बनावटी आवाज़ से पढ़वाएँ (V)",
    "present": "प्रस्तुति",
    "presentTitle": "यह सफ़र एक कमरे को दिखाएँ: बड़े शब्द, कोई पैनल नहीं, आप अगला दबाते हैं",
    "presentOffTitle": "प्रस्तुति मोड छोड़ें और पैनल वापस लाएँ",
    "presentAuto": "अपने आप",
    "presentAutoOffTitle": "हर पड़ाव अगला दबाने का इंतज़ार करता है: सफ़र को खुद आगे बढ़ने दें (A)",
    "presentAutoOnTitle": "सफ़र खुद आगे बढ़ता है: हर पड़ाव को अगला दबाने का इंतज़ार कराएँ (A)",
    "fullScreen": "पूरी स्क्रीन",
    "fullScreenTitle": "पूरी स्क्रीन भर दें (F)",
    "fullScreenOffTitle": "पूरी स्क्रीन से निकलें (F)",
    "leave": "निकलें",
    "leaveTitle": "सफ़र से निकलें। कैमरा ठीक वहीं रहता है जहाँ है। (Escape)",
    "leaveTitleStage": "सफ़र से निकलें। नक्शा उस दुनिया पर लौट जाता है जो पहले केंद्र में थी, जिससे कैमरा हिलता है। (Escape)",
    "progressLabel": "आप सफ़र में कितना आगे हैं",
    "controlsLabel": "सफ़र के बटन",
    "pausedChip": "सफ़र रुका है",
    "endMicro": "सफ़र का अंत",
    "endBody": "कैमरा वहीं रहता है जहाँ है। यहाँ से कुछ पीछे नहीं लौटता।",
    "endBodyStage": "उड़ते रहें तो आप यहीं बाहर रहते हैं। घर लौटें तो नक्शा उस दुनिया पर लौटता है जो सफ़र से पहले केंद्र में थी।",
    "endExplore": "उड़ते रहें",
    "endExploreTitle": "यह दृश्य रखें और खुद आगे बढ़ें",
    "endStayTitleStage": "यहीं बाहर रहें और जहाँ सफ़र खत्म हुआ वहाँ से आगे उड़ें",
    "endHome": "घर लौटें",
    "endExploreTitleStage": "खुद आगे बढ़ें, उसी नक्शे पर जहाँ से आपने शुरू किया था",
    "endSend": "तस्वीर भेजें",
    "endSendTitle": "जहाँ सफ़र खत्म हुआ उसका एक पोस्टकार्ड बनाएँ, उसके शब्दों और एक लिंक के साथ",
    "endReplay": "फिर देखें",
    "endReplayTitle": "यह सफ़र शुरू से फिर देखें",
    "endShareTitle": "इस सफ़र का लिंक साझा करें",
    "endNextMicro": "अगला सफ़र",
    "endNext": "अगला: {title}",
    "docTitle": "Space Radar — {title} — पड़ाव {n} / {count}"
  },
  "sky": {
    "radiant": "{name} उद्गम बिंदु",
    "bodies": {
      "sun": "सूर्य",
      "moon": "चंद्रमा",
      "mercury": "बुध",
      "venus": "शुक्र",
      "mars": "मंगल",
      "jupiter": "बृहस्पति",
      "saturn": "शनि",
      "uranus": "अरुण",
      "neptune": "वरुण"
    },
    "fov": {
      "degrees": "{deg}° क्षेत्र · {name}",
      "arcmin": "{min}′ क्षेत्र · {name}",
      "names": {
        "eye": "आँख",
        "binoculars": "दूरबीन",
        "telescope": "टेलीस्कोप"
      }
    },
    "lines": {
      "sunPath": "सूर्य का रास्ता",
      "equator": "आकाशीय भूमध्य रेखा",
      "poleNorth": "आकाश का उत्तरी ध्रुव",
      "poleSouth": "आकाश का दक्षिणी ध्रुव"
    },
    "what": {
      "star": "तारा",
      "starMag": "तारा · परिमाण {mag}",
      "planet": "ग्रह · परिमाण {mag}",
      "sun": "हमारा तारा",
      "moon": "पृथ्वी का चंद्रमा",
      "dso": "दूर गहरा आकाश",
      "dsoMag": "{kind} · परिमाण {mag}",
      "open": "{name}, {sub}। इसका कार्ड खोलें।",
      "plain": "{name}, {sub}।",
      "openTitle": "इसका कार्ड खोलें"
    },
    "compassShort": [
      "उ",
      "उउपू",
      "उपू",
      "पूउपू",
      "पू",
      "पूदपू",
      "दपू",
      "ददपू",
      "द",
      "ददप",
      "दप",
      "पदप",
      "प",
      "पउप",
      "उप",
      "उउप"
    ],
    "lookLine": "{time} पर {dir} की ओर देखें, {fists}। यह लगभग {mins} मिनट तक चलता है।",
    "lookLineNoDuration": "{time} पर {dir} की ओर देखें, {fists}।",
    "sunlit": "इस पर अब भी धूप पड़ रही है, इसीलिए यह दिखता है।",
    "notSunlit": "इस बार यह पृथ्वी की छाया में है, इसलिए आप इसे नहीं देख पाएँगे।",
    "fistsHorizon": "क्षितिज से ठीक ऊपर",
    "fistsOverhead": "लगभग सीधे ऊपर",
    "fistsOne": "क्षितिज से लगभग एक मुट्ठी ऊपर",
    "fistsMany": "क्षितिज से लगभग {n} मुट्ठी ऊपर",
    "noObserver": "अपनी जगह तय करें, तब यह पंक्ति बताएगी कि कहाँ देखना है।",
    "noPass": "यह अगले 24 घंटे में आपके क्षितिज के ऊपर नहीं आता।",
    "notVisibleFromGround": "यह वाला इतनी दूर है कि आँख से पहचाना नहीं जा सकता।",
    "leftGround": "वहाँ उड़ने के लिए ज़मीन छोड़ दी। आसमान “आज रात” में है।",
    "nakedEye": "इतना चमकीला कि अँधेरी जगह से अपनी आँखों से दिख जाए।",
    "needsTelescope": "आँख के लिए बहुत धुँधला; टेलीस्कोप, या लंबे समय की तस्वीर इसे दिखाती है।",
    "starOnly": "सिर्फ़ इसका तारा दिख सकता है, और वह भी सिर्फ़ टेलीस्कोप से; ग्रह खुद बहुत ही धुँधला है।",
    "onTheGround": "यह ज़मीन पर खड़ा है, इसलिए ऊपर देखने को कुछ नहीं।",
    "storm": "ज़मीन से यह खुद मौसम है। कक्षा से यह सैकड़ों किलोमीटर चौड़ा बादलों का घुमाव है।",
    "onAnotherWorld": "यह {world} पर खड़ा है। रात कितनी भी साफ़ हो, यहाँ से आँख से आप इसे नहीं पहचान पाएँगे।",
    "worldRise": "आपकी जगह से यह {time} पर उगता है।",
    "worldHere": "जहाँ आप हैं",
    "worldFrom": {
      "down": "{place} से: {rise} पर {riseDir} में उगता है, {highTime} पर सबसे ऊँचा, {highAlt}; {set} पर {setDir} में डूबता है।",
      "downNoSet": "{place} से: {rise} पर {riseDir} में उगता है, {highTime} पर सबसे ऊँचा, {highAlt}।",
      "up": "{place} से: अभी ऊपर है, {alt}, {dir} में। {highTime} पर सबसे ऊँचा, {highAlt}; {set} पर {setDir} में डूबता है।",
      "upPast": "{place} से: अभी ऊपर है, {alt}, {dir} में। सबसे ऊँचाई पार कर चुका; {set} पर {setDir} में डूबता है।",
      "never": "{place} से यह अगले डेढ़ दिन में नहीं उगता।",
      "always": "{place} से: अभी ऊपर है, {alt}, {dir} में। यह आज डूबता नहीं।",
      "honest": "समुद्र-तल के क्षितिज के हिसाब से गणना करके निकाला; पहाड़ियाँ और घर इसमें नहीं हैं।"
    },
    "worldNoRise": "इसे आप अपनी आँखों से देख सकते हैं। आपकी जगह से यह कब उगता है, इसकी गणना इस संस्करण में अभी नहीं है।",
    "worldSee": {
      "pluto": "न आँख से, न दूरबीन से: प्लूटो आपके देखे जा सकने वाले सबसे धुँधले तारे से लगभग 3 000 गुना धुँधला है, इसलिए टेलीस्कोप चाहिए।",
      "io": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "europa": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "ganymede": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "callisto": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "titan": "आँख से नहीं: टाइटन अपनी सबसे चमकदार हालत में परिमाण 8.2 का है, इसलिए छोटा टेलीस्कोप या दमदार दूरबीन चाहिए, और बगल में शनि की चौंध इसे भी मुश्किल बना देती है।",
      "enceladus": "आँख से नहीं: एन्सेलेडस परिमाण 11.7 का है, और चमकीले शनि और उसके छल्लों के इतने पास है कि छोटे टेलीस्कोप से भी देखना मुश्किल है।",
      "triton": "न आँख से, न दूरबीन से: ट्राइटन परिमाण 13.5 का है, आपके देखे जा सकने वाले सबसे धुँधले तारे से लगभग 600 गुना धुँधला, इसलिए टेलीस्कोप चाहिए।",
      "charon": "मुश्किल से: शैरन परिमाण 16.8 का है, आपके देखे जा सकने वाले सबसे धुँधले तारे से 13 000 गुना धुँधला, और प्लूटो के इतने पास कि शौकिया लोगों ने 2008 में 14 इंच के टेलीस्कोप से तस्वीर खींचकर ही इस जोड़ी को अलग कर पाया।",
      "phobos": "आँख से नहीं: फ़ोबोस अपनी सबसे अच्छी हालत में परिमाण 11.3 का है और मंगल से चिपका रहता है, जिसकी चौंध इसे डुबो देती है; यह 1877 में 26 इंच के टेलीस्कोप से खोजा गया था।",
      "deimos": "आँख से नहीं: डीमोस अपनी सबसे अच्छी हालत में परिमाण 12.4 का है और मंगल के पास है, जिसकी चौंध इसे डुबो देती है; यह 1877 में 26 इंच के टेलीस्कोप से खोजा गया था।",
      "neptune": "आँख से नहीं: वरुण परिमाण 7.7 से 7.9 का है, बिना मदद के देखने के लिए बहुत धुँधला। दमदार दूरबीन या टेलीस्कोप इसे एक छोटी नीली गोली की तरह दिखाते हैं।",
      "mimas": "आँख से नहीं: मीमास परिमाण 12.9 का है और शनि से चिपका रहता है, इसलिए बड़ा टेलीस्कोप और शांत रात चाहिए।",
      "tethys": "आँख से नहीं: टेथिस परिमाण 10.2 का है, छोटे टेलीस्कोप की पहुँच में, हालाँकि बगल में शनि की चौंध इसे मुश्किल बना देती है।",
      "dione": "आँख से नहीं: डायोन परिमाण 10.4 का है, छोटे टेलीस्कोप की पहुँच में, हालाँकि बगल में शनि की चौंध इसे मुश्किल बना देती है।",
      "rhea": "आँख से नहीं: रिया परिमाण 10 की है, टाइटन के बाद शनि के चंद्रमाओं में सबसे चमकीली, और छोटा टेलीस्कोप इसे दिखा देगा।",
      "iapetus": "आँख से नहीं: आयापेटस परिमाण 10.2 से 11.9 तक बदलता है क्योंकि इसका उजला और काला हिस्सा बारी-बारी से हमारी ओर आता है, इसलिए छोटा टेलीस्कोप इसे सबसे अच्छी हालत में पकड़ता है।",
      "miranda": "मुश्किल से: मिरांडा परिमाण 16.6 का है, अरुण की चौंध में खोया हुआ, और कई शौकिया टेलीस्कोपों से अदृश्य।",
      "ariel": "न आँख से, न दूरबीन से: एरियल परिमाण 14.8 का है, लगभग प्लूटो जितना धुँधला जब वह सबसे पास होता है, इसलिए अच्छा टेलीस्कोप और अँधेरा आसमान चाहिए।",
      "umbriel": "न आँख से, न दूरबीन से: अम्ब्रिएल परिमाण 15.1 का है, अरुण के चार बड़े चंद्रमाओं में सबसे धुँधला, इसलिए अच्छा टेलीस्कोप और अँधेरा आसमान चाहिए।",
      "titania": "आँख से नहीं: टाइटेनिया परिमाण 13.9 की है, अरुण के चंद्रमाओं में सबसे चमकीली, फिर भी इसके लिए कुछ बड़ा टेलीस्कोप चाहिए।",
      "oberon": "आँख से नहीं: ओबेरॉन परिमाण 14.1 का है और पाँचों में अरुण से सबसे दूर है, इसलिए टेलीस्कोप और शांत रात चाहिए।"
    },
    "couldNotLook": "यहाँ से गुज़रने की गणना नहीं हो सकी।",
    "nowhereToLook": "किसी को नहीं पता कि यह कहाँ है, इसलिए देखने को कोई जगह नहीं।"
  },
  "controls": {
    "title": "नियंत्रण",
    "layersTitle": "क्या दिखाएँ",
    "layerCount": "{n}",
    "layerCountLoading": "गिन रहे हैं",
    "layerHint": {
      "exoplanets": "बंद है। दिखाने के लिए टिक करें।"
    },
    "layerCountEmpty": "खाली",
    "layerCountEmptyTitle": "यह परत खाली लौटी: इसका स्रोत पढ़ा नहीं जा सका, या उसमें अभी कुछ नहीं है।",
    "layerWaits": "अभी नहीं",
    "layerWaitsTitle": "डेटा बचाने के लिए यह तभी लोड होती है जब आप इसे चालू करें।",
    "layersFailed": "{n} परतें खाली लौटीं।",
    "layersFailedOne": "एक परत खाली लौटी।",
    "layersFailedWhy": "स्रोत देखें",
    "layerCountParts": {
      "onMap": "{n} नक्शे पर",
      "riding": "{n} किसी और पर सवार",
      "unplaceable": "{n} की जगह हम नहीं बता सकते",
      "auroraPeak": "{n} % तक संभावना",
      "lightningPerMin": "{n} बिजलियाँ प्रति मिनट"
    },
    "layersEmpty": "अभी कोई परत लोड नहीं हुई है।",
    "groups": {
      "around-earth": "पृथ्वी के आसपास",
      "earth": "मौसम और ज़मीन",
      "solar-system": "सौरमंडल",
      "beyond": "तारे और उसके पार"
    },
    "groupCount": "{n} में से {on}",
    "groupAll": "सभी",
    "groupNone": "कोई नहीं",
    "groupAllLabel": "{group} की हर परत दिखाएँ",
    "groupNoneLabel": "{group} की हर परत छिपाएँ",
    "layerFilter": "परत ढूँढें",
    "layersKeys": "परतें। ऊपर-नीचे तीर से चलें; Space से एक चालू या बंद करें।",
    "layerFilterEmpty": "इस नाम की कोई परत नहीं।",
    "keysRow": "कुंजियाँ",
    "keysRowTouch": "इशारे",
    "keysRowTitle": "दृश्य को हिलाने वाली कुंजियाँ दिखाएँ",
    "keysRowTitleTouch": "दृश्य को हिलाने वाले इशारे दिखाएँ",
    "swatchMixed": "अपने-अपने रंगों में बनाया गया",
    "keyedNote": "बिंदुओं का रंग {key} के हिसाब से है: कुंजी नीचे है।",
    "localTimeFallback": "स्थानीय",
    "locationPlaceholder": "शहर लिखें",
    "locationSearchLabel": "शहर ढूँढें",
    "locationUseMine": "मेरी जगह इस्तेमाल करें",
    "locationUseMineTitle": "ब्राउज़र से पूछें कि आप कहाँ हैं",
    "locationInsecure": "ब्राउज़र आपकी जगह सिर्फ़ https वाले पन्नों से साझा करता है। यह पन्ना सादे http पर है, इसलिए यह बटन बंद है। इसकी जगह कोई शहर चुनें, या https वाला पता बनने पर उसे खोलें।",
    "locationUnsupported": "इस ब्राउज़र में जगह बताने की सुविधा नहीं है। इसकी जगह कोई शहर चुनें।",
    "locationDenied": "ब्राउज़र ने मना कर दिया। इसकी जगह कोई शहर चुनें।",
    "locationFailed": "ब्राउज़र आपको ढूँढ नहीं सका। इसकी जगह कोई शहर चुनें।",
    "locationAsking": "ब्राउज़र से पूछ रहे हैं",
    "locationClear": "हटाएँ",
    "locationNoMatch": "साथ आई सूची में इससे मेल खाता कोई शहर नहीं है।",
    "tonightCouldNotLook": "देखा नहीं जा सका: कोई उपग्रह लोड नहीं हुआ।"
  },
  "search": {
    "title": "कोई चीज़ ढूँढें",
    "placeholder": "ग्रह, तारे, उपग्रह खोजें",
    "placeholderPhone": "अंतरिक्ष खोजें",
    "inputLabel": "नाम या कैटलॉग नंबर से कोई चीज़ खोजें",
    "listLabel": "मेल खाती चीज़ें",
    "fly": "वहाँ उड़ें",
    "flyTitle": "कैमरे को चुनी हुई चीज़ तक ले जाएँ और उसका कार्ड खोलें",
    "hint": "दो अक्षर काफ़ी हैं। Enter सबसे ऊपर वाली चुनता है।",
    "noMatch": "यहाँ “{q}” नाम की कोई चीज़ नहीं।",
    "closest": "सबसे मिलते-जुलते नाम",
    "more": "{n} और मेल खाती हैं। छाँटने के लिए और लिखें।",
    "searching": "{n} चीज़ों में खोजा गया।",
    "searchingOne": "एक चीज़ में खोजा गया।",
    "searchingBut": "{n} चीज़ों में खोजा गया, {m} परतें अभी नहीं।",
    "searchingButOne": "{n} चीज़ों में खोजा गया, एक परत अभी नहीं।",
    "empty": "खोजने के लिए अभी कुछ लोड नहीं हुआ है।",
    "inputTitle": "खोजें (/)",
    "key": "/",
    "notLoaded": "लोड नहीं हुईं, इसलिए खोजी नहीं गईं: {layers}।",
    "stillLoading": "अभी लोड हो रही हैं, इसलिए अभी खोजी नहीं गईं: {layers}।",
    "loadsWhenOn": "डेटा बचाने के लिए ये तभी लोड होती हैं जब आप इन्हें चालू करें, इसलिए अभी खोजी नहीं गईं: {layers}।",
    "couldNotRead": "पढ़ी नहीं जा सकीं, इसलिए खोजी नहीं गईं: {layers}।",
    "fallback": "इससे शुरू होने वाला कुछ नहीं है। ये उसे अपने भीतर रखते हैं।",
    "switchedOn": "चालू की गई: {layer}।",
    "belowHorizon": "{name} क्षितिज के नीचे है।",
    "notLoadedCount": "इससे कितनी चीज़ें छूट गईं, यह उनके लोड होने तक नहीं जाना जा सकता।"
  },
  "quality": {
    "dataSaver": "डेटा बचत चालू है: दो सबसे बड़ी सूचियाँ रुकी हैं।",
    "lowered": "धीमे फ़्रेम ({ms} ms): सरल तस्वीर।",
    "tierPhone": "सतह के नक्शे 2k पर, फ़ोन के हिसाब से।",
    "tierSaver": "सतह के नक्शे 2k पर, डेटा बचाने के लिए।",
    "tierSmall": "सतह के नक्शे 2k पर, इस डिवाइस के हिसाब से।",
    "tierLatched": "सतह के नक्शे वापस 2k पर: फ़्रेम धीमे थे।",
    "tierLow": "सतह के नक्शे 2k पर, जैसा “कम” माँगता है।",
    "tier1": "सतह के नक्शे 4k पर, खाली समय में लाए जाते हैं।",
    "tier2": "सतह के नक्शे 4k पर, ज़्यादा दुनियाएँ तीखी रखी गईं।",
    "promoted": "तेज़ फ़्रेम के बाद एक कदम ऊपर किया गया।",
    "mapsWorn": "इस डिवाइस पर नक्शे: {credits}।",
    "panelTitle": "क्वालिटी",
    "choices": {
      "auto": "अपने आप",
      "low": "कम",
      "medium": "मध्यम",
      "high": "ऊँची",
      "ultra": "अल्ट्रा"
    },
    "autoNow": "अपने आप: {tier}",
    "titles": {
      "auto": "इस डिवाइस और इसके फ़्रेम रेट से चुना गया",
      "low": "सबसे हल्की तस्वीर: बैटरी या पुराने लैपटॉप के लिए",
      "medium": "ज़्यादा तीखे नक्शे, उभार और मौसम",
      "high": "एक साथ ज़्यादा दुनियाएँ तीखी",
      "ultra": "पूरा रेज़ोल्यूशन और पास से सबसे बारीक कदम"
    },
    "fellBack": "फ़्रेम धीमे थे: क्वालिटी वापस “अपने आप” पर है।"
  },
  "status": {
    "title": "स्रोत",
    "intro": "वह हर स्रोत जिससे यह पढ़ता है, वह रीडिंग कितनी पुरानी है, और वह कहाँ से आती है। यहाँ कुछ भी किसी कोने में छिपा नहीं है।",
    "stateOk": "ठीक",
    "stateStale": "पुराना",
    "stateUnknown": "देखा नहीं जा सका",
    "stateOkTitle": "हाल में पढ़ा गया और अपनी ताज़गी की सीमा के भीतर।",
    "stateStaleTitle": "हमारे पास एक प्रति है, पर यह इस स्रोत के वादे से पुरानी है।",
    "stateUnknownTitle": "इस ब्राउज़र में हमें इस स्रोत से कभी अच्छी रीडिंग नहीं मिली। यह “ठीक” जैसा नहीं है, और हमारे पास रखी किसी प्रति में गड़बड़ी जैसा भी नहीं।",
    "ageNever": "कभी नहीं पढ़ा",
    "ageLabel": "आख़िरी बार {age} पढ़ा",
    "ageNeverLine": "इस ब्राउज़र में अभी कोई अच्छी प्रति नहीं है",
    "viaSnapshotLine": "हमारे स्नैपशॉट से, {age} लाया गया",
    "viaLiveLine": "{publisher} से {age} लाइव पढ़ा गया",
    "snapshotOverdue": "ताज़ा प्रति आने में देर हो गई है",
    "snapshotChecking": "(नई प्रति देख रहे हैं)",
    "couldNotLookLine": "देखा नहीं जा सका: {reason}",
    "reasonNoRoute": "{why}, और ब्राउज़र {publisher} को सीधे नहीं पढ़ सकता",
    "snapshotWhy": {
      "no-index": "हमारे स्नैपशॉट की सूची पढ़ी नहीं जा सकी",
      "not-in-index": "हमारे स्नैपशॉट में यह स्रोत शामिल नहीं है",
      "refused": "इसे लाने की पिछली कोशिश में मना कर दिया गया",
      "error": "इसे लाने की पिछली कोशिश नाकाम रही",
      "skipped": "इसे लाने वाले ने इसे छोड़ दिया",
      "unreadable": "इसका हमारा स्नैपशॉट पढ़ा नहीं जा सका"
    },
    "harvestUnchecked": "हमारे स्नैपशॉट: अभी जाँचे नहीं गए।",
    "harvestUnavailable": "हमारे स्नैपशॉट अभी उपलब्ध नहीं हैं, इसलिए नीचे का हर स्रोत सीधे उसके प्रकाशक से लाइव पढ़ा जाता है, या बिल्कुल नहीं।",
    "harvestLine": "हमारे स्नैपशॉट: {age} लिखे गए · {ok} फ़ीड ठीक · {refused} ने मना किया · {error} नाकाम",
    "errorLabel": "आख़िरी गड़बड़ी",
    "attributionTitle": "श्रेय",
    "attributionIntro": "इस नक्शे का डेटा दूसरे लोगों की मेहनत है।",
    "footCreditsIntro": "तस्वीरें और टेक्सचर:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "ग्रहों और तारों के टेक्सचर, CC BY 4.0 लाइसेंस के साथ",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "बादल, रात वाले हिस्से और सतह की तस्वीरें, और 3D मॉडल",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "बादल",
    "auroraTitle": "ध्रुवीय रोशनी",
    "weatherTitle": "बिजली",
    "layersTitle": "लाइव या साथ आया",
    "layersIntro": "लाइव अपने प्रकाशक से पढ़ा जाता है, या आपके देखते-देखते इसी पल के लिए गणना करके निकाला जाता है। कैटलॉग ऐप के साथ आता है: तारे, आकाशगंगाएँ और ज़मीन पर लगे डिश और उतरने की जगहें आपके देखते हुए नहीं हिलतीं। साथ आया नमूना उस स्रोत की जगह लेता है जिसे ब्राउज़र बिल्कुल पुकार नहीं सकता।",
    "layerLive": "लाइव",
    "layerCatalogue": "कैटलॉग",
    "layerSample": "साथ आया नमूना",
    "layerIllustrative": "बनाया गया, ट्रैक नहीं",
    "layerMixed": "मिला-जुला",
    "layerEmpty": "कुछ लोड नहीं हुआ",
    "layerCountLabel": "{n} दिखाए गए",
    "sourcesEmpty": "कोई स्रोत घोषित नहीं किया गया है।",
    "notAsked": "{n} और स्रोत तभी पढ़े जाते हैं जब उन्हें चाहने वाली कोई परत चालू की जाए।"
  },
  "time": {
    "justNow": "अभी-अभी",
    "aMinuteAgo": "एक मिनट पहले",
    "minutesAgo": "{n} मिनट पहले",
    "anHourAgo": "एक घंटा पहले",
    "hoursAgo": "{n} घंटे पहले",
    "aDayAgo": "एक दिन पहले",
    "daysAgo": "{n} दिन पहले",
    "lessThanAMinute": "एक मिनट से कम",
    "aMinute": "एक मिनट",
    "minutes": "{n} मिनट",
    "anHour": "एक घंटा",
    "hours": "{n} घंटे",
    "aDay": "एक दिन",
    "days": "{n} दिन",
    "months": "{n} महीने",
    "years": "{n} साल",
    "inFuture": "{d} में",
    "ago": "{d} पहले"
  },
  "sheet": {
    "handle": "शीट की ऊँचाई",
    "closed": "बंद",
    "peek": "नीचे",
    "half": "आधी खुली",
    "full": "पूरी खुली",
    "state": "{height}। ऊपर-नीचे तीर से बदलें",
    "title": "शीट की ऊँचाई: {height}। बदलने के लिए टैप करें या खींचें"
  },
  "print": {
    "title": "इस दृश्य को 6 गुणा 4 इंच के पोस्टकार्ड (JPEG) की तरह सहेजें",
    "making": "पोस्टकार्ड बन रहा है",
    "saved": "पोस्टकार्ड सहेज लिया गया",
    "failed": "पोस्टकार्ड अभी बन नहीं सका",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "जैसा आँख देखती है",
      "deep": "गहरा खिंचाव: धुँधली रोशनी उभारी गई"
    },
    "look": {
      "measured": "मापा हुआ रूप"
    }
  },
  "hud": {
    "fromYou": "आपसे",
    "fromPlace": "{place} से",
    "behind": "{world} के पीछे",
    "offScreen": "{name}, {distance} दूर, स्क्रीन से बाहर: वहाँ उड़ें",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "सभी पैनल छिपाएँ (H)",
    "show": "पैनल फिर दिखाएँ (H या Escape)",
    "hint": "पैनल के लिए H या Escape। Shift+H लेबल और समय रखता है"
  },
  "mark": {
    "label": "GitHub पर सोर्स",
    "title": "GitHub पर Space Radar का सोर्स कोड",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "प्रेस किट",
    "pressTitle": "यह क्या है, तस्वीरें और इस्तेमाल करने का निशान",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "स्टेशन",
    "satellite": "उपग्रह",
    "debris": "मलबा",
    "rocket": "रॉकेट",
    "probe": "अंतरिक्ष यान",
    "telescope": "टेलीस्कोप",
    "asteroid": "क्षुद्रग्रह",
    "comet": "धूमकेतु",
    "site": "ज़मीनी जगह",
    "world": "दुनिया",
    "star": "तारा",
    "exoplanet": "दूसरे तारे का ग्रह",
    "dso": "गहरे आकाश की चीज़",
    "exotic": "अतिवादी चीज़",
    "storm": "उष्णकटिबंधीय चक्रवात",
    "earthevent": "पृथ्वी की घटना",
    "oddity": "अजूबा",
    "shower": "उल्का वर्षा",
    "unknown": "चीज़"
  },
  "cls": {
    "nearEarthApprox": "पृथ्वी के इतने पास इसकी जगह लगभग की है: बनाई गई कक्षा सिर्फ़ सूर्य के चारों ओर की है और पृथ्वी के खिंचाव को छोड़ देती है।",
    "label": "हमें इसकी जगह कैसे पता है",
    "measured": "मापी हुई जगह",
    "inferred": "{n} {unit} पुराने तत्वों से आगे बढ़ाई गई जगह",
    "inferredUnknownAge": "अनजान उम्र के तत्वों से आगे बढ़ाई गई जगह",
    "inferredNoElements": "जगह मापी नहीं गई, गणना से निकाली गई",
    "stormAdvisory": "{time} UTC की सूचना के समय इसका केंद्र, {ago}; तूफ़ान चलता है, इसलिए तब से वह खिसक चुका है",
    "stormAdvisoryDated": "{date} की {time} UTC की सूचना के समय इसका केंद्र, {ago}; तूफ़ान चलता है, इसलिए तब से वह खिसक चुका है",
    "illustrative": "यह दिखाने के लिए बनाया गया कि यह कहाँ जाता है; असली रास्ता सार्वजनिक नहीं है",
    "placeIllustrative": "इसकी असली कक्षा, CelesTrak के कैटलॉग से, पर उस पर एक गढ़ी हुई जगह; इसके लिए हमारे पास अभी के तत्व नहीं हैं",
    "sample": "साथ आया नमूना डेटा, लाइव जगह नहीं",
    "provisional": "अभी सार्वजनिक कैटलॉग में नहीं है — ये संचालक के अपने तत्व हैं, जो CelesTrak के ज़रिए प्रकाशित हुए; स्थायी नंबर तब आएगा जब Space-Track इसे सूची में डालेगा",
    "unknown": "हम नहीं बता सकते कि यह जगह कैसे निकाली गई",
    "unplaced": "किसी को नहीं पता कि यह कहाँ है, इसलिए इसके लिए कुछ नहीं बनाया गया",
    "shower": "आसमान में एक दिशा: इस उल्का वर्षा के लिए IAU के प्रकाशित हलों का मध्यमान",
    "noPlace": "इसके लिए कोई जगह नहीं बनाई गई: जिस पिंड पर यह है वह इस ऐप में कोई दुनिया नहीं है",
    "approxPlace": "प्रकाशित निर्देशांकों से रखा गया, लगभग {n} डिग्री तक सही",
    "inferredArc": "आख़िरी बार इसे किसी ने {date} को देखा था, और {caveat}",
    "precisionSplit": "{anchorName} {anchorM} मीटर तक मापा गया है; यह {how} और {objectM} मीटर के भीतर रखा गया है",
    "precisionSplitUnknown": "{anchorName} {anchorM} मीटर तक मापा गया है; इस चीज़ का खुद कभी सर्वे नहीं हुआ",
    "precisionSplitHowOnly": "{anchorName} {anchorM} मीटर तक मापा गया है; यह चीज़ {how}, और कितनी सटीकता से, यह किसी ने प्रकाशित नहीं किया",
    "precisionOwn": "{objectM} मीटर के भीतर तक जगह तय, {how}",
    "aboard": "यह {carrier} की अपनी जगह है, क्योंकि यह चीज़ उसके बाहर कसी हुई है और वहीं जाती है जहाँ वह जाता है",
    "how": {
      "surveyed": "कक्षा से सर्वे करके मिली",
      "photogrammetric": "तस्वीरों में ढूँढी गई",
      "orbital_imaging": "कक्षा से ली तस्वीरों में ढूँढी गई",
      "unsurveyed": "कभी सर्वे नहीं की गई",
      "map_reference": "नक्शे से ली गई"
    },
    "hourWord": "घंटा",
    "hoursWord": "घंटे",
    "dayWord": "दिन",
    "daysWord": "दिन",
    "minuteWord": "मिनट",
    "minutesWord": "मिनट",
    "yearWord": "साल",
    "yearsWord": "साल"
  },
  "unplaced": {
    "why": "{whyUnknown}",
    "noDistanceRow": "मापा नहीं गया: कैटलॉग में इसका कोई लंबन नहीं है",
    "iauApproved": "{name}, {date} को मंज़ूर"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "आग",
      "volcano": "फटता ज्वालामुखी",
      "iceberg": "हिमखंड"
    },
    "rows": {
      "kind": "यह क्या है",
      "reported": "आख़िरी रिपोर्ट",
      "since": "तब से फट रहा है",
      "first": "पहली रिपोर्ट",
      "size": "आकार",
      "where": "कहाँ",
      "by": "किसने बताया"
    },
    "sizeValue": "{n} किमी²",
    "sizeSmall": "1 किमी² से कम",
    "by": "{agencies}, NASA EONET के ज़रिए",
    "sky": "यह ज़मीन पर है। कक्षा से आग धुएँ का गुबार दिखती है, ज्वालामुखी राख का स्तंभ, और हिमखंड काले पानी पर एक सफ़ेद पटिया।",
    "drawn": "इसकी आख़िरी बताई जगह पर एक निशान की तरह बनाया गया; ज़मीन पर इसका फैलाव नहीं बनाया गया",
    "honesty": "NASA के EONET से एक बिंदु, आख़िरी रिपोर्ट {date}, और {read} पढ़ा गया। देखने के लिए है, कहाँ या कब का कोई सरकारी रिकॉर्ड नहीं।"
  },
  "deepFacts": {
    "methodRow": "दूरी ऐसे पता चली",
    "billionLightYears": "{n} अरब प्रकाश-वर्ष",
    "methods": {
      "parallax": "लंबन: दूर के आसमान के सामने इसके तारे का खिसकना",
      "eclipsing-binary": "इसमें मौजूद ग्रहण करने वाले जोड़ीदार तारे",
      "cepheid": "इसमें मौजूद सेफ़ीड परिवर्ती तारे",
      "TRGB": "इसमें मौजूद सबसे चमकीले लाल दानव तारे",
      "standard-candle": "ज्ञात चमक वाले तारे या विस्फोट",
      "redshift": "इसका लाल विस्थापन, एक ब्रह्मांड-मॉडल के ज़रिए",
      "kinematic": "आकाशगंगा के घूमने के साथ यह कितनी तेज़ चलता है",
      "assumed-member-of-parent": "इसकी अपनी कोई नहीं: इसे इसकी आकाशगंगा की दूरी पर रखा गया है"
    },
    "drawnTag": {
      "reconstruction": "· पुनर्निर्मित",
      "model": "· मॉडल",
      "photograph": "· तस्वीर",
      "catalogue": "· कैटलॉग",
      "illustration": "· चित्र"
    },
    "drawnWords": {
      "reconstruction": "एक प्रकाशित अध्ययन से 3D में फिर से बनाया हुआ रूप",
      "model": "इसी तरह की चीज़ का मॉडल, इसके अपने तारे नहीं",
      "photograph": "एक असली तस्वीर, हमारी तरफ़ से",
      "catalogue": "कैटलॉग की जगहें",
      "illustration": "इसी तरह की चीज़ों जैसी सांकेतिक चमक और निशान"
    },
    "drawnLine": "जो बनाया गया है: {drawn}।",
    "drawnJoin": "; बाकी जगह, ",
    "records": {
      "dso-milky-way": {
        "drawn": "मापों पर टिका एक चित्र",
        "split": "मापा हुआ: कुछ हज़ार प्रकाश-वर्ष के भीतर के तारे (Gaia), पट्टी का कोण, भुजाओं के साथ की दिशाएँ और पास की भुजाएँ (Reid et al. 2019)। अनुमान से: केंद्र के पार का दूर वाला हिस्सा, जो धूल के पीछे छिपा है; इसकी भुजाएँ पास वाली भुजाओं को आगे घुमाकर बनाई गई हैं।"
      }
    }
  },
  "truth": {
    "label": "हमें कैसे पता है",
    "hints": {
      "measured": "मापा हुआ",
      "inferred": "गणना से निकाला",
      "illustrative": "सांकेतिक",
      "sample": "नमूना",
      "unknown": "पता नहीं",
      "unplaced": "जगह तय नहीं",
      "reconstruction": "पुनर्निर्मित",
      "model": "मॉडल",
      "photograph": "तस्वीर",
      "catalogue": "कैटलॉग",
      "illustration": "चित्र"
    },
    "loading": "संकेत-सूची खुल रही है।",
    "failed": "संकेत-सूची लोड नहीं हुई। नीचे की पंक्ति संक्षेप में वही कहती है।"
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "पास से देखने पर, जहाँ मापी हुई हवाएँ एक-दूसरे को काटती हैं वहाँ और विशाल लाल धब्बे के पीछे छोटे भँवर घूमते हैं, और ओवल BA तथा तीन सफ़ेद अंडाकार घूमते हैं। हवाओं की काट कहाँ है, यह मापा हुआ है; हर भँवर बनाया गया है, नक्शे से ज़्यादा बारीक: सांकेतिक।"
    },
    "poles": {
      "jupiter": "हर ध्रुव के चारों ओर के चक्रवात Juno के 2017 के अवलोकनों से मॉडल किए गए हैं, उत्तर में एक के चारों ओर आठ और दक्षिण में पाँच: एक पुनर्निर्मित रूप, तस्वीर नहीं। बीच की खाली जगहों में गहरी परत सांकेतिक है।"
    }
  },
  "weatherDetail": "नक्शे के तीखेपन से ज़्यादा पास आने पर तस्वीर को सँभालने के लिए बादलों की बारीक धारीदार बनावट बनाई जाती है: वह मापी हुई हवाओं के साथ चलती है और नक्शे के अपने रंग रखती है, और उसकी एक भी धारी असली बादल नहीं है। सांकेतिक।",
  "weatherVortex": {
    "turning": {
      "saturn": "पास से देखने पर षट्भुज के भीतर एक छोटा चक्रवात घूमता है: उसकी आँख 2 000 किमी चौड़ी है और उसकी दीवार 150 मीटर प्रति सेकंड से घूमती है, जैसा Cassini ने 2012 में मापा। उसके चारों ओर बना घुमाव सांकेतिक है, और अब कोई उस पर नज़र नहीं रख रहा।"
    },
    "still": {
      "saturn": "पास से देखने पर षट्भुज के भीतर एक छोटा चक्रवात टिका है: उसकी आँख 2 000 किमी चौड़ी है, जैसा Cassini ने 2012 में मापा, जब उसकी दीवार 150 मीटर प्रति सेकंड से घूमती थी। उसके चारों ओर बना घुमाव सांकेतिक है, और अब कोई उस पर नज़र नहीं रख रहा।"
    }
  },
  "sunAlive": {
    "prominences": "इसके किनारे पर {n} प्रज्वाल खड़े हैं, उन सक्रिय क्षेत्रों पर जिन्हें NOAA किनारे से पंद्रह डिग्री के भीतर सूचीबद्ध करता है। जगहें मापी हुई हैं; आकार, ऊँचाइयाँ और हलचल सांकेतिक हैं।",
    "prominencesOne": "इसके किनारे पर एक प्रज्वाल खड़ा है, एक ऐसे सक्रिय क्षेत्र पर जिसे NOAA किनारे से पंद्रह डिग्री के भीतर सूचीबद्ध करता है। जगह मापी हुई है; आकार, ऊँचाई और हलचल सांकेतिक हैं।",
    "flare": "क्षेत्र {region} पर {cls} श्रेणी की ज्वाला दिख रही है: NOAA की घटना-सूची के अनुसार वह {date} को {time} UTC पर चरम पर थी। उसका समय, श्रेणी, क्षेत्र और मद्धम पड़ना मापे हुए हैं; उसे कितना चमकीला बनाया गया है, यह सांकेतिक है।",
    "cme": "कोरोनल मास इजेक्शन, जो {date} को {time} UTC पर {speed} किमी/सेकंड की रफ़्तार से निकला, वैसे बनाया गया है जैसे कोरोनाग्राफ़ उसे दिखाता है: बाहर की ओर बढ़ता चमकीला छल्ला, उसके पीछे गहरा खोखला हिस्सा और चमकीला केंद्र। इसकी शुरुआत, दिशा, चौड़ाई और रफ़्तार NASA के DONKI कैटलॉग से हैं; बादल उसी रफ़्तार पर बना रहता है, जो असली वाले नहीं करते, और उसका रूप सांकेतिक है।"
  },
  "starSystem": {
    "zoneLabel": "रहने लायक पट्टी, गणना से",
    "orbitOf": {
      "mercury": "बुध की कक्षा, पैमाना समझने के लिए",
      "earth": "पृथ्वी की कक्षा, पैमाना समझने के लिए",
      "jupiter": "बृहस्पति की कक्षा, पैमाना समझने के लिए",
      "neptune": "वरुण की कक्षा, पैमाना समझने के लिए"
    },
    "rows": {
      "known": "क्या पता है",
      "orbit": "अपने तारे से दूरी",
      "temperature": "तापमान, गणना से",
      "zone": "रहने लायक पट्टी, गणना से",
      "starTemperature": "सतह का तापमान",
      "starWidth": "चौड़ाई",
      "starGlow": "दमक",
      "starMass": "द्रव्यमान",
      "planets": "बनाए गए ग्रह",
      "stars": "इस मंडल के तारे",
      "companion": "दूसरा सूर्य"
    },
    "unseen": "इसकी सतह किसी ने नहीं देखी।",
    "measuredOne": "इसका {what} मापा हुआ है।",
    "measuredMany": "इसके {what} मापे हुए हैं।",
    "estimatedOne": "इसका {what} एक अनुमान है।",
    "estimatedMany": "इसके {what} अनुमान हैं।",
    "unmeasuredOne": "इसका {what} मापा नहीं गया है।",
    "and": " और ",
    "what": {
      "size": "आकार",
      "year": "साल",
      "mass": "द्रव्यमान",
      "least": "कम से कम संभव द्रव्यमान"
    },
    "au": "{n} AU",
    "auComputed": "{n} AU, इसके साल और इसके तारे के द्रव्यमान से गणना करके",
    "auYearComputed": "{n} AU; इसका साल, लगभग {y} साल, इसी से और इसके तारे के द्रव्यमान से गणना करके निकाला गया है",
    "earthsEstimated": "पृथ्वी का {n} गुना, आर्काइव का अनुमान, इसके द्रव्यमान से",
    "massEstimated": "पृथ्वी का {n} गुना, आर्काइव का अनुमान, इसके आकार से",
    "massLeast": "कम से कम पृथ्वी का {n} गुना",
    "sizeDefault": "मापा नहीं गया: पृथ्वी जितना बनाया गया",
    "temperature": "{k} K ({c} °C), अगर यह अपनी रोशनी का {pct} % पृथ्वी की तरह लौटाता है",
    "zone": {
      "inside": "इसके भीतर",
      "edge": "इसके किनारे पर: सिर्फ़ चौड़ी सीमाओं के भीतर",
      "hotter": "तारे के इससे ज़्यादा पास",
      "colder": "तारे से इससे ज़्यादा दूर"
    },
    "zoneNone": {
      "too-hot": "गणना नहीं की गई: सूत्र इतने गर्म तारे को नहीं ढकता",
      "too-cool": "गणना नहीं की गई: सूत्र इतने ठंडे तारे को नहीं ढकता",
      "no-temperature": "गणना नहीं की गई: तारे का तापमान मापा नहीं गया",
      "no-luminosity": "गणना नहीं की गई: तारे की चमक मापी नहीं गई",
      "twoStars": "गणना नहीं की गई: यह दो तारों की परिक्रमा करता है और कैटलॉग एक का वर्णन करता है"
    },
    "zoneRange": "तारे से {a} से {b} AU (Kopparapu et al. 2014)",
    "overlay": {
      "title": "नक्शे पर चढ़ाएँ",
      "zone": "रहने लायक पट्टी",
      "orbits": "हमारे ग्रहों की कक्षाएँ",
      "zoneTitle": "ग्रह की सतह पर तरल पानी कहाँ टिक सकता है, तारे के तापमान और चमक से गणना करके",
      "orbitsTitle": "हमारे अपने सौरमंडल के ग्रहों की कक्षाएँ, पैमाने के लिए इस तारे के चारों ओर बनाई गईं",
      "note": {
        "none": "मंडल पर कुछ नहीं चढ़ाया गया है।",
        "zone": "हरी पट्टी रहने लायक पट्टी है, गणना से निकाली हुई (Kopparapu et al. 2014), देखी हुई नहीं।",
        "orbits": "टूटे छल्ले हमारे अपने सौरमंडल की कक्षाएँ हैं, पैमाने के लिए। यहाँ कुछ भी इन्हें नहीं मानता।",
        "both": "हरी पट्टी रहने लायक पट्टी है, गणना से निकाली हुई; टूटे छल्ले हमारे अपने ग्रहों की कक्षाएँ हैं, पैमाने के लिए।"
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "मापा नहीं गया",
    "starPoint": "मापा नहीं गया: रोशनी के एक बिंदु की तरह बनाया गया",
    "starWhite": "मापा नहीं गया: सफ़ेद बनाया गया",
    "starGlowValue": "तारे से चौड़ा, उसी के रंग में बनाया गया, ताकि दूर से दिख सके",
    "starsOne": "कैटलॉग में {n}; एक बनाया गया",
    "starsBoth": "दो, दोनों बनाए गए",
    "companionValue": "{width} चौड़ा, {mass} भारी, {k} K{derived}",
    "companionDerived": " (मॉडल का मान; इसका रंग सांकेतिक है)",
    "zoneBoth": "{a} से {b} AU, दोनों सूर्यों की रोशनी जोड़कर",
    "pairLine": "दोनों सूर्य हर {days} दिन में एक-दूसरे का चक्कर लगाते हैं, औसतन {a} AU की दूरी पर, उसी कक्षा में जो शोध-पत्रों ने मापी; ग्रह दोनों के चारों ओर घूमता है। उनकी जगहें उसी कक्षा से गणना करके निकाली गई हैं; जिस तल में उन्हें बनाया गया है, यानी ग्रहों का तल, वही है जो आसमान का दृश्य इस्तेमाल करता है।",
    "line": "आकार और साल NASA Exoplanet Archive से, {date} को पढ़े गए। कक्षाएँ वृत्तों की तरह बनाई गई हैं{computed}; रंग{phase} और कक्षाओं का झुकाव सांकेतिक हैं{defaults}।",
    "lineComputed": ", इनमें से {n} का आकार साल और तारे के द्रव्यमान से निकाला गया",
    "lineDefaults": "; जिस ग्रह का आकार मापा नहीं गया उसे पृथ्वी जितना बनाया गया है"
  },
  "shells": {
    "radio": "पृथ्वी से निकला रेडियो {n} प्रकाश-वर्ष तक पहुँच चुका है"
  },
  "subscribe": {
    "heading": "आने वाली चीज़ों की खबर मुझे ईमेल करें",
    "emailLabel": "आपका ईमेल पता",
    "emailPlaceholder": "you@example.com",
    "pickOne": "कम से कम एक पर टिक करें।",
    "launchesLabel": "आने वाले प्रक्षेपण",
    "showersLabel": "उल्का वर्षा के चरम",
    "approachesLabel": "नज़दीकी गुज़रना",
    "submit": "सदस्यता लें",
    "sending": "भेज रहे हैं…",
    "pending": "पक्का करने के लिए अपना ईमेल देखें।",
    "couldNotReach": "सदस्यता सेवा तक पहुँचा नहीं जा सका।"
  },
  "flood": {
    "on": "रोशन करें",
    "off": "असली रोशनी",
    "title": "मॉडल को बराबर रोशनी दें, ताकि वह छाया में भी दिखे। यह असली रोशनी नहीं है।",
    "note": "हमारा लैंप, असली रोशनी नहीं।"
  },
  "ephemeris": {
    "drawn": "JPL Horizons से बनाया गया, बीच के बिंदु भरकर: JPL के अपने रास्ते से लगभग {km} किमी के भीतर।",
    "note": "नक्शे में उस दिन का रास्ता है, JPL Horizons से, लगभग {km} किमी तक सही।",
    "noteLate": "JPL का इसका रास्ता इस पल से {n} मिनट बाद शुरू होता है, और घड़ी वहीं जाती है। लगभग {km} किमी तक सही।",
    "noteDay": "NASA का पन्ना दिन बताता है। घड़ी {time} UTC पर जाती है, उस दिन JPL के रास्ते में सबसे पास का गुज़रना, लगभग {km} किमी तक सही।",
    "failed": "उस दिन का इसका रास्ता लोड नहीं हुआ, इसलिए घड़ी वहीं रहती है जहाँ है। फिर कोशिश के लिए इसे दोबारा चुनें।",
    "span": "JPL का इसका रास्ता {from} से {to} तक चलता है।",
    "before": "घड़ी उससे पहले है, इसलिए नक्शे में इसकी कोई जगह नहीं।",
    "after": "घड़ी उसके बाद है, इसलिए नक्शे में इसकी कोई जगह नहीं।",
    "go": "सबसे पास की उपलब्ध तारीख़ पर जाएँ",
    "goBefore": "घड़ी को {date} पर ले जाएँ, जहाँ JPL का इसका रास्ता शुरू होता है",
    "goAfter": "घड़ी को {date} पर ले जाएँ, जहाँ JPL का इसका रास्ता खत्म होता है"
  },
  "offline": {
    "updateReady": "नया संस्करण तैयार है",
    "reload": "फिर लोड करें"
  },
  "keepTrip": {
    "keep": "ऑफ़लाइन के लिए रखें",
    "keepTitle": "इस सफ़र की आवाज़, मॉडल और नक्शे इस डिवाइस पर सहेजें ताकि यह बिना कनेक्शन के चले",
    "keeping": "{total} में से {done} रखे जा रहे हैं",
    "kept": "ऑफ़लाइन के लिए रखा गया",
    "keptTitle": "इस डिवाइस पर रखा है। दोबारा लाने के लिए दबाएँ।",
    "keptNote": "{n} फ़ाइलें, {size}, इस डिवाइस पर सहेजी गईं। लाइव डेटा (मौसम, तूफ़ान, उपग्रह) नहीं रखा जाता।",
    "again": "फिर कोशिश करें",
    "failedNote": "{total} में से {done} फ़ाइलें रखी गईं। कनेक्शन देखें और फिर कोशिश करें।"
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "आवाज़ के साथ शुरू करने के लिए कोई भी कुंजी दबाएँ",
    "gateTitleTouch": "आवाज़ के साथ शुरू करने के लिए स्क्रीन छुएँ",
    "gateNote": "यहाँ कोई न हो तो यह {n} सेकंड में बिना आवाज़ के, कैप्शन के साथ शुरू हो जाता है।",
    "upNext": "अगला सफ़र",
    "shape": "{n} पड़ाव · {m} मिनट",
    "take": "कमान लें",
    "takeTitle": "सफ़र रोकें और नक्शा खुद चलाएँ"
  },
  "drift": {
    "name": "बहाव",
    "pause": "रोकें (Space)",
    "resume": "आगे बढ़ें (Space)",
    "next": "अगली जगह (N)",
    "options": "विकल्प",
    "optionsTitle": "किसके बीच से गुज़रें, क्या दिखाएँ और रफ़्तार कितनी हो",
    "leave": "बहना रोकें (Escape)",
    "through": "इनके बीच से गुज़रें",
    "cats": {
      "craft": "अंतरिक्ष यान",
      "worlds": "दुनियाएँ",
      "small": "छोटे पिंड",
      "stars": "तारे",
      "deep": "गहरा आकाश"
    },
    "show": "दिखाएँ",
    "real": "असली मॉडल",
    "realTitle": "सिर्फ़ वही चीज़ें जिनका असली मॉडल, नक्शा या तस्वीर है",
    "names": "नाम",
    "namesTitle": "हर जगह के बगल में नाम और संख्याएँ",
    "bare": "बस अंतरिक्ष",
    "bareTitle": "आसमान और उसकी चीज़ों के सिवा कुछ नहीं: न नाम, न निशान, न लकीरें, न पैनल",
    "pace": "रफ़्तार",
    "paces": {
      "calm": "शांत",
      "steady": "सधी हुई",
      "brisk": "तेज़"
    },
    "hint": "बह रहे हैं। कमान लेने के लिए नक्शा खींचें",
    "nothing": "इन चुनावों के साथ बहने के लिए कुछ नहीं है",
    "notFromGround": "बहाव ज़मीन से नहीं, अंतरिक्ष से शुरू होता है"
  },
  "tour": {
    "label": "टूर",
    "micro": "टूर",
    "count": "{n} / {of}",
    "next": "अगला",
    "nextTitle": "अगला कदम (N)",
    "done": "पूरा",
    "doneTitle": "टूर खत्म करें",
    "skip": "छोड़ें",
    "skipTitle": "टूर छोड़ें (Escape)",
    "voice": "आवाज़",
    "voiceTitle": "हर कदम बनावटी आवाज़ में पढ़कर सुनाएँ",
    "waited": "एक नज़र डालें, फिर आगे बढ़ें।",
    "invite": "पहली बार आए हैं: टूर लें",
    "inviteTitle": "नक्शे के आठ कदम"
  },
  "undo": {
    "moved": "{name} पर गए",
    "movedNowhere": "दृश्य हिल गया",
    "night": "{name} पर रात: चौड़ा दृश्य",
    "back": "जहाँ थे वहाँ वापस",
    "done": "वापस वहीं जहाँ थे"
  },
  "searchRows": {
    "kinds": {
      "sun": "तारा",
      "planet": "ग्रह",
      "moon": "चंद्रमा",
      "station": "अंतरिक्ष स्टेशन",
      "satellite": "उपग्रह",
      "telescope": "अंतरिक्ष टेलीस्कोप",
      "probe": "अंतरिक्ष यान",
      "rocket": "रॉकेट",
      "launch": "प्रक्षेपण",
      "debris": "मलबा",
      "asteroid": "क्षुद्रग्रह",
      "comet": "धूमकेतु",
      "site": "जगह",
      "landing": "उतरने की जगह",
      "star": "तारा",
      "exoplanet": "दूसरे तारे का ग्रह",
      "dso": "गहरे आकाश की चीज़",
      "storm": "उष्णकटिबंधीय तूफ़ान",
      "oddity": "अजूबा",
      "earthevent": "पृथ्वी की घटना",
      "blackhole": "ब्लैक होल",
      "pulsar": "पल्सर",
      "magnetar": "मैग्नेटार",
      "quasar": "क्वेज़ार",
      "galaxy": "आकाशगंगा",
      "cluster": "आकाशगंगाओं का समूह",
      "browndwarf": "भूरा बौना",
      "whitedwarf": "श्वेत बौना"
    },
    "upNow": "अभी ऊपर, {compass}",
    "lowNow": "अभी {compass} में नीचे",
    "downNow": "अभी आपके क्षितिज के नीचे",
    "trip": "सफ़र",
    "starPattern": "तारों का तारामंडल",
    "mission": "मिशन",
    "eventName": "{mission}: {title}",
    "event": "मिशन की घटना · {date}",
    "eventNoDate": "मिशन की घटना",
    "group": "उपग्रह समूह · नक्शे पर {n} उपग्रह · सूची के लिए दबाएँ",
    "nearMe": "आज रात मेरे पास",
    "nearMeSub": "आपके आसमान में क्या ऊपर है"
  },
  "countdown": {
    "go": "प्रक्षेपण के लिए तैयार",
    "tbc": "समय की पुष्टि बाकी",
    "tbd": "समय तय नहीं",
    "hold": "रुका हुआ: उल्टी गिनती थमी है",
    "inFlight": "उड़ान में",
    "success": "प्रक्षेपित",
    "deployed": "पेलोड छोड़ा गया",
    "failure": "प्रक्षेपण नाकाम रहा",
    "partial": "आंशिक नाकामी",
    "byPlan": "योजना के हिसाब से। कोई नई खबर नहीं",
    "byPlanClimbing": "योजना के हिसाब से, ऊपर चढ़ते हुए। कोई नई खबर नहीं",
    "age": "{age} पढ़ा"
  },
  "today": {
    "title": "आज",
    "moonTitle": "{phase} चंद्रमा",
    "moonLine": "{pct} % रोशन · {next} {date} को",
    "moonNext": [
      "अमावस्या",
      "पहली तिमाही",
      "पूर्णिमा",
      "आख़िरी तिमाही"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "पिछले 30 दिन",
    "launched": "कक्षा में {n} नई चीज़ें",
    "launchedLine": "सबसे नई: {name}",
    "debris": "मलबा, संख्याओं में",
    "debrisClose": "मलबे का दृश्य बंद करें",
    "debrisTitle": "कक्षा में ट्रैक की जा रही हर चीज़ गिनता है। पूरा कैटलॉग पढ़ता है, लगभग 1.5 MB"
  },
  "sentence": {
    "one": "{a}।",
    "two": "{a}, और {b}।",
    "title": "{sources} से। वहाँ जाने के लिए दबाएँ",
    "names": {
      "sat-25544": "ISS",
      "sat-48274": "तियांगोंग"
    },
    "pass": "{name} {when} आपके ऊपर से गुज़रता है",
    "launch": "{name} का प्रक्षेपण {when} होना है",
    "showerToday": "आज {name} का चरम है",
    "showerTomorrow": "कल {name} का चरम है",
    "moonName": "चंद्रमा",
    "moonPhases": [
      "अमावस्या",
      "",
      "पूर्णिमा",
      ""
    ],
    "moonToday": "आज {phase} है",
    "moonOne": "{phase} में एक दिन बाकी है",
    "moonDays": "{phase} में {n} दिन बाकी हैं",
    "moonLit": "चंद्रमा {pct} % रोशन है",
    "crew": "अभी {n} लोग कक्षा में हैं",
    "crewOne": "अभी एक व्यक्ति कक्षा में है",
    "storms": "{n} तूफ़ान घूम रहे हैं",
    "stormOne": "एक तूफ़ान घूम रहा है",
    "approach": "{name} {when} पृथ्वी के पास से गुज़रता है",
    "launched": "30 दिन में {n} नई चीज़ें कक्षा में पहुँचीं",
    "dateToday": "आज {date} है",
    "dateClock": "घड़ी {date} पर सेट है",
    "sources": {
      "pass": "CelesTrak के तत्व",
      "launch": "Launch Library 2",
      "shower": "IMO का उल्का वर्षा कैलेंडर",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "आपके डिवाइस की घड़ी"
    }
  },
  "wonder": {
    "kicker": "आज का अजूबा",
    "label": "आज का अजूबा: {title}"
  },
  "story": {
    "kicker": "इस हफ़्ते की कहानी · हफ़्ता {week}",
    "label": "इस हफ़्ते की कहानी: {title}",
    "ruleTitle": "यह कैसे निकाला गया: {rule}",
    "lowest": {
      "title": "हमारे कैटलॉग में सबसे नीचे: {name}",
      "line": "{apogee} किमी से ऊपर कभी नहीं, नीचे {perigee} किमी तक, एक चक्कर {min} मिनट में।",
      "rule": "7 दिन से नए {n} तत्व-सेटों में सबसे नीचा सबसे ऊँचा बिंदु"
    },
    "farthest": {
      "title": "हमारे कैटलॉग में सबसे दूर: {name}",
      "line": "बाहर {apogee} किमी तक, वापस {perigee} किमी तक, एक चक्कर {lap} में।",
      "hours": "{n} घंटे",
      "days": "{n} दिन",
      "rule": "7 दिन से नए {n} तत्व-सेटों में सबसे ऊँचा बिंदु"
    },
    "busiest": {
      "title": "हमारे पास की सबसे भीड़ वाली ऊँचाई: {lo} से {hi} किमी",
      "line": "हमारे पास की {total} चीज़ों में से {n} वहीं उड़ती हैं: 100 में {pct}।",
      "rule": "7 दिन से नए {n} सेटों में औसत ऊँचाई की सबसे भरी {band} किमी की पट्टी"
    },
    "oldest": {
      "title": "हमारे कैटलॉग का सबसे पुराना प्रक्षेपण: {name}",
      "line": "{year} में छोड़ा गया, {years} साल से ऊपर, एक चक्कर {min} मिनट में।",
      "rule": "7 दिन से नए {n} तत्व-सेटों में सबसे पहला प्रक्षेपण-वर्ष"
    }
  },
  "happened": {
    "flown": "{age} उड़ान भरी",
    "lost": "{age} प्रक्षेपण नाकाम रहा"
  },
  "passport": {
    "title": "पासपोर्ट",
    "openTitle": "आप कहाँ-कहाँ गए, सिर्फ़ इसी ब्राउज़र में रखा",
    "summary": "{places} · {total} में से {n} सफ़र",
    "places": "{n} जगहें",
    "placeOne": "{n} जगह",
    "kept": "सिर्फ़ इसी ब्राउज़र में रखा है, कभी भेजा नहीं जाता।",
    "notKept": "यह ब्राउज़र कुछ नहीं रखता, इसलिए यहाँ कुछ नहीं है।",
    "placesTitle": "आपकी खोली हुई जगहें",
    "tripsTitle": "पूरे किए सफ़र",
    "outOf": "{total} में से {n}",
    "barLabel": "{total} में से {n} सफ़र पूरे",
    "placeTitle": "{name} पर जाएँ",
    "noPlaces": "अभी कोई जगह नहीं। नक्शे पर कोई खोलें।",
    "noTrips": "अभी कोई सफ़र पूरा नहीं हुआ।",
    "seenTitle": "अपनी आँखों से देखा",
    "noSeen": "अभी कुछ टिक नहीं किया। कार्ड पर “देख लिया” बटन होता है।",
    "seenIt": "देख लिया",
    "toolsLabel": "इस चीज़ के लिए और",
    "seenOn": "{date} को देखा",
    "seenTitleOff": "जब इसे अपनी आँखों से देख लें तब टिक करें",
    "seenTitleOn": "देखा हुआ टिक है। टिक हटाने के लिए दबाएँ",
    "seenNotKept": "यह ब्राउज़र कुछ नहीं रखता, इसलिए टिक टिकेगा नहीं",
    "remind": "याद दिलाएँ",
    "remindTitle": "याद दिलाने वाली कैलेंडर फ़ाइल डाउनलोड होती है: {title}",
    "forget": "मुझे भूल जाएँ",
    "forgetConfirm": "हाँ, भूल जाएँ",
    "forgetTitle": "इस ब्राउज़र से पासपोर्ट और आवाज़ का चुनाव मिटा देता है",
    "forgotten": "भुला दिया। इस ब्राउज़र में अब कुछ नहीं है।",
    "stamp": "सफ़र {n} / {total} · {date}",
    "stampPlaces": "अब तक {places} खोली गईं",
    "resume": "पड़ाव {n} से जारी रखें"
  },
  "kept": {
    "title": "यह साइट आपके डिवाइस पर क्या रखती है",
    "lines": [
      "आपका पासपोर्ट: खोली हुई जगहें, पूरे किए सफ़र, देखा हुआ करके टिक की गई चीज़ें।",
      "आपकी आवाज़ और बोलने वाली आवाज़ का चुनाव, और आपने पैनल कैसे छोड़े थे।",
      "आख़िरी बार पढ़े डेटा की एक प्रति, ताकि नक्शा बिना कनेक्शन के भी खुले।",
      "जब कोई स्क्रीन अपने आप चलती है, तब उसके सफ़रों का एक छोटा लॉग, सिर्फ़ इसी टैब के लिए।"
    ],
    "place": "आपकी जगह एक डिग्री के दसवें हिस्से तक गोल की जाती है और सिर्फ़ तब तक रखी जाती है जब तक यह पन्ना खुला है।",
    "none": "कोई खाता नहीं, कोई कुकी नहीं, कोई एनालिटिक्स नहीं। पासपोर्ट में “मुझे भूल जाएँ” पासपोर्ट और आवाज़ का चुनाव मिटा देता है।"
  },
  "buildInfo": {
    "line": "{sha} से बना, {date}",
    "title": "वह कमिट जिससे यह साइट बनी, GitHub पर",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "क्या अंतरिक्ष सचमुच ऐसा दिखता है?",
    "lead": "चीज़ें कहाँ हैं और कैसे चलती हैं, यह मापा या गणना से निकाला हुआ है। वे कैसी दिखती हैं, यह तीन तरह की तस्वीरों से आता है।",
    "kinds": [
      [
        "एक 3D मॉडल",
        "नीहारिकाएँ और आकाशगंगाएँ प्रकाशित मापों से बने 3D मॉडल हैं, उनकी रोशनी टेलीस्कोप की तस्वीरों (लंबे एक्सपोज़र) से ली गई है; जिसका मॉडल अभी नहीं है वह अपने आकार की एक कोमल दमक है। आँख को वही गैस हल्की स्लेटी दमक जैसी दिखती है। कार्ड पर मॉडल के बगल में तस्वीर भी दिखाई जा सकती है।"
      ],
      [
        "मॉडल पर चढ़ा नक्शा",
        "ग्रह और चंद्रमा ऐसे गोले हैं जिन पर अंतरिक्ष यानों की तस्वीरों से बने नक्शे चढ़े हैं, कुछ को किसी कलाकार ने चिकना किया है। अंतरिक्ष यान 3D मॉडल हैं, ज़्यादातर NASA की प्रकाशित फ़ाइलों से। उन पर रोशनी दिखाए गए पल के लिए गणना करके निकाली गई है।"
      ],
      [
        "कलाकार की कल्पना",
        "दूसरे तारे के किसी ग्रह की सतह किसी ने नहीं देखी। वे चेहरे मापे हुए आकार और तापमान से कल्पना करके बनाए गए हैं, और उनके कार्ड यह साफ़ कहते हैं।"
      ]
    ],
    "foot": "आकार और दूरियाँ कभी-कभी बदली जाती हैं ताकि कोई चीज़ दिख तो सके। जहाँ ऐसा है, कार्ड या तस्वीर यह कह देती है।"
  },
  "debris": {
    "title": "कक्षा में मलबा",
    "reading": "कैटलॉग पढ़ रहे हैं, लगभग 1.5 MB",
    "failed": "कैटलॉग पढ़ा नहीं जा सका।",
    "retry": "फिर कोशिश करें",
    "empty": "कैटलॉग में कक्षा की कोई चीज़ नहीं है।",
    "lead": "कक्षा में ट्रैक की जा रही {total} चीज़ों में से {gone} अब काम नहीं करतीं।",
    "kinds": {
      "debris": "मलबे के टुकड़े",
      "rocket": "इस्तेमाल हो चुके रॉकेट के हिस्से",
      "dead": "बेकार उपग्रह",
      "working": "चालू उपग्रह"
    },
    "bandsTitle": "ऊँचाई के हिसाब से",
    "bands": {
      "low": "600 किमी से नीचे",
      "crowded": "600 से 1 000 किमी",
      "upper": "1 000 से 2 000 किमी",
      "medium": "2 000 से 34 000 किमी",
      "geo": "लगभग 36 000 किमी",
      "beyond": "37 600 किमी के पार",
      "stretched": "लंबी खिंची कक्षाएँ"
    },
    "bandAria": "{band}: कुल {total}। {debris} मलबा, {rocket} रॉकेट के हिस्से, {dead} बेकार उपग्रह, {working} चालू।",
    "show": "नक्शे पर दिखाएँ",
    "hide": "नक्शे से छिपाएँ",
    "showTitle": "मलबे का हर टुकड़ा और इस्तेमाल हो चुका रॉकेट, किस्म के रंग में",
    "drawn": "{n} बिंदु: स्लेटी मलबा है, पीला इस्तेमाल हो चुका रॉकेट। हर एक अपनी असली ऊँचाई और झुकाव पर है, पर अपनी कक्षा में एक गढ़ी हुई जगह पर।",
    "storiesTitle": "कैटलॉग से",
    "oneObject": "एक चीज़",
    "objects": "{n} चीज़ें",
    "oneLaunch": "एक प्रक्षेपण",
    "launches": "{n} प्रक्षेपण",
    "oneThing": "एक चीज़",
    "things": "{n} चीज़ें",
    "storyLaunched": "{date} तक के हफ़्ते में {launches} से {objects} कैटलॉग में जुड़ीं।",
    "storyCameDown": "उस हफ़्ते {things} नीचे आ गिरीं।",
    "storyCameDownBiggest": "उस हफ़्ते {things} नीचे आ गिरीं, उनमें सबसे बड़ी {name}।",
    "storyCloud": "मलबे का सबसे बड़ा बादल {name} से है: {pieces} टुकड़े अब भी कक्षा में।",
    "storyClouds": "मलबे के सबसे बड़े बादल: {name}, {pieces} टुकड़े अब भी ऊपर; फिर {name2}, {pieces2}, और {name3}, {pieces3}।",
    "storyOldest": "कक्षा में अब भी मौजूद सबसे पुरानी चीज़ {name} है, जो {year} में छोड़ी गई: {years} साल के चक्कर।",
    "untracked": "ट्रैक करने के लिए बहुत छोटे, ESA के मॉडल के अनुसार: {when} तक 1 से 10 सेमी के लगभग {mid} मिलियन टुकड़े और 1 मिमी से 1 सेमी के {small} मिलियन। एक अनुमान, गिनती नहीं।",
    "untrackedSource": "ESA अंतरिक्ष पर्यावरण के आँकड़े",
    "honesty": "CelesTrak के कैटलॉग से गिना गया, जैसा {date} को पढ़ा गया: जो रडार ट्रैक कर सकता है, लगभग 10 सेमी चौड़ाई से ऊपर। छोटे टुकड़े कहीं ज़्यादा हैं और किसी कैटलॉग में नहीं हैं। बिंदु अपनी कक्षा में कहाँ है, यह सांकेतिक है।",
    "drawnPlaced": "{n} बिंदु: स्लेटी मलबा है, पीला इस्तेमाल हो चुका रॉकेट। {placed} वहीं हैं जहाँ उनके अपने कक्षा-तत्वों का समुच्चय उन्हें रखता है; बाकी {rest} अपनी असली ऊँचाई और झुकाव पर हैं, पर कक्षा में एक गढ़ी हुई जगह पर।",
    "honestyPlaced": "CelesTrak के कैटलॉग से गिना गया, जैसा {date} को पढ़ा गया: जो रडार ट्रैक कर सकता है, लगभग 10 सेमी चौड़ाई से ऊपर। छोटे टुकड़े कहीं ज़्यादा हैं और किसी कैटलॉग में नहीं हैं। स्थान CelesTrak के {built} के कक्षा-तत्वों से आते हैं; जिस बिंदु के प्रकाशित कक्षा-तत्व नहीं हैं, वह अपनी कक्षा में एक गढ़ी हुई जगह पर है, और उसका कार्ड यह कहता है।"
  },
  "klassFar": {
    "dwarf": "बौना ग्रह",
    "interstellar": "तारों के बीच की चीज़"
  },
  "moments": {
    "title": "आप यहाँ किसलिए आए हैं",
    "wonder": {
      "id": "wonder",
      "label": "अचरज",
      "hint": "इधर-उधर उड़ें और किसी भी चीज़ पर टैप करें।"
    },
    "now": {
      "id": "now",
      "label": "अभी",
      "hint": "इस मिनट आपके सिर के ऊपर क्या है।"
    },
    "next": {
      "id": "next",
      "label": "आगे",
      "hint": "क्या आने वाला है, और कब।"
    }
  },
  "audio": {
    "on": "आवाज़: चालू",
    "off": "आवाज़: बंद",
    "toggleTitle": "संगीत और आवाज़ें। जब तक आप चालू न करें, बंद रहती हैं; इस डिवाइस पर याद रखी जाती हैं।",
    "mute": "चुप",
    "unmute": "आवाज़",
    "muteTitle": "संगीत और आवाज़ें बंद करें",
    "unmuteTitle": "संगीत और आवाज़ें चालू करें",
    "panelTitle": "आवाज़",
    "panelNote": "नक्शे और उसके सफ़रों के लिए एक शांत संगीत। जब तक आप चालू न करें, कुछ डाउनलोड नहीं होता।",
    "creditsLine": "संगीत और आवाज़ें: {credits}",
    "narrationCredit": "वाचन: एक बनावटी आवाज़, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "उस रंग में बनाया गया जो इसकी रोशनी से मापा गया ​(B−V {bv}, V−R {vr}), उतना चमकीला जितना इसकी सतह लौटाती है (एल्बीडो {albedo}), एक ऐसे पैमाने पर जो इतना दबाया गया है कि इन दुनियाओं में सबसे गहरी भी दिखे।",
    "colourRed": "उस रंग में बनाया गया जो इसकी रोशनी से मापा गया (B−V {bv}, V−R {vr}), सौरमंडल की सबसे लाल चीज़ों में से एक, उतना चमकीला जितना इसकी सतह लौटाती है (एल्बीडो {albedo}), एक ऐसे पैमाने पर जो इतना दबाया गया है कि इन दुनियाओं में सबसे गहरी भी दिखे।",
    "shapeEgg": "इसका आकार वही अंडा है जो इसके प्रकाश-वक्र और 2017 के एक तारकीय ढकाव ने मापा, {a} × {b} × {c} किमी।",
    "shapeMeasured": "इसका आकार वही है जो तारकीय ढकावों ने मापा।",
    "shapeUnknown": "इसका आकार कभी मापा नहीं गया, इसलिए इसे गोल बनाया गया है।",
    "ring": "इसका छल्ला अपनी मापी हुई दूरी, चौड़ाई और अपारदर्शिता पर है; छल्ला आसमान में कैसे झुका है, यह नहीं बनाया गया।",
    "faintRings": "2023 में मिले इसके दो छल्ले अपनी असली अपारदर्शिता पर दिखने के लिए बहुत धुँधले हैं, इसलिए उन्हें नहीं बनाया गया।",
    "surface": "किसी टेलीस्कोप ने इसकी सतह साफ़ नहीं देखी: इस पर कुछ नहीं बनाया गया, और इसे स्थिर बनाया गया है, घूमता नहीं।",
    "source": "संख्याएँ: {src}।"
  },
  "worldFace": {
    "titan": {
      "title": "टाइटन, दो तरह से",
      "modes": {
        "own": "इन्फ़्रारेड",
        "radar": "रडार"
      },
      "notes": {
        "own": "टाइटन की ज़मीन, जैसी Cassini के कैमरे ने उसे धुंध के आर-पार निकट-इन्फ़्रारेड रोशनी (938 nm) में देखा, धुंध के नारंगी रंग में। उत्तर के सागरों को उन रूपरेखाओं के साथ गहरा किया गया है जो Cassini के रडार ने खींचीं, और पास से, जहाँ उनमें सूर्य झलकता है, वे चमकते हैं: चमक कहाँ पड़ती है, यह गणना से निकाला गया है; उसका आकार और चमक सांकेतिक हैं।",
        "radar": "टाइटन की ज़मीन की पट्टियाँ, जैसी Cassini के रडार ने उन्हें धुंध के आर-पार देखा, 2004 से 2015: चमकीला खुरदरी ज़मीन या रडार की ओर झुकी ज़मीन है, गहरा चिकनी है, और तरल मीथेन और ईथेन के सागर काले हैं। स्लेटी रंग हमारा है: रडार में रंग होता ही नहीं। रडार ने टाइटन का 61 % देखा; पट्टियों के बीच इन्फ़्रारेड नक्शा, मद्धम और नारंगी, झलकता है। USGS Astrogeology और NASA/JPL-Caltech, सार्वजनिक संपत्ति।"
      }
    },
    "venus": {
      "title": "शुक्र, दो तरह से",
      "modes": {
        "own": "बादल",
        "surface": "ज़मीन"
      },
      "notes": {
        "own": "बादलों की चोटियाँ, जो शुक्र का बस उतना ही हिस्सा है जो कोई आँख या टेलीस्कोप कभी देख पाता है।",
        "surface": "बादलों के नीचे की ज़मीन, जिसे NASA के Magellan ने 1990 से 1992 के बीच कक्षा से रडार द्वारा नापा। चमकीला खुरदरी ज़मीन है और गहरा चिकनी। नारंगी रंग जोड़ा गया है, और जो पट्टियाँ Magellan से छूट गईं उन्हें उनके किनारों से भरा गया है। इस पर सूर्य की रोशनी ऐसे पड़ती है मानो बादल हों ही नहीं: इसके पहाड़ और ढलानें, Magellan के ऊँचाईमापी से, छह गुना ऊँची बनाई गईं, अपनी छायाएँ डालते हैं। यह बादलों के साथ नहीं हिलती।"
      }
    },
    "jupiter": {
      "title": "बृहस्पति, दो तरह से",
      "modes": {
        "own": "कलाकार का नक्शा",
        "hubble": "Hubble की नज़र से"
      },
      "notes": {
        "own": "एक कलाकार का नक्शा, अंतरिक्ष यानों की तस्वीरों से बना और चिकना किया हुआ (Solar System Scope)। यही वह तस्वीर है जिसे ज़्यादातर लोग जानते हैं।",
        "hubble": "बृहस्पति, जैसा Hubble ने उसे 11 दिसंबर 2025 को नक्शे पर उतारा। पट्टियाँ वहीं हैं जहाँ उस दिन थीं, और कोई बादल वहाँ नहीं है जहाँ वह आज है। रंग Hubble के लाल, हरे और बैंगनी फ़िल्टरों के हैं, आँख जो देखती उससे थोड़े पीले। NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, ढाला गया।"
      }
    },
    "saturn": {
      "title": "शनि, दो तरह से",
      "modes": {
        "own": "कलाकार का नक्शा",
        "hubble": "Hubble की नज़र से"
      },
      "notes": {
        "own": "एक कलाकार का नक्शा, अंतरिक्ष यानों की तस्वीरों से बना और चिकना किया हुआ (Solar System Scope)। यही वह तस्वीर है जिसे ज़्यादातर लोग जानते हैं।",
        "hubble": "शनि, जैसा Hubble ने उसे 29 अगस्त 2025 को अपने लाल, हरे और बैंगनी फ़िल्टरों में नक्शे पर उतारा, आँख जो देखती उससे थोड़ा पीला। भूमध्य रेखा की जो पट्टी उस दिन छल्लों ने छिपा ली, उसे दोनों ओर के बादलों से भरा गया है। NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, ढाला गया।"
      }
    },
    "uranus": {
      "title": "अरुण, दो तरह से",
      "modes": {
        "own": "कलाकार का नक्शा",
        "hubble": "Hubble की नज़र से"
      },
      "notes": {
        "own": "एक कलाकार का नक्शा, अंतरिक्ष यानों की तस्वीरों से बना और चिकना किया हुआ (Solar System Scope)। यही वह तस्वीर है जिसे ज़्यादातर लोग जानते हैं।",
        "hubble": "अरुण, जैसा Hubble ने उसे 23 अक्टूबर 2025 को नक्शे पर उतारा। ग्रह अपनी बगल पर लेटा है और उसका उत्तरी ध्रुव हमारी ओर है, इसलिए Hubble ने सिर्फ़ उत्तरी आधा हिस्सा देखा; दक्षिणी आधे को भूमध्य रेखा का रंग दिया गया है, अंदाज़े से नहीं भरा गया। NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, ढाला गया।"
      }
    },
    "neptune": {
      "title": "वरुण, दो तरह से",
      "modes": {
        "own": "कलाकार का नक्शा",
        "hubble": "Hubble की नज़र से"
      },
      "notes": {
        "own": "एक कलाकार का नक्शा, अंतरिक्ष यानों की तस्वीरों से बना और चिकना किया हुआ (Solar System Scope)। यही वह तस्वीर है जिसे ज़्यादातर लोग जानते हैं।",
        "hubble": "वरुण, जैसा Hubble ने उसे 24 अगस्त 2025 को नक्शे पर उतारा: मशहूर तस्वीरों से ज़्यादा फीका। सुदूर उत्तर Hubble की नज़र से बाहर था और उसे आख़िरी देखे बादलों का रंग दिया गया है, अंदाज़े से नहीं भरा गया। NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, ढाला गया।"
      }
    }
  },
  "exposure": {
    "panelTitle": "एक्सपोज़र",
    "modes": {
      "eye": "आँख",
      "camera": "कैमरा",
      "deep": "गहरा"
    },
    "notes": {
      "eye": "अँधेरी जगह से आप जो देखेंगे: धुँधला और स्लेटी।",
      "camera": "लंबा एक्सपोज़र: मिनटों की रोशनी, जैसे कैमरा उसे जमा करता है।",
      "deep": "वेधशाला का खिंचाव: सबसे धुँधली गैस उभारी गई।"
    },
    "real": "गैस असली है, और धुँधली: टेलीस्कोप पर आँख को यह स्लेटी दमक दिखती है, क्योंकि रात की आँख रंग नहीं देखती। नक्शा इसे 3D मॉडल की तरह बनाता है; स्लाइडर जो तस्वीर दिखाता है वह लंबा एक्सपोज़र है।",
    "colours": {
      "broadband": "यह चौड़े रंग-फ़िल्टरों ({filters}) से ली गई थी, इसलिए रंग उसके पास हैं जो कहीं ज़्यादा संवेदनशील आँख देखती।",
      "mixed": "यह चौड़े रंग-फ़िल्टरों के साथ चमकती हाइड्रोजन के लिए एक संकरा फ़िल्टर जोड़कर ली गई थी ({filters}), इसलिए लाल गैस यहाँ आँख को मिलने वाली से ज़्यादा गाढ़ी है।",
      "narrowband": "इसके रंग बैठाए गए हैं: हर एक किसी अकेली गैस की रोशनी है, संकरे फ़िल्टर से ({filters}), बनावट दिखाने के लिए चुनी गई, यह दिखाने के लिए नहीं कि आँख क्या देखती।",
      "infrared": "यह इन्फ़्रारेड रोशनी में ली गई थी, जिसे कोई आँख नहीं देख सकती ({filters}), इसलिए यहाँ हर रंग चुना हुआ है: यह दिखाता है कि वहाँ क्या है, यह नहीं कि आँख क्या देखती।",
      "unstated": "इसका आर्काइव यह नहीं बताता कि कौन से फ़िल्टर इस्तेमाल हुए, इसलिए हम यह नहीं कहते कि ये वही रंग हैं जो आँख देखती।"
    },
    "part": "यह {part} दिखाती है, पूरा नहीं।",
    "creditLead": "तस्वीर: ",
    "creditTail": " · {licence}, किनारे हमने धुँधले किए और आसमान गहरा किया"
  },
  "look": {
    "panelTitle": "रूप",
    "modes": {
      "measured": "मापा हुआ",
      "film": "सिनेमा"
    },
    "titles": {
      "measured": "सिर्फ़ वही जो मापा या मॉडल किया गया है, असली रफ़्तार पर",
      "film": "बनाए गए ब्योरे और सांकेतिक मौसम जोड़ता है"
    }
  },
  "lookSaid": {
    "measured": "मापा हुआ रूप: इस पर कुछ भी बनाया हुआ या सांकेतिक नहीं बनाया गया।",
    "film": "सिनेमा रूप: बनाए गए ब्योरे और सांकेतिक मौसम बनाए गए हैं।",
    "worlds": {
      "saturn": "मौसम: पट्टियाँ उसी हवा की रफ़्तार से चलती हैं जो Cassini ने मापी थी। मॉडल से बनाई हलचल, आज के बादल नहीं।"
    },
    "also": {
      "venus": "शुक्र पर बिजली की खबरें आई हैं और उस पर अभी बहस है; कोई नहीं बनाई गई।"
    },
    "turning": {
      "jupiter": "पास से देखने पर ओवल BA और तीन सफ़ेद अंडाकार वहीं घूमते हैं जहाँ नक्शे में वे हैं।"
    },
    "poles": {
      "jupiter": "हर ध्रुव के चारों ओर के चक्रवात Juno के 2017 के अवलोकनों से मॉडल किए गए हैं, उत्तर में एक के चारों ओर आठ और दक्षिण में पाँच: एक पुनर्निर्मित रूप, तस्वीर नहीं।"
    },
    "sun": {
      "measured": "मापा हुआ रूप: बनाई हुई दानेदार बनावट बंद है, और कोरोना और प्रज्वाल स्थिर रखे गए हैं।",
      "film": "सिनेमा रूप: दानेदार बनावट बनाई गई है, और कोरोना और प्रज्वाल जैसे बनाए गए हैं वैसे चलते हैं, जैसे मापे गए हैं वैसे नहीं।"
    }
  },
  "otherLight": {
    "panelTitle": "दूसरी रोशनी",
    "bands": {
      "visible": "दिखने वाली",
      "infrared": "इन्फ़्रारेड",
      "microwave": "माइक्रोवेव",
      "gamma": "गामा किरणें"
    },
    "notes": {
      "visible": "आसमान, जैसा आँखें और कैमरे उसे देखते हैं।",
      "infrared": "इन्फ़्रारेड में आसमान, झूठे रंगों में: गर्म धूल और ठंडे तारे।",
      "microwave": "माइक्रोवेव, चमक की तरह: सबसे पुरानी रोशनी के ऊपर हमारी आकाशगंगा।",
      "gamma": "गामा किरणें, झूठे रंगों में: पल्सर, ब्लेज़ार, ब्रह्मांडीय किरणों की दमक।"
    },
    "colours": {
      "infrared": "लाल 22 µm है, हरा 4.6 µm, नीला 3.4 µm (WISE)",
      "microwave": "एक पट्टी, 94 GHz, चमक की तरह बनाई गई (WMAP)",
      "gamma": "लाल 0.3 से 1 GeV है, हरा 1 से 3, नीला 3 से ऊपर (Fermi)"
    },
    "mixLabel": "दिखने वाले आसमान से {band} तक",
    "mixValue": "{pct} % {band}",
    "loading": "पूरे आसमान की तस्वीर ला रहे हैं।",
    "failed": "वह तस्वीर पहुँची नहीं। आसमान वैसा ही है जैसा था।",
    "creditLead": "सर्वे: ",
    "creditTail": "। टाइलें: CDS, स्ट्रासबर्ग।"
  },
  "overlay": {
    "panelTitle": "पृथ्वी का डेटा",
    "keyTitle": "अभी गोले पर",
    "keyOff": "हटाएँ",
    "keyOffTitle": "पृथ्वी को वैसे दिखाएँ जैसी वह है",
    "none": "कोई नहीं",
    "loading": "NASA से तस्वीर माँग रहे हैं।",
    "failed": "वह तस्वीर पहुँची नहीं। गोला वैसा ही है जैसा था।",
    "noEarth": "पृथ्वी पर दिखाया जाता है, जब वह नज़र में हो।",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "यह तस्वीर {date} की है।",
      "monthly": "यह तस्वीर {date} का औसत है।"
    },
    "made": {
      "measured": "कक्षा से मापा हुआ; जहाँ कुछ दिखा नहीं वहाँ साफ़।",
      "analysed": "मापा हुआ, खाली जगहें भरी हुई।",
      "modelled": "मापों से चलाया गया मौसम का मॉडल, सीधी तस्वीर नहीं।"
    },
    "credit": "डेटा: {credit}, NASA GIBS के ज़रिए। डेटा का नक्शा, तस्वीर नहीं।",
    "wind": {
      "title": "हवा",
      "loading": "हवा का क्षेत्र माँग रहे हैं।",
      "failed": "हवा का क्षेत्र पहुँचा नहीं। गोला वैसा ही है जैसा था।",
      "what": "ज़मीन से दस मीटर ऊपर की हवा; रंग उसकी रफ़्तार है।",
      "dated": "पूर्वानुमान {date}, {time} UTC के लिए है।",
      "mean": "औसतन लगभग {mean} मी/सेकंड, ज़्यादा से ज़्यादा {max} तक।",
      "sped": "लकीरें एक सेकंड में {n} घंटे की हवा चलाती हैं।",
      "spedDay": "लकीरें एक सेकंड में एक दिन की हवा चलाती हैं।",
      "still": "हर लकीर बहाव का एक टुकड़ा है, ठहरा हुआ।",
      "credit": "डेटा: {credit}। मौसम का मॉडल, माप नहीं।"
    },
    "currents": {
      "title": "समुद्री धाराएँ",
      "loading": "समुद्री धाराएँ माँग रहे हैं।",
      "failed": "आज की समुद्री धाराएँ यहाँ नहीं हैं। गोला वैसा ही है जैसा था।",
      "what": "समुद्र की सतह की धाराएँ; रंग पानी का तापमान है।",
      "dated": "{date} को उपग्रहों के मापे समुद्र के उभार से गणना करके निकाला गया: स्थिर बहाव, ज्वार या हवा के बहाव के बिना, भूमध्य रेखा पर सबसे कम पक्का।",
      "tempDated": "तापमान {date} को मापा गया, खाली जगहें भरी हुई।",
      "tempMissing": "स्लेटी लकीर वह पानी है जिसका तापमान डेटा में नहीं है।",
      "sped": "लकीरें एक सेकंड में {n} दिन का बहाव चलाती हैं; लंबी लकीर तेज़ पानी है।",
      "spedHours": "लकीरें एक सेकंड में {n} घंटे का बहाव चलाती हैं; लंबी लकीर तेज़ पानी है।",
      "still": "हर लकीर बहाव का एक टुकड़ा है, ठहरा हुआ; लंबी लकीर तेज़ पानी है।",
      "credit": "डेटा: {credit}।"
    },
    "legendAria": "{title}, {low} से {high} {unit} तक",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "ये आकृतियाँ एक परंपरा हैं, जिन्हें हमने बनाया है; उनके कोनों पर तारे अपनी मापी हुई दूरियों पर हैं।",
    "lineSky": "ये आकृतियाँ एक परंपरा हैं, जिन्हें हमने बनाया है, उन तारों के ऊपर जैसे वे पृथ्वी से दिखते हैं।",
    "ecliptic": "टूटी लकीर क्रांतिवृत्त है, साल भर सूर्य का रास्ता।",
    "distance": "{n} प्रकाश-वर्ष",
    "namedDistance": "{name}, {n} प्रकाश-वर्ष"
  },
  "colourKey": {
    "title": "रंग इससे",
    "unknown": "इनके लिए पता नहीं",
    "scope": "यहाँ से जो बनाया गया है उसे गिनता है, उन परतों में जो चालू हैं।",
    "byLayer": "आकार वही है जो है; रंग उसकी परत का है।",
    "crewed": "इनमें से, इंसानों को ले जाने के लिए बने",
    "swarm": "इनमें से, किसी बड़े समूह के"
  },
  "trajectory": {
    "label": "इसका रास्ता, अगला डेढ़ चक्कर",
    "ariaLabel": "समय के साथ ऊँचाई, और सपाट नक्शे पर ज़मीनी रास्ता",
    "km": "{n} किमी",
    "now": "अभी",
    "laps": "डेढ़ चक्कर बाद",
    "north": "उ",
    "south": "द",
    "note": "बिंदु वाले उन्हीं तत्वों से गणना करके निकाला गया; नक्शा इसके ठीक नीचे की ज़मीन है।"
  },
  "timeFacts": {
    "label": "अगले 90 मिनट",
    "barLabel": "अगले 90 मिनट में धूप और छाया: {parts}",
    "barSunlit": "{mins} मिनट धूप में",
    "barShadow": "{mins} मिनट पृथ्वी की छाया में",
    "now": "अभी",
    "end": "+90 मिनट",
    "entersShadowIn": "{mins} में पृथ्वी की छाया में जाएगा",
    "entersSunlightIn": "{mins} में निकलकर धूप में आएगा",
    "entersShadowAt": "{time} पर पृथ्वी की छाया में जाएगा",
    "entersSunlightAt": "{time} पर निकलकर धूप में आएगा",
    "allSunlit": "अगले पूरे 90 मिनट धूप में",
    "allShadow": "अगले पूरे 90 मिनट पृथ्वी की छाया में",
    "minutes": "{n} मिनट",
    "underAMinute": "एक मिनट से कम",
    "lapIn": "यह चक्कर {mmss} में पूरा होगा",
    "lapAt": "यह चक्कर {time} पर पूरा होगा",
    "orbit": "प्रक्षेपण के बाद {n} वाँ चक्कर",
    "orbitNote": "अनुमान से: तत्वों के समय पर कैटलॉग की गिनती, और उसके बाद के चक्कर।",
    "launched": "{year} में प्रक्षेपित",
    "nowSunlit": "धूप में",
    "nowShadow": "पृथ्वी की छाया में",
    "shadowIn": "{mins} में छाया",
    "sunlightIn": "{mins} में धूप",
    "shadowAt": "{time} पर छाया",
    "sunlightAt": "{time} पर धूप",
    "lapEndsIn": "चक्कर {mmss} में खत्म",
    "lapEndsAt": "चक्कर {time} पर खत्म"
  },
  "train": {
    "label": "रेल की तरह",
    "oneOf": "एक साथ छोड़े गए {n} में से एक ({designator})।",
    "youLead": "यह आगे चलने वाला है।",
    "leads": "{name} आगे है; यह कतार में {position} है।",
    "stillRaising": "अब भी एक कतार में ऊपर चढ़ रहे हैं, लगभग {alt} किमी ऊपर — रोशनियों की वह लड़ी जिसकी लोग खबर देते हैं।",
    "spreadOut": "अब बिखर गए हैं, लगभग {alt} किमी ऊपर; आसमान में अब कतार नहीं रही।"
  },
  "aboard": {
    "label": "साथ सवार भी",
    "openTitle": "इसका कार्ड खोलें",
    "note": "इनका अपना कोई बिंदु नहीं है। ये ठीक वहीं हैं जहाँ यह अंतरिक्ष यान है, क्योंकि ये उससे कसे हुए हैं।",
    "backTitle": "इसे ले जाने वाले अंतरिक्ष यान का कार्ड खोलें"
  },
  "myth": {
    "label": "अक्सर कहा जाता है",
    "line": "{claim} — {correction}",
    "contested": "अक्सर कहा जाता है, और सचमुच विवाद में है: {claim} — {correction}"
  },
  "source": {
    "prefix": "स्रोत",
    "unknown": "स्रोत दर्ज नहीं",
    "fetched": "{age} पढ़ा"
  },
  "photo": {
    "title": "एक तस्वीर बनाएँ",
    "barLabel": "तस्वीर",
    "shapesLabel": "आकार",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "तस्वीर को {shape} में फ़्रेम करें",
    "caption": "कैप्शन",
    "captionTitle": "नाम, तारीख़ और पते वाली पट्टी",
    "save": "तस्वीर सहेजें",
    "saveTitle": "फ़्रेम के भीतर जो है उसे JPEG की तरह सहेजें",
    "saveTitlePng": "फ़्रेम के भीतर जो है उसे PNG की तरह सहेजें",
    "timeLabel": "समय",
    "earlier": "पहले",
    "later": "बाद में",
    "timeTitle": "{unit} के कदम से {dir}, जैसे टाइम पिल चलता है",
    "lens": "लेंस",
    "lensValue": "{n}°",
    "lensTitle": "दृश्य-क्षेत्र, {n} डिग्री। संकरा मतलब लंबा लेंस; चौड़ा ज़्यादा समेटता है",
    "png": "PNG",
    "pngTitle": "बिना क्वालिटी खोए सहेजें, बड़ी फ़ाइल में",
    "share": "साझा करें",
    "shareTitle": "तस्वीर को इस डिवाइस की शेयर शीट को सौंपें",
    "sharedSaved": "यह डिवाइस इसे साझा नहीं करेगा। तस्वीर सहेज ली गई",
    "done": "फ़ोटो मोड छोड़ें",
    "making": "तस्वीर बन रही है",
    "saved": "तस्वीर सहेज ली गई",
    "failed": "तस्वीर अभी बन नहीं सकी",
    "honesty": "मापी हुई जगहों से बनाई गई, तस्वीर नहीं"
  },
  "tonight": {
    "title": "आज रात",
    "placeGuess": "{place} के पास, आपके टाइम ज़ोन से लगाया अंदाज़ा",
    "placeSet": "{place} से",
    "placeMine": "आपकी जगह के पास से",
    "placeShared": "{place} से, आपके साथ साझा",
    "noPlace": "क्या गुज़र रहा है यह देखने के लिए अपनी जगह तय करें।",
    "coords": "{lat}, {lon}",
    "working": "आज रात के गुज़रने की गणना हो रही है…",
    "passLine": "{name} · {time} · {from} से {to}, सबसे ऊँचाई पर {fists} ({deg}°) · {mins} मिनट",
    "startsIn": "{countdown} में शुरू",
    "startsAt": "{time} पर शुरू",
    "upNow": "अभी ऊपर है, {dir} की ओर देखें",
    "showMe": "दिखाओ",
    "showMeTitle": "अपनी जगह से आसमान खोलें, उस तरफ़ मुँह करके जहाँ से यह उगता है",
    "guessCaveat": "आपकी जगह पर समय कुछ मिनट इधर-उधर हो सकता है।",
    "unitRises": "उगता है",
    "unitHigh": "सबसे ऊँचा",
    "unitLong": "मिनट दिखता है",
    "degrees": "{deg}°",
    "path": "{from} से {to}",
    "rowDetail": "{time} · {deg} ऊपर · {mins} मिनट",
    "nothingTonight": "आज रात कोई चमकीली चीज़ ऊपर से नहीं गुज़रती।",
    "nextPass": "अगला: {when} · {name}",
    "nothingAtAll": "तीन दिन तक कोई चमकीली चीज़ ऊपर से नहीं गुज़रती।",
    "darkFrom": "{time} से अँधेरा",
    "darkUntil": "{time} तक अँधेरा",
    "darkNow": "अभी अँधेरा है",
    "neverDark": "आज रात अँधेरा नहीं होता",
    "moonRises": "चंद्रमा {pct} %, {time} पर उगता है",
    "moonUp": "चंद्रमा {pct} %, अभी ऊपर",
    "moonDown": "चंद्रमा {pct} %, क्षितिज के नीचे",
    "more": "और गुज़रने",
    "fewer": "कम गुज़रने",
    "arcLabel": "आसमान में इसका रास्ता: {from} में उगता है, {deg}° सबसे ऊँचा, {to} में डूबता है",
    "cardinals": {
      "N": "उ",
      "E": "पू",
      "S": "द",
      "W": "प"
    },
    "best": {
      "title": "आज रात का सबसे अच्छा",
      "nothing": "आज रात कुछ खास नहीं दिखता।",
      "rowTitle": "इसे आसमान में दिखाएँ",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "परिमाण {mag}",
      "passAria": "{name}: {t0} {d0} पर दिखता है, {t1} पर {deg}° {d1} पर सबसे ऊँचा, {t2} {d2} पर गायब, परिमाण {mag}।",
      "fades": "डूबने से पहले यह पृथ्वी की छाया में फीका पड़ जाता है।",
      "appears": "यह कुछ ऊपर चढ़कर पृथ्वी की छाया से बाहर आता है।",
      "notVisible": "दिखाई नहीं देता: आसमान उजला है या यह छाया में है।",
      "rocket": "रॉकेट का हिस्सा · {name}",
      "debris": "मलबा · {name}",
      "planetLine": "सबसे अच्छा {time} · {deg}° ऊपर, {dir}",
      "moonTitle": "चंद्रमा · {phase} · {pct} %",
      "moonSets": "{time} पर डूबता है",
      "moonRises": "{time} पर उगता है",
      "moonAllNight": "सारी रात ऊपर",
      "phases": {
        "new": "अमावस्या",
        "waxingCrescent": "बढ़ता हँसिया",
        "firstQuarter": "पहली तिमाही",
        "waxingGibbous": "बढ़ता, आधे से ज़्यादा",
        "full": "पूर्णिमा",
        "waningGibbous": "घटता, आधे से ज़्यादा",
        "lastQuarter": "आख़िरी तिमाही",
        "waningCrescent": "घटता हँसिया"
      },
      "showerLine": "घंटे में {zhr} तक · सबसे अच्छा {time}, {dir}",
      "dsoLine": "सबसे अच्छा {time} · {deg}° ऊपर, {dir} · {how}",
      "dsoNeeds": {
        "eye": "आँख से",
        "binoculars": "दूरबीन से"
      },
      "view": "मेरा दृश्य",
      "viewHeight": "कितना ऊपर होना चाहिए",
      "facings": {
        "any": "चारों ओर",
        "n": "उत्तर",
        "e": "पूर्व",
        "s": "दक्षिण",
        "w": "पश्चिम"
      },
      "facingTitles": {
        "any": "पूरा आसमान",
        "n": "सिर्फ़ वह जो उत्तर में सबसे अच्छा है",
        "e": "सिर्फ़ वह जो पूर्व में सबसे अच्छा है",
        "s": "सिर्फ़ वह जो दक्षिण में सबसे अच्छा है",
        "w": "सिर्फ़ वह जो पश्चिम में सबसे अच्छा है"
      },
      "heights": {
        "0": "कोई भी ऊँचाई",
        "15": "15° से ऊपर",
        "30": "30° से ऊपर"
      },
      "viewNothing": "आज रात आसमान के उस हिस्से से कुछ नहीं गुज़रता।",
      "darkHours": "{from} से {to} तक अँधेरा",
      "moonless": "चंद्रमा नहीं, अँधेरी रात",
      "moonBright": "चंद्रमा {pct} % धुँधले तारों को छिपाता है",
      "moonFaint": "चंद्रमा {pct} %, थोड़ी रोशनी",
      "neverDark": "आज रात अँधेरा नहीं होता।",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "आपकी जगह के लिए गणना करके निकाला गया। चमक एक अनुमान है।"
    },
    "skybar": {
      "title": "आसमान",
      "field": "दृश्य-क्षेत्र",
      "fields": {
        "eye": "आँख",
        "binoculars": "दूरबीन",
        "telescope": "टेलीस्कोप"
      },
      "fieldNotes": {
        "eye": "उतना चौड़ा जितना आप देखते हैं। ज़ूम के लिए स्क्रॉल या पिंच करें।",
        "binoculars": "7° का क्षेत्र: ज़्यादा धुँधले तारे उभरते हैं।",
        "telescope": "1° का क्षेत्र: ग्रह गोलियाँ बन जाते हैं।"
      },
      "following": "{name} का पीछा कर रहे हैं। छोड़ने के लिए आसमान खींचें।",
      "followSet": "{name} डूब गया, इसलिए दृश्य ने उसे छोड़ दिया।",
      "show": "लकीरें और नाम",
      "toggles": {
        "figures": "आकृतियाँ",
        "names": "नाम",
        "art": "चित्र",
        "bounds": "सीमाएँ",
        "sunPath": "सूर्य का रास्ता",
        "equator": "भूमध्य रेखा",
        "grid": "जाल",
        "starGrid": "तारा-जाल",
        "meteors": "उल्काएँ",
        "trails": "पगडंडियाँ",
        "seeThrough": "पारदर्शी ज़मीन"
      },
      "toggleTitles": {
        "seeThrough": "ज़मीन को पारदर्शी बनाएँ, ताकि क्षितिज के नीचे की चीज़ें दिखें",
        "figures": "तारामंडलों की आकृतियाँ",
        "names": "तारामंडलों और चमकीले तारों के नाम",
        "sunPath": "वह रास्ता जिस पर सूर्य, चंद्रमा और ग्रह चलते हैं",
        "equator": "आसमान की भूमध्य रेखा, पृथ्वी की भूमध्य रेखा के ऊपर",
        "grid": "ऊँचाई और दिशा, उत्तर-दक्षिण रेखा के साथ",
        "starGrid": "वह जाल जिस पर तारे नापे जाते हैं",
        "art": "पश्चिमी आकृतियाँ चित्रों की तरह, Johan Meuris के बनाए",
        "bounds": "88 तारामंडलों की आधिकारिक सीमाएँ",
        "meteors": "आज रात सक्रिय उल्का वर्षाओं की लकीरें, आज रात की दर से",
        "trails": "हर चमकीले तारे का आख़िरी घंटा, लंबे एक्सपोज़र की तरह"
      },
      "time": "आसमान का समय",
      "timeNow": "अभी",
      "timeNowTitle": "वर्तमान पर वापस",
      "timeDusk": "शाम",
      "timeMidnight": "आधी रात",
      "timeDawn": "भोर",
      "timeTitles": {
        "dusk": "आज शाम सिविल गोधूलि का अंत",
        "midnight": "रात का बीच",
        "dawn": "सुबह सिविल गोधूलि की शुरुआत"
      },
      "timeStrip": "आसमान घुमाने के लिए खींचें",
      "timeTicks": {
        "dusk": "शाम",
        "midnight": "बीच",
        "dawn": "भोर"
      },
      "timeStripAria": "आसमान का समय: खींचें, या तीर वाली कुंजियाँ दबाएँ, हर कदम दस मिनट",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "दिन",
        "golden": "नीचा सूर्य",
        "civil": "सिविल गोधूलि",
        "nautical": "नॉटिकल गोधूलि",
        "astronomical": "आख़िरी गोधूलि",
        "night": "रात"
      },
      "timeFar": "आज से इतनी दूर कोई उपग्रह नहीं: उनकी कक्षाएँ पुरानी पड़ जाती हैं।",
      "eyepiece": "ऐपीस",
      "eyepieces": {
        "low": "कम · 1°",
        "medium": "मध्यम · 30′",
        "high": "ऊँचा · 12′"
      },
      "eyepieceTitles": {
        "low": "एक डिग्री का क्षेत्र: दो पूरे चाँद जितना चौड़ा",
        "medium": "आधा डिग्री: पूरा चंद्रमा",
        "high": "एक डिग्री का पाँचवाँ हिस्सा: ग्रह गोलियों की तरह"
      },
      "centre": "बीच में क्या है",
      "centreTitle": "बताएँ कि दृश्य का बीच किस पर है; Enter उसका कार्ड खोलता है",
      "con": {
        "kind": "तारामंडल",
        "label": "{name}, एक तारामंडल।",
        "inside": "{name} में"
      },
      "landscape": {
        "city": "क्षितिज-रेखा: किसी शहर की, बनाई हुई। आपकी गली नहीं।",
        "hills": "क्षितिज-रेखा: पहाड़ियाँ, बनाई हुई। आपकी अपनी नहीं।",
        "coast": "{dir} में समुद्र, पानी के नक्शे से। ज़मीन बनाई हुई।"
      },
      "artWesternOnly": "चित्र पश्चिमी आकृतियों के ही हैं",
      "culture": "किसका आसमान",
      "cultures": {
        "western": "पश्चिमी",
        "chinese": "चीनी",
        "maori": "माओरी",
        "hawaiian": "हवाई",
        "samoan": "सामोआई",
        "tongan": "टोंगा",
        "norse": "नॉर्स",
        "boorong": "बूरोंग"
      },
      "cultureNotes": {
        "western": "वे 88 तारामंडल जिन पर खगोलविद 1922 में सहमत हुए।",
        "chinese": "लगभग 300 छोटे तारा-समूह। एक जीवित आसमान को पढ़ने का एक तरीका।",
        "maori": "छह आकृतियाँ। नाम iwi-दर-iwi अलग होते हैं; आसमान जीवित है।",
        "hawaiian": "नाविकों की तारा-रेखाएँ, जिनसे आज भी दिशा साधी जाती है।",
        "samoan": "सामोआई लोककथाओं की चौदह आकृतियाँ। एक जीवित परंपरा।",
        "tongan": "टोंगा के तारा-रास्ते और आकृतियाँ। एक जीवित परंपरा।",
        "norse": "छह आकृतियाँ, नॉर्स आसमान का एक पुनर्निर्माण।",
        "boorong": "बूरोंग परिवार का आसमान, जैसा 1857 में बताया गया। आज भी जीवित।"
      },
      "cultureCredits": {
        "western": "चित्र: Johan Meuris, Stellarium के लिए, Free Art License। Carina, Puppis और Vela एक ही चित्र साझा करते हैं; Serpens का कोई नहीं है।",
        "chinese": "आकृतियाँ: Sun Shuwei और Karrie Berglund, Stellarium के लिए, CC BY-SA 4.0। एक दर्ज किया हुआ पुनर्निर्माण।",
        "maori": "आकृतियाँ: Dan Smale, Stellarium के लिए, CC BY-SA 4.0। एक दर्ज किया हुआ पुनर्निर्माण।",
        "hawaiian": "आकृतियाँ: Nainoa Thompson के अनुसार, Kamehameha Schools Kapālama द्वारा, Stellarium के लिए, CC BY-SA 4.0।",
        "samoan": "आकृतियाँ: Jake Fitisemanu, सामोआई संरक्षकों के साथ, Stellarium के लिए, CC BY-SA 4.0। एक दर्ज किया हुआ पुनर्निर्माण।",
        "tongan": "आकृतियाँ: Dan Smale, Stellarium के लिए, CC BY-SA 4.0। सीमित स्रोतों से एक दर्ज किया हुआ पुनर्निर्माण।",
        "norse": "आकृतियाँ: Jonas Persson, Stellarium के लिए, CC BY-SA 4.0। एक पुनर्निर्माण, कोई दस्तावेज़ नहीं।",
        "boorong": "आकृतियाँ: John Morieson और Alex Cherney, Stellarium के लिए, CC BY-SA 4.0। एक जीवित आसमान को पढ़ने का एक तरीका।"
      },
      "meteorNote": "{name}: इस आसमान में घंटे में लगभग {n}।",
      "meteorFew": "{name}: इस आसमान में घंटे में एक से कम।",
      "meteorDown": "{name}: उद्गम बिंदु नीचे है, कोई लकीर नहीं।",
      "meteorHonest": "आज रात की दर एक मॉडल है। लकीरें सांकेतिक हैं।",
      "meteorSporadic": "आज रात कोई उल्का वर्षा नहीं। प्रतिसूर्य स्रोत: घंटे में {n}।",
      "darkness": "आपका आसमान",
      "darknessModes": {
        "city": "शहर",
        "town": "कस्बा",
        "dark": "अँधेरी जगह"
      },
      "darknessAuto": "अपने आप",
      "darknessAutoTitle": "आपकी जगह की रात की रोशनियों से आसमान की किस्म पढ़ें",
      "darknessBy": {
        "place": "आपकी जगह पर NASA के रात की रोशनियों के नक्शे से अनुमान।",
        "reading": "आपकी जगह की रात की रोशनियाँ पढ़ रहे हैं।",
        "unread": "रात की रोशनियों का नक्शा पढ़ा नहीं जा सका: अपना आसमान खुद चुनें।",
        "trip": "सफ़र के इस पड़ाव ने इसे थाम रखा है।"
      },
      "darknessNotes": {
        "city": "शहर: परिमाण 4 तक के तारे, आकाशगंगा नहीं।",
        "town": "कस्बे का किनारा: परिमाण 5.3 तक के तारे।",
        "dark": "अँधेरी जगह: 6.5 तक के तारे और आकाशगंगा।"
      },
      "point": {
        "row": "अपना फ़ोन घुमाएँ",
        "on": "अपना फ़ोन घुमाएँ",
        "title": "फ़ोन ऊपर उठाएँ: दृश्य उसके साथ घूमता है",
        "note": "फ़ोन को आसमान की ओर उठाएँ और घूमें। दृश्य साथ चलेगा।",
        "noPlace": "आपकी जगह चाहिए, ताकि पता चले उत्तर किधर है।",
        "denied": "फ़ोन ने अपना मोशन सेंसर देने से मना कर दिया। खींचना अब भी चलता है।",
        "deniedHow": "इजाज़त देने के लिए: पन्ना फिर लोड करें, और पूछे जाने पर “इजाज़त दें” चुनें।",
        "none": "यहाँ किसी मोशन सेंसर ने जवाब नहीं दिया। खींचना अब भी चलता है।",
        "unsupported": "यह ब्राउज़र मोशन सेंसर नहीं देता। खींचना अब भी चलता है।",
        "lineUpWith": "आसमान ठीक नहीं बैठा? तब तक खींचें जब तक {name} सीध में न आ जाए।",
        "lineUpPlain": "आसमान ठीक नहीं बैठा? तब तक खींचें जब तक कोई चमकीला तारा सीध में न आ जाए।",
        "lined": "हाथ से सीध में लाया गया, कंपास से {n}° का फ़र्क।",
        "reset": "सीध वापस लें",
        "resetTitle": "कंपास के अपने उत्तर पर लौटें",
        "accuracy": "कंपास कहता है कि वह लगभग {n}° तक सही है।",
        "relative": "यहाँ कंपास नहीं है। उसे सीध में लाने के लिए आसमान खींचें।",
        "declination": "सच्चा उत्तर: कंपास {n}° {dir} की ओर सुधारा गया।",
        "east": "पूर्व",
        "west": "पश्चिम",
        "honest": "उत्तर फ़ोन के कंपास से है। पास की धातु उसे मोड़ देती है।"
      },
      "red": "लाल रोशनी",
      "redTitle": "पन्ने को लाल करें ताकि आँखें अँधेरे की आदी रहें",
      "honesty": "तारे मापे हुए, ग्रह गणना से निकाले, हवा मॉडल से, ज़मीन बनाई हुई।"
    }
  },
  "keyHint": {
    "title": "नियंत्रण",
    "titleTouch": "इशारे",
    "label": "दृश्य को हिलाने वाली कुंजियाँ",
    "labelTouch": "दृश्य को हिलाने वाले इशारे",
    "close": "बंद करें",
    "closeTitle": "बंद करें (Escape)",
    "does": {
      "turn": "घुमाएँ",
      "zoom": "पास, दूर",
      "pan": "बगल में खिसकाएँ",
      "pick": "कोई चीज़ चुनें",
      "search": "खोजें",
      "hide": "सब छिपाएँ",
      "show": "क्या दिखाएँ",
      "share": "साझा करें",
      "esc": "बंद करें",
      "keys": "सभी कुंजियाँ",
      "tripPlay": "चलाएँ, रोकें",
      "tripStep": "पीछे, आगे",
      "tripCard": "कार्ड छिपाएँ",
      "tripReplay": "दोबारा",
      "tripSound": "आवाज़",
      "tripLeave": "निकलें"
    },
    "how": {
      "drag": "खींचें",
      "wheel": "स्क्रॉल",
      "pinch": "पिंच",
      "two": "दो उँगलियाँ",
      "tap": "टैप"
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
    "labelAll": "कीबोर्ड शॉर्टकट",
    "tripTitle": "सफ़र में"
  },
  "render": {
    "eyebrow": "Space Radar · एक सफ़र",
    "site": "spaceradar.ai",
    "fly": "खुद उड़ाकर देखें",
    "music": "संगीत: John Bartmann, CC0। पूरा श्रेय spaceradar.ai पर।"
  },
  "glossary": {
    "title": "इस पन्ने के शब्द",
    "hint": "सीधे वाक्य के लिए किसी शब्द पर टैप करें।"
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} एक आग है जो अपनी आख़िरी रिपोर्ट, {date}, में यहाँ थी",
        "volcano": "{name} {date} से फट रहा है",
        "iceberg": "{name} अपनी आख़िरी रिपोर्ट, {date}, में यहाँ था"
      },
      "size": "उस रिपोर्ट में लगभग {n} किमी²"
    },
    "storm": {
      "lead": "{name} एक {a} {status} है जिसका केंद्र {ago} यहाँ था",
      "leadUnknown": "{name} एक उष्णकटिबंधीय चक्रवात है जिसका केंद्र {ago} यहाँ था",
      "leadBefore": "{name} एक {a} {status} है जिसका केंद्र {ago} यहाँ पहुँचता है",
      "leadBeforeUnknown": "{name} एक उष्णकटिबंधीय चक्रवात है जिसका केंद्र {ago} यहाँ पहुँचता है",
      "wind": "इसके रास्ते की सबसे तेज़ हवाएँ, पूर्वानुमान मिलाकर, {n} किमी/घंटा तक पहुँचती हैं",
      "statuses": {
        "hurricane": "हरिकेन",
        "typhoon": "टाइफ़ून",
        "cyclone": "उष्णकटिबंधीय चक्रवात",
        "storm": "उष्णकटिबंधीय तूफ़ान",
        "depression": "उष्णकटिबंधीय अवदाब"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} {dist} प्रकाश-वर्ष दूर एक ब्लैक होल है",
      "leadPulsar": "{name} {dist} प्रकाश-वर्ष दूर एक पल्सर है",
      "leadMagnetar": "{name} {dist} प्रकाश-वर्ष दूर एक मैग्नेटार है",
      "leadQuasar": "{name} {dist} प्रकाश-वर्ष दूर एक क्वेज़ार है",
      "leadStar": "{name} {dist} प्रकाश-वर्ष दूर एक तारा है",
      "leadRange": "{name} एक {a} {kind} है, जो {lo} और {hi} प्रकाश-वर्ष के बीच कहीं दूर है",
      "mass": "जिसका वज़न {n} सूर्यों के बराबर है",
      "massRange": "जिसका वज़न {lo} और {hi} सूर्यों के बीच है",
      "massMillions": "जिसका वज़न {n} मिलियन सूर्यों के बराबर है",
      "massBillions": "जिसका वज़न {n} अरब सूर्यों के बराबर है",
      "spins": "जो एक सेकंड में {n} बार घूमता है",
      "spinsSlow": "जो हर {n} सेकंड में एक बार घूमता है",
      "kinds": {
        "blackhole": "ब्लैक होल",
        "pulsar": "पल्सर",
        "magnetar": "मैग्नेटार",
        "star": "तारा",
        "quasar": "क्वेज़ार",
        "galaxy": "आकाशगंगा",
        "cluster": "आकाशगंगाओं का समूह",
        "browndwarf": "भूरा बौना",
        "whitedwarf": "श्वेत बौना"
      },
      "leadGalaxy": "{name} {dist} प्रकाश-वर्ष दूर एक आकाशगंगा है, जहाँ वह अभी है",
      "leadCluster": "{name} {dist} प्रकाश-वर्ष दूर आकाशगंगाओं का एक समूह है, जहाँ वह अभी है",
      "leadBrowndwarf": "{name} {dist} प्रकाश-वर्ष दूर एक भूरा बौना है",
      "leadWhitedwarf": "{name} {dist} प्रकाश-वर्ष दूर एक श्वेत बौना है"
    },
    "dso": {
      "leadHome": "{name} वह आकाशगंगा है जिसमें हम रहते हैं; इसका केंद्र {dist} प्रकाश-वर्ष दूर है",
      "lead": "{name} {dist} प्रकाश-वर्ष दूर एक {a} {type} है",
      "leadRange": "{name} एक {a} {type} है, जो {lo} और {hi} प्रकाश-वर्ष के बीच कहीं दूर है",
      "leadUntyped": "{name} {dist} प्रकाश-वर्ष दूर है",
      "size": "लगभग {n} प्रकाश-वर्ष चौड़ा",
      "seenAs": "वैसा दिखता है जैसा वह {n} साल पहले था",
      "seenAsMillions": "वैसा दिखता है जैसा वह {n} मिलियन साल पहले था",
      "constellation": "{con} में",
      "kinds": {
        "galaxy": "आकाशगंगा",
        "nebula": "नीहारिका",
        "cluster": "तारा-समूह",
        "other": "गहरे आकाश की चीज़"
      }
    },
    "exoplanet": {
      "lead": "{name} तारे {host} का चक्कर लगाने वाला ग्रह है, {dist} प्रकाश-वर्ष दूर",
      "leadNoHost": "{name} किसी दूसरे तारे का चक्कर लगाने वाला ग्रह है, {dist} प्रकाश-वर्ष दूर",
      "size": "पृथ्वी से लगभग {n} गुना चौड़ा",
      "sizeSmaller": "पृथ्वी की चौड़ाई का लगभग {n}",
      "mass": "पृथ्वी के द्रव्यमान का {n} गुना",
      "year": "इसका साल {n} दिन का होता है",
      "yearHours": "इसका साल {n} घंटे का होता है",
      "found": "{year} में {method} तरीके से खोजा गया",
      "foundYear": "{year} में खोजा गया",
      "asOf": "{date} तक के कैटलॉग की एक प्रति से"
    },
    "star": {
      "lead": "{name} {dist} प्रकाश-वर्ष दूर एक तारा है",
      "leadColour": "{name} {dist} प्रकाश-वर्ष दूर एक {a} {colour} तारा है",
      "near": "जो सबसे पास के तारों में से एक है",
      "seenAs": "वैसा दिखता है जैसा वह {n} साल पहले था",
      "seenAsMonths": "वैसा दिखता है जैसा वह {n} महीने पहले था",
      "luminosity": "जो सूर्य से {n} गुना ज़्यादा चमकता है",
      "dimmer": "जो सूर्य की चमक का {n} चमकता है",
      "colours": {
        "O": "नीला",
        "B": "नीला-सफ़ेद",
        "A": "सफ़ेद",
        "F": "पीला-सफ़ेद",
        "G": "पीला",
        "K": "नारंगी",
        "M": "लाल"
      }
    },
    "station": {
      "lead": "{name} पृथ्वी का चक्कर लगाता एक अंतरिक्ष स्टेशन है, जिस पर लोग रहते हैं",
      "whyPass": "जो {time} पर आपके आसमान से गुज़रता है",
      "crew": "जिस पर {crew} लोग सवार हैं",
      "altitude": "{alt} किमी ऊपर",
      "speed": "जो हर {period} मिनट में एक चक्कर लगाता है"
    },
    "satellite": {
      "lead": "{name} पृथ्वी का चक्कर लगाता एक उपग्रह है",
      "leadKind": "{name} पृथ्वी का चक्कर लगाता {kind} है",
      "leadDocked": "{name} {station} से जुड़ा {kind} है",
      "aSpacecraft": "एक अंतरिक्ष यान",
      "aTelescope": "एक अंतरिक्ष टेलीस्कोप",
      "whyLaunchedDays": "{n} दिन पहले छोड़ा गया",
      "whyLaunchedYear": "{year} में छोड़ा गया",
      "operator": "जिसे {operator} उड़ाता है",
      "purpose": "{purpose}",
      "altitude": "{alt} किमी ऊपर",
      "whyPass": "जो {time} पर आपके आसमान से गुज़रता है"
    },
    "debris": {
      "lead": "{name} मलबे का एक ट्रैक किया जा रहा टुकड़ा है",
      "origin": "जो {origin} से बचा हुआ है",
      "brokeUp": "जो {year} में टूट गया",
      "decay": "जिसके {date} के आसपास वायुमंडल में वापस गिरने की उम्मीद है",
      "altitude": "{alt} किमी ऊपर",
      "burnsUp": "जिसका लगभग सब कुछ नीचे आते हुए जल जाता है"
    },
    "rocket": {
      "lead": "{name} एक रॉकेट प्रक्षेपण है",
      "leadWithPad": "{name} {pad} से एक रॉकेट प्रक्षेपण है",
      "leadStage": "{name} पृथ्वी का चक्कर लगाता इस्तेमाल हो चुका रॉकेट का एक चरण है",
      "stageLaunched": "{year} में छोड़ा गया",
      "whyCountdown": "जो {when} उड़ान भरेगा",
      "whyFlown": "जिसने {when} उड़ान भरी",
      "destination": "जो {destination} की ओर जा रहा है",
      "missionType": "एक {missionType} मिशन",
      "illustrative": "यहाँ बनाया गया रास्ता चढ़ाई का एक खाका है, मापा हुआ रास्ता नहीं"
    },
    "probe": {
      "lead": "{name} सौरमंडल में दूर गया एक अंतरिक्ष यान है",
      "leadOrbits": "{name} {world} का चक्कर लगाता एक अंतरिक्ष यान है",
      "destination": "जो {destination} के रास्ते पर है",
      "lightTime": "इतनी दूर कि रेडियो संदेश को एक तरफ़ जाने में {mins} मिनट लगते हैं",
      "lightTimeSeconds": "इतने पास कि रेडियो संदेश को एक तरफ़ जाने में {secs} सेकंड लगते हैं",
      "lightTimeHours": "इतनी दूर कि रेडियो संदेश को एक तरफ़ जाने में {hours} घंटे लगते हैं",
      "distanceSun": "सूर्य से {au} खगोलीय इकाई दूर",
      "milestone": "जिसका {milestone} {date} को होना है"
    },
    "telescope": {
      "lead": "{name} एक अंतरिक्ष टेलीस्कोप है",
      "observing": "जो इस हफ़्ते {target} की ओर मुड़ा है",
      "station": "जो {station} पर टिका है",
      "altitude": "{alt} किमी ऊपर",
      "sees": "यह {band} में देखता है"
    },
    "asteroid": {
      "lead": "{name} पृथ्वी के पास की एक चीज़ है जो सूर्य के चारों ओर अपनी कक्षा में है",
      "leadMainBelt": "{name} मंगल और बृहस्पति के बीच की मुख्य पट्टी का एक क्षुद्रग्रह है",
      "leadBeyond": "{name} वरुण के पार का एक छोटा पिंड है, जो सूर्य के चारों ओर अपनी कक्षा में है",
      "leadDwarf": "{name} एक बौना ग्रह है जो सूर्य के चारों ओर अपनी कक्षा में है",
      "leadDwarfBelt": "{name} मंगल और बृहस्पति के बीच की क्षुद्रग्रह पट्टी का एक बौना ग्रह है",
      "leadDwarfBeyond": "{name} वरुण के पार एक बौना ग्रह है",
      "leadDwarfFarBeyond": "{name} वरुण से बहुत दूर के पार एक बौना ग्रह है",
      "leadInterstellarOut": "{name} किसी दूसरे तारे से आया था और सौरमंडल से बाहर जा रहा है",
      "leadInterstellarIn": "{name} किसी दूसरे तारे से आया था और सूर्य की ओर गिर रहा है",
      "distanceSun": "सूर्य से {au} खगोलीय इकाई दूर",
      "whyApproach": "{date} को पृथ्वी के पास से गुज़रेगा, चंद्रमा की दूरी का {ld} गुना दूर से",
      "size": "{size}",
      "willNotHit": "यह पृथ्वी से नहीं टकराएगा"
    },
    "comet": {
      "lead": "{name} एक धूमकेतु है जो सूर्य के चारों ओर लंबे चक्कर में है",
      "leadPeriodic": "{name} एक धूमकेतु है जो हर {n} साल में सूर्य का चक्कर लगाकर लौटता है",
      "leadInterstellarOut": "{name} किसी दूसरे तारे से आया धूमकेतु है, जो सौरमंडल से बाहर जा रहा है",
      "leadInterstellarIn": "{name} किसी दूसरे तारे से आया धूमकेतु है, जो सूर्य की ओर गिर रहा है",
      "whyPerihelion": "{date} को सूर्य के सबसे पास",
      "nakedEye": "इतना चमकीला कि बिना टेलीस्कोप के ढूँढा जा सके",
      "faint": "बिना टेलीस्कोप के देखने के लिए बहुत धुँधला",
      "distanceSun": "{au} खगोलीय इकाई दूर"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} उन अजीब चीज़ों में से एक है जिन्हें लोगों ने धरती से बाहर भेजा"
    },
    "site": {
      "lead": "{name} ज़मीन पर वह जगह है जो अंतरिक्ष यानों के साथ काम करती है",
      "leadKind": "{name} एक {a} {kind} है",
      "where": "{where} में",
      "whyDsn": "जो अभी {spacecraft} से बात कर रहा है",
      "whyLaunch": "जहाँ {launch} {when} होना है",
      "mpc": "इसका Minor Planet Center कोड {code} है",
      "closed": "{year} में बंद हुआ",
      "kinds": {
        "pad": "लॉन्च पैड",
        "dish": "रेडियो डिश",
        "observatory": "वेधशाला",
        "tracking": "ट्रैकिंग स्टेशन",
        "launch-site": "प्रक्षेपण स्थल",
        "landing-site": "उतरने की जगह"
      }
    },
    "shower": {
      "lead": "{name} एक उल्का वर्षा है",
      "peak": "जो {date} के आसपास चरम पर होती है",
      "speed": "जिसकी उल्काएँ हवा से {n} किमी प्रति सेकंड की रफ़्तार से टकराती हैं",
      "parent": "जो {parent} की धूल से बनती है"
    },
    "world": {
      "lead": "{name} सौरमंडल की एक दुनिया है",
      "leadMoon": "{name} पृथ्वी का अपना चंद्रमा है",
      "leadSun": "{name} सौरमंडल के केंद्र का तारा है",
      "distanceKm": "{n} किमी दूर",
      "whyPhase": "आज रात {phase}",
      "whyRise": "जो आपकी जगह से {time} पर उगता है",
      "distance": "{distance}",
      "diameter": "लगभग {n} किमी चौड़ा",
      "leadWhat": "{name} {what} है",
      "what": {
        "pluto": "वरुण के पार एक बौना ग्रह, जिसे 2006 तक नौवाँ ग्रह गिना जाता था",
        "io": "बृहस्पति के चार बड़े चंद्रमाओं में से एक, और सौरमंडल की सबसे ज़्यादा ज्वालामुखी वाली दुनिया",
        "europa": "बृहस्पति के चार बड़े चंद्रमाओं में से एक, जिसकी बर्फ़ के नीचे खारे पानी का समुद्र है",
        "ganymede": "बृहस्पति का सबसे बड़ा चंद्रमा और सौरमंडल का भी सबसे बड़ा, बुध से भी बड़ा",
        "callisto": "बृहस्पति के चार बड़े चंद्रमाओं में से एक, और सौरमंडल की सबसे ज़्यादा गड्ढों वाली चीज़",
        "titan": "शनि का सबसे बड़ा चंद्रमा, मोटी नारंगी धुंध के नीचे, मीथेन की झीलों के साथ; Huygens 2005 में वहाँ उतरा था",
        "enceladus": "शनि का एक छोटा बर्फ़ीला चंद्रमा, जिसके गीज़र उसकी बर्फ़ के नीचे के समुद्र को अंतरिक्ष में उछाल देते हैं",
        "triton": "वरुण का सबसे बड़ा चंद्रमा; यह उलटी दिशा में चक्कर लगाता है और शायद कुइपर पट्टी से पकड़ी गई चीज़ है",
        "charon": "प्लूटो का सबसे बड़ा चंद्रमा, प्लूटो के आधे आकार का; दोनों हमेशा एक-दूसरे को एक ही चेहरा दिखाते हैं",
        "phobos": "मंगल के दो चंद्रमाओं में बड़ा, एक ऊबड़-खाबड़ चट्टान जो हर सदी में 1.8 मीटर मंगल की ओर सरक रही है",
        "deimos": "मंगल के दो चंद्रमाओं में छोटा, गड्ढों से ढकी एक छोटी ऊबड़-खाबड़ चट्टान",
        "mimas": "शनि का सबसे भीतरी गोल चंद्रमा, जिस पर एक गड्ढा है जो चंद्रमा की चौड़ाई का एक तिहाई है",
        "tethys": "शनि का पाँचवाँ सबसे बड़ा चंद्रमा, लगभग शुद्ध पानी की बर्फ़, जो एक खाई और एक विशाल गड्ढे से फटा हुआ है",
        "dione": "शनि का एक बर्फ़ीला चंद्रमा, जिसका पिछला हिस्सा चमकीली बर्फ़ की चट्टानों के जाल से भरा है",
        "rhea": "शनि का दूसरा सबसे बड़ा चंद्रमा, बर्फ़ और चट्टान की जमी हुई गंदी बर्फ़ की गेंद",
        "iapetus": "शनि का तीसरा सबसे बड़ा चंद्रमा: एक तरफ़ कोयले जैसा काला, दूसरी तरफ़ दस गुना ज़्यादा चमकीला",
        "miranda": "अरुण के पाँच बड़े चंद्रमाओं में सबसे छोटा, जिसकी घाटियाँ ग्रैंड कैन्यन की गहराई से 12 गुना तक गहरी हैं",
        "ariel": "अरुण के पाँच बड़े चंद्रमाओं में सबसे चमकीला और सबसे नया दिखने वाला, दरार वाली घाटियों से कटा हुआ",
        "umbriel": "अरुण के बड़े चंद्रमाओं में सबसे काला, जो अपने तक पहुँची रोशनी का लगभग पाँचवाँ हिस्सा लौटाता है",
        "titania": "अरुण का सबसे बड़ा चंद्रमा, सादा स्लेटी, लगभग 1 600 किमी लंबी दरार वाली घाटियों से फटा हुआ",
        "oberon": "अरुण का दूसरा सबसे बड़ा चंद्रमा, काला, गड्ढों वाला, और 6 किमी ऊँचे एक पहाड़ को ढोता हुआ"
      }
    }
  },
  "live": {
    "label": "अभी पृथ्वी से",
    "km": "किमी",
    "light": "रोशनी को लगता है",
    "lightYears": "प्रकाश-वर्ष",
    "noteFar": "बनाई गई जगह से गणना करके निकाला, तीन अंकों तक। यह टिक-टिक नहीं करता।",
    "note": "बनाई गई कक्षा से गणना करके निकाला। आख़िरी अंक इसका चलना दिखाते हैं, किलोमीटर तक इसकी जगह नहीं।",
    "seconds": "{s} सेकंड",
    "minSec": "{min} मिनट {s} सेकंड",
    "hourMinSec": "{h} घंटे {min} मिनट {s} सेकंड",
    "sparkLabel": "पृथ्वी से दूरी",
    "sparkAria": "{from} से {to} तक पृथ्वी से दूरी। {closest}",
    "sparkNow": "अभी",
    "closest": "सबसे पास: {date} · {dist}",
    "closestAbout": "सबसे पास: लगभग {date} · {dist}",
    "months": [
      "जन.",
      "फ़र.",
      "मार्च",
      "अप्रैल",
      "मई",
      "जून",
      "जुलाई",
      "अग.",
      "सित.",
      "अक्तू.",
      "नव.",
      "दिस."
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "घड़ी को इस सबसे पास के गुज़रने पर ले जाएँ",
    "moonDistances": "चंद्रमा की {n} दूरियाँ",
    "au": "{n} AU",
    "sparkNote": "बनाई गई कक्षा से गणना करके निकाला, हर छह दिन पर एक बिंदु।",
    "sparkApprox": "इतने पास तारीख़ और दूरी लगभग की हैं: पृथ्वी का खिंचाव छोड़ दिया गया है।",
    "upYears": "{n} साल से ऊपर: {date} को छोड़ा गया",
    "upOneYear": "1 साल से ऊपर: {date} को छोड़ा गया",
    "upUnderAYear": "एक साल से कम से ऊपर: {date} को छोड़ा गया",
    "upSinceYear": "{year} में छोड़ा गया: लगभग {n} साल से ऊपर",
    "upSinceYearNew": "{year} में छोड़ा गया",
    "smallBodyHonest": "समुद्र-तल के क्षितिज के लिए इसकी कक्षा से गणना करके निकाला। ऊपर होने का मतलब देखने जितना चमकीला होना नहीं है: ज़्यादातर के लिए टेलीस्कोप चाहिए।"
  },
  "crew": {
    "label": "सवार लोग",
    "count": "{n} लोग सवार",
    "countOne": "1 व्यक्ति सवार",
    "hint": "{n} सवार",
    "person": "{agency} · {days} दिन से ऊपर",
    "personNoAgency": "{days} दिन से ऊपर",
    "dockedLabel": "अभी जुड़े हैं, और कब से",
    "docked": "{port} · {date}",
    "asOf": "Launch Library 2 (The Space Devs) से {age} पढ़ा गया।",
    "stale": "{date} को पढ़ा गया: दो दिन से पुराना, इसलिए बदल गया हो सकता है।",
    "joined": "नाम उन यानों के दल के हैं जो अभी जुड़े हैं।",
    "unmatched": "दर्ज नाम इस गिनती से मेल नहीं खाए, इसलिए कोई नहीं दिखाया गया।",
    "waiting": "दल की सूची पढ़ रहे हैं।",
    "none": "इस स्टेशन के लिए दल की कोई सूची नहीं।"
  },
  "happened7": {
    "launchesFrom": "{place} से",
    "reached": "कक्षा में पहुँचा",
    "failed": "कक्षा में नहीं पहुँचा",
    "partial": "कक्षा में पहुँचा, पर उस कक्षा में नहीं जो तय थी",
    "launchDetail": "{rocket}: {status}, {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "{date} को नीचे आ गिरा (कैटलॉग की गिरने की तारीख़)",
    "debris": "और मलबे के {n} टुकड़े",
    "debrisOne": "और मलबे का 1 टुकड़ा",
    "showAll": "सभी {n} दिखाएँ",
    "showFewer": "कम दिखाएँ",
    "asOf": "प्रक्षेपण Launch Library 2 से {age} पढ़े गए।",
    "stale": "प्रक्षेपण {date} को पढ़े गए: दो दिन से पुराने।",
    "none": "पिछले सात दिनों का कुछ दर्ज नहीं।",
    "waiting": "जो हुआ वह पढ़ रहे हैं।",
    "decays": "जो नीचे आ गिरा",
    "decaysTitle": "पूरा कैटलॉग पढ़ता है, लगभग 1.5 MB",
    "decaysNone": "पिछले सात दिनों में कोई साबुत चीज़ नीचे नहीं आई।",
    "decaysFailed": "कैटलॉग पढ़ा नहीं जा सका।",
    "flyTitle": "वहाँ उड़ें जहाँ से यह छोड़ा गया था",
    "ago": "{age}"
  },
  "oldest": {
    "label": "सबसे लंबे समय से ऊपर",
    "row": "{years} साल · {date} को छोड़ा गया",
    "note": "अब भी कक्षा में मौजूद पेलोड और रॉकेट के हिस्से, कैटलॉग की प्रक्षेपण तारीख़ के हिसाब से।",
    "showTitle": "इसे नक्शे पर दिखाएँ"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "{publisher} का अपना पन्ना नए टैब में खोलता है"
  },
  "placeKeep": {
    "group": "आप कहाँ हैं",
    "change": "जगह बदलें",
    "changeTitle": "कोई शहर, या वह जगह जो ब्राउज़र बताता है कि आप हैं",
    "remember": "यह जगह याद रखें",
    "rememberTitle": "इसे सिर्फ़ इसी ब्राउज़र में रखता है, 0.1° तक",
    "forget": "यह जगह भूल जाएँ",
    "forgetTitle": "इस ब्राउज़र में रखी जगह हटा देता है",
    "kept": "सिर्फ़ इसी ब्राउज़र में रखा है।",
    "share": "यह जगह साझा करें",
    "shareTitle": "एक लिंक कॉपी करता है जिसमें यह जगह 0.1° तक होती है",
    "copied": "लिंक कॉपी हो गया। इसमें यह जगह 0.1° तक है।",
    "copyFailed": "लिंक कॉपी नहीं हो सका।"
  },
  "scale": {
    "least": "ग्रह कम से कम ×{n} बड़े बनाए गए",
    "one": "{name} ×{n} बड़ा बनाया गया",
    "title": "बिंदु ग्रहों से चौड़े हैं। असली आकार के लिए दबाएँ।",
    "trueLine": "असली आकार: {name} यहाँ {px} px चौड़ा है",
    "trueTitle": "सबसे चौड़ा ग्रह, बिंदुओं को हटाकर। उन्हें फिर बनाने के लिए दबाएँ।"
  },
  "launchChip": {
    "opens": "इसका कार्ड खोलने के लिए दबाएँ",
    "train": "{n} की नई Starlink रेल, {when} आपके ऊपर"
  },
  "welcome": {
    "label": "पहली बार",
    "title": "पहली बार यहाँ",
    "dots": "हर बिंदु एक असली चीज़ है। किसी को दबाएँ।",
    "move": "घुमाने के लिए खींचें। पास जाने के लिए स्क्रॉल करें।",
    "moveTouch": "घुमाने के लिए खींचें। पास जाने के लिए पिंच करें।",
    "trips": "गाइड वाला सफ़र मिनटों में एक कहानी है।",
    "trip": "गाइड वाला सफ़र",
    "tripTitle": "सूची का पहला सफ़र शुरू करता है",
    "look": "इधर-उधर देखें",
    "lookTitle": "ये पंक्तियाँ हटा देता है"
  },
  "opening": {
    "label": "शुरुआत",
    "from": "कहाँ से",
    "wait": "सफ़र तैयार हो रहा है",
    "skip": "कोई भी कुंजी या दबाना इसे छोड़ देता है"
  },
  "base": {
    "label": "बेस पर लौटें",
    "title": "बेस पर लौटें: पृथ्वी, अभी, कुछ चुना हुआ नहीं",
    "name": "base",
    "trip": "सफ़र छोड़कर बेस पर लौटें"
  },
  "exoface": {
    "tag": "कलाकार की कल्पना",
    "measured": "मापा हुआ: {parts}।",
    "estimated": "अनुमान: {parts}।",
    "least": "कम से कम {n} पृथ्वी के द्रव्यमान।",
    "radius": "{n} पृथ्वी की त्रिज्याएँ",
    "mass": "{n} पृथ्वी के द्रव्यमान",
    "a": "एक",
    "an": "एक",
    "yearHours": "{a} {n} घंटे का साल",
    "yearDays": "{a} {n} दिन का साल",
    "yearYears": "{n} साल का एक चक्कर",
    "join": ", ",
    "missing": "—",
    "surface": "सतह कल्पना की गई है।",
    "clouds": "बादलों की चोटियाँ कल्पना की गई हैं।",
    "nothingMeasured": "यहाँ कुछ भी मापा हुआ नहीं है।",
    "whole": "पूरी दुनिया कल्पना की गई है।",
    "imaginedName": "कल्पना की गई दुनिया क्र. {n}",
    "another": "दूसरी दुनिया",
    "back": "नक्शे पर वापस",
    "stageLabel": "कल्पना की गई एक दुनिया",
    "why": "{cls} की तरह बनाया गया, {climate}: गणना से निकाला, देखा नहीं।",
    "whyGiant": "{cls} की तरह बनाया गया: इसके आकार से गणना करके निकाला, देखा नहीं।",
    "cls": {
      "rock": "एक पथरीली दुनिया",
      "superEarth": "एक सुपर-अर्थ",
      "water": "एक पानी वाली दुनिया",
      "miniNeptune": "एक मिनी-नेप्च्यून",
      "iceGiant": "एक बर्फ़ीला दानव",
      "gasGiant": "एक गैसीय दानव"
    },
    "climate": {
      "lava": "अपने तारे के नीचे पिघली हुई",
      "desert": "गर्म और सूखी",
      "temperate": "समुद्रों के लिए काफ़ी नरम",
      "snowball": "जमकर बर्फ़ हुई",
      "eyeball": "एक चेहरा हमेशा अपने तारे की ओर"
    }
  },
  "deep": {
    "inside": "{parent} के भीतर",
    "companion": "{parent} का साथी",
    "kinds": {
      "HII": "उत्सर्जन नीहारिका",
      "PN": "ग्रहीय नीहारिका",
      "SNR": "सुपरनोवा अवशेष",
      "RfN": "परावर्तन नीहारिका",
      "DrkN": "काली नीहारिका",
      "GCl": "गोलाकार तारा-समूह"
    },
    "back": "{parent} पर वापस",
    "backTitle": "उसके चारों ओर के {parent} तक बाहर उड़ें"
  },
  "deepHelix": {
    "card": {
      "helix": "इसकी रोशनी ESO की तस्वीर से ली गई है, इसका आकार O’Dell, McCullough और Meixner (2004) से: 23° झुकी भीतरी डिस्क और 53° झुका बाहरी छल्ला। गाँठें अपनी मापी हुई दूरियों पर रखी गई हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "how": "Hubble और ज़मीन के टेलीस्कोप दो दीर्घवृत्त दिखाते हैं, 499″ गुणा 459″ और 742″ गुणा 446″। तिरछे देखे गए वृत्त मानें तो ये 23° और 53° झुके दो छल्ले हैं, और गाँठों की हमारी ओर और हमसे दूर की रफ़्तारें बताती हैं कि हर छल्ले का कौन सा हिस्सा पास है (O’Dell, McCullough और Meixner 2004)।"
  },
  "deepLmc": {
    "card": {
      "lmc": "यह मॉडल इसकी तस्वीर और Gaia की इसके अपने तारों की गिनती से बना है, नापे गए झुकाव के साथ।"
    },
    "rows": {
      "dso-lmc": [
        [
          "इसके तारों की गहराई",
          "तारे-दर-तारे मापी नहीं गई: इतनी दूरी पर किसी तारे का लंबन बहुत छोटा होता है। मॉडल इसके तारों को डिस्क की ज्ञात मोटाई में फैलाता है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "LMC के भीतर गहराई",
          "मापी नहीं गई: इसे LMC की दूरी पर, इसकी अपनी दिशा में बनाया गया है। झुकी डिस्क पर यह लगभग 2 000 प्रकाश-वर्ष और पास हो सकता है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "देखे जा सकने वाले ब्रह्मांड का किनारा",
    "horizonNow": "अब लगभग {n} अरब प्रकाश-वर्ष दूर",
    "horizonWhy": "इसकी रोशनी {age} अरब साल पहले चली थी; तब से अंतरिक्ष खिंच चुका है",
    "edge": "{n} अरब प्रकाश-वर्ष: हर उस चीज़ के पार जो हम देख सकते हैं",
    "edgeWhy": "देखा जा सकने वाला ब्रह्मांड लगभग {h} अरब प्रकाश-वर्ष दूर खत्म होता है।",
    "edgeNothing": "यहाँ बाहर कुछ भी मापा हुआ नहीं है: यह पट्टी एक चित्र है।",
    "cmbTitle": "सबसे पुरानी रोशनी, जैसा हमारा आसमान उसे दिखाता है",
    "cmbWhen": "यह बिग बैंग के लगभग {k} साल बाद निकली थी",
    "cmbPainted": "उस गोले के भीतर रंगी गई जहाँ से यह निकली: एक चित्र",
    "cmbElse": "कहीं और से देखें तो नक्शा अलग होगा",
    "cmbCold": "−{n} µK",
    "cmbMid": "औसत {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "रंग का पैमाना: नीला {t} केल्विन से डिग्री के {n} दस-लाखवें हिस्से तक ठंडा, नारंगी उतना ही गर्म",
    "cmbSource": "WMAP का नौ साल का नक्शा, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "इसकी रोशनी ESO की तस्वीर से ली गई है, इसका आकार Wen और O’Dell (1995) तथा O’Dell (2001) के बाद फिर से बनाया गया: एक काले बादल के पास वाले चेहरे पर चमकती पतली परत, और Trapezium उसके लगभग 0.2 पारसेक सामने। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-m42": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। Trapezium के पास यह मापा हुआ है: चमकती परत उसके सबसे चमकीले तारे के लगभग 0.2 पारसेक पीछे है। और दूर गहराई उस प्रकाशित चित्र के अनुसार है जिसमें एक कटोरा हमारी ओर खुलता है, माप के अनुसार नहीं।"
        ],
        [
          "इसके पीछे",
          "काला आणविक बादल जिसमें से यह नीहारिका तराशी गई है। पीछे से देखें तो नीहारिका उसमें छिपी है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-m43": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित: उसी बादल पर एक छोटा गड्ढा, जो तारे NU Orionis से रोशन है। इसकी गहराई मापी नहीं गई।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "नीहारिका की दमक एक पतली परत से आती है जहाँ Trapezium के सबसे चमकीले तारे की रोशनी एक काले बादल में घुसती है। Wen और O’Dell (1995) ने नापा कि वह परत तारे के पीछे कितनी दूर है, उसकी चमक से, क्योंकि उसका पास का हिस्सा ज़्यादा रोशनी पाता है।"
  },
  "r12Truth": {
    "here": "इस कार्ड पर",
    "words": "शब्द, हर जगह",
    "terms": "इस कार्ड के शब्द",
    "rows": {
      "where": "यह कहाँ है",
      "drawnNow": "अभी बनाया गया",
      "drawn": "क्या बनाया गया है",
      "photo": "तस्वीर किसकी",
      "filters": "फ़िल्टर",
      "colours": "रंग",
      "taken": "ली गई",
      "released": "प्रकाशित",
      "sky": "दिखाया गया आसमान",
      "survey": "सर्वे किसका",
      "look": "रूप"
    },
    "span": "{a} से {b}",
    "notPublished": "तारीख़ प्रकाशित नहीं",
    "position": {
      "measured": "किसी उपकरण ने ज्ञात समय पर देखा",
      "inferred": "पुराने माप से आगे बढ़ाकर निकाला",
      "illustrative": "विचार दिखाने के लिए बनाया, मापा हुआ नहीं",
      "sample": "साथ आया नमूना डेटा, लाइव नहीं"
    },
    "drawn": {
      "photograph": "असली रोशनी, हमारी तरफ़ से खींची गई",
      "reconstruction": "एक प्रकाशित अध्ययन से 3D आकार",
      "model": "इसी तरह की चीज़ का मॉडल, इसके अपने तारे नहीं",
      "catalogue": "सर्वे में मापी गई जगहें",
      "illustration": "इसकी किस्म दिखाने के लिए बनाया, इसे नहीं"
    },
    "colours": {
      "broadband": "चौड़े रंग-फ़िल्टर",
      "mixed": "रंग-फ़िल्टर और हाइड्रोजन",
      "narrowband": "गैसों को रंगों में बैठाया गया",
      "unstated": "बताया नहीं गया"
    },
    "falseColour": "{band}, झूठे रंगों में",
    "glossary": [
      {
        "term": "पारसेक",
        "match": [
          "kpc"
        ],
        "say": "लगभग 3.26 प्रकाश-वर्ष: वह दूरी जिससे पृथ्वी की कक्षा एक आर्कसेकंड चौड़ी दिखे। शोध-पत्र pc लिखते हैं, और हज़ार के लिए kpc।"
      },
      {
        "term": "मिलियन प्रकाश-वर्ष",
        "match": [
          "मिलियन साल पहले"
        ],
        "say": "दस लाख प्रकाश-वर्ष, Mly लिखा जाता है। पास की सबसे बड़ी आकाशगंगा एंड्रोमेडा लगभग 2.5 मिलियन दूर है।"
      },
      {
        "term": "अरब प्रकाश-वर्ष",
        "match": [
          "अरब साल पहले"
        ],
        "say": "सौ करोड़ प्रकाश-वर्ष, Gly लिखा जाता है। जो हम देख सकते हैं उसका किनारा अब लगभग 46 अरब प्रकाश-वर्ष दूर है।"
      },
      {
        "term": "बीते समय की दूरी",
        "match": [
          "रोशनी इसे छोड़कर"
        ],
        "say": "हम जो रोशनी देखते हैं वह किसी चीज़ से कितने समय पहले चली थी। दूर की आकाशगंगाओं से यह अरबों साल है: हम उन्हें वैसा देखते हैं जैसी वे तब थीं।"
      },
      {
        "term": "सहगामी दूरी",
        "match": [
          "comoving",
          "अरब प्रकाश-वर्ष"
        ],
        "say": "कोई चीज़ अब कितनी दूर है, यह गिनकर कि उसकी रोशनी चलने के बाद से अंतरिक्ष कितना खिंच चुका है। बहुत दूर यह रोशनी के सफ़र के समय से सुझाई दूरी से ज़्यादा होती है।"
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "{mode} रूप"
  },
  "r12Sun": {
    "image": "सूर्य का जो आधा हिस्सा पृथ्वी की ओर था, वह Solar Dynamics Observatory की {date} को {time} UTC पर ली तस्वीर है, जिसे तब से सूर्य के साथ घुमाया गया है: {wl} ऐंगस्ट्रॉम पर चरम पराबैंगनी रोशनी, सतह के ऊपर के लूपों में लगभग दस लाख डिग्री की गैस से, SDO के झूठे रंग में और ज़्यादा चमकीली बनाई गई। दूर वाला हिस्सा, जिसे उसने नहीं देखा, उसी झूठे रंग में एक मॉडल से बनाया गया है, और जहाँ दोनों मिलते हैं वहाँ घुलाए गए हैं। यह देखने भर की तस्वीर है, विज्ञान के काम की नहीं। NASA/SDO और AIA, EVE तथा HMI विज्ञान दलों के सौजन्य से।",
    "loops": "आज के {n} सक्रिय क्षेत्रों के ऊपर के सुनहरे लूप सांकेतिक हैं: उनकी जगहें NOAA की हैं, उनके आकार, ऊँचाइयाँ और संख्या नहीं। “मापा हुआ” में वे हटा दिए जाते हैं।",
    "loopsOne": "आज के एक सक्रिय क्षेत्र के ऊपर के सुनहरे लूप सांकेतिक हैं: जगह NOAA की है, आकार, ऊँचाइयाँ और संख्या नहीं। “मापा हुआ” में वे हटा दिए जाते हैं।",
    "none": "आज के सूर्य की कोई तस्वीर पढ़ी नहीं जा सकी, इसलिए पूरी डिस्क बनाई गई है।"
  },
  "r12Nearby": {
    "castShadows": "इसकी छायाएँ ज़मीन की अपनी ऊँचाइयों से पड़ती हैं, {title} से, जहाँ सूर्य अभी है और असली पैमाने पर: मापा हुआ, ज़्यादा से ज़्यादा हर 670 मीटर पर एक ऊँचाई, इसलिए लगभग दो किलोमीटर से छोटा गड्ढा कोई छाया नहीं डालता।",
    "sunriseModelled": "सूर्योदय और सूर्यास्त पर इसका रंग मॉडल से बनाया गया है: धूप जो छूकर गुज़री हवा से लाल हो गई, सिर्फ़ रेले प्रकीर्णन।"
  },
  "r12Giants": {
    "spot": "एक को छोड़कर: विशाल लाल धब्बा {l2}° सिस्टम II देशांतर पर रखा गया है, जिसे वहाँ से आगे बढ़ाया गया है जहाँ JUPOS दल और British Astronomical Association ने इसे {date} को मापा था ({at}°), महीने में {rate}° की दर से, उस साल उनके मापे दो बहावों ({lo} और {hi}) के बीच की दर से, इसलिए अब यह दोनों तरफ़ {pm}° इधर-उधर हो सकता है। नक्शे को घुमाकर इसे वहाँ रखा गया है, और उसके बाकी बादल उसके साथ घूमते हैं।",
    "rings": {
      "uranus": "इसके छल्ले अपनी मापी हुई दूरियों पर हैं और उतने ही काले जितने वे हैं: उनके कण रोशनी का लगभग 1.5 % लौटाते हैं, जो इसके बादलों का तीसवाँ हिस्सा है, इसलिए ग्रह के सामने वे काले धागे हैं; उन्हें असली से 10 गुना चौड़ा बनाया गया है ताकि वे दिखें, और “गहरा” एक्सपोज़र उन्हें 4 गुना उभारता है, जैसा लंबा एक्सपोज़र करता है",
      "jupiter": "इसका धुँधला छल्ला उन दूरियों और प्रकाशीय गहराइयों पर है जो NASA की फ़ैक्ट शीट देती है: प्रभामंडल और मुख्य छल्ला, धूल और काले कण जो रोशनी का बस कुछ दस-लाखवाँ हिस्सा रोकते हैं; इनके पार के दो और धुँधले महीन छल्ले नहीं बनाए गए। सूर्य की ओर से यह लगभग कुछ नहीं है; सूर्य पीछे हो तो धूल रोशनी को आगे फेंकती है और यह दिखता है, जैसा रात वाले हिस्से से Galileo और New Horizons को दिखा। बिल्कुल दिखाने के लिए इसे कैमरा एक्सपोज़र में असली से 8 000 गुना और “गहरा” में 40 000 गुना चमकीला बनाया गया है; “आँख” में यह नहीं बनाया जाता, यानी आँख को यह ऐसा ही दिखेगा, और सबसे कम क्वालिटी पर भी नहीं। प्रभामंडल लगभग 10 000 किमी मोटा है और सपाट बनाया गया है, उतना ही चमकीला जितना उसकी मोटाई इजाज़त देती है; प्रभामंडल भीतर की ओर कैसे फीका पड़ता है और मुख्य छल्ला अपने तीखे बाहरी किनारे की ओर कैसे गाढ़ा होता है, रोशनी का कितना हिस्सा धूल का है, वह उसे कितना आगे फेंकती है, छल्ले का लालिमा वाला रंग और उसकी सबसे ज़्यादा बनाई गई चमक सांकेतिक हैं"
    }
  },
  "r12Plumes": {
    "line": "गुबार वैसे बनाए गए जैसे देखे गए थे: {list}।",
    "item": "{name}, लगभग {km} किमी ऊँचा ({by}, {when})",
    "jets": "चार बाघ-धारियों की धाराएँ, कम से कम {km} किमी ऊँची ({by}, {when})",
    "truth": "उनकी जगहें और ऊँचाइयाँ मापी हुई हैं; कणों की चापें एक मॉडल हैं, और उनकी रोशनी खींचकर बढ़ाई गई है ताकि वे दिखें। हो सकता है वे अभी फट न रहे हों।",
    "stripes": "धारियाँ नामावली-सूची के केंद्रों और लंबाइयों से सीधी बनाई गई हैं, और उनके साथ की 101 धाराओं की जगहें एक मॉडल हैं।",
    "column": "वे काले स्तंभ हैं जिन्हें हवा ने उनके ऊपरी सिरों पर पश्चिम की ओर ढकेला; स्तंभ कितना चौड़ा है, यह पता नहीं और उसे पतला बनाया गया है।",
    "hot": "रात वाले हिस्से के नारंगी बिंदु गर्म धब्बे हैं जहाँ लावा चमकता है ({list}): उनकी जगहें मापी हुई हैं, उनकी चमक नहीं।",
    "film": "सिनेमा रूप में कण अपनी चापों में घड़ी से {k} गुना तेज़ उड़ते हैं।",
    "still": "वे स्थिर रखे गए हैं, जैसे “मापा हुआ” में या कम हलचल वाली सेटिंग में।",
    "review": "किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
    "span": "{a} से {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "इसके तारे",
      "lightLabel": "उनकी रोशनी",
      "depthLabel": "उनकी गहराई",
      "reviewLabel": "समीक्षा",
      "globularStars": "इसी तरह की चीज़ का मॉडल, इसके अपने तारे नहीं: टर्न-ऑफ़ से ज़्यादा चमकीले {n} तारे, King की रूपरेखा से रखे गए, Harris की कोर त्रिज्या ({rc} प्रकाश-वर्ष) और ज्वारीय त्रिज्या ({rt}) के साथ। उनकी संख्या, चमक और रंग एक मॉडल हैं।",
      "globularLight": "सब मिलाकर समूह की रोशनी का लगभग {pct}% (निरपेक्ष परिमाण {mv}); वे धुँधले तारे जिनके लिए कोई बिंदु नहीं, दमक बन जाते हैं। परिमाण 10 तक बनाया गया, जैसा कैमरे का एक्सपोज़र उसे दिखाता।",
      "openStars": "Gaia से {n} सदस्य (Hunt और Reffert 2023, {name}), हर एक की सदस्यता की संभावना कम से कम {p}, अपनी ज्वारीय त्रिज्या के भीतर। परिमाण 10 तक बनाए गए, जैसा कैमरे का एक्सपोज़र उन्हें दिखाता।",
      "openStarsHyg": "Gaia से {n} सदस्य (Hunt और Reffert 2023, {name}), हर एक की सदस्यता की संभावना कम से कम {p}, अपनी ज्वारीय त्रिज्या के भीतर; {h} ज़्यादा चमकीले तारे नक्शे के अपने कैटलॉग के हैं। परिमाण 10 तक बनाए गए, जैसा कैमरे का एक्सपोज़र उन्हें दिखाता।",
      "openDepthSome": "{m} अपने-अपने लंबन से रखे गए हैं; बाकी {k} समूह की दूरी पर, उसके भीतर उनकी गहराई मॉडल से बनाई गई।",
      "openDepthNone": "उनकी दिशाएँ मापी हुई हैं; समूह के भीतर उनकी गहराई मॉडल से बनाई गई है, क्योंकि इतनी दूरी पर किसी एक तारे का लंबन इतना सटीक नहीं होता।",
      "review": "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
    }
  },
  "a45": {
    "farNote": "यह अब कितनी दूर है ({how}), Planck 2018 ब्रह्मांड-मॉडल में इसके {z} के लाल विस्थापन से",
    "comoving": "सहगामी दूरी",
    "pulsarDistance": [
      "पल्सर के अपने लंबन से",
      "उस गोलाकार तारा-समूह, सुपरनोवा अवशेष या दूसरी चीज़ की दूरी जिसका यह हिस्सा है",
      "रेडियो संकेत से एक मॉडल का अनुमान (आकाशगंगा के मुक्त इलेक्ट्रॉनों का YMW16 मॉडल), माप नहीं: यह काफ़ी गलत हो सकता है"
    ],
    "shape": {
      "galaxy": "वह निशान जो इसका लाल विस्थापन इसे जिस दूरी पर रखता है वहाँ बना है; इतनी दूर की आकाशगंगा ज़्यादा से ज़्यादा कुछ पिक्सेल चौड़ी होती है, इसलिए उसका आकार नहीं बनाया गया",
      "browndwarf": "इसकी मापी हुई दूरी पर एक छल्ला; भूरा बौना इस पैमाने पर एक बिंदु है और लगभग कोई दिखने वाली रोशनी नहीं देता",
      "whitedwarf": "इसकी मापी हुई दूरी पर एक छल्ला; श्वेत बौना खुद इस पैमाने पर एक बिंदु है",
      "cluster": "समूह के एक्स-रे केंद्र पर एक निशान; सदस्य आकाशगंगाएँ सिर्फ़ Virgo, Coma, Fornax और Perseus के लिए बनाई गई हैं (स्थानीय समूह वाला चरण)"
    },
    "quasarZ7": "एक क्वेज़ार, वैसा दिखता है जैसा वह बिग बैंग के लगभग {age} मिलियन साल बाद था: लाल विस्थापन 7 के पार के {n} ज्ञात क्वेज़ारों में से एक।",
    "unplaced": {
      "unnamed": "HYG तारा {id}",
      "lead": "{name} उस दिशा में एक तारा है जिधर आप देख रहे हैं; किसी ने नहीं मापा कि वह कितनी दूर है",
      "leadColour": "{name} उस दिशा में एक {a} {colour} तारा है जिधर आप देख रहे हैं; किसी ने नहीं मापा कि वह कितनी दूर है",
      "note": "आसमान पर बनाया गया है, अंतरिक्ष में कहीं नहीं, क्योंकि जगह के लिए दूरी चाहिए।",
      "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): सिर्फ़ दिशा और परिमाण"
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "वहाँ एक चमकीला बिंदु जहाँ इसका लाल विस्थापन इसे रखता है, जगह दिखाने वाले एक छल्ले के साथ; इसकी डिस्क और इसकी धारा बनाने के लिए बहुत छोटी हैं",
      "host": "इसकी मेज़बान आकाशगंगा धुँधली और गोल उस कोणीय आकार में बनाई गई है जो स्रोत देता है, यहाँ से देखने पर {size} आर्कसेकंड चौड़ी; असल में यह लगभग {ly} प्रकाश-वर्ष है। इसका चपटापन और झुकाव नहीं बनाए गए।",
      "point": "स्रोत इसकी मेज़बान आकाशगंगा का कोई आकार नहीं देता, इसलिए कोई नहीं बनाई गई।"
    },
    "cluster": {
      "members": "{catalogue} से {n} सदस्य आकाशगंगाएँ; उनमें से {own} एक-एक करके मापी गई दूरियों पर खड़ी हैं।",
      "membersNoOwn": "{catalogue} से {n} सदस्य आकाशगंगाएँ।",
      "distanceSbf": "समूह {mpc} मेगापारसेक ({mly} मिलियन प्रकाश-वर्ष) दूर है, सतह की चमक के उतार-चढ़ाव से निकली दूरियों का औसत।",
      "distanceZ": "समूह {mly} मिलियन प्रकाश-वर्ष दूर है: इसके सदस्यों का औसत लाल विस्थापन ({z}), नक्शे के एक ब्रह्मांड-मॉडल में सहगामी दूरी तक पहुँचाया गया।",
      "depthMeasured": "जिस आकाशगंगा की अपनी कोई दूरी नहीं, उसे गहराई में समूह के मापे हुए बिखराव, {rms} मेगापारसेक, के हिसाब से फैलाया गया है; वह रखना एक मॉडल है।",
      "depthModelled": "यहाँ किसी आकाशगंगा की अपनी दूरी नहीं है, इसलिए उन्हें गहराई में उतना ही फैलाया गया है जितना आसमान में, मानो समूह गोल हो; वह रखना एक मॉडल है।",
      "size": "हर आकाशगंगा उतनी चौड़ी है जितना उसका कैटलॉग का आधा-रोशनी वाला अर्धव्यास कहता है, एक गोल आकार में जो बीच में चमकीला है; इसका चपटापन और झुकाव नहीं बनाए गए।"
    }
  },
  "deepRing": {
    "card": {
      "m57": "इसकी रोशनी Hubble की तस्वीर से ली गई है, इसका आकार O’Dell, Ferland, Henney और Peimbert (2013) से: 13.5° झुका मोटा छल्ला, लगभग उसकी धुरी की सीध में देखा गया, बीच की ज़्यादा नीली गैस हमारी ओर और हमसे दूर पहुँचती बनाई गई। इसके रंग तस्वीर के हैं, संकरे फ़िल्टरों से लिए गए। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "m27": "इसकी रोशनी NOIRLab की तस्वीर से ली गई है, इसकी गैसों के अपने रंगों में दिखाई गई; इसका आकार एक पुनर्निर्माण है: चमकीली कमर एक मोटा छल्ला जो लगभग किनारे से देखा गया, धुँधले कान इसकी पालियाँ, उन परतों की रफ़्तारों के बाद जो Meaburn और अन्य (2005) ने मापीं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "southern-ring": "इसकी रोशनी Webb की इन्फ़्रारेड तस्वीर से ली गई है; इसका आकार Kastner और अन्य (2024) और De Marco और अन्य (2022) के अनुसार है: लगभग धुरी की सीध में देखा गया एक छल्ला, उसके आर-पार एक बुलबुला और दोनों के चारों ओर आणविक प्रभामंडल। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-m57": [
        [
          "इसकी दूरी",
          "इसके केंद्रीय तारे, Gaia DR3 2090486618786534784, का लंबन (Gaia DR3): 1.270 ± 0.044 मिलीआर्कसेकंड, लगभग 2 570 प्रकाश-वर्ष (2 480 से 2 660)।"
        ],
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। आसमान में छल्ले का आकार, उसकी लंबी धुरी का झुकाव और कौन सा सिरा पास है, ये मापे हुए हैं। उसकी मोटाई और बीच की गैस का रूप नहीं: वे एक चित्र की तरह बनाए गए हैं।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-m27": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। इसका आकार, आसमान में इसका कोण और इसकी परतों की रफ़्तारें मापी हुई हैं; कि कमर लगभग किनारे से देखा गया छल्ला है, और इसके कान हमारी ओर और हमसे दूर कैसे पहुँचते हैं, इस तरह की नीहारिका को पढ़ने का आम तरीका है, जिसे चित्र की तरह बनाया गया।"
        ],
        [
          "इसके रंग",
          "इसकी गैसों के अपने रंग, तस्वीर के संकरे फ़िल्टरों से: ऑक्सीजन हरा-नीला, हाइड्रोजन और सल्फ़र लाल। हर एक कितना गाढ़ा दिखे, यह हमारा चुनाव है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-southern-ring-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। कि इसका चमकीला छल्ला इसकी धुरी से 15 से 30° पर दिखता है, यह मापा हुआ है (Kastner और अन्य, 2024); कौन सा हिस्सा पास है, छल्ले की मोटाई और बुलबुले की लंबाई सांकेतिक हैं।"
        ],
        [
          "इसके रंग",
          "इन्फ़्रारेड रोशनी जिसे कोई आँख नहीं देख सकती, Webb की तस्वीर बनाने वालों ने रंग दिए।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "Hubble की रोशनी के अलग-अलग रंगों की तस्वीरें, नीहारिका भर में मापी गई गैस की रफ़्तारों के साथ, एक मोटा छल्ला दिखाती हैं जो लगभग सामने से देखा गया है: इसकी लंबी धुरी 13.5° झुकी है, इसका उत्तर-पूर्वी सिरा हमारे ज़्यादा पास है। तेज़ गैस इसके बीच को भरती है और हमारी देखने की सीध में हमारी ओर और हमसे दूर खिंचती है (O’Dell, Ferland, Henney और Peimbert 2013)।"
  },
  "r12Dust": {
    "card": {
      "crab": "इसकी रोशनी Hubble की तस्वीर से ली गई है, झूठे रंग में, एक खोल पर चढ़ाई गई जिसका आकार Martin, Milisavljevic और Drissen (2021) के अनुसार है: एक खाली बीच के चारों ओर लगभग 4 पारसेक लंबा तंतुओं का पिंजरा। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "veil": "इसकी रोशनी NOIRLab की तस्वीर से ली गई है, झूठे रंग में, 37 पारसेक चौड़े एक पतले गोले पर चढ़ाई गई (Fesen और अन्य, 2018): तंतु उसका किनारे से देखा गया रिम हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "horsehead": "इसका कालापन NOIRLab की तस्वीर से पढ़ा गया है: IC 434 की चमकती गैस के सामने धूल, जो अपने पीछे की चीज़ को सोखती और लाल करती है और खुद कोई रोशनी नहीं देती। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "coalsack": "इसका कालापन इसके चारों ओर की आकाशगंगा से पढ़ा गया है: लगभग 590 प्रकाश-वर्ष दूर धूल का एक बादल जो अपने पीछे के तारों को धुँधला और लाल करता है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "m78": "इसकी रोशनी NOIRLab की तस्वीर है: धूल जो अपने सामने के तारे की नीली रोशनी को बिखेरती है, एक काले बादल की सतह पर। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "iris": "इसकी रोशनी NOIRLab की तस्वीर है: धूल जो अपने बादल के एक खोखले में जवान तारे HD 200775 की रोशनी को बिखेरती है। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "m45": "इसकी रोशनी NOIRLab की तस्वीर है: धूल का एक बादल जो समूह के बीच से बहता है, इसके तारों के ठीक सामने, उनकी नीली रोशनी को बिखेरता (Ritchey और अन्य, 2006)। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-m1": [
        [
          "गहराई में इसका आकार",
          "एक मापी हुई रूपरेखा से पुनर्निर्मित। तंतु पल्सर की हवा की धुरी के साथ लगभग 2 पारसेक तक पहुँचते हैं और कोई भी केंद्र के आधे पारसेक के भीतर नहीं है (Martin और अन्य, 2021)। उसी धुरी के साथ एक दीर्घवृत्ताभ की तरह बनाया गया; कौन सा सिरा हमारे पास है, यह मान लिया गया है।"
        ],
        [
          "इसके रंग",
          "झूठे रंग: ऑक्सीजन और सल्फ़र के लिए तस्वीर के संकरे फ़िल्टर, जिन्हें चित्र बनाने वालों ने रंग दिए।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-veil-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित: 37 पारसेक चौड़ा एक गोला, वह आकार और दूरी जो Fesen और अन्य (2018) ने मापी। खोल की मोटाई सांकेतिक है।"
        ],
        [
          "इसके रंग",
          "झूठे रंग: ऑक्सीजन, सल्फ़र और हाइड्रोजन के लिए तस्वीर के संकरे फ़िल्टर, जिन्हें चित्र बनाने वाले ने रंग दिए।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। धूल IC 434 की चमकती गैस के सामने है, जैसा देखा गया; कितनी सामने और कितनी मोटी, यह सांकेतिक है।"
        ],
        [
          "धूल क्या करती है",
          "यह सिर्फ़ सोखती है: उसके पीछे के तारे और दमक धुँधले हो जाते हैं, और नीले में लाल से ज़्यादा, इसलिए वे ज़्यादा लाल दिखते हैं। यह खुद कोई रोशनी नहीं देती।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-coalsack": [
        [
          "यह कितना काला है",
          "इससे पढ़ा गया कि यहाँ आकाशगंगा पास की उसी दूरी पर, अपनी बीच की रेखा से, कितनी ज़्यादा काली है। यह एक अनुमान है और इन्फ़्रारेड नक्शों से कम, क्योंकि बादल के सामने के तारे अपनी रोशनी जोड़ देते हैं।"
        ],
        [
          "धूल क्या करती है",
          "यह सिर्फ़ सोखती है: उसके पीछे के तारे धुँधले और लाल हो जाते हैं। उसके सामने के तारे नहीं। उत्तर-पूर्व का कुछ कालापन बहुत पीछे का एक दूसरा बादल है, जिसे यहाँ पास की दूरी पर बनाया गया है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-m78": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित: रोशन धूल एक चादर की तरह, उसका तारा सामने और एक काला बादल पीछे। गहराइयाँ सांकेतिक हैं।"
        ],
        [
          "दूसरी तरफ़ से",
          "मॉडल से: धूल रोशनी को बगल की तुलना में आगे की ओर ज़्यादा बिखेरती है, इसलिए दूसरी तरफ़ से वही धूल ज़्यादा चमकीली या धुँधली दिखती है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-iris-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित: रोशन दीवारें एक चादर की तरह, तारा सामने और एक काला बादल पीछे। गहराइयाँ सांकेतिक हैं।"
        ],
        [
          "दूसरी तरफ़ से",
          "मॉडल से: धूल रोशनी को बगल की तुलना में आगे की ओर ज़्यादा बिखेरती है, इसलिए दूसरी तरफ़ से वही धूल ज़्यादा चमकीली या धुँधली दिखती है।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ],
      "dso-m45": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। गैस तारों के सामने है, जैसा उनकी रोशनी दिखाती है; कितनी सामने और धूल कितनी मोटी, यह सांकेतिक है, और समूह के भीतर तारों की अपनी गहराइयाँ एक तय मॉडल हैं, मापी हुई नहीं।"
        ],
        [
          "धूल क्या करती है",
          "यह तारों की रोशनी बिखेरती है, नीली सबसे ज़्यादा, इसलिए उनमें सबसे चमकीलों के चारों ओर यह नीली चमकती है, Merope और Maia के आसपास सबसे ज़्यादा। यह एक गुज़रता बादल है, वह नहीं जिससे ये तारे पैदा हुए।"
        ],
        [
          "समीक्षा",
          "किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "किसी अवशेष की गैस एक स्थिर रफ़्तार से बाहर की ओर उड़ती है, इसलिए हमारी ओर या हमसे दूर उसकी रफ़्तार बताती है कि वह केंद्र के कितना आगे या पीछे है। Martin, Milisavljevic और Drissen (2021) ने Crab के 310 000 स्पेक्ट्रा को इसी तरह उसके आकार में बदला।"
  },
  "r12Navigate": {
    "chainLabel": "यह कहाँ है",
    "chainTitle": "{name} तक उड़ें",
    "milkyWay": "आकाशगंगा",
    "outside": "आकाशगंगा के बाहर",
    "the": [
      "सूर्य",
      "चंद्रमा",
      "आकाशगंगा"
    ],
    "theWord": "\u200b",
    "backParent": "{parent} पर वापस",
    "backParentTitle": "{parent} तक बाहर उड़ें",
    "legendTitle": "संकेत-सूची खोलें: इन शब्दों में से हर एक का मतलब",
    "label": "आप कहाँ हैं",
    "title": "सीढ़ी पर कैमरा कहाँ है, पृथ्वी से लेकर स्थानीय समूह तक",
    "back": "वापस",
    "backTo": "{name} पर वापस",
    "sep": "›",
    "rungs": {
      "earth": "पृथ्वी",
      "sun": "सौरमंडल",
      "stellar": "पास के तारे",
      "galaxy": "आकाशगंगा",
      "local-group": "स्थानीय समूह"
    },
    "notes": {
      "sun": "तेज़ किया गया: सूर्य {distance} दूर है",
      "stellar": "तेज़ किया गया: सबसे पास का तारा {distance} दूर है",
      "galaxy": "तेज़ किया गया: हमारी आकाशगंगा का केंद्र {distance} दूर है",
      "local-group": "तेज़ किया गया: एंड्रोमेडा {distance} दूर है"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "सूर्य",
      "ROCKY_PLANET": "पथरीले ग्रह",
      "GAS_GIANT": "गैसीय दानव",
      "ICE_GIANT": "बर्फ़ीले दानव",
      "RINGS": "छल्ले",
      "VOLCANIC_MOON": "ज्वालामुखी वाला चंद्रमा",
      "ICY_MOON": "बर्फ़ीले चंद्रमा",
      "TITAN": "वायुमंडल वाला चंद्रमा",
      "AIRLESS_MOON": "बिना हवा के चंद्रमा",
      "DWARF_PLANET": "बौने ग्रह",
      "ASTEROID": "क्षुद्रग्रह",
      "COMET": "धूमकेतु",
      "ARTIFICIAL_SATELLITE": "उपग्रह",
      "LAUNCH_AND_ROCKET": "प्रक्षेपण और रॉकेट",
      "SPACE_PROBE": "अंतरिक्ष यान",
      "LANDING_SITE": "उतरने की जगहें",
      "EXOPLANET": "बाह्यग्रह",
      "STAR": "तारे",
      "BINARY_AND_MULTIPLE": "जोड़ीदार और बहु-तारे",
      "COMPACT_REMNANT": "मृत तारे",
      "BLACK_HOLE": "ब्लैक होल",
      "OPEN_CLUSTER": "खुले तारा-समूह",
      "GLOBULAR_CLUSTER": "गोलाकार तारा-समूह",
      "EMISSION_NEBULA": "उत्सर्जन नीहारिकाएँ",
      "PLANETARY_NEBULA": "ग्रहीय नीहारिकाएँ",
      "DARK_NEBULA": "काली नीहारिकाएँ",
      "REFLECTION_NEBULA": "परावर्तन नीहारिकाएँ",
      "SUPERNOVA_REMNANT": "सुपरनोवा अवशेष",
      "GALAXY_SPIRAL": "सर्पिल आकाशगंगाएँ",
      "GALAXY_IRREGULAR": "बेढंगी आकाशगंगाएँ",
      "GALAXY_ELLIPTICAL": "दीर्घवृत्ताकार आकाशगंगाएँ",
      "GALAXY_INTERACTION": "टकराती आकाशगंगाएँ",
      "AGN_QUASAR": "क्वेज़ार",
      "GALAXY_GROUP": "आकाशगंगाओं के समूह",
      "GROUND_SITE": "ज़मीनी स्टेशन",
      "ODDITY": "अजूबे"
    },
    "other": "बाकी चीज़ें",
    "byName": "नाम से",
    "of": "{world} के {label}",
    "only": "3D मॉडल",
    "onlyTitle": "सिर्फ़ वही सूची में रखें जो 3D मॉडल से बनाया गया है: असली मॉडल या पुनर्निर्माण",
    "real": "असली 3D मॉडल",
    "rebuilt": "3D पुनर्निर्माण",
    "noneWithModel": "इनमें से किसी का 3D मॉडल नहीं है।",
    "counting": "गिन रहे हैं…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "हलचल",
      "choices": {
        "on": "चालू",
        "off": "बंद"
      },
      "titles": {
        "on": "उड़ानें सरकती हैं और सफ़र खुद आगे बढ़ते हैं, जैसा नक्शा बनाया गया है",
        "off": "हर उड़ान एक झटके में होती है, जो मापा हुआ नहीं वह नहीं हिलता, और सफ़र “अगला” का इंतज़ार करता है"
      },
      "device": "आपका डिवाइस कम हलचल माँगता है, इसलिए यह बंद है।"
    },
    "summary": {
      "label": "स्क्रीन पर क्या है",
      "stage": "{stage} को देख रहे हैं।",
      "selected": "{name} चुना गया है, {kind}।",
      "nothing": "कुछ भी चुना नहीं गया है।",
      "trip": "सफ़र का पड़ाव {n} / {count}: {title}।",
      "tripIntro": "सफ़र {title} खुला है।",
      "measured": "जैसा मापा गया वैसा बनाया गया।"
    }
  },
  "r13Deep": {
    "card": {
      "dso-tarantula-nebula": "हमारी नज़र की रेखा के पास इसकी रोशनी Webb की तस्वीर है; इसकी गैस एक मॉडल है, समूह R136 के चारों ओर एक खोखले की, आणविक बादलों से घिरी चमकती गैस के खोल के भीतर, Pellegrini, Baldwin और Ferland (2011) के अनुसार। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m43": "इसकी रोशनी ESO की तस्वीर से ली गई है, इसका आकार उसी काले बादल पर, जिस पर ओरायन नीहारिका है, एक छोटे गड्ढे की तरह फिर से बनाया गया, जो तारे NU Orionis से रोशन है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m51": "इसके प्रकाशित झुकाव और बनावट से बनाया गया: दो भुजाओं वाली सर्पिल, लगभग सामने से देखी गई, इसका साथी NGC 5195 इसकी उत्तरी भुजा के सिरे के पीछे, और वह भुजा जो उस तक पहुँचती है; गहराइयाँ एक मॉडल हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m81": "इसके प्रकाशित झुकाव और बनावट से बनाया गया: एक बड़ा पुराना उभार, दो कसकर लिपटी भुजाएँ जिनके भीतरी किनारों पर धूल है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m101": "इसके प्रकाशित झुकाव और बनावट से बनाया गया: लगभग सामने से देखी गई एक बड़ी डिस्क, कई भुजाएँ और तारे बनाने वाले उसके विशाल क्षेत्र वहाँ जहाँ आसमान उन्हें रखता है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m104": "इसके प्रकाशित झुकाव और बनावट से बनाया गया: एक विशाल गोल उभार और लगभग किनारे से देखी गई पतली डिस्क, उसके सामने धूल का छल्ला। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-antennae-galaxies": "दो टकराती आकाशगंगाएँ वहाँ जहाँ आसमान उन्हें रखता है, और उनकी दो ज्वारीय पूँछें; हर हिस्सा कितना आगे या पीछे है, यह टक्कर के सिमुलेशनों के बाद एक मॉडल है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-m83": "इसके प्रकाशित झुकाव और बनावट से बनाया गया: पट्टी वाली सर्पिल, लगभग सामने से देखी गई, इसकी भुजाएँ नए तारों और चमकती हाइड्रोजन से भरी हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-ngc-1300": "इसकी प्रकाशित बनावट से बनाया गया: एक लंबी पट्टी जिसके आगे वाले किनारों पर धूल की गलियाँ हैं और उसके सिरों से दो भुजाएँ, उनका आकार Hubble की तस्वीर से मिलाया गया। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "dso-centaurus-a": "प्रकाशित संख्याओं से बनाया गया: एक विशाल दीर्घवृत्ताकार आकाशगंगा जिसे धूल और नए तारों की मुड़ी हुई डिस्क काटती है, Spitzer की तस्वीरों पर बैठाए एक मॉडल के बाद; इसकी दो धाराएँ झूठे रंग में बनाई गई हैं, क्योंकि वे एक्स-रे और रेडियो तरंगों में चमकती हैं, दिखने वाली रोशनी में नहीं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    }
  },
  "compare": {
    "row": "तुलना करें",
    "hint": "पैमाने के साथ",
    "missing": "—",
    "none": "कोई नहीं",
    "yes": "हाँ",
    "no": "नहीं",
    "range": "{a} से {b}",
    "numUnit": "{num} {unit}",
    "modeLabel": "दृश्य",
    "modes": {
      "pair": "आमने-सामने",
      "lab": "सभी दुनियाएँ"
    },
    "withLabel": "इसके साथ तुलना",
    "scaleLabel": "पैमाना",
    "scales": {
      "true": "पैमाने पर",
      "same": "बराबर चौड़ाई"
    },
    "propLabel": "सभी दुनियाओं को इससे क्रम में रखें",
    "props": {
      "across": "चौड़ाई",
      "mass": "द्रव्यमान",
      "gravity": "गुरुत्वाकर्षण",
      "temp": "तापमान",
      "spin": "एक चक्कर की लंबाई",
      "year": "एक साल की लंबाई",
      "dist": "सूर्य से दूरी",
      "moons": "चंद्रमाओं की संख्या"
    },
    "names": {
      "sun": "सूर्य",
      "mercury": "बुध",
      "venus": "शुक्र",
      "earth": "पृथ्वी",
      "moon": "चंद्रमा",
      "mars": "मंगल",
      "jupiter": "बृहस्पति",
      "saturn": "शनि",
      "uranus": "अरुण",
      "neptune": "वरुण",
      "pluto": "प्लूटो"
    },
    "the": {
      "sun": "सूर्य",
      "moon": "चंद्रमा"
    },
    "wider": "{big}, {small} से {n} गुना चौड़ा है।",
    "same": "{a} और {b} लगभग बराबर चौड़े हैं।",
    "figure": "{a} और {b}, {how} बनाए गए।",
    "figureTrue": "एक ही पैमाने पर",
    "figureSame": "बराबर चौड़ाई में, पैमाने पर नहीं",
    "tableLabel": "{a} के बगल में {b}",
    "rows": {
      "across": "चौड़ाई",
      "mass": "द्रव्यमान",
      "gravity": "गुरुत्वाकर्षण",
      "temp": "तापमान",
      "spin": "एक चक्कर में लगता है",
      "year": "वहाँ का एक साल",
      "dist": "सूर्य से",
      "air": "वायुमंडल",
      "pressure": "हवा का दबाव",
      "moons": "चंद्रमा",
      "rings": "छल्ले"
    },
    "units": {
      "km": "किमी",
      "earthOne": "पृथ्वी",
      "earths": "पृथ्वियाँ",
      "g": "मी/से²",
      "c": "°C",
      "hours": "घंटे",
      "days": "दिन",
      "years": "साल",
      "au": "AU",
      "bar": "बार",
      "microbar": "µबार"
    },
    "notes": {
      "average": "औसत",
      "flattened": "औसतन; यह चपटा है",
      "range": "इसका दायरा",
      "bar1": "1 बार वाले स्तर पर",
      "edge": "दिखने वाले किनारे पर",
      "photosphere": "दिखने वाली सतह",
      "retro": "उलटा घूमता है",
      "sunSpin": "16° अक्षांश पर",
      "withEarth": "पृथ्वी के साथ",
      "exosphere": "एक पतला बाह्यमंडल",
      "photosphereAir": "प्रकाशमंडल में"
    },
    "air": {
      "part": "{share}% {gas}",
      "join": ", ",
      "almostNone": "लगभग नहीं",
      "noSurface": "कोई सतह नहीं"
    },
    "gas": {
      "hydrogen": "हाइड्रोजन",
      "helium": "हीलियम",
      "methane": "मीथेन",
      "nitrogen": "नाइट्रोजन",
      "oxygen": "ऑक्सीजन",
      "argon": "आर्गन",
      "carbon dioxide": "कार्बन डाइऑक्साइड"
    },
    "source": "NASA की Planetary Fact Sheets, {date} को पढ़ी गईं।",
    "giantNote": "दानव ग्रह की कोई सतह नहीं होती: उसका गुरुत्वाकर्षण और तापमान 1 बार वाले स्तर पर हैं।",
    "moonsNote": "नए चंद्रमा पक्के होते जाते हैं तो उनकी गिनती बढ़ती है।",
    "spinNote": "सूर्य का चक्कर शीट का 16° अक्षांश वाला मान है।",
    "drawnTrue": "हर औसत त्रिज्या से एक ही पैमाने पर बनाया गया, तस्वीरें नहीं।",
    "drawnSame": "बराबर चौड़ाई, इसलिए पैमाने पर नहीं। छल्ले अपना हिस्सा रखते हैं।",
    "tiny": "{name} यहाँ एक पिक्सेल से छोटा है और बिंदु की तरह बनाया गया है।",
    "ringsDrawn": "छल्ले चित्र के लिए झुकाए गए हैं; उनकी त्रिज्याएँ NASA की हैं।",
    "labLog": "पट्टियाँ लघुगणकीय हैं, ताकि छोटे मान दिखते रहें।",
    "labLinear": "पट्टियाँ गिनती के अनुपात में हैं।",
    "labTitle": "{name} से तुलना करें",
    "thisCard": "इस कार्ड की दुनिया"
  },
  "passportKinds": {
    "kindsTitle": "खोली गईं, किस्म के हिसाब से",
    "noKinds": "किस्म के हिसाब से गिनने को अभी कुछ नहीं।",
    "kinds": {
      "worlds": "ग्रह, चंद्रमा और सूर्य",
      "stations": "अंतरिक्ष स्टेशन",
      "satellites": "उपग्रह और उनके रॉकेट",
      "spacecraft": "अंतरिक्ष यान और अंतरिक्ष टेलीस्कोप",
      "small": "धूमकेतु और क्षुद्रग्रह",
      "stars": "तारे",
      "exoplanets": "दूसरे तारों के ग्रह",
      "deep": "नीहारिकाएँ, आकाशगंगाएँ और गहरा आकाश",
      "earth": "पृथ्वी की जगहें और मौसम"
    },
    "notedTitle": "दर्ज",
    "noNoted": "अभी कुछ दर्ज नहीं। नक्शे पर कोई जगह खोलें।",
    "notedFine": "वह दिन जब इस ब्राउज़र में कोई दर्ज बात पहली बार पक्की हुई। यहीं रखा है, कभी क्रम में नहीं रखा जाता, न भेजा जाता है।",
    "noted": {
      "first": {
        "name": "पहली जगह",
        "said": "आपने नक्शे पर एक जगह खोली।"
      },
      "planets": {
        "name": "सभी आठ ग्रह",
        "said": "आपने हर ग्रह खोला, बुध से वरुण तक।"
      },
      "station": {
        "name": "एक अंतरिक्ष स्टेशन",
        "said": "आपने कक्षा में एक स्टेशन खोला।"
      },
      "craft": {
        "name": "बाहर गया एक यान",
        "said": "आपने एक अंतरिक्ष यान या अंतरिक्ष टेलीस्कोप खोला।"
      },
      "small": {
        "name": "एक धूमकेतु या क्षुद्रग्रह",
        "said": "आपने सौरमंडल का एक छोटा पिंड खोला।"
      },
      "star": {
        "name": "एक तारा",
        "said": "आपने सूर्य के पार का एक तारा खोला।"
      },
      "exoplanet": {
        "name": "दूसरे तारे का ग्रह",
        "said": "आपने वह ग्रह खोला जो किसी दूसरे तारे का चक्कर लगाता है।"
      },
      "deep": {
        "name": "गहरा आकाश",
        "said": "आपने एक नीहारिका, आकाशगंगा या तारा-समूह खोला।"
      },
      "trip": {
        "name": "अंत तक एक सफ़र",
        "said": "आपने एक गाइड वाला सफ़र पूरा किया।"
      },
      "eyes": {
        "name": "अपनी आँखों से देखा",
        "said": "आपने कुछ देखा हुआ करके टिक किया।"
      },
      "every": {
        "name": "हर किस्म में से एक",
        "said": "आपने ऊपर की हर किस्म की कम से कम एक चीज़ खोली।"
      }
    }
  },
  "photoCompare": {
    "title": "तस्वीर से तुलना करें",
    "reconstruction": "पुनर्निर्माण",
    "photograph": "तस्वीर",
    "valueText": "{n}% तस्वीर",
    "flying": "वहाँ जा रहे हैं जहाँ से तस्वीर खींची गई थी।",
    "note": "नक्शा एक 3D मॉडल बनाता है। तस्वीर सिर्फ़ यहीं दिखती है: सपाट और सूर्य की ओर मुँह किए हुए, इसलिए मुड़ जाएँ तो वह फीकी पड़ जाती है।"
  },
  "entrances": {
    "label": "अंदर आने के तीन रास्ते",
    "tonight": "आज रात",
    "tonightTitle": "आज रात आपकी जगह से सिर के ऊपर क्या है",
    "explore": "खोजें",
    "exploreTitle": "पूरे नक्शे में घूमकर देखें",
    "trip": "गाइड वाला सफ़र",
    "tripTitle": "सूची का पहला गाइड वाला सफ़र शुरू करता है"
  },
  "momentPlayer": {
    "micro": "पल",
    "play": "चलाएँ",
    "pause": "रोकें",
    "replay": "फिर चलाएँ",
    "close": "पल बंद करें",
    "chapters": "अध्याय",
    "chaptersTitle": "किसी अध्याय पर जाएँ",
    "share": "इस सेकंड का लिंक कॉपी करें",
    "copied": "लिंक कॉपी हो गया",
    "copyFailed": "यह लिंक कॉपी करें: {url}",
    "director": "निर्देशक",
    "directorTitle": "कैमरा वापस निर्देशक को दे दें",
    "freeNote": "आपका कैमरा। इधर-उधर देखने के लिए खींचें; “निर्देशक” उसे वापस दे देता है।",
    "scrubber": "मिशन का समय",
    "met": "मिशन के बीते समय",
    "rateTitle": "यहाँ समय असली से {rate} तेज़ चलता है",
    "realTime": "असली समय",
    "loading": "पल लोड हो रहा है…",
    "missing": "{id} नाम का कोई पल नहीं है।",
    "unreachable": "यह पल लोड नहीं हुआ। यह इस डिवाइस पर तभी सहेजा जाता है जब इसे एक बार ऑनलाइन खोला जाए।",
    "modelMissing": "{model} मॉडल लोड नहीं हुआ; उसका रास्ता और लपटें फिर भी बनाई गई हैं।",
    "chapterOf": "अध्याय {n} / {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "मापा हुआ",
      "reconstructed": "पुनर्निर्मित",
      "illustrative": "सांकेतिक"
    },
    "truthLine": "{truth}: {path}।",
    "cutNote": "चरण अभी एक ही मॉडल से काटे गए हैं।",
    "drawnNote": "लपटें और भाप बनाई गई हैं।",
    "groundNote": "लॉन्च पैड के पास की ज़मीन सांकेतिक; पृथ्वी का नक्शा Solar System Scope, CC BY 4.0।",
    "groundNoteMars": "Ground near the site illustrative; Mars map Solar System Scope, CC BY 4.0.",
    "keys": "Space चलाता या रोकता है, तीर कदम बढ़ाते हैं, Escape बंद करता है"
  },
  "momentShelf": {
    "title": "पल",
    "note": "तीन मिशन एक घड़ी पर फिर चलाए गए, घटनाओं के असली समय के साथ। रास्ते पुनर्निर्मित हैं और यह साफ़ कहा गया है।",
    "minutes": "{m} मिनट",
    "all": "सभी {n} पल",
    "fewer": "कम पल",
    "replay": "यह पल फिर चलाएँ",
    "replayTitle": "{title} को मिशन की घड़ी पर फिर चलाएँ",
    "replayNamed": "{title} फिर से चलाएँ",
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
        "when": "16 से 24 जुलाई 1969",
        "blurb": "पैड 39A से प्रशांत महासागर तक, Tranquility Base के रास्ते: प्रक्षेपण, चंद्रमा, उतरना, वापस ऊपर चढ़ना, घर।"
      },
      "apollo-13": {
        "title": "अपोलो 13",
        "when": "11 से 17 अप्रैल 1970",
        "blurb": "पैड 39A से प्रशांत महासागर तक: वह लैंडिंग जो नहीं हुई, फटा हुआ ऑक्सीजन टैंक, और जीवन-नौका बना चंद्र मॉड्यूल।"
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1 से 10 अप्रैल 2026",
        "blurb": "पैड 39B से San Diego के पास प्रशांत महासागर तक, चंद्रमा के दूर वाले हिस्से का चक्कर लगाकर। जो उड़ाया गया वह बताया गया है, और जो योजना में था वह भी।"
      },
      "sputnik-1": {
        "title": "स्पुतनिक 1",
        "when": "4 अक्टूबर 1957",
        "blurb": "बैकोनूर से पृथ्वी के पहले चक्कर तक: पहला कृत्रिम उपग्रह, 585 मिमी का चमकाया हुआ गोला, और उसकी बीप।"
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
        "when": "12 अप्रैल 1961",
        "blurb": "यूरी गागरिन, 108 मिनट में पृथ्वी का एक चक्कर, Baikonur से Smelovka के पास एक खेत तक।"
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
      "title": "Saturn V: इग्निशन से चरण-अलगाव तक",
      "blurb": "Apollo 11 के पहले तीन मिनट, 16 जुलाई 1969, Launch Complex 39A के पैड से।",
      "chIgnition": "इग्निशन",
      "chLiftoff": "उड़ान भरना",
      "chClimb": "Max Q से होकर",
      "chStaging": "चरण-अलगाव",
      "ignition": "T−8.9 सेकंड: इग्निशन क्रम पाँचों F-1 इंजन चालू करता है, पहले बीच वाला, फिर बाहर की जोड़ियाँ।",
      "holddown": "पकड़ने वाली भुजाएँ पूरे रॉकेट को पैड पर तब तक थामे रखती हैं जब तक पाँचों इंजन पूरे ज़ोर पर न आ जाएँ।",
      "liftoff": "प्रक्षेपण, 13:32:00.6 UTC: पाँच F-1, लगभग 33 800 kN, लगभग 3 000 टन को उठाते हुए।",
      "tower": "मीनार से साफ़ निकलकर रॉकेट अपनी उड़ान की दिशा में मुड़ता है, उत्तर से 72 डिग्री पूर्व।",
      "maxq": "एक मिनट में आवाज़ की रफ़्तार के पार; फिर Max Q, जब हवा सबसे ज़ोर से धकेलती है: 35 kPa (735 lb/ft²)।",
      "ceco": "T+135 सेकंड: बीच वाला इंजन बंद हो जाता है, ताकि त्वरण 4 g से नीचे रहे।",
      "staging": "T+161.7 सेकंड: बाहर वाले इंजन बंद हो जाते हैं। लगभग 67 किमी ऊपर S-IC अलग होकर गिरता है, उसके रेट्रो-रॉकेट जलते हुए।",
      "sii": "T+163.0 सेकंड: S-II के पाँच J-2 इंजन जल उठते हैं। हाइड्रोजन हल्की और लगभग पारदर्शी लौ में जलती है।",
      "interstage": "बीच का छल्ला गिर जाता है; T+197.9 सेकंड पर बचाव मीनार चली जाती है। पार्किंग कक्षा 8.5 मिनट आगे है।",
      "pathAscent": "Apollo 11 मिशन रिपोर्ट के समय, बीच की ऊँचाइयाँ लगभग",
      "sources": "Apollo 11 Mission Report, NASA MSC-00171, 1969 (तालिका 3-I, घटनाओं का क्रम; खंड 7.1, प्रक्षेपण)"
    },
    "vostok-1": {
      "title": "Vostok 1: अंतरिक्ष में पहला इंसान",
      "blurb": "यूरी गागरिन, 12 अप्रैल 1961: Baikonur से पृथ्वी का एक चक्कर लगाकर Smelovka के पास एक खेत तक, मिशन की घड़ी पर, 108 मिनट में।",
      "chPad": "गागरिन का स्टार्ट",
      "chAscent": "ऊपर चढ़ना",
      "chOrbit": "एक कक्षा",
      "chRetro": "रेट्रोफ़ायर",
      "chEntry": "वापसी",
      "chEject": "बाहर निकलना",
      "chLand": "उतरना",
      "ready": "Baikonur, साइट 1, 06:07 UTC। 27 साल के यूरी गागरिन R-7 रॉकेट के ऊपर कैप्सूल में हैं।",
      "korolev": "रेडियो पर सेर्गेई कोरोलेव: “शुरुआती चरण… बीच का… मुख्य… प्रक्षेपण!”",
      "liftoff": "प्रक्षेपण। गागरिन: “Poyekhali!”, यानी “चलो!”",
      "boosters": "T+119 सेकंड: चारों साथ जुड़े बूस्टर जल चुके हैं और अलग होकर गिर जाते हैं।",
      "shroud": "T+156 सेकंड: कैप्सूल पर चढ़ा खोल उतार दिया जाता है।",
      "core": "T+300 सेकंड: मुख्य चरण खत्म हो चुका है और अलग हो जाता है; आख़िरी चरण जल उठता है।",
      "earth": "लगभग T+6 मिनट, गागरिन: “मुझे पृथ्वी दिख रही है। दिखाई अच्छा दे रहा है।”",
      "kosberg": "लगभग T+10 मिनट पर आख़िरी चरण बंद हो जाता है। गागरिन: “Kosberg ने काम कर दिया!”, उसके इंजन के डिज़ाइनर के नाम पर।",
      "orbit": "कक्षा में: 181 गुणा 327 किमी, भूमध्य रेखा से 64.95 डिग्री झुकी, एक चक्कर 89.1 मिनट का। कैप्सूल चरण से अलग हो जाता है।",
      "retro": "T+1 घंटा 18 मिनट, अफ़्रीका के पश्चिमी तट के ऊपर: रेट्रो-रॉकेट लगभग 42 सेकंड जलता है। इसका समय और जगह प्रकाशित हैं; यहाँ इसका ज़ोर उतरने की जगह से मिलाकर बैठाया गया है।",
      "wires": "रेट्रोफ़ायर के दस सेकंड बाद उपकरण वाला हिस्सा अलग हो जाना चाहिए। तारों का एक गुच्छा उसे थामे रखता है; दोनों साथ-साथ लुढ़कते हुए हवा में आते हैं।",
      "entry": "तार जल जाते हैं और गोला गर्मी की ढाल को आगे करके सीधा हो जाता है। गागरिन ने बाद में 10 g से ज़्यादा बताया।",
      "eject": "7 किमी पर हैच उड़ा दी जाती है और सीट गागरिन को बाहर फेंकती है। Vostok का गोला इतनी ज़ोर से उतरता था कि भीतर बैठा इंसान बच नहीं सकता था।",
      "chutes": "2.5 किमी पर कैप्सूल की मुख्य छतरी खुलती है, 27 मीटर चौड़ी; पायलट की अपनी छतरी लगभग तुरंत खुल गई। सीट अलग होकर गिरती है।",
      "landing": "T+1 घंटा 48 मिनट: गागरिन Engels, Saratov Oblast के 26 किमी दक्षिण-पश्चिम में उतरते हैं, प्रक्षेपण के 108 मिनट बाद। उतरने के समय पर स्रोत दस मिनट का फ़र्क बताते हैं।",
      "pathAscent": "चढ़ाई प्रकाशित घटना-समयों को चिकने मोड़ों से जोड़कर बनी है; बीच की ऊँचाइयाँ और दूरियाँ हमारी हैं",
      "pathOrbit": "कक्षा, रेट्रोफ़ायर और वापसी प्रकाशित समयों और उतरने के खेत से बैठाई गई दो-पिंड चापें हैं, ट्रैकिंग डेटा नहीं",
      "pathPilot": "पायलट की छतरी के नीचे उतरना बनाया गया है; कैप्सूल से दूरी कोई स्रोत नहीं बताता",
      "srcWiki": "Wikipedia, Vostok 1 (घटना-समय, कक्षा, उद्धरण; 2 नवंबर 2026 को पढ़ा गया)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (कक्षा, अंतरिक्ष यान)"
    },
    "apollo-11": {
      "title": "Apollo 11: चंद्रमा तक और वापस",
      "blurb": "Launch Complex 39A, 16 जुलाई 1969, से 24 तारीख़ को प्रशांत महासागर तक: प्रक्षेपण, चंद्रमा, Tranquility Base और घर, मिशन की घड़ी पर।",
      "chIgnition": "इग्निशन",
      "chLiftoff": "उड़ान भरना",
      "chStaging": "चरण-अलगाव",
      "chParking": "पार्किंग कक्षा",
      "chTli": "चंद्रमा के लिए रवानगी",
      "chCoast": "तीन दिन का सफ़र",
      "chLoi": "चंद्रमा की कक्षा में",
      "chUndock": "Eagle अलग होता है",
      "chDescent": "इंजन से उतरना",
      "chSurface": "Tranquility Base",
      "chAscent": "वापस ऊपर",
      "chDock": "जुड़ना",
      "chTei": "घर की ओर",
      "chEntry": "वापसी",
      "chSplash": "समुद्र में उतरना",
      "ignition": "T−8.9 सेकंड: इग्निशन क्रम पाँचों F-1 इंजन चालू करता है, पहले बीच वाला, फिर बाहर की जोड़ियाँ।",
      "liftoff": "प्रक्षेपण, 13:32:00 UTC: पाँच F-1, लगभग 33 800 kN, लगभग 3 000 टन को उठाते हुए।",
      "tower": "मीनार से साफ़ निकलकर रॉकेट अपनी उड़ान की दिशा में मुड़ता है, उत्तर से 72 डिग्री पूर्व।",
      "maxq": "एक मिनट में आवाज़ की रफ़्तार के पार; फिर Max Q, जब हवा सबसे ज़ोर से धकेलती है: 35 kPa।",
      "ceco": "T+135 सेकंड: बीच वाला इंजन बंद हो जाता है, ताकि त्वरण 4 g से नीचे रहे।",
      "staging": "T+161.7 सेकंड: बाहर वाले इंजन बंद हो जाते हैं। लगभग 67 किमी ऊपर S-IC अलग होकर गिरता है, उसके रेट्रो-रॉकेट जलते हुए।",
      "sii": "T+163.0 सेकंड: S-II के पाँच J-2 इंजन जल उठते हैं। हाइड्रोजन हल्की और लगभग पारदर्शी लौ में जलती है।",
      "interstage": "बीच का छल्ला गिर जाता है; T+197.9 सेकंड पर बचाव मीनार चली जाती है।",
      "siicut": "T+9 मिनट 13 सेकंड: S-II बंद होकर अलग हो जाता है; S-IVB जल उठता है।",
      "parking": "T+11 मिनट 52 सेकंड: पार्किंग कक्षा, 185 किमी ऊपर। ढाई घंटे की जाँच, पृथ्वी के डेढ़ चक्कर।",
      "tli": "2:44:16: S-IVB 5 मिनट 48 सेकंड के लिए फिर जलता है और पूरे रॉकेट को 10.8 किमी/सेकंड तक पहुँचा देता है। मंज़िल चंद्रमा है।",
      "sla": "3:17: चंद्र यान के चारों ओर के चार पैनल खुल जाते हैं। Columbia अलग होता है, घूमता है और Eagle से नाक-से-नाक जुड़ जाता है (बनाया नहीं गया)।",
      "extract": "लगभग 3:57: Columbia, Eagle को S-IVB से बाहर खींचता है। इस्तेमाल हो चुका चरण पीछे छोड़ दिया जाता है।",
      "coast": "चंद्रमा तक तीन दिन, 384 000 किमी, असली रफ़्तार से लगभग 8 000 गुना तेज़ बनाया गया। यान 11 मीटर लंबा है, इसलिए यह एक बिंदु है।",
      "loi": "75:49:50, चंद्रमा के पीछे और रेडियो संपर्क से बाहर: सर्विस इंजन छह मिनट जलता है ताकि चंद्रमा उसे पकड़ ले।",
      "lunarorbit": "चंद्रमा की कक्षा, लगभग 100 किमी ऊपर, एक चक्कर दो घंटे का।",
      "undock": "100:12: Eagle, आर्मस्ट्रांग और एल्ड्रिन के साथ, Columbia से अलग होता है, जहाँ कॉलिन्स रुके रहते हैं।",
      "pdi": "102:33:05: इंजन से उतरना शुरू होता है, 15 किमी ऊपर और उतरने की जगह से लगभग 500 किमी पहले।",
      "landing": "कंप्यूटर इसे चट्टानों से भरे एक गड्ढे में उतारने वाला था। आर्मस्ट्रांग कमान सँभालते हैं और आगे उड़ते हैं, ईंधन एक मिनट से भी कम बचा है।",
      "landed": "102:45:40, 20:17:40 UTC। “Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15, 21 जुलाई को 02:56 UTC: आर्मस्ट्रांग सीढ़ी से उतरते हैं।",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” आर्मस्ट्रांग, 109:24:48; यह क्लिप NASA की रिकॉर्डिंग है।",
      "liftoffe": "124:22: चढ़ाई वाला चरण अपने उतरने वाले चरण से ऊपर उठता है, जो चंद्रमा पर ही रह जाता है। 21 जुलाई को 17:54 UTC।",
      "rendezvous": "Eagle, Columbia का पीछा करते हुए 18 किमी से 100 किमी तक चढ़ता है। चालें एक आकार की तरह बनाई गई हैं, मिशन की अपनी नहीं।",
      "docked": "128:03, 21:35 UTC: जुड़ गए। दल और चंद्रमा की 21.5 किलो चट्टान इधर आ जाती है।",
      "jettison": "130:09: Eagle का चढ़ाई वाला चरण छोड़ दिया जाता है, चंद्रमा का चक्कर लगाने के लिए।",
      "tei": "135:23:42, दूर वाले हिस्से में: सर्विस इंजन 2 मिनट 30 सेकंड जलता है। घर की ओर।",
      "home": "ढाई दिन वापसी, वही 384 000 किमी।",
      "smsep": "194:49: सर्विस मॉड्यूल काट दिया जाता है और कैप्सूल अपनी गर्मी की ढाल को आगे कर लेता है।",
      "entry": "195:03, वायुमंडल में प्रवेश, 122 किमी ऊपर 11 किमी/सेकंड पर। ढाल दहकती है; लगभग 6 g तक।",
      "drogue": "लगभग 195:12: दो ड्रोग पैराशूट, फिर तीन मुख्य।",
      "mains": "तीन मुख्य पैराशूट, 25 मीटर चौड़े, कैप्सूल को लगभग 9 मी/सेकंड तक धीमा करते हैं।",
      "splash": "195:18:35, 24 जुलाई को 16:50:35 UTC: प्रशांत महासागर में समुद्र में उतरना, विमानवाहक USS Hornet से 24 किमी दूर (बनाया नहीं गया)। आठ दिन, तीन घंटे, 18 मिनट।",
      "pathAscent": "मिशन रिपोर्ट के घटना-समय, बीच की ऊँचाइयाँ और दूरियाँ लगभग",
      "pathTrip": "Flight Journal के घटना-समयों से दो-पिंड चापों की तरह पुनर्निर्मित: बाहर जाने का शंकु-वक्र, चंद्रमा के चारों ओर एक वृत्त, घर लौटने का शंकु-वक्र; ट्रैकिंग डेटा नहीं",
      "pathLm": "उतरना Tranquility Base से पीछे की ओर बनाया गया है और मिलन एक आकार है; घटना-समय मिशन के अपने हैं",
      "srcReport": "Apollo 11 Mission Report, NASA MSC-00171, 1969 (घटना-समय, प्रक्षेपण, उतरना)",
      "srcJournal": "Apollo 11 Flight Journal, NASA (सेकंड तक के घटना-समय)",
      "srcClip": "चंद्रमा पर आर्मस्ट्रांग के पहले शब्द: NASA की रिकॉर्डिंग, सार्वजनिक संपत्ति, Wikimedia Commons से",
      "srcLanding": "लैंडिंग की सूचना: NASA की रिकॉर्डिंग, सार्वजनिक संपत्ति, Wikimedia Commons से"
    },
    "artemis-ii": {
      "title": "Artemis II: चंद्रमा का चक्कर",
      "blurb": "Launch Complex 39B, 1 अप्रैल 2026, से 10 तारीख़ को San Diego के पास प्रशांत महासागर तक: चार लोग चंद्रमा के दूर वाले हिस्से का चक्कर लगाकर, मिशन की घड़ी पर।",
      "chPad": "पैड 39B",
      "chLiftoff": "उड़ान भरना",
      "chStaging": "बूस्टर अलग",
      "chOrbit": "पृथ्वी की ऊँची कक्षा",
      "chTli": "चंद्रमा के लिए रवानगी",
      "chMoon": "दूर वाला हिस्सा",
      "chHome": "घर की ओर",
      "chEntry": "वापसी",
      "chSplash": "समुद्र में उतरना",
      "ready": "Launch Complex 39B, Kennedy Space Center, 1 अप्रैल 2026। Wiseman, Glover, Koch और Hansen Space Launch System के ऊपर Orion में सवार हैं।",
      "cored": "T−6.4 सेकंड: मुख्य चरण के चारों RS-25 इंजन चालू होते हैं। उड़ाया गया, योजना के अनुसार।",
      "liftoff": "प्रक्षेपण, 22:35:12 UTC (6:35 p.m. EDT): पाँच-खंड वाले दोनों बूस्टर शून्य पर जल उठते हैं। उड़ाया गया।",
      "srb": "लगभग T+2 मिनट: बूस्टर जलकर 48 किमी पर, 5 000 किमी/घंटा की रफ़्तार से अलग हो जाते हैं। उड़ाया गया; वे अटलांटिक में गिरते हैं।",
      "las": "योजना, T+3 मिनट 22 सेकंड: बचाव मीनार उतार दी जाती है। रिपोर्ट की उड़ानें कोई सेकंड नहीं बतातीं; यह उड़ान-योजना का है।",
      "meco": "योजना, T+8 मिनट: मुख्य चरण बंद हो जाता है, एक अर्ध-कक्षीय चाप में जिसका सबसे ऊँचा बिंदु लगभग 2 300 किमी है। उड़ान-योजना का समय।",
      "coresep": "मुख्य चरण छोड़ दिया जाता है और प्रक्षेपण के लगभग दो घंटे बाद प्रशांत महासागर के ऊपर नष्ट होते हुए गिरता है। उड़ाया गया।",
      "prb": "लगभग T+50 मिनट, चाप के ऊपरी बिंदु पर: ऊपरी चरण जलता है ताकि सबसे नीचा बिंदु हवा से बाहर उठ जाए। उड़ाया गया, सेकंड प्रकाशित नहीं।",
      "arb": "एक घंटे बाद, सबसे नीचे के बिंदु पर: 15 मिनट का जलना कक्षा के दूर वाले हिस्से को 70 000 किमी तक उठाता है, लगभग एक दिन का चक्कर। उड़ाया गया।",
      "fairings": "योजना: सर्विस मॉड्यूल के चारों ओर के तीन पैनल उतार दिए जाते हैं; चारों सौर पैनल खुलते हैं। उड़ान-योजना का समय, यहाँ खुले हुए बनाए गए।",
      "arrays": "Orion के चारों सौर पैनल खुल गए हैं: ये दस दिन तक इसकी बिजली बनाएँगे।",
      "sep": "योजना: Orion ऊपरी चरण से अलग होता है; फिर Glover उसे लगभग 70 मिनट तक चरण के बगल में हाथ से उड़ाते हैं। अलग होने का समय प्रकाशित नहीं।",
      "tli": "उड़ान दिन 2, लगभग 25 घंटे बाद: सर्विस मॉड्यूल का मुख्य इंजन 5 मिनट 49 सेकंड जलता है, चंद्रमा के लिए। उड़ाया गया; दिखाया गया मिनट उड़ान-योजना का है।",
      "outbound": "जाने के चार दिन। जाते समय सुधार के लिए एक बार इंजन जलाया गया, उड़ान दिन 5 पर 17.5 सेकंड; वह बनाने के लिए बहुत छोटा है।",
      "record": "6 अप्रैल को 17:56 UTC: Orion, Apollo 13 के 1970 के दूरी-रिकॉर्ड को पार करता है, पृथ्वी से 248 655 मील। उड़ाया गया।",
      "moon": "उड़ान दिन 6: Orion चंद्रमा के प्रभाव-क्षेत्र में प्रवेश करता है। वह कक्षा में नहीं बँधेगा: वह दूर वाले हिस्से का चक्कर लगाता है और घर की ओर गिरता है।",
      "los": "22:46 UTC: चंद्रमा के पीछे, 38 मिनट संपर्क से बाहर। उड़ाया गया।",
      "closest": "सबसे पास, 6 अप्रैल को 23:00 UTC: चंद्रमा के दूर वाले हिस्से से 6 545 किमी ऊपर। उड़ाया गया।",
      "far": "23:02 UTC: पृथ्वी से सबसे दूर, 406 771 किमी। उड़ाया गया।",
      "aos": "23:24 UTC: चंद्रमा के पीछे से फिर संपर्क। उड़ाया गया।",
      "home": "घर के चार दिन। लौटते समय सुधार के लिए तीन बार इंजन जलाए गए, 15, 9 और 8 सेकंड के; वे बनाने के लिए बहुत छोटे हैं।",
      "esmsep": "योजना: सर्विस मॉड्यूल वापसी से लगभग 20 मिनट पहले छोड़ दिया जाता है। छोड़ने का समय प्रकाशित नहीं; उड़ान-योजना का बनाया गया है।",
      "entry": "वायुमंडल में प्रवेश, योजना में समुद्र में उतरने से लगभग 13 मिनट पहले: 122 किमी ऊपर 11 किमी/सेकंड पर, गर्मी की ढाल दहकती हुई। योजना वाली उछलती वापसी की जगह एक ज़्यादा खड़ी सीधी वापसी आई। उड़ाया गया।",
      "drogue": "ड्रोग पैराशूट, फिर पायलट पैराशूट और तीन मुख्य छतरियाँ, 35 मीटर चौड़ी। उड़ाया गया; समय उड़ान-योजना के हैं।",
      "mains": "तीन मुख्य छतरियाँ कैप्सूल को समुद्र तक उतारती हैं।",
      "splash": "समुद्र में उतरना, 11 अप्रैल को 00:07:27 UTC (10 अप्रैल को 5:07 p.m. PDT), 32.3 उ. 117.8 प. San Diego के दक्षिण-पश्चिम में; USS John P. Murtha दल को निकालता है (जहाज़ बनाया नहीं गया)। नौ दिन, एक घंटा, 32 मिनट। उड़ाया गया।",
      "pathAscent": "उड़ान-योजना के घटना-समय, बीच की ऊँचाइयाँ और दूरियाँ हमारी; प्रक्षेपण और बूस्टर का अलग होना उड़ाए गए हैं",
      "pathTrip": "उड़ाई गई कक्षा, सबसे पास की दूरी और समुद्र में उतरने से पुनर्निर्मित, दो-पिंड चापों और चंद्रमा के चारों ओर एक अतिपरवलय की तरह; ट्रैकिंग डेटा नहीं",
      "srcWiki": "Wikipedia, Artemis II (क्या उड़ाया गया, समय और दूरियों के साथ; 2 नवंबर 2026 को पढ़ा गया)",
      "srcNasa": "NASA, Artemis II (उड़ान-योजना; रॉकेट और कैप्सूल का मॉडल: NASA 3D Resources)"
    }
  }
};

export const GLOSSARY = {
  "orbit": "किसी चीज़ के चारों ओर गुरुत्वाकर्षण से बँधा रास्ता। बगल की ओर काफ़ी तेज़ चलें तो आप पृथ्वी में गिरने की जगह उसके पास से गिरते ही रहते हैं।",
  "low Earth orbit": "लगभग 200 से 2000 किमी ऊपर की भीड़ वाली परत। स्टेशन, ज़्यादातर उपग्रह और ज़्यादातर मलबा यहीं हैं।",
  "geostationary": "35 786 किमी ऊपर की कक्षा जहाँ एक चक्कर उतने ही समय में पूरा होता है जितने में पृथ्वी एक बार घूमती है, 23 घंटे 56 मिनट। इसलिए उपग्रह एक जगह के ऊपर टिका लगता है।",
  "polar orbit": "ध्रुवों के ऊपर से गुज़रने वाली कक्षा। पृथ्वी नीचे घूमती रहती है, इसलिए उपग्रह आख़िर में उसका हर हिस्सा देख लेता है।",
  "elements": "छह संख्याएँ और एक तारीख़ जो एक कक्षा बताती हैं। इन्हें सही गणित में डालें तो एक जगह मिल जाती है।",
  "epoch": "वह पल जब कक्षा के तत्वों का एक सेट सही था। उससे जितना दूर जाएँ, जवाब उतना कम सटीक होता है।",
  "apogee": "पृथ्वी के चारों ओर की कक्षा का सबसे ऊँचा बिंदु।",
  "perigee": "पृथ्वी के चारों ओर की कक्षा का सबसे नीचा बिंदु।",
  "perihelion": "वह बिंदु जहाँ सूर्य का चक्कर लगाती कोई चीज़ उसके सबसे पास आती है।",
  "inclination": "कोई कक्षा भूमध्य रेखा के मुकाबले कितनी झुकी है। नब्बे डिग्री ध्रुवों के ऊपर से जाती है।",
  "propagated": "किसी पुराने माप से आगे बढ़ाकर निकाला हुआ। ताज़ा अवलोकन नहीं, और यह खिसकता जाता है।",
  "lunar distance": "पृथ्वी से चंद्रमा की दूरी, लगभग 384 000 किमी। क्षुद्रग्रहों के गुज़रने को नापने की सुविधाजनक पटरी।",
  "astronomical unit": "पृथ्वी से सूर्य की दूरी, लगभग 15 करोड़ किमी।",
  "light-time": "रोशनी को किसी दूरी को पार करने में कितना समय लगता है। रेडियो संदेश को भी उतना ही लगता है।",
  "light-year": "रोशनी एक जूलियन साल में जितनी दूरी तय करती है, लगभग 9.46 ट्रिलियन किमी। तारों के बीच की खाई नापने की पटरी।",
  "magnitude": "कोई चीज़ कितनी चमकीली दिखती है। पैमाना उलटा चलता है: छोटी संख्या ज़्यादा चमकीली होती है।",
  "azimuth": "डिग्री में कंपास की दिशा। शून्य उत्तर है, 90 पूर्व।",
  "elevation": "कोई चीज़ क्षितिज से डिग्री में कितनी ऊपर है। नब्बे सीधा ऊपर है।",
  "terminator": "किसी दुनिया पर दिन और रात के बीच की रेखा।",
  "twilight": "सूर्यास्त के बाद का समय जब आसमान अभी पूरा अँधेरा नहीं हुआ होता। उपग्रह तब सबसे आसानी से दिखते हैं।",
  "sunlit": "नीचे की ज़मीन अँधेरी होने पर भी अब तक धूप पकड़े हुए। यही उपग्रह को दिखाई देने लायक बनाता है।",
  "radiant": "आसमान का वह बिंदु जहाँ से कोई उल्का वर्षा आती लगती है।",
  "ZHR": "बिल्कुल अँधेरे आसमान में, उद्गम बिंदु सिर के ऊपर हो तो, घंटे में लगभग कितनी उल्काएँ दिखेंगी। आम तौर पर कम दिखती हैं।",
  "close approach": "जब कोई क्षुद्रग्रह पृथ्वी के पास से गुज़रता है। खगोल विज्ञान में “पास” का मतलब अक्सर चंद्रमा से भी दूर होता है।",
  "near-Earth object": "कोई क्षुद्रग्रह या धूमकेतु जिसकी कक्षा उसे पृथ्वी की कक्षा के पास लाती है।",
  "reentry": "जब कोई चीज़ वायुमंडल में वापस गिरती है। ज़्यादातर नीचे आते हुए जल जाती है।",
  "debris": "बेकार उपग्रह, इस्तेमाल हो चुके रॉकेट के चरण और टुकड़े। दसियों हज़ार टुकड़े ट्रैक किए जाते हैं।",
  "constellation": "तारों का एक नमूना जिसे लोगों ने बहुत पहले नाम दिया। उसके तारे आम तौर पर एक-दूसरे के पास कहीं नहीं होते।",
  "L1": "पृथ्वी और सूर्य के बीच एक संतुलन बिंदु, सूर्य की ओर लगभग 15 लाख किमी। सूर्य को देखने के लिए अच्छा।",
  "L2": "पृथ्वी से सूर्य के उलटी तरफ़ 15 लाख किमी पर एक संतुलन बिंदु, जहाँ टेलीस्कोप पृथ्वी और सूर्य को अपने पीछे रखकर ठंडा बना रह सकता है।",
  "transit": "जब आप जहाँ खड़े हैं वहाँ से एक चीज़ दूसरी के सामने से गुज़रती दिखती है।",
  "conjunction": "जब दो चीज़ें आसमान में पास-पास दिखती हैं। वे अंतरिक्ष में पास नहीं होतीं।",
  "ephemeris": "कोई चीज़ कहाँ होगी इसकी पहले से गणना करके निकाली गई तालिका।",
  "umbra": "छाया का बीच वाला गहरा हिस्सा, जहाँ रोशनी पूरी तरह रुक जाती है। चंद्रमा की प्रच्छाया में खड़े हों तो सूरज ग़ायब हो जाता है।",
  "penumbra": "छाया का बाहरी, हल्का हिस्सा, जहाँ रोशनी का केवल कुछ भाग रुकता है। पृथ्वी की उपच्छाया में चंद्रमा बस थोड़ा धुँधला होता है।",
  "totality": "पूर्ण ग्रहण के वे मिनट जब सूरज पूरी तरह ढक जाता है। आसमान इतना अँधेरा हो जाता है कि तारे दिखने लगते हैं।",
  "annular": "छल्ले के आकार का। वलयाकार ग्रहण में चंद्रमा इतना दूर होता है कि पूरे सूरज को नहीं ढक पाता, और उसके चारों ओर एक चमकीला छल्ला रह जाता है।"
};
