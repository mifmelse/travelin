/**
 * Returns `value` only if it is a safe, local (relative) path that begins with a
 * single "/". Rejects protocol-relative ("//host"), absolute URLs, and any
 * non-string. Used to guard post-login redirects against open-redirect attacks.
 */
export function safeRelativePath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!/^\/(?!\/)/.test(value)) return null
  return value
}
