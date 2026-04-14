'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/atoms/Icon'

export type DocsCodeBlockProps = {
  code: string
  language?: string
}

export function DocsCodeBlock({ code, language = 'bash' }: DocsCodeBlockProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-surface-2">
      {language && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {language}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-muted transition-colors hover:text-text cursor-pointer"
          >
            <Icon name={copied ? 'Check' : 'Copy'} size="sm" className={copied ? 'text-success' : ''} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className="font-mono text-xs leading-5 text-text whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  )
}
