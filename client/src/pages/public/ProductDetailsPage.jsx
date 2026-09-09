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
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  CheckmarkCircle01Icon,
  FlashIcon,
  HexagonIcon,
  LockPasswordIcon,
  MinusSignIcon,
  Notification01Icon,
  PackageIcon,
  PlusSignIcon,
  Shield01Icon,
  ShoppingCart01Icon,
  StarIcon,
  Tick02Icon,
  UserCircleIcon,
} from '@hugeicons/core-free-icons'

import {
  getProduct,
  getProducts,
  subscribeRestockAlert,
} from '../../api/catalog.api'

import ProductCard, {
  effectivePrice,
  totalStock,
} from '../../components/ProductCard'

import PageLoader from '../../components/PageLoader'
import Modal from '../../components/Modal'

import {
  useCart,
} from '../../contexts/CartContext'

import {
  useToast,
} from '../../contexts/ToastContext'

import {
  useAuth,
} from '../../contexts/AuthContext'

import {
  useCurrency,
} from '../../contexts/CurrencyContext'

import DynamicCustomerForm from '../../components/DynamicCustomerForm'

import usePageMeta from '../../hooks/usePageMeta'

import {
  checkCanReview,
  getProductReviews,
  recordRecentlyViewed,
  saveReview,
} from '../../api/features.api'

import {
  apiErrorMessage,
} from '../../api/client'

/* ========================================================================== */
/* Product Details                                                            */
/* ========================================================================== */

