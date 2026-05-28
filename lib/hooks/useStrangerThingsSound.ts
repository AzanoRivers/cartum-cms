'use client'

import { useRef, useCallback, useState, useEffect } from 'react'

const ST_SOUND = '/sounds/st_c1.mp3'

export function useStrangerThingsSound() {
  const isPlayingRef  = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Warm the HTTP cache on mount so the first click is instant
  useEffect(() => {
    const audio = new Audio(ST_SOUND)
    audio.preload = 'auto'
    audio.load()
    return () => { audio.src = '' }
  }, [])

  // Stable callback — always creates a fresh Audio so there is no stale
  // element state. Browser serves from cache after the first load.
  const playIfST = useCallback((themeId: string) => {
    if (themeId !== 'stranger-things' || isPlayingRef.current) return

    isPlayingRef.current = true
    setIsPlaying(true)

    const audio = new Audio(ST_SOUND)

    const done = () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    }

    audio.addEventListener('ended', done, { once: true })
    audio.addEventListener('error', done, { once: true })

    // play() is called directly inside a user-gesture handler — always allowed
    audio.play().catch(done)
  }, [])

  return { playIfST, isPlaying }
}
