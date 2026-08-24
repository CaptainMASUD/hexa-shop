import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  HexagonIcon,
  LockPasswordIcon,
  UserShield01Icon,
  ViewIcon,
  ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'

import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { apiErrorMessage } from '../../api/client'
import usePageMeta from '../../hooks/usePageMeta'

export default function AdminLoginPage() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const { adminLogin } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()

  usePageMeta('Admin Sign In — HEXA', 'Secure administrator sign-in.')

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return

    setBusy(true)
    try {
      await adminLogin({
        username: form.username.trim(),
        password: form.password,
      })
      notify('Admin authenticated successfully')
      navigate('/admin')
    } catch (error) {
      notify(apiErrorMessage(error, 'Invalid admin username or password'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hexa-shell flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 shadow-lg shadow-purple-500/10">
            <HugeiconsIcon icon={HexagonIcon} size={28} className="text-purple-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-[var(--hexa-text)]">
            HEXA Admin Portal
          </h1>
          <p className="mt-1.5 text-xs text-[var(--hexa-muted)]">
            Protected administrator access with verified credentials.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={submit} className="hexa-card mt-6 space-y-4 p-6 sm:p-7">
          {/* Username */}
          <div>
            <label className="hexa-label text-xs font-medium">Username or Email</label>
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
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Enter password"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="hexa-btn !h-11 w-full justify-center !rounded-xl font-semibold shadow-md shadow-purple-600/20 mt-2"
          >
            <span>{busy ? 'Authenticating…' : 'Sign in to Admin'}</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>

          {/* Switch to Register */}
          <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-[var(--hexa-muted)]">
            <span>New administrator?</span>
            <Link
              to="/admin/register"
              className="font-semibold text-purple-400 hover:text-purple-300 transition"
            >
              Register with Secret Code
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
