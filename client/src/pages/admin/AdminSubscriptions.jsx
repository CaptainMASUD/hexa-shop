import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calendar01Icon,
  CheckmarkCircle01Icon,
  Clock01Icon,
  Edit02Icon,
  PackageIcon,
  RefreshIcon,
  Search01Icon,
  Shield01Icon,
  Tv01Icon,
  UserCircleIcon,
  Alert02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { adminGet, adminPatch } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'

export default function AdminSubscriptions() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiringSoonFilter, setExpiringSoonFilter] = useState(false)

  // Extend Modal State
  const [extendItem, setExtendItem] = useState(null)
  const [extendDays, setExtendDays] = useState(30)
  const [customExpiryDate, setCustomExpiryDate] = useState('')
  const [extendNote, setExtendNote] = useState('')
  const [extending, setExtending] = useState(false)

  // Status Modal State
  const [statusItem, setStatusItem] = useState(null)
  const [targetStatus, setTargetStatus] = useState('active')
  const [statusNote, setStatusNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    status = statusFilter,
    expiringSoon = expiringSoonFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ && searchQ.trim()) params.q = searchQ.trim()
      if (status && status !== 'all') params.status = status
      if (expiringSoon) params.expiringSoon = 'true'

      const r = await adminGet('/features/subscriptions', params)
      setItems(r.data || [])
      setMeta(r.meta || {})
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load subscriptions'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, q, statusFilter, expiringSoonFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, expiringSoonFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, statusFilter, expiringSoonFilter)
  }

  const openExtendModal = (item) => {
    setExtendItem(item)
    setExtendDays(30)
    setCustomExpiryDate('')
    setExtendNote('')
  }

  const handleExtendSubmit = async (e) => {
    e.preventDefault()
    if (!extendItem) return
    setExtending(true)
    try {
      const payload = {
        note: extendNote.trim(),
      }
      if (customExpiryDate) {
        payload.newExpiryDate = customExpiryDate
      } else {
        payload.days = Number(extendDays)
      }

      await adminPatch(`/features/subscriptions/${extendItem._id}/extend`, payload)
      notify('Subscription extended and notification dispatched', 'success')
      setExtendItem(null)
      load(null, 'next', limit, q, statusFilter, expiringSoonFilter)
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to extend subscription'), 'error')
    } finally {
      setExtending(false)
    }
  }

  const openStatusModal = (item, newStatus) => {
    setStatusItem(item)
    setTargetStatus(newStatus)
    setStatusNote('')
  }

  const handleStatusSubmit = async (e) => {
    e.preventDefault()
    if (!statusItem) return
    setUpdatingStatus(true)
    try {
      await adminPatch(`/features/subscriptions/${statusItem._id}/status`, {
        status: targetStatus,
        note: statusNote.trim(),
      })
      notify(`Subscription marked as ${targetStatus}`, 'success')
      setStatusItem(null)
      load(null, 'next', limit, q, statusFilter, expiringSoonFilter)
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to update subscription status'), 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const formatDaysRemaining = (expiresAt) => {
    if (!expiresAt) return { text: 'No expiration', color: 'text-gray-400 bg-gray-500/10' }
    const diff = new Date(expiresAt).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days < 0) {
      return { text: `Expired ${Math.abs(days)}d ago`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
    }
    if (days === 0) {
      return { text: 'Expires today', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 animate-pulse' }
    }
    if (days <= 7) {
      return { text: `${days}d left`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20 font-bold' }
    }
    return { text: `${days}d remaining`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
  }

  // Summary Metrics
  const activeCount = items.filter((i) => i.status === 'active').length
  const expiring7Count = items.filter((i) => {
    if (i.status !== 'active' || !i.expiresAt) return false
    const diff = new Date(i.expiresAt).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days >= 0 && days <= 7
  }).length

  return (
    <>
      <AdminPageHeader
        title="Subscriptions & Memberships"
        description="Monitor active streaming accounts, software licenses, memberships, and process manual extensions."
      />

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="hexa-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--hexa-muted)]">Active Subscriptions</p>
            <p className="mt-1 text-2xl font-black text-emerald-400">{activeCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} />
          </div>
        </div>

        <div className="hexa-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--hexa-muted)]">Expiring Within 7 Days</p>
            <p className="mt-1 text-2xl font-black text-amber-400">{expiring7Count}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} size={20} />
          </div>
        </div>

        <div className="hexa-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--hexa-muted)]">Loaded in Page</p>
            <p className="mt-1 text-2xl font-black text-purple-400">{items.length}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <HugeiconsIcon icon={Tv01Icon} size={20} />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative min-w-[240px] max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            className="hexa-input !pl-8.5 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer, email or product name..."
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="hexa-input sm:w-40 text-xs font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          type="button"
          onClick={() => setExpiringSoonFilter(!expiringSoonFilter)}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            expiringSoonFilter
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
              : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
          }`}
        >
          <HugeiconsIcon icon={Clock01Icon} size={14} />
          Expiring in 7 Days
        </button>

        <button
          type="button"
          onClick={() => load(null, 'next', limit, q, statusFilter, expiringSoonFilter)}
          className="hexa-btn-secondary !py-2 text-xs flex items-center gap-1.5"
        >
          <HugeiconsIcon icon={RefreshIcon} size={14} /> Refresh
        </button>
      </div>

      {/* Subscriptions Table */}
      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-semibold">
              <tr>
                {['Customer', 'Product & Plan', 'Order Number', 'Started At', 'Expires At', 'Remaining', 'Status', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-5 py-3.5">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                    No subscriptions found matching the current filters.
                  </td>
                </tr>
              ) : (
                items.map((sub) => {
                  const remaining = formatDaysRemaining(sub.expiresAt)
                  return (
                    <tr key={sub._id} className="hover:bg-white/[0.02] transition">
                      {/* Customer */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 font-bold overflow-hidden text-xs shrink-0">
                            {sub.user?.avatar?.url ? (
                              <img src={sub.user.avatar.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>{sub.user?.name ? sub.user.name.charAt(0).toUpperCase() : 'U'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-100 truncate">{sub.user?.name || 'Customer'}</p>
                            <p className="text-[11px] text-gray-400 truncate">{sub.user?.email || '—'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Product & Plan */}
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-gray-200">{sub.productName}</p>
                        <p className="text-[11px] text-purple-400 font-medium">{sub.planName || 'Standard'}</p>
                      </td>

                      {/* Order Ref */}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-gray-300">
                        {sub.order?.orderNumber ? `#${sub.order.orderNumber}` : '—'}
                      </td>

                      {/* Started */}
                      <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">
                        {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '—'}
                      </td>

                      {/* Expires At */}
                      <td className="px-5 py-3.5 font-semibold text-gray-200 whitespace-nowrap">
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'Lifetime / None'}
                      </td>

                      {/* Remaining Days */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] uppercase tracking-wider ${remaining.color}`}>
                          {remaining.text}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <StatusBadge value={sub.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openExtendModal(sub)}
                            className="rounded-lg bg-purple-500/10 px-2.5 py-1 font-semibold text-purple-400 hover:bg-purple-500/20 transition flex items-center gap-1"
                            title="Extend Subscription"
                          >
                            <HugeiconsIcon icon={Calendar01Icon} size={12} />
                            Extend
                          </button>

                          {sub.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => openStatusModal(sub, 'cancelled')}
                              className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition"
                              title="Cancel Subscription"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openStatusModal(sub, 'active')}
                              className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition"
                              title="Reactivate Subscription"
                            >
                              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminCursorPagination
          meta={meta}
          onNext={(c) => load(c, 'next', limit, q, statusFilter, expiringSoonFilter)}
          onPrev={(c) => load(c, 'prev', limit, q, statusFilter, expiringSoonFilter)}
          limit={limit}
          onLimitChange={(l) => {
            setLimit(l)
            load(null, 'next', l, q, statusFilter, expiringSoonFilter)
          }}
          loading={loading}
          pageSizeOptions={[15, 25, 50, 100]}
        />
      </div>

      {/* Modal 1: Extend Subscription */}
      <Modal
        open={Boolean(extendItem)}
        onClose={() => setExtendItem(null)}
        title="Extend Subscription Validity"
        maxWidth="max-w-md"
      >
        {extendItem && (
          <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 space-y-1">
              <p className="text-[var(--hexa-muted)]">
                Product: <strong className="text-gray-100">{extendItem.productName}</strong> ({extendItem.planName})
              </p>
              <p className="text-[var(--hexa-muted)]">
                User: <strong className="text-gray-100">{extendItem.user?.name}</strong> ({extendItem.user?.email})
              </p>
              <p className="text-[var(--hexa-muted)]">
                Current Expiration:{' '}
                <strong className="text-amber-400 font-mono">
                  {extendItem.expiresAt ? new Date(extendItem.expiresAt).toLocaleDateString() : 'None'}
                </strong>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1.5">
                Quick Extension Presets
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  [7, '+7 Days'],
                  [14, '+14 Days'],
                  [30, '+30 Days'],
                  [90, '+90 Days'],
                ].map(([d, lbl]) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setExtendDays(d)
                      setCustomExpiryDate('')
                    }}
                    className={`rounded-lg py-1.5 font-bold transition ${
                      !customExpiryDate && extendDays === d
                        ? 'bg-purple-600 text-white'
                        : 'border border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:text-white'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1">
                Or Pick Specific Date
              </label>
              <input
                type="date"
                value={customExpiryDate}
                onChange={(e) => setCustomExpiryDate(e.target.value)}
                className="hexa-input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1">
                Admin Note / Courtesy Reason (Visible to user)
              </label>
              <textarea
                rows={2}
                value={extendNote}
                onChange={(e) => setExtendNote(e.target.value)}
                placeholder="e.g. Courtesy compensation for downtime, manual renewal verified via bKash"
                className="hexa-input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
              <button
                type="button"
                onClick={() => setExtendItem(null)}
                className="hexa-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={extending}
                className="hexa-btn"
              >
                {extending ? 'Extending...' : 'Apply Extension'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal 2: Change Status */}
      <Modal
        open={Boolean(statusItem)}
        onClose={() => setStatusItem(null)}
        title={`Mark Subscription as ${targetStatus.toUpperCase()}`}
        maxWidth="max-w-md"
      >
        {statusItem && (
          <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
            <p className="text-[var(--hexa-muted)] leading-relaxed">
              Are you sure you want to mark the subscription for{' '}
              <strong className="text-gray-100">{statusItem.productName}</strong> owned by{' '}
              <strong className="text-gray-100">{statusItem.user?.name}</strong> as{' '}
              <strong className="text-purple-400 uppercase">{targetStatus}</strong>?
            </p>

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1">
                Reason / Note
              </label>
              <input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="e.g. User requested cancellation, account replaced"
                className="hexa-input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
              <button
                type="button"
                onClick={() => setStatusItem(null)}
                className="hexa-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatingStatus}
                className={`rounded-xl px-4 py-2 font-bold text-white transition ${
                  targetStatus === 'cancelled'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {updatingStatus ? 'Updating...' : `Confirm ${targetStatus}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
