import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  HexagonIcon,
  Key01Icon,
  LockPasswordIcon,
  UserCircleIcon,
  UserShield01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'

import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { apiErrorMessage } from '../../api/client'
import usePageMeta from '../../hooks/usePageMeta'

export default function AdminRegisterPage() {
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    registerCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const { adminRegister } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  usePageMeta('Admin Registration — HEXA', 'Register an administrator account.')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    if (form.password.length < 8) {
      notify('Password must be at least 8 characters long', 'error')
      return
    }

    if (!form.registerCode.trim()) {
      notify('Registration code is required', 'error')
      return
    }

    setBusy(true)
    try {
      await adminRegister({
        name: form.name.trim(),
        username: form.username.trim(),
        password: form.password,
        registerCode: form.registerCode.trim(),
      })
      notify('Admin account created successfully')
      navigate('/admin')
    } catch (error) {
      notify(apiErrorMessage(error, 'Failed to register admin account'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hexa-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10">
            <HugeiconsIcon icon={HexagonIcon} size={28} className="text-purple-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--hexa-text)]">
            Admin Registration
          </h1>
          <p className="mt-1.5 text-xs text-[var(--hexa-muted)]">
            Create an administrator account with your secret code.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={submit} className="hexa-card mt-6 space-y-4 p-6 sm:p-7">
          {/* Full Name */}
          <div>
            <label className="hexa-label text-xs font-medium">Display Name</label>
            <div className="relative">
              <HugeiconsIcon
                icon={UserCircleIcon}
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
              />
              <input
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Masud"
                className="hexa-input !h-11 !rounded-xl !pl-10 text-sm placeholder:text-[var(--hexa-muted)]/50"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="hexa-label text-xs font-medium">Admin Username</label>
            <div className="relative">
              <HugeiconsIcon
                icon={UserShield01Icon}
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                required
                autoComplete="username"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="e.g. captain_masud"
                className="hexa-input !h-11 !rounded-xl !pl-10 text-sm font-medium placeholder:text-[var(--hexa-muted)]/50"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="hexa-label text-xs font-medium">Password</label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)]"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Min. 8 characters"
                className="hexa-input !h-11 !rounded-xl !pl-10 !pr-10 text-sm placeholder:text-[var(--hexa-muted)]/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                  size={16}
                />
              </button>
            </div>
          </div>

          {/* Registration Code */}
          <div>
            <label className="hexa-label text-xs font-medium">Registration Code</label>
            <div className="relative">
              <HugeiconsIcon
                icon={Key01Icon}
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400"
              />
              <input
                type="password"
                required
                value={form.registerCode}
                onChange={(e) => updateField('registerCode', e.target.value)}
                placeholder="Enter admin secret code"
                className="hexa-input !h-11 !rounded-xl !pl-10 font-mono text-sm placeholder:text-[var(--hexa-muted)]/50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="hexa-btn !h-11 w-full justify-center !rounded-xl font-semibold shadow-md shadow-purple-600/20 mt-2"
          >
            <span>{busy ? 'Creating account…' : 'Register Account'}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>

          {/* Switch to Login */}
          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-[var(--hexa-muted)]">
            <span>Already have an admin account?</span>
            <Link
              to="/admin/login"
              className="font-semibold text-purple-400 hover:text-purple-300 transition"
            >
              Sign in
            </Link>
          </div>
        </form>

        {/* Back Link */}
        <div className="mt-5 text-center">
          <Link
            to="/"
            className="text-xs text-[var(--hexa-muted)] hover:text-[var(--hexa-text)] transition"
          >
            ← Return to Marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}
