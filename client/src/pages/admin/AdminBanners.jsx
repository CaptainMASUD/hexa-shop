import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Edit02Icon, PlusSignIcon, Search01Icon } from '@hugeicons/core-free-icons'
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'

const blank = {
  title: '',
  subtitle: '',
  image: { url: '', publicId: '' },
  buttonText: 'Shop now',
  buttonLink: '/products',
  badge: '',
  placement: 'hero',
  targetType: 'none',
  targetId: null,
  displayOrder: 0,
  active: true,
  startDate: null,
  endDate: null,
}

const localDate = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '')

const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Homepage (Hero Slider)', page: 'Homepage' },
  { value: 'offer', label: 'Offers Page (Hero Slider)', page: 'Offers Page' },
  { value: 'category', label: 'Category Page Banner', page: 'Category' },
  { value: 'product', label: 'Product Page Banner', page: 'Product' },
  { value: 'bundle', label: 'Bundle Page Banner', page: 'Bundle' },
  { value: 'midpage', label: 'Midpage Callout Banner', page: 'Midpage' },
]

export default function AdminBanners() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [placementFilter, setPlacementFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const { notify } = useToast()

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    active = activeFilter,
    placement = placementFilter
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
      if (placement) params.placement = placement

      const r = await adminGet('/banners', params)
      setItems(r.data || [])
      setMeta(r.meta || {})
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load banners'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, q, activeFilter, placementFilter).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, placementFilter])

  const search = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, activeFilter, placementFilter)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q, activeFilter, placementFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q, activeFilter, placementFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q, activeFilter, placementFilter)
  }

  const edit = (item) => {
    setEditing(item._id)
    setForm({
      ...blank,
      ...item,
      placement: item.placement || 'hero',
      image: item.image || blank.image,
      startDate: localDate(item.startDate),
      endDate: localDate(item.endDate),
    })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.image?.url) {
      notify('Upload a banner image first', 'error')
      return
    }
    const payload = {
      ...form,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    }
    try {
      if (editing) {
        await adminPut(`/banners/${editing}`, payload)
      } else {
        await adminPost('/banners', payload)
      }
      notify('Banner saved successfully', 'success')
      setOpen(false)
      load(null, 'next', limit, q, activeFilter, placementFilter)
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const disable = async (id) => {
    if (!confirm('Disable this banner?')) return
    await adminDelete(`/banners/${id}`)
    notify('Banner disabled')
    load(null, 'next', limit, q, activeFilter, placementFilter)
  }

  return (
    <>
      <AdminPageHeader
        title="Store & Campaign Banners"
        description="Manage Homepage Hero creative, Offers Page banners, promotional callouts, CTA buttons, and scheduling."
        action={
          <button
            onClick={() => {
              setEditing(null)
              setForm(blank)
              setOpen(true)
            }}
            className="hexa-btn"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Banner
          </button>
        }
      />

      {/* Filter Control Bar */}
      <form onSubmit={search} className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            className="hexa-input !pl-9 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search banners by title or subtitle..."
          />
        </div>

        {/* Page Placement Filter */}
        <select
          className="hexa-input sm:w-48 text-xs"
          value={placementFilter}
          onChange={(e) => setPlacementFilter(e.target.value)}
        >
          <option value="">All Placements / Pages</option>
          <option value="hero">Homepage Hero (hero)</option>
          <option value="offer">Offers Page Hero (offer)</option>
          <option value="category">Category Page</option>
          <option value="product">Product Page</option>
          <option value="bundle">Bundle Page</option>
          <option value="midpage">Midpage Callout</option>
        </select>

        {/* Status Filter */}
        <select
          className="hexa-input sm:w-36 text-xs"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Disabled Only</option>
        </select>

        <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
          Search
        </button>

        {(q || placementFilter || activeFilter) && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setPlacementFilter('')
              setActiveFilter('')
              load(null, 'next', limit, '', '', '')
            }}
            className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-3 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
          >
            Reset
          </button>
        )}
      </form>

      {/* Banners Grid */}
      <div className="hexa-card overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading banners...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">
            No banners found matching your search.
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isOfferPage = item.placement === 'offer' || item.placement === 'offers'
              const isHomePage = item.placement === 'hero' || item.placement === 'home'

              return (
                <div
                  key={item._id}
                  className="overflow-hidden rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card-bg)] hover:border-purple-500/30 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 w-full bg-black/40">
                      <img
                        src={item.image?.url}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute right-3 top-3">
                        <StatusBadge value={item.active ? 'active' : 'inactive'} />
                      </div>

                      {/* Placement Badge */}
                      <span
                        className={`absolute left-3 top-3 rounded-md px-2 py-0.5 text-[11px] font-bold backdrop-blur-md border ${
                          isOfferPage
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isHomePage
                            ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        {isOfferPage
                          ? 'Offers Page'
                          : isHomePage
                          ? 'Homepage Hero'
                          : item.placement}
                      </span>

                      {item.badge && (
                        <span className="absolute left-3 bottom-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md border border-white/20">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <h2 className="text-sm font-bold text-gray-100 line-clamp-1">{item.title}</h2>
                      <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                        {item.subtitle || 'No subtitle'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[11px] text-gray-500">
                        Order #{item.displayOrder} · {item.buttonText || 'Shop now'}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => edit(item)}
                          className="rounded-lg p-1.5 text-purple-300 hover:bg-purple-500/10 transition"
                          title="Edit Banner"
                        >
                          <HugeiconsIcon icon={Edit02Icon} size={16} />
                        </button>
                        <button
                          onClick={() => disable(item._id)}
                          className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition"
                          title="Disable Banner"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Store Banner' : 'Create Store Banner'}
      >
        <form onSubmit={save} className="space-y-4">
          {/* Target Page Placement */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
              Target Page Placement <span className="text-rose-500">*</span>
            </label>
            <select
              className="hexa-input text-xs font-semibold"
              value={form.placement}
              onChange={(e) => setForm({ ...form, placement: e.target.value })}
            >
              {PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--hexa-muted)]">
              Select <strong>Homepage</strong> to show on the main landing slider, or <strong>Offers Page</strong> to show on the top Offers banner carousel.
            </p>
          </div>

          <label className="block">
            <span className="hexa-label">Banner Title <span className="text-rose-500">*</span></span>
            <input
              required
              placeholder="e.g. Bundles & limited campaigns"
              className="hexa-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label className="block">
            <span className="hexa-label">Subtitle / Description</span>
            <textarea
              rows="3"
              placeholder="e.g. Discover curated digital bundles and limited HEXA offers at special prices."
              className="hexa-input text-xs"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </label>

          <ImageUploader
            folder="banners"
            label="Banner Cover Image (Recommended: 1920x600 or 1200x500)"
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="hexa-label">Badge Tag (Optional)</span>
              <input
                placeholder="e.g. HEXA Offers, Flash Sale, Mega Deal"
                className="hexa-input"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="hexa-label">Display Order</span>
              <input
                type="number"
                min="0"
                className="hexa-input"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </label>

            <label className="block">
              <span className="hexa-label">Button Text</span>
              <input
                className="hexa-input"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="hexa-label">Button Link</span>
              <input
                className="hexa-input"
                value={form.buttonLink}
                onChange={(e) => setForm({ ...form, buttonLink: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="hexa-label">Start Date (Optional)</span>
              <input
                type="datetime-local"
                className="hexa-input"
                value={form.startDate || ''}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="hexa-label">End Date (Optional)</span>
              <input
                type="datetime-local"
                className="hexa-input"
                value={form.endDate || ''}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-xs font-semibold text-[var(--hexa-text)]">
              Active on storefront
            </span>
          </label>

          <div className="flex justify-end gap-3 border-t border-[var(--hexa-border)] pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hexa-btn-secondary"
            >
              Cancel
            </button>
            <button className="hexa-btn">
              {editing ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
