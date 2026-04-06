import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkSetupComplete } from '@/db/adapters/check-setup'

export async function GET(req: NextRequest) {
  // Only callable from middleware (internal header check)
  if (req.headers.get('x-internal') !== '1') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const complete = await checkSetupComplete()
    return NextResponse.json({ complete })
  } catch {
    return NextResponse.json({ complete: false })
  }
}
