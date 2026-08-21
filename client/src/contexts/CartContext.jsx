import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)
const STORAGE_KEY = 'hexa_guest_cart_v3'
const LEGACY_STORAGE_KEYS = ['hexa_guest_cart_v2', 'hexa_active_bundle_v1']

const clampQuantity = (value) => Math.max(1, Math.min(20, Number(value) || 1))
const effectivePrice = (item) => {
  const regular = Number(item?.regularPrice || 0)
  const sale = Number(item?.salePrice || 0)
  return sale > 0 && sale < regular ? sale : regular
}

const normalizeStoredItem = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const itemType = raw.itemType === 'bundle' || raw.bundleId ? 'bundle' : 'product'
  const customerInputs = raw.customerInputs && typeof raw.customerInputs === 'object' ? raw.customerInputs : {}
  const inputSuffix = Object.keys(customerInputs).length ? `:${JSON.stringify(customerInputs)}` : ''

  if (itemType === 'bundle') {
    const bundleId = raw.bundleId || raw._id
    if (!bundleId) return null
    return {
      key: `bundle:${bundleId}${inputSuffix}`,
      itemType: 'bundle',
      bundleId,
      productId: null,
      variantId: null,
      slug: raw.slug || '',
      name: raw.name || 'Bundle',
      image: raw.image || '',
      productType: 'bundle',
      variantName: '',
      price: Number(raw.price || 0),
      quantity: clampQuantity(raw.quantity),
      customerInputs,
      components: Array.isArray(raw.components) ? raw.components : [],
    }
  }

  if (!raw.productId) return null
  return {
    ...raw,
    key: raw.key || `product:${raw.productId}:${raw.variantId || 'base'}${inputSuffix}`,
    itemType: 'product',
    bundleId: null,
    quantity: clampQuantity(raw.quantity),
    price: Number(raw.price || 0),
    customerInputs,
  }
}

const readStored = () => {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (Array.isArray(current) && current.length) return current.map(normalizeStoredItem).filter(Boolean)

    // Migrate the old guest product cart. Legacy bundle component lines remain products;
    // customers can re-add the bundle as one first-class item from its bundle page.
    const legacy = JSON.parse(localStorage.getItem('hexa_guest_cart_v2') || '[]')
    return Array.isArray(legacy) ? legacy.map(normalizeStoredItem).filter(Boolean) : []
  } catch {
    return []
  }
}

const clearStoredGuestCart = () => {
  localStorage.removeItem(STORAGE_KEY)
  for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key)
}

const serializeForApi = (item) => item.itemType === 'bundle'
  ? { itemType: 'bundle', bundleId: item.bundleId, quantity: clampQuantity(item.quantity), customerInputs: item.customerInputs || {} }
  : {
      itemType: 'product',
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: clampQuantity(item.quantity),
      customerInputs: item.customerInputs || {},
    }

const hydrateServerItem = (item) => {
  const customerInputs = item.customerInputs && typeof item.customerInputs === 'object' ? item.customerInputs : {}
  const inputSuffix = Object.keys(customerInputs).length ? `:${JSON.stringify(customerInputs)}` : ''

  if ((item.itemType || 'product') === 'bundle') {
    const bundle = item.bundle
    if (!bundle) return null
    return {
      key: `bundle:${bundle._id}${inputSuffix}`,
      itemType: 'bundle',
      bundleId: bundle._id,
      productId: null,
      variantId: null,
      slug: bundle.slug,
      name: bundle.name,
      image: bundle.image?.url || bundle.bannerImage?.url || '',
      productType: 'bundle',
      variantName: '',
      price: effectivePrice(bundle),
      quantity: clampQuantity(item.quantity),
      customerInputs,
      components: (bundle.items || []).map((component) => ({
        productId: component.product?._id || component.product,
        name: component.product?.name || '',
        quantity: Number(component.quantity || 1),
        variantId: component.variantId || null,
      })),
    }
  }

  const product = item.product
  if (!product) return null
  const variantId = item.variantId || null
  const variant = variantId ? product.variants?.find((entry) => String(entry._id) === String(variantId)) : null
  return {
    key: `product:${product._id}:${variantId || 'base'}${inputSuffix}`,
    itemType: 'product',
    productId: product._id,
    bundleId: null,
    slug: product.slug,
    name: product.name,
    image: product.thumbnail?.url || '',
    productType: product.productType,
    variantId,
    variantName: variant?.name || '',
    price: variant ? effectivePrice(variant) : effectivePrice(product),
    quantity: clampQuantity(item.quantity),
    customerInputs,
    components: [],
  }
}

