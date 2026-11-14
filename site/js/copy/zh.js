// zh: Chinese (Simplified), the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).
// Fetched by copy/index.js only when the page speaks Chinese (Simplified) (?lang=zh); hidden until a native reader has signed off (docs/TRANSLATING.md).
//
// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.
// Until a second native speaker has read it and put their name in `review.by`, copy/lang.js keeps `reviewed: false`, so the page
// speaks Chinese (Simplified) only to a visitor who asks for it (?lang=zh), and the language picker does not list it.
//
// CHOICES, so a reviewer can disagree with them:
//   * Script and register: Simplified Chinese (zh-Hans), mainland terms, full-width punctuation, plain written style for a 14-year-old; the reader is addressed as 你 (informal), never 您.
//   * Honesty words, one each everywhere: measured 实测; worked out 推算 (computed 计算); modelled 模拟; illustrative 示意; reconstructed 重建; artist's impression 艺术想象图; sample 样本; "Flown" (Artemis) 已实飞.
//   * Look panel: 外观 with 实测 (Measured) and 电影 (Film); Exposure 曝光 with 肉眼 / 相机 / 深度. "Sped up" 已加速.
//   * Planets, Sun, Moon and big moons use the Chinese names (木卫一 ... 土卫六, 冥卫一); a few names are kept Latin on purpose (see below).
//   * Spacecraft, telescopes, surveys and agencies keep their Latin names (Voyager 2, Hubble, Cassini, Webb, Gaia, NASA JPL), set off with a space from the Chinese; only 天宫 and 国际空间站 (ISS) use Chinese. People: 加加林, 科罗廖夫, 阿姆斯特朗, 奥尔德林, 柯林斯 in Chinese; Artemis II crew, authors in papers stay Latin. Places: 拜科努尔, 静海基地, 肯尼迪航天中心 in Chinese.
//   * Quotations: Armstrong and "Houston, Tranquility Base here" stay English; Gagarin's "Poyekhali!" is kept, the rest of the Vostok quotes are translated (said in Russian).
//   * Plural: one form, plural() returns the second string. No articles: {a} is empty, and card.articles, exoface.a/an and r12Navigate.theWord are a zero-width space (an empty string would mean "not translated" and show the English). r12Navigate.the keeps the English registry names (Sun, Moon, Milky Way), so a few chain labels show the English registry name.
//   * Big numbers: the code gives Western digits, so "百万 / 十亿" follow the number ("{n} 十亿光年", "{n} 百万年前") instead of 万 / 亿; a reviewer may prefer to move to 亿 by changing the template to take the digits differently.
//   * Compass: 北北东, 东北东 style (standard 16 points) in the short list and in the long list alike. Moon phases: 蛾眉月, 盈凸月, 亏凸月, 残月, 上弦月, 下弦月. Twilights: 民用 / 航海 / 天文曙暮光 (the English "last twilight" became 天文曙暮光).
//   * Unsure: {age} and {ago} are taken to hold "N 小时前" style phrases (so "最旧的是{age}的", "离线：显示{age}保存的副本"); eclipse kind words are built to compose with 日/月 (日全食, 月半影食); "{n} 个拳头" for the fist rule; 导览旅程 for guided trip; 护照 for Passport.
//   * Traditional (Taiwan) conversion notes: see docs/zh-hant-terms.txt (mainland-only terms to change).

export const META = {
  code: "zh",
  name: "简体中文",
  english: "Chinese (Simplified)",
  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },
};

export const RULES = {
  /** Chinese has no indefinite article: code puts nothing where English had "a" or "an". */
  article() {
    return '';
  },
  /** One form for every number: always the second string (both are the same word, e.g. "分钟"). */
  plural(n, one, many) {
    return many;
  },
};

