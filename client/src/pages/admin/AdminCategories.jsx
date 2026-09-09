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

const blank = { name: '', slug: '', description: '', image: { url: '', publicId: '' }, displayOrder: 0, status: 'active' }

export default function AdminCategories() {
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const { notify } = useToast()

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    status = statusFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ && searchQ.trim()) params.q = searchQ.trim()
      if (status && status.trim()) params.status = status.trim()

      const r = await adminGet('/categories', params)
      setItems(r.data || [])
      setMeta(r.meta || {})
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load categories'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, '', '').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const search = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, statusFilter)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q, statusFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q, statusFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q, statusFilter)
  }

  const edit = (item) => {
    setEditing(item._id)
    setForm({ ...blank, ...item, image: item.image || blank.image })
    setOpen(true)
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await adminPut(`/categories/${editing}`, form)
      } else {
        await adminPost('/categories', form)
      }
      notify(editing ? 'Category updated' : 'Category created')
      setOpen(false)
      load(null, 'next', limit, q, statusFilter)
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const archive = async (id) => {
    if (!confirm('Archive this category? Existing order history will remain intact.')) return
    try {
      await adminDelete(`/categories/${id}`)
      notify('Category archived')
      load(null, 'next', limit, q, statusFilter)
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Create and organize digital product categories with custom slugs, display orders and icons."
        action={
          <button
            onClick={() => {
              setEditing(null)
              setForm(blank)
              setOpen(true)
            }}
            className="hexa-btn"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add Category
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
            placeholder="Search categories by name or slug..."
          />
        </div>
        <select
          className="hexa-input sm:w-40 text-xs"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <button className="hexa-btn text-xs !py-2 !px-4">Search</button>
      </form>

      <div className="hexa-card overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading categories...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No categories found matching your query.</div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card-bg)] p-5 hover:border-purple-500/30 transition">
                <div className="flex items-start justify-between">
                  <div>
                    {item.image?.url ? (
                      <img src={item.image.url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-lg">
                        {item.name?.slice(0, 1) || 'C'}
                      </div>
                    )}
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <h2 className="mt-4 text-lg font-bold text-gray-100">{item.name}</h2>
                <p className="mt-0.5 text-xs font-mono text-purple-400">/{item.slug}</p>
                <p className="mt-2 min-h-8 text-xs text-gray-400 line-clamp-2">{item.description || 'No description'}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-gray-500">Display order: {item.displayOrder}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => edit(item)}
                      className="rounded-lg p-1.5 text-purple-300 hover:bg-purple-500/10 transition"
                      title="Edit Category"
                    >
                      <HugeiconsIcon icon={Edit02Icon} size={16} />
                    </button>
                    <button
                      onClick={() => archive(item._id)}
                      className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/10 transition"
                      title="Archive Category"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Category' : 'Create Category'}>
        <form onSubmit={save} className="space-y-4">
          <label>
            <span className="hexa-label">Name</span>
            <input required className="hexa-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            <span className="hexa-label">Slug (optional)</span>
            <input className="hexa-input" value={form.slug || ''} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </label>
          <label>
            <span className="hexa-label">Description</span>
            <textarea rows="3" className="hexa-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <ImageUploader folder="categories" label="Category image" value={form.image} onChange={(image) => setForm({ ...form, image })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="hexa-label">Display order</span>
              <input type="number" min="0" className="hexa-input" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} />
            </label>
            <label>
              <span className="hexa-label">Status</span>
              <select className="hexa-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="hexa-btn-secondary">
              Cancel
            </button>
            <button className="hexa-btn">Save Category</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
