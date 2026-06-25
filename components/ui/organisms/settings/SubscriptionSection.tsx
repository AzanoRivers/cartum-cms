'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Zap, CalendarDays, Infinity } from 'lucide-react'
import type { Dictionary } from '@/locales/en'

export type SubscriptionSectionProps = {
  d: Dictionary['settings']['subscription']
}

type PlanKey = 'monthly' | 'sub' | 'annual'

interface Plan {
  key:       PlanKey
  icon:      React.ReactNode
  title:     string
  badge:     string
  badgeKind: 'neutral' | 'popular' | 'best'
  desc:      string
  price:     string
  per:       string
  sub?:      string
  save?:     string
}

export function SubscriptionSection({ d }: SubscriptionSectionProps) {
  const [selected,      setSelected]      = useState<PlanKey>('annual')
  const [glitchVisible, setGlitchVisible] = useState(false)
  const [glitchKey,     setGlitchKey]     = useState(0)

  const plans: Plan[] = [
    {
      key:       'monthly',
      icon:      <CalendarDays size={16} strokeWidth={1.6} />,
      title:     d.monthlyTitle,
      badge:     d.monthlyBadge,
      badgeKind: 'neutral',
      desc:      d.monthlyDesc,
      price:     d.monthlyPrice,
      per:       d.monthlyPer,
    },
    {
      key:       'sub',
      icon:      <Zap size={16} strokeWidth={1.6} />,
      title:     d.subTitle,
      badge:     d.subBadge,
      badgeKind: 'popular',
      desc:      d.subDesc,
      price:     d.subPrice,
      per:       d.subPer,
      save:      d.subSave,
    },
    {
      key:       'annual',
      icon:      <Infinity size={16} strokeWidth={1.6} />,
      title:     d.annualTitle,
      badge:     d.annualBadge,
      badgeKind: 'best',
      desc:      d.annualDesc,
      price:     d.annualPrice,
      per:       d.annualPer,
      sub:       d.annualPerMonth,
      save:      d.annualSave,
    },
  ]

  function handleStart() {
    setGlitchKey((k) => k + 1)
    setGlitchVisible(true)
  }

  useEffect(() => {
    if (!glitchVisible) return
    const t = setTimeout(() => setGlitchVisible(false), 3100)
    return () => clearTimeout(t)
  }, [glitchVisible, glitchKey])

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="space-y-0.5">
        <h2 className="font-mono text-sm font-semibold text-text">{d.title}</h2>
      </div>

      {/* Description card */}
      <div className="rounded-xl border border-border bg-surface-2/40 px-4 py-3.5 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles size={15} strokeWidth={1.8} />
        </span>
        <p className="font-mono text-[11px] leading-relaxed text-muted pt-1">
          {d.description}
        </p>
      </div>

      {/* "Gracias :)!" */}
      <div className="flex flex-col items-center gap-1 py-2">
        <p className="font-mono text-[28px] font-bold leading-none tracking-tight select-none">
          <span className="cartum-neon-rainbow">{d.thanks} :)!</span>
        </p>
        <p className="font-mono text-[10px] text-muted/60 uppercase tracking-widest">
          AzanoLabs · AzanoRivers
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map((plan) => (
          <PricingCard
            key={plan.key}
            plan={plan}
            selected={selected === plan.key}
            onSelect={() => setSelected(plan.key)}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="relative flex flex-col items-center pt-1">
        {glitchVisible && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3">
            <div
              key={glitchKey}
              data-text={`⚠ ${d.wip}`}
              className="glitch-vhs-msg font-mono text-xs border border-warning/40 bg-surface text-warning px-4 py-2 rounded-md tracking-wide whitespace-nowrap"
            >
              ⚠ {d.wip}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          className="rounded-lg bg-primary px-8 py-2.5 font-mono text-sm font-semibold text-white transition-all hover:bg-primary/80 active:scale-95 cursor-pointer"
        >
          {d.startBtn}
        </button>
      </div>
    </div>
  )
}

/* ── Pricing card sub-component ── */

type PricingCardProps = {
  plan:     Plan
  selected: boolean
  onSelect: () => void
}

function PricingCard({ plan, selected, onSelect }: PricingCardProps) {
  const badgeCls = {
    neutral: 'border-border/60 text-muted bg-surface-2/60',
    popular: 'border-accent/40 text-accent bg-accent/8',
    best:    'border-success/40 text-success bg-success/8',
  }[plan.badgeKind]

  const borderCls = selected
    ? plan.badgeKind === 'best'
      ? 'border-success/60 ring-1 ring-success/20'
      : plan.badgeKind === 'popular'
        ? 'border-accent/60 ring-1 ring-accent/20'
        : 'border-primary/60 ring-1 ring-primary/20'
    : 'border-border hover:border-border/80'

  const iconCls = {
    neutral: 'text-muted bg-surface-2',
    popular: 'text-accent bg-accent/10',
    best:    'text-success bg-success/10',
  }[plan.badgeKind]

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer bg-surface-2/30 hover:bg-surface-2/50 ${borderCls}`}
    >
      {/* Selected dot */}
      <span className={`absolute right-3 top-3 h-2 w-2 rounded-full transition-all ${selected ? 'bg-primary scale-110' : 'bg-border'}`} />

      {/* Icon + badge */}
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${iconCls}`}>
          {plan.icon}
        </span>
        <span className={`font-mono text-[10px] rounded-full border px-2 py-0.5 ${badgeCls}`}>
          {plan.badge}
        </span>
      </div>

      {/* Title */}
      <p className="font-mono text-xs font-semibold text-text">{plan.title}</p>

      {/* Price */}
      <div className="space-y-0.5">
        <div className="flex items-end gap-1 leading-none">
          <span className="font-mono text-2xl font-bold text-text">{plan.price}</span>
          <span className="font-mono text-[10px] text-muted pb-0.5">{plan.per}</span>
        </div>
        {plan.sub && (
          <p className="font-mono text-[10px] text-muted/70">{plan.sub}</p>
        )}
      </div>

      {/* Description */}
      <p className="font-mono text-[10px] leading-relaxed text-muted/80">{plan.desc}</p>

      {/* Save badge */}
      {plan.save && (
        <span className={`self-start font-mono text-[10px] font-semibold rounded px-2 py-0.5 ${
          plan.badgeKind === 'best'
            ? 'bg-success/12 text-success'
            : 'bg-accent/10 text-accent'
        }`}>
          {plan.save}
        </span>
      )}
    </button>
  )
}
