import { NextRequest, NextResponse } from 'next/server'
import { isInsideBengaluru } from '@/lib/geofence'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      typeof (body as Record<string, unknown>).query !== 'string' ||
      !(body as Record<string, unknown>).query
    ) {
      return NextResponse.json({ found: false }, { status: 400 })
    }

    const { query } = body as { query: string }
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ found: false }, { status: 500 })
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
    url.searchParams.set('address', query)
    url.searchParams.set('components', 'administrative_area:Karnataka|country:IN')
    url.searchParams.set('language', 'en')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())

    type GeoResult = {
      status: string
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>
    }

    const data = await res.json() as GeoResult

    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json({ found: false })
    }

    const { lat, lng } = data.results[0].geometry.location

    if (!isInsideBengaluru(lat, lng)) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, lat, lng })
  } catch {
    return NextResponse.json({ found: false }, { status: 500 })
  }
}
