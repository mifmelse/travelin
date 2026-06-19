export function avatarInitials(name: string | null | undefined): string {
  if (!name) return '?'
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const words = trimmed.split(/\s+/).slice(0, 2)
  return words.map((w) => w[0]!.toUpperCase()).join('')
}
