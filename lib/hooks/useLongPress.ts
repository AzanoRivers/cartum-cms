import { useRef } from 'react'

export function useLongPress(onLongPress: () => void, duration = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    timerRef.current = setTimeout(onLongPress, duration)
  }

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onTouchStart: start,
    onTouchEnd:   clear,
    onTouchMove:  clear,
  }
}
