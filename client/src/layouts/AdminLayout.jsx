import { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChartBarLineIcon,
  Clock01Icon,
  Coins01Icon,
  CreditCardIcon,
  DashboardSpeed01Icon,
  Edit02Icon,
  HexagonIcon,
  Image01Icon,
  Invoice01Icon,
  Layers01Icon,
  LockPasswordIcon,
  Logout01Icon,
  Moon02Icon,
  PackageIcon,
  Rocket01Icon,
  Shield01Icon,
  Store01Icon,
  Sun01Icon,
  UserCircleIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { apiErrorMessage } from '../api/client'
import Modal from '../components/Modal'
import AvatarUploader from '../components/AvatarUploader'

const items = [
  ['Dashboard', '/admin', DashboardSpeed01Icon, true],
  ['Products', '/admin/products', PackageIcon],
  ['Categories', '/admin/categories', Layers01Icon],
  ['Inventory', '/admin/inventory', Store01Icon],
  ['Orders', '/admin/orders', Invoice01Icon],
  ['Wallet', '/admin/wallet', Coins01Icon],
  ['Payment Methods', '/admin/payment-methods', CreditCardIcon],
  ['Banners', '/admin/banners', Image01Icon],
  ['Users', '/admin/users', UserGroupIcon],
  ['Reports', '/admin/reports', ChartBarLineIcon],
  ['Growth & Features', '/admin/growth', Rocket01Icon],
  ['Audit Logs', '/admin/audit', Clock01Icon],
]

export default function AdminLayout() {
  const { user, logout, updateProfile } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { notify } = useToast()
  const navigate = useNavigate()

  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  const openProfileModal = () => {
    setProfileForm({
      name: user?.name || '',
      phone: user?.phone || '',
    })
    setProfileModalOpen(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileForm.name.trim()) {
      notify('Name is required', 'error')
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
      })
      notify('Admin profile updated successfully', 'success')
      setProfileModalOpen(false)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to update profile'), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

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
            <div className="flex items-center gap-3">
              {/* Profile Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-extrabold text-sm overflow-hidden">
                {user?.avatar?.url ? (
                  <img src={user.avatar.url} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'A'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-[var(--hexa-text)] truncate">{user?.name || 'HEXA Admin'}</p>
                </div>
                <p className="font-mono text-[10px] text-purple-400 truncate">@{user?.username || 'admin'}</p>
              </div>
              <button
                type="button"
                onClick={openProfileModal}
                className="rounded-lg p-1.5 text-[var(--hexa-muted)] hover:bg-purple-500/15 hover:text-purple-400 transition"
                title="View & Edit Profile"
              >
                <HugeiconsIcon icon={Edit02Icon} size={14} />
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[var(--hexa-border)]/40 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={openProfileModal}
                className="font-semibold text-purple-400 hover:underline text-[11px]"
              >
                View Profile
              </button>
              <Link to="/" target="_blank" className="font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] text-[11px]">
                Storefront →
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

      {/* Admin Profile Modal */}
      <Modal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="Admin Profile Settings"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-xs">
          {/* Cloudinary Avatar Uploader Section */}
          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-4">
            <h4 className="font-bold text-xs text-[var(--hexa-text)] mb-3">Admin Profile Photo</h4>
            <AvatarUploader size="md" />
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                  Admin Username
                </label>
                <input
                  type="text"
                  disabled
                  value={`@${user?.username || 'admin'}`}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 px-3 py-2 text-xs font-mono text-purple-400 opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)]/50 px-3 py-2 text-xs text-[var(--hexa-muted)] opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+8801700000000"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            {/* Role & Security Badges */}
            <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--hexa-muted)]">Access Tier:</span>
                <span className="inline-flex items-center gap-1 font-bold text-purple-300">
                  <HugeiconsIcon icon={Shield01Icon} size={12} />
                  {user?.isMasterAdmin ? 'Master Administrator (Root)' : 'Staff Administrator'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--hexa-muted)]">Two-Factor Authentication:</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${user?.twoFactorEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <HugeiconsIcon icon={LockPasswordIcon} size={12} />
                  {user?.twoFactorEnabled ? 'Enabled & Active' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[var(--hexa-border)] pt-4">
              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-4 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 disabled:opacity-50 transition"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
