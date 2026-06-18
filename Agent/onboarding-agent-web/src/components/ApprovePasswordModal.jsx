import { useState } from 'react'
import { Button } from './ui/Button'
import { LoginPasswordFields } from './LoginPasswordFields'

export function ApprovePasswordModal({ open, servant, onClose, onConfirm, loading }) {
  const [password, setPassword] = useState('')

  if (!open || !servant) return null

  const handleClose = () => {
    setPassword('')
    onClose()
  }

  const handleApprove = () => {
    const trimmed = password.trim()
    if (trimmed.length < 6) {
      window.alert('Enter a password with at least 6 characters, or tap Generate password.')
      return
    }
    onConfirm({ password: trimmed })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-password-title"
    >
      <div className="glass-card w-full max-w-md p-6 shadow-2xl">
        <h4 id="approve-password-title" className="text-lg font-semibold text-primary">
          Approve & set login password
        </h4>
        <LoginPasswordFields
          email={servant.user?.email}
          password={password}
          onPasswordChange={setPassword}
          hint="This helper registered from the Servant app. Set their password and share it so they can sign in."
        />
        <div className="mt-6 flex gap-2">
          <Button
            variant="success"
            className="flex-1"
            disabled={loading}
            onClick={handleApprove}
          >
            {loading ? 'Saving…' : 'Approve & activate'}
          </Button>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
