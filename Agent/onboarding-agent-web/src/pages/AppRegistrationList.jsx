import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Badge } from '../components/ui/Badge'
import { VerifiedBadge } from '../components/ui/VerifiedBadge'
import { Button } from '../components/ui/Button'
import { SetPasswordModal } from '../components/SetPasswordModal'
import { CredentialsBanner } from '../components/CredentialsBanner'
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
  InfoBanner,
  PasswordPill,
} from '../components/admin/adminUi'

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['PENDING', 'Pending'],
  ['UNDER_REVIEW', 'Under review'],
]

export default function AppRegistrationList() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-registrations', status, search],
    queryFn: async () => {
      const res = await api.get('/coordinator/caregivers', {
        params: {
          category: 'registered',
          status: status || undefined,
          search: search || undefined,
          limit: 100,
        },
      })
      return {
        caregivers: res.data.data.caregivers,
        locationNotice: res.data.data.locationNotice,
      }
    },
  })

  const rows = data?.caregivers || []
  const locationNotice = data?.locationNotice

  const stats = useMemo(() => {
    const pending = rows.filter((s) =>
      ['PENDING', 'UNDER_REVIEW'].includes(s.verificationStatus),
    ).length
    const needPassword = rows.filter((s) => !s.user.coordinatorSetPassword).length
    return { total: rows.length, pending, needPassword }
  }, [rows])

  const savePassword = async ({ password }) => {
    if (!passwordTarget) return
    setPasswordLoading(true)
    try {
      const res = await api.patch(`/coordinator/caregivers/${passwordTarget.id}/password`, {
        password,
      })
      qc.invalidateQueries({ queryKey: ['coordinator-registrations'] })
      qc.invalidateQueries({ queryKey: ['caregiver', String(passwordTarget.id)] })
      setCredentials(res.data?.data?.credentials || null)
      setPasswordTarget(null)
    } catch (e) {
      window.alert(e.response?.data?.message || 'Failed to save password')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="App registrations"
        description="Helpers who signed up in the Servant app within your agency service radius."
        action={
          <Link to="/caregivers">
            <Button variant="secondary">My servants</Button>
          </Link>
        }
      />

      <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />

      {locationNotice && <InfoBanner variant="violet">{locationNotice}</InfoBanner>}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Registrations" value={stats.total} accent="text-violet-700" />
          <StatCard label="Pending review" value={stats.pending} accent="text-amber-600" />
          <StatCard
            label="Need password"
            value={stats.needPassword}
            accent="text-secondary"
            sub="Set login before approval"
          />
        </div>
      )}

      <FilterBar
        count={rows.length}
        countLabel={rows.length === 1 ? 'registration' : 'registrations'}
      >
        <SelectFilter value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or email…"
        />
      </FilterBar>

      {isLoading ? (
        <LoadingSkeleton cards={3} rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="📱"
          title="No app registrations yet"
          description="Set your agency location and radius in Profile to receive nearby sign-ups."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {rows.map((s) => (
              <MobileCard key={s.id}>
                <div className="flex items-start gap-3">
                  <Avatar name={s.user.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-primary">{s.user.name}</p>
                      {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                    </div>
                    <p className="truncate text-sm text-on-surface-variant">{s.user.email}</p>
                    <p className="text-sm text-on-surface-variant">{s.user.phone || 'No phone'}</p>
                  </div>
                  <Badge status={s.verificationStatus} />
                </div>
                <div className="mt-3">
                  <PasswordPill set={s.user.coordinatorSetPassword} />
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="gradient"
                    className="flex-1 text-sm"
                    onClick={() => setPasswordTarget(s)}
                  >
                    {s.user.coordinatorSetPassword ? 'Change password' : 'Set password'}
                  </Button>
                  <Link to={`/caregivers/${s.id}?from=registrations`} className="flex-1">
                    <Button variant="secondary" className="w-full text-sm">
                      Review
                    </Button>
                  </Link>
                </div>
              </MobileCard>
            ))}
          </div>

          <DataTable
            columns={['Applicant', 'Contact', 'Password', 'Status', 'Actions']}
          >
            {rows.map((s) => (
              <TableRow key={s.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.user.name} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">{s.user.name}</span>
                        {s.verificationStatus === 'VERIFIED' && <VerifiedBadge />}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <p className="text-sm">{s.user.email}</p>
                  <p className="text-xs text-on-surface-variant">{s.user.phone || '—'}</p>
                </td>
                <td className="px-4 py-4">
                  <PasswordPill set={s.user.coordinatorSetPassword} />
                </td>
                <td className="px-4 py-4">
                  <Badge status={s.verificationStatus} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPasswordTarget(s)}
                      className="rounded-lg bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-secondary/15"
                    >
                      {s.user.coordinatorSetPassword ? 'Password' : 'Set password'}
                    </button>
                    <Link
                      to={`/caregivers/${s.id}?from=registrations`}
                      className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                    >
                      Review
                    </Link>
                  </div>
                </td>
              </TableRow>
            ))}
          </DataTable>
        </>
      )}

      <SetPasswordModal
        open={!!passwordTarget}
        registration={passwordTarget}
        loading={passwordLoading}
        onClose={() => setPasswordTarget(null)}
        onSaved={savePassword}
      />
    </div>
  )
}
