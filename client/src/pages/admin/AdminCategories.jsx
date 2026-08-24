import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Edit02Icon, PlusSignIcon } from '@hugeicons/core-free-icons'
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import StatusBadge from '../../components/StatusBadge'

const blank = { name: '', slug: '', description: '', image: { url: '', publicId: '' }, displayOrder: 0, status: 'active' }

export default function AdminCategories() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const { notify } = useToast()

  const load = () => adminGet('/categories').then((r) => setItems(r.data))

  useEffect(() => {
    load().catch(() => {})
  }, [])

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
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const archive = async (id) => {
    if (!confirm('Archive this category? Existing order history will remain intact.')) return
    try {
      await adminDelete(`/categories/${id}`)
      notify('Category archived')
      load()
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Create future product categories without hardcoding customer navigation."
        action={
          <button
            onClick={() => {
              setEditing(null)
              setForm(blank)
              setOpen(true)
            }}
            className="hexa-btn"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={15} /> Add category
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item._id} className="hexa-card p-5">
            <div className="flex items-start justify-between">
              <div>
                {item.image?.url ? (
                  <img src={item.image.url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-purple-500/10" />
                )}
              </div>
              <StatusBadge value={item.status} />
            </div>
            <h2 className="mt-4 text-xl font-semibold">{item.name}</h2>
            <p className="mt-1 text-xs text-purple-400">/{item.slug}</p>
            <p className="mt-3 min-h-10 text-sm text-gray-500">{item.description || 'No description'}</p>
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-gray-600">Order {item.displayOrder}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => edit(item)}
                  className="rounded-lg p-2 text-purple-300 hover:bg-purple-500/10"
                  title="Edit Category"
                >
                  <HugeiconsIcon icon={Edit02Icon} size={16} />
                </button>
                <button
                  onClick={() => archive(item._id)}
                  className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10"
                  title="Archive Category"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit category' : 'Create category'}>
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
                <option>active</option>
                <option>inactive</option>
                <option>archived</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="hexa-btn-secondary">
              Cancel
            </button>
            <button className="hexa-btn">Save category</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
