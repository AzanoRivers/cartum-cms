'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  listApiTokens,
  createApiToken,
  revokeApiToken,
} from '@/lib/actions/api-tokens.actions'
import { listRolesWithCount } from '@/lib/actions/settings.actions'
import { useToast } from '@/lib/hooks/useToast'
import { VHSTransition } from '@/components/ui/transitions/VHSTransition'
import type { Dictionary } from '@/locales/en'
import type { ApiToken } from '@/types/api-tokens'

export type ApiTokensSectionProps = {
  d: Dictionary['settings']['api']
}

type TokenModalState = { rawToken: string; copied: boolean } | null

export function ApiTokensSection({ d }: ApiTokensSectionProps) {
  const [tokens, setTokens]         = useState<ApiToken[]>([])
  const [roleOptions, setRoleOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loaded, setLoaded]         = useState(false)
  const [modal, setModal]           = useState<TokenModalState>(null)

  const [name, setName]     = useState('')
  const [roleId, setRoleId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const [isCreating, startCreate]   = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const toast = useToast()
  const checkRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([listApiTokens(), listRolesWithCount()]).then(([tokRes, rolesRes]) => {
      if (tokRes.success) setTokens(tokRes.data)
      if (rolesRes.success) {
        setRoleOptions(rolesRes.data.map((r) => ({ id: r.id, name: r.name })))
        if (rolesRes.data.length > 0) setRoleId(rolesRes.data[0].id)
      }
      setLoaded(true)
    })
  }, [])

  function handleCreate() {
    if (!name.trim() || !roleId) return
    startCreate(async () => {
      const res = await createApiToken({
        name: name.trim(),
        roleId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      })
      if (res.success) {
        setTokens((prev) => [...prev, res.data.meta])
        setModal({ rawToken: res.data.token, copied: false })
        setName('')
        setExpiresAt('')
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

  if (!loaded) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">Loading…</span>
      </div>
    )
  }

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
                {[d.tokenName, d.roleCol, d.lastUsed, d.expiresCol, ''].map((h, i) => (
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
                    {roleOptions.find((r) => r.id === tok.roleId)?.name ?? tok.roleId.slice(0, 8)}
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
      <div className="rounded-md border border-border/60 bg-surface-2/40 p-4 space-y-3">
        <p className="font-mono text-xs text-muted uppercase tracking-wider">{d.newTokenTitle}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={d.namePlaceholder}
            className="w-full sm:flex-1 sm:min-w-32 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text placeholder-muted/40 outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text outline-none focus:border-primary/60 transition-colors cursor-pointer"
          >
            {roleOptions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            title={d.expiresLabel}
            className="w-full sm:w-auto rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-sm text-muted outline-none focus:border-primary/60 transition-colors"
          />
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || !roleId}
            className="w-full sm:w-auto rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isCreating ? d.creating : d.createButton}
          </button>
        </div>
      </div>

      {/* Raw token modal */}
      {modal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <VHSTransition duration="fast" className="w-full max-w-md">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
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
              <div className="flex justify-end">
                <button
                  onClick={() => setModal(null)}
                  disabled={!modal.copied}
                  className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs text-white transition-colors hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {d.close}
                </button>
              </div>
            </div>
          </VHSTransition>
        </div>
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
