import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CloudDownloadIcon,
  Comment01Icon,
  Delete02Icon,
  Discount01Icon,
  Edit02Icon,
  FloppyDiskIcon,
  GiftIcon,
  Notification01Icon,
  PackageIcon,
  PlusSignIcon,
  RefreshIcon,
  Shield01Icon,
  StarIcon,
  Ticket01Icon,
  UserShield01Icon,
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
  ['Support', 'support', Ticket01Icon],
  ['Refunds', 'refunds', RefreshIcon],
  ['Reviews', 'reviews', Comment01Icon],
  ['Notifications', 'notifications', Notification01Icon],
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <Two>
      <FormCard title={editingId ? 'Edit coupon' : 'Create coupon'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Code" value={form.code} set={(value) => setForm({ ...form, code: value.toUpperCase() })} required />
          <Input label="Description" value={form.description} set={(value) => setForm({ ...form, description: value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} set={(value) => setForm({ ...form, type: value })} options={['percent', 'fixed']} />
            <Input label="Value" type="number" value={form.value} set={(value) => setForm({ ...form, value: Number(value) })} required />
            <Input label="Minimum order" type="number" value={form.minOrder} set={(value) => setForm({ ...form, minOrder: Number(value) })} />
            <Input label="Max discount (0 = none)" type="number" value={form.maxDiscount} set={(value) => setForm({ ...form, maxDiscount: Number(value) })} />
            <Input label="Total usage limit (0 = unlimited)" type="number" value={form.usageLimit} set={(value) => setForm({ ...form, usageLimit: Number(value) })} />
            <Input label="Per user limit" type="number" value={form.perUserLimit} set={(value) => setForm({ ...form, perUserLimit: Number(value) })} />
          </div>

          <TargetEditor
            title="Coupon targets (leave empty for all items)"
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
            <DateInput label="Starts at" value={form.startsAt} set={(value) => setForm({ ...form, startsAt: value })} />
            <DateInput label="Ends at" value={form.endsAt} set={(value) => setForm({ ...form, endsAt: value })} />
          </div>
          <Checkbox label="Active" checked={form.active} set={(active) => setForm({ ...form, active })} />

          <div className="flex gap-2">
            <button className="hexa-btn flex-1"><HugeiconsIcon icon={FloppyDiskIcon} size={15} />{editingId ? 'Update coupon' : 'Create coupon'}</button>
            {editingId && <button type="button" onClick={reset} className="hexa-btn-secondary">Cancel</button>}
          </div>
        </form>
      </FormCard>

      <ListCard title="Coupons">
        {rows.length ? rows.map((coupon) => (
          <Row
            key={coupon._id}
            title={coupon.code}
            sub={`${coupon.type} ${coupon.value} · used ${coupon.usedCount}/${coupon.usageLimit || '∞'} · ${targetSummary(coupon.allowedProducts, coupon.allowedCategories, coupon.allowedBundles)}`}
            status={coupon.active ? 'active' : 'inactive'}
            actions={<CrudActions onEdit={() => edit(coupon)} onDelete={() => remove(coupon)} />}
          />
        )) : <EmptyAdminRow text="No coupons yet." />}
      </ListCard>
    </Two>
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <Two wideForm>
      <FormCard title={editingId ? 'Edit bundle' : 'Create first-class bundle'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Bundle name *" value={form.name} set={(name) => setForm({ ...form, name })} required />
            <Input label="Slug (optional)" value={form.slug} set={(slug) => setForm({ ...form, slug })} />
          </div>
          <Input label="Subtitle / short hook" value={form.subtitle} set={(subtitle) => setForm({ ...form, subtitle })} />
          <TextArea label="Description" value={form.description} set={(description) => setForm({ ...form, description })} />

          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Bundle sale price (৳) *" type="number" value={form.price} set={(price) => setForm({ ...form, price })} required />
            <Input label="Original / strike price (৳)" type="number" value={form.regularPrice} set={(regularPrice) => setForm({ ...form, regularPrice })} />
            <Input label="Badge (e.g. SAVE 25%)" value={form.badge} set={(badge) => setForm({ ...form, badge })} />
          </div>

          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)] p-3">
            <Input label="Banner image URL" value={form.bannerImageUrl} set={(bannerImageUrl) => setForm({ ...form, bannerImageUrl })} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Bundle components</p>
                <p className="text-xs text-[var(--hexa-muted)]">Choose product/plan and quantity. Customers see one bundle; stock is deducted from these components.</p>
              </div>
              <button type="button" onClick={() => setForm({ ...form, items: [...form.items, newBundleComponent()] })} className="hexa-btn-secondary !px-3 !py-2 text-xs"><HugeiconsIcon icon={PlusSignIcon} size={14} />Add</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => {
                const product = products.find((entry) => entry._id === item.product)
                const variants = (product?.variants || []).filter((variant) => variant.active)
                return (
                  <div key={`${index}-${item.product}-${item.variantId}`} className="grid gap-2 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)] p-3 sm:grid-cols-[1fr_1fr_100px_42px]">
                    <select
                      className="hexa-input"
                      value={item.product}
                      onChange={(event) => updateComponent(index, { product: event.target.value, variantId: '' })}
                      required
                    >
                      <option value="">Choose product</option>
                      {products.filter((entry) => entry.status !== 'archived').map((entry) => <option key={entry._id} value={entry._id}>{entry.name}</option>)}
                    </select>
                    <select className="hexa-input" value={item.variantId} onChange={(event) => updateComponent(index, { variantId: event.target.value })}>
                      <option value="">Base product</option>
                      {variants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name}</option>)}
                    </select>
                    <input className="hexa-input" type="number" min="1" max="20" value={item.quantity} onChange={(event) => updateComponent(index, { quantity: Number(event.target.value) })} aria-label="Component quantity" />
                    <button type="button" onClick={() => removeComponent(index)} disabled={form.items.length <= 2} className="rounded-xl text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-30" aria-label="Remove component"><HugeiconsIcon icon={Delete02Icon} size={14} className="mx-auto" /></button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Status" value={form.status} set={(status) => setForm({ ...form, status })} options={['active', 'inactive', 'archived']} />
            <Input label="Tags (comma separated)" value={form.tags} set={(tags) => setForm({ ...form, tags })} />
            <DateInput label="Starts at" value={form.startsAt} set={(startsAt) => setForm({ ...form, startsAt })} />
            <DateInput label="Ends at" value={form.endsAt} set={(endsAt) => setForm({ ...form, endsAt })} />
          </div>
          <Checkbox label="Featured bundle" checked={form.featured} set={(featured) => setForm({ ...form, featured })} />

          <div className="flex gap-2">
            <button className="hexa-btn flex-1"><HugeiconsIcon icon={FloppyDiskIcon} size={15} />{editingId ? 'Update bundle' : 'Create bundle'}</button>
            {editingId && <button type="button" onClick={reset} className="hexa-btn-secondary">Cancel</button>}
          </div>
        </form>
      </FormCard>

      <ListCard title="Bundles">
        {rows.length ? rows.map((bundle) => (
          <Row
            key={bundle._id}
            title={bundle.name}
            sub={`${bundle.items?.length || 0} components · ৳${Number(bundle.salePrice || bundle.regularPrice || 0).toLocaleString()} · ${bundle.featured ? 'featured' : 'standard'}`}
            status={bundle.status}
            actions={<CrudActions onEdit={() => edit(bundle)} onDelete={() => remove(bundle)} />}
          />
        )) : <EmptyAdminRow text="No bundles yet." />}
      </ListCard>
    </Two>
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    <Two wideForm>
      <FormCard title={editingId ? 'Edit campaign' : 'Create campaign'}>
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

          <div className="flex gap-2">
            <button className="hexa-btn flex-1"><HugeiconsIcon icon={FloppyDiskIcon} size={15} />{editingId ? 'Update campaign' : 'Create campaign'}</button>
            {editingId && <button type="button" onClick={reset} className="hexa-btn-secondary">Cancel</button>}
          </div>
        </form>
      </FormCard>

      <ListCard title="Promotions / campaigns">
        {rows.length ? rows.map((promotion) => (
          <Row
            key={promotion._id}
            title={promotion.headline || promotion.name}
            sub={`${promotion.discountType === 'display_only' ? 'Display campaign' : `${promotion.discountType} ${promotion.discountValue}`} · ${promotion.scope || 'targeted'} · ${targetSummary(promotion.products, promotion.categories, promotion.bundles)}`}
            status={promotion.active ? 'active' : 'inactive'}
            actions={<CrudActions onEdit={() => edit(promotion)} onDelete={() => remove(promotion)} />}
          />
        )) : <EmptyAdminRow text="No campaigns yet." />}
      </ListCard>
    </Two>
  )
}

