// GENERATED from registry/budgets.yaml by scripts/gen_budgets_js.py. Do not edit.
//
// `python3 scripts/gen_budgets_js.py --check` fails CI if this file and the YAML disagree, so an
// edit here is an edit that will be reverted. Change the YAML.

/** Every gate CI reads, by id (spec 0044). A raised value needs a dated reason in the YAML. */
export const BUDGETS = {
  "first_visit_bytes": 5900000,
  "audio_at_boot_bytes": 0,
  "og_at_boot_bytes": 0,
  "fonts_at_boot_bytes": 90000,
  "draw_calls_per_stop": 120,
  "triangles_per_stop": 250000,
  "bed_kb": 600,
  "audio_total_kb": 3000,
  "narration_trip_kb": 1200,
  "narration_total_kb": 26000,
  "trip_picture_bytes": 24000,
  "nebula_picture_bytes": 90000,
  "nebulae_total_bytes": 1700000,
  "moon_map_bytes": 250000,
  "moon_maps_total_bytes": 3200000,
  "og_png_min_bytes": 50000,
  "home_js_kb": 8,
  "tier1_idle_bytes": 1300000,
  "tier1_texture_gpu_mib": 250,
  "planet_tile_requests_first_visit": 0,
  "reel_heap_growth_pct": 20
};
