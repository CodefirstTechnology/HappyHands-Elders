/** API origin for static uploads (paths like /uploads/...). */
export function getApiOrigin() {
  const host = import.meta.env.VITE_API_HOST
  if (host) {
    try {
      return new URL(host).origin
    } catch {
      return host.replace(/\/$/, '')
    }
  }
  const base =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  try {
    return new URL(base).origin
  } catch {
    return 'http://localhost:5000'
  }
}

/** Full URL for a stored upload path or absolute URL. */
export function uploadUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  // Dev: same-origin via Vite proxy (/uploads → API) — avoids CORP blocking
  if (import.meta.env.DEV) return normalized
  return `${getApiOrigin()}${normalized}`
}
