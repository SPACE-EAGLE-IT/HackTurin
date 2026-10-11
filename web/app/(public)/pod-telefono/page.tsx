import { PhonePod } from '@/components/pod-telefono/phone-pod'

export const metadata = { title: 'POD telefono' }

/** A phone becomes a POD: paired by QR from the POD console, it reports through the POD API. */
export default function PodTelefonoPage() {
  return (
    <div className='mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6'>
      <PhonePod />
    </div>
  )
}
