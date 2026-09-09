import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Edit02Icon, PlusSignIcon, QrCode01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import ImageUploader from '../../components/ImageUploader'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'

const blank = {
  name: '',
  slug: '',
  gatewayType: 'manual',
  logo: { url: '', publicId: '' },
  qrCode: { url: '', publicId: '' },
  accountNumber: '',
  accountType: 'Personal',
  accountName: '',
  branchName: '',
  chargeNote: '',
  instructions: '',
  active: true,
  displayOrder: 0,
  publicConfig: {},
}

const accountTypePresets = [
  'Personal',
  'Agent',
  'Merchant',
  'Send Money',
  'Cash In',
  'Payment',
  'Savings Account',
  'Current Account',
  'TRC-20',
  'BEP-20',
]

export default function AdminPaymentMethods() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [qrModal, setQrModal] = useState(null)
  const { notify } = useToast()

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    active = activeFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ && searchQ.trim()) params.q = searchQ.trim()
      if (active) params.active = active

      const r = await adminGet('/payment-methods', params)
      setItems(r.data || [])
      setMeta(r.meta || {})
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load payment methods'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, '', '').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  const search = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, activeFilter)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q, activeFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q, activeFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q, activeFilter)
  }

  const edit = (item) => {
    setEditing(item._id)
    setForm({
      ...blank,
      ...item,
      logo: item.logo || blank.logo,
      qrCode: item.qrCode || blank.qrCode,
      publicConfig: item.publicConfig || {},
    })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await adminPut(`/payment-methods/${editing}`, form)
        notify('Payment method updated')
      } else {
        await adminPost('/payment-methods', form)
        notify('Payment method created')
      }
      setOpen(false)
      load(null, 'next', limit, q, activeFilter)
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const disable = async (id) => {
    if (!confirm('Disable this payment method?')) return
    try {
      await adminDelete(`/payment-methods/${id}`)
      notify('Payment method disabled')
      load(null, 'next', limit, q, activeFilter)
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const manual = form.gatewayType === 'manual'

  return (
    <>
      <AdminPageHeader
        title="Payment methods"
        description="Configure customer payment numbers, QR codes, account types, and step-by-step instructions displayed at checkout."
        action={
          <button
            onClick={() => {
              setEditing(null)
              setForm(blank)
              setOpen(true)
            }}
            className="hexa-btn"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add method
          </button>
        }
      />

      <form onSubmit={search} className="mb-5 flex flex-wrap gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]" />
          <input
            className="hexa-input !pl-9 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, slug or account type..."
          />
        </div>
        <select
          className="hexa-input sm:w-40 text-xs"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Disabled Only</option>
        </select>
        <button className="hexa-btn text-xs !py-2 !px-4">Search</button>
      </form>

      <div className="hexa-card overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-[var(--hexa-border)] text-xs text-[var(--hexa-muted)]">
            <tr>
              {['Method', 'Gateway', 'Account Number', 'Account Type & Name', 'QR', 'Order', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="border-b border-[var(--hexa-border)]/50 hover:bg-[var(--hexa-surface)]/40 transition">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {item.logo?.url ? (
                      <img src={item.logo.url} className="h-9 w-9 rounded-lg object-contain bg-white/5 p-1" alt="" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-[var(--hexa-text)]">{item.name}</span>
                      {item.chargeNote && (
                        <p className="text-[11px] text-[var(--hexa-muted)]">{item.chargeNote}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge value={item.gatewayType || 'manual'} />
                </td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-purple-400">
                    {item.accountNumber || '—'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="space-y-0.5">
                    <span className="inline-block rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-300">
                      {item.accountType || 'Standard'}
                    </span>
                    {item.accountName && (
                      <p className="text-xs text-[var(--hexa-muted)]">{item.accountName}</p>
                    )}
                    {item.branchName && (
                      <p className="text-[11px] text-gray-500">{item.branchName}</p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {item.qrCode?.url ? (
                    <button
                      type="button"
                      onClick={() => setQrModal(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition"
                    >
                      <HugeiconsIcon icon={QrCode01Icon} size={14} /> View
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </td>
                <td className="px-5 py-4 font-mono text-xs text-[var(--hexa-muted)]">{item.displayOrder}</td>
                <td className="px-5 py-4">
                  <StatusBadge value={item.active ? 'active' : 'inactive'} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => edit(item)} className="p-2 text-purple-400 hover:text-purple-300 transition" title="Edit method">
                      <HugeiconsIcon icon={Edit02Icon} size={16} />
                    </button>
                    <button onClick={() => disable(item._id)} className="p-2 text-rose-400 hover:text-rose-300 transition" title="Disable method">
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit payment method' : 'Add payment method'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="hexa-label">Method Name</span>
              <input
                required
                className="hexa-input"
                placeholder="e.g. bKash Personal, Nagad Agent, Bank Transfer"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              <span className="hexa-label">Gateway type</span>
              <select
                className="hexa-input"
                value={form.gatewayType}
                onChange={(e) => setForm({ ...form, gatewayType: e.target.value })}
              >
                <option value="manual">Manual verification (bKash/Nagad/Bank)</option>
                <option value="external">External gateway</option>
                <option value="wallet">Wallet / store credit</option>
              </select>
            </label>

            {manual && (
              <>
                <label>
                  <span className="hexa-label">Account Number / Phone / Wallet Address</span>
                  <input
                    required
                    className="hexa-input font-mono"
                    placeholder="01XXXXXXXXX or Bank Account No"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  />
                </label>

                <label>
                  <span className="hexa-label">Account Type / Channel</span>
                  <div className="space-y-1.5">
                    <input
                      required
                      className="hexa-input"
                      placeholder="Personal, Agent, Merchant, Send Money"
                      value={form.accountType}
                      onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    />
                    <div className="flex flex-wrap gap-1">
                      {accountTypePresets.slice(0, 5).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setForm({ ...form, accountType: preset })}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            form.accountType === preset
                              ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                              : 'border-[var(--hexa-border)] text-[var(--hexa-muted)] hover:border-purple-500/40'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </label>

                <label>
                  <span className="hexa-label">Account Holder / Beneficiary Name (Optional)</span>
                  <input
                    className="hexa-input"
                    placeholder="e.g. HEXA Store / John Doe"
                    value={form.accountName}
                    onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  />
                </label>

                <label>
                  <span className="hexa-label">Branch / Network / Routing Info (Optional)</span>
                  <input
                    className="hexa-input"
                    placeholder="e.g. Gulshan Branch / TRC-20"
                    value={form.branchName}
                    onChange={(e) => setForm({ ...form, branchName: e.target.value })}
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="hexa-label">Fee / Charge Note (Optional)</span>
                  <input
                    className="hexa-input"
                    placeholder="e.g. Send Money is free, or Please add 1.5% fee for cash out"
                    value={form.chargeNote}
                    onChange={(e) => setForm({ ...form, chargeNote: e.target.value })}
                  />
                </label>
              </>
            )}

            <label>
              <span className="hexa-label">Display order</span>
              <input
                type="number"
                min="0"
                className="hexa-input"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </label>
          </div>

          <label>
            <span className="hexa-label">Customer Payment Instructions</span>
            <textarea
              required={manual}
              rows="5"
              className="hexa-input"
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder={
                manual
                  ? `1. Open your payment app\n2. Select Send Money / Transfer\n3. Enter the account number above\n4. Enter the payable amount\n5. Copy the Transaction ID (TrxID) and enter it below.`
                  : 'Explain what happens when this payment option is selected.'
              }
            />
            <p className="mt-1 text-xs text-[var(--hexa-muted)]">
              These instructions and the account number will be shown clearly to the customer on the checkout screen and in their order timeline.
            </p>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader folder="payment-methods" label="Method Logo" value={form.logo} onChange={(logo) => setForm({ ...form, logo })} />
            <ImageUploader folder="payment-methods" label="Payment QR Code (Optional)" value={form.qrCode} onChange={(qrCode) => setForm({ ...form, qrCode })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--hexa-text)]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-[var(--hexa-border)] text-purple-600 focus:ring-purple-500"
            />
            Active (Visible to customers at checkout)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="hexa-btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="hexa-btn">Save method</button>
          </div>
        </form>
      </Modal>

      {qrModal && (
        <Modal open={Boolean(qrModal)} onClose={() => setQrModal(null)} title={`${qrModal.name} QR Code`}>
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {qrModal.qrCode?.url ? (
              <img src={qrModal.qrCode.url} alt="QR Code" className="max-h-72 rounded-2xl border border-[var(--hexa-border)] p-2 bg-white" />
            ) : (
              <p className="text-sm text-[var(--hexa-muted)]">No QR Code uploaded.</p>
            )}
            <p className="mt-3 font-mono font-bold text-lg text-[var(--hexa-text)]">{qrModal.accountNumber}</p>
            <p className="text-xs text-[var(--hexa-muted)]">{qrModal.accountType}</p>
          </div>
        </Modal>
      )}
    </>
  )
}
