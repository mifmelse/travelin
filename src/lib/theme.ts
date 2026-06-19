export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

/**
 * Resolves user preference to an effective theme.
 * - 'light' or 'dark' → applied directly
 * - 'system' → follows the systemPreference argument
 * - any other value → safe-falls back to 'light'
 */
export function resolveTheme(
  preference: ThemePreference,
  systemPreference: ResolvedTheme
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference
  if (preference === 'system') return systemPreference
  return 'light'
}

export const THEME_STORAGE_KEY = 'travelin-theme'
