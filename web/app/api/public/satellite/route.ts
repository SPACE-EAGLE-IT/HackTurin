import { NextResponse } from 'next/server'

import { satelliteZones } from '@/lib/satellite/sentinel'

// The COG reads take several seconds on a cold cache: give the function room.
export const maxDuration = 60

/** Sentinel-2 haze (AOT) and green cover (NDVI) per CAP, cached 12 h per scene. */
export async function GET() {
  return NextResponse.json(await satelliteZones())
}
