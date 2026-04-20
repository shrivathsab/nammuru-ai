export const BENGALURU_BOUNDS = {
  lat: { min: 12.834, max: 13.144 },
  lng: { min: 77.461, max: 77.784 },
} as const;

export const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 } as const;

export function isInsideBengaluru(lat: number, lng: number): boolean {
  return (
    lat >= BENGALURU_BOUNDS.lat.min &&
    lat <= BENGALURU_BOUNDS.lat.max &&
    lng >= BENGALURU_BOUNDS.lng.min &&
    lng <= BENGALURU_BOUNDS.lng.max
  );
}
