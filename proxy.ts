import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_RESTRICTED } from '@/types/roles'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isSetupRoute = pathname.startsWith('/setup')
  const isApiRoute   = pathname.startsWith('/api')
  const isLoginRoute = pathname.startsWith('/login') || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')
  const isCMSRoute   = pathname.startsWith('/cms')

  // Never intercept API routes
  if (isApiRoute) return NextResponse.next()

  // Dynamically check setup state via an internal API call to avoid
  // importing DB drivers in the Edge runtime
  const checkUrl = new URL('/api/internal/setup-status', req.url)
  let setupComplete = false

  try {
    const res = await fetch(checkUrl, { headers: { 'x-internal': '1' } })
    if (res.ok) {
      const json = (await res.json()) as { complete: boolean }
      setupComplete = json.complete
    }
  } catch {
    setupComplete = false
  }

  if (!setupComplete && !isSetupRoute) {
    return NextResponse.redirect(new URL('/setup', req.url))
  }

  if (setupComplete && isSetupRoute) {
    return NextResponse.redirect(new URL('/cms/board', req.url))
  }

  // Root redirect — send to dashboard or login depending on session
  if (setupComplete && pathname === '/') {
    const session = await auth()
    return NextResponse.redirect(
      new URL(session ? '/cms/board' : '/login', req.url)
    )
  }

  // Session guard — only after setup is complete
  if (setupComplete && isCMSRoute) {
    const session = await auth()
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // Safety net: block sessions where the user only has the 'restricted' role
    // (primary block is in auth.ts authorize(); this catches role changes after login)
    const user = session.user
    const roles = user.roles ?? []
    if (
      !user.isSuperAdmin &&
      roles.length > 0 &&
      roles.every((r) => r === ROLE_RESTRICTED)
    ) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'disabled')
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from login
  if (setupComplete && isLoginRoute) {
    const session = await auth()
    if (session) {
      return NextResponse.redirect(new URL('/cms/board', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|images/).*)',
  ],
}
