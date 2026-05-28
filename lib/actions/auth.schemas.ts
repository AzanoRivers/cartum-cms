import { z } from 'zod'

const VALID_THEMES = ['dark', 'cyber-soft', 'light', 'dusk', 'matrix', 'cyber-human', 'stranger-things'] as const

export const RegisterPlayerSchema = z.object({
  email:           z.string().email('Invalid email address'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  projectName:     z.string().min(1, 'Project name is required').max(120),
  description:     z.string().max(500).optional().default(''),
  theme:           z.enum(VALID_THEMES).optional().default('dusk'),
  locale:          z.enum(['en', 'es']).optional().default('en'),
})
