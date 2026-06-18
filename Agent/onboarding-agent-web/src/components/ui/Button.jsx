const variants = {
  primary:
    'rounded-xl border border-outline-variant bg-white px-4 py-2 font-medium text-primary hover:bg-surface-low',
  secondary:
    'rounded-xl border border-outline-variant bg-surface-container px-4 py-2 font-medium text-on-surface-variant hover:bg-surface-low',
  success:
    'rounded-xl bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700',
  danger:
    'rounded-xl bg-error px-4 py-2 font-medium text-white hover:opacity-90',
  gradient: 'btn-gradient px-4 py-2',
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      type="button"
      className={`${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
