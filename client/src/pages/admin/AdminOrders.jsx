import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkCircle01Icon,
  Clock01Icon,
  Copy01Icon,
  Edit02Icon,
  GameController01Icon,
  GiftIcon,
  Key01Icon,
  PackageIcon,
  PlusSignIcon,
  Search01Icon,
  Tv01Icon,
  UserCircleIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import { adminGet, adminPatch, adminPost } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import DeliveryDetailsViewer from '../../components/DeliveryDetailsViewer'

const defaultDeliveryState = {
  orderItemId: '',
  summary: '',
  credType: 'subscription', // 'subscription' | 'license' | 'topup' | 'giftcard' | 'account' | 'custom' | 'vault'
  email: '',
  password: '',
  profileName: '',
  pin: '',
  licenseKey: '',
  activationCode: '',
  expiryDate: '',
  referenceId: '',
  downloadUrl: '',
  customText: '',
  instructions: '',
  customFields: [],
  inventoryItemIds: [],
  markDelivered: true,
}

function getInitialDeliveryForItem(item, existingDelivery, order) {
  if (!item) return defaultDeliveryState

  if (existingDelivery && existingDelivery.details) {
    const d = existingDelivery.details
    let credType = 'custom'
    let email = ''
    let password = ''
    let profileName = ''
    let pin = ''
    let licenseKey = ''
    let activationCode = ''
    let expiryDate = ''
    let referenceId = ''
    let downloadUrl = ''
    let customText = ''
    let instructions = ''
    const customFields = []

    if (d.deliveryType === 'topup' || d.topUpStatus === 'completed') {
      credType = 'topup'
      referenceId = d.referenceId || ''
      instructions = d.note || ''
    } else if (d.licenseKey || d.key || d.license || d.serial) {
      credType = 'license'
      licenseKey = d.licenseKey || d.key || d.license || d.serial || ''
      activationCode = d.activationCode || (d.code && d.code !== licenseKey ? d.code : '')
      downloadUrl = d.url || d.downloadUrl || d.link || ''
      expiryDate = d.expiryDate || d.expiresAt || ''
      instructions = d.instructions || d.notes || d.note || ''
    } else if (d.email || d.username || d.password) {
      credType = (item.productType === 'subscription' || item.fulfillmentType === 'account_credentials') ? 'subscription' : 'account'
      email = d.email || d.username || d.account || ''
      password = d.password || d.pass || ''
      profileName = d.profileName || d.profileSlot || ''
      pin = d.pin || d.profilePin || d.screen || ''
      expiryDate = d.expiryDate || d.expiresAt || ''
      downloadUrl = d.url || d.loginUrl || d.link || ''
      instructions = d.instructions || d.notes || d.note || ''
    } else if (d.giftCardCode || d.voucherCode) {
      credType = 'giftcard'
      licenseKey = d.giftCardCode || d.voucherCode || ''
      pin = d.pin || ''
      expiryDate = d.expiryDate || d.expiresAt || ''
      downloadUrl = d.url || d.link || ''
      instructions = d.instructions || d.notes || d.note || ''
    } else if (typeof d === 'string') {
      credType = 'custom'
      customText = d
    } else if (d.details) {
      credType = 'custom'
      customText = typeof d.details === 'string' ? d.details : JSON.stringify(d.details, null, 2)
      instructions = d.instructions || d.notes || d.note || ''
    }

    const standardKeys = new Set([
      'email', 'username', 'user', 'login', 'account',
      'password', 'pass', 'secret',
      'key', 'licenseKey', 'license', 'serial',
      'activationCode', 'code',
      'profileName', 'profileSlot',
      'pin', 'profilePin', 'profile', 'screen',
      'expiryDate', 'expiresAt', 'validUntil', 'expiration',
      'referenceId', 'transactionId', 'trxId', 'orderRef',
      'url', 'link', 'loginUrl', 'downloadUrl',
      'instructions', 'notes', 'note', 'guide',
      'productName', 'variantName', 'productId', 'variantId',
      'deliveryType', 'topUpStatus', 'gameAccount', 'details',
    ])

    if (typeof d === 'object' && d !== null) {
      for (const [k, v] of Object.entries(d)) {
        if (!standardKeys.has(k) && v !== undefined && v !== null) {
          customFields.push({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })
        }
      }
    }

    return {
      orderItemId: item._id,
      summary: existingDelivery.summary || `${item.productName} credentials`,
      credType,
      email,
      password,
      profileName,
      pin,
      licenseKey,
      activationCode,
      expiryDate,
      referenceId,
      downloadUrl,
      customText,
      instructions,
      customFields,
      inventoryItemIds: [],
      markDelivered: order?.status !== 'delivered',
    }
  }

  // Determine default credType based on product/fulfillment type
  let defaultType = 'license'
  if (item.productType === 'subscription' || item.fulfillmentType === 'account_credentials') {
    defaultType = 'subscription'
  } else if (
    item.productType === 'game' ||
    item.productType === 'game_topup' ||
    item.fulfillmentType === 'api_topup' ||
    (item.customerInputs && Object.keys(item.customerInputs).length > 0)
  ) {
    defaultType = 'topup'
  } else if (
    item.productType === 'software' ||
    item.productType === 'software_license' ||
    item.productType === 'game_license' ||
    item.fulfillmentType === 'license_key'
  ) {
    defaultType = 'license'
  } else if (item.productType === 'gift_card') {
    defaultType = 'giftcard'
  } else if (item.productType === 'account' || item.productType === 'digital_account') {
    defaultType = 'account'
  }

  return {
    orderItemId: item._id,
    summary: `${item.productName} fulfillment`,
    credType: defaultType,
    email: '',
    password: '',
    profileName: '',
    pin: '',
    licenseKey: '',
    activationCode: '',
    expiryDate: item.variantDuration || '',
    referenceId: '',
    downloadUrl: '',
    customText: '',
    instructions: '',
    customFields: [],
    inventoryItemIds: [],
    markDelivered: true,
  }
}

