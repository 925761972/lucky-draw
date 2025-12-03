export function uid(prefix = ''): string {
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  const hex = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('')
  return prefix ? `${prefix}_${hex}` : hex
}