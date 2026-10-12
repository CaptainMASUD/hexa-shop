import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Coins01Icon,
  FlashIcon,
  PackageIcon,
  Search01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { adminGet, adminPost } from '../api/admin.api'
import { apiErrorMessage } from '../api/client'
import { useToast } from '../contexts/ToastContext'

const REASON_PRESETS = [
  'Supplier restock / Inflow batch',
  'Wholesale vendor purchase',
  'Physical stock count adjustment',
  'Customer returned / Restored units',
  'Damaged / Expired stock write-off',
  'Inventory audit correction',
  'Manual adjustment',
]

const QUICK_STEPPERS = [10, 25, 50, 100, 250, 500]

export default function StockEntryModal({
  open,
  isOpen,
  onClose,
  products: parentProducts,
  initialProduct = null,
  currentProduct = null,
  initialVariantId = null,
  currentVariantId = null,
  onSuccess,
}) {
  const isVisible = Boolean(open !== undefined ? open : isOpen)
  const { notify } = useToast()

  const [internalProducts, setInternalProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [mode, setMode] = useState('add') // 'add' | 'set' | 'reduce'
  const [quantity, setQuantity] = useState('10')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [reasonPreset, setReasonPreset] = useState(REASON_PRESETS[0])
  const [customReason, setCustomReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Fetch products automatically if parent did not provide products or if empty
  useEffect(() => {
    if (!isVisible) return

    if (Array.isArray(parentProducts) && parentProducts.length > 0) {
      setInternalProducts(parentProducts)
      return
    }

    let isMounted = true
    setLoadingProducts(true)
    adminGet('/products', { limit: 200 })
      .then((res) => {
        if (!isMounted) return
        const list = Array.isArray(res.data) ? res.data : []
        setInternalProducts(list)
      })
      .catch((err) => {
        console.error('Failed to load products for stock entry:', err)
        notify(apiErrorMessage(err, 'Failed to load products'), 'error')
      })
      .finally(() => {
        if (isMounted) setLoadingProducts(false)
      })

    return () => {
      isMounted = false
    }
  }, [isVisible, parentProducts, notify])

  // Combine products and ensure selected/initial product is present
  const combinedProducts = useMemo(() => {
    const baseList = Array.isArray(parentProducts) && parentProducts.length > 0
      ? parentProducts
      : internalProducts

    const activeProd = initialProduct || currentProduct
    if (activeProd && activeProd._id && !baseList.some((p) => p._id === activeProd._id)) {
      return [activeProd, ...baseList]
    }
    return baseList
  }, [parentProducts, internalProducts, initialProduct, currentProduct])

  // Non-archived products available for stock entry
  const stockEligibleProducts = useMemo(() => {
    return combinedProducts.filter((p) => p.status !== 'archived')
  }, [combinedProducts])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return stockEligibleProducts
    const q = searchQuery.toLowerCase().trim()
    return stockEligibleProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q)
    )
  }, [stockEligibleProducts, searchQuery])

  const activeInitialProduct = initialProduct || currentProduct
  const activeInitialVariantId = initialVariantId || currentVariantId

  // Sync initial selection when opened
  useEffect(() => {
    if (isVisible) {
      const prodId = activeInitialProduct?._id || activeInitialProduct?.id || stockEligibleProducts[0]?._id || ''
      setSelectedProductId(prodId)
      setSelectedVariantId(activeInitialVariantId || '')
      setMode('add')
      setQuantity('10')
      setCustomReason('')
      setReasonPreset(REASON_PRESETS[0])
      setShowHistory(false)
    }
  }, [isVisible, activeInitialProduct, activeInitialVariantId])

  // If products loaded after modal was opened without a preset product, select first product
  useEffect(() => {
    if (isVisible && !selectedProductId && stockEligibleProducts.length > 0) {
      setSelectedProductId(stockEligibleProducts[0]._id || stockEligibleProducts[0].id)
    }
  }, [isVisible, selectedProductId, stockEligibleProducts])

  // Current selected product object
  const selectedProduct = useMemo(() => {
    const activeProd = initialProduct || currentProduct
    if (activeProd && (activeProd._id === selectedProductId || activeProd.id === selectedProductId)) {
      return activeProd
    }
    return combinedProducts.find((p) => p._id === selectedProductId || p.id === selectedProductId)
  }, [selectedProductId, initialProduct, currentProduct, combinedProducts])

  // Variants list for selected product
  const variants = useMemo(() => {
    return selectedProduct?.variants || []
  }, [selectedProduct])

  // Current selected variant object
  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null
    return variants.find((v) => v._id === selectedVariantId || v.id === selectedVariantId) || null
  }, [selectedVariantId, variants])

  // Current active stock, pricing, and purchase cost
  const currentStock = Number(
    selectedVariant ? selectedVariant.stock : selectedProduct?.stock || 0
  )
  const regularPrice = Number(
    selectedVariant ? selectedVariant.regularPrice : selectedProduct?.regularPrice || 0
  )
  const salePrice = Number(
    selectedVariant
      ? selectedVariant.salePrice || selectedVariant.regularPrice || 0
      : selectedProduct?.salePrice || selectedProduct?.regularPrice || 0
  )
  const currentPurchasePrice = Number(
    selectedVariant
      ? selectedVariant.purchasePrice ?? selectedVariant.costPrice ?? 0
      : selectedProduct?.purchasePrice ?? selectedProduct?.costPrice ?? 0
  )

  // Initialize purchasePrice input with current purchase cost when product/variant changes
  useEffect(() => {
    setPurchasePrice(currentPurchasePrice > 0 ? String(currentPurchasePrice) : '')
  }, [currentPurchasePrice, selectedProductId, selectedVariantId])

  // Effective purchase price for this entry
  const effectivePurchasePrice = purchasePrice !== '' && !isNaN(Number(purchasePrice))
    ? Math.max(0, Number(purchasePrice))
    : currentPurchasePrice

  // Quantity calculations
  const parsedQty = Math.max(0, parseInt(quantity, 10) || 0)

  const delta = useMemo(() => {
    if (mode === 'set') return parsedQty - currentStock
    if (mode === 'reduce') return -parsedQty
    return parsedQty
  }, [mode, parsedQty, currentStock])

  const projectedNewStock = useMemo(() => {
    if (mode === 'set') return parsedQty
    if (mode === 'reduce') return Math.max(0, currentStock - parsedQty)
    return currentStock + parsedQty
  }, [mode, parsedQty, currentStock])

  // Live Unit & Batch Profit Metrics
  const unitProfit = salePrice - effectivePurchasePrice
  const unitMarginPercent = salePrice > 0 ? Math.round((unitProfit / salePrice) * 100) : 0

  const batchUnits = mode === 'set' ? Math.max(0, delta) : (mode === 'add' ? parsedQty : 0)
  const batchInvestment = batchUnits * effectivePurchasePrice
  const batchRevenue = batchUnits * salePrice
  const batchGrossProfit = batchRevenue - batchInvestment
  const batchMarginPercent = batchRevenue > 0 ? Math.round((batchGrossProfit / batchRevenue) * 100) : unitMarginPercent

  // Load history for selected product
  const loadHistory = async () => {
    if (!selectedProductId) return
    setHistoryLoading(true)
    try {
      const res = await adminGet('/inventory/history', {
        productId: selectedProductId,
        limit: 10,
      })
      setHistoryList(res.data || [])
    } catch (err) {
      notify(apiErrorMessage(err, 'Unable to load stock history'), 'error')
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory()
    }
    setShowHistory(!showHistory)
  }

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedProductId) {
      notify('Please select a product for this stock entry', 'error')
      return
    }

    if (mode !== 'set' && parsedQty <= 0) {
      notify('Please enter a valid whole number quantity greater than 0', 'error')
      return
    }

    const finalReason = [
      reasonPreset,
      customReason.trim() ? `(${customReason.trim()})` : '',
    ]
      .filter(Boolean)
      .join(' ')

    setSaving(true)
    try {
      const payload = {
        variantId: selectedVariantId || null,
        quantity: delta,
        mode: mode === 'set' ? 'set' : 'add',
        targetStock: mode === 'set' ? parsedQty : undefined,
        purchasePrice: effectivePurchasePrice,
        reason: finalReason,
      }

      const res = await adminPost(`/inventory/stock/${selectedProductId}`, payload)
      notify(res.message || 'Stock and purchase cost updated successfully')

      if (typeof onSuccess === 'function') {
        onSuccess(res.data)
      }

      onClose()
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to update stock entry'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={isVisible}
      onClose={onClose}
      title="Stock Entry & Inventory Restock"
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)]">
              Select Product with Stock Tracking *
            </label>
            <span className="text-[11px] text-[var(--hexa-muted)]">
              {loadingProducts
                ? 'Loading catalog...'
                : `${stockEligibleProducts.length} product${stockEligibleProducts.length === 1 ? '' : 's'} available`}
            </span>
          </div>

          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
            />
            <input
              type="text"
              className="hexa-input !pl-10 text-xs"
              placeholder="Search product by title, brand, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="hexa-input text-xs font-semibold"
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value)
              setSelectedVariantId('')
            }}
            disabled={loadingProducts && filteredProducts.length === 0}
            required
          >
            <option value="" disabled>
              {loadingProducts && filteredProducts.length === 0 ? 'Loading products...' : '-- Select a Product --'}
            </option>
            {filteredProducts.map((p) => {
              const countStr = p.allowUnlimitedStock ? '∞ Unlimited Stock' : `${p.stock ?? 0} in stock`
              return (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.name} {p.brand ? `(${p.brand})` : ''} — {countStr}
                </option>
              )
            })}
          </select>

          {filteredProducts.length === 0 && !loadingProducts && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              No products found{searchQuery ? ` matching "${searchQuery}"` : ''}.
            </p>
          )}
        </div>

        {/* Variant Selection (if product has variants) */}
        {variants.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/50 p-3.5">
            <label className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Select Plan / Variant / Edition *
            </label>
            <select
              className="hexa-input text-xs font-medium"
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
            >
              <option value="">Base Product (Default)</option>
              {variants.map((v) => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.name} {v.duration ? `· ${v.duration}` : ''} — Stock: {v.unlimitedStock ? '∞ Unlimited' : v.stock} units
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Current Financial & Stock Snapshot Card */}
        {selectedProduct && (
          <div className="grid gap-3 sm:grid-cols-4 rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4">
            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Current Stock</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-black text-[var(--hexa-text)]">
                  {selectedVariant?.unlimitedStock || selectedProduct?.allowUnlimitedStock
                    ? '∞ Unlimited'
                    : currentStock.toLocaleString()}
                </span>
                <StatusBadge value={selectedProduct.stockStatus || 'in_stock'} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Selling Price</p>
              <p className="mt-1 text-lg font-black text-purple-400">
                ৳{salePrice.toLocaleString()}
              </p>
              {regularPrice > salePrice && (
                <span className="text-[11px] text-[var(--hexa-muted)] line-through">
                  ৳{regularPrice.toLocaleString()}
                </span>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Current Purchase Cost</p>
              <p className="mt-1 text-lg font-black text-amber-400">
                ৳{currentPurchasePrice.toLocaleString()}
              </p>
              <span className="text-[10px] text-[var(--hexa-muted)]">per sourced unit</span>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase text-[var(--hexa-muted)]">Current Unit Profit</p>
              <p
                className={`mt-1 text-lg font-black ${
                  unitProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {unitProfit >= 0 ? `+৳${unitProfit.toLocaleString()}` : `-৳${Math.abs(unitProfit).toLocaleString()}`}
              </p>
              <span
                className={`text-[10px] font-semibold ${
                  unitMarginPercent >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'
                }`}
              >
                {unitMarginPercent}% margin
              </span>
            </div>
          </div>
        )}

        {/* Stock Entry Controls */}
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.02] p-5 space-y-4">
          {/* Operation Mode Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-text)] mb-2 block">
              Stock Entry Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('add')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                  mode === 'add'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-sm'
                    : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:border-emerald-500/30'
                }`}
              >
                <HugeiconsIcon icon={ArrowUp01Icon} size={14} />
                <span>+ Add Stock</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('set')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                  mode === 'set'
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300 shadow-sm'
                    : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:border-purple-500/30'
                }`}
              >
                <HugeiconsIcon icon={Tick02Icon} size={14} />
                <span>= Set Exact Count</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('reduce')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition ${
                  mode === 'reduce'
                    ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 shadow-sm'
                    : 'border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] hover:border-rose-500/30'
                }`}
              >
                <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
                <span>- Reduce / Deduct</span>
              </button>
            </div>
          </div>

          {/* Quantity Input & Quick Chips */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-text)] mb-1.5 block">
                {mode === 'add'
                  ? 'Units to Add *'
                  : mode === 'set'
                  ? 'New Exact Stock Level *'
                  : 'Units to Deduct *'}
              </label>
              <input
                type="number"
                min={mode === 'set' ? '0' : '1'}
                className="hexa-input font-bold text-base"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 50"
                required
              />

              {/* Quick Stepper Chips */}
              {mode !== 'set' && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-semibold text-[var(--hexa-muted)]">Quick:</span>
                  {QUICK_STEPPERS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setQuantity(String(chip))}
                      className="rounded-lg border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--hexa-text-secondary)] hover:border-purple-500/30 hover:bg-purple-500/10 transition"
                    >
                      +{chip}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch Purchase Price */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-text)] mb-1.5 flex items-center justify-between">
                <span>Unit Purchase Price (৳)</span>
                <span className="text-[10px] font-normal text-amber-400">Buying / Sourcing Cost</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="hexa-input font-bold text-base text-amber-300"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="e.g. 150"
              />
              <p className="mt-1 text-[11px] text-[var(--hexa-muted)]">
                Leave as-is to preserve current cost, or enter new purchase cost for this batch.
              </p>
            </div>
          </div>

          {/* Real-time Projected Stock & Batch Profit Analytics Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon icon={Coins01Icon} size={16} className="text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Live Stock & Earnings Projection
              </h4>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-xs">
              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] text-[var(--hexa-muted)]">New Total Stock</p>
                <p className="mt-0.5 font-bold text-sm text-[var(--hexa-text)]">
                  {projectedNewStock.toLocaleString()} units
                  <span className="text-[10px] ml-1 text-emerald-400">
                    ({delta >= 0 ? `+${delta}` : delta})
                  </span>
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] text-[var(--hexa-muted)]">Total Inflow Investment</p>
                <p className="mt-0.5 font-bold text-sm text-amber-300">
                  ৳{batchInvestment.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] text-[var(--hexa-muted)]">Projected Revenue</p>
                <p className="mt-0.5 font-bold text-sm text-purple-300">
                  ৳{batchRevenue.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-black/20 p-2.5">
                <p className="text-[10px] text-[var(--hexa-muted)]">Expected Gross Profit</p>
                <p
                  className={`mt-0.5 font-bold text-sm ${
                    batchGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {batchGrossProfit >= 0
                    ? `+৳${batchGrossProfit.toLocaleString()}`
                    : `-৳${Math.abs(batchGrossProfit).toLocaleString()}`}
                  <span className="text-[10px] ml-1 opacity-80">({batchMarginPercent}%)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Reason & Reference Notes */}
          <div className="grid gap-3 sm:grid-cols-2 pt-1">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)] mb-1 block">
                Reason Preset
              </label>
              <select
                className="hexa-input text-xs"
                value={reasonPreset}
                onChange={(e) => setReasonPreset(e.target.value)}
              >
                {REASON_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-muted)] mb-1 block">
                Batch Reference / Supplier Invoice Note
              </label>
              <input
                type="text"
                className="hexa-input text-xs"
                placeholder="e.g. PO #88392 / Supplier: GlobalKeys"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* History Toggle Button */}
        <div className="flex items-center justify-between border-t border-[var(--hexa-border)] pt-3">
          <button
            type="button"
            onClick={toggleHistory}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition flex items-center gap-1.5"
          >
            <HugeiconsIcon icon={FlashIcon} size={13} />
            <span>{showHistory ? 'Hide Recent Stock Movements' : 'View Recent Stock Movements'}</span>
          </button>
        </div>

        {/* Embedded Recent Stock Movements List */}
        {showHistory && (
          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/70 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--hexa-text)]">
              Recent Movements for this Product
            </h4>

            {historyLoading ? (
              <div className="py-6 text-center text-xs text-[var(--hexa-muted)]">Loading stock logs...</div>
            ) : historyList.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--hexa-muted)]">
                No recent stock movements recorded for this product.
              </div>
            ) : (
              <div className="divide-y divide-[var(--hexa-border)] text-xs max-h-48 overflow-y-auto">
                {historyList.map((log) => (
                  <div key={log._id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--hexa-text)]">
                        {log.reason || 'Stock adjustment'}
                      </p>
                      <p className="text-[10px] text-[var(--hexa-muted)]">
                        {new Date(log.createdAt).toLocaleString()} · by {log.changedBy?.name || 'Admin'}
                        {log.purchasePrice > 0 ? ` · Unit Cost: ৳${log.purchasePrice}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold ${
                          log.quantityChanged >= 0
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {log.quantityChanged >= 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                      </span>
                      <p className="text-[10px] text-[var(--hexa-muted)] mt-0.5">
                        Stock: {log.previousStock} &rarr; {log.newStock}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--hexa-border)] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="hexa-btn-secondary !px-4 !py-2 text-xs"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="hexa-btn !px-5 !py-2 text-xs flex items-center gap-1.5"
            disabled={saving}
          >
            {saving ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <HugeiconsIcon icon={PackageIcon} size={14} />
            )}
            <span>{saving ? 'Recording Stock Entry...' : 'Confirm Stock Entry'}</span>
          </button>
        </div>
      </form>
    </Modal>
  )
}
