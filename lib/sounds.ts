'use client'

function play(src: string, volume = 0.5) {
  try {
    const audio = new Audio(src)
    audio.volume = volume
    audio.play().catch(() => { /* autoplay blocked */ })
  } catch { /* SSR or unsupported */ }
}

export const playErrorSound = () => play('/sounds/error_001.wav', 0.5)
export const playStartSound = () => play('/sounds/start_001.wav', 0.7)
