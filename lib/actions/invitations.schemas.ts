import { z } from 'zod'

export const InviteSchema = z.object({
  email:     z.string().email('Invalid email address'),
  roleId:    z.string().uuid('Invalid role'),
  projectId: z.string().uuid('Invalid project'),
})

export const AcceptInviteSchema = z.object({
  token: z.string().min(1),
})

export const RegisterAndAcceptSchema = z.object({
  token:    z.string().min(1),
  name:     z.string().min(1, 'Name is required').max(80),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
