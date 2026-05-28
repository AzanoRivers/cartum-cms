import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROLE_RESTRICTED } from '@/types/roles'
import { SWITCH_COOKIE } from '@/lib/auth/constants'

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
  let setupState: string = 'no_superadmin'

  try {
    const res = await fetch(checkUrl, { headers: { 'x-internal': '1' } })
    if (res.ok) {
      const json = (await res.json()) as { complete: boolean; state: string }
      setupComplete = json.complete
      setupState    = json.state ?? 'no_superadmin'
    }
  } catch {
    setupComplete = false
  }

  if (!setupComplete && !isSetupRoute) {
    // Super admin exists but no project yet — skip credentials step
    const target = setupState === 'no_project' ? '/setup/locale' : '/setup'
    return NextResponse.redirect(new URL(target, req.url))
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

  // auth() was called for CMS/login/root routes — the jwt() callback already
  // read the switch cookie and updated currentProjectId in the session JWT.
  // Delete it so the next request relies on the persisted session value.
  const res = NextResponse.next()
  if (req.cookies.has(SWITCH_COOKIE)) {
    res.cookies.delete(SWITCH_COOKIE)
  }
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|sounds/).*)',
  ],
}
