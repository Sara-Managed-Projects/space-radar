// GENERATED from registry/overlays.yaml by scripts/gen_overlays_js.py. Do not edit.
//
// `python3 scripts/gen_overlays_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.
//
// OFF THE FIRST VISIT: scene/earthoverlay.js and ui/overlaypanel.js import this, and both arrive
// by a dynamic import (main.js when an overlay is asked for, ui/rail.js with What to show).

/** Where the pictures are asked for, how big, and under how many bytes one counts as empty. */
export const OVERLAY_SERVICE = {
  "wms": "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi",
  "width": 2048,
  "height": 1024,
  "blank_bytes": 12000
};

/** Every map that can be laid over the Earth: the GIBS layer, which day's picture, the legend, the credit. */
export const OVERLAYS = [
  {
    "id": "sea-temperature",
    "world": "earth",
    "title": "Sea surface temperature",
    "what": "The temperature of the sea's top layer, from satellites and buoys, gaps filled.",
    "layer": "GHRSST_L4_MUR25_Sea_Surface_Temperature",
    "date": {
      "rule": "daily",
      "lag_days": 2,
      "tries": 3
    },
    "class": "analysed",
    "legend": {
      "unit": "°C",
      "low": "0",
      "high": "32",
      "stops": [
        "#2b001a",
        "#67086e",
        "#1f357f",
        "#2e9fec",
        "#d0ef00",
        "#f25f00",
        "#6b0200"
      ]
    },
    "credit": "GHRSST MUR sea surface temperature, NASA JPL PO.DAAC"
  },
  {
    "id": "sea-ice",
    "world": "earth",
    "title": "Sea ice",
    "what": "How much of the sea is covered by ice, from satellites, gaps filled.",
    "layer": "GHRSST_L4_MUR25_Sea_Ice_Concentration",
    "date": {
      "rule": "daily",
      "lag_days": 2,
      "tries": 3
    },
    "class": "analysed",
    "legend": {
      "unit": "% ice",
      "low": "15",
      "high": "100",
      "stops": [
        "#f800f8",
        "#0021ff",
        "#00de9c",
        "#87d700",
        "#ff4e00",
        "#ffffff"
      ]
    },
    "credit": "GHRSST MUR sea ice concentration, NASA JPL PO.DAAC"
  },
  {
    "id": "chlorophyll",
    "world": "earth",
    "title": "Plankton (chlorophyll)",
    "what": "Chlorophyll in the sea's surface water, the green of plankton, where the sky was clear.",
    "layer": "OCI_PACE_Chlorophyll_a",
    "date": {
      "rule": "daily",
      "lag_days": 2,
      "tries": 3
    },
    "class": "measured",
    "legend": {
      "unit": "mg/m³",
      "low": "0.01",
      "high": "20",
      "stops": [
        "#93006c",
        "#1800e7",
        "#00baff",
        "#00ff17",
        "#ffdb00",
        "#ff3300",
        "#690000"
      ]
    },
    "credit": "Chlorophyll a from the Ocean Color Instrument on PACE, NASA Ocean Biology Processing Group"
  },
  {
    "id": "vegetation",
    "world": "earth",
    "title": "Green land (vegetation)",
    "what": "How green the land is: a vegetation index from eight days of satellite passes.",
    "layer": "MODIS_Terra_NDVI_8Day",
    "date": {
      "rule": "daily",
      "lag_days": 2,
      "tries": 3
    },
    "class": "measured",
    "legend": {
      "unit": "index",
      "low": "0",
      "high": "1",
      "stops": [
        "#f1ecec",
        "#d7c4b3",
        "#b09279",
        "#a0c031",
        "#4e9400",
        "#126e01",
        "#001801"
      ]
    },
    "credit": "MODIS vegetation index (Terra), NASA LANCE and LP DAAC"
  },
  {
    "id": "rain",
    "world": "earth",
    "title": "Rain and snow",
    "what": "Rain falling over one day, estimated from a fleet of satellites; snow is in blues.",
    "layer": "IMERG_Precipitation_Rate",
    "date": {
      "rule": "daily",
      "lag_days": 2,
      "tries": 3
    },
    "class": "measured",
    "legend": {
      "unit": "mm/h",
      "low": "0.1",
      "high": "53",
      "stops": [
        "#00764e",
        "#85d400",
        "#ff8814",
        "#ff2020",
        "#390000"
      ]
    },
    "credit": "IMERG precipitation, NASA Global Precipitation Measurement mission"
  },
  {
    "id": "aerosol",
    "world": "earth",
    "title": "Dust, smoke and haze",
    "what": "How much the air dims sunlight with dust, smoke, sea salt and pollution: a month's mean.",
    "layer": "MERRA2_Total_Aerosol_Optical_Thickness_550nm_Extinction_Monthly",
    "date": {
      "rule": "monthly",
      "lag_months": 4,
      "tries": 3
    },
    "class": "modelled",
    "legend": {
      "unit": "optical thickness",
      "low": "0",
      "high": "0.9",
      "stops": [
        "#ffffe5",
        "#fedc82",
        "#feb441",
        "#f98d23",
        "#e66910",
        "#c74902",
        "#662506"
      ]
    },
    "credit": "MERRA-2 aerosol optical thickness, NASA Global Modeling and Assimilation Office"
  },
  {
    "id": "water-vapour",
    "world": "earth",
    "title": "Water in the air",
    "what": "Water vapour in the whole depth of the air above each place: a month's mean.",
    "layer": "MERRA2_Total_Precipitable_Water_Vapor_Monthly",
    "date": {
      "rule": "monthly",
      "lag_months": 4,
      "tries": 3
    },
    "class": "modelled",
    "legend": {
      "unit": "kg/m²",
      "low": "0",
      "high": "70",
      "stops": [
        "#ffffe5",
        "#dbf1a4",
        "#aedd8e",
        "#78c679",
        "#43ac5e",
        "#238443",
        "#004529"
      ]
    },
    "credit": "MERRA-2 total precipitable water vapour, NASA Global Modeling and Assimilation Office"
  }
];
