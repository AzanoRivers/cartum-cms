// ANSI color codes — no external dependencies
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const

export function header(text: string): void {
  process.stdout.write(`\n${C.bold}${C.cyan}▶ ${text}${C.reset}\n`)
}

export function ok(message: string): void {
  process.stdout.write(`  ${C.green}✓${C.reset}  ${message}\n`)
}

export function warn(code: string, message: string, hint?: string): void {
  process.stdout.write(`  ${C.yellow}⚠${C.reset}  ${C.yellow}[${code}]${C.reset} ${message}\n`)
  if (hint) {
    process.stdout.write(`     ${C.gray}→ ${hint}${C.reset}\n`)
  }
}

export function info(code: string, message: string, hint?: string): void {
  process.stdout.write(`  ${C.cyan}ℹ${C.reset}  ${C.cyan}[${code}]${C.reset} ${message}\n`)
  if (hint) {
    process.stdout.write(`     ${C.gray}→ ${hint}${C.reset}\n`)
  }
}

export function fatal(code: string, message: string, hint?: string): void {
  process.stdout.write(`  ${C.red}✖${C.reset}  ${C.red}[${code}]${C.reset} ${message}\n`)
  if (hint) {
    process.stdout.write(`     ${C.gray}→ ${hint}${C.reset}\n`)
  }
  process.stdout.write(`     ${C.gray}→ Reference: errores_info.md#${code.toLowerCase()}${C.reset}\n`)
}

export function devUrl(url: string): void {
  const line = `  ➜  Local:  ${url}`
  process.stdout.write(
    `\n${C.cyan}${'─'.repeat(52)}${C.reset}\n` +
    `${C.bold}${line}${C.reset}\n` +
    `${C.cyan}${'─'.repeat(52)}${C.reset}\n`,
  )
}
