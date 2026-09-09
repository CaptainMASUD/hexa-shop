import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  HexagonIcon,
  LockPasswordIcon,
  ShieldCheckIcon,
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
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | '2fa'
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
      const payload = {
        username: form.username.trim(),
        password: form.password,
      }
      if (step === '2fa') {
        payload.otp = otp.trim()
      }

      const res = await adminLogin(payload)

      if (res?.requires2FA) {
        setStep('2fa')
        notify('Please enter the 6-digit code from your authenticator app.', 'info')
      } else {
        notify('Admin authenticated successfully')
        navigate('/admin')
      }
    } catch (error) {
      notify(apiErrorMessage(error, step === '2fa' ? 'Invalid authenticator code' : 'Invalid admin credentials'), 'error')
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
            {step === '2fa'
              ? 'Enter the 6-digit Two-Factor Authentication code.'
              : 'Protected administrator access with verified credentials.'}
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={submit} className="hexa-card mt-6 space-y-4 p-6 sm:p-7">
          {step === 'credentials' ? (
            <>
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
            </>
          ) : (
            <>
              {/* 2FA Challenge */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-2">
                  <HugeiconsIcon icon={ShieldCheckIcon} size={20} />
                </div>
                <p className="text-xs font-semibold text-[var(--hexa-text)]">
                  Two-Factor Authentication
                </p>
                <p className="text-[11px] text-[var(--hexa-muted)] mt-0.5">
                  Open your Google Authenticator or Authy app and enter the 6-digit code.
                </p>
              </div>

              <div>
                <label className="hexa-label text-xs font-medium">6-Digit Code</label>
                <input
                  required
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="hexa-input !h-12 !rounded-xl text-center text-xl font-mono font-black tracking-widest text-purple-300 placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={busy || otp.length !== 6}
                className="hexa-btn !h-11 w-full justify-center !rounded-xl font-semibold shadow-md shadow-purple-600/20 disabled:opacity-50 mt-2"
              >
                <span>{busy ? 'Verifying Code…' : 'Verify & Enter Dashboard'}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials')
                  setOtp('')
                }}
                className="w-full text-center text-xs font-semibold text-[var(--hexa-muted)] hover:text-purple-400 transition pt-1"
              >
                ← Back to username & password
              </button>
            </>
          )}

          {/* Switch to Register */}
          {step === 'credentials' && (
            <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-[var(--hexa-muted)]">
              <span>New administrator?</span>
              <Link
                to="/admin/register"
                className="font-semibold text-purple-400 hover:text-purple-300 transition"
              >
                Register with Secret Code
              </Link>
            </div>
          )}
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
