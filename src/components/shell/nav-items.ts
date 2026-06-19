import { Home, Settings, type LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  icon: LucideIcon
  label: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/settings', icon: Settings, label: 'Settings' },
] as const

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
