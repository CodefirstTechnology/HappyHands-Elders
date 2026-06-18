import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import api from '../lib/api'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'

const formatRupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export default function Dashboard() {
  const { data: revenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ['coordinator-stats'],
    queryFn: async () => {
      const res = await api.get('/coordinator/stats')
      return res.data.data
    },
  })

  const { data: servants = [], isLoading: loadingServants } = useQuery({
    queryKey: ['coordinator-servants'],
    queryFn: async () => {
      const res = await api.get('/coordinator/caregivers', {
        params: { category: 'onboarded', limit: 100 },
      })
      return res.data.data.caregivers
    },
  })

  const { data: registrations = [], isLoading: loadingRegistrations } = useQuery({
    queryKey: ['coordinator-registrations'],
    queryFn: async () => {
      const res = await api.get('/coordinator/caregivers', {
        params: { category: 'registered', limit: 100 },
      })
      return res.data.data.caregivers
    },
  })

  const pending = servants.filter((s) =>
    ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
  )
  const appRegistrations = registrations
  const pendingApp = appRegistrations.filter((s) =>
    ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
  )
  const verified = servants.filter((s) => s.verificationStatus === 'VERIFIED')
  const rejected = servants.filter((s) => s.verificationStatus === 'REJECTED')

  const year = revenue?.year ?? new Date().getFullYear()

  const stats = [
    {
      label: `Annual revenue (${year})`,
      value: loadingRevenue ? '…' : formatRupee(revenue?.annualRevenue),
      accent: 'text-amber-600',
    },
    {
      label: 'Completed jobs (YTD)',
      value: loadingRevenue ? '…' : (revenue?.annualCompletedBookings ?? 0),
      accent: 'text-emerald-600',
    },
    { label: 'My caregivers', value: servants.length, accent: 'text-primary' },
    {
      label: 'Verified helpers',
      value: loadingRevenue ? '…' : (revenue?.verifiedServants ?? verified.length),
      accent: 'text-emerald-600',
    },
    { label: 'App registrations', value: appRegistrations.length, accent: 'text-violet-600' },
    { label: 'Pending verification', value: pending.length, accent: 'text-tertiary-accent' },
    { label: 'Pending from app', value: pendingApp.length, accent: 'text-violet-600' },
    { label: 'Rejected', value: rejected.length, accent: 'text-error' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-primary">Pipeline overview</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Revenue from completed jobs by your verified helpers in {year}.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((c) => (
          <div key={c.label} className="glass-card p-6">
            <p className="text-sm text-on-surface-variant">{c.label}</p>
            <p className={`mt-2 text-3xl font-bold ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Revenue & completed jobs ({year})
        </h3>
        {loadingRevenue ? (
          <p className="text-sm text-on-surface-variant">Loading revenue…</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenue?.revenueByMonth || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="#1a6b4a"
                name="Completed jobs"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#f5a623"
                name="Revenue (₹)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <h3 className="border-b border-outline-variant/30 bg-surface-container px-6 py-4 text-lg font-semibold text-primary">
          Revenue by helper ({year})
        </h3>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="p-4 font-semibold">Helper</th>
              <th className="p-4 font-semibold">Completed jobs</th>
              <th className="p-4 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loadingRevenue ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-on-surface-variant">
                  Loading…
                </td>
              </tr>
            ) : (revenue?.caregiverRevenue || []).length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-on-surface-variant">
                  No completed jobs from your helpers yet this year.
                </td>
              </tr>
            ) : (
              revenue.caregiverRevenue.map((row) => (
                <tr key={row.caregiverId} className="border-t border-outline-variant/30">
                  <td className="p-4 font-medium">{row.name}</td>
                  <td className="p-4">{row.completedBookings}</td>
                  <td className="p-4 font-semibold text-amber-700">
                    {formatRupee(row.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-violet-900">App registrations (Gmail / email)</h3>
        <Link
          to="/registrations"
          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100"
        >
          Manage all ({appRegistrations.length})
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-violet-100 bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-violet-50 text-on-surface-variant">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Password</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingRegistrations ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  Loading…
                </td>
              </tr>
            ) : pendingApp.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                  No pending app registrations.
                </td>
              </tr>
            ) : (
              pendingApp.slice(0, 8).map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/30">
                  <td className="p-4">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {s.user.name}
                      {s.verificationStatus === 'VERIFIED' ? <VerifiedBadge /> : null}
                    </div>
                  </td>
                  <td className="p-4">{s.user.email}</td>
                  <td className="p-4">
                    {s.user.coordinatorSetPassword ? (
                      <span className="font-medium text-emerald-700">Set</span>
                    ) : (
                      <span className="text-amber-700">Not set</span>
                    )}
                  </td>
                  <td className="p-4">{s.verificationStatus}</td>
                  <td className="p-4">
                    <Link
                      to={`/caregivers/${s.id}?from=registrations`}
                      className="font-semibold text-violet-700 hover:underline"
                    >
                      Set password & review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-primary">My caregivers — pending verification</h3>
        <Link to="/caregivers/new" className="btn-gradient px-6 py-2.5 text-sm">
          Onboard new caregiver
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-on-surface-variant">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Phone</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingServants ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                  Loading…
                </td>
              </tr>
            ) : pending.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                  No pending verifications — great work!
                </td>
              </tr>
            ) : (
              pending.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-t border-outline-variant/30">
                  <td className="p-4">
                    <Link
                      to={`/caregivers/${s.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {s.user.name}
                    </Link>
                  </td>
                  <td className="p-4">{s.user.phone || '—'}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-tertiary-accent/20 px-2.5 py-0.5 text-xs font-semibold text-tertiary">
                      {s.verificationStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      to={`/caregivers/${s.id}`}
                      className="text-secondary font-semibold hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
