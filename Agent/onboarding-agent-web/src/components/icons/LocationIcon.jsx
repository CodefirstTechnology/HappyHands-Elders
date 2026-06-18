import { LocateFixed, MapPin } from 'lucide-react'

const iconClass = 'shrink-0'

export function LocationIcon({ size = 16, className = 'text-primary' }) {
  return (
    <MapPin
      size={size}
      className={`${iconClass} ${className}`.trim()}
      aria-hidden
      strokeWidth={2}
    />
  )
}

export function GpsIcon({ size = 16, className = 'text-primary' }) {
  return (
    <LocateFixed
      size={size}
      className={`${iconClass} ${className}`.trim()}
      aria-hidden
      strokeWidth={2}
    />
  )
}
