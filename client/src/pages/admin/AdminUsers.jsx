import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert02Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  Edit02Icon,
  LockPasswordIcon,
  Search01Icon,
  Shield01Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserIcon,
  UserShield01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'
import {
  adminGet,
  adminPatch,
  adminPost,
  adminPut,
  adminDelete,
} from '../../api/admin.api'
import { apiErrorMessage } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import AdminPageHeader from '../../components/AdminPageHeader'
import StatusBadge from '../../components/StatusBadge'
import AdminCursorPagination from '../../components/AdminCursorPagination'
import Modal from '../../components/Modal'

export default function AdminUsers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'users'

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName })
  }

  return (
    <>
      <AdminPageHeader
        title="Users & Staff Management"
        description="Manage customer accounts, administrators & staff roles, account statuses, and system permissions."
      />

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--hexa-border)] pb-3">
        {[
          ['users', 'Customer Accounts', UserIcon],
          ['admins', 'Admins & Staff', UserShield01Icon],
        ].map(([key, label, Icon]) => {
          const isActive = currentTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                isActive
                  ? 'bg-[var(--hexa-accent)] text-white shadow-md'
                  : 'bg-[var(--hexa-card)] text-[var(--hexa-muted)] hover:bg-[var(--hexa-surface)] hover:text-[var(--hexa-text)] border border-[var(--hexa-border)]'
              }`}
            >
              <HugeiconsIcon icon={Icon} size={15} />
              {label}
            </button>
          )
        })}
      </div>

      {currentTab === 'users' && <UsersTab />}
      {currentTab === 'admins' && <AdminsStaffTab />}
    </>
  )
}

/* =========================================================================
   TAB 1: CUSTOMERS & USERS MANAGEMENT
   ========================================================================= */
function UsersTab() {
  const { notify } = useToast()
  const [items, setItems] = useState([])
  const [roles, setRoles] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(30)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    selectedRole = roleFilter,
    selectedActive = activeFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ && searchQ.trim()) params.q = searchQ.trim()
      if (selectedRole && selectedRole.trim()) params.role = selectedRole.trim()
      if (selectedActive) params.active = selectedActive

      const [u, r] = await Promise.all([
        adminGet('/users', params),
        adminGet('/features/roles').catch(() => ({ data: [] })),
      ])

      setItems(u.data || [])
      setMeta(u.meta || {})
      setRoles(r.data || [])
    } catch (e) {
      notify(apiErrorMessage(e, 'Failed to load users'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(null, 'next', limit, '', '', '').catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, activeFilter])

  const search = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, roleFilter, activeFilter)
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q, roleFilter, activeFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q, roleFilter, activeFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q, roleFilter, activeFilter)
  }

  const toggle = async (item) => {
    try {
      await adminPatch(`/users/${item._id}/status`, { isActive: !item.isActive })
      notify(`User ${item.isActive ? 'deactivated' : 'activated'}`)
      load(null, 'next', limit, q, roleFilter, activeFilter)
    } catch (e) {
      notify(apiErrorMessage(e), 'error')
    }
  }

  const [roleModalUser, setRoleModalUser] = useState(null)
  const [roleModalRoleId, setRoleModalRoleId] = useState('')
  const [roleModalBaseRole, setRoleModalBaseRole] = useState('user')
  const [roleModalSaving, setRoleModalSaving] = useState(false)

  const openAssignRoleModal = (item) => {
    setRoleModalUser(item)
    setRoleModalRoleId(item.roleRef?._id || item.roleRef || '')
    setRoleModalBaseRole(item.role || 'user')
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    if (!roleModalUser) return
    setRoleModalSaving(true)
    try {
      const selected = roles.find((r) => r._id === roleModalRoleId)
      await adminPatch(`/features/users/${roleModalUser._id}/role`, {
        roleId: selected?._id || null,
        permissions: selected?.permissions || [],
        baseRole: roleModalBaseRole,
      })
      notify('User role and access permissions updated', 'success')
      setRoleModalUser(null)
      load(null, 'next', limit, q, roleFilter, activeFilter)
    } catch (err) {
      notify(apiErrorMessage(err), 'error')
    } finally {
      setRoleModalSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={search} className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
          />
          <input
            className="hexa-input !pl-8.5 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email or phone..."
          />
        </div>

        <select
          className="hexa-input sm:w-40 text-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="user">Customer / User</option>
          <option value="admin">Admin</option>
        </select>

        <select
          className="hexa-input sm:w-40 text-xs"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive / Banned</option>
        </select>

        <button type="submit" className="hexa-btn text-xs !py-2 !px-4">
          Search
        </button>

        {(q || roleFilter || activeFilter) && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setRoleFilter('')
              setActiveFilter('')
              load(null, 'next', limit, '', '', '')
            }}
            className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-3 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
          >
            Reset
          </button>
        )}
      </form>

      <div className="hexa-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-gray-400">
              <tr>
                {['Customer', 'Email / Phone', 'Role', 'Wallet Balance', 'Points', 'Referral Code', 'Joined', 'Status', 'Actions'].map(
                  (h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-b border-white/5 hover:bg-white/[0.02] transition">
                    <td className="px-5 py-4 font-medium text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="text-gray-300">{item.email}</p>
                      <p className="font-mono text-gray-500 text-[11px]">{item.phone || '—'}</p>
                    </td>
                    <td className="px-5 py-4 capitalize">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                          item.role === 'admin'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : 'text-gray-300'
                        }`}
                      >
                        {item.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-400 text-sm">
                      ৳{Number(item.walletBalance || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-purple-400 font-mono text-xs">{item.loyaltyPoints || 0}</td>
                    <td className="px-5 py-4 text-xs font-mono text-gray-500">{item.referralCode || '—'}</td>
                    <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={item.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(item)}
                          className="rounded px-2.5 py-1 text-xs font-semibold text-purple-400 hover:bg-purple-500/10 transition"
                          title="View Profile Details"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssignRoleModal(item)}
                          className="rounded px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-white/5 transition"
                          title="Assign Staff Role"
                        >
                          Role
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(item)}
                          className={`rounded px-2 py-1 text-xs font-semibold transition ${
                            item.isActive
                              ? 'text-rose-400 hover:bg-rose-500/10'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminCursorPagination
          meta={meta}
          onNext={handleNext}
          onPrev={handlePrev}
          limit={limit}
          onLimitChange={handleLimitChange}
          loading={loading}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* User Details Modal */}
      <Modal
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={`User Account: ${selectedUser?.name || ''}`}
        maxWidth="max-w-md"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-[var(--hexa-surface)] p-3.5 border border-[var(--hexa-border)] space-y-2">
              <div>
                <p className="text-[var(--hexa-muted)]">Full Name:</p>
                <p className="font-bold text-[var(--hexa-text)]">{selectedUser.name}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Email Address:</p>
                <p className="font-bold text-[var(--hexa-text)]">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Phone Number:</p>
                <p className="font-bold text-[var(--hexa-text)]">{selectedUser.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-[var(--hexa-muted)]">Account Role:</p>
                <p className="font-bold text-purple-400 capitalize">{selectedUser.role}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                <div>
                  <p className="text-[var(--hexa-muted)]">Wallet Balance:</p>
                  <p className="font-black text-emerald-400 text-sm">৳{Number(selectedUser.walletBalance || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[var(--hexa-muted)]">Loyalty Points:</p>
                  <p className="font-black text-purple-400 text-sm">{selectedUser.loyaltyPoints || 0} pts</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--hexa-border)]">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="hexa-btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Role Assignment Modal */}
      <Modal
        open={Boolean(roleModalUser)}
        onClose={() => setRoleModalUser(null)}
        title={`Assign Role & Permissions: ${roleModalUser?.name || ''}`}
        maxWidth="max-w-lg"
      >
        {roleModalUser && (
          <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
            <div className="rounded-lg bg-[var(--hexa-surface)] p-3 border border-[var(--hexa-border)] space-y-1">
              <p className="text-[var(--hexa-muted)]">User: <span className="font-semibold text-white">{roleModalUser.name}</span> ({roleModalUser.email})</p>
              <p className="text-[var(--hexa-muted)]">Current Role: <span className="font-semibold capitalize text-purple-400">{roleModalUser.role}</span></p>
            </div>

            <div>
              <label className="block text-[var(--hexa-muted)] mb-1 font-medium">Base Role</label>
              <select
                className="hexa-input w-full text-xs"
                value={roleModalBaseRole}
                onChange={(e) => setRoleModalBaseRole(e.target.value)}
              >
                <option value="user">Customer / Regular User</option>
                <option value="admin">Administrator / Staff</option>
              </select>
              <p className="mt-1 text-[11px] text-[var(--hexa-muted)]">
                {roleModalBaseRole === 'admin'
                  ? 'Grants access to the Admin Panel. Assign custom permissions below if needed.'
                  : 'Customer accounts cannot access the admin panel.'}
              </p>
            </div>

            <div>
              <label className="block text-[var(--hexa-muted)] mb-1 font-medium">Custom Staff Role Profile</label>
              <select
                className="hexa-input w-full text-xs"
                value={roleModalRoleId}
                onChange={(e) => setRoleModalRoleId(e.target.value)}
              >
                <option value="">No Custom Profile (Standard Role)</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.permissions?.length || 0} permissions)
                  </option>
                ))}
              </select>
            </div>

            {roleModalRoleId && (
              <div className="rounded-lg bg-black/20 p-3 border border-white/5 space-y-2">
                <p className="text-[11px] font-semibold text-purple-300">Included Permissions Preview:</p>
                <div className="flex flex-wrap gap-1.5">
                  {roles.find((r) => r._id === roleModalRoleId)?.permissions?.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {p}
                    </span>
                  )) || <span className="text-[11px] text-gray-500">None specified</span>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--hexa-border)]">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="hexa-btn-secondary text-xs"
                disabled={roleModalSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="hexa-btn text-xs !bg-purple-600 hover:!bg-purple-500"
                disabled={roleModalSaving}
              >
                {roleModalSaving ? 'Saving...' : 'Update Role'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

/* =========================================================================
   TAB 2: ADMINS & STAFF MANAGEMENT (CRUD ADMINS)
   ========================================================================= */

const AVAILABLE_PERMISSIONS = [
  { id: 'catalog.manage', label: 'Catalog & Products', category: 'Catalog', desc: 'Products, categories, plans, pricing' },
  { id: 'inventory.manage', label: 'Inventory & Keys', category: 'Inventory', desc: 'Stock quantities, game codes, digital keys' },
  { id: 'orders.manage', label: 'Orders & Deliveries', category: 'Orders', desc: 'Order status, delivery details, refunds' },
  { id: 'users.manage', label: 'Users & Wallet', category: 'Users', desc: 'Customer accounts, wallet credits, balance adjustments' },
  { id: 'roles.manage', label: 'Roles & Staff', category: 'Staff', desc: 'Admin accounts, staff roles, permissions' },
  { id: 'reports.view', label: 'Reports & Analytics', category: 'Analytics', desc: 'Financial dashboards, sales reports, growth data' },
  { id: 'growth.manage', label: 'Marketing & Growth', category: 'Marketing', desc: 'Coupons, promotions, bundles, affiliate payouts' },
  { id: 'support.manage', label: 'Support Helpdesk', category: 'Support', desc: 'Customer support tickets and replies' },
  { id: 'reviews.manage', label: 'Reviews Moderation', category: 'Moderation', desc: 'Customer product reviews approval/rejection' },
  { id: 'refunds.manage', label: 'Refund Requests', category: 'Finance', desc: 'Review and approve/reject wallet/order refunds' },
  { id: 'settings.manage', label: 'Store Settings', category: 'Settings', desc: 'Payment gateways, banners, site configuration' },
  { id: 'audit.view', label: 'Audit Trail Logs', category: 'Security', desc: 'Security audit logs and admin action logs' },
  { id: 'backup.manage', label: 'Backup & Restore', category: 'System', desc: 'Catalog exports and database snapshots' },
]

function AdminsStaffTab() {
  const { user: currentUser } = useAuth()
  const { notify } = useToast()

  const [items, setItems] = useState([])
  const [roles, setRoles] = useState([])
  const [meta, setMeta] = useState({})
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [activeFilter, setActiveFilter] = useState('')

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalAdmin, setEditModalAdmin] = useState(null)
  const [deleteModalAdmin, setDeleteModalAdmin] = useState(null)

  // Forms
  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    roleId: '',
    permissions: [],
    isActive: true,
  })

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    permissions: [],
    isActive: true,
  })

  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load Data
  const load = async (
    cursor = null,
    direction = 'next',
    currentLimit = limit,
    searchQ = q,
    selectedActive = activeFilter
  ) => {
    setLoading(true)
    try {
      const params = { limit: currentLimit }
      if (cursor) {
        params.cursor = cursor
        params.direction = direction
      }
      if (searchQ.trim()) params.q = searchQ.trim()
      if (selectedActive) params.active = selectedActive

      const [adminsRes, rolesRes] = await Promise.all([
        adminGet('/admins', params),
        adminGet('/features/roles').catch(() => ({ data: [] })),
      ])

      setItems(adminsRes.data || [])
      setMeta(adminsRes.meta || {})
      setRoles(rolesRes.data || [])
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to load admin accounts'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load(null, 'next', limit, q, activeFilter)
  }

  const handleReset = () => {
    setQ('')
    setActiveFilter('')
    load(null, 'next', limit, '', '')
  }

  const handleNext = (nextCursor) => {
    load(nextCursor, 'next', limit, q, activeFilter)
  }

  const handlePrev = (prevCursor) => {
    load(prevCursor, 'prev', limit, q, activeFilter)
  }

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit)
    load(null, 'next', newLimit, q, activeFilter)
  }

  // CREATE ADMIN HANDLER
  const handleOpenCreate = () => {
    setCreateForm({
      name: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      roleId: '',
      permissions: [],
      isActive: true,
    })
    setShowCreatePassword(false)
    setCreateModalOpen(true)
  }

  const handleRoleChangeInCreate = (roleId) => {
    if (!roleId) {
      setCreateForm((prev) => ({ ...prev, roleId: '', permissions: [] }))
      return
    }
    const roleDoc = roles.find((r) => r._id === roleId)
    setCreateForm((prev) => ({
      ...prev,
      roleId,
      permissions: roleDoc?.permissions ? [...roleDoc.permissions] : [],
    }))
  }

  const togglePermissionInCreate = (permId) => {
    setCreateForm((prev) => {
      const exists = prev.permissions.includes(permId)
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      }
    })
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.username.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      notify('Please fill in all required fields (Name, Username, Email, Password).', 'error')
      return
    }
    if (createForm.password.length < 8) {
      notify('Password must be at least 8 characters long.', 'error')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: createForm.name.trim(),
        username: createForm.username.trim().toLowerCase(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        phone: createForm.phone.trim(),
        roleId: createForm.roleId || null,
        permissions: createForm.permissions,
        isActive: createForm.isActive,
      }

      await adminPost('/admins', payload)
      notify(`Admin @${payload.username} created successfully!`, 'success')
      setCreateModalOpen(false)
      load(null, 'next', limit, q, activeFilter)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to create admin'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // EDIT ADMIN HANDLER
  const handleOpenEdit = (admin) => {
    setEditModalAdmin(admin)
    setEditForm({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
      roleId: admin.roleRef?._id || admin.roleRef || '',
      permissions: Array.isArray(admin.permissions) ? [...admin.permissions] : [],
      isActive: admin.isActive !== false,
    })
    setShowEditPassword(false)
  }

  const handleRoleChangeInEdit = (roleId) => {
    if (!roleId) {
      setEditForm((prev) => ({ ...prev, roleId: '', permissions: [] }))
      return
    }
    const roleDoc = roles.find((r) => r._id === roleId)
    setEditForm((prev) => ({
      ...prev,
      roleId,
      permissions: roleDoc?.permissions ? [...roleDoc.permissions] : [],
    }))
  }

  const togglePermissionInEdit = (permId) => {
    setEditForm((prev) => {
      const exists = prev.permissions.includes(permId)
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permId)
          : [...prev.permissions, permId],
      }
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim() || !editForm.email.trim()) {
      notify('Name and Email are required.', 'error')
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        roleId: editForm.roleId || null,
        permissions: editForm.permissions,
        isActive: editForm.isActive,
      }

      if (editForm.password.trim()) {
        if (editForm.password.trim().length < 8) {
          notify('New password must be at least 8 characters.', 'error')
          setSubmitting(false)
          return
        }
        payload.password = editForm.password.trim()
      }

      await adminPut(`/admins/${editModalAdmin._id}`, payload)
      notify(`Admin @${editModalAdmin.username} updated successfully!`, 'success')
      setEditModalAdmin(null)
      load(null, 'next', limit, q, activeFilter)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to update admin'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // DELETE ADMIN HANDLER
  const handleDeleteConfirm = async () => {
    if (!deleteModalAdmin) return
    try {
      setSubmitting(true)
      await adminDelete(`/admins/${deleteModalAdmin._id}`)
      notify(`Admin @${deleteModalAdmin.username} deleted permanently.`, 'success')
      setDeleteModalAdmin(null)
      load(null, 'next', limit, q, activeFilter)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to delete admin'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // QUICK TOGGLE STATUS
  const handleToggleStatus = async (admin) => {
    if (admin.isMasterAdmin) {
      notify('The Master Admin cannot be deactivated.', 'info')
      return
    }
    if (String(admin._id) === String(currentUser?._id)) {
      notify('You cannot deactivate your own account.', 'info')
      return
    }

    try {
      await adminPut(`/admins/${admin._id}`, { isActive: !admin.isActive })
      notify(`Admin @${admin.username} is now ${!admin.isActive ? 'Active' : 'Suspended'}.`, 'success')
      load(null, 'next', limit, q, activeFilter)
    } catch (err) {
      notify(apiErrorMessage(err, 'Failed to update admin status'), 'error')
    }
  }

  // Summary Metrics
  const totalCount = meta?.total || items.length
  const activeCount = items.filter((a) => a.isActive).length
  const masterCount = items.filter((a) => a.isMasterAdmin).length
  const twoFaCount = items.filter((a) => a.twoFactorEnabled).length

  return (
    <>
      {/* Top Banner & Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400">
              <HugeiconsIcon icon={UserShield01Icon} size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Total Admins</p>
              <h4 className="text-lg font-extrabold text-[var(--hexa-text)]">{totalCount}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Active Admins</p>
              <h4 className="text-lg font-extrabold text-emerald-400">{activeCount}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
              <HugeiconsIcon icon={Shield01Icon} size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">Master Admins</p>
              <h4 className="text-lg font-extrabold text-amber-400">{masterCount}</h4>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400">
              <HugeiconsIcon icon={LockPasswordIcon} size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--hexa-muted)]">2FA Protected</p>
              <h4 className="text-lg font-extrabold text-cyan-400">{twoFaCount}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]" size={14} />
            <input
              type="text"
              placeholder="Search by name, username, email, phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] py-2.5 pl-9 pr-4 text-xs text-[var(--hexa-text)] placeholder-[var(--hexa-muted)] outline-none focus:border-purple-500 transition"
            />
          </div>

          <select
            value={activeFilter}
            onChange={(e) => {
              setActiveFilter(e.target.value)
              load(null, 'next', limit, q, e.target.value)
            }}
            className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2.5 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Suspended Only</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition"
          >
            Search
          </button>

          {(q || activeFilter) && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-3 py-2.5 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
            >
              Reset
            </button>
          )}
        </form>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-purple-500 hover:to-indigo-500 transition"
        >
          <HugeiconsIcon icon={UserAdd01Icon} size={14} />
          <span>New Admin</span>
        </button>
      </div>

      {/* Admins Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--hexa-border)] bg-[var(--hexa-surface)] text-[var(--hexa-muted)] uppercase tracking-wider font-bold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Admin</th>
                <th className="px-5 py-3.5">Role & Access</th>
                <th className="px-5 py-3.5">Permissions</th>
                <th className="px-5 py-3.5">Security</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hexa-border)]/50">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-[var(--hexa-muted)]">
                    Loading admin accounts...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-xs text-[var(--hexa-muted)]">
                    No admins found matching your criteria.
                  </td>
                </tr>
              ) : (
                items.map((admin) => {
                  const isSelf = String(admin._id) === String(currentUser?._id)
                  const isMaster = Boolean(admin.isMasterAdmin)
                  const roleName = admin.roleRef?.name || (isMaster ? 'Master Admin' : 'Full Admin')

                  return (
                    <tr key={admin._id} className="hover:bg-white/[0.02] transition">
                      {/* Admin Identity */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-extrabold text-xs">
                            {admin.name ? admin.name.charAt(0).toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--hexa-text)]">{admin.name}</span>
                              {isMaster && (
                                <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-purple-300">
                                  MASTER
                                </span>
                              )}
                              {isSelf && (
                                <span className="rounded-md bg-cyan-500/20 border border-cyan-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-cyan-300">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[var(--hexa-muted)]">
                              <span className="font-mono text-purple-400/90">@{admin.username || 'admin'}</span>
                              <span>•</span>
                              <span>{admin.email}</span>
                            </div>
                            {admin.phone && (
                              <p className="text-[10px] text-gray-500">{admin.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${
                          isMaster
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : admin.roleRef
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                        }`}>
                          <HugeiconsIcon icon={Shield01Icon} size={11} />
                          {roleName}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td className="px-5 py-4">
                        {isMaster ? (
                          <span className="text-[11px] font-bold text-amber-400">All Permissions (Master)</span>
                        ) : !admin.roleRef && (!admin.permissions || admin.permissions.length === 0) ? (
                          <span className="text-[11px] font-semibold text-purple-400">Unrestricted Full Admin</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {admin.permissions?.slice(0, 3).map((p) => (
                              <span key={p} className="rounded bg-[var(--hexa-surface)] border border-[var(--hexa-border)] px-1.5 py-0.5 text-[10px] text-[var(--hexa-muted)] font-mono">
                                {p.replace('.manage', '').replace('.view', '')}
                              </span>
                            ))}
                            {(admin.permissions?.length || 0) > 3 && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--hexa-muted)] font-bold">
                                +{(admin.permissions?.length || 0) - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Security */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            admin.twoFactorEnabled ? 'text-emerald-400' : 'text-[var(--hexa-muted)]'
                          }`}>
                            <HugeiconsIcon icon={LockPasswordIcon} size={11} />
                            {admin.twoFactorEnabled ? '2FA Active' : '2FA Off'}
                          </span>
                          {admin.isEmailVerified && (
                            <span className="text-[10px] text-emerald-400/80 flex items-center gap-1">
                              <HugeiconsIcon icon={Tick02Icon} size={10} /> Verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={admin.isActive ? 'active' : 'suspended'} />
                          {!isMaster && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(admin)}
                              title={admin.isActive ? 'Click to deactivate' : 'Click to activate'}
                              className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition border ${
                                admin.isActive
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              }`}
                            >
                              {admin.isActive ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 whitespace-nowrap text-[11px] text-[var(--hexa-muted)]">
                        <p>{new Date(admin.createdAt).toLocaleDateString()}</p>
                        {admin.lastLoginAt && (
                          <p className="text-[10px] opacity-70">
                            Last: {new Date(admin.lastLoginAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(admin)}
                            className="rounded-lg border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-2 text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/40 transition"
                            title="Edit Admin"
                          >
                            <HugeiconsIcon icon={Edit02Icon} size={14} />
                          </button>

                          {!isMaster && !isSelf ? (
                            <button
                              type="button"
                              onClick={() => setDeleteModalAdmin(admin)}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/40 transition"
                              title="Delete Admin"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={14} />
                            </button>
                          ) : (
                            <span className="p-2 text-gray-600 cursor-not-allowed opacity-30">
                              <HugeiconsIcon icon={Delete02Icon} size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminCursorPagination
          meta={meta}
          onNext={handleNext}
          onPrev={handlePrev}
          limit={limit}
          onLimitChange={handleLimitChange}
          loading={loading}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* MODAL 1: CREATE ADMIN */}
      <Modal
        title="Create New Admin"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Connor"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Admin Username <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. sarah.admin"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs font-mono text-purple-400 outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="sarah@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+8801700000000"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
              Initial Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                placeholder="Minimum 8 characters with letters & numbers"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 pr-10 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]"
              >
                <HugeiconsIcon icon={ViewIcon} size={14} />
              </button>
            </div>
          </div>

          {/* Role Preset Selector */}
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
              Assign Custom Role Preset (Optional)
            </label>
            <select
              value={createForm.roleId}
              onChange={(e) => handleRoleChangeInCreate(e.target.value)}
              className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
            >
              <option value="">No Role Preset (Custom Permissions / Full Admin)</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} ({r.permissions?.length || 0} permissions)
                </option>
              ))}
            </select>
          </div>

          {/* Granular Permissions Checklist */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--hexa-text)]">
                Granular Permissions ({createForm.permissions.length} granted)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, permissions: AVAILABLE_PERMISSIONS.map((p) => p.id) })}
                  className="text-[10px] font-bold text-purple-400 hover:underline"
                >
                  Grant All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, permissions: [] })}
                  className="text-[10px] font-bold text-gray-400 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3 space-y-2 custom-scrollbar">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = createForm.permissions.includes(perm.id)
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-2.5 rounded-lg p-2 transition cursor-pointer border ${
                      isChecked
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'hover:bg-white/[0.02] border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermissionInCreate(perm.id)}
                      className="mt-0.5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--hexa-text)]">{perm.label}</span>
                        <span className="font-mono text-[10px] text-purple-400 opacity-80">{perm.id}</span>
                      </div>
                      <p className="text-[10px] text-[var(--hexa-muted)]">{perm.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="createIsActive"
              checked={createForm.isActive}
              onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
              className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="createIsActive" className="text-xs font-semibold text-[var(--hexa-text)] cursor-pointer">
              Account Active (Can log into Admin Panel immediately)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 border-t border-[var(--hexa-border)] pt-4">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-4 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: EDIT ADMIN */}
      <Modal
        title={`Edit Admin @${editModalAdmin?.username || ''}`}
        open={Boolean(editModalAdmin)}
        onClose={() => setEditModalAdmin(null)}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {editModalAdmin?.isMasterAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2">
              <HugeiconsIcon icon={Shield01Icon} className="shrink-0 text-amber-400" size={16} />
              <span>
                <strong>Master Admin:</strong> Has unrestricted root access across the entire system. Role & permission restrictions do not apply.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+8801700000000"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                Reset Password (Optional)
              </label>
              <div className="relative">
                <input
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="Leave blank to keep existing"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 pr-10 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--hexa-muted)] hover:text-[var(--hexa-text)]"
                >
                  <HugeiconsIcon icon={ViewIcon} size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Role & Permissions (Only if not master admin) */}
          {!editModalAdmin?.isMasterAdmin && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--hexa-text)]">
                  Role Preset
                </label>
                <select
                  value={editForm.roleId}
                  onChange={(e) => handleRoleChangeInEdit(e.target.value)}
                  className="w-full rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-card)] px-3 py-2 text-xs text-[var(--hexa-text)] outline-none focus:border-purple-500 transition"
                >
                  <option value="">No Role Preset (Custom Permissions / Full Admin)</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.permissions?.length || 0} permissions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--hexa-text)]">
                    Permissions ({editForm.permissions.length} granted)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, permissions: AVAILABLE_PERMISSIONS.map((p) => p.id) })}
                      className="text-[10px] font-bold text-purple-400 hover:underline"
                    >
                      Grant All
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, permissions: [] })}
                      className="text-[10px] font-bold text-gray-400 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)]/60 p-3 space-y-2 custom-scrollbar">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = editForm.permissions.includes(perm.id)
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-start gap-2.5 rounded-lg p-2 transition cursor-pointer border ${
                          isChecked
                            ? 'bg-purple-500/10 border-purple-500/30'
                            : 'hover:bg-white/[0.02] border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermissionInEdit(perm.id)}
                          className="mt-0.5 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--hexa-text)]">{perm.label}</span>
                            <span className="font-mono text-[10px] text-purple-400 opacity-80">{perm.id}</span>
                          </div>
                          <p className="text-[10px] text-[var(--hexa-muted)]">{perm.desc}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* Active Status (if not master admin and not self) */}
          {!editModalAdmin?.isMasterAdmin && String(editModalAdmin?._id) !== String(currentUser?._id) && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded border-gray-600 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="editIsActive" className="text-xs font-semibold text-[var(--hexa-text)] cursor-pointer">
                Account Active
              </label>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 border-t border-[var(--hexa-border)] pt-4">
            <button
              type="button"
              onClick={() => setEditModalAdmin(null)}
              className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-4 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: DELETE CONFIRMATION */}
      <Modal
        title="Delete Admin"
        open={Boolean(deleteModalAdmin)}
        onClose={() => setDeleteModalAdmin(null)}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={Alert02Icon} className="text-rose-400 shrink-0" size={22} />
              <div>
                <h5 className="font-bold text-sm text-rose-300">Permanently Delete Admin</h5>
                <p className="text-xs text-rose-300/80 mt-1">
                  Are you sure you want to permanently delete admin{' '}
                  <strong className="text-white">@{deleteModalAdmin?.username}</strong> ({deleteModalAdmin?.name})?
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] p-3 text-xs text-[var(--hexa-muted)] space-y-1">
            <p>• All active login sessions for this admin will be immediately revoked.</p>
            <p>• They will lose all administrative dashboard and API access instantly.</p>
            <p>• Historical audit log records and order processing history created by this admin will be preserved.</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--hexa-border)] pt-4">
            <button
              type="button"
              onClick={() => setDeleteModalAdmin(null)}
              className="rounded-xl border border-[var(--hexa-border)] bg-[var(--hexa-surface)] px-4 py-2 text-xs font-semibold text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={submitting}
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Deleting...' : 'Yes, Delete Admin'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
