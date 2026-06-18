import { BadgeCheck } from 'lucide-react'

const VERIFIED_BLUE = '#1D9BF0'

export function VerifiedBadge({ showLabel = true, size = 'sm' }) {
  const iconSize = size === 'md' ? 18 : 14
  const textClass = size === 'md' ? 'text-sm' : 'text-xs'

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold"
      style={{ backgroundColor: 'rgba(29, 155, 240, 0.12)', color: VERIFIED_BLUE }}
    >
      <BadgeCheck size={iconSize} strokeWidth={2.5} aria-hidden />
      {showLabel ? <span className={textClass}>Verified</span> : null}
    </span>
  )
}
