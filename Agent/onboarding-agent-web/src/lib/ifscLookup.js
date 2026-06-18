const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/

export function isValidIfscFormat(ifsc) {
  return IFSC_PATTERN.test(String(ifsc || '').trim().toUpperCase())
}

/** Resolve bank + branch from Razorpay's public IFSC API. */
export async function lookupIfsc(ifsc) {
  const code = String(ifsc || '').trim().toUpperCase()
  if (!isValidIfscFormat(code)) {
    return { ok: false, error: 'Enter an 11-character IFSC (e.g. SBIN0001234)' }
  }

  try {
    const res = await fetch(`https://ifsc.razorpay.com/${code}`)
    if (res.status === 404) {
      return { ok: false, error: 'IFSC not found — check the code' }
    }
    if (!res.ok) {
      return { ok: false, error: 'Could not look up IFSC right now' }
    }
    const data = await res.json()
    return {
      ok: true,
      bank: data.BANK || '',
      branch: data.BRANCH || '',
      city: data.CITY || '',
      ifsc: data.IFSC || code,
    }
  } catch {
    return { ok: false, error: 'Network error — enter bank name manually' }
  }
}
