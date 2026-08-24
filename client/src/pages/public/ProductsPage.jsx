import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useParams,
  useSearchParams,
} from 'react-router-dom'

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from 'framer-motion'

import {
  HugeiconsIcon,
} from '@hugeicons/react'

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons'

import {
  getCategories,
  getProducts,
} from '../../api/catalog.api'

import ProductCard from '../../components/ProductCard'
import EmptyState from '../../components/EmptyState'
import usePageMeta from '../../hooks/usePageMeta'

/* ========================================================================== */
/* Constants                                                                  */
/* ========================================================================== */

const EASE = [0.22, 1, 0.36, 1]

const PRODUCT_TYPES = [
  {
    value: 'subscription',
    label: 'Subscription',
  },
  {
    value: 'game',
    label: 'Game',
  },
  {
    value: 'tool',
    label: 'Tool',
  },
  {
    value: 'software',
    label: 'Software',
  },
  {
    value: 'digital-product',
    label: 'Digital product',
  },
  {
    value: 'account',
    label: 'Account',
  },
  {
    value: 'license',
    label: 'License',
  },
  {
    value: 'other',
    label: 'Other',
  },
]

const SORT_OPTIONS = [
  {
    value: 'newest',
    label: 'Newest',
  },
  {
    value: 'popular',
    label: 'Popular',
  },
  {
    value: 'price_asc',
    label: 'Price: low to high',
  },
  {
    value: 'price_desc',
    label: 'Price: high to low',
  },
  {
    value: 'discount',
    label: 'Discount',
  },
]

/* ========================================================================== */
/* Products Page                                                              */
/* ========================================================================== */

