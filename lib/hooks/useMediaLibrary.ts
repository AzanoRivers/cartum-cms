'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { listMediaAssets } from '@/lib/actions/media.actions'
import type { MediaRecord } from '@/types/media'

const PAGE_SIZE = 24

export function useMediaLibrary(filter: 'image' | 'video', open: boolean) {
  const [assets,     setAssets]     = useState<MediaRecord[]>([])
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined)
  const [isLoading,  setIsLoading]  = useState(false)
  const [hasMore,    setHasMore]    = useState(true)
  const [search,     setSearch]     = useState('')
  const sentinelRef                 = useRef<HTMLDivElement | null>(null)
  const observerRef                 = useRef<IntersectionObserver | null>(null)
  const searchTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setAssets([])
    setNextCursor(undefined)
    setHasMore(true)
  }, [])

  const loadPage = useCallback(async (cursor: string | null | undefined, searchTerm: string) => {
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await listMediaAssets({
        filter,
        cursor:  cursor ?? undefined,
        limit:   PAGE_SIZE,
        search:  searchTerm || undefined,
      })
      if (result.success) {
        setAssets((prev) => cursor === undefined ? result.data.assets : [...prev, ...result.data.assets])
        setNextCursor(result.data.nextCursor)
        setHasMore(result.data.nextCursor !== null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [filter, isLoading])

  // Initial load / reset when picker opens or search changes
  useEffect(() => {
    if (!open) return
    reset()
  }, [open, search, reset])

  // Load first page after reset
  useEffect(() => {
    if (!open) return
    if (nextCursor !== undefined) return  // already loaded or loading more
    loadPage(undefined, search)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nextCursor])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!open) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    observerRef.current?.disconnect()

    if (!hasMore || isLoading) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadPage(nextCursor, search)
        }
      },
      { threshold: 0.1 },
    )
    observerRef.current.observe(sentinel)

    return () => observerRef.current?.disconnect()
  }, [open, hasMore, isLoading, nextCursor, search, loadPage])

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setSearch(value), 300)
  }, [])

  return {
    assets,
    isLoading,
    hasMore,
    sentinelRef,
    handleSearch,
    searchValue: search,
  }
}
