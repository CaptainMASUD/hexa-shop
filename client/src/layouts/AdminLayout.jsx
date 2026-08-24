import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartBarLineIcon,
  Clock01Icon,
  CreditCardIcon,
  DashboardSpeed01Icon,
  HexagonIcon,
  Image01Icon,
  Invoice01Icon,
  Layers01Icon,
  Logout01Icon,
  Moon02Icon,
  PackageIcon,
  Rocket01Icon,
  Store01Icon,
  Sun01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const items = [
  ['Dashboard', '/admin', DashboardSpeed01Icon, true],
  ['Products', '/admin/products', PackageIcon],
  ['Categories', '/admin/categories', Layers01Icon],
  ['Inventory', '/admin/inventory', Store01Icon],
  ['Orders', '/admin/orders', Invoice01Icon],
  ['Payment Methods', '/admin/payment-methods', CreditCardIcon],
  ['Banners', '/admin/banners', Image01Icon],
  ['Users', '/admin/users', UserGroupIcon],
  ['Reports', '/admin/reports', ChartBarLineIcon],
  ['Growth & Features', '/admin/growth', Rocket01Icon],
  ['Audit Logs', '/admin/audit', Clock01Icon],
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
            <HugeiconsIcon icon={HexagonIcon} size={24} className="text-purple-600 shrink-0" />
            <span className="tracking-tight font-extrabold text-base">HEXA Admin</span>
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-xl p-2 text-[var(--hexa-muted)] transition hover:bg-[var(--hexa-accent-soft)] hover:text-[var(--hexa-text)]"
            aria-label="Toggle theme"
          >
            <HugeiconsIcon
              icon={theme === 'dark' ? Sun01Icon : Moon02Icon}
              size={18}
              className={theme === 'dark' ? 'text-amber-400' : 'text-slate-400'}
            />
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
              <HugeiconsIcon icon={Icon} size={18} className="shrink-0 text-[var(--hexa-accent)]" />
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
            <HugeiconsIcon icon={Logout01Icon} size={15} /> Sign out
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
