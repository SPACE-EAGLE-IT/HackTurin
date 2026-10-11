import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { aqiBand, pm25Band, WEATHER } from '@/lib/civic/metrics'
import { ENVIRONMENT_SOURCES, type CityConditions, type Station } from '@/lib/public/environment'

const avg = (stations: Station[], key: string) => {
  const v = stations.map(s => s.values[key]).filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/** "Aria e clima ora": city conditions plus the average of ground sensors and PODs. */
export function EnvironmentCard({ city, stations }: { city: CityConditions; stations: Station[] }) {
  const band = aqiBand(city?.european_aqi)
  const pods = stations.filter(s => s.source === 'pod')
  const ground = avg(stations, 'pm25_ugm3')
  const co2 = avg(pods, 'co2_ppm')
  const noise = avg(pods, 'noise_db')
  const tiles = [
    {
      k: 'PM2.5 sensori a terra',
      v: ground != null ? `${ground.toFixed(1)} µg/m³` : '—',
      tone: pm25Band(ground).tone,
    },
    {
      k: 'CO₂ media POD',
      v: co2 != null ? `${Math.round(co2)} ppm` : '—',
      tone: co2 != null && co2 > 800 ? 'warning' : 'success',
    },
    {
      k: 'Rumore medio POD',
      v: noise != null ? `${Math.round(noise)} dB` : '—',
      tone: noise != null && noise > 65 ? 'warning' : 'success',
    },
    { k: 'NO₂ città', v: city?.no2_ugm3 != null ? `${Math.round(city.no2_ugm3)} µg/m³` : '—', tone: 'muted' },
  ] as const

  return (
    <SectionCard
      title='Aria e clima ora'
      info={`Fonti: ${ENVIRONMENT_SOURCES.map(s => s.name).join(', ')}. I dati della città sono un modello, quelli a terra sono misure.`}
    >
      <div className='flex flex-wrap items-center gap-6'>
        <div>
          <p className='text-3xl font-semibold tabular-nums'>
            {city?.temperature_c != null ? `${Math.round(city.temperature_c)}°` : '—'}
          </p>
          <p className='text-muted-foreground text-sm'>{WEATHER[city?.weather_code ?? -1] ?? ''}</p>
        </div>
        <div className='space-y-1 text-sm'>
          <StatusBadge tone={band.tone === 'muted' ? 'muted' : band.tone} dot>
            Aria {band.label.toLowerCase()}
          </StatusBadge>
          <p className='text-muted-foreground'>
            Umidità {city?.humidity_pct ?? '—'}% · Vento{' '}
            {city?.wind_kmh != null ? Math.round(city.wind_kmh) : '—'} km/h
          </p>
          <p className='text-muted-foreground'>
            {stations.length} stazioni a terra, di cui {pods.length} POD
          </p>
        </div>
        <dl className='grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4'>
          {tiles.map(t => (
            <div key={t.k} className='space-y-1'>
              <dt className='text-muted-foreground text-xs'>{t.k}</dt>
              <dd className='flex items-center gap-1.5 text-sm font-medium tabular-nums'>
                <StatusBadge tone={t.tone} dot variant='piatta'>
                  {t.v}
                </StatusBadge>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionCard>
  )
}
