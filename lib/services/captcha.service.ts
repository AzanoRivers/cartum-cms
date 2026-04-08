import { createHmac, randomInt } from 'crypto'

function secret(): string {
  return process.env.AUTH_SECRET ?? 'fallback-captcha-secret'
}

export interface CaptchaChallenge {
  a:     number
  b:     number
  token: string
}

export function generateCaptcha(): CaptchaChallenge {
  const a   = randomInt(1, 10)
  const b   = randomInt(1, 10)
  const ans = a + b
  const exp = Date.now() + 5 * 60 * 1000 // 5 min

  const payload = `${a}:${b}:${ans}:${exp}`
  const sig     = createHmac('sha256', secret()).update(payload).digest('hex')
  const token   = Buffer.from(`${payload}|${sig}`).toString('base64url')

  return { a, b, token }
}

export function verifyCaptcha(token: string, answer: number): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const sepIdx  = decoded.lastIndexOf('|')
    if (sepIdx === -1) return false

    const payload     = decoded.slice(0, sepIdx)
    const sig         = decoded.slice(sepIdx + 1)
    const expectedSig = createHmac('sha256', secret()).update(payload).digest('hex')

    if (sig !== expectedSig) return false

    const parts = payload.split(':')
    if (parts.length !== 4) return false

    const exp           = Number(parts[3])
    const expectedAnswer = Number(parts[2])

    if (isNaN(exp) || isNaN(expectedAnswer)) return false
    if (Date.now() > exp) return false

    return answer === expectedAnswer
  } catch {
    return false
  }
}
