import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { uploadUrl } from '../lib/mediaUrl'
import {
  buildReportFromServant,
  downloadOnboardingReport,
  printOnboardingReport,
} from '../lib/onboardingReport'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { LocationIcon } from '../components/icons/LocationIcon'
import { SourceBadge } from '../components/ui/SourceBadge'
import { Button } from '../components/ui/Button'
import { ApprovePasswordModal } from '../components/ApprovePasswordModal'
import { SetLoginPasswordCard } from '../components/SetLoginPasswordCard'
import { BankDetailsReview } from '../components/BankDetailsFields'
import { AadhaarXmlVerify } from '../components/AadhaarXmlVerify'
import { isValidIfscFormat, lookupIfsc } from '../lib/ifscLookup'

const parseWorkingDays = (wd) => {
  if (!wd) return []
  if (Array.isArray(wd)) return wd
  try {
    const parsed = JSON.parse(wd)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(wd)
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
  }
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-white/80 p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-primary">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, children, action }) {
  return (
    <section className="glass-card p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function DetailRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2">
      <span className="mt-0.5 text-lg opacity-70" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium text-on-surface-variant">{label}</p>
        <p className="text-sm font-medium text-on-background">{value}</p>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6">
      <div className="h-8 w-40 rounded-lg bg-surface-container" />
      <div className="glass-card h-48" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-container" />
        ))}
      </div>
    </div>
  )
}

