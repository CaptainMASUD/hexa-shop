import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowRight01Icon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
  Tick02Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Alert02Icon,
} from '@hugeicons/core-free-icons'
import { AuthShell } from './LoginPage'
import { resetPasswordApi } from '../../api/auth.api'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../../contexts/ToastContext'
import BotShield from '../../components/BotShield'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const { notify } = useToast()
  const navigate = useNavigate()

  // Live password validation checks
  const criteria = useMemo(() => {
    const p = form.password
    return {
      minLength: p.length >= 8,
      hasLower: /[a-z]/.test(p),
      hasUpper: /[A-Z]/.test(p),
      hasNumber: /\d/.test(p),
      matchesConfirm: Boolean(p && form.confirmPassword && p === form.confirmPassword),
    }
  }, [form.password, form.confirmPassword])

  const isValid =
    criteria.minLength &&
    criteria.hasLower &&
    criteria.hasUpper &&
    criteria.hasNumber &&
    criteria.matchesConfirm

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !token) return
    if (!isValid) {
      notify('Please satisfy all password security requirements.', 'error')
      return
    }

    setBusy(true)
    setErrorMessage('')

    try {
      const res = await resetPasswordApi({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })

      setIsSuccess(true)
      notify(res.message || 'Password reset successfully!', 'success')
    } catch (err) {
      const msg = apiErrorMessage(err, 'This password reset link is invalid or has expired.')
      setErrorMessage(msg)
      notify(msg, 'error')
    } finally {
      setBusy(false)
    }
  }

  // State 1: Missing Token in URL
  if (!token) {
    return (
      <AuthShell
        title="Invalid Link"
        subtitle="No password reset token was detected in your request."
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <HugeiconsIcon icon={Alert02Icon} size={28} />
          </div>
          <p className="text-xs text-[var(--hexa-muted)] leading-relaxed">
            Please use the link sent to your email or request a new password reset link below.
          </p>
          <Link
            to="/forgot-password"
            className="
              hexa-btn
              !flex
              !h-11
              !w-full
              !items-center
              !justify-center
              !rounded-xl
              text-sm
              font-semibold
            "
          >
            Request New Reset Link
          </Link>
        </div>
      </AuthShell>
    )
  }

  // State 2: Successful Password Reset
  if (isSuccess) {
    return (
      <AuthShell
        title="Password Reset Complete"
        subtitle="Your password has been updated securely."
      >
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              All set! You can now log in with your new password.
            </p>
            <p className="text-xs text-[var(--hexa-muted)]">
              Any previous active sessions on other devices have been safely revoked.
            </p>
          </div>
          <Link
            to="/login"
            className="
              hexa-btn
              !flex
              !h-11
              !w-full
              !items-center
              !justify-center
              !gap-2
              !rounded-xl
              text-sm
              font-semibold
            "
          >
            Sign in to Your Account
            <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={2} />
          </Link>
        </div>
      </AuthShell>
    )
  }

  // State 3: Reset Form
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter and confirm your new account password."
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Error Alert */}
        {errorMessage && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 space-y-2 text-xs text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <HugeiconsIcon icon={CancelCircleIcon} size={16} />
              <span>Reset Failed</span>
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              {errorMessage}
            </p>
            <Link
              to="/forgot-password"
              className="inline-block font-semibold text-rose-300 hover:underline text-[11px]"
            >
              Request a new password reset link →
            </Link>
          </div>
        )}

        {/* New Password */}
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--hexa-text-soft)]">
            New Password
          </span>
          <div className="group relative">
            <HugeiconsIcon
              icon={LockPasswordIcon}
              size={18}
              strokeWidth={1.7}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                z-10
                -translate-y-1/2
                text-[var(--hexa-muted)]
                transition-colors
                duration-150
                group-focus-within:text-purple-600
              "
            />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create a strong password"
              className="
                hexa-input
                !h-11
                !rounded-xl
                !pl-11
                !pr-11
                text-[14px]
                font-normal
                transition-[border-color,box-shadow]
                duration-150
                ease-out
                focus:!border-purple-500/50
                focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.07)]
              "
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="
                absolute
                right-2.5
                top-1/2
                flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-[var(--hexa-muted)]
                hover:bg-[var(--hexa-bg-soft)]
                hover:text-[var(--hexa-text)]
              "
            >
              <HugeiconsIcon
                icon={showPassword ? ViewOffSlashIcon : ViewIcon}
                size={18}
              />
            </button>
          </div>
        </label>

        {/* Confirm Password */}
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--hexa-text-soft)]">
            Confirm New Password
          </span>
          <div className="group relative">
            <HugeiconsIcon
              icon={LockPasswordIcon}
              size={18}
              strokeWidth={1.7}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                z-10
                -translate-y-1/2
                text-[var(--hexa-muted)]
                transition-colors
                duration-150
                group-focus-within:text-purple-600
              "
            />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Repeat your new password"
              className="
                hexa-input
                !h-11
                !rounded-xl
                !pl-11
                !pr-11
                text-[14px]
                font-normal
                transition-[border-color,box-shadow]
                duration-150
                ease-out
                focus:!border-purple-500/50
                focus:!shadow-[0_0_0_3px_rgba(147,51,234,0.07)]
              "
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              className="
                absolute
                right-2.5
                top-1/2
                flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-[var(--hexa-muted)]
                hover:bg-[var(--hexa-bg-soft)]
                hover:text-[var(--hexa-text)]
              "
            >
              <HugeiconsIcon
                icon={showConfirmPassword ? ViewOffSlashIcon : ViewIcon}
                size={18}
              />
            </button>
          </div>
        </label>

        {/* Security Checklist */}
        <div className="rounded-xl bg-[var(--hexa-surface)] border border-[var(--hexa-border)] p-3 space-y-1.5 text-[11px]">
          <p className="font-semibold text-[var(--hexa-text)] text-xs mb-1">
            Password Requirements:
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <div className={`flex items-center gap-1.5 ${criteria.minLength ? 'text-emerald-400 font-medium' : 'text-[var(--hexa-muted)]'}`}>
              <HugeiconsIcon icon={criteria.minLength ? Tick02Icon : CancelCircleIcon} size={13} />
              <span>8+ characters</span>
            </div>
            <div className={`flex items-center gap-1.5 ${criteria.hasUpper ? 'text-emerald-400 font-medium' : 'text-[var(--hexa-muted)]'}`}>
              <HugeiconsIcon icon={criteria.hasUpper ? Tick02Icon : CancelCircleIcon} size={13} />
              <span>1 uppercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${criteria.hasLower ? 'text-emerald-400 font-medium' : 'text-[var(--hexa-muted)]'}`}>
              <HugeiconsIcon icon={criteria.hasLower ? Tick02Icon : CancelCircleIcon} size={13} />
              <span>1 lowercase letter</span>
            </div>
            <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? 'text-emerald-400 font-medium' : 'text-[var(--hexa-muted)]'}`}>
              <HugeiconsIcon icon={criteria.hasNumber ? Tick02Icon : CancelCircleIcon} size={13} />
              <span>1 number</span>
            </div>
          </div>
          {form.confirmPassword && (
            <div className={`pt-1 border-t border-white/5 flex items-center gap-1.5 ${criteria.matchesConfirm ? 'text-emerald-400 font-medium' : 'text-rose-400'}`}>
              <HugeiconsIcon icon={criteria.matchesConfirm ? Tick02Icon : CancelCircleIcon} size={13} />
              <span>{criteria.matchesConfirm ? 'Passwords match' : 'Passwords do not match'}</span>
            </div>
          )}
        </div>

        <BotShield className="mt-4" />

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy || !isValid}
          className="
            hexa-btn
            group
            !mt-5
            !flex
            !h-11
            !w-full
            !items-center
            !justify-center
            !gap-2
            !rounded-xl
            !px-5
            !py-0
            transform-gpu
            text-sm
            font-semibold
            transition-transform
            duration-150
            ease-out
            hover:scale-[1.01]
            active:scale-[0.985]
            disabled:pointer-events-none
            disabled:opacity-60
          "
        >
          {busy ? (
            <>
              <span
                className="
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/30
                  border-t-white
                "
              />
              Updating password...
            </>
          ) : (
            <>
              Reset Password
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={17}
                strokeWidth={2}
                className="
                  transition-transform
                  duration-150
                  ease-out
                  group-hover:translate-x-0.5
                "
              />
            </>
          )}
        </button>

        {/* Back to Sign In Link */}
        <p className="pt-2 text-center text-[13px] text-[var(--hexa-muted)]">
          <Link
            to="/login"
            className="
              font-semibold
              text-purple-600
              transition-colors
              duration-150
              hover:text-purple-500
            "
          >
            ← Back to Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
