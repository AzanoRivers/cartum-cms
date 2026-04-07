'use server'

import { auth } from '@/auth'
import { integrityService } from '@/lib/services/integrity.service'
import { z } from 'zod'
import type { ActionResult } from '@/types/actions'
import type { DeletionRisk } from '@/types/integrity'

const CheckNodeSchema = z.object({ id: z.string().uuid() })

async function requireSession(): Promise<void> {
  const session = await auth()
  if (!session) throw new Error('UNAUTHORIZED')
}

/**
 * Pre-delete integrity check for a node.
 *
 * Call this before showing a delete confirmation.
 * If `risk.level === 'safe'`, you can delete immediately.
 * Otherwise present `risk.factors` to the user and ask for confirmation.
 */
export async function checkNodeDeletionRisk(
  input: unknown,
): Promise<ActionResult<DeletionRisk>> {
  try {
    await requireSession()
    const parsed = CheckNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Validation error.' }
    const risk = await integrityService.checkNodeDeletion(parsed.data.id)
    return { success: true, data: risk }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
