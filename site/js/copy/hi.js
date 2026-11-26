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
  review: { status: 'agent-reviewed', by: [], note: 'Machine-translated, agent-reviewed against the English on 2026-11-14 (terms, numbers, units, names, slots), with the pages a search engine reads. Not native-reviewed yet (docs/TRANSLATING.md, Review).' },
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
  "layerSentence": { "pha": "वे 2552 क्षुद्रग्रह जिनकी कक्षा पृथ्वी की कक्षा से 0.05 AU के भीतर आती है और जो लगभग 140 मीटर से बड़े हैं, हर एक वहाँ दिखाया गया है जहाँ वह आज JPL की कक्षा पर है। यह नाम आकार और कक्षा के लिए है, पूर्वानुमान नहीं।" },
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
    "backTo": "{where} पर वापस",
    "backChevron": "‹",
    "openChevron": "›",
    "results": "“{q}” के नतीजे",
    "search": "खोज",
    "sources": "स्रोत",
    "passport": "पासपोर्ट",
    "find": "ढूँढें",
    "catalogue": "कैटलॉग",
    "card": "कार्ड",
    "reopen": "{name} पर वापस",
    "close": "{name} बंद करें",
    "expand": "पैनल दिखाएँ",
    "collapse": "पैनल छिपाएँ",
    "panelKey": "[",
    "keyed": "{label} ({key})",
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
    "noteNoneWorld": "नक्शे में उस दिन {name} का कोई रास्ता नहीं है, इसलिए घड़ी वहीं रहती है जहाँ है। जिस दुनिया से उसकी मुलाक़ात हुई थी, वह किसी भी तारीख़ के लिए दिखाई जाती है।",
    "seeWorld": "उस दिन {world} देखें",
    "seeWorldTitle": "घड़ी को उस दिन पर ले जाएँ और {world} पर जाएँ। वहाँ {name} का चित्र नहीं बनाया जाता",
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
    "worldsTitle": "दुनियाएँ, पृथ्वी से अभी की दूरी",
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
    "models": "मॉडल",
    "modelsHref": "https://models.spaceradar.ai/",
    "video": "वीडियो",
    "videoHref": "https://video.spaceradar.ai/",
    "tour": "टूर लें",
    "menuTour": "टूर लें",
    "language": "भाषा"
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
    "roughTitle": "आज से एक हफ़्ते के बाद, उपग्रह की कक्षा में उसकी जगह का सिर्फ़ मोटा अनुमान मिलता है",
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
    "withParentFloor": "{name} को ख़ुद और भी बड़ा बनाया गया है, वरना देखने के लिए उसका आकार बहुत छोटा रहता।",
    "crowded": "{name} को उतना चौड़ा नहीं बनाया गया: इस आसमान में {near} सिर्फ़ {deg} डिग्री दूर है, और उतनी बड़ी चकती उसे ढक देती।"
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
    "tOutOfRange": "तारीख़ 1700 से 2200 के बाहर है। सबसे पास की तारीख़ दिखाई जा रही है।",
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
    "justHappenedTitle": "पिछले सात दिनों के प्रक्षेपण और वायुमंडल में वापसी",
    "calendar": "कैलेंडर",
    "calendarTitle": "“{title}” को अपने कैलेंडर में जोड़ें: एक .ics फ़ाइल डाउनलोड होती है",
    "calendarSaved": "सहेजा गया: {file}",
    "calendarFailed": "कैलेंडर फ़ाइल बन नहीं सकी",
    "sameName": "{name} ({id})",
    "title": "आगे क्या आ रहा है",
    "showAll": "सभी {n} दिखाएँ",
    "showFewer": "कम दिखाएँ",
    "now": "लगभग अभी",
    "inMinutes": "{n} मिनट में",
    "inHours": "{n} घंटे में",
    "todayAt": "आज {time} बजे",
    "tomorrowAt": "कल {time} बजे",
    "launch": "{name} का प्रक्षेपण {when} होगा",
    "launchRough": "{name} का प्रक्षेपण {when} के आसपास होगा — तारीख़ अभी पक्की नहीं है",
    "approach": "{name} का पृथ्वी के पास से गुज़रना {when} होगा, चंद्रमा की दूरी का {ld} गुना दूर से",
    "approachNoDistance": "{name} का पृथ्वी के पास से गुज़रना {when} होगा",
    "sizeM": "यह {n} मीटर चौड़ा है",
    "sizeKm": "यह {n} किमी चौड़ा है",
    "sizeRangeM": "लगभग {lo} से {hi} मीटर चौड़ा, इसकी चमक से आँका गया",
    "sizeRangeKm": "लगभग {lo} से {hi} किमी चौड़ा, इसकी चमक से आँका गया",
    "sizeMixed": "लगभग {lo} मीटर से {hi} किमी चौड़ा, इसकी चमक से आँका गया",
    "perihelion": "{when} {name} की सूर्य से दूरी सबसे कम होगी",
    "pass": "{name} का आपके ऊपर से गुज़रना {when} होगा",
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
      "june": "{date} को जून अयनांत: उत्तरी गोलार्ध का सबसे लंबा दिन, दक्षिणी का सबसे छोटा",
      "september": "{date} को सितंबर विषुव: दिन और रात हर जगह लगभग बराबर होते हैं",
      "december": "{date} को दिसंबर अयनांत: दक्षिणी गोलार्ध का सबसे लंबा दिन, उत्तरी का सबसे छोटा"
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
      "distanceToCentre": "इसके केंद्र तक की दूरी",
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
      "constellationCentre": "इसका केंद्र इस तारामंडल में है",
      "distanceRange": "दूरी, सबसे अच्छे अनुमान",
      "planetRadius": "चौड़ाई, पृथ्वी के हिसाब से",
      "planetMass": "द्रव्यमान, पृथ्वी के हिसाब से",
      "yearLength": "वहाँ का एक साल",
      "found": "खोजा गया",
      "catalogueCopy": "कैटलॉग की प्रति",
      "spectralType": "तारे का प्रकार",
      "brightness": "कितना चमकीला दिखता है",
      "luminosity": "दृश्य रोशनी की मात्रा",
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
      "sunsWide": "सूर्य का {n} गुना, अनुमानित",
      "sunsWideMeasured": "सूर्य का {n} गुना, मापा हुआ",
      "earths": "पृथ्वी का {n} गुना",
      "earthsWide": "पृथ्वी की चौड़ाई का {n} गुना",
      "lightYearsAbout": "लगभग {n} प्रकाश-वर्ष",
      "magnitudeVaries": "परिमाण लगभग {n}, बदलता रहता है",
      "magnitudeSpread": "परिमाण {n}, आकाश के {deg}° में फैला",
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
      "asOf": "{date} के अनुसार",
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
    "elementsOutLine": "इस तारीख़ के लिए कोई जगह नहीं: इसकी कक्षा {date} से लगभग एक महीने के भीतर ही पता है।",
    "notLaunchedLine": "इस तारीख़ के लिए कोई जगह नहीं: इसे {year} में छोड़ा गया था।",
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
        "toCentre": "केंद्र तक {u}",
        "speed": "{u}",
        "period": "{u} प्रति चक्कर",
        "distanceFromSun": "सूर्य से {u}",
        "distanceFromEarth": "पृथ्वी से {u}",
        "lightTime": "एक तरफ़ {u}",
        "spin": "{u} में एक चक्कर",
        "yearLength": "{u} में सूरज का एक चक्कर",
        "brightness": "परिमाण",
        "spectralType": "तारे का वर्ग",
        "across": "{u} चौड़ा",
        "lightLeft": "{u} दूर",
        "launched": "दिन से अंतरिक्ष में",
        "fromYou": "आपसे {u}",
        "heightAbove": "{u} ऊपर",
        "yearLong": "{u} में सूरज का एक चक्कर, यानी {y} पृथ्वी-वर्ष",
        "lightFromSun": "{u} में इसकी रोशनी हम तक पहुँचती है",
        "planetRadius": "{u} पृथ्वी की चौड़ाई",
        "planetMass": "{u} पृथ्वी का द्रव्यमान",
        "mass": "द्रव्यमान, {u} में",
        "other": "{u}"
      },
      "starClass": {
        "line": "{temp} {size}",
        "temp": { "O": "नीला", "B": "नीला-सफ़ेद", "A": "सफ़ेद", "F": "पीला-सफ़ेद", "G": "पीला", "K": "नारंगी", "M": "लाल" },
        "size": { "V": "मध्य-आयु का तारा", "IV": "उप-दानव तारा", "III": "दानव तारा", "II": "चमकीला दानव तारा", "I": "महादानव तारा", "VI": "उप-बौना तारा", "none": "तारा" },
        "brownDwarf": "भूरा बौना",
        "whiteDwarf": "श्वेत बौना",
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
    "spotsPaired": "{n} सौर धब्बों के समूह बनाए गए हैं, NOAA की {date} की सूची से, जिन्हें तब से सूर्य के घूमने ने आगे सरका दिया है। कई धब्बों वाले {pairs} समूहों को पश्चिम में एक अगला धब्बा और पूर्व में एक पिछला धब्बा बनाकर दिखाया गया है; दोनों के बीच की दूरी और क्षेत्रफल का बँटवारा सांकेतिक है। बाकी हर समूह एक गोल धब्बा है।",
    "spotsPairedOne": "एक सौर धब्बे का समूह बनाया गया है, NOAA की {date} की सूची से, जिसे तब से सूर्य के घूमने ने आगे सरका दिया है: पश्चिम में एक अगला धब्बा और पूर्व में एक पिछला धब्बा बनाकर। दोनों के बीच की दूरी और क्षेत्रफल का बँटवारा सांकेतिक है।",
    "regionsCredit": "आज के सौर धब्बों के समूह: NOAA Space Weather Prediction Center, सौर क्षेत्र सारांश",
    "flaresCredit": "सौर ज्वालाएँ: NOAA Space Weather Prediction Center, संपादित घटना सूची",
    "cmeCredit": "कोरोनल मास इजेक्शन: NASA DONKI (Moon to Mars Space Weather Analysis Office और CCMC)"
  },
  "clouds": {
    "live": "बादल: {when}, {ago}, {satellites} ने इन्फ़्रारेड में देखे, NASA GIBS के ज़रिए। सबसे ठंडी चोटियाँ, जहाँ गरज-चमक वाले तूफ़ान होते हैं, बाकी से ऊँची और ज़्यादा सफ़ेद बनाई गई हैं। यूरोप, अफ़्रीका, हिंद महासागर और ध्रुवों के ऊपर, जिन्हें इनमें से कोई उपग्रह नहीं देखता, बादल सांकेतिक हैं।",
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
      "live": "बिजली: जहाँ तक NOAA का नक्शा पहुँचता है, यानी अमेरिकी महाद्वीपों और प्रशांत महासागर में, वहाँ लगभग {n} बिजलियाँ प्रति मिनट गिरती हैं ({time} तक की उसकी गिनती, {ago})। कहाँ और कितनी बार, यह मापा हुआ है; हर चमक का पल बनाया गया है, और असली से बड़ा।",
      "quiet": "बिजली: जहाँ तक NOAA का नक्शा पहुँचता है, यानी अमेरिकी महाद्वीपों और प्रशांत महासागर में, वहाँ लगभग नहीं के बराबर ({time} तक की उसकी गिनती, {ago})।",
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
      "venus": "आँख को शुक्र लगभग सपाट दिखता है और वैसा ही बनाया गया है; पराबैंगनी की पट्टियाँ और Y नहीं बनाए गए, फीकी लकीरें सांकेतिक हैं। शुक्र पर बिजली की खबरें आई हैं और उस पर अभी बहस है; इसलिए कोई नहीं बनाई गई।",
      "uranus": "उत्तरी ध्रुव के ऊपर की चमकीली टोपी असली है: उसकी चमक और रंग, अक्षांश-दर-अक्षांश, Hubble के अक्टूबर 2025 के नक्शे से लिए गए हैं, और Hubble ने उसे साल-दर-साल चमकीला होते देखा है जैसे-जैसे 2028 की उत्तरी गर्मी पास आ रही है।",
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
    "family": "{name} की तरह बनाया गया — उसके परिवार का आकार और ऊँचाई, यह सटीक संस्करण नहीं",
    "generic": "एक आम रॉकेट की तरह बनाया गया; {name} के आकार हमारे पास नहीं हैं",
    "genericUnnamed": "एक आम रॉकेट की तरह बनाया गया; इस वाहन के आकार हमारे पास नहीं हैं",
    "disputed": "इसकी ऊँचाई पर स्रोत एकमत नहीं हैं ({disputed})",
    "objectVariant": "{name} के प्रकाशित आकारों से बनाया गया",
    "objectModel": "{name} के एक प्रकाशित मॉडल से बनाया गया",
    "padEmpty": "लॉन्च पैड एक मापी हुई जगह है; उस पर {name} को सिर्फ़ सूची के प्रक्षेपणों के आसपास बनाया जाता है",
    "objectMapped": {
      "dawn": "इसकी सतह Dawn यान का श्वेत-श्याम मोज़ेक है, जिस पर हमारा चुना हुआ एक स्लेटी रंग चढ़ाया गया है; इसके गड्ढों की छायाएँ वही हैं जो Dawn ने खींची थीं और यहाँ सूर्य के साथ नहीं हिलतीं"
    },
    "objectFamily": "{name} की तरह बनाया गया — इस तरह की चीज़, यह सटीक चीज़ नहीं",
    // b200-m2-buses: begin
    "objectBus": "बस (प्लेटफ़ॉर्म): {bus} ({source})। एक स्थानापन्न बस के साथ बनाया गया।",
    // b200-m2-buses: end
    "objectOwn": "{name} की तरह बनाया गया",
    "objectMade": {
      "images": "आकार तस्वीरों से बनाया गया; अनुपात लगभग",
      "render": "आकार कलाकार के बनाए चित्र से बनाया गया; अनुपात लगभग",
      "dimensions": "आकार प्रकाशित माप और तस्वीरों से बनाया गया; ब्योरे सरल किए गए",
      // b200-m4-buses: begin -- a geostationary bus built here from published sizes and the maker's renders (registry/geo-buses.yaml `made: renders`), machine-drafted
      "renders": "आकार प्रकाशित माप और निर्माता के चित्रों से बनाया गया; ब्योरे अनुमानित"
      // b200-m4-buses: end
    },
    "objectWas": {
      "hitomi": "पूरा दिखाया गया है, जैसा फ़रवरी 2016 में छोड़ा गया था; पाँच हफ़्ते बाद यह टूट गया, और यहाँ जिसे ट्रैक किया जा रहा है वह सौर पैनल के बिना उसका मुख्य हिस्सा है",
      "envisat": "स्थिर दिखाया गया है, उपकरण पृथ्वी की तरफ़ किए हुए, जैसे यह काम करते समय उड़ता था; यह 2012 से निष्क्रिय है और इसे कोई दिशा नहीं देता",
      "ers1": "स्थिर दिखाया गया है, उपकरण पृथ्वी की तरफ़ किए हुए, जैसे यह काम करते समय उड़ता था; इसका मिशन 2000 में खत्म हो गया और इसे कोई दिशा नहीं देता"
    },
    "attitude": {
      "lead": "यह किस ओर मुड़ा है, यह मॉडल से लिया गया है, मापा नहीं गया: {rule}",
      "rules": {
        "nadir": "एक सतह नीचे के पिंड की ओर, सौर पैनल सूर्य की ओर मुड़े हुए",
        "geo": "एक सतह पृथ्वी की ओर, सौर पैनल उत्तर-दक्षिण दिशा में",
        "lvlh": "पूरे चक्कर में वही हिस्सा नीचे और वही सिरा आगे",
        "sun": "एक हिस्सा सूर्य की ओर, नज़र आकाश के एक ही स्थान पर",
        "earth": "डिश एंटीना पृथ्वी की ओर",
        "spin": "डिश एंटीना पृथ्वी की ओर, और यान उसी रेखा के चारों ओर घूमता हुआ"
      }
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
      "spin": "यह अपने मापे हुए ध्रुव के चारों ओर मापी हुई रफ़्तार से घूमता है; इस पल कौन सा हिस्सा सूर्य की ओर है, यह कोई पूर्वानुमान नहीं है",
      "pair": "दोनों अपने मापे हुए ध्रुव के चारों ओर मापी हुई रफ़्तार से घूमते हैं, और डिमॉर्फ़ॉस उस दूरी और अवधि पर चक्कर लगाता है जो DART के टकराने के बाद मापी गई; उस कक्षा में वह कहाँ है, यह सांकेतिक है",
      "comet": "यह अपने मापे हुए ध्रुव के चारों ओर उस रफ़्तार से घूमता है जो 2014 में मापी गई थी, और सूर्य हर बार पास से गुज़रने पर उसे कुछ मिनटों से बदल चुका है; इस पल कौन सा हिस्सा सूर्य की ओर है, यह कोई पूर्वानुमान नहीं है",
      "still": "यह अपने रडार मॉडल की दिशा में बनाया गया है और यहाँ घूमता नहीं: मॉडल यह नहीं बताता कि इसकी घूर्णन धुरी किस ओर है",
      "moonSpin": "यह हर समय एक ही फलक शनि की ओर रखता है और IAU के स्थिरांकों द्वारा दिए गए ध्रुव के चारों ओर हर परिक्रमा में एक बार घूमता है; इस क्षण कौन-सा पक्ष कैमरे की ओर है, यह उसी सूत्र से तय होता है, पूर्वानुमान नहीं",
      "moonStill": "इसे इसके मॉडल के दिशा में बनाया गया है और यहाँ यह घूमता नहीं: इस ऐप के पढ़े स्थिरांकों में इसके लिए कोई स्थिर ध्रुव और घूर्णन दर नहीं दी गई है"
    },
    "objectSeen": {
      "lutetia": "Rosetta की तस्वीरों ने इसकी आधी से ज़्यादा सतह को ढका; बाकी आकार इसकी चमक के बदलावों से बैठाया गया है, खींचा हुआ नहीं",
      "steins": "Rosetta की तस्वीरों ने इसकी लगभग 60 प्रतिशत सतह को ढका; बाकी आकार इसकी चमक के बदलावों से बैठाया गया है, खींचा हुआ नहीं",
      "donj": "आकार Lucy की तस्वीरों से, स्टीरियो फ़ोटोग्रामेट्री और रूपरेखा बैठाकर बनाया गया है; जो तरफ़ Lucy ने नहीं देखी, वह इस बैठाने का अनुमान है",
      "arrokoth": "New Horizons की तस्वीरें उसी तरफ़ की हैं जिसके पास से वह गुज़रा; दूसरी तरफ़ का अनुमान लगाया गया है, तस्वीर नहीं खींची गई, और रंग उसका एल्बीडो नक्शा है, जिस पर लाल रंगत चढ़ाई गई है",
      "radar": "आकार रडार की गूँज से बना है, तस्वीरों से नहीं: इसकी रूपरेखा मापी हुई है और सबसे बारीक ब्योरे नहीं",
      "comet": "आकार Rosetta का है, दो साल में खींची 20 000 से ज़्यादा तस्वीरों से, और पूरी सतह ढकी हुई है",
      "cassini": "आकार Cassini के चित्रों से बना है और अनिश्चितता आम तौर पर आधे किलोमीटर से बहुत कम है; जो हिस्सा Cassini ने नहीं देखा, वह बैठाए गए आकार का है, तस्वीर का नहीं"
    },
    "objectRelief": "मॉडल सरल किया गया है, और उस पर जो बारीक उभार हैं वे पूरे मॉडल के अपने हैं, सतह में पहले से ही जुड़े हुए",
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
      "portrait": "यह कार्ड खुला रहने तक इसका एक मॉडल इसकी जगह पर बनाया जाता है, यहाँ से दिखने वाले आकार से कहीं बड़ा: छाया और उसके चारों ओर मुड़ी रोशनी वैसी है जैसी उसका द्रव्यमान उन्हें बनाता है, डिस्क मॉडल से बनी है",
      "sstars": "जब आप इसके लगभग एक प्रकाश-वर्ष के भीतर आते हैं, तो इसकी परिक्रमा करने वाले तारे उनकी मापी गई कक्षाओं पर बनाए जाते हैं: 39 तारे (S2 GRAVITY के फ़िट से, बाकी गिलेसन और अन्य, 2017 से), हर एक वहाँ जहाँ घड़ी उसे उसकी कक्षा पर रखती है; उनके आकार और रंग उदाहरण-मात्र हैं, और छेद की तस्वीर उनके लिए जगह छोड़ देती है"
    },
    "worldDeparture": {
      "earth": "बड़ी स्क्रीन पर इसके पहाड़ NOAA की ETOPO 2022 ऊँचाइयों से हैं, असली से {relief} गुना ज़्यादा खड़े बनाए गए ताकि नीचा सूर्य उन्हें दिखा सके; इसके किनारे पर हवा की दमक हवा से {air} गुना ऊँची बनाई गई है; निचली कक्षा से बड़ी स्क्रीन पर इसके बादल क्षितिज की ओर और नीचे सूर्य की रोशनी में ऊपर उठे दिखते हैं, असली से {clouds} गुना मोटे बनाए गए ताकि उनका झुकाव, उनकी लंबी छायाएँ और उनके शिखरों पर आख़िरी रोशनी दिख सके (मापा हुआ रूप में उनकी असली मोटाई पर), हर शिखर की ऊँचाई वहाँ उसके मापे तापमान से जहाँ आज की तस्वीर पहुँचती है और बाकी जगह बादल-नक्शे की चमक से",
      "mercury": "बड़ी स्क्रीन पर इसका उभार MESSENGER के ऊँचाई मॉडल से है, मापे से {steep} गुना ज़्यादा खड़ा बनाया गया ताकि गड्ढों के किनारे रोशनी पकड़ सकें",
      "pluto": "इसकी उजली और गहरी ज़मीन कैमरे की तस्वीर से {plutoContrast} गुना ज़्यादा कंट्रास्ट में बनाई गई है, जो मापे हुए एल्बीडो के ज़्यादा पास है; जो तरफ़ New Horizons ने सिर्फ़ दूर से देखी, उसे उसके अपने तीखेपन तक कोमल किया गया है; बड़ी स्क्रीन पर इसका उभार New Horizons की स्टीरियो ऊँचाइयों से है, जहाँ वे हैं, मापे से {plutoSteep} गुना ज़्यादा खड़ा; किनारे की पतली नीली धुंध एक दमक की तरह बनाई गई है, जो सूर्य के सामने सबसे चमकीली है, और उसकी ताक़त हमारी चुनी हुई है",
      "mars": "बड़ी स्क्रीन पर इसका उभार उन ऊँचाइयों से है जो Mars Global Surveyor के लेज़र ऊँचाईमापी ने मापीं, असली से {mola} गुना ज़्यादा खड़ी और ऊँची बनाई गईं ताकि नीचा सूर्य उन्हें दिखा सके: ओलंपस मॉन्स और घाटी की दीवारें जो छायाएँ डालती हैं, वे उतने गुना ज़्यादा लंबी हैं।",
      "venus": "इसके किनारे के चारों ओर और दिन वाले हिस्से के पार की दमक गहरी धुंध को दिखाती है; वह कितनी मोटी बनाई गई और कितनी दूर तक जाती है, यह सांकेतिक है; इसके बादल वैसे बनाए गए हैं जैसे आँख उन्हें देखती है, एक हल्का मलाईदार चक्र, जिसकी धारियों का कंट्रास्ट उस कलाकार के नक्शे के कंट्रास्ट का {uv} गुना है जिससे इसे बनाया गया, दोनों रूपों में; हल्की धारियाँ कहाँ हैं यह सांकेतिक है, और पराबैंगनी कैमरों को दिखने वाली गहरी पट्टियाँ और Y नहीं बनाए गए; इसकी ज़मीन, रडार से, Magellan के ऊँचाईमापी के उभार में है, मापे से {ground} गुना ज़्यादा खड़ी और ऊँची बनाई गई",
      "neptune": "सिनेमा रूप में इसके बाहरी छल्ले की पाँच चापें वैसे बनाई गई हैं जैसे Voyager 2 ने उन्हें 1989 में देखा, अपनी मापी रफ़्तार से घूमती हुई; वे आज छल्ले में कहाँ हैं, इसकी गणना नहीं की गई, और उनमें से दो तब से फीकी पड़ चुकी हैं या खिसक गई हैं",
      "saturn": "इसकी पट्टियाँ नक्शे से {contrast} गुना ज़्यादा कंट्रास्ट में बनाई गई हैं, जो हमारा किया हुआ बदलाव है; “Hubble की नज़र से” में कोई बदलाव नहीं है; बड़ी स्क्रीन पर और पास से, इसके छल्लों की बारीक पट्टियाँ और दरारें वहीं हैं जहाँ Cassini ने 2008 में एक तारे की रोशनी के आर-पार उन्हें मापा, नक्शे के ऊपर रखी गईं, और सिनेमा रूप में और पास से कणों की झिलमिलाहट बनाई गई है; बड़ी स्क्रीन पर सिनेमा रूप में छल्लों से कुछ किलोमीटर के भीतर इनके सबसे बड़े कण, दो से पाँच मीटर चौड़े, बर्फ़ की गेंदों की तरह बनाए गए हैं: कितने और कितने बड़े, यह आकारों के मापे फैलाव और छल्लों की प्रकाशीय गहराई से तय है, पर हर कण कहाँ है, और A छल्ले के गुच्छे, सांकेतिक हैं, और वे स्थिर बनाए गए हैं, मानो आप उनके साथ-साथ सवार हों",
      "titan": "इसकी धुंध के ठीक ऊपर, लगभग 500 किमी की ऊँचाई पर, धुंध की एक पतली अलग परत वहाँ बनाई गई है जहाँ Cassini ने उसे 2005 से 2007 में देखा; उसके बाद के सालों में वह नीचे बैठ गई और फीकी पड़ी, और वह अब कहाँ है, यह पता नहीं"
    },
    "worldEarthshine": "इसका अँधेरा हिस्सा पृथ्वी की अपनी रोशनी, यानी पृथ्वी-प्रकाश से चमकता है, जो उस कैमरे के पकड़ने से {n} गुना ज़्यादा चमकीला बनाया गया है, लगभग जैसा आँख देखती है",
    "worldAir": "इसकी हवा असली से {n} गुना मोटी बनाई गई है ताकि वह इस आकार में दिखे, और इसकी धुंध का रंग सांकेतिक है",
    "worldAirTrue": "इसकी धुंध अपनी मापी हुई ऊँचाई पर बनाई गई है, और इसका रंग सांकेतिक है",
    "worldRings": "इसके छल्ले अपनी मापी हुई दूरियों पर हैं, असली से {w} गुना चौड़े और कहीं ज़्यादा चमकीले बनाए गए ताकि वे दिखें: असली छल्ले कोयले जितने काले धागे हैं, और अँधेरे आसमान के सामने वे मुश्किल से दिखते",
    "worldRingsDense": "इसके छल्ले अपनी मापी हुई दूरियों पर हैं, असली से {w} गुना चौड़े, {d} गुना ज़्यादा अपारदर्शी और कहीं ज़्यादा चमकीले बनाए गए ताकि वे दिखें: असली छल्ले कोयले जितने काले धुँधले धागे हैं, और अँधेरे आसमान के सामने वे मुश्किल से दिखते",
    "worldSun": "इसे सफ़ेद बनाया गया है, जैसा आँख देखती है, उस नारंगी में नहीं जिसमें कई तस्वीरें इसे रंग देती हैं: इसका नक्शा प्रकाशक का है, जिसे सफ़ेद कर दिया गया है और बस हल्के धब्बे रखे गए हैं; पास से इसका किनारा गहरा और लाल होता दिखता है, जैसा इसके वायुमंडल का मॉडल कहता है; दानेदार बनावट इसकी खौलती सतह को दिखाती है: इसकी कोशिकाएँ असली दानों की तरह जन्म लेती हैं, चमकती हैं और फीकी पड़ती हैं, असली से मोटी (बहुत पास से असली आकार तक) और कहीं ज़्यादा तेज़ बनाई गई हैं, और किनारे की ओर चमकीला जाल सांकेतिक है; बहुत पास से तस्वीर वाला नक्शा उस बनाई हुई सतह में बदल जाता है, जो खुद भी सांकेतिक है; कोरोना सांकेतिक है, और असली से कहीं ज़्यादा चमकीला बनाया गया है ताकि दिख सके; किनारे के लूप और झाड़ियाँ वहाँ हैं जहाँ NOAA के सक्रिय क्षेत्र किनारे के पास हैं, और उनके आकार और ऊँचाइयाँ सांकेतिक हैं; इसके बगल के तारे फीके हैं, क्योंकि इसकी चौंध उन्हें किसी भी कैमरे से छिपा लेती है",
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
    "startTitle": "इस सफ़र पर उड़ें",
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
    "systemLine": "आकार और कक्षाएँ NASA Exoplanet Archive से; रंग और कक्षाओं का झुकाव सांकेतिक हैं।",
    "systemLineGuessed": "आकार और कक्षाएँ NASA Exoplanet Archive से; रंग, ग्रहों की अपनी कक्षाओं में जगहें और कक्षाओं का झुकाव सांकेतिक हैं।",
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
    "early": "{date} तक Pro के लिए पहले पहुँच, फिर सभी के लिए मुफ़्त।",
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
    "approachNone": "NASA JPL की पास से गुज़रने वालों की तालिका लोड नहीं हुई, इसलिए अगला कोई नहीं बताया गया।",
    "satellitesCount": "CelesTrak से इस पन्ने ने जो कैटलॉग लोड किया उसमें {n} चालू उपग्रह हैं, जिनमें {starlink} Starlink के हैं।",
    "satellitesLoading": "कैटलॉग अभी लोड हो रहा है; लोड होते ही गिनती दिखेगी।",
    "portraitLine": "एक मॉडल, तस्वीर नहीं: छाया और उसके चारों ओर मुड़ी रोशनी का छल्ला वैसे हैं जैसे उसका द्रव्यमान उन्हें बनाता है, चमकती डिस्क मॉडल से बनी है, और पीछे के तारे मुड़े नहीं हैं। यह यहाँ से दिखने वाले आकार से कहीं बड़ा बनाया गया है; इसकी जगह मापी हुई है। Event Horizon Telescope की तस्वीर इसके कार्ड पर है: {credit} · {licence}।",
    "tonightUp": "आज रात {place} से: {begin} से {end} तक ऊपर, {time} पर सबसे ऊँचा, {az} में {alt}।",
    "tonightGlare": "आज रात {place} से: {name} सूर्य के इतने पास है कि उसे देखा नहीं जा सकेगा।",
    "tonightDown": "आज रात {place} से: जब तक आसमान अँधेरा है, {name} क्षितिज के ऊपर नहीं है।",
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
      "upPast": "{place} से: अभी ऊपर है, {alt}, {dir} में। सबसे ऊँचे बिंदु को पार कर चुका; {set} पर {setDir} में डूबता है।",
      "never": "{place} से यह अगले डेढ़ दिन में नहीं उगता।",
      "always": "{place} से: अभी ऊपर है, {alt}, {dir} में। यह आज डूबता नहीं।",
      "honest": "समुद्र-तल के क्षितिज के हिसाब से गणना करके निकाला; पहाड़ियाँ और घर इसमें नहीं हैं।"
    },
    "worldNoRise": "इसे आप अपनी आँखों से देख सकते हैं। अपनी जगह बताएँ, तो यह पंक्ति बता देगी कि वहाँ से यह कब उगता और कब डूबता है।",
    "worldSee": {
      "pluto": "न आँख से, न दूरबीन से: प्लूटो आपके देखे जा सकने वाले सबसे धुँधले तारे से लगभग 3 000 गुना धुँधला है, इसलिए टेलीस्कोप चाहिए।",
      "io": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "europa": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "ganymede": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "callisto": "आम दूरबीन में यह बृहस्पति के बगल में रोशनी के एक बिंदु जैसा दिखता है; आँख से यह बृहस्पति की चौंध में खो जाता है।",
      "titan": "आँख से नहीं: टाइटन अपनी सबसे चमकदार हालत में परिमाण 8.2 का है, इसलिए छोटा टेलीस्कोप या दमदार दूरबीन चाहिए, और बगल में शनि की चौंध इसे भी मुश्किल बना देती है।",
      "enceladus": "आँख से नहीं: एन्सेलेडस परिमाण 11.7 का है, और चमकीले शनि और उसके छल्लों के इतने पास है कि छोटे टेलीस्कोप से भी देखना मुश्किल है।",
      "triton": "न आँख से, न दूरबीन से: ट्राइटन परिमाण 13.5 का है, आपके देखे जा सकने वाले सबसे धुँधले तारे से लगभग 600 गुना धुँधला, इसलिए टेलीस्कोप चाहिए।",
      "charon": "मुश्किल से: शैरन परिमाण 16.8 का है, आपके देखे जा सकने वाले सबसे धुँधले तारे से 13 000 गुना धुँधला, और प्लूटो के इतने पास कि 2008 में शौकिया लोग 14 इंच के टेलीस्कोप से तस्वीर खींचकर ही इस जोड़ी को अलग-अलग देख पाए।",
      "phobos": "आँख से नहीं: फ़ोबोस अपनी सबसे अच्छी हालत में परिमाण 11.3 का है और मंगल से चिपका रहता है, जिसकी चौंध इसे डुबो देती है; यह 1877 में 26 इंच के टेलीस्कोप से खोजा गया था।",
      "deimos": "आँख से नहीं: डीमोस अपनी सबसे अच्छी हालत में परिमाण 12.4 का है और मंगल के पास है, जिसकी चौंध इसे डुबो देती है; यह 1877 में 26 इंच के टेलीस्कोप से खोजा गया था।",
      "neptune": "आँख से नहीं: वरुण परिमाण 7.7 से 7.9 का है, बिना मदद के देखने के लिए बहुत धुँधला। दमदार दूरबीन या टेलीस्कोप इसे एक छोटी नीली चकती की तरह दिखाते हैं।",
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
    "layerName": {
      "worlds": "ग्रह और चंद्रमा",
      "stars": "तारे",
      "exoplanets": "दूसरे तारों के ग्रह",
      "systems": "तारा प्रणालियाँ",
      "deep-sky": "नीहारिकाएँ, तारागुच्छ और आकाशगंगाएँ",
      "galaxy": "आकाशगंगा",
      "exotics": "ब्लैक होल और दूसरे चरम पिंड",
      "extremes-more": "मैग्नेटार और मृत तारे",
      "pulsars": "पल्सर",
      "beyond-more": "स्थानीय समूह और गुच्छ",
      "quasars": "क्वासर",
      "stations": "मानवयुक्त स्टेशन",
      "notable": "जानने लायक उपग्रह",
      "starlink-trains": "नई स्टारलिंक कतारें",
      "just-launched": "अभी-अभी छोड़े गए",
      "active": "सभी सक्रिय उपग्रह",
      "geo-ring": "भूस्थिर वलय",
      "debris-notable": "मशहूर मलबा",
      "debris-field": "सारा ट्रैक किया गया मलबा",
      "launches": "ऊपर जाते रॉकेट",
      "asteroids": "पास से गुज़रते क्षुद्रग्रह",
      "far-bodies": "बौने ग्रह और दूर के यात्री",
      "moons": "ग्रहों के चंद्रमा",
      "companions": "क्षुद्रग्रहों और TNO के चंद्रमा",
      "pha": "खतरनाक क्षुद्रग्रह",
      "comets": "धूमकेतु",
      "deep-space": "यान और दूरबीनें",
      "visual": "आँख से दिखने लायक चमकीले",
      "ground-sites": "लॉन्च पैड, डिश और वेधशालाएँ",
      "hand-kept-sites": "डिश, लैंडर और रोवर",
      "storms": "अभी के उष्णकटिबंधीय तूफ़ान",
      "aurora": "ध्रुवीय ज्योति",
      "lightning": "बिजली",
      "earth-events": "आग, ज्वालामुखी और हिमखंड",
      "reentries": "जो चीज़ें नीचे गिरीं",
      "oddities": "हमारी भेजी अजीब चीज़ें",
      "observatories": "सभी वेधशालाएँ",
      "launch-sites": "सभी प्रक्षेपण स्थल",
      "landing-sites": "हर लैंडिंग और टक्कर की जगह",
      "meteor-showers": "उल्का वर्षा"
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
    "fallback": "इससे शुरू होने वाला कुछ नहीं है। इनके नाम में यह शामिल है।",
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
    "fellBack": "फ़्रेम धीमे थे: क्वालिटी वापस “अपने आप” पर है।",
    "restore": "पूरी क्वालिटी में दोबारा लोड करें",
    "restoreTitle": "इस दृश्य को उस क्वालिटी पर दोबारा लोड करें जो आपका डिवाइस संभाल सकता है।"
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
    "exotic": "चरम स्थिति वाली चीज़",
    "storm": "उष्णकटिबंधीय चक्रवात",
    "earthevent": "पृथ्वी की घटना",
    "oddity": "अजूबा",
    "shower": "उल्का वर्षा",
    "unknown": "चीज़"
  },
  "cls": {
    "nearEarthApprox": "पृथ्वी के इतने पास इसकी जगह सिर्फ़ लगभग बताई जा सकती है: बनाई गई कक्षा सिर्फ़ सूर्य के चारों ओर की है और पृथ्वी के खिंचाव को छोड़ देती है।",
    "label": "हमें इसकी जगह कैसे पता है",
    "measured": "मापी हुई जगह",
    "inferred": "{n} {unit} पुराने तत्वों से आगे बढ़ाई गई जगह",
    "inferredBefore": "तत्वों की तारीख़ से {n} {unit} पीछे गिनकर निकाली गई जगह",
    "noPositionForDate": "इस तारीख़ के लिए कोई जगह नहीं दिखाई गई",
    "inferredUnknownAge": "ऐसे तत्वों से, जिनकी उम्र पता नहीं, आगे बढ़ाई गई जगह",
    "inferredNoElements": "जगह मापी नहीं गई, गणना से निकाली गई",
    "stormAdvisory": "{time} UTC की सूचना के समय इसका केंद्र, {ago}; तूफ़ान चलता है, इसलिए तब से वह खिसक चुका है",
    "stormAdvisoryDated": "{date} की {time} UTC की सूचना के समय इसका केंद्र, {ago}; तूफ़ान चलता है, इसलिए तब से वह खिसक चुका है",
    "illustrative": "यह दिखाने के लिए बनाया गया कि यह कहाँ जाता है; असली रास्ता सार्वजनिक नहीं है",
    "placeIllustrative": "इसकी असली कक्षा, CelesTrak के कैटलॉग से, पर उस पर एक गढ़ी हुई जगह; इसके लिए हमारे पास अभी के तत्व नहीं हैं",
    "sample": "साथ आया नमूना डेटा, लाइव जगह नहीं",
    "provisional": "अभी सार्वजनिक कैटलॉग में नहीं है — ये संचालक के अपने तत्व हैं, जो CelesTrak के ज़रिए प्रकाशित हुए; स्थायी नंबर तब आएगा जब Space-Track इसे सूची में डालेगा",
    "unknown": "हम नहीं बता सकते कि यह जगह कैसे निकाली गई",
    "unplaced": "किसी को नहीं पता कि यह कहाँ है, इसलिए इसके लिए कुछ नहीं बनाया गया",
    "shower": "आसमान में एक दिशा: इस उल्का वर्षा के लिए IAU के प्रकाशित हलों का माध्यिका",
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
    "lessThan": "{v} से कम",
    "moreThan": "{v} से अधिक",
    "methods": {
      "parallax": "लंबन: दूर के आसमान के सामने इसके तारे का खिसकना",
      "eclipsing-binary": "इसमें मौजूद ग्रहण लगाने वाले जोड़ीदार तारे",
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
        "split": "मापा हुआ: कुछ हज़ार प्रकाश-वर्ष के भीतर के तारे (Gaia), पट्टी का कोण, भुजाओं के साथ की दिशाएँ और पास की भुजाएँ (Reid et al. 2019)। अनुमान से: केंद्र के पार का दूर वाला हिस्सा, जो धूल के पीछे छिपा है; इसकी भुजाएँ पास वाली भुजाओं को आगे घुमाकर बनाई गई हैं। चार तारा-धाराएँ (धनु, ऑर्फ़न-चेनाब, GD-1, पैलोमर 5) galstreams पुस्तकालय (Mateu 2023) से खींची गई हैं: हर एक आकाश में कहाँ है यह मापा गया है, और उसकी दूरी भी, सिवाय GD-1 के, जिसकी दूरी मानी गई है; हर रेखा के आसपास तारों की पट्टी केवल चित्रात्मक है।"
      },
      "dso-local-bubble": {
        "drawn": "मापे गए नक्शे से लिए गए धूल के बिंदु",
        "split": "मापा हुआ: धूल कहाँ है और कितनी घनी है, 8 पारसेक के खानों में, Gaia की तारों की रोशनी से (Edenhofer व अन्य, 2024), और उसी से सूर्य के चारों ओर का खोखला: 40 पारसेक के भीतर कोई धूल नहीं और औसतन 170 पारसेक पर एक दीवार, लगभग 35 मोटी (O’Neill व अन्य, 2024)। मॉडल से: हर बिंदु उसी घनत्व से लिया गया एक यादृच्छिक नमूना है, न कोई कण और न कोई बादल, और धूल अभी अपने पीछे के तारों को मंद नहीं करती। चित्रात्मक: गर्म रंग, क्योंकि तारों के सामने धूल काली होती है। यहाँ नहीं मापा गया: खोखले के भीतर की गैस, उसकी उम्र और वह कैसे बना। शोध-पत्र केंद्र नहीं बताता; यह प्रविष्टि उस बीच में है जो बिंदु दिखाते हैं, लगभग 10 पारसेक की सटीकता से। किसी खगोलशास्त्री ने अभी इसकी समीक्षा नहीं की है।"
      }
    }
  },
  "truth": {
    "label": "हमें कैसे पता है",
    "hints": {
      "measured": "मापा हुआ",
      "inferred": "मॉडल से बना",
      "illustrative": "सांकेतिक",
      "sample": "नमूना",
      "unknown": "पता नहीं",
      "unplaced": "जगह तय नहीं",
      "reconstruction": "पुनर्निर्मित",
      "model": "अपनी श्रेणी का सामान्य रूप",
      "photograph": "तस्वीर",
      "catalogue": "कैटलॉग",
      "illustration": "सांकेतिक"
    },
    "placeWord": "स्थान: {word}",
    "pictureWord": "चित्र: {word}",
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
    "earthsEstimated": "पृथ्वी की चौड़ाई का {n} गुना, आर्काइव का अनुमान, इसके द्रव्यमान से",
    "massEstimated": "पृथ्वी का {n} गुना, आर्काइव का अनुमान, इसके आकार से",
    "massLeast": "कम से कम पृथ्वी का {n} गुना",
    "massLimit": "पृथ्वी के {n} गुना से कम: यह ऊपरी सीमा है, माप नहीं",
    "massLimitKnown": "इसके द्रव्यमान की केवल ऊपरी सीमा ज्ञात है।",
    "sizeDefault": "मापा नहीं गया: पृथ्वी जितना बनाया गया",
    "temperature": "{k} K ({c} °C), अगर यह अपनी रोशनी का {pct} % पृथ्वी की तरह लौटाता है",
    "zone": {
      "inside": "इसके भीतर",
      "edge": "इसके किनारे पर: सिर्फ़ चौड़ी सीमाओं के भीतर",
      "hotter": "तारे के इससे ज़्यादा पास",
      "colder": "तारे से इससे ज़्यादा दूर"
    },
    "zoneNone": {
      "too-hot": "गणना नहीं की गई: सूत्र इतने गर्म तारे पर लागू नहीं होता",
      "too-cool": "गणना नहीं की गई: सूत्र इतने ठंडे तारे पर लागू नहीं होता",
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
        "orbits": "टूटे छल्ले हमारे अपने सौरमंडल की कक्षाएँ हैं, पैमाने के लिए। यहाँ कुछ भी इनके अनुसार नहीं चलता।",
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
  "groundDoor": {
    "stand": "यहाँ खड़े हों",
    "drive": "यहाँ खड़े हों और चलाएँ",
    "standTitle": "{name} की मापी हुई ज़मीन पर खड़े हों",
    "driveTitle": "{name} की मापी हुई ज़मीन पर खड़े हों और रोवर चलाएँ",
    "noDrive": "यह रोवर यहाँ नहीं चलाया जा सकता: ऐप में इसकी ज़मीन अभी मापी नहीं गई है। Curiosity, Perseverance, Zhurong और Opportunity चलाए जा सकते हैं, उनके अपने कार्ड से।"
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
    "done": "हो गया",
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
      "storm": "उष्णकटिबंधीय चक्रवात",
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
    "asterism": "{name} में तारों की आकृति",
    "fleet": "उपग्रहों का समूह · ग्लोब पर इसे चमकाने के लिए दबाएँ",
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
      "crew": "Launch Library 2",
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
    "noSeen": "अभी कुछ टिक नहीं किया। कार्ड पर “मैंने देखा” बटन होता है।",
    "seenIt": "मैंने देखा",
    "toolsLabel": "इस चीज़ के लिए और",
    "seenOn": "{date} को देखा",
    "seenTitleOff": "जब इसे अपनी आँखों से देख लें तब टिक करें",
    "seenTitleOn": "देखा हुआ टिक है। टिक हटाने के लिए दबाएँ",
    "seenNotKept": "यह ब्राउज़र कुछ नहीं रखता, इसलिए टिक टिकेगा नहीं",
    "remind": "याद दिलाएँ",
    "remindTitle": "याद दिलाने वाली कैलेंडर फ़ाइल डाउनलोड होती है: {title}",
    "forget": "मुझे भूल जाएँ",
    "forgetConfirm": "हाँ, भूल जाएँ",
    "forgetTitle": "यहाँ से पासपोर्ट, दिल और आवाज़ का चुनाव मिटा देता है",
    "forgotten": "भुला दिया। इस ब्राउज़र में अब कुछ नहीं है।",
    "stamp": "सफ़र {n} / {total} · {date}",
    "stampPlaces": "अब तक खोला: {places}",
    "resume": "पड़ाव {n} से जारी रखें"
  },
  "kept": {
    "title": "यह साइट आपके डिवाइस पर क्या रखती है",
    "lines": [
      "आपका पासपोर्ट: खोली हुई जगहें, पूरे किए सफ़र, देखा हुआ करके टिक की गई चीज़ें।",
      "आपके दिल: वे चीज़ें जिन्हें आपने पसंदीदा में रखा है।",
      "आपकी आवाज़ और बोलने वाली आवाज़ का चुनाव, और आपने पैनल कैसे छोड़े थे।",
      "आख़िरी बार पढ़े डेटा की एक प्रति, ताकि नक्शा बिना कनेक्शन के भी खुले।",
      "जब कोई स्क्रीन अपने आप चलती है, तब उसके सफ़रों का एक छोटा लॉग, सिर्फ़ इसी टैब के लिए।"
    ],
    "place": "आपकी जगह एक डिग्री के दसवें हिस्से तक गोल की जाती है और सिर्फ़ तब तक रखी जाती है जब तक यह पन्ना खुला है।",
    "none": "इनमें से कुछ भी कहीं नहीं भेजा जाता। नक्शे के लिए खाते की ज़रूरत नहीं, और एनालिटिक्स तभी चलता है जब आप हाँ कहें। पासपोर्ट में “मुझे भूल जाएँ” पासपोर्ट और आवाज़ का चुनाव मिटा देता है।"
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
    "storyCameDown": "उस हफ़्ते नीचे आया: {things}।",
    "storyCameDownBiggest": "उस हफ़्ते नीचे आया: {things}; इनमें सबसे बड़ी चीज़ {name} थी।",
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
    "colour": "उस रंग में बनाया गया जो इसकी रोशनी से मापा गया (B−V {bv}, V−R {vr}), उतना चमकीला जितना इसकी सतह लौटाती है (एल्बीडो {albedo}), एक ऐसे पैमाने पर जो इतना दबाया गया है कि इन दुनियाओं में सबसे गहरी भी दिखे।",
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
        "surface": "बादलों के नीचे की ज़मीन, जिसे NASA के Magellan ने 1990 से 1992 के बीच कक्षा से रडार से नक्शे पर उतारा। चमकीला खुरदरी ज़मीन है और गहरा चिकनी। नारंगी रंग जोड़ा गया है, और जो पट्टियाँ Magellan से छूट गईं उन्हें उनके किनारों से भरा गया है। इस पर सूर्य की रोशनी ऐसे पड़ती है मानो बादल हों ही नहीं: इसके पहाड़ और ढलानें, Magellan के ऊँचाईमापी से, छह गुना ऊँची बनाई गईं, अपनी छायाएँ डालते हैं। यह बादलों के साथ नहीं हिलती।"
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
      "nearinfrared": "निकट इन्फ़्रारेड",
      "infrared": "मध्य इन्फ़्रारेड",
      "microwave": "माइक्रोवेव",
      "gamma": "गामा किरणें"
    },
    "notes": {
      "visible": "आसमान, जैसा आँखें और कैमरे उसे देखते हैं।",
      "nearinfrared": "निकट इन्फ़्रारेड, कृत्रिम रंगों में: धूल के पार तारों की रोशनी।",
      "infrared": "मध्य इन्फ़्रारेड, कृत्रिम रंगों में: गर्म धूल और ठंडे तारे।",
      "microwave": "माइक्रोवेव, चमक की तरह: सबसे पुरानी रोशनी के ऊपर हमारी आकाशगंगा।",
      "gamma": "गामा किरणें, कृत्रिम रंगों में: पल्सर, ब्लेज़ार, ब्रह्मांडीय किरणों की दमक।"
    },
    "colours": {
      "nearinfrared": "लाल 2.2 µm है, हरा 1.7 µm, नीला 1.2 µm (2MASS)",
      "infrared": "लाल 22 µm है, हरा 4.6 µm, नीला 3.4 µm (WISE)",
      "microwave": "एक पट्टी, 94 GHz, चमक की तरह बनाई गई (WMAP)",
      "gamma": "लाल 0.3 से 1 GeV है, हरा 1 से 3, नीला 3 से ऊपर (Fermi)"
    },
    "mixLabel": "दिखने वाले आसमान से {band} तक",
    "mixLabelFrom": "{from} से {band} तक",
    "mixValue": "{pct} % {band}",
    "fromLabel": "शुरुआत",
    "fromGroup": "वह रोशनी जहाँ से स्लाइडर शुरू होता है",
    "blink": "झपकाएँ",
    "blinkTitle": "स्लाइडर के दूसरे सिरे पर जाएँ",
    "whyPair": { "nearinfrared_infrared": "निकट इन्फ़्रारेड धूल के पार देखता है; मध्य उसे चमकते देखता है।" },
    "whyAny": "दो रोशनियाँ, एक आसमान: हर एक वह दिखाती है जो दूसरी छिपाती है।",
    "loading": "पूरे आसमान की तस्वीर ला रहे हैं।",
    "failed": "वह तस्वीर पहुँची नहीं। आसमान वैसा ही है जैसा था।",
    "creditLead": "सर्वे: ",
    "creditAnd": " और ",
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
      "mean": "औसतन लगभग {mean} मी/से, ज़्यादा से ज़्यादा {max} तक।",
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
      "dated": "{date} को उपग्रहों से मापी गई समुद्र की ऊँचाई से गणना करके निकाला गया: स्थिर बहाव, ज्वार या हवा के बहाव के बिना, भूमध्य रेखा पर सबसे कम पक्का।",
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
    "orbit": "प्रक्षेपण के बाद {n}वाँ चक्कर",
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
    "fetched": "{age} पढ़ा",
    "waypoint": "स्थिति: सोल {sol} ({date}) के लिए NASA का वेपॉइंट"
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
    "showMe": "दिखाएँ",
    "showMeTitle": "अपनी जगह से आसमान खोलें, उस तरफ़ मुँह करके जहाँ से यह उगता है",
    "guessCaveat": "जगह अंदाज़े से ली गई है: सही समय के लिए अपना शहर चुनें।",
    "satLaunched": "{year} में छोड़ा गया एक उपग्रह",
    "rocketLaunched": "{year} में छोड़ा गया रॉकेट का खाली चरण",
    "setPlace": "अपनी जगह चुनें",
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
    "more": "और दिखाएँ",
    "fewer": "कम दिखाएँ",
    "arcLabel": "आसमान में इसका रास्ता: {from} में उगता है, सबसे ऊँचा {deg}° पर, {to} में डूबता है",
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
    "settings": "आकाश की और सेटिंग",
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
        "telescope": "1° का क्षेत्र: ग्रह छोटी गोल चकतियों जैसे दिखते हैं।"
      },
      "following": "{name} का पीछा कर रहे हैं। छोड़ने के लिए आसमान खींचें।",
      "followSet": "{name} अब क्षितिज के नीचे है, इसलिए दृश्य ने पीछा छोड़ दिया।",
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
        "starGrid": "वह जाल जिस पर तारों का नक्शा बना है",
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
        "high": "एक डिग्री का पाँचवाँ हिस्सा: ग्रह चकतियों की तरह"
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
        "coast": "{dir} में समुद्र, पानी के नक्शे से। ज़मीन बनाई हुई।",
        "real": "क्षितिज: असली ज़मीन, {what} से। इमारतें और पेड़ शामिल नहीं।"
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
  "tripQuiz": {
    "open": "तीन सवाल",
    "openTitle": "इस सफ़र पर तीन सवाल, हर एक का जवाब इसके किसी पड़ाव में",
    "intro": "हर जवाब इस सफ़र के किसी एक पड़ाव पर है।",
    "groupLabel": "सवाल {n} / {total}",
    "right": "सही।",
    "wrong": "पूरा सही नहीं। जवाब: {answer}",
    "from": "सफ़र में यह कहाँ कहा गया: पड़ाव {n}, {title}",
    "score": "{total} में से {n} सही",
    "kept": "सिर्फ़ इसी ब्राउज़र में रखा गया।",
    "again": "फिर से पूछें",
    "trips": {
      "people-in-space": [
        {
          "q": "अंतरिक्ष स्टेशन को पृथ्वी का एक चक्कर लगाने में कितना समय लगता है?",
          "a": [
            "लगभग एक दिन",
            "लगभग 93 मिनट",
            "लगभग आठ मिनट"
          ]
        },
        {
          "q": "स्टेशन का दल एक दिन में कितने सूर्योदय देखता है?",
          "a": [
            "एक, हमारी तरह",
            "पंद्रह या सोलह",
            "लगभग सौ"
          ]
        },
        {
          "q": "तियांगोंग पर एक समय में कितने लोग रहते हैं?",
          "a": [
            "तीन",
            "सात",
            "बारह"
          ]
        }
      ],
      "moon-landings": [
        {
          "q": "नील आर्मस्ट्रांग और बज़ एल्ड्रिन चाँद पर कितनी देर रहे?",
          "a": [
            "लगभग दो घंटे",
            "21 घंटे 36 मिनट",
            "तीन दिन"
          ]
        },
        {
          "q": "लूनोखोद 1 रोवर को कौन चलाता था?",
          "a": [
            "उस पर सवार दो अंतरिक्ष यात्री",
            "पृथ्वी पर पाँच नियंत्रकों की एक टीम",
            "कोई नहीं: वह अपना रास्ता ख़ुद चुनता था"
          ]
        },
        {
          "q": "चांग’ए 4 चाँद के उस हिस्से पर उतरा जो कभी हमारी ओर नहीं होता। वह पृथ्वी से बात कैसे करता था?",
          "a": [
            "एक रिले उपग्रह, चुएचियाओ, के ज़रिए",
            "सीधे रेडियो से पृथ्वी तक",
            "कभी नहीं कर पाया"
          ]
        }
      ],
      "outer-solar-system": [
        {
          "q": "आयो पर सैकड़ों ज्वालामुखी क्यों हैं?",
          "a": [
            "वह सूर्य के सबसे पास वाला चंद्रमा है",
            "बृहस्पति और दो दूसरे चंद्रमा उसे लगातार गूँधते रहते हैं",
            "धूमकेतु उस पर लगातार टकराते हैं"
          ]
        },
        {
          "q": "शनि के छल्ले कहीं-कहीं कितने मोटे हैं?",
          "a": [
            "लगभग दस मीटर",
            "लगभग एक हज़ार किलोमीटर",
            "पृथ्वी की चौड़ाई जितने"
          ]
        },
        {
          "q": "नेपच्यून तक अब तक कितने अंतरिक्ष यान गए हैं?",
          "a": [
            "एक भी नहीं",
            "एक, वॉयजर 2",
            "पाँच"
          ]
        }
      ],
      "the-sun-today": [
        {
          "q": "सूर्य की रोशनी को पृथ्वी तक पहुँचने में कितना समय लगता है?",
          "a": [
            "बिल्कुल नहीं",
            "लगभग आठ मिनट बीस सेकंड",
            "लगभग एक दिन"
          ]
        },
        {
          "q": "सूर्य के धब्बों की गिनती लगभग कितने समय में घटती-बढ़ती है?",
          "a": [
            "हर साल",
            "लगभग हर ग्यारह साल",
            "लगभग हर हज़ार साल"
          ]
        },
        {
          "q": "सूर्य के अंदर कितनी पृथ्वियाँ समा जाएँगी?",
          "a": [
            "लगभग दस",
            "लगभग एक हज़ार",
            "दस लाख से ज़्यादा"
          ]
        }
      ],
      "life-of-a-star": [
        {
          "q": "सूर्य चमकता क्यों है?",
          "a": [
            "वह कोयले की आग की तरह जलता है",
            "गहरे अंदर वह हाइड्रोजन को हीलियम में बदलता है",
            "वह दूसरे तारों की रोशनी लौटाता है"
          ]
        },
        {
          "q": "हेलिक्स नीहारिका के बीच में क्या बचा है?",
          "a": [
            "एक ब्लैक होल",
            "एक छोटा, बहुत गरम तारा: सफ़ेद बौना",
            "कुछ भी नहीं"
          ]
        },
        {
          "q": "सन 1054 में वह विस्फोट किसने देखा जिससे क्रैब नीहारिका बनी?",
          "a": [
            "चीनी खगोलविदों ने",
            "दूरबीन से गैलीलियो ने",
            "हबल अंतरिक्ष दूरबीन ने"
          ]
        }
      ],
      "black-holes": [
        {
          "q": "ब्लैक होल क्या है?",
          "a": [
            "अंतरिक्ष में एक ख़ाली छेद",
            "ऐसी जगह जहाँ गुरुत्व इतना तेज़ है कि कुछ भी बाहर नहीं निकलता, रोशनी भी नहीं",
            "एक तारा जो कुछ देर के लिए बुझ गया है"
          ]
        },
        {
          "q": "हमारी आकाशगंगा के केंद्र वाले ब्लैक होल का द्रव्यमान कितना है?",
          "a": [
            "लगभग सूर्य जितना",
            "सूर्य का लगभग चालीस लाख गुना",
            "पूरी आकाशगंगा जितना"
          ]
        },
        {
          "q": "अगर सूर्य की जगह उतने ही द्रव्यमान का ब्लैक होल रख दें, तो ग्रह क्या करेंगे?",
          "a": [
            "उसमें गिर जाएँगे",
            "अपनी कक्षाओं में ही रहेंगे, बस बहुत ठंड हो जाएगी",
            "अंतरिक्ष में उड़ जाएँगे"
          ]
        }
      ],
      "mars-where-we-have-driven": [
        {
          "q": "मंगल पर एक दिन कितना लंबा होता है?",
          "a": [
            "हमारे दिन से चालीस मिनट लंबा",
            "हमारे दिन से दुगना",
            "हमारे दिन का आधा"
          ]
        },
        {
          "q": "ऑपर्च्युनिटी को नब्बे मंगल-दिन चलने के लिए बनाया गया था। वह कितने समय चला?",
          "a": [
            "नब्बे दिन, जैसा सोचा था",
            "चौदह साल से ज़्यादा",
            "लगभग एक साल"
          ]
        },
        {
          "q": "छोटे हेलिकॉप्टर इनजेन्युटी ने कितनी उड़ानें भरीं?",
          "a": [
            "एक",
            "बारह",
            "72"
          ]
        }
      ]
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
  // forge #571: a Moment's flight data (copy/en.moments.telemetry.js), machine-drafted 2026-11-24, not native-reviewed
  "momentTelemetry": {
    "button": "उड़ान डेटा",
    "buttonTitle": "प्रकाशित ऊँचाइयाँ और गतियाँ दिखाएँ या छिपाएँ",
    "title": "उड़ान डेटा",
    "rocket": {
      "saturn-v": "सैटर्न V"
    },
    "flights": {
      "apollo11": "अपोलो 11",
      "apollo13": "अपोलो 13"
    },
    "legendCompare": "{flight}, वही रॉकेट",
    "height": "ऊँचाई",
    "speed": "पृथ्वी के सापेक्ष गति",
    "unitKm": "किमी",
    "unitKms": "किमी/से",
    "unitMin": "मिनट",
    "events": {
      "liftoff": "उड़ान",
      "mach1": "मैक 1",
      "maxQ": "Max Q",
      "sicCeco": "पहले चरण का बीच वाला इंजन बंद",
      "sicOeco": "पहले चरण के इंजन बंद",
      "sicSep": "पहला चरण अलग हुआ",
      "siiCeco": "दूसरे चरण का बीच वाला इंजन बंद",
      "siiPlannedCeco": "जब वह इंजन बंद होना था",
      "siiOeco": "दूसरे चरण के इंजन बंद",
      "siiSep": "दूसरा चरण अलग हुआ",
      "sivbCutoff": "तीसरे चरण का इंजन बंद",
      "orbit": "कक्षा में"
    },
    "markStaging": "चरण अलग",
    "before": "उड़ान का इंतज़ार",
    "readout": "{event}, {time}: {height} किमी ऊपर, {speed} किमी/से",
    "commanded": "(आदेश दिया गया समय)",
    "after": "तालिका कक्षा में पहुँचने पर ख़त्म होती है, {time}",
    "maxQLine": "Max Q {kpa} kPa, {time} पर, {height} किमी ऊपर",
    "dots": "बिंदु NASA की प्रकाशित तालिका हैं; उनके बीच की रेखाएँ माप नहीं हैं।",
    "truth": "उड़ान के बाद उड़ान रिपोर्टों से निकाला गया।",
    "source": "Apollo by the Numbers, NASA SP-2000-4029",
    "sourceTitle": "यह किताब NASA की PDF है; तालिकाएँ पृष्ठ {pages} पर",
    "tableCaption": "{flight} की प्रकाशित पंक्तियाँ",
    "colTime": "समय",
    "colEvent": "घटना",
    "colHeight": "ऊँचाई, किमी",
    "colSpeed": "गति, किमी/से",
    "seekHint": "उस सेकंड पर जाने के लिए एक बिंदु चुनें"
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} एक आग है जो अपनी आख़िरी रिपोर्ट, {date}, में यहाँ थी",
        "volcano": "{name} में {date} से विस्फोट चल रहा है",
        "iceberg": "{name} की आख़िरी रिपोर्ट, {date}, में उसकी जगह यहीं थी"
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
      "mass": "जिसका द्रव्यमान {n} सूर्यों के बराबर है",
      "massRange": "जिसका द्रव्यमान {lo} और {hi} सूर्यों के बीच है",
      "massMillions": "जिसका द्रव्यमान {n} मिलियन सूर्यों के बराबर है",
      "massBillions": "जिसका द्रव्यमान {n} अरब सूर्यों के बराबर है",
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
      "leadHome": "{name} वह आकाशगंगा है जिसमें हम रहते हैं; इसका केंद्र लगभग {dist} प्रकाश-वर्ष दूर है",
      "lead": "{name} {dist} प्रकाश-वर्ष दूर एक {a} {type} है",
      "leadRange": "{name} एक {a} {type} है, जो {lo} और {hi} प्रकाश-वर्ष के बीच कहीं दूर है",
      "leadUntyped": "{name} {dist} प्रकाश-वर्ष दूर है",
      "size": "जिसकी चौड़ाई लगभग {n} प्रकाश-वर्ष है",
      "seenAs": "इसकी जो रोशनी हम देखते हैं वह {n} साल पहले की है",
      "seenAsMillions": "इसकी जो रोशनी हम देखते हैं वह {n} मिलियन साल पहले की है",
      "constellation": "{con} में",
      "kinds": {
        "galaxy": "आकाशगंगा",
        "nebula": "नीहारिका",
        "cluster": "तारागुच्छ",
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
      "luminosity": "जो दृश्य प्रकाश में सूर्य से {n} गुना ज़्यादा चमकता है",
      "dimmer": "जो सूर्य की चमक के {n} जितना चमकता है",
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
      "operator": "जिसका संचालक {operator} है",
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
      "leadDwarfFarBeyond": "{name} वरुण से बहुत दूर एक बौना ग्रह है",
      "leadInterstellarOut": "{name} किसी दूसरे तारे से आई एक चीज़ है, जो सौरमंडल से बाहर जा रही है",
      "leadInterstellarIn": "{name} किसी दूसरे तारे से आई एक चीज़ है, जो सूर्य की ओर गिर रही है",
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
    "sparkApprox": "इतने पास तारीख़ और दूरी लगभग सही हैं: पृथ्वी का खिंचाव छोड़ दिया गया है।",
    "upYears": "{n} साल से ऊपर: {date} को छोड़ा गया",
    "upOneYear": "1 साल से ऊपर: {date} को छोड़ा गया",
    "upUnderAYear": "एक साल से कम समय से ऊपर: {date} को छोड़ा गया",
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
    "otherDate": "चालक दल की सूची आज की है। नक्शा दूसरी तारीख़ दिखा रहा है, इसलिए किसी का नाम नहीं दिया गया।",
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
  "language": {
    "title": "भाषा",
    "close": "बंद करें",
    "listLabel": "भाषाएँ",
    "note": "पेज उसी दृश्य के साथ उस भाषा में दोबारा खुलेगा। अंग्रेज़ी को छोड़कर हर भाषा मशीन से किया गया अनुवाद है, जिसे अंग्रेज़ी से मिलाकर जाँचा गया है।"
  },
  "showMemory": {
    "note": "यहाँ आप जो चुनते हैं, वह इसी ब्राउज़र में रखा जाता है।",
    "reset": "चुनाव रीसेट करें",
    "resetTitle": "परतों, रंगों और डेटा परत को शुरुआत जैसा कर दें और चुनाव भूल जाएँ"
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
    "one": "{name} का आकार ×{n} बढ़ाकर बनाया गया",
    "title": "बिंदु ग्रहों से चौड़े हैं। असली आकार के लिए दबाएँ।",
    "trueLine": "असली आकार: यहाँ {name} की चौड़ाई {px} px है",
    "trueTitle": "सबसे चौड़ा ग्रह, बिंदुओं को हटाकर। उन्हें फिर बनाने के लिए दबाएँ।"
  },
  "launchChip": {
    "rocket": "रॉकेट प्रक्षेपण: {name}",
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
    "from": "{source} से",
    "wait": "सफ़र तैयार हो रहा है",
    "skip": "कोई भी कुंजी या दबाना इसे छोड़ देता है"
  },
  "base": {
    "label": "बेस पर लौटें",
    "title": "बेस पर लौटें: पृथ्वी, अभी, कुछ चुना हुआ नहीं",
    "name": "बेस",
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
    "surface": "सतह की कल्पना की गई है।",
    "clouds": "बादलों की चोटियों की कल्पना की गई है।",
    "nothingMeasured": "यहाँ कुछ भी मापा हुआ नहीं है।",
    "whole": "पूरी दुनिया की कल्पना की गई है।",
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
      "GCl": "गोलाकार तारागुच्छ"
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
      "lmc": "यह मॉडल इसकी तस्वीर और Gaia की इसके अपने तारों की गिनती से बना है, मापे गए झुकाव के साथ।"
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
      "orion": "एक काले बादल के पास वाले चेहरे पर गैस की पतली चमकती परत, जिसे Trapezium के तारे रोशन करते हैं। इसकी रोशनी ESO की तस्वीर से ली गई है और इसका आकार Wen और O’Dell (1995) तथा O’Dell (2001) के बाद पुनर्निर्मित है, जिसमें Trapezium इस परत से लगभग 0.65 प्रकाश-वर्ष सामने है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-m42": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। Trapezium के पास यह मापा हुआ है: चमकती परत उसके सबसे चमकीले तारे के लगभग 0.65 प्रकाश-वर्ष पीछे है। और दूर गहराई उस प्रकाशित चित्र के अनुसार है जिसमें एक कटोरा हमारी ओर खुलता है, माप के अनुसार नहीं।"
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
    "how": "नीहारिका की दमक एक पतली परत से आती है जहाँ Trapezium के सबसे चमकीले तारे की रोशनी एक काले बादल में घुसती है। Wen और O’Dell (1995) ने मापा कि वह परत तारे के पीछे कितनी दूर है, उसकी चमक से, क्योंकि उसका पास का हिस्सा ज़्यादा रोशनी पाता है।"
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
      "measured": "प्रकाशक के डेटा से गणना करके निकाला, जिसकी उम्र बताई गई है",
      "inferred": "पुराने डेटा या भौतिकी से आगे मॉडल किया गया",
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
    "falseColour": "{band}, कृत्रिम रंगों में",
    "glossary": [
      {
        "term": "पारसेक",
        "match": [
          "kpc"
        ],
        "say": "लगभग 3.26 प्रकाश-वर्ष: वह दूरी जिससे पृथ्वी और सूर्य के बीच का फ़ासला एक आर्कसेकंड चौड़ा दिखे। शोध-पत्र pc लिखते हैं, और हज़ार के लिए kpc।"
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
    "image": "सूर्य का जो आधा हिस्सा पृथ्वी की ओर था, वह Solar Dynamics Observatory की {date} को {time} UTC पर ली तस्वीर है, जिसे तब से सूर्य के साथ घुमाया गया है: {wl} ऐंगस्ट्रॉम पर चरम पराबैंगनी रोशनी, सतह के ऊपर के लूपों में लगभग दस लाख डिग्री की गैस से, SDO के कृत्रिम रंग में और ज़्यादा चमकीली बनाई गई। दूर वाला हिस्सा, जिसे उसने नहीं देखा, उसी कृत्रिम रंग में एक मॉडल से बनाया गया है, और जहाँ दोनों मिलते हैं वहाँ घुलाए गए हैं। यह देखने भर की तस्वीर है, विज्ञान के काम की नहीं। NASA/SDO और AIA, EVE तथा HMI विज्ञान दलों के सौजन्य से।",
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
    "jets": "चार बाघ-धारियों के जेट, कम से कम {km} किमी ऊँचे ({by}, {when})",
    "truth": "उनकी जगहें और ऊँचाइयाँ मापी हुई हैं; कणों की चापें एक मॉडल हैं, और उनकी रोशनी खींचकर बढ़ाई गई है ताकि वे दिखें। हो सकता है वे अभी फट न रहे हों।",
    "stripes": "धारियाँ नामावली-सूची के केंद्रों और लंबाइयों से सीधी बनाई गई हैं, और उनके साथ की 101 जेटों की जगहें एक मॉडल हैं।",
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
      "globularReal": "इसके अपने तारे: Gaia द्वारा नापे गए {of} सदस्यों में से सबसे चमकीले {n} (Vasiliev और Baumgardt 2021, सदस्यता की संभावना कम से कम {p}, ज्वारीय त्रिज्या के भीतर), परिमाण 10 तक बनाए गए, जैसे कैमरे का एक्सपोज़र दिखाता है। नापा हुआ: आसमान में उनकी जगह, चमक और रंग। Gaia भीड़ भरे केंद्र को अलग नहीं कर पाता, इसलिए वहाँ तारे कम हैं; उनकी जगह दमक है।",
      "globularRealDepth": "मॉडल किया हुआ: हर तारा समूह के केंद्र से कितना आगे या पीछे है। इस दूरी पर Gaia यह नाप नहीं सकता, इसलिए इसे King की रूपरेखा से लिया गया है, Harris की क्रोड त्रिज्या ({rc} प्रकाश-वर्ष) और ज्वारीय त्रिज्या ({rt}) के साथ। निरपेक्ष चमक नक्शे की दूरी और Harris के रक्तीकरण से निकलती है; रंग अनुमानित हैं।",
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
      "उस गोलाकार तारागुच्छ, सुपरनोवा अवशेष या दूसरी चीज़ की दूरी जिसका यह हिस्सा है",
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
      "shape": "वहाँ एक चमकीला बिंदु जहाँ इसका लाल विस्थापन इसे रखता है, जगह दिखाने वाले एक छल्ले के साथ; इसकी डिस्क और इसका जेट बनाने के लिए बहुत छोटे हैं",
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
      "crab": "पल्सर की पवन की चमक के चारों ओर तंतुओं का एक पिंजरा, उस रूपरेखा पर जिसे Martin, Milisavljevic और Drissen (2021) ने मापा। हर तंतु की जगह मॉडल से ली गई है, और रंग Hubble की कृत्रिम रंग वाली तस्वीर के अनुसार हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "veil": "इसकी रोशनी NOIRLab की तस्वीर से ली गई है, कृत्रिम रंग में, 37 पारसेक चौड़े एक पतले गोले पर चढ़ाई गई (Fesen और अन्य, 2018): तंतु उसका किनारे से देखा गया रिम हैं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "horsehead": "इसका कालापन NOIRLab की तस्वीर से पढ़ा गया है: IC 434 की चमकती गैस के सामने धूल, जो अपने पीछे की चीज़ को सोखती और लाल करती है और खुद कोई रोशनी नहीं देती। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "coalsack": "इसका कालापन इसके चारों ओर की आकाशगंगा से पढ़ा गया है: लगभग 590 प्रकाश-वर्ष दूर धूल का एक बादल जो अपने पीछे के तारों को धुँधला और लाल करता है। इसकी रूपरेखा मापी गई है, इसकी गहराई मॉडल से ली गई है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "m78": "इसकी रोशनी NOIRLab की तस्वीर है: धूल जो अपने सामने के तारे की नीली रोशनी को बिखेरती है, एक काले बादल की सतह पर। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "iris": "इसकी रोशनी NOIRLab की तस्वीर है: धूल जो अपने बादल के एक खोखले में जवान तारे HD 200775 की रोशनी को बिखेरती है। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।",
      "m45": "इसकी रोशनी NOIRLab की तस्वीर है: धूल का एक बादल जो समूह के बीच से बहता है, इसके तारों के ठीक सामने, उनकी नीली रोशनी को बिखेरता (Ritchey और अन्य, 2006)। इसकी गहराई पुनर्निर्मित है। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-m1": [["इसका आकार","मापी गई रूपरेखा, मॉडल से बने तंतु। पल्सर की धुरी के साथ केंद्र से 2 पारसेक से आगे कोई गैस नहीं है और आधे पारसेक के भीतर भी नहीं; बीच का हिस्सा सँकरा है और दो पालियाँ बाहर निकली हैं (Martin और अन्य, 2021)। तंतु मापे गए आकार का छत्ता बनाते हैं, पर हर तंतु कहाँ खींचा गया है, यह मॉडल से लिया गया है।"],["पल्सर की पवन","छल्ले मापे गए हैं, जेट मॉडल से बने हैं। पल्सर के चारों ओर एक्स-किरणों के दो छल्ले हैं; भीतरी छल्ला एक प्रकाश-वर्ष चौड़ा है, और वे हमारी दृष्टि-रेखा से 63 डिग्री झुके हैं। गैस उनसे प्रकाश की आधी गति से निकलती है, इसलिए देखने वाले की ओर आता हिस्सा ज़्यादा चमकीला है (Ng और Romani, 2004 और 2008)। जेट की लंबाई मॉडल से ली गई है।"],["इसके रंग","सांकेतिक। तंतु और चमक अपने रंग Hubble की कृत्रिम रंग वाली तस्वीर से, आकाश की उसी जगह से लेते हैं। पल्सर की पवन एक्स-किरणों का प्रकाश है, जिसे कोई आँख नहीं देख सकती; इसे नीले-बैंगनी रंग में खींचा गया है।"],["घड़ी के साथ","इस तारे को 1054 में फटते देखा गया था, और यह बादल हर साल लगभग एक प्रतिशत का दसवाँ हिस्सा बढ़ता है (मापा गया)। मॉडल ऐप की घड़ी के साथ 1054 से बढ़ता है; सदियों में यह बढ़त कैसे बदली, यह मॉडल से लिया गया है।"],["समीक्षा","किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"]],
      "dso-veil-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित: 37 पारसेक चौड़ा एक गोला, वह आकार और दूरी जो Fesen और अन्य (2018) ने मापी। खोल की मोटाई सांकेतिक है।"
        ],
        [
          "इसके रंग",
          "कृत्रिम रंग: ऑक्सीजन, सल्फ़र और हाइड्रोजन के लिए तस्वीर के संकरे फ़िल्टर, जिन्हें चित्र बनाने वाले ने रंग दिए।"
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
      "dso-coalsack": [["इसकी रूपरेखा और गहराई","रूपरेखा यहाँ खींचे गए आकाशगंगा के नक्शे पर मापी गई है (NASA, Gaia की तारा-गणना से): लगभग 7 गुणा 4 डिग्री का एक काला क्षेत्र। पास के काले धब्बे दूसरे बादल हैं और छोड़ दिए गए हैं। गहराई मॉडल से ली गई है: एक ही दूरी पर एक पतली, ऊबड़-खाबड़ परत।"],["यह कितना काला है","इससे पढ़ा गया कि यहाँ आकाशगंगा पास की उसी दूरी पर, अपनी बीच की रेखा से, कितनी ज़्यादा काली है। यह एक अनुमान है और इन्फ़्रारेड नक्शों से कम, क्योंकि बादल के सामने के तारे अपनी रोशनी जोड़ देते हैं।"],["धूल क्या करती है","यह सिर्फ़ सोखती है: उसके पीछे के तारे धुँधले और लाल हो जाते हैं। उसके सामने के तारे नहीं। उत्तर-पूर्व का कुछ कालापन बहुत पीछे का एक दूसरा बादल है, जिसे यहाँ पास की दूरी पर बनाया गया है।"],["समीक्षा","किसी खगोलविद ने अभी इस मॉडल की समीक्षा नहीं की है।"]],
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
      "OPEN_CLUSTER": "खुले तारागुच्छ",
      "GLOBULAR_CLUSTER": "गोलाकार तारागुच्छ",
      "EMISSION_NEBULA": "उत्सर्जन नीहारिकाएँ",
      "PLANETARY_NEBULA": "ग्रहीय नीहारिकाएँ",
      "DARK_NEBULA": "काली नीहारिकाएँ",
      "REFLECTION_NEBULA": "परावर्तन नीहारिकाएँ",
      "SUPERNOVA_REMNANT": "सुपरनोवा अवशेष",
      "GALAXY_SPIRAL": "सर्पिल आकाशगंगाएँ",
      "GALAXY_IRREGULAR": "अनियमित आकाशगंगाएँ",
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
      "selected": "चुनी गई चीज़: {name}, {kind}।",
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
      "dso-centaurus-a": "प्रकाशित संख्याओं से बनाया गया: एक विशाल दीर्घवृत्ताकार आकाशगंगा जिसे धूल और नए तारों की मुड़ी हुई डिस्क काटती है, Spitzer की तस्वीरों पर बैठाए एक मॉडल के बाद; इसके दो जेट कृत्रिम रंग में बनाए गए हैं, क्योंकि वे एक्स-रे और रेडियो तरंगों में चमकती हैं, दिखने वाली रोशनी में नहीं। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
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
    "wider": "{big} की चौड़ाई {small} से {n} गुना है।",
    "same": "{a} और {b} की चौड़ाई लगभग बराबर है।",
    "figure": "{a} और {b} के चित्र, {how}।",
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
      "sunSpin": "16° अक्षांश पर; भूमध्य रेखा पर लगभग 25 दिन, ध्रुवों पर लगभग 34 दिन",
      "withEarth": "पृथ्वी के साथ",
      "exosphere": "एक पतला बाह्यमंडल",
      "photosphereAir": "प्रकाशमंडल में, परमाणुओं की संख्या के अनुसार",
      "airVolume": "आयतन के अनुसार"
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
    "moonsNote": "चंद्रमाओं की गिनती JPL की ज्ञात चंद्रमाओं की सूची से है, {date} को पढ़ी गई; नए चंद्रमा पक्के होते जाते हैं तो यह बढ़ती है।",
    "spinNote": "सूर्य एक ठोस पिंड की तरह नहीं घूमता: शीट का मान 16° अक्षांश पर है, और भूमध्य रेखा ध्रुवों से तेज़ घूमती है।",
    "drawnTrue": "हर औसत त्रिज्या से एक ही पैमाने पर बनाया गया, तस्वीरें नहीं।",
    "drawnSame": "बराबर चौड़ाई, इसलिए पैमाने पर नहीं। छल्ले अपना हिस्सा रखते हैं।",
    "tiny": "यहाँ {name} का आकार एक पिक्सेल से कम है, इसलिए उसे बिंदु की तरह बनाया गया है।",
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
    "met": "मिशन का बीता समय",
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
    "drawnNote": "लपटें, भाप, पैराशूट और वापसी की दमक बनाई गई हैं।",
    "groundNote": "प्रक्षेपण पैड के पास की ज़मीन सांकेतिक; पृथ्वी का नक्शा Solar System Scope, CC BY 4.0।",
    "groundNoteMars": "उतरने की जगह के पास की ज़मीन सांकेतिक; मंगल का नक्शा Solar System Scope, CC BY 4.0।",
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
      "voskhod-2": {
        "title": "Voskhod 2",
        "when": "18 से 19 मार्च 1965",
        "blurb": "Alexei Leonov फुलाए जाने वाले एयरलॉक से बारह मिनट के लिए अंतरिक्ष में निकलते हैं, और दल हाथ से टैगा के जंगल में उतरता है, अपने तय खेत से बहुत दूर।"
      },
      "sts-1": {
        "title": "STS-1",
        "when": "12 से 14 अप्रैल 1981",
        "blurb": "पहला Space Shuttle: पैड 39A से Columbia, बूस्टर और टैंक, कक्षा में 54 घंटे, और Edwards की सूखी झील पर ग्लाइड करके उतरना।"
      },
      "hubble-deployment": {
        "title": "Hubble का छोड़ा जाना",
        "when": "25 अप्रैल 1990",
        "blurb": "STS-31 पर Discovery की भुजा Hubble Space Telescope को बे से ऊपर उठाती है, एक सौर पैनल रुक जाता है, और 19:38 UTC पर टेलीस्कोप छोड़ दिया जाता है।"
      },
      "falcon9-og2-2": {
        "title": "Falcon 9 की पहली लैंडिंग",
        "when": "21 दिसंबर 2015",
        "blurb": "Falcon 9 की उड़ान 20 Cape Canaveral से 11 ORBCOMM उपग्रह ऊपर ले जाती है, और उसका पहला चरण वापस उड़कर Landing Zone 1 पर उतरता है: किसी कक्षीय रॉकेट के पहले चरण की पहली लैंडिंग।"
      },
      "apollo-11": {
        "title": "Apollo 11",
        "when": "16 से 24 जुलाई 1969",
        "blurb": "पैड 39A से प्रशांत महासागर तक, Tranquility Base के रास्ते: प्रक्षेपण, चंद्रमा, उतरना, वापस ऊपर चढ़ना, घर।"
      },
      "apollo-13": {
        "title": "Apollo 13",
        "when": "11 से 17 अप्रैल 1970",
        "blurb": "पैड 39A से प्रशांत महासागर तक: वह लैंडिंग जो नहीं हुई, फटा हुआ ऑक्सीजन टैंक, और जीवन-नौका बना चंद्र मॉड्यूल।"
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1 से 10 अप्रैल 2026",
        "blurb": "पैड 39B से San Diego के पास प्रशांत महासागर तक, चंद्रमा के दूर वाले हिस्से का चक्कर लगाकर। जो उड़ाया गया वह बताया गया है, और जो योजना में था वह भी।"
      },
      "sputnik-1": {
        "title": "Sputnik 1",
        "when": "4 अक्टूबर 1957",
        "blurb": "बैकोनूर से पृथ्वी के पहले चक्कर तक: पहला कृत्रिम उपग्रह, 585 मिमी का चमकाया हुआ गोला, और उसकी बीप।"
      },
      "curiosity-edl": {
        "title": "Curiosity की लैंडिंग",
        "when": "6 अगस्त 2012",
        "blurb": "मंगल की हवा के शिखर से Gale क्रेटर तक के सात मिनट: गर्मी की ढाल, पैराशूट, रॉकेट बैकपैक और स्काई क्रेन, JPL की अपनी घड़ी पर।"
      },
      "new-horizons-pluto": {
        "title": "प्लूटो पर New Horizons",
        "when": "14 जुलाई 2015",
        "blurb": "प्लूटो की पहली मुलाक़ात: छह घंटे दूर से लेकर 13.8 किमी/सेकंड पर गुज़रने तक, JPL के अपने रास्ते पर, प्लूटो और शैरन चकतियों की तरह, और पीछे छूटा अर्धचंद्र।"
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 अप्रैल 1961",
        "blurb": "यूरी गागरिन, 108 मिनट में पृथ्वी का एक चक्कर, Baikonur से Smelovka के पास एक खेत तक।"
      }
    }
  },
  "momentStories": {
    "apollo-13": {
      "title": "Apollo 13: घर की उड़ान",
      "blurb": "Launch Complex 39A, 11 अप्रैल 1970, से 17 तारीख़ को प्रशांत महासागर तक: चंद्रमा पर वह उतरना जो नहीं हुआ, एक फटा ऑक्सीजन टैंक, और जीवन-नौका बना चंद्र मॉड्यूल।",
      "chIgnition": "इग्निशन",
      "chLiftoff": "उड़ान भरना",
      "chStaging": "चरण-अलगाव",
      "chParking": "पार्किंग कक्षा",
      "chTli": "चंद्रमा के लिए रवानगी",
      "chCoast": "दो दिन का सफ़र",
      "chBang": "धमाका",
      "chLifeboat": "Aquarius, जीवन-नौका",
      "chReturn": "वापसी के रास्ते पर",
      "chMoon": "दूर वाले हिस्से का चक्कर",
      "chBurn": "घर के लिए इंजन",
      "chHome": "घर के तीन दिन",
      "chSm": "सर्विस मॉड्यूल",
      "chUndock": "Aquarius अलग होता है",
      "chEntry": "वापसी",
      "chSplash": "समुद्र में उतरना",
      "ignition": "लगभग T−9 सेकंड: पाँचों F-1 इंजन चालू होते हैं, पहले बीच वाला। Launch Complex 39A, पूर्वी समय के अनुसार दोपहर 2:13।",
      "liftoff": "प्रक्षेपण, 11 अप्रैल 1970, 19:13:00 UTC: James Lovell, Jack Swigert और Fred Haise, Fra Mauro के ऊँचे इलाके की ओर।",
      "roll": "12.6 सेकंड पर पूरा रॉकेट अपनी उड़ान की दिशा में मुड़ता है, उत्तर से 72.043 डिग्री पूर्व।",
      "staging": "2:44: पहले चरण के बाहरी इंजन बंद हो जाते हैं और चरण अलग होकर गिरता है; दूसरा चरण 2:45 पर जल उठता है।",
      "tower": "3:21: बचाव मीनार उतार दी जाती है।",
      "pogo": "5:30 पर दूसरे चरण का बीच वाला इंजन अपने आप बंद हो जाता है, तय समय से 132 सेकंड पहले, क्योंकि चरण बहुत ज़ोर से हिलने लगा था। बाक़ी चार इंजन कमी पूरी करने के लिए 34 सेकंड ज़्यादा जलते हैं।",
      "siicut": "9:53: दूसरा चरण बंद होकर अलग हो जाता है; S-IVB जल उठता है।",
      "parking": "12:30: पार्किंग कक्षा, 190 गुणा 185 किमी ऊपर। इसके बाद ढाई घंटे की जाँच।",
      "tli": "2:35:46: S-IVB 5 मिनट 51 सेकंड के लिए फिर जलता है और यान को लगभग 11 किमी/सेकंड की रफ़्तार से चंद्रमा की ओर भेजता है।",
      "sep": "3:06:39: Odyssey, S-IVB से अलग होता है, घूमता है और 3:19:09 पर Aquarius से जुड़ जाता है। चारों एडैप्टर पैनल खुलकर गिर जाते हैं।",
      "extract": "4:01: Odyssey, Aquarius को इस्तेमाल हो चुके चरण से बाहर खींचता है, जिसे पीछे छोड़ दिया जाता है।",
      "coast": "चंद्रमा तक दो दिन, असली रफ़्तार से लगभग 9 000 गुना तेज़ बनाए गए। यान 11 मीटर लंबा है, इसलिए यह एक बिंदु है।",
      "tv": "55:53:20: Mission Control ऑक्सीजन टैंकों को रोज़ की तरह हिलाने को कहता है। टेलीविज़न प्रसारण कुछ मिनट पहले ख़त्म हुआ है; दल सामान समेट रहा है।",
      "bang": "55:54:53, 14 अप्रैल को 03:07 UTC: एक धमाका। ऑक्सीजन टैंक 2 फट गया है और उसने सर्विस मॉड्यूल के खंड 4 का बाहरी पैनल उड़ा दिया है। पैनल की उड़ान बनाई गई है, मापी नहीं गई।",
      "problem": "55:55:20: “Okay, Houston, we've had a problem here.” Jack Swigert; NASA की रिकॉर्डिंग, जैसी दर्ज है वैसी चलाई गई।",
      "problem2": "55:55:42: “Houston, we've had a problem.” James Lovell; NASA की रिकॉर्डिंग।",
      "barber": "कुछ ही मिनटों में टैंक 1 की ऑक्सीजन भी रिसने लगती है। ईंधन सेल इसी ऑक्सीजन से यान की बिजली और पानी बनाते हैं, और वे ख़राब हो रहे हैं।",
      "lifeboat": "Aquarius जीवन-नौका बन जाता है: जिसे दो आदमियों को दो दिन ज़िंदा रखने के लिए बनाया गया था, उसे तीन को चार दिन ज़िंदा रखना है। Odyssey को बंद कर दिया जाता है ताकि उसकी बैटरियाँ वापसी के लिए बची रहें।",
      "mcc2": "61:29:43: चंद्र मॉड्यूल का उतरने वाला इंजन 34 सेकंड जलता है, 11.5 मी/सेकंड के लिए, ताकि यान ऐसे रास्ते पर आ जाए जो पृथ्वी तक लौटता है। दिखाया गया रास्ता इसके लिए मुड़ता नहीं।",
      "impact": "77:56:40: आगे भेजा गया इस्तेमाल हो चुका S-IVB 2.4 द. 27.9 प. पर चंद्रमा से टकराता है, और Apollo 12 का भूकंपमापी इसे दर्ज करता है (बनाया नहीं गया)।",
      "farside": "लगभग 77:28, चंद्रमा के पीछे और रेडियो संपर्क से बाहर: दूर वाला हिस्सा, 254 किमी नीचे।",
      "closest": "सबसे पास, दूर वाले हिस्से से 254 किमी ऊपर। पृथ्वी से लगभग 400 000 किमी: इतनी दूर इंसान पहले कभी नहीं गए थे।",
      "tei": "79:27:39, चंद्रमा के दो घंटे बाद: उतरने वाला इंजन 4 मिनट 24 सेकंड जलता है, 262 मी/सेकंड, ताकि उतरने का समय 152 घंटे से घटकर 143 घंटे हो जाए और यान प्रशांत महासागर में उतरे।",
      "home": "घर के तीन दिन: ठंड, पानी की कमी, और यान की बिजली कम से कम पर।",
      "mcc3": "105:18: उतरने वाला इंजन 10 प्रतिशत ज़ोर पर 14 सेकंड जलता है, 2.4 मी/सेकंड, ताकि वापसी का कोण थोड़ा और खड़ा हो जाए।",
      "mcc4": "137:39:52: आख़िरी 0.9 मी/सेकंड का सुधार, चंद्र मॉड्यूल के छोटे थ्रस्टरों से (बनाया नहीं गया)।",
      "smsep": "138:01:48, वापसी से 4 घंटे 39 मिनट पहले: सर्विस मॉड्यूल काटकर अलग कर दिया जाता है। उसका पैनल 82 घंटे से ग़ायब है।",
      "photo": "दल अलग होते मॉड्यूल की तस्वीर लेता है: एक पूरा पैनल ग़ायब है और फटा हुआ इंसुलेशन बाहर निकला दिखता है। खंड AS13-59-8500 से बनाया गया है; एंटीना डिश को हुआ नुक़सान नहीं बनाया गया।",
      "undock": "141:30: Aquarius, जिसने लगभग 83 घंटे तीन आदमियों को ज़िंदा रखा, जुड़ाव-सुरंग के दबाव के साथ छोड़ दिया जाता है। कमांड मॉड्यूल अब अकेला है।",
      "entry": "142:40:46, वायुमंडल में प्रवेश, 122 किमी ऊपर 11 किमी/सेकंड पर। पहला शिखर लगभग 5 g।",
      "drogue": "लगभग 142:48: दो ड्रोग पैराशूट, फिर तीन मुख्य।",
      "mains": "तीन मुख्य पैराशूट कैप्सूल को लगभग 9 मी/सेकंड तक धीमा करते हैं।",
      "splash": "142:54:41, 17 अप्रैल को 18:07 UTC: दक्षिणी प्रशांत में समुद्र में उतरना, USS Iwo Jima की नज़र में। तीनों 45 मिनट के भीतर जहाज़ पर आ जाते हैं।",
      "pathAscent": "मिशन रिपोर्ट के घटना-समय, बीच की ऊँचाइयाँ और दूरियाँ लगभग",
      "pathTrip": "मिशन रिपोर्ट की स्थितियाँ और समय, प्रक्षेपण-गति में थोड़े सुधार के साथ जोड़ा गया रास्ता, और घर लौटने का Lambert चाप; ट्रैकिंग डेटा नहीं",
      "pathLm": "141:30 तक Odyssey से जुड़ा; अलग होने के बाद का बहाव सांकेतिक है",
      "pathSm": "सांकेतिक: इस्तेमाल हो चुके सर्विस मॉड्यूल के बहाव की रफ़्तार हमारी है",
      "srcReport": "Apollo 13 Mission Report, NASA MSC-02680, 1971 (घटना-समय, स्थितियाँ, वापसी)",
      "srcJournal": "Apollo 13 Flight Journal, NASA (रेडियो, सेकंड तक)",
      "srcClip": "दोनों रेडियो पंक्तियाँ: NASA की रिकॉर्डिंग, सार्वजनिक संपत्ति, Wikimedia Commons से",
      "srcPhoto": "सर्विस मॉड्यूल का खंड 4: NASA की तस्वीर AS13-59-8500, सार्वजनिक संपत्ति, Wikimedia Commons से"
    },
    "sputnik-1": {
      "title": "Sputnik 1: पहला उपग्रह",
      "blurb": "Baikonur, 4 अक्टूबर 1957: पहला कृत्रिम उपग्रह, 585 मिमी का एक चमकाया हुआ गोला, पैड से पृथ्वी के पहले चक्कर तक, अपनी बीप के साथ।",
      "chPad": "स्थल 1",
      "chAscent": "उड़ान भरना",
      "chBoosters": "साथ जुड़े बूस्टर",
      "chCore": "मुख्य चरण",
      "chSep": "PS-1 अलग होता है",
      "chOrbit": "एक चक्कर",
      "ready": "T−10 सेकंड, Baikonur का स्थल 1: 8K71PS रॉकेट और, उसके शंकु के नीचे, 585 मिमी का एक गोला। 4 अक्टूबर 1957, 19:28:34 UTC; प्रक्षेपण स्थल पर तब तक 5 तारीख़ हो चुकी थी। पैड की रोशनी हमारी है: पैड अँधेरे में था, और रॉकेट को इसलिए रोशन किया गया है कि वह दिख सके।",
      "liftoff": "प्रक्षेपण। R-7 का मुख्य चरण और चारों साथ जुड़े बूस्टर एक साथ जलते हैं; इसके लिए सैनिक रॉकेट से उसका वारहेड हटा दिया गया था।",
      "regulator": "लगभग 16 सेकंड बाद ईंधन नियंत्रक ख़राब हो जाता है: मुख्य चरण केरोसिन बहुत तेज़ जलाता है और उसका ज़ोर उड़ान के ज़्यादातर हिस्से में 4 प्रतिशत ज़्यादा रहता है। मिशन इससे बच जाता है।",
      "boosters": "T+116 सेकंड: चारों साथ जुड़े बूस्टर अलग हो जाते हैं, जैसा टेलीमेट्री दिखाती है। मुख्य चरण अकेला आगे बढ़ता है।",
      "core": "T+295.4 सेकंड: मुख्य चरण 223 किमी ऊपर, लगभग 7.8 किमी/सेकंड पर, तय समय से एक सेकंड पहले बंद हो जाता है, जब एक सेंसर को केरोसिन पंप खाली होकर तेज़ घूमता दिखता है।",
      "sep": "T+315.3 सेकंड, बंद होने के 19.9 सेकंड बाद: PS-1 अलग होता है। शंकु गिर जाता है, चारों एंटीना बाहर खुलते हैं (यहाँ चलाए नहीं गए) और ट्रांसमीटर चालू हो जाता है।",
      "beep": "पहली बीपें ट्रैकिंग स्टेशन IP-1 पर दो मिनट तक सुनी जाती हैं, जब तक उपग्रह क्षितिज के नीचे नहीं चला जाता। यह आवाज़ संकेत की NASA की रिकॉर्डिंग है।",
      "shadow": "प्रक्षेपण स्थल पर आधी रात के ठीक बाद हुआ था, और पहले 13 मिनट PS-1 पृथ्वी की छाया में उड़ता है, इसलिए वह अँधेरा बनाया गया है। लगभग T+13 मिनट पर वह धूप में आता है।",
      "orbit": "कक्षा: 223 गुणा 950 किमी, 65.1 डिग्री, एक चक्कर 96.2 मिनट का। मुख्य चरण उसके पीछे-पीछे चक्कर लगाता है (बनाया नहीं गया)।",
      "lap": "इस रीप्ले में एक चक्कर। बैटरियाँ 26 अक्टूबर को, 326 चक्करों के बाद ख़त्म हुईं; गोला 4 जनवरी 1958 को, लगभग 1 440 चक्करों के बाद गिर गया।",
      "pathAscent": "प्रकाशित घटना-समय, बीच की ऊँचाइयाँ और दूरियाँ लगभग",
      "pathOrbit": "प्रक्षेपण के अंत से प्रकाशित कक्षा एक शंकु-वक्र के रूप में, एक चक्कर; उपग्रह का लुढ़कना नहीं बनाया गया",
      "srcWiki": "Sputnik 1, Wikipedia (घटना-समय, कक्षा, आकार), जो NASA, NSSDC और अपने दिए रूसी स्रोतों से लिया गया है",
      "srcNssdc": "Sputnik 1, NASA NSSDCA Master Catalog (प्रक्षेपण और कक्षा)",
      "srcClip": "बीप: NASA की रिकॉर्डिंग, सार्वजनिक संपत्ति, Wikimedia Commons से"
    },
    "voskhod-2": {
      "title": "Voskhod 2: पहली अंतरिक्ष चहलकदमी",
      "blurb": "Baikonur, 18 मार्च 1965: Alexei Leonov फुलाए जाने वाले एयरलॉक से 12 मिनट के लिए यान के बाहर निकलते हैं, और एक दिन बाद दल हाथ से टैगा के जंगल में उतरता है, तय जगह से 386 किमी दूर।",
      "chPad": "स्थल 1",
      "chAscent": "उड़ान भरना",
      "chOrbit": "कक्षा",
      "chEva": "एयरलॉक और चहलकदमी",
      "chBack": "वापस अंदर",
      "chFail": "स्वचालित उतरना विफल",
      "chRetro": "हाथ से रेट्रोफ़ायर",
      "chEntry": "वापसी",
      "chLand": "टैगा",
      "ready": "T−10 सेकंड, Baikonur का स्थल 1: Voskhod रॉकेट और, उसके खोल के नीचे, Pavel Belyayev और Alexei Leonov के साथ Voskhod 3KD। 18 मार्च 1965, 07:00:00 UTC। यहाँ बना रॉकेट Vostok-K का है; असली रॉकेट का तीसरा चरण अलग था।",
      "liftoff": "प्रक्षेपण। Voskhod 1 की तरह शुरू के कुछ मिनट, खोल हटने तक, उड़ान रोकने का कोई रास्ता नहीं है।",
      "boosters": "T+119 सेकंड: चारों साथ जुड़े बूस्टर अलग हो जाते हैं।",
      "shroud": "लगभग T+2.5 मिनट: खोल उतार दिया जाता है, और यान पहली बार दिखता है, Volga एयरलॉक उसके गोले से सटा मुड़ा हुआ।",
      "core": "T+301 सेकंड: मुख्य चरण छोड़ दिया जाता है और तीसरा चरण, Blok I, 240 सेकंड और जलता है।",
      "orbit": "कक्षा: 167 गुणा 475 किमी, 64.8 डिग्री, एक चक्कर 90.9 मिनट का। एक Vostok का गोला, उसके ऊपर बैकअप के तौर पर एक रेट्रो-रॉकेट, और दो सीटें वहाँ जहाँ Vostok में एक इजेक्शन सीट थी।",
      "volga": "Belyayev Volga एयरलॉक को फुलाते हैं: लगभग 40 हवा की नलियाँ कपड़े की 2.5 मीटर लंबी और 1.2 मीटर चौड़ी एक नली को क़रीब सात मिनट में तान देती हैं। इसका समय हमारा चुना हुआ है; इसे पहले से खुला दिखाया गया है, फूलते हुए नहीं।",
      "depress": "08:28:13 UTC: Leonov, Berkut सूट और उसके सफ़ेद बैकपैक में, एयरलॉक का दबाव घटाते हैं। यान के इलेक्ट्रॉनिक्स उसकी हवा से ठंडे होते थे, इसीलिए एयरलॉक की ज़रूरत पड़ी।",
      "hatch": "08:32:54: एयरलॉक की बाहरी हैच खोली जाती है।",
      "out": "08:34:51: Leonov एयरलॉक से बाहर निकलते हैं, उत्तर-मध्य अफ़्रीका के बहुत ऊपर, और अपनी 5.35 मीटर की डोर के सिरे तक धकेलकर जाते हैं। यान के बाहर अंतरिक्ष में होने वाले पहले इंसान।",
      "tether": "वे एयरलॉक के किनारे पर एक कैमरा जमाते हैं और जिब्राल्टर जलडमरूमध्य से कैस्पियन सागर तक नीचे देखते हैं। उनकी यहाँ की मुद्रा फ़िल्म के एक फ़्रेम से ली गई है।",
      "swell": "निर्वात में उनका सूट फूल गया है: वे अपनी छाती के कैमरे का शटर, जो पैर पर है, नहीं पकड़ पाते, और उनके दस्ताने और जूते अकड़ गए हैं। वापस अंदर आने के लिए उन्हें सूट से हवा निकालनी होगी।",
      "back": "वे नियम के ख़िलाफ़ पहले सिर के बल अंदर जाते हैं, और बाहरी हैच बंद करने के लिए मुड़ते हुए नली में आड़े अटक जाते हैं। मुड़ पाने के लिए वे सूट का दबाव सुरक्षा सीमा से नीचे गिरने देते हैं।",
      "inside": "08:47:00: एयरलॉक में वापस; हैच 08:48:40 पर बंद होती है। बाहर 12 मिनट 9 सेकंड, उत्तर-मध्य अफ़्रीका से पूर्वी साइबेरिया तक।",
      "repress": "08:51:54: एयरलॉक में फिर दबाव भरा जाता है। कुछ देर बाद Belyayev बोल्ट दागते हैं, और एयरलॉक छोड़ दिया जाता है (इसका समय हमारा है)।",
      "jettison": "Volga छोड़ दिया जाता है और लुढ़कता हुआ दूर चला जाता है; यान उसे दोबारा इस्तेमाल नहीं कर सकता।",
      "auto": "16वें चक्कर पर स्वचालित उतरने की प्रणाली को ज़मीन से प्रोग्राम किया जाता है, पर उसकी कमांड “6” पहुँचती नहीं, कहा जाता है कि सूर्य की दिशा तय करने वाली प्रणाली में गड़बड़ी थी। इसी के आसपास की योजना वाला इंजन चालू नहीं होता (इसकी घड़ी हमारी है, लगभग)।",
      "manual": "19 मार्च, 07:16 UTC: Vjezna-3 शॉर्टवेव पर दल को स्वचालित प्रणाली बंद करके हाथ से उतरने को कहता है। Belyayev के पास तैयारी के लिए एक और चक्कर है।",
      "late": "सूट पहने दोनों आदमी अपनी सीटों पर वापस नहीं पहुँच पाते, क्योंकि Belyayev ने यान को Vzor ऑप्टिकल साइट से हाथ से घुमा दिया है। रेट्रोफ़ायर 46 सेकंड देर से होता है।",
      "retro": "KTDU-60 इंजन से हाथ से रेट्रोफ़ायर। इसकी घड़ी और जगह हमारी हैं: यह प्रकाशित उतरने के समय से लगभग 45 मिनट पहले था, और स्रोत इसे नहीं बताते।",
      "wires": "उपकरण वाला हिस्सा साफ़ अलग नहीं होता; गोला तब तक बेतहाशा घूमता है जब तक लगभग 100 किमी पर तार जल नहीं जाते। (वापसी पर, थोड़ा जल्दी, अलग हुआ दिखाया गया है।)",
      "entry": "वापसी। 46 सेकंड ने यान को खेत से लगभग 386 किमी आगे पहुँचा दिया, Perm के उत्तर-पूर्व में ऊपरी Kama पठार के जंगल में।",
      "chutes": "पैराशूट। Vostok के उलट कोई बाहर नहीं निकलता: दल गोले के भीतर ही उतरता है, और ज़मीन छूने की चोट घटाने के लिए लगभग एक मीटर पर एक ठोस रॉकेट दागा जाता है (बनाया नहीं गया)।",
      "landing": "09:02:17 UTC: लगभग 59.57 उ. 55.47 पू. पर, टैगा की गहरी बर्फ़ में, Perm से 75 किमी दूर, ज़मीन पर उतरना।",
      "taiga": "खोजी हेलीकॉप्टरों के पायलटों को लाल पैराशूट घंटों बाद ही मिलता है। दल जंगल में शून्य से 5 डिग्री नीचे और उससे भी ठंडे तापमान में दो रातें बिताता है, फिर स्की करके एक हेलीकॉप्टर तक पहुँचता है।",
      "pathAscent": "प्रकाशित घटना-समय, बीच की ऊँचाइयाँ और दूरियाँ लगभग",
      "pathOrbit": "प्रकाशित कक्षा एक दिन तक आगे बढ़ाई गई, रेट्रोफ़ायर हमारी चुनी घड़ी और जगह पर, और बीच में वापसी और छतरी बनाई गई",
      "srcWiki": "Voskhod 2, Wikipedia (चहलकदमी के समय, कक्षा, उतरना)",
      "srcRocket": "Voskhod (rocket), Wikipedia (तीनों चरणों के जलने के समय)",
      "srcGrahn": "Sven Grahn, “The Voskhod 2 mission revisited” (विफल स्वचालित उतरना, हाथ से उतरने का बुलावा, जनरल Kamanin की डायरी के हवाले से)",
      "srcNssdc": "Voskhod 2, NASA NSSDCA Master Catalog (प्रक्षेपण और कक्षा)"
    },
    "sts-1": {
      "title": "STS-1: Columbia की पहली उड़ान",
      "blurb": "Kennedy, 12 अप्रैल 1981: John Young और Robert Crippen पहले स्पेस शटल को Launch Complex 39A से कक्षा में ले जाते हैं और 54 घंटे बाद उसे Edwards की सूखी झील पर ग्लाइड करके उतारते हैं।",
      "chPad": "Launch Complex 39A",
      "chAscent": "उड़ान भरना",
      "chSrb": "बूस्टर",
      "chMeco": "मुख्य इंजन बंद",
      "chOrbit": "कक्षा",
      "chHome": "घर का रास्ता",
      "chEntry": "वापसी",
      "chLand": "रनवे 23",
      "ready": "T−10 सेकंड, Kennedy Space Center का Launch Complex 39A: Columbia, एक सफ़ेद बाहरी टैंक और दो ठोस रॉकेट बूस्टर। 12 अप्रैल 1981, 12:00:04 UTC, Vostok 1 के ठीक बीस साल बाद, उसी तारीख़ को। STS-1 और STS-2 में टैंक सफ़ेद रंगा था।",
      "ignition": "T−6.6 सेकंड: तीनों मुख्य इंजन चालू होते हैं, और पूरा रॉकेट दल के पैरों की ओर आगे झुकता है और फिर वापस आता है।",
      "liftoff": "प्रक्षेपण: रॉकेट के सीधा होते ही बूस्टर जल उठते हैं। Crippen ने इसकी तुलना भाप वाले कैटापल्ट से की। पैड सादा बनाया गया है और लपटों की खाई हमारी है।",
      "roll": "मीनार से साफ़ निकलकर रॉकेट अपनी दिशा, 067 डिग्री, में घूमता है और सिर नीचे की ओर झुकता है, ऑर्बिटर टैंक के नीचे, ताकि उसके पंख बचे रहें। (पहले से उसी दिशा में बनाया गया।)",
      "maxq": "T+56 सेकंड: Max Q, Mach 1.06 और 29 kPa पर। इससे गुज़रने के लिए मुख्य इंजनों को घटाकर 65 प्रतिशत पर कर दिया गया है।",
      "srb": "T+2 मिनट 12 सेकंड: उम्मीद से बेहतर चले बूस्टर 53 किमी पर छोड़ दिए जाते हैं, योजना से 2.8 किमी ऊँचे। वे पैराशूट से अटलांटिक में गिरते हैं।",
      "meco": "T+8 मिनट 34 सेकंड: मुख्य इंजन 118 किमी पर बंद हो जाते हैं।",
      "tank": "18 सेकंड बाद बाहरी टैंक छोड़ दिया जाता है। वह हवा में टूट जाता है और हिंद महासागर में गिरता है।",
      "oms1": "T+10 मिनट 34 सेकंड: पहला OMS जलना, 86 सेकंड, ऑर्बिटर की पूँछ के पॉड के दोनों इंजनों से (बनाया नहीं गया: लपट लगभग अदृश्य है)।",
      "oms2": "T+44 मिनट 2 सेकंड: दूसरा जलना, 75 सेकंड, चढ़ाई के शिखर पर: 246 गुणा 248 किमी, 40.3 डिग्री, 89.9 मिनट। उच्चतम बिंदु की घड़ी रिपोर्ट की है; वहाँ तक का रास्ता हमारा।",
      "doors": "पेलोड बे के दरवाज़े रेडिएटर चलाने के लिए खुलते हैं, दूसरी कक्षा पूरी होने से पहले, वरना दल को लौटना पड़ता। घड़ी हमारी है। टेलीविज़न पर उन्हें OMS पॉड की खोई हुई टाइलें दिखती हैं।",
      "oms3": "T+6 घंटे 20 मिनट 46 सेकंड और 7 घंटे 5 मिनट 32 सेकंड: एक-एक इंजन के दो जलने कक्षा को 274 किमी तक उठाते हैं। दल लगभग 53 घंटे कक्षा में मशीन को परखता है।",
      "wake": "तीसरा दिन: नाश्ता, सामान जमाना, इजेक्शन सूट, और वापसी के लिए बे के दरवाज़े बंद। Young और Crippen पट्टे बाँधते हैं। उनकी कक्षा 35 चक्कर लगा चुकी है।",
      "deorbit": "36वीं कक्षा में, दक्षिणी हिंद महासागर के ऊपर, दोनों OMS इंजनों का 160 सेकंड का जलना। इसकी घड़ी और जगह हमारी हैं, मैदान से लगभग 55 मिनट पहले। Young Columbia की नाक ऊँची करके वापसी की मुद्रा में लाते हैं।",
      "entry": "वापसी का बिंदु 120 किमी पर, मैदान से लगभग 8 110 किमी दूर, 28 240 किमी/घंटा पर। गर्मी के सबसे बुरे दौर के ख़त्म होने तक हमले का कोण 40 डिग्री रहता है। यह पुनर्निर्माण इस बिंदु को पश्चिमी प्रशांत के ऊपर रखता है; रिपोर्ट पूर्वी कहती है।",
      "blackout": "100 किमी पर एक गुलाबी दमक; दोनों आदमी अपने चेहरे के शीशे झुका लेते हैं। लगभग 21 मिनट रेडियो नहीं, जिनमें 16 आयनित हवा की वजह से। वापसी का ज़्यादातर हिस्सा कंप्यूटर उड़ाते हैं, Mach 18.5 और 9.8 पर रोल उलटते हुए।",
      "bigsur": "Mach 7 और 41 किमी पर Big Sur के पास कैलिफ़ोर्निया का तट। मैदान तक पहुँचने के लिए Columbia अपनी कक्षा के रास्ते के आर-पार 583 किमी उड़ चुका है, जिसे बनाया गया है।",
      "hac": "Young कमान सँभालते हैं। Mach 4.8 और 2.8 के उलटाव हो चुके हैं, झील के रनवे 23 पर एक चौड़ा बायाँ मोड़, और साथ जुड़ता एक T-38 चेज़ विमान। मोड़ का आकार हमारा है।",
      "touch": "T+54 घंटे 20 मिनट 53 सेकंड, 18:20:57 UTC: Edwards के रनवे 23 पर मुख्य पहिए 339 किमी/घंटा पर छूते हैं, योजना से धीमे और रनवे पर लगभग 800 मीटर आगे। पहियों का नीचे आना कुछ सेकंड पहले बनाया गया है।",
      "stop": "Young: “This is the world's greatest all-electric flying machine. I'll tell you that. That was super!” 36 कक्षाएँ, 1 729 348 किमी, 2 दिन 6 घंटे 20 मिनट 53 सेकंड।",
      "pathAscent": "प्रकाशित घटना-समय और ऊँचाइयाँ, बीच की दूरियाँ लगभग",
      "pathOrbit": "प्रकाशित जलने और कक्षाएँ चापों से जुड़ी, और बीच में कक्षा से हटने का जलना, वापसी और नज़दीक आना बनाए गए; हमारी चुनी घड़ियाँ और जगहें कैप्शन में बताई गई हैं",
      "srcWiki": "STS-1, Wikipedia (घटना-समय और ऊँचाइयाँ, कक्षाएँ, जलना, वापसी और उतरना), NASA के मिशन दस्तावेज़ों से",
      "srcNssdc": "STS-1 Columbia, NASA NSSDCA Master Catalog (प्रक्षेपण और उतरना)"
    },
    "hubble-deployment": {
      "title": "Discovery से Hubble का छोड़ा जाना",
      "blurb": "STS-31, 25 अप्रैल 1990: भुजा Hubble Space Telescope को Discovery के बे से ऊपर उठाती है, उसके सौर पैनल खुलते हैं (एक रुक जाता है), एंटीना खुलते हैं, और 19:38 UTC पर Steven Hawley उसे छोड़ देते हैं।",
      "chBay": "बे में",
      "chLift": "बे से बाहर",
      "chArrays": "सौर पैनल",
      "chStop": "एक रुकता है",
      "chAntennas": "एंटीना",
      "chSwing": "छोड़ने की जगह तक",
      "chRelease": "छोड़ा गया",
      "chAway": "पीछे हटना",
      "ready": "उड़ान का दूसरा दिन, 25 अप्रैल 1990, 613 किमी ऊपर। Discovery का बे खुला है और 13.2 मीटर लंबा Hubble Space Telescope अपनी जगह पर है। शटल पृथ्वी के ऊपर कहाँ है, और छोड़ने के पल को छोड़कर यहाँ की हर घड़ी, हमारी है: स्रोत छोड़ने का समय देते हैं और लगभग कुछ और नहीं।",
      "grapple": "भुजा का एंड इफ़ेक्टर टेलीस्कोप के एंटीना ड्राइव में से एक के पास की पकड़ वाली जगह पर अपना फंदा कसता है। Steven Hawley भुजा को पिछले फ़्लाइट डेक से चलाते हैं। भुजा के जोड़ दो कड़ियों वाली भुजा की तरह बनाए गए हैं जो हर जगह पहुँचती है; वे टेलीमेट्री नहीं हैं।",
      "umbilical": "टेलीस्कोप अपनी बिजली पर आ जाता है और शटल की आपूर्ति बंद कर दी जाती है (NASA)। जिन कुंडों ने उसे बे में थामा था, दो किनारों पर और एक फ़र्श पर, उनका आकार और समय हमारा है।",
      "unberth": "भुजा टेलीस्कोप को उसकी जगह से सीधा ऊपर उठाती है। घड़ी और ऊँचाई हमारी हैं।",
      "arrays": "सौर पैनल, जो प्रक्षेपण के लिए ड्रमों पर लिपटे और ट्यूब के साथ मुड़े थे, बगल से बाहर घुमाए जाते हैं। उन्हें कैसे रखा गया था, यह तस्वीरों से बनाया गया है, चित्रों से नहीं। ये पहले सुनहरे-पीले पैनल 1993 में बदल दिए गए।",
      "unroll": "पहला पैनल अपनी बूमों के साथ खुलता है, लगभग 7 मीटर गुणा 2.5 मीटर तक। इसमें कितना समय लगा, यह हमारा है।",
      "stop": "दूसरा पैनल आधा निकलकर रुक जाता है। McCandless और Sullivan आंशिक दबाव वाले एयरलॉक में इंतज़ार करते हैं कि उसे छुड़ाने के लिए अंतरिक्ष चहलकदमी की ज़रूरत पड़े। कौन-सा पैनल था, यह दो तरह से बताया जाता है; यहाँ बनाया गया पैनल हमारा चुना हुआ है।",
      "wait": "नियंत्रक बार-बार कोशिश करते हैं, और कक्षा पृथ्वी की छाया में जाकर बाहर आती है। 19वीं कक्षा के लिए तय छोड़ना एक कक्षा आगे खिसक जाता है। इसमें कितना समय लगा, और कब, यह हमारा है।",
      "free": "ज़मीन से आख़िरी कोशिश काम करती है और पैनल बाक़ी रास्ता खुल जाता है; चहलकदमी की ज़रूरत नहीं पड़ती। समय हमारा है।",
      "antennas": "दोनों ऊँचे-लाभ वाले एंटीना की बूमें नीचे और बाहर की ओर उछलकर खुलती हैं, और उनकी डिशें मुक्त हो जाती हैं। वे कैसे मुड़ी थीं, और कब, यह हमारा है।",
      "swing": "भुजा टेलीस्कोप को बे के ऊपर छोड़ने की स्थिति तक घुमाती है। रास्ता हमारा है।",
      "readyRelease": "भुजा के पकड़े रहते Hubble की दिशा-प्रणालियाँ चालू करके परखी जाती हैं। भुजा के छोड़ने से पहले हर प्रणाली जाँची जाती है (NASA)।",
      "release": "19:38 UTC, 25 अप्रैल 1990, प्रक्षेपण के 31 घंटे 4 मिनट बाद: Hawley फंदा खोलते हैं और Hubble आज़ाद हो जाता है। Jonathan's Space Report 19:38 बताती है; America Space के अनुसार 3:37 p.m. EDT।",
      "away": "टेलीस्कोप वहीं टिका रहता है जहाँ रखा गया था और Discovery पीछे हटता है। America Space के अनुसार फ़्लाइट डेक से किसी ने कैमरे के लिए आवाज़ लगाई। भुजा पीछे खिंच जाती है।",
      "pulses": "Discovery अपनी कक्षा थोड़ी ऊँची करने के लिए थ्रस्टर दो बार दागता है, ताकि वह धीरे-धीरे पीछे खिसकता जाए। दागने के समय और उनका आकार हमारे हैं।",
      "trail": "सावधानी के तौर पर Discovery लगभग दो दिन Hubble के पास रहता है (NASA); योजना थी कि अगर एपर्चर दरवाज़े में दिक़्क़त हो तो वह उसके लगभग 40 समुद्री मील पीछे चले।",
      "pathOrbit": "प्रकाशित रूप में 28.45 डिग्री पर 613 किमी का वृत्त, उस पर जगह हमने धूप में रखने के लिए चुनी",
      "pathHst": "छोड़े जाने के बाद का टेलीस्कोप, उसी कक्षा में जिसमें उसे छोड़ा गया",
      "srcNasa": "STS-31, NASA का Space Shuttle archive पेज (प्रक्षेपण का समय, कक्षा)",
      "srcKit": "STS-31 press kit, NASA (तैनाती की योजना, दल के काम, 19वीं कक्षा, पीछे चलना)",
      "srcJsr": "Jonathan's Space Report no. 36 (19:38 UTC पर छोड़ना, एक कक्षा की देरी, वह पैनल जो नहीं खुला)",
      "srcAmerica": "America Space, “Somebody Get a Camera” (पैनल, एंटीना, थ्रस्टर की दाग, 3:37 p.m. EDT)"
    },
    "falcon9-og2-2": {
      "title": "Falcon 9 की पहली लैंडिंग",
      "blurb": "Cape Canaveral, 21 दिसंबर 2015: Falcon 9 की उड़ान 20 11 ORBCOMM उपग्रहों को ऊपर ले जाती है और उसका पहला चरण Landing Zone 1 पर लौट आता है, किसी कक्षीय रॉकेट के पहले चरण की पहली लैंडिंग।",
      "chPad": "Launch Complex 40",
      "chAscent": "उड़ान भरना",
      "chSep": "बंद होना और अलगाव",
      "chReturn": "बूस्टबैक",
      "chEntry": "नीचे का रास्ता",
      "chLanding": "Landing Zone 1",
      "ready": "T−10 सेकंड, Space Launch Complex 40, Cape Canaveral, 21 दिसंबर 2015, रात 8:29: Falcon 9 Full Thrust, 70 मीटर ऊँचा, अपनी पहली उड़ान पर, 11 ORBCOMM उपग्रह लिए हुए। रात है; रॉकेट हमारी एक लैंप की रोशनी में बनाया गया है। SpaceX लैंडिंग को “एक गौण परीक्षण उद्देश्य” कहता है।",
      "ignition": "T−3 सेकंड: पहले चरण के नौ Merlin इंजन चालू होते हैं।",
      "liftoff": "प्रक्षेपण 22 दिसंबर को 01:29:00 UTC पर। 70 मीटर में से पहला चरण 41 मीटर है।",
      "mach1": "T+1:05: Mach 1, जैसा वेबकास्ट के पुनर्निर्माण में है।",
      "maxq": "T+1:13: Max Q, वह क्षण जब हवा सबसे ज़ोर से दबाती है; इसके लिए इंजन घटाकर चलाए गए।",
      "meco": "T+2:23: मुख्य इंजन 75 किमी और 1.67 किमी/सेकंड पर बंद (वेबकास्ट का पुनर्निर्माण; SpaceX ने T+2:20 की योजना बनाई थी)।",
      "sep": "T+2:25: चरण अलग होते हैं। पहला चरण अपने ठंडी-गैस थ्रस्टरों पर पूँछ आगे करके मुड़ता है, जो लगभग आधे मिनट में बनाया गया है; इसमें कितना समय लगा, यह हमारा है।",
      "s2": "T+2:34: दूसरे चरण का निर्वात इंजन जलता है और वह आगे निकल जाता है। उसका रास्ता थोड़ी ही दूर तक बनाया गया है, और हमारा है।",
      "fairing": "T+2:48: फ़ेयरिंग के दोनों आधे, 5.2 मीटर चौड़े, छोड़ दिए जाते हैं।",
      "boostback": "T+3:47: पहले चरण के तीन इंजन बूस्टबैक के लिए जलते हैं, जो उसका रास्ता Cape की ओर मोड़ देता है। वे कितनी देर जलते हैं, यह हमारा है: इस चित्र में लगभग 35 सेकंड।",
      "fins": "चारों ग्रिड फ़िन हवा में चरण को दिशा देने के लिए बाहर घूमते हैं। कब, यह हमारा है।",
      "coast": "चरण शिखर के ऊपर से बहता है, इस चित्र में लगभग 190 किमी ऊपर (हमारा), और नीचे उतरने लगता है।",
      "entry": "T+8:01: चरण को घनी हवा से पहले धीमा करने के लिए तीन इंजन वापसी के जलने के लिए फिर जलते हैं।",
      "entryEnd": "T+8:21: वापसी का जलना ख़त्म। हवा में गिरते हुए चरण अपने फ़िन से दिशा बदलता है।",
      "landingBurn": "T+9:11: एक इंजन लैंडिंग के जलने के लिए जलता है, जिसे चरण को पैड पर रोकना है। वह 33 सेकंड चलता है।",
      "legs": "चारों लैंडिंग पैर, जो उड़ान में बगल से मुड़े थे, ज़मीन छूने से कुछ सेकंड पहले नीचे घूमते हैं। कब, यह हमारा है।",
      "touch": "T+9:44, 01:38:44 UTC: पहला चरण Landing Zone 1 पर खड़ा होता है, 86 मीटर चौड़े एक गोल पैड पर जिस पर एक क्रॉस बना है, जिस पैड से वह चला था उससे लगभग 9 किमी दक्षिण में। किसी कक्षीय रॉकेट का कोई पहला चरण पहले कभी नहीं उतरा था।",
      "sats": "इस बीच दूसरा चरण T+14:26 से T+19:05 तक 11 उपग्रह छोड़ता है (बनाया नहीं गया), और फिर यह दिखाने के लिए अपना इंजन दोबारा जलाता है कि वह जल सकता है, किसी बाद की उड़ान के लिए।",
      "pathAscent": "प्रकाशित घटना-समय, और मुख्य इंजन बंद होने पर प्रकाशित ऊँचाई और रफ़्तार, बीच की चढ़ाई हमारी; रॉकेट अँधेरे में उड़ा और एक लैंप से रोशन बनाया गया है",
      "pathBooster": "प्रकाशित जलने के समय और उतरने की जगह, बीच का चाप, उसकी रफ़्तारें और बूस्टबैक की अवधि हमने बिंदु-द्रव्यमान की तरह उड़ाई; लैंप से रोशन बनाया गया",
      "pathStage2": "अलग होने के बाद दूसरा चरण, हमने उसे उसी दिशा में आगे धकेला जिसमें वह जा रहा था; वह वहीं रुकता है जहाँ चित्र रुकता है",
      "srcKit": "SpaceX, ORBCOMM-2 Mission press kit, 21 दिसंबर 2015 (योजना: समय, जलना, लैंडिंग एक गौण परीक्षण उद्देश्य के रूप में)",
      "srcRecon": "Spaceflight101, “Reconstruction: Milestone Falcon 9 Flight with eleven OG2 Satellites” (वेबकास्ट से घटना-समय, 75 किमी और 1.67 किमी/सेकंड पर MECO)",
      "srcWiki": "Falcon 9 flight 20, Wikipedia (प्रक्षेपण का समय, पेलोड, दूसरे चरण का दोबारा जलना)",
      "srcLz": "Landing Zones 1 and 2, Wikipedia (जगह, और X से चिह्नित 282 फ़ुट के पैड)"
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

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  // forge #572 (Name the stars in your photo): begin
  "skyPhoto": {
    "pick": "फ़ोटो चुनें",
    "drop": "या यहाँ छोड़ें",
    "private": "आपकी फ़ोटो इसी डिवाइस पर पढ़ी जाती है और कभी अपलोड नहीं होती। उसका कुछ भी न सहेजा जाता है, न भेजा जाता है।",
    "loading": "फ़ोटो पढ़ी जा रही है…",
    "notImage": "यह फ़ाइल ऐसी तस्वीर नहीं है जिसे यह ब्राउज़र खोल सके।",
    "tooBig": "फ़ोटो {w} × {h} पिक्सेल पर दिखाई गई है: तारों के नाम लिखने के लिए काफ़ी बड़ी, इस डिवाइस के लिए काफ़ी छोटी।",
    "another": "दूसरी फ़ोटो",
    "modeLabel": "कैसे मिलाएँ",
    "modeStars": "दो तारे",
    "modeRough": "समय और दिशा",
    "howStars": "फ़ोटो में कोई जाना-पहचाना तारा छुएँ, फिर बताएँ कि वह कौन-सा है। दो तारे आकाश को मिला देते हैं; तीसरा जाँचता है।",
    "howRough": "पहले मोटे-मोटे आकाश के लिए बताएँ कि कैमरा कब, कहाँ और किस ओर था। फिर दो तारों से उसे पक्का करें।",
    "tapStar": "फ़ोटो में तारा {n} छुएँ",
    "whichStar": "यह कौन-सा तारा है?",
    "allStars": "सभी चमकीले तारे",
    "starMark": "तारा {n}: {name}",
    "undo": "आख़िरी तारा हटाएँ",
    "aligned": "{count} तारों पर मिलाया गया: फ़ोटो {w}° चौड़ी है।",
    "alignedTwo": "दो तारों पर मिलाया गया। मेल जाँचने के लिए तीसरा जोड़ें।",
    "fit": "तारे औसतन अपनी जगह से {px} पिक्सेल के भीतर हैं।",
    "fitPoor": "तारे औसतन {px} पिक्सेल से अपनी जगह चूकते हैं: वाइड या फ़िशआई लेंस आकाश को मोड़ देता है, या किसी तारे का नाम ग़लत चुना गया।",
    "mirrored": "यह फ़ोटो उलटी (दर्पण जैसी) है, जैसी सामने का कैमरा लेता है। इसे वैसे ही पढ़ा गया है।",
    "snap": "फ़ोटो के तारों पर बैठाएँ",
    "snapped": "फ़ोटो में मिले {count} तारों पर बैठाया गया।",
    "snapNone": "कोई तारा इतना साफ़ नहीं उभरा कि उस पर बैठाया जा सके। आपके चुने तारे अब भी लागू हैं।",
    "when": "कब ली गई",
    "whenNote": "इस डिवाइस के समय क्षेत्र में।",
    "whenFromPhoto": "फ़ोटो से पढ़ा गया, इसी डिवाइस पर।",
    "whenNone": "समय के बिना ग्रह और चंद्रमा नहीं दिखते: वे तारों के बीच चलते हैं।",
    "where": "कहाँ ली गई",
    "whereNone": "धरती पर कहीं",
    "whereNote": "पास का कोई शहर काफ़ी है। उसके बिना चंद्रमा एक डिग्री तक हट सकता है।",
    "facing": "कैमरा किस ओर था",
    "height": "क्षितिज से ऊँचाई",
    "heightValue": "{n}°",
    "field": "फ़ोटो की चौड़ाई",
    "fieldValue": "{n}°",
    "fieldNote": "फ़ोन का मुख्य कैमरा लगभग 65° चौड़ा देखता है; उसका ज़ूम 25 से 35°।",
    "drawRough": "आकाश बनाएँ",
    "roughDone": "समय और दिशा से बना मोटा-मोटा आकाश। उसे पक्का करने के लिए दो तारे छुएँ।",
    "roughNeeds": "पहले समय और जगह चुनें।",
    "compass": {
      "n": "उत्तर",
      "ne": "उत्तर-पूर्व",
      "e": "पूर्व",
      "se": "दक्षिण-पूर्व",
      "s": "दक्षिण",
      "sw": "दक्षिण-पश्चिम",
      "w": "पश्चिम",
      "nw": "उत्तर-पश्चिम"
    },
    "show": "दिखाएँ",
    "showLines": "तारामंडल की रेखाएँ",
    "showNames": "तारामंडलों के नाम",
    "showStars": "तारों के नाम",
    "showBodies": "ग्रह और चंद्रमा",
    "save": "तस्वीर सहेजें",
    "saved": "{file} के रूप में सहेजी गई।",
    "saveFailed": "इस डिवाइस पर तस्वीर नहीं बन सकी।",
    "credit": "तारों और तारामंडलों के नाम Space Radar ने लिखे, spaceradar.ai/sky-photo",
    "creditData": "तारे: HYG और d3-celestial। ग्रह: Astronomy Engine।",
    "canvasLabel": "तारों के नामों वाली आपकी फ़ोटो",
    "planetsFailed": "यहाँ ग्रहों की गणना नहीं हो सकी।",
    "bodies": {
      "moon": "चंद्रमा",
      "mercury": "बुध",
      "venus": "शुक्र",
      "mars": "मंगल",
      "jupiter": "बृहस्पति",
      "saturn": "शनि",
      "uranus": "अरुण",
      "neptune": "वरुण"
    }
  },
  // forge #572: end
  "orrery": {
    "title": "आकार और दूरी",
    "size": "अतिरिक्त आकार",
    "sizeTrue": "कोई नहीं",
    "sizeValue": "×{n}",
    "sizeTitle": "दुनियाएँ उन बिंदुओं के ऊपर और कितनी बड़ी बनाई गई हैं जो पहले से असल से बड़े हैं, कोई नहीं से ×{max} तक",
    "dist": "दूरी",
    "distTrue": "असली",
    "distLog": "लघुगणकीय",
    "distSome": "लघुगणकीय की ओर {p}% रास्ता",
    "distTitle": "सूर्य से दूरियाँ कितनी सिकोड़ी गई हैं, असली से लघुगणकीय तक। दिशाएँ मापी हुई ही रहती हैं।",
    "presets": "तैयार दृश्य",
    "presetTrue": "असली पैमाना",
    "presetTrueTitle": "हर दुनिया अपने असली आकार में और अपनी असली दूरी पर",
    "presetClass": "कक्षा",
    "presetClassTitle": "दुनियाएँ ×{n} और दूरियाँ लघुगणकीय, जैसे सौरमंडल के यांत्रिक मॉडल में",
    "held": "सफ़र के दौरान सब कुछ असली पैमाने पर बनता है। सफ़र खत्म होने पर स्लाइडर लौट आते हैं।",
    "note": "आकाश में हर दुनिया कहाँ है, यह हमेशा मापा हुआ है। बैज बताता है कि उसे कितना बड़ा बनाया गया है।",
    "noteSize": "{name} को आकार स्लाइडर से असल से ×{n} बड़ा बनाया गया है।",
    "noteDist": "इसे सूर्य से {drawn} AU पर बनाया गया है, जबकि यह असल में {au} AU पर है, अपनी असली दिशा में (दूरी स्लाइडर)।",
    "noteMoon": "इसे {parent} से असल से {n} गुना दूर बनाया गया है, अपनी असली दिशा में, ताकि यह बड़े किए गए ग्रह के बाहर रहे।",
    "noteSun": "सूर्य को आकार स्लाइडर से असल से ×{n} बड़ा बनाया गया है, और इस तरह कि बुध उसके बाहर रहे।",
    "badgeSun": "सूर्य ×{n}",
    "badgeLog": "लघुगणकीय दूरियाँ",
    "badgeSome": "दूरियाँ {p}% लघुगणकीय",
    "badgeJoin": " · ",
    "badgeTitle": "यह दृश्य ग्रह टैब के आकार और दूरी स्लाइडर से बनता है।"
  },
  "cutaway": {
    "button": "अंदर देखें",
    "buttonTitle": "{name} को उसकी परतों तक खोलें, उन गहराइयों पर जो माप बताते हैं",
    "title": "{name} के अंदर",
    "close": "काट-दृश्य बंद करें",
    "model": "परतें {model} से।",
    "source": "स्रोत",
    "layers": "परतें, सतह से नीचे की ओर",
    "depthRange": "{top}–{bottom} किमी",
    "toCentre": "{top} किमी से केंद्र तक",
    "cls": {
      "measured": "मापा हुआ",
      "modelled": "मॉडल",
      "inferred": "अनुमान से निकाला"
    },
    "clsTitle": "{cls}: {source}",
    "probe": "गहराई",
    "probeTitle": "सतह से केंद्र तक नीचे खिसकाएँ",
    "depth": "{km} किमी नीचे",
    "atCentre": "केंद्र",
    "layer": "परत",
    "pressure": "दबाव",
    "temperature": "तापमान",
    "density": "घनत्व",
    "valueCls": "{value} ({cls})",
    "note": "गहराइयाँ स्रोतों से हैं; रंग चुने हुए हैं। किसी परत के ऊपर और नीचे के बीच प्रोब बीच के मान पढ़ता है।",
    "unknown": "उस दुनिया का काट-दृश्य अभी नहीं है।",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} मिलियन GPa",
      "k": "{n} K",
      "millionK": "{n} मिलियन K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "भूपर्पटी",
      "mantle": "मेंटल",
      "upper-mantle": "ऊपरी मेंटल",
      "lower-mantle": "निचला मेंटल",
      "outer-core": "तरल बाहरी कोर",
      "inner-core": "ठोस भीतरी कोर",
      "liquid-core": "तरल कोर",
      "iron-core": "लोहे का कोर",
      "molten-silicate": "पिघली चट्टान की परत",
      "partial-melt": "आंशिक रूप से पिघली परत",
      "ice-shell": "बर्फ़ का खोल",
      "ocean": "महासागर",
      "hp-ice": "ऊँचे दबाव की बर्फ़",
      "rock-mantle": "चट्टानी मेंटल",
      "rock-core": "चट्टानी कोर",
      "hydrated-core": "चट्टान और बर्फ़ का कोर",
      "molecular": "हाइड्रोजन और हीलियम",
      "metallic": "धात्विक हाइड्रोजन",
      "dilute-core": "फैला हुआ कोर",
      "ice-mantle": "पानी, अमोनिया और मीथेन",
      "convective": "संवहन क्षेत्र",
      "radiative": "विकिरण क्षेत्र",
      "solar-core": "कोर"
    }
  },
  "helio": {
    "chip": "हीलियोस्फीयर · मॉडल",
    "chipTitle": "सौरमंडल के चारों ओर का बुलबुला किस आधार पर बनाया गया है",
    "legendTitle": "हीलियोस्फीयर",
    "rowTs": "टर्मिनेशन शॉक, जहाँ सौर हवा धीमी होकर ध्वनि की गति से नीचे आ जाती है। दोनों पारगमनों से होकर बना मॉडल आकार: Voyager 1 {a} AU पर, Voyager 2 {b} AU पर (मापा हुआ)।",
    "rowHp": "हीलियोपॉज़, जहाँ सूर्य की हवा तारों के बीच की गैस से मिलती है। पारगमनों से होकर बना मॉडल आकार (Parker 1961): Voyager 1 {a} AU पर, Voyager 2 {b} AU पर (मापा हुआ)।",
    "rowBow": "बो वेव, जहाँ तारों के बीच की गैस आगे जमा होती है। सांकेतिक: हीलियोपॉज़ की दूरी का दोगुना (McComas et al. 2012)।",
    "rowRibbon": "IBEX रिबन, आकाश पर एक चमकीली पट्टी जिसे IBEX ने मापा (Funsten et al. 2013)। इसकी दूरी मापी नहीं गई है: इसे {au} AU पर बनाया गया है।",
    "rowMotion": "स्थानीय अंतरतारकीय गैस में सूर्य का रास्ता, {v} किमी/सेकंड (IBEX, McComas et al. 2015)। तीर इस रास्ते के {years} साल दिखाता है, यानी {au} AU।",
    "sources": "पारगमन की जगहें NASA की पारगमन तारीखों पर JPL Horizons में Voyager यानों के रास्तों से। आकार: Parker 1961, Wilkin 1996, Izmodenov & Alexashov 2015 और Opher et al. 2015 के आधार पर।",
    "crossing": "{craft}: {surface}, {au} AU, {date}",
    "motion": "सूर्य का रास्ता, {v} किमी/सेकंड",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "टर्मिनेशन शॉक",
      "hp": "हीलियोपॉज़"
    },
    "surfaceLabel": {
      "ts": "टर्मिनेशन शॉक (मॉडल)",
      "hp": "हीलियोपॉज़ (मॉडल)",
      "bow": "बो वेव (सांकेतिक)",
      "ribbon": "IBEX रिबन (आकाश पर मापा हुआ)"
    },
    "date": "{d} {m} {y}",
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
    ]
  }
});
// b200-f2-worlds: end

// 2.0.x (internal #300, #302, #303): the glossary's star and deep-sky words (glossaryMore), the paragraphs of the Sun, Moon and planets, and the planets' lead lines. hi: machine-drafted
// like the rest of this file (docs/TRANSLATING.md). A key this file already has is left as it is.
{
  const topUp = (dst, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') topUp(dst[k], src[k]);
      else if (!(k in dst)) dst[k] = src[k];
    }
  };
  topUp(COPY, {
    "glossaryMore": {
      "black hole": "वह जगह जहाँ गुरुत्वाकर्षण इतना तेज़ है कि कुछ भी, रोशनी भी, बाहर नहीं निकल पाती। यह कोई गड्ढा नहीं है, बल्कि बहुत सारा पदार्थ एक छोटी सी जगह में ठसा हुआ है।",
      "neutron star": "एक भारी तारा मरते समय जो छोड़ सकता है: सूर्य के द्रव्यमान से ज़्यादा पदार्थ, एक शहर जितनी चौड़ी गेंद में दबा हुआ।",
      "pulsar": "तेज़ घूमता न्यूट्रॉन तारा जो लाइटहाउस की तरह किरणें भेजता है। हर बार जब कोई किरण हमारे ऊपर से गुज़रती है, हमें एक झिलमिलाहट दिखती है।",
      "white dwarf": "सूर्य जैसे तारे के अपनी बाहरी परतें उतार देने के बाद बचा गर्म केंद्र। यह पृथ्वी जितना बड़ा होता है, नई गर्मी नहीं बनाता और धीरे-धीरे ठंडा होता जाता है।",
      "brown dwarf": "ऐसी चीज़ जो ग्रह होने के लिए बहुत बड़ी और तारे की तरह चमकने के लिए बहुत छोटी है: बृहस्पति के द्रव्यमान का लगभग 13 से 80 गुना। यह दिखने वाली रोशनी लगभग नहीं देती।",
      "nebula": "अंतरिक्ष में गैस और धूल का बादल। कुछ चमकते हैं, कुछ अपने पीछे के तारों को छिपा लेते हैं, और कुछ में नए तारे बन रहे होते हैं।",
      "galaxy": "तारों, गैस और धूल का एक विशाल परिवार, जो गुरुत्वाकर्षण से बँधा है। हमारी, यानी आकाशगंगा, एक सर्पिल है जो लगभग 100 000 प्रकाश-वर्ष चौड़ी है।",
      "globular cluster": "दसियों हज़ार से लेकर लाखों तारों की एक गेंद, जो गुरुत्वाकर्षण से कसकर पास-पास बँधे हैं, और केंद्र पर सबसे घने।",
      "habitable zone": "किसी तारे से दूरियों का वह दायरा जहाँ किसी ग्रह की सतह पर तरल पानी हो सकता है। इसका मतलब है कि वहाँ जीवन संभव हो सकता है, यह नहीं कि वहाँ कोई रहता है।",
      "exoplanet": "वह ग्रह जो सूर्य के अलावा किसी और तारे का चक्कर लगाता है।",
      "redshift": "रोशनी जो लंबी, ज़्यादा लाल तरंगों में खिंच गई है, क्योंकि उसका स्रोत दूर जा रहा है या रास्ते में अंतरिक्ष खिंच गया। दूर की आकाशगंगाओं के लिए ज़्यादा लाल विस्थापन का मतलब है ज़्यादा दूर।",
      "supernova": "किसी तारे का, या किसी सफ़ेद बौने का, जीवन के अंत में विस्फोट। कुछ हफ़्तों तक यह पूरी आकाशगंगा जितना चमक सकता है।",
      "light curve": "इसका ग्राफ़ कि कोई चीज़ समय के साथ कितनी चमकीली है। इसमें कोई उभार या गिरावट बता सकती है कि तारा फूलता और सिकुड़ता है, या कोई चीज़ उसके सामने से गुज़र रही है।"
    },
    "worldAbout": {
      "about": {
        "sun": "सूर्य एक तारा है: बहुत गर्म, चमकती गैस का गोला, ज़्यादातर हाइड्रोजन और हीलियम, लगभग 4.5 अरब साल पुराना। यह पृथ्वी से लगभग 100 गुना चौड़ा है। इसका केंद्र लगभग 15 मिलियन °C गर्म है, नाभिकीय संलयन के लिए काफ़ी गर्म, और जो ऊर्जा बाहर आती है, उसी पर पृथ्वी का ज़्यादातर जीवन टिका है। इसका गुरुत्वाकर्षण पूरे सौरमंडल को बाँधे रखता है।",
        "moon": "चंद्रमा पृथ्वी का अकेला प्राकृतिक उपग्रह है, पृथ्वी की चौड़ाई के एक तिहाई से भी छोटा। यह गड्ढों वाला चट्टान का गोला है, जो औसतन लगभग 384 000 किमी दूर है। इसे पृथ्वी का एक चक्कर लगभग 27 दिन में लगता है और अपनी धुरी पर एक बार घूमने में भी उतना ही समय, इसलिए हमें हमेशा वही तरफ़ दिखती है। काले धब्बे पुराने लावा के मैदान हैं। पृथ्वी के बाहर यह अकेली दुनिया है जहाँ अब तक लोग गए हैं।",
        "mercury": "बुध सबसे छोटा ग्रह है और सूर्य के सबसे पास है, चंद्रमा से बस थोड़ा ही बड़ा। इसकी चट्टानी ज़मीन गड्ढों से भरी है। इसके पास गर्मी रोकने लायक हवा लगभग नहीं है, इसलिए तापमान दिन में लगभग 430 °C से रात में लगभग शून्य से 180 °C नीचे तक बदलता है। इसे सूर्य का एक चक्कर लगाने में 88 दिन लगते हैं, किसी भी और ग्रह से कम।",
        "venus": "शुक्र का आकार लगभग पृथ्वी जितना है: चौड़ाई 12 104 किमी, जबकि पृथ्वी की 12 742। इसकी घनी हवा ज़्यादातर कार्बन डाइऑक्साइड है, जिसमें सल्फ़्यूरिक अम्ल के बादल हैं, और यह गर्मी को रोक लेती है। ज़मीन लगभग 464 °C है, बुध से भी गर्म और सीसा पिघलाने लायक गर्म, और हवा इस पर पृथ्वी से लगभग 92 गुना ज़्यादा ज़ोर से दबती है। शुक्र का घूमना धीमा और उलटी दिशा में है: एक चक्कर में 243 पृथ्वी-दिन लगते हैं, जो इसके 225 दिन के साल से भी लंबा है।",
        "earth": "पृथ्वी अकेली जगह है जहाँ हम जानते हैं कि जीवित चीज़ें हैं। यह अकेला ग्रह है जिसकी सतह पर तरल पानी है, और इसका ज़्यादातर हिस्सा महासागर से ढका है। एक चक्कर में 23.9 घंटे लगते हैं और सूर्य का एक चक्कर लगाने में 365.25 दिन, इसीलिए हम हर चार साल में एक लीप दिन जोड़ते हैं। सूर्य की रोशनी को यहाँ पहुँचने में लगभग आठ मिनट लगते हैं।",
        "mars": "मंगल एक ठंडा, धूल भरा रेगिस्तान है, जो पृथ्वी से लगभग आधा चौड़ा है। इसकी चट्टानों और धूल में लोहे को जंग लग गया है, इसीलिए इसका रंग लाल दिखता है। इस पर सौरमंडल का सबसे बड़ा ज्वालामुखी ओलिंपस मोन्स है, और घाटियों का एक तंत्र वैलेस मैरिनेरिस है, जो ग्रैंड कैन्यन से दस गुना से ज़्यादा लंबा और चौड़ा है। यहाँ कभी नदियाँ और झीलें बहती थीं; अब हवा पतली है और इसका पानी बर्फ़ है या बहुत खारा।",
        "jupiter": "बृहस्पति सबसे बड़ा ग्रह है: पृथ्वी से 11 गुना चौड़ा, और इसके अंदर लगभग एक हज़ार पृथ्वियाँ समा सकती हैं। इसमें ज़्यादातर हाइड्रोजन और हीलियम है, और इस पर खड़े होने लायक कोई ठोस ज़मीन नहीं है। इसकी धारियाँ अमोनिया और पानी के ठंडे, हवादार बादल हैं। महान लाल धब्बा पृथ्वी से भी चौड़ा एक तूफ़ान है, जिसे लोग 300 साल से ज़्यादा समय से देख रहे हैं। एक चक्कर में केवल 9.9 घंटे लगते हैं, यानी किसी भी ग्रह का सबसे छोटा दिन।",
        "saturn": "शनि ज़्यादातर हाइड्रोजन और हीलियम का गोला है, पृथ्वी से 9 गुना चौड़ा। इसके छल्ले बर्फ़ और चट्टान के अरबों टुकड़े हैं, धूल के कणों से लेकर घर जितने बड़े ढेलों तक। ये लगभग 282 000 किमी तक फैले हैं, फिर भी आम तौर पर केवल लगभग 10 मीटर मोटे हैं। शनि अकेला ग्रह है जो पानी से कम घना है, इसलिए काफ़ी बड़ा टब हो तो पानी इसे तैरा देगा।",
        "uranus": "अरुण एक बर्फ़ीला दानव है, पृथ्वी से चार गुना चौड़ा, जिसे 1781 में William Herschel ने टेलीस्कोप से खोजा था। इसका ज़्यादातर हिस्सा पानी, मीथेन और अमोनिया का गर्म, घना द्रव है। इसकी हवा में मीथेन लाल रोशनी सोख लेती है, जिससे इसका रंग नीला-हरा दिखता है। इसकी धुरी लगभग 98 डिग्री झुकी है, इसलिए सूर्य का चक्कर लगाते समय इसका घूमना बगल के बल लुढ़कने जैसा है, और हर ध्रुव पर लगभग 21 साल का अँधेरा सर्दी का मौसम रहता है।",
        "neptune": "वरुण एक बर्फ़ीला दानव है, पृथ्वी से चार गुना चौड़ा, और अकेला ग्रह जिसे आप सिर्फ़ आँखों से नहीं देख सकते। वहाँ दोपहर भी उतनी ही धुंधली है जितनी हमारी साँझ। इसका एक साल लगभग 165 पृथ्वी-वर्षों के बराबर है। इसे 1846 में पहले गणित से खोजा गया: Urbain Le Verrier ने अरुण की अजीब चाल से निकाला कि यह कहाँ होना चाहिए, और Johann Galle ने इसे देखने की पहली ही रात में पा लिया।"
      },
      "source": "NASA Science, {page} (science.nasa.gov/{path}/), 15 नवंबर 2026 को पढ़ा गया"
    },
    "templates": {
      "world": {
        "what": {
          "earth": "सूर्य से तीसरा ग्रह, वह अकेली दुनिया जिस पर हम जानते हैं कि जीवन है",
          "mercury": "सबसे छोटा ग्रह, और सूर्य के सबसे पास",
          "venus": "सूर्य से दूसरा ग्रह, लगभग पृथ्वी के आकार का",
          "mars": "सूर्य से चौथा ग्रह, एक ठंडी रेगिस्तानी दुनिया",
          "jupiter": "सूर्य से पाँचवाँ ग्रह, और सबसे बड़ा",
          "saturn": "सूर्य से छठा ग्रह, अपने छल्लों के लिए मशहूर",
          "uranus": "सूर्य से सातवाँ ग्रह, जो अपनी बगल पर झुका हुआ है",
          "neptune": "सूर्य से आठवाँ ग्रह, और सबसे दूर"
        }
      }
    }
  });
}

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
  "lunar distance": "पृथ्वी से चंद्रमा की दूरी, लगभग 384 000 किमी। क्षुद्रग्रहों के गुज़रने को मापने की सुविधाजनक पटरी।",
  "astronomical unit": "पृथ्वी से सूर्य की दूरी, लगभग 15 करोड़ किमी।",
  "light-time": "रोशनी को किसी दूरी को पार करने में कितना समय लगता है। रेडियो संदेश को भी उतना ही लगता है।",
  "light-year": "रोशनी एक जूलियन साल में जितनी दूरी तय करती है, लगभग 9.46 ट्रिलियन किमी। तारों के बीच की खाई मापने की पटरी।",
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

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "किसी तारीख पर जाएँ (UTC)";
Object.assign(COPY, {
  "findEntry": {
    "title": "खोजें",
    "property": "गुणों से खोजें",
    "countries": "देश के हिसाब से उपग्रह",
    "operators": "संचालक के हिसाब से",
    "clouds": "मलबे के बादल",
    "chartOurs": "हमारे ग्रह अगल-बगल"
  },
  "find": {
    "title": "खोजें",
    "label": "गुणों, देश और मलबे के बादल से खोजें",
    "tabs": {
      "property": "गुणों से",
      "country": "देश से",
      "clouds": "मलबा और समूह"
    },
    "kindsLabel": "क्या खोजना है",
    "kinds": {
      "stars": "तारे",
      "exoplanets": "ग्रह",
      "satellites": "उपग्रह",
      "comets": "धूमकेतु"
    },
    "presetsLabel": "सवाल",
    "refine": "और बारीकी से",
    "presets": {
      "rockyHz50": "50 प्रकाश-वर्ष के भीतर रहने योग्य क्षेत्र में चट्टानी ग्रह",
      "nearStars": "20 प्रकाश-वर्ष के भीतर के तारे",
      "temperate": "लगभग पृथ्वी जितने गर्म ग्रह",
      "hotJupiters": "गर्म विशाल ग्रह",
      "cometsSoon": "2030 तक सूर्य के सबसे पास आने वाले धूमकेतु",
      "geo": "भूस्थिर कक्षा में काम कर रहे उपग्रह",
      "low": "400 किमी से नीचे काम कर रहे उपग्रह"
    },
    "fields": {
      "within": "दूरी के भीतर (प्रकाश-वर्ष)",
      "fromHere": "सूर्य से नहीं, कैमरे से मापें",
      "radius": "त्रिज्या (पृथ्वी = 1)",
      "mass": "द्रव्यमान (पृथ्वी = 1)",
      "teq": "तापमान (K)",
      "insol": "तारे का प्रकाश (पृथ्वी = 1)",
      "height": "ऊँचाई (किमी)",
      "year": "प्रक्षेपण (वर्ष)",
      "perihelion": "सूर्य के सबसे पास (वर्ष)",
      "from": "से",
      "to": "तक",
      "zone": "रहने योग्य क्षेत्र में",
      "zoneWide": "उसके भीतर या किनारे पर",
      "rocky": "चट्टानी",
      "working": "सिर्फ़ काम कर रहे",
      "owner": "मालिक",
      "operator": "संचालक",
      "any": "कोई भी",
      "range": "{label}: {word}"
    },
    "columns": {
      "name": "नाम",
      "dist": "दूरी (प्र.व.)",
      "radius": "त्रिज्या (पृथ्वी)",
      "teq": "ताप. (K)",
      "insol": "प्रकाश",
      "zone": "क्षेत्र",
      "spect": "प्रकार",
      "mag": "कांतिमान",
      "owner": "मालिक",
      "height": "ऊँचाई (किमी)",
      "year": "प्रक्षेपण",
      "perihelion": "उपसौर",
      "qAu": "निकटतम (खगोलीय इकाई)"
    },
    "zones": {
      "inside": "भीतर",
      "edge": "किनारे पर",
      "hotter": "बहुत गर्म",
      "colder": "बहुत ठंडा"
    },
    "sortTitle": "{col} के हिसाब से क्रम",
    "tableLabel": "जो मेल खाते हैं, हर एक की एक पंक्ति: वहाँ जाने के लिए पंक्ति दबाएँ",
    "status": "{n} मिले",
    "statusSome": "{n} मिले; पहले {shown} दिखाए गए हैं",
    "none": "कुछ मेल नहीं खाता। कोई सीमा बढ़ाएँ या कोई टिक हटाएँ।",
    "looking": "खोज रहे हैं…",
    "loading": "खोजने का डेटा लोड हो रहा है…",
    "failed": "खोज नहीं चली। थोड़ी देर में फिर कोशिश करें।",
    "rowTitle": "{name} पर जाएँ",
    "noRecord": "नक्शे पर नहीं बना",
    "modelled": "अनुमानित तारा-द्रव्यमान से निकाला गया: मॉडल",
    "copyLink": "इस सवाल का लिंक कॉपी करें",
    "copied": "लिंक कॉपी हो गया",
    "honesty": {
      "stars": "HYG v4.4 के नाम वाले 3 390 तारे, उनकी मापी गई दूरियों पर। मापा गया।",
      "exoplanets": "त्रिज्या, द्रव्यमान, परिक्रमा-काल और तारा: मापे गए, NASA Exoplanet Archive। कक्षा का आकार, तारे का प्रकाश, तापमान और क्षेत्र: गणना से; जहाँ तारे का द्रव्यमान उसके प्रकाश से आँका गया है वहाँ * लगा है, मॉडल। चट्टानी: 1.6 पृथ्वी-त्रिज्या या कम, या त्रिज्या न हो तो 3 पृथ्वी-द्रव्यमान या कम (Rogers 2015)।",
      "satellites": "CelesTrak की सूची, {date} को पढ़ी गई। ऊँचाई कक्षा के सबसे ऊँचे और सबसे नीचे बिंदु का औसत है। मापा गया।",
      "comets": "उपसौर की तारीखें JPL के Small-Body Database से, मापी गई कक्षाओं से निकाली गईं।"
    },
    "chart": {
      "open": "अगल-बगल",
      "openTitle": "{host} के ग्रह अगल-बगल, सही पैमाने पर",
      "title": "{host}, सही पैमाने पर",
      "ours": "सौरमंडल",
      "label": "{host} के ग्रह अपने असली आकार में अगल-बगल, तारे से क्रम में",
      "note": "सभी ग्रहों के लिए एक ही पैमाना; बीच की जगह दूरी नहीं है। जिस ग्रह की त्रिज्या मापी नहीं गई वह बीच के आकार में, टूटी रेखा से बना है।",
      "close": "चार्ट बंद करें"
    },
    "pill": "{name}: {n} रोशन",
    "pillClear": "रोशनी हटाएँ"
  },
  "owners": {
    "modesLabel": "समूह बनाएँ",
    "modes": {
      "countries": "देश",
      "operators": "संचालक",
      "points": "लाग्रांज बिंदु",
      "nopath": "कोई सार्वजनिक पथ नहीं"
    },
    "reading": "CelesTrak की सूची पढ़ रहे हैं (7 MB)…",
    "failed": "सूची लोड नहीं हुई।",
    "retry": "फिर कोशिश करें",
    "lead": "{n} मालिकों के पास कक्षा में कुछ है: कुल {total} ट्रैक किए गए पिंड।",
    "row": "कक्षा में {n}",
    "rowSub": "{working} काम कर रहे · {debris} मलबा",
    "rowTitle": "{name} के कक्षा में मौजूद पिंड रोशन करें",
    "joint": "{a} और {b}",
    "ussr": "सूची सोवियत संघ और रूस को एक ही मालिक गिनती है।",
    "unknown": "अभी पता नहीं",
    "byName": "नाम से",
    "byNameTitle": "सूची में इसके उपग्रहों के नामों से गिना गया",
    "kinds": "{working} काम कर रहे, {dead} अब काम नहीं करते, {rocket} रॉकेट के हिस्से, {debris} मलबे के टुकड़े।",
    "lit": "इनमें से {n} नक्शे पर बने और रोशन हैं।",
    "litNone": "इनमें से कोई भी नक्शे पर नहीं बना है।",
    "show": "इन्हें रोशन करें",
    "clear": "हटाएँ",
    "page": "{name} का पेज",
    "noPathTitle": "कोई सार्वजनिक पथ नहीं: {n}",
    "noPathNone": "कक्षा में इसके हर यान का सार्वजनिक पथ है।",
    "why": {
      "no-elements": "कोई सार्वजनिक कक्षा नहीं: सूची में यह है, पर इसके कक्षीय तत्व प्रकाशित नहीं होते",
      "deep-space": "पृथ्वी की कक्षा से परे, और यहाँ इसका कोई पथ नहीं",
      "deep-drawn": "पृथ्वी की कक्षा से परे: JPL के पथ से बना"
    },
    "points": {
      "sel1": "सूर्य–पृथ्वी L1",
      "sel2": "सूर्य–पृथ्वी L2",
      "eml2": "पृथ्वी–चंद्रमा L2",
      "sel1Why": "सूर्य की ओर 15 लाख किमी: यहाँ से सूर्य कभी नहीं डूबता।",
      "sel2Why": "सूर्य से उलटी ओर 15 लाख किमी: ठंडा और अँधेरा, टेलीस्कोप के लिए।",
      "eml2Why": "चंद्रमा के दूर वाले हिस्से के पार: एक रिले जो दूर वाला हिस्सा और पृथ्वी दोनों देखता है।",
      "empty": "अभी यहाँ कुछ दर्ज नहीं है।"
    },
    "nopathLead": "कक्षा में {n} यानों का कोई सार्वजनिक पथ नहीं है। सबसे नए पहले:",
    "source": "CelesTrak की उपग्रह सूची, {date} को पढ़ी गई: मापा गया। झंडे: Wikimedia Commons, सार्वजनिक डोमेन।"
  },
  "breakups": {
    "cloudsTitle": "मलबे के बादल",
    "fleetsTitle": "उपग्रह समूह",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "एक चीनी मौसम उपग्रह, जिसे 11 जनवरी 2007 को 865 किमी ऊँचाई पर चीनी उपग्रह-रोधी मिसाइल ने नष्ट किया: अब तक का सबसे बड़ा मलबे का बादल।",
      "cosmos1408": "एक बंद पड़ा सोवियत उपग्रह, जिसे 15 नवंबर 2021 को लगभग 480 किमी ऊँचाई पर रूसी उपग्रह-रोधी मिसाइल ने नष्ट किया।",
      "iridium33": "एक काम कर रहा फ़ोन उपग्रह, जिसे 10 फ़रवरी 2009 को साइबेरिया के ऊपर 789 किमी पर बंद पड़े कॉसमॉस 2251 ने टक्कर मारी: दो पूरे उपग्रहों की पहली टक्कर।",
      "cosmos2251": "एक बंद पड़ा रूसी उपग्रह, जो 10 फ़रवरी 2009 को 789 किमी पर इरिडियम 33 से टकराया।"
    },
    "counts": "सूची में दर्ज {catalogued} टुकड़ों में से {up} अब भी कक्षा में हैं।",
    "lit": "नक्शे पर {n} रोशन।",
    "spreadTitle": "इसे फैलते देखें",
    "steps": {
      "event": "घटना के समय",
      "week": "एक हफ़्ते बाद",
      "year": "एक साल बाद",
      "today": "आज"
    },
    "play": "घटना से चलाएँ",
    "stop": "रोकें",
    "places": "आज की जगहों पर लौटें",
    "spreadNote": "मॉडल: हर टुकड़ा एक ही बिंदु से, अपनी आज की कक्षा पर शुरू होता है, और पृथ्वी के उभार से उसकी कक्षा का तल घूमने पर खिसकता है। जो टुकड़े गिर चुके हैं वे नहीं बने।",
    "source": "स्रोत:",
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
    "fleetLit": "नक्शे पर {n} रोशन।",
    "fleetNote": "सूची में संचालकों के दिए नामों से पहचाने गए।",
    "loadingActive": "पहले सभी काम कर रहे उपग्रह लोड हो रहे हैं (7 MB)…",
    "loadingDebris": "पहले मलबे के सभी ट्रैक किए गए टुकड़े लोड हो रहे हैं (7 MB)…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "उस मिनट पर जाएँ जब Fengyun-1C नष्ट हुआ, और उसका बादल रोशन करें"
  },
  "dateJump": {
    "title": "किसी तारीख पर जाएँ",
    "field": "तारीख और समय (UTC)",
    "text": "या लिखें",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "जाएँ",
    "hint": "1700 से 2200 तक का कोई भी क्षण, UTC में।",
    "errors": {
      "unknown": "यह तारीख समझ नहीं आई। आज़माएँ 1969-07-20 20:17, 20 July 1969 या next total eclipse।",
      "range": "1700 से 2200 के बाहर।",
      "empty": "पहले तारीख लिखें।",
      "eclipse": "1700 और 2200 के बीच ऐसा कोई ग्रहण नहीं।"
    },
    "searching": "खोज रहे हैं…",
    "gone": "अब {when}।",
    "eclipse": "{what}, {when}।",
    "eclipses": {
      "sunTotal": "पूर्ण सूर्य ग्रहण",
      "sunAnnular": "वलयाकार सूर्य ग्रहण",
      "sunPartial": "आंशिक सूर्य ग्रहण",
      "moonTotal": "पूर्ण चंद्र ग्रहण",
      "moonPartial": "आंशिक चंद्र ग्रहण",
      "moonPenumbral": "उपच्छाया चंद्र ग्रहण"
    },
    "rangesTitle": "कितना सटीक, और कब",
    "ranges": {
      "worlds": "सूर्य, चंद्रमा और ग्रह: 1700 से 2200, गणना से (astronomy-engine)।",
      "satellites": "उपग्रह: आज से एक हफ़्ते के भीतर सटीक; एक महीने के बाद धुंधले।",
      "craft": "अंतरिक्ष यान: सिर्फ़ अपने JPL पथ के भीतर।",
      "stars": "तारे: आकाश दृश्य में, तारीख़ आज से 50 वर्ष से अधिक दूर होने पर अपनी मापी गई गतियों से खिसकाए जाते हैं।"
    },
    "quick": {
      "total": "अगला पूर्ण सूर्य ग्रहण",
      "lunar": "अगला चंद्र ग्रहण"
    },
    "missionsTitle": "हमारे मिशनों से",
    "momentsTitle": "पल",
    "presetsLabel": "जाने लायक तारीखें",
    "faded": "उपग्रह धुंधले किए गए: उनकी कक्षाएँ आज के लिए मापी गई हैं, {year} के लिए नहीं।",
    "close": "बंद करें"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "विकिपीडिया से",
    "quotedLive": "विकिपीडिया से उद्धृत, जैसा आज लिखा है; हमने इसकी जाँच नहीं की।",
    "quotedBaked": "विकिपीडिया से उद्धृत, जैसा {date} को लिखा था; हमने इसकी जाँच नहीं की।",
    "textCredit": "पाठ: विकिपीडिया योगदानकर्ता, CC BY-SA 4.0।",
    "readArticle": "पूरा लेख पढ़ें",
    "inEnglish": "इस भाषा में अभी कोई लेख नहीं है, इसलिए यह अंग्रेज़ी वाला है।",
    "family": "पूरे {fleet} के बारे में: इस एक उपग्रह पर कोई अलग लेख नहीं है।",
    "photo": "फ़ोटो: {artist}, {licence}, Wikimedia Commons के ज़रिए।",
    "photoNoArtist": "फ़ोटो: {licence}, Wikimedia Commons के ज़रिए।",
    "photoAlt": "विकिपीडिया लेख {title} के ऊपर की तस्वीर",
    "loading": "विकिपीडिया से पूछ रहे हैं…",
    "read": "ज़ोर से पढ़ें",
    "readTitle": "इस कार्ड को अपने डिवाइस की आवाज़ में ज़ोर से पढ़ें",
    "stop": "पढ़ना रोकें",
    "reading": "ज़ोर से पढ़ रहे हैं"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "rotators": {
    "widthEq": "भूमध्य रेखा पर चौड़ाई",
    "widthPole": "ध्रुव से ध्रुव तक चौड़ाई",
    "spin": "घूर्णन",
    "spinShape": "तेज़ घूर्णन से चपटा: ध्रुव लगभग {pole} K, भूमध्य रेखा लगभग {eq} K (दूरबीन की छवियों से मिलाया गया एक मॉडल)",
  },
  "deepTime": {
    "title": "गहरा समय",
    "back": "−{n} वर्ष",
    "on": "+{n} वर्ष",
    "backTitle": "{n} वर्ष पीछे, वही तारीख़ और वही घंटा",
    "onTitle": "{n} वर्ष आगे, वही तारीख़ और वही घंटा",
    "presetsLabel": "दूसरे ध्रुव तारे",
    "presets": {
      "thuban": "थुबान, 2800 ई.पू.",
      "vega": "अभिजित, 13 700 ई.",
      "far": "50 000 ई."
    },
    "presetTitles": {
      "thuban": "जब पिरामिड बने, तब ड्रैको का थुबान ध्रुव तारा था",
      "vega": "लगभग 13 700 ई. में ध्रुव अभिजित से 6.5° तक पास आता है",
      "far": "पचास हज़ार वर्ष बाद का आकाश"
    },
    "yearAd": "{n} ई.",
    "yearBc": "{n} ई.पू.",
    "moved": "{year} का आकाश: हर तारा अपनी मापी गई गति से खिसकाया गया।",
    "far": "आज से इतनी दूर चंद्रमा और ग्रह नहीं दिखाए जाते, और सूर्य वहाँ है जहाँ पंचांग उसे रखता है।",
    "pole": "ध्रुव तारा: {name}, ध्रुव से {deg}°।",
    "noPole": "कोई चमकीला तारा ध्रुव पर नहीं: सबसे पास वाला, {name}, {deg}° दूर है।",
    "unnamed": "{mag} कांतिमान का एक तारा",
    "honest": "गतियाँ मापी गई हैं (हिप्पार्कोस और गाया, HYG के ज़रिए); उन्हें हज़ारों वर्षों तक सीधी रेखा में ले जाना मॉडल है। पृथ्वी की धुरी का घूमना: वोंद्राक, कैपिटेन और वॉलेस 2011।"
  },
  "variables": {
    "label": "इसकी रोशनी कैसे बदलती है",
    "types": {
      "eclipse": "ग्रहणकारी जोड़ा: दो तारे जो एक-दूसरे के आगे से गुज़रते हैं।",
      "binary": "एक नज़दीकी जोड़ा, गोल आकार से खिंचा हुआ, इसलिए इसकी रोशनी कभी स्थिर नहीं रहती।",
      "pulse": "स्पंदित तारा: यह फूलता और सिकुड़ता है।",
      "sine": "एक छोटा, तेज़ी से स्पंदित तारा।",
      "sr": "अर्ध-नियमित दानव: इसका आवर्तकाल और परास मापे गए हैं, पर यह नहीं कि यह चक्र में कहाँ है, इसलिए वक्र एक रेखाचित्र है।",
      "irregular": "अनियमित चर तारा: कोई घड़ी नहीं बता सकती कि यह कितना चमकीला है, इसलिए आकाश सूची की चमक रखता है।"
    },
    "periodDays": "आवर्तकाल {n} दिन।",
    "periodYears": "आवर्तकाल {n} वर्ष।",
    "aria": "{name} का प्रकाश वक्र, कांतिमान {bright} से {faint} तक; अभी {now}।",
    "now": "अभी",
    "nowLine": "अभी कांतिमान {mag} ({band}); परास {bright} से {faint}।",
    "range": "परास कांतिमान {bright} से {faint} ({band})।",
    "far": "इसका वक्र आज से {years} वर्ष से आगे नहीं ले जाया जाता; परास कांतिमान {bright} से {faint} ({band})।",
    "nextMin": "अगला न्यूनतम: {when}",
    "measured": "मापा गया: महान मंदन के दिनांकित कांतिमान। तत्व: {cite}।",
    "modelled": "मॉडल: आकार सूची के आवर्तकाल, युग और परास से बनाया गया है ({cite})।",
    "notes": {
      "alf-ori": "2019 और 2020 में यह परिमाण 1.6 तक फीका पड़ गया, जिसे महान धुंधलापन (Great Dimming) कहते हैं: इसकी फेंकी हुई धूल के एक बादल ने इसका कुछ हिस्सा ढक लिया था। ऊपर के 6.4 साल इसका लंबा, धीमा चक्र हैं; ज़्यादातर पर्यवेक्षक जिस स्पंदन को जानते हैं, वह लगभग 400 दिन का है।",
      "omi-cet": "मीरा के अधिकतम एक चक्र से दूसरे में हफ़्तों पहले या बाद आते हैं, इसलिए ये तारीख़ें इतनी ही ग़लत हो सकती हैं।",
      "bet-lyr": "इसका आवर्तकाल हर वर्ष 19 सेकंड बढ़ता है; वक्र हार्मानेत्स और शोल्ट्स (1993) के द्विघात पंचांग पर चलता है।",
      "bet-per": "अल्गोल के ग्रहण मिनट तक सटीक हैं: हर 2.87 दिन में यह लगभग दस घंटे मंद होता है।",
      "eps-aur": "हर 27 वर्ष में लगभग दो वर्ष तक अपने साथी के चारों ओर की अंधेरी तश्तरी से ढका रहता है; पिछला ग्रहण 2009 से 2011 तक चला।",
      "eta-car": "1840 के दशक के महान विस्फोट में यह आकाश का दूसरा सबसे चमकीला तारा बन गया।",
      "t-crb": "पुनरावर्ती नोवा: 1866 और 1946 में यह कांतिमान 2 तक भड़का।"
    }
  },
  "blackHoleSpin": {
    "spin": "घूमता हुआ दिखाया गया, स्पिन a = {a} के साथ: छाया का आकार वैसा है जैसा घूमता ब्लैक होल डालता है (बार्डीन 1973), हमारी ओर आते हिस्से से दूर धकेला हुआ। {why} इसके आसपास की रोशनी अब भी बिना स्पिन के खोजी जाती है, इसलिए आकार मॉडल है।",
    "spinWhy": {
      "m87-star": "स्पिन चुना गया है: EHT 2019 के पेपर V के सबसे उपयुक्त मॉडल 0.94 पर घूमते हैं।",
      "sgr-a-star": "स्पिन चुना गया है: EHT 2022 का पेपर V 0.5 से 0.94 को पसंद करता है।"
    }
  }
});
// b200-f3-stars: end
// b200-c1-culture: begin -- a sky figure's story and the other cultures' pictures (copy/en.later.js skyLore, forge #143), machine-drafted
Object.assign(COPY, {
  "skyLore": {
    "figure": "{culture} आकाश की एक आकृति",
    "figureLabel": "{name}, {culture} आकाश की एक आकृति। इसकी कहानी के लिए दबाएँ।",
    "openTitle": "इसकी कहानी के लिए दबाएँ",
    "sub": "{culture} आकाश",
    "close": "कहानी बंद करें",
    "loading": "कहानी लाई जा रही है…",
    "failed": "कहानी लोड नहीं हुई। थोड़ी देर में फिर कोशिश करें।",
    "fromStellarium": "Stellarium में इस आकाश-संस्कृति के विवरण से। {credit}।",
    "ours": "हमारे अपने शब्दों में, इस आधार पर: {cite}।",
    "honesty": "सांकेतिक: एक कथन, जैसा उसका स्रोत दर्ज करता है। नाम और कहानियाँ लोगों और कहने वालों के बीच बदलती हैं।",
    "none": "जिन स्रोतों को हम साझा कर सकते हैं, उनमें इस आकृति की कोई कहानी दर्ज नहीं है। ये जीवित परंपराएँ हैं, इसलिए हम अनुमान लगाने के बजाय यही कहते हैं।",
    "inEnglish": "कहानी अंग्रेज़ी में है, जो इसके स्रोत की भाषा है: कोई लाइसेंस-प्राप्त अनुवाद नहीं है।",
    "artTitles": {
      "maori": "माओरी आकृतियाँ चित्रों के रूप में, Stellarium की माओरी आकाश-संस्कृति से, CC BY-SA 4.0",
      "hawaiian": "हवाई तारा-रेखाएँ, Kealoha Kaneakua के चित्र, Stellarium के लिए, CC BY-SA 4.0",
      "boorong": "बूरोंग आकृतियाँ चित्रों के रूप में, Stellarium की बूरोंग आकाश-संस्कृति से, CC BY-SA 4.0"
    },
    "artNone": "इस आकाश के ऐसे कोई चित्र नहीं हैं जिनका लाइसेंस हमें साझा करने दे: इसकी आकृतियाँ रेखाएँ ही रहती हैं।"
  }
});
// b200-c1-culture: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "plugins": {
    "close": "यह पैनल बंद करें",
    "sheet": "{title}: आकार बदलने के लिए खींचें"
  },
  "make": {
    "flight": "उड़ान पथ",
    "flightTitle": "दृश्यों के बीच कैमरे का रास्ता बनाएँ, पहले देखें और लिंक से साझा करें",
    "record": "रिकॉर्ड",
    "recordTitle": "यह दृश्य, उड़ान पथ या सफ़र वीडियो के रूप में रिकॉर्ड करें",
    "dome": "गुंबद और 360",
    "domeTitle": "आकाश को तारामंडल के गुंबद या 360 डिग्री चित्र की तरह दिखाएँ",
    "failed": "यह लोड नहीं हुआ। थोड़ी देर में फिर कोशिश करें।"
  },
  "flight": {
    "title": "उड़ान पथ",
    "sheet": "उड़ान पथ: आकार बदलने के लिए खींचें",
    "close": "उड़ान पथ बंद करें",
    "play": "चलाएँ",
    "playTitle": "स्लाइडर जहाँ है वहाँ से पथ पर उड़ें",
    "stop": "रोकें",
    "stopTitle": "उड़ान यहीं रोकें",
    "scrub": "पथ पर स्थान",
    "scrubAt": "{total} में से {at}",
    "hint": "नक्शा को अपनी पसंद के दृश्य पर ले जाएँ, फिर “यह दृश्य जोड़ें” दबाएँ। दो दृश्य मिलकर एक पथ बनाते हैं।",
    "hintOne": "एक दृश्य। कहीं और उड़ें और एक और जोड़ें।",
    "hintMany": "{n} दृश्य। चलाएँ दबाएँ, या पथ के साथ देखने के लिए स्लाइडर खींचें।",
    "add": "यह दृश्य जोड़ें",
    "addTitle": "कैमरा कहाँ है, किसे देख रहा है, और घड़ी, यह सहेजें",
    "keysLabel": "पथ के दृश्य, क्रम से",
    "keyName": "{n}. {name}",
    "goTitle": "इस दृश्य पर जाएँ",
    "keyLive": "घड़ी जैसी चल रही है",
    "point": "अंतरिक्ष में एक बिंदु",
    "duration": "उड़ान",
    "seconds": "{n} से.",
    "ease": "गति",
    "eases": {
      "smooth": "धीरे शुरू और धीरे रुकना",
      "cruise": "क्रूज़",
      "constant": "स्थिर गति"
    },
    "rate": "घड़ी",
    "rateLive": "वास्तविक समय",
    "up": "↑",
    "upLabel": "दृश्य {n} को पहले ले जाएँ",
    "down": "↓",
    "downLabel": "दृश्य {n} को बाद में ले जाएँ",
    "replace": "यह दृश्य लें",
    "replaceLabel": "दृश्य {n} को अभी के दृश्य से बदलें",
    "remove": "हटाएँ",
    "removeLabel": "दृश्य {n} हटाएँ",
    "copyLink": "लिंक कॉपी करें",
    "copyLinkTitle": "पूरा पथ एक लिंक में: कहीं कुछ भी सहेजा नहीं जाता",
    "linkCopied": "लिंक कॉपी हुआ ({n} अक्षर)। जो इसे खोलेगा वह यह उड़ान देखेगा।",
    "linkInBar": "लिंक पता बार में है: वहाँ से कॉपी करें।",
    "draft": "सफ़र का मसौदा सहेजें",
    "draftTitle": "नक्शा की सफ़रों के लिए एक सफ़र फ़ाइल का मसौदा, जिसे कोई व्यक्ति पूरा करे",
    "draftSaved": "सफ़र का मसौदा सहेजा गया। कार्ड आप लिखें।",
    "record": "यह उड़ान रिकॉर्ड करें",
    "recordTitle": "उड़ान को वीडियो के रूप में रिकॉर्ड करें",
    "clear": "साफ़ करें",
    "clearTitle": "सभी दृश्य हटाएँ",
    "needTwo": "एक पथ के लिए कम से कम दो दृश्य चाहिए।",
    "full": "एक पथ में अधिकतम {n} दृश्य होते हैं।",
    "noView": "यह दृश्य सहेजा नहीं जा सकता: पहले किसी चीज़ को देखें।",
    "badLink": "यह उड़ान लिंक पढ़ा नहीं जा सका।",
    "honesty": "हर दृश्य चीज़ों को वहीं दिखाता है जहाँ वे उसकी घड़ी के समय पर हैं। दृश्यों के बीच की उड़ानें हमारे बनाए कैमरा मूवमेंट हैं, किसी अंतरिक्ष यान का रास्ता नहीं।"
  },
  "record": {
    "title": "रिकॉर्ड",
    "sheet": "रिकॉर्ड: आकार बदलने के लिए खींचें",
    "close": "रिकॉर्ड बंद करें",
    "whatLabel": "क्या रिकॉर्ड करें",
    "sourceView": "यह दृश्य",
    "sourcePath": "उड़ान पथ",
    "sourceTrip": "सफ़र, अंत तक",
    "length": "लंबाई",
    "seconds": "{n} सेकंड",
    "shapeLabel": "आकार",
    "crops": {
      "wide": "16:9 (YouTube)",
      "square": "वर्गाकार",
      "tall": "खड़ा 9:16 (Reels, TikTok, Shorts)"
    },
    "smooth": "फ़्रेम दर फ़्रेम (हर डिवाइस पर सहज)",
    "smoothNote": "पेज इस दृश्य को अपनी घड़ी पर फिर से लोड करता है और हर फ़्रेम को लेने से पहले पूरा बनाता है: धीमा डिवाइस धीरे रिकॉर्ड करता है, पर कभी झटके से नहीं।",
    "silent": "फ़्रेम दर फ़्रेम में आवाज़ रिकॉर्ड नहीं होती।",
    "withSound": "जो आवाज़ आप सुन रहे हैं वह भी रिकॉर्ड होती है।",
    "noSound": "आवाज़ बंद है, इसलिए वीडियो मूक रहेगा। सफ़र की आवाज़ और संगीत रखने के लिए पहले आवाज़ चालू करें।",
    "start": "रिकॉर्डिंग शुरू करें",
    "stop": "रोकें",
    "save": "वीडियो सहेजें",
    "share": "वीडियो साझा करें",
    "saved": "वीडियो सहेजा गया।",
    "cannot": "यह ब्राउज़र वीडियो रिकॉर्ड नहीं कर सकता। नए Chrome, Edge, Safari और Firefox कर सकते हैं।",
    "rolling": "रिकॉर्डिंग: {at} से.",
    "made": "हो गया: {mb} MB। सहेजें या साझा करें।",
    "empty": "ब्राउज़र ने कुछ रिकॉर्ड नहीं किया। फिर कोशिश करें, या फ़्रेम दर फ़्रेम चुनें।",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · नक्शा और डेटा: NASA, ESA, Solar System Scope और अन्य",
    "endTitle": "ख़ुद देखें",
    "endLine": "Space Radar: मुफ़्त, आपके ब्राउज़र में।",
    "endCredit": "नक्शा और डेटा: NASA, ESA, USGS, Solar System Scope, HYG और अन्य, उनके अपने लाइसेंस के तहत (CC BY, CC BY-SA)। श्रेय spaceradar.ai पर।",
    "filmTitle": "फ़्रेम दर फ़्रेम रिकॉर्डिंग",
    "filmWarming": "दृश्य तैयार हो रहा है…",
    "filmFrame": "{total} में से फ़्रेम {n}",
    "filmDone": "हो गया: {mb} MB, {s} सेकंड। फ़ाइल सहेजी गई।",
    "filmFailed": "रिकॉर्डिंग रुक गई: {why}",
    "back": "नक्शा पर लौटें"
  },
  "dome": {
    "title": "गुंबद और 360",
    "sheet": "गुंबद और 360: आकार बदलने के लिए खींचें",
    "close": "गुंबद और 360 बंद करें",
    "kindLabel": "आकाश कैसे बनाया गया है",
    "normal": "सामान्य",
    "dome": "गुंबद, 180 डिग्री (तारामंडल)",
    "wide": "360 डिग्री (YouTube 360)",
    "tilt": "गुंबद का झुकाव",
    "tiltDeg": "{n}°",
    "size": "आकार",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "यह फ़्रेम सहेजें",
    "skySize": "स्काईबॉक्स का फलक",
    "saveSky": "एक स्काईबॉक्स सहेजें",
    "saved": "सहेजा गया: {w} × {h} px।",
    "saveFailed": "चित्र बनाया नहीं जा सका।",
    "intro": "कैमरा जो देखता है उसका गुंबद चित्र या 360 डिग्री चित्र, लाइव। चालू रहने पर नाम छिपे रहते हैं।",
    "live": "लाइव, हर फलक {n} px।",
    "livePhone": "लाइव, हर फलक {n} px: फ़ोन पर यह एक पूर्वावलोकन है। साफ़ चित्र के लिए एक फ़्रेम सहेजें।",
    "noGpu": "इस डिवाइस का ग्राफ़िक्स इसे नहीं बना सकता।",
    "busy": "पहले कल्पित दुनिया या पल बंद करें: वह अपना चित्र ख़ुद बनाता है।",
    "off": "सामान्य चित्र पर वापस।",
    "credit": "इस श्रेय के साथ मुफ़्त उपयोग करें: Space Radar, spaceradar.ai। नक्शा और डेटा: NASA, ESA, USGS, Solar System Scope, HYG और अन्य; स्रोत पैनल हर एक का लाइसेंस बताता है।",
    "how": "गुंबद के लिए किसी सफ़र के लिंक के बाद #proj=dome,30 लगाएँ और पूरी स्क्रीन पर खोलें। चरण docs/PLANETARIUMS.md में हैं।"
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "आज की चुनौती",
    "close": "बंद करें",
    "day": "{day} (UTC) की पहेली, आज सबके लिए एक जैसी।",
    "games": {
      "find-earth": {
        "title": "पृथ्वी खोजें",
        "blurb": "आकाशगंगाओं से हमारे ग्रह तक, जितने कम चुनावों में हो सके।"
      },
      "which-world": {
        "title": "यह कौन-सा संसार है?",
        "blurb": "एक असली नक्शे का क्लोज़-अप: चार में से संसार चुनें।"
      },
      "guess-distance": {
        "title": "दूरी का अनुमान लगाएँ",
        "blurb": "स्लाइडर को उतने प्रकाश-वर्ष पर ले जाएँ जितनी दूर यह है।"
      }
    },
    "other": "दूसरी चुनौतियाँ",
    "loading": "नक्शा अभी लोड हो रहा है; तैयार होते ही चुनौती शुरू होगी।",
    "failed": "चुनौती अपनी दूरियाँ लोड नहीं कर पाई।",
    "retry": "फिर कोशिश करें",
    "rung": "चरण {n} / {of}: {where}",
    "rungs": {
      "local-group": "स्थानीय समूह",
      "galaxy": "आकाशगंगा (मिल्की वे)",
      "stellar": "सूर्य का पड़ोस",
      "sun": "सौरमंडल"
    },
    "ask": {
      "local-group": "कौन-सा निशान हमारी आकाशगंगा, मिल्की वे, है?",
      "galaxy": "कौन-सा निशान सूर्य है?",
      "stellar": "कौन-सा निशान सूर्य है?",
      "sun": "कौन-सा निशान पृथ्वी है?"
    },
    "hints": {
      "local-group": "हमारी आकाशगंगा के ठीक पास दो छोटे साथी हैं, मैगेलैनिक बादल।",
      "galaxy": "सूर्य केंद्र के ब्लैक होल से लगभग 27,000 प्रकाश-वर्ष दूर, एक शांत भुजा में है।",
      "stellar": "सूर्य के सबसे पास के तारे धुँधले लाल बौने हैं और 4.4 प्रकाश-वर्ष दूर अल्फ़ा सेंटॉरी।",
      "sun": "पृथ्वी सूर्य से तीसरा संसार है।"
    },
    "hint": "संकेत (एक मौका लगेगा)",
    "mark": "निशान {letter}, {where}",
    "places": {
      "tl": "ऊपर बाएँ",
      "tc": "ऊपर",
      "tr": "ऊपर दाएँ",
      "ml": "बाएँ",
      "mc": "बीच में",
      "mr": "दाएँ",
      "bl": "नीचे बाएँ",
      "bc": "नीचे",
      "br": "नीचे दाएँ"
    },
    "milkyWay": "मिल्की वे",
    "sunName": "सूर्य",
    "tries": "चुनाव {n} / {max}",
    "wrong": "यह नहीं: {letter} {name} है।",
    "right": "हाँ: {name}। पास जा रहे हैं।",
    "found": "आपने {n} चुनावों में पृथ्वी खोज ली।",
    "lost": "मौके खत्म। पृथ्वी सूर्य से तीसरा संसार थी।",
    "honest": "निशान वहीं हैं जहाँ नक्शा हर वस्तु बनाता है। सौरमंडल वाले चरण में संसार असल से पास बनाए गए हैं, जैसे उस पूरे दृश्य में।",
    "round": "दौर {n} / {of}",
    "worldAsk": "यह किस संसार का क्लोज़-अप है?",
    "more": "नक्शे का और हिस्सा दिखाएँ",
    "worldRight": "हाँ: {name}।",
    "worldWrong": "नहीं: यह {name} था।",
    "credit": "नक्शा: {credit}",
    "worldPicture": "सौरमंडल के एक संसार के असली नक्शे का क्लोज़-अप",
    "distAsk": "{name} कितनी दूर है?",
    "slider": "दूरी प्रकाश-वर्ष में",
    "guess": "अनुमान",
    "reveal": "{name} {value} दूर है: आपका अनुमान {off} था।",
    "offs": {
      "hit": "एक चौथाई के भीतर",
      "near": "दोगुने के भीतर",
      "far": "पाँच गुना के भीतर",
      "miss": "पाँच गुना से ज़्यादा गलत"
    },
    "source": "दूरी: {source}",
    "units": {
      "ly": "{n} प्रकाश-वर्ष",
      "kly": "{n} हज़ार प्रकाश-वर्ष",
      "mly": "{n} मिलियन प्रकाश-वर्ष",
      "bly": "{n} अरब प्रकाश-वर्ष"
    },
    "next": "आगे",
    "scores": {
      "find-earth": "10 में से {n} चुनाव",
      "which-world": "3 में से {n} संसार",
      "guess-distance": "3 में से {n} दोगुने के भीतर"
    },
    "shareTitle": "Space Radar: {game}",
    "share": "नतीजा साझा करें",
    "copied": "कॉपी हो गया। कहीं भी चिपकाएँ।",
    "copyFailed": "कॉपी नहीं हो सका: ऊपर का पाठ चुनें।",
    "played": "आज के लिए बस। नई चुनौती UTC आधी रात को आएगी।",
    "streak": "लगातार {n} दिन"
  }
});
// b200-f6-learn: end
// b200-f8-xr: begin -- the gamepad and the headset (copy/en.xr.js, forge #164, #158), machine-drafted
Object.assign(COPY, {
  "pad": {
    "title": "गेमपैड",
    "label": "गेमपैड नियंत्रण",
    "close": "गेमपैड नियंत्रण बंद करें",
    "capStickL": "बायाँ स्टिक",
    "capStickR": "दायाँ स्टिक",
    "capTriggers": "RT · LT",
    "capA": "A · क्रॉस",
    "capX": "X · स्क्वेयर",
    "capB": "B · सर्कल",
    "capY": "Y · ट्रायंगल",
    "capDpad": "डी-पैड ↑ ↓",
    "capView": "व्यू · Share",
    "turn": "चारों ओर घूमें",
    "fly": "पास और दूर जाएँ, बगल में खिसकें",
    "speed": "तेज़, धीमा",
    "choose": "रिंग में जो है उसे चुनें",
    "go": "वहाँ जाएँ",
    "back": "वापस",
    "ship": "यान भौतिकी चालू या बंद",
    "ladder": "दूरी की सीढ़ी पर बाहर और अंदर",
    "controls": "ये नियंत्रण (मेनू भी)",
    "shipToggle": "यान भौतिकी",
    "shipHow": "छोड़ने के बाद भी आप बहते रहते हैं। रुकने के लिए कोई स्टिक दबाएँ।",
    "notStandard": "यह गेमपैड नहीं बताता कि उसके बटन कहाँ हैं: इसका बायाँ स्टिक दृश्य घुमाता है, बटन इस्तेमाल नहीं होते।",
    "connected": "गेमपैड जुड़ गया। नियंत्रण देखने के लिए Y दबाएँ।",
    "disconnected": "गेमपैड हट गया।",
    "shipOn": "यान भौतिकी चालू: छोड़ने के बाद भी आप बहते रहते हैं।",
    "shipOff": "यान भौतिकी बंद।",
    "nothing": "रिंग में चुनने को कुछ नहीं है।",
    "chooseFirst": "पहले कुछ चुनें: A रिंग में जो है उसे लेता है।",
    "rung": "{label}, {distance}",
    "home": "पृथ्वी",
    "trip": "कैमरा एक सफ़र पर है। उसके अपने बटन स्क्रीन पर हैं।"
  },
  "headset": {
    "enter": "हेडसेट में जाएँ",
    "enterTitle": "VR हेडसेट में आकाश के नीचे खड़े हों या दूरी की सीढ़ी पर चलें",
    "noteTitle": "पहनने से पहले",
    "comfort": "हलचल छलाँग में होती है, फिसलकर नहीं, और मुड़ना 30 डिग्री के कदमों में होता है, इसलिए क्षितिज सीधा रहता है। बैठ जाएँ, या अपने आसपास की जगह खाली कर लें।",
    "seizure": "कुछ थोड़े लोगों को चमकती रोशनी या पैटर्न से दौरे पड़ते हैं। अगर चक्कर आए, जी मिचलाए या कुछ अजीब दिखे, तो रुकें और हेडसेट उतार दें।",
    "how": "किसी चीज़ को देखें और उसे चुनने के लिए A या दायाँ ट्रिगर दबाएँ। X वहाँ ले जाता है, B वापस, Y नियंत्रण दिखाता है, गेमपैड की तरह। पल के अंदर A चलाता और रोकता है, B नक्शे पर वापस ले जाता है। बाहर निकलने के लिए B एक सेकंड दबाए रखें।",
    "untried": "नया है, और अभी किसी असली हेडसेट पर आज़माया नहीं गया: हमें बताएँ कि आपको क्या दिखता है।",
    "go": "जाएँ",
    "cancel": "अभी नहीं",
    "busy": "पहले कल्पित दुनिया, गुंबद और 360 या रिकॉर्डिंग बंद करें: हर एक अपनी तस्वीर खुद बनाता है।",
    "failed": "हेडसेट शुरू नहीं हुआ।",
    "left": "स्क्रीन पर वापस।",
    "panelHelp": "A चुनें   X जाएँ   B वापस   Y नियंत्रण",
    "panelMove": "बायाँ स्टिक: चारों ओर, और सीढ़ी पर   दायाँ स्टिक: मुड़ें, पास और दूर",
    "panelLeave": "बाहर निकलने के लिए B दबाए रखें",
    "chosen": "चुना गया: {name}",
    "nothing": "ठीक सामने कुछ नहीं",
    "momentHelp": "A चलाएँ या रोकें   B नक्शे पर वापस   Y नियंत्रण",
    "frame": "फ़्रेम {ms} ms, {fps} प्रति सेकंड (लक्ष्य 72)",
    "lighter": "फ़्रेम बहुत लंबे चले: कम बनाया जा रहा है।"
  }
});
// b200-f8-xr: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "यहाँ की असली रिकॉर्डिंग",
    "play": "{name} सुनें",
    "stop": "रोकें",
    "hide": "यहाँ की रिकॉर्डिंग छिपाएँ",
    "sonified": "असली आँकड़े, ध्वनि में बदले गए",
    "microphone": "असली ध्वनि, एक माइक्रोफ़ोन से",
    "playing": "चल रहा है: {name}। {how}।",
    "failed": "वह रिकॉर्डिंग लोड नहीं हुई।",
    "names": {
      "real-voyager-plasma": "अंतरतारकीय अंतरिक्ष में Voyager 1",
      "real-juno-ganymede": "गैनिमीड के पास से गुज़रता Juno",
      "real-cassini-saturn": "शनि का रेडियो",
      "real-insight-impact": "मंगल से टकराता एक उल्कापिंड",
      "real-insight-wind": "मंगल पर हवा",
      "real-perseverance-dust-devil": "मंगल पर एक धूल का बवंडर"
    }
  }
});
// b200-f9-reach: end
// b200-f7-ground: begin -- standing on another world and its sky (copy/en.ground.js, forge #146, #147), machine-drafted
Object.assign(COPY, {
  "ground": {
    "stageLabel": "किसी दूसरी दुनिया पर खड़े होकर",
    "tagGround": "सतह पर · {world}",
    "tagSky": "{world} से आकाश",
    "kindMeasured": "मापी गई ज़मीन",
    "kindPlain": "ज़मीन मापी नहीं गई",
    "kindModelled": "मॉडल पर आधारित",
    "placeAt": "{world}, {lat}°, {lon}° पूर्व",
    "worlds": {
      "moon": "चंद्रमा",
      "mars": "मंगल",
      "titan": "टाइटन",
      "europa": "यूरोपा",
      "earth": "पृथ्वी",
      "proxima-b": "Proxima Centauri b",
      "trappist-1e": "TRAPPIST-1 e"
    },
    "measuredGround": "मापा गया: ऊँचाइयाँ वास्तविक पैमाने पर स्टीरियो भू-भाग मॉडल से हैं, ज़मीन ऑर्बिटर की अपनी तस्वीर है (उसकी छायाएँ उसी दिन की हैं जब तस्वीर ली गई थी)। कोई चट्टान या क्रेटर गढ़ा नहीं गया है।",
    "plainGround": "यहाँ की ज़मीन मापों से नहीं बनाई गई है: क्षितिज तक एक मैदान। आकाश गणना से है।",
    "modelLine": "लैंडिंग निर्देशांकों पर: {what}। यह किस दिशा में मुँह किए है, यह किसी तस्वीर से नहीं लिया गया।",
    "timeLine": "{local} स्थानीय सौर समय · {utc} · सूर्य {sun}° पर",
    "timeLineStar": "{utc} · {star} {sun}° ऊपर, हमेशा उसी जगह",
    "drive": "रोवर चलाएँ",
    "walk": "पैदल चलें",
    "driving": "रोवर चला रहे हैं, रोवर की असली गति से लगभग {x} गुना तेज़।",
    "walking": "पैदल चल रहे हैं।",
    "skyOpen": "आकाश",
    "skyClose": "आकाश छिपाएँ",
    "leave": "बाहर निकलें",
    "sources": "स्रोत और लाइसेंस",
    "padLabel": "चलना: अंगूठे को उस दिशा में धकेलें जिधर जाना है",
    "keys": "चलने के लिए W A S D या तीर कुंजियाँ, मुड़ने के लिए Q और E, ऊपर-नीचे देखने के लिए R और F, दौड़ने के लिए Shift, ज़ूम के लिए + और -, बाहर निकलने के लिए Esc।",
    "padDrive": "चलाना: आगे जाने के लिए गोला ऊपर, पीछे के लिए नीचे, मोड़ने के लिए बगल में खिसकाएँ",
    "keysDrive": "आगे के लिए W या ऊपर का तीर, पीछे के लिए S या नीचे का, मोड़ने के लिए A और D या बगल के तीर, ऊपर-नीचे देखने के लिए R और F, तेज़ी के लिए Shift, निकलने के लिए Esc।",
    "howtoKeys": "आप रोवर चला रहे हैं। आगे W या ↑, पीछे S या ↓, मोड़ने के लिए A और D या ← और →। चारों ओर देखने के लिए खींचें।",
    "howtoTouch": "आप रोवर चला रहे हैं। आगे जाने के लिए गोल पैड ऊपर, पीछे के लिए नीचे, मोड़ने के लिए बगल में खिसकाएँ। चारों ओर देखने के लिए आकाश को खींचें।",
    "driveHint": "यह रोवर चलाया जा सकता है: \"रोवर चलाएँ\" दबाएँ।",
    "tripDriveTitle": "सफ़र यहीं छोड़ें और यह रोवर चलाएँ",
    "skyTitle": "यह आकाश",
    "poleStar": "ध्रुव तारा: {name}, ध्रुव से {sep}° दूर (कांतिमान {mag})।",
    "noPoleStar": "इस दुनिया के ध्रुव से 10° के भीतर कांतिमान 4.5 से अधिक चमकीला कोई तारा नहीं है।",
    "unnamedStar": "बिना प्रचलित नाम का एक तारा",
    "poleLabel": "{name} (ध्रुव तारा)",
    "rises": "{name} का उदय: स्थानीय सौर समय {local} ({utc})।",
    "sets": "{name} का अस्त: स्थानीय सौर समय {local} ({utc})।",
    "neverSets": "यहाँ से {name} का न उदय होता है न अस्त: उसकी जगह आकाश के एक ही हिस्से में बनी रहती है।",
    "notToday": "खोजे गए समय में {name} का न उदय होता है न अस्त।",
    "transit": "{front} स्थानीय सौर समय {local} ({utc}) पर {s} सेकंड तक सूर्य के बिंब के आगे से गुज़रता है।",
    "noTransit": "अगले {days} सॉल में यहाँ से फ़ोबोस या डीमोस सूर्य के आगे से नहीं गुज़रते।",
    "working": "उदय और अस्त की गणना हो रही है…",
    "earthNow": "पृथ्वी: {alt}° ऊपर, दिशा {az}°, {lit} % प्रकाशित, कांतिमान {mag}।",
    "airNotes": {
      "mars": "मापे गए रंग: दिन का आकाश Spirit के वास्तविक-रंग पैनोरमा (PIA07882) से, नीला सूर्यास्त गेल में Curiosity की तस्वीर (PIA19400) से।",
      "moon": "हवा नहीं है, इसलिए दोपहर में भी आकाश काला है। धूप से चमकती ज़मीन से चौंधियाई असली आँख इनमें से कम ही तारे देख पाती।",
      "europa": "हवा नहीं है, इसलिए दोपहर में भी आकाश काला है। बृहस्पति की ओर वाले हिस्से के आकाश में बृहस्पति स्थिर टँगा रहता है।",
      "titan": "सांकेतिक रंग: नारंगी धुंध तारों और शनि को आँख से छिपा देती है; उन्हें उनकी जगह पर धुँधला दिखाया गया है।",
      "earth": "",
      "proxima-b": "मॉडल पर आधारित: माना गया है कि Proxima b अपने तारे की ओर हमेशा एक ही चेहरा किए रहता है, जैसी उसके खोजकर्ताओं की अपेक्षा है (Anglada-Escudé et al. 2016); उसकी कक्षा का झुकाव, और अपनी कक्षाओं में वह और Proxima d कहाँ हैं, यह ज्ञात नहीं है, इसलिए ये मान लिए गए हैं। आकाश का रंग सांकेतिक है: कोई नहीं जानता कि वहाँ हवा है या नहीं। Alpha Centauri A और B अपनी असली जगह पर हैं; बाकी तारे वैसे दिखाए गए हैं जैसे सूर्य से दिखते हैं।",
      "trappist-1e": "मॉडल पर आधारित: माना गया है कि TRAPPIST-1 e अपने तारे की ओर हमेशा एक ही चेहरा किए रहता है (Gillon et al. 2017); उसके सहोदर ग्रह वहाँ हैं जहाँ उनके मापे गए पारगमन समय उन्हें रखते हैं, एक ही तल में वृत्ताकार कक्षाओं पर, और यह तल हमारी दृष्टि-रेखा के चारों ओर एक माने गए ढंग से घुमाया गया है। आकाश का रंग सांकेतिक है: कोई नहीं जानता कि वहाँ हवा है या नहीं। बाकी तारे वैसे दिखाए गए हैं जैसे सूर्य से दिखते हैं।"
    },
    "parentNote": "यह चंद्रमा अपने ग्रह की ओर हमेशा एक ही चेहरा किए रहता है, इसलिए ग्रह न उदय होता है न अस्त।",
    "starNote": "माना गया है कि यह ग्रह अपने तारे की ओर हमेशा एक ही चेहरा किए रहता है, इसलिए तारा न उदय होता है न अस्त।",
    "discNote": "सूर्य, पृथ्वी, फ़ोबोस और दूसरे चौड़े पिंड अपने असली आकार और कला वाली सादे रंगों की चकतियाँ हैं, उनके नक्शे या आकृतियाँ नहीं।",
    "frameNote": "घूर्णन: IAU WGCCRE 2015 रिपोर्ट (Archinal et al. 2018)। स्थितियाँ: ऐप का अपना पंचांग (एफ़ेमेरिस)।",
    "compass": {
      "N": "उ",
      "E": "पू",
      "S": "द",
      "W": "प"
    },
    "bodies": {
      "sun": "सूर्य",
      "mercury": "बुध",
      "venus": "शुक्र",
      "earth": "पृथ्वी",
      "moon": "चंद्रमा",
      "mars": "मंगल",
      "phobos": "फ़ोबोस",
      "deimos": "डीमोस",
      "jupiter": "बृहस्पति",
      "io": "आयो",
      "europa": "यूरोपा",
      "ganymede": "गैनिमीड",
      "callisto": "कैलिस्टो",
      "saturn": "शनि",
      "titan": "टाइटन",
      "uranus": "अरुण",
      "neptune": "वरुण",
      "proxima": "Proxima Centauri",
      "proxima-d": "Proxima d",
      "alpha-cen-a": "Alpha Centauri A",
      "alpha-cen-b": "Alpha Centauri B",
      "trappist-1": "TRAPPIST-1",
      "trappist-1b": "TRAPPIST-1 b",
      "trappist-1c": "TRAPPIST-1 c",
      "trappist-1d": "TRAPPIST-1 d",
      "trappist-1f": "TRAPPIST-1 f",
      "trappist-1g": "TRAPPIST-1 g",
      "trappist-1h": "TRAPPIST-1 h"
    },
    "earthAndMoon": "पृथ्वी और चंद्रमा",
    "nightOpened": "इस जगह अभी रात है, इसलिए घड़ी स्थानीय सौर समय {local} पर रखी गई है, सूरज {sun}° ऊपर है। घड़ी से आप अभी के समय पर लौट सकते हैं।",
    "unknownGround": "उस जगह के लिए अभी कोई भू-भाग मॉडल नहीं है।",
    "unknownSky": "इस नक्शे में अभी उस जगह पर खड़ा नहीं हुआ जा सकता: केवल चंद्रमा, मंगल, टाइटन, यूरोपा, Proxima b या TRAPPIST-1 e पर।"
  }
});
// b200-f7-ground: end
// b200-c3-learn: begin -- the Fengyun-1C Moment (copy/en.moments.fengyun.js and its shelf card, forge #153), machine-drafted
COPY.momentShelf.cards['fengyun-1c'] = {
  "title": "2007: Fengyun-1C",
  "when": "11 जनवरी 2007 से आज तक",
  "blurb": "एक चीनी मिसाइल 865 किमी की ऊँचाई पर एक पुराने मौसम उपग्रह को नष्ट करती है, और उसके 3 531 सूचीबद्ध टुकड़े एक बिंदु से फैलकर पृथ्वी के चारों ओर एक खोल बन जाते हैं, एक आवाज़ की ज़ुबानी।"
};
COPY.momentStories['fengyun-1c'] = {
  "title": "2007: Fengyun-1C",
  "blurb": "एक चीनी मिसाइल 865 किमी की ऊँचाई पर एक पुराने मौसम उपग्रह को नष्ट करती है, और उसके टुकड़े एक बिंदु से फैलकर पृथ्वी के चारों ओर एक खोल बन जाते हैं जो आज भी है।",
  "chBefore": "Fengyun-1C",
  "chHit": "परीक्षण",
  "chRing": "एक छल्ला",
  "chMonths": "दो महीने",
  "chYear": "पहला साल",
  "chShell": "एक खोल",
  "chToday": "आज",
  "v1a": "11 जनवरी 2007 की शाम। Fengyun-1C, 960 किग्रा का एक सेवानिवृत्त चीनी मौसम उपग्रह, ध्रुवों के ऊपर से पृथ्वी की परिक्रमा करता है, 845 से 865 किमी ऊपर।",
  "v1b": "शीचांग के पास से छोड़ी गई एक मिसाइल उससे मिलने ऊपर चढ़ रही है। उसका रास्ता कभी प्रकाशित नहीं हुआ, इसलिए वह नहीं दिखाया गया है।",
  "v2a": "22:26 UTC: इंटरसेप्टर उपग्रह से आमने-सामने टकराता है, लगभग 8 किमी/सेकंड की नज़दीकी रफ़्तार से, और उसे हज़ारों टुकड़ों में तोड़ देता है।",
  "v2b": "हर टुकड़ा बाक़ियों से थोड़ा तेज़ या धीमा आगे बढ़ता है, इसलिए हर एक अपनी अलग कक्षा में होता है।",
  "v3a": "ऊँची कक्षा को एक चक्कर में ज़्यादा समय लगता है। चक्कर दर चक्कर टुकड़े पुरानी कक्षा के साथ खिंचते जाते हैं, और कुछ ही दिनों में एक छल्ले में जुड़ जाते हैं।",
  "v4a": "पृथ्वी का उभार हर कक्षा के तल को घुमाता है, हर ऊँचाई और झुकाव के लिए थोड़ा तेज़ या धीमा, और छल्ला पंखे की तरह खुलने लगता है।",
  "v4b": "परीक्षण के दो महीने बाद 1 200 से ज़्यादा टुकड़े सूचीबद्ध हो चुके थे और लगभग 400 और पर नज़र रखी जा रही थी, NASA के Orbital Debris Quarterly News ने बताया।",
  "v5a": "2007 के अंत तक सूची में 2 317 टुकड़े थे, और सिर्फ़ 22 वापस गिरे थे। NASA ने एक सेंटीमीटर या उससे बड़े कम से कम 150 000 टुकड़ों का अनुमान लगाया, जो ट्रैक करने के लिए बहुत छोटे हैं।",
  "v6a": "साल दर साल तल पूरे घेरे में फैल जाते हैं। जनवरी 2013 तक बादल पृथ्वी के चारों ओर एक खोल बन चुका है: 3 378 टुकड़े सूचीबद्ध, 3 076 अब भी कक्षा में।",
  "v6b": "उपग्रहों को उनसे बचना पड़ता है। अंतरराष्ट्रीय अंतरिक्ष स्टेशन जनवरी 2012 में उनमें से एक के रास्ते से हटा।",
  "v7a": "आज सूची में Fengyun-1C के 3 531 टुकड़े हैं, और 2 310 अब भी ऊपर हैं, लगभग बीस साल बाद। 10 नवंबर 2021 को स्टेशन फिर एक से बचने के लिए हटा।",
  "v7b": "गिनतियाँ मापी गई हैं। चित्र एक मॉडल है: आज के बचे हुए टुकड़े आज की कक्षाओं में, परीक्षण के पल तक पीछे की ओर फैलाए गए।",
  "pathSat": "Fengyun-1C की कक्षा, 845 गुणा 865 किमी, 98.6 डिग्री झुकाव (NASA ODQN, अप्रैल 2007), एक शंकु-परिच्छेद के रूप में; उस पर उपग्रह कहाँ टकराया, यह उदाहरण के लिए है",
  "cloudNote": "टुकड़े वे 2 310 हैं जो सूची में अब भी हैं, उन कक्षाओं पर जो वह आज देती है, एक मॉडल द्वारा एक बिंदु से फैलाए गए (दो-पिंड गति और पृथ्वी के उभार से होने वाला खिसकाव); गिर चुके टुकड़े नहीं दिखाए गए हैं, और कैप्शन की गिनतियाँ मापी गई हैं। टक्कर के क्षण हर टुकड़ा अपने आज के सबसे निचले बिंदु से शुरू होता है, इसलिए बादल एक बिंदु नहीं बल्कि उपग्रह के नीचे एक रेखा के रूप में शुरू होता है: 2007 से हवा के खिंचाव ने कई कक्षाओं को नीचे कर दिया है।",
  "drawnNote": "सांकेतिक: Fengyun-1C एक छल्लेदार निशान है और हर टुकड़ा एक ही आकार का बिंदु, दोनों पैमाने पर नहीं; टक्कर स्वयं नहीं दिखाई गई है।",
  "footMore": "और",
  "footLess": "कम",
  "srcOdqn07": "NASA Orbital Debris Quarterly News 11(2), अप्रैल 2007: उपग्रह, उसकी कक्षा, पहली गिनतियाँ",
  "srcOdqn08": "NASA Orbital Debris Quarterly News 12(1), जनवरी 2008: 2007 के अंत की गिनती",
  "srcOdqn13": "NASA Orbital Debris Quarterly News 17(1), जनवरी 2013: सूचीबद्ध, गिरे हुए और अब भी कक्षा में",
  "srcOdqn14": "NASA Orbital Debris Quarterly News 18(1), जनवरी 2014: जनवरी 2012 में स्टेशन का बचाव पैंतरा",
  "srcOdqn22": "NASA Orbital Debris Quarterly News 26(1), मार्च 2022: 10 नवंबर 2021 को स्टेशन का बचाव पैंतरा",
  "srcCelestrak": "CelesTrak, Chinese ASAT test: घटना का सबसे संभावित समय, 22:26:10 UTC",
  "srcSatcat": "CelesTrak की उपग्रह सूची (SATCAT), 2026-11-07 को पढ़ी गई: आज की गिनती और हर टुकड़े की कक्षा",
  "srcWiki": "विकिपीडिया, 2007 Chinese anti-satellite missile test: नज़दीकी रफ़्तार"
};
// b200-c3-learn: end
// research train (ops): the Iridium-Cosmos Moment: begin -- copy/en.moments.iridium.js and its shelf card (forge #561), machine-drafted
COPY.momentShelf.cards['iridium-cosmos-2009'] = {
  "title": "2009: इरिडियम 33 और कोस्मोस 2251",
  "when": "10 फ़रवरी 2009 से आज तक",
  "blurb": "एक चालू फ़ोन उपग्रह और एक बंद पड़ा रूसी उपग्रह साइबेरिया के ऊपर 789 किमी पर टकराते हैं, और उनके सूची में दर्ज 2 370 टुकड़े पृथ्वी के चारों ओर दो बादल बन जाते हैं।"
};
COPY.momentStories['iridium-cosmos-2009'] = {
  "title": "2009: इरिडियम 33 और कोस्मोस 2251",
  "blurb": "दो उपग्रह साइबेरिया के ऊपर 789 किमी पर संयोग से टकराते हैं, और हर एक टुकड़ों का ऐसा बादल बन जाता है जो आज भी पृथ्वी की परिक्रमा कर रहा है।",
  "chBefore": "दो उपग्रह",
  "chClose": "पास आते हुए",
  "chHit": "टक्कर",
  "chRing": "दो छल्ले",
  "chDays": "कुछ दिन",
  "chFan": "पंखे की तरह फैलाव",
  "chShell": "तीन साल बाद",
  "chToday": "आज",
  "c1a": "10 फ़रवरी 2009, टक्कर से पंद्रह मिनट पहले। इरिडियम 33, इरिडियम फ़ोन नेटवर्क का एक चालू उपग्रह, 556 किलो का, आर्कटिक के ऊपर लगभग 789 किमी की ऊँचाई पर उत्तर की ओर उड़ रहा है।",
  "c1b": "कोस्मोस 2251, 900 किलो का एक रूसी सैन्य उपग्रह, 74 डिग्री झुकी कक्षा में दक्षिण की ओर उड़ रहा है। यह 1995 में बंद हो गया था और इसमें हटने के लिए कोई इंजन नहीं था।",
  "c2a": "उनके रास्ते साइबेरिया के तैमिर प्रायद्वीप के ऊपर एक-दूसरे को काटते हैं। उस दिन CelesTrak की जाँच ने अनुमान लगाया था कि वे 584 मीटर की दूरी से गुज़रेंगे, और यह उसकी सूची का सबसे नज़दीकी गुज़रना नहीं था।",
  "c2b": "यह इरिडियम परिवार का आकार है, असली नाप में: 3.1 मीटर लंबा ढाँचा और 9.4 मीटर फैले पंख। कोस्मोस 2251 का यहाँ कोई मॉडल नहीं है; दूर से वह छल्ले वाला निशान है।",
  "c3a": "16:55:59 UTC: वे लगभग समकोण पर मिलते हैं, लगभग 11.7 किमी/सेकंड से एक-दूसरे की ओर, और दोनों टूट जाते हैं।",
  "c4a": "दो बादल, एक नहीं: हर उपग्रह के टुकड़े उसकी अपनी कक्षा के पास रहते हैं, इसलिए दो छल्ले बनते हैं जो वहाँ एक-दूसरे को काटते हैं जहाँ उपग्रह टकराए थे।",
  "c5a": "ऊँचे टुकड़े को एक चक्कर में ज़्यादा समय लगता है। चक्कर दर चक्कर हर बादल अपनी कक्षा के साथ खिंचता जाता है।",
  "c6a": "पृथ्वी का उभार हर कक्षा के तल को उसकी ऊँचाई और झुकाव के हिसाब से घुमाता है। 74 डिग्री झुके कोस्मोस 2251 के टुकड़े ध्रुवीय इरिडियम के टुकड़ों से लगभग चार गुना तेज़ी से फैलते हैं।",
  "c7a": "22 जून 2012 तक CelesTrak ने इरिडियम 33 के 598 टुकड़े गिने, जिनमें 93 गिर चुके थे, और कोस्मोस 2251 के 1 603, जिनमें 222 गिर चुके थे।",
  "c8a": "आज सूची में इरिडियम 33 के 656 और कोस्मोस 2251 के 1 714 टुकड़े हैं; सत्रह साल से ज़्यादा बाद भी 115 और 604 कक्षा में हैं।",
  "c8b": "गिनतियाँ मापी गई हैं। तस्वीर एक मॉडल है: आज बचे टुकड़े आज की कक्षाओं पर, टक्कर के पल तक पीछे फैलाए गए।",
  "pathIridium": "इरिडियम 33 को 789 किमी ऊँचे वृत्त के रूप में (NASA ODQN 13(2)), 86.4 डिग्री झुका और उत्तर की ओर (CelesTrak), तैमिर प्रायद्वीप में हमारे चुने एक बिंदु से गुज़रता हुआ; उसकी असली कक्षा इससे लगभग 15 किमी के भीतर थी",
  "pathKosmos": "कोस्मोस 2251 को उसी ऊँचाई के वृत्त के रूप में, 74.0 डिग्री झुका और दक्षिण की ओर, उसी बिंदु से गुज़रता हुआ: दोनों 101.5 डिग्री और 11.55 किमी/सेकंड पर मिलते हैं, प्रकाशित 11.7 के क़रीब",
  "cloudNote": "टुकड़े वे 115 इरिडियम 33 के और 604 कोस्मोस 2251 के हैं जो सूची में अब भी हैं, उन कक्षाओं पर जो वह आज देती है, एक मॉडल द्वारा टक्कर के बिंदु से फैलाए गए (दो पिंडों की गति और पृथ्वी के उभार से होने वाला खिसकाव); गिर चुके टुकड़े नहीं बनाए गए, और कैप्शन की गिनतियाँ मापी गई हैं। टक्कर के पल हर टुकड़ा आज के अपने सबसे निचले बिंदु से शुरू होता है, इसलिए हर बादल एक बिंदु नहीं बल्कि छोटी रेखा के रूप में शुरू होता है: 2009 से हवा के घर्षण ने कई कक्षाएँ नीची कर दी हैं।",
  "drawnNote": "चित्रात्मक: इरिडियम 33 को इरिडियम परिवार का आकार दिया गया है (पहली पीढ़ी के उपग्रहों का ढाँचा अलग था), कोस्मोस 2251 छल्ले वाला निशान है और हर टुकड़ा एक ही नाप का बिंदु; टक्कर ख़ुद नहीं बनाई गई।",
  "drawnNoteLamp": "चित्रात्मक: टक्कर पृथ्वी की छाया में हुई, इसलिए इरिडियम 33 को दिखाने के लिए एक लैंप से रोशन किया गया है; उसे इरिडियम परिवार का आकार दिया गया है (पहली पीढ़ी के उपग्रहों का ढाँचा अलग था), कोस्मोस 2251 छल्ले वाला निशान है और हर टुकड़ा एक ही नाप का बिंदु; टक्कर ख़ुद नहीं बनाई गई।",
  "footMore": "और",
  "footLess": "कम",
  "srcOdqn09": "NASA Orbital Debris Quarterly News 13(2), अप्रैल 2009: टक्कर और उसकी ऊँचाई",
  "srcCelestrak": "CelesTrak, Iridium 33/Cosmos 2251 Collision: सेकंड, हर एक की दिशा, द्रव्यमान, अनुमानित दूरी, 2012 की गिनतियाँ",
  "srcJsr": "Jonathan's Space Report 606: तैमिर प्रायद्वीप, और यह कि कोस्मोस 2251 1995 से बंद था और उसमें इंजन नहीं था",
  "srcSatcat": "CelesTrak की उपग्रह सूची (SATCAT), 2026-11-23 को पढ़ी गई: आज की गिनतियाँ और हर टुकड़े की कक्षा",
  "srcWiki": "विकिपीडिया, 2009 की उपग्रह टक्कर: लगभग 11.7 किमी/सेकंड की आपसी गति"
};
// research train (ops): the Iridium-Cosmos Moment: end
// b200-c2-deep: begin -- the 3D stars over deep time, the variable stars worth going out for, the black holes against the EHT's pictures and the cards in the trips' voice (copy/en.deep.js, forge #141, #142, #149, #151), machine-drafted
Object.assign(COPY, {
  "depthNote": { "modelled": "गहराई मॉडल से बनी है: केवल तारों की दूरियाँ मापी गई हैं।" },
  "starDeep": {
    "moved": "{year} के तारे: हर तारा अपनी मापी गई गति से खिसकाया गया (हिप्पार्कोस और गाइया, HYG के ज़रिए); इतने लंबे समय तक उन्हें सीधी रेखा में आगे ले जाना मॉडल है।",
    "hidden": "आज से इतनी दूर, जिन तारों की गति मापी नहीं गई वे नहीं दिखाए जाते।",
    "noPluto": "आज से इतनी दूर प्लूटो और उसके चंद्रमा नहीं दिखाए जाते: उनकी पंचांग-सारणी (astronomy-engine) केवल वर्ष 0 से 4000 तक की है।",
    "selected": "{name} तब सूर्य से {d} प्रकाश-वर्ष दूर है (मॉडल); कार्ड और लेबल आज की दूरी, {today}, बताते हैं।"
  },
  "varEvents": {
    "min": "{name} न्यूनतम पर",
    "max": "{name} अपनी अधिकतम चमक के पास",
    "minLine": "कांतिमान {mag} तक, {dir} में {alt}° ऊपर।",
    "maxLine": "लगभग कांतिमान {mag}, {dir} में {alt}° ऊपर।",
    "minClass": "इसके मापे गए न्यूनतमों (Kreiner 2004) से, इसके आवर्तकाल से आगे बढ़ाया गया: लगभग पंद्रह मिनट तक सही।",
    "maxClass": "सूची के आवर्तकाल और युग से मॉडल: मीरा के अधिकतम हफ़्तों पहले या बाद आते हैं।",
    "aria": "{title}, {when}। {line}"
  },
  "holeCompare": {
    "fromEarth": "पृथ्वी से देखें",
    "fromEarthTitle": "छिद्र से पृथ्वी की रेखा पर खड़े हों, उत्तर ऊपर और पूर्व बाईं ओर, जैसे EHT की तस्वीरें छापी जाती हैं",
    "compare": "EHT की तस्वीर से तुलना करें",
    "compareTitle": "बनाए गए छिद्र के पास इवेंट होराइज़न टेलीस्कोप की तस्वीर दिखाएँ, दोनों पृथ्वी से, उत्तर ऊपर",
    "hide": "EHT की तस्वीर छिपाएँ",
    "caption": "EHT, {date}",
    "orient": "उत्तर ऊपर, पूर्व बाईं ओर, जैसे छिद्र अभी बनाया गया है।",
    "credit": "तस्वीरें: EHT Collaboration, CC BY 4.0।",
    "source": "स्रोत",
    "alt": "{name} की इवेंट होराइज़न टेलीस्कोप तस्वीर, {date}: एक अंधेरे केंद्र के चारों ओर नारंगी रोशनी का छल्ला।",
    "brightest": "पृथ्वी से, उत्तर ऊपर रखकर, बनाया गया छल्ला लगभग {ours}° स्थिति कोण पर सबसे चमकीला है (चित्र पर मापा गया); {date} की EHT तस्वीर लगभग {theirs}° पर सबसे चमकीली है।",
    "approx": {
      "m87-star": "मिलाया गया: झुकाव (हमारी दृष्टि रेखा से 17°) और आकाश में जेट का कोण (288°) मापे गए हैं (Walker et al. 2018), और प्रवाह घड़ी की दिशा में घूमने से (EHT 2019, शोधपत्र V) पास आती ओर, जो अपनी गति से चमकीली होती है, दक्षिण में पड़ती है। छल्ले पर रैखिक चमक में मापने पर हमारी चमकीली ओर फीकी से लगभग 2.5 गुनी है (EHT के 20 µas तक धुंधला करने पर 2.1); उनकी 2017 में 2.7 और 2018 में 4.2, यानी हमारी 2017 से मेल खाती है। लगभग: प्रकाश को न घूमने वाले छिद्र के चारों ओर ट्रेस किया गया है और गैस वृत्ताकार कक्षाओं में एक पतली डिस्क है, EHT के मॉडलों का गर्म, मोटा प्रवाह नहीं। उनका चमकीला धब्बा एक साल में लगभग 30° खिसका; हमारा नहीं खिसकता।",
      "sgr-a-star": "मिलाया गया: अक्ष से 30° पर देखा गया, जैसे EHT 2022 शोधपत्र V के सबसे उपयुक्त मॉडल, और GRAVITY की चमकों की तरह घड़ी की दिशा में घूमता हुआ। चुना गया: आकाश में अक्ष किधर है, जिसे किसी ने नहीं मापा; उसे ऐसे घुमाया गया है कि चमकीली ओर वहाँ पड़े जहाँ EHT की तस्वीर सबसे चमकीली है। लगभग: प्रकाश न घूमने वाले छिद्र और पतली डिस्क के चारों ओर ट्रेस किया गया है; EHT की तस्वीर मिनटों में बदलने वाले प्रवाह का एक रात का औसत है, और उसके तीन चमकीले गुच्छे सभी असली नहीं हैं, उसके निर्माता कहते हैं। हमारी चमकीली ओर फीकी से लगभग पाँच गुनी है (EHT के 20 µas तक धुंधला करने पर 4.5), उनकी 1.7: 30° पर वृत्ताकार कक्षाएँ पास की ओर को EHT के रात भर के औसत से कहीं अधिक चमकाती हैं।"
    }
  },
  "cardVoice": {
    "readTitle": "यह कार्ड ज़ोर से पढ़ें: सफ़रों की कृत्रिम आवाज़ में उद्धृत विकिपीडिया पाठ",
    "credit": "आवाज़: Kokoro-82M (af_heart), एक कृत्रिम आवाज़, Apache-2.0; शब्द विकिपीडिया के हैं (CC BY-SA 4.0)।"
  }
});
// b200-c2-deep: end

// b200-s1-fixes: begin -- the long mission clock's units (copy/en.moments.js momentPlayer metYears, metDays), machine-drafted
COPY.momentPlayer.metYears = "{y} वर्ष {d} दिन";
COPY.momentPlayer.metDays = "{d} दिन";
COPY.truth.exoPacked = "{date} की हमारी संक्षिप्त प्रति"; // forge #88: which list an exoplanet came from
COPY.truth.exoLive = "संग्रह की सूची, {date} को पढ़ी गई";
// The deep-sky catalogue's type phrases (data/dso.json `typeText`), lowercased, in this language: the card's lead and its
// "What it is" row read them through RULES.typeWords; a phrase not here stays English, which is data.
const S1_TYPES = {"two-lobed nebula of dust and gas": "धूल और गैस की दो-पालियों वाली नेबुला", "globular cluster": "गोलाकार तारागुच्छ", "open cluster": "खुला तारागुच्छ", "dwarf spheroidal galaxy": "बौनी गोलाभ आकाशगंगा", "spiral galaxy": "सर्पिल आकाशगंगा", "emission nebula": "उत्सर्जन नीहारिका", "planetary nebula": "ग्रहीय नीहारिका", "dwarf irregular galaxy": "बौनी अनियमित आकाशगंगा", "barred spiral galaxy": "दंडयुक्त सर्पिल आकाशगंगा", "elliptical galaxy": "दीर्घवृत्ताकार आकाशगंगा", "lenticular galaxy": "लेंसाकार आकाशगंगा", "h ii region nebula with cluster": "तारागुच्छ सहित H II क्षेत्र", "dwarf elliptical galaxy": "बौनी दीर्घवृत्ताकार आकाशगंगा", "h ii region nebula": "H II क्षेत्र", "barred irregular galaxy": "दंडयुक्त अनियमित आकाशगंगा", "ultra-faint dwarf galaxy": "अत्यंत धुंधली बौनी आकाशगंगा", "dark nebula": "काली नीहारिका", "young open cluster in an emission nebula": "उत्सर्जन नीहारिका में युवा खुला तारागुच्छ", "supernova remnant": "सुपरनोवा अवशेष", "pulsar wind nebula": "पल्सर पवन नीहारिका", "nebula with cluster": "तारागुच्छ सहित नीहारिका", "milky way star cloud": "आकाशगंगा (मिल्की वे) का तारा-बादल", "optical double": "प्रकाशीय युग्म", "asterism": "तारामंडल-आकृति (एस्टरिज़्म)", "diffuse nebula": "विसरित नीहारिका", "starburst galaxy": "तारा-विस्फोट आकाशगंगा", "dwarf irregular starburst galaxy": "तारा-विस्फोट वाली बौनी अनियमित आकाशगंगा", "transition dwarf galaxy, part irregular, part spheroidal": "संक्रमणशील बौनी आकाशगंगा, कुछ अनियमित, कुछ गोलाभ", "barred irregular galaxy, seen edge-on": "दंडयुक्त अनियमित आकाशगंगा, किनारे से दिखती", "ultra-faint dwarf galaxy, or perhaps a star cluster": "अत्यंत धुंधली बौनी आकाशगंगा, या शायद एक तारागुच्छ", "transition dwarf galaxy, part spheroidal, part irregular": "संक्रमणशील बौनी आकाशगंगा, कुछ गोलाभ, कुछ अनियमित", "spiral galaxy, seen nearly edge-on and bursting with new stars": "सर्पिल आकाशगंगा, लगभग किनारे से दिखती और नए तारों से भरी", "peculiar galaxy with a giant black hole firing radio jets": "विचित्र आकाशगंगा, जिसका विशाल ब्लैक होल रेडियो जेट छोड़ता है", "pair of open clusters": "खुले तारागुच्छों की जोड़ी", "spiral galaxy seen exactly edge-on": "ठीक किनारे से दिखती सर्पिल आकाशगंगा", "reflection nebula": "परावर्तन नीहारिका", "reflection and emission nebula": "परावर्तन और उत्सर्जन नीहारिका", "spiral galaxy seen edge-on": "किनारे से दिखती सर्पिल आकाशगंगा", "barred spiral galaxy seen edge-on": "किनारे से दिखती दंडयुक्त सर्पिल आकाशगंगा", "spiral galaxy seen face-on": "सामने से दिखती सर्पिल आकाशगंगा", "barred spiral galaxy seen nearly edge-on": "लगभग किनारे से दिखती दंडयुक्त सर्पिल आकाशगंगा", "pair of colliding galaxies": "टकराती आकाशगंगाओं की जोड़ी", "cavity in the interstellar medium": "अंतरतारकीय माध्यम में खोखला", "light echo round an erupted star": "विस्फोट वाले तारे के चारों ओर प्रकाश-प्रतिध्वनि"};
const S1_PLACES = [[" in the large magellanic cloud", " बड़े मैगेलैनिक बादल में"], [" in the small magellanic cloud", " छोटे मैगेलैनिक बादल में"], [" in the milky way", " आकाशगंगा (मिल्की वे) में"], [" in the local group", " स्थानीय समूह में"]];
RULES.typeWords = (text) => {
  let base = String(text || '').trim();
  let tail = '';
  for (const [en, here] of S1_PLACES) if (base.toLowerCase().endsWith(en)) { tail = here; base = base.slice(0, base.length - en.length); break; }
  const hit = S1_TYPES[base.toLowerCase()];
  return hit ? hit + tail : String(text || '');
};
// b200-s1-fixes: end
// b200-f10-stars3d: begin -- the 3D star map's AT-HYG tier (copy/en.startiers.js, forge #140), machine-drafted
Object.assign(COPY, {
  "starTiers": {
    "unnamed": "एक बिना नाम का तारा (AT-HYG {n})",
    "cite": "AT-HYG v4.0 (CC BY-SA 4.0, David Nash): स्थान और चमक Tycho-2 से, दूरी {dist} से",
    "from": {
      "gaia-dr3": "Gaia DR3",
      "gaia-dr2": "Gaia DR2",
      "hipparcos": "हिप्पार्कोस",
      "gliese": "ग्लीज़ सूची",
      "other": "एक पुरानी सूची"
    },
    "error": "दूरी लगभग ±{pct} % तक सही (लंबन बटा उसकी त्रुटि लगभग {poe}): इस चमक पर मिशन की सामान्य त्रुटि ({mas} मिलीआर्कसेकंड) से मॉडल की गई, क्योंकि AT-HYG में इस तारे की अपनी त्रुटि नहीं है",
    "noError": "AT-HYG इस दूरी की कोई त्रुटि नहीं देता",
    "guess": "यह दूरी एक अनुमान है: 3 kpc (लगभग 10 000 प्रकाश-वर्ष) से आगे लंबन मिलीआर्कसेकंड के कुछ दसवें हिस्से भर का होता है, और तारे की अपनी त्रुटि AT-HYG में नहीं है, जो केवल अपनी त्रुटि से बड़ा लंबन रखता है",
    "lineHyg": "3D में तारे: HYG के 109 389।",
    "lineAthyg": "3D में तारे: HYG के 109 389 और AT-HYG के {n} मिलियन, सीढ़ी के एक डंडे पर कैमरे के आसपास लाए गए (एक बार में {k} मिलियन तक) और कैमरे से {lim} कांतिमान तक बनाए गए, आँख जितना देखती है उससे धुँधले, अंत की ओर फीके पड़ते हुए।",
    "shell": "किसी दुनिया के मंच पर 3D तारे केवल HYG के हैं: सूर्य से देखने पर 7.5 या उससे अधिक चमकीले AT-HYG के {n} तारे वहाँ नहीं बनाए जाते।",
    "why": {
      "low": "कम गुणवत्ता केवल HYG बनाती है।",
      "latched": "फ़्रेम दर कम थी: केवल HYG।",
      "saver": "डेटा सेवर: केवल HYG।",
      "none": ""
    },
    "gaiaHeld": "Gaia DR3 कोई स्तर नहीं है: ESA अपने संग्रह का डेटा केवल गैर-व्यावसायिक उपयोग के लिए देता है (CC BY-NC 3.0 IGO)।",
    "farTime": "AT-HYG के तारे केवल आज की तारीख़ पर बनाए जाते हैं: दूर के समय का दृश्य केवल HYG का उपयोग करता है।"
  }
});
// b200-f10-stars3d: end
// b200-s4a-look: begin -- how a world is drawn (its card's note), the Earth in a card's breadcrumb and our missions' event titles in the date field (copy/en.js worldView, sky.bodies; copy/en.find.js dateJump.eventTitles; 2.0.0 look finding 8) and what a tap no figure of another sky reaches says (copy/en.later.js skyLore; finding 10), machine-drafted
COPY.worldView.nearer = "{name} को उसकी असली दिशा में बनाया गया है, पर असल से ज़्यादा पास और बड़ा, ताकि आप उसे ढूँढ सकें।";
COPY.worldView.asIs = "{name} को वहीं बनाया गया है जहाँ वह है, उसके असली आकार में।";
COPY.sky.bodies.earth = "पृथ्वी";
COPY.dateJump.eventTitles = {
  "Launch": "प्रक्षेपण",
  "Closest to Jupiter": "बृहस्पति के सबसे पास",
  "Closest to Saturn": "शनि के सबसे पास",
  "The Pale Blue Dot": "फीका नीला बिंदु",
  "The most distant thing we made": "हमारी बनाई सबसे दूर की चीज़",
  "The termination shock": "टर्मिनेशन शॉक",
  "Into interstellar space": "अंतरतारकीय अंतरिक्ष में",
  "Closest to Uranus": "अरुण के सबसे पास",
  "Closest to Neptune": "वरुण के सबसे पास",
  "Jupiter's push": "बृहस्पति का धक्का",
  "Saturn's orbit": "शनि की कक्षा",
  "Closest to Pluto": "प्लूटो के सबसे पास",
  "Arrokoth": "अरोकोथ",
  "The first full-colour pictures": "पहली रंगीन तस्वीरें",
  "The first big batch of data": "डेटा का पहला बड़ा जत्था",
  "Back past Earth": "फिर पृथ्वी के पास से",
  "Into orbit round Jupiter": "बृहस्पति की कक्षा में",
  "Past Venus": "शुक्र के पास से",
  "Past Venus again": "फिर शुक्र के पास से",
  "Past Jupiter": "बृहस्पति के पास से",
  "Arrival at Saturn": "शनि पर आगमन",
  "Huygens let go": "Huygens अलग हुआ",
  "Huygens lands on Titan": "Huygens टाइटन पर उतरा",
  "Earth, seen from Saturn": "शनि से दिखती पृथ्वी",
  "The Grand Finale begins": "ग्रैंड फ़िनाले शुरू",
  "Into Saturn": "शनि के भीतर",
  "Out of the shuttle": "शटल से बाहर",
  "The first asteroid visit": "किसी क्षुद्रग्रह की पहली यात्रा",
  "Past Earth a second time": "दूसरी बार पृथ्वी के पास से",
  "Ida and its moon": "इडा और उसका चंद्रमा",
  "Into Jupiter": "बृहस्पति के भीतर",
  "Past Mars": "मंगल के पास से",
  "Into orbit round Vesta": "वेस्टा की कक्षा में",
  "Leaving Vesta": "वेस्टा से विदा",
  "Into orbit round Ceres": "सेरेस की कक्षा में",
  "The last contact": "आख़िरी संपर्क",
  "Into the asteroid belt": "क्षुद्रग्रह पट्टी में",
  "Past the farthest planet": "सबसे दूर के ग्रह से आगे",
  "The last signal": "आख़िरी संकेत",
  "The first craft at Saturn": "शनि पर पहला यान",
  "Past the orbit of Neptune": "वरुण की कक्षा से आगे",
  "Arrival at L2": "L2 पर आगमन",
  "The first pictures": "पहली तस्वीरें",
  "Into orbit round the Moon": "चंद्रमा की कक्षा में",
  "The Eagle has landed": "ईगल उतर गया है",
  "One small step": "एक छोटा क़दम",
  "Leaving the Moon": "चंद्रमा से विदा",
  "Splashdown": "समुद्र में उतरना",
  "Apollo 8 leaves for the Moon": "Apollo 8 चंद्रमा की ओर",
  "Apollo 11 leaves for the Moon": "Apollo 11 चंद्रमा की ओर",
  "Apollo 17, at night": "Apollo 17, रात में",
  "Flying again": "फिर से उड़ान",
  "Hubble goes up": "Hubble ऊपर गया",
  "The last Shuttle from 39B": "39B से आख़िरी शटल",
  "Past Mathilde": "मैथिल्डे के पास से",
  "A first pass of Eros": "इरोस के पास से पहली उड़ान",
  "Into orbit round Eros": "इरोस की कक्षा में",
  "Down on Eros": "इरोस पर उतरा",
  "Through the coma of Wild 2": "वाइल्ड 2 के कोमा के बीच से",
  "The capsule lands": "कैप्सूल उतरा",
  "Past Tempel 1": "टेम्पल 1 के पास से",
  "The impact": "टक्कर",
  "Earth and Moon flyby": "पृथ्वी और चंद्रमा के पास से उड़ान",
  "Past Hartley 2": "हार्टली 2 के पास से",
  "The course correction": "मार्ग सुधार",
  "Let go": "अलग हुआ",
  "Europa and Io, on the way in": "रास्ते में यूरोपा और आयो",
  "Into Jupiter’s air": "बृहस्पति की हवा में",
  "Landing in Jezero": "जेज़ेरो में उतरना",
  "The first flight": "पहली उड़ान",
  "The first rock core": "चट्टान का पहला कोर",
  "Two become one": "दो मिलकर एक",
  "People move in": "लोग रहने आए",
  "The last shuttle sets off": "आख़िरी शटल रवाना",
  "Discovered": "खोजा गया",
  "Past Earth": "पृथ्वी के पास से",
};
// 2.0.0 look finding 10: a tap no figure of another people's sky reaches (copy/en.later.js skyLore)
COPY.skyLore.notHereTitle = "यहाँ {culture} आकाश की कोई आकृति नहीं";
COPY.skyLore.notHere = "जहाँ आपने दबाया वहाँ {culture} आकाश की कोई आकृति नहीं बनी है। सबसे पास {name} है, {deg}° दूर।";
COPY.skyLore.notHereNone = "जहाँ आपने दबाया वहाँ {culture} आकाश की कोई आकृति नहीं बनी है।";
COPY.skyLore.nearest = "{name} की कहानी";
// b200-s4a-look: end

// redesign 2026-11-10: begin -- machine-drafted: the Games link of the explore panel (copy/en.js games), the rail's
// email updates (rail.subscribe), their popover and the row under Coming up (copy/en.subscribe.js emailUpdates;
// comingUp is the old subscribe.heading, moved)
COPY.rail.subscribe = "ईमेल अपडेट";
COPY.rail.coffee = "हमें एक कॉफ़ी पिलाएँ";
COPY.rail.coffeeLabel = "Buy Me a Coffee पर Space Radar का साथ दें";
COPY.games = {"label": "खेल", "title": "Space Radar टीम के अंतरिक्ष खेल (नए टैब में खुलते हैं)", "href": "https://games.spaceradar.ai/"};
COPY.emailUpdates = {
  "title": "मुफ़्त ईमेल अपडेट",
  "text": "चुनें कि आप किस बारे में जानना चाहते हैं। पुष्टि करने तक कुछ नहीं भेजा जाता।",
  "pick": "कम से कम एक चुनें",
  "news": "Space Radar समाचार",
  "journal": "जर्नल",
  "games": "अंतरिक्ष खेल",
  "sky": "आकाश की सूचनाएँ",
  "models": "Space Radar मॉडल",
  "video": "Space Radar वीडियो",
  "email": "ईमेल पता",
  "placeholder": "you@example.org",
  "button": "सदस्यता लें",
  "sending": "भेजा जा रहा है…",
  "retry": "फिर से कोशिश करें",
  "check": "अपना इनबॉक्स देखें: हमने {email} पर एक लिंक भेजा है। उस पर क्लिक करने तक कुछ नहीं भेजा जाता।",
  "invalidEmail": "यह पता सही नहीं लगता।",
  "rateLimited": "यहाँ से बहुत ज़्यादा कोशिशें हुईं। कुछ मिनट बाद फिर कोशिश करें।",
  "busy": "आज बहुत सारे लोग जुड़ रहे हैं। कृपया कल फिर कोशिश करें।",
  "sendFailed": "हम ईमेल नहीं भेज सके। कृपया बाद में फिर कोशिश करें।",
  "invalidLists": "कम से कम एक सूची चुनें।",
  "other": "कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।",
  "unreachable": "सर्वर तक नहीं पहुँच सके।",
  "privacy": "हम आपका पता और आपकी चुनी सूचियाँ रखते हैं, और कुछ नहीं। कोई ट्रैकिंग पिक्सेल नहीं, कोई बदला हुआ लिंक नहीं। हर ईमेल में एक क्लिक में सदस्यता छोड़ने का विकल्प है।",
  "privacyLink": "गोपनीयता",
  "honeypot": "इसे खाली छोड़ें",
  "close": "बंद करें",
  "comingUp": "आने वाली चीज़ों की खबर मुझे ईमेल करें",
  "skyButton": "आकाश की सूचनाएँ पाएँ"
};
// redesign 2026-11-10: end

// internal #442: begin -- the seven sections the checker did not count (it read a hand-kept list of English files): moon cards, nebula and Carina/SMC texts, confidence, share views and presets
COPY.klass.moon = "चंद्रमा";
COPY.klassFar.candidate = "बौना ग्रह उम्मीदवार";
COPY.templates.asteroid.leadCandidate = "{name} नेप्च्यून से परे एक बड़ा पिंड है जो बौना ग्रह हो सकता है, जिस पर IAU ने अभी निर्णय नहीं लिया है";
COPY.momentStories["curiosity-edl"] = {
  "title": "क्यूरियोसिटी: मंगल तक सात मिनट",
  "blurb": "6 अगस्त 2012: Mars Science Laboratory मंगल के वायुमंडल के ऊपरी छोर से गेल क्रेटर तक: ऊष्मा-ढाल, पैराशूट, रॉकेट बैकपैक और स्काई क्रेन, JPL की अपनी घड़ी के अनुसार।",
  "chEntry": "वायुमंडल",
  "chHeat": "अधिकतम ताप",
  "chChute": "पैराशूट",
  "chPowered": "रॉकेट अवतरण",
  "chCrane": "स्काई क्रेन",
  "chLanded": "स्पर्श",
  "ready": "मंगल, वायुमंडल से 30 सेकंड पहले। क्रूज़ चरण दस मिनट पहले छोड़ा जा चुका है; क्यूरियोसिटी अपने एरोशेल के भीतर सवार है, ऊष्मा-ढाल आगे, लगभग 5.9 km/s पर। घड़ी: प्रवेश से सेकंड, 6 अगस्त 2012 को 05:10:45.7 UTC।",
  "entry": "प्रवेश, 05:10:45.7 UTC: अवतरण स्थल की भूमि के ऊपर 131 km (NASA का आँकड़ा; प्रवेश बिंदु स्थल से काफी ऊपर की ओर है), 5.9 km/s पर। यान कुछ उत्थापन के साथ तिरछा उड़ता है, ताकि उसे दिशा दी जा सके।",
  "guided": "पिछले खोल पर लगे छोटे थ्रस्टर उत्थापन को S-आकार के वक्रों में मोड़ते हैं, ताकि लक्ष्य पर उतरा जा सके (नहीं बनाया गया)। पैराशूट से पहले की धीमी गति का नौ-दसवाँ भाग से अधिक वायु करती है।",
  "heating": "लगभग 80 सेकंड: अधिकतम ताप, ढाल के सामने के भाग पर लगभग 2 100 C। मंदन का शिखर लगभग दस सेकंड बाद आता है; इस पुनर्निर्माण में यह लगभग 9.6 g है।",
  "slow": "जैसे-जैसे हवा घनी होती है और गति घटती है, चमक धीमी पड़ती है। प्रवेश से नौ मिनट पहले यान ने उत्थापन-उड़ान के लिए अपने गुरुत्व-केंद्र को अक्ष से हटाने के वास्ते 75 kg के दो टंगस्टन खंड गिराए (नहीं बनाया गया)।",
  "weights": "पैराशूट से लगभग 20 सेकंड पहले अंतिम भार गिराया जाता है: 25 kg के छह खंड, ताकि छतरी के नीचे अवतरण के लिए वज़न को फिर से अक्ष पर लाया जा सके (नहीं बनाया गया)।",
  "chute": "259.2 सेकंड, 05:15:04.9 UTC: पैराशूट खुलता है, 11 km की ऊँचाई पर लगभग 405 m/s पर: लगभग 16 m व्यास का एक कैनोपी, 80 रस्सियों पर, प्रत्येक 50 m से अधिक लंबी। यह वास्तविक उड़ान के रंगों में बनाया गया है।",
  "shield": "278.9 सेकंड, 05:15:24.6 UTC: ऊष्मा-ढाल छोड़ा जाता है, लगभग 8 km ऊपर 125 m/s पर, और दूर गिर जाता है। रोवर का अवतरण कैमरा ज़मीन की फिल्मिंग शुरू करता है और चरण का रडार उसे मापता है।",
  "radar": "पैराशूट के नीचे रोवर पिछले खोल के भीतर लटका रहता है, अपने रॉकेट बैकपैक के नीचे सिमटा हुआ। रडार ऊँचाई और गति मापता है; उड़ान कंप्यूटर अलग होने के क्षण की प्रतीक्षा करता है।",
  "backshell": "ढाल के लगभग 80 सेकंड बाद, लगभग 1.6 km और 80 m/s पर, पिछला खोल रोवर और उसके रॉकेट बैकपैक को छोड़ता है। आठों अवतरण इंजन, प्रत्येक 400 से 3 100 N, प्रज्वलित होते हैं।",
  "divert": "अवतरण चरण तेज़ी से अलग होकर 300 m का एक युद्धाभ्यास करता है, ताकि पिछले खोल और पैराशूट से दूर रहे, जो बहते चले जाते हैं (उनका गिरना यहाँ उदाहरण के रूप में है)। यह 0.75 m/s तक धीमा होता है।",
  "skycrane": "412.9 सेकंड, 05:17:38.6 UTC: लगभग 20 m ऊपर रोवर चरण को छोड़ता है, और उसके आठ इंजनों में से चार बंद हो जाते हैं। चरण उसे तीन रस्सियों के 7.6 m के तार पर धीरे-धीरे नीचे उतारता है; पहिये अपनी जगह पर खुल जाते हैं।",
  "touchdown": "431.6 सेकंड, 05:17:57.3 UTC: स्पर्श, लगभग 0.75 m/s पर, गेल क्रेटर में, लक्ष्य दीर्घवृत्त के केंद्र से 2.4 km दूर। वायुमंडल में प्रवेश से सात मिनट और ग्यारह सेकंड।",
  "cut": "रोवर दो सेकंड प्रतीक्षा करता है, पहियों पर अपना भार महसूस करता है, फिर वे पायरोटेक्निक चलाता है जो रस्सियाँ काटते हैं। चरण थ्रॉटल बढ़ाता है।",
  "flyaway": "चरण लगभग 650 m दूर गिरने के लिए उड़ जाता है, ताकि रोवर पर न गिरे (यहाँ इसका पथ उदाहरण के रूप में है)।",
  "earth": "संकेत को पृथ्वी तक पहुँचने में 13 मिनट 48 सेकंड लगे: 05:31:45.4 UTC, पासाडेना में रात 10:31 बजे। “स्पर्श की पुष्टि। हम मंगल पर सुरक्षित हैं!” (Allen Chen, JPL)।",
  "pathEdl": "प्रकाशित घटना-समय, ऊँचाइयाँ और गतियाँ, जिन्हें उनसे मेल खाते एक बिंदु-द्रव्यमान द्वारा जोड़ा गया है; दिशा-सूचक शीर्ष हमारा है",
  "pathDescent": "प्रकाशित गतियाँ और समय, चरण के अंतिम 135 m, और उनके बीच जुड़ी स्काई क्रेन; दूर गिरना उदाहरण के रूप में है",
  "pathBackshell": "हमारा: पिछला खोल और उसका पैराशूट बहते और गिरते हैं; पढ़ी गई सामग्री में उनका कोई पथ प्रकाशित नहीं है",
  "pathRover": "JPL के समय और NASA के 20 m और 0.75 m/s, उनके बीच 18.7 सेकंड में रस्सी खुलती हुई",
  "srcJpl": "JPL, “Timeline of Major Mission Events During Curiosity's Landing” (प्रवेश, पैराशूट, ऊष्मा-ढाल, रोवर के अलग होने और स्पर्श के समय)",
  "srcKit": "NASA, Mars Science Laboratory Landing press kit, जुलाई 2012 (131 km पर 5.9 km/s से प्रवेश, पैराशूट, ढाल और पिछले खोल की ऊँचाई और गतियाँ; सार्वजनिक डोमेन)",
  "srcPowered": "Sell और अन्य, “Powered Flight Design and Reconstructed Performance Summary for the Mars Science Laboratory Mission”, AAS 13-424 (300 m का युद्धाभ्यास)",
  "srcWiki": "Mars Science Laboratory, Wikipedia (पैराशूट, तार, इंजन, चरण का गिरना)"
};
COPY.momentStories["new-horizons-pluto"] = {
  "title": "प्लूटो पर New Horizons",
  "blurb": "14 जुलाई 2015: प्लूटो की पहली यात्रा, छह घंटे पहले से 13.8 km/s पर गुज़रने तक, JPL के अपने पथ के अनुसार: प्लूटो और शैरन चकत्तों के रूप में, पीछे अर्धचंद्र।",
  "chApproach": "निकट आना",
  "chClosest": "निकटतम दूरी",
  "chAway": "पीछे मुड़कर देखना",
  "chCharon": "शैरन",
  "ready": "05:48 UTC, छह घंटे पहले: प्लूटो से 300 000 km दूर, नौ वर्ष से अधिक और 3 अरब मील के बाद (NASA)। प्लूटो और शैरन अब भी बिंदु हैं। घड़ी JPL Horizons पथ में निकटतम दूरी के क्षण, 11:48:29 UT, से सेकंड गिनती है।",
  "approach": "प्लूटो का व्यास लगभग 2 380 km है और शैरन का लगभग 1 210 km; वे हर 6.4 दिन में एक-दूसरे की परिक्रमा करते हैं। इस पुनःप्रस्तुति में शैरन प्लूटो की भूमध्य-रेखा के देशांतर 0 के ऊपर, 19 591 km दूरी पर है, जहाँ दोनों एक-दूसरे को अपना एक ही चेहरा दिखाते हैं (हमारा चित्र)।",
  "last": "यान अकेला है: दिन के बड़े हिस्से में वह अपने उपकरण प्लूटो की ओर रखता है और मिशन नियंत्रण से उसका संपर्क नहीं रहता (NASA)। वह सूर्य-पक्ष से प्रकाशित है और उस रेखा की ओर बढ़ रहा है जहाँ प्लूटो पर दिन समाप्त होता है।",
  "closest": "प्लूटो से निकटतम दूरी: सतह से 12 490 km, JPL के पथ के अनुसार 11:48:29 UT पर 13.78 km/s। NASA की समय-सारणी में लगभग 7:49 am EDT, 11:49:57 UTC, 12 500 km ऊपर और 30 800 mph; दोनों घड़ियों के बीच के 88 सेकंड यहाँ मिलाए नहीं गए हैं।",
  "pluto": "यान अब प्लूटो के रात्रि-पक्ष पर उड़ रहा है: लगभग पाँच मिनट पहले उसने दिन और रात की रेखा पार की, और प्रकाशित ग्रह को पीछे से देख रहा है। पीछे से प्रकाश पड़ने पर प्लूटो की धुंध चमकती (नहीं बनाई गई: यहाँ केवल ग्रह का किनारा बनता है)।",
  "away": "उसके पीछे प्लूटो एक अर्धचंद्र है जो यान के दूर जाने के साथ पतला होता जाता है। पृथ्वी 4.77 अरब km दूर है, रेडियो से 4 घंटे 25 मिनट (ग्रहों की स्थितियों से हमारा हिसाब)।",
  "charon": "प्लूटो के लगभग 14 मिनट बाद, शैरन: 28 860 km से कम दूरी पर (NASA)। इस पुनःप्रस्तुति में यह 12:02:36 UT पर सबसे निकट है, यानी JPL के प्लूटो-क्षण में 14 मिनट 7 सेकंड जोड़कर; Wikipedia में 12:02:22 है।",
  "clock": "यान अभी जो देख रहा है, वह पृथ्वी तक 4 घंटे 25 मिनट देर से पहुँचता है, और उत्तर को भी उतना ही समय वापस लगेगा: धरती से उसे कुछ भी निर्देशित नहीं किया जा सकता।",
  "home": "15 जुलाई को लगभग 00:53 UTC (14 तारीख को रात 8:53 बजे EDT) “phone home” संकेत आया: New Horizons उड़ान में बच गया था और ठीक था (Astronomy पत्रिका, NASA से)।",
  "pathFlyby": "यान का प्लूटो के सापेक्ष पथ, जैसा इस साइट की अपनी फ़ाइल में JPL Horizons का है; उसका रुख नाक-आगे बनाया गया है, और वह हमारा है",
  "srcTimetable": "14 जुलाई 2015 की मुठभेड़ की समय-सारणी, NASA से छपी, “Pluto's time to shine just hours away” (निकटतम दूरी, 30 800 mph, शैरन 14 मिनट बाद)",
  "srcHorizons": "JPL Horizons, यान -98 प्लूटो के सापेक्ष (पथ: दूरी-परिवर्तन की दर 11:48 और 11:49 UT के बीच चिह्न बदलती है), और इस साइट की उसकी फ़ाइल",
  "srcWiki": "New Horizons, Wikipedia (शैरन की निकटतम दूरी, 12:02:22 UTC)",
  "srcPhone": "“Phoning home from Pluto”, Astronomy पत्रिका (रात 8:53 बजे EDT का संकेत)"
};
Object.assign(COPY, {
  "deepCarina": {
    "card": {
      "carina": "इसका प्रकाश ESO के चित्र से लिया गया है, और इसका आकार Smith और अन्य (2000) तथा Smith और Brooks (2008) के अनुसार पुनर्निर्मित है: इसके तारा-समूहों द्वारा उड़ाई गई दो लोब वाली एक गुहा, Eta Carinae के पीछे इसकी चमकती दीवार, और सामने धूल की गहरी V-आकार की पट्टी। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।"
    },
    "rows": {
      "dso-carina-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। सबसे बड़े पैमाने पर यह नीहारिका लगभग 40 पारसेक चौड़ी दो लोब वाली एक गुहा है, जो आकाशगंगा के तल के लंबवत एक अक्ष के साथ है। चमक गुहा की दूर की दीवार पर बनाई गई है; प्रत्येक लोब कितनी गहरी है, यह नहीं मापा गया है।"
        ],
        [
          "इसके सामने",
          "गहरी V-आकार की पट्टी चमकती गैस के सामने की धूल और आणविक गैस है, जैसा देखा गया। यह सामने कितनी दूर है, यह नहीं मापा गया है: इसे तारा-समूहों से 20 प्रकाश-वर्ष आगे बनाया गया है।"
        ],
        [
          "इसके तारे",
          "Eta Carinae और इसके चौदह सबसे चमकीले गर्म तारे अपनी मापी गई स्थितियों पर; उनकी गहराई नहीं मापी गई है, इसलिए वे एक ही तल में हैं। तारा-समूह Trumpler 14 और 16 इसके तारों का एक बीजित नमूना हैं।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ]
    },
    "how": "पूरी नीहारिका के अवरक्त चित्र एक ही संरचना दिखाते हैं: एक बुलबुला, जिसकी दो लोब उसकी कमर पर स्थित तारा-समूहों द्वारा आकाशगंगा के तल से बाहर उड़ाई गई हैं (Smith और अन्य, 2000)। Eta Carinae इसके भीतर है: इसका प्रकाश Keyhole के आर-पार परावर्तित होता है, और इसके चारों ओर की धूल इसके पीछे की चमकती गैस को छिपाती है, पर सामने की गैस को नहीं।"
  },
  "deepSmc": {
    "card": {
      "smc": "यह मॉडल इसके चित्र और Gaia की इसके अपने तारों की गिनती से बना है, जिसमें हमारी दृष्टि-रेखा के साथ गहराई उसके स्पंदनशील Cepheid तारों और पुराने लाल दानवों से मापी गई है (Ripepi और अन्य, 2017; Scowcroft और अन्य, 2016; Tatton और अन्य, 2021)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।"
    },
    "rows": {
      "dso-smc": [
        [
          "गहराई में इसका आकार",
          "यह कोई समतल चकती नहीं है: इसके युवा तारे हमारी दृष्टि-रेखा के साथ 25 000 पारसेक से अधिक तक फैले हैं, जिसका उत्तर-पूर्वी सिरा हमारे सबसे निकट है, और इसके पुराने तारे लगभग 40° झुके एक तल के पास हैं। प्रवृत्तियों के रूप में मापा गया; प्रत्येक बनाए गए तारे की गहराई एक मॉडल है, कभी माप नहीं।"
        ],
        [
          "इसके आसपास",
          "मैगेलैनिक सेतु और धारा: बादलों से खींची गई हाइड्रोजन गैस, जिसे उसकी रेडियो चमक से मानचित्रित किया गया है (HI4PI)। कोई आँख या कैमरा इसे नहीं देखता, इसलिए इसे मंद और झूठे रंग में बनाया गया है। हमारी दृष्टि-रेखा के साथ यह कहाँ है, यह एक मॉडल है: केवल बादलों पर इसका सिरा स्थिर है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ]
    },
    "how": "खगोलशास्त्रियों ने इसके सैकड़ों Cepheid तारों की दूरी मापी है, ऐसे तारे जिनका स्पंदन बताता है कि वे कितने चमकीले हैं। वे 25 000 पारसेक से लंबी एक पट्टी में पंक्तिबद्ध हैं, जो लगभग हमारी ओर इंगित करती है, उत्तर-पूर्वी सिरा सबसे निकट: छोटा बादल बड़े बादल द्वारा खींचा जा रहा है (Ripepi और अन्य, 2017)।"
  },
  "moonCard": {
    "lead": "{name} {planet} का एक उपग्रह है",
    "leadBackwards": "{name} {planet} का एक उपग्रह है, जो उस दिशा के विपरीत परिक्रमा करता है जिस दिशा में {planet} घूमता है",
    "leadFar": "{name} {parent} का एक उपग्रह है",
    "leadFarKnown": "{name} {parent} का एक उपग्रह है, {year} में खोजा गया",
    "leadAsteroid": "{name} क्षुद्रग्रह {parent} का एक उपग्रह है",
    "leadAsteroidKnown": "{name} क्षुद्रग्रह {parent} का एक उपग्रह है, {year} में खोजा गया",
    "leadFarWorld": "{name} दूरस्थ पिंड {parent} का एक उपग्रह है",
    "across": "लगभग {n} km व्यास",
    "acrossAtMost": "{n} km से कम व्यास",
    "lap": "एक परिक्रमा में {n} लगते हैं",
    "lapDays": "{n} दिन",
    "lapYears": "{n} वर्ष",
    "lapHours": "{n} घंटे",
    "distance": "औसतन {planet} के केंद्र से {n} km",
    "found": "{year} में खोजा गया",
    "size": "इसका आकार नहीं मापा गया है",
    "clsIllustrative": "कक्षा JPL की एफ़िमेरिस से, उस पर स्थिति उदाहरण के रूप में",
    "rows": {
      "orbits": "परिक्रमा करता है",
      "lap": "एक परिक्रमा",
      "mean": "{planet} के केंद्र से औसत दूरी",
      "shape": "कक्षा का आकार",
      "across": "व्यास",
      "found": "खोज",
      "designation": "अस्थायी नाम",
      "place": "कक्षा पर इसकी स्थिति",
      "moonOf": "का उपग्रह",
      "separation": "अपने मूल पिंड से औसत दूरी",
      "reported": "रिपोर्ट करने वाला",
      "lapKnown": "रिपोर्ट के अनुसार एक परिक्रमा"
    },
    "values": {
      "km": "{n} km",
      "days": "{n} दिन",
      "years": "{n} वर्ष",
      "hours": "{n} घंटे",
      "shapeNear": "लगभग एक वृत्त (विकेंद्रता {e})",
      "shape": "एक दीर्घवृत्त (विकेंद्रता {e})",
      "shapeLong": "एक लंबा दीर्घवृत्त (विकेंद्रता {e})",
      "acrossMeasured": "{n} km",
      "acrossRange": "{lo} से {hi} km",
      "acrossAtMost": "{n} km से कम",
      "acrossNone": "नहीं मापा गया",
      "foundBy": "{year}, {by} द्वारा",
      "foundYear": "{year}",
      "placeGood": "{epoch} के दस और बाईस महीने बाद, अपने प्रकार के जाँचे गए {n} उपग्रहों में JPL की स्थिति से {deg}° के भीतर रखी गई",
      "placeLost": "ज्ञात नहीं: {epoch} के एक वर्ष के भीतर इसी प्रकार के उपग्रह JPL की स्थिति से {deg}° तक दूर थे",
      "placeUnchecked": "ज्ञात नहीं: JPL के पास अभी इसकी कोई स्थिति नहीं है",
      "sameAsParent": "इसके मूल पिंड पर बनाई गई: JPL के पास इसके चारों ओर कोई कक्षा नहीं है",
      "backwards": "ग्रह के घूर्णन के विपरीत",
      "forwards": "ग्रह के घूर्णन के अनुसार"
    },
    "orbitKnown": "कक्षा {epoch} के लिए JPL की है, उपग्रह एफ़िमेरिस से, और उपग्रह JPL के औसत आवर्तकाल से उस पर चलता है; इस प्रकार के उपग्रह (100 दिन या उससे अधिक की परिक्रमा, ऐसी कक्षा जिसे सूर्य बहुत कम मोड़ता है) {days} को JPL से मिलाए गए थे, उनमें से {n}, और उनमें से कोई भी JPL द्वारा बताई गई जगह से {deg}° से अधिक दूर नहीं था",
    "orbitKnownLost": "कक्षा {epoch} के लिए JPL की है, उपग्रह एफ़िमेरिस से, और वह वास्तविक है; JPL के औसत आवर्तकाल से चलाए जाने पर, इस प्रकार के उपग्रह (तेज़ परिक्रमा, या ऐसी कक्षा जिसे सूर्य ज़ोर से मोड़ता है) एक वर्ष के भीतर JPL द्वारा बताई गई जगह से {deg}° तक दूर थे, इसलिए यह उपग्रह कक्षा पर कहाँ है, यह हमें ज्ञात नहीं है, और उस पर का चिह्न उदाहरण के रूप में है",
    "orbitKnownUnchecked": "कक्षा {epoch} के लिए JPL की औसत कक्षा है, क्योंकि 1 जनवरी 2026 को JPL के पास इस उपग्रह की कोई स्थिति नहीं है; उपग्रह JPL के औसत आवर्तकाल से उस पर चलता है; कुछ भी जाँचा नहीं जा सका, इसलिए कक्षा पर उसकी स्थिति उदाहरण के रूप में है",
    "orbitFar": "कक्षा का आकार, रूप और परिक्रमा नीचे उल्लिखित शोधपत्र से हैं; उसका झुकाव और उस पर उपग्रह की स्थिति हमें ज्ञात नहीं है, इसलिए वृत्त क्रांतिवृत्त में सपाट बनाया गया है और उस पर का चिह्न उदाहरण के रूप में है",
    "orbitFarTilted": "कक्षा का आकार, रूप, परिक्रमा और झुकाव नीचे उल्लिखित शोधपत्र से हैं; उस पर उपग्रह कहाँ है, यह हमें ज्ञात नहीं है, इसलिए चिह्न उदाहरण के रूप में है",
    "orbitFull": "कक्षा और उस पर उपग्रह की स्थिति नीचे उल्लिखित शोधपत्र से है, जिसकी तिथि {epoch} है; घड़ी उस दिन से जितनी दूर होगी, स्थिति पर उतना कम भरोसा किया जा सकता है",
    "atParent": "JPL के पास {parent} के चारों ओर इसकी कोई कक्षा नहीं है: इसे {parent} की स्थिति पर बनाया गया है, और {parent} से इसकी दूरी नहीं बनाई गई है",
    "drawn": "अपनी कक्षा पर एक बिंदु के रूप में बनाया गया: किसी ने इसका आकार नहीं खींचा है, इसलिए कोई आकार नहीं बनाया गया",
    "drawnBig": "अपनी कक्षा पर एक बिंदु के रूप में बनाया गया: इसका आकार मापा गया है पर रूप नहीं, इसलिए कोई रूप नहीं बनाया गया",
    "candidate": "{name} नेप्च्यून से परे एक बड़ा पिंड है जो बौना ग्रह हो सकता है; IAU ने इस पर निर्णय नहीं लिया है",
    "candidateWhy": "आकार: {src}।",
    "sourceMoons": "NASA/JPL Solar System Dynamics, ग्रहीय उपग्रहों के औसत तत्व और खोज की परिस्थितियाँ (ssd.jpl.nasa.gov/sats), {read} को पढ़ी गईं; {epoch} की कक्षा JPL Horizons से",
    "sourceCompanion": "NASA/JPL Small-Body Database, {parent} के उपग्रह (ssd-api.jpl.nasa.gov/sbdb.api), {read} को पढ़ा गया",
    "sourceFar": "{ref}; {read} को {name} पर Wikipedia लेख (CC BY-SA 4.0) के माध्यम से पढ़ा गया",
    "sourceBody": "NASA/JPL Small-Body Database, {name} (कक्षा हल की गई {solution}), {read} को पढ़ा गया",
    "layerMoons": "बृहस्पति, शनि, यूरेनस, नेप्च्यून और प्लूटो के वे सभी उपग्रह जिनका मानचित्र में कोई रिकॉर्ड नहीं था, प्रत्येक 1 जनवरी 2026 को अपनी कक्षा पर।",
    "layerCompanions": "क्षुद्रग्रहों और दूरस्थ पिंडों के उपग्रह, जिनमें बौने ग्रहों के उपग्रह भी शामिल हैं, और नेप्च्यून से परे वे बड़े पिंड जो बौने ग्रह हो सकते हैं।"
  },
  "deepNebulae": {
    "card": {
      "m8": "इसकी चमक इसके चित्र (ESO) की है; इसका आकार पुनर्निर्मित है: इसके गहरे बादल के निकट मुख पर चमकती गैस, Herschel 36 के चारों ओर Hourglass, सामने की गहरी पट्टी, और उसके सामने का तारा-समूह NGC 6530 (Tothill और अन्य, 2008 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "m20": "इसकी चमक इसके चित्र (Rubin Observatory) की है; इसका आकार पुनर्निर्मित है: इसके O तारे के चारों ओर चमकती गैस का एक युवा बुलबुला, जो सामने तीन गहरी पट्टियों से कटा है, उस नीले प्रकाश में जो इसके तारे अपने आसपास की धूल से बिखेरते हैं (Lefloch और Cernicharo, 2000 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "m16": "इसकी चमक इसके चित्र (ESO) की है; इसका आकार पुनर्निर्मित है: तारा-समूह NGC 6611 द्वारा इसके बादल में उड़ाई गई गुहा, इसकी चमकती दूर की दीवार, और सामने खड़े सृष्टि के स्तंभ, जिनके सिरे तारा-समूह की ओर हैं (Hester और अन्य, 1996, तथा McLeod और अन्य, 2015 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "m17": "इसकी चमक इसके चित्र (ESO) की है; इसका आकार पुनर्निर्मित है: एक विशाल गहरे बादल के किनारे पर चमकती गैस, जिसकी चमकीली पट्टी लगभग किनारे से देखा गया एक मोर्चा है (Pellegrini और अन्य, 2007 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "rosette": "इसकी चमक इसके चित्र (NOIRLab) की है; इसका आकार पुनर्निर्मित है: चमकती गैस का एक मोटा वलय, उस गुहा के चारों ओर जिसे तारा-समूह NGC 2244 की हवाओं ने एक पतले, पत्ती-जैसे बादल में उड़ाया है (Wareing और अन्य, 2018 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "california": "इसकी चमक इसके चित्र (NOIRLab) की है; इसके गहराई में आकार का माप नहीं है: इसे Xi Persei द्वारा प्रकाशित हाइड्रोजन की एक लंबी, उथली चादर के रूप में बनाया गया है। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "north-america": "इसकी चमक इसके चित्र (NOIRLab) की है; इसका आकार पुनर्निर्मित है: Bajamar तारे के चारों ओर चमकती गैस का एक क्षेत्र, जिसे सामने का गहरा बादल LDN 935 North America और Pelican में बाँटता है (Kuhn और Hillenbrand, 2020 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।",
      "cats-paw": "इसकी चमक इसके चित्र (ESO) की है; इसका आकार पुनर्निर्मित है: लगभग 50 पारसेक लंबे एक गहरे तंतु के साथ उड़ाई गई चमकती गैस के बुलबुले, पंजे के गद्दे (Arzoumanian और अन्य, 2022 के अनुसार)। अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं।"
    },
    "rows": {
      "dso-m8": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। चमकती गैस इसके गहरे बादल के निकट मुख पर है, Hourglass के आसपास सबसे गहरी; गहराई नहीं मापी गई है।"
        ],
        [
          "इसके सामने",
          "गहरी पट्टी जो इसे नाम देती है और छोटे गहरे ग्लोब्यूल चमक के सामने की धूल हैं; सामने कितनी दूर है, यह नहीं मापा गया है। तारा-समूह NGC 6530 इसके तारों का एक बीजित नमूना है।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-m20": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। इसके O तारे के चारों ओर चमकती गैस का एक बुलबुला; इसकी चमक का कुछ भाग दूर की ओर और कुछ निकट की ओर बनाया गया है; दोनों गहराइयाँ नहीं मापी गई हैं। नीला प्रकाश इसके पीछे के बादल पर बनाया गया है।"
        ],
        [
          "इसके सामने",
          "तीन गहरी पट्टियाँ चमक के सामने देखी गई धूल हैं; सामने कितनी दूर है, यह नहीं मापा गया है।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-m16": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। चमक तारा-समूह के पीछे गुहा की दूर की दीवार पर बनाई गई है; गुहा कितनी गहरी है, यह नहीं मापा गया है।"
        ],
        [
          "स्तंभ",
          "धूल और गैस के स्तंभ जिनके सिरों को तारा-समूह का प्रकाश वाष्पित कर रहा है, जैसा देखा गया। इन्हें चमकती दीवार के सामने धूल के रूप में बनाया गया है; इनकी गहराई नहीं मापी गई है।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-m17": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। पश्चिम में एक विशाल गहरे बादल के किनारे पर चमकती गैस; इसकी चमकीली पट्टी वह जगह है जहाँ गैस बादल से मिलती है, लगभग किनारे से देखी गई, जैसा देखा गया। गहराई नहीं मापी गई है।"
        ],
        [
          "इसके तारे",
          "इसका तारा-समूह NGC 6618 अधिकतर धूल से छिपा है: इसके कुछ गर्म तारे उनकी मापी गई स्थितियों पर बनाए गए हैं, बाकी एक बीजित नमूना हैं।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-rosette-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। एक मोटा वलय उस गुहा के चारों ओर जिसे उसके तारा-समूह की हवाओं ने एक पतले, पत्ती-जैसे बादल में उड़ाया है; उसकी चमक का कुछ भाग वलय की दूर की सतह पर और कुछ निकट की सतह पर बनाया गया है। दोनों गहराइयाँ नहीं मापी गई हैं।"
        ],
        [
          "इसके तारे",
          "तारा-समूह NGC 2244 के गर्म तारे उनकी मापी गई स्थितियों पर, बाकी एक बीजित नमूना; उनकी गहराई नहीं मापी गई है।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-california-nebula": [
        [
          "गहराई में इसका आकार",
          "नहीं मापा गया। चमकते हाइड्रोजन की एक लंबी, उथली चादर के रूप में बनाया गया है जिसकी उभार उसकी चमक का अनुसरण करती है: उसकी गहराई का एक चित्रण, माप नहीं।"
        ],
        [
          "इसका तारा",
          "Xi Persei, वह गर्म तारा जो इसे चमकाता है, अपनी मापी गई स्थिति पर।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-north-america-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। North America और Pelican Bajamar तारे के चारों ओर चमकती गैस का एक ही क्षेत्र हैं; चमक उसकी दूर की ओर बनाई गई है, एक अमापी गहराई पर।"
        ],
        [
          "इसके सामने",
          "गहरा बादल LDN 935 चमक के सामने है और हमारे आकाश में उसे दो में बाँटता है; सामने कितनी दूर है, यह नहीं मापा गया है।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ],
      "dso-cats-paw-nebula": [
        [
          "गहराई में इसका आकार",
          "पुनर्निर्मित। हर गद्दी एक गहरे तंतु के साथ चमकती गैस का एक बुलबुला है; उनके आकार आकाश में मापे गए हैं, गहराई नहीं।"
        ],
        [
          "इसकी चमक",
          "मापी गई: इसके हर बिंदु की चमक इसके चित्र की है, तारे हटाकर (चमकीले तारे तारों के रूप में बनाए गए हैं)। हमारी ओर से मॉडल ठीक यही प्रकाश दिखाता है; घुमाने पर वही प्रकाश पुनर्निर्मित दीवारों पर पड़ता है।"
        ],
        [
          "समीक्षा",
          "यह मॉडल अभी किसी खगोलशास्त्री द्वारा समीक्षित नहीं हुआ है।"
        ]
      ]
    },
    "how": "एक चित्र यह दर्ज करता है कि नीहारिका के हर बिंदु से कितना प्रकाश आता है, पर यह नहीं कि वह हमारी दृष्टि-रेखा के साथ कितनी दूर है। ये मॉडल हर नीहारिका का प्रकाश रखते हैं और उसे ऐसी दीवारों पर फैलाते हैं जिनका आकार वही है जो खगोलशास्त्रियों ने मापा है: एक बुलबुला, एक गुहा, एक वलय या बुलबुले, उन सामने की धूल के साथ जो उन्होंने देखी।"
  },
  "confidence": {
    "title": "हम यह कैसे जानते हैं",
    "onlyMeasured": "केवल मापे गए",
    "onlyMeasuredTitle": "केवल वे बिंदु दिखाएँ जो किसी उपकरण ने ज्ञात समय पर देखे",
    "all": "सभी",
    "allTitle": "सभी बिंदु फिर से दिखाएँ",
    "status": "{m} में से {n} बिंदु दिखाए जा रहे हैं",
    "scope": "बिंदुओं को छानता है; तारा-क्षेत्र वैसा ही रहता है।",
    "railNote": "कुछ बिंदु छिपे हैं: हम यह कैसे जानते हैं"
  },
  "views": {
    "row": "आगमन दृश्य",
    "label": "इस स्थान के दृश्य",
    "curatedLabel": "सूची से",
    "savedLabel": "यहाँ सहेजे गए",
    "act": "{act}: {what}",
    "go": "जाएँ",
    "copy": "कॉपी करें",
    "remove": "हटाएँ",
    "save": "यह दृश्य सहेजें",
    "saveTitle": "कैमरा कहाँ खड़ा है, यह केवल इसी ब्राउज़र में रखता है",
    "saved": "दृश्य इस ब्राउज़र में सहेजा गया।",
    "savedPage": "इस पृष्ठ के बंद होने तक रखा जाएगा।",
    "full": "बारह दृश्य सहेजे गए हैं। पहले एक हटाएँ।",
    "copied": "इस दृश्य का लिंक कॉपी हो गया।",
    "copyRefused": "कॉपी नहीं हो सका। लिंक पता पट्टी में है।",
    "none": "अभी तक कुछ नहीं सहेजा गया।",
    "goTitle": "वहाँ उड़ें और वहीं खड़े हों जहाँ फ़्रेम था",
    "copyTitle": "एक लिंक जो यह दृश्य खोलता है",
    "removeTitle": "यह दृश्य भूल जाएँ",
    "pose": "{az}° घूर्णन, ध्रुव से {pol}°, {km} km",
    "away": "{km} km दूर",
    "curated": {
      "above": "तल के ऊपर से",
      "inPlane": "तल में"
    },
    "aboveTitle": "ग्रहों के तल के ऊपर से: सौरमंडल के उत्तरी पक्ष की ओर नीचे देखते हुए",
    "inPlaneTitle": "ग्रहों के तल में: उनकी कक्षाओं के स्तर पर, बगल से"
  },
  "presets": {
    "row": "फ़ोटो प्रीसेट",
    "label": "फ़ोटो प्रीसेट",
    "go": "खोलें",
    "science": "वैज्ञानिक फ़्रेम",
    "scienceNote": "मापा हुआ रूप, कैप्शन चालू",
    "cinematic": "सिनेमाई फ़्रेम",
    "cinematicNote": "चौड़ा, लंबा लेंस, गहरा शटर",
    "telescope": "दूरबीन दृश्य",
    "telescopeNote": "सबसे संकरा लेंस, वर्गाकार",
    "card": "वस्तु कार्ड",
    "cardNote": "पोर्ट्रेट, सहेजे गए चित्र पर टैग",
    "title": "{name}: {note}"
  }
});
// internal #442: end
// ds2: begin -- the words of the Homunculus Nebula and Cassiopeia A (copy/en.deepdata.js), machine-drafted
Object.assign(COPY, {
  "deepHomunculus": {
    "card": {
      "homunculus": "इसका आकार एक प्रकाशित त्रिआयामी मॉडल है, जो नेबुला के हर हिस्से की मापी गई गति से बना है (स्टेफ़ेन व अन्य, 2014) और स्मिथ (2006) के मापों से घुमाया व नापा गया है। इसकी चमक और धब्बेदारी उदाहरण-मात्र हैं। मॉडल: नासा का गोडार्ड स्पेस फ़्लाइट सेंटर/एड कैम्पियन व UNAM/डब्ल्यू. स्टेफ़ेन, ESO के माध्यम से। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-homunculus-nebula": [
        [
          "इसका आकार",
          "मापा गया। इसकी हाइड्रोजन गैस के डॉप्लर विस्थापन से बना त्रिआयामी मॉडल, जिसे ESO के वेरी लार्ज टेलीस्कोप से नेबुला की 92 पट्टियों में पढ़ा गया (स्टेफ़ेन व अन्य, 2014)। हर ध्रुव का गड्ढा, उसके चारों ओर की खाई और कमर के पास के दो उभार आँकड़ों में हैं।"
        ],
        [
          "इसका झुकाव और आकार",
          "मापे गए। दूर वाला पिंड उत्तर-पश्चिम की ओर है, हमारी दृष्टि-रेखा से 41° दूर; पास वाला उतना ही हमारी ओर है। 2005 में हर ध्रुव तारे से पृथ्वी–सूर्य दूरी का 21 690 गुना दूर था (स्मिथ, 2006)।"
        ],
        [
          "यह बढ़ता है",
          "1840 के दशक के विस्फोट के बाद से हर हिस्सा अपनी गति से सीधा बाहर उड़ा है, इसलिए इसका आकार घड़ी की तारीख़ के साथ चलता है। विस्फोट से पहले इसे नहीं बनाया जाता।"
        ],
        [
          "इसकी सतह",
          "उदाहरण-मात्र। चमक और धब्बेदारी उस धूल को दर्शाती हैं जिसे तारा भीतर से रोशन करता है; मॉडल में केवल आकार है। «मापा गया» रूप धब्बेदारी हटा देता है।"
        ],
        [
          "त्रिआयामी मॉडल",
          "नासा का गोडार्ड स्पेस फ़्लाइट सेंटर/एड कैम्पियन व UNAM/डब्ल्यू. स्टेफ़ेन, ESO के माध्यम से (CC BY 4.0)। कोई बिंदु हिलाया नहीं गया।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलविद ने समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "हमारी ओर आती गैस अपना प्रकाश नीले की ओर और दूर जाती गैस लाल की ओर खिसकाती है, और होमुंकुलस 1840 के दशक से एकसमान फैल रहा है, इसलिए हमारी दृष्टि-रेखा पर किसी बिंदु की गति यह भी बताती है कि वह तारे के आगे है या पीछे और कितना। खगोलविदों ने नेबुला की 92 पट्टियों में इसकी हाइड्रोजन की गति पढ़ी और उसी से इसका आकार बनाया (स्टेफ़ेन व अन्य, 2014)।"
  },
  "deepSn1987a": {
    "card": {
      "sn1987a": "छल्ले उन आकारों और झुकावों पर बनाए गए हैं जो खगोलविदों ने विस्फोट के प्रकाश-प्रतिध्वनियों और छल्लों की अपनी गति से मापे (Sugerman व अन्य, 2005; Panagia, 2003; Tziamtzis व अन्य, 2011)। उन्हें दिखाने वाले बिंदु और रंग केवल चित्रात्मक हैं। अभी किसी खगोलविद ने इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-sn-1987a": [
        [
          "भूमध्यरेखीय छल्ला",
          "मापा गया। त्रिज्या लगभग 0.8 आर्कसेकंड, जो 51.4 हज़ार पारसेक पर लगभग एक प्रकाश-वर्ष का दो-तिहाई है; सामने से देखने की स्थिति से 43° झुका हुआ, उसका उत्तरी किनारा हमारे सबसे पास (Panagia, 2003; Sugerman व अन्य, 2005)।"
        ],
        [
          "बाहरी छल्ले",
          "मापा गया। दो बड़े छल्ले, त्रिज्या लगभग 1.4 और 1.6 प्रकाश-वर्ष, तारे के तल के दोनों ओर एक-एक, लगभग 45° और 38° झुके हुए (Sugerman व अन्य, 2005; Tziamtzis व अन्य, 2011)। दक्षिणी ठीक-ठीक दीर्घवृत्त नहीं है।"
        ],
        [
          "कितनी दूर",
          "विस्फोट के बाद भीतरी छल्ले की चमक की देरी उसका असली आकार देती है; आकाश में उसका आकार फिर अधिनव तारे की दूरी देता है: 51.4 ± 1.2 हज़ार पारसेक (Panagia, 2003)।"
        ],
        [
          "नहीं बनाया गया",
          "छल्ले की चमकीली गाँठें, उसके भीतर का मलबा, दूर की बड़ी नीहारिकाएँ और छल्ले की धीमी वृद्धि (लगभग 10 किमी/सेकंड)।"
        ],
        [
          "बिंदु और रंग",
          "चित्रात्मक। हर छल्ला बिंदुओं के समतल दीर्घवृत्त के रूप में बनाया गया है; गर्म और हल्का नीला रंग केवल छल्लों को अलग करते हैं।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलविद ने समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "विस्फोट की चमक ने छल्लों को रोशन किया, और उसकी रोशनी छल्ले के दूर वाले हिस्से से पास वाले हिस्से की तुलना में देर से हम तक पहुँची। यह देरी छल्ले का असली आकार देती है, और आकाश में उसका आकार दूरी देता है। बाहरी छल्ले पास की गैस पर चमक की प्रतिध्वनियों से रखे गए हैं (Sugerman व अन्य, 2005)।"
  },
  "deepCasA": {
    "card": {
      "casa": "हर बिंदु वह जगह है जहाँ वह गैस मापी गई: हमारी ओर या दूर उसकी गति उसकी गहराई देती है (डीलेनी व अन्य, 2010)। रंग एक संकेत-सूची हैं, वह नहीं जो आँख देखती। मॉडल: NASA/CXC/MIT/टी. डीलेनी व अन्य। किसी खगोलविद ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-cassiopeia-a": [
        [
          "हरा",
          "लोहा, जिसे चंद्रा टेलीस्कोप ने एक्स-रे में देखा। मापे गए स्थान।"
        ],
        [
          "पीला",
          "आर्गन और सिलिकॉन, एक्स-रे और अवरक्त प्रकाश में देखे गए, साथ में दो जेट और बाहरी गुच्छे जो दृश्य प्रकाश में देखे गए। मापे गए स्थान।"
        ],
        [
          "लाल",
          "बीच में ठंडा सिलिकॉन, जिसे स्पिट्ज़र टेलीस्कोप ने अवरक्त प्रकाश में देखा: वह मलबा जिसे भीतर जाती आघात-तरंग ने अभी गर्म नहीं किया। मापे गए स्थान।"
        ],
        [
          "नीला खोल",
          "बाहरी आघात-तरंग, केंद्र से 153 चाप-सेकंड दूर। मॉडल की गई: असली तंतुओं की जगह मापे आकार का सादा गोला, जैसा चंद्रा के अपने मॉडल में है।"
        ],
        [
          "सफ़ेद बिंदु",
          "विस्फोट से बचा न्यूट्रॉन तारा। आकाश में इसकी जगह मापी गई है; गहराई नहीं।"
        ],
        [
          "इसकी गहराई कैसे पता है",
          "मलबा विस्फोट के बाद से एक बिंदु से सीधा उड़ा है, इसलिए हमारी ओर आती गैस उस बिंदु के आगे है और दूर जाती गैस पीछे: हर 1 000 किमी/सेकंड गहराई के 22 चाप-सेकंड है।"
        ],
        [
          "यह बढ़ता है",
          "घड़ी पर हर हिस्सा अपनी मापी दर से: मुक्त मलबा 0.3 % प्रति वर्ष, धीमी हुई एक्स-रे गैस 0.2 %, आघात-तरंग लगभग 4 900 किमी/सेकंड। 1671 से पहले इसे नहीं बनाया जाता।"
        ],
        [
          "चमक",
          "मॉडल में नहीं है। एक रंग का हर बिंदु बराबर चमकीला है, और उसका आकार आँकड़ों की तीक्ष्णता है, किसी गुच्छे का आकार नहीं।"
        ],
        [
          "त्रिआयामी मॉडल",
          "NASA/CXC/MIT/टी. डीलेनी व अन्य, चंद्रा एक्स-रे सेंटर की फ़ाइलों से। 24 219 बिंदुओं तक छाँटा गया।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलविद ने समीक्षा नहीं की है।"
        ]
      ]
    },
    "how": "हर रासायनिक तत्व अपने रंगों में चमकता है, और पास आती या दूर जाती गैस उन्हें खिसका देती है, इसलिए प्रकाश को बाँटने वाला दूरबीन पता लगा लेता है कि लोहे, सिलिकॉन या आर्गन का हर धब्बा हमारी दृष्टि-रेखा पर कितनी तेज़ चल रहा है। चूँकि सब कुछ लगभग 350 साल पहले एक बिंदु से निकला, यह गति उस बिंदु के आगे या पीछे की दूरी भी है: चंद्रा के एक्स-रे और स्पिट्ज़र के अवरक्त प्रकाश ने मिलकर फटे तारे का पहला त्रिआयामी नक़्शा दिया (डीलेनी व अन्य, 2010)।"
  }
});
// ds2: end
// ds3: begin -- the words of the Vela pulsar wind nebula and the Cat's Eye (copy/en.deepdata.js), machine-drafted
Object.assign(COPY, {
  "deepVela": {
    "card": {
      "vela": "एक्स-रे प्रकाश के दो छल्ले और एक जोड़ी जेट, चंद्रा की तस्वीर पर बैठाई गई ज्यामिति से बनाए गए (एनजी और रोमानी, 2004 और 2008)। जेट की लंबाई और धुरी का कौन-सा सिरा हमारे पास है, ये मॉडल हैं; रंग उदाहरण-मात्र है। अभी किसी खगोलविद ने समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-vela-pulsar-wind-nebula": [
        [
          "दो छल्ले",
          "मापे गए। चंद्रा की एक्स-रे तस्वीर पर बैठाए गए: हर छल्ले की त्रिज्या 21.25 चाप-सेकंड, घूर्णन-धुरी हमारी दृष्टि-रेखा से 63.6° झुकी और आकाश में स्थिति-कोण 130.6° पर, और छल्ले जैसे हमें दिखते हैं वैसे 11.61 चाप-सेकंड दूर (एनजी और रोमानी, 2004, 2008)।"
        ],
        [
          "एक ओर अधिक चमक क्यों",
          "मापा गया। हर छल्ले के साथ प्रवाह प्रकाश की गति के 0.44 से चलता है, जिससे कैमरे की ओर आता पक्ष चमकता है; दृश्य घुमाने पर पैटर्न बदलता है।"
        ],
        [
          "जेट",
          "इनकी गति मापी गई है (प्रकाश की गति का 0.45)। लंबाई और चमक मॉडल हैं: असली जेट मुड़ता है और साल-दर-साल बदलता है।"
        ],
        [
          "कौन-सा सिरा पास है",
          "मॉडल। शोध-पत्र नहीं बताते कि धुरी का कौन-सा सिरा हमारी ओर है।"
        ],
        [
          "रंग",
          "उदाहरण-मात्र। एक्स-रे ऐसा प्रकाश नहीं जिसे आँख देखे; इन्हें बैंगनी-नीले में बनाया गया है।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलविद ने समीक्षा नहीं की है।"
        ]
      ]
    }
  },
  "deepCatsEye": {
    "card": {
      "catseye": "इसके हिस्से, कोण और गतियाँ एक प्रकाशित 3D मॉडल से हैं (क्लेयरमॉन्ट, स्टेफ़न और कोनिंग, 2022); आकार हबल की तस्वीर से पढ़े गए हैं। रंग उदाहरण-मात्र हैं। अभी किसी खगोलविद ने समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-cats-eye-nebula": [
        [
          "इसके हिस्से",
          "मापे गए। दो गोल पालियों वाले बाहरी खोल के भीतर अंडाकार भीतरी खोल, कमर पर एक छल्ला, धुरी पर दो गुच्छे और दो जेट: हबल की तस्वीर और गैस की गति के पाँच नक्शों पर बैठाया गया मॉडल (क्लेयरमॉन्ट व अन्य, 2022)।"
        ],
        [
          "दो अधूरे छल्ले",
          "मापे गए। हर एक धुरी से 38° पर, 17° झुके शंकु का आधार है, जो अपने घेरे के 300° पर खुला है: उस जेट का निशान जो डगमगाता रहा और कभी पूरा चक्कर न लगा सका। हर दरार कहाँ है, यह मॉडल है।"
        ],
        [
          "गतियाँ",
          "मापी गईं। सब कुछ सीधा बाहर की ओर चलता है: बाहरी खोल 25 से 33.5 किमी/से, कमर का छल्ला 24, गुच्छे 44, जेट 72। मॉडल की आयु 2,136 वर्ष है, 4,272 प्रकाश-वर्ष की दूरी पर (गाया)।"
        ],
        [
          "आकार और धुरी",
          "स्पेस रडार ने हबल की तस्वीर से पढ़े, लगभग दसवें हिस्से की सटीकता से: शोध-पत्र अपना मॉडल चित्रों में दिखाता है, तालिका में नहीं।"
        ],
        [
          "झुकाव",
          "मॉडल। शोध-पत्र केवल कहता है कि धुरी थोड़ी झुकी है; इसे हमारी दृष्टि-रेखा से 80° पर बनाया गया है, उत्तरी सिरा हमारी ओर।"
        ],
        [
          "रंग",
          "उदाहरण-मात्र। हबल के नकली रंग, जो मॉडल में नहीं हैं। ‘मापा गया’ रूप इन्हें धूसर दिखाता है।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलविद ने समीक्षा नहीं की है।"
        ]
      ]
    }
  },
  "deepV838": {
    "card": {
      "v838": "तारे के 2002 के विस्फोट की रोशनी, जो उसके आसपास की धूल से बिखरी और प्रकाश-प्रतिध्वनि पर शोध-पत्रों के बताए तल पर खींची गई है (Sparks व अन्य, 2008; Bond व अन्य, 2003)। धूल मॉडल से बनी है; रंग चित्रात्मक हैं। किसी खगोलशास्त्री ने अभी इसकी समीक्षा नहीं की है।"
    },
    "rows": {
      "dso-v838-monocerotis": [
        [
          "प्रतिध्वनि",
          "भौतिकी। जो धूल अभी रोशन है वह तारे के चारों ओर एक परवलयज पर है: तारे से उसकी दूरी में से दृष्टि-रेखा पर हमारी ओर उसकी दूरी घटाने पर प्रकाश की गति गुणा विस्फोट की रोशनी के हम तक पहुँचने के बाद बीता समय मिलता है (Sparks व अन्य, 2008)। छल्ले प्रकाश से तेज़ बढ़ते दिखते हैं क्योंकि यही तल चलता है, धूल नहीं (Bond व अन्य, 2003)।"
        ],
        [
          "समय",
          "मापा गया। विस्फोट जनवरी 2002 की शुरुआत में शुरू हुआ; गिनती उसकी औसत तारीख 9 मार्च 2002 से होती है, और प्रकाश-वक्र उससे 36 दिन पहले से 61 दिन बाद तक चला (Sparks व अन्य, 2008)। घड़ी पर प्रतिध्वनि तभी से बढ़ती है; उससे पहले कोई नहीं, और 2008 के मध्य के बाद वह ठहरी रहती है, क्योंकि मॉडल की धूल वहीं खत्म हो जाती है।"
        ],
        [
          "दूरी",
          "मापी गई। 6.1 ± 0.6 किलोपारसेक, लगभग 19,900 प्रकाश-वर्ष, प्रतिध्वनि से बने ध्रुवीकृत प्रकाश के छल्ले से (Sparks व अन्य, 2008)। मुख्य संदेह व्यवस्थित है।"
        ],
        [
          "धूल",
          "मॉडल से। शोध-पत्र कहते हैं कि धूल गुच्छेदार है और उसके किसी भी हिस्से की गहराई नहीं देते। इसे 0.15 पारसेक चौड़े खाली बीच (मापा गया) के चारों ओर गुच्छों के सात खोलों के रूप में खींचा गया है, 2 पारसेक तक, जो देखी गई सबसे दूर की धूल है (Bond व अन्य, 2003)। छल्ला कहाँ और कितना चमकता है, यह मॉडल से है; इस आकार का छल्ला इस तारीख को चमके, यह भौतिकी है।"
        ],
        [
          "रंग और चमक",
          "चित्रात्मक। शुरुआती रोशनी बाद वाली से ज़्यादा नीली थी (Sparks व अन्य, 2008); यहाँ नीले से लाल, और चमक एक सादी खिड़की है।"
        ],
        [
          "हबल के चित्र",
          "साथ नहीं भेजे गए: वे ESA/Hubble पर हैं, heic0304a (NASA, ESA और H. E. Bond (STScI), मार्च 2003) और heic0503a (NASA, ESA और हबल हेरिटेज टीम (AURA/STScI), फ़रवरी 2005), CC BY 4.0।"
        ],
        [
          "समीक्षा",
          "इस चित्र की अभी किसी खगोलशास्त्री ने समीक्षा नहीं की है।"
        ]
      ]
    }
  }
});
// ds3: end
// A constellation seen from the side (ui/figureside.js, copy/en.side.js): begin
COPY.figureSide = {
  "open": "इसे बगल से देखें",
  "openTitle": "सूर्य को छोड़ें और {name} को बगल से देखें",
  "searchRow": "{name}, बगल से",
  "searchSub": "सूर्य को छोड़ें और आकृति को बिखरते देखें",
  "title": "{name}, बगल से",
  "loading": "तारों की दूरियाँ लाई जा रही हैं…",
  "lede": "सूर्य से देखने पर ये तारे एक आकृति बनाते हैं। हर तारा अपनी अलग दूरी पर है, इसलिए बगल से आकृति बिखर जाती है।",
  "angle": "बगल की ओर कितना घूमें",
  "where": "बगल की ओर {deg}°, सूर्य से {ly} प्रकाश-वर्ष",
  "home": "सूर्य पर: आकृति जैसी हमें दिखती है",
  "range": "इसके तारे {near} से {far} प्रकाश-वर्ष दूर हैं।",
  "play": "उड़ चलें",
  "playTitle": "सूर्य को छोड़ें और बीस सेकंड में बगल तक घूमें",
  "pause": "रोकें",
  "jump": "बगल में जाएँ",
  "back": "सूर्य पर लौटें",
  "another": "दूसरी आकृति",
  "honest": "मापा हुआ: हर तारा कहाँ है, उसके लंबन से (हिप्पार्कोस और गाइया, HYG सूची); सबसे दूर के तारे सबसे कम पक्के हैं। परंपरा: उनके बीच की रेखाएँ।",
  "unplaced": "इसके {n} कोनों पर मापी हुई दूरी वाला कोई तारा नहीं है: वे आकृति की बीच की दूरी पर बनाए गए हैं।",
  "close": "बगल का दृश्य बंद करें",
  "unknown": "इस नाम की कोई तारा-आकृति यहाँ नहीं बनाई गई है।",
  "inTrip": "आकृति को बगल से देखने के लिए पहले यात्रा से बाहर आएँ।",
  "failed": "तारों की दूरियाँ नहीं आ सकीं। थोड़ी देर में फिर कोशिश करें।",
  "names": {
    "bigDipper": "सप्तर्षि"
  },
  "notes": {
    "bigDipper": "इसके सात में से पाँच तारे सचमुच साथ चलते हैं, लगभग 80 प्रकाश-वर्ष दूर। दोनों सिरों के तारे, दुभे और अलकैड, नहीं।"
  }
};
// A constellation seen from the side: end

// research train (ops): begin -- machine-translated, agent-reviewed 2026-11-24 (not native-reviewed): forge #558, #561, #562, #563.
// The live operations view (copy/en.ops.js), and the two kinds an Earth event card gains (copy/en.facts.js, en.later.js).
COPY.ops = {
  "label": "लाइव संचालन",
  "tabs": {
    "state": "आँकड़े",
    "reentry": "नज़दीकी",
    "dsn": "DSN",
    "events": "पृथ्वी"
  },
  "titles": {
    "state": "अंतरिक्ष का हाल",
    "reentry": "वापसी और बाल-बाल बचे",
    "dsn": "कौन किससे बात कर रहा है",
    "events": "पृथ्वी की घटनाएँ"
  },
  "loading": "हमारी प्रति पढ़ी जा रही है…",
  "couldNot": "देख नहीं सके: इसकी हमारी प्रति अभी नहीं है।",
  "retry": "फिर से कोशिश करें",
  "asOf": "{date} तक",
  "read": "{ago} पढ़ा",
  "source": "स्रोत: {source}",
  "flyTo": "वहाँ उड़ें",
  "openCard": "इसका कार्ड खोलें",
  "entry": {
    "title": "लाइव",
    "state": "अंतरिक्ष का हाल",
    "reentry": "वापसी और बाल-बाल बचे",
    "dsn": "अभी डीप स्पेस नेटवर्क",
    "events": "आग, तूफ़ान, ज्वालामुखी, बाढ़"
  },
  "state": {
    "lead": "ऊपर क्या है, सार्वजनिक सूचियों से गिना हुआ।",
    "live": "लाइव",
    "frozen": "स्थिर किया गया {quarter}",
    "quarter": "{year} की {n}वीं तिमाही",
    "heroLabel": "तीन आँकड़े",
    "labels": {
      "earth_orbit": "पृथ्वी की कक्षा में वस्तुएँ",
      "payloads": "पृथ्वी की कक्षा में उपग्रह",
      "working_payloads": "अब भी काम कर रहे उपग्रह",
      "rocket_bodies": "इस्तेमाल हो चुके रॉकेट चरण",
      "debris": "निगरानी में मलबे के टुकड़े",
      "starlink": "कक्षा में स्टारलिंक उपग्रह",
      "owners": "उपग्रह वाले देश और समूह",
      "launches_year": "{year} में कक्षा तक प्रक्षेपण",
      "beyond_earth": "पृथ्वी की कक्षा से आगे के यान",
      "beyond_working": "इनमें से अब भी काम कर रहे",
      "came_down_30d": "पिछले 30 दिनों में गिरे",
      "people": "अंतरिक्ष स्टेशनों पर लोग",
      "dsn_now": "अभी DSN से बात कर रहे यान"
    },
    "short": {
      "earth_orbit": "पृथ्वी की कक्षा में वस्तुएँ",
      "people": "स्टेशनों पर लोग",
      "launches_year": "{year} में कक्षा तक प्रक्षेपण"
    },
    "ownersHead": "मालिक के हिसाब से उपग्रह",
    "ownersOther": "बाकी सब",
    "sparkHead": "2016 से, हर तिमाही एक बिंदु",
    "sparkPayloads": "कक्षा में उपग्रह",
    "sparkDebris": "निगरानी में मलबा",
    "sparkLaunches": "हर तिमाही प्रक्षेपण",
    "howLive": "{date} को पढ़ी गई CelesTrak की सूची से गिना गया।",
    "howBack": "आज की सूची से {date} तक पीछे गिना गया।",
    "peopleSource": "Launch Library 2, The Space Devs",
    "dsnSource": "NASA का DSN Now",
    "cite": "उद्धृत करें",
    "citeText": "Space Radar, “अंतरिक्ष का हाल”, {quarter}, {frozen} को स्थिर, spaceradar.ai/state-of-space/ (डेटा: CelesTrak SATCAT)।",
    "copied": "कॉपी हो गया",
    "pageLink": "हर तिमाही वाला पेज",
    "owners": {
      "US": "संयुक्त राज्य अमेरिका",
      "PRC": "चीन",
      "CIS": "रूस और पूर्व सोवियत संघ",
      "UK": "यूनाइटेड किंगडम",
      "JPN": "जापान",
      TBD: "मालिक अभी पता नहीं",
      "FR": "फ़्रांस",
      "IND": "भारत",
      "IT": "इटली",
      "GER": "जर्मनी",
      "ITSO": "इंटेलसैट",
      "ESA": "यूरोपीय अंतरिक्ष एजेंसी",
      "CA": "कनाडा",
      "SKOR": "दक्षिण कोरिया"
    },
    "note": "प्रक्षेपण तब गिना जाता है जब वह कक्षा तक पहुँचा हो। काम कर रहा का मतलब है CelesTrak उसे काम करता बताता है।"
  },
  "reentry": {
    "recentHead": "पिछले 30 दिनों में गिरे",
    "recentNone": "पिछले 30 दिनों में सूची से कुछ नहीं गिरा।",
    "recentRow": "{kind}, {owner} · {date} को गिरा",
    "lowestHead": "अभी सबसे नीचे",
    "lowestLead": "{km} किमी से नीचे की {total} पूरी कक्षाओं में सबसे नीची {n}: अगली गिरने वाली।",
    "lowestRow": "{peri} से {apo} किमी",
    "noPrediction": "कोई तारीख़ नहीं: सूची बताती है कितना नीचे, कब नहीं। Space-Track की समय-सीमाओं के लिए खाता चाहिए।",
    "closeHead": "इस हफ़्ते की सबसे नज़दीकी मुलाकातें",
    "closeLead": "CelesTrak के अनुमान, सबसे ज़्यादा संभावना पहले। हम ख़ुद कुछ नहीं गिनते।",
    "closeRow": "{range} मी दूर · {speed} किमी/से",
    "closeWhen": "{date} UTC",
    "closeChance": "{n} में 1",
    "closeChanceHigh": "10 में 1 से ज़्यादा",
    "closeNote": "CelesTrak की संभावना मानती है कि कोई रास्ता नहीं बदलता। काम कर रहे ज़्यादातर जोड़े स्टारलिंक हैं जो हट सकते हैं।",
    "filters": {
      "all": "सभी",
      "debris": "मलबे के साथ",
      "rocket": "रॉकेट चरण के साथ",
      "working": "दोनों चालू"
    },
    "filterLabel": "नज़दीकी मुलाकातें दिखाएँ",
    "closeNone": "CelesTrak की सूची में इस तरह का कोई नहीं।",
    "closeCouldNot": "देख नहीं सके: CelesTrak की सूची की हमारी प्रति अभी नहीं है।",
    "kinds": {
      "payload": "उपग्रह",
      "rocket_body": "रॉकेट चरण",
      "debris": "मलबा",
      "unknown": "अज्ञात"
    },
    "momentHead": "2009: दो उपग्रहों की पहली टक्कर",
    "moment": "इरिडियम 33 और कोस्मोस 2251 देखें",
    "momentHint": "एक पल: टक्कर, और सालों में फैलते दो बादल",
    "sources": "सूची: CelesTrak SATCAT, {date} को पढ़ी गई। नज़दीकी मुलाकातें: CelesTrak SOCRATES Plus, {close} को पढ़ी गई।"
  },
  "dsn": {
    "lead": "कौन-सा एंटीना किस यान से बात कर रहा है, NASA के DSN Now से।",
    "lines": "नक्शे पर रेखाएँ",
    "linesTitle": "हर एंटीने से उस यान तक रेखा खींचें जिसे वह सुन रहा है",
    "linesNote": "रेखा सिर्फ़ उसी यान तक जो नक्शे पर दिखता है; इसके लिए यान और दूरबीनें चालू करें।",
    "none": "अभी कोई यान संपर्क में नहीं है।",
    "stale": "डेटा {ago} पुराना है: ये संपर्क ख़त्म हो चुके हो सकते हैं।",
    "row": "{dishes} · {dir}",
    "both": "दोनों तरफ़",
    "down": "पृथ्वी को भेज रहा",
    "up": "पृथ्वी को सुन रहा",
    "light": "एक तरफ़ {t}",
    "lightS": "{n} सेकंड",
    "lightMin": "{m} मिनट {s} सेकंड",
    "lightH": "{h} घंटे {m} मिनट",
    "notDrawn": "इस नक्शे पर नहीं",
    "sites": {
      "gdscc": "गोल्डस्टोन",
      "mdscc": "मैड्रिड",
      "cdscc": "कैनबरा"
    },
    "sources": "NASA डीप स्पेस नेटवर्क, DSN Now, {ago} पढ़ा। एक अनौपचारिक फ़ीड, जिसकी अपनी कोई शर्तें नहीं।"
  },
  "events": {
    "lead": "NASA जिन खुली घटनाओं पर नज़र रखता है, उनकी आख़िरी बताई जगह के साथ।",
    "filterLabel": "घटनाएँ दिखाएँ",
    "kinds": {
      "all": "सभी",
      "wildfire": "आग",
      "storm": "तूफ़ान",
      "volcano": "ज्वालामुखी",
      "flood": "बाढ़"
    },
    "kindOne": {
      "wildfire": "आग",
      "storm": "तूफ़ान",
      "volcano": "ज्वालामुखी",
      "flood": "बाढ़"
    },
    "row": "{kind} · {date}",
    "none": "NASA की सूची में इस तरह की कोई खुली घटना नहीं।",
    "map": "{map} के नक्शे के साथ",
    "noMap": "इसका रोज़ का नक्शा यहाँ नहीं है",
    "mapOff": "नक्शा हटाएँ",
    "disclaimer": "NASA का EONET: देखने के लिए, जगह या समय का आधिकारिक रिकॉर्ड नहीं।",
    "sources": "NASA EONET, {ago} पढ़ा। नक्शे: NASA GIBS।"
  }
};
COPY.earthEvent.kinds.storm = "तेज़ तूफ़ान";
COPY.earthEvent.kinds.flood = "बाढ़";
COPY.templates.earthevent.lead.storm = "{name} एक तेज़ तूफ़ान है जिसका केंद्र आख़िरी सूचना, {date}, के समय यहाँ था";
COPY.templates.earthevent.lead.flood = "{name} यहाँ बताई गई बाढ़ है, आख़िरी बार {date} को";
// research train (ops): end
// The platform bridge (copy/en.js favs, copy/en.later.js account): begin -- machine-drafted, agent-read, not native-reviewed
COPY.favs = {"add": "अपने पसंदीदा में जोड़ें", "remove": "आपके पसंदीदा में है। हटाने के लिए दबाएँ", "addTrip": "{name} को अपने पसंदीदा में जोड़ें", "removeTrip": "{name} आपके पसंदीदा में है। हटाने के लिए दबाएँ"};
COPY.account = {"signIn": "साइन इन करें", "open": "आपका खाता", "openNamed": "आपका खाता, {name}"};
// The platform bridge: end

// research train (live): begin -- machine-translated, agent-reviewed 2026-11-24 (not native-reviewed): forge #544, #546, #547, #548.
// A catalogue's day in Coming up (copy/en.js nextList), and the four sections of copy/en.live.js.
COPY.nextList.dataRelease = "{name} {date} को सार्वजनिक होगा: वही दिन जो एजेंसी बताती है, कोई समय नहीं";
COPY.nextList.classOf.dataRelease = "एजेंसी का बताया दिन; वह कोई समय प्रकाशित नहीं करती";
COPY.nextList.row.dataReleaseTitle = "{name} सार्वजनिक होगा";
COPY.nextList.row.dataRelease = "{date} · एजेंसी का दिन";
COPY.releaseDay = {
  "chipDays": "{name} · {n} दिन में",
  "chipTomorrow": "{name} · कल",
  "chipToday": "{name} · आज",
  "chipOut": "{name} · जारी",
  "chipLabel": "{name} {date} को सार्वजनिक होगा। {object} का कार्ड खोलता है",
  "section": "{name}, {date}",
  "inDays": "{n} दिन में, {date} को जारी होगा, वही दिन जो एजेंसी बताती है। कोई समय नहीं बताया गया है।",
  "tomorrow": "कल, {date} को जारी होगा, वही दिन जो एजेंसी बताती है। कोई समय नहीं बताया गया है।",
  "today": "आज, {date} को जारी हो रहा है। एजेंसी कोई समय नहीं बताती।",
  "out": "{date} से जारी है।",
  "hintDays": "{n} दिन में",
  "hintTomorrow": "कल",
  "hintToday": "आज",
  "hintOut": "जारी",
  "sources": "तारीख़ और सामग्री: {publisher}, {date} को पढ़ा गया।",
  "sourceLink": "एजेंसी का पन्ना",
  "journal": "इसके बारे में जर्नल में पढ़ें",
  "dates": {
    "gaia-dr4": {
      "what": "Gaia DR4, ESA का चौथा Gaia कैटलॉग है: जुलाई 2014 से जनवरी 2020 तक, 66 महीनों के माप, लगभग 2.8 अरब तारों और दूसरे स्रोतों के। इसके 400 टेराबाइट में से ज़्यादातर वे अलग-अलग माप हैं जिनसे औसत निकाले गए हैं।",
      "stars": "उस दिन इस नक्शे पर कुछ नहीं बदलेगा। इसके 3D वाले 2.5 मिलियन तारे HYG और AT-HYG कैटलॉग से आते हैं, जिनकी दूरियाँ ज़्यादातर Gaia DR3 से हैं, जो इससे पहले वाला रिलीज़ है।",
      "after": "उस दिन के बाद हम नया डेटा और उसकी शर्तें पढ़ेंगे, फिर तय करेंगे कि क्या ताज़ा करना है, पहले तारों की दूरियाँ और उनकी चाल। जब तक यह हो न जाए और यहाँ बताया न जाए, तारे जैसे हैं वैसे ही रहेंगे।",
      "where": "Gaia को मार्च 2025 में बंद कर दिया गया और L2 से हटाकर सूर्य के चारों ओर उसकी अपनी कक्षा में भेज दिया गया। यह कार्ड दिखाता है कि वह अब कहाँ है।",
      "publisher": "ESA"
    }
  }
};
COPY.spacePanel = {
  "section": "अंतरिक्ष मौसम",
  "hintKp": "Kp {kp}",
  "hintNone": "NOAA का Kp सूचकांक",
  "measuredHead": "मापा हुआ",
  "forecastHead": "पूर्वानुमान, अगले तीन दिन",
  "day": "{day}",
  "dayValue": "Kp {kp} तक",
  "dayWords": "{word}",
  "noForecast": "NOAA की फ़ाइल में आने वाले दिनों का कोई पूर्वानुमान नहीं है।",
  "kindNote": "मापा हुआ, पिछले तीन-तीन घंटे के खानों का NOAA का माप है; आने वाले दिन उसका पूर्वानुमान हैं, तीन-तीन घंटे करके बनाया गया, और वे बदल सकते हैं।",
  "stormHead": "तूफ़ान क्या करता है",
  "storm": {
    "satellites": "उपग्रह: G2 से निचली कक्षाओं पर खिंचाव बदल जाता है और उनके अनुमानित रास्ते खिसकने लगते हैं; G3 से निचले उपग्रह तेज़ी से नीचे आते हैं।",
    "navigation": "नेविगेशन: G3 से उपग्रह नेविगेशन कभी-कभी काम करना बंद कर सकता है; G4 और G5 पर यह घंटों, यहाँ तक कि दिनों तक कमज़ोर रहता है।",
    "radio": "रेडियो: G2 से ध्रुवों के पास शॉर्टवेव कमज़ोर पड़ जाती है, और G5 पर एक-दो दिन के लिए गायब हो सकती है।",
    "aurora": "ध्रुवीय रोशनी: G1 तूफ़ान में यह बहुत उत्तर और बहुत दक्षिण में दिखती है; हर अगला स्तर इसे भूमध्य रेखा की ओर लगभग 5 डिग्री चुंबकीय अक्षांश पास ले आता है, G5 पर लगभग 40 तक।"
  },
  "aurora": "ग्लोब पर ध्रुवीय रोशनी दिखाएँ",
  "auroraTitle": "ध्रुवीय रोशनी की परत: अगले 30 से 90 मिनट का NOAA का पूर्वानुमान",
  "sources": "Kp: NOAA SWPC, सार्वजनिक संपत्ति। तूफ़ान क्या करता है: NOAA के अंतरिक्ष मौसम पैमाने, {date} को पढ़े गए।",
  "scalesLink": "NOAA के पैमाने",
  "none": "NOAA का अंतरिक्ष मौसम अभी पढ़ा नहीं जा सका।"
};
COPY.issCam = {
  "section": "लाइव कैमरा",
  "hint": "NASA की स्ट्रीम",
  "lead": "NASA स्टेशन पर लगे कैमरों का नज़ारा स्ट्रीम करता है। यह YouTube से तभी लोड होता है जब आप कहें।",
  "watch": "स्टेशन से लाइव देखें",
  "watchTitle": "नक्शे के बगल में NASA का लाइव वीडियो खोलता है; यह YouTube से जुड़ता है",
  "privacy": "दबाते ही यह YouTube से उसके बेहतर निजता वाले मोड में जुड़ता है; उसके बाद YouTube की अपनी शर्तें और निजता नीति लागू होती हैं।",
  "dark": "तस्वीर अक्सर काली, नीली या टेस्ट कार्ड होती है: स्टेशन ज़्यादातर चक्करों का एक-तिहाई से ज़्यादा हिस्सा पृथ्वी की छाया में बिताता है, और ज़मीन से संपर्क टूटने पर फ़ीड बंद हो जाती है।",
  "sunlit": "अभी स्टेशन धूप में है: अगर फ़ीड चालू है, तो यह दिन वाला हिस्सा दिखा सकती है।",
  "shadow": "अभी स्टेशन पृथ्वी की छाया में है: अँधेरी तस्वीर की उम्मीद करें, ज़्यादा से ज़्यादा शहरों की रोशनियाँ।",
  "title": "स्टेशन से लाइव",
  "close": "लाइव कैमरा बंद करें",
  "frameTitle": "अंतर्राष्ट्रीय अंतरिक्ष स्टेशन से NASA का लाइव वीडियो, YouTube पर",
  "loading": "YouTube से NASA की स्ट्रीम माँगी जा रही है…",
  "credit": "वीडियो: NASA, YouTube पर। बगल का ग्लोब हमारा नक्शा है, कैमरा नहीं।",
  "onYoutube": "YouTube पर खोलें",
  "nasaLive": "NASA Live",
  "checked": "स्ट्रीम का लिंक {date} को जाँचा गया।"
};
COPY.dayCard = {
  "thisDayKicker": "आज ही के दिन · {year}",
  "nearKicker": "{date} {year}",
  "thisDayTitle": "{mission}: {event}",
  "earthKicker": "आज की पृथ्वी",
  "earthTitleNorth": "सूर्य {deg}° उत्तर पर ठीक सिर के ऊपर है",
  "earthTitleSouth": "सूर्य {deg}° दक्षिण पर ठीक सिर के ऊपर है",
  "earthLine": "{season} में {n} दिन बाकी हैं।",
  "earthLineOne": "{season} कल है।",
  "earthLineToday": "{season} आज है।",
  "skyKicker": "आज का आसमान",
  "skyTitle": "चंद्रमा {phase}, {pct}% रोशन",
  "skyMorning": "भोर से पहले: {list}।",
  "skyEvening": "शाम ढलने के बाद: {list}।",
  "skyNoPlanets": "कोई भी चमकीला ग्रह सूर्य की चौंध से बाहर नहीं है।",
  "share": "आज का कार्ड साझा करें",
  "shareTitle": "आज का कार्ड साझा करें: लिंक, शब्द और एक तस्वीर",
  "shareName": "आज अंतरिक्ष में, {date}",
  "sources": "स्रोत: {list}।",
  "sourceMission": "{name}",
  "sourceSky": "सूर्य, चंद्रमा और ग्रह, यहीं गणना करके निकाले गए (Astronomy Engine)"
};
// research train (live): end
// A card's Pictures and news (ui/cardmedia.js, copy/en.media.js; forge internal #556), machine-drafted: begin
COPY.media = {
  "pictures": "फ़ोटो",
  "journal": "जर्नल से",
  "reads": "लंबे लेख",
  "pages": "आधिकारिक पेज",
  "archives": "अभिलेखागार में खोजें",
  "credit": "{credit}, {licence}",
  "photoAlt": "{name}, फ़ोटो: {by}",
  "photoAltPlain": "{name} की एक फ़ोटो",
  "photoOpen": "{site} पर यह तस्वीर",
  "own": "हमारी अपनी तस्वीर",
  "posted": "{date} को प्रकाशित",
  "readOnTitle": "तस्वीरों के साथ लंबा लेख, इसी साइट पर",
  "onJournal": "जर्नल पर",
  "pageTitle": "{name}: अंतरिक्ष एजेंसी का अपना पेज, नए टैब में",
  "nasa": "NASA की तस्वीर और वीडियो लाइब्रेरी",
  "nasaTitle": "{name} की NASA तस्वीरें, फ़िल्में और आवाज़ें, नए टैब में",
  "esahubble": "ESA/Hubble की तस्वीरें",
  "esahubbleTitle": "{name} की ESA/Hubble तस्वीरें, नए टैब में",
  "esawebb": "ESA/Webb की तस्वीरें",
  "esawebbTitle": "{name} की ESA/Webb तस्वीरें, नए टैब में",
  "archivesNote": "ये लिंक हर अभिलेखागार की अपनी खोज इस नाम से खोलते हैं; उनकी शर्तें उनके पेजों पर हैं, और हम यहाँ उनका कुछ भी नहीं दिखाते।",
  "empty": "{name} के बारे में हमारे पास अभी कोई फ़ोटो, पोस्ट या लंबा लेख नहीं है। नीचे के अभिलेखागार में शायद कुछ हो।"
};
COPY.mediaRow = {
  "row": "तस्वीरें और ख़बरें",
  "loading": "जो हमारे पास है, उसे जुटा रहे हैं…",
  "failed": "सूची लोड नहीं हुई। यह पंक्ति बंद करके फिर से खोलें।"
};
// A card's Pictures and news: end

// The train of 2026-11-24 (forge internal #545, #554, #555): begin -- the Embed tab of the share sheet (copy/en.embedtab.js), the star of your year (copy/en.yourstar.js), the network chips (copy/en.networks.js) and the search's new rows (copy/en.later.js searchRows), machine-drafted
COPY.embedTab = {
  "tabsLabel": "साझा करें या एम्बेड करें",
  "share": "साझा करें",
  "embed": "एम्बेड",
  "lede": "यह लाइव दृश्य अपने पेज में लगाएँ: कक्षा की साइट, ब्लॉग या स्लाइड में।",
  "size": "आकार",
  "sizes": {
    "small": "छोटा",
    "medium": "मध्यम",
    "large": "बड़ा"
  },
  "sizeTitle": "{w} × {h} पिक्सेल; फ़ोन पर संकरा हो जाता है",
  "credit": "नीचे श्रेय की एक पंक्ति जोड़ें",
  "creditLine": "लाइव दृश्य: {link}",
  "code": "चिपकाने के लिए कोड",
  "copy": "एम्बेड कोड कॉपी करें",
  "copyTitle": "वह कोड कॉपी करें जो यह लाइव दृश्य किसी वेब पेज में लगाता है",
  "preview": "पूर्वावलोकन",
  "previewTitle": "एम्बेड को अकेले नए टैब में खोलें",
  "note": "पाठकों को लाइव दृश्य और Space Radar में खोलें का लिंक मिलता है। उनके डिवाइस पर कुछ भी सहेजा नहीं जाता: न कुकी, न ट्रैकर।",
  "docs": "और आकार, यात्राएँ और पूरा नक्शा: एम्बेड पेज"
};
COPY.yourStar = {
  "title": "आपके साल का तारा",
  "close": "आपके साल का तारा बंद करें",
  "lede": "एक प्रकाश-वर्ष पार करने में प्रकाश को एक साल लगता है। इसलिए जो तारा उतने प्रकाश-वर्ष दूर है जितने साल के आप हैं, वह आज रात उस प्रकाश में दिखता है जो आपके जन्म के समय उससे चला था।",
  "dateLabel": "जन्मदिन",
  "placeLabel": "शहर, उस रात के आसमान के लिए (वैकल्पिक)",
  "placeHint": "दिल्ली, मुंबई, कोलकाता…",
  "placeUnknown": "यह शहर सूची में नहीं है, इसलिए आसमान आपकी घड़ी के रात 9 बजे के लिए निकाला गया है।",
  "go": "मेरा तारा खोजें",
  "finding": "नाम वाले तारों में खोज रहे हैं…",
  "needDate": "पहले जन्मदिन लिखें।",
  "badDate": "यह दिन पढ़ा नहीं जा सकता। 1900 से आज तक का कोई दिन चुनें।",
  "future": "वह दिन अभी आया नहीं है। बीता हुआ कोई दिन चुनें।",
  "noStars": "तारे लोड नहीं हुए। थोड़ी देर में फिर कोशिश करें।",
  "eyebrow": "आपके साल का तारा",
  "eyebrowOnWay": "आपके तारे का प्रकाश रास्ते में है",
  "where": "{constellation} तारामंडल में, {ly} प्रकाश-वर्ष दूर",
  "distance": "{ly} प्रकाश-वर्ष दूर",
  "left": "आज रात आप उसका जो प्रकाश देखते हैं, वह {when} में उससे चला था, जब आपका जन्म हुआ।",
  "leftYear": "आज रात आप उसका जो प्रकाश देखते हैं, वह {when} में उससे चला था, लगभग जब {year} में आपका जन्म हुआ।",
  "band": "इसकी दूरी दोनों ओर लगभग {err} प्रकाश-वर्ष तक सही पता है, इसलिए वह प्रकाश {from} और {to} के बीच चला था।",
  "onItsWay": "अभी कोई तारा इतना पास नहीं है। आपके जन्मदिन पर {name} से चला प्रकाश अब भी {ly} प्रकाश-वर्ष पार कर रहा है: वह {when} में पहुँचेगा।",
  "errFrom": {
    "gaia": "त्रुटि Gaia की है: तारे का लंबन और उसकी अपनी अनिश्चितता।",
    "range": "त्रुटि वह दायरा है जो कैटलॉग इस तारे के लिए देता है।",
    "modelled": "त्रुटि Hipparcos की परिशुद्धता (आधा मिलीआर्कसेकंड) से मॉडल की गई है; कैटलॉग इस तारे के लिए कोई त्रुटि नहीं देता।"
  },
  "moon": "चंद्रमा: {phase}, {pct} % प्रकाशित",
  "planetsPlace": "{place} से शाम ढलने के बाद दिखे: {list}",
  "planetsClock": "शाम के आसमान में: {list}",
  "planetsNone": "शाम के आसमान में कोई चमकीला ग्रह नहीं था।",
  "formatLabel": "कार्ड का आकार",
  "formats": {
    "landscape": "चौड़ा",
    "square": "वर्गाकार",
    "story": "स्टोरी"
  },
  "share": "साझा करें",
  "shareTitle": "कार्ड और उसका लिंक साझा करें",
  "download": "डाउनलोड",
  "downloadTitle": "कार्ड को PNG चित्र के रूप में सहेजें",
  "copyLink": "लिंक कॉपी करें",
  "copyLinkTitle": "ऐसा लिंक जो यह कार्ड फिर खोलता है",
  "fly": "तारे तक उड़ें",
  "flyTitle": "इसे बंद करें और 3D नक्शे में तारे तक उड़ें",
  "sky": "वह रात देखें",
  "skyTitle": "ज़मीन पर खड़े होकर उस शाम का आसमान देखें",
  "copied": "लिंक कॉपी हो गया",
  "copyRefused": "अभी कॉपी नहीं हो सका",
  "shareFailed": "यहाँ साझा नहीं हो सका। कार्ड डाउनलोड कर लें।",
  "cardAlt": "एक कार्ड: {name}, वह तारा जिसका प्रकाश आपके जन्म के साल चला था, आसपास के तारों के साथ।",
  "privacy": "कुछ भी सहेजा या भेजा नहीं जाता। तारीख इसी पेज में रहती है, और लिंक में तभी जब आप उसे साझा करें; शहर कभी नहीं।",
  "footer": "SPACERADAR.AI · अंतरिक्ष का लाइव नक्शा"
};
COPY.networks = {
  "title": "उपग्रह नेटवर्क",
  "names": {
    "starlink": "Starlink",
    "oneweb": "OneWeb",
    "gps": "GPS",
    "glonass": "GLONASS",
    "galileo": "Galileo",
    "beidou": "BeiDou",
    "iridium": "Iridium",
    "kuiper": "Kuiper",
    "qianfan": "Qianfan",
    "stations": "स्टेशन",
    "debris": "मलबा",
    "geo": "भूस्थिर"
  },
  "chipCount": "{name}: अभी नक्शे पर {n}। इन्हें रोशन करें",
  "chipNoCount": "{name}: इन्हें नक्शे पर रोशन करें",
  "clear": "हटाएँ",
  "clearTitle": "सभी बिंदु वापस दिखाएँ",
  "noteLoad": "उपग्रह लोड होने पर गिनती दिखती है: कोई नेटवर्क टैप करें (7 MB)।",
  "noteCounted": "अभी लोड हुए कैटलॉग (CelesTrak) से गिना गया, उन नामों से जो ऑपरेटर इन्हें देते हैं।"
};
Object.assign(COPY.searchRows, {
  "yourStar": "आपके साल का तारा",
  "yourStarSub": "जिसका प्रकाश आपके जन्म पर चला",
  "yourStarWords": "जन्मदिन जन्म जन्म वर्ष मेरा तारा मेरे साल का तारा आपके साल का तारा उम्र प्रकाश वर्ष",
  "ask": "समझा गया: {what}",
  "askSub": "नक्शे पर रोशन करने के लिए दबाएँ",
  "askJoin": " · ",
  "askGroups": {
    "starlink": "Starlink",
    "oneweb": "OneWeb",
    "kuiper": "Kuiper",
    "qianfan": "Qianfan",
    "gps": "GPS",
    "glonass": "GLONASS",
    "galileo": "Galileo",
    "beidou": "BeiDou",
    "iridium": "Iridium",
    "stations": "मानवयुक्त स्टेशन",
    "debris": "मलबा",
    "geo": "भूस्थिर वलय",
    "sats": "उपग्रह"
  },
  "askPlace": "{place} के ऊपर",
  "askOwner": "{owner} के",
  "askToday": "आज प्रक्षेपित",
  "askDays": "पिछले {n} दिनों में प्रक्षेपित",
  "askYear": "{year} में प्रक्षेपित",
  "askWords": {
    "over": "ऊपर|के ऊपर|में",
    "from": "से|का|के|की",
    "launched": "प्रक्षेपित|लॉन्च|नए",
    "today": "आज",
    "week": "इस हफ़्ते|हफ़्ते|सप्ताह",
    "month": "इस महीने|महीने",
    "year": "इस साल",
    "groups": {
      "stations": "स्टेशन|अंतरिक्ष स्टेशन",
      "debris": "मलबा|अंतरिक्ष कचरा",
      "geo": "भूस्थिर",
      "sats": "उपग्रह|सैटेलाइट"
    }
  }
});
COPY.yourStar.skyOn = "{date} का आसमान";
COPY.yourStar.leftNear = "आज रात तुम इससे जो रोशनी देखते हो, वह {when} में चली थी: कोई भी नाम वाला तारा ठीक उतने प्रकाश-वर्ष दूर नहीं है जितनी तुम्हारी उम्र है, और यह सबसे नज़दीकी है।";
// The train of 2026-11-24: end
// research train (catalogues): begin -- machine-translated, agent-reviewed 2026-11-24 (not native-reviewed): forge #551, #553, #560, #564.
// The catalogues' shared words (copy/en.catalogues.js); each catalogue's own words sit between its markers below.
COPY.catalogueEntry = {
  "title": "कैटलॉग",
  "launches": "1957 से हर प्रक्षेपण",
  "calendar": "आकाश कैलेंडर",
  "eclipse": "2 अगस्त 2027 का ग्रहण: क्या मैं इसे देखूँगा?",
  "asteroids": "पृथ्वी के पास के क्षुद्रग्रह",
  "exoplanets": "बाह्यग्रह एक्सप्लोरर"
};
COPY.catalogue = {
  "label": "कैटलॉग",
  "titles": {
    "launches": "1957 से हर प्रक्षेपण",
    "calendar": "आकाश कैलेंडर",
    "eclipse": "2 अगस्त 2027 का ग्रहण",
    "asteroids": "पृथ्वी के पास के क्षुद्रग्रह",
    "exoplanets": "बाह्यग्रह एक्सप्लोरर"
  },
  "loading": "कैटलॉग पढ़ा जा रहा है…",
  "failed": "यह कैटलॉग लोड नहीं हो सका। बाद में फिर कोशिश करें।",
  "retry": "फिर कोशिश करें",
  "sortTitle": "{col} के हिसाब से क्रम",
  "rowTitle": "{name} पर जाएँ",
  "showing": "{n} में से {shown} दिख रहे हैं",
  "showingAll": "{n} पंक्तियाँ",
  "none": "इन फ़िल्टरों से कुछ मेल नहीं खाता।",
  "more": "{n} और दिखाएँ",
  "all": "सभी",
  "search": "नाम से फ़िल्टर करें",
  "clear": "फ़िल्टर हटाएँ",
  "sourceLabel": "स्रोत",
  "licenceLabel": "लाइसेंस",
  "sourceTail": "। {text}",
  "asOf": "{date} तक",
  "savedCopy": "हमारी सहेजी गई प्रति, {date} को पढ़ी गई",
  "bundledCopy": "नक्शे के साथ आई प्रति, {date} को पढ़ी गई",
  "unknown": "—"
};
// research train (catalogues): launch archive: begin
COPY.launchArchive = {
  "lead": "स्पुतनिक 1 से अब तक {n} कक्षीय प्रक्षेपण प्रयास। किसी एक को चुनें और उसके प्रक्षेपण स्थल तक उड़ें।",
  "tableLabel": "कक्षीय प्रक्षेपण प्रयास",
  "columns": {
    "date": "तारीख़ (UTC)",
    "vehicle": "रॉकेट",
    "site": "स्थल",
    "payload": "पेलोड",
    "outcome": "नतीजा"
  },
  "outcome": {
    "S": "सफल",
    "F": "विफल",
    "P": "आंशिक",
    "E": "लॉन्च पैड पर विस्फोट",
    "A": "लॉन्च पैड पर रद्द",
    "U": "अज्ञात"
  },
  "partial": "आंशिक, {pct} %",
  "outcomeTitle": "GCAT अपनी विश्वसनीयता गिनती में इसे {pct} % मानता है",
  "filters": {
    "outcome": "नतीजा",
    "when": "कब",
    "country": "प्रक्षेपण स्थल का देश",
    "text": "रॉकेट, पेलोड या स्थल"
  },
  "outcomeChips": {
    "all": "सभी",
    "S": "सफल",
    "F": "विफल",
    "P": "आंशिक",
    "other": "अन्य"
  },
  "whenAny": "कोई भी साल",
  "decades": "दशक",
  "years": "साल",
  "decade": "{d} का दशक",
  "countryAll": "कहीं भी",
  "elsewhere": "कहीं और",
  "soviet": "सोवियत संघ",
  "noPlace": "GCAT ने अभी इस स्थल की जगह नहीं दी है, इसलिए ग्लोब वहाँ नहीं जा सकता।",
  "flewTo": "ग्लोब पर: {site}, पैड {pad}",
  "flewToNoPad": "ग्लोब पर: {site}",
  "replay": {
    "title": "ग्लोब पर दोबारा चलाएँ",
    "play": "चलाएँ",
    "pause": "रोकें",
    "playTitle": "{year} से हर प्रक्षेपण दोबारा चलाएँ, एक सेकंड में दो साल",
    "year": "साल",
    "yearValue": "{year}: {n} प्रक्षेपण प्रयास",
    "reduced": "गति कम की गई है: सालों से गुज़रने के लिए स्लाइडर खिसकाएँ।",
    "note": "ये चाप सिर्फ़ समझाने के लिए हैं: हर चाप असली प्रक्षेपण स्थल से शुरू होता है और योजना वाली कक्षा जिस दिशा की अनुमति देती है, भूमध्य रेखा की ओर जाता है; जहाँ GCAT कक्षा नहीं देता, सीधे पूर्व। विफल प्रक्षेपण का चाप बीच में रुक जाता है।"
  },
  "sourceName": "GCAT, जोनाथन मैकडॉवेल",
  "licence": "CC BY 4.0"
};
// research train (catalogues): launch archive: end

// research train (catalogues): sky calendar: begin
COPY.skyCalendar = {
  "lead": "आकाश की तारीख़ वाली घटनाएँ, नक्शे की अपनी खगोल-गणना से निकाली गईं। समय UTC में।",
  "prev": "पिछला महीना",
  "next": "अगला महीना",
  "filterLabel": "दिखाएँ",
  "cats": {
    "all": "सभी",
    "eclipses": "ग्रहण",
    "showers": "उल्का वर्षा",
    "moons": "पूर्णिमा",
    "planets": "ग्रह",
    "seasons": "संक्रांति",
    "missions": "मिशन",
    "launches": "प्रक्षेपण"
  },
  "titles": {
    "shower": "{shower}: चरम",
    "solarTotal": "पूर्ण सूर्य ग्रहण",
    "solarAnnular": "वलयाकार सूर्य ग्रहण",
    "solarPartial": "आंशिक सूर्य ग्रहण",
    "lunarTotal": "पूर्ण चंद्र ग्रहण",
    "lunarPartial": "आंशिक चंद्र ग्रहण",
    "fullMoon": "पूर्णिमा",
    "conjunction": "{a} और {b} पास-पास",
    "juneSolstice": "जून संक्रांति",
    "decemberSolstice": "दिसंबर संक्रांति",
    "missionOrbit": "{mission} {world} की कक्षा में प्रवेश करता है"
  },
  "details": {
    "shower": "पूरी तरह अँधेरे आकाश में प्रति घंटे लगभग {zhr} तक",
    "conjunction": "सबसे पास होने पर {deg}° की दूरी",
    "fullMoon": "पृथ्वी से {km} km",
    "eclipse": "इस समय ग्रहण का चरम",
    "mission": "एजेंसी की तारीख़, पूरा दिन",
    "launch": "जैसा Launch Library 2 अभी बताती है",
    "launchRough": "अभी सटीक समय घोषित नहीं हुआ"
  },
  "when": "{date}, {time} UTC",
  "allDay": "{date}, पूरा दिन",
  "open": "उस पल पर नक्शा खोलें: {name}",
  "add": "कैलेंडर में जोड़ें",
  "addTitle": "{name} को अपने कैलेंडर में जोड़ें (एक .ics फ़ाइल)",
  "more": "और पढ़ें",
  "moreTitle": "{name} के बारे में पेज",
  "empty": "इस महीने हमारे कैलेंडर में कुछ नहीं है।",
  "count": "इस महीने {n}",
  "subscribe": "सदस्यता लें",
  "subscribeLead": "सदस्यता लेने वाला कैलेंडर ऐप दिन में एक बार फिर देखता है।",
  "subscribeAll": "आकाश की हर घटना की सदस्यता लें",
  "subscribeTitle": "अपने कैलेंडर ऐप में {name} की सदस्यता लें",
  "sourceName": "/events/ पेजों की सूची, Astronomy Engine से गणना",
  "checked": "{date} को एक व्यक्ति ने जाँचा",
  "launchesSource": "प्रक्षेपण: Launch Library 2 (The Space Devs), जैसे नक्शे के पास हैं",
  "showers": {
    "quadrantids": "क्वाड्रैंटिड्स",
    "lyrids": "लिरिड्स",
    "eta-aquariids": "ईटा एक्वेरिड्स",
    "alpha-capricornids": "अल्फ़ा कैप्रिकॉर्निड्स",
    "southern-delta-aquariids": "दक्षिणी डेल्टा एक्वेरिड्स",
    "perseids": "पर्सिड्स",
    "draconids": "ड्रैकोनिड्स",
    "orionids": "ओरियोनिड्स",
    "southern-taurids": "दक्षिणी टॉरिड्स",
    "northern-taurids": "उत्तरी टॉरिड्स",
    "leonids": "लियोनिड्स",
    "geminids": "जेमिनिड्स",
    "ursids": "उर्सिड्स"
  },
  "feeds": {
    "sky-events.ics": "आकाश की हर घटना",
    "eclipses.ics": "सूर्य और चंद्र ग्रहण",
    "showers.ics": "उल्का वर्षा",
    "moons.ics": "पूर्णिमा",
    "planets.ics": "पास-पास ग्रह",
    "seasons.ics": "संक्रांति",
    "missions.ics": "मिशन की घटनाएँ",
    "sky.ics": "संक्रांति, ग्रहों का मिलन और मिशन"
  }
};
// research train (catalogues): sky calendar: end

// research train (catalogues): eclipse checker: begin
COPY.eclipseCheck = {
  "lead": "2 अगस्त 2027 को चंद्रमा की छाया दक्षिणी स्पेन, उत्तरी अफ़्रीका और अरब से गुज़रती है। कोई जगह चुनें और देखें कि वहाँ से क्या दिखता है।",
  "placeLabel": "जगह",
  "placeholder": "कोई कस्बा या शहर",
  "check": "जाँचें",
  "useMine": "मेरी जगह इस्तेमाल करें",
  "locating": "आपके ब्राउज़र से पूछ रहे हैं…",
  "denied": "आपके ब्राउज़र ने जगह नहीं बताई।",
  "noMatch": "हमारी सूची में इस नाम की कोई जगह नहीं है। पास का कोई बड़ा शहर आज़माएँ।",
  "suggestions": "जगहें",
  "placeRow": "{name}, {country}",
  "yours": "आपकी जगह",
  "at": "जगह: {place}",
  "total": "पूर्ण: {dur} का अँधेरा",
  "annular": "वलयाकार: {dur} तक सूर्य का छल्ला",
  "partial": "आंशिक: सूर्य का {pct} ढका",
  "none": "यहाँ से नहीं दिखेगा: चंद्रमा की छाया इस जगह से नहीं गुज़रती।",
  "below": "यहाँ से नहीं दिखेगा: सूर्य क्षितिज के नीचे है।",
  "rises": "सूर्य तब उगता है जब ग्रहण शुरू हो चुका होता है।",
  "sets": "ग्रहण ख़त्म होने से पहले सूर्य डूब जाता है।",
  "low": "सूर्य नीचा है: क्षितिज तक खुला नज़ारा चाहिए।",
  "rows": {
    "obscuration": "सूर्य ढका",
    "magnitude": "परिमाण",
    "c1": "शुरू",
    "c2": "पूर्णता शुरू",
    "max": "चरम",
    "c3": "पूर्णता ख़त्म",
    "c4": "ख़त्म",
    "duration": "पूर्णता की अवधि",
    "sunAlt": "चरम पर सूर्य की ऊँचाई"
  },
  "rowsAnnular": {
    "c2": "छल्ला शुरू",
    "c3": "छल्ला ख़त्म",
    "duration": "छल्ले की अवधि"
  },
  "time": "{utc} UTC · आपके समय {local}",
  "dur": "{m} मिनट {s} सेकंड",
  "pct": "{n} %",
  "deg": "{n}°",
  "openMap": "ग्लोब पर देखें",
  "openTitle": "चरम के पल पर, पृथ्वी के ऊपर नक्शा खोलें",
  "safety": "सिर्फ़ ISO 12312-2 के अनुसार बने ग्रहण-चश्मे से देखें। उन्हें तभी उतारें जब सूर्य पूरी तरह ढका हो।",
  "method": "यहाँ NASA के बेसेलियन तत्वों से गणना (ΔT 71.7 s), लगभग एक सेकंड तक सटीक।",
  "sourceName": "NASA GSFC के ग्रहण पूर्वानुमान, Fred Espenak द्वारा",
  "licence": "NASA की सामग्री, अमेरिका में कॉपीराइट के अधीन नहीं",
  "placesNote": "जगहें Natural Earth (सार्वजनिक डोमेन) और नक्शे के अपने शहरों से। आप जो लिखते हैं वह इसी पेज पर रहता है।"
};
// research train (catalogues): eclipse checker: end

// research train (catalogues): asteroids: begin
COPY.neo = {
  "lead": "{neo} ज्ञात पृथ्वी-निकट क्षुद्रग्रहों में से {rows}: सभी ख़तरनाक, लगभग एक किलोमीटर या उससे बड़े सभी, और अगले दस साल में 0.05 AU के भीतर से गुज़रने वाले सभी।",
  "tableLabel": "पृथ्वी के पास के क्षुद्रग्रह",
  "whichLabel": "कौन-से",
  "which": {
    "all": "सभी",
    "pha": "ख़तरनाक",
    "km": "एक किलोमीटर या ज़्यादा",
    "close": "पास से गुज़रने वाले"
  },
  "classLabel": "कक्षा",
  "classes": {
    "APO": "अपोलो",
    "ATE": "एटेन",
    "AMO": "अमोर",
    "IEO": "अटिरा"
  },
  "classTitles": {
    "APO": "बाहर से पृथ्वी की कक्षा को पार करता है",
    "ATE": "भीतर से पृथ्वी की कक्षा को पार करता है",
    "AMO": "बाहर से पृथ्वी की कक्षा के पास आता है, कभी पार नहीं करता",
    "IEO": "इसकी पूरी कक्षा पृथ्वी की कक्षा के भीतर है"
  },
  "searchPlaceholder": "Apophis, 2024 YR4, 433",
  "columns": {
    "name": "नाम",
    "size": "आकार",
    "next": "अगली गुज़र",
    "dist": "दूरी",
    "cls": "कक्षा",
    "dv": "डेल्टा-v",
    "moid": "MOID"
  },
  "km": "{n} किमी",
  "m": "{n} मीटर",
  "range": "{min} से {max}",
  "estimated": "{range} (अनुमान)",
  "sizeMeasured": "JPL द्वारा मापा गया",
  "sizeEstimated": "चमक से अनुमान (H {h}): चमकीली चट्टान छोटा आकार, अँधेरी बड़ा",
  "ld": "{n} LD",
  "ldTitle": "चंद्रमा की दूरी का {n} गुना, {au} AU, {kms} किमी/से की चाल से",
  "kms": "{n} किमी/से",
  "au": "{n} AU",
  "moidTitle": "दोनों कक्षाएँ एक-दूसरे के सबसे पास कितनी आती हैं, कोई गुज़र नहीं",
  "passes": "अगले दस साल में {n} गुज़रें",
  "notes": {
    "size": "जहाँ JPL का माप है वहाँ आकार वही है, वरना चमक से निकाला गया एक दायरा: चट्टान पथरीले क्षुद्रग्रह जितनी चमकीली या कार्बन-भरे जितनी अँधेरी हो सकती है।",
    "dv": "डेल्टा-v अनुमान है कि किसी चट्टान तक पहुँचना कितना कठिन है: पृथ्वी की निचली कक्षा से उससे मिलने तक चाल का बदलाव (शूमेकर और हेलिन, 1978, जैसे लांस बेनर की तालिका गिनती है)। असली मिशन प्रक्षेपण की खिड़की का इंतज़ार करता है।",
    "place": "कोई पंक्ति चुनने पर नक्शा वहाँ उड़ता है और उसकी कक्षा बनाता है। उसकी जगह JPL की कक्षा से दो-पिंड गति से निकाली जाती है, इसलिए वह अनुमानित है, और कक्षा की तारीख़ के बाद के महीनों के साथ JPL की जगह से हटती जाती है।",
    "hazard": "“ख़तरनाक” का मतलब है ऐसी कक्षा जो पृथ्वी की कक्षा से 0.05 AU के भीतर आती है और लगभग 140 मीटर से बड़ी चट्टान। यह कोई भविष्यवाणी नहीं है।"
  },
  "recordWhy": "यह पृथ्वी-निकट क्षुद्रग्रहों की सूची में है क्योंकि {reasons}। कक्षा असली प्रेक्षणों पर JPL का फ़िट है; उस कक्षा पर इसकी जगह यहाँ दो-पिंड गति से निकाली जाती है, इसलिए वह अनुमानित है।",
  "reasonJoin": ", और ",
  "reasons": {
    "pha": "JPL इसे संभावित रूप से ख़तरनाक मानता है",
    "km": "यह लगभग एक किलोमीटर या उससे बड़ा है",
    "close": "यह अगले दस साल में पृथ्वी से 0.05 AU के भीतर से गुज़रेगा"
  },
  "recordSource": "NASA/JPL लघु-पिंड डेटाबेस और CNEOS के निकट-आगमन, {date} को पढ़े गए",
  "cloud": {
    "title": "सभी क्रमांकित क्षुद्रग्रह",
    "toggle": "सबसे चमकीले क्रमांकित क्षुद्रग्रह बिंदुओं के रूप में दिखाएँ",
    "shown": "{numbered} क्रमांकित क्षुद्रग्रहों में से {shown}, सबसे चमकीले पहले (H {h} या ज़्यादा चमकीले)",
    "loading": "बिंदु पढ़े जा रहे हैं…",
    "failed": "बिंदु लोड नहीं हो सके।",
    "more": "{n} और जोड़ें",
    "all": "हमारे पास के सभी स्तर चालू हैं",
    "legend": {
      "neo": "पृथ्वी-निकट",
      "belt": "मुख्य पट्टी",
      "trojan": "बृहस्पति के ट्रोजन",
      "far": "बृहस्पति से आगे"
    },
    "note": "केवल बिंदु, JPL की कक्षाओं से दो-पिंड गति से निकाले गए और सूर्य से अपनी दूरी के दस-हज़ारवें हिस्से तक गोल किए गए। सभी क्षुद्रग्रह नहीं: धुँधले छोड़ दिए गए हैं।"
  },
  "sourceSbdb": "NASA/JPL लघु-पिंड डेटाबेस (कक्षाएँ)",
  "sourceCad": "NASA/JPL CNEOS निकट-आगमन (गुज़रें)",
  "licence": "सार्वजनिक डोमेन (NASA/JPL)"
};
// research train (catalogues): asteroids: end

// research train (catalogues): exoplanets: begin
COPY.exoExplorer = {
  "lead": "दूसरे तारों के चारों ओर हर पुष्ट ग्रह, कोई भी दो संख्याएँ आमने-सामने। वहाँ जाने के लिए किसी बिंदु को छुएँ।",
  "views": "दृश्य",
  "presets": {
    "periodRadius": "साल की लंबाई और आकार",
    "zone": "तारे की रोशनी और तारा (रहने योग्य क्षेत्र)",
    "massRadius": "द्रव्यमान और आकार",
    "years": "हर साल की खोजें"
  },
  "xLabel": "आड़ी धुरी",
  "yLabel": "खड़ी धुरी",
  "scaleLabel": "{axis} का पैमाना",
  "linear": "रैखिक",
  "log": "लॉग",
  "axes": {
    "period": "साल की लंबाई",
    "radius": "आकार",
    "mass": "द्रव्यमान",
    "distance": "दूरी",
    "year": "खोज का साल",
    "starTeff": "तारे का तापमान",
    "starRadius": "तारे का आकार",
    "aAu": "कक्षा का आकार",
    "insol": "मिलने वाली रोशनी",
    "teq": "ग्रह का तापमान",
    "starMass": "तारे का द्रव्यमान"
  },
  "units": {
    "period": "दिन",
    "radius": "पृथ्वी",
    "mass": "पृथ्वी",
    "distance": "प्रकाश-वर्ष",
    "year": "",
    "starTeff": "K",
    "starRadius": "सूर्य",
    "aAu": "AU",
    "insol": "पृथ्वी = 1",
    "teq": "K",
    "starMass": "सूर्य"
  },
  "axisTitle": "{name} ({unit})",
  "methods": "खोज का तरीका",
  "method": {
    "transit": "पारगमन",
    "rv": "डगमगाहट",
    "microlensing": "माइक्रोलेंसिंग",
    "imaging": "सीधी तस्वीर",
    "other": "दूसरे तरीके"
  },
  "methodTitle": "{method} से मिले ग्रह दिखाएँ या छिपाएँ",
  "drawn": "{n} ग्रह बनाए गए।",
  "missing": "{n} का दोनों में से एक धुरी पर कोई मान नहीं है।",
  "nonPositive": "{n} का मान शून्य या उससे कम है, जिसे लॉग पैमाना नहीं रख सकता।",
  "hidden": "{n} \"खोज का तरीका\" बटनों से छिपे हैं।",
  "canvasLabel": "{x} के सामने {y}: {n} ग्रह। तीर कुंजियाँ एक-एक करके चलती हैं, Enter खोलता है।",
  "readout": "{name}: {x}, {y}। {method}",
  "readoutHint": "किसी बिंदु पर इशारा करें, या चार्ट पर फ़ोकस करके तीर कुंजियाँ चलाएँ।",
  "open": "{name} खोलें",
  "noRecord": "{name} अभी नक्शे पर नहीं है।",
  "zoneBoth": "हरी पट्टी: हर तारे के तापमान के लिए जहाँ तरल पानी टिक सकता है (Kopparapu et al. 2014)। हल्की पट्टी: ज़्यादा चौड़ा, आशावादी क्षेत्र।",
  "zoneSun": "हरी पट्टी: सूर्य जैसे तारे का रहने योग्य क्षेत्र (Kopparapu et al. 2014)। ठंडे तारों में यह कम रोशनी पर होता है।",
  "zoneNone": "रहने योग्य क्षेत्र देखने के लिए किसी धुरी पर \"मिलने वाली रोशनी\" चुनें।",
  "zoneLab": "लैब में रहने योग्य क्षेत्र आज़माएँ",
  "honesty": "मान आर्काइव की संयुक्त तालिका से मापे गए हैं; कक्षा का आकार, रोशनी, ग्रह का तापमान और तारे का द्रव्यमान आर्काइव के अपने हैं, और इनमें से कुछ उसने बाकी स्तंभों से निकाले हैं। जो द्रव्यमान और आकार सिर्फ़ सीमा के रूप में दिए गए हैं, वे छोड़ दिए गए हैं।",
  "extraMissing": "अतिरिक्त स्तंभ पढ़े नहीं जा सके: कक्षा का आकार, रोशनी, ग्रह का तापमान और तारे का द्रव्यमान बिना मान के हैं।",
  "source": "NASA Exoplanet Archive, संयुक्त तालिका (DOI 10.26133/NEA13)",
  "licence": "सार्वजनिक; आर्काइव श्रेय देने को कहता है"
};
// research train (catalogues): exoplanets: end

// research train (catalogues): end
