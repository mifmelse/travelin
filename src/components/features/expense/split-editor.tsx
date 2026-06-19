'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/format'
import { equalShares } from '@/lib/expense-balance'

export type SplitMember = { profile_id: string; display_name: string }
export type SplitValue = { profile_id: string; share_cents: number }

type SplitMode = 'equal' | 'custom'

export function SplitEditor({
  members,
  amountWhole,
  currency,
  defaultSplits,
}: {
  members: SplitMember[]
  amountWhole: number
  currency: string
  defaultSplits?: SplitValue[]
}) {
  const hasDefault = (defaultSplits?.length ?? 0) > 0

  const [enabled, setEnabled] = useState(hasDefault)
  // Open in 'custom' when editing an existing split so the saved shares are
  // preserved verbatim (custom inputs are seeded from defaultSplits below).
  // Defaulting to 'equal' here would silently overwrite a custom split on save.
  const [mode, setMode] = useState<SplitMode>(hasDefault ? 'custom' : 'equal')
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        hasDefault
          ? defaultSplits!.map((s) => s.profile_id)
          : members.map((m) => m.profile_id)
      )
  )
  // Whole-unit strings for custom mode, seeded from any existing splits.
  const [custom, setCustom] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    for (const s of defaultSplits ?? []) {
      seed[s.profile_id] = String(Math.round(s.share_cents / 100))
    }
    return seed
  })

  const selectedMembers = members.filter((m) => selected.has(m.profile_id))

  // Compute each selected member's share in whole units (cheap; runs per render).
  const shares: Record<string, number> = {}
  if (mode === 'equal') {
    const parts = equalShares(amountWhole, selectedMembers.length)
    selectedMembers.forEach((m, i) => {
      shares[m.profile_id] = parts[i] ?? 0
    })
  } else {
    for (const m of selectedMembers) {
      const raw = custom[m.profile_id]
      shares[m.profile_id] = raw && /^\d+$/.test(raw) ? Number(raw) : 0
    }
  }

  const splitsValue: SplitValue[] = enabled
    ? selectedMembers.map((m) => ({
        profile_id: m.profile_id,
        share_cents: (shares[m.profile_id] ?? 0) * 100,
      }))
    : []

  const sumWhole = Object.values(shares).reduce((a, b) => a + b, 0)
  const matches = sumWhole === amountWhole
  const showMismatch = enabled && amountWhole > 0 && !matches

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3 rounded-md border border-input p-3">
      {/* Hidden field consumed by the server action; empty when split is off. */}
      <input
        type="hidden"
        name="splits"
        value={enabled ? JSON.stringify(splitsValue) : ''}
      />

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Bagi pengeluaran ini (split)
      </label>

      {enabled && (
        <>
          <div className="flex gap-2">
            <ModeTab
              active={mode === 'equal'}
              onClick={() => setMode('equal')}
              label="Rata"
            />
            <ModeTab
              active={mode === 'custom'}
              onClick={() => setMode('custom')}
              label="Manual"
            />
          </div>

          <div className="space-y-2">
            {members.map((m) => {
              const isSel = selected.has(m.profile_id)
              return (
                <div
                  key={m.profile_id}
                  className="flex items-center justify-between gap-3"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggleMember(m.profile_id)}
                      className="h-4 w-4 accent-[var(--primary)]"
                    />
                    {m.display_name}
                  </label>

                  {isSel &&
                    (mode === 'custom' ? (
                      <Input
                        aria-label={`Jumlah ${m.display_name}`}
                        inputMode="numeric"
                        value={custom[m.profile_id] ?? ''}
                        onChange={(e) =>
                          setCustom((prev) => ({
                            ...prev,
                            [m.profile_id]: e.target.value,
                          }))
                        }
                        className="h-8 w-28 text-right"
                        placeholder="0"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(
                          (shares[m.profile_id] ?? 0) * 100,
                          currency
                        )}
                      </span>
                    ))}
                </div>
              )
            })}
          </div>

          {showMismatch && (
            <p className="text-sm text-destructive">
              Total split {formatCurrency(sumWhole * 100, currency)} ≠ jumlah{' '}
              {formatCurrency(amountWhole * 100, currency)}
            </p>
          )}
        </>
      )}
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md px-3 py-1 text-sm ' +
        (active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground')
      }
    >
      {label}
    </button>
  )
}
