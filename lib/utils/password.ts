export function generateSecurePassword(): string {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower   = 'abcdefghijklmnopqrstuvwxyz'
  const digits  = '0123456789'
  const symbols = '!@#$%^&*-_=+'
  const charset = upper + lower + digits + symbols

  const length = 20
  const buf    = new Uint8Array(length + 4)
  crypto.getRandomValues(buf)

  const required = [
    upper  [buf[0] % upper.length],
    lower  [buf[1] % lower.length],
    digits [buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ]
  const rest = Array.from(buf.slice(4), (b) => charset[b % charset.length])

  const chars      = [...required, ...rest]
  const shuffleBuf = new Uint8Array(chars.length)
  crypto.getRandomValues(shuffleBuf)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
