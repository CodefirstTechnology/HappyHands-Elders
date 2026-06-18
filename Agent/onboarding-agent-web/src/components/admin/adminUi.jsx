export function inputClass() {
  return 'input-ghost w-full text-sm'
}

export function PageHeader({ eyebrow = 'Admin', title, description, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-secondary">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-bold text-primary">{title}</h2>
        {description && (
          <div className="mt-2 max-w-xl text-sm text-on-surface-variant">{description}</div>
        )}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, sub, accent = 'text-primary' }) {
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

export function Avatar({ name, variant = 'gradient' }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const bg =
    variant === 'gradient'
      ? 'bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] text-white shadow-md'
      : 'bg-primary/10 text-primary'
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${bg}`}
    >
      {initials}
    </span>
  )
}

export function ActivePill({ active }) {
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

const roleColors = {
  PARENT: 'bg-blue-100 text-blue-800',
  CAREGIVER: 'bg-violet-100 text-violet-800',
  COORDINATOR: 'bg-secondary/15 text-secondary',
  ADMIN: 'bg-primary/10 text-primary',
}

export function RolePill({ role }) {
  const label = String(role || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}
    >
      {label}
    </span>
  )
}

export function TypePill({ type }) {
  const isMonthly = type === 'MONTHLY'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isMonthly ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
      }`}
    >
      {isMonthly ? 'Monthly' : 'Session'}
    </span>
  )
}

export function FilterBar({ children, count, countLabel = 'results' }) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-3 p-4">
      <span className="text-lg opacity-60" aria-hidden>
        🔍
      </span>
      {children}
      {count != null && (
        <span className="ml-auto text-sm text-on-surface-variant">
          {count} {countLabel}
        </span>
      )}
    </div>
  )
}

export function SelectFilter({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass()} w-auto min-w-[140px] ${className}`}
    >
      {options.map(([val, label]) => (
        <option key={val || 'all'} value={val}>
          {label}
        </option>
      ))}
    </select>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass()} max-w-md flex-1 min-w-[200px]`}
    />
  )
}

export function LoadingSkeleton({ cards = 3, rows = 4 }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="glass-card h-24" />
        ))}
      </div>
      <div className="glass-card h-14" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="glass-card h-20" />
      ))}
    </div>
  )
}

export function EmptyState({ icon = '📋', title, description }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="text-5xl opacity-40" aria-hidden>
        {icon}
      </span>
      <p className="mt-4 text-lg font-semibold text-primary">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-on-surface-variant">{description}</p>
      )}
    </div>
  )
}

export function DataTable({ columns, children, className = '' }) {
  return (
    <div
      className={`hidden overflow-hidden rounded-2xl border border-outline-variant/30 bg-white/80 shadow-[var(--shadow-card)] lg:block ${className}`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant/30 bg-surface-low/80">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function TableRow({ children, highlight }) {
  return (
    <tr
      className={`border-b border-outline-variant/15 transition-colors hover:bg-primary/3 ${
        highlight ? 'bg-secondary/5' : ''
      }`}
    >
      {children}
    </tr>
  )
}

export function MobileCard({ children }) {
  return (
    <article className="glass-card p-5 transition-all hover:shadow-lg lg:hidden">
      {children}
    </article>
  )
}

export function InfoBanner({ children, variant = 'primary' }) {
  const styles =
    variant === 'violet'
      ? 'border-violet-200 bg-violet-50 text-violet-900'
      : 'border-primary/20 bg-primary/5 text-primary'
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  )
}

export function SkillChips({ skills, max = 3 }) {
  if (!skills?.length) return <span className="text-on-surface-variant">—</span>
  const shown = skills.slice(0, max)
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((sk) => (
        <span
          key={sk.id ?? sk.skillName}
          className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary"
        >
          {String(sk.skillName || sk).replace(/_/g, ' ')}
        </span>
      ))}
      {skills.length > max && (
        <span className="text-xs text-on-surface-variant">+{skills.length - max}</span>
      )}
    </div>
  )
}

export function PasswordPill({ set: isSet }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isSet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {isSet ? 'Password set' : 'Password needed'}
    </span>
  )
}
