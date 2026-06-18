import { Button } from './ui/Button'
import { generateServantPassword } from '../lib/generatePassword'

export function LoginPasswordFields({ email, password, onPasswordChange, hint }) {
  return (
    <div className="space-y-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-sm text-violet-900">
        {hint ||
          'Set or generate a login password for this app registration. Share it with the helper after you approve them.'}
      </p>
      {email ? (
        <p className="text-sm">
          <span className="text-on-surface-variant">Email: </span>
          <span className="font-medium text-primary">{email}</span>
        </p>
      ) : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Login password</span>
        <input
          type="text"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Min 6 characters"
          className="w-full rounded-lg border px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => onPasswordChange(generateServantPassword())}
        >
          Generate password
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => password && navigator.clipboard?.writeText(password)}
          disabled={!password}
        >
          Copy password
        </Button>
      </div>
    </div>
  )
}
