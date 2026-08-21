import { useEffect, useMemo, useState } from 'react'
import {
  FaBoxesStacked,
  FaKey,
  FaLock,
  FaPlus,
  FaShieldHalved,
  FaUser,
  FaWarehouse,
} from 'react-icons/fa6'
import { adminGet, adminPost } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'

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

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [items, setItems] = useState([])
  const [history, setHistory] = useState([])
  const [stockOpen, setStockOpen] = useState(false)
  const [credOpen, setCredOpen] = useState(false)
  const [stockForm, setStockForm] = useState(initialStockForm)
  const [cred, setCred] = useState(initialCredentialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { notify } = useToast()

  const load = async () => {
    try {
      const [productResult, itemResult, historyResult] = await Promise.all([
        adminGet('/products', { limit: 100 }),
        adminGet('/inventory/items'),
        adminGet('/inventory/history'),
      ])
      setProducts(productResult.data || [])
      setItems(itemResult.data || [])
      setHistory(historyResult.data || [])
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

  const availableCredentials = useMemo(
    () => items.filter((item) => item.status === 'available').length,
    [items],
  )

  const reservedCredentials = useMemo(
    () => items.filter((item) => item.status === 'reserved').length,
    [items],
  )

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
            <button onClick={() => setStockOpen(true)} className="hexa-btn-secondary">
              <FaWarehouse /> Adjust stock
            </button>
            <button onClick={() => setCredOpen(true)} className="hexa-btn">
              <FaKey /> Add credential
            </button>
          </div>
        )}
      />

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <InventoryStat icon={FaBoxesStacked} label="Protected credentials" value={items.length} />
        <InventoryStat icon={FaKey} label="Available" value={availableCredentials} />
        <InventoryStat icon={FaWarehouse} label="Reserved" value={reservedCredentials} />
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-accent-soft)] p-5">
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--hexa-accent)] text-white">
            <FaBoxesStacked />
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
                  {['Product', 'Change', 'Previous', 'New', 'Reason', 'Date'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && history.length === 0 && (
                  <tr><td colSpan="6" className="px-4 py-10 text-center text-[var(--hexa-muted)]">No stock movements yet.</td></tr>
                )}
                {history.map((row) => (
                  <tr key={row._id} className="border-b border-[var(--hexa-border)] last:border-b-0">
                    <td className="px-4 py-3 font-medium">{row.product?.name || 'Unknown product'}</td>
                    <td className={`px-4 py-3 font-semibold ${row.quantityChanged > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {row.quantityChanged > 0 ? '+' : ''}{row.quantityChanged}
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
            <FaPlus /> {saving ? 'Saving…' : 'Apply adjustment'}
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
                { id: 'account', label: 'Account Login', icon: FaUser },
                { id: 'license', label: 'License / Key', icon: FaKey },
                { id: 'custom', label: 'Custom Info', icon: FaShieldHalved },
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
                    <Icon className="text-xs shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form Fields based on Type */}
          {cred.credType === 'account' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
              <label className="block">
                <span className="hexa-label">Email or Username *</span>
                <input
                  required
                  className="hexa-input"
                  value={cred.email}
                  onChange={(e) => setCred({ ...cred, email: e.target.value })}
                  placeholder="e.g. premium.user@example.com"
                />
              </label>

              <label className="block">
                <span className="hexa-label">Password *</span>
                <input
                  required
                  className="hexa-input"
                  value={cred.password}
                  onChange={(e) => setCred({ ...cred, password: e.target.value })}
                  placeholder="e.g. SecretPassword#123"
                />
              </label>

              <label className="block">
                <span className="hexa-label">Profile PIN / Screen Number (Optional)</span>
                <input
                  className="hexa-input"
                  value={cred.pin}
                  onChange={(e) => setCred({ ...cred, pin: e.target.value })}
                  placeholder="e.g. Profile 3 · PIN 1234"
                />
              </label>
            </div>
          )}

          {cred.credType === 'license' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
              <label className="block">
                <span className="hexa-label">License Key / Serial Code *</span>
                <input
                  required
                  className="hexa-input font-mono"
                  value={cred.licenseKey}
                  onChange={(e) => setCred({ ...cred, licenseKey: e.target.value })}
                  placeholder="e.g. XXXX-YYYY-ZZZZ-AAAA"
                />
              </label>
            </div>
          )}

          {cred.credType === 'custom' && (
            <div className="space-y-3 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4">
              <label className="block">
                <span className="hexa-label">Delivery Content / Instructions *</span>
                <textarea
                  required
                  rows={4}
                  className="hexa-input"
                  value={cred.customText}
                  onChange={(e) => setCred({ ...cred, customText: e.target.value })}
                  placeholder="Enter login URL, redeem voucher code, or access steps..."
                />
              </label>
            </div>
          )}

          <label className="block">
            <span className="hexa-label">Delivery Instructions / Customer Note (Optional)</span>
            <textarea
              rows={2}
              className="hexa-input text-xs"
              value={cred.instructions}
              onChange={(e) => setCred({ ...cred, instructions: e.target.value })}
              placeholder="e.g. Do not change account email or password. Valid for 30 days."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Admin Label (Optional)</span>
              <input
                className="hexa-input"
                value={cred.previewLabel}
                onChange={(event) => setCred({ ...cred, previewLabel: event.target.value })}
                placeholder="e.g. Netflix Slot #12"
              />
            </label>

            <label className="block">
              <span className="hexa-label">Expiration Date (Optional)</span>
              <input
                type="datetime-local"
                className="hexa-input"
                value={cred.expiresAt}
                onChange={(event) => setCred({ ...cred, expiresAt: event.target.value })}
              />
            </label>
          </div>

          <p className="text-[11px] text-[var(--hexa-muted)]">
            🔒 All account details and keys are automatically encrypted with AES-256 before saving to the database.
          </p>

          <button disabled={saving} className="hexa-btn w-full justify-center disabled:cursor-not-allowed disabled:opacity-60">
            <FaKey /> {saving ? 'Encrypting & Saving…' : 'Encrypt & Save to Vault'}
          </button>
        </form>
      </Modal>
    </>
  )
}

function InventoryStat({ icon: Icon, label, value }) {
  return (
    <div className="hexa-card flex items-center gap-4 p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--hexa-accent-soft)] text-[var(--hexa-accent)]">
        <Icon />
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
      <p className="mt-1 text-xs text-[var(--hexa-muted)]">Bundle stock is intentionally not selectable here. Update the bundle's component products instead.</p>
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
