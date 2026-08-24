import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`hexa-card max-h-[90vh] w-full ${maxWidth} overflow-y-auto`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--hexa-border)] bg-[var(--hexa-card)] px-6 py-4 backdrop-blur-xl">
          <h2 className="text-lg font-semibold text-[var(--hexa-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--hexa-muted)] transition hover:bg-[var(--hexa-accent-soft)] hover:text-[var(--hexa-text)]"
            aria-label="Close modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
