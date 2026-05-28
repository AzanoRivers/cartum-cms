import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkSetupComplete } from '@/db/adapters/check-setup'

export async function GET(req: NextRequest) {
  // Only callable from middleware (internal header check)
  if (req.headers.get('x-internal') !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const state    = await checkSetupComplete()
    const complete = state === 'complete'
    return NextResponse.json({ complete, state })
  } catch {
    return NextResponse.json({ complete: false, state: 'no_superadmin' })
  }
}