function Support() {
  const [rows, setRows] = useState([])
  const { notify } = useToast()
  const load = () => adminGet('/features/support-tickets').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const reply = async (ticket) => {
    const message = window.prompt(`Reply to ${ticket.ticketNumber}`)
    if (!message) return
    try {
      await adminPost(`/features/support-tickets/${ticket._id}/replies`, { message, status: 'waiting_customer' })
      notify('Reply sent')
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <ListCard title="Customer support tickets">
      {rows.length ? rows.map((ticket) => (
        <Row key={ticket._id} title={`${ticket.ticketNumber} · ${ticket.subject}`} sub={`${ticket.user?.name || ''} · ${ticket.category} · ${ticket.priority}`} status={ticket.status} actions={<button onClick={() => reply(ticket)} className="text-xs font-semibold text-purple-600">Reply</button>} />
      )) : <EmptyAdminRow text="No support tickets." />}
    </ListCard>
  )
}

function Refunds() {
  const [rows, setRows] = useState([])
  const { notify } = useToast()
  const load = () => adminGet('/features/refunds').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const update = async (refund, status, creditWallet = false) => {
    try {
      await adminPatch(`/features/refunds/${refund._id}`, { status, adminNote: 'Processed from HEXA admin', creditWallet })
      notify(`Refund ${status}`)
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <ListCard title="Refund requests">
      {rows.length ? rows.map((refund) => (
        <Row
          key={refund._id}
          title={`${refund.order?.orderNumber || 'Order'} · ৳${Number(refund.requestedAmount || 0).toLocaleString()}`}
          sub={`${refund.user?.name || ''} · ${refund.reason}`}
          status={refund.status}
          actions={!['completed', 'rejected'].includes(refund.status) ? (
            <div className="flex gap-2">
              <button onClick={() => update(refund, 'reviewing')} className="text-xs font-semibold text-amber-500">Review</button>
              <button onClick={() => update(refund, 'rejected')} className="text-xs font-semibold text-rose-500">Reject</button>
              <button onClick={() => update(refund, 'completed', true)} className="text-xs font-semibold text-emerald-600">Complete + wallet</button>
            </div>
          ) : null}
        />
      )) : <EmptyAdminRow text="No refund requests." />}
    </ListCard>
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
  const [form, setForm] = useState({ audience: 'all', type: 'info', title: '', message: '', link: '/' })
  const { notify } = useToast()
  const load = () => adminGet('/features/notifications').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const save = async (event) => {
    event.preventDefault()
    try {
      await adminPost('/features/notifications', form)
      notify('In-app notification published')
      setForm({ ...form, title: '', message: '' })
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <Two>
      <FormCard title="Publish in-app notification">
        <form onSubmit={save} className="space-y-3">
          <Select label="Audience" value={form.audience} set={(audience) => setForm({ ...form, audience })} options={['all', 'user', 'admin']} />
          <Input label="Title" value={form.title} set={(title) => setForm({ ...form, title })} required />
          <TextArea label="Message" value={form.message} set={(message) => setForm({ ...form, message })} rows={3} required />
          <Input label="Link" value={form.link} set={(link) => setForm({ ...form, link })} />
          <button className="hexa-btn w-full">Publish notification</button>
        </form>
      </FormCard>
      <ListCard title="Recent notifications">
        {rows.slice(0, 30).map((notification) => <Row key={notification._id} title={notification.title} sub={`${notification.audience} · ${notification.message}`} status={notification.type} />)}
      </ListCard>
    </Two>
  )
}

function Abandoned() {
  const [rows, setRows] = useState([])
  const load = () => adminGet('/features/abandoned-carts').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  return (
    <ListCard title="Abandoned carts (24h+ inactivity)" action={<button onClick={load} className="hexa-btn-secondary !py-2">Refresh</button>}>
      {rows.length ? rows.map((cart) => {
        const bundles = (cart.items || []).filter((item) => item.itemType === 'bundle').length
        const products = (cart.items || []).length - bundles
        return <Row key={cart._id} title={cart.user?.name || 'Customer'} sub={`${cart.user?.email || ''} · ${products} product line(s), ${bundles} bundle line(s) · last active ${new Date(cart.lastActivityAt).toLocaleString()}`} status="abandoned" />
      }) : <EmptyAdminRow text="No abandoned carts currently detected." />}
    </ListCard>
  )
}

function Roles() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ name: '', description: '', permissions: 'products.read,orders.read' })
  const { notify } = useToast()
  const load = () => adminGet('/features/roles').then((response) => setRows(response.data || []))
  useEffect(() => { load().catch(() => {}) }, [])

  const save = async (event) => {
    event.preventDefault()
    try {
      await adminPost('/features/roles', {
        name: form.name,
        slug: '',
        description: form.description,
        permissions: form.permissions.split(',').map((value) => value.trim()).filter(Boolean),
        active: true,
        system: false,
      })
      notify('Role created')
      setForm({ ...form, name: '' })
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  return (
    <Two>
      <FormCard title="Create custom role">
        <form onSubmit={save} className="space-y-3">
          <Input label="Role name" value={form.name} set={(name) => setForm({ ...form, name })} required />
          <Input label="Description" value={form.description} set={(description) => setForm({ ...form, description })} />
          <TextArea label="Permissions (comma separated)" value={form.permissions} set={(permissions) => setForm({ ...form, permissions })} rows={4} />
          <button className="hexa-btn w-full">Create role</button>
        </form>
      </FormCard>
      <ListCard title="Roles">
        {rows.map((role) => <Row key={role._id} title={role.name} sub={(role.permissions || []).join(', ') || 'No permissions'} status={role.active ? 'active' : 'inactive'} />)}
      </ListCard>
    </Two>
  )
}

function Settings() {
  const [data, setData] = useState(null)
  const { notify } = useToast()

  useEffect(() => {
    adminGet('/features/settings').then((response) => setData(response.data)).catch(() => {})
  }, [])

  if (!data) return <div className="hexa-card h-64 animate-pulse" />

  const save = async (event) => {
    event.preventDefault()
    try {
      const response = await adminPut('/features/settings', data)
      setData(response.data)
      notify('Site settings saved')
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const toggle = (key) => setData({
    ...data,
    homepage: { ...data.homepage, [key]: data.homepage?.[key] === false },
  })

  return (
    <form onSubmit={save} className="grid gap-6 xl:grid-cols-2">
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

      <div className="xl:col-span-2"><button className="hexa-btn"><HugeiconsIcon icon={FloppyDiskIcon} size={15} />Save settings</button></div>
    </form>
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
  title,
  products,
  categories,
  bundles,
  productIds,
  categoryIds,
  bundleIds,
  setProductIds,
  setCategoryIds,
  setBundleIds,
}) {
  return (
    <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-bg-soft)] p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-[var(--hexa-muted)]">Campaigns and coupons can target multiple resources. Bundles are targeted as one sellable item, not through their individual components.</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <CheckList title="Products" rows={products} selected={productIds} onChange={setProductIds} />
        <CheckList title="Categories" rows={categories} selected={categoryIds} onChange={setCategoryIds} />
        <CheckList title="Bundles" rows={bundles} selected={bundleIds} onChange={setBundleIds} />
      </div>
    </div>
  )
}

function CheckList({ title, rows, selected, onChange }) {
  const selectedSet = useMemo(() => new Set(selected || []), [selected])
  const toggle = (id) => {
    onChange(selectedSet.has(id) ? selected.filter((value) => value !== id) : [...selected, id])
  }
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">{title}</p>
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-2">
        {rows.length ? rows.map((row) => (
          <label key={row._id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-purple-500/[0.05]">
            <input type="checkbox" checked={selectedSet.has(row._id)} onChange={() => toggle(row._id)} />
            <span className="min-w-0 truncate">{row.name}</span>
          </label>
        )) : <p className="p-2 text-xs text-[var(--hexa-muted)]">No entries</p>}
      </div>
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

function FormCard({ title, children }) {
  return <section className="hexa-card h-fit p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>
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