export default function AdminOrders() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [availableInventory, setAvailableInventory] = useState([])
  const [delivery, setDelivery] = useState(defaultDeliveryState)
  const { notify } = useToast()

  const load = async (queryQ = q, queryStatus = status, queryPayment = paymentStatus) => {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (queryQ && queryQ.trim()) params.q = queryQ.trim()
      if (queryStatus && queryStatus.trim()) params.status = queryStatus.trim()
      if (queryPayment && queryPayment.trim()) params.paymentStatus = queryPayment.trim()
      const response = await adminGet('/orders', params)
      setItems(response.data || [])
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load('', '', '').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusChange = (val) => {
    setStatus(val)
    load(q, val, paymentStatus)
  }

  const handlePaymentStatusChange = (val) => {
    setPaymentStatus(val)
    load(q, status, val)
  }

  const resetFilters = () => {
    setQ('')
    setStatus('')
    setPaymentStatus('')
    load('', '', '')
  }

  const search = (event) => {
    event.preventDefault()
    load(q, status, paymentStatus)
  }

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

      const existingDelivery = (order.deliveries || []).find((entry) => String(entry.orderItemId) === String(firstUndelivered?._id))
      setDelivery(getInitialDeliveryForItem(firstUndelivered, existingDelivery, order))
      setOpen(true)
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const selectOrderItem = (orderItemId, currentOrder = selected) => {
    if (!currentOrder) return
    const item = currentOrder.items.find((i) => String(i._id) === String(orderItemId)) || currentOrder.items[0]
    if (!item) return
    const existingDelivery = (currentOrder.deliveries || []).find((d) => String(d.orderItemId) === String(item._id))
    const populated = getInitialDeliveryForItem(item, existingDelivery, currentOrder)
    setDelivery(populated)
  }

  const refreshSelected = async () => {
    if (!selected) return
    const [orderRes, inventoryRes] = await Promise.all([
      adminGet(`/orders/${selected._id}`),
      adminGet('/inventory/items', { status: 'available' }),
    ])
    const order = orderRes.data
    setSelected(order)
    setAvailableInventory(inventoryRes.data || [])
    load(q, status, paymentStatus)

    // Refresh active delivery form with updated credentials for current item
    const currentItem = order.items.find((i) => String(i._id) === String(delivery.orderItemId)) || order.items[0]
    if (currentItem) {
      const existingDelivery = (order.deliveries || []).find((d) => String(d.orderItemId) === String(currentItem._id))
      setDelivery(getInitialDeliveryForItem(currentItem, existingDelivery, order))
    }
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

  const addCustomField = () => {
    setDelivery((current) => ({
      ...current,
      customFields: [...(current.customFields || []), { key: '', value: '' }],
    }))
  }

  const updateCustomField = (index, field, val) => {
    setDelivery((current) => {
      const copy = [...(current.customFields || [])]
      copy[index] = { ...copy[index], [field]: val }
      return { ...current, customFields: copy }
    })
  }

  const removeCustomField = (index) => {
    setDelivery((current) => ({
      ...current,
      customFields: (current.customFields || []).filter((_, i) => i !== index),
    }))
  }

  const isTopUpItem = currentOrderItem && (
    currentOrderItem.productType === 'game' ||
    currentOrderItem.productType === 'game_topup' ||
    currentOrderItem.fulfillmentType === 'api_topup' ||
    (currentOrderItem.customerInputs && Object.keys(currentOrderItem.customerInputs).length > 0)
  )

  const deliver = async (event) => {
    event.preventDefault()

    try {
      const payload = {
        orderItemId: delivery.orderItemId,
        summary: delivery.summary || (isTopUpItem ? `In-Game Top-Up (${currentOrderItem?.productName})` : `${currentOrderItem?.productName || 'Digital item'} delivery`),
        markDelivered: Boolean(delivery.markDelivered),
      }

      if (delivery.credType === 'vault') {
        if (!delivery.inventoryItemIds.length) {
          throw new Error('Please select at least one protected inventory item from the vault')
        }
        payload.inventoryItemIds = delivery.inventoryItemIds
      } else if (delivery.credType === 'topup' || isTopUpItem) {
        payload.details = {
          deliveryType: 'topup',
          topUpStatus: 'completed',
          gameAccount: currentOrderItem?.customerInputs || {},
          referenceId: delivery.referenceId?.trim() || undefined,
          note: delivery.instructions?.trim() || delivery.customText?.trim() || 'Direct In-Game Top-Up Completed Successfully.',
        }
      } else {
        const details = {}

        if (delivery.credType === 'subscription' || delivery.credType === 'account') {
          if (!delivery.email.trim() || !delivery.password.trim()) {
            throw new Error('Email/Username and Password are required')
          }
          details.email = delivery.email.trim()
          details.password = delivery.password.trim()
          if (delivery.profileName?.trim()) details.profileName = delivery.profileName.trim()
          if (delivery.pin?.trim()) details.pin = delivery.pin.trim()
          if (delivery.expiryDate?.trim()) details.expiryDate = delivery.expiryDate.trim()
          if (delivery.downloadUrl?.trim()) details.url = delivery.downloadUrl.trim()
          if (delivery.instructions?.trim()) details.instructions = delivery.instructions.trim()
        } else if (delivery.credType === 'license') {
          if (!delivery.licenseKey.trim()) {
            throw new Error('License / Product Key is required')
          }
          details.licenseKey = delivery.licenseKey.trim()
          if (delivery.activationCode?.trim()) details.activationCode = delivery.activationCode.trim()
          if (delivery.downloadUrl?.trim()) details.url = delivery.downloadUrl.trim()
          if (delivery.expiryDate?.trim()) details.expiryDate = delivery.expiryDate.trim()
          if (delivery.instructions?.trim()) details.instructions = delivery.instructions.trim()
        } else if (delivery.credType === 'giftcard') {
          if (!delivery.licenseKey.trim()) {
            throw new Error('Gift Card / Voucher Code is required')
          }
          details.code = delivery.licenseKey.trim()
          if (delivery.pin?.trim()) details.pin = delivery.pin.trim()
          if (delivery.expiryDate?.trim()) details.expiryDate = delivery.expiryDate.trim()
          if (delivery.downloadUrl?.trim()) details.url = delivery.downloadUrl.trim()
          if (delivery.instructions?.trim()) details.instructions = delivery.instructions.trim()
        } else {
          // custom
          if (!delivery.customText.trim() && !(delivery.customFields || []).length) {
            throw new Error('Please enter the delivery credentials or custom fields')
          }
          if (delivery.customText.trim()) details.details = delivery.customText.trim()
          if (delivery.instructions?.trim()) details.instructions = delivery.instructions.trim()
        }

        // Attach any extra dynamic custom fields
        for (const cf of delivery.customFields || []) {
          if (cf.key?.trim() && cf.value?.trim()) {
            details[cf.key.trim()] = cf.value.trim()
          }
        }

        payload.details = details
      }

      await adminPost(`/orders/${selected._id}/delivery`, payload)
      notify(currentDelivered ? 'Delivery credentials successfully updated' : 'Delivery credentials securely assigned and unlocked for customer')
      await refreshSelected()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description="Verify payments, inspect bundle/component stock requirements, and deliver protected inventory without splitting a bundle into customer-facing product lines."
      />

      <form onSubmit={search} className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]" />
          <input
            className="hexa-input !pl-11"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search order #, customer, email, phone, trx ID, product..."
          />
        </div>

        <select
          className="hexa-input sm:w-44 font-medium"
          value={status}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          <option value="">All order statuses</option>
          {['pending', 'payment_verification', 'confirmed', 'processing', 'delivered', 'rejected', 'cancelled', 'refunded'].map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          className="hexa-input sm:w-44 font-medium"
          value={paymentStatus}
          onChange={(event) => handlePaymentStatusChange(event.target.value)}
        >
          <option value="">All payment statuses</option>
          {['unpaid', 'submitted', 'verified', 'rejected', 'refunded'].map((value) => (
            <option key={value} value={value}>
              Payment: {value}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button type="submit" className="hexa-btn !px-4 !py-2.5">
            Filter
          </button>
          {(q || status || paymentStatus) && (
            <button
              type="button"
              onClick={resetFilters}
              className="hexa-btn-secondary !px-3 !py-2.5 text-xs"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <div className="hexa-card overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--hexa-card)]/60 backdrop-blur-xs">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        )}
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--hexa-border)] text-xs text-[var(--hexa-muted)]">
            <tr>{['Order', 'Customer', 'Payment', 'Transaction', 'Total', 'Status', 'Placed', 'View'].map((header) => <th key={header} className="px-5 py-4">{header}</th>)}</tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((order) => (
                <tr key={order._id} className="border-b border-[var(--hexa-border)] last:border-0 hover:bg-white/[0.01]">
                  <td className="px-5 py-4 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-4"><p>{order.customer?.name}</p><p className="text-xs text-[var(--hexa-muted)]">{order.customer?.email}</p></td>
                  <td className="px-5 py-4"><StatusBadge value={order.payment?.status} /></td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--hexa-muted)]">{order.payment?.transactionId || '—'}</td>
                  <td className="px-5 py-4 font-semibold">৳{Number(order.total || 0).toLocaleString()}</td>
                  <td className="px-5 py-4"><StatusBadge value={order.status} /></td>
                  <td className="px-5 py-4 text-xs text-[var(--hexa-muted)]">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4"><button type="button" onClick={() => inspect(order._id)} className="rounded-lg p-2 text-purple-600 hover:bg-purple-500/[0.08]"><HugeiconsIcon icon={ViewIcon} size={16} /></button></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-5 py-12 text-center text-sm text-[var(--hexa-muted)]">
                  {loading ? 'Loading orders...' : 'No orders found matching the filter criteria.'}
                </td>
              </tr>
            )}
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
                            {isBundle && <span className="rounded-full bg-purple-500/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase text-purple-600"><HugeiconsIcon icon={GiftIcon} size={11} className="mr-1 inline" />Bundle</span>}
                            {delivered && <span className="rounded-full bg-emerald-500/[0.09] px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">Delivered</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--hexa-muted)]">
                            <span>{isBundle ? `${item.components?.length || 0} component type(s)` : item.variantName || item.productType} × {item.quantity}</span>
                            {item.variantRegion && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                                {item.variantRegion}
                              </span>
                            )}
                            {item.variantPlatform && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                                {item.variantPlatform}
                              </span>
                            )}
                            {item.variantSku && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                                SKU: {item.variantSku}
                              </span>
                            )}
                          </div>
                          {item.dynamicFieldSnapshots?.length > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.05] p-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                                <HugeiconsIcon icon={GameController01Icon} size={13} /> Customer Data:
                              </span>
                              {item.dynamicFieldSnapshots.map((f, fIdx) => (
                                <button
                                  key={`item-df-${item._id}-${f.name || fIdx}`}
                                  type="button"
                                  title="Click to copy"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(String(f.value))
                                    notify(`Copied ${f.label}: ${f.value}`)
                                  }}
                                  className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/25"
                                >
                                  <span className="text-[10px] text-[var(--hexa-muted)]">{f.label}:</span>
                                  <span>{String(f.value)}</span>
                                  <HugeiconsIcon icon={Copy01Icon} size={10} className="opacity-70" />
                                </button>
                              ))}
                            </div>
                          ) : item.customerInputs && Object.keys(item.customerInputs).length > 0 && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.05] p-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                                <HugeiconsIcon icon={GameController01Icon} size={13} /> Customer Data:
                              </span>
                              {Object.entries(item.customerInputs).filter(([, v]) => v).map(([k, v]) => (
                                <button
                                  key={`item-ci-${item._id}-${k}`}
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
                                  <HugeiconsIcon icon={Copy01Icon} size={10} className="opacity-70" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-semibold">৳{Number(item.price * item.quantity).toLocaleString()}</span>
                      </div>

                      {isBundle && item.components?.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {item.components.map((component, compIdx) => (
                            <div key={`comp-${item._id}-${component.productId}-${component.variantId || compIdx}`} className="rounded-lg bg-purple-500/[0.04] p-3 text-xs">
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

              <form onSubmit={deliver} className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--hexa-border)] pb-4">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-base text-[var(--hexa-text)]">
                      <HugeiconsIcon icon={Key01Icon} size={18} className="text-purple-400" />
                      Order Fulfillment & Credential Delivery
                    </h3>
                    <p className="mt-1 text-xs text-[var(--hexa-muted)]">
                      Assign, inspect, or edit decrypted credentials for each order item.
                    </p>
                  </div>
                  {currentDelivered ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 self-start sm:self-auto">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={13} /> Delivered · Live Editing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400 self-start sm:self-auto">
                      <HugeiconsIcon icon={Clock01Icon} size={13} /> Pending Fulfillment
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <label className="block">
                    <span className="hexa-label">Select Order Item to Fulfill</span>
                    <select
                      className="hexa-input font-medium"
                      value={delivery.orderItemId}
                      onChange={(event) => selectOrderItem(event.target.value)}
                    >
                      {selected.items.map((item) => {
                        const isDelivered = (selected.deliveries || []).some((d) => String(d.orderItemId) === String(item._id))
                        return (
                          <option key={item._id} value={item._id}>
                            {isDelivered ? '✓ [Delivered] ' : '⏳ [Pending] '}
                            {(item.itemType || 'product') === 'bundle' ? '[Bundle] ' : ''}
                            {item.productName}
                            {item.variantName ? ` — ${item.variantName}` : ''}
                            {` (Qty: ${item.quantity})`}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                </div>

                {currentDelivered && (
                  <div className="mt-3.5 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 text-xs text-purple-200 flex items-start gap-2">
                    <HugeiconsIcon icon={Edit02Icon} size={16} className="shrink-0 mt-0.5 text-purple-400" />
                    <div>
                      <p className="font-semibold text-purple-300">Previously Delivered Credentials Loaded</p>
                      <p className="mt-0.5 text-purple-200/80">
                        Editing the fields below will immediately update the delivered credentials in the customer&apos;s account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery Type Switcher Tabs */}
                <div className="mt-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--hexa-muted)] block mb-2">
                    Fulfillment / Credential Type
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'subscription', label: 'Subscription', icon: Tv01Icon },
                      { id: 'license', label: 'License / Key', icon: Key01Icon },
                      { id: 'topup', label: 'Game Top-Up', icon: GameController01Icon },
                      { id: 'giftcard', label: 'Gift Card', icon: GiftIcon },
                      { id: 'account', label: 'Account Login', icon: UserCircleIcon },
                      { id: 'custom', label: 'Custom Text', icon: Edit02Icon },
                      { id: 'vault', label: 'Vault Inventory', icon: PackageIcon },
                    ].map((tab) => {
                      const isActive = delivery.credType === tab.id
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setDelivery((current) => ({ ...current, credType: tab.id }))}
                          className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                            isActive
                              ? 'border-purple-500 bg-purple-500/15 text-purple-300 shadow-xs'
                              : 'border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 text-[var(--hexa-muted)] hover:border-purple-500/30 hover:text-[var(--hexa-text)]'
                          }`}
                        >
                          <HugeiconsIcon icon={Icon} size={14} />
                          <span>{tab.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Form Fields by credType */}
                <div className="mt-5 space-y-4">
                  {/* Subscription Form */}
                  {delivery.credType === 'subscription' && (
                    <div className="space-y-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">Account Email / Username *</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="user@example.com"
                            value={delivery.email}
                            onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Password *</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="Account password"
                            value={delivery.password}
                            onChange={(e) => setDelivery({ ...delivery, password: e.target.value })}
                            required
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <label className="block">
                          <span className="hexa-label">Profile Name / Slot</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. Profile 3 / Slot 1"
                            value={delivery.profileName}
                            onChange={(e) => setDelivery({ ...delivery, profileName: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">PIN / Screen Lock</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="e.g. 1234"
                            value={delivery.pin}
                            onChange={(e) => setDelivery({ ...delivery, pin: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Expiry Date / Duration</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. 30 Days / 2026-10-15"
                            value={delivery.expiryDate}
                            onChange={(e) => setDelivery({ ...delivery, expiryDate: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="hexa-label">Service / Login URL</span>
                        <input
                          className="hexa-input text-xs"
                          placeholder="https://..."
                          value={delivery.downloadUrl}
                          onChange={(e) => setDelivery({ ...delivery, downloadUrl: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="hexa-label">Delivery Instructions / Rules</span>
                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="e.g. Do not change profile name or master password. Use assigned profile only."
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {/* License Key Form */}
                  {delivery.credType === 'license' && (
                    <div className="space-y-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
                      <label className="block">
                        <span className="hexa-label">License Key / Product Serial *</span>
                        <input
                          className="hexa-input text-xs font-mono font-bold tracking-wider"
                          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                          value={delivery.licenseKey}
                          onChange={(e) => setDelivery({ ...delivery, licenseKey: e.target.value })}
                          required
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">Activation Code / Token</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="Optional secondary activation token"
                            value={delivery.activationCode}
                            onChange={(e) => setDelivery({ ...delivery, activationCode: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Expiry Date / Validity</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. Lifetime / 1 Year"
                            value={delivery.expiryDate}
                            onChange={(e) => setDelivery({ ...delivery, expiryDate: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="hexa-label">Download URL / Official Setup Link</span>
                        <input
                          className="hexa-input text-xs"
                          placeholder="https://..."
                          value={delivery.downloadUrl}
                          onChange={(e) => setDelivery({ ...delivery, downloadUrl: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="hexa-label">Activation Instructions</span>
                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="Step-by-step activation guide or notes for customer"
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {/* Game Top-Up Form */}
                  {delivery.credType === 'topup' && (
                    <div className="space-y-4 rounded-xl border border-purple-500/30 bg-purple-500/[0.04] p-4">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={GameController01Icon} size={20} className="text-purple-400" />
                        <h4 className="font-bold text-sm text-[var(--hexa-text)]">
                          Direct In-Game Top-Up Fulfillment
                        </h4>
                      </div>

                      {/* Customer player info */}
                      {currentOrderItem?.dynamicFieldSnapshots?.length > 0 ? (
                        <div className="rounded-xl border border-purple-500/20 bg-[var(--hexa-card)] p-3.5 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Player Account Data (Click to copy):
                          </span>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {currentOrderItem.dynamicFieldSnapshots.map((f, fIdx) => (
                              <button
                                key={`topup-df-${currentOrderItem?._id || 'topup'}-${f.name || fIdx}`}
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(String(f.value))
                                  notify(`Copied ${f.label}: ${f.value}`)
                                }}
                                className="flex items-center justify-between gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-left hover:bg-purple-500/20 transition"
                              >
                                <div className="min-w-0">
                                  <p className="text-[10px] text-[var(--hexa-muted)] font-semibold">{f.label}</p>
                                  <p className="font-mono text-xs font-bold text-purple-300 truncate">{String(f.value)}</p>
                                </div>
                                <HugeiconsIcon icon={Copy01Icon} size={14} className="text-purple-400 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : currentOrderItem?.customerInputs && Object.keys(currentOrderItem.customerInputs).length > 0 ? (
                        <div className="rounded-xl border border-purple-500/20 bg-[var(--hexa-card)] p-3.5 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                            Player Account Data (Click to copy):
                          </span>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {Object.entries(currentOrderItem.customerInputs).filter(([, v]) => v).map(([k, v]) => (
                              <button
                                key={`topup-ci-${currentOrderItem?._id || 'topup'}-${k}`}
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(String(v))
                                  notify(`Copied ${k}: ${v}`)
                                }}
                                className="flex items-center justify-between gap-2 rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-left hover:bg-purple-500/20 transition"
                              >
                                <div className="min-w-0">
                                  <p className="text-[10px] text-[var(--hexa-muted)] uppercase font-semibold">{k.replace(/([A-Z])/g, ' $1')}</p>
                                  <p className="font-mono text-xs font-bold text-purple-300 truncate">{String(v)}</p>
                                </div>
                                <HugeiconsIcon icon={Copy01Icon} size={14} className="text-purple-400 shrink-0" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--hexa-muted)]">No custom player IDs attached to this line.</p>
                      )}

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">Top-Up Reference / Trx ID</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="e.g. MOOGOLD-98124 / UNIPIN-7821"
                            value={delivery.referenceId}
                            onChange={(e) => setDelivery({ ...delivery, referenceId: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Confirmation Note</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. Direct In-Game Top-Up Completed."
                            value={delivery.instructions}
                            onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Gift Card Form */}
                  {delivery.credType === 'giftcard' && (
                    <div className="space-y-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
                      <label className="block">
                        <span className="hexa-label">Gift Card Code / Voucher PIN *</span>
                        <input
                          className="hexa-input text-xs font-mono font-bold tracking-wider"
                          placeholder="XXXX-XXXX-XXXX-XXXX"
                          value={delivery.licenseKey}
                          onChange={(e) => setDelivery({ ...delivery, licenseKey: e.target.value })}
                          required
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">Card PIN / Security Code</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="PIN (if applicable)"
                            value={delivery.pin}
                            onChange={(e) => setDelivery({ ...delivery, pin: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Expiry Date</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. No Expiry / 2026-12-31"
                            value={delivery.expiryDate}
                            onChange={(e) => setDelivery({ ...delivery, expiryDate: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="hexa-label">Redemption Page URL</span>
                        <input
                          className="hexa-input text-xs"
                          placeholder="https://..."
                          value={delivery.downloadUrl}
                          onChange={(e) => setDelivery({ ...delivery, downloadUrl: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="hexa-label">Redemption Instructions</span>
                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="How the customer should redeem this gift card"
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {/* Digital Account Form */}
                  {delivery.credType === 'account' && (
                    <div className="space-y-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">Account Email / Username *</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="username / email"
                            value={delivery.email}
                            onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                            required
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Password *</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="account password"
                            value={delivery.password}
                            onChange={(e) => setDelivery({ ...delivery, password: e.target.value })}
                            required
                          />
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                          <span className="hexa-label">2FA / Backup Key / PIN</span>
                          <input
                            className="hexa-input text-xs font-mono"
                            placeholder="Optional backup code or PIN"
                            value={delivery.pin}
                            onChange={(e) => setDelivery({ ...delivery, pin: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="hexa-label">Expiry / Guarantee Period</span>
                          <input
                            className="hexa-input text-xs"
                            placeholder="e.g. 6 Months Warranty"
                            value={delivery.expiryDate}
                            onChange={(e) => setDelivery({ ...delivery, expiryDate: e.target.value })}
                          />
                        </label>
                      </div>
                      <label className="block">
                        <span className="hexa-label">Login Portal URL</span>
                        <input
                          className="hexa-input text-xs"
                          placeholder="https://..."
                          value={delivery.downloadUrl}
                          onChange={(e) => setDelivery({ ...delivery, downloadUrl: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="hexa-label">Delivery Notes & Security Instructions</span>
                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="Security instructions, 2FA recovery rules, or customer guide"
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {/* Custom Text Form */}
                  {delivery.credType === 'custom' && (
                    <div className="space-y-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
                      <label className="block">
                        <span className="hexa-label">Custom Delivery Details / Credentials</span>
                        <textarea
                          rows={4}
                          className="hexa-input text-xs font-mono"
                          placeholder="Enter license keys, login links, custom access credentials..."
                          value={delivery.customText}
                          onChange={(e) => setDelivery({ ...delivery, customText: e.target.value })}
                        />
                      </label>
                      <label className="block">
                        <span className="hexa-label">Instructions (Optional)</span>
                        <textarea
                          rows={2}
                          className="hexa-input text-xs"
                          placeholder="Customer instructions"
                          value={delivery.instructions}
                          onChange={(e) => setDelivery({ ...delivery, instructions: e.target.value })}
                        />
                      </label>
                    </div>
                  )}

                  {/* Vault Inventory Picker */}
                  {delivery.credType === 'vault' && (
                    <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold">
                            <HugeiconsIcon icon={PackageIcon} size={16} className="text-purple-400" />
                            Vault Protected Inventory
                          </p>
                          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
                            Required credential units: {expectedInventory.reduce((sum, entry) => sum + entry.quantity, 0)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={autoSelectInventory}
                          className="hexa-btn-secondary !px-3 !py-1.5 text-xs font-bold"
                        >
                          Auto-select
                        </button>
                      </div>

                      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                        {matchingInventory.length ? (
                          matchingInventory.map((inventory) => (
                            <label
                              key={inventory._id}
                              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--hexa-border)]/60 bg-[var(--hexa-surface)]/50 p-2.5 text-xs hover:border-purple-500/30 transition"
                            >
                              <input
                                type="checkbox"
                                className="accent-purple-600 rounded"
                                checked={delivery.inventoryItemIds.includes(inventory._id)}
                                onChange={() => toggleInventory(inventory._id)}
                              />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {inventory.product?.name || 'Product'} · {inventory.previewLabel || 'Protected item'}
                                {inventory.variantId ? ' · (variant)' : ''}
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--hexa-muted)] py-3 text-center">
                            No matching available credentials for this item in vault.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dynamic Custom Fields Section */}
                  {delivery.credType !== 'vault' && (
                    <div className="rounded-xl border border-dashed border-[var(--hexa-border)] bg-[var(--hexa-surface)]/40 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--hexa-text)] flex items-center gap-1.5">
                          <HugeiconsIcon icon={PlusSignIcon} size={13} className="text-purple-400" />
                          Additional Dynamic Delivery Fields (Optional)
                        </span>
                        <button
                          type="button"
                          onClick={addCustomField}
                          className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline"
                        >
                          + Add Field
                        </button>
                      </div>

                      {(delivery.customFields || []).map((cf, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            className="hexa-input text-xs w-1/3"
                            placeholder="Field Name (e.g. Region)"
                            value={cf.key}
                            onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                          />
                          <input
                            className="hexa-input text-xs flex-1"
                            placeholder="Field Value (e.g. Global)"
                            value={cf.value}
                            onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomField(index)}
                            className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 text-xs font-bold"
                            title="Remove field"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary & Mark as Delivered Checkbox */}
                <div className="mt-5 pt-4 border-t border-[var(--hexa-border)] space-y-3">
                  <label className="block">
                    <span className="hexa-label">Delivery Summary / Badge</span>
                    <input
                      className="hexa-input text-xs"
                      placeholder="e.g. 1 Month Premium Subscription"
                      value={delivery.summary}
                      onChange={(e) => setDelivery({ ...delivery, summary: e.target.value })}
                    />
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-3 text-xs">
                    <input
                      type="checkbox"
                      className="accent-purple-600 rounded h-4 w-4"
                      checked={Boolean(delivery.markDelivered)}
                      onChange={(e) => setDelivery({ ...delivery, markDelivered: e.target.checked })}
                    />
                    <div>
                      <span className="font-bold text-[var(--hexa-text)]">
                        Mark order as &quot;Delivered&quot; upon saving
                      </span>
                      <p className="text-[11px] text-[var(--hexa-muted)] mt-0.5">
                        Updates the order status to Delivered, completes subscriptions, and notifies the customer.
                      </p>
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="hexa-btn mt-5 w-full justify-center !py-3 text-sm font-bold shadow-md !bg-purple-600 hover:!bg-purple-500 text-white"
                >
                  <HugeiconsIcon icon={Key01Icon} size={18} />
                  {currentDelivered ? 'Update Delivered Credentials' : 'Save & Deliver Credentials'}
                </button>
              </form>
            </div>

            {selected.deliveries?.length > 0 && (
              <section className="rounded-xl border border-purple-500/30 bg-purple-500/[0.03] p-5">
                <h3 className="font-bold text-base text-[var(--hexa-text)] flex items-center gap-2 mb-3">
                  <HugeiconsIcon icon={Key01Icon} size={18} className="text-purple-500" /> Active Digital Deliveries (Delivered to Customer)
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
