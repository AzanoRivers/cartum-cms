'use client'

import { useEffect } from 'react'
import type { ThemeId } from '@/types/theme'

type Props = { theme: ThemeId }

export function ThemeSync({ theme }: Props) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('cartum-theme', theme)
  }, [theme])
  return null
}
