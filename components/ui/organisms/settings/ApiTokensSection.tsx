'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { DocLink } from '@/components/ui/atoms/DocLink'
import {
  listApiTokens,
  createApiToken,
  revokeApiToken,
} from '@/lib/actions/api-tokens.actions'
import { listRolesWithCount } from '@/lib/actions/settings.actions'
import { getContainerNodes } from '@/lib/actions/nodes.actions'
import { useToast } from '@/lib/hooks/useToast'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import { SectionLoader } from '@/components/ui/atoms/SectionLoader'
import type { Dictionary } from '@/locales/en'
import type { ApiToken, TokenScope } from '@/types/api-tokens'
import type { ContainerNode } from '@/types/nodes'

export type ApiTokensSectionProps = {
  d:           Dictionary['settings']['api']
  loadingText: string
}

type TokenModalState = { rawToken: string; copied: boolean } | null

const ALL_SCOPES: TokenScope[] = ['read', 'write', 'update', 'delete']

function scopeLabel(scope: TokenScope, d: Dictionary['settings']['api']): string {
  if (scope === 'read')   return d.scopeRead
  if (scope === 'write')  return d.scopeWrite
  if (scope === 'update') return d.scopeUpdate
  return d.scopeDelete
}

export function ApiTokensSection({ d, loadingText }: ApiTokensSectionProps) {
  const [tokens, setTokens]         = useState<ApiToken[]>([])
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>([])
  const [allDecks, setAllDecks]     = useState<ContainerNode[]>([])
  const [loaded, setLoaded]         = useState(false)
  const [modal, setModal]           = useState<TokenModalState>(null)

  // Form state
  const [name, setName]                 = useState('')
  const [roleId, setRoleId]             = useState('')
  const [expiresAt, setExpiresAt]       = useState('')
  const [scope, setScope]               = useState<TokenScope[]>(['read'])
  const [excludedIds, setExcludedIds]   = useState<string[]>([])
  const [showExclModal, setShowExclModal]   = useState(false)
  const [deckSearch, setDeckSearch]         = useState('')
  const [localExcluded, setLocalExcluded]   = useState<string[]>([])

  const [isCreating, startCreate]   = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const toast = useToast()
  const checkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([listApiTokens(), listRolesWithCount(), getContainerNodes()]).then(
      ([tokRes, rolesRes, decksRes]) => {
        if (tokRes.success)   setTokens(tokRes.data)
        if (rolesRes.success) {
          setRoleOptions(rolesRes.data.map((r) => ({ id: r.id, name: r.name })))
          if (rolesRes.data.length > 0) setRoleId(rolesRes.data[0].id)
        }
        if (decksRes.success) setAllDecks(decksRes.data)
        setLoaded(true)
      },
    )
  }, [])

  function toggleScope(s: TokenScope) {
    setScope((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function openExclModal() {
    setLocalExcluded([...excludedIds])
    setDeckSearch('')
    setShowExclModal(true)
  }

  function toggleLocalDeck(id: string) {
    setLocalExcluded((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function confirmExclusions() {
    setExcludedIds(localExcluded)
    setShowExclModal(false)
  }

  function removeExclusion(nodeId: string) {
    setExcludedIds((prev) => prev.filter((id) => id !== nodeId))
  }

  function handleCreate() {
    if (!name.trim() || !roleId || scope.length === 0) return
    startCreate(async () => {
      const res = await createApiToken({
        name:            name.trim(),
        roleId,
        scope,
        excludedNodeIds: excludedIds,
        expiresAt:       expiresAt ? new Date(expiresAt) : undefined,
      })
      if (res.success) {
        setTokens((prev) => [...prev, res.data.meta])
        setModal({ rawToken: res.data.token, copied: false })
        setName('')
        setExpiresAt('')
        setScope(['read'])
        setExcludedIds([])
        toast.success(d.createSuccess)
      } else {
        toast.error(d.createError)
      }
    })
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId)
    const res = await revokeApiToken(tokenId)
    setRevokingId(null)
    if (res.success) {
      setTokens((prev) => prev.filter((t) => t.id !== tokenId))
      toast.success(d.revokeSuccess)
    }
  }

  function handleCopy() {
    if (!modal) return
    navigator.clipboard.writeText(modal.rawToken)
    setModal((m) => m ? { ...m, copied: true } : null)
  }

  const filteredDecks = allDecks.filter((dk) =>
    dk.name.toLowerCase().includes(deckSearch.toLowerCase()),
  )

  if (!loaded) return <SectionLoader text={loadingText} />

  return (
    <div className="space-y-5">
      <h2 className="font-mono text-xs text-muted uppercase tracking-widest">{d.title}</h2>

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="font-mono text-xs text-muted/50">{d.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {[d.tokenName, d.scopeCol, d.lastUsed, d.expiresCol, ''].map((h, i) => (
                  <th key={i} className="px-3 py-2 font-mono text-[11px] text-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map((tok) => (
                <tr key={tok.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/50 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-text">{tok.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">
                    {tok.scope.join(', ')}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">
                    {tok.lastUsedAt ? formatRelative(tok.lastUsedAt) : '·'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">
                    {tok.expiresAt ? tok.expiresAt.toLocaleDateString() : d.never}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleRevoke(tok.id)}
                      disabled={revokingId === tok.id}
                      className="font-mono text-xs text-danger/70 hover:text-danger transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {revokingId === tok.id ? d.revoking : d.revoke}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New token form */}
      <div className="rounded-md border border-border/60 bg-surface-2/40 p-4 space-y-4">
        <p className="font-mono text-xs text-muted uppercase tracking-wider">{d.newTokenTitle}</p>

        {/* Name + Expiry */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="flex flex-col gap-1 sm:flex-1 sm:min-w-40">
            <label className="font-mono text-[11px] text-muted uppercase tracking-wider">{d.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={d.namePlaceholder}
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1 sm:w-auto">
            <label className="font-mono text-[11px] text-muted uppercase tracking-wider">{d.expiresLabel}</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-muted outline-none focus:border-primary/60 transition-colors"
            />
          </div>
        </div>

        {/* Scope checkboxes */}
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] text-muted uppercase tracking-wider">{d.scopeLabel}</p>
          <div className="flex flex-wrap gap-3">
            {ALL_SCOPES.map((s) => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scope.includes(s)}
                  onChange={() => toggleScope(s)}
                  className="accent-primary"
                />
                <span className="font-mono text-xs text-text">{scopeLabel(s, d)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Exclusions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-muted uppercase tracking-wider">{d.exclusionsLabel}</p>
            <button
              type="button"
              onClick={openExclModal}
              className="font-mono text-[11px] text-primary/80 hover:text-primary transition-colors cursor-pointer"
            >
              + {d.addExclusion}
            </button>
          </div>
          {excludedIds.length === 0 ? (
            <p className="font-mono text-[11px] text-muted/40">{d.exclusionsHint}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {excludedIds.map((id) => {
                const deck = allDecks.find((dk) => dk.id === id)
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-text">
                    {deck?.name ?? id.slice(0, 8)}
                    <button
                      type="button"
                      onClick={() => removeExclusion(id)}
                      className="text-muted hover:text-danger transition-colors cursor-pointer ml-0.5"
                      aria-label={d.removeExclusion}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={isCreating || !name.trim() || !roleId || scope.length === 0}
          className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isCreating ? d.creating : d.createButton}
        </button>
      </div>

      {/* Docs link */}
      <DocLink href="/cms/docs#apiForDevs" label={d.docsLinkLabel} desc={d.docsLinkDesc} />

      {/* Exclusion modal */}
      {showExclModal && (
        <>
          <div className="fixed inset-0 z-60" aria-hidden="true" onClick={() => setShowExclModal(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4">
            <VHSTransition duration="fast" className="w-full max-w-md">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto relative w-full flex flex-col max-h-[80vh] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-0.5 w-full shrink-0 bg-primary" />
                <div className="flex flex-col gap-4 p-5 min-h-0">
                  <p className="shrink-0 font-mono text-xs text-muted uppercase tracking-wider">{d.exclusionModalTitle}</p>
                  <input
                    type="text"
                    value={deckSearch}
                    onChange={(e) => setDeckSearch(e.target.value)}
                    placeholder={d.searchDecks}
                    autoFocus
                    className="shrink-0 w-full rounded-md border border-border bg-surface-2 px-3 py-1.5 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
                  />
                  <div className="min-h-[80px] flex-1 overflow-y-auto">
                    {filteredDecks.length === 0 ? (
                      <p className="font-mono text-xs text-muted/40 py-6 text-center">{d.noDecksFound}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 py-1">
                        {filteredDecks.map((dk) => {
                          const selected = localExcluded.includes(dk.id)
                          return (
                            <button
                              key={dk.id}
                              type="button"
                              onClick={() => toggleLocalDeck(dk.id)}
                              className={[
                                'group flex flex-col gap-0.5 rounded-lg border px-3 py-2 min-w-[80px] max-w-[140px] text-left transition-all duration-150 cursor-pointer',
                                selected
                                  ? 'border-primary/60 bg-primary/10 shadow-md'
                                  : 'border-border bg-surface-2 hover:border-primary/40 hover:bg-surface hover:shadow-md',
                              ].join(' ')}
                            >
                              <span className={[
                                'block h-1 w-4 rounded-sm transition-colors',
                                selected ? 'bg-primary/70' : 'bg-border group-hover:bg-primary/40',
                              ].join(' ')} />
                              <span className="font-mono text-[11px] text-text leading-tight break-words">{dk.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border/40 pt-3">
                    <button
                      onClick={() => setShowExclModal(false)}
                      className="rounded-md border border-border bg-surface-2 px-4 py-1.5 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
                    >
                      {d.exclusionModalClose}
                    </button>
                    <button
                      onClick={confirmExclusions}
                      className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 cursor-pointer"
                    >
                      {d.exclusionConfirm}
                    </button>
                  </div>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}

      {/* Raw token modal */}
      {modal && (
        <>
          <div className="fixed inset-0 z-60" aria-hidden="true" />
          <div className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4">
            <VHSTransition duration="fast" className="w-full max-w-md">
              <div
                role="dialog"
                aria-modal="true"
                className="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
              >
                <div className="h-0.5 w-full bg-warning/80" />
                <div className="p-6 space-y-4">
                  <p className="font-mono text-xs text-warning/80">{d.tokenOnceNotice}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-accent select-all break-all">
                      {modal.rawToken}
                    </code>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 rounded-md border border-border px-3 py-2 font-mono text-xs text-muted hover:text-text transition-colors cursor-pointer"
                    >
                      {modal.copied ? d.copied : d.copyToken}
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      ref={checkRef}
                      type="checkbox"
                      checked={modal.copied}
                      onChange={() => setModal((m) => m ? { ...m, copied: !m.copied } : null)}
                      className="accent-primary"
                    />
                    <span className="font-mono text-xs text-text-muted">{d.confirmCopied}</span>
                  </label>
                  <div className="flex justify-end border-t border-border/40 pt-3">
                    <button
                      onClick={() => setModal(null)}
                      disabled={!modal.copied}
                      className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {d.close}
                    </button>
                  </div>
                </div>
              </div>
            </VHSTransition>
          </div>
        </>
      )}
    </div>
  )
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
