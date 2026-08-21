import { useEffect, useState } from 'react'
import { FaEdit, FaGamepad, FaPlus, FaTrash, FaBolt } from 'react-icons/fa'
import { adminDelete, adminGet, adminPost, adminPut } from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import AdminPageHeader from '../../components/AdminPageHeader'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../contexts/ToastContext'

const PRESET_GAMES = [
  {
    id: 'mlbb',
    name: 'Mobile Legends: Bang Bang',
    icon: '🎮',
    currencyName: 'Diamonds',
    productType: 'game',
    fields: [
      { name: 'userId', label: 'User ID', type: 'text', placeholder: 'e.g. 12345678', helpText: 'Found on MLBB profile avatar', required: true, options: [] },
      { name: 'zoneId', label: 'Zone ID', type: 'text', placeholder: 'e.g. 2045', helpText: '4-5 digit number in brackets next to User ID', required: true, options: [] },
    ],
    samplePackages: [
      { name: '50 Diamonds', duration: 'Instant Top-Up', regularPrice: 85, salePrice: 85, stock: 999 },
      { name: '100 + 10 Diamonds', duration: 'Instant Top-Up', regularPrice: 170, salePrice: 160, stock: 999 },
      { name: '250 + 25 Diamonds', duration: 'Instant Top-Up', regularPrice: 420, salePrice: 380, stock: 999 },
      { name: '500 + 65 Diamonds', duration: 'Instant Top-Up', regularPrice: 850, salePrice: 750, stock: 999 },
      { name: '1000 + 155 Diamonds', duration: 'Instant Top-Up', regularPrice: 1700, salePrice: 1445, stock: 999 },
      { name: 'Weekly Diamond Pass', duration: '7 Days Pass', regularPrice: 220, salePrice: 198, stock: 999 },
    ],
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    icon: '🔫',
    currencyName: 'Unknown Cash (UC)',
    productType: 'game',
    fields: [
      { name: 'playerId', label: 'Player ID (UID)', type: 'text', placeholder: 'e.g. 5123456789', helpText: 'Your numeric PUBG Character ID', required: true, options: [] },
      { name: 'ign', label: 'In-Game Name (IGN)', type: 'text', placeholder: 'e.g. DynamoGaming', helpText: 'Your PUBG nickname', required: false, options: [] },
    ],
    samplePackages: [
      { name: '60 UC', duration: 'Instant Top-Up', regularPrice: 95, salePrice: 95, stock: 999 },
      { name: '300 + 25 UC (325 UC)', duration: 'Instant Top-Up', regularPrice: 475, salePrice: 450, stock: 999 },
      { name: '600 + 60 UC (660 UC)', duration: 'Instant Top-Up', regularPrice: 950, salePrice: 875, stock: 999 },
      { name: '1500 + 300 UC (1800 UC)', duration: 'Instant Top-Up', regularPrice: 2375, salePrice: 2135, stock: 999 },
      { name: '3000 + 850 UC (3850 UC)', duration: 'Instant Top-Up', regularPrice: 4750, salePrice: 4035, stock: 999 },
    ],
  },
  {
    id: 'freefire',
    name: 'Free Fire',
    icon: '🔥',
    currencyName: 'Diamonds',
    productType: 'game',
    fields: [
      { name: 'playerId', label: 'Player ID (UID)', type: 'text', placeholder: 'e.g. 123456789', helpText: 'Your Free Fire numeric account ID', required: true, options: [] },
    ],
    samplePackages: [
      { name: '100 Diamonds', duration: 'Instant Top-Up', regularPrice: 80, salePrice: 80, stock: 999 },
      { name: '210 Diamonds', duration: 'Instant Top-Up', regularPrice: 160, salePrice: 152, stock: 999 },
      { name: '530 Diamonds', duration: 'Instant Top-Up', regularPrice: 400, salePrice: 368, stock: 999 },
      { name: '1080 Diamonds', duration: 'Instant Top-Up', regularPrice: 800, salePrice: 720, stock: 999 },
      { name: 'Weekly Membership', duration: '7 Days', regularPrice: 190, salePrice: 180, stock: 999 },
      { name: 'Monthly Membership', duration: '30 Days', regularPrice: 790, salePrice: 710, stock: 999 },
    ],
  },
  {
    id: 'valorant',
    name: 'Valorant / Riot Games',
    icon: '⚔️',
    currencyName: 'Valorant Points (VP)',
    productType: 'game',
    fields: [
      { name: 'riotId', label: 'Riot ID', type: 'text', placeholder: 'e.g. Shadow', helpText: 'Your Riot username', required: true, options: [] },
      { name: 'tagline', label: 'Tagline (#)', type: 'text', placeholder: 'e.g. NA1 or 1234', helpText: 'Numbers/letters following the #', required: true, options: [] },
    ],
    samplePackages: [
      { name: '475 VP', duration: 'Instant Top-Up', regularPrice: 450, salePrice: 450, stock: 999 },
      { name: '1000 VP', duration: 'Instant Top-Up', regularPrice: 900, salePrice: 855, stock: 999 },
      { name: '2050 VP', duration: 'Instant Top-Up', regularPrice: 1800, salePrice: 1655, stock: 999 },
      { name: '3650 VP', duration: 'Instant Top-Up', regularPrice: 3200, salePrice: 2880, stock: 999 },
    ],
  },
  {
    id: 'genshin',
    name: 'Genshin Impact / Honkai: Star Rail',
    icon: '🌌',
    currencyName: 'Genesis Crystals / Shards',
    productType: 'game',
    fields: [
      { name: 'uid', label: 'In-Game UID', type: 'text', placeholder: 'e.g. 800123456', helpText: '9-digit UID from bottom right of screen', required: true, options: [] },
      { name: 'server', label: 'Server Region', type: 'select', options: ['Asia', 'America', 'Europe', 'TW/HK/MO'], helpText: 'Your game server region', required: true, placeholder: '' },
    ],
    samplePackages: [
      { name: '60 Genesis Crystals', duration: 'Instant Top-Up', regularPrice: 110, salePrice: 110, stock: 999 },
      { name: '300 + 30 Genesis Crystals', duration: 'Instant Top-Up', regularPrice: 550, salePrice: 520, stock: 999 },
      { name: '980 + 110 Genesis Crystals', duration: 'Instant Top-Up', regularPrice: 1650, salePrice: 1515, stock: 999 },
      { name: 'Blessing of the Welkin Moon', duration: '30 Days', regularPrice: 550, salePrice: 520, stock: 999 },
    ],
  },
  {
    id: 'codm',
    name: 'Call of Duty: Mobile',
    icon: '🪖',
    currencyName: 'CP (COD Points)',
    productType: 'game',
    fields: [
      { name: 'playerId', label: 'Player ID / UID', type: 'text', placeholder: 'e.g. 67482910394857', helpText: 'Found in CODM settings/profile', required: true, options: [] },
    ],
    samplePackages: [
      { name: '80 CP', duration: 'Instant Top-Up', regularPrice: 110, salePrice: 110, stock: 999 },
      { name: '420 CP', duration: 'Instant Top-Up', regularPrice: 520, salePrice: 495, stock: 999 },
      { name: '880 CP', duration: 'Instant Top-Up', regularPrice: 1050, salePrice: 965, stock: 999 },
    ],
  },
  {
    id: 'clash',
    name: 'Clash of Clans / Supercell',
    icon: '🏰',
    currencyName: 'Gems',
    productType: 'game',
    fields: [
      { name: 'playerId', label: 'Player Tag (#)', type: 'text', placeholder: 'e.g. #9Q2LV8J', helpText: 'Your player tag from profile', required: true, options: [] },
    ],
    samplePackages: [
      { name: '80 Gems', duration: 'Instant Top-Up', regularPrice: 100, salePrice: 100, stock: 999 },
      { name: '500 Gems', duration: 'Instant Top-Up', regularPrice: 550, salePrice: 520, stock: 999 },
      { name: '1200 Gems', duration: 'Instant Top-Up', regularPrice: 1100, salePrice: 990, stock: 999 },
      { name: 'Gold Pass', duration: 'Season Pass', regularPrice: 750, salePrice: 690, stock: 999 },
    ],
  },
  {
    id: 'custom_game',
    name: 'Other Top-Up Game',
    icon: '🎯',
    currencyName: 'Points / Coins',
    productType: 'game',
    fields: [
      { name: 'playerId', label: 'Player ID / Account ID', type: 'text', placeholder: 'Enter game account ID', helpText: 'Your unique game ID', required: true, options: [] },
      { name: 'ign', label: 'In-Game Name (IGN)', type: 'text', placeholder: 'Enter player nickname', helpText: 'Optional player nickname', required: false, options: [] },
    ],
    samplePackages: [],
  },
  {
    id: 'digital_key',
    name: 'Digital License / Account (GTA 5, Keys, Software, Subs)',
    icon: '🎟️',
    currencyName: 'Unit',
    productType: 'digital-product',
    fields: [],
    samplePackages: [],
  },
]

