import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { supabaseEnv } from '@/lib/supabase/env'

/** Routes reachable without a session: the citizen site, the POD API and the payment endpoints. */
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/manifest.webmanifest',
  '/segnala',
  '/statistiche',
  '/dona',
  '/aziende',
  '/volontari',
  '/api/v1',
  '/api/public',
  '/api/stripe',
]

/**
 * Refreshes the auth session cookie on every request and gates private routes.
 *
 * The proxy is the only place in the App Router that can rewrite the session cookie, so without
 * it the token would silently expire. Two rules from @supabase/ssr are followed on purpose:
 * nothing runs between `createServerClient` and `getUser()`, and the response returned is the
 * one carrying the refreshed cookies (they are copied over on redirects).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const { url, key } = supabaseEnv()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic =
    pathname === '/' || PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))

  if (!user && !isPublic) {
    if (pathname.startsWith('/api/')) {
      return withCookies(
        NextResponse.json({ error: 'Sessione scaduta: accedi di nuovo' }, { status: 401 }),
        response
      )
    }
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search =
      pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
    return withCookies(NextResponse.redirect(redirectUrl), response)
  }

  if (user && pathname === '/login') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/area'
    redirectUrl.search = ''
    return withCookies(NextResponse.redirect(redirectUrl), response)
  }

  return response
}

function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach(cookie => target.cookies.set(cookie))
  return target
}
