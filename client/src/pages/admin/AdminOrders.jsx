import { useEffect, useMemo, useState } from 'react'
import { FaBoxes, FaCopy, FaEye, FaGamepad, FaGift, FaKey, FaSearch } from 'react-icons/fa'
import { adminGet, adminPatch, adminPost } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import DeliveryDetailsViewer from '../../components/DeliveryDetailsViewer'

export default function AdminOrders() {
  const initialDelivery = {
    orderItemId: '',
    summary: 'Digital delivery',
    credType: 'account', // 'account' | 'license' | 'custom'
    email: '',
    password: '',
    pin: '',
    licenseKey: '',
    customText: '',
    instructions: '',
    inventoryItemIds: [],
  }

  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [availableInventory, setAvailableInventory] = useState([])
  const [delivery, setDelivery] = useState(initialDelivery)
  const { notify } = useToast()

  const load = () => adminGet('/orders', { q, status, limit: 80 }).then((response) => setItems(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const inspect = async (id) => {
    try {
      const [orderRes, inventoryRes] = await Promise.all([
        adminGet(`/orders/${id}`),
        adminGet('/inventory/items', { status: 'available' }),
      ])
      const order = orderRes.data
      const firstUndelivered = order.items.find((item) => !(order.deliveries || []).some((entry) => String(entry.orderItemId) === String(item._id))) || order.items[0]
      setSelected(order)
      setAvailableInventory(inventoryRes.data || [])
      setNote(order.internalNotes || '')
      setDelivery({
        ...initialDelivery,
        orderItemId: firstUndelivered?._id || '',
      })
      setOpen(true)
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const refreshSelected = async () => {
    if (!selected) return
    const [orderRes, inventoryRes] = await Promise.all([
      adminGet(`/orders/${selected._id}`),
      adminGet('/inventory/items', { status: 'available' }),
    ])
    setSelected(orderRes.data)
    setAvailableInventory(inventoryRes.data || [])
    load()
  }

  const payment = async (next) => {
    try {
      await adminPatch(`/orders/${selected._id}/payment`, { status: next, note: '' })
      notify(`Payment ${next}`)
      await refreshSelected()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const orderStatus = async (next) => {
    try {
      await adminPatch(`/orders/${selected._id}/status`, { status: next, note: '' })
      notify(`Order marked ${next}`)
      await refreshSelected()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const saveNote = async () => {
    try {
      await adminPatch(`/orders/${selected._id}/note`, { note })
      notify('Internal note saved')
      await refreshSelected()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const currentOrderItem = useMemo(
    () => selected?.items?.find((item) => String(item._id) === String(delivery.orderItemId)) || null,
    [selected, delivery.orderItemId],
  )

  const expectedInventory = useMemo(() => buildExpectedInventory(currentOrderItem), [currentOrderItem])
  const matchingInventory = useMemo(
    () => availableInventory.filter((inventory) => expectedInventory.some((expected) => inventoryMatches(inventory, expected))),
    [availableInventory, expectedInventory],
  )

  const deliveredIds = useMemo(
    () => new Set((selected?.deliveries || []).map((entry) => String(entry.orderItemId))),
    [selected],
  )
  const currentDelivered = currentOrderItem ? deliveredIds.has(String(currentOrderItem._id)) : false
  const allItemsDelivered = selected?.items?.length > 0 && selected.items.every((item) => deliveredIds.has(String(item._id)))

  const autoSelectInventory = () => {
    if (!currentOrderItem) return
    const picked = []
    const used = new Set()
    for (const expected of expectedInventory) {
      let remaining = expected.quantity
      for (const inventory of matchingInventory) {
        if (remaining <= 0) break
        if (used.has(inventory._id) || !inventoryMatches(inventory, expected)) continue
        picked.push(inventory._id)
        used.add(inventory._id)
        remaining -= 1
      }
      if (remaining > 0) {
        notify(`Not enough available protected inventory for ${expected.name}`, 'error')
        return
      }
    }
    setDelivery((current) => ({ ...current, inventoryItemIds: picked }))
    notify(`${picked.length} matching credential item(s) selected`)
  }

  const toggleInventory = (id) => {
    setDelivery((current) => ({
      ...current,
      inventoryItemIds: current.inventoryItemIds.includes(id)
        ? current.inventoryItemIds.filter((value) => value !== id)
        : [...current.inventoryItemIds, id],
    }))
  }

  const isTopUpItem = currentOrderItem && (
    currentOrderItem.productType === 'game' ||
    (currentOrderItem.customerInputs && Object.keys(currentOrderItem.customerInputs).length > 0)
  )

  const deliver = async (event) => {
    event.preventDefault()

    try {
      const payload = {
        orderItemId: delivery.orderItemId,
        summary: delivery.summary || (isTopUpItem ? `Direct Top-Up (${currentOrderItem.productName})` : 'Digital delivery'),
      }

      if (isTopUpItem) {
        payload.details = {
          deliveryType: 'topup',
          topUpStatus: 'completed',
          gameAccount: currentOrderItem.customerInputs || {},
          note: delivery.instructions?.trim() || delivery.customText?.trim() || 'Direct In-Game Top-Up Completed Successfully.',
        }
      } else if (delivery.inventoryItemIds.length) {
        payload.inventoryItemIds = delivery.inventoryItemIds
      } else {
        let details = {}
        if (delivery.credType === 'account') {
          if (!delivery.email.trim() || !delivery.password.trim()) {
            throw new Error('Email/Username and Password are required')
          }
          details = {
            email: delivery.email.trim(),
            password: delivery.password.trim(),
            ...(delivery.pin.trim() ? { profilePin: delivery.pin.trim() } : {}),
            ...(delivery.instructions.trim() ? { instructions: delivery.instructions.trim() } : {}),
          }
        } else if (delivery.credType === 'license') {
          if (!delivery.licenseKey.trim()) {
            throw new Error('License / Product Key is required')
          }
          details = {
            licenseKey: delivery.licenseKey.trim(),
            ...(delivery.instructions.trim() ? { instructions: delivery.instructions.trim() } : {}),
          }
        } else {
          if (!delivery.customText.trim()) {
            throw new Error('Please enter the delivery information')
          }
          details = {
            details: delivery.customText.trim(),
            ...(delivery.instructions.trim() ? { instructions: delivery.instructions.trim() } : {}),
          }
        }
        payload.details = details
      }

      await adminPost(`/orders/${selected._id}/delivery`, payload)
      notify(currentDelivered ? 'Delivery credentials successfully updated' : 'Delivery credentials securely assigned and unlocked for customer')
      setDelivery((current) => ({
        ...current,
        email: '',
        password: '',
        pin: '',
        licenseKey: '',
        customText: '',
        instructions: '',
        inventoryItemIds: [],
      }))
      await refreshSelected()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const search = (event) => {
    event.preventDefault()
    load()
  }

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Verify payments, inspect bundle/component stock requirements, and deliver protected inventory without splitting a bundle into customer-facing product lines."
      />

      <form onSubmit={search} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-lg">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]" />
          <input className="hexa-input !pl-11" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Order number, customer email, transaction ID" />
        </div>
        <select className="hexa-input sm:w-52" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['pending', 'payment_verification', 'confirmed', 'processing', 'delivered', 'rejected', 'cancelled', 'refunded'].map((value) => <option key={value}>{value}</option>)}
        </select>
        <button className="hexa-btn">Filter</button>
      </form>

      <div className="hexa-card overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--hexa-border)] text-xs text-[var(--hexa-muted)]">
            <tr>{['Order', 'Customer', 'Payment', 'Transaction', 'Total', 'Status', 'Placed', 'View'].map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr>
          </thead>
          <tbody>
            {items.map((order) => (
              <tr key={order._id} className="border-b border-[var(--hexa-border)] last:border-0">
                <td className="px-5 py-4 font-medium">{order.orderNumber}</td>
                <td className="px-5 py-4"><p>{order.customer?.name}</p><p className="text-xs text-[var(--hexa-muted)]">{order.customer?.email}</p></td>
                <td className="px-5 py-4"><StatusBadge value={order.payment?.status} /></td>
                <td className="px-5 py-4 font-mono text-xs text-[var(--hexa-muted)]">{order.payment?.transactionId}</td>
                <td className="px-5 py-4 font-semibold">৳{Number(order.total || 0).toLocaleString()}</td>
                <td className="px-5 py-4"><StatusBadge value={order.status} /></td>
                <td className="px-5 py-4 text-xs text-[var(--hexa-muted)]">{new Date(order.createdAt).toLocaleString()}</td>
                <td className="px-5 py-4"><button onClick={() => inspect(order._id)} className="rounded-lg p-2 text-purple-600 hover:bg-purple-500/[0.08]"><FaEye /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={selected?.orderNumber || 'Order'} maxWidth="max-w-6xl">
        {selected && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <Info label="Customer" value={`${selected.customer.name}\n${selected.customer.email}\n${selected.customer.phone}`} />
              <div className="rounded-xl border border-[var(--hexa-border)] p-4 text-xs">
                <span className="font-semibold text-[var(--hexa-muted)] block mb-1.5 uppercase tracking-wider text-[10px]">Payment Details</span>
                <p className="font-semibold text-sm text-[var(--hexa-text)]">{selected.payment.methodName}</p>
                {selected.payment.paymentAccountNumber && (
                  <p className="text-[var(--hexa-muted)] mt-0.5">
                    Account: <span className="font-mono text-purple-400">{selected.payment.paymentAccountNumber}</span>
                    {selected.payment.accountType ? ` (${selected.payment.accountType})` : ''}
                  </p>
                )}
                <p className="text-[var(--hexa-muted)] mt-1">
                  Sender: <span className="font-mono text-purple-300 font-semibold">{selected.payment.senderNumber || '—'}</span>
                </p>
                <p className="text-[var(--hexa-muted)]">
                  TrxID: <span className="font-mono font-bold text-[var(--hexa-text)]">{selected.payment.transactionId || '—'}</span>
                </p>
              </div>
              <Info label="Payment status" node={<StatusBadge value={selected.payment.status} />} />
              <Info label="Order status" node={<StatusBadge value={selected.status} />} />
            </div>

            <section className="rounded-xl border border-[var(--hexa-border)] p-5">
              <h3 className="font-semibold">Order items</h3>
              <div className="mt-3 space-y-3">
                {selected.items.map((item) => {
                  const isBundle = (item.itemType || 'product') === 'bundle'
                  const delivered = deliveredIds.has(String(item._id))
                  return (
                    <div key={item._id} className="rounded-xl border border-[var(--hexa-border)] p-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{item.productName}</p>
                            {isBundle && <span className="rounded-full bg-purple-500/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase text-purple-600"><FaGift className="mr-1 inline" />Bundle</span>}
                            {delivered && <span className="rounded-full bg-emerald-500/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Delivered</span>}
                          </div>
                          <p className="mt-1 text-xs text-[var(--hexa-muted)]">{isBundle ? `${item.components?.length || 0} component type(s)` : item.variantName || item.productType} × {item.quantity}</p>
                          {item.customerInputs && Object.keys(item.customerInputs).length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.05] p-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                                <FaGamepad /> Game Info:
                              </span>
                              {Object.entries(item.customerInputs).filter(([_, v]) => v).map(([k, v]) => (
                                <button
                                  key={k}
                                  type="button"
                                  title="Click to copy"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(String(v))
                                    notify(`Copied ${k}: ${v}`)
                                  }}
                                  className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/25"
                                >
                                  <span className="text-[10px] text-[var(--hexa-muted)] capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                                  <span>{String(v)}</span>
                                  <FaCopy className="text-[9px] opacity-70" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold">৳{Number(item.price * item.quantity).toLocaleString()}</span>
                      </div>

                      {isBundle && item.components?.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {item.components.map((component) => (
                            <div key={`${component.productId}-${component.variantId || 'base'}`} className="rounded-lg bg-purple-500/[0.04] p-3 text-xs">
                              <p className="font-semibold">{component.productName}</p>
                              <p className="mt-1 text-[var(--hexa-muted)]">{component.variantName || 'Base product'} · {component.quantityPerBundle} per bundle × {item.quantity}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 space-y-2 border-t border-[var(--hexa-border)] pt-4 text-sm">
                <PriceRow label="Subtotal" value={`৳${Number(selected.subtotal || 0).toLocaleString()}`} />
                {(selected.bundles || []).reduce((sum, bundle) => sum + Number(bundle.savings || 0), 0) > 0 && (
                  <PriceRow label="Bundle savings included" value={`৳${(selected.bundles || []).reduce((sum, bundle) => sum + Number(bundle.savings || 0), 0).toLocaleString()}`} positive />
                )}
                {selected.promotion?.discount > 0 && <PriceRow label="Campaign discount" value={`-৳${Number(selected.promotion.discount).toLocaleString()}`} />}
                {selected.coupon?.discount > 0 && <PriceRow label={`Coupon ${selected.coupon.code}`} value={`-৳${Number(selected.coupon.discount).toLocaleString()}`} />}
                {selected.walletApplied > 0 && <PriceRow label="Wallet" value={`-৳${Number(selected.walletApplied).toLocaleString()}`} />}
                <div className="flex justify-between border-t border-[var(--hexa-border)] pt-3 text-lg font-bold"><span>Total</span><span>৳{Number(selected.total || 0).toLocaleString()}</span></div>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-xl border border-[var(--hexa-border)] p-5">
                <h3 className="font-semibold">Payment verification</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { id: 'verified', label: 'Verify payment', activeLabel: '✓ Payment Verified' },
                    { id: 'rejected', label: 'Reject payment', activeLabel: '✓ Payment Rejected' },
                    { id: 'refunded', label: 'Refund payment', activeLabel: '✓ Payment Refunded' },
                  ].map((p) => {
                    const isActive = selected.payment.status === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={p.id === 'verified' && ['rejected', 'refunded'].includes(selected.payment.status)}
                        onClick={() => payment(p.id)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                            : 'border border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] hover:border-purple-500/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isActive ? p.activeLabel : p.label}
                      </button>
                    )
                  })}
                </div>

                <h3 className="mt-6 font-semibold">Fulfillment status</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['confirmed', 'processing', 'delivered', 'cancelled'].map((value) => {
                    const isActive = selected.status === value
                    const isDisabled = value === 'delivered' && (!allItemsDelivered || selected.payment.status !== 'verified')
                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => orderStatus(value)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold capitalize transition ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50'
                            : 'border border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] hover:border-purple-500/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isActive ? `✓ ${value}` : value}
                      </button>
                    )
                  })}
                </div>
                {!allItemsDelivered && <p className="mt-2 text-xs text-[var(--hexa-muted)]">The UI enables “delivered” only after every order line has a delivery record.</p>}
              </section>

              <form onSubmit={deliver} className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-semibold"><FaKey className="text-purple-600" />Secure delivery</h3>
                  {currentDelivered && (
                    <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[11px] font-bold text-purple-400">
                      Delivered · Edit to Update
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--hexa-muted)]">For bundles, select all matching protected credentials for every component. The customer receives one bundle delivery.</p>

                <label className="mt-4 block">
                  <span className="hexa-label">Order item</span>
                  <select
                    className="hexa-input"
                    value={delivery.orderItemId}
                    onChange={(event) => setDelivery((current) => ({ ...current, orderItemId: event.target.value, inventoryItemIds: [] }))}
                  >
                    {selected.items.map((item) => {
                      const isDelivered = (selected.deliveries || []).some((d) => String(d.orderItemId) === String(item._id))
                      return (
                        <option key={item._id} value={item._id}>
                          {isDelivered ? '✓ [Delivered] ' : ''}{(item.itemType || 'product') === 'bundle' ? '[Bundle] ' : ''}{item.productName}{item.variantName ? ` — ${item.variantName}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>

                {currentDelivered && (
                  <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-500/[0.08] p-3 text-xs text-purple-300">
                    ℹ️ This item has already been delivered. Entering new details below will update the credentials for the customer.
                  </div>
                )}

                {isTopUpItem ? (
                  <div className="mt-4 space-y-4 rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <FaGamepad className="text-purple-400 text-lg" />
                      <h4 className="font-bold text-sm text-[var(--hexa-text)]">
                        Direct In-Game Top-Up Fulfillment
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--hexa-muted)]">
                      Top-up the game currency directly to the player's account details below. No password or login credentials needed.
                    </p>

                    {currentOrderItem.customerInputs && Object.keys(currentOrderItem.customerInputs).length > 0 ? (
                      <div className="rounded-xl border border-purple-500/20 bg-[var(--hexa-card)] p-3.5 space-y-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Player Account Details:</span>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(currentOrderItem.customerInputs).filter(([_, v]) => v).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-purple-500/[0.06] border border-purple-500/10 p-2 text-xs">
                              <div className="min-w-0">
                                <p className="text-[10px] text-[var(--hexa-muted)] uppercase font-semibold">{k.replace(/([A-Z])/g, ' $1')}</p>
                                <p className="font-mono font-bold text-purple-300 truncate">{String(v)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(String(v))
                                  notify(`Copied ${k}: ${v}`)
                                }}
                                className="rounded bg-purple-500/20 p-1.5 text-purple-300 hover:bg-purple-500/40 transition"
                                title="Copy to clipboard"
                              >
                                <FaCopy className="text-xs" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-[var(--hexa-card)] p-3 text-xs text-[var(--hexa-muted)]">
                        No custom player IDs attached to this line.
                      </div>
                    )}

                    <label className="block">
                      <span className="hexa-label">Delivery Note / Top-Up Reference</span>
                      <input
                        className="hexa-input text-xs"
                        placeholder="e.g. Credited via Game Server / Trx Ref #98124"
                        value={delivery.instructions}
                        onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                      />
                    </label>

                    <button className="hexa-btn !bg-purple-600 hover:!bg-purple-500 w-full justify-center text-white font-bold py-3 shadow-md">
                      <FaGamepad /> {currentDelivered ? 'Update Top-Up Confirmation' : '✓ Mark Game Top-Up as Delivered'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold"><FaBoxes className="text-purple-600" />Protected inventory</p>
                          <p className="mt-1 text-xs text-[var(--hexa-muted)]">Required credential units: {expectedInventory.reduce((sum, entry) => sum + entry.quantity, 0)}</p>
                        </div>
                        <button type="button" onClick={autoSelectInventory} className="hexa-btn-secondary !px-3 !py-2 text-xs">Auto-select</button>
                      </div>

                      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto">
                        {matchingInventory.length ? matchingInventory.map((inventory) => (
                          <label key={inventory._id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs hover:bg-purple-500/[0.05]">
                            <input type="checkbox" checked={delivery.inventoryItemIds.includes(inventory._id)} onChange={() => toggleInventory(inventory._id)} />
                            <span className="min-w-0 flex-1 truncate">{inventory.product?.name || 'Product'} · {inventory.previewLabel || 'Protected item'}{inventory.variantId ? ' · variant' : ''}</span>
                          </label>
                        )) : <p className="p-2 text-xs text-[var(--hexa-muted)]">No matching available protected inventory. You can enter manual credentials below.</p>}
                      </div>
                    </div>

                    <label className="mt-3 block"><span className="hexa-label">Delivery Summary Label</span><input className="hexa-input" value={delivery.summary} onChange={(event) => setDelivery({ ...delivery, summary: event.target.value })} placeholder="e.g. Premium Account Delivery" /></label>

                    {!delivery.inventoryItemIds.length && (
                      <div className="mt-4 space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--hexa-text)]">Manual Credential Details</span>
                          <span className="text-[10px] text-purple-400 font-semibold">No vault key selected</span>
                        </div>

                        {/* Format selector */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'account', label: 'Account' },
                            { id: 'license', label: 'License Key' },
                            { id: 'custom', label: 'Custom' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setDelivery((cur) => ({ ...cur, credType: t.id }))}
                              className={`rounded-lg border py-1.5 px-2 text-xs font-semibold transition ${
                                delivery.credType === t.id
                                  ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                  : 'border-[var(--hexa-border)] text-[var(--hexa-muted)]'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {delivery.credType === 'account' && (
                          <div className="space-y-2.5 pt-1">
                            <input
                              className="hexa-input text-xs"
                              placeholder="Email or Username *"
                              value={delivery.email}
                              onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                            />
                            <input
                              className="hexa-input text-xs"
                              placeholder="Password *"
                              value={delivery.password}
                              onChange={(e) => setDelivery({ ...delivery, password: e.target.value })}
                            />
                            <input
                              className="hexa-input text-xs"
                              placeholder="Profile PIN / Screen (Optional)"
                              value={delivery.pin}
                              onChange={(e) => setDelivery({ ...delivery, pin: e.target.value })}
                            />
                          </div>
                        )}

                        {delivery.credType === 'license' && (
                          <div className="pt-1">
                            <input
                              className="hexa-input font-mono text-xs"
                              placeholder="License Key / Serial Code *"
                              value={delivery.licenseKey}
                              onChange={(e) => setDelivery({ ...delivery, licenseKey: e.target.value })}
                            />
                          </div>
                        )}

                        {delivery.credType === 'custom' && (
                          <div className="pt-1">
                            <textarea
                              rows={3}
                              className="hexa-input text-xs"
                              placeholder="Enter credentials, access link, or voucher details *"
                              value={delivery.customText}
                              onChange={(e) => setDelivery({ ...delivery, customText: e.target.value })}
                            />
                          </div>
                        )}

                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="Instructions or notes for customer (Optional)"
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </div>
                    )}

                    <button className="hexa-btn mt-4 w-full justify-center">
                      <FaKey /> {currentDelivered ? 'Update Delivered Credentials' : 'Assign & Unlock Delivery'}
                    </button>
                  </>
                )}
              </form>
            </div>

            {selected.deliveries?.length > 0 && (
              <section className="rounded-xl border border-purple-500/30 bg-purple-500/[0.03] p-5">
                <h3 className="font-bold text-base text-[var(--hexa-text)] flex items-center gap-2 mb-3">
                  <FaKey className="text-purple-500" /> Active Digital Deliveries (Delivered to Customer)
                </h3>
                <div className="space-y-4">
                  {selected.deliveries.map((deliveryEntry) => (
                    <div key={deliveryEntry._id} className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 border-b border-[var(--hexa-border)]/50 pb-2">
                        <span className="font-bold text-xs text-[var(--hexa-text)]">{deliveryEntry.summary || 'Digital Delivery'}</span>
                        <span className="text-[11px] text-[var(--hexa-muted)]">{new Date(deliveryEntry.deliveredAt).toLocaleString()}</span>
                      </div>
                      <DeliveryDetailsViewer details={deliveryEntry.details} summary={deliveryEntry.summary} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-[var(--hexa-border)] p-5">
              <h3 className="font-semibold">Internal admin note</h3>
              <p className="mt-1 text-xs text-[var(--hexa-muted)]">Visible to administrators only. Do not place passwords or login secrets here.</p>
              <textarea rows="4" maxLength="3000" className="hexa-input mt-3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Payment checks, customer follow-up, fulfillment notes…" />
              <div className="mt-3 flex justify-end"><button type="button" onClick={saveNote} className="hexa-btn-secondary !px-4 !py-2 text-sm">Save note</button></div>
            </section>

            <section className="rounded-xl border border-[var(--hexa-border)] p-5">
              <h3 className="font-semibold">Timeline</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {selected.timeline.map((event) => (
                  <div key={event._id} className="rounded-xl bg-purple-500/[0.035] p-3">
                    <p className="text-sm font-medium">{event.event}</p>
                    <p className="mt-1 text-xs text-[var(--hexa-muted)]">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </>
  )
}

function buildExpectedInventory(item) {
  if (!item) return []
  if ((item.itemType || 'product') === 'bundle') {
    return (item.components || []).map((component) => ({
      productId: String(component.productId),
      variantId: component.variantId ? String(component.variantId) : '',
      quantity: Number(component.quantityPerBundle || 1) * Number(item.quantity || 1),
      name: component.productName,
    }))
  }
  return [{
    productId: String(item.productId),
    variantId: item.variantId ? String(item.variantId) : '',
    quantity: Number(item.quantity || 1),
    name: item.productName,
  }]
}

function inventoryMatches(inventory, expected) {
  const productId = typeof inventory.product === 'object' ? inventory.product?._id : inventory.product
  return String(productId || '') === expected.productId && String(inventory.variantId || '') === expected.variantId
}

function PriceRow({ label, value, positive = false }) {
  return <div className="flex justify-between gap-3 text-[var(--hexa-muted)]"><span>{label}</span><span className={positive ? 'font-semibold text-emerald-600' : ''}>{value}</span></div>
}

function Info({ label, value, node }) {
  return (
    <div className="rounded-xl border border-[var(--hexa-border)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--hexa-muted)]">{label}</p>
      {node || <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--hexa-text-soft)]">{value}</p>}
    </div>
  )
}
