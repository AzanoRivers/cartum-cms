import { auth } from '@/auth'
import { usersRepository } from '@/db/repositories/users.repository'

const TRIAL_SECONDS = 7 * 86_400

type SubscriptionUser = {
  isSuperAdmin:         boolean
  cartumSuscriptor:     boolean
  cartumSuscriptorTime: number
}

export function hasTier2Access(user: SubscriptionUser): boolean {
  if (user.isSuperAdmin) return true
  if (!user.cartumSuscriptor) return false
  return Math.floor(Date.now() / 1000) < user.cartumSuscriptorTime + TRIAL_SECONDS
}

export function trialRemainingSeconds(
  user: Pick<SubscriptionUser, 'isSuperAdmin' | 'cartumSuscriptorTime'>,
): number {
  if (user.isSuperAdmin) return Infinity
  return user.cartumSuscriptorTime + TRIAL_SECONDS - Math.floor(Date.now() / 1000)
}

export function trialRemainingDays(
  user: Pick<SubscriptionUser, 'isSuperAdmin' | 'cartumSuscriptorTime'>,
): number {
  const secs = trialRemainingSeconds(user)
  if (!isFinite(secs)) return Infinity
  return Math.max(0, Math.floor(secs / 86_400))
}

export async function assertTier2Access(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('UNAUTHENTICATED')
  const user = await usersRepository.findById(session.user.id)
  if (!user) throw new Error('USER_NOT_FOUND')
  if (!hasTier2Access(user)) throw new Error('TIER2_SUBSCRIPTION_REQUIRED')
}
