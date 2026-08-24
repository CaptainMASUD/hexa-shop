import { HugeiconsIcon } from '@hugeicons/react'
import {
  Copy01Icon,
  Delete02Icon,
  FlashIcon,
  Infinity01Icon,
  PlusSignIcon,
} from '@hugeicons/core-free-icons'

const TIER_PRESETS = [
  {
    name: '💎 Game Top-Up Tiers (Diamonds / UC / Coins)',
    tiers: [
      { name: '50 Diamonds', duration: 'Instant Top-Up', regularPrice: 85, salePrice: 85, costPrice: 70, stock: 999, unlimitedStock: true },
      { name: '100 + 10 Diamonds', duration: 'Instant Top-Up', regularPrice: 170, salePrice: 160, costPrice: 135, stock: 999, unlimitedStock: true },
      { name: '250 + 25 Diamonds', duration: 'Instant Top-Up', regularPrice: 420, salePrice: 380, costPrice: 320, stock: 999, unlimitedStock: true },
      { name: '500 + 65 Diamonds', duration: 'Instant Top-Up', regularPrice: 850, salePrice: 750, costPrice: 640, stock: 999, unlimitedStock: true },
      { name: '1000 + 155 Diamonds', duration: 'Instant Top-Up', regularPrice: 1700, salePrice: 1445, costPrice: 1250, stock: 999, unlimitedStock: true },
      { name: 'Weekly Diamond Pass', duration: '7 Days Pass', regularPrice: 220, salePrice: 198, costPrice: 170, stock: 999, unlimitedStock: true },
    ],
  },
  {
    name: '📅 Subscription Durations (1M, 3M, 6M, 1Y)',
    tiers: [
      { name: '1 Month Shared', duration: '1 Month (30 Days)', regularPrice: 300, salePrice: 250, costPrice: 180, stock: 50, unlimitedStock: false },
      { name: '3 Months Shared', duration: '3 Months (90 Days)', regularPrice: 850, salePrice: 700, costPrice: 500, stock: 50, unlimitedStock: false },
      { name: '1 Month Private Profile', duration: '1 Month (30 Days)', regularPrice: 500, salePrice: 450, costPrice: 350, stock: 20, unlimitedStock: false },
      { name: '12 Months Private', duration: '1 Year (365 Days)', regularPrice: 4500, salePrice: 3900, costPrice: 3000, stock: 10, unlimitedStock: false },
    ],
  },
  {
    name: '💿 Software / License Editions',
    tiers: [
      { name: 'Standard Edition / Home', duration: 'Lifetime License', regularPrice: 600, salePrice: 450, costPrice: 300, stock: 100, unlimitedStock: false },
      { name: 'Professional Edition (Pro)', duration: 'Lifetime License', regularPrice: 1200, salePrice: 850, costPrice: 600, stock: 100, unlimitedStock: false },
      { name: 'Enterprise / Ultimate', duration: 'Lifetime License', regularPrice: 2500, salePrice: 1800, costPrice: 1300, stock: 50, unlimitedStock: false },
    ],
  },
  {
    name: '🎁 Gift Card Denominations ($5, $10, $25, $50, $100)',
    tiers: [
      { name: '$5 Gift Card', duration: 'Instant Code', regularPrice: 600, salePrice: 580, costPrice: 550, stock: 999, unlimitedStock: true },
      { name: '$10 Gift Card', duration: 'Instant Code', regularPrice: 1200, salePrice: 1150, costPrice: 1080, stock: 999, unlimitedStock: true },
      { name: '$25 Gift Card', duration: 'Instant Code', regularPrice: 3000, salePrice: 2850, costPrice: 2700, stock: 999, unlimitedStock: true },
      { name: '$50 Gift Card', duration: 'Instant Code', regularPrice: 6000, salePrice: 5700, costPrice: 5400, stock: 999, unlimitedStock: true },
    ],
  },
]

