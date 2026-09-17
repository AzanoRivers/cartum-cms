// ASCII spinner pintado en stdout mientras corren los checks lentos del boot (DB, schema).
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const
const TICK_MS = 80

let timer: ReturnType<typeof setInterval> | null = null
let lastLineLength = 0

export function clearSpinnerLine(): void {
  if (lastLineLength === 0) return
  process.stdout.write(`\r${' '.repeat(lastLineLength)}\r`)
  lastLineLength = 0
}

export function startSpinner(label = 'Shuffling CartumCMS'): void {
  if (timer) return

  const startedAt = Date.now()
  let frame = 0

  timer = setInterval(() => {
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
    const line = `  \x1b[36m${FRAMES[frame % FRAMES.length]}\x1b[0m  ${label}... Wait ${elapsed}s`
    frame++
    clearSpinnerLine()
    process.stdout.write(line)
    lastLineLength = line.length
  }, TICK_MS)

  timer.unref?.()
}

export function stopSpinner(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  clearSpinnerLine()
}