export default function ProductsPage() {
  const { slug } = useParams()

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const reduceMotion = useReducedMotion()

  const [categories, setCategories] = useState([])

  const [result, setResult] = useState({
    data: [],
    meta: {},
  })

  const [loading, setLoading] = useState(true)

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false)

  const [q, setQ] = useState(
    searchParams.get('q') || ''
  )

  const paramsKey = searchParams.toString()

  /* ====================================================================== */
  /* Categories                                                             */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    getCategories()
      .then((response) => {
        if (!active) return

        setCategories(
          Array.isArray(response)
            ? response
            : []
        )
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  /* ====================================================================== */
  /* Products                                                               */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    setLoading(true)

    const params =
      Object.fromEntries(
        searchParams.entries()
      )

    if (slug) {
      params.category = slug
    }

    getProducts({
      ...params,
      limit: 12,
    })
      .then((response) => {
        if (!active) return

        setResult({
          data:
            response?.data || [],
          meta:
            response?.meta || {},
        })
      })
      .catch(() => {
        if (!active) return

        setResult({
          data: [],
          meta: {},
        })
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
    // paramsKey represents current URL filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, paramsKey])

  /* ====================================================================== */
  /* Sync Search Field                                                      */
  /* ====================================================================== */

  useEffect(() => {
    setQ(
      searchParams.get('q') ||
        ''
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey])

  /* ====================================================================== */
  /* Current Category                                                       */
  /* ====================================================================== */

  const category =
    useMemo(
      () =>
        categories.find(
          (item) =>
            item.slug === slug
        ),
      [
        categories,
        slug,
      ]
    )

  /* ====================================================================== */
  /* Page Meta                                                              */
  /* ====================================================================== */

  usePageMeta(
    `${
      category?.name ||
      'Marketplace'
    } — HEXA`,

    category?.description ||
      'Browse and search HEXA digital products, subscriptions, games, software and tools.'
  )

  /* ====================================================================== */
  /* Query Update                                                           */
  /* ====================================================================== */

  const update = (
    key,
    value
  ) => {
    const next =
      new URLSearchParams(
        searchParams
      )

    if (value) {
      next.set(
        key,
        value
      )
    } else {
      next.delete(key)
    }

    if (key !== 'page') {
      next.delete('page')
    }

    setSearchParams(next)
  }

  /* ====================================================================== */
  /* Search                                                                 */
  /* ====================================================================== */

  const submit = (
    event
  ) => {
    event.preventDefault()

    update(
      'q',
      q.trim()
    )
  }

  const clearSearch = () => {
    setQ('')
    update('q', '')
  }

  /* ====================================================================== */
  /* Reset                                                                  */
  /* ====================================================================== */

  const resetFilters = () => {
    const next =
      new URLSearchParams()

    const search =
      searchParams.get('q')

    if (search) {
      next.set(
        'q',
        search
      )
    }

    setSearchParams(next)
  }

  /* ====================================================================== */
  /* Current Filter State                                                   */
  /* ====================================================================== */

  const page = Number(
    searchParams.get('page') ||
      1
  )

  const totalPages =
    Math.max(
      1,
      Number(
        result.meta?.pages ||
          1
      )
    )

  const activeFilterCount =
    useMemo(() => {
      let count = 0

      if (
        searchParams.get(
          'type'
        )
      ) {
        count += 1
      }

      if (
        searchParams.get(
          'availability'
        )
      ) {
        count += 1
      }

      const sort =
        searchParams.get(
          'sort'
        )

      if (
        sort &&
        sort !== 'newest'
      ) {
        count += 1
      }

      if (
        !slug &&
        searchParams.get(
          'category'
        )
      ) {
        count += 1
      }

      return count
    }, [
      slug,
      searchParams,
    ])

  const hasActiveFilters =
    activeFilterCount > 0

  const productCount =
    result.meta?.total ??
    result.data?.length ??
    0

  /* ====================================================================== */
  /* Mobile Drawer: Body Scroll                                             */
  /* ====================================================================== */

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined
    }

    const previousOverflow =
      document.body.style
        .overflow

    document.body.style.overflow =
      'hidden'

    return () => {
      document.body.style.overflow =
        previousOverflow
    }
  }, [mobileFiltersOpen])

  /* ====================================================================== */
  /* Mobile Drawer: Escape                                                  */
  /* ====================================================================== */

  useEffect(() => {
    if (!mobileFiltersOpen) {
      return undefined
    }

    const handleKeyDown = (
      event
    ) => {
      if (
        event.key === 'Escape'
      ) {
        setMobileFiltersOpen(
          false
        )
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [mobileFiltersOpen])

  /* ====================================================================== */
  /* Close Drawer on Desktop Resize                                         */
  /* ====================================================================== */

  useEffect(() => {
    const handleResize = () => {
      if (
        window.innerWidth >=
        1024
      ) {
        setMobileFiltersOpen(
          false
        )
      }
    }

    window.addEventListener(
      'resize',
      handleResize
    )

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      )
    }
  }, [])

  /* ====================================================================== */
  /* Render                                                                 */
  /* ====================================================================== */

  return (
    <>
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
            py-10
            sm:py-12
          "
        >
          {/* ============================================================ */}
          {/* Page Header                                                  */}
          {/* ============================================================ */}

          <header
            className="
              max-w-3xl
            "
          >
            <p
              className="
                text-[11px]
                font-bold
                uppercase
                tracking-[0.12em]

                text-purple-500

                sm:text-xs
              "
            >
              Marketplace
            </p>

            <h1
              className="
                mt-2

                text-[30px]
                font-black
                leading-tight
                tracking-[-0.035em]

                text-[var(--hexa-text)]

                sm:text-[34px]
              "
            >
              {category?.name ||
                'All digital products'}
            </h1>

            <p
              className="
                mt-3

                max-w-2xl

                text-sm
                font-normal
                leading-6

                text-[var(--hexa-muted)]
              "
            >
              {category?.description ||
                'Search, filter and compare subscriptions, games, software and digital tools.'}
            </p>
          </header>

          {/* ============================================================ */}
          {/* Search & Mobile Filter                                      */}
          {/* ============================================================ */}

          <div
            className="
              mt-7

              flex
              items-center
              gap-2
            "
          >
            <form
              onSubmit={submit}
              className="
                flex
                min-w-0
                flex-1
                items-center
                gap-2
              "
            >
              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
                <UIIcon
                  icon={
                    Search01Icon
                  }
                  size={18}
                  strokeWidth={1.8}
                  className="
                    pointer-events-none

                    absolute
                    left-3.5
                    top-1/2

                    -translate-y-1/2

                    text-[var(--hexa-muted)]
                  "
                />

                <input
                  value={q}
                  onChange={(
                    event
                  ) =>
                    setQ(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search products..."
                  className="
                    hexa-input

                    !h-11
                    !rounded-xl
                    !pl-10
                    !pr-10

                    text-[14px]
                    font-normal

                    transition-[border-color,box-shadow]
                    duration-150

                    focus:!border-purple-500/50
                    focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.07)]
                  "
                />

                {q && (
                  <button
                    type="button"
                    onClick={
                      clearSearch
                    }
                    aria-label="Clear search"
                    className="
                      absolute
                      right-2.5
                      top-1/2

                      flex
                      h-7
                      w-7
                      -translate-y-1/2
                      items-center
                      justify-center

                      rounded-lg

                      text-[var(--hexa-muted)]

                      transition-[background-color,color]
                      duration-150

                      hover:bg-purple-500/[0.07]
                      hover:text-purple-500
                    "
                  >
                    <UIIcon
                      icon={
                        Cancel01Icon
                      }
                      size={15}
                    />
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="
                  hexa-btn

                  !flex
                  !h-11
                  !shrink-0
                  !items-center
                  !gap-2
                  !rounded-xl
                  !px-4
                  !py-0

                  transform-gpu

                  text-sm
                  font-semibold

                  transition-transform
                  duration-150
                  ease-out

                  hover:scale-[1.015]
                  active:scale-[0.98]
                "
              >
                <UIIcon
                  icon={
                    Search01Icon
                  }
                  size={17}
                  strokeWidth={1.9}
                />

                <span
                  className="
                    hidden
                    sm:inline
                  "
                >
                  Search
                </span>
              </button>
            </form>

            {/* ========================================================== */}
            {/* MOBILE FILTER BUTTON                                      */}
            {/* ========================================================== */}

            <motion.button
              type="button"
              whileTap={
                reduceMotion
                  ? undefined
                  : {
                      scale: 0.96,
                    }
              }
              onClick={() =>
                setMobileFiltersOpen(
                  true
                )
              }
              className="
                relative

                flex
                h-11
                shrink-0
                items-center
                gap-2

                rounded-xl

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                px-3.5

                text-[13px]
                font-medium
                text-[var(--hexa-text)]

                transition-[background-color,border-color,color]
                duration-150

                hover:border-purple-500/25
                hover:bg-purple-500/[0.05]

                lg:hidden
              "
            >
              <UIIcon
                icon={
                  FilterHorizontalIcon
                }
                size={18}
                strokeWidth={1.8}
              />

              <span
                className="
                  hidden
                  min-[390px]:inline
                "
              >
                Filters
              </span>

              {activeFilterCount >
                0 && (
                <span
                  className="
                    flex
                    h-5
                    min-w-5
                    items-center
                    justify-center

                    rounded-full

                    bg-purple-600

                    px-1

                    text-[10px]
                    font-bold
                    leading-none
                    text-white
                  "
                >
                  {
                    activeFilterCount
                  }
                </span>
              )}
            </motion.button>
          </div>

          {/* ============================================================ */}
          {/* Main Layout                                                  */}
          {/* ============================================================ */}

          <div
            className="
              mt-6

              grid
              items-start
              gap-5

              lg:grid-cols-[240px_minmax(0,1fr)]
            "
          >
            {/* ========================================================== */}
            {/* DESKTOP FILTER SIDEBAR                                    */}
            {/* ========================================================== */}

            <aside
              className="
                sticky
                top-24

                hidden

                rounded-[18px]

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                p-4

                lg:block
              "
            >
              <FilterHeader
                activeFilterCount={
                  activeFilterCount
                }
                hasActiveFilters={
                  hasActiveFilters
                }
                onReset={
                  resetFilters
                }
              />

              <div
                className="
                  mt-4
                "
              >
                <FiltersContent
                  slug={slug}
                  categories={
                    categories
                  }
                  searchParams={
                    searchParams
                  }
                  update={update}
                  animated={false}
                />
              </div>
            </aside>

            {/* ========================================================== */}
            {/* Product Results                                           */}
            {/* ========================================================== */}

            <section
              className="
                min-w-0
              "
            >
              {/* Results count */}

              <div
                className="
                  flex
                  min-h-8
                  items-center
                  justify-between
                  gap-4
                "
              >
                <p
                  className="
                    text-[13px]
                    text-[var(--hexa-muted)]
                  "
                >
                  {loading ? (
                    'Loading products...'
                  ) : (
                    <>
                      <span
                        className="
                          font-semibold
                          text-[var(--hexa-text)]
                        "
                      >
                        {
                          productCount
                        }
                      </span>{' '}
                      {productCount ===
                      1
                        ? 'product'
                        : 'products'}
                    </>
                  )}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="
                      hidden

                      text-[12px]
                      font-medium
                      text-purple-500

                      transition-colors
                      duration-150

                      hover:text-purple-400

                      sm:block
                      lg:hidden
                    "
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {/* ======================================================== */}
              {/* Loading                                                 */}
              {/* ======================================================== */}

              {loading ? (
                <CardsSkeleton />
              ) : result.data
                  ?.length ? (
                <>
                  {/* Product grid */}

                  <div
                    className="
                      mt-4

                      grid
                      gap-4

                      md:grid-cols-2
                      xl:grid-cols-3
                    "
                  >
                    {result.data.map(
                      (product) => (
                        <ProductCard
                          key={
                            product._id
                          }
                          product={
                            product
                          }
                        />
                      )
                    )}
                  </div>

                  {/* ==================================================== */}
                  {/* Pagination                                          */}
                  {/* ==================================================== */}

                  <div
                    className="
                      mt-8

                      flex
                      flex-col
                      items-center
                      justify-between
                      gap-3

                      border-t
                      border-[var(--hexa-border)]

                      pt-5

                      sm:flex-row
                    "
                  >
                    <p
                      className="
                        text-[12px]
                        text-[var(--hexa-muted)]
                      "
                    >
                      Page{' '}
                      <span
                        className="
                          font-semibold
                          text-[var(--hexa-text)]
                        "
                      >
                        {page}
                      </span>{' '}
                      of{' '}
                      <span
                        className="
                          font-semibold
                          text-[var(--hexa-text)]
                        "
                      >
                        {
                          totalPages
                        }
                      </span>
                    </p>

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <PaginationButton
                        disabled={
                          page <= 1
                        }
                        onClick={() =>
                          update(
                            'page',
                            String(
                              page - 1
                            )
                          )
                        }
                      >
                        <UIIcon
                          icon={
                            ArrowLeft01Icon
                          }
                          size={15}
                        />

                        Previous
                      </PaginationButton>

                      <PaginationButton
                        disabled={
                          page >=
                          totalPages
                        }
                        onClick={() =>
                          update(
                            'page',
                            String(
                              page + 1
                            )
                          )
                        }
                      >
                        Next

                        <UIIcon
                          icon={
                            ArrowRight01Icon
                          }
                          size={15}
                        />
                      </PaginationButton>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="
                    mt-4
                  "
                >
                  <EmptyState
                    title="No matching products"
                    description="Try another search or remove one of the filters."
                  />
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* ================================================================== */}
      {/* MOBILE FILTER SLIDER / DRAWER                                      */}
      {/* ================================================================== */}

      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            {/* ============================================================ */}
            {/* Backdrop                                                     */}
            {/* ============================================================ */}

            <motion.button
              type="button"
              aria-label="Close filters"
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                    }
              }
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration:
                  reduceMotion
                    ? 0
                    : 0.18,
              }}
              onClick={() =>
                setMobileFiltersOpen(
                  false
                )
              }
              className="
                fixed
                inset-0

                z-[110]

                bg-black/45

                backdrop-blur-[2px]

                lg:hidden
              "
            />

            {/* ============================================================ */}
            {/* Drawer                                                       */}
            {/* ============================================================ */}

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-filter-title"
              initial={
                reduceMotion
                  ? false
                  : {
                      x: '100%',
                    }
              }
              animate={{
                x: 0,
              }}
              exit={{
                x: '100%',
              }}
              transition={
                reduceMotion
                  ? {
                      duration: 0,
                    }
                  : {
                      duration: 0.32,
                      ease: EASE,
                    }
              }
              className="
                fixed
                bottom-0
                right-0
                top-0

                z-[120]

                flex
                w-[min(88vw,360px)]
                flex-col

                border-l
                border-[var(--hexa-border)]

                bg-[var(--hexa-bg)]

                shadow-[-18px_0_50px_rgba(0,0,0,0.18)]

                lg:hidden
              "
            >
              {/* ========================================================== */}
              {/* Drawer Header                                             */}
              {/* ========================================================== */}

              <div
                className="
                  flex
                  h-16
                  shrink-0
                  items-center
                  justify-between
                  gap-4

                  border-b
                  border-[var(--hexa-border)]

                  px-4
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  "
                >
                  <motion.span
                    initial={
                      reduceMotion
                        ? false
                        : {
                            scale: 0.8,
                            opacity: 0,
                          }
                    }
                    animate={{
                      scale: 1,
                      opacity: 1,
                    }}
                    transition={{
                      duration:
                        reduceMotion
                          ? 0
                          : 0.2,
                      delay:
                        reduceMotion
                          ? 0
                          : 0.08,
                    }}
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center

                      rounded-xl

                      bg-purple-500/[0.08]

                      text-purple-500
                    "
                  >
                    <UIIcon
                      icon={
                        FilterHorizontalIcon
                      }
                      size={18}
                      strokeWidth={1.9}
                    />
                  </motion.span>

                  <div
                    className="
                      min-w-0
                    "
                  >
                    <h2
                      id="mobile-filter-title"
                      className="
                        text-[15px]
                        font-semibold
                        text-[var(--hexa-text)]
                      "
                    >
                      Filters
                    </h2>

                    <p
                      className="
                        mt-0.5

                        text-[11px]
                        text-[var(--hexa-muted)]
                      "
                    >
                      {activeFilterCount >
                      0
                        ? `${activeFilterCount} active ${
                            activeFilterCount ===
                            1
                              ? 'filter'
                              : 'filters'
                          }`
                        : 'Refine products'}
                    </p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileTap={
                    reduceMotion
                      ? undefined
                      : {
                          scale: 0.9,
                        }
                  }
                  onClick={() =>
                    setMobileFiltersOpen(
                      false
                    )
                  }
                  aria-label="Close filters"
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center

                    rounded-xl

                    text-[var(--hexa-muted)]

                    transition-[background-color,color]
                    duration-150

                    hover:bg-purple-500/[0.07]
                    hover:text-purple-500
                  "
                >
                  <UIIcon
                    icon={
                      Cancel01Icon
                    }
                    size={18}
                  />
                </motion.button>
              </div>

              {/* ========================================================== */}
              {/* Drawer Body                                               */}
              {/* ========================================================== */}

              <div
                className="
                  min-h-0
                  flex-1

                  overflow-y-auto
                  overscroll-contain

                  px-4
                  py-5
                "
              >
                {hasActiveFilters && (
                  <motion.div
                    initial={
                      reduceMotion
                        ? false
                        : {
                            opacity: 0,
                            y: -5,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="
                      mb-5

                      flex
                      items-center
                      justify-between

                      rounded-xl

                      border
                      border-[var(--hexa-border)]

                      px-3
                      py-2.5
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[12px]
                          font-medium
                          text-[var(--hexa-text)]
                        "
                      >
                        Active filters
                      </p>

                      <p
                        className="
                          mt-0.5

                          text-[10px]
                          text-[var(--hexa-muted)]
                        "
                      >
                        {
                          activeFilterCount
                        }{' '}
                        applied
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        resetFilters
                      }
                      className="
                        rounded-lg

                        px-2.5
                        py-1.5

                        text-[11px]
                        font-medium
                        text-purple-500

                        transition-colors
                        duration-150

                        hover:bg-purple-500/[0.07]
                      "
                    >
                      Reset all
                    </button>
                  </motion.div>
                )}

                <FiltersContent
                  slug={slug}
                  categories={
                    categories
                  }
                  searchParams={
                    searchParams
                  }
                  update={update}
                  animated
                  reduceMotion={
                    reduceMotion
                  }
                />
              </div>

              {/* ========================================================== */}
              {/* Drawer Footer                                             */}
              {/* ========================================================== */}

              <div
                className="
                  shrink-0

                  border-t
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-bg)]

                  p-4
                "
              >
                <motion.button
                  type="button"
                  whileTap={
                    reduceMotion
                      ? undefined
                      : {
                          scale: 0.985,
                        }
                  }
                  onClick={() =>
                    setMobileFiltersOpen(
                      false
                    )
                  }
                  className="
                    hexa-btn

                    !flex
                    !h-11
                    !w-full
                    !items-center
                    !justify-between
                    !rounded-xl
                    !px-4
                    !py-0

                    text-sm
                    font-semibold
                  "
                >
                  <span>
                    Show products
                  </span>

                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                    "
                  >
                    {!loading && (
                      <span
                        className="
                          rounded-md

                          bg-white/15

                          px-2
                          py-0.5

                          text-[10px]
                          font-semibold
                        "
                      >
                        {
                          productCount
                        }
                      </span>
                    )}

                    <UIIcon
                      icon={
                        ArrowRight01Icon
                      }
                      size={16}
                      strokeWidth={1.9}
                    />
                  </span>
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ========================================================================== */
/* Filter Header                                                              */
/* ========================================================================== */

function FilterHeader({
  activeFilterCount,
  hasActiveFilters,
  onReset,
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3

        border-b
        border-[var(--hexa-border)]

        pb-3
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
              FilterHorizontalIcon
            }
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <div>
          <p
            className="
              text-sm
              font-semibold
              text-[var(--hexa-text)]
            "
          >
            Filters
          </p>

          {activeFilterCount >
            0 && (
            <p
              className="
                mt-0.5

                text-[10px]
                text-[var(--hexa-muted)]
              "
            >
              {
                activeFilterCount
              }{' '}
              active
            </p>
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="
            inline-flex
            items-center
            gap-1

            rounded-lg

            px-2
            py-1.5

            text-[11px]
            font-medium
            text-purple-500

            transition-colors
            duration-150

            hover:bg-purple-500/[0.07]
          "
        >
          <UIIcon
            icon={
              Cancel01Icon
            }
            size={13}
          />

          Reset
        </button>
      )}
    </div>
  )
}

/* ========================================================================== */
/* Filters Content                                                            */
/* ========================================================================== */

function FiltersContent({
  slug,
  categories,
  searchParams,
  update,
  animated = false,
  reduceMotion = false,
}) {
  const content = (
    <>
      {/* Product type */}

      <FilterSelect
        label="Product type"
        value={
          searchParams.get(
            'type'
          ) || ''
        }
        onChange={(value) =>
          update(
            'type',
            value
          )
        }
      >
        <option value="">
          All types
        </option>

        {PRODUCT_TYPES.map(
          (type) => (
            <option
              key={type.value}
              value={type.value}
            >
              {type.label}
            </option>
          )
        )}
      </FilterSelect>

      {/* Availability */}

      <FilterSelect
        label="Availability"
        value={
          searchParams.get(
            'availability'
          ) || 'all'
        }
        onChange={(value) =>
          update(
            'availability',
            value === 'all'
              ? ''
              : value
          )
        }
      >
        <option value="all">
          All products
        </option>

        <option value="in_stock">
          In stock
        </option>

        <option value="out_of_stock">
          Out of stock
        </option>
      </FilterSelect>

      {/* Sort */}

      <FilterSelect
        label="Sort by"
        value={
          searchParams.get(
            'sort'
          ) || 'newest'
        }
        onChange={(value) =>
          update(
            'sort',
            value
          )
        }
      >
        {SORT_OPTIONS.map(
          (option) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          )
        )}
      </FilterSelect>

      {/* Category */}

      {!slug && (
        <FilterSelect
          label="Category"
          value={
            searchParams.get(
              'category'
            ) || ''
          }
          onChange={(value) =>
            update(
              'category',
              value
            )
          }
        >
          <option value="">
            All categories
          </option>

          {categories.map(
            (item) => (
              <option
                key={item._id}
                value={item.slug}
              >
                {item.name}
              </option>
            )
          )}
        </FilterSelect>
      )}
    </>
  )

  if (!animated) {
    return (
      <div
        className="
          space-y-4
        "
      >
        {content}
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren:
              reduceMotion
                ? 0
                : 0.055,
            delayChildren:
              reduceMotion
                ? 0
                : 0.08,
          },
        },
      }}
      className="
        space-y-4
      "
    >
      <AnimatedFilterItem
        reduceMotion={
          reduceMotion
        }
      >
        <FilterSelect
          label="Product type"
          value={
            searchParams.get(
              'type'
            ) || ''
          }
          onChange={(value) =>
            update(
              'type',
              value
            )
          }
        >
          <option value="">
            All types
          </option>

          {PRODUCT_TYPES.map(
            (type) => (
              <option
                key={
                  type.value
                }
                value={
                  type.value
                }
              >
                {type.label}
              </option>
            )
          )}
        </FilterSelect>
      </AnimatedFilterItem>

      <AnimatedFilterItem
        reduceMotion={
          reduceMotion
        }
      >
        <FilterSelect
          label="Availability"
          value={
            searchParams.get(
              'availability'
            ) || 'all'
          }
          onChange={(value) =>
            update(
              'availability',
              value ===
                'all'
                ? ''
                : value
            )
          }
        >
          <option value="all">
            All products
          </option>

          <option value="in_stock">
            In stock
          </option>

          <option value="out_of_stock">
            Out of stock
          </option>
        </FilterSelect>
      </AnimatedFilterItem>

      <AnimatedFilterItem
        reduceMotion={
          reduceMotion
        }
      >
        <FilterSelect
          label="Sort by"
          value={
            searchParams.get(
              'sort'
            ) || 'newest'
          }
          onChange={(value) =>
            update(
              'sort',
              value
            )
          }
        >
          {SORT_OPTIONS.map(
            (option) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </FilterSelect>
      </AnimatedFilterItem>

      {!slug && (
        <AnimatedFilterItem
          reduceMotion={
            reduceMotion
          }
        >
          <FilterSelect
            label="Category"
            value={
              searchParams.get(
                'category'
              ) || ''
            }
            onChange={(value) =>
              update(
                'category',
                value
              )
            }
          >
            <option value="">
              All categories
            </option>

            {categories.map(
              (item) => (
                <option
                  key={
                    item._id
                  }
                  value={
                    item.slug
                  }
                >
                  {item.name}
                </option>
              )
            )}
          </FilterSelect>
        </AnimatedFilterItem>
      )}
    </motion.div>
  )
}

