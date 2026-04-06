import type { CreateFieldInput } from '@/types/nodes'

type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

export function validateFieldMeta(input: CreateFieldInput): ValidationResult {
  if (!input.parentId) {
    return { valid: false, error: 'FIELD_REQUIRES_PARENT' }
  }
  if (input.fieldType === 'relation' && !input.relationTargetId) {
    return { valid: false, error: 'RELATION_REQUIRES_TARGET' }
  }
  return { valid: true }
}
