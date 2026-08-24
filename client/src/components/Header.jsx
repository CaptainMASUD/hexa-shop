import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router-dom'

import { HugeiconsIcon } from '@hugeicons/react'

import {
  ArrowDown01Icon,
  Cancel01Icon,
  FavouriteIcon,
  Logout01Icon,
  Menu01Icon,
  Moon02Icon,
  Notification03Icon,
  Search01Icon,
  ShoppingBag01Icon,
  Sun03Icon,
  UserCircleIcon,
  Wallet02Icon,
} from '@hugeicons/core-free-icons'

import {
  getCategories,
  getSuggestions,
} from '../api/catalog.api'

import {
  getNotifications,
  readAllNotifications,
} from '../api/features.api'

import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useCurrency } from '../contexts/CurrencyContext'

export default function Header() {
  const [categories, setCategories] = useState([])

  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [notifications, setNotifications] = useState([])

  const rootRef = useRef(null)
  const searchInputRef = useRef(null)

  const debounceRef = useRef(null)
  const requestIdRef = useRef(0)
  const suggestionCacheRef = useRef(new Map())

  const { cartCount } = useCart()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const {
    currency,
    setCurrency,
    currencies,
  } = useCurrency()

  const navigate = useNavigate()

  /* ====================================================================== */
  /* Categories                                                             */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    getCategories()
      .then((data) => {
        if (!active) return

        setCategories(
          Array.isArray(data)
            ? data
            : []
        )
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  /* ====================================================================== */
  /* Notifications                                                          */
  /* ====================================================================== */

  useEffect(() => {
    let active = true

    if (!user) {
      setNotifications([])
      return undefined
    }

    getNotifications()
      .then((data) => {
        if (!active) return

        setNotifications(
          Array.isArray(data)
            ? data
            : []
        )
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [user])

  /* ====================================================================== */
  /* Search Suggestions                                                     */
  /* ====================================================================== */

  useEffect(() => {
    clearTimeout(debounceRef.current)

    requestIdRef.current += 1

    const requestId =
      requestIdRef.current

    const term =
      query.trim()

    const cacheKey =
      term.toLowerCase()

    if (
      !searchOpen ||
      term.length < 2
    ) {
      setSuggestions([])
      setSearchLoading(false)

      return undefined
    }

    const cached =
      suggestionCacheRef.current.get(
        cacheKey
      )

    if (cached) {
      setSuggestions(cached)
      setSearchLoading(false)

      return undefined
    }

    setSearchLoading(true)

    debounceRef.current =
      setTimeout(async () => {
        try {
          const result =
            await getSuggestions(term)

          if (
            requestId !==
            requestIdRef.current
          ) {
            return
          }

          const items =
            Array.isArray(result)
              ? result
              : []

          suggestionCacheRef.current.set(
            cacheKey,
            items
          )

          setSuggestions(items)
        } catch {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setSuggestions([])
          }
        } finally {
          if (
            requestId ===
            requestIdRef.current
          ) {
            setSearchLoading(false)
          }
        }
      }, 260)

    return () => {
      clearTimeout(debounceRef.current)
    }
  }, [query, searchOpen])

  /* ====================================================================== */
  /* Focus Search                                                           */
  /* ====================================================================== */

  useEffect(() => {
    if (!searchOpen) {
      return undefined
    }

    const frame =
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [searchOpen])

  /* ====================================================================== */
  /* Outside Click                                                          */
  /* ====================================================================== */

  useEffect(() => {
    const handleOutsideClick = (
      event
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false)
        setNoticeOpen(false)
        setSearchOpen(false)
        setMobileOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      )
    }
  }, [])

  /* ====================================================================== */
  /* Keyboard                                                               */
  /* ====================================================================== */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault()

        setSearchOpen(true)
        setProfileOpen(false)
        setNoticeOpen(false)
        setMobileOpen(false)

        return
      }

      if (event.key === 'Escape') {
        setSearchOpen(false)
        setProfileOpen(false)
        setNoticeOpen(false)
        setMobileOpen(false)
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
  }, [])

  /* ====================================================================== */
  /* Actions                                                                */
  /* ====================================================================== */

  const toggleSearch = () => {
    setSearchOpen(
      (current) => !current
    )

    setNoticeOpen(false)
    setProfileOpen(false)
    setMobileOpen(false)
  }

  const toggleNotifications =
    () => {
      /*
       * Search intentionally remains open.
       * Notification popup is above search panel.
       */

      setNoticeOpen(
        (current) => !current
      )

      setProfileOpen(false)
      setMobileOpen(false)
    }

  const toggleProfile = () => {
    setProfileOpen(
      (current) => !current
    )

    setNoticeOpen(false)
    setMobileOpen(false)
  }

  const toggleMobile = () => {
    setMobileOpen(
      (current) => !current
    )

    setSearchOpen(false)
    setProfileOpen(false)
    setNoticeOpen(false)
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])

    requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
  }

  const submitSearch = (
    event
  ) => {
    event.preventDefault()

    const value =
      query.trim()

    if (!value) {
      searchInputRef.current?.focus()
      return
    }

    navigate(
      `/products?q=${encodeURIComponent(
        value
      )}`
    )

    setSearchOpen(false)
    setMobileOpen(false)
    setSuggestions([])
  }

  const handleSuggestionClick =
    () => {
      setSearchOpen(false)
      setSuggestions([])
    }

  const unread =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length

  return (
    <header
      ref={rootRef}
      className="
        hexa-nav-surface
        fixed
        inset-x-0
        top-0
        z-50
        border-b
        border-[var(--hexa-border)]
        backdrop-blur-xl
      "
    >
      {/* ================================================================ */}
      {/* Navbar                                                           */}
      {/* ================================================================ */}

      <div
        className="
          hexa-container
          relative
          z-[90]
          flex
          h-16
          items-center
          justify-between
          gap-3
        "
      >
        {/* Logo */}

        <Link
          to="/"
          onClick={() => {
            setSearchOpen(false)
            setNoticeOpen(false)
            setProfileOpen(false)
            setMobileOpen(false)
          }}
          className="
            group
            flex
            shrink-0
            items-center
            gap-2.5
            text-[21px]
            font-black
            tracking-[-0.035em]
            text-[var(--hexa-text)]
          "
        >
          <span
            className="
              block
              h-8
              w-8
              shrink-0
              transform-gpu
              bg-purple-600
              will-change-transform

              transition-transform
              duration-150
              ease-out

              group-hover:scale-[1.035]
              group-hover:rotate-[1.5deg]

              group-active:scale-[0.97]
            "
            style={{
              clipPath:
                'polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)',
            }}
          />

          <span>
            HEXA
          </span>
        </Link>

        {/* ============================================================ */}
        {/* Desktop Navigation                                         */}
        {/* ============================================================ */}

        <nav
          className="
            hidden
            h-full
            items-center
            gap-1
            lg:flex
          "
        >
          <AnimatedNavLink
            to="/"
            end
          >
            Home
          </AnimatedNavLink>

          {categories
            .slice(0, 2)
            .map((category) => (
              <AnimatedNavLink
                key={category._id}
                to={`/category/${category.slug}`}
              >
                {category.name}
              </AnimatedNavLink>
            ))}

          <AnimatedNavLink
            to="/offers"
          >
            Offers
          </AnimatedNavLink>

          <AnimatedNavLink
            to="/products"
          >
            Marketplace
          </AnimatedNavLink>
        </nav>

        {/* ============================================================ */}
        {/* Right Controls                                              */}
        {/* ============================================================ */}

        <div
          className="
            flex
            items-center
            gap-0.5
            sm:gap-1
          "
        >
          {/* Currency */}

          <div
            className="
              relative
              hidden
              sm:block
            "
          >
            <select
              value={currency}
              onChange={(event) =>
                setCurrency(
                  event.target.value
                )
              }
              aria-label="Currency"
              className="
                h-9
                min-w-[76px]
                cursor-pointer
                appearance-none

                rounded-xl

                border
                border-[var(--hexa-border)]

                bg-[var(--hexa-card)]

                py-0
                pl-3
                pr-7

                text-[13px]
                font-medium
                tracking-[-0.01em]
                text-[var(--hexa-text)]

                outline-none

                transition-[border-color,background-color]
                duration-150
                ease-out

                hover:border-purple-500/40
                hover:bg-purple-500/[0.04]

                focus:border-purple-500/50
                focus:ring-2
                focus:ring-purple-500/10
              "
            >
              {currencies.map(
                (entry) => (
                  <option
                    key={entry.code}
                    value={entry.code}
                  >
                    {entry.code}
                  </option>
                )
              )}
            </select>

            <UIIcon
              icon={ArrowDown01Icon}
              size={13}
              strokeWidth={1.8}
              className="
                pointer-events-none
                absolute
                right-2.5
                top-1/2
                -translate-y-1/2
                text-[var(--hexa-muted)]
              "
            />
          </div>

          {/* Theme */}

          <IconButton
            onClick={toggleTheme}
            label="Toggle theme"
          >
            <UIIcon
              icon={
                theme === 'dark'
                  ? Sun03Icon
                  : Moon02Icon
              }
              size={21}
            />
          </IconButton>

          {/* Search */}

          <IconButton
            onClick={toggleSearch}
            label="Search"
            active={searchOpen}
          >
            <UIIcon
              icon={
                searchOpen
                  ? Cancel01Icon
                  : Search01Icon
              }
              size={21}
            />
          </IconButton>

          {/* Notifications */}

          {user && (
            <div
              className="
                relative
                z-[130]
              "
            >
              <IconButton
                onClick={
                  toggleNotifications
                }
                label="Notifications"
                active={noticeOpen}
              >
                <UIIcon
                  icon={
                    Notification03Icon
                  }
                  size={21}
                />

                {unread > 0 && (
                  <span
                    className="
                      absolute
                      -right-[1px]
                      -top-[1px]

                      flex
                      h-[17px]
                      min-w-[17px]
                      items-center
                      justify-center

                      rounded-full

                      border-2
                      border-[var(--hexa-card)]

                      bg-purple-600

                      px-1

                      text-[9px]
                      font-bold
                      leading-none
                      text-white
                    "
                  >
                    {unread > 9
                      ? '9+'
                      : unread}
                  </span>
                )}
              </IconButton>

              {noticeOpen && (
                <NotificationDropdown
                  notifications={
                    notifications
                  }
                  unread={unread}
                  onClose={() =>
                    setNoticeOpen(false)
                  }
                  onReadAll={async () => {
                    try {
                      await readAllNotifications()

                      setNotifications(
                        (current) =>
                          current.map(
                            (item) => ({
                              ...item,
                              read: true,
                            })
                          )
                      )
                    } catch {
                      // Keep current UI state.
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Cart */}

          <Link
            to="/cart"
            aria-label="Cart"
            className="
              relative

              flex
              h-9
              w-9
              transform-gpu
              items-center
              justify-center

              rounded-xl

              text-[var(--hexa-muted)]

              will-change-transform

              transition-[transform,background-color,color]
              duration-150
              ease-out

              hover:scale-[1.03]
              hover:bg-purple-500/[0.07]
              hover:text-purple-600

              active:scale-[0.96]
            "
          >
            <UIIcon
              icon={ShoppingBag01Icon}
              size={21}
            />

            {cartCount > 0 && (
              <span
                className="
                  absolute
                  -right-[2px]
                  -top-[2px]

                  flex
                  h-[17px]
                  min-w-[17px]
                  items-center
                  justify-center

                  rounded-full

                  border-2
                  border-[var(--hexa-card)]

                  bg-purple-600

                  px-1

                  text-[9px]
                  font-bold
                  leading-none
                  text-white
                "
              >
                {cartCount > 99
                  ? '99+'
                  : cartCount}
              </span>
            )}
          </Link>

          {/* Profile */}

          {user ? (
            <div
              className="
                relative
                z-[130]
                ml-1
                hidden
                sm:block
              "
            >
              <button
                type="button"
                onClick={toggleProfile}
                aria-expanded={
                  profileOpen
                }
                className="
                  group

                  flex
                  h-9
                  transform-gpu
                  items-center
                  gap-2

                  rounded-xl

                  border
                  border-[var(--hexa-border)]

                  bg-[var(--hexa-card)]

                  px-2.5

                  text-sm
                  font-medium
                  text-[var(--hexa-text)]

                  will-change-transform

                  transition-[transform,border-color,background-color]
                  duration-150
                  ease-out

                  hover:scale-[1.015]
                  hover:border-purple-500/35
                  hover:bg-purple-500/[0.045]

                  active:scale-[0.97]
                "
              >
                <UIIcon
                  icon={UserCircleIcon}
                  size={20}
                  className="
                    text-[var(--hexa-muted)]

                    transition-colors
                    duration-150

                    group-hover:text-purple-600
                  "
                />

                <span
                  className="
                    hidden
                    max-w-[95px]
                    truncate
                    md:inline
                  "
                >
                  {user.name?.split(
                    ' '
                  )[0] || 'Account'}
                </span>

                <UIIcon
                  icon={
                    ArrowDown01Icon
                  }
                  size={13}
                  strokeWidth={1.8}
                  className={`
                    text-[var(--hexa-muted)]

                    transition-[transform,color]
                    duration-150
                    ease-out

                    ${
                      profileOpen
                        ? 'rotate-180 text-purple-600'
                        : 'group-hover:text-purple-600'
                    }
                  `}
                />
              </button>

              {profileOpen && (
                <ProfileDropdown
                  user={user}
                  logout={logout}
                  onClose={() =>
                    setProfileOpen(false)
                  }
                />
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="
                hexa-btn

                ml-1

                !h-9
                !rounded-xl
                !px-4
                !py-0

                transform-gpu

                text-sm
                font-medium

                transition-transform
                duration-150
                ease-out

                hover:scale-[1.015]

                active:scale-[0.97]
              "
            >
              Sign in
            </Link>
          )}

          {/* Mobile Menu */}

          <button
            type="button"
            onClick={toggleMobile}
            aria-label="Menu"
            aria-expanded={
              mobileOpen
            }
            className="
              flex
              h-9
              w-9
              transform-gpu
              items-center
              justify-center

              rounded-xl

              text-[var(--hexa-muted)]

              will-change-transform

              transition-[transform,background-color,color]
              duration-150
              ease-out

              hover:scale-[1.03]
              hover:bg-purple-500/[0.07]
              hover:text-purple-600

              active:scale-[0.96]

              lg:hidden
            "
          >
            <UIIcon
              icon={
                mobileOpen
                  ? Cancel01Icon
                  : Menu01Icon
              }
              size={21}
            />
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Search Panel                                                     */}
      {/* ================================================================ */}

      <div
        className={`
          hexa-nav-surface

          absolute
          inset-x-0
          top-full

          z-[60]

          origin-top
          transform-gpu

          border-t
          border-[var(--hexa-border)]

          will-change-transform

          transition-[opacity,transform,visibility]
          duration-200
          ease-out

          ${
            searchOpen
              ? `
                visible
                translate-y-0
                scale-y-100
                opacity-100
              `
              : `
                pointer-events-none
                invisible
                -translate-y-1
                scale-y-[0.98]
                opacity-0
              `
          }
        `}
        aria-hidden={
          !searchOpen
        }
      >
        <div
          className="
            hexa-container
            py-2.5
          "
        >
          <form
            onSubmit={submitSearch}
            className="
              mx-auto
              flex
              max-w-[720px]
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
                icon={Search01Icon}
                size={18}
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
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                autoComplete="off"
                aria-label="Search marketplace"
                placeholder="Search streaming, games, tools, bundles..."
                className="
                  hexa-input

                  !h-10
                  !rounded-xl
                  !py-0
                  !pl-10
                  !pr-10

                  text-[14px]
                  font-normal

                  transition-[border-color,box-shadow,background-color]
                  duration-150
                  ease-out

                  focus:!border-purple-500/60
                  focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.08)]
                "
              />

              {query && (
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

                    hover:bg-purple-500/[0.08]
                    hover:text-purple-600
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

              {(searchLoading ||
                suggestions.length >
                  0) && (
                <div
                  className="
                    hexa-dropdown

                    absolute
                    left-0
                    right-0
                    top-[46px]

                    z-[80]

                    max-h-[340px]
                    overflow-y-auto

                    rounded-xl

                    p-1.5
                  "
                >
                  {searchLoading ? (
                    <div
                      className="
                        flex
                        items-center
                        gap-3

                        px-3
                        py-3

                        text-sm
                        text-[var(--hexa-muted)]
                      "
                    >
                      <span
                        className="
                          h-4
                          w-4

                          animate-spin

                          rounded-full

                          border-2
                          border-purple-500/20
                          border-t-purple-600
                        "
                      />

                      Searching...
                    </div>
                  ) : (
                    suggestions.map(
                      (item) => (
                        <Link
                          key={
                            item._id
                          }
                          to={`/product/${item.slug}`}
                          onClick={
                            handleSuggestionClick
                          }
                          className="
                            flex
                            items-center
                            justify-between
                            gap-4

                            rounded-lg

                            px-3
                            py-2.5

                            text-sm

                            transition-colors
                            duration-150

                            hover:bg-purple-500/[0.06]
                          "
                        >
                          <span
                            className="
                              min-w-0
                              truncate

                              font-normal

                              text-[var(--hexa-text)]
                            "
                          >
                            {item.name}
                          </span>

                          <span
                            className="
                              shrink-0

                              text-xs
                              font-medium
                              text-purple-600
                            "
                          >
                            ৳
                            {item.salePrice ||
                              item.regularPrice}
                          </span>
                        </Link>
                      )
                    )
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="
                hexa-btn

                !flex
                !h-10
                !shrink-0
                !items-center
                !gap-2
                !rounded-xl
                !px-4
                !py-0

                transform-gpu
                will-change-transform

                text-sm
                font-medium

                transition-transform
                duration-150
                ease-out

                hover:scale-[1.015]

                active:scale-[0.96]
              "
            >
              <UIIcon
                icon={Search01Icon}
                size={17}
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
        </div>
      </div>

      {/* ================================================================ */}
      {/* Mobile Navigation                                                */}
      {/* ================================================================ */}

      <div
        className={`
          hexa-nav-surface

          absolute
          inset-x-0
          top-full

          z-[70]

          origin-top
          transform-gpu

          border-t
          border-[var(--hexa-border)]

          will-change-transform

          transition-[opacity,transform,visibility]
          duration-200
          ease-out

          lg:hidden

          ${
            mobileOpen
              ? `
                visible
                translate-y-0
                scale-y-100
                opacity-100
              `
              : `
                pointer-events-none
                invisible
                -translate-y-1
                scale-y-[0.98]
                opacity-0
              `
          }
        `}
      >
        <nav
          className="
            hexa-container

            flex
            flex-col
            gap-0.5

            py-2.5

            text-sm
            font-normal
            text-[var(--hexa-text)]
          "
        >
          <MobileNavLink
            to="/"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Home
          </MobileNavLink>

          {categories.map(
            (category) => (
              <MobileNavLink
                key={category._id}
                to={`/category/${category.slug}`}
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                {category.name}
              </MobileNavLink>
            )
          )}

          <MobileNavLink
            to="/offers"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            Offers & Bundles
          </MobileNavLink>

          <MobileNavLink
            to="/products"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            All Products
          </MobileNavLink>

          {user && (
            <>
              <MobileNavLink
                to="/wishlist"
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                Wishlist
              </MobileNavLink>

              <MobileNavLink
                to={
                  user.role ===
                  'admin'
                    ? '/admin'
                    : '/account'
                }
                onClick={() =>
                  setMobileOpen(false)
                }
              >
                My Account
              </MobileNavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

/* ======================================================================== */
/* Desktop Navigation                                                       */
/* ======================================================================== */

function AnimatedNavLink({
  to,
  end = false,
  children,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({
        isActive,
      }) => `
        relative

        flex
        h-full
        items-center

        px-3

        text-[15px]
        font-medium
        tracking-[-0.01em]

        transition-colors
        duration-150
        ease-out

        ${
          isActive
            ? `
              text-[var(--hexa-text)]
            `
            : `
              text-[var(--hexa-muted)]

              hover:text-[var(--hexa-text)]
            `
        }

        after:absolute
        after:bottom-[9px]
        after:left-1/2

        after:h-[2px]
        after:rounded-full

        after:bg-purple-600

        after:transition-[width,left]
        after:duration-200
        after:ease-out

        ${
          isActive
            ? `
              after:left-[28%]
              after:w-[44%]
            `
            : `
              after:w-0

              hover:after:left-[28%]
              hover:after:w-[44%]
            `
        }
      `}
    >
      {children}
    </NavLink>
  )
}

/* ======================================================================== */
/* Hugeicons                                                                */
/* ======================================================================== */

function UIIcon({
  icon,
  size = 20,
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

/* ======================================================================== */
/* Icon Button                                                              */
/* ======================================================================== */

function IconButton({
  onClick,
  label,
  active = false,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      title={label}
      className={`
        relative

        flex
        h-9
        w-9
        transform-gpu
        items-center
        justify-center

        rounded-xl

        will-change-transform

        transition-[transform,background-color,color]
        duration-150
        ease-out

        hover:scale-[1.03]

        active:scale-[0.96]

        ${
          active
            ? `
              bg-purple-500/[0.10]
              text-purple-600
            `
            : `
              text-[var(--hexa-muted)]

              hover:bg-purple-500/[0.07]
              hover:text-purple-600
            `
        }
      `}
    >
      {children}
    </button>
  )
}

/* ======================================================================== */
/* Mobile Navigation                                                        */
/* ======================================================================== */

function MobileNavLink({
  to,
  onClick,
  children,
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({
        isActive,
      }) => `
        rounded-xl

        px-3
        py-2.5

        font-normal

        transition-[background-color,color]
        duration-150

        ${
          isActive
            ? `
              bg-purple-500/[0.08]
              text-purple-600
            `
            : `
              text-[var(--hexa-text)]

              hover:bg-purple-500/[0.06]
              hover:text-purple-600
            `
        }
      `}
    >
      {children}
    </NavLink>
  )
}

/* ======================================================================== */
/* Profile Dropdown                                                         */
/* ======================================================================== */

function ProfileDropdown({
  user,
  logout,
  onClose,
}) {
  const handleLogout =
    async () => {
      onClose?.()

      await logout()
    }

  return (
    <div
      className="
        hexa-dropdown

        absolute
        right-0
        top-11

        z-[140]

        w-64

        overflow-hidden
        rounded-xl

        p-1.5
      "
    >
      <div
        className="
          border-b
          border-[var(--hexa-border)]

          px-3
          pb-3
          pt-2
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center

              rounded-full

              bg-purple-500/10
              text-purple-600
            "
          >
            <UIIcon
              icon={UserCircleIcon}
              size={21}
            />
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate
                text-sm
                font-medium
                text-[var(--hexa-text)]
              "
            >
              {user.name}
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-[11px]
                font-normal
                text-[var(--hexa-muted)]
              "
            >
              {user.email}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-1">
        <DropdownLink
          to={
            user.role === 'admin'
              ? '/admin'
              : '/account'
          }
          onClick={onClose}
          icon={UserCircleIcon}
        >
          Dashboard
        </DropdownLink>

        {user.role !== 'admin' && (
          <>
            <DropdownLink
              to="/wishlist"
              onClick={onClose}
              icon={FavouriteIcon}
            >
              Wishlist
            </DropdownLink>

            <DropdownLink
              to="/account/rewards"
              onClick={onClose}
              icon={Wallet02Icon}
            >
              Rewards & Wallet
            </DropdownLink>
          </>
        )}

        <button
          type="button"
          onClick={
            handleLogout
          }
          className="
            flex
            w-full
            items-center
            gap-3

            rounded-lg

            px-3
            py-2.5

            text-left
            text-sm
            font-normal
            text-rose-500

            transition-colors
            duration-150

            hover:bg-rose-500/[0.07]
          "
        >
          <UIIcon
            icon={Logout01Icon}
            size={18}
          />

          Sign out
        </button>
      </div>
    </div>
  )
}

/* ======================================================================== */
/* Dropdown Link                                                            */
/* ======================================================================== */

function DropdownLink({
  to,
  onClick,
  icon,
  children,
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="
        flex
        items-center
        gap-3

        rounded-lg

        px-3
        py-2.5

        text-sm
        font-normal
        text-[var(--hexa-text)]

        transition-[background-color,color]
        duration-150

        hover:bg-purple-500/[0.07]
        hover:text-purple-600
      "
    >
      <UIIcon
        icon={icon}
        size={18}
      />

      {children}
    </Link>
  )
}

/* ======================================================================== */
/* Notification Dropdown                                                    */
/* ======================================================================== */

function NotificationDropdown({
  notifications,
  unread,
  onReadAll,
  onClose,
}) {
  return (
    <div
      className="
        hexa-dropdown

        absolute
        right-0
        top-11

        z-[150]

        w-[min(360px,calc(100vw-2rem))]

        overflow-hidden

        rounded-xl
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-4

          border-b
          border-[var(--hexa-border)]

          px-4
          py-3
        "
      >
        <div className="min-w-0">
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <p
              className="
                font-medium
                text-[var(--hexa-text)]
              "
            >
              Notifications
            </p>

            {unread > 0 && (
              <span
                className="
                  rounded-full

                  bg-purple-500/10

                  px-2
                  py-0.5

                  text-[10px]
                  font-medium
                  text-purple-600
                "
              >
                {unread} new
              </span>
            )}
          </div>

          <p
            className="
              mt-0.5
              text-[11px]
              font-normal
              text-[var(--hexa-muted)]
            "
          >
            Your latest account updates
          </p>
        </div>

        <button
          type="button"
          onClick={
            onReadAll
          }
          disabled={
            unread === 0
          }
          className="
            shrink-0

            rounded-lg

            px-2
            py-1.5

            text-[11px]
            font-medium
            text-purple-600

            transition-colors
            duration-150

            hover:bg-purple-500/[0.07]

            disabled:pointer-events-none
            disabled:opacity-40
          "
        >
          Mark all read
        </button>
      </div>

      <div
        className="
          max-h-[340px]
          overflow-y-auto

          p-1.5
        "
      >
        {notifications.length ? (
          notifications
            .slice(0, 8)
            .map(
              (
                notification
              ) => (
                <Link
                  key={
                    notification._id
                  }
                  to={
                    notification.link ||
                    '#'
                  }
                  onClick={onClose}
                  className={`
                    block

                    rounded-lg

                    px-3
                    py-2.5

                    transition-colors
                    duration-150

                    hover:bg-purple-500/[0.05]

                    ${
                      notification.read
                        ? 'opacity-65'
                        : ''
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      gap-3
                    "
                  >
                    <span
                      className={`
                        mt-[7px]

                        h-2
                        w-2
                        shrink-0

                        rounded-full

                        ${
                          notification.read
                            ? 'bg-gray-400'
                            : 'bg-purple-500'
                        }
                      `}
                    />

                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <p
                        className="
                          text-sm
                          font-medium
                          leading-5
                          text-[var(--hexa-text)]
                        "
                      >
                        {
                          notification.title
                        }
                      </p>

                      <p
                        className="
                          mt-1

                          line-clamp-2

                          text-xs
                          font-normal
                          leading-5
                          text-[var(--hexa-muted)]
                        "
                      >
                        {
                          notification.message
                        }
                      </p>
                    </div>
                  </div>
                </Link>
              )
            )
        ) : (
          <div
            className="
              px-6
              py-9
              text-center
            "
          >
            <div
              className="
                mx-auto
                mb-3

                flex
                h-10
                w-10
                items-center
                justify-center

                rounded-full

                bg-purple-500/[0.08]
                text-purple-600
              "
            >
              <UIIcon
                icon={
                  Notification03Icon
                }
                size={20}
              />
            </div>

            <p
              className="
                text-sm
                font-medium
                text-[var(--hexa-text)]
              "
            >
              No notifications
            </p>

            <p
              className="
                mt-1

                text-xs
                font-normal
                text-[var(--hexa-muted)]
              "
            >
              You&apos;re all caught up.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}