/* ========================================================================== */
/* Animated Filter Item                                                       */
/* ========================================================================== */

function AnimatedFilterItem({
  children,
  reduceMotion,
}) {
  return (
    <motion.div
      variants={{
        hidden:
          reduceMotion
            ? {}
            : {
                opacity: 0,
                x: 12,
              },

        visible: {
          opacity: 1,
          x: 0,

          transition: {
            duration:
              reduceMotion
                ? 0
                : 0.24,
            ease: EASE,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/* ========================================================================== */
/* Filter Select                                                              */
/* ========================================================================== */

function FilterSelect({
  label,
  value,
  onChange,
  children,
}) {
  return (
    <label
      className="
        block
      "
    >
      <span
        className="
          mb-1.5
          block

          text-[11px]
          font-medium

          text-[var(--hexa-text-soft)]
        "
      >
        {label}
      </span>

      <div
        className="
          group
          relative
        "
      >
        <select
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className="
            hexa-input

            !h-10
            !w-full
            !cursor-pointer
            !appearance-none
            !rounded-xl

            !py-0
            !pl-3
            !pr-9

            text-[13px]
            font-normal

            text-[var(--hexa-text)]

            transition-[border-color,box-shadow,background-color]
            duration-150

            hover:!border-purple-500/25

            focus:!border-purple-500/50
            focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.06)]
          "
        >
          {children}
        </select>

        <UIIcon
          icon={
            ArrowDown01Icon
          }
          size={14}
          strokeWidth={1.8}
          className="
            pointer-events-none

            absolute
            right-3
            top-1/2

            -translate-y-1/2

            text-[var(--hexa-muted)]

            transition-colors
            duration-150

            group-focus-within:text-purple-500
          "
        />
      </div>
    </label>
  )
}

/* ========================================================================== */
/* Pagination                                                                 */
/* ========================================================================== */

function PaginationButton({
  disabled,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="
        flex
        h-9
        transform-gpu
        items-center
        gap-1.5

        rounded-xl

        border
        border-[var(--hexa-border)]

        bg-[var(--hexa-card)]

        px-3

        text-[12px]
        font-medium
        text-[var(--hexa-text)]

        transition-[transform,background-color,border-color,color]
        duration-150
        ease-out

        hover:scale-[1.015]
        hover:border-purple-500/25
        hover:bg-purple-500/[0.05]
        hover:text-purple-500

        active:scale-[0.98]

        disabled:pointer-events-none
        disabled:opacity-35
      "
    >
      {children}
    </button>
  )
}

/* ========================================================================== */
/* Skeleton                                                                   */
/* ========================================================================== */

function CardsSkeleton() {
  return (
    <div
      className="
        mt-4

        grid
        gap-4

        md:grid-cols-2
        xl:grid-cols-3
      "
    >
      {Array.from({
        length: 6,
      }).map(
        (_, index) => (
          <div
            key={index}
            className="
              h-[390px]

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