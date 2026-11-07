// GENERATED from registry/geo-buses.yaml by scripts/gen_geo_buses_js.py. Do not edit.
//
// `python3 scripts/gen_geo_buses_js.py --check` fails CI if this file and the YAML disagree, so an edit here is an edit that will be
// reverted. A satellite is in this table only when a source names its bus (the YAML cites each one); every other geostationary satellite
// keeps the SSL-1300 stand-in in scene/realmodels.js, and its card says the shape is a stand-in.

/** Catalogue numbers by bus, one key a drawn bus and `bus:source` for a held one (registry/geo-buses.yaml). */
export const GEO_BUS_NORADS = {
"a2100:gcat": [
25924,
32767,
37207,
37776,
38332,
44034,
44186,
45245
],
"a2100ax": [
26554,
26580,
27632,
28446,
29045,
29055,
29272,
31306,
32299,
35755,
38331
],
"alphabus:gcat": [
39215
],
"amos:gcat": [
32794,
39237,
64784
],
"boeing-601:gcat": [
22787,
23467,
25967,
27718,
27954,
28117,
34941
],
"boeing-702": [
27445,
28378,
32729,
36131,
38098,
38749,
39476,
40384,
40882,
41380,
42698,
42740,
42818,
42950,
43633,
44479,
44868,
65588
],
"boeing-702:gcat": [
37218,
40946
],
"boeing-702sp": [
40424,
40425,
41588,
41589,
42709,
53960,
53961
],
"dfh-3:gcat": [
41034,
41869,
42662,
49011,
55239
],
"dfh-4:gcat": [
37677,
38014,
38352,
39481,
40982,
41194,
41238,
41725,
43039,
43450,
44067,
45863,
46916,
47321,
53100,
59915,
63361,
63662,
64470
],
"dfh-4:gunter": [
53813
],
"dfh-5:gcat": [
44910
],
"ds2000:gcat": [
33274,
37606,
39522,
40984,
43271,
43700,
47202,
61733
],
"ekspress-1000:gcat": [
37951,
38977,
38978,
39612,
39613,
39728,
40895,
45985,
45986,
50001,
50002,
54033
],
"ekspress-2000:gcat": [
39487,
40277,
40345
],
"ekspress-2000:gunter": [
42907,
43432,
43867,
44457
],
"ekspress-other:gcat": [
37749
],
"eurostar-e3000": [
28358,
28868,
29270,
30794,
31102,
32294,
33055,
33373,
33436,
33459,
35942,
36581,
36592,
36745,
37258,
37393,
37775,
37810,
37816,
38245,
38778,
39020,
39034,
39172,
39285,
39617,
39773,
40147,
40364,
40505,
40663,
41029,
41036,
41191,
41310,
41945,
42432,
42741,
42967,
43175,
44333,
44800,
45920,
47306,
50212,
52904,
57214
],
"eurostar-e3000:gcat": [
50319
],
"eurostar-neo:gcat": [
54048,
54225,
56757,
59346,
62483,
62852
],
"eurostar-other:gcat": [
26107,
27811,
29526
],
"geostar-1:gcat": [
41744,
51280,
51281,
52940
],
"geostar-2:gcat": [
29495,
32253,
32388,
32487,
33749,
35362,
35756,
36106,
36397,
36516,
37265,
37392,
37748,
37809,
37834,
38741,
38867,
38991,
39035,
39079,
39460,
39500,
39616,
40664,
44624,
46114
],
"geostar-2:wikipedia": [
41552
],
"geostar-3:gcat": [
43272,
44625,
46113,
55970,
55971
],
"geostar-3:gunter": [
43174
],
"i-1k:gcat": [
47256
],
"i-2k:gcat": [
37237,
39498,
40880,
42695,
43864,
44035
],
"i-2k:gunter": [
39234,
100607
],
"i-3k:gcat": [
37605,
38779,
40332,
41028,
41793,
42747,
42815,
43698,
45026,
52903
],
"i-4k:gcat": [
66311
],
"i-6k:gcat": [
43824
],
"smallgeo:gcat": [
41942,
44475,
57213
],
"spacebus-4000:gcat": [
28526,
28924,
31307,
32768,
33056,
35943,
36033,
36101,
36582,
36830,
36831,
37836,
38107,
38992,
39017,
39022,
39163,
39509,
40617,
40875,
41944,
42691,
42692,
42814,
42984,
43463,
44801,
52817,
52933,
58995,
61910
],
"spacebus-4000:wikipedia": [
44307
],
"spacebus-neo:gcat": [
45027,
49332,
49333,
53765,
54259,
55508,
57045,
60086
],
"ssl-1300": [
26900,
27380,
27426,
27438,
27513,
27831,
28184,
28659,
28702,
28786,
28945,
29236,
29494,
32763,
32951,
33207,
33376,
34111,
35493,
35496,
35696,
35873,
36032,
36097,
36499,
36792,
37185,
37238,
37264,
37826,
37843,
37933,
38087,
38342,
38356,
38551,
38652,
38740,
39008,
39078,
39122,
39127,
39233,
39360,
39508,
40107,
40141,
40146,
40271,
40333,
40613,
40733,
40874,
40940,
41382,
41471,
41581,
41591,
41592,
41729,
41747,
41794,
41893,
41903,
41904,
42070,
42749,
42801,
42934,
42942,
42951,
43228,
43562,
43587,
43611,
43632,
44048,
44334,
44476,
46112,
47240,
48838,
49055,
54243,
54244,
54741,
54742,
56174,
57479,
57493,
62259,
64290,
68126,
69728
]
};

