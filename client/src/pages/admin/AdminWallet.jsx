import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Clock01Icon,
  Coins01Icon,
  Delete02Icon,
  Edit02Icon,
  Invoice01Icon,
  PlusSignIcon,
  Search01Icon,
  Tag01Icon,
  Tick02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import {
  adminGet,
  adminPatch,
  adminPost,
  adminPut,
  adminDelete,
} from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import Modal from '../../components/Modal'

export default function AdminWallet() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'credit_purchases'

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName })
  }

  return (
    <>
      <AdminPageHeader
        title="Store Wallet Management"
        description="Manage customer wallet credit purchase requests, credit packages/rates, customer balances, and transaction ledger history."
      />

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--hexa-border)] pb-3">
        {[
          ['credit_purchases', 'Credit Purchases', Invoice01Icon],
          ['packages', 'Credit Packages / Rates', Tag01Icon],
          ['transactions', 'Wallet Transactions Ledger', Clock01Icon],
          ['balances', 'Customer Wallet Balances', Coins01Icon],
        ].map(([key, label, Icon]) => {
          const isActive = currentTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? 'bg-[var(--hexa-accent)] text-white shadow-md'
                  : 'bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:bg-[var(--hexa-surface)] hover:text-[var(--hexa-text)] border border-[var(--hexa-border)]'
              }`}
            >
              <HugeiconsIcon icon={Icon} size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {currentTab === 'credit_purchases' && <CreditPurchasesTab />}
      {currentTab === 'packages' && <CreditPackagesTab />}
      {currentTab === 'transactions' && <WalletTransactionsTab />}
      {currentTab === 'balances' && <CustomerBalancesTab />}
    </>
  )
}

/* =========================================================================
   TAB 1: CREDIT PURCHASES (APPROVE / REJECT / FILTERS)
   ========================================================================= */
function CreditPurchasesTab() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals & Action States
  const [detailModal, setDetailModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    selectedStatus = statusFilter,
    query = searchQuery
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (selectedStatus) params.status = selectedStatus
      if (query && query.trim()) params.search = query.trim()

      const res = await adminGet('/wallet/purchases', params)
      setItems(res.data || [])
      setMeta(res.meta || {})
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load credit purchase requests'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, statusFilter, searchQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const handleSearch = (e) => {
    e.preventDefault()
    load(null, 'next', limit, statusFilter, searchQuery)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, statusFilter, searchQuery)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, statusFilter, searchQuery)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, statusFilter, searchQuery)
  }

  const handleApprove = async (purchase) => {
    if (!window.confirm(`Approve credit purchase for ${purchase.user?.name || 'customer'} (${purchase.totalCredits.toLocaleString()} Credits)?`)) {
      return
    }

    setProcessingId(purchase._id)
    try {
      await adminPost(`/wallet/purchases/${purchase._id}/approve`, {})
      notify(`Credit purchase ${purchase.purchaseNumber} approved and credited!`, 'success')
      load(null, 'next', limit, statusFilter, searchQuery)
      if (detailModal?._id === purchase._id) setDetailModal(null)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to approve credit purchase'), 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    if (!rejectModal) return

    if (!rejectionReason.trim()) {
      notify('Please provide a reason for rejection', 'error')
      return
    }

    setProcessingId(rejectModal._id)
    try {
      await adminPost(`/wallet/purchases/${rejectModal._id}/reject`, {
        reason: rejectionReason.trim(),
      })
      notify(`Credit purchase ${rejectModal.purchaseNumber} rejected.`)
      setRejectModal(null)
      setRejectionReason('')
      load(null, 'next', limit, statusFilter, searchQuery)
      if (detailModal?._id === rejectModal._id) setDetailModal(null)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to reject credit purchase'), 'error')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      {/* Control / Filter Bar */}
      <form onSubmit={handleSearch} className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            type="text"
            className="hexa-input !pl-8.5 text-xs"
            placeholder="Search by purchase #, TRX ID, sender #, customer name/email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="hexa-input sm:w-40 text-xs font-semibold"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Review Only</option>
          <option value="approved">Approved & Credited</option>
          <option value="rejected">Rejected Only</option>
        </select>

        <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
          Search
        </button>

        {(searchQuery || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('')
              load(null, 'next', limit, '', '')
            }}
            className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-3 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
          >
            Clear Filters
          </button>
        )}
      </form>

      {/* Purchases Table */}
      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Purchase #', 'Customer', 'Package', 'Pay Amount', 'Total Credits', 'Payment Method', 'TRX ID / Sender', 'Status', 'Date', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-4 py-3.5 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading credit purchase requests...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-8 text-center text-xs text-gray-500">
                    No credit purchase requests found.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-purple-300">
                      {p.purchaseNumber}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <p className="font-semibold text-gray-200">{p.user?.name || 'Customer'}</p>
                      <p className="text-gray-500">{p.user?.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-gray-300">
                      {p.package?.name || 'Custom Pack'}
                      {p.bonusCredits > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-400 font-bold">
                          (+{p.bonusCredits})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-extrabold text-gray-200">
                      ৳{p.amountPaid.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-black text-purple-400 text-sm">
                      {p.totalCredits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-300">
                      {p.paymentMethodName || p.paymentGateway}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono">
                      <p className="font-bold text-purple-300">{p.transactionId || '—'}</p>
                      {p.senderNumber && <p className="text-gray-500 text-[11px]">From: {p.senderNumber}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge value={p.status} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailModal(p)}
                          className="rounded-lg border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-2.5 py-1 text-xs font-semibold text-gray-300 hover:text-white transition"
                          title="View Proof & Details"
                        >
                          View
                        </button>
                        {p.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(p)}
                              disabled={processingId === p._id}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModal(p)
                                setRejectionReason('')
                              }}
                              disabled={processingId === p._id}
                              className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
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
          pageSizeOptions={[15, 25, 50, 100]}
        />
      </div>

      {/* Reject Modal */}
      <Modal
        open={Boolean(rejectModal)}
        onClose={() => setRejectModal(null)}
        title={`Reject Credit Purchase #${rejectModal?.purchaseNumber || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <p className="text-xs text-[var(--hexa-muted)] mb-3">
              Please enter the reason for rejecting this purchase. The customer will be informed.
            </p>
            <label className="block font-semibold text-xs mb-1 text-[var(--hexa-text)]">
              Rejection Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows="3"
              className="hexa-input text-xs"
              placeholder="e.g. Transaction ID not found in payment gateway statement / incorrect sender amount."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setRejectModal(null)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingId === rejectModal?._id}
              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail / Proof Modal */}
      <Modal
        open={Boolean(detailModal)}
        onClose={() => setDetailModal(null)}
        title={`Purchase #${detailModal?.purchaseNumber || ''} Verification Details`}
        maxWidth="max-w-xl"
      >
        {detailModal && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-[var(--hexa-surface)] p-3 border border-[var(--hexa-border)]">
              <div>
                <p className="text-[var(--hexa-muted)]">Customer Name:</p>
                <p className="font-bold text-[var(--hexa-text)]">{detailModal.user?.name}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Customer Email:</p>
                <p className="font-bold text-[var(--hexa-text)]">{detailModal.user?.email}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Amount Paid:</p>
                <p className="font-bold text-emerald-400 text-sm">৳{detailModal.amountPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Credits to Add:</p>
                <p className="font-bold text-purple-400 text-sm">{detailModal.totalCredits.toLocaleString()} Credits</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Payment Gateway:</p>
                <p className="font-bold text-[var(--hexa-text)]">{detailModal.paymentMethodName || detailModal.paymentGateway}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Sender Number:</p>
                <p className="font-mono font-bold text-purple-300">{detailModal.senderNumber || '—'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[var(--hexa-muted)]">Transaction ID / Reference:</p>
                <p className="font-mono font-black text-sm text-[var(--hexa-text)] bg-black/40 p-1.5 rounded border border-white/5 inline-block mt-0.5">
                  {detailModal.transactionId || '—'}
                </p>
              </div>
            </div>

            {/* Payment Proof Slip Image */}
            {detailModal.paymentProofImage?.url && (
              <div>
                <p className="font-semibold text-xs mb-1 text-[var(--hexa-text)]">Payment Slip / Proof Screenshot:</p>
                <a
                  href={detailModal.paymentProofImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-xl border border-[var(--hexa-border)] bg-black/40 hover:opacity-90 transition"
                >
                  <img
                    src={detailModal.paymentProofImage.url}
                    alt="Payment Slip Proof"
                    className="max-h-72 w-full object-contain"
                  />
                </a>
              </div>
            )}

            <div className="space-y-1">
              {detailModal.customerNote && (
                <p className="text-[var(--hexa-muted)] italic">Note: {detailModal.customerNote}</p>
              )}
            </div>

            {detailModal.rejectionReason && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-rose-300">
                <p className="font-bold mb-0.5">Rejection Reason:</p>
                <p>{detailModal.rejectionReason}</p>
              </div>
            )}

            {detailModal.approvedAt && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300">
                <p className="font-bold">Approved & Credited</p>
                <p className="mt-1 text-[11px] opacity-80">
                  Approved on {new Date(detailModal.approvedAt).toLocaleString()}
                </p>
              </div>
            )}

            <div className="text-[11px] text-[var(--hexa-muted)] pt-2">
              Submitted: {new Date(detailModal.createdAt).toLocaleString()}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/* =========================================================================
   TAB 2: CREDIT PACKAGES / RATES MANAGEMENT
   ========================================================================= */
function CreditPackagesTab() {
  const { notify } = useToast()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    payAmount: 1000,
    creditAmount: 1000,
    bonusCredits: 100,
    badge: 'Popular',
    description: '',
    isActive: true,
    sortOrder: 0,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminGet('/wallet/packages')
      setPackages(res.data || [])
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load packages'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      name: '',
      payAmount: 1000,
      creditAmount: 1000,
      bonusCredits: 100,
      badge: '',
      description: '',
      isActive: true,
      sortOrder: packages.length + 1,
    })
    setModalOpen(true)
  }

  const openEdit = (pkg) => {
    setEditingId(pkg._id)
    setForm({
      name: pkg.name,
      payAmount: pkg.payAmount,
      creditAmount: pkg.creditAmount,
      bonusCredits: pkg.bonusCredits || 0,
      badge: pkg.badge || '',
      description: pkg.description || '',
      isActive: pkg.isActive !== false,
      sortOrder: pkg.sortOrder || 0,
    })
    setModalOpen(true)
  }

  const savePackage = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await adminPut(`/wallet/packages/${editingId}`, form)
        notify('Credit package updated successfully', 'success')
      } else {
        await adminPost('/wallet/packages', form)
        notify('Credit package created successfully', 'success')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to save package'), 'error')
    }
  }

  const deletePackage = async (pkg) => {
    if (!window.confirm(`Are you sure you want to delete package "${pkg.name}"?`)) return
    try {
      await adminDelete(`/wallet/packages/${pkg._id}`)
      notify('Credit package deleted')
      load()
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to delete package'), 'error')
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--hexa-text)]">Configured Credit Packages</h2>
          <p className="text-xs text-[var(--hexa-muted)]">
            Define credit packages, bonus rates, and promotional tags available to customers.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="hexa-btn text-xs font-bold flex items-center gap-2 !py-2 !px-4"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} /> New Credit Package
        </button>
      </div>

      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Package Name', 'Pay Amount', 'Base Credits', 'Bonus Credits', 'Total Credits', 'Badge', 'Order', 'Status', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && packages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading packages...
                  </td>
                </tr>
              ) : packages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs text-gray-500">
                    No credit packages found. Click "+ New Credit Package" to create one.
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 font-bold text-gray-200">{pkg.name}</td>
                    <td className="px-5 py-4 font-extrabold text-gray-200">
                      ৳{pkg.payAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-300">
                      {pkg.creditAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-bold text-emerald-400">
                      +{pkg.bonusCredits || 0}
                    </td>
                    <td className="px-5 py-4 font-black text-purple-400 text-sm">
                      {pkg.totalCredits.toLocaleString()} Credits
                    </td>
                    <td className="px-5 py-4">
                      {pkg.badge ? (
                        <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                          {pkg.badge}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-400">{pkg.sortOrder || 0}</td>
                    <td className="px-5 py-4">
                      <StatusBadge value={pkg.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(pkg)}
                          className="rounded p-1.5 text-gray-400 hover:text-purple-400 transition"
                          title="Edit"
                        >
                          <HugeiconsIcon icon={Edit02Icon} size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePackage(pkg)}
                          className="rounded p-1.5 text-gray-400 hover:text-rose-400 transition"
                          title="Delete"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Package Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Credit Package' : 'Create New Credit Package'}
        maxWidth="max-w-md"
      >
        <form onSubmit={savePackage} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Package Name <span className="text-rose-400">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. 1000 Credit Pack"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="hexa-input text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Pay Amount (BDT ৳) <span className="text-rose-400">*</span></label>
              <input
                type="number"
                min="1"
                required
                value={form.payAmount}
                onChange={(e) => setForm({ ...form, payAmount: Number(e.target.value) })}
                className="hexa-input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Base Credits <span className="text-rose-400">*</span></label>
              <input
                type="number"
                min="1"
                required
                value={form.creditAmount}
                onChange={(e) => setForm({ ...form, creditAmount: Number(e.target.value) })}
                className="hexa-input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Bonus Credits</label>
              <input
                type="number"
                min="0"
                value={form.bonusCredits}
                onChange={(e) => setForm({ ...form, bonusCredits: Number(e.target.value) })}
                className="hexa-input text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Promotional Badge</label>
              <input
                type="text"
                placeholder="e.g. Popular, Best Value"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                className="hexa-input text-xs"
              />
            </div>
          </div>

          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 flex justify-between items-center">
            <span className="text-[var(--hexa-muted)]">Total Credits to Deliver:</span>
            <span className="font-black text-sm text-purple-300">
              {(Number(form.creditAmount || 0) + Number(form.bonusCredits || 0)).toLocaleString()} Credits
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                className="hexa-input text-xs"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
                />
                <span className="font-semibold text-gray-200">Active / Visible</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hexa-btn text-xs font-bold"
            >
              {editingId ? 'Save Changes' : 'Create Package'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

/* =========================================================================
   TAB 3: WALLET TRANSACTIONS LEDGER
   ========================================================================= */
function WalletTransactionsTab() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    selectedType = typeFilter,
    selectedSource = sourceFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (selectedType) params.type = selectedType
      if (selectedSource) params.source = selectedSource

      const res = await adminGet('/wallet/transactions', params)
      setItems(res.data || [])
      setMeta(res.meta || {})
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load transaction ledger'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, typeFilter, sourceFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, sourceFilter])

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, typeFilter, sourceFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, typeFilter, sourceFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, typeFilter, sourceFilter)
  }

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        <select
          className="hexa-input sm:w-40 text-xs"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types (+ / -)</option>
          <option value="credit">Credits (+)</option>
          <option value="debit">Debits (-)</option>
        </select>

        <select
          className="hexa-input sm:w-48 text-xs"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="">All Transaction Sources</option>
          <option value="wallet_credit_purchase">Purchased Store Credit</option>
          <option value="order">Order Checkout Usage</option>
          <option value="referral">Affiliate Referral Reward</option>
          <option value="refund">Refund Store Credit</option>
          <option value="admin">Admin Manual Adjustment</option>
          <option value="payout_request">Affiliate Payout Request</option>
          <option value="payout_refund">Rejected Payout Refund</option>
        </select>
      </div>

      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Customer', 'Type', 'Amount', 'Balance After', 'Source', 'Description / Note', 'Date & Time'].map(
                  (h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-xs text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <tr key={t._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 text-xs">
                      <p className="font-semibold text-gray-200">{t.user?.name || 'Customer'}</p>
                      <p className="text-gray-500">{t.user?.email}</p>
                    </td>
                    <td className="px-5 py-4 capitalize">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                          t.type === 'credit'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-sm">
                      <span className={t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.type === 'credit' ? '+' : '-'}৳{Number(t.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-300 font-semibold">
                      ৳{Number(t.balanceAfter || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-purple-300">
                      {t.source}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-300">
                      {t.note || '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}{' '}
                      <span className="text-[10px] opacity-70">
                        {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
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

/* =========================================================================
   TAB 4: CUSTOMER BALANCES & DIRECT ADJUSTMENTS
   ========================================================================= */
function CustomerBalancesTab() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)
  const [walletAdjustModal, setWalletAdjustModal] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'credit', amount: '', note: '' })
  const [adjusting, setAdjusting] = useState(false)

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit, role: 'user' }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ && searchQ.trim()) params.q = searchQ.trim()

      const res = await adminGet('/users', params)
      setItems(res.data || [])
      setMeta(res.meta || {})
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load customer balances'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const search = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q)
  }

  const viewUserWalletProfile = async (item) => {
    try {
      const detail = await adminGet(`/wallet/users/${item._id}`)
      setSelectedUserDetail(detail.data)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load user wallet profile'), 'error')
    }
  }

  const submitWalletAdjustment = async (e) => {
    e.preventDefault()
    const amount = Number(adjustForm.amount)
    if (!amount || amount <= 0) {
      notify('Please enter a valid positive amount', 'error')
      return
    }

    setAdjusting(true)
    try {
      await adminPost(`/features/users/${walletAdjustModal._id}/wallet`, {
        type: adjustForm.type,
        amount,
        note: adjustForm.note || 'Admin adjustment',
      })
      notify(`User wallet ${adjustForm.type === 'credit' ? 'credited' : 'debited'} successfully.`, 'success')
      setWalletAdjustModal(null)
      setAdjustForm({ type: 'credit', amount: '', note: '' })
      load(null, 'next', limit, q)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to adjust wallet balance'), 'error')
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <>
      <form onSubmit={search} className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            className="hexa-input !pl-8.5 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search customer name, email or phone..."
          />
        </div>
        <button type="submit" className="hexa-btn text-xs !py-2 !px-4">Search</button>
      </form>

      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Customer', 'Email / Phone', 'Wallet Balance', 'Loyalty Points', 'Joined', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading customer balances...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-gray-500">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 font-medium text-gray-200">
                      {item.name}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="text-gray-300">{item.email}</p>
                      <p className="font-mono text-gray-500 text-[11px]">{item.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-400 text-sm">
                      ৳{Number(item.walletBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-purple-400 font-mono text-xs">{item.loyaltyPoints || 0} pts</td>
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => viewUserWalletProfile(item)}
                          className="rounded px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 transition"
                          title="View Full Wallet Ledger"
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWalletAdjustModal(item)
                            setAdjustForm({ type: 'credit', amount: '', note: 'Admin courtesy credit' })
                          }}
                          className="rounded px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Adjust Balance"
                        >
                          ± Balance
                        </button>
                      </div>
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

      {/* View User Wallet Profile Modal */}
      <Modal
        open={Boolean(selectedUserDetail)}
        onClose={() => setSelectedUserDetail(null)}
        title={`Wallet Profile: ${selectedUserDetail?.user?.name || 'Customer'}`}
        maxWidth="max-w-3xl"
      >
        {selectedUserDetail && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl bg-[var(--hexa-surface)] p-3 border border-[var(--hexa-border)]">
              <div>
                <p className="text-[var(--hexa-muted)]">Current Balance:</p>
                <p className="text-base font-black text-emerald-400">
                  ৳{Number(selectedUserDetail.user?.walletBalance || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Loyalty Points:</p>
                <p className="text-base font-black text-purple-400">{selectedUserDetail.user?.loyaltyPoints || 0}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Email:</p>
                <p className="font-semibold text-[var(--hexa-text)] truncate">{selectedUserDetail.user?.email}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Referral Code:</p>
                <p className="font-mono font-bold text-[var(--hexa-text)]">{selectedUserDetail.user?.referralCode || '—'}</p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs text-[var(--hexa-text)] mb-2">Recent Wallet Transactions (Last 20)</h4>
              <div className="max-h-60 overflow-y-auto rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]">
                {selectedUserDetail.transactions?.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">No transaction history found for this user.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/5 bg-white/[0.02] text-gray-400">
                      <tr>
                        <th className="p-2.5 font-semibold">Type</th>
                        <th className="p-2.5 font-semibold">Amount</th>
                        <th className="p-2.5 font-semibold">Balance After</th>
                        <th className="p-2.5 font-semibold">Source</th>
                        <th className="p-2.5 font-semibold">Note</th>
                        <th className="p-2.5 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {selectedUserDetail.transactions?.map((t) => (
                        <tr key={t._id} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 uppercase font-bold text-xs">
                            <span className={t.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}>
                              {t.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold">
                            {t.type === 'credit' ? '+' : '-'}৳{t.amount?.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-gray-300">৳{t.balanceAfter?.toLocaleString()}</td>
                          <td className="p-2.5 text-purple-300 font-sans">{t.source}</td>
                          <td className="p-2.5 text-gray-300 font-sans">{t.note || '—'}</td>
                          <td className="p-2.5 text-gray-500 font-sans whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Adjust Balance Modal */}
      <Modal
        open={Boolean(walletAdjustModal)}
        onClose={() => setWalletAdjustModal(null)}
        title={`Adjust Wallet Balance for ${walletAdjustModal?.name || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={submitWalletAdjustment} className="space-y-4 text-xs">
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
            <p className="text-[var(--hexa-muted)]">Current Wallet Balance:</p>
            <p className="text-lg font-black text-emerald-400">
              ৳{Number(walletAdjustModal?.walletBalance || 0).toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Action Type <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, type: 'credit' })}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  adjustForm.type === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-[var(--hexa-surface)] text-[var(--hexa-muted)] border-[var(--hexa-border)] hover:text-white'
                }`}
              >
                + Credit (Add Money)
              </button>
              <button
                type="button"
                onClick={() => setAdjustForm({ ...adjustForm, type: 'debit' })}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  adjustForm.type === 'debit'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-[var(--hexa-surface)] text-[var(--hexa-muted)] border-[var(--hexa-border)] hover:text-white'
                }`}
              >
                - Debit (Deduct Money)
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Amount (৳ BDT) <span className="text-rose-500">*</span></label>
            <input
              type="number"
              required
              min="1"
              step="any"
              placeholder="e.g. 500"
              value={adjustForm.amount}
              onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
              className="hexa-input text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-[var(--hexa-text)]">Adjustment Reason / Note</label>
            <input
              type="text"
              placeholder="e.g. Manual promotion credit, dispute correction"
              value={adjustForm.note}
              onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
              className="hexa-input text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setWalletAdjustModal(null)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adjusting}
              className="hexa-btn text-xs font-bold"
            >
              {adjusting ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
