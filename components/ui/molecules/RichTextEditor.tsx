'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Bold, Italic, RemoveFormatting,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Code2,
} from 'lucide-react'
import { charCounterClass } from '@/components/ui/atoms/Input'
import { ColorPickerPopup } from './ColorPicker'

export type RichTextLabels = {
  bold:          string
  boldTip:       string
  italic:        string
  italicTip:     string
  title:         string
  titleTip:      string
  alignLeft:     string
  alignCenter:   string
  alignRight:    string
  color:         string
  colorTip:      string
  link:          string
  linkTip:       string
  linkTextLabel: string
  linkUrlLabel:  string
  linkInsert:    string
  linkCancel:    string
  html:          string
  htmlTip:       string
  htmlCodeLabel: string
  htmlInsert:    string
  htmlCancel:    string
  clear:         string
  clearTip:      string
}

export type RichTextEditorProps = {
  value:        string
  onChange:     (html: string) => void
  maxLength?:   number
  placeholder?: string
  labels?:      Partial<RichTextLabels>
}

const DEFAULT_LABELS: RichTextLabels = {
  bold:          'Bold',
  boldTip:       'Make selected text bold',
  italic:        'Italic',
  italicTip:     'Make selected text italic',
  title:         'Title',
  titleTip:      'Format selected line as a heading',
  alignLeft:     'Left',
  alignCenter:   'Center',
  alignRight:    'Right',
  color:         'Color',
  colorTip:      'Apply color to selected text',
  link:          'Link',
  linkTip:       'Insert a hyperlink',
  linkTextLabel: 'Text',
  linkUrlLabel:  'URL',
  linkInsert:    'Insert',
  linkCancel:    'Cancel',
  html:          'HTML',
  htmlTip:       'Insert raw HTML code',
  htmlCodeLabel: 'HTML code',
  htmlInsert:    'Insert',
  htmlCancel:    'Cancel',
  clear:         'Clear',
  clearTip:      'Remove all formatting',
}

const DEFAULT_MAX   = 1500
const DEFAULT_COLOR = '#6366f1'

function getTextLength(el: HTMLElement): number {
  return (el.textContent ?? '').length
}

// ── Tooltip via portal (escapes overflow:hidden) ──────────────────────────────

