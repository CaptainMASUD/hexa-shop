import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'

import { HugeiconsIcon } from '@hugeicons/react'

import {
  FavouriteIcon,
  HexagonIcon,
  ShoppingCart01Icon,
  StarIcon,
} from '@hugeicons/core-free-icons'

import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useWishlist } from '../contexts/WishlistContext'

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

export const effectivePrice = (
  itemOrRegular,
  sale
) => {
  const regular =
    typeof itemOrRegular === 'object'
      ? Number(
          itemOrRegular?.regularPrice || 0
        )
      : Number(itemOrRegular || 0)

  const saleValue =
    typeof itemOrRegular === 'object'
      ? Number(
          itemOrRegular?.salePrice || 0
        )
      : Number(sale || 0)

  return (
    saleValue > 0 &&
    saleValue < regular
  )
    ? saleValue
    : regular
}

export const totalStock = (
  product
) => {
  const variants = (
    product?.variants || []
  ).filter(
    (variant) =>
      variant.active
  )

  return variants.length
    ? variants.reduce(
        (sum, variant) =>
          sum +
          Number(
            variant.stock || 0
          ),
        0
      )
    : Number(
        product?.stock || 0
      )
}

/* ========================================================================== */
/* Product Card                                                               */
/* ========================================================================== */

