import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Clock01Icon, Search01Icon, Shield01Icon } from '@hugeicons/core-free-icons'
import { adminGet } from '../../api/admin.api'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'

export default function AdminAudit() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(30)
  const [actionFilter, setActionFilter] = useState('')
  const [resourceFilter, setResourceFilter] = useState('')
  const { notify } = useToast()

  const load = async (cursor = null, direction = 'next', currentLimit = limit) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (actionFilter.trim()) params.action = actionFilter.trim()
      if (resourceFilter.trim()) params.resourceType = resourceFilter.trim()

      const res = await adminGet('/audit-logs', params)
      setItems(res.data || [])
      setMeta(res.meta || {})
    } catch (error) {
      notify(apiErrorMessage(error, 'Unable to load audit logs'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, resourceFilter])

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit)
  }

  return (
    <>
      <AdminPageHeader
        title="Audit Logs"
        description="Sensitive administrator actions are securely recorded with actor, IP, timestamp and change metadata."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            type="text"
            placeholder="Filter by action (e.g. order_delivered)..."
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="hexa-input !pl-8.5 text-xs"
          />
        </div>

        <div className="relative max-w-xs flex-1">
          <HugeiconsIcon
            icon={Shield01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            type="text"
            placeholder="Filter by resource (e.g. Order, User)..."
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="hexa-input !pl-8.5 text-xs"
          />
        </div>

        {(actionFilter || resourceFilter) && (
          <button
            type="button"
            onClick={() => {
              setActionFilter('')
              setResourceFilter('')
            }}
            className="hexa-btn-secondary text-xs !py-1.5"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Time', 'Actor', 'Action', 'Resource', 'IP Address', 'Metadata'].map((h) => (
                  <th key={h} className="px-5 py-4 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading audit records...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-500">
                    No audit records found matching the filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-white/5 align-top hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap flex items-center gap-1.5">
                      <HugeiconsIcon icon={Clock01Icon} size={13} className="text-purple-400/70 shrink-0" />
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-200">{item.actor?.name || 'System / Guest'}</p>
                      <p className="text-xs text-gray-500">{item.actor?.email}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-purple-300 font-semibold">{item.action}</td>
                    <td className="px-5 py-4 text-xs text-gray-300">{item.resourceType}</td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{item.ipAddress || '—'}</td>
                    <td className="max-w-sm px-5 py-4">
                      <pre className="whitespace-pre-wrap break-all text-[11px] font-mono text-gray-400 bg-black/30 p-2 rounded border border-white/5">
                        {JSON.stringify(item.metadata || {}, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminCursorPagination
          meta={meta}
          onNext={handleNext}
          onPrev={handlePrev}
          limit={limit}
          onLimitChange={handleLimitChange}
          loading={loading}
          pageSizeOptions={[15, 30, 50, 100]}
        />
      </div>
    </>
  )
}