function ToolbarTooltip({ tip, children }: { tip: string; children: React.ReactNode }) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const tipRef     = useRef<HTMLSpanElement>(null)
  const [visible,  setVisible]  = useState(false)
  const [pos,      setPos]      = useState({ top: 0, left: 0 })
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const show = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const rect   = wrap.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    setPos({ top: rect.bottom + 6, left: center })
    setVisible(true)
    // After paint: clamp so tooltip doesn't overflow viewport
    requestAnimationFrame(() => {
      const tip = tipRef.current
      if (!tip) return
      const tipW    = tip.offsetWidth
      const MARGIN  = 8
      const clamped = Math.max(MARGIN + tipW / 2, Math.min(center, window.innerWidth - MARGIN - tipW / 2))
      setPos({ top: rect.bottom + 6, left: clamped })
    })
  }, [])

  const hide = useCallback(() => setVisible(false), [])

  return (
    <div
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {mounted && createPortal(
        <span
          ref={tipRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
          className={[
            'pointer-events-none whitespace-nowrap rounded-md px-2.5 py-1',
            'border border-primary/25 bg-surface-2 shadow-lg shadow-black/40',
            'font-mono text-[11px] text-text',
            'transition-opacity duration-150',
            visible ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        >
          {tip}
        </span>,
        document.body
      )}
    </div>
  )
}

// ── Toolbar button ────────────────────────────────────────────────────────────

function TBtn({
  tip, onMD, children, className = '',
}: {
  tip:      string
  onMD:     (e: React.MouseEvent) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <ToolbarTooltip tip={tip}>
      <button
        type="button"
        onMouseDown={onMD}
        className={[
          'flex items-center justify-center w-7 h-7 rounded transition-colors',
          'text-muted hover:bg-surface-2 hover:text-text',
          className,
        ].join(' ')}
      >
        {children}
      </button>
    </ToolbarTooltip>
  )
}

// ── RichTextEditor ────────────────────────────────────────────────────────────

type ToolbarMode = 'default' | 'link' | 'html'

export function RichTextEditor({
  value,
  onChange,
  maxLength,
  placeholder = 'Type something…',
  labels,
}: RichTextEditorProps) {
  const l   = { ...DEFAULT_LABELS, ...labels }
  const max = maxLength ?? DEFAULT_MAX

  const editorRef     = useRef<HTMLDivElement>(null)
  const colorBtnRef   = useRef<HTMLButtonElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const [charCount,       setCharCount]       = useState(0)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [currentColor,    setCurrentColor]    = useState(DEFAULT_COLOR)
  const [toolbarMode,     setToolbarMode]     = useState<ToolbarMode>('default')

  // Link form state
  const [linkText, setLinkText] = useState('')
  const [linkUrl,  setLinkUrl]  = useState('')

  // HTML form state
  const [htmlInput, setHtmlInput] = useState('')

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.innerHTML = value
    setCharCount(getTextLength(el))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function syncChange() {
    const el = editorRef.current
    if (!el) return
    setCharCount(getTextLength(el))
    onChange(el.innerHTML)
  }

  function execCmd(cmd: string, arg?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    syncChange()
  }

  // ── Selection save / restore ──────────────────────────────────────────────

  function saveRange() {
    const sel = window.getSelection()
    savedRangeRef.current = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0).cloneRange() : null
  }

  function restoreRange() {
    const range = savedRangeRef.current
    if (!range || !editorRef.current) return
    // Re-focus editor if it lost focus (color picker interaction can steal it)
    if (document.activeElement !== editorRef.current) {
      editorRef.current.focus()
    }
    const sel = window.getSelection()
    if (!sel) return
    sel.removeAllRanges()
    sel.addRange(range)
  }

  // ── Toolbar handlers ──────────────────────────────────────────────────────

  function handleBold(e: React.MouseEvent)   { e.preventDefault(); execCmd('bold') }
  function handleItalic(e: React.MouseEvent) { e.preventDefault(); execCmd('italic') }

  function handleTitle(e: React.MouseEvent) {
    e.preventDefault()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) { execCmd('formatBlock', 'h2'); return }
    let block: Node | null = sel.getRangeAt(0).commonAncestorContainer
    if (block.nodeType === Node.TEXT_NODE) block = block.parentElement
    const isH2 = !!(block as Element)?.closest?.('h2')
    document.execCommand('formatBlock', false, isH2 ? 'p' : 'h2')
    syncChange()
  }

  function handleAlign(e: React.MouseEvent, cmd: 'justifyLeft' | 'justifyCenter' | 'justifyRight') {
    e.preventDefault()
    execCmd(cmd)
  }

  function handleOpenColor(e: React.MouseEvent) {
    e.preventDefault()
    saveRange()
    setColorPickerOpen(v => !v)
  }

  function handleColorChange(hex: string) {
    setCurrentColor(hex)
    restoreRange()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand('foreColor', false, hex)
    // Re-save range after execCommand: the DOM mutates (text wrapped in <span>)
    // so the previous Range now points to stale nodes. Saving here keeps it fresh
    // for each subsequent drag event in the color picker.
    saveRange()
    syncChange()
  }

  // ── Link mode ─────────────────────────────────────────────────────────────

  function openLinkMode(e: React.MouseEvent) {
    e.preventDefault()
    const selected = window.getSelection()?.toString() ?? ''
    saveRange()
    setLinkText(selected)
    setLinkUrl('')
    setToolbarMode('link')
    setColorPickerOpen(false)
  }

  function handleInsertLink() {
    const url  = linkUrl.trim()
    const text = linkText.trim()
    if (!url) return
    restoreRange()
    editorRef.current?.focus()
    const display  = text || url
    const safeText = display.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safeHref = url.replace(/"/g, '%22')
    document.execCommand(
      'insertHTML', false,
      `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="color:${currentColor};text-decoration:underline;cursor:pointer">${safeText}</a>`,
    )
    syncChange()
    setToolbarMode('default')
    setLinkText(''); setLinkUrl('')
  }

  function cancelLink() {
    setToolbarMode('default')
    setLinkText(''); setLinkUrl('')
  }

  // ── HTML mode ─────────────────────────────────────────────────────────────

  function openHtmlMode(e: React.MouseEvent) {
    e.preventDefault()
    saveRange()
    setHtmlInput('')
    setToolbarMode('html')
    setColorPickerOpen(false)
  }

  function handleInsertHtml() {
    const code = htmlInput.trim()
    if (!code) return
    restoreRange()
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, code)
    syncChange()
    setToolbarMode('default')
    setHtmlInput('')
  }

  function cancelHtml() {
    setToolbarMode('default')
    setHtmlInput('')
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault()
    execCmd('removeFormat')
    execCmd('formatBlock', 'p')
  }

  // ── Key / paste guards ────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const el = editorRef.current
    if (!el) return
    if (e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') return
    if (e.ctrlKey || e.metaKey) return
    if (getTextLength(el) >= max) e.preventDefault()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = editorRef.current
    if (!el) return
    const pasted    = e.clipboardData.getData('text/plain')
    const remaining = max - getTextLength(el)
    if (remaining <= 0) return
    document.execCommand('insertText', false, pasted.slice(0, remaining))
    syncChange()
  }

  const sep = <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

  return (
    <div className="rounded-md border border-border overflow-hidden focus-within:border-primary transition-colors">

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 bg-surface border-b border-border min-h-9.5">

        {toolbarMode === 'link' && (
          <div className="flex items-center gap-1.5 w-full">
            <input
              autoFocus
              type="text"
              placeholder={l.linkTextLabel}
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="h-6 flex-1 min-w-0 rounded border border-border bg-surface-2 px-2 font-mono text-[11px] text-text placeholder:text-muted/50 outline-none focus:border-primary transition-colors"
            />
            <input
              type="url"
              placeholder={`${l.linkUrlLabel} (https://…)`}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInsertLink() }}
              className="h-6 flex-2 min-w-0 rounded border border-border bg-surface-2 px-2 font-mono text-[11px] text-text placeholder:text-muted/50 outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={handleInsertLink}
              disabled={!linkUrl.trim()}
              className="h-6 px-2 rounded bg-primary text-white font-mono text-[10px] hover:bg-primary/80 disabled:opacity-40 transition-all shrink-0"
            >
              {l.linkInsert}
            </button>
            <button
              type="button"
              onClick={cancelLink}
              className="h-6 px-2 rounded border border-border font-mono text-[10px] text-muted hover:text-text hover:border-primary transition-all shrink-0"
            >
              {l.linkCancel}
            </button>
          </div>
        )}

        {toolbarMode === 'html' && (
          <div className="flex items-center gap-1.5 w-full">
            <span className="font-mono text-[10px] text-muted shrink-0">{l.htmlCodeLabel}:</span>
            <input
              autoFocus
              type="text"
              placeholder="<b>text</b> or <span style=…>"
              value={htmlInput}
              onChange={(e) => setHtmlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleInsertHtml() }}
              className="h-6 flex-1 min-w-0 rounded border border-border bg-surface-2 px-2 font-mono text-[11px] text-text placeholder:text-muted/40 outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={handleInsertHtml}
              disabled={!htmlInput.trim()}
              className="h-6 px-2 rounded bg-primary text-white font-mono text-[10px] hover:bg-primary/80 disabled:opacity-40 transition-all shrink-0"
            >
              {l.htmlInsert}
            </button>
            <button
              type="button"
              onClick={cancelHtml}
              className="h-6 px-2 rounded border border-border font-mono text-[10px] text-muted hover:text-text hover:border-primary transition-all shrink-0"
            >
              {l.htmlCancel}
            </button>
          </div>
        )}

        {toolbarMode === 'default' && (
          <>
            <TBtn tip={l.boldTip}   onMD={handleBold}>   <Bold   size={13} /></TBtn>
            <TBtn tip={l.italicTip} onMD={handleItalic}> <Italic size={13} /></TBtn>

            <ToolbarTooltip tip={l.titleTip}>
              <button
                type="button"
                onMouseDown={handleTitle}
                className="flex items-center justify-center h-7 px-2 rounded hover:bg-surface-2 text-muted hover:text-text transition-colors font-mono text-[11px] font-semibold"
              >
                {l.title}
              </button>
            </ToolbarTooltip>

            {sep}

            <TBtn tip={l.alignLeft}   onMD={(e) => handleAlign(e, 'justifyLeft')}>   <AlignLeft   size={13} /></TBtn>
            <TBtn tip={l.alignCenter} onMD={(e) => handleAlign(e, 'justifyCenter')}> <AlignCenter size={13} /></TBtn>
            <TBtn tip={l.alignRight}  onMD={(e) => handleAlign(e, 'justifyRight')}>  <AlignRight  size={13} /></TBtn>

            {sep}

            {/* Color picker button */}
            <ToolbarTooltip tip={l.colorTip}>
              <button
                ref={colorBtnRef}
                type="button"
                onMouseDown={handleOpenColor}
                className="flex items-center justify-center w-7 h-7 rounded hover:bg-surface-2 transition-colors"
                aria-label={l.color}
              >
                <div className="relative w-4 h-4">
                  <div
                    className="absolute inset-0 rounded-full border border-border/50"
                    style={{ backgroundImage: 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
                  />
                  <div
                    className="absolute inset-0.75 rounded-full border border-border/30"
                    style={{ backgroundColor: currentColor }}
                  />
                </div>
              </button>
            </ToolbarTooltip>

            {sep}

            <TBtn tip={l.linkTip} onMD={openLinkMode}><Link2   size={13} /></TBtn>
            <TBtn tip={l.htmlTip} onMD={openHtmlMode}><Code2   size={13} /></TBtn>

            {sep}

            <TBtn tip={l.clearTip} onMD={handleClear}><RemoveFormatting size={13} /></TBtn>
          </>
        )}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={syncChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={[
          'min-h-32 px-3 py-2 outline-none text-text text-sm font-mono',
          'empty:before:content-[attr(data-placeholder)]',
          'empty:before:text-muted/50 empty:before:pointer-events-none',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text [&_h2]:mb-1',
          '[&_strong]:font-bold [&_em]:italic',
          '[&_a]:underline [&_a]:cursor-pointer',
        ].join(' ')}
      />

      {/* Counter */}
      <div className="flex justify-end px-3 py-1 bg-surface border-t border-border">
        <span className={`font-mono text-[10px] tabular-nums ${charCounterClass(charCount, max)}`}>
          {charCount}/{max}
        </span>
      </div>

      {/* Color picker portal */}
      {colorPickerOpen && (
        <ColorPickerPopup
          anchorEl={colorBtnRef.current}
          value={currentColor}
          onChange={handleColorChange}
          onClose={() => setColorPickerOpen(false)}
        />
      )}
    </div>
  )
}
