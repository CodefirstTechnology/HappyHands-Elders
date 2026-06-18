import { useState } from 'react'
import api from '../lib/api'
import { Button } from './ui/Button'
import { LoginPasswordFields } from './LoginPasswordFields'
import { CredentialsBanner } from './CredentialsBanner'

export function SetLoginPasswordCard({ caregiverId, email, passwordAlreadySet, onSaved }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [credentials, setCredentials] = useState(null)

  const save = async () => {
    const trimmed = password.trim()
    if (trimmed.length < 6) {
      window.alert('Enter a password with at least 6 characters, or tap Generate password.')
      return
    }
    setLoading(true)
    try {
      const res = await api.patch(`/coordinator/caregivers/${caregiverId}/password`, {
        password: trimmed,
      })
      setCredentials(res.data?.data?.credentials || null)
      setPassword('')
      onSaved?.()
    } catch (e) {
      window.alert(e.response?.data?.message || 'Failed to save password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="glass-card border border-violet-100 p-6">
      <h3 className="text-lg font-semibold text-violet-900">Login password (Gmail / app signup)</h3>
      <p className="mt-1 text-sm text-on-surface-variant">
        {passwordAlreadySet
          ? 'Password was set. You can change it below before or after approval.'
          : 'This helper registered from the app and needs a password before they can sign in after approval.'}
      </p>
      <div className="mt-4">
        <CredentialsBanner credentials={credentials} onDone={() => setCredentials(null)} />
      </div>
      {!credentials ? (
        <>
          <LoginPasswordFields
            email={email}
            password={password}
            onPasswordChange={setPassword}
          />
          <Button className="mt-4 w-full" variant="success" disabled={loading} onClick={save}>
            {loading ? 'Saving…' : passwordAlreadySet ? 'Update password' : 'Save password'}
          </Button>
        </>
      ) : null}
    </section>
  )
}
