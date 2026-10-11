import type { Metadata } from 'next'

import { LoginForm } from '@/components/auth/login-form'
import { BrandLockup } from '@/components/civic/brand'
import { Card, CardContent } from '@/components/ui/card'
import { firstParam, type SearchParams } from '@/lib/search-params'

export const metadata: Metadata = { title: 'Accedi' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const next = safeNext(firstParam(params, 'next'))
  const error = firstParam(params, 'error') === 'link' ? 'link' : undefined

  return (
    <main className='grid min-h-dvh place-items-center p-4'>
      <div className='w-full max-w-sm space-y-4'>
        <Card className='w-full'>
          <CardContent className='space-y-6'>
            <div className='flex justify-center'>
              <BrandLockup tagline />
            </div>
            <LoginForm next={next} error={error} />
          </CardContent>
        </Card>
        <p className='text-muted-foreground text-center text-xs'>Il primo account creato è amministratore.</p>
      </div>
    </main>
  )
}

/** Only relative paths are accepted as a destination, to avoid open redirects. */
function safeNext(value: string | undefined) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/area'
}
