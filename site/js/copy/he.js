// he: Hebrew, the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).
// Fetched by copy/index.js only when the page speaks Hebrew (?lang=he); hidden until a native reader has signed off (docs/TRANSLATING.md).
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.
// Until a second native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Hebrew only to a visitor who asks for it (?lang=he), and the language picker does not list it.
//
// CHOICES, so a reviewer can disagree with them:
//   * Register: modern standard Hebrew, no niqqud, masculine/neutral imperative or infinitive (חקור, לחץ, גרור); no RLM/LRM or HTML.
//   * Honesty words: measured = נמדד; worked out = חושב; modelled = ממודל (a model = מודל); illustrative = להמחשה; reconstructed = משוחזר; artist's impression = הדמיית אמן; sample = דגימה.
//   * Plural: dual in `many` as "dual|plural" for hours, days, minutes, years (שעתיים|שעות, יומיים|ימים, דקותיים|דקות, שנתיים|שנים); "2 שעתיים" reads redundant when code prints the digit.
//   * Planets and moons in standard Hebrew (נוגה, כוכב חמה, צדק, איו, אירופה, גנימד, טיטאן, כארון, פלוטו); spacecraft, stars, agencies, catalogues stay in Latin script.
//   * Look names: Measured = נמדד, Film = קולנועי (panel "מראה"); habitable zone = אזור המגורים; Where tab = איפה; Explore = חקור.
//   * Ambiguous: numberWords.0 "no" = אפס; compass short codes (צ, מ-צ-מ ...) and cardinals (צ מ ד מע) are terse; card.articles/leadVerbs are placeholders because Hebrew has no copula.
//   * Templates use a dash lead ("{name} — ...") to avoid gender agreement; gender of later clauses is masculine by default (storms use feminine nouns).
//   * Slots followed by Hebrew prefixes (ב-, מ-, ו, ל-) were attached to words, not to slots, except where a place or name slot takes מ/ב directly (e.g. מ{place}).
//   * Gagarin's "Poyekhali!" kept in transliteration with a Hebrew gloss; Armstrong's quotes kept in English; GIBS acknowledgement kept in English (official wording).
//   * {position} in train.leads and {parent} in deep.* may arrive in English from code; not checked.

export const META = {
  code: "he",
  name: "עברית",
  english: "Hebrew",
  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },
};

