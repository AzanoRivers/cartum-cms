/**
 * Returns a throttled version of `fn` that fires at most once per `limitMs`.
 * Uses requestAnimationFrame when limitMs = 16 for best frame alignment.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(fn: T, limitMs: number): T {
  let last = 0
  return function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    if (now - last >= limitMs) {
      last = now
      fn.apply(this, args)
    }
  } as T
}
