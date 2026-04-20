// DELETE THIS ROUTE BEFORE PRODUCTION

import { NextRequest, NextResponse } from 'next/server';

import { isInsideBengaluru } from '@/lib/geofence';
import { checkJurisdiction, detectPrivateProperty } from '@/lib/jurisdictionCheck';
import type { LocationDetails } from '@/lib/types';
import { resolveWard } from '@/lib/wards';

async function getLocationDetails(lat: number, lng: number): Promise<LocationDetails> {
  const fallback: LocationDetails = {
    locality: 'Bengaluru',
    road: null,
    pincode: null,
    city: 'Bengaluru',
    formatted: 'Bengaluru',
  };

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return fallback;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&result_type=sublocality|neighborhood&language=en`;
    const res = await fetch(url);
    const data = await res.json() as {
      status: string;
      results?: { address_components: { types: string[]; long_name: string }[] }[];
    };

    if (data.status !== 'OK' || !data.results?.length) return fallback;

    const components = data.results[0].address_components;

    const sublocalityComp = components.find((c) =>
      c.types.includes('sublocality_level_1') || c.types.includes('sublocality'),
    )?.long_name;

    const neighborhoodComp = components.find((c) =>
      c.types.includes('neighborhood'),
    )?.long_name;

    const cityComp = components.find((c) =>
      c.types.includes('locality'),
    )?.long_name;

    const road = components.find((c) =>
      c.types.includes('route'),
    )?.long_name ?? null;

    const pincode = components.find((c) =>
      c.types.includes('postal_code'),
    )?.long_name ?? null;

    const locality = sublocalityComp ?? neighborhoodComp ?? cityComp ?? 'Bengaluru';
    const city = cityComp ?? 'Bengaluru';

    return {
      locality,
      road,
      pincode,
      city,
      formatted: `${locality}, Bengaluru`,
    };
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  if (!latParam || !lngParam) {
    return NextResponse.json(
      { error: 'Missing required query params: lat, lng' },
      { status: 400 },
    );
  }

  const lat = parseFloat(latParam);
  const lng = parseFloat(lngParam);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng must be valid numbers' },
      { status: 400 },
    );
  }

  const inside_bengaluru = isInsideBengaluru(lat, lng);
  const [location, privateProperty, jurisdiction] = await Promise.all([
    getLocationDetails(lat, lng),
    detectPrivateProperty(lat, lng),
    Promise.resolve(checkJurisdiction(lat, lng)),
  ]);
  console.log('Places API result:', JSON.stringify(privateProperty));

  const localityName = location.locality;
  const ward = resolveWard(localityName);

  return NextResponse.json({
    lat,
    lng,
    inside_bengaluru,
    location,
    nearest_landmark: privateProperty.nearest_landmark ?? null,
    ward_name: ward.ward_name,
    ward_zone: ward.zone,
    ward_is_fallback: ward.is_fallback,
    jurisdiction,
    private_property: {
      likely_private: privateProperty.likely_private,
      place_name: privateProperty.place_name,
      place_type: privateProperty.place_type,
    },
  });
}
