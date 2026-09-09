import { HugeiconsIcon } from '@hugeicons/react'
import { HexagonIcon } from '@hugeicons/core-free-icons'

export default function EmptyState({ title = 'Nothing here yet', description = 'There is no data to display.' }) {
  return (
    <div className="hexa-panel py-14 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
        <HugeiconsIcon icon={HexagonIcon} size={28} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[var(--hexa-text)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--hexa-muted)]">{description}</p>
    </div>
  )
}
