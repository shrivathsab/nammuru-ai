import { NextResponse } from 'next/server';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required and must be a non-empty string`);
  }
  return value.trim();
}

export function requireNumber(value: unknown, field: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) throw new ValidationError(`${field} must be a number`);
  return n;
}

export function requireLatLng(
  lat: unknown,
  lng: unknown,
): { lat: number; lng: number } {
  const latitude = requireNumber(lat, 'lat');
  const longitude = requireNumber(lng, 'lng');
  if (latitude < -90 || latitude > 90) throw new ValidationError('lat must be -90 to 90');
  if (longitude < -180 || longitude > 180) throw new ValidationError('lng must be -180 to 180');
  return { lat: latitude, lng: longitude };
}

/**
 * Map a ValidationError to a 400 JSON response. Returns null for non-validation
 * errors so the caller can fall through to a 500 (per the documented pattern):
 *   return handleValidationError(err) ?? NextResponse.json({ error: 'Internal error' }, { status: 500 });
 */
export function handleValidationError(err: unknown): NextResponse | null {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return null;
}
