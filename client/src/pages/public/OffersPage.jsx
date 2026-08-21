import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router-dom'

import { HugeiconsIcon } from '@hugeicons/react'

import {
  ArrowRight01Icon,
  FlashIcon,
  GiftIcon,
  PackageIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'

import {
  getBundles,
  getPromotions,
} from '../../api/features.api'

import { useCurrency } from '../../contexts/CurrencyContext'

import usePageMeta from '../../hooks/usePageMeta'

/* ========================================================================== */
/* Constants                                                                  */
/* ========================================================================== */

const FALLBACK_BANNER =
  '/images/offers-banner.jpg'

/* ========================================================================== */
/* Offers Page                                                                */
/* ========================================================================== */

export default function OffersPage() {
  const [bundles, setBundles] =
    useState([])

  const [
    promotions,
    setPromotions,
  ] = useState([])

  const [loading, setLoading] =
    useState(true)

  const { format } =
    useCurrency()

  usePageMeta(
    'Offers & Bundles — HEXA',
    'Discover HEXA bundles and scheduled campaigns.'
  )

  /* ====================================================================== */
  /* Load Data                                                              */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    setLoading(true)

    Promise.all([
      getBundles(),
      getPromotions(),
    ])
      .then(
        ([
          bundleRows,
          promotionRows,
        ]) => {
          if (!active) {
            return
          }

          setBundles(
            Array.isArray(
              bundleRows
            )
              ? bundleRows
              : []
          )

          setPromotions(
            Array.isArray(
              promotionRows
            )
              ? promotionRows
              : []
          )
        }
      )
      .catch(() => {
        if (!active) {
          return
        }

        setBundles([])
        setPromotions([])
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  /* ====================================================================== */
  /* Hero Cover                                                             */
  /* ====================================================================== */

  const bannerImage =
    useMemo(() => {
      const promotionWithImage =
        promotions.find(
          (promotion) =>
            promotion.image
              ?.url
        )

      return (
        promotionWithImage
          ?.image?.url ||
        FALLBACK_BANNER
      )
    }, [promotions])

  const featuredPromotion =
    promotions[0] || null

  const totalOffers =
    bundles.length +
    promotions.length

  /* ====================================================================== */
  /* Render                                                                 */
  /* ====================================================================== */

  return (
    <main
      className="
        min-h-screen

        bg-[var(--hexa-bg)]
        text-[var(--hexa-text)]
      "
    >
      <div
        className="
          hexa-container

          py-8
          sm:py-10
        "
      >
        {/* ================================================================ */}
        {/* HERO COVER                                                       */}
        {/* ================================================================ */}

        <section
          className="
            group

            relative

            min-h-[320px]

            overflow-hidden

            rounded-[24px]

            border
            border-[var(--hexa-border)]

            bg-[#111014]

            sm:min-h-[360px]

            lg:min-h-[400px]
          "
        >
          {/* ============================================================= */}
          {/* Cover Image                                                   */}
          {/* ============================================================= */}

          <img
            src={bannerImage}
            alt="HEXA offers and bundles"
            className="
              absolute
              inset-0

              h-full
              w-full

              transform-gpu

              object-cover
              object-center

              transition-transform
              duration-700
              ease-out

              group-hover:scale-[1.015]
            "
            onError={(event) => {
              event.currentTarget.style.display =
                'none'
            }}
          />

          {/* ============================================================= */}
          {/* Overlay                                                       */}
          {/* ============================================================= */}

          <div
            className="
              pointer-events-none

              absolute
              inset-0

              bg-gradient-to-r

              from-black/90
              via-black/65
              to-black/20
            "
          />

          <div
            className="
              pointer-events-none

              absolute
              inset-0

              bg-gradient-to-t

              from-black/55
              via-transparent
              to-black/10
            "
          />

          {/* ============================================================= */}
          {/* Hero Content                                                  */}
          {/* ============================================================= */}

          <div
            className="
              relative
              z-10

              flex
              min-h-[320px]
              max-w-[680px]
              flex-col
              justify-center

              px-5
              py-10

              sm:min-h-[360px]
              sm:px-8

              lg:min-h-[400px]
              lg:px-10
            "
          >
            {/* Badge */}

            <div
              className="
                inline-flex
                w-fit
                items-center
                gap-2

                rounded-full

                border
                border-white/20

                bg-black/25

                px-3
                py-1.5

                text-[11px]
                font-semibold
                text-white

                backdrop-blur-md
              "
            >
              <UIIcon
                icon={FlashIcon}
                size={14}
                strokeWidth={1.9}
              />

              HEXA Offers
            </div>

            {/* Title */}

            <h1
              className="
                mt-5

                max-w-[620px]

                text-[34px]
                font-black
                leading-[1.03]
                tracking-[-0.045em]

                text-white

                sm:text-[42px]
                lg:text-[48px]
              "
            >
              Bundles & limited campaigns
            </h1>

            {/* Description */}

            <p
              className="
                mt-4

                max-w-[540px]

                text-[14px]
                leading-6

                text-white/70

                sm:text-[15px]
              "
            >
              Discover curated digital
              bundles and limited HEXA
              offers at special prices.
            </p>

            {/* Actions */}

            <div
              className="
                mt-7

                flex
                flex-wrap
                items-center
                gap-3
              "
            >
              <Link
                to={
                  featuredPromotion
                    ?.buttonLink ||
                  '/products'
                }
                className="
                  group/button

                  inline-flex
                  h-11
                  transform-gpu
                  items-center
                  gap-2

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

                  active:scale-[0.985]
                "
              >
                <UIIcon
                  icon={
                    ShoppingBag01Icon
                  }
                  size={17}
                  strokeWidth={1.8}
                />

                Explore offers

                <UIIcon
                  icon={
                    ArrowRight01Icon
                  }
                  size={15}
                  strokeWidth={1.9}
                  className="
                    transition-transform
                    duration-150

                    group-hover/button:translate-x-0.5
                  "
                />
              </Link>

              {!loading &&
                totalOffers > 0 && (
                  <span
                    className="
                      rounded-xl

                      border
                      border-white/15

                      bg-black/25

                      px-3
                      py-2.5

                      text-[11px]
                      font-medium
                      text-white/75

                      backdrop-blur-md
                    "
                  >
                    {totalOffers}{' '}
                    {totalOffers ===
                    1
                      ? 'offer'
                      : 'offers'}{' '}
                    available
                  </span>
                )}
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Page Content                                                     */}
        {/* ================================================================ */}

        {loading ? (
          <OffersSkeleton />
        ) : (
          <>
            {/* ============================================================ */}
            {/* Campaigns                                                    */}
            {/* ============================================================ */}

            {promotions.length >
              0 && (
              <section
                className="
                  mt-12
                "
              >
                <SectionHeader
                  icon={
                    FlashIcon
                  }
                  kicker="Limited campaigns"
                  title="Featured offers"
                  description="Explore active HEXA promotions and limited campaigns."
                />

                <div
                  className="
                    mt-6

                    grid
                    gap-4

                    md:grid-cols-2
                  "
                >
                  {promotions.map(
                    (promotion) => (
                      <PromotionCard
                        key={
                          promotion._id
                        }
                        promotion={
                          promotion
                        }
                      />
                    )
                  )}
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* Bundles                                                      */}
            {/* ============================================================ */}

            <section
              className={`
                ${
                  promotions.length >
                  0
                    ? 'mt-14'
                    : 'mt-12'
                }
              `}
            >
              <SectionHeader
                icon={GiftIcon}
                kicker="Bundle pricing"
                title="HEXA bundles"
                description="Multiple digital products combined into one simple purchase."
              />

              {bundles.length >
              0 ? (
                <div
                  className="
                    mt-6

                    grid
                    gap-4

                    sm:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {bundles.map(
                    (bundle) => (
                      <BundleCard
                        key={
                          bundle._id
                        }
                        bundle={
                          bundle
                        }
                        format={
                          format
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <EmptyBundles />
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

/* ========================================================================== */
/* Promotion Card                                                             */
/* ========================================================================== */

function PromotionCard({
  promotion,
}) {
  const hasImage =
    Boolean(
      promotion.image?.url
    )

  return (
    <Link
      to={
        promotion.buttonLink ||
        '/products'
      }
      className="
        group

        relative

        min-h-[250px]

        overflow-hidden

        rounded-[20px]

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]

        p-5

        transition-[border-color]
        duration-200

        hover:border-purple-500/30

        sm:min-h-[275px]
        sm:p-6
      "
    >
      {/* ================================================================ */}
      {/* Campaign Cover                                                   */}
      {/* ================================================================ */}

      {hasImage && (
        <>
          <img
            src={
              promotion.image.url
            }
            alt={
              promotion.headline ||
              promotion.name
            }
            loading="lazy"
            decoding="async"
            className="
              absolute
              inset-0

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

          <div
            className="
              pointer-events-none

              absolute
              inset-0

              bg-gradient-to-r

              from-black/85
              via-black/60
              to-black/20
            "
          />

          <div
            className="
              pointer-events-none

              absolute
              inset-0

              bg-gradient-to-t

              from-black/45
              via-transparent
              to-transparent
            "
          />
        </>
      )}

      {/* ================================================================ */}
      {/* Content                                                          */}
      {/* ================================================================ */}

      <div
        className="
          relative
          z-10

          flex
          h-full
          max-w-[470px]
          flex-col
          items-start
        "
      >
        <span
          className={`
            inline-flex
            items-center
            gap-1.5

            rounded-full

            border

            px-2.5
            py-1

            text-[10px]
            font-semibold

            ${
              hasImage
                ? `
                  border-white/20
                  bg-black/25
                  text-white
                  backdrop-blur-md
                `
                : `
                  border-purple-500/15
                  bg-purple-500/[0.06]
                  text-purple-500
                `
            }
          `}
        >
          <UIIcon
            icon={FlashIcon}
            size={13}
            strokeWidth={1.9}
          />

          {promotion.badge ||
            'Campaign'}
        </span>

        <h2
          className={`
            mt-4

            max-w-md

            text-[26px]
            font-black
            leading-[1.08]
            tracking-[-0.035em]

            sm:text-[30px]

            ${
              hasImage
                ? 'text-white'
                : 'text-[var(--hexa-text)]'
            }
          `}
        >
          {promotion.headline ||
            promotion.name}
        </h2>

        {promotion.description && (
          <p
            className={`
              mt-3

              line-clamp-3

              max-w-md

              text-[13px]
              leading-6

              ${
                hasImage
                  ? 'text-white/70'
                  : 'text-[var(--hexa-muted)]'
              }
            `}
          >
            {
              promotion.description
            }
          </p>
        )}

        <span
          className={`
            mt-auto
            pt-6

            inline-flex
            items-center
            gap-2

            text-[13px]
            font-semibold

            ${
              hasImage
                ? 'text-white'
                : 'text-purple-500'
            }
          `}
        >
          <UIIcon
            icon={
              ShoppingBag01Icon
            }
            size={16}
            strokeWidth={1.8}
          />

          {promotion.buttonText ||
            'Explore offer'}

          <UIIcon
            icon={
              ArrowRight01Icon
            }
            size={15}
            strokeWidth={1.9}
            className="
              transition-transform
              duration-150

              group-hover:translate-x-1
            "
          />
        </span>
      </div>
    </Link>
  )
}

/* ========================================================================== */
/* Bundle Card                                                                */
/* ========================================================================== */

function BundleCard({
  bundle,
  format,
}) {
  const regular =
    Number(
      bundle.regularPrice ||
        0
    )

  const sale =
    Number(
      bundle.salePrice ||
        0
    )

  const price =
    sale > 0 &&
    sale < regular
      ? sale
      : regular

  const hasDiscount =
    regular > 0 &&
    price < regular

  const discount =
    hasDiscount
      ? Math.round(
          ((regular -
            price) /
            regular) *
            100
        )
      : 0

  const itemCount =
    bundle.items?.length ||
    0

  return (
    <Link
      to={`/bundle/${bundle.slug}`}
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
      {/* ================================================================ */}
      {/* Bundle Cover                                                     */}
      {/* ================================================================ */}

      <div
        className="
          relative

          aspect-[16/9]

          overflow-hidden

          bg-[var(--hexa-bg-soft)]
        "
      >
        {bundle.image?.url ? (
          <img
            src={
              bundle.image.url
            }
            alt={bundle.name}
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

              text-purple-500/35
            "
          >
            <UIIcon
              icon={GiftIcon}
              size={44}
              strokeWidth={1.4}
            />
          </div>
        )}

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
          <span
            className="
              inline-flex
              items-center
              gap-1.5

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
            <UIIcon
              icon={GiftIcon}
              size={13}
            />

            Bundle
          </span>

          {hasDiscount && (
            <span
              className="
                rounded-full

                bg-purple-600

                px-2.5
                py-1

                text-[10px]
                font-bold

                text-white
              "
            >
              {discount}% OFF
            </span>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* Content                                                          */}
      {/* ================================================================ */}

      <div
        className="
          flex
          flex-1
          flex-col

          p-5
        "
      >
        <div
          className="
            flex
            items-center
            gap-2

            text-[10px]
            font-bold
            uppercase
            tracking-[0.11em]

            text-purple-500
          "
        >
          <UIIcon
            icon={PackageIcon}
            size={13}
            strokeWidth={1.9}
          />

          Bundle offer
        </div>

        <h3
          className="
            mt-2.5

            line-clamp-1

            text-[18px]
            font-bold
            tracking-[-0.025em]

            text-[var(--hexa-text)]

            transition-colors
            duration-150

            group-hover:text-purple-500
          "
        >
          {bundle.name}
        </h3>

        {bundle.shortDescription && (
          <p
            className="
              mt-2

              line-clamp-2
              min-h-10

              text-[13px]
              leading-5

              text-[var(--hexa-muted)]
            "
          >
            {
              bundle.shortDescription
            }
          </p>
        )}

        <div
          className="
            mt-3

            inline-flex
            w-fit
            items-center
            gap-1.5

            rounded-lg

            border
            border-[var(--hexa-border)]

            bg-[var(--hexa-bg-soft)]

            px-2.5
            py-1.5

            text-[10px]
            font-medium

            text-[var(--hexa-muted)]
          "
        >
          <UIIcon
            icon={PackageIcon}
            size={13}
          />

          {itemCount}{' '}
          {itemCount === 1
            ? 'product'
            : 'products'}{' '}
          included
        </div>

        {/* ================================================================ */}
        {/* Pricing                                                          */}
        {/* ================================================================ */}

        <div
          className="
            mt-auto
            pt-5
          "
        >
          <div
            className="
              border-t
              border-[var(--hexa-border)]

              pt-4
            "
          >
            <div
              className="
                flex
                items-end
                justify-between
                gap-4
              "
            >
              <div>
                <p
                  className="
                    text-[10px]
                    text-[var(--hexa-muted)]
                  "
                >
                  Bundle price
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
                      text-[23px]
                      font-black
                      tracking-[-0.035em]

                      text-[var(--hexa-text)]
                    "
                  >
                    {format(
                      price
                    )}
                  </span>

                  {hasDiscount && (
                    <span
                      className="
                        text-xs

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
              </div>

              <span
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  transform-gpu
                  items-center
                  justify-center

                  rounded-xl

                  border
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-bg-soft)]

                  text-purple-500

                  transition-[transform,background-color,border-color]
                  duration-150

                  group-hover:translate-x-0.5
                  group-hover:border-purple-500/25
                  group-hover:bg-purple-500/[0.07]

                  group-active:scale-[0.95]
                "
              >
                <UIIcon
                  icon={
                    ArrowRight01Icon
                  }
                  size={16}
                  strokeWidth={1.9}
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ========================================================================== */
/* Section Header                                                             */
/* ========================================================================== */

function SectionHeader({
  icon,
  kicker,
  title,
  description,
}) {
  return (
    <div
      className="
        max-w-2xl
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center

            rounded-lg

            bg-purple-500/[0.07]

            text-purple-500
          "
        >
          <UIIcon
            icon={icon}
            size={14}
            strokeWidth={1.9}
          />
        </span>

        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.12em]

            text-purple-500
          "
        >
          {kicker}
        </p>
      </div>

      <h2
        className="
          mt-2.5

          text-[26px]
          font-black
          tracking-[-0.035em]

          text-[var(--hexa-text)]

          sm:text-[30px]
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-2

            text-[13px]
            leading-5

            text-[var(--hexa-muted)]
          "
        >
          {description}
        </p>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Empty Bundles                                                              */
/* ========================================================================== */

function EmptyBundles() {
  return (
    <div
      className="
        mt-6

        flex
        min-h-[260px]
        items-center
        justify-center

        rounded-[20px]

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]

        px-5
        py-10

        text-center
      "
    >
      <div
        className="
          max-w-sm
        "
      >
        <span
          className="
            mx-auto

            flex
            h-12
            w-12
            items-center
            justify-center

            rounded-2xl

            bg-purple-500/[0.07]

            text-purple-500
          "
        >
          <UIIcon
            icon={GiftIcon}
            size={23}
          />
        </span>

        <h3
          className="
            mt-4

            text-lg
            font-bold
            tracking-[-0.02em]

            text-[var(--hexa-text)]
          "
        >
          No bundles available
        </h3>

        <p
          className="
            mt-2

            text-[13px]
            leading-5

            text-[var(--hexa-muted)]
          "
        >
          New bundle offers will
          appear here when they
          become available.
        </p>

        <Link
          to="/products"
          className="
            group

            mt-5

            inline-flex
            items-center
            gap-2

            text-[12px]
            font-semibold

            text-purple-500
          "
        >
          <UIIcon
            icon={
              ShoppingBag01Icon
            }
            size={15}
          />

          Browse products

          <UIIcon
            icon={
              ArrowRight01Icon
            }
            size={14}
            className="
              transition-transform
              duration-150

              group-hover:translate-x-0.5
            "
          />
        </Link>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Loading Skeleton                                                           */
/* ========================================================================== */

function OffersSkeleton() {
  return (
    <div
      className="
        mt-12
      "
    >
      <div
        className="
          grid
          gap-4

          md:grid-cols-2
        "
      >
        {Array.from({
          length: 2,
        }).map(
          (_, index) => (
            <div
              key={index}
              className="
                min-h-[270px]

                animate-pulse

                rounded-[20px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]
              "
            />
          )
        )}
      </div>

      <div
        className="
          mt-14

          grid
          gap-4

          sm:grid-cols-2
          xl:grid-cols-3
        "
      >
        {Array.from({
          length: 3,
        }).map(
          (_, index) => (
            <div
              key={index}
              className="
                h-[410px]

                animate-pulse

                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]
              "
            />
          )
        )}
      </div>
    </div>
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
      strokeWidth={strokeWidth}
      className={className}
    />
  )
}