/** The name a card prints for each bus. */
export const GEO_BUS_LABELS = {
"ssl-1300": "SSL-1300",
"eurostar-e3000": "Airbus Eurostar E3000",
"spacebus-4000": "Thales Alenia Space Spacebus 3000/4000",
"boeing-702": "Boeing 702",
"boeing-702sp": "Boeing 702SP",
"a2100ax": "Lockheed Martin A2100AX",
"geostar-2": "Northrop Grumman GEOStar-2",
"dfh-4": "CAST DFH-4",
"a2100": "Lockheed Martin A2100",
"ds2000": "Mitsubishi Electric DS2000",
"i-3k": "ISRO I-3K",
"i-2k": "ISRO I-2K",
"ekspress-1000": "ISS Reshetnev Ekspress-1000",
"ekspress-2000": "ISS Reshetnev Ekspress-2000",
"spacebus-neo": "Thales Alenia Space Spacebus NEO",
"eurostar-neo": "Airbus Eurostar Neo",
"boeing-601": "Boeing 601",
"geostar-3": "Northrop Grumman GEOStar-3",
"dfh-3": "CAST DFH-3",
"smallgeo": "OHB SmallGEO (Luxor)",
"amos": "IAI AMOS",
"alphabus": "Alphabus",
"geostar-1": "GEOStar-1",
"eurostar-other": "Airbus Eurostar (an earlier variant)",
"ekspress-other": "ISS Reshetnev (Ekspress)",
"i-1k": "ISRO I-1K",
"i-4k": "ISRO I-4K",
"i-6k": "ISRO I-6K",
"dfh-5": "CAST DFH-5"
};

/** Each drawn family's file, name and `made` (scene/realmodels.js adds the rest of the route). */
export const GEO_BUS_DRAWN = {
"eurostar-e3000": {
"file": "bus-eurostar-e3000.glb",
"name": "an Airbus Eurostar E3000 satellite",
"made": "renders"
},
"boeing-702": {
"file": "bus-boeing-702.glb",
"name": "a Boeing 702HP or 702MP satellite",
"made": "renders"
},
"boeing-702sp": {
"file": "bus-boeing-702sp.glb",
"name": "a Boeing 702SP satellite",
"made": "renders"
},
"a2100ax": {
"file": "bus-a2100ax.glb",
"name": "a Lockheed Martin A2100AX satellite",
"made": "renders"
}
};
