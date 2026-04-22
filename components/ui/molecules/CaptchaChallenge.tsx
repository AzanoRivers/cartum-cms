'use client'

import { useEffect, useRef, useCallback } from 'react'

export type CaptchaChallengeProps = {
  /** The two numbers currently being shown (a + b) */
  a:           number
  b:           number
  /** Current input value */
  value:       string
  onChange:    (v: string) => void
  /** Regenerate new pair */
  onRefresh:   () => void
  label:       string
  placeholder: string
  /** Highlight in red when wrong answer was submitted */
  isError?:    boolean
}

const DIGIT_W = 44
const DIGIT_H = 56
const FONT    = 'bold 28px "Courier New", monospace'

function drawDigit(canvas: HTMLCanvasElement, digit: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width  = DIGIT_W
  canvas.height = DIGIT_H

  // Background
  ctx.fillStyle = '#1a1a24'
  ctx.fillRect(0, 0, DIGIT_W, DIGIT_H)

  // Border (primary glow)
  ctx.strokeStyle = '#6366f1'
  ctx.lineWidth   = 1.5
  ctx.strokeRect(1, 1, DIGIT_W - 2, DIGIT_H - 2)

  // Subtle scanlines overlay
  ctx.fillStyle = 'rgba(255,255,255,0.03)'
  for (let y = 0; y < DIGIT_H; y += 4) {
    ctx.fillRect(0, y, DIGIT_W, 2)
  }

  // Slight random jitter for organic feel (x: ±2px)
  const jitter = (Math.random() - 0.5) * 4

  // Shadow / glow layer
  ctx.font        = FONT
  ctx.textAlign   = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle   = 'rgba(99,102,241,0.5)'
  ctx.fillText(String(digit), DIGIT_W / 2 + jitter + 1.5, DIGIT_H / 2 + 1.5)

  // Primary digit — accent cyan
  ctx.fillStyle = '#22d3ee'
  ctx.fillText(String(digit), DIGIT_W / 2 + jitter, DIGIT_H / 2)
}

export function CaptchaChallenge({
  a, b,
  value, onChange,
  onRefresh,
  label, placeholder,
  isError,
}: CaptchaChallengeProps) {
  const canvasA = useRef<HTMLCanvasElement>(null)
  const canvasB = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    if (canvasA.current) drawDigit(canvasA.current, a)
    if (canvasB.current) drawDigit(canvasB.current, b)
  }, [a, b])

  useEffect(() => { draw() }, [draw])

  return (
    <div className="space-y-2">
      <label className="block text-xs font-mono text-[--color-text-muted] uppercase tracking-wider">
        {label}
      </label>

      <div className="flex items-center gap-2 xs:gap-3">
        {/* Canvas A */}
        <canvas
          ref={canvasA}
          width={DIGIT_W}
          height={DIGIT_H}
          className="rounded shrink-0 w-11 h-14 xs:w-13 xs:h-16"
          aria-hidden="true"
        />

        {/* Plus sign */}
        <span className="font-mono text-lg text-[--color-text-muted] select-none">+</span>

        {/* Canvas B */}
        <canvas
          ref={canvasB}
          width={DIGIT_W}
          height={DIGIT_H}
          className="rounded shrink-0 w-11 h-14 xs:w-13 xs:h-16"
          aria-hidden="true"
        />

        {/* Equals sign */}
        <span className="font-mono text-lg text-[--color-text-muted] select-none">=</span>

        {/* Answer input */}
        <input
          type="number"
          min={0}
          max={18}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className={`w-14 xs:w-20 bg-[--color-surface-2] border rounded px-3 py-2 font-mono text-sm text-[--color-text] text-center outline-none transition-colors placeholder:text-[--color-text-muted] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            isError
              ? 'border-[--color-danger] focus:border-[--color-danger]'
              : 'border-[--color-border] focus:border-[--color-primary]'
          }`}
        />

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh captcha"
          className="shrink-0 text-[--color-text-muted] hover:text-[--color-accent] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