export const COPY = {
  "app": {
    "name": "Space Radar",
    "bootSky": "正在构建天空…",
    "bootEarth": "正在放置地球…",
    "bootCatalogues": "正在读取星表…",
    "tagline": "地球周围的一切运动，在它们真实所在的位置，此刻。",
    "sceneSelected": "一幅按真实位置绘制的太空地图，当前选中的是 {name}：地图旁边面板里的卡片会告诉你它是什么。"
  },
  "compareText": {
    "size": [
      "大约和一台烤面包机一样大",
      "大约和一台洗衣机一样大",
      "大约和一辆小汽车一样大",
      "大约和一辆公交车一样大",
      "大约和一栋房子一样大",
      "大约和 15 层的楼一样高",
      "大约和 25 层的楼一样高",
      "大约和一个足球场一样大",
      "大约和 40 层的塔楼一样高",
      "大约和一艘邮轮一样大",
      "大约和地球上最高的建筑一样高",
      "大约和一座小山一样大",
      "大约和一座城市一样大"
    ],
    "magnitude": [
      "和满月一样亮",
      "比任何恒星和行星都亮",
      "和金星一样亮",
      "和最亮的恒星一样亮",
      "和普通恒星一样亮",
      "在黑暗的地方刚好能看见",
      "太暗了，没有望远镜看不到"
    ],
    "speed": [
      "{n} 公里/时，相当于高速公路上的车速",
      "{n} 公里/时，大约是客机的速度",
      "{n} 公里/时，比步枪子弹还快",
      "{n} 公里/时，每分钟约 {m} 公里"
    ],
    "driving": "向上 {n} 公里，如果公路笔直通向天上，开车大约要 {h} {word}",
    "hour": "小时",
    "hours": "小时",
    "up": "向上 {n} 公里",
    "moon": "月球距离的 {ld} 倍",
    "lightMinutes": "相距 {lt} 光分",
    "lightHours": "相距 {lh} 光时",
    "compass": [
      "北",
      "北北东",
      "东北",
      "东北东",
      "东",
      "东南东",
      "东南",
      "南南东",
      "南",
      "南南西",
      "西南",
      "西南西",
      "西",
      "西北西",
      "西北",
      "北北西"
    ]
  },
  "numberWords": [
    "没有",
    "一",
    "两",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九",
    "十"
  ],
  "shell": {
    "sideLabel": "探索",
    "back": "探索",
    "backLabel": "返回探索",
    "backChevron": "‹",
    "openChevron": "›",
    "handleMark": "S",
    "expand": "显示面板",
    "collapse": "隐藏面板",
    "topLabel": "搜索和工具"
  },
  "tabs": {
    "label": "去哪儿",
    "earth": "地球",
    "planets": "行星",
    "stars": "恒星",
    "tonight": "今晚"
  },
  "rightNow": {
    "title": "此刻",
    "storms": "有 {n} 场风暴正在旋转，其中 {name} 最强。",
    "stormOne": "有一场风暴正在旋转：{name}。",
    "clouds": "今日云图",
    "people": "太空中的人",
    "iss": "国际空间站",
    "tiangong": "天宫",
    "crewAt": "{name} 上有 {n} 人"
  },
  "statusLine": {
    "reading": "正在读取数据源",
    "read": "本次已读取 {n} 个",
    "readOne": "本次已读取 1 个",
    "stale": "{n} 个已过期",
    "failed": "{n} 个读取失败",
    "oldest": "最旧的是{age}的",
    "open": "打开数据源",
    "label": "{text}。打开数据源",
    "offline": "离线：显示{age}保存的副本",
    "offlineNone": "离线：这台设备上没有保存的副本"
  },
  "mission": {
    "title": "任务经过",
    "count": "第 {i} 项，共 {n} 项",
    "navLabel": "{name} 的大事记",
    "prev": "上一个事件",
    "next": "下一个事件",
    "when": "{date} {time} UTC",
    "predicted": "{when}（预计）",
    "go": "前往这一刻",
    "goTitle": "把时钟拨到这一刻，并对准画面",
    "here": "时钟正停在这一刻。点“实时”可以回来。",
    "noteSite": "地图可以显示这个地点在那一天、那一天的光照下的样子。",
    "notePath": "地图里有它在那一天的轨迹。",
    "noteCruise": "我们没有它在那一天的轨迹：{name} 画在一条直线上，这条线是从它现在实测的位置往回延伸的，误差大约一个天文单位。",
    "noteNone": "地图里没有 {name} 在那一天的轨迹，所以时钟保持不动。",
    "noteNoneWorld": "地图里没有 {name} 在那一天的轨迹，所以时钟保持不动。它到访的那个天体，任何日期都能画出来。",
    "seeWorld": "看看那天的{world}",
    "seeWorldTitle": "把时钟拨到那一天，前往{world}。那里不会画出 {name} 本身",
    "all": "全部 {n} 个事件",
    "fewer": "收起列表",
    "source": "日期和数据来源：",
    "unknown": "这个链接指向的事件，地图里没有。"
  },
  "tripCard": {
    "title": "旅程",
    "meta": "{n} 站 · {m} 分钟",
    "metaOne": "1 站 · {m} 分钟",
    "planning": "正在推算各站",
    "starting": "正在出发……",
    "cannotRun": "暂时无法运行",
    "offOne": "有 1 个旅程暂时无法运行",
    "offMany": "有 {n} 个旅程暂时无法运行",
    "offWhy": "{line}：{reason}",
    "all": "全部 {n} 个旅程",
    "fewer": "收起旅程",
    "onItsOwn": "自动播放",
    "onItsOwnTitle": "一个接一个播放旅程，直到你接手操作",
    "justWatch": "只看不动手",
    "reelLength": "一轮 {m} 分钟",
    "drift": "漂流",
    "driftLength": "没有尽头",
    "driftTitle": "镜头从一个天体漂向下一个"
  },
  "explore": {
    "worldsTitle": "各个天体",
    "worldsDrawn": "行星画成圆点，比实际大得多。",
    "farTitle": "遥远的地方",
    "systemsTitle": "恒星系统",
    "systemsMild": "宜居带附近的行星",
    "systemsExtreme": "极端的星系",
    "exoRow": "其他恒星的行星",
    "exoShow": "显示",
    "exoHide": "隐藏",
    "exoTitle": "标出每一颗已知有行星的恒星",
    "lightYears": "{n} 光年",
    "au": "{n} AU"
  },
  "rail": {
    "label": "工具",
    "show": "显示什么 (L)",
    "share": "分享 (P)",
    "more": "更多工具",
    "moreLabel": "更多",
    "menuShare": "分享",
    "menuHide": "隐藏面板",
    "menuGitHub": "GitHub 源代码",
    "blog": "博客",
    "blogHref": "https://blog.spaceradar.ai/",
    "models": "模型",
    "modelsHref": "https://models.spaceradar.ai/",
    "video": "视频",
    "videoHref": "https://video.spaceradar.ai/",
    "tour": "新手导览",
    "menuTour": "新手导览"
  },
  "timePill": {
    "label": "时间",
    "when": "{date} {time} UTC",
    "live": "实时 · {when}",
    "held": "{when} · 已暂停",
    "away": "{when} · {off}",
    "unknown": "时间未知",
    "prev": "‹",
    "next": "›",
    "prevTitle": "回到过去",
    "nextTitle": "前往未来",
    "backToLive": "实时",
    "backToLiveTitle": "回到真实的此刻",
    "rate": "{n}×",
    "rateTitle": "速度 {n}×。点按切换到 {next}×",
    "hold": "点按让时间静止，拖动可穿越时间",
    "run": "点按让时间流动，拖动可穿越时间",
    "localTitle": "你的时间 {time}，{zone}。{hold}",
    "readLabel": "{text}。{hold}",
    "units": {
      "minute": "1 分钟",
      "hour": "1 小时",
      "day": "1 天",
      "event": "事件"
    },
    "unitWords": {
      "minute": "一分钟",
      "hour": "一小时",
      "day": "一天",
      "event": "一个事件"
    },
    "prevEvent": "上一个事件",
    "nextEvent": "下一个事件",
    "noEventBack": "时间轴上没有更早的事件了。",
    "noEventOn": "时间轴上没有更晚的事件了。",
    "moonMark": "月相：{phase}，{date}",
    "sunMark": "你所在位置的{what}，{date}",
    "sunMarkGuess": "我们为你猜测的地点的{what}，{date}",
    "sunWords": {
      "sunrise": "日出",
      "sunset": "日落"
    },
    "unitTitle": "每步 {unit}。点按切换到 {next}",
    "tapeLabel": "时间轴。可以拖动，也可以用方向键",
    "tapeTitle": "拖动可穿越时间",
    "now": "现在",
    "nowTitle": "回到现在",
    "rough": "较粗略",
    "roughTitle": "离现在超过一周，卫星在轨道上的位置就只是粗略的了",
    "roughSay": "离现在这么远，卫星的位置只是粗略的。",
    "worlds": "行星和卫星的位置，几个世纪内都可靠。",
    "markTitle": "{what}。点按前往",
    "endTitle": "时间轴到此为止：往前一个月，往后一年"
  },
  "punctuation": {
    "comma": "，",
    "dot": "。",
    "separator": " · ",
    "listJoin": "、",
    "dash": "——",
    "colon": "：",
    "ellipsis": "……",
    "sentenceJoin": "。"
  },
  "worlds": {
    "sun": "太阳",
    "mercury": "水星",
    "venus": "金星",
    "earth": "地球",
    "moon": "月球",
    "mars": "火星",
    "jupiter": "木星",
    "saturn": "土星",
    "uranus": "天王星",
    "neptune": "海王星",
    "pluto": "冥王星",
    "io": "木卫一",
    "europa": "木卫二",
    "ganymede": "木卫三",
    "callisto": "木卫四",
    "phobos": "火卫一",
    "deimos": "火卫二",
    "enceladus": "土卫二",
    "titan": "土卫六",
    "triton": "海卫一",
    "charon": "冥卫一"
  },
  "worldFacts": {
    "cite": {
      "pluto": "位置由 Astronomy Engine（Don Cross 编写，MIT 许可）计算，它会考虑太阳和几颗巨行星对冥王星的引力；半径来自维基百科的冥王星信息框，它是什么来自 NASA Science，颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "io": "位置由 Astronomy Engine（Don Cross 编写，MIT 许可）计算：木星的位置，加上木星卫星的 L1.2 理论（Lainey、Duriez 和 Vienne）；半径来自 NASA 的木星卫星数据表，它是什么来自 NASA Science，颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "europa": "位置由 Astronomy Engine（Don Cross 编写，MIT 许可）计算：木星的位置，加上木星卫星的 L1.2 理论（Lainey、Duriez 和 Vienne）；半径来自 NASA 的木星卫星数据表，它是什么来自 NASA Science，颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "ganymede": "位置由 Astronomy Engine（Don Cross 编写，MIT 许可）计算：木星的位置，加上木星卫星的 L1.2 理论（Lainey、Duriez 和 Vienne）；半径来自 NASA 的木星卫星数据表，它是什么来自 NASA Science，颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "callisto": "位置由 Astronomy Engine（Don Cross 编写，MIT 许可）计算：木星的位置，加上木星卫星的 L1.2 理论（Lainey、Duriez 和 Vienne）；半径来自 NASA 的木星卫星数据表，它是什么来自 NASA Science，颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "phobos": "位置：火星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 6 公里以内；半径来自 JPL 的卫星物理参数，亮度来自 NASA 的火星数据表，它是什么和颜色来自 NASA Science，均于 2026-09-22 查阅",
      "deimos": "位置：火星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 120 公里以内；半径来自 JPL 的卫星物理参数，亮度来自 NASA 的火星数据表，它是什么和颜色来自 NASA Science，均于 2026-09-22 查阅",
      "enceladus": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 1480 公里以内；半径来自 JPL 的卫星物理参数，它是什么和颜色来自 NASA Science，观测方法来自维基百科，均于 2026-09-22 查阅",
      "titan": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 840 公里以内；半径来自 JPL 的卫星物理参数，它是什么来自 NASA Science，Huygens 着陆、颜色和观测方法来自维基百科，均于 2026-09-22 查阅",
      "triton": "位置：海王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 10 公里以内；半径来自 JPL 的卫星物理参数，它是什么来自 NASA Science，颜色和亮度来自维基百科，均于 2026-09-22 查阅",
      "charon": "位置：冥王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 1 公里以内；半径来自 JPL 的卫星物理参数，亮度来自 NASA 的冥王星数据表，它是什么和颜色来自 NASA Science，均于 2026-09-22 查阅",
      "mimas": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 700 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的土星卫星数据表，它是什么和颜色来自 NASA Science，亮度来自维基百科，均于 2026-09-22 查阅",
      "tethys": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 120 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的土星卫星数据表，它是什么来自 NASA Science，颜色和亮度来自维基百科，均于 2026-09-22 查阅",
      "dione": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 240 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的土星卫星数据表，颜色来自 NASA Science，它是什么和亮度来自维基百科，均于 2026-09-22 查阅",
      "rhea": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 200 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的土星卫星数据表，它是什么和颜色来自 NASA Science，亮度来自维基百科，均于 2026-09-22 查阅",
      "iapetus": "位置：土星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 6800 公里以内，约为其轨道的 0.19%；半径来自 JPL 的卫星物理参数，两个反照率来自 NASA 的土星卫星数据表，它是什么和颜色来自 NASA Science，亮度来自维基百科，均于 2026-09-22 查阅",
      "miranda": "位置：天王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 120 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的天王星卫星数据表，它是什么来自 NASA Science，颜色和亮度来自维基百科，均于 2026-09-22 查阅",
      "ariel": "位置：天王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 120 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的天王星卫星数据表，它是什么和颜色来自 NASA Science，亮度来自维基百科，均于 2026-09-22 查阅",
      "umbriel": "位置：天王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 410 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的天王星卫星数据表，它是什么来自 NASA Science，颜色和亮度来自维基百科，均于 2026-09-22 查阅",
      "titania": "位置：天王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 1000 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的天王星卫星数据表，它是什么和颜色来自 NASA Science，亮度来自维基百科，均于 2026-09-22 查阅",
      "oberon": "位置：天王星的位置来自 Astronomy Engine（Don Cross 编写，MIT 许可），再加上一条拟合 JPL Horizons 的轨道，2000 年至 2050 年间与它的偏差在 1230 公里以内；半径来自 JPL 的卫星物理参数，反照率来自 NASA 的天王星卫星数据表，它是什么来自 NASA Science，颜色和亮度来自维基百科，均于 2026-09-22 查阅"
    }
  },
  "worldView": {
    "withParent": "{parent} 在天空中被画得比实际宽 {n} 倍，方便你找到它；{name} 按同样的比例画在它周围：它和 {parent} 之间的距离也同样被放大了。",
    "withParentFloor": "{name} 本身被画得更大，否则会小得看不见。",
    "crowded": "{name} 没有画得那么宽：在这片天空里，{near} 离它只有 {deg} 度，这么大的圆盘会把它盖住。"
  },
  "stars": {
    "unnamed": "一颗没有名字的恒星（HYG {n}）"
  },
  "systems": {
    "mercuryRing": "水星的轨道，用来对比大小"
  },
  "ladder": {
    "title": "有多远",
    "rowName": "{label}, {distance}",
    "rowNameLoading": "{label}, 还在加载",
    "weShowTitle": "已知的天体里，这张地图画出了多少",
    "weShowRow": "{n} 个{what}——已知共 {of} 个",
    "edge": "地图的边缘",
    "edgeHow": "飞出去",
    "edgeTitle": "从这里一路飞到这张地图所画范围的边缘",
    "home": "地球",
    "homeHow": "飞回家",
    "homeTitle": "从这里一路飞回地球",
    "flightOff": "这里不能飞：请先去“地球”“行星”或“恒星”"
  },
  "sceneNote": {
    "refused": "读取不到卫星数据。",
    "refusedTitle": "发布轨道数据的 CelesTrak，在这个网络下读取不到。月球、行星、恒星，以及不需要卫星的旅程仍然可用。",
    "why": "数据来源",
    "close": "×",
    "closeTitle": "关闭这条提示"
  },
  "link": {
    "unknownVersion": "这个链接来自更新版本的地图。现在显示默认视图。",
    "unknownTrip": "这张地图里已经没有那个旅程了。现在显示默认视图。",
    "unknownAt": "这张地图上没有那个天体，现在显示默认视图。",
    "unknownStage": "这张地图无法对准那个地方。现在显示默认视图。"
  },
  "share": {
    "link": "分享",
    "linkTitle": "分享当前画面：明信片、链接，以及几句说明",
    "title": "分享",
    "close": "关闭",
    "pictureAlt": "明信片：当前画面按印刷尺寸重新绘制，并配有说明文字",
    "drawing": "正在绘制明信片……",
    "noPicture": "暂时无法绘制明信片。",
    "withTag": "在所选天体上加标签",
    "linkLabel": "链接",
    "copyLink": "复制链接",
    "textLabel": "文字",
    "lookingUp": "正在维基百科上查找……",
    "wikiSource": "这段文字引用的维基百科条目",
    "noWiki": "这里没有维基百科的文字，所以帖子会短一些。",
    "attribution": "摘自维基百科，CC BY-SA 4.0",
    "native": "分享……",
    "nativeTitle": "使用设备自带的分享功能，能带图片的地方会附上明信片",
    "nativeFailed": "分享没有打开，请改用复制或下载",
    "copy": "复制文字",
    "copyTitle": "复制文字和链接，可以直接粘贴到帖子里",
    "copied": "文字和链接已复制",
    "linkCopied": "链接已复制",
    "copyRefused": "复制被拒绝了；文字已选中，可以手动复制",
    "jpeg": "下载 JPEG",
    "jpegTitle": "把明信片存为 JPEG 图片，6 × 4 英寸，300 dpi",
    "pdf": "下载 PDF",
    "pdfTitle": "把明信片存为一页 PDF，6 × 4 英寸，方便打印",
    "email": "邮件",
    "emailTitle": "写一封带有文字和链接的邮件",
    "emailNote": "邮件不带图片：请用“分享……”或下载。",
    "networksLabel": "发布到",
    "networkTitle": "在新标签页中打开 {network}，并带上这条帖子",
    "networkLabel": "发布到 {network}",
    "networks": {
      "x": "X",
      "facebook": "Facebook",
      "linkedin": "LinkedIn",
      "whatsapp": "WhatsApp",
      "telegram": "Telegram",
      "reddit": "Reddit"
    },
    "subject": "{name}，来自 Space Radar",
    "failed": "暂时无法打开分享",
    "mark": "spaceradar.ai",
    "photo": "拍照模式",
    "photoTitle": "构图拍一张图：隐藏所有界面，加上边框和说明文字",
    "embed": "嵌入",
    "embedTitle": "复制代码，把这个实时画面放进网页",
    "embedCopied": "嵌入代码已复制",
    "embedRefused": "刚才复制被拒绝了",
    "embedFrameTitle": "{name}，Space Radar 实时画面",
    "textRow": "帖子文字"
  },
  "embed": {
    "open": "在 Space Radar 中打开",
    "openTitle": "在新标签页中，用完整地图打开这个画面",
    "barLabel": "Space Radar（嵌入版）",
    "stationUnread": "显示的是地球：读取不到空间站的位置"
  },
  "density": {
    "panelTitle": "密度",
    "regular": "标准",
    "compact": "紧凑",
    "auto": "自动",
    "autoCompact": "现在是紧凑，因为窗口比较矮。",
    "autoRegular": "现在是标准；窗口高度不超过 800 像素时会切换为紧凑。"
  },
  "nextList": {
    "justHappened": "刚刚发生",
    "justHappenedTitle": "最近七天的发射和再入大气层",
    "calendar": "日历",
    "calendarTitle": "把“{title}”加入你的日历：下载一个 .ics 文件",
    "calendarSaved": "已保存 {file}",
    "calendarFailed": "无法生成日历文件",
    "sameName": "{name}（{id}）",
    "title": "即将发生",
    "showAll": "显示全部 {n} 项",
    "showFewer": "收起",
    "now": "此刻前后",
    "inMinutes": "{n} 分钟后",
    "inHours": "{n} 小时后",
    "todayAt": "今天 {time}",
    "tomorrowAt": "明天 {time}",
    "launch": "{name} 将在{when}升空",
    "launchRough": "{name} 大约在{when}升空，具体日期还没有定下来",
    "approach": "{name} 将在{when}飞过地球，距离是月球距离的 {ld} 倍",
    "approachNoDistance": "{name} 将在{when}飞过地球",
    "sizeM": "它的直径是 {n} 米",
    "sizeKm": "它的直径是 {n} 公里",
    "sizeRangeM": "直径大约 {lo} 到 {hi} 米，是根据亮度估计的",
    "sizeRangeKm": "直径大约 {lo} 到 {hi} 公里，是根据亮度估计的",
    "sizeMixed": "直径大约 {lo} 米到 {hi} 公里，是根据亮度估计的",
    "perihelion": "{name} 将在{when}到达离太阳最近的位置",
    "pass": "{name} 将在{when}从你头顶飞过",
    "train": "一列共 {n} 颗的卫星将在{when}从你头顶飞过",
    "aurora": "NOAA 预报{word}，自{when}起（Kp {kp}）",
    "auroraNow": "地磁暴正在进行：{word}（Kp {kp}）",
    "shower": "{name}流星雨大约在 {date} 达到极大，在黑暗的天空下每小时最多 {zhr} 颗",
    "showerMoon": "{name}流星雨大约在 {date} 达到极大，在黑暗的天空下每小时最多 {zhr} 颗；那天夜里月亮亮面占 {pct}%",
    "showerNoMoon": "{name}流星雨大约在 {date} 达到极大，在黑暗的天空下每小时最多 {zhr} 颗；那天夜里几乎是新月",
    "radiantHigh": "从你所在的地方看，它的辐射点大约在 {time} 升到最高",
    "radiantLow": "从你所在的地方看，它的辐射点整夜都很低，所以能看到的会少得多",
    "radiantNeverUp": "从你所在的地方看，那天夜里它的辐射点一直在地平线以下",
    "eclipseKinds": {
      "total": "全食",
      "annular": "环食",
      "partial": "偏食",
      "hybrid": "全环食",
      "penumbral": "半影食"
    },
    "solarEclipseTitle": "日{kind}",
    "lunarEclipseTitle": "月{kind}",
    "solarEclipse": "{date}的日{kind}：月影最深处{where}",
    "solarEclipseGrazing": "{date}的日{kind}，只有在极北或极南的地方才看得到",
    "lunarEclipse": "{date}的月{kind}，所有能看到月亮的人，都会看到它走进地球的影子",
    "lunarEclipsePenumbral": "{date}的月{kind}：月亮只是稍微暗一点，因为它进入的是地球影子的外围",
    "seasonTitles": {
      "march": "三月春分",
      "june": "六月夏至",
      "september": "九月秋分",
      "december": "十二月冬至"
    },
    "seasons": {
      "march": "{date}三月春分：各地昼夜几乎一样长",
      "june": "{date}六月夏至：北半球白昼最长，南半球白昼最短",
      "september": "{date}九月秋分：各地昼夜几乎一样长",
      "december": "{date}十二月冬至：南半球白昼最长，北半球白昼最短"
    },
    "solstice": "{date}{title}",
    "equinox": "{date}{title}",
    "eclipseNear": "在{city}附近",
    "eclipseFrom": "距{city}约 {km} 公里",
    "eclipseLocal": "从你所在的地方看：{begin}开始，{peak}最深，太阳被遮住 {pct}%，{end}结束",
    "eclipseLocalTotal": "从你所在的地方看：{begin}开始，{peak}全食，{end}结束",
    "eclipseNotVisible": "你所在的地方看不到",
    "eclipseBelowHorizon": "从你所在的地方看，发生的时候太阳在地平线以下",
    "classOf": {
      "launch": "这是计划：发射方瞄准的时间，可能会变",
      "approach": "由 NASA JPL 根据小行星实测的轨道推算",
      "perihelion": "根据彗星已发布的轨道推算",
      "shower": "按每年的惯例日期；极大时刻会前后差大约一天",
      "aurora": "NOAA 的预报，每次预报三小时",
      "auroraNow": "NOAA 在最近几小时内实测",
      "pass": "在这里用{age}实测的轨道根数推算",
      "passNoAge": "在这里用轨道根数推算",
      "eclipse": "在这里根据太阳和月球的运动推算，精确到分钟",
      "season": "在这里根据太阳所在的位置推算，精确到分钟",
      "conjunction": "在这里按你所在的地点推算：取两者都在夜空中、离得最近的时刻"
    },
    "row": {
      "conjunctionTitle": "{a}和{b}",
      "conjunction": "{when} · 相距 {sep}°，在{dir}方的{height}",
      "conjunctionValue": "{sep}°",
      "low": "低空",
      "mid": "半空",
      "high": "高空",
      "launch": "{when}升空 · 计划",
      "launchRough": "大约{when} · 日期未定",
      "approach": "{when}飞过地球",
      "approachValue": "月距的 {ld} 倍",
      "approachSized": "{when}飞过地球 · {size}",
      "sizeM": "{n} 米",
      "sizeKm": "{n} 公里",
      "sizeRangeM": "约 {lo} 到 {hi} 米",
      "sizeRangeKm": "约 {lo} 到 {hi} 公里",
      "perihelion": "{when}离太阳最近",
      "pass": "{when}从你头顶飞过",
      "trainTitle": "{n} 颗 Starlink 列车",
      "auroraTitle": "极光预报",
      "auroraNowTitle": "此刻的地磁暴",
      "aurora": "NOAA 预报，自{when}起",
      "auroraNow": "NOAA 在最近几小时内实测",
      "kp": "Kp {kp}",
      "showerTitle": "{name}流星",
      "shower": "大约 {date} 达到极大 · 每小时最多 {zhr} 颗",
      "eclipse": "{date} · 精确到分钟的推算",
      "eclipseHere": "{date} · 在这里 {begin} 到 {end}",
      "eclipseNotHere": "{date} · 这里看不到"
    },
    "none": "已加载的内容里，没有即将发生的事。",
    "notLoaded": "还没有加载，所以没有列出：{layers}。"
  },
  "groundTrack": {
    "tick": "+{n} 分钟",
    "label": "跟随它",
    "rideAlong": "随它同行",
    "rideAlongTitle": "把镜头放在它的正后方，沿着它的轨迹向前看。拖动即可停止。",
    "lookBeside": "从它的旁边看",
    "showTrack": "画出它的星下点轨迹",
    "hideTrack": "隐藏它的星下点轨迹",
    "highNote": "它在这么高的地方，轨迹不会自动画出来：它几乎不动。",
    "trackNote": "地球上的这条线，是它正下方的地面：向后 45 分钟（虚线），向前 90 分钟，每 5 分钟一个刻度。"
  },
  "spaceWeather": {
    "level": "Kp {kp}，{word}",
    "levelWithScale": "Kp {kp}，{word}（{scale}）",
    "measured": "空间天气：{level}——{age}实测，{via}。",
    "forecastOnly": "空间天气：{level}——这是预报，不是实测；{via}。",
    "stale": "这个读数比 NOAA 承诺的更旧，只能当作猜测。",
    "stormComing": "NOAA 预报它会升到 Kp {kp}。",
    "couldNotLook": "空间天气：读取不到——{why}",
    "couldNotLook0": "空间天气：读取不到。",
    "justNow": "刚刚",
    "currentBin": "当前这三小时时段内",
    "aMinuteAgo": "1 分钟前",
    "minutesAgo": "{n} 分钟前",
    "anHourAgo": "1 小时前",
    "hoursAgo": "{n} 小时前",
    "aDayAgo": "1 天前",
    "daysAgo": "{n} 天前",
    "ageUnknown": "在 NOAA 没有说明的时间",
    "viaLive": "NOAA SWPC，实时读取",
    "viaSnapshot": "NOAA SWPC，来自我们保存的副本",
    "words": {
      "unknown": "没有读数",
      "quiet": "平静",
      "unsettled": "不稳定",
      "active": "活跃",
      "minorStorm": "小型磁暴——极北和极南地区可能出现极光",
      "moderateStorm": "中等磁暴——高纬度地区很可能出现极光",
      "strongStorm": "强磁暴——离两极很远的地方也能看到极光，卫星会被推离轨道",
      "severeStorm": "严重磁暴",
      "extremeStorm": "极端磁暴"
    }
  },
  "chooser": {
    "label": "你手指下的天体",
    "hint": "这里有 {n} 个。点一个，或者点天空关闭。"
  },
  "card": {
    "photoCredit": "{credit} · {licence}",
    "close": "关闭",
    "closeTitle": "关闭这张卡片（Esc）",
    "it": "它",
    "articles": [
      "\u200b",
      "\u200b"
    ],
    "leadVerbs": [
      "是",
      "曾是"
    ],
    "makeCentre": "把 {name} 设为地图中心",
    "isCentre": "这里是地图的中心",
    "centreShort": "以此为地图中心",
    "ownPage": "专属页面",
    "ownPageTitle": "一个关于它的页面，可以直接链接，在新标签页中打开",
    "isCentreShort": "已居中",
    "comparisonsLabel": "帮你感受一下",
    "rightNowLabel": "此刻",
    "seeItLabel": "从这里观看",
    "actionsLabel": "你可以做什么",
    "unknownName": "未命名的天体",
    "unknownKind": "{name} 在地图上，但我们不知道它是哪一类天体",
    "rows": {
      "altitude": "离地高度",
      "speed": "速度",
      "groundPoint": "正飞过",
      "below": "它此刻的正下方",
      "fromYou": "离你的距离",
      "fromGuess": "离{place}的距离（我们猜测的你的位置）",
      "distanceFromEarth": "离地球的距离",
      "distanceFromSun": "离太阳的距离",
      "lightLeft": "它的光出发于",
      "sunlight": "此刻它",
      "hostStar": "它的恒星",
      "across": "直径",
      "mass": "质量",
      "spin": "自转一圈需要",
      "source": "读取自",
      "whySource": "我们为什么知道它，读取自",
      "widthSource": "宽度读取自",
      "distanceNote": "大约就是这么远",
      "objectType": "它是什么",
      "constellation": "星座",
      "distanceRange": "距离（最佳估计）",
      "planetRadius": "宽度（以地球为单位）",
      "planetMass": "质量（以地球为单位）",
      "yearLength": "那里的一年",
      "found": "发现于",
      "catalogueCopy": "星表原文",
      "spectralType": "恒星类型",
      "brightness": "看起来有多亮",
      "luminosity": "发光强度",
      "starWidth": "直径",
      "catalogue": "星表",
      "iauName": "IAU 批准的名称",
      "lightTime": "无线电单程时间",
      "nextPass": "下次从你头顶飞过",
      "crew": "船上的人",
      "operator": "运营方",
      "launched": "发射时间",
      "ended": "结束时间",
      "pathEnds": "轨迹结束于",
      "pathBegins": "轨迹开始于",
      "period": "绕一圈需要",
      "location": "所在位置",
      "onBody": "位于",
      "whenSite": "时间",
      "onWorld": "站在",
      "orbiting": "绕着谁运行",
      "heightAbove": "{world}上空高度",
      "closestApproach": "离地球最近",
      "moons": "卫星",
      "perihelion": "离太阳最近",
      "magnitude": "亮度",
      "phase": "月相",
      "liftoff": "升空",
      "pad": "发射场",
      "destination": "目的地",
      "whereabouts": "它在哪里",
      "lastSeen": "最后一次已知",
      "stormNow": "最新通报时",
      "stormWind": "路径上的最大风速",
      "stormAdvisory": "最新通报",
      "stormCentre": "风暴中心",
      "stormAgency": "通报机构",
      "stormAlert": "GDACS 警报级别"
    },
    "values": {
      "km": "{n} 公里",
      "kmh": "{n} 公里/时",
      "belowBorder": "在{a}和{b}的边境附近",
      "belowLand": "陆地",
      "belowWater": "开阔水域",
      "stormWind": "{n} 公里/时，含预报值",
      "stormWindCategory": "{n} 公里/时，{cat} 级，含预报值",
      "stormAdvisory": "{time} UTC，{ago}",
      "stormAdvisoryDated": "{date} {time} UTC，{ago}",
      "stormStatus": {
        "hurricane": "飓风强度",
        "typhoon": "台风强度",
        "cyclone": "气旋强度",
        "storm": "热带风暴",
        "depression": "热带低压"
      },
      "stormAlert": {
        "green": "绿色",
        "orange": "橙色",
        "red": "红色"
      },
      "launchedAgo": "{n} 天前，{date}",
      "au": "{n} 天文单位",
      "lightYears": "{n} 光年",
      "inSunlight": "在阳光下",
      "inShadow": "在地球的阴影里",
      "yearsAgo": "{n} 年前",
      "monthsAgo": "{n} 个月前",
      "suns": "太阳的 {n} 倍",
      "sunsWide": "太阳的 {n} 倍（估计值）",
      "sunsWideMeasured": "太阳的 {n} 倍（实测）",
      "earths": "地球的 {n} 倍",
      "lightYearsRange": "{lo} 到 {hi} 光年",
      "kmRange": "{lo} 到 {hi} 公里",
      "noMoonsKnown": "目前没有发现",
      "sunsRange": "太阳的 {lo} 到 {hi} 倍",
      "millionSuns": "{n} 百万个太阳",
      "billionSuns": "{n} 十亿个太阳",
      "milliseconds": "{n} 毫秒",
      "billionYearsAgo": "{n} 十亿年前",
      "millionYearsAgo": "{n} 百万年前",
      "days": "{n} 天",
      "hours": "{n} 小时",
      "yearByMethod": "{year} 年，{method}",
      "asOf": "截至 {date}",
      "magnitude": "星等 {n}",
      "lunar": "月球距离的 {n} 倍",
      "minutes": "{n} 分钟",
      "seconds": "{n} 秒",
      "degrees": "{n}°",
      "people": "{n}",
      "latLon": "{lat}，{lon}",
      "latLonOn": "{world}上的 {lat}，{lon}",
      "north": "北纬 {n}°",
      "south": "南纬 {n}°",
      "east": "东经 {n}°",
      "west": "西经 {n}°"
    },
    "couldNotLook": "无法算出",
    "nobodyKnows": "没有人知道",
    "wouldNeed": "那需要 {wouldNeed}。",
    "endedLine": "它的任务已于 {date} 结束。下面列出的事件，都可以追溯到那时。",
    "pathEndedLine": "JPL 保存的它的轨迹，到 {date} 为止。下面列出的事件，都可以追溯到那时。",
    "pathBeginsLine": "JPL 保存的它的轨迹，从 {date} 开始。下面列出的事件，都可以追溯到那时。",
    "actions": {
      "flyTo": "飞向它",
      "flyToTitle": "把镜头移到这个天体",
      "flyEnded": "它已于 {date} 结束。选一个任务事件，前往那里",
      "flyPathEnded": "它的轨迹到 {date} 为止。选一个任务事件，前往那里",
      "flyPathBegins": "它的轨迹从 {date} 开始。选一个任务事件，前往那里",
      "flyNowhere": "这一刻没有这个天体的位置",
      "seeFromHere": "从这里观看",
      "seeFromHereTitle": "从你在地球上的位置抬头看",
      "follow": "跟随",
      "followTitle": "飞向它，并让它保持在画面中央",
      "ride": "随它同行",
      "rideShort": "同行",
      "seeShort": "观看",
      "postcard": "明信片",
      "share": "分享"
    },
    "micro": "{klass} · {regime}",
    "microKlass": {
      "planet": "行星",
      "moon": "卫星",
      "dwarf": "矮行星",
      "ourStar": "恒星",
      "exoplanet": "系外行星"
    },
    "regime": {
      "leo": "近地轨道",
      "meo": "中地球轨道",
      "geo": "地球静止轨道",
      "heo": "高地球轨道",
      "inner": "内太阳系",
      "outer": "外太阳系",
      "belt": "小行星带",
      "beyondNeptune": "海王星之外",
      "round": "环绕{world}",
      "inCon": "在{con}",
      "onWorld": "在{world}上",
      "centre": "太阳系的中心",
      "nearby": "离我们最近的几颗之一"
    },
    "hero": {
      "label": "三个数字",
      "missing": "—",
      "captions": {
        "altitude": "高 {u}",
        "away": "距离 {u}",
        "speed": "{u}",
        "period": "每圈 {u}",
        "distanceFromSun": "距太阳 {u}",
        "distanceFromEarth": "距地球 {u}",
        "lightTime": "单程 {u}",
        "spin": "每转一圈 {u}",
        "yearLength": "一年 {u}",
        "brightness": "星等",
        "spectralType": "恒星类型",
        "across": "直径 {u}",
        "lightLeft": "距离 {u}",
        "launched": "在太空的天数",
        "fromYou": "距你 {u}",
        "heightAbove": "高 {u}",
        "yearLong": "绕太阳一圈 {u}，合 {y} 个地球年",
        "lightFromSun": "{u} 光才到达我们",
        "planetRadius": "宽度 {u}",
        "planetMass": "质量 {u}",
        "mass": "质量，单位 {u}",
        "other": "{u}"
      },
      "starClass": {
        "line": "{temp}{size}",
        "temp": { "O": "蓝色", "B": "蓝白色", "A": "白色", "F": "黄白色", "G": "黄色", "K": "橙色", "M": "红色" },
        "size": { "V": "中年恒星", "IV": "亚巨星", "III": "巨星", "II": "亮巨星", "I": "超巨星", "VI": "亚矮星", "none": "恒星" },
        "brownDwarf": "褐矮星",
        "whiteDwarf": "白矮星",
      },
      "units": {
        "minutes": "分钟",
        "hours": "小时",
        "days": "天",
        "seconds": "秒",
        "milliseconds": "毫秒",
        "astronomical units": "AU",
        "light-years": "光年",
        "years ago": "光年",
        "million years ago": "百万光年",
        "billion years ago": "十亿光年",
        "months ago": "光月"
      }
    },
    "sections": {
      "label": "更多信息",
      "see": "什么时候能看到",
      "path": "它的轨迹",
      "aboard": "船上有谁",
      "ridingOn": "它搭乘的载体",
      "about": "关于它",
      "sources": "这条记录的来源",
      "placeGuessed": "地点是猜的",
      "needsPlace": "需要你的位置",
      "passAt": "{time} UTC"
    }
  },
  "sun": {
    "spots": "地图上画出了 {n} 个太阳黑子群，来自 NOAA {date} 的清单：每个都画成一个圆形黑子，位置和大小按报告的数据，并按太阳自那以后的自转转到了现在的位置。",
    "spotsOne": "地图上画出了一个太阳黑子群，来自 NOAA {date} 的清单：画成一个圆形黑子，位置和大小按报告的数据，并按太阳自那以后的自转转到了现在的位置。",
    "spotsPaired": "地图上画出了 {n} 个太阳黑子群，来自 NOAA {date} 的清单，并按太阳自那以后的自转转到了现在的位置。其中 {pairs} 个有多个黑子的群，画成西边一个前导黑子、东边一个后随黑子；两者的间距，以及面积怎样分给两者，都是示意的。其余的各画成一个圆形黑子。",
    "spotsPairedOne": "地图上画出了一个太阳黑子群，来自 NOAA {date} 的清单，并按太阳自那以后的自转转到了现在的位置：画成西边一个前导黑子、东边一个后随黑子。两者的间距，以及面积怎样分给两者，都是示意的。",
    "regionsCredit": "今日的太阳黑子群：NOAA 空间天气预报中心，太阳活动区摘要",
    "flaresCredit": "太阳耀斑：NOAA 空间天气预报中心，经编辑的事件列表",
    "cmeCredit": "日冕物质抛射：NASA DONKI（月球到火星空间天气分析办公室和 CCMC）"
  },
  "clouds": {
    "live": "云：{when}（{ago}）由 {satellites} 以红外拍摄，经 NASA GIBS 获取。最冷的云顶是雷暴所在的地方，画得比其他部分更高、更白。欧洲、非洲、印度洋和两极上空，这些卫星都看不到，那里的云是示意的。",
    "at": "于 {time} UTC",
    "between": "于 {from} 到 {to} UTC 之间",
    "atDated": "于 {date} {time} UTC",
    "betweenDated": "于 {date} {from} 到 {to} UTC 之间",
    "clockElsewhere": "时钟现在是 {date} {time} UTC；云仍然是那张图拍到的样子。",
    "and": "和",
    "illustrative": "云：示意。这是过去某一天的一张图，缓缓漂移；它不是今天的天气。",
    "illustrativeSaveData": "云：示意。开启了省流量的网络下，不会获取今天的卫星图。",
    "illustrativeScrubbed": "云：示意，因为时钟离最新的卫星图（{date} {time} UTC）超过了 12 小时。",
    "gibsAcknowledgement": "感谢 NASA 全球影像浏览服务（GIBS）提供的影像。GIBS 是 NASA 地球科学数据与信息系统（ESDIS）的一部分。",
    "satelliteCredit": "实时云图：GOES-East 和 GOES-West 红外影像，NOAA；Himawari 红外影像，日本气象厅（JMA）。"
  },
  "aurora": {
    "live": "极光：NOAA 的 OVATION 模型预计未来一小时极光会出现的地方（它对 {time} UTC 的预报，{ago}发布），不是照片。其中细小的褶皱是画出来的。",
    "liveNoFolds": "极光：NOAA 的 OVATION 模型预计未来一小时极光会出现的地方（它对 {time} UTC 的预报，{ago}发布），不是照片。",
    "waiting": "极光：NOAA 的预报还没有送到。",
    "failed": "极光：暂时读取不到 NOAA 的预报，所以没有画出极光。",
    "far": "极光：没有画出，因为时钟离 NOAA 最新的预报超过了三小时。",
    "saveData": "极光：开启了省流量的网络下，不会获取 NOAA 的预报。",
    "switchedOff": "极光：已在图层里关闭。",
    "credit": "极光：由 NOAA 空间天气预报中心的 OVATION Prime 模型预报（公有领域）。",
    "rightNow": "两极附近很可能有极光",
    "rightNowReach": "纬度 {lat}° 以内很可能有极光",
    "rightNowValue": "Kp {kp}",
    "showMe": "飞向夜半球的极光"
  },
  "weather": {
    "lightning": {
      "live": "闪电：在 NOAA 地图覆盖的美洲和太平洋一带，每分钟大约有 {n} 次落雷（统计到 {time}，{ago}）。出现的地点和频率是实测的；每次闪光的瞬间是画出来的，而且画得比实际更大。",
      "quiet": "闪电：在 NOAA 地图覆盖的美洲和太平洋一带，几乎没有（统计到 {time}，{ago}）。",
      "waiting": "闪电：NOAA 的地图还没有送到。",
      "failed": "闪电：暂时读取不到 NOAA 的地图，所以没有画出闪电。",
      "away": "闪电：没有画出，因为时钟离 NOAA 最新的地图超过了一小时。",
      "off": "闪电：这台设备或这个网络下不会获取。",
      "reducedMotion": "闪电：没有画出，因为这台设备要求减少动态效果。",
      "switchedOff": "闪电：已在图层里关闭。",
      "credit": "闪电：落雷密度来自 NOAA nowCOAST，由美国国家气象局海洋预报中心根据地面监测网 NLDN 和 GLD360 制作（公有领域）。"
    },
    "worlds": {
      "jupiter": "天气：云带按 Hubble 测得的风速相互滑过，大红斑在旋转。这是模拟的运动：今天云在哪里，并没有画出来。",
      "saturn": "天气：云带按 Cassini 实测的风速运动。这是模拟的运动，不是今天的云。北极的六边形画在它实测的位置；它的样子是示意的。",
      "venus": "天气：云层大约四天绕一圈，这是 Venus Express 测得的，比地面转得快六十倍。这是模拟的运动，不是今天的云。",
      "uranus": "天气：大气按 Keck 和 Gemini 望远镜测得的风速绕着行星漂移。这是模拟的运动，不是今天的云。",
      "neptune": "天气：大气按 Voyager 2测得的风速呼啸着绕行，是所有行星里最快的。这是模拟的运动，不是今天的云。",
      "mars": "天气：火星现在是{season}。冰冠和空气中的尘埃（光学厚度接近 {tau}），是这个季节通常的样子：这是季节性的、示意的，不是今天的天气。",
      "titan": "天气：北部那些浅色的条纹，代表 Webb 和 Keck 望远镜在 2022 年 11 月和 2023 年 7 月看到的甲烷云。这是示意的：土卫六今天的云在哪里，并不知道。"
    },
    "also": {
      "venus": "跟着一起转的那个暗色的 Y，是紫外相机看到的样子；用眼睛看，金星几乎一片素净，所以它在这里的位置是示意的。金星上有过闪电的报告，但仍有争议，所以没有画闪电。",
      "uranus": "北极上方明亮的极冠是真实的：它逐个纬度的亮度和颜色，取自 Hubble 2025 年 10 月的地图；随着 2028 年北半球夏季临近，Hubble 看着它一年比一年亮。",
      "neptune": "艺术图上那个暗色椭圆，是 Voyager 2 1989 年看到的大暗斑，到 1994 年已经消失：这是示意的，在“实测”外观里不画。在“电影”外观里，甲烷卷云会投下影子，画得比实测宽六倍、高六倍；每一道条纹都是我们画的。"
    },
    "flashes": {
      "jupiter": "在它的夜面，偶尔闪现的亮光代表 Juno 发现的闪电，大多在遥远的北方：纬度是实测的，每一次闪光是示意的，而且画得比实际更大。",
      "saturn": "在它的夜面，南纬 36 度偶尔闪现的亮光，代表 Cassini 2009 年在那里拍到的闪电：这是示意的，画得比实际更大，而现在没有任何设备在监测它。"
    },
    "seasons": [
      "北半球的春天",
      "北半球的夏天",
      "北半球的秋天",
      "北半球的冬天"
    ]
  },
  "drawing": {
    "orbitLine": "这条线是前方的一圈轨道，和圆点用同样的轨道根数推算。",
    "orbitLineYear": "这条线是它未来一年的轨迹，和圆点用同样的轨道根数推算。",
    "orbitLineWhole": "这条线是它绕太阳的整条轨道，和圆点用同样的轨道根数推算。",
    "orbitLinePassage": "这条线是它穿过太阳系的这一趟，一进一出，和圆点用同样的轨道根数推算。",
    "variant": "按已公布的 {name} 尺寸绘制",
    "family": "画成了 {name}——是同一系列的外形和高度，并非这个确切的型号",
    "generic": "画成了一枚普通的火箭；我们没有 {name} 的尺寸",
    "genericUnnamed": "画成了一枚普通的火箭；我们没有这型火箭的尺寸",
    "disputed": "各来源对它的高度说法不一（{disputed}）",
    "objectVariant": "按已公布的 {name} 尺寸绘制",
    "objectModel": "按已公布的 {name} 模型绘制",
    "padEmpty": "发射台是实测的地点；只有在列出的发射前后，{name} 才会画在上面",
    "objectMapped": {
      "dawn": "它的表面是 Dawn 拍的黑白镶嵌图，上了一层我们选的灰色；陨石坑里的阴影是 Dawn 拍到的，在这里不会随太阳移动"
    },
    "objectFamily": "画成了 {name}——是这一类东西的样子，并非这一个",
    // b200-m2-buses: begin
    "objectBus": "平台：{bus}（{source}）。画成了替代平台的样子。",
    // b200-m2-buses: end
    "objectOwn": "画成了 {name}",
    "objectMade": {
      "images": "外形根据照片建成；比例是近似的",
      "render": "外形根据艺术渲染图建成；比例是近似的",
      "dimensions": "外形根据已公布的尺寸和图片建成；细节做了简化",
      // b200-m4-buses: begin -- a geostationary bus built here from published sizes and the maker's renders (registry/geo-buses.yaml `made: renders`), machine-drafted
      "renders": "外形根据已公布的尺寸和制造商的渲染图建成；细节为估计"
      // b200-m4-buses: end
    },
    "objectWas": {
      "hitomi": "画的是 2016 年 2 月发射时完整的样子；五周后它解体了，这里追踪的是它没有太阳能板的主体",
      "envisat": "画成平稳的样子，仪器朝向地球，就像它工作时飞行的姿态；它自 2012 年起就失去联系，没有人再操控它",
      "ers1": "画成平稳的样子，仪器朝向地球，就像它工作时飞行的姿态；它的任务在 2000 年结束，没有人再操控它"
    },
    "objectGeneric": "画成了一个普通的天体；我们没有 {name} 的外形",
    "classShape": {
      "satellite": "一颗普通的卫星",
      "station": "一座普通的空间站",
      "debris": "一块碎片",
      "rocket": "一枚普通的火箭",
      "probe": "一个普通的探测器",
      "telescope": "一台普通的望远镜",
      "asteroid": "一颗普通的小行星",
      "dwarf": "一个朴素的圆球，大小就是实测的大小",
      "comet": "一颗普通的彗星",
      "site": "一个普通的地面站点",
      "star": "一个光点，大小取决于它在你那里看起来有多亮",
      "exoplanet": "恒星旁的一个标记——它的轨道实在太小，画不出来",
      "dso": "一团柔和的光晕，样子是这一类天体常见的，位于实测的距离，宽度就是实测的宽度；里面的图案是示意的，它真实的形状没有画出来",
      "exotic": "实测距离上的一个圆环；黑洞没有形状可画，脉冲星又太小",
      "exoticStar": "实测距离上的一个圆环；恒星本身在这个比例下只是一个点"
    },
    "storm": "画成风暴中心的一个标记；风暴本身是它周围的云",
    "feature": "一个有名字的地方：这里只在它的中心画了一个标记，位置取自所引用的参考资料；它下面的地面就是地图本身",
    "markOnly": "在它的位置画了一个标记；那里没有什么东西可以画",
    "noPlace": "没有画出：它没有可以标记的位置",
    "shower": "在流星看起来飞来的那个点写上名字，在接近极大时的天空视图里显示；这是一个方向，不是太空中的某个地点",
    "objectSpin": {
      "spin": "它绕着实测的自转轴，按实测的速率转动；这一刻哪一面朝着太阳，并不是预测",
      "pair": "两颗都绕着实测的自转轴、按实测的速率转动；Dimorphos 按 DART 撞击之后测得的距离和周期绕行；它在轨道上的哪个位置是示意的",
      "comet": "它绕着实测的自转轴，按 2014 年测得的速率转动；之后每过一次近日点，太阳都会让这个速率变化几分钟；这一刻哪一面朝着太阳，并不是预测",
      "still": "它按雷达模型的朝向画出，在这里不转动：模型没有说明它的自转轴朝向哪里",
      "moonSpin": "它始终以同一面朝向土星，并绕国际天文学联合会常数给出的极轴每绕行一圈自转一周；此刻哪一面朝向镜头由该公式给出，不是预测",
      "moonStill": "它按其模型的朝向绘制，在这里不自转：本应用读取的常数没有给出它稳定的自转极和自转速率"
    },
    "objectSeen": {
      "lutetia": "Rosetta 拍到的照片覆盖了它一多半的表面；其余部分的形状是根据亮度变化拟合出来的，不是拍到的",
      "steins": "Rosetta 拍到的照片覆盖了它大约 60% 的表面；其余部分的形状是根据亮度变化拟合出来的，不是拍到的",
      "donj": "形状是用 Lucy 的照片，通过立体摄影测量和轮廓拟合建成的；Lucy 没有看到的那一面，是拟合出来的",
      "arrokoth": "New Horizons 的照片覆盖了它飞掠时面对的那一面；另一面是推断的，不是拍到的，颜色是它的反照率图染上红色调",
      "radar": "形状是用雷达回波建成的，不是照片：它的轮廓是实测的，最细的细节不是",
      "comet": "形状来自 Rosetta，用了两年里拍的两万多张照片，整个表面都被覆盖了",
      "cassini": "形状由 Cassini 的图像构建，不确定度通常远小于半公里；Cassini 没有看到的部分来自拟合，不是拍摄所得"
    },
    "objectRelief": "模型做了简化，上面细小的起伏来自完整的模型，已经做进了表面的贴图里",
    "worldFlat": "画成了一个朴素的球：这里没有 {name} 的表面地图，它的单一颜色是根据已公布的描述选的，不是实测的",
    "worldFlatIrregular": "画成了一个朴素的球，大小是它的平均半径：这里没有 {name} 的表面地图，它的单一颜色是根据已公布的描述选的，不是实测的；{name} 其实是一块凹凸不平的岩石，它真实的形状没有画出来",
    "worldFlatShaped": "按实测的形状、用单一颜色画出：这里没有 {name} 的表面地图，颜色是根据已公布的描述选的，不是实测的",
    "worldShaped": "按实测的形状绘制",
    "worldMap": {
      "tinted": "它的表面是一张黑白镶嵌图，上了根据已公布的描述选的颜色",
      "toned": "它的颜色来自红外、绿光和紫外的照片，已向肉眼会看到的样子调淡",
      "redblue": "它的颜色来自 New Horizons 的红光和蓝光照片，绿色取两者的中间值，再把颜色加强一半；只拍到黑白照片的部分，用地图的平均颜色",
      "enhanced": "它的颜色是 NASA 公布的那一版，由 New Horizons 的三种彩色滤镜合成，其中没有绿色：这是增强的颜色，比肉眼看到的更浓，和肉眼看到的并不一样",
      "balanced": "它的颜色来自橙光、绿光和蓝光的照片，已调整到它已公布的颜色，并向肉眼会看到的样子调淡",
      "infrared": "它的表面是一张穿透雾霾拍摄的近红外地图，上了色并做了柔化；在可见光下，雾霾把地面遮住了",
      "natural": "它的颜色是自然色，来自 New Horizons 彩色相机测得的红光和蓝光；绿光没有对应的滤镜，是在两者之间估计的，并加强到相机自己数值的两倍半，和 NASA 的自然色照片呈现的一样",
      "matched": "它的颜色从 New Horizons 彩色相机测得的红光和蓝光出发；绿光没有对应的滤镜，是在两者之间估计的；然后逐个色调对照 NASA 自己发布的这一面的彩色照片（PIA19952），比相机的数值更浓，和 NASA 发布的一样"
    },
    "worldCoverage": {
      "miranda": "只有南半球拍到了，是 Voyager 2在 1986 年拍的；其余部分留作素面，没有去猜",
      "ariel": "只有南半球拍到了，是 Voyager 2在 1986 年拍的；其余部分留作素面，没有去猜",
      "umbriel": "只有南半球拍到了，是 Voyager 2在 1986 年拍的；其余部分留作素面，没有去猜",
      "titania": "只有南半球拍到了，是 Voyager 2在 1986 年拍的；其余部分留作素面，没有去猜",
      "oberon": "只有南半球拍到了，是 Voyager 2在 1986 年拍的；其余部分留作素面，没有去猜",
      "triton": "Voyager 2在 1989 年拍到了其中一部分；其余部分留作素面，没有去猜",
      "pluto": "2015 年 New Horizons 飞过时，遥远的南方正处在冬季的黑暗里：那里画出的地面是模拟的，是一层淡淡的纹理，用的是它上方陆地的颜色，不是照片",
      "charon": "2015 年 New Horizons 飞过时，遥远的南方正处在冬季的黑暗里：那里画出的地面是模拟的，是一层淡淡的纹理，用的是它上方陆地的颜色，不是照片"
    },
    "worldLit": "打光的方式，就像一台按它自己的阳光曝光的相机拍出来的效果",
    "worldLight": "从很远的地方看，它是一个光点，亮度是推算出来的：光晕是相机记录一个亮得分辨不出形状的点时的样子",
    "exoticDeparture": {
      "pulseSlowed": "它的闪烁画得比它自转慢 {n} 倍，这样眼睛才跟得上",
      "pulseTrue": "它的闪烁按它自转的速率画出",
      "portrait": "这张卡片打开时，它的位置上会画出一个它的模型，比从这里看到的大得多：阴影和被它弯折的光，按它的质量产生的效果画出，圆盘是模拟的"
    },
    "worldDeparture": {
      "earth": "在较大的屏幕上，它的山脉取自 NOAA 的 ETOPO 2022 高程数据，画得比实际陡 {relief} 倍，这样低角度的太阳才能照出它们；它边缘大气的光晕，画得比实际的大气高 {air} 倍；在较大的屏幕上从近地轨道看，它的云朝地平线竖起，并在低角度的太阳下伸展，画得比实际厚 {clouds} 倍，这样才能看出它们的倾斜、长长的影子和云顶上最后的光（在“实测”外观里按真实厚度画）；每个云顶的高度，在今天的卫星图覆盖的地方由实测温度得出，其他地方由云图的亮度得出",
      "mercury": "在较大的屏幕上，它的起伏取自 MESSENGER 的高程模型，画得比实测陡 {steep} 倍，这样环形山的边缘才能受光",
      "pluto": "它明暗不同的地面，对比度画成了相机照片的 {plutoContrast} 倍，更接近实测的反照率；New Horizons 只在远处见过的那一面，柔化到与它自己的清晰度相当；在较大的屏幕上，它的起伏取自 New Horizons 的立体高程（有数据的地方），画得比实测陡 {plutoSteep} 倍；它边缘那层淡蓝色的雾霾画成了光晕，在迎着太阳的一侧最亮，强度是我们选的",
      "mars": "在较大的屏幕上，它的起伏取自 Mars Global Surveyor 的激光高度计测得的高程，画得比实际陡、比实际高 {mola} 倍，这样低角度的太阳才能照出它们：奥林帕斯山和峡谷峭壁投下的影子，也因此长了这么多倍。",
      "venus": "它边缘和白昼面外侧的光晕，代表一层深厚的雾霾；画得多厚、伸得多远，都是示意的；在“电影”外观里，它的云带画成了地图对比度的 {uv} 倍，就像紫外相机看到的那样（肉眼看到的几乎一片素净），而“实测”外观按地图原样显示；它的地面是雷达测出的，起伏取自 Magellan 的高度计，画得比实测陡、比实测高 {ground} 倍",
      "neptune": "在“电影”外观里，它外环的五段弧，画成 Voyager 2 1989 年看到的样子，按实测的速度绕行；它们今天在环上的哪个位置并没有推算，而且其中两段后来已经变暗或移动了",
      "saturn": "它的云带画成了地图对比度的 {contrast} 倍，这是我们做的调整；“Hubble 眼中的样子”没有调整；在较大的屏幕上从近处看，光环里的细环和缝隙，在 Cassini 2008 年借恒星的光测出的位置上，叠在地图上方，在“电影”外观里，更近处还画出了颗粒的闪光；在较大的屏幕上、“电影”外观里，离光环几公里以内时，最大的颗粒（宽两到五米）画成冰球：有多少、多大，依据实测的大小分布和光环的光学厚度，但每一颗在哪里、A 环里的成团结构，都是示意的，而且画成静止的，就像你跟着它们一起飞行",
      "titan": "在它的雾霾上方约 500 公里处，按 Cassini 2005 年到 2007 年看到的位置，画了一层稀薄的、分离的雾霾；之后几年它下沉、变淡了，现在它在哪里并不知道"
    },
    "worldEarthshine": "它的暗面泛着地球反照的微光，也就是地球自己的光，画得比那台相机能拍到的亮 {n} 倍，大致是肉眼看到的样子",
    "worldAir": "它的大气画得比实际厚 {n} 倍，这样在这个大小下才看得见；雾霾的颜色是示意的",
    "worldAirTrue": "它的雾霾按实测的高度画出，颜色是示意的",
    "worldRings": "它的光环在实测的距离上，画得宽了 {w} 倍，也亮得多，这样才看得见：真实的光环是像木炭一样暗的细线",
    "worldRingsDense": "它的光环在实测的距离上，画得宽了 {w} 倍、不透明了 {d} 倍，也亮得多，这样才看得见：真实的光环是像木炭一样暗的淡淡的细线",
    "worldSun": "靠近看，它的边缘会变暗、变红，这是大气模型算出的效果；颗粒状的纹理代表它翻腾的表面：这些米粒组织像真实的米粒一样诞生、变亮、消失，但画得比实际粗（从很近的地方看才降到真实大小），也快得多，而靠近边缘的明亮网络是示意的；从很近的地方看，拍到的地图会让位给画出来的表面，那个表面也是示意的；日冕是示意的，画得比实际亮得多，这样才看得见；边缘上的圈和篱笆般的结构，出现在 NOAA 的活动区靠近日面边缘的地方，它们的形状和高度是示意的；它旁边的恒星被淡化了，因为它的强光会让任何相机都拍不到它们",
    "worldMosaic": "镜头下现在是：{title}，这里大约按每像素 {res} 绘制。",
    "worldMosaicDetail": "镜头下现在是：{title}，大约按每像素 {res} 把颜色地图变得更清晰。",
    "worldRelief": "它的起伏取自 {title}：这是在一个固定光源下画出的坡度图。沿着光线方向的坡，由现在所在位置的太阳重新照亮，坡度比实测陡 {n} 倍；垂直于光线的坡没有画出。",
    "worldReliefTrue": "它的起伏取自 {title}：这是在一个固定光源下画出的坡度图。沿着光线方向的坡，由现在所在位置的太阳重新照亮；垂直于光线的坡没有画出。",
    "worldReliefBaked": "它的山丘是在固定光源下做进这张地图里的阴影，不是由现在所在位置的太阳照出来的。",
    "mount": "我们把它挂在模型上的位置，是我们自己的安排，而且画得比实际大得多——按真实大小它会小得看不见"
  },
  "trip": {
    "notEnoughStops": "这个旅程里的站点，现在只能找到 {count} 个，而它至少需要 {min} 个。",
    "heldBody": "刚才没能找到这一个。旅程里的其他部分仍然可以使用。",
    "heldTitle": "没能找到这一个",
    "stopOf": "第 {n} 站，共 {count} 站",
    "planning": "正在推算能显示什么……",
    "shape": "{count} 站 · {mins} 分钟",
    "shapeOneMinute": "{count} 站 · 1 分钟",
    "startTitle": "开始这个旅程",
    "nextEventLine": "下一个：{date}",
    "introStart": "开始",
    "introSkip": "先不了",
    "introMicro": "导览旅程",
    "stopsLabel": "站点",
    "startAtTitle": "从第 {n} 站开始旅程",
    "droppedOne": "有 1 个站点今天无法显示，没有算在上面的数目里。",
    "droppedMany": "有 {n} 个站点今天无法显示，没有算在上面的数目里。",
    "clockClamped": "时间已为这个旅程恢复到正常速度。",
    "clockMoves": "这个旅程会拨动时钟。你离开时，时钟会被放回原处。",
    "clockRestored": "离开时，时钟会回到你原来的时间。",
    "stopTimeNow": "显示的是现在",
    "stopTimeAt": "显示的时间是 {when}",
    "stopTimeRate": "显示的时间是 {when}，{rate}",
    "stopTimePaused": "显示的时间是 {when}，旅程暂停时保持不动",
    "shownAtUtc": "{when} UTC",
    "eclipseLine": "影子由月球和太阳的位置计算得出；时间来自 Astronomy Engine，精确到大约一分钟。细线和浅色的带子标出影子的边缘和中心带的路径：它们是地图上的线，不是光。",
    "eclipseLineLatched": "这台设备上没有画出影子；时间是对的。",
    "eclipseColour": "颜色是示意的；影子是计算得出的。",
    "orbitsLine": "行星画成圆点，比实际大；它们的位置和轨道是计算得出的。",
    "moonPathLine": "地球和月球画成圆点，比实际大，各自朝向太阳的一面被照亮。月球的位置和轨道是计算得出的。",
    "systemLine": "大小和轨道来自 NASA 系外行星档案；颜色和轨道的倾斜是示意的。",
    "systemLineGuessed": "大小和轨道来自 NASA 系外行星档案；颜色、行星在轨道上的位置和轨道的倾斜是示意的。",
    "systemPhaseUnknown": "、行星在轨道上的位置",
    "rateWords": {
      "10": "比真实快十倍",
      "60": "每秒一分钟",
      "600": "每秒十分钟",
      "3600": "每秒一小时",
      "36000": "每秒十小时",
      "525600": "每六分之一秒过一天"
    },
    "rateGeneric": "比真实快 {n} 倍",
    "yourPlace": "你的位置",
    "observerSet": "你的位置：{place}，是你自己设的。",
    "observerDevice": "你的位置：在你的设备所报告的位置附近。",
    "observerGuess": "你的位置是根据你时钟的时区猜的：{place}。想要更准确，请在“你的位置”里设置。",
    "needsPlace": "需要一个位置。请先设置你在哪里。",
    "stationFromYou": "此刻它离你 {km} 公里。",
    "drawnAtClassSize": "不管距离多远，模型都画成 {px} 像素宽；真实的空间站只会是一个亮点。",
    "passNight": "这一次飞越时，它被阳光照亮，背景是黑暗的天空：天气允许的话，你可以看到它。",
    "passDay": "这一次飞越你看不到：你那里的天空太亮，或者空间站在地球的阴影里。",
    "lookMoonUp": "月亮亮面占 {pct}%，在{az}方，{alt}。",
    "lookMoonDown": "这个时刻，月亮在你的地平线以下。它会在 {time} 升起。",
    "lookMoonDownNoRise": "这个时刻，月亮在你的地平线以下。",
    "lookWorldUp": "{name} 在{az}方，{alt}。",
    "lookWorldDown": "这个时刻，{name} 在你的地平线以下。",
    "lookPlanet": "这个时刻，天上最亮的行星是{name}：在{az}方，{alt}。",
    "lookNoPlanet": "这个时刻，天上没有肉眼能看到的行星。画面朝向它们将要经过的方向。",
    "lookStar": "这个时刻，天上最亮的恒星是{name}：在{az}方，{alt}。",
    "lookFigure": "这个时刻位置最好的是：{name}，在{az}方，{alt}。",
    "lookNoFigure": "这个时刻，没有一个著名的星座位置合适。",
    "lookNoPass": "未来一周内，没有找到空间站从你那里飞过的机会。",
    "lookDaylight": "这个时刻你那里的天空还不够黑，所以现在还没有什么可找的。",
    "lookMilkyWay": "画面朝向银河穿过{name}的地方，在{az}方，{alt}。这三片天空，是一个普通晴夜的模型。",
    "lookNoMilkyWay": "这个时刻，银河贴近你的地平线，所以画面改为朝向天空的高处。",
    "lookShower": "下一场流星雨是{name}，大约在 {date} 最盛。",
    "lookShowerUp": "这个时刻，它的辐射点在{az}方，{alt}。",
    "lookShowerDown": "这个时刻，它的辐射点在你的地平线以下；画面朝向它将要升起的方向。",
    "lookShowerRate": "在极大时，在辐射点很高的黑暗地方：每小时大约 {rate} 颗流星。",
    "lookShowerMoon": {
      "dark": "那天夜里月亮亮面占 {pct}%，所以天空仍然很黑。",
      "some": "那天夜里月亮亮面占 {pct}%，会遮住一部分暗的流星。",
      "bright": "那天夜里月亮亮面占 {pct}%，除了亮的，其余的都会被遮住。"
    },
    "approachNext": "NASA JPL 的表格里的下一个：{name}，在 {date}，距离是月球距离的 {ld} 倍。",
    "approachNextFar": "NASA JPL 的表格里的下一个：{name}，在 {date}。",
    "approachNone": "NASA JPL 的近距离飞掠表还没有加载，所以没有列出下一次。",
    "satellitesCount": "这个页面从 CelesTrak 加载的星表里，有 {n} 颗在工作的卫星，其中 {starlink} 颗是 Starlink。",
    "satellitesLoading": "星表还在加载；加载完成后，数目会显示出来。",
    "portraitLine": "这是模型，不是照片：阴影和绕着它弯折的光环，是它的质量造成的样子；发光的圆盘是模拟的；背景的恒星没有被弯折。它画得比从这里看到的大得多；位置是实测的。Event Horizon Telescope 的照片在它的卡片上：{credit} · {licence}。",
    "tonightUp": "今晚在{place}：从 {begin} 到 {end} 在地平线以上，{time} 最高，在{az}方，{alt}。",
    "tonightGlare": "今晚在{place}：{name} 离太阳太近，看不到。",
    "tonightDown": "今晚在{place}：天空够黑的时候，{name} 不在地平线以上。",
    "frameLabel": "导览旅程",
    "stopRole": "站点",
    "liveLabel": "第 {n} 站，共 {count} 站：{title}",
    "stopMicro": "第 {n} 站，共 {count} 站",
    "progressShort": "{n} / {count}",
    "pause": "暂停",
    "pauseTitle": "暂停（空格键）",
    "play": "播放",
    "resume": "继续",
    "resumeTitle": "飞回这一站并继续（空格键）",
    "back": "上一站",
    "backTitle": "上一站（←）",
    "next": "下一站",
    "nextTitle": "下一站（→）",
    "replay": "重播",
    "replayTitle": "把这一段再飞一遍（R）",
    "share": "分享",
    "shareTitle": "分享这一站的链接",
    "collapse": "收起卡片",
    "collapseTitle": "收起卡片，专心观看（C）",
    "expand": "显示卡片",
    "expandTitle": "把卡片调回来（C）",
    "soundOn": "声音",
    "volume": "音量",
    "volumeTitle": "音乐、音效和语音的音量",
    "volumeValue": "{pct}%",
    "voiceWill": "这里会有语音朗读。那是合成的声音。",
    "voiceCan": "可以用合成语音朗读这里：点“朗读”。",
    "soundOnTitle": "音乐和音效已开启：点击关闭（M）",
    "soundOffTitle": "音乐和音效已关闭：点击开启（M）",
    "voice": "朗读",
    "voiceOnTitle": "合成语音正在朗读每一站：点击关闭，保留音乐（V）",
    "voiceOffTitle": "让合成语音朗读每一站（V）",
    "present": "演示",
    "presentTitle": "给一屋子的人演示这个旅程：大字，没有面板，由你按“下一站”",
    "presentOffTitle": "退出演示模式，把面板调回来",
    "presentAuto": "自动播放",
    "presentAutoOffTitle": "每一站都等你按“下一站”：让旅程自己往下走（A）",
    "presentAutoOnTitle": "旅程正在自己往下走：改为每一站都等你按“下一站”（A）",
    "fullScreen": "全屏",
    "fullScreenTitle": "铺满整个屏幕（F）",
    "fullScreenOffTitle": "退出全屏（F）",
    "leave": "退出",
    "leaveTitle": "退出旅程。镜头会停在原处。（Esc）",
    "leaveTitleStage": "退出旅程。地图会回到旅程之前居中的那个天体，镜头会因此移动。（Esc）",
    "progressLabel": "旅程已经走了多远",
    "controlsLabel": "旅程控制",
    "pausedChip": "旅程已暂停",
    "endMicro": "旅程结束",
    "endBody": "镜头停在原处。这里的一切都不会退回去。",
    "endBodyStage": "“继续飞行”会留在这远处。“回家”会把地图放回旅程之前居中的那个天体。",
    "endExplore": "继续飞行",
    "endExploreTitle": "保持这个画面，自己继续探索",
    "endStayTitleStage": "留在这远处，从旅程结束的地方继续飞",
    "endHome": "回家",
    "endExploreTitleStage": "自己继续探索，回到你出发时的地图",
    "endSend": "发送图片",
    "endSendTitle": "为旅程结束的地方做一张明信片，附上文字和链接",
    "endReplay": "再看一遍",
    "endReplayTitle": "从头再看一遍这个旅程",
    "endShareTitle": "分享这个旅程的链接",
    "endNextMicro": "下一个旅程",
    "endNext": "下一个：{title}",
    "docTitle": "Space Radar — {title} — 第 {n} 站，共 {count} 站"
  },
  "sky": {
    "radiant": "{name}辐射点",
    "bodies": {
      "sun": "太阳",
      "moon": "月球",
      "mercury": "水星",
      "venus": "金星",
      "mars": "火星",
      "jupiter": "木星",
      "saturn": "土星",
      "uranus": "天王星",
      "neptune": "海王星"
    },
    "fov": {
      "degrees": "{deg}° 视场 · {name}",
      "arcmin": "{min}′ 视场 · {name}",
      "names": {
        "eye": "肉眼",
        "binoculars": "双筒望远镜",
        "telescope": "望远镜"
      }
    },
    "lines": {
      "sunPath": "太阳的路径",
      "equator": "天赤道",
      "poleNorth": "北天极",
      "poleSouth": "南天极"
    },
    "what": {
      "star": "恒星",
      "starMag": "恒星 · {mag} 等",
      "planet": "行星 · {mag} 等",
      "sun": "我们的恒星",
      "moon": "地球的卫星",
      "dso": "深空天体",
      "dsoMag": "{kind} · {mag} 等",
      "open": "{name}，{sub}。打开它的卡片。",
      "plain": "{name}，{sub}。",
      "openTitle": "打开它的卡片"
    },
    "compassShort": [
      "北",
      "北北东",
      "东北",
      "东北东",
      "东",
      "东南东",
      "东南",
      "南南东",
      "南",
      "南南西",
      "西南",
      "西南西",
      "西",
      "西北西",
      "西北",
      "北北西"
    ],
    "lookLine": "{time}，朝{dir}方看，{fists}。它会移动大约 {mins} 分钟。",
    "lookLineNoDuration": "{time}，朝{dir}方看，{fists}。",
    "sunlit": "它还照得到阳光，正因为这样才看得见。",
    "notSunlit": "这一次飞越时，它在地球的阴影里，所以你看不到它。",
    "fistsHorizon": "刚刚升到地平线之上",
    "fistsOverhead": "几乎在头顶正上方",
    "fistsOne": "高出地平线约一个拳头",
    "fistsMany": "高出地平线约 {n} 个拳头",
    "noObserver": "设置好你在哪里，这一行就会告诉你该往哪里看。",
    "noPass": "未来 24 小时内，它不会升到你的地平线以上。",
    "notVisibleFromGround": "这个离得太远，肉眼分辨不出。",
    "leftGround": "已经离开地面，飞到那里去了。“今晚”里才有天空。",
    "nakedEye": "在黑暗的地方，亮得足以用肉眼看到。",
    "needsTelescope": "太暗，肉眼看不到；用望远镜，或者长时间曝光的照片，才能看到。",
    "starOnly": "只能看到它的恒星，而且只能通过望远镜；行星本身太暗了。",
    "onTheGround": "这个站在地面上，所以没有什么需要抬头找的。",
    "storm": "在地面上，它就是天气本身。从轨道上看，它是一个几百公里宽的云的旋涡。",
    "onAnotherWorld": "这个在{world}上。无论夜晚多晴朗，你从这里都无法用肉眼分辨它。",
    "worldRise": "从你所在的地方看，它在 {time} 升起。",
    "worldHere": "你所在的地方",
    "worldFrom": {
      "down": "在{place}：{rise} 从{riseDir}方升起，{highTime} 升到最高，{highAlt}；{set} 从{setDir}方落下。",
      "downNoSet": "在{place}：{rise} 从{riseDir}方升起，{highTime} 升到最高，{highAlt}。",
      "up": "在{place}：现在在地平线上，{alt}，在{dir}方。{highTime} 升到最高，{highAlt}；{set} 从{setDir}方落下。",
      "upPast": "在{place}：现在在地平线上，{alt}，在{dir}方。已经过了最高点；{set} 从{setDir}方落下。",
      "never": "在{place}，未来一天半内它都不会升起。",
      "always": "在{place}：现在在地平线上，{alt}，在{dir}方。今天它不会落下。",
      "honest": "按海平面的地平线推算；山丘和房子没有算在内。"
    },
    "worldNoRise": "这个你可以用肉眼看到。从你的位置推算它几点升起，这个版本里还没有。",
    "worldSee": {
      "pluto": "肉眼不行，双筒望远镜也不行：冥王星比你能看到的最暗的恒星还暗近 3000 倍，需要望远镜。",
      "io": "普通的双筒望远镜能把它看成木星旁边的一个光点；用肉眼看，它淹没在木星的强光里。",
      "europa": "普通的双筒望远镜能把它看成木星旁边的一个光点；用肉眼看，它淹没在木星的强光里。",
      "ganymede": "普通的双筒望远镜能把它看成木星旁边的一个光点；用肉眼看，它淹没在木星的强光里。",
      "callisto": "普通的双筒望远镜能把它看成木星旁边的一个光点；用肉眼看，它淹没在木星的强光里。",
      "titan": "肉眼看不到：土卫六最亮时是 8.2 等，需要小型望远镜或高倍双筒望远镜，而旁边土星的强光让这也不容易。",
      "enceladus": "肉眼看不到：土卫二是 11.7 等，离明亮的土星和它的光环太近，就算用小型望远镜也很难看到。",
      "triton": "肉眼和双筒望远镜都不行：海卫一是 13.5 等，比你能看到的最暗的恒星还暗约 600 倍，需要望远镜。",
      "charon": "勉强能看到：冥卫一是 16.8 等，比你能看到的最暗的恒星还暗 13000 倍，又离冥王星太近，2008 年业余爱好者用 14 英寸望远镜拍照，才把这一对分开。",
      "phobos": "肉眼看不到：火卫一最亮时是 11.3 等，紧贴着火星，被火星的强光淹没；它是 1877 年用 26 英寸望远镜发现的。",
      "deimos": "肉眼看不到：火卫二最亮时是 12.4 等，离火星很近，被火星的强光淹没；它是 1877 年用 26 英寸望远镜发现的。",
      "neptune": "肉眼看不到：海王星是 7.7 到 7.9 等，太暗，没有帮助就看不见。高倍双筒望远镜或望远镜能把它看成一个蓝色的小圆盘。",
      "mimas": "肉眼看不到：土卫一是 12.9 等，紧贴着土星，需要大型望远镜和稳定的夜晚。",
      "tethys": "肉眼看不到：土卫三是 10.2 等，小型望远镜够得着，不过旁边土星的强光让它不容易看。",
      "dione": "肉眼看不到：土卫四是 10.4 等，小型望远镜够得着，不过旁边土星的强光让它不容易看。",
      "rhea": "肉眼看不到：土卫五是 10 等，是土星的卫星里仅次于土卫六的最亮者，小型望远镜就能看到。",
      "iapetus": "肉眼看不到：土卫八的亮度在 10.2 到 11.9 等之间变化，因为它明亮的一面和暗的一面轮流朝向我们，所以小型望远镜在它最亮的时候最容易看到。",
      "miranda": "勉强能看到：天卫五是 16.6 等，淹没在天王星的强光里，许多业余望远镜都看不到。",
      "ariel": "肉眼和双筒望远镜都不行：天卫一是 14.8 等，和冥王星离我们最近时差不多暗，需要好的望远镜和黑暗的天空。",
      "umbriel": "肉眼和双筒望远镜都不行：天卫二是 15.1 等，是天王星四颗大卫星里最暗的，需要好的望远镜和黑暗的天空。",
      "titania": "肉眼看不到：天卫三是 13.9 等，是天王星的卫星里最亮的，但仍然需要一定口径的望远镜。",
      "oberon": "肉眼看不到：天卫四是 14.1 等，在这五颗里离天王星最远，需要望远镜和稳定的夜晚。"
    },
    "couldNotLook": "从这里推算不出飞越的情况。",
    "nowhereToLook": "没有人知道这个在哪里，所以没有地方可以看。"
  },
  "controls": {
    "title": "控制",
    "layersTitle": "显示什么",
    "layerCount": "{n}",
    "layerCountLoading": "统计中",
    "layerHint": {
      "exoplanets": "已关闭。勾选即可显示。"
    },
    "layerCountEmpty": "空",
    "layerCountEmptyTitle": "这个图层没有取回任何内容：它的数据源读取不到，或者现在没有内容。",
    "layerWaits": "尚未加载",
    "layerWaitsTitle": "为了省流量，开启时才会加载。",
    "layersFailed": "有 {n} 个图层取回的是空的。",
    "layersFailedOne": "有 1 个图层取回的是空的。",
    "layersFailedWhy": "查看数据源",
    "layerCountParts": {
      "onMap": "地图上有 {n} 个",
      "riding": "有 {n} 个搭在别的东西上",
      "unplaceable": "有 {n} 个无法定位",
      "auroraPeak": "可能性最高 {n}%",
      "lightningPerMin": "每分钟 {n} 次落雷"
    },
    "layersEmpty": "还没有加载任何图层。",
    "groups": {
      "around-earth": "地球周围",
      "earth": "天气和地面",
      "solar-system": "太阳系",
      "beyond": "恒星及更远处"
    },
    "groupCount": "{on} / {n}",
    "groupAll": "全部",
    "groupNone": "全不选",
    "groupAllLabel": "显示“{group}”里的每个图层",
    "groupNoneLabel": "隐藏“{group}”里的每个图层",
    "layerFilter": "查找图层",
    "layersKeys": "图层。上下方向键移动；空格键开关一个。",
    "layerFilterEmpty": "没有这个名字的图层。",
    "keysRow": "按键",
    "keysRowTouch": "手势",
    "keysRowTitle": "显示移动视角的按键",
    "keysRowTitleTouch": "显示移动视角的手势",
    "swatchMixed": "用它自己的颜色绘制",
    "keyedNote": "圆点按{key}着色：图例在下面。",
    "localTimeFallback": "当地时间",
    "locationPlaceholder": "输入城市名",
    "locationSearchLabel": "查找城市",
    "locationUseMine": "使用我的位置",
    "locationUseMineTitle": "请浏览器告诉我们你在哪里",
    "locationInsecure": "浏览器只会向 https 页面提供你的位置。这个页面是普通的 http，所以这个按钮已关闭。请改选一个城市，或者等有 https 地址后再打开它。",
    "locationUnsupported": "这个浏览器没有定位服务。请改选一个城市。",
    "locationDenied": "浏览器拒绝了。请改选一个城市。",
    "locationFailed": "浏览器没能找到你。请改选一个城市。",
    "locationAsking": "正在询问浏览器",
    "locationClear": "清除",
    "locationNoMatch": "内置的列表里没有匹配的城市。",
    "tonightCouldNotLook": "无法查看：还没有加载任何卫星。"
  },
  "search": {
    "title": "查找天体",
    "placeholder": "搜索行星、恒星、卫星",
    "placeholderPhone": "搜索太空",
    "inputLabel": "按名称或星表编号搜索天体",
    "listLabel": "匹配的天体",
    "fly": "飞向它",
    "flyTitle": "把镜头移到高亮的天体，并打开它的卡片",
    "hint": "输入两个字符就够了。按回车选第一个。",
    "noMatch": "这里没有叫“{q}”的东西。",
    "closest": "最接近的名字",
    "more": "还有 {n} 个匹配。多输入几个字符来缩小范围。",
    "searching": "已搜索 {n} 个天体。",
    "searchingOne": "已搜索 1 个天体。",
    "searchingBut": "已搜索 {n} 个天体，还有 {m} 个图层没有加载。",
    "searchingButOne": "已搜索 {n} 个天体，还有 1 个图层没有加载。",
    "empty": "还没有加载任何可搜索的内容。",
    "inputTitle": "搜索 (/)",
    "key": "/",
    "notLoaded": "没有加载，所以没有搜索：{layers}。",
    "stillLoading": "还在加载，所以暂时没有搜索：{layers}。",
    "loadsWhenOn": "为了省流量，开启时才会加载，所以暂时没有搜索：{layers}。",
    "couldNotRead": "读取不到，所以没有搜索：{layers}。",
    "fallback": "没有以它开头的。下面这些包含它。",
    "switchedOn": "已开启：{layer}。",
    "belowHorizon": "{name} 在地平线以下。",
    "notLoadedCount": "这样漏掉了多少个天体，要等它们加载之后才能知道。"
  },
  "quality": {
    "dataSaver": "省流量已开启：两个最大的列表会等一等。",
    "lowered": "画面卡顿（{ms} 毫秒）：改用更简单的画面。",
    "tierPhone": "表面地图为 2k，适合手机。",
    "tierSaver": "表面地图为 2k，用来省流量。",
    "tierSmall": "表面地图为 2k，适合这台设备。",
    "tierLatched": "表面地图回到 2k：刚才画面卡顿。",
    "tierLow": "表面地图为 2k，符合“低”的要求。",
    "tier1": "表面地图为 4k，空闲时加载。",
    "tier2": "表面地图为 4k，让更多天体保持清晰。",
    "promoted": "画面流畅，已升高一档。",
    "mapsWorn": "这台设备上的地图：{credits}。",
    "panelTitle": "画质",
    "choices": {
      "auto": "自动",
      "low": "低",
      "medium": "中",
      "high": "高",
      "ultra": "超高"
    },
    "autoNow": "自动：{tier}",
    "titles": {
      "auto": "根据这台设备和它的帧率来选择",
      "low": "最轻的画面：适合省电或旧笔记本",
      "medium": "更清晰的地图、起伏和天气",
      "high": "同时让更多天体保持清晰",
      "ultra": "完整分辨率，近看时有最细的层次"
    },
    "fellBack": "画面卡顿：画质已回到“自动”。",
    "restore": "以完整画质重新加载",
    "restoreTitle": "按你的设备能达到的画质重新加载此视图。"
  },
  "status": {
    "title": "数据源",
    "intro": "它读取的每一个数据源、读取的内容有多旧，以及来自哪里。这里没有任何东西藏在页脚里。",
    "stateOk": "正常",
    "stateStale": "已过期",
    "stateUnknown": "读取不到",
    "stateOkTitle": "最近读取过，并且在它的更新期限之内。",
    "stateStaleTitle": "我们有一份副本，但它比这个数据源承诺的更新频率还要旧。",
    "stateUnknownTitle": "在这个浏览器里，我们从没有成功读取过这个数据源。这不等于没问题，也不等于我们手里的副本出了错。",
    "ageNever": "从未读取",
    "ageLabel": "上次读取：{age}",
    "ageNeverLine": "这个浏览器里还没有可用的副本",
    "viaSnapshotLine": "来自我们的快照，{age}获取",
    "viaLiveLine": "{age}从 {publisher} 实时读取",
    "snapshotOverdue": "更新的副本已经晚了",
    "snapshotChecking": "（正在检查有没有更新的）",
    "couldNotLookLine": "读取不到：{reason}",
    "reasonNoRoute": "{why}，而且浏览器无法直接读取 {publisher}",
    "snapshotWhy": {
      "no-index": "我们的快照索引读取不到",
      "not-in-index": "我们的快照里没有这个数据源",
      "refused": "上一次抓取它被拒绝了",
      "error": "上一次抓取它失败了",
      "skipped": "抓取程序跳过了它",
      "unreadable": "我们保存的它的快照读取不到"
    },
    "harvestUnchecked": "我们的快照：还没有检查。",
    "harvestUnavailable": "我们的快照现在用不了，所以下面每个数据源，都直接从发布方实时读取，或者读取不到。",
    "harvestLine": "我们的快照：{age}写入 · {ok} 个数据源正常 · {refused} 个被拒绝 · {error} 个失败",
    "errorLabel": "上次的错误",
    "attributionTitle": "致谢",
    "attributionIntro": "这张地图上的数据，是别人的劳动成果。",
    "footCreditsIntro": "图像和贴图：",
    "footCreditsTextures": "Solar System Scope",
    "footCreditsTexturesTitle": "行星和恒星的贴图，采用 CC BY 4.0 许可",
    "footCreditsTexturesHref": "https://www.solarsystemscope.com/textures/",
    "footCreditsNasa": "NASA",
    "footCreditsNasaTitle": "云、夜面和表面的图像，以及 3D 模型",
    "footCreditsNasaHref": "https://www.nasa.gov/",
    "footCreditsSep": " · ",
    "cloudsTitle": "云",
    "auroraTitle": "极光",
    "weatherTitle": "闪电",
    "layersTitle": "实时还是内置",
    "layersIntro": "“实时”是你看着的时候，从发布方读取的，或者按这一刻推算的。“星表”随应用一起提供：恒星、星系，以及地面上的天线和着陆点，在你看的时候不会移动。“内置样本”用来代替浏览器完全无法访问的数据源。",
    "layerLive": "实时",
    "layerCatalogue": "星表",
    "layerSample": "内置样本",
    "layerIllustrative": "画出来的，不是追踪的",
    "layerMixed": "混合",
    "layerEmpty": "没有加载内容",
    "layerCountLabel": "显示 {n} 个",
    "sourcesEmpty": "还没有声明任何数据源。",
    "notAsked": "另有 {n} 个数据源，只有在开启需要它们的图层时才会读取。"
  },
  "time": {
    "justNow": "刚刚",
    "aMinuteAgo": "1 分钟前",
    "minutesAgo": "{n} 分钟前",
    "anHourAgo": "1 小时前",
    "hoursAgo": "{n} 小时前",
    "aDayAgo": "1 天前",
    "daysAgo": "{n} 天前",
    "lessThanAMinute": "不到 1 分钟",
    "aMinute": "1 分钟",
    "minutes": "{n} 分钟",
    "anHour": "1 小时",
    "hours": "{n} 小时",
    "aDay": "1 天",
    "days": "{n} 天",
    "months": "{n} 个月",
    "years": "{n} 年",
    "inFuture": "{d}后",
    "ago": "{d}前"
  },
  "sheet": {
    "handle": "面板高度",
    "closed": "已关闭",
    "peek": "已收低",
    "half": "半开",
    "full": "全开",
    "state": "{height}。上下方向键可以调整",
    "title": "面板高度：{height}。点按或拖动来调整"
  },
  "print": {
    "title": "把这个画面存为 6 × 4 英寸的明信片 (JPEG)",
    "making": "正在制作明信片",
    "saved": "明信片已保存",
    "failed": "暂时无法制作明信片",
    "fileName": "space-radar-postcard-{id}-{date}.{ext}",
    "when": "{date} {time} UTC",
    "mark": "spaceradar.ai",
    "exposure": {
      "eye": "肉眼看到的样子",
      "deep": "深度拉伸：把微弱的光提亮"
    },
    "look": {
      "measured": "“实测”外观"
    }
  },
  "hud": {
    "fromYou": "离你",
    "fromPlace": "离{place}",
    "behind": "在{world}后面",
    "offScreen": "{name}，相距 {distance}，在屏幕之外：点按飞过去",
    "live": "{name}：{readouts}"
  },
  "clean": {
    "hide": "隐藏所有面板 (H)",
    "show": "重新显示面板（H 或 Esc）",
    "hint": "按 H 或 Esc 显示面板。Shift+H 保留标签和时间"
  },
  "mark": {
    "label": "GitHub 源代码",
    "title": "Space Radar 在 GitHub 上的源代码",
    "href": "https://github.com/Sara-Managed-Projects/space-radar",
    "press": "新闻资料包",
    "pressTitle": "它是什么、图片，以及可以使用的标志",
    "pressHref": "press/index.html"
  },
  "klass": {
    "station": "空间站",
    "satellite": "卫星",
    "debris": "碎片",
    "rocket": "火箭",
    "probe": "探测器",
    "telescope": "望远镜",
    "asteroid": "小行星",
    "comet": "彗星",
    "site": "地面站点",
    "world": "天体",
    "star": "恒星",
    "exoplanet": "系外行星",
    "dso": "深空天体",
    "exotic": "极端天体",
    "storm": "热带气旋",
    "earthevent": "地球上的事件",
    "oddity": "奇特天体",
    "shower": "流星雨",
    "unknown": "天体"
  },
  "cls": {
    "nearEarthApprox": "离地球这么近，它的位置只是近似的：画出的轨道只绕着太阳，没有算上地球的引力。",
    "label": "我们怎么知道它在哪里",
    "measured": "实测位置",
    "inferred": "位置由 {n} {unit}前的轨道根数外推得出",
    "inferredUnknownAge": "位置由不知道是多久以前的轨道根数外推得出",
    "inferredNoElements": "位置是推算的，不是实测的",
    "stormAdvisory": "它的中心取自 {time} UTC 的通报，{ago}；风暴在移动，所以那之后它已经移动了",
    "stormAdvisoryDated": "它的中心取自 {date} {time} UTC 的通报，{ago}；风暴在移动，所以那之后它已经移动了",
    "illustrative": "画出来是为了显示它去哪里；真实的轨迹没有公开",
    "placeIllustrative": "它真实的轨道，取自 CelesTrak 的星表，但它在轨道上的位置是编的；我们没有它目前的轨道根数",
    "sample": "内置的样本数据，不是实时位置",
    "provisional": "还不在公开星表里——这些是运营方自己的轨道根数，通过 CelesTrak 发布；等 Space-Track 收录之后，才会有永久编号",
    "unknown": "我们说不清这个位置是怎么得出的",
    "unplaced": "没有人知道它在哪里，所以没有为它画任何东西",
    "shower": "天空中的一个方向：IAU 为这场流星雨公布的各个解的中位数",
    "noPlace": "没有为它画出位置：它所在的天体，不是这个应用里的一个世界",
    "approxPlace": "根据已公布的坐标定位，误差在大约 {n} 度以内",
    "inferredArc": "上一次有人见到它是在 {date}，而且{caveat}",
    "precisionSplit": "{anchorName} 的位置实测精确到 {anchorM} 米；这个地点是{how}的，位置精确到 {objectM} 米以内",
    "precisionSplitUnknown": "{anchorName} 的位置实测精确到 {anchorM} 米；这个天体本身从未被勘测过",
    "precisionSplitHowOnly": "{anchorName} 的位置实测精确到 {anchorM} 米；这个天体是{how}的，没有人公布过精确到什么程度",
    "precisionOwn": "位置精确到 {objectM} 米以内，{how}",
    "aboard": "这是 {carrier} 自己的位置，因为这个东西固定在它的外面，它去哪里，这个东西就去哪里",
    "how": {
      "surveyed": "通过轨道勘测得到",
      "photogrammetric": "从照片中找到",
      "orbital_imaging": "从轨道图像中找到",
      "unsurveyed": "从未勘测过",
      "map_reference": "取自地图"
    },
    "hourWord": "小时",
    "hoursWord": "小时",
    "dayWord": "天",
    "daysWord": "天",
    "minuteWord": "分钟",
    "minutesWord": "分钟",
    "yearWord": "年",
    "yearsWord": "年"
  },
  "unplaced": {
    "why": "{whyUnknown}",
    "noDistanceRow": "没有实测：星表里没有它的视差",
    "iauApproved": "{name}，{date}获批"
  },
  "earthEvent": {
    "kinds": {
      "wildfire": "火灾",
      "volcano": "正在喷发的火山",
      "iceberg": "冰山"
    },
    "rows": {
      "kind": "它是什么",
      "reported": "最近一次报告",
      "since": "喷发始于",
      "first": "首次报告",
      "size": "大小",
      "where": "地点",
      "by": "报告方"
    },
    "sizeValue": "{n} 平方公里",
    "sizeSmall": "不到 1 平方公里",
    "by": "{agencies}，经由 NASA EONET",
    "sky": "它在地面上。从轨道上看，火灾是一缕烟柱，火山是一根火山灰柱，冰山是黑色海面上的一块白色板块。",
    "drawn": "画成它最近一次报告的位置上的一个标记；它在地面上的范围没有画出来",
    "honesty": "这是 NASA EONET 的一个点，最近一次报告在 {date}，{read}读取。仅供观看，不是关于地点或时间的官方记录。"
  },
  "deepFacts": {
    "methodRow": "距离的测定方法",
    "billionLightYears": "{n} 十亿光年",
    "methods": {
      "parallax": "视差：它的恒星相对遥远天空的位移",
      "eclipsing-binary": "它里面的食双星",
      "cepheid": "它里面的造父变星",
      "TRGB": "它里面最亮的红巨星",
      "standard-candle": "亮度已知的恒星或爆发",
      "redshift": "它的红移，再通过一个宇宙学模型换算",
      "kinematic": "它随星系自转移动的速度",
      "assumed-member-of-parent": "它自己没有：按它所属星系的距离来放置"
    },
    "drawnTag": {
      "reconstruction": "· 重建",
      "model": "· 模型",
      "photograph": "· 照片",
      "catalogue": "· 星表",
      "illustration": "· 示意图"
    },
    "drawnWords": {
      "reconstruction": "根据已发表研究做出的三维重建",
      "model": "这一类天体的模型，不是它自己的恒星",
      "photograph": "一张真实的照片，是从我们这一侧拍的",
      "catalogue": "星表中的位置",
      "illustration": "这一类天体常见的示意性光晕和标记"
    },
    "drawnLine": "画的是：{drawn}。",
    "drawnJoin": "；其余的地方，",
    "records": {
      "dso-milky-way": {
        "drawn": "一幅建立在测量之上的示意图",
        "split": "实测的：几千光年以内的恒星（Gaia）、银河系棒的角度、沿着旋臂的方向，以及较近的旋臂（Reid 等人，2019）。推算的：银心另一侧被尘埃遮住的远端；它的旋臂是把近处的旋臂绕过去得到的。"
      }
    }
  },
  "truth": {
    "label": "我们怎么知道",
    "hints": {
      "measured": "实测",
      "inferred": "推算",
      "illustrative": "示意",
      "sample": "样本",
      "unknown": "未知",
      "unplaced": "未定位",
      "reconstruction": "重建",
      "model": "模型",
      "photograph": "照片",
      "catalogue": "星表",
      "illustration": "示意图"
    },
    "placeWord": "位置：{word}",
    "pictureWord": "画面：{word}",
    "loading": "正在打开图例。",
    "failed": "图例没有加载出来。下面这一行用简短的话说明了。"
  },
  "weatherStorms": {
    "turning": {
      "jupiter": "近看，在实测风速互相切变的地方和大红斑的尾流里，有小涡旋在翻滚，Oval BA 和三个白色椭圆在旋转。切变在哪里是实测的；每个涡旋是生成的，比地图更细：这是示意的。"
    },
    "poles": {
      "jupiter": "每个极点周围的气旋，是根据 Juno 2017 年的观测模拟的：北极周围八个，南极周围五个：这是重建，不是照片。气旋之间颜色较暗的云层是示意的。"
    }
  },
  "weatherDetail": "比地图清晰的程度更近时，会生成一层细细的条纹状云纹理来支撑画面：它随实测的风运动，保留地图本来的颜色，其中没有一道条纹是真实的云。这是示意的。",
  "weatherVortex": {
    "turning": {
      "saturn": "近看，六边形里有一个小气旋在转动：它的风眼宽 2000 公里，眼壁以每秒 150 米的速度绕圈，这是 Cassini 2012 年测得的。绕着它画的螺旋是示意的，而且现在没有任何设备在监测它。"
    },
    "still": {
      "saturn": "近看，六边形里有一个小气旋：它的风眼宽 2000 公里，这是 Cassini 2012 年测得的，当时它的眼壁以每秒 150 米的速度绕圈。绕着它画的螺旋是示意的，而且现在没有任何设备在监测它。"
    }
  },
  "sunAlive": {
    "prominences": "边缘上有 {n} 个日珥，位于 NOAA 列出的、离日面边缘十五度以内的活动区。位置是实测的；形状、高度和运动是示意的。",
    "prominencesOne": "边缘上有一个日珥，位于 NOAA 列出的、离日面边缘十五度以内的一个活动区。位置是实测的；形状、高度和运动是示意的。",
    "flare": "{region} 区正显示一次 {cls} 级耀斑：据 NOAA 的事件列表，它在 {date} {time} UTC 达到峰值。它的时间、级别、区域和衰减是实测的；画出来有多亮是示意的。",
    "cme": "一次日冕物质抛射，在 {date} {time} UTC 离开太阳，速度 {speed} 公里/秒，画成日冕仪看到的样子：一道向外移动的明亮环状结构，后面是颜色较暗的空洞，还有一个明亮的核心。它的开始时间、方向、宽度和速度来自 NASA 的 DONKI 星表；这团云保持着这个速度，真实的并不会这样，它的样子是示意的。"
  },
  "starSystem": {
    "zoneLabel": "宜居带（计算得出）",
    "orbitOf": {
      "mercury": "水星的轨道，用来对比大小",
      "earth": "地球的轨道，用来对比大小",
      "jupiter": "木星的轨道，用来对比大小",
      "neptune": "海王星的轨道，用来对比大小"
    },
    "rows": {
      "known": "已知的",
      "orbit": "离它的恒星的距离",
      "temperature": "温度（计算得出）",
      "zone": "宜居带（计算得出）",
      "starTemperature": "表面温度",
      "starWidth": "直径",
      "starGlow": "光晕",
      "starMass": "质量",
      "planets": "画出的行星",
      "stars": "这个系统里的恒星",
      "companion": "第二个太阳"
    },
    "unseen": "没有人见过它的表面。",
    "measuredOne": "它的{what}是实测的。",
    "measuredMany": "它的{what}是实测的。",
    "estimatedOne": "它的{what}是估计值。",
    "estimatedMany": "它的{what}是估计值。",
    "unmeasuredOne": "它的{what}没有实测。",
    "and": "和",
    "what": {
      "size": "大小",
      "year": "公转周期",
      "mass": "质量",
      "least": "最小可能质量"
    },
    "au": "{n} AU",
    "auComputed": "{n} AU，由它的公转周期和恒星的质量计算得出",
    "auYearComputed": "{n} AU；它的一年大约是 {y} 年，由这个距离和恒星的质量推算",
    "earthsEstimated": "地球的 {n} 倍，是档案根据它的质量做出的估计",
    "massEstimated": "地球的 {n} 倍，是档案根据它的大小做出的估计",
    "massLeast": "至少是地球的 {n} 倍",
    "sizeDefault": "没有实测：画成地球那么大",
    "temperature": "{k} K（{c} °C），假设它像地球一样反射 {pct}% 的光",
    "zone": {
      "inside": "在宜居带内",
      "edge": "在它的边缘：只在较宽的范围内",
      "hotter": "比宜居带更靠近恒星",
      "colder": "比宜居带离恒星更远"
    },
    "zoneNone": {
      "too-hot": "没有计算：这个公式不适用于这么热的恒星",
      "too-cool": "没有计算：这个公式不适用于这么冷的恒星",
      "no-temperature": "没有计算：这颗恒星的温度没有实测",
      "no-luminosity": "没有计算：这颗恒星的亮度没有实测",
      "twoStars": "没有计算：它绕着两颗恒星转，而星表只描述了一颗"
    },
    "zoneRange": "离恒星 {a} 到 {b} AU（Kopparapu 等人，2014）",
    "overlay": {
      "title": "叠加到地图上",
      "zone": "宜居带",
      "orbits": "我们的行星轨道",
      "zoneTitle": "液态水可能在行星表面长期存在的位置，由恒星的温度和亮度计算得出",
      "orbitsTitle": "我们太阳系行星的轨道，画在这颗恒星周围，用来对比大小",
      "note": {
        "none": "系统上没有叠加任何东西。",
        "zone": "绿色的带子是宜居带，是计算得出的，不是观测到的。",
        "orbits": "虚线圆环是我们自己太阳系的轨道，用来对比大小。这里没有任何东西沿着它们运行。",
        "both": "绿色的带子是宜居带，是计算得出的；虚线圆环是我们自己行星的轨道，用来对比大小。"
      }
    },
    "kelvin": "{n} K",
    "notMeasured": "没有实测",
    "starPoint": "没有实测：画成一个光点",
    "starWhite": "没有实测：画成白色",
    "starGlowValue": "画得比恒星更宽，用它自己的颜色，这样从很远的地方也能看到",
    "starsOne": "星表里有 {n} 颗；画出了一颗",
    "starsBoth": "两颗，都画出来了",
    "companionValue": "直径 {width}，质量 {mass}，{k} K{derived}",
    "companionDerived": "（模型值；它的颜色是示意的）",
    "zoneBoth": "{a} 到 {b} AU，两个太阳的光加在一起算",
    "pairLine": "这两个太阳每 {days} 天互相绕转一圈，平均相距 {a} AU，轨道是论文里测得的；行星绕着两个太阳转。它们的位置由这条轨道计算得出；它们画在行星所在的平面上，也就是天空视图所用的那个平面。",
    "line": "大小和公转周期来自 NASA 系外行星档案，{date}读取。轨道画成圆形{computed}；颜色{phase}和轨道的倾斜是示意的{defaults}。",
    "lineComputed": "，其中 {n} 个的大小由公转周期和恒星的质量推算",
    "lineDefaults": "；没有实测大小的行星，画成地球那么大"
  },
  "shells": {
    "radio": "来自地球的无线电已经传到了 {n} 光年远"
  },
  "groundDoor": {
    "stand": "站在这里",
    "drive": "站在这里并驾驶",
    "standTitle": "站上{name}的实测地面",
    "driveTitle": "站上{name}的实测地面并驾驶探测车",
    "noDrive": "这辆探测车不能在这里驾驶：应用中还没有它所在地面的实测数据。好奇号、毅力号、祝融号和机遇号可以，从它们各自的卡片进入。"
  },
  "flood": {
    "on": "补光",
    "off": "真实光照",
    "title": "把模型均匀地照亮，这样在阴影里也能看清。这不是真实的光照。",
    "note": "这是我们的灯，不是真实的光照。"
  },
  "ephemeris": {
    "drawn": "取自 JPL Horizons 并做了插值：与 JPL 自己的轨迹相差在大约 {km} 公里以内。",
    "note": "地图里有它那一天的轨迹，取自 JPL Horizons，误差大约 {km} 公里以内。",
    "noteLate": "JPL 的轨迹，从这一刻的 {n} 分钟之后才开始，时钟会前往那里。误差大约 {km} 公里以内。",
    "noteDay": "NASA 的页面只给了日期。时钟会前往 {time} UTC，也就是 JPL 轨迹里那一天离得最近的一次，误差大约 {km} 公里以内。",
    "failed": "它那一天的轨迹没有加载出来，所以时钟保持不动。再选一次它就可以重试。",
    "span": "JPL 保存的它的轨迹，从 {from} 到 {to}。",
    "before": "时钟在这之前，所以地图上没有它的位置。",
    "after": "时钟在这之后，所以地图上没有它的位置。",
    "go": "前往最近的可用日期",
    "goBefore": "把时钟拨到 {date}，也就是 JPL 保存的它的轨迹开始的地方",
    "goAfter": "把时钟拨到 {date}，也就是 JPL 保存的它的轨迹结束的地方"
  },
  "offline": {
    "updateReady": "有更新的版本可用",
    "reload": "重新加载"
  },
  "keepTrip": {
    "keep": "离线保存",
    "keepTitle": "把这个旅程的语音、模型和地图保存在这台设备上，没有网络也能播放",
    "keeping": "正在保存，{done} / {total}",
    "kept": "已离线保存",
    "keptTitle": "已保存在这台设备上。点按可以重新获取。",
    "keptNote": "{n} 个文件，{size}，已保存在这台设备上。实时数据（天气、风暴、卫星）不会保存。",
    "again": "重试",
    "failedNote": "已保存 {done} / {total} 个文件。请检查网络后重试。"
  },
  "autopilot": {
    "mark": "spaceradar.ai",
    "gateTitle": "按任意键，开启声音",
    "gateTitleTouch": "触摸屏幕，开启声音",
    "gateNote": "如果没有人在，{n} 秒后会静音开始，并显示字幕。",
    "upNext": "下一个旅程",
    "shape": "{n} 站 · {m} 分钟",
    "take": "接手操作",
    "takeTitle": "停止旅程，自己移动地图"
  },
  "drift": {
    "name": "漂流",
    "pause": "暂停（空格键）",
    "resume": "继续（空格键）",
    "next": "下一个地方 (N)",
    "options": "选项",
    "optionsTitle": "穿过什么、显示什么，以及节奏",
    "leave": "停止漂流（Esc）",
    "through": "穿过",
    "cats": {
      "craft": "航天器",
      "worlds": "天体",
      "small": "小天体",
      "stars": "恒星",
      "deep": "深空"
    },
    "show": "显示",
    "real": "真实模型",
    "realTitle": "只显示有真实模型、地图或照片的天体",
    "names": "名称",
    "namesTitle": "每个地方旁边的名字和数字",
    "bare": "只要太空",
    "bareTitle": "只有天空和天空中的东西：没有名字、标记、线条和面板",
    "pace": "节奏",
    "paces": {
      "calm": "悠闲",
      "steady": "平稳",
      "brisk": "轻快"
    },
    "hint": "正在漂流。拖动地图即可接手操作",
    "nothing": "按这些选择，没有可以穿过的地方",
    "notFromGround": "漂流从太空出发，不从地面出发"
  },
  "tour": {
    "label": "导览",
    "micro": "导览",
    "count": "{n} / {of}",
    "next": "下一步",
    "nextTitle": "下一步 (N)",
    "done": "完成",
    "doneTitle": "结束导览",
    "skip": "跳过",
    "skipTitle": "退出导览（Esc）",
    "voice": "朗读",
    "voiceTitle": "用合成语音朗读每一步",
    "waited": "先看一看，再继续。",
    "invite": "第一次来：看看导览",
    "inviteTitle": "绕着地图走八步"
  },
  "undo": {
    "moved": "已移到 {name}",
    "movedNowhere": "视角已移动",
    "night": "{name} 的夜晚：广角视图",
    "back": "回到刚才的位置",
    "done": "已回到刚才的位置"
  },
  "searchRows": {
    "kinds": {
      "sun": "恒星",
      "planet": "行星",
      "moon": "卫星",
      "station": "空间站",
      "satellite": "卫星",
      "telescope": "太空望远镜",
      "probe": "航天器",
      "rocket": "火箭",
      "launch": "发射",
      "debris": "碎片",
      "asteroid": "小行星",
      "comet": "彗星",
      "site": "地点",
      "landing": "着陆点",
      "star": "恒星",
      "exoplanet": "系外行星",
      "dso": "深空天体",
      "storm": "热带风暴",
      "oddity": "奇特天体",
      "earthevent": "地球上的事件",
      "blackhole": "黑洞",
      "pulsar": "脉冲星",
      "magnetar": "磁星",
      "quasar": "类星体",
      "galaxy": "星系",
      "cluster": "星系团",
      "browndwarf": "褐矮星",
      "whitedwarf": "白矮星"
    },
    "upNow": "现在在天上，{compass}方",
    "lowNow": "现在低低地挂在{compass}方",
    "downNow": "现在在你的地平线以下",
    "trip": "旅程",
    "starPattern": "星座",
    "mission": "任务",
    "eventName": "{mission}：{title}",
    "event": "任务事件 · {date}",
    "eventNoDate": "任务事件",
    "group": "卫星星座 · 地图上有 {n} 颗卫星 · 点按列出",
    "nearMe": "今晚我附近",
    "nearMeSub": "你的天空中有什么"
  },
  "countdown": {
    "go": "准许发射",
    "tbc": "时间待确认",
    "tbd": "时间未定",
    "hold": "暂停中：倒计时已暂停",
    "inFlight": "飞行中",
    "success": "已发射",
    "deployed": "有效载荷已部署",
    "failure": "发射失败",
    "partial": "部分失败",
    "byPlan": "按计划，暂无更新消息",
    "byPlanClimbing": "按计划，正在爬升，暂无更新消息",
    "age": "{age}读取"
  },
  "today": {
    "title": "今天",
    "moonTitle": "{phase}",
    "moonLine": "亮面 {pct}% · {next}在 {date}",
    "moonNext": [
      "新月",
      "上弦月",
      "满月",
      "下弦月"
    ],
    "approachLine": "{value} · {detail}",
    "launchedKicker": "最近 30 天",
    "launched": "轨道上新增 {n} 个天体",
    "launchedLine": "最新的：{name}",
    "debris": "碎片，用数字说话",
    "debrisClose": "关闭碎片视图",
    "debrisTitle": "统计轨道上所有被追踪的东西。会读取整个星表，大约 1.5 MB"
  },
  "sentence": {
    "one": "{a}。",
    "two": "{a}，{b}。",
    "title": "来自{sources}。点按前往",
    "names": {
      "sat-25544": "国际空间站",
      "sat-48274": "天宫"
    },
    "pass": "{name} 将在{when}从你头顶飞过",
    "launch": "{name} 预计在{when}发射",
    "showerToday": "今天是{name}流星雨的极大期",
    "showerTomorrow": "明天是{name}流星雨的极大期",
    "moonName": "月球",
    "moonPhases": [
      "新月",
      "",
      "满月",
      ""
    ],
    "moonToday": "今天是{phase}",
    "moonOne": "离{phase}还有一天",
    "moonDays": "离{phase}还有 {n} 天",
    "moonLit": "月亮亮面占 {pct}%",
    "crew": "此刻有 {n} 人在轨道上",
    "crewOne": "此刻有一个人在轨道上",
    "storms": "有 {n} 场风暴正在旋转",
    "stormOne": "有一场风暴正在旋转",
    "approach": "{name} 将在{when}飞过地球",
    "launched": "30 天里有 {n} 个新天体进入了轨道",
    "dateToday": "今天是 {date}",
    "dateClock": "时钟设在 {date}",
    "sources": {
      "pass": "CelesTrak 的轨道根数",
      "launch": "Launch Library 2",
      "shower": "IMO 流星雨日历",
      "moon": "Astronomy Engine",
      "crew": "Open Notify",
      "storms": "GDACS",
      "approach": "NASA JPL",
      "launched": "CelesTrak",
      "clock": "你设备的时钟"
    }
  },
  "wonder": {
    "kicker": "今日奇观",
    "label": "今日奇观：{title}"
  },
  "story": {
    "kicker": "本周故事 · 第 {week} 周",
    "label": "本周故事：{title}",
    "ruleTitle": "怎样得出的：{rule}",
    "lowest": {
      "title": "我们星表里最低的：{name}",
      "line": "最高不超过 {apogee} 公里，最低 {perigee} 公里，绕一圈 {min} 分钟。",
      "rule": "在 {n} 组不到 7 天的轨道根数里，最高点最低的一个"
    },
    "farthest": {
      "title": "我们星表里飞得最远的：{name}",
      "line": "最远到 {apogee} 公里，最近 {perigee} 公里，绕一圈 {lap}。",
      "hours": "{n} 小时",
      "days": "{n} 天",
      "rule": "在 {n} 组不到 7 天的轨道根数里，最高点最高的一个"
    },
    "busiest": {
      "title": "我们记录里最拥挤的高度：{lo} 到 {hi} 公里",
      "line": "我们记录的 {total} 个天体里，有 {n} 个在那里飞行：每 100 个里有 {pct} 个。",
      "rule": "在 {n} 组不到 7 天的轨道根数里，平均高度上最满的 {band} 公里"
    },
    "oldest": {
      "title": "我们星表里发射最早的：{name}",
      "line": "{year} 年发射，已在天上 {years} 年，绕一圈 {min} 分钟。",
      "rule": "在 {n} 组不到 7 天的轨道根数里，发射年份最早的一个"
    }
  },
  "happened": {
    "flown": "{age}升空",
    "lost": "{age}发射失败"
  },
  "passport": {
    "title": "护照",
    "openTitle": "你去过的地方，只保存在这个浏览器里",
    "summary": "{places} · {n} / {total} 个旅程",
    "places": "{n} 个地方",
    "placeOne": "{n} 个地方",
    "kept": "只保存在这个浏览器里，从不发送出去。",
    "notKept": "这个浏览器什么都不保存，所以这里什么都没有。",
    "placesTitle": "你打开过的地方",
    "tripsTitle": "走完的旅程",
    "outOf": "{n} / {total}",
    "barLabel": "已走完 {n} / {total} 个旅程",
    "placeTitle": "前往 {name}",
    "noPlaces": "还没有地方。在地图上打开一个吧。",
    "noTrips": "还没有走完的旅程。",
    "seenTitle": "亲眼见过的",
    "noSeen": "还没有打钩的。卡片上有“亲眼见过”按钮。",
    "seenIt": "亲眼见过",
    "toolsLabel": "这个天体的更多功能",
    "seenOn": "{date}见过",
    "seenTitleOff": "亲眼见过它之后，打个钩",
    "seenTitleOn": "已打钩为见过。点按可以取消",
    "seenNotKept": "这个浏览器什么都不保存，所以这个钩留不住",
    "remind": "提醒我",
    "remindTitle": "下载一个带提醒的日历文件：{title}",
    "forget": "忘掉我",
    "forgetConfirm": "是的，忘掉",
    "forgetTitle": "从这个浏览器清除护照和声音设置",
    "forgotten": "已忘掉。这个浏览器现在什么都没有保存。",
    "stamp": "第 {n} 个旅程，共 {total} 个 · {date}",
    "stampPlaces": "到目前为止打开了 {places}",
    "resume": "从第 {n} 站继续"
  },
  "kept": {
    "title": "这个网站在你的设备上保存了什么",
    "lines": [
      "你的护照：打开过的地方、走完的旅程、打钩见过的东西。",
      "你对声音和朗读的选择，以及你离开时面板的样子。",
      "它最近读取的数据的副本，这样地图没有网络也能打开。",
      "屏幕自动播放时，会记一份简短的旅程日志，只属于这个标签页。"
    ],
    "place": "你的位置会取整到十分之一度，并且只在这个页面打开时保留。",
    "none": "没有账号，没有 cookie，没有统计分析。护照里的“忘掉我”，会清除护照和声音设置。"
  },
  "buildInfo": {
    "line": "构建自 {sha}，{date}",
    "title": "这个网站所构建自的提交，在 GitHub 上",
    "href": "https://github.com/Sara-Managed-Projects/space-radar/commit/{sha}"
  },
  "realLook": {
    "title": "太空真的是这个样子吗？",
    "lead": "东西在哪里、怎样运动，是实测或计算得出的。它们的样子，则来自三种图像。",
    "kinds": [
      [
        "三维模型",
        "星云和星系是根据已发表的测量数据建成的三维模型，光线取自望远镜的照片（长时间曝光）；还没有模型的，就是一团和它一样大的柔和光晕。用肉眼看，同样的气体只是一团暗淡的灰色光晕。卡片上可以把照片和它的模型并排显示。"
      ],
      [
        "贴在模型上的地图",
        "行星和卫星是穿着地图的球体，地图由航天器的照片制成，有些经过艺术家的柔化。航天器是三维模型，大多来自 NASA 公布的文件。照在它们身上的光，是按所显示的这一刻计算的。"
      ],
      [
        "艺术想象图",
        "没有人见过其他恒星的行星的表面。那些面貌是根据实测的大小和温度想象出来的，它们的卡片上也这样写着。"
      ]
    ],
    "foot": "大小和距离有时会被改动，这样才能看得见。改动了的地方，卡片或图片上会说明。"
  },
  "debris": {
    "title": "轨道上的碎片",
    "reading": "正在读取星表，大约 1.5 MB",
    "failed": "星表读取不到。",
    "retry": "重试",
    "empty": "星表里没有列出轨道上的任何东西。",
    "lead": "轨道上被追踪的 {total} 个东西里，有 {gone} 个已经不再工作。",
    "kinds": {
      "debris": "块碎片",
      "rocket": "个用完的火箭箭体",
      "dead": "颗失效的卫星",
      "working": "颗在工作的卫星"
    },
    "bandsTitle": "按高度",
    "bands": {
      "low": "600 公里以下",
      "crowded": "600 到 1000 公里",
      "upper": "1000 到 2000 公里",
      "medium": "2000 到 34000 公里",
      "geo": "36000 公里左右",
      "beyond": "37600 公里以外",
      "stretched": "拉得很长的轨道"
    },
    "bandAria": "{band}：共 {total} 个。{debris} 块碎片，{rocket} 个火箭箭体，{dead} 颗失效的卫星，{working} 颗在工作。",
    "show": "在地图上显示",
    "hide": "从地图上隐藏",
    "showTitle": "每一块碎片和每一个用完的火箭箭体，按种类着色",
    "drawn": "{n} 个圆点：灰色是碎片，黄色是用完的火箭箭体。每个都在它真实的高度和倾角上，但在轨道上的位置是编的。",
    "storiesTitle": "来自星表",
    "oneObject": "1 个天体",
    "objects": "{n} 个天体",
    "oneLaunch": "1 次发射",
    "launches": "{n} 次发射",
    "oneThing": "1 个东西",
    "things": "{n} 个东西",
    "storyLaunched": "截至 {date} 的一周里，{launches}的{objects}加入了星表。",
    "storyCameDown": "那一周里，有{things}坠落了。",
    "storyCameDownBiggest": "那一周里，有{things}坠落了，其中最大的是 {name}。",
    "storyCloud": "最大的一团碎片云来自 {name}：还有 {pieces} 块留在轨道上。",
    "storyClouds": "最大的几团碎片云：{name}，还有 {pieces} 块在天上；然后是 {name2}，{pieces2} 块；以及 {name3}，{pieces3} 块。",
    "storyOldest": "仍在轨道上的最老的东西是 {name}，{year} 年发射：已经绕了 {years} 年。",
    "untracked": "按 ESA 的模型，太小而无法追踪的：1 到 10 厘米的大约有 {mid} 百万块，1 毫米到 1 厘米的有 {small} 百万块，截至 {when}。这是估计，不是计数。",
    "untrackedSource": "ESA 太空环境统计",
    "honesty": "根据 {date} 读取的 CelesTrak 星表统计：雷达能追踪到的，大约从 10 厘米宽开始。更小的碎片多得多，不在任何星表里。圆点在轨道上的位置是示意的。",
    "drawnPlaced": "{n} 个圆点：灰色是碎片，黄色是用完的火箭箭体。其中 {placed} 个在它们自己的轨道根数所给出的位置上；其余 {rest} 个在它们真实的高度和倾角上，但在轨道上的位置是编的。",
    "honestyPlaced": "根据 {date} 读取的 CelesTrak 星表统计：雷达能追踪到的，大约从 10 厘米宽开始。更小的碎片多得多，不在任何星表里。位置取自 CelesTrak 在 {built} 的轨道根数；没有公开轨道根数的圆点，在轨道上的位置是编的，它的卡片会这样说。"
  },
  "klassFar": {
    "dwarf": "矮行星",
    "interstellar": "星际天体"
  },
  "moments": {
    "title": "你来这里是为了什么",
    "wonder": {
      "id": "wonder",
      "label": "惊奇",
      "hint": "到处飞一飞，点点任何东西。"
    },
    "now": {
      "id": "now",
      "label": "此刻",
      "hint": "这一分钟，你头顶上有什么。"
    },
    "next": {
      "id": "next",
      "label": "接下来",
      "hint": "有什么要来了，什么时候。"
    }
  },
  "audio": {
    "on": "声音：开",
    "off": "声音：关",
    "toggleTitle": "音乐和音效。打开之前一直是关的；这台设备会记住你的选择。",
    "mute": "静音",
    "unmute": "声音",
    "muteTitle": "关闭音乐和音效",
    "unmuteTitle": "打开音乐和音效",
    "panelTitle": "声音",
    "panelNote": "为地图和旅程配的轻柔配乐。打开之前，什么都不会下载。",
    "creditsLine": "音乐和音效：{credits}",
    "narrationCredit": "旁白：合成语音，Kokoro-82M (af_heart)，Apache-2.0"
  },
  "dwarfLook": {
    "colour": "按它的光测得的颜色绘制（B−V {bv}，V−R {vr}），亮度是它表面反射的程度（反照率 {albedo}），用的是压缩过的刻度，这样这些天体里最暗的一个也能看见。",
    "colourRed": "按它的光测得的颜色绘制（B−V {bv}，V−R {vr}），它是太阳系里最红的天体之一，亮度是它表面反射的程度（反照率 {albedo}），用的是压缩过的刻度，这样这些天体里最暗的一个也能看见。",
    "shapeEgg": "它的形状是一个鸡蛋，由它的光变曲线和 2017 年的一次恒星掩星测得，{a} × {b} × {c} 公里。",
    "shapeMeasured": "它的形状是恒星掩星测得的那个形状。",
    "shapeUnknown": "它的形状从没有测量过，所以画成圆的。",
    "ring": "它的环在实测的距离上，宽度和不透明度也是实测的；环在天空中怎样倾斜，没有画出来。",
    "faintRings": "它的两条环是 2023 年发现的，按真实的不透明度太暗了，看不见，所以没有画出来。",
    "surface": "没有任何望远镜分辨出它的表面：上面什么都没有画，而且画成静止的，不转动。",
    "source": "数据：{src}。"
  },
  "worldFace": {
    "titan": {
      "title": "土卫六的两种面貌",
      "modes": {
        "own": "红外",
        "radar": "雷达"
      },
      "notes": {
        "own": "Cassini 的相机在近红外光（938 纳米）下，穿过雾霾看到的土卫六地面，带着雾霾的橙色。北部的海，沿着 Cassini 雷达画出的轮廓调暗了；近看时，太阳映在海面上，会闪出一点反光：反光落在哪里是推算的；它有多大、多亮是示意的。",
        "radar": "Cassini 的雷达在 2004 年到 2015 年间，穿过雾霾看到的土卫六地面的几条带子：亮的是粗糙的地面，或朝向雷达倾斜的地面，暗的是平滑的地面，液态甲烷和乙烷的海是黑色的。灰色是我们加的：雷达没有颜色。雷达看到了土卫六的 61%；带子之间露出的是调暗了的红外地图，橙色的。USGS 天体地质学中心和 NASA/JPL-Caltech，公有领域。"
      }
    },
    "venus": {
      "title": "金星的两种面貌",
      "modes": {
        "own": "云层",
        "surface": "地面"
      },
      "notes": {
        "own": "云顶，这就是肉眼或望远镜曾经看到的金星的全部。",
        "surface": "云层之下的地面，由 NASA 的 Magellan 在 1990 年到 1992 年间从轨道上用雷达测绘。亮的是粗糙的地面，暗的是平滑的地面。橙色是后加的，Magellan 没有扫到的条带，是从两边的边缘填补的。它像没有云一样被太阳照亮：它的山脉和陡崖来自 Magellan 的高度计，画得高了六倍，会投下影子。它不随云一起移动。"
      }
    },
    "jupiter": {
      "title": "木星的两种面貌",
      "modes": {
        "own": "艺术地图",
        "hubble": "Hubble 眼中的样子"
      },
      "notes": {
        "own": "一张艺术地图，由航天器的照片制成并经过柔化 (Solar System Scope)。这是大多数人熟悉的那幅图。",
        "hubble": "Hubble 在 2025 年 12 月 11 日测绘的木星。云带在那一天的位置上，没有任何一朵云在它今天的位置。颜色来自 Hubble 的红、绿、紫滤镜，比肉眼看到的略偏黄。NASA、ESA、A.A. Simon、M.H. Wong (OPAL)，CC BY 4.0，经改编。"
      }
    },
    "saturn": {
      "title": "土星的两种面貌",
      "modes": {
        "own": "艺术地图",
        "hubble": "Hubble 眼中的样子"
      },
      "notes": {
        "own": "一张艺术地图，由航天器的照片制成并经过柔化 (Solar System Scope)。这是大多数人熟悉的那幅图。",
        "hubble": "Hubble 在 2025 年 8 月 29 日测绘的土星，用的是它的红、绿、紫滤镜，比肉眼看到的略偏黄。那天被光环遮住的赤道条带，是用两边的云填补的。NASA、ESA、A.A. Simon、M.H. Wong (OPAL)，CC BY 4.0，经改编。"
      }
    },
    "uranus": {
      "title": "天王星的两种面貌",
      "modes": {
        "own": "艺术地图",
        "hubble": "Hubble 眼中的样子"
      },
      "notes": {
        "own": "一张艺术地图，由航天器的照片制成并经过柔化 (Solar System Scope)。这是大多数人熟悉的那幅图。",
        "hubble": "Hubble 在 2025 年 10 月 23 日测绘的天王星。这颗行星是躺着转的，北极朝向我们，所以 Hubble 只看到了北半球；南半球用赤道的颜色填上，不是猜的。NASA、ESA、A.A. Simon、M.H. Wong (OPAL)，CC BY 4.0，经改编。"
      }
    },
    "neptune": {
      "title": "海王星的两种面貌",
      "modes": {
        "own": "艺术地图",
        "hubble": "Hubble 眼中的样子"
      },
      "notes": {
        "own": "一张艺术地图，由航天器的照片制成并经过柔化 (Solar System Scope)。这是大多数人熟悉的那幅图。",
        "hubble": "Hubble 在 2025 年 8 月 24 日测绘的海王星：比那些著名的图片颜色更浅。遥远的北部在 Hubble 的视线之外，用它看到的最后一片云的颜色填上，不是猜的。NASA、ESA、A.A. Simon、M.H. Wong (OPAL)，CC BY 4.0，经改编。"
      }
    }
  },
  "exposure": {
    "panelTitle": "曝光",
    "modes": {
      "eye": "肉眼",
      "camera": "相机",
      "deep": "深度"
    },
    "notes": {
      "eye": "你在黑暗的地方会看到的样子：暗淡，灰色的。",
      "camera": "长时间曝光：积累几分钟的光，就像相机留住它那样。",
      "deep": "天文台的拉伸处理：把最暗淡的气体提亮。"
    },
    "real": "这些气体是真实的，而且很暗淡：用肉眼在望远镜前看，它是一团灰色的光晕，因为夜里的眼睛看不到颜色。地图把它画成三维模型；滑块显示的照片，是一张长时间曝光的照片。",
    "colours": {
      "broadband": "它是通过宽带彩色滤镜拍的（{filters}），所以颜色接近一双灵敏得多的眼睛会看到的样子。",
      "mixed": "它是通过宽带彩色滤镜拍的，另外加了一个窄带滤镜来拍发光的氢（{filters}），所以这里红色的气体，比肉眼看到的更强。",
      "narrowband": "它的颜色是映射出来的：每一种颜色，都是一种气体的光通过一个窄带滤镜（{filters}）得到的，是为了显示结构而选的，不是肉眼会看到的样子。",
      "infrared": "它是用红外光拍的，没有任何眼睛能看到红外光（{filters}），所以这里每一种颜色都是选的：它显示的是那里有什么，不是肉眼会看到的样子。",
      "unstated": "它的档案没有说用了哪些滤镜，所以我们也不说这些是不是肉眼会看到的颜色。"
    },
    "part": "它显示的是{part}，不是它的全部。",
    "creditLead": "图片：",
    "creditTail": " · {licence}，边缘经我们淡化，天空经我们调暗"
  },
  "look": {
    "panelTitle": "外观",
    "modes": {
      "measured": "实测",
      "film": "电影"
    },
    "titles": {
      "measured": "只显示实测或模拟的内容，按真实速率",
      "film": "加入生成的细节和示意的天气"
    }
  },
  "lookSaid": {
    "measured": "“实测”外观：上面不画任何生成的或示意的东西。",
    "film": "“电影”外观：会画出生成的细节和示意的天气。",
    "worlds": {
      "saturn": "天气：云带按 Cassini 实测的风速运动。这是模拟的运动，不是今天的云。"
    },
    "also": {
      "venus": "金星上有过闪电的报告，但仍有争议，所以没有画闪电。"
    },
    "turning": {
      "jupiter": "近看，Oval BA 和三个白色椭圆，在地图上它们所在的位置旋转。"
    },
    "poles": {
      "jupiter": "每个极点周围的气旋，是根据 Juno 2017 年的观测模拟的：北极周围八个，南极周围五个：这是重建，不是照片。"
    },
    "sun": {
      "measured": "“实测”外观：生成的颗粒纹理已关闭，日冕和日珥保持静止。",
      "film": "“电影”外观：颗粒纹理是生成的，日冕和日珥按画出来的样子运动，不是按实测的运动。"
    }
  },
  "otherLight": {
    "panelTitle": "其他波段",
    "bands": {
      "visible": "可见光",
      "infrared": "红外",
      "microwave": "微波",
      "gamma": "伽马射线"
    },
    "notes": {
      "visible": "眼睛和相机看到的天空。",
      "infrared": "红外下的天空，伪彩色：温暖的尘埃和较冷的恒星。",
      "microwave": "微波，以亮度显示：银河系叠在最古老的光之上。",
      "gamma": "伽马射线，伪彩色：脉冲星、耀变体、宇宙射线的辉光。"
    },
    "colours": {
      "infrared": "红色是 22 µm，绿色是 4.6 µm，蓝色是 3.4 µm (WISE)",
      "microwave": "一个波段，94 GHz，以亮度显示 (WMAP)",
      "gamma": "红色是 0.3 到 1 GeV，绿色是 1 到 3，蓝色是 3 以上 (Fermi)"
    },
    "mixLabel": "从可见光的天空到{band}",
    "mixValue": "{pct}% {band}",
    "loading": "正在获取整片天空的图片。",
    "failed": "那张图片没有送到。天空保持原样。",
    "creditLead": "巡天：",
    "creditTail": "。图块：CDS，斯特拉斯堡。"
  },
  "overlay": {
    "panelTitle": "地球数据",
    "keyTitle": "现在地球上显示的",
    "keyOff": "取下",
    "keyOffTitle": "显示地球本来的样子",
    "none": "无",
    "loading": "正在向 NASA 要这张图片。",
    "failed": "那张图片没有送到。地球保持原样。",
    "noEarth": "地球在视野里时，才会显示在地球上。",
    "line": "{what}{dated}{made}{credit}",
    "dated": {
      "daily": "这张图是 {date} 的。",
      "monthly": "这张图是 {date} 的平均值。"
    },
    "made": {
      "measured": "从轨道上实测；没有看到的地方是空白的。",
      "analysed": "实测的，空缺的地方已补上。",
      "modelled": "用实测数据驱动的天气模型模拟得出，不是直接拍到的图。"
    },
    "credit": "数据：{credit}，经由 NASA GIBS。这是一张数据地图，不是照片。",
    "wind": {
      "title": "风",
      "loading": "正在获取风场。",
      "failed": "风场没有送到。地球保持原样。",
      "what": "离地面十米高处的风；颜色代表风速。",
      "dated": "这是 {date} {time} UTC 的预报。",
      "mean": "平均约 {mean} 米/秒，最高 {max}。",
      "sped": "这些条纹每秒钟走完 {n} 小时的风。",
      "spedDay": "这些条纹每秒钟走完一天的风。",
      "still": "每一道条纹是气流的一小段，静止着。",
      "credit": "数据：{credit}。这是天气模型，不是实测。"
    },
    "currents": {
      "title": "洋流",
      "loading": "正在获取洋流。",
      "failed": "今天的洋流不在这里。地球保持原样。",
      "what": "海面的洋流；颜色代表水温。",
      "dated": "根据卫星在 {date} 测得的海面高度推算：是稳定的水流，不含潮汐和风吹的漂流，在赤道上最不确定。",
      "tempDated": "水温是 {date} 实测的，空缺处已补上。",
      "tempMissing": "灰色的条纹，是数据里没有水温的水域。",
      "sped": "这些条纹每秒钟走完 {n} 天的漂流；长的条纹是流得快的水。",
      "spedHours": "这些条纹每秒钟走完 {n} 小时的漂流；长的条纹是流得快的水。",
      "still": "每一道条纹是水流的一小段，静止着；长的是流得快的水。",
      "credit": "数据：{credit}。"
    },
    "legendAria": "{title}，从 {low} 到 {high} {unit}",
    "legendHigh": "{high} {unit}"
  },
  "figures": {
    "line": "星座图形是一种传统，由我们绘制；图形角上的恒星，在它们实测的距离上。",
    "lineSky": "星座图形是一种传统，由我们绘制，叠在从地球上看到的恒星之上。",
    "ecliptic": "虚线是黄道，也就是太阳一年中走过的路径。",
    "distance": "{n} 光年",
    "namedDistance": "{name}，{n} 光年"
  },
  "colourKey": {
    "title": "颜色依据",
    "unknown": "这些天体没有这项数据",
    "scope": "统计的是从这里看，已开启的图层里画出的天体。",
    "byLayer": "形状就是它本来的样子；颜色代表它所在的图层。",
    "crewed": "其中为载人而造的",
    "swarm": "其中属于大型星座的"
  },
  "trajectory": {
    "label": "它的轨迹：接下来的一圈半",
    "ariaLabel": "高度随时间的变化，以及平面地图上的星下点轨迹",
    "km": "{n} 公里",
    "now": "现在",
    "laps": "一圈半之后",
    "north": "北",
    "south": "南",
    "note": "和圆点用同样的轨道根数推算；地图是它正下方的地面。"
  },
  "timeFacts": {
    "label": "接下来的 90 分钟",
    "barLabel": "接下来 90 分钟里的阳光和阴影：{parts}",
    "barSunlit": "{mins} 分钟在阳光下",
    "barShadow": "{mins} 分钟在地球的阴影里",
    "now": "现在",
    "end": "+90 分钟",
    "entersShadowIn": "{mins}后进入地球的阴影",
    "entersSunlightIn": "{mins}后重新出现在阳光下",
    "entersShadowAt": "{time} 进入地球的阴影",
    "entersSunlightAt": "{time} 重新出现在阳光下",
    "allSunlit": "接下来的 90 分钟里，一直在阳光下",
    "allShadow": "接下来的 90 分钟里，一直在地球的阴影里",
    "minutes": "{n} 分钟",
    "underAMinute": "不到 1 分钟",
    "lapIn": "{mmss}后绕完这一圈",
    "lapAt": "{time} 绕完这一圈",
    "orbit": "发射以来第 {n} 圈",
    "orbitNote": "推算的：星表在轨道根数历元时给出的圈数，加上之后绕的圈数。",
    "launched": "{year} 年发射",
    "nowSunlit": "在阳光下",
    "nowShadow": "在地球的阴影里",
    "shadowIn": "{mins}后进入阴影",
    "sunlightIn": "{mins}后见到阳光",
    "shadowAt": "{time} 进入阴影",
    "sunlightAt": "{time} 见到阳光",
    "lapEndsIn": "{mmss}后绕完一圈",
    "lapEndsAt": "{time} 绕完一圈"
  },
  "train": {
    "label": "成列飞行",
    "oneOf": "一起发射的 {n} 颗中的一颗（{designator}）。",
    "youLead": "这一颗领头。",
    "leads": "{name} 领头；这一颗排在队伍的第 {position} 位。",
    "stillRaising": "仍在以一条线的形式爬升，大约 {alt} 公里高——这就是人们报告的那串光点。",
    "spreadOut": "现在已经散开，大约 {alt} 公里高；在天空中不再是一条线。"
  },
  "aboard": {
    "label": "同船的还有",
    "openTitle": "打开这个的卡片",
    "note": "这些没有自己的圆点。它们就在这个航天器所在的位置，因为它们是固定在它上面的。",
    "backTitle": "打开搭载它的航天器的卡片"
  },
  "myth": {
    "label": "常见的说法",
    "line": "{claim}——{correction}",
    "contested": "常见的说法，而且确实有争议：{claim}——{correction}"
  },
  "source": {
    "prefix": "来源",
    "unknown": "没有记录来源",
    "fetched": "{age}读取"
  },
  "photo": {
    "title": "构图拍照",
    "barLabel": "图片",
    "shapesLabel": "画幅",
    "shapes": {
      "16:9": "16:9",
      "1:1": "1:1",
      "4:5": "4:5",
      "9:16": "9:16"
    },
    "shapeTitle": "按 {shape} 取景",
    "caption": "说明",
    "captionTitle": "带有名称、日期和网址的横条",
    "save": "保存图片",
    "saveTitle": "把画框里的内容存为 JPEG",
    "saveTitlePng": "把画框里的内容存为 PNG",
    "timeLabel": "时间",
    "earlier": "更早",
    "later": "更晚",
    "timeTitle": "{dir}{unit}，和时间条的步长一致",
    "lens": "镜头",
    "lensValue": "{n}°",
    "lensTitle": "视场角 {n} 度。窄的是长焦镜头；宽的能容纳更多",
    "png": "PNG",
    "pngTitle": "无损保存，文件更大",
    "share": "分享",
    "shareTitle": "把图片交给这台设备的分享面板",
    "sharedSaved": "这台设备不肯分享它。已改为保存图片",
    "done": "退出拍照模式",
    "making": "正在制作图片",
    "saved": "图片已保存",
    "failed": "暂时无法制作图片",
    "honesty": "根据实测位置绘制，不是照片"
  },
  "tonight": {
    "title": "今晚",
    "placeGuess": "在{place}附近，根据你的时区猜的",
    "placeSet": "在{place}",
    "placeMine": "在你的位置附近",
    "placeShared": "在{place}，别人分享给你的",
    "noPlace": "设置好你在哪里，才能看到有什么飞过。",
    "coords": "{lat}，{lon}",
    "working": "正在推算今晚的飞越……",
    "passLine": "{name} · {time} · 从{from}到{to}，最高时{fists}（{deg}°） · {mins} 分钟",
    "startsIn": "{countdown}后开始",
    "startsAt": "{time} 开始",
    "upNow": "已经升起，朝{dir}方看",
    "showMe": "带我去看",
    "showMeTitle": "从你的位置打开天空，朝向它升起的方向",
    "guessCaveat": "在你那里，时间可能差几分钟。",
    "unitRises": "升起",
    "unitHigh": "最高",
    "unitLong": "分钟可见",
    "degrees": "{deg}°",
    "path": "从{from}到{to}",
    "rowDetail": "{time} · 高 {deg} · {mins} 分钟",
    "nothingTonight": "今晚没有明亮的东西飞过。",
    "nextPass": "下一次：{when} · {name}",
    "nothingAtAll": "三天内都没有明亮的东西飞过。",
    "darkFrom": "{time} 起天黑",
    "darkUntil": "黑到 {time}",
    "darkNow": "现在天黑了",
    "neverDark": "今晚天不会黑",
    "moonRises": "月亮 {pct}%，{time} 升起",
    "moonUp": "月亮 {pct}%，现在在天上",
    "moonDown": "月亮 {pct}%，在地平线以下",
    "more": "更多飞越",
    "fewer": "收起",
    "arcLabel": "它横过天空的路径：从{from}方升起，最高 {deg}°，在{to}方落下",
    "cardinals": {
      "N": "北",
      "E": "东",
      "S": "南",
      "W": "西"
    },
    "best": {
      "title": "今晚最佳",
      "nothing": "今晚没有特别突出的。",
      "rowTitle": "在天空中显示它",
      "passLine": "{t0} {d0} · {t1} {deg}° {d1} · {t2} {d2}",
      "mag": "{mag} 等",
      "passAria": "{name}：{t0} 出现在{d0}，{t1} 最高，高 {deg}°，在{d1}，{t2} 消失在{d2}，星等 {mag}。",
      "fades": "它在落下之前，就已隐入地球的阴影。",
      "appears": "它爬到半空时，才从地球的阴影里出来。",
      "notVisible": "看不到：天空太亮，或者它在阴影里。",
      "rocket": "火箭箭体 · {name}",
      "debris": "碎片 · {name}",
      "planetLine": "{time} 最佳 · 高 {deg}°，{dir}",
      "moonTitle": "月球 · {phase} · {pct}%",
      "moonSets": "{time} 落下",
      "moonRises": "{time} 升起",
      "moonAllNight": "整夜都在天上",
      "phases": {
        "new": "新月",
        "waxingCrescent": "蛾眉月",
        "firstQuarter": "上弦月",
        "waxingGibbous": "盈凸月",
        "full": "满月",
        "waningGibbous": "亏凸月",
        "lastQuarter": "下弦月",
        "waningCrescent": "残月"
      },
      "showerLine": "每小时最多 {zhr} 颗 · {time} 最佳，{dir}",
      "dsoLine": "{time} 最佳 · 高 {deg}°，{dir} · {how}",
      "dsoNeeds": {
        "eye": "肉眼可见",
        "binoculars": "双筒望远镜"
      },
      "view": "我的视野",
      "viewHeight": "至少要多高",
      "facings": {
        "any": "四面八方",
        "n": "北",
        "e": "东",
        "s": "南",
        "w": "西"
      },
      "facingTitles": {
        "any": "整片天空",
        "n": "只显示北方最佳的",
        "e": "只显示东方最佳的",
        "s": "只显示南方最佳的",
        "w": "只显示西方最佳的"
      },
      "heights": {
        "0": "任何高度",
        "15": "15° 以上",
        "30": "30° 以上"
      },
      "viewNothing": "今晚没有东西经过天空的这一块。",
      "darkHours": "{from} 到 {to} 天黑",
      "moonless": "没有月亮，是个黑夜",
      "moonBright": "月亮 {pct}%，会遮住暗的星",
      "moonFaint": "月亮 {pct}%，光很弱",
      "neverDark": "今晚天不会黑。",
      "markEnds": "{time} {dir}",
      "markPeak": "{time} {deg}°",
      "honesty": "按你的位置计算得出。亮度是估计值。"
    },
    "settings": "更多天空设置",
    "skybar": {
      "title": "天空",
      "field": "视场",
      "fields": {
        "eye": "肉眼",
        "binoculars": "双筒望远镜",
        "telescope": "望远镜"
      },
      "fieldNotes": {
        "eye": "和你看到的一样宽。滚动或双指捏合来缩放。",
        "binoculars": "7° 的视场：更暗的星星会出现。",
        "telescope": "1° 的视场：行星变成圆盘。"
      },
      "following": "正在跟随 {name}。拖动天空即可松开。",
      "followSet": "{name} 已经落下，所以视角松开了。",
      "show": "连线和名称",
      "toggles": {
        "figures": "连线",
        "names": "名称",
        "art": "插图",
        "bounds": "边界",
        "sunPath": "太阳路径",
        "equator": "天赤道",
        "grid": "网格",
        "starGrid": "星图网格",
        "meteors": "流星",
        "trails": "星轨",
        "seeThrough": "透明地面"
      },
      "toggleTitles": {
        "seeThrough": "把陆地画成透明的，看看地平线以下有什么",
        "figures": "星座的连线图形",
        "names": "星座和亮星的名字",
        "sunPath": "太阳、月亮和行星所走的路径",
        "equator": "天空的赤道，在地球赤道的上方",
        "grid": "高度和方向，带有南北线",
        "starGrid": "绘制恒星位置所用的网格",
        "art": "西方星座的图画，作者 Johan Meuris",
        "bounds": "88 个星座的官方边界",
        "meteors": "今晚活跃的流星雨划出的条纹，按今晚的流量显示",
        "trails": "每颗亮星最近一小时的轨迹，就像长时间曝光"
      },
      "time": "天空中的时间",
      "timeNow": "现在",
      "timeNowTitle": "回到现在",
      "timeDusk": "黄昏",
      "timeMidnight": "午夜",
      "timeDawn": "黎明",
      "timeTitles": {
        "dusk": "今天傍晚民用暮光结束的时候",
        "midnight": "夜晚的正中间",
        "dawn": "早晨民用曙光开始的时候"
      },
      "timeStrip": "拖动来转动天空",
      "timeTicks": {
        "dusk": "黄昏",
        "midnight": "午夜",
        "dawn": "黎明"
      },
      "timeStripAria": "天空的时间：拖动，或用方向键，每步十分钟",
      "timeAt": "{time} · {phase}",
      "timePhases": {
        "day": "白天",
        "golden": "太阳低垂",
        "civil": "民用曙暮光",
        "nautical": "航海曙暮光",
        "astronomical": "天文曙暮光",
        "night": "夜晚"
      },
      "timeFar": "离今天这么远，没有卫星：它们的轨道数据已经过期。",
      "eyepiece": "目镜",
      "eyepieces": {
        "low": "低倍 · 1°",
        "medium": "中倍 · 30′",
        "high": "高倍 · 12′"
      },
      "eyepieceTitles": {
        "low": "1 度的视场：两个满月那么宽",
        "medium": "半度：整个月亮",
        "high": "五分之一度：行星成为圆盘"
      },
      "centre": "正中间是什么",
      "centreTitle": "说出视角正中间对着什么；按回车打开它的卡片",
      "con": {
        "kind": "星座",
        "label": "{name}，一个星座。",
        "inside": "在{name}"
      },
      "landscape": {
        "city": "天际线：画的是一座城市的，不是你那条街。",
        "hills": "天际线：画的是山丘，不是你那里的。",
        "coast": "{dir}方是海，取自水域地图。陆地是画的。"
      },
      "artWesternOnly": "插图只属于西方星座",
      "culture": "谁的星空",
      "cultures": {
        "western": "西方",
        "chinese": "中国",
        "maori": "毛利",
        "hawaiian": "夏威夷",
        "samoan": "萨摩亚",
        "tongan": "汤加",
        "norse": "北欧",
        "boorong": "Boorong"
      },
      "cultureNotes": {
        "western": "天文学家在 1922 年商定的 88 个星座。",
        "chinese": "大约 300 个小星官。这是对一片活着的星空的一种解读。",
        "maori": "六个图形。各个部落的名称不同；这片星空是活着的。",
        "hawaiian": "航海者的星线，至今仍用来掌舵。",
        "samoan": "萨摩亚传说里的十四个图形。一种活着的传统。",
        "tongan": "汤加的星路和图形。一种活着的传统。",
        "norse": "六个图形，是对北欧星空的一种重建。",
        "boorong": "1857 年记述的 Boorong 一个家族的星空。至今仍然活着。"
      },
      "cultureCredits": {
        "western": "插图：Johan Meuris，为 Stellarium 所作，采用 Free Art License。船底座、船尾座和船帆座共用一幅画；巨蛇座没有。",
        "chinese": "图形：Sun Shuwei 和 Karrie Berglund，为 Stellarium 所作，CC BY-SA 4.0。有文献依据的重建。",
        "maori": "图形：Dan Smale，为 Stellarium 所作，CC BY-SA 4.0。有文献依据的重建。",
        "hawaiian": "图形：依据 Nainoa Thompson，由 Kamehameha Schools Kapālama 为 Stellarium 制作，CC BY-SA 4.0。",
        "samoan": "图形：Jake Fitisemanu 与萨摩亚的守护者，为 Stellarium 所作，CC BY-SA 4.0。有文献依据的重建。",
        "tongan": "图形：Dan Smale，为 Stellarium 所作，CC BY-SA 4.0。依据有限资料所作的、有文献依据的重建。",
        "norse": "图形：Jonas Persson，为 Stellarium 所作，CC BY-SA 4.0。这是重建，不是记录。",
        "boorong": "图形：John Morieson 和 Alex Cherney，为 Stellarium 所作，CC BY-SA 4.0。对一片活着的星空的一种解读。"
      },
      "meteorNote": "{name}：这片天空里每小时约 {n} 颗。",
      "meteorFew": "{name}：这片天空里每小时不到 1 颗。",
      "meteorDown": "{name}：辐射点在地平线以下，没有条纹。",
      "meteorHonest": "今晚的流量是模型算的。条纹是示意的。",
      "meteorSporadic": "今晚没有流星雨。对日点流星源：每小时 {n} 颗。",
      "darkness": "你的天空",
      "darknessModes": {
        "city": "城市",
        "town": "城镇",
        "dark": "暗处"
      },
      "darknessAuto": "自动",
      "darknessAutoTitle": "根据你所在位置的夜间灯光，判断是哪一种天空",
      "darknessBy": {
        "place": "根据 NASA 的夜间灯光地图，对你所在位置的估计。",
        "reading": "正在读取你所在位置的夜间灯光。",
        "unread": "夜间灯光地图读取不到：请自己选一种天空。",
        "trip": "由旅程的这一站固定。"
      },
      "darknessNotes": {
        "city": "城市：能看到 4 等以内的星，看不到银河。",
        "town": "城镇边缘：能看到 5.3 等以内的星。",
        "dark": "暗处：能看到 6.5 等以内的星，还有银河。"
      },
      "point": {
        "row": "用手机指向天空",
        "on": "用手机指向天空",
        "title": "把手机举起来：画面会跟着转",
        "note": "把手机举向天空，再转动。画面会跟着走。",
        "noPlace": "需要你的位置，才能知道哪边是北。",
        "denied": "手机拒绝了运动传感器。仍然可以拖动。",
        "deniedHow": "想要允许：先重新加载页面，被询问时选“允许”。",
        "none": "这里没有运动传感器回应。仍然可以拖动。",
        "unsupported": "这个浏览器没有提供运动传感器。仍然可以拖动。",
        "lineUpWith": "天空对不上？拖动，直到 {name} 对上。",
        "lineUpPlain": "天空对不上？拖动，直到一颗亮星对上。",
        "lined": "已手动对准，和指南针相差 {n}°。",
        "reset": "撤销对准",
        "resetTitle": "回到指南针自己的北",
        "accuracy": "指南针说它的误差大约在 {n}° 以内。",
        "relative": "这里没有指南针。拖动天空来对准它。",
        "declination": "真北：指南针已向{dir}修正 {n}°。",
        "east": "东",
        "west": "西",
        "honest": "北是手机指南针指的方向。附近的金属会让它偏。"
      },
      "red": "红光",
      "redTitle": "把页面变成红色，让眼睛保持适应黑暗",
      "honesty": "恒星是实测的，行星是计算得出的，大气是模拟的，陆地是画的。"
    }
  },
  "keyHint": {
    "title": "控制",
    "titleTouch": "手势",
    "label": "移动视角的按键",
    "labelTouch": "移动视角的手势",
    "close": "关闭",
    "closeTitle": "关闭（Esc）",
    "does": {
      "turn": "转动",
      "zoom": "拉近、推远",
      "pan": "平移",
      "pick": "选一个天体",
      "search": "搜索",
      "hide": "全部隐藏",
      "show": "显示什么",
      "share": "分享",
      "esc": "关闭",
      "keys": "全部按键",
      "tripPlay": "播放、暂停",
      "tripStep": "上一站、下一站",
      "tripCard": "收起卡片",
      "tripReplay": "重播",
      "tripSound": "声音",
      "tripLeave": "退出"
    },
    "how": {
      "drag": "拖动",
      "wheel": "滚动",
      "pinch": "双指捏合",
      "two": "双指",
      "tap": "点按"
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
      "space": "空格",
      "c": "C",
      "r": "R",
      "m": "M"
    },
    "labelAll": "键盘快捷键",
    "tripTitle": "旅程中"
  },
  "render": {
    "eyebrow": "Space Radar · 一次旅程",
    "site": "spaceradar.ai",
    "fly": "自己飞一飞",
    "music": "音乐：John Bartmann，CC0。完整致谢见 spaceradar.ai。"
  },
  "glossary": {
    "title": "本页的词语",
    "hint": "点一个术语，看一句简单的解释。"
  },
  "templates": {
    "earthevent": {
      "lead": {
        "wildfire": "{name} 是一场火灾，在最近一次报告（{date}）时它就在这里",
        "volcano": "{name} 自 {date} 起一直在喷发",
        "iceberg": "{name} 在最近一次报告（{date}）时就在这里"
      },
      "size": "那次报告时大约 {n} 平方公里"
    },
    "storm": {
      "lead": "{name} 是{a}{status}，它的中心{ago}在这里",
      "leadUnknown": "{name} 是一个热带气旋，它的中心{ago}在这里",
      "leadBefore": "{name} 是{a}{status}，它的中心将在{ago}到达这里",
      "leadBeforeUnknown": "{name} 是一个热带气旋，它的中心将在{ago}到达这里",
      "wind": "它路径上的最大风速（含预报值）会达到 {n} 公里/时",
      "statuses": {
        "hurricane": "飓风",
        "typhoon": "台风",
        "cyclone": "热带气旋",
        "storm": "热带风暴",
        "depression": "热带低压"
      }
    },
    "exotic": {
      "leadBlackhole": "{name} 是一个黑洞，在 {dist} 光年之外",
      "leadPulsar": "{name} 是一颗脉冲星，在 {dist} 光年之外",
      "leadMagnetar": "{name} 是一颗磁星，在 {dist} 光年之外",
      "leadQuasar": "{name} 是一个类星体，在 {dist} 光年之外",
      "leadStar": "{name} 是一颗恒星，在 {dist} 光年之外",
      "leadRange": "{name} 是{a}{kind}，距离在 {lo} 到 {hi} 光年之间",
      "mass": "质量是太阳的 {n} 倍",
      "massRange": "质量是太阳的 {lo} 到 {hi} 倍",
      "massMillions": "质量是 {n} 百万个太阳",
      "massBillions": "质量是 {n} 十亿个太阳",
      "spins": "每秒自转 {n} 圈",
      "spinsSlow": "每 {n} 秒自转一圈",
      "kinds": {
        "blackhole": "黑洞",
        "pulsar": "脉冲星",
        "magnetar": "磁星",
        "star": "恒星",
        "quasar": "类星体",
        "galaxy": "星系",
        "cluster": "星系团",
        "browndwarf": "褐矮星",
        "whitedwarf": "白矮星"
      },
      "leadGalaxy": "{name} 是一个星系，在 {dist} 光年之外，这是它现在所在的位置",
      "leadCluster": "{name} 是一个星系团，在 {dist} 光年之外，这是它现在所在的位置",
      "leadBrowndwarf": "{name} 是一颗褐矮星，在 {dist} 光年之外",
      "leadWhitedwarf": "{name} 是一颗白矮星，在 {dist} 光年之外"
    },
    "dso": {
      "leadHome": "{name} 是我们所在的星系；它的中心在 {dist} 光年之外",
      "lead": "{name} 是{a} {type}，在 {dist} 光年之外",
      "leadRange": "{name} 是{a} {type}，距离在 {lo} 到 {hi} 光年之间",
      "leadUntyped": "{name} 在 {dist} 光年之外",
      "size": "宽约 {n} 光年",
      "seenAs": "我们看到的是它 {n} 年前的样子",
      "seenAsMillions": "我们看到的是它 {n} 百万年前的样子",
      "constellation": "在{con}",
      "kinds": {
        "galaxy": "星系",
        "nebula": "星云",
        "cluster": "星团",
        "other": "深空天体"
      }
    },
    "exoplanet": {
      "lead": "{name} 是绕着恒星 {host} 转的一颗行星，在 {dist} 光年之外",
      "leadNoHost": "{name} 是绕着另一颗恒星转的一颗行星，在 {dist} 光年之外",
      "size": "宽度约是地球的 {n} 倍",
      "sizeSmaller": "宽度约是地球的 {n}",
      "mass": "质量是地球的 {n} 倍",
      "year": "它的一年长 {n} 天",
      "yearHours": "它的一年长 {n} 小时",
      "found": "{year} 年用 {method} 方法发现",
      "foundYear": "{year} 年发现",
      "asOf": "数据来自截至 {date} 的星表副本"
    },
    "star": {
      "lead": "{name} 是一颗恒星，在 {dist} 光年之外",
      "leadColour": "{name} 是{a}{colour}的恒星，在 {dist} 光年之外",
      "near": "是离我们最近的几颗之一",
      "seenAs": "我们看到的是它 {n} 年前的样子",
      "seenAsMonths": "我们看到的是它 {n} 个月前的样子",
      "luminosity": "亮度是太阳的 {n} 倍",
      "dimmer": "亮度只有太阳的 {n}",
      "colours": {
        "O": "蓝色",
        "B": "蓝白色",
        "A": "白色",
        "F": "黄白色",
        "G": "黄色",
        "K": "橙色",
        "M": "红色"
      }
    },
    "station": {
      "lead": "{name} 是一座载人空间站，正绕着地球运行",
      "whyPass": "在 {time} 飞过你的天空",
      "crew": "上面有 {crew} 人",
      "altitude": "高 {alt} 公里",
      "speed": "每 {period} 分钟绕一圈"
    },
    "satellite": {
      "lead": "{name} 是一颗绕着地球运行的卫星",
      "leadKind": "{name} 是{kind}，正绕着地球运行",
      "leadDocked": "{name} 是{kind}，对接在{station}上",
      "aSpacecraft": "航天器",
      "aTelescope": "太空望远镜",
      "whyLaunchedDays": "{n} 天前发射",
      "whyLaunchedYear": "{year} 年发射",
      "operator": "由 {operator} 运营",
      "purpose": "{purpose}",
      "altitude": "高 {alt} 公里",
      "whyPass": "在 {time} 飞过你的天空"
    },
    "debris": {
      "lead": "{name} 是一块被追踪的碎片",
      "origin": "是 {origin} 留下的",
      "brokeUp": "后者在 {year} 年解体了",
      "decay": "预计大约在 {date} 坠回大气层",
      "altitude": "高 {alt} 公里",
      "burnsUp": "几乎全部会在下落途中烧尽"
    },
    "rocket": {
      "lead": "{name} 是一次火箭发射",
      "leadWithPad": "{name} 是一次从 {pad} 进行的火箭发射",
      "leadStage": "{name} 是一节用完的火箭级，正绕着地球运行",
      "stageLaunched": "{year} 年发射",
      "whyCountdown": "将在{when}升空",
      "whyFlown": "它在{when}升空",
      "destination": "目的地是 {destination}",
      "missionType": "这是一次 {missionType} 任务",
      "illustrative": "这里画的轨迹只是爬升过程的示意草图，不是实测的路径"
    },
    "probe": {
      "lead": "{name} 是一个在太阳系里飞行的航天器",
      "leadOrbits": "{name} 是一个绕着{world}运行的航天器",
      "destination": "正在飞往 {destination} 的路上",
      "lightTime": "远到无线电信号单程要 {mins} 分钟",
      "lightTimeSeconds": "近到无线电信号单程只要 {secs} 秒",
      "lightTimeHours": "远到无线电信号单程要 {hours} 小时",
      "distanceSun": "离太阳 {au} 天文单位",
      "milestone": "预定在 {date} 迎来 {milestone}"
    },
    "telescope": {
      "lead": "{name} 是一台太空望远镜",
      "observing": "这一周对准了 {target}",
      "station": "停靠在 {station}",
      "altitude": "高 {alt} 公里",
      "sees": "它观测的波段是 {band}"
    },
    "asteroid": {
      "lead": "{name} 是一个近地天体，沿着自己的轨道绕太阳运行",
      "leadMainBelt": "{name} 是主带里的一颗小行星，位于火星和木星之间",
      "leadBeyond": "{name} 是海王星之外的一个小天体，沿着自己的轨道绕太阳运行",
      "leadDwarf": "{name} 是一颗矮行星，沿着自己的轨道绕太阳运行",
      "leadDwarfBelt": "{name} 是小行星带里的一颗矮行星，位于火星和木星之间",
      "leadDwarfBeyond": "{name} 是海王星之外的一颗矮行星",
      "leadDwarfFarBeyond": "{name} 是远在海王星之外的一颗矮行星",
      "leadInterstellarOut": "{name} 来自另一颗恒星，正飞出太阳系",
      "leadInterstellarIn": "{name} 来自另一颗恒星，正朝着太阳飞来",
      "distanceSun": "离太阳 {au} 天文单位",
      "whyApproach": "{date} 飞过地球，距离是月球距离的 {ld} 倍",
      "size": "{size}",
      "willNotHit": "它不会撞上地球"
    },
    "comet": {
      "lead": "{name} 是一颗彗星，沿着一个很长的大圈绕太阳运行",
      "leadPeriodic": "{name} 是一颗每 {n} 年绕太阳一圈的彗星",
      "leadInterstellarOut": "{name} 是来自另一颗恒星的彗星，正飞出太阳系",
      "leadInterstellarIn": "{name} 是来自另一颗恒星的彗星，正朝着太阳飞来",
      "whyPerihelion": "{date} 离太阳最近",
      "nakedEye": "亮得不用望远镜也能找到",
      "faint": "太暗，没有望远镜看不到",
      "distanceSun": "在 {au} 天文单位之外"
    },
    "oddity": {
      "lead": "{fact}",
      "fallback": "{name} 是人们送出地球的奇特物品之一"
    },
    "site": {
      "lead": "{name} 是地面上与航天器协同工作的一个地方",
      "leadKind": "{name} 是{a}{kind}",
      "where": "位于{where}",
      "whyDsn": "此刻正在和 {spacecraft} 通信",
      "whyLaunch": "预定{when}发射 {launch}",
      "mpc": "它的小行星中心代码是 {code}",
      "closed": "{year} 年关闭",
      "kinds": {
        "pad": "发射台",
        "dish": "射电天线",
        "observatory": "天文台",
        "tracking": "跟踪站",
        "launch-site": "发射场",
        "landing-site": "着陆点"
      }
    },
    "shower": {
      "lead": "{name} 是一场流星雨",
      "peak": "大约 {date} 达到极大",
      "speed": "流星以每秒 {n} 公里的速度撞进大气",
      "parent": "来自 {parent} 留下的尘埃"
    },
    "world": {
      "lead": "{name} 是太阳系里的一个天体",
      "leadMoon": "{name} 是地球自己的卫星",
      "leadSun": "{name} 是太阳系中心的那颗恒星",
      "distanceKm": "相距 {n} 公里",
      "whyPhase": "今晚是{phase}",
      "whyRise": "在你那里 {time} 升起",
      "distance": "{distance}",
      "diameter": "直径大约 {n} 公里",
      "leadWhat": "{name} 是{what}",
      "what": {
        "pluto": "海王星之外的一颗矮行星，直到 2006 年都被算作第九大行星",
        "io": "木星的四颗大卫星之一，也是太阳系里火山活动最剧烈的天体",
        "europa": "木星的四颗大卫星之一，冰层下面有一片咸水海洋",
        "ganymede": "木星最大的卫星，也是太阳系里最大的卫星，比水星还大",
        "callisto": "木星的四颗大卫星之一，也是太阳系里撞击坑最密集的天体",
        "titan": "土星最大的卫星，笼罩在浓厚的橙色雾霾下，有甲烷湖；Huygens 2005 年在那里着陆",
        "enceladus": "土星的一颗小冰卫星，它的间歇泉把冰层下的海洋喷向太空",
        "triton": "海王星最大的卫星；它逆向公转，很可能是被俘获的柯伊伯带天体",
        "charon": "冥王星最大的卫星，大小是冥王星的一半；这两个天体始终以同一面朝着对方",
        "phobos": "火星两颗卫星里较大的一颗，是一块凹凸不平的岩石，正以每世纪 1.8 米的速度朝火星螺旋靠近",
        "deimos": "火星两颗卫星里较小的一颗，是一块布满撞击坑的凹凸不平的小岩石",
        "mimas": "土星最靠内的圆形卫星，上面有一个撞击坑，宽度是整个卫星的三分之一",
        "tethys": "土星第五大卫星，几乎是纯水冰，被一道大裂谷和一个巨大的撞击坑劈开",
        "dione": "土星的一颗冰卫星，它的后随半球布满了明亮冰崖织成的网",
        "rhea": "土星第二大卫星，是一个冰和岩石组成的、冻结的脏雪球",
        "iapetus": "土星第三大卫星：一面像煤一样黑，另一面亮十倍",
        "miranda": "天王星五颗大卫星里最小的一颗，有深达大峡谷 12 倍的峡谷",
        "ariel": "天王星五颗大卫星里最亮、看起来最年轻的一颗，被断层谷纵横切割",
        "umbriel": "天王星大卫星里最暗的一颗，只反射照到它的光的五分之一左右",
        "titania": "天王星最大的卫星，中性的灰色，被近 1600 公里长的断层谷劈开",
        "oberon": "天王星第二大卫星，暗色，布满撞击坑，上面有一座 6 公里高的山"
      }
    }
  },
  "live": {
    "label": "此刻离地球",
    "km": "公里",
    "light": "光需要",
    "lightYears": "光年",
    "noteFar": "根据画出的位置推算，保留三位有效数字。它不会跳动。",
    "note": "根据画出的轨道推算。最后几位数字显示的是它在移动，并不是它精确到一公里的位置。",
    "seconds": "{s} 秒",
    "minSec": "{min} 分 {s} 秒",
    "hourMinSec": "{h} 小时 {min} 分 {s} 秒",
    "sparkLabel": "离地球的距离",
    "sparkAria": "从 {from} 到 {to} 离地球的距离。{closest}",
    "sparkNow": "现在",
    "closest": "最近：{date} · {dist}",
    "closestAbout": "最近：大约 {date} · {dist}",
    "months": [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月"
    ],
    "shortDate": "{year}年{month}{day}日",
    "closestTitle": "把时钟拨到这次最近的时刻",
    "moonDistances": "{n} 倍月球距离",
    "au": "{n} AU",
    "sparkNote": "根据画出的轨道推算，每六天一个点。",
    "sparkApprox": "离得这么近，日期和距离只是近似的：地球的引力没有算进去。",
    "upYears": "已在天上 {n} 年：{date}发射",
    "upOneYear": "已在天上 1 年：{date}发射",
    "upUnderAYear": "在天上不到一年：{date}发射",
    "upSinceYear": "{year} 年发射：已在天上约 {n} 年",
    "upSinceYearNew": "{year} 年发射",
    "smallBodyHonest": "根据它的轨道，按海平面的地平线推算。在天上，不等于亮到能看见：大多数需要望远镜。"
  },
  "crew": {
    "label": "船上的人",
    "count": "船上有 {n} 人",
    "countOne": "船上有 1 人",
    "hint": "船上 {n} 人",
    "person": "{agency} · 已在太空 {days} 天",
    "personNoAgency": "已在太空 {days} 天",
    "dockedLabel": "现在对接着的，以及从什么时候起",
    "docked": "{port} · {date}",
    "asOf": "{age}从 Launch Library 2 (The Space Devs) 读取。",
    "stale": "{date}读取：已经超过两天，可能有变化。",
    "joined": "名字是现在对接着的各个飞行器的乘组。",
    "unmatched": "存档里的名字和这个人数对不上，所以没有显示。",
    "waiting": "正在读取乘组名单。",
    "none": "这座空间站没有乘组名单。"
  },
  "happened7": {
    "launchesFrom": "发射自{place}",
    "reached": "进入了轨道",
    "failed": "没有进入轨道",
    "partial": "进入了轨道，但不是原计划的那一条",
    "launchDetail": "{rocket}：{status}，{from}",
    "launchDetailNoPlace": "{rocket}：{status}",
    "cameDown": "{date}坠落（星表中的坠落日期）",
    "debris": "以及 {n} 块碎片",
    "debrisOne": "以及 1 块碎片",
    "showAll": "显示全部 {n} 项",
    "showFewer": "收起",
    "asOf": "发射信息{age}从 Launch Library 2 读取。",
    "stale": "发射信息{date}读取：已经超过两天。",
    "none": "最近七天没有存档。",
    "waiting": "正在读取发生了什么。",
    "decays": "坠落的东西",
    "decaysTitle": "会读取整个星表，大约 1.5 MB",
    "decaysNone": "最近七天没有完整的东西坠落。",
    "decaysFailed": "星表读取不到。",
    "flyTitle": "飞到它发射的地方",
    "ago": "{age}"
  },
  "oldest": {
    "label": "在天上最久的",
    "row": "{years} 年 · {date}发射",
    "note": "仍在轨道上的有效载荷和火箭箭体，按星表里的发射日期排序。",
    "showTitle": "在地图上显示它"
  },
  "links": {
    "row": "{words} · {publisher}",
    "title": "在新标签页中打开 {publisher} 自己的页面"
  },
  "placeKeep": {
    "group": "你的位置",
    "change": "更改位置",
    "changeTitle": "选一个城市，或者用浏览器告诉我们的位置",
    "remember": "记住这个位置",
    "rememberTitle": "只保存在这个浏览器里，精确到 0.1°",
    "forget": "忘掉这个位置",
    "forgetTitle": "删除这个浏览器里保存的位置",
    "kept": "只保存在这个浏览器里。",
    "share": "分享这个位置",
    "shareTitle": "复制一个带有这个位置（精确到 0.1°）的链接",
    "copied": "链接已复制。它带着这个位置，精确到 0.1°。",
    "copyFailed": "链接无法复制。"
  },
  "scale": {
    "least": "行星至少画大了 {n} 倍",
    "one": "{name} 画大了 {n} 倍",
    "title": "圆点比行星宽。点按查看真实大小。",
    "trueLine": "真实大小：{name} 在这里宽 {px} 像素",
    "trueTitle": "最宽的行星，圆点已收起。点按再画出圆点。"
  },
  "launchChip": {
    "rocket": "火箭发射：{name}",
    "opens": "点按打开它的卡片",
    "train": "新的 {n} 颗 Starlink 列车，将在{when}从你头顶飞过"
  },
  "welcome": {
    "label": "初次访问",
    "title": "第一次来",
    "dots": "每一个圆点都是真实的东西。点一个看看。",
    "move": "拖动来转动，滚动来拉近。",
    "moveTouch": "拖动来转动，双指捏合来拉近。",
    "trips": "导览旅程，几分钟讲一个故事。",
    "trip": "导览旅程",
    "tripTitle": "开始列表里的第一个旅程",
    "look": "随便看看",
    "lookTitle": "收起这几行提示"
  },
  "opening": {
    "label": "开场",
    "from": "出发地 {source}",
    "wait": "正在准备旅程",
    "skip": "按任意键或点按可跳过"
  },
  "base": {
    "label": "回到起点",
    "title": "回到起点：地球，现在，不选中任何东西",
    "name": "起点",
    "trip": "退出旅程，回到起点"
  },
  "exoface": {
    "tag": "艺术想象图",
    "measured": "实测：{parts}。",
    "estimated": "估计：{parts}。",
    "least": "至少 {n} 倍地球质量。",
    "radius": "{n} 倍地球半径",
    "mass": "{n} 倍地球质量",
    "a": "\u200b",
    "an": "\u200b",
    "yearHours": "{a}一年长 {n} 小时",
    "yearDays": "{a}一年长 {n} 天",
    "yearYears": "绕一圈 {n} 年",
    "join": "，",
    "missing": "—",
    "surface": "表面是想象出来的。",
    "clouds": "云顶是想象出来的。",
    "nothingMeasured": "这里没有任何东西是实测的。",
    "whole": "整个世界都是想象出来的。",
    "imaginedName": "想象世界 {n} 号",
    "another": "换一个世界",
    "back": "回到地图",
    "stageLabel": "一个想象中的世界",
    "why": "画成{cls}，{climate}：是推算出来的，不是看到的。",
    "whyGiant": "画成{cls}：根据它的大小推算，不是看到的。",
    "cls": {
      "rock": "岩质世界",
      "superEarth": "超级地球",
      "water": "水世界",
      "miniNeptune": "迷你海王星",
      "iceGiant": "冰巨星",
      "gasGiant": "气态巨行星"
    },
    "climate": {
      "lava": "表面在它的恒星下熔化",
      "desert": "炎热干燥",
      "temperate": "温和到足以有海洋",
      "snowball": "完全冻结",
      "eyeball": "始终以同一面朝着它的恒星"
    }
  },
  "deep": {
    "inside": "在{parent}之内",
    "companion": "{parent}的伴随天体",
    "kinds": {
      "HII": "发射星云",
      "PN": "行星状星云",
      "SNR": "超新星遗迹",
      "RfN": "反射星云",
      "DrkN": "暗星云",
      "GCl": "球状星团"
    },
    "back": "回到{parent}",
    "backTitle": "飞出去，回到包着它的{parent}"
  },
  "deepHelix": {
    "card": {
      "helix": "它的光取自 ESO 的照片，它的形状取自 O’Dell、McCullough 和 Meixner (2004)：一个倾斜 23° 的内盘，和一个倾斜 53° 的外环。那些亮结位于它们实测的距离上。还没有经过天文学家审阅。"
    },
    "how": "Hubble 和地面望远镜显示的是两个椭圆，499″ × 459″ 和 742″ × 446″。把它们看成是斜着看到的圆，就是两个分别倾斜 23° 和 53° 的环，而亮结朝向我们和远离我们的速度，说明了每个环的哪一侧离我们更近 (O’Dell、McCullough 和 Meixner 2004)。"
  },
  "deepLmc": {
    "card": {
      "lmc": "这个模型根据它的照片，以及 Gaia 对它自己的恒星的计数建成，并按实测的角度倾斜。"
    },
    "rows": {
      "dso-lmc": [
        [
          "它的恒星的纵深",
          "没有逐颗恒星测量：在这么远的距离上，恒星的视差太小了。模型把它的恒星，铺在已知的盘的厚度之内。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-tarantula-nebula": [
        [
          "在大麦哲伦云里的纵深",
          "没有实测：它按大麦哲伦云的距离，沿它自己的方向画出。在倾斜的盘上，它可能近 2000 光年左右。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ]
    }
  },
  "deepGalaxy": {},
  "deepCosmos": {
    "horizon": "可观测宇宙的边缘",
    "horizonNow": "现在大约在 {n} 十亿光年之外",
    "horizonWhy": "它的光在 {age} 十亿年前出发；之后空间一直在膨胀",
    "edge": "{n} 十亿光年：超出我们能看到的一切",
    "edgeWhy": "可观测宇宙在大约 {h} 十亿光年之外结束。",
    "edgeNothing": "这里没有任何实测到的东西：这一带是示意的。",
    "cmbTitle": "最古老的光，在我们的天空中的样子",
    "cmbWhen": "它在大爆炸后大约 {k} 年离开",
    "cmbPainted": "画在它出发的那个球面内侧：这是示意图",
    "cmbElse": "从别的任何地方看，这张图都会不同",
    "cmbCold": "−{n} µK",
    "cmbMid": "平均 {t} K",
    "cmbWarm": "+{n} µK",
    "cmbSay": "颜色标尺：蓝色表示比 {t} 开尔文最多低百万分之 {n} 度，橙色表示最多高 {n}",
    "cmbSource": "WMAP 九年数据图，NASA"
  },
  "deepOrion": {
    "card": {
      "orion": "它的光取自 ESO 的照片，它的形状是参照 Wen 和 O’Dell (1995) 以及 O’Dell (2001) 重建的：一层薄薄的发光层，在一团暗云朝向我们的那一面上，四边形星团大约在它前方 0.2 秒差距处。还没有经过天文学家审阅。"
    },
    "rows": {
      "dso-m42": [
        [
          "它的纵深形状",
          "是重建的。四边形星团附近是实测的：发光层大约在它最亮的恒星后方 0.2 秒差距处。再往外，纵深依据已发表的、一个朝向我们敞开的碗的图像，不是实测。"
        ],
        [
          "它的后面",
          "星云就是从这团暗分子云里雕刻出来的。从后面看，星云隐藏在这团云里。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-m43": [
        [
          "它的纵深形状",
          "是重建的：同一团云上一个较小的凹处，被恒星 NU Orionis 照亮。它的纵深没有实测。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ]
    },
    "how": "星云的光，来自一层薄薄的地方：四边形星团里最亮那颗恒星的光，侵蚀着一团暗云。Wen 和 O’Dell (1995) 根据这一层的亮度，绘出它位于那颗恒星后方多远的地方，因为它更近的一块，会接收到更多的光。"
  },
  "r12Truth": {
    "here": "这张卡片上",
    "words": "各处通用的词语",
    "terms": "这张卡片上的词语",
    "rows": {
      "where": "它在哪里",
      "drawnNow": "现在画的",
      "drawn": "画的是什么",
      "photo": "照片拍摄者",
      "filters": "滤镜",
      "colours": "颜色",
      "taken": "拍摄时间",
      "released": "发布时间",
      "sky": "显示的天区",
      "survey": "巡天",
      "look": "外观"
    },
    "span": "{a} 到 {b}",
    "notPublished": "日期未公布",
    "position": {
      "measured": "由仪器在已知的时间看到",
      "inferred": "从较早的一次测量向前推算",
      "illustrative": "画出来是为了说明意思，不是实测",
      "sample": "内置的样本数据，不是实时的"
    },
    "drawn": {
      "photograph": "真实的光，从我们这一侧拍下来",
      "reconstruction": "根据已发表研究做出的三维形状",
      "model": "这一类天体的模型，不是它自己的恒星",
      "catalogue": "巡天测得的位置",
      "illustration": "画出来是为了显示这一类，不是它自己"
    },
    "colours": {
      "broadband": "宽带彩色滤镜",
      "mixed": "彩色滤镜加氢",
      "narrowband": "把气体映射成颜色",
      "unstated": "没有说明"
    },
    "falseColour": "{band}，伪彩色",
    "glossary": [
      {
        "term": "秒差距",
        "match": [
          "kpc"
        ],
        "say": "大约 3.26 光年：从这个距离看，地球的轨道只有一角秒宽。论文里写作 pc，一千个写作 kpc。"
      },
      {
        "term": "百万光年",
        "match": [
          "百万年前"
        ],
        "say": "一百万光年，写作 Mly。仙女座星系是最近的大星系，大约在 250 万光年之外。"
      },
      {
        "term": "十亿光年",
        "match": [
          "十亿年前"
        ],
        "say": "一千个百万光年，写作 Gly。我们能看到的范围的边缘，现在大约在 460 亿光年之外。"
      },
      {
        "term": "回溯时间",
        "match": [
          "出发于"
        ],
        "say": "我们看到的光，是多久以前离开那个天体的。来自遥远星系的光，是几十亿年前的：我们看到的是它们那时的样子。"
      },
      {
        "term": "共动距离",
        "match": [
          "共动",
          "十亿光年"
        ],
        "say": "某个天体现在有多远，要把它的光出发之后空间膨胀了多少算进去。在很远的地方，它比光的旅行时间所显示的更远。"
      }
    ],
    "termLine": "{term}：{say}",
    "lookWord": "{mode}外观"
  },
  "r12Sun": {
    "image": "太阳朝向地球的那一半，是 Solar Dynamics Observatory 在 {date} {time} UTC 拍的照片，之后随太阳自转转到了现在的位置：这是 {wl} 埃的极紫外光，来自表面上方圈状结构里接近一百万度的气体，用的是 SDO 的伪彩色，并且画得更亮。它没有看到的背面，是用同样伪彩色的模型画的，两部分在交界处混合在一起。这是浏览用的图片，不是科研用的。图片由 NASA/SDO 以及 AIA、EVE 和 HMI 科学团队提供。",
    "loops": "今天 {n} 个活动区上方的金色圈状结构是示意的：它们的位置来自 NOAA，它们的形状、高度和数量不是。在“实测”外观下，它们会被取下。",
    "loopsOne": "今天一个活动区上方的金色圈状结构是示意的：位置来自 NOAA，形状、高度和数量不是。在“实测”外观下，它们会被取下。",
    "none": "读取不到今天太阳的图片，所以整个圆面都是画出来的。"
  },
  "r12Nearby": {
    "castShadows": "它的阴影，由地面自己的高度投出，高度数据来自 {title}，用的是太阳现在的位置和真实的比例：是实测的，最好时每 670 米一个高度值，所以宽度不到两公里左右的撞击坑，不会投下影子。",
    "sunriseModelled": "它在日出和日落时的颜色是模拟的：阳光被擦过的大气染红，只考虑了瑞利散射。"
  },
  "r12Giants": {
    "spot": "只有一个例外：大红斑放在系统 II 经度 {l2}°，是从 JUPOS 团队和英国天文学会在 {date} 测得的位置 ({at}°) 出发，按每月 {rate}° 的速度推过来的，这个速度取那一年他们测得的两种漂移速度 ({lo} 和 {hi}) 的中间值，所以到现在，它可能在两侧各偏 {pm}°。地图被转到让它处在那里，其余的云也随它一起转动。",
    "rings": {
      "uranus": "它的环在实测的距离上，也和实际一样暗：环里的颗粒只反射大约 1.5% 的光，是它云层反射的三十分之一，所以在行星前面，它们是暗色的细线；它们被画宽了 10 倍，这样才看得见，而“深度”曝光会把它们提亮 4 倍，就像长时间曝光那样",
      "jupiter": "它暗淡的环，在 NASA 数据表给出的距离和光学厚度上：晕和主环，是只挡住百万分之几光线的尘埃和暗色颗粒；它们外面两条更暗的薄纱环没有画出来。从太阳那一侧看，它几乎不存在；太阳在它背后时，尘埃会把光向前散射，它就显现出来，就像伽利略号和 New Horizons 从夜面看到的那样。为了让它能被看见，它在“相机”曝光下画得比实际亮 8000 倍，在“深度”曝光下亮 40000 倍；在“肉眼”曝光下不画出来，这才是它看起来的样子，在最低画质下也不画。晕大约有 10000 公里厚，画成平的，亮度不超过它的厚度所允许的；晕怎样向内变淡，主环怎样朝着它清晰的外缘变得更浓，有多少光是尘埃的，尘埃把光向前散射多远，环略带红色的颜色，以及它画得最亮能亮到什么程度，都是示意的"
    }
  },
  "r12Plumes": {
    "line": "按所见画出的羽流：{list}。",
    "item": "{name}，高约 {km} 公里（{by}，{when}）",
    "jets": "四条虎纹上的喷流，至少 {km} 公里高（{by}，{when}）",
    "truth": "它们的位置和高度是实测的；颗粒的弧线是模型，它们的光被拉伸了，这样才能看见。它们现在可能并没有在喷发。",
    "stripes": "这些条纹，是按地名录里的中心和长度画成直线的；沿着它们的 101 个喷流的位置，是模型。",
    "column": "它们是暗色的柱子，顶端被风吹向西边；柱子有多宽并不知道，所以画得很窄。",
    "hot": "夜面上橙色的点，是熔岩发光的热点（{list}）：它们的位置是实测的，亮度不是。",
    "film": "在“电影”外观下，颗粒沿弧线飞行的速度，是时钟的 {k} 倍。",
    "still": "它们保持静止，就像在“实测”外观下，或在减少动态效果时一样。",
    "review": "还没有经过天文学家审阅。",
    "span": "{a} 到 {b}"
  },
  "r12Clusters": {
    "rows": {},
    "templates": {
      "starsLabel": "它的恒星",
      "lightLabel": "它们的光",
      "depthLabel": "它们的纵深",
      "reviewLabel": "审阅",
      "globularStars": "这一类天体的模型，不是它自己的恒星：{n} 颗比主序转折点更亮的恒星，按 King 轮廓、用 Harris 的核半径（{rc} 光年）和潮汐半径（{rt}）来放置。它们的数量、亮度和颜色都是模型。",
      "globularLight": "合起来大约占星团光度的 {pct}%（绝对星等 {mv}）；那些暗得没有一个点能代表的恒星，就是光晕。画到 10 等，就像相机曝光所显示的那样。",
      "openStars": "来自 Gaia 的 {n} 个成员星（Hunt 和 Reffert 2023，{name}），每一颗的成员概率至少是 {p}，都在它的潮汐半径之内。画到 10 等，就像相机曝光所显示的那样。",
      "openStarsHyg": "来自 Gaia 的 {n} 个成员星（Hunt 和 Reffert 2023，{name}），每一颗的成员概率至少是 {p}，都在它的潮汐半径之内；另有 {h} 颗更亮的，是地图自己星表里的恒星。画到 10 等，就像相机曝光所显示的那样。",
      "openDepthSome": "其中 {m} 颗按它们自己的视差放置；另外 {k} 颗放在星团的距离上，它们在星团里的纵深是模拟的。",
      "openDepthNone": "它们的方向是实测的；它们在星团里的纵深是模拟的，因为在这么远的距离上，单颗恒星的视差不够精确。",
      "review": "这个模型还没有经过天文学家审阅。"
    }
  },
  "a45": {
    "farNote": "它现在有多远（{how}），根据它的红移 {z}，按 Planck 2018 宇宙学模型得出",
    "comoving": "共动距离",
    "pulsarDistance": [
      "来自这颗脉冲星自己的视差",
      "它所属的球状星团、超新星遗迹或其他天体的距离",
      "一个模型根据无线电信号做出的估计（银河系自由电子的 YMW16 模型），不是实测：可能偏差很大"
    ],
    "shape": {
      "galaxy": "一个标记，位于它的红移所给出的距离上；这么远的星系最多只有几个像素宽，所以它的形状没有画出来",
      "browndwarf": "实测距离上的一个圆环；褐矮星在这个比例下只是一个点，几乎不发出可见光",
      "whitedwarf": "实测距离上的一个圆环；白矮星本身在这个比例下只是一个点",
      "cluster": "星系团 X 射线中心处的一个标记；只有室女座、后发座、天炉座和英仙座的成员星系画了出来（本星系群那一档）"
    },
    "quasarZ7": "一个类星体，我们看到的是它在大爆炸后大约 {age} 百万年时的样子：红移 7 以外已知的 {n} 个之一。",
    "unplaced": {
      "unnamed": "HYG 恒星 {id}",
      "lead": "{name} 是你正看着的方向上的一颗恒星；没有人测量过它有多远",
      "leadColour": "{name} 是{a}{colour}的恒星，在你正看着的方向上；没有人测量过它有多远",
      "note": "只画在天空上，不在太空里的任何地方，因为要有位置，就得有距离。",
      "cite": "HYG 恒星数据库 v4.4（CC BY-SA 4.0）：只有方向和星等"
    }
  },
  "r12Far": {
    "quasar": {
      "shape": "一个明亮的点，在它的红移所指的位置，旁边有一个圆环标出位置；它的吸积盘和喷流都太小了，画不出来",
      "host": "它的宿主星系画成暗淡的圆形，角大小按数据来源给出的，从这里看宽 {size} 角秒；实际上约有 {ly} 光年。它的扁度和倾角没有画出来。",
      "point": "数据来源没有给出它的宿主星系的大小，所以没有画。"
    },
    "cluster": {
      "members": "来自 {catalogue} 的 {n} 个成员星系；其中 {own} 个的距离是逐个测得的。",
      "membersNoOwn": "来自 {catalogue} 的 {n} 个成员星系。",
      "distanceSbf": "这个星系团在 {mpc} 兆秒差距（{mly} 百万光年）之外，是用表面亮度涨落法测得的多个距离的平均值。",
      "distanceZ": "这个星系团在 {mly} 百万光年之外：取它的成员的平均红移（{z}），再按这张地图所用的唯一的宇宙学模型换算成共动距离。",
      "depthMeasured": "没有自己距离的星系，按星系团实测的离散度 {rms} 兆秒差距分布在纵深上；这样的放置是模型。",
      "depthModelled": "这里没有一个星系有自己的距离，所以它们在纵深上的分布，和在天空中一样宽，就像这个星系团是圆的一样；这样的放置是模型。",
      "size": "每个星系的宽度，都按星表里的半光半径，画成中间亮的圆形；它的扁度和倾角没有画出来。"
    }
  },
  "deepRing": {
    "card": {
      "m57": "它的光取自 Hubble 的照片，它的形状取自 O’Dell、Ferland、Henney 和 Peimbert (2013)：一个倾斜 13.5° 的厚环，几乎是沿着轴线看过去，中间偏蓝的气体画成朝向我们和远离我们伸展。它的颜色是照片的，是通过窄带滤镜拍到的。还没有经过天文学家审阅。",
      "m27": "它的光取自 NOIRLab 的照片，用的是它的气体自己的色调；它的形状是重建的：明亮的腰部是几乎侧向看到的厚环，较暗的耳朵是它的瓣，依据的是 Meaburn 等人 (2005) 测得的壳层速度。还没有经过天文学家审阅。",
      "southern-ring": "它的光取自 Webb 的红外照片；它的形状依据 Kastner 等人 (2024) 和 De Marco 等人 (2022)：一个几乎沿着轴线看过去的环，一个穿过环的气泡，以及包着两者的分子晕。还没有经过天文学家审阅。"
    },
    "rows": {
      "dso-m57": [
        [
          "它的距离",
          "它的中心恒星 Gaia DR3 2090486618786534784 的视差 (Gaia DR3)：1.270 ± 0.044 毫角秒，约 2570 光年（2480 到 2660）。"
        ],
        [
          "它的纵深形状",
          "是重建的。环在天空中的大小、长轴的倾斜，以及哪一端更近，是实测的。它的厚度，以及穿过中间的气体的形态则不是：画出来是示意。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-m27": [
        [
          "它的纵深形状",
          "是重建的。它的大小、它在天空中的角度，以及它的壳层的速度，是实测的；腰部是几乎侧向的环，耳朵怎样朝向我们和远离我们伸展，是对这种外观的星云的通常解读，画出来是示意。"
        ],
        [
          "它的颜色",
          "是它的气体自己的色调，来自照片的窄带滤镜：氧是青绿色，氢和硫是红色。每一种显示得多强，由我们决定。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-southern-ring-nebula": [
        [
          "它的纵深形状",
          "是重建的。它明亮的环是从偏离轴线 15 到 30° 的方向看到的，这一点是实测的 (Kastner 等人，2024)；哪一侧更近、环的厚度和气泡的长度，是示意的。"
        ],
        [
          "它的颜色",
          "是任何眼睛都看不到的红外光，由 Webb 图像的制作者上了颜色。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ]
    },
    "how": "Hubble 用单一颜色的光拍的照片，加上整个星云里测得的气体速度，显示出一个几乎正对着我们的厚环：它的长轴倾斜 13.5°，东北端离我们更近。更快的气体充满它的中间，并沿着我们的视线朝向我们和远离我们伸展 (O’Dell、Ferland、Henney 和 Peimbert 2013)。"
  },
  "r12Dust": {
    "card": {
      "crab": "它的光取自 Hubble 的照片，是伪彩色，附着在一层外壳上，外壳的形状依据 Martin、Milisavljevic 和 Drissen (2021)：一个约 4 秒差距长的纤维笼子，中间是空的。还没有经过天文学家审阅。",
      "veil": "它的光取自 NOIRLab 的照片，是伪彩色，附着在一个宽 37 秒差距的薄球壳上 (Fesen 等人，2018)：那些纤维就是它的边缘，从侧面看到的样子。还没有经过天文学家审阅。",
      "horsehead": "它的暗，是从 NOIRLab 的照片里读出来的：尘埃在 IC 434 发光的气体前面，吸收并染红了它后面的东西，自己不发光。还没有经过天文学家审阅。",
      "coalsack": "它的暗，是从它周围的银河读出来的：一团大约在 590 光年之外的尘埃，让它后面的恒星变暗、变红。还没有经过天文学家审阅。",
      "m78": "它的光来自 NOIRLab 的照片：尘埃散射着它前方那颗恒星的蓝光，在一团暗云的表面上。它的纵深是重建的。还没有经过天文学家审阅。",
      "iris": "它的光来自 NOIRLab 的照片：尘埃散射着年轻恒星 HD 200775 的光，在它那团云的一个凹处里。它的纵深是重建的。还没有经过天文学家审阅。",
      "m45": "它的光来自 NOIRLab 的照片：一团尘埃飘过星团，就在恒星的前面，散射着它们的蓝光 (Ritchey 等人，2006)。它的纵深是重建的。还没有经过天文学家审阅。"
    },
    "rows": {
      "dso-m1": [
        [
          "它的纵深形状",
          "根据实测的轮廓重建。那些纤维沿着脉冲星风的轴线延伸约 2 秒差距，离中心半秒差距以内一根也没有 (Martin 等人，2021)。画成沿那条轴线的椭球；哪一端离我们更近，是假设的。"
        ],
        [
          "它的颜色",
          "伪彩色：照片里氧和硫的窄带滤镜，由图片的制作者映射成颜色。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-veil-nebula": [
        [
          "它的纵深形状",
          "是重建的：一个宽 37 秒差距的球，大小和距离是 Fesen 等人 (2018) 测得的。壳层的厚度是示意的。"
        ],
        [
          "它的颜色",
          "伪彩色：照片里氧、硫和氢的窄带滤镜，由图片的制作者映射成颜色。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-horsehead-nebula": [
        [
          "它的纵深形状",
          "是重建的。尘埃在 IC 434 发光的气体前面，这是观测到的；前面多远、有多厚，是示意的。"
        ],
        [
          "尘埃做了什么",
          "它只吸收：它后面的恒星和光晕被减弱了，蓝光比红光减弱得更多，所以它们看起来更红。它自己不发光。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-coalsack": [
        [
          "它有多暗",
          "是从这里的银河比附近、离银河中线同样距离的地方暗多少读出来的。这是估计值，比红外地图给出的低，因为云前面的恒星加上了它们的光。"
        ],
        [
          "尘埃做了什么",
          "它只吸收：它后面的恒星被减弱、被染红。它前面的恒星则不会。东北方向的一部分暗，是远在后面的第二团云，这里画在了近处的距离上。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-m78": [
        [
          "它的纵深形状",
          "是重建的：被照亮的尘埃是一张薄片，它的恒星在前面，后面是一团暗云。这些纵深是示意的。"
        ],
        [
          "从另一侧看",
          "是模拟的：尘埃向前散射的光比向侧面散射的多，所以从另一侧看，同样的尘埃会显得更亮或更暗。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-iris-nebula": [
        [
          "它的纵深形状",
          "是重建的：被照亮的壁是一张薄片，恒星在前面，后面是一团暗云。这些纵深是示意的。"
        ],
        [
          "从另一侧看",
          "是模拟的：尘埃向前散射的光比向侧面散射的多，所以从另一侧看，同样的尘埃会显得更亮或更暗。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ],
      "dso-m45": [
        [
          "它的纵深形状",
          "是重建的。气体在恒星前面，从恒星的光可以看出来；前面多远、尘埃多厚是示意的，恒星自己在星团里的纵深是一个固定的模型，不是实测。"
        ],
        [
          "尘埃做了什么",
          "它散射恒星的光，蓝光散射得最多，所以最亮的几颗周围泛着蓝光，Merope 和 Maia 最明显。这是一团路过的云，不是这些恒星诞生的地方。"
        ],
        [
          "审阅",
          "这个模型还没有经过天文学家审阅。"
        ]
      ]
    },
    "how": "超新星遗迹的气体以稳定的速度向外飞散，所以它朝向或远离我们的速度，说明了它在中心前面或后面多远。Martin、Milisavljevic 和 Drissen (2021) 就是这样，把蟹状星云的 310000 条光谱变成了它的形状。"
  },
  "r12Navigate": {
    "chainLabel": "它在哪里",
    "chainTitle": "飞向{name}",
    "milkyWay": "银河系",
    "outside": "银河系之外",
    "the": [
      "Sun",
      "Moon",
      "Milky Way"
    ],
    "theWord": "\u200b",
    "backParent": "回到{parent}",
    "backParentTitle": "飞出去，回到{parent}",
    "legendTitle": "打开图例：这些词各是什么意思",
    "label": "你在哪里",
    "title": "镜头在阶梯上的位置，从地球一直到本星系群",
    "back": "返回",
    "backTo": "返回{name}",
    "sep": "›",
    "rungs": {
      "earth": "地球",
      "sun": "太阳系",
      "stellar": "附近的恒星",
      "galaxy": "银河系",
      "local-group": "本星系群"
    },
    "notes": {
      "sun": "已加速：太阳在 {distance} 之外",
      "stellar": "已加速：最近的恒星在 {distance} 之外",
      "galaxy": "已加速：我们星系的中心在 {distance} 之外",
      "local-group": "已加速：仙女座星系在 {distance} 之外"
    }
  },
  "r12Search": {
    "group": "{label} · {n}",
    "groups": {
      "SUN": "太阳",
      "ROCKY_PLANET": "岩质行星",
      "GAS_GIANT": "气态巨行星",
      "ICE_GIANT": "冰巨星",
      "RINGS": "光环",
      "VOLCANIC_MOON": "火山卫星",
      "ICY_MOON": "冰卫星",
      "TITAN": "有大气的卫星",
      "AIRLESS_MOON": "没有大气的卫星",
      "DWARF_PLANET": "矮行星",
      "ASTEROID": "小行星",
      "COMET": "彗星",
      "ARTIFICIAL_SATELLITE": "卫星",
      "LAUNCH_AND_ROCKET": "发射和火箭",
      "SPACE_PROBE": "太空探测器",
      "LANDING_SITE": "着陆点",
      "EXOPLANET": "系外行星",
      "STAR": "恒星",
      "BINARY_AND_MULTIPLE": "双星和聚星",
      "COMPACT_REMNANT": "死亡的恒星",
      "BLACK_HOLE": "黑洞",
      "OPEN_CLUSTER": "疏散星团",
      "GLOBULAR_CLUSTER": "球状星团",
      "EMISSION_NEBULA": "发射星云",
      "PLANETARY_NEBULA": "行星状星云",
      "DARK_NEBULA": "暗星云",
      "REFLECTION_NEBULA": "反射星云",
      "SUPERNOVA_REMNANT": "超新星遗迹",
      "GALAXY_SPIRAL": "旋涡星系",
      "GALAXY_IRREGULAR": "不规则星系",
      "GALAXY_ELLIPTICAL": "椭圆星系",
      "GALAXY_INTERACTION": "相互作用的星系",
      "AGN_QUASAR": "类星体",
      "GALAXY_GROUP": "星系群",
      "GROUND_SITE": "地面站",
      "ODDITY": "奇特天体"
    },
    "other": "其他",
    "byName": "按名称",
    "of": "{world}的{label}",
    "only": "三维模型",
    "onlyTitle": "只列出用三维模型画出的：真实模型或重建模型",
    "real": "真实三维模型",
    "rebuilt": "三维重建",
    "noneWithModel": "这些里面没有一个有三维模型。",
    "counting": "统计中……"
  },
  "r12Access": {
    "motion": {
      "panelTitle": "动态效果",
      "choices": {
        "on": "开",
        "off": "关"
      },
      "titles": {
        "on": "飞行平滑滑动，旅程自己往下走，这是地图本来的设计",
        "off": "每次飞行都是瞬间移动，没有实测依据的东西都不会动，旅程会等你按“下一站”"
      },
      "device": "你的设备要求减少动态效果，所以已关闭。"
    },
    "summary": {
      "label": "屏幕上有什么",
      "stage": "正在看：{stage}。",
      "selected": "已选中 {name}，{kind}。",
      "nothing": "没有选中任何东西。",
      "trip": "旅程第 {n} 站，共 {count} 站：{title}。",
      "tripIntro": "旅程“{title}”已打开。",
      "measured": "按实测绘制。"
    }
  },
  "r13Deep": {
    "card": {
      "dso-tarantula-nebula": "它在我们视线附近的光，来自 Webb 的照片；它的气体是一个模型，参照 Pellegrini、Baldwin 和 Ferland (2011)：星团 R136 周围的一个空腔，位于一层被分子云限制住的发光气体壳之内。还没有经过天文学家审阅。",
      "dso-m43": "它的光取自 ESO 的照片，它的形状重建为和猎户座大星云同一团暗云上的一个较小的凹处，被恒星 NU Orionis 照亮。还没有经过天文学家审阅。",
      "dso-m51": "根据已发表的倾角和结构建成：一个几乎正对着我们的双臂旋涡星系，它的伴星系 NGC 5195 在北旋臂末端的后面，还有伸向它的那条旋臂；纵深是模型。还没有经过天文学家审阅。",
      "dso-m81": "根据已发表的倾角和结构建成：一个巨大而古老的核球，两条缠绕紧密的旋臂，内缘有尘埃。还没有经过天文学家审阅。",
      "dso-m101": "根据已发表的倾角和结构建成：一个几乎正对着我们的大圆盘，许多旋臂，以及天空把它们放在哪里它们就在哪里的巨大恒星形成区。还没有经过天文学家审阅。",
      "dso-m104": "根据已发表的倾角和结构建成：一个巨大的圆形核球，和一个几乎侧向看到的薄盘，尘埃环在前面。还没有经过天文学家审阅。",
      "dso-antennae-galaxies": "两个正在碰撞的星系，位于天空把它们放的地方，还有它们的两条潮汐尾；每一部分在前面还是后面多远，是模型，参照碰撞的模拟。还没有经过天文学家审阅。",
      "dso-m83": "根据已发表的倾角和结构建成：一个几乎正对着我们的棒旋星系，它的旋臂上有很多年轻的恒星和发光的氢。还没有经过天文学家审阅。",
      "dso-ngc-1300": "根据已发表的结构建成：一根长长的星棒，前缘有尘埃带，两端各伸出一条旋臂，它们的形状按 Hubble 的照片对齐。还没有经过天文学家审阅。",
      "dso-centaurus-a": "根据已发表的数据建成：一个巨大的椭圆星系，被一个扭曲的、由尘埃和年轻恒星组成的盘穿过，参照一个拟合 Spitzer 图像的模型；它的两条喷流用伪彩色画出，因为它们发的是 X 射线和无线电波，不是可见光。还没有经过天文学家审阅。"
    }
  },
  "compare": {
    "row": "比较",
    "hint": "按比例",
    "missing": "—",
    "none": "没有",
    "yes": "有",
    "no": "没有",
    "range": "{a} 到 {b}",
    "numUnit": "{num} {unit}",
    "modeLabel": "视图",
    "modes": {
      "pair": "并排",
      "lab": "所有天体"
    },
    "withLabel": "比较对象",
    "scaleLabel": "比例",
    "scales": {
      "true": "按比例",
      "same": "同样宽度"
    },
    "propLabel": "把所有天体按这一项排序",
    "props": {
      "across": "直径",
      "mass": "质量",
      "gravity": "重力",
      "temp": "温度",
      "spin": "自转一圈的时间",
      "year": "一年的长度",
      "dist": "离太阳的距离",
      "moons": "卫星数量"
    },
    "names": {
      "sun": "太阳",
      "mercury": "水星",
      "venus": "金星",
      "earth": "地球",
      "moon": "月球",
      "mars": "火星",
      "jupiter": "木星",
      "saturn": "土星",
      "uranus": "天王星",
      "neptune": "海王星",
      "pluto": "冥王星"
    },
    "the": {
      "sun": "太阳",
      "moon": "月球"
    },
    "wider": "{big}的宽度是{small}的 {n} 倍。",
    "same": "{a}和{b}的宽度差不多。",
    "figure": "{a}和{b}，{how}绘制。",
    "figureTrue": "按同一比例",
    "figureSame": "按同样的宽度，不按比例",
    "tableLabel": "{a}和{b}对照",
    "rows": {
      "across": "直径",
      "mass": "质量",
      "gravity": "重力",
      "temp": "温度",
      "spin": "自转一圈需要",
      "year": "那里的一年",
      "dist": "离太阳",
      "air": "大气",
      "pressure": "气压",
      "moons": "卫星",
      "rings": "光环"
    },
    "units": {
      "km": "公里",
      "earthOne": "倍地球",
      "earths": "倍地球",
      "g": "米/秒²",
      "c": "°C",
      "hours": "小时",
      "days": "天",
      "years": "年",
      "au": "AU",
      "bar": "巴",
      "microbar": "微巴"
    },
    "notes": {
      "average": "平均值",
      "flattened": "平均值；它是扁的",
      "range": "变化范围",
      "bar1": "在 1 巴的高度",
      "edge": "在可见的边缘",
      "photosphere": "可见的表面",
      "retro": "逆向自转",
      "sunSpin": "在纬度 16°",
      "withEarth": "与地球同步",
      "exosphere": "极稀薄的外逸层",
      "photosphereAir": "在光球层"
    },
    "air": {
      "part": "{gas} {share}%",
      "join": "，",
      "almostNone": "几乎没有",
      "noSurface": "没有表面"
    },
    "gas": {
      "hydrogen": "氢",
      "helium": "氦",
      "methane": "甲烷",
      "nitrogen": "氮",
      "oxygen": "氧",
      "argon": "氩",
      "carbon dioxide": "二氧化碳"
    },
    "source": "NASA 的行星数据表，{date}读取。",
    "giantNote": "巨行星没有表面：它的重力和温度，是在 1 巴的高度上的值。",
    "moonsNote": "卫星的数量，会随着新的卫星被确认而增加。",
    "spinNote": "太阳的自转，是数据表里纬度 16° 处的值。",
    "drawnTrue": "按每个天体的平均半径，用同一比例绘制，不是照片。",
    "drawnSame": "宽度相同，所以不按比例。光环保持它在宽度里所占的比例。",
    "tiny": "{name} 在这里不到一个像素，画成一个点。",
    "ringsDrawn": "为了画面好看，光环做了倾斜；它们的半径来自 NASA。",
    "labLog": "柱子是对数刻度，这样小的数值也能看见。",
    "labLinear": "柱子的长短与数量成正比。",
    "labTitle": "和{name}比较",
    "thisCard": "这张卡片上的天体"
  },
  "passportKinds": {
    "kindsTitle": "按种类统计打开过的",
    "noKinds": "还没有什么可以按种类统计。",
    "kinds": {
      "worlds": "行星、卫星和太阳",
      "stations": "空间站",
      "satellites": "卫星和它们的火箭",
      "spacecraft": "探测器和太空望远镜",
      "small": "彗星和小行星",
      "stars": "恒星",
      "exoplanets": "其他恒星的行星",
      "deep": "星云、星系和深空",
      "earth": "地球上的地方和天气"
    },
    "notedTitle": "已记下的",
    "noNoted": "还没有记下什么。在地图上打开一个地方吧。",
    "notedFine": "这是在这个浏览器里，第一次看到某一条成立的日子。只保存在这里，从不排名，也从不发送。",
    "noted": {
      "first": {
        "name": "第一个地方",
        "said": "你在地图上打开了一个地方。"
      },
      "planets": {
        "name": "全部八大行星",
        "said": "你打开了每一颗行星，从水星到海王星。"
      },
      "station": {
        "name": "一座空间站",
        "said": "你打开了一座轨道上的空间站。"
      },
      "craft": {
        "name": "远方的一艘飞船",
        "said": "你打开了一个探测器或太空望远镜。"
      },
      "small": {
        "name": "一颗彗星或小行星",
        "said": "你打开了太阳系里的一个小天体。"
      },
      "star": {
        "name": "一颗恒星",
        "said": "你打开了太阳以外的一颗恒星。"
      },
      "exoplanet": {
        "name": "另一颗恒星的行星",
        "said": "你打开了一颗绕着别的恒星转的行星。"
      },
      "deep": {
        "name": "深空",
        "said": "你打开了一个星云、星系或星团。"
      },
      "trip": {
        "name": "走到终点的旅程",
        "said": "你走完了一个导览旅程。"
      },
      "eyes": {
        "name": "亲眼见过",
        "said": "你给某样东西打了“见过”的钩。"
      },
      "every": {
        "name": "每一种各一个",
        "said": "上面每一种，你至少打开过一个。"
      }
    }
  },
  "photoCompare": {
    "title": "和照片对比",
    "reconstruction": "重建",
    "photograph": "照片",
    "valueText": "照片 {n}%",
    "flying": "正在移到拍摄这张照片的位置。",
    "note": "地图画的是三维模型。照片只在这里显示：它是平的，并且正对着太阳，所以一转开就会淡去。"
  },
  "entrances": {
    "label": "三个入口",
    "tonight": "今晚",
    "tonightTitle": "今晚你头顶有什么，从你的位置看",
    "explore": "探索",
    "exploreTitle": "随便看看整张地图",
    "trip": "导览旅程",
    "tripTitle": "开始列表里的第一个导览旅程"
  },
  "momentPlayer": {
    "micro": "时刻",
    "play": "播放",
    "pause": "暂停",
    "replay": "再播一遍",
    "close": "关闭这个时刻",
    "chapters": "章节",
    "chaptersTitle": "跳到某一章",
    "share": "复制这一秒的链接",
    "copied": "链接已复制",
    "copyFailed": "请复制这个链接：{url}",
    "director": "导演",
    "directorTitle": "把镜头交还给导演",
    "freeNote": "现在镜头归你。拖动来环顾四周；点“导演”把镜头交回去。",
    "scrubber": "任务时间",
    "met": "任务已进行时间",
    "rateTitle": "这里的时间流逝的速度，是当时的 {rate}",
    "realTime": "真实时间",
    "loading": "正在加载这个时刻……",
    "missing": "没有叫 {id} 的时刻。",
    "unreachable": "这个时刻没有加载出来。只有在联网打开过一次之后，它才会保存在这台设备上。",
    "modelMissing": "{model} 的模型没有加载出来；它的轨迹和火焰仍然画着。",
    "chapterOf": "第 {n} 章，共 {m} 章",
    "quoteBy": "{who}，{at}",
    "truthWords": {
      "measured": "实测",
      "reconstructed": "重建",
      "illustrative": "示意"
    },
    "truthLine": "{truth}：{path}。",
    "cutNote": "各级火箭暂时都是从同一个模型上切出来的。",
    "drawnNote": "火焰和蒸汽是画出来的。",
    "groundNote": "发射台附近的地面是示意的；地球地图来自 Solar System Scope，CC BY 4.0。",
    "groundNoteMars": "Ground near the site illustrative; Mars map Solar System Scope, CC BY 4.0.",
    "keys": "空格键播放或暂停，方向键单步，Esc 关闭"
  },
  "momentShelf": {
    "title": "历史时刻",
    "note": "三次任务，按同一个时钟重现，用的是真实的事件时间。轨迹是重建的，并且会这样说明。",
    "minutes": "{m} 分钟",
    "all": "全部 {n} 个历史时刻",
    "fewer": "收起历史时刻",
    "replay": "重现这个时刻",
    "replayTitle": "在任务时钟上重现“{title}”",
    "replayNamed": "重放{title}",
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
        "when": "1969 年 7 月 16 日至 24 日",
        "blurb": "从 39A 发射台到太平洋，途经静海基地：升空、月球、着陆、起飞、回家。"
      },
      "apollo-13": {
        "title": "阿波罗 13 号",
        "when": "1970 年 4 月 11 日至 17 日",
        "blurb": "从 39A 发射台到太平洋：没有实现的登月、爆炸的氧气罐，以及当作救生艇的登月舱。"
      },
      "artemis-ii": {
        "title": "Artemis II",
        "when": "2026 年 4 月 1 日至 10 日",
        "blurb": "从 39B 发射台到圣迭戈外海的太平洋，绕过月球背面。飞了什么、计划了什么，都会分别说明。"
      },
      "sputnik-1": {
        "title": "斯普特尼克 1 号",
        "when": "1957 年 10 月 4 日",
        "blurb": "从拜科努尔到绕地球的第一圈：第一颗人造卫星，一个直径 585 毫米的抛光球体，以及它的哔哔声。"
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
        "when": "1961 年 4 月 12 日",
        "blurb": "尤里·加加林，108 分钟绕地球一圈，从拜科努尔到斯梅洛夫卡附近的一片田野。"
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
      "title": "Saturn V：从点火到分级",
      "blurb": "Apollo 11 的前三分钟，1969 年 7 月 16 日，从 39A 发射场的发射台开始。",
      "chIgnition": "点火",
      "chLiftoff": "升空",
      "chClimb": "穿过最大动压",
      "chStaging": "分级",
      "ignition": "T−8.9 秒：点火程序启动五台 F-1 发动机，先是中间那台，然后是外围成对的。",
      "holddown": "固定臂把整个火箭压在发射台上，直到五台发动机都达到全推力。",
      "liftoff": "升空，13:32:00.6 UTC：五台 F-1，大约 33800 千牛的推力，托起近 3000 吨的重量。",
      "tower": "离开发射塔之后，火箭滚转到飞行方位角，北偏东 72 度。",
      "maxq": "一分钟后超过音速；接着是最大动压，空气推得最猛的时候：35 千帕（735 磅/平方英尺）。",
      "ceco": "T+135 秒：中间那台发动机关机，让加速度保持在 4 g 以下。",
      "staging": "T+161.7 秒：外围发动机关机。在大约 67 公里的高度，S-IC 脱落，它的制动火箭点火。",
      "sii": "T+163.0 秒：S-II 的五台 J-2 发动机点火。氢燃烧的火焰颜色很淡，几乎是透明的。",
      "interstage": "级间段脱落；T+197.9 秒，逃逸塔抛掉。再过 8.5 分钟，就进入停泊轨道。",
      "pathAscent": "时间取自 Apollo 11 任务报告，两个时间之间的高度是近似的",
      "sources": "Apollo 11 任务报告，NASA MSC-00171，1969 年（表 3-I，事件顺序；7.1 节，发射）"
    },
    "vostok-1": {
      "title": "Vostok 1：第一个进入太空的人",
      "blurb": "尤里·加加林，1961 年 4 月 12 日：从拜科努尔出发，绕地球一圈，降落在斯梅洛夫卡附近的一片田野，按任务时钟，共 108 分钟。",
      "chPad": "加加林的起点",
      "chAscent": "上升",
      "chOrbit": "绕地一圈",
      "chRetro": "制动点火",
      "chEntry": "再入",
      "chEject": "弹射",
      "chLand": "着陆",
      "ready": "拜科努尔，1 号发射场，06:07 UTC。27 岁的尤里·加加林，坐在 R-7 火箭顶端的太空舱里。",
      "korolev": "谢尔盖·科罗廖夫在无线电里说：“预级……中间级……主级……升空！”",
      "liftoff": "升空。加加林喊道：“Poyekhali!”，意思是：“咱们走吧！”",
      "boosters": "T+119 秒：四个捆绑助推器燃尽，脱落。",
      "shroud": "T+156 秒：太空舱外面的整流罩被抛掉。",
      "core": "T+300 秒：芯级燃尽，脱落；最后一级点火。",
      "earth": "大约 T+6 分钟，加加林说：“我看见地球了。能见度很好。”",
      "kosberg": "大约 T+10 分钟，最后一级关机。加加林说：“科斯贝格的发动机成功了！”科斯贝格是这台发动机的设计师。",
      "orbit": "进入轨道：181 公里乘 327 公里，与赤道的夹角 64.95 度，绕一圈 89.1 分钟。太空舱和末级分离。",
      "retro": "T+1 小时 18 分，在非洲西海岸上空：制动火箭点火，持续大约 42 秒。时间和地点是公布的；这里它的推力大小，是按着陆点拟合的。",
      "wires": "仪器舱本应在制动点火十秒后分离。可是一束电线拉着它；两个舱体一起翻滚着进入大气。",
      "entry": "电线烧断，球形舱以隔热罩朝前稳定下来。加加林后来报告说，过载超过 10 g。",
      "eject": "在 7 公里的高度，舱门炸开，座椅把加加林弹射出去。Vostok 的球形舱着陆太猛，里面的人受不了。",
      "chutes": "在 2.5 公里的高度，太空舱的主伞打开，宽 27 米；飞行员自己的降落伞几乎马上就打开了。座椅自由落下。",
      "landing": "T+1 小时 48 分：加加林降落在萨拉托夫州恩格斯市西南 26 公里处，距发射 108 分钟。着陆时间，各来源之间相差十分钟。",
      "pathAscent": "爬升是把已公布的事件时间用平滑曲线连起来；两者之间的高度和距离是我们画的",
      "pathOrbit": "轨道、制动点火和再入，是按已公布的时间和着陆的田野拟合的二体弧线，不是跟踪数据",
      "pathPilot": "飞行员在降落伞下的下降是画出来的；没有任何资料给出它离太空舱有多远",
      "srcWiki": "维基百科，Vostok 1（事件时间、轨道、引语；2026 年 11 月 2 日读取）",
      "srcNssdc": "NASA NSSDCA，Vostok 1（轨道、航天器）"
    },
    "apollo-11": {
      "title": "Apollo 11：去月球，再回来",
      "blurb": "1969 年 7 月 16 日，从 39A 发射场出发，到 24 日落入太平洋：升空、月球、静海基地和回家，按任务时钟。",
      "chIgnition": "点火",
      "chLiftoff": "升空",
      "chStaging": "分级",
      "chParking": "停泊轨道",
      "chTli": "离开地球，前往月球",
      "chCoast": "飞行三天",
      "chLoi": "进入月球轨道",
      "chUndock": "Eagle 分离",
      "chDescent": "动力下降",
      "chSurface": "静海基地",
      "chAscent": "起飞返回",
      "chDock": "对接",
      "chTei": "回家",
      "chEntry": "再入",
      "chSplash": "溅落",
      "ignition": "T−8.9 秒：点火程序启动五台 F-1 发动机，先是中间那台，然后是外围成对的。",
      "liftoff": "升空，13:32:00 UTC：五台 F-1，大约 33800 千牛的推力，托起近 3000 吨的重量。",
      "tower": "离开发射塔之后，火箭滚转到飞行方位角，北偏东 72 度。",
      "maxq": "一分钟后超过音速；接着是最大动压，空气推得最猛的时候：35 千帕。",
      "ceco": "T+135 秒：中间那台发动机关机，让加速度保持在 4 g 以下。",
      "staging": "T+161.7 秒：外围发动机关机。在大约 67 公里的高度，S-IC 脱落，它的制动火箭点火。",
      "sii": "T+163.0 秒：S-II 的五台 J-2 发动机点火。氢燃烧的火焰颜色很淡，几乎是透明的。",
      "interstage": "级间段脱落；T+197.9 秒，逃逸塔抛掉。",
      "siicut": "T+9 分 13 秒：S-II 关机脱落；S-IVB 点火。",
      "parking": "T+11 分 52 秒：进入停泊轨道，高 185 公里。两个半小时的检查，绕地球一圈半。",
      "tli": "2:44:16：S-IVB 再次点火，持续 5 分 48 秒，把整个飞船加速到每秒 10.8 公里。目的地是月球。",
      "sla": "3:17：登月舱周围的四块面板向外打开。Columbia 分离，掉转方向，和 Eagle 头对头对接（没有画出）。",
      "extract": "大约 3:57：Columbia 把 Eagle 从 S-IVB 里拉出来。用完的火箭级被留在后面。",
      "coast": "三天飞向月球，384000 公里，画成大约 8000 倍的真实速度。飞船只有 11 米长，所以只是一个点。",
      "loi": "75:49:50，在月球背后，与地面失去无线电联系：服务舱发动机燃烧六分钟，让飞船被月球捕获。",
      "lunarorbit": "月球轨道，高约 100 公里，绕一圈两小时。",
      "undock": "100:12：载着阿姆斯特朗和奥尔德林的 Eagle，和 Columbia 分离，柯林斯留在 Columbia 上。",
      "pdi": "102:33:05：动力下降开始，高 15 公里，离着陆点还有大约 500 公里。",
      "landing": "电脑会把它降落到一个布满大石头的撞击坑里。阿姆斯特朗接过操纵，继续往前飞，燃料只剩不到一分钟。",
      "landed": "102:45:40，20:17:40 UTC。“Houston, Tranquility Base here. The Eagle has landed.”",
      "step": "109:24:15，7 月 21 日 02:56 UTC：阿姆斯特朗从梯子上迈下一步。",
      "smallstep": "“That's one small step for [a] man, one giant leap for mankind.” 阿姆斯特朗，109:24:48；音频是 NASA 的录音。",
      "liftoffe": "124:22：上升级从下降级上起飞，下降级留在月球上。7 月 21 日 17:54 UTC。",
      "rendezvous": "Eagle 追着 Columbia 往上爬，从 18 公里到 100 公里。机动画成了一个形状，不是任务本身的轨迹。",
      "docked": "128:03，21:35 UTC：对接完成。宇航员和 21.5 公斤月球岩石转移过去。",
      "jettison": "130:09：Eagle 的上升级被放开，留在月球周围转圈。",
      "tei": "135:23:42，在月球背面：服务舱发动机点火 2 分 30 秒。回家。",
      "home": "两天半的返程，同样的 384000 公里。",
      "smsep": "194:49：服务舱被切掉，指令舱把隔热罩转向前方。",
      "entry": "195:03，再入界面，高 122 公里，速度每秒 11 公里。隔热罩发出红光；过载最高约 6 g。",
      "drogue": "大约 195:12：先是两顶减速伞，然后是三顶主伞。",
      "mains": "三顶主伞，每顶宽 25 米，把太空舱减速到大约每秒 9 米。",
      "splash": "195:18:35，7 月 24 日 16:50:35 UTC：溅落在太平洋，离航空母舰 USS Hornet 24 公里（没有画出）。共八天三小时 18 分钟。",
      "pathAscent": "任务报告里的事件时间，两个时间之间的高度和距离是近似的",
      "pathTrip": "根据飞行日志的事件时间重建，画成二体弧线：去程是圆锥曲线，绕月是圆，回程是圆锥曲线；不是跟踪数据",
      "pathLm": "下降是从静海基地往回画的，会合只是一个形状；事件时间是任务本身的",
      "srcReport": "Apollo 11 任务报告，NASA MSC-00171，1969 年（事件时间、发射、着陆）",
      "srcJournal": "Apollo 11 飞行日志，NASA（精确到秒的事件时间）",
      "srcClip": "阿姆斯特朗在月球上的第一句话：NASA 录音，公有领域，来自维基共享资源",
      "srcLanding": "着陆通报：NASA 录音，公有领域，来自维基共享资源"
    },
    "artemis-ii": {
      "title": "Artemis II：绕月飞行",
      "blurb": "2026 年 4 月 1 日，从 39B 发射场出发，到 10 日落入圣迭戈外海的太平洋：四个人绕过月球背面，按任务时钟。",
      "chPad": "39B 发射台",
      "chLiftoff": "升空",
      "chStaging": "助推器分离",
      "chOrbit": "高地球轨道",
      "chTli": "离开地球，前往月球",
      "chMoon": "月球背面",
      "chHome": "返航",
      "chEntry": "再入",
      "chSplash": "溅落",
      "ready": "肯尼迪航天中心 39B 发射场，2026 年 4 月 1 日。Wiseman、Glover、Koch 和 Hansen 坐在 Orion 里，它在 Space Launch System 的顶端。",
      "cored": "T−6.4 秒：芯级的四台 RS-25 发动机启动。已实飞，与计划一致。",
      "liftoff": "升空，22:35:12 UTC（美国东部夏令时下午 6:35）：两个五段式助推器在零时点火。已实飞。",
      "srb": "大约 T+2 分钟：助推器燃尽，在 48 公里高度、时速 5000 公里时分离。已实飞；它们落入大西洋。",
      "las": "计划：T+3 分 22 秒，发射中止塔被抛掉。已公布的飞行记录没有给出具体的秒；这是飞行计划里的时间。",
      "meco": "计划：T+8 分钟，芯级关机，进入一条亚轨道弧线，远地点接近 2300 公里。这是飞行计划里的时间。",
      "coresep": "芯级被放开，大约在发射两小时后，坠向太平洋上空，在大气中被烧毁。已实飞。",
      "prb": "大约 T+50 分钟，在弧线的最高点：上面级点火，把近地点抬出大气层。已实飞，具体的秒没有公布。",
      "arb": "一小时后，在近地点：一次 15 分钟的点火，把轨道远地点的一侧抬到 70000 公里，绕一圈将近一天。已实飞。",
      "fairings": "计划：服务舱周围的三块面板被抛掉；四片太阳能电池翼展开。这是飞行计划里的时间，这里画成已经展开的样子。",
      "arrays": "Orion 的四片电池翼展开了：它们会为飞船供电十天。",
      "sep": "计划：Orion 和上面级分离；之后 Glover 用手动操纵，让它在上面级旁边飞行大约 70 分钟。分离的具体时间没有公布。",
      "tli": "飞行第 2 天，大约进行到第 25 小时：服务舱的主发动机点火 5 分 49 秒，前往月球。已实飞；这里显示的是飞行计划里的那一分钟。",
      "outbound": "飞出去四天。去程进行了一次修正点火，在飞行第 5 天，17.5 秒；太小了，画不出来。",
      "record": "4 月 6 日 17:56 UTC：Orion 超过了 Apollo 13 在 1970 年创下的距离纪录，离地球 248655 英里。已实飞。",
      "moon": "飞行第 6 天：Orion 进入月球的引力影响范围。它不会进入月球轨道：它绕过月球背面，然后向家里落回。",
      "los": "22:46 UTC：到了月球背后，失去联系 38 分钟。已实飞。",
      "closest": "最近点，4 月 6 日 23:00 UTC：在月球背面上空 6545 公里。已实飞。",
      "far": "23:02 UTC：离地球最远，406771 公里。已实飞。",
      "aos": "23:24 UTC：从月球背后出来，重新取得联系。已实飞。",
      "home": "回家四天。返程进行了三次修正点火，分别是 15 秒、9 秒和 8 秒；太小了，画不出来。",
      "esmsep": "计划：服务舱在再入前大约 20 分钟被放开。放开的具体时间没有公布；画的是飞行计划里的时间。",
      "entry": "再入界面，计划在溅落前大约 13 分钟：高 122 公里，速度每秒 11 公里，隔热罩发出红光。一次更陡的直接再入，取代了原计划的跳跃式再入。已实飞。",
      "drogue": "先是减速伞，然后是引导伞和三顶主伞，每顶宽 35 米。已实飞；时间是飞行计划里的。",
      "mains": "三顶主伞把太空舱送向大海。",
      "splash": "溅落，4 月 11 日 00:07:27 UTC（太平洋夏令时 4 月 10 日下午 5:07），北纬 32.3 度、西经 117.8 度，在圣迭戈西南方；USS John P. Murtha 回收了乘组（舰船没有画出）。共九天一小时 32 分钟。已实飞。",
      "pathAscent": "飞行计划里的事件时间，两个时间之间的高度和距离是我们画的；升空和助推器分离是已实飞的",
      "pathTrip": "根据实际飞行的轨道、最近点和溅落重建，画成二体弧线，以及绕月的一条双曲线；不是跟踪数据",
      "srcWiki": "维基百科，Artemis II（实际飞行了什么，包括时间和距离；2026 年 11 月 2 日读取）",
      "srcNasa": "NASA，Artemis II（飞行计划；火箭和太空舱的模型：NASA 3D Resources）"
    }
  }
};

// b200-f2-worlds: begin (forge #144, #145, #148) -- the Size and Distance sliders, the cutaways and the heliosphere (copy/en.later.js orrery, cutaway, helio). Machine-drafted like the rest of this file, not read by a native speaker.
Object.assign(COPY, {
  "orrery": {
    "title": "大小和距离",
    "size": "大小",
    "sizeTrue": "真实",
    "sizeValue": "×{n}",
    "sizeTitle": "天体画得比实际大多少倍，从真实大小到 ×{max}",
    "dist": "距离",
    "distTrue": "真实",
    "distLog": "对数",
    "distSome": "向对数靠拢了 {p}%",
    "distTitle": "到太阳的距离压缩了多少，从真实到对数。方向始终是实测的。",
    "presets": "现成视图",
    "presetTrue": "真实比例",
    "presetTrueTitle": "每个天体都按真实大小、放在真实距离上",
    "presetClass": "课堂",
    "presetClassTitle": "天体 ×{n}，距离取对数，像太阳系仪一样",
    "held": "导览旅程中一切都按真实比例绘制。旅程结束后滑块会回来。",
    "note": "每个天体在天空中的位置始终是实测的。徽标会告诉你它被画大了多少。",
    "noteSize": "{name} 被大小滑块画成实际的 ×{n}。",
    "noteDist": "它画在离太阳 {drawn} AU 的地方，实际在 {au} AU，方向是真实的（距离滑块）。",
    "noteMoon": "它离 {parent} 的距离画成实际的 {n} 倍，方向是真实的，这样它就不会落进放大的行星里。",
    "noteSun": "太阳被大小滑块画成实际的 ×{n}，并且不会盖住水星。",
    "badgeSun": "太阳 ×{n}",
    "badgeLog": "对数距离",
    "badgeSome": "距离 {p}% 对数",
    "badgeJoin": " · ",
    "badgeTitle": "这个视图由“行星”标签页里的大小和距离滑块决定。"
  },
  "cutaway": {
    "button": "看看内部",
    "buttonTitle": "把 {name} 剖开看各层，深度来自测量数据",
    "title": "{name} 的内部",
    "close": "关闭剖面图",
    "model": "分层依据 {model}。",
    "source": "来源",
    "layers": "各层，从表面往下",
    "depthRange": "{top}–{bottom} 公里",
    "toCentre": "{top} 公里到中心",
    "cls": {
      "measured": "实测",
      "modelled": "模拟",
      "inferred": "推断"
    },
    "clsTitle": "{cls}：{source}",
    "probe": "深度",
    "probeTitle": "从表面往下滑到中心",
    "depth": "深 {km} 公里",
    "atCentre": "中心",
    "layer": "层",
    "pressure": "压力",
    "temperature": "温度",
    "density": "密度",
    "valueCls": "{value}（{cls}）",
    "note": "深度来自资料来源；颜色是选定的。在一层的顶部和底部之间，探针读出的是介于两者之间的数值。",
    "unknown": "这个天体还没有剖面图。",
    "units": {
      "gpa": "{n} GPa",
      "mpa": "{n} MPa",
      "kpa": "{n} kPa",
      "millionGpa": "{n} 百万 GPa",
      "k": "{n} K",
      "millionK": "{n} 百万 K",
      "rho": "{n} g/cm³"
    },
    "kinds": {
      "crust": "壳层",
      "mantle": "幔层",
      "upper-mantle": "上幔",
      "lower-mantle": "下幔",
      "outer-core": "液态外核",
      "inner-core": "固态内核",
      "liquid-core": "液态核",
      "iron-core": "铁核",
      "molten-silicate": "熔融岩石层",
      "partial-melt": "部分熔融层",
      "ice-shell": "冰壳",
      "ocean": "海洋",
      "hp-ice": "高压冰",
      "rock-mantle": "岩石幔",
      "rock-core": "岩石核",
      "hydrated-core": "岩石与冰的核",
      "molecular": "氢和氦",
      "metallic": "金属氢",
      "dilute-core": "稀释核",
      "ice-mantle": "水、氨和甲烷",
      "convective": "对流区",
      "radiative": "辐射区",
      "solar-core": "核心"
    }
  },
  "helio": {
    "chip": "日球层 · 模拟",
    "chipTitle": "包围太阳系的这个气泡是根据什么画的",
    "legendTitle": "日球层",
    "rowTs": "终端激波：太阳风在这里减速到声速以下。模拟的形状穿过两个穿越点：Voyager 1 在 {a} AU，Voyager 2 在 {b} AU（实测）。",
    "rowHp": "日球层顶：太阳风在这里遇上星际气体。模拟的形状（Parker 1961）穿过两个穿越点：Voyager 1 在 {a} AU，Voyager 2 在 {b} AU（实测）。",
    "rowBow": "弓形波：星际气体在前方堆积的地方。示意：日球层顶距离的两倍（McComas 等人，2012）。",
    "rowRibbon": "IBEX 带：IBEX 在天空中测到的一条亮带（Funsten 等人，2013）。它的距离没有测过：画在 {au} AU 处。",
    "rowMotion": "太阳穿过本地星际气体的路线，{v} 公里/秒（IBEX，McComas 等人，2015）。箭头代表 {years} 年的路程，{au} AU。",
    "sources": "穿越位置来自 JPL Horizons 中 Voyager 的轨迹，取 NASA 公布的穿越日期。形状：Parker 1961、Wilkin 1996，参考 Izmodenov & Alexashov 2015 和 Opher 等人 2015。",
    "crossing": "{craft}：{surface}，{au} AU，{date}",
    "motion": "太阳的路线，{v} 公里/秒",
    "craft": {
      "deep-voyager-1": "Voyager 1",
      "deep-voyager-2": "Voyager 2"
    },
    "surface": {
      "ts": "终端激波",
      "hp": "日球层顶"
    },
    "surfaceLabel": {
      "ts": "终端激波（模拟）",
      "hp": "日球层顶（模拟）",
      "bow": "弓形波（示意）",
      "ribbon": "IBEX 带（在天空中实测）"
    },
    "date": "{y}年{m}{d}日",
    "months": [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月"
    ]
  }
});
// b200-f2-worlds: end

export const GLOSSARY = {
  "orbit": "在引力作用下绕着某个天体运行的路径。横向速度足够快，你就会一直从地球旁边落过去，而不是落到地球上。",
  "low Earth orbit": "离地大约 200 到 2000 公里的一层，非常繁忙。空间站、大多数卫星和大多数碎片都在这里。",
  "geostationary": "高度 35786 公里的轨道，在那里绕一圈的时间，和地球自转一圈一样长，是 23 小时 56 分。所以卫星看上去悬在同一个地方不动。",
  "polar orbit": "经过两极上空的轨道。地球在下面转动，所以卫星最终会看到地球的每一个角落。",
  "elements": "六个数字加上一个日期，用来描述一条轨道。把它们代进合适的数学公式，就能算出一个位置。",
  "epoch": "一组轨道根数成立的那个时刻。离它越远，算出的答案就越不准。",
  "apogee": "绕地球运行的轨道上的最高点。",
  "perigee": "绕地球运行的轨道上的最低点。",
  "perihelion": "绕太阳运行的天体离太阳最近的点。",
  "inclination": "轨道相对于赤道倾斜了多少。九十度就是经过两极。",
  "propagated": "从较早的一次测量向前推算出来。不是新的观测，而且会慢慢偏离。",
  "lunar distance": "地球到月球的距离，约 384000 公里。拿来衡量小行星飞掠，是一把方便的尺子。",
  "astronomical unit": "地球到太阳的距离，约 1.5 亿公里。",
  "light-time": "光走过一段距离需要的时间。无线电信号走这段距离，也要这么久。",
  "light-year": "光在一个儒略年里走过的距离，约 9.46 万亿公里。用来衡量恒星之间距离的尺子。",
  "magnitude": "一个东西看起来有多亮。这个刻度是反着的：数字越小，越亮。",
  "azimuth": "用度数表示的罗盘方向。零度是北，90 度是东。",
  "elevation": "一个东西高出地平线多少，用度数表示。九十度就是正上方。",
  "terminator": "一个天体上白天和黑夜之间的那条线。",
  "twilight": "日落之后，天空还没有完全黑下来的那段时间。这时最容易看到卫星。",
  "sunlit": "就算下面的地面已经暗了，它还能照到阳光。卫星能被看见，就是因为这个。",
  "radiant": "天空中流星雨看起来飞来的那个点。",
  "ZHR": "在完美黑暗的天空下，辐射点在头顶时，每小时大约能看到多少颗流星。通常你看到的会更少。",
  "close approach": "小行星从地球附近飞过的时候。天文学里说的“近”，通常还是比月球远。",
  "near-Earth object": "轨道会靠近地球轨道的小行星或彗星。",
  "reentry": "东西落回大气层的时候。大部分会在下落的路上烧尽。",
  "debris": "失效的卫星、用完的火箭级和碎块。有几万块正在被追踪。",
  "constellation": "很久以前人们给起了名字的一片星星图案。同一个星座里的星星，通常彼此离得很远。",
  "L1": "地球和太阳之间的一个平衡点，朝太阳方向约 150 万公里。适合用来观察太阳。",
  "L2": "在地球背着太阳的一侧、离地球 150 万公里的平衡点，望远镜在这里可以让地球和太阳都在身后，并保持低温。",
  "transit": "从你站的地方看，一个东西从另一个东西前面经过的时候。",
  "conjunction": "两个东西在天空中看起来靠得很近的时候。它们在太空里并不近。",
  "ephemeris": "一张提前算好的表，告诉你某个东西将会在哪里。",
  "umbra": "影子中央最暗的部分，光线被完全挡住。站在月球的本影里，太阳就不见了。",
  "penumbra": "影子外围较亮的部分，只有一部分光被挡住。月球进入地球的半影时只会稍微变暗。",
  "totality": "日全食中太阳被完全遮住的那几分钟。天空暗到可以看见星星。",
  "annular": "环形的。日环食时月球离得太远，遮不住整个太阳，周围留下一圈明亮的光环。"
};

// b200-f1-find: begin -- Find, the owners, the clouds and the date field (copy/en.find.js, forge #150, #152, #153, #154), machine-drafted
COPY.timePill.dateJump = "跳到某个日期（UTC）";
Object.assign(COPY, {
  "findEntry": {
    "title": "查找",
    "property": "按属性查找",
    "countries": "按国家看卫星",
    "operators": "按运营方",
    "clouds": "碎片云",
    "chartOurs": "并排看我们的行星"
  },
  "find": {
    "title": "查找",
    "label": "按属性、按国家和按碎片云查找",
    "tabs": {
      "property": "按属性",
      "country": "按国家",
      "clouds": "碎片与星座"
    },
    "kindsLabel": "找什么",
    "kinds": {
      "stars": "恒星",
      "exoplanets": "行星",
      "satellites": "卫星",
      "comets": "彗星"
    },
    "presetsLabel": "问题",
    "refine": "细化",
    "presets": {
      "rockyHz50": "50 光年内宜居带中的岩质行星",
      "nearStars": "20 光年内的恒星",
      "temperate": "和地球差不多温暖的行星",
      "hotJupiters": "炽热巨行星",
      "cometsSoon": "2030 年前到达近日点的彗星",
      "geo": "地球静止轨道上仍在工作的卫星",
      "low": "400 公里以下仍在工作的卫星"
    },
    "fields": {
      "within": "距离以内（光年）",
      "fromHere": "从相机量起，而不是从太阳",
      "radius": "半径（地球为 1）",
      "mass": "质量（地球为 1）",
      "teq": "温度（K）",
      "insol": "所受星光（地球 = 1）",
      "height": "高度（公里）",
      "year": "发射（年）",
      "perihelion": "离太阳最近（年）",
      "from": "从",
      "to": "到",
      "zone": "在宜居带内",
      "zoneWide": "在带内或带边",
      "rocky": "岩质",
      "working": "只看在工作的",
      "owner": "所属",
      "operator": "运营方",
      "any": "任意",
      "range": "{label}：{word}"
    },
    "columns": {
      "name": "名称",
      "dist": "距离（光年）",
      "radius": "半径（地球）",
      "teq": "温度（K）",
      "insol": "光照",
      "zone": "宜居带",
      "spect": "光谱型",
      "mag": "星等",
      "owner": "所属",
      "height": "高度（公里）",
      "year": "发射",
      "perihelion": "近日点",
      "qAu": "最近（天文单位）"
    },
    "zones": {
      "inside": "带内",
      "edge": "带边",
      "hotter": "太热",
      "colder": "太冷"
    },
    "sortTitle": "按{col}排序",
    "tableLabel": "符合条件的天体，每行一个：点一行就飞过去",
    "status": "找到 {n} 个",
    "statusSome": "找到 {n} 个；列出前 {shown} 个",
    "none": "没有符合的。放宽某个范围，或取消一个勾选。",
    "looking": "正在查找…",
    "loading": "正在载入要查的数据…",
    "failed": "查找没有完成。请稍后再试。",
    "rowTitle": "前往 {name}",
    "noRecord": "地图上没有画出",
    "modelled": "用估算的恒星质量算出：模型",
    "copyLink": "复制这个问题的链接",
    "copied": "链接已复制",
    "honesty": {
      "stars": "HYG v4.4 中有名字的 3 390 颗恒星，位于实测距离处。实测。",
      "exoplanets": "半径、质量、周期和恒星：实测，来自 NASA Exoplanet Archive。轨道大小、所受星光、温度和宜居带：计算得出；标 * 的表示恒星质量由其光度估算，属于模型。岩质：半径不超过 1.6 个地球半径，或无半径数据时质量不超过 3 个地球质量（Rogers 2015）。",
      "satellites": "CelesTrak 目录，读取于 {date}。高度取轨道最高点和最低点的平均。实测。",
      "comets": "近日点日期来自 JPL 小天体数据库，由实测轨道算出。"
    },
    "chart": {
      "open": "并排",
      "openTitle": "{host} 的行星并排，按比例",
      "title": "{host}，按比例",
      "ours": "太阳系",
      "label": "{host} 的行星按真实大小并排画出，从恒星往外排",
      "note": "所有行星用同一比例；间隔不代表距离。没有实测半径的行星用虚线、按中等大小画出。",
      "close": "关闭图"
    },
    "pill": "{name}：已点亮 {n} 个",
    "pillClear": "取消高亮"
  },
  "owners": {
    "modesLabel": "分组方式",
    "modes": {
      "countries": "国家",
      "operators": "运营方",
      "points": "拉格朗日点",
      "nopath": "没有公开轨道"
    },
    "reading": "正在读取 CelesTrak 目录（7 MB）…",
    "failed": "目录没有载入。",
    "retry": "重试",
    "lead": "{n} 个所属方在轨道上有东西：共追踪 {total} 个天体。",
    "row": "在轨 {n}",
    "rowSub": "{working} 个在工作 · {debris} 块碎片",
    "rowTitle": "点亮 {name} 在轨道上的东西",
    "joint": "{a}和{b}",
    "ussr": "目录把苏联和俄罗斯算作同一个所属方。",
    "unknown": "尚不清楚",
    "byName": "按名称",
    "byNameTitle": "按目录中其卫星的名称统计",
    "kinds": "{working} 个在工作，{dead} 个已停止工作，{rocket} 个火箭箭体，{debris} 块碎片。",
    "lit": "其中 {n} 个已在地图上画出并点亮。",
    "litNone": "其中没有一个画在地图上。",
    "show": "点亮它们",
    "clear": "清除",
    "page": "{name} 的页面",
    "noPathTitle": "没有公开轨道：{n}",
    "noPathNone": "它在轨道上的每个航天器都有公开轨道。",
    "why": {
      "no-elements": "没有公开轨道：目录里有它，但没有发布轨道根数",
      "deep-space": "在地球轨道之外，这里没有它的路径",
      "deep-drawn": "在地球轨道之外：按 JPL 路径画出"
    },
    "points": {
      "sel1": "日地 L1",
      "sel2": "日地 L2",
      "eml2": "地月 L2",
      "sel1Why": "朝太阳方向 150 万公里：在这里看太阳，太阳永不落下。",
      "sel2Why": "背离太阳 150 万公里：又冷又暗，适合望远镜。",
      "eml2Why": "在月球背面之外：一颗中继星，能同时看到月球背面和地球。",
      "empty": "这里目前没有记录。"
    },
    "nopathLead": "{n} 个在轨航天器没有公开轨道。最新的排在前面：",
    "source": "CelesTrak 卫星目录，读取于 {date}：实测。国旗：Wikimedia Commons，公有领域。"
  },
  "breakups": {
    "cloudsTitle": "碎片云",
    "fleetsTitle": "卫星星座",
    "names": {
      "fy1c": "Fengyun-1C",
      "cosmos1408": "Cosmos 1408",
      "iridium33": "Iridium 33",
      "cosmos2251": "Cosmos 2251"
    },
    "why": {
      "fy1c": "一颗中国气象卫星，2007 年 1 月 11 日在 865 公里高度被中国反卫星导弹摧毁：有史以来最大的碎片云。",
      "cosmos1408": "一颗已失效的苏联卫星，2021 年 11 月 15 日在约 480 公里高度被俄罗斯反卫星导弹摧毁。",
      "iridium33": "一颗在用的通信卫星，2009 年 2 月 10 日在西伯利亚上空 789 公里处被已失效的宇宙 2251 号撞上：首次两颗完整卫星相撞。",
      "cosmos2251": "一颗已失效的俄罗斯卫星，2009 年 2 月 10 日在 789 公里高度撞上铱星 33。"
    },
    "counts": "编入目录的 {catalogued} 块碎片中，仍有 {up} 块在轨。",
    "lit": "地图上点亮 {n} 个。",
    "spreadTitle": "看它如何散开",
    "steps": {
      "event": "事发时",
      "week": "一周后",
      "year": "一年后",
      "today": "今天"
    },
    "play": "从事发时播放",
    "stop": "停止",
    "places": "回到今天的位置",
    "spreadNote": "模型：每块碎片都从同一点出发，沿它今天的轨道运行，并随地球赤道隆起使轨道面转动而漂移。已经坠落的碎片不画出。",
    "source": "来源：",
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
    "fleetLit": "地图上点亮 {n} 个。",
    "fleetNote": "按运营方在目录中给它们起的名字识别。",
    "loadingActive": "先载入所有在工作的卫星（7 MB）…",
    "loadingDebris": "先载入所有被追踪的碎片（7 MB）…",
    "moment": "2007: Fengyun-1C",
    "momentTitle": "跳到风云一号 C 被摧毁的那一分钟，并点亮它的碎片云"
  },
  "dateJump": {
    "title": "跳到某个日期",
    "field": "日期和时间（UTC）",
    "text": "或直接输入",
    "placeholder": "1969-07-20 20:17, next total eclipse",
    "go": "前往",
    "hint": "1700 到 2200 年之间的任意时刻，UTC。",
    "errors": {
      "unknown": "看不懂这个日期。试试 1969-07-20 20:17、20 July 1969 或 next total eclipse。",
      "range": "超出 1700 到 2200 年。",
      "empty": "请先输入日期。",
      "eclipse": "1700 到 2200 年之间没有这样的食。"
    },
    "searching": "正在查找…",
    "gone": "现在是 {when}。",
    "eclipse": "{what}，{when}。",
    "eclipses": {
      "sunTotal": "日全食",
      "sunAnnular": "日环食",
      "sunPartial": "日偏食",
      "moonTotal": "月全食",
      "moonPartial": "月偏食",
      "moonPenumbral": "半影月食"
    },
    "rangesTitle": "精度如何，适用于何时",
    "ranges": {
      "worlds": "太阳、月球和行星：1700 到 2200 年，计算得出（astronomy-engine）。",
      "satellites": "卫星：今天前后一周内准确；超过一个月就变淡。",
      "craft": "深空探测器：只在它们自己的 JPL 路径范围内。",
      "stars": "恒星：在天空视图中，日期离今天超过 50 年时，按实测的运动移动。"
    },
    "quick": {
      "total": "下一次日全食",
      "lunar": "下一次月食"
    },
    "missionsTitle": "来自我们的任务",
    "momentsTitle": "精彩时刻",
    "presetsLabel": "可跳转的日期",
    "faded": "卫星已变淡：它们的轨道是为现在测量的，不是为 {year} 年。",
    "close": "关闭"
  }
});
// b200-f1-find: end
// b200-f4-cards: begin -- a card's Wikipedia block and Read aloud (copy/en.cards.js, forge #151), machine-drafted
Object.assign(COPY, {
  "wikiCard": {
    "label": "来自维基百科",
    "quotedLive": "引自维基百科今天的版本，未经我们核实。",
    "quotedBaked": "引自维基百科 {date} 的版本，未经我们核实。",
    "textCredit": "文字：维基百科贡献者，CC BY-SA 4.0。",
    "readArticle": "阅读完整条目",
    "inEnglish": "这种语言还没有相关条目，所以这里是英文条目。",
    "family": "关于 {fleet} 整体：这颗卫星本身没有单独的条目。",
    "photo": "照片：{artist}，{licence}，来自 Wikimedia Commons。",
    "photoNoArtist": "照片：{licence}，来自 Wikimedia Commons。",
    "photoAlt": "维基百科条目 {title} 顶部的图片",
    "loading": "正在询问维基百科…",
    "read": "朗读",
    "readTitle": "用你设备自带的语音朗读这张卡片",
    "stop": "停止朗读",
    "reading": "正在朗读"
  }
});
// b200-f4-cards: end
// b200-f3-stars: begin -- deep time, the variable stars and the turning black holes (copy/en.stars.js, forge #141, #142, #149), machine-drafted
Object.assign(COPY, {
  "deepTime": {
    "title": "深时",
    "back": "−{n} 年",
    "on": "+{n} 年",
    "backTitle": "后退 {n} 年，日期和时刻不变",
    "onTitle": "前进 {n} 年，日期和时刻不变",
    "presetsLabel": "其他北极星",
    "presets": {
      "thuban": "右枢，公元前 2800 年",
      "vega": "织女星，公元 13 700 年",
      "far": "公元 50 000 年"
    },
    "presetTitles": {
      "thuban": "建造金字塔的时候，天龙座的右枢是北极星",
      "vega": "约公元 13 700 年，天极离织女星不到 6.5°",
      "far": "五万年后的天空"
    },
    "yearAd": "公元 {n} 年",
    "yearBc": "公元前 {n} 年",
    "moved": "{year}的天空：每颗恒星都按自己实测的运动移动了。",
    "far": "离今天这么远，不画月亮和行星，太阳放在历法给出的位置。",
    "pole": "北极星：{name}，离天极 {deg}°。",
    "noPole": "天极附近没有亮星：最近的{name}离它 {deg}°。",
    "unnamed": "一颗 {mag} 等星",
    "honest": "运动是实测的（Hipparcos 和 Gaia，经 HYG）；把它们沿直线延伸几千年是模型。地轴的转动：Vondrák、Capitaine 和 Wallace 2011。"
  },
  "variables": {
    "label": "它的光如何变化",
    "types": {
      "eclipse": "食双星：两颗星彼此从对方前面经过。",
      "binary": "被拉成椭球形的密近双星，亮度从不停下。",
      "pulse": "脉动星：它会膨胀和收缩。",
      "sine": "一颗小而快速脉动的星。",
      "sr": "半规则巨星：周期和变幅是实测的，但不知道它此刻处在周期的哪里，所以这条曲线只是示意。",
      "irregular": "不规则变星：没有钟能说出它有多亮，所以天空保留星表的亮度。"
    },
    "periodDays": "周期 {n} 天。",
    "periodYears": "周期 {n} 年。",
    "aria": "{name}的光变曲线，从 {bright} 等到 {faint} 等；现在 {now}。",
    "now": "现在",
    "nowLine": "现在 {mag} 等（{band}）；变化范围 {bright} 到 {faint}。",
    "range": "变化范围 {bright} 等到 {faint} 等（{band}）。",
    "far": "曲线不延伸到离今天超过 {years} 年；变化范围 {bright} 等到 {faint} 等（{band}）。",
    "nextMin": "下一次极小：{when}",
    "measured": "实测：大暗化期间有日期的星等。要素：{cite}。",
    "modelled": "模型：形状由星表的周期、历元和变幅画出（{cite}）。",
    "notes": {
      "alf-ori": "2019 和 2020 年它暗到 1.6 等，即“大暗化”：它抛出的一团尘埃遮住了它的一部分。",
      "omi-cet": "蒭藁增二的极大从一个周期到下一个会早或晚几周，所以这些日期也可能差这么多。",
      "bet-lyr": "它的周期每年增加 19 秒；曲线采用 Harmanec 和 Scholz（1993）的二次历表。",
      "bet-per": "大陵五的食准到分钟：每 2.87 天变暗约十小时。",
      "eps-aur": "每 27 年被伴星周围的暗盘遮掩近两年；上一次食从 2009 到 2011 年。",
      "eta-car": "在 1840 年代的大爆发中，它成了全天第二亮的星。",
      "t-crb": "再发新星：1866 年和 1946 年两次亮到 2 等。"
    }
  },
  "blackHoleSpin": {
    "spin": "画成转动的，自旋 a = {a}：阴影是转动黑洞投下的形状（Bardeen 1973），被推离朝我们转来的一侧。{why}周围的光仍按不转动的情形追踪，所以这个形状是模型。",
    "spinWhy": {
      "m87-star": "自旋是选定的：EHT 2019 第五篇论文中最吻合的模型以 0.94 转动。",
      "sgr-a-star": "自旋是选定的：EHT 2022 第五篇论文倾向于 0.5 到 0.94。"
    }
  }
});
// b200-f3-stars: end
// b200-c1-culture: begin -- a sky figure's story and the other cultures' pictures (copy/en.later.js skyLore, forge #143), machine-drafted
Object.assign(COPY, {
  "skyLore": {
    "figure": "{culture}星空中的一个图形",
    "figureLabel": "{name}，{culture}星空中的一个图形。按下查看它的故事。",
    "openTitle": "按下查看它的故事",
    "sub": "{culture}星空",
    "close": "关闭故事",
    "loading": "正在获取故事…",
    "failed": "故事没有加载出来，请稍后再试。",
    "fromStellarium": "出自 Stellarium 对这一星空文化的描述。{credit}。",
    "ours": "以我们自己的话概述，依据：{cite}。",
    "honesty": "示意：这只是来源所记录的一种讲法。不同民族、不同讲述者的名称和故事各不相同。",
    "none": "我们可以分享的资料中没有记录这个图形的故事。这些是仍在传承的传统，所以我们照实说明，而不去猜测。",
    "inEnglish": "故事为英文，即其来源的语言：没有获得许可的译本。",
    "artTitles": {
      "maori": "毛利图形的插画，出自 Stellarium 的毛利星空文化，CC BY-SA 4.0",
      "hawaiian": "夏威夷星线的插画，由 Kealoha Kaneakua 为 Stellarium 绘制，CC BY-SA 4.0",
      "boorong": "布隆图形的插画，出自 Stellarium 的布隆星空文化，CC BY-SA 4.0"
    },
    "artNone": "这片星空没有可按许可分享的插画：它的图形仍以连线显示。"
  }
});
// b200-c1-culture: end
// b200-f5-make: begin -- the flight editor, Record and Dome and 360 (copy/en.make.js, forge #155, #156, #157), machine-drafted
Object.assign(COPY, {
  "make": {
    "flight": "飞行路径",
    "flightTitle": "在视角之间规划镜头路径，预览并以链接分享",
    "record": "录制",
    "recordTitle": "把当前视角、飞行路径或旅程录成视频",
    "dome": "球幕与 360",
    "domeTitle": "以天象馆球幕或 360 度画面显示天空",
    "failed": "没有加载成功，请稍后再试。"
  },
  "flight": {
    "title": "飞行路径",
    "sheet": "飞行路径：拖动以调整大小",
    "close": "关闭飞行路径",
    "play": "播放",
    "playTitle": "从滑块所在位置开始飞行",
    "stop": "停止",
    "stopTitle": "在当前位置停止飞行",
    "scrub": "路径上的位置",
    "scrubAt": "{at} / {total}",
    "hint": "把地图飞到你喜欢的视角，然后按“添加此视角”。两个视角就构成一条路径。",
    "hintOne": "一个视角。飞到别处再添加一个。",
    "hintMany": "{n} 个视角。按“播放”，或拖动滑块沿路径查看。",
    "add": "添加此视角",
    "addTitle": "记下镜头的位置、所看的对象和时钟",
    "keysLabel": "路径上的视角，按顺序",
    "keyName": "{n}. {name}",
    "goTitle": "转到此视角",
    "keyLive": "时钟照常运行",
    "point": "空间中的一点",
    "duration": "飞行",
    "seconds": "{n} 秒",
    "ease": "缓动",
    "eases": {
      "smooth": "平滑起停",
      "cruise": "巡航",
      "constant": "匀速"
    },
    "rate": "时钟",
    "rateLive": "实时",
    "up": "↑",
    "upLabel": "把视角 {n} 前移",
    "down": "↓",
    "downLabel": "把视角 {n} 后移",
    "replace": "用当前视角",
    "replaceLabel": "用当前视角替换视角 {n}",
    "remove": "移除",
    "removeLabel": "移除视角 {n}",
    "copyLink": "复制链接",
    "copyLinkTitle": "整条路径在一个链接里：任何地方都不保存",
    "linkCopied": "链接已复制（{n} 个字符）。打开它的人会看到这段飞行。",
    "linkInBar": "链接在地址栏中：请从那里复制。",
    "draft": "保存旅程草稿",
    "draftTitle": "供地图旅程使用的旅程文件草稿，需由人完成",
    "draftSaved": "旅程草稿已保存。卡片由你来写。",
    "record": "录制这段飞行",
    "recordTitle": "把飞行录成视频",
    "clear": "清空",
    "clearTitle": "移除所有视角",
    "needTwo": "一条路径至少需要两个视角。",
    "full": "一条路径最多 {n} 个视角。",
    "noView": "无法记下此视角：请先看向某个对象。",
    "badLink": "无法读取这个飞行链接。",
    "honesty": "每个视角都显示其时钟时刻各物体所在的位置。视角之间的飞行是我们绘制的镜头运动，不是航天器的轨迹。"
  },
  "record": {
    "title": "录制",
    "sheet": "录制：拖动以调整大小",
    "close": "关闭录制",
    "whatLabel": "录制内容",
    "sourceView": "当前视角",
    "sourcePath": "飞行路径",
    "sourceTrip": "旅程，直到结束",
    "length": "时长",
    "seconds": "{n} 秒",
    "shapeLabel": "画幅",
    "crops": {
      "wide": "16:9（YouTube）",
      "square": "方形",
      "tall": "竖屏 9:16（Reels、TikTok、Shorts）"
    },
    "smooth": "逐帧录制（任何设备都流畅）",
    "smoothNote": "页面会用自己的时钟重新载入此视角，并在拍下每一帧之前把它画完：慢的设备录得慢，但绝不卡顿。",
    "silent": "逐帧录制不录声音。",
    "withSound": "你听到的声音也会被录下。",
    "noSound": "声音已关闭，视频将没有声音。若要保留旅程的解说和音乐，请先打开声音。",
    "start": "开始录制",
    "stop": "停止",
    "save": "保存视频",
    "share": "分享视频",
    "saved": "视频已保存。",
    "cannot": "此浏览器无法录制视频。较新的 Chrome、Edge、Safari 和 Firefox 可以。",
    "rolling": "正在录制：{at} 秒",
    "made": "完成：{mb} MB。保存或分享。",
    "empty": "浏览器什么也没录下。请再试一次，或勾选“逐帧录制”。",
    "date": "{when} UTC",
    "credit": "spaceradar.ai · 地图与数据：NASA、ESA、Solar System Scope 等",
    "endTitle": "亲眼看看",
    "endLine": "Space Radar：免费，在浏览器中。",
    "endCredit": "地图与数据：NASA、ESA、USGS、Solar System Scope、HYG 等，依各自许可（CC BY、CC BY-SA）。致谢见 spaceradar.ai。",
    "filmTitle": "正在逐帧录制",
    "filmWarming": "正在准备视角…",
    "filmFrame": "第 {n} 帧，共 {total} 帧",
    "filmDone": "完成：{mb} MB，{s} 秒。文件已保存。",
    "filmFailed": "录制已停止：{why}",
    "back": "回到地图"
  },
  "dome": {
    "title": "球幕与 360",
    "sheet": "球幕与 360：拖动以调整大小",
    "close": "关闭球幕与 360",
    "kindLabel": "天空的绘制方式",
    "normal": "普通",
    "dome": "球幕，180 度（天象馆）",
    "wide": "360 度（YouTube 360）",
    "tilt": "球幕倾角",
    "tiltDeg": "{n}°",
    "size": "尺寸",
    "px": "{n} px",
    "pxSquare": "{n} × {n} px",
    "pxWide": "{w} × {h} px",
    "saveFrame": "保存这一帧",
    "skySize": "天空盒面",
    "saveSky": "保存天空盒",
    "saved": "已保存：{w} × {h} px。",
    "saveFailed": "无法绘制该图像。",
    "intro": "镜头所见的球幕母版或 360 度画面，实时显示。开启时名称会隐藏。",
    "live": "实时，每面 {n} px。",
    "livePhone": "实时，每面 {n} px：在手机上这只是预览。保存一帧可得到清晰的画面。",
    "noGpu": "此设备的图形处理器无法绘制。",
    "busy": "请先关闭想象的世界或“时刻”：它会绘制自己的画面。",
    "off": "已回到普通画面。",
    "credit": "可自由使用，请注明：Space Radar，spaceradar.ai。地图与数据：NASA、ESA、USGS、Solar System Scope、HYG 等；“来源”面板列出各自的许可。",
    "how": "用于球幕时，在旅程链接后加上 #proj=dome,30 并全屏打开。步骤见 docs/PLANETARIUMS.md。"
  }
});
// b200-f5-make: end
// b200-f6-learn: begin -- the daily challenges (copy/en.play.js, forge #160), machine-drafted
Object.assign(COPY, {
  "play": {
    "label": "每日挑战",
    "close": "关闭",
    "day": "{day}(UTC)的谜题,今天所有人都一样。",
    "games": {
      "find-earth": {
        "title": "找到地球",
        "blurb": "从星系一路找到我们的星球,用尽量少的选择。"
      },
      "which-world": {
        "title": "这是哪个世界?",
        "blurb": "一张真实地图的特写:从四个世界中选出它。"
      },
      "guess-distance": {
        "title": "猜距离",
        "blurb": "把滑块拖到它有多少光年远。"
      }
    },
    "other": "其他挑战",
    "loading": "地图还在加载;准备好后挑战就会开始。",
    "rung": "第 {n} 步,共 {of} 步:{where}",
    "rungs": {
      "local-group": "本星系群",
      "galaxy": "银河系",
      "stellar": "太阳附近",
      "sun": "太阳系"
    },
    "ask": {
      "local-group": "哪个标记是我们的星系——银河系?",
      "galaxy": "哪个标记是太阳?",
      "stellar": "哪个标记是太阳?",
      "sun": "哪个标记是地球?"
    },
    "hints": {
      "local-group": "我们的星系旁边紧挨着两个小伴星系:麦哲伦云。",
      "galaxy": "太阳距中心的黑洞约 27 000 光年,位于一条安静的旋臂上。",
      "stellar": "离太阳最近的恒星是暗淡的红矮星,以及 4.4 光年外的半人马座α。",
      "sun": "地球是从太阳往外数的第三个世界。"
    },
    "hint": "提示(消耗一次机会)",
    "mark": "标记 {letter},{where}",
    "places": {
      "tl": "左上",
      "tc": "上方",
      "tr": "右上",
      "ml": "左侧",
      "mc": "中间",
      "mr": "右侧",
      "bl": "左下",
      "bc": "下方",
      "br": "右下"
    },
    "milkyWay": "银河系",
    "sunName": "太阳",
    "tries": "第 {n} 次选择,共 {max} 次",
    "wrong": "不是这个:{letter} 是{name}。",
    "right": "对,是{name}。正在拉近。",
    "found": "你用 {n} 次选择找到了地球。",
    "lost": "机会用完了。地球是从太阳往外数的第三个世界。",
    "honest": "标记位于地图绘制每个天体的位置。在太阳系这一步,世界被画得比实际更近,和这个场景其他地方一样。",
    "round": "第 {n} 轮,共 {of} 轮",
    "worldAsk": "这是哪个世界的特写?",
    "more": "显示更多地图",
    "worldRight": "对:{name}。",
    "worldWrong": "不对:是{name}。",
    "credit": "地图:{credit}",
    "worldPicture": "太阳系中某个世界的真实地图特写",
    "distAsk": "{name}有多远?",
    "slider": "距离(光年)",
    "guess": "猜",
    "reveal": "{name}距离 {value}:你{off}。",
    "offs": {
      "hit": "误差在四分之一以内",
      "near": "误差在两倍以内",
      "far": "误差在五倍以内",
      "miss": "误差超过五倍"
    },
    "source": "距离:{source}",
    "units": {
      "ly": "{n} 光年",
      "kly": "{n} 千光年",
      "mly": "{n} 百万光年",
      "bly": "{n} 十亿光年"
    },
    "next": "下一个",
    "scores": {
      "find-earth": "10 次中用了 {n} 次",
      "which-world": "3 个世界中答对 {n} 个",
      "guess-distance": "3 个中有 {n} 个在两倍以内"
    },
    "shareTitle": "Space Radar:{game}",
    "share": "分享结果",
    "copied": "已复制。粘贴到任何地方。",
    "copyFailed": "无法复制:请选中上面的文字。",
    "played": "今天完成了。新的挑战在 UTC 午夜到来。",
    "streak": "连续 {n} 天"
  }
});
// b200-f6-learn: end
// b200-f8-xr: begin -- the gamepad and the headset (copy/en.xr.js, forge #164, #158), machine-drafted
Object.assign(COPY, {
  "pad": {
    "title": "手柄",
    "label": "手柄操作",
    "close": "关闭手柄操作",
    "capStickL": "左摇杆",
    "capStickR": "右摇杆",
    "capTriggers": "RT · LT",
    "capA": "A · 叉",
    "capX": "X · 方块",
    "capB": "B · 圆圈",
    "capY": "Y · 三角",
    "capDpad": "方向键 ↑ ↓",
    "capView": "视图 · Share",
    "turn": "环顾四周",
    "fly": "前进后退，侧向平移",
    "speed": "更快，更慢",
    "choose": "选择圆环中的目标",
    "go": "飞过去",
    "back": "返回",
    "ship": "飞船物理：开或关",
    "ladder": "沿距离阶梯向外或向内",
    "controls": "这些操作（菜单键也可）",
    "shipToggle": "飞船物理",
    "shipHow": "松开后会继续漂移。按下摇杆即可停止。",
    "notStandard": "这个手柄没有说明按键位置：左摇杆转动视图，按键不使用。",
    "connected": "手柄已连接。按 Y 查看操作。",
    "disconnected": "手柄已断开。",
    "shipOn": "飞船物理已开启：松开后会继续漂移。",
    "shipOff": "飞船物理已关闭。",
    "nothing": "圆环中没有可选的目标。",
    "chooseFirst": "请先选择目标：按 A 选取圆环中的目标。",
    "rung": "{label}，{distance}",
    "home": "地球",
    "trip": "旅程正在控制镜头。它的按钮在屏幕上。"
  },
  "headset": {
    "enter": "进入头显",
    "enterTitle": "在 VR 头显中站在星空下，或沿距离阶梯前行",
    "noteTitle": "戴上之前",
    "comfort": "移动是跳跃而不是滑行，转向每次 30 度，地平线始终保持水平。请坐下，或清空身边的空间。",
    "seizure": "少数人会因闪烁的光线或图案而癫痫发作。如果感到头晕、恶心或看到异常情况，请停止并摘下头显。",
    "how": "看向一个目标，按 A 或右扳机选择它。X 飞过去，B 返回，Y 显示操作，与手柄相同。在“时刻”中，A 播放或暂停，B 返回地图。按住 B 一秒即可退出。",
    "untried": "新功能，尚未在真实头显上试过：请告诉我们你看到了什么。",
    "go": "进入",
    "cancel": "暂不",
    "busy": "请先关闭想象的世界、“球幕与 360”或录制：它们各自绘制自己的画面。",
    "failed": "头显未能启动。",
    "left": "已回到屏幕。",
    "panelHelp": "A 选择   X 前往   B 返回   Y 操作",
    "panelMove": "左摇杆：环绕，并沿阶梯移动   右摇杆：转向，前进后退",
    "panelLeave": "按住 B 退出",
    "chosen": "已选择：{name}",
    "nothing": "正前方没有目标",
    "momentHelp": "A 播放或暂停   B 返回地图   Y 操作",
    "frame": "每帧 {ms} 毫秒，每秒 {fps} 帧（目标 72）",
    "lighter": "帧耗时过长：减少绘制以跟上。"
  }
});
// b200-f8-xr: end
// b200-f9-reach: begin -- the real recordings' panel (copy/en.sound.js, forge #163), machine-drafted
Object.assign(COPY, {
  "realSound": {
    "region": "此处的真实录音",
    "play": "收听{name}",
    "stop": "停止",
    "hide": "隐藏此处的录音",
    "sonified": "真实数据，转换为声音",
    "microphone": "真实声音，来自麦克风",
    "playing": "正在播放：{name}。{how}。",
    "failed": "该录音未能加载。",
    "names": {
      "real-voyager-plasma": "星际空间中的旅行者1号",
      "real-juno-ganymede": "朱诺号飞掠木卫三",
      "real-cassini-saturn": "土星的射电",
      "real-insight-impact": "流星体撞击火星",
      "real-insight-wind": "火星上的风",
      "real-perseverance-dust-devil": "火星上的尘卷风"
    }
  }
});
// b200-f9-reach: end
// b200-f7-ground: begin -- standing on another world and its sky (copy/en.ground.js, forge #146, #147), machine-drafted
Object.assign(COPY, {
  "ground": {
    "stageLabel": "站在另一个世界上",
    "tagGround": "地面 · {world}",
    "tagSky": "从{world}看天空",
    "kindMeasured": "实测地面",
    "kindPlain": "地面未经测量",
    "kindModelled": "模型推算",
    "placeAt": "{world}，{lat}°，东经 {lon}°",
    "worlds": {
      "moon": "月球",
      "mars": "火星",
      "titan": "土卫六",
      "europa": "木卫二",
      "earth": "地球",
      "proxima-b": "Proxima Centauri b",
      "trappist-1e": "TRAPPIST-1 e"
    },
    "measuredGround": "实测：高度来自真实比例的立体地形模型，地面是轨道器自己拍摄的图像（阴影是拍摄当天的）。没有虚构任何巨石或陨石坑。",
    "plainGround": "这里的地面并非根据测量绘制：一片平原延伸到地平线。天空是计算出来的。",
    "modelLine": "着陆坐标处：{what}。其朝向并非来自图像。",
    "timeLine": "当地太阳时 {local} · {utc} · 太阳高度 {sun}°",
    "timeLineStar": "{utc} · {star}高度 {sun}°，始终在同一位置",
    "drive": "驾驶探测车",
    "walk": "步行",
    "driving": "驾驶中，速度约为探测车实际能力的 {x} 倍。",
    "walking": "步行中。",
    "skyOpen": "天空",
    "skyClose": "隐藏天空",
    "leave": "离开",
    "sources": "来源与许可",
    "padLabel": "步行：把摇杆推向要去的方向",
    "keys": "W A S D 或方向键行走，Q 和 E 转身，R 和 F 抬头低头，Shift 奔跑，+ 和 - 缩放，Esc 离开。",
    "padDrive": "驾驶：把圆钮向上推前进，向下推后退，向两侧推转向",
    "keysDrive": "W 或上箭头前进，S 或下箭头后退，A 和 D 或左右箭头转向，R 和 F 上下看，Shift 加速，Esc 离开。",
    "howtoKeys": "你正在驾驶。W 或 ↑ 前进，S 或 ↓ 后退，A 和 D 或 ← 和 → 转向。拖动可环顾四周。",
    "howtoTouch": "你正在驾驶。把圆形控制板向上推前进，向下推后退，向两侧推转向。拖动天空可环顾四周。",
    "driveHint": "这辆探测车可以驾驶：按“驾驶探测车”。",
    "tripDriveTitle": "在这里离开旅程并驾驶这辆探测车",
    "skyTitle": "这片天空",
    "poleStar": "极星：{name}，距天极 {sep}°（星等 {mag}）。",
    "noPoleStar": "这个世界的天极 10° 以内没有亮于 4.5 等的恒星。",
    "unnamedStar": "一颗没有通用名称的恒星",
    "poleLabel": "{name}（极星）",
    "rises": "{name}于当地太阳时 {local}（{utc}）升起。",
    "sets": "{name}于当地太阳时 {local}（{utc}）落下。",
    "neverSets": "从这里看，{name}既不升起也不落下：它始终悬在天空的同一处。",
    "notToday": "在搜索的时间范围内，{name}既不升起也不落下。",
    "transit": "{front}于当地太阳时 {local}（{utc}）从日面前经过，持续 {s} 秒。",
    "noTransit": "未来 {days} 个火星日内，从这里看不到火卫一或火卫二从太阳前经过。",
    "working": "正在计算升落时间…",
    "earthNow": "地球：高度 {alt}°，方位 {az}°，{lit}% 被照亮，星等 {mag}。",
    "airNotes": {
      "mars": "实测颜色：白天的天空取自 Spirit 的真彩色全景图（PIA07882），蓝色日落取自 Curiosity 在盖尔撞击坑拍摄的图像（PIA19400）。",
      "moon": "没有大气，所以正午的天空也是黑的。真实的眼睛会被阳光照亮的地面晃得眼花，只能看到其中少数星星。",
      "europa": "没有大气，所以正午的天空也是黑的。在面向木星的一侧，木星静止地悬在天空中。",
      "titan": "示意颜色：橙色雾霾使肉眼看不见恒星和土星；它们以暗淡的样子画在实际所在的位置。",
      "earth": "",
      "proxima-b": "模型推算：假定 Proxima b 始终以同一面朝向它的恒星，这也是其发现者的预期（Anglada-Escudé et al. 2016）；它的轨道倾角，以及它和 Proxima d 在各自轨道上的位置都是未知的，因此采用了假定值。天空的颜色是示意的：没有人知道那里是否有大气。Alpha Centauri A 和 B 位于它们的真实位置；其他恒星按从太阳看到的样子绘制。",
      "trappist-1e": "模型推算：假定 TRAPPIST-1 e 始终以同一面朝向它的恒星（Gillon et al. 2017）；它的姊妹行星位于实测凌星时刻所给出的位置，在同一平面内的圆轨道上，该平面绕我们的视线按假定的方向旋转。天空的颜色是示意的：没有人知道那里是否有大气。其他恒星按从太阳看到的样子绘制。"
    },
    "parentNote": "这颗卫星始终以同一面朝向它的行星，所以行星既不升起也不落下。",
    "starNote": "假定这颗行星始终以同一面朝向它的恒星，所以恒星既不升起也不落下。",
    "discNote": "太阳、地球、火卫一等有视面的天体都画成大小和相位真实的纯色圆盘，而不是它们的地图或形状。",
    "frameNote": "自转：IAU WGCCRE 2015 报告（Archinal et al. 2018）。位置：本应用自己的星历。",
    "compass": {
      "N": "北",
      "E": "东",
      "S": "南",
      "W": "西"
    },
    "bodies": {
      "sun": "太阳",
      "mercury": "水星",
      "venus": "金星",
      "earth": "地球",
      "moon": "月球",
      "mars": "火星",
      "phobos": "火卫一",
      "deimos": "火卫二",
      "jupiter": "木星",
      "io": "木卫一",
      "europa": "木卫二",
      "ganymede": "木卫三",
      "callisto": "木卫四",
      "saturn": "土星",
      "titan": "土卫六",
      "uranus": "天王星",
      "neptune": "海王星",
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
    "earthAndMoon": "地球和月球",
    "nightOpened": "此处现在是夜晚，所以时钟已设到当地太阳时 {local}，太阳高度 {sun}°。用时钟可以回到现在。",
    "unknownGround": "该地点还没有地形模型。",
    "unknownSky": "这张地图还不能让你站在那个地方：目前只能站在月球、火星、土卫六、木卫二、Proxima b 或 TRAPPIST-1 e 上。"
  }
});
// b200-f7-ground: end
// b200-c3-learn: begin -- the Fengyun-1C Moment (copy/en.moments.fengyun.js and its shelf card, forge #153), machine-drafted
COPY.momentShelf.cards['fengyun-1c'] = {
  "title": "2007：风云一号C",
  "when": "2007年1月11日至今",
  "blurb": "一枚中国导弹在 865 km 高处摧毁一颗旧气象卫星，它已编目的 3 531 块碎片从一个点扩散成环绕地球的一层壳，由语音讲述。"
};
COPY.momentStories['fengyun-1c'] = {
  "title": "2007：风云一号C",
  "blurb": "一枚中国导弹在 865 km 高处摧毁一颗旧气象卫星，它的碎片从一个点扩散成环绕地球的一层壳，至今仍在。",
  "chBefore": "风云一号C",
  "chHit": "试验",
  "chRing": "一个环",
  "chMonths": "两个月",
  "chYear": "第一年",
  "chShell": "一层壳",
  "chToday": "今天",
  "v1a": "2007年1月11日傍晚。风云一号C是一颗已退役的中国气象卫星，重 960 kg，经过两极绕地球运行，高度 845 至 865 km。",
  "v1b": "一枚从西昌附近发射的导弹正向它爬升。它的轨迹从未公布，所以这里没有画出。",
  "v2a": "22:26 UTC：拦截器迎面撞上卫星，接近速度约 8 km/s，把它撞成数千块碎片。",
  "v2b": "每块碎片飞出时都比其余的快一点或慢一点，所以各自走在自己的轨道上。",
  "v3a": "轨道越高，绕一圈的时间越长。一圈又一圈，碎片沿着原来的轨道拉开，几天之内就合成一个环。",
  "v4a": "地球的扁率使每条轨道的平面转动，高度和倾角不同，转得快慢也不同，于是这个环开始像扇子一样散开。",
  "v4b": "试验两个月后，已有超过 1 200 块碎片被编目，另有近 400 块正在跟踪，NASA 的《Orbital Debris Quarterly News》报道。",
  "v5a": "到2007年底，目录中有 2 317 块碎片，只有 22 块落回地球。NASA 估计一厘米及以上的碎片至少有 150 000 块，小到无法跟踪。",
  "v6a": "年复一年，轨道平面一直散开到绕满一圈。到2013年1月，这团碎片云已是环绕地球的一层壳：编目 3 378 块，仍在轨道上 3 076 块。",
  "v6b": "卫星不得不躲避它们。国际空间站在2012年1月曾为其中一块让路。",
  "v7a": "今天目录中有风云一号C的 3 531 块碎片，其中 2 310 块仍在天上，已近二十年。2021年11月10日，空间站又一次躲避了其中一块。",
  "v7b": "数目是测量的。画面是模型：今天幸存的碎片在今天的轨道上，回推到试验的那一刻再散开。",
  "pathSat": "风云一号C的轨道，845 × 865 km，倾角 98.6 度（NASA ODQN，2007年4月），按圆锥曲线绘制；卫星在轨道上被击中的位置是示意的",
  "cloudNote": "这些碎片是目录中仍有的 2 310 块，用目录今天给出的轨道，由模型从一个点散开（二体运动加上地球扁率造成的漂移）；已落下的碎片没有画出，字幕中的数目是测量的。撞击时，每块碎片都从它今天的最低点出发，所以碎片云一开始是卫星下方的一条线，而不是一个点：自 2007 年以来，大气阻力已使许多轨道降低。",
  "drawnNote": "示意：风云一号C 画成带环的标记，每块碎片画成同样大小的点，都不按比例；撞击本身没有画出。",
  "footMore": "更多",
  "footLess": "收起",
  "srcOdqn07": "NASA Orbital Debris Quarterly News 11(2)，2007年4月：卫星、它的轨道、最初的计数",
  "srcOdqn08": "NASA Orbital Debris Quarterly News 12(1)，2008年1月：2007年底的计数",
  "srcOdqn13": "NASA Orbital Debris Quarterly News 17(1)，2013年1月：已编目、已陨落和仍在轨道上的数目",
  "srcOdqn14": "NASA Orbital Debris Quarterly News 18(1)，2014年1月：空间站2012年1月的规避机动",
  "srcOdqn22": "NASA Orbital Debris Quarterly News 26(1)，2022年3月：空间站2021年11月10日的规避机动",
  "srcCelestrak": "CelesTrak，Chinese ASAT test：事件最可能的时刻，22:26:10 UTC",
  "srcSatcat": "CelesTrak 卫星目录（SATCAT），读取于 2026-11-07：今天的计数和每块碎片的轨道",
  "srcWiki": "维基百科，2007 Chinese anti-satellite missile test：接近速度"
};
// b200-c3-learn: end
// b200-c2-deep: begin -- the 3D stars over deep time, the variable stars worth going out for, the black holes against the EHT's pictures and the cards in the trips' voice (copy/en.deep.js, forge #141, #142, #149, #151), machine-drafted
Object.assign(COPY, {
  "starDeep": {
    "moved": "{year} 的星空：每颗星都按其实测的自行移动（依巴谷与盖亚，经 HYG）；沿直线外推这么久是模型。",
    "hidden": "离今天这么远时，没有实测运动的恒星不再绘制。",
    "noPluto": "离今天这么远时不绘制冥王星及其卫星：它们的星历（astronomy-engine）只有 0 至 4000 年的表。",
    "selected": "那时 {name} 距太阳 {d} 光年（模型）；卡片和标签给出的是今天的距离 {today}。"
  },
  "varEvents": {
    "min": "{name} 处于极小",
    "max": "{name} 接近最亮",
    "minLine": "暗至 {mag} 等，{dir}方向，高 {alt}°。",
    "maxLine": "约 {mag} 等，{dir}方向，高 {alt}°。",
    "minClass": "由实测极小时刻（Kreiner 2004）按周期外推：大约准到一刻钟。",
    "maxClass": "由星表的周期和历元推算的模型：米拉变星的极大会提前或推迟数周。",
    "aria": "{title}，{when}。{line}"
  },
  "holeCompare": {
    "fromEarth": "从地球看",
    "fromEarthTitle": "站到黑洞与地球的连线上，北在上、东在左，与 EHT 图像的印法相同",
    "compare": "与 EHT 图像对比",
    "compareTitle": "在所画黑洞旁显示事件视界望远镜的图像，两者都从地球看、北在上",
    "hide": "隐藏 EHT 图像",
    "caption": "EHT，{date}",
    "orient": "北在上，东在左，与此刻黑洞的画法一致。",
    "credit": "图像：EHT Collaboration，CC BY 4.0。",
    "source": "来源",
    "alt": "事件视界望远镜拍摄的 {name}，{date}：暗色中心周围的一圈橙色光环。",
    "brightest": "从地球看、北在上时，所画的光环在位置角约 {ours}° 处最亮（在画面上测得）；{date} 的 EHT 图像在约 {theirs}° 处最亮。",
    "approx": {
      "m87-star": "已对齐：倾角（与视线成 17°）和喷流在天空中的方向（288°）是实测的（Walker 等 2018），气流按顺时针旋转（EHT 2019 第五篇），所以迎面而来、因运动而增亮的一侧落在南边。按线性亮度沿光环测量，我们的亮侧约为暗侧的 2.5 倍（模糊到 EHT 的 20 微角秒时为 2.1）；他们的在 2017 年为 2.7，2018 年为 4.2，因此我们的与 2017 年相符。近似之处：光线按不自转的黑洞追踪，气体是沿圆轨道运动的薄盘，而不是 EHT 模型中又热又厚的吸积流。他们的亮斑一年内移动了约 30°；我们的不动。",
      "sgr-a-star": "已对齐：从与自转轴成 30° 的方向看，与 EHT 2022 第五篇中最吻合的模型一致，并像 GRAVITY 看到的耀发一样顺时针旋转。人为选择：自转轴在天空中的指向，至今无人测得；我们把它转到使较亮一侧落在 EHT 图像最亮之处。近似之处：光线绕不自转的黑洞和薄盘追踪；EHT 图像是对几分钟内就会变化的气流整夜的平均，作者说其中三个亮结并非都是真实的。 我们的亮侧约为暗侧的五倍（模糊到 EHT 的 20 微角秒时为 4.5），他们的为 1.7：在 30° 下，圆轨道使近侧增亮的程度远超 EHT 整夜平均所显示的。"
    }
  },
  "cardVoice": {
    "readTitle": "朗读此卡片：用旅程的合成语音读出引用的维基百科文字",
    "credit": "语音：Kokoro-82M（af_heart），合成语音，Apache-2.0；文字来自维基百科（CC BY-SA 4.0）。"
  }
});
// b200-c2-deep: end

// b200-s1-fixes: begin -- the long mission clock's units (copy/en.moments.js momentPlayer metYears, metDays), machine-drafted
COPY.momentPlayer.metYears = "{y}年{d}天";
COPY.momentPlayer.metDays = "{d}天";
COPY.truth.exoPacked = "我们 {date} 的压缩副本"; // forge #88: which list an exoplanet came from
COPY.truth.exoLive = "档案馆的列表，读取于 {date}";
// The deep-sky catalogue's type phrases (data/dso.json `typeText`), lowercased, in this language: the card's lead and its
// "What it is" row read them through RULES.typeWords; a phrase not here stays English, which is data.
const S1_TYPES = {"globular cluster": "球状星团", "open cluster": "疏散星团", "dwarf spheroidal galaxy": "矮椭球星系", "spiral galaxy": "旋涡星系", "emission nebula": "发射星云", "planetary nebula": "行星状星云", "dwarf irregular galaxy": "矮不规则星系", "barred spiral galaxy": "棒旋星系", "elliptical galaxy": "椭圆星系", "lenticular galaxy": "透镜状星系", "h ii region nebula with cluster": "带星团的电离氢区", "dwarf elliptical galaxy": "矮椭圆星系", "h ii region nebula": "电离氢区", "barred irregular galaxy": "棒状不规则星系", "ultra-faint dwarf galaxy": "超暗弱矮星系", "dark nebula": "暗星云", "young open cluster in an emission nebula": "发射星云中的年轻疏散星团", "supernova remnant": "超新星遗迹", "nebula with cluster": "带星团的星云", "milky way star cloud": "银河星云", "optical double": "光学双星", "asterism": "星群", "diffuse nebula": "弥漫星云", "starburst galaxy": "星暴星系", "dwarf irregular starburst galaxy": "矮不规则星暴星系", "transition dwarf galaxy, part irregular, part spheroidal": "过渡型矮星系，部分不规则、部分椭球", "barred irregular galaxy, seen edge-on": "棒状不规则星系，侧向可见", "ultra-faint dwarf galaxy, or perhaps a star cluster": "超暗弱矮星系，也可能是星团", "transition dwarf galaxy, part spheroidal, part irregular": "过渡型矮星系，部分椭球、部分不规则", "spiral galaxy, seen nearly edge-on and bursting with new stars": "旋涡星系，近乎侧向可见，充满新生恒星", "peculiar galaxy with a giant black hole firing radio jets": "特殊星系，中心巨型黑洞喷出射电喷流", "pair of open clusters": "一对疏散星团", "spiral galaxy seen exactly edge-on": "完全侧向的旋涡星系", "reflection nebula": "反射星云", "reflection and emission nebula": "反射兼发射星云", "spiral galaxy seen edge-on": "侧向的旋涡星系", "barred spiral galaxy seen edge-on": "侧向的棒旋星系", "spiral galaxy seen face-on": "正向的旋涡星系", "barred spiral galaxy seen nearly edge-on": "近乎侧向的棒旋星系", "pair of colliding galaxies": "一对正在碰撞的星系"};
const S1_PLACES = [[" in the large magellanic cloud", "（位于大麦哲伦云）"], [" in the small magellanic cloud", "（位于小麦哲伦云）"], [" in the milky way", "（位于银河系）"], [" in the local group", "（位于本星系群）"]];
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
    "unnamed": "一颗未命名的恒星（AT-HYG {n}）",
    "cite": "AT-HYG v4.0（CC BY-SA 4.0，David Nash）：位置与亮度来自 Tycho-2，距离来自 {dist}",
    "from": {
      "gaia-dr3": "Gaia DR3",
      "gaia-dr2": "Gaia DR2",
      "hipparcos": "依巴谷",
      "gliese": "格利泽星表",
      "other": "一份较早的星表"
    },
    "error": "距离精确到约 ±{pct} %（视差与其误差之比约 {poe}）：按该任务在这一亮度的典型误差（{mas} 毫角秒）建模，因为 AT-HYG 不包含这颗星自己的误差",
    "noError": "AT-HYG 没有给出这个距离的误差",
    "guess": "这个距离只是猜测：在 3 kpc（约 1 万光年）以外，视差只有零点几毫角秒，而 AT-HYG 不含这颗星自己的误差，它只保留大于自身误差的视差",
    "lineHyg": "三维恒星：HYG 的 109 389 颗。",
    "lineAthyg": "三维恒星：HYG 的 109 389 颗，加上 AT-HYG 的 {n} 百万颗，在阶梯的一级上围绕相机加载（一次最多 {k} 百万颗），并绘制到从相机看去的 {lim} 星等，比肉眼所见更暗，逐渐淡出。",
    "shell": "在某个天体的场景中，三维恒星只用 HYG：从太阳看亮于 7.5 等的 {n} 颗 AT-HYG 恒星在那里不绘制。",
    "why": {
      "low": "低画质只绘制 HYG。",
      "latched": "帧率过低：只用 HYG。",
      "saver": "省流量模式：只用 HYG。",
      "none": ""
    },
    "gaiaHeld": "Gaia DR3 不是一个档位：ESA 只许可其档案数据用于非商业用途（CC BY-NC 3.0 IGO）。",
    "farTime": "AT-HYG 的恒星只按今天的日期绘制：遥远时代的视图只用 HYG。"
  }
});
// b200-f10-stars3d: end
// b200-s4a-look: begin -- how a world is drawn (its card's note), the Earth in a card's breadcrumb and our missions' event titles in the date field (copy/en.js worldView, sky.bodies; copy/en.find.js dateJump.eventTitles; 2.0.0 look finding 8) and what a tap no figure of another sky reaches says (copy/en.later.js skyLore; finding 10), machine-drafted
COPY.worldView.nearer = "{name} 画在它真实的方向上，但比实际更近、更大，方便你找到它。";
COPY.worldView.asIs = "{name} 画在它真实的位置，大小也是真实的。";
COPY.sky.bodies.earth = "地球";
COPY.dateJump.eventTitles = {
  "Launch": "发射",
  "Closest to Jupiter": "最接近木星",
  "Closest to Saturn": "最接近土星",
  "The Pale Blue Dot": "暗淡蓝点",
  "The most distant thing we made": "我们造过的最远之物",
  "The termination shock": "终端激波",
  "Into interstellar space": "进入星际空间",
  "Closest to Uranus": "最接近天王星",
  "Closest to Neptune": "最接近海王星",
  "Jupiter's push": "木星的助推",
  "Saturn's orbit": "土星轨道",
  "Closest to Pluto": "最接近冥王星",
  "Arrokoth": "阿罗科斯",
  "Back past Earth": "再次飞掠地球",
  "Into orbit round Jupiter": "进入环绕木星的轨道",
  "Past Venus": "飞掠金星",
  "Past Venus again": "再次飞掠金星",
  "Past Jupiter": "飞掠木星",
  "Arrival at Saturn": "抵达土星",
  "Huygens let go": "惠更斯号分离",
  "Huygens lands on Titan": "惠更斯号登陆土卫六",
  "Earth, seen from Saturn": "从土星看地球",
  "The Grand Finale begins": "大结局开始",
  "Into Saturn": "坠入土星",
  "Out of the shuttle": "离开航天飞机",
  "The first asteroid visit": "第一次造访小行星",
  "Past Earth a second time": "第二次飞掠地球",
  "Ida and its moon": "艾达和它的卫星",
  "Into Jupiter": "坠入木星",
  "Past Mars": "飞掠火星",
  "Into orbit round Vesta": "进入环绕灶神星的轨道",
  "Leaving Vesta": "离开灶神星",
  "Into orbit round Ceres": "进入环绕谷神星的轨道",
  "The last contact": "最后一次联系",
  "Into the asteroid belt": "进入小行星带",
  "Past the farthest planet": "越过最远的行星",
  "The last signal": "最后的信号",
  "The first craft at Saturn": "第一艘抵达土星的探测器",
  "Past the orbit of Neptune": "越过海王星轨道",
  "Arrival at L2": "抵达 L2",
  "The first pictures": "第一批图像",
  "Into orbit round the Moon": "进入环月轨道",
  "The Eagle has landed": "鹰已着陆",
  "One small step": "一小步",
  "Leaving the Moon": "离开月球",
  "Splashdown": "溅落",
  "Apollo 8 leaves for the Moon": "阿波罗 8 号飞向月球",
  "Apollo 11 leaves for the Moon": "阿波罗 11 号飞向月球",
  "Apollo 17, at night": "阿波罗 17 号，夜间",
  "Flying again": "重返太空",
  "Hubble goes up": "哈勃升空",
  "The last Shuttle from 39B": "39B 的最后一次航天飞机发射",
  "Past Mathilde": "飞掠玛蒂尔德",
  "A first pass of Eros": "第一次飞掠爱神星",
  "Into orbit round Eros": "进入环绕爱神星的轨道",
  "Down on Eros": "降落在爱神星",
  "Through the coma of Wild 2": "穿过怀尔德 2 号的彗发",
  "The capsule lands": "返回舱着陆",
  "Past Tempel 1": "飞掠坦普尔 1 号",
  "The impact": "撞击",
  "Earth and Moon flyby": "飞掠地球和月球",
  "Past Hartley 2": "飞掠哈特利 2 号",
  "The course correction": "航向修正",
  "Let go": "分离",
  "Europa and Io, on the way in": "途经木卫二和木卫一",
  "Into Jupiter’s air": "进入木星大气",
  "Landing in Jezero": "在耶泽罗着陆",
  "The first flight": "第一次飞行",
  "The first rock core": "第一根岩芯",
  "Two become one": "合二为一",
  "People move in": "人们入住",
  "The last shuttle sets off": "最后一架航天飞机出发",
  "Discovered": "被发现",
  "Past Earth": "飞掠地球",
};
// 2.0.0 look finding 10: a tap no figure of another people's sky reaches (copy/en.later.js skyLore)
COPY.skyLore.notHereTitle = "这里没有{culture}星空的图形";
COPY.skyLore.notHere = "你点按的地方没有画出{culture}星空的任何图形。最近的是{name}，相距 {deg}°。";
COPY.skyLore.notHereNone = "你点按的地方没有画出{culture}星空的任何图形。";
COPY.skyLore.nearest = "{name}的故事";
// b200-s4a-look: end

// redesign 2026-11-10: begin -- machine-drafted: the Games link of the explore panel (copy/en.js games), the rail's
// email updates (rail.subscribe), their popover and the row under Coming up (copy/en.subscribe.js emailUpdates;
// comingUp is the old subscribe.heading, moved)
COPY.rail.subscribe = "邮件更新";
COPY.rail.coffee = "请我们喝杯咖啡";
COPY.rail.coffeeLabel = "在 Buy Me a Coffee 上支持 Space Radar";
COPY.games = {"label": "游戏", "title": "Space Radar 团队的太空游戏（在新标签页中打开）", "href": "https://games.spaceradar.ai/"};
COPY.emailUpdates = {
  "title": "免费邮件更新",
  "text": "选择你想了解的内容。在你确认之前不会发送任何邮件。",
  "pick": "至少选择一项",
  "news": "Space Radar 新闻",
  "journal": "日志",
  "games": "太空游戏",
  "sky": "天象提醒",
  "models": "Space Radar 模型",
  "video": "Space Radar 视频",
  "email": "电子邮件地址",
  "placeholder": "you@example.org",
  "button": "订阅",
  "sending": "正在发送…",
  "retry": "重试",
  "check": "请查收邮件：我们已向 {email} 发送了一个链接。在你点击它之前不会发送任何邮件。",
  "invalidEmail": "这个地址看起来不正确。",
  "rateLimited": "此处尝试次数过多。请几分钟后再试。",
  "busy": "今天订阅的人很多。请明天再试。",
  "sendFailed": "我们无法发送邮件。请稍后再试。",
  "invalidLists": "请至少选择一个列表。",
  "other": "出了点问题。请重试。",
  "unreachable": "无法连接服务器。",
  "privacy": "我们只保存你的地址和你选择的列表，别无其他。没有跟踪像素，没有改写的链接。每封邮件都可一键退订。",
  "privacyLink": "隐私",
  "honeypot": "此项请留空",
  "close": "关闭",
  "comingUp": "用邮件告诉我接下来有什么",
  "skyButton": "接收天象提醒"
};
// redesign 2026-11-10: end