export const RULES = {
  decimal: '.',
  /** Hebrew has no indefinite article. */
  article() {
    return '';
  },
  /**
   * one for n = 1; for n = 2 the dual if the noun has one; otherwise the plural.
   * `many` is "dual|plural" (שעתיים|שעות, יומיים|ימים, שנתיים|שנים, דקותיים|דקות).
   */
  plural(n, one, many) {
    const abs = Math.abs(n);
    if (abs === 1) return one;
    const parts = String(many).split('|');
    if (abs === 2 && parts.length > 1) return parts[0];
    return parts.length > 1 ? parts[1] : parts[0];
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "tagline": "כל מה שנע סביב כדור הארץ, במקום האמיתי שלו, ממש עכשיו.",
    "sceneSelected": "מפת חלל שמסומנים בה מיקומים אמיתיים, כש-{name} נבחר. הכרטיס שלו, בלוח לצד המפה, מספר מה הוא."
  },
  "compareText": {
    "size": [
      "בערך בגודל של מצנם",
      "בערך בגודל של מכונת כביסה",
      "בערך בגודל של מכונית",
      "בערך בגודל של אוטובוס",
      "בערך בגודל של בית",
      "בערך בגובה של בניין בן 15 קומות",
      "בערך בגובה של בניין בן 25 קומות",
      "בערך בגודל של מגרש כדורגל",
      "בערך בגובה של מגדל בן 40 קומות",
      "בערך בגודל של ספינת טיולים",
      "בערך בגובה של הבניין הגבוה בעולם",
      "בערך בגודל של הר קטן",
      "בערך בגודל של עיר"
    ],
    "magnitude": [
      "בהיר כמו הירח המלא",
      "בהיר יותר מכל כוכב או כוכב לכת",
      "בהיר כמו נוגה",
      "בהיר כמו הכוכבים הבהירים ביותר",
      "בהיר כמו כוכב רגיל",
      "בקושי נראה ממקום חשוך",
      "עמום מדי לראות בלי טלסקופ"
    ],
    "speed": [
      "{n} קמ״ש, מהירות של כביש מהיר",
      "{n} קמ״ש, בערך מהירות של מטוס נוסעים",
      "{n} קמ״ש, מהר יותר מכדור של רובה",
      "{n} קמ״ש, בערך {m} ק״מ בכל דקה"
    ],
    "driving": "{n} ק״מ כלפי מעלה, בערך {h} {word} נסיעה אילו הכביש היה עולה ישר למעלה",
    "hour": "שעה",
    "hours": "שעתיים|שעות",
    "up": "{n} ק״מ כלפי מעלה",
    "moon": "{ld}× המרחק לירח",
    "lightMinutes": "במרחק {lt} דקות אור",
    "lightHours": "במרחק {lh} שעות אור",
    "compass": [
      "צפון",
      "צפון-צפון-מזרח",
      "צפון-מזרח",
      "מזרח-צפון-מזרח",
      "מזרח",
      "מזרח-דרום-מזרח",
      "דרום-מזרח",
      "דרום-דרום-מזרח",
      "דרום",
      "דרום-דרום-מערב",
      "דרום-מערב",
      "מערב-דרום-מערב",
      "מערב",
      "מערב-צפון-מערב",
      "צפון-מערב",
      "צפון-צפון-מערב"
    ]
  },
  "numberWords": [
    "אפס",
    "אחד",
    "שניים",
    "שלושה",
    "ארבעה",
    "חמישה",
    "שישה",
    "שבעה",
    "שמונה",
    "תשעה",
    "עשרה"
  ],
  "shell": {
    "sideLabel": "חקור",
    "back": "חקור",
    "backLabel": "חזרה לחקור",
    "backChevron": "›",
    "openChevron": "‹",
    "handleMark": "S",
    "expand": "הצג את הלוח",
    "collapse": "הסתר את הלוח",
    "topLabel": "חיפוש וכלים"
  },
  "tabs": {
    "label": "איפה",
    "earth": "כדור הארץ",
    "planets": "כוכבי לכת",
    "stars": "כוכבים",
    "tonight": "הלילה"
  },
  "rightNow": {
    "title": "ממש עכשיו",
    "storms": "{n} סופות מסתובבות כרגע, והחזקה שבהן היא {name}.",
    "stormOne": "סופה אחת מסתובבת כרגע: {name}.",
    "clouds": "העננים של היום",
    "people": "אנשים בחלל",
    "iss": "ISS",
    "tiangong": "Tiangong",
    "crewAt": "{n} ב-{name}"
  },
  "statusLine": {
    "reading": "קורא את המקורות",
    "read": "{n} נקראו בביקור הזה",
    "readOne": "אחד נקרא בביקור הזה",
    "stale": "{n} ישנים",
    "failed": "{n} לא הצלחנו לקרוא",
    "oldest": "הישן ביותר: {age}",
    "open": "פתח את המקורות",
    "label": "{text}. פתח את המקורות",
    "offline": "לא מחובר: מוצגים עותקים שמורים מלפני {age}",
    "offlineNone": "לא מחובר: אין עותקים שמורים במכשיר הזה"
  },
  "mission": {
    "title": "המשימה שלו",
    "count": "{i} מתוך {n}",
    "navLabel": "האירועים של {name}",
    "prev": "האירוע הקודם",
    "next": "האירוע הבא",
    "when": "{date}, {time} UTC",
    "predicted": "{when} (חזוי)",
    "go": "עבור לרגע הזה",
    "goTitle": "כוונן את השעון לרגע הזה והצג אותו במרכז",
    "here": "השעון נמצא ברגע הזה. לחיצה על חי מחזירה אותו להווה.",
    "noteSite": "המפה יכולה להראות את המקום הזה באותו יום, באור של אותו יום.",
    "notePath": "במפה יש את המסלול שלו לאותו יום.",
    "noteCruise": "אין לנו מסלול לאותו יום: {name} מצויר על הקו הישר אחורה מהמקום שבו הוא נמדד עכשיו, ובדיוק של כיחידה אסטרונומית אחת בערך.",
    "noteNone": "במפה אין מסלול של {name} לאותו יום, ולכן השעון נשאר במקומו.",
    "noteNoneWorld": "במפה אין מסלול של {name} לאותו יום, ולכן השעון נשאר במקומו. העולם שהוא פגש מצויר לכל תאריך.",
    "seeWorld": "ראה את {world} באותו יום",
    "seeWorldTitle": "כוונן את השעון לאותו יום ועבור אל {world}. {name} עצמו אינו מצויר שם",
    "all": "כל {n} האירועים",
    "fewer": "הסתר את הרשימה",
    "source": "תאריכים ומספרים: ",
    "unknown": "הקישור הזה מצביע על אירוע שאין במפה."
  },
  "tripCard": {
    "title": "מסעות",
    "meta": "{n} תחנות · {m} דק׳",
    "metaOne": "תחנה אחת · {m} דק׳",
    "planning": "מחשב את התחנות",
    "starting": "מתחיל…",
    "cannotRun": "אי אפשר להפעיל כרגע",
    "offOne": "מסע אחד לא יכול לרוץ כרגע",
    "offMany": "{n} מסעות לא יכולים לרוץ כרגע",
    "offWhy": "{line}: {reason}",
    "all": "כל {n} המסעות",
    "fewer": "פחות מסעות",
    "onItsOwn": "הפעלה אוטומטית",
    "onItsOwnTitle": "מסע אחרי מסע, עד שתיקח את השליטה",
    "justWatch": "רק לצפות",
    "reelLength": "{m} דק׳ לסיבוב",
    "drift": "שיטוט",
    "driftLength": "בלי סוף",
    "driftTitle": "המצלמה משוטטת מדבר אחד לבא אחריו"
  },
  "explore": {
    "worldsTitle": "העולמות",
    "worldsDrawn": "כוכבי לכת מצוירים כנקודות, גדולים יותר מכפי שהם.",
    "farTitle": "מקומות רחוקים",
    "systemsTitle": "מערכות כוכבים",
    "systemsMild": "כוכבי לכת ליד אזור המגורים",
    "systemsExtreme": "מערכות קיצוניות",
    "exoRow": "כוכבי לכת של כוכבים אחרים",
    "exoShow": "הצג",
    "exoHide": "הסתר",
    "exoTitle": "מסמן כל כוכב שידוע שיש לו כוכבי לכת",
    "lightYears": "{n} שנות אור",
    "au": "{n} י״א"
  },
  "rail": {
    "label": "כלים",
    "show": "מה להציג (L)",
    "share": "שיתוף (P)",
    "more": "עוד כלים",
    "moreLabel": "עוד",
    "menuShare": "שיתוף",
    "menuHide": "הסתר את הלוחות",
    "menuGitHub": "קוד המקור ב-GitHub",
    "blog": "בלוג",
    "blogHref": "https://blog.spaceradar.ai/",
    "tour": "סיור מודרך",
    "menuTour": "סיור מודרך"
  },
  "timePill": {
    "label": "זמן",
    "when": "\u2066{date} {time} UTC\u2069",
    "live": "חי · {when}",
    "held": "{when} · מוקפא",
    "away": "{when} · {off}",
    "unknown": "הזמן לא ידוע",
    "prev": "›",
    "next": "‹",
    "prevTitle": "אחורה בזמן",
    "nextTitle": "קדימה בזמן",
    "backToLive": "חי",
    "backToLiveTitle": "חזרה לזמן האמיתי, עכשיו",
    "rate": "{n}×",
    "rateTitle": "מהירות {n}×. לחץ למעבר ל-{next}×",
    "hold": "לחץ כדי לעצור את הזמן, גרור כדי לנוע בו",
    "run": "לחץ כדי להפעיל את הזמן, גרור כדי לנוע בו",
    "localTitle": "השעה אצלך {time}, {zone}. {hold}",
    "readLabel": "{text}. {hold}",
    "units": {
      "minute": "דקה",
      "hour": "שעה",
      "day": "יום",
      "event": "אירוע"
    },
    "unitWords": {
      "minute": "דקה אחת",
      "hour": "שעה אחת",
      "day": "יום אחד",
      "event": "אירוע אחד"
    },
    "prevEvent": "האירוע הקודם",
    "nextEvent": "האירוע הבא",
    "noEventBack": "אין אירוע מוקדם יותר על ציר הזמן.",
    "noEventOn": "אין אירוע מאוחר יותר על ציר הזמן.",
    "moonMark": "הירח {phase}, {date}",
    "sunMark": "{what} במקום שבו אתה נמצא, {date}",
    "sunMarkGuess": "{what} במקום שנוחש עבורך, {date}",
    "sunWords": {
      "sunrise": "זריחה",
      "sunset": "שקיעה"
    },
    "unitTitle": "צעדים של {unit}. לחיצה מעבירה ל{next}",
    "tapeLabel": "ציר הזמן. גרור אותו, או השתמש בחצים במקלדת",
    "tapeTitle": "גרור כדי לנוע בזמן",
    "now": "עכשיו",
    "nowTitle": "חזרה לעכשיו",
    "rough": "גס יותר",
    "roughTitle": "אחרי שבוע מהיום, המקום של לוויין על המסלול שלו הוא קירוב גס",
    "roughSay": "כשמתרחקים כל כך מהיום, המקומות של הלוויינים הם קירוב גס.",
    "worlds": "כוכבי הלכת והירחים נשארים מדויקים במשך מאות שנים.",
    "markTitle": "{what}. לחץ כדי להגיע לשם",
    "endTitle": "ציר הזמן נגמר כאן: חודש אחורה, שנה קדימה"
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
    "sun": "השמש",
    "mercury": "כוכב חמה",
    "venus": "נוגה",
    "earth": "כדור הארץ",
    "moon": "הירח",
    "mars": "מאדים",
    "jupiter": "צדק",
    "saturn": "שבתאי",
    "uranus": "אורנוס",
    "neptune": "נפטון",
    "pluto": "פלוטו",
    "io": "איו",
    "europa": "אירופה",
    "ganymede": "גנימד",
    "callisto": "קליסטו",
    "phobos": "פובוס",
    "deimos": "דימוס",
    "enceladus": "אנקלדוס",
    "titan": "טיטאן",
    "triton": "טריטון",
    "charon": "כארון"
  },
  "worldFacts": {
    "cite": {
      "pluto": "המיקום חושב באמצעות Astronomy Engine (Don Cross, רישיון MIT), שעוקבת אחרי פלוטו תחת משיכת השמש וכוכבי הלכת הענקיים; הרדיוס מתיבת המידע של פלוטו בוויקיפדיה, מה הוא מ-NASA Science, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "io": "המיקום חושב באמצעות Astronomy Engine (Don Cross, רישיון MIT): צדק, ועליו תורת L1.2 של ירחיו (Lainey, Duriez ו-Vienne); הרדיוס מגיליון הנתונים של NASA על ירחי צדק, מה הוא מ-NASA Science, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "europa": "המיקום חושב באמצעות Astronomy Engine (Don Cross, רישיון MIT): צדק, ועליו תורת L1.2 של ירחיו (Lainey, Duriez ו-Vienne); הרדיוס מגיליון הנתונים של NASA על ירחי צדק, מה הוא מ-NASA Science, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "ganymede": "המיקום חושב באמצעות Astronomy Engine (Don Cross, רישיון MIT): צדק, ועליו תורת L1.2 של ירחיו (Lainey, Duriez ו-Vienne); הרדיוס מגיליון הנתונים של NASA על ירחי צדק, מה הוא מ-NASA Science, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "callisto": "המיקום חושב באמצעות Astronomy Engine (Don Cross, רישיון MIT): צדק, ועליו תורת L1.2 של ירחיו (Lainey, Duriez ו-Vienne); הרדיוס מגיליון הנתונים של NASA על ירחי צדק, מה הוא מ-NASA Science, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "phobos": "המיקום: מאדים מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 6 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, הבהירות מגיליון הנתונים של NASA על מאדים, מה הוא והצבע שלו מ-NASA Science, הכול נקרא ב-2026-09-22",
      "deimos": "המיקום: מאדים מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 120 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, הבהירות מגיליון הנתונים של NASA על מאדים, מה הוא והצבע שלו מ-NASA Science, הכול נקרא ב-2026-09-22",
      "enceladus": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 1 480 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, מה הוא והצבע שלו מ-NASA Science, איך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "titan": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 840 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, מה הוא מ-NASA Science, הנחיתה של Huygens, הצבע שלו ואיך רואים אותו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "triton": "המיקום: נפטון מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 10 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, מה הוא מ-NASA Science, הצבע והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "charon": "המיקום: פלוטו מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 1 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, הבהירות מגיליון הנתונים של NASA על פלוטו, מה הוא והצבע שלו מ-NASA Science, הכול נקרא ב-2026-09-22",
      "mimas": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 700 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי שבתאי, מה הוא והצבע שלו מ-NASA Science, הבהירות מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "tethys": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 120 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי שבתאי, מה הוא מ-NASA Science, הצבע והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "dione": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 240 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי שבתאי, הצבע שלו מ-NASA Science, מה הוא והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "rhea": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 200 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי שבתאי, מה הוא והצבע שלו מ-NASA Science, הבהירות מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "iapetus": "המיקום: שבתאי מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 6 800 ק״מ בשנים 2000 עד 2050, שהם 0.19 אחוז מהמסלול שלו; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, שתי החזרתיויות (אלבדו) מגיליון הנתונים של NASA על ירחי שבתאי, מה הוא והצבע שלו מ-NASA Science, הבהירות מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "miranda": "המיקום: אורנוס מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 120 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי אורנוס, מה הוא מ-NASA Science, הצבע והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "ariel": "המיקום: אורנוס מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 120 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי אורנוס, מה הוא והצבע שלו מ-NASA Science, הבהירות מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "umbriel": "המיקום: אורנוס מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 410 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי אורנוס, מה הוא מ-NASA Science, הצבע והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "titania": "המיקום: אורנוס מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 1 000 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי אורנוס, מה הוא והצבע שלו מ-NASA Science, הבהירות מוויקיפדיה, הכול נקרא ב-2026-09-22",
      "oberon": "המיקום: אורנוס מ-Astronomy Engine (Don Cross, רישיון MIT), ועליו מסלול שהותאם ל-JPL Horizons ונבדק מולו עד סטייה של 1 230 ק״מ בשנים 2000 עד 2050; הרדיוס מנתוני הפיזיקה של הלוויינים של JPL, החזרתיות (אלבדו) מגיליון הנתונים של NASA על ירחי אורנוס, מה הוא מ-NASA Science, הצבע והבהירות שלו מוויקיפדיה, הכול נקרא ב-2026-09-22"
    }
  },
  "worldView": {
    "withParent": "{parent} מצויר רחב פי {n} ממה שהוא נראה בשמיים, כדי שאפשר יהיה למצוא אותו, ו-{name} מצויר סביבו באותו קנה מידה: המרחק שלו מ-{parent} מורחב באותו יחס בדיוק.",
    "withParentFloor": "{name} עצמו מצויר גדול אפילו יותר, אחרת היה קטן מדי מכדי לראות.",
    "crowded": "{name} לא מצויר רחב כל כך: {near} נמצא רק {deg} מעלות ממנו בשמיים האלה, וגוש בגודל כזה היה מכסה אותו."
  },
  "stars": {
    "unnamed": "כוכב ללא שם (HYG {n})"
  },
  "systems": {
    "mercuryRing": "המסלול של כוכב חמה, לקנה מידה"
  },
  "ladder": {
    "title": "כמה רחוק",
    "notLoaded": "עדיין נטען",
    "weShowTitle": "כמה ממה שידוע המפה הזאת מציירת",
    "weShowRow": "{n} {what} — מתוך {of}",
    "edge": "קצה המפה",
    "edgeHow": "עוף החוצה",
    "edgeTitle": "טיסה אחת מכאן עד קצה מה שהמפה הזאת מציירת",
    "home": "כדור הארץ",
    "homeHow": "עוף הביתה",
    "homeTitle": "טיסה אחת מכאן בחזרה אל כדור הארץ",
    "flightOff": "לא מהמקום הזה: עבור קודם אל כדור הארץ, כוכבי לכת או כוכבים"
  },
  "sceneNote": {
    "refused": "לא הצלחנו לקרוא את הלוויינים.",
    "refusedTitle": "לא הצלחנו לקרוא את CelesTrak, שמפרסם את המסלולים, מהחיבור הזה. הירח, כוכבי הלכת, הכוכבים והמסעות שלא צריכים לוויינים ממשיכים לעבוד.",
    "why": "מקורות",
    "close": "×",
    "closeTitle": "סגור את ההערה"
  },
  "link": {
    "unknownVersion": "הקישור הזה הגיע ממפה חדשה יותר. מוצגת תצוגת ברירת המחדל.",
    "unknownTrip": "המסע הזה כבר לא קיים במפה. מוצגת תצוגת ברירת המחדל.",
    "unknownAt": "האובייקט הזה לא נמצא במפה; מוצגת תצוגת ברירת המחדל.",
    "unknownStage": "המפה לא יכולה להתמקד במקום הזה. מוצגת ברירת המחדל."
  },
  "share": {
    "link": "שיתוף",
    "linkTitle": "שתף את התצוגה הזאת: גלויה, קישור ומשפטים מעטים עליה",
    "title": "שיתוף",
    "close": "סגור",
    "pictureAlt": "הגלויה: התצוגה הזאת מצוירת מחדש בגודל להדפסה, עם הכיתוב שלה",
    "drawing": "מצייר את הגלויה…",
    "noPicture": "לא הצלחנו לצייר את הגלויה כרגע.",
    "withTag": "תווית על הפריט הנבחר",
    "linkLabel": "קישור",
    "copyLink": "העתק את הקישור",
    "textLabel": "טקסט",
    "lookingUp": "מחפש בוויקיפדיה…",
    "wikiSource": "הערך בוויקיפדיה שהטקסט מצטט",
    "noWiki": "אין כאן טקסט מוויקיפדיה: הפוסט קצר יותר.",
    "attribution": "מוויקיפדיה, CC BY-SA 4.0",
    "native": "שתף…",
    "nativeTitle": "השיתוף של המכשיר שלך, עם הגלויה במקומות שמקבלים תמונה",
    "nativeFailed": "השיתוף לא נפתח; העתק או הורד במקום זה",
    "copy": "העתק טקסט",
    "copyTitle": "העתק את הטקסט ואת הקישור, מוכנים להדבקה בפוסט",
    "copied": "הטקסט והקישור הועתקו",
    "linkCopied": "הקישור הועתק",
    "copyRefused": "ההעתקה נדחתה; הטקסט מסומן להעתקה",
    "jpeg": "הורד JPEG",
    "jpegTitle": "שמור את הגלויה כתמונת JPEG, 6 על 4 אינץ׳ ב-300 נקודות לאינץ׳",
    "pdf": "הורד PDF",
    "pdfTitle": "שמור את הגלויה כ-PDF של עמוד אחד, 6 על 4 אינץ׳, להדפסה",
    "email": "אימייל",
    "emailTitle": "כתוב אימייל עם הטקסט והקישור",
    "emailNote": "אימייל לא לוקח תמונה: השתמש ב״שתף…״ או הורד אותה.",
    "networksLabel": "פרסם ב",
    "networkTitle": "פתח את {network} עם הפוסט הזה, בלשונית חדשה",
    "networkLabel": "פרסם ב-{network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}, ב-Space Radar",
    "failed": "השיתוף לא הצליח להיפתח כרגע",
    "mark": "spaceradar.ai",
    "photo": "מצב צילום",
    "photoTitle": "הרכב תמונה: הכול מוסתר, מסגרת וכיתוב",
    "embed": "הטמעה",
    "embedTitle": "העתק את הקוד שמציב את התצוגה החיה הזאת בדף אינטרנט",
    "embedCopied": "קוד ההטמעה הועתק",
    "embedRefused": "ההעתקה נדחתה כרגע",
    "embedFrameTitle": "{name}, חי ב-Space Radar",
    "textRow": "טקסט הפוסט"
  },
  "embed": {
    "open": "פתח ב-Space Radar",
    "openTitle": "פתח את התצוגה הזאת במפה המלאה, בלשונית חדשה",
    "barLabel": "Space Radar, מוטמע",
    "stationUnread": "מוצג כדור הארץ: לא הצלחנו לקרוא את מיקום התחנה"
  },
  "density": {
    "panelTitle": "צפיפות",
    "regular": "רגילה",
    "compact": "דחוסה",
    "auto": "אוטומטית",
    "autoCompact": "דחוסה עכשיו, כי החלון הזה נמוך.",
    "autoRegular": "רגילה עכשיו; דחוסה כשהחלון בגובה 800 פיקסלים או פחות."
  },
  "nextList": {
    "justHappened": "הרגע קרה",
    "justHappenedTitle": "שיגורים וחזרות לאטמוספירה בשבעת הימים האחרונים",
    "calendar": "יומן",
    "calendarTitle": "הוסף את “{title}” ליומן שלך: מוריד קובץ ics אחד",
    "calendarSaved": "נשמר {file}",
    "calendarFailed": "לא הצלחנו ליצור את קובץ היומן",
    "sameName": "{name} ({id})",
    "title": "בקרוב",
    "showAll": "הצג את כל {n}",
    "showFewer": "הצג פחות",
    "now": "בערך עכשיו",
    "inMinutes": "בעוד {n} דקות",
    "inHours": "בעוד {n} שעות",
    "todayAt": "היום ב-{time}",
    "tomorrowAt": "מחר ב-{time}",
    "launch": "{name} ממריא {when}",
    "launchRough": "{name} ממריא {when}, פחות או יותר — התאריך עדיין לא נקבע",
    "approach": "{name} חולף ליד כדור הארץ {when}, במרחק של {ld}× המרחק לירח",
    "approachNoDistance": "{name} חולף ליד כדור הארץ {when}",
    "sizeM": "רוחבו {n} מטר",
    "sizeKm": "רוחבו {n} ק״מ",
    "sizeRangeM": "רוחבו בערך {lo} עד {hi} מטר, מוערך לפי הבהירות שלו",
    "sizeRangeKm": "רוחבו בערך {lo} עד {hi} ק״מ, מוערך לפי הבהירות שלו",
    "sizeMixed": "רוחבו בערך {lo} מטר עד {hi} ק״מ, מוערך לפי הבהירות שלו",
    "perihelion": "{name} הכי קרוב לשמש {when}",
    "pass": "{name} עובר מעליך {when}",
    "train": "רכבת של {n} לוויינים עוברת מעליך {when}",
    "aurora": "NOAA צופה {word}, החל מ-{when} (Kp {kp})",
    "auroraNow": "סערה גאומגנטית מתרחשת עכשיו: {word} (Kp {kp})",
    "shower": "ממטר המטאורים {name} מגיע לשיאו בסביבות {date}, עד {zhr} בשעה מתחת לשמיים חשוכים",
    "showerMoon": "ממטר המטאורים {name} מגיע לשיאו בסביבות {date}, עד {zhr} בשעה מתחת לשמיים חשוכים, כשהירח מואר ב-{pct}% באותו לילה",
    "showerNoMoon": "ממטר המטאורים {name} מגיע לשיאו בסביבות {date}, עד {zhr} בשעה מתחת לשמיים חשוכים, והירח כמעט חדש",
    "radiantHigh": "מהמקום שבו אתה נמצא, נקודת המוצא שלו גבוהה ביותר בסביבות {time}",
    "radiantLow": "מהמקום שבו אתה נמצא, נקודת המוצא שלו נשארת נמוכה כל הלילה, אז צפה לפחות מטאורים בהרבה",
    "radiantNeverUp": "מהמקום שבו אתה נמצא, נקודת המוצא שלו נשארת מתחת לאופק באותו לילה",
    "eclipseKinds": {
      "total": "מלא",
      "annular": "טבעתי",
      "partial": "חלקי",
      "hybrid": "היברידי",
      "penumbral": "חצי-צלי"
    },
    "solarEclipseTitle": "ליקוי חמה {kind}",
    "lunarEclipseTitle": "ליקוי ירח {kind}",
    "solarEclipse": "ליקוי חמה {kind} ב-{date}: הצל של הירח עמוק ביותר {where}",
    "solarEclipseGrazing": "ליקוי חמה {kind} ב-{date}, שנראה רק מהצפון הרחוק או מהדרום הרחוק",
    "lunarEclipse": "ליקוי ירח {kind} ב-{date}, הירח בצל של כדור הארץ לכל מי שרואה אותו",
    "lunarEclipsePenumbral": "ליקוי ירח {kind} ב-{date}: הירח רק מתעמעם מעט, בצל החיצוני של כדור הארץ",
    "seasonTitles": {
      "march": "שוויון האביב של מרץ",
      "june": "היפוך הקיץ של יוני",
      "september": "שוויון הסתיו של ספטמבר",
      "december": "היפוך החורף של דצמבר"
    },
    "seasons": {
      "march": "שוויון האביב של מרץ ב-{date}: היום והלילה כמעט שווים בכל מקום",
      "june": "היפוך הקיץ של יוני ב-{date}: היום הארוך ביותר בצפון, הקצר ביותר בדרום",
      "september": "שוויון הסתיו של ספטמבר ב-{date}: היום והלילה כמעט שווים בכל מקום",
      "december": "היפוך החורף של דצמבר ב-{date}: היום הארוך ביותר בדרום, הקצר ביותר בצפון"
    },
    "solstice": "{title} ב-{date}",
    "equinox": "{title} ב-{date}",
    "eclipseNear": "ליד {city}",
    "eclipseFrom": "בערך {km} ק״מ מ{city}",
    "eclipseLocal": "מהמקום שבו אתה נמצא: מתחיל {begin}, עמוק ביותר {peak} כשהשמש מכוסה ב-{pct}%, מסתיים {end}",
    "eclipseLocalTotal": "מהמקום שבו אתה נמצא: מתחיל {begin}, כיסוי מלא ב-{peak}, מסתיים {end}",
    "eclipseNotVisible": "לא נראה מהמקום שבו אתה נמצא",
    "eclipseBelowHorizon": "מהמקום שבו אתה נמצא השמש מתחת לאופק בזמן שזה קורה",
    "classOf": {
      "launch": "תוכנית: הזמן שספק השיגור מכוון אליו, והוא יכול להשתנות",
      "approach": "חושב ב-NASA JPL מהמסלול הנמדד של האסטרואיד",
      "perihelion": "חושב מהמסלול המפורסם של השביט",
      "shower": "התאריך הרגיל בכל שנה; השיא זז ביום בערך",
      "aurora": "התחזית של NOAA, שלוש שעות בכל פעם",
      "auroraNow": "נמדד על ידי NOAA בשעות האחרונות",
      "pass": "חושב כאן מרכיבי מסלול שנמדדו {age}",
      "passNoAge": "חושב כאן מרכיבי מסלול",
      "eclipse": "חושב כאן עד הדקה מתנועת השמש והירח",
      "season": "חושב כאן עד הדקה ממקום השמש בשמיים",
      "conjunction": "חושב כאן עבור המקום שלך, כשהם קרובים ביותר ושניהם מעל האופק בחושך"
    },
    "row": {
      "conjunctionTitle": "{a} ו{b}",
      "conjunction": "{when} · במרחק {sep}° זה מזה, {height} ב{dir}",
      "conjunctionValue": "{sep}°",
      "low": "נמוך",
      "mid": "בגובה בינוני",
      "high": "גבוה",
      "launch": "ממריא {when} · מתוכנן",
      "launchRough": "בסביבות {when} · התאריך לא נקבע",
      "approach": "חולף ליד כדור הארץ {when}",
      "approachValue": "{ld}× הירח",
      "approachSized": "חולף ליד כדור הארץ {when} · {size}",
      "sizeM": "{n} מ׳",
      "sizeKm": "{n} ק״מ",
      "sizeRangeM": "בערך {lo} עד {hi} מ׳",
      "sizeRangeKm": "בערך {lo} עד {hi} ק״מ",
      "perihelion": "הכי קרוב לשמש {when}",
      "pass": "עובר מעליך {when}",
      "trainTitle": "רכבת Starlink של {n}",
      "auroraTitle": "תחזית זוהר קוטבי",
      "auroraNowTitle": "סערה גאומגנטית עכשיו",
      "aurora": "תחזית NOAA, החל מ-{when}",
      "auroraNow": "נמדד על ידי NOAA בשעות האחרונות",
      "kp": "Kp {kp}",
      "showerTitle": "מטאורים של {name}",
      "shower": "שיא בסביבות {date} · עד {zhr} בשעה",
      "eclipse": "{date} · חושב עד הדקה",
      "eclipseHere": "{date} · מכאן {begin} עד {end}",
      "eclipseNotHere": "{date} · לא נראה מכאן"
    },
    "none": "אין שום דבר בקרוב בנתונים שנטענו.",
    "notLoaded": "לא נטענו, ולכן לא ברשימה: {layers}."
  },
  "groundTrack": {
    "tick": "+{n} דק׳",
    "label": "עקוב אחריו",
    "rideAlong": "טוס איתו",
    "rideAlongTitle": "מציב את המצלמה ממש מאחוריו, מביטה קדימה לאורך המסלול שלו. גרור כדי לעצור.",
    "lookBeside": "הבט מהצד שלו",
    "showTrack": "צייר את המסלול שלו מעל הקרקע",
    "hideTrack": "הסתר את המסלול שלו מעל הקרקע",
    "highNote": "המסלול שלו מעל הקרקע לא מצויר מעצמו כשהוא גבוה כל כך: הוא כמעט לא זז.",
    "trackNote": "הקו על הגלובוס הוא הקרקע שמתחתיו, 45 דקות אחורה (מקווקו) ו-90 קדימה, עם סימן כל 5 דקות."
  },
  "spaceWeather": {
    "level": "Kp {kp}, {word}",
    "levelWithScale": "Kp {kp}, {word} ({scale})",
    "measured": "מזג אוויר בחלל: {level} — נמדד {age}, {via}.",
    "forecastOnly": "מזג אוויר בחלל: {level} — תחזית, לא מדידה; {via}.",
    "stale": "הקריאה הזאת ישנה יותר ממה ש-NOAA מבטיחה; התייחס אליה כאל ניחוש.",
    "stormComing": "NOAA צופה שהוא יעלה ל-Kp {kp}.",
    "couldNotLook": "מזג אוויר בחלל: לא הצלחנו לבדוק — {why}",
    "couldNotLook0": "מזג אוויר בחלל: לא הצלחנו לבדוק.",
    "justNow": "הרגע",
    "currentBin": "לפרק שלוש השעות הנוכחי",
    "aMinuteAgo": "לפני דקה",
    "minutesAgo": "לפני {n} דקות",
    "anHourAgo": "לפני שעה",
    "hoursAgo": "לפני {n} שעות",
    "aDayAgo": "לפני יום",
    "daysAgo": "לפני {n} ימים",
    "ageUnknown": "בזמן ש-NOAA לא ציינה",
    "viaLive": "NOAA SWPC, נקרא בשידור חי",
    "viaSnapshot": "NOAA SWPC, מהעותק שלנו",
    "words": {
      "unknown": "אין קריאה",
      "quiet": "רגוע",
      "unsettled": "לא יציב",
      "active": "פעיל",
      "minorStorm": "סערה קלה — זוהר קוטבי אפשרי בצפון הרחוק ובדרום הרחוק",
      "moderateStorm": "סערה בינונית — זוהר קוטבי צפוי בקווי רוחב גבוהים",
      "strongStorm": "סערה חזקה — זוהר קוטבי רחוק מהקטבים, לוויינים נדחפים מהמסלול",
      "severeStorm": "סערה קשה",
      "extremeStorm": "סערה קיצונית"
    }
  },
  "chooser": {
    "label": "דברים מתחת לאצבע שלך",
    "hint": "{n} כאן. הקש על אחד, או על השמיים כדי לסגור."
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "סגור",
    "closeTitle": "סגור את הכרטיס הזה (Escape)",
    "it": "זה",
    "articles": [
      "\u200b",
      "\u200b"
    ],
    "leadVerbs": [
      "הוא",
      "היה"
    ],
    "makeCentre": "הפוך את {name} למרכז המפה",
    "isCentre": "זה מרכז המפה",
    "centreShort": "מרכז את המפה כאן",
    "ownPage": "הדף שלו",
    "ownPageTitle": "דף עליו שאפשר לקשר אליו, בלשונית חדשה",
    "isCentreShort": "במרכז",
    "comparisonsLabel": "כדי שתרגיש מה זה",
    "rightNowLabel": "ממש עכשיו",
    "seeItLabel": "איך רואים אותו מכאן",
    "actionsLabel": "מה אפשר לעשות",
    "unknownName": "אובייקט ללא שם",
    "unknownKind": "{name} נמצא במפה, אבל אנחנו לא יודעים איזה סוג של אובייקט הוא",
    "rows": {
      "altitude": "גובה מעל הקרקע",
      "speed": "מהירות",
      "groundPoint": "עובר מעל",
      "below": "מתחתיו עכשיו",
      "fromYou": "מרחק ממך",
      "fromGuess": "מרחק מ{place}, הניחוש שלנו למקום שלך",
      "distanceFromEarth": "מרחק מכדור הארץ",
      "distanceFromSun": "מרחק מהשמש",
      "lightLeft": "האור שלו יצא ממנו",
      "sunlight": "ממש עכשיו הוא",
      "hostStar": "הכוכב שלו",
      "across": "רוחב",
      "mass": "מסה",
      "spin": "סיבוב אחד אורך",
      "source": "נקרא מ",
      "whySource": "למה זה ידוע, נקרא מ",
      "widthSource": "הרוחב נקרא מ",
      "distanceNote": "בערך המרחק הזה",
      "objectType": "מה הוא",
      "constellation": "קבוצת כוכבים",
      "distanceRange": "מרחק, ההערכות הטובות ביותר",
      "planetRadius": "רוחב, ביחידות של כדור הארץ",
      "planetMass": "מסה, ביחידות של כדור הארץ",
      "yearLength": "שנה אחת שם",
      "found": "התגלה",
      "catalogueCopy": "עותק מהקטלוג",
      "spectralType": "סוג הכוכב",
      "brightness": "כמה בהיר הוא נראה",
      "luminosity": "עוצמת האור",
      "starWidth": "רוחב",
      "catalogue": "קטלוג",
      "iauName": "שם מאושר על ידי IAU",
      "lightTime": "זמן רדיו לכל כיוון",
      "nextPass": "המעבר הבא מעליך",
      "crew": "אנשים על הסיפון",
      "operator": "מופעל על ידי",
      "launched": "שוגר",
      "ended": "הסתיים",
      "pathEnds": "המסלול שלו נגמר",
      "pathBegins": "המסלול שלו מתחיל",
      "period": "הקפה אחת אורכת",
      "location": "איפה הוא עומד",
      "onBody": "על",
      "whenSite": "מתי",
      "onWorld": "עומד על",
      "orbiting": "במסלול סביב",
      "heightAbove": "גובה מעל {world}",
      "closestApproach": "הכי קרוב לכדור הארץ",
      "moons": "ירחים",
      "perihelion": "הכי קרוב לשמש",
      "magnitude": "בהירות",
      "phase": "שלב",
      "liftoff": "המראה",
      "pad": "מ",
      "destination": "בדרך אל",
      "whereabouts": "איפה הוא",
      "lastSeen": "המקום הידוע האחרון",
      "stormNow": "בעדכון האחרון",
      "stormWind": "הרוח החזקה ביותר במסלול שלה",
      "stormAdvisory": "העדכון האחרון",
      "stormCentre": "המרכז שלה",
      "stormAgency": "מעדכן",
      "stormAlert": "רמת ההתראה של GDACS"
    },
    "values": {
      "km": "{n} ק״מ",
      "kmh": "{n} קמ״ש",
      "belowBorder": "ליד הגבול בין {a} ל{b}",
      "belowLand": "יבשה",
      "belowWater": "מים פתוחים",
      "stormWind": "{n} קמ״ש, כולל התחזית",
      "stormWindCategory": "{n} קמ״ש, קטגוריה {cat}, כולל התחזית",
      "stormAdvisory": "{time} UTC, {ago}",
      "stormAdvisoryDated": "{date}, {time} UTC, {ago}",
      "stormStatus": {
        "hurricane": "בעוצמת הוריקן",
        "typhoon": "בעוצמת טייפון",
        "cyclone": "בעוצמת ציקלון",
        "storm": "סופה טרופית",
        "depression": "שפל טרופי"
      },
      "stormAlert": {
        "green": "ירוקה",
        "orange": "כתומה",
        "red": "אדומה"
      },
      "launchedAgo": "לפני {n} ימים, ב-{date}",
      "au": "{n} יחידות אסטרונומיות",
      "lightYears": "{n} שנות אור",
      "inSunlight": "באור השמש",
      "inShadow": "בצל של כדור הארץ",
      "yearsAgo": "לפני {n} שנים",
      "monthsAgo": "לפני {n} חודשים",
      "suns": "{n}× השמש",
      "sunsWide": "{n}× השמש, הערכה",
      "sunsWideMeasured": "{n}× השמש, נמדד",
      "earths": "{n}× כדור הארץ",
      "lightYearsRange": "{lo} עד {hi} שנות אור",
      "kmRange": "{lo} עד {hi} ק״מ",
      "noMoonsKnown": "אין ידועים",
      "sunsRange": "{lo} עד {hi}× השמש",
      "millionSuns": "{n} מיליון שמשות",
      "billionSuns": "{n} מיליארד שמשות",
      "milliseconds": "{n} אלפיות שנייה",
      "billionYearsAgo": "לפני {n} מיליארד שנים",
      "millionYearsAgo": "לפני {n} מיליון שנים",
      "days": "{n} ימים",
      "hours": "{n} שעות",
      "yearByMethod": "{year}, {method}",
      "asOf": "נכון ל-{date}",
      "magnitude": "בהירות {n}",
      "lunar": "{n}× המרחק לירח",
      "minutes": "{n} דקות",
      "seconds": "{n} שניות",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}, {lon}",
      "latLonOn": "{lat}, {lon} על {world}",
      "north": "{n}° צפון",
      "south": "{n}° דרום",
      "east": "{n}° מזרח",
      "west": "{n}° מערב"
    },
    "couldNotLook": "לא הצלחנו לחשב את זה",
    "nobodyKnows": "אף אחד לא יודע",
    "wouldNeed": "זה ידרוש {wouldNeed}.",
    "oftenSaidLabel": "אומרים הרבה",
    "notApplicable": "לא משהו שיש לאובייקט הזה",
    "endedLine": "המשימה שלו הסתיימה ב-{date}. האירועים שלו, למטה, חוזרים עד אליה.",
    "pathEndedLine": "המסלול ש-JPL מחזיק עבורו נגמר ב-{date}. האירועים שלו, למטה, חוזרים עד אליו.",
    "pathBeginsLine": "המסלול ש-JPL מחזיק עבורו מתחיל ב-{date}. האירועים שלו, למטה, חוזרים עד אליו.",
    "actions": {
      "flyTo": "עוף אליו",
      "flyToTitle": "הזז את המצלמה אל האובייקט הזה",
      "flyEnded": "הוא הסתיים ב-{date}. בחר אירוע מהמשימה שלו כדי להגיע לשם",
      "flyPathEnded": "המסלול שלו נגמר ב-{date}. בחר אירוע מהמשימה שלו כדי להגיע לשם",
      "flyPathBegins": "המסלול שלו מתחיל ב-{date}. בחר אירוע מהמשימה שלו כדי להגיע לשם",
      "flyNowhere": "אין מיקום לאובייקט הזה ברגע הזה",
      "seeFromHere": "ראה אותו מכאן",
      "seeFromHereTitle": "הבט למעלה מהמקום שלך על כדור הארץ",
      "follow": "עקוב",
      "followTitle": "עוף אליו והשאר אותו באמצע התצוגה",
      "ride": "טוס איתו",
      "rideShort": "טוס",
      "seeShort": "ראה",
      "postcard": "גלויה",
      "share": "שיתוף"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "כוכב לכת",
      "moon": "ירח",
      "dwarf": "כוכב לכת ננסי",
      "ourStar": "כוכב",
      "exoplanet": "כוכב לכת חוץ-שמשי"
    },
    "regime": {
      "leo": "מסלול נמוך סביב כדור הארץ",
      "meo": "מסלול בינוני סביב כדור הארץ",
      "geo": "מסלול גאוסינכרוני",
      "heo": "מסלול גבוה סביב כדור הארץ",
      "inner": "מערכת השמש הפנימית",
      "outer": "מערכת השמש החיצונית",
      "belt": "חגורת האסטרואידים",
      "beyondNeptune": "מעבר לנפטון",
      "round": "סביב {world}",
      "inCon": "ב{con}",
      "onWorld": "על {world}",
      "centre": "מרכז מערכת השמש",
      "nearby": "בין הקרובים ביותר"
    },
    "hero": {
      "label": "בשלושה מספרים",
      "missing": "—",
      "captions": {
        "altitude": "{u} למעלה",
        "away": "{u} משם",
        "speed": "{u}",
        "period": "{u} להקפה",
        "distanceFromSun": "{u} מהשמש",
        "distanceFromEarth": "{u} מכדור הארץ",
        "lightTime": "{u} לכל כיוון",
        "spin": "{u} לסיבוב",
        "yearLength": "{u} לשנה",
        "brightness": "בהירות",
        "spectralType": "מחלקת הכוכב",
        "across": "{u} רוחב",
        "lightLeft": "{u} משם",
        "launched": "ימים בחלל",
        "fromYou": "{u} ממך",
        "heightAbove": "{u} למעלה",
        "other": "{u}"
      },
      "units": {
        "minutes": "דק׳",
        "hours": "ש׳",
        "days": "ימים",
        "seconds": "שנ׳",
        "milliseconds": "אלפיות שנ׳",
        "astronomical units": "י״א",
        "light-years": "ש״א",
        "years ago": "ש״א",
        "million years ago": "מיליון ש״א",
        "billion years ago": "מיליארד ש״א",
        "months ago": "חודשי אור"
      }
    },
    "sections": {
      "label": "עוד עליו",
      "see": "מתי אפשר לראות אותו",
      "path": "המסלול שלו",
      "aboard": "מי על הסיפון",
      "ridingOn": "על מה הוא רכוב",
      "about": "עליו",
      "sources": "מקורות לרשומה הזאת",
      "placeGuessed": "מקום מנוחש",
      "needsPlace": "צריך את המקום שלך",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "{n} קבוצות כתמי שמש מצוירות, לפי הרשימה של NOAA ל-{date}: כל אחת ככתם עגול אחד במקום ובגודל שדווחו, ומוסעת סביב על ידי סיבוב השמש מאז.",
    "spotsOne": "קבוצת כתמי שמש אחת מצוירת, לפי הרשימה של NOAA ל-{date}: ככתם עגול אחד במקום ובגודל שדווחו, ומוסעת סביב על ידי סיבוב השמש מאז.",
    "spotsPaired": "{n} קבוצות כתמי שמש מצוירות, לפי הרשימה של NOAA ל-{date}, ומוסעות סביב על ידי סיבוב השמש מאז. {pairs} מהן, שיש בהן כמה כתמים, מצוירות ככתם מוביל במערב וככתם עוקב במזרח; הרווח ביניהם והחלוקה של השטח בין השניים הם להמחשה. כל השאר הן כתם עגול אחד.",
    "spotsPairedOne": "קבוצת כתמי שמש אחת מצוירת, לפי הרשימה של NOAA ל-{date}, ומוסעת סביב על ידי סיבוב השמש מאז: ככתם מוביל במערב וככתם עוקב במזרח. הרווח ביניהם והחלוקה של השטח בין השניים הם להמחשה.",
    "regionsCredit": "קבוצות כתמי השמש של היום: NOAA Space Weather Prediction Center, סיכום אזורי השמש",
    "flaresCredit": "התפרצויות שמש: NOAA Space Weather Prediction Center, רשימת אירועים ערוכה",
    "cmeCredit": "פליטות מסה מהכתר: NASA DONKI (Moon to Mars Space Weather Analysis Office ו-CCMC)"
  },
  "clouds": {
    "live": "עננים: נראו {when}, {ago}, באינפרא-אדום על ידי {satellites}, דרך NASA GIBS. הפסגות הקרות ביותר, שם יש סופות רעמים, מצוירות גבוהות ולבנות יותר משאר העננים. מעל אירופה, אפריקה, האוקיינוס ההודי והקטבים, שאף אחד מהלוויינים האלה לא רואה, הם להמחשה.",
    "at": "ב-{time} UTC",
    "between": "בין {from} ל-{to} UTC",
    "atDated": "ב-{date} ב-{time} UTC",
    "betweenDated": "ב-{date} בין {from} ל-{to} UTC",
    "clockElsewhere": " השעון מורה {time} UTC ב-{date}; העננים נשארים כפי שהתמונה ההיא ראתה אותם.",
    "and": " ו-",
    "illustrative": "עננים: להמחשה. זו תמונה אחת של יום בעבר, שנודדת לאט; זה לא מזג האוויר של היום.",
    "illustrativeSaveData": "עננים: להמחשה. תמונות הלוויין של היום לא נטענות בחיבור שחוסך נתונים.",
    "illustrativeScrubbed": "עננים: להמחשה, כי השעון רחוק יותר מ-12 שעות מתמונת הלוויין האחרונה, מ-{date} ב-{time} UTC.",
    "gibsAcknowledgement": "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).",
    "satelliteCredit": "עננים בשידור חי: תצלומי אינפרא-אדום של GOES-East ו-GOES-West, NOAA; תצלומי אינפרא-אדום של Himawari, הסוכנות המטאורולוגית של יפן (JMA)."
  },
  "aurora": {
    "live": "זוהר קוטבי: איפה שמודל OVATION של NOAA צופה אותו בשעה הקרובה (התחזית שלו ל-{time} UTC, שנעשתה {ago}), לא תצלום. הקפלים העדינים שבו מצוירים.",
    "liveNoFolds": "זוהר קוטבי: איפה שמודל OVATION של NOAA צופה אותו בשעה הקרובה (התחזית שלו ל-{time} UTC, שנעשתה {ago}), לא תצלום.",
    "waiting": "זוהר קוטבי: התחזית של NOAA עדיין לא הגיעה.",
    "failed": "זוהר קוטבי: לא הצלחנו לקרוא את התחזית של NOAA כרגע, ולכן שום זוהר לא מצויר.",
    "far": "זוהר קוטבי: לא מצויר, כי השעון רחוק יותר משלוש שעות מהתחזית האחרונה של NOAA.",
    "saveData": "זוהר קוטבי: התחזית של NOAA לא נטענת בחיבור שחוסך נתונים.",
    "switchedOff": "זוהר קוטבי: כבוי בשכבות.",
    "credit": "זוהר קוטבי: תחזית של מודל OVATION Prime של NOAA Space Weather Prediction Center (נחלת הכלל).",
    "rightNow": "זוהר קוטבי צפוי ליד הקטבים",
    "rightNowReach": "זוהר קוטבי צפוי עד קו רוחב {lat}°",
    "rightNowValue": "Kp {kp}",
    "showMe": "עוף אל הזוהר בצד הלילה"
  },
  "weather": {
    "lightning": {
      "live": "ברקים: בערך {n} פגיעות בדקה במקום שמפת NOAA מגיעה אליו, אמריקה והאוקיינוס השקט (הספירה שלה עד {time}, {ago}). איפה ובאיזו תדירות נמדד; הרגע של כל הבזק מצויר, והוא גדול מהמציאות.",
      "quiet": "ברקים: כמעט אין במקום שמפת NOAA מגיעה אליו, אמריקה והאוקיינוס השקט (הספירה שלה עד {time}, {ago}).",
      "waiting": "ברקים: המפה של NOAA עדיין לא הגיעה.",
      "failed": "ברקים: לא הצלחנו לקרוא את המפה של NOAA כרגע, ולכן שום ברק לא מצויר.",
      "away": "ברקים: לא מצוירים, כי השעון רחוק יותר משעה מהמפה האחרונה של NOAA.",
      "off": "ברקים: לא נטענים במכשיר או בחיבור הזה.",
      "reducedMotion": "ברקים: לא מצוירים, כי המכשיר הזה מבקש פחות תנועה.",
      "switchedOff": "ברקים: כבויים בשכבות.",
      "credit": "ברקים: צפיפות פגיעות מ-NOAA nowCOAST, שהכין NWS Ocean Prediction Center מרשתות הקרקע NLDN ו-GLD360 (נחלת הכלל)."
    },
    "worlds": {
      "jupiter": "מזג אוויר: הרצועות מחליקות זו על פני זו במהירויות הרוח שנמדדו מ-Hubble, והכתם האדום הגדול מסתובב. תנועה ממודלת: שום ענן לא מצויר במקום שבו הוא נמצא היום.",
      "saturn": "מזג אוויר: הרצועות נעות במהירויות הרוח ש-Cassini מדד. תנועה ממודלת, לא העננים של היום. המשושה בקוטב הצפוני מצויר במקום שנמדד; המראה שלו להמחשה.",
      "venus": "מזג אוויר: שכבת העננים מקיפה את הכוכב בערך בארבעה ימים, כפי ש-Venus Express מדד, פי שישים מהר יותר מהקרקע. תנועה ממודלת, לא העננים של היום.",
      "uranus": "מזג אוויר: האוויר נסחף סביב במהירויות הרוח שנמדדו מ-Keck ומ-Gemini. תנועה ממודלת, לא העננים של היום.",
      "neptune": "מזג אוויר: האוויר זורם סביב במהירויות הרוח ש-Voyager 2 מדד, המהירות ביותר בכל כוכב לכת. תנועה ממודלת, לא העננים של היום.",
      "mars": "מזג אוויר: עכשיו {season} על מאדים. כיפות הכפור והאבק באוויר שלו, בעומק אופטי של בערך {tau}, הם מה שהעונה הזאת מביאה בדרך כלל: עונתי ולהמחשה, לא מזג האוויר של היום.",
      "titan": "מזג אוויר: הפסים החיוורים בצפון מייצגים את ענני המתאן שטלסקופי Webb ו-Keck ראו שם בנובמבר 2022 וביולי 2023. להמחשה: איפה העננים של טיטאן היום לא ידוע."
    },
    "also": {
      "venus": "ה-Y הכהה שמסתובב איתו הוא מה שמצלמות אולטרה-סגול רואות; לעין נוגה כמעט חלקה, והמקום שלו כאן להמחשה. על ברקים בנוגה דווח והם עדיין שנויים במחלוקת; שום ברק לא מצויר.",
      "uranus": "הכיפה הבהירה מעל הקוטב הצפוני אמיתית: הבהירות והצבע שלה, קו רוחב אחרי קו רוחב, נלקחו ממפה של Hubble מאוקטובר 2025, ו-Hubble צפה בה מבהיקה משנה לשנה ככל שמתקרב הקיץ הצפוני של 2028.",
      "neptune": "הסגלגל הכהה במפת האמן הוא הכתם הכהה הגדול של Voyager 2 מ-1989, שנעלם עד 1994: להמחשה, לא מצויר במראה נמדד. במראה קולנועי, עננים דקים של מתאן מטילים צללים, מצוירים רחבים וגבוהים פי שישה ממה שנמדד; כל פס הוא שלנו."
    },
    "flashes": {
      "jupiter": "בצד הלילה שלו, הבזקים נדירים מייצגים את הברקים ש-Juno מצא, רובם הרחק בצפון: קווי הרוחב נמדדו, כל הבזק הוא להמחשה ומצויר גדול מהמציאות.",
      "saturn": "בצד הלילה שלו, הבזקים נדירים בקו רוחב 36 מעלות דרום מייצגים את הברקים ש-Cassini צילם שם ב-2009: להמחשה וגדולים מהמציאות, ואיש לא צופה בהם עכשיו."
    },
    "seasons": [
      "אביב בחצי הכדור הצפוני",
      "קיץ בחצי הכדור הצפוני",
      "סתיו בחצי הכדור הצפוני",
      "חורף בחצי הכדור הצפוני"
    ]
  },
  "drawing": {
    "orbitLine": "הקו הוא הקפה אחת קדימה, שחושבה מאותם מרכיבים כמו הנקודה.",
    "orbitLineYear": "הקו הוא השנה הקרובה של המסלול שלו, שחושבה מאותם מרכיבים כמו הנקודה.",
    "orbitLineWhole": "הקו הוא כל המסלול שלו סביב השמש, שחושב מאותם מרכיבים כמו הנקודה.",
    "orbitLinePassage": "הקו הוא המעבר היחיד שלו דרך מערכת השמש, פנימה והחוצה, שחושב מאותם מרכיבים כמו הנקודה.",
    "variant": "מצויר לפי מידות שפורסמו עבור {name}",
    "family": "מצויר כ-{name} — הצורה והגובה של המשפחה, לא הגרסה המדויקת הזאת",
    "generic": "מצויר כטיל כללי; אין לנו מידות של {name}",
    "genericUnnamed": "מצויר כטיל כללי; אין לנו מידות של הרכב הזה",
    "disputed": "המקורות חלוקים לגבי הגובה שלו ({disputed})",
    "objectVariant": "מצויר לפי מידות שפורסמו עבור {name}",
    "objectModel": "מצויר לפי מודל שפורסם של {name}",
    "padEmpty": "המשטח הוא מקום שנמדד; {name} מצויר עליו רק בסביבות השיגורים שברשימה",
    "objectMapped": {
      "dawn": "פני השטח שלו הם פסיפס בשחור-לבן של החללית Dawn, צבוע באפור שבחרנו; הצללים במכתשים שלו הם אלה ש-Dawn צילמה, והם לא זזים כאן עם השמש"
    },
    "objectFamily": "מצויר כ-{name} — הסוג, לא הפריט המדויק הזה",
    "objectOwn": "מצויר כ-{name}",
    "objectMade": {
      "images": "הצורה נבנתה מצילומים; היחסים בערך",
      "render": "הצורה נבנתה מהדמיית אמן; היחסים בערך",
      "dimensions": "הצורה נבנתה ממידות ותמונות שפורסמו; הפרטים פושטו"
    },
    "objectWas": {
      "hitomi": "מוצג שלם, כפי ששוגר בפברואר 2016; הוא התפרק כעבור חמישה שבועות, ומה שנעקב כאן הוא הגוף הראשי שלו בלי לוחות השמש",
      "envisat": "מוצג יציב, כשהמכשירים שלו פונים אל כדור הארץ, כפי שטס בזמן שעבד; הוא מת מאז 2012 ואיש לא מנווט אותו",
      "ers1": "מוצג יציב, כשהמכשירים שלו פונים אל כדור הארץ, כפי שטס בזמן שעבד; המשימה שלו הסתיימה ב-2000 ואיש לא מנווט אותו"
    },
    "objectGeneric": "מצויר כאובייקט כללי; אין לנו צורה של {name}",
    "classShape": {
      "satellite": "לוויין כללי",
      "station": "תחנת חלל כללית",
      "debris": "פיסת פסולת",
      "rocket": "טיל כללי",
      "probe": "גשושית כללית",
      "telescope": "טלסקופ כללי",
      "asteroid": "אסטרואיד כללי",
      "dwarf": "גוף עגול פשוט בגודל שנמדד",
      "comet": "שביט כללי",
      "site": "אתר כללי על הקרקע",
      "star": "נקודת אור, בגודל שנקבע לפי כמה בהיר הוא נראה מהמקום שלך",
      "exoplanet": "סימן ליד הכוכב שלו — המסלול עצמו קטן מכדי לצייר",
      "dso": "זוהר רך בדרכו של סוגו, במרחק שנמדד, ברוחב שנמדד; הדוגמה שבתוכו להמחשה והצורה האמיתית שלו לא מצוירת",
      "exotic": "טבעת במרחק שנמדד; לחור שחור אין צורה לצייר, ופולסר קטן מכדי לצייר",
      "exoticStar": "טבעת במרחק שנמדד; הכוכב עצמו הוא נקודה בקנה המידה הזה"
    },
    "storm": "מצויר כסימן במרכזה; הסופה עצמה היא הענן שסביבו",
    "feature": "מקום עם שם: לא מצויר כאן דבר מלבד סימן במרכזו, שהוצב לפי המקור המצוטט; הקרקע שתחתיו היא המפה עצמה",
    "markOnly": "סימן במקומו; אין שם דבר שאפשר לצייר",
    "noPlace": "לא מצויר: אין לו מקום לסמן",
    "shower": "שם בנקודה שממנה נדמה שהמטאורים שלו באים, בתצוגת השמיים ליד שיאו; כיוון, לא מקום בחלל",
    "objectSpin": {
      "spin": "הוא מסתובב סביב הקוטב שנמדד שלו בקצב שנמדד; איזה צד פונה אל השמש ברגע הזה איננו תחזית",
      "pair": "שניהם מסתובבים סביב הקוטב שנמדד שלהם בקצבים שנמדדו, ו-Dimorphos מקיף במרחק ובזמן שנמדדו אחרי ש-DART פגעה בו; איפה הוא על המסלול הזה להמחשה",
      "comet": "הוא מסתובב סביב הקוטב שנמדד שלו בקצב שנמדד ב-2014, שהשמש שינתה בדקות בכל מעבר מאז; איזה צד פונה אל השמש ברגע הזה איננו תחזית",
      "still": "הוא מצויר בכיוון של מודל המכ״ם שלו ואינו מסתובב כאן: המודל לא קובע לאיזה כיוון מצביע ציר הסיבוב שלו"
    },
    "objectSeen": {
      "lutetia": "התמונות של Rosetta כיסו יותר ממחצית מפני השטח שלו; שאר הצורה מותאמת לפי שינויי הבהירות שלו, לא צולמה",
      "steins": "התמונות של Rosetta כיסו בערך 60 אחוז מפני השטח שלו; שאר הצורה מותאמת לפי שינויי הבהירות שלו, לא צולמה",
      "donj": "הצורה נבנתה מהתמונות של Lucy בפוטוגרמטריה סטריאו ובהתאמת קו המתאר שלו; הצד ש-Lucy לא ראתה הוא ההתאמה",
      "arrokoth": "התמונות של New Horizons מכסות את הצד שלידו היא טסה; הצד השני משוער, לא צולם, והצבע הוא מפת ההחזרתיות שלו בגוון אדום",
      "radar": "הצורה נבנתה מהד מכ״ם, לא מתמונות: קו המתאר שלו נמדד והפרטים הדקים ביותר שלו לא",
      "comet": "הצורה היא של Rosetta, מיותר מ-20 000 תמונות במשך שנתיים, וכל פני השטח מכוסים"
    },
    "objectRelief": "המודל פושט, והבליטה הדקה עליו היא של המודל המלא עצמו, שנאפתה בפני השטח",
    "worldFlat": "מצויר ככדור פשוט: אין כאן מפת פני שטח של {name}, והצבע האחד שלו נבחר מתיאורים שפורסמו, לא נמדד",
    "worldFlatIrregular": "מצויר ככדור פשוט בגודל הרדיוס הממוצע שלו: אין כאן מפת פני שטח של {name}, הצבע האחד שלו נבחר מתיאורים שפורסמו, לא נמדד, ו{name} הוא באמת סלע מגושם שהצורה האמיתית שלו לא מצוירת",
    "worldFlatShaped": "מצויר בצורה שנמדדה ובצבע אחד: אין כאן מפת פני שטח של {name}, והצבע נבחר מתיאורים שפורסמו, לא נמדד",
    "worldShaped": "מצויר בצורה שנמדדה",
    "worldMap": {
      "tinted": "פני השטח שלו הם פסיפס בשחור-לבן, צבוע בצבע שנבחר מתיאורים שפורסמו",
      "toned": "הצבעים שלו באים מתמונות אינפרא-אדום, ירוק ואולטרה-סגול, ומרוככים לעבר מה שהעין הייתה רואה",
      "redblue": "הצבעים שלו באים מהתמונות האדומות והכחולות של New Horizons, כשהירוק נלקח באמצע ביניהן והצבע חזק פי אחד וחצי; החלקים שצולמו רק בשחור-לבן קיבלו את הצבע הממוצע של המפה",
      "enhanced": "הצבעים שלו הם אלה ש-NASA פרסמה, שהורכבו משלושה ממסנני הצבע של New Horizons, שאף אחד מהם אינו ירוק: זה צבע מוגבר, חזק יותר ושונה ממה שהעין הייתה רואה",
      "balanced": "הצבעים שלו באים מתמונות כתומות, ירוקות וכחולות, מאוזנים לצבע שפורסם שלו ומרוככים לעבר מה שהעין הייתה רואה",
      "infrared": "פני השטח שלו הם מפת אינפרא-אדום קרוב שנעשתה דרך הערפל, צבועה ומרוככת; באור נראה הערפל מסתיר את הקרקע",
      "natural": "הצבעים שלו הם צבע טבעי, מהאור האדום והכחול שמצלמת הצבע של New Horizons מדדה, כשהירוק, שלא היה לה מסנן עבורו, מוערך בין השניים וחזק פי שניים וחצי מזה של המצלמה עצמה, כפי שתמונות הצבע הטבעי של NASA מראות אותו",
      "matched": "הצבעים שלו מתחילים באור האדום והכחול שמצלמת הצבע של New Horizons מדדה, כשהירוק, שלא היה לה מסנן עבורו, מוערך בין השניים, ואז הם מותאמים, גוון אחר גוון, לתמונת הצבע של NASA עצמה של הפנים האלה (PIA19952): חזקים מאלה של המצלמה, כפי ש-NASA פרסמה"
    },
    "worldCoverage": {
      "miranda": "רק החצי הדרומי צולם, על ידי Voyager 2 ב-1986; השאר נשאר חלק, לא מנוחש",
      "ariel": "רק החצי הדרומי צולם, על ידי Voyager 2 ב-1986; השאר נשאר חלק, לא מנוחש",
      "umbriel": "רק החצי הדרומי צולם, על ידי Voyager 2 ב-1986; השאר נשאר חלק, לא מנוחש",
      "titania": "רק החצי הדרומי צולם, על ידי Voyager 2 ב-1986; השאר נשאר חלק, לא מנוחש",
      "oberon": "רק החצי הדרומי צולם, על ידי Voyager 2 ב-1986; השאר נשאר חלק, לא מנוחש",
      "triton": "Voyager 2 צילמה חלק ממנו ב-1989; השאר נשאר חלק, לא מנוחש",
      "pluto": "הדרום הרחוק היה בחשכת חורף כש-New Horizons חלפה ב-2015: הקרקע המצוירת שם ממודלת, מרקם קלוש בצבעי הקרקע שמעליה, לא תצלום",
      "charon": "הדרום הרחוק היה בחשכת חורף כש-New Horizons חלפה ב-2015: הקרקע המצוירת שם ממודלת, מרקם קלוש בצבעי הקרקע שמעליה, לא תצלום"
    },
    "worldLit": "מואר כפי שמצלמה שנחשפה לאור השמש שלו הייתה מראה אותו",
    "worldLight": "מרחוק הוא נקודת אור בבהירות שחושבה: הזוהר הוא הדרך שבה מצלמה מתעדת נקודה בהירה מכדי להבחין בה",
    "exoticDeparture": {
      "pulseSlowed": "ההבהוב שלו מצויר איטי פי {n} מהסיבוב שלו, כדי שהעין תוכל לעקוב",
      "pulseTrue": "ההבהוב שלו מצויר בקצב הסיבוב שלו",
      "portrait": "כל עוד הכרטיס הזה פתוח, מודל שלו מצויר במקומו, גדול בהרבה ממה שהיה נראה מכאן: הצל והאור מתעקמים סביבו כפי שהמסה שלו גורמת להם, והדיסק ממודל"
    },
    "worldDeparture": {
      "earth": "במסך גדול יותר ההרים שלו הם מגבהי ETOPO 2022 של NOAA, מצוירים תלולים פי {relief} ממה שהם כדי ששמש נמוכה תראה אותם; הזוהר של האוויר סביב השפה שלו מצויר גבוה פי {air} מהאוויר; ממסלול נמוך במסך גדול יותר העננים שלו מזדקרים לעבר האופק ותחת שמש נמוכה, מצוירים עבים פי {clouds} ממה שהם כדי שאפשר יהיה לראות את ההטיה שלהם, את הצללים הארוכים שלהם ואת האור האחרון על פסגותיהם (בעובי האמיתי שלהם במראה נמדד), וגובה כל פסגה נקבע לפי הטמפרטורה שנמדדה שלה היכן שתמונת היום מכסה, ולפי בהירות מפת העננים בשאר המקומות",
      "mercury": "במסך גדול יותר הבליטה שלו היא ממודל הגבהים של MESSENGER, מצוירת תלולה פי {steep} ממה שנמדד כדי שקצוות המכתשים יתפסו את האור",
      "pluto": "הקרקע הבהירה והכהה שלו מצוירת בניגודיות גבוהה פי {plutoContrast} מזו של תמונת המצלמה, קרוב יותר להחזרתיות שנמדדה; הצד ש-New Horizons ראתה רק מרחוק מרוכך לחדות שלו עצמו; במסך גדול יותר הבליטה שלו היא מגבהי הסטריאו של New Horizons, היכן שיש כאלה, מצוירת תלולה פי {plutoSteep} ממה שנמדד; הערפל הכחול הדק בשפה שלו מצויר כזוהר, בהיר ביותר מול השמש, ועוצמתו נבחרה",
      "mars": "במסך גדול יותר הבליטה שלו היא מהגבהים שמד הגבהים בלייזר של Mars Global Surveyor מדד, מצוירת תלולה וגבוהה פי {mola} ממה שהם כדי ששמש נמוכה תראה אותם: הצללים ש-Olympus Mons וקירות הקניונים מטילים ארוכים פי כמה מדי.",
      "venus": "הזוהר סביב השפה שלו ומעבר לצד היום שלו מייצג ערפל עמוק; עד כמה הוא עבה מצויר ועד כמה הוא מגיע להמחשה; במראה קולנועי רצועות העננים שלו מצוירות בניגודיות גבוהה פי {uv} מזו של המפה שלו, כפי שמצלמות אולטרה-סגול רואות אותן (לעין הן כמעט חלקות), והמראה נמדד מראה את המפה כמות שהיא; הקרקע שלו, לפי מכ״ם, בבליטה ממד הגבהים של Magellan, מצוירת תלולה וגבוהה פי {ground} ממה שנמדד",
      "neptune": "במראה קולנועי חמש הקשתות של הטבעת החיצונית שלו מצוירות כפי ש-Voyager 2 ראתה אותן ב-1989, מסתובבות במהירות שנמדדה; איפה הן סביב הטבעת היום לא מחושב, ושתיים מהן דהו או זזו מאז",
      "saturn": "הרצועות שלו מצוירות בניגודיות גבוהה פי {contrast} מזו של המפה שלו, התאמה שלנו; “כפי ש-Hubble ראה” לא מותאם; במסך גדול יותר ומקרוב, הטבעות הדקות והפערים בטבעות שלו נמצאים היכן ש-Cassini מדדה אותם דרך האור של כוכב ב-2008, מונחים על המפה, ובמראה קולנועי מצויר הנצנוץ של גרגרים קרובים עוד יותר; בתוך כמה קילומטרים מהטבעות במסך גדול יותר, במראה קולנועי, החלקיקים הגדולים ביותר שלהן, ברוחב שניים עד חמישה מטרים, מצוירים ככדורי קרח: כמה יש וכמה גדולים נובע מפיזור הגדלים שנמדד ומהעומק האופטי של הטבעות, אבל איפה כל אחד נמצא, והגושים בטבעת A, להמחשה, והם מצוירים נייחים, כאילו טסת איתם",
      "titan": "ממש מעל הערפל שלו, בגובה של בערך 500 ק״מ, מצוירת שכבת ערפל דקה ומנותקת במקום ש-Cassini ראתה אותה ב-2005 עד 2007; היא שקעה ודהתה בשנים שאחר כך, ואיפה היא עכשיו לא ידוע"
    },
    "worldEarthshine": "הצד החשוך שלו זוהר באור כדור הארץ, האור של כדור הארץ עצמו, מצויר בהיר פי {n} ממה שהמצלמה הזאת הייתה קולטת, בערך כפי שהעין רואה אותו",
    "worldAir": "האוויר שלו מצויר עבה פי {n} ממה שהוא כדי שיהיה נראה בגודל הזה, והצבע של הערפל שלו להמחשה",
    "worldAirTrue": "הערפל שלו מצויר בגובה שנמדד, והצבע שלו להמחשה",
    "worldRings": "הטבעות שלו נמצאות במרחקים שנמדדו, מצוירות רחבות פי {w} ובהירות הרבה יותר ממה שהן כדי שיהיו נראות: האמיתיות הן חוטים כהים כמו פחם",
    "worldRingsDense": "הטבעות שלו נמצאות במרחקים שנמדדו, מצוירות רחבות פי {w}, אטומות פי {d} ובהירות הרבה יותר ממה שהן כדי שיהיו נראות: האמיתיות הן חוטים קלושים כהים כמו פחם",
    "worldSun": "מקרוב, השפה שלו מתכהה ומאדימה כפי שמודל האטמוספרה שלו אומר שצריך; הגרגיר מייצג את פני השטח הגועשים שלו: התאים שלו נולדים, מבהיקים ודועכים כמו גרגירים אמיתיים, מצוירים גסים מכפי שהם (עד הגודל האמיתי שלהם מקרוב מאוד) ומהירים הרבה יותר, והרשת הבהירה לעבר השפה להמחשה; מקרוב מאוד המפה המצולמת פוסחת את מקומה לפני השטח המצויר, שגם הוא להמחשה; הכתר להמחשה, ומצויר בהיר בהרבה ממה שהוא כדי שאפשר יהיה לראות אותו; הלולאות והמשוכות על השפה שלו עומדות היכן שהאזורים הפעילים של NOAA קרובים לקצה, והצורות והגבהים שלהן להמחשה; הכוכבים לידו דהויים, כי הבוהק שלו מסתיר אותם מכל מצלמה",
    "worldMosaic": "מתחת למצלמה עכשיו: {title}, מצויר כאן בערך ב-{res} לפיקסל.",
    "worldMosaicDetail": "מתחת למצלמה עכשיו: {title}, מחדד את מפת הצבעים בערך ב-{res} לפיקסל.",
    "worldRelief": "הבליטה שלו היא מ-{title}: ציור של שיפועים תחת אור קבוע אחד. השיפועים לאורך האור הזה מוארים מחדש על ידי השמש היכן שהיא עכשיו, תלולים פי {n} ממה שנמדד; השיפועים לרוחבו לא מצוירים.",
    "worldReliefTrue": "הבליטה שלו היא מ-{title}: ציור של שיפועים תחת אור קבוע אחד. השיפועים לאורך האור הזה מוארים מחדש על ידי השמש היכן שהיא עכשיו; השיפועים לרוחבו לא מצוירים.",
    "worldReliefBaked": "הגבעות שלו מוצללות במפה הזאת תחת אור קבוע, לא על ידי השמש היכן שהיא עכשיו.",
    "mount": "המקום שבו אנחנו תולים אותו על המודל הוא סידור שלנו, והוא מצויר גדול בהרבה ממה שהוא — בגודל אמיתי הוא קטן מכדי לראות"
  },
  "trip": {
    "notEnoughStops": "רק {count} מהתחנות במסע הזה אפשר למצוא כרגע, והוא צריך {min}.",
    "heldBody": "לא הצלחנו למצוא את זה כרגע. כל השאר במסע ממשיך לעבוד.",
    "heldTitle": "לא הצלחנו למצוא את זה",
    "stopOf": "תחנה {n} מתוך {count}",
    "planning": "מחשב מה אפשר להציג…",
    "shape": "{count} תחנות · {mins} דק׳",
    "shapeOneMinute": "{count} תחנות · דקה",
    "startTitle": "צא למסע הזה",
    "nextEventLine": "הבא: {date}",
    "introStart": "התחל",
    "introSkip": "לא עכשיו",
    "introMicro": "מסע מודרך",
    "stopsLabel": "תחנות",
    "startAtTitle": "התחל את המסע בתחנה {n}",
    "droppedOne": "תחנה אחת לא יכולה להיות מוצגת היום ואינה נספרת למעלה.",
    "droppedMany": "{n} תחנות לא יכולות להיות מוצגות היום ואינן נספרות למעלה.",
    "clockClamped": "הזמן הוחזר למהירות רגילה בשביל המסע הזה.",
    "clockMoves": "המסע הזה מזיז את השעון. הוא יוחזר כשתעזוב.",
    "clockRestored": "העזיבה מחזירה את השעון למקום שבו היה.",
    "stopTimeNow": "מוצג עכשיו",
    "stopTimeAt": "מוצג ב-{when}",
    "stopTimeRate": "מוצג ב-{when}, רץ {rate}",
    "stopTimePaused": "מוצג ב-{when}, מוקפא כל עוד המסע מושהה",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "הצל חושב ממיקומי הירח והשמש; התזמון מ-Astronomy Engine, בדיוק של כדקה. הקווים הדקים והרצועה החיוורת מסמנים את קצות הצל ואת מסלול הליבה שלו: קווים על מפה, לא אור.",
    "eclipseLineLatched": "הצל לא מצויר במכשיר הזה; התזמון נכון.",
    "eclipseColour": "הצבע הוא להמחשה; הצל חושב.",
    "orbitsLine": "כוכבי הלכת מצוירים גדולים ממה שהם, כנקודות; המקומות והמסלולים שלהם חושבו.",
    "moonPathLine": "כדור הארץ והירח מצוירים גדולים ממה שהם, כנקודות, כל אחד מואר בצד הפונה אל השמש. המקום של הירח והמסלול שלו חושבו.",
    "systemLine": "הגדלים והמסלולים מ-NASA Exoplanet Archive; הצבעים{phase} והשיפוע של המסלולים הם להמחשה.",
    "systemPhaseUnknown": ", המקומות של כוכבי הלכת על המסלולים שלהם",
    "rateWords": {
      "10": "פי עשרה מהר מהחיים",
      "60": "דקה בשנייה",
      "600": "עשר דקות בשנייה",
      "3600": "שעה בשנייה",
      "36000": "עשר שעות בשנייה",
      "525600": "יממה בכל שישית שנייה"
    },
    "rateGeneric": "פי {n} מהר מהחיים",
    "yourPlace": "המקום שלך",
    "observerSet": "המקום שלך: {place}, כפי שהגדרת.",
    "observerDevice": "המקום שלך: ליד המקום שהמכשיר שלך אומר שאתה נמצא בו.",
    "observerGuess": "המקום שלך הוא ניחוש לפי אזור הזמן של השעון שלך: {place}. הגדר אותו תחת ״איפה אתה״ כדי לקבל מקום מדויק יותר.",
    "needsPlace": "צריך מקום. הגדר קודם איפה אתה.",
    "stationFromYou": "ממש עכשיו היא במרחק {km} ק״מ ממך.",
    "drawnAtClassSize": "המודל מצויר ברוחב {px} פיקסלים בכל מרחק; התחנה האמיתית הייתה נקודה בהירה.",
    "passNight": "במעבר הזה היא מוארת בשמש על רקע שמיים חשוכים: אפשר לראות אותה, אם מזג האוויר מאפשר.",
    "passDay": "לא תראה את המעבר הזה: השמיים שלך בהירים מדי, או שהתחנה בצל של כדור הארץ.",
    "lookMoonUp": "הירח מואר ב-{pct}%, {alt} בכיוון {az}.",
    "lookMoonDown": "הירח מתחת לאופק שלך בשעה הזאת. הוא עולה ב-{time}.",
    "lookMoonDownNoRise": "הירח מתחת לאופק שלך בשעה הזאת.",
    "lookWorldUp": "{name} נמצא {alt} בכיוון {az}.",
    "lookWorldDown": "{name} מתחת לאופק שלך בשעה הזאת.",
    "lookPlanet": "כוכב הלכת הבהיר ביותר שמעל האופק בשעה הזאת הוא {name}: {alt} בכיוון {az}.",
    "lookNoPlanet": "אין כרגע כוכב לכת שאפשר לראות בעין בלתי מזוינת מעל האופק. התצוגה פונה לאן שהם יעברו.",
    "lookStar": "הכוכב הבהיר ביותר שמעל האופק בשעה הזאת הוא {name}: {alt} בכיוון {az}.",
    "lookFigure": "במיקום הטוב ביותר בשעה הזאת: {name}, {alt} בכיוון {az}.",
    "lookNoFigure": "אף אחת מהדמויות המוכרות אינה במיקום טוב בשעה הזאת.",
    "lookNoPass": "לא נמצא מעבר של התחנה מעל המקום שלך בשבוע הקרוב.",
    "lookDaylight": "השמיים שלך לא חשוכים בשעה הזאת, ולכן עדיין אין מה לזהות.",
    "lookMilkyWay": "התצוגה פונה אל שביל החלב במקום שבו הוא עובר דרך {name}, {alt} בכיוון {az}. שלושת השמיים הם מודל של לילה בהיר ממוצע.",
    "lookNoMilkyWay": "שביל החלב נמוך על האופק שלך בשעה הזאת, ולכן התצוגה פונה גבוה בשמיים.",
    "lookShower": "ממטר המטאורים הבא הוא {name}, במיטבו בסביבות {date}.",
    "lookShowerUp": "נקודת המוצא שלו נמצאת {alt} בכיוון {az} בשעה הזאת.",
    "lookShowerDown": "נקודת המוצא שלו מתחת לאופק שלך בשעה הזאת; התצוגה פונה לאן שתעלה.",
    "lookShowerRate": "בשיא, ממקום חשוך כשנקודת המוצא גבוהה: בערך {rate} מטאורים בשעה.",
    "lookShowerMoon": {
      "dark": "הירח מואר ב-{pct}% באותו לילה, ולכן השמיים נשארים חשוכים.",
      "some": "הירח מואר ב-{pct}% באותו לילה ויסתיר חלק מהעמומים.",
      "bright": "הירח מואר ב-{pct}% באותו לילה ויסתיר את כולם חוץ מהבהירים."
    },
    "approachNext": "הבא בטבלה של NASA JPL: {name}, ב-{date}, במרחק של פי {ld} מהמרחק לירח.",
    "approachNextFar": "הבא בטבלה של NASA JPL: {name}, ב-{date}.",
    "approachNone": "הטבלה של NASA JPL של מעברים קרובים לא נטענה, ולכן לא נקרא מעבר הבא.",
    "satellitesCount": "{n} לוויינים פעילים בקטלוג שהדף הזה טען מ-CelesTrak, {starlink} מהם של Starlink.",
    "satellitesLoading": "הקטלוג עדיין נטען; המספר יופיע כשיסתיים.",
    "portraitLine": "מודל, לא תצלום: הצל וטבעת האור שמתעקמת סביבו הם מה שהמסה שלו גורמת להם להיות, הדיסק הזוהר ממודל, והכוכבים שמאחור לא מתעקמים. הוא מצויר גדול בהרבה ממה שהיה נראה מכאן; המקום נמדד. התצלום של Event Horizon Telescope נמצא בכרטיס שלו: {credit} · {licence}.",
    "tonightUp": "מ{place} הלילה: מעל האופק מ-{begin} עד {end}, הכי גבוה ב-{time}, {alt} בכיוון {az}.",
    "tonightGlare": "מ{place} הלילה: {name} קרוב מדי לשמש מכדי שאפשר יהיה לראות אותו.",
    "tonightDown": "מ{place} הלילה: {name} אינו מעל האופק בזמן שהשמיים חשוכים.",
    "frameLabel": "מסע מודרך",
    "stopRole": "תחנה",
    "liveLabel": "תחנה {n} מתוך {count}: {title}",
    "stopMicro": "תחנה {n} מתוך {count}",
    "progressShort": "{n} / {count}",
    "pause": "השהה",
    "pauseTitle": "השהה (רווח)",
    "play": "הפעל",
    "resume": "המשך",
    "resumeTitle": "חזור לתחנה והמשך (רווח)",
    "back": "התחנה הקודמת",
    "backTitle": "התחנה הקודמת (→)",
    "next": "התחנה הבאה",
    "nextTitle": "התחנה הבאה (←)",
    "replay": "שוב",
    "replayTitle": "הפעל את התנועה הזאת שוב (R)",
    "share": "שיתוף",
    "shareTitle": "שתף קישור לתחנה הזאת",
    "collapse": "הסתר כרטיס",
    "collapseTitle": "הסתר את הכרטיס וצפה (C)",
    "expand": "הצג כרטיס",
    "expandTitle": "החזר את הכרטיס (C)",
    "soundOn": "צליל",
    "volume": "עוצמה",
    "volumeTitle": "עוצמת המוזיקה, הצלילים והקול",
    "volumeValue": "{pct} אחוז",
    "voiceWill": "קול יקריא את זה. הוא סינתטי.",
    "voiceCan": "קול סינתטי יכול להקריא את זה: לחץ על קול.",
    "soundOnTitle": "המוזיקה והצלילים פועלים: כבה אותם (M)",
    "soundOffTitle": "המוזיקה והצלילים כבויים: הפעל אותם (M)",
    "voice": "קול",
    "voiceOnTitle": "קול סינתטי מקריא כל תחנה: כבה אותו והשאר את המוזיקה (V)",
    "voiceOffTitle": "הקרא כל תחנה בקול סינתטי (V)",
    "present": "הצגה",
    "presentTitle": "הצג את המסע בפני חדר: מילים גדולות, בלי לוחות, אתה לוחץ על הבא",
    "presentOffTitle": "צא ממצב הצגה והחזר את הלוחות",
    "presentAuto": "אוטומטי",
    "presentAutoOffTitle": "כל תחנה ממתינה ללחיצה על הבא: תן למסע להתקדם מעצמו (A)",
    "presentAutoOnTitle": "המסע מתקדם מעצמו: תן לכל תחנה להמתין ללחיצה על הבא (A)",
    "fullScreen": "מסך מלא",
    "fullScreenTitle": "מלא את כל המסך (F)",
    "fullScreenOffTitle": "צא ממסך מלא (F)",
    "leave": "צא",
    "leaveTitle": "צא מהמסע. המצלמה נשארת בדיוק במקומה. (Escape)",
    "leaveTitleStage": "צא מהמסע. המפה חוזרת אל העולם שהיה במרכזה קודם, וזה מזיז את המצלמה. (Escape)",
    "progressLabel": "כמה התקדמת במסע",
    "controlsLabel": "כפתורי המסע",
    "pausedChip": "המסע מושהה",
    "endMicro": "סוף המסע",
    "endBody": "המצלמה נשארת במקומה. שום דבר כאן לא חוזר אחורה.",
    "endBodyStage": "״המשך לטוס״ נשאר כאן בחוץ. ״הביתה״ מחזיר את המפה אל העולם שהיה במרכזה לפני המסע.",
    "endExplore": "המשך לטוס",
    "endExploreTitle": "שמור את התצוגה הזאת והמשך בעצמך",
    "endStayTitleStage": "הישאר כאן בחוץ והמשך לטוס מהמקום שבו המסע הסתיים",
    "endHome": "הביתה",
    "endExploreTitleStage": "המשך בעצמך, בחזרה במפה שממנה התחלת",
    "endSend": "שלח תמונה",
    "endSendTitle": "הכן גלויה מהמקום שבו המסע הסתיים, עם המילים שלו וקישור",
    "endReplay": "צפה שוב",
    "endReplayTitle": "צפה במסע הזה שוב מההתחלה",
    "endShareTitle": "שתף קישור למסע הזה",
    "endNextMicro": "המסע הבא",
    "endNext": "הבא: {title}",
    "docTitle": "Space Radar — {title} — תחנה {n} מתוך {count}"
  },
  "sky": {
    "radiant": "נקודת המוצא של {name}",
    "bodies": {
      "sun": "שמש",
      "moon": "ירח",
      "mercury": "כוכב חמה",
      "venus": "נוגה",
      "mars": "מאדים",
      "jupiter": "צדק",
      "saturn": "שבתאי",
      "uranus": "אורנוס",
      "neptune": "נפטון"
    },
    "fov": {
      "degrees": "שדה {deg}° · {name}",
      "arcmin": "שדה {min}′ · {name}",
      "names": {
        "eye": "עין",
        "binoculars": "משקפת",
        "telescope": "טלסקופ"
      }
    },
    "lines": {
      "sunPath": "מסלול השמש",
      "equator": "קו המשווה של השמיים",
      "poleNorth": "הקוטב הצפוני של השמיים",
      "poleSouth": "הקוטב הדרומי של השמיים"
    },
    "what": {
      "star": "כוכב",
      "starMag": "כוכב · בהירות {mag}",
      "planet": "כוכב לכת · בהירות {mag}",
      "sun": "הכוכב שלנו",
      "moon": "הירח של כדור הארץ",
      "dso": "עמוק בשמיים",
      "dsoMag": "{kind} · בהירות {mag}",
      "open": "{name}, {sub}. פתח את הכרטיס שלו.",
      "plain": "{name}, {sub}.",
      "openTitle": "פתח את הכרטיס שלו"
    },
    "compassShort": [
      "צ",
      "צ-צ-מ",
      "צ-מ",
      "מ-צ-מ",
      "מ",
      "מ-ד-מ",
      "ד-מ",
      "ד-ד-מ",
      "ד",
      "ד-ד-מע",
      "ד-מע",
      "מע-ד-מע",
      "מע",
      "מע-צ-מע",
      "צ-מע",
      "צ-צ-מע"
    ],
    "lookLine": "הבט לכיוון {dir}, {fists}, ב-{time}. הוא נע במשך כ-{mins} דקות.",
    "lookLineNoDuration": "הבט לכיוון {dir}, {fists}, ב-{time}.",
    "sunlit": "הוא עדיין תופס אור שמש, וזה מה שמאפשר לראות אותו.",
    "notSunlit": "הוא בצל של כדור הארץ במעבר הזה, ולכן לא תראה אותו.",
    "fistsHorizon": "ממש מעל האופק",
    "fistsOverhead": "כמעט ישר למעלה",
    "fistsOne": "בערך אגרוף אחד מעל האופק",
    "fistsMany": "בערך {n} אגרופים מעל האופק",
    "noObserver": "הגדר איפה אתה, והשורה הזאת תגיד לך לאן להסתכל.",
    "noPass": "הוא לא עולה מעל האופק שלך ב-24 השעות הקרובות.",
    "notVisibleFromGround": "זה רחוק מדי מכדי לזהות בעין.",
    "leftGround": "עזבנו את הקרקע כדי לעוף לשם. ״הלילה״ הוא השמיים.",
    "nakedEye": "בהיר מספיק כדי לראות בעיניים שלך ממקום חשוך.",
    "needsTelescope": "עמום מדי לעין; טלסקופ, או צילום ארוך, יראו אותו.",
    "starOnly": "אפשר לראות רק את הכוכב שלו, ורק בטלסקופ; כוכב הלכת עצמו עמום מדי בהרבה.",
    "onTheGround": "זה עומד על הקרקע, ולכן אין מה להסתכל למעלה.",
    "storm": "מהקרקע זה מזג האוויר עצמו. ממסלול זו ספירלה של עננים ברוחב מאות קילומטרים.",
    "onAnotherWorld": "זה עומד על {world}. לא תזהה אותו בעין מכאן, גם בלילה בהיר.",
    "worldRise": "מהמקום שבו אתה נמצא הוא עולה ב-{time}.",
    "worldHere": "המקום שבו אתה",
    "worldFrom": {
      "down": "מ{place}: עולה {rise} בכיוון {riseDir}, הכי גבוה {highTime}, {highAlt}; שוקע {set} בכיוון {setDir}.",
      "downNoSet": "מ{place}: עולה {rise} בכיוון {riseDir}, הכי גבוה {highTime}, {highAlt}.",
      "up": "מ{place}: מעל האופק עכשיו, {alt}, בכיוון {dir}. הכי גבוה {highTime}, {highAlt}; שוקע {set} בכיוון {setDir}.",
      "upPast": "מ{place}: מעל האופק עכשיו, {alt}, בכיוון {dir}. עבר את הנקודה הגבוהה ביותר; שוקע {set} בכיוון {setDir}.",
      "never": "מ{place} הוא לא עולה ביום וחצי הקרובים.",
      "always": "מ{place}: מעל האופק עכשיו, {alt}, בכיוון {dir}. הוא לא שוקע היום.",
      "honest": "חושב לאופק בגובה פני הים; גבעות ובתים לא נכללים בו."
    },
    "worldNoRise": "אפשר לראות אותו בעיניים שלך. החישוב של מתי הוא עולה מהמקום שלך עדיין לא בגרסה הזאת.",
    "worldSee": {
      "pluto": "לא בעין, ולא במשקפת: פלוטו עמום פי כמעט 3 000 מהכוכב העמום ביותר שאפשר לראות, ולכן צריך טלסקופ.",
      "io": "משקפת רגילה מראה אותו כנקודת אור ליד צדק; בעין הוא אובד בבוהק של צדק.",
      "europa": "משקפת רגילה מראה אותו כנקודת אור ליד צדק; בעין הוא אובד בבוהק של צדק.",
      "ganymede": "משקפת רגילה מראה אותו כנקודת אור ליד צדק; בעין הוא אובד בבוהק של צדק.",
      "callisto": "משקפת רגילה מראה אותו כנקודת אור ליד צדק; בעין הוא אובד בבוהק של צדק.",
      "titan": "לא בעין: טיטאן בבהירות 8.2 במיטבו, ולכן צריך טלסקופ קטן או משקפת חזקה, והבוהק של שבתאי לידו מקשה גם על זה.",
      "enceladus": "לא בעין: אנקלדוס בבהירות 11.7, וקרוב כל כך לשבתאי הבהיר ולטבעות שלו שקשה לראות אותו אפילו בטלסקופ קטן.",
      "triton": "לא בעין ולא במשקפת: טריטון בבהירות 13.5, עמום פי 600 בערך מהכוכב העמום ביותר שאפשר לראות, ולכן צריך טלסקופ.",
      "charon": "בקושי: כארון בבהירות 16.8, עמום פי 13 000 מהכוכב העמום ביותר שאפשר לראות, וקרוב כל כך לפלוטו שחובבים הפרידו בין הזוג ב-2008 בצילום דרך טלסקופ של 14 אינץ׳.",
      "phobos": "לא בעין: פובוס בבהירות 11.3 במיטבו וצמוד למאדים, שהבוהק שלו מטביע אותו; הוא התגלה ב-1877 בטלסקופ של 26 אינץ׳.",
      "deimos": "לא בעין: דימוס בבהירות 12.4 במיטבו וקרוב למאדים, שהבוהק שלו מטביע אותו; הוא התגלה ב-1877 בטלסקופ של 26 אינץ׳.",
      "neptune": "לא בעין: נפטון בבהירות 7.7 עד 7.9, עמום מדי כדי לראות בלי עזרה. משקפת חזקה או טלסקופ מראים אותו כדיסק כחול קטן.",
      "mimas": "לא בעין: מימס בבהירות 12.9 וצמוד לשבתאי, ולכן צריך טלסקופ גדול ולילה יציב.",
      "tethys": "לא בעין: תטיס בבהירות 10.2, בהישג של טלסקופ קטן, אם כי הבוהק של שבתאי לידו מקשה.",
      "dione": "לא בעין: דיוני בבהירות 10.4, בהישג של טלסקופ קטן, אם כי הבוהק של שבתאי לידו מקשה.",
      "rhea": "לא בעין: ריאה בבהירות 10, הבהיר מירחי שבתאי אחרי טיטאן, וטלסקופ קטן יראה אותו.",
      "iapetus": "לא בעין: יאפטוס נע בין בהירות 10.2 ל-11.9 כשהצד הבהיר והצד הכהה שלו מתחלפים בפנייה אלינו, ולכן טלסקופ קטן תופס אותו במיטבו.",
      "miranda": "בקושי: מירנדה בבהירות 16.6, אבודה בבוהק של אורנוס, ובלתי נראית בהרבה טלסקופים של חובבים.",
      "ariel": "לא בעין ולא במשקפת: אריאל בבהירות 14.8, בערך עמום כמו פלוטו כשהוא קרוב ביותר, ולכן צריך טלסקופ טוב ושמיים חשוכים.",
      "umbriel": "לא בעין ולא במשקפת: אומבריאל בבהירות 15.1, העמום מבין ארבעת הגדולים של אורנוס, ולכן צריך טלסקופ טוב ושמיים חשוכים.",
      "titania": "לא בעין: טיטניה בבהירות 13.9, הבהיר מירחי אורנוס, ועדיין צריך טלסקופ בגודל מסוים.",
      "oberon": "לא בעין: אוברון בבהירות 14.1 ורחוק ביותר מאורנוס מבין החמישה, ולכן צריך טלסקופ ולילה יציב."
    },
    "couldNotLook": "לא הצלחנו לחשב מעבר מכאן.",
    "nowhereToLook": "אף אחד לא יודע איפה זה נמצא, ולכן אין לאן להסתכל."
  },
  "controls": {
    "title": "בקרים",
    "layersTitle": "מה להציג",
    "layerCount": "{n}",
    "layerCountLoading": "סופר",
    "layerHint": {
      "exoplanets": "כבוי. סמן כדי להציג אותם."
    },
    "layerCountEmpty": "ריק",
    "layerCountEmptyTitle": "השכבה הזאת חזרה ריקה: לא הצלחנו לקרוא את המקור שלה, או שאין בו כלום עכשיו.",
    "layerWaits": "עדיין לא",
    "layerWaitsTitle": "נטענת כשמפעילים אותה, כדי לחסוך נתונים.",
    "layersFailed": "{n} שכבות חזרו ריקות.",
    "layersFailedOne": "שכבה אחת חזרה ריקה.",
    "layersFailedWhy": "ראה מקורות",
    "layerCountParts": {
      "onMap": "{n} על המפה",
      "riding": "{n} רכובים על משהו אחר",
      "unplaceable": "{n} שאי אפשר למקם",
      "auroraPeak": "עד {n} % סבירות",
      "lightningPerMin": "{n} פגיעות בדקה"
    },
    "layersEmpty": "עדיין לא נטענו שכבות.",
    "groups": {
      "around-earth": "סביב כדור הארץ",
      "earth": "מזג אוויר וקרקע",
      "solar-system": "מערכת השמש",
      "beyond": "כוכבים ומעבר להם"
    },
    "groupCount": "{on} מתוך {n}",
    "groupAll": "הכול",
    "groupNone": "כלום",
    "groupAllLabel": "הצג כל שכבה ב{group}",
    "groupNoneLabel": "הסתר כל שכבה ב{group}",
    "layerFilter": "חפש שכבה",
    "layersKeys": "שכבות. החצים למעלה ולמטה מזיזים; רווח מפעיל או מכבה שכבה.",
    "layerFilterEmpty": "אין שכבה בשם הזה.",
    "keysRow": "מקשים",
    "keysRowTouch": "מחוות",
    "keysRowTitle": "הצג את המקשים שמזיזים את התצוגה",
    "keysRowTitleTouch": "הצג את המחוות שמזיזות את התצוגה",
    "swatchMixed": "מצויר בצבעים שלו",
    "keyedNote": "נקודות צבועות לפי {key}: המקרא למטה.",
    "localTimeFallback": "מקומי",
    "locationPlaceholder": "הקלד עיר",
    "locationSearchLabel": "מצא עיר",
    "locationUseMine": "השתמש במיקום שלי",
    "locationUseMineTitle": "שאל את הדפדפן איפה אתה",
    "locationInsecure": "הדפדפן משתף את המיקום שלך רק עם דפים שמוגשים ב-https. הדף הזה הוא ב-http רגיל, ולכן הכפתור כבוי. בחר עיר במקום זה, או פתח את כתובת ה-https כשתהיה כזאת.",
    "locationUnsupported": "בדפדפן הזה אין שירות מיקום. בחר עיר במקום זה.",
    "locationDenied": "הדפדפן סירב. בחר עיר במקום זה.",
    "locationFailed": "הדפדפן לא הצליח למצוא אותך. בחר עיר במקום זה.",
    "locationAsking": "שואל את הדפדפן",
    "locationClear": "נקה",
    "locationNoMatch": "אף עיר ברשימה המובנית לא מתאימה לזה.",
    "tonightCouldNotLook": "לא הצלחנו לבדוק: לא נטענו לוויינים."
  },
  "search": {
    "title": "מצא אובייקט",
    "placeholder": "חפש כוכבי לכת, כוכבים, לוויינים",
    "placeholderPhone": "חפש בחלל",
    "inputLabel": "חפש אובייקט לפי שם או מספר קטלוג",
    "listLabel": "אובייקטים מתאימים",
    "fly": "עוף אליו",
    "flyTitle": "הזז את המצלמה אל האובייקט המסומן ופתח את הכרטיס שלו",
    "hint": "שתי אותיות מספיקות. Enter בוחר את הראשון.",
    "noMatch": "אין כאן שום דבר בשם “{q}”.",
    "closest": "השמות הקרובים ביותר",
    "more": "עוד {n} תוצאות מתאימות. הקלד עוד כדי לצמצם.",
    "searching": "נחפשו {n} אובייקטים.",
    "searchingOne": "אובייקט אחד נחפש.",
    "searchingBut": "נחפשו {n} אובייקטים, {m} שכבות עדיין לא.",
    "searchingButOne": "נחפשו {n} אובייקטים, שכבה אחת עדיין לא.",
    "empty": "עדיין לא נטען כלום לחיפוש.",
    "inputTitle": "חיפוש (/)",
    "key": "/",
    "notLoaded": "לא נטענו, ולכן לא נחפשו: {layers}.",
    "stillLoading": "עדיין נטענים, ולכן עדיין לא נחפשו: {layers}.",
    "loadsWhenOn": "נטענים רק כשמפעילים אותם, כדי לחסוך נתונים, ולכן עדיין לא נחפשו: {layers}.",
    "couldNotRead": "לא הצלחנו לקרוא אותם, ולכן לא נחפשו: {layers}.",
    "fallback": "שום דבר לא מתחיל בזה. אלה מכילים את זה.",
    "switchedOn": "הופעלה: {layer}.",
    "belowHorizon": "{name} מתחת לאופק.",
    "notLoadedCount": "אי אפשר לדעת כמה אובייקטים זה משאיר בחוץ עד שייטענו."
  },
  "quality": {
    "dataSaver": "חיסכון בנתונים פועל: שתי הרשימות הגדולות ביותר ממתינות.",
    "lowered": "פריימים איטיים ({ms} אלפיות שנייה): תמונה פשוטה יותר.",
    "tierPhone": "מפות פני שטח ב-2k, בגודל מתאים לטלפון.",
    "tierSaver": "מפות פני שטח ב-2k, כדי לחסוך נתונים.",
    "tierSmall": "מפות פני שטח ב-2k, בגודל מתאים למכשיר הזה.",
    "tierLatched": "מפות פני שטח חזרו ל-2k: הפריימים היו איטיים.",
    "tierLow": "מפות פני שטח ב-2k, כפי שהאיכות נמוכה מבקשת.",
    "tier1": "מפות פני שטח ב-4k, נטענות בזמן ההמתנה.",
    "tier2": "מפות פני שטח ב-4k, עוד עולמות נשארים חדים.",
    "promoted": "עלתה דרגה אחרי פריימים מהירים.",
    "mapsWorn": "מפות במכשיר הזה: {credits}.",
    "panelTitle": "איכות",
    "choices": {
      "auto": "אוטומטית",
      "low": "נמוכה",
      "medium": "בינונית",
      "high": "גבוהה",
      "ultra": "אולטרה"
    },
    "autoNow": "אוטומטית: {tier}",
    "titles": {
      "auto": "נבחרת לפי המכשיר הזה וקצב הפריימים שלו",
      "low": "התמונה הקלה ביותר: לסוללה או למחשב נייד ישן",
      "medium": "מפות, בליטה ומזג אוויר חדים יותר",
      "high": "עוד עולמות נשארים חדים בו זמנית",
      "ultra": "רזולוציה מלאה והצעדים העדינים ביותר מקרוב"
    },
    "fellBack": "הפריימים היו איטיים: האיכות חזרה לאוטומטית."
  },
  "status": {
    "title": "מקורות",
    "intro": "כל מקור שהאתר קורא, כמה ישנה הקריאה שלו ומאיפה הוא בא. שום דבר כאן לא מוסתר בתחתית הדף.",
    "stateOk": "תקין",
    "stateStale": "ישן",
    "stateUnknown": "לא הצלחנו לבדוק",
    "stateOkTitle": "נקרא לאחרונה ובתוך חלון הטריות שלו.",
    "stateStaleTitle": "יש לנו עותק, אבל הוא ישן יותר ממה שהמקור הזה מבטיח.",
    "stateUnknownTitle": "מעולם לא הייתה לנו קריאה טובה מהמקור הזה בדפדפן הזה. זה לא אותו דבר כמו תקין, וזה לא אותו דבר כמו שגיאה בעותק שברשותנו.",
    "ageNever": "מעולם לא נקרא",
    "ageLabel": "נקרא לאחרונה {age}",
    "ageNeverLine": "עדיין אין עותק טוב בדפדפן הזה",
    "viaSnapshotLine": "מהצילום שלנו, נטען {age}",
    "viaLiveLine": "נקרא בשידור חי מ-{publisher} {age}",
    "snapshotOverdue": "עותק חדש יותר מתעכב",
    "snapshotChecking": "(בודק אם יש חדש יותר)",
    "couldNotLookLine": "לא הצלחנו לבדוק: {reason}",
    "reasonNoRoute": "{why}, ודפדפן לא יכול לקרוא את {publisher} ישירות",
    "snapshotWhy": {
      "no-index": "לא הצלחנו לקרוא את אינדקס הצילומים שלנו",
      "not-in-index": "הצילומים שלנו לא כוללים את המקור הזה",
      "refused": "האיסוף האחרון שלו נדחה",
      "error": "האיסוף האחרון שלו נכשל",
      "skipped": "האוסף דילג עליו",
      "unreadable": "לא הצלחנו לקרוא את הצילום שלנו שלו"
    },
    "harvestUnchecked": "הצילומים שלנו: עדיין לא נבדקו.",
    "harvestUnavailable": "הצילומים שלנו לא זמינים כרגע, ולכן כל מקור למטה נקרא בשידור חי ממפרסם או לא נקרא בכלל.",
    "harvestLine": "הצילומים שלנו: נכתבו {age} · {ok} עדכונים תקינים · {refused} נדחו · {error} נכשלו",
    "errorLabel": "השגיאה האחרונה",
    "attributionTitle": "קרדיטים",
    "attributionIntro": "הנתונים במפה הזאת הם עבודה של אנשים אחרים.",
    "footCreditsIntro": "תמונות ומרקמים:",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "מרקמים של כוכבי לכת וכוכבים, ברישיון CC BY 4.0",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "תמונות עננים, צד הלילה ופני השטח, והמודלים התלת-ממדיים",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "עננים",
    "auroraTitle": "זוהר קוטבי",
    "weatherTitle": "ברקים",
    "layersTitle": "חי או מובנה",
    "layersIntro": "חי נקרא ממפרסם שלו, או מחושב לרגע הזה, בזמן שאתה צופה. קטלוג מגיע עם האפליקציה: כוכבים, גלקסיות והצלחות ואתרי הנחיתה על הקרקע לא זזים בזמן שאתה מסתכל. דגימה מובנית ממלאת מקום של מקור שדפדפן לא יכול לפנות אליו בכלל.",
    "layerLive": "חי",
    "layerCatalogue": "קטלוג",
    "layerSample": "דגימה מובנית",
    "layerIllustrative": "מצויר, לא במעקב",
    "layerMixed": "מעורב",
    "layerEmpty": "לא נטען כלום",
    "layerCountLabel": "{n} מוצגים",
    "sourcesEmpty": "לא הוצהר על שום מקור.",
    "notAsked": "עוד {n} מקורות נקראים רק כשמפעילים שכבה שזקוקה להם."
  },
  "time": {
    "justNow": "הרגע",
    "aMinuteAgo": "לפני דקה",
    "minutesAgo": "לפני {n} דקות",
    "anHourAgo": "לפני שעה",
    "hoursAgo": "לפני {n} שעות",
    "aDayAgo": "לפני יום",
    "daysAgo": "לפני {n} ימים",
    "lessThanAMinute": "פחות מדקה",
    "aMinute": "דקה",
    "minutes": "{n} דקות",
    "anHour": "שעה",
    "hours": "{n} שעות",
    "aDay": "יום",
    "days": "{n} ימים",
    "months": "{n} חודשים",
    "years": "{n} שנים",
    "inFuture": "בעוד {d}",
    "ago": "לפני {d}"
  },
  "sheet": {
    "handle": "גובה הלוח",
    "closed": "סגור",
    "peek": "מונמך",
    "half": "פתוח למחצה",
    "full": "פתוח לגמרי",
    "state": "{height}. החצים למעלה ולמטה משנים אותו",
    "title": "גובה הלוח: {height}. הקש או גרור כדי לשנות"
  },
  "print": {
    "title": "שמור את התצוגה הזאת כגלויה בגודל 6 על 4 אינץ׳ (JPEG)",
    "making": "מכין את הגלויה",
    "saved": "הגלויה נשמרה",
    "failed": "לא הצלחנו להכין את הגלויה כרגע",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date}, {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "כפי שהעין רואה",
      "deep": "מתיחה עמוקה: אור קלוש מוגבר"
    },
    "look": {
      "measured": "מראה נמדד"
    }
  },
  "hud": {
    "fromYou": "ממך",
    "fromPlace": "מ{place}",
    "behind": "מאחורי {world}",
    "offScreen": "{name}, במרחק {distance}, מחוץ למסך: עוף אליו",
    "live": "{name}: {readouts}"
  },
  "clean": {
    "hide": "הסתר את כל הלוחות (H)",
    "show": "הצג את הלוחות שוב (H או Escape)",
    "hint": "H או Escape ללוחות. Shift+H משאיר תוויות וזמן"
  },
  "mark": {
    "label": "קוד המקור ב-GitHub",
    "title": "קוד המקור של Space Radar ב-GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "ערכת עיתונות",
    "pressTitle": "מה זה, תמונות והסימן לשימוש",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "תחנה",
    "satellite": "לוויין",
    "debris": "פסולת",
    "rocket": "טיל",
    "probe": "גשושית",
    "telescope": "טלסקופ",
    "asteroid": "אסטרואיד",
    "comet": "שביט",
    "site": "אתר קרקע",
    "world": "עולם",
    "star": "כוכב",
    "exoplanet": "כוכב לכת של כוכב אחר",
    "dso": "אובייקט בחלל העמוק",
    "exotic": "אובייקט קיצוני",
    "storm": "ציקלון טרופי",
    "earthevent": "אירוע בכדור הארץ",
    "oddity": "תופעה מוזרה",
    "shower": "ממטר מטאורים",
    "unknown": "אובייקט"
  },
  "cls": {
    "nearEarthApprox": "כל כך קרוב לכדור הארץ המקום שלו משוער: המסלול המצויר הוא סביב השמש בלבד ומשמיט את המשיכה של כדור הארץ.",
    "label": "איך אנחנו יודעים איפה הוא",
    "measured": "מיקום נמדד",
    "inferred": "מיקום שהוקרן ממרכיבי מסלול בני {n} {unit}",
    "inferredUnknownAge": "מיקום שהוקרן ממרכיבי מסלול בגיל לא ידוע",
    "inferredNoElements": "מיקום שחושב ולא נמדד",
    "stormAdvisory": "המרכז שלה בעדכון של {time} UTC, {ago}; סופה נעה, ולכן היא זזה מאז",
    "stormAdvisoryDated": "המרכז שלה בעדכון של {time} UTC מ-{date}, {ago}; סופה נעה, ולכן היא זזה מאז",
    "illustrative": "מצויר כדי להראות לאן הוא הולך; המסלול האמיתי אינו פומבי",
    "placeIllustrative": "המסלול האמיתי שלו, מהקטלוג של CelesTrak, במקום מומצא לאורכו; אין בידינו מרכיבי מסלול עדכניים שלו",
    "sample": "נתוני דגימה מובנים, לא מיקום חי",
    "provisional": "עדיין לא בקטלוג הציבורי — אלה מרכיבי המסלול של המפעיל עצמו, שפורסמו דרך CelesTrak; מספר קבוע יגיע כש-Space-Track יפרסם אותו",
    "unknown": "אנחנו לא יכולים לומר איך חושב המיקום הזה",
    "unplaced": "אף אחד לא יודע איפה זה נמצא, ולכן שום דבר לא מצויר עבורו",
    "shower": "כיוון בשמיים: החציון של הפתרונות שפרסם IAU עבור הממטר הזה",
    "noPlace": "לא מצויר עבורו מקום: הגוף שהוא נמצא עליו אינו עולם באפליקציה הזאת",
    "approxPlace": "ממוקם לפי קואורדינטות שפורסמו, בדיוק של כ-{n} מעלות",
    "inferredArc": "הפעם האחרונה שמישהו ראה אותו הייתה {date}, ו{caveat}",
    "precisionSplit": "{anchorName} נמדד בדיוק של {anchorM} מ׳; זה {how} וממוקם בדיוק של {objectM} מ׳",
    "precisionSplitUnknown": "{anchorName} נמדד בדיוק של {anchorM} מ׳; האובייקט הזה עצמו מעולם לא נסקר",
    "precisionSplitHowOnly": "{anchorName} נמדד בדיוק של {anchorM} מ׳; האובייקט הזה {how}, ואיש לא פרסם באיזה דיוק",
    "precisionOwn": "ממוקם בדיוק של {objectM} מ׳, {how}",
    "aboard": "זה המיקום של {carrier} עצמו, כי האובייקט מוברג אל החלק החיצוני שלו והולך לאן שהוא הולך",
    "how": {
      "surveyed": "נסקר ממסלול",
      "photogrammetric": "נמצא בצילומים",
      "orbital_imaging": "נמצא בתמונות ממסלול",
      "unsurveyed": "מעולם לא נסקר",
      "map_reference": "נלקח ממפה"
    },
    "hourWord": "שעה",
    "hoursWord": "שעתיים|שעות",
    "dayWord": "יום",
    "daysWord": "יומיים|ימים",
    "minuteWord": "דקה",
    "minutesWord": "דקותיים|דקות",
    "yearWord": "שנה",
    "yearsWord": "שנתיים|שנים"
  },
  "unplaced": {
    "why": "{whyUnknown}",
    "noDistanceRow": "לא נמדד: לקטלוג אין פרלקסה עבורו",
    "iauApproved": "{name}, אושר ב-{date}"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "שריפה",
      "volcano": "הר געש מתפרץ",
      "iceberg": "קרחון צף"
    },
    "rows": {
      "kind": "מה זה",
      "reported": "הדיווח האחרון",
      "since": "מתפרץ מאז",
      "first": "דווח לראשונה",
      "size": "גודל",
      "where": "איפה",
      "by": "דווח על ידי"
    },
    "sizeValue": "{n} קמ״ר",
    "sizeSmall": "פחות מקמ״ר אחד",
    "by": "{agencies}, דרך NASA EONET",
    "sky": "זה על הקרקע. ממסלול שריפה היא עמוד עשן, הר געש הוא עמוד אפר, וקרחון צף הוא לוח לבן על מים כהים.",
    "drawn": "מצויר כסימן במקום שדווח לאחרונה; היקפו על הקרקע לא מצויר",
    "honesty": "נקודה אחת מ-EONET של NASA, דווחה לאחרונה ב-{date} ונקראה {read}. לצפייה, לא רשומה רשמית של איפה או מתי."
  },
  "deepFacts": {
    "methodRow": "המרחק נמצא באמצעות",
    "billionLightYears": "{n} מיליארד שנות אור",
    "methods": {
      "parallax": "פרלקסה: ההיסט של הכוכב שלו ביחס לשמיים הרחוקים",
      "eclipsing-binary": "כוכבים כפולים מליקוי שבתוכו",
      "cepheid": "כוכבים משתנים מסוג צפאיד שבתוכו",
      "TRGB": "הענקים האדומים הבהירים ביותר שבתוכו",
      "standard-candle": "כוכבים או פיצוצים בבהירות ידועה",
      "redshift": "ההסחה לאדום שלו, דרך קוסמולוגיה",
      "kinematic": "באיזו מהירות הוא נע עם סיבוב הגלקסיה",
      "assumed-member-of-parent": "אין לו משלו: הוא ממוקם במרחק של הגלקסיה שלו"
    },
    "drawnTag": {
      "reconstruction": "· משוחזר",
      "model": "· מודל",
      "photograph": "· תצלום",
      "catalogue": "· קטלוג",
      "illustration": "· איור"
    },
    "drawnWords": {
      "reconstruction": "שחזור תלת-ממדי ממחקר שפורסם",
      "model": "מודל של הסוג שלו, לא הכוכבים שלו עצמו",
      "photograph": "תצלום אמיתי, מהצד שלנו",
      "catalogue": "מיקומים מהקטלוג",
      "illustration": "זוהר וסימן להמחשה מהסוג שלו"
    },
    "drawnLine": "מה שמצויר: {drawn}.",
    "drawnJoin": "; במקומות אחרים, ",
    "records": {
      "dso-milky-way": {
        "drawn": "איור שנבנה על מדידות",
        "split": "נמדד: הכוכבים בטווח של כמה אלפי שנות אור (Gaia), הזווית של הפס, הכיוונים לאורך הזרועות והזרועות הקרובות (Reid et al. 2019). מוסק: הצד הרחוק מעבר למרכז, שמוסתר על ידי אבק; הזרועות שלו הן הקרובות שהועברו סביב."
      }
    }
  },
  "truth": {
    "label": "איך אנחנו יודעים",
    "hints": {
      "measured": "נמדד",
      "inferred": "חושב",
      "illustrative": "להמחשה",
      "sample": "דגימה",
      "unknown": "לא ידוע",
      "unplaced": "ללא מקום",
      "reconstruction": "משוחזר",
      "model": "מודל",
      "photograph": "תצלום",
      "catalogue": "קטלוג",
      "illustration": "איור"
    },
    "loading": "פותח את המקרא.",
    "failed": "המקרא לא נטען. השורה למטה אומרת אותו בקצרה."
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "מקרוב, מערבולות קטנות מתגלגלות במקום שבו הרוחות שנמדדו מחליקות זו על פני זו ובעקבות הכתם האדום הגדול, והסגלגל BA ושלושה סגלגלים לבנים מסתובבים. איפה החיתוך נמדד; כל מערבולת נוצרת, עדינה יותר מהמפה: להמחשה."
    },
    "poles": {
      "jupiter": "הציקלונים סביב כל קוטב ממודלים מהתצפיות של Juno מ-2017, שמונה סביב אחד בצפון וחמישה בדרום: שחזור, לא תצלום. שכבת העננים הכהה יותר ברווחים להמחשה."
    }
  },
  "weatherDetail": "מקרוב יותר ממה שהמפה חדה, נוצר מרקם עננים עדין ומפוספס שנושא את התמונה: הוא נע עם הרוחות שנמדדו ושומר על הצבעים של המפה, ואף פס בו אינו ענן אמיתי. להמחשה.",
  "weatherVortex": {
    "turning": {
      "saturn": "מקרוב, ציקלון קטן מסתובב בתוך המשושה: העין שלו ברוחב 2 000 ק״מ והדופן שלו מקיפה במהירות של 150 מטר בשנייה, כפי ש-Cassini מדדה ב-2012. הספירלה המצוירת סביבו להמחשה, ואיש לא צופה בו עכשיו."
    },
    "still": {
      "saturn": "מקרוב, ציקלון קטן נמצא בתוך המשושה: העין שלו ברוחב 2 000 ק״מ, כפי ש-Cassini מדדה ב-2012, כשהדופן שלו הקיפה במהירות של 150 מטר בשנייה. הספירלה המצוירת סביבו להמחשה, ואיש לא צופה בו עכשיו."
    }
  },
  "sunAlive": {
    "prominences": "{n} בליטות עומדות על שפת השמש, באזורים הפעילים ש-NOAA מונה בטווח של חמש עשרה מעלות מהקצה. המקומות נמדדו; הצורות, הגבהים והתנועה להמחשה.",
    "prominencesOne": "בליטה אחת עומדת על שפת השמש, באזור פעיל ש-NOAA מונה בטווח של חמש עשרה מעלות מהקצה. המקום נמדד; הצורה, הגובה והתנועה להמחשה.",
    "flare": "התפרצות ממחלקה {cls} נראית באזור {region}: היא הגיעה לשיאה ב-{time} UTC ב-{date}, לפי רשימת האירועים של NOAA. הזמן, המחלקה, האזור והדעיכה שלה נמדדו; עד כמה היא בהירה בציור להמחשה.",
    "cme": "פליטת מסה מהכתר שיצאה ב-{time} UTC ב-{date} במהירות {speed} ק״מ בשנייה מצוירת כפי שקורונוגרף מראה אותה: לולאה בהירה שנעה החוצה, חלל כהה יותר מאחוריה וליבה בהירה. ההתחלה, הכיוון, הרוחב והמהירות שלה מהקטלוג DONKI של NASA; הענן שומר על המהירות הזאת, מה שאמיתיים לא עושים, והמראה שלו להמחשה."
  },
  "starSystem": {
    "zoneLabel": "אזור המגורים, חושב",
    "orbitOf": {
      "mercury": "המסלול של כוכב חמה, לקנה מידה",
      "earth": "המסלול של כדור הארץ, לקנה מידה",
      "jupiter": "המסלול של צדק, לקנה מידה",
      "neptune": "המסלול של נפטון, לקנה מידה"
    },
    "rows": {
      "known": "מה ידוע",
      "orbit": "מרחק מהכוכב שלו",
      "temperature": "טמפרטורה, חושבה",
      "zone": "אזור המגורים, חושב",
      "starTemperature": "טמפרטורת פני השטח",
      "starWidth": "רוחב",
      "starGlow": "זוהר",
      "starMass": "מסה",
      "planets": "כוכבי לכת מצוירים",
      "stars": "כוכבים במערכת",
      "companion": "שמש שנייה"
    },
    "unseen": "איש לא ראה את פני השטח שלו.",
    "measuredOne": "נמדד: {what}.",
    "measuredMany": "נמדדו: {what}.",
    "estimatedOne": "הערכה: {what}.",
    "estimatedMany": "הערכות: {what}.",
    "unmeasuredOne": "לא נמדד: {what}.",
    "and": " ו",
    "what": {
      "size": "הגודל",
      "year": "השנה",
      "mass": "המסה",
      "least": "המסה המזערית האפשרית"
    },
    "au": "{n} י״א",
    "auComputed": "{n} י״א, חושב מהשנה שלו ומהמסה של הכוכב שלו",
    "auYearComputed": "{n} י״א; השנה שלו, בערך {y} שנים, חושבה מזה ומהמסה של הכוכב שלו",
    "earthsEstimated": "{n}× כדור הארץ, הערכת הארכיון לפי המסה שלו",
    "massEstimated": "{n}× כדור הארץ, הערכת הארכיון לפי הגודל שלו",
    "massLeast": "לפחות {n}× כדור הארץ",
    "sizeDefault": "לא נמדד: מצויר בגודל של כדור הארץ",
    "temperature": "{k} K ({c} °C), אם הוא מחזיר {pct} % מהאור שלו כמו כדור הארץ",
    "zone": {
      "inside": "בתוכו",
      "edge": "בקצה שלו: רק בתוך הגבולות הרחבים יותר",
      "hotter": "קרוב לכוכב יותר ממנו",
      "colder": "רחוק מהכוכב יותר ממנו"
    },
    "zoneNone": {
      "too-hot": "לא חושב: הנוסחה לא מכסה כוכב חם כל כך",
      "too-cool": "לא חושב: הנוסחה לא מכסה כוכב קריר כל כך",
      "no-temperature": "לא חושב: הטמפרטורה של הכוכב לא נמדדה",
      "no-luminosity": "לא חושב: הבהירות של הכוכב לא נמדדה",
      "twoStars": "לא חושב: הוא מקיף שני כוכבים והקטלוג מתאר אחד"
    },
    "zoneRange": "{a} עד {b} י״א מהכוכב (Kopparapu et al. 2014)",
    "overlay": {
      "title": "הנח על המפה",
      "zone": "אזור המגורים",
      "orbits": "המסלולים של כוכבי הלכת שלנו",
      "zoneTitle": "איפה מים נוזליים יכולים להישאר על פני כוכב לכת, מחושב מהטמפרטורה והבהירות של הכוכב",
      "orbitsTitle": "המסלולים של כוכבי הלכת של מערכת השמש שלנו, מצוירים סביב הכוכב הזה לקנה מידה",
      "note": {
        "none": "שום דבר לא מונח על המערכת.",
        "zone": "הרצועה הירוקה היא אזור המגורים, מחושב (Kopparapu et al. 2014), לא נצפה.",
        "orbits": "הטבעות המקווקוות הן מסלולים ממערכת השמש שלנו, לקנה מידה. שום דבר כאן לא עוקב אחריהן.",
        "both": "הרצועה הירוקה היא אזור המגורים, מחושב; הטבעות המקווקוות הן המסלולים של כוכבי הלכת שלנו, לקנה מידה."
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "לא נמדד",
    "starPoint": "לא נמדד: מצויר כנקודת אור",
    "starWhite": "לא נמדד: מצויר לבן",
    "starGlowValue": "מצויר רחב מהכוכב, בצבע שלו, כדי שאפשר יהיה לראות אותו מרחוק",
    "starsOne": "{n} בקטלוג; אחד מצויר",
    "starsBoth": "שניים, שניהם מצוירים",
    "companionValue": "רוחב {width}, מסה {mass}, {k} K{derived}",
    "companionDerived": " (ערך ממודל; הצבע שלו להמחשה)",
    "zoneBoth": "{a} עד {b} י״א, האור של שתי השמשות מסוכם",
    "pairLine": "שתי השמשות מקיפות זו את זו כל {days} ימים, במרחק ממוצע של {a} י״א, על המסלול שהמאמרים מדדו; כוכב הלכת מקיף את שתיהן. המיקומים שלהן חושבו מהמסלול הזה; המישור שבו הן מצוירות, מישור כוכבי הלכת, הוא זה שתצוגת השמיים משתמשת בו.",
    "line": "גדלים ושנים מ-NASA Exoplanet Archive, נקרא ב-{date}. המסלולים מצוירים כעיגולים{computed}; הצבעים{phase} והשיפוע של המסלולים להמחשה{defaults}.",
    "lineComputed": ", {n} מהם בגודל שחושב מהשנה ומהמסה של הכוכב",
    "lineDefaults": "; כוכב לכת שגודלו לא נמדד מצויר בגודל של כדור הארץ"
  },
  "shells": {
    "radio": "גלי הרדיו מכדור הארץ הגיעו למרחק של {n} שנות אור"
  },
  "subscribe": {
    "heading": "שלח לי אימייל על מה שמגיע בקרוב",
    "emailLabel": "כתובת האימייל שלך",
    "emailPlaceholder": "you@example.com",
    "pickOne": "סמן לפחות אחד.",
    "launchesLabel": "שיגורים קרובים",
    "showersLabel": "שיאים של ממטרי מטאורים",
    "approachesLabel": "מעברים קרובים",
    "submit": "הרשם",
    "sending": "שולח…",
    "pending": "בדוק את האימייל שלך כדי לאשר.",
    "couldNotReach": "לא הצלחנו להגיע לשירות ההרשמה."
  },
  "flood": {
    "on": "האר",
    "off": "אור אמיתי",
    "title": "האר את המודל באופן אחיד, כדי שאפשר יהיה לראות אותו בצל. לא האור האמיתי.",
    "note": "המנורה שלנו, לא האור האמיתי."
  },
  "ephemeris": {
    "drawn": "מצויר מ-JPL Horizons, באינטרפולציה: בטווח של כ-{km} ק״מ מהמסלול של JPL עצמו.",
    "note": "במפה יש את המסלול שלו לאותו יום, מ-JPL Horizons, בדיוק של כ-{km} ק״מ.",
    "noteLate": "המסלול של JPL שלו מתחיל {n} דקות אחרי הרגע הזה, והשעון עובר לשם. בדיוק של כ-{km} ק״מ.",
    "noteDay": "הדף של NASA נותן את היום. השעון עובר ל-{time} UTC, המעבר הקרוב ביותר במסלול של JPL באותו יום, בדיוק של כ-{km} ק״מ.",
    "failed": "המסלול שלו לאותו יום לא נטען, ולכן השעון נשאר במקומו. בחר אותו שוב כדי לנסות מחדש.",
    "span": "המסלול של JPL שלו נמשך מ-{from} עד {to}.",
    "before": "השעון לפני זה, ולכן אין במפה מיקום שלו.",
    "after": "השעון אחרי זה, ולכן אין במפה מיקום שלו.",
    "go": "עבור לתאריך הקרוב ביותר שזמין",
    "goBefore": "הזז את השעון ל-{date}, שבו המסלול של JPL שלו מתחיל",
    "goAfter": "הזז את השעון ל-{date}, שבו המסלול של JPL שלו נגמר"
  },
  "offline": {
    "updateReady": "גרסה חדשה יותר מוכנה",
    "reload": "טען מחדש"
  },
  "keepTrip": {
    "keep": "שמור ללא חיבור",
    "keepTitle": "שמור את הקול, המודלים והמפות של המסע הזה במכשיר הזה כדי שיתנגן בלי חיבור",
    "keeping": "שומר {done} מתוך {total}",
    "kept": "נשמר ללא חיבור",
    "keptTitle": "נשמר במכשיר הזה. לחץ כדי להוריד אותו שוב.",
    "keptNote": "{n} קבצים, {size}, נשמרו במכשיר הזה. נתונים חיים (מזג אוויר, סופות, לוויינים) לא נשמרים.",
    "again": "נסה שוב",
    "failedNote": "נשמרו {done} מתוך {total} קבצים. בדוק את החיבור ונסה שוב."
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "לחץ על מקש כלשהו כדי להתחיל עם צליל",
    "gateTitleTouch": "גע במסך כדי להתחיל עם צליל",
    "gateNote": "כשאין כאן אף אחד, זה מתחיל בשקט, עם כתוביות, בעוד {n} שניות.",
    "upNext": "המסע הבא",
    "shape": "{n} תחנות · {m} דק׳",
    "take": "קח את השליטה",
    "takeTitle": "עצור את המסעות והזז את המפה בעצמך"
  },
  "drift": {
    "name": "שיטוט",
    "pause": "השהה (רווח)",
    "resume": "המשך (רווח)",
    "next": "המקום הבא (N)",
    "options": "אפשרויות",
    "optionsTitle": "דרך מה לנסוע, מה להציג והקצב",
    "leave": "הפסק לשוטט (Escape)",
    "through": "נסע דרך",
    "cats": {
      "craft": "חלליות",
      "worlds": "עולמות",
      "small": "גופים קטנים",
      "stars": "כוכבים",
      "deep": "החלל העמוק"
    },
    "show": "הצג",
    "real": "מודלים אמיתיים",
    "realTitle": "רק דברים שיש להם מודל, מפה או תצלום אמיתיים",
    "names": "שמות",
    "namesTitle": "השם והמספרים ליד כל מקום",
    "bare": "רק חלל",
    "bareTitle": "רק השמיים והדברים שבהם: בלי שמות, סימנים, קווים או לוחות",
    "pace": "קצב",
    "paces": {
      "calm": "רגוע",
      "steady": "יציב",
      "brisk": "ממהר"
    },
    "hint": "משוטט. גרור את המפה כדי לקחת את השליטה",
    "nothing": "אין דרך לשוטט עם הבחירות האלה",
    "notFromGround": "השיטוט מתחיל מהחלל, לא מהקרקע"
  },
  "tour": {
    "label": "הסיור",
    "micro": "סיור",
    "count": "{n} / {of}",
    "next": "הבא",
    "nextTitle": "הצעד הבא (N)",
    "done": "סיום",
    "doneTitle": "סיים את הסיור",
    "skip": "דלג",
    "skipTitle": "צא מהסיור (Escape)",
    "voice": "קול",
    "voiceTitle": "הקרא כל צעד בקול סינתטי",
    "waited": "הסתכל סביב, ואז המשך.",
    "invite": "פעם ראשונה כאן: צא לסיור",
    "inviteTitle": "שמונה צעדים סביב המפה"
  },
  "undo": {
    "moved": "עברנו אל {name}",
    "movedNowhere": "התצוגה זזה",
    "night": "לילה ב{name}: התצוגה הרחבה",
    "back": "חזרה למקום שהיית בו",
    "done": "חזרת למקום שהיית בו"
  },
  "searchRows": {
    "kinds": {
      "sun": "כוכב",
      "planet": "כוכב לכת",
      "moon": "ירח",
      "station": "תחנת חלל",
      "satellite": "לוויין",
      "telescope": "טלסקופ חלל",
      "probe": "חללית",
      "rocket": "טיל",
      "launch": "שיגור",
      "debris": "פסולת",
      "asteroid": "אסטרואיד",
      "comet": "שביט",
      "site": "מקום",
      "landing": "אתר נחיתה",
      "star": "כוכב",
      "exoplanet": "כוכב לכת של כוכב אחר",
      "dso": "אובייקט בחלל העמוק",
      "storm": "סופה טרופית",
      "oddity": "תופעה מוזרה",
      "earthevent": "אירוע בכדור הארץ",
      "blackhole": "חור שחור",
      "pulsar": "פולסר",
      "magnetar": "מגנטר",
      "quasar": "קוואזר",
      "galaxy": "גלקסיה",
      "cluster": "צביר גלקסיות",
      "browndwarf": "ננס חום",
      "whitedwarf": "ננס לבן"
    },
    "upNow": "מעל האופק עכשיו, {compass}",
    "lowNow": "נמוך בכיוון {compass} עכשיו",
    "downNow": "מתחת לאופק שלך עכשיו",
    "trip": "מסע",
    "starPattern": "קבוצת כוכבים",
    "mission": "משימה",
    "eventName": "{mission}: {title}",
    "event": "אירוע במשימה · {date}",
    "eventNoDate": "אירוע במשימה",
    "group": "קבוצה · {n} לוויינים על המפה · לחץ כדי לרשום אותם",
    "nearMe": "לידי הלילה",
    "nearMeSub": "מה מעל האופק בשמיים שלך"
  },
  "countdown": {
    "go": "מאשרים שיגור",
    "tbc": "הזמן ממתין לאישור",
    "tbd": "הזמן לא נקבע",
    "hold": "בהמתנה: הספירה מושהית",
    "inFlight": "בטיסה",
    "success": "שוגר",
    "deployed": "המטען שוחרר",
    "failure": "השיגור נכשל",
    "partial": "כישלון חלקי",
    "byPlan": "לפי התוכנית. אין עדכון חדש יותר",
    "byPlanClimbing": "לפי התוכנית, בעלייה. אין עדכון חדש יותר",
    "age": "נקרא {age}"
  },
  "today": {
    "title": "היום",
    "moonTitle": "ירח {phase}",
    "moonLine": "{pct} % מואר · {next} ב-{date}",
    "moonNext": [
      "ירח חדש",
      "רבע ראשון",
      "ירח מלא",
      "רבע אחרון"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "30 הימים האחרונים",
    "launched": "{n} אובייקטים חדשים במסלול",
    "launchedLine": "החדש ביותר: {name}",
    "debris": "פסולת במספרים",
    "debrisClose": "סגור את תצוגת הפסולת",
    "debrisTitle": "סופר כל מה שנעקב במסלול. קורא את כל הקטלוג, כ-1.5 MB"
  },
  "sentence": {
    "one": "{a}.",
    "two": "{a}, ו{b}.",
    "title": "מ-{sources}. לחץ כדי להגיע לשם",
    "names": {
      "sat-25544": "ה-ISS",
      "sat-48274": "Tiangong"
    },
    "pass": "{name} עובר מעליך {when}",
    "launch": "{name} אמור להמריא {when}",
    "showerToday": "שיא ממטר {name} היום",
    "showerTomorrow": "שיא ממטר {name} מחר",
    "moonName": "הירח",
    "moonPhases": [
      "חדש",
      "",
      "מלא",
      ""
    ],
    "moonToday": "היום הירח {phase}",
    "moonOne": "הירח נמצא יום אחד מהירח ה{phase}",
    "moonDays": "הירח נמצא {n} ימים מהירח ה{phase}",
    "moonLit": "הירח מואר ב-{pct} %",
    "crew": "{n} אנשים נמצאים במסלול ממש עכשיו",
    "crewOne": "אדם אחד נמצא במסלול ממש עכשיו",
    "storms": "{n} סופות מסתובבות",
    "stormOne": "סופה אחת מסתובבת",
    "approach": "{name} חולף ליד כדור הארץ {when}",
    "launched": "{n} אובייקטים חדשים הגיעו למסלול ב-30 ימים",
    "dateToday": "היום הוא {date}",
    "dateClock": "השעון מכוון ל-{date}",
    "sources": {
      "pass": "מרכיבי המסלול של CelesTrak",
      "launch": "Launch Library 2",
      "shower": "לוח ממטרי המטאורים של IMO",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "השעון של המכשיר שלך"
    }
  },
  "wonder": {
    "kicker": "פלא היום",
    "label": "פלא היום: {title}"
  },
  "story": {
    "kicker": "הסיפור של השבוע · שבוע {week}",
    "label": "הסיפור של השבוע: {title}",
    "ruleTitle": "איך זה חושב: {rule}",
    "lowest": {
      "title": "הנמוך ביותר בקטלוג שלנו: {name}",
      "line": "אף פעם לא מעל {apogee} ק״מ, עד {perigee} ק״מ, הקפה ב-{min} דק׳.",
      "rule": "הנקודה הגבוהה הנמוכה ביותר מבין {n} קבוצות מרכיבי מסלול בנות פחות מ-7 ימים"
    },
    "farthest": {
      "title": "הרחוק ביותר בקטלוג שלנו: {name}",
      "line": "עד {apogee} ק״מ, וחזרה עד {perigee} ק״מ, הקפה אחת ב-{lap}.",
      "hours": "{n} שעות",
      "days": "{n} ימים",
      "rule": "הנקודה הגבוהה ביותר מבין {n} קבוצות מרכיבי מסלול בנות פחות מ-7 ימים"
    },
    "busiest": {
      "title": "הגובה הצפוף ביותר שאנחנו מכירים: {lo} עד {hi} ק״מ",
      "line": "{n} מתוך {total} האובייקטים שבידינו טסים שם: {pct} מתוך 100.",
      "rule": "פס הגבהים הממוצעים המלא ביותר ברוחב {band} ק״מ מתוך {n} קבוצות בנות פחות מ-7 ימים"
    },
    "oldest": {
      "title": "השיגור הוותיק ביותר בקטלוג שלנו: {name}",
      "line": "שוגר ב-{year}, {years} שנים למעלה, הקפה ב-{min} דק׳.",
      "rule": "שנת השיגור המוקדמת ביותר מבין {n} קבוצות מרכיבי מסלול בנות פחות מ-7 ימים"
    }
  },
  "happened": {
    "flown": "המריא {age}",
    "lost": "השיגור נכשל {age}"
  },
  "passport": {
    "title": "דרכון",
    "openTitle": "איפה היית, נשמר בדפדפן הזה בלבד",
    "summary": "{places} · {n} מתוך {total} מסעות",
    "places": "{n} מקומות",
    "placeOne": "{n} מקום",
    "kept": "נשמר בדפדפן הזה בלבד, אף פעם לא נשלח.",
    "notKept": "הדפדפן הזה לא שומר כלום, ולכן אין כאן כלום.",
    "placesTitle": "מקומות שפתחת",
    "tripsTitle": "מסעות שסיימת",
    "outOf": "{n} מתוך {total}",
    "barLabel": "{n} מתוך {total} מסעות הסתיימו",
    "placeTitle": "עבור אל {name}",
    "noPlaces": "עדיין אין מקומות. פתח אחד במפה.",
    "noTrips": "עדיין לא סיימת מסעות.",
    "seenTitle": "ראית בעיניים שלך",
    "noSeen": "עדיין לא סומן כלום. בכרטיס יש כפתור ״ראיתי״.",
    "seenIt": "ראיתי",
    "toolsLabel": "עוד לאובייקט הזה",
    "seenOn": "נראה ב-{date}",
    "seenTitleOff": "סמן כשראית אותו בעיניים שלך",
    "seenTitleOn": "מסומן כנראה. לחץ כדי לבטל את הסימון",
    "seenNotKept": "הדפדפן הזה לא שומר כלום, ולכן הסימון לא יישאר",
    "remind": "הזכר לי",
    "remindTitle": "מוריד קובץ יומן עם תזכורת: {title}",
    "forget": "שכח אותי",
    "forgetConfirm": "כן, שכח",
    "forgetTitle": "מוחק את הדרכון ואת בחירת הצליל מהדפדפן הזה",
    "forgotten": "נשכח. הדפדפן הזה לא מחזיק כלום עכשיו.",
    "stamp": "מסע {n} מתוך {total} · {date}",
    "stampPlaces": "{places} נפתחו עד עכשיו",
    "resume": "המשך מתחנה {n}"
  },
  "kept": {
    "title": "מה האתר הזה שומר במכשיר שלך",
    "lines": [
      "הדרכון שלך: מקומות שנפתחו, מסעות שהסתיימו, דברים שסומנו כנראו.",
      "בחירת הצליל והקול שלך, והאופן שבו השארת את הלוחות.",
      "עותק של הנתונים האחרונים שנקראו, כדי שהמפה תיפתח בלי חיבור.",
      "כשמסך מנגן בעצמו, יומן קצר של המסעות שלו, ללשונית הזאת בלבד."
    ],
    "place": "המקום שלך מעוגל לעשירית מעלה ונשמר רק כל עוד הדף הזה פתוח.",
    "none": "בלי חשבון, בלי עוגיות, בלי ניתוח נתונים. ״שכח אותי״, בדרכון, מוחק את הדרכון ואת בחירת הצליל."
  },
  "buildInfo": {
    "line": "נבנה מ-{sha}, {date}",
    "title": "הקומיט שממנו נבנה האתר הזה, ב-GitHub",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "ככה נראה החלל?",
    "lead": "איפה הדברים נמצאים ואיך הם נעים נמדד או חושב. איך הם נראים בא משלושה סוגי תמונות.",
    "kinds": [
      [
        "מודל תלת-ממדי",
        "הערפיליות והגלקסיות הן מודלים תלת-ממדיים שנבנו ממדידות שפורסמו, והאור שלהם נלקח מתצלומי טלסקופ (חשיפות ארוכות); אחת שעדיין אין לה מודל היא זוהר רך בגודלה. לעין אותו גז הוא זוהר אפרפר קלוש. כרטיס יכול להראות את התצלום ליד המודל שלו."
      ],
      [
        "מפה על מודל",
        "כוכבי לכת וירחים הם כדורים שלבושים במפות שנעשו מתמונות של חלליות, חלקן מוחלקות על ידי אמן. חלליות הן מודלים תלת-ממדיים, רובם מקבצים ש-NASA פרסמה. האור עליהם מחושב לרגע המוצג."
      ],
      [
        "הדמיית אמן",
        "איש לא ראה את פני השטח של כוכב לכת של כוכב אחר. הפנים האלה מדומיינים מגודל וטמפרטורה שנמדדו, והכרטיסים שלהם אומרים זאת."
      ]
    ],
    "foot": "גדלים ומרחקים משתנים לפעמים כדי שאפשר יהיה לראות דבר בכלל. כשהם משתנים, הכרטיס או התמונה אומרים זאת."
  },
  "debris": {
    "title": "פסולת במסלול",
    "reading": "קורא את הקטלוג, כ-1.5 MB",
    "failed": "לא הצלחנו לקרוא את הקטלוג.",
    "retry": "נסה שוב",
    "empty": "הקטלוג לא מונה שום דבר במסלול.",
    "lead": "{gone} מתוך {total} הדברים שנעקבים במסלול כבר לא עובדים.",
    "kinds": {
      "debris": "חתיכות פסולת",
      "rocket": "גופי טילים משומשים",
      "dead": "לוויינים מתים",
      "working": "לוויינים פעילים"
    },
    "bandsTitle": "לפי גובה",
    "bands": {
      "low": "מתחת ל-600 ק״מ",
      "crowded": "600 עד 1 000 ק״מ",
      "upper": "1 000 עד 2 000 ק״מ",
      "medium": "2 000 עד 34 000 ק״מ",
      "geo": "בסביבות 36 000 ק״מ",
      "beyond": "מעל 37 600 ק״מ",
      "stretched": "מסלולים מוארכים"
    },
    "bandAria": "{band}: {total} בסך הכול. {debris} פסולת, {rocket} גופי טילים, {dead} לוויינים מתים, {working} פעילים.",
    "show": "הצג על המפה",
    "hide": "הסתר מהמפה",
    "showTitle": "כל חתיכת פסולת וכל טיל משומש, צבועים לפי סוג",
    "drawn": "{n} נקודות: אפור הוא פסולת, צהוב הוא טיל משומש. כל אחת בגובה ובשיפוע האמיתיים שלה, במקום מומצא על המסלול שלה.",
    "storiesTitle": "מהקטלוג",
    "oneObject": "אובייקט אחד",
    "objects": "{n} אובייקטים",
    "oneLaunch": "שיגור אחד",
    "launches": "{n} שיגורים",
    "oneThing": "דבר אחד",
    "things": "{n} דברים",
    "storyLaunched": "{objects} מ{launches} הצטרפו לקטלוג בשבוע שעד {date}.",
    "storyCameDown": "בשבוע ההוא ירדו אל האטמוספירה: {things}.",
    "storyCameDownBiggest": "בשבוע ההוא ירדו אל האטמוספירה: {things}, הגדול ביניהם {name}.",
    "storyCloud": "ענן הפסולת הגדול ביותר הוא של {name}: {pieces} חתיכות עדיין במסלול.",
    "storyClouds": "ענני הפסולת הגדולים ביותר: {name}, {pieces} חתיכות עדיין למעלה; אחריו {name2}, {pieces2}, ו{name3}, {pieces3}.",
    "storyOldest": "הדבר הוותיק ביותר שעדיין במסלול הוא {name}, ששוגר ב-{year}: {years} שנים של הקפות.",
    "untracked": "קטנים מדי למעקב, לפי המודל של ESA: בערך {mid} מיליון חתיכות בגודל 1 עד 10 ס״מ ו-{small} מיליון בגודל 1 מ״מ עד 1 ס״מ, נכון ל-{when}. הערכה, לא ספירה.",
    "untrackedSource": "סטטיסטיקות סביבת החלל של ESA",
    "honesty": "נספר מהקטלוג של CelesTrak כפי שנקרא ב-{date}: מה שמכ״ם יכול לעקוב אחריו, מגודל של כ-10 ס״מ. חתיכות קטנות יותר רבות בהרבה ואינן בשום קטלוג. איפה נקודה נמצאת לאורך המסלול שלה להמחשה."
  },
  "klassFar": {
    "dwarf": "כוכב לכת ננסי",
    "interstellar": "אובייקט בין-כוכבי"
  },
  "moments": {
    "title": "בשביל מה באת",
    "wonder": {
      "id": "wonder",
      "label": "פלא",
      "hint": "טוס מסביב והקש על כל דבר."
    },
    "now": {
      "id": "now",
      "label": "עכשיו",
      "hint": "מה מעל הראש שלך ברגע הזה."
    },
    "next": {
      "id": "next",
      "label": "בקרוב",
      "hint": "מה מגיע, ומתי."
    }
  },
  "audio": {
    "on": "צליל: פועל",
    "off": "צליל: כבוי",
    "toggleTitle": "מוזיקה וצלילים. כבויים עד שתפעיל אותם; נשמר במכשיר הזה.",
    "mute": "השתק",
    "unmute": "צליל",
    "muteTitle": "כבה את המוזיקה והצלילים",
    "unmuteTitle": "הפעל את המוזיקה והצלילים",
    "panelTitle": "צליל",
    "panelNote": "מוזיקה שקטה למפה ולמסעות שלה. שום דבר לא יורד עד שתפעיל אותה.",
    "creditsLine": "מוזיקה וצלילים: {credits}",
    "narrationCredit": "קריינות: קול סינתטי, Kokoro-82M (af_heart), Apache-2.0"
  },
  "dwarfLook": {
    "colour": "מצויר בצבע שהאור שלו מראה במדידה (B−V {bv}, V−R {vr}), בהיר כפי שפני השטח שלו מחזירים (החזרתיות {albedo}) בסולם מכווץ, כדי שהכהה מבין העולמות האלה עדיין יופיע.",
    "colourRed": "מצויר בצבע שהאור שלו מראה במדידה (B−V {bv}, V−R {vr}), אחד הדברים האדומים ביותר במערכת השמש, בהיר כפי שפני השטח שלו מחזירים (החזרתיות {albedo}) בסולם מכווץ, כדי שהכהה מבין העולמות האלה עדיין יופיע.",
    "shapeEgg": "הצורה שלו היא הביצה שעקום האור שלו וכיסוי כוכב ב-2017 מדדו, {a} × {b} × {c} ק״מ.",
    "shapeMeasured": "הצורה שלו היא זו שכיסויי כוכבים מדדו.",
    "shapeUnknown": "הצורה שלו מעולם לא נמדדה, ולכן הוא מצויר עגול.",
    "ring": "הטבעת שלו נמצאת במרחק, ברוחב ובאטימות שנמדדו; איך הטבעת נטויה בשמיים לא מצויר.",
    "faintRings": "שתי הטבעות שלו, שנמצאו ב-2023, קלושות מכדי להיראות באטימות האמיתית שלהן, ולכן הן לא מצוירות.",
    "surface": "שום טלסקופ לא הצליח להבחין בפני השטח שלו: שום דבר עליו לא מצויר, והוא מצויר נייח, בלי להסתובב.",
    "source": "מספרים: {src}."
  },
  "worldFace": {
    "titan": {
      "title": "טיטאן, בשתי דרכים",
      "modes": {
        "own": "אינפרא-אדום",
        "radar": "מכ״ם"
      },
      "notes": {
        "own": "הקרקע של טיטאן כפי שהמצלמה של Cassini ראתה אותה דרך הערפל באור אינפרא-אדום קרוב (938 ננומטר), בכתום של הערפל. הימים בצפון כהים לאורך קווי המתאר ש-Cassini שרטט במכ״ם, ומקרוב, שם השמש משתקפת בהם, הם נוצצים: היכן הנצנוץ נופל חושב; הגודל והבהירות שלו להמחשה.",
        "radar": "רצועות של הקרקע של טיטאן כפי שהמכ״ם של Cassini ראה אותן דרך הערפל, 2004 עד 2015: בהיר הוא קרקע מחוספסת או קרקע נטויה לעבר המכ״ם, כהה הוא חלק, והימים של מתאן ואתאן נוזליים שחורים. האפור הוא שלנו: למכ״ם אין צבע. המכ״ם ראה 61 % מטיטאן; בין הרצועות שלו נראית מפת האינפרא-אדום, עמומה, בכתום. USGS Astrogeology ו-NASA/JPL-Caltech, נחלת הכלל."
      }
    },
    "venus": {
      "title": "נוגה, בשתי דרכים",
      "modes": {
        "own": "עננים",
        "surface": "קרקע"
      },
      "notes": {
        "own": "פסגות העננים, וזה כל מה שעין או טלסקופ רואים אי פעם מנוגה.",
        "surface": "הקרקע שמתחת לעננים, ממופה במכ״ם ממסלול על ידי Magellan של NASA בין 1990 ל-1992. בהיר הוא קרקע מחוספסת וכהה הוא חלק. הכתום נוסף, והרצועות ש-Magellan החמיצה מולאו מהקצוות שלהן. היא מוארת על ידי השמש כאילו העננים לא שם: ההרים והמדרונות התלולים שלה ממד הגבהים של Magellan, מצוירים גבוהים פי שישה, מטילים צללים. היא לא נעה עם העננים."
      }
    },
    "jupiter": {
      "title": "צדק, בשתי דרכים",
      "modes": {
        "own": "מפת אמן",
        "hubble": "כפי ש-Hubble ראה"
      },
      "notes": {
        "own": "מפת אמן, שנעשתה מתמונות של חלליות והוחלקה (Solar System Scope). זו התמונה שרוב האנשים מכירים.",
        "hubble": "צדק כפי ש-Hubble מיפה אותו ב-11 בדצמבר 2025. הרצועות נמצאות היכן שהיו באותו יום, ושום ענן לא נמצא היכן שהוא היום. הצבעים הם מסנני האדום, הירוק והסגול של Hubble, צהובים מעט יותר ממה שהעין הייתה רואה. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, בעיבוד."
      }
    },
    "saturn": {
      "title": "שבתאי, בשתי דרכים",
      "modes": {
        "own": "מפת אמן",
        "hubble": "כפי ש-Hubble ראה"
      },
      "notes": {
        "own": "מפת אמן, שנעשתה מתמונות של חלליות והוחלקה (Solar System Scope). זו התמונה שרוב האנשים מכירים.",
        "hubble": "שבתאי כפי ש-Hubble מיפה אותו ב-29 באוגוסט 2025, במסנני האדום, הירוק והסגול שלו, צהוב מעט יותר ממה שהעין הייתה רואה. הרצועה שבקו המשווה שהטבעות הסתירו באותו יום מולאה מהעננים משני צדיה. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, בעיבוד."
      }
    },
    "uranus": {
      "title": "אורנוס, בשתי דרכים",
      "modes": {
        "own": "מפת אמן",
        "hubble": "כפי ש-Hubble ראה"
      },
      "notes": {
        "own": "מפת אמן, שנעשתה מתמונות של חלליות והוחלקה (Solar System Scope). זו התמונה שרוב האנשים מכירים.",
        "hubble": "אורנוס כפי ש-Hubble מיפה אותו ב-23 באוקטובר 2025. כוכב הלכת שוכב על צדו והקוטב הצפוני שלו פונה אלינו, ולכן Hubble ראה רק את החצי הצפוני; החצי הדרומי קיבל את הצבע של קו המשווה, לא ניחוש. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, בעיבוד."
      }
    },
    "neptune": {
      "title": "נפטון, בשתי דרכים",
      "modes": {
        "own": "מפת אמן",
        "hubble": "כפי ש-Hubble ראה"
      },
      "notes": {
        "own": "מפת אמן, שנעשתה מתמונות של חלליות והוחלקה (Solar System Scope). זו התמונה שרוב האנשים מכירים.",
        "hubble": "נפטון כפי ש-Hubble מיפה אותו ב-24 באוגוסט 2025: חיוור יותר מהתמונות המפורסמות. הצפון הרחוק היה מחוץ לטווח הראייה של Hubble וקיבל את הצבע של העננים האחרונים שהוא ראה, לא ניחוש. NASA, ESA, A.A. Simon, M.H. Wong (OPAL), CC BY 4.0, בעיבוד."
      }
    }
  },
  "exposure": {
    "panelTitle": "חשיפה",
    "modes": {
      "eye": "עין",
      "camera": "מצלמה",
      "deep": "עמוקה"
    },
    "notes": {
      "eye": "מה שהיית רואה ממקום חשוך: קלוש ואפור.",
      "camera": "חשיפה ארוכה: דקות של אור, כפי שמצלמה שומרת אותו.",
      "deep": "מתיחה של מצפה כוכבים: הגז העמום ביותר מוגבר."
    },
    "real": "הגז אמיתי, וקלוש: לעין שליד טלסקופ הוא זוהר אפור, כי עין הלילה לא רואה צבע. המפה מציירת אותו כמודל תלת-ממדי; התצלום שהמחוון מראה הוא חשיפה ארוכה.",
    "colours": {
      "broadband": "הוא צולם דרך מסנני צבע רחבים ({filters}), ולכן הצבעים קרובים למה שעין רגישה בהרבה הייתה רואה.",
      "mixed": "הוא צולם דרך מסנני צבע רחבים בתוספת מסנן צר למימן זוהר ({filters}), ולכן הגז האדום חזק כאן יותר מכפי שהעין הייתה מוצאת אותו.",
      "narrowband": "הצבעים שלו ממופים: כל אחד הוא האור של גז אחד דרך מסנן צר ({filters}), שנבחרו כדי להראות את המבנה, לא מה שהעין הייתה רואה.",
      "infrared": "הוא צולם באור אינפרא-אדום, שאף עין לא רואה ({filters}), ולכן כל צבע כאן נבחר: הוא מראה מה יש שם, לא מה שהעין הייתה רואה.",
      "unstated": "הארכיון שלו לא אומר באילו מסננים השתמשו, ולכן אנחנו לא אומרים אם אלה הצבעים שעין הייתה רואה."
    },
    "part": "הוא מראה את {part}, לא את כולו.",
    "creditLead": "תמונה: ",
    "creditTail": " · {licence}, הקצוות דהו והשמיים הוחשכו על ידינו"
  },
  "look": {
    "panelTitle": "מראה",
    "modes": {
      "measured": "נמדד",
      "film": "קולנועי"
    },
    "titles": {
      "measured": "רק מה שנמדד או ממודל, בקצב אמיתי",
      "film": "מוסיף פרטים שנוצרו ומזג אוויר להמחשה"
    }
  },
  "lookSaid": {
    "measured": "מראה נמדד: שום דבר שנוצר או להמחשה לא מצויר עליו.",
    "film": "מראה קולנועי: פרטים שנוצרו ומזג אוויר להמחשה מצוירים.",
    "worlds": {
      "saturn": "מזג אוויר: הרצועות נעות במהירויות הרוח ש-Cassini מדד. תנועה ממודלת, לא העננים של היום."
    },
    "also": {
      "venus": "על ברקים בנוגה דווח והם עדיין שנויים במחלוקת; שום ברק לא מצויר."
    },
    "turning": {
      "jupiter": "מקרוב, הסגלגל BA ושלושה סגלגלים לבנים מסתובבים היכן שהמפה מציבה אותם."
    },
    "poles": {
      "jupiter": "הציקלונים סביב כל קוטב ממודלים מהתצפיות של Juno מ-2017, שמונה סביב אחד בצפון וחמישה בדרום: שחזור, לא תצלום."
    },
    "sun": {
      "measured": "מראה נמדד: הגרגיר שנוצר כבוי, והכתר והבליטות נשארים נייחים.",
      "film": "מראה קולנועי: הגרגיר נוצר, והכתר והבליטות נעים כפי שהם מצוירים, לא כפי שנמדדו."
    }
  },
  "otherLight": {
    "panelTitle": "אור אחר",
    "bands": {
      "visible": "נראה",
      "infrared": "אינפרא-אדום",
      "microwave": "מיקרוגל",
      "gamma": "קרני גמא"
    },
    "notes": {
      "visible": "השמיים כפי שעיניים ומצלמות רואות אותם.",
      "infrared": "השמיים באינפרא-אדום, בצבעים מלאכותיים: אבק חם וכוכבים קרירים.",
      "microwave": "מיקרוגל, כבהירות: הגלקסיה מעל האור הקדום ביותר.",
      "gamma": "קרני גמא, בצבעים מלאכותיים: פולסרים, בלזארים, זוהר של קרניים קוסמיות."
    },
    "colours": {
      "infrared": "אדום הוא 22 µm, ירוק 4.6 µm, כחול 3.4 µm (WISE)",
      "microwave": "פס אחד, 94 GHz, מצויר כבהירות (WMAP)",
      "gamma": "אדום הוא 0.3 עד 1 GeV, ירוק 1 עד 3, כחול מעל 3 (Fermi)"
    },
    "mixLabel": "מהשמיים הנראים אל {band}",
    "mixValue": "{pct} % {band}",
    "loading": "מוריד את התמונה של כל השמיים.",
    "failed": "התמונה הזאת לא הגיעה. השמיים כפי שהיו.",
    "creditLead": "סקר: ",
    "creditTail": ". אריחים: CDS, שטרסבורג."
  },
  "overlay": {
    "panelTitle": "נתוני כדור הארץ",
    "keyTitle": "על הגלובוס עכשיו",
    "keyOff": "הסר",
    "keyOffTitle": "הצג את כדור הארץ כמות שהוא",
    "none": "כלום",
    "loading": "מבקש מ-NASA את התמונה.",
    "failed": "התמונה הזאת לא הגיעה. הגלובוס כפי שהיה.",
    "noEarth": "מוצג על כדור הארץ, כשהוא בטווח הראייה.",
    "line": "{what} {dated} {made} {credit}",
    "dated": {
      "daily": "התמונה היא של {date}.",
      "monthly": "התמונה היא הממוצע של {date}."
    },
    "made": {
      "measured": "נמדד ממסלול; ברור היכן שלא נראה דבר.",
      "analysed": "נמדד, והפערים מולאו.",
      "modelled": "מודל מזג אוויר שהוזנו בו מדידות, לא תמונה ישירה."
    },
    "credit": "נתונים: {credit}, דרך NASA GIBS. מפה של נתונים, לא תצלום.",
    "wind": {
      "title": "רוח",
      "loading": "מבקש את שדה הרוח.",
      "failed": "שדה הרוח לא הגיע. הגלובוס כפי שהיה.",
      "what": "הרוח עשרה מטרים מעל הקרקע; הצבע הוא המהירות שלה.",
      "dated": "התחזית היא ל-{date}, {time} UTC.",
      "mean": "בערך {mean} מ׳/שנ׳ בממוצע, עד {max}.",
      "sped": "הפסים מזיזים {n} שעות של רוח בשנייה.",
      "spedDay": "הפסים מזיזים יממה של רוח בשנייה.",
      "still": "כל פס הוא חתיכה מהזרימה, עומדת במקומה.",
      "credit": "נתונים: {credit}. מודל מזג אוויר, לא מדידה."
    },
    "currents": {
      "title": "זרמי האוקיינוס",
      "loading": "מבקש את זרמי האוקיינוס.",
      "failed": "זרמי האוקיינוס של היום לא כאן. הגלובוס כפי שהיה.",
      "what": "זרמים על פני הים; הצבע הוא הטמפרטורה של המים.",
      "dated": "חושב מגובה הים שלוויינים מדדו ב-{date}: הזרימה היציבה, בלי גאות ושפל או סחף של רוח, והכי פחות בטוחה בקו המשווה.",
      "tempDated": "הטמפרטורה נמדדה ב-{date}, הפערים מולאו.",
      "tempMissing": "פס אפור הוא מים שאין להם טמפרטורה בנתונים.",
      "sped": "הפסים מזיזים {n} ימים של סחף בשנייה; פס ארוך הוא מים מהירים.",
      "spedHours": "הפסים מזיזים {n} שעות של סחף בשנייה; פס ארוך הוא מים מהירים.",
      "still": "כל פס הוא חתיכה מהזרימה, עומדת במקומה; פס ארוך הוא מים מהירים.",
      "credit": "נתונים: {credit}."
    },
    "legendAria": "{title}, מ-{low} עד {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "הדמויות הן מסורת, שצוירה על ידינו; הכוכבים בפינות שלהן נמצאים במרחקים שנמדדו.",
    "lineSky": "הדמויות הן מסורת, שצוירה על ידינו, מעל הכוכבים כפי שרואים אותם מכדור הארץ.",
    "ecliptic": "הקו המקווקו הוא האקליפטיקה, מסלול השמש במשך השנה.",
    "distance": "{n} ש״א",
    "namedDistance": "{name}, {n} ש״א"
  },
  "colourKey": {
    "title": "צבע לפי",
    "unknown": "לא ידוע עבורם",
    "scope": "סופר את מה שמצויר מכאן, בשכבות שפועלות.",
    "byLayer": "הצורה היא מה שהוא; הצבע הוא השכבה שלו.",
    "crewed": "מהם, נבנו לשאת צוות",
    "swarm": "מהם, בקבוצת לוויינים גדולה"
  },
  "trajectory": {
    "label": "המסלול שלו, ההקפה וחצי הבאות",
    "ariaLabel": "גובה לאורך זמן, והמסלול מעל הקרקע על מפה שטוחה",
    "km": "{n} ק״מ",
    "now": "עכשיו",
    "laps": "1½ הקפות אחר כך",
    "north": "צ",
    "south": "ד",
    "note": "חושב מאותם מרכיבים כמו הנקודה; המפה היא הקרקע שמתחתיו ישירות."
  },
  "timeFacts": {
    "label": "90 הדקות הבאות",
    "barLabel": "אור שמש וצל ב-90 הדקות הבאות: {parts}",
    "barSunlit": "{mins} דק׳ באור השמש",
    "barShadow": "{mins} דק׳ בצל של כדור הארץ",
    "now": "עכשיו",
    "end": "+90 דק׳",
    "entersShadowIn": "נכנס לצל של כדור הארץ בעוד {mins}",
    "entersSunlightIn": "יוצא לאור השמש בעוד {mins}",
    "entersShadowAt": "נכנס לצל של כדור הארץ ב-{time}",
    "entersSunlightAt": "יוצא לאור השמש ב-{time}",
    "allSunlit": "באור השמש בכל 90 הדקות הבאות",
    "allShadow": "בצל של כדור הארץ בכל 90 הדקות הבאות",
    "minutes": "{n} דק׳",
    "underAMinute": "פחות מדקה",
    "lapIn": "משלים את ההקפה הזאת בעוד {mmss}",
    "lapAt": "משלים את ההקפה הזאת ב-{time}",
    "orbit": "הקפה {n} מאז השיגור",
    "orbitNote": "מוסק: הספירה של הקטלוג בזמן הייחוס של מרכיבי המסלול, ועוד ההקפות מאז.",
    "launched": "שוגר ב-{year}",
    "nowSunlit": "באור השמש",
    "nowShadow": "בצל של כדור הארץ",
    "shadowIn": "צל בעוד {mins}",
    "sunlightIn": "אור שמש בעוד {mins}",
    "shadowAt": "צל ב-{time}",
    "sunlightAt": "אור שמש ב-{time}",
    "lapEndsIn": "ההקפה מסתיימת בעוד {mmss}",
    "lapEndsAt": "ההקפה מסתיימת ב-{time}"
  },
  "train": {
    "label": "ברכבת",
    "oneOf": "אחד מתוך {n} ששוגרו יחד ({designator}).",
    "youLead": "זה מוביל.",
    "leads": "{name} מוביל; זה נמצא במקום {position} בשורה.",
    "stillRaising": "עדיין עולים כשורה אחת, בגובה של כ-{alt} ק״מ — שרשרת האורות שאנשים מדווחים עליה.",
    "spreadOut": "מפוזרים עכשיו, בגובה של כ-{alt} ק״מ; כבר לא שורה בשמיים."
  },
  "aboard": {
    "label": "גם על הסיפון",
    "openTitle": "פתח את הכרטיס של זה",
    "note": "לאלה אין נקודה משלהם. הם בדיוק היכן שהחללית הזאת נמצאת, כי הם מוברגים אליה.",
    "backTitle": "פתח את הכרטיס של החללית שנושאת את זה"
  },
  "myth": {
    "label": "אומרים הרבה",
    "line": "{claim} — {correction}",
    "contested": "אומרים הרבה, והדבר באמת שנוי במחלוקת: {claim} — {correction}"
  },
  "source": {
    "prefix": "מקור",
    "unknown": "המקור לא תועד",
    "fetched": "נקרא {age}"
  },
  "photo": {
    "title": "הרכב תמונה",
    "barLabel": "תמונה",
    "shapesLabel": "צורה",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "מסגר את התמונה ב-{shape}",
    "caption": "כיתוב",
    "captionTitle": "הרצועה עם השם, התאריך והכתובת",
    "save": "שמור תמונה",
    "saveTitle": "שמור את מה שבתוך המסגרת כ-JPEG",
    "saveTitlePng": "שמור את מה שבתוך המסגרת כ-PNG",
    "timeLabel": "זמן",
    "earlier": "מוקדם יותר",
    "later": "מאוחר יותר",
    "timeTitle": "{dir} ב-{unit}, כפי שכפתור הזמן מתקדם",
    "lens": "עדשה",
    "lensValue": "{n}°",
    "lensTitle": "שדה ראייה, {n} מעלות. צר הוא עדשה ארוכה; רחב קולט יותר",
    "png": "PNG",
    "pngTitle": "שמור בלי אובדן, כקובץ גדול יותר",
    "share": "שיתוף",
    "shareTitle": "העבר את התמונה לתפריט השיתוף של המכשיר הזה",
    "sharedSaved": "המכשיר הזה לא רצה לשתף אותה. התמונה נשמרה במקום זה",
    "done": "צא ממצב צילום",
    "making": "מכין את התמונה",
    "saved": "התמונה נשמרה",
    "failed": "לא הצלחנו להכין את התמונה כרגע",
    "honesty": "מצויר ממיקומים שנמדדו, לא תצלום"
  },
  "tonight": {
    "title": "הלילה",
    "placeGuess": "ליד {place}, מנוחש לפי אזור הזמן שלך",
    "placeSet": "מ{place}",
    "placeMine": "מליד המקום שלך",
    "placeShared": "מ{place}, שותף איתך",
    "noPlace": "הגדר איפה אתה כדי לראות מה עובר מעליך.",
    "coords": "{lat}, {lon}",
    "working": "מחשב את המעברים של הלילה…",
    "passLine": "{name} · {time} · מ{from} אל {to}, {fists} בשיא ({deg}°) · {mins} דק׳",
    "startsIn": "מתחיל בעוד {countdown}",
    "startsAt": "מתחיל ב-{time}",
    "upNow": "מעל האופק עכשיו, הבט לכיוון {dir}",
    "showMe": "הראה לי",
    "showMeTitle": "פתח את השמיים מהמקום שלך, כשהם פונים לאן שהוא עולה",
    "guessCaveat": "הזמנים יכולים לסטות בכמה דקות מהמקום שבו אתה נמצא.",
    "unitRises": "עולה",
    "unitHigh": "בשיא",
    "unitLong": "דק׳ בטווח הראייה",
    "degrees": "{deg}°",
    "path": "מ{from} אל {to}",
    "rowDetail": "{time} · {deg} למעלה · {mins} דק׳",
    "nothingTonight": "שום דבר בהיר לא עובר מעליך הלילה.",
    "nextPass": "הבא: {when} · {name}",
    "nothingAtAll": "שום דבר בהיר לא עובר מעליך במשך שלושה ימים.",
    "darkFrom": "חשוך מ-{time}",
    "darkUntil": "חשוך עד {time}",
    "darkNow": "חשוך עכשיו",
    "neverDark": "לא נהיה חשוך הלילה",
    "moonRises": "ירח {pct} %, עולה ב-{time}",
    "moonUp": "ירח {pct} %, מעל האופק עכשיו",
    "moonDown": "ירח {pct} %, מתחת לאופק",
    "more": "עוד מעברים",
    "fewer": "פחות מעברים",
    "arcLabel": "המסלול שלו בשמיים: עולה בכיוון {from}, הכי גבוה {deg}° למעלה, שוקע בכיוון {to}",
    "cardinals": {
      "N": "צ",
      "E": "מ",
      "S": "ד",
      "W": "מע"
    },
    "best": {
      "title": "הכי טוב הלילה",
      "nothing": "שום דבר לא בולט הלילה.",
      "rowTitle": "הראה אותו בשמיים",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "בהירות {mag}",
      "passAria": "{name}: מופיע {t0} {d0}, הכי גבוה {t1} ב-{deg}° {d1}, נעלם {t2} {d2}, בהירות {mag}.",
      "fades": "הוא דועך אל הצל של כדור הארץ לפני שהוא שוקע.",
      "appears": "הוא יוצא מהצל של כדור הארץ באמצע הדרך למעלה.",
      "notVisible": "לא נראה: השמיים בהירים או שהוא בצל.",
      "rocket": "גוף טיל · {name}",
      "debris": "פסולת · {name}",
      "planetLine": "הכי טוב {time} · {deg}° למעלה, {dir}",
      "moonTitle": "ירח · {phase} · {pct} %",
      "moonSets": "שוקע ב-{time}",
      "moonRises": "עולה ב-{time}",
      "moonAllNight": "מעל האופק כל הלילה",
      "phases": {
        "new": "חדש",
        "waxingCrescent": "מלבין",
        "firstQuarter": "רבע ראשון",
        "waxingGibbous": "גיבוני מלבין",
        "full": "מלא",
        "waningGibbous": "גיבוני מחשיך",
        "lastQuarter": "רבע אחרון",
        "waningCrescent": "מחשיך"
      },
      "showerLine": "עד {zhr} בשעה · הכי טוב {time}, {dir}",
      "dsoLine": "הכי טוב {time} · {deg}° למעלה, {dir} · {how}",
      "dsoNeeds": {
        "eye": "בעין",
        "binoculars": "במשקפת"
      },
      "view": "התצוגה שלי",
      "viewHeight": "כמה גבוה הוא צריך להיות",
      "facings": {
        "any": "מכל כיוון",
        "n": "צפון",
        "e": "מזרח",
        "s": "דרום",
        "w": "מערב"
      },
      "facingTitles": {
        "any": "כל השמיים",
        "n": "רק מה שהכי טוב בצפון",
        "e": "רק מה שהכי טוב במזרח",
        "s": "רק מה שהכי טוב בדרום",
        "w": "רק מה שהכי טוב במערב"
      },
      "heights": {
        "0": "כל גובה",
        "15": "מעל 15°",
        "30": "מעל 30°"
      },
      "viewNothing": "שום דבר לא עובר בחלק הזה של השמיים הלילה.",
      "darkHours": "חשוך {from} עד {to}",
      "moonless": "בלי ירח, לילה חשוך",
      "moonBright": "ירח {pct} % מסתיר כוכבים עמומים",
      "moonFaint": "ירח {pct} %, מעט אור",
      "neverDark": "לא נהיה חשוך הלילה.",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "חושב למקום שלך. הבהירות היא הערכה."
    },
    "skybar": {
      "title": "השמיים",
      "field": "שדה ראייה",
      "fields": {
        "eye": "עין",
        "binoculars": "משקפת",
        "telescope": "טלסקופ"
      },
      "fieldNotes": {
        "eye": "רחב כמו מה שאתה רואה. גלול או צבוט כדי להתקרב.",
        "binoculars": "שדה של 7°: כוכבים עמומים יותר מופיעים.",
        "telescope": "שדה של 1°: כוכבי לכת הופכים לדיסקות."
      },
      "following": "עוקב אחרי {name}. גרור את השמיים כדי לעזוב.",
      "followSet": "{name} שקע, ולכן התצוגה עזבה.",
      "show": "קווים ושמות",
      "toggles": {
        "figures": "דמויות",
        "names": "שמות",
        "art": "ציורים",
        "bounds": "גבולות",
        "sunPath": "מסלול השמש",
        "equator": "קו המשווה",
        "grid": "רשת",
        "starGrid": "רשת כוכבים",
        "meteors": "מטאורים",
        "trails": "שובלים",
        "seeThrough": "קרקע שקופה"
      },
      "toggleTitles": {
        "seeThrough": "צייר את היבשה שקופה, כדי למצוא מה נמצא מתחת לאופק",
        "figures": "דמויות קבוצות הכוכבים",
        "names": "שמות של קבוצות כוכבים וכוכבים בהירים",
        "sunPath": "המסלול שהשמש, הירח וכוכבי הלכת נצמדים אליו",
        "equator": "קו המשווה של השמיים, מעל זה של כדור הארץ",
        "grid": "גובה וכיוון, עם הקו צפון-דרום",
        "starGrid": "הרשת שעליה ממופים הכוכבים",
        "art": "הדמויות המערביות כציורים, מאת Johan Meuris",
        "bounds": "הגבולות הרשמיים של 88 קבוצות הכוכבים",
        "meteors": "פסים מהממטרים הפעילים הלילה, בקצב של הלילה",
        "trails": "השעה האחרונה של כל כוכב בהיר, כחשיפה ארוכה"
      },
      "time": "הזמן בשמיים",
      "timeNow": "עכשיו",
      "timeNowTitle": "חזרה להווה",
      "timeDusk": "ערב",
      "timeMidnight": "חצות",
      "timeDawn": "שחר",
      "timeTitles": {
        "dusk": "סוף הדמדומים האזרחיים הערב",
        "midnight": "אמצע הלילה",
        "dawn": "תחילת הדמדומים האזרחיים בבוקר"
      },
      "timeStrip": "גרור כדי לסובב את השמיים",
      "timeTicks": {
        "dusk": "ערב",
        "midnight": "חצות",
        "dawn": "שחר"
      },
      "timeStripAria": "הזמן של השמיים: גרור, או השתמש בחצים במקלדת, עשר דקות בצעד",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "יום",
        "golden": "שמש נמוכה",
        "civil": "דמדומים אזרחיים",
        "nautical": "דמדומים ימיים",
        "astronomical": "דמדומים אחרונים",
        "night": "לילה"
      },
      "timeNoNight": "לא נהיה חשוך כאן הלילה.",
      "timeFar": "אין לוויינים כל כך רחוק מהיום: המסלולים שלהם מתיישנים.",
      "eyepiece": "עינית",
      "eyepieces": {
        "low": "נמוכה · 1°",
        "medium": "בינונית · 30′",
        "high": "גבוהה · 12′"
      },
      "eyepieceTitles": {
        "low": "שדה של מעלה אחת: ברוחב שני ירחים מלאים",
        "medium": "חצי מעלה: הירח כולו",
        "high": "חמישית מעלה: כוכבי לכת כדיסקות"
      },
      "centre": "מה במרכז",
      "centreTitle": "קרא בשם את מה שמרכז התצוגה נמצא עליו; Enter פותח את הכרטיס שלו",
      "con": {
        "kind": "קבוצת כוכבים",
        "label": "{name}, קבוצת כוכבים.",
        "inside": "ב{name}"
      },
      "landscape": {
        "city": "קו רקיע: של עיר, מצויר. לא הרחוב שלך.",
        "hills": "קו רקיע: גבעות, מצויר. לא שלך.",
        "coast": "ים בכיוון {dir}, ממפת המים. היבשה מצוירת."
      },
      "artWesternOnly": "הציורים שייכים לדמויות המערביות",
      "culture": "השמיים של מי",
      "cultures": {
        "western": "מערביים",
        "chinese": "סיניים",
        "maori": "מאורים",
        "hawaiian": "הוואיים",
        "samoan": "סמואיים",
        "tongan": "טונגיים",
        "norse": "נורדיים",
        "boorong": "בורונג"
      },
      "cultureNotes": {
        "western": "88 קבוצות הכוכבים שאסטרונומים הסכימו עליהן ב-1922.",
        "chinese": "כ-300 אסטריזמים קטנים. קריאה אחת של שמיים חיים.",
        "maori": "שש דמויות. השמות שונים בין שבטי האיווי; השמיים חיים.",
        "hawaiian": "קווי הכוכבים של מנווט, שעדיין משתמשים בהם כדי לנווט.",
        "samoan": "ארבע עשרה דמויות מהמסורת הסמואית. מסורת חיה.",
        "tongan": "שבילי כוכבים ודמויות של טונגה. מסורת חיה.",
        "norse": "שש דמויות, שחזור אחד של השמיים הנורדיים.",
        "boorong": "השמיים של משפחת בורונג, כפי שסופרו ב-1857. עדיין חיים."
      },
      "cultureCredits": {
        "western": "ציורים: Johan Meuris, עבור Stellarium, Free Art License. Carina, Puppis ו-Vela חולקות ציור אחד; ל-Serpens אין.",
        "chinese": "דמויות: Sun Shuwei ו-Karrie Berglund, עבור Stellarium, CC BY-SA 4.0. שחזור מתועד.",
        "maori": "דמויות: Dan Smale, עבור Stellarium, CC BY-SA 4.0. שחזור מתועד.",
        "hawaiian": "דמויות: על פי Nainoa Thompson, מאת Kamehameha Schools Kapālama, עבור Stellarium, CC BY-SA 4.0.",
        "samoan": "דמויות: Jake Fitisemanu עם שומרי המסורת הסמואית, עבור Stellarium, CC BY-SA 4.0. שחזור מתועד.",
        "tongan": "דמויות: Dan Smale, עבור Stellarium, CC BY-SA 4.0. שחזור מתועד ממקורות מועטים.",
        "norse": "דמויות: Jonas Persson, עבור Stellarium, CC BY-SA 4.0. שחזור, לא תיעוד.",
        "boorong": "דמויות: John Morieson ו-Alex Cherney, עבור Stellarium, CC BY-SA 4.0. קריאה אחת של שמיים חיים."
      },
      "meteorNote": "{name}: כ-{n} בשעה בשמיים האלה.",
      "meteorFew": "{name}: פחות מאחד בשעה בשמיים האלה.",
      "meteorDown": "{name}: נקודת המוצא מתחת לאופק, אין פסים.",
      "meteorHonest": "הקצב של הלילה הוא מודל. הפסים להמחשה.",
      "meteorSporadic": "אין ממטר הלילה. מקור האנטי-שמש: {n} בשעה.",
      "darkness": "השמיים שלך",
      "darknessModes": {
        "city": "עיר",
        "town": "יישוב",
        "dark": "מקום חשוך"
      },
      "darknessAuto": "אוטומטי",
      "darknessAutoTitle": "קרא את סוג השמיים מאורות הלילה במקום שלך",
      "darknessBy": {
        "place": "מוערך ממפת אורות הלילה של NASA במקום שלך.",
        "reading": "קורא את אורות הלילה במקום שלך.",
        "unread": "לא הצלחנו לקרוא את מפת אורות הלילה: בחר את השמיים שלך.",
        "trip": "קבוע על ידי התחנה הזאת של המסע."
      },
      "darknessNotes": {
        "city": "עיר: כוכבים עד בהירות 4, בלי שביל החלב.",
        "town": "שולי יישוב: כוכבים עד בהירות 5.3.",
        "dark": "מקום חשוך: כוכבים עד 6.5 ושביל החלב."
      },
      "point": {
        "row": "כוון את הטלפון",
        "on": "כוון את הטלפון",
        "title": "הרם את הטלפון: התצוגה מסתובבת איתו",
        "note": "הרם את הטלפון אל השמיים והסתובב. התצוגה עוקבת.",
        "noPlace": "צריך את המקום שלך, כדי לדעת לאן צפון.",
        "denied": "הטלפון סירב לתת את חיישן התנועה. גרירה עדיין עובדת.",
        "deniedHow": "כדי לאפשר: טען מחדש, ואז בחר ״אפשר״ כשישאלו.",
        "none": "שום חיישן תנועה לא ענה כאן. גרירה עדיין עובדת.",
        "unsupported": "הדפדפן הזה לא נותן חיישן תנועה. גרירה עדיין עובדת.",
        "lineUpWith": "השמיים לא מתאימים? גרור עד ש-{name} מתיישר.",
        "lineUpPlain": "השמיים לא מתאימים? גרור עד שכוכב בהיר מתיישר.",
        "lined": "יושר ביד, {n}° מהמצפן.",
        "reset": "בטל יישור",
        "resetTitle": "חזור לצפון של המצפן עצמו",
        "accuracy": "המצפן אומר שהוא מדויק עד כ-{n}°.",
        "relative": "אין כאן מצפן. גרור את השמיים כדי ליישר אותם.",
        "declination": "צפון אמיתי: המצפן תוקן ב-{n}° {dir}.",
        "east": "מזרחה",
        "west": "מערבה",
        "honest": "הצפון הוא המצפן של הטלפון. מתכת בקרבת מקום מסיטה אותו."
      },
      "red": "אור אדום",
      "redTitle": "צבע את הדף באדום כדי לשמור על העיניים רגילות לחושך",
      "honesty": "כוכבים נמדדו, כוכבי לכת חושבו, אוויר ממודל, יבשה מצוירת."
    }
  },
  "keyHint": {
    "title": "בקרים",
    "titleTouch": "מחוות",
    "label": "מקשים שמזיזים את התצוגה",
    "labelTouch": "מחוות שמזיזות את התצוגה",
    "close": "סגור",
    "closeTitle": "סגור (Escape)",
    "does": {
      "turn": "סיבוב",
      "zoom": "קרוב, רחוק",
      "pan": "הזזה הצידה",
      "pick": "בחירה",
      "search": "חיפוש",
      "hide": "הסתר הכול",
      "show": "מה להציג",
      "share": "שיתוף",
      "esc": "סגירה",
      "keys": "כל המקשים",
      "tripPlay": "הפעל, השהה",
      "tripStep": "אחורה, קדימה",
      "tripCard": "הסתר כרטיס",
      "tripReplay": "שוב",
      "tripSound": "צליל",
      "tripLeave": "יציאה"
    },
    "how": {
      "drag": "גרירה",
      "wheel": "גלילה",
      "pinch": "צביטה",
      "two": "שתי אצבעות",
      "tap": "הקשה"
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
      "space": "רווח",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "קיצורי מקלדת",
    "tripTitle": "במסע"
  },
  "render": {
    "eyebrow": "Space Radar · מסע",
    "site": "spaceradar.ai",
    "fly": "טוס בעצמך",
    "music": "מוזיקה: John Bartmann, CC0. הקרדיטים המלאים ב-spaceradar.ai."
  },
  "glossary": {
    "title": "מילים בדף הזה",
    "hint": "הקש על מונח כדי לקבל משפט פשוט."
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} — שריפה שהייתה כאן בדיווח האחרון, {date}",
        "volcano": "{name} — הר געש שמתפרץ מאז {date}",
        "iceberg": "{name} — היה כאן בדיווח האחרון, {date}"
      },
      "size": "בערך {n} קמ״ר בדיווח ההוא"
    },
    "storm": {
      "lead": "{name} — {a} {status}; המרכז שלה היה כאן {ago}",
      "leadUnknown": "{name} — ציקלון טרופי; המרכז שלו היה כאן {ago}",
      "leadBefore": "{name} — {a} {status}; המרכז שלה מגיע לכאן {ago}",
      "leadBeforeUnknown": "{name} — ציקלון טרופי; המרכז שלו מגיע לכאן {ago}",
      "wind": "הרוחות החזקות ביותר בנתיב שלה, כולל התחזית, מגיעות ל-{n} קמ״ש",
      "statuses": {
        "hurricane": "סופת הוריקן",
        "typhoon": "סופת טייפון",
        "cyclone": "סופה ציקלונית טרופית",
        "storm": "סערה טרופית",
        "depression": "מערכת לחץ נמוך טרופית"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} — חור שחור במרחק {dist} שנות אור",
      "leadPulsar": "{name} — פולסר במרחק {dist} שנות אור",
      "leadMagnetar": "{name} — מגנטר במרחק {dist} שנות אור",
      "leadQuasar": "{name} — קוואזר במרחק {dist} שנות אור",
      "leadStar": "{name} — כוכב במרחק {dist} שנות אור",
      "leadRange": "{name} — {a} {kind} במרחק של בין {lo} ל-{hi} שנות אור",
      "mass": "במסה של {n} שמשות",
      "massRange": "במסה של בין {lo} ל-{hi} שמשות",
      "massMillions": "במסה של {n} מיליון שמשות",
      "massBillions": "במסה של {n} מיליארד שמשות",
      "spins": "מסתובב {n} פעמים בשנייה",
      "spinsSlow": "מסתובב פעם אחת כל {n} שניות",
      "kinds": {
        "blackhole": "חור שחור",
        "pulsar": "פולסר",
        "magnetar": "מגנטר",
        "star": "כוכב",
        "quasar": "קוואזר",
        "galaxy": "גלקסיה",
        "cluster": "צביר גלקסיות",
        "browndwarf": "ננס חום",
        "whitedwarf": "ננס לבן"
      },
      "leadGalaxy": "{name} — גלקסיה במרחק {dist} שנות אור, היכן שהיא נמצאת עכשיו",
      "leadCluster": "{name} — צביר גלקסיות במרחק {dist} שנות אור, היכן שהוא נמצא עכשיו",
      "leadBrowndwarf": "{name} — ננס חום במרחק {dist} שנות אור",
      "leadWhitedwarf": "{name} — ננס לבן במרחק {dist} שנות אור"
    },
    "dso": {
      "leadHome": "{name} היא הגלקסיה שאנחנו חיים בה; המרכז שלה במרחק {dist} שנות אור",
      "lead": "{name} — {a} {type} במרחק {dist} שנות אור",
      "leadRange": "{name} — {a} {type} במרחק של בין {lo} ל-{hi} שנות אור",
      "leadUntyped": "{name} נמצא במרחק {dist} שנות אור",
      "size": "ברוחב של כ-{n} שנות אור",
      "seenAs": "נראה כפי שהיה לפני {n} שנים",
      "seenAsMillions": "נראה כפי שהיה לפני {n} מיליון שנים",
      "constellation": "ב{con}",
      "kinds": {
        "galaxy": "גלקסיה",
        "nebula": "ערפילית",
        "cluster": "צביר כוכבים",
        "other": "אובייקט בחלל העמוק"
      }
    },
    "exoplanet": {
      "lead": "{name} — כוכב לכת סביב הכוכב {host}, במרחק {dist} שנות אור",
      "leadNoHost": "{name} — כוכב לכת סביב כוכב אחר, במרחק {dist} שנות אור",
      "size": "בערך פי {n} רחב מכדור הארץ",
      "sizeSmaller": "בערך {n} מהרוחב של כדור הארץ",
      "mass": "פי {n} מהמסה של כדור הארץ",
      "year": "השנה שלו נמשכת {n} ימים",
      "yearHours": "השנה שלו נמשכת {n} שעות",
      "found": "התגלה ב-{year} בשיטת {method}",
      "foundYear": "התגלה ב-{year}",
      "asOf": "מעותק של הקטלוג נכון ל-{date}"
    },
    "star": {
      "lead": "{name} — כוכב במרחק {dist} שנות אור",
      "leadColour": "{name} — כוכב {a} {colour} במרחק {dist} שנות אור",
      "near": "אחד הקרובים ביותר שיש",
      "seenAs": "נראה כפי שהיה לפני {n} שנים",
      "seenAsMonths": "נראה כפי שהיה לפני {n} חודשים",
      "luminosity": "מאיר פי {n} מהשמש",
      "dimmer": "מאיר ב-{n} מהבהירות של השמש",
      "colours": {
        "O": "כחול",
        "B": "כחול-לבן",
        "A": "לבן",
        "F": "צהוב-לבן",
        "G": "צהוב",
        "K": "כתום",
        "M": "אדום"
      }
    },
    "station": {
      "lead": "{name} — תחנת חלל מאוישת שמקיפה את כדור הארץ",
      "whyPass": "חוצה את השמיים שלך ב-{time}",
      "crew": "עם {crew} אנשים על הסיפון",
      "altitude": "{alt} ק״מ למעלה",
      "speed": "משלימה הקפה אחת כל {period} דקות"
    },
    "satellite": {
      "lead": "{name} — לוויין שמקיף את כדור הארץ",
      "leadKind": "{name} — {kind} שמקיף את כדור הארץ",
      "leadDocked": "{name} — {kind} שעגן ב{station}",
      "aSpacecraft": "חללית",
      "aTelescope": "טלסקופ חלל",
      "whyLaunchedDays": "שוגר לפני {n} ימים",
      "whyLaunchedYear": "שוגר ב-{year}",
      "operator": "מופעל על ידי {operator}",
      "purpose": "{purpose}",
      "altitude": "{alt} ק״מ למעלה",
      "whyPass": "חוצה את השמיים שלך ב-{time}"
    },
    "debris": {
      "lead": "{name} — חתיכת פסולת במעקב",
      "origin": "שנשארה מ{origin}",
      "brokeUp": "שהתפרק ב-{year}",
      "decay": "צפוי ליפול בחזרה לאטמוספירה בסביבות {date}",
      "altitude": "{alt} ק״מ למעלה",
      "burnsUp": "כמעט כולו נשרף בדרך למטה"
    },
    "rocket": {
      "lead": "{name} — שיגור של טיל",
      "leadWithPad": "{name} — שיגור של טיל מ{pad}",
      "leadStage": "{name} — שלב טיל משומש שמקיף את כדור הארץ",
      "stageLaunched": "שוגר ב-{year}",
      "whyCountdown": "ממריא {when}",
      "whyFlown": "שהמריא {when}",
      "destination": "בדרך אל {destination}",
      "missionType": "משימת {missionType}",
      "illustrative": "המסלול המצויר כאן הוא סקיצה של העלייה, לא מסלול שנמדד"
    },
    "probe": {
      "lead": "{name} — חללית בחלל של מערכת השמש",
      "leadOrbits": "{name} — חללית שמקיפה את {world}",
      "destination": "בדרך אל {destination}",
      "lightTime": "רחוקה מספיק כך שהודעת רדיו לוקחת {mins} דקות לכל כיוון",
      "lightTimeSeconds": "קרובה מספיק כך שהודעת רדיו לוקחת {secs} שניות לכל כיוון",
      "lightTimeHours": "רחוקה מספיק כך שהודעת רדיו לוקחת {hours} שעות לכל כיוון",
      "distanceSun": "{au} יחידות אסטרונומיות מהשמש",
      "milestone": "ו-{milestone} צפוי ב-{date}"
    },
    "telescope": {
      "lead": "{name} — טלסקופ חלל",
      "observing": "מכוון השבוע אל {target}",
      "station": "חונה ב{station}",
      "altitude": "{alt} ק״מ למעלה",
      "sees": "הוא רואה ב{band}"
    },
    "asteroid": {
      "lead": "{name} — אובייקט קרוב לכדור הארץ על מסלול משלו סביב השמש",
      "leadMainBelt": "{name} — אסטרואיד בחגורה הראשית, בין מאדים לצדק",
      "leadBeyond": "{name} — גוף קטן מעבר לנפטון, על מסלול משלו סביב השמש",
      "leadDwarf": "{name} — כוכב לכת ננסי על מסלול משלו סביב השמש",
      "leadDwarfBelt": "{name} — כוכב לכת ננסי בחגורת האסטרואידים, בין מאדים לצדק",
      "leadDwarfBeyond": "{name} — כוכב לכת ננסי מעבר לנפטון",
      "leadDwarfFarBeyond": "{name} — כוכב לכת ננסי הרחק מעבר לנפטון",
      "leadInterstellarOut": "{name} הגיע מכוכב אחר והוא בדרכו החוצה ממערכת השמש",
      "leadInterstellarIn": "{name} הגיע מכוכב אחר והוא נופל פנימה לעבר השמש",
      "distanceSun": "{au} יחידות אסטרונומיות מהשמש",
      "whyApproach": "חולף ליד כדור הארץ ב-{date} במרחק של {ld}× המרחק לירח",
      "size": "{size}",
      "willNotHit": "הוא לא יפגע בכדור הארץ"
    },
    "comet": {
      "lead": "{name} — שביט בלולאה ארוכה סביב השמש",
      "leadPeriodic": "{name} — שביט שחוזר סביב השמש כל {n} שנים",
      "leadInterstellarOut": "{name} — שביט מכוכב אחר, בדרכו החוצה ממערכת השמש",
      "leadInterstellarIn": "{name} — שביט מכוכב אחר, נופל פנימה לעבר השמש",
      "whyPerihelion": "הכי קרוב לשמש ב-{date}",
      "nakedEye": "בהיר מספיק כדי למצוא אותו בלי טלסקופ",
      "faint": "עמום מדי לראות בלי טלסקופ",
      "distanceSun": "{au} יחידות אסטרונומיות החוצה"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} — אחד הדברים המוזרים שאנשים שלחו אל מחוץ לכוכב"
    },
    "site": {
      "lead": "{name} — מקום על הקרקע שעובד עם חלליות",
      "leadKind": "{name} — {a} {kind}",
      "where": "ב{where}",
      "whyDsn": "מדבר עכשיו עם {spacecraft}",
      "whyLaunch": "ושיגור {launch} צפוי {when}",
      "mpc": "הקוד שלו ב-Minor Planet Center הוא {code}",
      "closed": "נסגר ב-{year}",
      "kinds": {
        "pad": "משטח שיגור",
        "dish": "צלחת רדיו",
        "observatory": "מצפה כוכבים",
        "tracking": "תחנת מעקב",
        "launch-site": "אתר שיגור",
        "landing-site": "אתר נחיתה"
      }
    },
    "shower": {
      "lead": "{name} — ממטר מטאורים",
      "peak": "מגיע לשיאו בסביבות {date}",
      "speed": "עם מטאורים שפוגעים באוויר במהירות {n} ק״מ בשנייה",
      "parent": "מהאבק של {parent}"
    },
    "world": {
      "lead": "{name} — עולם במערכת השמש",
      "leadMoon": "{name} הוא הירח של כדור הארץ עצמו",
      "leadSun": "{name} הוא הכוכב במרכז מערכת השמש",
      "distanceKm": "{n} ק״מ משם",
      "whyPhase": "{phase} הלילה",
      "whyRise": "עולה מהמקום שבו אתה נמצא ב-{time}",
      "distance": "{distance}",
      "diameter": "בערך {n} ק״מ רוחב",
      "leadWhat": "{name} — {what}",
      "what": {
        "pluto": "כוכב לכת ננסי מעבר לנפטון, שנחשב כוכב הלכת התשיעי עד 2006",
        "io": "אחד מארבעת הירחים הגדולים של צדק, והעולם הגעשי ביותר במערכת השמש",
        "europa": "אחד מארבעת הירחים הגדולים של צדק, עם אוקיינוס של מים מלוחים מתחת לקרח שלו",
        "ganymede": "הירח הגדול ביותר של צדק והגדול ביותר במערכת השמש, גדול מכוכב חמה",
        "callisto": "אחד מארבעת הירחים הגדולים של צדק, והעצם הכי מלא מכתשים במערכת השמש",
        "titan": "הירח הגדול ביותר של שבתאי, מתחת לערפל כתום עבה, עם אגמי מתאן; Huygens נחתה עליו ב-2005",
        "enceladus": "ירח קטן וקפוא של שבתאי שהגייזרים שלו מתיזים את האוקיינוס מתחת לקרח שלו אל החלל",
        "triton": "הירח הגדול ביותר של נפטון; הוא מקיף לאחור וכנראה גוף שנלכד מחגורת קוויפר",
        "charon": "הירח הגדול ביותר של פלוטו, חצי מהגודל של פלוטו; שניהם מפנים תמיד את אותם הפנים זה אל זה",
        "phobos": "הגדול מבין שני הירחים של מאדים, סלע מגושם שמסתובב פנימה לעבר מאדים ב-1.8 מטר למאה",
        "deimos": "הקטן מבין שני הירחים של מאדים, סלע קטן ומגושם מכוסה מכתשים",
        "mimas": "הירח העגול הפנימי ביותר של שבתאי, שסימן עליו מכתש ברוחב שליש מהירח עצמו",
        "tethys": "הירח החמישי בגודלו של שבתאי, כמעט קרח מים טהור, שסדוק בבקע ובמכתש ענק",
        "dione": "ירח קפוא של שבתאי שהצד האחורי שלו שזור ברשת של מצוקי קרח בהירים",
        "rhea": "הירח השני בגודלו של שבתאי, כדור שלג מלוכלך וקפוא של קרח וסלע",
        "iapetus": "הירח השלישי בגודלו של שבתאי: צד אחד כהה כמו פחם, והשני בהיר פי עשרה",
        "miranda": "הקטן מבין חמשת הירחים הגדולים של אורנוס, עם קניונים עמוקים עד פי 12 מהגראנד קניון",
        "ariel": "הבהיר והצעיר למראה מבין חמשת הירחים הגדולים של אורנוס, חתוך על ידי עמקי העתקים",
        "umbriel": "הכהה מבין הירחים הגדולים של אורנוס, שמחזיר בערך חמישית מהאור שמגיע אליו",
        "titania": "הירח הגדול ביותר של אורנוס, אפור ניטרלי, סדוק בעמקי העתקים באורך של כמעט 1 600 ק״מ",
        "oberon": "הירח השני בגודלו של אורנוס, כהה, מכותש, ונושא הר בגובה 6 ק״מ"
      }
    }
  },
  "live": {
    "label": "מכדור הארץ עכשיו",
    "km": "ק״מ",
    "light": "האור לוקח",
    "lightYears": "שנות אור",
    "noteFar": "חושב מהמיקום המצויר, בשלוש ספרות. הוא לא מתעדכן ברצף.",
    "note": "חושב מהמסלול המצויר. הספרות האחרונות מראות שהוא נע, לא את מקומו עד קילומטר.",
    "seconds": "{s} שנ׳",
    "minSec": "{min} דק׳ {s} שנ׳",
    "hourMinSec": "{h} ש׳ {min} דק׳ {s} שנ׳",
    "sparkLabel": "מרחק מכדור הארץ",
    "sparkAria": "מרחק מכדור הארץ מ-{from} עד {to}. {closest}",
    "sparkNow": "עכשיו",
    "closest": "הכי קרוב: {date} · {dist}",
    "closestAbout": "הכי קרוב: בערך {date} · {dist}",
    "months": [
      "ינו׳",
      "פבר׳",
      "מרץ",
      "אפר׳",
      "מאי",
      "יוני",
      "יולי",
      "אוג׳",
      "ספט׳",
      "אוק׳",
      "נוב׳",
      "דצמ׳"
    ],
    "shortDate": "{day} {month} {year}",
    "closestTitle": "כוונן את השעון למעבר הקרוב ביותר הזה",
    "moonDistances": "{n} מרחקי ירח",
    "au": "{n} י״א",
    "sparkNote": "חושב מהמסלול המצויר, נקודה כל שישה ימים.",
    "sparkApprox": "כל כך קרוב התאריך והמרחק משוערים: המשיכה של כדור הארץ מושמטת.",
    "upYears": "במסלול {n} שנים: שוגר {date}",
    "upOneYear": "במסלול שנה אחת: שוגר {date}",
    "upUnderAYear": "במסלול פחות משנה: שוגר {date}",
    "upSinceYear": "שוגר ב-{year}: בערך {n} שנים במסלול",
    "upSinceYearNew": "שוגר ב-{year}",
    "smallBodyHonest": "חושב ממסלולו לאופק בגובה פני הים. להיות מעל האופק זה לא להיות בהיר מספיק כדי לראות: רובם צריכים טלסקופ."
  },
  "crew": {
    "label": "אנשים על הסיפון",
    "count": "{n} אנשים על הסיפון",
    "countOne": "אדם אחד על הסיפון",
    "hint": "{n} על הסיפון",
    "person": "{agency} · {days} ימים בחלל",
    "personNoAgency": "{days} ימים בחלל",
    "dockedLabel": "מעוגנים עכשיו, ומאז מתי",
    "docked": "{port} · {date}",
    "asOf": "נקרא {age} מ-Launch Library 2 (The Space Devs).",
    "stale": "נקרא ב-{date}: ישן מיומיים, ולכן ייתכן שהשתנה.",
    "joined": "השמות הם הצוותים של הרכבים המעוגנים עכשיו.",
    "unmatched": "השמות ברשומה לא תאמו את המספר הזה, ולכן אף אחד לא מוצג.",
    "waiting": "קורא את רשימת הצוות.",
    "none": "אין רשימת צוות לתחנה הזאת."
  },
  "happened7": {
    "launchesFrom": "מ{place}",
    "reached": "הגיע למסלול",
    "failed": "לא הגיע למסלול",
    "partial": "הגיע למסלול, אבל לא לזה שתוכנן",
    "launchDetail": "{rocket}: {status}, {from}",
    "launchDetailNoPlace": "{rocket}: {status}",
    "cameDown": "ירד ב-{date} (תאריך הדעיכה בקטלוג)",
    "debris": "ו-{n} חתיכות פסולת",
    "debrisOne": "וחתיכת פסולת אחת",
    "showAll": "הצג את כל {n}",
    "showFewer": "הצג פחות",
    "asOf": "השיגורים נקראו {age} מ-Launch Library 2.",
    "stale": "השיגורים נקראו ב-{date}: ישנים מיומיים.",
    "none": "אין שום דבר ברשומה לשבעת הימים האחרונים.",
    "waiting": "קורא מה קרה.",
    "decays": "מה ירד",
    "decaysTitle": "קורא את כל הקטלוג, כ-1.5 MB",
    "decaysNone": "שום דבר שלם לא ירד בשבעת הימים האחרונים.",
    "decaysFailed": "לא הצלחנו לקרוא את הקטלוג.",
    "flyTitle": "עוף למקום שממנו שוגר",
    "ago": "{age}"
  },
  "oldest": {
    "label": "הכי הרבה זמן למעלה",
    "row": "{years} שנים · שוגר {date}",
    "note": "מטענים וגופי טילים שעדיין במסלול, לפי תאריך שיגור בקטלוג.",
    "showTitle": "הצג אותו על המפה"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "פותח את הדף של {publisher} עצמו בלשונית חדשה"
  },
  "placeKeep": {
    "group": "איפה אתה",
    "change": "שנה מקום",
    "changeTitle": "עיר, או המקום שהדפדפן אומר שאתה בו",
    "remember": "זכור את המקום הזה",
    "rememberTitle": "שומר אותו בדפדפן הזה בלבד, בדיוק של 0.1°",
    "forget": "שכח את המקום הזה",
    "forgetTitle": "מסיר את המקום ששמור בדפדפן הזה",
    "kept": "נשמר בדפדפן הזה בלבד.",
    "share": "שתף את המקום הזה",
    "shareTitle": "מעתיק קישור שנושא את המקום הזה בדיוק של 0.1°",
    "copied": "הקישור הועתק. הוא נושא את המקום הזה בדיוק של 0.1°.",
    "copyFailed": "לא הצלחנו להעתיק את הקישור."
  },
  "scale": {
    "least": "כוכבי לכת מצוירים גדולים לפחות פי {n}",
    "one": "{name} מצויר גדול פי {n}",
    "title": "הנקודות רחבות מכוכבי הלכת. לחץ לגודל אמיתי.",
    "trueLine": "גודל אמיתי: {name} ברוחב {px} פיקסלים כאן",
    "trueTitle": "כוכב הלכת הרחב ביותר, כשהנקודות מוסרות. לחץ כדי לצייר אותן שוב."
  },
  "launchChip": {
    "opens": "לחץ לכרטיס שלו",
    "train": "רכבת Starlink חדשה של {n}, מעליך {when}"
  },
  "welcome": {
    "label": "ביקור ראשון",
    "title": "פעם ראשונה כאן",
    "dots": "כל נקודה היא דבר אמיתי. לחץ על אחת.",
    "move": "גרור כדי לסובב. גלול כדי להתקרב.",
    "moveTouch": "גרור כדי לסובב. צבוט כדי להתקרב.",
    "trips": "מסע מודרך הוא סיפור אחד בכמה דקות.",
    "trip": "מסע מודרך",
    "tripTitle": "מתחיל את המסע הראשון ברשימה",
    "look": "הסתכל מסביב",
    "lookTitle": "מסיר את השורות האלה"
  },
  "opening": {
    "label": "פתיחה",
    "from": "מאת",
    "wait": "מכין את המסע",
    "skip": "מקש כלשהו או לחיצה מדלגים על זה"
  },
  "base": {
    "label": "חזרה לבסיס",
    "title": "חזרה לבסיס: כדור הארץ, עכשיו, בלי שום דבר נבחר",
    "name": "בסיס",
    "trip": "צא מהמסע וחזור לבסיס"
  },
  "exoface": {
    "tag": "הדמיית אמן",
    "measured": "נמדד: {parts}.",
    "estimated": "הערכה: {parts}.",
    "least": "לפחות {n} מסות של כדור הארץ.",
    "radius": "{n} רדיוסים של כדור הארץ",
    "mass": "{n} מסות של כדור הארץ",
    "a": "\u200b",
    "an": "\u200b",
    "yearHours": "{a} שנה בת {n} שעות",
    "yearDays": "{a} שנה בת {n} ימים",
    "yearYears": "הקפה של {n} שנים",
    "join": ", ",
    "missing": "—",
    "surface": "פני השטח מדומיינים.",
    "clouds": "פסגות העננים מדומיינות.",
    "nothingMeasured": "שום דבר כאן לא נמדד.",
    "whole": "כל העולם מדומיין.",
    "imaginedName": "עולם מדומיין מס׳ {n}",
    "another": "עולם אחר",
    "back": "חזרה למפה",
    "stageLabel": "עולם מדומיין",
    "why": "מצויר כ{cls}, {climate}: חושב, לא נראה.",
    "whyGiant": "מצויר כ{cls}: חושב מהגודל שלו, לא נראה.",
    "cls": {
      "rock": "עולם סלעי",
      "superEarth": "סופר-ארץ",
      "water": "עולם מים",
      "miniNeptune": "מיני-נפטון",
      "iceGiant": "ענק קרח",
      "gasGiant": "ענק גזים"
    },
    "climate": {
      "lava": "מותך תחת הכוכב שלו",
      "desert": "חם ויבש",
      "temperate": "מתון מספיק לימים",
      "snowball": "קפוא לגמרי",
      "eyeball": "פנים אחד תמיד אל הכוכב שלו"
    }
  },
  "deep": {
    "inside": "בתוך {parent}",
    "companion": "בן לוויה של {parent}",
    "kinds": {
      "HII": "ערפילית פליטה",
      "PN": "ערפילית פלנטרית",
      "SNR": "שריד סופרנובה",
      "RfN": "ערפילית החזר",
      "DrkN": "ערפילית אפלה",
      "GCl": "צביר כדורי"
    },
    "back": "חזרה אל {parent}",
    "backTitle": "עוף החוצה אל {parent} שמסביבו"
  },
  "deepHelix": {
    "card": {
      "helix": "האור שלה נלקח מהתצלום של ESO, הצורה שלה מ-O’Dell, McCullough ו-Meixner (2004): דיסק פנימי נטוי ב-23° וטבעת חיצונית נטויה ב-53°. הגושים ממוקמים במרחקים שנמדדו. עדיין לא נבדקה על ידי אסטרונום."
    },
    "how": "Hubble וטלסקופים על הקרקע מראים שתי אליפסות, 499″ על 459″ ו-742″ על 446″. כשקוראים אותן כעיגולים הנראים בשיפוע, הן שתי טבעות נטויות ב-23° וב-53°, והמהירויות של הגושים לעברנו ומאיתנו אומרות איזה צד של כל אחת קרוב יותר (O’Dell, McCullough ו-Meixner 2004)."
  },
  "deepLmc": {
    "card": {
      "lmc": "המודל הזה נבנה מהתצלום שלו ומהספירות של Gaia של הכוכבים שלו עצמו, נטוי כפי שנמדד."
    },
    "rows": {
      "dso-lmc": [
        [
          "העומק של הכוכבים שלו",
          "לא נמדד כוכב אחרי כוכב: במרחק הזה הפרלקסה של כוכב קטנה מדי. המודל מפזר את הכוכבים שלו לאורך העובי הידוע של הדיסק."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "עומק בתוך ה-LMC",
          "לא נמדד: היא מצוירת במרחק של ה-LMC בכיוון שלה עצמה. על הדיסק הנטוי היא עשויה להיות קרובה יותר בכ-2 000 שנות אור."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "קצה היקום הנצפה",
    "horizonNow": "בערך {n} מיליארד שנות אור משם עכשיו",
    "horizonWhy": "האור שלו יצא לדרך לפני {age} מיליארד שנים; החלל נמתח מאז",
    "edge": "{n} מיליארד שנות אור: מעבר לכל מה שאנחנו יכולים לראות",
    "edgeWhy": "היקום הנצפה נגמר במרחק של כ-{h} מיליארד שנות אור.",
    "edgeNothing": "שום דבר שנמדד לא נמצא כאן בחוץ: הרצועה הזאת היא איור.",
    "cmbTitle": "האור הקדום ביותר, כפי שהשמיים שלנו מראים אותו",
    "cmbWhen": "הוא יצא כ-{k} שנים אחרי המפץ הגדול",
    "cmbPainted": "צבוע בתוך הכדור שממנו יצא: איור",
    "cmbElse": "מכל מקום אחר, המפה שונה",
    "cmbCold": "−{n} µK",
    "cmbMid": "ממוצע {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "סולם צבעים: כחול עד {n} מיליונית מעלה קר יותר מ-{t} קלווין, כתום עד {n} חם יותר",
    "cmbSource": "מפת תשע השנים של WMAP, NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "האור שלה נלקח מהתצלום של ESO, הצורה שלה משוחזרת לפי Wen ו-O’Dell (1995) ו-O’Dell (2001): שכבה דקה זוהרת על הפנים הקרובות של ענן אפל, והטרפז כ-0.2 פרסק לפניה. עדיין לא נבדקה על ידי אסטרונום."
    },
    "rows": {
      "dso-m42": [
        [
          "הצורה שלה בעומק",
          "משוחזרת. ליד הטרפז היא נמדדה: השכבה הזוהרת נמצאת כ-0.2 פרסק מאחורי הכוכב הבהיר ביותר שלה. רחוק יותר העומק עוקב אחרי התמונה שפורסמה של קערה שנפתחת לעברנו, לא אחרי מדידה."
        ],
        [
          "מאחוריה",
          "הענן המולקולרי האפל שממנו הערפילית נחצבה. כשרואים מאחור, הערפילית מוסתרת בו."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-m43": [
        [
          "הצורה שלה בעומק",
          "משוחזרת: חלל קטן יותר על אותו ענן, מואר על ידי הכוכב NU Orionis. העומק שלה לא נמדד."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ]
    },
    "how": "הזוהר של הערפילית בא משכבה דקה שבה האור של הכוכב הבהיר ביותר בטרפז אוכל לתוך ענן אפל. Wen ו-O’Dell (1995) מיפו כמה רחוק השכבה הזאת נמצאת מאחורי הכוכב לפי כמה היא בהירה, כי חלק קרוב יותר ממנה מקבל יותר אור."
  },
  "r12Truth": {
    "here": "בכרטיס הזה",
    "words": "המילים, בכל מקום",
    "terms": "מילים בכרטיס הזה",
    "rows": {
      "where": "איפה הוא",
      "drawnNow": "מצויר עכשיו",
      "drawn": "מה מצויר",
      "photo": "צילום",
      "filters": "מסננים",
      "colours": "צבעים",
      "taken": "צולם",
      "released": "פורסם",
      "sky": "השמיים המוצגים",
      "survey": "סקר של",
      "look": "מראה"
    },
    "span": "{a} עד {b}",
    "notPublished": "התאריך לא פורסם",
    "position": {
      "measured": "נראה על ידי מכשיר בזמן ידוע",
      "inferred": "חושב קדימה ממדידה ישנה יותר",
      "illustrative": "מצויר כדי להראות את הרעיון, לא נמדד",
      "sample": "נתוני דגימה מובנים, לא חיים"
    },
    "drawn": {
      "photograph": "אור אמיתי, מצולם מהצד שלנו",
      "reconstruction": "צורה תלת-ממדית ממחקר שפורסם",
      "model": "מודל של הסוג שלו, לא הכוכבים שלו עצמו",
      "catalogue": "מיקומים שסקר מדד",
      "illustration": "מצויר כדי להראות את הסוג שלו, לא אותו"
    },
    "colours": {
      "broadband": "מסנני צבע רחבים",
      "mixed": "מסנני צבע ומימן",
      "narrowband": "גזים ממופים לצבעים",
      "unstated": "לא צוין"
    },
    "falseColour": "{band}, צבע מלאכותי",
    "glossary": [
      {
        "term": "פרסק",
        "match": [
          "kpc"
        ],
        "say": "בערך 3.26 שנות אור: המרחק שממנו המסלול של כדור הארץ היה נראה ברוחב שנייה קשת אחת. במאמרים כותבים pc, ו-kpc לאלף."
      },
      {
        "term": "מיליון שנות אור",
        "match": [
          "מיליון שנים"
        ],
        "say": "מיליון שנות אור, נכתב Mly. אנדרומדה, הגלקסיה הגדולה הקרובה ביותר, נמצאת במרחק של כ-2.5 מיליון."
      },
      {
        "term": "מיליארד שנות אור",
        "match": [
          "מיליארד שנים"
        ],
        "say": "אלף מיליון שנות אור, נכתב Gly. קצה מה שאנחנו יכולים לראות נמצא עכשיו במרחק של כ-46 מיליארד שנות אור."
      },
      {
        "term": "זמן מבט לאחור",
        "match": [
          "האור שלו יצא"
        ],
        "say": "כמה זמן עבר מאז שהאור שאנחנו רואים יצא ממשהו. מגלקסיות רחוקות מדובר במיליארדי שנים: אנחנו רואים אותן כפי שהיו אז."
      },
      {
        "term": "מרחק נלווה",
        "match": [
          "נלווה",
          "מיליארד שנות אור"
        ],
        "say": "כמה רחוק משהו נמצא עכשיו, כשסופרים כמה החלל נמתח מאז שהאור שלו יצא. הרחק החוצה זה יותר ממה שזמן הנסיעה של האור מרמז."
      }
    ],
    "termLine": "{term}: {say}",
    "lookWord": "מראה {mode}"
  },
  "r12Sun": {
    "image": "החצי של השמש שפנה אל כדור הארץ הוא התמונה של Solar Dynamics Observatory שצולמה ב-{time} UTC ב-{date}, מסובבת עם השמש מאז: אור אולטרה-סגול קיצוני ב-{wl} אנגסטרם מגז בחום של כמעט מיליון מעלות בלולאות מעל פני השטח, בצבע המלאכותי של SDO ומצויר בהיר יותר. הצד הרחוק, שהיא לא ראתה, מצויר ממודל באותו צבע מלאכותי, והשניים מעורבבים היכן שהם נפגשים. זו תמונת עיון, לא לשימוש מדעי. באדיבות NASA/SDO וצוותי המדע של AIA, EVE ו-HMI.",
    "loops": "הלולאות הזהובות מעל {n} מהאזורים הפעילים של היום הן להמחשה: המקומות שלהן הם של NOAA, הצורות, הגבהים והמספר שלהן לא. במראה נמדד הן מוסרות.",
    "loopsOne": "הלולאות הזהובות מעל אחד מהאזורים הפעילים של היום הן להמחשה: המקום הוא של NOAA, הצורות, הגבהים והמספר לא. במראה נמדד הן מוסרות.",
    "none": "לא הצלחנו לקרוא שום תמונה של השמש של היום, ולכן הדיסק כולו מצויר."
  },
  "r12Nearby": {
    "castShadows": "הצללים שלו מוטלים לפי הגבהים של הקרקע עצמה, מ-{title}, היכן שהשמש נמצאת עכשיו ובקנה מידה אמיתי: נמדד, גובה אחד כל 670 מ׳ במקרה הטוב, ולכן מכתש קטן מכשני קילומטרים בערך לא מטיל צל.",
    "sunriseModelled": "הצבע שלו בזריחה ובשקיעה ממודל: אור שמש שהאדים בגלל האוויר שהוא החליק עליו, פיזור ריילי בלבד."
  },
  "r12Giants": {
    "spot": "חוץ מאחד: הכתם האדום הגדול ממוקם באורך {l2}° במערכת II, מועבר מהמקום ששמר צוות JUPOS והאגודה האסטרונומית הבריטית מדדו אותו ב-{date} ({at}°) בקצב {rate}° בחודש, האמצע בין שני הסחפים שהם מדדו באותה שנה ({lo} ו-{hi}), כך שעד עכשיו הוא עשוי להיות {pm}° לכל צד. המפה מסובבת כדי להציב אותו שם, והעננים האחרים שלה מסתובבים איתו.",
    "rings": {
      "uranus": "הטבעות שלו נמצאות במרחקים שנמדדו וכהות כפי שהן: החלקיקים שלהן מחזירים בערך 1.5 % מהאור, שלושים מהעננים שלו, ולכן מול כוכב הלכת הן חוטים כהים; הן מצוירות רחבות פי 10 ממה שהן כדי שיהיו נראות, והחשיפה העמוקה מגבירה אותן פי 4, כפי שחשיפה ארוכה עושה",
      "jupiter": "הטבעת הקלושה שלו נמצאת במרחקים ובעומקים האופטיים שגיליון הנתונים של NASA נותן: ההילה והטבעת הראשית, אבק וגרגירים כהים שעוצרים כמה מיליונים של האור; שתי טבעות הגוסמר הקלושות יותר שמעבר להן לא מצוירות. מצד השמש היא כמעט כלום; כשהשמש מאחוריה האבק זורק אור קדימה והיא נראית, כפי שנראתה ל-Galileo ול-New Horizons מצד הלילה. כדי שתיראה בכלל היא מצוירת בהירה פי 8 000 ממה שהיא בחשיפת מצלמה ופי 40 000 בחשיפה עמוקה; בחשיפת עין היא לא מצוירת, וכך היא הייתה נראית, וגם לא באיכות הנמוכה ביותר. ההילה בעובי של כ-10 000 ק״מ ומצוירת שטוחה, לא בהירה יותר ממה שהעובי שלה מאפשר; איך ההילה דועכת פנימה והטבעת הראשית מעמיקה לעבר הקצה החיצוני החד שלה, כמה מהאור הוא של האבק, כמה קדימה הוא זורק אותו, הצבע האדמדם של הטבעת והבהירות המרבית שבה היא מצוירת הם להמחשה"
    }
  },
  "r12Plumes": {
    "line": "עמודי אדים מצוירים כפי שנראו: {list}.",
    "item": "{name}, בגובה של כ-{km} ק״מ ({by}, {when})",
    "jets": "הסילונים של ארבעת פסי הנמר, בגובה של לפחות {km} ק״מ ({by}, {when})",
    "truth": "המקומות והגבהים שלהם נמדדו; הקשתות של הגרגירים הן מודל, והאור שלהם נמתח כדי שאפשר יהיה לראות אותם. ייתכן שהם לא מתפרצים עכשיו.",
    "stripes": "הפסים מצוירים ישרים ממרכזי האתרים ומהאורכים שלהם במילון המקומות, והמקומות של 101 הסילונים לאורכם הם מודל.",
    "column": "הם עמודים כהים שהרוח נשאה מערבה בראשיהם; עד כמה עמוד רחב לא ידוע, והוא מצויר צר.",
    "hot": "הנקודות הכתומות בצד הלילה הן נקודות חמות שבהן לבה זוהרת ({list}): המקומות שלהן נמדדו, הבהירות שלהן לא.",
    "film": "במראה קולנועי הגרגירים עפים בקשתות שלהם מהר פי {k} מהשעון.",
    "still": "הם מוחזקים נייחים, כמו במראה נמדד או בתנועה מופחתת.",
    "review": "עדיין לא נבדק על ידי אסטרונום.",
    "span": "{a} עד {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "הכוכבים שלו",
      "lightLabel": "האור שלהם",
      "depthLabel": "העומק שלהם",
      "reviewLabel": "בדיקה",
      "globularStars": "מודל של הסוג שלו, לא הכוכבים שלו עצמו: {n} כוכבים בהירים מנקודת הפנייה, ממוקמים לפי הפרופיל של King עם רדיוס הליבה של Harris ({rc} שנות אור) ורדיוס הגאות ({rt}). המספר, הבהירות והצבעים שלהם הם מודל.",
      "globularLight": "יחד בערך {pct}% מהאור של הצביר (בהירות מוחלטת {mv}); הכוכבים העמומים שאף נקודה לא מייצגת הם הזוהר. מצויר עד בהירות 10, כפי שחשיפה של מצלמה מראה אותו.",
      "openStars": "{n} חברים מ-Gaia (Hunt ו-Reffert 2023, {name}), לכל אחד הסתברות חברות של לפחות {p}, בתוך רדיוס הגאות שלו. מצוירים עד בהירות 10, כפי שחשיפה של מצלמה מראה אותם.",
      "openStarsHyg": "{n} חברים מ-Gaia (Hunt ו-Reffert 2023, {name}), לכל אחד הסתברות חברות של לפחות {p}, בתוך רדיוס הגאות שלו; {h} בהירים יותר הם כוכבי הקטלוג של המפה עצמה. מצוירים עד בהירות 10, כפי שחשיפה של מצלמה מראה אותם.",
      "openDepthSome": "{m} ממוקמים לפי הפרלקסה שלהם עצמם; ה-{k} האחרים במרחק הצביר, והעומק שלהם בתוכו ממודל.",
      "openDepthNone": "הכיוונים שלהם נמדדו; העומק שלהם בתוך הצביר ממודל, כי במרחק הזה הפרלקסה של כוכב אחד לא מדויקת מספיק.",
      "review": "המודל הזה עדיין לא נבדק על ידי אסטרונום."
    }
  },
  "a45": {
    "farNote": "כמה רחוק הוא עכשיו ({how}), מההסחה לאדום שלו של {z} בקוסמולוגיה של Planck 2018",
    "comoving": "מרחק נלווה",
    "pulsarDistance": [
      "מהפרלקסה של הפולסר עצמו",
      "המרחק של הצביר הכדורי, שריד הסופרנובה או האובייקט האחר שהוא שייך אליו",
      "הערכה של מודל מאות הרדיו (המודל YMW16 של האלקטרונים החופשיים בגלקסיה), לא מדידה: היא יכולה לסטות בהרבה"
    ],
    "shape": {
      "galaxy": "סימן במרחק שההסחה לאדום שלה נותנת; גלקסיה רחוקה כל כך היא כמה פיקסלים ברוחב לכל היותר, ולכן הצורה שלה לא מצוירת",
      "browndwarf": "טבעת במרחק שנמדד; ננס חום הוא נקודה בקנה המידה הזה ופולט כמעט אור נראה אפס",
      "whitedwarf": "טבעת במרחק שנמדד; הננס הלבן עצמו הוא נקודה בקנה המידה הזה",
      "cluster": "סימן במרכז קרני ה-X של הצביר; הגלקסיות החברות מצוירות רק עבור Virgo, Coma, Fornax ו-Perseus (שלב הקבוצה המקומית)"
    },
    "quasarZ7": "קוואזר שנראה כפי שהיה כ-{age} מיליון שנים אחרי המפץ הגדול: אחד מ-{n} הידועים מעבר להסחה לאדום 7.",
    "unplaced": {
      "unnamed": "כוכב HYG {id}",
      "lead": "{name} — כוכב בכיוון שאליו אתה מסתכל; איש לא מדד כמה רחוק הוא",
      "leadColour": "{name} — כוכב {a} {colour} בכיוון שאליו אתה מסתכל; איש לא מדד כמה רחוק הוא",
      "note": "מצויר על השמיים ובשום מקום בחלל, כי מקום צריך מרחק.",
      "cite": "HYG Stellar Database v4.4 (CC BY-SA 4.0): כיוון ובהירות בלבד"
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "נקודה בהירה היכן שההסחה לאדום שלו מציבה אותו, עם טבעת שמסמנת את המקום; הדיסק והסילון שלו קטנים מדי בהרבה מכדי לצייר",
      "host": "גלקסיית האם שלו מצוירת קלושה ועגולה בגודל הזוויתי שהמקור נותן, {size} שניות קשת ברוחב כשרואים מכאן; באמת זה כ-{ly} שנות אור. השיטוח והשיפוע שלה לא מצוירים.",
      "point": "המקור לא נותן גודל לגלקסיית האם שלו, ולכן שום גודל לא מצויר."
    },
    "cluster": {
      "members": "{n} גלקסיות חברות מ-{catalogue}; {own} מהן נמצאות במרחקים שנמדדו אחת אחת.",
      "membersNoOwn": "{n} גלקסיות חברות מ-{catalogue}.",
      "distanceSbf": "הצביר נמצא במרחק {mpc} מגה-פרסק ({mly} מיליון שנות אור), ממוצע של מרחקים שנמצאו משינויים בבהירות פני השטח.",
      "distanceZ": "הצביר נמצא במרחק {mly} מיליון שנות אור: ההסחה לאדום הממוצעת של חבריו ({z}), מועברת למרחק נלווה בקוסמולוגיה האחת של המפה.",
      "depthMeasured": "גלקסיה בלי מרחק משלה מפוזרת בעומק לפי הפיזור שנמדד של הצביר, {rms} מגה-פרסק; ההצבה הזאת היא מודל.",
      "depthModelled": "לאף גלקסיה כאן אין מרחק משלה, ולכן הן מפוזרות בעומק רחב כמו שהן מפוזרות על פני השמיים, כאילו הצביר עגול; ההצבה הזאת היא מודל.",
      "size": "כל גלקסיה רחבה כפי שרדיוס חצי האור שלה בקטלוג אומר, מצוירת כצורה עגולה בהירה במרכזה; השיטוח והשיפוע שלה לא מצוירים."
    }
  },
  "deepRing": {
    "card": {
      "m57": "האור שלה נלקח מהתצלום של Hubble, הצורה שלה מ-O’Dell, Ferland, Henney ו-Peimbert (2013): טבעת עבה נטויה ב-13.5°, הנראית כמעט לאורך הציר שלה, והגז הכחלחל יותר של האמצע שלה מצויר מגיע לעברנו וממנו. הצבעים שלה הם של התצלום, שצולם דרך מסננים צרים. עדיין לא נבדקה על ידי אסטרונום.",
      "m27": "האור שלה נלקח מהתצלום של NOIRLab, מוצג בגוונים של הגזים עצמם; הצורה שלה שחזור: המותן הבהיר טבעת עבה שנראית כמעט מהקצה, האוזניים העמומות יותר הן הפיקות שלה, לפי המהירויות של הקליפות ש-Meaburn ואחרים (2005) מדדו. עדיין לא נבדקה על ידי אסטרונום.",
      "southern-ring": "האור שלה נלקח מהתצלום האינפרא-אדום של Webb; הצורה שלה עוקבת אחרי Kastner ואחרים (2024) ו-De Marco ואחרים (2022): טבעת הנראית כמעט לאורך הציר שלה, בועה דרכה והילה מולקולרית סביב שתיהן. עדיין לא נבדקה על ידי אסטרונום."
    },
    "rows": {
      "dso-m57": [
        [
          "המרחק שלה",
          "פרלקסה (Gaia DR3) של הכוכב המרכזי שלה, Gaia DR3 2090486618786534784: 1.270 ± 0.044 מילי-שנייה קשת, כ-2 570 שנות אור (2 480 עד 2 660)."
        ],
        [
          "הצורה שלה בעומק",
          "משוחזרת. הגודל של הטבעת בשמיים, השיפוע של הציר הארוך שלה ואיזה קצה קרוב יותר נמדדו. העובי שלה והצורה של הגז באמצע שלה לא: הם מצוירים כאיור."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-m27": [
        [
          "הצורה שלה בעומק",
          "משוחזרת. הגודל שלה, הזווית שלה בשמיים והמהירויות של הקליפות שלה נמדדו; שהמותן הוא טבעת הנראית כמעט מהקצה, ואיך האוזניים שלה מגיעות לעברנו וממנו, היא הקריאה הרגילה של ערפילית במראה כזה, מצוירת כאיור."
        ],
        [
          "הצבעים שלה",
          "הגוונים של הגזים עצמם, ממסנני התצלום הצרים: חמצן טורקיז, מימן וגופרית אדום. עד כמה כל אחד מוצג היא בחירה שלנו."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-southern-ring-nebula": [
        [
          "הצורה שלה בעומק",
          "משוחזרת. שהטבעת הבהירה שלה נראית 15 עד 30° מהציר שלה נמדד (Kastner ואחרים, 2024); איזה צד קרוב יותר, העובי של הטבעת והאורך של הבועה הם להמחשה."
        ],
        [
          "הצבעים שלה",
          "אור אינפרא-אדום שאף עין לא רואה, שיוצרי התמונות של Webb נתנו לו צבעים."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ]
    },
    "how": "התמונות של Hubble בצבעי אור בודדים, עם מהירויות הגז שנמדדו לאורך הערפילית, מראות טבעת עבה כמעט מהחזית: הציר הארוך שלה נטוי ב-13.5°, והקצה הצפון-מזרחי שלה קרוב אלינו יותר. גז מהיר יותר ממלא את האמצע שלה ונמתח לעברנו וממנו לאורך קו הראייה שלנו (O’Dell, Ferland, Henney ו-Peimbert 2013)."
  },
  "r12Dust": {
    "card": {
      "crab": "האור שלה נלקח מהתצלום של Hubble, בצבע מלאכותי, שנישא על קליפה שהצורה שלה עוקבת אחרי Martin, Milisavljevic ו-Drissen (2021): כלוב חוטים באורך של כ-4 פרסק סביב אמצע ריק. עדיין לא נבדקה על ידי אסטרונום.",
      "veil": "האור שלה נלקח מהתצלום של NOIRLab, בצבע מלאכותי, שנישא על כדור דק ברוחב 37 פרסק (Fesen ואחרים, 2018): החוטים הם השפה שלו הנראית מהקצה. עדיין לא נבדקה על ידי אסטרונום.",
      "horsehead": "החשכה שלה נקראת מהתצלום של NOIRLab: אבק לפני הגז הזוהר של IC 434, שסופג ומאדים את מה שמאחוריו ולא פולט אור. עדיין לא נבדקה על ידי אסטרונום.",
      "coalsack": "החשכה שלה נקראת משביל החלב שסביבה: ענן אבק במרחק של כ-590 שנות אור שמעמעם ומאדים את הכוכבים שמאחוריו. עדיין לא נבדקה על ידי אסטרונום.",
      "m78": "האור שלה הוא התצלום של NOIRLab: אבק שמפזר את האור הכחול של הכוכב שלפניו, על פני ענן אפל. העומק שלה משוחזר. עדיין לא נבדקה על ידי אסטרונום.",
      "iris": "האור שלה הוא התצלום של NOIRLab: אבק שמפזר את האור של הכוכב הצעיר HD 200775 בחלל של הענן שלו. העומק שלה משוחזר. עדיין לא נבדקה על ידי אסטרונום.",
      "m45": "האור שלה הוא התצלום של NOIRLab: ענן אבק שסוחף דרך הצביר, ממש לפני הכוכבים שלו, ומפזר את האור הכחול שלהם (Ritchey ואחרים, 2006). העומק שלה משוחזר. עדיין לא נבדקה על ידי אסטרונום."
    },
    "rows": {
      "dso-m1": [
        [
          "הצורה שלה בעומק",
          "משוחזרת מקו מתאר שנמדד. החוטים מגיעים לכ-2 פרסק לאורך הציר של הרוח של הפולסר ואף אחד לא נמצא בטווח של חצי פרסק מהמרכז (Martin ואחרים, 2021). מצוירת כאליפסואיד לאורך הציר הזה; איזה קצה קרוב אלינו יותר הוא הנחה."
        ],
        [
          "הצבעים שלה",
          "צבע מלאכותי: המסננים הצרים של התצלום לחמצן וגופרית, ממופים לצבעים על ידי יוצרי התמונה."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-veil-nebula": [
        [
          "הצורה שלה בעומק",
          "משוחזרת: כדור ברוחב 37 פרסק, הגודל והמרחק ש-Fesen ואחרים (2018) מדדו. העובי של הקליפה להמחשה."
        ],
        [
          "הצבעים שלה",
          "צבע מלאכותי: המסננים הצרים של התצלום לחמצן, גופרית ומימן, ממופים לצבעים על ידי יוצר התמונה."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "הצורה שלה בעומק",
          "משוחזרת. האבק נמצא לפני הגז הזוהר של IC 434, כפי שנצפה; כמה רחוק לפניו, וכמה הוא עבה, הם להמחשה."
        ],
        [
          "מה האבק עושה",
          "הוא רק סופג: הכוכבים והזוהר שמאחוריו מעומעמים, ויותר בכחול מאשר באדום, ולכן הם נראים אדומים יותר. הוא לא פולט אור משלו."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-coalsack": [
        [
          "כמה היא חשוכה",
          "נקרא לפי כמה שביל החלב כהה כאן יותר מאשר באותו מרחק מקו האמצע שלו בקרבת מקום. זו הערכה ונמוכה ממה שמפות אינפרא-אדום נותנות, כי כוכבים שלפני הענן מוסיפים את האור שלהם."
        ],
        [
          "מה האבק עושה",
          "הוא רק סופג: הכוכבים שמאחוריו מעומעמים ומאדימים. כוכבים שלפניו לא. חלק מהחשכה בצפון-מזרח הוא ענן שני הרחק מאחור, מצויר כאן במרחק הקרוב."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-m78": [
        [
          "הצורה שלה בעומק",
          "משוחזרת: האבק המואר כיריעה עם הכוכב שלו לפניה וענן אפל מאחוריה. העומקים להמחשה."
        ],
        [
          "מצד אחר",
          "ממודל: אבק מפזר יותר אור קדימה מאשר הצידה, ולכן מצד אחר אותו אבק נראה בהיר יותר או עמום יותר."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-iris-nebula": [
        [
          "הצורה שלה בעומק",
          "משוחזרת: הקירות המוארים כיריעה עם הכוכב לפניה וענן אפל מאחוריה. העומקים להמחשה."
        ],
        [
          "מצד אחר",
          "ממודל: אבק מפזר יותר אור קדימה מאשר הצידה, ולכן מצד אחר אותו אבק נראה בהיר יותר או עמום יותר."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ],
      "dso-m45": [
        [
          "הצורה שלו בעומק",
          "משוחזרת. הגז נמצא לפני הכוכבים, כפי שהאור שלהם מראה; כמה רחוק לפניהם וכמה האבק עבה הם להמחשה, והעומקים של הכוכבים עצמם בתוך הצביר הם מודל קבוע, לא נמדדו."
        ],
        [
          "מה האבק עושה",
          "הוא מפזר את האור של הכוכבים, את הכחול יותר מכול, ולכן הוא זוהר בכחול סביב הבהירים שבהם, Merope ו-Maia יותר מכולם. זה ענן חולף, לא מה שהכוכבים נולדו ממנו."
        ],
        [
          "בדיקה",
          "המודל הזה עדיין לא נבדק על ידי אסטרונום."
        ]
      ]
    },
    "how": "הגז של שריד עף החוצה במהירות קבועה, ולכן המהירות שלו לעברנו או ממנו אומרת כמה רחוק לפני המרכז או מאחוריו הוא נמצא. Martin, Milisavljevic ו-Drissen (2021) הפכו 310 000 ספקטרום של Crab לצורה שלו בדרך הזאת."
  },
  "r12Navigate": {
    "chainLabel": "איפה הוא",
    "chainTitle": "עוף אל {name}",
    "milkyWay": "שביל החלב",
    "outside": "מחוץ לשביל החלב",
    "the": [
      "השמש",
      "הירח",
      "שביל החלב"
    ],
    "theWord": "\u200b",
    "backParent": "חזרה אל {parent}",
    "backParentTitle": "עוף החוצה אל {parent}",
    "legendTitle": "פתח את המקרא: מה כל אחת מהמילים האלה אומרת",
    "label": "איפה אתה",
    "title": "איפה המצלמה על הסולם, מכדור הארץ ועד הקבוצה המקומית",
    "back": "חזרה",
    "backTo": "חזרה אל {name}",
    "sep": "‹",
    "rungs": {
      "earth": "כדור הארץ",
      "sun": "מערכת השמש",
      "stellar": "כוכבים קרובים",
      "galaxy": "שביל החלב",
      "local-group": "הקבוצה המקומית"
    },
    "notes": {
      "sun": "מואץ: השמש במרחק {distance}",
      "stellar": "מואץ: הכוכב הקרוב ביותר במרחק {distance}",
      "galaxy": "מואץ: מרכז הגלקסיה שלנו במרחק {distance}",
      "local-group": "מואץ: אנדרומדה במרחק {distance}"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "השמש",
      "ROCKY_PLANET": "כוכבי לכת סלעיים",
      "GAS_GIANT": "ענקי גזים",
      "ICE_GIANT": "ענקי קרח",
      "RINGS": "טבעות",
      "VOLCANIC_MOON": "ירח געשי",
      "ICY_MOON": "ירחים קפואים",
      "TITAN": "ירח עם אטמוספירה",
      "AIRLESS_MOON": "ירחים בלי אוויר",
      "DWARF_PLANET": "כוכבי לכת ננסיים",
      "ASTEROID": "אסטרואידים",
      "COMET": "שביטים",
      "ARTIFICIAL_SATELLITE": "לוויינים",
      "LAUNCH_AND_ROCKET": "שיגורים וטילים",
      "SPACE_PROBE": "גשושיות חלל",
      "LANDING_SITE": "אתרי נחיתה",
      "EXOPLANET": "כוכבי לכת חוץ-שמשיים",
      "STAR": "כוכבים",
      "BINARY_AND_MULTIPLE": "כוכבים כפולים ומרובים",
      "COMPACT_REMNANT": "כוכבים מתים",
      "BLACK_HOLE": "חורים שחורים",
      "OPEN_CLUSTER": "צבירים פתוחים",
      "GLOBULAR_CLUSTER": "צבירים כדוריים",
      "EMISSION_NEBULA": "ערפיליות פליטה",
      "PLANETARY_NEBULA": "ערפיליות פלנטריות",
      "DARK_NEBULA": "ערפיליות אפלות",
      "REFLECTION_NEBULA": "ערפיליות החזר",
      "SUPERNOVA_REMNANT": "שרידי סופרנובה",
      "GALAXY_SPIRAL": "גלקסיות ספירליות",
      "GALAXY_IRREGULAR": "גלקסיות בלתי סדירות",
      "GALAXY_ELLIPTICAL": "גלקסיות אליפטיות",
      "GALAXY_INTERACTION": "גלקסיות מתקשרות",
      "AGN_QUASAR": "קוואזרים",
      "GALAXY_GROUP": "קבוצות גלקסיות",
      "GROUND_SITE": "תחנות קרקע",
      "ODDITY": "תופעות מוזרות"
    },
    "other": "דברים אחרים",
    "byName": "לפי שם",
    "of": "{label} של {world}",
    "only": "מודלים תלת-ממדיים",
    "onlyTitle": "רשום רק מה שמצויר ממודל תלת-ממדי: מודל אמיתי או שחזור",
    "real": "מודל תלת-ממדי אמיתי",
    "rebuilt": "שחזור תלת-ממדי",
    "noneWithModel": "לאף אחד מאלה אין מודל תלת-ממדי.",
    "counting": "סופר…"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "תנועה",
      "choices": {
        "on": "פועלת",
        "off": "כבויה"
      },
      "titles": {
        "on": "טיסות מחליקות ומסעות מתקדמים מעצמם, כפי שהמפה נעשתה",
        "off": "כל טיסה היא קפיצה מיידית, שום דבר לא זז אם לא נמדד שהוא זז, ומסע ממתין ללחיצה על הבא"
      },
      "device": "המכשיר שלך מבקש פחות תנועה, ולכן היא כבויה."
    },
    "summary": {
      "label": "מה על המסך",
      "stage": "מסתכל על {stage}.",
      "selected": "{name} נבחר, {kind}.",
      "nothing": "לא נבחר דבר.",
      "trip": "תחנה {n} מתוך {count} במסע: {title}.",
      "tripIntro": "המסע {title} פתוח.",
      "measured": "מצויר כפי שנמדד."
    }
  },
  "r13Deep": {
    "card": {
      "dso-tarantula-nebula": "האור שלה ליד הקו שלנו הוא התצלום של Webb; הגז שלה הוא מודל של חלל סביב הצביר R136 בתוך קליפה של גז זוהר שמוגבלת על ידי עננים מולקולריים, לפי Pellegrini, Baldwin ו-Ferland (2011). עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m43": "האור שלה נלקח מהתצלום של ESO, הצורה שלה משוחזרת כחלל קטן יותר על אותו ענן אפל כמו ערפילית אוריון, מואר על ידי הכוכב NU Orionis. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m51": "נבנתה מהשיפוע והמבנה שלה שפורסמו: ספירלה בעלת שתי זרועות הנראית כמעט מהחזית, בת הלוויה שלה NGC 5195 מאחורי קצה הזרוע הצפונית שלה, והזרוע שמגיעה אליה; העומקים הם מודל. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m81": "נבנתה מהשיפוע והמבנה שלה שפורסמו: בליטה ישנה גדולה, שתי זרועות מלופפות בחוזקה עם אבק בקצוות הפנימיים שלהן. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m101": "נבנתה מהשיפוע והמבנה שלה שפורסמו: דיסק גדול הנראה כמעט מהחזית, זרועות רבות ואזורי היווצרות הכוכבים הענקיים שלה היכן ששמיים מציבים אותם. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m104": "נבנתה מהשיפוע והמבנה שלה שפורסמו: בליטה עגולה עצומה ודיסק דק הנראה כמעט מהקצה, וטבעת האבק שלה לפניו. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-antennae-galaxies": "שתי גלקסיות מתנגשות היכן ששמיים מציבים אותן, ושני זנבות הגאות שלהן; כמה רחוק כל חלק לפנים או לאחור הוא מודל לפי הסימולציות של ההתנגשות. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-m83": "נבנתה מהשיפוע והמבנה שלה שפורסמו: ספירלה עם פס הנראית כמעט מהחזית, הזרועות שלה עשירות בכוכבים צעירים ובמימן זוהר. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-ngc-1300": "נבנתה מהמבנה שלה שפורסם: פס ארוך עם נתיבי אבק בקצוות המובילים שלו ושתי זרועות מהקצוות שלו, הצורה שלהן הותאמה לתצלום של Hubble. עדיין לא נבדקה על ידי אסטרונום.",
      "dso-centaurus-a": "נבנתה ממספרים שפורסמו: גלקסיה אליפטית ענקית שחוצה אותה דיסק מעוקם של אבק וכוכבים צעירים, לפי מודל שהותאם לתמונות של Spitzer; שני הסילונים שלה מצוירים בצבע מלאכותי, כי הם זוהרים בקרני X ובגלי רדיו, לא באור נראה. עדיין לא נבדקה על ידי אסטרונום."
    }
  },
  "compare": {
    "row": "השוואה",
    "hint": "בקנה מידה",
    "missing": "—",
    "none": "אין",
    "yes": "כן",
    "no": "לא",
    "range": "{a} עד {b}",
    "numUnit": "{num} {unit}",
    "modeLabel": "תצוגה",
    "modes": {
      "pair": "זה לצד זה",
      "lab": "כל העולמות"
    },
    "withLabel": "השווה עם",
    "scaleLabel": "קנה מידה",
    "scales": {
      "true": "בקנה מידה",
      "same": "אותו רוחב"
    },
    "propLabel": "סדר את כל העולמות לפי",
    "props": {
      "across": "רוחב",
      "mass": "מסה",
      "gravity": "כוח משיכה",
      "temp": "טמפרטורה",
      "spin": "אורך סיבוב",
      "year": "אורך שנה",
      "dist": "מרחק מהשמש",
      "moons": "מספר ירחים"
    },
    "names": {
      "sun": "השמש",
      "mercury": "כוכב חמה",
      "venus": "נוגה",
      "earth": "כדור הארץ",
      "moon": "הירח",
      "mars": "מאדים",
      "jupiter": "צדק",
      "saturn": "שבתאי",
      "uranus": "אורנוס",
      "neptune": "נפטון",
      "pluto": "פלוטו"
    },
    "the": {
      "sun": "השמש",
      "moon": "הירח"
    },
    "wider": "{big} רחב פי {n} מ{small}.",
    "same": "{a} ו{b} בערך באותו רוחב.",
    "figure": "{a} ו{b}, מצוירים {how}.",
    "figureTrue": "בקנה מידה אחד",
    "figureSame": "באותו רוחב, לא בקנה מידה",
    "tableLabel": "{a} ליד {b}",
    "rows": {
      "across": "רוחב",
      "mass": "מסה",
      "gravity": "כוח משיכה",
      "temp": "טמפרטורה",
      "spin": "סיבוב אחד אורך",
      "year": "שנה אחת שם",
      "dist": "מהשמש",
      "air": "אטמוספירה",
      "pressure": "לחץ אוויר",
      "moons": "ירחים",
      "rings": "טבעות"
    },
    "units": {
      "km": "ק״מ",
      "earthOne": "כדור הארץ",
      "earths": "כדורי ארץ",
      "g": "מ׳/שנ׳²",
      "c": "°C",
      "hours": "שעות",
      "days": "ימים",
      "years": "שנים",
      "au": "י״א",
      "bar": "בר",
      "microbar": "µבר"
    },
    "notes": {
      "average": "ממוצע",
      "flattened": "בממוצע; הוא מכווץ בקטבים",
      "range": "הטווח שלו",
      "bar1": "ברמת בר אחד",
      "edge": "בקצה הנראה",
      "photosphere": "פני השטח הנראים",
      "retro": "מסתובב לאחור",
      "sunSpin": "בקו רוחב 16°",
      "withEarth": "עם כדור הארץ",
      "exosphere": "אקסוספירה דקה",
      "photosphereAir": "בפוטוספירה"
    },
    "air": {
      "part": "{share}% {gas}",
      "join": ", ",
      "almostNone": "כמעט אין",
      "noSurface": "אין פני שטח"
    },
    "gas": {
      "hydrogen": "מימן",
      "helium": "הליום",
      "methane": "מתאן",
      "nitrogen": "חנקן",
      "oxygen": "חמצן",
      "argon": "ארגון",
      "carbon dioxide": "פחמן דו-חמצני"
    },
    "source": "גיליונות הנתונים של NASA על כוכבי לכת, נקראו ב-{date}.",
    "giantNote": "לענק אין פני שטח: כוח המשיכה והטמפרטורה שלו ברמת בר אחד.",
    "moonsNote": "מספרי הירחים גדלים ככל שירחים חדשים מאושרים.",
    "spinNote": "הסיבוב של השמש הוא הערך בגיליון בקו רוחב 16°.",
    "drawnTrue": "מצויר בקנה מידה אחד מכל רדיוס ממוצע, לא תצלומים.",
    "drawnSame": "אותו רוחב, ולכן לא בקנה מידה. הטבעות שומרות על החלק שלהן בו.",
    "tiny": "{name} קטן מפיקסל כאן ומצויר כנקודה.",
    "ringsDrawn": "הטבעות נטויות בשביל התמונה; הרדיוסים שלהן הם של NASA.",
    "labLog": "העמודות לוגריתמיות, כדי שערכים קטנים יישארו נראים.",
    "labLinear": "העמודות ביחס למספר.",
    "labTitle": "השווה עם {name}",
    "thisCard": "העולם בכרטיס הזה"
  },
  "passportKinds": {
    "kindsTitle": "נפתחו, לפי סוג",
    "noKinds": "עדיין אין מה לספור לפי סוג.",
    "kinds": {
      "worlds": "כוכבי לכת, ירחים והשמש",
      "stations": "תחנות חלל",
      "satellites": "לוויינים והטילים שלהם",
      "spacecraft": "גשושיות וטלסקופי חלל",
      "small": "שביטים ואסטרואידים",
      "stars": "כוכבים",
      "exoplanets": "כוכבי לכת של כוכבים אחרים",
      "deep": "ערפיליות, גלקסיות והחלל העמוק",
      "earth": "מקומות ומזג אוויר בכדור הארץ"
    },
    "notedTitle": "צוין",
    "noNoted": "עדיין לא צוין דבר. פתח מקום במפה.",
    "notedFine": "היום שבו נראה לראשונה שציון מתקיים בדפדפן הזה. נשמר כאן, אף פעם לא מדורג או נשלח.",
    "noted": {
      "first": {
        "name": "מקום ראשון",
        "said": "פתחת מקום במפה."
      },
      "planets": {
        "name": "כל שמונת כוכבי הלכת",
        "said": "פתחת כל כוכב לכת, מכוכב חמה עד נפטון."
      },
      "station": {
        "name": "תחנת חלל",
        "said": "פתחת תחנה במסלול."
      },
      "craft": {
        "name": "כלי שם בחוץ",
        "said": "פתחת גשושית או טלסקופ חלל."
      },
      "small": {
        "name": "שביט או אסטרואיד",
        "said": "פתחת גוף קטן של מערכת השמש."
      },
      "star": {
        "name": "כוכב",
        "said": "פתחת כוכב מעבר לשמש."
      },
      "exoplanet": {
        "name": "כוכב לכת של כוכב אחר",
        "said": "פתחת כוכב לכת שמקיף כוכב אחר."
      },
      "deep": {
        "name": "החלל העמוק",
        "said": "פתחת ערפילית, גלקסיה או צביר."
      },
      "trip": {
        "name": "מסע עד סופו",
        "said": "סיימת מסע מודרך."
      },
      "eyes": {
        "name": "ראית בעיניים שלך",
        "said": "סימנת משהו כנראה."
      },
      "every": {
        "name": "אחד מכל סוג",
        "said": "פתחת לפחות דבר אחד מכל סוג שלמעלה."
      }
    }
  },
  "photoCompare": {
    "title": "השווה לתצלום",
    "reconstruction": "שחזור",
    "photograph": "תצלום",
    "valueText": "{n}% תצלום",
    "flying": "עובר למקום שממנו צולם התצלום.",
    "note": "המפה מציירת מודל תלת-ממדי. התצלום מוצג רק כאן: שטוח ופונה אל השמש, ולכן כשמסתובבים ממנו הוא דוהה."
  },
  "entrances": {
    "label": "שלוש דרכים להיכנס",
    "tonight": "הלילה",
    "tonightTitle": "מה מעליך הלילה, מהמקום שלך",
    "explore": "חקור",
    "exploreTitle": "הסתכל סביב על כל המפה",
    "trip": "מסע מודרך",
    "tripTitle": "מתחיל את המסע המודרך הראשון ברשימה"
  },
  "momentPlayer": {
    "micro": "רגע",
    "play": "הפעל",
    "pause": "השהה",
    "replay": "הפעל שוב",
    "close": "סגור את הרגע",
    "chapters": "פרקים",
    "chaptersTitle": "קפוץ לפרק",
    "share": "העתק קישור לשנייה הזאת",
    "copied": "הקישור הועתק",
    "copyFailed": "העתק את הקישור הזה: {url}",
    "director": "במאי",
    "directorTitle": "החזר את המצלמה לבמאי",
    "freeNote": "המצלמה שלך. גרור כדי להסתכל מסביב; ״במאי״ מחזיר אותה.",
    "scrubber": "זמן המשימה",
    "met": "זמן שחלף מתחילת המשימה",
    "rateTitle": "הזמן כאן רץ מהר פי {rate} ממה שרץ",
    "realTime": "זמן אמיתי",
    "loading": "טוען את הרגע…",
    "missing": "אין רגע בשם {id}.",
    "unreachable": "הרגע הזה לא נטען. הוא נשמר במכשיר הזה רק אחרי שנפתח פעם אחת בחיבור.",
    "modelMissing": "המודל {model} לא נטען; המסלול והלהבות שלו עדיין מצוירים.",
    "chapterOf": "פרק {n} מתוך {m}",
    "quoteBy": "{who}, {at}",
    "truthWords": {
      "measured": "נמדד",
      "reconstructed": "משוחזר",
      "illustrative": "להמחשה"
    },
    "truthLine": "{truth}: {path}.",
    "cutNote": "שלבים נחתכו ממודל אחד בינתיים.",
    "drawnNote": "להבות ואדים מצוירים.",
    "groundNote": "הקרקע ליד המשטח להמחשה; מפת כדור הארץ Solar System Scope, CC BY 4.0.",
    "keys": "רווח מפעיל או משהה, חצים מתקדמים, Escape סוגר"
  },
  "momentShelf": {
    "title": "רגעים",
    "note": "שלוש משימות שמושמעות מחדש על שעון אחד, עם הזמנים האמיתיים של האירועים. המסלולים משוחזרים ואומרים זאת.",
    "minutes": "{m} דק׳",
    "replay": "הפעל מחדש את הרגע הזה",
    "replayTitle": "הפעל מחדש את {title} על שעון המשימה",
    "cards": {
      "apollo-11": {
        "title": "Apollo 11",
        "when": "16 עד 24 ביולי 1969",
        "blurb": "ממשטח 39A אל האוקיינוס השקט דרך בסיס השלווה: ההמראה, הירח, הנחיתה, העלייה, הבית."
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "1 עד 10 באפריל 2026",
        "blurb": "ממשטח 39B אל האוקיינוס השקט ליד סן דייגו, סביב הצד הרחוק של הירח. מה שטס נאמר כטס, ומה שתוכנן נאמר כמתוכנן."
      },
      "vostok-1": {
        "title": "Vostok 1",
        "when": "12 באפריל 1961",
        "blurb": "יורי גגרין, הקפה אחת סביב כדור הארץ ב-108 דקות, מבייקונור אל שדה ליד סמלובקה."
      }
    }
  },
  "momentStories": {
    "demo-saturn": {
      "title": "Saturn V: מההצתה ועד ניתוק השלב",
      "blurb": "שלוש הדקות הראשונות של Apollo 11, 16 ביולי 1969, ממשטח השיגור Launch Complex 39A.",
      "chIgnition": "הצתה",
      "chLiftoff": "המראה",
      "chClimb": "דרך max Q",
      "chStaging": "ניתוק שלב",
      "ignition": "T−8.9 שנ׳: רצף ההצתה מפעיל את חמשת מנועי ה-F-1, קודם המרכזי, ואחר כך הזוגות החיצוניים.",
      "holddown": "זרועות העיגון מחזיקות את הערימה על המשטח עד שכל חמשת המנועים בדחף מלא.",
      "liftoff": "המראה, 13:32:00.6 UTC: חמישה מנועי F-1, כ-33 800 קילו-ניוטון, מרימים כמעט 3 000 טון.",
      "tower": "אחרי שהיא מתרחקת מהמגדל, הערימה מתגלגלת אל כיוון הטיסה שלה, 72 מעלות ממזרח לצפון.",
      "maxq": "אחרי דקה היא חוצה את מהירות הקול; אחר כך max Q, כשהאוויר דוחף חזק ביותר: 35 kPa (735 lb/ft²).",
      "ceco": "T+135 שנ׳: המנוע המרכזי נכבה, כדי לשמור את התאוצה מתחת ל-4 g.",
      "staging": "T+161.7 שנ׳: המנועים החיצוניים נכבים. בגובה של כ-67 ק״מ ה-S-IC נופל, ורקטות הבלימה שלו יורות.",
      "sii": "T+163.0 שנ׳: חמשת מנועי ה-J-2 של ה-S-II נדלקים. מימן בוער חיוור וכמעט שקוף.",
      "interstage": "טבעת הביניים נושרת; ב-T+197.9 שנ׳ מגדל הבריחה נעלם. מסלול ההמתנה בעוד 8.5 דקות.",
      "pathAscent": "זמני הדו״ח של משימת Apollo 11, הגבהים ביניהם משוערים",
      "sources": "דו״ח משימת Apollo 11, NASA MSC-00171, 1969 (טבלה 3-I, רצף אירועים; סעיף 7.1, שיגור)"
    },
    "vostok-1": {
      "title": "Vostok 1: האדם הראשון בחלל",
      "blurb": "יורי גגרין, 12 באפריל 1961: מבייקונור, הקפה אחת סביב כדור הארץ, אל שדה ליד סמלובקה, על שעון המשימה, ב-108 דקות.",
      "chPad": "הזינוק של גגרין",
      "chAscent": "עלייה",
      "chOrbit": "מסלול אחד",
      "chRetro": "ירי הבלימה",
      "chEntry": "כניסה",
      "chEject": "הטלה החוצה",
      "chLand": "נחיתה",
      "ready": "בייקונור, אתר 1, 06:07 UTC. יורי גגרין, בן 27, בקפסולה שעל גבי הטיל R-7.",
      "korolev": "סרגיי קורולב ברדיו: ״שלב מקדים… ביניים… ראשי… המראה!״",
      "liftoff": "המראה. גגרין: ״Poyekhali!״, ״בוא נצא לדרך!״",
      "boosters": "T+119 שנ׳: ארבע רקטות העזר שמסביב נכבות ונושרות.",
      "shroud": "T+156 שנ׳: המעטפת שמעל הקפסולה נזרקת.",
      "core": "T+300 שנ׳: שלב הליבה מוצה ונושר; השלב האחרון נדלק.",
      "earth": "בערך T+6 דקות, גגרין: ״אני רואה את כדור הארץ. הראות טובה.״",
      "kosberg": "בערך T+10 דקות השלב האחרון נכבה. גגרין: ״קוסברג עבד!״, על שם מתכנן המנוע שלו.",
      "orbit": "במסלול: 181 על 327 ק״מ, נטוי 64.95 מעלות לקו המשווה, 89.1 דקות להקפה. הקפסולה מתנתקת מהשלב.",
      "retro": "T+שעה ו-18 דקות, מעל החוף המערבי של אפריקה: רקטת הבלימה יורה כ-42 שניות. הזמן והמקום שלה פורסמו; הגודל שלה כאן מותאם לנחיתה.",
      "wires": "מודול המכשירים אמור להיפרד עשר שניות אחרי ירי הבלימה. צרור חוטים מחזיק אותו; השניים מתגלגלים יחד באוויר.",
      "entry": "החוטים נשרפים והכדור מתיישב כשמגן החום קדימה. גגרין דיווח אחר כך על יותר מ-10 g.",
      "eject": "בגובה 7 ק״מ הפתח נפתח בפיצוץ והכיסא יורה את גגרין החוצה. הכדור של Vostok נחת חזק מדי בשביל אדם שבתוכו.",
      "chutes": "בגובה 2.5 ק״מ החופה הראשית של הקפסולה נפתחת, ברוחב 27 מ׳; החופה של הטייס עצמו נפתחה כמעט מיד. הכיסא נופל חופשי.",
      "landing": "T+שעה ו-48 דקות: גגרין נוחת 26 ק״מ דרום-מערבית לאנגלס, מחוז סרטוב, 108 דקות אחרי השיגור. המקורות חלוקים בעשר דקות לגבי הנחיתה.",
      "pathAscent": "העלייה היא זמני האירועים שפורסמו, מחוברים בעקומות חלקות; הגבהים והמרחקים ביניהם שלנו",
      "pathOrbit": "המסלול, ירי הבלימה והכניסה הם קשתות של שני גופים שהותאמו לזמנים שפורסמו ולשדה הנחיתה, לא נתוני מעקב",
      "pathPilot": "הירידה מתחת לחופה של הטייס מצוירת; שום מקור לא נותן את המרחק לקפסולה",
      "srcWiki": "ויקיפדיה, Vostok 1 (זמני אירועים, מסלול, ציטוטים; נקרא ב-2 בנובמבר 2026)",
      "srcNssdc": "NASA NSSDCA, Vostok 1 (מסלול, חללית)"
    },
    "apollo-11": {
      "title": "Apollo 11: אל הירח וחזרה",
      "blurb": "Launch Complex 39A, 16 ביולי 1969, עד האוקיינוס השקט ב-24 בו: ההמראה, הירח, בסיס השלווה והבית, על שעון המשימה.",
      "chIgnition": "הצתה",
      "chLiftoff": "המראה",
      "chStaging": "ניתוק שלב",
      "chParking": "מסלול המתנה",
      "chTli": "יוצאים לירח",
      "chCoast": "שלושה ימים בדרך",
      "chLoi": "אל מסלול הירח",
      "chUndock": "Eagle מתנתק",
      "chDescent": "ירידה בהנעה",
      "chSurface": "בסיס השלווה",
      "chAscent": "בחזרה למעלה",
      "chDock": "עגינה",
      "chTei": "הביתה",
      "chEntry": "כניסה",
      "chSplash": "נחיתה בים",
      "ignition": "T−8.9 שנ׳: רצף ההצתה מפעיל את חמשת מנועי ה-F-1, קודם המרכזי, ואחר כך הזוגות החיצוניים.",
      "liftoff": "המראה, 13:32:00 UTC: חמישה מנועי F-1, כ-33 800 קילו-ניוטון, מרימים כמעט 3 000 טון.",
      "tower": "אחרי שהיא מתרחקת מהמגדל, הערימה מתגלגלת אל כיוון הטיסה שלה, 72 מעלות ממזרח לצפון.",
      "maxq": "אחרי דקה היא חוצה את מהירות הקול; אחר כך max Q, כשהאוויר דוחף חזק ביותר: 35 kPa.",
      "ceco": "T+135 שנ׳: המנוע המרכזי נכבה, כדי לשמור את התאוצה מתחת ל-4 g.",
      "staging": "T+161.7 שנ׳: המנועים החיצוניים נכבים. בגובה של כ-67 ק״מ ה-S-IC נופל, ורקטות הבלימה שלו יורות.",
      "sii": "T+163.0 שנ׳: חמשת מנועי ה-J-2 של ה-S-II נדלקים. מימן בוער חיוור וכמעט שקוף.",
      "interstage": "טבעת הביניים נושרת; ב-T+197.9 שנ׳ מגדל הבריחה נעלם.",
      "siicut": "T+9 דקות ו-13 שניות: ה-S-II נכבה ונושר; ה-S-IVB נדלק.",
      "parking": "T+11 דקות ו-52 שניות: מסלול המתנה, בגובה 185 ק״מ. שעתיים וחצי של בדיקות, הקפה וחצי סביב כדור הארץ.",
      "tli": "2:44:16: ה-S-IVB נדלק שוב ל-5 דקות ו-48 שניות ומביא את הערימה ל-10.8 ק״מ בשנייה. היעד הוא הירח.",
      "sla": "3:17: ארבעת הלוחות סביב מודול הנחיתה נפתחים. Columbia מתנתקת, מסתובבת ומתחברת אף אל אף עם Eagle (לא מצויר).",
      "extract": "בערך 3:57: Columbia שולפת את Eagle מה-S-IVB. השלב המוצה נשאר מאחור.",
      "coast": "שלושה ימים אל הירח, 384 000 ק״מ, מצוירים במהירות של כ-8 000 פעמים המהירות האמיתית. הכלי באורך 11 מטרים, ולכן הוא נקודה.",
      "loi": "75:49:50, מאחורי הירח וללא קשר רדיו: מנוע השירות בוער שש דקות כדי להילכד.",
      "lunarorbit": "מסלול סביב הירח, בגובה של כ-100 ק״מ, שעתיים להקפה.",
      "undock": "100:12: Eagle, עם ארמסטרונג ואולדרין, מתנתק מ-Columbia, שבה נשאר קולינס.",
      "pdi": "102:33:05: הירידה בהנעה מתחילה, בגובה 15 ק״מ וכ-500 ק״מ לפני האתר.",
      "landing": "המחשב היה נוחת במכתש זרוע סלעים. ארמסטרונג לוקח את הבקרים וממשיך לטוס, עם דלק לפחות מדקה.",
      "landed": "102:45:40, 20:17:40 UTC. “Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15, 02:56 UTC ב-21 ביולי: ארמסטרונג יורד מהסולם.",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” ארמסטרונג, 109:24:48; הקליפ הוא ההקלטה של NASA.",
      "liftoffe": "124:22: שלב העלייה ממריא משלב הירידה, שנשאר על הירח. 17:54 UTC ב-21 ביולי.",
      "rendezvous": "Eagle רודף אחרי Columbia למעלה מ-18 ק״מ עד 100 ק״מ. התמרונים מצוירים כצורה, לא כתמרונים של המשימה עצמה.",
      "docked": "128:03, 21:35 UTC: עגינה. הצוות ו-21.5 ק״ג של סלעי ירח עוברים.",
      "jettison": "130:09: שלב העלייה של Eagle נעזב כדי להקיף את הירח.",
      "tei": "135:23:42, בצד הרחוק: מנוע השירות יורה 2 דקות ו-30 שניות. הביתה.",
      "home": "יומיים וחצי חזרה, אותם 384 000 ק״מ.",
      "smsep": "194:49: מודול השירות נחתך והקפסולה מסובבת את מגן החום שלה קדימה.",
      "entry": "195:03, ממשק הכניסה, בגובה 122 ק״מ ב-11 ק״מ בשנייה. המגן זוהר; עד כ-6 g.",
      "drogue": "בערך 195:12: שני מצנחי בלימה, ואחר כך שלושה ראשיים.",
      "mains": "שלושה מצנחים ראשיים, ברוחב 25 מ׳, מאטים את הקפסולה לכ-9 מ׳ בשנייה.",
      "splash": "195:18:35, 16:50:35 UTC ב-24 ביולי: נחיתה באוקיינוס השקט, 24 ק״מ מנושאת המטוסים USS Hornet (לא מצוירת). שמונה ימים, שלוש שעות, 18 דקות.",
      "pathAscent": "זמני האירועים של דו״ח המשימה, עם גבהים ומרחקים ביניהם משוערים",
      "pathTrip": "משוחזר מזמני האירועים של יומן הטיסה כקשתות של שני גופים: חרוט החוצה, מעגל סביב הירח, חרוט הביתה; לא נתוני מעקב",
      "pathLm": "הירידה מצוירת לאחור מבסיס השלווה והמפגש הוא צורה; זמני האירועים הם של המשימה",
      "srcReport": "דו״ח משימת Apollo 11, NASA MSC-00171, 1969 (זמני אירועים, שיגור, נחיתה)",
      "srcJournal": "יומן הטיסה של Apollo 11, NASA (זמני אירועים עד השנייה)",
      "srcClip": "המילים הראשונות של ארמסטרונג על הירח: הקלטה של NASA, נחלת הכלל, מ-Wikimedia Commons"
    },
    "artemis-ii": {
      "title": "Artemis II: סביב הירח",
      "blurb": "Launch Complex 39B, 1 באפריל 2026, עד האוקיינוס השקט ליד סן דייגו ב-10 בו: ארבעה אנשים סביב הצד הרחוק של הירח, על שעון המשימה.",
      "chPad": "משטח 39B",
      "chLiftoff": "המראה",
      "chStaging": "הרקטות הצדדיות נעלמות",
      "chOrbit": "מסלול גבוה סביב כדור הארץ",
      "chTli": "יוצאים לירח",
      "chMoon": "הצד הרחוק",
      "chHome": "חוזרים הביתה",
      "chEntry": "כניסה",
      "chSplash": "נחיתה בים",
      "ready": "Launch Complex 39B, מרכז החלל קנדי, 1 באפריל 2026. Wiseman, Glover, Koch ו-Hansen על סיפון Orion, שעל גבי Space Launch System.",
      "cored": "T−6.4 שנ׳: ארבעת מנועי ה-RS-25 של שלב הליבה מתניעים. טס, כמתוכנן.",
      "liftoff": "המראה, 22:35:12 UTC (6:35 אחר הצהריים EDT): שתי הרקטות הצדדיות בנות חמשת הקטעים נדלקות באפס. טס.",
      "srb": "בערך T+2 דקות: הרקטות הצדדיות נכבות ונפרדות בגובה 48 ק״מ, ב-5 000 קמ״ש. טס; הן נוחתות באוקיינוס האטלנטי.",
      "las": "מתוכנן, T+3 דקות ו-22 שניות: מגדל הבריחה נזרק. הטיסות שדווחו לא נותנות את השנייה; זו של תוכנית הטיסה.",
      "meco": "מתוכנן, T+8 דקות: שלב הליבה נכבה, בקשת תת-מסלולית עם אפוגאה ליד 2 300 ק״מ. הזמן של תוכנית הטיסה.",
      "coresep": "שלב הליבה משוחרר ונופל לכניסה הרסנית מעל האוקיינוס השקט, כשעתיים אחרי השיגור. טס.",
      "prb": "בערך T+50 דקות, בראש הקשת: השלב העליון בוער כדי להרים את הנקודה הנמוכה מתוך האוויר. טס, השנייה לא פורסמה.",
      "arb": "שעה אחר כך, בנקודה הנמוכה: בעירה של 15 דקות מרימה את הצד הרחוק של המסלול ל-70 000 ק״מ, הקפה של כמעט יום. טס.",
      "fairings": "מתוכנן: שלושת הלוחות סביב מודול השירות נזרקים; ארבעת מערכי השמש נפתחים. הזמן של תוכנית הטיסה, מצויר כאן פרוס.",
      "arrays": "ארבעת המערכים של Orion בחוץ: הם יפיקו את החשמל שלה במשך עשרה ימים.",
      "sep": "מתוכנן: Orion נפרדת מהשלב העליון; אחר כך Glover מטיס אותה ביד לצד השלב כ-70 דקות. זמן ההיפרדות לא פורסם.",
      "tli": "יום טיסה 2, כ-25 שעות מההתחלה: המנוע הראשי של מודול השירות בוער 5 דקות ו-49 שניות, אל הירח. טס; הדקה המוצגת היא של תוכנית הטיסה.",
      "outbound": "ארבעה ימים בדרך החוצה. בעירת תיקון אחת בדרך החוצה בוצעה, 17.5 שניות ביום טיסה 5; היא קטנה מדי לצייר.",
      "record": "17:56 UTC ב-6 באפריל: Orion עוברת את שיא המרחק של Apollo 13 מ-1970, 248 655 מיילים מכדור הארץ. טס.",
      "moon": "יום טיסה 6: Orion נכנסת לתחום ההשפעה של הירח. היא לא תקיף: היא טסה סביב הצד הרחוק ונופלת הביתה.",
      "los": "22:46 UTC: מאחורי הירח, בלי קשר במשך 38 דקות. טס.",
      "closest": "הקרבה הגדולה ביותר, 23:00 UTC ב-6 באפריל: 6 545 ק״מ מעל הצד הרחוק של הירח. טס.",
      "far": "23:02 UTC: הכי רחוק מכדור הארץ, 406 771 ק״מ. טס.",
      "aos": "23:24 UTC: קשר שוב מאחורי הירח. טס.",
      "home": "ארבעה ימים הביתה. שלוש בעירות תיקון בדרך חזרה בוצעו, של 15, 9 ו-8 שניות; הן קטנות מדי לצייר.",
      "esmsep": "מתוכנן: מודול השירות משוחרר כ-20 דקות לפני הכניסה. זמן השחרור לא פורסם; מצויר זה של תוכנית הטיסה.",
      "entry": "ממשק הכניסה, מתוכנן כ-13 דקות לפני הנחיתה בים: בגובה 122 ק״מ ב-11 ק״מ בשנייה, מגן החום זוהר. כניסה ישירה תלולה יותר החליפה את כניסת הקפיצה המתוכננת. טס.",
      "drogue": "מצנחי בלימה, ואחר כך מצנחי טייס ושלוש חופות ראשיות, ברוחב 35 מ׳. טס; הזמנים הם של תוכנית הטיסה.",
      "mains": "שלושה מצנחים ראשיים מורידים את הקפסולה אל הים.",
      "splash": "נחיתה בים, 00:07:27 UTC ב-11 באפריל (5:07 אחר הצהריים PDT, 10 באפריל), 32.3 צפון 117.8 מערב, דרום-מערב לסן דייגו; USS John P. Murtha אוספת את הצוות (הספינה לא מצוירת). תשעה ימים, שעה אחת, 32 דקות. טס.",
      "pathAscent": "זמני האירועים של תוכנית הטיסה עם גבהים ומרחקים ביניהם שלנו; ההמראה והיפרדות הרקטות הצדדיות טסו",
      "pathTrip": "משוחזר מהמסלול שטס, מהקרבה הגדולה ביותר וממקום הנחיתה בים, כקשתות של שני גופים והיפרבולה סביב הירח; לא נתוני מעקב",
      "srcWiki": "ויקיפדיה, Artemis II (מה שטס, עם זמנים ומרחקים; נקרא ב-2 בנובמבר 2026)",
      "srcNasa": "NASA, Artemis II (תוכנית הטיסה; מודל הטיל והקפסולה: NASA 3D Resources)"
    }
  }
};

export const GLOSSARY = {
  "orbit": "נתיב סביב משהו, שמוחזק על ידי כוח המשיכה. אם מהירים מספיק הצידה, ממשיכים ליפול על פני כדור הארץ במקום לתוכו.",
  "low Earth orbit": "הקליפה העמוסה שבגובה של כ-200 עד 2000 ק״מ. התחנה, רוב הלוויינים ורוב הפסולת נמצאים כאן.",
  "geostationary": "מסלול בגובה 35 786 ק״מ שבו הקפה אחת אורכת כמו סיבוב אחד של כדור הארץ, 23 שעות ו-56 דקות. לכן נדמה שהלוויין תלוי מעל נקודה אחת.",
  "polar orbit": "מסלול מעל הקטבים. כדור הארץ מסתובב מתחתיו, ולכן הלוויין רואה בסוף כל חלק ממנו.",
  "elements": "שישה מספרים ועוד תאריך שמתארים מסלול. אם מזינים אותם לחישוב הנכון, מקבלים מיקום.",
  "epoch": "הרגע שבו קבוצת מרכיבי מסלול הייתה נכונה. ככל שמתרחקים ממנו, התשובה פחות מדויקת.",
  "apogee": "הנקודה הגבוהה של מסלול סביב כדור הארץ.",
  "perigee": "הנקודה הנמוכה של מסלול סביב כדור הארץ.",
  "perihelion": "הנקודה שבה משהו שמקיף את השמש מתקרב אליה הכי הרבה.",
  "inclination": "עד כמה מסלול נטוי ביחס לקו המשווה. תשעים מעלות עובר מעל הקטבים.",
  "propagated": "חושב קדימה ממדידה ישנה יותר. לא תצפית חדשה, והוא סוטה עם הזמן.",
  "lunar distance": "המרחק מכדור הארץ לירח, כ-384 000 ק״מ. סרגל נוח למעברים של אסטרואידים.",
  "astronomical unit": "המרחק מכדור הארץ לשמש, כ-150 מיליון ק״מ.",
  "light-time": "כמה זמן לוקח לאור לחצות מרחק. זה גם הזמן שלוקח להודעת רדיו.",
  "light-year": "המרחק שאור עובר בשנה יוליאנית אחת, כ-9.46 טריליון ק״מ. סרגל לפער בין כוכבים.",
  "magnitude": "כמה בהיר משהו נראה. הסולם הפוך: מספרים קטנים יותר הם בהירים יותר.",
  "azimuth": "כיוון במצפן במעלות. אפס הוא צפון, 90 הוא מזרח.",
  "elevation": "כמה גבוה משהו מעל האופק, במעלות. תשעים הוא ישר למעלה.",
  "terminator": "הקו בין יום ללילה על עולם.",
  "twilight": "הזמן אחרי השקיעה שבו השמיים עדיין לא חשוכים לגמרי. אז הכי קל לראות לוויינים.",
  "sunlit": "עדיין תופס אור שמש למרות שהקרקע שמתחתיו חשוכה. זה מה שהופך לוויין לנראה.",
  "radiant": "הנקודה בשמיים שממנה נדמה שבא ממטר מטאורים.",
  "ZHR": "בערך כמה מטאורים בשעה היית רואה תחת שמיים חשוכים לגמרי כשנקודת המוצא מעל הראש. בדרך כלל רואים פחות.",
  "close approach": "כשאסטרואיד עובר ליד כדור הארץ. ״ליד״ באסטרונומיה בדרך כלל אומר רחוק יותר מהירח.",
  "near-Earth object": "אסטרואיד או שביט שהמסלול שלו מביא אותו קרוב למסלול של כדור הארץ.",
  "reentry": "כשמשהו נופל בחזרה אל האטמוספירה. רובו נשרף בדרך למטה.",
  "debris": "לוויינים מתים, שלבי טילים משומשים ורסיסים. עשרות אלפי חתיכות נעקבות.",
  "constellation": "דגם של כוכבים שאנשים נתנו לו שם לפני הרבה זמן. הכוכבים בו בדרך כלל לא קרובים זה לזה בכלל.",
  "L1": "נקודת איזון בין כדור הארץ לשמש, כ-1.5 מיליון ק״מ לכיוון השמש. מתאימה לצפייה בשמש.",
  "L2": "נקודת איזון במרחק 1.5 מיליון ק״מ מכדור הארץ בצד הרחוק מהשמש, שבה טלסקופ יכול להשאיר את כדור הארץ ואת השמש מאחוריו ולהישאר קר.",
  "transit": "כשדבר אחד עובר לפני דבר אחר, כפי שרואים מהמקום שבו אתה עומד.",
  "conjunction": "כששני דברים נראים קרובים זה לזה בשמיים. הם לא קרובים בחלל.",
  "ephemeris": "טבלה של איפה משהו יהיה, שחושבה מראש."
};
