import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { uploadUrl } from '../lib/mediaUrl'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { Button } from '../components/ui/Button'
import {
  PageHeader,
  StatCard,
  Avatar,
  FilterBar,
  SelectFilter,
  SearchInput,
  LoadingSkeleton,
  EmptyState,
  DataTable,
  TableRow,
  MobileCard,
  SkillChips,
} from '../components/admin/adminUi'

const CATEGORY_OPTIONS = [
  ['', 'My servants'],
  ['onboarded', 'Agent onboarded'],
]

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
  ['VERIFIED', 'Verified'],
  ['REJECTED', 'Rejected'],
]

function ServantPhoto({ name, profilePhoto }) {
  if (profilePhoto) {
    return (
      <img
        src={uploadUrl(profilePhoto)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm ring-2 ring-white"
      />
    )
  }
  return <Avatar name={name} />
}

export default function ServantList() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')

  useEffect(() => {
    setCategory(searchParams.get('category') || '')
  }, [searchParams])

  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-servants', status, search, category],
    queryFn: async () => {
      const res = await api.get('/coordinator/caregivers', {
        params: {
          status: status || undefined,
          search: search || undefined,
          category: category || undefined,
          limit: 100,
        },
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
    return { total: servants.length, verified, pending }
  }, [servants])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="My caregivers"
        description={
          <>
            Staff you onboarded and verified. App sign-ups live under{' '}
            <Link to="/registrations" className="font-semibold text-secondary hover:underline">
              App registrations
            </Link>
            .
          </>
        }
        action={
          <Link to="/caregivers/new">
            <Button variant="gradient">+ Onboard new caregiver</Button>
          </Link>
        }
      />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Verified" value={stats.verified} accent="text-emerald-600" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
        </div>
      )}

      <FilterBar
        count={servants.length}
        countLabel={servants.length === 1 ? 'caregiver' : 'caregivers'}
      >
        <SelectFilter value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
        <SelectFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name…" />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={3} rows={5} />
      ) : servants.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No servants in this view"
          description="Onboard a new helper or adjust your filters."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {servants.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start gap-3">
                  <ServantPhoto name={s.user.name} profilePhoto={s.profilePhoto} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/caregivers/${s.id}`}
                        className="font-semibold text-primary hover:text-secondary"
                      >
                        {s.user.name}
                      </Link>
                      {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                    </div>
                    <p className="text-sm text-on-surface-variant">{s.user.phone || 'No phone'}</p>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3">
                  <SkillChips skills={s.skills} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Link to={`/caregivers/${s.id}`} className="flex-1">
                    <Button variant="gradient" className="w-full text-sm">
                      View
                    </Button>
                  </Link>
                  <Link to={`/caregivers/${s.id}/edit`} className="flex-1">
                    <Button variant="secondary" className="w-full text-sm">
                      Edit
                    </Button>
                  </Link>
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable columns={['Caregiver', 'Phone', 'Skills', 'Status', 'Actions']}>
            {servants.map((s) => (
              <TableRow key={s.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <ServantPhoto name={s.user.name} profilePhoto={s.profilePhoto} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/caregivers/${s.id}`}
                          className="font-semibold text-primary hover:text-secondary"
                        >
                          {s.user.name}
                        </Link>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                      <p className="text-xs text-on-surface-variant">{s.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{s.user.phone || '—'}</td>
                <td className="px-4 py-4 max-w-[200px]">
                  <SkillChips skills={s.skills} max={2} />
                </td>
                <td className="px-4 py-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Link
                      to={`/caregivers/${s.id}`}
                      className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      View
                    </Link>
                    <Link
                      to={`/caregivers/${s.id}/edit`}
                      className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-low"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </TableRow>
            ))}
          </DataTable>
        </>
      )}
    </div>
  )
}
