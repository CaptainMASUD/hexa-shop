import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CloudDownloadIcon,
  Comment01Icon,
  Delete02Icon,
  Discount01Icon,
  Edit02Icon,
  BellIcon,
  FloppyDiskIcon,
  GiftIcon,
  PackageIcon,
  PlusSignIcon,
  RefreshIcon,
  Shield01Icon,
  StarIcon,
  Ticket01Icon,
  UserShield01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  UserCircleIcon,
  Search01Icon,
  ShoppingBag01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'
import { adminDelete, adminGet, adminPatch, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import StatusBadge from '../../components/StatusBadge'
import Modal from '../../components/Modal'
import AdminCursorPagination from '../../components/AdminCursorPagination'

const tabs = [
  ['Coupons', 'coupons', Discount01Icon],
  ['Bundles', 'bundles', GiftIcon],
  ['Promotions', 'promotions', StarIcon],
  ['Affiliate Payouts', 'affiliate_payouts', GiftIcon],
  ['Fraud Blacklist', 'fraud_blacklist', Shield01Icon],
  ['Restock Alerts', 'restock_alerts', BellIcon],
  ['Support', 'support', Ticket01Icon],
  ['Refunds', 'refunds', RefreshIcon],
  ['Reviews', 'reviews', Comment01Icon],
  ['Notifications', 'notifications', BellIcon],
  ['Abandoned carts', 'abandoned', PackageIcon],
  ['Roles', 'roles', UserShield01Icon],
  ['Settings', 'settings', FloppyDiskIcon],
  ['Backup', 'backup', CloudDownloadIcon],
]

export default function AdminGrowthFeatures() {
  const [tab, setTab] = useState('coupons')
  return (
    <>
      <AdminPageHeader
        title="Growth & experience"
        description="Manage coupons, bundles, affiliate payouts, fraud protection blacklist, retention, support, permissions and storefront settings."
      />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map(([label, key, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === key ? 'bg-[var(--hexa-accent-soft)] text-[var(--hexa-text)] ring-1 ring-inset ring-[var(--hexa-border)]' : 'hexa-btn-secondary !py-2.5'
            }`}
          >
            <HugeiconsIcon icon={Icon} size={15} />{label}
          </button>
        ))}
      </div>

      {tab === 'coupons' && <Coupons />}
      {tab === 'bundles' && <Bundles />}
      {tab === 'promotions' && <Promotions />}
      {tab === 'affiliate_payouts' && <AffiliatePayouts />}
      {tab === 'fraud_blacklist' && <FraudBlacklist />}
      {tab === 'restock_alerts' && <RestockAlerts />}
      {tab === 'support' && <Support />}
      {tab === 'refunds' && <Refunds />}
      {tab === 'reviews' && <Reviews />}
      {tab === 'notifications' && <Notifications />}
      {tab === 'abandoned' && <Abandoned />}
      {tab === 'roles' && <Roles />}
      {tab === 'settings' && <Settings />}
      {tab === 'backup' && <Backup />}
    </>
  )
}

const emptyCoupon = {
  code: '',
  description: '',
  type: 'percent',
  value: 10,
  minOrder: 0,
  maxDiscount: 0,
  usageLimit: 0,
  perUserLimit: 1,
  allowedProducts: [],
  allowedCategories: [],
  allowedBundles: [],
  startsAt: '',
  endsAt: '',
  active: true,
}

function Coupons() {
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [bundles, setBundles] = useState([])
  const [form, setForm] = useState(emptyCoupon)
  const [editingId, setEditingId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const { notify } = useToast()

  const load = async () => {
    const [couponRes, productRes, categoryRes, bundleRes] = await Promise.all([
      adminGet('/features/coupons'),
      adminGet('/products', { limit: 200 }),
      adminGet('/categories'),
      adminGet('/features/bundles'),
    ])
    setRows(couponRes.data || [])
    setProducts(productRes.data || [])
    setCategories(categoryRes.data || [])
    setBundles(bundleRes.data || [])
  }

  useEffect(() => { load().catch(() => {}) }, [])

  const reset = () => {
    setEditingId('')
    setForm(emptyCoupon)
  }

  const openCreateModal = () => {
    reset()
    setModalOpen(true)
  }

  const edit = (coupon) => {
    setEditingId(coupon._id)
    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      type: coupon.type || 'percent',
      value: Number(coupon.value || 0),
      minOrder: Number(coupon.minOrder || 0),
      maxDiscount: Number(coupon.maxDiscount || 0),
      usageLimit: Number(coupon.usageLimit || 0),
      perUserLimit: Number(coupon.perUserLimit || 1),
      allowedProducts: ids(coupon.allowedProducts),
      allowedCategories: ids(coupon.allowedCategories),
      allowedBundles: ids(coupon.allowedBundles),
      startsAt: toLocalInput(coupon.startsAt),
      endsAt: toLocalInput(coupon.endsAt),
      active: coupon.active !== false,
    })
    setModalOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      value: Number(form.value || 0),
      minOrder: Number(form.minOrder || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      usageLimit: Number(form.usageLimit || 0),
      perUserLimit: Number(form.perUserLimit || 1),
      startsAt: toIsoOrNull(form.startsAt),
      endsAt: toIsoOrNull(form.endsAt),
    }
    try {
      if (editingId) await adminPut(`/features/coupons/${editingId}`, payload)
      else await adminPost('/features/coupons', payload)
      notify(editingId ? 'Coupon updated' : 'Coupon created')
      setModalOpen(false)
      reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const remove = async (coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? Historical order references will be preserved.`)) return
    try {
      await adminDelete(`/features/coupons/${coupon._id}`)
      notify('Coupon deleted')
      if (editingId === coupon._id) reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <ListCard
        title={`Discount Coupons (${rows.length})`}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="hexa-btn text-xs flex items-center gap-1.5 !py-2 !px-3.5"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Coupon
          </button>
        }
      >
        {rows.length ? rows.map((coupon) => (
          <Row
            key={coupon._id}
            title={
              <span className="flex items-center gap-2">
                <span className="font-mono font-bold text-purple-300">{coupon.code}</span>
                <span className="rounded bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300 uppercase">
                  {coupon.type === 'percent' ? `${coupon.value}% OFF` : `৳${coupon.value} OFF`}
                </span>
              </span>
            }
            sub={`${coupon.description ? `${coupon.description} · ` : ''}Used: ${coupon.usedCount}/${coupon.usageLimit || '∞'} · Targets: ${targetSummary(coupon.allowedProducts, coupon.allowedCategories, coupon.allowedBundles)}`}
            status={coupon.active ? 'active' : 'inactive'}
            actions={<CrudActions onEdit={() => edit(coupon)} onDelete={() => remove(coupon)} />}
          />
        )) : <EmptyAdminRow text="No coupons yet. Click 'Add Coupon' above to create one." />}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Coupon: ${form.code}` : 'Create Discount Coupon'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={save} className="space-y-4 text-xs">
          <Input label="Coupon Code *" value={form.code} set={(value) => setForm({ ...form, code: value.toUpperCase() })} placeholder="e.g. SUMMER50, WELCOME10" required />
          <Input label="Description / Internal Label" value={form.description} set={(value) => setForm({ ...form, description: value })} placeholder="e.g. 10% off store-wide promotion" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Discount Type" value={form.type} set={(value) => setForm({ ...form, type: value })} options={['percent', 'fixed']} />
            <Input label={form.type === 'percent' ? 'Discount Percentage (%) *' : 'Fixed Discount Amount (৳) *'} type="number" value={form.value} set={(value) => setForm({ ...form, value: Number(value) })} required />
            <Input label="Minimum Order Subtotal (৳)" type="number" value={form.minOrder} set={(value) => setForm({ ...form, minOrder: Number(value) })} />
            <Input label="Maximum Discount Cap (৳, 0 = no cap)" type="number" value={form.maxDiscount} set={(value) => setForm({ ...form, maxDiscount: Number(value) })} />
            <Input label="Total Store Usage Limit (0 = unlimited)" type="number" value={form.usageLimit} set={(value) => setForm({ ...form, usageLimit: Number(value) })} />
            <Input label="Per-User Usage Limit" type="number" value={form.perUserLimit} set={(value) => setForm({ ...form, perUserLimit: Number(value) })} />
          </div>

          <TargetEditor
            title="Targeted Items (leave unselected to apply to all products)"
            products={products}
            categories={categories}
            bundles={bundles}
            productIds={form.allowedProducts}
            categoryIds={form.allowedCategories}
            bundleIds={form.allowedBundles}
            setProductIds={(allowedProducts) => setForm({ ...form, allowedProducts })}
            setCategoryIds={(allowedCategories) => setForm({ ...form, allowedCategories })}
            setBundleIds={(allowedBundles) => setForm({ ...form, allowedBundles })}
          />

          <div className="grid grid-cols-2 gap-3">
            <DateInput label="Active From (Starts at)" value={form.startsAt} set={(value) => setForm({ ...form, startsAt: value })} />
            <DateInput label="Expires At (Ends at)" value={form.endsAt} set={(value) => setForm({ ...form, endsAt: value })} />
          </div>
          <Checkbox label="Coupon is Active & Redeemable" checked={form.active} set={(active) => setForm({ ...form, active })} />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button type="button" onClick={() => setModalOpen(false)} className="hexa-btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> {editingId ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const emptyBundle = {
  name: '',
  code: '',
  shortDescription: '',
  description: '',
  regularPrice: 0,
  salePrice: 0,
  featured: true,
  status: 'active',
  imageUrl: '',
  bannerImageUrl: '',
  startsAt: '',
  endsAt: '',
  tags: '',
  items: [newBundleComponent(), newBundleComponent()],
}

function newBundleComponent() {
  return { product: '', variantId: '', quantity: 1 }
}

function Bundles() {
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState(emptyBundle)
  const [editingId, setEditingId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const { notify } = useToast()

  const load = async () => {
    const [bundleRes, productRes] = await Promise.all([
      adminGet('/features/bundles'),
      adminGet('/products', { limit: 200 }),
    ])
    setRows(bundleRes.data || [])
    setProducts(productRes.data || [])
  }

  useEffect(() => { load().catch(() => {}) }, [])

  const reset = () => {
    setEditingId('')
    setForm({ ...emptyBundle, items: [newBundleComponent(), newBundleComponent()] })
  }

  const openCreateModal = () => {
    reset()
    setModalOpen(true)
  }

  const edit = (bundle) => {
    setEditingId(bundle._id)
    setForm({
      name: bundle.name || '',
      code: bundle.code || '',
      shortDescription: bundle.shortDescription || '',
      description: bundle.description || '',
      regularPrice: Number(bundle.regularPrice || 0),
      salePrice: Number(bundle.salePrice || 0),
      featured: Boolean(bundle.featured),
      status: bundle.status || 'active',
      imageUrl: bundle.image?.url || '',
      bannerImageUrl: bundle.bannerImage?.url || '',
      startsAt: toLocalInput(bundle.startsAt),
      endsAt: toLocalInput(bundle.endsAt),
      tags: (bundle.tags || []).join(', '),
      items: (bundle.items || []).map((item) => ({
        product: objectId(item.product),
        variantId: item.variantId || '',
        quantity: Number(item.quantity || 1),
      })),
    })
    setModalOpen(true)
  }

  const updateComponent = (index, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  const removeComponent = (index) => {
    setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))
  }

  const save = async (event) => {
    event.preventDefault()
    const validItems = form.items.filter((item) => item.product)
    if (validItems.length < 2) {
      notify('A bundle needs at least two product components', 'error')
      return
    }

    const duplicateKeys = validItems.map((item) => `${item.product}:${item.variantId || ''}`)
    if (new Set(duplicateKeys).size !== duplicateKeys.length) {
      notify('The same product/plan cannot be added twice to one bundle', 'error')
      return
    }

    const payload = {
      name: form.name,
      code: form.code,
      shortDescription: form.shortDescription,
      description: form.description,
      regularPrice: Number(form.regularPrice || 0),
      salePrice: Number(form.salePrice || 0),
      featured: Boolean(form.featured),
      status: form.status,
      image: form.imageUrl ? { url: form.imageUrl, publicId: '', alt: form.name } : undefined,
      bannerImage: form.bannerImageUrl ? { url: form.bannerImageUrl, publicId: '', alt: form.name } : undefined,
      startsAt: toIsoOrNull(form.startsAt),
      endsAt: toIsoOrNull(form.endsAt),
      tags: form.tags.split(',').map((value) => value.trim()).filter(Boolean),
      items: validItems.map((item) => ({
        product: item.product,
        variantId: item.variantId || null,
        quantity: Math.max(1, Math.min(20, Number(item.quantity || 1))),
      })),
    }

    try {
      if (editingId) await adminPut(`/features/bundles/${editingId}`, payload)
      else await adminPost('/features/bundles', payload)
      notify(editingId ? 'Bundle updated' : 'Bundle created')
      setModalOpen(false)
      reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const remove = async (bundle) => {
    if (!window.confirm(`Delete bundle "${bundle.name}"? It will also be removed from active carts and campaign/coupon targets.`)) return
    try {
      await adminDelete(`/features/bundles/${bundle._id}`)
      notify('Bundle deleted')
      if (editingId === bundle._id) reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <ListCard
        title={`Product Bundles (${rows.length})`}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="hexa-btn text-xs flex items-center gap-1.5 !py-2 !px-3.5"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Bundle
          </button>
        }
      >
        {rows.length ? rows.map((bundle) => (
          <Row
            key={bundle._id}
            title={
              <span className="flex items-center gap-2">
                <span className="font-bold text-white">{bundle.name}</span>
                {bundle.badge && (
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                    {bundle.badge}
                  </span>
                )}
                {bundle.featured && (
                  <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                    Featured
                  </span>
                )}
              </span>
            }
            sub={`${bundle.items?.length || 0} component(s) included · Sale Price: ৳${Number(bundle.salePrice || 0).toLocaleString()} ${bundle.regularPrice ? `(Regular: ৳${Number(bundle.regularPrice).toLocaleString()})` : ''} · ${bundle.shortDescription || bundle.subtitle || ''}`}
            status={bundle.status}
            actions={<CrudActions onEdit={() => edit(bundle)} onDelete={() => remove(bundle)} />}
          />
        )) : <EmptyAdminRow text="No product bundles created yet. Click 'Add Bundle' above." />}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Bundle: ${form.name}` : 'Create First-Class Bundle'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={save} className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Bundle Name *" value={form.name} set={(name) => setForm({ ...form, name })} placeholder="e.g. Creator Ultimate Pack" required />
            <Input label="URL Slug (optional)" value={form.slug} set={(slug) => setForm({ ...form, slug })} placeholder="e.g. creator-ultimate-pack" />
          </div>
          <Input label="Subtitle / Short Hook" value={form.subtitle} set={(subtitle) => setForm({ ...form, subtitle })} placeholder="e.g. Netflix Premium + Spotify Duo combo" />
          <TextArea label="Full Description" value={form.description} set={(description) => setForm({ ...form, description })} rows={2} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Bundle Sale Price (৳) *" type="number" value={form.price} set={(price) => setForm({ ...form, price })} required />
            <Input label="Original / Strike Price (৳)" type="number" value={form.regularPrice} set={(regularPrice) => setForm({ ...form, regularPrice })} />
            <Input label="Promotional Badge" value={form.badge} set={(badge) => setForm({ ...form, badge })} placeholder="e.g. SAVE 25%" />
          </div>

          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3">
            <Input label="Banner Image URL" value={form.bannerImageUrl} set={(bannerImageUrl) => setForm({ ...form, bannerImageUrl })} placeholder="https://..." />
          </div>

          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-white">Bundle Components (Minimum 2)</p>
                <p className="text-[11px] text-[var(--hexa-muted)]">Choose products/variants and quantities that comprise this bundle.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, items: [...form.items, newBundleComponent()] })}
                className="hexa-btn-secondary !px-2.5 !py-1 text-xs flex items-center gap-1"
              >
                <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add Component
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => {
                const product = products.find((entry) => entry._id === item.product)
                const variants = (product?.variants || []).filter((variant) => variant.active)
                return (
                  <div key={`${index}-${item.product}-${item.variantId}`} className="grid gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 sm:grid-cols-[1fr_1fr_90px_36px] items-center">
                    <select
                      className="hexa-input text-xs"
                      value={item.product}
                      onChange={(event) => updateComponent(index, { product: event.target.value, variantId: '' })}
                      required
                    >
                      <option value="">Select product...</option>
                      {products.filter((entry) => entry.status !== 'archived').map((entry) => <option key={entry._id} value={entry._id}>{entry.name}</option>)}
                    </select>
                    <select className="hexa-input text-xs" value={item.variantId} onChange={(event) => updateComponent(index, { variantId: event.target.value })}>
                      <option value="">Base product / Default</option>
                      {variants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name}</option>)}
                    </select>
                    <input className="hexa-input text-xs" type="number" min="1" max="20" value={item.quantity} onChange={(event) => updateComponent(index, { quantity: Number(event.target.value) })} title="Quantity per bundle" placeholder="Qty" />
                    <button type="button" onClick={() => removeComponent(index)} disabled={form.items.length <= 2} className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-20 disabled:cursor-not-allowed" title="Remove component">
                      <HugeiconsIcon icon={Delete02Icon} size={15} className="mx-auto" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Status" value={form.status} set={(status) => setForm({ ...form, status })} options={['active', 'inactive', 'archived']} />
            <Input label="Tags (comma separated)" value={form.tags} set={(tags) => setForm({ ...form, tags })} placeholder="gaming, streaming" />
            <DateInput label="Starts At" value={form.startsAt} set={(startsAt) => setForm({ ...form, startsAt })} />
            <DateInput label="Ends At" value={form.endsAt} set={(endsAt) => setForm({ ...form, endsAt })} />
          </div>
          <Checkbox label="Feature on storefront homepage & highlights" checked={form.featured} set={(featured) => setForm({ ...form, featured })} />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button type="button" onClick={() => setModalOpen(false)} className="hexa-btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> {editingId ? 'Save Changes' : 'Create Bundle'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const emptyPromotion = {
  name: '',
  headline: '',
  description: '',
  badge: 'Limited offer',
  buttonText: 'Explore offer',
  buttonLink: '/offers',
  imageUrl: '',
  discountType: 'display_only',
  discountValue: 0,
  scope: 'targeted',
  products: [],
  categories: [],
  bundles: [],
  startsAt: '',
  endsAt: '',
  active: true,
  displayOrder: 0,
}

