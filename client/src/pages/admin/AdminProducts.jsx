import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Delete02Icon,
  DeliveryTruck01Icon,
  Edit02Icon,
  GameController01Icon,
  GiftIcon,
  Image01Icon,
  Key01Icon,
  Layers01Icon,
  PackageIcon,
  PlusSignIcon,
  Search01Icon,
  Settings02Icon,
  Shield01Icon,
  Tv01Icon,
  UserShield01Icon,
} from '@hugeicons/core-free-icons'
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../contexts/ToastContext'
import DynamicFieldBuilder from '../../components/DynamicFieldBuilder'
import VariantManager from '../../components/VariantManager'

const PRODUCT_TYPES = [
  { value: 'subscription', label: 'Streaming / Subscription', icon: Tv01Icon, badge: 'Streaming' },
  { value: 'game_topup', label: 'Game Direct Top-Up', icon: GameController01Icon, badge: 'Game Top-Up' },
  { value: 'game_license', label: 'Game Key / Direct License', icon: Key01Icon, badge: 'Game Key' },
  { value: 'software_license', label: 'Software License / OS', icon: Shield01Icon, badge: 'Software' },
  { value: 'gift_card', label: 'Gift Card / Voucher', icon: GiftIcon, badge: 'Gift Card' },
  { value: 'digital_account', label: 'Digital Account Credentials', icon: UserShield01Icon, badge: 'Account' },
  { value: 'digital-product', label: 'General Digital Product', icon: PackageIcon, badge: 'Digital' },
  { value: 'other', label: 'Other Digital Service', icon: PackageIcon, badge: 'Other' },
]

const FULFILLMENT_TYPES = [
  { value: 'manual', label: 'Manual Admin Delivery', desc: 'Admin reviews order and delivers credentials or completes top-up manually' },
  { value: 'license_key', label: 'License Key (from Vault)', desc: 'Automatically or manually assigns unused license keys from protected inventory' },
  { value: 'account_credentials', label: 'Account Credentials (from Vault)', desc: 'Delivers email/password/pin account logins stored in protected inventory' },
  { value: 'api_topup', label: 'Automated API Top-Up', desc: 'Dispatches automated order to third-party game top-up provider adapter' },
  { value: 'email_delivery', label: 'Email Delivery', desc: 'Delivers redemption code or access link directly to customer email' },
  { value: 'auto_delivery', label: 'Instant Auto Delivery', desc: 'Immediately unlocks digital delivery content upon payment verification' },
  { value: 'custom', label: 'Custom Delivery Instructions', desc: 'Displays custom access guide/instructions to the customer' },
]

const blank = () => ({
  name: '',
  slug: '',
  brand: '',
  shortDescription: '',
  description: '',
  category: '',
  subcategory: '',
  productType: 'game_topup',
  fulfillmentType: 'manual',
  fulfillmentConfig: {
    provider: 'default',
    serviceCode: '',
    autoDeliverKey: false,
    customInstructions: '',
  },
  regularPrice: 0,
  salePrice: 0,
  currency: 'BDT',
  stock: 100,
  allowUnlimitedStock: false,
  lowStockThreshold: 5,
  sortOrder: 0,
  thumbnail: undefined,
  bannerImage: undefined,
  galleryImages: [],
  seo: { title: '', description: '', keywords: [] },
  featured: false,
  popular: false,
  newArrival: false,
  status: 'active',
  tags: [],
  searchKeywords: [],
  details: {},
  customFields: [],
  variants: [],
})

