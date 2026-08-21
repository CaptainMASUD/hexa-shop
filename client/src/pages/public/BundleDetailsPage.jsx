import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  HugeiconsIcon,
} from '@hugeicons/react'

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  GiftIcon,
  MinusSignIcon,
  PlusSignIcon,
  ShoppingBag01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'

import {
  getBundle,
} from '../../api/features.api'

import {
  useCart,
} from '../../contexts/CartContext'

import {
  useCurrency,
} from '../../contexts/CurrencyContext'

import {
  useToast,
} from '../../contexts/ToastContext'

import EmptyState from '../../components/EmptyState'

/* ========================================================================== */
/* Bundle Details Page                                                        */
/* ========================================================================== */

export default function BundleDetailsPage() {
  const { slug } = useParams()

  const [
    bundle,
    setBundle,
  ] = useState(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    quantity,
    setQuantity,
  ] = useState(1)

  const { addBundle } =
    useCart()

  const { format } =
    useCurrency()

  const { notify } =
    useToast()

  const navigate =
    useNavigate()

  /* ====================================================================== */
  /* Load Bundle                                                            */
  /* ====================================================================== */

  useEffect(() => {
    let mounted = true

    setLoading(true)
    setQuantity(1)

    getBundle(slug)
      .then((data) => {
        if (mounted) {
          setBundle(data)
        }
      })
      .catch(() => {
        if (mounted) {
          setBundle(null)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [slug])

  /* ====================================================================== */
  /* Component Regular Total                                                */
  /* ====================================================================== */

  const componentRegularTotal =
    useMemo(() => {
      if (!bundle) {
        return 0
      }

      return (
        bundle.items || []
      ).reduce(
        (
          sum,
          item
        ) => {
          const product =
            item.product

          if (!product) {
            return sum
          }

          const variant =
            item.variantId
              ? product.variants?.find(
                  (entry) =>
                    String(
                      entry._id
                    ) ===
                    String(
                      item.variantId
                    )
                )
              : null

          const source =
            variant ||
            product

          const regular =
            Number(
              source?.regularPrice ||
                0
            )

          const itemQuantity =
            Number(
              item.quantity ||
                1
            )

          return (
            sum +
            regular *
              itemQuantity
          )
        },
        0
      )
    }, [bundle])

  /* ====================================================================== */
  /* Loading                                                                */
  /* ====================================================================== */

  if (loading) {
    return (
      <BundlePageSkeleton />
    )
  }

  /* ====================================================================== */
  /* Not Found                                                              */
  /* ====================================================================== */

  if (!bundle) {
    return (
      <main
        className="
          min-h-[calc(100vh-64px)]

          bg-[var(--hexa-bg)]
          text-[var(--hexa-text)]
        "
      >
        <div
          className="
            hexa-container
            py-16
          "
        >
          <EmptyState
            title="Bundle not found"
          />
        </div>
      </main>
    )
  }

  /* ====================================================================== */
  /* Pricing                                                                */
  /* ====================================================================== */

  const regularPrice =
    Number(
      bundle.regularPrice ||
        0
    )

  const salePrice =
    Number(
      bundle.salePrice ||
        0
    )

  const price =
    salePrice > 0 &&
    salePrice <
      regularPrice
      ? salePrice
      : regularPrice

  const hasDiscount =
    regularPrice > 0 &&
    price <
      regularPrice

  const listedSavings =
    Math.max(
      0,
      regularPrice -
        price
    )

  const componentSavings =
    componentRegularTotal >
    0
      ? Math.max(
          0,
          componentRegularTotal -
            price
        )
      : 0

  const savings =
    Math.max(
      listedSavings,
      componentSavings
    )

  const discountPercent =
    hasDiscount
      ? Math.round(
          ((regularPrice -
            price) /
            regularPrice) *
            100
        )
      : 0

  const bundleImage =
    bundle.bannerImage
      ?.url ||
    bundle.image?.url

  const itemCount =
    bundle.items?.length ||
    0

  /* ====================================================================== */
  /* Quantity                                                               */
  /* ====================================================================== */

  const decreaseQuantity =
    () => {
      setQuantity(
        (current) =>
          Math.max(
            1,
            current - 1
          )
      )
    }

  const increaseQuantity =
    () => {
      setQuantity(
        (current) =>
          Math.min(
            20,
            current + 1
          )
      )
    }

  /* ====================================================================== */
  /* Add Bundle                                                             */
  /* ====================================================================== */

  const add = () => {
    addBundle(
      bundle,
      quantity
    )

    notify(
      `${bundle.name} added to cart`
    )

    navigate('/cart')
  }

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
          lg:py-12
        "
      >
        {/* ================================================================ */}
        {/* Back                                                             */}
        {/* ================================================================ */}

        <Link
          to="/offers"
          className="
            group

            inline-flex
            items-center
            gap-2

            text-[13px]
            font-medium

            text-[var(--hexa-muted)]

            transition-colors
            duration-150

            hover:text-purple-500
          "
        >
          <UIIcon
            icon={
              ArrowLeft01Icon
            }
            size={16}
            strokeWidth={1.8}
            className="
              transition-transform
              duration-150

              group-hover:-translate-x-0.5
            "
          />

          Back to offers
        </Link>

        {/* ================================================================ */}
        {/* Main Bundle Layout                                               */}
        {/* ================================================================ */}

        <div
          className="
            mt-5

            grid
            items-start
            gap-6

            lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]
            lg:gap-8
          "
        >
          {/* ============================================================== */}
          {/* Bundle Artwork                                                 */}
          {/* ============================================================== */}

          <section
            className="
              group

              relative

              overflow-hidden

              rounded-[22px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]
            "
          >
            <div
              className="
                relative

                aspect-[16/10]

                overflow-hidden

                bg-[var(--hexa-bg-soft)]
              "
            >
              {bundleImage ? (
                <img
                  src={
                    bundleImage
                  }
                  alt={
                    bundle.name
                  }
                  className="
                    h-full
                    w-full

                    transform-gpu

                    object-cover
                    object-center

                    transition-transform
                    duration-500
                    ease-out

                    group-hover:scale-[1.015]
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
                    icon={
                      GiftIcon
                    }
                    size={72}
                    strokeWidth={1.3}
                  />
                </div>
              )}

              {/* Subtle image gradient */}

              {bundleImage && (
                <div
                  className="
                    pointer-events-none

                    absolute
                    inset-0

                    bg-gradient-to-t
                    from-black/25
                    via-transparent
                    to-transparent
                  "
                />
              )}

              {/* ========================================================= */}
              {/* Discount Badge Only                                      */}
              {/* ========================================================= */}

              {discountPercent >
                0 && (
                <div
                  className="
                    absolute
                    right-4
                    top-4
                  "
                >
                  <span
                    className="
                      rounded-full

                      bg-purple-600

                      px-3
                      py-1.5

                      text-[10px]
                      font-bold
                      text-white

                      shadow-[0_5px_16px_rgba(0,0,0,0.15)]
                    "
                  >
                    {
                      discountPercent
                    }
                    % OFF
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ============================================================== */}
          {/* Bundle Information                                             */}
          {/* ============================================================== */}

          <section
            className="
              flex
              min-w-0
              flex-col

              lg:min-h-full
              lg:justify-center
            "
          >
            {/* ============================================================ */}
            {/* Bundle Badge                                                 */}
            {/* ============================================================ */}

            <div
              className="
                inline-flex
                w-fit
                items-center
                gap-2

                rounded-full

                border
                border-purple-500/15

                bg-purple-500/[0.06]

                px-3
                py-1.5

                text-[11px]
                font-semibold

                text-purple-500
              "
            >
              <UIIcon
                icon={
                  GiftIcon
                }
                size={14}
                strokeWidth={1.8}
              />

              HEXA Bundle
            </div>

            {/* ============================================================ */}
            {/* Name                                                         */}
            {/* ============================================================ */}

            <h1
              className="
                mt-4

                text-[34px]
                font-black
                leading-[1.05]
                tracking-[-0.045em]

                text-[var(--hexa-text)]

                sm:text-[42px]
                lg:text-[46px]
              "
            >
              {bundle.name}
            </h1>

            {/* ============================================================ */}
            {/* Description                                                  */}
            {/* ============================================================ */}

            {(bundle.description ||
              bundle.shortDescription) && (
              <p
                className="
                  mt-4

                  max-w-2xl

                  text-[14px]
                  leading-7

                  text-[var(--hexa-muted)]
                "
              >
                {bundle.description ||
                  bundle.shortDescription}
              </p>
            )}

            {/* ============================================================ */}
            {/* Bundle Meta                                                  */}
            {/* ============================================================ */}

            <div
              className="
                mt-4

                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5

                  rounded-lg

                  border
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-card)]

                  px-2.5
                  py-1.5

                  text-[11px]
                  font-medium

                  text-[var(--hexa-muted)]
                "
              >
                <UIIcon
                  icon={
                    GiftIcon
                  }
                  size={13}
                />

                {itemCount}{' '}
                {itemCount === 1
                  ? 'product'
                  : 'products'}{' '}
                included
              </span>

              {savings >
                0 && (
                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5

                    rounded-lg

                    border
                    border-emerald-500/15

                    bg-emerald-500/[0.06]

                    px-2.5
                    py-1.5

                    text-[11px]
                    font-medium

                    text-emerald-500
                  "
                >
                  <UIIcon
                    icon={
                      Tick02Icon
                    }
                    size={13}
                    strokeWidth={2}
                  />

                  Bundle savings
                </span>
              )}
            </div>

            {/* ============================================================ */}
            {/* Pricing                                                      */}
            {/* ============================================================ */}

            <div
              className="
                mt-6

                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                p-5
              "
            >
              <div
                className="
                  flex
                  flex-wrap
                  items-end
                  justify-between
                  gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[11px]
                      font-medium

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
                      gap-2.5
                    "
                  >
                    <span
                      className="
                        text-[34px]
                        font-black
                        leading-none
                        tracking-[-0.04em]

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
                          text-[15px]

                          text-[var(--hexa-muted)]

                          line-through
                        "
                      >
                        {format(
                          regularPrice
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {discountPercent >
                  0 && (
                  <span
                    className="
                      rounded-full

                      bg-purple-500/[0.08]

                      px-3
                      py-1.5

                      text-[11px]
                      font-bold

                      text-purple-500
                    "
                  >
                    Save{' '}
                    {
                      discountPercent
                    }
                    %
                  </span>
                )}
              </div>

              {savings >
                0 && (
                <div
                  className="
                    mt-4

                    flex
                    items-center
                    gap-2

                    border-t
                    border-[var(--hexa-border)]

                    pt-4
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

                      rounded-full

                      bg-emerald-500/[0.08]

                      text-emerald-500
                    "
                  >
                    <UIIcon
                      icon={
                        Tick02Icon
                      }
                      size={14}
                      strokeWidth={2}
                    />
                  </span>

                  <p
                    className="
                      text-[12px]
                      font-medium

                      text-emerald-500
                    "
                  >
                    Save about{' '}
                    {format(
                      savings
                    )}{' '}
                    with this bundle
                  </p>
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* Purchase Controls                                            */}
            {/* ============================================================ */}

            <div
              className="
                mt-5

                flex
                flex-col
                gap-3

                sm:flex-row
                sm:items-center
              "
            >
              <QuantityStepper
                quantity={
                  quantity
                }
                onDecrease={
                  decreaseQuantity
                }
                onIncrease={
                  increaseQuantity
                }
              />

              <button
                type="button"
                onClick={add}
                className="
                  hexa-btn
                  group

                  !flex
                  !h-11
                  !flex-1
                  !items-center
                  !justify-center
                  !gap-2
                  !rounded-xl
                  !px-5
                  !py-0

                  transform-gpu

                  text-sm
                  font-semibold

                  transition-transform
                  duration-150
                  ease-out

                  hover:scale-[1.01]
                  active:scale-[0.985]
                "
              >
                <UIIcon
                  icon={
                    ShoppingBag01Icon
                  }
                  size={18}
                  strokeWidth={1.8}
                />

                Add bundle to cart

                <UIIcon
                  icon={
                    ArrowRight01Icon
                  }
                  size={15}
                  strokeWidth={1.9}
                  className="
                    transition-transform
                    duration-150

                    group-hover:translate-x-0.5
                  "
                />
              </button>
            </div>

            <p
              className="
                mt-3

                text-[11px]
                leading-5

                text-[var(--hexa-muted)]
              "
            >
              The bundle is added as one
              cart item. Included products
              are handled automatically
              during checkout.
            </p>
          </section>
        </div>

        {/* ================================================================ */}
        {/* Included Products                                                */}
        {/* ================================================================ */}

        <section
          className="
            mt-12
            sm:mt-14
          "
        >
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
                  items-center
                  justify-center

                  rounded-lg

                  bg-purple-500/[0.07]

                  text-purple-500
                "
              >
                <UIIcon
                  icon={
                    GiftIcon
                  }
                  size={14}
                  strokeWidth={1.8}
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
                Included products
              </p>
            </div>

            <h2
              className="
                mt-2.5

                text-[27px]
                font-black
                tracking-[-0.035em]

                text-[var(--hexa-text)]

                sm:text-[30px]
              "
            >
              Everything inside this
              bundle
            </h2>

            <p
              className="
                mt-2

                text-[13px]
                leading-5

                text-[var(--hexa-muted)]
              "
            >
              Review every product and
              selected plan included in
              this bundle.
            </p>
          </div>

          {/* ============================================================== */}
          {/* Included Product Cards                                         */}
          {/* ============================================================== */}

          <div
            className="
              mt-6

              grid
              gap-4

              md:grid-cols-2
            "
          >
            {(
              bundle.items ||
              []
            ).map(
              (item) => {
                const product =
                  item.product

                const variant =
                  item.variantId
                    ? product?.variants?.find(
                        (
                          entry
                        ) =>
                          String(
                            entry._id
                          ) ===
                          String(
                            item.variantId
                          )
                      )
                    : null

                const key =
                  item._id ||
                  `${product?._id}-${item.variantId || 'base'}`

                return (
                  <article
                    key={key}
                    className="
                      group

                      flex
                      gap-4

                      rounded-[18px]

                      border
                      border-[var(--hexa-border)]

                      bg-[var(--hexa-card)]

                      p-3.5

                      transition-[border-color]
                      duration-150

                      hover:border-purple-500/25

                      sm:p-4
                    "
                  >
                    {/* ================================================== */}
                    {/* Thumbnail                                         */}
                    {/* ================================================== */}

                    <div
                      className="
                        h-[92px]
                        w-[92px]
                        shrink-0

                        overflow-hidden

                        rounded-[14px]

                        bg-[var(--hexa-bg-soft)]

                        sm:h-24
                        sm:w-24
                      "
                    >
                      {product?.thumbnail
                        ?.url ? (
                        <img
                          src={
                            product
                              .thumbnail
                              .url
                          }
                          alt={
                            product
                              .thumbnail
                              ?.alt ||
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
                            duration-300
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
                            icon={
                              GiftIcon
                            }
                            size={28}
                            strokeWidth={
                              1.5
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* ================================================== */}
                    {/* Information                                       */}
                    {/* ================================================== */}

                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          justify-between
                          gap-3
                        "
                      >
                        <div
                          className="
                            min-w-0
                          "
                        >
                          <h3
                            className="
                              line-clamp-1

                              text-[14px]
                              font-semibold

                              text-[var(--hexa-text)]
                            "
                          >
                            {product?.name ||
                              'Product'}
                          </h3>

                          <p
                            className="
                              mt-1

                              text-[11px]
                              leading-5

                              text-[var(--hexa-muted)]
                            "
                          >
                            {variant?.name
                              ? `${variant.name} · `
                              : ''}
                            Quantity{' '}
                            {
                              item.quantity
                            }
                          </p>
                        </div>

                        <span
                          className="
                            flex
                            h-7
                            w-7
                            shrink-0
                            items-center
                            justify-center

                            rounded-full

                            bg-emerald-500/[0.08]

                            text-emerald-500
                          "
                          title="Included"
                        >
                          <UIIcon
                            icon={
                              Tick02Icon
                            }
                            size={14}
                            strokeWidth={
                              2
                            }
                          />
                        </span>
                      </div>

                      {product?.slug && (
                        <Link
                          to={`/product/${product.slug}`}
                          className="
                            group/link

                            mt-3

                            inline-flex
                            items-center
                            gap-1.5

                            text-[11px]
                            font-semibold

                            text-purple-500

                            transition-colors
                            duration-150

                            hover:text-purple-400
                          "
                        >
                          View product

                          <UIIcon
                            icon={
                              ArrowRight01Icon
                            }
                            size={13}
                            strokeWidth={
                              1.9
                            }
                            className="
                              transition-transform
                              duration-150

                              group-hover/link:translate-x-0.5
                            "
                          />
                        </Link>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

/* ========================================================================== */
/* Quantity Stepper                                                           */
/* ========================================================================== */

function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}) {
  const canDecrease =
    quantity > 1

  const canIncrease =
    quantity < 20

  return (
    <div
      className="
        flex
        h-11
        shrink-0
        items-center

        overflow-hidden

        rounded-xl

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]
      "
    >
      {/* Minus */}

      <button
        type="button"
        onClick={
          onDecrease
        }
        disabled={
          !canDecrease
        }
        aria-label="Decrease quantity"
        className="
          flex
          h-full
          w-11
          transform-gpu
          items-center
          justify-center

          text-[var(--hexa-muted)]

          transition-[transform,background-color,color]
          duration-150

          hover:bg-purple-500/[0.06]
          hover:text-purple-500

          active:scale-[0.88]

          disabled:pointer-events-none
          disabled:opacity-30
        "
      >
        <UIIcon
          icon={
            MinusSignIcon
          }
          size={16}
          strokeWidth={2}
        />
      </button>

      {/* Quantity */}

      <span
        className="
          flex
          h-full
          min-w-[44px]
          items-center
          justify-center

          border-x
          border-[var(--hexa-border)]

          px-2

          text-[13px]
          font-semibold
          tabular-nums

          text-[var(--hexa-text)]
        "
      >
        {quantity}
      </span>

      {/* Plus */}

      <button
        type="button"
        onClick={
          onIncrease
        }
        disabled={
          !canIncrease
        }
        aria-label="Increase quantity"
        className="
          flex
          h-full
          w-11
          transform-gpu
          items-center
          justify-center

          text-[var(--hexa-muted)]

          transition-[transform,background-color,color]
          duration-150

          hover:bg-purple-500/[0.06]
          hover:text-purple-500

          active:scale-[0.88]

          disabled:pointer-events-none
          disabled:opacity-30
        "
      >
        <UIIcon
          icon={
            PlusSignIcon
          }
          size={16}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

/* ========================================================================== */
/* Loading Skeleton                                                           */
/* ========================================================================== */

function BundlePageSkeleton() {
  return (
    <main
      className="
        min-h-screen

        bg-[var(--hexa-bg)]
      "
    >
      <div
        className="
          hexa-container

          py-8
          sm:py-10
          lg:py-12
        "
      >
        <div
          className="
            h-5
            w-32

            animate-pulse

            rounded-md

            bg-[var(--hexa-card)]
          "
        />

        <div
          className="
            mt-5

            grid
            gap-6

            lg:grid-cols-[1.05fr_.95fr]
            lg:gap-8
          "
        >
          <div
            className="
              aspect-[16/10]

              animate-pulse

              rounded-[22px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]
            "
          />

          <div
            className="
              space-y-4

              py-4
            "
          >
            <div
              className="
                h-7
                w-28

                animate-pulse

                rounded-full

                bg-[var(--hexa-card)]
              "
            />

            <div
              className="
                h-12
                w-3/4

                animate-pulse

                rounded-xl

                bg-[var(--hexa-card)]
              "
            />

            <div
              className="
                h-20
                w-full

                animate-pulse

                rounded-xl

                bg-[var(--hexa-card)]
              "
            />

            <div
              className="
                h-32
                w-full

                animate-pulse

                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]
              "
            />
          </div>
        </div>

        <div
          className="
            mt-14

            grid
            gap-4

            md:grid-cols-2
          "
        >
          {Array.from({
            length: 4,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="
                  h-32

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
    </main>
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