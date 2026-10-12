import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Coins01Icon,
  Key01Icon,
  PackageIcon,
  PlusSignIcon,
  Shield01Icon,
  Store01Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { adminGet, adminPost } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import StockEntryModal from '../../components/StockEntryModal'

const initialStockForm = {
  productId: '',
  variantId: '',
  quantity: 1,
  reason: 'Manual adjustment',
}

const initialCredentialForm = {
  productId: '',
  variantId: '',
  previewLabel: '',
  expiresAt: '',
  credType: 'account', // 'account' | 'license' | 'custom'
  email: '',
  password: '',
  pin: '',
  licenseKey: '',
  instructions: '',
  customText: '',
}

const initialBulkForm = {
  productId: '',
  variantId: '',
  itemType: 'license_key',
  previewPrefix: '',
  rawLines: '',
  expiresAt: '',
  instructions: '',
}

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])
  const [itemsMeta, setItemsMeta] = useState({})
  const [itemsLimit, setItemsLimit] = useState(25)
  const [history, setHistory] = useState([])
  const [historyMeta, setHistoryMeta] = useState({})
  const [historyLimit, setHistoryLimit] = useState(25)
  const [stockOpen, setStockOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [stockEntryModal, setStockEntryModal] = useState({
    open: false,
    product: null,
    variantId: null,
  })
  const [stockForm, setStockForm] = useState(initialStockForm)
  const [cred, setCred] = useState(initialCredentialForm)
  const [bulkForm, setBulkForm] = useState(initialBulkForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { notify } = useToast()

  const loadItems = async (cursor = null, direction = 'next', currentLimit = itemsLimit) => {
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      const itemResult = await adminGet('/inventory/items', params)
      setItems(itemResult.data || [])
      setItemsMeta(itemResult.meta || {})
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const loadHistory = async (cursor = null, direction = 'next', currentLimit = historyLimit) => {
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      const historyResult = await adminGet('/inventory/history', params)
      setHistory(historyResult.data || [])
      setHistoryMeta(historyResult.meta || {})
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const productResult = await adminGet('/products', { limit: 100 })
      setProducts(productResult.data || [])
      await Promise.all([
        loadItems(null, 'next', itemsLimit),
        loadHistory(null, 'next', historyLimit),
      ])
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = useMemo(
    () => products.find((product) => product._id === stockForm.productId),
    [products, stockForm.productId],
  )
  const credProduct = useMemo(
    () => products.find((product) => product._id === cred.productId),
    [products, cred.productId],
  )
  const bulkProduct = useMemo(
    () => products.find((product) => product._id === bulkForm.productId),
    [products, bulkForm.productId],
  )

  const availableCredentials = useMemo(
    () => items.filter((item) => item.status === 'available').length,
    [items],
  )

  const reservedCredentials = useMemo(
    () => items.filter((item) => item.status === 'reserved').length,
    [items],
  )

  const saveBulk = async (event) => {
    event.preventDefault()
    if (!bulkForm.productId) {
      notify('Please choose a product', 'error')
      return
    }
    const lines = bulkForm.rawLines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    if (!lines.length) {
      notify('Please enter at least one license key or credential line', 'error')
      return
    }

    setSaving(true)
    try {
      const res = await adminPost('/inventory/items/bulk', {
        productId: bulkForm.productId,
        variantId: bulkForm.variantId || null,
        itemType: bulkForm.itemType || 'license_key',
        lines,
        previewPrefix: bulkForm.previewPrefix.trim(),
        expiresAt: bulkForm.expiresAt ? new Date(bulkForm.expiresAt).toISOString() : null,
        instructions: bulkForm.instructions.trim(),
      })
      notify(res.message || `Successfully imported ${lines.length} digital inventory items`)
      setBulkOpen(false)
      setBulkForm(initialBulkForm)
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const adjust = async (event) => {
    event.preventDefault()
    if (!stockForm.productId) return
    setSaving(true)
    try {
      await adminPost(`/inventory/stock/${stockForm.productId}`, {
        variantId: stockForm.variantId || null,
        quantity: Number(stockForm.quantity),
        reason: stockForm.reason,
      })
      notify('Stock updated')
      setStockOpen(false)
      setStockForm(initialStockForm)
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const addCredential = async (event) => {
    event.preventDefault()
    if (!cred.productId) {
      notify('Please select a product', 'error')
      return
    }
    setSaving(true)
    try {
      let payload = {}

      if (cred.credType === 'account') {
        if (!cred.email.trim() || !cred.password.trim()) {
          throw new Error('Email/Username and Password are required')
        }
        payload = {
          email: cred.email.trim(),
          password: cred.password.trim(),
          ...(cred.pin.trim() ? { profilePin: cred.pin.trim() } : {}),
          ...(cred.instructions.trim() ? { instructions: cred.instructions.trim() } : {}),
        }
      } else if (cred.credType === 'license') {
        if (!cred.licenseKey.trim()) {
          throw new Error('License / Product Key is required')
        }
        payload = {
          licenseKey: cred.licenseKey.trim(),
          ...(cred.instructions.trim() ? { instructions: cred.instructions.trim() } : {}),
        }
      } else {
        if (!cred.customText.trim()) {
          throw new Error('Please enter the delivery information')
        }
        payload = {
          details: cred.customText.trim(),
          ...(cred.instructions.trim() ? { instructions: cred.instructions.trim() } : {}),
        }
      }

      await adminPost('/inventory/items', {
        productId: cred.productId,
        variantId: cred.variantId || null,
        previewLabel: cred.previewLabel.trim() || (cred.credType === 'account' ? cred.email.trim() : 'Digital license'),
        expiresAt: cred.expiresAt ? new Date(cred.expiresAt).toISOString() : null,
        payload,
      })
      notify('Digital license/account encrypted and stored in vault')
      setCredOpen(false)
      setCred(initialCredentialForm)
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="Manage stock and protected credentials at product or variant level. Bundles do not carry separate stock; bundle orders reserve and consume their component products automatically."
        action={(
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStockEntryModal({ open: true, product: null, variantId: null })}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <HugeiconsIcon icon={Coins01Icon} size={15} /> Stock Entry & Cost
            </button>
            <button onClick={() => setStockOpen(true)} className="hexa-btn-secondary">
              <HugeiconsIcon icon={Store01Icon} size={15} /> Adjust stock
            </button>
            <button onClick={() => setBulkOpen(true)} className="hexa-btn-secondary text-purple-400">
              <HugeiconsIcon icon={PackageIcon} size={15} /> Bulk Import Keys
            </button>
            <button onClick={() => setCredOpen(true)} className="hexa-btn">
              <HugeiconsIcon icon={Key01Icon} size={15} /> Add credential
            </button>
          </div>
        )}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <InventoryStat icon={PackageIcon} label="Protected credentials" value={items.length} />
        <InventoryStat icon={Key01Icon} label="Available" value={availableCredentials} />
        <InventoryStat icon={Store01Icon} label="Reserved" value={reservedCredentials} />
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-accent-soft)] p-5">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--hexa-accent)] text-white">
            <HugeiconsIcon icon={PackageIcon} size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-[var(--hexa-text)]">Bundle inventory rule</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--hexa-muted)]">
              A bundle is one sellable cart and order line, but its inventory remains component-based. Do not create a second stock pool for the bundle. When a bundle is ordered, HEXA checks, reserves, delivers, and deducts the required product/variant quantities behind the scenes.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="hexa-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--hexa-border)] px-5 py-4">
            <div>
              <h2 className="font-semibold">Protected digital inventory</h2>
              <p className="mt-1 text-xs text-[var(--hexa-muted)]">Credentials are always attached to a component product or variant.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[var(--hexa-card)] text-xs text-[var(--hexa-muted)]">
                <tr className="border-b border-[var(--hexa-border)]">
                  {['Product', 'Variant', 'Preview / Account', 'Status', 'Expires'].map((heading) => (
                    <th key={heading} className="px-5 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 && (
                  <tr><td colSpan="5" className="px-5 py-10 text-center text-[var(--hexa-muted)]">No protected inventory yet.</td></tr>
                )}
                {items.map((item) => {
                  const product = products.find((entry) => entry._id === item.product?._id)
                  const variant = product?.variants?.find((entry) => entry._id === item.variantId)
                  return (
                    <tr key={item._id} className="border-b border-[var(--hexa-border)] last:border-b-0">
                      <td className="px-5 py-3 font-medium">{item.product?.name || 'Unknown product'}</td>
                      <td className="px-5 py-3 text-[var(--hexa-muted)]">{variant?.name || (item.variantId ? 'Variant' : 'Base product')}</td>
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-purple-400">{item.previewLabel || 'Protected item'}</td>
                      <td className="px-5 py-3"><StatusBadge value={item.status} /></td>
                      <td className="px-5 py-3 text-[var(--hexa-muted)]">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <AdminCursorPagination
            meta={itemsMeta}
            onNext={(c) => loadItems(c, 'next', itemsLimit)}
            onPrev={(c) => loadItems(c, 'prev', itemsLimit)}
            limit={itemsLimit}
            onLimitChange={(l) => { setItemsLimit(l); loadItems(null, 'next', l) }}
            loading={loading}
            pageSizeOptions={[15, 25, 50, 100]}
          />
        </section>

        <section className="hexa-card overflow-hidden">
          <div className="border-b border-[var(--hexa-border)] px-5 py-4">
            <h2 className="font-semibold">Stock movements</h2>
            <p className="mt-1 text-xs text-[var(--hexa-muted)]">Product and variant movements include bundle-driven reservations and fulfillment where applicable.</p>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--hexa-card)] text-xs text-[var(--hexa-muted)]">
                <tr className="border-b border-[var(--hexa-border)]">
                  {['Product', 'Change', 'Buy Cost', 'Previous', 'New', 'Reason', 'Date'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && history.length === 0 && (
                  <tr><td colSpan="7" className="px-4 py-10 text-center text-[var(--hexa-muted)]">No stock movements yet.</td></tr>
                )}
                {history.map((row) => (
                  <tr key={row._id} className="border-b border-[var(--hexa-border)] last:border-b-0">
                    <td className="px-4 py-3 font-medium">{row.product?.name || 'Unknown product'}</td>
                    <td className={`px-4 py-3 font-semibold ${row.quantityChanged > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.quantityChanged > 0 ? '+' : ''}{row.quantityChanged}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-emerald-400">
                      {row.purchasePrice > 0 ? `৳${row.purchasePrice.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--hexa-muted)]">{row.previousStock}</td>
                    <td className="px-4 py-3">{row.newStock}</td>
                    <td className="px-4 py-3 text-[var(--hexa-muted)]">{row.reason}</td>
                    <td className="px-4 py-3 text-xs text-[var(--hexa-muted)]">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <AdminCursorPagination
            meta={historyMeta}
            onNext={(c) => loadHistory(c, 'next', historyLimit)}
            onPrev={(c) => loadHistory(c, 'prev', historyLimit)}
            limit={historyLimit}
            onLimitChange={(l) => { setHistoryLimit(l); loadHistory(null, 'next', l) }}
            loading={loading}
            pageSizeOptions={[15, 25, 50, 100]}
          />
        </section>
      </div>

      {/* Adjust Stock Modal */}
      <Modal open={stockOpen} onClose={() => !saving && setStockOpen(false)} title="Adjust stock">
        <form onSubmit={adjust} className="space-y-4">
          <ProductSelect
            products={products}
            value={stockForm.productId}
            onChange={(productId) => setStockForm({ ...stockForm, productId, variantId: '' })}
          />
          {selected?.variants?.length > 0 && (
            <VariantSelect
              product={selected}
              value={stockForm.variantId}
              onChange={(variantId) => setStockForm({ ...stockForm, variantId })}
            />
          )}
          <label className="block">
            <span className="hexa-label">Quantity change</span>
            <input
              type="number"
              required
              className="hexa-input"
              value={stockForm.quantity}
              onChange={(event) => setStockForm({ ...stockForm, quantity: event.target.value })}
              placeholder="Use positive (+5) or negative (-2) values"
            />
            <p className="mt-1 text-xs text-[var(--hexa-muted)]">Positive numbers add stock; negative numbers deduct stock.</p>
          </label>
          <label className="block">
            <span className="hexa-label">Reason</span>
            <input
              required
              className="hexa-input"
              value={stockForm.reason}
              onChange={(event) => setStockForm({ ...stockForm, reason: event.target.value })}
            />
          </label>
          <button disabled={saving} className="hexa-btn disabled:cursor-not-allowed disabled:opacity-60">
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </form>
      </Modal>

      {/* Add Credential Modal (Human Friendly - Zero Raw JSON) */}
      <Modal open={credOpen} onClose={() => !saving && setCredOpen(false)} title="Add Protected Digital Credential">
        <form onSubmit={addCredential} className="space-y-4">
          <ProductSelect
            products={products}
            value={cred.productId}
            onChange={(productId) => setCred({ ...cred, productId, variantId: '' })}
          />
          {credProduct?.variants?.length > 0 && (
            <VariantSelect
              product={credProduct}
              value={cred.variantId}
              onChange={(variantId) => setCred({ ...cred, variantId })}
            />
          )}

          {/* Credential Format Selector */}
          <div>
            <span className="hexa-label mb-2 block">Credential Format</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'account', label: 'Account Login', icon: UserCircleIcon },
                { id: 'license', label: 'License / Key', icon: Key01Icon },
                { id: 'custom', label: 'Custom Info', icon: Shield01Icon },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCred({ ...cred, credType: tab.id })}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                      cred.credType === tab.id
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                    }`}
                  >
                    <HugeiconsIcon icon={Icon} size={14} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Fields based on Type */}
          {cred.credType === 'account' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 p-4">
              <span className="text-xs font-bold text-[var(--hexa-text)]">Account Login Information</span>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="hexa-label">Email or Username *</span>
                  <input
                    required
                    className="hexa-input text-xs"
                    placeholder="e.g. customer@example.com"
                    value={cred.email}
                    onChange={(e) => setCred({ ...cred, email: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="hexa-label">Password *</span>
                  <input
                    required
                    className="hexa-input text-xs"
                    placeholder="e.g. SecretPassword123"
                    value={cred.password}
                    onChange={(e) => setCred({ ...cred, password: e.target.value })}
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="hexa-label">Profile PIN / Screen (Optional)</span>
                  <input
                    className="hexa-input text-xs"
                    placeholder="e.g. PIN: 1234, Screen: 2"
                    value={cred.pin}
                    onChange={(e) => setCred({ ...cred, pin: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="hexa-label">Login or Service URL (Optional)</span>
                  <input
                    className="hexa-input text-xs"
                    placeholder="e.g. https://netflix.com/login"
                    value={cred.url}
                    onChange={(e) => setCred({ ...cred, url: e.target.value })}
                  />
                </label>
              </div>
            </div>
          )}

          {cred.credType === 'license' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 p-4">
              <span className="text-xs font-bold text-[var(--hexa-text)]">License / Activation Key</span>
              <label className="block">
                <span className="hexa-label">License Key / Serial Code *</span>
                <input
                  required
                  className="hexa-input font-mono text-xs tracking-wider"
                  placeholder="e.g. W269N-WFGWX-YVC9B-4J6C9-T83GX"
                  value={cred.key}
                  onChange={(e) => setCred({ ...cred, key: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="hexa-label">Redemption or Download URL (Optional)</span>
                <input
                  className="hexa-input text-xs"
                  placeholder="e.g. https://setup.office.com"
                  value={cred.url}
                  onChange={(e) => setCred({ ...cred, url: e.target.value })}
                />
              </label>
            </div>
          )}

          {cred.credType === 'custom' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 p-4">
              <span className="text-xs font-bold text-[var(--hexa-text)]">Custom Secret or Access Details</span>
              <label className="block">
                <span className="hexa-label">Custom Payload / Text *</span>
                <textarea
                  required
                  rows={3}
                  className="hexa-input text-xs"
                  placeholder="Enter custom access details, voucher codes, or redeem instructions"
                  value={cred.custom}
                  onChange={(e) => setCred({ ...cred, custom: e.target.value })}
                />
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Preview Label (Admin Reference)</span>
              <input
                className="hexa-input text-xs"
                placeholder="e.g. US 1-Screen / Steam Key"
                value={cred.previewLabel}
                onChange={(e) => setCred({ ...cred, previewLabel: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="hexa-label">Expiration Date (Optional)</span>
              <input
                type="date"
                className="hexa-input text-xs"
                value={cred.expiresAt}
                onChange={(e) => setCred({ ...cred, expiresAt: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className="hexa-label">Delivery Instructions for Customer (Optional)</span>
            <input
              className="hexa-input text-xs"
              placeholder="e.g. Do not change password or profile name"
              value={cred.notes}
              onChange={(e) => setCred({ ...cred, notes: e.target.value })}
            />
          </label>

          <p className="text-[11px] text-[var(--hexa-muted)]">
            🔒 All account details and keys are automatically encrypted with AES-256 before saving to the database.
          </p>

          <button disabled={saving} className="hexa-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
            <HugeiconsIcon icon={Key01Icon} size={15} /> {saving ? 'Encrypting & Saving…' : 'Encrypt & Save to Vault'}
          </button>
        </form>
      </Modal>

      {/* Bulk Key Import Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Import License Keys & Accounts" maxWidth="max-w-2xl">
        <form onSubmit={saveBulk} className="space-y-4">
          <ProductSelect products={products} value={bulkForm.productId} onChange={(value) => setBulkForm({ ...bulkForm, productId: value, variantId: '' })} />

          {bulkProduct && bulkProduct.variants?.length > 0 && (
            <VariantSelect product={bulkProduct} value={bulkForm.variantId} onChange={(value) => setBulkForm({ ...bulkForm, variantId: value })} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Item Type</span>
              <select
                className="hexa-input"
                value={bulkForm.itemType}
                onChange={(e) => setBulkForm({ ...bulkForm, itemType: e.target.value })}
              >
                <option value="license_key">License Keys / Activation Codes</option>
                <option value="account_credentials">Account Logins (email:password)</option>
                <option value="custom">Custom Text / Codes</option>
              </select>
            </label>

            <label className="block">
              <span className="hexa-label">Preview Label Prefix (Optional)</span>
              <input
                className="hexa-input"
                value={bulkForm.previewPrefix}
                onChange={(e) => setBulkForm({ ...bulkForm, previewPrefix: e.target.value })}
                placeholder="e.g. Steam Key or Netflix Profile"
              />
            </label>
          </div>

          <label className="block">
            <span className="hexa-label">
              Paste Inventory Lines (1 per line) *
              <span className="ml-2 font-normal text-purple-400">
                ({bulkForm.rawLines.split('\n').filter((l) => l.trim()).length} detected)
              </span>
            </span>
            <textarea
              required
              rows={8}
              className="hexa-input font-mono text-xs leading-relaxed"
              value={bulkForm.rawLines}
              onChange={(e) => setBulkForm({ ...bulkForm, rawLines: e.target.value })}
              placeholder={
                bulkForm.itemType === 'license_key'
                  ? 'XXXXX-XXXXX-XXXXX-XXXXX\nYYYYY-YYYYY-YYYYY-YYYYY\nZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ'
                  : 'user1@example.com:Password123\nuser2@example.com:Password456'
              }
            />
          </label>

          <label className="block">
            <span className="hexa-label">Delivery Instructions for Customer (Optional)</span>
            <input
              className="hexa-input text-xs"
              value={bulkForm.instructions}
              onChange={(e) => setBulkForm({ ...bulkForm, instructions: e.target.value })}
              placeholder="e.g. Redeem at https://store.steampowered.com/account/registerkey"
            />
          </label>

          <p className="text-[11px] text-[var(--hexa-muted)]">
            🔒 Each line will be individually encrypted with AES-256 and stored as an available unit in the inventory vault.
          </p>

          <button disabled={saving} className="hexa-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
            <HugeiconsIcon icon={PackageIcon} size={15} /> {saving ? 'Encrypting & Importing Batch…' : 'Encrypt & Import Batch to Vault'}
          </button>
        </form>
      </Modal>

      {/* Modern Stock Entry & Profit Adjustment Modal */}
      <StockEntryModal
        open={stockEntryModal.open}
        onClose={() => setStockEntryModal({ open: false, product: null, variantId: null })}
        initialProduct={stockEntryModal.product}
        initialVariantId={stockEntryModal.variantId}
        products={products}
        onSuccess={() => {
          load()
        }}
      />
    </>
  )
}

function InventoryStat({ icon: Icon, label, value }) {
  return (
    <div className="hexa-card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hexa-accent-soft)] text-[var(--hexa-accent)]">
        <HugeiconsIcon icon={Icon} size={20} />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--hexa-muted)]">{label}</p>
        <p className="mt-1 text-2xl font-black">{value}</p>
      </div>
    </div>
  )
}

function ProductSelect({ products, value, onChange }) {
  return (
    <label className="block">
      <span className="hexa-label">Product</span>
      <select required className="hexa-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Choose product</option>
        {products.filter((product) => product.status !== 'archived').map((product) => (
          <option key={product._id} value={product._id}>{product.name}</option>
        ))}
      </select>
      <p className="mt-1 text-xs text-[var(--hexa-muted)]">Bundle stock is intentionally not selectable here. Update the bundle&apos;s component products instead.</p>
    </label>
  )
}

function VariantSelect({ product, value, onChange }) {
  return (
    <label className="block">
      <span className="hexa-label">Plan / variant</span>
      <select className="hexa-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Base product (or select a plan below)</option>
        {product.variants.filter((variant) => variant.active).map((variant) => (
          <option key={variant._id} value={variant._id}>{variant.name}</option>
        ))}
      </select>
    </label>
  )
}
