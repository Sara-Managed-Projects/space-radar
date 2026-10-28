// GENERATED from registry/visual-classes.yaml and the registries it classifies, by
// scripts/gen_visual_classes_js.py. Do not edit: change the YAML and run the script.
//
// `python3 scripts/gen_visual_classes_js.py --check` fails CI when this file and the registries disagree.
// One class a record (scripts/coverage.py refuses a record no class takes, or two take). `honesty` is
// the class's default; a record's own drawn class still wins on its card. Not loaded at boot.

/** The 38 classes of the package and the house's four, each with its members by record set. */
export const VISUAL_CLASSES = [
{
"id": "SUN",
"title": "The Sun",
"honesty": "modelled",
"members": {
"worlds": [
"sun"
]
}
},
{
"id": "ROCKY_PLANET",
"title": "Rocky planets",
"honesty": "measured",
"members": {
"worlds": [
"earth",
"mercury",
"venus",
"mars"
],
"weather": [
"venus-superrotation",
"mars-season",
"venus-y"
]
}
},
{
"id": "GAS_GIANT",
"title": "Gas giants",
"honesty": "measured",
"members": {
"worlds": [
"jupiter",
"saturn"
],
"weather": [
"jupiter-bands",
"jupiter-eddies",
"jupiter-ovals",
"jupiter-polar-cyclones",
"jupiter-depth",
"jupiter-detail",
"saturn-detail",
"saturn-bands",
"saturn-hexagon",
"saturn-polar-vortex",
"jupiter-lightning",
"saturn-lightning"
]
}
},
{
"id": "ICE_GIANT",
"title": "Uranus and Neptune",
"honesty": "measured",
"members": {
"worlds": [
"uranus",
"neptune"
],
"weather": [
"uranus-detail",
"neptune-detail",
"neptune-cirrus",
"uranus-drift",
"neptune-drift"
]
}
},
{
"id": "RINGS",
"title": "Planetary rings",
"honesty": "modelled",
"members": {
"rings": [
"saturn-ring"
]
}
},
{
"id": "VOLCANIC_MOON",
"title": "Io",
"honesty": "measured",
"members": {
"worlds": [
"io"
]
}
},
{
"id": "ICY_MOON",
"title": "Icy moons",
"honesty": "measured",
"members": {
"worlds": [
"europa",
"ganymede",
"callisto",
"enceladus",
"triton",
"charon",
"mimas",
"tethys",
"dione",
"rhea",
"iapetus",
"miranda",
"ariel",
"umbriel",
"titania",
"oberon"
]
}
},
{
"id": "TITAN",
"title": "Titan",
"honesty": "measured",
"members": {
"worlds": [
"titan"
],
"weather": [
"titan-clouds"
]
}
},
{
"id": "AIRLESS_MOON",
"title": "The Moon, Phobos and Deimos",
"honesty": "measured",
"members": {
"worlds": [
"moon",
"phobos",
"deimos"
],
"sites": [
"copernicus",
"tycho",
"shackleton",
"moon-south-pole"
]
}
},
{
"id": "DWARF_PLANET",
"title": "Dwarf planets",
"honesty": "measured",
"members": {
"worlds": [
"pluto"
],
"small_bodies": [
"dwarf-ceres",
"dwarf-eris",
"dwarf-haumea",
"dwarf-makemake",
"dwarf-sedna",
"dwarf-gonggong",
"dwarf-quaoar",
"dwarf-orcus"
]
}
},
{
"id": "ASTEROID",
"title": "Asteroids",
"honesty": "modelled",
"members": {
"real_models": [
"asteroid-bennu",
"asteroid-vesta",
"asteroid-eros",
"dwarf-ceres",
"asteroid-ryugu",
"asteroid-itokawa",
"asteroid-didymos"
],
"model_kinds": [
"asteroid-generic"
],
"small_bodies": [
"asteroid-99942",
"asteroid-101955",
"asteroid-433",
"asteroid-162173",
"asteroid-4",
"asteroid-65803",
"asteroid-25143",
"asteroid-2",
"asteroid-3200",
"interstellar-1i",
"interstellar-2i"
],
"layers": [
"asteroids"
]
}
},
{
"id": "COMET",
"title": "Comets",
"honesty": "modelled",
"members": {
"model_kinds": [
"comet-generic"
],
"small_bodies": [
"comet-1P"
],
"layers": [
"comets"
]
}
},
{
"id": "ARTIFICIAL_SATELLITE",
"title": "Satellites, stations and debris",
"honesty": "measured",
"members": {
"real_models": [
"poes",
"sentinel6",
"icesat2",
"jason",
"oco2",
"cloudsat",
"calipso",
"tselina2",
"seastar",
"cygnss",
"icon",
"hinode",
"gpm",
"fermi",
"tdrs",
"soho",
"iss",
"landsat",
"bus-ssl1300",
"dscovr",
"mms",
"sdo",
"suomi",
"tess",
"hubble",
"chandra",
"swift",
"goes",
"terra",
"aqua",
"aura",
"grace",
"jwst",
"landsat8",
"spitzer",
"kepler",
"roman",
"radarsat1",
"cygnus",
"nustar",
"xrism",
"noaa21",
"seasat",
"hitomi",
"lageos",
"ajisai",
"soyuz-ms",
"progress-ms",
"dragon-crew",
"dragon-cargo",
"shenzhou",
"tianzhou",
"starlette",
"lares",
"lares2",
"etalon",
"westpac",
"swot",
"nisar",
"ixpe",
"pace",
"starlink-v1",
"umbra",
"iceye",
"gps-iir",
"gps-iif",
"gps-iii",
"galileo-foc",
"michibiki",
"irnss",
"saocom",
"strix",
"terrasar-x",
"xmm-newton",
"metop",
"envisat",
"ers-1",
"sentinel-1",
"sentinel-2",
"sentinel-3",
"sentinel-5p",
"cryosat-2",
"smos",
"alos-2",
"glonass-m",
"glonass-k",
"fengyun-3",
"himawari",
"gcom-w",
"gcom-c",
"dampe",
"cses",
"scisat",
"proba-3-csc",
"proba-3-osc",
"proba-v",
"formosat-7",
"oao-2",
"oao-3",
"smap",
"jason-3",
"sorce",
"themis",
"tiangong",
"wentian",
"mengtian",
"shenzhou-orbital",
"gaia",
"earthcare",
"biomass",
"swarm",
"metop-sg-a",
"iris",
"timed",
"sert-2",
"isis-1",
"tracers",
"thuraya",
"inmarsat-4",
"viasat-3",
"o3b",
"globalstar-2",
"o3b-mpower",
"wgs",
"aehf",
"muos",
"sbirs-geo",
"ao-7",
"swas",
"meteosat-msg",
"fengyun-2",
"mtg-i",
"mtg-s",
"insat-3d",
"gk2a",
"gk2b",
"meteor-m2",
"midori-2",
"resurs-dk1",
"worldview-3",
"blacksky-gen2",
"satellogic-newsat",
"planet-pelican",
"hawkeye360-block1",
"ghgsat-c",
"gaofen-1",
"cbers-4",
"cbers-4a",
"amazonia-1",
"kompsat-3",
"kompsat-5",
"cartosat-2",
"resourcesat-2",
"eos-06",
"kanopus-v",
"resurs-p"
],
"model_kinds": [
"satellite-iridium",
"satellite-spacemobile",
"satellite-solarsail",
"satellite-sphere",
"satellite-navigation",
"satellite-cubesat",
"satellite-cubesat-6u",
"satellite-cubesat-1u",
"satellite-cubesat-2u",
"satellite-navigation-gps-iif",
"satellite-navigation-gps-iii",
"satellite-navigation-glonass-m",
"satellite-navigation-glonass-k",
"satellite-navigation-beidou-meo",
"satellite-oneweb",
"satellite-starlink-v1",
"satellite-starlink-v2",
"satellite-radar",
"satellite-radar-mesh",
"satellite-generic",
"satellite-comms",
"station-soyuz",
"station-progress",
"station-cygnus",
"station-tiangong",
"station-tiangong-module",
"station-shenzhou",
"station-tianzhou",
"station-dragon",
"station-dragon-cargo",
"station-generic",
"debris-shard",
"telescope-gaia",
"telescope-generic",
"telescope-jwst",
"satellite-space-telescope"
],
"reentries": [
"reentry-tiangong-1",
"reentry-cz-5b-y2",
"reentry-skylab"
],
"layers": [
"stations",
"notable",
"starlink-trains",
"just-launched",
"active",
"geo-ring",
"debris-notable",
"debris-field",
"visual",
"reentries"
]
}
},
{
"id": "LAUNCH_AND_ROCKET",
"title": "Launches and rockets",
"honesty": "illustrative",
"members": {
"sites": [
"saturn-v-lc-39a",
"shuttle-lc-39b"
],
"real_models": [
"saturn-v",
"shuttle-stack",
"delta2-stage",
"atlas5-centaur",
"centaur-d",
"falcon9-stage2",
"h2a-stage2",
"kosmos3m-stage2"
],
"model_kinds": [
"rocket-upper-stage",
"rocket-spent-stage",
"pad-generic"
],
"rockets": [
"falcon-9",
"falcon-heavy",
"ariane-62",
"ariane-64",
"ariane-6",
"electron",
"neutron",
"spectrum",
"starship",
"soyuz-2",
"vulcan",
"vulcan-vc2s",
"vulcan-vc4s",
"vulcan-vc4l",
"vulcan-vc6l",
"vega-c",
"vega",
"atlas-v",
"h3",
"h3-24",
"sls",
"new-glenn",
"firefly-alpha",
"terran-r",
"pslv",
"pslv-ca",
"gslv-mk2",
"lvm3",
"long-march-2d",
"long-march-2f",
"long-march-5",
"long-march-5b",
"long-march-8a",
"long-march-10",
"long-march-12a",
"nuri",
"themis",
"hanbit-nano",
"angara-12",
"minotaur-iv",
"delta-iv-heavy",
"proton-m",
"angara-a5",
"zhuque-2e",
"gravity-1",
"kinetica-1",
"kuaizhou-1a",
"minotaur-i",
"small-commercial-orbital"
],
"layers": [
"launches",
"ground-sites"
]
}
},
{
"id": "SPACE_PROBE",
"title": "Space probes",
"honesty": "measured",
"members": {
"real_models": [
"mro",
"parker",
"juno",
"voyager",
"cassini",
"galileo",
"pioneer",
"lro",
"osiris-rex",
"stereo",
"dawn",
"odyssey",
"rosetta",
"near",
"stardust",
"deep-impact",
"maven",
"new-horizons",
"europa-clipper",
"psyche",
"juice",
"bepicolombo",
"hera",
"lucy",
"mars-express",
"hayabusa2",
"hope"
],
"model_kinds": [
"probe-generic",
"probe-new-horizons",
"probe-mars-2020-cruise",
"probe-solar-orbiter"
],
"probes": [
"deep-jwst",
"deep-soho",
"deep-roman",
"deep-mro",
"deep-mars-express",
"deep-mars-odyssey",
"deep-hope",
"deep-juno",
"deep-lro",
"deep-voyager-1",
"deep-voyager-2",
"deep-new-horizons",
"deep-pioneer-10",
"deep-pioneer-11",
"deep-maven",
"deep-cassini",
"deep-galileo",
"deep-mars-2020",
"deep-dawn",
"deep-rosetta",
"deep-near",
"deep-stardust",
"deep-deep-impact",
"deep-parker",
"deep-solar-orbiter",
"deep-psyche",
"deep-lucy",
"deep-europa-clipper",
"deep-juice",
"deep-bepicolombo",
"deep-hera",
"deep-osiris-apex",
"deep-hayabusa2",
"deep-stereo-a",
"deep-gaia",
"deep-spitzer",
"deep-kepler"
],
"layers": [
"deep-space"
]
}
},
{
"id": "LANDING_SITE",
"title": "Landing sites on other worlds",
"honesty": "measured",
"members": {
"sites": [
"apollo-11",
"apollo-14",
"apollo-16",
"apollo-17",
"change-4",
"beresheet",
"surveyor-1",
"surveyor-3",
"apollo-12",
"luna-16",
"lunokhod-1",
"apollo-15",
"lunokhod-2",
"change-3",
"yutu",
"change-5",
"chandrayaan-3",
"slim",
"im-1",
"change-6",
"blue-ghost-1",
"jezero",
"ingenuity",
"gale",
"elysium",
"utopia",
"viking-1",
"viking-2",
"mars-pathfinder",
"spirit",
"opportunity",
"phoenix",
"mars-3",
"huygens"
],
"real_models": [
"dsn70",
"lunar-module",
"perseverance",
"pad",
"dsn34",
"mer",
"insight",
"viking-lander",
"ingenuity",
"curiosity",
"vikram",
"odysseus",
"blue-ghost",
"surveyor",
"surveyor-3",
"slim",
"zhurong",
"change-3",
"change-4",
"yutu",
"change-5",
"lunokhod-1",
"lunokhod-2",
"luna-16",
"mars-3",
"phoenix",
"pathfinder"
],
"model_kinds": [
"site-surveyor",
"rover-generic",
"lander-generic"
]
}
},
{
"id": "EXOPLANET",
"title": "Exoplanets and their systems",
"honesty": "modelled",
"members": {
"systems": [
"system-trappist-1",
"system-proxima-cen",
"system-lhs-1140",
"system-kepler-186",
"system-kepler-452",
"system-kepler-62",
"system-kepler-442",
"system-kepler-22",
"system-kepler-69",
"system-toi-700",
"system-toi-715",
"system-teegardens-star",
"system-gliese-12",
"system-k2-18",
"system-l-98-59",
"system-gj-1132",
"system-gj-1214",
"system-ross-128",
"system-wolf-1069",
"system-gj-667-c",
"system-55-cnc",
"system-wasp-12",
"system-wasp-121",
"system-hd-189733",
"system-hd-209458",
"system-51-peg",
"system-kelt-9",
"system-toi-849",
"system-psr-b1257-12",
"system-hr-8799",
"system-beta-pictoris",
"system-kepler-90",
"system-k2-138",
"system-kepler-11",
"system-hd-10180",
"system-kepler-1649",
"system-wasp-17",
"system-wasp-39",
"system-51-eri",
"system-pds-70",
"system-af-lep"
],
"planets": [
"exo-trappist-1-b",
"exo-trappist-1-c",
"exo-trappist-1-d",
"exo-trappist-1-e",
"exo-trappist-1-f",
"exo-trappist-1-g",
"exo-trappist-1-h",
"exo-proxima-cen-d",
"exo-proxima-cen-b",
"exo-lhs-1140-c",
"exo-lhs-1140-b",
"exo-kepler-186-b",
"exo-kepler-186-c",
"exo-kepler-186-d",
"exo-kepler-186-e",
"exo-kepler-186-f",
"exo-kepler-452-b",
"exo-kepler-62-b",
"exo-kepler-62-c",
"exo-kepler-62-d",
"exo-kepler-62-e",
"exo-kepler-62-f",
"exo-kepler-442-b",
"exo-kepler-22-b",
"exo-kepler-69-b",
"exo-kepler-69-c",
"exo-toi-700-b",
"exo-toi-700-c",
"exo-toi-700-e",
"exo-toi-700-d",
"exo-toi-715-b",
"exo-teegarden-s-star-b",
"exo-teegarden-s-star-c",
"exo-teegarden-s-star-d",
"exo-gliese-12-b",
"exo-k2-18-c",
"exo-k2-18-b",
"exo-l-98-59-b",
"exo-l-98-59-c",
"exo-l-98-59-d",
"exo-l-98-59-e",
"exo-l-98-59-f",
"exo-gj-1132-b",
"exo-gj-1132-c",
"exo-gj-1214-b",
"exo-ross-128-b",
"exo-wolf-1069-b",
"exo-gj-667-c-b",
"exo-gj-667-c-c",
"exo-gj-667-c-f",
"exo-gj-667-c-e",
"exo-gj-667-c-g",
"exo-55-cnc-e",
"exo-55-cnc-b",
"exo-55-cnc-c",
"exo-55-cnc-f",
"exo-55-cnc-d",
"exo-wasp-12-b",
"exo-wasp-121-b",
"exo-hd-189733-b",
"exo-hd-209458-b",
"exo-51-peg-b",
"exo-kepler-16-b",
"exo-kelt-9-b",
"exo-toi-849-b",
"exo-psr-b1257-12-b",
"exo-psr-b1257-12-c",
"exo-psr-b1257-12-d",
"exo-hr-8799-e",
"exo-hr-8799-d",
"exo-hr-8799-c",
"exo-hr-8799-b",
"exo-bet-pic-c",
"exo-bet-pic-b",
"exo-bet-pic-d",
"exo-koi-351-b",
"exo-koi-351-c",
"exo-kepler-90-i",
"exo-koi-351-d",
"exo-koi-351-e",
"exo-koi-351-f",
"exo-koi-351-g",
"exo-koi-351-h",
"exo-k2-138-b",
"exo-k2-138-c",
"exo-k2-138-d",
"exo-k2-138-e",
"exo-k2-138-f",
"exo-k2-138-g",
"exo-kepler-11-b",
"exo-kepler-11-c",
"exo-kepler-11-d",
"exo-kepler-11-e",
"exo-kepler-11-f",
"exo-kepler-11-g",
"exo-hd-10180-c",
"exo-hd-10180-d",
"exo-hd-10180-e",
"exo-hd-10180-f",
"exo-hd-10180-g",
"exo-hd-10180-h",
"exo-kepler-1649-b",
"exo-kepler-1649-c",
"exo-kepler-1647-b",
"exo-wasp-17-b",
"exo-wasp-39-b",
"exo-51-eri-b",
"exo-pds-70-b",
"exo-af-lep-b"
],
"layers": [
"exoplanets",
"systems"
]
}
},
{
"id": "STAR",
"title": "Stars",
"honesty": "measured",
"members": {
"exotics": [
"exotic-eta-carinae",
"exotic-wd-j1330-6435",
"exotic-betelgeuse"
],
"stars_notable": [
"hip-70890",
"hip-71683",
"hip-71681",
"hip-87937",
"Wolf 359",
"hip-32349",
"hip-16537",
"hip-104214",
"hip-37279",
"hip-8102",
"hip-24186",
"hip-3829",
"hip-30438",
"hip-69673",
"hip-91262",
"hip-24608",
"hip-24436",
"hip-7588",
"hip-97649",
"hip-21421",
"hip-65474",
"hip-80763",
"hip-37826",
"hip-113368",
"hip-102098",
"hip-49669",
"hip-60718",
"hip-36850",
"hip-11767",
"hip-68756",
"hip-116727",
"hip-10826",
"hip-14576",
"hip-110991",
"hip-23416",
"hip-65378",
"hip-95947",
"hip-79672",
"hip-113357",
"hip-7513",
"hip-27321"
],
"catalogues": [
"stars3d"
],
"layers": [
"stars"
]
}
},
{
"id": "BINARY_AND_MULTIPLE",
"title": "Binary and multiple stars",
"honesty": "modelled",
"members": {
"systems": [
"system-kepler-16",
"system-kepler-1647"
]
}
},
{
"id": "COMPACT_REMNANT",
"title": "Pulsars, magnetars and white dwarfs",
"honesty": "illustrative",
"members": {
"exotics": [
"exotic-crab-pulsar",
"exotic-vela-pulsar",
"exotic-psr-b1919-21",
"exotic-sgr-1806-20",
"exotic-geminga",
"exotic-psr-j1748-2446ad",
"exotic-hulse-taylor",
"exotic-psr-j1614-2230",
"exotic-psr-j0348-0432"
]
}
},
{
"id": "BLACK_HOLE",
"title": "Black holes",
"honesty": "illustrative",
"members": {
"exotics": [
"exotic-sgr-a-star",
"exotic-m87-star",
"exotic-cygnus-x-1",
"exotic-gaia-bh1",
"exotic-gaia-bh3",
"exotic-v404-cygni",
"exotic-ss-433",
"exotic-grs-1915-105"
]
}
},
{
"id": "OPEN_CLUSTER",
"title": "Open clusters",
"honesty": "illustrative",
"members": {
"dso": [
"dso-m6",
"dso-m7",
"dso-m11",
"dso-m18",
"dso-m21",
"dso-m23",
"dso-m24",
"dso-m25",
"dso-m26",
"dso-m29",
"dso-m34",
"dso-m35",
"dso-m36",
"dso-m37",
"dso-m38",
"dso-m39",
"dso-m40",
"dso-m41",
"dso-m44",
"dso-m45",
"dso-m46",
"dso-m47",
"dso-m48",
"dso-m50",
"dso-m52",
"dso-m67",
"dso-m73",
"dso-m93",
"dso-m103",
"dso-double-cluster",
"dso-hyades",
"dso-jewel-box",
"dso-ngc-2244",
"dso-ngc-3532",
"dso-ic-2602",
"dso-ngc-6231",
"dso-owl-cluster",
"dso-carolines-rose"
]
}
},
{
"id": "GLOBULAR_CLUSTER",
"title": "Globular clusters",
"honesty": "illustrative",
"members": {
"dso": [
"dso-m2",
"dso-m3",
"dso-m4",
"dso-m5",
"dso-m9",
"dso-m10",
"dso-m12",
"dso-m13",
"dso-m14",
"dso-m15",
"dso-m19",
"dso-m22",
"dso-m28",
"dso-m30",
"dso-m53",
"dso-m54",
"dso-m55",
"dso-m56",
"dso-m62",
"dso-m68",
"dso-m69",
"dso-m70",
"dso-m71",
"dso-m72",
"dso-m75",
"dso-m79",
"dso-m80",
"dso-m92",
"dso-m107",
"dso-omega-centauri",
"dso-47-tucanae",
"dso-ngc-2419",
"dso-ngc-6397"
]
}
},
{
"id": "EMISSION_NEBULA",
"title": "Emission nebulae (H II regions)",
"honesty": "measured",
"members": {
"dso": [
"dso-m8",
"dso-m16",
"dso-m17",
"dso-m20",
"dso-m42",
"dso-m43",
"dso-carina-nebula",
"dso-rosette-nebula",
"dso-north-america-nebula",
"dso-tarantula-nebula",
"dso-bubble-nebula",
"dso-flame-nebula",
"dso-thors-helmet",
"dso-christmas-tree-cluster",
"dso-heart-nebula",
"dso-soul-nebula",
"dso-cocoon-nebula",
"dso-cats-paw-nebula",
"dso-war-and-peace-nebula",
"dso-wizard-nebula",
"dso-pacman-nebula",
"dso-crescent-nebula",
"dso-california-nebula"
],
"photographs": [
"dso-m42",
"dso-california-nebula",
"dso-rosette-nebula",
"dso-m8",
"dso-m20",
"dso-m16",
"dso-m17",
"dso-cats-paw-nebula",
"dso-carina-nebula",
"dso-north-america-nebula",
"dso-tarantula-nebula"
],
"heroes": [
"dso-california-nebula",
"dso-carina-nebula",
"dso-cats-paw-nebula",
"dso-m16",
"dso-m17",
"dso-m20",
"dso-m8",
"dso-north-america-nebula",
"dso-m42",
"dso-rosette-nebula"
]
}
},
{
"id": "PLANETARY_NEBULA",
"title": "Planetary nebulae",
"honesty": "measured",
"members": {
"dso": [
"dso-m27",
"dso-m57",
"dso-m76",
"dso-m97",
"dso-helix-nebula",
"dso-cats-eye-nebula",
"dso-eskimo-nebula",
"dso-saturn-nebula",
"dso-butterfly-nebula",
"dso-ghost-of-jupiter",
"dso-blue-snowball",
"dso-skull-nebula",
"dso-blinking-planetary",
"dso-southern-ring-nebula",
"dso-ngc-7027"
],
"photographs": [
"dso-helix-nebula",
"dso-m27",
"dso-m57",
"dso-southern-ring-nebula"
],
"heroes": [
"dso-helix-nebula",
"dso-m27",
"dso-m57",
"dso-southern-ring-nebula"
]
}
},
{
"id": "DARK_NEBULA",
"title": "Dark nebulae",
"honesty": "measured",
"members": {
"dso": [
"dso-coalsack",
"dso-horsehead-nebula"
],
"photographs": [
"dso-horsehead-nebula"
],
"heroes": [
"dso-coalsack",
"dso-horsehead-nebula"
]
}
},
{
"id": "REFLECTION_NEBULA",
"title": "Reflection nebulae",
"honesty": "illustrative",
"members": {
"dso": [
"dso-m78",
"dso-iris-nebula"
],
"photographs": [
"dso-m45"
],
"heroes": [
"dso-iris-nebula",
"dso-m45",
"dso-m78"
]
}
},
{
"id": "SUPERNOVA_REMNANT",
"title": "Supernova remnants",
"honesty": "measured",
"members": {
"dso": [
"dso-m1",
"dso-veil-nebula"
],
"photographs": [
"dso-m1",
"dso-veil-nebula"
],
"heroes": [
"dso-m1",
"dso-veil-nebula"
]
}
},
{
"id": "GALAXY_SPIRAL",
"title": "Spiral galaxies, the Milky Way among them",
"honesty": "illustrative",
"members": {
"dso": [
"dso-m31",
"dso-m33",
"dso-m51",
"dso-m58",
"dso-m61",
"dso-m63",
"dso-m64",
"dso-m65",
"dso-m66",
"dso-m74",
"dso-m77",
"dso-m81",
"dso-m82",
"dso-m83",
"dso-m88",
"dso-m90",
"dso-m91",
"dso-m94",
"dso-m95",
"dso-m96",
"dso-m98",
"dso-m99",
"dso-m100",
"dso-m101",
"dso-m104",
"dso-m106",
"dso-m108",
"dso-m109",
"dso-ngc-253",
"dso-ngc-891",
"dso-ngc-7331",
"dso-needle-galaxy",
"dso-whale-galaxy",
"dso-ngc-2403",
"dso-fireworks-galaxy",
"dso-ngc-300",
"dso-ngc-1300",
"dso-hamburger-galaxy"
],
"photographs": [
"dso-m31",
"dso-m33",
"dso-m83",
"dso-m104",
"dso-m51",
"dso-m101",
"dso-m81",
"dso-ngc-1300"
],
"heroes": [
"dso-m101",
"dso-m104",
"dso-m31",
"dso-m33",
"dso-m51",
"dso-m81",
"dso-m83",
"dso-ngc-1300"
],
"model_kinds": [
"galaxy-model"
],
"layers": [
"galaxy"
]
}
},
{
"id": "GALAXY_IRREGULAR",
"title": "Irregular galaxies",
"honesty": "illustrative",
"members": {
"dso": [
"dso-lmc",
"dso-smc",
"dso-ngc-6822",
"dso-ic-10",
"dso-ic-1613",
"dso-wlm",
"dso-sextans-a",
"dso-sextans-b",
"dso-leo-a",
"dso-pegasus-dwarf",
"dso-phoenix-dwarf",
"dso-aquarius-dwarf",
"dso-sagdig",
"dso-ngc-3109",
"dso-ngc-55"
],
"photographs": [
"dso-lmc",
"dso-smc"
],
"heroes": [
"dso-lmc",
"dso-smc"
]
}
},
{
"id": "GALAXY_ELLIPTICAL",
"title": "Elliptical and lenticular galaxies",
"honesty": "illustrative",
"members": {
"dso": [
"dso-m32",
"dso-m49",
"dso-m59",
"dso-m60",
"dso-m84",
"dso-m85",
"dso-m86",
"dso-m87",
"dso-m89",
"dso-m102",
"dso-m105",
"dso-m110",
"dso-fornax-dwarf",
"dso-sculptor-dwarf",
"dso-carina-dwarf",
"dso-draco-dwarf",
"dso-ursa-minor-dwarf",
"dso-sextans-dwarf",
"dso-leo-i",
"dso-leo-ii",
"dso-sagittarius-dwarf",
"dso-ngc-147",
"dso-ngc-185",
"dso-tucana-dwarf",
"dso-cetus-dwarf",
"dso-antlia-dwarf",
"dso-andromeda-ii",
"dso-andromeda-i",
"dso-andromeda-iii",
"dso-ursa-major-ii",
"dso-segue-1",
"dso-leo-t",
"dso-bootes-i",
"dso-canes-venatici-i",
"dso-ursa-major-i",
"dso-reticulum-ii",
"dso-leo-iv",
"dso-willman-1",
"dso-pisces-ii",
"dso-centaurus-a"
],
"photographs": [
"dso-centaurus-a"
],
"heroes": [
"dso-centaurus-a"
]
}
},
{
"id": "GALAXY_INTERACTION",
"title": "Interacting galaxies",
"honesty": "illustrative",
"members": {
"dso": [
"dso-antennae-galaxies"
],
"heroes": [
"dso-antennae-galaxies"
]
}
},
{
"id": "AGN_QUASAR",
"title": "Quasars and active nuclei",
"honesty": "illustrative",
"members": {
"exotics": [
"exotic-ton-618",
"exotic-3c-273",
"exotic-3c-279"
]
}
},
{
"id": "GALAXY_GROUP",
"title": "Galaxy groups and the local volume",
"honesty": "measured",
"members": {
"catalogues": [
"localvolume"
]
}
},
{
"id": "GALAXY_CLUSTER",
"title": "Galaxy clusters",
"honesty": "modelled",
"members": {}
},
{
"id": "COSMIC_WEB",
"title": "The cosmic web",
"honesty": "illustrative",
"members": {}
},
{
"id": "CMB_AND_HORIZON",
"title": "The microwave background and the horizon",
"honesty": "measured",
"members": {
"catalogues": [
"cmb",
"edge"
]
}
},
{
"id": "SPECTRAL_SKY",
"title": "The sky in other light",
"honesty": "measured",
"members": {
"other_light": [
"infrared",
"microwave",
"gamma"
]
}
},
{
"id": "EARTH_LIVE",
"title": "The Earth's live data",
"honesty": "measured",
"house": true,
"members": {
"weather": [
"earth-lightning",
"earth-events"
],
"layers": [
"storms",
"aurora",
"lightning",
"earth-events"
]
}
},
{
"id": "GROUND_SITE",
"title": "Ground stations on the Earth",
"honesty": "measured",
"house": true,
"members": {
"sites": [
"dss-14",
"dss-25",
"dss-43",
"dss-63"
],
"model_kinds": [
"dish-generic",
"dome-generic"
]
}
},
{
"id": "ODDITY",
"title": "Oddities",
"honesty": "modelled",
"house": true,
"members": {
"model_kinds": [
"oddity-generic"
],
"oddities": [
"tesla-roadster",
"shepard-golf-balls",
"duke-family-photo",
"beresheet-lunar-library",
"voyager-golden-record",
"juno-lego-figures",
"rotj-lightsaber",
"bean-astronaut-pin"
],
"layers": [
"oddities"
]
}
},
{
"id": "MIXED_LAYER",
"title": "Layers that draw several classes",
"honesty": "measured",
"house": true,
"members": {
"layers": [
"worlds",
"deep-sky",
"exotics",
"far-bodies",
"hand-kept-sites"
]
}
}
];
