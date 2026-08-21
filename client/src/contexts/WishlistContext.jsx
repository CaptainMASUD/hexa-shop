import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getWishlist, addWishlist, removeWishlist } from '../api/features.api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const { notify } = useToast()
  const [wishlistIds, setWishlistIds] = useState(new Set())
  const [wishlistItems, setWishlistItems] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set())
      setWishlistItems([])
      return
    }
    try {
      setLoading(true)
      const data = await getWishlist()
      const list = Array.isArray(data) ? data.filter(Boolean) : []
      setWishlistItems(list)
      setWishlistIds(new Set(list.map((p) => String(p._id))))
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const isInWishlist = useCallback(
    (productId) => {
      if (!productId) return false
      return wishlistIds.has(String(productId))
    },
    [wishlistIds]
  )

  const toggleWishlist = useCallback(
    async (product) => {
      if (!user) {
        notify('Sign in to save products to your wishlist', 'error')
        return false
      }
      const productId = String(product?._id || product)
      const wasInWishlist = wishlistIds.has(productId)

      // Optimistic update
      setWishlistIds((prev) => {
        const next = new Set(prev)
        if (wasInWishlist) next.delete(productId)
        else next.add(productId)
        return next
      })

      if (wasInWishlist) {
        setWishlistItems((prev) => prev.filter((p) => String(p._id) !== productId))
      }

      try {
        if (wasInWishlist) {
          await removeWishlist(productId)
          notify('Removed from wishlist')
        } else {
          await addWishlist(productId)
          notify('Saved to wishlist')
          if (product && typeof product === 'object' && product._id) {
            setWishlistItems((prev) => [product, ...prev.filter((p) => String(p._id) !== productId)])
          }
        }
        return !wasInWishlist
      } catch {
        // Rollback optimistic update
        setWishlistIds((prev) => {
          const next = new Set(prev)
          if (wasInWishlist) next.add(productId)
          else next.delete(productId)
          return next
        })
        notify('Could not update wishlist', 'error')
        return wasInWishlist
      }
    },
    [user, wishlistIds, notify]
  )

  const remove = useCallback(
    async (productId) => {
      const pid = String(productId)
      setWishlistIds((prev) => {
        const next = new Set(prev)
        next.delete(pid)
        return next
      })
      setWishlistItems((prev) => prev.filter((p) => String(p._id) !== pid))
      try {
        await removeWishlist(pid)
        notify('Removed from wishlist')
      } catch {
        notify('Could not remove from wishlist', 'error')
        fetchWishlist()
      }
    },
    [notify, fetchWishlist]
  )

  const value = {
    wishlistIds,
    wishlistItems,
    loading,
    isInWishlist,
    toggleWishlist,
    remove,
    refreshWishlist: fetchWishlist,
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export const useWishlist = () => {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