const mergeCartItems = (serverItems, guestItems) => {
  const merged = new Map()
  for (const source of [...serverItems, ...guestItems]) {
    const normalized = normalizeStoredItem(source)
    if (!normalized) continue
    const existing = merged.get(normalized.key)
    if (!existing) {
      merged.set(normalized.key, normalized)
      continue
    }
    merged.set(normalized.key, {
      ...existing,
      ...normalized,
      quantity: clampQuantity(Number(existing.quantity || 0) + Number(normalized.quantity || 0)),
    })
  }
  return [...merged.values()]
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState(readStored)
  const [serverReady, setServerReady] = useState(false)
  const activeUserId = useRef(null)
  const syncTimer = useRef(null)

  // Only a guest cart belongs in localStorage. Authenticated carts belong to the server.
  // This prevents one signed-in account's cart from leaking into a guest or another account.
  useEffect(() => {
    if (user?._id) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key)
  }, [items, user?._id])

  // On sign-in, hydrate the server cart and truly merge any guest items into it.
  // On sign-out/account switch, never reuse the previous authenticated user's cart locally.
  useEffect(() => {
    let cancelled = false
    const nextUserId = user?._id || null

    if (!nextUserId) {
      if (activeUserId.current) setItems(readStored())
      activeUserId.current = null
      setServerReady(false)
      return () => { cancelled = true }
    }

    activeUserId.current = nextUserId
    setServerReady(false)

    const start = async () => {
      const guestItems = readStored()
      try {
        const { data: cartResponse } = await api.get('/cart')
        if (cancelled || activeUserId.current !== nextUserId) return

        const serverItems = (cartResponse.data?.items || []).map(hydrateServerItem).filter(Boolean)
        if (!guestItems.length) {
          setItems(serverItems)
          clearStoredGuestCart()
          return
        }

        const combined = mergeCartItems(serverItems, guestItems)
        const { data: mergedResponse } = await api.put('/cart', {
          items: combined.map(serializeForApi),
        })
        if (cancelled || activeUserId.current !== nextUserId) return

        const hydrated = (mergedResponse.data?.items || []).map(hydrateServerItem).filter(Boolean)
        setItems(hydrated)
        clearStoredGuestCart()
      } catch {
        // Keep the guest cart visible when the server cannot hydrate it yet; it stays in
        // localStorage so no customer selections are lost. We do not mark it synchronized.
        if (!cancelled && activeUserId.current === nextUserId && guestItems.length) setItems(guestItems)
      } finally {
        if (!cancelled && activeUserId.current === nextUserId) setServerReady(true)
      }
    }

    start()
    return () => { cancelled = true }
  }, [user?._id])

  // Debounced authenticated cart synchronization after initial hydration/merge.
  useEffect(() => {
    if (!user?._id || !serverReady) return undefined
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => {
      api.put('/cart', { items: items.map(serializeForApi) }).catch(() => {})
    }, 220)
    return () => clearTimeout(syncTimer.current)
  }, [items, serverReady, user?._id])

  const addItem = (product, variant = null, quantity = 1, customerInputs = {}) => {
    const safeInputs = customerInputs && typeof customerInputs === 'object' ? customerInputs : {}
    const inputSuffix = Object.keys(safeInputs).length ? `:${JSON.stringify(safeInputs)}` : ''
    const key = `product:${product._id}:${variant?._id || 'base'}${inputSuffix}`
    setItems((current) => {
      const found = current.find((item) => item.key === key)
      if (found) {
        return current.map((item) => item.key === key
          ? { ...item, quantity: clampQuantity(item.quantity + Number(quantity || 1)) }
          : item)
      }
      return [...current, {
        key,
        itemType: 'product',
        productId: product._id,
        bundleId: null,
        slug: product.slug,
        name: product.name,
        image: product.thumbnail?.url || '',
        productType: product.productType,
        variantId: variant?._id || null,
        variantName: variant?.name || '',
        price: variant ? effectivePrice(variant) : effectivePrice(product),
        quantity: clampQuantity(quantity),
        customerInputs: safeInputs,
        components: [],
      }]
    })
  }

  const addBundle = (bundle, quantity = 1) => {
    const key = `bundle:${bundle._id}`
    setItems((current) => {
      const found = current.find((item) => item.key === key)
      if (found) {
        return current.map((item) => item.key === key
          ? { ...item, quantity: clampQuantity(item.quantity + Number(quantity || 1)) }
          : item)
      }
      return [...current, {
        key,
        itemType: 'bundle',
        bundleId: bundle._id,
        productId: null,
        slug: bundle.slug,
        name: bundle.name,
        image: bundle.image?.url || bundle.bannerImage?.url || '',
        productType: 'bundle',
        variantId: null,
        variantName: '',
        price: effectivePrice(bundle),
        quantity: clampQuantity(quantity),
        components: (bundle.items || []).map((component) => ({
          productId: component.product?._id || component.product,
          name: component.product?.name || '',
          quantity: Number(component.quantity || 1),
          variantId: component.variantId || null,
        })),
      }]
    })
  }

  const updateQuantity = (key, quantity) => {
    setItems((current) => current.map((item) => item.key === key
      ? { ...item, quantity: clampQuantity(quantity) }
      : item))
  }

  const removeItem = (key) => setItems((current) => current.filter((item) => item.key !== key))

  const clearCart = () => {
    setItems([])
    if (user?._id) api.delete('/cart').catch(() => {})
    else clearStoredGuestCart()
  }

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  )
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  )

  const value = useMemo(() => ({
    items,
    cartCount,
    subtotal,
    addItem,
    addBundle,
    updateQuantity,
    removeItem,
    clearCart,
    serverReady,
  }), [items, cartCount, subtotal, serverReady])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
