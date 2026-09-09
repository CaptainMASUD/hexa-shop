import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'

export default function AdminCursorPagination({
  meta = {},
  onNext,
  onPrev,
  limit = 50,
  onLimitChange,
  loading = false,
  pageSizeOptions = [15, 30, 50, 100],
}) {
  const safeMeta = meta || {}
  const { hasNextPage = false, hasPrevPage = false, nextCursor, prevCursor, total, count = 0 } = safeMeta

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--hexa-border)] px-4 py-3 text-xs text-[var(--hexa-muted)]">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="text-[var(--hexa-text)] font-semibold">{count}</strong>
          {typeof total === 'number' && (
            <>
              {' '}of <strong className="text-[var(--hexa-text)] font-semibold">{total.toLocaleString()}</strong>
            </>
          )}{' '}
          records
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              disabled={loading}
              className="
                rounded-lg
                bg-[var(--hexa-card-bg)]
                border
                border-[var(--hexa-border)]
                px-2
                py-1
                text-xs
                font-medium
                text-[var(--hexa-text)]
                outline-none
                focus:border-purple-500
                transition
                cursor-pointer
              "
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPrev && prevCursor && onPrev(prevCursor)}
          disabled={!hasPrevPage || loading}
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-[var(--hexa-border)]
            bg-[var(--hexa-surface)]
            px-3
            py-1.5
            text-xs
            font-semibold
            text-[var(--hexa-text)]
            hover:bg-white/5
            hover:border-purple-500/50
            disabled:opacity-30
            disabled:cursor-not-allowed
            disabled:hover:bg-transparent
            disabled:hover:border-[var(--hexa-border)]
            transition
          "
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => onNext && nextCursor && onNext(nextCursor)}
          disabled={!hasNextPage || loading}
          className="
            inline-flex
            items-center
            gap-1.5
            rounded-lg
            border
            border-[var(--hexa-border)]
            bg-[var(--hexa-surface)]
            px-3
            py-1.5
            text-xs
            font-semibold
            text-[var(--hexa-text)]
            hover:bg-white/5
            hover:border-purple-500/50
            disabled:opacity-30
            disabled:cursor-not-allowed
            disabled:hover:bg-transparent
            disabled:hover:border-[var(--hexa-border)]
            transition
          "
        >
          <span>Next</span>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </button>
      </div>
    </div>
  )
}
