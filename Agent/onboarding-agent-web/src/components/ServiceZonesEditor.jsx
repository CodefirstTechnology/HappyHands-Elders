import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Button } from './ui/Button'
import { AgentLocationPicker } from './AgentLocationPicker'

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function inputClassName() {
  return 'w-full rounded-lg border px-3 py-2'
}

const emptyDraft = () => ({
  name: '',
  description: '',
  city: '',
  location: null,
})

/**
 * Agent-managed service zones for a servant.
 * - caregiverId set: persists via API (edit flow)
 * - draftMode: local list only (onboarding flow)
 */
export function ServiceZonesEditor({
  caregiverId,
  zones: initialZones = [],
  draftMode = false,
  draftZones = [],
  onDraftChange,
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')

  const zones = draftMode ? draftZones : initialZones

  const resetForm = () => {
    setDraft(emptyDraft())
    setEditing(null)
    setFormOpen(false)
    setError('')
  }

  const openCreate = () => {
    setDraft(emptyDraft())
    setEditing(null)
    setFormOpen(true)
    setError('')
  }

  const openEdit = (zone) => {
    setEditing(zone)
    setDraft({
      name: zone.name || '',
      description: zone.description || '',
      city: zone.city || '',
      location:
        zone.latitude != null && zone.longitude != null
          ? {
              address: zone.name,
              city: zone.city,
              latitude: zone.latitude,
              longitude: zone.longitude,
            }
          : null,
    })
    setFormOpen(true)
    setError('')
  }

  const buildPayload = () => ({
    name: draft.name.trim() || draft.location?.address?.split(',')[0]?.trim() || '',
    description: draft.description.trim() || undefined,
    city: draft.location?.city || draft.city.trim() || undefined,
    latitude: draft.location?.latitude,
    longitude: draft.location?.longitude,
  })

  const saveDraftZone = () => {
    const payload = buildPayload()
    if (!payload.name) {
      setError('Add a zone name or pick a location on the map.')
      return
    }
    if (editing) {
      onDraftChange(
        draftZones.map((z) =>
          z === editing || z.id === editing.id
            ? { ...z, ...payload, description: payload.description || null, city: payload.city || null }
            : z,
        ),
      )
    } else {
      onDraftChange([
        ...draftZones,
        { id: `draft-${Date.now()}`, ...payload, description: payload.description || null, city: payload.city || null },
      ])
    }
    resetForm()
  }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post(`/coordinator/caregivers/${caregiverId}/zones`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiver', String(caregiverId)] })
      resetForm()
    },
    onError: (e) => setError(e.response?.data?.message || 'Could not save zone'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ zoneId, payload }) =>
      api.patch(`/coordinator/caregivers/${caregiverId}/zones/${zoneId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caregiver', String(caregiverId)] })
      resetForm()
    },
    onError: (e) => setError(e.response?.data?.message || 'Could not save zone'),
  })

  const deleteMutation = useMutation({
    mutationFn: (zoneId) => api.delete(`/coordinator/caregivers/${caregiverId}/zones/${zoneId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caregiver', String(caregiverId)] }),
    onError: (e) => setError(e.response?.data?.message || 'Could not delete zone'),
  })

  const saveZone = () => {
    const payload = buildPayload()
    if (!payload.name) {
      setError('Add a zone name or pick a location on the map.')
      return
    }
    if (editing?.id) {
      updateMutation.mutate({ zoneId: editing.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const removeZone = (zone) => {
    if (draftMode) {
      onDraftChange(draftZones.filter((z) => z !== zone && z.id !== zone.id))
      return
    }
    if (!window.confirm(`Remove "${zone.name}"?`)) return
    deleteMutation.mutate(zone.id)
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4 rounded-xl bg-surface p-6 shadow-sm">
      <div>
        <h3 className="font-semibold">Service zones</h3>
        <p className="mt-1 text-xs text-subtext">
          Areas where this helper is available. Only agents can add or change zones.
        </p>
      </div>

      {zones.length === 0 ? (
        <p className="text-sm text-subtext">No zones yet. Add at least one service area.</p>
      ) : (
        <ul className="space-y-2">
          {zones.map((z) => (
            <li
              key={z.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{z.name}</p>
                {z.city ? <p className="text-xs text-subtext">{z.city}</p> : null}
                {z.description ? <p className="text-xs text-subtext">{z.description}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" type="button" onClick={() => openEdit(z)}>
                  Edit
                </Button>
                <Button variant="secondary" type="button" onClick={() => removeZone(z)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!formOpen ? (
        <Button type="button" onClick={openCreate}>
          Add zone
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-semibold">{editing ? 'Edit zone' : 'New zone'}</p>
          <Field label="Zone name">
            <input
              placeholder="e.g. Bandra West"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <AgentLocationPicker
            label="Zone on map"
            value={draft.location}
            onChange={(location) => {
              setDraft((d) => ({
                ...d,
                location,
                city: location.city || d.city,
                name: d.name.trim() ? d.name : location.address.split(',')[0]?.trim() || d.name,
              }))
            }}
          />
          <Field label="City">
            <input
              placeholder="Mumbai"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              className={inputClassName()}
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              placeholder="Optional details"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={inputClassName()}
              rows={2}
            />
          </Field>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={draftMode ? saveDraftZone : saveZone}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save zone'}
            </Button>
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export async function createDraftZonesForServant(caregiverId, draftZones) {
  for (const zone of draftZones) {
    await api.post(`/coordinator/caregivers/${caregiverId}/zones`, {
      name: zone.name,
      description: zone.description || undefined,
      city: zone.city || undefined,
      latitude: zone.latitude,
      longitude: zone.longitude,
    })
  }
}