const blank = () => ({
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: '',
  subcategory: '',
  selectedGamePreset: 'mlbb',
  regularPrice: 0,
  salePrice: 0,
  currency: 'BDT',
  stock: 100,
  lowStockThreshold: 5,
  thumbnail: undefined,
  bannerImage: undefined,
  galleryImages: [],
  seo: { title: '', description: '', keywords: [] },
  featured: false,
  popular: false,
  newArrival: false,
  status: 'active',
  deliveryType: 'manual',
  productType: 'game',
  tags: [],
  searchKeywords: [],
  details: {},
  customFields: PRESET_GAMES[0].fields,
  variants: PRESET_GAMES[0].samplePackages.map((p) => ({
    name: p.name,
    duration: p.duration,
    regularPrice: p.regularPrice,
    salePrice: p.salePrice,
    discountPercent: p.regularPrice > 0 ? Math.round(((p.regularPrice - p.salePrice) / p.regularPrice) * 100) : 0,
    stock: p.stock,
    sku: '',
    active: true,
    metadata: {},
  })),
})

export default function AdminProducts() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const { notify } = useToast()

  const load = () =>
    Promise.all([adminGet('/products', { limit: 100 }), adminGet('/categories')]).then(
      ([p, c]) => {
        setItems(p.data)
        setCategories(c.data)
      },
    )

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm(blank())
    setModal(true)
  }

  const openEdit = async (id) => {
    try {
      const r = await adminGet(`/products/${id}`)
      const p = r.data
      setEditing(id)

      // Detect game preset
      let matchedPreset = 'digital_key'
      if (p.productType === 'game' || p.customFields?.length) {
        const fieldNames = (p.customFields || []).map((f) => f.name).sort().join(',')
        const found = PRESET_GAMES.find((g) => g.fields.map((f) => f.name).sort().join(',') === fieldNames)
        matchedPreset = found ? found.id : (p.customFields?.length ? 'custom_game' : 'digital_key')
      }

      setForm({
        ...blank(),
        ...p,
        selectedGamePreset: matchedPreset,
        category: p.category?._id || p.category,
        tags: p.tags || [],
        searchKeywords: p.searchKeywords || [],
        details: p.details || {},
        customFields: p.customFields || [],
        seo: p.seo || { title: '', description: '', keywords: [] },
        bannerImage: p.bannerImage,
        variants: (p.variants || []).map((v) => {
          const reg = Number(v.regularPrice || 0)
          const sale = Number(v.salePrice || 0)
          const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
          return { ...v, discountPercent: disc }
        }),
      })
      setModal(true)
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const handlePresetChange = (presetId) => {
    const preset = PRESET_GAMES.find((g) => g.id === presetId) || PRESET_GAMES[0]
    setForm((cur) => ({
      ...cur,
      selectedGamePreset: preset.id,
      productType: preset.productType,
      customFields: preset.fields.map((f) => ({ ...f })),
      name: cur.name ? cur.name : (preset.id !== 'digital_key' && preset.id !== 'custom_game' ? `${preset.name} ${preset.currencyName}` : cur.name),
    }))
  }

  const loadPresetPackages = (presetId) => {
    const preset = PRESET_GAMES.find((g) => g.id === presetId)
    if (!preset || !preset.samplePackages.length) return
    const newVariants = preset.samplePackages.map((p) => {
      const reg = Number(p.regularPrice || 0)
      const sale = Number(p.salePrice || reg)
      const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
      return {
        name: p.name,
        duration: p.duration || 'Instant Top-Up',
        regularPrice: reg,
        salePrice: sale,
        discountPercent: disc,
        stock: p.stock || 999,
        sku: '',
        active: true,
        metadata: {},
      }
    })
    setForm((cur) => ({
      ...cur,
      variants: newVariants,
      regularPrice: newVariants[0]?.regularPrice || cur.regularPrice,
      salePrice: newVariants[0]?.salePrice || cur.salePrice,
    }))
    notify(`Loaded ${newVariants.length} standard packages for ${preset.name}`)
  }

  const updateVariantValue = (index, field, value) => {
    setForm((cur) => {
      const updated = cur.variants.map((v, i) => {
        if (i !== index) return v
        const item = { ...v, [field]: value }

        if (field === 'regularPrice' || field === 'discountPercent') {
          const reg = Number(field === 'regularPrice' ? value : item.regularPrice || 0)
          const disc = Number(field === 'discountPercent' ? value : item.discountPercent || 0)
          if (disc > 0 && reg > 0) {
            item.salePrice = Math.round(reg * (1 - disc / 100))
          } else if (disc === 0) {
            item.salePrice = reg
          }
        } else if (field === 'salePrice') {
          const reg = Number(item.regularPrice || 0)
          const sale = Number(value || 0)
          if (reg > 0 && sale < reg) {
            item.discountPercent = Math.round(((reg - sale) / reg) * 100)
          } else {
            item.discountPercent = 0
          }
        }
        return item
      })
      return { ...cur, variants: updated }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        regularPrice: Number(form.regularPrice || form.variants[0]?.regularPrice || 0),
        salePrice: Number(form.salePrice || form.variants[0]?.salePrice || 0),
        stock: Number(form.stock || 100),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        customFields: form.customFields || [],
        variants: form.variants.map((v) => ({
          name: v.name.trim(),
          duration: v.duration || '',
          regularPrice: Number(v.regularPrice || 0),
          salePrice: Number(v.salePrice || v.regularPrice || 0),
          stock: Number(v.stock || 100),
          active: v.active !== false,
          sku: v.sku || '',
          metadata: v.metadata || {},
        })),
      }
      if (editing) await adminPut(`/products/${editing}`, payload)
      else await adminPost('/products', payload)
      notify(editing ? 'Product updated' : 'Product created')
      setModal(false)
      load()
    } catch (error) {
      notify(apiErrorMessage(error), 'error')
    }
  }

  const archive = async (id) => {
    if (!confirm('Archive this product?')) return
    try {
      await adminDelete(`/products/${id}`)
      notify('Product archived')
      load()
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const currentPreset = PRESET_GAMES.find((g) => g.id === form.selectedGamePreset) || PRESET_GAMES[0]

  return (
    <>
      <AdminPageHeader
        title="Products & Game Top-Ups"
        description="Manage gaming currencies (Diamonds, UC, VP, Gems), denominations, discounts, and digital products."
        action={
          <button onClick={openNew} className="hexa-btn">
            <FaPlus /> Add product / game
          </button>
        }
      />

      <div className="hexa-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              {['Product / Game', 'Category', 'Top-Up Type', 'Packages', 'Base Price', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p._id} className="border-b border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {p.thumbnail?.url ? (
                      <img src={p.thumbnail.url} alt="" className="h-10 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold">
                        {p.productType === 'game' ? '🎮' : '📦'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-[var(--hexa-text)]">{p.name}</p>
                      <p className="text-xs text-[var(--hexa-muted)]">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-[var(--hexa-muted)]">{p.category?.name || '—'}</td>
                <td className="px-5 py-4">
                  {p.customFields?.length ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-1 text-xs font-semibold text-purple-300">
                      <FaGamepad className="text-[10px]" /> Direct In-Game Top-Up
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-[var(--hexa-muted)]">
                      Digital Key / Account
                    </span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className="font-semibold text-purple-300">
                    {p.variants?.length || 1} package{p.variants?.length === 1 ? '' : 's'}
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-[var(--hexa-text)]">
                  ৳{(p.salePrice || p.regularPrice || 0).toLocaleString()}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge value={p.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(p._id)}
                      className="rounded-lg p-2 text-purple-300 transition hover:bg-purple-500/10"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => archive(p._id)}
                      className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10"
                      title="Archive"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit Product & Top-Up Packages' : 'Create Product / Game Top-Up'}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={save} className="space-y-6">
          {/* Game Selection */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <FaGamepad className="text-purple-400 text-lg" />
              <h3 className="font-bold text-sm text-[var(--hexa-text)]">Game & Product Type</h3>
            </div>
            <p className="text-xs text-[var(--hexa-muted)] mb-3">
              Select the game. The customer checkout will automatically request the exact ID/server required for that game without any manual setup.
            </p>

            <div className="grid gap-2 sm:grid-cols-3">
              {PRESET_GAMES.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handlePresetChange(game.id)}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                    form.selectedGamePreset === game.id
                      ? 'border-purple-500 bg-purple-500/20 text-white font-bold shadow-sm'
                      : 'border-[var(--hexa-border)] bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] hover:border-purple-500/30'
                  }`}
                >
                  <span className="text-xl shrink-0">{game.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight truncate">{game.name}</p>
                    <p className="text-[10px] opacity-70 truncate">{game.currencyName}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Core Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product / Game Title">
              <input
                required
                className="hexa-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Mobile Legends Diamonds"
              />
            </Field>
            <Field label="Category">
              <select
                required
                className="hexa-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Choose category</option>
                {categories
                  .filter((c) => c.status !== 'archived')
                  .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Status">
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
            <Field label="Base Stock Units">
              <input
                type="number"
                min="0"
                className="hexa-input"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Short Description">
            <input
              className="hexa-input"
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="Fast automatic & verified delivery within minutes"
            />
          </Field>

          {/* DENOMINATIONS & PACKAGES (DIAMONDS / UC / COINS) */}
          <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-base text-[var(--hexa-text)] flex items-center gap-2">
                  <span>💎 Packages & Denominations</span>
                </h3>
                <p className="mt-1 text-xs text-[var(--hexa-muted)]">
                  Add denominations with regular price, discount %, and offer price.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentPreset.samplePackages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => loadPresetPackages(currentPreset.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition"
                  >
                    <FaBolt /> Load Standard Tiers
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: [
                        ...form.variants,
                        {
                          name: '',
                          duration: 'Instant Top-Up',
                          regularPrice: 0,
                          discountPercent: 0,
                          salePrice: 0,
                          stock: 999,
                          sku: '',
                          active: true,
                          metadata: {},
                        },
                      ],
                    })
                  }
                  className="hexa-btn-secondary !px-3 !py-2 text-xs"
                >
                  <FaPlus /> Add Package
                </button>
              </div>
            </div>

            {/* Packages Table / List */}
            <div className="mt-4 space-y-3">
              {form.variants.map((v, i) => (
                <div
                  key={v._id || i}
                  className="grid gap-2.5 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3.5 sm:grid-cols-12 items-center"
                >
                  {/* Name */}
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Package / Diamonds</label>
                    <input
                      required
                      placeholder="e.g. 100 Diamonds or 60 UC"
                      className="hexa-input mt-1 text-xs font-semibold"
                      value={v.name}
                      onChange={(e) => updateVariantValue(i, 'name', e.target.value)}
                    />
                  </div>

                  {/* Regular Price */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Regular (৳)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="100"
                      className="hexa-input mt-1 text-xs font-semibold"
                      value={v.regularPrice}
                      onChange={(e) => updateVariantValue(i, 'regularPrice', e.target.value)}
                    />
                  </div>

                  {/* Discount % */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-purple-400">Discount %</label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="10"
                        className="hexa-input text-xs font-bold text-purple-300 pr-6"
                        value={v.discountPercent || 0}
                        onChange={(e) => updateVariantValue(i, 'discountPercent', e.target.value)}
                      />
                      <span className="absolute right-2.5 top-2.5 text-xs text-purple-400 font-bold">%</span>
                    </div>
                  </div>

                  {/* Sale Price */}
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-emerald-400">Sale Price (৳)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="90"
                      className="hexa-input mt-1 text-xs font-bold text-emerald-400"
                      value={v.salePrice || 0}
                      onChange={(e) => updateVariantValue(i, 'salePrice', e.target.value)}
                    />
                  </div>

                  {/* Stock & Delete */}
                  <div className="sm:col-span-2 flex items-center gap-2 pt-4 sm:pt-0">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Stock</label>
                      <input
                        type="number"
                        min="0"
                        className="hexa-input mt-1 text-xs"
                        value={v.stock || 0}
                        onChange={(e) => updateVariantValue(i, 'stock', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, variants: form.variants.filter((_, x) => x !== i) })}
                      className="mt-4 rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                      title="Remove package"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Media Images */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ImageUploader
              folder="products"
              value={form.thumbnail}
              onChange={(thumbnail) => setForm({ ...form, thumbnail })}
              label="Product Thumbnail"
            />
            <ImageUploader
              folder="products/banners"
              value={form.bannerImage}
              onChange={(bannerImage) => setForm({ ...form, bannerImage })}
              label="Homepage Banner (Optional)"
            />
          </div>

          <Field label="Detailed Description / Delivery Guide">
            <textarea
              rows="3"
              className="hexa-input text-xs"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instructions, guidelines or notes for customers..."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="accent-purple-600 rounded"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="accent-purple-600 rounded"
                checked={form.popular}
                onChange={(e) => setForm({ ...form, popular: e.target.checked })}
              />
              Popular
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                className="accent-purple-600 rounded"
                checked={form.newArrival}
                onChange={(e) => setForm({ ...form, newArrival: e.target.checked })}
              />
              New arrival
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-[var(--hexa-border)] pt-4">
            <button type="button" onClick={() => setModal(false)} className="hexa-btn-secondary">
              Cancel
            </button>
            <button className="hexa-btn">{editing ? 'Save changes' : 'Create product'}</button>
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
