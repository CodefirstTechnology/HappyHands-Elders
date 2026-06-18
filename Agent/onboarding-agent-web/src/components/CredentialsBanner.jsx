import { Button } from './ui/Button'

export function CredentialsBanner({ credentials, onDone }) {
  if (!credentials) return null

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
      <p className="font-semibold text-emerald-800">Password saved — share with helper</p>
      <p className="mt-2">
        Email: <strong>{credentials.email}</strong>
      </p>
      <p className="mt-1 font-mono">
        Password: <strong>{credentials.password}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() =>
            navigator.clipboard?.writeText(
              `Email: ${credentials.email}\nPassword: ${credentials.password}`,
            )
          }
        >
          Copy all
        </Button>
        {onDone ? (
          <Button variant="success" onClick={onDone}>
            Done
          </Button>
        ) : null}
      </div>
    </div>
  )
}