export default function ProductCard({
  product,
}) {
  const { addItem } = useCart()
  const { notify } = useToast()
  const { format } = useCurrency()
  const navigate = useNavigate()

  /* ---------------------------------------------------------------------- */
  /* Product data                                                           */
  /* ---------------------------------------------------------------------- */

  const variants = (
    product.variants || []
  ).filter(
    (variant) => variant.active !== false
  )

  const prices =
    variants.map(
      (variant) =>
        effectivePrice(
          variant.regularPrice,
          variant.salePrice
        )
    )

  const price =
    prices.length
      ? Math.min(...prices)
      : effectivePrice(
          product.regularPrice,
          product.salePrice
        )

  const regular =
    variants.length
      ? Math.min(
          ...variants.map(
            (variant) =>
              Number(
                variant.regularPrice || 0
              )
          )
        )
      : Number(
          product.regularPrice || 0
        )

  const stock =
    product.allowUnlimitedStock
      ? 9999
      : totalStock(product)

  const defaultVariant =
    variants[0] || null

  const hasSale =
    regular > price

  /* ---------------------------------------------------------------------- */
  /* Quick add                                                              */
  /* ---------------------------------------------------------------------- */

  const quickAdd = () => {
    if (stock <= 0) {
      return
    }

    if (product.customFields?.some((f) => f.required) || variants.length > 1) {
      navigate(`/product/${product.slug}`)
      return
    }

    addItem(
      product,
      defaultVariant,
      1
    )

    notify(
      `${product.name} added to cart`
    )
  }

  /* ---------------------------------------------------------------------- */
  /* Wishlist                                                               */
  /* ---------------------------------------------------------------------- */

  const { isInWishlist, toggleWishlist } = useWishlist()
  const isFavorited = isInWishlist(product._id)

  const favorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    await toggleWishlist(product)
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 8,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: '-35px',
      }}
      transition={{
        duration: 0.22,
      }}
      className="
        group

        flex
        h-full
        flex-col

        overflow-hidden

        rounded-[18px]

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]

        transition-[border-color]
        duration-200
        ease-out

        hover:border-purple-500/30
      "
    >
      {/* ================================================================== */}
      {/* Product Image                                                      */}
      {/* ================================================================== */}

      <div
        className="
          relative

          aspect-[4/3]

          overflow-hidden

          bg-purple-500/[0.035]
        "
      >
        {product.thumbnail?.url ? (
          <img
            src={
              product.thumbnail.url
            }
            alt={
              product.thumbnail
                .alt ||
              product.name
            }
            loading="lazy"
            decoding="async"
            className="
              h-full
              w-full

              transform-gpu

              object-cover

              transition-transform
              duration-500
              ease-out

              group-hover:scale-[1.025]
            "
          />
        ) : (
          <div
            className="
              flex
              h-full
              items-center
              justify-center

              text-purple-500/30
            "
          >
            <UIIcon
              icon={
                HexagonIcon
              }
              size={48}
              strokeWidth={1.25}
            />
          </div>
        )}

        {/* ================================================================ */}
        {/* Top badges + wishlist                                            */}
        {/* ================================================================ */}

        <div
          className="
            absolute
            inset-x-0
            top-0

            flex
            items-start
            justify-between

            p-3
          "
        >
          {/* Badges */}

          <div
            className="
              flex
              flex-wrap
              gap-1.5
            "
          >
            {product.popular && (
              <ProductBadge>
                Popular
              </ProductBadge>
            )}

            {product.newArrival && (
              <ProductBadge>
                New
              </ProductBadge>
            )}

            {hasSale && (
              <span
                className="
                  rounded-full

                  bg-rose-500

                  px-2.5
                  py-1

                  text-[10px]
                  font-bold
                  text-white
                "
              >
                Sale
              </span>
            )}
          </div>

          {/* Wishlist */}

          <button
            type="button"
            onClick={favorite}
            aria-label={
              isFavorited
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            title={
              isFavorited
                ? 'Saved in Wishlist'
                : 'Add to Wishlist'
            }
            className={`
              flex
              h-9
              w-9
              transform-gpu
              items-center
              justify-center
              rounded-full
              border
              backdrop-blur-md
              will-change-transform
              transition-[transform,background-color,border-color,color,box-shadow]
              duration-200
              ease-out
              active:scale-[0.94]
              hover:scale-[1.06]
              ${
                isFavorited
                  ? '!border-purple-400 !bg-purple-600 !text-white shadow-[0_0_14px_rgba(147,51,234,0.6)]'
                  : 'border-white/15 bg-black/40 text-white hover:border-purple-400/30 hover:bg-purple-600'
              }
            `}
          >
            <UIIcon
              icon={
                FavouriteIcon
              }
              size={18}
              strokeWidth={isFavorited ? 2.4 : 1.8}
              className={isFavorited ? 'fill-white text-white' : ''}
            />
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Product Content                                                    */}
      {/* ================================================================== */}

      <div
        className="
          flex
          flex-1
          flex-col

          p-5
        "
      >
        {/* Category + Rating */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-2
          "
        >
          <p
            className="
              truncate

              text-[10px]
              font-bold
              uppercase
              tracking-[0.13em]

              text-purple-500
            "
          >
            {product.category
              ?.name ||
              product.productType}
          </p>

          {product.reviewCount >
            0 && (
            <span
              className="
                flex
                shrink-0
                items-center
                gap-1

                text-xs
                text-amber-500
              "
            >
              <UIIcon
                icon={
                  StarIcon
                }
                size={14}
                strokeWidth={1.9}
              />

              <span
                className="
                  font-medium
                "
              >
                {Number(
                  product.ratingAverage ||
                    0
                ).toFixed(1)}
              </span>

              <span
                className="
                  text-[var(--hexa-muted)]
                "
              >
                (
                {
                  product.reviewCount
                }
                )
              </span>
            </span>
          )}
        </div>

        {/* Product Name */}

        <Link
          to={`/product/${product.slug}`}
          className="
            group/title
            block
          "
        >
          <h3
            className="
              mt-2

              line-clamp-1

              text-lg
              font-bold
              tracking-[-0.02em]

              text-[var(--hexa-text)]

              transition-colors
              duration-150

              group-hover/title:text-purple-500
            "
          >
            {product.name}
          </h3>
        </Link>

        {/* Description */}

        <p
          className="
            mt-2

            line-clamp-2
            min-h-10

            text-sm
            font-normal
            leading-5

            text-[var(--hexa-muted)]
          "
        >
          {product.shortDescription ||
            'Secure digital delivery through your HEXA account.'}
        </p>

        {/* ================================================================ */}
        {/* Price / Action                                                   */}
        {/* ================================================================ */}

        <div
          className="
            mt-auto

            flex
            items-end
            justify-between
            gap-4

            pt-5
          "
        >
          {/* Price */}

          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                text-xs
                font-normal

                text-[var(--hexa-muted)]
              "
            >
              {variants.length
                ? 'Starting from'
                : 'Price'}
            </p>

            <div
              className="
                mt-1

                flex
                flex-wrap
                items-baseline
                gap-2
              "
            >
              <span
                className="
                  text-2xl
                  font-black
                  tracking-[-0.03em]

                  text-[var(--hexa-text)]
                "
              >
                {format(price)}
              </span>

              {hasSale && (
                <span
                  className="
                    text-sm

                    text-[var(--hexa-muted)]

                    line-through
                  "
                >
                  {format(
                    regular
                  )}
                </span>
              )}
            </div>

            {/* Stock */}

            <div
              className="
                mt-1.5

                flex
                items-center
                gap-1.5
              "
            >
              <span
                className={`
                  h-1.5
                  w-1.5

                  rounded-full

                  ${
                    stock > 0
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }
                `}
              />

              <p
                className={`
                  text-[11px]
                  font-medium

                  ${
                    stock > 0
                      ? 'text-emerald-500'
                      : 'text-rose-500'
                  }
                `}
              >
                {stock > 0
                  ? `${stock} available`
                  : 'Out of stock'}
              </p>
            </div>
          </div>

          {/* ============================================================= */}
          {/* Actions                                                       */}
          {/* ============================================================= */}

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            {/* ADD TO CART */}

            <button
              type="button"
              onClick={
                quickAdd
              }
              disabled={
                stock <= 0
              }
              aria-label={`Add ${product.name} to cart`}
              title={
                stock > 0
                  ? 'Add to cart'
                  : 'Out of stock'
              }
              className="
                flex
                h-10
                w-10
                transform-gpu
                items-center
                justify-center

                rounded-xl

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                text-[var(--hexa-text-soft)]

                will-change-transform

                transition-[transform,background-color,border-color,color]
                duration-150
                ease-out

                hover:scale-[1.035]
                hover:border-purple-500/30
                hover:bg-purple-500/[0.07]
                hover:text-purple-500

                active:scale-[0.96]

                disabled:pointer-events-none
                disabled:opacity-35
              "
            >
              <UIIcon
                icon={
                  ShoppingCart01Icon
                }
                size={19}
                strokeWidth={1.8}
              />
            </button>

            {/* VIEW PRODUCT */}

            <Link
              to={`/product/${product.slug}`}
              className="
                flex
                h-10
                transform-gpu
                items-center
                justify-center

                rounded-xl

                bg-purple-600

                px-4

                text-[13px]
                font-semibold
                text-white

                transition-[transform,background-color]
                duration-150
                ease-out

                hover:scale-[1.015]
                hover:bg-purple-500

                active:scale-[0.98]
              "
            >
              View
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

/* ========================================================================== */
/* Product Badge                                                              */
/* ========================================================================== */

function ProductBadge({
  children,
}) {
  return (
    <span
      className="
        rounded-full

        border
        border-white/15

        bg-black/45

        px-2.5
        py-1

        text-[10px]
        font-semibold
        text-white

        backdrop-blur-md
      "
    >
      {children}
    </span>
  )
}

/* ========================================================================== */
/* Hugeicons                                                                  */
/* ========================================================================== */

function UIIcon({
  icon,
  size = 18,
  strokeWidth = 1.7,
  className = '',
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color="currentColor"
      strokeWidth={
        strokeWidth
      }
      className={
        className
      }
    />
  )
}