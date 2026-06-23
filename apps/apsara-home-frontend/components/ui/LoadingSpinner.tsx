type LoadingSpinnerProps = {
  className?: string
  label?: string
}

export function LoadingSpinner({ className = 'h-4 w-4', label = 'Loading' }: LoadingSpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}
