// GENERATED from registry/sideviews.yaml by scripts/gen_sideviews_js.py. Do not edit.
//
// `python3 scripts/gen_sideviews_js.py --check` fails CI if this file and the YAML disagree, or if the YAML
// breaks its rules (an asterism's corners are corners of its constellation's own lines). Fetched with
// ui/figureside.js or ui/searchrows.js, never at boot.

/** The figures the side view offers by name: an IAU figure, or an asterism drawn through its constellation's own corners. */
export const SIDE_FIGURES = [
{
"id": "orion",
"figure": "Ori"
},
{
"id": "big-dipper",
"of": "UMa",
"name": "bigDipper",
"note": "bigDipper",
"stars": [
"Megrez",
"Dubhe",
"Merak",
"Phecda",
"Megrez",
"Alioth",
"Mizar",
"Alkaid"
],
"path": [
[
-176.1435,
57.0326
],
[
165.932,
61.751
],
[
165.4603,
56.3824
],
[
178.4577,
53.6948
],
[
-176.1435,
57.0326
],
[
-166.4927,
55.9598
],
[
-159.0186,
54.9254
],
[
-153.1148,
49.3133
]
]
},
{
"id": "cassiopeia",
"figure": "Cas"
},
{
"id": "southern-cross",
"figure": "Cru"
},
{
"id": "scorpius",
"figure": "Sco"
},
{
"id": "leo",
"figure": "Leo"
}
];
