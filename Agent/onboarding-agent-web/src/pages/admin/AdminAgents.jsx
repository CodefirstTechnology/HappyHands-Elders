import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { AgentLocationPicker } from '../../components/AgentLocationPicker'
import { LocationIcon } from '../../components/icons/LocationIcon'
import { CredentialsBanner } from '../../components/CredentialsBanner'

const emptyEditForm = () => ({
  agencyName: '',
  location: null,
  serviceRadiusKm: '3',
})

function inputClass() {
  return 'input-ghost w-full text-sm'
}

function AgentAvatar({ name }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-sm font-bold text-white shadow-md">
      {initials}
    </span>
  )
}

function StatusPill({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`}
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function RadiusPill({ km }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
      <span aria-hidden>◎</span>
      {km ?? 3} km
    </span>
  )
}

function StatCard({ label, value, sub, accent = 'text-primary' }) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-on-surface-variant">{sub}</p>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card h-24" />
        ))}
      </div>
      <div className="glass-card h-14" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card h-28" />
      ))}
    </div>
  )
}

function AgentEditPanel({ agent, form, setForm, error, saving, onClose, onSave }) {
  if (!agent) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close edit panel"
        className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-outline-variant/30 bg-white shadow-2xl">
        <div className="border-b border-outline-variant/20 bg-gradient-to-r from-primary/5 to-secondary/5 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <AgentAvatar name={agent.user.name} />
              <div>
                <h3 className="text-lg font-bold text-primary">Edit agent</h3>
                <p className="text-sm text-on-surface-variant">{agent.user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-outline-variant/40 px-3 py-1.5 text-sm text-on-surface-variant hover:bg-surface-low"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill active={agent.user.isActive} />
            <RadiusPill km={agent.serviceRadiusKm} />
            <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
              {agent._count?.caregivers ?? 0} servants
            </span>
          </div>
        </div>

        <form onSubmit={onSave} className="flex flex-1 flex-col overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Agency
              </h4>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-background">Agency name</span>
                <input
                  className={inputClass()}
                  placeholder="e.g. Mumbai West Agency"
                  value={form.agencyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, agencyName: e.target.value }))
                  }
                />
              </label>
            </section>

            <section className="space-y-3 rounded-2xl border border-outline-variant/25 bg-surface-low/80 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Location
              </h4>
              <AgentLocationPicker
                label="Office / service area"
                required
                value={form.location}
                onChange={(loc) => setForm((f) => ({ ...f, location: loc }))}
              />
            </section>

            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Coverage
              </h4>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-on-background">Service radius (km)</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={50}
                    step={0.5}
                    className="flex-1 accent-secondary"
                    value={form.serviceRadiusKm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serviceRadiusKm: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    required
                    className={`${inputClass()} w-20 text-center`}
                    value={form.serviceRadiusKm}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, serviceRadiusKm: e.target.value }))
                    }
                  />
                </div>
                <p className="text-xs text-on-surface-variant">
                  Helpers within this distance appear in this agent&apos;s app registrations.
                </p>
              </label>
            </section>

            {error && (
              <div className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
                {error}
              </div>
            )}
          </div>

          <div className="mt-auto flex gap-3 border-t border-outline-variant/20 pt-5">
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </aside>
    </div>
  )
}

function AgentRowCard({ agent, isSelected, onEdit, onToggle }) {
  return (
    <article
      className={`glass-card group p-5 transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-secondary/40' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => onEdit(agent)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <AgentAvatar name={agent.user.name} />
          <div className="min-w-0">
            <p className="font-semibold text-primary group-hover:text-secondary transition-colors">
              {agent.user.name}
            </p>
            <p className="truncate text-sm text-on-surface-variant">{agent.user.email}</p>
            {agent.agencyName && (
              <p className="mt-1 text-sm font-medium text-on-background">{agent.agencyName}</p>
            )}
          </div>
        </button>
        <StatusPill active={agent.user.isActive} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/20 pt-4">
        <RadiusPill km={agent.serviceRadiusKm} />
        <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
          👥 {agent._count?.caregivers ?? 0} servants
        </span>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
          ₹{(agent.annualRevenue ?? 0).toLocaleString('en-IN')} / yr
        </span>
      </div>

      {(agent.address || agent.city) && (
        <div className="mt-3 flex items-start gap-2 text-sm text-on-surface-variant">
          <LocationIcon size={15} className="mt-0.5 shrink-0 text-secondary" />
          <span className="line-clamp-2">
            {agent.address}
            {agent.city ? ` · ${agent.city}` : ''}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="gradient" className="text-sm" onClick={() => onEdit(agent)}>
          Edit agency
        </Button>
        <Button variant="secondary" className="text-sm" onClick={() => onToggle(agent.user.id)}>
          {agent.user.isActive ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    </article>
  )
}

export default function AdminAgents() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [credentials, setCredentials] = useState(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [password, setPassword] = useState('')
  const [generatePassword, setGeneratePassword] = useState(true)
  const [locationMode, setLocationMode] = useState('picker')
  const [location, setLocation] = useState(null)
  const [manualAddress, setManualAddress] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualLatitude, setManualLatitude] = useState('')
  const [manualLongitude, setManualLongitude] = useState('')
  const [serviceRadiusKm, setServiceRadiusKm] = useState('3')

  const [editingAgent, setEditingAgent] = useState(null)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-agents', search],
    queryFn: async () => {
      const res = await api.get('/admin/coordinators', {
        params: { search: search || undefined, limit: 100 },
      })
      return res.data.data.coordinators
    },
  })

  const rows = data || []

  const stats = useMemo(() => {
    const active = rows.filter((a) => a.user.isActive).length
    const servants = rows.reduce((sum, a) => sum + (a._count?.caregivers ?? 0), 0)
    const revenue = rows.reduce((sum, a) => sum + (a.annualRevenue ?? 0), 0)
    return { total: rows.length, active, servants, revenue }
  }, [rows])

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setAgencyName('')
    setPassword('')
    setGeneratePassword(true)
    setLocationMode('picker')
    setLocation(null)
    setManualAddress('')
    setManualCity('')
    setManualLatitude('')
    setManualLongitude('')
    setServiceRadiusKm('3')
    setError('')
  }

  const openEdit = (agent) => {
    setEditingAgent(agent)
    setEditError('')
    setShowForm(false)
    setEditForm({
      agencyName: agent.agencyName || '',
      location:
        agent.address && agent.latitude != null && agent.longitude != null
          ? {
              address: agent.address,
              city: agent.city,
              latitude: agent.latitude,
              longitude: agent.longitude,
            }
          : null,
      serviceRadiusKm: String(agent.serviceRadiusKm ?? 3),
    })
  }

  const closeEdit = () => {
    setEditingAgent(null)
    setEditForm(emptyEditForm())
    setEditError('')
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    if (
      !editForm.location?.address?.trim() ||
      editForm.location.latitude == null ||
      editForm.location.longitude == null
    ) {
      setEditError('Pick the agent area / office location from search or GPS.')
      return
    }
    const radius = Number(editForm.serviceRadiusKm)
    if (!Number.isFinite(radius) || radius < 1 || radius > 100) {
      setEditError('Service radius must be between 1 and 100 km.')
      return
    }
    setEditSaving(true)
    try {
      await api.patch(`/admin/coordinators/${editingAgent.id}`, {
        agencyName: editForm.agencyName.trim() || undefined,
        address: editForm.location.address,
        city: editForm.location.city,
        latitude: editForm.location.latitude,
        longitude: editForm.location.longitude,
        serviceRadiusKm: radius,
      })
      closeEdit()
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update agent')
    } finally {
      setEditSaving(false)
    }
  }

  const toggleActive = async (userId) => {
    await api.patch(`/admin/users/${userId}/toggle`)
    qc.invalidateQueries({ queryKey: ['admin-agents'] })
    qc.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  const createAgent = async (e) => {
    e.preventDefault()
    setError('')

    let address
    let city
    let latitude
    let longitude

    if (locationMode === 'manual') {
      address = manualAddress.trim()
      city = manualCity.trim() || undefined
      latitude = Number(manualLatitude)
      longitude = Number(manualLongitude)
      if (!address || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        setError('Enter address, latitude, and longitude for manual agent location.')
        return
      }
    } else if (
      !location?.address?.trim() ||
      location.latitude == null ||
      location.longitude == null
    ) {
      setError('Pick the agent area / office location from search or GPS.')
      return
    } else {
      address = location.address
      city = location.city
      latitude = location.latitude
      longitude = location.longitude
    }

    setSaving(true)
    try {
      const res = await api.post('/admin/coordinators', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        agencyName: agencyName.trim() || undefined,
        password: generatePassword ? undefined : password,
        generatePassword,
        address,
        city,
        latitude,
        longitude,
        serviceRadiusKm: Number(serviceRadiusKm) || 3,
      })
      setCredentials(res.data?.data?.credentials || null)
      resetForm()
      setShowForm(false)
      qc.invalidateQueries({ queryKey: ['admin-agents'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create agent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Admin
          </p>
          <h2 className="mt-1 text-3xl font-bold text-primary">Field agents</h2>
          <p className="mt-2 max-w-xl text-sm text-on-surface-variant">
            Manage agency locations and service coverage. Click an agent to edit their area and
            radius.
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => {
            closeEdit()
            setShowForm((v) => !v)
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add agent'}
        </Button>
      </div>

      <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total agents" value={stats.total} />
          <StatCard label="Active" value={stats.active} accent="text-emerald-600" />
          <StatCard label="Servants onboarded" value={stats.servants} accent="text-secondary" />
          <StatCard
            label="Annual revenue"
            value={`₹${stats.revenue.toLocaleString('en-IN')}`}
            accent="text-amber-700"
          />
        </div>
      )}

      {showForm && (
        <form onSubmit={createAgent} className="glass-card space-y-5 p-6">
          <div>
            <h3 className="text-lg font-semibold text-primary">New field agent</h3>
            <p className="text-sm text-on-surface-variant">
              Create login credentials and assign an agency area.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Full name *', name, setName, 'text'],
              ['Email *', email, setEmail, 'email'],
              ['Phone', phone, setPhone, 'tel'],
              ['Agency name', agencyName, setAgencyName, 'text'],
            ].map(([label, val, set, type]) => (
              <label key={label} className="block space-y-1.5">
                <span className="text-sm font-medium">{label}</span>
                <input
                  required={label.includes('*')}
                  type={type}
                  className={inputClass()}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-outline-variant/25 bg-surface-low/60 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
              Agency location
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {['picker', 'manual'].map((mode) => (
                <label key={mode} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={locationMode === mode}
                    onChange={() => setLocationMode(mode)}
                  />
                  {mode === 'picker' ? 'Search or GPS' : 'Manual coordinates'}
                </label>
              ))}
            </div>
            {locationMode === 'picker' ? (
              <AgentLocationPicker label="Office location" required value={location} onChange={setLocation} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-sm font-medium">Address *</span>
                  <input className={inputClass()} value={manualAddress} onChange={(e) => setManualAddress(e.target.value)} />
                </label>
                {[
                  ['City', manualCity, setManualCity, 'text'],
                  ['Latitude *', manualLatitude, setManualLatitude, 'number'],
                  ['Longitude *', manualLongitude, setManualLongitude, 'number'],
                ].map(([label, val, set, type]) => (
                  <label key={label} className="block space-y-1.5">
                    <span className="text-sm font-medium">{label}</span>
                    <input
                      type={type}
                      step={type === 'number' ? 'any' : undefined}
                      className={inputClass()}
                      value={val}
                      onChange={(e) => set(e.target.value)}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="block max-w-md space-y-1.5">
            <span className="text-sm font-medium">Service radius (km)</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                step={0.5}
                className="flex-1 accent-secondary"
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(e.target.value)}
              />
              <input
                type="number"
                min={1}
                max={100}
                step={0.5}
                required
                className={`${inputClass()} w-20 text-center`}
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(e.target.value)}
              />
            </div>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={generatePassword}
              onChange={(e) => setGeneratePassword(e.target.checked)}
            />
            Auto-generate login password
          </label>
          {!generatePassword && (
            <input
              type="password"
              minLength={6}
              placeholder="Login password (min 6 chars)"
              className={`${inputClass()} max-w-sm`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}

          {error && (
            <div className="rounded-xl border border-error/20 bg-red-50 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <Button type="submit" variant="gradient" disabled={saving}>
            {saving ? 'Creating…' : 'Create agent'}
          </Button>
        </form>
      )}

      <div className="glass-card flex flex-wrap items-center gap-3 p-4">
        <span className="text-lg opacity-60" aria-hidden>
          🔍
        </span>
        <input
          placeholder="Search by name, email, agency, or area…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass()} max-w-md flex-1`}
        />
        {!isLoading && (
          <span className="text-sm text-on-surface-variant">
            {rows.length} agent{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : rows.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="text-5xl opacity-40" aria-hidden>
            🗺
          </span>
          <p className="mt-4 text-lg font-semibold text-primary">No field agents yet</p>
          <p className="mt-2 max-w-sm text-sm text-on-surface-variant">
            Add your first agent to cover an area and onboard servants nearby.
          </p>
          <Button variant="gradient" className="mt-6" onClick={() => setShowForm(true)}>
            + Add agent
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:hidden">
            {rows.map((a) => (
              <AgentRowCard
                key={a.id}
                agent={a}
                isSelected={editingAgent?.id === a.id}
                onEdit={openEdit}
                onToggle={toggleActive}
              />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-outline-variant/30 bg-white/80 shadow-[var(--shadow-card)] lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface-low/80">
                  {['Agent', 'Agency', 'Area', 'Radius', 'Servants', 'Revenue', 'Status', ''].map(
                    (h) => (
                      <th
                        key={h || 'actions'}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-outline-variant/15 transition-colors hover:bg-primary/3 ${
                      editingAgent?.id === a.id ? 'bg-secondary/5' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="flex items-center gap-3 text-left"
                      >
                        <AgentAvatar name={a.user.name} />
                        <div>
                          <p className="font-semibold text-primary hover:text-secondary">
                            {a.user.name}
                          </p>
                          <p className="text-xs text-on-surface-variant">{a.user.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 font-medium">{a.agencyName || '—'}</td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <LocationIcon size={14} className="mt-0.5 shrink-0 text-secondary" />
                        <div className="min-w-0">
                          <p className="truncate">{a.address || '—'}</p>
                          {a.city && (
                            <p className="text-xs text-on-surface-variant">{a.city}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <RadiusPill km={a.serviceRadiusKm} />
                    </td>
                    <td className="px-4 py-4 font-medium">{a._count?.caregivers ?? 0}</td>
                    <td className="px-4 py-4 font-semibold text-amber-700">
                      ₹{(a.annualRevenue ?? 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill active={a.user.isActive} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(a.user.id)}
                          className="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-low"
                        >
                          {a.user.isActive ? 'Off' : 'On'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AgentEditPanel
        agent={editingAgent}
        form={editForm}
        setForm={setEditForm}
        error={editError}
        saving={editSaving}
        onClose={closeEdit}
        onSave={saveEdit}
      />
    </div>
  )
}
