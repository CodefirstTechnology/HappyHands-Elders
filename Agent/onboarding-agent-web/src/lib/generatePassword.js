/** Client-side preview password; server can also generate on verify. */
export function generateServantPassword() {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `St${hex}1`
}
