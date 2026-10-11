import { z } from 'zod'

/** Recommended sensor metric names; other snake_case numeric names are accepted too. */
export const METRICS: Record<string, { label: string; unit: string }> = {
  temperature_c: { label: 'Temperatura', unit: '°C' },
  humidity_pct: { label: 'Umidità', unit: '%' },
  co2_ppm: { label: 'CO₂', unit: 'ppm' },
  pm25_ugm3: { label: 'PM2.5', unit: 'µg/m³' },
  pm10_ugm3: { label: 'PM10', unit: 'µg/m³' },
  no2_ugm3: { label: 'NO₂', unit: 'µg/m³' },
  noise_db: { label: 'Rumore', unit: 'dB' },
  pressure_hpa: { label: 'Pressione', unit: 'hPa' },
  voc_index: { label: 'VOC', unit: 'indice' },
}

export const metricLabel = (key: string) => METRICS[key]?.label ?? key
export const metricUnit = (key: string) => METRICS[key]?.unit ?? ''

export const MetricsSchema = z
  .record(z.string().regex(/^[a-z0-9_]{1,32}$/), z.number().finite())
  .refine(m => Object.keys(m).length > 0 && Object.keys(m).length <= 30, 'da 1 a 30 metriche')

export type AirTone = 'success' | 'warning' | 'destructive' | 'muted'

/** European air quality band for PM2.5 (µg/m³). */
export function pm25Band(v: number | null | undefined): { label: string; tone: AirTone } {
  if (v == null) return { label: 'n/d', tone: 'muted' }
  if (v <= 10) return { label: 'Buona', tone: 'success' }
  if (v <= 20) return { label: 'Discreta', tone: 'success' }
  if (v <= 25) return { label: 'Moderata', tone: 'warning' }
  if (v <= 50) return { label: 'Scadente', tone: 'warning' }
  return { label: 'Pessima', tone: 'destructive' }
}

/** European AQI band. */
export function aqiBand(eaqi: number | null | undefined): { label: string; tone: AirTone } {
  if (eaqi == null) return { label: 'n/d', tone: 'muted' }
  if (eaqi <= 40) return { label: eaqi <= 20 ? 'Buona' : 'Discreta', tone: 'success' }
  if (eaqi <= 80) return { label: eaqi <= 60 ? 'Moderata' : 'Scadente', tone: 'warning' }
  return { label: 'Pessima', tone: 'destructive' }
}

export const WEATHER: Record<number, string> = {
  0: 'Sereno',
  1: 'Poco nuvoloso',
  2: 'Parzialmente nuvoloso',
  3: 'Coperto',
  45: 'Nebbia',
  48: 'Nebbia',
  51: 'Pioviggine',
  53: 'Pioviggine',
  55: 'Pioviggine',
  61: 'Pioggia',
  63: 'Pioggia',
  65: 'Pioggia forte',
  71: 'Neve',
  73: 'Neve',
  75: 'Neve forte',
  80: 'Rovesci',
  81: 'Rovesci',
  82: 'Rovesci forti',
  95: 'Temporale',
  96: 'Temporale',
  99: 'Temporale',
}
