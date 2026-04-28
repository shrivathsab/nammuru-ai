/**
 * Bidirectional aliases between Supabase ward_name values
 * and 2023 OpenCity GeoJSON name_en values.
 *
 * Key: what's stored in Supabase reports.ward_name
 * Value: what the 2023 BBMP GeoJSON calls the same ward
 *
 * Run this in the console to discover mismatches:
 * fetch('/api/map-data').then(r=>r.json()).then(d=>
 *   console.log(d.wardStats.map(w=>w.ward_name)))
 */
export const WARD_ALIASES: Record<string, string> = {
  // Supabase name        → GeoJSON name_en
  'Whitefield':           'Hudi',
  'Whitefield Ward':      'Hudi',
  'HSR Layout':           'HSR Layout',
  'HSR Layout Ward':      'HSR Layout',
  'Koramangala':          'Koramangala',
  'Koramangala Ward':     'Koramangala',
  'Indiranagar':          'Indiranagar',
  'Indiranagar Ward':     'Indiranagar',
  'Jayanagar':            'Jayanagar',
  'Jayanagar Ward':       'Jayanagar',
};

/**
 * Reverse map: GeoJSON name → Supabase name (for MapView lookup)
 */
export const GEOJSON_TO_SUPABASE: Record<string, string[]> = {
  'Hudi':         ['Whitefield', 'Whitefield Ward'],
  'HSR Layout':   ['HSR Layout', 'HSR Layout Ward'],
  'Koramangala':  ['Koramangala', 'Koramangala Ward'],
  'Indiranagar':  ['Indiranagar', 'Indiranagar Ward'],
  'Jayanagar':    ['Jayanagar', 'Jayanagar Ward'],
};

import type { LatLngBoundsExpression } from 'leaflet';

/**
 * BBMP geographic boundary — prevents maps from panning outside Bengaluru.
 * Derived from the 2023 OpenCity ward GeoJSON extent with padding.
 * Format: [[swLat, swLng], [neLat, neLng]]
 */
export const BENGALURU_BOUNDS: LatLngBoundsExpression = [
  [12.65, 77.25],   // SW — Kanakapura / Bidadi direction
  [13.25, 77.98],   // NE — Devanahalli / Hoskote direction
];

/** Minimum zoom level that keeps Bengaluru meaningfully visible */
export const BENGALURU_MIN_ZOOM = 10;