export default function AdminProducts() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('general') // 'general' | 'variants' | 'fields' | 'fulfillment' | 'media'
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const { notify } = useToast()

  const load = () =>
    Promise.all([adminGet('/products', { limit: 200 }), adminGet('/categories')])
      .then(([p, c]) => {
        setItems(p.data || [])
        setCategories(c.data || [])
      })
      .finally(() => setLoading(false))

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm(blank())
    setActiveTab('general')
    setModal(true)
  }

  const openEdit = async (id) => {
    try {
      const r = await adminGet(`/products/${id}`)
      const p = r.data
      setEditing(id)
      setForm({
        ...blank(),
        ...p,
        category: p.category?._id || p.category,
        brand: p.brand || '',
        productType: p.productType || 'digital-product',
        fulfillmentType: p.fulfillmentType || (p.deliveryType === 'instant' ? 'license_key' : 'manual'),
        fulfillmentConfig: p.fulfillmentConfig || {
          provider: 'default',
          serviceCode: '',
          autoDeliverKey: false,
          customInstructions: '',
        },
        tags: p.tags || [],
        searchKeywords: p.searchKeywords || [],
        details: p.details || {},
        customFields: p.customFields || [],
        seo: p.seo || { title: '', description: '', keywords: [] },
        bannerImage: p.bannerImage,
        thumbnail: p.thumbnail,
        variants: (p.variants || []).map((v) => {
          const reg = Number(v.regularPrice || 0)
          const sale = Number(v.salePrice || 0)
          const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
          return {
            ...v,
            regularPrice: reg,
            salePrice: sale,
            costPrice: Number(v.costPrice || 0),
            discountPercent: disc,
            stock: Number(v.stock || 0),
            unlimitedStock: Boolean(v.unlimitedStock),
            region: v.region || '',
            platform: v.platform || '',
            duration: v.duration || '',
            sku: v.sku || '',
            active: v.active !== false,
          }
        }),
      })
      setActiveTab('general')
      setModal(true)
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const save = async (e) => {
    e.preventDefault()

    if (!form.name.trim()) {
      notify('Product name is required', 'error')
      return
    }
    if (!form.category) {
      notify('Please select a category', 'error')
      return
    }

    try {
      const baseRegPrice = form.variants.length > 0
        ? Number(form.variants[0].regularPrice || 0)
        : Number(form.regularPrice || 0)
      const baseSalePrice = form.variants.length > 0
        ? Number(form.variants[0].salePrice || form.variants[0].regularPrice || 0)
        : Number(form.salePrice || form.regularPrice || 0)

      const payload = {
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim(),
        regularPrice: baseRegPrice,
        salePrice: baseSalePrice,
        stock: Number(form.stock || 100),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        customFields: form.customFields || [],
        variants: (form.variants || []).map((v, idx) => ({
          name: v.name.trim(),
          sku: v.sku?.trim() || '',
          duration: v.duration?.trim() || '',
          region: v.region?.trim() || '',
          platform: v.platform?.trim() || '',
          regularPrice: Number(v.regularPrice || 0),
          salePrice: Number(v.salePrice || v.regularPrice || 0),
          costPrice: Number(v.costPrice || 0),
          stock: v.unlimitedStock ? 9999 : Number(v.stock || 0),
          unlimitedStock: Boolean(v.unlimitedStock),
          sortOrder: idx,
          active: v.active !== false,
          metadata: v.metadata || {},
        })),
      }

      if (editing) await adminPut(`/products/${editing}`, payload)
      else await adminPost('/products', payload)

      notify(editing ? 'Product successfully updated' : 'Product successfully created')
      setModal(false)
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const archive = async (id) => {
    if (!confirm('Archive this product? (Existing order history remains intact)')) return
    try {
      await adminDelete(`/products/${id}`)
      notify('Product archived')
      load()
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return items.filter((p) => {
      if (filterType && p.productType !== filterType && !(filterType === 'game_topup' && p.productType === 'game')) {
        return false
      }
      if (filterCategory && (p.category?._id || p.category) !== filterCategory) {
        return false
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const nameMatch = p.name?.toLowerCase().includes(query)
        const brandMatch = p.brand?.toLowerCase().includes(query)
        const slugMatch = p.slug?.toLowerCase().includes(query)
        if (!nameMatch && !brandMatch && !slugMatch) return false
      }
      return true
    })
  }, [items, filterType, filterCategory, searchQuery])

  return (
    <>
      <AdminPageHeader
        title="Products & Digital Catalog"
        description="Create and manage multi-type digital products: Subscriptions, Game Top-ups, Game Keys, Software Licenses, Gift Cards, and Accounts."
        action={
          <button onClick={openNew} className="hexa-btn">
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Product / Service
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]" />
          <input
            className="hexa-input !pl-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, brand, or slug..."
          />
        </div>

        <select
          className="hexa-input sm:w-48"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories
            .filter((c) => c.status !== 'archived')
            .map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
        </select>

        <select
          className="hexa-input sm:w-52"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Product Types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="hexa-card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[var(--hexa-border)] text-xs uppercase tracking-wider text-[var(--hexa-muted)]">
            <tr>
              {['Product / Service', 'Category', 'Type', 'Variants / Plans', 'Price Range', 'Stock', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filteredProducts.length === 0 && (
              <tr>
                <td colSpan="8" className="px-5 py-12 text-center text-[var(--hexa-muted)]">
                  No products found matching your search.
                </td>
              </tr>
            )}
            {filteredProducts.map((p) => {
              const typeConfig = PRODUCT_TYPES.find((t) => t.value === p.productType) || PRODUCT_TYPES[PRODUCT_TYPES.length - 2]
              const TypeIcon = typeConfig.icon
              const variantCount = p.variants?.length || 0
              const minPrice = variantCount > 0
                ? Math.min(...p.variants.map((v) => Number(v.salePrice || v.regularPrice || 0)))
                : Number(p.salePrice || p.regularPrice || 0)
              const maxPrice = variantCount > 0
                ? Math.max(...p.variants.map((v) => Number(v.salePrice || v.regularPrice || 0)))
                : Number(p.salePrice || p.regularPrice || 0)

              return (
                <tr key={p._id} className="border-b border-[var(--hexa-border)] transition hover:bg-[var(--hexa-card)]/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.thumbnail?.url ? (
                        <img src={p.thumbnail.url} alt="" className="h-10 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                          <HugeiconsIcon icon={TypeIcon} size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[var(--hexa-text)]">{p.name}</p>
                        <p className="text-xs text-[var(--hexa-muted)]">
                          {p.brand && <span className="font-semibold text-purple-400 mr-1.5">{p.brand} ·</span>}
                          /{p.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--hexa-muted)] font-medium">
                    {p.category?.name || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300">
                      <HugeiconsIcon icon={TypeIcon} size={12} />
                      <span>{typeConfig.badge}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-purple-300">
                      {variantCount} {variantCount === 1 ? 'variant' : 'variants'}
                    </span>
                    {p.customFields?.length > 0 && (
                      <span className="block text-[10px] text-[var(--hexa-muted)]">
                        + {p.customFields.length} custom field{p.customFields.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-[var(--hexa-text)]">
                    {minPrice === maxPrice ? (
                      `৳${minPrice.toLocaleString()}`
                    ) : (
                      `৳${minPrice.toLocaleString()} – ৳${maxPrice.toLocaleString()}`
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={p.stockStatus || 'in_stock'} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={p.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p._id)}
                        className="rounded-lg p-2 text-purple-300 transition hover:bg-purple-500/10"
                        title="Edit Product"
                      >
                        <HugeiconsIcon icon={Edit02Icon} size={16} />
                      </button>
                      <button
                        onClick={() => archive(p._id)}
                        className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10"
                        title="Archive Product"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Main Product Add/Edit Modal with Tabs */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit Product: ${form.name || 'Product'}` : 'Create New Digital Product'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={save} className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-[var(--hexa-border)] pb-3">
            {[
              { id: 'general', label: '1. Basic Info', icon: Settings02Icon },
              { id: 'variants', label: `2. Variants & Pricing (${form.variants.length})`, icon: Layers01Icon },
              { id: 'fields', label: `3. Customer Fields (${form.customFields.length})`, icon: GameController01Icon },
              { id: 'fulfillment', label: '4. Fulfillment & Stock', icon: DeliveryTruck01Icon },
              { id: 'media', label: '5. Media & SEO', icon: Image01Icon },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isActive
                      ? 'border border-purple-500 bg-purple-500/20 text-purple-300 shadow-sm'
                      : 'border border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]'
                  }`}
                >
                  <HugeiconsIcon icon={Icon} size={14} className="shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* TAB 1: General Info */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product / Service Title *">
                  <input
                    required
                    className="hexa-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Netflix Subscription or Mobile Legends Diamonds"
                  />
                </Field>

                <Field label="Category *">
                  <select
                    required
                    className="hexa-input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="">Choose Category...</option>
                    {categories
                      .filter((c) => c.status !== 'archived')
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Product Type *">
                  <select
                    className="hexa-input"
                    value={form.productType}
                    onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Brand / Publisher / Studio">
                  <input
                    className="hexa-input"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="e.g. Netflix, Moonton, Riot, Microsoft"
                  />
                </Field>

                <Field label="Catalog Status">
                  <select
                    className="hexa-input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {['active', 'inactive', 'archived'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Custom Slug / URL Identifier (Optional)">
                  <input
                    className="hexa-input font-mono text-xs"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated from product title if left blank"
                  />
                </Field>

                <Field label="Display Sort Order">
                  <input
                    type="number"
                    min="0"
                    className="hexa-input text-xs"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    placeholder="0 = highest priority"
                  />
                </Field>
              </div>

              <Field label="Short Tagline / Teaser">
                <input
                  className="hexa-input text-xs"
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  placeholder="Instant verified top-up within 5-10 minutes directly to your account."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-purple-600 rounded"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>Show as Featured on Home</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-purple-600 rounded"
                    checked={form.popular}
                    onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                  />
                  <span>Mark as Popular / Bestseller</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-purple-600 rounded"
                    checked={form.newArrival}
                    onChange={(e) => setForm({ ...form, newArrival: e.target.checked })}
                  />
                  <span>Mark as New Arrival</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Variants & Packages */}
          {activeTab === 'variants' && (
            <VariantManager
              variants={form.variants}
              onChange={(variants) => setForm({ ...form, variants })}
            />
          )}

          {/* TAB 3: Customer Input Fields */}
          {activeTab === 'fields' && (
            <DynamicFieldBuilder
              fields={form.customFields}
              onChange={(customFields) => setForm({ ...form, customFields })}
            />
          )}

          {/* TAB 4: Fulfillment & Stock */}
          {activeTab === 'fulfillment' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-[var(--hexa-text)]">Fulfillment & Delivery Method</h3>
                <p className="text-xs text-[var(--hexa-muted)] mt-0.5">
                  Choose how orders for this product will be fulfilled once the customer completes payment.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {FULFILLMENT_TYPES.map((f) => (
                  <label
                    key={f.value}
                    className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition ${
                      form.fulfillmentType === f.value
                        ? 'border-purple-500 bg-purple-500/10 text-white shadow-sm'
                        : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:border-purple-500/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillmentType"
                      className="accent-purple-600 mt-1"
                      checked={form.fulfillmentType === f.value}
                      onChange={() => setForm({ ...form, fulfillmentType: f.value })}
                    />
                    <div>
                      <p className="text-xs font-bold text-[var(--hexa-text)]">{f.label}</p>
                      <p className="text-[11px] text-[var(--hexa-muted)] mt-0.5">{f.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {/* Provider Config for API Top-Up */}
              {form.fulfillmentType === 'api_topup' && (
                <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-4 space-y-3">
                  <h4 className="text-xs font-bold text-purple-300">Third-Party API Top-Up Adapter Settings</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Provider Adapter">
                      <select
                        className="hexa-input text-xs"
                        value={form.fulfillmentConfig?.provider || 'default'}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            fulfillmentConfig: { ...form.fulfillmentConfig, provider: e.target.value },
                          })
                        }
                      >
                        <option value="default">Default / Mock Adapter (Simulated)</option>
                        <option value="unipin">UniPin API Adapter</option>
                        <option value="smileone">SmileOne API Adapter</option>
                        <option value="lapakgaming">Lapakgaming API Adapter</option>
                      </select>
                    </Field>
                    <Field label="Provider Service Code / Product SKU">
                      <input
                        className="hexa-input text-xs font-mono"
                        value={form.fulfillmentConfig?.serviceCode || ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            fulfillmentConfig: { ...form.fulfillmentConfig, serviceCode: e.target.value },
                          })
                        }
                        placeholder="e.g. MLBB_GLOBAL_DIAMONDS"
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* License Key Auto-Delivery Settings */}
              {form.fulfillmentType === 'license_key' && (
                <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-4">
                  <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-purple-600 rounded"
                      checked={Boolean(form.fulfillmentConfig?.autoDeliverKey)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fulfillmentConfig: { ...form.fulfillmentConfig, autoDeliverKey: e.target.checked },
                        })
                      }
                    />
                    <span>Automatically allocate and unlock available license key when payment is verified</span>
                  </label>
                  <p className="text-[11px] text-[var(--hexa-muted)] mt-1 ml-6">
                    If unchecked, admin manually clicks &ldquo;Deliver Key&rdquo; in the order inspection modal.
                  </p>
                </div>
              )}

              <Field label="Custom Delivery Instructions for Customer (Shown upon fulfillment)">
                <textarea
                  rows={3}
                  className="hexa-input text-xs"
                  value={form.fulfillmentConfig?.customInstructions || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fulfillmentConfig: { ...form.fulfillmentConfig, customInstructions: e.target.value },
                    })
                  }
                  placeholder="e.g. 1. Go to https://redeem.game.com 2. Enter code 3. Restart game client."
                />
              </Field>

              {/* Stock Management Settings */}
              <div className="grid gap-4 sm:grid-cols-2 border-t border-[var(--hexa-border)] pt-4">
                <Field label="Base Stock Units (Used if no variants)">
                  <input
                    type="number"
                    min="0"
                    className="hexa-input"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </Field>

                <Field label="Low Stock Warning Alert Threshold">
                  <input
                    type="number"
                    min="0"
                    className="hexa-input"
                    value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          )}

          {/* TAB 5: Media & SEO */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageUploader
                  folder="products"
                  value={form.thumbnail}
                  onChange={(thumbnail) => setForm({ ...form, thumbnail })}
                  label="Product Thumbnail (Square / Card)"
                />
                <ImageUploader
                  folder="products/banners"
                  value={form.bannerImage}
                  onChange={(bannerImage) => setForm({ ...form, bannerImage })}
                  label="Product Hero / Banner Image"
                />
              </div>

              <Field label="Full Description / Buying Guide">
                <textarea
                  rows={4}
                  className="hexa-input text-xs"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Detailed guidelines, terms, feature list, delivery steps..."
                />
              </Field>

              <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-4 space-y-3">
                <h4 className="text-xs font-bold text-[var(--hexa-text)]">Search Engine Optimization (SEO)</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="SEO Meta Title">
                    <input
                      className="hexa-input text-xs"
                      value={form.seo?.title || ''}
                      onChange={(e) => setForm({ ...form, seo: { ...form.seo, title: e.target.value } })}
                      placeholder="Title for Google search results"
                    />
                  </Field>
                  <Field label="SEO Meta Description">
                    <input
                      className="hexa-input text-xs"
                      value={form.seo?.description || ''}
                      onChange={(e) => setForm({ ...form, seo: { ...form.seo, description: e.target.value } })}
                      placeholder="Short description for search results"
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between border-t border-[var(--hexa-border)] pt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const tabs = ['general', 'variants', 'fields', 'fulfillment', 'media']
                  const idx = tabs.indexOf(activeTab)
                  if (idx > 0) setActiveTab(tabs[idx - 1])
                }}
                disabled={activeTab === 'general'}
                className="hexa-btn-secondary !px-3 !py-2 text-xs disabled:opacity-40"
              >
                &larr; Previous Step
              </button>

              <button
                type="button"
                onClick={() => {
                  const tabs = ['general', 'variants', 'fields', 'fulfillment', 'media']
                  const idx = tabs.indexOf(activeTab)
                  if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1])
                }}
                disabled={activeTab === 'media'}
                className="hexa-btn-secondary !px-3 !py-2 text-xs disabled:opacity-40"
              >
                Next Step &rarr;
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setModal(false)} className="hexa-btn-secondary">
                Cancel
              </button>
              <button className="hexa-btn">
                {editing ? 'Save Product Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="hexa-label">{label}</span>
      {children}
    </label>
  )
}