export default function VariantManager({ variants = [], onChange }) {
  const addBlankVariant = () => {
    const newVariant = {
      name: '',
      sku: '',
      duration: '',
      region: '',
      platform: '',
      regularPrice: 0,
      discountPercent: 0,
      salePrice: 0,
      costPrice: 0,
      stock: 100,
      unlimitedStock: false,
      sortOrder: variants.length,
      active: true,
      metadata: {},
    }
    onChange([...variants, newVariant])
  }

  const duplicateVariant = (index) => {
    const source = variants[index]
    const dup = {
      ...source,
      _id: undefined,
      id: undefined,
      name: `${source.name} (Copy)`,
      sku: source.sku ? `${source.sku}-copy` : '',
      sortOrder: variants.length,
    }
    onChange([...variants, dup])
  }

  const removeVariant = (index) => {
    onChange(variants.filter((_, i) => i !== index))
  }

  const updateField = (index, field, value) => {
    const updated = variants.map((v, i) => {
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
    onChange(updated)
  }

  const applyTierPreset = (preset) => {
    const formatted = preset.tiers.map((t, idx) => {
      const reg = Number(t.regularPrice || 0)
      const sale = Number(t.salePrice || reg)
      const disc = reg > 0 && sale < reg ? Math.round(((reg - sale) / reg) * 100) : 0
      return {
        name: t.name,
        duration: t.duration || '',
        region: t.region || 'Global',
        platform: t.platform || '',
        sku: '',
        regularPrice: reg,
        salePrice: sale,
        discountPercent: disc,
        costPrice: Number(t.costPrice || 0),
        stock: Number(t.stock || 100),
        unlimitedStock: Boolean(t.unlimitedStock),
        sortOrder: idx,
        active: true,
        metadata: {},
      }
    })
    onChange(formatted)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-bold text-[var(--hexa-text)] flex items-center gap-2">
            <span>Product Variants & Packages</span>
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400 font-semibold">
              {variants.length} {variants.length === 1 ? 'variant' : 'variants'}
            </span>
          </h3>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
            Create unlimited denominations, durations, license tiers, and editions with flexible pricing and stock.
          </p>
        </div>

        <button
          type="button"
          onClick={addBlankVariant}
          className="hexa-btn !px-3.5 !py-2 text-xs self-start sm:self-auto"
        >
          <HugeiconsIcon icon={PlusSignIcon} size={14} /> Add Variant / Package
        </button>
      </div>

      {/* Preset Tiers Bar */}
      <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/60 p-3">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--hexa-muted)]">
          <HugeiconsIcon icon={FlashIcon} size={14} className="text-purple-400" />
          <span>Quick Standard Tiers (1-Click Load):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIER_PRESETS.map((preset, pIdx) => (
            <button
              key={pIdx}
              type="button"
              onClick={() => applyTierPreset(preset)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/[0.06] px-2.5 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/15 hover:border-purple-500/40 transition"
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Variants List */}
      {variants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--hexa-border)] p-8 text-center">
          <p className="text-sm font-medium text-[var(--hexa-muted)]">
            No variants created yet.
          </p>
          <p className="mt-1 text-xs text-[var(--hexa-muted)]">
            Click &ldquo;Add Variant / Package&rdquo; or choose a standard tier preset above to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((v, i) => (
            <div
              key={v._id || v.id || i}
              className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 space-y-3 transition hover:border-purple-500/30"
            >
              {/* Row 1: Name, SKU, Duration, Region, Actions */}
              <div className="grid gap-3 sm:grid-cols-12 items-start">
                <div className="sm:col-span-4">
                  <label className="text-[11px] font-bold uppercase text-[var(--hexa-muted)]">
                    Variant / Package Name *
                  </label>
                  <input
                    required
                    placeholder="e.g. 100 Diamonds or Windows 11 Pro"
                    className="hexa-input mt-1 text-xs font-bold"
                    value={v.name}
                    onChange={(e) => updateField(i, 'name', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-[var(--hexa-muted)]">SKU / Code</label>
                  <input
                    placeholder="e.g. ML_100D"
                    className="hexa-input mt-1 text-xs font-mono"
                    value={v.sku || ''}
                    onChange={(e) => updateField(i, 'sku', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-[var(--hexa-muted)]">Duration</label>
                  <input
                    placeholder="e.g. 1 Month / Instant"
                    className="hexa-input mt-1 text-xs"
                    value={v.duration || ''}
                    onChange={(e) => updateField(i, 'duration', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold uppercase text-[var(--hexa-muted)]">Region / Server</label>
                  <input
                    placeholder="e.g. Global / Asia"
                    className="hexa-input mt-1 text-xs"
                    value={v.region || ''}
                    onChange={(e) => updateField(i, 'region', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center justify-end gap-1.5 pt-6 sm:pt-4">
                  <button
                    type="button"
                    onClick={() => duplicateVariant(i)}
                    className="rounded-lg p-2 text-purple-400 hover:bg-purple-500/10 transition"
                    title="Duplicate Variant"
                  >
                    <HugeiconsIcon icon={Copy01Icon} size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 transition"
                    title="Remove Variant"
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                  </button>
                </div>
              </div>

              {/* Row 2: Regular Price, Discount %, Sale Price, Cost Price, Stock, Unlimited Stock */}
              <div className="grid gap-3 sm:grid-cols-12 items-center border-t border-[var(--hexa-border)]/50 pt-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Regular (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    className="hexa-input mt-1 text-xs font-semibold"
                    value={v.regularPrice}
                    onChange={(e) => updateField(i, 'regularPrice', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    className="hexa-input mt-1 text-xs"
                    value={v.discountPercent || ''}
                    onChange={(e) => updateField(i, 'discountPercent', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-purple-400">Sale Price (৳) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="100"
                    className="hexa-input mt-1 text-xs font-bold text-purple-300"
                    value={v.salePrice}
                    onChange={(e) => updateField(i, 'salePrice', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Cost (৳)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    className="hexa-input mt-1 text-xs"
                    value={v.costPrice || ''}
                    onChange={(e) => updateField(i, 'costPrice', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    disabled={v.unlimitedStock}
                    className="hexa-input mt-1 text-xs disabled:opacity-40"
                    value={v.unlimitedStock ? 9999 : v.stock || 0}
                    onChange={(e) => updateField(i, 'stock', e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-4 sm:pt-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-purple-600 rounded"
                      checked={Boolean(v.unlimitedStock)}
                      onChange={(e) => updateField(i, 'unlimitedStock', e.target.checked)}
                    />
                    <span className="flex items-center gap-1 text-[var(--hexa-muted)]">
                      <HugeiconsIcon icon={Infinity01Icon} size={14} className="text-purple-400" /> Unlimited
                    </span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer ml-auto">
                    <input
                      type="checkbox"
                      className="accent-purple-600 rounded"
                      checked={v.active !== false}
                      onChange={(e) => updateField(i, 'active', e.target.checked)}
                    />
                    <span className={v.active !== false ? 'text-emerald-400' : 'text-[var(--hexa-muted)]'}>Active</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
