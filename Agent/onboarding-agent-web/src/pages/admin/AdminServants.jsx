import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { Badge } from '../../components/ui/Badge'
import { VerifiedBadge } from '../../components/ui/VerifiedBadge'
import { Button } from '../../components/ui/Button'
import {
  PageHeader,
  StatCard,
  Avatar,
  FilterBar,
  SelectFilter,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
} from '../../components/admin/adminUi'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['VERIFIED', 'Verified'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
  ['REJECTED', 'Rejected'],
]

export default function AdminServants() {
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-servants', status],
    queryFn: async () => {
      const res = await api.get('/admin/caregivers', {
        params: { status: status || undefined },
      })
      return res.data.data.caregivers
    },
  })

  const servants = data || []

  const stats = useMemo(() => {
    const verified = servants.filter((s) => s.verificationStatus === 'VERIFIED').length
    const pending = servants.filter((s) =>
      ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
    ).length
    const avgRating =
      servants.length > 0
        ? (
            servants.reduce((sum, s) => sum + (s.rating || 0), 0) / servants.length
          ).toFixed(1)
        : '—'
    return { total: servants.length, verified, pending, avgRating }
  }, [servants])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servants"
        description="Every helper on the platform — agent-onboarded and app registrations."
        action={
          <Link to="/caregivers/new">
            <Button variant="gradient">+ Onboard servant</Button>
          </Link>
        }
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total servants" value={stats.total} />
          <StatCard label="Verified" value={stats.verified} accent="text-emerald-600" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
          <StatCard
            label="Avg. rating"
            value={stats.avgRating === '—' ? '—' : `${stats.avgRating} ★`}
            accent="text-secondary"
          />
        </div>
      )}

      <FilterBar
        count={servants.length}
        countLabel={servants.length === 1 ? 'servant' : 'servants'}
      >
        <SelectFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={4} rows={5} />
      ) : servants.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No servants found"
          description="Change the status filter or onboard a new helper."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {servants.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={s.user?.name} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/caregivers/${s.id}`}
                          className="font-semibold text-primary hover:text-secondary"
                        >
                          {s.user?.name}
                        </Link>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-sm text-on-surface-variant">
                        Coordinator: {s.coordinator?.user?.name || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {(s.rating ?? 0).toFixed(1)} ★
                  </span>
                  {s.skills?.length > 0 && (
                    <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs text-on-surface-variant">
                      {s.skills.length} skill{s.skills.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <Link
                  to={`/caregivers/${s.id}`}
                  className="mt-4 block w-full rounded-xl bg-primary/10 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/15"
                >
                  View profile
                </Link>
              </MobileCard>
            ))}
          </div>

          <DataTable columns={['Servant', 'Agent', 'Status', 'Rating', '']}>
            {servants.map((s) => (
              <TableRow key={s.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user?.name} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/caregivers/${s.id}`}
                          className="font-semibold text-primary hover:text-secondary"
                        >
                          {s.user?.name}
                        </Link>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      {s.skills?.length > 0 && (
                        <p className="mt-0.5 text-xs text-on-surface-variant">
                          {s.skills
                            .slice(0, 2)
                            .map((sk) => sk.skillName.replace(/_/g, ' '))
                            .join(', ')}
                          {s.skills.length > 2 ? ` +${s.skills.length - 2}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {s.coordinator?.user?.name ? (
                    <span className="font-medium">{s.coordinator.user.name}</span>
                  ) : (
                    <span className="text-on-surface-variant">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    {(s.rating ?? 0).toFixed(1)} ★
                  </span>
                </td>
                <td className="px-4 py-4">
                  <Link
                    to={`/caregivers/${s.id}`}
                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                  >
                    View
                  </Link>
                </td>
              </TableRow>
            ))}
          </DataTable>
        </>
      )}
    </div>
  )
}
