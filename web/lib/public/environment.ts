import { createAnonClient } from '@/lib/supabase/anon'

const LAT = 45.0703
const LON = 7.6869

export type Station = {
  id: string
  source: 'sensor.community' | 'pod'
  name: string
  lat: number
  lon: number
  ts: string
  values: Record<string, number>
}

export type CityConditions = {
  temperature_c?: number
  humidity_pct?: number
  wind_kmh?: number
  weather_code?: number
  european_aqi?: number
  pm25_ugm3?: number
  pm10_ugm3?: number
  no2_ugm3?: number
} | null

type ScEntry = {
  timestamp: string
  location: { id: number; latitude: string; longitude: string }
  sensordatavalues: { value_type: string; value: string }[]
}
const SC_MAP: Record<string, string> = {
  P2: 'pm25_ugm3',
  P1: 'pm10_ugm3',
  temperature: 'temperature_c',
  humidity: 'humidity_pct',
}

/** Citizen sensors from Sensor.Community within 12 km of Turin. */
async function sensorCommunity(): Promise<Station[]> {
  try {
    const r = await fetch(`https://data.sensor.community/airrohr/v1/filter/area=${LAT},${LON},12`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })
    const byLoc = new Map<number, Station>()
    for (const e of (await r.json()) as ScEntry[]) {
      const st = byLoc.get(e.location.id) ?? {
        id: `sc-${e.location.id}`,
        source: 'sensor.community' as const,
        name: `Sensore civico #${e.location.id}`,
        lat: Number(e.location.latitude),
        lon: Number(e.location.longitude),
        ts: `${e.timestamp.replace(' ', 'T')}Z`,
        values: {},
      }
      for (const v of e.sensordatavalues) {
        const key = SC_MAP[v.value_type]
        const n = Number(v.value)
        if (key && Number.isFinite(n)) st.values[key] = Math.round(n * 10) / 10
      }
      byLoc.set(e.location.id, st)
    }
    return [...byLoc.values()].filter(s => Object.keys(s.values).length)
  } catch {
    return []
  }
}

/** City weather and air quality (Open-Meteo, Copernicus CAMS model). */
async function openMeteo(): Promise<CityConditions> {
  try {
    const opts = { next: { revalidate: 600 }, signal: AbortSignal.timeout(8000) }
    const [w, a] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=Europe%2FRome`,
        opts
      ).then(r => r.json()),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=european_aqi,pm10,pm2_5,nitrogen_dioxide&timezone=Europe%2FRome`,
        opts
      ).then(r => r.json()),
    ])
    return {
      temperature_c: w.current?.temperature_2m,
      humidity_pct: w.current?.relative_humidity_2m,
      wind_kmh: w.current?.wind_speed_10m,
      weather_code: w.current?.weather_code,
      european_aqi: a.current?.european_aqi,
      pm25_ugm3: a.current?.pm2_5,
      pm10_ugm3: a.current?.pm10,
      no2_ugm3: a.current?.nitrogen_dioxide,
    }
  } catch {
    return null
  }
}

async function podStations(): Promise<Station[]> {
  const { data } = await createAnonClient().rpc('public_pod_readings')
  return (data ?? []).map(r => ({
    id: `pod-${r.device_id}`,
    source: 'pod' as const,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    ts: r.ts,
    values: r.metrics as Record<string, number>,
  }))
}

export const ENVIRONMENT_SOURCES = [
  { name: 'Open-Meteo / Copernicus CAMS', url: 'https://open-meteo.com' },
  { name: 'Sensor.Community', url: 'https://sensor.community' },
  { name: 'POD To.Be', url: '' },
]

/** City conditions plus every ground station: open citizen sensors and our PODs. */
export async function environment() {
  const [city, sc, pods] = await Promise.all([openMeteo(), sensorCommunity(), podStations()])
  return { city, stations: [...pods, ...sc] }
}
