import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { BsHexagonFill } from 'react-icons/bs'
import {
  FaBoxes,
  FaChartBar,
  FaClipboardList,
  FaCreditCard,
  FaHistory,
  FaImage,
  FaLayerGroup,
  FaLightbulb,
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaTachometerAlt,
  FaUserFriends,
  FaWarehouse,
} from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const items = [
  ['Dashboard', '/admin', FaTachometerAlt, true],
  ['Products', '/admin/products', FaBoxes],
  ['Categories', '/admin/categories', FaLayerGroup],
  ['Inventory', '/admin/inventory', FaWarehouse],
  ['Orders', '/admin/orders', FaClipboardList],
  ['Payment Methods', '/admin/payment-methods', FaCreditCard],
  ['Banners', '/admin/banners', FaImage],
  ['Users', '/admin/users', FaUserFriends],
  ['Reports', '/admin/reports', FaChartBar],
  ['Growth & Features', '/admin/growth', FaLightbulb],
  ['Audit Logs', '/admin/audit', FaHistory],
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[var(--hexa-bg)] text-[var(--hexa-text)] lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="hexa-nav-surface border-b lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r flex flex-col overflow-hidden">
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-[var(--hexa-border)]/50">
          <Link to="/admin" className="flex items-center gap-2 font-bold text-[var(--hexa-text)]">
            <BsHexagonFill className="text-2xl text-purple-600 shrink-0" />
            <span className="tracking-tight font-extrabold text-base">HEXA Admin</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2 text-[var(--hexa-muted)] transition hover:bg-[var(--hexa-accent-soft)] hover:text-[var(--hexa-text)]"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <FaSun className="text-amber-400" /> : <FaMoon className="text-slate-600" />}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:min-h-0 lg:flex-col lg:space-y-1 lg:overflow-y-auto lg:overflow-x-hidden custom-scrollbar">
          {items.map(([label, path, Icon, end]) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-[var(--hexa-accent-soft)] text-[var(--hexa-text)] font-semibold ring-1 ring-inset ring-[var(--hexa-border)]'
                  : 'text-[var(--hexa-muted)] hover:bg-[var(--hexa-surface)] hover:text-[var(--hexa-text)]'
              }`}
            >
              <Icon className="text-base text-[var(--hexa-accent)] shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Fixed Footer Profile & Actions (Never Overlaps) */}
        <div className="hidden shrink-0 border-t border-[var(--hexa-border)]/60 p-4 bg-[var(--hexa-card)]/40 lg:block">
          <div className="mb-3 rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3 shadow-xs">
            <p className="text-sm font-bold text-[var(--hexa-text)] truncate">{user?.name || 'HEXA Administrator'}</p>
            <div className="mt-2.5 pt-2 border-t border-[var(--hexa-border)]/40">
              <Link to="/" target="_blank" className="text-xs font-semibold text-purple-400 hover:underline">
                Open storefront →
              </Link>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 hover:border-rose-500/40"
          >
            <FaSignOutAlt /> Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
