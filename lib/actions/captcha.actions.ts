'use server'

import { generateCaptcha, type CaptchaChallenge } from '@/lib/services/captcha.service'

export async function generateCaptchaAction(): Promise<CaptchaChallenge> {
  return generateCaptcha()
}
