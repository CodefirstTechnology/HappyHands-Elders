import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Button } from './ui/Button'
import { uploadUrl } from '../lib/mediaUrl'

function formatDob(value) {
  if (!value) return '—'
  const parts = String(value).split('-')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${d}-${m}-${y}`
  }
  return value
}

export function AadhaarXmlVerify({ caregiverId, servant, compact = false }) {
  const qc = useQueryClient()
  const [zipFile, setZipFile] = useState(null)
  const [shareCode, setShareCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const verified = servant?.aadhaarVerified

  const verify = async () => {
    setError('')
    if (!zipFile) {
      setError('Choose the Aadhaar Offline e-KYC ZIP file')
      return
    }
    if (!/^\d{4}$/.test(shareCode.trim())) {
      setError('Enter the 4-digit share code used when downloading the ZIP')
      return
    }

    const fd = new FormData()
    fd.append('aadhaarZip', zipFile)
    fd.append('shareCode', shareCode.trim())

    setLoading(true)
    try {
      await api.post(`/kyc/aadhaar/xml/verify/${caregiverId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setZipFile(null)
      setShareCode('')
      qc.invalidateQueries({ queryKey: ['caregiver', String(caregiverId)] })
    } catch (e) {
      setError(e.response?.data?.message || 'Aadhaar verification failed')
    } finally {
      setLoading(false)
    }
  }

  if (verified) {
    return (
      <div className={`space-y-3 ${compact ? '' : 'rounded-xl border border-emerald-200 bg-emerald-50 p-4'}`}>
        <p className="text-sm font-semibold text-emerald-800">✓ Aadhaar verified (UIDAI Offline XML)</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-subtext">Name</dt>
            <dd className="font-medium">{servant.aadhaarVerifiedName || '—'}</dd>
          </div>
          <div>
            <dt className="text-subtext">DOB</dt>
            <dd className="font-medium">{formatDob(servant.aadhaarVerifiedDob)}</dd>
          </div>
          <div>
            <dt className="text-subtext">Gender</dt>
            <dd className="font-medium">{servant.aadhaarVerifiedGender || '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-subtext">Address</dt>
            <dd className="font-medium">{servant.aadhaarVerifiedAddress || '—'}</dd>
          </div>
          {servant.aadhaarReferenceId ? (
            <div className="sm:col-span-2">
              <dt className="text-subtext">Reference ID</dt>
              <dd className="font-medium">{servant.aadhaarReferenceId}</dd>
            </div>
          ) : null}
          {servant.aadhaarNameMatch != null ? (
            <div>
              <dt className="text-subtext">Name match</dt>
              <dd className="font-medium">
                {servant.aadhaarNameMatch ? 'Matches profile' : 'Mismatch — review'}
              </dd>
            </div>
          ) : null}
        </dl>
        {servant.aadhaarPhotoUrl ? (
          <img
            src={uploadUrl(servant.aadhaarPhotoUrl)}
            alt="Aadhaar photo"
            className="h-24 w-24 rounded-lg object-cover"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${compact ? '' : 'rounded-xl bg-surface p-6 shadow-sm'}`}>
      {!compact ? <h3 className="font-semibold">Aadhaar verification (Offline XML)</h3> : null}
      <ol className="list-decimal space-y-1 pl-5 text-sm text-subtext">
        <li>
          Open{' '}
          <a
            href="https://myaadhaar.uidai.gov.in/offline-ekyc"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            myAadhaar Offline e-KYC
          </a>
        </li>
        <li>Login with Aadhaar OTP and download the ZIP</li>
        <li>Create a 4-digit share code and remember it</li>
        <li>Upload the ZIP and share code below</li>
      </ol>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Aadhaar ZIP file</span>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => setZipFile(e.target.files?.[0] || null)}
          className="w-full text-sm"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Share code (4 digits)</span>
        <input
          placeholder="e.g. 1234"
          inputMode="numeric"
          maxLength={4}
          value={shareCode}
          onChange={(e) => setShareCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <Button onClick={verify} disabled={loading}>
        {loading ? 'Verifying…' : 'Verify Aadhaar'}
      </Button>
    </div>
  )
}
