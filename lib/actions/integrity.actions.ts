'use server'

import { integrityService } from '@/lib/services/integrity.service'
import { requireProjectId, assertProjectAccess } from '@/lib/auth/get-project-id'
import { z } from 'zod'
import type { ActionResult } from '@/types/actions'
import type { DeletionRisk } from '@/types/integrity'

const CheckNodeSchema = z.object({ id: z.string().uuid() })

export async function checkNodeDeletionRisk(
  input: unknown,
): Promise<ActionResult<DeletionRisk>> {
  try {
    const projectId = await requireProjectId()
    await assertProjectAccess(projectId)
    const parsed = CheckNodeSchema.safeParse(input)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error.' }
    const risk = await integrityService.checkNodeDeletion(parsed.data.id, projectId)
    return { success: true, data: risk }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error.' }
  }
}
