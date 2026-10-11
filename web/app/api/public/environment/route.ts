import { NextResponse } from 'next/server'

import { environment } from '@/lib/public/environment'

/** Weather, air quality and ground stations for the public map. */
export async function GET() {
  return NextResponse.json(await environment())
}
