'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme'
import { cn } from '@/lib/utils'

function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(preference: ThemePreference) {
  const resolved = resolveTheme(preference, getSystemPreference())
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

// Module-level listener registry for the storage external store.
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
function notify() {
  listeners.forEach((l) => l())
}

export function ThemeToggle({ className }: { className?: string }) {
  // useSyncExternalStore gives us SSR-safe, hydration-correct reads from
  // localStorage without setState-in-effect.
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => 'system'
  )

  // React to OS-level changes when preference is 'system'
  useEffect(() => {
    if (preference !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [preference])

  const cycle = useCallback(() => {
    const prev = readPreference()
    const next: ThemePreference =
      prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
    window.localStorage.setItem(THEME_STORAGE_KEY, next)
    applyTheme(next)
    notify()
  }, [])

  // Server / pre-hydration snapshot is always 'system'. Show a stable
  // placeholder icon so SSR markup matches client first paint.
  const Icon =
    preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor
  const label =
    preference === 'light'
      ? 'Tema: terang'
      : preference === 'dark'
        ? 'Tema: gelap'
        : 'Tema: ikut sistem'

  return (
    <button
      type="button"
      onClick={cycle}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        className
      )}
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}