export default function ServantDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromRegistrations = searchParams.get('from') === 'registrations'
  const qc = useQueryClient()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)
  const [reason, setReason] = useState('')
  const [idModal, setIdModal] = useState(false)
  const [ifscMeta, setIfscMeta] = useState({ bank: '', branch: '' })

  const { data: servant, isLoading } = useQuery({
    queryKey: ['caregiver', id],
    queryFn: async () => {
      const res = await api.get(`/coordinator/caregivers/${id}`)
      return res.data.data.caregiver
    },
  })

  const verify = async (status, rejectionReason, opts = {}) => {
    try {
      const res = await api.patch(`/coordinator/caregivers/${id}/verify`, {
        status,
        reason: rejectionReason,
        ...(opts.password ? { password: opts.password } : {}),
        ...(opts.generatePassword ? { generatePassword: true } : {}),
      })
      qc.invalidateQueries({ queryKey: ['caregiver', id] })
      qc.invalidateQueries({ queryKey: ['coordinator-servants'] })
      qc.invalidateQueries({ queryKey: ['coordinator-registrations'] })
      setRejectOpen(false)
      setApproveOpen(false)
      if (res.data?.data?.credentials) {
        setCredentials(res.data.data.credentials)
      }
      return res
    } catch (err) {
      const msg = err.response?.data?.message || 'Action failed'
      window.alert(msg)
      throw err
    }
  }

  useEffect(() => {
    const code = servant?.bankIfsc
    if (!code || !isValidIfscFormat(code)) {
      setIfscMeta({ bank: '', branch: '' })
      return
    }
    let cancelled = false
    lookupIfsc(code).then((result) => {
      if (cancelled || !result.ok) return
      const branch = [result.branch, result.city].filter(Boolean).join(' · ')
      setIfscMeta({ bank: result.bank || '', branch })
    })
    return () => {
      cancelled = true
    }
  }, [servant?.bankIfsc])

  const isAppRegistration =
    servant?.registrationSource === 'SELF' || servant?.user?.isActive === false

  const handleApproveClick = async () => {
    if (!servant?.aadhaarVerified) {
      window.alert(
        'Aadhaar verification is required before approval.\n\nScroll to the Aadhaar section, upload the Offline e-KYC ZIP from myAadhaar, then try Approve again.',
      )
      return
    }
    if (isAppRegistration && !servant?.user?.coordinatorSetPassword) {
      setApproveOpen(true)
      return
    }
    if (isAppRegistration && servant?.user?.coordinatorSetPassword) {
      if (window.confirm('Approve this helper? They can sign in with the password you already set.')) {
        await verify('VERIFIED')
      }
      return
    }
    if (window.confirm('Approve this caregiver?')) {
      await verify('VERIFIED')
    }
  }

  const handleApproveWithPassword = async (opts) => {
    setApproveLoading(true)
    try {
      await verify('VERIFIED', undefined, opts)
    } catch (err) {
      const msg = err.response?.data?.message || 'Approval failed'
      window.alert(msg)
    } finally {
      setApproveLoading(false)
    }
  }

  if (isLoading) return <LoadingSkeleton />
  if (!servant) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <p className="text-lg font-semibold text-primary">Servant not found</p>
        <Link to="/caregivers" className="mt-4 inline-block text-sm text-secondary hover:underline">
          ← Back to servants
        </Link>
      </div>
    )
  }

  const canReview = ['PENDING', 'UNDER_REVIEW'].includes(
    servant.verificationStatus,
  )
  const workingDays = parseWorkingDays(servant.workingDays)
  const bookings = servant.bookings || []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={fromRegistrations ? '/registrations' : '/caregivers'}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <span aria-hidden>←</span>{' '}
          {fromRegistrations ? 'Back to app registrations' : 'Back to servants'}
        </Link>
        <Link to={`/caregivers/${id}/edit`}>
          <Button variant="secondary">Edit profile</Button>
        </Link>
      </div>

      {/* Profile hero */}
      <div className="glass-card overflow-hidden">
        <div
          className="h-28 bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)]"
          aria-hidden
        />
        <div className="relative px-6 pb-6 sm:px-8">
          <div className="-mt-14 flex flex-col gap-6 sm:flex-row sm:items-end">
            {servant.profilePhoto ? (
              <img
                src={uploadUrl(servant.profilePhoto)}
                alt=""
                className="h-28 w-28 shrink-0 rounded-2xl border-4 border-white object-cover shadow-lg ring-2 ring-primary/10"
              />
            ) : (
              <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-primary-fixed text-3xl font-bold text-primary shadow-lg">
                {servant.user.name[0]}
              </div>
            )}
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">
                  {servant.user.name}
                </h1>
                {servant.verificationStatus === 'VERIFIED' ? (
                  <VerifiedBadge size="md" />
                ) : (
                  <Badge status={servant.verificationStatus} />
                )}
                <SourceBadge source={servant.registrationSource} />
              </div>
              <p
                className="text-on-surface-variant"
                style={{ paddingTop: 20 }}
              >
                {servant.bio || 'No bio added yet'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                  ✉ {servant.user.email}
                </span>
                {servant.user.phone && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                    📞 {servant.user.phone}
                  </span>
                )}
                {servant.address && (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface-variant">
                    <LocationIcon size={13} className="text-secondary" />
                    {servant.address}
                  </span>
                )}
                {servant.idProofType && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-3 py-1 text-xs font-medium text-primary">
                    🪪 {servant.idProofType.replace(/_/g, ' ')}
                  </span>
                )}
                {servant.aadhaarVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    ✓ Aadhaar verified
                  </span>
                ) : null}
                {servant.phoneVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                    ✓ Mobile verified
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Experience"
              value={servant.experience != null ? `${servant.experience} yrs` : '—'}
            />
            <StatCard
              label="Hourly"
              value={
                servant.hourlyRate != null ? `₹${servant.hourlyRate}` : '—'
              }
              sub="per session hour"
            />
            <StatCard
              label="Monthly"
              value={
                servant.monthlyRate != null ? `₹${servant.monthlyRate}` : '—'
              }
              sub="full-time rate"
            />
            <StatCard
              label="Daily hours"
              value={
                servant.hoursPerDay != null ? `${servant.hoursPerDay} hrs` : '—'
              }
              sub="monthly plan"
            />
          </div>

          {/* Skills */}
          <SectionCard title="Skills & service areas">
            <div className="flex flex-wrap gap-2">
              {servant.skills?.length ? (
                servant.skills.map((s) => (
                  <span
                    key={s.id}
                    className="rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 px-3 py-1.5 text-xs font-semibold text-primary"
                  >
                    {s.skillName.replace(/_/g, ' ')}
                  </span>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant">No skills listed</p>
              )}
            </div>
            <div className="mt-4 border-t border-outline-variant/30 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                Service zones
              </p>
              {servant.zones?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {servant.zones.map((z) => (
                    <span
                      key={z.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant"
                    >
                      <LocationIcon size={12} className="text-secondary" />
                      {z.name}
                      {z.city ? ` · ${z.city}` : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  No zones yet.{' '}
                  <Link to={`/caregivers/${id}/edit`} className="text-primary underline">
                    Add service zones
                  </Link>
                </p>
              )}
            </div>
          </SectionCard>

          {/* Availability */}
          <SectionCard title="Availability">
            <div className="grid gap-4 sm:grid-cols-2">
              {servant.offersSession !== false && (
                <div className="rounded-xl bg-surface-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Session bookings
                  </p>
                  <DetailRow
                    icon="🕐"
                    label="Hours"
                    value={
                      servant.availableFrom && servant.availableTo
                        ? `${servant.availableFrom} – ${servant.availableTo}`
                        : null
                    }
                  />
                </div>
              )}
              {servant.offersMonthly !== false && (
                <div className="rounded-xl bg-surface-low p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Monthly bookings
                  </p>
                  <DetailRow
                    icon="📅"
                    label="Working days"
                    value={workingDays.length ? workingDays.join(', ') : null}
                  />
                  <DetailRow
                    icon="⏱"
                    label="Hours per day"
                    value={
                      servant.hoursPerDay != null
                        ? `${servant.hoursPerDay} hours`
                        : null
                    }
                  />
                </div>
              )}
            </div>
            {servant.availabilityNotes && (
              <p className="mt-4 rounded-xl border border-outline-variant/30 bg-white/60 p-3 text-sm text-on-surface-variant">
                {servant.availabilityNotes}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Aadhaar verification">
            <AadhaarXmlVerify caregiverId={id} servant={servant} compact />
          </SectionCard>

          <SectionCard title="Bank details">
            <BankDetailsReview
              form={{
                bankAccountHolder: servant.bankAccountHolder,
                bankAccountNumber: servant.bankAccountNumber,
                bankName: servant.bankName || ifscMeta.bank,
                bankIfsc: servant.bankIfsc,
                bankUpiId: servant.bankUpiId,
              }}
              maskAccount
              ifscBranch={ifscMeta.branch}
            />
          </SectionCard>

          {/* Bookings */}
          <SectionCard
            title="Booking history"
            action={
              <span className="text-xs font-medium text-on-surface-variant">
                {bookings.length} total
              </span>
            }
          >
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant/50 bg-surface-low/50 py-12 text-center">
                <p className="text-4xl opacity-40" aria-hidden>
                  📋
                </p>
                <p className="mt-2 font-medium text-on-surface-variant">
                  No bookings yet
                </p>
                <p className="mt-1 text-sm text-on-surface-variant/80">
                  Bookings will appear here once house owners hire this servant.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 bg-surface-low text-left text-xs uppercase tracking-wide text-on-surface-variant">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Owner</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-low/80"
                      >
                        <td className="px-4 py-3 font-medium">
                          {new Date(b.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {b.parent?.user?.name || '—'}
                        </td>
                        <td className="px-4 py-3 capitalize text-on-surface-variant">
                          {b.bookingType?.toLowerCase()}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {isAppRegistration ? (
            <SetLoginPasswordCard
              caregiverId={id}
              email={servant.user.email}
              passwordAlreadySet={!!servant.user.coordinatorSetPassword}
              onSaved={() => qc.invalidateQueries({ queryKey: ['caregiver', id] })}
            />
          ) : null}

          <section className="glass-card p-6">
            <h3 className="text-lg font-semibold text-primary">Verification</h3>
            <div className="mt-4 space-y-3">
              {servant.verificationStatus === 'VERIFIED' ? (
                <VerifiedBadge size="md" />
              ) : (
                <Badge status={servant.verificationStatus} />
              )}
              {servant.verifiedAt && (
                <p className="text-sm text-on-surface-variant">
                  Verified on{' '}
                  <span className="font-medium text-on-background">
                    {new Date(servant.verifiedAt).toLocaleString('en-IN')}
                  </span>
                </p>
              )}
              {servant.rejectionReason && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-error">
                  {servant.rejectionReason}
                </p>
              )}
            </div>

            <div className="mt-6 space-y-2 border-t border-outline-variant/30 pt-6">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => downloadOnboardingReport(buildReportFromServant(servant))}
              >
                ↓ Download onboarding report
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => printOnboardingReport(buildReportFromServant(servant))}
              >
                Print / Save as PDF
              </Button>
            </div>

            {canReview && (
              <div className="space-y-2">
                {!servant.aadhaarVerified ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <strong>Aadhaar required.</strong> Complete Aadhaar verification in the section
                    below before you can approve this caregiver.
                  </div>
                ) : null}
                <Button
                  variant="success"
                  className="w-full"
                  onClick={handleApproveClick}
                  disabled={!servant.aadhaarVerified}
                >
                  ✓ Approve
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => verify('UNDER_REVIEW')}
                >
                  Mark under review
                </Button>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => setRejectOpen(true)}
                >
                  Reject
                </Button>
              </div>
            )}
          </section>

          {servant.idProofUrl && (
            <section className="glass-card p-6">
              <h3 className="text-lg font-semibold text-primary">ID proof</h3>
              <p className="mt-1 text-xs text-on-surface-variant">
                {servant.idProofType?.replace(/_/g, ' ') || 'Document'}
              </p>
              <button
                type="button"
                onClick={() => setIdModal(true)}
                className="group mt-4 block w-full overflow-hidden rounded-xl border border-outline-variant/40 bg-surface-low transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <img
                  src={uploadUrl(servant.idProofUrl)}
                  alt="ID proof preview"
                  className="max-h-48 w-full object-contain transition-transform group-hover:scale-[1.02]"
                />
                <span className="block border-t border-outline-variant/30 bg-white/80 py-2 text-center text-xs font-medium text-primary">
                  Tap to view full size
                </span>
              </button>
            </section>
          )}
        </div>
      </div>

      {idModal && servant.idProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setIdModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="ID proof full size"
        >
          <div
            className="relative max-h-[92vh] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIdModal(false)}
              className="absolute -top-10 right-0 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-primary shadow"
            >
              Close ✕
            </button>
            <img
              src={uploadUrl(servant.idProofUrl)}
              alt="ID proof"
              className="max-h-[85vh] w-full rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      <ApprovePasswordModal
        open={approveOpen}
        servant={servant}
        loading={approveLoading}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApproveWithPassword}
      />

      {credentials && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-emerald-700">Approved — share login details</h4>
            <p className="mt-2 text-sm text-on-surface-variant">
              Give these credentials to the helper so they can sign in to the Servant app.
            </p>
            <div className="mt-4 space-y-2 rounded-lg bg-emerald-50 p-4 text-sm">
              <p>
                <span className="text-on-surface-variant">Email: </span>
                <span className="font-semibold text-primary">{credentials.email}</span>
              </p>
              <p>
                <span className="text-on-surface-variant">Password: </span>
                <span className="font-mono font-semibold text-primary">{credentials.password}</span>
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    `Email: ${credentials.email}\nPassword: ${credentials.password}`,
                  )
                }
              >
                Copy all
              </Button>
              <Button variant="success" className="flex-1" onClick={() => setCredentials(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="glass-card w-full max-w-md p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-primary">Rejection reason</h4>
            <p className="mt-1 text-sm text-on-surface-variant">
              This will be stored and shown to the agent reviewing the profile.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-ghost mt-4 w-full resize-none"
              rows={4}
              placeholder="Explain why this profile was rejected…"
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => verify('REJECTED', reason)}
              >
                Confirm reject
              </Button>
              <Button variant="secondary" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