function Promotions() {
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [bundles, setBundles] = useState([])
  const [form, setForm] = useState(emptyPromotion)
  const [editingId, setEditingId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const { notify } = useToast()

  const load = async () => {
    const [promotionRes, productRes, categoryRes, bundleRes] = await Promise.all([
      adminGet('/features/promotions'),
      adminGet('/products', { limit: 200 }),
      adminGet('/categories'),
      adminGet('/features/bundles'),
    ])
    setRows(promotionRes.data || [])
    setProducts(productRes.data || [])
    setCategories(categoryRes.data || [])
    setBundles(bundleRes.data || [])
  }

  useEffect(() => { load().catch(() => {}) }, [])

  const reset = () => {
    setEditingId('')
    setForm(emptyPromotion)
    setModalOpen(false)
  }

  const edit = (promotion) => {
    setEditingId(promotion._id)
    setForm({
      name: promotion.name || '',
      headline: promotion.headline || '',
      description: promotion.description || '',
      badge: promotion.badge || '',
      buttonText: promotion.buttonText || '',
      buttonLink: promotion.buttonLink || '/offers',
      imageUrl: promotion.image?.url || '',
      discountType: promotion.discountType || 'display_only',
      discountValue: Number(promotion.discountValue || 0),
      scope: promotion.scope || 'targeted',
      products: ids(promotion.products),
      categories: ids(promotion.categories),
      bundles: ids(promotion.bundles || (promotion.bundle ? [promotion.bundle] : [])),
      startsAt: toLocalInput(promotion.startsAt),
      endsAt: toLocalInput(promotion.endsAt),
      active: promotion.active !== false,
      displayOrder: Number(promotion.displayOrder || 0),
    })
    setModalOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    if (form.discountType !== 'display_only' && form.scope === 'targeted' && !form.products.length && !form.categories.length && !form.bundles.length) {
      notify('A targeted discount campaign needs at least one product, category or bundle', 'error')
      return
    }

    const payload = {
      name: form.name,
      headline: form.headline,
      description: form.description,
      badge: form.badge,
      buttonText: form.buttonText,
      buttonLink: form.buttonLink,
      image: form.imageUrl ? { url: form.imageUrl, publicId: '' } : undefined,
      discountType: form.discountType,
      discountValue: form.discountType === 'display_only' ? 0 : Number(form.discountValue || 0),
      scope: form.scope,
      products: form.scope === 'all' ? [] : form.products,
      categories: form.scope === 'all' ? [] : form.categories,
      bundles: form.scope === 'all' ? [] : form.bundles,
      startsAt: toIsoOrNull(form.startsAt),
      endsAt: toIsoOrNull(form.endsAt),
      active: Boolean(form.active),
      displayOrder: Number(form.displayOrder || 0),
    }

    try {
      if (editingId) await adminPut(`/features/promotions/${editingId}`, payload)
      else await adminPost('/features/promotions', payload)
      notify(editingId ? 'Campaign updated' : 'Campaign created')
      setModalOpen(false)
      reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const remove = async (promotion) => {
    if (!window.confirm(`Delete campaign "${promotion.name}"?`)) return
    try {
      await adminDelete(`/features/promotions/${promotion._id}`)
      notify('Campaign deleted')
      if (editingId === promotion._id) reset()
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <ListCard
        title="Promotions / campaigns"
        action={
          <button
            onClick={() => {
              reset()
              setModalOpen(true)
            }}
            className="hexa-btn text-xs !py-2 !px-3"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Create Campaign
          </button>
        }
      >
        {rows.length ? (
          rows.map((promotion) => (
            <Row
              key={promotion._id}
              title={promotion.headline || promotion.name}
              sub={`${promotion.discountType === 'display_only' ? 'Display campaign' : `${promotion.discountType} ${promotion.discountValue}`} · ${promotion.scope || 'targeted'} · ${targetSummary(promotion.products, promotion.categories, promotion.bundles)}`}
              status={promotion.active ? 'active' : 'inactive'}
              actions={<CrudActions onEdit={() => edit(promotion)} onDelete={() => remove(promotion)} />}
            />
          ))
        ) : (
          <EmptyAdminRow text="No campaigns yet." />
        )}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Campaign' : 'Create Campaign'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={save} className="space-y-4">
          <Input label="Campaign name" value={form.name} set={(name) => setForm({ ...form, name })} required />
          <Input label="Headline" value={form.headline} set={(headline) => setForm({ ...form, headline })} />
          <TextArea label="Description" value={form.description} set={(description) => setForm({ ...form, description })} rows={3} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Badge" value={form.badge} set={(badge) => setForm({ ...form, badge })} />
            <Input label="Image URL" value={form.imageUrl} set={(imageUrl) => setForm({ ...form, imageUrl })} />
            <Input label="Button text" value={form.buttonText} set={(buttonText) => setForm({ ...form, buttonText })} />
            <Input label="Button link" value={form.buttonLink} set={(buttonLink) => setForm({ ...form, buttonLink })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Discount type" value={form.discountType} set={(discountType) => setForm({ ...form, discountType })} options={['display_only', 'percent', 'fixed']} />
            <Input label="Discount value" type="number" value={form.discountValue} set={(discountValue) => setForm({ ...form, discountValue: Number(discountValue) })} disabled={form.discountType === 'display_only'} />
            <Select label="Scope" value={form.scope} set={(scope) => setForm({ ...form, scope })} options={['targeted', 'all']} />
          </div>

          {form.scope === 'targeted' && (
            <TargetEditor
              title="Campaign targets"
              products={products}
              categories={categories}
              bundles={bundles}
              productIds={form.products}
              categoryIds={form.categories}
              bundleIds={form.bundles}
              setProductIds={(productIds) => setForm({ ...form, products: productIds })}
              setCategoryIds={(categoryIds) => setForm({ ...form, categories: categoryIds })}
              setBundleIds={(bundleIds) => setForm({ ...form, bundles: bundleIds })}
            />
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <DateInput label="Starts at" value={form.startsAt} set={(startsAt) => setForm({ ...form, startsAt })} />
            <DateInput label="Ends at" value={form.endsAt} set={(endsAt) => setForm({ ...form, endsAt })} />
            <Input label="Display order" type="number" value={form.displayOrder} set={(displayOrder) => setForm({ ...form, displayOrder: Number(displayOrder) })} />
          </div>
          <Checkbox label="Active" checked={form.active} set={(active) => setForm({ ...form, active })} />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button type="button" onClick={() => setModalOpen(false)} className="hexa-btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> {editingId ? 'Save Changes' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function Support() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [escalationFilter, setEscalationFilter] = useState('all')
  const [activeTicket, setActiveTicket] = useState(null)
  const [ticketDetails, setTicketDetails] = useState(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replyStatus, setReplyStatus] = useState('waiting_customer')
  const [replyPriority, setReplyPriority] = useState('medium')
  const [sending, setSending] = useState(false)
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const { notify } = useToast()

  const load = () => {
    setLoading(true)
    const params = {}
    if (statusFilter !== 'all') params.status = statusFilter
    if (escalationFilter === 'escalated') params.needsAdmin = 'true'
    adminGet('/features/support-tickets', params)
      .then((res) => setRows(res.data || []))
      .catch((err) => notify(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter, escalationFilter])

  const openTicketModal = async (ticket) => {
    setActiveTicket(ticket)
    setTicketDetails(null)
    setReplyMessage('')
    setReplyStatus(ticket.status || 'waiting_customer')
    setReplyPriority(ticket.priority || 'medium')
    try {
      const res = await adminGet(`/features/support-tickets/${ticket._id}`)
      setTicketDetails(res.data)
      setReplyStatus(res.data.status || 'waiting_customer')
      setReplyPriority(res.data.priority || 'medium')
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyMessage.trim() || !activeTicket) return
    setSending(true)
    try {
      await adminPost(`/features/support-tickets/${activeTicket._id}/replies`, {
        message: replyMessage.trim(),
        status: replyStatus,
      })
      if (replyPriority !== ticketDetails?.priority) {
        await adminPatch(`/features/support-tickets/${activeTicket._id}/status`, {
          priority: replyPriority,
          status: replyStatus,
        }).catch(() => {})
      }
      notify('Reply sent successfully', 'success')
      setReplyMessage('')
      const res = await adminGet(`/features/support-tickets/${activeTicket._id}`)
      setTicketDetails(res.data)
      load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status) => {
    if (!activeTicket) return
    try {
      await adminPatch(`/features/support-tickets/${activeTicket._id}/status`, { status })
      notify(`Ticket status set to ${status}`, 'success')
      setReplyStatus(status)
      if (ticketDetails) setTicketDetails({ ...ticketDetails, status })
      load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    }
  }

  const handleAiAnalyze = async () => {
    if (!activeTicket) return
    setAnalyzingAi(true)
    try {
      const res = await adminPost(`/features/support-tickets/${activeTicket._id}/ai-analyze`)
      const data = res.data || {}
      if (data.draftReply) {
        setReplyMessage(data.draftReply)
      }
      if (data.suggestedStatus) {
        setReplyStatus(data.suggestedStatus)
      }
      if (data.suggestedPriority) {
        setReplyPriority(data.suggestedPriority)
      }
      if (data.adminReport) {
        setTicketDetails((prev) => ({
          ...prev,
          aiReport: data.adminReport,
        }))
      }
      notify('AI agent analysis complete! Suggested reply drafted.', 'success')
      load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setAnalyzingAi(false)
    }
  }

  const filteredRows = rows.filter((r) => {
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
    if (escalationFilter === 'ai_handled' && !r.aiHandled) return false
    return true
  })

  const currentReport = ticketDetails?.aiReport || activeTicket?.aiReport

  return (
    <>
      <ListCard
        title={`Customer Support Tickets (${filteredRows.length})`}
        action={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="hexa-input !py-1 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting Customer</option>
              <option value="closed">Closed / Resolved</option>
            </select>
            <select
              value={escalationFilter}
              onChange={(e) => setEscalationFilter(e.target.value)}
              className="hexa-input !py-1 text-xs"
            >
              <option value="all">All Channels</option>
              <option value="escalated">⚠️ AI Escalated Only</option>
              <option value="ai_handled">🤖 AI Handled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="hexa-input !py-1 text-xs"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button onClick={load} className="hexa-btn-secondary !py-1 text-xs">
              <HugeiconsIcon icon={RefreshIcon} size={14} />
            </button>
          </div>
        }
      >
        {loading ? (
          <EmptyAdminRow text="Loading support tickets..." />
        ) : filteredRows.length ? (
          filteredRows.map((ticket) => {
            const needsAction = Boolean(ticket.aiReport?.needsAdminAction)
            return (
              <div
                key={ticket._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition ${
                  needsAction
                    ? 'bg-amber-500/[0.07] border-l-4 border-amber-500 hover:bg-amber-500/[0.12]'
                    : 'hover:bg-[var(--hexa-surface)]/50'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs text-purple-400">{ticket.ticketNumber}</span>
                    <span className="font-semibold text-sm text-[var(--hexa-text)]">{ticket.subject}</span>
                    <StatusBadge value={ticket.status} />
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                      ticket.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400' :
                      ticket.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {ticket.priority || 'medium'}
                    </span>

                    {needsAction && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <span>⚠️</span> AI Escalated: Action Required
                      </span>
                    )}

                    {!needsAction && ticket.aiHandled && (
                      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        <span>🤖</span> AI Handled
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--hexa-muted)]">
                    <span>Customer: <strong className="text-[var(--hexa-text)]">{ticket.user?.name || 'Customer'}</strong> ({ticket.user?.email || '—'})</span>
                    <span>Category: {ticket.category || 'General'}</span>
                    {ticket.aiReport?.sentiment && (
                      <span className="capitalize">Sentiment: <span className="text-gray-300 font-medium">{ticket.aiReport.sentiment}</span></span>
                    )}
                    <span>Last activity: {new Date(ticket.lastReplyAt || ticket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTicketModal(ticket)}
                    className="hexa-btn !py-1.5 !px-3 text-xs font-bold"
                  >
                    View & Reply
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <EmptyAdminRow text="No support tickets found matching the criteria." />
        )}
      </ListCard>

      {/* Ticket Conversation Modal */}
      <Modal
        open={Boolean(activeTicket)}
        onClose={() => setActiveTicket(null)}
        title={activeTicket ? `Ticket ${activeTicket.ticketNumber}: ${activeTicket.subject}` : 'Support Ticket'}
        maxWidth="max-w-2xl"
      >
        {activeTicket && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-200">{ticketDetails?.user?.name || activeTicket.user?.name}</span>
                  <span className="text-gray-400">({ticketDetails?.user?.email || activeTicket.user?.email})</span>
                  {ticketDetails?.user?.phone && <span className="text-gray-400">· {ticketDetails.user.phone}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={ticketDetails?.status || activeTicket.status} />
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-purple-500/15 text-purple-300">
                    {ticketDetails?.priority || activeTicket.priority}
                  </span>
                </div>
              </div>
              {ticketDetails?.order && (
                <p className="text-purple-400 font-mono">Linked Order: #{ticketDetails.order.orderNumber || ticketDetails.order}</p>
              )}
            </div>

            {/* AI Diagnostics & Escalation Report Card */}
            {currentReport && (currentReport.issueSummary || currentReport.needsAdminAction) && (
              <div className={`rounded-xl border p-3.5 space-y-2.5 transition ${
                currentReport.needsAdminAction
                  ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-rose-950/20 to-black/40 text-amber-100 shadow-md'
                  : 'border-cyan-500/30 bg-cyan-950/20 text-cyan-100'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{currentReport.needsAdminAction ? '⚠️' : '🤖'}</span>
                    <span className="font-bold text-xs">
                      {currentReport.needsAdminAction
                        ? 'AI Escalation Report — Administrative Action Required'
                        : 'AI Support Agent Diagnosis (Self-Resolved / In Progress)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {currentReport.sentiment && (
                      <span className="rounded px-2 py-0.5 font-semibold uppercase bg-white/10 text-gray-200">
                        Sentiment: {currentReport.sentiment}
                      </span>
                    )}
                    {currentReport.urgency && (
                      <span className={`rounded px-2 py-0.5 font-bold uppercase ${
                        currentReport.urgency === 'urgent' ? 'bg-rose-500/30 text-rose-300' :
                        currentReport.urgency === 'high' ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-500/20 text-slate-300'
                      }`}>
                        Urgency: {currentReport.urgency}
                      </span>
                    )}
                  </div>
                </div>

                {currentReport.issueSummary && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-gray-400 tracking-wider">Issue Summary:</span>
                    <p className="text-xs text-gray-200 mt-0.5 leading-relaxed">{currentReport.issueSummary}</p>
                  </div>
                )}

                {currentReport.escalationReason && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-amber-300/90 tracking-wider">Escalation Trigger:</span>
                    <p className="text-xs text-amber-200 mt-0.5 leading-relaxed">{currentReport.escalationReason}</p>
                  </div>
                )}

                {currentReport.recommendedAction && (
                  <div className="rounded-lg bg-black/40 border border-emerald-500/30 p-2.5">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <span>🛠️</span> Recommended Administrator Action:
                    </span>
                    <p className="text-xs text-emerald-200 font-medium mt-1 leading-relaxed">{currentReport.recommendedAction}</p>
                  </div>
                )}
              </div>
            )}

            {/* Conversation Messages Thread */}
            <div className="max-h-[350px] overflow-y-auto space-y-3 p-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] custom-scrollbar">
              <div className="rounded-xl p-3 bg-white/[0.04] border border-white/5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-semibold text-gray-200">{activeTicket.user?.name || 'Customer'} (Original Inquiry)</span>
                  <span>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{ticketDetails?.description || activeTicket.description || activeTicket.subject}</p>
              </div>

              {(ticketDetails?.messages || []).map((msg, i) => {
                const isAi = Boolean(msg.isAi)
                const isAdmin = !isAi && (msg.isAdmin || msg.sender?.role === 'admin')
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3 space-y-1 max-w-[88%] ${
                      isAi
                        ? 'ml-auto bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 shadow-sm'
                        : isAdmin
                        ? 'ml-auto bg-purple-600/15 border border-purple-500/30'
                        : 'mr-auto bg-white/[0.04] border border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className={`font-bold ${isAi ? 'text-cyan-300' : isAdmin ? 'text-purple-300' : 'text-gray-300'}`}>
                        {isAi ? '🤖 HEXA AI Support Assistant' : isAdmin ? '🛡️ HEXA Staff Support' : (msg.sender?.name || activeTicket.user?.name || 'Customer')}
                      </span>
                      <span className="text-gray-400 text-[10px]">{msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}</span>
                    </div>
                    <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                )
              })}
            </div>

            {/* Reply and status form */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2 border-t border-[var(--hexa-border)]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Set Ticket Status on Reply</label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="hexa-input !py-1 text-xs"
                  >
                    <option value="waiting_customer">Waiting for Customer</option>
                    <option value="in_progress">In Progress / Investigating</option>
                    <option value="resolved">Resolved / Complete</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">Priority</label>
                  <select
                    value={replyPriority}
                    onChange={(e) => setReplyPriority(e.target.value)}
                    className="hexa-input !py-1 text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-300">Admin Response</label>
                  <button
                    type="button"
                    disabled={analyzingAi}
                    onClick={handleAiAnalyze}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 disabled:opacity-50"
                  >
                    <span>{analyzingAi ? '⏳ Analyzing...' : '✨ AI Analyze & Draft Reply'}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="hexa-input text-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('closed')}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    Close Ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('in_progress')}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    Mark In Progress
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTicket(null)}
                    className="hexa-btn-secondary !py-1.5 text-xs"
                  >
                    Done
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="hexa-btn !py-1.5 !px-4 text-xs font-bold"
                  >
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </>
  )
}

function Refunds() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [creditWallet, setCreditWallet] = useState(true)
  const [targetStatus, setTargetStatus] = useState('completed')
  const [processing, setProcessing] = useState(false)
  const { notify } = useToast()

  const load = () => {
    setLoading(true)
    adminGet('/features/refunds')
      .then((res) => setRows(res.data || []))
      .catch((err) => notify(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openReviewModal = (refund, defaultStatus = 'completed') => {
    setModalItem(refund)
    setTargetStatus(defaultStatus)
    setAdminNote(refund.adminNote || '')
    setCreditWallet(true)
  }

  const submitRefundAction = async (e) => {
    e.preventDefault()
    if (!modalItem) return
    setProcessing(true)
    try {
      await adminPatch(`/features/refunds/${modalItem._id}`, {
        status: targetStatus,
        adminNote: adminNote.trim() || 'Processed by store administrator',
        creditWallet: targetStatus === 'completed' && creditWallet,
      })
      notify(`Refund marked as ${targetStatus}`)
      setModalItem(null)
      load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <ListCard
        title={`Refund Requests (${rows.length})`}
        action={
          <button onClick={load} className="hexa-btn-secondary !py-1 text-xs flex items-center gap-1">
            <HugeiconsIcon icon={RefreshIcon} size={14} /> Refresh
          </button>
        }
      >
        {loading ? (
          <EmptyAdminRow text="Loading refund requests..." />
        ) : rows.length ? (
          rows.map((refund) => (
            <div key={refund._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[var(--hexa-surface)]/50 transition">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-[var(--hexa-text)]">
                    {refund.order?.orderNumber ? `#${refund.order.orderNumber}` : 'Order'}
                  </span>
                  <span className="font-black text-sm text-purple-400">
                    ৳{Number(refund.requestedAmount || 0).toLocaleString()}
                  </span>
                  <StatusBadge value={refund.status} />
                </div>
                <div className="mt-1 text-xs text-[var(--hexa-muted)] space-y-0.5">
                  <p>Customer: <strong className="text-[var(--hexa-text)]">{refund.user?.name || 'Customer'}</strong> ({refund.user?.email || '—'})</p>
                  <p>Reason: <span className="text-gray-300">{refund.reason || 'No reason specified'}</span></p>
                  {refund.adminNote && (
                    <p className="text-amber-400 font-mono text-[11px]">Admin Note: {refund.adminNote}</p>
                  )}
                  <p className="text-[11px] text-gray-400">Requested on: {new Date(refund.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!['completed', 'rejected'].includes(refund.status) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openReviewModal(refund, 'reviewing')}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => openReviewModal(refund, 'rejected')}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => openReviewModal(refund, 'completed')}
                      className="hexa-btn !py-1.5 !px-3 text-xs font-bold"
                    >
                      Process & Settle
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-gray-500 font-semibold uppercase">Resolved</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyAdminRow text="No refund requests found." />
        )}
      </ListCard>

      {/* Refund Review & Action Modal */}
      <Modal
        open={Boolean(modalItem)}
        onClose={() => setModalItem(null)}
        title="Process Refund Request"
        maxWidth="max-w-md"
      >
        {modalItem && (
          <form onSubmit={submitRefundAction} className="space-y-4 text-xs">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 space-y-1">
              <p className="text-[var(--hexa-muted)]">Order: <strong className="text-gray-100">#{modalItem.order?.orderNumber}</strong></p>
              <p className="text-[var(--hexa-muted)]">Customer: <strong className="text-gray-100">{modalItem.user?.name}</strong> ({modalItem.user?.email})</p>
              <p className="text-[var(--hexa-muted)]">Requested Amount: <strong className="text-purple-400 font-bold text-sm">৳{modalItem.requestedAmount}</strong></p>
              <p className="text-[var(--hexa-muted)]">Reason: <span className="text-gray-200">{modalItem.reason}</span></p>
            </div>

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1">Set Status</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="hexa-input text-xs"
              >
                <option value="completed">Approve & Complete</option>
                <option value="reviewing">Under Review / Investigating</option>
                <option value="rejected">Reject Request</option>
              </select>
            </div>

            {targetStatus === 'completed' && (
              <label className="flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={creditWallet}
                  onChange={(e) => setCreditWallet(e.target.checked)}
                />
                <div>
                  <p className="font-bold text-gray-200">Credit User Wallet Balance</p>
                  <p className="text-[11px] text-[var(--hexa-muted)]">Instantly adds ৳{modalItem.requestedAmount} to the customer's store wallet.</p>
                </div>
              </label>
            )}

            <div>
              <label className="block font-semibold text-[var(--hexa-text)] mb-1">
                Admin Note / Explanation (Visible to customer)
              </label>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Approved and refunded to wallet, or invalid claim reason"
                className="hexa-input text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="hexa-btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="hexa-btn"
              >
                {processing ? 'Processing...' : `Save ${targetStatus}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

function Reviews() {
  const [rows, setRows] = useState([])
  const { notify } = useToast()
  const load = () => adminGet('/features/reviews').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const updateStatus = async (id, status) => {
    try {
      await adminPatch(`/features/reviews/${id}`, { status })
      notify('Review updated')
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <ListCard title="Reviews & moderation">
      {rows.length ? rows.map((review) => (
        <Row
          key={review._id}
          title={`${review.product?.name || 'Product'} · ${review.rating}/5`}
          sub={`${review.user?.name || 'Customer'} · ${review.comment}`}
          status={review.status}
          actions={<div className="flex gap-2"><button onClick={() => updateStatus(review._id, 'published')} className="text-xs font-semibold text-emerald-600">Publish</button><button onClick={() => updateStatus(review._id, 'hidden')} className="text-xs font-semibold text-rose-500">Hide</button></div>}
        />
      )) : <EmptyAdminRow text="No reviews." />}
    </ListCard>
  )
}

function Notifications() {
  const [rows, setRows] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ audience: 'all', type: 'info', title: '', message: '', link: '/' })
  const { notify } = useToast()
  const load = () => adminGet('/features/notifications').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const save = async (event) => {
    event.preventDefault()
    try {
      await adminPost('/features/notifications', form)
      notify('In-app notification published')
      setForm({ audience: 'all', type: 'info', title: '', message: '', link: '/' })
      setModalOpen(false)
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <>
      <ListCard
        title="Recent notifications"
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="hexa-btn text-xs !py-2 !px-3"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Publish Notification
          </button>
        }
      >
        {rows.length ? (
          rows.slice(0, 30).map((notification) => (
            <Row
              key={notification._id}
              title={notification.title}
              sub={`${notification.audience} · ${notification.message}`}
              status={notification.type}
            />
          ))
        ) : (
          <EmptyAdminRow text="No notifications published yet." />
        )}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Publish In-App Notification"
        maxWidth="max-w-md"
      >
        <form onSubmit={save} className="space-y-4">
          <Select label="Audience" value={form.audience} set={(audience) => setForm({ ...form, audience })} options={['all', 'user', 'admin']} />
          <Input label="Title" value={form.title} set={(title) => setForm({ ...form, title })} placeholder="e.g. Weekend Flash Sale" required />
          <TextArea label="Message" value={form.message} set={(message) => setForm({ ...form, message })} rows={3} placeholder="Notification description or message..." required />
          <Input label="Target Link / Path" value={form.link} set={(link) => setForm({ ...form, link })} placeholder="/offers or /products/..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button type="button" onClick={() => setModalOpen(false)} className="hexa-btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> Publish Notification
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function RestockAlerts() {
  const [rows, setRows] = useState([])
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dispatchingId, setDispatchingId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const { notify } = useToast()

  const load = () => {
    setLoading(true)
    adminGet('/features/restock-alerts')
      .then((res) => {
        setRows(res.data || [])
        setTotalAlerts(res.totalPendingAlerts || 0)
      })
      .catch((err) => notify(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleNotify = async (item) => {
    if (!window.confirm(`Broadcast back-in-stock alert to ${item.totalRequests} customer(s) for ${item.productName}?`)) return
    setDispatchingId(`${item.productId}:${item.variantId || 'base'}`)
    try {
      await adminPost(`/features/restock-alerts/${item.productId}/trigger`, { variantId: item.variantId })
      notify('Restock alerts dispatched successfully!', 'success')
      load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setDispatchingId(null)
    }
  }

  return (
    <>
      <ListCard
        title={`Customer Restock Waitlist (${rows.length} products, ${totalAlerts} requests)`}
        action={
          <button onClick={load} className="hexa-btn-secondary !py-1 text-xs flex items-center gap-1">
            <HugeiconsIcon icon={RefreshIcon} size={14} /> Refresh
          </button>
        }
      >
        {loading ? (
          <EmptyAdminRow text="Loading customer restock requests..." />
        ) : rows.length ? (
          rows.map((item) => (
            <div key={`${item.productId}:${item.variantId || 'base'}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[var(--hexa-surface)]/50 transition">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold overflow-hidden shrink-0 border border-purple-500/20">
                  {item.productThumbnail?.url ? (
                    <img src={item.productThumbnail.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <HugeiconsIcon icon={BellIcon} size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-[var(--hexa-text)]">{item.productName}</span>
                    {item.variantName && (
                      <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-300">
                        {item.variantName}
                      </span>
                    )}
                    <span className="rounded-md bg-amber-500/15 px-2.5 py-0.5 text-xs font-black text-amber-400">
                      {item.totalRequests} Waiting Request{item.totalRequests > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--hexa-muted)]">
                    <span>Current Stock: <strong className={item.productStock > 0 ? 'text-emerald-400' : 'text-rose-400'}>{item.productStock} units</strong></span>
                    <span>Last Requested: {new Date(item.lastRequestedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="hexa-btn-secondary !py-1.5 !px-3 text-xs font-semibold"
                >
                  View Emails ({item.requests.length})
                </button>
                <button
                  type="button"
                  disabled={dispatchingId === `${item.productId}:${item.variantId || 'base'}`}
                  onClick={() => handleNotify(item)}
                  className="hexa-btn !py-1.5 !px-3 text-xs font-bold"
                >
                  {dispatchingId === `${item.productId}:${item.variantId || 'base'}` ? 'Dispatching...' : 'Notify Customers'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyAdminRow text="No pending restock requests. All customers have been notified or stock is healthy!" />
        )}
      </ListCard>

      {/* Modal to view waiting emails */}
      <Modal
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem ? `Waiting Customers for ${selectedItem.productName}` : 'Subscribers'}
        maxWidth="max-w-md"
      >
        {selectedItem && (
          <div className="space-y-3 text-xs">
            <p className="text-[var(--hexa-muted)]">
              Showing <strong className="text-gray-100">{selectedItem.requests.length}</strong> customer(s) who signed up for restock alerts:
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-2">
              {selectedItem.requests.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03]">
                  <span className="font-mono text-gray-200">{r.email}</span>
                  <span className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedItem(null)} className="hexa-btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

function Abandoned() {
  const [rows, setRows] = useState([])
  const [sendingId, setSendingId] = useState(null)
  const { notify } = useToast()

  const load = () => adminGet('/features/abandoned-carts').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const sendReminder = async (cart) => {
    setSendingId(cart._id)
    try {
      await adminPost(`/features/abandoned-carts/${cart._id}/recover`)
      notify(`Cart recovery notification sent to ${cart.user?.name || cart.user?.email}`, 'success')
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <ListCard title={`Abandoned Carts 24h+ Inactivity (${rows.length})`} action={<button onClick={load} className="hexa-btn-secondary !py-2">Refresh</button>}>
      {rows.length ? rows.map((cart) => {
        const bundles = (cart.items || []).filter((item) => item.itemType === 'bundle').length
        const products = (cart.items || []).length - bundles
        return (
          <div key={cart._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[var(--hexa-surface)]/50 transition">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-[var(--hexa-text)]">{cart.user?.name || 'Customer'}</span>
                <span className="text-xs text-[var(--hexa-muted)]">({cart.user?.email || 'No email'})</span>
                <StatusBadge value="abandoned" />
              </div>
              <div className="mt-1 text-xs text-[var(--hexa-muted)] space-y-0.5">
                <p>Items in Cart: <strong className="text-gray-200">{products} product line(s), {bundles} bundle line(s)</strong></p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(cart.items || []).slice(0, 3).map((item, idx) => (
                    <span key={idx} className="rounded bg-white/[0.05] border border-white/5 px-2 py-0.5 text-[11px] text-gray-300">
                      {item.product?.name || item.bundle?.name || 'Item'} × {item.quantity}
                    </span>
                  ))}
                  {(cart.items || []).length > 3 && (
                    <span className="text-[11px] text-gray-400">+{cart.items.length - 3} more</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Last active: {new Date(cart.lastActivityAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                disabled={sendingId === cart._id}
                onClick={() => sendReminder(cart)}
                className="hexa-btn !py-1.5 !px-3 text-xs font-bold"
              >
                {sendingId === cart._id ? 'Sending...' : 'Send Recovery Reminder'}
              </button>
            </div>
          </div>
        )
      }) : <EmptyAdminRow text="No abandoned carts currently detected." />}
    </ListCard>
  )
}

const ROLE_PERMISSIONS = [
  { id: 'catalog.manage', label: 'Catalog & Products', category: 'Catalog' },
  { id: 'inventory.manage', label: 'Inventory & Keys', category: 'Inventory' },
  { id: 'orders.manage', label: 'Orders & Deliveries', category: 'Orders' },
  { id: 'users.manage', label: 'Users & Wallet', category: 'Users' },
  { id: 'roles.manage', label: 'Roles & Staff', category: 'Staff' },
  { id: 'reports.view', label: 'Reports & Analytics', category: 'Analytics' },
  { id: 'growth.manage', label: 'Marketing & Growth', category: 'Marketing' },
  { id: 'support.manage', label: 'Support Helpdesk', category: 'Support' },
  { id: 'reviews.manage', label: 'Reviews Moderation', category: 'Moderation' },
  { id: 'refunds.manage', label: 'Refund Requests', category: 'Finance' },
  { id: 'settings.manage', label: 'Store Settings', category: 'Settings' },
  { id: 'audit.view', label: 'Audit Trail Logs', category: 'Security' },
  { id: 'backup.manage', label: 'Backup & Restore', category: 'System' },
]

function Roles() {
  const [rows, setRows] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: ['products.read', 'orders.read'],
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const { notify } = useToast()

  const load = () =>
    adminGet('/features/roles')
      .then((res) => setRows(res.data || []))
      .catch((err) => notify(apiErrorMessage(err, 'Failed to load roles'), 'error'))

  useEffect(() => {
    load()
  }, [])

  const togglePermission = (permId) => {
    setForm((prev) => {
      const exists = prev.permissions.includes(permId)
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      }
    })
  }

  const selectAll = () => {
    setForm((prev) => ({
      ...prev,
      permissions: ROLE_PERMISSIONS.map((p) => p.id),
    }))
  }

  const clearAll = () => {
    setForm((prev) => ({ ...prev, permissions: [] }))
  }

  const startEdit = (role) => {
    setEditingId(role._id)
    setForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
      active: role.active !== false,
    })
    setModalOpen(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      description: '',
      permissions: ['orders.manage', 'catalog.manage'],
      active: true,
    })
  }

  const openCreateModal = () => {
    resetForm()
    setModalOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.name.trim()) {
      notify('Role name is required', 'error')
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: form.name.trim(),
        slug: form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: form.description.trim(),
        permissions: form.permissions,
        active: Boolean(form.active),
        system: false,
      }

      if (editingId) {
        await adminPut(`/features/roles/${editingId}`, payload)
        notify('Custom staff role updated successfully', 'success')
      } else {
        await adminPost('/features/roles', payload)
        notify('Custom staff role created successfully', 'success')
      }

      resetForm()
      setModalOpen(false)
      await load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  const removeRole = async (role) => {
    if (role.system) {
      notify('System default roles cannot be deleted', 'error')
      return
    }
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) return

    try {
      await adminDelete(`/features/roles/${role._id}`)
      notify(`Role "${role.name}" deleted`)
      if (editingId === role._id) {
        resetForm()
        setModalOpen(false)
      }
      await load()
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    }
  }

  return (
    <>
      <ListCard
        title={`Custom Role Profiles (${rows.length})`}
        action={
          <button
            type="button"
            onClick={openCreateModal}
            className="hexa-btn text-xs !py-2 !px-3 flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Staff Role
          </button>
        }
      >
        {rows.length > 0 ? (
          rows.map((role) => (
            <div
              key={role._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-white/[0.01] transition border-b border-white/5 last:border-0"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--hexa-text)]">{role.name}</h3>
                  <StatusBadge value={role.active ? 'active' : 'inactive'} />
                  {role.system && (
                    <span className="rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold">
                      System
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-[var(--hexa-muted)] line-clamp-1">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(role.permissions || []).map((perm) => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300 font-mono"
                    >
                      {perm}
                    </span>
                  ))}
                  {(!role.permissions || role.permissions.length === 0) && (
                    <span className="text-[11px] text-gray-500 italic">No permissions granted</span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(role)}
                  className="rounded-lg p-2 text-purple-400 hover:bg-purple-500/10 transition"
                  title="Edit Role"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={15} />
                </button>
                {!role.system && (
                  <button
                    type="button"
                    onClick={() => removeRole(role)}
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete Role"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <EmptyAdminRow text="No custom role profiles defined yet. Click '+ Add Staff Role' to create one." />
        )}
      </ListCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Staff Role Profile' : 'Create Custom Staff Role'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Role Profile Name"
            value={form.name}
            set={(name) => setForm({ ...form, name })}
            placeholder="e.g. Catalog Manager, Support Lead, Billing Clerk"
            required
          />

          <TextArea
            label="Description"
            value={form.description}
            set={(description) => setForm({ ...form, description })}
            rows={2}
            placeholder="Brief explanation of duties and access level..."
          />

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
                Assigned Permissions ({form.permissions.length}/{ROLE_PERMISSIONS.length})
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-semibold text-purple-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-500 text-[11px]">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-gray-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]">
              {ROLE_PERMISSIONS.map((perm) => {
                const checked = form.permissions.includes(perm.id)
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-2.5 rounded-lg p-2 text-xs cursor-pointer transition border ${
                      checked
                        ? 'border-purple-500/40 bg-purple-500/10 text-white'
                        : 'border-white/5 bg-white/[0.01] text-gray-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(perm.id)}
                      className="mt-0.5 rounded border-gray-600 text-purple-600 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{perm.label}</p>
                      <p className="text-[10px] text-[var(--hexa-muted)] mt-0.5 font-mono">{perm.id}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <Checkbox
            label="Role is Active & Assignable"
            checked={form.active}
            set={(active) => setForm({ ...form, active })}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="hexa-btn text-xs !py-2 !px-4"
            >
              <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function Settings() {
  const [data, setData] = useState(null)
  const [faqModalOpen, setFaqModalOpen] = useState(false)
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [faqQ, setFaqQ] = useState('')
  const [faqA, setFaqA] = useState('')
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState('order.created,order.paid')
  const { notify } = useToast()

  useEffect(() => {
    adminGet('/features/settings').then((response) => setData(response.data)).catch(() => {})
  }, [])

  if (!data) return <div className="hexa-card h-64 animate-pulse" />

  const save = async (event) => {
    if (event) event.preventDefault()
    try {
      const response = await adminPut('/features/settings', data)
      setData(response.data)
      notify('Site settings saved successfully', 'success')
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const toggle = (key) => setData({
    ...data,
    homepage: { ...data.homepage, [key]: data.homepage?.[key] === false },
  })

  const addFaq = (e) => {
    if (e) e.preventDefault()
    if (!faqQ.trim() || !faqA.trim()) return
    const updated = [...(data.faq || []), { question: faqQ.trim(), answer: faqA.trim() }]
    setData({ ...data, faq: updated })
    setFaqQ('')
    setFaqA('')
    setFaqModalOpen(false)
    notify('FAQ item added to staged settings. Click Save to persist.', 'info')
  }

  const removeFaq = (index) => {
    const updated = (data.faq || []).filter((_, i) => i !== index)
    setData({ ...data, faq: updated })
  }

  const addWebhook = (e) => {
    if (e) e.preventDefault()
    if (!webhookName.trim() || !webhookUrl.trim()) return
    const events = webhookEvents.split(',').map((e) => e.trim()).filter(Boolean)
    const updated = [...(data.webhooks || []), {
      name: webhookName.trim(),
      url: webhookUrl.trim(),
      events,
      active: true,
    }]
    setData({ ...data, webhooks: updated })
    setWebhookName('')
    setWebhookUrl('')
    setWebhookModalOpen(false)
    notify('Webhook added to staged settings. Click Save to persist.', 'info')
  }

  const removeWebhook = (index) => {
    const updated = (data.webhooks || []).filter((_, i) => i !== index)
    setData({ ...data, webhooks: updated })
  }

  return (
    <>
      <form onSubmit={save} className="grid gap-6 xl:grid-cols-2">
        {/* Maintenance Mode & Emergency Controls */}
        <FormCard title="Store Status & Maintenance Mode">
          <div className="space-y-3">
            <label className="flex items-center gap-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(data.maintenanceMode)}
                onChange={(e) => setData({ ...data, maintenanceMode: e.target.checked })}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <div>
                <p className="font-bold text-gray-200">Emergency Maintenance Mode</p>
                <p className="text-[11px] text-[var(--hexa-muted)]">When enabled, store checkout and catalog will display the maintenance screen to non-admin visitors.</p>
              </div>
            </label>
            <TextArea
              label="Maintenance Notice Message"
              value={data.maintenanceMessage || ''}
              set={(maintenanceMessage) => setData({ ...data, maintenanceMessage })}
              rows={2}
            />
          </div>
        </FormCard>

        {/* Homepage & SEO */}
        <FormCard title="Homepage & SEO">
          <div className="space-y-3">
            <Input label="Store name" value={data.storeName || ''} set={(storeName) => setData({ ...data, storeName })} />
            <Input label="Tagline" value={data.tagline || ''} set={(tagline) => setData({ ...data, tagline })} />
            <Input label="SEO title" value={data.seo?.title || ''} set={(title) => setData({ ...data, seo: { ...data.seo, title } })} />
            <TextArea label="SEO description" value={data.seo?.description || ''} set={(description) => setData({ ...data, seo: { ...data.seo, description } })} rows={3} />
            <Input label="Homepage announcement" value={data.homepage?.announcement || ''} set={(announcement) => setData({ ...data, homepage: { ...data.homepage, announcement } })} />
            <div className="pt-2">
              <p className="hexa-label">Homepage sections</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  ['showCategories', 'Categories'],
                  ['showFeatured', 'Featured products'],
                  ['showBundles', 'Bundles'],
                  ['showPromotions', 'Promotions'],
                  ['showPopular', 'Popular products'],
                  ['showWhyHexa', 'Why HEXA / support'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] p-3 text-sm">
                    <input type="checkbox" checked={data.homepage?.[key] !== false} onChange={() => toggle(key)} />{label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </FormCard>

        {/* Rewards & loyalty */}
        <FormCard title="Rewards & loyalty">
          <div className="space-y-3">
            <Checkbox label="Enable loyalty & referral rewards" checked={data.loyalty?.enabled !== false} set={(enabled) => setData({ ...data, loyalty: { ...data.loyalty, enabled } })} />
            <Input type="number" label="Points per ৳100" value={data.loyalty?.pointsPer100BDT || 0} set={(value) => setData({ ...data, loyalty: { ...data.loyalty, pointsPer100BDT: Number(value) } })} />
            <Input type="number" label="Point value in BDT" value={data.loyalty?.pointValueBDT || 0} set={(value) => setData({ ...data, loyalty: { ...data.loyalty, pointValueBDT: Number(value) } })} />
            <Input type="number" label="Referral reward BDT" value={data.loyalty?.referralRewardBDT || 0} set={(value) => setData({ ...data, loyalty: { ...data.loyalty, referralRewardBDT: Number(value) } })} />
            <p className="hexa-label">Currency rates from BDT</p>
            {(data.currencies || []).map((currency, index) => (
              <div key={currency.code} className="grid grid-cols-[80px_1fr] gap-2">
                <input disabled className="hexa-input" value={currency.code} />
                <input
                  type="number"
                  step="0.000001"
                  className="hexa-input"
                  value={currency.rateFromBDT}
                  onChange={(event) => {
                    const currencies = [...data.currencies]
                    currencies[index] = { ...currency, rateFromBDT: Number(event.target.value) }
                    setData({ ...data, currencies })
                  }}
                />
              </div>
            ))}
          </div>
        </FormCard>

        {/* Storefront FAQs Manager */}
        <FormCard
          title={`Store FAQs (${(data.faq || []).length})`}
          action={
            <button
              type="button"
              onClick={() => setFaqModalOpen(true)}
              className="hexa-btn text-xs !py-1 !px-2.5 flex items-center gap-1"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={13} /> Add FAQ
            </button>
          }
        >
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(data.faq || []).length === 0 ? (
              <p className="text-xs text-[var(--hexa-muted)] py-4 text-center">No FAQs configured yet. Click "+ Add FAQ" above.</p>
            ) : (
              data.faq.map((f, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-200">{f.question}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-2">{f.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFaq(i)}
                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="Remove FAQ"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </FormCard>

        {/* Outgoing Webhooks Manager */}
        <FormCard
          title={`Outgoing Webhooks (${(data.webhooks || []).length})`}
          action={
            <button
              type="button"
              onClick={() => setWebhookModalOpen(true)}
              className="hexa-btn text-xs !py-1 !px-2.5 flex items-center gap-1"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={13} /> Add Webhook
            </button>
          }
        >
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(data.webhooks || []).length === 0 ? (
              <p className="text-xs text-[var(--hexa-muted)] py-4 text-center">No webhooks registered. Click "+ Add Webhook" above.</p>
            ) : (
              data.webhooks.map((w, i) => (
                <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-200">{w.name}</p>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${w.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {w.active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p className="font-mono text-purple-400 text-[10px] truncate mt-0.5">{w.url}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Events: {(w.events || []).join(', ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWebhook(i)}
                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition"
                    title="Remove Webhook"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </FormCard>

        <div className="xl:col-span-2">
          <button type="submit" className="hexa-btn w-full sm:w-auto">
            <HugeiconsIcon icon={FloppyDiskIcon} size={15} /> Save All Settings
          </button>
        </div>
      </form>

      <Modal
        open={faqModalOpen}
        onClose={() => setFaqModalOpen(false)}
        title="Add Storefront FAQ"
        maxWidth="max-w-md"
      >
        <form onSubmit={addFaq} className="space-y-4">
          <Input
            label="Question"
            value={faqQ}
            set={setFaqQ}
            placeholder="e.g. How fast is delivery?"
            required
          />
          <TextArea
            label="Answer"
            value={faqA}
            set={setFaqA}
            placeholder="Detailed answer shown to shoppers..."
            rows={3}
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setFaqModalOpen(false)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add FAQ
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={webhookModalOpen}
        onClose={() => setWebhookModalOpen(false)}
        title="Register Outgoing Webhook"
        maxWidth="max-w-md"
      >
        <form onSubmit={addWebhook} className="space-y-4">
          <Input
            label="Webhook Name"
            value={webhookName}
            set={setWebhookName}
            placeholder="e.g. Discord Order Alerts"
            required
          />
          <Input
            label="Endpoint URL"
            value={webhookUrl}
            set={setWebhookUrl}
            placeholder="https://discord.com/api/webhooks/..."
            required
          />
          <Input
            label="Trigger Events (comma separated)"
            value={webhookEvents}
            set={setWebhookEvents}
            placeholder="order.created, order.paid"
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
            <button
              type="button"
              onClick={() => setWebhookModalOpen(false)}
              className="hexa-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
              <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Webhook
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function Backup() {
  const { notify } = useToast()
  const [restoring, setRestoring] = useState(false)

  const download = async () => {
    try {
      const data = await adminGet('/features/backup/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `hexa-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      notify('Backup exported')
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const restore = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!window.confirm('Restore catalog/configuration from this HEXA backup? Existing matching records will be updated.')) return
    try {
      setRestoring(true)
      const parsed = JSON.parse(await file.text())
      await adminPost('/features/backup/restore', parsed)
      notify('Backup restored successfully')
    } catch (error) {
      notify(error instanceof SyntaxError ? 'Invalid JSON backup file' : apiErrorMessage(error), 'error')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="grid max-w-4xl gap-6 md:grid-cols-2">
      <div className="hexa-card p-8">
        <HugeiconsIcon icon={CloudDownloadIcon} size={36} className="text-purple-600" />
        <h2 className="mt-5 text-2xl font-bold">Safe JSON backup/export</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--hexa-muted)]">Exports catalog and configuration without passwords, refresh tokens, orders or protected delivery credentials.</p>
        <button onClick={download} className="hexa-btn mt-6"><HugeiconsIcon icon={CloudDownloadIcon} size={15} />Export sanitized backup</button>
      </div>
      <div className="hexa-card p-8">
        <HugeiconsIcon icon={RefreshIcon} size={36} className="text-purple-600" />
        <h2 className="mt-5 text-2xl font-bold">Restore catalog/configuration</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--hexa-muted)]">Restore a compatible HEXA sanitized backup. Keep database-native backups for complete disaster recovery.</p>
        <label className="hexa-btn-secondary mt-6 inline-flex cursor-pointer"><HugeiconsIcon icon={RefreshIcon} size={15} />{restoring ? 'Restoring…' : 'Choose backup JSON'}<input disabled={restoring} type="file" accept="application/json,.json" className="hidden" onChange={restore} /></label>
      </div>
    </div>
  )
}

function TargetEditor({
  title = 'Targeted Items (leave unselected to apply to all products)',
  products = [],
  categories = [],
  bundles = [],
  productIds = [],
  categoryIds = [],
  bundleIds = [],
  setProductIds,
  setCategoryIds,
  setBundleIds,
}) {
  const [activeTab, setActiveTab] = useState('products')
  const [search, setSearch] = useState('')

  const selectedProductSet = useMemo(() => new Set(productIds || []), [productIds])
  const selectedCategorySet = useMemo(() => new Set(categoryIds || []), [categoryIds])
  const selectedBundleSet = useMemo(() => new Set(bundleIds || []), [bundleIds])

  const totalSelected = (productIds?.length || 0) + (categoryIds?.length || 0) + (bundleIds?.length || 0)

  const clearAll = () => {
    setProductIds([])
    setCategoryIds([])
    setBundleIds([])
  }

  const activeConfig = useMemo(() => {
    switch (activeTab) {
      case 'categories':
        return {
          type: 'category',
          label: 'Categories',
          items: categories || [],
          selectedSet: selectedCategorySet,
          selectedList: categoryIds || [],
          setter: setCategoryIds,
        }
      case 'bundles':
        return {
          type: 'bundle',
          label: 'Bundles',
          items: bundles || [],
          selectedSet: selectedBundleSet,
          selectedList: bundleIds || [],
          setter: setBundleIds,
        }
      case 'products':
      default:
        return {
          type: 'product',
          label: 'Products',
          items: products || [],
          selectedSet: selectedProductSet,
          selectedList: productIds || [],
          setter: setProductIds,
        }
    }
  }, [activeTab, products, categories, bundles, selectedProductSet, selectedCategorySet, selectedBundleSet, productIds, categoryIds, bundleIds, setProductIds, setCategoryIds, setBundleIds])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return activeConfig.items
    const query = search.trim().toLowerCase()
    return activeConfig.items.filter((item) =>
      item.name?.toLowerCase().includes(query) ||
      item.slug?.toLowerCase().includes(query)
    )
  }, [activeConfig.items, search])

  const toggleItem = (id) => {
    const isSelected = activeConfig.selectedSet.has(id)
    if (isSelected) {
      activeConfig.setter(activeConfig.selectedList.filter((val) => val !== id))
    } else {
      activeConfig.setter([...activeConfig.selectedList, id])
    }
  }

  const selectAllFiltered = () => {
    const filteredIds = filteredItems.map((item) => item._id)
    const combined = Array.from(new Set([...activeConfig.selectedList, ...filteredIds]))
    activeConfig.setter(combined)
  }

  const deselectAllActive = () => {
    const filteredIdSet = new Set(filteredItems.map((item) => item._id))
    activeConfig.setter(activeConfig.selectedList.filter((id) => !filteredIdSet.has(id)))
  }

  const selectedProducts = useMemo(() => (products || []).filter((p) => selectedProductSet.has(p._id)), [products, selectedProductSet])
  const selectedCategories = useMemo(() => (categories || []).filter((c) => selectedCategorySet.has(c._id)), [categories, selectedCategorySet])
  const selectedBundles = useMemo(() => (bundles || []).filter((b) => selectedBundleSet.has(b._id)), [bundles, selectedBundleSet])

  return (
    <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 p-4 space-y-3.5">
      {/* Header with Title and Overall Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[var(--hexa-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--hexa-text)]">{title}</h4>
            {totalSelected === 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Storewide
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {totalSelected} Target{totalSelected > 1 ? 's' : ''} Selected
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--hexa-muted)] mt-0.5">
            {totalSelected === 0
              ? 'Unselected means this discount or campaign applies to ALL products automatically.'
              : 'Applies exclusively to the selected items and categories below.'}
          </p>
        </div>

        {totalSelected > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 underline self-start sm:self-center transition"
          >
            Clear all targets
          </button>
        )}
      </div>

      {/* Modern Segmented Tab Buttons */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--hexa-surface)] border border-[var(--hexa-border)]">
        <button
          type="button"
          onClick={() => { setActiveTab('products'); setSearch(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
            activeTab === 'products'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-[var(--hexa-muted)] hover:text-gray-200 hover:bg-white/[0.04]'
          }`}
        >
          <HugeiconsIcon icon={ShoppingBag01Icon} size={14} />
          <span>Products</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'products'
              ? 'bg-white/20 text-white'
              : (productIds?.length || 0) > 0 ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-400'
          }`}>
            {(productIds?.length || 0) > 0 ? productIds.length : (products?.length || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('categories'); setSearch(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
            activeTab === 'categories'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-[var(--hexa-muted)] hover:text-gray-200 hover:bg-white/[0.04]'
          }`}
        >
          <HugeiconsIcon icon={Ticket01Icon} size={14} />
          <span>Categories</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'categories'
              ? 'bg-white/20 text-white'
              : (categoryIds?.length || 0) > 0 ? 'bg-sky-500/20 text-sky-300' : 'bg-white/5 text-gray-400'
          }`}>
            {(categoryIds?.length || 0) > 0 ? categoryIds.length : (categories?.length || 0)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('bundles'); setSearch(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
            activeTab === 'bundles'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-[var(--hexa-muted)] hover:text-gray-200 hover:bg-white/[0.04]'
          }`}
        >
          <HugeiconsIcon icon={GiftIcon} size={14} />
          <span>Bundles</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'bundles'
              ? 'bg-white/20 text-white'
              : (bundleIds?.length || 0) > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'
          }`}>
            {(bundleIds?.length || 0) > 0 ? bundleIds.length : (bundles?.length || 0)}
          </span>
        </button>
      </div>

      {/* Search Input & Quick Selection Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${activeConfig.label.toLowerCase()} by name...`}
            className="hexa-input !py-1.5 !pl-8 text-xs w-full"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-white"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            type="button"
            onClick={selectAllFiltered}
            disabled={!filteredItems.length}
            className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 disabled:opacity-30 disabled:pointer-events-none"
          >
            Select All
          </button>
          <span className="text-gray-600 text-[10px]">·</span>
          <button
            type="button"
            onClick={deselectAllActive}
            disabled={!activeConfig.selectedList.length}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-300 disabled:opacity-30 disabled:pointer-events-none"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Grid of Interactive Checkbox Cards with Sleek Scrollbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1.5 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] custom-scrollbar">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isSelected = activeConfig.selectedSet.has(item._id)
            return (
              <label
                key={item._id}
                className={`flex items-start gap-2.5 rounded-xl p-2.5 text-xs cursor-pointer transition border select-none ${
                  isSelected
                    ? 'border-purple-500/60 bg-purple-500/15 text-white shadow-sm ring-1 ring-purple-500/30'
                    : 'border-white/5 bg-white/[0.015] text-gray-300 hover:bg-white/[0.05] hover:border-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(item._id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs leading-snug line-clamp-2">{item.name}</p>
                  {item.price !== undefined && (
                    <p className="text-[10px] text-gray-400 mt-0.5 font-mono">৳{item.price}</p>
                  )}
                  {item.slug && activeTab === 'categories' && (
                    <p className="text-[10px] text-sky-400/80 mt-0.5 font-mono">/{item.slug}</p>
                  )}
                  {item.status && activeTab === 'products' && item.status !== 'active' && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5 inline-block">
                      {item.status}
                    </span>
                  )}
                </div>
              </label>
            )
          })
        ) : (
          <div className="col-span-full py-8 text-center text-xs text-[var(--hexa-muted)]">
            {search ? (
              <p>No {activeConfig.label.toLowerCase()} found matching &ldquo;{search}&rdquo;</p>
            ) : (
              <p>No {activeConfig.label.toLowerCase()} configured in catalog</p>
            )}
          </div>
        )}
      </div>

      {/* Selected Items Quick Removal Drawer */}
      {totalSelected > 0 && (
        <div className="pt-2.5 border-t border-[var(--hexa-border)] space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--hexa-muted)]">
            <span className="font-bold uppercase tracking-wider text-[10px]">Active Targets ({totalSelected})</span>
            <span className="text-[10px]">Click &times; to remove</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
            {selectedProducts.map((p) => (
              <span
                key={p._id}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] bg-purple-500/15 border border-purple-500/30 text-purple-200"
              >
                <span className="font-mono text-[9px] text-purple-400 font-bold uppercase">P</span>
                <span className="max-w-[140px] truncate">{p.name}</span>
                <button
                  type="button"
                  onClick={() => setProductIds(productIds.filter((id) => id !== p._id))}
                  className="ml-0.5 hover:text-white text-purple-300 font-bold"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            ))}
            {selectedCategories.map((c) => (
              <span
                key={c._id}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] bg-sky-500/15 border border-sky-500/30 text-sky-200"
              >
                <span className="font-mono text-[9px] text-sky-400 font-bold uppercase">C</span>
                <span className="max-w-[140px] truncate">{c.name}</span>
                <button
                  type="button"
                  onClick={() => setCategoryIds(categoryIds.filter((id) => id !== c._id))}
                  className="ml-0.5 hover:text-white text-sky-300 font-bold"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            ))}
            {selectedBundles.map((b) => (
              <span
                key={b._id}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
              >
                <span className="font-mono text-[9px] text-emerald-400 font-bold uppercase">B</span>
                <span className="max-w-[140px] truncate">{b.name}</span>
                <button
                  type="button"
                  onClick={() => setBundleIds(bundleIds.filter((id) => id !== b._id))}
                  className="ml-0.5 hover:text-white text-emerald-300 font-bold"
                  title="Remove"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AffiliatePayouts() {
  const { notify } = useToast()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [modalItem, setModalItem] = useState(null)
  const [modalStatus, setModalStatus] = useState('approved')
  const [transactionRef, setTransactionRef] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = (cursor = null, direction = 'next', currentLimit = limit) => {
    setLoading(true)
    const params = { limit: currentLimit }
    if (cursor) {
      params.cursor = cursor
      params.direction = direction
    }
    if (filter !== 'all') params.status = filter
    adminGet('/features/affiliate/payouts', params)
      .then((r) => {
        setRows(r.data || [])
        setMeta(r.meta || {})
      })
      .catch((err) => notify(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(null, 'next', limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const openProcessModal = (item) => {
    setModalItem(item)
    setModalStatus(item.status === 'pending' ? 'approved' : item.status)
    setTransactionRef(item.transactionReference || '')
    setAdminNote(item.adminNote || '')
  }

  const submitProcess = async (e) => {
    e.preventDefault()
    if (!modalItem) return
    setSaving(true)
    try {
      await adminPatch(`/features/affiliate/payouts/${modalItem._id}`, {
        status: modalStatus,
        transactionReference: transactionRef,
        adminNote,
      })
      notify(`Payout request marked as ${modalStatus}`)
      setModalItem(null)
      load(null, 'next', limit)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--hexa-text)]">Affiliate Payout Requests</h2>
          <p className="text-xs text-[var(--hexa-muted)]">Review affiliate withdrawal requests and record payment references.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="hexa-input !py-1.5 text-xs font-semibold"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending review</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved & Sent</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={() => load(null, 'next', limit)} className="hexa-btn-secondary !py-1.5 text-xs">
            <HugeiconsIcon icon={RefreshIcon} size={14} /> Refresh
          </button>
        </div>
      </div>

      <ListCard title={`Payout Requests (${rows.length})`}>
        {loading ? (
          <EmptyAdminRow text="Loading affiliate requests..." />
        ) : rows.length === 0 ? (
          <EmptyAdminRow text="No affiliate payout requests found." />
        ) : (
          rows.map((r) => (
            <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[var(--hexa-surface)]/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black text-[var(--hexa-text)]">৳{r.amount}</span>
                  <span className="rounded-md bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-400 uppercase">
                    {r.paymentMethod} · {r.accountNumber} ({r.accountType})
                  </span>
                  <StatusBadge value={r.status} />
                </div>
                <div className="mt-2 text-xs text-[var(--hexa-muted)]">
                  <span>User: <strong className="text-[var(--hexa-text)]">{r.user?.name || 'User'}</strong> ({r.user?.email || '—'} · {r.user?.phone || 'No phone'})</span>
                  <span className="ml-3">Requested: {new Date(r.createdAt).toLocaleString()}</span>
                </div>
                {r.transactionReference && (
                  <p className="mt-1 text-xs text-emerald-400 font-mono">Trx Reference: {r.transactionReference}</p>
                )}
                {r.adminNote && (
                  <p className="mt-1 text-xs text-amber-400">Admin note: {r.adminNote}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openProcessModal(r)}
                  className="hexa-btn !py-1.5 !px-3 text-xs font-bold"
                >
                  Manage Payout
                </button>
              </div>
            </div>
          ))
        )}
        <AdminCursorPagination
          meta={meta}
          onNext={(c) => load(c, 'next', limit)}
          onPrev={(c) => load(c, 'prev', limit)}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); load(null, 'next', l) }}
          loading={loading}
          pageSizeOptions={[15, 25, 50, 100]}
        />
      </ListCard>

      <Modal
        open={Boolean(modalItem)}
        onClose={() => setModalItem(null)}
        title="Process Affiliate Payout"
        maxWidth="max-w-md"
      >
        {modalItem && (
          <form onSubmit={submitProcess} className="space-y-4">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3 text-xs space-y-1">
              <p className="text-[var(--hexa-muted)]">User: <strong className="text-[var(--hexa-text)]">{modalItem.user?.name}</strong> ({modalItem.user?.email})</p>
              <p className="text-[var(--hexa-muted)]">Amount: <strong className="text-purple-400 font-bold">৳{modalItem.amount}</strong></p>
              <p className="text-[var(--hexa-muted)]">Method: <strong className="uppercase text-[var(--hexa-text)]">{modalItem.paymentMethod}</strong> ({modalItem.accountNumber}) · {modalItem.accountType}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Update Status</label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value)}
                className="hexa-input text-xs"
              >
                <option value="approved">Approved & Sent (Final)</option>
                <option value="processing">Processing (In Transfer)</option>
                <option value="rejected">Rejected (Refund to User Wallet)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Transaction Reference / TrxID</label>
              <input
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. bKash TrxID BL7890XYZ or Bank Ref"
                className="hexa-input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Admin Note / Reason (Visible to user if rejected)</label>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Sent via bKash Personal 017XXXXX or Invalid account number"
                className="hexa-input text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="hexa-btn !w-full !mt-2 text-xs font-bold"
            >
              {saving ? 'Updating...' : 'Save & Update Payout'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}

function FraudBlacklist() {
  const { notify } = useToast()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(25)
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({ type: 'ip', value: '', reason: '', expiresAt: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = (cursor = null, direction = 'next', currentLimit = limit) => {
    setLoading(true)
    const params = { limit: currentLimit }
    if (cursor) {
      params.cursor = cursor
      params.direction = direction
    }
    if (typeFilter !== 'all') params.type = typeFilter
    if (query.trim()) params.q = query.trim()
    adminGet('/features/fraud-blocks', params)
      .then((r) => {
        setRows(r.data || [])
        setMeta(r.meta || {})
      })
      .catch((err) => notify(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(null, 'next', limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.value) return notify('Please enter a target value', 'error')
    setSubmitting(true)
    try {
      await adminPost('/features/fraud-blocks', form)
      notify(`${form.type.toUpperCase()} blacklisted successfully`)
      setShowAddModal(false)
      setForm({ type: 'ip', value: '', reason: '', expiresAt: '' })
      load(null, 'next', limit)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await adminPatch(`/features/fraud-blocks/${id}/toggle`)
      notify('Blacklist restriction toggled')
      load(null, 'next', limit)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this security restriction?')) return
    try {
      await adminDelete(`/features/fraud-blocks/${id}`)
      notify('Security blacklist removed')
      load(null, 'next', limit)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--hexa-text)]">Security & Fraud Blacklist</h2>
          <p className="text-xs text-[var(--hexa-muted)]">Ban suspicious IP addresses, fraudulent phone numbers, or spammer emails from checkout and authentication.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="hexa-btn flex items-center gap-2 !py-2 text-xs font-bold"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={15} /> + Add Blacklist Rule
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            load(null, 'next', limit)
          }}
          className="flex-1 flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search IP, phone, email or reason..."
            className="hexa-input text-xs"
          />
          <button type="submit" className="hexa-btn-secondary !py-2 text-xs">Search</button>
        </form>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="hexa-input !py-2 text-xs font-semibold sm:w-48"
        >
          <option value="all">All types</option>
          <option value="ip">IP Addresses</option>
          <option value="phone">Phone Numbers</option>
          <option value="email">Email Addresses</option>
          <option value="account">Account IDs</option>
        </select>
      </div>

      <ListCard title={`Blacklist Entries (${rows.length})`}>
        {loading ? (
          <EmptyAdminRow text="Loading fraud blacklist..." />
        ) : rows.length === 0 ? (
          <EmptyAdminRow text="No blacklisted IPs, phones, or emails found." />
        ) : (
          rows.map((r) => (
            <div key={r._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-[var(--hexa-surface)]/50">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400 uppercase">
                    {r.type}
                  </span>
                  <span className="font-mono font-bold text-sm text-[var(--hexa-text)]">{r.value}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.isActive ? 'bg-rose-500/15 text-rose-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {r.isActive ? 'Active Block' : 'Disabled'}
                  </span>
                  {r.blockedCount > 0 && (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                      Blocked {r.blockedCount} attempts
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--hexa-muted)]">Reason: <span className="text-[var(--hexa-text)]">{r.reason || 'Fraud prevention'}</span></p>
                <div className="mt-1 text-[11px] text-[var(--hexa-muted)] flex gap-4">
                  <span>Added on {new Date(r.createdAt).toLocaleString()}</span>
                  {r.expiresAt && <span>Expires: {new Date(r.expiresAt).toLocaleDateString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(r._id)}
                  className="hexa-btn-secondary !py-1 !px-2.5 text-xs font-semibold"
                >
                  {r.isActive ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r._id)}
                  className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                  title="Delete rule"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </button>
              </div>
            </div>
          ))
        )}
        <AdminCursorPagination
          meta={meta}
          onNext={(c) => load(c, 'next', limit)}
          onPrev={(c) => load(c, 'prev', limit)}
          limit={limit}
          onLimitChange={(l) => { setLimit(l); load(null, 'next', l) }}
          loading={loading}
          pageSizeOptions={[15, 25, 50, 100]}
        />
      </ListCard>

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Security Blacklist Rule"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Blacklist Target Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="hexa-input text-xs"
            >
              <option value="ip">IP Address (e.g. 103.204.x.x)</option>
              <option value="phone">Phone Number (e.g. 01712345678)</option>
              <option value="email">Email Address (e.g. spammer@fraud.com)</option>
              <option value="account">Account ID</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Target Value</label>
            <input
              required
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'ip' ? 'e.g. 192.168.1.1' : form.type === 'phone' ? 'e.g. 01712345678' : 'e.g. user@example.com'}
              className="hexa-input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Reason / Suspicious Activity Details</label>
            <input
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Repeated fake transaction IDs or bot spam"
              className="hexa-input text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1">Expiration (Optional - leave empty for permanent)</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className="hexa-input text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="hexa-btn !w-full !mt-2 text-xs font-bold"
          >
            {submitting ? 'Adding...' : 'Add to Security Blacklist'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

function CrudActions({ onEdit, onDelete }) {
  return (
    <div className="flex gap-1">
      <button onClick={onEdit} className="rounded-lg p-2 text-purple-600 transition hover:bg-purple-500/[0.08]" title="Edit"><HugeiconsIcon icon={Edit02Icon} size={16} /></button>
      <button onClick={onDelete} className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-500/[0.08]" title="Delete"><HugeiconsIcon icon={Delete02Icon} size={16} /></button>
    </div>
  )
}

function Two({ children, wideForm = false }) {
  return <div className={`grid gap-6 ${wideForm ? 'xl:grid-cols-[560px_1fr]' : 'xl:grid-cols-[420px_1fr]'}`}>{children}</div>
}

function FormCard({ title, children, action }) {
  return (
    <section className="hexa-card h-fit p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ListCard({ title, children, action }) {
  return (
    <section className="hexa-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--hexa-border)] p-5"><h2 className="font-semibold">{title}</h2>{action}</div>
      <div className="divide-y divide-[var(--hexa-border)]">{children}</div>
    </section>
  )
}

function Row({ title, sub, status, actions }) {
  return (
    <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--hexa-muted)]">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">{status && <StatusBadge value={status} />}{actions}</div>
    </div>
  )
}

function EmptyAdminRow({ text }) {
  return <p className="p-6 text-center text-sm text-[var(--hexa-muted)]">{text}</p>
}

function Input({ label, type = 'text', value, set, required = false, disabled = false }) {
  return (
    <label className="block">
      <span className="hexa-label">{label}</span>
      <input required={required} disabled={disabled} type={type} className="hexa-input disabled:cursor-not-allowed disabled:opacity-50" value={value ?? ''} onChange={(event) => set(event.target.value)} />
    </label>
  )
}

function TextArea({ label, value, set, rows = 4, required = false }) {
  return (
    <label className="block">
      <span className="hexa-label">{label}</span>
      <textarea required={required} rows={rows} className="hexa-input" value={value ?? ''} onChange={(event) => set(event.target.value)} />
    </label>
  )
}

function Select({ label, value, set, options }) {
  return (
    <label className="block">
      <span className="hexa-label">{label}</span>
      <select className="hexa-input" value={value} onChange={(event) => set(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
  )
}

function DateInput({ label, value, set }) {
  return <Input label={label} type="datetime-local" value={value} set={set} />
}

function Checkbox({ label, checked, set }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)] p-3 text-sm">
      <input type="checkbox" checked={Boolean(checked)} onChange={(event) => set(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function objectId(value) {
  if (!value) return ''
  return typeof value === 'object' ? String(value._id || '') : String(value)
}

function ids(values = []) {
  return (values || []).map(objectId).filter(Boolean)
}

function targetSummary(products = [], categories = [], bundles = []) {
  const productCount = products?.length || 0
  const categoryCount = categories?.length || 0
  const bundleCount = bundles?.length || 0
  if (!productCount && !categoryCount && !bundleCount) return 'all items / no explicit targets'
  return `${productCount} product(s), ${categoryCount} category(s), ${bundleCount} bundle(s)`
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toIsoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
