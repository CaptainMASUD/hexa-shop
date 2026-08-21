import { FaHeart, FaTrash } from 'react-icons/fa'
import { useWishlist } from '../../contexts/WishlistContext'
import ProductCard from '../../components/ProductCard'
import EmptyState from '../../components/EmptyState'
import usePageMeta from '../../hooks/usePageMeta'

export default function WishlistPage() {
  const { wishlistItems: items, loading, remove } = useWishlist()

  usePageMeta('My Wishlist — HEXA', 'View and manage your saved products on HEXA.')

  return (
    <div className="hexa-container py-12">
      <div className="max-w-3xl">
        <span className="hexa-badge">
          <FaHeart className="text-rose-500" /> Wishlist
        </span>
        <h1 className="hexa-title mt-4">Saved for Later</h1>
        <p className="mt-3 text-[var(--hexa-muted)]">
          Keep the subscriptions, game top-ups, tools, and keys you want to compare or purchase later.
        </p>
      </div>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="hexa-card h-96 animate-pulse" />
          ))}
        </div>
      ) : items.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((product) => (
            <div key={product._id} className="flex flex-col">
              <div className="flex-1">
                <ProductCard product={product} />
              </div>
              <button
                type="button"
                onClick={() => remove(product._id)}
                className="mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition"
              >
                <FaTrash className="text-[10px]" /> Remove from wishlist
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Your wishlist is empty"
            description="Click the heart icon on any product card across the marketplace to save it here."
          />
        </div>
      )}
    </div>
  )
}
