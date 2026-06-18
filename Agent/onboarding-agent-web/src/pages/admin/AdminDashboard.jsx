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
import api from '../../lib/api'
import { LocationIcon } from '../../components/icons/LocationIcon'
import { Badge } from '../../components/ui/Badge'

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats')
      return res.data.data
    },
  })

  const { data: agents } = useQuery({
    queryKey: ['admin-coordinators-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/coordinators', { params: { limit: 10 } })
      return res.data.data.coordinators
    },
  })

  const { data: bookings } = useQuery({
    queryKey: ['admin-bookings-recent'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings', { params: { limit: 10 } })
      return res.data.data.bookings
    },
  })

  if (isLoading) return <p>Loading…</p>

  const cards = [
    { label: 'Total Parents', value: stats.totalParents },
    { label: 'Coordinators', value: stats.totalCoordinators },
    { label: 'Total Caregivers', value: stats.totalCaregivers },
    { label: 'Verified Caregivers', value: stats.verifiedCaregivers },
    { label: 'Total Bookings', value: stats.totalBookings },
    { label: 'Active Bookings', value: stats.activeBookings },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue?.toLocaleString()}` },
  ]

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-surface p-6 shadow-sm">
            <p className="text-sm text-subtext">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Bookings & Revenue (12 months)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={stats.bookingsByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="count" stroke="#1a6b4a" name="Bookings" />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#f5a623" name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-semibold">Field agents by area</h3>
          <Link to="/admin/agents" className="text-sm text-primary underline">
            Manage agents
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-subtext">
              <th className="pb-2">Agent</th>
              <th className="pb-2">Agency</th>
              <th className="pb-2">Area</th>
              <th className="pb-2">Servants</th>
              <th className="pb-2">Annual revenue</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(agents || []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-subtext">
                  No agents yet.{' '}
                  <Link to="/admin/agents" className="text-primary underline">
                    Add the first agent
                  </Link>
                </td>
              </tr>
            ) : (
              (agents || []).map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">
                    <p>{a.user.name}</p>
                    <p className="text-xs text-subtext">{a.user.email}</p>
                  </td>
                  <td>{a.agencyName || '—'}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <LocationIcon size={14} className="text-secondary" />
                      <p>{a.city || a.address || '—'}</p>
                    </div>
                  </td>
                  <td>{a._count?.caregivers ?? 0}</td>
                  <td className="font-medium text-amber-700">
                    ₹{(a.annualRevenue ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td>{a.user.isActive ? 'Active' : 'Inactive'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-surface p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Recent bookings</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-subtext">
              <th className="pb-2">Owner</th>
              <th className="pb-2">Servant</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(bookings || []).map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.parent?.user?.name}</td>
                <td>{b.caregiver?.user?.name}</td>
                <td>{b.bookingType}</td>
                <td>
                  <Badge status={b.status} />
                </td>
                <td>₹{b.totalAmount || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
