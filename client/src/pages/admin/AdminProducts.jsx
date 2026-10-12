import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Coins01Icon,
  Copy01Icon,
  Delete02Icon,
  DeliveryTruck01Icon,
  Edit02Icon,
  GameController01Icon,
  GiftIcon,
  HelpCircleIcon,
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
import StockEntryModal from '../../components/StockEntryModal'
import AdminCursorPagination from '../../components/AdminCursorPagination'

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
  purchasePrice: 0,
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
  faqs: [],
  guide: { title: '', videoUrl: '', steps: [] },
})

export default function AdminProducts() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(50)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [activeTab, setActiveTab] = useState('general') // 'general' | 'variants' | 'fields' | 'fulfillment' | 'media' | 'guide_faqs'
  const [stockEntryModal, setStockEntryModal] = useState({
    open: false,
    product: null,
    variantId: null,
  })
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    product: null,
    deleteMode: 'archive', // 'archive' | 'permanent'
    loading: false,
  })
  const { notify } = useToast()

  const load = (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    query = searchQuery,
    cat = filterCategory,
    type = filterType,
    status = filterStatus
  ) => {
    setLoading(true)
    const params = { limit: currentLimit }
    if (cursor) {
      params.cursor = cursor
      params.direction = direction
    }
    if (query && query.trim()) params.q = query.trim()
    if (cat && cat.trim()) params.category = cat.trim()
    if (type && type.trim()) params.productType = type.trim()
    if (status && status.trim()) params.status = status.trim()

    return Promise.all([adminGet('/products', params), adminGet('/categories')])
      .then(([p, c]) => {
        setItems(p.data || [])
        setMeta(p.meta || {})
        setCategories(c.data || [])
      })
      .catch((error) => {
        notify(apiErrorMessage(error, 'Unable to load products'), 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(null, 'next', limit, searchQuery, filterCategory, filterType, filterStatus).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, filterType, filterStatus])

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, searchQuery, filterCategory, filterType, filterStatus)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, searchQuery, filterCategory, filterType, filterStatus)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, searchQuery, filterCategory, filterType, filterStatus)
  }

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault()
    load(null, 'next', limit, searchQuery, filterCategory, filterType, filterStatus)
  }

  const handleDeleteProduct = async () => {
    if (!deleteModal.product?._id) return
    setDeleteModal((prev) => ({ ...prev, loading: true }))
    try {
      const isPermanent = deleteModal.deleteMode === 'permanent'
      const url = isPermanent
        ? `/products/${deleteModal.product._id}?permanent=true`
        : `/products/${deleteModal.product._id}`
      await adminDelete(url)
      notify(isPermanent ? 'Product permanently deleted' : 'Product archived successfully')
      setDeleteModal({ open: false, product: null, deleteMode: 'archive', loading: false })
      if (editing === deleteModal.product._id) {
        setModal(false)
      }
      load(null, 'next', limit, searchQuery, filterCategory, filterType, filterStatus)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
      setDeleteModal((prev) => ({ ...prev, loading: false }))
    }
  }

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
        purchasePrice: Number(p.purchasePrice ?? p.costPrice ?? 0),
        regularPrice: Number(p.regularPrice ?? 0),
        salePrice: Number(p.salePrice ?? 0),
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
        faqs: p.faqs || [],
        guide: p.guide || { title: '', videoUrl: '', steps: [] },
        seo: p.seo || { title: '', description: '', keywords: [] },
        bannerImage: p.bannerImage,
        thumbnail: p.thumbnail,
        variants: (p.variants || []).map((v) => {
          const reg = Number(v.regularPrice || 0)
          const sale = Number(v.salePrice || 0)
          const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
          const buyCost = Number(v.purchasePrice ?? v.costPrice ?? 0)
          return {
            ...v,
            regularPrice: reg,
            salePrice: sale,
            costPrice: buyCost,
            purchasePrice: buyCost,
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

  const openDuplicate = async (id) => {
    try {
      const r = await adminGet(`/products/${id}`)
      const p = r.data
      setEditing(null)
      setForm({
        ...blank(),
        ...p,
        _id: undefined,
        name: `${p.name} (Copy)`,
        slug: '',
        category: p.category?._id || p.category,
        brand: p.brand || '',
        purchasePrice: Number(p.purchasePrice ?? p.costPrice ?? 0),
        regularPrice: Number(p.regularPrice ?? 0),
        salePrice: Number(p.salePrice ?? 0),
        productType: p.productType || 'digital-product',
        fulfillmentType: p.fulfillmentType || (p.deliveryType === 'instant' ? 'license_key' : 'manual'),
        fulfillmentConfig: p.fulfillmentConfig || {
          provider: 'default',
          serviceCode: '',
          autoDeliverKey: false,
          customInstructions: '',
        },
        tags: p.tags ? [...p.tags] : [],
        searchKeywords: p.searchKeywords ? [...p.searchKeywords] : [],
        details: p.details ? { ...p.details } : {},
        customFields: p.customFields ? JSON.parse(JSON.stringify(p.customFields)) : [],
        faqs: p.faqs ? JSON.parse(JSON.stringify(p.faqs)) : [],
        guide: p.guide ? JSON.parse(JSON.stringify(p.guide)) : { title: '', videoUrl: '', steps: [] },
        seo: { title: '', description: '', keywords: [] },
        bannerImage: p.bannerImage,
        thumbnail: p.thumbnail,
        variants: (p.variants || []).map((v) => {
          const reg = Number(v.regularPrice || 0)
          const sale = Number(v.salePrice || 0)
          const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
          const buyCost = Number(v.purchasePrice ?? v.costPrice ?? 0)
          return {
            ...v,
            _id: undefined,
            sku: v.sku ? `${v.sku}-COPY` : '',
            regularPrice: reg,
            salePrice: sale,
            costPrice: buyCost,
            purchasePrice: buyCost,
            discountPercent: disc,
            stock: 0,
            unlimitedStock: Boolean(v.unlimitedStock),
            region: v.region || '',
            platform: v.platform || '',
            duration: v.duration || '',
            active: v.active !== false,
          }
        }),
      })
      setActiveTab('general')
      setModal(true)
      notify(`Duplicated template from "${p.name}". Edit details and save to create copy.`, 'info')
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const exportCatalogCsv = () => {
    if (!items.length) {
      notify('No products available to export', 'error')
      return
    }

    const headers = [
      'Product Name',
      'Slug',
      'Category',
      'Brand',
      'Product Type',
      'Fulfillment Type',
      'Cost / Purchase Price (BDT)',
      'Regular Price (BDT)',
      'Sale Price (BDT)',
      'Stock Units',
      'Variants Count',
      'Status',
      'Featured',
      'Created At',
    ]

    const rows = items.map((p) => {
      const catName = typeof p.category === 'object' ? p.category?.name : (categories.find((c) => c._id === p.category)?.name || '')
      return [
        p.name || '',
        p.slug || '',
        catName || '',
        p.brand || '',
        p.productType || '',
        p.fulfillmentType || '',
        p.purchasePrice ?? p.costPrice ?? 0,
        p.regularPrice ?? 0,
        p.salePrice ?? 0,
        p.allowUnlimitedStock ? 'Unlimited' : (p.stock ?? 0),
        p.variants?.length || 0,
        p.status || '',
        p.featured ? 'Yes' : 'No',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
      ]
    })

    const csvContent = [
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `hexa_catalog_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify(`Exported ${items.length} products to CSV`, 'success')
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
      const basePurchasePrice = form.variants.length > 0
        ? Number(form.variants[0].purchasePrice ?? form.variants[0].costPrice ?? 0)
        : Number(form.purchasePrice ?? form.costPrice ?? 0)

      const payload = {
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim(),
        regularPrice: baseRegPrice,
        salePrice: baseSalePrice,
        purchasePrice: basePurchasePrice,
        costPrice: basePurchasePrice,
        stock: Number(form.stock || 100),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        customFields: form.customFields || [],
        variants: (form.variants || []).map((v, idx) => {
          const vCost = Number(v.purchasePrice ?? v.costPrice ?? 0)
          return {
            name: v.name.trim(),
            sku: v.sku?.trim() || '',
            duration: v.duration?.trim() || '',
            region: v.region?.trim() || '',
            platform: v.platform?.trim() || '',
            regularPrice: Number(v.regularPrice || 0),
            salePrice: Number(v.salePrice || v.regularPrice || 0),
            costPrice: vCost,
            purchasePrice: vCost,
            stock: v.unlimitedStock ? 9999 : Number(v.stock || 0),
            unlimitedStock: Boolean(v.unlimitedStock),
            sortOrder: idx,
            active: v.active !== false,
            metadata: v.metadata || {},
          }
        }),
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCatalogCsv}
              className="flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-3.5 py-2.5 text-xs font-bold text-[var(--hexa-text)] hover:border-purple-500/30 transition cursor-pointer"
              title="Export catalog to CSV"
            >
              <HugeiconsIcon icon={Copy01Icon} size={15} /> Export Catalog CSV
            </button>
            <button
              onClick={() => setStockEntryModal({ open: true, product: null, variantId: null })}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <HugeiconsIcon icon={Coins01Icon} size={15} /> Quick Stock Entry
            </button>
            <button onClick={openNew} className="hexa-btn">
              <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Product / Service
            </button>
          </div>
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

        <select
          className="hexa-input sm:w-40"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="hexa-card overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-[var(--hexa-border)] text-xs uppercase tracking-wider text-[var(--hexa-muted)]">
            <tr>
              {['Product / Service', 'Category', 'Type', 'Variants / Plans', 'Pricing & Margins', 'Stock Units', 'Status', 'Actions'].map((h) => (
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

              const hasVariants = variantCount > 0
              const minCost = hasVariants
                ? Math.min(...p.variants.map((v) => Number(v.purchasePrice ?? v.costPrice ?? 0)))
                : Number(p.purchasePrice ?? p.costPrice ?? 0)
              const maxCost = hasVariants
                ? Math.max(...p.variants.map((v) => Number(v.purchasePrice ?? v.costPrice ?? 0)))
                : Number(p.purchasePrice ?? p.costPrice ?? 0)
              const minProfit = minPrice - minCost
              const minMargin = minPrice > 0 ? Math.round((minProfit / minPrice) * 100) : 0

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
                  <td className="px-5 py-4">
                    <p className="font-bold text-[var(--hexa-text)]">
                      {minPrice === maxPrice ? (
                        `৳${minPrice.toLocaleString()}`
                      ) : (
                        `৳${minPrice.toLocaleString()} – ৳${maxPrice.toLocaleString()}`
                      )}
                    </p>
                    {maxCost > 0 ? (
                      <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <span>Cost: ৳{minCost === maxCost ? minCost.toLocaleString() : `${minCost.toLocaleString()}–${maxCost.toLocaleString()}`}</span>
                        <span className="text-[var(--hexa-muted)]">·</span>
                        <span className="font-semibold text-emerald-300">
                          +{minProfit >= 0 ? `৳${minProfit.toLocaleString()}` : `-৳${Math.abs(minProfit).toLocaleString()}`} ({minMargin}%)
                        </span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-[var(--hexa-muted)]">Cost not set</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${
                            p.allowUnlimitedStock
                              ? 'bg-blue-400'
                              : (p.stock || 0) <= (p.lowStockThreshold || 5)
                              ? 'bg-rose-400'
                              : 'bg-emerald-400'
                          }`} />
                          <span className="font-bold text-xs text-[var(--hexa-text)]">
                            {p.allowUnlimitedStock ? '∞ Unlimited' : `${Number(p.stock || 0).toLocaleString()} units`}
                          </span>
                        </div>
                        <StatusBadge value={p.stockStatus || 'in_stock'} />
                      </div>
                      {!p.allowUnlimitedStock && (
                        <button
                          type="button"
                          onClick={() => setStockEntryModal({ open: true, product: p, variantId: null })}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                          title="Quick Stock Entry / Cost Update"
                        >
                          <HugeiconsIcon icon={Coins01Icon} size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={p.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {!p.allowUnlimitedStock && (
                        <button
                          onClick={() => setStockEntryModal({ open: true, product: p, variantId: null })}
                          className="rounded-lg p-2 text-emerald-400 transition hover:bg-emerald-500/10 cursor-pointer"
                          title="Stock Entry & Cost Adjustment"
                        >
                          <HugeiconsIcon icon={Coins01Icon} size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(p._id)}
                        className="rounded-lg p-2 text-purple-300 transition hover:bg-purple-500/10 cursor-pointer"
                        title="Edit Product"
                      >
                        <HugeiconsIcon icon={Edit02Icon} size={16} />
                      </button>
                      <button
                        onClick={() => openDuplicate(p._id)}
                        className="rounded-lg p-2 text-indigo-400 transition hover:bg-indigo-500/10 cursor-pointer"
                        title="Duplicate / Clone Product"
                      >
                        <HugeiconsIcon icon={Copy01Icon} size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteModal({
                            open: true,
                            product: p,
                            deleteMode: 'archive',
                            loading: false,
                          })
                        }
                        className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10 cursor-pointer"
                        title="Delete or Archive Product"
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
              { id: 'guide_faqs', label: `6. FAQs & Guide (${(form.faqs?.length || 0) + (form.guide?.steps?.length || 0)})`, icon: HelpCircleIcon },
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

              {/* Base Pricing, Purchase Cost & Profit Margin */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                      <HugeiconsIcon icon={Coins01Icon} size={15} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--hexa-text)]">Base Pricing & Profit Margin (Single Product / Fallback)</h4>
                      <p className="text-[11px] text-[var(--hexa-muted)]">Set sourcing cost and selling prices to monitor earnings</p>
                    </div>
                  </div>
                  {Number(form.salePrice || form.regularPrice || 0) > 0 && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                        Number(form.salePrice || form.regularPrice || 0) - Number(form.purchasePrice || 0) >= 0
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}>
                        Est. Profit: {Number(form.salePrice || form.regularPrice || 0) - Number(form.purchasePrice || 0) >= 0 ? '+' : ''}৳{(Number(form.salePrice || form.regularPrice || 0) - Number(form.purchasePrice || 0)).toLocaleString()}
                        {' '}({Math.round(((Number(form.salePrice || form.regularPrice || 0) - Number(form.purchasePrice || 0)) / Math.max(1, Number(form.salePrice || form.regularPrice || 0))) * 100)}% margin)
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3 pt-1">
                  <Field label="Purchase / Buy Cost (৳)">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="hexa-input text-xs font-medium"
                      value={form.purchasePrice}
                      onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="Regular / List Price (৳)">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="hexa-input text-xs font-medium"
                      value={form.regularPrice}
                      onChange={(e) => setForm({ ...form, regularPrice: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </Field>

                  <Field label="Sale / Selling Price (৳)">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="hexa-input text-xs font-bold text-purple-300"
                      value={form.salePrice}
                      onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
                      placeholder="0"
                    />
                  </Field>
                </div>

                {form.variants?.length > 0 && (
                  <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                    💡 This product currently has {form.variants.length} variant(s). You can set individual purchase costs and selling prices in <strong>Tab 2 (Variants & Pricing)</strong>.
                  </p>
                )}
              </div>

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

          {/* TAB 6: FAQs & Redemption Guide */}
          {activeTab === 'guide_faqs' && (
            <div className="space-y-6">
              {/* Presets */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
                <p className="text-xs font-bold text-purple-400 mb-2">⚡ Quick Templates (Click to Auto-fill FAQs & Steps):</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        faqs: [
                          { question: 'How do I log in to the profile?', answer: 'Use the email and password provided in your order. Select your designated profile and enter the PIN.' },
                          { question: 'Can I change the password or email?', answer: 'No. Changing account credentials or sharing the profile will void your subscription warranty.' },
                        ],
                        guide: {
                          title: 'How to Access Your Streaming Account',
                          videoUrl: '',
                          steps: [
                            { stepNumber: 1, title: 'Check Order Deliveries', description: 'Open your HEXA order details to view assigned email, password, and profile PIN.', imageUrl: '' },
                            { stepNumber: 2, title: 'Log In on Official App / Web', description: 'Enter credentials and select only your allocated profile number/name.', imageUrl: '' },
                            { stepNumber: 3, title: 'Enjoy Streaming', description: 'Stream smoothly across your supported TV, mobile, or browser device.', imageUrl: '' },
                          ],
                        },
                      })
                      notify('Streaming template loaded!')
                    }}
                    className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20"
                  >
                    + Streaming Subscription Preset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        faqs: [
                          { question: 'Where do I find my Player ID / Zone ID?', answer: 'Open the game, click on your avatar profile at the top left. Your User ID and Zone ID are displayed there.' },
                          { question: 'How long does top-up take?', answer: 'Delivery is typically completed in 2 to 15 minutes after payment verification.' },
                        ],
                        guide: {
                          title: 'How Game Direct Top-Up Works',
                          videoUrl: '',
                          steps: [
                            { stepNumber: 1, title: 'Provide Player ID & Zone ID', description: 'Enter your in-game User ID and Zone ID in the required customer fields above.', imageUrl: '' },
                            { stepNumber: 2, title: 'Complete Payment', description: 'Submit order with your transaction details.', imageUrl: '' },
                            { stepNumber: 3, title: 'Receive Diamonds / In-game currency', description: 'Diamonds/credits are added directly to your account. Restart game if needed.', imageUrl: '' },
                          ],
                        },
                      })
                      notify('Game top-up template loaded!')
                    }}
                    className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20"
                  >
                    + Game Direct Top-up Preset
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        faqs: [
                          { question: 'Is this genuine official license?', answer: 'Yes. All license keys are 100% genuine retail/commercial keys activated directly on official vendor software.' },
                          { question: 'How many devices can I activate?', answer: 'Unless stated otherwise in the plan, each license key is valid for 1 PC/Device.' },
                        ],
                        guide: {
                          title: 'How to Redeem Your Software License Key',
                          videoUrl: '',
                          steps: [
                            { stepNumber: 1, title: 'Download Official Software', description: 'Download installer directly from official vendor website.', imageUrl: '' },
                            { stepNumber: 2, title: 'Enter License Key', description: 'Navigate to Activation / License settings and paste your delivered 25-digit key.', imageUrl: '' },
                            { stepNumber: 3, title: 'Online Activation', description: 'Click Activate. The software will verify against official servers.', imageUrl: '' },
                          ],
                        },
                      })
                      notify('License key template loaded!')
                    }}
                    className="rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20"
                  >
                    + Software License Preset
                  </button>
                </div>
              </div>

              {/* FAQs Manager */}
              <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--hexa-text)]">Product-Specific FAQs ({form.faqs?.length || 0})</h4>
                    <p className="text-xs text-[var(--hexa-muted)]">These appear as an accordion on the product details page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, faqs: [...(form.faqs || []), { question: '', answer: '' }] })}
                    className="hexa-btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    + Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {(form.faqs || []).map((faq, idx) => (
                    <div key={idx} className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400">FAQ #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, faqs: form.faqs.filter((_, i) => i !== idx) })}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        className="hexa-input text-xs"
                        placeholder="Question (e.g. How to find my MLBB Zone ID?)"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...form.faqs]
                          updated[idx] = { ...updated[idx], question: e.target.value }
                          setForm({ ...form, faqs: updated })
                        }}
                      />
                      <textarea
                        rows={2}
                        className="hexa-input text-xs"
                        placeholder="Detailed answer shown when expanded..."
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...form.faqs]
                          updated[idx] = { ...updated[idx], answer: e.target.value }
                          setForm({ ...form, faqs: updated })
                        }}
                      />
                    </div>
                  ))}
                  {(!form.faqs || form.faqs.length === 0) && (
                    <p className="text-xs text-[var(--hexa-muted)] text-center py-3">No FAQs added yet. Click "+ Add FAQ" or use a quick template above.</p>
                  )}
                </div>
              </div>

              {/* Step-by-Step Redemption Guide Builder */}
              <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hexa-border)] pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[var(--hexa-text)]">How-To-Redeem Guide & Steps ({form.guide?.steps?.length || 0})</h4>
                    <p className="text-xs text-[var(--hexa-muted)]">Visual step-by-step instructions shown on the product page.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentGuide = form.guide || { title: '', videoUrl: '', steps: [] }
                      const newSteps = [...(currentGuide.steps || []), { stepNumber: (currentGuide.steps?.length || 0) + 1, title: '', description: '', imageUrl: '' }]
                      setForm({ ...form, guide: { ...currentGuide, steps: newSteps } })
                    }}
                    className="hexa-btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Guide Main Title">
                    <input
                      className="hexa-input text-xs"
                      placeholder="e.g. How to activate and use this product"
                      value={form.guide?.title || ''}
                      onChange={(e) => setForm({ ...form, guide: { ...(form.guide || {}), title: e.target.value } })}
                    />
                  </Field>
                  <Field label="Video Tutorial URL (YouTube/Vimeo, optional)">
                    <input
                      className="hexa-input text-xs"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={form.guide?.videoUrl || ''}
                      onChange={(e) => setForm({ ...form, guide: { ...(form.guide || {}), videoUrl: e.target.value } })}
                    />
                  </Field>
                </div>

                <div className="space-y-3">
                  {(form.guide?.steps || []).map((step, idx) => (
                    <div key={idx} className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400">Step {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedSteps = form.guide.steps.filter((_, i) => i !== idx)
                            setForm({ ...form, guide: { ...form.guide, steps: updatedSteps } })
                          }}
                          className="text-xs text-rose-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className="hexa-input text-xs"
                          placeholder="Step title (e.g. Open Profile Page)"
                          value={step.title}
                          onChange={(e) => {
                            const steps = [...form.guide.steps]
                            steps[idx] = { ...steps[idx], title: e.target.value }
                            setForm({ ...form, guide: { ...form.guide, steps } })
                          }}
                        />
                        <input
                          className="hexa-input text-xs"
                          placeholder="Step screenshot/diagram image URL (optional)"
                          value={step.imageUrl || ''}
                          onChange={(e) => {
                            const steps = [...form.guide.steps]
                            steps[idx] = { ...steps[idx], imageUrl: e.target.value }
                            setForm({ ...form, guide: { ...form.guide, steps } })
                          }}
                        />
                      </div>
                      <textarea
                        rows={2}
                        className="hexa-input text-xs"
                        placeholder="Detailed instructions for this step..."
                        value={step.description}
                        onChange={(e) => {
                          const steps = [...form.guide.steps]
                          steps[idx] = { ...steps[idx], description: e.target.value }
                          setForm({ ...form, guide: { ...form.guide, steps } })
                        }}
                      />
                    </div>
                  ))}
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
                  const tabs = ['general', 'variants', 'fields', 'fulfillment', 'media', 'guide_faqs']
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
                  const tabs = ['general', 'variants', 'fields', 'fulfillment', 'media', 'guide_faqs']
                  const idx = tabs.indexOf(activeTab)
                  if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1])
                }}
                disabled={activeTab === 'guide_faqs'}
                className="hexa-btn-secondary !px-3 !py-2 text-xs disabled:opacity-40"
              >
                Next Step &rarr;
              </button>
            </div>

            <div className="flex items-center gap-3">
              {editing && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModal({
                      open: true,
                      product: { _id: editing, name: form.name, thumbnail: form.thumbnail, slug: form.slug },
                      deleteMode: 'archive',
                      loading: false,
                    })
                  }}
                  className="hexa-btn-secondary !border-rose-500/30 !bg-rose-500/10 !text-rose-400 hover:!bg-rose-500/20 mr-auto"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={15} />
                  <span>Delete Product</span>
                </button>
              )}
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

      {/* Delete & Archive Confirmation Modal */}
      <Modal
        open={deleteModal.open}
        onClose={() => !deleteModal.loading && setDeleteModal({ open: false, product: null, deleteMode: 'archive', loading: false })}
        title="Delete or Archive Product"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3">
            {deleteModal.product?.thumbnail?.url ? (
              <img
                src={deleteModal.product.thumbnail.url}
                alt=""
                className="h-12 w-12 rounded-lg object-cover border border-[var(--hexa-border)]"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                HEXA
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-sm text-[var(--hexa-text)] truncate">
                {deleteModal.product?.name}
              </h4>
              <p className="text-xs text-[var(--hexa-muted)]">
                /{deleteModal.product?.slug || deleteModal.product?._id}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              onClick={() => setDeleteModal((prev) => ({ ...prev, deleteMode: 'archive' }))}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                deleteModal.deleteMode === 'archive'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] hover:border-purple-500/30'
              }`}
            >
              <input
                type="radio"
                name="deleteOption"
                checked={deleteModal.deleteMode === 'archive'}
                onChange={() => setDeleteModal((prev) => ({ ...prev, deleteMode: 'archive' }))}
                className="mt-0.5 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[var(--hexa-text)]">Archive Product (Safe / Soft Delete)</span>
                  <span className="rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold px-1.5 py-0.5">
                    Recommended
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--hexa-muted)]">
                  Hides the product from the customer store and disables future orders, while keeping existing orders, customer receipts, and subscription records completely intact.
                </p>
              </div>
            </label>

            <label
              onClick={() => setDeleteModal((prev) => ({ ...prev, deleteMode: 'permanent' }))}
              className={`flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition ${
                deleteModal.deleteMode === 'permanent'
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] hover:border-rose-500/30'
              }`}
            >
              <input
                type="radio"
                name="deleteOption"
                checked={deleteModal.deleteMode === 'permanent'}
                onChange={() => setDeleteModal((prev) => ({ ...prev, deleteMode: 'permanent' }))}
                className="mt-0.5 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="font-bold text-xs text-rose-400">Permanently Delete</span>
                <p className="mt-0.5 text-xs text-[var(--hexa-muted)]">
                  Completely removes this product, variants, and uploaded Cloudinary images from the database. (Cannot be undone).
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[var(--hexa-border)] pt-4">
            <button
              type="button"
              disabled={deleteModal.loading}
              onClick={() => setDeleteModal({ open: false, product: null, deleteMode: 'archive', loading: false })}
              className="hexa-btn-secondary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteModal.loading}
              onClick={handleDeleteProduct}
              className={
                deleteModal.deleteMode === 'permanent'
                  ? 'hexa-btn !bg-rose-600 hover:!bg-rose-500 disabled:opacity-50 cursor-pointer'
                  : 'hexa-btn disabled:opacity-50 cursor-pointer'
              }
            >
              {deleteModal.loading
                ? 'Processing...'
                : deleteModal.deleteMode === 'permanent'
                ? 'Permanently Delete Product'
                : 'Archive Product'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Stock Entry & Profit Adjustment Modal */}
      <StockEntryModal
        open={stockEntryModal.open}
        onClose={() => setStockEntryModal({ open: false, product: null, variantId: null })}
        initialProduct={stockEntryModal.product}
        initialVariantId={stockEntryModal.variantId}
        products={items}
        onSuccess={() => {
          load()
        }}
      />
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
