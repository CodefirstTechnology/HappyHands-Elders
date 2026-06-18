const sourceStyles = {
  SELF: 'bg-violet-100 text-violet-800',
  COORDINATOR: 'bg-slate-100 text-slate-700',
}

const sourceLabels = {
  SELF: 'App registration',
  COORDINATOR: 'Agent onboarded',
}

export function SourceBadge({ source }) {
  const key = source === 'SELF' ? 'SELF' : 'COORDINATOR'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceStyles[key]}`}
    >
      {sourceLabels[key]}
    </span>
  )
}
