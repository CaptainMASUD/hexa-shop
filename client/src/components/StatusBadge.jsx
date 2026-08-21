export default function StatusBadge({ value, className = '' }) {
  const normalized = String(value || 'unknown').toLowerCase().replaceAll('_', ' ')

  const positive = [
    'active',
    'verified',
    'delivered',
    'confirmed',
    'available',
    'assigned',
    'completed',
    'approved',
    'success',
  ]
  const negative = [
    'rejected',
    'cancelled',
    'archived',
    'inactive',
    'disabled',
    'out of stock',
    'failed',
    'closed',
  ]
  const info = ['assigned', 'draft', 'open', 'processing']

  let colorClasses = ''
  let dotColor = ''

  if (positive.includes(normalized)) {
    colorClasses =
      'border-emerald-500/30 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold'
    dotColor = 'bg-emerald-500'
  } else if (negative.includes(normalized)) {
    colorClasses =
      'border-rose-500/30 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-semibold'
    dotColor = 'bg-rose-500'
  } else if (info.includes(normalized)) {
    colorClasses =
      'border-blue-500/30 bg-blue-500/15 text-blue-800 dark:text-blue-300 font-semibold'
    dotColor = 'bg-blue-500'
  } else {
    // Default / Pending / Payment Verification / Warning
    colorClasses =
      'border-amber-500/30 bg-amber-500/15 text-amber-900 dark:text-amber-300 font-semibold'
    dotColor = 'bg-amber-500'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize tracking-wide shadow-sm transition-colors ${colorClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{normalized}</span>
    </span>
  )
}
