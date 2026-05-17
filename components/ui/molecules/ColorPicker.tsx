'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ── Color math ────────────────────────────────────────────────────────────────

type RGBA = { r: number; g: number; b: number; a: number }
type HSVA = { h: number; s: number; v: number; a: number }

function hsvaToRgba({ h, s, v, a }: HSVA): RGBA {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255), a }
}

function rgbaToHsva({ r, g, b, a }: RGBA): HSVA {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min
  let h = 0
  if (d > 0) {
    if      (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
    else if (max === gn) h = ((bn - rn) / d + 2) * 60
    else                 h = ((rn - gn) / d + 4) * 60
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a }
}

function hexToRgba(hex: string): RGBA | null {
  const c = hex.replace(/^#/, '')
  if (c.length === 3) return { r: parseInt(c[0]+c[0], 16), g: parseInt(c[1]+c[1], 16), b: parseInt(c[2]+c[2], 16), a: 1 }
  if (c.length === 6) return { r: parseInt(c.slice(0,2), 16), g: parseInt(c.slice(2,4), 16), b: parseInt(c.slice(4,6), 16), a: 1 }
  if (c.length === 8) return { r: parseInt(c.slice(0,2), 16), g: parseInt(c.slice(2,4), 16), b: parseInt(c.slice(4,6), 16), a: parseInt(c.slice(6,8), 16) / 255 }
  return null
}

function rgbaToHex({ r, g, b, a }: RGBA): string {
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ''}`
}

function hueHex(h: number): string {
  return rgbaToHex(hsvaToRgba({ h, s: 1, v: 1, a: 1 }))
}

// ── ColorPicker ───────────────────────────────────────────────────────────────

export type ColorPickerProps = {
  value: string
  onChange: (hex: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const initHsva = rgbaToHsva(hexToRgba(value) ?? { r: 99, g: 102, b: 241, a: 1 })
  const initRgba = hsvaToRgba(initHsva)

  const [hsva,   setHsva]   = useState<HSVA>(initHsva)
  const [hexRaw, setHexRaw] = useState(() => rgbaToHex({ ...initRgba, a: 1 }).replace('#', ''))
  const [rStr,   setRStr]   = useState(() => String(initRgba.r))
  const [gStr,   setGStr]   = useState(() => String(initRgba.g))
  const [bStr,   setBStr]   = useState(() => String(initRgba.b))
  const [aStr,   setAStr]   = useState(() => String(Math.round(initHsva.a * 100)))

  // Refs so drag closures always call the latest commit + read latest hsva
  const hsvaRef   = useRef(hsva)
  hsvaRef.current = hsva

  const commitRef = useRef<(next: HSVA) => void>(null!)
  commitRef.current = (next: HSVA) => {
    setHsva(next)
    const hex = rgbaToHex(hsvaToRgba(next))
    setHexRaw(hex.replace('#', '').slice(0, 6))
    const { r, g, b, a } = hsvaToRgba(next)
    setRStr(String(Math.round(r)))
    setGStr(String(Math.round(g)))
    setBStr(String(Math.round(b)))
    setAStr(String(Math.round(a * 100)))
    onChange(hex)
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────────

  function makeDrag(el: HTMLElement, move: (cx: number, cy: number) => void) {
    const onMove = (e: PointerEvent) => move(e.clientX, e.clientY)
    const onUp   = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp) }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    void el
  }

  function handleSquareDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const move = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      commitRef.current({ ...hsvaRef.current, s: Math.max(0, Math.min(1, (cx - r.left) / r.width)), v: Math.max(0, Math.min(1, 1 - (cy - r.top) / r.height)) })
    }
    move(e.clientX, e.clientY)
    makeDrag(el, move)
  }

  function handleHueDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const move = (cx: number) => {
      const r = el.getBoundingClientRect()
      commitRef.current({ ...hsvaRef.current, h: Math.max(0, Math.min(360, ((cx - r.left) / r.width) * 360)) })
    }
    move(e.clientX)
    makeDrag(el, move)
  }

  function handleAlphaDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const move = (cx: number) => {
      const r = el.getBoundingClientRect()
      commitRef.current({ ...hsvaRef.current, a: Math.max(0, Math.min(1, (cx - r.left) / r.width)) })
    }
    move(e.clientX)
    makeDrag(el, move)
  }

  // ── Text input handlers ───────────────────────────────────────────────────────

  function onHexInput(raw: string) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHexRaw(clean)
    if (clean.length === 6) {
      const rgba = hexToRgba('#' + clean)
      if (rgba) commitRef.current({ ...rgbaToHsva(rgba), a: hsvaRef.current.a })
    }
  }

  function onRgbChannel(ch: 'r' | 'g' | 'b', val: string) {
    const setters = { r: setRStr, g: setGStr, b: setBStr }
    setters[ch](val)
    const clamp = (s: string) => Math.max(0, Math.min(255, parseInt(s) || 0))
    const nr = ch === 'r' ? clamp(val) : clamp(rStr)
    const ng = ch === 'g' ? clamp(val) : clamp(gStr)
    const nb = ch === 'b' ? clamp(val) : clamp(bStr)
    commitRef.current({ ...rgbaToHsva({ r: nr, g: ng, b: nb, a: 1 }), a: hsvaRef.current.a })
  }

  function onAlphaInput(val: string) {
    setAStr(val)
    commitRef.current({ ...hsvaRef.current, a: Math.max(0, Math.min(100, parseInt(val) || 0)) / 100 })
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const hh      = hueHex(hsva.h)
  const rgba    = hsvaToRgba(hsva)
  const currHex = rgbaToHex(rgba)

  const inputCls = 'w-full rounded border border-border bg-surface-2 py-0.5 font-mono text-[10px] text-text text-center outline-none focus:border-primary transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

  return (
    <div
      className="flex flex-col gap-3 w-56 p-3 rounded-xl border border-border bg-surface shadow-2xl shadow-black/60 select-none"
      onMouseDown={(e) => {
        // Prevent any drag/click in the picker from stealing focus from the editor.
        // Inputs are excluded so the user can still type hex/RGBA values.
        if ((e.target as HTMLElement).tagName !== 'INPUT') e.preventDefault()
      }}
    >
      {/* Saturation / Brightness square */}
      <div
        className="relative h-28 rounded-lg cursor-crosshair overflow-hidden"
        style={{ background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, ${hh})` }}
        onPointerDown={handleSquareDown}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow shadow-black/50 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
        />
      </div>

      {/* Hue slider */}
      <div
        className="relative h-3 rounded-full cursor-crosshair"
        style={{ background: 'linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
        onPointerDown={handleHueDown}
      >
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow shadow-black/50 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(hsva.h / 360) * 100}%` }}
        />
      </div>

      {/* Alpha slider */}
      <div className="relative h-3 cursor-crosshair" onPointerDown={handleAlphaDown}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ backgroundImage: 'repeating-conic-gradient(#555 0 25%, #333 0 50%)', backgroundSize: '8px 8px' }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `linear-gradient(to right, transparent, ${hh})` }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow shadow-black/50 pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${hsva.a * 100}%` }}
        />
      </div>

      {/* Hex + preview */}
      <div className="flex items-center gap-2">
        <div className="relative w-8 h-8 rounded-md border border-border/60 shrink-0 overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-conic-gradient(#555 0 25%, #333 0 50%)', backgroundSize: '8px 8px' }} />
          <div className="absolute inset-0" style={{ backgroundColor: currHex }} />
        </div>
        <div className="flex items-center flex-1 rounded border border-border bg-surface-2 px-2 h-8 gap-1 focus-within:border-primary transition-colors">
          <span className="font-mono text-[11px] text-muted">#</span>
          <input
            type="text"
            value={hexRaw.toUpperCase()}
            onChange={(e) => onHexInput(e.target.value)}
            className="flex-1 font-mono text-[11px] text-text bg-transparent outline-none min-w-0"
            maxLength={6}
            spellCheck={false}
          />
        </div>
      </div>

      {/* RGBA channels */}
      <div className="grid grid-cols-4 gap-1">
        {(['r', 'g', 'b'] as const).map((ch) => (
          <div key={ch} className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] text-muted text-center uppercase">{ch}</span>
            <input
              type="number"
              min={0}
              max={255}
              value={ch === 'r' ? rStr : ch === 'g' ? gStr : bStr}
              onChange={(e) => onRgbChannel(ch, e.target.value)}
              className={inputCls}
            />
          </div>
        ))}
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[9px] text-muted text-center">A%</span>
          <input
            type="number"
            min={0}
            max={100}
            value={aStr}
            onChange={(e) => onAlphaInput(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  )
}

// ── Portal wrapper ────────────────────────────────────────────────────────────

export type ColorPickerPopupProps = {
  anchorEl: HTMLElement | null
  value:    string
  onChange: (hex: string) => void
  onClose:  () => void
}

export function ColorPickerPopup({ anchorEl, value, onChange, onClose }: ColorPickerPopupProps) {
  const popupRef  = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!anchorEl) return
    const rect     = anchorEl.getBoundingClientRect()
    const pickerW  = 224
    const left     = Math.max(8, Math.min(rect.left, window.innerWidth - pickerW - 8))
    setPos({ top: rect.bottom + 6, left })
    setReady(true)
  }, [anchorEl])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popupRef.current?.contains(e.target as Node)) return
      if (anchorEl?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose, anchorEl])

  if (!ready) return null

  return createPortal(
    <div ref={popupRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
      <ColorPicker value={value} onChange={onChange} />
    </div>,
    document.body
  )
}