export default function ProductDetailsPage() {
  const { slug } = useParams()

  const [product, setProduct] =
    useState(null)

  const [related, setRelated] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [variantId, setVariantId] =
    useState('')

  const [qty, setQty] =
    useState(1)

  const [customerInputs, setCustomerInputs] = useState({})
  const [inputErrors, setInputErrors] = useState({})

  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockEmail, setRestockEmail] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)
  const [restockSuccess, setRestockSuccess] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  const { addItem } = useCart()
  const { notify } = useToast()
  const { user } = useAuth()
  const { format } = useCurrency()

  const navigate = useNavigate()

  /* ====================================================================== */
  /* Load Product                                                           */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    setLoading(true)

    getProduct(slug)
      .then((item) => {
        if (!active) {
          return null
        }

        setProduct(item)

        if (user) {
          recordRecentlyViewed(
            item._id
          ).catch(() => {})
        } else if (item?._id) {
          try {
            const guestViews = JSON.parse(sessionStorage.getItem('hexa_guest_views') || '[]')
            const updated = [item._id, ...guestViews.filter((id) => id !== item._id)].slice(0, 10)
            sessionStorage.setItem('hexa_guest_views', JSON.stringify(updated))
          } catch {}
        }

        const firstVariant =
          item.variants?.find(
            (variant) =>
              variant.active
          )

        setVariantId(
          firstVariant?._id ||
            ''
        )

        setQty(1)

        if (
          item.customFields
            ?.length
        ) {
          const initial = {}

          for (
            const field of
            item.customFields
          ) {
            if (
              field.type ===
                'select' &&
              field.options?.length
            ) {
              initial[
                field.name
              ] =
                field.options[0]
            } else {
              initial[
                field.name
              ] = ''
            }
          }

          setCustomerInputs(
            initial
          )
        } else {
          setCustomerInputs({})
        }

        return getProducts({
          category:
            item.category
              ?.slug,
          limit: 4,
        })
      })
      .then((response) => {
        if (
          !active ||
          !response
        ) {
          return
        }

        setRelated(
          (
            response.data ||
            []
          )
            .filter(
              (item) =>
                item.slug !==
                slug
            )
            .slice(0, 3)
        )
      })
      .catch(() => {
        if (!active) {
          return
        }

        setProduct(null)
        setRelated([])
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [
    slug,
    user,
  ])

  /* ====================================================================== */
  /* Selected Variant                                                       */
  /* ====================================================================== */

  const variant =
    useMemo(
      () =>
        product?.variants?.find(
          (item) =>
            item._id ===
            variantId
        ) || null,
      [
        product,
        variantId,
      ]
    )

  /* ====================================================================== */
  /* Page Metadata                                                          */
  /* ====================================================================== */

  const currentStock = product
    ? (product.allowUnlimitedStock
        ? 9999
        : (variant ? Number(variant.stock || 0) : totalStock(product)))
    : 0

  const isOutOfStock = currentStock <= 0

  const jsonLd = useMemo(() => {
    if (!product) return null
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.shortDescription || product.description || 'Digital product',
      image: [product.thumbnail?.url, product.bannerImage?.url].filter(Boolean),
      brand: { '@type': 'Brand', name: product.brand || 'HEXA' },
      sku: variant?.sku || product.slug,
      offers: {
        '@type': 'Offer',
        url: typeof window !== 'undefined' ? window.location.href : '',
        priceCurrency: 'BDT',
        price: effectivePrice(variant || product),
        availability: !isOutOfStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    }
    if (product.ratingAverage > 0) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.ratingAverage,
        reviewCount: product.reviewCount || 1,
      }
    }
    if (product.faqs?.length) {
      schema.mainEntity = product.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      }))
    }
    return schema
  }, [product, variant, isOutOfStock])

  usePageMeta(
    product ? `${product.name} — HEXA` : 'Product — HEXA',
    product?.shortDescription || 'View product pricing, plans and secure digital delivery information on HEXA.',
    {
      image: product?.thumbnail?.url || product?.bannerImage?.url,
      type: 'product',
      price: effectivePrice(variant || product),
      currency: 'BDT',
      jsonLd,
    }
  )

  const handleRestockSubmit = async (e) => {
    e.preventDefault()
    if (!restockEmail || !restockEmail.includes('@')) {
      notify('Please enter a valid email address', 'error')
      return
    }
    setRestockLoading(true)
    try {
      await subscribeRestockAlert(product._id, {
        email: restockEmail,
        variantId: variant?._id || null,
      })
      setRestockSuccess(true)
      notify('Subscribed! We will email you when this item is back in stock.')
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setRestockLoading(false)
    }
  }

  /* ====================================================================== */
  /* Loading                                                                */
  /* ====================================================================== */

  if (loading) {
    return <PageLoader />
  }

  if (!product) {
    return (
      <main
        className="
          hexa-container
          py-16
        "
      >
        <p
          className="
            text-sm
            text-[var(--hexa-muted)]
          "
        >
          Product not found.
        </p>
      </main>
    )
  }

  /* ====================================================================== */
  /* Derived Product Data                                                   */
  /* ====================================================================== */

  const activeVariants =
    (
      product.variants ||
      []
    ).filter(
      (item) =>
        item.active
    )

  const priceSource =
    variant || product

  const price =
    effectivePrice(
      priceSource
    )

  const regular =
    Number(
      priceSource
        .regularPrice || 0
    )

  /*
   * Stock is deliberately kept internal.
   * It is used only for purchase validation
   * and quantity limits.
   */
  const stock = currentStock

  const bannerUrl =
    product.bannerImage?.url ||
    product.galleryImages?.[0]
      ?.url ||
    product.thumbnail?.url

  const profileImage =
    product.thumbnail?.url ||
    product.galleryImages?.[0]
      ?.url

  const heroDescription =
    product.shortDescription ||
    (
      product.productType ===
      'game'
        ? 'Digital gaming service delivered after payment verification.'
        : 'Digital service delivered after payment verification.'
    )

  const maxQuantity =
    Math.max(
      1,
      Math.min(
        20,
        Number(stock || 0)
      )
    )

  const canDecrease =
    qty > 1

  const canIncrease =
    stock > 0 &&
    qty < maxQuantity

  /* ====================================================================== */
  /* Quantity                                                               */
  /* ====================================================================== */

  const decreaseQty = () => {
    setQty((current) =>
      Math.max(
        1,
        current - 1
      )
    )
  }

  const increaseQty = () => {
    setQty((current) =>
      Math.min(
        maxQuantity,
        current + 1
      )
    )
  }

  /* ====================================================================== */
  /* Input Validation                                                       */
  /* ====================================================================== */

  const validateInputs = () => {
    if (!product.customFields?.length) return true
    const errors = {}

    for (const field of product.customFields) {
      const val = customerInputs[field.name]
      const strVal = String(val ?? '').trim()

      if (field.required) {
        if (field.type === 'checkbox' && Array.isArray(val) && val.length === 0) {
          errors[field.name] = `${field.label} is required`
          continue
        }
        if (field.type === 'toggle' && !val) {
          errors[field.name] = `${field.label} is required`
          continue
        }
        if (!strVal) {
          errors[field.name] = `${field.label} is required`
          continue
        }
      }

      if (!strVal) continue

      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
        errors[field.name] = `Please enter a valid email for ${field.label}`
      }
      if (field.type === 'number') {
        const num = Number(strVal)
        if (Number.isNaN(num)) errors[field.name] = `${field.label} must be a valid number`
        else if (field.validation?.min !== undefined && num < field.validation.min) errors[field.name] = `${field.label} must be at least ${field.validation.min}`
        else if (field.validation?.max !== undefined && num > field.validation.max) errors[field.name] = `${field.label} must be at most ${field.validation.max}`
      }
      if (field.validation?.minLength && strVal.length < field.validation.minLength) {
        errors[field.name] = `${field.label} must be at least ${field.validation.minLength} characters`
      }
      if (field.validation?.maxLength && strVal.length > field.validation.maxLength) {
        errors[field.name] = `${field.label} must be at most ${field.validation.maxLength} characters`
      }
      if (field.validation?.regex) {
        try {
          const reg = new RegExp(field.validation.regex)
          if (!reg.test(strVal)) {
            errors[field.name] = field.validation.customErrorMessage || `Invalid format for ${field.label}`
          }
        } catch {
          // ignore bad admin regex
        }
      }
    }

    setInputErrors(errors)
    if (Object.keys(errors).length > 0) {
      notify(Object.values(errors)[0], 'error')
      return false
    }
    return true
  }

  /* ====================================================================== */
  /* Add to Cart                                                            */
  /* ====================================================================== */

  const add = () => {
    if (
      !validateInputs()
    ) {
      return
    }

    if (
      stock < qty
    ) {
      notify(
        'This product is currently unavailable.',
        'error'
      )

      return
    }

    addItem(
      product,
      variant,
      qty,
      customerInputs
    )

    notify(
      `${product.name} added to cart`
    )
  }

  /* ====================================================================== */
  /* Buy Now                                                                */
  /* ====================================================================== */

  const buy = () => {
    if (
      !validateInputs()
    ) {
      return
    }

    if (
      stock < qty
    ) {
      notify(
        'This product is currently unavailable.',
        'error'
      )

      return
    }

    addItem(
      product,
      variant,
      qty,
      customerInputs
    )

    navigate('/checkout')
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
        "
      >
        {/* ================================================================ */}
        {/* Back                                                             */}
        {/* ================================================================ */}

        <Link
          to="/products"
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

          Back to marketplace
        </Link>

        {/* ================================================================ */}
        {/* Product Hero                                                     */}
        {/* ================================================================ */}

        <section
          className="
            mt-5

            overflow-hidden

            rounded-[22px]

            border
            border-[var(--hexa-border)]

            bg-[var(--hexa-card)]
          "
        >
          {/* ============================================================== */}
          {/* Banner                                                         */}
          {/* ============================================================== */}

          <div
            className="
              relative

              h-[190px]
              overflow-hidden

              bg-[var(--hexa-bg-soft)]

              sm:h-[250px]
              lg:h-[290px]
            "
          >
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt={`${product.name} banner`}
                className="
                  h-full
                  w-full

                  object-cover
                  object-center
                "
              />
            ) : (
              <div
                className="
                  flex
                  h-full
                  items-center
                  justify-center

                  text-purple-500/25
                "
              >
                <UIIcon
                  icon={
                    HexagonIcon
                  }
                  size={90}
                  strokeWidth={
                    1.1
                  }
                />
              </div>
            )}

            <div
              className="
                pointer-events-none
                absolute
                inset-0

                bg-gradient-to-t
                from-black/20
                via-transparent
                to-transparent
              "
            />
          </div>

          {/* ============================================================== */}
          {/* Identity                                                       */}
          {/* ============================================================== */}

          <div
            className="
              relative

              px-5
              pb-6
              pt-[70px]

              text-center

              sm:px-7
              sm:pb-7
              sm:pt-5
              sm:text-left
            "
          >
            {/* ============================================================ */}
            {/* Circular Product Image                                      */}
            {/* ============================================================ */}

            <div
              className="
                absolute

                -top-[56px]
                left-1/2

                h-[112px]
                w-[112px]

                -translate-x-1/2

                overflow-hidden

                rounded-full

                border-[5px]
                border-[var(--hexa-card)]

                bg-[var(--hexa-bg-soft)]

                shadow-[0_10px_24px_rgba(0,0,0,0.13)]

                sm:left-7
                sm:-top-[58px]
                sm:h-[116px]
                sm:w-[116px]
                sm:translate-x-0
              "
            >
              {profileImage ? (
                <img
                  src={
                    profileImage
                  }
                  alt={
                    product
                      .thumbnail
                      ?.alt ||
                    product.name
                  }
                  className="
                    h-full
                    w-full

                    object-cover
                    object-center
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
                      HexagonIcon
                    }
                    size={46}
                    strokeWidth={
                      1.2
                    }
                  />
                </div>
              )}
            </div>

            {/* ============================================================ */}
            {/* Product Content                                             */}
            {/* ============================================================ */}

            <div
              className="
                sm:ml-[140px]
              "
            >
              {/* ========================================================== */}
              {/* Name + Category                                           */}
              {/* ========================================================== */}

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-center

                  gap-x-3
                  gap-y-2

                  sm:justify-start
                "
              >
                <h1
                  className="
                    text-[29px]
                    font-black
                    leading-[1.06]
                    tracking-[-0.038em]

                    text-[var(--hexa-text)]

                    sm:text-[35px]
                    lg:text-[38px]
                  "
                >
                  {product.name}
                </h1>

                <span
                  className="
                    inline-flex
                    shrink-0
                    items-center

                    rounded-full

                    border
                    border-purple-500/20

                    bg-purple-500/[0.06]

                    px-3
                    py-1

                    text-[11px]
                    font-medium
                    leading-none

                    text-purple-500
                  "
                >
                  {product.category
                    ?.name ||
                    product.productType}
                </span>
              </div>

              {/* ========================================================== */}
              {/* Description                                               */}
              {/* ========================================================== */}

              <p
                className="
                  mt-3

                  max-w-3xl

                  text-sm
                  font-normal
                  leading-6

                  text-[var(--hexa-muted)]
                "
              >
                {heroDescription}
              </p>

              {/* ========================================================== */}
              {/* Rating                                                    */}
              {/* ========================================================== */}

              <div
                className="
                  mt-3

                  flex
                  items-center
                  justify-center

                  sm:justify-start
                "
              >
                {product.reviewCount >
                0 ? (
                  <div
                    className="
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    <div
                      className="
                        inline-flex
                        items-center
                        gap-1
                      "
                    >
                      <UIIcon
                        icon={
                          StarIcon
                        }
                        size={15}
                        strokeWidth={
                          1.9
                        }
                        className="
                          text-amber-500
                        "
                      />

                      <span
                        className="
                          text-[13px]
                          font-semibold

                          text-[var(--hexa-text)]
                        "
                      >
                        {Number(
                          product.ratingAverage ||
                            0
                        ).toFixed(
                          1
                        )}
                      </span>
                    </div>

                    <span
                      className="
                        h-1
                        w-1

                        rounded-full

                        bg-[var(--hexa-muted)]
                        opacity-50
                      "
                    />

                    <span
                      className="
                        text-[12px]

                        text-[var(--hexa-muted)]
                      "
                    >
                      {
                        product.reviewCount
                      }{' '}
                      {product.reviewCount ===
                      1
                        ? 'review'
                        : 'reviews'}
                    </span>
                  </div>
                ) : (
                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1.5

                      text-[12px]

                      text-[var(--hexa-muted)]
                    "
                  >
                    <UIIcon
                      icon={
                        StarIcon
                      }
                      size={14}
                      className="
                        text-amber-500/70
                      "
                    />

                    No reviews yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/* Purchase Area                                                    */}
        {/* ================================================================ */}

        <div
          className="
            mt-7

            grid
            items-start
            gap-6

            lg:grid-cols-[minmax(0,1fr)_350px]
          "
        >
          {/* ============================================================== */}
          {/* Configuration                                                 */}
          {/* ============================================================== */}

          <div
            className="
              min-w-0
              space-y-6
            "
          >
            {/* ============================================================ */}
            {/* Required Information                                        */}
            {/* ============================================================ */}

            {product.customFields?.length > 0 && (
              <section className="rounded-[18px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 sm:p-6">
                <SectionTitle
                  icon={UserCircleIcon}
                  number="1"
                  title={
                    product.productType === 'game' || product.productType === 'game_topup'
                      ? 'Player & Account Information'
                      : 'Required Information'
                  }
                />

                <div className="mt-5">
                  <DynamicCustomerForm
                    fields={product.customFields}
                    values={customerInputs}
                    onChange={(newInputs) => {
                      setCustomerInputs(newInputs)
                      setInputErrors({})
                    }}
                    errors={inputErrors}
                  />
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* Plans / Packages                                             */}
            {/* ============================================================ */}

            <section
              className="
                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                p-5
                sm:p-6
              "
            >
              <SectionTitle
                icon={
                  PackageIcon
                }
                number={
                  product.customFields
                    ?.length
                    ? '2'
                    : null
                }
                title={
                  product.productType ===
                  'game'
                    ? 'Select recharge package'
                    : activeVariants.length
                    ? 'Choose a plan'
                    : 'Product'
                }
              />

              {activeVariants.length >
              0 ? (
                <div
                  className="
                    mt-5

                    grid
                    gap-3

                    sm:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {activeVariants.map(
                    (
                      item
                    ) => {
                      const reg =
                        Number(
                          item.regularPrice ||
                            0
                        )

                      const sale =
                        effectivePrice(
                          item
                        )

                      const discount =
                        reg >
                        sale
                          ? Math.round(
                              ((reg -
                                sale) /
                                reg) *
                                100
                            )
                          : 0

                      const selected =
                        variantId ===
                        item._id

                      return (
                        <button
                          key={
                            item._id
                          }
                          type="button"
                          aria-pressed={
                            selected
                          }
                          onClick={() => {
                            setVariantId(
                              item._id
                            )

                            setQty(1)
                          }}
                          className={`
                            relative

                            min-h-[132px]

                            transform-gpu

                            rounded-[16px]

                            border

                            p-4

                            text-left

                            transition-[transform,border-color,background-color,box-shadow]
                            duration-150
                            ease-out

                            hover:scale-[1.008]
                            active:scale-[0.985]

                            ${
                              selected
                                ? 'border-purple-500 bg-purple-500/[0.055] shadow-[0_0_0_2px_rgba(168,85,247,.09)]'
                                : 'border-[var(--hexa-border)] bg-[var(--hexa-bg)] hover:border-purple-500/30'
                            }
                          `}
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
                              <p
                                className="
                                  text-sm
                                  font-semibold
                                  leading-5

                                  text-[var(--hexa-text)]
                                "
                              >
                                {
                                  item.name
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-[var(--hexa-muted)]">
                                  {item.duration || 'Instant delivery'}
                                </span>
                                {item.region && (
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                                    {item.region}
                                  </span>
                                )}
                                {item.platform && (
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">
                                    {item.platform}
                                  </span>
                                )}
                              </div>
                            </div>

                            {selected && (
                              <span
                                className="
                                  flex
                                  h-6
                                  w-6
                                  shrink-0
                                  items-center
                                  justify-center

                                  rounded-full

                                  bg-purple-600
                                  text-white
                                "
                              >
                                <UIIcon
                                  icon={
                                    Tick02Icon
                                  }
                                  size={
                                    13
                                  }
                                  strokeWidth={
                                    2
                                  }
                                />
                              </span>
                            )}
                          </div>

                          <div
                            className="
                              mt-5

                              flex
                              items-end
                              justify-between
                              gap-2
                            "
                          >
                            <div
                              className="
                                flex
                                flex-wrap
                                items-baseline
                                gap-2
                              "
                            >
                              <span
                                className="
                                  text-[17px]
                                  font-bold

                                  text-purple-500
                                "
                              >
                                {format(
                                  sale
                                )}
                              </span>

                              {reg >
                                sale && (
                                <span
                                  className="
                                    text-xs

                                    text-[var(--hexa-muted)]

                                    line-through
                                  "
                                >
                                  {format(
                                    reg
                                  )}
                                </span>
                              )}
                            </div>

                            {discount >
                              0 && (
                              <span
                                className="
                                  shrink-0

                                  rounded-full

                                  bg-purple-500/[0.08]

                                  px-2
                                  py-1

                                  text-[9px]
                                  font-bold

                                  text-purple-500
                                "
                              >
                                {
                                  discount
                                }
                                % OFF
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    }
                  )}
                </div>
              ) : (
                <div
                  className="
                    mt-5

                    flex
                    items-center
                    justify-between
                    gap-4

                    rounded-[16px]

                    border
                    border-purple-500/30

                    bg-purple-500/[0.045]

                    p-4
                  "
                >
                  <div
                    className="
                      min-w-0
                    "
                  >
                    <p
                      className="
                        truncate

                        text-sm
                        font-semibold

                        text-[var(--hexa-text)]
                      "
                    >
                      {product.name}
                    </p>

                    <p
                      className="
                        mt-1

                        text-[11px]

                        text-[var(--hexa-muted)]
                      "
                    >
                      Standard product
                    </p>
                  </div>

                  <span
                    className="
                      shrink-0

                      text-lg
                      font-bold

                      text-purple-500
                    "
                  >
                    {format(
                      price
                    )}
                  </span>
                </div>
              )}
            </section>
          </div>

          {/* ============================================================== */}
          {/* Order Summary                                                  */}
          {/* ============================================================== */}

          <aside
            className="
              rounded-[18px]

              border
              border-[var(--hexa-border)]

              bg-[var(--hexa-card)]

              p-5

              lg:sticky
              lg:top-24
            "
          >
            <p
              className="
                text-[11px]
                font-bold
                uppercase
                tracking-[0.12em]

                text-purple-500
              "
            >
              Order summary
            </p>

            {variant && (
              <div
                className="
                  mt-3

                  rounded-xl

                  border
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-bg-soft)]

                  p-3
                "
              >
                <p
                  className="
                    text-[11px]

                    text-[var(--hexa-muted)]
                  "
                >
                  Selected plan
                </p>

                <p
                  className="
                    mt-1

                    text-sm
                    font-semibold

                    text-[var(--hexa-text)]
                  "
                >
                  {variant.name}
                </p>

                {variant.duration && (
                  <p
                    className="
                      mt-0.5

                      text-[11px]

                      text-[var(--hexa-muted)]
                    "
                  >
                    {
                      variant.duration
                    }
                  </p>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* Price                                                        */}
            {/* ============================================================ */}

            <div
              className="
                mt-5
              "
            >
              <p
                className="
                  text-xs

                  text-[var(--hexa-muted)]
                "
              >
                Price
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
                    text-[30px]
                    font-black
                    tracking-[-0.035em]

                    text-[var(--hexa-text)]
                  "
                >
                  {format(
                    price
                  )}
                </span>

                {regular >
                  price && (
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
            </div>

            {/* ============================================================ */}
            {/* Quantity Stepper                                             */}
            {/* ============================================================ */}

            <div
              className="
                mt-5
              "
            >
              <p
                className="
                  mb-2

                  text-[11px]
                  font-medium

                  text-[var(--hexa-muted)]
                "
              >
                Quantity
              </p>

              <div
                className="
                  flex
                  h-11
                  w-full
                  items-center

                  overflow-hidden

                  rounded-xl

                  border
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-bg)]
                "
              >
                {/* Minus */}

                <button
                  type="button"
                  onClick={
                    decreaseQty
                  }
                  disabled={
                    !canDecrease
                  }
                  aria-label="Decrease quantity"
                  className="
                    flex
                    h-full
                    w-12
                    shrink-0
                    transform-gpu
                    items-center
                    justify-center

                    border-r
                    border-[var(--hexa-border)]

                    text-[var(--hexa-muted)]

                    transition-[transform,background-color,color]
                    duration-150
                    ease-out

                    hover:bg-purple-500/[0.06]
                    hover:text-purple-500

                    active:scale-[0.90]

                    disabled:pointer-events-none
                    disabled:opacity-30
                  "
                >
                  <UIIcon
                    icon={
                      MinusSignIcon
                    }
                    size={17}
                    strokeWidth={
                      2
                    }
                  />
                </button>

                {/* Current Quantity */}

                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    items-center
                    justify-center
                  "
                >
                  <span
                    key={qty}
                    className="
                      min-w-8

                      text-center
                      text-[14px]
                      font-semibold
                      tabular-nums

                      text-[var(--hexa-text)]
                    "
                  >
                    {qty}
                  </span>
                </div>

                {/* Plus */}

                <button
                  type="button"
                  onClick={
                    increaseQty
                  }
                  disabled={
                    !canIncrease
                  }
                  aria-label="Increase quantity"
                  className="
                    flex
                    h-full
                    w-12
                    shrink-0
                    transform-gpu
                    items-center
                    justify-center

                    border-l
                    border-[var(--hexa-border)]

                    text-[var(--hexa-muted)]

                    transition-[transform,background-color,color]
                    duration-150
                    ease-out

                    hover:bg-purple-500/[0.06]
                    hover:text-purple-500

                    active:scale-[0.90]

                    disabled:pointer-events-none
                    disabled:opacity-30
                  "
                >
                  <UIIcon
                    icon={
                      PlusSignIcon
                    }
                    size={17}
                    strokeWidth={
                      2
                    }
                  />
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* Actions                                                      */}
            {/* ============================================================ */}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {stock <= 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setRestockSuccess(false)
                    setShowRestockModal(true)
                  }}
                  className="col-span-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm font-bold text-amber-400 transition hover:bg-amber-500/20 active:scale-[0.99]"
                >
                  <HugeiconsIcon icon={Notification01Icon} size={18} />
                  Notify Me When Available
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={add}
                    disabled={stock < qty}
                    className="hexa-btn-secondary !flex !h-11 !w-full !items-center !justify-center !gap-2 !rounded-xl !py-0 text-sm font-semibold transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <UIIcon icon={ShoppingCart01Icon} size={18} strokeWidth={1.8} />
                    Add to cart
                  </button>

                  <button
                    type="button"
                    onClick={buy}
                    disabled={stock < qty}
                    className="hexa-btn !flex !h-11 !w-full !items-center !justify-center !gap-2 !rounded-xl !py-0 transform-gpu text-sm font-semibold transition-transform duration-150 ease-out hover:scale-[1.01] active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40"
                  >
                    <UIIcon icon={FlashIcon} size={18} strokeWidth={1.8} />
                    Buy now
                  </button>
                </>
              )}
            </div>

            {/* ============================================================ */}
            {/* Purchase Notes                                               */}
            {/* ============================================================ */}

            <div
              className="
                mt-5

                space-y-3

                border-t
                border-[var(--hexa-border)]

                pt-5
              "
            >
              {[
                'Payment verified before fulfillment.',
                'Price recalculated securely at checkout.',
                'Digital delivery stays inside your account.',
              ].map(
                (text) => (
                  <div
                    key={text}
                    className="
                      flex
                      items-start
                      gap-2.5

                      text-[11px]
                      leading-5

                      text-[var(--hexa-muted)]
                    "
                  >
                    <span
                      className="
                        mt-0.5

                        flex
                        h-5
                        w-5
                        shrink-0
                        items-center
                        justify-center

                        rounded-full

                        bg-purple-500/[0.07]

                        text-purple-500
                      "
                    >
                      <UIIcon
                        icon={
                          Tick02Icon
                        }
                        size={12}
                        strokeWidth={
                          2
                        }
                      />
                    </span>

                    <span>
                      {text}
                    </span>
                  </div>
                )
              )}
            </div>
          </aside>
        </div>

        {/* ================================================================ */}
        {/* Product Information                                              */}
        {/* ================================================================ */}

        <div
          className="
            mt-10

            grid
            gap-6

            lg:grid-cols-[1fr_320px]
          "
        >
          <section>
            <p
              className="
                text-[11px]
                font-bold
                uppercase
                tracking-[0.12em]

                text-purple-500
              "
            >
              Information
            </p>

            <h2
              className="
                mt-2

                text-2xl
                font-black
                tracking-[-0.03em]

                text-[var(--hexa-text)]
              "
            >
              Product details
            </h2>

            <p
              className="
                mt-4

                whitespace-pre-line

                text-sm
                leading-7

                text-[var(--hexa-muted)]
              "
            >
              {product.description ||
                heroDescription}
            </p>

            {Object.keys(
              product.details ||
                {}
            ).length >
              0 && (
              <dl
                className="
                  mt-6

                  grid
                  gap-3

                  sm:grid-cols-2
                "
              >
                {Object.entries(
                  product.details
                ).map(
                  ([
                    key,
                    value,
                  ]) => (
                    <div
                      key={key}
                      className="
                        rounded-[14px]

                        border
                        border-[var(--hexa-border)]

                        bg-[var(--hexa-card)]

                        p-4
                      "
                    >
                      <dt
                        className="
                          text-[10px]
                          font-medium
                          uppercase
                          tracking-[0.1em]

                          text-[var(--hexa-muted)]
                        "
                      >
                        {key.replace(
                          /([A-Z])/g,
                          ' $1'
                        )}
                      </dt>

                      <dd
                        className="
                          mt-1.5

                          text-sm
                          font-medium

                          text-[var(--hexa-text)]
                        "
                      >
                        {String(
                          value
                        )}
                      </dd>
                    </div>
                  )
                )}
              </dl>
            )}
          </section>

          {/* ============================================================== */}
          {/* Delivery                                                       */}
          {/* ============================================================== */}

          <aside
            className="
              h-fit

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
                items-center
                gap-2.5
              "
            >
              <span
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center

                  rounded-lg

                  bg-purple-500/[0.07]

                  text-purple-500
                "
              >
                <UIIcon
                  icon={
                    Shield01Icon
                  }
                  size={17}
                />
              </span>

              <h3
                className="
                  text-sm
                  font-semibold

                  text-[var(--hexa-text)]
                "
              >
                Secure delivery
              </h3>
            </div>

            {product.productType && (
              <InfoRow
                label="Product"
                value={
                  product.productType
                }
              />
            )}

            <p
              className="
                mt-4

                text-[11px]
                leading-5

                text-[var(--hexa-muted)]
              "
            >
              After payment verification and
              fulfillment, protected
              credentials, keys or delivery
              information become available
              inside the relevant order in
              your account.
            </p>
          </aside>
        </div>

        {/* ================================================================ */}
        {/* Step-by-Step Redemption Guide                                    */}
        {/* ================================================================ */}
        {product.guide?.steps?.length > 0 && (
          <section className="mt-12 rounded-[20px] border border-purple-500/20 bg-purple-500/[0.03] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--hexa-border)] pb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-purple-400">Step-by-Step Instructions</p>
                <h2 className="mt-1 text-xl font-bold text-[var(--hexa-text)]">{product.guide.title || 'How to Redeem & Use this Product'}</h2>
              </div>
              {product.guide.videoUrl && (
                <a
                  href={product.guide.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                  Watch Video Guide
                </a>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {product.guide.steps.map((step, idx) => (
                <div key={idx} className="relative rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-xs font-black text-purple-400">
                      {step.stepNumber || idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-[var(--hexa-text)]">{step.title}</h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[var(--hexa-muted)] whitespace-pre-line">{step.description}</p>
                  {step.imageUrl && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-[var(--hexa-border)]">
                      <img src={step.imageUrl} alt={step.title} className="h-36 w-full object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* Product FAQs Accordion                                           */}
        {/* ================================================================ */}
        {product.faqs?.length > 0 && (
          <section className="mt-12 rounded-[20px] border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-purple-400">Got Questions?</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--hexa-text)]">Frequently Asked Questions</h2>
            <div className="mt-6 space-y-3">
              {product.faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx
                return (
                  <div key={idx} className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] overflow-hidden transition">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left font-semibold text-sm text-[var(--hexa-text)] hover:text-purple-400 transition"
                    >
                      <span>{faq.question}</span>
                      <HugeiconsIcon icon={isOpen ? ArrowUp01Icon : ArrowDown01Icon} size={16} className="shrink-0 text-[var(--hexa-muted)]" />
                    </button>
                    {isOpen && (
                      <div className="border-t border-[var(--hexa-border)] p-4 text-xs leading-relaxed text-[var(--hexa-muted)] whitespace-pre-line bg-[var(--hexa-card)]/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* Restock Notification Modal                                       */}
        {/* ================================================================ */}
        <Modal
          open={showRestockModal}
          onClose={() => setShowRestockModal(false)}
          title="Stock Alert Notification"
          maxWidth="max-w-md"
        >
          {restockSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={28} />
              </div>
              <h3 className="font-bold text-base text-[var(--hexa-text)]">You're on the waitlist!</h3>
              <p className="text-xs text-[var(--hexa-muted)] leading-relaxed">
                We'll automatically send an email to <span className="font-semibold text-purple-400">{restockEmail}</span> as soon as this item is restocked.
              </p>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                className="hexa-btn !w-full !mt-4"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/20">
                  <img
                    src={product.thumbnail?.url || '/assets/placeholder.png'}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-xs text-[var(--hexa-text)] truncate">{product.name}</p>
                  {variant && <p className="text-[11px] text-purple-400 truncate">Plan: {variant.name}</p>}
                </div>
              </div>

              <p className="text-xs text-[var(--hexa-muted)]">
                Enter your email address below. We will notify you immediately when this item is restocked.
              </p>

              <div>
                <label className="block text-xs font-semibold text-[var(--hexa-text)] mb-1.5">Your Email</label>
                <input
                  type="email"
                  required
                  value={restockEmail}
                  onChange={(e) => setRestockEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="hexa-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={restockLoading}
                className="hexa-btn !w-full flex items-center justify-center gap-2"
              >
                {restockLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <HugeiconsIcon icon={Notification01Icon} size={16} />
                    Subscribe to Restock Alert
                  </>
                )}
              </button>
            </form>
          )}
        </Modal>

        {/* ================================================================ */}
        {/* Reviews                                                          */}
        {/* ================================================================ */}

        <ReviewsBlock
          product={product}
          user={user}
          notify={notify}
        />

        {/* ================================================================ */}
        {/* Related Products                                                 */}
        {/* ================================================================ */}

        {related.length >
          0 && (
          <section
            className="
              mt-14
            "
          >
            <p
              className="
                text-[11px]
                font-bold
                uppercase
                tracking-[0.12em]

                text-purple-500
              "
            >
              More to explore
            </p>

            <h2
              className="
                mt-2

                text-2xl
                font-black
                tracking-[-0.03em]

                text-[var(--hexa-text)]
              "
            >
              Related products
            </h2>

            <div
              className="
                mt-6

                grid
                gap-4

                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              {related.map(
                (item) => (
                  <ProductCard
                    key={
                      item._id
                    }
                    product={
                      item
                    }
                  />
                )
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

/* ========================================================================== */
/* Section Title                                                              */
/* ========================================================================== */

function SectionTitle({
  icon,
  number,
  title,
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-2.5
      "
    >
      {number && (
        <span
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center

            rounded-full

            bg-purple-500/[0.08]

            text-[11px]
            font-bold

            text-purple-500
          "
        >
          {number}
        </span>
      )}

      <span
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center

          rounded-lg

          bg-purple-500/[0.06]

          text-purple-500
        "
      >
        <UIIcon
          icon={icon}
          size={17}
          strokeWidth={1.8}
        />
      </span>

      <h2
        className="
          text-[15px]
          font-semibold

          text-[var(--hexa-text)]
        "
      >
        {title}
      </h2>
    </div>
  )
}

/* ========================================================================== */
/* Info Row                                                                   */
/* ========================================================================== */

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      className="
        mt-4

        flex
        items-center
        justify-between
        gap-4

        text-[12px]
      "
    >
      <span
        className="
          text-[var(--hexa-muted)]
        "
      >
        {label}
      </span>

      <span
        className="
          max-w-[180px]
          truncate

          font-medium

          text-[var(--hexa-text)]
        "
      >
        {value || '—'}
      </span>
    </div>
  )
}

/* ========================================================================== */
/* Reviews                                                                    */
/* ========================================================================== */

function ReviewsBlock({
  product,
  user,
  notify,
}) {
  const [reviews, setReviews] =
    useState([])

  const [rating, setRating] =
    useState(5)

  const [comment, setComment] =
    useState('')

  const [
    submitting,
    setSubmitting,
  ] = useState(false)

  const [
    eligibility,
    setEligibility,
  ] = useState({
    canReview: false,
    hasReviewed: false,
    loading: true,
  })

  /* ====================================================================== */
  /* Load Reviews                                                           */
  /* ====================================================================== */

  const loadReviews = () =>
    getProductReviews(
      product._id,
      {
        limit: 30,
      }
    )
      .then((response) =>
        setReviews(
          response.data ||
            []
        )
      )
      .catch(() => {})

  /* ====================================================================== */
  /* Eligibility                                                            */
  /* ====================================================================== */

  const checkEligibility =
    () => {
      if (!user) {
        setEligibility({
          canReview: false,
          hasReviewed: false,
          loading: false,
        })

        return
      }

      checkCanReview(
        product._id
      )
        .then(
          (data) => {
            setEligibility({
              canReview:
                Boolean(
                  data?.canReview
                ),

              hasReviewed:
                Boolean(
                  data?.hasReviewed
                ),

              review:
                data?.review ||
                null,

              loading: false,
            })

            if (
              data?.review
            ) {
              setRating(
                data.review
                  .rating || 5
              )

              setComment(
                data.review
                  .comment ||
                  ''
              )
            }
          }
        )
        .catch(() => {
          setEligibility({
            canReview: false,
            hasReviewed: false,
            loading: false,
          })
        })
    }

  useEffect(() => {
    loadReviews()
    checkEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    product._id,
    user,
  ])

  /* ====================================================================== */
  /* Save Review                                                            */
  /* ====================================================================== */

  const submit =
    async (
      event
    ) => {
      event.preventDefault()

      if (!user) {
        notify(
          'Please sign in to review this product',
          'error'
        )

        return
      }

      if (
        !eligibility.canReview
      ) {
        notify(
          'Only verified buyers who purchased this product can leave a review',
          'error'
        )

        return
      }

      setSubmitting(true)

      try {
        await saveReview({
          productId:
            product._id,

          rating:
            Number(
              rating
            ),

          comment:
            comment.trim(),
        })

        notify(
          'Thank you! Your verified review has been saved.'
        )

        loadReviews()
        checkEligibility()
      } catch (
        error
      ) {
        notify(
          apiErrorMessage(
            error,
            'Unable to save review'
          ),
          'error'
        )
      } finally {
        setSubmitting(
          false
        )
      }
    }

  const ratingLabel =
    rating === 5
      ? 'Excellent'
      : rating === 4
      ? 'Good'
      : rating === 3
      ? 'Average'
      : rating === 2
      ? 'Poor'
      : 'Terrible'

  /* ====================================================================== */
  /* Render                                                                 */
  /* ====================================================================== */

  return (
    <section
      className="
        mt-14
      "
    >
      {/* Header */}

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
              font-bold
              uppercase
              tracking-[0.12em]

              text-purple-500
            "
          >
            Verified buyer feedback
          </p>

          <h2
            className="
              mt-2

              text-2xl
              font-black
              tracking-[-0.03em]

              text-[var(--hexa-text)]
            "
          >
            Reviews & ratings
          </h2>
        </div>

        <div
          className="
            flex
            items-center
            gap-2

            rounded-xl

            border
            border-amber-500/20

            bg-amber-500/[0.06]

            px-3
            py-2
          "
        >
          <UIIcon
            icon={
              StarIcon
            }
            size={17}
            strokeWidth={1.8}
            className="
              text-amber-500
            "
          />

          <span
            className="
              text-lg
              font-bold

              text-[var(--hexa-text)]
            "
          >
            {Number(
              product.ratingAverage ||
                0
            ).toFixed(
              1
            )}
          </span>

          <span
            className="
              text-[11px]

              text-[var(--hexa-muted)]
            "
          >
            (
            {product.reviewCount ||
              0}{' '}
            {product.reviewCount ===
            1
              ? 'review'
              : 'reviews'}
            )
          </span>
        </div>
      </div>

      <div
        className="
          mt-6

          grid
          gap-5

          lg:grid-cols-[340px_minmax(0,1fr)]
        "
      >
        {/* ================================================================ */}
        {/* Review Form / Gate                                               */}
        {/* ================================================================ */}

        <div>
          {eligibility.loading &&
          user ? (
            <div
              className="
                h-[240px]

                animate-pulse

                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]
              "
            />
          ) : !user ? (
            <ReviewGate
              icon={
                LockPasswordIcon
              }
              title="Verified buyers only"
              description="Sign in and complete a purchase before leaving a product review."
            >
              <Link
                to={`/login?redirect=/product/${product.slug}`}
                className="
                  hexa-btn

                  mt-5

                  !flex
                  !h-10
                  !w-full
                  !items-center
                  !justify-center
                  !gap-2
                  !rounded-xl
                  !py-0

                  text-xs
                  font-semibold
                "
              >
                Sign in

                <UIIcon
                  icon={
                    ArrowRight01Icon
                  }
                  size={15}
                  strokeWidth={
                    1.8
                  }
                />
              </Link>
            </ReviewGate>
          ) : !eligibility.canReview ? (
            <ReviewGate
              icon={
                Shield01Icon
              }
              title="Verified purchase required"
              description={`Only customers who completed an order for ${product.name} can leave a review.`}
            >
              <div
                className="
                  mt-4

                  inline-flex
                  items-center
                  gap-1.5

                  rounded-full

                  bg-emerald-500/[0.08]

                  px-2.5
                  py-1

                  text-[10px]
                  font-medium

                  text-emerald-500
                "
              >
                <UIIcon
                  icon={
                    Tick02Icon
                  }
                  size={12}
                  strokeWidth={
                    2
                  }
                />

                Genuine reviews only
              </div>
            </ReviewGate>
          ) : (
            <form
              onSubmit={submit}
              className="
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
                  items-center
                  gap-2.5
                "
              >
                <span
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center

                    rounded-lg

                    bg-emerald-500/[0.08]

                    text-emerald-500
                  "
                >
                  <UIIcon
                    icon={
                      Shield01Icon
                    }
                    size={16}
                  />
                </span>

                <div>
                  <h3
                    className="
                      text-sm
                      font-semibold

                      text-[var(--hexa-text)]
                    "
                  >
                    {eligibility.hasReviewed
                      ? 'Update your review'
                      : 'Write a review'}
                  </h3>

                  <p
                    className="
                      mt-0.5

                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.1em]

                      text-emerald-500
                    "
                  >
                    Verified buyer
                  </p>
                </div>
              </div>

              {/* ========================================================== */}
              {/* Rating                                                     */}
              {/* ========================================================== */}

              <div
                className="
                  mt-5
                "
              >
                <span
                  className="
                    text-[11px]
                    font-medium

                    text-[var(--hexa-muted)]
                  "
                >
                  Your rating
                </span>

                <div
                  className="
                    mt-2

                    flex
                    flex-wrap
                    items-center
                    gap-1
                  "
                >
                  {[
                    1,
                    2,
                    3,
                    4,
                    5,
                  ].map(
                    (
                      star
                    ) => (
                      <button
                        type="button"
                        key={
                          star
                        }
                        onClick={() =>
                          setRating(
                            star
                          )
                        }
                        aria-label={`${star} star rating`}
                        className={`
                          flex
                          h-8
                          w-8
                          transform-gpu
                          items-center
                          justify-center

                          rounded-lg

                          transition-transform
                          duration-150

                          hover:scale-[1.06]
                          active:scale-[0.94]

                          ${
                            star <=
                            rating
                              ? 'text-amber-500'
                              : 'text-[var(--hexa-muted)]'
                          }
                        `}
                      >
                        <UIIcon
                          icon={
                            StarIcon
                          }
                          size={
                            20
                          }
                          strokeWidth={
                            1.8
                          }
                        />
                      </button>
                    )
                  )}

                  <span
                    className="
                      ml-2

                      text-[11px]
                      font-medium

                      text-amber-500
                    "
                  >
                    {rating}/5 ·{' '}
                    {
                      ratingLabel
                    }
                  </span>
                </div>
              </div>

              {/* ========================================================== */}
              {/* Feedback                                                   */}
              {/* ========================================================== */}

              <label
                className="
                  mt-4
                  block
                "
              >
                <span
                  className="
                    mb-1.5
                    block

                    text-[11px]
                    font-medium

                    text-[var(--hexa-muted)]
                  "
                >
                  Your feedback
                </span>

                <textarea
                  required
                  minLength={
                    5
                  }
                  rows={4}
                  value={
                    comment
                  }
                  onChange={(
                    event
                  ) =>
                    setComment(
                      event.target
                        .value
                    )
                  }
                  placeholder="Share your experience..."
                  className="
                    hexa-input

                    !min-h-[110px]
                    !resize-none
                    !rounded-xl

                    text-sm

                    transition-[border-color,box-shadow]
                    duration-150

                    focus:!border-purple-500/50
                    focus:!shadow-[0_0_0_3px_rgba(147,51,234,.07)]
                  "
                />
              </label>

              <button
                type="submit"
                disabled={
                  submitting
                }
                className="
                  hexa-btn

                  mt-4

                  !flex
                  !h-10
                  !w-full
                  !items-center
                  !justify-center
                  !rounded-xl
                  !py-0

                  text-xs
                  font-semibold

                  disabled:pointer-events-none
                  disabled:opacity-50
                "
              >
                {submitting
                  ? 'Saving review...'
                  : eligibility.hasReviewed
                  ? 'Update review'
                  : 'Submit review'}
              </button>
            </form>
          )}
        </div>

        {/* ================================================================ */}
        {/* Reviews List                                                     */}
        {/* ================================================================ */}

        <div
          className="
            space-y-3
          "
        >
          {reviews.length ? (
            reviews.map(
              (
                review
              ) => (
                <article
                  key={
                    review._id
                  }
                  className="
                    rounded-[16px]

                    border
                    border-[var(--hexa-border)]

                    bg-[var(--hexa-card)]

                    p-4

                    transition-[border-color]
                    duration-150

                    hover:border-purple-500/25
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-4
                    "
                  >
                    <div
                      className="
                        min-w-0
                      "
                    >
                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >
                        <p
                          className="
                            text-sm
                            font-semibold

                            text-[var(--hexa-text)]
                          "
                        >
                          {review.user
                            ?.name ||
                            'HEXA Customer'}
                        </p>

                        {review.verifiedPurchase && (
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1

                              rounded-full

                              bg-emerald-500/[0.08]

                              px-2
                              py-0.5

                              text-[9px]
                              font-medium

                              text-emerald-500
                            "
                          >
                            <UIIcon
                              icon={
                                Tick02Icon
                              }
                              size={
                                11
                              }
                              strokeWidth={
                                2
                              }
                            />

                            Verified
                          </span>
                        )}
                      </div>

                      <p
                        className="
                          mt-1

                          text-[10px]

                          text-[var(--hexa-muted)]
                        "
                      >
                        {new Date(
                          review.createdAt
                        ).toLocaleDateString(
                          undefined,
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </p>
                    </div>

                    <div
                      className="
                        flex
                        shrink-0
                        gap-0.5
                      "
                    >
                      {[
                        ...Array(
                          5
                        ),
                      ].map(
                        (
                          _,
                          index
                        ) => (
                          <UIIcon
                            key={
                              index
                            }
                            icon={
                              StarIcon
                            }
                            size={
                              13
                            }
                            strokeWidth={
                              1.8
                            }
                            className={
                              index <
                              review.rating
                                ? 'text-amber-500'
                                : 'text-[var(--hexa-muted)] opacity-35'
                            }
                          />
                        )
                      )}
                    </div>
                  </div>

                  <p
                    className="
                      mt-3

                      whitespace-pre-line

                      text-sm
                      leading-6

                      text-[var(--hexa-muted)]
                    "
                  >
                    {
                      review.comment
                    }
                  </p>
                </article>
              )
            )
          ) : (
            <div
              className="
                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                p-8

                text-center
              "
            >
              <span
                className="
                  mx-auto

                  flex
                  h-11
                  w-11
                  items-center
                  justify-center

                  rounded-full

                  bg-purple-500/[0.06]

                  text-purple-500
                "
              >
                <UIIcon
                  icon={
                    Shield01Icon
                  }
                  size={20}
                />
              </span>

              <p
                className="
                  mt-3

                  text-sm
                  font-medium

                  text-[var(--hexa-text)]
                "
              >
                No reviews yet
              </p>

              <p
                className="
                  mt-1

                  text-xs
                  leading-5

                  text-[var(--hexa-muted)]
                "
              >
                Be the first verified
                buyer to share your
                experience.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ========================================================================== */
/* Review Gate                                                                */
/* ========================================================================== */

function ReviewGate({
  icon,
  title,
  description,
  children,
}) {
  return (
    <div
      className="
        rounded-[18px]

        border
        border-dashed
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]

        p-5

        text-center
      "
    >
      <span
        className="
          mx-auto

          flex
          h-11
          w-11
          items-center
          justify-center

          rounded-full

          bg-purple-500/[0.07]

          text-purple-500
        "
      >
        <UIIcon
          icon={icon}
          size={20}
        />
      </span>

      <h3
        className="
          mt-3

          text-sm
          font-semibold

          text-[var(--hexa-text)]
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-2

          text-[11px]
          leading-5

          text-[var(--hexa-muted)]
        "
      >
        {description}
      </p>

      {children}
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
      strokeWidth={
        strokeWidth
      }
      className={
        className
      }
    />
  )
}